import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"../..");
const publicHtmlPath=resolve(root,"public/app.html");
const legacyRootHtml=resolve(root,"EduTest-1-12-PROFESSIONAL-FINAL-SERVER-VERIFIED-15X.html");
const seedPath=resolve(here,"edutest_secure_assessment_seed.json");
const failures=[];
const warnings=[];
const pass=(message)=>console.log(`PASS — ${message}`);
const assert=(condition,message)=>condition?pass(message):failures.push(message);

const html=readFileSync(publicHtmlPath,"utf8");
const seed=JSON.parse(readFileSync(seedPath,"utf8"));
const questions=Array.isArray(seed.questions)?seed.questions:[];
const tests=Array.isArray(seed.tests)?seed.tests:[];

assert(!existsSync(legacyRootHtml),"unsafe duplicate root HTML is absent");
assert(!html.includes("Q_POOL"),"public HTML contains no Q_POOL symbol or bank");
assert(!html.includes("g1m1_01"),"known protected question id is absent from public HTML");
assert(!/\b(?:mc|tf|calc)\s*\(/.test(html),"legacy question factory rows are absent from public HTML");
assert(!/"correct"\s*:/.test(html),"JSON-style answer rows are absent from public HTML");
assert(!/sb_secret_[A-Za-z0-9_-]+/.test(html),"Supabase secret keys are absent from public HTML");
assert(!/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/.test(html),"service-role values are absent from public HTML");
assert(!html.includes('id="rb-admin"'),"public registration has no admin role selector");
assert(!/(?:student|teacher|admin)123|changeme123|admin_jwt/i.test(html),"public HTML contains no demo or temporary credentials");
assert(!/admin@edutest\.ge|\+995 555 000 000/i.test(html),"public HTML contains no stale admin contact or placeholder phone");
assert(!/mariam@student\.ge|nino@edutest\.ge|მარიამ კვირიკაშვილი|ნინო გელაშვილი/i.test(html),"role screens contain no pre-rendered demo identities");
assert(html.includes("persistSession:false"),"Supabase access tokens are not persisted in browser storage");
assert(!html.includes("isLocalDemoCredential"),"production sign-in has no local demo credential path");
assert(html.includes('id="admin-mfa-modal"'),"admin MFA enrollment and challenge UI is present");
assert(html.includes("mfa.enroll({factorType:'totp'"),"admin can enroll a TOTP factor without leaving the app");
assert(html.includes("mfa.challengeAndVerify({factorId:ADMIN_MFA_FACTOR_ID,code})"),"admin TOTP codes are verified by Supabase Auth");
assert(html.includes("currentLevel==='aal2'"),"admin access requires AAL2 after verification");
assert(!html.includes("12 საგანი"),"public copy does not advertise the stale 12-subject count");
assert(html.includes("15 საგანი"),"public copy advertises the verified 15-subject inventory");
assert(html.includes("reportFunction:'assessment-report'"),"question reports use the server report function");
assert(html.includes("r.comment||'—')" )&&html.includes("esc(r.comment||'—')"),"report comments are escaped before HTML rendering");
const csvPreviewSource=html.slice(html.indexOf("function previewCSV"),html.indexOf("function importCSV"));
assert(csvPreviewSource.includes("textContent")&&!/innerHTML|insertAdjacentHTML|outerHTML/.test(csvPreviewSource),"CSV preview renders untrusted cells as text");
const aiFeedbackSource=html.slice(html.indexOf("function renderAiExplanation"),html.indexOf("const USER_DB"));
assert(html.includes("🤖 ამიხსენი შეცდომა")&&aiFeedbackSource.includes("/api/ai/feedback"),"incorrect answers expose the authenticated AI teacher action");
assert(aiFeedbackSource.includes("'Authorization':'Bearer '+token"),"AI feedback forwards the in-memory Supabase access token");
assert(aiFeedbackSource.includes("textContent")&&!/innerHTML|insertAdjacentHTML|outerHTML/.test(aiFeedbackSource),"AI response fields render only as text nodes");
let inlineScriptSyntaxOk=true;
for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(/\bsrc\s*=/.test(match[1]||"")||/application\/ld\+json/.test(match[1]||""))continue;
  try{new Function(match[2]);}catch(error){inlineScriptSyntaxOk=false;console.error(error);}
}
assert(inlineScriptSyntaxOk,"all inline browser scripts parse successfully");

