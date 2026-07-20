import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("public/app.html", root), "utf8");
const expansionSource = fs.readFileSync(new URL("public/expanded-question-bank.js", root), "utf8");
const helpersStart = html.indexOf("const mc=");
const translationsStart = html.indexOf("const Q_TRANS=");
const testsStart = html.indexOf("const ALL_TESTS=");
const testsEnd = html.indexOf("];", testsStart) + 2;
if ([helpersStart, translationsStart, testsStart].some(index => index < 0) || testsEnd < 2) {
  throw new Error("Question bank markers were not found");
}

const appendedPools = html.slice(translationsStart, testsStart)
  .match(/Q_POOL\[['"][^'\"]+['"]\]\s*=\s*\[[\s\S]*?\n\];/g) ?? [];
const source = `${html.slice(helpersStart, translationsStart)}\n${appendedPools.join("\n")}\n${expansionSource}\n${html.slice(testsStart, testsEnd)}\nglobalThis.__quality={Q_POOL,ALL_TESTS,expansionStats:globalThis.EDUTEST_EXPANSION_STATS};`;
const sandbox = {};
vm.runInNewContext(source, sandbox, { timeout: 30_000 });
const { Q_POOL, ALL_TESTS, expansionStats } = sandbox.__quality;

const OFFICIAL_REFERENCES = [
  {
    title: "მესამე თაობის ეროვნული სასწავლო გეგმა",
    url: "https://mes.gov.ge/content.php?id=12552",
  },
  {
    title: "დაწყებითი საფეხურის საგნობრივი სტანდარტები",
    url: "https://mes.gov.ge/content.php?id=13272&lang=geo",
  },
  {
    title: "მათემატიკა — დაწყებითი საფეხურის გზამკვლევი",
    url: "https://www.mes.gov.ge/uploads/files/gzamkvlevi/%E1%83%9B%E1%83%90%E1%83%97%E1%83%94%E1%83%9B%E1%83%90%E1%83%A2%E1%83%98%E1%83%99%E1%83%90-%E1%83%93%E1%83%90%E1%83%AC%E1%83%A7%E1%83%94%E1%83%91%E1%83%98%E1%83%97%E1%83%98.pdf",
  },
  {
    title: "ბუნებისმეტყველება — I–VI კლასების თემები და შედეგები",
    url: "https://www.mes.gov.ge/uploads/files/gzamkvlevi/%E1%83%91%E1%83%A3%E1%83%9C%E1%83%94%E1%83%91%E1%83%98%E1%83%A1%E1%83%9B%E1%83%94%E1%83%A2%E1%83%A7%E1%83%95%E1%83%94%E1%83%9A%E1%83%94%E1%83%91%E1%83%90.pdf",
  },
  {
    title: "გრიფირებული სახელმძღვანელოები — დაწყებითი საფეხური",
    url: "https://www.mes.gov.ge/content.php?id=8479&lang=geo",
  },
  {
    title: "გრიფირებული სახელმძღვანელოები — საბაზო საფეხური",
    url: "https://mes.gov.ge/content.php?id=12487&lang=geo",
  },
];

