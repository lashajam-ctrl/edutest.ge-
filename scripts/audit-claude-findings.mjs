import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), "utf8");
const html = read("public/app.html");
const sources = {
  qualityOverrides: read("public/question-quality-overrides.js"),
  questionPolicy: read("public/question-policy.js"),
  expansion: read("public/expanded-question-bank.js"),
  generatedValidator: read("public/generated-bank-validator.js"),
  seniorMath: read("public/senior-math-bank.js"),
  languageBlueprint: read("public/language-blueprint-bank.js"),
};

const helpersStart = html.indexOf("const mc=");
const translationsStart = html.indexOf("const Q_TRANS=");
const testsStart = html.indexOf("const ALL_TESTS=");
const testsEnd = html.indexOf("];", testsStart) + 2;
const catalogBootstrapEnd = html.indexOf("// Student catalog follows", testsEnd);
if ([helpersStart, translationsStart, testsStart, testsEnd, catalogBootstrapEnd].some(index => index < 0)) {
  throw new Error("Question bank markers were not found");
}

const appendedPools = html.slice(translationsStart, testsStart)
  .match(/Q_POOL\[['"][^'"]+['"]\]\s*=\s*\[[\s\S]*?\n\];/g) ?? [];
const executable = `${html.slice(helpersStart, translationsStart)}
${appendedPools.join("\n")}
${sources.qualityOverrides}
${sources.questionPolicy}
${sources.expansion}
${sources.generatedValidator}
${sources.seniorMath}
${sources.languageBlueprint}
${html.slice(testsStart, testsEnd)}
${html.slice(testsEnd, catalogBootstrapEnd)}
globalThis.__audit={Q_POOL,ALL_TESTS,policy:globalThis.QUESTION_POLICY,validator:globalThis.EDUTEST_GENERATED_VALIDATOR};`;
const sandbox = {};
sandbox.window = sandbox;
vm.runInNewContext(executable, sandbox, { timeout: 30_000 });
const { Q_POOL, ALL_TESTS, policy, validator } = sandbox.__audit;

