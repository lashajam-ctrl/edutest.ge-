import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  allocateByWeight,
  assessmentSelectionKey,
  componentCountsForTest,
  correctKnownAnswerKey,
  correctKnownExplanation,
  correctKnownQuestionPayload,
  correctKnownQuestionExplanation,
  distinctSelectionGroupCount,
  eligibleCandidatesBySelectionHistory,
  languageBlueprintFor,
  languageBucketFor,
} from "../lib/assessment-selection.ts";
import { cleanDecorativePrompt } from "../lib/assessment-selection-core.mjs";

const makeCandidate = (id, text, history = {}) => ({
  id, grade: 12, subject: "სამოქალაქო თავდაცვა და უსაფრთხოება", semester: 1,
  topic: "პირველი დახმარება", public_payload_json: JSON.stringify({ text }),
  semantic_group_id: `legacy-${id}`, history_id: null, last_correct: null,
  next_review_at: null, last_answered_at: null, ...history,
});

test("collapses only decorative copies of the same generated question", () => {
  const core = "რომელი არის ცოცხალი ბუნების ნაწილი?";
  const candidates = [
    makeCandidate("g1n1_01", core),
    makeCandidate("g1n1_01_x15", `დამოუკიდებელ სავარჯიშოში: ${core}`),
  ];
  assert.equal(new Set(candidates.map(assessmentSelectionKey)).size, 1);
  assert.equal(distinctSelectionGroupCount(candidates), 1);
});

test("keeps genuinely different generated families with the same ordinal available", () => {
  const candidates = [
    makeCandidate("g1n1_01", "რომელი არის ცოცხალი ბუნების ნაწილი?"),
    makeCandidate("g1n2_01", "რომელი არის არაცოცხალი ბუნების ნაწილი?"),
    makeCandidate("g1n3_01", "რომელი ცხოველი ცხოვრობს წყალში?"),
  ];
  assert.equal(distinctSelectionGroupCount(candidates), 3);
});

test("v8 variants share the archive semantic group instead of repeating a concept", () => {
  const first = { ...makeCandidate("GE-G04-MA-S1-001", "გამოთვალე: 7 + 5 = ?"), semantic_group_id: "v8f_abc123" };
  const second = { ...makeCandidate("GE-G04-MA-S1-101", "საკლასო პრაქტიკა — გამოთვალე: 7 + 5 = ?"), semantic_group_id: "v8f_abc123" };
  assert.equal(assessmentSelectionKey(first), assessmentSelectionKey(second));
  assert.equal(distinctSelectionGroupCount([first, second]), 1);
});

test("collapses live English cosmetic variants even when legacy semantic groups differ", () => {
  const variants = [
    ["GE2-G03-EN-S2-112", "consider a likely mistake and choose the correct solution: “Cats” is plural.", "v8_86862a11d9a0c7"],
    ["GE2-G03-EN-S2-032", "find the information that matters and answer: “Cats” is plural.", "v8_ba9687bf9c8c29"],
    ["GE2-G03-EN-S2-012", "make sure your choice fully matches the task: “Cats” is plural.", "v8_e8ed4eabfc04ca"],
  ].map(([id, text, semantic_group_id]) => ({ ...makeCandidate(id, text), grade: 3, subject: "ინგლისური", semester: 2, semantic_group_id }));
  assert.equal(distinctSelectionGroupCount(variants), 1);
  assert.equal(new Set(variants.map(assessmentSelectionKey)).size, 1);
});

test("collapses every known English decorative wrapper to the task core", () => {
  const cores = [
    "apply the relevant rule and answer: Complete: I ___ a student.",
    "approach the same learning goal with a different strategy: Complete: I ___ a student.",
    "connect the task with the correct rule and solve: Complete: I ___ a student.",
    "Before answering, identify the skill you need. Then solve: Complete: I ___ a student.",
    "examine every option carefully and solve: Complete: I ___ a student.",
  ].map((text, index) => ({ ...makeCandidate(`GE2-G01-EN-S1-${index + 1}`, text), grade: 1, subject: "ინგლისური", semantic_group_id: `v8_old${index}` }));
  assert.equal(distinctSelectionGroupCount(cores), 1);
  assert.equal(cleanDecorativePrompt("Before answering, identify the skill you need. Then solve: Complete: I ___ a student."), "Complete: I ___ a student.");
});

test("a completed ten-question nature attempt leaves later families eligible", () => {
  const now = Date.now(), candidates = [];
  for (let family = 1; family <= 5; family++) {
    for (let item = 1; item <= 10; item++) {
      const id = `g1n${family}_${String(item).padStart(2, "0")}`;
      candidates.push(makeCandidate(id, `ბუნების კითხვა ${family}-${item}`, family === 1 ? {
        history_id: `history-${item}`, last_correct: 1, next_review_at: now + 86_400_000, last_answered_at: now,
      } : {}));
    }
  }
  const eligible = eligibleCandidatesBySelectionHistory(candidates, now);
  assert.equal(distinctSelectionGroupCount(eligible), 40);
});

test("a previously answered variant blocks its whole semantic family until review is due", () => {
  const now = Date.now(), text = "ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია:";
  const candidates = [
    makeCandidate("g12safe1_07", text, { history_id: "history-1", last_correct: 0, next_review_at: now + 86_400_000, last_answered_at: now }),
    makeCandidate("g12safe1_07_x15", text),
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

test("rewrites ambiguous grade-one comparison and fill prompts", () => {
  const comparison = correctKnownQuestionPayload({
    id: "g1mb4_s2d_x15",
    text: "ახალ სავარჯიშო ბარათზე მოცემულია: სურათების დათვლის ჩანაწერში: ყვითელი — 2, მწვანე — 7. რამდენით მეტია მეტი ჯგუფი?",
    opts: ["5", "2", "6", "7"],
  });
  assert.equal(comparison.text, "ბარათზე 2 ყვითელი და 7 მწვანე სურათია. რამდენით მეტია მწვანე სურათი, ვიდრე ყვითელი?");
  assert.deepEqual(comparison.opts, ["5", "2", "6", "7"]);
  assert.doesNotMatch(comparison.text, /მეტი ჯგუფი/u);

  const fill = correctKnownQuestionPayload({ id: "g1g2_14", text: "წინადადება იწყება ___ ასოთი." });
  assert.equal(fill.text, "სიტყვა „ბურთი“ ასო ___-თი იწყება.");
  assert.deepEqual(correctKnownAnswerKey("g1g2_14_x15", { blanks: ["დიდი"] }), { blanks: ["ბ"] });
  assert.equal(correctKnownQuestionExplanation("g1g2_14", "შესავსები პასუხია: დიდი."), "სიტყვა „ბურთი“ ასო „ბ“-თი იწყება.");
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

test("verified submit is idempotent after the results page is already shown", async () => {
  const source = await readFile(new URL("../public/server-assessments.js", import.meta.url), "utf8");
  const finish = source.slice(source.indexOf("finishTest=async function"), source.indexOf("loadBuilderCatalog=async function"));
  assert.match(finish, /hideSubmitModal\(\);\s*if\(serverSubmitting\)return;/u);
  assert.match(finish, /p-results[^\n]+classList\.contains\('active'\)\)return;/u);
});
