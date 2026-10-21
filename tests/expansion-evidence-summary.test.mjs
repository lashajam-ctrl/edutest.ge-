import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeExpansionEvidence as summarize} from '../scripts/expansion-evidence-summary.mjs';
test('editorial fingerprint locks are not counted as independent answer recomputation',()=>{
 assert.deepEqual(summarize([{check:'prompt_evidence_recomputation'},{check:'assistant_option_by_option_review_only'},{check:'assistant_option_by_option_review_pinned'}]),{computationalEvidenceChecks:1,assistantJudgementOnly:2});
 assert.deepEqual(summarize([]),{computationalEvidenceChecks:0,assistantJudgementOnly:0});
 for(const check of ['hash_match','unknown_recomputation',undefined])assert.throws(()=>summarize([{check}]),/Unclassified/);
});
