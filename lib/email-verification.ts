import { env } from "cloudflare:workers";
import { and, eq, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { emailVerificationRequests, users } from "@/db/schema";
import { appOrigin, randomToken, sha256 } from "@/lib/auth";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export async function createAndSendEmailVerification(request: Request, user: typeof users.$inferSelect) {
  await ensureSchema();
  const runtime = env as unknown as Record<string, string>;
  if (!runtime.RESEND_API_KEY) throw new Error("Email verification service is not configured");
  const db = getDb();
  const now = new Date();
  await db.delete(emailVerificationRequests).where(and(eq(emailVerificationRequests.userId, user.id), isNull(emailVerificationRequests.usedAt)));
  const token = randomToken(32);
  await db.insert(emailVerificationRequests).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: await sha256(token),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    usedAt: null,
    createdAt: now,
  });
  const verificationUrl = `${appOrigin(request)}/api/auth/email/confirm?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "EduTest.ge <results@edutest.ge>",
      to: [user.email],
      subject: "EduTest.ge — ელფოსტის დადასტურება",
      text: `${user.name || "მომხმარებელო"}, ანგარიშის დასადასტურებლად გახსენით ეს ბმული: ${verificationUrl}\n\nბმული მოქმედებს 24 საათი.`,
      html: `<p>გამარჯობა, ${escapeHtml(user.name || "მომხმარებელო")}.</p><p><a href="${escapeHtml(verificationUrl)}">დაადასტურეთ EduTest.ge ანგარიში</a></p><p>ბმული მოქმედებს 24 საათი. თუ ანგარიში თქვენ არ შეგიქმნიათ, წერილი უგულებელყავით.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Verification email failed (${response.status})`);
}
