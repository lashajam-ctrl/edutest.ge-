import { env } from 'cloudflare:workers';
import { getSessionUser } from './auth';
import { learnerAllowed } from './learning-core.mjs';
import { createPracticeService } from './learning-practice-core.mjs';
import { assessmentSelectionKey, correctKnownAnswerKey, correctKnownQuestionExplanation } from './assessment-selection';
import { prepareQuestion, parsePublicPayload, gradeAssessmentAnswer, StoredAssessmentQuestion, Presentation } from './assessment';
export const privateJson = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function requireLearner(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return { error: privateJson({error:'ავტორიზაცია აუცილებელია'},401) };
  if (!learnerAllowed(current.user)) return { error: privateJson({error:'საჭიროა მოსწავლის აქტიური პროფილი, დაბადების თარიღი და საჭიროებისას მშობლის თანხმობა.'},403) };
  return { current };
}
export function practiceService() {
  return createPracticeService({db:env.DB,selectionKey:assessmentSelectionKey,prepare:prepareQuestion,
    grade(question: StoredAssessmentQuestion & {answer_key_json:string;explanation:string}, userAnswer:unknown, presentation:Presentation) {
      const result=gradeAssessmentAnswer({question,userAnswer,presentation,publicPayload:parsePublicPayload(question),
        answerKey:correctKnownAnswerKey(question.id,JSON.parse(question.answer_key_json))});
      return {...result,explanation:correctKnownQuestionExplanation(question.id,question.explanation)};
    },
  });
}
