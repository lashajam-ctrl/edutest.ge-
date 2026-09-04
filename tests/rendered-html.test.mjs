import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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
  const [html, client] = await Promise.all([source("public/app.html"), source("public/server-assessments.js")]);
  for (const id of ["lp-question-count", "lp-test-count", "lp-subject-count", "lp-today-tests", "lp-excellent", "lp-average-score"]) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, "g"))].length, 1, `${id} must be unique`);
  }
  assert.match(html, /id="lp-live-status" role="status" aria-live="polite"/);
  assert.match(client, /fetch\('\/api\/public\/stats'/);
  assert.match(client, /რეალური მაჩვენებლები დროებით მიუწვდომელია/);
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
  assert.match(management, /fetch\('\/api\/custom-tests/);
  assert.match(management, /loadManagementData/);
  assert.match(customTests, /\["teacher", "admin"\]\.includes/);
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
  const html = await source("public/app.html");
  await Promise.all([
    access(new URL("public/privacy.html", root)), access(new URL("public/terms.html", root)),
    access(new URL("public/og-v2.png", root)), access(new URL("public/favicon.svg", root)),
  ]);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /<label class="label" for="l-email"/);
  assert.match(html, /<label class="label" for="l-pass"/);
  assert.match(html, /Keep keyboard focus inside/);
});
