import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { allocateByWeight, componentCountsForTest, languageBlueprintFor } from "../lib/assessment-selection.ts";

const root = new URL("../", import.meta.url);
const source = path => readFile(new URL(path, root), "utf8");

test("retires public language answer banks and keeps selection server-side", async () => {
  const [legacy, start, submit] = await Promise.all([
    source("public/language-blueprint-bank.js"),
    source("app/api/assessments/start/route.ts"),
    source("app/api/assessments/submit/route.ts"),
  ]);
  assert.match(legacy, /EDUTEST_LANGUAGE_BANK_RETIRED = true/);
  assert.doesNotMatch(legacy, /correct|answer|blanks|opts/);
  assert.match(start, /languageBlueprintFor/);
  assert.match(start, /languageBucketFor/);
  assert.match(start, /componentCounts/);
  assert.match(submit, /answer_key_json/);
});

test("uses deterministic configurable 40\/60 Georgian composition", () => {
  assert.deepEqual(languageBlueprintFor("ქართული ენა და ლიტერატურა", 7), { language: 40, literature: 60 });
  assert.deepEqual(componentCountsForTest("ქართული", 12, 20), { language: 8, literature: 12 });
  assert.equal(Object.values(allocateByWeight(19, { language: 40, literature: 60 })).reduce((sum, value) => sum + value, 0), 19);
});

test("increases foreign-language use-of-language weight with grade", () => {
  assert.deepEqual(languageBlueprintFor("ინგლისური", 1), { grammar: 20, vocabulary: 35, reading: 30, use_of_language: 15 });
  assert.deepEqual(languageBlueprintFor("ინგლისური", 6), { grammar: 30, vocabulary: 25, reading: 25, use_of_language: 20 });
  assert.deepEqual(languageBlueprintFor("რუსული", 12), { grammar: 30, vocabulary: 15, reading: 25, use_of_language: 30 });
});

test("current v11 import supplies exact-grade language capacity", async () => {
  const report = JSON.parse(await source("reports/assessment-import-report.json"));
  for (const grade of [7, 8, 9, 10, 11]) {
    for (const subject of ["ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული"]) {
      for (const semester of [1, 2]) assert.equal(report.gradeSubjectSemester[`${grade}|${subject}|${semester}`], 75);
    }
  }
  for (const semester of [1, 2]) {
    assert.equal(report.gradeSubjectSemester[`12|ქართული ენა და ლიტერატურა|${semester}`], 75);
    assert.equal(report.gradeSubjectSemester[`12|ინგლისური|${semester}`], 75);
  }
  assert.equal(report.answerKeysServerOnly, report.importedQuestions);
  assert.ok(Object.values(report.validations).every(value => value === "pass"));
});
