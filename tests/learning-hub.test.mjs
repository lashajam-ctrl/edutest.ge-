import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import {canonicalTestType,studentCanStudyGrade,schoolGradeNumber,subjectAllowedForGrade} from '../lib/school-policy.mjs';
import {learnerAllowed,tbilisiDay,makeLearningPlan,weeklySummary,GUARDIAN_CHILDREN_SQL,chooseFollowup,DAY_MS} from '../lib/learning-core.mjs';
import {createPracticeService} from '../lib/learning-practice-core.mjs';
import {bankHealth} from '../lib/bank-health-core.mjs';
import {assessmentSelectionKey} from '../lib/assessment-selection.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const assessmentCode=stripTypeScriptTypes(read('lib/assessment.ts').replaceAll('"./assessment-selection"',JSON.stringify(new URL('../lib/assessment-selection.ts',import.meta.url).href)).replaceAll('"./school-policy.mjs"',JSON.stringify(new URL('../lib/school-policy.mjs',import.meta.url).href)).replaceAll('"./short-answer-core.mjs"',JSON.stringify(new URL('../lib/short-answer-core.mjs',import.meta.url).href)));
const {prepareQuestion,parsePublicPayload,gradeAssessmentAnswer,assessmentTestJson}=await import('data:text/javascript,'+encodeURIComponent(assessmentCode));
const now=Date.parse('2026-09-09T10:00:00Z');
const student={id:'learner',role:'student',accountStatus:'active',emailVerified:true,grade:'3ა',birthDate:'2017-01-01',guardianVerifiedAt:1};
const question=(id,group,overrides={})=>({id,grade:3,subject:'ქართული',semester:2,topic:'reading',question_type:'multiple_choice',points:1,active:1,pool_prefix:'v11',semantic_group_id:group,public_payload_json:JSON.stringify({text:id+' ამოცანა',opts:['ა','ბ','გ']}),...overrides});

