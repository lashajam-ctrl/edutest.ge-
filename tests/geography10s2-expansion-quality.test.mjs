import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGeography10s2Evidence as check,validateGeography10s2Batch as batch,repairGeography10s2Rows as repair,geography10s2Regroup as groups,geography10s2Hold as hold,geography10s2AmbiguousId as ambiguous} from '../scripts/geography10s2-expansion-quality.mjs';
const q=(family,text,answer)=>({family,text,options:[answer,'wrong A','wrong B','wrong C'],correct:0,explanation:answer});
const fixtures=[
 q('freight-work','A-ის ტონა = 3; A-ის მანძილი = 20; B-ის ტონა = 2; B-ის მანძილი = 30','120 ტონა-კმ'),
 q('seasonal-pressure','პიკური თვე; პიკური თვის სტუმრები = 100; წლიური სტუმრები = 400','25%'),
 q('renewable-share','ჰიდროენერგია = 20; ქარის ენერგია = 30; გაზის ენერგია = 50','50%'),
 q('irrigation-efficiency','იმავე ფართობს; საჭირო წყალი = 300; ძველი ეფექტიანობა = 50; ახალი ეფექტიანობა = 75','200 მ³'),
 q('route-budget','A-ის საათი = 5; A-ის ფასი = 100; B-ის საათი = 4; B-ის ფასი = 200; C-ის საათი = 3; C-ის ფასი = 300; დროის ზღვარი = 4','მარშრუტი B'),
 q('weighted-access','A-ის მცხოვრები = 100; A-ის წუთი = 10; B-ის მცხოვრები = 100; B-ის წუთი = 20','15 წუთი'),
 q('network-detour','AB გზა = 8; BC გზა = 7; AC გზა = 10; AC გზა დაკეტილია; სხვა გზა არ არსებობს','5 კმ'),
 q('local-retention','ტურისტთა ხარჯი = 1000; იმპორტის გადახდა = 100; გარე საკომისიო = 200; ერთმანეთს არ ფარავს','700 ლარი'),
 q('waste-capacity','თავისუფალი ტევადობა = 30000; ძველი წლიური მოცულობა = 5000; შემცირება = 25; წლიური მოცულობა უცვლელია','2 წელი'),
 q('trade-balance','ექსპორტი = 40; იმპორტი = 60; ერთი და იმავე წლის','20 მილიონი ლარის დეფიციტი')
];
for(const f of fixtures)test(`${f.family}: derives the answer from visible prompt values`,()=>{
 assert.equal(check(f),'prompt_evidence_recomputation');
 assert.throws(()=>check({...f,correct:1}));
 assert.throws(()=>check({...f,explanation:'different result'}));
 const text=f.family==='route-budget'?f.text.replace('B-ის ფასი = 200','B-ის ფასი = 900'):f.text.replace(/= \d+/, '= 999999');
 assert.throws(()=>check({...f,text}));
});
test('missing assumptions, equivalent answers, ties and non-finite values are rejected',()=>{
 for(const [i,phrase]of [[1,'პიკური თვე'],[3,'იმავე ფართობს'],[6,'სხვა გზა არ არსებობს'],[7,'ერთმანეთს არ ფარავს'],[8,'წლიური მოცულობა უცვლელია'],[9,'ერთი და იმავე წლის']])assert.throws(()=>check({...fixtures[i],text:fixtures[i].text.replace(phrase,'')}));
 assert.throws(()=>check({...fixtures[0],options:['120 ტონა-კმ','0120 ტონა-კმ','30','40']}));
 assert.throws(()=>check({...fixtures[4],text:fixtures[4].text.replace('C-ის ფასი = 300','C-ის ფასი = 200')}));
 assert.throws(()=>check({...fixtures[3],text:fixtures[3].text.replace('ძველი ეფექტიანობა = 50','ძველი ეფექტიანობა = 0')}));
});
test('release scope requires grade X semester 2 and four distinct option rationales',()=>{
 const f=fixtures[0],explanation=f.options[0]+' — დამოუკიდებლად გამოთვლილი შედეგი ემთხვევა.';
 const item={...f,id:'fixture',text:'პირობითი მაგალითი: '+f.text,grade:10,semester:2,subject:'გეოგრაფია',topic:'გადაზიდვა',curriculumTheme:'ტრანსპორტი',evidenceKind:'explicit_teaching_scenario',review:'assistant_content_reviewed',explanation,optionReview:[explanation,'მეორე ვარიანტი მასებსა და მანძილებს არასწორად აკავშირებს.','მესამე ვარიანტი მხოლოდ ერთ რეისს ითვალისწინებს.','მეოთხე ვარიანტი ტვირთის მასას მანძილზე არ ამრავლებს.']};
 assert.equal(batch([item]).length,1);
 for(const diff of [{grade:9},{semester:1},{subject:'ისტორია'},{optionReview:['short','short','short','short']},{correct:1}])assert.throws(()=>batch([{...item,...diff}]));
 assert.throws(()=>batch([item,{...item,id:'another'}]));
});
test('closed repair preserves keys, fixes exactly the ambiguous distractor, and is idempotent',()=>{
 const payload={text:'Fixture',opts:['A','ეკონომიკური და დემოგრაფიული მაჩვენებლები დროთა განმავლობაში იცვლება','C','D']};
 const rows=[...Object.keys(groups),...hold].map(id=>({id,grade:10,semester:2,subject:'გეოგრაფია',active:1,semantic_group_id:'old:'+id,public_payload_json:JSON.stringify(payload),content_hash:'old',answer_key_json:'{"correct":2}',explanation:'original explanation'}));
 rows.push({id:'unrelated',grade:3,subject:'ბუნება',semester:1,active:1});
 const next=repair(rows);assert.deepEqual(repair(next),next);assert.equal(Object.keys(groups).length,39);assert.equal(hold.length,3);
 for(let i=0;i<rows.length;i++){
  assert.equal(next[i].answer_key_json,rows[i].answer_key_json);assert.equal(next[i].explanation,rows[i].explanation);
  if(rows[i].id!==ambiguous){assert.equal(next[i].public_payload_json,rows[i].public_payload_json);assert.equal(next[i].content_hash,rows[i].content_hash);}else{const p=JSON.parse(next[i].public_payload_json);assert.equal(p.opts[2],'C');assert.notEqual(p.opts[1],payload.opts[1]);assert.notEqual(next[i].content_hash,'old');}
 }
 assert.deepEqual(next.at(-1),rows.at(-1));assert.equal(next.filter(q=>q.active===0).length,3);
 assert.throws(()=>repair(rows.slice(1)));assert.throws(()=>repair(rows.map((q,i)=>i===0?{...q,semester:1}:q)));
 assert.throws(()=>repair(rows.map(q=>q.id===ambiguous?{...q,answer_key_json:'{"correct":1}'}:q)));
});
