import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planQualityHold} from './bank-quality-hold.mjs';
import {validateExpansionQuestion,normalizedPrompt} from './bank-expansion-quality.mjs';

export const contentDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateHistory10Review(rows, decisions) {
  assert.equal(new Set(rows.map(q=>q.id)).size,rows.length,'Duplicate source IDs');
  assert.equal(new Set(decisions.map(q=>q.id)).size,decisions.length,'Duplicate decisions');
  assert.equal(decisions.length,rows.length,'Every in-scope row needs a decision');
  const byId=new Map(rows.map(q=>[q.id,q]));
  for(const d of decisions){
    const q=byId.get(d.id);assert.ok(q,'Unknown reviewed ID');
    assert.equal(q.grade,10);assert.equal(q.subject,'ისტორია');assert.ok([1,2].includes(q.semester));
    assert.equal(q.active,1,'Review input must be the active baseline');
    assert.equal(d.content_hash,q.content_hash,'Reviewed content drift');
    assert.equal(d.semester,q.semester,'Semester drift');
    assert.ok(['keep','period_mismatch','duplicate_task','ambiguous_answer','subject_mismatch'].includes(d.decision));
    assert.ok(d.reason?.trim().length>10,'Decision requires a substantive reason');
  }
  return [1,2].flatMap(semester=>planQualityHold(rows,
    decisions.filter(d=>d.semester===semester&&d.decision!=='keep').map(d=>({...d,reason:`${d.decision}: ${d.reason}`})),
    {grade:10,semester,subject:'ისტორია'}));
}

// These checks protect an option-by-option editorial review. They do not claim
// to prove historical interpretation or curriculum alignment computationally.
export function validateHistory10RepairAdditions(questions, approvals){
  assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
  assert.equal(new Set(questions.map(q=>q.family)).size,questions.length);
  assert.equal(new Set(questions.map(q=>normalizedPrompt(q.text))).size,questions.length);
  assert.equal(approvals.length,questions.length);
  assert.equal(new Set(approvals.map(q=>q.id)).size,approvals.length);
  for(const q of questions){
    validateExpansionQuestion(q);
    assert.equal(q.grade,10);assert.equal(q.subject,'ისტორია');assert.equal(q.prerequisiteMinGrade,10);
    assert.equal(q.evidenceKind,'explicit_teaching_scenario');assert.match(q.text,/პირობით/);
    assert.equal(q.curriculumTheme,q.semester===1?'პრეისტორია და ძველი აღმოსავლეთი':'ანტიკური ხანა და ადრეული შუა საუკუნეები (1014 წლამდე)');
    assert.equal(q.optionReview?.length,4);
    assert.ok(q.optionReview.every(x=>x.trim().length>=25));
    assert.equal(new Set(q.optionReview.map(normalizedPrompt)).size,4);
    assert.equal(q.explanation,q.optionReview[q.correct],'Explanation and keyed review disagree');
    assert.equal(approvals.find(a=>a.id===q.id)?.digest,contentDigest(q),'New or changed content needs editorial review');
  }
}
