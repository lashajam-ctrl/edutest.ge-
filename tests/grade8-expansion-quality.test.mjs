import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGrade8Batch,verifyGrade8Evidence} from '../scripts/grade8-expansion-quality.mjs';
test('Grade 8 evidence derives values from displayed numbers, not supplied keys',()=>{
 for(const [family,text,answer] of [['minute-air-volume-comparison','12 400 10 300','1800'],['filtration-return-balance','80 76','4'],['enzyme-ph-observations','pH 2: 3; pH 6: 8; pH 10: 1','pH 6']]){
  const q={family,text,options:[answer,'other','missing','none'],correct:0};
  assert.equal(verifyGrade8Evidence(q),'prompt_evidence_recomputation');
  assert.throws(()=>verifyGrade8Evidence({...q,correct:1}));
  assert.throws(()=>verifyGrade8Evidence({...q,options:[answer,answer,'other','none']}));
 }
});
test('Grade 8 numeric checks reject ambiguous maxima and impossible balances',()=>{
 assert.throws(()=>verifyGrade8Evidence({family:'enzyme-ph-observations',text:'2 8 6 8 10 1'}),/Ambiguous/);
 assert.throws(()=>verifyGrade8Evidence({family:'filtration-return-balance',text:'30 40'}));
 assert.throws(()=>verifyGrade8Evidence({family:'minute-air-volume-comparison',text:'0 400 10 300'}));
});
const sample=(i,subject='ბიოლოგია',bucket)=>({id:'fixture-'+i,family:'synthetic-'+i,subject,grade:8,semester:2,prerequisiteMinGrade:8,curriculumTheme:'Synthetic test only',topic:(bucket==='language'?'ქართული · ':'ლიტერატურა · ')+'test',languageBucket:bucket,text:'Unpublished fixture '+i,options:['Alpha','Beta','Gamma','Delta'],correct:0,optionReview:['The first choice follows the stated condition.','The second choice changes the condition given.','The third choice assumes a missing observation.','The fourth choice contradicts the supplied premise.'],explanation:'The first choice follows the stated condition.',review:'assistant_content_reviewed'});
test('Grade 8 guard keeps grade, semester, options and explanation aligned',()=>{
 const q=sample(0);assert.equal(validateGrade8Batch([q])[0].check,'assistant_option_by_option_review_only');
 for(const change of [{grade:7},{semester:1},{correct:1},{options:['A','A','B','C']},{optionReview:['','','','']}])assert.throws(()=>validateGrade8Batch([{...q,...change}]));
 assert.throws(()=>validateGrade8Batch([q,{...q,id:'other'}]));
});
test('Georgian expansion preserves explicit 40/60 language and reading mix',()=>{
 const qs=Array.from({length:10},(_,i)=>sample(i,'ქართული ენა და ლიტერატურა',i<4?'language':'literature'));
 assert.equal(validateGrade8Batch(qs).length,10);
 assert.throws(()=>validateGrade8Batch(qs.map((q,i)=>i===4?{...q,languageBucket:'language',topic:'ქართული · test'}:q)),/share/);
 assert.throws(()=>validateGrade8Batch(qs.map((q,i)=>i===0?{...q,topic:'ლიტერატურა · test'}:q)),/drift/);
});
