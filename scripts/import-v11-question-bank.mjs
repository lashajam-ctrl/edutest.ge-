import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const QUESTION_FILES = ["IMPORT/questions_canonical_40320.jsonl", "IMPORT/questions_extension.jsonl"];
const ANSWER_FILES = ["SERVER-ONLY/answer_keys_40320.jsonl", "SERVER-ONLY/answer_keys_extension.jsonl"];
const BROKEN_CONTEXT_IDS = new Set([
  "GE-G07-SO-S1-113", "GE-G12-MA-S2-137", "GE-G12-MA-S2-147", "GE-G12-MA-S2-157",
  "GE2-G01-MA-S1-012", "GE2-G01-MA-S1-022", "GE2-G01-MA-S1-032", "GE2-G01-MA-S1-052",
  "GE2-G01-MA-S1-092", "GE2-G01-MA-S2-085", "GE2-G02-MA-S1-012", "GE2-G02-MA-S1-022",
  "GE2-G02-MA-S1-032", "GE2-G02-MA-S1-072", "GE2-G02-MA-S2-035", "GE2-G02-MA-S2-085",
  "GE2-G07-SO-S1-003", "GE2-G07-SO-S1-013",
]);

const SUBJECTS_BY_GRADE = {
  1: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება"],
  2: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება"],
  3: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება", "მე და საზოგადოება"],
  4: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება", "მე და საზოგადოება"],
  5: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება", "ჩვენი საქართველო"],
  6: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება", "ჩვენი საქართველო"],
  7: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "მოქალაქეობა"],
  8: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  9: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  10: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  11: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  12: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "ისტორია", "სამოქალაქო თავდაცვა და უსაფრთხოება"],
};

const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = value => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ka-GE").replace(/\s+/gu, " ").trim();
const sql = value => value == null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
function parseArgs(argv) {
  const args = { source: "", out: resolve(".openai/d1-v11-import"), report: resolve("reports/v11-platform-import-report.json"), dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") args.source = resolve(argv[++i] ?? "");
    else if (argv[i] === "--out") args.out = resolve(argv[++i] ?? "");
    else if (argv[i] === "--report") args.report = resolve(argv[++i] ?? "");
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.source) throw new Error("--source <extracted v11 directory> is required");
  return args;
}

async function readJsonLines(path) {
  return (await readFile(path, "utf8")).split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line));
}

function csvCells(line) {
  const cells = []; let value = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value); value = ""; }
    else value += char;
  }
  cells.push(value); return cells;
}

async function approvedSubjectFixes(source) {
  const text = await readFile(join(source, "QA/sme_prefilled_physics_biology.csv"), "utf8");
  const fixes = new Map();
  for (const line of text.split(/\r?\n/u).slice(1).filter(Boolean)) {
    const cells = csvCells(line);
    if (cells[0] && cells[6]) fixes.set(cells[0], cells[6]);
  }
  return fixes;
}

function mappedSubject(question, fixedSubsubject) {
  const grade = Number(question.grade), bank = String(question.bank_id), sub = fixedSubsubject || String(question.subsubject);
  if (bank.endsWith("-KA")) return grade >= 7 ? "ქართული ენა და ლიტერატურა" : "ქართული";
  if (bank.endsWith("-EN")) return "ინგლისური";
  if (bank.endsWith("-MA")) return "მათემატიკა";
  if (bank.endsWith("-SC")) {
    if (grade <= 6) return "ბუნება";
    if (["ბიოლოგია", "ფიზიკა", "ქიმია"].includes(sub)) return sub;
    return null;
  }
  if (bank.endsWith("-SO")) {
    if (grade <= 4) return grade >= 3 ? "მე და საზოგადოება" : null;
    if (grade <= 6) return "ჩვენი საქართველო";
    if (sub === "სამოქალაქო განათლება") return "მოქალაქეობა";
    if (["ისტორია", "გეოგრაფია", "მოქალაქეობა", "სამოქალაქო თავდაცვა და უსაფრთხოება"].includes(sub)) return sub;
  }
  return null;
}

function pointsFor(question) {
  return question.difficulty === "foundation" ? 1 : question.difficulty === "challenge" ? 3 : 2;
}

function topicFor(question, fixedSubsubject) {
  const sub = fixedSubsubject || String(question.subsubject ?? "");
  return `${sub} · ${question.topic || question.curriculum_domain || "ზოგადი"}`.slice(0, 240);
}

