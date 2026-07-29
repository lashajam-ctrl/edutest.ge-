import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8");
const alignmentSource = fs.readFileSync(new URL("../public/curriculum-alignment.js", import.meta.url), "utf8");
const expansionSource = fs.readFileSync(new URL("../public/expanded-question-bank.js", import.meta.url), "utf8");
const seniorMathSource = fs.readFileSync(new URL("../public/senior-math-bank.js", import.meta.url), "utf8");
const languageBlueprintSource = fs.readFileSync(new URL("../public/language-blueprint-bank.js", import.meta.url), "utf8");
const helpersStart = html.indexOf("const mc=");
const translationsStart = html.indexOf("const Q_TRANS=");
const testsStart = html.indexOf("const ALL_TESTS=");
const testsEnd = html.indexOf("];", testsStart) + 2;
const catalogBootstrapEnd = html.indexOf("// Student catalog follows", testsEnd);
if ([helpersStart, translationsStart, testsStart].some(index => index < 0) || testsEnd < 2) throw new Error("Question bank markers were not found");

// Some newer banks are appended after the translation table. Evaluate those
// standalone assignments too, without loading the large translation payload.
const appendedPools = html.slice(translationsStart, testsStart)
  .match(/Q_POOL\[['"][^'\"]+['"]\]\s*=\s*\[[\s\S]*?\n\];/g) ?? [];
const source = `${html.slice(helpersStart, translationsStart)}\n${appendedPools.join("\n")}\n${expansionSource}\n${seniorMathSource}\n${languageBlueprintSource}\n${html.slice(testsStart, testsEnd)}\n${html.slice(testsEnd, catalogBootstrapEnd)}\nglobalThis.__audit={Q_POOL,ALL_TESTS,expansionStats:globalThis.EDUTEST_EXPANSION_STATS,seniorMathStats:globalThis.EDUTEST_SENIOR_MATH_STATS,languageStats:globalThis.EDUTEST_LANGUAGE_STATS,languageBlueprints:globalThis.EDUTEST_LANGUAGE_BLUEPRINTS};`;
const sandbox = {};
vm.runInNewContext(source, sandbox, { timeout: 30_000 });
vm.runInNewContext(alignmentSource, sandbox, { timeout: 30_000 });
const { Q_POOL, ALL_TESTS, expansionStats, seniorMathStats, languageStats, languageBlueprints } = sandbox.__audit;
const alignmentEngine = sandbox.CURRICULUM_ALIGNMENT;
if (!alignmentEngine?.infer) throw new Error("Curriculum alignment engine was not loaded");
const poolContexts = new Map();
for (const test of ALL_TESTS) {
  const current = poolContexts.get(test.pool) ?? { subjects: new Set(), grades: new Set(), tests: [] };
  current.subjects.add(test.subject); current.grades.add(Number(test.grade)); current.tests.push(test.id);
  poolContexts.set(test.pool, current);
}
const questions = Object.entries(Q_POOL).flatMap(([poolKey, rows]) => rows.map(question => {
  const basePool = alignmentEngine.basePool(poolKey);
  const context = poolContexts.get(basePool) ?? { subjects: new Set(), grades: new Set(), tests: [] };
  const subject = [...context.subjects][0] ?? "უცნობი საგანი";
  const grades = [...context.grades].filter(Number.isFinite).sort((a, b) => a - b);
  const alignment = alignmentEngine.infer(question, { pool: basePool, subject, grades, hasPublishedTest: grades.length > 0 });
  return { ...question, poolKey, basePool, subject, grades, alignment };
}));
const byId = new Map();
const duplicateIds = [];
const duplicateTexts = [];
const textIndex = new Map();
const malformed = [];

for (const q of questions) {
  if (!q.id || !q.text || !q.type || !Number.isFinite(q.pts)) malformed.push({ id: q.id, poolKey: q.poolKey, reason: "missing required field" });
  if (byId.has(q.id)) duplicateIds.push({ id: q.id, pools: [byId.get(q.id), q.poolKey] }); else byId.set(q.id, q.poolKey);
  const normalized = String(q.text || "").toLocaleLowerCase("ka-GE").replace(/\s+/g, " ").trim();
  if (normalized) {
    if (textIndex.has(normalized) && textIndex.get(normalized) !== q.id) duplicateTexts.push({ text: normalized.slice(0, 140), ids: [textIndex.get(normalized), q.id] });
    else textIndex.set(normalized, q.id);
  }
  if (["multiple_choice", "true_false"].includes(q.type) && (!Array.isArray(q.opts) || !Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.opts.length)) {
    malformed.push({ id: q.id, poolKey: q.poolKey, reason: "invalid options/correct index" });
  }
}

