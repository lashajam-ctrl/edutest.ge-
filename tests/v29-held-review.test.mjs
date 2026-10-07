import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import index from '../data/v29-held-review-index.json' with {type:'json'};
import {heldReviewForId,applyHeldReview} from '../data/bank-quality-corrections-v29-held.mjs';
test('496 reviewed IDs are immutable and unique without publishing answer keys',()=>{
 assert.equal(index.ids.length,496);assert.equal(new Set(index.ids).size,496);
 assert.equal(createHash('sha256').update(index.ids.join('\n')).digest('hex'),index.manifestHash);
 assert.deepEqual(Object.keys(index).sort(),['ids','manifestHash']);
});
test('stable reviewed IDs are recognized after an import version-prefix change',()=>{
 assert.equal(heldReviewForId(index.ids[0]).id,index.ids[0]);
 assert.equal(heldReviewForId(index.ids[0].replace(/^v28-/,'v30-')).id,index.ids[0]);
 assert.equal(heldReviewForId('v28-unreviewed-question'),null);
});
test('unreviewed rows are not promoted and reviewed rows cannot bypass private source checks',()=>{
 assert.equal(applyHeldReview({id:'v28-unreviewed-question'}),null);
 assert.throws(()=>applyHeldReview({id:index.ids[0],public_payload_json:'{}',answer_key_json:'{}',explanation:'altered'}),/review required|artifact is required/);
});
test('answer-bearing review artifacts are excluded from public repository publication',()=>{
 const ignore=fs.readFileSync('.gitignore','utf8');
 for(const file of ['/data/v29-held-reviewed.json','/scripts/v29-held-curation.mjs','/.openai/v29-'])assert.ok(ignore.includes(file),file);
});
