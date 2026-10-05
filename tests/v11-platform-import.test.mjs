import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { answerKeyFor, curatedCivicsRows, curatedFifthPaperRows, curatedQualityExpansionRows, curatedWeakBankRows, CURATED_PROMPT_CORRECTIONS } from "../scripts/import-v11-question-bank.mjs";

test("v11 platform importer blocks the three confirmed defect classes", async () => {
  const source = await readFile(new URL("../scripts/import-v11-question-bank.mjs", import.meta.url), "utf8");
  assert.match(source, /BROKEN_CONTEXT_IDS/);
  assert.match(source, /sme_prefilled_physics_biology\.csv/);
  assert.match(source, /answerRow\.answer_json === "null"/);
  assert.match(source, /review_status.*algorithmically_validated/s);
  assert.match(source, /media_without_text_equivalent/);
  assert.match(source, /direct_math_answer_mismatch/);
  assert.match(source, /pool_prefix GLOB 'v\[0-9\]\*'/);
  assert.match(source, /source_pool GLOB 'v\[0-9\]\*'/);
  assert.match(source, /REPLACED_LEGACY_POOLS = \["eng-g1", "eng-g2"\]/);
  assert.match(source, /dailyFullFreshTests/);
  assert.match(source, /cross_grade_exact_repeat/);
  assert.match(source, /998-active-membership\.sql/);
  assert.match(source, /active<>0 AND updated_at<>/);
  assert.doesNotMatch(source, /SET active=0,updated_at=\$\{now\} WHERE pool_prefix=\$\{sql\(args\.version\)\};/);
  assert.match(source, /WHERE active<>0 AND pool_prefix GLOB/);
  assert.match(source, /997-civics-supplement\.sql/);
  assert.match(source, /996-weak-bank-supplement\.sql/);
  assert.match(source, /995-quality-expansion-v2\.sql/);
  assert.match(source, /994-fifth-paper-expansion-v3\.sql/);
  assert.match(source, /993-curated-prompt-corrections\.sql/);
  assert.match(source, /Subject-tag review is incomplete/);
  assert.doesNotMatch(source, /curriculum_reviewed/);
});

test("generated v23 report passes server-only answer and semantic capacity gates", async () => {
  const report = JSON.parse(await readFile(new URL("../reports/v23-platform-import-report.json", import.meta.url), "utf8"));
  assert.equal(report.sourceVersion, "v23");
  assert.equal(report.confirmedFixes.biologyRetags, 42);
  assert.equal(report.confirmedFixes.missingContextBlocked, 18);
  assert.equal(report.confirmedFixes.missingAnswerBlocked, 0);
  assert.equal(report.importedQuestions, 23455);
  assert.equal(report.questionTypes.short_answer, 3138);
  assert.deepEqual(report.openGradingModes, { numeric: 2592, text: 388, ai: 158 });
  assert.equal(report.excluded.open_response_requires_grading, undefined);
  assert.equal(report.answerKeysServerOnly, report.importedQuestions);
  assert.equal(report.capacity.every(row => row.semanticGroups >= row.testQuestions), true);
  assert.equal(Object.values(report.validations).every(value => value === "pass"), true);
  assert.equal(report.compatibility.matchDictionaryAndListAnswers, "pass");
  assert.equal(report.compatibility.openResponses, "deterministic_or_structured_ai_grading");
  assert.match(report.humanReview, /not_performed/);
});

