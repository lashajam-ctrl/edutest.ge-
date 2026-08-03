import { and, asc, eq, inArray } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { assignments, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (!["teacher", "admin"].includes(current.user.role)) return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
  await ensureSchema();
  const selection = { id: users.id, email: users.email, name: users.name, grade: users.grade, school: users.school, createdAt: users.createdAt };
  if (current.user.role === "admin") {
    const rows = await getDb().select(selection).from(users).where(eq(users.role, "student")).orderBy(asc(users.name));
    return Response.json({ students: rows }, { headers: { "Cache-Control": "no-store" } });
  }
  const owned = await getDb().select({ grade: assignments.grade }).from(assignments).where(eq(assignments.createdBy, current.user.id));
  const grades = [...new Set(owned.map(row => String(row.grade)).filter(Boolean))];
  const school = String(current.user.school ?? "").trim();
  if (!grades.length || !school) return Response.json({ students: [] }, { headers: { "Cache-Control": "no-store" } });
  const rows = await getDb().select(selection).from(users).where(and(inArray(users.grade, grades), eq(users.school, school))).orderBy(asc(users.name));
  return Response.json({ students: rows }, { headers: { "Cache-Control": "no-store" } });
}
