import { R, q, frac, tryFrac, linear, terms, poly, polyEval, polyMul, power, factor, num, money, rootsTex, checkEqual, checkLimit } from '../../lib/index.js';
import { M } from './_shared.js';

// (x − r)^m as LaTeX: fac(3, 2) → "(x - 3)^{2}", fac(0, 3) → "x^{3}".
const fac = (r, m = 1) => `${factor(r)}${m > 1 ? `^{${m}}` : ''}`;
// A product of factors (x − r)^m, with any power of x written first: facs([[2, 1], [0, 3]]) → "x^{3}(x - 2)".
const facs = (list) => [...list].sort((p, q) => (p[0] === 0 ? -1 : 0) - (q[0] === 0 ? -1 : 0)).map(([r, m = 1]) => fac(r, m)).join('');
// A coefficient in front of factors, with 1 and −1 hidden.
const coef = (a) => (a === 1 ? '' : a === -1 ? '-' : num(a));
// a + bi as LaTeX.
const cx = (a, b) => terms([[a, ''], [b, 'i']]);
// Evaluate a real polynomial at the complex number re + im·i (Horner). Returns [real part, imaginary part].
const cEval = (coefs, re, im) => coefs.reduce(([x, y], c) => [x * re - y * im + c, x * im + y * re], [0, 0]);
const lim = (dir, s) => R`\lim_{x \to ${dir}\infty} f(x) = ${s > 0 ? '' : '-'}\infty`;
const REL = { '>': (v) => v > 0, '<': (v) => v < 0, '>=': (v) => v >= 0, '<=': (v) => v <= 0 };
const RELTEX = { '>': '>', '<': '<', '>=': R`\ge`, '<=': R`\le` };
// Solution sets with their LaTeX and a membership test, so a check can compare them with the inequality itself.
const outside = (lo, hi, loClosed, hiClosed = loClosed) => ({
  text: R`\(x ${loClosed ? R`\le` : '<'} ${lo}\) or \(x ${hiClosed ? R`\ge` : '>'} ${hi}\)`,
  has: (x) => (loClosed ? x <= lo : x < lo) || (hiClosed ? x >= hi : x > hi),
});
const between = (lo, hi, loClosed, hiClosed = loClosed) => ({
  text: R`\(${lo} ${loClosed ? R`\le` : '<'} x ${hiClosed ? R`\le` : '<'} ${hi}\)`,
  has: (x) => (loClosed ? x >= lo : x > lo) && (hiClosed ? x <= hi : x < hi),
});
const ray = (op, a) => ({ text: R`\(x ${RELTEX[op]} ${a}\)`, has: (x) => REL[op](x - a) });
const agrees = (region, truth, xs) => xs.every((x) => region.has(x) === truth(x));
// Passes when the right region matches the inequality at every test point and each wrong region fails somewhere.
const regionCheck = (right, wrongs, truth, xs) => () => (agrees(right, truth, xs) && wrongs.every((w) => !agrees(w, truth, xs)) ? true : 'a solution set does not match the inequality');

// ───────────── Easy ─────────────

function easyEndBehavior(rng) {
  const a = rng.nonzero(-5, 5);
  const factored = rng.bool(0.4);
  let n;
  let fTex;
  let f;
  let how;
  if (factored) {
    const p = rng.int(1, 3);
    const m = rng.int(1, 3);
    const r = rng.nonzero(-5, 5);
    n = p + m;
    fTex = `${coef(a)}${power('x', p)}${fac(r, m)}`;
    f = (x) => a * x ** p * (x - r) ** m;
    how = R`Multiply the leading terms of the factors: \(${coef(a)}${power('x', p)} \cdot ${power('x', m)} = ${terms([[a, power('x', n)]])}\).`;
  } else {
    n = rng.int(2, 6);
    const coefs = [a];
    for (let i = 1; i <= n; i++) coefs.push(rng.bool(0.45) ? rng.int(-9, 9) : 0);
    fTex = poly(coefs);
    f = (x) => polyEval(coefs, x);
    how = R`For large \(|x|\) the leading term \(${terms([[a, power('x', n)]])}\) dominates all the others.`;
  }
  const right = Math.sign(a);
  const left = n % 2 === 0 ? right : -right;
  const opt = (l, r) => R`\(${lim('-', l)}\) and \(${lim('', r)}\)`;
  return q({
    prompt: R`Describe the end behaviour of \(f(x) = ${fTex}\).`,
    correct: opt(left, right),
    wrong: [
      { value: opt(-left, -right), why: R`The leading coefficient \(${a}\) is ${a > 0 ? 'positive' : 'negative'}, so the right end goes ${a > 0 ? 'up' : 'down'}.` },
      { value: opt(-left, right), why: R`The degree \(${n}\) is ${n % 2 ? 'odd, so the two ends go in opposite directions' : 'even, so both ends go the same way'}.` },
      opt(left, -right),
    ],
    solution: [
      how,
      R`The degree \(${n}\) is ${n % 2 ? 'odd: the ends point in opposite directions' : 'even: both ends point the same way'}. The leading coefficient is ${a > 0 ? 'positive' : 'negative'}: the right end goes ${a > 0 ? 'up' : 'down'}.`,
      R`So \(${lim('-', left)}\) and \(${lim('', right)}\).`,
    ],
    rule: 3,
    skill: 'end behaviour',
    check: () => (Math.sign(f(1e3)) === right && Math.sign(f(-1e3)) === left ? true : 'end behaviour does not match the function'),
  });
}

function easyMultiplicity(rng) {
  const roots = rng.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 3).sort((a, b) => a - b);
  const touch = rng.int(0, 2);
  const mult = roots.map((_, i) => (i === touch ? rng.pick([2, 2, 4]) : rng.pick([1, 1, 3])));
  const f = (x) => roots.reduce((acc, r, i) => acc * (x - r) ** mult[i], 1);
  const r0 = roots[touch];
  return q({
    prompt: R`At which zero does the graph of \(f(x) = ${facs(roots.map((r, i) => [r, mult[i]]))}\) touch the \(x\)-axis and turn back without crossing it?`,
    correct: r0,
    fmt: (v) => R`\(x = ${num(v)}\)`,
    wrong: [
      ...roots.filter((r) => r !== r0).map((r) => ({ value: r, why: R`The factor for \(x = ${r}\) has an odd exponent, so the graph crosses the axis there.` })),
      { value: -r0, why: R`The factor \(${factor(r0)}\) is zero when \(x = ${r0}\).` },
      mult[touch],
    ],
    solution: [
      R`The zeros are \(${roots.join(R`,\ `)}\), with multiplicities \(${mult.join(R`,\ `)}\) in that order.`,
      R`At a zero of even multiplicity the factor does not change sign, so the graph touches the axis and turns back.`,
      R`Only \(x = ${r0}\) has even multiplicity (\(${mult[touch]}\)).`,
    ],
    rule: 1,
    skill: 'multiplicity',
    check: () => (f(r0) === 0 && f(r0 - 0.01) * f(r0 + 0.01) > 0 && roots.every((r) => r === r0 || f(r - 0.01) * f(r + 0.01) < 0) ? true : 'sign changes do not match'),
  });
}

function easyCountZeros(rng) {
  if (rng.bool(0.4)) {
    const n = rng.int(3, 7);
    const coefs = [rng.nonzero(-6, 6)];
    for (let i = 1; i <= n; i++) coefs.push(rng.bool(0.4) ? rng.int(-9, 9) : 0);
    if (coefs.slice(1).every((c) => c === 0)) coefs[n] = rng.nonzero(-9, 9);
    return q({
      prompt: R`How many zeros does \(f(x) = ${poly(coefs)}\) have in the complex numbers, counted with multiplicity?`,
      correct: n,
      wrong: [{ value: coefs.filter((c) => c !== 0).length, why: 'That counts the terms. The number of zeros is the degree.' }, n - 1, n + 1, Math.abs(coefs[0])],
      solution: [R`By the Fundamental Theorem of Algebra, a polynomial of degree \(n\) has exactly \(n\) complex zeros, counted with multiplicity.`, R`The degree is \(${n}\), so there are \(${n}\) zeros.`],
      rule: 0,
      skill: 'Fundamental Theorem of Algebra',
    });
  }
  const a = rng.int(1, 3);
  const b = rng.int(1, 3);
  const d = rng.int(1, 2);
  const r = rng.nonzero(-6, 6);
  const c = rng.pick([1, 4, 9, 2, 5]);
  const n = a + b + 2 * d;
  return q({
    prompt: R`How many zeros does \(f(x) = ${power('x', a)}${fac(r, b)}(x^{2} + ${c})${d > 1 ? `^{${d}}` : ''}\) have in the complex numbers, counted with multiplicity?`,
    correct: n,
    wrong: [
      { value: a + b, why: R`\(x^{2} + ${c}\) has no real zeros, but it has two complex zeros${d > 1 ? ', each repeated' : ''}.` },
      { value: a + b + d, why: R`Each factor \(x^{2} + ${c}\) is quadratic, so it contributes 2 zeros.` },
      { value: 2, why: 'That counts only the distinct real zeros. Multiplicities and complex zeros count too.' },
      3,
      n + 1,
    ],
    solution: [
      R`Add the degrees of the factors: \(${power('x', a)}\) gives \(${a}\), \(${fac(r, b)}\) gives \(${b}\), and \((x^{2} + ${c})${d > 1 ? `^{${d}}` : ''}\) gives \(${2 * d}\).`,
      R`The degree is \(${a} + ${b} + ${2 * d} = ${n}\). By the Fundamental Theorem of Algebra there are \(${n}\) complex zeros counted with multiplicity.`,
    ],
    rule: 0,
    skill: 'Fundamental Theorem of Algebra',
  });
}

