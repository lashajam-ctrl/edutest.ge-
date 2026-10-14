import assert from 'node:assert/strict';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';
export function verifyBiology9Evidence(q){
 const n=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));let expected;
 if(q.family==='mark-recapture-estimate'){
  assert.equal(n.length,3);const [marked,sample,recaptured]=n;
  assert.ok(marked>0&&sample>0&&recaptured>0&&recaptured<=marked&&recaptured<=sample);
  expected=String(marked*sample/recaptured);
 }else if(q.family==='population-density-comparison'){
  assert.equal(n.length,4);assert.ok(n.every(x=>x>0));const a=n[0]/n[1],b=n[2]/n[3];
  assert.notEqual(a,b,'Tied population densities require another prompt');expected=a>b?'A ნაკვეთზე':'B ნაკვეთზე';
 }else if(q.family==='gamete-zygote-complement'){
  assert.equal(n.length,1);assert.ok(Number.isInteger(n[0])&&n[0]>0&&n[0]%2===0);expected=`${n[0]/2} და ${n[0]}`;
 }else if(q.family==='photosynthesis-net-oxygen'){
  assert.equal(n.length,2);assert.ok(n[0]>n[1]&&n[1]>=0);expected=String(n[0]-n[1]);
 }else return 'assistant_option_by_option_review_only';
 assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one computed answer');
 assert.equal(q.options[q.correct],expected,'Biology prompt/key mismatch');
 return 'prompt_evidence_recomputation';
}
export function validateBiology9Batch(questions){
 assert.ok(questions.length>0);
 for(const field of ['id','family'])assert.equal(new Set(questions.map(q=>q[field])).size,questions.length,`Repeated ${field}`);
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Repeated prompt');
 return questions.map(q=>{
  validateExpansionQuestion(q);assert.equal(q.subject,'ბიოლოგია');assert.equal(q.grade,9);assert.equal(q.semester,2);assert.equal(q.prerequisiteMinGrade,9);
  assert.ok(['სახეობა და პოპულაცია','ადამიანის შეგრძნების ორგანოები','ადამიანის რეპროდუქციული სისტემა','უჯრედის მეტაბოლიზმი'].includes(q.curriculumTheme));
  assert.equal(q.optionReview?.length,4);assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));
  assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);assert.equal(q.explanation,q.optionReview[q.correct]);
  assert.match(q.sourceUrl??'',/^https:\/\/openstax\.org\/books\/biology-2e\/pages\//);
  return {id:q.id,check:verifyBiology9Evidence(q)};
 });
}
