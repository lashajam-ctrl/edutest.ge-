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
  assert.doesNotMatch(html, /Q_POOL\[['"]/);
  assert.match(html, /const Q_POOL=\{\};/);
  assert.match(client, /\/api\/assessments\/start/);
  assert.match(client, /\/api\/assessments\/submit/);
});

test("starts sanitized sessions and grades only on the server", async () => {
  const [start, submit, catalog, questions, builder] = await Promise.all([
    source("app/api/assessments/start/route.ts"), source("app/api/assessments/submit/route.ts"),
    source("app/api/assessments/catalog/route.ts"), source("app/api/assessments/questions/route.ts"),
    source("app/api/assessments/builder/route.ts"),
  ]);
  assert.match(start, /getSessionUser/);
  assert.match(start, /semanticGroups/);
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
  assert.equal(report.importedTests, 360);
  assert.equal(report.uniqueIds, 12_600);
  assert.equal(report.lowDiversityPools.every(pool => pool.semanticGroups >= 5), true);
  assert.equal("answerKeys" in report, false);
});
