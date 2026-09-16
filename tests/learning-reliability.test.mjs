import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createDraftService,cleanDraftAnswers} from '../lib/assessment-drafts-core.mjs';
import {createReviewService,questionVersion} from '../lib/question-review-core.mjs';
import {makeLearningPlan,DAY_MS} from '../lib/learning-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('parent registration requires an adult DOB and creates no staff privileges; provider-free route test',async()=>{
 const source=stripTypeScriptTypes(read('app/api/auth/register/route.ts')).replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm,'').replace('export async function POST','async function POST');
 let stored;
 const deps={ensureSchema:async()=>{},eq:()=>{},users:{email:'email'},hashPassword:async()=>({hash:'fixture',salt:'fixture'}),sha256:async()=> 'fixture',consumeRateLimit:async()=>({allowed:true}),
 getDb:()=>({select:()=>({from:()=>({where:()=>({limit:async()=>[]})})}),insert:()=>({values:async user=>{stored=user;}})}),
 createSession:async()=>({cookie:'fixture=ok'}),publicUser:user=>({role:user.role,birthDate:user.birthDate,grade:user.grade}),createAndSendEmailVerification:async()=>{},createAndSendGuardianConsent:async()=>{}};
 const handler=new Function(...Object.keys(deps),source+'\nreturn POST;')(...Object.values(deps));
 const base={email:'parent@example.test',password:'fixture-not-a-real-password',name:'Parent fixture',role:'parent',birthDate:'1985-01-01',termsVersion:'v1',privacyVersion:'v1'};
 const request=body=>new Request('https://example.test/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 for(const birthDate of ['', '2015-01-01','1985-02-31'])assert.equal((await handler(request({...base,birthDate}))).status,400);
 assert.equal((await handler(request(base))).status,201);assert.equal(stored.role,'parent');assert.equal(stored.grade,null);assert.equal(stored.birthDate,base.birthDate);assert.equal(stored.emailVerified,false);
 assert.equal((await handler(request({...base,role:'admin',grade:'3'}))).status,201);assert.equal(stored.role,'student');
});
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT); INSERT INTO users VALUES(\'owner\',\'Reviewer\'),(\'other\',\'Other\');');
 sql.exec(read('drizzle/0005_secure_assessment_bank.sql'));sql.exec(read('drizzle/0012_violet_shockwave.sql'));sql.exec(read('drizzle/0013_learning_reliability.sql'));
 sql.exec("INSERT INTO assessment_tests(id,title,subject,grade,source_pool,question_count,time_minutes,attempts_allowed,test_type,created_at,updated_at)VALUES('test','Test','ქართული',3,'v11',5,10,2,'practice',1,1)");
 const db={prepare(query){return {query,args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args)||null;},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){return {meta:{changes:sql.prepare(query).run(...this.args).changes}};}};}};
 return {sql,db};
}
test('server draft survives reload, preserves order/deadline, isolates owners and prevents stale writes',async()=>{
 const {sql,db}=fixture();let time=1000;try{
 const snap={test:{id:'test',grade:3,subject:'ქართული'},questions:[{id:'q1',text:'Question',opts:['B','A']}]};
 sql.prepare("INSERT INTO assessment_sessions VALUES('s','owner','test','[\"q1\"]','{}','started',1000,20000,NULL)").run();
 sql.prepare("INSERT INTO assessment_session_drafts(session_id,snapshot_json,deadline_at,updated_at)VALUES('s',?,10000,1000)").run(JSON.stringify(snap));
 const service=createDraftService({db,now:()=>time});
 await assert.rejects(service.load('other','s'),e=>e.status===404);assert.equal((await service.list('other')).length,0);
 await service.save('owner','s',{answers:{q1:1},questionIndex:0,revision:0});
 const restored=await createDraftService({db,now:()=>time}).load('owner','s');assert.deepEqual(restored.answers,{q1:1});assert.deepEqual(restored.questions,snap.questions);assert.equal(restored.deadlineAt,10000);assert.equal(restored.revision,1);
 await assert.rejects(service.save('owner','s',{answers:{q1:0},questionIndex:0,revision:0}),e=>e.status===409);
 const races=await Promise.allSettled([0,1].map(value=>service.save('owner','s',{answers:{q1:value},questionIndex:0,revision:1})));assert.equal(races.filter(x=>x.status==='fulfilled').length,1);
 time=10001;await assert.rejects(service.save('owner','s',{answers:{q1:0},questionIndex:0,revision:2}),e=>e.status===410);assert.equal((await service.load('owner','s')).deadlineAt,10000);
 sql.exec("UPDATE assessment_sessions SET status='submitted' WHERE id='s'");await assert.rejects(service.load('owner','s'),e=>e.status===409);assert.equal((await service.list('owner')).length,0);
 }finally{sql.close();}
});
test('draft validation rejects alien ids, booleans, oversized/nested values and accepts question response shapes',()=>{
 for(const value of [{alien:1},{q:true},{q:{x:'bad'}},{q:'x'.repeat(4001)},{q:[[1]]}])assert.throws(()=>cleanDraftAnswers(value,['q']));
 assert.deepEqual(cleanDraftAnswers({q:{0:'answer',1:2}},['q']),{q:{0:'answer',1:2}});
 assert.deepEqual(cleanDraftAnswers({q:['x',2,null]},['q']),{q:['x',2,null]});
});
test('successful remediation postpones original mistake without rewriting test history; new mistake reopens it',()=>{
 const now=100*DAY_MS,base={question_id:'q',subject:'ქართული',topic:'reading',last_correct:0,last_answered_at:now-2*DAY_MS,next_review_at:now-DAY_MS};
 const input={user:{grade:3},tests:[],history:[{...base,remediated_at:now-DAY_MS}],now};
 const done=makeLearningPlan(input);assert.equal(done.mistakes,0);assert.equal(done.reinforcedMistakes,1);assert.equal(done.actions.length,0);assert.equal(input.history[0].last_correct,0);
 assert.equal(makeLearningPlan({...input,now:now+7*DAY_MS}).mistakes,1);
 assert.equal(makeLearningPlan({...input,history:[{...base,remediated_at:now-DAY_MS,last_answered_at:now}]}).mistakes,1);
});
test('human approval is explicit, version-bound and records reviewer; edits invalidate it and XSS notes remain plain data',async()=>{
 const {sql,db}=fixture();try{
 sql.prepare(`INSERT INTO assessment_questions(id,source_id,pool_key,pool_prefix,grade,subject,source_subject,semester,topic,question_type,public_payload_json,points,review_status,mapping_status,semantic_group_id,content_hash,imported_at,updated_at)
 VALUES('q','q','ge3','v11',3,'ქართული','ქართული',1,'reading','multiple_choice',?,1,'auto','exact','g','hash',1,1)`).run(JSON.stringify({text:'Question',opts:['A','B']}));
 sql.exec(`INSERT INTO assessment_answer_keys VALUES('q','{"correct":1}','Explanation',1)`);
 const service=createReviewService({db,now:()=>5000}),page=await service.list({grade:3});assert.equal(page.items[0].currentDecision,'unreviewed');
 const body={questionId:'q',version:page.items[0].version,decision:'approved',note:'<img src=x onerror=alert(1)>',checks:{answer:true,wording:true,grade:true}};
 await assert.rejects(service.record('owner',{...body,checks:{}}),e=>e.status===400);
 await service.record('owner',body);const current=(await service.list({grade:3})).items[0];assert.equal(current.currentDecision,'approved');assert.equal(current.history[0].reviewer,'Reviewer');assert.equal(current.history[0].note,body.note);
 sql.exec("UPDATE assessment_answer_keys SET explanation='Corrected explanation' WHERE question_id='q'");
 assert.equal((await service.list({grade:3})).items[0].currentDecision,'unreviewed');await assert.rejects(service.record('owner',body),e=>e.status===409);
 assert.notEqual(await questionVersion({id:'q',points:1}),await questionVersion({id:'q',points:2}));
 }finally{sql.close();}
});
test('parent onboarding and route boundaries remain explicit; no self-assigned teacher/admin privilege',()=>{
 const reg=read('app/api/auth/register/route.ts'),profile=read('app/api/auth/profile/route.ts'),nav=read('src/legacy-app/30-state-navigation.js'),ui=read('public/learning-hub.js');
 assert.match(reg,/body.role === "parent"/);assert.match(reg,/age<18/);assert.match(reg,/pending_teacher/);assert.match(profile,/completingProfile &&/);assert.match(profile,/\['student','parent'\]/);
 assert.match(nav,/p==='parent'&&role!=='parent'/);assert.match(ui,/loadParentHome/);assert.match(ui,/refreshSavedAssessments/);assert.doesNotMatch(ui,/\.innerHTML\s*=/);
 for(const route of ['start','submit','draft'])assert.match(read('app/api/assessments/'+route+'/route.ts'),/\['student','teacher','admin'\]/);
  assert.match(read('app/api/admin/question-reviews/route.ts'),/user.role!=='admin'/);
});
test('active minors need guardian consent at the shared server session boundary',async()=>{
 const source=stripTypeScriptTypes(read('lib/auth.ts')).replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm,'').replaceAll('export ','');
 let user={id:'child',role:'student',grade:'3ა',birthDate:'2014-01-01',guardianVerifiedAt:null,emailVerified:true,accountStatus:'active'};
 const db={select:()=>({from:()=>({innerJoin:()=>({where:()=>({limit:async()=>[{user,sessionId:'s'}]})})})})};
 const getSessionUser=new Function('env','and','eq','gt','ensureSchema','getDb','sessions','users',source+'\nreturn getSessionUser;')
   ({DB:{}},()=>({}),()=>({}),()=>({}),async()=>{},()=>db,{id:'id',tokenHash:'token',userId:'uid',expiresAt:'expires'},{id:'id'});
 const request=path=>new Request('https://example.test'+path,{headers:{cookie:'edutest_session=fixture'}});
 assert.equal(await getSessionUser(request('/api/assessments/start')),null);
 assert.ok(await getSessionUser(request('/api/auth/session')),'recovery/session status remains available');
 user={...user,guardianVerifiedAt:new Date()};assert.ok(await getSessionUser(request('/api/assessments/start')));
 user={...user,birthDate:'1990-01-01',guardianVerifiedAt:null};assert.ok(await getSessionUser(request('/api/attempts')));
});
test('account recovery, logout overlays and assignment scoping retain functional boundaries',()=>{
 const reset=read('app/api/auth/password/complete/route.ts'),confirm=read('app/api/auth/email/confirm/route.ts');
 const assignmentsRoute=read('app/api/assignments/route.ts'),studentsRoute=read('app/api/management/students/route.ts');
 assert.match(reset,/account_status='email_pending'/);assert.match(reset,/profile_completed_at IS NULL/);assert.match(reset,/account_status IN \('active','onboarding','email_pending'\)/);
 assert.match(confirm,/account_status IN \('active','onboarding','email_pending'\)/);assert.doesNotMatch(confirm,/accountStatus: "active"/);
 assert.match(assignmentsRoute,/eq\(assignments\.createdBy,current\.user\.id\)/);assert.match(assignmentsRoute,/eq\(users\.school,school\)/);assert.match(assignmentsRoute,/schoolGradeNumber/);
 assert.match(studentsRoute,/gradeNumbers\.has\(schoolGradeNumber\(row\.grade\)\)/);
 const logout=read('src/legacy-app/50-adaptive-learning.js');for(const id of ['age-verification-modal','guardian-pending-modal','email-verification-modal','admin-mfa-modal'])assert.match(logout,new RegExp(id));
 const navigation=read('src/legacy-app/30-state-navigation.js');assert.match(navigation,/appUser\.role!=='student'\|\|gate==='ok'/);
});
test('server-backed results remain single after learning-state hydration',()=>{
 const navigation=read('src/legacy-app/30-state-navigation.js');
 const helper=navigation.slice(navigation.indexOf('function learningResultFingerprint'),navigation.indexOf('async function hydrateServerLearningState'));
 const context={};runInNewContext(helper,context);
 const local={userId:'student@example.test',testId:'english-3',date:'9/16/2026',earned:18,totalPts:18,correct:10,total:10,pct:100,reviewed:[{id:'q1'},{id:'q2'}],xpEarned:50};
 const remote={...local,_serverAttemptId:'session-1',verified:true};
 assert.equal(context.learningResultFingerprint(local),context.learningResultFingerprint(remote));
 assert.match(navigation,/remoteFingerprints\.has\(learningResultFingerprint\(row\)\)/);
 assert.match(read('public/server-assessments.js'),/result\._serverAttemptId=submittingSession/);
});
