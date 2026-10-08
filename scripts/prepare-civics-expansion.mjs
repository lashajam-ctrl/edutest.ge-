import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readSnapshot} from './audit-bank-capacity.mjs';
import {validateCivicsBatch} from './civics-expansion-quality.mjs';
import {normalizedPrompt,lexicalSimilarity} from './bank-expansion-quality.mjs';
import {canonicalPublicTaskCore} from '../lib/assessment-selection-core.mjs';
import {coalesceSelectionGroups,assessmentSelectionKey,distinctSelectionGroupCount,selectAssessmentCandidates} from '../lib/assessment-selection.ts';
const root='.openai/bank-expansion-20261007';
const questions=JSON.parse(fs.readFileSync(root+'/civics-questions.json','utf8'));
const checks=validateCivicsBatch(questions);
assert.equal(questions.length,40);
const {db,sha256}=readSnapshot(root+'/civics-before-production.sql');
const before=db.prepare('SELECT * FROM assessment_questions').all();
const active=before.filter(q=>q.active===1);
const oldKeys=db.prepare('SELECT * FROM assessment_answer_keys ORDER BY question_id').all();
assert.equal(active.length,23433,'Production baseline changed; inspect before proceeding');
const normalized=active.map(q=>({id:q.id,text:JSON.parse(q.public_payload_json).text,payload:JSON.parse(q.public_payload_json),grade:q.grade,subject:q.subject,semester:q.semester}));
const exact=new Set(normalized.map(q=>normalizedPrompt(q.text)));
const cores=new Set(normalized.map(q=>canonicalPublicTaskCore(q.payload)));
const neighbors=[],flags=[];
for(const q of questions){
 assert.ok(!before.some(x=>x.id===q.id),'ID already exists');
 assert.ok(!exact.has(normalizedPrompt(q.text)),'Existing global prompt');
 assert.ok(!cores.has(canonicalPublicTaskCore({text:q.text,type:'multiple_choice',opts:q.options})),'Existing canonical task core');
 const candidates=normalized.filter(x=>x.subject===q.subject).map(x=>({id:x.id,text:x.text,score:lexicalSimilarity(q.text,x.text)})).sort((a,b)=>b.score-a.score).slice(0,3);
 neighbors.push({id:q.id,neighbors:candidates});
 for(const c of candidates.filter(x=>x.score>=.45))flags.push({newId:q.id,existingId:c.id,score:c.score});
}
for(let i=0;i<questions.length;i++)for(let j=0;j<i;j++){
 const score=lexicalSimilarity(questions[i].text,questions[j].text);
 if(score>=.45)flags.push({newId:questions[i].id,existingId:questions[j].id,score});
}
fs.writeFileSync(root+'/civics-neighbors.json',JSON.stringify(neighbors,null,2));
assert.deepEqual(flags,[],'Similarity candidates require explicit content review before release');
const hash=x=>createHash('sha256').update(x).digest('hex');
const sql=x=>x==null?'NULL':typeof x==='number'?String(x):`'${String(x).replaceAll("'","''")}'`;
const cols=db.prepare('PRAGMA table_info(assessment_questions)').all().map(x=>x.name);
const now=Date.now(),records=[],statements=[];
for(const q of questions){
 const payload={id:q.id,text:q.text,type:'multiple_choice',pts:2,grade:q.grade,subject:q.subject,semester:q.semester,topic:q.topic,opts:q.options,difficulty:'core'};
 assert.ok(!['correct','answer','answerKey','explanation','model','optionReview'].some(k=>k in payload));
 const key={correct:q.correct};
 const row={id:q.id,source_id:`civics-expansion-20261008:${q.id}`,pool_key:`G${q.grade}|${q.subject}|${q.semester}`,pool_prefix:'v28',grade:q.grade,subject:q.subject,source_subject:'Original assistant-reviewed civics practice; not teacher-certified',semester:q.semester,topic:q.topic,strand:q.curriculumTheme,question_type:'multiple_choice',public_payload_json:JSON.stringify(payload),points:2,difficulty:'core',review_status:'algorithmically_validated',mapping_status:'civics_expansion_20261008',semantic_group_id:`qe5-family:${q.family}`,content_hash:hash(JSON.stringify([payload,key,q.explanation])),active:1,imported_at:now,updated_at:now};
 statements.push(`INSERT INTO assessment_questions(${cols.join(',')}) VALUES(${cols.map(c=>sql(row[c])).join(',')}) ON CONFLICT(id) DO NOTHING;`);
 statements.push(`INSERT INTO assessment_answer_keys(question_id,answer_key_json,explanation,updated_at) SELECT ${sql(q.id)},${sql(JSON.stringify(key))},${sql(q.explanation)},${now} WHERE EXISTS(SELECT 1 FROM assessment_questions WHERE id=${sql(q.id)} AND content_hash=${sql(row.content_hash)}) ON CONFLICT(question_id) DO NOTHING;`);
 records.push({row,key,explanation:q.explanation});
}
db.exec(statements.join('\n'));db.exec(statements.join('\n'));
const after=db.prepare('SELECT * FROM assessment_questions').all();
const afterMap=new Map(after.map(q=>[q.id,q]));
for(const old of before)assert.deepEqual(afterMap.get(old.id),old,'Changed existing question');
assert.deepEqual(db.prepare("SELECT * FROM assessment_answer_keys WHERE question_id NOT LIKE 'qe5-%' ORDER BY question_id").all(),oldKeys,'Changed an existing answer key');
assert.equal(after.length,before.length+40,'Import must be idempotent');
const workloads=[],buckets=[];
function simulate(pool,sizes,label){
 let working=coalesceSelectionGroups(pool),seen=new Set();
 const distinct=distinctSelectionGroupCount(working),papers=[];
 assert.ok(pool.length<=1000,'Production candidate cap');
 for(const [i,count]of sizes.entries()){
  const now=1800000000000+i*3600000,r=selectAssessmentCandidates(working,'მოქალაქეობა',pool[0].grade,count,now);
  const keys=r.selected.map(assessmentSelectionKey),fresh=keys.filter(k=>!seen.has(k)).length;
  assert.equal(keys.length,count,label+': incomplete paper');
  assert.equal(new Set(keys).size,count,label+': repeated family within paper');
  assert.equal(fresh,Math.min(count,distinct-seen.size),label+': premature repeat');
  assert.equal(r.rotation.freshGroups,fresh,label+': freshness reporting');
  keys.forEach(k=>seen.add(k));const ids=new Set(r.selected.map(q=>q.id));
  working=working.map(q=>ids.has(q.id)?{...q,history_id:q.id,last_correct:1,last_answered_at:now}:q);
  papers.push({requested:count,delivered:keys.length,fresh,reused:keys.length-fresh});
 }
 return {label,distinct,papers};
}
for(const grade of [7,8])for(const semester of [1,2]){
 const scope=q=>q.grade===grade&&q.semester===semester&&q.subject==='მოქალაქეობა'&&q.active===1;
 const b=active.filter(scope),a=after.filter(scope);
 const beforeGroups=distinctSelectionGroupCount(coalesceSelectionGroups(b)),afterGroups=distinctSelectionGroupCount(coalesceSelectionGroups(a));
 assert.equal(afterGroups-beforeGroups,10,'A variant must not inflate claimed diversity');
 buckets.push({grade,semester,beforeRows:b.length,afterRows:a.length,beforeGroups,afterGroups,added:10,freshTenQuestionPapers:Math.floor(afterGroups/10),freshTwentyQuestionPapers:Math.floor(afterGroups/20)});
 for(const [mode,sizes]of [['ten',Array(9).fill(10)],['twenty',Array(5).fill(20)],['mixed',[10,20,10,20,10,20,10]]])workloads.push(simulate(a,sizes,`${grade}|${semester}|${mode}`));
}
const tests=db.prepare("SELECT * FROM assessment_tests WHERE published=1 AND is_custom=0 AND subject='მოქალაქეობა' AND grade IN (7,8)").all();
const catalog=tests.map(t=>{
 const pool=after.filter(q=>q.active===1&&q.grade===t.grade&&q.subject===t.subject&&(t.semester==null||q.semester===t.semester)&&(!['v8','v11','v23','v28'].includes(t.source_pool)||q.pool_prefix===t.source_pool)&&(!t.difficulty||q.difficulty===t.difficulty));
 return simulate(pool,[Number(t.question_count)],t.id);
});
assert.ok(catalog.length>=4,'Expected live catalog routes');
const report={generatedAt:new Date().toISOString(),snapshotSha256:sha256,baselineActive:active.length,afterActive:active.length+questions.length,added:questions.length,authoredFamilies:questions.length,optionRationalesChecked:questions.length*4,computationalEvidenceChecks:checks.filter(x=>x.check!=='assistant_option_by_option_review_only').length,assistantJudgementOnly:checks.filter(x=>x.check==='assistant_option_by_option_review_only').length,exactDuplicateAdditions:0,canonicalDuplicateAdditions:0,lexicalReviewThreshold:.45,unresolvedSimilarityCandidates:flags,buckets,simulatedPapers:workloads.reduce((n,w)=>n+w.papers.length,0),workloads,catalog,failures:[],sources:[{title:'Ministry citizenship guide, page 5: VII–VIII themes',url:'https://www.mes.gov.ge/uploads/files/gzamkvlevi/მოქალაქეობა.pdf',accessed:'2026-10-08'}],limitations:['Assistant-authored and option-by-option reviewed; not independently teacher-certified.','Eight prompts have computational evidence checks; 32 depend on assistant semantic judgement.','Semester placement is a configurable editorial allocation, not a ministry-mandated calendar.','Similarity thresholds and selector families do not prove absence of every semantic overlap.','Fresh-paper counts assume no previous attempts in that grade/subject/semester; 10/20 modes share history.','The 200-group planning target remains unmet in these buckets.','No authenticated learner submission is performed by this bank-only release.']};
report.privateDraftSha256=hash(fs.readFileSync(root+'/civics-questions.json'));
report.patchSha256=hash(statements.join('\n')+'\n');
fs.writeFileSync(root+'/civics-reviewed.json',JSON.stringify({records,questions,checks},null,2));
fs.writeFileSync(root+'/civics-patch.sql',statements.join('\n')+'\n');
fs.writeFileSync('reports/civics-expansion-2026-10-08.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({added:report.added,buckets,simulatedPapers:report.simulatedPapers,catalogTests:catalog.length,computationalEvidenceChecks:report.computationalEvidenceChecks,failures:report.failures},null,2));
