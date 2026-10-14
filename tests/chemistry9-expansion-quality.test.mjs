import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyChemistry9Evidence as check,validateChemistry9Batch} from '../scripts/chemistry9-expansion-quality.mjs';
test('distillation ties and incorrect column placement are rejected',()=>{
 const q={family:'distillation-column-position',text:'80 140 220',options:['A','B','C','all'],correct:0};assert.equal(check(q),'prompt_evidence_recomputation');
 for(const change of [{text:'80 80 220'},{correct:2}])assert.throws(()=>check({...q,...change}));
});
test('cracking conserves carbon and hydrogen; notation aliases cannot create two valid options',()=>{
 const q={family:'cracking-formula-completion',text:'C₁₀H₂₂ → C₆H₁₄ + X',options:['C₄H₈','C₄H₁₀','C₆H₈','C₁₆H₃₆'],correct:0};assert.equal(check(q),'prompt_evidence_recomputation');
 for(const change of [{correct:1},{text:'C₆H₁₄ → C₁₀H₂₂ + X'},{options:['C₄H₈','C4H8','C₆H₈','C₁₆H₃₆']}])assert.throws(()=>check({...q,...change}));
});
test('methane particle inventory uses the chemical ratio and does not silently round particles',()=>{
 const q={family:'methane-particle-limitation',text:'3 4 2',options:['მეთანის 1 მოლეკულა','ჟანგბადის 1 მოლეკულა','არცერთი','მეთანის 2 მოლეკულა'],correct:0};assert.equal(check(q),'prompt_evidence_recomputation');
 for(const change of [{text:'3 4 1'},{text:'3 3 2'},{text:'2 4 2'},{correct:1}])assert.throws(()=>check({...q,...change}));
});
test('fuel comparison normalizes energy by mass, guards zero denominator and ties',()=>{
 const q={family:'fuel-energy-per-mass',text:'2 90 3 120',options:['A','B','equal','neither'],correct:0};assert.equal(check(q),'prompt_evidence_recomputation');
 for(const change of [{text:'0 90 3 120'},{text:'2 80 3 120'},{correct:1}])assert.throws(()=>check({...q,...change}));
});
test('ethylene chain carbon count is not hydrogen or total atom count',()=>{
 const q={family:'polymer-carbon-inventory',text:'C₂H₄ 20',options:['40','20','80','120'],correct:0};assert.equal(check(q),'prompt_evidence_recomputation');
 for(const change of [{text:'C₂H₄ 0'},{text:'C₃H₆ 20'},{correct:2}])assert.throws(()=>check({...q,...change}));
});
test('calcium phosphate requires neutral charge and smallest whole ratio',()=>{
 const q={family:'polyatomic-charge-balance',text:'+2 −3',options:['Ca₃(PO₄)₂','Ca₂(PO₄)₃','CaPO₄','Ca₃PO₄'],correct:0};assert.equal(check(q),'prompt_evidence_recomputation');
 assert.throws(()=>check({...q,correct:1}));assert.throws(()=>check({...q,options:['Ca₆(PO₄)₄',...q.options.slice(1)]}));
 assert.throws(()=>check({...q,options:['Ca₃(PO₄)₂','Ca3(PO4)2','CaPO₄','Ca₃PO₄']}));
});
test('precipitation requires both silver and chloride, not just one of the two ions',()=>{
 const q={family:'precipitation-ion-pair',text:'AgCl უხსნადია',options:['AgNO₃ + NaCl','AgNO₃ + KNO₃','NaCl + KNO₃','NaNO₃ + KCl'],correct:0};assert.equal(check(q),'prompt_evidence_recomputation');
 for(const change of [{correct:1},{options:['AgNO₃ + NaCl','AgNO₃ + KCl',...q.options.slice(2)]},{text:'AgCl ხსნადია'}])assert.throws(()=>check({...q,...change}));
});
test('chemistry batch requires scoped curriculum, source, reviewed family and consistent rationales',()=>{
 const q={id:'fixture',family:'separation-versus-conversion',topic:'Synthetic fixture',subject:'ქიმია',grade:9,semester:2,text:'Synthetic unpublished fixture.',options:['A','B','C','D'],correct:0,optionReview:['Answer follows the supplied source evidence.','This choice infers an unsupported conclusion.','This option contradicts the first premise.','This distractor exceeds the scope of the source.'],explanation:'Answer follows the supplied source evidence.',review:'assistant_content_reviewed',prerequisiteMinGrade:9,curriculumTheme:'ნივთიერებათა მრავალფეროვნება',sourceUrl:'https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions'};
 assert.equal(validateChemistry9Batch([q])[0].check,'assistant_option_by_option_review_only');
 for(const change of [{grade:8},{semester:1},{correct:1},{sourceUrl:''},{family:'unreviewed'},{options:['A','A','C','D']}])assert.throws(()=>validateChemistry9Batch([{...q,...change}]));
 assert.throws(()=>validateChemistry9Batch([q,{...q,id:'another'}]));
});
