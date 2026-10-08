import assert from 'node:assert/strict';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';

// This gate checks a curated review record, not the truth of prose judgements.
// Only the explicitly named evidence parsers below constitute recomputation.
export function validateCivicsReview(q){
 validateExpansionQuestion(q);
 assert.equal(q.subject,'მოქალაქეობა');
 assert.ok([7,8].includes(q.grade),'This release is scoped to VII–VIII');
 assert.ok(q.curriculumTheme?.trim());
 assert.equal(q.optionReview?.length,4,'Every distractor needs its own rationale');
 assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));
 assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4,'Copied option rationales');
 assert.equal(q.explanation,q.optionReview[q.correct],'Explanation/review alignment');
 return true;
}
export function verifyCivicsEvidence(q){
 const nums=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));
 const numeric={
  'speaking-time-calculation':()=>{assert.equal(nums.length,1);assert.ok(q.text.includes('ექვსივე'));return nums[0]/6;},
  'repair-versus-replace-cost':()=>{assert.equal(nums.length,2);return nums[1]-nums[0];},
  'deposit-refund-net':()=>{assert.equal(nums.length,3);return nums[0]+nums[1]-nums[2];},
  'consumption-unit-price':()=>{assert.deepEqual(nums.slice(0,5),[12,6,9,12,16]);return nums[0]/nums[1]*nums[2]-nums[4];},
  'expense-document-reconciliation':()=>{assert.equal(nums.length,3);return nums[0]-nums[1]-nums[2];},
 };
 if(numeric[q.family]){
  const expected=String(numeric[q.family]());
  assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one recomputed numeric option');
  assert.equal(q.options[q.correct],expected,'Prompt numbers disagree with the key');
  return 'prompt_number_recomputation';
 }
 if(q.family==='budget-feasible-set'){
  assert.equal(nums.length,4);
  const [budget,lighting,ramp,benches]=nums;
  const choices=q.options.map(o=>o==='სამივე ერთად'?[true,true,true]:[o.includes('განათება'),o.includes('პანდუსი'),o.includes('სკამები')]);
  const valid=choices.map(([l,r,b])=>l&&r&&(Number(l)*lighting+Number(r)*ramp+Number(b)*benches)<=budget);
  assert.equal(valid.filter(Boolean).length,1,'Budget choice must have one feasible answer');
  assert.equal(valid[q.correct],true,'Key does not satisfy both required facilities and budget');
  return 'constraint_recomputation';
 }
 if(q.family==='decision-criteria-consistency'){
  const a=q.text.match(/A-ს აქვს (\d+) და (\d+)/u),b=q.text.match(/B-ს — (\d+) და (\d+)/u);
  assert.ok(a&&b,'Missing scoring evidence');
  const sa=Number(a[1])+Number(a[2]),sb=Number(b[1])+Number(b[2]);
  assert.notEqual(sa,sb,'Ambiguous tied score');
  const winner=sa>sb?'A':'B';
  assert.ok(q.options[q.correct].startsWith(winner+','));
  assert.equal(q.options.filter(o=>o.startsWith(winner+',')).length,1);
  assert.ok(q.explanation.includes(`= ${sa}`)&&q.explanation.includes(`= ${sb}`),'Explanation totals');
  return 'score_recomputation';
 }
 if(q.family==='performance-denominator'){
  assert.equal(nums.length,4);
  const [n1,v1,n2,v2]=nums,p1=v1/n1*100,p2=v2/n2*100;
  assert.ok(v2>v1&&p2<p1,'Prose conclusion needs rising count and falling share');
  const expected=`რაოდენობა გაიზარდა, მაგრამ წილი ${p1}%-დან ${p2}%-მდე შემცირდა`;
  assert.equal(q.options[q.correct],expected);
  assert.equal(q.options.filter(o=>o===expected).length,1);
  return 'rate_recomputation';
 }
 return 'assistant_option_by_option_review_only';
}
export function validateCivicsBatch(questions){
 assert.equal(new Set(questions.map(q=>q.id)).size,questions.length,'Duplicate IDs');
 assert.equal(new Set(questions.map(q=>q.family)).size,questions.length,'Parameter variants do not count as new families');
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Duplicate prompts');
 return questions.map(q=>{validateCivicsReview(q);return {id:q.id,check:verifyCivicsEvidence(q)};});
}
