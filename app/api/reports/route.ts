import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { adminAuditEvents, issueReports, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const reportTypes = new Set(["wrong_answer", "bad_question", "typo", "other"]);
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const rows = await getDb().select({ report: issueReports, userEmail: users.email, userName: users.name })
    .from(issueReports).innerJoin(users, eq(issueReports.userId, users.id)).orderBy(desc(issueReports.createdAt)).limit(1000);
  return Response.json({ reports: rows.map(({ report, userEmail, userName }) => ({ ...report, userEmail, userName })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "რეპორტის გასაგზავნად ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  const type = clean(body.type, 40);
  const testId = clean(body.testId, 160);
  const questionId = clean(body.questionId, 160);
  const questionText = clean(body.questionText, 500);
  if (!reportTypes.has(type) || !testId || !questionId || !questionText) return Response.json({ error: "რეპორტის მონაცემები არასრულია" }, { status: 400 });
  const row = {
    id: crypto.randomUUID(), userId: current.user.id, testId, testTitle: clean(body.testTitle, 200),
    questionId, questionText, type, comment: clean(body.comment, 1000), resolved: false, createdAt: new Date(),
  };
  await getDb().insert(issueReports).values(row);
  return Response.json({ report: row }, { status: 201 });
}

export async function PATCH(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const body = await request.json() as { id?: string; resolved?: boolean };
  const id = clean(body.id, 100);
  if (!id || typeof body.resolved !== "boolean") return Response.json({ error: "არასწორი მოთხოვნა" }, { status: 400 });
  const updated = await getDb().update(issueReports).set({ resolved: body.resolved, resolvedBy: body.resolved ? current.user.id : null, resolvedAt: body.resolved ? new Date() : null }).where(eq(issueReports.id, id)).returning({ id: issueReports.id });
  if (!updated.length) return Response.json({ error: "რეპორტი ვერ მოიძებნა" }, { status: 404 });
  await getDb().insert(adminAuditEvents).values({ id: crypto.randomUUID(), adminId: current.user.id, action: body.resolved ? "რეპორტის დახურვა" : "რეპორტის ხელახლა გახსნა", details: id, createdAt: new Date() });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  await getDb().delete(issueReports);
  await getDb().insert(adminAuditEvents).values({ id: crypto.randomUUID(), adminId: current.user.id, action: "რეპორტების გასუფთავება", details: "ყველა რეპორტი წაიშალა", createdAt: new Date() });
  return Response.json({ ok: true });
}
