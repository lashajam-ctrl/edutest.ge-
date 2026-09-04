import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, publicUser, sha256 } from "@/lib/auth";
import { createAndSendEmailVerification } from "@/lib/email-verification";
import { createAndSendGuardianConsent } from "@/lib/guardian-consent";
import { consumeRateLimit } from "@/lib/rate-limit";

function ageFrom(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const dob = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const month = now.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json().catch(() => ({})) as Record<string, string>;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim().slice(0, 100);
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !name) return Response.json({ error: "შეავსეთ სახელი, სწორი ელფოსტა და მინიმუმ 10-სიმბოლოიანი პაროლი" }, { status: 400 });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limit = await consumeRateLimit(`auth-register:${await sha256(`${ip}|${email}`)}`, 5, 60 * 60_000);
  if (!limit.allowed) return Response.json({ error: "რეგისტრაციის ბევრი მცდელობაა. ცოტა ხანში ისევ სცადეთ." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });

  const role = body.role === "teacher" ? "pending_teacher" as const : "student" as const;
  const grade = (body.grade ?? "").trim();
  const school = (body.school ?? "").trim().slice(0, 120) || null;
  const birthDate = (body.birthDate ?? "").trim();
  const guardianEmail = (body.guardianEmail ?? "").trim().toLowerCase();
  const termsVersion = (body.termsVersion ?? "").trim().slice(0, 100);
  const privacyVersion = (body.privacyVersion ?? "").trim().slice(0, 100);
  if (!termsVersion || !privacyVersion) return Response.json({ error: "წესებისა და კონფიდენციალურობის დადასტურება აუცილებელია" }, { status: 400 });
  let age: number | null = null;
  if (role === "student") {
    if (!/^(?:[1-9]|1[0-2])[A-Za-zა-ჰ]?$/.test(grade)) return Response.json({ error: "აირჩიეთ სწორი კლასი" }, { status: 400 });
    age = ageFrom(birthDate);
    if (age === null || age < 5 || age > 100) return Response.json({ error: "დაბადების თარიღი არასწორია" }, { status: 400 });
    if (age < 16 && (!/^\S+@\S+\.\S+$/.test(guardianEmail) || guardianEmail === email)) {
      return Response.json({ error: "16 წლამდე მოსწავლისთვის საჭიროა წარმომადგენლის განსხვავებული ელფოსტა" }, { status: 400 });
    }
  }
  const db = getDb();
  if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0]) return Response.json({ error: "ეს ელფოსტა უკვე რეგისტრირებულია" }, { status: 409 });
  const passwordData = await hashPassword(password);
  const now = new Date();
  const user = {
    id: crypto.randomUUID(), email, name, role, grade: role === "student" ? grade : null, school,
    birthDate: role === "student" ? birthDate : null,
    guardianEmail: role === "student" && age !== null && age < 16 ? guardianEmail : null,
    guardianVerifiedAt: role === "student" && age !== null && age < 16 ? null : now,
    termsVersion, privacyVersion, profileCompletedAt: now,
    passwordHash: passwordData.hash, passwordSalt: passwordData.salt,
    emailVerified: false, accountStatus: "email_pending", createdAt: now, updatedAt: now,
  };
  await db.insert(users).values(user);
  const session = await createSession(user.id, request);
  let emailSent = false;
  try { await createAndSendEmailVerification(request, user); emailSent = true; } catch { emailSent = false; }
  let guardianEmailSent = false;
  if (role === "student" && age !== null && age < 16 && guardianEmail) {
    try { await createAndSendGuardianConsent(request, user, guardianEmail); guardianEmailSent = true; } catch { guardianEmailSent = false; }
  }
  return Response.json({ user: publicUser(user), emailSent, guardianEmailSent }, { status: 201, headers: { "Set-Cookie": session.cookie, "Cache-Control": "no-store" } });
}
