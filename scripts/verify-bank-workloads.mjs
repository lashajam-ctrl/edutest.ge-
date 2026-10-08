import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readSnapshot} from './audit-bank-capacity.mjs';
import {ASSESSMENT_SUBJECTS_BY_GRADE,assessmentSubjectComponents,canonicalAssessmentSubject} from '../lib/school-policy.mjs';
import {coalesceSelectionGroups,assessmentSelectionKey,selectAssessmentCandidates} from '../lib/assessment-selection.ts';

const {db}=readSnapshot('.openai/bank-expansion-20261007/after.sql');
const rows=db.prepare('SELECT * FROM assessment_questions WHERE active=1').all();
const checks=[];
function simulate(pool,subject,grade,sizes,label){
 assert.ok(pool.length<=1000,'Audit must model the server candidate limit');
 let working=coalesceSelectionGroups(pool),seen=new Set();
 const distinct=new Set(working.map(assessmentSelectionKey)).size,papers=[];
 for(const [i,size] of sizes.entries()){
  const now=1800000000000+i*3600000,result=selectAssessmentCandidates(working,subject,grade,size,now);
  const keys=result.selected.map(assessmentSelectionKey);
  assert.equal(keys.length,Math.min(size,distinct),label+': incomplete paper');
  assert.equal(new Set(keys).size,keys.length,label+': repeated family within paper');
  const fresh=keys.filter(k=>!seen.has(k)).length;
  assert.equal(fresh,Math.min(size,distinct-seen.size),label+': premature recycling');
  assert.equal(result.rotation.freshGroups,fresh,label+': inaccurate freshness label');
  keys.forEach(k=>seen.add(k));
  const ids=new Set(result.selected.map(q=>q.id));
  working=working.map(q=>ids.has(q.id)?{...q,history_id:q.id,last_correct:1,last_answered_at:now}:q);
  papers.push({requested:size,delivered:keys.length,fresh,reused:keys.length-fresh});
 }
 return {label,distinct,papers};
}
for(const [g,subjects] of Object.entries(ASSESSMENT_SUBJECTS_BY_GRADE))for(const subject of subjects)for(const semester of [1,2]){
 const grade=Number(g),aliases=assessmentSubjectComponents(subject,grade);
 const pool=rows.filter(q=>q.grade===grade&&q.semester===semester&&aliases.includes(q.subject));
 for(const [mode,sizes]of [['twenty',Array(6).fill(20)],['mixed',[10,20,10,20,10,20]]])checks.push(simulate(pool,subject,grade,sizes,`${g}|${subject}|${semester}|${mode}`));
}
const tests=db.prepare('SELECT * FROM assessment_tests WHERE is_custom=0 AND published=1').all();
const catalog=[];
for(const t of tests){
 const aliases=assessmentSubjectComponents(t.subject,t.grade);
 const pool=rows.filter(q=>q.grade===t.grade&&aliases.includes(q.subject)&&(t.semester==null||q.semester===t.semester)&&(!['v8','v11','v23','v28'].includes(t.source_pool)||q.pool_prefix===t.source_pool)&&(!t.difficulty||q.difficulty===t.difficulty));
 const result=simulate(pool,canonicalAssessmentSubject(t.subject,t.grade),t.grade,[Number(t.question_count)],t.id);
 assert.ok(result.papers[0].delivered>=5,t.id+': unstartable');catalog.push(result);
}
const report={generatedAt:new Date().toISOString(),activeRows:rows.length,workloadBuckets:checks.length,simulatedPapers:checks.reduce((s,c)=>s+c.papers.length,0),catalogTests:catalog.length,failures:[],checks,catalog,limitations:['Simulation of the production selector and catalog filters, not an authenticated browser test.','No within-paper family repetition and no recycling while unseen eligible families remain.','Selection groups are not a claim of independently certified pedagogical concepts.','Language blueprint availability is measured separately; freshness takes precedence when a component runs out.']};
fs.writeFileSync('reports/bank-workloads-2026-10-07.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:true,activeRows:rows.length,simulatedPapers:report.simulatedPapers,catalogTests:catalog.length}));
