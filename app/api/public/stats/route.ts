import { avg, count, countDistinct, eq, gte } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { assessmentQuestions, assessmentTests, attempts, users } from "@/db/schema";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  const tbilisiOffsetMs = 4 * 60 * 60 * 1000;
  const tbilisiNow = new Date(Date.now() + tbilisiOffsetMs);
  tbilisiNow.setUTCHours(0, 0, 0, 0);
  const startOfToday = new Date(tbilisiNow.getTime() - tbilisiOffsetMs);
  const [[today], [excellent], [average], [students], [questions], [tests], [subjects]] = await Promise.all([
    db.select({ value: count() }).from(attempts).where(gte(attempts.submittedAt, startOfToday)),
    db.select({ value: count() }).from(attempts).where(gte(attempts.percentage, 90)),
    db.select({ value: avg(attempts.percentage) }).from(attempts),
    db.select({ value: count() }).from(users).where(eq(users.role, "student")),
    db.select({ value: count() }).from(assessmentQuestions).where(eq(assessmentQuestions.active, true)),
    db.select({ value: count() }).from(assessmentTests).where(eq(assessmentTests.published, true)),
    db.select({ value: countDistinct(assessmentQuestions.subject) }).from(assessmentQuestions).where(eq(assessmentQuestions.active, true)),
  ]);
  return Response.json({
    todayTests: Number(today?.value ?? 0),
    excellentBadges: Number(excellent?.value ?? 0),
    averageScore: Math.round(Number(average?.value ?? 0)),
    students: Number(students?.value ?? 0),
    questions: Number(questions?.value ?? 0),
    tests: Number(tests?.value ?? 0),
    subjects: Number(subjects?.value ?? 0),
  }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
}
