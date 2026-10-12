import assert from 'node:assert/strict';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';
export function validateGeorgiaBatch(questions){
 for(const key of ['id','family'])assert.equal(new Set(questions.map(q=>q[key])).size,questions.length,`Repeated ${key}`);
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Repeated prompt');
 return questions.map(q=>{
  validateExpansionQuestion(q);assert.equal(q.subject,'ჩვენი საქართველო');assert.equal(q.grade,6);
  assert.ok(q.curriculumTheme?.trim());assert.equal(q.optionReview?.length,4);
  assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));
  assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);
  assert.equal(q.explanation,q.optionReview[q.correct]);return {id:q.id,check:verifyGeorgiaEvidence(q)};
 });
}
export function verifyGeorgiaEvidence(q){
 const n=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));let expected;
 if(q.family==='chronology-elapsed-years'){assert.equal(n.length,2);assert.ok(n[1]>n[0]);expected=String(n[1]-n[0]);}
 else if(q.family==='river-crossing-route'){assert.equal(n.length,3);expected=String(n[0]+n[1]+n[2]);}
 else if(q.family==='residents-flow-balance'){assert.equal(n.length,3);assert.ok(n[0]+n[1]>=n[2]);expected=String(n[0]+n[1]-n[2]);}
 else if(q.family==='century-first-year'){assert.equal(n.length,1);assert.ok(n[0]>0&&n[0]<=2100);const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];expected=roman[Math.ceil(n[0]/100)-1]+' საუკუნე';}
 else return 'assistant_option_by_option_review_only';
 assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one answer');assert.equal(q.options[q.correct],expected,'Prompt/key mismatch');return 'prompt_evidence_recomputation';
}
