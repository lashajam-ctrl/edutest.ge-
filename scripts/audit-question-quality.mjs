import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("public/app.html", root), "utf8");
const helpersStart = html.indexOf("const mc=");
const translationsStart = html.indexOf("const Q_TRANS=");
const testsStart = html.indexOf("const ALL_TESTS=");
const testsEnd = html.indexOf("];", testsStart) + 2;
if ([helpersStart, translationsStart, testsStart].some(index => index < 0) || testsEnd < 2) {
  throw new Error("Question bank markers were not found");
}

const appendedPools = html.slice(translationsStart, testsStart)
  .match(/Q_POOL\[['"][^'\"]+['"]\]\s*=\s*\[[\s\S]*?\n\];/g) ?? [];
const source = `${html.slice(helpersStart, translationsStart)}\n${appendedPools.join("\n")}\n${html.slice(testsStart, testsEnd)}\nglobalThis.__quality={Q_POOL,ALL_TESTS};`;
const sandbox = {};
vm.runInNewContext(source, sandbox, { timeout: 5_000 });
const { Q_POOL, ALL_TESTS } = sandbox.__quality;

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
  "encoding_corruption",
]);

for (const question of questionRows) {
  if (idIndex.has(question.id)) duplicateIds.push({ id: question.id, pools: [idIndex.get(question.id), question.poolKey] });
  else idIndex.set(question.id, question.poolKey);
  const normalizedText = normalize(question.text);
  if (normalizedText) {
    if (textIndex.has(normalizedText) && textIndex.get(normalizedText).id !== question.id) {
      duplicateTexts.push({ text: normalizedText.slice(0, 160), first: textIndex.get(normalizedText), second: { id: question.id, poolKey: question.poolKey } });
    } else textIndex.set(normalizedText, { id: question.id, poolKey: question.poolKey });
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
const contentKey = question => question.media?.src
  ? `media:${String(question.media.src).trim().toLocaleLowerCase("en-US")}`
  : `text:${normalize(question.text)}`;
const isBlocking = question => structuralFlags(question).some(flag => blockingFlags.has(flag));
const publishedBasePools = new Set(ALL_TESTS
  .filter(test => !(String(test.pool ?? "").startsWith("hist-") && Number(test.grade) < 7))
  .map(test => test.pool));
const publishedSafeUniqueQuestions = new Map(questionRows
  .filter(question => publishedBasePools.has(question.basePool) && !isBlocking(question))
  .map(question => [contentKey(question), question])).size;

const testChecks = ALL_TESTS.map(test => {
  const versions = Object.entries(questionByPool)
    .filter(([poolKey]) => basePool(poolKey) === test.pool)
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
  const candidates = versions.flatMap(([, rows]) => {
    if (test.semester === 1) return rows.slice(0, Math.ceil(rows.length / 2));
    if (test.semester === 2) return rows.slice(Math.ceil(rows.length / 2));
    return rows;
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
    questionsWithBlockingIssues: questionRows.filter(isBlocking).length,
    encodingCorruptedQuestions: issueCounts.encoding_corruption ?? 0,
    duplicateOptionQuestions: issueCounts.duplicate_options ?? 0,
    questionsMissingExplanation: issueCounts.missing_explanation ?? 0,
    questionsMissingExplicitOutcome: issueCounts.missing_explicit_outcome ?? 0,
    questionsMissingSkillTag: issueCounts.missing_skill_tag ?? 0,
    trueFalseQuestions: issueCounts.low_depth_binary_format ?? 0,
    answerEchoQuestions: issueCounts.answer_echoes_prompt ?? 0,
    publishedSafeUniqueQuestions,
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
  testChecks,
  poolChecks: pools,
  blockingOrSemanticExamples: issueRows.slice(0, 500),
  duplicateIds: duplicateIds.slice(0, 500),
  duplicateTextExamples: duplicateTexts.slice(0, 500),
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

ბანკში არის **${report.summary.questions.toLocaleString("en-US")}** ჩანაწერი. ავტომატურმა წარმოების შემოწმებამ გამოავლინა **${report.summary.questionsWithBlockingIssues.toLocaleString("en-US")}** ტექნიკურად დასაბლოკი კითხვა, მათ შორის **${report.summary.encodingCorruptedQuestions.toLocaleString("en-US")}** კოდირებადაზიანებული ჩანაწერი. **${report.summary.testsWithoutExactGradeVerification}** ტესტიდან ზუსტი კლასის მეტამონაცემებით დადასტურებული ჯერ არც ერთია; არსებული შესაბამისობა უმეტესად ორკლასიანი საფეხურის/აუზის დონეზეა.

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
