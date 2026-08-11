import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { guardianConsentRequests, users } from "@/db/schema";
import { appOrigin, randomToken, sha256 } from "@/lib/auth";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

async function deliverGuardianEmail(request: Request, guardianEmail: string, childName: string, token: string) {
  const runtime = env as unknown as Record<string, string>;
  if (!runtime.RESEND_API_KEY) throw new Error("Guardian email service is not configured");
  const confirmationUrl = `${appOrigin(request)}/api/auth/guardian/confirm?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "EduTest.ge <results@edutest.ge>",
      to: [guardianEmail],
      subject: "EduTest.ge — მშობლის/წარმომადგენლის თანხმობა",
      text: `${childName}-ის EduTest.ge ანგარიშის დასადასტურებლად გახსენით ეს ბმული: ${confirmationUrl}\n\nთუ ეს მოთხოვნა თქვენ არ გაგიკეთებიათ, უგულებელყავით წერილი.`,
      html: `<p>გამარჯობა,</p><p><strong>${escapeHtml(childName)}</strong>-ის EduTest.ge ანგარიშისთვის საჭიროა მშობლის ან კანონიერი წარმომადგენლის თანხმობა.</p><p><a href="${escapeHtml(confirmationUrl)}">თანხმობის დადასტურება</a></p><p>თუ ეს მოთხოვნა თქვენ არ გაგიკეთებიათ, უგულებელყავით წერილი.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Guardian email delivery failed (${response.status})`);
}

export async function createAndSendGuardianConsent(request: Request, user: typeof users.$inferSelect, guardianEmail: string) {
  await ensureSchema();
  const db = getDb();
  const now = new Date();
  await db.update(guardianConsentRequests).set({ status: "expired" }).where(and(eq(guardianConsentRequests.childUserId, user.id), eq(guardianConsentRequests.status, "pending")));
  const token = randomToken(32);
  await db.insert(guardianConsentRequests).values({
    id: crypto.randomUUID(),
    childUserId: user.id,
    guardianEmail,
    tokenHash: await sha256(token),
    status: "pending",
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    acceptedAt: null,
  });
  await deliverGuardianEmail(request, guardianEmail, user.name, token);
}

export async function resendLatestGuardianConsent(request: Request, user: typeof users.$inferSelect) {
  const [latest] = await getDb().select().from(guardianConsentRequests)
    .where(and(eq(guardianConsentRequests.childUserId, user.id), eq(guardianConsentRequests.status, "pending")))
    .orderBy(desc(guardianConsentRequests.createdAt)).limit(1);
  const email = latest?.guardianEmail ?? user.guardianEmail;
  if (!email) throw new Error("Guardian email is missing");
  await createAndSendGuardianConsent(request, user, email);
}
