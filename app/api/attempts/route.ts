import { and, desc, eq, inArray } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { adminAuditEvents, assignments, attempts, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

function parseResult(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function publicAttempt(row: { attempt: typeof attempts.$inferSelect; email: string; name: string; grade: string | null }) {
  return { ...row.attempt, userEmail: row.email, userName: row.name, userGrade: row.grade, result: parseResult(row.attempt.answersJson) };
}

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const requestedUser = url.searchParams.get("userId");

  if (scope === "managed") {
    if (current.user.role !== "teacher" && current.user.role !== "admin") return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
    const base = getDb().select({ attempt: attempts, email: users.email, name: users.name, grade: users.grade })
      .from(attempts).innerJoin(users, eq(attempts.userId, users.id));
    if (current.user.role === "admin") {
      const rows = await base.where(eq(users.role, "student")).orderBy(desc(attempts.submittedAt)).limit(1000);
      return Response.json({ attempts: rows.map(publicAttempt) }, { headers: { "Cache-Control": "no-store" } });
    }
    const ownedAssignments = await getDb().select({ grade: assignments.grade }).from(assignments).where(eq(assignments.createdBy, current.user.id));
    const grades = [...new Set(ownedAssignments.map(row => String(row.grade)).filter(Boolean))];
    const teacherSchool = String(current.user.school ?? "").trim();
    if (!grades.length || !teacherSchool) return Response.json({ attempts: [] }, { headers: { "Cache-Control": "no-store" } });
    const rows = await base.where(and(eq(users.role, "student"), inArray(users.grade, grades), eq(users.school, teacherSchool))).orderBy(desc(attempts.submittedAt)).limit(1000);
    return Response.json({ attempts: rows.map(publicAttempt) }, { headers: { "Cache-Control": "no-store" } });
  }

  let userId = current.user.id;
  if (requestedUser) {
    if (current.user.role !== "teacher" && current.user.role !== "admin") return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
    const [reviewedUser] = await getDb().select({ id: users.id, role: users.role, grade: users.grade }).from(users).where(eq(users.email, requestedUser.trim().toLowerCase())).limit(1);
    if (!reviewedUser || reviewedUser.role !== "student") return Response.json({ error: "მოსწავლე ვერ მოიძებნა" }, { status: 404 });
    if (current.user.role === "teacher") {
      if (!current.user.school || String(reviewedUser.grade ?? "") === "") return Response.json({ error: "ამ მოსწავლის შედეგებზე წვდომა არ გაქვთ" }, { status: 403 });
      const [sameSchool] = await getDb().select({ id: users.id }).from(users).where(and(eq(users.id, reviewedUser.id), eq(users.school, current.user.school))).limit(1);
      if (!sameSchool) return Response.json({ error: "ამ მოსწავლის შედეგებზე წვდომა არ გაქვთ" }, { status: 403 });
      const [teacherScope] = await getDb().select({ id: assignments.id }).from(assignments)
        .where(and(eq(assignments.createdBy, current.user.id), eq(assignments.grade, String(reviewedUser.grade ?? "")))).limit(1);
      if (!teacherScope) return Response.json({ error: "ამ მოსწავლის შედეგებზე წვდომა არ გაქვთ" }, { status: 403 });
    }
    userId = reviewedUser.id;
  }
  const rows = await getDb().select().from(attempts).where(eq(attempts.userId, userId)).orderBy(desc(attempts.submittedAt)).limit(250);
  return Response.json({ attempts: rows.map(row => ({ ...row, result: parseResult(row.answersJson) })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const body = await request.json() as { assessmentMode?: string; testId?: string; earned?: number; totalPts?: number; pct?: number; result?: unknown };
  if (body.assessmentMode !== "practice") return Response.json({ error: "დაცული შეფასებითი ტესტი სერვერზე უნდა შემოწმდეს" }, { status: 409 });
  const earned = Number(body.earned); const totalPts = Number(body.totalPts); const pct = Number(body.pct);
  const expectedPct = Math.round((earned / totalPts) * 100);
  if (!body.testId || body.testId.length > 160 || !Number.isFinite(earned) || !Number.isFinite(totalPts) || !Number.isFinite(pct) || totalPts <= 0 || earned < 0 || earned > totalPts || pct < 0 || pct > 100 || Math.abs(Math.round(pct) - expectedPct) > 1) return Response.json({ error: "არასწორი შედეგი" }, { status: 400 });
  const safeResult = body.result && typeof body.result === "object" ? body.result as Record<string, unknown> : {};
  const practiceResult = { ...safeResult, assessmentMode: "practice", verified: false };
  const encoded = JSON.stringify(practiceResult);
  if (encoded.length > 250_000) return Response.json({ error: "შედეგის მონაცემი ზედმეტად დიდია" }, { status: 413 });
  const row = { id: crypto.randomUUID(), userId: current.user.id, testId: body.testId, score: Math.round(earned), maxScore: Math.round(totalPts), percentage: Math.round(pct), answersJson: encoded, submittedAt: new Date() };
  await getDb().insert(attempts).values(row);
  return Response.json({ attempt: { ...row, assessmentMode: "practice", verified: false } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const email = (new URL(request.url).searchParams.get("userId") ?? "").trim().toLowerCase();
  const [target] = await getDb().select({ id: users.id, email: users.email, role: users.role }).from(users).where(eq(users.email, email)).limit(1);
  if (!target || target.role !== "student") return Response.json({ error: "მოსწავლე ვერ მოიძებნა" }, { status: 404 });
  const removed = await getDb().delete(attempts).where(eq(attempts.userId, target.id)).returning({ id: attempts.id });
  await getDb().insert(adminAuditEvents).values({ id: crypto.randomUUID(), adminId: current.user.id, action: "შედეგების წაშლა", details: `${email}: ${removed.length} ჩანაწერი`, createdAt: new Date() });
  return Response.json({ ok: true, deleted: removed.length });
}
