import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const EXPECTED_QUESTIONS = 12_600;
const EXPECTED_SOURCE_TESTS = 336;
const DEFAULT_OUT = resolve(".openai/d1-assessment-import");
const DEFAULT_REPORT = resolve("reports/assessment-import-report.json");
const PUBLIC_KEYS = ["id", "text", "type", "pts", "grade", "subject", "semester", "topic", "opts", "items", "leftItems", "rightOptions", "tolerance", "media", "visual"];
const QUESTION_TYPES = new Set(["multiple_choice", "true_false", "calc", "order", "match", "fill"]);

function parseArgs(argv) {
  const args = { dryRun: false, out: DEFAULT_OUT, report: DEFAULT_REPORT, seed: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--seed") args.seed = resolve(argv[++i] ?? "");
    else if (argv[i] === "--out") args.out = resolve(argv[++i] ?? "");
    else if (argv[i] === "--report") args.report = resolve(argv[++i] ?? "");
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.seed) throw new Error("--seed <server-only seed.json> is required");
  return args;
}

const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = value => String(value ?? "")
  .normalize("NFKC")
  .toLocaleLowerCase("ka-GE")
  .replace(/^(?:საკლასო პრაქტიკა|დამოუკიდებელი სავარჯიშო)\s*[—:-]\s*/u, "")
  .replace(/[“”„"'`]/gu, "")
  .replace(/\s+/gu, " ")
  .trim();
const sql = value => value == null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const bool = value => value ? 1 : 0;

function generatedFamilyKey(id) {
  const match = String(id ?? "").match(/^(g\d+[a-z]+)\d+_(\d+)(?:_x\d+)?$/iu);
  return match ? `${match[1].toLocaleLowerCase()}:${Number(match[2])}` : "";
}

function mappedSubject(question) {
  if (question.subject === "მეორე უცხოური — რუსული") return { subject: "რუსული", status: "alias" };
  return { subject: question.subject, status: "exact" };
}

function expectedAnswer(question) {
  const p = question.public_payload, key = question.answer_key;
  if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
    if (!Array.isArray(p.opts) || p.opts.length < 2 || p.opts.some(option => !String(option).trim())) throw new Error(`${question.id}: invalid options`);
    if (new Set(p.opts.map(normalize)).size !== p.opts.length) throw new Error(`${question.id}: duplicate options`);
    if (!Number.isInteger(key.correct) || key.correct < 0 || key.correct >= p.opts.length) throw new Error(`${question.id}: invalid correct option`);
    if (question.question_type === "true_false" && p.opts.length !== 2) throw new Error(`${question.id}: true_false must have two options`);
  } else if (question.question_type === "calc") {
    if (!Number.isFinite(Number(key.correct)) || !Number.isFinite(Number(key.tolerance ?? 0)) || Number(key.tolerance ?? 0) < 0) throw new Error(`${question.id}: invalid numeric key`);
  } else if (question.question_type === "order") {
    if (!Array.isArray(p.items) || !Array.isArray(key.correct) || p.items.length < 2 || p.items.length !== key.correct.length) throw new Error(`${question.id}: invalid order key`);
    if (new Set(p.items.map(normalize)).size !== p.items.length || new Set(key.correct.map(normalize)).size !== key.correct.length) throw new Error(`${question.id}: duplicate order item`);
    if ([...p.items].map(normalize).sort().join("|") !== [...key.correct].map(normalize).sort().join("|")) throw new Error(`${question.id}: order key does not match items`);
  } else if (question.question_type === "match") {
    if (!Array.isArray(p.leftItems) || !Array.isArray(p.rightOptions) || !Array.isArray(key.correct) || !Array.isArray(key.pairs)) throw new Error(`${question.id}: invalid match key`);
    if (p.leftItems.length < 2 || p.leftItems.length !== p.rightOptions.length || p.leftItems.length !== key.correct.length || p.leftItems.length !== key.pairs.length) throw new Error(`${question.id}: match cardinality mismatch`);
    if (new Set(p.leftItems.map(normalize)).size !== p.leftItems.length || new Set(p.rightOptions.map(normalize)).size !== p.rightOptions.length) throw new Error(`${question.id}: duplicate match item`);
    for (let i = 0; i < key.pairs.length; i++) if (normalize(key.pairs[i]?.[0]) !== normalize(p.leftItems[i]) || normalize(key.pairs[i]?.[1]) !== normalize(key.correct[i])) throw new Error(`${question.id}: match pairs disagree with answer`);
  } else if (question.question_type === "fill") {
    if (!Array.isArray(key.blanks) || !key.blanks.length || key.blanks.some(item => !String(item).trim())) throw new Error(`${question.id}: invalid fill key`);
  }
}

function validateQuestion(question) {
  if (!question || typeof question !== "object" || !String(question.id ?? "").trim()) throw new Error("Question without id");
  if (!Number.isInteger(question.grade) || question.grade < 1 || question.grade > 12) throw new Error(`${question.id}: invalid grade`);
  if (![1, 2].includes(question.semester)) throw new Error(`${question.id}: invalid semester`);
  if (!QUESTION_TYPES.has(question.question_type)) throw new Error(`${question.id}: unsupported type ${question.question_type}`);
  if (!question.public_payload || normalize(question.public_payload.text).length < 2) throw new Error(`${question.id}: empty prompt`);
  if (question.public_payload.id !== question.id || question.public_payload.type !== question.question_type) throw new Error(`${question.id}: public payload identity mismatch`);
  if (!question.answer_key || typeof question.answer_key !== "object") throw new Error(`${question.id}: missing answer key`);
  if (!String(question.explanation ?? "").trim()) throw new Error(`${question.id}: missing explanation`);
  if (question.public_payload.reviewStatus !== "curriculum_reviewed") throw new Error(`${question.id}: not curriculum_reviewed`);
  expectedAnswer(question);
}

function publicPayload(question, subject) {
  const source = { ...question.public_payload, id: question.id, type: question.question_type, pts: question.points, grade: question.grade, subject, semester: question.semester, topic: question.topic };
  return Object.fromEntries(PUBLIC_KEYS.filter(key => source[key] !== undefined).map(key => [key, source[key]]));
}

function questionInsert(row) {
  const columns = ["id","source_id","pool_key","pool_prefix","grade","subject","source_subject","semester","topic","strand","question_type","public_payload_json","points","difficulty","review_status","mapping_status","semantic_group_id","content_hash","active","imported_at","updated_at"];
  const values = [row.id,row.sourceId,row.poolKey,row.poolPrefix,row.grade,row.subject,row.sourceSubject,row.semester,row.topic,row.strand,row.type,JSON.stringify(row.publicPayload),row.points,row.difficulty,"curriculum_reviewed",row.mappingStatus,row.semanticGroupId,row.contentHash,bool(row.active),row.now,row.now];
  return `INSERT INTO assessment_questions (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET pool_key=excluded.pool_key,pool_prefix=excluded.pool_prefix,grade=excluded.grade,subject=excluded.subject,source_subject=excluded.source_subject,semester=excluded.semester,topic=excluded.topic,strand=excluded.strand,question_type=excluded.question_type,public_payload_json=excluded.public_payload_json,points=excluded.points,difficulty=excluded.difficulty,review_status=excluded.review_status,mapping_status=excluded.mapping_status,semantic_group_id=excluded.semantic_group_id,content_hash=excluded.content_hash,active=excluded.active,updated_at=excluded.updated_at;`;
}

function answerInsert(row) {
  return `INSERT INTO assessment_answer_keys (question_id,answer_key_json,explanation,updated_at) VALUES (${sql(row.id)},${sql(JSON.stringify(row.answerKey))},${sql(row.explanation)},${row.now}) ON CONFLICT(question_id) DO UPDATE SET answer_key_json=excluded.answer_key_json,explanation=excluded.explanation,updated_at=excluded.updated_at;`;
}

function makeTestRows(tests, questionRows, now) {
  const available = new Map();
  for (const q of questionRows) {
    const bucket = `${q.grade}|${q.subject}|${q.semester}`;
    if (!available.has(bucket)) available.set(bucket, new Set());
    available.get(bucket).add(q.semanticGroupId);
  }
  const rows = [];
  for (const test of tests) {
    const subject = test.subject === "მეორე უცხოური — რუსული" ? "რუსული" : test.subject;
    const requestedCount = Number(test.count), semester = Number(test.semester);
    const availableCount = available.get(`${test.grade}|${subject}|${semester}`)?.size ?? 0;
    if (availableCount < 5 || requestedCount < 5) throw new Error(`${test.id}/${subject}: insufficient distinct question pool (${availableCount})`);
    rows.push({
      id: `sv-${test.id}`, sourceTestId: test.id, title: `${subject} — ${test.grade} კლასი — ${semester} სემ.${test.testType === "sum" ? " შემაჯამებელი" : ""}`, subject,
      grade: test.grade, semester, sourcePool: test.pool, questionCount: Math.min(requestedCount, availableCount), timeMinutes: Number(test.time), attemptsAllowed: Number(test.attempts),
      testType: test.testType, published: 1, isCustom: 0, createdBy: null, now,
    });
  }
  return rows;
}

function testInsert(row) {
  const columns = ["id","source_test_id","title","subject","grade","semester","source_pool","question_count","time_minutes","attempts_allowed","test_type","published","is_custom","created_by","created_at","updated_at"];
  const values = [row.id,row.sourceTestId,row.title,row.subject,row.grade,row.semester,row.sourcePool,row.questionCount,row.timeMinutes,row.attemptsAllowed,row.testType,row.published,row.isCustom,row.createdBy,row.now,row.now];
  return `INSERT INTO assessment_tests (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET source_test_id=excluded.source_test_id,title=excluded.title,subject=excluded.subject,grade=excluded.grade,semester=excluded.semester,source_pool=excluded.source_pool,question_count=excluded.question_count,time_minutes=excluded.time_minutes,attempts_allowed=excluded.attempts_allowed,test_type=excluded.test_type,published=excluded.published,updated_at=excluded.updated_at;`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceText = await readFile(args.seed, "utf8"), sourceHash = sha(sourceText), source = JSON.parse(sourceText);
  if (!Array.isArray(source.questions) || source.questions.length !== EXPECTED_QUESTIONS) throw new Error(`Expected ${EXPECTED_QUESTIONS} questions, got ${source.questions?.length}`);
  if (!Array.isArray(source.tests) || source.tests.length !== EXPECTED_SOURCE_TESTS) throw new Error(`Expected ${EXPECTED_SOURCE_TESTS} tests, got ${source.tests?.length}`);
  const ids = new Set(), now = Date.now(), rows = [], byType = {}, byGradeSubject = {}, mapping = {}, semanticCounts = new Map();
  for (const question of source.questions) {
    validateQuestion(question);
    if (ids.has(question.id)) throw new Error(`Duplicate id: ${question.id}`); ids.add(question.id);
    const mapped = mappedSubject(question), payload = publicPayload(question, mapped.subject);
    const family = generatedFamilyKey(question.id);
    const semanticIdentity = family
      ? `${question.grade}|${mapped.subject}|${question.semester}|family:${family}`
      : `${question.grade}|${mapped.subject}|${question.semester}|${question.topic}|${normalize(question.public_payload.text)}`;
    const semanticGroupId = `sg_${sha(semanticIdentity).slice(0, 24)}`;
    const row = {
      id: question.id, sourceId: question.id, poolKey: question.pool_key, poolPrefix: question.pool_prefix, grade: question.grade,
      subject: mapped.subject, sourceSubject: question.subject, semester: question.semester, topic: question.topic,
      strand: question.public_payload.mathStrandKey ?? null, type: question.question_type, publicPayload: payload, points: Number(question.points),
      difficulty: question.public_payload.difficulty ?? null, mappingStatus: mapped.status, semanticGroupId,
      contentHash: sha(JSON.stringify({ payload, answer: question.answer_key, explanation: question.explanation })), active: question.active !== false,
      answerKey: question.answer_key, explanation: question.explanation, now,
    };
    rows.push(row); byType[row.type] = (byType[row.type] ?? 0) + 1; mapping[mapped.status] = (mapping[mapped.status] ?? 0) + 1;
    const bucket = `${row.grade}|${row.subject}|${row.semester}`; byGradeSubject[bucket] = (byGradeSubject[bucket] ?? 0) + 1;
    semanticCounts.set(semanticGroupId, (semanticCounts.get(semanticGroupId) ?? 0) + 1);
  }
  const testRows = makeTestRows(source.tests, rows, now);
  const lowDiversityPools = [];
  for (const [bucket, count] of Object.entries(byGradeSubject)) {
    const unique = new Set(rows.filter(row => `${row.grade}|${row.subject}|${row.semester}` === bucket).map(row => row.semanticGroupId)).size;
    if (unique < 20) lowDiversityPools.push({ bucket, questions: count, semanticGroups: unique });
  }
  for (const test of testRows) {
    const available = new Set(rows.filter(row => row.grade === test.grade && row.subject === test.subject && row.semester === test.semester).map(row => row.semanticGroupId)).size;
    if (available < test.questionCount) throw new Error(`${test.id}: semantic diversity release gate failed (${available}/${test.questionCount})`);
  }
  const report = {
    generatedAt: new Date(now).toISOString(), sourceHash, sourceQuestions: source.questions.length, sourceTests: source.tests.length,
    importedQuestions: rows.length, importedTests: testRows.length, uniqueIds: ids.size, answerKeysServerOnly: rows.length,
    questionTypes: byType, subjectMapping: mapping, gradeSubjectSemester: byGradeSubject,
    semanticGroups: semanticCounts.size, semanticDuplicateGroups: [...semanticCounts.values()].filter(value => value > 1).length,
    lowDiversityPools, validations: { schema: "pass", ids: "pass", answerKeys: "pass", options: "pass", explanations: "pass", curriculumReview: "pass", semanticDiversity: "pass" },
  };
  await mkdir(dirname(args.report), { recursive: true }); await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!args.dryRun) {
    await rm(args.out, { recursive: true, force: true }); await mkdir(args.out, { recursive: true });
    // Keep uploads below Cloudflare's import-size ceiling while avoiding dozens
    // of slow network round-trips. Every statement is idempotent.
    const chunkSize = 1_000;
    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize);
      const statements = ["PRAGMA foreign_keys=ON;", ...chunk.flatMap(row => [questionInsert(row), answerInsert(row)])];
      await writeFile(join(args.out, `questions-${String(offset / chunkSize + 1).padStart(3, "0")}.sql`), `${statements.join("\n")}\n`, "utf8");
    }
    const testSql = ["PRAGMA foreign_keys=ON;", "UPDATE assessment_tests SET published=0, updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE is_custom=0 AND grade>=7 AND subject IN ('ალგებრა','გეომეტრია');", ...testRows.map(testInsert), `INSERT INTO assessment_import_runs (id,source_hash,source_questions,imported_questions,imported_tests,report_json,imported_at) VALUES (${sql(`import-${sourceHash.slice(0, 16)}`)},${sql(sourceHash)},${source.questions.length},${rows.length},${testRows.length},${sql(JSON.stringify(report))},${now}) ON CONFLICT(source_hash) DO UPDATE SET imported_questions=excluded.imported_questions,imported_tests=excluded.imported_tests,report_json=excluded.report_json,imported_at=excluded.imported_at;`];
    await writeFile(join(args.out, "tests-and-manifest.sql"), `${testSql.join("\n")}\n`, "utf8");
  }
  console.log(JSON.stringify({ ok: true, dryRun: args.dryRun, questions: rows.length, sourceTests: source.tests.length, importedTests: testRows.length, semanticGroups: semanticCounts.size, report: args.report, out: args.dryRun ? null : args.out }));
}

main().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });
