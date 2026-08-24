const normalizeSelectionText = value => String(value ?? "")
  .normalize("NFKC")
  .toLocaleLowerCase("ka-GE")
  .replace(/[“”„"'`’]/gu, "")
  .replace(/\s+/gu, " ")
  .trim();

// The v8 source contains parallel forms whose only difference is a generic
// instruction prepended to the real task. These phrases must never turn one
// learning item into several selectable questions in the same assessment.
const ENGLISH_DECORATIVE_PREFIXES = [
  "answer from the information in the task:",
  "use a familiar rule in this new attempt:",
  "solve from the beginning rather than recalling a previous answer:",
  "rule out unsuitable choices first, then solve:",
  "retrieve the idea before relying on the answer choices:",
  "pay attention to symbols, units, or key words:",
  "pay attention to every important word:",
  "make sure your choice fully matches the task:",
  "identify the key idea and answer:",
  "use the same skill through a different working approach:",
  "find the information that matters and answer:",
  "do not rely on the first option you notice; solve:",
  "decide which idea is being tested, then answer:",
  "connect the task with the correct rule and solve:",
  "before answering, identify the skill you need. then solve:",
  "approach the same learning goal with a different strategy:",
  "apply the rule you learned to this task:",
  "apply the relevant rule and answer:",
  "examine every option carefully and solve:",
  "use your knowledge directly in this task:",
  "consider a likely mistake and choose the correct solution:",
  "compare the possible answers and decide:",
  "select the answer that satisfies the whole condition:",
].map(normalizeSelectionText);

const DECORATIVE_PREFIX_PATTERNS = [
  /^(?:თემის სხვა კონტექსტში განხილვისას|საგამოცდო პრაქტიკისას|საგანგებო სიტუაციის სიმულაციაში|პირველი დახმარების ტრენინგში|სკოლის უსაფრთხოების გეგმაში)\s*:\s*/u,
  /^(?:in a new critical-reading task|in a new academic-language task|in another communication context|in an independent text-analysis task|apply the language rule or evidence)\s*:\s*/iu,
  /^(?:в новом академическом задании|в самостоятельном задании по анализу текста|в другом коммуникативном контексте|примените языковое правило или доказательство)\s*:\s*/iu,
];

function cleanDecorativePrompt(value) {
  let text = String(value ?? "").normalize("NFKC").trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of ENGLISH_DECORATIVE_PREFIXES) {
      if (text.toLocaleLowerCase("en-US").startsWith(prefix)) {
        text = text.slice(prefix.length).trim();
        changed = true;
      }
    }
    for (const pattern of DECORATIVE_PREFIX_PATTERNS) {
      const next = text.replace(pattern, "");
      if (next !== text) {
        text = next;
        changed = true;
      }
    }
  }
  return text;
}

function canonicalPromptCore(value) {
  const text = normalizeSelectionText(cleanDecorativePrompt(value));
  const severeBleeding = "ძლიერი სისხლდენის დროს პირველადი დახმარების ერთ-ერთი ძირითადი ნაბიჯია";
  if (text.includes(severeBleeding)) return severeBleeding;
  return text.replace(/[.:;!?]+$/gu, "").trim();
}

const normalizedSet = values => Array.isArray(values)
  ? values.map(normalizeSelectionText).filter(Boolean).sort().join("|")
  : "";

function canonicalPublicTaskCore(value) {
  const payload = value && typeof value === "object" ? value : { text: value };
  const parts = [canonicalPromptCore(payload.text), normalizeSelectionText(payload.type)];
  if (Array.isArray(payload.opts)) parts.push(`opts:${normalizedSet(payload.opts)}`);
  if (Array.isArray(payload.items)) parts.push(`items:${normalizedSet(payload.items)}`);
  if (Array.isArray(payload.leftItems)) parts.push(`left:${normalizedSet(payload.leftItems)}`);
  if (Array.isArray(payload.rightOptions)) parts.push(`right:${normalizedSet(payload.rightOptions)}`);
  return parts.filter(Boolean).join("¦");
}

export { canonicalPromptCore, canonicalPublicTaskCore, cleanDecorativePrompt, normalizeSelectionText };
