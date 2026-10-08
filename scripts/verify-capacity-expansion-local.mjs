import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readSnapshot} from './audit-bank-capacity.mjs';
import {validateExpansionQuestion,normalizedPrompt,normalizedOption} from './bank-expansion-quality.mjs';
const root='.openai/bank-expansion-20261007';
assert.ok(fs.existsSync(root+'/reviewed.json'),'Private review artifact is required');
const review=JSON.parse(fs.readFileSync(root+'/reviewed.json','utf8'));
const report=JSON.parse(fs.readFileSync('reports/capacity-expansion-2026-10-07.json','utf8'));
assert.deepEqual(report.semanticSimilarityCandidates,[],'Resolve semantic-review candidates before release');
const {db}=readSnapshot(root+'/after.sql');
const rows=db.prepare('SELECT q.*,a.answer_key_json,a.explanation FROM assessment_questions q JOIN assessment_answer_keys a ON a.question_id=q.id WHERE q.active=1').all();
assert.equal(rows.length,report.afterActive);
const ids=new Map(rows.map(q=>[q.id,q]));
for(const q of review.accepted){
 validateExpansionQuestion(q);
 const row=ids.get(q.id),payload=JSON.parse(row.public_payload_json),key=JSON.parse(row.answer_key_json);
 assert.equal(payload.text,q.text);assert.deepEqual(payload.opts,q.options);assert.equal(key.correct,q.correct);assert.equal(row.explanation,q.explanation);
 assert.ok(!['correct','answer','answerKey','explanation','model'].some(k=>k in payload));
}
assert.equal(new Set(review.accepted.map(q=>normalizedPrompt(q.text))).size,review.accepted.length,'Globally repeated new prompts');
const familyScopes=review.accepted.map(q=>[q.grade,q.subject,q.semester,q.family].join('|'));
assert.equal(new Set(familyScopes).size,familyScopes.length,'Same family repeated within a bucket');
for(const q of rows){
 const p=JSON.parse(q.public_payload_json),a=JSON.parse(q.answer_key_json);
 assert.ok(p.text?.trim()&&q.explanation?.trim(),q.id);
 if(['multiple_choice','true_false'].includes(q.question_type)){
  assert.ok(p.opts?.every(x=>String(x).trim()),q.id);
  assert.equal(new Set(p.opts.map(normalizedOption)).size,p.opts.length,q.id);
  assert.ok(Number.isInteger(a.correct)&&a.correct>=0&&a.correct<p.opts.length,q.id);
 }
}
console.log(JSON.stringify({ok:true,allActiveBasicStructureChecked:rows.length,newOutputChecks:review.accepted.length,numericallyRecomputed:report.independentNumericalChecks,curatedRuleReview:report.curatedRuleChecks,answerKeysServerOnly:true}));
