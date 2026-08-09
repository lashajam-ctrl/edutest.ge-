import { and, desc, eq, or } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { adminAuditEvents, customTests } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const allowedSubjects = new Set(["მათემატიკა", "ქართული", "ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული", "ბუნება", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ქიმია", "ფიზიკა", "ალგებრა", "გეომეტრია"]);
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";
const subjectAllowedForGrade = (subject: string, grade: number) => {
  if (grade <= 4) return ["მათემატიკა", "ქართული", "ინგლისური", "ბუნება"].includes(subject);
  if (grade <= 6) return ["მათემატიკა", "ქართული", "ინგლისური", "რუსული", "ბუნება"].includes(subject);
  const senior = ["ალგებრა", "გეომეტრია", "ქართული ენა და ლიტერატურა", "ინგლისური", "რუსული", "ისტორია", "გეოგრაფია", "ბიოლოგია", "ფიზიკა"];
  if (grade >= 8) senior.push("ქიმია");
  return senior.includes(subject);
};

function parseQuestions(value: string) { try { return JSON.parse(value) as unknown[]; } catch { return []; } }
function publicTest(row: typeof customTests.$inferSelect) {
  return { id: row.id, createdBy: row.createdBy, title: row.title, subject: row.subject, grade: row.grade, durationMinutes: row.durationMinutes, attemptsAllowed: row.attemptsAllowed, published: row.published, createdAt: row.createdAt, updatedAt: row.updatedAt, deprecated: true };
}

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const condition = current.user.role === "admin" ? undefined
    : current.user.role === "teacher" ? or(eq(customTests.createdBy, current.user.id), eq(customTests.published, true))
      : and(eq(customTests.published, true), eq(customTests.grade, Number(current.user.grade)));
  const rows = condition
    ? await getDb().select().from(customTests).where(condition).orderBy(desc(customTests.updatedAt)).limit(500)
    : await getDb().select().from(customTests).orderBy(desc(customTests.updatedAt)).limit(500);
  return Response.json({ tests: rows.map(publicTest) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (!["teacher", "admin"].includes(current.user.role)) return Response.json({ error: "მასწავლებლის ან ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  const title = clean(body.title, 160); const subject = clean(body.subject, 80);
  const grade = Number(body.grade); const durationMinutes = Number(body.durationMinutes); const attemptsAllowed = Number(body.attemptsAllowed);
  const published = body.published === true; const questions = Array.isArray(body.questions) ? body.questions : [];
  if (!title || !allowedSubjects.has(subject) || !Number.isInteger(grade) || grade < 1 || grade > 12 || !subjectAllowedForGrade(subject, grade) || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180 || !Number.isInteger(attemptsAllowed) || attemptsAllowed < 1 || attemptsAllowed > 20 || questions.length < 1 || questions.length > 40) {
    return Response.json({ error: "ტესტის მონაცემები არასწორია" }, { status: 400 });
  }
  let normalized: Array<{ id: string; text: string; options: string[]; correct: number; type: string; explanation: string; skill: string; points: number }>;
  try {
    normalized = questions.map((question, index) => {
      const q = question && typeof question === "object" ? question as Record<string, unknown> : {};
      const text = clean(q.text, 1000); const options = Array.isArray(q.options) ? q.options.map(item => clean(item, 300)).filter(Boolean).slice(0, 6) : [];
      const correct = Number(q.correct);
      if (!text || options.length < 2 || new Set(options).size !== options.length || !Number.isInteger(correct) || correct < 0 || correct >= options.length) throw new Error(`არასწორი კითხვა: ${index + 1}`);
      return { id: clean(q.id, 160) || `custom-${crypto.randomUUID()}`, text, options, correct, type: "multiple_choice", explanation: clean(q.explanation, 1000), skill: clean(q.skill, 100) || "teacher-created", points: 1 };
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "კითხვები არასწორია" }, { status: 400 });
  }
  const now = new Date(); const id = `custom-test-${crypto.randomUUID()}`;
  const row = { id, createdBy: current.user.id, title, subject, grade, durationMinutes, attemptsAllowed, published, questionsJson: JSON.stringify(normalized), createdAt: now, updatedAt: now };
  await getDb().insert(customTests).values(row);
  if (current.user.role === "admin") await getDb().insert(adminAuditEvents).values({ id: crypto.randomUUID(), adminId: current.user.id, action: "ტესტის შექმნა", details: `${title}; ${subject}; ${grade} კლასი`, createdAt: now });
  return Response.json({ test: publicTest(row) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (!["teacher", "admin"].includes(current.user.role)) return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
  await ensureSchema();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const [target] = await getDb().select().from(customTests).where(eq(customTests.id, id)).limit(1);
  if (!target || (current.user.role !== "admin" && target.createdBy !== current.user.id)) return Response.json({ error: "ტესტი ვერ მოიძებნა" }, { status: 404 });
  await getDb().delete(customTests).where(eq(customTests.id, id));
  return Response.json({ ok: true });
}
