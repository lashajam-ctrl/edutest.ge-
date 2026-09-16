import { and, eq, gt, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { emailVerificationRequests, users } from "@/db/schema";
import { appOrigin, sha256 } from "@/lib/auth";
import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  await ensureSchema();
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const origin = appOrigin(request);
  if (!token || token.length > 200) return Response.redirect(`${origin}/?email=invalid`, 302);
  const db = getDb();
  const [pending] = await db.select().from(emailVerificationRequests).where(and(
    eq(emailVerificationRequests.tokenHash, await sha256(token)),
    gt(emailVerificationRequests.expiresAt, new Date()),
    isNull(emailVerificationRequests.usedAt),
  )).limit(1);
  if (!pending) return Response.redirect(`${origin}/?email=invalid`, 302);
  const [user] = await db.select().from(users).where(eq(users.id,pending.userId)).limit(1);
  if(!user||!['active','onboarding','email_pending'].includes(user.accountStatus))return Response.redirect(`${origin}/?email=invalid`,302);
  const now = new Date();
  const writes=await env.DB.batch([
    env.DB.prepare('UPDATE email_verification_requests SET used_at=? WHERE id=? AND used_at IS NULL AND expires_at>?').bind(now.getTime(),pending.id,now.getTime()),
    env.DB.prepare(`UPDATE users SET email_verified=1,
      account_status=CASE WHEN account_status='email_pending' THEN CASE WHEN profile_completed_at IS NULL THEN 'onboarding' ELSE 'active' END ELSE account_status END,
      updated_at=? WHERE id=? AND account_status IN ('active','onboarding','email_pending') AND changes()=1`).bind(now.getTime(),pending.userId),
  ]);
  if(Number(writes[0]?.meta?.changes)!==1||Number(writes[1]?.meta?.changes)!==1)return Response.redirect(`${origin}/?email=invalid`,302);
  return Response.redirect(`${origin}/?email=verified`, 302);
}
