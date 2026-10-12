import assert from 'node:assert/strict';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';

export function validateSafetyBatch(questions){
 assert.equal(new Set(questions.map(q=>q.id)).size,questions.length,'Duplicate IDs');
 assert.equal(new Set(questions.map(q=>q.family)).size,questions.length,'Repeated family');
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Repeated prompt');
 return questions.map(q=>{
  validateExpansionQuestion(q);
  assert.equal(q.subject,'სამოქალაქო თავდაცვა და უსაფრთხოება');assert.equal(q.grade,12);
  assert.ok(q.curriculumTheme?.trim());assert.equal(q.optionReview?.length,4);
  assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));
  assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);
  assert.equal(q.explanation,q.optionReview[q.correct],'Explanation alignment');
  return {id:q.id,check:verifySafetyEvidence(q)};
 });
}
export function verifySafetyEvidence(q){
 const n=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));let expected;
 if(q.family==='usable-stock-reserve'){
  assert.equal(n.length,3);assert.ok(n[0]>=n[1]+n[2]);expected=String(n[0]-n[1]-n[2]);
 }else if(q.family==='parallel-readiness-path'){
  assert.equal(n.length,3);assert.ok(q.text.includes('ერთდროულად'));assert.ok(q.text.includes('ორივე'));
  expected=String(Math.max(n[0],n[1])+n[2]);
 }else if(q.family==='stated-risk-score'){
  assert.equal(n.length,6);const scores=[n[0]*n[1],n[2]*n[3],n[4]*n[5]],max=Math.max(...scores);
  assert.equal(scores.filter(x=>x===max).length,1,'Tied risk scores');expected=['A','B','C'][scores.indexOf(max)];
 }else return 'assistant_option_by_option_review_only';
 assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one recomputed option');
 assert.equal(q.options[q.correct],expected,'Answer disagrees with prompt evidence');
 return 'prompt_evidence_recomputation';
}
