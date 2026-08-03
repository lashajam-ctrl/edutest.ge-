import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { adminAuditEvents, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin(request: Request) {
  const current = await getSessionUser(request);
  return current?.user.role === "admin" ? current : null;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";
}

async function audit(adminId: string, action: string, details: string) {
  await getDb().insert(adminAuditEvents).values({
    id: crypto.randomUUID(), adminId, action, details: details.slice(0, 1000), createdAt: new Date(),
  });
}

export async function GET(request: Request) {
  const current = await requireAdmin(request);
  if (!current) return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const rows = await getDb().select({
    id: users.id, email: users.email, name: users.name, role: users.role,
    grade: users.grade, school: users.school, emailVerified: users.emailVerified, createdAt: users.createdAt,
  }).from(users).orderBy(asc(users.createdAt));
  return Response.json({ users: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const current = await requireAdmin(request);
  if (!current) return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const body = await request.json() as { email?: string; newEmail?: string; name?: string; role?: string; grade?: string | number | null; school?: string | null };
  const email = cleanText(body.email, 254).toLowerCase();
  const [target] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!target || target.role === "admin") return Response.json({ error: "მომხმარებელი ვერ შეიცვლება" }, { status: 400 });
  const newEmail = cleanText(body.newEmail ?? body.email, 254).toLowerCase();
  const name = body.name === undefined ? target.name : cleanText(body.name, 100);
  const school = body.school === undefined ? cleanText(target.school, 160) : cleanText(body.school, 160);
  const role = body.role === undefined ? target.role : cleanText(body.role, 32);
  const grade = body.grade === undefined ? target.grade : body.grade === null || body.grade === "" ? null : String(body.grade).trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\S+@\S+\.\S+$/.test(newEmail) || !name) {
    return Response.json({ error: "სახელი და სწორი ელფოსტა სავალდებულოა" }, { status: 400 });
  }
  if (!["student", "teacher", "pending_teacher"].includes(role)) return Response.json({ error: "როლის მინიჭება დაუშვებელია" }, { status: 400 });
  if (grade !== null && !/^([1-9]|1[0-2])$/.test(grade)) return Response.json({ error: "კლასი უნდა იყოს 1-დან 12-მდე" }, { status: 400 });
  if (newEmail !== email) {
    const [duplicate] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, newEmail)).limit(1);
    if (duplicate) return Response.json({ error: "ეს ელფოსტა უკვე გამოყენებულია" }, { status: 409 });
  }
  const now = new Date();
  await getDb().update(users).set({
    email: newEmail, name, role: role as "student" | "teacher" | "pending_teacher",
    grade: role === "student" ? grade : null, school: school || null, updatedAt: now,
  }).where(eq(users.id, target.id));
  await audit(current.user.id, "მომხმარებლის რედაქტირება", `${email} → ${newEmail}; როლი=${role}; კლასი=${grade ?? "—"}`);
  const [updated] = await getDb().select({
    id: users.id, email: users.email, name: users.name, role: users.role,
    grade: users.grade, school: users.school, emailVerified: users.emailVerified, createdAt: users.createdAt,
  }).from(users).where(eq(users.id, target.id)).limit(1);
  return Response.json({ user: updated });
}

export async function DELETE(request: Request) {
  const current = await requireAdmin(request);
  if (!current) return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const email = cleanText(new URL(request.url).searchParams.get("email"), 254).toLowerCase();
  const [target] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!target || target.role === "admin" || target.id === current.user.id) return Response.json({ error: "მომხმარებელი ვერ წაიშლება" }, { status: 400 });
  await audit(current.user.id, "მომხმარებლის წაშლა", `${target.email} (${target.role})`);
  await getDb().delete(users).where(eq(users.id, target.id));
  return Response.json({ ok: true });
}
