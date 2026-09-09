import { subjectAllowedForGrade, canonicalAssessmentSubject, SCHOOL_RULES_VERSION } from './school-policy.mjs';
/** @param {Array<object>} rows @param {Function} selectionKey @param {{grade?: number, semester?: number|null, truncated?: boolean}} options */
export function bankHealth(rows, selectionKey, {grade, semester=null, truncated=false}={}) {
  const buckets=new Map();let missingAnswerKeys=0,outsideSchoolRules=0;
  for(const q of rows) {
    if(!q.has_answer_key)missingAnswerKeys++;
    if(!subjectAllowedForGrade(q.subject,q.grade))outsideSchoolRules++;
    const scope={grade:q.grade,subject:canonicalAssessmentSubject(q.subject,q.grade),semester:q.semester,sourcePool:q.pool_prefix||'legacy',difficulty:q.difficulty||'unspecified'};
    const key=JSON.stringify(scope), bucket=buckets.get(key)||{...scope,rows:0,activeRows:0,answerReadyRows:0,groups:new Set(),reviewStatuses:Object.create(null),mappingStatuses:Object.create(null)};
    bucket.rows++;
    if(q.active===1){bucket.activeRows++;bucket.groups.add(selectionKey(q));if(q.has_answer_key)bucket.answerReadyRows++;}
    const review=String(q.review_status||'unknown'),mapping=String(q.mapping_status||'unknown');
    bucket.reviewStatuses[review]=(bucket.reviewStatuses[review]||0)+1;bucket.mappingStatuses[mapping]=(bucket.mappingStatuses[mapping]||0)+1;
    buckets.set(key,bucket);
  }
  return {rulesVersion:SCHOOL_RULES_VERSION,scope:{grade,semester},coverageComplete:!truncated,scannedRows:rows.length,
    missingAnswerKeys,outsideSchoolRules,humanVerification:{status:'not_tracked',verifiedCount:null},
    buckets:[...buckets.values()].map(({groups,...bucket})=>({...bucket,selectionGroups:groups.size,duplicateRows:bucket.activeRows-groups.size})),
    warnings:[...(truncated?['სკანირება არასრულია — შეავიწროვეთ სემესტრის ფილტრი.']:[]),
      'ჯგუფები დათვლილია ტესტის შერჩევის რეალური წესით. ეს არ არის ყოველდღიური ახალი ტესტების გარანტია: მოქმედებს მოსწავლის ისტორია, შემადგენლობა და 1,000-კანდიდატიანი ლიმიტი.',
      'წყაროს review სტატუსი ადამიანის მიერ გადამოწმების მტკიცებულება არ არის. შემმოწმებლისა და ვერსიის აღრიცხვა ჯერ არ არსებობს.']};
}