const normalize = value => String(value ?? "")
  .normalize("NFKC")
  .toLocaleLowerCase("ka-GE")
  .replace(/[“”„"'`’]/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

const basePool = value => {
  const pool = String(value ?? "");
  const match = pool.match(/^(.*-(?:12|34|56|78|910|1112))-\d+$/);
  return match ? match[1] : pool;
};

const allText = question => [
  question.text,
  ...(Array.isArray(question.opts) ? question.opts : []),
  question.explain,
  question.media?.alt,
  question.visual?.alt,
  question.visual?.caption,
].filter(Boolean).join(" ");

const hasEncodingCorruption = value => /(?:áƒ|Ð|Ñ|Ã|Â|â€|â†|âœ|ðŸ|�)/u.test(String(value ?? ""));

function structuralFlags(question) {
  const flags = [];
  if (!question || !String(question.id ?? "").trim() || !String(question.text ?? "").trim() || !String(question.type ?? "").trim()) {
    flags.push("missing_required_field");
  }
  if (!Number.isFinite(Number(question?.pts)) || Number(question.pts) <= 0) flags.push("invalid_points");
  if (["multiple_choice", "true_false"].includes(question?.type)) {
    if (!Array.isArray(question.opts) || question.opts.length < 2) {
      flags.push("missing_options");
    } else {
      const options = question.opts.map(option => normalize(option) || String(option ?? "").trim());
      if (options.some(option => !option)) flags.push("empty_option");
      if (new Set(options).size !== options.length) flags.push("duplicate_options");
      if (!Number.isInteger(Number(question.correct)) || Number(question.correct) < 0 || Number(question.correct) >= question.opts.length) {
        flags.push("invalid_correct_index");
      }
    }
  }
  if (question?.type === "calc" && !Number.isFinite(Number(question.correct))) flags.push("invalid_calc_answer");
  if (question?.type === "fill") {
    const gaps = (String(question.text ?? "").match(/___/g) ?? []).length;
    if (!Array.isArray(question.blanks) || !question.blanks.length || gaps !== question.blanks.length
      || question.blanks.some(answer => !String(answer ?? "").trim())) flags.push("invalid_fill_definition");
  }
  if (question?.type === "match") {
    const pairs = Array.isArray(question.pairs) ? question.pairs : [];
    const left = pairs.map(pair => normalize(pair?.[0]));
    const right = pairs.map(pair => normalize(pair?.[1]));
    if (pairs.length < 2 || pairs.some(pair => !Array.isArray(pair) || pair.length < 2)
      || left.some(value => !value) || right.some(value => !value)
      || new Set(left).size !== left.length || new Set(right).size !== right.length) flags.push("invalid_match_definition");
  }
  if (question?.type === "order") {
    const items = Array.isArray(question.items) ? question.items.map(normalize) : [];
    if (items.length < 2 || items.some(value => !value) || new Set(items).size !== items.length) flags.push("invalid_order_definition");
  }
  if (hasEncodingCorruption(allText(question))) flags.push("encoding_corruption");
  return flags;
}

function pedagogicalFlags(question) {
  const flags = [];
  const stem = normalize(question.text);
  const correct = Array.isArray(question.opts) && Number.isInteger(Number(question.correct))
    ? normalize(question.opts[Number(question.correct)])
    : normalize(question.correct);
  if (!question.explain) flags.push("missing_explanation");
  if (!question.outcome) flags.push("missing_explicit_outcome");
  if (!question.skill) flags.push("missing_skill_tag");
  if (question.type === "true_false") flags.push("low_depth_binary_format");
  if (!question.media && stem.length < 12) flags.push("fragmented_or_too_short_stem");
  if (Array.isArray(question.opts) && question.opts.some(option => /^(?:არ ვიცი|არცერთი პასუხი|ყველა პასუხი სწორია|სხვა)$/iu.test(normalize(option)))) {
    flags.push("weak_nonacademic_distractor");
  }
  if (correct.length >= 5) {
    const stemWords = stem.split(" ");
    const answerWords = correct.split(" ");
    const echoed = answerWords.some(answerWord => answerWord.length >= 5 && stemWords.some(stemWord => {
      const size = Math.min(answerWord.length, stemWord.length);
      return size >= 5 && answerWord.slice(0, size - 1) === stemWord.slice(0, size - 1);
    }));
    if (echoed && /(?:ნიშნავს|რას ნიშნავს|შეავსე|ეწოდება)/u.test(stem)) flags.push("answer_echoes_prompt");
  }
  return flags;
}

const questionRows = Object.entries(Q_POOL).flatMap(([poolKey, rows]) => rows.map(question => ({
  ...question,
  poolKey,
  basePool: basePool(poolKey),
})));

const idIndex = new Map();
const textIndex = new Map();
const duplicateIds = [];
const duplicateTexts = [];
const issueRows = [];
const issueCounts = {};
const blockingFlags = new Set([
  "missing_required_field",
  "invalid_points",
  "missing_options",
  "empty_option",
  "duplicate_options",
  "invalid_correct_index",
  "invalid_calc_answer",
  "invalid_fill_definition",
  "invalid_match_definition",
  "invalid_order_definition",
  "encoding_corruption",
]);

for (const question of questionRows) {
  if (idIndex.has(question.id)) duplicateIds.push({ id: question.id, pools: [idIndex.get(question.id), question.poolKey] });
  else idIndex.set(question.id, question.poolKey);
  const normalizedText = normalize(question.text);
  const gradeScope = question.generated && Number.isFinite(Number(question.grade)) ? `grade:${Number(question.grade)}|` : "";
  const contentSignature = question.visual ? `${gradeScope}visual:${JSON.stringify(question.visual)}`
    : question.media?.src ? `${gradeScope}media:${String(question.media.src).trim().toLocaleLowerCase("en-US")}`
      : `${gradeScope}text:${normalizedText}`;
  if (normalizedText) {
    if (textIndex.has(contentSignature) && textIndex.get(contentSignature).id !== question.id) {
      duplicateTexts.push({ text: normalizedText.slice(0, 160), first: textIndex.get(contentSignature), second: { id: question.id, poolKey: question.poolKey } });
    } else textIndex.set(contentSignature, { id: question.id, poolKey: question.poolKey });
  }
  const structural = structuralFlags(question);
  const pedagogical = pedagogicalFlags(question);
  const flags = [...new Set([...structural, ...pedagogical])];
  for (const flag of flags) issueCounts[flag] = (issueCounts[flag] ?? 0) + 1;
  if (flags.some(flag => blockingFlags.has(flag)) || flags.includes("answer_echoes_prompt")) {
    issueRows.push({ id: question.id, poolKey: question.poolKey, text: String(question.text).slice(0, 220), flags });
  }
}

const questionByPool = Object.groupBy(questionRows, row => row.poolKey);
const contentKey = question => {
  const gradePrefix = question.generated && Number.isFinite(Number(question.grade)) ? `grade:${Number(question.grade)}|` : "";
  if (question.visual) return `${gradePrefix}visual:${JSON.stringify(question.visual)}`;
  if (question.media?.src) return `${gradePrefix}media:${String(question.media.src).trim().toLocaleLowerCase("en-US")}`;
  return `${gradePrefix}text:${normalize(question.text)}`;
};
const isBlocking = question => structuralFlags(question).some(flag => blockingFlags.has(flag));
const publishedBasePools = new Set(ALL_TESTS
  .filter(test => !(String(test.pool ?? "").startsWith("hist-") && Number(test.grade) < 7))
  .map(test => test.pool));
const publishedSafeUniqueQuestions = new Map(questionRows
  .filter(question => publishedBasePools.has(question.basePool) && !isBlocking(question))
  .map(question => [contentKey(question), question])).size;
const publishedGeneratedSafeRows = [...new Map(questionRows
  .filter(question => publishedBasePools.has(question.basePool) && question.generated && !isBlocking(question))
  .map(question => [contentKey(question), question])).values()];
const generatedTypeCounts = Object.fromEntries(Object.entries(Object.groupBy(publishedGeneratedSafeRows, question => question.type))
  .map(([type, rows]) => [type, rows.length]));
const generatedVisualCount = publishedGeneratedSafeRows.filter(question => question.visual || question.media?.src).length;
const generatedInteractiveCount = publishedGeneratedSafeRows.filter(question => ["calc", "fill", "match", "order"].includes(question.type)).length;
const duplicateTextsWithinExactGrade = duplicateTexts.filter(({ first, second }) => {
  const firstQuestion = questionRows.find(question => question.id === first.id && question.poolKey === first.poolKey);
  const secondQuestion = questionRows.find(question => question.id === second.id && question.poolKey === second.poolKey);
  const firstGrade = Number(firstQuestion?.grade), secondGrade = Number(secondQuestion?.grade);
  return Number.isFinite(firstGrade) && Number.isFinite(secondGrade) && firstGrade === secondGrade;
});

const eligibleTests = ALL_TESTS.filter(test => !(String(test.pool ?? "").startsWith("hist-") && Number(test.grade) < 7));
const testChecks = eligibleTests.map(test => {
  const versions = Object.entries(questionByPool)
    .filter(([poolKey]) => basePool(poolKey) === test.pool)
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
  const candidates = versions.flatMap(([, rows]) => {
    const tagged = rows.filter(question => [1, 2].includes(Number(question.semester)));
    const legacy = rows.filter(question => ![1, 2].includes(Number(question.semester)));
    const legacySemester = test.semester === 1 ? legacy.slice(0, Math.ceil(legacy.length / 2))
      : test.semester === 2 ? legacy.slice(Math.ceil(legacy.length / 2)) : legacy;
    const taggedSemester = [1, 2].includes(Number(test.semester))
      ? tagged.filter(question => Number(question.semester) === Number(test.semester)) : tagged;
    return [...legacySemester, ...taggedSemester];
  }).filter(question => {
    const exactGrade = Number(question.grade);
    if (Number.isFinite(exactGrade)) return exactGrade === Number(test.grade);
    const min = Number(question.gradeMin), max = Number(question.gradeMax);
    return !(Number.isFinite(min) && Number.isFinite(max) && min === max) || min === Number(test.grade);
  });
  const structurallySafe = candidates.filter(question => !isBlocking(question));
  const uniqueSafe = [...new Map(structurallySafe.map(question => [contentKey(question), question])).values()];
  const exactGradeTagged = uniqueSafe.filter(question => Number(question.grade) === Number(test.grade)
    || (Number(question.gradeMin) === Number(test.grade) && Number(question.gradeMax) === Number(test.grade)));
  const risks = [];
  if (uniqueSafe.length < Number(test.count || 0)) risks.push("insufficient_safe_questions");
  if (!exactGradeTagged.length) risks.push("exact_grade_not_verified");
  return {
    id: test.id,
    title: test.title,
    subject: test.subject,
    grade: test.grade,
    semester: test.semester,
    pool: test.pool,
    requested: Number(test.count || 0),
    candidates: candidates.length,
    safeUniqueCandidates: uniqueSafe.length,
    blockedCandidates: candidates.length - structurallySafe.length,
    exactGradeTaggedCandidates: exactGradeTagged.length,
    risks,
  };
});

const pools = Object.entries(questionByPool).map(([poolKey, rows]) => ({
  poolKey,
  basePool: basePool(poolKey),
  questions: rows.length,
  blockingQuestions: rows.filter(isBlocking).length,
  encodingCorruption: rows.filter(question => hasEncodingCorruption(allText(question))).length,
  duplicateOptionQuestions: rows.filter(question => structuralFlags(question).includes("duplicate_options")).length,
}));

const bySubjectGrade = Object.values(Object.groupBy(testChecks, test => `${test.subject} · ${test.grade}`)).map(rows => ({
  subject: rows[0].subject,
  grade: rows[0].grade,
  tests: rows.length,
  testsWithoutExactGradeVerification: rows.filter(row => row.risks.includes("exact_grade_not_verified")).length,
  testsWithInsufficientSafeQuestions: rows.filter(row => row.risks.includes("insufficient_safe_questions")).length,
}));

const publishedTests = eligibleTests;
const inventoryBySubject = Object.entries(Object.groupBy(publishedTests, test => test.subject)).map(([subject, tests]) => {
  const poolsForSubject = new Set(tests.map(test => test.pool));
  const safeRows = questionRows.filter(question => poolsForSubject.has(question.basePool) && !isBlocking(question));
  const uniqueRows = [...new Map(safeRows.map(question => [contentKey(question), question])).values()];
  const baselineRows = uniqueRows.filter(question => !question.generated);
  const generatedRows = uniqueRows.filter(question => question.generated);
  return {
    subject,
    grades: [...new Set(tests.map(test => Number(test.grade)))].sort((a, b) => a - b),
    pools: poolsForSubject.size,
    rawQuestions: safeRows.length,
    safeUniqueQuestions: uniqueRows.length,
    baselineSafeUniqueQuestions: baselineRows.length,
    generatedSafeUniqueQuestions: generatedRows.length,
    growthRatio: baselineRows.length ? Number((uniqueRows.length / baselineRows.length).toFixed(3)) : null,
    exactGradeTaggedQuestions: uniqueRows.filter(question => Number.isFinite(Number(question.grade))
      || (Number(question.gradeMin) === Number(question.gradeMax) && Number.isFinite(Number(question.gradeMin)))).length,
    visualQuestions: uniqueRows.filter(question => question.media?.src || question.visual).length,
    generatedVisualQuestions: generatedRows.filter(question => question.visual).length,
    typeCounts: Object.fromEntries(Object.entries(Object.groupBy(uniqueRows, question => question.type))
      .map(([type, rows]) => [type, rows.length])),
  };
}).sort((a, b) => a.subject.localeCompare(b.subject, "ka"));
const subjectsBelowDouble = inventoryBySubject.filter(row => row.safeUniqueQuestions < row.baselineSafeUniqueQuestions * 2);

const generatedAt = new Date().toISOString();
const report = {
  generatedAt,
  intendedUse: "Production test-bank release gate for EduTest.ge",
  grain: "One question record; viability also evaluated at one published-test definition",
  officialReferences: OFFICIAL_REFERENCES,
  summary: {
    pools: Object.keys(Q_POOL).length,
    tests: ALL_TESTS.length,
    questions: questionRows.length,
    uniqueQuestionIds: idIndex.size,
    duplicateQuestionIds: duplicateIds.length,
    duplicateQuestionTexts: duplicateTexts.length,
    duplicateQuestionTextsWithinExactGrade: duplicateTextsWithinExactGrade.length,
    questionsWithBlockingIssues: questionRows.filter(isBlocking).length,
    encodingCorruptedQuestions: issueCounts.encoding_corruption ?? 0,
    duplicateOptionQuestions: issueCounts.duplicate_options ?? 0,
    questionsMissingExplanation: issueCounts.missing_explanation ?? 0,
    questionsMissingExplicitOutcome: issueCounts.missing_explicit_outcome ?? 0,
    questionsMissingSkillTag: issueCounts.missing_skill_tag ?? 0,
    trueFalseQuestions: issueCounts.low_depth_binary_format ?? 0,
    answerEchoQuestions: issueCounts.answer_echoes_prompt ?? 0,
    publishedSafeUniqueQuestions,
    generatedExpansionQuestions: expansionStats?.generated ?? 0,
    generatedExpansionVisualQuestions: expansionStats?.visual ?? 0,
    generatedTypeCounts,
    generatedVisualShare: publishedGeneratedSafeRows.length ? Number((generatedVisualCount / publishedGeneratedSafeRows.length).toFixed(3)) : 0,
    generatedInteractiveShare: publishedGeneratedSafeRows.length ? Number((generatedInteractiveCount / publishedGeneratedSafeRows.length).toFixed(3)) : 0,
    subjectsBelowDouble: subjectsBelowDouble.length,
    testsWithInsufficientSafeQuestions: testChecks.filter(row => row.risks.includes("insufficient_safe_questions")).length,
    testsWithoutExactGradeVerification: testChecks.filter(row => row.risks.includes("exact_grade_not_verified")).length,
  },
  severity: {
    critical: testChecks.filter(row => row.risks.includes("insufficient_safe_questions")).length,
    high: (issueCounts.encoding_corruption ?? 0) + (issueCounts.duplicate_options ?? 0),
    medium: duplicateTexts.length + (issueCounts.answer_echoes_prompt ?? 0),
  },
  issueCounts,
  bySubjectGrade,
  inventoryBySubject,
  subjectsBelowDouble,
  testChecks,
  poolChecks: pools,
  blockingOrSemanticExamples: issueRows.slice(0, 500),
  duplicateIds: duplicateIds.slice(0, 500),
  duplicateTextExamples: duplicateTexts.slice(0, 500),
  duplicateTextWithinExactGradeExamples: duplicateTextsWithinExactGrade.slice(0, 500),
  limitations: [
    "ავტომატური შემოწმება პოულობს სტრუქტურის, კოდირების, დუბლირების, მიკვლევადობისა და პროგრესიის რისკებს, მაგრამ ჰუმანიტარულ და საბუნებისმეტყველო საგნებში ყველა პასუხის ფაქტობრივ სისწორეს ვერ ასერტიფიცირებს.",
    "აუზების უმეტესობა ორ კლასს ემსახურება და ზუსტი კლასის მეტამონაცემი არ აქვს; საფეხურის დამთხვევა ზუსტი კლასის ან სემესტრის დამტკიცებად არ უნდა იყოს წარმოდგენილი.",
    "სახელმძღვანელოს გვერდამდე მიბმა მოითხოვს არჩეულ გრიფირებულ სერიასა და გამოცემას; სამინისტროს რამდენიმე დამტკიცებული სერია არსებობს.",
    "საბოლოო აკადემიური დამტკიცებისთვის კვლავ საჭიროა შესაბამისი საგნის სპეციალისტი და დაწყებით კლასებში მეთოდისტიც.",
  ],
};

fs.mkdirSync(new URL("reports/", root), { recursive: true });
fs.writeFileSync(new URL("reports/question-content-quality.json", root), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# EduTest.ge — კითხვების ხარისხისა და სასწავლო შესაბამისობის აუდიტი

განახლებულია: ${generatedAt.slice(0, 10)}

## მთავარი დასკვნა

ბანკში არის **${report.summary.questions.toLocaleString("en-US")}** ჩანაწერი. ავტომატურმა წარმოების შემოწმებამ გამოავლინა **${report.summary.questionsWithBlockingIssues.toLocaleString("en-US")}** ტექნიკურად დასაბლოკი ძველი კითხვა, მათ შორის **${report.summary.encodingCorruptedQuestions.toLocaleString("en-US")}** კოდირებადაზიანებული ჩანაწერი. გამოქვეყნებულ ტესტებს შორის ზუსტი კლასის მეტამონაცემის გარეშე დარჩენილია **${report.summary.testsWithoutExactGradeVerification}** ტესტი; დასაბლოკი ჩანაწერები გამოცდის შერჩევისას ავტომატურად გამოირიცხება.

ეს ნიშნავს, რომ სისტემის მიმდინარე რუკა გამოიყენება როგორც **კანდიდატი და უსაფრთხოების ფილტრი**, არა როგორც სამინისტროს გრიფი ან ყველა კითხვის საგნობრივი სერტიფიცირება.

## რაოდენობრივი შედეგები

| შემოწმება | შედეგი |
|---|---:|
| კითხვები | ${report.summary.questions.toLocaleString("en-US")} |
| უნიკალური ID | ${report.summary.uniqueQuestionIds.toLocaleString("en-US")} |
| დუბლირებული ID | ${report.summary.duplicateQuestionIds.toLocaleString("en-US")} |
| დუბლირებული ტექსტი | ${report.summary.duplicateQuestionTexts.toLocaleString("en-US")} |
| კოდირებადაზიანებული კითხვა | ${report.summary.encodingCorruptedQuestions.toLocaleString("en-US")} |
| დუბლირებული პასუხების მქონე კითხვა | ${report.summary.duplicateOptionQuestions.toLocaleString("en-US")} |
| განმარტების გარეშე | ${report.summary.questionsMissingExplanation.toLocaleString("en-US")} |
| ზუსტი შედეგის კოდის გარეშე | ${report.summary.questionsMissingExplicitOutcome.toLocaleString("en-US")} |
| მხოლოდ ჭეშმარიტი/მცდარი ფორმატი | ${report.summary.trueFalseQuestions.toLocaleString("en-US")} |
| გამოქვეყნებული უსაფრთხო უნიკალური კითხვა | ${report.summary.publishedSafeUniqueQuestions.toLocaleString("en-US")} |
| ახალი ზუსტი კლასით გენერირებული კითხვა | ${report.summary.generatedExpansionQuestions.toLocaleString("en-US")} |
| ახალი ვიზუალური კითხვა | ${report.summary.generatedExpansionVisualQuestions.toLocaleString("en-US")} |
| ახალი კითხვების ვიზუალური წილი | ${(report.summary.generatedVisualShare * 100).toFixed(1)}% |
| ახალი ინტერაქტიული პასუხების წილი | ${(report.summary.generatedInteractiveShare * 100).toFixed(1)}% |
| გაორმაგების ზღვარს ქვემოთ დარჩენილი საგანი | ${report.summary.subjectsBelowDouble} |
| უსაფრთხო კითხვების ნაკლებობის მქონე ტესტი | ${report.summary.testsWithInsufficientSafeQuestions} |

## წარმოებაში მიღებული გადაწყვეტილება

1. კოდირებადაზიანებული, ცარიელი, არასწორი ინდექსის ან დუბლირებული ვარიანტების მქონე ჩანაწერი ტესტის გენერატორმა უნდა გამოტოვოს.
2. ზუსტი კლასის/სემესტრის მტკიცება დაშვებული იქნება მხოლოდ მაშინ, როცა კითხვას ექნება კონკრეტული კლასის მეტამონაცემი და შედეგის კოდი.
3. ორკლასიანი აუზის დონეზე ავტომატური დამთხვევა რჩება კანდიდატად; ის არ ჩაითვლება ინდივიდუალურ აკადემიურ დამტკიცებად.
4. ყველა გამოქვეყნებულ ტესტს უნდა ჰქონდეს საკმარისი უნიკალური უსაფრთხო კითხვა ფილტრაციის შემდეგ.

## ოფიციალური საყრდენი წყაროები

${OFFICIAL_REFERENCES.map(source => `- [${source.title}](${source.url})`).join("\n")}

## შეზღუდვები

${report.limitations.map(value => `- ${value}`).join("\n")}
`;
fs.writeFileSync(new URL("reports/question-content-quality.md", root), markdown);

console.log(JSON.stringify(report.summary));
if (report.summary.testsWithInsufficientSafeQuestions) process.exitCode = 1;
