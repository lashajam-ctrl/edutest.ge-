import { and, eq, gt } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import { appOrigin, sha256 } from "@/lib/auth";

function redirect(request: Request, status: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${appOrigin(request)}/?email-verification=${encodeURIComponent(status)}`, "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 200) return redirect(request, "invalid");
  await ensureSchema();
  const db = getDb();
  const [record] = await db.select({ verification: emailVerifications, user: users }).from(emailVerifications)
    .innerJoin(users, eq(users.id, emailVerifications.userId))
    .where(and(eq(emailVerifications.tokenHash, await sha256(token)), gt(emailVerifications.expiresAt, new Date())))
    .limit(1);
  if (!record) return redirect(request, "invalid");

  const emailStillMatches = record.verification.purpose === "primary"
    ? record.user.email === record.verification.email
    : record.user.parentEmail === record.verification.email;
  if (!emailStillMatches) {
    await db.delete(emailVerifications).where(eq(emailVerifications.id, record.verification.id));
    return redirect(request, "invalid");
  }

  await db.update(users).set(record.verification.purpose === "primary"
    ? { emailVerified: true, updatedAt: new Date() }
    : { parentEmailVerified: true, updatedAt: new Date() }
  ).where(eq(users.id, record.user.id));
  await db.delete(emailVerifications).where(eq(emailVerifications.id, record.verification.id));
  return redirect(request, record.verification.purpose);
}
