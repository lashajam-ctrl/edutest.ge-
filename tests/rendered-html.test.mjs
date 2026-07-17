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
  assert.match(worker, /Cache-Control", "no-store"/);
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
  assert.doesNotMatch(html, /password:'(?:student|teacher|admin)123'/);
  assert.match(html, /\/api\/admin\/users/);
  assert.match(bootstrapRoute, /ADMIN_BOOTSTRAP_TOKEN/);
  assert.match(adminUsersRoute, /current\?\.user\.role === "admin"/);
  assert.match(profileRoute, /hashPassword/);
});

test("validates reported scores and restricts assignment deletion to its owner", async () => {
  const [attemptsRoute, assignmentsRoute] = await Promise.all([
    readFile(new URL("app/api/attempts/route.ts", root), "utf8"),
    readFile(new URL("app/api/assignments/route.ts", root), "utf8"),
  ]);
  assert.match(attemptsRoute, /expectedPct/);
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
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /--canvas:#ece7f4/);
  assert.match(html, /rgba\(77,61,171,.23\)/);
  assert.match(html, /background:linear-gradient\(155deg,#1d2745,#121a31\)/);
  assert.match(html, /lp_demo_title/);
  assert.doesNotMatch(html, /მოგესალმები, მარიამ/);
  assert.match(html, /const TTS_LANGS=\{ka:'ka-GE',en:'en-US',ru:'ru-RU'\}/);
  assert.match(html, /speechSynthesis\.getVoices\(\)/);
  assert.match(html, /window\.toggleQuestionSpeech=function/);
  assert.match(html, /id='q-read-aloud'/);
  assert.match(html, /Manual playback is always available/);
  assert.doesNotMatch(html, /if\(window\.isTTSOn&&isTTSOn\(\)\)/);
});

test("uses curriculum gating, composite history identities, and adaptive skills", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /function isCurriculumEligible\(test\)/);
  assert.match(html, /curriculum-alignment\.js/);
  assert.match(html, /CURRICULUM_ALIGNMENT\.infer/);
  assert.match(html, /Number\(test\.grade\)<7/);
  assert.match(html, /_historyId:\(q\._sourcePoolKey\|\|poolKey\)\+'\|'\+q\.id/);
  assert.match(html, /skillPerf/);
  assert.match(html, /AI_REMEDIATION_BANK/);
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
  const report = JSON.parse(await readFile(new URL("reports/question-bank-audit.json", root), "utf8"));
  assert.equal(report.malformed.length, 0);
  assert.ok(report.summary.questions >= 5_000);
  assert.ok(report.summary.visualQuestions >= 16);
  assert.equal(report.summary.questionsMappedToCurriculumDomain, report.summary.questions);
  assert.ok(report.summary.approvedDomainAlignments >= 4_000);
  assert.ok(report.summary.blockedCurriculumStageQuestions > 0);
  assert.ok(report.summary.blockedUnpublishedPoolQuestions > 0);
  await access(new URL("reports/question-curriculum-alignment.json", root));
  assert.equal(report.readiness.technicalIntegrity, "pass_with_identity_warnings");
});
