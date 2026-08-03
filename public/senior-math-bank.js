(function registerSeniorMathBank(root) {
  'use strict';

  if (typeof Q_POOL === 'undefined') return;

  const CURRICULUM_SOURCE = 'https://mes.gov.ge/uploads/files/gzamkvlevi/%E1%83%9B%E1%83%90%E1%83%97%E1%83%94%E1%83%9B%E1%83%90%E1%83%A2%E1%83%98%E1%83%99%E1%83%90-%E1%83%A1%E1%83%90%E1%83%91%E1%83%90%E1%83%96%E1%83%9D.pdf';
  const GRADES = [7, 8, 9, 10, 11, 12];
  const VERSION_COUNT = 4;
  const QUESTIONS_PER_SEMESTER_VERSION = 24;
  const roman = ['', '', '', '', '', '', '', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ka-GE')
    .replace(/[“”„"'`’]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const seeded = (seed, min, span) => min + ((seed * 37 + seed * seed * 11) % span + span) % span;
  const pick = (items, index) => items[((index % items.length) + items.length) % items.length];
  const gcd = (a, b) => {
    let x = Math.abs(a), y = Math.abs(b);
    while (y) [x, y] = [y, x % y];
    return x || 1;
  };
  const fraction = (numerator, denominator) => {
    const divisor = gcd(numerator, denominator);
    return `${numerator / divisor}/${denominator / divisor}`;
  };
  const uniqueOptions = (correct, distractors) => {
    const values = [correct, ...distractors].map(String);
    const rows = [];
    values.forEach(value => {
      if (value && !rows.some(existing => normalize(existing) === normalize(value))) rows.push(value);
    });
    return rows.slice(0, 4);
  };
  const numericDistractors = answer => {
    const value = Number(answer);
    const delta = Math.max(1, Math.round(Math.abs(value) * 0.1));
    return [value + delta, value - delta, -value, value + 2 * delta];
  };
  const mcq = (text, correct, distractors, explain, pts = 2) => ({
    text,
    type: 'multiple_choice',
    opts: uniqueOptions(correct, distractors),
    correct: 0,
    pts,
    explain,
  });
  const numberMcq = (text, answer, explain, pts = 2, distractors = numericDistractors(answer)) =>
    mcq(text, answer, distractors, explain, pts);
  const calc = (text, answer, explain, pts = 2, tolerance = 0) => ({
    text,
    type: 'calc',
    correct: Number(answer),
    pts,
    tolerance,
    explain,
  });

  const ALGEBRA_TOPICS = {
    7: [
      ['integer_add', 'integer_sub', 'integer_product', 'fraction_add', 'ratio_value', 'proportion',
        'percent_of', 'expression_value', 'combine_terms', 'linear_eq', 'linear_eq_parentheses', 'inequality',
        'function_value', 'direct_variation', 'mean', 'median', 'mode', 'range',
        'probability', 'sequence_next', 'arithmetic_nth', 'order_operations', 'equation_story', 'rate'],
      ['fraction_multiply', 'percent_change', 'ratio_value', 'proportion', 'expression_value', 'expand',
        'factor_common', 'linear_eq', 'linear_eq_parentheses', 'inequality', 'function_value', 'line_value',
        'slope', 'direct_variation', 'mean', 'mean_missing', 'probability_complement', 'sequence_next',
        'arithmetic_nth', 'power_product', 'square_root', 'formula_substitution', 'equation_story', 'data_interpret'],
    ],
    8: [
      ['integer_product', 'fraction_multiply', 'percent_change', 'proportion', 'expression_value', 'combine_terms',
        'expand', 'factor_common', 'linear_eq', 'linear_eq_parentheses', 'inequality', 'system',
        'function_value', 'line_value', 'slope', 'direct_variation', 'mean_missing', 'probability',
        'arithmetic_nth', 'power_product', 'power_quotient', 'square_root', 'scientific_notation', 'data_interpret'],
      ['fraction_add', 'percent_of', 'ratio_value', 'expression_value', 'expand', 'factor_common',
        'linear_eq', 'inequality', 'system', 'function_value', 'line_value', 'slope',
        'direct_variation', 'arithmetic_nth', 'arithmetic_sum', 'power_product', 'power_quotient', 'square_root',
        'scientific_notation', 'probability_complement', 'combinations', 'formula_substitution', 'rate', 'weighted_mean'],
    ],
    9: [
      ['expression_value', 'expand', 'factor_common', 'linear_eq_parentheses', 'inequality', 'system',
        'function_value', 'line_value', 'slope', 'direct_variation', 'power_product', 'power_quotient',
        'scientific_notation', 'square_root', 'quadratic_value', 'factor_quadratic', 'quadratic_roots', 'discriminant',
        'arithmetic_nth', 'arithmetic_sum', 'probability', 'combinations', 'weighted_mean', 'data_interpret'],
      ['expand', 'factor_common', 'rational_eq', 'absolute_eq', 'system', 'function_comp',
        'inverse_value', 'line_value', 'slope', 'quadratic_value', 'factor_quadratic', 'quadratic_roots',
        'discriminant', 'quadratic_vertex', 'arithmetic_nth', 'arithmetic_sum', 'geometric_nth', 'probability_complement',
        'combinations', 'weighted_mean', 'polynomial_remainder', 'formula_substitution', 'equation_story', 'data_interpret'],
    ],
    10: [
      ['expand', 'factor_common', 'rational_eq', 'absolute_eq', 'system', 'function_comp',
        'inverse_value', 'line_value', 'slope', 'quadratic_value', 'factor_quadratic', 'quadratic_roots',
        'discriminant', 'quadratic_vertex', 'arithmetic_nth', 'arithmetic_sum', 'geometric_nth', 'geometric_sum',
        'exponential_eq', 'probability', 'probability_complement', 'combinations', 'weighted_mean', 'data_interpret'],
      ['power_product', 'power_quotient', 'scientific_notation', 'rational_eq', 'absolute_eq', 'system',
        'function_comp', 'inverse_value', 'quadratic_roots', 'discriminant', 'quadratic_vertex', 'polynomial_remainder',
        'arithmetic_sum', 'geometric_nth', 'geometric_sum', 'exponential_eq', 'log_eval', 'probability',
        'combinations', 'binomial_term', 'weighted_mean', 'formula_substitution', 'equation_story', 'data_interpret'],
    ],
    11: [
      ['rational_eq', 'absolute_eq', 'system', 'function_comp', 'inverse_value', 'quadratic_roots',
        'discriminant', 'quadratic_vertex', 'polynomial_remainder', 'arithmetic_nth', 'arithmetic_sum', 'geometric_nth',
        'geometric_sum', 'exponential_eq', 'log_eval', 'log_eq', 'trig_value', 'probability',
        'probability_complement', 'combinations', 'binomial_term', 'weighted_mean', 'formula_substitution', 'data_interpret'],
      ['rational_eq', 'function_comp', 'inverse_value', 'quadratic_vertex', 'polynomial_remainder', 'arithmetic_sum',
        'geometric_sum', 'exponential_eq', 'log_eval', 'log_eq', 'trig_value', 'trig_eq',
        'probability', 'probability_complement', 'combinations', 'binomial_term', 'weighted_mean', 'mean_missing',
        'scientific_notation', 'formula_substitution', 'equation_story', 'rate', 'data_interpret', 'order_operations'],
    ],
    12: [
      ['rational_eq', 'absolute_eq', 'function_comp', 'inverse_value', 'quadratic_vertex', 'polynomial_remainder',
        'arithmetic_nth', 'arithmetic_sum', 'geometric_nth', 'geometric_sum', 'exponential_eq', 'log_eval',
        'log_eq', 'trig_value', 'trig_eq', 'probability', 'probability_complement', 'combinations',
        'binomial_term', 'weighted_mean', 'mean_missing', 'formula_substitution', 'equation_story', 'data_interpret'],
      ['system', 'function_comp', 'inverse_value', 'quadratic_roots', 'discriminant', 'polynomial_remainder',
        'arithmetic_sum', 'geometric_sum', 'exponential_eq', 'log_eval', 'log_eq', 'trig_eq',
        'probability', 'probability_complement', 'combinations', 'binomial_term', 'weighted_mean', 'mean_missing',
        'scientific_notation', 'formula_substitution', 'equation_story', 'rate', 'order_operations', 'data_interpret'],
    ],
  };

  const GEOMETRY_TOPICS = {
    7: [
      ['supplementary_angles', 'vertical_angles', 'triangle_angle', 'triangle_exterior', 'isosceles_angle', 'parallel_angles',
        'rectangle_perimeter', 'rectangle_area', 'triangle_area', 'parallelogram_area', 'coordinate_axis_distance', 'midpoint',
        'quadrilateral_angle', 'polygon_interior_sum', 'scale_length', 'similarity_side', 'congruence_rule', 'symmetry_lines',
        'translation_point', 'reflection_axis', 'circle_radius_diameter', 'circle_circumference', 'data_perimeter', 'spatial_faces'],
      ['triangle_angle', 'triangle_exterior', 'isosceles_angle', 'parallel_angles', 'rectangle_area', 'triangle_area',
        'parallelogram_area', 'trapezoid_area', 'pythagorean_hypotenuse', 'pythagorean_leg', 'coordinate_axis_distance', 'midpoint',
        'quadrilateral_angle', 'regular_polygon_angle', 'scale_length', 'similarity_side', 'congruence_rule', 'symmetry_lines',
        'translation_point', 'reflection_axis', 'circle_radius_diameter', 'circle_area', 'data_perimeter', 'spatial_edges'],
    ],
    8: [
      ['triangle_angle', 'triangle_exterior', 'isosceles_angle', 'parallel_angles', 'quadrilateral_angle', 'regular_polygon_angle',
        'rectangle_area', 'triangle_area', 'parallelogram_area', 'trapezoid_area', 'rhombus_area', 'pythagorean_hypotenuse',
        'pythagorean_leg', 'coordinate_distance', 'midpoint', 'slope_parallel', 'scale_length', 'similarity_side',
        'similarity_area', 'circle_circumference', 'circle_area', 'translation_point', 'reflection_axis', 'prism_volume'],
      ['vertical_angles', 'parallel_angles', 'triangle_area', 'trapezoid_area', 'rhombus_area', 'pythagorean_hypotenuse',
        'pythagorean_leg', 'coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular', 'similarity_side',
        'similarity_area', 'circle_circumference', 'circle_area', 'central_angle', 'inscribed_angle', 'tangent_radius',
        'translation_point', 'reflection_axis', 'prism_volume', 'cube_surface', 'cylinder_volume', 'spatial_diagonal'],
    ],
    9: [
      ['triangle_angle', 'parallel_angles', 'regular_polygon_angle', 'triangle_area', 'trapezoid_area', 'rhombus_area',
        'pythagorean_hypotenuse', 'pythagorean_leg', 'coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular',
        'similarity_side', 'similarity_area', 'circle_circumference', 'circle_area', 'central_angle', 'inscribed_angle',
        'tangent_radius', 'chord_distance', 'trig_sine', 'trig_cosine', 'prism_volume', 'cube_surface'],
      ['polygon_interior_sum', 'regular_polygon_angle', 'coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular',
        'line_distance_axis', 'similarity_side', 'similarity_area', 'central_angle', 'inscribed_angle', 'tangent_radius',
        'chord_distance', 'trig_sine', 'trig_cosine', 'trig_tangent', 'vector_add', 'vector_length',
        'dot_product', 'translation_point', 'prism_volume', 'cylinder_volume', 'cone_volume', 'spatial_diagonal'],
    ],
    10: [
      ['polygon_interior_sum', 'regular_polygon_angle', 'coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular',
        'line_distance_axis', 'similarity_side', 'similarity_area', 'central_angle', 'inscribed_angle', 'tangent_radius',
        'chord_distance', 'trig_sine', 'trig_cosine', 'trig_tangent', 'vector_add', 'vector_length',
        'dot_product', 'translation_point', 'prism_volume', 'cylinder_volume', 'cone_volume', 'spatial_diagonal'],
      ['coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular', 'line_distance_axis', 'circle_equation',
        'similarity_side', 'similarity_area', 'central_angle', 'inscribed_angle', 'chord_distance', 'trig_sine',
        'trig_cosine', 'trig_tangent', 'vector_add', 'vector_length', 'dot_product', 'vector_scalar',
        'translation_point', 'prism_volume', 'cylinder_volume', 'cone_volume', 'sphere_surface', 'spatial_diagonal'],
    ],
    11: [
      ['coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular', 'line_distance_axis', 'circle_equation',
        'central_angle', 'inscribed_angle', 'chord_distance', 'trig_sine', 'trig_cosine', 'trig_tangent',
        'vector_add', 'vector_length', 'dot_product', 'vector_scalar', 'vector_collinear', 'translation_point',
        'prism_volume', 'cylinder_volume', 'cone_volume', 'sphere_surface', 'spatial_diagonal', 'plane_section'],
      ['coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular', 'circle_equation', 'similarity_area',
        'central_angle', 'inscribed_angle', 'tangent_radius', 'trig_sine', 'trig_cosine', 'trig_tangent',
        'vector_add', 'vector_length', 'dot_product', 'vector_scalar', 'vector_collinear', 'translation_point',
        'prism_volume', 'cylinder_volume', 'cone_volume', 'sphere_surface', 'spatial_diagonal', 'plane_section'],
    ],
    12: [
      ['coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular', 'line_distance_axis', 'circle_equation',
        'similarity_area', 'central_angle', 'inscribed_angle', 'trig_sine', 'trig_cosine', 'trig_tangent',
        'vector_add', 'vector_length', 'dot_product', 'vector_scalar', 'vector_collinear', 'translation_point',
        'prism_volume', 'cylinder_volume', 'cone_volume', 'sphere_surface', 'spatial_diagonal', 'plane_section'],
      ['coordinate_distance', 'midpoint', 'slope_parallel', 'slope_perpendicular', 'circle_equation', 'similarity_side',
        'central_angle', 'inscribed_angle', 'chord_distance', 'trig_sine', 'trig_cosine', 'trig_tangent',
        'vector_add', 'vector_length', 'dot_product', 'vector_scalar', 'vector_collinear', 'translation_point',
        'prism_volume', 'cylinder_volume', 'cone_volume', 'sphere_surface', 'spatial_diagonal', 'plane_section'],
    ],
  };

  function algebraQuestion(code, grade, seed) {
    const a = seeded(seed, 2, 7), b = seeded(seed + 3, 2, 8), c = seeded(seed + 7, 2, 9);
    const signA = seed % 2 ? -a : a;
    switch (code) {
      case 'integer_add': return numberMcq(`გამოთვალე: ${signA} + ${b}.`, signA + b, `${signA}+${b}=${signA + b}.`);
      case 'integer_sub': return numberMcq(`გამოთვალე: ${signA} − ${b}.`, signA - b, `${signA}−${b}=${signA - b}.`);
      case 'integer_product': return numberMcq(`გამოთვალე: ${-a} · ${b}.`, -a * b, `უარყოფითი და დადებითი რიცხვების ნამრავლი უარყოფითია: −${a}·${b}=−${a * b}.`);
      case 'fraction_add': {
        const denominator = pick([6, 8, 10, 12], seed), n1 = 1 + seed % 3, n2 = 1 + (seed + 1) % 3;
        const answer = fraction(n1 + n2, denominator);
        return mcq(`გამოთვალე და გაამარტივე: ${n1}/${denominator} + ${n2}/${denominator}.`, answer,
          [fraction(n1 * n2, denominator), fraction(n1 + n2, denominator * 2), fraction(Math.abs(n1 - n2), denominator)],
          `ტოლმნიშვნელიან წილადებში მრიცხველები იკრიბება: (${n1}+${n2})/${denominator}=${answer}.`);
      }
      case 'fraction_multiply': {
        const answer = fraction(a, b * c);
        return mcq(`გამოთვალე და გაამარტივე: ${a}/${b} · 1/${c}.`, answer,
          [fraction(a + 1, b + c), fraction(a, b + c), fraction(a * c, b)],
          `მრიცხველები და მნიშვნელები მრავლდება: ${a}/(${b}·${c})=${answer}.`);
      }
      case 'ratio_value': {
        const factor = 2 + seed % 5, left = a * factor, right = b * factor;
        return mcq(`შეამოკლე შეფარდება ${left}:${right}.`, `${a}:${b}`, [`${left}:${b}`, `${a}:${right}`, `${b}:${a}`],
          `ორივე წევრი იყოფა ${factor}-ზე, ამიტომ ${left}:${right}=${a}:${b}.`);
      }
      case 'proportion': {
        const factor = 2 + seed % 4, answer = b * factor;
        return numberMcq(`თუ ${a}/${b} = ${a * factor}/x, იპოვე x.`, answer,
          `ჯვარედინი ნამრავლით ${a}x=${b}·${a * factor}, ამიტომ x=${answer}.`);
      }
      case 'percent_of': {
        const percent = pick([10, 20, 25, 40, 50], seed), whole = 20 * a, answer = whole * percent / 100;
        return numberMcq(`იპოვე ${whole}-ის ${percent}%.`, answer, `${percent}%=${percent}/100, ამიტომ ${whole}·${percent}/100=${answer}.`);
      }
      case 'percent_change': {
        const original = 20 * a, percent = pick([10, 20, 25, 50], seed), answer = original * (100 + percent) / 100;
        return numberMcq(`ფასი ${original} ლარი იყო და ${percent}%-ით გაიზარდა. რა გახდა ახალი ფასი?`, answer,
          `ზრდა არის ${original * percent / 100} ლარი; ახალი ფასი ${original}+${original * percent / 100}=${answer} ლარია.`);
      }
      case 'expression_value': {
        const x = b, answer = a * x - c;
        return numberMcq(`იპოვე ${a}x−${c}-ის მნიშვნელობა, როცა x=${x}.`, answer, `${a}·${x}−${c}=${answer}.`);
      }
      case 'combine_terms': return mcq(`გაამარტივე: ${a}x + ${b}x − ${c}x.`, `${a + b - c}x`,
        [`${a + b + c}x`, `${a * b - c}x`, `${a + b - c}`], `ერთგვაროვანი წევრების კოეფიციენტები იკრიბება: (${a}+${b}−${c})x=${a + b - c}x.`);
      case 'expand': return mcq(`გახსენი ფრჩხილები: ${a}(x+${b}).`, `${a}x+${a * b}`,
        [`${a}x+${b}`, `x+${a * b}`, `${a + b}x`], `გამანაწილებელი თვისებით ${a}·x+${a}·${b}=${a}x+${a * b}.`);
      case 'factor_common': return mcq(`გამოიტანე საერთო მამრავლი: ${a * b}x + ${a * c}.`, `${a}(${b}x+${c})`,
        [`${b}(${a}x+${c})`, `${a * b}(x+${c})`, `${a}(${b + c}x)`], `ორივე წევრის საერთო მამრავლია ${a}.`);
      case 'linear_eq': {
        const x = c, rhs = a * x + b;
        return numberMcq(`ამოხსენი განტოლება: ${a}x+${b}=${rhs}.`, x, `${a}x=${rhs - b}, ამიტომ x=${rhs - b}/${a}=${x}.`);
      }
      case 'linear_eq_parentheses': {
        const x = c, rhs = a * (x + b);
        return numberMcq(`ამოხსენი: ${a}(x+${b})=${rhs}.`, x, `გაყოფით ${a}-ზე მივიღებთ x+${b}=${x + b}; ამიტომ x=${x}.`);
      }
      case 'inequality': {
        const threshold = b, rhs = a * threshold + c;
        return mcq(`ამოხსენი უტოლობა: ${a}x+${c}>${rhs}.`, `x>${threshold}`,
          [`x<${threshold}`, `x≥${threshold}`, `x<${threshold + 1}`], `${a}x>${a * threshold}; დადებით ${a}-ზე გაყოფით x>${threshold}.`);
      }
      case 'system': {
        const x = a + b, y = a, sum = x + y, diff = x - y;
        return numberMcq(`სისტემაში x+y=${sum} და x−y=${diff}. იპოვე x.`, x,
          `განტოლებების შეკრებით 2x=${sum + diff}, ამიტომ x=${x}.`);
      }
      case 'function_value': {
        const x = c, answer = a * x + b;
        return numberMcq(`მოცემულია f(x)=${a}x+${b}. იპოვე f(${x}).`, answer, `f(${x})=${a}·${x}+${b}=${answer}.`);
      }
      case 'line_value': {
        const x = b, answer = a * x - c;
        return numberMcq(`წრფეზე y=${a}x−${c} იპოვე y, როცა x=${x}.`, answer, `y=${a}·${x}−${c}=${answer}.`);
      }
      case 'slope': {
        const x1 = b, y1 = c, x2 = b + a, y2 = c + a * 2;
        return numberMcq(`იპოვე (${x1};${y1}) და (${x2};${y2}) წერტილებზე გამავალი წრფის დახრილობა.`, 2,
          `m=(${y2}−${y1})/(${x2}−${x1})=${a * 2}/${a}=2.`);
      }
      case 'direct_variation': {
        const k = a, x = b, answer = k * x;
        return numberMcq(`y პირდაპირ პროპორციულია x-ის და y=${k}x. იპოვე y, როცა x=${x}.`, answer, `y=${k}·${x}=${answer}.`);
      }
      case 'mean': {
        const values = [a, b, c, a + b + c], answer = (values.reduce((sum, value) => sum + value, 0)) / 4;
        return numberMcq(`იპოვე რიცხვების ${values.join(', ')} საშუალო არითმეტიკული.`, answer,
          `ჯამია ${answer * 4}; ${answer * 4}/4=${answer}.`);
      }
      case 'mean_missing': {
        const target = a + b, values = [target - 2, target + 2, target], missing = target;
        return numberMcq(`ოთხი რიცხვის საშუალოა ${target}. სამი რიცხვია ${values.join(', ')}. იპოვე მეოთხე.`, missing,
          `სრული ჯამი ${target}·4=${target * 4}; ცნობილი რიცხვების ჯამი ${values.reduce((s, v) => s + v, 0)}, ამიტომ მეოთხეა ${missing}.`);
      }
      case 'median': {
        const values = [a, a + 2, a + 4, a + 7, a + 9];
        return numberMcq(`იპოვე მედიანა: ${values.join(', ')}.`, a + 4, `დალაგებულ ხუთ რიცხვში მედიანაა შუა, მესამე წევრი — ${a + 4}.`);
      }
      case 'mode': return numberMcq(`იპოვე მოდა: ${a}, ${b}, ${a}, ${c}, ${a}, ${b}.`, a, `ყველაზე ხშირად გვხვდება ${a}.`);
      case 'range': {
        const values = [a, a + b, a + b + c, a + 1], answer = b + c;
        return numberMcq(`იპოვე მონაცემთა დიაპაზონი: ${values.join(', ')}.`, answer,
          `დიაპაზონი = უდიდესი − უმცირესი = ${a + b + c}−${a}=${answer}.`);
      }
      case 'probability': {
        const red = a, blue = b, answer = fraction(red, red + blue);
        return mcq(`ტომარაშია ${red} წითელი და ${blue} ლურჯი ბურთი. რა არის წითელი ბურთის ამოღების ალბათობა?`, answer,
          [fraction(blue, red + blue), fraction(red, blue), fraction(1, red + blue)], `ხელსაყრელია ${red}, ყველა შედეგი — ${red + blue}; P=${answer}.`);
      }
      case 'probability_complement': {
        const success = a, total = a + b, failure = b, answer = fraction(failure, total);
        return mcq(`ცდაში წარმატების ალბათობაა ${fraction(success, total)}. რა არის წარუმატებლობის ალბათობა?`, answer,
          [fraction(success, total), fraction(1, total), fraction(failure, success)], `დამატებითი მოვლენის ალბათობაა 1−${fraction(success, total)}=${answer}.`);
      }
      case 'sequence_next': {
        const step = a, start = b, answer = start + 4 * step;
        return numberMcq(`იპოვე შემდეგი წევრი: ${start}, ${start + step}, ${start + 2 * step}, ${start + 3 * step}, ...`, answer,
          `ყოველ წევრს ემატება ${step}; შემდეგია ${answer}.`);
      }
      case 'arithmetic_nth': {
        const first = a, step = b, n = 6 + seed % 5, answer = first + (n - 1) * step;
        return numberMcq(`არითმეტიკულ პროგრესიაში a₁=${first}, d=${step}. იპოვე a${n}.`, answer,
          `aₙ=a₁+(n−1)d=${first}+${n - 1}·${step}=${answer}.`, 3);
      }
      case 'arithmetic_sum': {
        const first = a, step = b, n = 6, last = first + 5 * step, answer = n * (first + last) / 2;
        return numberMcq(`არითმეტიკულ პროგრესიაში a₁=${first}, d=${step}. იპოვე პირველი ${n} წევრის ჯამი.`, answer,
          `a₆=${last}; S₆=6(${first}+${last})/2=${answer}.`, 3);
      }
      case 'power_product': return mcq(`გაამარტივე: x^${a}·x^${b}.`, `x^${a + b}`,
        [`x^${a * b}`, `x^${Math.abs(a - b)}`, `2x^${a + b}`], `ერთნაირი ფუძის ხარისხების ნამრავლში მაჩვენებლები იკრიბება: ${a}+${b}=${a + b}.`);
      case 'power_quotient': return mcq(`გაამარტივე: x^${a + b}:x^${a}.`, `x^${b}`,
        [`x^${a}`, `x^${a + b}`, `x^${a * b}`], `გაყოფისას მაჩვენებლები აკლდება: ${a + b}−${a}=${b}.`);
      case 'square_root': {
        const value = a + b, square = value * value;
        return numberMcq(`გამოთვალე √${square}.`, value, `რადგან ${value}²=${square}, √${square}=${value}.`);
      }
      case 'scientific_notation': {
        const exponent = 3 + seed % 4, coefficient = 2 + seed % 7, value = coefficient * 10 ** exponent;
        return mcq(`ჩაწერე ${value} სტანდარტული სახით.`, `${coefficient}·10^${exponent}`,
          [`${coefficient}·10^${exponent - 1}`, `${coefficient * 10}·10^${exponent}`, `${coefficient / 10}·10^${exponent}`],
          `${value}-ში პირველი მნიშვნელოვანი ციფრის შემდეგ ათწილადის გადასატანად საჭიროა ${exponent} ნაბიჯი.`);
      }
      case 'quadratic_value': {
        const x = a, answer = x * x - b * x + c;
        return numberMcq(`იპოვე f(${x}), თუ f(x)=x²−${b}x+${c}.`, answer, `${x}²−${b}·${x}+${c}=${answer}.`);
      }
      case 'factor_quadratic': {
        const p = a, q = b;
        return mcq(`დაშალე მამრავლებად: x²−${p + q}x+${p * q}.`, `(x−${p})(x−${q})`,
          [`(x+${p})(x+${q})`, `(x−${p * q})(x−${p + q})`, `(x−${p})(x+${q})`],
          `${p}+${q}=${p + q} და ${p}·${q}=${p * q}, ამიტომ გამოსახულებაა (x−${p})(x−${q}).`, 3);
      }
      case 'quadratic_roots': {
        const p = a, q = b;
        return mcq(`ამოხსენი: x²−${p + q}x+${p * q}=0.`, `x=${p} ან x=${q}`,
          [`x=−${p} ან x=−${q}`, `x=${p + q}`, `x=${p * q}`],
          `მარცხენა მხარეა (x−${p})(x−${q}); ნამრავლი ნულია, როცა x=${p} ან x=${q}.`, 3);
      }
      case 'discriminant': {
        const B = a + b, C = a * b, answer = B * B - 4 * C;
        return numberMcq(`იპოვე x²−${B}x+${C}=0 განტოლების დისკრიმინანტი.`, answer,
          `D=b²−4ac=(−${B})²−4·1·${C}=${answer}.`, 3);
      }
      case 'quadratic_vertex': {
        const h = a, k = b;
        return mcq(`იპოვე y=(x−${h})²+${k} პარაბოლის წვერო.`, `(${h};${k})`,
          [`(${h + 1};${k})`, `(${h};${k + 1})`, `(${h + 2};${k + 2})`], `წვეროს ფორმაში y=(x−h)²+k წვეროა (h;k).`);
      }
      case 'geometric_nth': {
        const first = a, ratio = 2, n = 5, answer = first * ratio ** (n - 1);
        return numberMcq(`გეომეტრიულ პროგრესიაში b₁=${first}, q=${ratio}. იპოვე b${n}.`, answer,
          `bₙ=b₁q^(n−1)=${first}·2^4=${answer}.`, 3);
      }
      case 'geometric_sum': {
        const first = a, ratio = 2, n = 4, answer = first * (ratio ** n - 1) / (ratio - 1);
        return numberMcq(`გეომეტრიულ პროგრესიაში b₁=${first}, q=2. იპოვე პირველი 4 წევრის ჯამი.`, answer,
          `S₄=${first}(2⁴−1)/(2−1)=${first}·15=${answer}.`, 3);
      }
      case 'exponential_eq': {
        const exponent = 2 + seed % 5, value = 2 ** exponent;
        return numberMcq(`ამოხსენი: 2^x=${value}.`, exponent, `რადგან ${value}=2^${exponent}, x=${exponent}.`);
      }
      case 'log_eval': {
        const exponent = 2 + seed % 4, value = 2 ** exponent;
        return numberMcq(`გამოთვალე log₂${value}.`, exponent, `2^${exponent}=${value}, ამიტომ log₂${value}=${exponent}.`);
      }
      case 'log_eq': {
        const answer = 2 ** a;
        return numberMcq(`ამოხსენი: log₂x=${a}.`, answer, `ლოგარითმის განსაზღვრებით x=2^${a}=${answer}.`);
      }
      case 'function_comp': {
        const x = c, f = value => a * value + b, g = value => value - 1, answer = f(g(x));
        return numberMcq(`f(x)=${a}x+${b}, g(x)=x−1. იპოვე (f∘g)(${x}).`, answer,
          `g(${x})=${x - 1}; შემდეგ f(${x - 1})=${a}·${x - 1}+${b}=${answer}.`, 3);
      }
      case 'inverse_value': {
        const x = c, y = a * x + b;
        return numberMcq(`f(x)=${a}x+${b}. იპოვე f⁻¹(${y}).`, x,
          `${y}=${a}x+${b}; აქედან x=(${y}−${b})/${a}=${x}.`, 3);
      }
      case 'absolute_eq': {
        const answer = a;
        return mcq(`ამოხსენი: |x−${b}|=${a}.`, `x=${b + a} ან x=${b - a}`,
          [`x=${b + a}`, `x=${a - b} ან x=${b - a}`, `x=${b}`],
          `x−${b}=${a} ან x−${b}=−${a}; ამიტომ x=${b + a} ან x=${b - a}.`, 3);
      }
      case 'rational_eq': {
        const x = c, numerator = a * x;
        return numberMcq(`ამოხსენი: ${numerator}/x=${a}, სადაც x≠0.`, x,
          `ორივე მხარის x-ზე გამრავლებით ${numerator}=${a}x; ამიტომ x=${x}.`, 3);
      }
      case 'combinations': {
        const n = 5 + seed % 5, answer = n * (n - 1) / 2;
        return numberMcq(`${n} მოსწავლიდან რამდენი განსხვავებული წყვილი შეიძლება შეირჩეს?`, answer,
          `C(${n},2)=${n}·${n - 1}/2=${answer}.`, 3);
      }
      case 'weighted_mean': {
        const x = a, y = b, answer = (2 * x + y) / 3;
        return numberMcq(`ორი დავალების ქულაა ${x}, ხოლო მესამე დავალების — ${y}. პირველი ორი ერთნაირი წონით ითვლება. იპოვე სამივე ქულის საშუალო.`, answer,
          `საშუალო = (${x}+${x}+${y})/3=${2 * x + y}/3=${answer}.`, 3, [answer + 1, answer - 1, x + y]);
      }
      case 'trig_value': return mcq('გამოთვალე sin 30°.', '1/2', ['√3/2', '1', '0'], 'ერთეულოვან წრეზე sin 30°=1/2.');
      case 'trig_eq': return mcq('0°≤x≤180° შუალედში ამოხსენი sin x=1.', 'x=90°', ['x=0°', 'x=180°', 'x=45°'], 'სინუსი მაქსიმალურ მნიშვნელობას 1-ს იღებს 90°-ზე.');
      case 'polynomial_remainder': {
        const root = a, value = root * root + b * root + c;
        return numberMcq(`P(x)=x²+${b}x+${c}. იპოვე P(x)-ის x−${root}-ზე გაყოფის ნაშთი.`, value,
          `ნაშთის თეორემით ნაშთია P(${root})=${root}²+${b}·${root}+${c}=${value}.`, 3);
      }
      case 'binomial_term': {
        const n = 5 + seed % 3, answer = n;
        return numberMcq(`იპოვე x^(n−1)y წევრის კოეფიციენტი (x+y)^n გაშლაში, როცა n=${n}.`, answer,
          `ბინომის ფორმულით შესაბამისი კოეფიციენტია C(${n},1)=${n}.`, 3);
      }
      case 'formula_substitution': {
        const answer = (a + b) * c;
        return numberMcq(`ფორმულაში S=(a+b)h ჩასვი a=${a}, b=${b}, h=${c}.`, answer,
          `S=(${a}+${b})·${c}=${answer}.`);
      }
      case 'equation_story': {
        const x = c, total = a * x + b;
        return numberMcq(`${a} ერთნაირი რვეული და ${b}-ლარიანი კალამი ერთად ${total} ლარი ღირს. რა ღირს ერთი რვეული?`, x,
          `${a}x+${b}=${total}; ${a}x=${total - b}; x=${x}.`);
      }
      case 'rate': {
        const hours = a, speed = 10 * b, answer = hours * speed;
        return numberMcq(`ავტომობილი ${speed} კმ/სთ სიჩქარით ${hours} საათი მოძრაობდა. რა მანძილი გაიარა?`, answer,
          `s=vt=${speed}·${hours}=${answer} კმ.`);
      }
      case 'order_operations': {
        const answer = a + b * c;
        return numberMcq(`გამოთვალე მოქმედებათა რიგის დაცვით: ${a}+${b}·${c}.`, answer,
          `ჯერ გამრავლება: ${b}·${c}=${b * c}; შემდეგ შეკრება: ${a}+${b * c}=${answer}.`);
      }
      case 'data_interpret': {
        const values = [a, b + 2, c + 4, a + b], max = Math.max(...values);
        return numberMcq(`ცხრილში მოცემულია ოთხი შედეგი: ${values.join(', ')}. იპოვე უდიდესი.`, max,
          `რიცხვების შედარებით უდიდესია ${max}.`);
      }
      default: throw new Error(`Unknown algebra topic: ${code}`);
    }
  }

  function geometryQuestion(code, grade, seed) {
    const a = seeded(seed, 3, 7), b = seeded(seed + 5, 3, 8), c = seeded(seed + 11, 2, 7);
    switch (code) {
      case 'supplementary_angles': {
        const angle = 30 + 5 * (seed % 20), answer = 180 - angle;
        return numberMcq(`ორი მომიჯნავე კუთხე გაშლილ კუთხეს ქმნის. ერთი კუთხეა ${angle}°. იპოვე მეორე.`, answer,
          `მომიჯნავე კუთხეების ჯამია 180°; 180°−${angle}°=${answer}°.`);
      }
      case 'vertical_angles': {
        const angle = 35 + 5 * (seed % 18);
        return numberMcq(`ორი წრფე იკვეთება. ერთ-ერთი კუთხეა ${angle}°. იპოვე მისი ვერტიკალური კუთხე.`, angle,
          `ვერტიკალური კუთხეები ტოლია, ამიტომ პასუხია ${angle}°.`);
      }
      case 'triangle_angle': {
        const first = 30 + 5 * (seed % 8), second = 40 + 5 * ((seed + 3) % 8), answer = 180 - first - second;
        return numberMcq(`სამკუთხედის ორი კუთხეა ${first}° და ${second}°. იპოვე მესამე კუთხე.`, answer,
          `სამკუთხედის კუთხეების ჯამია 180°; 180°−${first}°−${second}°=${answer}°.`);
      }
      case 'triangle_exterior': {
        const first = 30 + 5 * (seed % 8), second = 40 + 5 * ((seed + 2) % 8), answer = first + second;
        return numberMcq(`სამკუთხედის ორ არამოსაზღვრე შიდა კუთხეს აქვს ${first}° და ${second}°. იპოვე შესაბამისი გარე კუთხე.`, answer,
          `გარე კუთხე უდრის ორი არამოსაზღვრე შიდა კუთხის ჯამს: ${first}°+${second}°=${answer}°.`);
      }
      case 'isosceles_angle': {
        const vertex = 40 + 10 * (seed % 8), answer = (180 - vertex) / 2;
        return numberMcq(`ტოლფერდა სამკუთხედის წვეროს კუთხეა ${vertex}°. იპოვე ფუძის კუთხე.`, answer,
          `ფუძის კუთხეები ტოლია: (180°−${vertex}°)/2=${answer}°.`);
      }
      case 'parallel_angles': {
        const angle = 40 + 5 * (seed % 20), answer = 180 - angle;
        return numberMcq(`პარალელურ წრფეებს მკვეთი კვეთს. ერთი შიდა ცალმხრივი კუთხეა ${angle}°. იპოვე მეორე.`, answer,
          `შიდა ცალმხრივი კუთხეების ჯამია 180°; მეორეა ${answer}°.`);
      }
      case 'rectangle_perimeter': {
        const answer = 2 * (a + b);
        return numberMcq(`მართკუთხედის გვერდებია ${a} სმ და ${b} სმ. იპოვე პერიმეტრი.`, answer,
          `P=2(a+b)=2(${a}+${b})=${answer} სმ.`);
      }
      case 'rectangle_area': {
        const answer = a * b;
        return numberMcq(`მართკუთხედის სიგრძეა ${a} სმ, სიგანე — ${b} სმ. იპოვე ფართობი.`, answer,
          `S=ab=${a}·${b}=${answer} სმ².`);
      }
      case 'triangle_area': {
        const base = 2 * a, height = b, answer = base * height / 2;
        return numberMcq(`სამკუთხედის ფუძეა ${base} სმ, შესაბამისი სიმაღლე — ${height} სმ. იპოვე ფართობი.`, answer,
          `S=ah/2=${base}·${height}/2=${answer} სმ².`);
      }
      case 'parallelogram_area': {
        const answer = a * b;
        return numberMcq(`პარალელოგრამის ფუძეა ${a} სმ, სიმაღლე — ${b} სმ. იპოვე ფართობი.`, answer,
          `S=ah=${a}·${b}=${answer} სმ².`);
      }
      case 'trapezoid_area': {
        const base1 = a, base2 = a + 2 * c, height = b, answer = (base1 + base2) * height / 2;
        return numberMcq(`ტრაპეციის ფუძეებია ${base1} სმ და ${base2} სმ, სიმაღლე — ${height} სმ. იპოვე ფართობი.`, answer,
          `S=(a+b)h/2=(${base1}+${base2})·${height}/2=${answer} სმ².`);
      }
      case 'rhombus_area': {
        const d1 = 2 * a, d2 = 2 * b, answer = d1 * d2 / 2;
        return numberMcq(`რომბის დიაგონალებია ${d1} სმ და ${d2} სმ. იპოვე ფართობი.`, answer,
          `S=d₁d₂/2=${d1}·${d2}/2=${answer} სმ².`);
      }
      case 'pythagorean_hypotenuse': {
        const triple = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]], seed);
        return numberMcq(`მართკუთხა სამკუთხედის კათეტებია ${triple[0]} სმ და ${triple[1]} სმ. იპოვე ჰიპოტენუზა.`, triple[2],
          `c=√(${triple[0]}²+${triple[1]}²)=√${triple[2] ** 2}=${triple[2]} სმ.`, 3);
      }
      case 'pythagorean_leg': {
        const triple = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]], seed);
        return numberMcq(`მართკუთხა სამკუთხედის ჰიპოტენუზაა ${triple[2]} სმ, ერთი კათეტი — ${triple[0]} სმ. იპოვე მეორე კათეტი.`, triple[1],
          `b=√(${triple[2]}²−${triple[0]}²)=√${triple[1] ** 2}=${triple[1]} სმ.`, 3);
      }
      case 'coordinate_axis_distance': {
        const x1 = -a, x2 = b, answer = x2 - x1;
        return numberMcq(`რიცხვით ღერძზე იპოვე A(${x1}) და B(${x2}) წერტილებს შორის მანძილი.`, answer,
          `მანძილია |${x2}−(${x1})|=${answer}.`);
      }
      case 'coordinate_distance': {
        const scale = 1 + seed % 3, dx = 3 * scale, dy = 4 * scale, answer = 5 * scale;
        return numberMcq(`იპოვე A(${a};${b}) და B(${a + dx};${b + dy}) წერტილებს შორის მანძილი.`, answer,
          `AB=√(${dx}²+${dy}²)=√${answer ** 2}=${answer}.`, 3);
      }
      case 'midpoint': {
        const x1 = a, y1 = b, x2 = a + 2 * c, y2 = b + 2 * a;
        return mcq(`იპოვე A(${x1};${y1}) და B(${x2};${y2}) მონაკვეთის შუაწერტილი.`, `(${x1 + c};${y1 + a})`,
          [`(${x1 + c};${y1 + c})`, `(${x2 - c};${y2})`, `(${x1 + x2};${y1 + y2})`],
          `M((x₁+x₂)/2;(y₁+y₂)/2)=(${x1 + c};${y1 + a}).`);
      }
      case 'quadrilateral_angle': {
        const first = 80 + 5 * (seed % 5), second = 90, third = 100 + 5 * ((seed + 1) % 5), answer = 360 - first - second - third;
        return numberMcq(`ოთხკუთხედის სამი კუთხეა ${first}°, ${second}° და ${third}°. იპოვე მეოთხე.`, answer,
          `ოთხკუთხედის კუთხეების ჯამია 360°; დარჩენილი კუთხეა ${answer}°.`);
      }
      case 'polygon_interior_sum': {
        const n = 5 + seed % 5, answer = (n - 2) * 180;
        return numberMcq(`იპოვე ${n}-კუთხედის შიდა კუთხეების ჯამი.`, answer,
          `ჯამია (n−2)·180°=(${n}−2)·180°=${answer}°.`);
      }
      case 'regular_polygon_angle': {
        const n = pick([4, 5, 6, 8, 10], seed), answer = (n - 2) * 180 / n;
        return numberMcq(`იპოვე წესიერი ${n}-კუთხედის ერთი შიდა კუთხე.`, answer,
          `ერთი კუთხეა (n−2)·180°/n=(${n}−2)·180°/${n}=${answer}°.`);
      }
      case 'scale_length': {
        const factor = 2 + seed % 5, drawing = a, answer = drawing * factor;
        return numberMcq(`ნახაზის მასშტაბია 1:${factor}. ნახაზზე მონაკვეთი ${drawing} სმ-ია. რა არის რეალური სიგრძე?`, answer,
          `${drawing}·${factor}=${answer} სმ.`);
      }
      case 'similarity_side': {
        const factor = 2 + seed % 3, small = a, answer = small * factor;
        return numberMcq(`მსგავსი სამკუთხედების შესაბამისი გვერდების შეფარდებაა 1:${factor}. მცირე სამკუთხედის გვერდია ${small} სმ. იპოვე დიდი სამკუთხედის შესაბამისი გვერდი.`, answer,
          `${small}·${factor}=${answer} სმ.`, 3);
      }
      case 'similarity_area': {
        const factor = 2 + seed % 3, smallArea = a * a, answer = smallArea * factor ** 2;
        return numberMcq(`მსგავსი ფიგურების სიგრძეთა შეფარდებაა 1:${factor}. მცირე ფიგურის ფართობია ${smallArea} სმ². იპოვე დიდი ფიგურის ფართობი.`, answer,
          `ფართობთა შეფარდება არის 1:${factor ** 2}; ამიტომ ${smallArea}·${factor ** 2}=${answer} სმ².`, 3);
      }
      case 'congruence_rule': return mcq('ორი სამკუთხედის ორი გვერდი და მათ შორის კუთხე შესაბამისად ტოლია. რომელი ნიშანი ამტკიცებს მათ ტოლობას?', 'გვერდი–კუთხე–გვერდი',
        ['კუთხე–კუთხე–კუთხე', 'მხოლოდ ერთი გვერდი', 'მხოლოდ ერთი კუთხე'], 'ორი გვერდისა და მათ შორის კუთხის ტოლობა არის სამკუთხედთა ტოლობის SAS ნიშანი.');
      case 'symmetry_lines': return mcq('რამდენი სიმეტრიის ღერძი აქვს კვადრატს?', '4', ['2', '1', '8'], 'კვადრატს აქვს ორი დიაგონალური და ორი გვერდების შუაწერტილებზე გამავალი სიმეტრიის ღერძი.');
      case 'translation_point': {
        const dx = a, dy = -b, x = c, y = a;
        return mcq(`წერტილი A(${x};${y}) გადაიტანეს ვექტორით (${dx};${dy}). იპოვე მიღებული წერტილი.`, `(${x + dx};${y + dy})`,
          [`(${x - dx};${y + dy})`, `(${x + dx};${y - dy})`, `(${dx};${dy})`],
          `კოორდინატებს ემატება ვექტორის კომპონენტები: (${x}+${dx};${y}+(${dy}))=(${x + dx};${y + dy}).`);
      }
      case 'reflection_axis': {
        const x = a, y = b;
        return mcq(`იპოვე A(${x};${y}) წერტილის ანარეკლი y-ღერძის მიმართ.`, `(${-x};${y})`,
          [`(${x + 1};${y})`, `(${x};${y + 1})`, `(${x + 2};${y + 2})`], 'y-ღერძის მიმართ არეკვლისას x-ის ნიშანი იცვლება, y უცვლელია.');
      }
      case 'circle_radius_diameter': {
        const radius = a, answer = 2 * radius;
        return numberMcq(`წრის რადიუსია ${radius} სმ. იპოვე დიამეტრი.`, answer, `d=2r=2·${radius}=${answer} სმ.`);
      }
      case 'circle_circumference': {
        const radius = a, answer = 2 * radius;
        return mcq(`წრის რადიუსია ${radius} სმ. ჩაწერე წრეწირის სიგრძე π-ის გამოყენებით.`, `${answer}π სმ`,
          [`${radius}π სმ`, `${radius * radius}π სმ`, `${answer} სმ`], `L=2πr=2π·${radius}=${answer}π სმ.`);
      }
      case 'circle_area': {
        const radius = a, answer = radius * radius;
        return mcq(`წრის რადიუსია ${radius} სმ. ჩაწერე ფართობი π-ის გამოყენებით.`, `${answer}π სმ²`,
          [`${2 * radius}π სმ²`, `${radius}π სმ²`, `${answer} სმ²`], `S=πr²=π·${radius}²=${answer}π სმ².`);
      }
      case 'central_angle': {
        const fractionDenominator = pick([3, 4, 6, 8], seed), answer = 360 / fractionDenominator;
        return numberMcq(`წრეწირის 1/${fractionDenominator} ნაწილის შესაბამისი ცენტრალური კუთხე რამდენია?`, answer,
          `360°/${fractionDenominator}=${answer}°.`);
      }
      case 'inscribed_angle': {
        const arc = 40 + 10 * (seed % 12), answer = arc / 2;
        return numberMcq(`ჩახაზული კუთხე ეყრდნობა ${arc}°-იან რკალს. იპოვე კუთხე.`, answer,
          `ჩახაზული კუთხე შესაბამისი რკალის ნახევარია: ${arc}°/2=${answer}°.`);
      }
      case 'tangent_radius': return mcq('რა კუთხეს ქმნის წრეწირის მხები შეხების წერტილში გატარებულ რადიუსთან?', '90°',
        ['45°', '60°', '180°'], 'მხები შეხების წერტილში რადიუსის მართობულია.');
      case 'chord_distance': {
        const radius = 5 * (1 + seed % 2), halfChord = 3 * (1 + seed % 2), distance = 4 * (1 + seed % 2);
        return numberMcq(`წრის რადიუსია ${radius} სმ, ქორდის ნახევარი — ${halfChord} სმ. იპოვე ცენტრიდან ქორდამდე მანძილი.`, distance,
          `რადიუსი, ნახევარქორდა და მანძილი მართკუთხა სამკუთხედს ქმნის: d=√(${radius}²−${halfChord}²)=${distance} სმ.`, 3);
      }
      case 'slope_parallel': {
        const slope = a;
        return numberMcq(`წრფის დახრილობაა ${slope}. რა დახრილობა აქვს მის პარალელურ წრფეს?`, slope,
          'პარალელურ წრფეებს ერთნაირი დახრილობა აქვთ.');
      }
      case 'slope_perpendicular': {
        const slope = a;
        return mcq(`წრფის დახრილობაა ${slope}. რა დახრილობა აქვს მის მართობულ წრფეს?`, `−1/${slope}`,
          [`1/${slope}`, `${slope}`, `−${slope}`], `მართობული წრფეების დახრილობათა ნამრავლია −1, ამიტომ m₂=−1/${slope}.`);
      }
      case 'line_distance_axis': {
        const x = -a;
        return numberMcq(`რა მანძილია A(${x};${b}) წერტილიდან y-ღერძამდე?`, a,
          `y-ღერძამდე მანძილი არის x-კოორდინატის მოდული: |${x}|=${a}.`);
      }
      case 'circle_equation': {
        const radius = a, answer = radius * radius;
        return mcq(`რომელი განტოლება აღწერს ცენტრით O(0;0) და რადიუსით ${radius} წრეს?`, `x²+y²=${answer}`,
          [`x+y=${radius}`, `x²−y²=${answer}`, `(x−${radius})²+y²=1`], `ცენტრით (0;0) წრის განტოლებაა x²+y²=r²=${answer}.`);
      }
      case 'trig_sine': return mcq('მართკუთხა სამკუთხედში α კუთხის მოპირდაპირე კათეტია 3, ჰიპოტენუზა — 5. იპოვე sin α.', '3/5',
        ['4/5', '3/4', '5/3'], 'sin α = მოპირდაპირე კათეტი / ჰიპოტენუზა = 3/5.');
      case 'trig_cosine': return mcq('მართკუთხა სამკუთხედში α კუთხის მიმდებარე კათეტია 4, ჰიპოტენუზა — 5. იპოვე cos α.', '4/5',
        ['3/5', '4/3', '5/4'], 'cos α = მიმდებარე კათეტი / ჰიპოტენუზა = 4/5.');
      case 'trig_tangent': return mcq('მართკუთხა სამკუთხედში α კუთხის მოპირდაპირე კათეტია 3, მიმდებარე — 4. იპოვე tan α.', '3/4',
        ['4/3', '3/5', '4/5'], 'tan α = მოპირდაპირე კათეტი / მიმდებარე კათეტი = 3/4.');
      case 'vector_add': {
        const x1 = a, y1 = b, x2 = c, y2 = a;
        return mcq(`იპოვე (${x1};${y1}) და (${x2};${y2}) ვექტორების ჯამი.`, `(${x1 + x2};${y1 + y2})`,
          [`(${x1 - x2};${y1 - y2})`, `(${x1 * x2};${y1 * y2})`, `(${x2};${y2})`],
          `კომპონენტები ცალ-ცალკე იკრიბება: (${x1}+${x2};${y1}+${y2})=(${x1 + x2};${y1 + y2}).`);
      }
      case 'vector_length': {
        const scale = 1 + seed % 3, x = 3 * scale, y = 4 * scale, answer = 5 * scale;
        return numberMcq(`იპოვე ვექტორის (${x};${y}) სიგრძე.`, answer,
          `|v|=√(${x}²+${y}²)=${answer}.`, 3);
      }
      case 'dot_product': {
        const x1 = a, y1 = b, x2 = c, y2 = -a, answer = x1 * x2 + y1 * y2;
        return numberMcq(`იპოვე (${x1};${y1})·(${x2};${y2}) სკალარული ნამრავლი.`, answer,
          `${x1}·${x2}+${y1}·(${y2})=${answer}.`, 3);
      }
      case 'vector_scalar': {
        const factor = 2 + seed % 4;
        return mcq(`გაამრავლე ვექტორი (${a};${b}) რიცხვ ${factor}-ზე.`, `(${a * factor};${b * factor})`,
          [`(${a + factor};${b + factor})`, `(${a};${b * factor})`, `(${a * factor};${b})`],
          `ორივე კომპონენტი მრავლდება ${factor}-ზე.`);
      }
      case 'vector_collinear': return mcq('რომელი ვექტორია (2;3) ვექტორის კოლინეარული?', '(4;6)',
        ['(4;5)', '(−3;2)', '(2;−3)'], '(4;6)=2·(2;3), ამიტომ ვექტორები კოლინეარულია.');
      case 'prism_volume': {
        const baseArea = a * b, height = c, answer = baseArea * height;
        return numberMcq(`პრიზმის ფუძის ფართობია ${baseArea} სმ², სიმაღლე — ${height} სმ. იპოვე მოცულობა.`, answer,
          `V=Sფ·h=${baseArea}·${height}=${answer} სმ³.`);
      }
      case 'cube_surface': {
        const side = a, answer = 6 * side * side;
        return numberMcq(`კუბის წიბოა ${side} სმ. იპოვე სრული ზედაპირის ფართობი.`, answer,
          `S=6a²=6·${side}²=${answer} სმ².`);
      }
      case 'cylinder_volume': {
        const radius = a, height = b, coefficient = radius * radius * height;
        return mcq(`ცილინდრის რადიუსია ${radius} სმ, სიმაღლე — ${height} სმ. ჩაწერე მოცულობა π-ის გამოყენებით.`, `${coefficient}π სმ³`,
          [`${2 * radius * height}π სმ³`, `${radius * height}π სმ³`, `${coefficient} სმ³`],
          `V=πr²h=π·${radius}²·${height}=${coefficient}π სმ³.`, 3);
      }
      case 'cone_volume': {
        const radius = 3 * (1 + seed % 2), height = 3 * b, coefficient = radius * radius * height / 3;
        return mcq(`კონუსის რადიუსია ${radius} სმ, სიმაღლე — ${height} სმ. ჩაწერე მოცულობა π-ის გამოყენებით.`, `${coefficient}π სმ³`,
          [`${radius * radius * height}π სმ³`, `${radius * height}π სმ³`, `${coefficient} სმ³`],
          `V=πr²h/3=π·${radius}²·${height}/3=${coefficient}π სმ³.`, 3);
      }
      case 'sphere_surface': {
        const radius = a, coefficient = 4 * radius * radius;
        return mcq(`სფეროს რადიუსია ${radius} სმ. ჩაწერე ზედაპირის ფართობი π-ის გამოყენებით.`, `${coefficient}π სმ²`,
          [`${2 * radius}π სმ²`, `${radius * radius}π სმ²`, `${coefficient} სმ²`],
          `S=4πr²=4π·${radius}²=${coefficient}π სმ².`, 3);
      }
      case 'spatial_diagonal': {
        const scale = 1 + seed % 2, x = 2 * scale, y = 3 * scale, z = 6 * scale, answer = 7 * scale;
        return numberMcq(`მართკუთხა პარალელეპიპედის ზომებია ${x} სმ, ${y} სმ და ${z} სმ. იპოვე სივრცული დიაგონალი.`, answer,
          `d=√(${x}²+${y}²+${z}²)=√${answer ** 2}=${answer} სმ.`, 3);
      }
      case 'plane_section': return mcq('კუბს სიბრტყე კვეთს ოთხივე გვერდით წიბოს შუაწერტილებში. როგორი ფიგურაა კვეთა?', 'კვადრატი',
        ['სამკუთხედი', 'წრე', 'ხუთკუთხედი'], 'ოთხი შუაწერტილი ერთ სიბრტყეში თანაბარი გვერდებითა და მართი კუთხეებით კვადრატს ქმნის.');
      case 'data_perimeter': {
        const sides = [a, b, c, a + b], answer = sides.reduce((sum, value) => sum + value, 0);
        return numberMcq(`ოთხკუთხედის გვერდების სიგრძეებია ${sides.join(', ')} სმ. იპოვე პერიმეტრი.`, answer,
          `პერიმეტრი გვერდების ჯამია: ${sides.join('+')}=${answer} სმ.`);
      }
      case 'spatial_faces': return mcq('რამდენი წახნაგი აქვს მართკუთხა პარალელეპიპედს?', '6', ['4', '8', '12'], 'მართკუთხა პარალელეპიპედს ექვსი მართკუთხა წახნაგი აქვს.');
      case 'spatial_edges': return mcq('რამდენი წიბო აქვს კუბს?', '12', ['6', '8', '16'], 'კუბს აქვს 12 წიბო.');
      default: throw new Error(`Unknown geometry topic: ${code}`);
    }
  }

  function decorate(question, direction, grade, semester, version, slot, code) {
    const prefix = direction === 'algebra' ? 'alg' : 'geom';
    const subject = direction === 'algebra' ? 'ალგებრა' : 'გეომეტრია';
    const unit = slot < 12 ? 'a' : 'b';
    const instructionVariants = [
      'ყურადღებით შეასრულე დავალება:',
      'გამოიყენე შესაბამისი წესი და იპოვე პასუხი:',
      'იმსჯელე ნაბიჯ-ნაბიჯ:',
      'შეამოწმე გამოთვლა და ჩაწერე ან აირჩიე პასუხი:',
    ];
    const result = {
      ...question,
      text: `${semester === 1 ? 'I სემესტრის' : 'II სემესტრის'} დავალება — ${instructionVariants[version - 1]} ${question.text}`,
      id: `sm26-${prefix}-g${grade}-s${semester}-v${version}-q${slot + 1}`,
      subject,
      grade,
      gradeMin: grade,
      gradeMax: grade,
      semester,
      topicGroup: `s${semester}-unit-${unit}`,
      skill: `${direction}.${code}`,
      templateFamily: `sm.${prefix}.g${grade}.s${semester}.${code}.v${version}`,
      templateShape: `sm.${prefix}.g${grade}.s${semester}.${code}`,
      outcome: `NCP-CANDIDATE.MATH.G${grade}.${direction.toUpperCase()}.${code.toUpperCase()}`,
      curriculumSource: CURRICULUM_SOURCE,
      reviewStatus: 'generated_review_required',
      qualityStatus: 'machine_validated',
      generated: true,
      difficulty: grade <= 9 ? 2 : 3,
    };
    const displayedCorrect = question.type === 'multiple_choice' ? question.opts?.[question.correct] : null;
    if (slot % 3 === 0 && /^-?\d+(?:\.\d+)?$/.test(String(displayedCorrect ?? ''))) {
      result.type = 'calc';
      result.correct = Number(displayedCorrect);
      result.tolerance = 0;
      delete result.opts;
    }
    if ((slot + version) % 5 === 0) {
      result.visual = {
        kind: direction === 'algebra' ? 'tokens' : 'cards',
        alt: `${subject} — ${question.text}`,
        caption: 'დააკვირდი მოცემულ მონაცემებს და შემდეგ აირჩიე პასუხი.',
        items: direction === 'algebra' ? ['მოცემული', 'ფორმულა', 'გამოთვლა'] : ['პირობა', 'ნახაზი', 'შედეგი'],
        variantKey: `${prefix}-g${grade}-s${semester}-v${version}-q${slot + 1}`,
      };
    }
    return result;
  }

  const tests = [];
  const stats = {
    version: '2026.07-senior-math-v1',
    grades: {},
    tests: 0,
    questions: 0,
    versions: VERSION_COUNT,
    validation: { checked: 0, blocked: 0, directAnswerAgreement: 0, curatedRuleTable: 0 },
  };

  GRADES.forEach(grade => {
    stats.grades[grade] = { algebra: { tests: 0, questions: 0 }, geometry: { tests: 0, questions: 0 } };
    [
      ['algebra', 'alg', 'ალგებრა', ALGEBRA_TOPICS],
      ['geometry', 'geom', 'გეომეტრია', GEOMETRY_TOPICS],
    ].forEach(([direction, prefix, subject, curriculum]) => {
      for (let version = 1; version <= VERSION_COUNT; version += 1) {
        const rows = [];
        for (let semester = 1; semester <= 2; semester += 1) {
          const topics = curriculum[grade][semester - 1];
          if (topics.length !== QUESTIONS_PER_SEMESTER_VERSION) {
            throw new Error(`${prefix} grade ${grade} semester ${semester} must define ${QUESTIONS_PER_SEMESTER_VERSION} topics`);
          }
          topics.forEach((code, slot) => {
            const seed = grade * 100000 + semester * 10000 + version * 100 + slot;
            const question = direction === 'algebra'
              ? algebraQuestion(code, grade, seed)
              : geometryQuestion(code, grade, seed);
            rows.push(decorate(question, direction, grade, semester, version, slot, code));
          });
        }
        rows.forEach(row => {
          const result = root.EDUTEST_GENERATED_VALIDATOR
            ? root.EDUTEST_GENERATED_VALIDATOR.validateAndMark(row, { expectedGrade: grade })
            : { valid: true, evidence: 'validator_unavailable' };
          stats.validation.checked += 1;
          if (!result.valid) stats.validation.blocked += 1;
          if (result.evidence === 'direct_answer_agreement') stats.validation.directAnswerAgreement += 1;
          if (result.evidence === 'curated_rule_table') stats.validation.curatedRuleTable += 1;
        });
        Q_POOL[`${prefix}-g${grade}-${version}`] = rows;
        stats.grades[grade][direction].questions += rows.length;
        stats.questions += rows.length;
      }

      const paid = grade >= 9;
      const minutes = grade <= 8 ? 20 : grade <= 10 ? 25 : 30;
      const definitions = [
        ['s1-u1', 'I სემ. · თემატური 1', 1, 's1-unit-a', 10, 'unit'],
        ['s1-u2', 'I სემ. · თემატური 2', 1, 's1-unit-b', 10, 'unit'],
        ['s1-sum', 'I სემ. · შემაჯამებელი', 1, null, 20, 'sum'],
        ['s2-u1', 'II სემ. · თემატური 1', 2, 's2-unit-a', 10, 'unit'],
        ['s2-u2', 'II სემ. · თემატური 2', 2, 's2-unit-b', 10, 'unit'],
        ['s2-sum', 'II სემ. · შემაჯამებელი', 2, null, 20, 'sum'],
      ];
      definitions.forEach(([suffix, label, semester, topicGroup, count, testType]) => {
        tests.push({
          id: `${prefix}-g${grade}-${suffix}`,
          title: `${subject} — ${roman[grade]} კლასი — ${label}`,
          subject,
          grade,
          pool: `${prefix}-g${grade}`,
          count,
          time: testType === 'sum' ? minutes + 10 : minutes,
          attempts: 2,
          paid,
          semester,
          topicGroup,
          testType,
          sumTest: testType === 'sum',
          curriculumDirection: direction,
          catalogVersion: '2026.07',
        });
      });
      stats.grades[grade][direction].tests += definitions.length;
      stats.tests += definitions.length;
    });
  });

  stats.questionsPerGradeDirection = VERSION_COUNT * QUESTIONS_PER_SEMESTER_VERSION * 2;
  stats.questionsPerGrade = stats.questionsPerGradeDirection * 2;
  stats.testsPerGradeDirection = 6;
  stats.testsPerGrade = 12;

  root.EDUTEST_SENIOR_MATH_TESTS = Object.freeze(tests);
  root.EDUTEST_SENIOR_MATH_STATS = Object.freeze(stats);
})(typeof window !== 'undefined' ? window : globalThis);