function easyAsymptotes(rng) {
  const c = rng.int(1, 3);
  const v = rng.nonzero(-6, 6);
  const h = rng.intExcept(-5, 5, [0, v]);
  const a = c * h;
  const d = -c * v;
  const b = rng.intExcept(-9, 9, [0, -a * v]);
  const f = (x) => (a * x + b) / (c * x + d);
  const fTex = R`\dfrac{${linear(a, b)}}{${linear(c, d)}}`;
  if (rng.bool()) {
    return q({
      prompt: R`What is the vertical asymptote of \(f(x) = ${fTex}\)?`,
      correct: R`\(x = ${v}\)`,
      wrong: [
        { value: R`\(x = ${-v}\)`, why: R`Solve \(${linear(c, d)} = 0\) for \(x\).` },
        { value: R`\(y = ${v}\)`, why: R`A vertical asymptote is a vertical line, so its equation has the form \(x = \text{constant}\).` },
        { value: R`\(y = ${h}\)`, why: 'That is the horizontal asymptote, the ratio of the leading coefficients.' },
        R`\(x = ${h}\)`,
        R`\(x = ${frac(-b, a).tex()}\)`,
        R`\(x = ${v + 1}\)`,
      ],
      solution: [R`A vertical asymptote occurs where the denominator is 0 and the numerator is not.`, R`\(${linear(c, d)} = 0\) gives \(x = ${v}\). The numerator there is \(${a * v + b}\), not 0.`, R`The vertical asymptote is \(x = ${v}\).`],
      rule: 4,
      skill: 'vertical asymptotes',
      check: () => (c * v + d === 0 && a * v + b !== 0 ? true : 'not a vertical asymptote'),
    });
  }
  return q({
    prompt: R`What is the horizontal asymptote of \(f(x) = ${fTex}\)?`,
    correct: R`\(y = ${h}\)`,
    wrong: [
      { value: R`\(y = 0\)`, why: R`\(y = 0\) is the asymptote only when the denominator has the higher degree. Here the degrees are equal.` },
      { value: R`\(y = ${frac(b, d).tex()}\)`, why: 'Use the leading coefficients, not the constant terms.' },
      { value: R`\(x = ${h}\)`, why: R`A horizontal asymptote is a horizontal line, \(y = \text{constant}\).` },
      R`\(y = ${v}\)`,
      R`\(y = ${a}\)`,
    ],
    solution: [R`The numerator and denominator have the same degree, so the horizontal asymptote is the ratio of the leading coefficients.`, R`\(y = \dfrac{${a}}{${c}} = ${h}\).`],
    rule: 5,
    skill: 'horizontal asymptotes',
    check: () => checkLimit(f, Infinity, h),
  });
}

// ───────────── Medium ─────────────

function mediumConjugate(rng) {
  const a = rng.nonzero(-6, 6);
  const b = rng.int(1, 6);
  const r = rng.nonzero(-7, 7);
  if (rng.bool()) {
    const s = rng.sign();
    return q({
      prompt: R`A polynomial with real coefficients has zeros \(${r}\) and \(${cx(a, s * b)}\). Which number must also be a zero?`,
      correct: M(cx(a, -s * b)),
      wrong: [
        { value: M(cx(-a, s * b)), why: 'The conjugate changes the sign of the imaginary part only.' },
        { value: M(String(-r)), why: 'Real zeros do not come in pairs. Only non-real zeros bring a partner.' },
        M(cx(-a, -s * b)),
        M(cx(b, a)),
      ],
      solution: [R`When the coefficients are real, non-real zeros come in conjugate pairs \(a + bi\) and \(a - bi\).`, R`The conjugate of \(${cx(a, s * b)}\) is \(${cx(a, -s * b)}\), so that must be a zero too.`],
      rule: 2,
      skill: 'conjugate pairs',
    });
  }
  const reals = rng.int(1, 3);
  const pairs = rng.int(1, 2);
  const realList = rng.sample([-5, -3, -2, -1, 1, 2, 4, 6], reals);
  const complexList = [cx(0, b), cx(a, rng.int(1, 5))].slice(0, pairs);
  const n = reals + 2 * pairs;
  return q({
    prompt: R`A polynomial with real coefficients has zeros \(${[...realList, ...complexList].join(R`,\ `)}\) (and possibly others). What is the smallest degree it can have?`,
    correct: n,
    wrong: [
      { value: reals + pairs, why: 'Each non-real zero forces its conjugate to be a zero as well.' },
      { value: 2 * (reals + pairs), why: 'Only the non-real zeros need a conjugate partner. Real zeros count once.' },
      n + 1,
      n - 1,
    ],
    solution: [
      reals === 1 ? 'The real zero counts once.' : `The ${reals} real zeros count once each.`,
      R`Each non-real zero comes with its conjugate, so the ${pairs === 1 ? 'one non-real zero listed stands for 2 zeros' : '2 non-real zeros listed stand for 4 zeros'}.`,
      R`Smallest degree: \(${reals} + ${2 * pairs} = ${n}\).`,
    ],
    rule: 2,
    skill: 'conjugate pairs',
  });
}

function mediumPolyFromZeros(rng) {
  const r = rng.nonzero(-5, 5);
  const a = rng.nonzero(-4, 4);
  const b = rng.int(1, 4);
  const quad = [1, -2 * a, a * a + b * b];
  const right = polyMul([1, -r], quad);
  return q({
    prompt: R`Which cubic polynomial with real coefficients and leading coefficient 1 has \(${r}\) and \(${cx(a, b)}\) among its zeros?`,
    correct: M(poly(right)),
    wrong: [
      { value: M(poly(polyMul([1, -r], [1, -2 * a, a * a - b * b]))), why: R`\((${cx(a, b)})(${cx(a, -b)}) = ${terms([[a * a, ''], [-b * b, 'i^{2}']])} = ${a * a} + ${b * b}\), because \(i^{2} = -1\).` },
      { value: M(poly(polyMul([1, r], quad))), why: R`A zero at \(${r}\) gives the factor \(${factor(r)}\).` },
      M(poly(polyMul([1, -r], [1, 2 * a, a * a + b * b]))),
      M(poly(polyMul([1, -r], [1, 0, a * a + b * b]))),
    ],
    solution: [
      R`Real coefficients force the conjugate \(${cx(a, -b)}\) to be a zero as well.`,
      R`The conjugate pair gives a real quadratic factor: \((x - (${cx(a, b)}))(x - (${cx(a, -b)})) = (${linear(1, -a)})^{2} + ${b * b} = ${poly(quad)}\).`,
      R`Multiply by \(${factor(r)}\): \(${factor(r)}(${poly(quad)}) = ${poly(right)}\).`,
    ],
    rule: 2,
    skill: 'polynomial from zeros',
    check: () => {
      const [re, im] = cEval(right, a, b);
      return Math.abs(re) < 1e-9 && Math.abs(im) < 1e-9 && polyEval(right, r) === 0 ? true : 'given numbers are not zeros of the answer';
    },
  });
}

