import { env } from "cloudflare:workers";
import { and, eq, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { passwordResetRequests, users } from "@/db/schema";
import { appOrigin, randomToken, sha256 } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const genericResponse = { message: "თუ ეს ანგარიში არსებობს, პაროლის აღდგენის ბმული ელფოსტაზე გაიგზავნა." };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

async function sendD1Reset(request: Request, email: string, name: string, token: string) {
  const runtime = env as unknown as Record<string, string>;
  if (!runtime.RESEND_API_KEY) throw new Error("Email service unavailable");
  const resetUrl = `${appOrigin(request)}/?reset=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "EduTest.ge <results@edutest.ge>",
      to: [email],
      subject: "EduTest.ge — პაროლის აღდგენა",
      text: `${name || "მომხმარებელო"}, ახალი პაროლის დასაყენებლად გახსენით ეს ბმული: ${resetUrl}\n\nბმული მოქმედებს 30 წუთი. თუ მოთხოვნა თქვენ არ გაგიკეთებიათ, უგულებელყავით წერილი.`,
      html: `<p>გამარჯობა, ${escapeHtml(name || "მომხმარებელო")}.</p><p><a href="${escapeHtml(resetUrl)}">ახალი პაროლის დაყენება</a></p><p>ბმული მოქმედებს 30 წუთი. თუ მოთხოვნა თქვენ არ გაგიკეთებიათ, უგულებელყავით წერილი.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Reset email failed (${response.status})`);
}

async function requestLegacySupabaseReset(request: Request, email: string) {
  const runtime = env as unknown as Record<string, string>;
  const url = runtime.SUPABASE_URL?.replace(/\/$/, "");
  const key = runtime.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(appOrigin(request))}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json(genericResponse, { headers: { "Cache-Control": "no-store" } });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limit = await consumeRateLimit(`password-reset:${await sha256(`${ip}|${email}`)}`, 3, 60 * 60_000);
  if (!limit.allowed) return Response.json(genericResponse, { headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfter) } });

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.passwordHash) {
    try { await requestLegacySupabaseReset(request, email); } catch { /* Keep the anti-enumeration response identical. */ }
    return Response.json(genericResponse, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const now = new Date();
    await db.delete(passwordResetRequests).where(and(eq(passwordResetRequests.userId, user.id), isNull(passwordResetRequests.usedAt)));
    const token = randomToken(32);
    await db.insert(passwordResetRequests).values({
      id: crypto.randomUUID(), userId: user.id, tokenHash: await sha256(token),
      expiresAt: new Date(now.getTime() + 30 * 60_000), usedAt: null, createdAt: now,
    });
    await sendD1Reset(request, user.email, user.name, token);
  } catch {
    // Never disclose whether an account or a delivery failure exists.
  }
  return Response.json(genericResponse, { headers: { "Cache-Control": "no-store" } });
}
