import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

function fixture(overrides={}){
  const source=read('public/server-assessments.js');
  const segment=source.slice(source.indexOf('  function resultSideEffect('),source.indexOf('  loadBuilderCatalog=async function'));
  const elements=new Map();
  const element=()=>({children:[],style:{},classList:{contains:()=>false},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];}});
  const alerts=[],pages=[];
  const result={verified:true,title:'ბუნება',grade:1,pct:80,total:10,correct:8,pending:0,reviewed:[{text:'Fixture',opts:['A','B'],ua:1,correct:0,explain:'A is correct',pts:1}]};
  const context={console:{warn(){}},Promise,AbortSignal,Date,setTimeout:()=>0,clearInterval(){},serverSessionId:'fixture-session',serverSubmitting:false,
    owner:()=> 'learner',draftConflict:false,draftRevision:1,deadlineMs:Date.now()+60000,clockOffset:0,draftOwner:'learner',lastDraft:'',qAnswers:{},
    CUR_USER:{email:'learner@example.test',grade:1},SESSION_RESULTS:[],_lastResult:null,timerInt:null,_isDailyBonus:false,
    hideSubmitModal(){},saveDraft:async()=>true,setTestLoading(){},draftStatus(){},
    fetch:async()=>({ok:true,json:async()=>({result})}),adaptReviewed:q=>({...q}),resultBadge:()=>({}),calcXP:()=>10,
    saveResults(){},syncUserLearningState:async()=>{},showXpToast(){},logAuditEvent(){},renderResultsPage(){},
    go:page=>pages.push(page),renderQ(){},buildDots(){},catalogErrorMessage:error=>error.message,announce:message=>alerts.push(message),
    document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element},
    ...overrides};
  runInNewContext(segment,context);
  return {context,alerts,pages,elements,result};
}

test('verified results survive optional UI, persistence and asynchronous learning-state failures',async()=>{
  const fail=()=>{throw Error('injected optional failure');};
  const f=fixture({saveResults:fail,showXpToast:fail,logAuditEvent:fail,syncUserLearningState:async()=>{throw Error('injected async failure');}});
  await f.context.finishTest();await Promise.resolve();
  assert.deepEqual(f.pages,['results']);assert.equal(f.context.serverSessionId,null);
  assert.equal(f.context._lastResult.pct,80);assert.equal(f.context.SESSION_RESULTS.length,1);assert.equal(f.context.serverSubmitting,false);
});

test('a result renderer exception uses a safe visible summary and review instead of silently abandoning the result',async()=>{
  const f=fixture({renderResultsPage(){throw Error('injected renderer failure');}});
  await f.context.finishTest();
  assert.deepEqual(f.pages,['results']);assert.equal(f.context.serverSessionId,null);
  assert.match(f.elements.get('res-summary').children.map(n=>n.textContent).join(' '),/80%.*8\/10/);
  assert.equal(f.elements.get('res-review').children.length,1);
});

test('autosave and loading failures unlock submit and expose a retry without losing the session',async()=>{
  for(const name of ['saveDraft','setTestLoading']){
    const f=fixture({[name](){throw Error('injected '+name);}});
    await f.context.finishTest();assert.equal(f.context.serverSubmitting,false);assert.equal(f.context.serverSessionId,'fixture-session');
    assert.equal(f.alerts.length,1);assert.equal(f.elements.get('q-opts').children.length,1);
  }
});

test('fallback review never reveals protected or pending answer keys',async()=>{
  const f=fixture({renderResultsPage(){throw Error('fixture');}});
  f.result.reviewed=[{text:'Hidden',reveal:false,correct:'PRIVATE_KEY',explain:'PRIVATE_EXPLANATION',ua:'My answer'},
    {text:'Pending',gradingStatus:'pending',correct:'PENDING_KEY',ua:'My answer'}];
  await f.context.finishTest();
  const text=f.elements.get('res-review').children.flatMap(item=>item.children.map(n=>n.textContent)).join(' ');
  assert.doesNotMatch(text,/PRIVATE_KEY|PRIVATE_EXPLANATION|PENDING_KEY/);assert.match(text,/My answer/);
});

test('invalid success payload does not invent a zero score, and a navigation retry cannot duplicate results',async()=>{
  const invalid=fixture({fetch:async()=>({ok:true,json:async()=>({})})});
  await invalid.context.finishTest();assert.equal(invalid.context.SESSION_RESULTS.length,0);assert.equal(invalid.alerts.length,1);
  let tries=0;const f=fixture({go(){if(tries++===0)throw Error('injected navigation failure');}});
  await f.context.finishTest();assert.equal(f.context.serverSessionId,'fixture-session');assert.equal(f.alerts.length,1);
  await f.context.finishTest();assert.equal(f.context.SESSION_RESULTS.length,1);assert.equal(f.context.serverSessionId,null);
});

test('a signed-out/switched learner never receives the previous owner result',async()=>{
  const f=fixture();f.context.fetch=async()=>{f.context.owner=()=> 'other';return {ok:true,json:async()=>({result:f.result})};};
  await f.context.finishTest();assert.equal(f.context.SESSION_RESULTS.length,0);assert.equal(f.pages.length,0);assert.equal(f.context.serverSubmitting,false);
});

test('email delivery is bounded and uses only verified recipients',async()=>{
  const source=stripTypeScriptTypes(read('lib/result-email.ts')).replace(/^import.*;\r?\n/gm,'').replace('export async function','async function');
  let options,calls=0;
  const send=new Function('env','fetch','AbortSignal',source+'\nreturn sendAssessmentResultEmail;')({RESEND_API_KEY:'fixture'},async(url,opts)=>{calls++;options=opts;return {ok:true};},{timeout:ms=>({fixtureTimeout:ms})});
  const user={name:'Fixture',email:'learner@example.test',emailVerified:false};
  const result={title:'Test',subject:'Nature',grade:1,correct:8,total:10,pct:80};
  assert.equal(await send(user,result),false);assert.equal(calls,0);
  assert.equal(await send({...user,emailVerified:true},result),true);assert.equal(options.signal.fixtureTimeout,10000);
});
