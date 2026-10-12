import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGeorgiaBatch,verifyGeorgiaEvidence} from '../scripts/georgia-expansion-quality.mjs';
test('Georgia numeric scenarios independently recompute route, time and population',()=>{
 for(const [family,text,expected] of [['river-crossing-route','3 1 4','8'],['chronology-elapsed-years','1845 1870','25'],['residents-flow-balance','120 15 8','127']]){
  const q={family,text,options:[expected,'wrong','other','none'],correct:0};
  assert.equal(verifyGeorgiaEvidence(q),'prompt_evidence_recomputation');assert.throws(()=>verifyGeorgiaEvidence({...q,correct:1}));
 }
 assert.throws(()=>verifyGeorgiaEvidence({family:'residents-flow-balance',text:'3 1 8',options:['-4','0','4','8'],correct:0}));
});
test('century boundary does not truncate the first two digits',()=>{
 const q={family:'century-first-year',text:'1601',options:['XVII საუკუნე','XVI საუკუნე','XV საუკუნე','XVIII საუკუნე'],correct:0};
 assert.equal(verifyGeorgiaEvidence(q),'prompt_evidence_recomputation');
 assert.throws(()=>verifyGeorgiaEvidence({...q,correct:1}));
 assert.equal(verifyGeorgiaEvidence({...q,text:'1600',correct:1}),'prompt_evidence_recomputation');
 assert.throws(()=>verifyGeorgiaEvidence({...q,text:'0'}));
});
test('Georgia semantic review stays labelled judgement and guards grade and options',()=>{
 const q={id:'fixture',family:'scope',topic:'წყარო',subject:'ჩვენი საქართველო',grade:6,semester:1,text:'Synthetic fixture, not published.',options:['A','B','C','D'],correct:0,optionReview:['Answer follows the supplied source evidence.','This choice infers an unsupported conclusion.','This option contradicts the first premise.','This distractor exceeds the scope of the source.'],explanation:'Answer follows the supplied source evidence.',review:'assistant_content_reviewed',prerequisiteMinGrade:6,curriculumTheme:'წყაროები'};
 assert.equal(validateGeorgiaBatch([q])[0].check,'assistant_option_by_option_review_only');
 for(const change of [{grade:5},{correct:1},{options:['A','A','C','D']},{optionReview:['','','','']}])assert.throws(()=>validateGeorgiaBatch([{...q,...change}]));
 assert.throws(()=>validateGeorgiaBatch([q,{...q,id:'second',text:'Other wording'}]),/family/);
});
