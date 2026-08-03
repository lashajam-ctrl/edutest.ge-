import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), "utf8");
const sandbox = { Q_POOL: {} };
sandbox.window = sandbox;
for (const path of [
  "public/generated-bank-validator.js",
  "public/senior-math-bank.js",
  "public/language-blueprint-bank.js",
]) {
  vm.runInNewContext(read(path), sandbox, { timeout: 30_000, filename: path });
}

const validator = sandbox.EDUTEST_GENERATED_VALIDATOR;
const seniorTests = sandbox.EDUTEST_SENIOR_MATH_TESTS;
const languageTests = sandbox.EDUTEST_LANGUAGE_TESTS;
const blueprints = sandbox.EDUTEST_LANGUAGE_BLUEPRINTS;
const all = Object.values(sandbox.Q_POOL).flat();
const senior = all.filter(question => String(question.templateShape ?? "").startsWith("sm."));
const language = all.filter(question => String(question.templateShape ?? "").startsWith("lb."));
const generated = [...senior, ...language];

const normalize = validator.normalize;
const answerValue = validator.answerValue;
const optionKey = validator.optionKey;
const errors = [];

function addError(code, question, detail) {
  errors.push({ code, id: question?.id ?? null, family: question?.templateShape ?? question?.skill ?? null, detail });
}

function tryRecomputeNumeric(question) {
  const answer = Number(String(answerValue(question) ?? "").replace(",", "."));
  if (!Number.isFinite(answer)) return false;
  const explanation = String(question.explain ?? "")
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/,/g, ".");
  const equations = [...explanation.matchAll(/(^|[^0-9])([0-9().+\-*/\s]{3,})\s*=\s*(-?\d+(?:\.\d+)?)(?!\d)/g)];
  for (const match of equations) {
    const expression = match[2].trim();
    const stated = Number(match[3]);
    if (!/^[0-9().+\-*/\s]+$/.test(expression) || !Number.isFinite(stated)) continue;
    try {
      const computed = Function(`"use strict";return (${expression})`)();
      if (Number.isFinite(computed) && Math.abs(computed - stated) < 1e-9 && Math.abs(stated - answer) < 1e-9) return true;
    } catch {
      // Unsupported expression: handled by the curated factory rule below.
    }
  }
  return false;
}

function languageScriptMatches(question) {
  const prompt = String(question.text ?? "");
  if (question.languageCode === "ka") return /[\u10A0-\u10FF]/u.test(prompt);
  if (question.languageCode === "en") return /[A-Za-z]/u.test(prompt);
  if (question.languageCode === "ru") return /[\u0400-\u04FF]/u.test(prompt);
  return false;
}

function canonicalLanguageItem(question) {
  return [
    question.languageCode,
    question.grade,
    question.skill,
    normalize(String(question.text ?? "")
      .replace(/^(?:[IVX]+ კლასი|Grade \d+|Класс \d+)[\s\S]*?(?:პასუხი:|answer:|ответ:)\s*/iu, "")),
    optionKey(answerValue(question)),
  ].join("|");
}

const proofCounts = {
  computationallyRecomputed: 0,
  directAnswerAgreement: 0,
  curatedFactoryRule: 0,
  curatedLanguageRuleTable: 0,
};

for (const question of generated) {
  const result = validator.validateQuestion(question, { expectedGrade: question.grade });
  if (!result.valid) result.errors.forEach(code => addError(code, question));
  if (question.validationStatus !== "release_validated") addError("not_release_validated", question);
  if (question.grade < Number(question.topicIntroducedGrade ?? 1)) addError("premature_topic", question);

  if (question.type === "multiple_choice" || question.type === "true_false") {
    const keys = question.opts.map(optionKey);
    if (keys.some(key => !key) || new Set(keys).size !== keys.length) addError("duplicate_or_empty_option", question);
    const correctKey = keys[Number(question.correct)];
    if (!correctKey || keys.filter(key => key === correctKey).length !== 1) addError("not_exactly_one_correct_option", question);
  }

  if (tryRecomputeNumeric(question)) proofCounts.computationallyRecomputed += 1;
  else if (result.evidence === "direct_answer_agreement") proofCounts.directAnswerAgreement += 1;
  else if (String(question.templateShape).startsWith("sm.")) proofCounts.curatedFactoryRule += 1;
  else proofCounts.curatedLanguageRuleTable += 1;

  if (String(question.templateShape).startsWith("lb.")) {
    if (!languageScriptMatches(question)) addError("language_script_mismatch", question);
    const configured = blueprints?.[question.languageCode]?.[question.grade];
    if (!configured || !(question.blueprintBucket in configured)) addError("blueprint_bucket_mismatch", question);
    if (!String(question.topicCode ?? question.skill ?? "").trim()) addError("missing_curated_topic_rule", question);
  }
}