test("generated v28 report adds validated concepts without exposing answers", async () => {
  const report = JSON.parse(await readFile(new URL("../reports/v28-platform-import-report.json", import.meta.url), "utf8"));
  assert.equal(report.sourceVersion, "v28");
  assert.equal(report.sourceQuestions, 46756);
  assert.equal(report.sourceActiveDeliverable, 34241);
  assert.equal(report.importedQuestions, 21303);
  assert.equal(report.importedTests, 154);
  assert.equal(report.answerKeysServerOnly, report.importedQuestions);
  assert.equal(report.importedMediaTextFallback, 195);
  assert.deepEqual(report.directMathBlocked, []);
  assert.equal(report.excluded.media_without_text_equivalent, undefined);
  assert.equal(report.crossGradeExactRepeatsBlocked, 3815);
  assert.equal(report.supplementalQuestionsAdded, 983);
  assert.equal(report.civicsSupplementalQuestionsAdded, 97);
  assert.equal(report.weakBankSupplementalQuestionsAdded, 162);
  assert.equal(report.qualityExpansionV2QuestionsAdded, 109);
  assert.equal(report.fifthPaperExpansionV3QuestionsAdded, 615);
  assert.equal(report.confirmedFixes.flaggedSubjectCandidatesReviewed, 79);
  assert.equal(report.confirmedFixes.flaggedSubjectCandidatesRetagged, 79);
  assert.equal(report.confirmedFixes.curatedSubjectRetags, 76);
  assert.equal(report.confirmedFixes.promptCorrections, 1);
  assert.deepEqual(report.confirmedFixes.promptCorrectionIds, ["GE3-E64442E0431E"]);
  assert.equal(report.capacity.reduce((sum, row) => sum + row.semanticGroups, 0), 10562);
  assert.equal(report.capacity.every(row => row.semanticGroups >= row.testQuestions), true);
  assert.equal(report.capacity.every(row => row.testQuestions === 10), true);
  const strengthened = new Set([
    "9|ბიოლოგია|1", "9|ბიოლოგია|2", "10|ბიოლოგია|1", "10|ბიოლოგია|2",
    "5|ჩვენი საქართველო|2", "6|ჩვენი საქართველო|2", "9|მოქალაქეობა|1", "9|მოქალაქეობა|2",
    "9|ქიმია|2", "7|ინგლისური|1", "7|ინგლისური|2", "8|ინგლისური|2",
  ]);
  const strengthenedCapacity = report.capacity.filter(row => strengthened.has(`${row.grade}|${row.subject}|${row.semester}`));
  assert.equal(strengthenedCapacity.length, strengthened.size);
  assert.equal(strengthenedCapacity.every(row => row.semanticGroups >= 40 && row.dailyFullFreshTests >= 4), true);
  assert.equal(report.capacity.every(row => row.semanticGroups >= 50 && row.dailyFullFreshTests >= 5), true);
  assert.equal(Object.values(report.validations).every(value => value === "pass"), true);
});

test("fifth-paper expansion closes every measured v28 capacity gap with distinct validated tasks", () => {
  const rows = curatedFifthPaperRows("v28", 1, []);
  assert.equal(rows.length, 615);
  assert.equal(new Set(rows.map(row => row.id)).size, 615);
  assert.equal(new Set(rows.map(row => `${row.grade}|${row.subject}|${row.semester}|${row.payload.text}`)).size, 615);
  assert.equal(rows.every(row => row.type === "multiple_choice" && row.payload.opts.length === 4 && new Set(row.payload.opts).size === 4), true);
  assert.equal(rows.every(row => Number.isInteger(row.answerKey.correct) && row.answerKey.correct >= 0 && row.answerKey.correct < 4), true);
  assert.equal(rows.every(row => row.payload.opts[row.answerKey.correct] && row.explanation.length >= 30), true);
  assert.equal(new Set(rows.map(row => `${row.grade}|${row.subject}|${row.semester}`)).size, 73);
});

test("grade 1 car-order prompt states every count unambiguously and keeps the verified order", () => {
  const text = CURATED_PROMPT_CORRECTIONS.get("GE3-E64442E0431E");
  assert.match(text, /თეთრი — 7 მანქანა/);
  assert.match(text, /შავი — 10 მანქანა/);
  assert.match(text, /ლურჯი — 1 მანქანა/);
  assert.match(text, /ყველაზე ცოტადან ყველაზე მეტისკენ/);
});

test("curated civics supplement raises every weak grade 7-8 semester to four fresh papers", () => {
  const rows = curatedCivicsRows("v28", 1, []);
  assert.equal(rows.length, 97);
  assert.equal(new Set(rows.map(row => row.id)).size, 97);
  assert.equal(new Set(rows.map(row => `${row.grade}|${row.semester}|${row.payload.text}`)).size, 97);
  for (const bucket of ["7|1", "7|2", "8|1"]) assert.equal(rows.filter(row => `${row.grade}|${row.semester}` === bucket).length, 24);
  assert.equal(rows.filter(row => `${row.grade}|${row.semester}` === "8|2").length, 25);
  assert.equal(rows.every(row => row.type === "multiple_choice" && row.payload.opts.length === 4), true);
  assert.equal(rows.every(row => Number.isInteger(row.answerKey.correct) && row.explanation.length >= 30), true);
});

test("curated weak-bank supplement raises all twelve target buckets to four fresh papers", () => {
  const rows = curatedWeakBankRows("v28", 1, []);
  assert.equal(rows.length, 162);
  assert.equal(new Set(rows.map(row => row.id)).size, 162);
  assert.equal(new Set(rows.map(row => `${row.grade}|${row.subject}|${row.semester}|${row.payload.text}`)).size, 162);
  assert.equal(rows.every(row => row.type === "multiple_choice" && row.payload.opts.length === 4 && new Set(row.payload.opts).size === 4), true);
  assert.equal(rows.every(row => Number.isInteger(row.answerKey.correct) && row.answerKey.correct >= 0 && row.answerKey.correct < 4 && row.explanation.length >= 30), true);
  const expected = {
    "9|ბიოლოგია|1": 14, "9|ბიოლოგია|2": 11, "10|ბიოლოგია|1": 14, "10|ბიოლოგია|2": 16,
    "5|ჩვენი საქართველო|2": 13, "6|ჩვენი საქართველო|2": 15, "9|მოქალაქეობა|1": 11, "9|მოქალაქეობა|2": 19,
    "9|ქიმია|2": 11, "7|ინგლისური|1": 11, "7|ინგლისური|2": 15, "8|ინგლისური|2": 12,
  };
  for (const [bucket, count] of Object.entries(expected)) {
    assert.equal(rows.filter(row => `${row.grade}|${row.subject}|${row.semester}` === bucket).length, count, bucket);
  }
});

test("quality expansion supplies distinct validated tasks for every remaining sub-four-paper bucket", () => {
  const rows = curatedQualityExpansionRows("v28", 1, []);
  assert.equal(rows.length, 109);
  assert.equal(new Set(rows.map(row => row.id)).size, 109);
  assert.equal(new Set(rows.map(row => `${row.grade}|${row.subject}|${row.semester}|${row.payload.text}`)).size, 109);
  assert.equal(rows.every(row => row.type === "multiple_choice" && row.payload.opts.length === 4 && new Set(row.payload.opts).size === 4), true);
  assert.equal(rows.every(row => Number.isInteger(row.answerKey.correct) && row.answerKey.correct >= 0 && row.answerKey.correct < 4 && row.explanation.length >= 30), true);
  const counts = new Map();
  for (const row of rows) {
    const bucket = `${row.grade}|${row.subject}|${row.semester}`;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  assert.equal(counts.size, 25);
  assert.equal([...counts.values()].reduce((sum, count) => sum + count, 0), 109);
});

test("v23 importer supports both match encodings and routes open responses to the right grader", () => {
  const question = {
    question_type: "MATCH",
    options_json: JSON.stringify({ left: ["ა", "ბ"], right: ["1", "2"] }),
  };
  assert.deepEqual(answerKeyFor(question, { answer_json: JSON.stringify({ ა: "1", ბ: "2" }) }), {
    type: "match",
    payload: { leftItems: ["ა", "ბ"], rightOptions: ["1", "2"] },
    key: { correct: ["1", "2"], pairs: [["ა", "1"], ["ბ", "2"]] },
  });
  assert.deepEqual(answerKeyFor(question, { answer_json: JSON.stringify(["2", "1"]) }), {
    type: "match",
    payload: { leftItems: ["ა", "ბ"], rightOptions: ["1", "2"] },
    key: { correct: ["2", "1"], pairs: [["ა", "2"], ["ბ", "1"]] },
  });
  assert.equal(answerKeyFor({ question_type: "OPEN", options_json: "{}" }, { answer_json: JSON.stringify("3/2") }).key.mode, "numeric");
  assert.deepEqual(answerKeyFor({ question_type: "OPEN", options_json: "{}" }, { answer_json: JSON.stringify("თბილისი") }).key, { mode: "text", accepted: ["თბილისი"] });
  const ai = answerKeyFor({ question_type: "OPEN", options_json: "{}" }, { answer_json: JSON.stringify("ეს არის ორმოცზე მეტი სიმბოლოს მქონე აზრობრივი პასუხი, რომელიც რუბრიკით უნდა შეფასდეს."), rationale: "შეაფასე მიზეზი." });
  assert.equal(ai.type, "short_answer");
  assert.equal(ai.key.mode, "ai");
  assert.equal(ai.key.rubric, "შეაფასე მიზეზი.");
});