function mediumHoleOrAsymptote(rng) {
  const [a, b, c] = rng.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 3);
  const top = polyMul([1, -a], [1, -b]);
  const bot = polyMul([1, -a], [1, -c]);
  const f = (x) => polyEval(top, x) / polyEval(bot, x);
  const [lo, hi] = a < c ? [a, c] : [c, a];
  return q({
    prompt: R`What happens on the graph of \(f(x) = \dfrac{${poly(top)}}{${poly(bot)}}\) at the two \(x\)-values where the denominator is zero?`,
    correct: R`A hole at \(x = ${a}\) and a vertical asymptote at \(x = ${c}\)`,
    wrong: [
      { value: R`Vertical asymptotes at \(x = ${lo}\) and \(x = ${hi}\)`, why: R`\(${factor(a)}\) is also a factor of the numerator. A factor that cancels leaves a hole, not an asymptote.` },
      { value: R`A vertical asymptote at \(x = ${a}\) and a hole at \(x = ${c}\)`, why: R`The hole is where the common factor \(${factor(a)}\) is zero.` },
      R`Holes at \(x = ${lo}\) and \(x = ${hi}\)`,
    ],
    solution: [
      R`Factor: \(f(x) = \dfrac{${factor(a)}${factor(b)}}{${factor(a)}${factor(c)}}\).`,
      R`The factor \(${factor(a)}\) cancels, so there is a hole at \(x = ${a}\).`,
      R`The factor \(${factor(c)}\) stays in the denominator, so there is a vertical asymptote at \(x = ${c}\).`,
    ],
    rule: 4,
    skill: 'holes and asymptotes',
    check: () => (Math.abs(f(a + 1e-6) - (a - b) / (a - c)) < 1e-3 && Math.abs(f(c + 1e-7)) > 1e4 ? true : 'behaviour near the points is different'),
  });
}

function mediumHorizontalAsymptote(rng) {
  const kind = rng.pick(['lower', 'equal', 'equal', 'higher']);
  const m = rng.int(1, 3);
  const n = kind === 'equal' ? m : kind === 'lower' ? rng.int(0, m - 1) : m + rng.int(1, 2);
  const p = rng.nonzero(-8, 8);
  const qq = rng.intExcept(-6, 6, [0, p, -p]);
  const fill = (lead, deg) => [lead, ...Array.from({ length: deg }, () => (rng.bool(0.6) ? rng.int(-9, 9) : 0))];
  const top = fill(p, n);
  const bot = fill(qq, m);
  if (bot[m] === 0) bot[m] = rng.nonzero(1, 9);
  const f = (x) => polyEval(top, x) / polyEval(bot, x);
  const ratio = R`\(y = ${frac(p, qq).tex()}\)`;
  const none = 'There is no horizontal asymptote';
  const zero = R`\(y = 0\)`;
  const correct = kind === 'equal' ? ratio : kind === 'lower' ? zero : none;
  const why = {
    lower: 'The denominator has the higher degree, so it outgrows the numerator and the quotient approaches 0.',
    equal: 'The degrees are equal, so the quotient approaches the ratio of the leading coefficients.',
    higher: 'The numerator has the higher degree, so the outputs grow without bound: there is no horizontal asymptote.',
  }[kind];
  return q({
    prompt: R`What is the horizontal asymptote of \(f(x) = \dfrac{${poly(top)}}{${poly(bot)}}\)?`,
    correct,
    wrong: [{ value: ratio, why }, { value: zero, why }, { value: none, why }, R`\(y = ${frac(qq, p).tex()}\)`, R`\(y = ${p}\)`, R`\(y = ${frac(-p, qq).tex()}\)`],
    solution: [
      R`Compare degrees: the numerator has degree \(${n}\) and the denominator has degree \(${m}\).`,
      why,
      kind === 'equal' ? R`\(y = \dfrac{${p}}{${qq}}${frac(p, qq).tex() === R`\frac{${p}}{${qq}}` ? '' : ` = ${frac(p, qq).tex()}`}\).` : kind === 'lower' ? R`The horizontal asymptote is \(y = 0\).` : R`As \(x \to \pm\infty\), \(|f(x)| \to \infty\).`,
    ],
    rule: 5,
    skill: 'horizontal asymptotes',
    check: () => (kind === 'higher' ? (Math.abs(f(1e6)) > 1e4 ? true : 'function does not grow') : checkLimit(f, Infinity, kind === 'equal' ? p / qq : 0)),
  });
}

function mediumQuadInequality(rng) {
  const r1 = rng.int(-7, 5);
  const r2 = r1 + rng.int(1, 7);
  if (r1 === -r2) return mediumQuadInequality(rng);
  const op = rng.pick(['>', '<', '>=', '<=']);
  const strict = op === '>' || op === '<';
  const positive = op === '>' || op === '>=';
  const coefs = polyMul([1, -r1], [1, -r2]);
  const truth = (x) => REL[op](polyEval(coefs, x));
  const right = positive ? outside(r1, r2, !strict) : between(r1, r2, !strict);
  const mid = (r1 + r2) / 2;
  const wrongs = [positive ? between(r1, r2, !strict) : outside(r1, r2, !strict), ray(op, positive ? r2 : r1), ray(op, positive ? r1 : r2), positive ? outside(-r2, -r1, !strict) : between(-r2, -r1, !strict)];
  return q({
    prompt: R`Solve the inequality \(${poly(coefs)} ${RELTEX[op]} 0\).`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: R`Test a point: at \(x = ${num(mid)}\) the product \(${facs([[r1], [r2]])}\) is negative.` },
      { value: wrongs[1].text, why: positive ? 'A product is also positive when both factors are negative.' : R`Both zeros matter: the product is negative only between \(${r1}\) and \(${r2}\).` },
      wrongs[2].text,
      wrongs[3].text,
    ],
    solution: [
      R`Factor: \(${facs([[r1], [r2]])} ${RELTEX[op]} 0\). The zeros are \(x = ${r1}\) and \(x = ${r2}\).`,
      R`Sign chart: the product is positive for \(x < ${r1}\), negative for \(${r1} < x < ${r2}\), and positive for \(x > ${r2}\).`,
      R`The inequality asks where the product is ${positive ? 'positive' : 'negative'}${strict ? '' : ' or zero, so the zeros are included'}: ${right.text}.`,
    ],
    rule: 6,
    skill: 'polynomial inequalities',
    check: regionCheck(right, wrongs, truth, [r1 - 1, r1, mid, r2, r2 + 1]),
  });
}

// ───────────── Hard ─────────────

function hardSlantAsymptote(rng) {
  const a = rng.nonzero(-3, 3);
  const b = rng.int(-6, 6);
  const d = rng.nonzero(-5, 5);
  const k = b + a * d;
  const c = rng.intExcept(-9, 9, [-d * k]);
  const rem = c + d * k;
  const f = (x) => (a * x * x + b * x + c) / (x - d);
  const line = (m, t) => R`\(y = ${linear(m, t)}\)`;
  return q({
    prompt: R`Find the slant (oblique) asymptote of \(f(x) = \dfrac{${poly([a, b, c])}}{${linear(1, -d)}}\).`,
    correct: line(a, k),
    wrong: [
      { value: line(a, b - a * d), why: R`When dividing by \(${linear(1, -d)}\), each new term of the quotient is multiplied by \(${linear(1, -d)}\) and subtracted. Watch the signs.` },
      { value: line(a, b), why: 'The asymptote is the quotient of the division, not the first two terms of the numerator.' },
      { value: R`\(x = ${d}\)`, why: 'That is the vertical asymptote. The slant asymptote describes the ends of the graph.' },
      line(a, k + rem),
      line(-a, k),
    ],
    solution: [
      R`The numerator's degree is one more than the denominator's, so divide: \((${poly([a, b, c])}) \div (${linear(1, -d)})\).`,
      R`The quotient is \(${linear(a, k)}\) and the remainder is \(${rem}\), so \(f(x) = ${linear(a, k)} ${rem > 0 ? '+' : '-'} \dfrac{${Math.abs(rem)}}{${linear(1, -d)}}\).`,
      R`As \(x \to \pm\infty\) the fraction approaches 0, so the graph approaches the line \(y = ${linear(a, k)}\).`,
    ],
    rule: 5,
    skill: 'slant asymptotes',
    check: () => checkLimit((x) => f(x) - (a * x + k), Infinity, 0),
  });
}

function hardHoleCoordinates(rng) {
  const [a, b, c] = rng.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 3);
  const top = polyMul([1, -a], [1, -b]);
  const bot = polyMul([1, -a], [1, -c]);
  const y = frac(a - b, a - c);
  const pt = (x, v) => (v == null ? null : R`\(\left(${x},\ ${num(v)}\right)\)`);
  return q({
    prompt: R`The graph of \(f(x) = \dfrac{${poly(top)}}{${poly(bot)}}\) has a hole. What are the coordinates of the hole?`,
    correct: pt(a, y),
    wrong: [
      { value: pt(a, 0), why: R`The original formula gives \(\frac{0}{0}\) at \(x = ${a}\). The height of the hole comes from the simplified function.` },
      { value: pt(c, y), why: R`\(x = ${c}\) is where the factor that does not cancel is zero: a vertical asymptote.` },
      pt(a, frac(a - c, a - b)),
      pt(a, tryFrac(a + b, a + c)),
      pt(b, 0),
    ],
    solution: [
      R`Factor: \(f(x) = \dfrac{${factor(a)}${factor(b)}}{${factor(a)}${factor(c)}}\). The common factor \(${factor(a)}\) gives a hole at \(x = ${a}\).`,
      R`Cancel it: for \(x \ne ${a}\), \(f(x) = \dfrac{${linear(1, -b)}}{${linear(1, -c)}}\).`,
      R`Substitute \(x = ${a}\) into the simplified form: \(\dfrac{${a - b}}{${a - c}}${y.d === a - c && y.n === a - b ? '' : ` = ${y.tex()}`}\). The hole is at \(\left(${a},\ ${y.tex()}\right)\).`,
    ],
    rule: 4,
    skill: 'holes and asymptotes',
    check: () => checkLimit((x) => polyEval(top, x) / polyEval(bot, x), a, y.value),
  });
}

