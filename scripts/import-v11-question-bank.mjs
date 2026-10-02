import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyOpenAnswer } from "../lib/short-answer-core.mjs";
import { parseNumericShortAnswer } from "../lib/short-answer-core.mjs";
import { CIVICS_SUPPLEMENT, CIVICS_SUPPLEMENT_BLUEPRINT } from "../data/civics-supplement-v1.mjs";
import { WEAK_BANK_SUPPLEMENT, WEAK_BANK_SUPPLEMENT_BLUEPRINT } from "../data/weak-bank-supplement-v1.mjs";
import { QUALITY_EXPANSION_V2, QUALITY_EXPANSION_V2_BLUEPRINT } from "../data/quality-expansion-v2.mjs";
import { directMathResult } from "./import-v8-question-bank.mjs";

const QUESTION_FILES = ["IMPORT/questions_canonical_40320.jsonl", "IMPORT/questions_extension.jsonl"];
const ANSWER_FILES = ["SERVER-ONLY/answer_keys_40320.jsonl", "SERVER-ONLY/answer_keys_extension.jsonl"];
const BROKEN_CONTEXT_IDS = new Set([
  "GE-G07-SO-S1-113", "GE-G12-MA-S2-137", "GE-G12-MA-S2-147", "GE-G12-MA-S2-157",
  "GE2-G01-MA-S1-012", "GE2-G01-MA-S1-022", "GE2-G01-MA-S1-032", "GE2-G01-MA-S1-052",
  "GE2-G01-MA-S1-092", "GE2-G01-MA-S2-085", "GE2-G02-MA-S1-012", "GE2-G02-MA-S1-022",
  "GE2-G02-MA-S1-032", "GE2-G02-MA-S1-072", "GE2-G02-MA-S2-035", "GE2-G02-MA-S2-085",
  "GE2-G07-SO-S1-003", "GE2-G07-SO-S1-013",
]);

import { ASSESSMENT_SUBJECTS_BY_GRADE } from "../lib/school-policy.mjs";
// Source capability: this archive has no Russian. School availability is unchanged.
const SUBJECTS_BY_GRADE = Object.fromEntries(Object.entries(ASSESSMENT_SUBJECTS_BY_GRADE).map(([grade, subjects]) => [grade, subjects.filter(subject => subject !== "რუსული")]));
// These pre-versioned English pools are fully replaced by the current archive.
// Russian remains separate because the archive intentionally does not contain it.
const REPLACED_LEGACY_POOLS = ["eng-g1", "eng-g2"];
const REVIEWED_SUBJECT_OVERRIDES = new Map([
  ["GE-G10-SO-S1-113", "მოქალაქეობა"],
  ["GE-G11-SO-S1-110", "მოქალაქეობა"],
  ["GE-G11-SO-S1-120", "მოქალაქეობა"],
  ["GE-G12-SC-S1-056", "ბიოლოგია"],
  ["GE-G12-SC-S1-058", "ქიმია"],
  ["GE-G12-SC-S1-059", "ბიოლოგია"],
  ["GE-G12-SC-S2-179", "ბიოლოგია"],
  ["GE-G12-SO-S2-121", "მოქალაქეობა"],
  ["GE-G12-SO-S2-131", "მოქალაქეობა"],
  ["GE-G12-SO-S2-141", "მოქალაქეობა"],
  ["GE-G12-SO-S2-161", "მოქალაქეობა"],
  ["GE2-G10-SO-S1-003", "მოქალაქეობა"],
  ["GE2-G10-SO-S1-013", "მოქალაქეობა"],
  ["GE2-G11-SO-S1-020", "მოქალაქეობა"],
  ["GE2-G11-SO-S1-030", "მოქალაქეობა"],
]);

