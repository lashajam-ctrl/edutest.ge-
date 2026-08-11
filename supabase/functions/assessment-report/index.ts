import { createClient } from "npm:@supabase/supabase-js@2";

const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY")!;
const PUBLISHABLE=Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const ALLOWED_ORIGIN=(Deno.env.get("EDUTEST_ALLOWED_ORIGIN")||"").replace(/\/$/,"");
const cors={"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const db=()=>createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});

async function caller(req:Request){
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))throw new Error("AUTH_REQUIRED");
  const client=createClient(URL,PUBLISHABLE,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.getUser();
  if(error||!data.user)throw new Error("AUTH_REQUIRED");
  return data.user;
}

async function requireAdmin(client:ReturnType<typeof db>,userId:string){
  const {data,error}=await client.from("profiles").select("role").eq("id",userId).single();
  if(error||data?.role!=="admin")throw new Error("ADMIN_REQUIRED");
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
  if(!ALLOWED_ORIGIN)return json({error:"SERVER_ORIGIN_NOT_CONFIGURED"},503);
  const declared=Number(req.headers.get("content-length")||0);
  if(declared>32_768)return json({error:"PAYLOAD_TOO_LARGE"},413);
  try{
    const user=await caller(req);
    const client=db();
    const body=await req.json().catch(()=>({}));
    const action=String(body?.action||"");

    if(action==="create"){
      const reportType=String(body?.report_type||"other");
      if(!["wrong_answer","bad_question","typo","other"].includes(reportType))return json({error:"INVALID_REPORT_TYPE"},400);
      const testId=String(body?.test_id||"").slice(0,180);
      const questionId=String(body?.question_id||"").slice(0,180);
      const comment=String(body?.comment||"").trim().slice(0,1000);
      const questionText=String(body?.question_text||"").trim().slice(0,300);
      if(!testId||!questionId)return json({error:"TEST_AND_QUESTION_REQUIRED"},400);

      const since=new Date(Date.now()-60*60*1000).toISOString();
      const {count}=await client.from("assessment_reports").select("id",{count:"exact",head:true}).eq("reporter_user_id",user.id).gte("created_at",since);
      if((count||0)>=20)return json({error:"REPORT_RATE_LIMIT"},429);

      const [{data:test},{data:question}]=await Promise.all([
        client.from("assessment_tests").select("id,title,pool_prefix,owner_user_id").eq("id",testId).maybeSingle(),
        client.from("assessment_questions").select("id,pool_prefix").eq("id",questionId).eq("active",true).maybeSingle()
      ]);
      if(!test||!question)return json({error:"TEST_OR_QUESTION_NOT_FOUND"},404);
      if(test.owner_user_id){
        const {data:link}=await client.from("assessment_test_questions").select("question_id").eq("test_id",testId).eq("question_id",questionId).maybeSingle();
        if(!link)return json({error:"QUESTION_NOT_IN_TEST"},400);
      }else if(test.pool_prefix!==question.pool_prefix){
        return json({error:"QUESTION_NOT_IN_TEST"},400);
      }

      const {data,error}=await client.from("assessment_reports").insert({reporter_user_id:user.id,test_id:testId,question_id:questionId,report_type:reportType,comment,question_text_snapshot:questionText}).select("id,created_at").single();
      if(error)throw error;
      return json({ok:true,report:{id:data.id,date:new Date(data.created_at).toLocaleDateString("ka-GE")}},201);
    }

    await requireAdmin(client,user.id);
    if(action==="list"){
      const {data,error}=await client.from("assessment_reports").select("id,test_id,question_id,report_type,comment,question_text_snapshot,resolved,created_at,reporter_user_id").order("created_at",{ascending:false}).limit(1000);
      if(error)throw error;
      const rows=data||[];
      const userIds=[...new Set(rows.map((r:any)=>r.reporter_user_id))];
      const testIds=[...new Set(rows.map((r:any)=>r.test_id))];
      let profiles:any[]=[];
      let tests:any[]=[];
      if(userIds.length){const {data}=await client.from("profiles").select("id,email,name").in("id",userIds);profiles=data||[];}
      if(testIds.length){const {data}=await client.from("assessment_tests").select("id,title").in("id",testIds);tests=data||[];}
      const profileMap=new Map((profiles||[]).map((p:any)=>[p.id,p]));
      const testMap=new Map((tests||[]).map((t:any)=>[t.id,t]));
      return json({reports:rows.map((r:any)=>{const p:any=profileMap.get(r.reporter_user_id)||{};const t:any=testMap.get(r.test_id)||{};return{id:r.id,date:new Date(r.created_at).toLocaleDateString("ka-GE"),userId:p.email||r.reporter_user_id,userName:p.name||"",testId:r.test_id,testTitle:t.title||r.test_id,qId:r.question_id,qText:r.question_text_snapshot,type:r.report_type,comment:r.comment,resolved:r.resolved};})});
    }
    if(action==="resolve"){
      const id=String(body?.report_id||"");
      if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:"INVALID_REPORT_ID"},400);
      const resolved=body?.resolved===true;
      const {error}=await client.from("assessment_reports").update({resolved,resolved_by:resolved?user.id:null,resolved_at:resolved?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",id);
      if(error)throw error;
      return json({ok:true});
    }
    return json({error:"UNKNOWN_ACTION"},400);
  }catch(e){
    const message=String(e?.message||e);
    return json({error:message},message==="AUTH_REQUIRED"?401:message==="ADMIN_REQUIRED"?403:500);
  }
});
