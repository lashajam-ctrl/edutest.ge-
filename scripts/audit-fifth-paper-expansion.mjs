import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIFTH_PAPER_EXPANSION_V3 } from "../data/fifth-paper-expansion-v3.mjs";
import { ASSESSMENT_SUBJECTS_BY_GRADE } from "../lib/school-policy.mjs";

const normalize = value => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ka-GE").replace(/\s+/gu, " ").trim();

function grouped(rows, keyFor) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

export function auditFifthPaperExpansion(rows = FIFTH_PAPER_EXPANSION_V3) {
  const structuralFailures = [];
  for (const item of rows) {
    if (!item.id || !item.text || !item.topic || !item.concept) structuralFailures.push({ id: item.id, issue: "required_field" });
    if (!Array.isArray(item.options) || item.options.length !== 4 || new Set(item.options.map(normalize)).size !== 4) structuralFailures.push({ id: item.id, issue: "options" });
    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= 4) structuralFailures.push({ id: item.id, issue: "answer_index" });
    if (!String(item.explanation).trim() || item.explanation.length < 30) structuralFailures.push({ id: item.id, issue: "explanation" });
  }

  const bucketPromptGroups = grouped(rows, item => `${item.grade}|${item.subject}|${item.semester}|${normalize(item.text)}`);
  const globalPromptGroups = grouped(rows, item => normalize(item.text));
  const duplicatePromptGroups = [...globalPromptGroups.values()].filter(group => group.length > 1);
  const sameGradeSemesterGroups = [...bucketPromptGroups.values()].filter(group => group.length > 1);
  const sameGradeCrossSemesterGroups = duplicatePromptGroups.filter(group => {
    const scopes = group.map(item => `${item.grade}|${item.subject}`);
    return new Set(scopes).size !== scopes.length;
  });

  const stageSubjectViolations = rows.filter(item => !ASSESSMENT_SUBJECTS_BY_GRADE[item.grade]?.includes(item.subject)).map(item => item.id);
  const knownCopyFailures = rows.filter(item => /მონაწილეს ან დამკვირვებელს მიერ|ზუსტი[„”"']?-სთან|^At eight o'clock|would not be correcting/iu.test(`${item.text} ${item.explanation}`)).map(item => item.id);
  const answerPositions = Object.fromEntries([0, 1, 2, 3].map(position => [position, rows.filter(item => item.correct === position).length]));
  const subjectCounts = Object.fromEntries([...grouped(rows, item => item.subject)].map(([subject, items]) => [subject, items.length]));
  const familyCounts = Object.fromEntries([...grouped(rows, item => item.subject)].map(([subject, items]) => [subject, new Set(items.map(item => item.concept)).size]));
  const blockerCount = structuralFailures.length + sameGradeSemesterGroups.length + stageSubjectViolations.length + knownCopyFailures.length;

  return {
    generatedAt: new Date().toISOString(),
    status: blockerCount === 0 ? "pass_with_documented_limitations" : "fail",
    scope: {
      outputsChecked: rows.length,
      catalogBuckets: new Set(rows.map(item => `${item.grade}|${item.subject}|${item.semester}`)).size,
      subjects: Object.keys(subjectCounts).length,
      distinctLearningTemplates: new Set(rows.map(item => item.concept)).size,
      computationalOutputs: rows.filter(item => ["მათემატიკა", "ფიზიკა"].includes(item.subject)).length,
      curatedRuleTableOutputs: rows.filter(item => !["მათემატიკა", "ფიზიკა"].includes(item.subject)).length,
    },
    checks: {
      structuralFailures: structuralFailures.length,
      duplicateIds: rows.length - new Set(rows.map(item => item.id)).size,
      duplicateOrEmptyOptions: rows.filter(item => !Array.isArray(item.options) || item.options.length !== 4 || new Set(item.options.map(normalize)).size !== 4).length,
      invalidCorrectAnswers: rows.filter(item => !Number.isInteger(item.correct) || item.correct < 0 || item.correct >= 4).length,
      missingOrThinExplanations: rows.filter(item => !String(item.explanation).trim() || item.explanation.length < 30).length,
      exactPromptDuplicatesWithinBucket: sameGradeSemesterGroups.length,
      stageSubjectViolations: stageSubjectViolations.length,
      knownLanguageRegressionHits: knownCopyFailures.length,
      answerPositions,
    },
    diversity: {
      uniquePromptTextsGlobally: globalPromptGroups.size,
      globalExactDuplicatePromptGroups: duplicatePromptGroups.length,
      rowsInGlobalExactDuplicateGroups: duplicatePromptGroups.reduce((sum, group) => sum + group.length, 0),
      sameGradeCrossSemesterExactGroups: sameGradeCrossSemesterGroups.length,
      note: "Cross-grade and cross-semester reuse is not a same-test collision, but it is not counted as globally new pedagogy.",
    },
    bySubject: subjectCounts,
    distinctTemplatesBySubject: familyCounts,
    curriculumAlignment: {
      stageBoundaryCheck: stageSubjectViolations.length === 0 ? "pass" : "fail",
      semesterClaim: "not_asserted",
      note: "The national curriculum defines many outcomes at stage level; exact school-year and semester sequencing remains a school curriculum decision.",
      references: [
        "https://mes.gov.ge/content.php?id=12552&lang=geo",
        "https://mes.gov.ge/uploads/files/2022/gzamkvlevi.pdf",
        "https://mes.gov.ge/content.php?id=9422&lang=geo"
      ]
    },
    reviewStatus: {
      algorithmicValidation: "complete",
      aiContentFamilyReview: "complete",
      humanTeacherValidation: "not_performed",
      permittedLabel: "AI-validated provisional practice content",
      forbiddenLabel: "teacher-approved"
    },
    blockers: { count: blockerCount, structuralFailures, stageSubjectViolations, knownCopyFailures },
  };
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const report = auditFifthPaperExpansion();
  const outIndex = process.argv.indexOf("--out");
  const out = resolve(outIndex >= 0 ? process.argv[outIndex + 1] : "reports/fifth-paper-validation-report.json");
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: report.status !== "fail", out, status: report.status, scope: report.scope, checks: report.checks, diversity: report.diversity }));
  if (report.status === "fail") process.exitCode = 1;
}
