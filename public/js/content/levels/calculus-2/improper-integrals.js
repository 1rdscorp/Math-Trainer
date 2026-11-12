import { R, q, frac, terms, power, num } from '../../lib/index.js';
import { M, K, N, exactChoices, fterms, quad, checkQuad } from './_shared.js';

const DIV = 'Diverges';
const INF = R`\infty`;
// x^p for a Frac exponent: x, \sqrt{x}, x^{3}, x^{3/2}.
const xPow = (p, x = 'x') => (p.eq(1) ? x : p.eq(frac(1, 2)) ? `\\sqrt{${x}}` : p.isInt() ? `${x}^{${p.n}}` : `${x}^{${p.n}/${p.d}}`);
// A divergent integral keeps growing: the truncated integrals over [a1, b1] and [a2, b2] differ by more than 1.
const grows = (f, [a1, b1], [a2, b2]) => (Math.abs(quad(f, a2, b2) - quad(f, a1, b1)) > 1 ? true : 'the truncated integrals do not grow, so the integral may converge');

// ───────────── Easy ─────────────

function easyIdentify(rng) {
  const a = rng.int(1, 5);
  const b = a + rng.int(2, 5);
  const r = rng.int(a + 1, b - 1);
  const c = rng.int(1, 6);
  const INFINITE = 'The interval of integration is infinite';
  const NOT = 'It is not improper';
  const at = (p) => R`The integrand is unbounded at \(x = ${p}\)`;
  const finite = { value: INFINITE, why: 'Both limits of integration are finite numbers.' };
  const cases = [
    { int: R`\int_{${a}}^{\infty} \frac{dx}{x^{2}}`, right: INFINITE, wrong: [{ value: at(a), why: R`The integrand is continuous at \(x = ${a}\).` }, at(0), { value: NOT, why: 'An infinite limit of integration makes an integral improper.' }], sol: R`The upper limit is \(\infty\), and \(\frac{1}{x^{2}}\) is continuous for \(x \ge ${a}\).` },
    { int: R`\int_{-\infty}^{${a}} e^{x}\,dx`, right: INFINITE, wrong: [{ value: at(a), why: R`\(e^{x}\) is continuous everywhere.` }, at(0), { value: NOT, why: 'An infinite limit of integration makes an integral improper.' }], sol: R`The lower limit is \(-\infty\), and \(e^{x}\) is continuous everywhere.` },
    { int: R`\int_{0}^{${b}} \frac{dx}{\sqrt{x}}`, right: at(0), wrong: [finite, at(b), { value: NOT, why: R`\(\frac{1}{\sqrt{x}}\) grows without bound as \(x \to 0^{+}\).` }], sol: R`Both limits are finite, but \(\frac{1}{\sqrt{x}} \to \infty\) as \(x \to 0^{+}\).` },
    { int: R`\int_{${a}}^{${b}} \frac{dx}{x - ${r}}`, right: at(r), wrong: [finite, at(a), { value: NOT, why: R`The denominator is 0 at \(x = ${r}\), which lies between \(${a}\) and \(${b}\).` }], sol: R`The denominator is 0 at \(x = ${r}\), which lies inside \([${a}, ${b}]\).` },
    { int: R`\int_{${a}}^{${b}} \frac{dx}{(x - ${b})^{2}}`, right: at(b), wrong: [finite, at(a), { value: NOT, why: R`The denominator is 0 at the upper limit \(x = ${b}\).` }], sol: R`The denominator is 0 at the upper limit \(x = ${b}\).` },
    { int: R`\int_{0}^{${b}} \ln x\,dx`, right: at(0), wrong: [finite, at(b), { value: NOT, why: R`\(\ln x \to -\infty\) as \(x \to 0^{+}\).` }], sol: R`Both limits are finite, but \(\ln x \to -\infty\) as \(x \to 0^{+}\).` },
    { int: R`\int_{0}^{${b}} \frac{dx}{x + ${c}}`, right: NOT, wrong: [finite, { value: at(-c), why: R`\(x = ${-c}\) is outside the interval \([0, ${b}]\).` }, at(0)], sol: R`The limits are finite, and the denominator is 0 only at \(x = ${-c}\), outside \([0, ${b}]\). The integrand is continuous on the whole interval.` },
    { int: R`\int_{${a}}^{${b}} \frac{dx}{x^{2} + ${c}}`, right: NOT, wrong: [finite, at(a), at(0)], sol: R`The limits are finite, and \(x^{2} + ${c}\) is never 0, so the integrand is continuous on the whole interval.` },
  ];
  const cs = rng.pick(cases);
  return q({
    prompt: R`Why is \(\displaystyle${cs.int}\) an improper integral, if it is one?`,
    correct: cs.right,
    wrong: cs.wrong,
    solution: [R`An integral is improper if a limit of integration is infinite, or if the integrand is unbounded somewhere on the interval.`, cs.sol],
    rule: cs.right === INFINITE ? 0 : 1,
    skill: 'recognising improper integrals',
  });
}

function easyWriteAsLimit(rng) {
  const kind = rng.pick(['inf', 'zero', 'upper']);
  const L = (v, lo, hi, f) => M(R`\displaystyle\lim_{${v}}\int_{${lo}}^{${hi}} ${f}\,dx`);
  if (kind === 'inf') {
    const a = rng.int(1, 6);
    const f = rng.pick([R`\frac{1}{x^{2}}`, R`\frac{1}{x^{3}}`, 'e^{-x}', R`\frac{1}{1 + x^{2}}`, 'xe^{-x}', R`\frac{1}{x\sqrt{x}}`]);
    return q({
      prompt: R`Which limit defines \(\displaystyle\int_{${a}}^{\infty} ${f}\,dx\)?`,
      correct: L(R`b\to\infty`, a, 'b', f),
      wrong: [
        { value: L(`c\\to ${a}^{+}`, 'c', INF, f), why: R`The trouble is the infinite upper limit. Replace \(\infty\) by \(b\) and let \(b\) grow.` },
        { value: M(R`\displaystyle\int_{${a}}^{b} ${f}\,dx`), why: R`The limit as \(b \to \infty\) is part of the definition.` },
        L(R`b\to 0`, a, 'b', f),
      ],
      solution: [R`The integrand is continuous on \([${a}, \infty)\). Only the upper limit is a problem.`, R`Replace \(\infty\) by a finite number \(b\), integrate, and then let \(b \to \infty\).`],
      rule: 0,
      skill: 'writing an improper integral as a limit',
    });
  }
  if (kind === 'zero') {
    const b = rng.int(1, 9);
    const f = rng.pick([R`\frac{1}{\sqrt{x}}`, R`\frac{1}{\sqrt[3]{x}}`, R`\ln x`, R`\frac{1}{x^{2}}`, R`\frac{1}{x}`]);
    return q({
      prompt: R`Which limit defines \(\displaystyle\int_{0}^{${b}} ${f}\,dx\)?`,
      correct: L(R`c\to 0^{+}`, 'c', b, f),
      wrong: [
        { value: L(R`c\to 0^{-}`, 'c', b, f), why: R`\(c\) must stay inside the interval \((0, ${b}]\), so it approaches 0 from the right.` },
        { value: L(`c\\to ${b}^{-}`, 0, 'c', f), why: R`The integrand is unbounded at \(x = 0\), not at \(x = ${b}\).` },
        L(R`c\to\infty`, 0, 'c', f),
      ],
      solution: [R`The integrand is unbounded at the lower limit \(x = 0\).`, R`Replace 0 by a number \(c\) slightly to the right of it, integrate, and then let \(c \to 0^{+}\).`],
      rule: 1,
      skill: 'writing an improper integral as a limit',
    });
  }
  const a = rng.int(0, 4);
  const r = a + rng.int(1, 5);
  const f = rng.pick([R`\frac{1}{${r} - x}`, R`\frac{1}{\sqrt{${r} - x}}`, R`\frac{1}{(x - ${r})^{2}}`]);
  return q({
    prompt: R`Which limit defines \(\displaystyle\int_{${a}}^{${r}} ${f}\,dx\)?`,
    correct: L(`c\\to ${r}^{-}`, a, 'c', f),
    wrong: [
      { value: L(`c\\to ${r}^{+}`, a, 'c', f), why: R`\(c\) must stay inside the interval \([${a}, ${r})\), so it approaches \(${r}\) from the left.` },
      { value: L(`c\\to ${a}^{+}`, 'c', r, f), why: R`The integrand is unbounded at \(x = ${r}\), not at \(x = ${a}\).` },
      L(R`c\to\infty`, a, 'c', f),
    ],
    solution: [R`The integrand is unbounded at the upper limit \(x = ${r}\).`, R`Replace \(${r}\) by a number \(c\) slightly to the left of it, integrate, and then let \(c \to ${r}^{-}\).`],
    rule: 1,
    skill: 'writing an improper integral as a limit',
  });
}

