import { avg, count, eq, gte } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { assessmentQuestions, assessmentTests, attempts, users } from "@/db/schema";
import { canonicalAssessmentSubject, subjectAllowedForGrade } from "@/lib/assessment";

export async function GET() {
  await ensureSchema();
  const db = getDb();
  const tbilisiOffsetMs = 4 * 60 * 60 * 1000;
  const tbilisiNow = new Date(Date.now() + tbilisiOffsetMs);
  tbilisiNow.setUTCHours(0, 0, 0, 0);
  const startOfToday = new Date(tbilisiNow.getTime() - tbilisiOffsetMs);
  const [[today], [excellent], [average], [students], questionGroups, publishedTests] = await Promise.all([
    db.select({ value: count() }).from(attempts).where(gte(attempts.submittedAt, startOfToday)),
    db.select({ value: count() }).from(attempts).where(gte(attempts.percentage, 90)),
    db.select({ value: avg(attempts.percentage) }).from(attempts),
    db.select({ value: count() }).from(users).where(eq(users.role, "student")),
    db.select({ grade: assessmentQuestions.grade, subject: assessmentQuestions.subject, value: count() })
      .from(assessmentQuestions).where(eq(assessmentQuestions.active, true)).groupBy(assessmentQuestions.grade, assessmentQuestions.subject),
    db.select({ grade: assessmentTests.grade, subject: assessmentTests.subject, isCustom: assessmentTests.isCustom })
      .from(assessmentTests).where(eq(assessmentTests.published, true)),
  ]);
  const eligibleTests = publishedTests.filter(test => test.isCustom || subjectAllowedForGrade(test.subject, test.grade));
  const eligibleQuestionGroups = questionGroups.filter(group => subjectAllowedForGrade(group.subject, group.grade));
  return Response.json({
    todayTests: Number(today?.value ?? 0),
    excellentBadges: Number(excellent?.value ?? 0),
    averageScore: Math.round(Number(average?.value ?? 0)),
    students: Number(students?.value ?? 0),
    questions: eligibleQuestionGroups.reduce((sum, group) => sum + Number(group.value ?? 0), 0),
    tests: eligibleTests.length,
    subjects: new Set(eligibleTests.map(test => canonicalAssessmentSubject(test.subject, test.grade))).size,
  }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
}
