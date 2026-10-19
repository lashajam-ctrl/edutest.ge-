import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateHistory10Review,validateHistory10RepairAdditions,contentDigest} from '../scripts/history10-curriculum-repair.mjs';
const rows=[1,2].flatMap(semester=>['keep','hold'].map(kind=>({id:`${semester}-${kind}`,grade:10,semester,subject:'ისტორია',active:1,content_hash:(kind==='keep'?'a':'b').repeat(64)})));
const decisions=()=>rows.map(q=>({id:q.id,semester:q.semester,content_hash:q.content_hash,decision:q.id.endsWith('keep')?'keep':'period_mismatch',reason:'Explicitly reviewed curriculum decision.'}));
test('review is exhaustive and only holds exact reviewed IDs',()=>{
 const plan=validateHistory10Review(rows,decisions());assert.equal(plan.length,2);
 assert.ok(plan.every(x=>x.apply.startsWith('UPDATE assessment_questions SET active=0 WHERE id=')));
 assert.ok(plan.every(x=>!x.apply.includes('DELETE')));
});
test('partial, duplicate, drifted or foreign-scope reviews fail closed',()=>{
 assert.throws(()=>validateHistory10Review(rows,decisions().slice(1)));
 const d=decisions();d[1]=d[0];assert.throws(()=>validateHistory10Review(rows,d));
 assert.throws(()=>validateHistory10Review(rows.map((r,i)=>i? r:{...r,grade:11}),decisions()));
 const changed=decisions();changed[0].content_hash='c'.repeat(64);assert.throws(()=>validateHistory10Review(rows,changed));
});
const sample=()=>({id:'fixture',family:'fixture',grade:10,semester:1,subject:'ისტორია',topic:'კვლევა',text:'პირობითი სასწავლო მაგალითი',options:['ერთი','ორი','სამი','ოთხი'],correct:0,optionReview:['პირველი პასუხის განმარტება საკმარისად გრძელია.','მეორე პასუხის განმარტება საკმარისად გრძელია.','მესამე პასუხის განმარტება საკმარისად გრძელია.','მეოთხე პასუხის განმარტება საკმარისად გრძელია.'],explanation:'პირველი პასუხის განმარტება საკმარისად გრძელია.',review:'assistant_content_reviewed',prerequisiteMinGrade:10,evidenceKind:'explicit_teaching_scenario',curriculumTheme:'პრეისტორია და ძველი აღმოსავლეთი'});
test('changed answer, rationale, or prompt invalidates reviewed approval',()=>{
 const q=sample(),approved=[{id:q.id,digest:contentDigest(q)}];validateHistory10RepairAdditions([q],approved);
 for(const field of ['text','explanation','correct'])assert.throws(()=>validateHistory10RepairAdditions([{...q,[field]:field==='correct'?1:q[field]+' changed'}],approved));
});
test('duplicate options cannot be approved by merely updating a digest',()=>{
 const q=sample();q.options[1]=q.options[0];assert.throws(()=>validateHistory10RepairAdditions([q],[{id:q.id,digest:contentDigest(q)}]));
});
test('held rows remain gradeable for sessions created before the hold',()=>{
 const route=fs.readFileSync('app/api/assessments/submit/route.ts','utf8');
 const query=route.match(/SELECT q\.\*, k\.answer_key_json, k\.explanation FROM assessment_questions q[\s\S]*?`/u)?.[0];
 assert.ok(query);assert.match(query,/WHERE q\.id IN/);assert.doesNotMatch(query,/active\s*=/);
});
