import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { privateJson } from '@/lib/learning';
import { consumeRateLimit } from '@/lib/rate-limit';
import { createReviewService, ReviewError } from '@/lib/question-review-core.mjs';
async function handle(request:Request,write:boolean){
  const current=await getSessionUser(request);
  if(current?.user.role!=='admin')return privateJson({error:'ადმინისტრატორის დადასტურებული სესიაა საჭირო.'},403);
  const rate=await consumeRateLimit('question-review:'+current.user.id,40,60_000);if(!rate.allowed)return privateJson({error:'ცოტა ხანში სცადეთ თავიდან.'},429);
  try{const service=createReviewService({db:env.DB});
    if(write){const text=await request.text();if(text.length>10000)return privateJson({error:'პაკეტი ძალიან დიდია.'},413);return privateJson(await service.record(current.user.id,JSON.parse(text)));}
    const p=new URL(request.url).searchParams,grade=Number(p.get('grade')||1),after=p.get('after')||'',questionId=p.get('questionId')||'';
    if(!Number.isInteger(grade)||grade<1||grade>12||after.length>200||questionId.length>200)return privateJson({error:'ფილტრი არასწორია.'},400);
    return privateJson(await service.list({grade,after,questionId}));
  }catch(e){if(e instanceof ReviewError)return privateJson({error:e.message},e.status);if(e instanceof SyntaxError)return privateJson({error:'პაკეტი არასწორია.'},400);console.error('QUESTION_REVIEW_UNAVAILABLE');return privateJson({error:'შემოწმების ისტორია დროებით მიუწვდომელია.'},503);}
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
