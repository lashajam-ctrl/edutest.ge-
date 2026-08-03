import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assignments, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const rows = await getDb().select({ assignment: assignments, teacherSchool: users.school })
    .from(assignments).innerJoin(users, eq(assignments.createdBy, users.id)).orderBy(desc(assignments.createdAt)).limit(250);
  const visible = current.user.role === "student"
    ? rows.filter(row => String(row.assignment.grade) === String(current.user.grade) && !!current.user.school && row.teacherSchool === current.user.school).map(row => row.assignment)
    : current.user.role === "teacher"
      ? rows.filter(row => row.assignment.createdBy === current.user.id).map(row => row.assignment)
      : current.user.role === "admin" ? rows.map(row => row.assignment) : [];
  return Response.json({ assignments: visible });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role !== "teacher" && current.user.role !== "admin") return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
  if (current.user.role === "teacher" && !String(current.user.school ?? "").trim()) return Response.json({ error: "დავალების გასაგზავნად მასწავლებლის პროფილში სკოლა უნდა იყოს მითითებული" }, { status: 409 });
  const body = await request.json() as { testId?: string; grade?: string; deadline?: string; note?: string };
  const testId = String(body.testId ?? "").trim().slice(0, 160);
  const grade = String(body.grade ?? "").trim();
  const deadline = String(body.deadline ?? "").trim();
  const note = String(body.note ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 500);
  if (!testId || !/^([1-9]|1[0-2])$/.test(grade) || (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) return Response.json({ error: "ტესტი, კლასი ან ვადა არასწორია" }, { status: 400 });
  const row = { id: crypto.randomUUID(), createdBy: current.user.id, testId, grade, deadline: deadline || null, note: note || null, createdAt: new Date() };
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