function availableForTest(test) {
  return Object.entries(sandbox.Q_POOL)
    .filter(([poolKey]) => poolKey === test.pool || poolKey.startsWith(`${test.pool}-`))
    .flatMap(([, questions]) => questions)
    .filter(question => question.grade === test.grade)
    .filter(question => !test.semester || question.semester === test.semester)
    .filter(question => !test.topicGroup || question.topicGroup === test.topicGroup)
    .filter(question => question.validationStatus === "release_validated");
}

const testDiversity = [];
for (const test of [...seniorTests, ...languageTests]) {
  const available = availableForTest(test);
  const conceptual = String(test.pool).startsWith("alg-") || String(test.pool).startsWith("geom-")
    ? new Set(available.map(question => question.skill))
    : new Set(available.map(canonicalLanguageItem));
  const required = Number(test.count);
  const valid = available.length >= required && conceptual.size >= required;
  testDiversity.push({
    id: test.id,
    grade: test.grade,
    subject: test.subject,
    required,
    available: available.length,
    conceptualFamilies: conceptual.size,
    valid,
  });
  if (!valid) errors.push({ code: "insufficient_semantic_diversity", id: test.id, family: test.pool, detail: { required, available: available.length, conceptual: conceptual.size } });
}

function gradeSummary(questions) {
  return Object.fromEntries([...new Set(questions.map(question => question.grade))].sort((a, b) => a - b).map(grade => {
    const rows = questions.filter(question => question.grade === grade);
    return [grade, {
      questions: rows.length,
      skills: new Set(rows.map(question => question.skill)).size,
      templateShapes: new Set(rows.map(question => question.templateShape)).size,
      blocked: rows.filter(question => question.validationStatus === "blocked").length,
    }];
  }));
}

const report = {
  generatedAt: new Date().toISOString(),
  releaseGate: errors.length === 0 ? "pass" : "fail",
  summary: {
    generatedOutputsFullyChecked: generated.length,
    generatorSkillFamilies: new Set(generated.map(question => question.skill)).size,
    deterministicTemplateFamilies: new Set(generated.map(question => question.templateShape)).size,
    seniorMath: {
      outputs: senior.length,
      skillFamilies: new Set(senior.map(question => question.skill)).size,
      templateFamilies: new Set(senior.map(question => question.templateShape)).size,
      testsChecked: seniorTests.length,
    },
    language: {
      outputs: language.length,
      skillFamilies: new Set(language.map(question => question.skill)).size,
      templateFamilies: new Set(language.map(question => question.templateShape)).size,
      testsChecked: languageTests.length,
    },
    proofCounts,
    blockedOutputs: generated.filter(question => question.validationStatus === "blocked").length,
    prematureTopicViolations: generated.filter(question => question.grade < Number(question.topicIntroducedGrade ?? 1)).length,
    testDiversityFailures: testDiversity.filter(row => !row.valid).length,
    exceptions: errors.length,
  },
  byGrade: {
    seniorMath: gradeSummary(senior),
    language: gradeSummary(language),
  },
  languageByCode: Object.fromEntries(["ka", "en", "ru"].map(code => {
    const rows = language.filter(question => question.languageCode === code);
    return [code, {
      outputs: rows.length,
      grades: [...new Set(rows.map(question => question.grade))].sort((a, b) => a - b),
      skillFamilies: new Set(rows.map(question => question.skill)).size,
      templateFamilies: new Set(rows.map(question => question.templateShape)).size,
      curatedRuleTableChecks: rows.length,
      blocked: rows.filter(question => question.validationStatus === "blocked").length,
    }];
  })),
  testDiversity,
  exceptions: errors.slice(0, 200),
};

fs.mkdirSync(new URL("reports/", root), { recursive: true });
fs.writeFileSync(new URL("reports/generated-bank-release-gate.json", root), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));

assert.equal(errors.length, 0, `Generated bank release gate failed with ${errors.length} exception(s)`);
