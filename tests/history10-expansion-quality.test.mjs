import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyHistory10Evidence as check,validateHistory10Batch as batch,history10EditorialFingerprint as fingerprint,history10EditorialDigests as digests,history10Families} from '../scripts/history10-expansion-quality.mjs';
function q(family,text,options,explanation=options[0]){return {family,text,options,correct:0,explanation};}
test('bronze supply is limited by both ingredients, not their summed stock',()=>{
 const a=q('bronze-limiting-supply','9 სპილენძი, 1 კალა; 45 სპილენძი, 3 კალა; ნედლეულის დამატება და ძველი ნივთების გადადნობა გამორიცხულია; დანაკარგი არ არის და შემადგენლობა უცვლელია',['3 პარტია','5 პარტია','6 პარტია','48 პარტია'],'3 პარტია: წარმოებას კალას მარაგი ზღუდავს.');
 assert.doesNotThrow(()=>check(a));
 for(const change of [{correct:1},{text:a.text.replace('3 კალა','6 კალა')},{text:a.text.replace('დანაკარგი არ არის და შემადგენლობა უცვლელია','შემადგენლობა ცვალებადია')},{options:['3 პარტია','03 პარტია','6 პარტია','48 პარტია']},{explanation:'ხუთი პარტია'}])assert.throws(()=>check({...a,...change}));
 const fraction={...a,text:a.text.replace('1 კალა','2 კალა'),options:['1 პარტია','2 პარტია','3 პარტია','5 პარტია'],explanation:'1 პარტია: წარმოებას კალას მარაგი ზღუდავს.'};assert.doesNotThrow(()=>check(fraction));
});
test('editorial fingerprint binds meaning, key, rationales and provenance but tolerates consistent option rotation',()=>{
 const a={text:'Reviewed fixture',options:['A','B','C','D'],correct:0,optionReview:['why A','why not B','why not C','why not D'],explanation:'why A',evidenceKind:'sourced_paraphrase',sourceUrl:'https://example.org/source'};
 const rotate=xs=>xs.slice(1).concat(xs[0]);
 assert.equal(fingerprint(a),fingerprint({...a,options:rotate(a.options),optionReview:rotate(a.optionReview),correct:3}));
 for(const change of [{text:'Different meaning'},{correct:1},{sourceUrl:'https://example.org/other'},{evidenceKind:'explicit_teaching_scenario'},{options:['A','B','C','new option']},{optionReview:['new rationale','why not B','why not C','why not D']},{explanation:'New claim'}])assert.notEqual(fingerprint(a),fingerprint({...a,...change}));
 assert.equal(Object.keys(digests).length,7);
 for(const [family,digest]of Object.entries(digests)){assert.match(digest,/^[a-f0-9]{64}$/);assert.ok(history10Families[family]);assert.throws(()=>check({...a,family}),/Editorial content changed/);}
});
test('co-regency counts the shared interval once and requires explicit ordering',()=>{
 const a=q('co-regency-overlap','24 18 6; ჯერ A გამეფდა; B A-ს შემდეგაც განაგრძო მართვა; წყვეტა არ ყოფილა',['36 წელი','42 წელი','48 წელი','30 წელი']);
 assert.doesNotThrow(()=>check(a));
 for(const c of [{correct:1},{text:a.text.replace('ჯერ A გამეფდა','უცნობია')},{text:a.text.replace('24 18 6','24 18 19')},{options:['36 წელი','036 წელი','48 წელი','30 წელი']}])assert.throws(()=>check({...a,...c}));
});
test('ration entitlement weights worked days instead of splitting equally',()=>{
 const a=q('ration-labor-days','თითო ნამუშევარ დღეზე 2 საზომი; A 3 დღე; B 5 დღე; სხვა დანამატი არ არსებობს',['A — 6 საზომი; B — 10 საზომი','A — 8 საზომი; B — 8 საზომი','A — 3 საზომი; B — 5 საზომი','A — 10 საზომი; B — 6 საზომი']);
 assert.doesNotThrow(()=>check(a));assert.throws(()=>check({...a,correct:1}));assert.throws(()=>check({...a,text:a.text.replace('2 საზომი','3 საზომი')}));
});
test('historical BCE/CE interval excludes a fictitious year zero',()=>{
 const a=q('calendar-no-year-zero','ძვ. წ. 4 წლის დასაწყისში და ახ. წ. 3 წლის დასაწყისში; ნულოვანი წელი არ არის',['6 წელი','7 წელი','8 წელი','1 წელი']);
 assert.doesNotThrow(()=>check(a));assert.throws(()=>check({...a,correct:1}));assert.throws(()=>check({...a,text:a.text.replace('ნულოვანი წელი არ არის','ასტრონომიული აღრიცხვა')}));
 const edge=q('calendar-no-year-zero','ძვ. წ. 1 წლის დასაწყისში და ახ. წ. 1 წლის დასაწყისში; ნულოვანი წელი არ არის',['1 წელი','2 წელი','0 წელი','3 წელი']);assert.doesNotThrow(()=>check(edge));
});
test('BCE dating ranges intersect rather than form a union',()=>{
 const a=q('dating-range-overlap','3200 3000 3100 2900',['ძვ. წ. 3100–3000 წლებში','ძვ. წ. 3200–3100 წლებში','ძვ. წ. 3000–2900 წლებში','ძვ. წ. 3200–2900 წლებში']);
 assert.equal(check(a),'prompt_evidence_recomputation');
 for(const change of [{correct:3},{text:'3200 3000 2900 2700'},{explanation:'unsupported'}])assert.throws(()=>check({...a,...change}));
});
test('ancient accounts subtract both outflows and reject equivalent options',()=>{
 const a=q('granary-account-balance','80 15 25',['40 საზომი','65 საზომი','55 საზომი','120 საზომი']);assert.doesNotThrow(()=>check(a));
 assert.throws(()=>check({...a,options:['40 საზომი','040 საზომი','55 საზომი','120 საზომი']}));
 assert.throws(()=>check({...a,text:'20 15 25'}));
});
test('metrology converts direction correctly',()=>{
 const a=q('trade-measure-conversion','3 12',['36 საზომი','4 საზომი','15 საზომი','9 საზომი']);assert.doesNotThrow(()=>check(a));assert.throws(()=>check({...a,correct:1}));
});
test('regnal synchronism preserves elapsed years, not inclusive counts',()=>{
 const a=q('regnal-synchronism','8 3 12',['7-ე წელს','4-ე წელს','9-ე წელს','15-ე წელს']);assert.doesNotThrow(()=>check(a));assert.throws(()=>check({...a,text:'8 3 8'}));
});
test('group majority is not the sum of voters in unequal groups',()=>{
 const text='თითო ჯგუფს ერთი ხმა აქვს; ჯგუფების უმრავლესობა. ჯგუფი A: 4 წევრი, ყველა მომხრეა; ჯგუფი B: 6 წევრი, ყველა მომხრეა; ჯგუფი C: 20 წევრი, ყველა წინააღმდეგია';
 const a=q('voting-group-versus-person',text,['მიიღება: მომხრეა 2 ჯგუფი, მოწინააღმდეგე — 1','არა','ფრე','უცნობია']);assert.doesNotThrow(()=>check(a));
 for(const c of [{correct:1},{text:text.replace('20 წევრი','2 წევრი')},{text:text.replace('6 წევრი, ყველა მომხრეა','6 წევრი, ყველა წინააღმდეგია')},{text:text.replace('ჯგუფი C','ჯგუფი B')}])assert.throws(()=>check({...a,...c}));
 assert.throws(()=>check(q('aqueduct-gradient','120 100 10',['2','20','10','12'])),/Unreviewed/);
});
test('latest coin provides lower bound, not exact deposit date',()=>{
 const a=q('coin-deposit-lower-bound','590 610 630',['630 წელს ან შემდეგ','ზუსტად 630 წელს','610 წელს ან მანამდე','590 წელს ან მანამდე']);assert.doesNotThrow(()=>check(a));assert.throws(()=>check({...a,correct:1}));assert.throws(()=>check({...a,text:'590 610 1630'}));
});
test('history10 review gate rejects unreviewed scope, fabricated provenance and ambiguous options',()=>{
 const a={...q('intrusive-pit-context','პირობითი არქეოლოგიური დავალება.',['A','B','C','D'],'The identified context supports this conclusion.'),id:'fixture',grade:10,semester:1,subject:'ისტორია',topic:'არქეოლოგია',prerequisiteMinGrade:10,review:'assistant_content_reviewed',curriculumTheme:'პრეისტორია და ძველი აღმოსავლეთი',evidenceKind:'explicit_teaching_scenario',optionReview:['The identified context supports this conclusion.','This distractor ignores the later intrusion.','This option confuses depth with relative age.','This conclusion omits the excavation context.']};
 assert.equal(batch([a])[0].check,'assistant_option_by_option_review_only');
 for(const c of [{grade:9},{semester:2},{family:'unreviewed'},{curriculumTheme:'Modern history'},{correct:1},{options:['A','A','C','D']},{options:['A','','C','D']},{evidenceKind:'sourced_paraphrase'},{text:'Invented genuine ancient quotation'}])assert.throws(()=>batch([{...a,...c}]));
 assert.throws(()=>batch([a,{...a,id:'second',text:'პირობითი სხვა დავალება.'}]));
});
