// Only server-created, answer-safe presentations are stored here. A draft is
// owned by the assessment session, not by an identifier supplied by a browser.
export class DraftError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function cleanDraftAnswers(answers, questionIds) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || JSON.stringify(answers).length > 90_000) throw new DraftError('პასუხების პაკეტი არასწორია.');
  const allowed = new Set(questionIds);
  const scalar = value => value === null || typeof value === 'string' && value.length <= 4000 || typeof value === 'number' && Number.isFinite(value);
  const valueOk = value => scalar(value) || Array.isArray(value) && value.length <= 100 && value.every(scalar)
    || value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).length <= 100
      && Object.entries(value).every(([key,item]) => /^\d{1,3}$/.test(key) && scalar(item));
  const pairs = Object.entries(answers);
  if (pairs.some(([key,value]) => !allowed.has(key) || !valueOk(value))) throw new DraftError('პასუხი ამ ტესტს არ ეკუთვნის ან არასწორადაა შევსებული.');
  return Object.fromEntries(pairs);
}
export function createDraftService({ db, now = Date.now }) {
  async function owned(userId, sessionId) {
    const row = await db.prepare(`SELECT d.*,s.test_id,s.status,s.expires_at FROM assessment_session_drafts d
      INNER JOIN assessment_sessions s ON s.id=d.session_id WHERE s.id=? AND s.user_id=?`).bind(sessionId,userId).first();
    if (!row) throw new DraftError('დაწყებული ტესტი ვერ მოიძებნა.',404);
    if (row.status !== 'started') throw new DraftError('ეს ტესტი უკვე დასრულებულია.',409);
    if (Number(row.expires_at) <= now()) throw new DraftError('ტესტის გაგრძელების ვადა ამოიწურა.',410);
    return row;
  }
  return {
    async list(userId) {
      const rows = (await db.prepare(`SELECT d.session_id,d.snapshot_json,d.deadline_at,d.updated_at,d.revision FROM assessment_session_drafts d
        INNER JOIN assessment_sessions s ON s.id=d.session_id WHERE s.user_id=? AND s.status='started' AND s.expires_at>?
        ORDER BY s.started_at DESC LIMIT 5`).bind(userId,now()).all()).results || [];
      return rows.map(row => ({sessionId:row.session_id,test:JSON.parse(row.snapshot_json).test,deadlineAt:row.deadline_at,updatedAt:row.updated_at,revision:row.revision}));
    },
    async load(userId, sessionId) {
      const row=await owned(userId,sessionId);
      return {...JSON.parse(row.snapshot_json),sessionId,answers:JSON.parse(row.answers_json),questionIndex:row.question_index,
        revision:row.revision,deadlineAt:row.deadline_at,serverNow:now(),resumed:true};
    },
    async save(userId, sessionId, body) {
      const row=await owned(userId,sessionId), time=now(),snapshot=JSON.parse(row.snapshot_json);
      if(time>row.deadline_at)throw new DraftError('ტესტის დრო დასრულდა. შეგიძლია შენახული პასუხები გაგზავნო.',410);
      if(!Number.isSafeInteger(body.revision)||body.revision<0||!Number.isInteger(body.questionIndex)||body.questionIndex<0||body.questionIndex>=snapshot.questions.length)throw new DraftError('შენახვის მონაცემები არასწორია.');
      const answers=cleanDraftAnswers(body.answers,snapshot.questions.map(q=>q.id));
      const result=await db.prepare(`UPDATE assessment_session_drafts SET answers_json=?,question_index=?,revision=revision+1,updated_at=?
        WHERE session_id=? AND revision=? AND deadline_at>=? AND EXISTS
        (SELECT 1 FROM assessment_sessions s WHERE s.id=session_id AND s.user_id=? AND s.status='started' AND s.expires_at>?)`)
        .bind(JSON.stringify(answers),body.questionIndex,time,sessionId,body.revision,time,userId,time).run();
      if(Number(result.meta?.changes)!==1)throw new DraftError('ტესტი სხვა ჩანართში შეიცვალა. განაახლე შენახული ვერსია.',409);
      return {saved:true,revision:body.revision+1,updatedAt:time};
    },
  };
}
