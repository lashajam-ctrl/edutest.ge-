import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCivicsReview,validateCivicsBatch,verifyCivicsEvidence} from '../scripts/civics-expansion-quality.mjs';
const fixture=()=>({id:'synthetic',family:'synthetic-scenario',topic:'მონაწილეობა',subject:'მოქალაქეობა',grade:7,semester:1,text:'Synthetic review fixture, not published content.',options:['A','B','C','D'],correct:0,optionReview:['The correct option follows the stated premise.','Distractor B contradicts the first condition.','Distractor C is unsupported by the supplied evidence.','Distractor D fails the second stated condition.'],explanation:'The correct option follows the stated premise.',review:'assistant_content_reviewed',curriculumTheme:'თემი',prerequisiteMinGrade:7});
test('grade-eleven numeric evidence independently recomputes all five plain-number families',()=>{
 for(const [family,text,answer]of [['profit-after-all-costs','900 720','180'],['contribution-not-net-profit','12 8','4'],['break-even-units','120 9 5','30'],['production-bottleneck','12 8 5','5'],['weighted-turnout-combined','100 80 300 120','50']]){
  const q={family,text,options:[answer,'wrong','other','none'],correct:0};
  assert.equal(verifyCivicsEvidence(q),'prompt_number_recomputation');
  assert.throws(()=>verifyCivicsEvidence({...q,correct:1}));
 }
 assert.throws(()=>verifyCivicsEvidence({family:'break-even-units',text:'120 5 9',options:['30','0','1','2'],correct:0}));
});
test('grade-eleven cost comparisons and margin use the stated period and denominator',()=>{
 const cases=[
  {family:'lifetime-cost-tie',text:'60 20 90 5 ორი წელი',options:['ორი წლის სრული ხარჯი ორივესთვის 100 ლარია','A','B','C'],correct:0},
  {family:'subscription-total-price',text:'15 20 18 ოთხი თვისთვის',options:['B — 72 ლარი','A','C','D'],correct:0},
  {family:'margin-versus-markup',text:'100 80',options:['20%','25%','80%','100%'],correct:0}
 ];
 for(const q of cases){assert.notEqual(verifyCivicsEvidence(q),'assistant_option_by_option_review_only');assert.throws(()=>verifyCivicsEvidence({...q,correct:1}));}
 assert.throws(()=>verifyCivicsEvidence({...cases[0],text:'60 20 95 5 ორი წელი'}));
 assert.throws(()=>verifyCivicsEvidence({...cases[1],text:'15 20 18 ექვსი თვისთვის'}));
});
test('grade-eleven voting models check shares, quorum and coalition thresholds',()=>{
 const p={family:'plurality-not-majority',text:'40 35 25',options:['ყველაზე მეტი ხმა აქვს ცალკეულ ვარიანტებს შორის, მაგრამ ნახევარზე მეტი არა','B','C','D'],correct:0};
 const q={family:'quorum-before-vote',text:'15 ორი მესამედის 9',options:['საჭირო 10 დამსწრე არ არის; დამსწრეთა ერთსულოვნება ამ წინაპირობას ვერ ცვლის','B','C','D'],correct:0};
 const c={family:'coalition-stated-threshold',text:'45 35 20 51',options:['A და C ერთად','მხოლოდ A','მხოლოდ B','მხოლოდ C'],correct:0};
 for(const item of [p,q,c]){assert.notEqual(verifyCivicsEvidence(item),'assistant_option_by_option_review_only');assert.throws(()=>verifyCivicsEvidence({...item,correct:1}));}
 assert.throws(()=>verifyCivicsEvidence({...p,text:'60 25 15'}));
 assert.throws(()=>verifyCivicsEvidence({...q,text:'15 ორი მესამედის 10'}));
 assert.throws(()=>verifyCivicsEvidence({...c,text:'45 35 20 40'}));
});
test('grade-ten evidence distinguishes people from visits and follows explicit deadline rules',()=>{
 const q={family:'unique-campaign-reach',text:'28 22 9',options:['41','50','59','19'],correct:0};
 assert.equal(verifyCivicsEvidence(q),'prompt_number_recomputation');
 assert.throws(()=>verifyCivicsEvidence({...q,correct:1}));
 assert.throws(()=>verifyCivicsEvidence({...q,text:'28 22 30'}));
 const d={family:'explicit-deadline-count',text:'5 12 მომდევნო დღიდან უქმეებიც ითვლება',options:['17','16','18','19'],correct:0};
 assert.equal(verifyCivicsEvidence(d),'prompt_number_recomputation');
 assert.throws(()=>verifyCivicsEvidence({...d,text:'5 12 მიღების დღიდან'}));
});
test('conjunctive eligibility recomputes each candidate and rejects ambiguity',()=>{
 const q={family:'conjunctive-eligibility',text:'არანაკლებ 70 A: 75, არასრული; B: 68, სრული; C: 70, სრული; D: 65, არასრული',options:['C','A','B','D'],correct:0};
 assert.equal(verifyCivicsEvidence(q),'conjunctive_rule_recomputation');
 assert.throws(()=>verifyCivicsEvidence({...q,text:q.text.replace('B: 68','B: 71')}),/Exactly one/);
 assert.throws(()=>verifyCivicsEvidence({...q,text:q.text.replace('C: 70','C: 69')}),/Exactly one/);
 assert.throws(()=>verifyCivicsEvidence({...q,correct:1}));
});
test('review records are not falsely labelled computational proof',()=>{
 const q=fixture();assert.equal(validateCivicsReview(q),true);assert.equal(verifyCivicsEvidence(q),'assistant_option_by_option_review_only');
});
test('every option needs a distinct rationale aligned with the key',()=>{
 const q=fixture();q.optionReview[2]='';assert.throws(()=>validateCivicsReview(q));
 const r=fixture();r.correct=1;assert.throws(()=>validateCivicsReview(r),/alignment/);
});
test('duplicate options, premature grade and family inflation are blocked',()=>{
 const q=fixture();q.options[1]='A';assert.throws(()=>validateCivicsReview(q));
 const r=fixture();r.prerequisiteMinGrade=8;assert.throws(()=>validateCivicsReview(r));
 assert.throws(()=>validateCivicsBatch([fixture(),{...fixture(),id:'other',text:'Different wrapping'}]),/families/);
});
test('budget oracle rejects ambiguity and an incorrect key',()=>{
 const q={family:'budget-feasible-set',text:'100 60 40 30',options:['განათება და პანდუსი','განათება და სკამები','პანდუსი და სკამები','სამივე ერთად'],correct:0};
 assert.equal(verifyCivicsEvidence(q),'constraint_recomputation');
 assert.throws(()=>verifyCivicsEvidence({...q,correct:1}));
 assert.throws(()=>verifyCivicsEvidence({...q,text:'140 60 40 30'}),/one feasible/);
});
test('prompt changes cannot silently retain an outdated numeric key',()=>{
 const q={family:'repair-versus-replace-cost',text:'25 70',options:['45','25','70','95'],correct:0};
 assert.equal(verifyCivicsEvidence(q),'prompt_number_recomputation');
 assert.throws(()=>verifyCivicsEvidence({...q,text:'25 80'}));
});
test('score tie and explanation mismatch stop publication',()=>{
 const q={family:'decision-criteria-consistency',text:'A-ს აქვს 5 და 2; B-ს — 4 და 4',options:['B, total 8','A, first','A, early','Tie'],correct:0,explanation:'A = 7; B = 8'};
 assert.equal(verifyCivicsEvidence(q),'score_recomputation');
 assert.throws(()=>verifyCivicsEvidence({...q,text:'A-ს აქვს 5 და 3; B-ს — 4 და 4'}),/tied/);
 assert.throws(()=>verifyCivicsEvidence({...q,explanation:'A = 9; B = 8'}));
});
test('rates use both denominators rather than absolute counts',()=>{
 const q={family:'performance-denominator',text:'100 80 200 120',options:['რაოდენობა გაიზარდა, მაგრამ წილი 80%-დან 60%-მდე შემცირდა','B','C','D'],correct:0};
 assert.equal(verifyCivicsEvidence(q),'rate_recomputation');
 assert.throws(()=>verifyCivicsEvidence({...q,text:'100 80 120 120'}));
});
test('grade-nine models recompute fixed cost, deficit, boundary and per-person totals',()=>{
 assert.equal(verifyCivicsEvidence({family:'fixed-variable-program-cost',text:'60 4 10',options:['100','40','64','640'],correct:0}),'prompt_number_recomputation');
 assert.throws(()=>verifyCivicsEvidence({family:'fixed-variable-program-cost',text:'60 4 10',options:['100','40','64','640'],correct:3}));
 assert.equal(verifyCivicsEvidence({family:'budget-shortfall',text:'240 275',options:['35','240','275','515'],correct:0}),'prompt_number_recomputation');
 assert.equal(verifyCivicsEvidence({family:'emissions-boundary',text:'80 80',options:['უცვლელი დარჩა','A','B','C'],correct:0}),'boundary_recomputation');
 assert.throws(()=>verifyCivicsEvidence({family:'emissions-boundary',text:'80 90',options:['უცვლელი დარჩა','A','B','C'],correct:0}));
 assert.equal(verifyCivicsEvidence({family:'absolute-per-person-water',text:'20 200 30 240',options:['10-დან 8 ლიტრამდე შემცირდა','A','B','C'],correct:0}),'per_person_recomputation');
});