function easyPIntegral(rng) {
  const p = frac(...rng.pick([[1, 3], [1, 2], [2, 3], [1, 1], [4, 3], [3, 2], [2, 1], [3, 1], [4, 1]]));
  const c = rng.int(1, 5);
  const atInf = rng.bool();
  const pv = p.value;
  const converges = atInf ? pv > 1 : pv < 1;
  const gap = atInf ? p.sub(1) : frac(1).sub(p); // |p − 1| when the integral converges
  const f = (x) => c / x ** pv;
  const integrand = fterms([[c, '', xPow(p)]]);
  const int = atInf ? R`\int_{1}^{\infty} ${integrand}\,dx` : R`\int_{0}^{1} ${integrand}\,dx`;
  const test = atInf ? R`On \([1, \infty)\), \(\displaystyle\int \frac{dx}{x^{p}}\) converges exactly when \(p > 1\).` : R`On \((0, 1]\), \(\displaystyle\int \frac{dx}{x^{p}}\) converges exactly when \(p < 1\).`;
  const here = R`Here \(p = ${p.tex()}\).`;
  if (converges) {
    const value = frac(c).div(gap);
    return q({
      prompt: R`Evaluate \(\displaystyle${int}\), or state that it diverges.`,
      ...exactChoices(N(value), [{ k: DIV, why: `${test} ${here}` }, N(frac(c).mul(gap)), N(frac(c).div(p)), N(value.neg()), N(value.add(c))]),
      solution: [
        `${test} ${here} So the integral converges.`,
        atInf
          ? R`\(\displaystyle\lim_{b\to\infty}\int_{1}^{b} ${integrand}\,dx = \lim_{b\to\infty} ${value.tex()}\left(1 - \frac{1}{${xPow(gap, 'b')}}\right) = ${value.tex()}\).`
          : R`\(\displaystyle\lim_{t\to 0^{+}}\int_{t}^{1} ${integrand}\,dx = \lim_{t\to 0^{+}} ${value.tex()}\left(1 - ${xPow(gap, 't')}\right) = ${value.tex()}\).`,
      ],
      rule: 2,
      skill: 'p-integrals',
      check: () => checkQuad(f, atInf ? 1 : 0, atInf ? Infinity : 1, value.value),
    });
  }
  const size = p.sub(1).abs();
  return q({
    prompt: R`Evaluate \(\displaystyle${int}\), or state that it diverges.`,
    ...exactChoices(DIV, [
      size.n === 0 ? null : { k: N(frac(c).div(size)), why: `${test} ${here} The power rule gives an antiderivative, but its limit is not finite.` },
      { k: N(0), why: atInf ? 'The integrand approaches 0, but too slowly for the area under it to be finite.' : 'The integrand is positive, so the area cannot be 0. Here it is not even finite.' },
      N(c),
      N(frac(c).mul(p).add(1)),
    ]),
    solution: [
      `${test} ${here} So the integral diverges.`,
      atInf
        ? size.n === 0
          ? R`Check: \(\displaystyle\int_{1}^{b} ${integrand}\,dx = ${terms([[c, '\\ln b']])} \to \infty\) as \(b \to \infty\).`
          : R`Check: \(\displaystyle\int_{1}^{b} ${integrand}\,dx = ${frac(c).div(size).tex()}\left(${xPow(size, 'b')} - 1\right) \to \infty\) as \(b \to \infty\).`
        : size.n === 0
          ? R`Check: \(\displaystyle\int_{t}^{1} ${integrand}\,dx = ${terms([[-c, '\\ln t']])} \to \infty\) as \(t \to 0^{+}\).`
          : R`Check: \(\displaystyle\int_{t}^{1} ${integrand}\,dx = ${frac(c).div(size).tex()}\left(\frac{1}{${xPow(size, 't')}} - 1\right) \to \infty\) as \(t \to 0^{+}\).`,
    ],
    rule: 2,
    skill: 'p-integrals',
    check: () => (atInf ? grows(f, [1, 1e4], [1, 1e8]) : grows(f, [1e-4, 1], [1e-8, 1])),
  });
}

// ───────────── Medium ─────────────

function mediumEvaluateInfinite(rng) {
  const c = rng.int(1, 12);
  const prompt = (int) => R`Evaluate \(\displaystyle${int}\), or state that it diverges.`;
  if (rng.bool()) {
    const p = rng.int(2, 4);
    const a = rng.int(1, 4);
    const value = frac(c, (p - 1) * a ** (p - 1));
    const integrand = fterms([[c, '', power('x', p)]]);
    const tail = fterms([[frac(c, p - 1), '', power('b', p - 1)]]);
    return q({
      prompt: prompt(R`\int_{${a}}^{\infty} ${integrand}\,dx`),
      ...exactChoices(N(value), [
        { k: DIV, why: R`This is a p-integral with \(p = ${p} > 1\), so it converges.` },
        a > 1 ? { k: N(frac(c, p - 1)), why: R`Evaluate the antiderivative at the lower limit \(x = ${a}\), not at \(x = 1\).` } : null,
        { k: N(value.neg()), why: R`The value at the lower limit is subtracted, and it is negative, so the result is positive.` },
        N(frac(c, a ** (p - 1))),
        N(frac(c, p * a ** p)),
        N(value.mul(2)),
      ]),
      solution: [
        R`Replace \(\infty\) by \(b\): \(\displaystyle\int_{${a}}^{b} ${integrand}\,dx = \Big[${fterms([[frac(-c, p - 1), '', power('x', p - 1)]])}\Big]_{${a}}^{b} = ${value.tex()} - ${tail}\).`,
        R`As \(b \to \infty\), \(${tail} \to 0\).`,
        R`The integral converges to \(${value.tex()}\).`,
      ],
      rule: 0,
      skill: 'evaluating over an infinite interval',
      check: () => checkQuad((x) => c / x ** p, a, Infinity, value.value),
    });
  }
  const k = rng.int(1, 4);
  const a = rng.int(0, 3);
  const E = (x) => (k === 1 ? `e^{-${x}}` : `e^{-${k}${x}}`);
  const eA = a === 0 ? '' : `e^{-${k * a}}`;
  const value = K([[frac(c, k), eA]]);
  const integrand = terms([[c, E('x')]]);
  return q({
    prompt: prompt(R`\int_{${a}}^{\infty} ${integrand}\,dx`),
    ...exactChoices(value, [
      { k: DIV, why: R`\(${E('b')} \to 0\) as \(b \to \infty\), so the limit is finite.` },
      k > 1 ? { k: K([[c, eA]]), why: R`\(\displaystyle\int ${E('x')}\,dx = ${terms([[frac(-1, k), E('x')]])}\). Divide by \(${k}\).` } : null,
      a > 0 ? { k: N(frac(c, k)), why: R`The lower limit is \(x = ${a}\), where \(${E('x')} = ${eA}\), not 1.` } : null,
      K([[frac(-c, k), eA]]),
      K([[c * k, eA]]),
      K([[frac(c, k + 1), eA]]),
    ]),
    solution: [
      R`Replace \(\infty\) by \(b\): \(\displaystyle\int_{${a}}^{b} ${integrand}\,dx = \Big[${terms([[frac(-c, k), E('x')]])}\Big]_{${a}}^{b} = ${value.tex} - ${terms([[frac(c, k), E('b')]])}\).`,
      R`As \(b \to \infty\), \(${E('b')} \to 0\).`,
      R`The integral converges to \(${value.tex}\).`,
    ],
    rule: 0,
    skill: 'evaluating over an infinite interval',
    check: () => checkQuad((x) => c * Math.exp(-k * x), a, Infinity, value.value),
  });
}

