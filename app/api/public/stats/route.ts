import { avg, count, eq, gte } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { attempts, users } from "@/db/schema";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  const tbilisiOffsetMs = 4 * 60 * 60 * 1000;
  const tbilisiNow = new Date(Date.now() + tbilisiOffsetMs);
  tbilisiNow.setUTCHours(0, 0, 0, 0);
  const startOfToday = new Date(tbilisiNow.getTime() - tbilisiOffsetMs);
  const [[today], [excellent], [average], [students]] = await Promise.all([
    db.select({ value: count() }).from(attempts).where(gte(attempts.submittedAt, startOfToday)),
    db.select({ value: count() }).from(attempts).where(gte(attempts.percentage, 90)),
    db.select({ value: avg(attempts.percentage) }).from(attempts),
    db.select({ value: count() }).from(users).where(eq(users.role, "student")),
  ]);
  return Response.json({
    todayTests: Number(today?.value ?? 0),
    excellentBadges: Number(excellent?.value ?? 0),
    averageScore: Math.round(Number(average?.value ?? 0)),
    students: Number(students?.value ?? 0),
  }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
}
