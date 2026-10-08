import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExpansionQuestion,recomputeModel,lexicalSimilarity,normalizedOption} from '../scripts/bank-expansion-quality.mjs';
const base=()=>({id:'synthetic',family:'sum',topic:'მიმატება',text:'შეკრიბე 4 და 3.',subject:'მათემატიკა',grade:1,semester:1,options:['7','6','8','9'],correct:0,explanation:'ოთხს სამს რომ დავუმატებთ, მივიღებთ შვიდს: 4+3=7.',review:'assistant_content_reviewed',model:{kind:'add',values:[4,3]}});
test('new-bank numerical answer is independently recomputed, not trusted from index',()=>{
 assert.equal(validateExpansionQuestion(base()),true);
 assert.throws(()=>validateExpansionQuestion({...base(),correct:1}),/recomputation/);
});
test('new-bank quality gate blocks empty, duplicate and invalid options',()=>{
 assert.throws(()=>validateExpansionQuestion({...base(),options:['7','7','8','9']}),/duplicate/);
 assert.throws(()=>validateExpansionQuestion({...base(),options:['7','','8','9']}));
 assert.throws(()=>validateExpansionQuestion({...base(),correct:5}));
});
test('new-bank quality gate blocks premature content and unsupported subjects',()=>{
 assert.throws(()=>validateExpansionQuestion({...base(),prerequisiteMinGrade:3}),/premature/);
 assert.throws(()=>validateExpansionQuestion({...base(),subject:'ქიმია'}),/prerequisites/);
});
test('numerical model oracles cover each authoring operation',()=>{
 const cases=[
  [{kind:'subtract',values:[9,4]},5], [{kind:'multiply',values:[3,4]},12], [{kind:'divide',values:[9,2]},4.5],
  [{kind:'minimum-label',values:[3,7,2],labels:['a','b','c']},'c'],
  [{kind:'between',lower:3,upper:5},4], [{kind:'multiply-subtract',values:[3,5,2]},13],
  [{kind:'rectangle-side',perimeter:24,side:7},5], [{kind:'linear-tariff',base:10,rate:4,total:30},5],
  [{kind:'midpoint',a:[2,3],m:[5,4]},'(8, 5)'], [{kind:'mean-correction',mean:20,delta:-8,count:4},18],
 ];
 for(const [model,expected]of cases)assert.equal(recomputeModel(model),expected);
 assert.throws(()=>recomputeModel({kind:'unknown'}),/Unsupported/);
});
test('similarity screening recognises numeric-only template variation without claiming semantic proof',()=>{
 assert.equal(lexicalSimilarity('Compare measurements 12 and 16 in this experiment.','Compare measurements 25 and 30 in this experiment.'),1);
 assert.equal(lexicalSimilarity('Photosynthesis converts light energy.','Choose polite English greetings.'),0);
});
test('option validation preserves apostrophes that carry grammatical meaning',()=>{
 assert.equal(new Set(["children's toys","childrens' toys","children toys","child's toys"].map(normalizedOption)).size,4);
});

test('a comparison cannot silently choose the first label when two minima tie',()=>{
 assert.throws(()=>recomputeModel({kind:'minimum-label',values:[2,5,2],labels:['a','b','c']}),/Ambiguous minimum/);
 assert.throws(()=>recomputeModel({kind:'minimum-label',values:[2,5],labels:['a']}),/Missing comparison label/);
});
