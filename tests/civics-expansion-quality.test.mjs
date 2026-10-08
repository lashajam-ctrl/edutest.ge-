import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCivicsReview,validateCivicsBatch,verifyCivicsEvidence} from '../scripts/civics-expansion-quality.mjs';
const fixture=()=>({id:'synthetic',family:'synthetic-scenario',topic:'მონაწილეობა',subject:'მოქალაქეობა',grade:7,semester:1,text:'Synthetic review fixture, not published content.',options:['A','B','C','D'],correct:0,optionReview:['The correct option follows the stated premise.','Distractor B contradicts the first condition.','Distractor C is unsupported by the supplied evidence.','Distractor D fails the second stated condition.'],explanation:'The correct option follows the stated premise.',review:'assistant_content_reviewed',curriculumTheme:'თემი',prerequisiteMinGrade:7});
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
