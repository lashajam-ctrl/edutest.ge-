import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readSnapshot} from './audit-bank-capacity.mjs';
import {validateExpansionQuestion,normalizedPrompt,lexicalSimilarity} from './bank-expansion-quality.mjs';
import {coalesceSelectionGroups,distinctSelectionGroupCount,languageBucketFor} from '../lib/assessment-selection.ts';
const root='.openai/bank-expansion-20261007',source='.openai/v29-held-reviewed-after.sql';
const {db,sha256}=readSnapshot(source),allBefore=db.prepare('SELECT * FROM assessment_questions').all();
const rows=allBefore.filter(q=>q.active===1),candidates=JSON.parse(fs.readFileSync(root+'/questions.json','utf8'));
assert.equal(rows.length,23038,'Baseline drift: obtain a new production snapshot');
const groups=new Map(),components=new Map();
const scope=q=>`${q.grade}|${q.subject}|${q.semester}`;
for(const [key,pool]of Object.entries(Object.groupBy(rows,scope))){
 groups.set(key,distinctSelectionGroupCount(coalesceSelectionGroups(pool)));
 for(const c of ['literature','language','grammar','vocabulary','reading','use_of_language']){
  const subset=coalesceSelectionGroups(pool).filter(q=>languageBucketFor(q.subject,q.topic,JSON.parse(q.public_payload_json).text)===c);
  components.set(key+'|'+c,distinctSelectionGroupCount(subset));
 }
}
const existingPrompts=new Set(rows.map(q=>normalizedPrompt(JSON.parse(q.public_payload_json).text)));
const globalPrompts=new Set(existingPrompts),seenIds=new Set(allBefore.map(q=>q.id));
const accepted=[],excluded=[],failures=[];
// Prefer adding a shared draft to its weakest appropriate grade/semester, NOT
// copying identical texts to several grades and calling that extra diversity.
const priority=q=>q.component==='literature'&&q.grade<=6 ? (components.get(scope(q)+'|literature')??0)-1000 : groups.get(scope(q))??0;
for(const q of [...candidates].sort((a,b)=>priority(a)-priority(b)||a.grade-b.grade||a.semester-b.semester)){
 try{validateExpansionQuestion(q);}catch(e){failures.push({id:q.id,error:e.message});continue;}
 const prompt=normalizedPrompt(q.text);
 if(globalPrompts.has(prompt)){excluded.push({id:q.id,reason:existingPrompts.has(prompt)?'existing_global_prompt':'draft_global_prompt_duplicate'});continue;}
 // In this release coordinate midpoint algebra is conservatively held below IX.
 if(q.family==='math-midpoint-reconstruct'&&q.grade<9){excluded.push({id:q.id,reason:'prerequisite_hold_below_grade9'});continue;}
 assert.ok(!seenIds.has(q.id));seenIds.add(q.id);globalPrompts.add(prompt);accepted.push(q);
}
assert.deepEqual(failures,[],'Invalid drafts must be corrected before release');
const sameBucketNearDuplicates=[];
for(const q of accepted){for(const old of rows.filter(x=>scope(x)===scope(q))){const score=lexicalSimilarity(q.text,JSON.parse(old.public_payload_json).text);if(score>=.72)sameBucketNearDuplicates.push({newId:q.id,existingId:old.id,score});}}
for(let i=0;i<accepted.length;i++)for(let j=0;j<i;j++)if(scope(accepted[i])===scope(accepted[j])){const score=lexicalSimilarity(accepted[i].text,accepted[j].text);if(score>=.72)sameBucketNearDuplicates.push({newId:accepted[i].id,existingId:accepted[j].id,score});}
const sql=x=>x==null?'NULL':typeof x==='number'?String(x):`'${String(x).replaceAll("'","''")}'`;
const hash=x=>createHash('sha256').update(x).digest('hex'),now=Date.now();
const columns=db.prepare('PRAGMA table_info(assessment_questions)').all().map(c=>c.name),statements=[],records=[],rollback=[];
for(const q of accepted){
 const payload={id:q.id,text:q.text,type:'multiple_choice',pts:2,grade:q.grade,subject:q.subject,semester:q.semester,topic:q.topic,opts:q.options,difficulty:'core',component:q.component??null};
 const key={correct:q.correct};
 const row={id:q.id,source_id:`capacity-expansion-20261007:${q.id}`,pool_key:`G${q.grade}|${q.subject}|${q.semester}`,pool_prefix:'v28',grade:q.grade,subject:q.subject,source_subject:'Original assistant-reviewed practice expansion',semester:q.semester,topic:q.topic,strand:q.strand??q.component??q.topic,question_type:'multiple_choice',public_payload_json:JSON.stringify(payload),points:2,difficulty:'core',review_status:'algorithmically_validated',mapping_status:'capacity_expansion_20261007',semantic_group_id:`qe4-family:${q.family}`,content_hash:hash(JSON.stringify([payload,key,q.explanation])),active:1,imported_at:now,updated_at:now};
 statements.push(`INSERT INTO assessment_questions(${columns.join(',')}) VALUES(${columns.map(c=>sql(row[c])).join(',')}) ON CONFLICT(id) DO NOTHING;`);
 statements.push(`INSERT INTO assessment_answer_keys(question_id,answer_key_json,explanation,updated_at) SELECT ${sql(q.id)},${sql(JSON.stringify(key))},${sql(q.explanation)},${now} WHERE EXISTS(SELECT 1 FROM assessment_questions WHERE id=${sql(q.id)} AND content_hash=${sql(row.content_hash)}) ON CONFLICT(question_id) DO NOTHING;`);
 rollback.push(`UPDATE assessment_questions SET active=0 WHERE id=${sql(q.id)} AND content_hash=${sql(row.content_hash)};`);
 records.push({row,key,explanation:q.explanation,model:q.model??null});
}
db.exec(statements.join('\n'));db.exec(statements.join('\n'));
assert.equal(db.prepare('SELECT COUNT(*) n FROM assessment_questions WHERE active=1').get().n,23038+accepted.length);
const allAfter=new Map(db.prepare('SELECT * FROM assessment_questions').all().map(q=>[q.id,q]));
for(const q of allBefore)assert.deepEqual(allAfter.get(q.id),q,'Existing data changed');
const afterRows=[...allAfter.values()].filter(q=>q.active===1),changes=[];
for(const [bucket,pool]of Object.entries(Object.groupBy(afterRows,scope))){const before=groups.get(bucket)??0,after=distinctSelectionGroupCount(coalesceSelectionGroups(pool));if(after!==before)changes.push({bucket,before,after,gain:after-before});}
const countBy=xs=>Object.fromEntries(Object.entries(Object.groupBy(xs,q=>q.subject)).map(([s,qs])=>[s,qs.length]));
const report={generatedAt:new Date().toISOString(),snapshotSha256:sha256,baselineActive:23038,afterActive:23038+accepted.length,authoredDrafts:candidates.length,accepted:accepted.length,excluded:excluded.length,excludedReasons:Object.fromEntries(Object.entries(Object.groupBy(excluded,x=>x.reason)).map(([k,xs])=>[k,xs.length])),independentNumericalChecks:accepted.filter(q=>q.model).length,curatedRuleChecks:accepted.filter(q=>!q.model).length,distinctAuthoredFamilies:new Set(accepted.map(q=>q.family)).size,subjectCounts:countBy(accepted),changes,semanticSimilarityCandidates:sameBucketNearDuplicates,failures,limitations:['Assistant content review, not independent teacher certification.','Globally identical prompts are not copied to inflate coverage.','Numerical parameter variants remain one family per grade/subject/semester.','200 groups per bucket is a planning target, not achieved by this batch.']};
fs.writeFileSync(root+'/reviewed.json',JSON.stringify({records,accepted,excluded},null,2)+'\n');
fs.writeFileSync(root+'/after.sql',fs.readFileSync(source,'utf8')+'\n'+statements.join('\n'));
fs.writeFileSync(root+'/rollback.sql',rollback.join('\n')+'\n');
fs.mkdirSync(root+'/patches',{recursive:true});
for(let i=0;i<statements.length;i+=160)fs.writeFileSync(root+`/patches/patch-${String(i/160).padStart(3,'0')}.sql`,statements.slice(i,i+160).join('\n')+'\n');
fs.writeFileSync('reports/capacity-expansion-2026-10-07.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
