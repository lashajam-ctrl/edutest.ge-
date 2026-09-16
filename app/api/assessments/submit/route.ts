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
  if (!['student','teacher','admin'].includes(current.user.role)) return Response.json({error:'ამ ფუნქციაზე წვდომა არ გაქვთ.'},{status:403});
  await ensureSchema();
  const rate = await consumeRateLimit(`assessment-submit:${current.user.id}`, 30, 60_000);
  if (!rate.allowed) return Response.json({ error: "ძალიან ბევრი მოთხოვნაა. სცადეთ ცოტა ხანში." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => ({})) as { sessionId?: unknown; answers?: unknown; draftRevision?: unknown };
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : "";
  let answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : {};
  if (!sessionId || JSON.stringify(answers).length > 100_000) return Response.json({ error: "არასწორი პასუხების პაკეტი" }, { status: 400 });
  const session = await env.DB.prepare("SELECT * FROM assessment_sessions WHERE id = ? AND user_id = ?").bind(sessionId, current.user.id).first<SessionRow>();
  if (!session) return Response.json({ error: "ტესტის სესია ვერ მოიძებნა" }, { status: 404 });
  if (session.status !== "started") {
    const saved=await env.DB.prepare("SELECT answers_json FROM attempts WHERE id=? AND user_id=?").bind(session.id,current.user.id).first<{answers_json:string}>();
    if(saved)return Response.json({result:JSON.parse(saved.answers_json),replayed:true},{headers:{"Cache-Control":"no-store"}});
    return Response.json({ error: "ტესტი უკვე ჩაბარებულია" }, { status: 409 });
  }
  if (Number(session.expires_at) < Date.now()) return Response.json({ error: "ტესტის დრო ამოიწურა" }, { status: 410 });
  const draft=await env.DB.prepare('SELECT answers_json,deadline_at,revision FROM assessment_session_drafts WHERE session_id=?').bind(session.id).first<{answers_json:string;deadline_at:number;revision:number}>();
  // Older clients may finish a newly-created, never-edited draft. Once saved,
  // a revision is mandatory so a stale tab cannot replace another tab's work.
  const expectedRevision=body.draftRevision===undefined?0:body.draftRevision;
  if(draft&&(!Number.isSafeInteger(expectedRevision)||expectedRevision!==draft.revision))return Response.json({error:'ტესტი სხვა ჩანართში შეიცვალა. გახსენით შენახული ვერსია.',code:'DRAFT_CONFLICT'},{status:409});
  // A short transport allowance is not a new test timer. Resuming an expired
  // test submits only the answers already saved before its server deadline.
  const questionIds = JSON.parse(session.question_ids_json) as string[];
  if (!questionIds.length || questionIds.length > 100) return Response.json({ error: "სესიის კითხვები არასწორია" }, { status: 409 });
  if(draft&&Date.now()>Number(draft.deadline_at)+5000){
    const savedAnswers=JSON.parse(draft.answers_json) as Record<string,unknown>;
    // Do not silently grade an older draft if a delayed final save lost changes.
    // The learner must deliberately reopen the saved version before submitting it.
    if(questionIds.some(id=>JSON.stringify(answers[id]??null)!==JSON.stringify(savedAnswers[id]??null)))return Response.json({error:'ბოლო ცვლილებები დროულად არ შენახულა. შედეგი არ დაფიქსირებულა; გახსენით შენახული ვერსია.',code:'DRAFT_EXPIRED_UNSAVED'},{status:409,headers:{'Cache-Control':'no-store'}});
    answers=savedAnswers;
  }
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
    return { ...publicPayload, id: question.id, ua: submittedAnswer, ok: result.correct, correctDisplay: result.correctDisplay, explain: correctKnownQuestionExplanation(question.id, question.explanation) };
  });
  const percentage = maxScore ? Math.round(score / maxScore * 100) : 0, now = Date.now();
  const test = await env.DB.prepare("SELECT title,subject,grade FROM assessment_tests WHERE id = ?").bind(session.test_id).first<{ title: string; subject: string; grade: number }>();
  const resultSubject = canonicalAssessmentSubject(test?.subject ?? "", test?.grade ?? null);
  const resultTitle = resultSubject === "მათემატიკა" && Number(test?.grade) >= 7
    ? String(test?.title ?? "ტესტი").replace(/^(?:ალგებრა|გეომეტრია|მათემატიკა)/u, "მათემატიკა")
    : test?.title ?? "ტესტი";
  const result = { testId: session.test_id, title: resultTitle, subject: resultSubject, grade: test?.grade ?? null, earned: score, totalPts: maxScore, correct: correctCount, total: questionIds.length, pct: percentage, reviewed, assessmentMode: "verified", verified: true, date: new Date(now).toLocaleDateString("ka-GE") };
  const statements = [
    env.DB.prepare(`UPDATE assessment_sessions SET status = 'submitted', submitted_at = ? WHERE id = ? AND user_id = ? AND status = 'started' AND expires_at >= ?
      AND NOT EXISTS (SELECT 1 FROM assessment_session_drafts d WHERE d.session_id=assessment_sessions.id AND d.revision<>?)`).bind(now, session.id,current.user.id,now,expectedRevision),
    env.DB.prepare("INSERT INTO attempts (id,user_id,test_id,score,max_score,percentage,answers_json,submitted_at) SELECT ?,?,?,?,?,?,?,? WHERE changes()=1")
      .bind(session.id, current.user.id, session.test_id, score, maxScore, percentage, JSON.stringify(result), now),
  ];
  for (const id of questionIds) {
    const question = byId.get(id)!, item = reviewed.find(row => row.id === id)!;
    const nextReviewAt = now + (item.ok ? 7 : 1) * 86_400_000;
    statements.push(env.DB.prepare(`INSERT INTO assessment_question_history
      (user_id,question_id,semantic_group_id,answered_count,correct_count,last_correct,last_answered_at,next_review_at)
      SELECT ?,?,?,1,?,?,?,? WHERE changes()=1 ON CONFLICT(user_id,question_id) DO UPDATE SET
      semantic_group_id=excluded.semantic_group_id, answered_count=answered_count+1, correct_count=correct_count+excluded.correct_count,
      last_correct=excluded.last_correct, last_answered_at=excluded.last_answered_at, next_review_at=excluded.next_review_at`)
      .bind(current.user.id, id, question.semantic_group_id, item.ok ? 1 : 0, item.ok ? 1 : 0, now, nextReviewAt));
    statements.push(env.DB.prepare("INSERT INTO question_history (id,user_id,question_id,pool_key,answered_at) SELECT ?,?,?,?,? WHERE changes()=1 ON CONFLICT(user_id,question_id) DO UPDATE SET answered_at=excluded.answered_at,pool_key=excluded.pool_key")
      .bind(crypto.randomUUID(), current.user.id, id, `server:${resultSubject}:${test?.grade ?? ""}`, now));
  }
  const writes=await env.DB.batch(statements);
  if(Number(writes[0]?.meta?.changes)!==1){
    const saved=await env.DB.prepare("SELECT answers_json FROM attempts WHERE id=? AND user_id=?").bind(session.id,current.user.id).first<{answers_json:string}>();
    if(saved)return Response.json({result:JSON.parse(saved.answers_json),replayed:true},{headers:{"Cache-Control":"no-store"}});
    return Response.json({error:"ტესტის დრო ამოიწურა ან სესია შეიცვალა."},{status:409});
  }
  let resultEmailSent = false;
  try { resultEmailSent = await sendAssessmentResultEmail(current.user, result); } catch { resultEmailSent = false; }
  return Response.json({ result, resultEmailSent }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
