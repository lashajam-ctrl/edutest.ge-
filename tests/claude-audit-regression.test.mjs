import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("generated-bank release gate checks every output and blocks no family", async () => {
  const report = JSON.parse(await readFile(new URL("reports/generated-bank-release-gate.json", root), "utf8"));
  assert.equal(report.releaseGate, "pass");
  assert.equal(report.summary.generatedOutputsFullyChecked, 7_296);
  assert.equal(report.summary.blockedOutputs, 0);
  assert.equal(report.summary.prematureTopicViolations, 0);
  assert.equal(report.summary.testDiversityFailures, 0);
  assert.equal(report.summary.exceptions, 0);
  assert.ok(report.summary.generatorSkillFamilies >= 235);
  assert.ok(report.summary.deterministicTemplateFamilies >= 3_519);
  assert.equal(report.summary.proofCounts.computationallyRecomputed
    + report.summary.proofCounts.directAnswerAgreement
    + report.summary.proofCounts.curatedFactoryRule
    + report.summary.proofCounts.curatedLanguageRuleTable, 7_296);
});

test("Claude findings are verified against the current full bank", async () => {
  const report = JSON.parse(await readFile(new URL("reports/claude-audit-verification.json", root), "utf8"));
  const matrix = Object.fromEntries(report.verificationMatrix.map(row => [row.id, row.status]));
  assert.ok(report.current.questions >= 19_731);
  assert.equal(report.current.seniorMathQuestions, 2_304);
  assert.equal(report.current.languageBlueprintQuestions, 4_992);
  assert.equal(report.findings.ambiguousBars.all, 0);
  assert.equal(report.findings.earlyUnknownMinuend.all, 0);
  assert.equal(report.findings.internalMetadataVisible, false);
  assert.equal(report.findings.practiceLabelPresent, true);
  assert.equal(report.findings.duplicateOptions.liveSelectable, 0);
  assert.equal(report.findings.duplicateOptions.blockedBySelector, report.findings.duplicateOptions.published);
  assert.equal(matrix.duplicate_distractors_20, "false_positive");
  assert.equal(matrix.ambiguous_bar_extrema, "confirmed_fixed");
  assert.equal(matrix.learner_internal_metadata, "confirmed_fixed");
  assert.equal(matrix.grade_1_2_unknown_minuend, "confirmed_fixed");
  assert.equal(matrix.client_answer_exposure, "deferred_mitigated");
});

test("punctuation and orthography differences remain valid answer choices", async () => {
  const source = await readFile(new URL("public/generated-bank-validator.js", root), "utf8");
  assert.match(source, /replace\(\/\\s\+\/gu, ' '\)/);
  assert.doesNotMatch(source, /const optionKey = value => normalize\(value\)/);
});
