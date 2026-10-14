import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBiology9Evidence,validateBiology9Batch} from '../scripts/biology9-expansion-quality.mjs';
test('population estimates and densities are recomputed from the prompt',()=>{
 const q={family:'mark-recapture-estimate',text:'20 40 5',options:['160','60','100','200'],correct:0};
 assert.equal(verifyBiology9Evidence(q),'prompt_evidence_recomputation');
 for(const change of [{correct:1},{text:'20 40 0'},{text:'20 40 30'}])assert.throws(()=>verifyBiology9Evidence({...q,...change}));
 const d={family:'population-density-comparison',text:'18 3 24 8',options:['A ნაკვეთზე','B ნაკვეთზე','თანაბარია','უცნობია'],correct:0};
 assert.equal(verifyBiology9Evidence(d),'prompt_evidence_recomputation');
 assert.throws(()=>verifyBiology9Evidence({...d,text:'18 3 24 4'}));
 assert.throws(()=>verifyBiology9Evidence({...d,correct:1}));
});
test('gametes halve and fertilization restores the chromosome complement; net oxygen subtracts respiration',()=>{
 const q={family:'gamete-zygote-complement',text:'24',options:['12 და 24','24 და 48','12 და 12','24 და 24'],correct:0};
 assert.equal(verifyBiology9Evidence(q),'prompt_evidence_recomputation');
 assert.throws(()=>verifyBiology9Evidence({...q,text:'23'}));
 assert.throws(()=>verifyBiology9Evidence({...q,correct:1}));
 const o={family:'photosynthesis-net-oxygen',text:'12 4',options:['8','16','12','4'],correct:0};
 assert.equal(verifyBiology9Evidence(o),'prompt_evidence_recomputation');
 assert.throws(()=>verifyBiology9Evidence({...o,correct:1}));
 assert.throws(()=>verifyBiology9Evidence({...o,text:'4 12'}));
});
test('biology review enforces grade, semester, topic, source and explanations',()=>{
 const q={id:'fixture',family:'scope',topic:'წყარო',subject:'ბიოლოგია',grade:9,semester:2,text:'Synthetic unpublished fixture.',options:['A','B','C','D'],correct:0,optionReview:['Answer follows the supplied source evidence.','This choice infers an unsupported conclusion.','This option contradicts the first premise.','This distractor exceeds the scope of the source.'],explanation:'Answer follows the supplied source evidence.',review:'assistant_content_reviewed',prerequisiteMinGrade:9,curriculumTheme:'სახეობა და პოპულაცია',sourceUrl:'https://openstax.org/books/biology-2e/pages/45-1-population-demography'};
 assert.equal(validateBiology9Batch([q])[0].check,'assistant_option_by_option_review_only');
 for(const change of [{grade:8},{semester:1},{correct:1},{sourceUrl:''},{curriculumTheme:'unreviewed'},{options:['A','A','C','D']}])assert.throws(()=>validateBiology9Batch([{...q,...change}]));
 assert.throws(()=>validateBiology9Batch([q,{...q,id:'other',text:'Another unpublished fixture'}]),/family/);
});
