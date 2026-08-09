import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the public authentication and durable learning APIs", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /'\/api\/auth\/login':'\/api\/auth\/register'/);
  assert.match(html, /\/api\/auth\/oauth\/['"]?\+provider/);
  assert.match(html, /\['google','microsoft','facebook'\]/);
  assert.match(html, /id="oauth-facebook"/);
  assert.match(html, /\/api\/question-history/);
  assert.match(html, /syncAttemptToServer/);
});

test("uses a hardened OAuth authorization-code flow", async () => {
  const [startRoute, callbackRoute, authLibrary, envExample] = await Promise.all([
    readFile(new URL("app/api/auth/oauth/[provider]/route.ts", root), "utf8"),
    readFile(new URL("app/api/auth/oauth/[provider]/callback/route.ts", root), "utf8"),
    readFile(new URL("lib/auth.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(startRoute, /code_challenge_method", "S256"/);
  assert.match(startRoute, /scope", "openid email profile"/);
  assert.match(startRoute, /https:\/\/www\.facebook\.com\/dialog\/oauth/);
  assert.match(startRoute, /scope", "email,public_profile"/);
  assert.match(startRoute, /requestedRole/);
  assert.match(startRoute, /mode === "link"/);
  assert.doesNotMatch(startRoute, /User\.Read/);
  assert.match(callbackRoute, /profile\.email_verified !== true/);
  assert.match(callbackRoute, /https:\/\/graph\.facebook\.com\/oauth\/access_token/);
  assert.match(callbackRoute, /fields=id,name,email/);
  assert.match(callbackRoute, /"account-exists"/);
  assert.match(callbackRoute, /"provider-in-use"/);
  assert.match(callbackRoute, /"registration-details-required"/);
  assert.match(callbackRoute, /headers\.append\("Set-Cookie"/);
  assert.match(authLibrary, /APP_ORIGIN/);
  assert.match(authLibrary, /legacyPasswordIterations/);
  assert.match(authLibrary, /storedSalt\?\.match/);
  assert.match(envExample, /^APP_ORIGIN=/m);
  assert.match(envExample, /^FACEBOOK_APP_ID=/m);
  assert.match(envExample, /^FACEBOOK_APP_SECRET=/m);
});

test("keeps the embedded application full-screen without relying on external CSS", async () => {
  const [page, layout, worker] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
  ]);
  assert.match(page, /position: "fixed"/);
  assert.match(page, /width: "100vw"/);
  assert.match(page, /height: "100dvh"/);
  assert.match(page, /border: 0/);
  assert.match(layout, /overflow: "hidden"/);
  assert.match(layout, /margin: 0/);
  assert.match(worker, /url\.pathname === "\/"/);
  assert.match(worker, /appUrl\.pathname = "\/app\.html"/);
  assert.match(worker, /handler\.fetch\(new Request\(appUrl, request\), env, ctx\)/);
  assert.match(worker, /Cache-Control", "no-store"/);
});

test("centers the results page and keeps its actions clear on narrow screens", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /#p-results\{align-items:center!important;justify-content:flex-start!important/);
  assert.match(html, /class="results-shell"/);
  assert.match(html, /#results-btns\{justify-content:center/);
  assert.match(html, /#p-results\{padding:12px 12px 104px!important\}/);
  assert.match(html, /#results-btns \.btn\{width:100%;max-width:none/);
});

test("activates a dedicated child-friendly test interface for grades I-II", async () => {
  const [html, serverAssessments] = await Promise.all([
    readFile(new URL("public/app.html", root), "utf8"),
    readFile(new URL("public/server-assessments.js", root), "utf8"),
  ]);
  assert.match(html, /function applyTestAgeMode\(test\)/);
  assert.match(html, /grade<=2/);
  assert.match(html, /classList\.toggle\('test-early',early\)/);
  assert.match(html, /id="q-early-guide"/);
  assert.match(html, /body\.test-early #q-card/);
  assert.match(html, /body\.test-early \.qopt\{min-height:68px/);
  assert.match(html, /body\.test-early \.fill-input\{min-width:155px;min-height:56px/);
  assert.match(html, /q\.type==='fill'\?'✏️ ჩაწერე'/);
  assert.match(html, /წაიკითხე წინადადება და ჩაწერე გამოტოვებული სიტყვა/);
  assert.match(html, /inp\.autocomplete='off';inp\.spellcheck=false/);
  assert.match(html, /if\(p!==['"]take-test['"]\)document\.body\.classList\.remove\(['"]test-early['"]\)/);
  assert.match(serverAssessments, /applyTestAgeMode\(curTest\)/);
});

test("keeps test access open while payments are disabled and uses server-side admin accounts", async () => {
  const [html, bootstrapRoute, adminUsersRoute, profileRoute] = await Promise.all([
    readFile(new URL("public/app.html", root), "utf8"),
    readFile(new URL("app/api/admin/bootstrap/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/users/route.ts", root), "utf8"),
    readFile(new URL("app/api/auth/profile/route.ts", root), "utf8"),
  ]);
  assert.match(html, /const PAYMENTS_ENABLED=false/);
  assert.match(html, /if\(!PAYMENTS_ENABLED\)return 'free'/);
  assert.match(html, /ტესტირების ეტაპზე გადახდები გამორთულია/);
  assert.doesNotMatch(html, /BOG Pay Merchant ID|TBC Pay API Key|api\/payments\/webhook/);
  assert.doesNotMatch(html, /id="b-paid"|payStep2\(|payComplete\(/);
  assert.doesNotMatch(html, /id="landing-price-monthly"/);
  assert.doesNotMatch(html, /password:'(?:student|teacher|admin)123'/);
  assert.match(html, /\/api\/admin\/users/);
  assert.match(bootstrapRoute, /ADMIN_BOOTSTRAP_TOKEN/);
  assert.match(adminUsersRoute, /current\?\.user\.role === "admin"/);
  assert.match(profileRoute, /hashPassword/);
});

test("keeps teacher authoring aligned with the canonical grade taxonomy", async () => {
  const [html, customTestsRoute, management] = await Promise.all([
    readFile(new URL("public/app.html", root), "utf8"),
    readFile(new URL("app/api/custom-tests/route.ts", root), "utf8"),
    readFile(new URL("public/management-overrides.js", root), "utf8"),
  ]);
  assert.match(html, /function populateBuilderSubjects\(\)/);
  assert.match(html, /const allowed=subjectsForGrade\(grade\)/);
  assert.match(html, /subjectFamily\(test\.subject\)===subject/);
  assert.match(html, /const canonicalOrder=\['მათემატიკა','ქართული','ქართული ენა და ლიტერატურა'/);
  assert.doesNotMatch(html, /const subjectValues=/);
  assert.match(customTestsRoute, /"ქართული ენა და ლიტერატურა"/);
  assert.match(customTestsRoute, /subjectAllowedForGrade\(subject, grade\)/);
  assert.match(management, /populateBuilderSubjects\(\)/);
  assert.match(management, /subjectFamily\(test\.subject\)===subject/);
});

test("renders teacher-authored labels and question options as text", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /\$\{esc\(txTitle\(tx\)\)\}/);
  assert.match(html, /\$\{esc\(rTitle\(r\)\)\}/);
  assert.match(html, /itemText\.textContent=String\(item\)/);
  assert.match(html, /optionText\.textContent=String\(o\)/);
  assert.doesNotMatch(html, /row\.innerHTML=.*\+item\+/);
  assert.doesNotMatch(html, /d\.innerHTML=.*\+o\+/);
});

test("validates reported scores and restricts assignment deletion to its owner", async () => {
  const [attemptsRoute, assignmentsRoute] = await Promise.all([
    readFile(new URL("app/api/attempts/route.ts", root), "utf8"),
    readFile(new URL("app/api/assignments/route.ts", root), "utf8"),
  ]);
  assert.match(attemptsRoute, /expectedPct/);
  assert.match(attemptsRoute, /body\.assessmentMode !== "practice"/);
  assert.match(attemptsRoute, /verified: false/);
  assert.match(attemptsRoute, /status: 409/);
  assert.match(attemptsRoute, /users\.email/);
  assert.match(assignmentsRoute, /assignments\.createdBy, current\.user\.id/);
});

test("ships the benchmark-informed responsive EduTest design system", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /EDUTEST DESIGN SYSTEM 2026/);
  assert.match(html, /class="landing-v2"/);
  assert.match(html, /რეკომენდებული შემდეგი ნაბიჯი/);
  assert.match(html, /#p-landing>div:not\(\.landing-v2\)/);
  assert.match(html, /lp_beta_title/);
  for (const id of ["lp-question-count", "lp-test-count", "lp-subject-count", "lp-today-tests", "lp-excellent", "lp-average-score"]) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, "g"))].length, 1, `${id} must be unique`);
  }
});

test("uses a cheerful calm backdrop and robust multilingual question speech", async () => {
  const [html, ttsRoute, envExample] = await Promise.all([
    readFile(new URL("public/app.html", root), "utf8"),
    readFile(new URL("app/api/tts/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(html, /--canvas:#ece7f4/);
  assert.match(html, /rgba\(77,61,171,.23\)/);
  assert.match(html, /background:linear-gradient\(155deg,#1d2745,#121a31\)/);
  assert.match(html, /lp_demo_title/);
  assert.doesNotMatch(html, /მოგესალმები, მარიამ/);
  assert.match(html, /const TTS_LANGS=\{ka:'ka-GE',en:'en-US',ru:'ru-RU'\}/);
  assert.match(html, /speechSynthesis\.getVoices\(\)/);
  assert.match(html, /window\.toggleQuestionSpeech=function/);
  assert.match(html, /id='q-read-aloud'/);
  assert.match(html, /id="res-read-aloud"/);
  assert.match(html, /function detectSpeechCode/);
  assert.match(html, /function questionSpeechPayload/);
  assert.match(html, /function effectiveCorrectAnswer/);
  assert.match(html, /fetch\('\/api\/tts'/);
  assert.match(html, /Manual playback is always available/);
  assert.doesNotMatch(html, /if\(window\.isTTSOn&&isTTSOn\(\)\)/);
  assert.match(ttsRoute, /ka-GE-EkaNeural/);
  assert.match(ttsRoute, /getSessionUser/);
  assert.match(ttsRoute, /MAX_REQUESTS_PER_MINUTE/);
  assert.match(envExample, /^AZURE_SPEECH_KEY=/m);
  assert.match(envExample, /^AZURE_SPEECH_REGION=/m);
});

test("uses curriculum gating, composite history identities, and adaptive skills", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /function isCurriculumEligible\(test\)/);
  assert.match(html, /curriculum-alignment\.js/);
  assert.match(html, /CURRICULUM_ALIGNMENT\.infer/);
  assert.match(html, /String\(test\.pool\|\|''\)\.startsWith\('hist-'\)&&grade<7/);
  assert.match(html, /function subjectsForGrade\(grade\)/);
  assert.match(html, /function isTestVisibleToStudent\(test,userGrade\)/);
  assert.match(html, /Math\.abs\(tg-ug\)<=1/);
  assert.match(html, /isSubjectAvailableForGrade\(test\.subject,userGrade\)/);
  assert.match(html, /const exactGrade=gradeScoped\.filter/);
  assert.match(html, /const subset=exactGrade\.length>=Number\(test\.count\|\|0\)\?exactGrade:gradeScoped/);
  assert.match(html, /_historyId:\(q\._sourcePoolKey\|\|poolKey\)\+'\|'\+q\.id/);
  assert.match(html, /function questionContentFingerprint/);
  assert.match(html, /function questionSemanticFingerprint/);
  assert.match(html, /function dedupeQuestionCandidates/);
  assert.match(html, /function balanceQuestionShapes/);
  assert.match(html, /function spreadQuestionTypes/);
  assert.match(html, /strictShape\?1:2/);
  assert.match(html, /_contentHistoryId:questionContentFingerprint\(q\)/);
  assert.match(html, /_semanticHistoryId:questionSemanticFingerprint\(q\)/);
  assert.match(html, /function ensureQuestionHistoryOwner/);
  assert.match(html, /content:media:/);
  assert.match(html, /function isStructurallyValidQuestion/);
  assert.match(html, /function hasQuestionEncodingCorruption/);
  assert.doesNotMatch(html, /სასწავლო მიმართულების კანდიდატი/);
  assert.match(html, /generated-bank-validator\.js/);
  assert.match(html, /function hasSufficientCatalogDiversity\(test\)/);
  assert.match(html, /q\.validationStatus==='blocked'/);
  assert.match(html, /სავარჯიშო ტესტი · თვითშემოწმება/);
  assert.match(html, /curTestQs\.flatMap\(q=>\[q\._historyId\|\|q\.id,q\._contentHistoryId,q\._semanticHistoryId\]/);
  assert.match(html, /skillPerf/);
  assert.match(html, /AI_REMEDIATION_BANK/);
  assert.doesNotMatch(html, /ჩვენ ___ ვართ ბედნიერი/);
  assert.doesNotMatch(html, /"ყველაე"/);
});

test("includes accessible visual questions and honest AI feedback labels", async () => {
  const [html, aiRoute, envExample] = await Promise.all([
    readFile(new URL("public/app.html", root), "utf8"),
    readFile(new URL("app/api/ai/feedback/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(html, /რომელი ცხოველია გამოსახული/);
  assert.match(html, /q\.media\.src/);
  assert.match(html, /AI დამხმარის განმარტება/);
  assert.match(html, /\/api\/ai\/feedback/);
  assert.doesNotMatch(html, />AI შეცდომების ანალიზი</);
  assert.match(aiRoute, /AI_UNDER18_SAFEGUARDS_ACKNOWLEDGED/);
  assert.match(aiRoute, /AI_FEEDBACK_ENABLED/);
  assert.match(envExample, /AI_FEEDBACK_ENABLED=false/);

  await Promise.all([
    "cow.svg",
    "chicken.svg",
    "bird.svg",
    "butterfly.svg",
  ].map(name => access(new URL(`public/media/animals/${name}`, root))));
});

test("question bank has no malformed records and publishes its audit", async () => {
  const [report, quality, expansion] = await Promise.all([
    readFile(new URL("reports/question-bank-audit.json", root), "utf8").then(JSON.parse),
    readFile(new URL("reports/question-content-quality.json", root), "utf8").then(JSON.parse),
    readFile(new URL("public/expanded-question-bank.js", root), "utf8"),
  ]);
  assert.equal(report.malformed.length, 0);
  assert.ok(report.summary.questions >= 10_800);
  assert.ok(report.summary.visualQuestions >= 900);
  assert.equal(report.summary.questionsMappedToCurriculumDomain, report.summary.questions);
  assert.equal(report.summary.approvedDomainAlignments, 0);
  assert.equal(report.summary.candidateExplicitAlignments, 32);
  assert.ok(report.summary.candidateGeneratedAlignments >= 4_200);
  assert.ok(report.summary.candidateDomainAlignments >= 4_000);
  assert.ok(report.summary.blockedCurriculumStageQuestions > 0);
  assert.ok(report.summary.blockedUnpublishedPoolQuestions > 0);
  await access(new URL("reports/question-curriculum-alignment.json", root));
  assert.equal(report.readiness.technicalIntegrity, "pass_with_identity_warnings");
  assert.equal(report.readiness.curriculumTraceability, "candidate_domain_level");
  assert.equal(report.readiness.exactGradeTraceability, "incomplete");
  assert.equal(quality.summary.encodingCorruptedQuestions, 0);
  assert.ok(quality.summary.duplicateOptionQuestions > 0);
  assert.ok(quality.summary.publishedSafeUniqueQuestions >= 8_206);
  assert.ok(quality.summary.generatedExpansionQuestions >= 4_103);
  assert.ok(quality.summary.generatedExpansionVisualQuestions >= 800);
  assert.ok(quality.summary.generatedVisualShare >= 0.2);
  assert.ok(quality.summary.generatedVisualShare <= 0.35);
  assert.ok(quality.summary.generatedInteractiveShare >= 0.2);
  assert.equal(quality.summary.duplicateQuestionTextsWithinExactGrade, 0);
  assert.equal(quality.summary.subjectsBelowDouble, 0);
  assert.equal(quality.summary.testsWithInsufficientSafeQuestions, 0);
  assert.equal(quality.summary.testsWithoutExactGradeVerification, 0);
  assert.equal(quality.summary.primaryTestsWithInsufficientExactGradeQuestions, 0);
  assert.equal(quality.summary.generatedPlaceholderOptions, 0);
  assert.equal(quality.summary.generatedIncompletePrompts, 0);
  assert.equal(quality.summary.generatedGradePolicyViolations, 0);
  assert.equal(quality.summary.primarySemanticFamilyShortfalls, 0);
  assert.match(expansion, /generated_review_required/);
  assert.match(expansion, /curriculumSource/);
  assert.match(expansion, /q\.templateShape=`\$\{prefix\}\.g\$\{grade\}\.\$\{skill\}`/);
  assert.doesNotMatch(expansion, /დამატებითი სავარჯიშო \$\{context\.variant\}/);
});

test("renders variable option counts, complete fill prompts, and real version totals", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /const idxs=optsNow\.map\(\(_,\s*i\)=>i\)/);
  assert.doesNotMatch(html, /const idxs=\[0,1,2,3\]/);
  assert.match(html, /function getPoolVersionCount\(poolBase\)/);
  assert.match(html, /getPoolVersionCount\(tx\.pool\)/);
  assert.match(html, /const expression=separator>0&&separator<120/);
  assert.doesNotMatch(html, /Override q-text to hide original/);
});