function hardRationalInequality(rng) {
  const a = rng.int(-6, 6);
  const b = rng.intExcept(-6, 6, [a]);
  const m = rng.int(1, 2);
  const k = rng.intExcept(-3, 3, [0, -m]);
  const op = rng.pick(['>', '<', '>=', '<=']);
  const strict = op === '>' || op === '<';
  const positive = op === '>' || op === '>=';
  const top = [k + m, -(k * b + m * a)];
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const truth = (x) => x !== b && REL[op](polyEval(top, x) / (x - b) - k);
  const make = positive ? outside : between;
  const other = positive ? between : outside;
  const right = make(lo, hi, !strict && lo === a, !strict && hi === a);
  const wrongs = [ray(op, a), make(lo, hi, !strict || lo !== a, !strict || hi !== a), other(lo, hi, !strict && lo === a, !strict && hi === a), ray(op === '>' ? '<' : op === '<' ? '>' : op === '>=' ? '<=' : '>=', a)];
  const sign = (x) => ((x - a) / (x - b) > 0 ? 'positive' : 'negative');
  return q({
    prompt: R`Solve the inequality \(\dfrac{${linear(top[0], top[1])}}{${linear(1, -b)}} ${RELTEX[op]} ${k}\).`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: R`Multiplying both sides by \(${linear(1, -b)}\) is only safe when its sign is known. Move everything to one side and use a sign chart instead.` },
      { value: wrongs[1].text, why: strict ? R`At \(x = ${a}\) the two sides are equal, and \(x = ${b}\) is not in the domain. Neither end belongs to the solution.` : R`\(x = ${b}\) makes the denominator zero, so it cannot be included. \(x = ${a}\) gives equality, so it is included.` },
      wrongs[2].text,
      wrongs[3].text,
    ],
    solution: [
      R`${k > 0 ? 'Subtract' : 'Add'} \(${Math.abs(k)}\) on both sides and combine over the common denominator: \(\dfrac{${linear(top[0], top[1])} ${k > 0 ? '-' : '+'} ${Math.abs(k) === 1 ? '' : Math.abs(k)}(${linear(1, -b)})}{${linear(1, -b)}} = \dfrac{${linear(m, -m * a)}}{${linear(1, -b)}} ${RELTEX[op]} 0\).`,
      R`Critical values: the numerator is zero at \(x = ${a}\); the denominator is zero at \(x = ${b}\).`,
      R`Sign chart: the quotient is ${sign(lo - 1)} for \(x < ${lo}\), ${sign((lo + hi) / 2)} for \(${lo} < x < ${hi}\), and ${sign(hi + 1)} for \(x > ${hi}\).`,
      R`Keep the ${positive ? 'positive' : 'negative'} part${strict ? '' : R`, include \(x = ${a}\) (equality)`} and leave out \(x = ${b}\): ${right.text}.`,
    ],
    rule: 6,
    skill: 'rational inequalities',
    check: regionCheck(right, wrongs, truth, [lo - 1, lo, (lo + hi) / 2, hi, hi + 1]),
  });
}

function hardGraphMatch(rng) {
  const d = rng.int(2, 5);
  const r1 = rng.int(-4, 3 - d);
  const r2 = r1 + d;
  if (r1 === 0 || r2 === 0 || r1 === -r2) return hardGraphMatch(rng);
  const doubleFirst = rng.bool();
  const s = rng.sign();
  const [kTex, k] = d === 2 ? ['2', 2] : d === 3 ? ['', 1] : d === 4 ? [R`\frac{1}{2}`, 0.5] : [R`\frac{1}{4}`, 0.25];
  const build = (sg, z1, m1, z2, m2) => ({
    text: M(`f(x) = ${sg < 0 ? '-' : ''}${kTex}${fac(z1, m1)}${fac(z2, m2)}`),
    f: (x) => sg * k * (x - z1) ** m1 * (x - z2) ** m2,
  });
  const [m1, m2] = doubleFirst ? [2, 1] : [1, 2];
  const right = build(s, r1, m1, r2, m2);
  const options = [build(s, r1, m2, r2, m1), build(-s, r1, m1, r2, m2), build(s, -r1, m1, -r2, m2)];
  const touch = doubleFirst ? r1 : r2;
  const cross = doubleFirst ? r2 : r1;
  const up = right.f(r2 + 5) > 0;
  return q({
    prompt: R`Which function has this graph?`,
    visual: {
      type: 'plot',
      x: [r1 - 2.5, r2 + 2.5],
      y: [-8, 8],
      fns: [{ f: right.f }],
      points: [{ x: r1, y: 0, label: String(r1).replace('-', '−') }, { x: r2, y: 0, label: String(r2).replace('-', '−') }],
      alt: `Graph of a polynomial. It touches the x-axis at x = ${touch} and turns back, and it crosses the x-axis at x = ${cross}. On the far right the graph ${up ? 'rises' : 'falls'}; on the far left it ${up ? 'falls' : 'rises'}.`,
    },
    key: `graph-match-${r1}-${r2}-${doubleFirst}-${s}`,
    correct: right.text,
    wrong: [
      { value: options[0].text, why: R`The graph touches the axis at \(x = ${touch}\), so that factor is the one that is squared.` },
      { value: options[1].text, why: `Check the right-hand end: the graph ${up ? 'rises' : 'falls'} there, which fixes the sign of the leading coefficient.` },
      { value: options[2].text, why: R`A zero at \(x = r\) gives the factor \((x - r)\).` },
    ],
    solution: [
      R`The graph crosses the axis at \(x = ${cross}\): a factor \(${factor(cross)}\) with odd multiplicity.`,
      R`It touches the axis and turns back at \(x = ${touch}\): a factor \(${fac(touch, 2)}\) with even multiplicity.`,
      R`The degree is 3 (odd) and the right end ${up ? 'rises' : 'falls'}, so the leading coefficient is ${up ? 'positive' : 'negative'}.`,
      `So ${right.text}.`,
    ],
    rule: 1,
    skill: 'reading a polynomial graph',
    check: () => {
      const f = right.f;
      const ok = f(touch) === 0 && f(cross) === 0 && f(touch - 0.1) * f(touch + 0.1) > 0 && f(cross - 0.1) * f(cross + 0.1) < 0 && Math.sign(f(100)) === s;
      const distinct = options.every((o) => [r1 - 1, (r1 + r2) / 2, r2 + 1].some((x) => Math.abs(o.f(x) - f(x)) > 1e-9));
      return ok && distinct ? true : 'graph and formula disagree';
    },
  });
}

