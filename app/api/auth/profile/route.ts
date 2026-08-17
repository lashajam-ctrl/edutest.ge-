import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser, hashPassword, publicUser } from "@/lib/auth";
import { createAndSendGuardianConsent } from "@/lib/guardian-consent";

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

export async function PATCH(request: Request) {
  await ensureSchema();
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const body = await request.json() as { name?: string; password?: string; grade?: string; school?: string; requestedRole?: string; birthDate?: string; guardianEmail?: string; termsVersion?: string; privacyVersion?: string };
  const name = (body.name ?? current.user.name).trim();
  if (!name) return Response.json({ error: "სახელი აუცილებელია" }, { status: 400 });
  const changes: Partial<typeof users.$inferInsert> = { name, updatedAt: new Date() };
  if (body.password) {
    if (body.password.length < 10) return Response.json({ error: "პაროლი მინიმუმ 10 სიმბოლო უნდა იყოს" }, { status: 400 });
    const passwordData = await hashPassword(body.password);
    changes.passwordHash = passwordData.hash;
    changes.passwordSalt = passwordData.salt;
  }
  const requestedRole = body.requestedRole === "teacher" ? "pending_teacher" : "student";
  const completingProfile = !current.user.profileCompletedAt;
  if (completingProfile && (current.user.role === "student" || current.user.role === "pending_teacher")) changes.role = requestedRole;
  const effectiveRole = (changes.role ?? current.user.role) as string;
  const grade = (body.grade ?? current.user.grade ?? "").trim();
  if (effectiveRole === "student") {
    if (!/^(?:[1-9]|1[0-2])[A-Za-zა-ჰ]?$/.test(grade)) return Response.json({ error: "აირჩიეთ სწორი კლასი" }, { status: 400 });
    changes.grade = grade;
  } else {
    changes.grade = null;
  }
  if (body.school !== undefined) changes.school = body.school.trim().slice(0, 120) || null;
  if (body.birthDate !== undefined || (completingProfile && effectiveRole === "student")) {
    const birthDate = (body.birthDate ?? "").trim();
    const age = ageFrom(birthDate);
    if (age === null || age < (effectiveRole === "student" ? 5 : 18) || age > 100) return Response.json({ error: "დაბადების თარიღი არასწორია" }, { status: 400 });
    const guardianEmail = (body.guardianEmail ?? "").trim().toLowerCase();
    if (effectiveRole === "student" && age < 16 && (!/^\S+@\S+\.\S+$/.test(guardianEmail) || guardianEmail === current.user.email)) {
      return Response.json({ error: "16 წლამდე მოსწავლისთვის საჭიროა წარმომადგენლის განსხვავებული ელფოსტა" }, { status: 400 });
    }
    if (!(body.termsVersion ?? "").trim() || !(body.privacyVersion ?? "").trim()) return Response.json({ error: "წესებისა და კონფიდენციალურობის დადასტურება აუცილებელია" }, { status: 400 });
    changes.birthDate = birthDate;
    changes.guardianEmail = guardianEmail || null;
    changes.guardianVerifiedAt = effectiveRole === "student" && age < 16 ? null : new Date();
    changes.termsVersion = body.termsVersion!.trim().slice(0, 100);
    changes.privacyVersion = body.privacyVersion!.trim().slice(0, 100);
    changes.profileCompletedAt = new Date();
    changes.accountStatus = "active";
  }
  if (completingProfile && effectiveRole !== "student") {
    if (!(body.termsVersion ?? "").trim() || !(body.privacyVersion ?? "").trim()) return Response.json({ error: "წესებისა და კონფიდენციალურობის დადასტურება აუცილებელია" }, { status: 400 });
    changes.termsVersion = body.termsVersion!.trim().slice(0, 100);
    changes.privacyVersion = body.privacyVersion!.trim().slice(0, 100);
    changes.profileCompletedAt = new Date();
    changes.accountStatus = "active";
  }
  await getDb().update(users).set(changes).where(eq(users.id, current.user.id));
  const [updated] = await getDb().select().from(users).where(eq(users.id, current.user.id)).limit(1);
  let guardianEmailSent = false;
  if (updated.role === "student" && updated.birthDate && ageFrom(updated.birthDate)! < 16 && updated.guardianEmail && !updated.guardianVerifiedAt) {
    try {
      await createAndSendGuardianConsent(request, updated, updated.guardianEmail);
      guardianEmailSent = true;
    } catch {
      // Keep the completed profile and pending consent state; the user can safely retry email delivery.
      guardianEmailSent = false;
    }
  }
  return Response.json({ user: publicUser(updated), guardianEmailSent });
}
