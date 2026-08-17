import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { assessmentSubjectComponents, canonicalAssessmentSubject, prepareQuestion, schoolGradeNumber, StoredAssessmentQuestion, subjectAllowedForGrade } from "@/lib/assessment";
import { allocateByWeight, assessmentSelectionKey, distinctSelectionGroupCount, eligibleCandidatesBySelectionHistory, languageBlueprintFor, languageBucketFor, rankCandidatesBySelectionHistory } from "@/lib/assessment-selection";
import { getSessionUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

type TestRow = { id: string; subject: string; grade: number; semester: number | null; question_count: number; time_minutes: number; attempts_allowed: number; published: number; is_custom: number; created_by: string | null };
type Candidate = StoredAssessmentQuestion & { history_id: string | null; answered_count: number | null; last_correct: number | null; next_review_at: number | null; last_answered_at: number | null };

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const rate = await consumeRateLimit(`assessment-start:${current.user.id}`, 20, 60_000);
  if (!rate.allowed) return Response.json({ error: "ძალიან ბევრი მოთხოვნაა. სცადეთ ცოტა ხანში." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => ({})) as { testId?: unknown };
  const testId = typeof body.testId === "string" ? body.testId.slice(0, 180) : "";
  if (!testId) return Response.json({ error: "ტესტი არ არის მითითებული" }, { status: 400 });
  const test = await env.DB.prepare("SELECT * FROM assessment_tests WHERE id = ?").bind(testId).first<TestRow>();
  if (!test) return Response.json({ error: "ტესტი ვერ მოიძებნა" }, { status: 404 });

  let allowed = Boolean(test.published) || current.user.role === "admin" || (current.user.role === "teacher" && test.created_by === current.user.id);
  if (!allowed && current.user.role === "student") {
    const assignment = await env.DB.prepare("SELECT id FROM assignments WHERE test_id = ? AND grade = ? LIMIT 1").bind(test.id, String(current.user.grade ?? "")).first();
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
    const subjects = assessmentSubjectComponents(test.subject, test.grade);
    const subjectPlaceholders = subjects.map(() => "?").join(",");
    const bindings: unknown[] = [current.user.id, test.grade, ...subjects];
    if (test.semester != null) bindings.push(test.semester);
    bindings.push(Date.now());
    statement = env.DB.prepare(`${common} WHERE q.grade = ? AND q.subject IN (${subjectPlaceholders})${semesterClause} AND q.active = 1
      ORDER BY CASE WHEN h.question_id IS NULL THEN 0 WHEN h.last_correct = 0 AND h.next_review_at <= ? THEN 1 ELSE 2 END,
      COALESCE(h.last_answered_at, 0) ASC, q.semantic_group_id, q.id LIMIT 250`)
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
  const rankedCandidates = test.is_custom ? rawCandidates : rankCandidatesBySelectionHistory(rawCandidates, selectionNow);
  const candidates = test.is_custom ? rankedCandidates : eligibleCandidatesBySelectionHistory(rankedCandidates, selectionNow);
  const distinctAvailable = distinctSelectionGroupCount(candidates);
  if (distinctAvailable < 5) return Response.json({ error: "ამ ტესტის ახალი განსხვავებული კითხვები ამოიწურა. უკვე გავლილი საკითხები განმეორებით აღარ შემოგთავაზეთ." }, { status: 409 });
  const targetCount = Math.min(Number(test.question_count), distinctAvailable);
  const selected: Candidate[] = [], selectionGroups = new Set<string>();
  const addQuestions = (rows: Candidate[], count: number) => {
    let added = 0;
    for (const question of rows) {
      const key = assessmentSelectionKey(question);
      if (selected.length >= targetCount || added >= count || selectionGroups.has(key)) continue;
      selectionGroups.add(key); selected.push(question); added++;
    }
  };
  const combinedSeniorMath = !test.is_custom && test.grade >= 7 && canonicalAssessmentSubject(test.subject, test.grade) === "მათემატიკა";
  if (combinedSeniorMath) {
    const geometryTarget = Math.floor(targetCount * 0.4), algebraTarget = targetCount - geometryTarget;
    const geometry = candidates.filter(question => question.subject === "გეომეტრია" || question.strand === "geometry_space");
    const geometryIds = new Set(geometry.map(question => question.id));
    addQuestions(candidates.filter(question => !geometryIds.has(question.id)), algebraTarget);
    addQuestions(geometry, geometryTarget);
  } else if (!test.is_custom) {
    const blueprint = languageBlueprintFor(test.subject, test.grade);
    if (blueprint) {
      const allocation = allocateByWeight(targetCount, blueprint);
      for (const [bucket, count] of Object.entries(allocation)) {
        addQuestions(candidates.filter(question => {
          let text = "";
          try { text = String((JSON.parse(question.public_payload_json) as Record<string, unknown>).text ?? ""); } catch {}
          return languageBucketFor(test.subject, question.topic, text) === bucket;
        }), Number(count));
      }
    }
  }
  addQuestions(candidates, targetCount - selected.length);
  if (selected.length < targetCount) return Response.json({ error: "ტესტისთვის საკმარისი განსხვავებული კითხვა ვერ მოიძებნა" }, { status: 409 });

  const presentation: Record<string, unknown> = {}, questions = selected.map(question => {
    const prepared = prepareQuestion(question);
    presentation[question.id] = prepared.presentation;
    return prepared.payload;
  });
  const sessionId = crypto.randomUUID(), startedAt = Date.now(), expiresAt = startedAt + Math.max(30, Number(test.time_minutes) + 30) * 60_000;
  await env.DB.prepare("INSERT INTO assessment_sessions (id,user_id,test_id,question_ids_json,presentation_json,status,started_at,expires_at) VALUES (?,?,?,?,?,'started',?,?)")
    .bind(sessionId, current.user.id, test.id, JSON.stringify(selected.map(question => question.id)), JSON.stringify(presentation), startedAt, expiresAt).run();
  const componentCounts: Record<string, number> = {};
  for (const question of selected) {
    let text = "";
    try { text = String((JSON.parse(question.public_payload_json) as Record<string, unknown>).text ?? ""); } catch {}
    const bucket = languageBucketFor(test.subject, question.topic, text);
    if (bucket) componentCounts[bucket] = (componentCounts[bucket] ?? 0) + 1;
  }
  return Response.json({ sessionId, test: { id: test.id, time: test.time_minutes, count: questions.length, requestedCount: test.question_count, componentCounts }, questions }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
