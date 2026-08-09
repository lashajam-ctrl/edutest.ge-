import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { assessmentTestJson, canonicalAssessmentSubject } from "@/lib/assessment";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  await ensureSchema();
  const current = await getSessionUser(request);
  let sql = "SELECT * FROM assessment_tests WHERE published = 1";
  const values: unknown[] = [];
  if (current?.user.role === "admin") sql = "SELECT * FROM assessment_tests";
  else if (current?.user.role === "teacher") { sql = "SELECT * FROM assessment_tests WHERE published = 1 OR created_by = ?"; values.push(current.user.id); }
  else if (current?.user.role === "student") {
    sql = "SELECT * FROM assessment_tests WHERE published = 1 OR id IN (SELECT test_id FROM assignments WHERE grade = ?)";
    values.push(String(current.user.grade ?? ""));
  }
  const result = await env.DB.prepare(`${sql} ORDER BY grade, subject, semester, test_type`).bind(...values).all<Record<string, unknown>>();
  const rows = result.results ?? [], preferredSeniorMath = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (Boolean(row.is_custom) || Number(row.grade) < 7 || canonicalAssessmentSubject(row.subject, row.grade) !== "მათემატიკა") continue;
    const key = String(row.source_test_id || `${row.grade}|${row.semester}|${row.test_type}`), current = preferredSeniorMath.get(key);
    const score = (String(row.subject) === "მათემატიკა" ? 4 : String(row.subject) === "ალგებრა" ? 2 : 1) + (Boolean(row.published) ? 1 : 0);
    const currentScore = current ? (String(current.subject) === "მათემატიკა" ? 4 : String(current.subject) === "ალგებრა" ? 2 : 1) + (Boolean(current.published) ? 1 : 0) : -1;
    if (!current || score > currentScore) preferredSeniorMath.set(key, row);
  }
  const tests = rows.filter(row => {
    if (Boolean(row.is_custom) || Number(row.grade) < 7 || canonicalAssessmentSubject(row.subject, row.grade) !== "მათემატიკა") return true;
    const key = String(row.source_test_id || `${row.grade}|${row.semester}|${row.test_type}`);
    return preferredSeniorMath.get(key) === row;
  }).map(assessmentTestJson);
  return Response.json({ tests }, { headers: { "Cache-Control": current ? "private, no-store" : "public, max-age=60" } });
}
