export type SelectionCandidate = {
  id: string;
  grade: number;
  subject: string;
  semester: number;
  topic: string;
  public_payload_json: string;
  semantic_group_id: string;
  history_id?: string | null;
  last_correct?: number | null;
  next_review_at?: number | null;
  last_answered_at?: number | null;
};

export type LanguageBucket = "language" | "literature" | "grammar" | "vocabulary" | "reading" | "use_of_language";

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFKC")
  .toLocaleLowerCase("ka-GE")
  .replace(/[“”„"'`]/gu, "")
  .replace(/\s+/gu, " ")
  .trim();

function payloadText(question: Pick<SelectionCandidate, "public_payload_json">) {
  try {
    const payload = JSON.parse(question.public_payload_json) as Record<string, unknown>;
    return String(payload.text ?? "");
  } catch {
    return "";
  }
}

export function canonicalPromptCore(value: unknown) {
  let text = normalize(value);
  const severeBleeding = "ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია";
  if (text.includes(severeBleeding)) return severeBleeding;

  const prefixes = [
    /^(?:თემის სხვა კონტექსტში განხილვისას|საგამოცდო პრაქტიკისას|საგანგებო სიტუაციის სიმულაციაში|პირველი დახმარების ტრენინგში|სკოლის უსაფრთხოების გეგმაში)\s*:\s*/u,
    /^(?:in a new critical-reading task|in a new academic-language task|in another communication context|in an independent text-analysis task|apply the language rule or evidence)\s*:\s*/iu,
    /^(?:в новом академическом задании|в самостоятельном задании по анализу текста|в другом коммуникативном контексте|примените языковое правило или доказательство)\s*:\s*/iu,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of prefixes) {
      const next = text.replace(pattern, "");
      if (next !== text) { text = next; changed = true; }
    }
  }
  return text.replace(/[.:;!?]+$/gu, "").trim();
}

function generatedFamilyKey(id: string) {
  const match = id.match(/^(g\d+[a-z]+\d+_\d+)(?:_x\d+)?$/iu);
  return match ? match[1].toLocaleLowerCase() : "";
}

export function assessmentSelectionKey(question: Pick<SelectionCandidate, "id" | "grade" | "subject" | "semester" | "topic" | "public_payload_json" | "semantic_group_id">) {
  const scope = `${question.grade}|${normalize(question.subject)}|${question.semester}`;
  if (question.id.startsWith("GE-") && question.semantic_group_id.startsWith("v8_")) {
    return `${scope}|semantic:${question.semantic_group_id}`;
  }
  const family = generatedFamilyKey(question.id);
  if (family) return `${scope}|family:${family}`;
  const core = canonicalPromptCore(payloadText(question));
  return core ? `${scope}|prompt:${core}` : `${scope}|semantic:${question.semantic_group_id}`;
}

export function rankCandidatesBySelectionHistory<T extends SelectionCandidate>(candidates: T[], now: number) {
  const history = new Map<string, { dueIncorrect: boolean; lastAnsweredAt: number }>();
  for (const question of candidates) {
    if (!question.history_id) continue;
    const key = assessmentSelectionKey(question), current = history.get(key);
    history.set(key, {
      dueIncorrect: Boolean(current?.dueIncorrect || (question.last_correct === 0 && Number(question.next_review_at ?? 0) <= now)),
      lastAnsweredAt: Math.max(current?.lastAnsweredAt ?? 0, Number(question.last_answered_at ?? 0)),
    });
  }
  return candidates.map((question, index) => {
    const group = history.get(assessmentSelectionKey(question));
    return { question, index, priority: !group ? 0 : group.dueIncorrect ? 1 : 2, lastAnsweredAt: group?.lastAnsweredAt ?? 0 };
  }).sort((left, right) => left.priority - right.priority
    || left.lastAnsweredAt - right.lastAnsweredAt
    || assessmentSelectionKey(left.question).localeCompare(assessmentSelectionKey(right.question))
    || left.question.id.localeCompare(right.question.id)
    || left.index - right.index)
    .map(row => row.question);
}

export function eligibleCandidatesBySelectionHistory<T extends SelectionCandidate>(candidates: T[], now: number) {
  const history = new Map<string, { seen: boolean; dueIncorrect: boolean }>();
  for (const question of candidates) {
    const key = assessmentSelectionKey(question), current = history.get(key) ?? { seen: false, dueIncorrect: false };
    if (question.history_id) {
      current.seen = true;
      current.dueIncorrect ||= question.last_correct === 0 && Number(question.next_review_at ?? 0) <= now;
    }
    history.set(key, current);
  }
  return candidates.filter(question => {
    const state = history.get(assessmentSelectionKey(question));
    return !state?.seen || state.dueIncorrect;
  });
}

export function distinctSelectionGroupCount(candidates: SelectionCandidate[]) {
  return new Set(candidates.map(assessmentSelectionKey)).size;
}

const foreignLanguageWeights = (grade: number) => {
  if (grade <= 2) return { grammar: 20, vocabulary: 35, reading: 30, use_of_language: 15 } as const;
  if (grade <= 4) return { grammar: 25, vocabulary: 30, reading: 25, use_of_language: 20 } as const;
  if (grade <= 6) return { grammar: 30, vocabulary: 25, reading: 25, use_of_language: 20 } as const;
  if (grade <= 9) return { grammar: 30, vocabulary: 20, reading: 25, use_of_language: 25 } as const;
  return { grammar: 30, vocabulary: 15, reading: 25, use_of_language: 30 } as const;
};

export function languageBlueprintFor(subject: unknown, grade: unknown): Partial<Record<LanguageBucket, number>> | null {
  const value = normalize(subject), numericGrade = Number(grade);
  if (value === "ქართული" || value === "ქართული ენა და ლიტერატურა") return { language: 40, literature: 60 };
  if (value === "ინგლისური" || value === "რუსული") return foreignLanguageWeights(numericGrade);
  return null;
}

export function allocateByWeight(total: number, weights: Partial<Record<LanguageBucket, number>>) {
  const safeTotal = Math.max(0, Math.floor(total));
  const entries = Object.entries(weights).filter((row): row is [LanguageBucket, number] => Number(row[1]) > 0);
  const weightTotal = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!safeTotal || !weightTotal) return Object.fromEntries(entries.map(([key]) => [key, 0])) as Record<LanguageBucket, number>;
  const rows = entries.map(([key, weight], index) => {
    const exact = safeTotal * weight / weightTotal, floor = Math.floor(exact);
    return { key, index, floor, remainder: exact - floor };
  });
  let remaining = safeTotal - rows.reduce((sum, row) => sum + row.floor, 0);
  for (const row of [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining <= 0) break;
    row.floor++; remaining--;
  }
  return Object.fromEntries(rows.map(row => [row.key, row.floor])) as Record<LanguageBucket, number>;
}

export function languageBucketFor(subject: unknown, topic: unknown, text: unknown): LanguageBucket | null {
  const value = normalize(subject), haystack = normalize(`${topic ?? ""} ${text ?? ""}`);
  if (value === "ქართული" || value === "ქართული ენა და ლიტერატურა") {
    if (/გრამატ|მართლწერ|პუნქტუ|სინტაქ|ლექსიკ|რედაქტ|მორფოლოგ|ბრუნ|ზმნ|არსებით|ზედსართავ|ნაცვალსახელ|მეტყველების ნაწილ|წინადადებ/u.test(haystack)) return "language";
    return "literature";
  }
  if (value === "ინგლისური") {
    if (/grammar|conditional|passive|relative clause|reported speech|participle|modal|continuous|tense|article|preposition|pronoun|plural|word order|inversion/u.test(haystack)) return "grammar";
    if (/vocabulary|collocation|word formation|lexis|synonym|antonym/u.test(haystack)) return "vocabulary";
    if (/reading|comprehension|source evaluation|research literacy|interpretation|argumentation.+evidence/u.test(haystack)) return "reading";
    return "use_of_language";
  }
  if (value === "რუსული") {
    if (/граммат|орфограф|пунктуац|синтак|косвенная речь|союз|относительн|условн|склон|спряж|части речи|смысловые отношения/u.test(haystack)) return "grammar";
    if (/лексик|синоним|антоним|словообраз/u.test(haystack)) return "vocabulary";
    if (/чтени|понимани|источник|анализ текста|аргументац|контраргумент|главная мысль/u.test(haystack)) return "reading";
    return "use_of_language";
  }
  return null;
}

