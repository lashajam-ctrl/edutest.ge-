import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assignments, attempts, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const url = new URL(request.url);
  const requestedUser = url.searchParams.get("userId");
  let userId = current.user.id;
  if (requestedUser) {
    if (current.user.role !== "teacher" && current.user.role !== "admin") return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
    const [reviewedUser] = await getDb().select({ id: users.id, role: users.role, grade: users.grade }).from(users).where(eq(users.email, requestedUser.trim().toLowerCase())).limit(1);
    if (!reviewedUser || reviewedUser.role !== "student") return Response.json({ error: "მოსწავლე ვერ მოიძებნა" }, { status: 404 });
    if (current.user.role === "teacher") {
      const [scope] = await getDb().select({ id: assignments.id }).from(assignments)
        .where(and(eq(assignments.createdBy, current.user.id), eq(assignments.grade, String(reviewedUser.grade ?? "")))).limit(1);
      if (!scope) return Response.json({ error: "ამ მოსწავლის შედეგებზე წვდომა არ გაქვთ" }, { status: 403 });
    }
    userId = reviewedUser.id;
  }
  const rows = await getDb().select().from(attempts).where(eq(attempts.userId, userId)).orderBy(desc(attempts.submittedAt)).limit(250);
  return Response.json({ attempts: rows.map(row => ({ ...row, result: JSON.parse(row.answersJson) })) });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const body = await request.json() as { testId?: string; earned?: number; totalPts?: number; pct?: number; result?: unknown };
  const earned = Number(body.earned); const totalPts = Number(body.totalPts); const pct = Number(body.pct);
  const expectedPct = Math.round((earned / totalPts) * 100);
  if (!body.testId || !Number.isFinite(earned) || !Number.isFinite(totalPts) || !Number.isFinite(pct) || totalPts <= 0 || earned < 0 || earned > totalPts || pct < 0 || pct > 100 || Math.abs(Math.round(pct) - expectedPct) > 1) return Response.json({ error: "არასწორი შედეგი" }, { status: 400 });
  const row = { id: crypto.randomUUID(), userId: current.user.id, testId: body.testId, score: Math.round(earned), maxScore: Math.round(totalPts), percentage: Math.round(pct), answersJson: JSON.stringify(body.result ?? {}), submittedAt: new Date() };
  await getDb().insert(attempts).values(row);
  return Response.json({ attempt: row }, { status: 201 });
}
