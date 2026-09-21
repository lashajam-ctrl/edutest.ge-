import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { answerKeyFor } from "../scripts/import-v11-question-bank.mjs";

test("v11 platform importer blocks the three confirmed defect classes", async () => {
  const source = await readFile(new URL("../scripts/import-v11-question-bank.mjs", import.meta.url), "utf8");
  assert.match(source, /BROKEN_CONTEXT_IDS/);
  assert.match(source, /sme_prefilled_physics_biology\.csv/);
  assert.match(source, /answerRow\.answer_json === "null"/);
  assert.match(source, /review_status.*algorithmically_validated/s);
  assert.match(source, /media_asset_not_in_archive/);
  assert.match(source, /dailyFullFreshTests/);
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