test('one school policy covers section grades, Russian availability, senior math and legacy practice aliases',()=>{
  assert.equal(schoolGradeNumber('3ა'),3);assert.equal(schoolGradeNumber(13),null);assert.equal(schoolGradeNumber(123),null);
  assert.ok(studentCanStudyGrade('3ა',4));assert.ok(!studentCanStudyGrade(3,5));
  assert.ok(subjectAllowedForGrade('რუსული',5));assert.ok(!subjectAllowedForGrade('რუსული',3));
  assert.ok(subjectAllowedForGrade('ალგებრა',12));assert.ok(!subjectAllowedForGrade('ქიმია',12));
  assert.equal(canonicalTestType('mid'),'practice');assert.equal(canonicalTestType('practice'),'practice');assert.equal(canonicalTestType('sum'),'sum');
  const row={id:'t',title:'ქართული — III',subject:'ქართული',grade:3,semester:2,test_type:'practice',question_count:10,published:1,source_pool:'legacy'};
  assert.match(assessmentTestJson(row).title,/სავარჯიშო/);assert.equal(assessmentTestJson(row).curriculumVerified,false);
});
test('new learning access fails closed for anonymous, staff, blocked, unverified and unconsented child',()=>{
  assert.equal(learnerAllowed(student,now),true);
  for(const user of [null,{...student,role:'teacher'},{...student,accountStatus:'blocked'},{...student,emailVerified:false},{...student,guardianVerifiedAt:null},{...student,birthDate:''}])assert.equal(learnerAllowed(user,now),false);
});
test('Tbilisi boundaries and plans use server history and matching grade catalog only',()=>{
  const time=Date.parse('2026-09-08T21:00:00Z');assert.equal(tbilisiDay(time).date,'2026-09-09');assert.equal(tbilisiDay(time).start,Date.parse('2026-09-08T20:00:00Z'));
  const tests=[{id:'eligible',grade:3,subject:'ქართული',published:true,serverBacked:true,count:10},{id:'private',grade:3,subject:'ქართული',published:false,serverBacked:true},{id:'wrong-grade',grade:7,subject:'ფიზიკა',published:true,serverBacked:true}];
  const data=makeLearningPlan({user:student,tests,history:[{question_id:'mistake',subject:'ქართული',topic:'reading',last_correct:0,next_review_at:0}],now});
  assert.equal(data.actions[0].sourceQuestionId,'mistake');assert.deepEqual(data.actions.filter(a=>a.testId).map(a=>a.testId),['eligible']);assert.equal(data.dueQuestions,1);
});
test('weekly summary excludes forged practice, invalid JSON and old attempts; counts answers not average-of-averages',()=>{
  const result={verified:true,assessmentMode:'verified',subject:'ქართული',reviewed:[{ok:true,topic:'reading'},{ok:false,topic:'reading'}]};
  const rows=[{submitted_at:now,answers_json:JSON.stringify(result)},{submitted_at:now,answers_json:JSON.stringify({...result,verified:false})},{submitted_at:now-8*DAY_MS,answers_json:JSON.stringify(result)},{submitted_at:now,answers_json:'broken'}];
  const summary=weeklySummary(rows,now);assert.equal(summary.tests,1);assert.equal(summary.questions,2);assert.equal(summary.percentage,50);assert.equal(summary.automaticEmail,false);assert.equal(summary.strengths.length,0);
});
test('guardian relationship requires matching current accepted child/email/version; no arbitrary child access',()=>{
  const db=new DatabaseSync(':memory:');try{
    db.exec("CREATE TABLE users(id TEXT,name TEXT,grade TEXT,guardian_email TEXT,guardian_verified_at INTEGER,role TEXT,account_status TEXT); CREATE TABLE guardian_consent_requests(child_user_id TEXT,guardian_email TEXT,status TEXT,accepted_at INTEGER);");
    const put=db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)');
    put.run('own','A','3','parent@example.test',100,'student','active');put.run('stale','B','3','parent@example.test',200,'student','active');put.run('other','C','3','other@example.test',100,'student','active');put.run('auto','D','11','parent@example.test',100,'student','active');
    db.exec("INSERT INTO guardian_consent_requests VALUES('own','parent@example.test','accepted',100),('stale','parent@example.test','accepted',100),('other','other@example.test','accepted',100)");
    assert.deepEqual(db.prepare(GUARDIAN_CHILDREN_SQL).all('PARENT@example.test').map(r=>r.id),['own']);assert.deepEqual(db.prepare(GUARDIAN_CHILDREN_SQL).all('stranger@example.test'),[]);
  }finally{db.close();}
  assert.match(read('app/api/learning/weekly/route.ts'),/requested&&!children\.some/);
});
test('same skill followup rejects same semantic family, wrong semester, inactive and unsupported questions',()=>{
  const source=question('old','same'),candidates=[question('cosmetic','same'),question('semester','new',{semester:1}),question('closed','new',{active:0}),question('unsupported','new',{question_type:'fill'}),question('different','different')];
  assert.equal(chooseFollowup(source,candidates,assessmentSelectionKey).id,'different');
  assert.equal(chooseFollowup(source,candidates.slice(0,-1),assessmentSelectionKey),null);
});
test('blank values and booleans never score as option zero or numeric zero',()=>{
  for(const type of ['multiple_choice','calc']){
    const q=question('zero','z',{question_type:type});
    for(const answer of [null,undefined,'',' ',false,[],{}])assert.equal(gradeAssessmentAnswer({question:q,answerKey:{correct:0},userAnswer:answer,publicPayload:parsePublicPayload(q)}).correct,false);
    assert.equal(gradeAssessmentAnswer({question:q,answerKey:{correct:0},userAnswer:0,publicPayload:parsePublicPayload(q)}).correct,true);
  }
});
test('bank metrics distinguish active from answer-ready and never infer human verification',()=>{
  const rows=[question('a','g',{has_answer_key:1,review_status:'curriculum_reviewed'}),question('b','g',{has_answer_key:0,review_status:'__proto__'}),question('c','h',{active:0,has_answer_key:1})];
  const data=bankHealth(rows,assessmentSelectionKey,{grade:3});assert.equal(data.scannedRows,3);assert.equal(data.missingAnswerKeys,1);assert.equal(data.buckets[0].activeRows,2);assert.equal(data.buckets[0].answerReadyRows,1);assert.equal(data.buckets[0].selectionGroups,1);assert.equal(data.humanVerification.verifiedCount,null);assert.equal(data.buckets[0].reviewStatuses.__proto__,1);
  const serialized=JSON.stringify(data);assert.doesNotMatch(serialized,/public_payload_json|answer_key_json/);
  const route=read('app/api/admin/question-bank-health/route.ts');assert.ok(route.indexOf("current?.user.role!=='admin'")<route.indexOf('env.DB.prepare'));
});

