import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGeography10Evidence as check,validateGeography10Batch as batch,repairGeography10Rows as repair,geography10Regroup as groups,geography10Hold as hold,geography10Fingerprint as fingerprint} from '../scripts/geography10-expansion-quality.mjs';
const q=(family,text,answer,others=['wrong A','wrong B','wrong C'])=>({family,text,options:[answer,...others],correct:0,explanation:answer});
const fixtures=[
 q('migration-residual','საწყისი მოსახლეობა = 10000; საბოლოო მოსახლეობა = 10120; დაბადება = 140; გარდაცვალება = 100; საზღვრები უცვლელია; სხვა შესწორება არ ყოფილა','80 ადამიანი'),
 q('birth-rate-comparison','A-ის დაბადება = 1500; A-ის საშუალო მოსახლეობა = 100000; B-ის დაბადება = 800; B-ის საშუალო მოსახლეობა = 40000','B — 20 დაბადება ყოველ 1000 მცხოვრებზე'),
 q('pooled-density','ტერიტორიები არ იკვეთება; A-ის მოსახლეობა = 100000; B-ის მოსახლეობა = 100000; A-ის ფართობი = 1000; B-ის ფართობი = 4000','40 ადამიანი/კმ²'),
 q('age-dependency','0–14 ბავშვები = 9000; 65+ ხანდაზმულები = 6000; 15–64 შუა ასაკობრივი ჯგუფი = 30000','50 ყოველ 100-ზე'),
 q('land-use-transition','სახნავიდან განაშენიანებულად = 20; ტყიდან განაშენიანებულად = 10; განაშენიანებულიდან პარკად = 5; სხვა ცვლილება არ ყოფილა; პარკი განაშენიანებულ კატეგორიაში არ შედის','25 ჰა'),
 q('cohort-aging','ქვედა ასაკი = 10; ზედა ასაკი = 14; გასული დრო = 5; არავინ გარდაცვლილა და მიგრაცია არ ყოფილა','15–19 წელი'),
 q('service-overlap','სულ მოსახლეობა = 2400; A-ის ზონა = 1200; B-ის ზონა = 900; გადაკვეთა = 300; სხვა მომსახურების ზონა არ არსებობს','600 ადამიანი'),
 q('stratified-settlements','A-ის მცხოვრები = 500; B-ის მცხოვრები = 1500; C-ის მცხოვრები = 1000; ნიმუშის ზომა = 30','A — 5, B — 15, C — 10')
];
for(const f of fixtures)test(`${f.family}: recomputes the key from prompt values`,()=>{
 assert.equal(check(f),'prompt_evidence_recomputation');
 assert.throws(()=>check({...f,correct:1}));
 assert.throws(()=>check({...f,explanation:'inconsistent'}));
 assert.throws(()=>check({...f,text:f.text.replace(/= \d+/, '= 999999')}));
});
test('guards reject missing assumptions and equivalent numeric answers',()=>{
 for(const [i,phrase]of [[0,'სხვა შესწორება არ ყოფილა'],[2,'ტერიტორიები არ იკვეთება'],[4,'პარკი განაშენიანებულ კატეგორიაში არ შედის'],[5,'არავინ გარდაცვლილა და მიგრაცია არ ყოფილა'],[6,'სხვა მომსახურების ზონა არ არსებობს']])assert.throws(()=>check({...fixtures[i],text:fixtures[i].text.replace(phrase,'')}));
 assert.throws(()=>check({...fixtures[0],options:['80 ადამიანი','080 ადამიანი','40 ადამიანი','160 ადამიანი']}));
 assert.throws(()=>check({...fixtures[6],text:fixtures[6].text.replace('გადაკვეთა = 300','გადაკვეთა = 1300')}));
});
test('editorial pins detect changed wording, key or reasoning; option rotation preserves meaning',()=>{
 const a={text:'Review fixture',options:['A','B','C','D'],optionReview:['why A','why B','why C','why D'],correct:0,explanation:'why A',evidenceKind:'explicit_teaching_scenario'};
 const rotate=x=>x.slice(1).concat(x[0]);
 assert.equal(fingerprint(a),fingerprint({...a,options:rotate(a.options),optionReview:rotate(a.optionReview),correct:3}));
 for(const diff of [{correct:1},{text:'Different meaning'},{explanation:'Different rationale'}])assert.notEqual(fingerprint(a),fingerprint({...a,...diff}));
 assert.throws(()=>check({...a,family:'urban-reclassification'}),/drift/);
});
test('review scope is grade X geography semester 1, with complete option rationales',()=>{
 const f=fixtures[0],explanation=f.options[0]+' — დამოუკიდებელი გამოთვლა ამ მნიშვნელობას ადასტურებს.';
 const item={...f,text:'პირობითი მაგალითი: '+f.text,id:'fixture',grade:10,semester:1,subject:'გეოგრაფია',topic:'დემოგრაფია',curriculumTheme:'მოსახლეობა',review:'assistant_content_reviewed',evidenceKind:'explicit_teaching_scenario',explanation,optionReview:[explanation,'მეორე პასუხი უგულებელყოფს ბუნებრივ მატებას.','მესამე პასუხი ბუნებრივ და მექანიკურ ცვლილებას ურევს.','მეოთხე პასუხი მთლიან მატებას ორჯერ ითვლის.']};
 assert.equal(batch([item]).length,1);
 for(const diff of [{grade:9},{semester:2},{subject:'ისტორია'},{review:'unchecked'},{evidenceKind:'real_statistics'},{correct:1},{optionReview:['short','short','short','short']}])assert.throws(()=>batch([{...item,...diff}]));
 assert.throws(()=>batch([item,{...item,id:'different'}]));
});
test('closed-ID repair changes only reviewed group IDs or two holds and is idempotent',()=>{
 const rows=[...Object.keys(groups),...hold].map(id=>({id,grade:10,semester:1,subject:'გეოგრაფია',active:1,semantic_group_id:'old:'+id,answer_key_json:'untouched'}));
 rows.push({id:'unrelated',grade:7,semester:2,subject:'ბიოლოგია',active:1,semantic_group_id:'untouched'});
 assert.equal(Object.keys(groups).length,39);assert.equal(hold.length,2);
 const next=repair(rows);assert.deepEqual(repair(next),next);
 for(let i=0;i<rows.length;i++)assert.deepEqual(next[i],Object.hasOwn(groups,rows[i].id)?{...rows[i],semantic_group_id:groups[rows[i].id]}:hold.includes(rows[i].id)?{...rows[i],active:0}:rows[i]);
 assert.throws(()=>repair(rows.slice(1)));
 assert.throws(()=>repair(rows.map((r,i)=>i===0?{...r,grade:11}:r)));
});
