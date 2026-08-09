import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { assessmentTestJson } from "@/lib/assessment";
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
  return Response.json({ tests: (result.results ?? []).map(assessmentTestJson) }, { headers: { "Cache-Control": current ? "private, no-store" : "public, max-age=60" } });
}
