import { canonicalAssessmentSubject, subjectAllowedForGrade, schoolGradeNumber } from './school-policy.mjs';

export const DAY_MS = 86_400_000;
export function ageAt(birthDate, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate ?? ''))) return null;
  const date = new Date(birthDate + 'T00:00:00Z'), today = new Date(now);
  if (!Number.isFinite(date.getTime()) || date > today) return null;
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  if (today.getUTCMonth() < date.getUTCMonth() || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate())) age--;
  return age;
}
export function learnerAllowed(user, now = Date.now()) {
  if (!user || user.role !== 'student' || user.accountStatus !== 'active' || user.emailVerified !== true || !schoolGradeNumber(user.grade)) return false;
  const age = ageAt(user.birthDate, now);
  return age !== null && age >= 5 && (age >= 16 || Boolean(user.guardianVerifiedAt));
}
export function tbilisiDay(now = Date.now()) {
  const start = Math.floor((now + 4 * 3_600_000) / DAY_MS) * DAY_MS - 4 * 3_600_000;
  return { start, end: start + DAY_MS, date: new Date(start + 4 * 3_600_000).toISOString().slice(0, 10), timezone: 'Asia/Tbilisi' };
}
export function makeLearningPlan({ user, tests, history, completed = 0, now = Date.now() }) {
  const day = tbilisiDay(now), grade = schoolGradeNumber(user.grade);
  const catalog = tests.filter(t => Number(t.grade) === grade && t.published && t.serverBacked && !t.teacherCreated && subjectAllowedForGrade(t.subject, grade));
  const weak = history.filter(h => Number(h.last_correct) === 0).sort((a,b) => Number(a.next_review_at)-Number(b.next_review_at) || String(a.question_id).localeCompare(String(b.question_id)));
  const due = history.filter(h => Number(h.next_review_at) <= now);
  const actions = [];
  if (weak.length) actions.push({ kind: 'practice', label: 'შეცდომის შემდეგ — სხვა სავარჯიშო', sourceQuestionId: weak[0].question_id,
    subject: canonicalAssessmentSubject(weak[0].subject, grade), topic: weak[0].topic, availability: 'checked_on_start' });
  const selected = new Set();
  for (const [kind, label, target] of [['review','დაბრუნდი გასამეორებელ საგანთან', due[0]], ['new','დღის ტესტი',null], ['challenge','პატარა გამოწვევა',null]]) {
    if (actions.length >= 3) break;
    const candidates = catalog.filter(t => !selected.has(t.id));
    const preferred = target && candidates.find(t => t.subject === canonicalAssessmentSubject(target.subject, grade));
    const test = preferred || candidates[(Math.floor(day.start / DAY_MS) % Math.max(candidates.length,1) + candidates.length) % Math.max(candidates.length,1)];
    if (!test) continue;
    selected.add(test.id);
    actions.push({ kind, label, testId: test.id, title: test.title, subject: test.subject, questionCount: test.count });
  }
  return { ...day, method: 'server_history_rules', completedToday: completed, answeredQuestions: history.length,
    dueQuestions: due.length, mistakes: weak.length, actions,
    note: 'ეს არის რეკომენდებული ნაბიჯები. ტესტში ახალი და გამეორებული საკითხების რაოდენობას დაწყებისას შერჩევის მოდული განსაზღვრავს.' };
}
export function weeklySummary(rows, now = Date.now()) {
  const day = tbilisiDay(now), from = day.start - 6 * DAY_MS;
  const topics = new Map(); let tests = 0, correct = 0, questions = 0;
  for (const row of rows) {
    if (Number(row.submitted_at) < from || Number(row.submitted_at) > now) continue;
    let result; try { result = JSON.parse(row.answers_json); } catch { continue; }
    if (result?.verified !== true || result.assessmentMode !== 'verified' || !Array.isArray(result.reviewed)) continue;
    tests++;
    for (const q of result.reviewed) {
      if (typeof q.ok !== 'boolean') continue;
      const subject = String(result.subject || q.subject || ''), topic = String(q.topic || 'ზოგადი');
      const key = JSON.stringify([subject, topic]), item = topics.get(key) || { subject, topic, correct: 0, questions: 0 };
      item.questions++; questions++; if (q.ok) { item.correct++; correct++; } topics.set(key, item);
    }
  }
  const topicRows = [...topics.values()].map(t => ({ ...t, percentage: Math.round(t.correct / t.questions * 100) }));
  return { from, to: now, timezone: day.timezone, tests, correct, questions, percentage: questions ? Math.round(correct/questions*100) : null,
    strengths: topicRows.filter(t => t.questions >= 3 && t.percentage >= 75).sort((a,b) => b.percentage-a.percentage).slice(0,3),
    nextTopics: topicRows.filter(t => t.correct < t.questions).sort((a,b) => a.percentage-b.percentage).slice(0,3),
    automaticEmail: false, note: 'ბოლო 7 კალენდარული დღე; მხოლოდ სერვერზე შეფასებული სრული ტესტები. მცირე ნიმუში ცოდნის სრულ შეფასებას არ ნიშნავს.' };
}
// Equality with the current consent version is intentional; an old acceptance is not authorization.
export const GUARDIAN_CHILDREN_SQL = `SELECT u.id,u.name,u.grade FROM users u
  WHERE lower(u.guardian_email)=lower(?) AND u.guardian_verified_at IS NOT NULL AND u.role='student' AND u.account_status='active'
  AND EXISTS (SELECT 1 FROM guardian_consent_requests g WHERE g.child_user_id=u.id
    AND lower(g.guardian_email)=lower(u.guardian_email) AND g.status='accepted' AND g.accepted_at=u.guardian_verified_at)
  ORDER BY u.name LIMIT 50`;

export function chooseFollowup(source, candidates, selectionKey) {
  const sourceKey = selectionKey(source);
  return candidates.find(q => q.id !== source.id && q.active === 1 && q.grade === source.grade && q.subject === source.subject
    && q.semester === source.semester && q.topic === source.topic && selectionKey(q) !== sourceKey
    && ['multiple_choice','true_false','calc'].includes(q.question_type)) || null;
}
