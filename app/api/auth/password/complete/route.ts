import { and, eq, gt, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { passwordResetRequests, users } from "@/db/schema";
import { env } from "cloudflare:workers";
import { createSession, hashPassword, publicUser, sha256 } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json().catch(() => ({})) as { token?: string; password?: string };
  const token = (body.token ?? "").trim();
  const password = body.password ?? "";
  if (!token || token.length > 200 || password.length < 10 || password.length > 200) return Response.json({ error: "ბმული არასწორია ან პაროლი 10 სიმბოლოზე მოკლეა" }, { status: 400 });
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
  if (!['active','onboarding','email_pending'].includes(user.accountStatus)) return Response.json({ error: "ანგარიში არ არის აქტიური" }, { status: 403 });

  const passwordData = await hashPassword(password);
  const now = new Date();
  const writes = await env.DB.batch([
    env.DB.prepare('UPDATE password_reset_requests SET used_at=? WHERE id=? AND used_at IS NULL AND expires_at>?').bind(now.getTime(),reset.id,now.getTime()),
    env.DB.prepare(`UPDATE users SET password_hash=?,password_salt=?,email_verified=1,
      account_status=CASE WHEN account_status='email_pending' THEN CASE WHEN profile_completed_at IS NULL THEN 'onboarding' ELSE 'active' END ELSE account_status END,
      updated_at=? WHERE id=? AND account_status IN ('active','onboarding','email_pending') AND changes()=1`)
      .bind(passwordData.hash,passwordData.salt,now.getTime(),user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND changes()=1').bind(user.id),
  ]);
  if(Number(writes[0]?.meta?.changes)!==1||Number(writes[1]?.meta?.changes)!==1)return Response.json({error:'ბმული უკვე გამოყენებულია ან ანგარიში აღარ არის აქტიური'},{status:409});
  const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const session = await createSession(user.id, request);
  return Response.json({ user: publicUser(updated) }, { headers: { "Set-Cookie": session.cookie, "Cache-Control": "no-store" } });
}
