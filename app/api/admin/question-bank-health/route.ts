import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { privateJson } from '@/lib/learning';
import { bankHealth } from '@/lib/bank-health-core.mjs';
import { assessmentSelectionKey } from '@/lib/assessment-selection';
import { consumeRateLimit } from '@/lib/rate-limit';
import { questionVersion } from '@/lib/question-review-core.mjs';
export async function GET(request:Request) {
  const current=await getSessionUser(request);
  if(current?.user.role!=='admin')return privateJson({error:'ადმინისტრატორის წვდომაა საჭირო.'},403);
  const rate=await consumeRateLimit('bank-health:'+current.user.id,20,60_000);
  if(!rate.allowed)return privateJson({error:'ცოტა ხანში სცადეთ თავიდან.'},429);
  const params=new URL(request.url).searchParams,grade=Number(params.get('grade')||1),semester=params.has('semester')?Number(params.get('semester')):null;
  if(!Number.isInteger(grade)||grade<1||grade>12||(semester!==null&&![1,2].includes(semester)))return privateJson({error:'ფილტრი არასწორია.'},400);
  const query=`SELECT q.*,k.answer_key_json,k.explanation,CASE WHEN k.question_id IS NULL THEN 0 ELSE 1 END AS has_answer_key,
    r.content_version AS reviewed_version,r.decision AS review_decision FROM assessment_questions q
    LEFT JOIN assessment_answer_keys k ON k.question_id=q.id LEFT JOIN question_review_events r ON r.id=(SELECT x.id FROM question_review_events x WHERE x.question_id=q.id ORDER BY x.reviewed_at DESC,x.id DESC LIMIT 1)
    WHERE q.grade=?${semester===null?'':' AND q.semester=?'} ORDER BY q.id LIMIT 10001`;
  const rows=(await env.DB.prepare(query).bind(...(semester===null?[grade]:[grade,semester])).all()).results||[];
  // Public payload is used only internally to apply the exact selector; it is never returned.
  let approved=0,needsChanges=0,stale=0;
  for(const row of rows.slice(0,10000)){if(!row.reviewed_version)continue;if(await questionVersion(row)!==row.reviewed_version){stale++;continue;}if(row.review_decision==='approved')approved++;else needsChanges++;}
  const health=bankHealth(rows.slice(0,10000),assessmentSelectionKey,{grade,semester,truncated:rows.length>10000});
  return privateJson({...health,humanVerification:{status:'tracked',verifiedCount:approved,needsChanges,stale,unreviewed:Math.min(rows.length,10000)-approved-needsChanges-stale},
    warnings:health.warnings.filter(w=>!w.includes('აღრიცხვა ჯერ არ არსებობს')).concat('ხელით დასტური უკავშირდება კონკრეტულ ვერსიას და შემმოწმებელს; ავტომატური შემოწმება დასტურს არ ქმნის.'),generatedAt:new Date().toISOString()});
}
