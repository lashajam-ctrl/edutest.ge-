import { and, eq, gt } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { emailVerifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { issueEmailVerification, notificationEmailConfigured, type VerificationPurpose } from "@/lib/email";

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { purpose?: VerificationPurpose };
  const purpose: VerificationPurpose = body.purpose === "parent" ? "parent" : "primary";
  const email = purpose === "parent" ? current.user.parentEmail : current.user.email;
  if (purpose === "parent" && current.user.role !== "student") return Response.json({ error: "ეს მოქმედება მხოლოდ მოსწავლის პროფილისთვისაა" }, { status: 403 });
  if (!email) return Response.json({ error: "ელფოსტა ჯერ არ არის დამატებული" }, { status: 400 });
  if ((purpose === "primary" && current.user.emailVerified) || (purpose === "parent" && current.user.parentEmailVerified)) {
    return Response.json({ state: "already_verified", emailDeliveryConfigured: notificationEmailConfigured() });
  }

  await ensureSchema();
  const [recent] = await getDb().select({ id: emailVerifications.id }).from(emailVerifications).where(and(
    eq(emailVerifications.userId, current.user.id),
    eq(emailVerifications.purpose, purpose),
    gt(emailVerifications.createdAt, new Date(Date.now() - 60_000)),
  )).limit(1);
  if (recent) return Response.json({ error: "ახალი წერილის მოთხოვნამდე ერთი წუთი მოიცადეთ" }, { status: 429 });

  const result = await issueEmailVerification({ userId: current.user.id, email, purpose, request });
  return Response.json({ state: result.state, emailDeliveryConfigured: notificationEmailConfigured() });
}