function mediumEvaluateDiscontinuity(rng) {
  const c = rng.int(1, 6);
  const a = rng.int(0, 5);
  const u = a === 0 ? 'x' : `x - ${a}`;
  const uP = a === 0 ? 'x' : `(x - ${a})`; // for powers
  const tA = a === 0 ? 't' : `t - ${a}`;
  const kind = rng.pick(['sqrt', 'sqrt', 'cube', 'div1', 'div2']);
  const prompt = (int) => R`Evaluate \(\displaystyle${int}\), or state that it diverges.`;
  const setup = (t) => R`The integrand is unbounded at \(x = ${a}\), so replace the lower limit by \(t\) and let \(t \to ${a}^{+}\)${t}`;
  if (kind === 'sqrt') {
    const m = rng.int(1, 5);
    const b = a + m * m;
    const root = `\\sqrt{${u}}`;
    return q({
      prompt: prompt(R`\int_{${a}}^{${b}} \frac{${c}}{${root}}\,dx`),
      ...exactChoices(N(2 * c * m), [
        { k: DIV, why: R`An unbounded integrand can still enclose a finite area. Here the power is \(p = \frac{1}{2} < 1\).` },
        { k: N(c * m), why: R`\(\displaystyle\int u^{-1/2}\,du = 2u^{1/2}\). Keep the factor 2.` },
        N(frac(2 * c, m)),
        N(frac(c * m, 2)),
        N(2 * c * m * m),
      ]),
      solution: [
        setup('.'),
        R`\(\displaystyle\int_{t}^{${b}} \frac{${c}}{${root}}\,dx = \Big[${2 * c}${root}\Big]_{t}^{${b}} = ${2 * c * m} - ${2 * c}\sqrt{${tA}}\).`,
        R`As \(t \to ${a}^{+}\) the square root goes to 0, so the integral converges to \(${2 * c * m}\).`,
      ],
      rule: 1,
      skill: 'evaluating at an infinite discontinuity',
      check: () => checkQuad((s) => c / Math.sqrt(s), 0, m * m, 2 * c * m),
    });
  }
  if (kind === 'cube') {
    const m = rng.int(1, 3);
    const b = a + m ** 3;
    const value = frac(3 * c * m * m, 2);
    const root = `\\sqrt[3]{${u}}`;
    return q({
      prompt: prompt(R`\int_{${a}}^{${b}} \frac{${c}}{${root}}\,dx`),
      ...exactChoices(N(value), [
        { k: DIV, why: R`An unbounded integrand can still enclose a finite area. Here the power is \(p = \frac{1}{3} < 1\).` },
        { k: N(frac(2 * c * m * m, 3)), why: R`\(\displaystyle\int u^{-1/3}\,du = \frac{3}{2}u^{2/3}\): divide by the new exponent \(\frac{2}{3}\).` },
        N(3 * c * m * m),
        N(frac(3 * c * m, 2)),
        N(c * m * m),
      ]),
      solution: [
        setup('.'),
        R`\(\displaystyle\int_{t}^{${b}} ${terms([[c, `${uP}^{-1/3}`]])}\,dx = \Big[${frac(3 * c, 2).tex()}${uP}^{2/3}\Big]_{t}^{${b}}\), and \(${b - a}^{2/3} = ${m * m}\).`,
        R`As \(t \to ${a}^{+}\) the lower value goes to 0, so the integral converges to \(${value.tex()}\).`,
      ],
      rule: 1,
      skill: 'evaluating at an infinite discontinuity',
      check: () => checkQuad((s) => c / Math.cbrt(s), 0, m ** 3, value.value),
    });
  }
  const w = rng.int(1, 5);
  const b = a + w;
  if (kind === 'div1') {
    return q({
      prompt: prompt(R`\int_{${a}}^{${b}} \frac{${c}}{${u}}\,dx`),
      ...exactChoices(DIV, [
        w > 1 ? { k: K([[c, `\\ln ${w}`]]), why: R`The value at the lower limit cannot be dropped: \(\ln(${tA}) \to -\infty\) as \(t \to ${a}^{+}\).` } : null,
        { k: N(0), why: 'The integrand is positive on the whole interval, so the area cannot be 0.' },
        N(c * w),
        N(frac(c, w)),
        N(c),
        N(2 * c),
        N(-c),
      ]),
      solution: [
        setup('.'),
        R`\(\displaystyle\int_{t}^{${b}} \frac{${c}}{${u}}\,dx = \Big[${c}\ln|${u}|\Big]_{t}^{${b}} = ${c}\ln ${w} - ${c}\ln(${tA})\).`,
        R`As \(t \to ${a}^{+}\), \(\ln(${tA}) \to -\infty\), so the expression grows without bound. The integral diverges.`,
      ],
      rule: 1,
      skill: 'evaluating at an infinite discontinuity',
      check: () => grows((s) => c / s, [1e-4, w], [1e-8, w]),
    });
  }
  return q({
    prompt: prompt(R`\int_{${a}}^{${b}} \frac{${c}}{${uP}^{2}}\,dx`),
    ...exactChoices(DIV, [
      { k: N(frac(-c, w)), why: R`The value at the lower limit cannot be dropped: \(\frac{${c}}{${tA}} \to \infty\) as \(t \to ${a}^{+}\). A positive integrand cannot give a negative area.` },
      { k: N(frac(c, w)), why: R`The antiderivative is unbounded near \(x = ${a}\), so the limit is not finite.` },
      N(0),
      N(c),
      N(c * w),
    ]),
    solution: [
      setup('.'),
      R`\(\displaystyle\int_{t}^{${b}} \frac{${c}}{${uP}^{2}}\,dx = \Big[-\frac{${c}}{${u}}\Big]_{t}^{${b}} = -${frac(c, w).tex()} + \frac{${c}}{${tA}}\).`,
      R`As \(t \to ${a}^{+}\) the last fraction grows without bound. The integral diverges (this is a p-integral with \(p = 2 \ge 1\)).`,
    ],
    rule: 1,
    skill: 'evaluating at an infinite discontinuity',
    check: () => grows((s) => c / (s * s), [1e-4, w], [1e-8, w]),
  });
}

function mediumWordTotal(rng) {
  const A = rng.int(1, 12) * 5;
  const n = rng.pick([2, 4, 5, 8, 10, 20]);
  const ctx = rng.pick([
    { lead: 'After a valve fails, oil leaks from a pipeline', unit: 'barrels', per: 'day', time: 'days', what: 'oil leaks out' },
    { lead: 'A skin patch releases medicine', unit: 'milligrams', per: 'hour', time: 'hours', what: 'medicine is released' },
    { lead: 'A cooling engine gives off heat', unit: 'kilojoules', per: 'minute', time: 'minutes', what: 'heat is given off' },
  ]);
  const total = A * n;
  const wrap = (tex) => R`\(${tex}\) ${ctx.unit}`;
  const E = (t) => `e^{-${t}/${n}}`;
  return q({
    prompt: R`${ctx.lead} at a rate of \(r(t) = ${A}${E('t')}\) ${ctx.unit} per ${ctx.per}, where \(t\) is the time in ${ctx.time}. If this goes on indefinitely, how much ${ctx.what} in total?`,
    ...exactChoices(
      N(total),
      [
        { k: N(frac(A, n)), why: R`\(\displaystyle\int ${E('t')}\,dt = -${n}${E('t')}\): dividing by \(-\frac{1}{${n}}\) multiplies by \(-${n}\).` },
        { k: 'The total is infinite', why: 'The rate decays exponentially, which is fast enough for the total to be finite.' },
        { k: N(A), why: R`\(${A}\) is the starting rate. The total is the integral of the rate.` },
        N(A * n * n),
        N(total + A),
      ],
      wrap,
    ),
    solution: [
      R`The total is an integral over an infinite interval: \(\displaystyle\int_{0}^{\infty} ${A}${E('t')}\,dt = \lim_{b\to\infty}\Big[-${total}${E('t')}\Big]_{0}^{b}\).`,
      R`\(= \displaystyle\lim_{b\to\infty}\left(${total} - ${total}${E('b')}\right) = ${total}\), because \(${E('b')} \to 0\).`,
      R`The total approaches \(${total}\) ${ctx.unit}, even though the rate never reaches exactly 0.`,
    ],
    rule: 4,
    skill: 'totals over unbounded time',
    check: () => checkQuad((t) => A * Math.exp(-t / n), 0, Infinity, total),
  });
}

// ───────────── Hard ─────────────

function hardComparison(rng) {
  const a = rng.int(2, 9);
  const p = rng.int(2, 4);
  const one = R`\dfrac{1}{x}`;
  const sq = R`\dfrac{1}{x^{2}}`;
  const xp = R`\dfrac{1}{x^{${p}}}`;
  const bank = [
    { f: R`\dfrac{\sin^{2}x}{x^{${p}}}`, lo: 1, g: xp, conv: true, fJs: (x) => Math.sin(x) ** 2 / x ** p, gJs: (x) => x ** -p, because: R`\(0 \le \sin^{2}x \le 1\)` },
    { f: R`\dfrac{1}{x^{${p}} + ${a}}`, lo: 1, g: xp, conv: true, fJs: (x) => 1 / (x ** p + a), gJs: (x) => x ** -p, because: R`a larger denominator makes a smaller fraction` },
    { f: R`\dfrac{e^{-x}}{x + ${a}}`, lo: 1, g: 'e^{-x}', conv: true, fJs: (x) => Math.exp(-x) / (x + a), gJs: (x) => Math.exp(-x), because: R`\(x + ${a} \ge 1\)` },
    { f: R`\dfrac{1}{\sqrt{x^{4} + ${a}}}`, lo: 1, g: sq, conv: true, fJs: (x) => 1 / Math.sqrt(x ** 4 + a), gJs: (x) => x ** -2, because: R`\(\sqrt{x^{4} + ${a}} \ge x^{2}\)` },
    { f: R`\dfrac{${a} + \cos x}{x}`, lo: 1, g: one, conv: false, fJs: (x) => (a + Math.cos(x)) / x, gJs: (x) => 1 / x, because: R`\(${a} + \cos x \ge ${a - 1} \ge 1\)` },
    { f: R`\dfrac{1}{\sqrt{x} - 1}`, lo: a, g: R`\dfrac{1}{\sqrt{x}}`, conv: false, fJs: (x) => 1 / (Math.sqrt(x) - 1), gJs: (x) => 1 / Math.sqrt(x), because: R`a smaller positive denominator makes a larger fraction` },
    { f: R`\dfrac{x + ${a}}{x^{2}}`, lo: 1, g: one, conv: false, fJs: (x) => (x + a) / (x * x), gJs: (x) => 1 / x, because: R`\(\dfrac{x + ${a}}{x^{2}} = \dfrac{1}{x} + \dfrac{${a}}{x^{2}}\)` },
    { f: R`\dfrac{\ln x}{x}`, lo: a + 1, g: one, conv: false, fJs: (x) => Math.log(x) / x, gJs: (x) => 1 / x, because: R`\(\ln x \ge 1\) for \(x \ge e\)` },
  ];
  const it = rng.pick(bank);
  const I = (g) => R`\(\displaystyle\int_{${it.lo}}^{\infty} ${g}\,dx\)`;
  const convSays = (g) => R`Converges: \(0 \le f(x) \le ${g}\) for \(x \ge ${it.lo}\), and ${I(g)} converges`;
  const divSays = (g) => R`Diverges: \(f(x) \ge ${g} > 0\) for \(x \ge ${it.lo}\), and ${I(g)} diverges`;
  return q({
    prompt: R`Let \(f(x) = ${it.f}\). Which statement correctly decides whether ${I('f(x)')} converges?`,
    correct: it.conv ? convSays(it.g) : divSays(it.g),
    wrong: [
      it.conv
        ? { value: divSays(one), why: R`That inequality is false here: \(f(x)\) is smaller than \(\frac{1}{x}\). Being smaller than a divergent integral proves nothing.` }
        : { value: convSays(sq), why: R`That inequality is false here: \(f(x)\) is larger than \(\frac{1}{x^{2}}\). Being larger than a convergent integral proves nothing.` },
      { value: R`Converges, because \(f(x) \to 0\) as \(x \to \infty\)`, why: R`\(\frac{1}{x} \to 0\) too, yet \(\int_{1}^{\infty}\frac{dx}{x}\) diverges. Approaching 0 is necessary but not enough.` },
      { value: 'Diverges, because the interval of integration is infinite', why: R`\(\int_{1}^{\infty}\frac{dx}{x^{2}} = 1\) is finite. An infinite interval alone does not decide it.` },
    ],
    solution: it.conv
      ? [
          R`Look for a simpler function that is larger. Since ${it.because}, \(0 \le f(x) \le ${it.g}\) for \(x \ge ${it.lo}\).`,
          R`${I(it.g)} converges${it.g === 'e^{-x}' ? '' : R` (a p-integral with \(p > 1\))`}.`,
          R`An integral that is smaller than a convergent one, with a non-negative integrand, also converges.`,
        ]
      : [
          R`Look for a simpler function that is smaller. Since ${it.because}, \(f(x) \ge ${it.g} > 0\) for \(x \ge ${it.lo}\).`,
          R`${I(it.g)} diverges (a p-integral with \(p \le 1\)).`,
          R`An integral that is larger than a divergent one also diverges.`,
        ],
    rule: 3,
    skill: 'comparison test for integrals',
    check: () => {
      for (const d of [0, 0.7, 2.5, 9, 40]) {
        const x = it.lo + d;
        const ok = it.conv ? it.fJs(x) >= 0 && it.fJs(x) <= it.gJs(x) + 1e-12 : it.fJs(x) >= it.gJs(x) - 1e-12 && it.gJs(x) > 0;
        if (!ok) return `the comparison fails at x = ${x}`;
      }
      return it.conv ? Number.isFinite(quad(it.fJs, it.lo, Infinity)) || 'not finite' : grows(it.gJs, [it.lo, 1e4], [it.lo, 1e8]);
    },
  });
}

function hardEvaluate(rng) {
  const c = rng.int(1, 9);
  const k = rng.int(1, 4);
  const a = rng.int(1, 4);
  const E = k === 1 ? 'e^{-x}' : `e^{-${k}x}`;
  const E2 = k === 1 ? 'e^{-x^{2}}' : `e^{-${k}x^{2}}`;
  const quadTex = `x^{2} + ${a * a}`;
  const atan = a === 1 ? '\\arctan x' : `\\arctan\\dfrac{x}{${a}}`;
  const piK = (d) => K([[frac(c, d), '\\pi']]);
  const bank = [
    {
      int: R`\int_{0}^{\infty} ${terms([[c, `x${E}`]])}\,dx`, f: (x) => c * x * Math.exp(-k * x), lo: 0, hi: Infinity,
      right: N(frac(c, k * k)),
      wrongs: [{ k: DIV, why: R`\(b\,${E.replace('x', 'b')} \to 0\) as \(b \to \infty\): the exponential decays faster than \(b\) grows.` }, k > 1 ? { k: N(frac(c, k)), why: R`Integration by parts leaves a second integral of \(${E}\), which divides by \(${k}\) once more.` } : null, N(frac(-c, k * k)), N(c * k * k), N(0), N(frac(c, k * k).mul(2))],
      steps: [
        R`Integrate by parts with \(u = ${terms([[c, 'x']])}\), \(dv = ${E}\,dx\): an antiderivative is \(${terms([[frac(-c, k), `x${E}`], [frac(-c, k * k), E]])}\).`,
        R`As \(x \to \infty\) both terms go to 0. At \(x = 0\) the antiderivative equals \(${frac(-c, k * k).tex()}\).`,
      ],
    },
    {
      int: R`\int_{0}^{\infty} ${terms([[c, `x${E2}`]])}\,dx`, f: (x) => c * x * Math.exp(-k * x * x), lo: 0, hi: Infinity,
      right: N(frac(c, 2 * k)),
      wrongs: [{ k: DIV, why: R`\(${E2} \to 0\) extremely fast, so the limit is finite.` }, { k: N(frac(c, k)), why: R`With \(u = ${k === 1 ? '' : k}x^{2}\), \(du = ${2 * k}x\,dx\), so a factor \(\frac{1}{${2 * k}}\) appears.` }, { k: N(0), why: R`That is the value over \((-\infty, \infty)\), where the two halves cancel. Here the interval starts at 0.` }, N(frac(c, 2)), N(c)],
      steps: [
        R`Substitute \(u = ${k === 1 ? '' : k}x^{2}\), \(du = ${2 * k}x\,dx\): an antiderivative is \(${terms([[frac(-c, 2 * k), E2]])}\).`,
        R`As \(x \to \infty\) it goes to 0. At \(x = 0\) it equals \(${frac(-c, 2 * k).tex()}\).`,
      ],
    },
    {
      int: R`\int_{-\infty}^{\infty} \frac{${c}}{${quadTex}}\,dx`, f: (x) => c / (x * x + a * a), lo: -Infinity, hi: Infinity,
      right: piK(a),
      wrongs: [{ k: piK(2 * a), why: R`That is the integral from 0 to \(\infty\). The integrand is even, so the whole line gives twice as much.` }, { k: N(0), why: 'The integrand is positive everywhere, so the area cannot be 0.' }, DIV, piK(1), piK(4 * a), piK(a * a)],
      steps: [
        R`An antiderivative is \(${terms([[frac(c, a), atan]])}\).`,
        R`As \(x \to \infty\), \(${atan} \to \frac{\pi}{2}\); as \(x \to -\infty\), \(${atan} \to -\frac{\pi}{2}\). The difference is \(\pi\).`,
      ],
    },
    {
      int: R`\int_{0}^{\infty} \frac{${c}}{${quadTex}}\,dx`, f: (x) => c / (x * x + a * a), lo: 0, hi: Infinity,
      right: piK(2 * a),
      wrongs: [{ k: piK(a), why: R`\(\arctan\) approaches \(\frac{\pi}{2}\), not \(\pi\), as its input grows.` }, DIV, piK(2), piK(4 * a), piK(2 * a * a), N(frac(c, a))],
      steps: [R`An antiderivative is \(${terms([[frac(c, a), atan]])}\).`, R`As \(x \to \infty\), \(${atan} \to \frac{\pi}{2}\). At \(x = 0\) it is 0.`],
    },
    {
      int: R`\int_{${a}}^{\infty} \frac{${c}}{${quadTex}}\,dx`, f: (x) => c / (x * x + a * a), lo: a, hi: Infinity,
      right: piK(4 * a),
      wrongs: [{ k: piK(2 * a), why: R`At the lower limit \(x = ${a}\), \(${atan} = \arctan 1 = \frac{\pi}{4}\), which must be subtracted.` }, DIV, piK(4), piK(a), K([[frac(3 * c, 4 * a), '\\pi']]), piK(8 * a)],
      steps: [R`An antiderivative is \(${terms([[frac(c, a), atan]])}\).`, R`As \(x \to \infty\), \(${atan} \to \frac{\pi}{2}\). At \(x = ${a}\) it is \(\arctan 1 = \frac{\pi}{4}\). The difference is \(\frac{\pi}{4}\).`],
    },
    {
      int: R`\int_{1}^{\infty} \frac{${terms([[c, '\\ln x']])}}{x^{2}}\,dx`, f: (x) => (c * Math.log(x)) / (x * x), lo: 1, hi: Infinity,
      right: N(c),
      wrongs: [{ k: DIV, why: R`\(\frac{\ln b}{b} \to 0\) as \(b \to \infty\), so the limit is finite.` }, { k: N(0), why: R`At \(x = 1\) the antiderivative \(-\frac{\ln x}{x} - \frac{1}{x}\) equals \(-1\), not 0.` }, N(2 * c), N(frac(c, 2)), N(-c)],
      steps: [
        R`Integrate by parts with \(u = \ln x\), \(dv = x^{-2}\,dx\): an antiderivative is \(${c === 1 ? '' : c}\left(-\dfrac{\ln x}{x} - \dfrac{1}{x}\right)\).`,
        R`As \(x \to \infty\) it goes to 0. At \(x = 1\) it equals \(${-c}\).`,
      ],
    },
  ];
  const it = rng.pick(bank);
  return q({
    prompt: R`Evaluate \(\displaystyle${it.int}\), or state that it diverges.`,
    ...exactChoices(it.right, it.wrongs),
    solution: [...it.steps, R`Subtract (limit at the top minus value at the bottom): the integral converges to \(${it.right.tex}\).`],
    rule: 0,
    skill: 'evaluating over an infinite interval',
    check: () => checkQuad(it.f, it.lo, it.hi, it.right.value),
  });
}

function hardWordProbability(rng) {
  const n = rng.pick([2, 4, 5, 8, 10, 20, 50]);
  const m = rng.int(1, 3);
  const ctx = rng.pick([
    { lead: R`The lifetime \(t\) of a certain light bulb, in months,`, unit: 'months' },
    { lead: R`The lifetime \(t\) of a phone battery, in years,`, unit: 'years' },
    { lead: R`The waiting time \(t\) for the next bus, in minutes,`, unit: 'minutes' },
  ]);
  const dens = R`f(t) = \frac{1}{${n}}e^{-t/${n}}`;
  const f = (t) => Math.exp(-t / n) / n;
  if (rng.bool(0.65)) {
    const t0 = m * n;
    const Em = m === 1 ? 'e^{-1}' : `e^{-${m}}`;
    return q({
      prompt: R`${ctx.lead} has probability density \(${dens}\) for \(t \ge 0\). The probability that it is more than ${t0} ${ctx.unit} is \(\displaystyle\int_{${t0}}^{\infty} f(t)\,dt\). Find it.`,
      ...exactChoices(K([[1, Em]]), [
        { k: K([[1, ''], [-1, Em]]), why: R`That is the probability of at most ${t0} ${ctx.unit}, \(\int_{0}^{${t0}} f(t)\,dt\).` },
        { k: K([[frac(1, n), Em]]), why: R`That is the height of the density at \(t = ${t0}\). A probability is an area under the density.` },
        K([[n, Em]]),
        K([[1, `e^{-${t0}}`]]),
        N(frac(1, n)),
      ]),
      solution: [
        R`\(\displaystyle\int_{${t0}}^{b} \frac{1}{${n}}e^{-t/${n}}\,dt = \Big[-e^{-t/${n}}\Big]_{${t0}}^{b} = e^{-${t0}/${n}} - e^{-b/${n}}\).`,
        R`As \(b \to \infty\), \(e^{-b/${n}} \to 0\).`,
        R`The probability is \(${Em} \approx ${num(Math.exp(-m), { places: 3 })}\).`,
      ],
      rule: 4,
      skill: 'probability as an improper integral',
      check: () => checkQuad(f, t0, Infinity, Math.exp(-m)),
    });
  }
  return q({
    prompt: R`${ctx.lead} has probability density \(${dens}\) for \(t \ge 0\). Its mean is \(\displaystyle\int_{0}^{\infty} t\,f(t)\,dt\). Find it.`,
    correct: n,
    unit: ctx.unit,
    wrong: [
      { value: frac(1, n), why: R`\(\frac{1}{${n}}\) is the rate in the exponent. The mean is its reciprocal.` },
      { value: n * n, why: R`The factor \(\frac{1}{${n}}\) in the density cancels one factor of \(${n}\).` },
      2 * n,
      n + 1,
    ],
    solution: [
      R`Integrate by parts with \(u = t\), \(dv = \frac{1}{${n}}e^{-t/${n}}\,dt\), so \(v = -e^{-t/${n}}\): an antiderivative of \(t\,f(t)\) is \(-te^{-t/${n}} - ${n}e^{-t/${n}}\).`,
      R`As \(t \to \infty\) both terms go to 0. At \(t = 0\) the antiderivative equals \(${-n}\).`,
      R`Mean \(= 0 - (${-n}) = ${n}\) ${ctx.unit}.`,
    ],
    rule: 4,
    skill: 'probability as an improper integral',
    check: () => checkQuad((t) => t * f(t), 0, Infinity, n),
  });
}

// ───────────── Challenge ─────────────

function challengeInterior(rng) {
  const r = rng.int(-3, 3);
  const c = rng.int(1, 6);
  const u = r === 0 ? 'x' : `(x ${r > 0 ? '-' : '+'} ${Math.abs(r)})`;
  const prompt = (int) => R`Evaluate \(\displaystyle${int}\), or state that it diverges.`;
  const split = R`The integrand is unbounded at \(x = ${r}\), which is inside the interval. Split the integral there and treat each piece as a limit.`;
  if (rng.bool(0.4)) {
    const a = rng.int(1, 3);
    const b = rng.int(1, 3);
    const naive = frac(-c * (a + b), a * b);
    return q({
      prompt: prompt(R`\int_{${r - a}}^{${r + b}} \frac{${c}}{${u}^{2}}\,dx`),
      ...exactChoices(DIV, [
        { k: N(naive), why: R`That applies the Fundamental Theorem straight across \(x = ${r}\), where the integrand is unbounded. A positive integrand cannot give a negative area.` },
        { k: N(naive.neg()), why: R`Each piece next to \(x = ${r}\) is a p-integral with \(p = 2\), which diverges.` },
        N(0),
        N(frac(c * (b - a), a * b).add(c)),
        N(c),
      ]),
      solution: [split, R`Right-hand piece: \(\displaystyle\lim_{t\to ${r}^{+}}\int_{t}^{${r + b}} \frac{${c}}{${u}^{2}}\,dx = \lim_{t\to ${r}^{+}}\left(-${frac(c, b).tex()} + \frac{${c}}{${r === 0 ? 't' : `t ${r > 0 ? '-' : '+'} ${Math.abs(r)}`}}\right) = \infty\).`, R`One piece diverges, so the whole integral diverges.`],
      rule: 1,
      skill: 'discontinuity inside the interval',
      check: () => grows((s) => c / (s * s), [1e-4, b], [1e-8, b]),
    });
  }
  const a = rng.int(1, 2);
  const b = rng.int(1, 2);
  const lo = r - a ** 3;
  const hi = r + b ** 3;
  if (rng.bool()) {
    const value = 3 * c * (a + b);
    return q({
      prompt: prompt(R`\int_{${lo}}^{${hi}} \frac{${c}}{${u}^{2/3}}\,dx`),
      ...exactChoices(N(value), [
        { k: DIV, why: R`Each piece is a p-integral with \(p = \frac{2}{3} < 1\) at its bad endpoint, so both converge.` },
        { k: N(3 * c * (b - a)), why: R`The cube root of a negative number is negative: at \(x = ${lo}\), \(${u}^{1/3} = ${-a}\), and subtracting it adds.` },
        N(c * (a + b)),
        N(frac(3 * c * (a + b), 2)),
        N(3 * c * (a * a + b * b)),
        N(value + 3 * c),
      ]),
      solution: [
        split,
        R`An antiderivative is \(${3 * c}${u}^{1/3}\), which is continuous at \(x = ${r}\).`,
        R`Left piece: \(0 - ${3 * c}(${-a}) = ${3 * c * a}\). Right piece: \(${3 * c}(${b}) - 0 = ${3 * c * b}\).`,
        R`Both pieces converge. The integral equals \(${value}\).`,
      ],
      rule: 1,
      skill: 'discontinuity inside the interval',
      check: () => checkQuad((s) => c / Math.cbrt(s) ** 2, 0, b ** 3, value - quad((s) => c / Math.cbrt(s) ** 2, 0, a ** 3)),
    });
  }
  const value = frac(3 * c * (b * b - a * a), 2);
  return q({
    prompt: prompt(R`\int_{${lo}}^{${hi}} \frac{${c}}{${u}^{1/3}}\,dx`),
    ...exactChoices(N(value), [
      { k: DIV, why: R`Each piece is a p-integral with \(p = \frac{1}{3} < 1\) at its bad endpoint, so both converge.` },
      { k: N(frac(3 * c * (b * b + a * a), 2)), why: R`The integrand is negative to the left of \(x = ${r}\), so the left piece is negative.` },
      N(3 * c * (b * b - a * a)),
      N(frac(3 * c * (b - a), 2)),
      N(value.add(c)),
      N(value.sub(3 * c)),
    ]),
    solution: [
      split,
      R`An antiderivative is \(${frac(3 * c, 2).tex()}${u}^{2/3}\), which is continuous at \(x = ${r}\).`,
      R`Left piece: \(0 - ${frac(3 * c, 2).tex()}\cdot ${a * a} = ${frac(-3 * c * a * a, 2).tex()}\). Right piece: \(${frac(3 * c, 2).tex()}\cdot ${b * b} - 0 = ${frac(3 * c * b * b, 2).tex()}\).`,
      R`Both pieces converge. The integral equals \(${value.tex()}\).`,
    ],
    rule: 1,
    skill: 'discontinuity inside the interval',
    check: () => checkQuad((s) => c / Math.cbrt(s), 0, b ** 3, value.value + quad((s) => c / Math.cbrt(s), 0, a ** 3)),
  });
}

function challengeNormalize(rng) {
  const wrap = (tex) => R`\(k = ${tex}\)`;
  const prompt = (f, where) => R`For which constant \(k\) is \(f(x) = ${f}\) for ${where} (and \(f(x) = 0\) elsewhere) a probability density function?`;
  const total1 = R`A probability density must have total area 1.`;
  const kind = rng.pick(['power', 'power', 'exp', 'xexp', 'cauchy']);
  if (kind === 'power') {
    const p = rng.int(2, 4);
    const a = rng.int(1, 3);
    const k = (p - 1) * a ** (p - 1);
    return q({
      prompt: prompt(R`\dfrac{k}{x^{${p}}}`, R`\(x \ge ${a}\)`),
      ...exactChoices(N(k), [{ k: N(frac(1, k)), why: R`\(\frac{1}{${k}}\) is the area when \(k = 1\). To make the area 1, \(k\) must be its reciprocal.` }, N(p - 1), N(p * a ** p), N(a ** (p - 1)), N(k + 1), N(frac(1, p)), N(k + 2)], wrap),
      solution: [total1, R`\(\displaystyle\int_{${a}}^{\infty} \frac{k}{x^{${p}}}\,dx = \lim_{b\to\infty}\Big[-\frac{k}{${p - 1 === 1 ? '' : p - 1}${power('x', p - 1)}}\Big]_{${a}}^{b} = \frac{k}{${k}}\).`, R`Set \(\dfrac{k}{${k}} = 1\): \(k = ${k}\).`],
      rule: 4,
      skill: 'finding a constant',
      check: () => checkQuad((x) => k / x ** p, a, Infinity, 1),
    });
  }
  if (kind === 'exp' || kind === 'xexp') {
    const c = rng.int(2, 6);
    const isX = kind === 'xexp';
    const k = isX ? c * c : c;
    return q({
      prompt: prompt(isX ? `kxe^{-${c}x}` : `ke^{-${c}x}`, R`\(x \ge 0\)`),
      ...exactChoices(N(k), [{ k: N(frac(1, k)), why: R`\(\frac{1}{${k}}\) is the area when \(k = 1\). To make the area 1, \(k\) must be its reciprocal.` }, N(isX ? c : c * c), N(1), N(2 * c), N(k + 1)], wrap),
      solution: [
        total1,
        isX
          ? R`Integration by parts gives \(\displaystyle\int_{0}^{\infty} xe^{-${c}x}\,dx = \frac{1}{${c * c}}\), so the area is \(\dfrac{k}{${c * c}}\).`
          : R`\(\displaystyle\int_{0}^{\infty} ke^{-${c}x}\,dx = \lim_{b\to\infty}\Big[-\frac{k}{${c}}e^{-${c}x}\Big]_{0}^{b} = \frac{k}{${c}}\).`,
        R`Set the area equal to 1: \(k = ${k}\).`,
      ],
      rule: 4,
      skill: 'finding a constant',
      check: () => checkQuad((x) => k * (isX ? x : 1) * Math.exp(-c * x), 0, Infinity, 1),
    });
  }
  const a = rng.int(2, 7);
  const over = (top, bottom) => ({ tex: R`\dfrac{${top}}{${bottom}}`, value: 0 });
  const opt = (top, bottom, value) => ({ ...over(top, bottom), value });
  return q({
    prompt: prompt(R`\dfrac{k}{x^{2} + ${a * a}}`, 'all real \\(x\\)'.replace('\\\\', '\\')),
    ...exactChoices(
      opt(a, '\\pi', a / Math.PI),
      [
        { k: opt('\\pi', a, Math.PI / a), why: R`\(\frac{\pi}{${a}}\) is the area when \(k = 1\). To make the area 1, \(k\) must be its reciprocal.` },
        { k: opt(2 * a, '\\pi', (2 * a) / Math.PI), why: R`The density covers the whole line, where \(\arctan\) runs from \(-\frac{\pi}{2}\) to \(\frac{\pi}{2}\): a total change of \(\pi\).` },
        opt(1, '\\pi', 1 / Math.PI),
        opt(a, '2\\pi', a / (2 * Math.PI)),
        opt(a * a, '\\pi', (a * a) / Math.PI),
      ],
      wrap,
    ),
    solution: [
      total1,
      R`\(\displaystyle\int_{-\infty}^{\infty} \frac{k}{x^{2} + ${a * a}}\,dx = \frac{k}{${a}}\Big[\arctan\frac{x}{${a}}\Big]_{-\infty}^{\infty} = \frac{k}{${a}}\left(\frac{\pi}{2} + \frac{\pi}{2}\right) = \frac{k\pi}{${a}}\).`,
      R`Set \(\dfrac{k\pi}{${a}} = 1\): \(k = \dfrac{${a}}{\pi}\).`,
    ],
    rule: 4,
    skill: 'finding a constant',
    check: () => checkQuad((x) => a / Math.PI / (x * x + a * a), -Infinity, Infinity, 1),
  });
}

