import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';

// Closed, manually reviewed IDs: never infer a family from a topic keyword.
const suffixes={climate:[51,61,81,91],pyramid:[53,73,83,93],urbanLoad:[54,64,74,94],adaptation:[56,66,86,96],visualization:[57,67,77,97],gis:[58,78,88,98],migration:[59,69,89,99],scale:[62,72,82],renewable:[65,75,85],research:[70,80,90]};
export const geography10Regroup=Object.freeze(Object.fromEntries([
 ...Object.entries(suffixes).flatMap(([family,ids])=>ids.map(n=>[`v28-GE-G10-SO-S1-${String(n).padStart(3,'0')}`,`geo10-reviewed:${family}`])),
 ['v28f-10-1-გეოგრაფია-01','geo10-reviewed:scale'],['v28f-10-1-გეოგრაფია-09','geo10-reviewed:gis'],
]));
export const geography10Hold=Object.freeze(['v28-GE2-G10-SO-S1-053','v28-GE2-G10-SO-S1-083']);
export function repairGeography10Rows(rows){
 const byId=new Map(rows.map(q=>[q.id,q]));
 for(const id of [...Object.keys(geography10Regroup),...geography10Hold]){
  const q=byId.get(id);assert.ok(q,`Missing reviewed repair ID ${id}`);
  assert.equal(q.grade,10);assert.equal(q.semester,1);assert.equal(q.subject,'გეოგრაფია');
 }
 return rows.map(q=>Object.hasOwn(geography10Regroup,q.id)?{...q,semantic_group_id:geography10Regroup[q.id]}:geography10Hold.includes(q.id)?{...q,active:0}:q);
}

export const geography10Families=Object.freeze(['migration-residual','birth-rate-comparison','pooled-density','age-dependency','urban-reclassification','land-use-transition','cohort-aging','service-overlap','stratified-settlements']);
export function geography10Fingerprint(q){
 return createHash('sha256').update(JSON.stringify({text:q.text,options:q.options.map((text,i)=>({text,review:q.optionReview[i],correct:i===q.correct})).sort((a,b)=>a.text.localeCompare(b.text,'en')),explanation:q.explanation,evidenceKind:q.evidenceKind,sourceUrl:q.sourceUrl||null})).digest('hex');
}
// Added after option-by-option review. Fingerprints detect drift, not truth.
export const geography10EditorialDigests=Object.freeze({'urban-reclassification':'28117720a9cec9f55f769e983a7900d22c507c90082e9afbec070ed4f5a5627c'});
const number=(text,label)=>{const m=text.match(new RegExp(label+'\\s*=\\s*(\\d+)','u'));assert.ok(m,`Missing ${label}`);return Number(m[1]);};
export function verifyGeography10Evidence(q){
 assert.ok(geography10Families.includes(q.family),'Unreviewed geography family');
 const comparable=q.options.map(x=>normalizedPrompt(x).replace(/\d+(?:[.,]\d+)?/gu,n=>String(Number(n.replace(',','.')))));
 assert.equal(new Set(comparable).size,4,'Equivalent numeric options');
 if(Object.hasOwn(geography10EditorialDigests,q.family)){
  assert.equal(geography10Fingerprint(q),geography10EditorialDigests[q.family],'Editorial content drift');
  return 'assistant_option_by_option_review_pinned';
 }
 const v=label=>number(q.text,label);let expected;
 switch(q.family){
  case 'migration-residual':
   assert.match(q.text,/საზღვრები უცვლელია/);assert.match(q.text,/სხვა შესწორება არ ყოფილა/);
   expected=String(v('საბოლოო მოსახლეობა')-v('საწყისი მოსახლეობა')-v('დაბადება')+v('გარდაცვალება'))+' ადამიანი';break;
  case 'birth-rate-comparison':{
   const a=v('A-ის დაბადება')/v('A-ის საშუალო მოსახლეობა')*1000,b=v('B-ის დაბადება')/v('B-ის საშუალო მოსახლეობა')*1000;
   assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&a!==b);expected=`${a>b?'A':'B'} — ${Math.max(a,b)} დაბადება ყოველ 1000 მცხოვრებზე`;break;
  }
  case 'pooled-density':
   assert.match(q.text,/ტერიტორიები არ იკვეთება/);
   expected=String((v('A-ის მოსახლეობა')+v('B-ის მოსახლეობა'))/(v('A-ის ფართობი')+v('B-ის ფართობი')))+' ადამიანი/კმ²';break;
  case 'age-dependency':
   assert.match(q.text,/0–14/);assert.match(q.text,/15–64/);assert.match(q.text,/65/);
   expected=String((v('ბავშვები')+v('ხანდაზმულები'))/v('შუა ასაკობრივი ჯგუფი')*100)+' ყოველ 100-ზე';break;
  case 'land-use-transition':
   assert.match(q.text,/სხვა ცვლილება არ ყოფილა/);assert.match(q.text,/პარკი განაშენიანებულ კატეგორიაში არ შედის/);
   expected=String(v('სახნავიდან განაშენიანებულად')+v('ტყიდან განაშენიანებულად')-v('განაშენიანებულიდან პარკად'))+' ჰა';break;
  case 'cohort-aging':{
   assert.match(q.text,/არავინ გარდაცვლილა და მიგრაცია არ ყოფილა/);
   expected=`${v('ქვედა ასაკი')+v('გასული დრო')}–${v('ზედა ასაკი')+v('გასული დრო')} წელი`;break;
  }
  case 'service-overlap':
   assert.match(q.text,/სხვა მომსახურების ზონა არ არსებობს/);
   assert.ok(v('გადაკვეთა')<=Math.min(v('A-ის ზონა'),v('B-ის ზონა')));
   expected=String(v('სულ მოსახლეობა')-v('A-ის ზონა')-v('B-ის ზონა')+v('გადაკვეთა'))+' ადამიანი';break;
  case 'stratified-settlements':{
   const total=v('A-ის მცხოვრები')+v('B-ის მცხოვრები')+v('C-ის მცხოვრები'),n=v('ნიმუშის ზომა');
   const counts=['A','B','C'].map(k=>v(k+'-ის მცხოვრები')/total*n);assert.ok(counts.every(Number.isInteger));
   expected=`A — ${counts[0]}, B — ${counts[1]}, C — ${counts[2]}`;break;
  }
  default:throw Error('Editorial review digest missing');
 }
 assert.equal(q.options.filter(x=>x===expected).length,1,'Exactly one recomputed answer');
 assert.equal(q.options[q.correct],expected,'Prompt/key mismatch');
 assert.ok(q.explanation.includes(expected),'Explanation/result mismatch');
 return 'prompt_evidence_recomputation';
}
export function validateGeography10Batch(questions){
 for(const field of ['id','family'])assert.equal(new Set(questions.map(q=>q[field])).size,questions.length,`Duplicate ${field}`);
 return questions.map(q=>{
  validateExpansionQuestion(q);assert.equal(q.grade,10);assert.equal(q.subject,'გეოგრაფია');assert.equal(q.semester,1);
  assert.ok(q.curriculumTheme);assert.equal(q.evidenceKind,'explicit_teaching_scenario');
  assert.match(q.text,/პირობით/);
  assert.equal(q.optionReview.length,4);assert.ok(q.optionReview.every(x=>x.length>=30));
  assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);assert.equal(q.explanation,q.optionReview[q.correct]);
  return {id:q.id,check:verifyGeography10Evidence(q)};
 });
}
