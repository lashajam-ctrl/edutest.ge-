import { componentCountsForTest, correctKnownQuestionPayload } from "./assessment-selection";

export const ASSESSMENT_SUBJECTS_BY_GRADE: Record<number, string[]> = {
  1: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება"],
  2: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება"],
  3: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება", "მე და საზოგადოება"],
  4: ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება", "მე და საზოგადოება"],
  5: ["მათემატიკა", "ქართული", "ინგლისური", "რუსული", "ბუნება", "ჩვენი საქართველო"],
  6: ["მათემატიკა", "ქართული", "ინგლისური", "რუსული", "ბუნება", "ჩვენი საქართველო"],
  7: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "მოქალაქეობა"],
  8: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  9: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  10: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  11: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა", "ქიმია", "მოქალაქეობა"],
  12: ["მათემატიკა", "ქართული ენა და ლიტერატურა", "ინგლისური", "ისტორია", "სამოქალაქო თავდაცვა და უსაფრთხოება"],
};

export function canonicalAssessmentSubject(subject: unknown, grade: unknown) {
  const value = String(subject ?? "").trim();
  const numericGrade = Number(grade);
  if (numericGrade >= 7 && ["ალგებრა", "გეომეტრია", "მათემატიკა"].includes(value)) return "მათემატიკა";
  return value;
}

export function assessmentSubjectComponents(subject: unknown, grade: unknown) {
  const canonical = canonicalAssessmentSubject(subject, grade);
  return canonical === "მათემატიკა" && Number(grade) >= 7 ? ["მათემატიკა", "ალგებრა", "გეომეტრია"] : [canonical];
}

export function schoolGradeNumber(value: unknown) {
  const match = String(value ?? "").trim().match(/^(1[0-2]|[1-9])/u);
  return match ? Number(match[1]) : null;
}

export function subjectAllowedForGrade(subject: string, grade: number) {
  return ASSESSMENT_SUBJECTS_BY_GRADE[grade]?.includes(canonicalAssessmentSubject(subject, grade)) ?? false;
}

export type StoredAssessmentQuestion = {
  id: string;
  grade: number;
  subject: string;
  semester: number;
  topic: string;
  question_type: string;
  public_payload_json: string;
  points: number;
  semantic_group_id: string;
  strand?: string | null;
  difficulty?: string | null;
};

export type Presentation = { optionOrder?: number[] };

const allowedPayloadKeys = [
  "id", "text", "type", "pts", "grade", "subject", "semester", "topic",
  "opts", "items", "leftItems", "rightOptions", "tolerance", "media", "visual",
  "difficulty",
] as const;

export function parsePublicPayload(question: StoredAssessmentQuestion) {
  const source = JSON.parse(question.public_payload_json) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const key of allowedPayloadKeys) if (source[key] !== undefined) payload[key] = source[key];
  payload.id = question.id;
  payload.type = question.question_type;
  payload.pts = question.points;
  payload.grade = question.grade;
  payload.subject = question.subject;
  payload.semester = question.semester;
  payload.topic = question.topic;
  if (question.difficulty) payload.difficulty = question.difficulty;
  return correctKnownQuestionPayload(payload);
}

function randomIndex(maxExclusive: number) {
  if (maxExclusive <= 1) return 0;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % maxExclusive;
}

