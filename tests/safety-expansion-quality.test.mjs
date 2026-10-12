import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSafetyBatch,verifySafetyEvidence} from '../scripts/safety-expansion-quality.mjs';
const fixture=()=>({id:'fixture',family:'scope',topic:'სავარჯიშო',subject:'სამოქალაქო თავდაცვა და უსაფრთხოება',grade:12,semester:1,text:'Synthetic review fixture, not published.',options:['A','B','C','D'],correct:0,optionReview:['The answer follows the stated plan precisely.','This alternative contradicts the stated scope.','This option assumes evidence not supplied here.','The final choice changes the explicit prerequisite.'],explanation:'The answer follows the stated plan precisely.',review:'assistant_content_reviewed',prerequisiteMinGrade:12,curriculumTheme:'მზადყოფნა'});
test('safety inventory excludes unavailable and reserved disjoint stock',()=>{
 const q={family:'usable-stock-reserve',text:'24 5 3',options:['16','19','21','24'],correct:0};
 assert.equal(verifySafetyEvidence(q),'prompt_evidence_recomputation');
 assert.throws(()=>verifySafetyEvidence({...q,correct:1}));
 assert.throws(()=>verifySafetyEvidence({...q,text:'5 4 3'}));
});
test('parallel readiness waits for both predecessors, not their sum',()=>{
 const q={family:'parallel-readiness-path',text:'6 9 ერთდროულად ორივე 4',options:['13','19','10','9'],correct:0};
 assert.equal(verifySafetyEvidence(q),'prompt_evidence_recomputation');
 assert.throws(()=>verifySafetyEvidence({...q,correct:1}));
 assert.throws(()=>verifySafetyEvidence({...q,text:'6 9 თანმიმდევრულად ორივე 4'}));
});
test('stated risk matrix recomputes each product and rejects ties',()=>{
 const q={family:'stated-risk-score',text:'2 5 4 3 1 4',options:['B','A','C','Tie'],correct:0};
 assert.equal(verifySafetyEvidence(q),'prompt_evidence_recomputation');
 assert.throws(()=>verifySafetyEvidence({...q,correct:1}));
 assert.throws(()=>verifySafetyEvidence({...q,text:'3 4 4 3 1 4'}),/Tied/);
});
test('safety review guards grade, option uniqueness, explanation and family diversity',()=>{
 assert.equal(validateSafetyBatch([fixture()])[0].check,'assistant_option_by_option_review_only');
 for(const change of [{grade:11},{correct:2},{optionReview:['','','','']},{options:['A','A','C','D']},{subject:'მათემატიკა'}])assert.throws(()=>validateSafetyBatch([{...fixture(),...change}]));
 assert.throws(()=>validateSafetyBatch([fixture(),{...fixture(),id:'second',text:'Another task'}]),/family/);
});
