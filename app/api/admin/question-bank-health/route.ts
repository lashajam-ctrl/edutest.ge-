import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { privateJson } from '@/lib/learning';
import { bankHealth } from '@/lib/bank-health-core.mjs';
import { assessmentSelectionKey } from '@/lib/assessment-selection';
import { consumeRateLimit } from '@/lib/rate-limit';
export async function GET(request:Request) {
  const current=await getSessionUser(request);
  if(current?.user.role!=='admin')return privateJson({error:'ადმინისტრატორის წვდომაა საჭირო.'},403);
  const rate=await consumeRateLimit('bank-health:'+current.user.id,20,60_000);
  if(!rate.allowed)return privateJson({error:'ცოტა ხანში სცადეთ თავიდან.'},429);
  const params=new URL(request.url).searchParams,grade=Number(params.get('grade')||1),semester=params.has('semester')?Number(params.get('semester')):null;
  if(!Number.isInteger(grade)||grade<1||grade>12||(semester!==null&&![1,2].includes(semester)))return privateJson({error:'ფილტრი არასწორია.'},400);
  const query=`SELECT q.*,CASE WHEN k.question_id IS NULL THEN 0 ELSE 1 END AS has_answer_key FROM assessment_questions q
    LEFT JOIN assessment_answer_keys k ON k.question_id=q.id WHERE q.grade=?${semester===null?'':' AND q.semester=?'} ORDER BY q.id LIMIT 10001`;
  const rows=(await env.DB.prepare(query).bind(...(semester===null?[grade]:[grade,semester])).all()).results||[];
  // Public payload is used only internally to apply the exact selector; it is never returned.
  return privateJson({...bankHealth(rows.slice(0,10000),assessmentSelectionKey,{grade,semester,truncated:rows.length>10000}),generatedAt:new Date().toISOString()});
}
