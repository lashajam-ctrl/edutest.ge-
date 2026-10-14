import assert from 'node:assert/strict';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';
export function verifyHistoryEvidence(q){
 const n=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));let expected;
 if(q.family==='urbanization-share'){
  assert.equal(n.length,4);const [u1,t1,u2,t2]=n;
  assert.ok(t1>0&&t2>0&&u1>=0&&u2>=0&&u1<=t1&&u2<=t2);
  expected=`${100*u1/t1}%-დან ${100*u2/t2}%-მდე`;
 }else if(q.family==='wartime-production-index'){
  assert.equal(n.length,2);assert.ok(n[0]>0&&n[1]>=0&&n[1]<n[0]);
  expected=`${100*(n[0]-n[1])/n[0]}%-ით შემცირდა`;
 }else return 'assistant_option_by_option_review_only';
 assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one computed answer');
 assert.equal(q.options[q.correct],expected,'History prompt/key mismatch');
 assert.ok(q.explanation.includes(expected),'Explanation omits computed conclusion');
 return 'prompt_evidence_recomputation';
}
export function validateHistoryBatch(questions){
 for(const key of ['id','family'])assert.equal(new Set(questions.map(q=>q[key])).size,questions.length,`Repeated ${key}`);
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Repeated prompt');
 return questions.map(q=>{
  validateExpansionQuestion(q);assert.equal(q.grade,9);assert.equal(q.subject,'ისტორია');
  assert.ok(q.curriculumTheme?.trim());assert.equal(q.optionReview?.length,4);
  assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));
  assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);
  assert.equal(q.explanation,q.optionReview[q.correct]);
  assert.ok(['sourced_paraphrase','explicit_teaching_scenario'].includes(q.evidenceKind));
  if(q.evidenceKind==='sourced_paraphrase')assert.match(q.sourceUrl??'',/^https:\/\//);
  else assert.match(q.text,/პირობით|სასწავლო მოდელ/);
  return {id:q.id,check:verifyHistoryEvidence(q)};
 });
}
