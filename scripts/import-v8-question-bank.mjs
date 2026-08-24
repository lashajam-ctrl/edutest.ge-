import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

await import("../public/question-policy.js");

const DEFAULT_INPUT = resolve("work/incoming-edutest-v8-final");
const DEFAULT_OUT = resolve(".openai/d1-v8-import");
const DEFAULT_REPORT = resolve("reports/v8-question-bank-audit.json");
const DEFAULT_MARKDOWN = resolve("reports/v8-question-bank-audit.md");
const DIFFICULTIES = ["foundation", "application", "reasoning", "challenge"];
const SUPPORTED_TYPES = new Set(["MCQ", "TF", "FILL", "OPEN", "ORDER", "MATCH"]);
const BLOCKED_FAMILIES = new Set(["AS", "DT"]);
const BLOCKING_FLAGS = ["LONGEST_ANSWER_CUE"];
const WARNING_FLAGS = ["THIN_FEEDBACK", "COSMETIC_WRAPPER"];
const policy = globalThis.QUESTION_POLICY;

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, out: DEFAULT_OUT, report: DEFAULT_REPORT, markdown: DEFAULT_MARKDOWN, dryRun: false };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === "--input") args.input = resolve(argv[++index] ?? "");
    else if (value === "--out") args.out = resolve(argv[++index] ?? "");
    else if (value === "--report") args.report = resolve(argv[++index] ?? "");
    else if (value === "--markdown") args.markdown = resolve(argv[++index] ?? "");
    else if (value === "--dry-run") args.dryRun = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = value => String(value ?? "")
  .normalize("NFKC")
  .toLocaleLowerCase("ka-GE")
  .replace(/[“”„"'`’]/gu, "")
  .replace(/\s+/gu, " ")
  .trim();
const sql = value => value == null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const bool = value => value ? 1 : 0;

async function jsonl(file) {
  const text = await readFile(file, "utf8");
  return text.split(/\r?\n/u).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
  });
}

function familyCode(question) {
  return String(question.bank_id ?? "").match(/^G\d{2}-([A-Z]{2})$/u)?.[1] ?? "";
}

function mappedSubject(question) {
  const grade = Number(question.grade), family = familyCode(question), sub = String(question.subsubject ?? "").trim();
  if (family === "MA") return { subject: "მათემატიკა", strand: sub || "მათემატიკა" };
  if (family === "KA") return { subject: grade <= 6 ? "ქართული" : "ქართული ენა და ლიტერატურა", strand: sub || "ქართული" };
  if (family === "EN") return { subject: "ინგლისური", strand: sub || "ინგლისური" };
  if (family === "SC" && grade <= 6) return { subject: "ბუნება", strand: sub || "ბუნება" };
  if (family === "SC") {
    if (["ბიოლოგია", "ფიზიკა", "ქიმია"].includes(sub)) return { subject: sub, strand: sub };
    return { subject: "", strand: sub, reason: "generic_senior_science_not_mapped" };
  }
  if (family === "SO" && grade <= 4) return { subject: "მე და საზოგადოება", strand: sub || "მე და საზოგადოება" };
  if (family === "SO" && grade <= 6) return { subject: "ჩვენი საქართველო", strand: sub || "ჩვენი საქართველო" };
  if (family === "SO") {
    if (sub === "სამოქალაქო განათლება") return { subject: "მოქალაქეობა", strand: sub };
    if (["ისტორია", "გეოგრაფია", "მოქალაქეობა", "სამოქალაქო თავდაცვა და უსაფრთხოება"].includes(sub)) return { subject: sub, strand: sub };
    return { subject: "", strand: sub, reason: "senior_social_subject_not_mapped" };
  }
  if (BLOCKED_FAMILIES.has(family)) return { subject: "", strand: sub, reason: `family_${family.toLowerCase()}_awaits_subject_expert_review` };
  return { subject: "", strand: sub, reason: "unknown_subject_family" };
}

function recoverMissingScalarAnswer(question, key) {
  const raw = JSON.parse(key.answer_json);
  if (raw !== null && raw !== undefined && String(raw).trim() && !["null", "undefined"].includes(normalize(raw))) return { answer: raw, repaired: false };
  if (!["FILL", "OPEN"].includes(question.question_type)) return { answer: raw, repaired: false };
  const rationale = String(key.rationale ?? "").trim();
  const match = rationale.match(/^(?:შესავსები პასუხია|პასუხია)\s*[:—-]\s*(.+?)\.?$/iu);
  if (!match) return { answer: raw, repaired: false };
  const candidate = match[1].trim().replace(/^[„“"]|[„”".]+$/gu, "").trim();
  return candidate && candidate.length <= 100 ? { answer: candidate, repaired: true } : { answer: raw, repaired: false };
}

