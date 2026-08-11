import { createClient } from "npm:@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY")!;
const PUBLISHABLE=Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const ALLOWED_ORIGIN=(Deno.env.get("EDUTEST_ALLOWED_ORIGIN")||"").replace(/\/$/,"");
const cors={"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  if(!ALLOWED_ORIGIN)return json({error:'SERVER_ORIGIN_NOT_CONFIGURED'},503);
  try{
    const auth=req.headers.get('Authorization')||'';
    if(!auth.startsWith('Bearer '))return json({error:'AUTH_REQUIRED'},401);
    const caller=createClient(URL,PUBLISHABLE,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await caller.auth.getUser();
    if(error||!data.user)return json({error:'AUTH_REQUIRED'},401);
    const body=await req.json().catch(()=>({}));
    if(body?.confirm!=='DELETE')return json({error:'CONFIRMATION_REQUIRED'},400);
    const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
    const {error:de}=await admin.auth.admin.deleteUser(data.user.id);
    if(de)throw de;
    return json({ok:true});
  }catch(e){return json({error:String(e?.message||e)},500);}
});