const testsBySubjectGrade = {};
for (const test of ALL_TESTS) {
  const key = `${test.subject} · ${test.grade}`;
  testsBySubjectGrade[key] ??= { tests: 0, requestedQuestions: 0, pools: new Set() };
  testsBySubjectGrade[key].tests += 1;
  testsBySubjectGrade[key].requestedQuestions += Number(test.count || 0);
  testsBySubjectGrade[key].pools.add(test.pool);
}
for (const row of Object.values(testsBySubjectGrade)) row.pools = [...row.pools];

const languageQuestions = questions.filter(question => String(question.id || "").startsWith("lb26-"));
const prematureLanguageTopicRows = languageQuestions.filter(question => Number(question.grade) < Number(question.topicIntroducedGrade || 1));
const languageCoverage = Object.values(Object.groupBy(languageQuestions, question => `${question.languageCode}|${question.grade}`))
  .map(rows => ({
    language: rows[0].languageCode,
    grade: Number(rows[0].grade),
    questions: rows.length,
    components: Object.fromEntries(Object.entries(Object.groupBy(rows, question => question.component)).map(([key, values]) => [key, values.length])),
    blueprintBuckets: Object.fromEntries(Object.entries(Object.groupBy(rows, question => question.blueprintBucket)).map(([key, values]) => [key, values.length])),
  })).sort((a, b) => `${a.language}-${a.grade}`.localeCompare(`${b.language}-${b.grade}`, "en", { numeric: true }));
const languageBlueprintChecks = ALL_TESTS.filter(test => test.contentBlueprint && !test.catalogHidden).map(test => {
  const expected = test.blueprintAllocation || {};
  const expectedTotal = Object.values(expected).reduce((sum, value) => sum + Number(value || 0), 0);
  const weightTotal = Object.values(test.contentBlueprint).reduce((sum, value) => sum + Number(value || 0), 0);
  const deviations = Object.entries(expected).map(([bucket, count]) => Math.abs(Number(count) - Number(test.count) * Number(test.contentBlueprint[bucket]) / weightTotal));
  const available = questions.filter(question => question.basePool === test.pool
    && Number(question.grade) === Number(test.grade)
    && Number(question.semester) === Number(test.semester)
    && (!test.topicGroup || question.topicGroup === test.topicGroup));
  const availableByBucket = Object.fromEntries(Object.entries(Object.groupBy(available, question => question.blueprintBucket)).map(([key, rows]) => [key, rows.length]));
  const shortages = Object.entries(expected).filter(([bucket, count]) => Number(availableByBucket[bucket] || 0) < Number(count)).map(([bucket]) => bucket);
  return {id:test.id,grade:test.grade,subject:test.subject,requested:test.count,expectedTotal,maxRoundingDeviation:Math.max(0,...deviations),shortages,expected,availableByBucket};
});
const languageBlueprintViolations = languageBlueprintChecks.filter(row => row.expectedTotal !== Number(row.requested)
  || row.maxRoundingDeviation > 1.000001 || row.shortages.length);
