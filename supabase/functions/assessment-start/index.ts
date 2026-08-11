import { createClient } from "npm:@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY")!;
const PUBLISHABLE=Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const ALLOWED_ORIGIN=(Deno.env.get("EDUTEST_ALLOWED_ORIGIN")||"").replace(/\/$/,"");
const cors={"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
function adminClient(){return createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});}
async function caller(req:Request){
 const auth=req.headers.get("Authorization")||""; if(!auth.startsWith("Bearer "))throw new Error("AUTH_REQUIRED");
 const c=createClient(URL,PUBLISHABLE,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await c.auth.getUser(); if(error||!data.user)throw new Error("AUTH_REQUIRED"); return data.user;
}
function under16(dob:string|null){if(!dob)return false;const d=new Date(dob+'T00:00:00Z'),n=new Date();let a=n.getUTCFullYear()-d.getUTCFullYear();const m=n.getUTCMonth()-d.getUTCMonth();if(m<0||(m===0&&n.getUTCDate()<d.getUTCDate()))a--;return a<16;}
async function profileGate(db:any,userId:string){const {data:p,error}=await db.from('profiles').select('id,email,name,role,grade,birth_date,guardian_verified_at').eq('id',userId).single();if(error||!p)throw new Error('PROFILE_REQUIRED');if(p.role==='student'){if(!p.birth_date)throw new Error('AGE_VERIFICATION_REQUIRED');if(under16(p.birth_date)&&!p.guardian_verified_at)throw new Error('GUARDIAN_CONSENT_REQUIRED');}return p;}
function shuffle<T>(a:T[]){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}

function diverse(items:any[],n:number){
 const groups=new Map<string,any[]>();for(const q of shuffle(items)){const k=q.topic||q.public_payload?.topic||'__';if(!groups.has(k))groups.set(k,[]);groups.get(k)!.push(q);}const out:any[]=[];let keys=shuffle([...groups.keys()]);
 while(out.length<n&&keys.length){let next:string[]=[];for(const k of keys){const arr=groups.get(k)!;if(arr.length&&out.length<n)out.push(arr.shift());if(arr.length)next.push(k);}keys=shuffle(next);}return out;
}
function safeQuestion(q:any){const p={...(q.public_payload||{})};p.id=q.id;p.pts=q.points;p.type=q.question_type;
 if(p.type==='order'){p.items=shuffle(p.items||[]);}
 if(p.type==='match'){p.leftItems=p.leftItems||[];p.rightOptions=shuffle(p.rightOptions||[]);}
 delete p.correct;delete p.answer;delete p.blanks;delete p.explanation;delete p.explain;delete p.pairs;return p;}
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);if(!ALLOWED_ORIGIN)return json({error:'SERVER_ORIGIN_NOT_CONFIGURED'},503);try{
 const user=await caller(req),db=adminClient(),profile=await profileGate(db,user.id);const body=await req.json();const testId=String(body.test_id||'');const mode=body.mode==='practice'?'practice':'verified';if(!testId)return json({error:'test_id required'},400);
 const {data:test,error:te}=await db.from('assessment_tests').select('*').eq('id',testId).single();if(te||!test||!test.published)return json({error:'TEST_NOT_FOUND'},404);
 if(test.owner_user_id&&profile.role==='student'){if(test.audience_grade&&String(test.audience_grade)!==String(profile.grade))return json({error:'NOT_ASSIGNED'},403);if(test.due_at&&new Date(test.due_at).getTime()<Date.now())return json({error:'DEADLINE_PASSED'},403);}
 if(mode==='verified'){const {count}=await db.from('assessment_results').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('test_id',testId);if((count||0)>=Number(test.attempts||1))return json({error:'ATTEMPTS_EXHAUSTED'},403);}
 let candidates:any[]=[];
 if(test.owner_user_id){const {data:links,error}=await db.from('assessment_test_questions').select('question_id,position').eq('test_id',testId).order('position');if(error)throw error;const ids=(links||[]).map((x:any)=>x.question_id);if(ids.length){const {data,error:qerr}=await db.from('assessment_questions').select('*').in('id',ids).eq('active',true);if(qerr)throw qerr;candidates=qerr?[]:(data||[]);}}
 else{let query=db.from('assessment_questions').select('*').eq('pool_prefix',test.pool_prefix).eq('active',true);if(test.semester)query=query.eq('semester',test.semester);const {data,error}=await query;if(error)throw error;candidates=data||[];}
 if(!candidates.length)return json({error:'NO_QUESTIONS'},409);
 const ids=candidates.map(q=>q.id);const {data:hist}=await db.from('question_history').select('*').eq('user_id',user.id).in('question_id',ids);const hm=new Map((hist||[]).map((h:any)=>[h.question_id,h]));
 const unseen=candidates.filter(q=>!hm.get(q.id)||Number(hm.get(q.id).seen_count||0)===0);
 const due=candidates.filter(q=>{const h=hm.get(q.id);if(!h||!h.last_wrong)return false;return Number(h.wrong_count||0)>0&&Date.now()-new Date(h.last_wrong).getTime()>=2*86400000;});
 const old=candidates.filter(q=>!unseen.includes(q)).sort((a,b)=>new Date(hm.get(a.id)?.last_seen||0).getTime()-new Date(hm.get(b.id)?.last_seen||0).getTime());
 const n=Math.min(Number(test.question_count||10),candidates.length);let selected:any[]=[];const add=(arr:any[])=>{for(const q of diverse(arr,n-selected.length)){if(selected.length>=n)break;if(!selected.some(x=>x.id===q.id))selected.push(q);}};add(unseen);if(selected.length<n)add(due);if(selected.length<n)add(old);if(selected.length<n)add(candidates);
 selected=selected.slice(0,n);const minutes=Math.max(1,Number(test.time_minutes||20));const expires=new Date(Date.now()+(mode==='practice'?24*60:minutes+5)*60000).toISOString();
 const {data:session,error:se}=await db.from('assessment_sessions').insert({user_id:user.id,test_id:testId,mode,question_ids:selected.map(q=>q.id),expires_at:expires,integrity:{selection:'server',version:'2026-08-09'}}).select('id').single();if(se)throw se;
 return json({session_id:session.id,test:{id:test.id,title:test.title,subject:test.subject,grade:test.grade,count:n,time:minutes,semester:test.semester,testType:test.test_type},questions:selected.map(safeQuestion),verified:mode==='verified'});
}catch(e){const m=String(e?.message||e);const status=m==='AUTH_REQUIRED'?401:m.includes('CONSENT')||m.includes('AGE_')?403:500;return json({error:m},status);}});
