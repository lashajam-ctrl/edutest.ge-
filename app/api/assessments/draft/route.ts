import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { consumeRateLimit } from '@/lib/rate-limit';
import { createDraftService, DraftError } from '@/lib/assessment-drafts-core.mjs';
import { studentCanStudyGrade, subjectAllowedForGrade } from '@/lib/school-policy.mjs';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request:Request,write:boolean) {
  const current=await getSessionUser(request);
  if(!current)return json({error:'ავტორიზაცია აუცილებელია'},401);
  if(!['student','teacher','admin'].includes(current.user.role))return json({error:'ამ ფუნქციაზე წვდომა არ გაქვთ.'},403);
  const rate=await consumeRateLimit('assessment-draft:'+current.user.id,120,60_000);
  if(!rate.allowed)return json({error:'შენახვა ცოტა ხანში განმეორდება.'},429);
  const service=createDraftService({db:env.DB});
  try {
    let body:Record<string,unknown>={};
    if(write){const raw=await request.text();if(raw.length>100_000)return json({error:'პაკეტი ძალიან დიდია.'},413);body=JSON.parse(raw);}
    const id=write?body.sessionId:new URL(request.url).searchParams.get('sessionId');
    if(!id&&!write){const sessions=await service.list(current.user.id);return json({sessions:sessions.filter((s:{test:{grade:number;subject:string}})=>current.user.role!=='student'||studentCanStudyGrade(current.user.grade,s.test.grade)&&subjectAllowedForGrade(s.test.subject,s.test.grade))});}
    if(typeof id!=='string'||id.length>100)return json({error:'ტესტის სესია არასწორია.'},400);
    const loaded=await service.load(current.user.id,id);
    if(current.user.role==='student'&&(!studentCanStudyGrade(current.user.grade,loaded.test.grade)||!subjectAllowedForGrade(loaded.test.subject,loaded.test.grade)))return json({error:'ეს ტესტი შენი კლასისთვის აღარ არის ხელმისაწვდომი.'},403);
    return json(write?await service.save(current.user.id,id,body):loaded);
  }catch(error){if(error instanceof DraftError)return json({error:error.message},error.status);if(error instanceof SyntaxError)return json({error:'არასწორი პაკეტი.'},400);console.error('ASSESSMENT_DRAFT_UNAVAILABLE');return json({error:'შენახული ტესტი დროებით მიუწვდომელია. სცადე ხელახლა.'},503);}
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
