import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assignments } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const rows = await getDb().select().from(assignments).orderBy(desc(assignments.createdAt)).limit(250);
  const visible = current.user.role === "student" ? rows.filter(row => String(row.grade) === String(current.user.grade)) : rows;
  return Response.json({ assignments: visible });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role !== "teacher" && current.user.role !== "admin") return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
  const body = await request.json() as { testId?: string; grade?: string; deadline?: string; note?: string };
  if (!body.testId || !body.grade) return Response.json({ error: "ტესტი და კლასი აუცილებელია" }, { status: 400 });
  const row = { id: crypto.randomUUID(), createdBy: current.user.id, testId: body.testId, grade: String(body.grade), deadline: body.deadline || null, note: body.note?.slice(0, 500) || null, createdAt: new Date() };
  await getDb().insert(assignments).values(row);
  return Response.json({ assignment: row }, { status: 201 });
}

export async function DELETE(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role !== "teacher" && current.user.role !== "admin") return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id აუცილებელია" }, { status: 400 });
  const condition = current.user.role === "admin"
    ? eq(assignments.id, id)
    : and(eq(assignments.id, id), eq(assignments.createdBy, current.user.id));
  const [owned] = await getDb().select({ id: assignments.id }).from(assignments).where(condition).limit(1);
  if (!owned) return Response.json({ error: "დავალება ვერ მოიძებნა" }, { status: 404 });
  await getDb().delete(assignments).where(condition);
  return Response.json({ ok: true });
}
