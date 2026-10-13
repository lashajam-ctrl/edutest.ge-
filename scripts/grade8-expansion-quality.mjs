import assert from 'node:assert/strict';
import {validateExpansionQuestion, normalizedPrompt} from './bank-expansion-quality.mjs';
import {languageBucketFor} from '../lib/assessment-selection.ts';

export function validateGrade8Batch(questions, {expectedLanguageShare = .4} = {}){
 assert.ok(Number.isFinite(expectedLanguageShare)&&expectedLanguageShare>=0&&expectedLanguageShare<=1,'Invalid declared language share');
 assert.ok(questions.length>0);
 for(const field of ['id','family'])assert.equal(new Set(questions.map(q=>q[field])).size,questions.length,`Repeated ${field}`);
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Repeated prompt');
 const subject=questions[0].subject;
 assert.ok(['ბიოლოგია','ქართული ენა და ლიტერატურა'].includes(subject));
 const checks=questions.map(q=>{
  validateExpansionQuestion(q);assert.equal(q.subject,subject);assert.equal(q.grade,8);assert.equal(q.semester,2);
  assert.equal(q.prerequisiteMinGrade,8);assert.ok(q.curriculumTheme?.trim());
  assert.equal(q.optionReview?.length,4);assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));
  assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);assert.equal(q.explanation,q.optionReview[q.correct]);
  if(subject==='ქართული ენა და ლიტერატურა')assert.equal(languageBucketFor(subject,q.topic,q.text),q.languageBucket,'Language allocation drift');
  return {id:q.id,check:verifyGrade8Evidence(q)};
 });
 if(subject==='ქართული ენა და ლიტერატურა'){
  assert.equal(questions.filter(q=>q.languageBucket==='language').length/ questions.length,expectedLanguageShare,'Editorial language share');
  assert.ok(Math.abs(questions.filter(q=>q.languageBucket==='literature').length/questions.length-(1-expectedLanguageShare))<1e-10,'Editorial reading share');
 }
 return checks;
}

export function verifyGrade8Evidence(q){
 let expected;const n=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));
 if(q.family==='minute-air-volume-comparison'){
  assert.equal(n.length,4);assert.ok(n.every(x=>x>0));expected=String(n[0]*n[1]-n[2]*n[3]);assert.ok(Number(expected)>0);
 }else if(q.family==='filtration-return-balance'){
  assert.equal(n.length,2);assert.ok(n[0]>=n[1]&&n[1]>=0);expected=String(n[0]-n[1]);
 }else if(q.family==='enzyme-ph-observations'){
  assert.equal(n.length,6);const pairs=[[n[0],n[1]],[n[2],n[3]],[n[4],n[5]]];
  assert.ok(pairs.every(([p,v])=>p>=0&&p<=14&&v>=0));
  const max=Math.max(...pairs.map(x=>x[1]));assert.equal(pairs.filter(x=>x[1]===max).length,1,'Ambiguous maximum');
  expected='pH '+pairs.find(x=>x[1]===max)[0];
 }else return 'assistant_option_by_option_review_only';
 assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one valid numeric answer');assert.equal(q.options[q.correct],expected,'Prompt/key mismatch');
 return 'prompt_evidence_recomputation';
}
