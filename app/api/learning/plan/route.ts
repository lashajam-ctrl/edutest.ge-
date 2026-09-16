import { env } from 'cloudflare:workers';
import { requireLearner, privateJson } from '@/lib/learning';
import { makeLearningPlan, tbilisiDay } from '@/lib/learning-core.mjs';
import { GET as catalog } from '@/app/api/assessments/catalog/route';
import { schoolGradeNumber } from '@/lib/school-policy.mjs';
export async function GET(request: Request) {
  const auth=await requireLearner(request);if(auth.error)return auth.error;
  const {user}=auth.current!,now=Date.now();
  const data=await (await catalog(request)).json() as {tests:Record<string,unknown>[]};
  const history=(await env.DB.prepare(`SELECT h.*,q.subject,q.topic,
    (SELECT MAX(p.submitted_at) FROM learning_practice_sessions p WHERE p.user_id=h.user_id AND p.source_question_id=h.question_id
      AND p.status='submitted' AND p.started_at>=h.last_answered_at AND json_valid(p.result_json) AND json_extract(p.result_json,'$.correct')=1) AS remediated_at
    FROM assessment_question_history h
    INNER JOIN assessment_questions q ON q.id=h.question_id WHERE h.user_id=? AND q.grade=? AND q.active=1
    ORDER BY h.last_correct,h.next_review_at LIMIT 5001`).bind(user.id,schoolGradeNumber(user.grade)).all()).results||[];
  if(history.length>5000)return privateJson({error:'პირადი ისტორია მოცულობითია; გეგმა დროებით მიუწვდომელია.'},422);
  const row=await env.DB.prepare(`SELECT COUNT(*) AS count FROM attempts WHERE user_id=? AND submitted_at>=?
    AND json_valid(answers_json) AND json_extract(answers_json,'$.verified')=1 AND json_extract(answers_json,'$.assessmentMode')='verified'`)
    .bind(user.id,tbilisiDay(now).start).first<{count:number}>();
  return privateJson(makeLearningPlan({user,tests:data.tests,history,completed:row?.count||0,now}));
}
