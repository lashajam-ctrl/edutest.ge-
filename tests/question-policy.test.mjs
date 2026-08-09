import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/question-policy.js", import.meta.url), "utf8");
const sandbox = {};
vm.runInNewContext(`${source}\nglobalThis.__policy=globalThis.QUESTION_POLICY;`, sandbox);
const policy = sandbox.__policy;

test("recognizes numeric and name-only rewrites as one semantic question", () => {
  const first = {
    type: "multiple_choice",
    text: "ნინას ჰქონდა 14 ფანქარი და კიდევ 1 აჩუქეს. რამდენი ფანქარი აქვს ახლა?",
  };
  const second = {
    type: "multiple_choice",
    text: "ლუკას ჰქონდა 8 ფანქარი და კიდევ 1 აჩუქეს. რამდენი ფანქარი აქვს ახლა?",
  };
  assert.equal(policy.semanticFingerprint(first), policy.semanticFingerprint(second));
});

test("blocks placeholder answers and incomplete fill prompts", () => {
  assert.equal(policy.hasPlaceholderOption({ opts: ["15", "ვარიანტი 4"] }), true);
  assert.equal(policy.hasCompleteInstruction({
    type: "fill",
    text: "2, 4, ___, 8",
    blanks: ["6"],
  }), false);
  assert.equal(policy.hasCompleteInstruction({
    type: "fill",
    text: "ჩაწერე გამოტოვებული რიცხვი: 2, 4, ___, 8.",
    blanks: ["6"],
  }), true);
});

test("enforces early-grade math and language boundaries", () => {
  const warehouse = {
    type: "multiple_choice",
    grade: 1,
    gradeMin: 1,
    gradeMax: 1,
    text: "საწყობში იყო 115 ნივთი. პირველ დღეს გაიტანეს 33, მეორე დღეს — 3. რამდენი დარჩა?",
    opts: ["79", "78", "82"],
  };
  assert.equal(policy.isGradeAppropriate(warehouse, { grade: 1, subject: "math-12" }), false);

  const addition = {
    type: "multiple_choice",
    grade: 1,
    gradeMin: 1,
    gradeMax: 1,
    text: "ანას ჰქონდა 7 ვაშლი. კიდევ 2 მისცეს. რამდენი ვაშლი აქვს ახლა?",
    opts: ["9", "8", "10"],
  };
  assert.equal(policy.isGradeAppropriate(addition, { grade: 1, subject: "math-12" }), true);

  const prematureMultiplication = {
    type: "true_false",
    grade: 1,
    gradeMin: 1,
    gradeMax: 1,
    text: "4 × 3 = 12.",
    opts: ["✅ სწორია", "❌ მცდარია"],
  };
  assert.equal(policy.isGradeAppropriate(prematureMultiplication, { grade: 1, subject: "math-12" }), false);

  const englishOnly = {
    type: "multiple_choice",
    grade: 1,
    text: "Which tense is used in completed?",
    opts: ["past", "present"],
  };
  assert.equal(policy.isGradeAppropriate(englishOnly, { grade: 1, subject: "eng-12" }), false);
  assert.equal(policy.isGradeAppropriate({
    ...englishOnly,
    text: "აირჩიე სწორი ინგლისური სიტყვა: „კატა“",
    bilingual: true,
  }, { grade: 1, subject: "eng-12" }), true);
});

test("ignores internal visual identifiers when checking grade-one number limits", () => {
  const visualQuestion = {
    type: "multiple_choice",
    grade: 1,
    gradeMin: 1,
    gradeMax: 1,
    text: "დიაგრამაზე რომელი სვეტია ყველაზე მაღალი?",
    opts: ["A", "B", "C"],
    visual: { kind: "bars", values: [8, 12, 10], variantKey: "g1-s1-v0-f59" },
  };
  assert.equal(policy.isGradeAppropriate(visualQuestion, { grade: 1, subject: "math-12" }), true);
});