function parsedOptions(question) {
  try { return JSON.parse(question.options_json || "{}"); } catch { return {}; }
}

function answerKeyFor(question, answerRow) {
  if (!answerRow || answerRow.answer_json === "null" || answerRow.answer_json == null) return { error: "missing_answer" };
  let answer;
  try { answer = JSON.parse(answerRow.answer_json); } catch { return { error: "invalid_answer_json" }; }
  const options = parsedOptions(question), type = String(question.question_type);
  if (type === "MCQ" || type === "TF") {
    const choices = Array.isArray(options.choices) ? options.choices.map(String) : [];
    if (choices.length < 2 || choices.some(choice => !choice.trim()) || new Set(choices.map(normalize)).size !== choices.length) return { error: "invalid_options" };
    const matches = choices.map(normalize).map((choice, index) => choice === normalize(answer) ? index : -1).filter(index => index >= 0);
    if (matches.length !== 1 || (type === "TF" && choices.length !== 2)) return { error: "answer_option_mismatch" };
    return { type: type === "TF" ? "true_false" : "multiple_choice", payload: { opts: choices }, key: { correct: matches[0] } };
  }
  if (type === "ORDER") {
    const items = Array.isArray(options.items) ? options.items.map(String) : [], expected = Array.isArray(answer) ? answer.map(String) : [];
    if (items.length < 2 || items.length !== expected.length || new Set(items.map(normalize)).size !== items.length || [...items].map(normalize).sort().join("|") !== [...expected].map(normalize).sort().join("|")) return { error: "invalid_order" };
    return { type: "order", payload: { items }, key: { correct: expected } };
  }
  if (type === "MATCH") {
    const left = Array.isArray(options.left) ? options.left.map(String) : [], right = Array.isArray(options.right) ? options.right.map(String) : [];
    if (!answer || typeof answer !== "object" || Array.isArray(answer) || left.length < 2 || left.length !== right.length || new Set(left.map(normalize)).size !== left.length || new Set(right.map(normalize)).size !== right.length) return { error: "invalid_match" };
    const expected = left.map(item => String(answer[item] ?? ""));
    if (expected.some(item => !item) || [...expected].map(normalize).sort().join("|") !== [...right].map(normalize).sort().join("|")) return { error: "match_answer_mismatch" };
    return { type: "match", payload: { leftItems: left, rightOptions: right }, key: { correct: expected, pairs: left.map((item, index) => [item, expected[index]]) } };
  }
  if (type === "FILL" || type === "OPEN") {
    const blanks = Array.isArray(answer) ? answer.map(String) : [String(answer)];
    if (!blanks.length || blanks.some(item => !item.trim()) || blanks.some(item => item.length > 160)) return { error: "invalid_fill" };
    return { type: "fill", payload: {}, key: { blanks }, appendBlank: type === "OPEN" || !String(question.stem).includes("___") };
  }
  return { error: "unsupported_type" };
}

function questionInsert(row) {
  const columns = ["id","source_id","pool_key","pool_prefix","grade","subject","source_subject","semester","topic","strand","question_type","public_payload_json","points","difficulty","review_status","mapping_status","semantic_group_id","content_hash","active","imported_at","updated_at"];
  const values = [row.id,row.sourceId,row.poolKey,"v11",row.grade,row.subject,row.sourceSubject,row.semester,row.topic,row.strand,row.type,JSON.stringify(row.payload),row.points,row.difficulty,"algorithmically_validated","v11_platform_rule",row.semanticGroupId,row.contentHash,1,row.now,row.now];
  return `INSERT INTO assessment_questions (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET pool_key=excluded.pool_key,pool_prefix=excluded.pool_prefix,grade=excluded.grade,subject=excluded.subject,source_subject=excluded.source_subject,semester=excluded.semester,topic=excluded.topic,strand=excluded.strand,question_type=excluded.question_type,public_payload_json=excluded.public_payload_json,points=excluded.points,difficulty=excluded.difficulty,review_status=excluded.review_status,mapping_status=excluded.mapping_status,semantic_group_id=excluded.semantic_group_id,content_hash=excluded.content_hash,active=1,updated_at=excluded.updated_at;`;
}

function answerInsert(row) {
  return `INSERT INTO assessment_answer_keys (question_id,answer_key_json,explanation,updated_at) VALUES (${sql(row.id)},${sql(JSON.stringify(row.answerKey))},${sql(row.explanation)},${row.now}) ON CONFLICT(question_id) DO UPDATE SET answer_key_json=excluded.answer_key_json,explanation=excluded.explanation,updated_at=excluded.updated_at;`;
}

