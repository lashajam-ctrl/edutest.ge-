const controlCharacters = /[\u0000-\u001f\u007f]/gu;

export function normalizeShortText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ka-GE")
    .replace(controlCharacters, " ")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/[“”„‟«»]/gu, '"')
    .replace(/[.!?…]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function decimal(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumericShortAnswer(value) {
  const raw = normalizeShortText(value).replace(/\s*([/:])\s*/gu, "$1");
  const match = raw.match(/^([-+]?\d+(?:[.,]\d+)?)(?:([/:])([-+]?\d+(?:[.,]\d+)?))?\s*([%a-zა-ჰ²³]+)?$/iu);
  if (!match) return null;
  const left = decimal(match[1]), right = match[3] == null ? null : decimal(match[3]);
  if (left == null || (match[2] && (right == null || right === 0))) return null;
  const numericValue = match[2] ? left / right : left;
  const unit = normalizeShortText(match[4] || "").replace(/\s+/gu, "");
  return { value: numericValue, unit, raw };
}

export function classifyOpenAnswer(value) {
  const structured = value !== null && typeof value === "object";
  const answer = (structured ? JSON.stringify(value) : String(value ?? "")).normalize("NFKC").trim();
  if (!answer) return null;
  if (structured) return { mode: "ai", referenceAnswer: answer };
  const numeric = parseNumericShortAnswer(answer);
  if (numeric) return { mode: "numeric", expected: answer, tolerance: Math.max(1e-9, Math.abs(numeric.value) * 1e-9) };
  if (answer.length <= 40) return { mode: "text", accepted: [answer] };
  return { mode: "ai", referenceAnswer: answer };
}

export function gradeDeterministicShortAnswer(answerKey, userAnswer) {
  if (!answerKey || typeof answerKey !== "object" || typeof userAnswer === "boolean") return { handled: false, correct: false, correctDisplay: null };
  const submitted = String(userAnswer ?? "").trim();
  if (answerKey.mode === "numeric") {
    const expected = parseNumericShortAnswer(answerKey.expected), actual = parseNumericShortAnswer(submitted);
    if (!expected || !actual) return { handled: true, correct: false, correctDisplay: answerKey.expected ?? null };
    const tolerance = Math.max(0, Number(answerKey.tolerance) || 0);
    const unitMatches = !expected.unit || !actual.unit || expected.unit === actual.unit;
    return { handled: true, correct: unitMatches && Math.abs(expected.value - actual.value) <= tolerance, correctDisplay: answerKey.expected };
  }
  if (answerKey.mode === "text") {
    const accepted = Array.isArray(answerKey.accepted) ? answerKey.accepted : [];
    const normalizedSubmitted = normalizeShortText(submitted);
    return {
      handled: true,
      correct: Boolean(normalizedSubmitted) && accepted.some(value => normalizeShortText(value) === normalizedSubmitted),
      correctDisplay: accepted[0] ?? null,
    };
  }
  return { handled: false, correct: false, correctDisplay: null };
}