const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = value => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ka-GE").replace(/\s+/gu, " ").trim();
const sql = value => value == null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
function parseArgs(argv) {
  const args = { source: "", version: "v23", out: "", report: "", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") args.source = resolve(argv[++i] ?? "");
    else if (argv[i] === "--version") args.version = String(argv[++i] ?? "").trim().toLocaleLowerCase("en-US");
    else if (argv[i] === "--out") args.out = resolve(argv[++i] ?? "");
    else if (argv[i] === "--report") args.report = resolve(argv[++i] ?? "");
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.source) throw new Error("--source <extracted question-bank directory> is required");
  if (!/^v\d+(?:[._-]\d+)*$/u.test(args.version)) throw new Error("--version must look like v23 or v23-1");
  if (!args.out) args.out = resolve(`.openai/d1-${args.version}-import`);
  if (!args.report) args.report = resolve(`reports/${args.version}-platform-import-report.json`);
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

async function flaggedSubjectCandidateIds(source) {
  const text = await readFile(join(source, "QA/subject_tag_candidates.csv"), "utf8");
  return new Set(text.split(/\r?\n/u).slice(1).filter(Boolean).map(line => csvCells(line)[0]).filter(Boolean));
}

function reviewedSubjectOverride(question) {
  const explicit = REVIEWED_SUBJECT_OVERRIDES.get(String(question.question_id));
  if (explicit) return explicit;
  const isReviewedScaleFamily = /^GE2-G(?:07|08|09|10|11|12)-SO-S[12]-\d+$/u.test(String(question.question_id))
    && String(question.stem).includes("მასშტაბი 1:100 000 ნიშნავს, რომ რუკაზე 1 სმ არის:");
  return isReviewedScaleFamily ? "გეოგრაფია" : "";
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

export function answerKeyFor(question, answerRow) {
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
    if (!answer || typeof answer !== "object" || left.length < 2 || left.length !== right.length || new Set(left.map(normalize)).size !== left.length || new Set(right.map(normalize)).size !== right.length) return { error: "invalid_match" };
    const expected = Array.isArray(answer) ? answer.map(String) : left.map(item => String(answer[item] ?? ""));
    if (expected.length !== left.length) return { error: "match_answer_mismatch" };
    if (expected.some(item => !item) || [...expected].map(normalize).sort().join("|") !== [...right].map(normalize).sort().join("|")) return { error: "match_answer_mismatch" };
    return { type: "match", payload: { leftItems: left, rightOptions: right }, key: { correct: expected, pairs: left.map((item, index) => [item, expected[index]]) } };
  }
  if (type === "OPEN") {
    const key = classifyOpenAnswer(answer);
    if (!key) return { error: "invalid_open" };
    if (key.mode === "ai") key.rubric = String(answerRow.rationale || "შეადარე მოსწავლის პასუხი ეტალონს აზრობრივი სისწორის მიხედვით.");
    return { type: "short_answer", payload: {}, key };
  }
  if (type === "FILL") {
    const blanks = Array.isArray(answer) ? answer.map(String) : [String(answer)];
    if (!blanks.length || blanks.some(item => !item.trim()) || blanks.some(item => item.length > 160)) return { error: "invalid_fill" };
    return { type: "fill", payload: {}, key: { blanks }, appendBlank: !String(question.stem).includes("___") };
  }
  return { error: "unsupported_type" };
}

function numericAnswerValue(answer) {
  let raw = null;
  if (answer.type === "multiple_choice" || answer.type === "true_false") raw = answer.payload?.opts?.[answer.key?.correct];
  else if (answer.type === "fill") raw = answer.key?.blanks?.[0];
  else if (answer.type === "short_answer" && answer.key?.mode === "numeric") raw = answer.key.expected;
  const parsed = parseNumericShortAnswer(raw);
  return parsed?.value ?? null;
}

function exactTaskSignature(row) {
  const { id, pts, grade, subject, semester, topic, difficulty, ...task } = row.payload;
  const text = String(task.text ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
  return sha(JSON.stringify({ type: row.type, ...task, text, answer: row.answerKey }));
}

export function curatedCivicsRows(version, now, existingRows = []) {
  if (version !== "v28") return [];
  const counts = {}, ids = new Set(), texts = new Set(existingRows.map(row => `${row.grade}|${row.semester}|${normalize(row.payload?.text)}`));
  const rows = CIVICS_SUPPLEMENT.map(item => {
    const bucket = `${item.grade}|${item.semester}`;
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    const ordinal = counts[bucket], id = `v28-civics-g${item.grade}-s${item.semester}-${String(ordinal).padStart(3, "0")}`;
    if (!CIVICS_SUPPLEMENT_BLUEPRINT[bucket]) throw new Error(`Unsupported civics supplement bucket: ${bucket}`);
    if (ids.has(id)) throw new Error(`Duplicate civics supplement id: ${id}`);
    ids.add(id);
    if (typeof item.text !== "string" || item.text.trim().length < 20 || /<[^>]+>/u.test(item.text)) throw new Error(`Invalid civics prompt: ${id}`);
    if (!Array.isArray(item.options) || item.options.length !== 4 || item.options.some(option => typeof option !== "string" || !option.trim()) || new Set(item.options.map(normalize)).size !== 4) throw new Error(`Invalid civics options: ${id}`);
    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= item.options.length) throw new Error(`Invalid civics answer: ${id}`);
    if (typeof item.explanation !== "string" || item.explanation.trim().length < 30 || /<[^>]+>/u.test(item.explanation)) throw new Error(`Invalid civics explanation: ${id}`);
    const textKey = `${item.grade}|${item.semester}|${normalize(item.text)}`;
    if (texts.has(textKey)) throw new Error(`Duplicate civics prompt in live bucket: ${id}`);
    texts.add(textKey);
    const topic = `მოქალაქეობა · ${item.topic}`, answerKey = { correct: item.correct };
    const payload = { id, text: item.text, type: "multiple_choice", pts: 2, grade: item.grade, subject: "მოქალაქეობა", semester: item.semester, topic, opts: item.options, difficulty: "core" };
    return {
      id, sourceId: `v28-supplement:${id}`, poolKey: `G${String(item.grade).padStart(2, "0")}-CIV-S${item.semester}|${item.semester}|${item.topic}`,
      poolPrefix: "v28", grade: item.grade, subject: "მოქალაქეობა", sourceSubject: "კურირებული მოქალაქეობის დამატება", semester: item.semester,
      topic, strand: item.topic, type: "multiple_choice", payload, points: 2, difficulty: "core", mappingStatus: "v28_curated_supplement",
      semanticGroupId: id, contentHash: sha(JSON.stringify({ payload, answer: answerKey, rationale: item.explanation })),
      answerKey, explanation: item.explanation, mediaTextFallback: false, now,
    };
  });
  for (const [bucket, expected] of Object.entries(CIVICS_SUPPLEMENT_BLUEPRINT)) {
    if ((counts[bucket] ?? 0) !== expected) throw new Error(`Civics supplement coverage mismatch for ${bucket}: ${counts[bucket] ?? 0}/${expected}`);
  }
  return rows;
}

export function curatedWeakBankRows(version, now, existingRows = []) {
  if (version !== "v28") return [];
  const counts = {}, ids = new Set(), texts = new Set(existingRows.map(row => `${row.grade}|${row.subject}|${row.semester}|${normalize(row.payload?.text)}`));
  const rows = WEAK_BANK_SUPPLEMENT.map(item => {
    const bucket = `${item.grade}|${item.subject}|${item.semester}`;
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    const id = String(item.id ?? "").trim();
    if (!WEAK_BANK_SUPPLEMENT_BLUEPRINT[bucket]) throw new Error(`Unsupported weak-bank supplement bucket: ${bucket}`);
    if (!id || ids.has(id)) throw new Error(`Duplicate or empty weak-bank supplement id: ${id}`);
    ids.add(id);
    if (typeof item.text !== "string" || item.text.trim().length < 20 || /<[^>]+>/u.test(item.text)) throw new Error(`Invalid weak-bank prompt: ${id}`);
    if (!Array.isArray(item.options) || item.options.length !== 4 || item.options.some(option => typeof option !== "string" || !option.trim()) || new Set(item.options.map(normalize)).size !== 4) throw new Error(`Invalid weak-bank options: ${id}`);
    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= item.options.length) throw new Error(`Invalid weak-bank answer: ${id}`);
    if (typeof item.explanation !== "string" || item.explanation.trim().length < 30 || /<[^>]+>/u.test(item.explanation)) throw new Error(`Invalid weak-bank explanation: ${id}`);
    const textKey = `${item.grade}|${item.subject}|${item.semester}|${normalize(item.text)}`;
    if (texts.has(textKey)) throw new Error(`Duplicate weak-bank prompt in live bucket: ${id}`);
    texts.add(textKey);
    const topic = `${item.subject} · ${item.topic}`, answerKey = { correct: item.correct };
    const payload = { id, text: item.text, type: "multiple_choice", pts: 2, grade: item.grade, subject: item.subject, semester: item.semester, topic, opts: item.options, difficulty: "core" };
    return {
      id, sourceId: `v28-supplement:${id}`, poolKey: `G${String(item.grade).padStart(2, "0")}-CUR-S${item.semester}|${item.semester}|${item.topic}`,
      poolPrefix: "v28", grade: item.grade, subject: item.subject, sourceSubject: "კურირებული სუსტი ბანკის დამატება", semester: item.semester,
      topic, strand: item.topic, type: "multiple_choice", payload, points: 2, difficulty: "core", mappingStatus: "v28_curated_weak_bank_supplement",
      semanticGroupId: id, contentHash: sha(JSON.stringify({ payload, answer: answerKey, rationale: item.explanation })),
      answerKey, explanation: item.explanation, mediaTextFallback: false, now,
    };
  });
  for (const [bucket, expected] of Object.entries(WEAK_BANK_SUPPLEMENT_BLUEPRINT)) {
    if ((counts[bucket] ?? 0) !== expected) throw new Error(`Weak-bank supplement coverage mismatch for ${bucket}: ${counts[bucket] ?? 0}/${expected}`);
  }
  return rows;
}