const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    pools: Object.keys(Q_POOL).length,
    tests: ALL_TESTS.length,
    questions: questions.length,
    uniqueQuestionIds: byId.size,
    visualQuestions: questions.filter(q => q.media?.src || q.visual).length,
    questionsWithExplanation: questions.filter(q => q.explain).length,
    questionsWithSkillTag: questions.filter(q => q.skill).length,
    questionsWithOutcomeTag: questions.filter(q => q.outcome).length,
    questionsMappedToCurriculumDomain: questions.filter(q => q.alignment?.outcomeId).length,
    approvedDomainAlignments: questions.filter(q => q.alignment?.reviewStatus?.startsWith("approved_")).length,
    candidateDomainAlignments: questions.filter(q => q.alignment?.reviewStatus === "candidate_domain_alignment").length,
    candidateExplicitAlignments: questions.filter(q => q.alignment?.reviewStatus === "candidate_explicit_alignment").length,
    candidateGeneratedAlignments: questions.filter(q => q.alignment?.reviewStatus === "candidate_generated_alignment").length,
    alignmentsRequiringReview: questions.filter(q => q.alignment?.reviewStatus === "review_required").length,
    blockedCurriculumStageQuestions: questions.filter(q => q.alignment?.reviewStatus === "blocked_curriculum_stage").length,
    blockedUnpublishedPoolQuestions: questions.filter(q => q.alignment?.reviewStatus === "blocked_unpublished_pool").length,
    generatedExpansionQuestions: expansionStats?.generated ?? 0,
    generatedExpansionVisualQuestions: expansionStats?.visual ?? 0,
    seniorMathQuestions: seniorMathStats?.questions ?? 0,
    seniorMathTests: seniorMathStats?.tests ?? 0,
    languageBlueprintQuestions: languageStats?.questions ?? 0,
    languageBlueprintTests: languageStats?.tests ?? 0,
    prematureLanguageTopics: languageStats?.prematureTopicViolations ?? 0,
    languageBlueprintViolations: languageBlueprintViolations.length,
  },
  languageBlueprintConfig: languageBlueprints,
  languageCoverage,
  languageBlueprintChecks,
  languageBlueprintViolations,
  prematureLanguageTopicRows,
  questionTypes: Object.groupBy(questions, q => q.type),
  typeCounts: Object.fromEntries(Object.entries(Object.groupBy(questions, q => q.type)).map(([type, rows]) => [type, rows.length])),
  testsBySubjectGrade,
  duplicateIds,
  duplicateTextCount: duplicateTexts.length,
  duplicateTextExamples: duplicateTexts.slice(0, 100),
  malformed,
  curriculumAlignment: {
    frameworkVersion: alignmentEngine.version,
    mappingLevel: "automated National Curriculum subject-domain candidate",
    statusCounts: Object.fromEntries(Object.entries(Object.groupBy(questions, q => q.alignment.reviewStatus)).map(([status, rows]) => [status, rows.length])),
    areaCounts: Object.fromEntries(Object.entries(Object.groupBy(questions, q => q.alignment.area)).map(([area, rows]) => [area, rows.length])),
    domainCounts: Object.fromEntries(Object.entries(Object.groupBy(questions, q => `${q.alignment.area}.${q.alignment.domain}`)).map(([domain, rows]) => [domain, rows.length])),
    note: "Automatic domain inference is a review candidate only. Only explicit, individually tagged outcomes count as reviewed; neither status is a Ministry endorsement or textbook-edition page certification.",
  },
  readiness: {
    technicalIntegrity: malformed.length
      ? "fail"
      : duplicateIds.length
        ? "pass_with_identity_warnings"
        : "pass",
    curriculumTraceability: questions.every(q => q.alignment?.outcomeId) ? "candidate_domain_level" : "incomplete",
    exactGradeTraceability: questions.every(q => q.alignment?.exactGradeVerified) ? "pass" : "incomplete",
    explicitOutcomeTagCoverage: questions.every(q => q.outcome) ? "pass" : "incomplete",
    explanationCoverage: questions.every(q => q.explain) ? "pass" : "incomplete",
    visualCoverage: questions.some(q => q.media?.src || q.visual) ? "started" : "missing",
  },
};
delete report.questionTypes;

fs.mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../reports/question-bank-audit.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
const alignmentRows = questions.map(q => ({
  id: q.id, poolKey: q.poolKey, basePool: q.basePool, subject: q.subject, grades: q.grades,
  text: q.text, type: q.type, explicitOutcome: q.outcome ?? null, skill: q.skill ?? null,
  ...q.alignment,
}));
fs.writeFileSync(new URL("../reports/question-curriculum-alignment.json", import.meta.url), `${JSON.stringify({
  generatedAt: report.generatedAt,
  frameworkVersion: alignmentEngine.version,
  disclaimer: "Automated domain candidates plus explicit tags; not a Ministry endorsement, subject-expert certification, or a replacement for edition-specific textbook review.",
  rows: alignmentRows,
}, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
if (malformed.length || prematureLanguageTopicRows.length || languageBlueprintViolations.length) process.exitCode = 1;
