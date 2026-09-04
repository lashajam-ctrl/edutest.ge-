import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { canonicalAssessmentSubject, gradeAssessmentAnswer, parsePublicPayload, Presentation, StoredAssessmentQuestion } from "@/lib/assessment";
import { correctKnownAnswerKey, correctKnownQuestionExplanation } from "@/lib/assessment-selection";
import { getSessionUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendAssessmentResultEmail } from "@/lib/result-email";

type SessionRow = { id: string; user_id: string; test_id: string; question_ids_json: string; presentation_json: string; status: string; expires_at: number };
type QuestionWithKey = StoredAssessmentQuestion & { answer_key_json: string; explanation: string };

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const rate = await consumeRateLimit(`assessment-submit:${current.user.id}`, 30, 60_000);
  if (!rate.allowed) return Response.json({ error: "ძალიან ბევრი მოთხოვნაა. სცადეთ ცოტა ხანში." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => ({})) as { sessionId?: unknown; answers?: unknown };
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : "";
  const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : {};
  if (!sessionId || JSON.stringify(answers).length > 100_000) return Response.json({ error: "არასწორი პასუხების პაკეტი" }, { status: 400 });
  const session = await env.DB.prepare("SELECT * FROM assessment_sessions WHERE id = ? AND user_id = ?").bind(sessionId, current.user.id).first<SessionRow>();
  if (!session) return Response.json({ error: "ტესტის სესია ვერ მოიძებნა" }, { status: 404 });
  if (session.status !== "started") return Response.json({ error: "ტესტი უკვე ჩაბარებულია" }, { status: 409 });
  if (Number(session.expires_at) < Date.now()) return Response.json({ error: "ტესტის დრო ამოიწურა" }, { status: 410 });
  const questionIds = JSON.parse(session.question_ids_json) as string[];
  if (!questionIds.length || questionIds.length > 100) return Response.json({ error: "სესიის კითხვები არასწორია" }, { status: 409 });
  const placeholders = questionIds.map(() => "?").join(",");
  const rows = (await env.DB.prepare(`SELECT q.*, k.answer_key_json, k.explanation FROM assessment_questions q
    INNER JOIN assessment_answer_keys k ON k.question_id = q.id WHERE q.id IN (${placeholders})`).bind(...questionIds).all<QuestionWithKey>()).results ?? [];
  const byId = new Map(rows.map(row => [row.id, row]));
  if (byId.size !== questionIds.length) return Response.json({ error: "სერვერის პასუხების გასაღები არასრულია" }, { status: 500 });
  const presentation = JSON.parse(session.presentation_json) as Record<string, Presentation>;
  let score = 0, maxScore = 0, correctCount = 0;
  const reviewed = questionIds.map(id => {
    const question = byId.get(id)!;
    const publicPayload = parsePublicPayload(question);
    const answerKey = correctKnownAnswerKey(question.id, JSON.parse(question.answer_key_json) as Record<string, unknown>);
    const result = gradeAssessmentAnswer({ question, answerKey, userAnswer: answers[id], presentation: presentation[id], publicPayload });
    maxScore += Number(question.points); if (result.correct) { score += Number(question.points); correctCount++; }
    let submittedAnswer = answers[id] ?? null;
    if (question.question_type === "multiple_choice" && Number.isInteger(Number(submittedAnswer)) && presentation[id]?.optionOrder) {
      submittedAnswer = presentation[id].optionOrder?.[Number(submittedAnswer)] ?? submittedAnswer;
    }
    return { ...publicPayload, ua: submittedAnswer, ok: result.correct, correctDisplay: result.correctDisplay, explain: correctKnownQuestionExplanation(question.id, question.explanation) };
  });
  const percentage = maxScore ? Math.round(score / maxScore * 100) : 0, now = Date.now();
  const test = await env.DB.prepare("SELECT title,subject,grade FROM assessment_tests WHERE id = ?").bind(session.test_id).first<{ title: string; subject: string; grade: number }>();
  const resultSubject = canonicalAssessmentSubject(test?.subject ?? "", test?.grade ?? null);
  const resultTitle = resultSubject === "მათემატიკა" && Number(test?.grade) >= 7
    ? String(test?.title ?? "ტესტი").replace(/^(?:ალგებრა|გეომეტრია|მათემატიკა)/u, "მათემატიკა")
    : test?.title ?? "ტესტი";
  const result = { testId: session.test_id, title: resultTitle, subject: resultSubject, grade: test?.grade ?? null, earned: score, totalPts: maxScore, correct: correctCount, total: questionIds.length, pct: percentage, reviewed, assessmentMode: "verified", verified: true, date: new Date(now).toLocaleDateString("ka-GE") };
  const statements = [
    env.DB.prepare("INSERT INTO attempts (id,user_id,test_id,score,max_score,percentage,answers_json,submitted_at) VALUES (?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), current.user.id, session.test_id, score, maxScore, percentage, JSON.stringify(result), now),
    env.DB.prepare("UPDATE assessment_sessions SET status = 'submitted', submitted_at = ? WHERE id = ? AND status = 'started'").bind(now, session.id),
  ];
  for (const id of questionIds) {
    const question = byId.get(id)!, item = reviewed.find(row => row.id === id)!;
    const nextReviewAt = now + (item.ok ? 7 : 1) * 86_400_000;
    statements.push(env.DB.prepare(`INSERT INTO assessment_question_history
      (user_id,question_id,semantic_group_id,answered_count,correct_count,last_correct,last_answered_at,next_review_at)
      VALUES (?,?,?,1,?,?,?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET
      semantic_group_id=excluded.semantic_group_id, answered_count=answered_count+1, correct_count=correct_count+excluded.correct_count,
      last_correct=excluded.last_correct, last_answered_at=excluded.last_answered_at, next_review_at=excluded.next_review_at`)
      .bind(current.user.id, id, question.semantic_group_id, item.ok ? 1 : 0, item.ok ? 1 : 0, now, nextReviewAt));
    statements.push(env.DB.prepare("INSERT INTO question_history (id,user_id,question_id,pool_key,answered_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET answered_at=excluded.answered_at,pool_key=excluded.pool_key")
      .bind(crypto.randomUUID(), current.user.id, id, `server:${resultSubject}:${test?.grade ?? ""}`, now));
  }
  await env.DB.batch(statements);
  let resultEmailSent = false;
  try { resultEmailSent = await sendAssessmentResultEmail(current.user, result); } catch { resultEmailSent = false; }
  return Response.json({ result, resultEmailSent }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
