import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import { appOrigin, randomToken, sha256 } from "@/lib/auth";

export type VerificationPurpose = "primary" | "parent";
export type EmailSendState = "sent" | "unconfigured" | "failed";

function runtimeEnv() {
  return env as unknown as Record<string, string | undefined>;
}

export function notificationEmailConfigured() {
  const runtime = runtimeEnv();
  return Boolean(runtime.RESEND_API_KEY?.trim() && runtime.RESULT_EMAIL_FROM?.trim());
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(input: { to: string; subject: string; text: string; html: string }): Promise<EmailSendState> {
  const runtime = runtimeEnv();
  const apiKey = runtime.RESEND_API_KEY?.trim();
  const from = runtime.RESULT_EMAIL_FROM?.trim();
  if (!apiKey || !from) return "unconfigured";
  if (!validEmail(input.to)) return "failed";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    });
    if (!response.ok) {
      console.error("Result email provider rejected the request", response.status);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Result email delivery failed", error instanceof Error ? error.message : "unknown error");
    return "failed";
  }
}

export async function issueEmailVerification(input: {
  userId: string;
  email: string;
  purpose: VerificationPurpose;
  request: Request;
}) {
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) return { state: "failed" as const };

  const db = getDb();
  const token = randomToken(36);
  const now = new Date();
  await db.delete(emailVerifications).where(and(
    eq(emailVerifications.userId, input.userId),
    eq(emailVerifications.purpose, input.purpose),
  ));
  await db.insert(emailVerifications).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    email,
    purpose: input.purpose,
    tokenHash: await sha256(token),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    createdAt: now,
  });

  const verifyUrl = `${appOrigin(input.request)}/api/auth/email/verify?token=${encodeURIComponent(token)}`;
  const recipient = input.purpose === "parent" ? "მშობლის" : "თქვენი";
  const state = await sendEmail({
    to: email,
    subject: "დაადასტურეთ ელფოსტა — EduTest.ge",
    text: `${recipient} ელფოსტის EduTest.ge-სთან დასაკავშირებლად გახსენით ეს ბმული (მოქმედებს 24 საათი): ${verifyUrl}\n\nთუ ეს მოთხოვნა თქვენ არ გაგიკეთებიათ, წერილი უგულებელყავით.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2 style="color:#4338ca">EduTest.ge</h2><p>${recipient} ელფოსტის დასადასტურებლად დააჭირეთ ღილაკს. მხოლოდ დადასტურების შემდეგ დაიწყება შედეგების გამოგზავნა.</p><p style="margin:28px 0"><a href="${escapeHtml(verifyUrl)}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">ელფოსტის დადასტურება</a></p><p style="font-size:13px;color:#64748b">ბმული მოქმედებს 24 საათი. თუ ეს მოთხოვნა თქვენ არ გაგიკეთებიათ, წერილი უგულებელყავით.</p></div>`,
  });
  return { state };
}

type NotificationState = EmailSendState | "disabled" | "unverified" | "not_set";

function resultValue(result: unknown, key: string, fallback = "") {
  if (!result || typeof result !== "object") return fallback;
  const value = (result as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value).slice(0, 160) : fallback;
}

export async function sendAttemptResultEmails(input: {
  user: typeof users.$inferSelect;
  testId: string;
  score: number;
  maxScore: number;
  percentage: number;
  result: unknown;
}): Promise<{ student: NotificationState; parent: NotificationState }> {
  const title = resultValue(input.result, "title", input.testId);
  const subject = resultValue(input.result, "subject", "სასწავლო ტესტი");
  const grade = resultValue(input.result, "grade", input.user.grade ?? "");
  const correct = resultValue(input.result, "correct");
  const total = resultValue(input.result, "total");
  const date = new Intl.DateTimeFormat("ka-GE", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tbilisi" }).format(new Date());
  const correctLine = correct && total ? `სწორი პასუხები: ${correct}/${total}\n` : "";
  const plain = `EduTest.ge — ტესტის შედეგი\n\nმოსწავლე: ${input.user.name}\nტესტი: ${title}\nსაგანი: ${subject}${grade ? `\nკლასი: ${grade}` : ""}\nქულა: ${input.score}/${input.maxScore}\nშედეგი: ${input.percentage}%\n${correctLine}თარიღი: ${date}\n\nდეტალური განხილვა ხელმისაწვდომია მოსწავლის დაცულ პროფილში.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><h2 style="color:#4338ca">EduTest.ge — ტესტის შედეგი</h2><p><strong>მოსწავლე:</strong> ${escapeHtml(input.user.name)}</p><div style="background:#f1f5ff;border:1px solid #c7d2fe;border-radius:14px;padding:18px"><p style="margin:0 0 8px"><strong>${escapeHtml(title)}</strong></p><p style="margin:4px 0">საგანი: ${escapeHtml(subject)}${grade ? ` · კლასი: ${escapeHtml(grade)}` : ""}</p><p style="font-size:24px;font-weight:800;color:#4338ca;margin:14px 0">${input.percentage}%</p><p style="margin:4px 0">ქულა: ${input.score}/${input.maxScore}${correct && total ? ` · სწორი პასუხები: ${escapeHtml(correct)}/${escapeHtml(total)}` : ""}</p></div><p style="font-size:13px;color:#64748b">${escapeHtml(date)} · დეტალური განხილვა ხელმისაწვდომია მოსწავლის დაცულ პროფილში.</p></div>`;

  const studentPromise: Promise<NotificationState> = !input.user.resultEmailEnabled
    ? Promise.resolve("disabled")
    : !input.user.emailVerified
      ? Promise.resolve("unverified")
      : sendEmail({ to: input.user.email, subject: `ტესტის შედეგი: ${title}`, text: plain, html });

  const parentPromise: Promise<NotificationState> = !input.user.parentEmail
    ? Promise.resolve("not_set")
    : !input.user.parentResultEmailEnabled
      ? Promise.resolve("disabled")
      : !input.user.parentEmailVerified
        ? Promise.resolve("unverified")
        : sendEmail({ to: input.user.parentEmail, subject: `${input.user.name} — ტესტის შედეგი: ${title}`, text: plain, html });

  const [student, parent] = await Promise.all([studentPromise, parentPromise]);
  return { student, parent };
}
