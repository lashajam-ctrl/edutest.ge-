import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin(request: Request) {
  const current = await getSessionUser(request);
  return current?.user.role === "admin" ? current : null;
}

export async function GET(request: Request) {
  const current = await requireAdmin(request);
  if (!current) return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const rows = await getDb().select({ id: users.id, email: users.email, name: users.name, role: users.role, grade: users.grade, school: users.school, emailVerified: users.emailVerified, createdAt: users.createdAt }).from(users).orderBy(asc(users.createdAt));
  return Response.json({ users: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const current = await requireAdmin(request);
  if (!current) return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  const body = await request.json() as { email?: string; role?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role;
  if (!/^\S+@\S+\.\S+$/.test(email) || !["student", "teacher", "pending_teacher"].includes(role ?? "")) return Response.json({ error: "არასწორი ცვლილება" }, { status: 400 });
  const [target] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!target || target.role === "admin") return Response.json({ error: "მომხმარებელი ვერ შეიცვალა" }, { status: 400 });
  await getDb().update(users).set({ role: role as "student" | "teacher" | "pending_teacher", updatedAt: new Date() }).where(eq(users.id, target.id));
  return Response.json({ user: { ...target, role } });
}

export async function DELETE(request: Request) {
  const current = await requireAdmin(request);
  if (!current) return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  const [target] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!target || target.role === "admin" || target.id === current.user.id) return Response.json({ error: "მომხმარებელი ვერ წაიშლება" }, { status: 400 });
  await getDb().delete(users).where(eq(users.id, target.id));
  return Response.json({ ok: true });
}
