// One-time mechanical removal of identical/obsolete policy copies.
import { readFileSync, writeFileSync } from 'node:fs';
function replace(path, pattern, replacement) {
  const before=readFileSync(path,'utf8');
  if(!pattern.test(before)) throw new Error('Missing refactor boundary: '+path);
  writeFileSync(path,before.replace(pattern,replacement));
}
replace('lib/assessment.ts', /export const ASSESSMENT_SUBJECTS_BY_GRADE:[\s\S]*?(?=export type StoredAssessmentQuestion)/,
  'import { canonicalAssessmentSubject } from "./school-policy.mjs";\nexport { ASSESSMENT_SUBJECTS_BY_GRADE, canonicalAssessmentSubject, assessmentSubjectComponents, schoolGradeNumber, subjectAllowedForGrade } from "./school-policy.mjs";\n\n');
replace('public/app.html', /const SCHOOL_SUBJECTS_BY_GRADE=\{[\s\S]*?\n\};/, 'const SCHOOL_SUBJECTS_BY_GRADE=globalThis.EduTestSchoolRules.subjectsByGrade;');
replace('public/app.html', /<script>\s*\n(?=\/\/)/, '<script src="/school-rules.js?v=20260909"></script>\n<script>\n');
replace('scripts/import-v11-question-bank.mjs', /const SUBJECTS_BY_GRADE = \{[\s\S]*?\n\};/,
  'import { ASSESSMENT_SUBJECTS_BY_GRADE } from "../lib/school-policy.mjs";\n// Source capability: this archive has no Russian. School availability is unchanged.\nconst SUBJECTS_BY_GRADE = Object.fromEntries(Object.entries(ASSESSMENT_SUBJECTS_BY_GRADE).map(([grade, subjects]) => [grade, subjects.filter(subject => subject !== "რუსული")]));');
replace('app/api/custom-tests/route.ts', /const allowedSubjects = new Set\([^\n]+\);/,
  'import { ASSESSMENT_SUBJECTS_BY_GRADE, subjectAllowedForGrade } from "@/lib/school-policy.mjs";\nconst allowedSubjects = new Set([...Object.values(ASSESSMENT_SUBJECTS_BY_GRADE).flat(), "ალგებრა", "გეომეტრია"]);');
replace('app/api/custom-tests/route.ts', /const subjectAllowedForGrade = \([\s\S]*?\n\};\n/, '');
