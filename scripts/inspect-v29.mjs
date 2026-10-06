import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const root='.openai/incoming-question-bank-v29';
const hash=x=>createHash('sha256').update(x).digest('hex');
const checksumFailures=[];let checksums=0;
for(const line of fs.readFileSync(root+'/SHA256SUMS.txt','utf8').trim().split(/\r?\n/)){
 const m=line.match(/^([a-f0-9]{64})\s+\*?(.+)$/);if(!m)throw Error('Invalid checksum line');
 const file=path.resolve(root,m[2]);if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Unsafe manifest path');
 checksums++;if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==m[1])checksumFailures.push(m[2]);
}
const snapshot=fs.readFileSync('.openai/qa-bank-audit-20261005.sql','utf8');
const db=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});db.exec(snapshot);
const query='SELECT q.*,a.answer_key_json,a.explanation FROM assessment_questions q JOIN assessment_answer_keys a ON a.question_id=q.id';
const before=new Map(db.prepare(query).all().map(q=>[q.id,q]));
for(const file of fs.readdirSync('.openai/v29-staging-conversion').filter(f=>/^questions-.*\.sql$/.test(f)).sort())db.exec(fs.readFileSync('.openai/v29-staging-conversion/'+file,'utf8'));
const columns=['grade','subject','semester','topic','strand','question_type','public_payload_json','answer_key_json','explanation','semantic_group_id'];
const added=[],changed=[];
for(const q of db.prepare(query).all()){
 if(!before.has(q.id))added.push(q);
 else{const old=before.get(q.id),diff=columns.filter(k=>old[k]!==q[k]);if(diff.length)changed.push({id:q.id,active:old.active,diff,old,q});}
}
const sources=['IMPORT/questions_canonical_40320.jsonl','IMPORT/questions_extension.jsonl'].flatMap(f=>fs.readFileSync(root+'/'+f,'utf8').trim().split(/\r?\n/).map(JSON.parse));
const sourceMap=new Map(sources.map(q=>['v28-'+q.question_id,q]));
const compact=q=>({id:q.id,grade:q.grade,subject:q.subject,semester:q.semester,topic:q.topic,p:JSON.parse(q.public_payload_json),a:JSON.parse(q.answer_key_json),explanation:q.explanation,source:sourceMap.get(q.id)});
const by=(rows,key)=>rows.reduce((out,q)=>(out[key(q)]=(out[key(q)]||0)+1,out),{});
const report={checksums,checksumFailures,added:added.map(compact),changed:changed.map(x=>({id:x.id,active:x.active,diff:x.diff,old:compact(x.old),new:compact(x.q)})),addedBySubject:by(added,q=>q.subject),addedByFamily:by(added,q=>sourceMap.get(q.id)?.family_id||q.topic)};
fs.writeFileSync('reports/v29-delta-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checksums,checksumFailures,added:added.length,changed:changed.length,addedBySubject:report.addedBySubject,addedByFamily:report.addedByFamily},null,2));