function hardAverageCost(rng) {
  const v = rng.int(2, 12);
  const gap = rng.int(1, 6);
  const N = rng.pick([50, 80, 100, 120, 150, 200, 250, 400]);
  const F = gap * N;
  const T = v + gap;
  const item = rng.pick(['mugs', 'T-shirts', 'phone cases', 'posters', 'candles']);
  if (rng.bool(0.35)) {
    return q({
      prompt: R`A workshop pays ${money(F)} to set up a production run and ${money(v)} in materials for each of the ${item} it makes. The average cost per item for \(x\) items is \(A(x) = \dfrac{${F} + ${v}x}{x}\) dollars. What value does the average cost approach as \(x\) becomes very large?`,
      correct: money(v),
      wrong: [
        { value: money(0), why: R`\(\frac{${F}}{x}\) approaches 0, but each item still costs ${money(v)} in materials.` },
        { value: money(F), why: 'The set-up cost is shared between more and more items, so its share per item shrinks.' },
        money(F + v),
        money(T),
      ],
      solution: [R`Split the fraction: \(A(x) = \dfrac{${F}}{x} + ${v}\).`, R`As \(x \to \infty\), \(\dfrac{${F}}{x} \to 0\), so \(A(x) \to ${v}\).`, `The graph has the horizontal asymptote y = ${v}: the average cost approaches ${money(v)} per item but never reaches it.`],
      rule: 5,
      skill: 'rational models',
      check: () => checkEqual((F + v * 1e10) / 1e10, v, 1e-6),
    });
  }
  return q({
    prompt: R`A workshop pays ${money(F)} to set up a production run and ${money(v)} in materials for each of the ${item} it makes. The average cost per item for \(x\) items is \(A(x) = \dfrac{${F} + ${v}x}{x}\) dollars. The average cost is below ${money(T)} when \(x\) is greater than what number?`,
    correct: N,
    wrong: [
      F % T === 0 ? { value: F / T, why: R`Each item also costs ${money(v)} in materials. Only ${money(gap)} of the ${money(T)} is left to cover the set-up cost.` } : null,
      F % v === 0 ? { value: F / v, why: R`Compare the target with the materials cost: \(${T} - ${v} = ${gap}\) dollars per item go towards the set-up cost.` } : null,
      F % (T + v) === 0 ? F / (T + v) : null,
      N + 50,
      N / 2,
      2 * N,
    ],
    solution: [
      R`Solve \(\dfrac{${F} + ${v}x}{x} < ${T}\). Since \(x > 0\), multiplying both sides by \(x\) keeps the direction: \(${F} + ${v}x < ${T}x\).`,
      R`Subtract \(${v}x\): \(${F} < ${gap === 1 ? '' : gap}x\).`,
      R`${gap === 1 ? 'So' : R`Divide by \(${gap}\):`} \(x > ${N}\). The average cost is below ${money(T)} once more than ${N} ${item} are made.`,
    ],
    rule: 6,
    skill: 'rational models',
    check: () => checkEqual((F + v * N) / N, T),
  });
}

// ───────────── Challenge ─────────────

function challengeFindK(rng) {
  const a = rng.nonzero(-6, 6);
  const b = rng.intExcept(-6, 6, [0, a, -a]);
  const k = -(a + b);
  return q({
    prompt: R`For which value of \(k\) does the graph of \(f(x) = \dfrac{x^{2} + kx ${a * b > 0 ? '+' : '-'} ${Math.abs(a * b)}}{${linear(1, -a)}}\) have a hole, rather than a vertical asymptote, at \(x = ${a}\)?`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: -k, why: R`\((${linear(1, -a)})(${linear(1, -b)})\) expands to \(${poly([1, k, a * b])}\). Check the sign of the middle term.` },
      { value: -a, why: R`The numerator must equal 0 at \(x = ${a}\). Substitute and solve for \(k\).` },
      b,
      -b,
      k + 1,
    ],
    solution: [
      R`A hole needs \(${linear(1, -a)}\) to be a factor of the numerator, so the numerator must be 0 at \(x = ${a}\).`,
      R`Substitute: \(${terms([[a * a, ''], [a, 'k'], [a * b, '']])} = 0\), so \(${terms([[a, 'k']])} = ${-a * a - a * b}\)${Math.abs(a) === 1 && a > 0 ? '' : R` and \(k = ${k}\)`}.`,
      R`Check: \(${poly([1, k, a * b])} = ${factor(a)}${factor(b)}\), and the factor \(${factor(a)}\) cancels.`,
    ],
    rule: 4,
    skill: 'holes and asymptotes',
    check: () => checkEqual(a * a + k * a + a * b, 0),
  });
}

function challengeBuildRational(rng) {
  const [z, h, p] = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 3);
  const c = rng.pick([2, 3, -2, -1, 4, -3]);
  const build = (lead, t1, t2, b1, b2) => ({
    text: R`\(f(x) = \dfrac{${coef(lead)}${factor(t1)}${t2 == null ? '' : factor(t2)}}{${factor(b1)}${factor(b2)}}\)`,
    f: (x) => (lead * (x - t1) * (t2 == null ? 1 : x - t2)) / ((x - b1) * (x - b2)),
  });
  const fits = (f) => f(z) === 0 && Math.abs(f(p + 1e-7)) > 1e4 && Number.isNaN(f(h)) && Math.abs(f(h + 1e-7)) < 1e4 && Math.abs(f(1e7) - c) < 1e-3;
  const right = build(c, z, h, p, h);
  const options = [build(c, z, p, p, h), build(c, p, h, z, h), build(1, z, h, p, h), build(c, z, null, p, h)];
  return q({
    prompt: R`Which rational function has a zero at \(x = ${z}\), a hole at \(x = ${h}\), a vertical asymptote \(x = ${p}\) and a horizontal asymptote \(y = ${c}\)?`,
    correct: right.text,
    wrong: [
      { value: options[0].text, why: R`Here the factor that cancels is \(${factor(p)}\), so the hole would be at \(x = ${p}\) and the asymptote at \(x = ${h}\).` },
      { value: options[1].text, why: R`Zeros come from the numerator and vertical asymptotes from the denominator. This has them the other way round.` },
      { value: options[2].text, why: R`With equal degrees the horizontal asymptote is the ratio of leading coefficients, which here is \(y = 1\).` },
      options[3].text,
    ],
    solution: [
      R`Hole at \(x = ${h}\): the factor \(${factor(h)}\) appears in both the numerator and the denominator.`,
      R`Vertical asymptote \(x = ${p}\): the factor \(${factor(p)}\) appears only in the denominator. Zero at \(x = ${z}\): the factor \(${factor(z)}\) appears only in the numerator.`,
      R`Horizontal asymptote \(y = ${c}\): the degrees are equal, so the ratio of the leading coefficients must be \(${c}\).`,
      `So ${right.text}.`,
    ],
    rule: 4,
    skill: 'building a rational function',
    check: () => (fits(right.f) && options.every((o) => !fits(o.f)) ? true : 'the listed features do not single out the answer'),
  });
}

function challengeConstantTerm(rng) {
  const b = rng.int(1, 4);
  const c = rng.nonzero(-3, 3);
  const d = rng.int(1, 3);
  const ans = b * b * (c * c + d * d);
  const coefs = polyMul([1, 0, b * b], [1, -2 * c, c * c + d * d]);
  return q({
    prompt: R`A polynomial \(f\) of degree 4 has real coefficients and leading coefficient 1. Two of its zeros are \(${cx(0, b)}\) and \(${cx(c, d)}\). What is the constant term of \(f\)?`,
    correct: ans,
    wrong: [
      { value: b * b * (c * c - d * d), why: R`\((${cx(c, d)})(${cx(c, -d)}) = ${terms([[c * c, ''], [-d * d, 'i^{2}']])} = ${c * c + d * d}\), because \(i^{2} = -1\).` },
      { value: -ans, why: R`\((${cx(0, b)})(${cx(0, -b)}) = ${terms([[-b * b, 'i^{2}']])} = ${b * b}\), which is positive.` },
      { value: b * b + c * c + d * d, why: 'The constant term is the product of the constants of the two quadratic factors, not their sum.' },
      b * (c * c + d * d),
      ans + b * b,
    ],
    solution: [
      R`Real coefficients mean the conjugates \(${cx(0, -b)}\) and \(${cx(c, -d)}\) are zeros too. That makes 4 zeros, which is all of them.`,
      R`Each conjugate pair gives a real quadratic factor: \((x^{2} + ${b * b})\) and \((${poly([1, -2 * c, c * c + d * d])})\).`,
      R`\(f(x) = (x^{2} + ${b * b})(${poly([1, -2 * c, c * c + d * d])})\), so the constant term is \(${b * b} \cdot ${c * c + d * d} = ${ans}\).`,
    ],
    rule: 2,
    skill: 'conjugate pairs',
    check: () => {
      const z1 = cEval(coefs, 0, b);
      const z2 = cEval(coefs, c, d);
      return [...z1, ...z2].every((t) => Math.abs(t) < 1e-9) && coefs[4] === ans ? true : 'the answer is not the constant term of a polynomial with those zeros';
    },
  });
}

