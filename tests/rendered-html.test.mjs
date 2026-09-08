import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const source = path => readFile(new URL(path, root), "utf8");

test("ships one cookie-authenticated client for login, registration and durable learning", async () => {
  const html = await source("public/app.html");
  assert.match(html, /\/api\/auth\/login/);
  assert.match(html, /\/api\/auth\/register/);
  assert.match(html, /\/api\/auth\/session/);
  assert.match(html, /\/api\/user-state/);
  assert.match(html, /hydrateServerLearningState/);
  assert.match(html, /syncUserLearningState/);
  assert.match(html, /credentials:'include'/);
  assert.doesNotMatch(html, /localStorage\.(?:getItem|setItem)\([^)]*(?:jwt|token)/i);
});

test("keeps the embedded application full-screen and serves the canonical app shell", async () => {
  const [page, layout, worker] = await Promise.all([
    source("app/page.tsx"), source("app/layout.tsx"), source("worker/index.ts"),
  ]);
  assert.match(page, /position: "fixed"/);
  assert.match(page, /width: "100vw"/);
  assert.match(page, /height: "100dvh"/);
  assert.match(layout, /overflow: "hidden"/);
  assert.match(worker, /url\.pathname === "\/"/);
  assert.match(worker, /appUrl\.pathname = "\/app\.html"/);
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /Strict-Transport-Security/);
  assert.match(worker, /CDN-Cache-Control", "no-store"/);
});

