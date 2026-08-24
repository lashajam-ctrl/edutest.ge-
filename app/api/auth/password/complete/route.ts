import { and, eq, gt, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { passwordResetRequests, sessions, users } from "@/db/schema";
import { createSession, hashPassword, publicUser, sha256 } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as { token?: string; password?: string };
  const token = (body.token ?? "").trim();
  const password = body.password ?? "";
  if (!token || password.length < 10) return Response.json({ error: "ბმული არასწორია ან პაროლი 10 სიმბოლოზე მოკლეა" }, { status: 400 });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limit = await consumeRateLimit(`password-complete:${await sha256(ip)}`, 8, 30 * 60_000);
  if (!limit.allowed) return Response.json({ error: "ბევრი მცდელობაა. ცოტა ხანში ისევ სცადეთ" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const db = getDb();
  const [reset] = await db.select().from(passwordResetRequests).where(and(
    eq(passwordResetRequests.tokenHash, await sha256(token)),
    gt(passwordResetRequests.expiresAt, new Date()),
    isNull(passwordResetRequests.usedAt),
  )).limit(1);
  if (!reset) return Response.json({ error: "ბმული არასწორია ან ვადაგასულია" }, { status: 400 });
  const [user] = await db.select().from(users).where(eq(users.id, reset.userId)).limit(1);
  if (!user) return Response.json({ error: "ბმული არასწორია ან ვადაგასულია" }, { status: 400 });

  const passwordData = await hashPassword(password);
  const now = new Date();
  await db.update(users).set({ passwordHash: passwordData.hash, passwordSalt: passwordData.salt, emailVerified: true, updatedAt: now }).where(eq(users.id, user.id));
  await db.update(passwordResetRequests).set({ usedAt: now }).where(eq(passwordResetRequests.id, reset.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const session = await createSession(user.id, request);
  return Response.json({ user: publicUser(updated) }, { headers: { "Set-Cookie": session.cookie, "Cache-Control": "no-store" } });
}
