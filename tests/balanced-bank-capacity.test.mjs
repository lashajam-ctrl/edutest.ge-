import test from 'node:test';
import assert from 'node:assert/strict';
import {measureFreshBalancedRun} from '../scripts/balanced-bank-capacity.mjs';
const subject='ქართული ენა და ლიტერატურა';
function pool(reading){return Array.from({length:30+reading},(_,i)=>({id:'fixture-'+i,semantic_group_id:'fixture-family-'+i,grade:8,semester:2,subject,topic:i<30?'ქართული · ენა':'ლიტერატურა · კითხვა',public_payload_json:JSON.stringify({text:'Unpublished independent fixture '+i,opts:['a'+i,'b'+i,'c'+i,'d'+i]})}));}
test('six fresh papers are not six balanced papers when reading is insufficient',()=>{
 const papers=measureFreshBalancedRun(pool(32),{subject,grade:8,sizes:Array(6).fill(10)});
 assert.ok(papers.every(p=>p.fullyFresh));assert.equal(papers.filter(p=>p.balanced).length,5);
 assert.deepEqual([papers[5].language,papers[5].literature],[8,2]);
});
test('four extra reading groups restore six 10-question and three 20-question balanced papers',()=>{
 for(const sizes of [Array(6).fill(10),Array(3).fill(20),[10,20,10,20]]){
  const papers=measureFreshBalancedRun(pool(36),{subject,grade:8,sizes});
  assert.ok(papers.every(p=>p.fullyFresh&&p.balanced));
 }
});
test('finite capacity is disclosed instead of guaranteeing unlimited fresh tests',()=>{
 const papers=measureFreshBalancedRun(pool(36),{subject,grade:8,sizes:Array(7).fill(10)});
 assert.equal(papers[6].fresh,6);assert.equal(papers[6].reused,4);assert.equal(papers[6].fullyFresh,false);
});
