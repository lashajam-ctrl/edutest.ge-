import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonicalAssessmentSubject, ASSESSMENT_SUBJECTS_BY_GRADE } from '../lib/school-policy.mjs';

const root = new URL("../", import.meta.url);
const source = path => readFile(new URL(path, root), "utf8");

test("senior mathematics is one catalog subject backed by mixed strands", async () => {
  const [legacy, assessment, start, catalog, html, reportText] = await Promise.all([
    source("public/senior-math-bank.js"), source("lib/assessment.ts"),
    source("app/api/assessments/start/route.ts"), source("app/api/assessments/catalog/route.ts"),
    source("public/app.html"),
    source("reports/assessment-import-report.json"),
  ]);
  const report = JSON.parse(reportText);
  assert.match(legacy, /RETIRED = true/);
  assert.match(assessment, /canonicalAssessmentSubject/);
  assert.equal(canonicalAssessmentSubject('ალგებრა',7),'მათემატიკა');
  assert.equal(canonicalAssessmentSubject('გეომეტრია',12),'მათემატიკა');
  assert.match(start, /geometry_space/);
  assert.match(start, /Math\.floor\(targetCount \* 0\.4\)/);
  assert.match(catalog, /preferredSeniorMath/);
  assert.doesNotMatch(html, /7:\['ალგებრა','გეომეტრია'/);
  assert.deepEqual(ASSESSMENT_SUBJECTS_BY_GRADE[7].slice(0,2),['მათემატიკა','ქართული ენა და ლიტერატურა']);
  assert.match(html,/SCHOOL_SUBJECTS_BY_GRADE=globalThis\.EduTestSchoolRules\.subjectsByGrade/);
  assert.match(html, /function subjectFamily\(value\)/);
  assert.match(html, /\['ალგებრა','გეომეტრია'\]\.includes\(subject\)/);
  assert.equal(report.importedTests, 336);
  for (const grade of [7, 8, 9, 10, 11, 12]) {
    assert.equal(report.gradeSubjectSemester[`${grade}|მათემატიკა|1`], 75);
    assert.equal(report.gradeSubjectSemester[`${grade}|მათემატიკა|2`], 75);
    assert.equal(report.gradeSubjectSemester[`${grade}|ალგებრა|1`], undefined);
    assert.equal(report.gradeSubjectSemester[`${grade}|გეომეტრია|1`], undefined);
  }
});