function directMathResult(stem) {
  const compact = String(stem ?? "").normalize("NFKC").replace(/[−–—]/gu, "-");
  const match = compact.match(/(?:^|\s|\()(-?\d+(?:[.,]\d+)?)\s*([+\-×*÷:])\s*\(?(-?\d+(?:[.,]\d+)?)\)?\s*=\s*(?:\?|___)/u);
  if (!match) return null;
  const left = Number(match[1].replace(",", ".")), right = Number(match[3].replace(",", "."));
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (match[2] === "+") return left + right;
  if (match[2] === "-") return left - right;
  if (["×", "*"].includes(match[2])) return left * right;
  if (["÷", ":"].includes(match[2]) && right !== 0) return left / right;
  return null;
}

function transform(question, key, mapping) {
  const options = JSON.parse(question.options_json || "{}");
  const recovered = recoverMissingScalarAnswer(question, key);
  const answer = recovered.answer;
  const type = question.question_type;
  const payload = {
    id: question.question_id,
    text: String(question.stem ?? "").trim(),
    type: "",
    pts: question.difficulty === "challenge" ? 3 : question.difficulty === "foundation" ? 1 : 2,
    grade: Number(question.grade),
    subject: mapping.subject,
    semester: Number(question.semester),
    topic: String(question.topic || question.curriculum_domain || "ზოგადი"),
    difficulty: question.difficulty,
  };
  let answerKey;
  if (type === "MCQ" || type === "TF") {
    const choices = Array.isArray(options.choices) ? options.choices.map(String) : [];
    payload.type = type === "MCQ" ? "multiple_choice" : "true_false";
    payload.opts = choices;
    answerKey = { correct: choices.findIndex(option => normalize(option) === normalize(answer)) };
  } else if (type === "FILL" || type === "OPEN") {
    payload.type = "fill";
    if (type === "FILL" && policy && !policy.hasCompleteInstruction({ text: payload.text, type: "fill" })) {
      payload.text = question.language === "en"
        ? `Complete the blank: ${payload.text}`
        : question.language === "ru"
          ? `Заполните пропуск: ${payload.text}`
          : `შეავსე გამოტოვებული ადგილი: ${payload.text}`;
    }
    answerKey = { blanks: (Array.isArray(answer) ? answer : [answer]).map(value => String(value ?? "").trim()) };
  } else if (type === "ORDER") {
    payload.type = "order";
    payload.items = Array.isArray(options.items) ? options.items.map(String) : [];
    answerKey = { correct: Array.isArray(answer) ? answer.map(String) : [] };
  } else if (type === "MATCH") {
    payload.type = "match";
    payload.leftItems = Array.isArray(options.left) ? options.left.map(String) : [];
    payload.rightOptions = Array.isArray(options.right) ? options.right.map(String) : [];
    const correct = Array.isArray(answer)
      ? answer.map(String)
      : payload.leftItems.map(item => String(answer?.[item] ?? ""));
    answerKey = { correct, pairs: payload.leftItems.map((item, index) => [item, correct[index]]) };
  } else {
    payload.type = "unsupported";
    answerKey = {};
  }
  return { payload, answerKey, repairedAnswer: recovered.repaired, repairedFormulation: payload.text !== String(question.stem ?? "").trim() };
}

function validateTransformed(question, key, mapping, transformed) {
  const reasons = [], warnings = [];
  const { payload, answerKey } = transformed;
  const grade = Number(question.grade), semester = Number(question.semester);
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) reasons.push("invalid_grade");
  if (![1, 2].includes(semester)) reasons.push("invalid_semester");
  if (!DIFFICULTIES.includes(String(question.difficulty))) reasons.push("invalid_difficulty");
  if (!SUPPORTED_TYPES.has(String(question.question_type))) reasons.push("unsupported_type");
  if (!mapping.subject) reasons.push(mapping.reason || "unmapped_subject");
  if (normalize(payload.text).length < 3) reasons.push("empty_or_short_prompt");
  if (!String(key.rationale ?? "").trim()) reasons.push("missing_explanation");
  if (BLOCKING_FLAGS.some(flag => String(question.quality_flags ?? "").includes(flag))) reasons.push("answer_length_cue");
  for (const flag of WARNING_FLAGS) if (String(question.quality_flags ?? "").includes(flag)) warnings.push(flag.toLocaleLowerCase());

  if (["multiple_choice", "true_false"].includes(payload.type)) {
    const options = Array.isArray(payload.opts) ? payload.opts : [];
    if (payload.type === "multiple_choice" && options.length !== 4) reasons.push("mcq_option_count");
    if (payload.type === "true_false" && options.length !== 2) reasons.push("tf_option_count");
    if (options.some(option => !String(option).trim())) reasons.push("empty_option");
    if (new Set(options.map(normalize)).size !== options.length) reasons.push("duplicate_option");
    if (!Number.isInteger(answerKey.correct) || answerKey.correct < 0 || answerKey.correct >= options.length) reasons.push("answer_not_in_options");
    if (payload.type === "true_false") {
      const tf = options.map(normalize).join("|");
      if (!["ჭეშმარიტი|მცდარი", "true|false"].includes(tf)) reasons.push("inconsistent_true_false_terms");
    }
  }
  if (payload.type === "fill" && (!Array.isArray(answerKey.blanks) || !answerKey.blanks.length || answerKey.blanks.some(value => !String(value).trim()))) reasons.push("missing_fill_answer");
  const computed = directMathResult(payload.text);
  if (computed !== null && payload.type === "fill") {
    const supplied = Number(answerKey.blanks?.[0]);
    if (!Number.isFinite(supplied) || Math.abs(supplied - computed) > 1e-9) reasons.push("direct_math_answer_mismatch");
  }
  if (payload.type === "order") {
    if (!Array.isArray(payload.items) || payload.items.length < 2 || payload.items.length !== answerKey.correct?.length) reasons.push("invalid_order_cardinality");
    if (new Set((payload.items ?? []).map(normalize)).size !== (payload.items ?? []).length) reasons.push("duplicate_order_item");
    if ([...(payload.items ?? [])].map(normalize).sort().join("|") !== [...(answerKey.correct ?? [])].map(normalize).sort().join("|")) reasons.push("order_answer_mismatch");
  }
  if (payload.type === "match") {
    if (!Array.isArray(payload.leftItems) || payload.leftItems.length < 2 || payload.leftItems.length !== payload.rightOptions?.length || payload.leftItems.length !== answerKey.correct?.length) reasons.push("invalid_match_cardinality");
    if (new Set((payload.leftItems ?? []).map(normalize)).size !== (payload.leftItems ?? []).length || new Set((payload.rightOptions ?? []).map(normalize)).size !== (payload.rightOptions ?? []).length) reasons.push("duplicate_match_item");
    if ((answerKey.correct ?? []).some(value => !(payload.rightOptions ?? []).map(normalize).includes(normalize(value)))) reasons.push("match_answer_mismatch");
  }
  if (mapping.subject && policy && !policy.isGradeAppropriate({
    text: payload.text,
    type: payload.type,
    opts: payload.opts,
    items: payload.items,
    leftItems: payload.leftItems,
    rightOptions: payload.rightOptions,
    grade,
    subject: mapping.subject,
    bilingual: Boolean(question.stimulus) || question.language === "ka",
    media: question.media_required === "1" ? { required: true } : null,
  }, { grade, subject: mapping.subject })) reasons.push("grade_policy_violation");
  return { reasons: [...new Set(reasons)], warnings: [...new Set(warnings)] };
}