function challengeDoubleZeroInequality(rng) {
  const r2 = rng.int(-6, 6);
  const kind = rng.pick(['>', '>=', '<', '<=']);
  // Put the double zero r1 on the side where it changes the answer.
  const r1 = kind === '>' || kind === '<=' ? r2 + rng.int(1, 5) : r2 - rng.int(1, 5);
  const truth = (x) => REL[kind]((x - r1) ** 2 * (x - r2));
  const strict = kind === '>' || kind === '<';
  const dir = kind === '>' || kind === '>=' ? '>' : '<';
  const base = ray(strict ? dir : `${dir}=`, r2);
  const right = strict
    ? { text: R`${base.text} and \(x \ne ${r1}\)`, has: (x) => base.has(x) && x !== r1 }
    : { text: R`${base.text} or \(x = ${r1}\)`, has: (x) => base.has(x) || x === r1 };
  const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
  const wrongs = [base, ray(strict ? dir : `${dir}=`, r1), dir === '>' ? outside(lo, hi, !strict) : between(lo, hi, !strict), dir === '>' ? between(lo, hi, !strict) : outside(lo, hi, !strict)];
  return q({
    prompt: R`Solve the inequality \(${facs([[r1, 2], [r2]])} ${RELTEX[kind]} 0\).`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: strict ? R`At \(x = ${r1}\) the product equals 0, and 0 does not satisfy a strict inequality.` : R`At \(x = ${r1}\) the product equals 0, which satisfies the inequality, so that single point belongs too.` },
      { value: wrongs[1].text, why: R`\(${fac(r1, 2)}\) is never negative, so the sign of the product does not change at \(x = ${r1}\). Only \(${factor(r2)}\) controls the sign.` },
      { value: wrongs[2].text, why: R`A sign chart changes sign only at zeros of odd multiplicity. \(x = ${r1}\) is a double zero.` },
      wrongs[3].text,
    ],
    solution: [
      R`The zeros are \(x = ${r1}\) (multiplicity 2) and \(x = ${r2}\) (multiplicity 1).`,
      R`\(${fac(r1, 2)} \ge 0\) always, so the product has the same sign as \(${factor(r2)}\), except at \(x = ${r1}\) where it is 0.`,
      R`\(${factor(r2)}\) is ${dir === '>' ? 'positive' : 'negative'} when \(x ${dir} ${r2}\).`,
      strict ? R`Remove \(x = ${r1}\), where the product is 0: ${right.text}.` : R`Include every point where the product is 0, which adds \(x = ${r2}\) and the single point \(x = ${r1}\): ${right.text}.`,
    ],
    rule: 6,
    skill: 'sign analysis with multiplicity',
    check: regionCheck(right, wrongs, truth, [lo - 1, lo, (lo + hi) / 2, hi, hi + 1]),
  });
}

// ───────────── Models ─────────────

function rationalFeatures(a, b, c, d) {
  const topRoots = [a, b];
  const botRoots = [c, d];
  const cancelled = [];
  for (const r of [a, b]) {
    const i = botRoots.indexOf(r);
    const j = topRoots.indexOf(r);
    if (i >= 0 && j >= 0) {
      botRoots.splice(i, 1);
      topRoots.splice(j, 1);
      cancelled.push(r);
    }
  }
  const asymptotes = [...new Set(botRoots)].sort((x, y) => x - y);
  const holes = [...new Set(cancelled)].filter((r) => !botRoots.includes(r));
  const zeros = [...new Set(topRoots)].filter((r) => !holes.includes(r) && !asymptotes.includes(r)).sort((x, y) => x - y);
  const simple = (x) => topRoots.reduce((acc, r) => acc * (x - r), 1) / botRoots.reduce((acc, r) => acc * (x - r), 1);
  const holePoints = holes.map((r) => [r, frac(topRoots.reduce((acc, t) => acc * (r - t), 1), botRoots.reduce((acc, t) => acc * (r - t), 1))]);
  return { topRoots, botRoots, cancelled, asymptotes, holes, zeros, simple, holePoints };
}

