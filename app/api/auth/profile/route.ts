import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser, hashPassword, publicUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const body = await request.json() as { name?: string; password?: string; grade?: string };
  const name = (body.name ?? current.user.name).trim();
  if (!name) return Response.json({ error: "სახელი აუცილებელია" }, { status: 400 });
  const changes: Partial<typeof users.$inferInsert> = { name, updatedAt: new Date() };
  if (body.password) {
    if (body.password.length < 10) return Response.json({ error: "პაროლი მინიმუმ 10 სიმბოლო უნდა იყოს" }, { status: 400 });
    const passwordData = await hashPassword(body.password);
    changes.passwordHash = passwordData.hash;
    changes.passwordSalt = passwordData.salt;
  }
  if (current.user.role === "student" && /^(?:[1-9]|1[0-2])[A-Za-zა-ჰ]?$/.test(body.grade ?? "")) changes.grade = body.grade;
  await getDb().update(users).set(changes).where(eq(users.id, current.user.id));
  const [updated] = await getDb().select().from(users).where(eq(users.id, current.user.id)).limit(1);
  return Response.json({ user: publicUser(updated) });
}