function challengeTwoSided(rng) {
  const a = rng.int(1, 6);
  const b = rng.int(1, 4);
  const prompt = (int) => R`Evaluate \(\displaystyle${int}\), or state that it diverges.`;
  const bx2 = b === 1 ? 'x^{2}' : `${b}x^{2}`;
  const kind = rng.pick(['oddDiv', 'oddConv', 'abs', 'left']);
  const both = R`An integral over \((-\infty, \infty)\) converges only if \(\int_{-\infty}^{0}\) and \(\int_{0}^{\infty}\) both converge.`;
  if (kind === 'oddDiv') {
    const f = (x) => (a * x) / (x * x + b * b);
    return q({
      prompt: prompt(R`\int_{-\infty}^{\infty} \frac{${terms([[a, 'x']])}}{x^{2} + ${b * b}}\,dx`),
      ...exactChoices(DIV, [
        { k: N(0), why: R`Symmetry cannot be used here. The half \(\int_{0}^{\infty}\) diverges on its own, and both halves must converge separately.` },
        { k: K([[frac(a, b), '\\pi']]), why: R`That is \(\displaystyle\int_{-\infty}^{\infty} \frac{${a}}{x^{2} + ${b * b}}\,dx\), without the factor \(x\) on top.` },
        K([[frac(a, 2), `\\ln ${b * b + 1}`]]),
        N(a),
        K([[frac(a, 2 * b), '\\pi']]),
      ]),
      solution: [both, R`\(\displaystyle\int_{0}^{t} \frac{${terms([[a, 'x']])}}{x^{2} + ${b * b}}\,dx = ${terms([[frac(a, 2), `\\ln(t^{2} + ${b * b})`], [frac(-a, 2), `\\ln ${b * b}`]])} \to \infty\) as \(t \to \infty\).`, R`One half diverges, so the integral diverges, even though the integrand is odd.`],
      rule: 0,
      skill: 'integrals over the whole line',
      check: () => grows(f, [0, 1e4], [0, 1e8]),
    });
  }
  if (kind === 'oddConv') {
    const f = (x) => a * x * Math.exp(-b * x * x);
    const half = frac(a, 2 * b);
    return q({
      prompt: prompt(R`\int_{-\infty}^{\infty} ${terms([[a, `xe^{-${bx2}}`]])}\,dx`),
      ...exactChoices(N(0), [
        { k: DIV, why: R`Each half converges: \(\displaystyle\int_{0}^{\infty} ${terms([[a, `xe^{-${bx2}}`]])}\,dx = ${half.tex()}\).` },
        { k: N(half.mul(2)), why: 'The two halves have opposite signs, because the integrand is odd. They cancel instead of adding.' },
        N(half),
        N(half.neg()),
        N(a),
      ]),
      solution: [both, R`\(\displaystyle\int_{0}^{\infty} ${terms([[a, `xe^{-${bx2}}`]])}\,dx = \lim_{b\to\infty}\Big[${terms([[half.neg(), `e^{-${bx2}}`]])}\Big]_{0}^{b} = ${half.tex()}\), and by the same calculation \(\displaystyle\int_{-\infty}^{0} = ${half.neg().tex()}\).`, R`Both halves converge, so the integral is \(${half.tex()} + \left(${half.neg().tex()}\right) = 0\).`],
      rule: 0,
      skill: 'integrals over the whole line',
      check: () => checkQuad(f, -Infinity, Infinity, 0),
    });
  }
  if (kind === 'abs') {
    const value = frac(2 * a, b);
    const E = b === 1 ? 'e^{-|x|}' : `e^{-${b}|x|}`;
    return q({
      prompt: prompt(R`\int_{-\infty}^{\infty} ${terms([[a, E]])}\,dx`),
      ...exactChoices(N(value), [
        { k: N(frac(a, b)), why: 'That is one half. The integrand is even, so the two halves are equal and add.' },
        { k: N(0), why: 'The integrand is positive everywhere, so the two halves add. They do not cancel.' },
        DIV,
        N(2 * a * b),
        N(value.mul(2)),
      ]),
      solution: [both, R`For \(x \ge 0\), \(|x| = x\): \(\displaystyle\int_{0}^{\infty} ${terms([[a, b === 1 ? 'e^{-x}' : `e^{-${b}x}`]])}\,dx = ${frac(a, b).tex()}\).`, R`The integrand is even, so the left half is also \(${frac(a, b).tex()}\). The integral is \(${value.tex()}\).`],
      rule: 0,
      skill: 'integrals over the whole line',
      check: () => checkQuad((x) => a * Math.exp(-b * Math.abs(x)), -Infinity, Infinity, value.value),
    });
  }
  const value = frac(a, b);
  const E = (x) => (b === 1 ? `e^{${x}}` : `e^{${b}${x}}`);
  return q({
    prompt: prompt(R`\int_{-\infty}^{0} ${terms([[a, E('x')]])}\,dx`),
    ...exactChoices(N(value), [
      { k: DIV, why: R`\(${E('t')} \to 0\) as \(t \to -\infty\), so the limit is finite.` },
      { k: N(value.neg()), why: R`The value at the upper limit \(x = 0\) is \(${value.tex()}\), and the value at the lower limit goes to 0.` },
      N(a * b),
      N(a),
      N(0),
    ]),
    solution: [R`Replace \(-\infty\) by \(t\): \(\displaystyle\int_{t}^{0} ${terms([[a, E('x')]])}\,dx = \Big[${terms([[value, E('x')]])}\Big]_{t}^{0} = ${value.tex()} - ${terms([[value, E('t')]])}\).`, R`As \(t \to -\infty\), \(${E('t')} \to 0\).`, R`The integral converges to \(${value.tex()}\).`],
    rule: 0,
    skill: 'integrals over the whole line',
    check: () => checkQuad((x) => a * Math.exp(b * x), -Infinity, 0, value.value),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'improper-integrals',
  title: 'Improper Integrals',
  summary: 'Evaluate integrals over infinite intervals or across infinite discontinuities as limits, and decide convergence.',
  standards: ['AP Calculus 6.13'],

  explain: {
    intro: R`A definite integral is improper when the interval is infinite or the integrand is unbounded somewhere on it. Such an integral is defined as a limit of ordinary integrals. If the limit is a finite number the integral **converges** to that number; otherwise it **diverges**. An unbounded region can have a finite area.`,
    rules: [
      {
        title: 'Infinite intervals',
        text: R`Replace the infinite limit by a letter, integrate, then take the limit: \(\displaystyle\int_{a}^{\infty} f(x)\,dx = \lim_{b\to\infty}\int_{a}^{b} f(x)\,dx\). For an integral over \((-\infty, \infty)\), split it at any point; both halves must converge.`,
        example: R`\(\displaystyle\int_{1}^{\infty} \frac{dx}{x^{2}} = \lim_{b\to\infty}\left(1 - \frac{1}{b}\right) = 1\).`,
      },
      {
        title: 'Infinite discontinuities',
        text: R`If the integrand is unbounded at an endpoint, approach that endpoint from inside the interval: \(\displaystyle\int_{a}^{b} f(x)\,dx = \lim_{t\to a^{+}}\int_{t}^{b} f(x)\,dx\). If the trouble is at a point inside the interval, split the integral there. Never apply the Fundamental Theorem straight across such a point.`,
        example: R`\(\displaystyle\int_{0}^{4} \frac{dx}{\sqrt{x}} = \lim_{t\to 0^{+}}\left(4 - 2\sqrt{t}\right) = 4\).`,
      },
      {
        title: 'The p-integrals',
        text: R`\(\displaystyle\int_{1}^{\infty} \frac{dx}{x^{p}}\) converges exactly when \(p > 1\), and then equals \(\dfrac{1}{p - 1}\). At the other end the rule reverses: \(\displaystyle\int_{0}^{1} \frac{dx}{x^{p}}\) converges exactly when \(p < 1\), and then equals \(\dfrac{1}{1 - p}\). With \(p = 1\) both diverge.`,
        example: R`\(\displaystyle\int_{1}^{\infty} \frac{dx}{x^{3}} = \frac{1}{2}\), but \(\displaystyle\int_{1}^{\infty} \frac{dx}{\sqrt{x}}\) diverges.`,
      },
      {
        title: 'Comparison',
        text: R`Suppose \(0 \le f(x) \le g(x)\) on the interval. If \(\int g\) converges, so does \(\int f\). If \(\int f\) diverges, so does \(\int g\). Compare with a p-integral or an exponential. The fact that \(f(x) \to 0\) is not enough for convergence.`,
        example: R`\(\displaystyle\int_{1}^{\infty} \frac{\sin^{2}x}{x^{2}}\,dx\) converges, because \(0 \le \dfrac{\sin^{2}x}{x^{2}} \le \dfrac{1}{x^{2}}\).`,
      },
      {
        title: 'Areas, totals and probabilities',
        text: R`A total accumulated over all future time, the area of an unbounded region, and a probability such as \(P(T > a) = \displaystyle\int_{a}^{\infty} f(t)\,dt\) are all improper integrals. A probability density must have total area 1.`,
        example: R`If a leak has rate \(r(t) = 20e^{-t/5}\) liters per day, the total that ever leaks is \(\displaystyle\int_{0}^{\infty} 20e^{-t/5}\,dt = 100\) liters.`,
      },
    ],
    vocab: [
      { term: 'improper integral', def: 'A definite integral with an infinite limit of integration, or with an integrand that is unbounded on the interval.' },
      { term: 'converges', def: 'The limit that defines the improper integral exists and is a finite number.' },
      { term: 'diverges', def: 'The limit does not exist or is infinite, so the integral has no finite value.' },
      { term: 'p-integral', def: R`An integral of \(\dfrac{1}{x^{p}}\), used as a yardstick for comparison.` },
    ],
    mistakes: [
      R`Integrating straight across a discontinuity: \(\displaystyle\int_{-1}^{1}\frac{dx}{x^{2}}\) is not \(-2\). It diverges.`,
      R`Assuming that \(f(x) \to 0\) forces convergence. \(\dfrac{1}{x} \to 0\), yet \(\displaystyle\int_{1}^{\infty}\frac{dx}{x}\) diverges.`,
      R`Using symmetry over \((-\infty, \infty)\) before checking that each half converges.`,
      R`Mixing up the two p-rules: \(p > 1\) is needed at infinity, \(p < 1\) is needed at 0.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 8],
      y: [0, 1.6],
      fns: [{ f: (x) => 1 / x, label: 'y = 1/x', labelAt: 1.4, domain: [0.5, 8] }, { f: (x) => 1 / (x * x), color: 'b', label: 'y = 1/x²', labelAt: 2.6, domain: [0.7, 8] }],
      shade: [{ f: (x) => 1 / (x * x), from: 1, to: 8, color: 'b' }],
      vlines: [{ x: 1 }],
      alt: 'Graphs of y = 1 over x and y = 1 over x squared for x from 1 onward. Both curves fall toward 0. The area under 1 over x squared to the right of x = 1 is shaded and is finite (it equals 1). The area under 1 over x is infinite, because that curve falls more slowly.',
    },
  },

  examples: [
    {
      title: 'An infinite interval',
      problem: R`Evaluate \(\displaystyle\int_{0}^{\infty} e^{-2x}\,dx\).`,
      steps: [
        R`Replace \(\infty\) by \(b\): \(\displaystyle\int_{0}^{b} e^{-2x}\,dx = \Big[-\tfrac{1}{2}e^{-2x}\Big]_{0}^{b} = \tfrac{1}{2} - \tfrac{1}{2}e^{-2b}\).`,
        R`Let \(b \to \infty\). Since \(e^{-2b} \to 0\), the limit is \(\tfrac{1}{2}\).`,
      ],
      answer: R`The integral converges to \(\frac{1}{2}\).`,
    },
    {
      title: 'An infinite discontinuity',
      problem: R`Evaluate \(\displaystyle\int_{0}^{9} \frac{dx}{\sqrt{x}}\) and \(\displaystyle\int_{0}^{9} \frac{dx}{x}\).`,
      steps: [
        R`Both integrands are unbounded at \(x = 0\), so use \(\displaystyle\lim_{t\to 0^{+}}\int_{t}^{9}\).`,
        R`First: \(\Big[2\sqrt{x}\Big]_{t}^{9} = 6 - 2\sqrt{t} \to 6\). It converges.`,
        R`Second: \(\Big[\ln x\Big]_{t}^{9} = \ln 9 - \ln t \to \infty\), because \(\ln t \to -\infty\). It diverges.`,
      ],
      answer: R`\(\displaystyle\int_{0}^{9}\frac{dx}{\sqrt{x}} = 6\), and \(\displaystyle\int_{0}^{9}\frac{dx}{x}\) diverges. (These are the p-integrals with \(p = \frac{1}{2}\) and \(p = 1\).)`,
    },
    {
      title: 'Deciding by comparison',
      problem: R`Does \(\displaystyle\int_{1}^{\infty} \frac{dx}{x^{3} + 5}\) converge?`,
      steps: [
        R`No simple antiderivative is in sight, so compare. For \(x \ge 1\), \(x^{3} + 5 > x^{3}\), so \(0 < \dfrac{1}{x^{3} + 5} < \dfrac{1}{x^{3}}\).`,
        R`\(\displaystyle\int_{1}^{\infty} \frac{dx}{x^{3}}\) is a p-integral with \(p = 3 > 1\), so it converges.`,
        R`A positive integrand that stays below a convergent one also gives a convergent integral.`,
      ],
      answer: 'It converges, by comparison with the p-integral with p = 3.',
    },
    {
      title: 'Word problem: how likely is a long wait?',
      word: true,
      problem: R`The waiting time \(t\) (in minutes) for a bus has probability density \(f(t) = 0.1e^{-0.1t}\) for \(t \ge 0\). What is the probability of waiting more than 20 minutes?`,
      steps: [
        R`A probability is an area under the density: \(P(t > 20) = \displaystyle\int_{20}^{\infty} 0.1e^{-0.1t}\,dt\).`,
        R`\(\displaystyle\int_{20}^{b} 0.1e^{-0.1t}\,dt = \Big[-e^{-0.1t}\Big]_{20}^{b} = e^{-2} - e^{-0.1b}\).`,
        R`As \(b \to \infty\), \(e^{-0.1b} \to 0\). The probability is \(e^{-2} \approx 0.135\).`,
      ],
      answer: R`\(e^{-2} \approx 0.135\), about a 13.5% chance`,
      visual: {
        type: 'plot',
        x: [0, 50],
        y: [0, 0.11],
        fns: [{ f: (t) => 0.1 * Math.exp(-0.1 * t) }],
        shade: [{ f: (t) => 0.1 * Math.exp(-0.1 * t), from: 20, to: 50 }],
        axisLabels: ['t (min)', 'f(t)'],
        alt: 'Graph of the exponential density 0.1 times e to the minus 0.1 t, falling from 0.1 at t = 0 toward 0. The area under the curve to the right of t = 20 is shaded; it equals e to the minus 2, about 0.135.',
      },
    },
  ],

  models: [
    {
      id: 'p-integral',
      title: 'The p-integrals: does the area stay finite?',
      intro: 'Choose the power p and which end of the graph of 1/xᵖ to look at.',
      inputs: [
        { name: 'p', label: 'p', type: 'number', min: 0.25, max: 4, step: 0.25, value: 2 },
        { name: 'end', label: 'Region', type: 'select', value: 'inf', options: [{ value: 'inf', label: 'from 1 to ∞' }, { value: 'zero', label: 'from 0 to 1' }] },
      ],
      compute({ p, end }) {
        const atInf = end === 'inf';
        const f = (x) => x ** -p;
        const pt = num(p);
        const integrand = p === 1 ? R`\dfrac{1}{x}` : R`\dfrac{1}{x^{${pt}}}`;
        const converges = atInf ? p > 1 : p < 1;
        const value = 1 / Math.abs(p - 1);
        const e = num(Math.abs(1 - p));
        const lead = p === 1 ? '' : num(value, { places: 4 });
        const steps = atInf
          ? [
              R`Write the integral as a limit: \(\displaystyle\int_{1}^{\infty} ${integrand}\,dx = \lim_{b\to\infty}\int_{1}^{b} x^{-${pt}}\,dx\).`,
              p === 1 ? R`\(\displaystyle\int_{1}^{b} \frac{dx}{x} = \ln b\).` : p > 1 ? R`Power rule: \(\displaystyle\int_{1}^{b} x^{-${pt}}\,dx = \frac{1}{${e}}\left(1 - \frac{1}{b^{${e}}}\right)\).` : R`Power rule: \(\displaystyle\int_{1}^{b} x^{-${pt}}\,dx = \frac{1}{${e}}\left(b^{${e}} - 1\right)\).`,
              p === 1 ? R`\(\ln b \to \infty\) as \(b \to \infty\).` : p > 1 ? R`As \(b \to \infty\), \(\dfrac{1}{b^{${e}}} \to 0\). The limit is \(\dfrac{1}{${e}} = ${lead}\).` : R`As \(b \to \infty\), \(b^{${e}} \to \infty\).`,
            ]
          : [
              R`The integrand is unbounded at 0. Write a limit: \(\displaystyle\int_{0}^{1} ${integrand}\,dx = \lim_{t\to 0^{+}}\int_{t}^{1} x^{-${pt}}\,dx\).`,
              p === 1 ? R`\(\displaystyle\int_{t}^{1} \frac{dx}{x} = -\ln t\).` : p < 1 ? R`Power rule: \(\displaystyle\int_{t}^{1} x^{-${pt}}\,dx = \frac{1}{${e}}\left(1 - t^{${e}}\right)\).` : R`Power rule: \(\displaystyle\int_{t}^{1} x^{-${pt}}\,dx = \frac{1}{${e}}\left(\frac{1}{t^{${e}}} - 1\right)\).`,
              p === 1 ? R`\(-\ln t \to \infty\) as \(t \to 0^{+}\).` : p < 1 ? R`As \(t \to 0^{+}\), \(t^{${e}} \to 0\). The limit is \(\dfrac{1}{${e}} = ${lead}\).` : R`As \(t \to 0^{+}\), \(\dfrac{1}{t^{${e}}} \to \infty\).`,
            ];
        steps.push(atInf ? R`Rule: on \([1, \infty)\) the p-integral converges exactly when \(p > 1\). Here \(p = ${pt}\).` : R`Rule: on \((0, 1]\) the p-integral converges exactly when \(p < 1\). Here \(p = ${pt}\).`);
        return {
          problem: atInf ? R`\(\displaystyle\int_{1}^{\infty} ${integrand}\,dx\)` : R`\(\displaystyle\int_{0}^{1} ${integrand}\,dx\)`,
          steps,
          answer: converges ? R`Converges to \(${num(value, { places: 4 })}\)` : 'Diverges',
          visual: {
            type: 'plot',
            x: atInf ? [0, 8] : [0, 2],
            y: atInf ? [0, 1.6] : [0, 6],
            fns: [{ f, domain: atInf ? [0.4, 8] : [0.02, 2] }],
            shade: [{ f, from: atInf ? 1 : 0.02, to: atInf ? 8 : 1 }],
            vlines: [{ x: 1 }],
            alt: `Graph of y = 1 over x to the power ${pt}. The shaded region ${atInf ? 'runs from x = 1 to the right without end' : 'lies between x = 0 and x = 1, where the curve shoots upward'}. Its area is ${converges ? `finite: ${num(value, { places: 4 })}` : 'infinite'}.`,
          },
        };
      },
    },
    {
      id: 'total-leak',
      title: 'Word problem: how much leaks in total?',
      word: true,
      intro: 'A leak slows down exponentially. Compare what has leaked by a given time with the total that will ever leak.',
      inputs: [
        { name: 'A', label: 'Starting rate A (liters per day)', type: 'int', min: 1, max: 100, value: 20 },
        { name: 'n', label: 'Time constant n (days)', type: 'int', min: 1, max: 20, value: 5 },
        { name: 'T', label: 'T (days)', type: 'int', min: 1, max: 60, value: 10 },
      ],
      compute({ A, n, T }) {
        const total = A * n;
        const soFar = total * (1 - Math.exp(-T / n));
        const r = (t) => A * Math.exp(-t / n);
        const nt = num(n);
        const E = (t) => (n === 1 ? `e^{-${t}}` : `e^{-${t}/${nt}}`);
        const AE = (t) => terms([[A, E(t)]]);
        return {
          problem: R`A tank leaks at a rate of \(r(t) = ${AE('t')}\) liters per day. How much leaks in the first ${T} days, and how much will ever leak?`,
          steps: [
            R`An antiderivative of the rate is \(${terms([[-total, E('t')]])}\)${n === 1 ? '' : R` (dividing by \(-\frac{1}{${nt}}\) multiplies by \(-${nt}\))`}.`,
            R`First ${T} days: \(\displaystyle\int_{0}^{${T}} ${AE('t')}\,dt = ${num(total)}\left(1 - ${E(T)}\right) \approx ${num(soFar, { places: 2 })}\) liters.`,
            R`For ever: \(\displaystyle\int_{0}^{\infty} ${AE('t')}\,dt = \lim_{b\to\infty} ${num(total)}\left(1 - ${E('b')}\right) = ${num(total)}\) liters, because \(${E('b')} \to 0\).`,
            R`After ${T} days, \(${num((100 * soFar) / total, { places: 1 })}\%\) of the total has already leaked.`,
          ],
          answer: R`About \(${num(soFar, { places: 2 })}\) liters in the first ${T} days; \(${num(total)}\) liters in total`,
          visual: {
            type: 'plot',
            x: [0, Math.max(T * 1.25, 5 * n)],
            y: [0, A * 1.1],
            fns: [{ f: r }],
            shade: [{ f: r, from: 0, to: T }],
            axisLabels: ['t (days)', 'r (L/day)'],
            alt: `Graph of the leak rate, starting at ${A} liters per day and decaying toward 0. The area under the curve up to day ${T} is shaded: about ${num(soFar, { places: 2 })} liters out of a total of ${num(total)} liters under the whole curve.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyIdentify, easyWriteAsLimit, easyPIntegral],
    medium: [mediumEvaluateInfinite, mediumEvaluateDiscontinuity, mediumWordTotal],
    hard: [hardComparison, hardEvaluate, hardWordProbability],
    challenge: [challengeInterior, challengeNormalize, challengeTwoSided],
  },
};