export default {
  id: 'polynomial-rational',
  title: 'Polynomial & Rational Functions',
  summary: 'Find zeros, multiplicities and end behaviour of polynomials; find holes, asymptotes and sign charts of rational functions.',
  standards: ['AP Precalculus 1.4', 'AP Precalculus 1.5', 'AP Precalculus 1.6', 'AP Precalculus 1.7', 'AP Precalculus 1.8', 'AP Precalculus 1.9', 'AP Precalculus 1.10', 'AP Precalculus 1.11', 'CCSS N-CN.C.9', 'CCSS F-IF.C.7'],

  explain: {
    intro: R`The factored form of a polynomial or rational function tells you almost everything about its graph. Zeros of the numerator give \(x\)-intercepts, zeros of the denominator give breaks, the exponent on each factor says whether the graph crosses or touches, and the leading terms decide what happens far to the left and right.`,
    rules: [
      {
        title: 'Zeros, factors and the Fundamental Theorem of Algebra',
        text: R`\(r\) is a zero of a polynomial exactly when \((x - r)\) is a factor. A polynomial of degree \(n\) has exactly \(n\) complex zeros when each is counted with its multiplicity (the exponent on its factor).`,
        example: R`\(f(x) = x^{2}(x - 3)(x^{2} + 4)\) has degree 5: zeros \(0\) (twice), \(3\), \(2i\) and \(-2i\).`,
      },
      {
        title: 'Multiplicity: cross or touch',
        text: R`At a real zero of odd multiplicity the factor changes sign, so the graph crosses the \(x\)-axis. At a zero of even multiplicity the factor does not change sign, so the graph touches the axis and turns back.`,
        example: R`\(f(x) = (x + 2)(x - 1)^{2}\) crosses at \(x = -2\) and touches at \(x = 1\).`,
      },
      {
        title: 'Complex zeros come in conjugate pairs',
        text: R`If a polynomial has real coefficients and \(a + bi\) is a zero, then \(a - bi\) is a zero too. Together they give the real quadratic factor \((x - a)^{2} + b^{2} = x^{2} - 2ax + a^{2} + b^{2}\).`,
        example: R`Zeros \(1 \pm 3i\) give the factor \((x - 1)^{2} + 9 = x^{2} - 2x + 10\).`,
      },
      {
        title: 'End behaviour',
        text: R`For large \(|x|\) a polynomial behaves like its leading term \(ax^{n}\). Even degree: both ends go the same way (up if \(a > 0\), down if \(a < 0\)). Odd degree: the ends go opposite ways (the right end follows the sign of \(a\)). Write the result with limits.`,
        example: R`For \(f(x) = -2x^{3} + 5x\): \(\lim_{x \to -\infty} f(x) = \infty\) and \(\lim_{x \to \infty} f(x) = -\infty\).`,
      },
      {
        title: 'Rational functions: zeros, holes and vertical asymptotes',
        text: R`Factor the numerator and the denominator. A factor common to both gives a hole at its zero (find the height from the simplified function). A factor left in the denominator gives a vertical asymptote. A factor left in the numerator gives a zero.`,
        example: R`\(\dfrac{(x - 3)(x + 2)}{(x - 3)(x + 3)}\): hole at \(x = 3\), vertical asymptote \(x = -3\), zero at \(x = -2\).`,
      },
      {
        title: 'Horizontal and slant asymptotes',
        text: R`Compare the degree \(n\) of the numerator with the degree \(m\) of the denominator. If \(n < m\) the horizontal asymptote is \(y = 0\). If \(n = m\) it is \(y = \) the ratio of the leading coefficients. If \(n = m + 1\) there is a slant asymptote: the quotient from polynomial division.`,
        example: R`\(\dfrac{6x^{2} + 1}{2x^{2} - 5}\) has horizontal asymptote \(y = 3\). \(\dfrac{x^{2} + 1}{x - 1} = x + 1 + \dfrac{2}{x - 1}\) has slant asymptote \(y = x + 1\).`,
      },
      {
        title: 'Sign analysis and inequalities',
        text: R`Move everything to one side and factor. Mark every zero of the numerator and of the denominator on a number line; the sign can change only at those values (and only at factors of odd multiplicity). Test one point in each interval. Never include a value that makes a denominator zero.`,
        example: R`\(\dfrac{x - 1}{x + 2} \le 0\): negative between \(-2\) and \(1\), zero at \(1\), not defined at \(-2\). Solution: \(-2 < x \le 1\).`,
      },
    ],
    vocab: [
      { term: 'multiplicity', def: R`The number of times a factor \((x - r)\) appears in a polynomial; the exponent on that factor.` },
      { term: 'complex conjugates', def: R`The pair \(a + bi\) and \(a - bi\). Their sum and product are real numbers.` },
      { term: 'vertical asymptote', def: R`A vertical line \(x = c\) that the graph approaches as the outputs grow without bound.` },
      { term: 'hole', def: 'A single missing point on a graph (a removable discontinuity), where a common factor of the numerator and denominator is zero.' },
      { term: 'horizontal asymptote', def: R`A horizontal line \(y = L\) that the graph approaches as \(x \to \infty\) or \(x \to -\infty\).` },
      { term: 'slant asymptote', def: 'A slanted line that the graph approaches at its ends, found by polynomial division.' },
    ],
    mistakes: [
      R`Reading the zero of \((x + 3)\) as \(3\). The factor is zero when \(x = -3\).`,
      'Calling every zero of the denominator a vertical asymptote. Check first whether the factor cancels: if it does, it is a hole.',
      R`Multiplying both sides of an inequality by an expression such as \(x - 2\) whose sign is not known. Use a sign chart instead.`,
      R`Forgetting the conjugate. With real coefficients, a zero \(2 + 5i\) always brings \(2 - 5i\) with it.`,
    ],
    visual: {
      type: 'plot',
      x: [-4, 4],
      y: [-4, 6],
      fns: [{ f: (x) => 0.25 * (x + 2) * (x - 1) ** 2, label: 'y = ¼(x + 2)(x − 1)²', labelAt: -1 }],
      points: [{ x: -2, y: 0, label: 'crosses' }, { x: 1, y: 0, label: 'touches', color: 'b' }],
      alt: 'Graph of y = ¼(x + 2)(x − 1)². The curve crosses the x-axis at x = −2, where the factor has odd multiplicity, and touches the x-axis at x = 1, where the factor is squared. It falls on the far left and rises on the far right.',
    },
  },

  examples: [
    {
      title: 'A polynomial from its zeros',
      problem: R`Find the cubic polynomial with real coefficients and leading coefficient 1 whose zeros include \(2\) and \(1 + 3i\).`,
      steps: [
        R`Real coefficients force the conjugate \(1 - 3i\) to be a zero as well. That gives three zeros, the full count for a cubic.`,
        R`The conjugate pair gives \((x - 1)^{2} + 3^{2} = x^{2} - 2x + 10\).`,
        R`Multiply by the factor for the real zero: \((x - 2)(x^{2} - 2x + 10) = x^{3} - 2x^{2} + 10x - 2x^{2} + 4x - 20\).`,
        R`Combine like terms: \(x^{3} - 4x^{2} + 14x - 20\).`,
      ],
      answer: R`\(f(x) = x^{3} - 4x^{2} + 14x - 20\)`,
    },
    {
      title: 'Analysing a rational function',
      problem: R`Find the zeros, holes and asymptotes of \(f(x) = \dfrac{x^{2} - x - 6}{x^{2} - 9}\).`,
      steps: [
        R`Factor: \(f(x) = \dfrac{(x - 3)(x + 2)}{(x - 3)(x + 3)}\).`,
        R`\((x - 3)\) cancels: a hole at \(x = 3\). Its height comes from the simplified form \(\dfrac{x + 2}{x + 3}\): \(\dfrac{5}{6}\).`,
        R`\((x + 3)\) stays in the denominator: vertical asymptote \(x = -3\). \((x + 2)\) stays in the numerator: zero at \(x = -2\).`,
        R`The degrees are equal with leading coefficients 1 and 1: horizontal asymptote \(y = 1\).`,
      ],
      answer: R`Zero at \(x = -2\); hole at \(\left(3, \frac{5}{6}\right)\); vertical asymptote \(x = -3\); horizontal asymptote \(y = 1\).`,
      visual: {
        type: 'plot',
        x: [-9, 7],
        y: [-5, 7],
        fns: [{ f: (x) => (x + 2) / (x + 3) }],
        vlines: [{ x: -3 }],
        hlines: [{ y: 1 }],
        points: [{ x: 3, y: 5 / 6, open: true, label: 'hole (3, ⅚)' }, { x: -2, y: 0, label: '(−2, 0)' }],
        alt: 'Graph of f. It has two branches separated by the dashed vertical asymptote x = −3, approaches the dashed horizontal asymptote y = 1 at both ends, crosses the x-axis at (−2, 0), and has an open circle marking a hole at (3, ⅚).',
      },
    },
    {
      title: 'A polynomial inequality',
      problem: R`Solve \(x^{3} - 4x > 0\).`,
      steps: [
        R`Factor: \(x(x - 2)(x + 2) > 0\). The zeros are \(-2\), \(0\) and \(2\), each of multiplicity 1, so the sign changes at each one.`,
        R`Test \(x = 3\): \(3 \cdot 1 \cdot 5 > 0\), so the product is positive for \(x > 2\).`,
        R`Moving left, the sign alternates: negative on \((0, 2)\), positive on \((-2, 0)\), negative for \(x < -2\).`,
      ],
      answer: R`\(-2 < x < 0\) or \(x > 2\)`,
    },
    {
      title: 'Word problem: average cost',
      word: true,
      problem: R`A bakery pays $600 a month for its stall and $4 in ingredients for each cake. How many cakes must it sell in a month for the average cost per cake to be below $6? What happens to the average cost if it sells a very large number?`,
      steps: [
        R`The total cost of \(x\) cakes is \(600 + 4x\), so the average cost is \(A(x) = \dfrac{600 + 4x}{x} = 4 + \dfrac{600}{x}\).`,
        R`Solve \(4 + \dfrac{600}{x} < 6\): \(\dfrac{600}{x} < 2\). Because \(x > 0\), multiply by \(x\): \(600 < 2x\), so \(x > 300\).`,
        R`As \(x \to \infty\), \(\dfrac{600}{x} \to 0\), so \(A(x) \to 4\). The line \(y = 4\) is a horizontal asymptote.`,
      ],
      answer: 'More than 300 cakes. The average cost approaches $4 per cake but stays above it.',
      visual: {
        type: 'plot',
        x: [0, 900],
        y: [0, 14],
        fns: [{ f: (x) => 4 + 600 / x, domain: [20, 900] }],
        hlines: [{ y: 4 }],
        points: [{ x: 300, y: 6, label: '(300, 6)' }],
        axisLabels: ['cakes', 'average cost ($)'],
        alt: 'Graph of the average cost per cake against the number of cakes. The curve falls steeply, passes through (300, 6), and levels off towards the dashed horizontal asymptote y = 4.',
      },
    },
  ],

  models: [
    {
      id: 'rational-features',
      title: 'Zeros, holes and asymptotes',
      intro: 'Choose the four numbers in f(x) = (x − a)(x − b) / ((x − c)(x − d)). Make a number in the top match one in the bottom to create a hole.',
      inputs: [
        { name: 'a', label: 'a (numerator)', type: 'int', min: -6, max: 6, value: -2 },
        { name: 'b', label: 'b (numerator)', type: 'int', min: -6, max: 6, value: 3 },
        { name: 'c', label: 'c (denominator)', type: 'int', min: -6, max: 6, value: 3 },
        { name: 'd', label: 'd (denominator)', type: 'int', min: -6, max: 6, value: -3 },
      ],
      compute({ a, b, c, d }) {
        const ft = rationalFeatures(a, b, c, d);
        const show = (roots) => {
          if (roots.length === 0) return '1';
          if (roots.length === 1) return linear(1, -roots[0]);
          const zeros = roots.filter((r) => r === 0).length;
          return `${power('x', zeros)}${roots.filter((r) => r !== 0).map((r) => factor(r)).join('')}`;
        };
        const simpleTex = ft.botRoots.length ? R`\dfrac{${show(ft.topRoots)}}{${show(ft.botRoots)}}` : show(ft.topRoots);
        const steps = [R`Factored form: \(f(x) = \dfrac{${show([a, b])}}{${show([c, d])}}\).`];
        if (ft.cancelled.length) steps.push(R`Cancel the common factor${ft.cancelled.length > 1 ? 's' : ''} \(${ft.cancelled.map((r) => (r === 0 ? 'x' : factor(r))).join(R`,\ `)}\): for the other values of \(x\), \(f(x) = ${simpleTex}\).`);
        else steps.push('No factor is common to the numerator and the denominator, so there are no holes.');
        if (ft.holePoints.length) steps.push(`${ft.holePoints.length > 1 ? 'Holes' : 'Hole'} (from the cancelled ${ft.holePoints.length > 1 ? 'factors' : 'factor'}): ${ft.holePoints.map(([x, y]) => R`\(\left(${x},\ ${y.tex()}\right)\)`).join(' and ')}. The height comes from the simplified form.`);
        else if (ft.cancelled.length) steps.push(R`The cancelled factor is still present in the denominator, so \(x = ${ft.cancelled[0]}\) remains a vertical asymptote and there is no hole.`);
        steps.push(ft.asymptotes.length ? `Vertical ${ft.asymptotes.length > 1 ? 'asymptotes' : 'asymptote'} (from what is left in the denominator): ${ft.asymptotes.map((r) => R`\(x = ${r}\)`).join(' and ')}.` : 'No factor is left in the denominator, so there is no vertical asymptote.');
        steps.push(ft.zeros.length ? `${ft.zeros.length > 1 ? 'Zeros' : 'Zero'} (from what is left in the numerator): ${ft.zeros.map((r) => R`\(x = ${r}\)`).join(' and ')}.` : ft.topRoots.length ? 'What is left in the numerator is zero only at the hole, so the graph has no x-intercept.' : 'No factor is left in the numerator, so the graph has no x-intercept.');
        steps.push(R`The numerator and denominator have the same degree and leading coefficients 1, so the horizontal asymptote is \(y = 1\).`);
        const parts = [
          ft.zeros.length ? `${ft.zeros.length > 1 ? 'zeros' : 'a zero'} at ${ft.zeros.map((r) => R`\(x = ${r}\)`).join(', ')}` : 'no zeros',
          ft.holePoints.length ? `${ft.holePoints.length > 1 ? 'holes' : 'a hole'} at ${ft.holePoints.map(([x, y]) => R`\(\left(${x},\ ${y.tex()}\right)\)`).join(', ')}` : 'no holes',
          ft.asymptotes.length ? `vertical ${ft.asymptotes.length > 1 ? 'asymptotes' : 'asymptote'} ${ft.asymptotes.map((r) => R`\(x = ${r}\)`).join(', ')}` : 'no vertical asymptote',
          R`horizontal asymptote \(y = 1\)`,
        ];
        return {
          problem: R`Analyse \(f(x) = \dfrac{${show([a, b])}}{${show([c, d])}}\).`,
          steps,
          answer: `${parts.join('; ')}.`.replace(/^./, (ch) => ch.toUpperCase()),
          visual: {
            type: 'plot',
            x: [-10, 10],
            y: [-8, 8],
            fns: [{ f: ft.simple }],
            vlines: ft.asymptotes.map((x) => ({ x })),
            hlines: [{ y: 1 }],
            points: [...ft.holePoints.map(([x, y]) => ({ x, y: y.value, open: true, label: 'hole' })), ...ft.zeros.map((x) => ({ x, y: 0, color: 'b' }))],
            alt: `Graph of the rational function with ${ft.asymptotes.length ? `dashed vertical asymptotes at x = ${ft.asymptotes.join(' and x = ')}` : 'no vertical asymptote'}, a dashed horizontal asymptote y = 1, ${ft.holePoints.length ? `an open circle marking each hole (x = ${ft.holes.join(', ')})` : 'no holes'}, and ${ft.zeros.length ? `x-intercepts at x = ${ft.zeros.join(' and x = ')}` : 'no x-intercepts'}.`,
          },
        };
      },
    },
    {
      id: 'polynomial-shape',
      title: 'Zeros, multiplicity and end behaviour',
      intro: 'Build f(x) = a(x − r₁)^m(x − r₂)^n and see how the multiplicities and the leading coefficient shape the graph.',
      inputs: [
        { name: 'a', label: 'Leading coefficient a', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'r1', label: 'First zero r₁', type: 'int', min: -5, max: 5, value: -2 },
        { name: 'm1', label: 'Its multiplicity m', type: 'int', min: 1, max: 3, value: 1 },
        { name: 'r2', label: 'Second zero r₂', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'm2', label: 'Its multiplicity n', type: 'int', min: 1, max: 3, value: 2 },
      ],
      compute({ a, r1, m1, r2, m2 }) {
        if (a === 0) return { error: 'With a = 0 the function is the zero function. Choose a leading coefficient other than 0.' };
        if (r1 === r2) return { error: 'The two zeros are the same number. Choose two different zeros to compare their behaviour.' };
        const n = m1 + m2;
        const f = (x) => a * (x - r1) ** m1 * (x - r2) ** m2;
        const right = Math.sign(a);
        const left = n % 2 === 0 ? right : -right;
        const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
        let peak = 1;
        for (let i = 0; i <= 60; i++) peak = Math.max(peak, Math.abs(f(lo - 0.7 + ((hi - lo + 1.4) * i) / 60)));
        const behave = (r, m) => R`At \(x = ${r}\) the multiplicity is \(${m}\) (${m % 2 ? 'odd' : 'even'}), so the graph ${m % 2 ? 'crosses the axis' : 'touches the axis and turns back'}${m === 3 ? ', flattening as it goes through' : ''}.`;
        return {
          problem: R`Describe the graph of \(f(x) = ${coef(a)}${facs([[r1, m1], [r2, m2]])}\).`,
          steps: [
            R`Degree: \(${m1} + ${m2} = ${n}\). The leading term is \(${terms([[a, power('x', n)]])}\).`,
            behave(r1, m1),
            behave(r2, m2),
            R`The degree is ${n % 2 ? 'odd' : 'even'} and the leading coefficient is ${a > 0 ? 'positive' : 'negative'}: \(${lim('-', left)}\) and \(${lim('', right)}\).`,
          ],
          answer: R`Degree \(${n}\); ${m1 % 2 ? 'crosses' : 'touches'} at \(x = ${r1}\), ${m2 % 2 ? 'crosses' : 'touches'} at \(x = ${r2}\); ${left > 0 ? 'rises' : 'falls'} to the left and ${right > 0 ? 'rises' : 'falls'} to the right.`,
          visual: {
            type: 'plot',
            x: [lo - 2, hi + 2],
            y: [-1.4 * peak, 1.4 * peak],
            fns: [{ f }],
            points: [{ x: r1, y: 0, label: m1 % 2 ? 'crosses' : 'touches' }, { x: r2, y: 0, label: m2 % 2 ? 'crosses' : 'touches', color: 'b' }],
            alt: `Graph of the polynomial. It ${m1 % 2 ? 'crosses' : 'touches'} the x-axis at x = ${r1} and ${m2 % 2 ? 'crosses' : 'touches'} it at x = ${r2}. It ${left > 0 ? 'rises' : 'falls'} on the far left and ${right > 0 ? 'rises' : 'falls'} on the far right.`,
          },
        };
      },
    },
    {
      id: 'average-cost',
      title: 'Word problem: average cost',
      word: true,
      intro: 'A fixed cost is shared between all the items made, so the average cost per item falls towards the cost of making one more item.',
      inputs: [
        { name: 'fixed', label: 'Fixed cost (dollars)', type: 'int', min: 50, max: 5000, value: 600 },
        { name: 'each', label: 'Cost per item (dollars)', type: 'int', min: 1, max: 50, value: 4 },
        { name: 'target', label: 'Target average cost (dollars)', type: 'int', min: 2, max: 100, value: 6 },
      ],
      compute({ fixed, each, target }) {
        if (target <= each) return { error: `The average cost is always more than ${money(each)}, the cost of the item itself. Choose a target above ${money(each)}.` };
        const gap = target - each;
        const N = frac(fixed, gap);
        const whole = Math.floor(N.value) + 1;
        return {
          problem: R`A business pays ${money(fixed)} in fixed costs and ${money(each)} for each item it makes. How many items must it make for the average cost per item to be below ${money(target)}?`,
          steps: [
            R`Average cost for \(x\) items: \(A(x) = \dfrac{${terms([[fixed, ''], [each, 'x']])}}{x} = ${each} + \dfrac{${fixed}}{x}\).`,
            R`Solve \(${each} + \dfrac{${fixed}}{x} < ${target}\): subtract \(${each}\) to get \(\dfrac{${fixed}}{x} < ${gap}\).`,
            R`Because \(x > 0\), multiply by \(x\) and divide by \(${gap}\): \(x > ${N.tex()}${N.isInt() ? '' : R` \approx ${num(N.value, { places: 1 })}`}\).`,
            R`As \(x \to \infty\), \(\dfrac{${fixed}}{x} \to 0\), so the average cost approaches \(${each}\): the horizontal asymptote is \(y = ${each}\).`,
          ],
          answer: `At least ${whole} items. The average cost keeps falling towards ${money(each)} but never reaches it.`,
          visual: {
            type: 'plot',
            x: [0, Math.max(10, 3 * N.value)],
            y: [0, Math.max(2 * target - each, target + 2)],
            fns: [{ f: (x) => each + fixed / x, domain: [N.value / 40, Math.max(10, 3 * N.value)] }],
            hlines: [{ y: each }],
            points: [{ x: N.value, y: target, label: `average ${money(target)}` }],
            axisLabels: ['items', 'average cost ($)'],
            alt: `Graph of average cost against the number of items. The curve falls, passes the target of ${money(target)} at about ${num(N.value, { places: 1 })} items, and levels off towards the dashed horizontal asymptote y = ${each}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyEndBehavior, easyMultiplicity, easyCountZeros, easyAsymptotes],
    medium: [mediumConjugate, mediumPolyFromZeros, mediumHoleOrAsymptote, mediumHorizontalAsymptote, mediumQuadInequality],
    hard: [hardSlantAsymptote, hardHoleCoordinates, hardRationalInequality, hardGraphMatch, hardAverageCost],
    challenge: [challengeFindK, challengeBuildRational, challengeConstantTerm, challengeDoubleZeroInequality],
  },
};
