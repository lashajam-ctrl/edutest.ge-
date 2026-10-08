import assert from 'node:assert/strict';
import {subjectAllowedForGrade} from '../lib/school-policy.mjs';
export const normalizedPrompt=value=>String(value).normalize('NFKC').toLocaleLowerCase('ka-GE').replace(/[“”„"'’]/gu,'').replace(/\s+/gu,' ').trim();
// Apostrophe placement is the assessed content in possessives and punctuation.
// Preserve it in options: children's, childrens' and childrens are not duplicates.
export const normalizedOption=value=>String(value).normalize('NFKC').toLocaleLowerCase('ka-GE').replace(/\s+/gu,' ').trim();
export function recomputeModel(m){
 switch(m.kind){
  case 'add':return m.values.reduce((a,b)=>a+b,0);
  case 'subtract':return m.values[0]-m.values[1];
  case 'multiply':return m.values.reduce((a,b)=>a*b,1);
  case 'divide':return m.values[0]/m.values[1];
  case 'minimum-label':{
   const minimum=Math.min(...m.values);
   assert.equal(m.values.length,m.labels.length,'Missing comparison label');
   assert.equal(m.values.filter(value=>value===minimum).length,1,'Ambiguous minimum: tied values');
   return m.labels[m.values.indexOf(minimum)];
  }
  case 'between':assert.equal(m.upper-m.lower,2);return m.lower+1;
  case 'multiply-subtract':return m.values[0]*m.values[1]-m.values[2];
  case 'rectangle-side':return m.perimeter/2-m.side;
  case 'linear-tariff':return (m.total-m.base)/m.rate;
  case 'midpoint':return `(${2*m.m[0]-m.a[0]}, ${2*m.m[1]-m.a[1]})`;
  case 'mean-correction':return m.mean+m.delta/m.count;
  default:throw Error('Unsupported independent model: '+m.kind);
 }
}
export function validateExpansionQuestion(q){
 assert.ok(q.id&&q.family&&q.topic&&q.text?.trim(),`${q.id}: required field`);
 assert.ok(subjectAllowedForGrade(q.subject,q.grade),`${q.id}: subject prerequisites`);
 assert.ok([1,2].includes(q.semester));
 assert.ok(q.grade>=(q.prerequisiteMinGrade??1),`${q.id}: premature topic`);
 assert.equal(q.options.length,4);
 assert.ok(q.options.every(x=>typeof x==='string'&&x.trim()));
 assert.equal(new Set(q.options.map(normalizedOption)).size,4,`${q.id}: duplicate options`);
 assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4);
 assert.ok(q.explanation?.trim().length>=30,`${q.id}: insufficient explanation`);
 assert.equal(q.review,'assistant_content_reviewed');
 if(q.model){
  const expected=normalizedPrompt(recomputeModel(q.model));
  assert.equal(q.options.filter(x=>normalizedPrompt(x)===expected).length,1,`${q.id}: exactly one correct value`);
  assert.equal(normalizedPrompt(q.options[q.correct]),expected,`${q.id}: independent recomputation`);
 }
 assert.ok(!/<script|javascript:|\bonerror=/iu.test(q.text));
 return true;
}
// A conservative similarity candidate is NOT a verdict. Reviewers decide whether
// tasks really measure the same operation in the same context.
export function lexicalSimilarity(a,b){
 const words=x=>new Set(normalizedPrompt(x).replace(/\d+/gu,'#').split(/[^\p{L}\p{N}#]+/u).filter(x=>x.length>3));
 const left=words(a),right=words(b),common=[...left].filter(x=>right.has(x)).length;
 return common/(left.size+right.size-common||1);
}
