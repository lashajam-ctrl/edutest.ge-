import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { assessmentSubjectComponents, canonicalAssessmentSubject, prepareQuestion, schoolGradeNumber, StoredAssessmentQuestion, subjectAllowedForGrade } from "@/lib/assessment";
import { languageBucketFor, selectAssessmentCandidates } from "@/lib/assessment-selection";
import { getSessionUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

type TestRow = { id: string; title: string; subject: string; grade: number; semester: number | null; source_pool: string; difficulty: string | null; question_count: number; time_minutes: number; attempts_allowed: number; published: number; is_custom: number; created_by: string | null };
type Candidate = StoredAssessmentQuestion & { history_id: string | null; answered_count: number | null; last_correct: number | null; next_review_at: number | null; last_answered_at: number | null };

const d1QuotaMessage = "მონაცემთა ბაზის დღიური ლიმიტი დროებით ამოიწურა. ტესტის დაწყება განახლდება თბილისის დროით 04:00-ზე.";

function isD1DailyWriteLimit(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /exceeded D1's free tier daily row write limit/i.test(message);
}

function secondsUntilNextD1Reset() {
  const now = new Date();
  const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((reset - now.getTime()) / 1000));
}

async function handleAssessmentStart(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (!['student','teacher','admin'].includes(current.user.role)) return Response.json({error:'ამ ანგარიშიდან ტესტის შესრულება ხელმისაწვდომი არ არის.'},{status:403});
  await ensureSchema();
  const rate = await consumeRateLimit(`assessment-start:${current.user.id}`, 20, 60_000);
  if (!rate.allowed) return Response.json({ error: "ძალიან ბევრი მოთხოვნაა. სცადეთ ცოტა ხანში." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => ({})) as { testId?: unknown };
  const testId = typeof body.testId === "string" ? body.testId.slice(0, 180) : "";
  if (!testId) return Response.json({ error: "ტესტი არ არის მითითებული" }, { status: 400 });
  const test = await env.DB.prepare("SELECT * FROM assessment_tests WHERE id = ?").bind(testId).first<TestRow>();
  if (!test) return Response.json({ error: "ტესტი ვერ მოიძებნა" }, { status: 404 });

  let allowed = Boolean(test.published) || current.user.role === "admin" || (current.user.role === "teacher" && test.created_by === current.user.id);
  if (!allowed && current.user.role === "student" && current.user.school?.trim()) {
    const assignment = await env.DB.prepare("SELECT a.id FROM assignments a INNER JOIN users teacher ON teacher.id = a.created_by WHERE a.test_id = ? AND a.grade = ? AND teacher.school = ? LIMIT 1").bind(test.id, String(current.user.grade ?? ""), current.user.school).first();
    allowed = Boolean(assignment);
  }
  if (!allowed) return Response.json({ error: "ამ ტესტზე წვდომა არ გაქვთ" }, { status: 403 });
  if (current.user.role === "student") {
    const userGrade = schoolGradeNumber(current.user.grade);
    if (!Number.isInteger(userGrade) || Math.abs(userGrade - Number(test.grade)) > 1 || !subjectAllowedForGrade(test.subject, Number(test.grade))) {
      return Response.json({ error: "ტესტი თქვენი კლასისთვის ხელმისაწვდომი არ არის" }, { status: 403 });
    }
  }
  if (test.is_custom) {
    const attemptCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM attempts WHERE user_id = ? AND test_id = ?").bind(current.user.id, test.id).first<{ total: number }>();
    if (Number(attemptCount?.total ?? 0) >= Number(test.attempts_allowed)) return Response.json({ error: "ცდების რაოდენობა ამოიწურა" }, { status: 409 });
  }

  const common = `SELECT q.*, h.question_id AS history_id, h.answered_count, h.last_correct, h.next_review_at, h.last_answered_at
    FROM assessment_questions q LEFT JOIN assessment_question_history h ON h.user_id = ? AND h.question_id = q.id`;
  let statement;
  if (test.is_custom) {
    statement = env.DB.prepare(`${common} INNER JOIN assessment_test_questions tq ON tq.question_id = q.id
      WHERE tq.test_id = ? AND q.active = 1 ORDER BY tq.position LIMIT 100`).bind(current.user.id, test.id);
  } else {
    const semesterClause = test.semester == null ? "" : " AND q.semester = ?";
    const serverPool = ["v8", "v11", "v23", "v28"].includes(String(test.source_pool)) ? String(test.source_pool) : "";
    const poolClause = serverPool ? " AND q.pool_prefix = ?" : "";
    const difficultyClause = test.difficulty ? " AND q.difficulty = ?" : "";
    const subjects = assessmentSubjectComponents(test.subject, test.grade);
    const subjectPlaceholders = subjects.map(() => "?").join(",");
    const bindings: unknown[] = [current.user.id, test.grade, ...subjects];
    if (test.semester != null) bindings.push(test.semester);
    if (serverPool) bindings.push(serverPool);
    if (test.difficulty) bindings.push(test.difficulty);
    bindings.push(Date.now());
    statement = env.DB.prepare(`${common} WHERE q.grade = ? AND q.subject IN (${subjectPlaceholders})${semesterClause}${poolClause}${difficultyClause} AND q.active = 1
      ORDER BY CASE WHEN h.question_id IS NULL THEN 0 WHEN h.last_correct = 0 AND h.next_review_at <= ? THEN 1 ELSE 2 END,
      COALESCE(h.last_answered_at, 0) ASC, q.semantic_group_id, q.id LIMIT 1000`)
      .bind(...bindings);
  }
  const rawCandidates = (await statement.all<Candidate>()).results ?? [];
  const selectionNow = Date.now();
  if (!test.is_custom) {
    const recentSessions = (await env.DB.prepare(`SELECT question_ids_json, started_at FROM assessment_sessions
      WHERE user_id = ? AND started_at >= ? ORDER BY started_at DESC LIMIT 50`)
      .bind(current.user.id, selectionNow - 86_400_000).all<{ question_ids_json: string; started_at: number }>()).results ?? [];
    const recentlyPresented = new Map<string, number>();
    for (const session of recentSessions) {
      try {
        for (const id of JSON.parse(session.question_ids_json) as string[]) recentlyPresented.set(id, Math.max(recentlyPresented.get(id) ?? 0, Number(session.started_at)));
      } catch {}
    }
    for (const question of rawCandidates) {
      const presentedAt = recentlyPresented.get(question.id);
      if (presentedAt && !question.history_id) {
        question.history_id = `session:${question.id}`;
        question.last_correct = 1;
        question.next_review_at = selectionNow + 86_400_000;
        question.last_answered_at = presentedAt;
      }
    }
  }
  const selection = selectAssessmentCandidates(rawCandidates, canonicalAssessmentSubject(test.subject, test.grade), test.grade, Number(test.question_count), selectionNow);
  const allDistinct = test.is_custom ? rawCandidates.length : selection.distinct;
  if (allDistinct < 5) return Response.json({ error: "ამ კლასისა და საგნის ბანკში ტესტისთვის საკმარისი განსხვავებული საკითხები ჯერ არ არის." }, { status: 409 });
  const targetCount = Math.min(Number(test.question_count), allDistinct);
  const selected = test.is_custom ? rawCandidates.slice(0, targetCount) : selection.selected;
  if (selected.length < targetCount) return Response.json({ error: "ტესტისთვის საკმარისი განსხვავებული კითხვა ვერ მოიძებნა" }, { status: 409 });

  const presentation: Record<string, unknown> = {}, questions = selected.map(question => {
    const prepared = prepareQuestion(question);
    presentation[question.id] = prepared.presentation;
    return prepared.payload;
  });
  const sessionId = crypto.randomUUID(), startedAt = Date.now(), expiresAt = startedAt + Math.max(30, Number(test.time_minutes) + 30) * 60_000;
  const componentCounts: Record<string, number> = {};
  for (const question of selected) {
    let text = "";
    try { text = String((JSON.parse(question.public_payload_json) as Record<string, unknown>).text ?? ""); } catch {}
    const bucket = languageBucketFor(test.subject, question.topic, text);
    if (bucket) componentCounts[bucket] = (componentCounts[bucket] ?? 0) + 1;
  }
  const rotation = test.is_custom ? { mode: "assigned", freshGroups: 0, reusedGroups: 0, distinctBankGroups: allDistinct } : selection.rotation;
  const safeTest={id:test.id,title:test.title,subject:canonicalAssessmentSubject(test.subject,test.grade),grade:test.grade,semester:test.semester,
    time:test.time_minutes,count:questions.length,requestedCount:test.question_count,difficulty:test.difficulty,componentCounts,serverBacked:true};
  const snapshot={test:safeTest,rotation,questions},deadlineAt=startedAt+Math.max(1,Number(test.time_minutes))*60_000;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO assessment_sessions (id,user_id,test_id,question_ids_json,presentation_json,status,started_at,expires_at) VALUES (?,?,?,?,?,'started',?,?)")
      .bind(sessionId,current.user.id,test.id,JSON.stringify(selected.map(question=>question.id)),JSON.stringify(presentation),startedAt,expiresAt),
    env.DB.prepare('INSERT INTO assessment_session_drafts (session_id,snapshot_json,deadline_at,updated_at) VALUES (?,?,?,?)')
      .bind(sessionId,JSON.stringify(snapshot),deadlineAt,startedAt),
  ]);
  return Response.json({sessionId,...snapshot,deadlineAt,serverNow:startedAt,revision:0}, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    return await handleAssessmentStart(request);
  } catch (error) {
    if (isD1DailyWriteLimit(error)) {
      return Response.json({ error: d1QuotaMessage }, {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": String(secondsUntilNextD1Reset()) },
      });
    }
    throw error;
  }
}
