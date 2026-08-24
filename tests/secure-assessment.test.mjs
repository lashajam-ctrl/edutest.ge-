import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = path => readFile(new URL(path, root), "utf8");

test("keeps active answer keys out of public assets", async () => {
  const [html, client, expanded, senior, language] = await Promise.all([
    source("public/app.html"), source("public/server-assessments.js"), source("public/expanded-question-bank.js"),
    source("public/senior-math-bank.js"), source("public/language-blueprint-bank.js"),
  ]);
  const publicText = [html, client, expanded, senior, language].join("\n");
  assert.doesNotMatch(publicText, /g1m1_01/);
  assert.doesNotMatch(publicText, /assessment_answer_keys|answer_key_json/);
  assert.doesNotMatch(html, /\bQ_POOL\b/);
  assert.match(html, /startFunction:'assessment-start'/);
  assert.match(html, /submitFunction:'assessment-submit'/);
  assert.match(client, /\/api\/assessments\/start/);
  assert.match(client, /\/api\/assessments\/submit/);
});

test("connects every sign-in method to the cookie-authenticated assessment client", async () => {
  const [html, client, start] = await Promise.all([
    source("public/app.html"), source("public/server-assessments.js"), source("app/api/assessments/start/route.ts"),
  ]);
  assert.match(html, /<script src="\/server-assessments\.js"><\/script>/);
  assert.match(html, /fetch\('\/api\/auth\/login'.*credentials:'include'/s);
  assert.match(html, /fetch\('\/api\/auth\/register'.*credentials:'include'/s);
  assert.doesNotMatch(html, /auth\.signInWithPassword|auth\.signUp\(/);
  assert.match(client, /fetch\('\/api\/assessments\/start'/);
  assert.match(client, /fetch\('\/api\/assessments\/submit'/);
  assert.match(client, /credentials:'include'/);
  assert.doesNotMatch(client, /EDUTEST_CLOUD|CATALOG_DIVERSITY_CACHE|performanceBadgeLabel|isCurriculumEligible/);
  assert.match(start, /if \(test\.is_custom\) \{\s*const attemptCount/s);
});

test("renders and starts only tests from the current server catalog", async () => {
  const [html, client] = await Promise.all([
    source("public/app.html"), source("public/server-assessments.js"),
  ]);
  assert.match(client, /ALL_TESTS\.splice\(0,ALL_TESTS\.length,\.\.\.byId\.values\(\)\)/);
  assert.match(client, /installCatalog\(data\.tests\|\|\[\],true\)/);
  assert.match(client, /startTestById=async function/);
  assert.match(client, /test&&test\.serverBacked&&String\(test\.id\)===String\(id\)/);
  assert.match(client, /if\(response\.status===404\)[\s\S]*await loadServerCatalog\(true\)/);
  assert.match(client, /ტესტების კატალოგი განახლდა\. გთხოვთ, აირჩიოთ ტესტი ხელახლა\./);
  assert.match(html, /ALL_TESTS\.filter\(tx=>tx&&tx\.serverBacked===true\)/);
});

test("uses the secure session cookie for AI feedback", async () => {
  const html = await source("public/app.html");
  const feedbackCall = html.match(/fetch\('\/api\/ai\/feedback'[\s\S]{0,800}/)?.[0] ?? "";
  assert.match(feedbackCall, /credentials:'include'/);
  assert.doesNotMatch(feedbackCall, /Authorization|access_token|getSession\(/);
});

test("restores warm grade-aware interfaces without changing the secure assessment flow", async () => {
  const [html, client] = await Promise.all([source("public/app.html"), source("public/server-assessments.js")]);
  for (const band of ["grade-band-early", "grade-band-primary", "grade-band-middle", "grade-band-senior"]) assert.match(html, new RegExp(band));
  assert.match(html, /function applyTestAgeMode\(test\)/);
  assert.match(html, /id="q-grade-guide"/);
  assert.match(html, /--warm:#e96f57/);
  assert.match(html, /#p-landing\{background:linear-gradient\(145deg,#35264f/);
  assert.match(client, /applyTestAgeMode\(curTest\)/);
});

test("starts sanitized sessions and grades only on the server", async () => {
  const [start, submit, catalog, questions, builder] = await Promise.all([
    source("app/api/assessments/start/route.ts"), source("app/api/assessments/submit/route.ts"),
    source("app/api/assessments/catalog/route.ts"), source("app/api/assessments/questions/route.ts"),
    source("app/api/assessments/builder/route.ts"),
  ]);
  assert.match(start, /getSessionUser/);
  assert.match(start, /assessmentSelectionKey|selectionGroups/);
  assert.match(start, /assessment_question_history/);
  assert.doesNotMatch(start, /assessment_answer_keys|answer_key_json/);
  assert.match(submit, /INNER JOIN assessment_answer_keys/);
  assert.match(submit, /gradeAssessmentAnswer/);
  assert.match(submit, /assessment_question_history/);
  assert.doesNotMatch(catalog + questions, /answer_key_json|assessment_answer_keys/);
  assert.match(builder, /questionIds/);
  assert.doesNotMatch(builder, /correct\s*:/);
});

test("publishes real D1 counts and a complete validated import report", async () => {
  const [stats, reportText] = await Promise.all([source("app/api/public/stats/route.ts"), source("reports/assessment-import-report.json")]);
  const report = JSON.parse(reportText);
  assert.match(stats, /assessmentQuestions/);
  assert.match(stats, /assessmentTests/);
  assert.equal(report.sourceQuestions, 12_600);
  assert.equal(report.sourceTests, 336);
  assert.equal(report.importedTests, 336);
  assert.equal(report.uniqueIds, 12_600);
  assert.equal(report.lowDiversityPools.every(pool => pool.semanticGroups >= 5), true);
  assert.equal("answerKeys" in report, false);
});

test("reveals tutoring explanations only after server-side grading", async () => {
  const [html, submit, migration] = await Promise.all([
    source("public/app.html"), source("supabase/functions/assessment-submit/index.ts"),
    source("supabase/migrations/202608110004_enable_post_submit_review.sql"),
  ]);
  assert.match(submit, /const reveal=s\.mode==='practice'\|\|!!test\.reveal_answers/);
  assert.match(submit, /results\.map\(x=>revealReview/);
  assert.match(migration, /set reveal_answers = true/i);
  assert.match(html, /🤖 ამიხსენი შეცდომა/);
  assert.doesNotMatch(html, /"correct"\s*:/);
});

test("accepts class-section labels and exposes one unified senior mathematics subject", async () => {
  const [assessment, start, catalog, client, html, importer, reportText] = await Promise.all([
    source("lib/assessment.ts"), source("app/api/assessments/start/route.ts"),
    source("app/api/assessments/catalog/route.ts"), source("public/server-assessments.js"),
    source("public/app.html"), source("scripts/import-assessment-bank.mjs"),
    source("reports/assessment-import-report.json"),
  ]);
  const report = JSON.parse(reportText);
  assert.match(assessment, /function schoolGradeNumber/);
  assert.match(start, /schoolGradeNumber\(current\.user\.grade\)/);
  assert.match(start, /assessmentSubjectComponents/);
  assert.match(catalog, /preferredSeniorMath/);
  assert.doesNotMatch(html, /subject:'(?:ალგებრა|გეომეტრია)'/);
  assert.match(html, /id:'math-g12-s1'.*subject:'მათემატიკა'/);
  assert.match(html, /15 საგანი/);
  assert.doesNotMatch(importer, /status: "split"/);
  assert.equal(report.importedTests, 336);
  assert.equal(report.subjectMapping.split, undefined);
  assert.equal(report.gradeSubjectSemester["7|მათემატიკა|1"], 75);
  assert.equal(report.gradeSubjectSemester["12|მათემატიკა|2"], 75);
});