export function curatedQualityExpansionRows(version, now, existingRows = []) {
  if (version !== "v28") return [];
  const counts = {}, ids = new Set(), texts = new Set(existingRows.map(row => `${row.grade}|${row.subject}|${row.semester}|${normalize(row.payload?.text)}`));
  const rows = QUALITY_EXPANSION_V2.map(item => {
    const bucket = `${item.grade}|${item.subject}|${item.semester}`;
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    const id = String(item.id ?? "").trim();
    if (!QUALITY_EXPANSION_V2_BLUEPRINT[bucket]) throw new Error(`Unsupported quality-expansion bucket: ${bucket}`);
    if (!id || ids.has(id)) throw new Error(`Duplicate or empty quality-expansion id: ${id}`);
    ids.add(id);
    if (typeof item.text !== "string" || item.text.trim().length < 20 || /<[^>]+>/u.test(item.text)) throw new Error(`Invalid quality-expansion prompt: ${id}`);
    if (!Array.isArray(item.options) || item.options.length !== 4 || item.options.some(option => typeof option !== "string" || !option.trim()) || new Set(item.options.map(normalize)).size !== 4) throw new Error(`Invalid quality-expansion options: ${id}`);
    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= item.options.length) throw new Error(`Invalid quality-expansion answer: ${id}`);
    if (typeof item.explanation !== "string" || item.explanation.trim().length < 30 || /<[^>]+>/u.test(item.explanation)) throw new Error(`Invalid quality-expansion explanation: ${id}`);
    const textKey = `${item.grade}|${item.subject}|${item.semester}|${normalize(item.text)}`;
    if (texts.has(textKey)) throw new Error(`Duplicate quality-expansion prompt in live bucket: ${id}`);
    texts.add(textKey);
    const topic = `${item.subject} · ${item.topic}`, answerKey = { correct: item.correct };
    const payload = { id, text: item.text, type: "multiple_choice", pts: 2, grade: item.grade, subject: item.subject, semester: item.semester, topic, opts: item.options, difficulty: "core" };
    return {
      id, sourceId: `v28-supplement:${id}`, poolKey: `G${String(item.grade).padStart(2, "0")}-Q2-S${item.semester}|${item.semester}|${item.topic}`,
      poolPrefix: "v28", grade: item.grade, subject: item.subject, sourceSubject: "კურირებული ხარისხობრივი გაფართოება", semester: item.semester,
      topic, strand: item.topic, type: "multiple_choice", payload, points: 2, difficulty: "core", mappingStatus: "v28_curated_quality_expansion_v2",
      semanticGroupId: id, contentHash: sha(JSON.stringify({ payload, answer: answerKey, rationale: item.explanation })),
      answerKey, explanation: item.explanation, mediaTextFallback: false, now,
    };
  });
  for (const [bucket, expected] of Object.entries(QUALITY_EXPANSION_V2_BLUEPRINT)) {
    if ((counts[bucket] ?? 0) !== expected) throw new Error(`Quality-expansion coverage mismatch for ${bucket}: ${counts[bucket] ?? 0}/${expected}`);
  }
  return rows;
}

