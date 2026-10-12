import assert from 'node:assert/strict';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';

// This gate checks a curated review record, not the truth of prose judgements.
// Only the explicitly named evidence parsers below constitute recomputation.
export function validateCivicsReview(q){
 validateExpansionQuestion(q);
 assert.equal(q.subject,'მოქალაქეობა');
 assert.ok([7,8,9,10,11].includes(q.grade),'This release is scoped to VII–XI');
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
  'profit-after-all-costs':()=>{assert.equal(nums.length,2);return nums[0]-nums[1];},
  'contribution-not-net-profit':()=>{assert.equal(nums.length,2);return nums[0]-nums[1];},
  'break-even-units':()=>{assert.equal(nums.length,3);assert.ok(nums[1]>nums[2]);const n=nums[0]/(nums[1]-nums[2]);assert.ok(Number.isInteger(n));return n;},
  'production-bottleneck':()=>{assert.equal(nums.length,3);return Math.min(...nums);},
  'weighted-turnout-combined':()=>{assert.equal(nums.length,4);const [a,x,b,y]=nums;assert.ok(a>0&&b>0&&x<=a&&y<=b);return (x+y)/(a+b)*100;},
  'unique-campaign-reach':()=>{assert.equal(nums.length,3);assert.ok(nums[2]<=Math.min(nums[0],nums[1]));return nums[0]+nums[1]-nums[2];},
  'explicit-deadline-count':()=>{assert.equal(nums.length,2);assert.ok(q.text.includes('მომდევნო დღიდან'));assert.ok(q.text.includes('უქმეებიც ითვლება'));assert.ok(nums[0]+nums[1]<=31);return nums[0]+nums[1];},
  'budget-shortfall':()=>{assert.equal(nums.length,2);return nums[1]-nums[0];},
  'fixed-variable-program-cost':()=>{assert.equal(nums.length,3);return nums[0]+nums[1]*nums[2];},
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
 if(q.family==='lifetime-cost-tie'){
  assert.equal(nums.length,4);assert.ok(q.text.includes('ორი წელი'));
  const a=nums[0]+2*nums[1],b=nums[2]+2*nums[3];assert.equal(a,b,'Costs must tie');
  assert.equal(q.options[q.correct],`ორი წლის სრული ხარჯი ორივესთვის ${a} ლარია`);
  return 'lifetime_cost_recomputation';
 }
 if(q.family==='subscription-total-price'){
  assert.equal(nums.length,3);assert.ok(q.text.includes('ოთხი თვისთვის'));
  const a=4*nums[0]+nums[1],b=4*nums[2];assert.ok(b<a);
  assert.equal(q.options[q.correct],`B — ${b} ლარი`);return 'subscription_cost_recomputation';
 }
 if(q.family==='margin-versus-markup'){
  assert.equal(nums.length,2);assert.ok(nums[0]>0);
  const margin=(nums[0]-nums[1])*100/nums[0];
  assert.equal(q.options[q.correct],`${margin}%`);return 'margin_recomputation';
 }
 if(q.family==='plurality-not-majority'){
  assert.equal(nums.length,3);assert.equal(nums.reduce((a,b)=>a+b),100);
  assert.ok(nums[0]>nums[1]&&nums[0]>nums[2]&&nums[0]<50);
  assert.equal(q.options[q.correct],'ყველაზე მეტი ხმა აქვს ცალკეულ ვარიანტებს შორის, მაგრამ ნახევარზე მეტი არა');
  return 'plurality_recomputation';
 }
 if(q.family==='quorum-before-vote'){
  assert.equal(nums.length,2);assert.ok(q.text.includes('ორი მესამედის'));
  const required=Math.ceil(nums[0]*2/3);assert.ok(nums[1]<required);
  assert.equal(q.options[q.correct],`საჭირო ${required} დამსწრე არ არის; დამსწრეთა ერთსულოვნება ამ წინაპირობას ვერ ცვლის`);
  return 'quorum_recomputation';
 }
 if(q.family==='coalition-stated-threshold'){
  assert.equal(nums.length,4);const [a,b,c,threshold]=nums;
  assert.ok(a+c>=threshold&&[a,b,c].every(x=>x<threshold));
  assert.equal(q.options[q.correct],'A და C ერთად');return 'coalition_recomputation';
 }
 if(q.family==='conjunctive-eligibility'){
  const threshold=Number(q.text.match(/არანაკლებ (\d+)/u)?.[1]);assert.ok(Number.isFinite(threshold));
  const candidates=[...q.text.matchAll(/([ABCD]): (\d+)(?: ქულა)?, (არასრული|სრული)/gu)];
  assert.equal(candidates.length,4);assert.equal(new Set(candidates.map(x=>x[1])).size,4);
  const eligible=candidates.filter(x=>Number(x[2])>=threshold&&x[3]==='სრული');
  assert.equal(eligible.length,1,'Exactly one eligible candidate required');
  assert.equal(q.options[q.correct],eligible[0][1]);
  assert.equal(q.options.filter(o=>o===eligible[0][1]).length,1);
  return 'conjunctive_rule_recomputation';
 }
 if(q.family==='emissions-boundary'){
  assert.equal(nums.length,2);assert.equal(nums[1]-nums[0],0);
  assert.equal(q.options[q.correct],'უცვლელი დარჩა');
  assert.equal(q.options.filter(o=>o==='უცვლელი დარჩა').length,1);
  return 'boundary_recomputation';
 }
 if(q.family==='absolute-per-person-water'){
  assert.equal(nums.length,4);const first=nums[1]/nums[0],second=nums[3]/nums[2];
  assert.ok(first>second);const answer=`${first}-დან ${second} ლიტრამდე შემცირდა`;
  assert.equal(q.options[q.correct],answer);assert.equal(q.options.filter(o=>o===answer).length,1);
  return 'per_person_recomputation';
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