function testInsert(row) {
  const columns = ["id","source_test_id","title","subject","grade","semester","source_pool","question_count","time_minutes","attempts_allowed","test_type","published","is_custom","created_by","created_at","updated_at"];
  const values = [row.id,row.id,row.title,row.subject,row.grade,row.semester,"v11",row.count,row.count * 2,999,"practice",1,0,null,row.now,row.now];
  return `INSERT INTO assessment_tests (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subject=excluded.subject,grade=excluded.grade,semester=excluded.semester,source_pool='v11',question_count=excluded.question_count,time_minutes=excluded.time_minutes,attempts_allowed=excluded.attempts_allowed,test_type=excluded.test_type,published=1,updated_at=excluded.updated_at;`;
}

function testId(grade, subject, semester) {
  return `v11-g${grade}-s${semester}-${sha(subject).slice(0, 10)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2)), now = Date.now();
  const questions = (await Promise.all(QUESTION_FILES.map(file => readJsonLines(join(args.source, file))))).flat();
  const answers = new Map((await Promise.all(ANSWER_FILES.map(file => readJsonLines(join(args.source, file))))).flat().map(row => [row.question_id, row]));
  const subjectFixes = await approvedSubjectFixes(args.source), rows = [], excluded = {}, byBucket = new Map(), byType = {}, remapped = [];
  const exclude = reason => { excluded[reason] = (excluded[reason] ?? 0) + 1; };
  for (const question of questions) {
    if (question.status !== "active" || String(question.deliverable) !== "1") { exclude(`source_${question.status}`); continue; }
    if (BROKEN_CONTEXT_IDS.has(question.question_id)) { exclude("confirmed_missing_context"); continue; }
    if (String(question.media_required) === "1") { exclude("media_asset_not_in_archive"); continue; }
    const fixedSubsubject = subjectFixes.get(question.question_id) || String(question.subsubject);
    if (fixedSubsubject !== question.subsubject) remapped.push({ id: question.question_id, from: question.subsubject, to: fixedSubsubject });
    const subject = mappedSubject(question, fixedSubsubject), grade = Number(question.grade), semester = Number(question.semester);
    if (!subject || !SUBJECTS_BY_GRADE[grade]?.includes(subject)) { exclude("outside_live_catalog"); continue; }
    const answer = answerKeyFor(question, answers.get(question.question_id));
    if (answer.error) { exclude(answer.error); continue; }
    let text = [String(question.stimulus || "").trim(), String(question.stem || "").trim()].filter(Boolean).join("\n\n");
    if (answer.appendBlank) text += "\n\nპასუხი: ___";
    if (text.length < 3) { exclude("empty_prompt"); continue; }
    const id = `v11-${question.question_id}`, topic = topicFor(question, fixedSubsubject), payload = { id, text, type: answer.type, pts: pointsFor(question), grade, subject, semester, topic, ...answer.payload, difficulty: question.difficulty };
    const row = {
      id, sourceId: `v11:${question.question_id}`, poolKey: `${question.bank_id}|${semester}|${fixedSubsubject}`, grade, subject,
      sourceSubject: `${question.subject_family} / ${question.subsubject}`, semester, topic, strand: fixedSubsubject,
      type: answer.type, payload, points: pointsFor(question), difficulty: question.difficulty,
      semanticGroupId: String(question.concept_group || `v11_${question.semantic_signature}`),
      contentHash: sha(JSON.stringify({ payload, answer: answer.key, rationale: answers.get(question.question_id)?.rationale })),
      answerKey: answer.key, explanation: String(answers.get(question.question_id)?.rationale || "პასუხი შემოწმებულია სერვერზე."), now,
    };
    rows.push(row); byType[row.type] = (byType[row.type] ?? 0) + 1;
    const bucket = `${grade}|${subject}|${semester}`;
    if (!byBucket.has(bucket)) byBucket.set(bucket, { rows: 0, groups: new Set() });
    byBucket.get(bucket).rows++; byBucket.get(bucket).groups.add(row.semanticGroupId);
  }
  const tests = [], capacity = [];
  for (const [bucket, value] of [...byBucket].sort()) {
    const [gradeText, subject, semesterText] = bucket.split("|"), grade = Number(gradeText), semester = Number(semesterText), groups = value.groups.size;
    const count = groups >= 10 ? 10 : groups >= 5 ? 5 : 0;
    capacity.push({ grade, subject, semester, questions: value.rows, semanticGroups: groups, testQuestions: count, dailyFullFreshTests: count ? Math.floor(groups / count) : 0 });
    if (!count) continue;
    tests.push({ id: testId(grade, subject, semester), title: `${subject} — ${grade} კლასი — ${semester} სემ.`, subject, grade, semester, count, now });
  }
  const report = {
    generatedAt: new Date(now).toISOString(), sourceVersion: "v11", sourceQuestions: questions.length,
    sourceActiveDeliverable: questions.filter(row => row.status === "active" && String(row.deliverable) === "1").length,
    importedQuestions: rows.length, importedTests: tests.length, answerKeysServerOnly: rows.length,
    excluded, questionTypes: byType, confirmedFixes: { biologyRetags: remapped.length, missingContextBlocked: excluded.confirmed_missing_context ?? 0, missingAnswerBlocked: excluded.missing_answer ?? 0 },
    capacity, validations: { activeOnly: "pass", answerPresence: "pass", uniqueOptions: "pass", exactlyOneMcqAnswer: "pass", contextBlocklist: "pass", catalogRules: "pass", semanticRotationCapacity: "pass" },
    retainedLegacySubjects: ["რუსული"],
    humanReview: "not_performed; imported rows are algorithmically validated, not SME-approved",
  };
  await mkdir(dirname(args.report), { recursive: true }); await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!args.dryRun) {
    await rm(args.out, { recursive: true, force: true }); await mkdir(args.out, { recursive: true });
    const chunkSize = 500;
    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize), statements = ["PRAGMA foreign_keys=ON;", ...chunk.flatMap(row => [questionInsert(row), answerInsert(row)])];
      await writeFile(join(args.out, `questions-${String(offset / chunkSize + 1).padStart(3, "0")}.sql`), `${statements.join("\n")}\n`, "utf8");
    }
    const covered = new Set(tests.map(test => `${test.grade}|${test.subject}`));
    const unpublish = [...covered].map(key => { const [grade, subject] = key.split("|"); return `(grade=${Number(grade)} AND subject=${sql(subject)})`; }).join(" OR ");
    const manifest = ["PRAGMA foreign_keys=ON;",
      `INSERT INTO assessment_question_history (user_id,question_id,semantic_group_id,answered_count,correct_count,last_correct,last_answered_at,next_review_at) SELECT h.user_id,n.id,n.semantic_group_id,h.answered_count,h.correct_count,h.last_correct,h.last_answered_at,h.next_review_at FROM assessment_question_history h JOIN assessment_questions o ON o.id=h.question_id JOIN assessment_questions n ON n.source_id=('v11:' || o.source_id) WHERE n.pool_prefix='v11' ON CONFLICT(user_id,question_id) DO UPDATE SET answered_count=MAX(assessment_question_history.answered_count,excluded.answered_count),correct_count=MAX(assessment_question_history.correct_count,excluded.correct_count),last_correct=excluded.last_correct,last_answered_at=MAX(assessment_question_history.last_answered_at,excluded.last_answered_at),next_review_at=MAX(assessment_question_history.next_review_at,excluded.next_review_at);`,
      `UPDATE assessment_questions SET active=0,updated_at=${now} WHERE pool_prefix='v8' OR (pool_prefix='v11' AND source_id NOT LIKE 'v11:%');`,
      `UPDATE assessment_tests SET published=0,updated_at=${now} WHERE is_custom=0 AND (${unpublish});`, ...tests.map(testInsert),
      `INSERT INTO assessment_import_runs (id,source_hash,source_questions,imported_questions,imported_tests,report_json,imported_at) VALUES (${sql(`v11-${sha(JSON.stringify(report)).slice(0, 16)}`)},${sql(sha(JSON.stringify(report)))},${questions.length},${rows.length},${tests.length},${sql(JSON.stringify(report))},${now}) ON CONFLICT(source_hash) DO UPDATE SET imported_questions=excluded.imported_questions,imported_tests=excluded.imported_tests,report_json=excluded.report_json,imported_at=excluded.imported_at;`];
    await writeFile(join(args.out, "999-tests-and-manifest.sql"), `${manifest.join("\n")}\n`, "utf8");
  }
  console.log(JSON.stringify({ ok: true, questions: rows.length, tests: tests.length, fixes: report.confirmedFixes, excluded: report.excluded, out: args.dryRun ? null : args.out, report: args.report }));
}

main().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });
