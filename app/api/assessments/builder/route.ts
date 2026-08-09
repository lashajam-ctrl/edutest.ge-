import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { assessmentSubjectComponents, assessmentTestJson, subjectAllowedForGrade } from "@/lib/assessment";
import { getSessionUser } from "@/lib/auth";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (!["teacher", "admin"].includes(current.user.role)) return Response.json({ error: "მასწავლებლის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = clean(body.title, 160), subject = clean(body.subject, 100), grade = Number(body.grade);
  const durationMinutes = Number(body.durationMinutes), attemptsAllowed = Number(body.attemptsAllowed);
  const questionIds = Array.isArray(body.questionIds) ? [...new Set(body.questionIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 160))].slice(0, 40) : [];
  if (!title || !Number.isInteger(grade) || !subjectAllowedForGrade(subject, grade) || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180 || !Number.isInteger(attemptsAllowed) || attemptsAllowed < 1 || attemptsAllowed > 20 || !questionIds.length) {
    return Response.json({ error: "ტესტის მონაცემები არასწორია" }, { status: 400 });
  }
  const placeholders = questionIds.map(() => "?").join(",");
  const subjectComponents = assessmentSubjectComponents(subject, grade), subjectPlaceholders = subjectComponents.map(() => "?").join(",");
  const selected = (await env.DB.prepare(`SELECT id,semantic_group_id FROM assessment_questions WHERE active=1 AND grade=? AND subject IN (${subjectPlaceholders}) AND id IN (${placeholders})`).bind(grade, ...subjectComponents, ...questionIds).all<{ id: string; semantic_group_id: string }>()).results ?? [];
  if (selected.length !== questionIds.length) return Response.json({ error: "ზოგი კითხვა ამ კლასსა და საგანს არ ეკუთვნის" }, { status: 400 });
  if (new Set(selected.map(question => question.semantic_group_id)).size !== selected.length) return Response.json({ error: "ტესტში ერთი და იგივე შინაარსის კითხვა ვერ განმეორდება" }, { status: 400 });
  const id = `sv-custom-${crypto.randomUUID()}`, now = Date.now(), published = current.user.role === "admin" && body.published === true ? 1 : 0;
  const test = { id, source_test_id: null, title, subject, grade, semester: null, source_pool: "teacher-builder", question_count: questionIds.length, time_minutes: durationMinutes, attempts_allowed: attemptsAllowed, test_type: "teacher", published, is_custom: 1, created_by: current.user.id, created_at: now, updated_at: now };
  const statements = [env.DB.prepare("INSERT INTO assessment_tests (id,source_test_id,title,subject,grade,semester,source_pool,question_count,time_minutes,attempts_allowed,test_type,published,is_custom,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(test.id, test.source_test_id, test.title, test.subject, test.grade, test.semester, test.source_pool, test.question_count, test.time_minutes, test.attempts_allowed, test.test_type, test.published, test.is_custom, test.created_by, test.created_at, test.updated_at)];
  questionIds.forEach((questionId, position) => statements.push(env.DB.prepare("INSERT INTO assessment_test_questions (test_id,question_id,position) VALUES (?,?,?)").bind(id, questionId, position)));
  await env.DB.batch(statements);
  return Response.json({ test: assessmentTestJson(test) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (!["teacher", "admin"].includes(current.user.role)) return Response.json({ error: "წვდომა აკრძალულია" }, { status: 403 });
  await ensureSchema();
  const id = new URL(request.url).searchParams.get("id")?.slice(0, 180) ?? "";
  const test = await env.DB.prepare("SELECT id,created_by,is_custom FROM assessment_tests WHERE id = ?").bind(id).first<{ id: string; created_by: string | null; is_custom: number }>();
  if (!test || !test.is_custom || (current.user.role !== "admin" && test.created_by !== current.user.id)) return Response.json({ error: "ტესტი ვერ მოიძებნა" }, { status: 404 });
  await env.DB.prepare("DELETE FROM assessment_tests WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
