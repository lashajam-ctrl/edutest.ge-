import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import {
  assessmentQuestionHistory,
  assessmentSessions,
  assignments,
  attempts,
  customTests,
  guardianConsentRequests,
  identities,
  issueReports,
  questionHistory,
  userLearningState,
  users,
} from "@/db/schema";
import { destroySession, getSessionUser, publicUser, sha256 } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

function noStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

function parsed(value: string) {
  try { return JSON.parse(value); } catch { return null; }
}

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return noStore({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const limit = await consumeRateLimit(`account-export:${await sha256(current.user.id)}`, 3, 60 * 60_000);
  if (!limit.allowed) return noStore({ error: "მონაცემების ჩამოტვირთვის ლიმიტი ამოიწურა. სცადეთ მოგვიანებით." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  await ensureSchema();
  const db = getDb();
  const userId = current.user.id;
  const [linkedIdentities, attemptRows, historyRows, guardianRows, assignmentRows, reportRows, customRows, sessionRows, adaptiveRows, learningStateRows] = await Promise.all([
    db.select({ provider: identities.provider, createdAt: identities.createdAt }).from(identities).where(eq(identities.userId, userId)),
    db.select().from(attempts).where(eq(attempts.userId, userId)),
    db.select().from(questionHistory).where(eq(questionHistory.userId, userId)),
    db.select({ id: guardianConsentRequests.id, guardianEmail: guardianConsentRequests.guardianEmail, status: guardianConsentRequests.status, expiresAt: guardianConsentRequests.expiresAt, createdAt: guardianConsentRequests.createdAt, acceptedAt: guardianConsentRequests.acceptedAt })
      .from(guardianConsentRequests).where(eq(guardianConsentRequests.childUserId, userId)),
    db.select().from(assignments).where(eq(assignments.createdBy, userId)),
    db.select().from(issueReports).where(eq(issueReports.userId, userId)),
    db.select().from(customTests).where(eq(customTests.createdBy, userId)),
    db.select({ id: assessmentSessions.id, testId: assessmentSessions.testId, status: assessmentSessions.status, startedAt: assessmentSessions.startedAt, expiresAt: assessmentSessions.expiresAt, submittedAt: assessmentSessions.submittedAt })
      .from(assessmentSessions).where(eq(assessmentSessions.userId, userId)),
    db.select().from(assessmentQuestionHistory).where(eq(assessmentQuestionHistory.userId, userId)),
    db.select().from(userLearningState).where(eq(userLearningState.userId, userId)),
  ]);
  return noStore({
    exportedAt: new Date().toISOString(),
    profile: publicUser(current.user),
    linkedIdentities,
    attempts: attemptRows.map(row => ({ ...row, answers: parsed(row.answersJson), answersJson: undefined })),
    questionHistory: historyRows,
    guardianConsent: guardianRows,
    assignmentsCreated: assignmentRows,
    issueReports: reportRows,
    customTests: customRows.map(row => ({ ...row, questions: parsed(row.questionsJson), questionsJson: undefined })),
    assessmentSessions: sessionRows,
    adaptiveHistory: adaptiveRows,
    learningState: learningStateRows.map(row => parsed(row.stateJson)),
  });
}

export async function DELETE(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return noStore({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role === "admin") return noStore({ error: "ადმინისტრატორის ანგარიში ამ გზით ვერ წაიშლება" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { confirm?: string };
  if (body.confirm !== "DELETE") return noStore({ error: "წაშლის დადასტურება აუცილებელია" }, { status: 400 });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limit = await consumeRateLimit(`account-delete:${await sha256(`${current.user.id}|${ip}`)}`, 1, 10 * 60_000);
  if (!limit.allowed) return noStore({ error: "წაშლის მოთხოვნა უკვე მიღებულია" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  await ensureSchema();
  await getDb().delete(users).where(eq(users.id, current.user.id));
  return noStore({ deleted: true }, { headers: { "Set-Cookie": await destroySession(request) } });
}
