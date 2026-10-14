import assert from 'node:assert/strict';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';
const normalize=x=>String(x).normalize('NFKC');
const reviewed=new Set(['sulfur-removal-scope','dry-combustion-water-evidence','separation-versus-conversion']);
export function verifyChemistry9Evidence(q){
 const n=[...q.text.matchAll(/\d+/gu)].map(x=>Number(x[0]));let valid;
 if(q.family==='distillation-column-position'){
  assert.equal(n.length,3);assert.equal(new Set(n).size,3,'Tied boiling temperatures');
  const expected=['A','B','C'][n.indexOf(Math.min(...n))];valid=x=>x===expected;
 }else if(q.family==='cracking-formula-completion'){
  const formulas=[...normalize(q.text).matchAll(/C(\d+)H(\d+)/g)].map(m=>[+m[1],+m[2]]);
  assert.equal(formulas.length,2);const [a,b]=formulas,c=a[0]-b[0],h=a[1]-b[1];assert.ok(c>0&&h>0);
  valid=x=>normalize(x)===`C${c}H${h}`;
 }else if(q.family==='methane-particle-limitation'){
  assert.equal(n.length,3);const [methane,oxygen,ratio]=n;assert.equal(ratio,2,'Methane complete-combustion oxygen ratio');
  assert.ok(methane>0&&oxygen>0&&oxygen%ratio===0&&methane>oxygen/ratio);
  valid=x=>x===`მეთანის ${methane-oxygen/ratio} მოლეკულა`;
 }else if(q.family==='fuel-energy-per-mass'){
  assert.equal(n.length,4);assert.ok(n.every(x=>x>0));const a=n[1]/n[0],b=n[3]/n[2];assert.notEqual(a,b,'Equal energy per mass');valid=x=>x===(a>b?'A':'B');
 }else if(q.family==='polymer-carbon-inventory'){
  assert.equal(n.length,1);assert.ok(n[0]>0);const f=normalize(q.text).match(/C(\d+)H(\d+)/);assert.ok(f);assert.equal(f[1],'2');assert.equal(f[2],'4');valid=x=>normalize(x)===String(n[0]*Number(f[1]));
 }else if(q.family==='precipitation-ion-pair'){
  // Curated dissociation table for the five stated soluble salts, not a general solubility engine.
  const ions={AgNO3:['Ag','NO3'],NaCl:['Na','Cl'],KNO3:['K','NO3'],NaNO3:['Na','NO3'],KCl:['K','Cl']};
  assert.ok(q.text.includes('AgCl')&&q.text.includes('უხსნადია'));
  valid=x=>{const salts=normalize(x).split(/\s*\+\s*/);assert.equal(salts.length,2);const present=salts.flatMap(s=>{assert.ok(ions[s],'Unknown salt requires source review');return ions[s];});return present.includes('Ag')&&present.includes('Cl');};
 }else if(q.family==='polyatomic-charge-balance'){
  assert.deepEqual(n,[2,3]);
  valid=x=>{const m=normalize(x).match(/^Ca(\d*)(?:\(PO4\)(\d*)|PO4)$/);assert.ok(m,'Unsupported calcium phosphate option');const c=Number(m[1]||1),p=Number(m[2]||1);return c*2===p*3&&c===3&&p===2;};
 }else {assert.ok(reviewed.has(q.family),'Unknown family requires semantic review');return 'assistant_option_by_option_review_only';}
 const matches=q.options.map(valid);assert.equal(matches.filter(Boolean).length,1,'Exactly one chemically valid answer required');assert.ok(matches[q.correct],'Chemistry prompt/key mismatch');
 return 'prompt_evidence_recomputation';
}
export function validateChemistry9Batch(questions){
 assert.ok(questions.length>0);
 for(const field of ['id','family'])assert.equal(new Set(questions.map(q=>q[field])).size,questions.length,`Repeated ${field}`);
 assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length,'Repeated prompt');
 return questions.map(q=>{
  validateExpansionQuestion(q);assert.equal(q.subject,'ქიმია');assert.equal(q.grade,9);assert.equal(q.semester,2);assert.equal(q.prerequisiteMinGrade,9);
  assert.ok(['ნავთობი და მისი პროდუქტები; ბუნებრივი აირი','ნივთიერებათა მრავალფეროვნება'].includes(q.curriculumTheme));
  assert.equal(q.optionReview?.length,4);assert.ok(q.optionReview.every(x=>typeof x==='string'&&x.trim().length>=25));assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);
  assert.equal(q.explanation,q.optionReview[q.correct]);
  assert.match(q.sourceUrl??'',/^https:\/\/(?:openstax\.org\/books\/chemistry-2e\/pages\/|www\.eia\.gov\/energyexplained\/)/);
  return {id:q.id,check:verifyChemistry9Evidence(q)};
 });
}
