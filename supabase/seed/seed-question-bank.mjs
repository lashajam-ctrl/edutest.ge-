import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
await import('./validate-pack.mjs');
if(process.exitCode)throw new Error('Pack validation failed; database seed was not started.');
const url=process.env.SUPABASE_URL;
const secret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!secret) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (server-only secret/service role key).');
const supabase=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const seed=JSON.parse(fs.readFileSync(new URL('./edutest_secure_assessment_seed.json',import.meta.url),'utf8'));
const chunk=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n));
for(const [i,batch] of chunk(seed.questions,200).entries()){
  const {error}=await supabase.from('assessment_questions').upsert(batch,{onConflict:'id'});if(error)throw error;
  if((i+1)%5===0)console.log('questions',Math.min((i+1)*200,seed.questions.length),'/',seed.questions.length);
}
const testRows=seed.tests.map(t=>({id:t.id,title:t.title,subject:t.subject,grade:t.grade,pool_prefix:t.pool,question_count:t.count,time_minutes:t.time,attempts:t.attempts,paid:false,semester:t.semester||null,test_type:t.testType||'mid',is_summary:!!t.sumTest,owner_user_id:null,published:true,reveal_answers:true}));
for(const batch of chunk(testRows,200)){const {error}=await supabase.from('assessment_tests').upsert(batch,{onConflict:'id'});if(error)throw error;}
console.log('DONE:',seed.questions.length,'questions,',testRows.length,'tests');
