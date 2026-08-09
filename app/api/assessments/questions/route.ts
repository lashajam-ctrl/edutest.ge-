import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (!["teacher", "admin"].includes(current.user.role)) return Response.json({ error: "მასწავლებლის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const url = new URL(request.url), grade = Number(url.searchParams.get("grade")), semester = Number(url.searchParams.get("semester") || 0);
  const subject = (url.searchParams.get("subject") ?? "").trim().slice(0, 100), topic = (url.searchParams.get("topic") ?? "").trim().slice(0, 120);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120), limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 60));
  if (!Number.isInteger(grade) || grade < 1 || grade > 12 || !subject) return Response.json({ error: "კლასი და საგანი აუცილებელია" }, { status: 400 });
  let sql = "SELECT id,grade,subject,semester,topic,question_type,points,public_payload_json FROM assessment_questions WHERE active=1 AND grade=? AND subject=?";
  const values: unknown[] = [grade, subject];
  if (semester === 1 || semester === 2) { sql += " AND semester=?"; values.push(semester); }
  if (topic) { sql += " AND topic=?"; values.push(topic); }
  if (query) { sql += " AND public_payload_json LIKE ?"; values.push(`%${query}%`); }
  sql += " ORDER BY semester,topic,id LIMIT ?"; values.push(limit);
  const rows = (await env.DB.prepare(sql).bind(...values).all<Record<string, unknown>>()).results ?? [];
  return Response.json({ questions: rows.map(row => { const payload = JSON.parse(String(row.public_payload_json)); return { id: row.id, text: payload.text, type: row.question_type, grade: row.grade, subject: row.subject, semester: row.semester, topic: row.topic, points: row.points }; }) }, { headers: { "Cache-Control": "private, no-store" } });
}
