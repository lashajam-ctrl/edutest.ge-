import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyHistoryEvidence,validateHistoryBatch} from '../scripts/history-expansion-quality.mjs';
test('urban growth uses population shares, not just city headcount',()=>{
 const q={family:'urbanization-share',text:'20 100 30 200',options:['20%-დან 15%-მდე','20%-დან 30%-მდე','15%-დან 20%-მდე','10%-დან 15%-მდე'],correct:0,explanation:'20%-დან 15%-მდე'};
 assert.equal(verifyHistoryEvidence(q),'prompt_evidence_recomputation');
 for(const change of [{correct:1},{text:'20 0 30 200'},{text:'120 100 30 200'},{explanation:'wrong'}])assert.throws(()=>verifyHistoryEvidence({...q,...change}));
});
test('production decline is calculated against the original base',()=>{
 const q={family:'wartime-production-index',text:'100 65',options:['35%-ით შემცირდა','65%-ით შემცირდა','35%-ით გაიზარდა','65%-ით გაიზარდა'],correct:0,explanation:'35%-ით შემცირდა'};
 assert.equal(verifyHistoryEvidence(q),'prompt_evidence_recomputation');
 assert.throws(()=>verifyHistoryEvidence({...q,correct:1}));
 assert.throws(()=>verifyHistoryEvidence({...q,text:'100 65 20'}));
});
test('history semantic review guards scope, provenance and unique option rationales',()=>{
 const q={id:'fixture',family:'scope',topic:'წყარო',subject:'ისტორია',grade:9,semester:1,text:'პირობითი სასწავლო ჩანაწერი.',options:['A','B','C','D'],correct:0,optionReview:['Answer follows the supplied source evidence.','This choice infers an unsupported conclusion.','This option contradicts the first premise.','This distractor exceeds the scope of the source.'],explanation:'Answer follows the supplied source evidence.',review:'assistant_content_reviewed',prerequisiteMinGrade:9,curriculumTheme:'წყაროები',evidenceKind:'explicit_teaching_scenario'};
 assert.equal(validateHistoryBatch([q])[0].check,'assistant_option_by_option_review_only');
 for(const change of [{grade:8},{correct:1},{options:['A','A','C','D']},{text:'An invented authentic quote'},{evidenceKind:'sourced_paraphrase'}])assert.throws(()=>validateHistoryBatch([{...q,...change}]));
 assert.throws(()=>validateHistoryBatch([q,{...q,id:'second',text:'სხვა პირობითი ჩანაწერი'}]),/family/);
});