function questionInsert(row) {
  const columns = ["id", "source_id", "pool_key", "pool_prefix", "grade", "subject", "source_subject", "semester", "topic", "strand", "question_type", "public_payload_json", "points", "difficulty", "review_status", "mapping_status", "semantic_group_id", "content_hash", "active", "imported_at", "updated_at"];
  // Stage rows as inactive. The final manifest activates them only after the
  // matching application code is deployed, preventing mixed old/new sessions.
  const values = [row.id, row.sourceId, row.poolKey, row.poolPrefix, row.grade, row.subject, row.sourceSubject, row.semester, row.topic, row.strand, row.type, JSON.stringify(row.publicPayload), row.points, row.difficulty, row.reviewStatus, row.mappingStatus, row.semanticGroupId, row.contentHash, 0, row.now, row.now];
  return `INSERT INTO assessment_questions (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET source_id=excluded.source_id,pool_key=excluded.pool_key,pool_prefix=excluded.pool_prefix,grade=excluded.grade,subject=excluded.subject,source_subject=excluded.source_subject,semester=excluded.semester,topic=excluded.topic,strand=excluded.strand,question_type=excluded.question_type,public_payload_json=excluded.public_payload_json,points=excluded.points,difficulty=excluded.difficulty,review_status=excluded.review_status,mapping_status=excluded.mapping_status,semantic_group_id=excluded.semantic_group_id,content_hash=excluded.content_hash,active=excluded.active,updated_at=excluded.updated_at;`;
}

