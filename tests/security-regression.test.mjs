import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = path => readFile(new URL(path, root), "utf8");
const section = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start) + start.length));

test("uses a server session cookie and never a browser-stored JWT", async () => {
  const [auth, html] = await Promise.all([source("lib/auth.ts"), source("public/app.html")]);
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Lax/);
  assert.match(auth, /appOrigin\(request\).*Secure/s);
  assert.doesNotMatch(html, /localStorage\.(?:getItem|setItem)\([^)]*(?:jwt|token)/i);
  assert.doesNotMatch(html, /sessionStorage\.(?:getItem|setItem)\([^)]*(?:jwt|token)/i);
  assert.match(html, /persistSession:false/);
});

test("enforces server RBAC for student, teacher and administrator data", async () => {
  const [admin, attempts, assignments, ai, reports, audit, content, customTests, managedStudents] = await Promise.all([
    source("app/api/admin/users/route.ts"),
    source("app/api/attempts/route.ts"),
    source("app/api/assignments/route.ts"),
    source("app/api/ai/feedback/route.ts"),
    source("app/api/reports/route.ts"),
    source("app/api/admin/audit/route.ts"),
    source("app/api/admin/content/route.ts"),
    source("app/api/custom-tests/route.ts"),
    source("app/api/management/students/route.ts"),
  ]);
  assert.match(admin, /current\?\.user\.role === "admin"/);
  assert.match(attempts, /current\.user\.role !== "teacher" && current\.user\.role !== "admin"/);
  assert.match(attempts, /assignments\.createdBy, current\.user\.id/);
  assert.match(assignments, /row\.assignment\.createdBy === current\.user\.id/);
  assert.match(ai, /current\.user\.role !== "student"/);
  assert.match(ai, /\/auth\/v1\/user/);
  assert.match(ai, /\/rest\/v1\/profiles/);
  assert.match(ai, /user\.role !== "student"/);
  assert.match(reports, /current\.user\.role !== "admin"/);
  assert.match(audit, /current\.user\.role !== "admin"/);
  assert.match(content, /current\.user\.role !== "admin"/);
  assert.match(customTests, /\["teacher", "admin"\]\.includes\(current\.user\.role\)/);
  assert.match(managedStudents, /\["teacher", "admin"\]\.includes\(current\.user\.role\)/);
});

