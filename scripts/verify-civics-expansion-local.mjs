import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateCivicsBatch} from './civics-expansion-quality.mjs';
const root='.openai/bank-expansion-20261007';
const name=process.argv.includes('--grade9')?'civics9':'civics',date=name==='civics9'?'2026-10-09':'2026-10-08';
const report=JSON.parse(fs.readFileSync(`reports/${name}-expansion-${date}.json`));
const review=JSON.parse(fs.readFileSync(root+`/${name}-reviewed.json`));
const draft=fs.readFileSync(root+`/${name}-questions.json`);
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(hash(draft),report.privateDraftSha256,'Draft changed after review');
assert.equal(hash(fs.readFileSync(root+`/${name}-patch.sql`)),report.patchSha256,'Patch changed after review');
assert.deepEqual(review.questions,JSON.parse(draft));
assert.deepEqual(validateCivicsBatch(review.questions),review.checks);
assert.equal(review.records.length,report.added);
for(const q of review.questions){
 const r=review.records.find(r=>r.row.id===q.id);assert.ok(r);
 const p=JSON.parse(r.row.public_payload_json);
 assert.equal(p.text,q.text);assert.deepEqual(p.opts,q.options);assert.deepEqual(r.key,{correct:q.correct});
 assert.equal(r.explanation,q.explanation);assert.equal(p.grade,q.grade);assert.equal(p.semester,q.semester);
 assert.equal(r.row.content_hash,hash(JSON.stringify([p,r.key,r.explanation])));
 assert.ok(!['correct','answer','answerKey','explanation','optionReview','model'].some(k=>k in p));
}
assert.deepEqual(report.failures,[]);assert.deepEqual(report.unresolvedSimilarityCandidates,[]);
console.log(JSON.stringify({ok:true,privateOutputsChecked:review.records.length,serverOnlyKeys:true,simulatedPapers:report.simulatedPapers}));
