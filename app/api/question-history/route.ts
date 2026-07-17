import { and, asc, eq, inArray } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { questionHistory } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const rows = await getDb().select({ questionId: questionHistory.questionId, poolKey: questionHistory.poolKey, answeredAt: questionHistory.answeredAt })
    .from(questionHistory).where(eq(questionHistory.userId, current.user.id)).orderBy(asc(questionHistory.answeredAt));
  return Response.json({ history: rows });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const body = await request.json() as { questionIds?: unknown; poolKey?: unknown };
  const questionIds = Array.isArray(body.questionIds)
    ? [...new Set(body.questionIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 160))].slice(0, 100)
    : [];
  const poolKey = typeof body.poolKey === "string" ? body.poolKey.slice(0, 120) : "unknown";
  if (!questionIds.length) return Response.json({ error: "კითხვები არ არის მითითებული" }, { status: 400 });
  await ensureSchema();
  const db = getDb();
  const existing = await db.select({ questionId: questionHistory.questionId }).from(questionHistory)
    .where(and(eq(questionHistory.userId, current.user.id), inArray(questionHistory.questionId, questionIds)));
  const existingIds = new Set(existing.map(row => row.questionId));
  const now = new Date();
  const rows = questionIds.filter(id => !existingIds.has(id)).map(questionId => ({
    id: crypto.randomUUID(), userId: current.user.id, questionId, poolKey, answeredAt: now,
  }));
  if (rows.length) await db.insert(questionHistory).values(rows).onConflictDoNothing();
  return Response.json({ recorded: rows.length }, { status: 201 });
}
