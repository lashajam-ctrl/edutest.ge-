(function registerGeneratedBankValidator(root) {
  'use strict';

  const normalize = value => String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('ka-GE')
    .replace(/[“”„"'`’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  const optionKey = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ka-GE').replace(/\s+/gu, ' ').trim();
  const numericTokens = value => String(value ?? '').match(/-?\d+(?:[.,]\d+)?(?:\/\d+)?/g) ?? [];
  const answerValue = question => {
    if (question?.type === 'multiple_choice' || question?.type === 'true_false') {
      return question.opts?.[Number(question.correct)];
    }
    if (question?.type === 'fill') return question.blanks?.[0];
    return question?.correct;
  };

  const barDirection = text => {
    const value = normalize(text);
    if (/(უმცირეს|ყველაზე მცირე|ყველაზე დაბალ|ყველაზე ნაკლებ|smallest|lowest|least|наименьш|самый низк|меньше всего)/u.test(value)) return 'min';
    if (/(უმაღლეს|უდიდეს|ყველაზე მეტ|ყველაზე დიდ|ყველაზე სწრაფ|highest|largest|greatest|most|самый высок|наибольш|больше всего)/u.test(value)) return 'max';
    return null;
  };

  function validateChart(question, errors) {
    if (question?.visual?.kind !== 'bars') return;
    const direction = barDirection(question.text);
    if (!direction) return;
    const labels = Array.isArray(question.visual.labels) ? question.visual.labels.map(String) : [];
    const values = Array.isArray(question.visual.values) ? question.visual.values.map(Number) : [];
    if (labels.length < 2 || labels.length !== values.length || values.some(value => !Number.isFinite(value))) {
      errors.push('invalid_bar_chart');
      return;
    }
    const extremum = direction === 'max' ? Math.max(...values) : Math.min(...values);
    const winners = labels.filter((_, index) => values[index] === extremum);
    if (winners.length !== 1) {
      errors.push('ambiguous_bar_extremum');
      return;
    }
    if (optionKey(answerValue(question)) !== optionKey(winners[0])) errors.push('bar_answer_mismatch');
  }

  function validateQuestion(question, context = {}) {
    const errors = [];
    const warnings = [];
    if (!question || !String(question.id ?? '').trim()) errors.push('missing_id');
    if (!String(question?.text ?? '').trim()) errors.push('missing_prompt');
    if (!Number.isFinite(Number(question?.pts)) || Number(question.pts) <= 0) errors.push('invalid_points');
    if (!String(question?.explain ?? '').trim()) errors.push('missing_explanation');

    if (context.expectedGrade != null) {
      const expectedGrade = Number(context.expectedGrade);
      if (Number(question?.grade) !== expectedGrade
        || Number(question?.gradeMin) !== expectedGrade
        || Number(question?.gradeMax) !== expectedGrade) errors.push('grade_mismatch');
    }
    if (Number.isFinite(Number(question?.topicIntroducedGrade))
      && Number(question.grade) < Number(question.topicIntroducedGrade)) errors.push('premature_topic');

    if (question?.type === 'multiple_choice' || question?.type === 'true_false') {
      const options = Array.isArray(question.opts) ? question.opts : [];
      const keys = options.map(optionKey);
      if (options.length < 2) errors.push('insufficient_options');
      if (keys.some(key => !key)) errors.push('empty_option');
      if (new Set(keys).size !== keys.length) errors.push('duplicate_options');
      if (!Number.isInteger(Number(question.correct))
        || Number(question.correct) < 0
        || Number(question.correct) >= options.length) errors.push('invalid_correct_index');
      if (Number.isInteger(Number(question.correct))) {
        const correctKey = keys[Number(question.correct)];
        if (correctKey && keys.filter(key => key === correctKey).length !== 1) errors.push('non_unique_correct_answer');
      }
    } else if (question?.type === 'calc') {
      if (!Number.isFinite(Number(question.correct))) errors.push('invalid_calc_answer');
    } else if (question?.type === 'fill') {
      const gaps = (String(question.text ?? '').match(/___/g) ?? []).length;
      if (!Array.isArray(question.blanks) || question.blanks.length !== 1
        || !String(question.blanks[0] ?? '').trim() || gaps !== 1) errors.push('invalid_fill_answer');
    } else if (!['match', 'order', 'short_answer'].includes(question?.type)) {
      errors.push('unsupported_question_type');
    }

    validateChart(question, errors);

    const answer = answerValue(question);
    const explanationKey = normalize(question?.explain);
    const answerKey = normalize(answer);
    const answerNumbers = numericTokens(answer);
    const explanationNumbers = new Set(numericTokens(question?.explain));
    const directAgreement = Boolean(answerKey && (
      explanationKey.includes(answerKey)
      || (answerNumbers.length > 0 && answerNumbers.every(value => explanationNumbers.has(value)))
    ));
    const curatedAgreement = Boolean(
      !directAgreement
      && String(question?.skill ?? question?.topicCode ?? '').trim()
      && String(question?.outcome ?? '').trim()
      && String(question?.explain ?? '').trim()
    );
    if (!directAgreement && !curatedAgreement) errors.push('explanation_answer_mismatch');
    if (curatedAgreement) warnings.push('curated_rule_required');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      evidence: directAgreement ? 'direct_answer_agreement' : curatedAgreement ? 'curated_rule_table' : 'none',
    };
  }

  function validateAndMark(question, context = {}) {
    const result = validateQuestion(question, context);
    question.validationStatus = result.valid ? 'release_validated' : 'blocked';
    question.validationEvidence = result.evidence;
    if (!result.valid) question.validationErrors = [...result.errors];
    else delete question.validationErrors;
    return result;
  }

  root.EDUTEST_GENERATED_VALIDATOR = Object.freeze({
    normalize,
    optionKey,
    answerValue,
    barDirection,
    validateQuestion,
    validateAndMark,
  });
})(typeof window !== 'undefined' ? window : globalThis);
