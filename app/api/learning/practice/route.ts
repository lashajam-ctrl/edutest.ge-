import { requireLearner, privateJson, practiceService } from '@/lib/learning';
import { LearningError } from '@/lib/learning-practice-core.mjs';
import { consumeRateLimit } from '@/lib/rate-limit';
export async function POST(request: Request) {
  if(!request.headers.get('content-type')?.startsWith('application/json') || (request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin))return privateJson({error:'მოთხოვნის წყარო არასწორია.'},403);
  const auth=await requireLearner(request);if(auth.error)return auth.error;
  const userId=auth.current!.user.id,rate=await consumeRateLimit('learning-practice:'+userId,30,60_000);
  if(!rate.allowed)return privateJson({error:'ცოტა ხანში სცადე თავიდან.'},429);
  const raw=await request.text();if(raw.length>4000)return privateJson({error:'მოთხოვნა ზედმეტად დიდია.'},413);
  let body:Record<string,unknown>;try{body=JSON.parse(raw);}catch{return privateJson({error:'მოთხოვნა არასწორია.'},400);}
  if(!body||Array.isArray(body))return privateJson({error:'მოთხოვნა არასწორია.'},400);
  try{
    const service=practiceService();
    if(body.action==='start'&&typeof body.sourceQuestionId==='string'&&body.sourceQuestionId.length<=180)
      return privateJson(await service.start(userId,body.sourceQuestionId,auth.current!.user.grade),201);
    if(body.action==='submit'&&typeof body.sessionId==='string'&&body.sessionId.length<=100)
      return privateJson(await service.submit(userId,body.sessionId,body.answer));
    return privateJson({error:'მოთხოვნა არასწორია.'},400);
  }catch(error){if(error instanceof LearningError)return privateJson({error:error.message},error.status);throw error;}
}
