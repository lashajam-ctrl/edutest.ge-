import test from 'node:test';
import assert from 'node:assert/strict';
import {correctBankRow,v29AdditionDecision} from '../data/bank-quality-corrections-v29.mjs';
const make=(text,type='true_false',extra={})=>({id:'v28-example',subject:'ქართული',grade:2,question_type:type,public_payload_json:JSON.stringify({text,opts:['ჭეშმარიტი','მცდარი']}),answer_key_json:'{"correct":0}',explanation:'old',...extra});
test('Georgian capitalization misconception is replaced consistently',()=>{
 const {row,fixes}=correctBankRow(make('წინადადება დიდი ასოთი იწყება.'));
 assert.equal(fixes.includes('georgian_capitalization'),true);
 assert.doesNotMatch(JSON.parse(row.public_payload_json).text,/დიდი ასო/u);
 assert.equal(JSON.parse(row.answer_key_json).correct,0);
 assert.match(row.explanation,/სასვენი/u);
});
test('Georgian order prompt states the requested order, not a unique grammatical order',()=>{
 const {row}=correctBankRow(make('დაალაგე სიტყვები','order',{public_payload_json:JSON.stringify({text:'დაალაგე სიტყვები',items:['ანა','საღამოს','კითხულობს','წიგნს']})}));
 assert.match(JSON.parse(row.public_payload_json).text,/ვინ\? → როდის\?/u);
 assert.deepEqual(JSON.parse(row.answer_key_json).correct,['ანა','საღამოს','კითხულობს','წიგნს']);
});
test('reading question requires evidence actually present in its passage',()=>{
 const {row}=correctBankRow(make('ნისლი','multiple_choice',{id:'v28-GE-G04-KA-S1-043'}));
 const p=JSON.parse(row.public_payload_json);
 assert.equal(p.opts[JSON.parse(row.answer_key_json).correct],'ეზოში სათამაშოდ გავიდნენ');
 assert.match(p.text,/ბავშვები ეზოში სათამაშოდ გავიდნენ/u);
});
test('short prose answer is never exact-matched after migration',()=>{
 const {row}=correctBankRow(make('Why?','short_answer',{answer_key_json:JSON.stringify({mode:'text',accepted:['He helps his grandmother.']})}));
 assert.equal(JSON.parse(row.answer_key_json).mode,'ai');
});
test('unreviewed additions are not silently approved by structural PASS',()=>{
 assert.equal(v29AdditionDecision({id:'x',grade:3,subject:'ბუნება'}),'pending_subject_content_review');
 assert.equal(v29AdditionDecision({id:'x',grade:1,subject:'ინგლისური'}),'pending_grade_one_reading_simplification');
});
