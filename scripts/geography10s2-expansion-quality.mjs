import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';

// Closed IDs reviewed together with their options; no keyword-driven retagging.
const families={globalization:[171,181,201,211],corridor:[173,193,203,213],growth:[174,184,194,214],transit:[176,186,206,216],tourism:[177,187,197,217],exportRisk:[178,198,208,218],perCapita:[179,189,209,219],sustainability:[182,192,202],datedComparison:[185,195,205,190,200,210]};
export const geography10s2Regroup=Object.freeze(Object.fromEntries([
 ...Object.entries(families).flatMap(([family,ids])=>ids.map(n=>[`v28-GE-G10-SO-S2-${n}`,`geo10s2-reviewed:${family}`])),
 ['v28f-10-2-გეოგრაფია-01','geo10s2-reviewed:mapScale'],['qe4-10-2-geo-map-scale-distance','geo10s2-reviewed:mapScale'],
]));
export const geography10s2Hold=Object.freeze([36,66,96].map(n=>`v28-GE2-G10-SO-S2-${String(n).padStart(3,'0')}`));
export const geography10s2AmbiguousId='v28-GE-G10-SO-S2-185';
export function repairGeography10s2Rows(rows){
 const byId=new Map(rows.map(q=>[q.id,q]));
 for(const id of [...Object.keys(geography10s2Regroup),...geography10s2Hold]){const q=byId.get(id);assert.ok(q,`Missing reviewed ID ${id}`);assert.equal(q.grade,10);assert.equal(q.semester,2);assert.equal(q.subject,'გეოგრაფია');}
 return rows.map(old=>{
  let q={...old};
  if(Object.hasOwn(geography10s2Regroup,q.id))q.semantic_group_id=geography10s2Regroup[q.id];
  if(geography10s2Hold.includes(q.id))q.active=0;
  if(q.id===geography10s2AmbiguousId){
   const p=JSON.parse(q.public_payload_json),key=JSON.parse(q.answer_key_json);
   assert.equal(key.correct,2);
   const replacement='რადგან ერთსა და იმავე წელს სხვადასხვა რეგიონის ინფლაცია აუცილებლად თანაბარია';
   assert.ok(['ეკონომიკური და დემოგრაფიული მაჩვენებლები დროთა განმავლობაში იცვლება',replacement].includes(p.opts[1]),'Reviewed option drift');
   p.opts[1]=replacement;q.public_payload_json=JSON.stringify(p);
   q.content_hash=createHash('sha256').update(JSON.stringify([p,key,q.explanation])).digest('hex');
  }
  return q;
 });
}

export const geography10s2Families=Object.freeze(['freight-work','seasonal-pressure','renewable-share','irrigation-efficiency','route-budget','weighted-access','network-detour','local-retention','waste-capacity','trade-balance']);
const value=(text,label)=>{const m=text.match(new RegExp(label+'\\s*=\\s*(\\d+)','u'));assert.ok(m,`Missing ${label}`);return Number(m[1]);};
export function verifyGeography10s2Evidence(q){
 assert.ok(geography10s2Families.includes(q.family),'Unreviewed family');
 const v=label=>value(q.text,label);let expected;
 switch(q.family){
  case 'freight-work':expected=`${v('A-ის ტონა')*v('A-ის მანძილი')+v('B-ის ტონა')*v('B-ის მანძილი')} ტონა-კმ`;break;
  case 'seasonal-pressure':assert.match(q.text,/პიკური თვე/);expected=`${v('პიკური თვის სტუმრები')/v('წლიური სტუმრები')*100}%`;break;
  case 'renewable-share':expected=`${(v('ჰიდროენერგია')+v('ქარის ენერგია'))/(v('ჰიდროენერგია')+v('ქარის ენერგია')+v('გაზის ენერგია'))*100}%`;break;
  case 'irrigation-efficiency':assert.match(q.text,/იმავე ფართობს/);expected=`${v('საჭირო წყალი')/(v('ძველი ეფექტიანობა')/100)-v('საჭირო წყალი')/(v('ახალი ეფექტიანობა')/100)} მ³`;break;
  case 'route-budget':{
   const routes=['A','B','C'].map(k=>({k,h:v(k+'-ის საათი'),cost:v(k+'-ის ფასი')})).filter(x=>x.h<=v('დროის ზღვარი')).sort((a,b)=>a.cost-b.cost);
   assert.ok(routes.length>0);assert.ok(routes.length===1||routes[0].cost!==routes[1].cost);expected=`მარშრუტი ${routes[0].k}`;break;
  }
  case 'weighted-access':expected=`${(v('A-ის მცხოვრები')*v('A-ის წუთი')+v('B-ის მცხოვრები')*v('B-ის წუთი'))/(v('A-ის მცხოვრები')+v('B-ის მცხოვრები'))} წუთი`;break;
  case 'network-detour':assert.match(q.text,/AC გზა დაკეტილია/);assert.match(q.text,/სხვა გზა არ არსებობს/);expected=`${v('AB გზა')+v('BC გზა')-v('AC გზა')} კმ`;break;
  case 'local-retention':assert.match(q.text,/ერთმანეთს არ ფარავს/);expected=`${v('ტურისტთა ხარჯი')-v('იმპორტის გადახდა')-v('გარე საკომისიო')} ლარი`;break;
  case 'waste-capacity':assert.match(q.text,/წლიური მოცულობა უცვლელია/);expected=`${v('თავისუფალი ტევადობა')/(v('ძველი წლიური მოცულობა')*(1-v('შემცირება')/100))-v('თავისუფალი ტევადობა')/v('ძველი წლიური მოცულობა')} წელი`;break;
  case 'trade-balance':assert.match(q.text,/ერთი და იმავე წლის/);expected=`${v('იმპორტი')-v('ექსპორტი')} მილიონი ლარის დეფიციტი`;assert.ok(v('იმპორტი')>v('ექსპორტი'));break;
 }
 assert.ok(expected&&!expected.includes('NaN')&&!expected.includes('Infinity'));
 const normalized=q.options.map(x=>normalizedPrompt(x).replace(/\d+(?:[.,]\d+)?/gu,n=>String(Number(n.replace(',','.')))));
 assert.equal(new Set(normalized).size,4,'Equivalent options');
 assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one computed answer');assert.equal(q.options[q.correct],expected,'Prompt/key mismatch');
 assert.ok(q.explanation.includes(expected),'Explanation/result mismatch');
 return 'prompt_evidence_recomputation';
}
export function validateGeography10s2Batch(questions){
 for(const field of ['id','family'])assert.equal(new Set(questions.map(q=>q[field])).size,questions.length,`Duplicate ${field}`);
 return questions.map(q=>{validateExpansionQuestion(q);assert.equal(q.grade,10);assert.equal(q.semester,2);assert.equal(q.subject,'გეოგრაფია');assert.equal(q.evidenceKind,'explicit_teaching_scenario');assert.match(q.text,/პირობით/);assert.ok(q.curriculumTheme);assert.equal(q.optionReview.length,4);assert.ok(q.optionReview.every(x=>x.length>=30));assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);assert.equal(q.explanation,q.optionReview[q.correct]);return {id:q.id,check:verifyGeography10s2Evidence(q)};});
}