for(const file of ["assessment-start","assessment-submit","assessment-builder","assessment-report","delete-account"]){
  const source=readFileSync(resolve(root,`supabase/functions/${file}/index.ts`),"utf8");
  assert(!source.includes('"Access-Control-Allow-Origin":"*"'),`${file} has no wildcard CORS`);
  assert(source.includes("EDUTEST_ALLOWED_ORIGIN"),`${file} requires an explicit allowed origin`);
  assert(source.includes("METHOD_NOT_ALLOWED"),`${file} rejects unsupported HTTP methods`);
}

const migration1=readFileSync(resolve(root,"supabase/migrations/202608110001_child_safe.sql"),"utf8");
const migration2=readFileSync(resolve(root,"supabase/migrations/202608110002_server_verified_assessment.sql"),"utf8");
const migration3=readFileSync(resolve(root,"supabase/migrations/202608110003_assessment_reports.sql"),"utf8");
const migration4=readFileSync(resolve(root,"supabase/migrations/202608110004_enable_post_submit_review.sql"),"utf8");
const migration5=readFileSync(resolve(root,"supabase/migrations/202608110005_disable_payments.sql"),"utf8");
const migration6=readFileSync(resolve(root,"supabase/migrations/202608110006_social_auth_profile.sql"),"utf8");
assert(/requested_role'\s*=\s*'teacher'\s+then\s+'pending_teacher'/i.test(migration1),"teacher self-registration maps to pending_teacher");
assert(!/requested_role'\s*=\s*'admin'\s+then\s+'admin'/i.test(migration1),"admin self-registration mapping is absent");
assert(migration2.includes("revoke insert, update, delete on table public.question_history from authenticated"),"question history is browser read-only");
assert(migration2.includes("revoke insert, update, delete on table public.subject_history from authenticated"),"subject history is browser read-only");
assert(migration3.includes("revoke all on table public.assessment_reports from anon, authenticated"),"reports table has no direct browser grants");
assert(/set\s+reveal_answers\s*=\s*true/i.test(migration4),"core tests reveal explanations only after server-side grading");
assert(/set\s+paid\s*=\s*false/i.test(migration5),"all tests remain free while payment rollout is disabled");
assert(/p_requested_role not in \('student','teacher'\)/i.test(migration6),"social profile completion accepts only student or teacher roles");
assert(/then 'pending_teacher' else 'student'/i.test(migration6),"social teacher registration remains pending until administrator review");
assert(!/then 'admin'/i.test(migration6),"social profile completion cannot self-assign administrator role");
assert(/profile_completed_at is not null then raise exception 'Profile already completed'/i.test(migration6),"social role selection is one-time only");
assert(/Teacher must be an adult/i.test(migration6),"social teacher registration requires an adult birth date");
assert(/Guardian email is required/i.test(migration6),"under-16 social registration requires a separate guardian email");
assert(html.includes("const PAYMENTS_ENABLED=false")&&html.includes("if(!PAYMENTS_ENABLED)return 'free'"),"public UI cannot activate the deferred paywall");

assert(questions.length===12600,`question inventory is 12,600 (actual ${questions.length})`);
assert(tests.length===336,`test inventory is 336 (actual ${tests.length})`);
const ids=new Set(questions.map(q=>q.id));
assert(ids.size===questions.length,"all question ids are unique");
const subjects=new Set(questions.map(q=>q.subject));
assert(subjects.size===15,`unique subject inventory is 15 (actual ${subjects.size})`);

const bankCounts=new Map();
const semesterCounts=new Map();
const poolCounts=new Map();
let unsafePayloads=0,invalidMcq=0,correctFailures=0,wrongFailures=0,missingExplanations=0;
const unsafeKeys=new Set(["correct","answer","blanks","pairs","explanation","explain","answer_key"]);
const hasUnsafe=(value)=>{
  if(!value||typeof value!=="object")return false;
  if(Array.isArray(value))return value.some(hasUnsafe);
  return Object.entries(value).some(([key,child])=>unsafeKeys.has(key)||hasUnsafe(child));
};
const norm=value=>String(value??"").trim().toLocaleLowerCase("ka-GE");
const grades=(q,answer)=>{
  const key=q.answer_key||{};
  if(q.question_type==="multiple_choice"||q.question_type==="true_false")return Number(answer)===Number(key.correct);
  if(q.question_type==="calc"){const n=Number(answer),expected=Number(key.correct),tolerance=Number(key.tolerance||0);return Number.isFinite(n)&&Number.isFinite(expected)&&Math.abs(n-expected)<=tolerance;}
  if(q.question_type==="order")return Array.isArray(answer)&&Array.isArray(key.correct)&&answer.length===key.correct.length&&answer.every((v,i)=>String(v)===String(key.correct[i]));
  if(q.question_type==="match")return !!answer&&typeof answer==="object"&&Array.isArray(key.correct)&&key.correct.every((v,i)=>String(answer[i]??answer[String(i)]??"")===String(v));
  if(q.question_type==="fill")return Array.isArray(answer)&&Array.isArray(key.blanks)&&answer.length===key.blanks.length&&key.blanks.every((v,i)=>norm(answer[i])===norm(v));
  return false;
};
const validAndInvalidAnswers=q=>{
  const key=q.answer_key||{};
  if(q.question_type==="multiple_choice"||q.question_type==="true_false")return [key.correct,(Number(key.correct)+1)%Math.max(2,(q.public_payload?.opts||[]).length)];
  if(q.question_type==="calc")return [key.correct,Number(key.correct)+Math.abs(Number(key.tolerance||0))+1];
  if(q.question_type==="order"){const ok=[...(key.correct||[])];const bad=[...ok];if(bad.length>1)[bad[0],bad[1]]=[bad[1],bad[0]];else bad.push("__wrong__");return [ok,bad];}
  if(q.question_type==="match"){const ok=[...(key.correct||[])];const bad=[...ok];bad[0]=`__wrong__${bad[0]??""}`;return [ok,bad];}
  if(q.question_type==="fill"){const ok=[...(key.blanks||[])];const bad=[...ok];bad[0]=`__wrong__${bad[0]??""}`;return [ok,bad];}
  return [null,null];
};

for(const q of questions){
  const bank=`${q.grade}|${q.subject}`;
  const semester=`${bank}|${q.semester}`;
  bankCounts.set(bank,(bankCounts.get(bank)||0)+1);
  semesterCounts.set(semester,(semesterCounts.get(semester)||0)+1);
  poolCounts.set(q.pool_key,(poolCounts.get(q.pool_key)||0)+1);
  if(hasUnsafe(q.public_payload))unsafePayloads++;
  if(!String(q.explanation||"").trim())missingExplanations++;
  if(q.question_type==="multiple_choice"||q.question_type==="true_false"){
    const options=q.public_payload?.opts||[];
    if(options.length<2||new Set(options.map(v=>String(v).trim())).size!==options.length||!Number.isInteger(Number(q.answer_key?.correct))||Number(q.answer_key.correct)<0||Number(q.answer_key.correct)>=options.length)invalidMcq++;
  }
  const [correctAnswer,wrongAnswer]=validAndInvalidAnswers(q);
  if(!grades(q,correctAnswer))correctFailures++;
  if(grades(q,wrongAnswer))wrongFailures++;
}

assert(bankCounts.size===84,`grade/subject banks total 84 (actual ${bankCounts.size})`);
assert([...bankCounts.values()].every(n=>n===150),"every grade/subject bank contains exactly 150 questions");
assert(semesterCounts.size===168&&[...semesterCounts.values()].every(n=>n===75),"every bank semester contains exactly 75 questions");
assert(poolCounts.size===420&&[...poolCounts.values()].every(n=>n===30),"all 420 pool keys contain exactly 30 questions");
assert(unsafePayloads===0,"public question payloads contain no answer or explanation keys");
assert(invalidMcq===0,"all MCQ/True-False questions have unique options and one valid answer index");
assert(correctFailures===0,"all 12,600 authoritative correct answers pass server-equivalent grading");
assert(wrongFailures===0,"all 12,600 deterministic wrong answers fail server-equivalent grading");
assert(missingExplanations===0,"all questions include a server-only explanation");

const questionsByPrefix=new Map();
for(const q of questions){const key=`${q.pool_prefix}|${q.semester??""}`;questionsByPrefix.set(key,(questionsByPrefix.get(key)||0)+1);}
let insufficientTests=0;
for(const test of tests){const count=questionsByPrefix.get(`${test.pool}|${test.semester??""}`)||0;if(count<Number(test.count||0))insufficientTests++;}
assert(insufficientTests===0,"every core test has enough eligible questions");

const placeholders=[...html.matchAll(/REPLACE_WITH_[A-Z0-9_]+|sb_publishable_REPLACE_ME/g)].map(m=>m[0]);
if(/url\s*:\s*['"]https:\/\/YOUR_PROJECT_REF\.supabase\.co/i.test(html))placeholders.push('YOUR_PROJECT_REF');
if(placeholders.length)warnings.push(`configuration placeholders still require real values: ${[...new Set(placeholders)].join(", ")}`);

for(const message of warnings)console.log(`CONFIG — ${message}`);
if(failures.length){
  for(const message of failures)console.error(`FAIL — ${message}`);
  process.exitCode=1;
}else{
  console.log(`\nREADY FOR CONFIGURATION — ${questions.length.toLocaleString("en-US")} questions, ${tests.length} tests, ${subjects.size} subjects.`);
}
