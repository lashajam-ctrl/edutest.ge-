(function registerEduTestQuestionPolicy(root) {
  'use strict';

  const normalize = value => String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ka-GE')
    .replace(/[“”„"'`’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stableHash = value => {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  const COMMON_NAMES = [
    'ანა', 'ნინო', 'ნინა', 'ნიკა', 'ლუკა', 'საბა', 'თეკლა', 'გიორგი',
    'თამარი', 'ელენე', 'მარი', 'მარიამი', 'დათა', 'ლიზი',
    'ava', 'leo', 'maya', 'noah', 'emma', 'liam', 'nina', 'owen'
  ];
  const namePattern = new RegExp(`(?:${COMMON_NAMES.join('|')})`, 'giu');

  const canonicalSemanticText = question => {
    if (question?.templateFamily) return `family:${normalize(question.templateFamily)}`;
    const type = normalize(question?.type || 'question');
    const text = normalize(question?.text)
      .replace(namePattern, ' სახელი ')
      .replace(/\b\d+(?:[.,]\d+)?\b/gu, ' რიცხვი ')
      .replace(/\s+/g, ' ')
      .trim();
    return `${type}:${text}`;
  };

  const contentFingerprint = question => {
    let source;
    if (question?.visual) source = `visual:${JSON.stringify(question.visual)}`;
    else if (question?.media?.src) source = `media:${question.media.src}`;
    else source = `text:${normalize(question?.text)}`;
    return `content:${stableHash(source)}`;
  };

  const semanticFingerprint = question =>
    `semantic:${stableHash(canonicalSemanticText(question))}`;

  const optionValues = question => Array.isArray(question?.opts) ? question.opts : [];
  const hasPlaceholderOption = question => optionValues(question)
    .some(option => /^(?:ვარიანტი|option)\s*\d+$/iu.test(String(option || '').trim()));

  const hasCompleteInstruction = question => {
    const text = String(question?.text || '').trim();
    if (!text) return false;
    if (hasPlaceholderOption(question)) return false;
    if (/\b(?:undefined|null|nan)\b/iu.test(text)) return false;

    const normalized = normalize(text);
    const instruction = /(?:ჩაწერე|ჩასვი|შეავსე|დაასრულე|დაალაგე|დააკავშირე|მონიშნე|იპოვე|გამოთვალე|ამოხსენი|აირჩიე|რომელი|რამდენი|რა არის|რას ნიშნავს|სწორია თუ მცდარია|complete|choose|find|calculate|order|match|which|what|how many|read|write|answer|составьте|соотнесите|вставьте|заполните|выберите|найдите|расположите|прочитайте|запишите|ответьте)/iu;

    if (question?.type === 'fill' || question?.type === 'order' || question?.type === 'match') {
      if (!instruction.test(normalized)) return false;
    }
    if (question?.type === 'fill' && /^[\d\s,._–—−+-]+$/u.test(text)) return false;
    return true;
  };

  const allNumericValues = question => {
    const visual = question?.visual ? { ...question.visual } : {};
    delete visual.variantKey;
    const source = `${question?.text || ''} ${JSON.stringify(visual)}`;
    return [...source.matchAll(/(?<![\p{L}])\d+(?:[.,]\d+)?/gu)]
      .map(match => Number(match[0].replace(',', '.')))
      .filter(Number.isFinite);
  };

  const containsAny = (text, expressions) => expressions.some(expression => expression.test(text));

  const isGradeAppropriate = (question, context = {}) => {
    const grade = Number(context.grade || question?.grade || 0);
    const subject = String(context.subject || question?.subject || question?.skill || '').toLowerCase();
    const text = normalize(question?.text);

    if (!grade || grade < 1 || grade > 12) return false;
    if (Number.isFinite(Number(question?.gradeMin)) && grade < Number(question.gradeMin)) return false;
    if (Number.isFinite(Number(question?.gradeMax)) && grade > Number(question.gradeMax)) return false;
    if (Number.isFinite(Number(question?.grade)) && Number(question.grade) !== grade) return false;
    if (!hasCompleteInstruction(question)) return false;

    if (subject.includes('math') || subject.includes('alg') || subject.includes('geom')) {
      const values = allNumericValues(question);
      const maxValue = values.length ? Math.max(...values) : 0;
      const advanced = [
        /პროცენტ|ალბათობ|განტოლებ|ფუნქცი|საშუალო სიჩქარ|არითმეტიკულ საშუალო/u,
        /\b(?:percent|equation|probability|function)\b/u,
        /[×÷/*%]/u,
        /\b\d+\s*\/\s*\d+\b/u
      ];
      const multiStep = [
        /პირველ დღეს.*მეორე დღეს/u,
        /ჯერ .* შემდეგ/u,
        /ორივე რაოდენობ/u,
        /ორი მოქმედებ/u
      ];
      if (grade === 1 && (maxValue > 20 || containsAny(text, advanced) || containsAny(text, multiStep))) return false;
      if (grade === 2 && (maxValue > 100 || containsAny(text, advanced))) return false;
      if (grade === 3 && containsAny(text, advanced.slice(0, 1))) return false;
    }

    if (subject.includes('geo') || subject.includes('kab') || subject === 'ქართული' || subject === 'ქართული ენა და ლიტერატურა') {
      if (grade <= 2 && containsAny(text, [
        /რომელი დასკვნა|გამომდინარეობს|თვითკონტროლ|საკუთარ მუშაობას აკონტროლებს/u,
        /შემასმენელ|სინონიმ|ანტონიმ|მეტაფორ|ეპითეტ/u,
        /საჭირო ცვლილებას ნიშნავდა/u
      ])) return false;
    }

    if (subject.includes('eng') || subject.includes('enb') || subject === 'ინგლისური') {
      if (grade <= 2 && question?.bilingual !== true && !question?.visual && !question?.media) return false;
      if (grade === 1 && containsAny(text, [
        /past tense|present continuous|before sharing|which tense|why did/u
      ])) return false;
    }

    if (subject.includes('nat') || subject === 'ბუნება') {
      if (grade === 1 && containsAny(text, [
        /აორთქლებ|კონდენსაც|ექსპერიმენტ|ცვლად|ამფიბი|ქვეწარმავალ|გაზომვად/u
      ])) return false;
    }

    return true;
  };

  root.QUESTION_POLICY = Object.freeze({
    version: '2026.07.27-v1',
    normalize,
    stableHash,
    canonicalSemanticText,
    contentFingerprint,
    semanticFingerprint,
    hasPlaceholderOption,
    hasCompleteInstruction,
    isGradeAppropriate
  });
})(typeof window !== 'undefined' ? window : globalThis);
