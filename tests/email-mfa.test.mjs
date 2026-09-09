import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createEmailMfaService, emailCodeHash, randomEmailCode } from '../lib/email-mfa-core.mjs';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT,email_verified INTEGER);
    CREATE TABLE sessions(id TEXT PRIMARY KEY,user_id TEXT,expires_at INTEGER);
    CREATE TABLE admin_mfa_factors(user_id TEXT PRIMARY KEY,confirmed_at INTEGER);
    CREATE TABLE session_mfa_verifications(session_id TEXT PRIMARY KEY,verified_at INTEGER,expires_at INTEGER);
    INSERT INTO users VALUES('admin','admin',1),('student','student',1);
    INSERT INTO sessions VALUES('session','admin',99999999),('other','admin',99999999);`);
  sqlite.exec(readFileSync(new URL('../drizzle/0011_admin_email_mfa.sql', import.meta.url), 'utf8'));
  sqlite.exec("INSERT INTO admin_mfa_email_factors VALUES('admin','owner@example.test',NULL,1,1)");
  const db = {
    prepare(sql) {
      return { args: [], sql, bind(...args) { this.args=args;return this; },
        first() { return Promise.resolve(sqlite.prepare(sql).get(...this.args)??null); },
        run() { const result=sqlite.prepare(sql).run(...this.args);return Promise.resolve({meta:{changes:result.changes}}); },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results=statements.map(s=>({meta:{changes:sqlite.prepare(s.sql).run(...s.args).changes}}));sqlite.exec('COMMIT');return results; }
      catch(error) { sqlite.exec('ROLLBACK');throw error; }
    },
  };
  let time=100000, sequence=100000;
  const messages=[], limits=new Map();
  const current={user:{id:'admin',role:'admin',emailVerified:true,email:'login@example.test'},sessionId:'session'};
  const dependencies={db,now:()=>time,generateCode:()=>String(sequence++),hashCode:(row,code)=>emailCodeHash('test-only-hmac-key-at-least-32-chars',row,code),
    async rateLimit(key,max,window) { let row=limits.get(key);if(!row||row.start+window<=time){row={start:time,count:0};limits.set(key,row);}row.count++;return {allowed:row.count<=max,retryAfter:Math.ceil((row.start+window-time)/1000)}; },
    async deliver(recipient,code) { messages.push({recipient,code}); },
  };
  return {sqlite,db,current,messages,dependencies,service:createEmailMfaService(dependencies),advance:ms=>{time+=ms;},grant:()=>sqlite.prepare('SELECT * FROM session_mfa_verifications').all(),close:()=>sqlite.close()};
}

test('email OTP is six digits and its HMAC is bound to user, session, challenge and recipient',async()=>{
  for(let i=0;i<20;i++)assert.match(randomEmailCode(),/^\d{6}$/);
  const row={id:'challenge',user_id:'admin',session_id:'session',recipient_email:'owner@example.test',factor_updated_at:1};
  const hash=await emailCodeHash('test-only-key-at-least-16',row,'123456');
  for(const field of Object.keys(row))assert.notEqual(await emailCodeHash('test-only-key-at-least-16',{...row,[field]:'different'},'123456'),hash);
});

test('configured email does not grant access; delivery never returns the code; successful code confirms recipient',async()=>{
  const f=fixture();try{
    assert.equal((await f.service.status(f.current)).emailConfirmed,false);
    assert.equal(f.grant().length,0);
    const sent=await f.service.send(f.current,{recipient:'attacker@example.test'});
    assert.equal(f.messages[0].recipient,'owner@example.test');
    assert.equal(JSON.stringify(sent).includes(f.messages[0].code),false);
    assert.equal(f.grant().length,0);
    assert.equal(await f.service.verify(f.current,f.messages[0].code),true);
    assert.equal(f.grant().length,1);
    assert.equal((await f.service.status(f.current)).emailConfirmed,true);
    assert.equal(await f.service.verify(f.current,f.messages[0].code),false);
  }finally{f.close();}
});

test('anonymous, student and unverified accounts cannot obtain email codes',async()=>{
  const f=fixture();try{
    for(const user of [null,{...f.current,user:{id:'student',role:'student',emailVerified:true}},{...f.current,user:{...f.current.user,emailVerified:false}}]){
      assert.equal(await f.service.status(user),null);await assert.rejects(()=>f.service.send(user));
    }
    assert.equal(f.messages.length,0);
  }finally{f.close();}
});

test('email codes reject expiry, other sessions, changed recipients and newly confirmed TOTP',async t=>{
  for(const mode of ['expired','other-session','recipient-change','totp-confirmed','session-expired','role-revoked','email-unverified'])await t.test(mode,async()=>{
    const f=fixture();try{
      await f.service.send(f.current);
      let current=f.current;
      if(mode==='expired')f.advance(300001);
      if(mode==='other-session')current={...current,sessionId:'other'};
      if(mode==='recipient-change')f.sqlite.exec("UPDATE admin_mfa_email_factors SET recipient_email='new@example.test',updated_at=2");
      if(mode==='totp-confirmed')f.sqlite.exec("INSERT INTO admin_mfa_factors VALUES('admin',123)");
      if(mode==='session-expired')f.sqlite.exec('UPDATE sessions SET expires_at=1');
      if(mode==='role-revoked')f.sqlite.exec("UPDATE users SET role='student' WHERE id='admin'");
      if(mode==='email-unverified')f.sqlite.exec("UPDATE users SET email_verified=0 WHERE id='admin'");
      assert.equal(await f.service.verify(current,f.messages[0].code),false);assert.equal(f.grant().length,0);
    }finally{f.close();}
  });
});

test('five wrong guesses exhaust a challenge and account-wide limits survive session changes',async()=>{
  const f=fixture();try{
    await f.service.send(f.current);
    for(let i=0;i<5;i++)assert.equal(await f.service.verify(f.current,'999999'),false);
    assert.equal(await f.service.verify(f.current,f.messages[0].code),false);
    for(let i=0;i<4;i++)await f.service.verify({...f.current,sessionId:'other'},'999999');
    await assert.rejects(()=>f.service.verify(f.current,'999999'),error=>error.status===429);
    assert.equal(f.grant().length,0);
  }finally{f.close();}
});

test('resending invalidates the previous code and respects account cooldown and hourly cap',async()=>{
  const f=fixture();try{
    await f.service.send(f.current);
    await assert.rejects(()=>f.service.send({...f.current,sessionId:'other'}),error=>error.status===429);
    f.advance(61000);await f.service.send(f.current);
    assert.equal(await f.service.verify(f.current,f.messages[0].code),false);
    assert.equal(await f.service.verify(f.current,f.messages[1].code),true);
    for(let i=0;i<3;i++){f.advance(61000);await f.service.send(f.current);}
    f.advance(61000);await assert.rejects(()=>f.service.send(f.current),error=>error.status===429);
  }finally{f.close();}
});

test('provider failure leaves no usable challenge',async()=>{
  const f=fixture();try{
    const broken=createEmailMfaService({...f.dependencies,deliver:async(recipient,code)=>{f.messages.push({recipient,code});throw Error('provider failed');}});
    await assert.rejects(()=>broken.send(f.current),error=>error.status===502);
    assert.equal(await f.service.verify(f.current,f.messages[0].code),false);assert.equal(f.grant().length,0);
  }finally{f.close();}
});

test('concurrent correct submissions grant access exactly once',async()=>{
  const f=fixture();try{
    await f.service.send(f.current);
    const results=await Promise.all([f.service.verify(f.current,f.messages[0].code),f.service.verify(f.current,f.messages[0].code)]);
    assert.deepEqual(results.sort(),[false,true]);assert.equal(f.grant().length,1);
  }finally{f.close();}
});

test('confirmed TOTP is preserved and the email API cannot alter the recipient or bypass configured email with TOTP enrollment',async()=>{
  const f=fixture();try{
    f.sqlite.exec("INSERT INTO admin_mfa_factors VALUES('admin',123)");
    assert.equal(await f.service.status(f.current),null);await assert.rejects(()=>f.service.send(f.current));
    assert.equal(f.sqlite.prepare('SELECT confirmed_at FROM admin_mfa_factors').get().confirmed_at,123);
    const route=readFileSync(new URL('../app/api/auth/mfa/route.ts',import.meta.url),'utf8');
    assert.doesNotMatch(route,/body\.(?:email|recipient|phone)/);
    assert.ok(route.indexOf('if (await emailMfa.status(current))')<route.indexOf('body.action === "enroll"'));
  }finally{f.close();}
});