function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('learner'),('other');
    CREATE TABLE assessment_questions(id TEXT PRIMARY KEY,grade INTEGER,subject TEXT,semester INTEGER,topic TEXT,question_type TEXT,points INTEGER,active INTEGER,pool_prefix TEXT,semantic_group_id TEXT,public_payload_json TEXT);
    CREATE TABLE assessment_answer_keys(question_id TEXT PRIMARY KEY,answer_key_json TEXT,explanation TEXT);
    CREATE TABLE assessment_question_history(user_id TEXT,question_id TEXT,semantic_group_id TEXT,answered_count INTEGER,correct_count INTEGER,last_correct INTEGER,last_answered_at INTEGER,next_review_at INTEGER,PRIMARY KEY(user_id,question_id));`);
  sqlite.exec(read('drizzle/0012_violet_shockwave.sql'));
  for(const q of [question('source','same'),question('cosmetic','same'),question('different','different')]){
    sqlite.prepare('INSERT INTO assessment_questions VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(...['id','grade','subject','semester','topic','question_type','points','active','pool_prefix','semantic_group_id','public_payload_json'].map(k=>q[k]));
    sqlite.prepare('INSERT INTO assessment_answer_keys VALUES(?,?,?)').run(q.id,JSON.stringify({correct:1}),'ბ სწორია.');
  }
  sqlite.exec("INSERT INTO assessment_question_history VALUES('learner','source','same',1,0,0,1,1)");
  const db={prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)??null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){return {meta:{changes:sqlite.prepare(sql).run(...this.args).changes}};}};},async batch(statements){sqlite.exec('BEGIN');try{const rows=statements.map(s=>({meta:{changes:sqlite.prepare(s.sql).run(...s.args).changes}}));sqlite.exec('COMMIT');return rows;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  let time=now;
  const service=createPracticeService({db,selectionKey:assessmentSelectionKey,prepare:prepareQuestion,now:()=>time,grade(q,userAnswer,presentation){return {...gradeAssessmentAnswer({question:q,answerKey:JSON.parse(q.answer_key_json),userAnswer,presentation,publicPayload:parsePublicPayload(q)}),explanation:q.explanation};}});
  return {sqlite,service,advance:ms=>{time+=ms;}};
}
test('real SQLite practice lifecycle: owned mistake → different sanitized question → server grade → durable history; retries do not rescore',async()=>{
  const f=fixture();try{
    await assert.rejects(f.service.start('other','source',3),{status:404});await assert.rejects(f.service.start('learner','source',12),{status:404});
    const started=await f.service.start('learner','source',3);assert.equal(started.question.id,'different');assert.doesNotMatch(JSON.stringify(started),/answer_key|correct|explanation/);
    const answer=started.question.opts.indexOf('ბ');
    await assert.rejects(f.service.submit('other',started.sessionId,answer),{status:404});
    const [one,two]=await Promise.all([f.service.submit('learner',started.sessionId,answer),f.service.submit('learner',started.sessionId,answer)]);
    assert.equal(one.correct,true);assert.deepEqual(two,one);assert.equal(one.countsTowardTestScore,false);
    assert.equal(f.sqlite.prepare("SELECT answered_count FROM assessment_question_history WHERE question_id='different'").get().answered_count,1);
    assert.deepEqual(await f.service.submit('learner',started.sessionId,0),one);
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='attempts'").get().n,0);
  }finally{f.sqlite.close();}
});
test('practice expires, rejects blank answer, and refuses inactive historical source',async()=>{
  const f=fixture();try{
    const started=await f.service.start('learner','source',3);await assert.rejects(f.service.submit('learner',started.sessionId,''),{status:400});
    f.advance(21*60_000);await assert.rejects(f.service.submit('learner',started.sessionId,1),{status:410});
    f.sqlite.exec("UPDATE assessment_questions SET active=0 WHERE id='source'");await assert.rejects(f.service.start('learner','source',3),{status:404});
  }finally{f.sqlite.close();}
});
test('new UI renders hostile content as text and provides accessible dialog, focus and retry states',()=>{
  const source=read('public/learning-hub.js');assert.doesNotMatch(source,/innerHTML|insertAdjacentHTML|document\.write|eval\(/);
  assert.match(source,/node\.textContent=String\(text\)/);assert.match(source,/d\.showModal/);assert.match(source,/previous\.focus/);assert.match(source,/owner!==identity/);assert.match(source,/ხელახლა/);
});

test('screenshot regression: Georgian grade 3 semester 2 practice is offered after clearing unavailable sum filter',()=>{
  class Element{
    constructor(tag='div'){this.tag=tag;this.children=[];this._value='';this.textContent='';this.style={};this.dataset={};this.events={};}
    append(...nodes){this.children.push(...nodes);if(this.tag==='select'){const selected=nodes.find(n=>n.selected);if(selected)this._value=selected.value;}}
    appendChild(n){this.append(n);return n;}replaceChildren(...nodes){this.children=[];this._value='';this.append(...nodes);if(this.tag==='select'&&!nodes.some(n=>n.selected))this._value=nodes[0]?.value||'';}
    set innerHTML(v){this.html=v;this.children=[];}get innerHTML(){return this.html||'';}setAttribute(){}addEventListener(n,fn){this.events[n]=fn;}
    set value(v){this._value=String(v);}get value(){return this._value;}
  }
  const controls=Object.fromEntries(['s-filter-grade','s-filter-subject','s-filter-semester','s-filter-testtype','s-test-list'].map(id=>[id,new Element(id==='s-test-list'?'div':'select')]));
  Object.entries({'s-filter-grade':'3','s-filter-subject':'ქართული','s-filter-semester':'2','s-filter-testtype':'sum'}).forEach(([id,v])=>{controls[id].value=v;});
  const html=read('public/app.html');const code=html.slice(html.indexOf('function renderStudentTests(){'),html.indexOf('// ── Teacher Tests Table'));
  const sandbox={CUR_USER:{grade:'3',email:'test@example.test'},ALL_TESTS:[{id:'v11-ge3s2',serverBacked:true,subject:'ქართული',grade:3,semester:2,testType:'practice',count:10,time:15}],USER_DB:[],
    document:{getElementById:id=>controls[id]||null,createElement:tag=>new Element(tag),querySelector:()=>null},populateSubjectDropdown(){},subjectFamily:s=>s,t:s=>s,esc:s=>s,txTitle:t=>t.id,
    Option:function(text,value,def,selected){return {textContent:text,value,selected};},EduTestSchoolRules:globalThis.EduTestSchoolRules,EDUTEST_CATALOG_STATE:'ready',SUBJ_COLORS:{},SUBJ_ICONS:{},getTestAccess:()=> 'free'};
  sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(code,sandbox);sandbox.renderStudentTests();
  const empty=controls['s-test-list'].children[0];assert.match(empty.textContent,/ფილტრების კომბინაციით/);
  assert.ok(controls['s-filter-testtype'].children.some(o=>o.value==='practice'));
  const reset=empty.children.find(n=>n.tag==='button');assert.match(reset.textContent,/ხელმისაწვდომი ტიპების/);reset.events.click();
  assert.match(controls['s-test-list'].innerHTML,/v11-ge3s2/);assert.equal(controls['s-filter-testtype'].value,'');
});