function questionInsert(row) {
  const columns = ["id","source_id","pool_key","pool_prefix","grade","subject","source_subject","semester","topic","strand","question_type","public_payload_json","points","difficulty","review_status","mapping_status","semantic_group_id","content_hash","active","imported_at","updated_at"];
  const values = [row.id,row.sourceId,row.poolKey,row.poolPrefix,row.grade,row.subject,row.sourceSubject,row.semester,row.topic,row.strand,row.type,JSON.stringify(row.payload),row.points,row.difficulty,"algorithmically_validated",row.mappingStatus,row.semanticGroupId,row.contentHash,1,row.now,row.now];
  return `INSERT INTO assessment_questions (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET pool_key=excluded.pool_key,pool_prefix=excluded.pool_prefix,grade=excluded.grade,subject=excluded.subject,source_subject=excluded.source_subject,semester=excluded.semester,topic=excluded.topic,strand=excluded.strand,question_type=excluded.question_type,public_payload_json=excluded.public_payload_json,points=excluded.points,difficulty=excluded.difficulty,review_status=excluded.review_status,mapping_status=excluded.mapping_status,semantic_group_id=excluded.semantic_group_id,content_hash=excluded.content_hash,active=1,updated_at=excluded.updated_at;`;
}

function answerInsert(row) {
  return `INSERT INTO assessment_answer_keys (question_id,answer_key_json,explanation,updated_at) VALUES (${sql(row.id)},${sql(JSON.stringify(row.answerKey))},${sql(row.explanation)},${row.now}) ON CONFLICT(question_id) DO UPDATE SET answer_key_json=excluded.answer_key_json,explanation=excluded.explanation,updated_at=excluded.updated_at;`;
}