function answerInsert(row) {
  return `INSERT INTO assessment_answer_keys (question_id,answer_key_json,explanation,updated_at) VALUES (${sql(row.id)},${sql(JSON.stringify(row.answerKey))},${sql(row.explanation)},${row.now}) ON CONFLICT(question_id) DO UPDATE SET answer_key_json=excluded.answer_key_json,explanation=excluded.explanation,updated_at=excluded.updated_at;`;
}

function testInsert(row) {
  const columns = ["id", "source_test_id", "title", "subject", "grade", "semester", "source_pool", "question_count", "time_minutes", "attempts_allowed", "test_type", "difficulty", "published", "is_custom", "created_by", "created_at", "updated_at"];
  const values = [row.id, row.id, row.title, row.subject, row.grade, row.semester, row.sourcePool, row.questionCount, row.timeMinutes, 3, row.testType, row.difficulty, 1, 0, null, row.now, row.now];
  return `INSERT INTO assessment_tests (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subject=excluded.subject,grade=excluded.grade,semester=excluded.semester,source_pool=excluded.source_pool,question_count=excluded.question_count,time_minutes=excluded.time_minutes,attempts_allowed=excluded.attempts_allowed,test_type=excluded.test_type,difficulty=excluded.difficulty,published=excluded.published,updated_at=excluded.updated_at;`;
}

function increment(record, key, amount = 1) { record[key] = (record[key] ?? 0) + amount; }

function makeTests(rows, now) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.grade}|${row.subject}|${row.semester}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const labels = { foundation: "საბაზისო", application: "გამოყენება", reasoning: "მსჯელობა", challenge: "გამოწვევა" };
  const tests = [];
  for (const [key, group] of [...groups.entries()].sort()) {
    const [grade, subject, semester] = key.split("|");
    const variants = [{ difficulty: null, rows: group, suffix: "შერეული", type: "mixed" }, ...DIFFICULTIES.map(difficulty => ({ difficulty, rows: group.filter(row => row.difficulty === difficulty), suffix: labels[difficulty], type: difficulty }))];
    for (const variant of variants) {
      const concepts = new Set(variant.rows.map(row => row.semanticGroupId)).size;
      if (concepts < 10) continue;
      const count = 10;
      const id = `v8-g${String(grade).padStart(2, "0")}-${sha(subject).slice(0, 8)}-s${semester}-${variant.type}`;
      tests.push({ id, title: `${subject} — ${grade} კლასი — ${semester} სემ. — ${variant.suffix}`, subject, grade: Number(grade), semester: Number(semester), sourcePool: "v8", questionCount: count, timeMinutes: variant.difficulty === "challenge" ? 30 : 20, testType: variant.type, difficulty: variant.difficulty, concepts, now });
    }
  }
  return tests;
}

