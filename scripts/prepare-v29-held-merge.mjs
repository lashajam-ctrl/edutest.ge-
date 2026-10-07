import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {held} from './review-v29-held.mjs';
import {curateHeld,manifestHash} from './v29-held-curation.mjs';
import {selectAssessmentCandidates} from '../lib/assessment-selection.ts';
import {canonicalPublicTaskCore} from '../lib/assessment-selection-core.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const sql=x=>x==null?'NULL':typeof x==='number'?String(x):`'${String(x).replaceAll("'","''")}'`;
assert.equal(held.length,496);assert.equal(hash(held.map(q=>q.id).join('\n')),manifestHash,'Authoring index manifest drift');
const {questions,changed}=curateHeld(held);
const snapshot=fs.readFileSync('.openai/v29-reviewed-after.sql','utf8');
const db=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});db.exec(snapshot);
const query='SELECT q.*,a.answer_key_json,a.explanation FROM assessment_questions q JOIN assessment_answer_keys a ON q.id=a.question_id';
const before=db.prepare(query).all(), existing=new Set(before.map(q=>q.id));
assert.equal(before.filter(q=>q.active===1).length,22542,'Unexpected release baseline');
for(const file of fs.readdirSync('.openai/v29-staging-conversion').filter(f=>/^questions-.*\.sql$/.test(f)).sort())db.exec(fs.readFileSync('.openai/v29-staging-conversion/'+file,'utf8'));
const staged=new Map(db.prepare(query).all().map(q=>[q.id,q]));
const columns=db.prepare('PRAGMA table_info(assessment_questions)').all().map(c=>c.name);
const statements=[],rollback=[],records=[],now=Date.now();
for(let n=0;n<questions.length;n++){
 const q=questions[n],row={...staged.get(q.id)};assert.ok(row.id);assert.ok(!existing.has(q.id));
 assert.equal(q.p.id,row.id);assert.equal(q.p.grade,row.grade);assert.equal(q.p.subject,row.subject);assert.equal(q.p.semester,row.semester);
 row.question_type=q.p.type;row.public_payload_json=JSON.stringify(q.p);row.answer_key_json=JSON.stringify(q.a);row.explanation=q.explanation;
 row.active=1;row.mapping_status='v29_assistant_content_review';row.updated_at=now;
 row.content_hash=hash(JSON.stringify([row.public_payload_json,row.answer_key_json,row.explanation,row.strand,row.subject,row.topic]));
 // Keep original semantic-group IDs: changing surface wording must never
 // disguise an existing family as a new independent concept.
 statements.push(`INSERT INTO assessment_questions (${columns.join(',')}) VALUES (${columns.map(k=>sql(row[k])).join(',')}) ON CONFLICT(id) DO NOTHING;`);
 statements.push(`INSERT INTO assessment_answer_keys(question_id,answer_key_json,explanation,updated_at) SELECT ${sql(row.id)},${sql(row.answer_key_json)},${sql(row.explanation)},${now} WHERE EXISTS(SELECT 1 FROM assessment_questions WHERE id=${sql(row.id)} AND content_hash=${sql(row.content_hash)}) ON CONFLICT(question_id) DO UPDATE SET answer_key_json=excluded.answer_key_json,explanation=excluded.explanation,updated_at=excluded.updated_at;`);
 rollback.push(`UPDATE assessment_questions SET active=0 WHERE id=${sql(row.id)} AND content_hash=${sql(row.content_hash)};`);
 records.push({id:row.id,inputHash:hash(JSON.stringify([held[n].p,held[n].a,held[n].explanation])),changed:changed.has(n),grade:row.grade,subject:row.subject,semester:row.semester,contentHash:row.content_hash,publicPayload:q.p,answerKey:q.a,explanation:q.explanation});
}
const check=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});check.exec(snapshot);check.exec(statements.join('\n'));check.exec(statements.join('\n')); // idempotency
const after=check.prepare(query).all(), rows=after.filter(q=>q.active===1),afterMap=new Map(after.map(q=>[q.id,q]));
assert.equal(rows.length,22542+496);
for(const old of before)assert.deepEqual(afterMap.get(old.id),old,'Existing question changed: '+old.id);
const failures=[];
for(const q of rows){
 const p=JSON.parse(q.public_payload_json),a=JSON.parse(q.answer_key_json), fail=why=>failures.push({id:q.id,why});
 if(!p.text?.trim()||!q.explanation?.trim())fail('empty prompt/explanation');
 if(p.type!==q.question_type)fail('type drift');
 if(['multiple_choice','true_false'].includes(q.question_type)&&(!Array.isArray(p.opts)||p.opts.some(x=>!String(x).trim())||new Set(p.opts.map(x=>String(x).trim().toLowerCase())).size!==p.opts.length||!Number.isInteger(a.correct)||a.correct<0||a.correct>=p.opts.length))fail('invalid options/key');
 if(records.some(r=>r.id===q.id)){
  if(p.type==='order')assert.deepEqual([...p.items].sort(),[...a.correct].sort(),q.id);
  if(p.type==='match'){assert.deepEqual([...p.rightOptions].sort(),[...a.correct].sort(),q.id);assert.deepEqual(a.pairs,p.leftItems.map((x,i)=>[x,a.correct[i]]),q.id);assert.equal(new Set(p.rightOptions).size,p.rightOptions.length,q.id);}
  if(p.type==='fill'&&(!a.blanks?.length||a.blanks.some(x=>!x.trim())))fail('blank key');
  if(p.type==='short_answer'&&(a.mode!=='ai'||!a.referenceAnswer||!a.rubric))fail('unsafe prose grading');
  if(p.grade===1&&p.subject==='ინგლისური'&&p.text.length>280)fail('grade-one reading load');
 }
}
const tests=check.prepare('SELECT * FROM assessment_tests WHERE published=1 AND is_custom=0').all(),simulations=[];
for(const test of tests){
 let pool=rows.filter(q=>q.grade===test.grade&&q.subject===test.subject&&(test.semester===null||q.semester===test.semester)&&(!test.difficulty||q.difficulty===test.difficulty)&&(!['v8','v11','v23','v28'].includes(test.source_pool)||q.pool_prefix===test.source_pool));
 const papers=[];
 for(let day=0;day<6;day++){
  const selected=selectAssessmentCandidates(pool,test.subject,test.grade,test.question_count,now+day*86400000),ids=new Set(selected.selected.map(q=>q.id));
  const cores=selected.selected.map(q=>canonicalPublicTaskCore(JSON.parse(q.public_payload_json)));
  if(new Set(cores).size!==cores.length)failures.push({id:test.id,why:'duplicate in paper',day});
  if(selected.selected.length<Math.min(5,test.question_count))failures.push({id:test.id,why:'unstartable',day});
  papers.push({count:selected.selected.length,...selected.rotation});
  pool=pool.map(q=>ids.has(q.id)?{...q,history_id:q.id,last_correct:1,last_answered_at:now+day*86400000}:q);
 }
 simulations.push({id:test.id,grade:test.grade,subject:test.subject,semester:test.semester,papers});
}
assert.deepEqual(failures,[]);
const cores=new Map();for(const q of rows){const key=[q.grade,q.subject,q.semester,canonicalPublicTaskCore(JSON.parse(q.public_payload_json))].join('|');const group=cores.get(key)||[];group.push(q.id);cores.set(key,group);}
const duplicateGroups=[...cores.values()].filter(g=>g.length>1&&g.some(id=>records.some(r=>r.id===id)));
const counts=xs=>xs.reduce((o,q)=>(o[`${q.grade}|${q.subject}|${q.semester}`]=(o[`${q.grade}|${q.subject}|${q.semester}`]||0)+1,o),{});
fs.mkdirSync('.openai/v29-held-reviewed-merge',{recursive:true});
for(let i=0;i<statements.length;i+=180)fs.writeFileSync(`.openai/v29-held-reviewed-merge/patch-${String(i/180).padStart(3,'0')}.sql`,statements.slice(i,i+180).join('\n')+'\n');
fs.writeFileSync('.openai/v29-held-reviewed-after.sql',snapshot+'\n'+statements.join('\n'));
fs.writeFileSync('.openai/v29-held-reviewed-rollback.sql',rollback.join('\n')+'\n');
fs.writeFileSync('data/v29-held-reviewed.json',JSON.stringify({manifestHash,records},null,2)+'\n');
fs.writeFileSync('data/v29-held-review-index.json',JSON.stringify({manifestHash,ids:records.map(r=>r.id)},null,2)+'\n');
const report={generatedAt:new Date().toISOString(),archiveSha256:hash(fs.readFileSync('C:/Users/Lasha/Downloads/edutest_v29.zip')),snapshotSha256:hash(snapshot),before:22542,after:rows.length,reviewed:496,corrected:changed.size,acceptedWithoutChange:496-changed.size,held:0,added:496,addedByBucket:counts(records),types:records.reduce((o,q)=>(o[q.publicPayload.type]=(o[q.publicPayload.type]||0)+1,o),{}),aiEvaluated:records.filter(r=>r.answerKey.mode==='ai').length,structuralFailures:failures,tests:tests.length,simulatedPapers:tests.length*6,duplicateGroups,simulations,changes:records.map(({id,inputHash,contentHash,changed})=>({id,inputHash,contentHash,changed})),sources:['https://www.cdc.gov/antibiotic-use/about/','https://www.nhs.uk/conditions/burns-and-scalds/','https://www.nhs.uk/conditions/nosebleed/','https://www.cdc.gov/global-water-sanitation-hygiene/about/about-household-water-treatment.html','https://112.gov.ge/?page_id=1305','https://www.unicef.org/child-rights-convention','https://georgia.travel/georgias-mountains-and-peaks','https://georgia.travel/gelati-monastery','https://georgia.travel/vardzia','https://ich.unesco.org/en/RL/georgian-polyphonic-singing-00008','https://www.matsne.gov.ge/document/view/29248?publication=109','https://new.matsne.gov.ge/ka/document/view/31702'],limitation:'All 496 received assistant prompt/answer/explanation review; this is not independent teacher certification or official curriculum validation. Structural checks cover all active rows; six-day selector simulations are not authenticated production attempts. Semantic-family IDs are preserved and duplicates remain coalesced by the selector.'};
fs.writeFileSync('reports/v29-held-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,changes:undefined,simulations:undefined},null,2));
