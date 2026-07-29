import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/senior-math-bank.js", import.meta.url), "utf8");
const sandbox = { Q_POOL: {} };
vm.runInNewContext(`${source}\nglobalThis.__result={Q_POOL,tests:EDUTEST_SENIOR_MATH_TESTS,stats:EDUTEST_SENIOR_MATH_STATS};`, sandbox, {
  timeout: 30_000,
});

const { Q_POOL, tests, stats } = sandbox.__result;
const grades = [7, 8, 9, 10, 11, 12];
const directions = [
  { prefix: "alg", subject: "ალგებრა", statsKey: "algebra" },
  { prefix: "geom", subject: "გეომეტრია", statsKey: "geometry" },
];

test("senior mathematics is split into stable algebra and geometry inventories", () => {
  assert.equal(stats.tests, 72);
  assert.equal(stats.questions, 2304);
  assert.equal(stats.testsPerGrade, 12);
  assert.equal(stats.questionsPerGrade, 384);
  assert.equal(tests.length, 72);

  for (const grade of grades) {
    for (const { prefix, subject, statsKey } of directions) {
      const directionTests = tests.filter(row => row.grade === grade && row.subject === subject);
      assert.equal(directionTests.length, 6, `${subject} grade ${grade} test count`);
      assert.equal(stats.grades[grade][statsKey].tests, 6);
      assert.equal(stats.grades[grade][statsKey].questions, 192);
      assert.deepEqual([...new Set(directionTests.map(row => row.semester))], [1, 2]);
      assert.equal(directionTests.filter(row => row.testType === "unit").length, 4);
      assert.equal(directionTests.filter(row => row.testType === "sum").length, 2);

      const rows = [];
      for (let version = 1; version <= 4; version += 1) {
        const poolRows = Q_POOL[`${prefix}-g${grade}-${version}`];
        assert.equal(poolRows.length, 48, `${prefix} grade ${grade} version ${version}`);
        assert.equal(poolRows.filter(row => row.semester === 1).length, 24);
        assert.equal(poolRows.filter(row => row.semester === 2).length, 24);
        assert.equal(poolRows.filter(row => row.topicGroup === "s1-unit-a").length, 12);
        assert.equal(poolRows.filter(row => row.topicGroup === "s1-unit-b").length, 12);
        assert.equal(poolRows.filter(row => row.topicGroup === "s2-unit-a").length, 12);
        assert.equal(poolRows.filter(row => row.topicGroup === "s2-unit-b").length, 12);
        rows.push(...poolRows);
      }

      assert.equal(rows.length, 192);
      assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
      assert.equal(new Set(rows.map(row => row.text)).size, rows.length);
      assert.equal(new Set(rows.map(row => row.templateShape)).size, 48);
      assert.equal(new Set(rows.map(row => row.templateFamily)).size, rows.length);
      assert.equal(rows.filter(row => row.visual).length, 38);

      for (const row of rows) {
        assert.equal(row.grade, grade);
        assert.equal(row.gradeMin, grade);
        assert.equal(row.gradeMax, grade);
        assert.equal(row.subject, subject);
        assert.match(row.explain, /\S/u);
        assert.match(row.skill, new RegExp(`^${statsKey}\\.`));
        assert.match(row.outcome, new RegExp(`^NCP-CANDIDATE\\.MATH\\.G${grade}\\.`));
        assert.equal(row.reviewStatus, "generated_review_required");
        assert.equal(row.qualityStatus, "machine_validated");
        assert.ok([1, 2].includes(row.semester));
        assert.ok(["s1-unit-a", "s1-unit-b", "s2-unit-a", "s2-unit-b"].includes(row.topicGroup));
        assert.ok(Number(row.pts) > 0);
        if (["multiple_choice", "true_false"].includes(row.type)) {
          assert.ok(Array.isArray(row.opts) && row.opts.length >= 2);
          assert.ok(Number.isInteger(row.correct) && row.correct >= 0 && row.correct < row.opts.length);
          assert.equal(new Set(row.opts.map(String)).size, row.opts.length);
        } else if (row.type === 'calc') {
          assert.ok(Number.isFinite(row.correct));
          assert.equal(row.tolerance, 0);
        }
      }
    }
  }
});

test("catalog integration hides legacy combined math without breaking historical IDs", () => {
  const html = fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
  assert.match(html, /senior-math-bank\.js/);
  assert.match(html, /EDUTEST_SENIOR_MATH_TESTS/);
  assert.match(html, /legacy_combined_math/);
  assert.match(html, /test\.catalogHidden=true/);
  assert.match(html, /grade7:\['ალგებრა','გეომეტრია'/);
  assert.match(html, /secondary:\['ალგებრა','გეომეტრია'/);
  assert.match(html, /test\.topicGroup/);
});
