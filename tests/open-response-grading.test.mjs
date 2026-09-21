import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyOpenAnswer, gradeDeterministicShortAnswer, normalizeShortText, parseNumericShortAnswer } from "../lib/short-answer-core.mjs";

const source = path => readFile(new URL(path, import.meta.url), "utf8");

test("open answers are classified into deterministic and AI grading modes", () => {
  assert.equal(classifyOpenAnswer("3/2").mode, "numeric");
  assert.equal(classifyOpenAnswer("თბილისი").mode, "text");
  assert.equal(classifyOpenAnswer("ეს პასუხი ორმოცზე მეტი სიმბოლოსგან შედგება და აზრობრივ შეფასებას მოითხოვს.").mode, "ai");
});

test("numeric and short text grading accepts equivalent safe forms", () => {
  assert.equal(parseNumericShortAnswer("3 / 2 სმ").value, 1.5);
  assert.equal(gradeDeterministicShortAnswer({ mode: "numeric", expected: "3/2", tolerance: 1e-9 }, "1,5").correct, true);
  assert.equal(gradeDeterministicShortAnswer({ mode: "numeric", expected: "2 სმ", tolerance: 1e-9 }, "2 მ").correct, false);
  assert.equal(gradeDeterministicShortAnswer({ mode: "text", accepted: ["ქართული ენა"] }, "  ქართული   ენა. ").correct, true);
  assert.equal(normalizeShortText("„პასუხი“"), '"პასუხი"');
});

test("AI grading is structured, server-only, confidence-gated and non-destructive", async () => {
  const ai = await source("../lib/ai-grading.ts");
  const submit = await source("../app/api/assessments/submit/route.ts");
  const start = await source("../app/api/assessments/start/route.ts");
  const selection = await source("../lib/assessment-selection.ts");
  const client = await source("../public/server-assessments.js");
  assert.match(ai, /type: "json_schema"/);
  assert.match(ai, /store: false/);
  assert.match(ai, /safety_identifier/);
  assert.match(ai, /confidence < 0\.85/);
  assert.match(ai, /status: "pending"/);
  assert.match(submit, /await gradeOpenResponseWithAi/);
  assert.match(submit, /row\.gradingStatus === "graded"/);
  assert.match(submit, /pending: pendingCount/);
  assert.match(start, /"v8", "v11", "v23"/);
  assert.match(selection, /\["v11", "v23"\]/);
  assert.match(client, /AbortSignal\.timeout\(60000\)/);
});
