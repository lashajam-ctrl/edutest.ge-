import assert from 'node:assert/strict';
import {coalesceSelectionGroups,assessmentSelectionKey,selectAssessmentCandidates,languageBucketFor} from '../lib/assessment-selection.ts';

// Freshness and composition are separate claims. A complete fresh paper is
// not counted as balanced merely because its total number of questions fits.
export function measureFreshBalancedRun(rows,{subject,grade,sizes,languageShare=.4}={}){
 assert.ok(rows.length>0&&sizes.length>0);
 assert.ok(languageShare>=0&&languageShare<=1);
 let working=coalesceSelectionGroups(rows);const seen=new Set(),papers=[];
 for(const [i,count]of sizes.entries()){
  assert.ok(Number.isInteger(count)&&count>0);
  const now=1800000000000+i*3600000;
  const result=selectAssessmentCandidates(working,subject,grade,count,now);
  const keys=result.selected.map(assessmentSelectionKey);
  assert.equal(new Set(keys).size,keys.length,'Repeated family within a paper');
  const fresh=keys.filter(k=>!seen.has(k)).length;
  const language=result.selected.filter(q=>languageBucketFor(q.subject,q.topic,JSON.parse(q.public_payload_json).text)==='language').length;
  const expectedLanguage=Math.round(count*languageShare);
  papers.push({requested:count,delivered:keys.length,fresh,reused:keys.length-fresh,language,literature:keys.length-language,expectedLanguage,balanced:language===expectedLanguage,fullyFresh:keys.length===count&&fresh===count});
  keys.forEach(k=>seen.add(k));const ids=new Set(result.selected.map(q=>q.id));
  working=working.map(q=>ids.has(q.id)?{...q,history_id:q.id,last_correct:1,last_answered_at:now}:q);
 }
 return papers;
}
