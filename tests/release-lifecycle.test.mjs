import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import * as selection from '../lib/assessment-selection.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const assessmentSource=stripTypeScriptTypes(read('lib/assessment.ts').replaceAll('"./assessment-selection"',JSON.stringify(new URL('../lib/assessment-selection.ts',import.meta.url).href)).replaceAll('"./school-policy.mjs"',JSON.stringify(new URL('../lib/school-policy.mjs',import.meta.url).href)));
const assessment=await import('data:text/javascript,'+encodeURIComponent(assessmentSource));
function loadPost(path,dependencies){
  const source=stripTypeScriptTypes(read(path)).replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm,'').replace('export async function POST','async function POST');
  return new Function(...Object.keys(dependencies),source+'\nreturn POST;')(...Object.values(dependencies));
}
test('release gate runs real start/submit handlers against isolated SQLite: auth, ownership, grade, safe payload and idempotent persisted results',async()=>{
  const db=new DatabaseSync(':memory:');let emails=0;
  try{
    db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,school TEXT);INSERT INTO users VALUES('learner','School'),('other','Other');
      CREATE TABLE assignments(id TEXT,test_id TEXT,grade TEXT,created_by TEXT);
      CREATE TABLE attempts(id TEXT PRIMARY KEY,user_id TEXT,test_id TEXT,score INTEGER,max_score INTEGER,percentage INTEGER,answers_json TEXT,submitted_at INTEGER);
      CREATE TABLE question_history(id TEXT,user_id TEXT,question_id TEXT,pool_key TEXT,answered_at INTEGER,UNIQUE(user_id,question_id));`);
    db.exec(read('drizzle/0005_secure_assessment_bank.sql'));
    db.exec('ALTER TABLE assessment_tests ADD COLUMN difficulty TEXT');
    db.exec("INSERT INTO assessment_tests(id,title,subject,grade,semester,source_pool,question_count,time_minutes,attempts_allowed,test_type,published,is_custom,created_at,updated_at) VALUES('grade3-georgian','ქართული','ქართული',3,2,'v11',5,15,20,'practice',1,0,1,1)");
    for(let n=0;n<6;n++){
      db.prepare(`INSERT INTO assessment_questions(id,source_id,pool_key,pool_prefix,grade,subject,source_subject,semester,topic,question_type,public_payload_json,points,review_status,mapping_status,semantic_group_id,content_hash,imported_at,updated_at)
        VALUES(?,?,?,'v11',3,'ქართული','ქართული',2,'reading','multiple_choice',?,1,'algorithmically_validated','exact',?,?,1,1)`)
        .run('q'+n,'q'+n,'ge3',JSON.stringify({text:'საცდელი ამოცანა '+n,opts:['A','B','C'],correct:1,explain:'PRIVATE'}),'group'+n,'hash'+n);
      db.prepare('INSERT INTO assessment_answer_keys VALUES(?,?,?,1)').run('q'+n,JSON.stringify({correct:1}),'სწორი პასუხია B');
    }
    const DB={prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this;},async first(){return db.prepare(sql).get(...this.args)??null;},async all(){return {results:db.prepare(sql).all(...this.args)};},async run(){return {meta:{changes:db.prepare(sql).run(...this.args).changes}};}};},async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>({meta:{changes:db.prepare(s.sql).run(...s.args).changes}}));db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}};
    const dependencies={...selection,...assessment,env:{DB},ensureSchema:async()=>{},consumeRateLimit:async()=>({allowed:true}),sendAssessmentResultEmail:async()=>{emails++;return true;},
      getSessionUser:async request=>{const cookie=request.headers.get('cookie');return cookie==='fixture=learner'?{user:{id:'learner',role:'student',grade:'3ა',school:'School'}}:cookie==='fixture=other'?{user:{id:'other',role:'student',grade:3,school:'Other'}}:cookie==='fixture=senior'?{user:{id:'learner',role:'student',grade:12}}:null;}};
    const start=loadPost('app/api/assessments/start/route.ts',dependencies),submit=loadPost('app/api/assessments/submit/route.ts',dependencies);
    const request=(body,cookie='fixture=learner')=>new Request('https://example.test/api/assessments/test',{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
    assert.equal((await start(request({testId:'grade3-georgian'},''))).status,401);
    assert.equal((await start(request({testId:'grade3-georgian'},'fixture=senior'))).status,403);
    const started=await start(request({testId:'grade3-georgian'}));assert.equal(started.status,201);const data=await started.json();
    assert.equal(data.questions.length,5);assert.doesNotMatch(JSON.stringify(data),/PRIVATE|answer_key|"correct"|explain/);
    assert.equal(new Set(data.questions.map(q=>q.id)).size,5);
    assert.equal((await submit(request({sessionId:data.sessionId,answers:{}},'fixture=other'))).status,404);
    const answers=Object.fromEntries(data.questions.map(q=>[q.id,q.opts.indexOf('B')]));
    const responses=await Promise.all([submit(request({sessionId:data.sessionId,answers})),submit(request({sessionId:data.sessionId,answers}))]);
    for(const response of responses){assert.ok([200,201].includes(response.status));assert.equal((await response.json()).result.pct,100);}
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts').get().n,1);assert.equal(emails,1);
    assert.equal(db.prepare('SELECT MAX(answered_count) AS n FROM assessment_question_history').get().n,1);
    const saved=db.prepare('SELECT answers_json FROM attempts WHERE id=? AND user_id=?').get(data.sessionId,'learner');assert.equal(JSON.parse(saved.answers_json).verified,true);
    const retry=await submit(request({sessionId:data.sessionId,answers:{}}));assert.equal((await retry.json()).result.pct,100);assert.equal(emails,1);
  }finally{db.close();}
});
test('login/session release checks retain password verification, HttpOnly cookie and admin second factor boundaries',()=>{
  const login=read('app/api/auth/login/route.ts'),auth=read('lib/auth.ts');
  assert.match(login,/verifyPassword/);assert.match(login,/createSession/);assert.match(auth,/HttpOnly.*SameSite=Lax/);assert.match(auth,/user\.role === "admin"/);assert.match(auth,/!mfaVerified && !mfaSetupRoute/);
});
