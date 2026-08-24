import test from "node:test";
import assert from "node:assert/strict";

import {
  directMathResult,
  mappedSubject,
  recoverMissingScalarAnswer,
  transform,
  validateTransformed,
} from "../scripts/import-v8-question-bank.mjs";

const baseQuestion = {
  question_id: "GE-G02-KA-S1-005",
  bank_id: "G02-KA",
  grade: "2",
  semester: "1",
  subject_family: "ქართული ენა და ლიტერატურა",
  subject: "ქართული ენა და ლიტერატურა",
  subsubject: "ქართული",
  topic: "ასო და სიტყვა",
  curriculum_domain: "ასო და სიტყვა",
  question_type: "FILL",
  stem: "სიტყვა „დედა“ იწყება ასო ___-ზე.",
  options_json: "{}",
  difficulty: "foundation",
  quality_flags: "",
  language: "ka",
  stimulus: "",
  media_required: "0",
};

test("v8 subject mapping keeps school-facing subject names", () => {
  assert.equal(mappedSubject(baseQuestion).subject, "ქართული");
  assert.equal(mappedSubject({ ...baseQuestion, bank_id: "G08-MA", grade: "8", subsubject: "გეომეტრია" }).subject, "მათემატიკა");
  assert.equal(mappedSubject({ ...baseQuestion, bank_id: "G09-SC", grade: "9", subsubject: "ფიზიკა" }).subject, "ფიზიკა");
  assert.match(mappedSubject({ ...baseQuestion, bank_id: "G06-DT", grade: "6" }).reason, /expert_review/u);
});

test("missing fill answer is recovered only from an explicit rationale", () => {
  assert.deepEqual(recoverMissingScalarAnswer(baseQuestion, { answer_json: "null", rationale: "შესავსები პასუხია: დ." }), { answer: "დ", repaired: true });
  assert.deepEqual(recoverMissingScalarAnswer(baseQuestion, { answer_json: "null", rationale: "დაფიქრდი და უპასუხე." }), { answer: null, repaired: false });
});

test("fill formulation is made explicit and produces a server-only key", () => {
  const mapping = mappedSubject(baseQuestion);
  const transformed = transform(baseQuestion, { answer_json: "null", rationale: "შესავსები პასუხია: დ." }, mapping);
  assert.match(transformed.payload.text, /^შეავსე გამოტოვებული ადგილი:/u);
  assert.deepEqual(transformed.answerKey, { blanks: ["დ"] });
  assert.equal("answer" in transformed.payload, false);
  assert.equal(validateTransformed(baseQuestion, { answer_json: "null", rationale: "შესავსები პასუხია: დ." }, mapping, transformed).reasons.length, 0);
});

test("direct arithmetic is recomputed", () => {
  assert.equal(directMathResult("გამოთვალე: 12 − 5 = ?"), 7);
  assert.equal(directMathResult("4 × 6 = ?"), 24);
  assert.equal(directMathResult("18 : 3 = ?"), 6);
});

test("a direct-math answer mismatch is quarantined", () => {
  const question = { ...baseQuestion, bank_id: "G02-MA", subsubject: "მათემატიკა", stem: "გამოთვალე: 12 − 5 = ?" };
  const key = { answer_json: "\"8\"", rationale: "პასუხია: 8." };
  const mapping = mappedSubject(question), transformed = transform(question, key, mapping);
  assert.ok(validateTransformed(question, key, mapping, transformed).reasons.includes("direct_math_answer_mismatch"));
});
