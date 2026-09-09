// One policy for the browser, server and import tools. No personal data.
(function (root) {
  'use strict';
  const subjectsByGrade = {
    1: ['მათემატიკა','ქართული','ინგლისური','ბუნება'],
    2: ['მათემატიკა','ქართული','ინგლისური','ბუნება'],
    3: ['მათემატიკა','ქართული','ინგლისური','ბუნება','მე და საზოგადოება'],
    4: ['მათემატიკა','ქართული','ინგლისური','ბუნება','მე და საზოგადოება'],
    5: ['მათემატიკა','ქართული','ინგლისური','რუსული','ბუნება','ჩვენი საქართველო'],
    6: ['მათემატიკა','ქართული','ინგლისური','რუსული','ბუნება','ჩვენი საქართველო'],
    7: ['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','მოქალაქეობა'],
    8: ['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    9: ['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    10: ['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    11: ['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    12: ['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','ისტორია','სამოქალაქო თავდაცვა და უსაფრთხოება'],
  };
  Object.values(subjectsByGrade).forEach(Object.freeze);
  Object.freeze(subjectsByGrade);
  function canonicalAssessmentSubject(subject, grade) {
    const value = String(subject ?? '').trim();
    return Number(grade) >= 7 && ['ალგებრა','გეომეტრია','მათემატიკა'].includes(value) ? 'მათემატიკა' : value;
  }
  function schoolGradeNumber(value) {
    const match = String(value ?? '').trim().match(/^(1[0-2]|[1-9])(?!\d)/u);
    return match ? Number(match[1]) : null;
  }
  function subjectAllowedForGrade(subject, grade) {
    return subjectsByGrade[Number(grade)]?.includes(canonicalAssessmentSubject(subject, grade)) ?? false;
  }
  function assessmentSubjectComponents(subject, grade) {
    const canonical = canonicalAssessmentSubject(subject, grade);
    return canonical === 'მათემატიკა' && Number(grade) >= 7 ? ['მათემატიკა','ალგებრა','გეომეტრია'] : [canonical];
  }
  function studentCanStudyGrade(studentGrade, testGrade) {
    const own = schoolGradeNumber(studentGrade), target = schoolGradeNumber(testGrade);
    return own !== null && target !== null && Math.abs(own - target) <= 1;
  }
  function canonicalTestType(value) { return ['mid','practice'].includes(String(value)) ? 'practice' : String(value || ''); }
  root.EduTestSchoolRules = Object.freeze({ version: '2026-09-09', subjectsByGrade, canonicalAssessmentSubject,
    schoolGradeNumber, subjectAllowedForGrade, assessmentSubjectComponents, studentCanStudyGrade, canonicalTestType,
    semesters: Object.freeze([1, 2]), difficulties: Object.freeze(['easy', 'medium', 'hard']) });
})(globalThis);