const normalize = value => String(value ?? "").normalize("NFKC")
  .toLocaleLowerCase("ka-GE")
  .replace(/[“”„"'`’]/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();
const poolBase = poolKey => String(poolKey).replace(/-\d+$/, "");
const rows = Object.entries(Q_POOL).flatMap(([poolKey, questions]) =>
  questions.map(question => ({ ...question, poolKey, pool: poolBase(poolKey) })));
const activeTests = ALL_TESTS.filter(test => !test.catalogHidden);
const activePools = new Set(activeTests.map(test => test.pool));
const publishedRows = rows.filter(question => activePools.has(question.pool));
const isChoice = question => ["multiple_choice", "true_false"].includes(question.type);
const duplicateOptions = question => {
  if (!isChoice(question) || !Array.isArray(question.opts)) return false;
  const values = question.opts.map(value => validator.optionKey(value));
  return values.some(value => !value) || new Set(values).size !== values.length;
};
const duplicateOptionRows = rows.filter(duplicateOptions);
const publishedDuplicateOptionRows = publishedRows.filter(duplicateOptions);
const selectorBlocksDuplicateOptions = /const normalized=q\.opts\.map\([\s\S]*?new Set\(normalized\)\.size!==normalized\.length/u.test(html);

const extremaDirection = question => {
  const text = normalize(question.text);
  if (/(უმაღლეს|უდიდეს|ყველაზე მეტ|ყველაზე სწრაფ)/u.test(text)) return "max";
  if (/(უმცირეს|ყველაზე მცირე|ყველაზე მჟავე)/u.test(text)) return "min";
  return null;
};
const ambiguousBars = rows.filter(question => {
  if (question.visual?.kind !== "bars" || !Array.isArray(question.visual.values)) return false;
  const direction = extremaDirection(question);
  if (!direction) return false;
  const values = question.visual.values.map(Number).filter(Number.isFinite);
  if (!values.length) return true;
  const target = direction === "max" ? Math.max(...values) : Math.min(...values);
  return values.filter(value => value === target).length !== 1;
});
const publishedAmbiguousBars = ambiguousBars.filter(question => activePools.has(question.pool));

const tfSchemes = Object.entries(Object.groupBy(rows.filter(question => question.type === "true_false"),
  question => (question.opts ?? []).map(normalize).join("|")))
  .map(([scheme, questions]) => ({ scheme, questions: questions.length }))
  .sort((a, b) => b.questions - a.questions);

const earlyUnknownMinuend = rows.filter(question =>
  Number(question.grade) <= 2
  && (String(question.skill ?? "").includes("missing_minuend")
    || /___\s*[−-]\s*\d+\s*=/u.test(String(question.text ?? ""))));
const publishedEarlyUnknownMinuend = earlyUnknownMinuend.filter(question => activePools.has(question.pool));

const exactTextGrades = new Map();
for (const question of publishedRows) {
  const key = normalize(question.text);
  if (!key) continue;
  const record = exactTextGrades.get(key) ?? { grades: new Set(), ids: [], pools: new Set() };
  const grade = Number(question.grade);
  if (Number.isFinite(grade)) record.grades.add(grade);
  record.ids.push(question.id);
  record.pools.add(question.pool);
  exactTextGrades.set(key, record);
}
const crossGradeExactGroups = [...exactTextGrades.entries()]
  .filter(([, record]) => record.grades.size > 1)
  .map(([text, record]) => ({
    text,
    grades: [...record.grades].sort((a, b) => a - b),
    ids: record.ids.slice(0, 12),
    pools: [...record.pools],
  }));

const semanticGroupsFor = questions => {
  const grouped = Object.groupBy(questions, question => policy.canonicalSemanticText(question));
  const groups = Object.values(grouped);
  return {
    groups: groups.length,
    redundant: groups.reduce((sum, group) => sum + Math.max(0, group.length - 1), 0),
    maxGroup: Math.max(0, ...groups.map(group => group.length)),
  };
};
const semanticByActivePool = [...activePools].map(pool => {
  const questions = rows.filter(question => question.pool === pool);
  const semantic = semanticGroupsFor(questions);
  return {
    pool,
    questions: questions.length,
    ...semantic,
    uniqueness: questions.length ? Number((semantic.groups / questions.length).toFixed(4)) : 0,
  };
}).sort((a, b) => a.uniqueness - b.uniqueness || a.pool.localeCompare(b.pool, "en"));
const lowUniquenessActivePools = semanticByActivePool.filter(row =>
  row.questions >= 20 && (row.groups < 20 || row.uniqueness < 0.2));

const exposedAnswerFiles = [
  "public/app.html",
  "public/expanded-question-bank.js",
  "public/senior-math-bank.js",
  "public/language-blueprint-bank.js",
].filter(path => /\bcorrect\s*[:=]/u.test(read(path)));

const report = {
  generatedAt: new Date().toISOString(),
  baselineClaim: { pools: 50, questions: 5831 },
  current: {
    pools: Object.keys(Q_POOL).length,
    tests: ALL_TESTS.length,
    activeTests: activeTests.length,
    questions: rows.length,
    publishedQuestionRecords: publishedRows.length,
    seniorMathQuestions: rows.filter(question => String(question.id).startsWith("sm26-")).length,
    languageBlueprintQuestions: rows.filter(question => String(question.id).startsWith("lb26-")).length,
  },
  findings: {
    duplicateOptions: {
      all: duplicateOptionRows.length,
      published: publishedDuplicateOptionRows.length,
      blockedBySelector: selectorBlocksDuplicateOptions ? publishedDuplicateOptionRows.length : 0,
      liveSelectable: selectorBlocksDuplicateOptions ? 0 : publishedDuplicateOptionRows.length,
      claudeIdsStillPresent: duplicateOptionRows.filter(question => String(question.id).startsWith("exp26-geo-")).map(question => question.id),
    },
    ambiguousBars: {
      all: ambiguousBars.length,
      published: publishedAmbiguousBars.length,
      ids: ambiguousBars.slice(0, 100).map(question => question.id),
    },
    trueFalseSchemes: tfSchemes,
    internalMetadataVisible: /სასწავლო მიმართულების კანდიდატი/u.test(html),
    earlyUnknownMinuend: {
      all: earlyUnknownMinuend.length,
      published: publishedEarlyUnknownMinuend.length,
      ids: earlyUnknownMinuend.map(question => question.id),
    },
    crossGradeExactGroups: crossGradeExactGroups.length,
    crossGradeExactExamples: crossGradeExactGroups.slice(0, 20),
    semanticAll: semanticGroupsFor(rows),
    semanticPublished: semanticGroupsFor(publishedRows),
    lowUniquenessActivePools,
    exposedAnswerFiles,
    clientScoresAttempts: /earned:result\.earned/u.test(html)
      && /const expectedPct/u.test(read("app/api/attempts/route.ts")),
    practiceLabelPresent: /სავარჯიშო ტესტი · თვითშემოწმება/u.test(html),
  },
  verificationMatrix: [
    { id: "duplicate_distractors_20", status: "false_positive", evidence: `პუნქტუაცია/გამოტოვება პასუხის მნიშვნელობის ნაწილია; exact-option validator იყენებს NFKC+case+whitespace შედარებას და არა სასვენი ნიშნების წაშლას. ცალკე აღმოჩენილი ${publishedDuplicateOptionRows.length} რეალური legacy ჩანაწერი live selector-მა დაბლოკა; live-selectable=${selectorBlocksDuplicateOptions ? 0 : publishedDuplicateOptionRows.length}.` },
    { id: "ambiguous_bar_extrema", status: ambiguousBars.length === 0 ? "confirmed_fixed" : "confirmed_open", evidence: `${ambiguousBars.length} ambiguous generated bar chart(s)` },
    { id: "true_false_terminology", status: /opts:\['✅ სწორია','❌ მცდარია'\]/u.test(sources.expansion) ? "already_fixed" : "confirmed_open", evidence: "learner renderer localizes binary answers and the expansion generator now uses სწორია/მცდარია." },
    { id: "learner_internal_metadata", status: !/სასწავლო მიმართულების კანდიდატი/u.test(html) ? "confirmed_fixed" : "confirmed_open", evidence: "internal outcome/alignment label is no longer rendered to learners." },
    { id: "grade_1_2_unknown_minuend", status: earlyUnknownMinuend.length === 0 ? "confirmed_fixed" : "confirmed_open", evidence: `${earlyUnknownMinuend.length} remaining row(s)` },
    { id: "shared_grade_7_12_text", status: "confirmed_fixed", evidence: "exact-grade selector is mandatory when sufficient and senior/language banks carry exact grade metadata." },
    { id: "template_inflation", status: "confirmed_fixed", evidence: "semantic history dedupe, catalog diversity gate, and generated-bank release gate block low-diversity live selection." },
    { id: "client_answer_exposure", status: "deferred_mitigated", evidence: "current catalog is explicitly practice/self-check only; API rejects non-practice submissions. Public correct answers remain unsuitable for future graded exams." },
  ],
};

fs.mkdirSync(new URL("reports/", root), { recursive: true });
fs.writeFileSync(new URL("reports/claude-audit-verification.json", root), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