test("uses warm grade-aware layouts and a child-friendly early-grade test view", async () => {
  const html = await source("public/app.html");
  assert.match(html, /WARM, GRADE-AWARE EDUTEST THEME/);
  assert.match(html, /--canvas:#f4eee8/);
  assert.match(html, /grade-band-early/);
  assert.match(html, /grade-band-primary/);
  assert.match(html, /grade-band-middle/);
  assert.match(html, /grade-band-senior/);
  assert.match(html, /function applyTestAgeMode\(test\)/);
  assert.match(html, /id="q-grade-guide"/);
  assert.match(html, /შენ ეს შეგიძლია!/);
  assert.match(html, /body\.test-age-theme #q-card/);
  assert.match(html, /@media\(max-width:640px\)/);
});

test("centers results and keeps actions usable on a 360px-wide screen", async () => {
  const html = await source("public/app.html");
  assert.match(html, /#p-results\{background:[^}]+align-items:center!important;justify-content:flex-start!important/);
  assert.match(html, /#results-btns\{justify-content:center/);
  assert.match(html, /@media\(max-width:640px\)/);
  assert.match(html, /#results-btns \.btn\{width:100%/);
  assert.match(html, /min-height:44px/);
});

test("publishes live counters instead of frozen marketing totals", async () => {
  const [html, client, stats] = await Promise.all([source("public/app.html"), source("public/server-assessments.js"), source("app/api/public/stats/route.ts")]);
  for (const id of ["lp-question-count", "lp-test-count", "lp-subject-count", "lp-today-tests", "lp-excellent", "lp-average-score"]) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, "g"))].length, 1, `${id} must be unique`);
  }
  assert.match(html, /id="lp-live-status" role="status" aria-live="polite"/);
  assert.match(client, /fetch\('\/api\/public\/stats'/);
  assert.match(client, /რეალური მაჩვენებლები დროებით მიუწვდომელია/);
  assert.match(stats, /subjectAllowedForGrade/);
  assert.match(stats, /eligibleTests\.length/);
  assert.doesNotMatch(html, /data-target=/);
});

test("teacher authoring and management are connected to server APIs", async () => {
  const [html, management, customTests] = await Promise.all([
    source("public/app.html"), source("public/management-overrides.js"), source("app/api/custom-tests/route.ts"),
  ]);
  assert.match(html, /function showBuilder\(/);
  assert.match(html, /async function bNav\(/);
  assert.match(html, /async function saveBuilderTest\(/);
  assert.match(management, /\/api\/admin\/users/);
  assert.match(management, /\/api\/assessments\/builder/);
  assert.match(management, /loadManagementData/);
  assert.match(html, /\(tx\.isCustom\|\|tx\.teacherCreated\)&&tx\.title/);
  assert.match(customTests, /\["teacher", "admin"\]\.includes/);
});

test("management bridge loads without undeclared globals and keeps answer keys server-only", async () => {
  const management = await source("public/management-overrides.js");
  const context = {
    REPORTS: ["stale"], ADMIN_AUDIT_LOG: ["stale"],
    localStorage: { removeItem() {} }, document: { addEventListener() {} },
  };
  assert.doesNotThrow(() => runInNewContext(management, context));
  assert.doesNotMatch(management, /\b(?:ANSWER_OVERRIDES|_qeCustom|_qeTestId|Q_POOL|MANAGEMENT_TEST_IDS)\b/);
  assert.match(management, /პასუხების გასაღებები ბრაუზერში არ ქვეყნდება/);
  assert.match(management, /\/api\/admin\/users/);
  assert.match(management, /\/api\/management\/students/);
  assert.match(management, /\/api\/attempts\?scope=managed/);
});

test("teacher management renders server catalog composition and hydrates actual student totals", async () => {
  const management = await source("public/management-overrides.js");
  const node = tag => ({tag,children:[],style:{},value:'',append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);},replaceChildren(...items){this.children=items;},setAttribute(){},addEventListener(){}});
  const tbody=node('tbody');
  const context={
    REPORTS:[],ADMIN_AUDIT_LOG:[],USER_DB:[],SESSION_RESULTS:[],ASSIGNMENTS:[],
    CUR_USER:{email:'teacher@example.test',role:'teacher'},
    ALL_TESTS:[{id:'test-1',title:'სავარჯიშო',subject:'ინგლისური',grade:5,count:10,componentCounts:{grammar:3,reading:7},curriculumVerified:false}],
    localStorage:{removeItem(){}},document:{addEventListener(){},createElement:node,getElementById:id=>id==='t-test-tbody'?tbody:null},
    populateSubjectDropdown(){},subjectFamily:value=>value,txTitle:test=>test.title,SUBJ_ICONS:{},t:value=>value,
    fetch:async url=>({ok:true,json:async()=>url.includes('/students')?{students:[{id:'s1',email:'student@example.test',name:'მოსწავლე',grade:'5'}]}:url.includes('/attempts')?{attempts:[{id:'r1',userEmail:'student@example.test',score:8,maxScore:10,percentage:80,result:{subject:'ინგლისური'}}]}:{assignments:[]}}),
  };
  runInNewContext(management,context);
  assert.doesNotThrow(()=>context.renderTeacherTests());
  const renderedText=JSON.stringify(tbody);
  assert.match(renderedText,/გრამატიკა 3/);
  assert.match(renderedText,/სასწავლო გეგმასთან შესადარებელია/);
  for(const name of ['renderTeacherHome','renderTeacherStudents','renderTeacherAnalytics','renderAssignmentsList','renderAssignPanel'])context[name]=()=>{};
  await context.loadManagementData();
  assert.equal(context.USER_DB.filter(user=>user.role==='student').length,1);
  assert.equal(context.SESSION_RESULTS[0].pct,80);
  assert.equal(context.SESSION_RESULTS[0].userId,'student@example.test');
});

test("a management response from a previous session cannot repopulate private data", async () => {
  const management=await source('public/management-overrides.js');
  const pending=[];
  const context={REPORTS:[],ADMIN_AUDIT_LOG:[],USER_DB:[],SESSION_RESULTS:[],ASSIGNMENTS:[],ALL_TESTS:[],CUR_USER:{email:'teacher@example.test',role:'teacher'},localStorage:{removeItem(){}},document:{addEventListener(){}},fetch:()=>new Promise(resolve=>pending.push(resolve))};
  runInNewContext(management,context);
  const loading=context.loadManagementData();
  context.CUR_USER=null;
  for(const resolve of pending)resolve({ok:true,json:async()=>({students:[{email:'private@example.test'}],attempts:[],assignments:[]})});
  await loading;
  assert.equal(context.USER_DB.length,0);
  assert.equal(context.SESSION_RESULTS.length,0);
});

test("Supabase initialization is idempotent and generated assets bypass the worker", async () => {
  const [html, wrangler] = await Promise.all([source("public/app.html"), source("wrangler.jsonc")]);
  const init = html.slice(html.indexOf("async function initEduTestCloud"), html.indexOf("async function fetchCloudProfile"));
  assert.match(init, /if\(EDUTEST_CLOUD\.ready&&EDUTEST_CLOUD\.client\)return true;/);
  assert.match(wrangler, /"run_worker_first": \["\/\*", "!\/assets\/\*"\]/);
});

test("unauthorized role navigation never activates a privileged page", async () => {
  const html=await source('public/app.html');
  const goSource=html.slice(html.indexOf('function go(p){'),html.indexOf('// ── Sidebar (mobile)'));
  const active=[];
  const context={CUR_USER:{role:'student'},timerInt:null,clearGradeTheme(){},setTimeout(){},document:{body:{classList:{remove(){}}},querySelectorAll:()=>[],getElementById:id=>({classList:{add:value=>{if(value==='active')active.push(id);}}})}};
  runInNewContext(goSource,context);
  context.go('admin');context.go('teacher');
  assert.deepEqual(active,['p-landing','p-landing']);
  assert.match(html,/localStorage\.removeItem\('edutest_users'\);localStorage\.removeItem\('edutest_results'\)/);
  assert.match(html,/if\(generation!==EDUTEST_AUTH_GENERATION\)return;/);
});

test("late admin audit and report responses are discarded after logout", async () => {
  const management=await source('public/management-overrides.js'),pending=[];
  const context={REPORTS:[],ADMIN_AUDIT_LOG:[],CUR_USER:{email:'admin@example.test',role:'admin'},localStorage:{removeItem(){}},document:{addEventListener(){}},fetch:()=>new Promise(resolve=>pending.push(resolve))};
  runInNewContext(management,context);
  const loading=Promise.all([context.loadAuditLog(),context.loadReports()]);
  context.CUR_USER=null;
  for(const resolve of pending)resolve({ok:true,json:async()=>({events:[{adminEmail:'private@example.test'}],reports:[{userEmail:'private@example.test'}]})});
  await loading;
  assert.equal(context.REPORTS.length,0);assert.equal(context.ADMIN_AUDIT_LOG.length,0);
});

test("renders untrusted questions, options, CSV and AI feedback as text", async () => {
  const html = await source("public/app.html");
  const ai = html.slice(html.indexOf("function renderAiExplanation"), html.indexOf("const USER_DB"));
  const csv = html.slice(html.indexOf("function previewCSV"), html.indexOf("function importCSV"));
  assert.match(ai, /textContent/);
  assert.doesNotMatch(ai, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(csv, /textContent/);
  assert.doesNotMatch(csv, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(html, /_qtEl\.textContent=qTransText\(q\)/);
  assert.match(html, /const optionText=document\.createElement\('span'\)/);
  assert.match(html, /optionText\.textContent=String\(o\)/);
});

test("offers robust multilingual speech and post-grade AI explanations", async () => {
  const [html, ttsRoute, aiRoute] = await Promise.all([
    source("public/app.html"), source("app/api/tts/route.ts"), source("app/api/ai/feedback/route.ts"),
  ]);
  assert.match(html, /\/api\/tts/);
  assert.match(html, /\/api\/ai\/feedback/);
  assert.match(html, /AI მასწავლებლის ახსნა/);
  assert.match(html, /ამიხსენი შეცდომა/);
  assert.match(html, /if\(!q\|\|q\.ok\|\|q\.reveal===false/);
  assert.match(ttsRoute, /getSessionUser/);
  assert.match(aiRoute, /AI_UNDER18_SAFEGUARDS_ACKNOWLEDGED/);
});

test("loads the server management bridge before the assessment client", async () => {
  const html = await source("public/app.html");
  const management = html.indexOf('<script src="/management-overrides.js"></script>');
  const assessments = html.indexOf('<script src="/server-assessments.js"></script>');
  assert.ok(management > 0);
  assert.ok(assessments > management);
});

test("ships valid legal pages, icons and accessible dialog/input labels", async () => {
  const [html, terms, privacy] = await Promise.all([source("public/app.html"), source("app/terms/page.tsx"), source("app/privacy/page.tsx")]);
  await Promise.all([
    access(new URL("public/privacy.html", root)), access(new URL("public/terms.html", root)),
    access(new URL("public/og-v2.png", root)), access(new URL("public/favicon.svg", root)),
  ]);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /<label class="label" for="l-email"/);
  assert.match(html, /<label class="label" for="l-pass"/);
  assert.match(html, /Keep keyboard focus inside/);
  assert.match(terms, /გადახდის ფუნქცია და ფასიანი გამოწერები გამორთულია/);
  assert.match(privacy, /კონფიდენციალურობის პოლიტიკა/);
  assert.match(privacy, /მონაცემების ასლი/);
});
