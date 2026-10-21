import assert from 'node:assert/strict';
const recomputations=new Set([
 'prompt_evidence_recomputation','prompt_number_recomputation','lifetime_cost_recomputation',
 'subscription_cost_recomputation','margin_recomputation','plurality_recomputation','quorum_recomputation',
 'coalition_recomputation','conjunctive_rule_recomputation','boundary_recomputation',
 'per_person_recomputation','constraint_recomputation','score_recomputation','rate_recomputation',
]);
const editorial=new Set(['assistant_option_by_option_review_only','assistant_option_by_option_review_pinned']);
export function summarizeExpansionEvidence(checks){
 let computationalEvidenceChecks=0,assistantJudgementOnly=0;
 for(const {check}of checks){
  if(recomputations.has(check))computationalEvidenceChecks++;
  else {assert.ok(editorial.has(check),`Unclassified evidence check: ${check}`);assistantJudgementOnly++;}
 }
 return {computationalEvidenceChecks,assistantJudgementOnly};
}
