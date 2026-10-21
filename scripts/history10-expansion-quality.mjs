import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';
// Closed, reviewed family/semester allocation. This is editorial placement,
// not an assertion that the ministry mandates a semester calendar.
export const history10Families={
 'intrusive-pit-context':1,'dating-range-overlap':1,'seed-selection-evidence':1,
 'granary-account-balance':1,'recovery-method-bias':1,'cylinder-seal-identification':1,
 'debt-pledge-versus-sale':1,'trade-measure-conversion':1,'regnal-synchronism':1,'rosetta-language-script':1,
 'ostracism-political-exclusion':2,'citizenship-not-ethnicity':2,'voting-group-versus-person':2,
 'byzantine-self-designation':2,'codification-conflicting-rules':2,'palimpsest-text-layers':2,
 'coin-deposit-lower-bound':2,'relay-trade-network':2,'iconoclasm-object-versus-policy':2,'charter-moving-river':2,
 'co-regency-overlap':1,'tribute-versus-gift':1,'canal-negligence-condition':1,'ration-labor-days':1,
 'calendar-no-year-zero':2,'religious-toleration-scope':2,'imperial-title-not-unification':2,'oath-versus-property-grant':2,
 'amarna-diplomatic-language':1,'law-prescription-versus-practice':1,'bronze-limiting-supply':1,'sealed-envelope-not-truth':1,
 'boule-proposal-versus-approval':2,'tribune-veto-not-substitution':2,'carolingian-art-synthesis':2,'copyist-eye-skip-hypothesis':2,
};
// These digests pin the option-by-option editorial review, including source,
// explanation and the selected answer. They detect drift, not historical truth.
export const history10EditorialDigests=Object.freeze({
 'amarna-diplomatic-language':'af22ee3b22781c1b22e6b2642779afe01b198b2d221b62c5864ad7aa2a738df3',
 'law-prescription-versus-practice':'b397af9ed0ff16a73c9490964ca90b032baf540d6cf61df27393d80b3b10700f',
 'sealed-envelope-not-truth':'25b320f67b065fb90853bce9cdbabd277daa6036ccb0f49081c052619e8aa7ea',
 'boule-proposal-versus-approval':'7803f9a8dff6e89e55ad5d318c87f8674f5b29ef51a56132ea1a3b4402194bbe',
 'tribune-veto-not-substitution':'43728c297297538bb70d14a6c567c616f6b7e466d5e9b83339f8502e9cd51f32',
 'carolingian-art-synthesis':'d9b9b59a6d72c8be09b0838bb553d5eebea589699469917ae8266babe98ecf00',
 'copyist-eye-skip-hypothesis':'e20bba25c153c14668945a7e20b46766007f0fd6ad11382fb253bf351f2363a2',
});
export function history10EditorialFingerprint(q){
 const reviewed={text:q.text,options:q.options.map((text,i)=>({text,review:q.optionReview[i],correct:i===q.correct})).sort((a,b)=>a.text.localeCompare(b.text,'en')),explanation:q.explanation,evidenceKind:q.evidenceKind,sourceUrl:q.sourceUrl||null};
 return createHash('sha256').update(JSON.stringify(reviewed)).digest('hex');
}
export function verifyHistory10Evidence(q){
 if(Object.hasOwn(history10EditorialDigests,q.family)){
  assert.equal(history10EditorialFingerprint(q),history10EditorialDigests[q.family],'Editorial content changed: review the prompt, all options and provenance again');
  return 'assistant_option_by_option_review_pinned';
 }
 const n=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));let expected,parse;
 switch(q.family){
  case 'bronze-limiting-supply':{
   assert.equal(n.length,4);assert.ok(n.every(x=>Number.isInteger(x)&&x>0));
   assert.match(q.text,/ნედლეულის დამატება და ძველი ნივთების გადადნობა გამორიცხულია/);
   assert.match(q.text,/დანაკარგი არ არის და შემადგენლობა უცვლელია/);
   const [copperPerBatch,tinPerBatch,copper,tin]=n;
   const copperBatches=Math.floor(copper/copperPerBatch),tinBatches=Math.floor(tin/tinPerBatch);
   assert.ok(tinBatches<copperBatches,'This reviewed explanation requires tin to be the limiting input');
   expected=tinBatches;parse=x=>unit(x,'პარტია');
   assert.ok(q.explanation.includes('კალას მარაგი ზღუდავს'));break;
  }
  case 'co-regency-overlap':{
   assert.equal(n.length,3);const [a,b,overlap]=n;assert.ok(overlap>0&&overlap<Math.min(a,b));
   assert.match(q.text,/ჯერ A გამეფდა/);assert.match(q.text,/A-ს შემდეგაც განაგრძო მართვა/);assert.match(q.text,/წყვეტა არ ყოფილა/);
   expected=a+b-overlap;parse=x=>unit(x,'წელი');break;
  }
  case 'ration-labor-days':{
   assert.equal(n.length,3);const [rate,a,b]=n;assert.ok(n.every(x=>Number.isInteger(x)&&x>0));
   assert.match(q.text,/თითო ნამუშევარ დღეზე/);assert.match(q.text,/სხვა დანამატი არ არსებობს/);
   expected=`A — ${rate*a} საზომი; B — ${rate*b} საზომი`;
   parse=x=>{const m=x.match(/^A — (\d+) საზომი; B — (\d+) საზომი$/u);assert.ok(m);return `A — ${Number(m[1])} საზომი; B — ${Number(m[2])} საზომი`;};break;
  }
  case 'calendar-no-year-zero':{
   assert.equal(n.length,2);assert.ok(n.every(x=>Number.isInteger(x)&&x>0));
   assert.match(q.text,/ძვ\. წ\. \d+ წლის დასაწყისში და ახ\. წ\. \d+ წლის დასაწყისში/);
   assert.match(q.text,/ნულოვანი წელი არ არის/);expected=n[0]+n[1]-1;parse=x=>unit(x,'წელი');break;
  }
  case 'dating-range-overlap':{
   assert.equal(n.length,4);const [a,b,c,d]=n;assert.ok(a>b&&c>d);
   const early=Math.min(a,c),late=Math.max(b,d);assert.ok(early>late,'Ranges must genuinely overlap');
   expected=`ძვ. წ. ${early}–${late} წლებში`;
   parse=x=>{const m=x.match(/^ძვ\. წ\. (\d+)–(\d+) წლებში$/u);assert.ok(m,'Invalid date-range option');return `ძვ. წ. ${Number(m[1])}–${Number(m[2])} წლებში`;};break;
  }
  case 'granary-account-balance':assert.equal(n.length,3);assert.ok(n.every(x=>x>=0)&&n[0]>=n[1]+n[2]);expected=n[0]-n[1]-n[2];parse=x=>unit(x,'საზომი');break;
  case 'trade-measure-conversion':assert.equal(n.length,2);assert.ok(n.every(x=>x>0));expected=n[0]*n[1];parse=x=>unit(x,'საზომი');break;
  case 'regnal-synchronism':assert.equal(n.length,3);assert.ok(n[0]>0&&n[1]>0&&n[2]>n[0]);expected=n[1]+n[2]-n[0];parse=x=>{const m=x.match(/^(\d+)-ე წელს$/u);assert.ok(m);return Number(m[1]);};break;
  case 'voting-group-versus-person':{
   const groups=[...q.text.matchAll(/ჯგუფი ([ABC]): (\d+) წევრი, ყველა (მომხრეა|წინააღმდეგია)/gu)];
   assert.equal(groups.length,3);assert.equal(new Set(groups.map(x=>x[1])).size,3);
   assert.ok(groups.every(x=>Number(x[2])>0));
   assert.match(q.text,/თითო ჯგუფს ერთი ხმა აქვს/);assert.match(q.text,/ჯგუფების უმრავლესობა/);
   const yes=groups.filter(x=>x[3]==='მომხრეა');const no=groups.length-yes.length;
   assert.ok(yes.length>no,'Teaching example must have a group majority in favour');
   assert.ok(yes.reduce((s,x)=>s+Number(x[2]),0)<groups.filter(x=>x[3]==='წინააღმდეგია').reduce((s,x)=>s+Number(x[2]),0),'Example must distinguish group from individual majority');
   expected=`მიიღება: მომხრეა ${yes.length} ჯგუფი, მოწინააღმდეგე — ${no}`;parse=x=>x;break;
  }
  case 'coin-deposit-lower-bound':assert.equal(n.length,3);assert.ok(n.every(x=>x>0&&x<=1014));expected=`${Math.max(...n)} წელს ან შემდეგ`;parse=x=>x.replace(/^0+(\d)/u,'$1');break;
  default:assert.ok(Object.hasOwn(history10Families,q.family),'Unreviewed history family');return 'assistant_option_by_option_review_only';
 }
 const values=q.options.map(parse);
 assert.equal(new Set(values).size,4,'Equivalent answer options');
 assert.equal(values.filter(x=>x===expected).length,1,'Exactly one independently computed answer');
 assert.equal(values[q.correct],expected,'Prompt and answer key disagree');
 assert.ok(q.explanation.includes(String(expected)),'Explanation omits computed answer');
 return 'prompt_evidence_recomputation';
}
function unit(x,suffix){const m=x.match(new RegExp(`^(\\d+(?:\\.\\d+)?) ${suffix}$`,'u'));assert.ok(m,'Malformed quantity option');return Number(m[1]);}
export function validateHistory10Batch(questions){
 for(const key of ['id','family'])assert.equal(new Set(questions.map(q=>q[key])).size,questions.length,`Repeated ${key}`);
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Repeated prompt');
 return questions.map(q=>{
  validateExpansionQuestion(q);assert.equal(q.grade,10);assert.equal(q.subject,'ისტორია');
  assert.equal(q.prerequisiteMinGrade,10);assert.equal(q.semester,history10Families[q.family],'Unreviewed scope');
  assert.equal(q.curriculumTheme,q.semester===1?'პრეისტორია და ძველი აღმოსავლეთი':'ანტიკური ხანა და ადრეული შუა საუკუნეები (1014 წლამდე)');
  assert.equal(q.optionReview?.length,4);assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));
  assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);assert.equal(q.explanation,q.optionReview[q.correct]);
  assert.ok(['sourced_paraphrase','explicit_teaching_scenario'].includes(q.evidenceKind));
  if(q.evidenceKind==='sourced_paraphrase')assert.match(q.sourceUrl??'',/^https:\/\//);
  else assert.match(q.text,/პირობით/);
  return {id:q.id,check:verifyHistory10Evidence(q)};
 });
}
