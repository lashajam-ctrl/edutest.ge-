import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("v11 platform importer blocks the three confirmed defect classes", async () => {
  const source = await readFile(new URL("../scripts/import-v11-question-bank.mjs", import.meta.url), "utf8");
  assert.match(source, /BROKEN_CONTEXT_IDS/);
  assert.match(source, /sme_prefilled_physics_biology\.csv/);
  assert.match(source, /answerRow\.answer_json === "null"/);
  assert.match(source, /review_status.*algorithmically_validated/s);
  assert.match(source, /media_asset_not_in_archive/);
  assert.match(source, /dailyFullFreshTests/);
  assert.doesNotMatch(source, /curriculum_reviewed/);
});

test("generated v11 report passes server-only answer and semantic capacity gates", async () => {
  const report = JSON.parse(await readFile(new URL("../reports/v11-platform-import-report.json", import.meta.url), "utf8"));
  assert.equal(report.sourceVersion, "v11");
  assert.equal(report.confirmedFixes.biologyRetags, 42);
  assert.equal(report.confirmedFixes.missingContextBlocked, 18);
  assert.equal(report.confirmedFixes.missingAnswerBlocked, 31);
  assert.equal(report.answerKeysServerOnly, report.importedQuestions);
  assert.equal(report.capacity.every(row => row.semanticGroups >= row.testQuestions), true);
  assert.equal(Object.values(report.validations).every(value => value === "pass"), true);
  assert.match(report.humanReview, /not_performed/);
});
