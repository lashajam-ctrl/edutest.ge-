import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  allocateByWeight,
  assessmentSelectionKey,
  componentCountsForTest,
  correctKnownExplanation,
  correctKnownQuestionPayload,
  distinctSelectionGroupCount,
  eligibleCandidatesBySelectionHistory,
  languageBlueprintFor,
  languageBucketFor,
} from "../lib/assessment-selection.ts";

const makeCandidate = (id, text, history = {}) => ({
  id, grade: 12, subject: "სამოქალაქო თავდაცვა და უსაფრთხოება", semester: 1,
  topic: "პირველი დახმარება", public_payload_json: JSON.stringify({ text }),
  semantic_group_id: `legacy-${id}`, history_id: null, last_correct: null,
  next_review_at: null, last_answered_at: null, ...history,
});

test("collapses decorative generator variants into one selection group", () => {
  const core = "ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია:";
  const candidates = [
    makeCandidate("g12safe1_07_x15", `თემის სხვა კონტექსტში განხილვისას: სკოლის უსაფრთხოების გეგმაში: ${core}`),
    makeCandidate("g12safe5_07", `საგამოცდო პრაქტიკისას: ${core}`),
    makeCandidate("g12safe2_07_x15", `საგანგებო სიტუაციის სიმულაციაში: ${core}`),
    makeCandidate("g12safe4_07", `პირველი დახმარების ტრენინგში: ${core}`),
  ];
  assert.equal(new Set(candidates.map(assessmentSelectionKey)).size, 1);
  assert.equal(distinctSelectionGroupCount(candidates), 1);
});

test("a previously answered variant blocks its whole semantic family until review is due", () => {
  const now = Date.now(), text = "ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია:";
  const candidates = [
    makeCandidate("g12safe1_07", text, { history_id: "history-1", last_correct: 0, next_review_at: now + 86_400_000, last_answered_at: now }),
    makeCandidate("g12safe2_07_x15", text),
    makeCandidate("g12safe1_08", "დამწვრობის დროს უსაფრთხო პირველადი მოქმედებაა:"),
  ];
  const eligible = eligibleCandidatesBySelectionHistory(candidates, now);
  assert.deepEqual(eligible.map(row => row.id), ["g12safe1_08"]);
});

test("language blueprints allocate deterministic complete papers", () => {
  assert.deepEqual(componentCountsForTest("ქართული ენა და ლიტერატურა", 11, 20), { language: 8, literature: 12 });
  assert.deepEqual(componentCountsForTest("ინგლისური", 11, 20), { grammar: 6, vocabulary: 3, reading: 5, use_of_language: 6 });
  assert.deepEqual(componentCountsForTest("რუსული", 6, 10), { grammar: 3, vocabulary: 3, reading: 2, use_of_language: 2 });
  for (const [subject, grade] of [["ინგლისური", 1], ["ინგლისური", 12], ["რუსული", 5], ["ქართული", 3]]) {
    const allocation = allocateByWeight(20, languageBlueprintFor(subject, grade));
    assert.equal(Object.values(allocation).reduce((sum, count) => sum + count, 0), 20);
  }
});

test("language topics map to grammar, vocabulary, reading and language use", () => {
  assert.equal(languageBucketFor("ინგლისური", "Grammar — passive voice", "Which sentence is correct?"), "grammar");
  assert.equal(languageBucketFor("ინგლისური", "Reading comprehension", "Read the report."), "reading");
  assert.equal(languageBucketFor("ინგლისური", "Collocation", "Choose the natural collocation."), "vocabulary");
  assert.equal(languageBucketFor("რუსული", "Косвенная речь", "Выберите ответ."), "grammar");
  assert.equal(languageBucketFor("რუსული", "Источники", "Сравните данные."), "reading");
  assert.equal(languageBucketFor("ქართული ენა და ლიტერატურა", "პუნქტუაცია", "დასვი სასვენი ნიშანი"), "language");
  assert.equal(languageBucketFor("ქართული ენა და ლიტერატურა", "პერსონაჟი", "რა იდეას გამოხატავს ტექსტი?"), "literature");
});

test("corrects the severe-bleeding question wording without exposing answer data", () => {
  const payload = correctKnownQuestionPayload({
    text: "საგამოცდო პრაქტიკისას: ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია:",
    opts: ["დაჭერილი პირდაპირი წნევა სუფთა მასალით და სასწრაფო დახმარების გამოძახება", "დახმარების დაგვიანება"],
  });
  assert.equal(payload.text, "ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია:");
  assert.equal(payload.opts[0], "ჭრილობაზე უწყვეტი პირდაპირი დაწოლა სტერილური საფენით ან სუფთა ქსოვილით და სასწრაფო დახმარების გამოძახება");
  assert.equal(correctKnownExplanation("სწორია პირდაპირი წნევა."), "სწორია პირდაპირი დაწოლა.");
});

test("server start route enforces semantic selection and language blueprints", async () => {
  const source = await readFile(new URL("../app/api/assessments/start/route.ts", import.meta.url), "utf8");
  assert.match(source, /assessmentSelectionKey/);
  assert.match(source, /eligibleCandidatesBySelectionHistory/);
  assert.match(source, /recentlyPresented/);
  assert.match(source, /assessment_sessions/);
  assert.match(source, /languageBlueprintFor/);
  assert.match(source, /languageBucketFor/);
  assert.doesNotMatch(source, /semanticGroups\.has\(question\.semantic_group_id\)/);
});
