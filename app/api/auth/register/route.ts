import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, publicUser } from "@/lib/auth";
import { issueEmailVerification, notificationEmailConfigured } from "@/lib/email";

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as Record<string, string>;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !name) return Response.json({ error: "შეავსეთ სახელი, სწორი ელფოსტა და მინიმუმ 10-სიმბოლოიანი პაროლი" }, { status: 400 });
  const db = getDb();
  if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0]) return Response.json({ error: "ეს ელფოსტა უკვე რეგისტრირებულია" }, { status: 409 });
  const passwordData = await hashPassword(password);
  const now = new Date();
  const user = { id: crypto.randomUUID(), email, name, role: body.role === "teacher" ? "pending_teacher" as const : "student" as const, grade: body.grade || null, school: body.school || null, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, emailVerified: false, createdAt: now, updatedAt: now };
  await db.insert(users).values(user);
  const emailVerification = await issueEmailVerification({ userId: user.id, email, purpose: "primary", request });
  const session = await createSession(user.id, request);
  return Response.json({ user: publicUser({ ...user, parentEmail: null, parentEmailVerified: false, resultEmailEnabled: true, parentResultEmailEnabled: true }), emailVerification: emailVerification.state, emailDeliveryConfigured: notificationEmailConfigured() }, { status: 201, headers: { "Set-Cookie": session.cookie } });
}