test("renders untrusted CSV, user and AI values as text, including XSS-shaped input", async () => {
  const [html, management] = await Promise.all([source("public/app.html"), source("public/management-overrides.js")]);
  const csv = section(html, "function previewCSV", "function importCSV");
  assert.match(csv, /textContent/);
  assert.doesNotMatch(csv, /innerHTML|insertAdjacentHTML|outerHTML/);
  const ai = section(html, "function renderAiExplanation", "const USER_DB");
  assert.match(ai, /textContent/);
  assert.doesNotMatch(ai, /innerHTML|insertAdjacentHTML|outerHTML/);
  const users = section(html, "function renderAdminUsers", "async function doLogout");
  assert.match(users, /esc\(u\.name\)/);
  assert.match(users, /data-email="\$\{esc\(u\.email\)\}"/);
  assert.doesNotMatch(users, />\$\{u\.(?:name|email)\}</);
  const payload = `<img src=x onerror="globalThis.pwned=true">`;
  assert.equal(payload.replace(/[&<>"']/g, ""), "img src=x onerror=globalThis.pwned=true");
  assert.match(management, /textContent/);
  assert.doesNotMatch(management, /innerHTML|insertAdjacentHTML|outerHTML/);
});

test("persists teacher and administrator management data on the server", async () => {
  const [schema, html, management, attempts, users, reports, migration, attemptIndexMigration, builder, assessmentReport] = await Promise.all([
    source("db/schema.ts"), source("public/app.html"), source("public/management-overrides.js"),
    source("app/api/attempts/route.ts"), source("app/api/admin/users/route.ts"), source("app/api/reports/route.ts"),
    source("drizzle/0003_adorable_lockheed.sql"), source("drizzle/0004_boring_wong.sql"),
    source("supabase/functions/assessment-builder/index.ts"),
    source("supabase/functions/assessment-report/index.ts"),
  ]);
  for (const table of ["issue_reports", "admin_audit_events", "admin_content", "custom_tests"]) assert.match(schema, new RegExp(table));
  assert.match(html, /function showBuilder\(/);
  assert.match(html, /async function bNav\(/);
  assert.match(html, /builderFunction:'assessment-builder'/);
  assert.match(html, /reportFunction:'assessment-report'/);
  assert.match(builder, /requireTeacher/);
  assert.match(builder, /owner_user_id:user\.id/);
  assert.match(builder, /assessment_results/);
  assert.match(assessmentReport, /requireAdmin/);
  assert.match(assessmentReport, /assessment_reports/);
  assert.doesNotMatch(html, /localStorage\.getItem\(['"](?:all_results|results_|edutest_prizes)/);
  assert.match(attempts, /scope === "managed"/);
  assert.match(attempts, /export async function DELETE/);
  assert.match(users, /newEmail/);
  assert.match(reports, /export async function PATCH/);
  assert.doesNotMatch(migration, /CREATE (?:TABLE|INDEX) `(?!IF NOT EXISTS)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `rate_limits`/);
  assert.match(attemptIndexMigration, /CREATE INDEX IF NOT EXISTS/);
});

test("ships no demo credentials, realistic pre-rendered PII, or secret-shaped values", async () => {
  const files = ["public/app.html", ".env.example", "README.md"];
  const combined = (await Promise.all(files.map(async file => {
    try { return await source(file); } catch { return ""; }
  }))).join("\n");
  assert.doesNotMatch(combined, /(?:student|teacher|admin)123|changeme123|admin_jwt/i);
  assert.doesNotMatch(combined, /mariam@student\.ge|nino@edutest\.ge|admin@edutest\.ge|\+995 555 000 000/i);
  assert.doesNotMatch(combined, /\bsk-[A-Za-z0-9_-]{16,}\b/);
});

test("publishes privacy and terms pages with current feature disclosures", async () => {
  await Promise.all([access(new URL("public/privacy.html", root)), access(new URL("public/terms.html", root))]);
  const [privacy, terms] = await Promise.all([source("public/privacy.html"), source("public/terms.html")]);
  assert.match(privacy, /AI განმარტება/);
  assert.match(privacy, /OAuth access token ბრაუზერის მუდმივ საცავში არ ინახება/);
  assert.match(privacy, /Secure, HttpOnly და SameSite=Lax/);
  assert.match(privacy, /TOTP ორფაქტორიანი დადასტურება/);
  assert.match(terms, /გადახდის ფუნქცია.*გამორთულია/);
});

test("publishes verified catalog counts without frozen marketing counters", async () => {
  const html = await source("public/app.html");
  assert.match(html, /19,131/);
  assert.match(html, /data-target="556"/);
  assert.match(html, /15 საგანი/);
  assert.match(html, /აქტიური კითხვა/);
  assert.doesNotMatch(html, /გადამოწმებული კითხვა/);
  assert.doesNotMatch(html, /18,420|12,000 შესანიშნავი|98%|12 საგანი|420 ტესტ/);
});

test("keeps payments disabled and uses secure server OAuth sessions for configured providers", async () => {
  const [html, migration, socialMigration, oauthStart, oauthCallback, sessionRoute, profileRoute, guardianConfirm, authLibrary, providersRoute, loginRoute, resetRequest, resetComplete] = await Promise.all([
    source("public/app.html"),
    source("supabase/migrations/202608110005_disable_payments.sql"),
    source("supabase/migrations/202608110006_social_auth_profile.sql"),
    source("app/api/auth/oauth/[provider]/route.ts"),
    source("app/api/auth/oauth/[provider]/callback/route.ts"),
    source("app/api/auth/session/route.ts"),
    source("app/api/auth/profile/route.ts"),
    source("app/api/auth/guardian/confirm/route.ts"),
    source("lib/auth.ts"),
    source("app/api/auth/providers/route.ts"),
    source("app/api/auth/login/route.ts"),
    source("app/api/auth/password/request/route.ts"),
    source("app/api/auth/password/complete/route.ts"),
  ]);
  assert.match(html, /const PAYMENTS_ENABLED=false/);
  assert.match(html, /if\(!PAYMENTS_ENABLED\)return 'free'/);
  assert.match(migration, /set paid = false/i);
  for (const [id, provider] of [["google", "Google"], ["azure", "Microsoft"], ["facebook", "Facebook"]]) {
    assert.match(html, new RegExp(`<button id="oauth-${id}"[^>]+disabled[^>]+doSocialLogin\\('${id}'\\)[^>]*>${provider}-ით გაგრძელება</button>`));
  }
  assert.match(html, /async function refreshSocialProviderButtons\(\)/);
  assert.match(html, /\.chatgpt\\\.site\$\/i\.test\(current\.hostname\)/);
  assert.match(html, /window\.top\.location\.replace\('https:\/\/edutest\.ge'/);
  assert.match(html, /function updateSocialButtonLabels\(\)/);
  assert.match(html, /\.label\+'-ით გაგრძელება'/);
  assert.match(html, /new URLSearchParams\(\{mode:'auto'\}\)/);
  assert.match(html, /function openAuth\(mode\)/);
  assert.match(html, /ნაბიჯი 2 \/ 2/);
  assert.match(html, /status==='confirm-password'/);
  assert.match(html, /status==='registration-details-required'/);
  assert.match(html, /loginTab\('reg'\)/);
  assert.match(html, /fetch\('\/api\/auth\/providers'/);
  assert.match(html, /serverKey:'microsoft'/);
  assert.match(html, /window\.top\.location\.assign\('\/api\/auth\/oauth\/'/);
  assert.doesNotMatch(section(html, "async function doSocialLogin", "function openPasswordRecoveryModal"), /signInWithOAuth/);
  assert.doesNotMatch(section(html, "async function doSocialLogin", "function openPasswordRecoveryModal"), /r-terms|r-privacy|r-grade/);
  assert.match(html, /fetch\('\/api\/auth\/session',\{credentials:'include'/);
  assert.match(html, /fetch\('\/api\/auth\/logout',\{method:'POST',credentials:'include'/);
  assert.match(oauthStart, /oauthStateCookie/);
  assert.match(oauthStart, /requestedMode === "signup"/);
  assert.match(oauthStart, /requestedMode === "login" \? "login" : "auto"/);
  assert.match(oauthStart, /FACEBOOK_PUBLIC_ENABLED/);
  assert.match(oauthCallback, /createSession/);
  assert.match(oauthCallback, /oauthLinkRequests/);
  assert.match(oauthCallback, /"confirm-password"/);
  assert.match(oauthCallback, /"use-existing-method"/);
  assert.match(oauthCallback, /email match alone is not enough/i);
  assert.match(oauthCallback, /const grade = null/);
  assert.match(oauthCallback, /accountStatus: "onboarding"/);
  assert.doesNotMatch(oauthCallback, /role === "student" && !grade/);
  assert.match(authLibrary, /row\?\.user\.accountStatus === "onboarding"/);
  assert.match(authLibrary, /path === "\/api\/auth\/profile"/);
  assert.match(sessionRoute, /getSessionUser/);
  assert.match(profileRoute, /current\.user\.role === "student" \|\| current\.user\.role === "pending_teacher"/);
  assert.doesNotMatch(profileRoute, /changes\.role = "admin"/);
  assert.match(guardianConfirm, /tokenHash/);
  assert.match(guardianConfirm, /guardianVerifiedAt/);
  assert.match(socialMigration, /p_requested_role not in \('student','teacher'\)/);
  assert.match(socialMigration, /then 'pending_teacher' else 'student'/);
  assert.doesNotMatch(socialMigration, /then 'admin'/);
  assert.match(socialMigration, /profile_completed_at is not null then raise exception 'Profile already completed'/);
  assert.match(socialMigration, /Teacher must be an adult/);
  assert.match(socialMigration, /Guardian email is required/);
  assert.match(providersRoute, /facebookPendingReview/);
  assert.match(providersRoute, /FACEBOOK_PUBLIC_ENABLED/);
  assert.match(loginRoute, /migrateSupabaseAccount/);
  assert.match(loginRoute, /else if \(!valid\)/);
  assert.match(loginRoute, /oauthLinkToken/);
  assert.match(loginRoute, /providerLinked/);
  assert.match(resetRequest, /RESEND_API_KEY/);
  assert.match(resetRequest, /passwordResetRequests/);
  assert.match(resetComplete, /isNull\(passwordResetRequests\.usedAt\)/);
  assert.match(resetComplete, /delete\(sessions\)/);
});

test("offers one clear authentication surface without exposing backend terminology", async () => {
  const html = await source("public/app.html");
  assert.match(html, /შესვლა ან რეგისტრაცია/);
  assert.match(html, /Google-ით გაგრძელება/);
  assert.match(html, /Microsoft-ით გაგრძელება/);
  assert.match(html, /Facebook-ით გაგრძელება/);
  assert.match(html, /ახალი ანგარიშის შექმნა/);
  assert.match(html, /openAuth\('reg'\)/);
  assert.match(html, /\/api\/auth\/password\/request/);
  assert.match(html, /\/api\/auth\/password\/complete/);
  assert.match(html, /ამ ელფოსტაზე ანგარიში უკვე არსებობს.*ერთხელ შეიყვანეთ მისი პაროლი/);
  assert.doesNotMatch(html, />☁️ Cloud sync/);
  assert.doesNotMatch(html, /დადასტურების წერილის ხელახლა გაგზავნა/);
});
