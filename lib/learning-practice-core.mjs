import { chooseFollowup } from './learning-core.mjs';
import { studentCanStudyGrade, subjectAllowedForGrade } from './school-policy.mjs';
export class LearningError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function createPracticeService({ db, selectionKey, prepare, grade, now = Date.now }) {
  return {
    async start(userId, sourceId, userGrade) {
      const source = await db.prepare(`SELECT q.* FROM assessment_questions q INNER JOIN assessment_question_history h ON h.question_id=q.id
        WHERE h.user_id=? AND q.id=? AND h.last_correct=0`).bind(userId, sourceId).first();
      if (!source || source.active!==1 || !studentCanStudyGrade(userGrade,source.grade) || !subjectAllowedForGrade(source.subject,source.grade)) throw new LearningError('ამ კითხვაზე ხელმისაწვდომი შენახული შეცდომა ვერ მოიძებნა.', 404);
      const candidates = (await db.prepare(`SELECT q.*,h.question_id AS history_id FROM assessment_questions q
        INNER JOIN assessment_answer_keys k ON k.question_id=q.id
        LEFT JOIN assessment_question_history h ON h.question_id=q.id AND h.user_id=?
        WHERE q.grade=? AND q.subject=? AND q.semester=? AND q.topic=? AND q.active=1
        AND q.question_type IN ('multiple_choice','true_false','calc')
        ORDER BY CASE WHEN h.question_id IS NULL THEN 0 ELSE 1 END,COALESCE(h.last_answered_at,0),q.id LIMIT 1000`)
        .bind(userId, source.grade, source.subject, source.semester, source.topic).all()).results || [];
      const candidate = chooseFollowup(source,candidates,selectionKey);
      if (!candidate) throw new LearningError('ამ თემაზე შინაარსობრივად განსხვავებული დამატებითი სავარჯიშო ჯერ არ არის. შეგიძლია სხვა რეკომენდაცია აირჩიო.', 409);
      const { payload, presentation } = prepare(candidate), id = crypto.randomUUID(), time = now();
      await db.prepare(`INSERT INTO learning_practice_sessions (id,user_id,source_question_id,question_id,presentation_json,status,started_at,expires_at)
        VALUES (?,?,?,?,?,'started',?,?)`).bind(id,userId,source.id,candidate.id,JSON.stringify(presentation),time,time+20*60_000).run();
      return { sessionId: id, question: payload, expiresAt: time+20*60_000, previouslyAnswered: Boolean(candidate.history_id), mode: 'learning_practice' };
    },
    async submit(userId, sessionId, answer) {
      const time=now();
      const session=await db.prepare('SELECT * FROM learning_practice_sessions WHERE id=? AND user_id=?').bind(sessionId,userId).first();
      if(!session) throw new LearningError('სავარჯიშოს სესია ვერ მოიძებნა.',404);
      if(session.status==='submitted'&&session.result_json)return JSON.parse(session.result_json);
      if(session.status!=='started') throw new LearningError('ეს სავარჯიშო უკვე შეფასებულია.',409);
      if(session.expires_at<=time) throw new LearningError('სავარჯიშოს დრო ამოიწურა.',410);
      if(answer===null||answer===undefined||typeof answer==='boolean'||String(answer).trim()===''||String(answer).length>1000) throw new LearningError('ჯერ შეიყვანე პასუხი.');
      const question=await db.prepare(`SELECT q.*,k.answer_key_json,k.explanation FROM assessment_questions q
        INNER JOIN assessment_answer_keys k ON k.question_id=q.id WHERE q.id=? AND q.active=1`).bind(session.question_id).first();
      if(!question) throw new LearningError('კითხვა დროებით მიუწვდომელია.',409);
      const result=grade(question,answer,JSON.parse(session.presentation_json));
      const output={correct:result.correct,correctDisplay:result.correctDisplay,explanation:result.explanation,mode:'learning_practice',countsTowardTestScore:false};
      const writes=await db.batch([
        db.prepare(`UPDATE learning_practice_sessions SET status='submitted',result_json=?,submitted_at=?
          WHERE id=? AND user_id=? AND status='started' AND expires_at>?`).bind(JSON.stringify(output),time,sessionId,userId,time),
        db.prepare(`INSERT INTO assessment_question_history (user_id,question_id,semantic_group_id,answered_count,correct_count,last_correct,last_answered_at,next_review_at)
          SELECT ?,?,?,1,?,?,?,? WHERE changes()=1 ON CONFLICT(user_id,question_id) DO UPDATE SET
          answered_count=answered_count+1,correct_count=correct_count+excluded.correct_count,last_correct=excluded.last_correct,
          last_answered_at=excluded.last_answered_at,next_review_at=excluded.next_review_at`)
          .bind(userId,question.id,question.semantic_group_id,result.correct?1:0,result.correct?1:0,time,time+(result.correct?7:1)*86_400_000),
      ]);
      if(Number(writes[0]?.meta?.changes)!==1){
        const saved=await db.prepare("SELECT result_json FROM learning_practice_sessions WHERE id=? AND user_id=? AND status='submitted'").bind(sessionId,userId).first();
        if(saved?.result_json)return JSON.parse(saved.result_json);
        throw new LearningError('ეს სავარჯიშო უკვე შეფასებულია.',409);
      }
      return output;
    },
  };
}
