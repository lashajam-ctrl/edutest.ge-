import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { privateJson } from '@/lib/learning';
import { ageAt, learnerAllowed, GUARDIAN_CHILDREN_SQL, tbilisiDay, weeklySummary, DAY_MS } from '@/lib/learning-core.mjs';
export async function GET(request: Request) {
  const current=await getSessionUser(request);
  if(!current)return privateJson({error:'ავტორიზაცია აუცილებელია'},401);
  const user=current.user,now=Date.now();
  if(user.accountStatus!=='active'||!user.emailVerified)return privateJson({error:'საჭიროა აქტიური, დადასტურებული ანგარიში.'},403);
  const children=(ageAt(user.birthDate,now)??0)>=18
    ? (await env.DB.prepare(GUARDIAN_CHILDREN_SQL).bind(user.email).all<{id:string;name:string;grade:string}>()).results||[] : [];
  const requested=new URL(request.url).searchParams.get('childId');
  if(!requested&&user.role==='student'&&!learnerAllowed(user,now))return privateJson({error:'საჭიროა პროფილისა და მშობლის თანხმობის დასრულება.'},403);
  if(requested&&!children.some(child=>child.id===requested))return privateJson({error:'ბავშვის მონაცემებზე დადასტურებული წვდომა არ გაქვთ.'},403);
  const target=requested||user.id,from=tbilisiDay(now).start-6*DAY_MS;
  const rows=(await env.DB.prepare(`SELECT answers_json,submitted_at FROM attempts WHERE user_id=? AND submitted_at>=? AND submitted_at<=? ORDER BY submitted_at DESC LIMIT 501`)
    .bind(target,from,now).all()).results||[];
  if(rows.length>500)return privateJson({error:'ამ კვირის მონაცემები ძალიან მოცულობითია; შეჯამება დროებით მიუწვდომელია.'},422);
  return privateJson({children,viewer:requested?'guardian':'self',childId:requested||null,summary:weeklySummary(rows,now)});
}