function testInsert(row) {
  const columns = ["id","source_test_id","title","subject","grade","semester","source_pool","question_count","time_minutes","attempts_allowed","test_type","published","is_custom","created_by","created_at","updated_at"];
  const values = [row.id,row.id,row.title,row.subject,row.grade,row.semester,row.sourcePool,row.count,row.count * 2,999,"practice",1,0,null,row.now,row.now];
  return `INSERT INTO assessment_tests (${columns.join(",")}) VALUES (${values.map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subject=excluded.subject,grade=excluded.grade,semester=excluded.semester,source_pool=excluded.source_pool,question_count=excluded.question_count,time_minutes=excluded.time_minutes,attempts_allowed=excluded.attempts_allowed,test_type=excluded.test_type,published=1,updated_at=excluded.updated_at;`;
}

function testId(version, grade, subject, semester) {
  return `${version}-g${grade}-s${semester}-${sha(subject).slice(0, 10)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2)), now = Date.now();
  const sourcePrefix = `${args.version}:`;
  const questions = (await Promise.all(QUESTION_FILES.map(file => readJsonLines(join(args.source, file))))).flat();
  const answers = new Map((await Promise.all(ANSWER_FILES.map(file => readJsonLines(join(args.source, file))))).flat().map(row => [row.question_id, row]));
  const subjectFixes = await approvedSubjectFixes(args.source), flaggedSubjectIds = await flaggedSubjectCandidateIds(args.source);
  const rows = [], excluded = {}, remapped = [], directMathBlocked = [];
  const exclude = reason => { excluded[reason] = (excluded[reason] ?? 0) + 1; };
  for (const question of questions) {
    if (question.status !== "active" || String(question.deliverable) !== "1") { exclude(`source_${question.status}`); continue; }
    if (BROKEN_CONTEXT_IDS.has(question.question_id)) { exclude("confirmed_missing_context"); continue; }
    if (String(question.media_required) === "1" && !String(question.stimulus || "").trim()) { exclude("media_without_text_equivalent"); continue; }
    const sourceApproved = subjectFixes.get(question.question_id), codexReviewed = reviewedSubjectOverride(question);
    const fixedSubsubject = sourceApproved || codexReviewed || String(question.subsubject);
    if (fixedSubsubject !== question.subsubject) remapped.push({ id: question.question_id, from: question.subsubject, to: fixedSubsubject, review: sourceApproved ? "source_approved" : "codex_reviewed" });
    const subject = mappedSubject(question, fixedSubsubject), grade = Number(question.grade), semester = Number(question.semester);
    if (!subject || !SUBJECTS_BY_GRADE[grade]?.includes(subject)) { exclude("outside_live_catalog"); continue; }
    const answer = answerKeyFor(question, answers.get(question.question_id));
    if (answer.error) { exclude(answer.error); continue; }
    let text = [String(question.stimulus || "").trim(), String(question.stem || "").trim()].filter(Boolean).join("\n\n");
    if (answer.appendBlank) text += "\n\nპასუხი: ___";
    if (text.length < 3) { exclude("empty_prompt"); continue; }
    const computed = directMathResult(text), supplied = numericAnswerValue(answer);
    if (computed !== null && (supplied === null || Math.abs(computed - supplied) > 1e-9)) {
      directMathBlocked.push({ id: question.question_id, computed, supplied, text: text.slice(0, 300) });
      exclude("direct_math_answer_mismatch"); continue;
    }
    const id = `${args.version}-${question.question_id}`, topic = topicFor(question, fixedSubsubject), payload = { id, text, type: answer.type, pts: pointsFor(question), grade, subject, semester, topic, ...answer.payload, difficulty: question.difficulty };
    const row = {
      id, sourceId: `${sourcePrefix}${question.question_id}`, poolKey: `${question.bank_id}|${semester}|${fixedSubsubject}`, poolPrefix: args.version, grade, subject,
      sourceSubject: `${question.subject_family} / ${question.subsubject}`, semester, topic, strand: fixedSubsubject,
      type: answer.type, payload, points: pointsFor(question), difficulty: question.difficulty, mappingStatus: `${args.version}_platform_rule`,
      semanticGroupId: String(question.concept_group || `${args.version}_${question.semantic_signature}`),
      contentHash: sha(JSON.stringify({ payload, answer: answer.key, rationale: answers.get(question.question_id)?.rationale })),
      answerKey: answer.key, explanation: String(answers.get(question.question_id)?.rationale || "პასუხი შემოწმებულია სერვერზე."), mediaTextFallback: String(question.media_required) === "1", now,
    };
    rows.push(row);
  }
  const civicsSupplementalRows = curatedCivicsRows(args.version, now, rows);
  rows.push(...civicsSupplementalRows);
  const weakBankSupplementalRows = curatedWeakBankRows(args.version, now, rows);
  rows.push(...weakBankSupplementalRows);
  const qualityExpansionRows = curatedQualityExpansionRows(args.version, now, rows);
  rows.push(...qualityExpansionRows);
  const supplementalRows = [...civicsSupplementalRows, ...weakBankSupplementalRows, ...qualityExpansionRows];
  const exactGroups = new Map();
  for (const row of rows) {
    const signature = exactTaskSignature(row);
    if (!exactGroups.has(signature)) exactGroups.set(signature, []);
    exactGroups.get(signature).push(row);
  }
  const crossGradeBlocked = [];
  for (const group of exactGroups.values()) {
    const minGrade = Math.min(...group.map(row => row.grade)), maxGrade = Math.max(...group.map(row => row.grade));
    if (maxGrade - minGrade < 3) continue;
    crossGradeBlocked.push(...group.filter(row => row.grade - minGrade >= 3));
  }
  const blockedIds = new Set(crossGradeBlocked.map(row => row.id));
  const liveRows = rows.filter(row => !blockedIds.has(row.id));
  if (crossGradeBlocked.length) excluded.cross_grade_exact_repeat = crossGradeBlocked.length;
  const remappedIds = new Set(remapped.map(row => row.id));
  const reviewedFlaggedSubjectIds = [...flaggedSubjectIds].filter(id => remappedIds.has(id));
  if (reviewedFlaggedSubjectIds.length !== flaggedSubjectIds.size) {
    throw new Error(`Subject-tag review is incomplete: ${reviewedFlaggedSubjectIds.length}/${flaggedSubjectIds.size}`);
  }
  const byBucket = new Map(), byType = {}, openGradingModes = {};
  let importedMediaTextFallback = 0;
  for (const row of liveRows) {
    byType[row.type] = (byType[row.type] ?? 0) + 1;
    if (row.mediaTextFallback) importedMediaTextFallback++;
    if (row.type === "short_answer") openGradingModes[row.answerKey.mode] = (openGradingModes[row.answerKey.mode] ?? 0) + 1;
    const { grade, subject, semester } = row;
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
    tests.push({ id: testId(args.version, grade, subject, semester), title: `${subject} — ${grade} კლასი — ${semester} სემ.`, subject, grade, semester, count, now, sourcePool: args.version });
  }
  const report = {
    generatedAt: new Date(now).toISOString(), sourceVersion: args.version, sourceQuestions: questions.length,
    sourceActiveDeliverable: questions.filter(row => row.status === "active" && String(row.deliverable) === "1").length,
    importedQuestions: liveRows.length, importedTests: tests.length, answerKeysServerOnly: liveRows.length,
    supplementalQuestionsAdded: supplementalRows.length,
    civicsSupplementalQuestionsAdded: civicsSupplementalRows.length,
    weakBankSupplementalQuestionsAdded: weakBankSupplementalRows.length,
    qualityExpansionV2QuestionsAdded: qualityExpansionRows.length,
    excluded, questionTypes: byType, openGradingModes, importedMediaTextFallback, directMathBlocked,
    crossGradeExactRepeatsBlocked: crossGradeBlocked.length,
    confirmedFixes: {
      biologyRetags: remapped.filter(row => row.review === "source_approved").length,
      curatedSubjectRetags: remapped.filter(row => row.review === "codex_reviewed").length,
      flaggedSubjectCandidatesReviewed: flaggedSubjectIds.size,
      flaggedSubjectCandidatesRetagged: reviewedFlaggedSubjectIds.length,
      missingContextBlocked: excluded.confirmed_missing_context ?? 0,
      missingAnswerBlocked: excluded.missing_answer ?? 0,
    },
    capacity, validations: { activeOnly: "pass", answerPresence: "pass", uniqueOptions: "pass", exactlyOneMcqAnswer: "pass", directMathRecomputation: "pass", contextBlocklist: "pass", catalogRules: "pass", semanticRotationCapacity: "pass", mediaTextFallback: "pass", flaggedSubjectReview: "pass", wideExactRepeatBlock: "pass" },
    retainedLegacySubjects: ["რუსული"],
    compatibility: { matchDictionaryAndListAnswers: "pass", openResponses: "deterministic_or_structured_ai_grading", versionedIdsAndPools: "pass", legacyProgressMigration: "included" },
    humanReview: "flagged subject families and exact cross-grade repeats were curated; the remaining full bank is algorithmically validated, not independently SME-approved",
  };
  await mkdir(dirname(args.report), { recursive: true }); await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!args.dryRun) {
    await rm(args.out, { recursive: true, force: true }); await mkdir(args.out, { recursive: true });
    const chunkSize = 500;
    for (let offset = 0; offset < liveRows.length; offset += chunkSize) {
      const chunk = liveRows.slice(offset, offset + chunkSize), statements = ["PRAGMA foreign_keys=ON;", ...chunk.flatMap(row => [questionInsert(row), answerInsert(row)])];
      await writeFile(join(args.out, `questions-${String(offset / chunkSize + 1).padStart(3, "0")}.sql`), `${statements.join("\n")}\n`, "utf8");
    }
    if (civicsSupplementalRows.length) {
      const supplementStatements = ["PRAGMA foreign_keys=ON;", ...civicsSupplementalRows.flatMap(row => [questionInsert(row), answerInsert(row)])];
      await writeFile(join(args.out, "997-civics-supplement.sql"), `${supplementStatements.join("\n")}\n`, "utf8");
    }
    if (weakBankSupplementalRows.length) {
      const supplementStatements = ["PRAGMA foreign_keys=ON;", ...weakBankSupplementalRows.flatMap(row => [questionInsert(row), answerInsert(row)])];
      await writeFile(join(args.out, "996-weak-bank-supplement.sql"), `${supplementStatements.join("\n")}\n`, "utf8");
    }
    if (qualityExpansionRows.length) {
      const supplementStatements = ["PRAGMA foreign_keys=ON;", ...qualityExpansionRows.flatMap(row => [questionInsert(row), answerInsert(row)])];
      await writeFile(join(args.out, "995-quality-expansion-v2.sql"), `${supplementStatements.join("\n")}\n`, "utf8");
    }
    // Run after every questions-*.sql file. Those upserts stamp the complete desired
    // membership with `now`, so only genuinely stale active rows need a write.
    const membership = ["PRAGMA foreign_keys=ON;", `UPDATE assessment_questions SET active=0,updated_at=${now} WHERE pool_prefix=${sql(args.version)} AND active<>0 AND updated_at<>${now};`];
    await writeFile(join(args.out, "998-active-membership.sql"), `${membership.join("\n")}\n`, "utf8");
    const manifest = ["PRAGMA foreign_keys=ON;",
      `INSERT INTO assessment_question_history (user_id,question_id,semantic_group_id,answered_count,correct_count,last_correct,last_answered_at,next_review_at) SELECT h.user_id,n.id,n.semantic_group_id,h.answered_count,h.correct_count,h.last_correct,h.last_answered_at,h.next_review_at FROM assessment_question_history h JOIN assessment_questions o ON o.id=h.question_id JOIN assessment_questions n ON n.source_id=(${sql(sourcePrefix)} || substr(o.source_id,instr(o.source_id,':')+1)) WHERE n.pool_prefix=${sql(args.version)} AND o.pool_prefix GLOB 'v[0-9]*' AND o.pool_prefix<>${sql(args.version)} ON CONFLICT(user_id,question_id) DO UPDATE SET answered_count=MAX(assessment_question_history.answered_count,excluded.answered_count),correct_count=MAX(assessment_question_history.correct_count,excluded.correct_count),last_correct=excluded.last_correct,last_answered_at=MAX(assessment_question_history.last_answered_at,excluded.last_answered_at),next_review_at=MAX(assessment_question_history.next_review_at,excluded.next_review_at);`,
      `UPDATE assessment_questions SET active=0,updated_at=${now} WHERE active<>0 AND pool_prefix GLOB 'v[0-9]*' AND pool_prefix<>${sql(args.version)};`,
      `UPDATE assessment_questions SET active=0,updated_at=${now} WHERE active<>0 AND pool_prefix IN (${REPLACED_LEGACY_POOLS.map(sql).join(",")});`,
      `UPDATE assessment_tests SET published=0,updated_at=${now} WHERE published<>0 AND is_custom=0 AND source_pool GLOB 'v[0-9]*' AND source_pool<>${sql(args.version)};`, ...tests.map(testInsert),
      `INSERT INTO assessment_import_runs (id,source_hash,source_questions,imported_questions,imported_tests,report_json,imported_at) VALUES (${sql(`${args.version}-${sha(JSON.stringify(report)).slice(0, 16)}`)},${sql(sha(JSON.stringify(report)))},${questions.length},${liveRows.length},${tests.length},${sql(JSON.stringify(report))},${now}) ON CONFLICT(source_hash) DO UPDATE SET imported_questions=excluded.imported_questions,imported_tests=excluded.imported_tests,report_json=excluded.report_json,imported_at=excluded.imported_at;`];
    await writeFile(join(args.out, "999-tests-and-manifest.sql"), `${manifest.join("\n")}\n`, "utf8");
  }
  console.log(JSON.stringify({ ok: true, questions: liveRows.length, tests: tests.length, fixes: report.confirmedFixes, excluded: report.excluded, out: args.dryRun ? null : args.out, report: args.report }));
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });
}
