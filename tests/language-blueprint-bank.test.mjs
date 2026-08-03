import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const validator = fs.readFileSync(new URL("../public/generated-bank-validator.js", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../public/language-blueprint-bank.js", import.meta.url), "utf8");

function loadBank() {
  const sandbox = { Q_POOL: {} };
  vm.runInNewContext(`${validator}\n${source}`, sandbox, { timeout: 30_000 });
  return sandbox;
}

test("language blueprint bank has the expected exact-grade inventory", () => {
  const sandbox = loadBank();
  const stats = sandbox.EDUTEST_LANGUAGE_STATS;
  const tests = sandbox.EDUTEST_LANGUAGE_TESTS;
  const pools = sandbox.Q_POOL;

  assert.equal(stats.questions, 4_992);
  assert.equal(stats.validation.checked, 4_992);
  assert.equal(stats.validation.blocked, 0);
  assert.equal(stats.tests, 156);
  assert.equal(stats.prematureTopicViolations, 0);
  assert.equal(Object.keys(pools).length, 104);
  assert.equal(tests.length, 156);

  assert.deepEqual(
    Object.fromEntries(Object.entries(stats.languages).map(([key, row]) => [
      key,
      { grades: Object.keys(row.grades).length, questions: row.questions, tests: row.tests },
    ])),
    {
      ka: { grades: 6, questions: 1_152, tests: 36 },
      en: { grades: 12, questions: 2_304, tests: 72 },
      ru: { grades: 8, questions: 1_536, tests: 48 },
    },
  );
});

test("every language question is unique, grade-aligned, traceable and structurally valid", () => {
  const { Q_POOL } = loadBank();
  const questions = Object.values(Q_POOL).flat();

  assert.equal(new Set(questions.map(question => question.id)).size, questions.length);
  assert.equal(new Set(questions.map(question => question.text)).size, questions.length);
  assert.equal(questions.filter(question => question.type === "fill").length, 1_248);
  assert.ok(questions.filter(question => question.visual).length >= 990);

  for (const question of questions) {
    assert.equal(question.gradeMin, question.grade);
    assert.equal(question.gradeMax, question.grade);
    assert.ok(question.grade >= question.topicIntroducedGrade, `${question.id} starts before its allowed grade`);
    assert.ok(question.component);
    assert.ok(question.topic);
    assert.ok(question.blueprintBucket);
    assert.ok(question.skill);
    assert.ok(question.outcome);
    assert.ok(question.explain);
    assert.ok(question.curriculumSource);
    assert.equal(question.copyrightStatus, "original_or_public_domain");
    assert.equal(question.validationStatus, "release_validated");
    if (question.type === "multiple_choice") {
      assert.equal(question.opts.length, 4);
      assert.equal(new Set(question.opts).size, 4);
      assert.ok(Number.isInteger(question.correct));
      assert.ok(question.correct >= 0 && question.correct < question.opts.length);
    } else if (question.type === "fill") {
      assert.equal((question.text.match(/___/g) || []).length, 1);
      assert.equal(question.blanks.length, 1);
      assert.ok(question.blanks[0]);
    } else {
      assert.fail(`Unexpected question type: ${question.type}`);
    }
  }
});

test("all ready tests have deterministic allocations summing exactly to the paper size", () => {
  const sandbox = loadBank();
  const tests = sandbox.EDUTEST_LANGUAGE_TESTS;
  const pools = sandbox.Q_POOL;

  for (const row of tests) {
    assert.equal(Object.values(row.blueprintAllocation).reduce((sum, value) => sum + value, 0), row.count);
    const weightTotal = Object.values(row.contentBlueprint).reduce((sum, value) => sum + value, 0);
    for (const [bucket, count] of Object.entries(row.blueprintAllocation)) {
      const ideal = row.count * row.contentBlueprint[bucket] / weightTotal;
      assert.ok(Math.abs(count - ideal) <= 1, `${row.id} exceeds ±1 for ${bucket}`);
    }

    const available = Object.entries(pools)
      .filter(([poolKey]) => poolKey.startsWith(`${row.pool}-`))
      .flatMap(([, questions]) => questions)
      .filter(question => question.grade === row.grade
        && question.semester === row.semester
        && (!row.topicGroup || question.topicGroup === row.topicGroup));
    for (const [bucket, count] of Object.entries(row.blueprintAllocation)) {
      assert.ok(available.filter(question => question.blueprintBucket === bucket).length >= count,
        `${row.id} has insufficient ${bucket} questions`);
    }
  }

  const georgian = tests.filter(row => row.pool.startsWith("kab-"));
  assert.ok(georgian.every(row => row.componentCounts.language === Math.round(row.count * 0.4)));
  assert.ok(georgian.every(row => row.componentCounts.literature === row.count - row.componentCounts.language));
});

test("application keeps legacy language results readable but publishes only blueprint banks", () => {
  const html = fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
  assert.match(html, /language-blueprint-bank\.js/);
  assert.match(html, /legacy_shared_grade_language/);
  assert.match(html, /EDUTEST_LANGUAGE_TESTS/);
  assert.match(html, /ქართული ენა და ლიტერატურა/);
  assert.match(html, /selectQuestionsByBlueprint/);
  assert.match(html, /testCompositionChip/);
  assert.doesNotMatch(html, /grade7:\['ალგებრა','გეომეტრია','ქართული','ინგლისური'/);
});