export function componentCountsForTest(subject: unknown, grade: unknown, count: number) {
  const blueprint = languageBlueprintFor(subject, grade);
  return blueprint ? allocateByWeight(count, blueprint) : null;
}

export function correctKnownQuestionPayload(payload: Record<string, unknown>) {
  const result = { ...payload };
  const baseQuestionId = String(result.id ?? "").replace(/_x\d+$/u, "");
  const gradeOneComparisonPrompts: Record<string, string> = {
    g1mb1_s2d: "ბარათზე 3 წითელი და 5 ლურჯი სურათია. რამდენით მეტია ლურჯი სურათი, ვიდრე წითელი?",
    g1mb2_s2d: "ბარათზე 4 კატა და 2 ძაღლია. რამდენით მეტია კატა, ვიდრე ძაღლი?",
    g1mb3_s2d: "ბარათზე 6 წიგნი და 3 რვეულია. რამდენით მეტია წიგნი, ვიდრე რვეული?",
    g1mb4_s2d: "ბარათზე 2 ყვითელი და 7 მწვანე სურათია. რამდენით მეტია მწვანე სურათი, ვიდრე ყვითელი?",
    g1mb5_s2d: "ბარათზე 5 ბურთი და 8 კუბია. რამდენით მეტია კუბი, ვიდრე ბურთი?",
  };
  if (gradeOneComparisonPrompts[baseQuestionId]) {
    result.text = gradeOneComparisonPrompts[baseQuestionId];
  }
  if (baseQuestionId === "g1g2_14") {
    result.text = "სიტყვა „ბურთი“ ასო ___-თი იწყება.";
  }
  if (String(result.text ?? "").includes("ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია")) {
    result.text = "ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია:";
  }
  if (Array.isArray(result.opts)) {
    result.opts = result.opts.map(option => String(option).includes("დაჭერილი პირდაპირი წნევა")
      ? "ჭრილობაზე უწყვეტი პირდაპირი დაწოლა სტერილური საფენით ან სუფთა ქსოვილით და სასწრაფო დახმარების გამოძახება"
      : option);
  }
  return result;
}

export function correctKnownExplanation(value: unknown) {
  return String(value ?? "")
    .replaceAll("დაჭერილი პირდაპირი წნევა", "ჭრილობაზე უწყვეტი პირდაპირი დაწოლა")
    .replaceAll("პირდაპირი წნევა", "პირდაპირი დაწოლა");
}

export function correctKnownAnswerKey(questionId: unknown, answerKey: Record<string, unknown>) {
  const baseQuestionId = String(questionId ?? "").replace(/_x\d+$/u, "");
  return baseQuestionId === "g1g2_14" ? { ...answerKey, blanks: ["ბ"] } : answerKey;
}

export function correctKnownQuestionExplanation(questionId: unknown, value: unknown) {
  const baseQuestionId = String(questionId ?? "").replace(/_x\d+$/u, "");
  return baseQuestionId === "g1g2_14"
    ? "სიტყვა „ბურთი“ ასო „ბ“-თი იწყება."
    : correctKnownExplanation(value);
}