function shuffleWithOrder<T>(items: T[]) {
  const rows = items.map((value, originalIndex) => ({ value, originalIndex }));
  for (let i = rows.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return { values: rows.map(row => row.value), order: rows.map(row => row.originalIndex) };
}

export function prepareQuestion(question: StoredAssessmentQuestion) {
  const payload = parsePublicPayload(question);
  const presentation: Presentation = {};
  if (question.question_type === "multiple_choice" && Array.isArray(payload.opts)) {
    const shuffled = shuffleWithOrder(payload.opts);
    payload.opts = shuffled.values;
    presentation.optionOrder = shuffled.order;
  }
  if (question.question_type === "order" && Array.isArray(payload.items)) payload.items = shuffleWithOrder(payload.items).values;
  if (question.question_type === "match" && Array.isArray(payload.rightOptions)) payload.rightOptions = shuffleWithOrder(payload.rightOptions).values;
  return { payload, presentation };
}

const normalized = (value: unknown) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ka-GE").replace(/\s+/gu, " ").trim();
const sameArray = (left: unknown[], right: unknown[]) => left.length === right.length && left.every((value, index) => normalized(value) === normalized(right[index]));

export function gradeAssessmentAnswer(args: {
  question: StoredAssessmentQuestion;
  answerKey: Record<string, unknown>;
  userAnswer: unknown;
  presentation?: Presentation;
  publicPayload: Record<string, unknown>;
}) {
  const { question, answerKey, userAnswer, presentation = {}, publicPayload } = args;
  let correct = false;
  let correctDisplay: unknown = null;
  if (["multiple_choice", "true_false"].includes(question.question_type)) {
    const selected = Number(userAnswer);
    const originalIndex = question.question_type === "multiple_choice" && presentation.optionOrder
      ? presentation.optionOrder[selected]
      : selected;
    correct = Number.isInteger(selected) && originalIndex === Number(answerKey.correct);
    const options = Array.isArray(publicPayload.opts) ? publicPayload.opts : [];
    correctDisplay = options[Number(answerKey.correct)] ?? null;
  } else if (question.question_type === "calc") {
    const expected = Number(answerKey.correct), actual = Number(userAnswer), tolerance = Math.max(0, Number(answerKey.tolerance) || 0);
    correct = Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance;
    correctDisplay = expected;
  } else if (question.question_type === "order") {
    const expected = Array.isArray(answerKey.correct) ? answerKey.correct : [];
    correct = Array.isArray(userAnswer) && sameArray(userAnswer, expected);
    correctDisplay = expected;
  } else if (question.question_type === "match") {
    const expected = Array.isArray(answerKey.correct) ? answerKey.correct : [];
    const submitted = userAnswer && typeof userAnswer === "object"
      ? Object.keys(userAnswer as Record<string, unknown>).sort((a, b) => Number(a) - Number(b)).map(key => (userAnswer as Record<string, unknown>)[key])
      : [];
    correct = sameArray(submitted, expected);
    correctDisplay = Array.isArray(answerKey.pairs) ? answerKey.pairs : expected;
  } else if (question.question_type === "fill") {
    const expected = Array.isArray(answerKey.blanks) ? answerKey.blanks : [];
    correct = Array.isArray(userAnswer) && sameArray(userAnswer, expected);
    correctDisplay = expected;
  }
  return { correct, correctDisplay };
}

export function assessmentTestJson(row: Record<string, unknown>) {
  const grade = Number(row.grade), internalSubject = String(row.subject), subject = canonicalAssessmentSubject(internalSubject, grade);
  const standardSeniorMath = !Boolean(row.is_custom) && grade >= 7 && subject === "მათემატიკა";
  const title = standardSeniorMath
    ? String(row.title).replace(/^(?:ალგებრა|გეომეტრია|მათემატიკა)/u, "მათემატიკა")
    : String(row.title);
  const languageComponents = !Boolean(row.is_custom) ? componentCountsForTest(subject, grade, Number(row.question_count)) : null;
  return {
    id: String(row.id), title, subject, grade,
    semester: row.semester == null ? null : Number(row.semester), pool: `server:${subject}:${grade}`,
    count: Number(row.question_count), time: Number(row.time_minutes), attempts: Number(row.attempts_allowed),
    testType: String(row.test_type), difficulty: row.difficulty ? String(row.difficulty) : null,
    paid: false, serverBacked: true, curriculumVerified: String(row.source_pool) !== "v8", structuralVerified: true,
    teacherCreated: Boolean(row.is_custom), createdBy: row.created_by ? String(row.created_by) : null,
    published: Boolean(row.published),
    componentCounts: standardSeniorMath
      ? { algebra: Math.ceil(Number(row.question_count) * 0.6), geometry: Math.floor(Number(row.question_count) * 0.4) }
      : languageComponents ?? undefined,
  };
}
