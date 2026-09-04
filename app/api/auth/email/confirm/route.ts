import { and, eq, gt, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { emailVerificationRequests, users } from "@/db/schema";
import { appOrigin, sha256 } from "@/lib/auth";

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
  const now = new Date();
  await db.batch([
    db.update(emailVerificationRequests).set({ usedAt: now }).where(eq(emailVerificationRequests.id, pending.id)),
    db.update(users).set({ emailVerified: true, accountStatus: "active", updatedAt: now }).where(eq(users.id, pending.userId)),
  ]);
  return Response.redirect(`${origin}/?email=verified`, 302);
}
