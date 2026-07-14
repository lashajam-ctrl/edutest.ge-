import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { attempts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const url = new URL(request.url);
  const requestedUser = url.searchParams.get("userId");
  const canReview = current.user.role === "teacher" || current.user.role === "admin";
  const userId = requestedUser && canReview ? requestedUser : current.user.id;
  const rows = await getDb().select().from(attempts).where(eq(attempts.userId, userId)).orderBy(desc(attempts.submittedAt)).limit(250);
  return Response.json({ attempts: rows.map(row => ({ ...row, result: JSON.parse(row.answersJson) })) });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const body = await request.json() as { testId?: string; earned?: number; totalPts?: number; pct?: number; result?: unknown };
  const earned = Number(body.earned); const totalPts = Number(body.totalPts); const pct = Number(body.pct);
  if (!body.testId || !Number.isFinite(earned) || !Number.isFinite(totalPts) || totalPts <= 0 || earned < 0 || earned > totalPts || pct < 0 || pct > 100) return Response.json({ error: "არასწორი შედეგი" }, { status: 400 });
  const row = { id: crypto.randomUUID(), userId: current.user.id, testId: body.testId, score: Math.round(earned), maxScore: Math.round(totalPts), percentage: Math.round(pct), answersJson: JSON.stringify(body.result ?? {}), submittedAt: new Date() };
  await getDb().insert(attempts).values(row);
  return Response.json({ attempt: row }, { status: 201 });
}
