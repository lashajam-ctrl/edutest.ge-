import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { assessmentTestJson, canonicalAssessmentSubject, subjectAllowedForGrade } from "@/lib/assessment";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  await ensureSchema();
  const current = await getSessionUser(request);
  let sql = "SELECT * FROM assessment_tests WHERE published = 1";
  const values: unknown[] = [];
  if (current?.user.role === "admin") sql = "SELECT * FROM assessment_tests";
  else if (current?.user.role === "teacher") { sql = "SELECT * FROM assessment_tests WHERE published = 1 OR created_by = ?"; values.push(current.user.id); }
  else if (current?.user.role === "student" && current.user.school?.trim()) {
    sql = "SELECT * FROM assessment_tests WHERE published = 1 OR id IN (SELECT a.test_id FROM assignments a INNER JOIN users teacher ON teacher.id = a.created_by WHERE a.grade = ? AND teacher.school = ?)";
    values.push(String(current.user.grade ?? ""), current.user.school);
  }
  const result = await env.DB.prepare(`${sql} ORDER BY grade, subject, semester, test_type`).bind(...values).all<Record<string, unknown>>();
  const rows = result.results ?? [];
  // Use the exact same grade/subject policy as /api/assessments/start so the
  // catalog never advertises a stock test that a learner cannot start.
  const eligibleRows = rows.filter(row => Boolean(row.is_custom) || subjectAllowedForGrade(String(row.subject), Number(row.grade)));
  const preferredSeniorMath = new Map<string, Record<string, unknown>>();
  for (const row of eligibleRows) {
    if (Boolean(row.is_custom) || Number(row.grade) < 7 || canonicalAssessmentSubject(row.subject, row.grade) !== "მათემატიკა") continue;
    const key = String(row.source_test_id || `${row.grade}|${row.semester}|${row.test_type}`), current = preferredSeniorMath.get(key);
    const score = (String(row.subject) === "მათემატიკა" ? 4 : String(row.subject) === "ალგებრა" ? 2 : 1) + (Boolean(row.published) ? 1 : 0);
    const currentScore = current ? (String(current.subject) === "მათემატიკა" ? 4 : String(current.subject) === "ალგებრა" ? 2 : 1) + (Boolean(current.published) ? 1 : 0) : -1;
    if (!current || score > currentScore) preferredSeniorMath.set(key, row);
  }
  const tests = eligibleRows.filter(row => {
    if (Boolean(row.is_custom) || Number(row.grade) < 7 || canonicalAssessmentSubject(row.subject, row.grade) !== "მათემატიკა") return true;
    const key = String(row.source_test_id || `${row.grade}|${row.semester}|${row.test_type}`);
    return preferredSeniorMath.get(key) === row;
  }).map(assessmentTestJson);
  return Response.json({ tests }, { headers: { "Cache-Control": current ? "private, no-store" : "public, max-age=60" } });
}
