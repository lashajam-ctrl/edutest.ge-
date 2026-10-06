import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {correctBankRow,v29AdditionDecision} from '../data/bank-quality-corrections-v29.mjs';
import {selectAssessmentCandidates} from '../lib/assessment-selection.ts';
import {canonicalPublicTaskCore} from '../lib/assessment-selection-core.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const sql=x=>x===null||x===undefined?'NULL':typeof x==='number'?String(x):`'${String(x).replaceAll("'","''")}'`;
const snapshot=fs.readFileSync('.openai/qa-bank-audit-20261005.sql','utf8');
const db=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});db.exec(snapshot);
const query='SELECT q.*,a.answer_key_json,a.explanation FROM assessment_questions q JOIN assessment_answer_keys a ON q.id=a.question_id';
const before=new Map(db.prepare(query).all().map(q=>[q.id,q]));
const active=[...before.values()].filter(q=>q.active===1);
const root='.openai/incoming-question-bank-v29';
const source=new Map(['IMPORT/questions_canonical_40320.jsonl','IMPORT/questions_extension.jsonl'].flatMap(f=>fs.readFileSync(root+'/'+f,'utf8').trim().split(/\r?\n/).map(JSON.parse)).map(q=>['v28-'+q.question_id,q]));
for(const file of fs.readdirSync('.openai/v29-staging-conversion').filter(f=>/^questions-.*\.sql$/.test(f)).sort())db.exec(fs.readFileSync('.openai/v29-staging-conversion/'+file,'utf8'));
const additions=db.prepare(query).all().filter(q=>!before.has(q.id));
const holds=additions.filter(q=>v29AdditionDecision(q)!=='reviewed_english').map(q=>({id:q.id,grade:q.grade,subject:q.subject,semester:q.semester,reason:v29AdditionDecision(q)}));
const approved=additions.filter(q=>v29AdditionDecision(q)==='reviewed_english');
// Discard the staging upserts entirely: existing production rows remain the
// source of truth. Only explicitly reviewed additions and corrections survive.
const target=new Map(active.map(q=>[q.id,q]));
for(const q of approved)target.set(q.id,q);
const changes=[],fixed={},now=Date.now();
const qColumns=db.prepare('PRAGMA table_info(assessment_questions)').all().map(c=>c.name);
for(const q of target.values()){
 const {row,fixes}=correctBankRow(q),s=source.get(q.id);
 if(s?.curriculum_domain==='გეომეტრია და გაზომვა'&&row.subject==='მათემატიკა'&&row.strand!=='geometry_space'){
   row.strand='geometry_space';fixes.push('geometry_component');
 }
 const old=before.get(row.id),fields=qColumns.filter(k=>!['content_hash','updated_at','imported_at'].includes(k)&&old?.[k]!==row[k]);
 if(!old||fields.length||old.answer_key_json!==row.answer_key_json||old.explanation!==row.explanation){
  row.content_hash=hash(JSON.stringify([row.public_payload_json,row.answer_key_json,row.explanation,row.strand,row.subject,row.topic]));
  row.updated_at=now;
  if(!old)row.mapping_status='v29_reviewed_additive';
  changes.push({row,old,fixes,fields});
  for(const f of fixes)fixed[f]=(fixed[f]||0)+1;
 }
 target.set(row.id,row);
}
const statements=[],rollback=[];
for(const {row,old} of changes){
 if(old){
   const fields=qColumns.filter(k=>k!=='id'&&row[k]!==old[k]);
   if(fields.length)statements.push(`UPDATE assessment_questions SET ${fields.map(k=>k+'='+sql(row[k])).join(',')} WHERE id=${sql(row.id)} AND content_hash=${sql(old.content_hash)} AND active=1;`);
   rollback.push(`UPDATE assessment_questions SET ${qColumns.filter(k=>k!=='id').map(k=>k+'='+sql(old[k])).join(',')} WHERE id=${sql(row.id)} AND content_hash=${sql(row.content_hash)};`);
 }else{
   statements.push(`INSERT INTO assessment_questions (${qColumns.join(',')}) VALUES (${qColumns.map(k=>sql(row[k])).join(',')}) ON CONFLICT(id) DO NOTHING;`);
   rollback.push(`UPDATE assessment_questions SET active=0 WHERE id=${sql(row.id)} AND content_hash=${sql(row.content_hash)};`);
 }
 statements.push(`INSERT INTO assessment_answer_keys(question_id,answer_key_json,explanation,updated_at) SELECT ${sql(row.id)},${sql(row.answer_key_json)},${sql(row.explanation)},${now} WHERE EXISTS(SELECT 1 FROM assessment_questions WHERE id=${sql(row.id)} AND content_hash=${sql(row.content_hash)}) ON CONFLICT(question_id) DO UPDATE SET answer_key_json=excluded.answer_key_json,explanation=excluded.explanation,updated_at=excluded.updated_at;`);
 if(old)rollback.push(`UPDATE assessment_answer_keys SET answer_key_json=${sql(old.answer_key_json)},explanation=${sql(old.explanation)},updated_at=${old.updated_at} WHERE question_id=${sql(old.id)};`);
}
const check=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});check.exec(snapshot);check.exec(statements.join('\n'));
const rows=check.prepare(query+' WHERE q.active=1').all();
const failures=[];
for(const q of rows){
 const p=JSON.parse(q.public_payload_json),a=JSON.parse(q.answer_key_json);
 if(!p.text?.trim())failures.push([q.id,'empty_prompt']);
 if(['multiple_choice','true_false'].includes(q.question_type)&&(!Array.isArray(p.opts)||p.opts.some(x=>!String(x).trim())||new Set(p.opts.map(x=>String(x).trim().toLowerCase())).size!==p.opts.length||!Number.isInteger(a.correct)||a.correct<0||a.correct>=p.opts.length))failures.push([q.id,'options']);
 if(q.question_type==='short_answer'&&a.mode==='text'&&a.accepted?.some(x=>/\s/u.test(x)))failures.push([q.id,'unsafe_exact_sentence']);
}
const tests=check.prepare('SELECT * FROM assessment_tests WHERE published=1 AND is_custom=0').all(),simulations=[];
for(const test of tests){
 let pool=rows.filter(q=>q.grade===test.grade&&q.subject===test.subject&&(test.semester===null||q.semester===test.semester)&&(!test.difficulty||q.difficulty===test.difficulty)&&(!['v8','v11','v23','v28'].includes(test.source_pool)||q.pool_prefix===test.source_pool));
 const papers=[];
 for(let day=0;day<6;day++){
  const selected=selectAssessmentCandidates(pool,test.subject,test.grade,test.question_count,now+day*86400000),ids=new Set(selected.selected.map(q=>q.id));
  const cores=selected.selected.map(q=>canonicalPublicTaskCore(JSON.parse(q.public_payload_json)));
  if(new Set(cores).size!==cores.length)failures.push([test.id,'duplicate_in_paper',day]);
  if(selected.selected.length<Math.min(5,test.question_count))failures.push([test.id,'unstartable',day]);
  papers.push({count:selected.selected.length,...selected.rotation});
  pool=pool.map(q=>ids.has(q.id)?{...q,history_id:q.id,last_correct:1,last_answered_at:now+day*86400000}:q);
 }
 simulations.push({id:test.id,grade:test.grade,subject:test.subject,semester:test.semester,papers});
}
if(failures.length)throw Error(JSON.stringify(failures));
fs.mkdirSync('.openai/v29-reviewed-merge',{recursive:true});
for(let i=0;i<statements.length;i+=180)fs.writeFileSync(`.openai/v29-reviewed-merge/patch-${String(i/180).padStart(3,'0')}.sql`,statements.slice(i,i+180).join('\n')+'\n');
fs.writeFileSync('.openai/v29-reviewed-rollback.sql',rollback.join('\n')+'\n');
fs.writeFileSync('.openai/v29-reviewed-after.sql',snapshot+'\n'+statements.join('\n'));
const counts=xs=>xs.reduce((o,q)=>(o[`${q.grade}|${q.subject}|${q.semester}`]=(o[`${q.grade}|${q.subject}|${q.semester}`]||0)+1,o),{});
const report={generatedAt:new Date().toISOString(),archiveSha256:hash(fs.readFileSync('C:/Users/Lasha/Downloads/edutest_v29.zip')),snapshotSha256:hash(snapshot),before:active.length,after:rows.length,sourceCandidateAdditions:additions.length,added:approved.length,held:holds.length,correctedExisting:changes.filter(q=>q.old).length,fixes:fixed,structuralFailures:failures,tests:tests.length,simulatedPapers:simulations.length*6,addedByBucket:counts(approved),afterByBucket:counts(rows),holds,simulations,changes:changes.map(({row,fixes,old})=>({id:row.id,added:!old,fixes,hash:row.content_hash})),limitation:'All live rows have structural checks. Only English v29 additions in the approved subset received prompt/answer review; held rows are not published. This is not full independent teacher or curriculum certification.'};
fs.writeFileSync('reports/v29-reviewed-merge.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({before:report.before,after:report.after,added:report.added,held:report.held,correctedExisting:report.correctedExisting,fixes:fixed,tests:report.tests,simulatedPapers:report.simulatedPapers,failures:failures.length,sqlFiles:Math.ceil(statements.length/180)},null,2));
