import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import { getSessionUser, hashPassword, publicUser } from "@/lib/auth";
import { issueEmailVerification, notificationEmailConfigured } from "@/lib/email";

export async function PATCH(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const body = await request.json() as {
    name?: string;
    password?: string;
    grade?: string;
    parentEmail?: string;
    resultEmailEnabled?: boolean;
    parentResultEmailEnabled?: boolean;
  };
  const name = (body.name ?? current.user.name).trim();
  if (!name) return Response.json({ error: "სახელი აუცილებელია" }, { status: 400 });
  const changes: Partial<typeof users.$inferInsert> = { name, updatedAt: new Date() };
  if (body.password) {
    if (body.password.length < 10) return Response.json({ error: "პაროლი მინიმუმ 10 სიმბოლო უნდა იყოს" }, { status: 400 });
    const passwordData = await hashPassword(body.password);
    changes.passwordHash = passwordData.hash;
    changes.passwordSalt = passwordData.salt;
  }
  if (current.user.role === "student" && /^(?:[1-9]|1[0-2])[A-Za-zა-ჰ]?$/.test(body.grade ?? "")) changes.grade = body.grade;
  if (typeof body.resultEmailEnabled === "boolean") changes.resultEmailEnabled = body.resultEmailEnabled;
  if (typeof body.parentResultEmailEnabled === "boolean") changes.parentResultEmailEnabled = body.parentResultEmailEnabled;

  let changedParentEmail: string | null | undefined;
  if (current.user.role === "student" && Object.prototype.hasOwnProperty.call(body, "parentEmail")) {
    const parentEmail = (body.parentEmail ?? "").trim().toLowerCase();
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      return Response.json({ error: "მშობლის ელფოსტა არასწორია" }, { status: 400 });
    }
    if (parentEmail && parentEmail === current.user.email) {
      return Response.json({ error: "მშობლის ელფოსტა მოსწავლის ელფოსტისგან განსხვავებული უნდა იყოს" }, { status: 400 });
    }
    const normalized = parentEmail || null;
    if (normalized !== current.user.parentEmail) {
      changes.parentEmail = normalized;
      changes.parentEmailVerified = false;
      changedParentEmail = normalized;
    }
  }

  const db = getDb();
  await db.update(users).set(changes).where(eq(users.id, current.user.id));
  let parentVerification: "unchanged" | "removed" | "sent" | "unconfigured" | "failed" = "unchanged";
  if (changedParentEmail !== undefined) {
    await db.delete(emailVerifications).where(and(
      eq(emailVerifications.userId, current.user.id),
      eq(emailVerifications.purpose, "parent"),
    ));
    if (changedParentEmail) {
      parentVerification = (await issueEmailVerification({
        userId: current.user.id,
        email: changedParentEmail,
        purpose: "parent",
        request,
      })).state;
    } else {
      parentVerification = "removed";
    }
  }
  const [updated] = await db.select().from(users).where(eq(users.id, current.user.id)).limit(1);
  return Response.json({ user: publicUser(updated), parentVerification, emailDeliveryConfigured: notificationEmailConfigured() });
}
