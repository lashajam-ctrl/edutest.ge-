import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {coalesceSelectionGroups, distinctSelectionGroupCount, selectAssessmentCandidates, languageBucketFor, languageBlueprintFor, allocateByWeight} from '../lib/assessment-selection.ts';
import {ASSESSMENT_SUBJECTS_BY_GRADE, assessmentSubjectComponents} from '../lib/school-policy.mjs';

export const readSnapshot = path => {
 const db=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});
 const source=fs.readFileSync(path,'utf8'); db.exec(source);
 return {db,sha256:createHash('sha256').update(source).digest('hex')};
};
export function capacityAudit(db,{days=10,count=10,targetGroups=200}={}) {
 const rows=db.prepare('SELECT * FROM assessment_questions WHERE active=1').all();
 const buckets=[];
 for(const [gradeString,subjects] of Object.entries(ASSESSMENT_SUBJECTS_BY_GRADE)) for(const subject of subjects) for(const semester of [1,2]) {
  const grade=Number(gradeString),aliases=assessmentSubjectComponents(subject,grade);
  const pool=rows.filter(q=>q.grade===grade&&aliases.includes(q.subject)&&q.semester===semester);
  const coalesced=coalesceSelectionGroups(pool),groups=distinctSelectionGroupCount(coalesced);
  const component=q=>subject==='მათემატიკა'&&grade>=7 ? (['geometry_space','გეომეტრია'].includes(q.strand)||q.subject==='გეომეტრია'?'geometry':'algebra') : languageBucketFor(subject,q.topic,JSON.parse(q.public_payload_json).text)??'all';
  const weights=languageBlueprintFor(subject,grade);
  const allocation=subject==='მათემატიკა'&&grade>=7 ? {algebra:count-Math.floor(count*.4),geometry:Math.floor(count*.4)} : weights?allocateByWeight(count,weights):{all:count};
  const components=Object.fromEntries(Object.keys(allocation).map(key=>[key,distinctSelectionGroupCount(coalesced.filter(q=>component(q)===key))]));
  let working=pool,freshPapers=0; const papers=[];
  for(let day=0;day<days;day++) {
   const now=1800000000000+day*86400000,result=selectAssessmentCandidates(working,subject,grade,count,now);
   const counts={}; for(const q of result.selected){const c=component(q);counts[c]=(counts[c]??0)+1;}
   const drift=Object.entries(allocation).filter(([key,n])=>Math.abs((counts[key]??0)-n)>1).map(([key,n])=>({component:key,expected:n,actual:counts[key]??0}));
   papers.push({day:day+1,count:result.selected.length,...result.rotation,components:counts,drift});
   if(result.selected.length===count&&result.rotation.reusedGroups===0)freshPapers++;
   const ids=new Set(result.selected.map(q=>q.id));working=working.map(q=>ids.has(q.id)?{...q,history_id:q.id,last_correct:1,last_answered_at:now}:q);
  }
  buckets.push({grade,subject,semester,rows:pool.length,groups,components,allocation,freshPapers,firstRepeat:papers.find(p=>p.reusedGroups)?.day??null,shortfallToTarget:Math.max(0,targetGroups-groups),papers});
 }
 return {generatedAt:new Date().toISOString(),activeRows:rows.length,days,count,targetGroups,buckets,summary:{buckets:buckets.length,below50:buckets.filter(b=>b.groups<50).length,below60:buckets.filter(b=>b.groups<60).length,below100:buckets.filter(b=>b.groups<100).length,belowTarget:buckets.filter(b=>b.groups<targetGroups).length,shortfallToTarget:buckets.reduce((s,b)=>s+b.shortfallToTarget,0),firstPaperBlueprintDrift:buckets.filter(b=>b.papers[0].drift.length).length},limitations:['Groups are the current selector equivalence classes, not independently certified unique concepts.','Full-new-paper counts assume no previous attempts and one fixed subject, grade and semester.','Weights are practical configurable defaults, not official school-hour allocations.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const source=process.argv[2]??'.openai/v29-held-reviewed-after.sql',out=process.argv[3]??'reports/bank-capacity-2026-10-07.json';
 const {db,sha256}=readSnapshot(source),report={...capacityAudit(db),snapshotSha256:sha256};
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({activeRows:report.activeRows,...report.summary,weakest:report.buckets.sort((a,b)=>a.groups-b.groups).slice(0,10).map(({papers,...b})=>b)},null,2));
}
