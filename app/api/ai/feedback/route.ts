import { env } from "cloudflare:workers";
import { getSessionUser } from "@/lib/auth";

type WrongItem = {
  id: string;
  text: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  skill?: string;
  outcome?: string | null;
};

const recentRequests = new Map<string, number[]>();

function outputText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) if (part && typeof part === "object" && (part as { type?: string }).type === "output_text" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
  }
  return "";
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const runtime = env as unknown as Record<string, string>;
  if (runtime.AI_FEEDBACK_ENABLED !== "true") return Response.json({ enabled: false, reason: "AI feedback is disabled" });
  if (runtime.AI_UNDER18_SAFEGUARDS_ACKNOWLEDGED !== "true") {
    return Response.json({ enabled: false, reason: "Under-18 safeguards are not acknowledged" });
  }
  if (!runtime.OPENAI_API_KEY || !runtime.OPENAI_MODEL) return Response.json({ enabled: false, reason: "AI feedback is not configured" });

  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (recentRequests.get(current.user.id) ?? []).filter(value => value > windowStart);
  if (timestamps.length >= 12) return Response.json({ error: "ცოტა ხნით მოიცადეთ და ისევ სცადეთ" }, { status: 429 });
  timestamps.push(now); recentRequests.set(current.user.id, timestamps);

  const body = await request.json() as { subject?: unknown; grade?: unknown; items?: unknown };
  const subject = typeof body.subject === "string" ? body.subject.slice(0, 80) : "უცნობი საგანი";
  const grade = Math.min(12, Math.max(1, Number(body.grade) || 1));
  const items = (Array.isArray(body.items) ? body.items : []).filter((item): item is WrongItem => {
    if (!item || typeof item !== "object") return false;
    const row = item as Partial<WrongItem>;
    return typeof row.id === "string" && typeof row.text === "string" && typeof row.correctAnswer === "string";
  }).slice(0, 8).map(item => ({
    id: item.id.slice(0, 160), text: item.text.slice(0, 800), userAnswer: String(item.userAnswer ?? "").slice(0, 300),
    correctAnswer: item.correctAnswer.slice(0, 300), explanation: String(item.explanation ?? "").slice(0, 500),
    skill: String(item.skill ?? "general").slice(0, 120), outcome: item.outcome ? String(item.outcome).slice(0, 120) : null,
  }));
  if (!items.length) return Response.json({ error: "გასაანალიზებელი შეცდომა არ არის" }, { status: 400 });

  const schema = {
    type: "object", additionalProperties: false, required: ["summary", "items"],
    properties: {
      summary: { type: "string" },
      items: { type: "array", items: { type: "object", additionalProperties: false,
        required: ["sourceQuestionId", "misconception", "explanation", "nextStep", "practiceQuestion"],
        properties: {
          sourceQuestionId: { type: "string" }, misconception: { type: "string" }, explanation: { type: "string" }, nextStep: { type: "string" },
          practiceQuestion: { type: "object", additionalProperties: false, required: ["text", "options", "correctIndex", "explanation", "skill"], properties: {
            text: { type: "string" }, options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
            correctIndex: { type: "integer", minimum: 0, maximum: 3 }, explanation: { type: "string" }, skill: { type: "string" },
          } },
        },
      } },
    },
  };
  const prompt = [
    `შენ ხარ საქართველოს სკოლის ${grade} კლასის ${subject}-ის ფრთხილი დამხმარე მასწავლებელი.`,
    "იმუშავე მხოლოდ მოცემული კითხვის, პლატფორმის მიერ დადგენილი სწორი პასუხისა და ახსნის საფუძველზე.",
    "არ შეცვალო სწორი პასუხი, არ გამოიგონო სახელმძღვანელოს გვერდი ან ეროვნული სტანდარტის კოდი.",
    "აუხსენი ბავშვს მარტივი, მხარდამჭერი ქართულით რა შეეშალა, რატომ არის სწორი პასუხი სწორი და რა გააკეთოს შემდეგ.",
    "თითო შეცდომაზე შექმენი ერთი ახალი, განსხვავებული მაგრამ იმავე უნარის სავარჯიშო. სავარჯიშო უნდა იყოს ერთმნიშვნელოვანი და ასაკთან შესაბამისი.",
    "არ მოითხოვო და არ გაიმეორო პერსონალური მონაცემები. თუ საწყისი მონაცემი არასაკმარისია, პირდაპირ თქვი, რომ მასწავლებლის შემოწმებაა საჭირო.",
    JSON.stringify(items),
  ].join("\n");

  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${runtime.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: runtime.OPENAI_MODEL,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      text: { format: { type: "json_schema", name: "student_feedback", strict: true, schema } },
      max_output_tokens: 2200,
    }),
  });
  if (!aiResponse.ok) return Response.json({ error: "AI უკუკავშირი დროებით მიუწვდომელია" }, { status: 503 });
  const raw = await aiResponse.json() as Record<string, unknown>;
  const text = outputText(raw);
  try {
    const feedback = JSON.parse(text);
    return Response.json({ enabled: true, feedback }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "AI პასუხის ფორმატი ვერ დამუშავდა" }, { status: 502 });
  }
}