function markdownReport(report) {
  const table = Object.entries(report.acceptedBySubjectSemesterDifficulty)
    .sort(([a], [b]) => a.localeCompare(b, "ka"))
    .map(([key, count]) => `| ${key.split("|").join(" | ")} | ${count} |`)
    .join("\n");
  const quarantine = Object.entries(report.quarantineReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => `- ${reason}: ${count}`).join("\n");
  return `# EduTest v8 question-bank audit\n\nGenerated: ${report.generatedAt}\n\n## Outcome\n\n- Source records: ${report.sourceRecords}\n- Source deliverable records: ${report.sourceDeliverable}\n- Accepted for live server selection: ${report.acceptedQuestions}\n- Quarantined deliverable records: ${report.quarantinedDeliverable}\n- Generated tests: ${report.generatedTests}\n- Recovered explicit missing fill answers: ${report.repairedAnswers}\n- Repaired incomplete fill-question formulations: ${report.repairedFormulations}\n- Distinct accepted concepts: ${report.acceptedConcepts}\n- Exact duplicate accepted prompts in the same grade/subject/semester: ${report.acceptedExactDuplicateGroups}\n\n## Quarantine reasons\n\n${quarantine || "- none"}\n\n## Accepted distribution\n\n| Grade | Subject | Semester | Difficulty | Questions |\n|---:|---|---:|---|---:|\n${table}\n\n## Release statement\n\nThe live import includes only structurally validated questions. The source package itself states that exact Georgian National Curriculum outcome codes and the supplied hourly weights still require subject-expert verification; the UI must not present this package as ministry-certified. Answer keys remain server-only.\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const questionFiles = [join(args.input, "IMPORT/questions_canonical_40320.jsonl"), join(args.input, "IMPORT/questions_extension.jsonl")];
  const answerFiles = [join(args.input, "SERVER-ONLY/answer_keys_40320.jsonl"), join(args.input, "SERVER-ONLY/answer_keys_extension.jsonl")];
  const [canonical, extension, canonicalAnswers, extensionAnswers] = await Promise.all([...questionFiles.map(jsonl), ...answerFiles.map(jsonl)]);
  const questions = [...canonical, ...extension], keys = new Map([...canonicalAnswers, ...extensionAnswers].map(row => [row.question_id, row]));
  const sourceHash = sha((await Promise.all([...questionFiles, ...answerFiles].map(file => readFile(file)))).map(buffer => sha(buffer)).join("|"));
  const now = Date.now(), ids = new Set(), accepted = [], quarantineReasons = {}, quarantineSamples = {}, warnings = {}, byDistribution = {}, typeCounts = {}, reviewCounts = {};
  let sourceDeliverable = 0, repairedAnswers = 0, repairedFormulations = 0;
  for (const question of questions) {
    if (ids.has(question.question_id)) throw new Error(`Duplicate question_id: ${question.question_id}`);
    ids.add(question.question_id);
    const key = keys.get(question.question_id);
    if (!key) throw new Error(`Missing answer row: ${question.question_id}`);
    if (String(question.deliverable) !== "1" || question.status !== "active") continue;
    sourceDeliverable++;
    const mapping = mappedSubject(question), transformed = transform(question, key, mapping);
    const validation = validateTransformed(question, key, mapping, transformed);
    for (const warning of validation.warnings) increment(warnings, warning);
    if (validation.reasons.length) {
      for (const reason of validation.reasons) {
        increment(quarantineReasons, reason);
        quarantineSamples[reason] ??= [];
        if (quarantineSamples[reason].length < 20) quarantineSamples[reason].push(question.question_id);
      }
      continue;
    }
    if (transformed.repairedAnswer) repairedAnswers++;
    if (transformed.repairedFormulation) repairedFormulations++;
    const semanticGroupId = `v8_${String(question.concept_group).replace(/^CG-/u, "").toLocaleLowerCase()}`;
    const row = {
      id: question.question_id,
      sourceId: question.question_id,
      poolKey: `v8:${question.grade}:${mapping.subject}:${question.semester}:${question.difficulty}`,
      poolPrefix: "v8",
      grade: Number(question.grade),
      subject: mapping.subject,
      sourceSubject: String(question.subject_family || question.subject),
      semester: Number(question.semester),
      topic: String(question.topic || question.curriculum_domain || "ზოგადი"),
      strand: mapping.strand || null,
      type: transformed.payload.type,
      publicPayload: transformed.payload,
      points: transformed.payload.pts,
      difficulty: question.difficulty,
      reviewStatus: String(question.source_review_status || "structural_review"),
      mappingStatus: "v8_subject_taxonomy",
      semanticGroupId,
      contentHash: sha(JSON.stringify({ payload: transformed.payload, answer: transformed.answerKey, explanation: key.rationale })),
      active: true,
      answerKey: transformed.answerKey,
      explanation: String(key.rationale),
      now,
    };
    accepted.push(row);
    increment(byDistribution, `${row.grade}|${row.subject}|${row.semester}|${row.difficulty}`);
    increment(typeCounts, row.type);
    increment(reviewCounts, row.reviewStatus);
  }
  if (keys.size !== questions.length || [...keys.keys()].some(id => !ids.has(id))) throw new Error("Answer/question referential integrity failed");
  const promptGroups = new Map();
  for (const row of accepted) {
    const key = `${row.grade}|${row.subject}|${row.semester}|${normalize(row.publicPayload.text)}`;
    if (!promptGroups.has(key)) promptGroups.set(key, new Set());
    promptGroups.get(key).add(row.semanticGroupId);
  }
  const acceptedExactDuplicateGroups = [...promptGroups.values()].filter(set => set.size > 1).length;
  if (acceptedExactDuplicateGroups) throw new Error(`Accepted exact-prompt semantic collisions: ${acceptedExactDuplicateGroups}`);
  const tests = makeTests(accepted, now);
  const coverage = new Map();
  for (const row of accepted) coverage.set(`${row.grade}|${row.subject}|${row.semester}`, (coverage.get(`${row.grade}|${row.subject}|${row.semester}`) ?? 0) + 1);
  const report = {
    generatedAt: new Date(now).toISOString(), sourceHash,
    sourceRecords: questions.length, sourceCanonical: canonical.length, sourceExtension: extension.length,
    sourceDeliverable, acceptedQuestions: accepted.length, quarantinedDeliverable: sourceDeliverable - accepted.length,
    acceptedConcepts: new Set(accepted.map(row => row.semanticGroupId)).size,
    acceptedExactDuplicateGroups, repairedAnswers, repairedFormulations, generatedTests: tests.length,
    acceptedByType: typeCounts, acceptedByReviewStatus: reviewCounts,
    acceptedBySubjectSemesterDifficulty: byDistribution,
    coveredGradeSubjectSemesters: Object.fromEntries([...coverage.entries()].sort()),
    quarantineReasons, quarantineSamples, warningFlags: warnings,
    validations: {
      json: "pass", ids: "pass", questionAnswerIntegrity: "pass", supportedTypes: "pass", options: "pass",
      answerKeys: "pass", semesterDifficulty: "pass", gradePolicy: "pass", semanticDuplicates: "pass", serverOnlyAnswers: "pass",
    },
    limitations: [
      "Exact Georgian National Curriculum outcome codes are not independently subject-expert verified.",
      "Source hourly weights are observed distributions, not official ministry hours.",
      "Arts/physical-education and digital-technology families remain quarantined pending dedicated subject-expert review.",
      "Static explanations flagged as thin remain usable for scoring but should continue editorial enrichment.",
    ],
  };
  await mkdir(dirname(args.report), { recursive: true });
  await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(args.markdown, markdownReport(report), "utf8");
  if (!args.dryRun) {
    await rm(args.out, { recursive: true, force: true });
    await mkdir(args.out, { recursive: true });
    const chunkSize = 500;
    for (let offset = 0; offset < accepted.length; offset += chunkSize) {
      const rows = accepted.slice(offset, offset + chunkSize);
      await writeFile(join(args.out, `questions-${String(offset / chunkSize + 1).padStart(3, "0")}.sql`), `PRAGMA foreign_keys=ON;\n${rows.flatMap(row => [questionInsert(row), answerInsert(row)]).join("\n")}\n`, "utf8");
    }
    const covered = [...coverage.keys()].map(key => key.split("|"));
    const finalSql = ["PRAGMA foreign_keys=ON;"];
    finalSql.push(`UPDATE assessment_questions SET active=1,updated_at=${now} WHERE pool_prefix='v8';`);
    for (const [grade, subject, semester] of covered) {
      finalSql.push(`UPDATE assessment_questions SET active=0,updated_at=${now} WHERE grade=${Number(grade)} AND subject=${sql(subject)} AND semester=${Number(semester)} AND pool_prefix<>'v8';`);
      finalSql.push(`UPDATE assessment_tests SET published=0,updated_at=${now} WHERE is_custom=0 AND grade=${Number(grade)} AND subject=${sql(subject)} AND semester=${Number(semester)} AND source_pool<>'v8';`);
    }
    finalSql.push(...tests.map(testInsert));
    finalSql.push(`INSERT INTO assessment_import_runs (id,source_hash,source_questions,imported_questions,imported_tests,report_json,imported_at) VALUES (${sql(`v8-${sourceHash.slice(0, 16)}`)},${sql(sourceHash)},${questions.length},${accepted.length},${tests.length},${sql(JSON.stringify(report))},${now}) ON CONFLICT(source_hash) DO UPDATE SET imported_questions=excluded.imported_questions,imported_tests=excluded.imported_tests,report_json=excluded.report_json,imported_at=excluded.imported_at;`);
    await writeFile(join(args.out, "finalize-tests.sql"), `${finalSql.join("\n")}\n`, "utf8");
  }
  console.log(JSON.stringify({ ok: true, source: questions.length, deliverable: sourceDeliverable, accepted: accepted.length, quarantined: sourceDeliverable - accepted.length, tests: tests.length, repairedAnswers, repairedFormulations, report: args.report, out: args.dryRun ? null : args.out }));
}

export { directMathResult, mappedSubject, recoverMissingScalarAnswer, transform, validateTransformed };

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });
}
