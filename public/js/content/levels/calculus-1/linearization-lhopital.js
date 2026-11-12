import { R, q, frac, terms, poly, polyEval, linear, power, num, txt, round, factorial, checkEqual, checkAll, numDeriv } from '../../lib/index.js';
import { M, lim, fit, piTimes } from './_shared.js';

const INF = M('\\infty');
const DNE = 'does not exist';
// f(x) is within tol of L on both sides of p (or at p + eps only, for one-sided limits)
const near = (f, p, L, eps = 1e-4, tol = 3e-3, oneSided = false) => checkAll(...(oneSided ? [eps] : [eps, -eps]).map((e) => (Math.abs(f(p + e) - L) <= tol * Math.max(1, Math.abs(L)) ? true : `near x = ${p}: value ${f(p + e)}, expected ${L}`)));

// ───────────── Easy ─────────────

function easyLinearValue(rng) {
  const a = rng.int(-3, 8);
  const v = rng.int(-9, 12);
  const m = rng.nonzero(-6, 6);
  const h = rng.pick([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]);
  const x = round(a + h, 2);
  const est = round(v + m * h, 2);
  const f = (t) => v + m * (t - a) + 2 * (t - a) ** 2;
  return q({
    prompt: R`A differentiable function has \(f(${a}) = ${v}\) and \(f'(${a}) = ${m}\). Use the tangent-line approximation at \(x = ${a}\) to estimate \(f(${num(x)})\).`,
    correct: est,
    wrong: [
      { value: v + m, why: R`Multiply the slope by the small change in \(x\), which is \(${num(h)}\), not by 1.` },
      { value: round(v - m * h, 2), why: R`The change in \(x\) is \(${num(x)} - ${a < 0 ? `(${a})` : a} = ${num(h)}\). Keep its sign.` },
      round(m * h, 2),
      round(v + h, 2),
      round(v + m * h * 10, 2),
    ],
    solution: [R`Tangent-line approximation: \(f(x) \approx f(a) + f'(a)(x - a)\).`, R`Here \(x - a = ${num(h)}\), so \(f(${num(x)}) \approx ${v} + (${m})(${num(h)})\).`, R`\(f(${num(x)}) \approx ${num(est)}\).`],
    rule: 0,
    skill: 'tangent-line approximation',
    check: () => checkEqual(f(a) + numDeriv(f, a) * h, est, 1e-6, 'tangent-line value'),
  });
}

function easyLinearization(rng) {
  const b = rng.int(-6, 6);
  const c = rng.int(-9, 9);
  const a = rng.nonzero(-2, 2);
  const coefs = [1, 0, b, c];
  const f = (x) => polyEval(coefs, x);
  const m = 3 * a * a + b;
  const k = f(a) - m * a;
  const L = (mm, kk) => M(`L(x) = ${linear(mm, kk)}`);
  const pointSlope = terms([[f(a), ''], [m, `(${linear(1, -a)})`]]);
  return q({
    prompt: R`Find the linearization \(L(x)\) of \(f(x) = ${poly(coefs)}\) at \(x = ${a}\).`,
    correct: L(m, k),
    wrong: [
      { value: L(m, f(a)), why: R`The line must pass through \((${a}, ${f(a)})\): use \(L(x) = ${pointSlope}\) and simplify.` },
      { value: L(b, k), why: R`The slope is \(f'(${a}) = ${terms([[3, `(${a})^{2}`], [b, '']])} = ${m}\).` },
      L(m, -k === k ? k + 2 : -k),
      L(-m, k),
      L(m + 1, k - 1),
    ],
    solution: [R`\(f(${a}) = ${f(a)}\).`, R`\(f'(x) = ${poly([3, 0, b])}\), so \(f'(${a}) = ${m}\).`, R`\(L(x) = f(${a}) + f'(${a})(x - ${a < 0 ? `(${a})` : a}) = ${pointSlope}\).`, R`Simplify: \(L(x) = ${linear(m, k)}\).`],
    rule: 0,
    skill: 'linearization',
    check: () => checkAll(checkEqual(m * a + k, f(a), 1e-9, 'L(a)'), checkEqual(m, numDeriv(f, a), 1e-5, 'slope')),
  });
}

function easyFormCheck(rng) {
  const a = rng.int(2, 9);
  const b = rng.intExcept(2, 9, [a]);
  const c = rng.int(1, 6);
  const item = rng.pick([
    { to: 0, n: `e^{${a}x} - 1`, d: `${b}x`, N: (x) => Math.exp(a * x) - 1, D: (x) => b * x, cat: 'zero' },
    { to: 0, n: `\\sin ${a}x`, d: `${b}x`, N: (x) => Math.sin(a * x), D: (x) => b * x, cat: 'zero' },
    { to: c, n: poly([1, 0, -c * c]), d: linear(1, -c), N: (x) => x * x - c * c, D: (x) => x - c, cat: 'zero' },
    { to: 1, n: '\\ln x', d: linear(a, -a), N: Math.log, D: (x) => a * x - a, cat: 'zero' },
    { to: '\\infty', n: '\\ln x', d: `${a}x`, N: Math.log, D: (x) => a * x, cat: 'inf' },
    { to: '\\infty', n: poly([a, 0, b]), d: 'e^{x}', N: (x) => a * x * x + b, D: Math.exp, cat: 'inf', probe: 300 },
    { to: '\\infty', n: linear(a, c), d: linear(b, -c), N: (x) => a * x + c, D: (x) => b * x - c, cat: 'inf' },
    { to: 0, n: linear(1, a), d: linear(1, b), N: (x) => x + a, D: (x) => x + b, cat: 'number', val: frac(a, b) },
    { to: 0, n: `e^{x} + ${a}`, d: `\\cos x + ${c}`, N: (x) => Math.exp(x) + a, D: (x) => Math.cos(x) + c, cat: 'number', val: frac(a + 1, c + 1) },
    { to: c, n: poly([1, 0, a]), d: linear(1, b), N: (x) => x * x + a, D: (x) => x + b, cat: 'number', val: frac(c * c + a, c + b) },
    { to: '0^{+}', n: '\\cos x', d: `${a}x`, N: Math.cos, D: (x) => a * x, cat: 'blowup' },
    { to: `${c}^{+}`, n: linear(1, a), d: linear(1, -c), N: (x) => x + a, D: (x) => x - c, cat: 'blowup', at: c },
    { to: '0^{+}', n: `e^{x} + ${a}`, d: 'x^{2}', N: (x) => Math.exp(x) + a, D: (x) => x * x, cat: 'blowup' },
  ]);
  const choice = {
    zero: R`Yes: substituting gives the indeterminate form \(\frac{0}{0}\)`,
    inf: R`Yes: substituting gives the indeterminate form \(\frac{\infty}{\infty}\)`,
    number: 'No: substituting gives an ordinary number, so that number is the limit',
    blowup: 'No: substituting gives a nonzero number over 0, which is not an indeterminate form',
  };
  const why = {
    zero: 'Check each part separately: both the numerator and the denominator tend to 0.',
    inf: 'Check each part separately: both the numerator and the denominator grow without bound.',
    number: R`The denominator does not tend to 0 or to infinity, so nothing is indeterminate${item.val ? R`: the limit is \(${item.val.tex()}\)` : ''}.`,
    blowup: 'The numerator tends to a nonzero number while the denominator tends to 0, so the quotient is unbounded. Nothing is indeterminate.',
  }[item.cat];
  const x0 = item.cat === 'inf' ? item.probe ?? 1e8 : (item.at ?? (typeof item.to === 'number' ? item.to : 0)) + 1e-7;
  const [nv, dv] = [Math.abs(item.N(x0)), Math.abs(item.D(x0))];
  const seen = dv < 1e-4 ? (nv < 1e-4 ? 'zero' : 'blowup') : dv > 1e6 && nv > 1e1 ? 'inf' : 'number';
  return q({
    prompt: R`Can L'Hôpital's rule be applied to \(${lim(item.to)} \dfrac{${item.n}}{${item.d}}\)?`,
    correct: choice[item.cat],
    wrong: Object.keys(choice).filter((k) => k !== item.cat).map((k) => ({ value: choice[k], why })),
    solution: [R`L'Hôpital's rule needs the form \(\frac{0}{0}\) or \(\frac{\infty}{\infty}\). Look at the numerator and the denominator separately as \(x \to ${item.to}\).`, why, item.cat === 'zero' || item.cat === 'inf' ? 'So the rule can be applied.' : 'So the rule cannot be applied here. Using it anyway would give a wrong answer.'],
    rule: 5,
    skill: 'recognising indeterminate forms',
    check: () => (seen === item.cat ? true : `numerically the form looks like "${seen}"`),
  });
}

// ───────────── Medium ─────────────

function mediumEstimate(rng) {
  const kind = rng.pick(['sqrt', 'sqrt', 'recip', 'cube']);
  let f;
  let a;
  let h;
  let est;
  let prompt;
  let wrong;
  let steps;
  if (kind === 'sqrt') {
    const n = rng.pick([2, 4, 5, 8, 10]);
    a = n * n;
    h = rng.pick([-0.4, -0.2, -0.1, 0.1, 0.2, 0.4, 0.5, 1]);
    f = Math.sqrt;
    est = round(n + h / (2 * n), 6);
    prompt = R`Use the tangent-line approximation of \(f(x) = \sqrt{x}\) at \(x = ${a}\) to estimate \(\sqrt{${num(a + h)}}\).`;
    wrong = [{ value: round(n + h, 6), why: R`Multiply the change \(${num(h)}\) by the slope \(f'(${a}) = \frac{1}{2\sqrt{${a}}} = \frac{1}{${2 * n}}\).` }, { value: round(n + h / n, 6), why: R`\(f'(x) = \dfrac{1}{2\sqrt{x}}\): the factor \(\frac{1}{2}\) is missing.` }, round(n - h / (2 * n), 6), round(n + h / 2, 6)];
    steps = [R`\(f(${a}) = ${n}\) and \(f'(x) = \dfrac{1}{2\sqrt{x}}\), so \(f'(${a}) = \dfrac{1}{${2 * n}}\).`, R`\(\sqrt{${num(a + h)}} \approx ${n} + \dfrac{1}{${2 * n}}(${num(h)})\).`];
  } else if (kind === 'recip') {
    a = rng.pick([2, 4, 5, 10]);
    h = rng.pick([-0.2, -0.1, 0.1, 0.2]);
    f = (x) => 1 / x;
    est = round(1 / a - h / (a * a), 6);
    prompt = R`Use the tangent-line approximation of \(f(x) = \dfrac{1}{x}\) at \(x = ${a}\) to estimate \(\dfrac{1}{${num(a + h)}}\).`;
    wrong = [{ value: round(1 / a + h / (a * a), 6), why: R`\(f'(x) = -\dfrac{1}{x^{2}}\) is negative: a larger \(x\) gives a smaller \(\frac{1}{x}\).` }, { value: round(1 / a - h / a, 6), why: R`\(f'(${a}) = -\dfrac{1}{${a}^{2}} = -\dfrac{1}{${a * a}}\): the denominator is squared.` }, round(1 / a - h, 6), round(1 / a - h / (2 * a * a), 6)];
    steps = [R`\(f(${a}) = ${num(1 / a)}\) and \(f'(x) = -\dfrac{1}{x^{2}}\), so \(f'(${a}) = -\dfrac{1}{${a * a}}\).`, R`\(\dfrac{1}{${num(a + h)}} \approx ${num(1 / a)} - \dfrac{1}{${a * a}}(${num(h)})\).`];
  } else {
    a = rng.int(2, 5);
    h = rng.pick([-0.2, -0.1, 0.1, 0.2]);
    f = (x) => x ** 3;
    est = round(a ** 3 + 3 * a * a * h, 6);
    prompt = R`Use the tangent-line approximation of \(f(x) = x^{3}\) at \(x = ${a}\) to estimate \((${num(a + h)})^{3}\).`;
    wrong = [{ value: round(a ** 3 + a * a * h, 6), why: R`\(f'(x) = 3x^{2}\): the factor 3 is missing.` }, { value: round(a ** 3 + 3 * a * a, 6), why: R`Multiply the slope \(${3 * a * a}\) by the small change \(${num(h)}\).` }, round(a ** 3 - 3 * a * a * h, 6), round(a ** 3 + 3 * a * h, 6)];
    steps = [R`\(f(${a}) = ${a ** 3}\) and \(f'(x) = 3x^{2}\), so \(f'(${a}) = ${3 * a * a}\).`, R`\((${num(a + h)})^{3} \approx ${a ** 3} + ${3 * a * a}(${num(h)})\).`];
  }
  return q({
    prompt,
    correct: est,
    wrong,
    solution: [R`Tangent-line approximation: \(f(x) \approx f(a) + f'(a)(x - a)\), with \(a = ${a}\) and \(x - a = ${num(h)}\).`, ...steps, R`The estimate is \(${num(est)}\).`],
    rule: 1,
    skill: 'estimating with a tangent line',
    check: () => checkEqual(f(a) + numDeriv(f, a) * h, est, 1e-6, 'tangent-line value'),
  });
}

const SHAPES = [
  { tex: '\\sqrt{x}', as: [4, 9, 16, 25], up: false, f: Math.sqrt, d2: '-\\dfrac{1}{4x^{3/2}}' },
  { tex: 'x^{3}', as: [1, 2, 3], up: true, f: (x) => x ** 3, d2: '6x' },
  { tex: 'e^{x}', as: [0, 1, 2], up: true, f: Math.exp, d2: 'e^{x}' },
  { tex: '\\ln x', as: [1, 2, 5], up: false, f: Math.log, d2: '-\\dfrac{1}{x^{2}}' },
  { tex: '\\dfrac{1}{x}', as: [1, 2, 4], up: true, f: (x) => 1 / x, d2: '\\dfrac{2}{x^{3}}' },
  { tex: '\\cos x', as: [0], up: false, f: Math.cos, d2: '-\\cos x' },
  { tex: 'x^{4}', as: [1, 2], up: true, f: (x) => x ** 4, d2: '12x^{2}' },
  { tex: '\\sqrt[3]{x}', as: [1, 8, 27], up: false, f: Math.cbrt, d2: '-\\dfrac{2}{9x^{5/3}}' },
];

function mediumOverUnder(rng) {
  const s = rng.pick(SHAPES);
  const a = rng.pick(s.as);
  const h = rng.pick([-0.2, -0.1, 0.1, 0.2]);
  const where = R`near \(x = ${a}\)`;
  const choice = {
    overDown: `Too large: the graph is concave down ${where}, so it lies below its tangent line`,
    underUp: `Too small: the graph is concave up ${where}, so it lies above its tangent line`,
    overUp: `Too large: the graph is concave up ${where}, so it lies below its tangent line`,
    underDown: `Too small: the graph is concave down ${where}, so it lies above its tangent line`,
  };
  const key = s.up ? 'underUp' : 'overDown';
  const fact = R`\(f''(x) = ${s.d2}\) is ${s.up ? 'positive' : 'negative'} ${where}, so the graph is concave ${s.up ? 'up' : 'down'} there.`;
  const why = {
    overDown: fact,
    underUp: fact,
    overUp: s.up ? 'A concave-up graph bends upward, away from its tangent line, so it lies above the tangent line.' : fact,
    underDown: s.up ? fact : 'A concave-down graph bends downward, away from its tangent line, so it lies below the tangent line.',
  };
  const L = (x) => s.f(a) + numDeriv(s.f, a) * (x - a);
  return q({
    prompt: R`The tangent line to \(f(x) = ${s.tex}\) at \(x = ${a}\) is used to estimate \(f(${num(round(a + h, 2))})\). Is the estimate too large or too small, and why?`,
    correct: choice[key],
    wrong: Object.keys(choice).filter((k) => k !== key).map((k) => ({ value: choice[k], why: why[k] })),
    solution: [fact, s.up ? 'A concave-up graph lies above its tangent lines, so the tangent line gives a value that is too small: an underestimate.' : 'A concave-down graph lies below its tangent lines, so the tangent line gives a value that is too large: an overestimate.'],
    rule: 2,
    skill: 'overestimate or underestimate',
    check: () => ([0.2, 0.1, -0.1, -0.2].every((d) => L(a + d) - s.f(a + d) > 0 === !s.up) ? true : 'tangent line is on the wrong side of the graph'),
  });
}

function mediumLHopital(rng) {
  const a = rng.int(2, 7);
  const b = rng.intExcept(2, 9, [a]);
  const n = rng.int(2, 6);
  const m = rng.intExcept(2, 6, [n]);
  const s = rng.pick([
    { to: 0, tex: R`\dfrac{e^{${a}x} - 1}{${b}x}`, f: (x) => (Math.exp(a * x) - 1) / (b * x), L: frac(a, b), after: R`\dfrac{${a}e^{${a}x}}{${b}}` },
    { to: 0, tex: R`\dfrac{e^{${a}x} - 1}{\sin ${b}x}`, f: (x) => (Math.exp(a * x) - 1) / Math.sin(b * x), L: frac(a, b), after: R`\dfrac{${a}e^{${a}x}}{${b}\cos ${b}x}` },
    { to: 0, tex: R`\dfrac{\ln(1 + ${a}x)}{${b}x}`, f: (x) => Math.log(1 + a * x) / (b * x), L: frac(a, b), after: R`\dfrac{\frac{${a}}{1 + ${a}x}}{${b}}` },
    { to: 1, tex: R`\dfrac{x^{${n}} - 1}{x^{${m}} - 1}`, f: (x) => (x ** n - 1) / (x ** m - 1), L: frac(n, m), after: R`\dfrac{${n}${power('x', n - 1)}}{${m}${power('x', m - 1)}}` },
    { to: 0, tex: R`\dfrac{\sqrt{1 + ${a}x} - 1}{${b}x}`, f: (x) => (Math.sqrt(1 + a * x) - 1) / (b * x), L: frac(a, 2 * b), after: R`\dfrac{\frac{${a}}{2\sqrt{1 + ${a}x}}}{${b}}` },
    { to: 1, tex: R`\dfrac{\ln x}{x^{${m}} - 1}`, f: (x) => Math.log(x) / (x ** m - 1), L: frac(1, m), after: R`\dfrac{\frac{1}{x}}{${m}${power('x', m - 1)}}` },
  ]);
  return q({
    prompt: R`Evaluate \(${lim(s.to)} ${s.tex}\).`,
    correct: s.L,
    wrong: [
      { value: 0, why: R`\(\frac{0}{0}\) is an indeterminate form, not the number 0. Apply L'Hôpital's rule.` },
      { value: DNE, why: R`\(\frac{0}{0}\) does not mean the limit fails to exist. Differentiate the top and the bottom, then try again.` },
      s.L.inv(),
      s.L.eq(frac(1, 1)) ? 2 : 1,
      s.L.mul(2),
    ],
    solution: [
      R`Substituting \(x = ${s.to}\) gives \(\frac{0}{0}\), so L'Hôpital's rule applies.`,
      R`Differentiate the numerator and the denominator separately: \(${lim(s.to)} ${s.after}\).`,
      R`Now substitute \(x = ${s.to}\): the limit is \(${s.L.tex()}\).`,
    ],
    rule: 4,
    skill: "L'Hôpital's rule",
    check: () => near(s.f, s.to, s.L.value),
  });
}

function mediumDifferential(rng) {
  const x = rng.int(2, 15);
  const dx = rng.pick([0.05, 0.1, 0.2]);
  const s = rng.pick([
    { text: 'The edge of a cube', v: 's', what: 'volume', F: 'V = s^{3}', dF: R`dV = 3s^{2}\,ds`, sub: R`3(${x})^{2}(${num(dx)})`, ans: 3 * x * x * dx, pi: '', unit: 'cm³', wrong: [x * x * dx, 3 * x * x, 3 * x * dx], f: (t) => t ** 3 },
    { text: 'The side of a square tile', v: 's', what: 'area', F: 'A = s^{2}', dF: R`dA = 2s\,ds`, sub: R`2(${x})(${num(dx)})`, ans: 2 * x * dx, pi: '', unit: 'cm²', wrong: [x * dx, 2 * x, dx * dx], f: (t) => t * t },
    { text: 'The radius of a circular disc', v: 'r', what: 'area', F: 'A = \\pi r^{2}', dF: R`dA = 2\pi r\,dr`, sub: R`2\pi(${x})(${num(dx)})`, ans: 2 * x * dx, pi: '\\pi', unit: 'cm²', wrong: [x * dx, 2 * x, x * x * dx], f: (t) => Math.PI * t * t },
    { text: 'The radius of a sphere', v: 'r', what: 'volume', F: 'V = \\tfrac{4}{3}\\pi r^{3}', dF: R`dV = 4\pi r^{2}\,dr`, sub: R`4\pi(${x})^{2}(${num(dx)})`, ans: 4 * x * x * dx, pi: '\\pi', unit: 'cm³', wrong: [x * x * dx, 4 * x * x, 4 * x * dx], f: (t) => (4 / 3) * Math.PI * t ** 3 },
  ]);
  const fmt = (v) => R`\(${s.pi ? piTimes(round(v, 4)) : num(round(v, 4))}\) ${s.unit}`;
  return q({
    prompt: `${s.text} is measured as ${x} cm, with a possible error of ${txt(dx)} cm. Use differentials to estimate the largest possible error in the calculated ${s.what}.`,
    correct: round(s.ans, 4),
    fmt,
    wrong: [
      { value: round(s.wrong[0], 4), why: R`Differentiate the formula first: \(${s.dF}\).` },
      { value: round(s.wrong[1], 4), why: R`Multiply the derivative by the error in the measurement, \(d${s.v} = ${num(dx)}\).` },
      round(s.wrong[2], 4),
      round(s.ans * 2, 4),
    ],
    solution: [R`Formula: \(${s.F}\). Its differential is \(${s.dF}\).`, R`Substitute \(${s.v} = ${x}\) and \(d${s.v} = ${num(dx)}\): \(${s.sub}\).`, `The error in the ${s.what} is about ${fmt(s.ans)}.`],
    rule: 3,
    skill: 'differentials',
    check: () => checkEqual(numDeriv(s.f, x) * dx, s.ans * (s.pi ? Math.PI : 1), 1e-5, 'differential'),
  });
}

// ───────────── Hard ─────────────

function hardLHopitalInfinity(rng) {
  const a = rng.int(1, 4);
  const n = rng.int(1, 3);
  const p = rng.nonzero(-6, 6);
  const r = rng.int(2, 7);
  const c = rng.int(1, 9);
  const xn = n === 1 ? 'x' : `x^{${n}}`;
  const ex = a === 1 ? 'e^{x}' : `e^{${a}x}`;
  const s = rng.pick([
    {
      tex: R`\dfrac{${poly([p, c, 0])}}{${poly([r, 0, c])}}`, f: (x) => (p * x * x + c * x) / (r * x * x + c), probe: 1e9, ans: frac(p, r),
      wrong: [{ value: 0, why: 'The numerator and the denominator have the same degree, so neither wins.' }, { value: p > 0 ? INF : M('-\\infty'), why: 'Both parts grow at the same rate, so the quotient levels off.' }, frac(r, p), frac(p, 2 * r)],
      steps: [R`The form is \(\frac{\infty}{\infty}\). Apply L'Hôpital's rule: \(${lim('\\infty')} \dfrac{${linear(2 * p, c)}}{${2 * r}x}\), which is still \(\frac{\infty}{\infty}\).`, R`Apply it again: \(${lim('\\infty')} \dfrac{${2 * p}}{${2 * r}} = ${frac(p, r).tex()}\).`],
    },
    {
      tex: R`\dfrac{${xn}}{${ex}}`, f: (x) => x ** n / Math.exp(a * x), probe: 200, ans: 0,
      wrong: [{ value: INF, why: 'An exponential function outgrows every power of x, so the denominator wins.' }, { value: frac(factorial(n), a ** n), why: R`After differentiating, \(${ex}\) is still in the denominator, and it still grows without bound.` }, frac(n, a).eq(frac(factorial(n), a ** n)) ? 2 : frac(n, a), 1],
      steps: [R`The form is \(\frac{\infty}{\infty}\). Apply L'Hôpital's rule ${n === 1 ? 'once' : `${n} times`}: each application lowers the power of \(x\) by 1, while \(${ex}\) stays in the denominator.`, R`The result is \(${lim('\\infty')} \dfrac{${factorial(n)}}{${a ** n === 1 ? '' : a ** n}${ex}} = 0\).`],
    },
    {
      tex: R`\dfrac{${ex}}{${xn}}`, f: (x) => Math.exp(a * x) / x ** n, probe: 150, ans: INF, big: true,
      wrong: [{ value: 0, why: 'An exponential function outgrows every power of x. Here the exponential is in the numerator.' }, { value: frac(a ** n, factorial(n)), why: R`After differentiating, \(${ex}\) is still in the numerator, and it still grows without bound.` }, 1, frac(a, n).eq(frac(a ** n, factorial(n))) ? 2 : frac(a, n)],
      steps: [R`The form is \(\frac{\infty}{\infty}\). Apply L'Hôpital's rule ${n === 1 ? 'once' : `${n} times`}: each application lowers the power of \(x\) by 1, while \(${ex}\) stays in the numerator.`, R`The result is \(${lim('\\infty')} \dfrac{${a ** n === 1 ? '' : a ** n}${ex}}{${factorial(n)}} = \infty\).`],
    },
    {
      tex: R`\dfrac{\ln x}{${xn}}`, f: (x) => Math.log(x) / x ** n, probe: 1e40, ans: 0,
      wrong: [{ value: INF, why: R`\(\ln x\) grows more slowly than any positive power of \(x\).` }, { value: frac(1, n), why: R`After one application the quotient is \(\dfrac{1}{${n === 1 ? 'x' : `${n}x^{${n}}`}}\), which still depends on \(x\).` }, n === 1 ? 2 : 1, DNE],
      steps: [R`The form is \(\frac{\infty}{\infty}\). Apply L'Hôpital's rule: \(${lim('\\infty')} \dfrac{\frac{1}{x}}{${n === 1 ? '1' : `${n}${power('x', n - 1)}`}} = ${lim('\\infty')} \dfrac{1}{${n === 1 ? 'x' : `${n}x^{${n}}`}}\).`, R`The denominator grows without bound, so the limit is \(0\).`],
    },
    {
      tex: R`\dfrac{${terms([[p, 'x'], [c, '\\ln x']])}}{${r}x}`, f: (x) => (p * x + c * Math.log(x)) / (r * x), probe: 1e40, ans: frac(p, r),
      wrong: [{ value: frac(p + c, r), why: R`The derivative of \(\ln x\) is \(\frac{1}{x}\), which tends to 0.` }, { value: 0, why: R`The terms \(${terms([[p, 'x']])}\) and \(${r}x\) grow at the same rate, so the quotient does not shrink to 0.` }, frac(c, r), p > 0 ? INF : M('-\\infty')],
      steps: [R`The form is \(\frac{\infty}{\infty}\). Apply L'Hôpital's rule: \(${lim('\\infty')} \dfrac{${p} + \frac{${c}}{x}}{${r}}\).`, R`As \(x \to \infty\), \(\dfrac{${c}}{x} \to 0\), so the limit is \(${frac(p, r).tex()}\).`],
    },
  ]);
  return q({
    prompt: R`Evaluate \(${lim('\\infty')} ${s.tex}\).`,
    correct: s.ans,
    wrong: s.wrong,
    solution: s.steps,
    rule: 4,
    skill: "L'Hôpital's rule at infinity",
    check: () => (s.big ? (s.f(s.probe) > 1e20 ? true : 'not unbounded') : checkEqual(s.f(s.probe), typeof s.ans === 'number' ? s.ans : s.ans.value, 1e-6, 'value far out')),
  });
}

function hardLHopitalRepeated(rng) {
  const a = rng.int(2, 5);
  const b = rng.int(1, 6);
  const bx2 = b === 1 ? 'x^{2}' : `${b}x^{2}`;
  const bx3 = b === 1 ? 'x^{3}' : `${b}x^{3}`;
  const s = rng.pick([
    {
      tex: R`\dfrac{1 - \cos ${a}x}{${bx2}}`, f: (x) => (1 - Math.cos(a * x)) / (b * x * x), L: frac(a * a, 2 * b),
      steps: [R`First application: \(${lim(0)} \dfrac{${a}\sin ${a}x}{${2 * b}x}\), which is still \(\frac{0}{0}\).`, R`Second application: \(${lim(0)} \dfrac{${a * a}\cos ${a}x}{${2 * b}} = ${frac(a * a, 2 * b).tex()}\).`],
      wrong: [frac(a * a, b), frac(a, 2 * b)],
    },
    {
      tex: R`\dfrac{e^{${a}x} - 1 - ${a}x}{${bx2}}`, f: (x) => (Math.exp(a * x) - 1 - a * x) / (b * x * x), L: frac(a * a, 2 * b),
      steps: [R`First application: \(${lim(0)} \dfrac{${a}e^{${a}x} - ${a}}{${2 * b}x}\), which is still \(\frac{0}{0}\).`, R`Second application: \(${lim(0)} \dfrac{${a * a}e^{${a}x}}{${2 * b}} = ${frac(a * a, 2 * b).tex()}\).`],
      wrong: [frac(a * a, b), frac(a, 2 * b)],
    },
    {
      tex: R`\dfrac{${a}x - \sin ${a}x}{${bx3}}`, f: (x) => (a * x - Math.sin(a * x)) / (b * x ** 3), L: frac(a ** 3, 6 * b),
      steps: [R`First application: \(${lim(0)} \dfrac{${a} - ${a}\cos ${a}x}{${3 * b}x^{2}}\), still \(\frac{0}{0}\). Second: \(${lim(0)} \dfrac{${a * a}\sin ${a}x}{${6 * b}x}\), still \(\frac{0}{0}\).`, R`Third application: \(${lim(0)} \dfrac{${a ** 3}\cos ${a}x}{${6 * b}} = ${frac(a ** 3, 6 * b).tex()}\).`],
      wrong: [frac(a ** 3, 3 * b), frac(a * a, 6 * b)],
    },
  ]);
  return q({
    prompt: R`Evaluate \(${lim(0)} ${s.tex}\).`,
    correct: s.L,
    wrong: [
      { value: 0, why: R`After one application the form is still \(\frac{0}{0}\). That is not 0: apply the rule again.` },
      { value: s.wrong[0], why: 'Differentiate the denominator at every step too. Its constant factor grows each time.' },
      s.wrong[1],
      { value: INF, why: 'The numerator tends to 0 as well, so the quotient stays bounded.' },
    ],
    solution: [R`Substituting gives \(\frac{0}{0}\). Apply L'Hôpital's rule, and keep applying it while the form is still \(\frac{0}{0}\).`, ...s.steps],
    rule: 4,
    skill: "repeated L'Hôpital's rule",
    check: () => near(s.f, 0, s.L.value, 1e-3, 5e-3),
  });
}

function hardNotApply(rng) {
  const kind = rng.pick(['poly', 'exp', 'blowup']);
  const base = { rule: 5, skill: 'when the rule does not apply' };
  const noRule = "The limit is not an indeterminate form, so L'Hôpital's rule does not apply. Using it gives this wrong value.";
  if (kind === 'blowup') {
    const a = rng.int(0, 6);
    const b = rng.int(1, 5);
    const top = a === 0 ? '\\cos x' : `\\cos x + ${a}`;
    return q({
      ...base,
      prompt: R`Evaluate \(${lim('0^{+}')} \dfrac{${top}}{${b === 1 ? '' : b}x}\).`,
      correct: INF,
      wrong: [{ value: 0, why: noRule }, { value: frac(a + 1, b), why: R`The denominator tends to 0, so the quotient is not close to \(${frac(a + 1, b).tex()}\).` }, M('-\\infty'), 1],
      solution: [R`Check the form first: the numerator tends to \(${a + 1}\) and the denominator tends to \(0\) through positive values.`, R`This is not \(\frac{0}{0}\) or \(\frac{\infty}{\infty}\), so L'Hôpital's rule does not apply.`, R`A number near \(${a + 1}\) divided by a tiny positive number is huge: the limit is \(\infty\).`],
      check: () => ((Math.cos(1e-9) + a) / (b * 1e-9) > 1e6 ? true : 'not unbounded'),
    });
  }
  if (kind === 'exp') {
    const a = rng.int(2, 6);
    const b = rng.int(1, 8);
    const c = rng.nonzero(-5, 5);
    const L = frac(1 + b, c);
    const f = (x) => (Math.exp(a * x) + b) / (x + c);
    return q({
      ...base,
      prompt: R`Evaluate \(${lim(0)} \dfrac{e^{${a}x} + ${b}}{${linear(1, c)}}\).`,
      correct: L,
      wrong: [{ value: a, why: noRule }, { value: frac(b, c), why: R`\(e^{0} = 1\), not 0.` }, L.neg(), frac(1, c).eq(L) ? 0 : frac(1, c)],
      solution: [R`Check the form first: the numerator tends to \(e^{0} + ${b} = ${1 + b}\) and the denominator tends to \(${c}\).`, R`Nothing is indeterminate, so substitute: the limit is \(${L.tex()}\).`, R`(L'Hôpital's rule would give \(\dfrac{${a}e^{0}}{1} = ${a}\), which is wrong, because the rule does not apply.)`],
      check: () => near(f, 0, L.value),
    });
  }
  let p;
  let qq;
  let r;
  let s0;
  let c;
  do {
    p = rng.nonzero(-3, 3);
    qq = rng.int(-6, 6);
    r = rng.nonzero(-4, 4);
    s0 = rng.int(-6, 6);
    c = rng.nonzero(-3, 3);
  } while (r * c + s0 === 0 || (p * c * c + qq) * r === 2 * p * c * (r * c + s0) || p * c * c + qq === 0);
  const L = frac(p * c * c + qq, r * c + s0);
  const f = (x) => (p * x * x + qq) / (r * x + s0);
  return q({
    ...base,
    prompt: R`Evaluate \(${lim(c)} \dfrac{${poly([p, 0, qq])}}{${linear(r, s0)}}\).`,
    correct: L,
    wrong: [{ value: frac(2 * p * c, r), why: noRule }, { value: 0, why: R`Substitute \(x = ${c}\) into the numerator and the denominator: neither is 0.` }, L.neg(), L.inv()],
    solution: [R`Check the form first: at \(x = ${c}\) the numerator is \(${p * c * c + qq}\) and the denominator is \(${r * c + s0}\).`, R`Nothing is indeterminate, so substitute: the limit is \(${L.tex()}\).`, R`(L'Hôpital's rule would give \(\dfrac{${2 * p}(${c})}{${r}} = ${frac(2 * p * c, r).tex()}\), which is wrong, because the rule does not apply.)`],
    check: () => near(f, c, L.value),
  });
}

function hardErrorPercent(rng) {
  const p = rng.pick([0.5, 1, 1.5, 2, 3, 4]);
  const s = rng.pick([
    { text: 'The edge of a cube', what: 'volume of the cube', F: 'V = s^{3}', n: 3, v: 's', f: (x) => x ** 3 },
    { text: 'The radius of a sphere', what: 'volume of the sphere', F: 'V = \\tfrac{4}{3}\\pi r^{3}', n: 3, v: 'r', f: (x) => (4 / 3) * Math.PI * x ** 3 },
    { text: 'The radius of a circle', what: 'area of the circle', F: 'A = \\pi r^{2}', n: 2, v: 'r', f: (x) => Math.PI * x * x },
    { text: 'The side of a square', what: 'area of the square', F: 'A = s^{2}', n: 2, v: 's', f: (x) => x * x },
    { text: 'The radius of a sphere', what: 'surface area of the sphere', F: 'S = 4\\pi r^{2}', n: 2, v: 'r', f: (x) => 4 * Math.PI * x * x },
    { text: 'The edge of a cube', what: 'surface area of the cube', F: 'S = 6s^{2}', n: 2, v: 's', f: (x) => 6 * x * x },
  ]);
  const Fname = s.F[0];
  return q({
    prompt: `${s.text} is measured with a possible error of ${txt(p)}%. Use differentials to estimate the possible percentage error in the calculated ${s.what}.`,
    correct: s.n * p,
    fmt: (v) => R`\(${num(v)}\%\)`,
    wrong: [
      { value: p, why: `The power in the formula multiplies the relative error, so the error grows.` },
      { value: round(p ** s.n, 4), why: `The percentage error is multiplied by the power ${s.n}, not raised to it.` },
      (s.n + 1) * p,
      s.n === 3 ? 2 * p : 3 * p,
      2 * s.n * p,
    ],
    solution: [
      R`Formula: \(${s.F}\). Take the differential and divide by \(${Fname}\) to get the relative error.`,
      R`\(\dfrac{d${Fname}}{${Fname}} = ${s.n}\,\dfrac{d${s.v}}{${s.v}}\): the relative error in \(${Fname}\) is ${s.n} times the relative error in \(${s.v}\).`,
      R`\(${s.n} \times ${num(p)}\% = ${num(s.n * p)}\%\).`,
    ],
    rule: 3,
    skill: 'differentials',
    check: () => checkEqual((numDeriv(s.f, 7) * (7 * p)) / 100 / s.f(7) * 100, s.n * p, 1e-5, 'relative error'),
  });
}

// ───────────── Challenge ─────────────

function challengeRewrite(rng) {
  const a = rng.int(2, 9);
  const n = rng.int(1, 3);
  const xn = n === 1 ? 'x' : `x^{${n}}`;
  const s = rng.pick([
    { to: '\\infty', tex: R`x\sin\left(\dfrac{${a}}{x}\right)`, f: (x) => x * Math.sin(a / x), ans: a, probe: 1e6, re: R`\dfrac{\sin\left(\frac{${a}}{x}\right)}{\frac{1}{x}}`, after: R`\dfrac{\cos\left(\frac{${a}}{x}\right) \cdot \left(-\frac{${a}}{x^{2}}\right)}{-\frac{1}{x^{2}}} = ${a}\cos\left(\dfrac{${a}}{x}\right)`, end: R`\(\cos\left(\frac{${a}}{x}\right) \to \cos 0 = 1\), so the limit is \(${a}\).` },
    { to: '\\infty', tex: R`x\left(e^{${a}/x} - 1\right)`, f: (x) => x * (Math.exp(a / x) - 1), ans: a, probe: 1e6, re: R`\dfrac{e^{${a}/x} - 1}{\frac{1}{x}}`, after: R`\dfrac{e^{${a}/x} \cdot \left(-\frac{${a}}{x^{2}}\right)}{-\frac{1}{x^{2}}} = ${a}e^{${a}/x}`, end: R`\(e^{${a}/x} \to e^{0} = 1\), so the limit is \(${a}\).` },
    { to: '\\infty', tex: R`x\ln\left(1 + \dfrac{${a}}{x}\right)`, f: (x) => x * Math.log(1 + a / x), ans: a, probe: 1e6, re: R`\dfrac{\ln\left(1 + \frac{${a}}{x}\right)}{\frac{1}{x}}`, after: R`\dfrac{\frac{1}{1 + ${a}/x} \cdot \left(-\frac{${a}}{x^{2}}\right)}{-\frac{1}{x^{2}}} = \dfrac{${a}}{1 + \frac{${a}}{x}}`, end: R`\(\frac{${a}}{x} \to 0\), so the limit is \(${a}\).` },
    { to: '0^{+}', tex: R`${xn}\ln x`, f: (x) => x ** n * Math.log(x), ans: 0, probe: 1e-30, re: R`\dfrac{\ln x}{x^{-${n}}}`, after: n === 1 ? R`\dfrac{\frac{1}{x}}{-x^{-2}} = -x` : R`\dfrac{\frac{1}{x}}{-${n}x^{-${n + 1}}} = -\dfrac{${xn}}{${n}}`, end: R`\(${xn} \to 0\), so the limit is \(0\).`, zero: true },
  ]);
  return q({
    prompt: R`Evaluate \(${lim(s.to)} ${s.tex}\).`,
    correct: s.ans,
    wrong: s.zero
      ? [{ value: M('-\\infty'), why: R`\(\ln x \to -\infty\), but \(${xn} \to 0\) at the same time. The product is an indeterminate form, so rewrite it as a quotient.` }, { value: 1, why: 'Rewrite the product as a quotient and apply the rule before deciding.' }, INF, -1]
      : [{ value: 0, why: R`\(\infty \cdot 0\) is an indeterminate form, not 0. Rewrite the product as a quotient.` }, { value: INF, why: 'The second factor tends to 0, which holds the product back. Rewrite it as a quotient to see what wins.' }, 1, frac(1, a)],
    solution: [
      R`The product has the indeterminate form \(${s.zero ? '0 \\cdot (-\\infty)' : '\\infty \\cdot 0'}\). Rewrite it as a quotient: \(${s.re}\), which has the form \(${s.zero ? '\\frac{\\infty}{\\infty}' : '\\frac{0}{0}'}\).`,
      R`Apply L'Hôpital's rule: \(${s.after}\).`,
      s.end,
    ],
    rule: 4,
    skill: 'rewriting for L\'Hôpital\'s rule',
    check: () => (Math.abs(s.f(s.probe) - s.ans) < 1e-4 ? true : `value at the probe is ${s.f(s.probe)}`),
  });
}

function challengeFindConstant(rng) {
  const k = rng.int(2, 9);
  const a = rng.intExcept(2, 7, [k]);
  const s = rng.pick([
    { tex: R`\dfrac{e^{kx} - 1}{${a}x}`, L: frac(k, a), f: (x) => (Math.exp(k * x) - 1) / (a * x), eq: R`\dfrac{k}{${a}}`, wrong: [frac(k, a * a), frac(k, a), frac(a, k)], why: R`After one application the limit is \(\frac{k}{${a}}\). Set that equal to the given value and solve.` },
    { tex: R`\dfrac{1 - \cos kx}{x^{2}}`, L: frac(k * k, 2), f: (x) => (1 - Math.cos(k * x)) / (x * x), eq: R`\dfrac{k^{2}}{2}`, wrong: [k * k, frac(k * k, 2), frac(k * k, 4)], why: R`Two applications give \(\frac{k^{2}}{2}\). Set that equal to the given value, then take the square root.`, positive: true },
    { tex: R`\dfrac{\sqrt{1 + kx} - 1}{${a}x}`, L: frac(k, 2 * a), f: (x) => (Math.sqrt(1 + k * x) - 1) / (a * x), eq: R`\dfrac{k}{${2 * a}}`, wrong: [frac(k, 2), frac(k, 2 * a), 2 * k], why: R`After one application the limit is \(\frac{k}{${2 * a}}\). Set that equal to the given value and solve.` },
    { tex: R`\dfrac{\sin kx}{\sin ${a}x}`, L: frac(k, a), f: (x) => Math.sin(k * x) / Math.sin(a * x), eq: R`\dfrac{k}{${a}}`, wrong: [frac(k, a * a), frac(k, a), frac(a, k)], why: R`After one application the limit is \(\frac{k}{${a}}\). Set that equal to the given value and solve.` },
  ]);
  return q({
    prompt: R`For which ${s.positive ? 'positive ' : ''}value of the constant \(k\) is \(${lim(0)} ${s.tex} = ${s.L.tex()}\)?`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [{ value: s.wrong[0], why: s.why }, s.wrong[1], s.wrong[2], k + 1],
    solution: [R`The limit has the form \(\frac{0}{0}\). Apply L'Hôpital's rule with \(k\) left as a letter: the limit equals \(${s.eq}\).`, R`Set \(${s.eq} = ${s.L.tex()}\) and solve: \(k = ${k}\).`],
    rule: 4,
    skill: 'working backwards',
    check: () => near(s.f, 0, s.L.value, 1e-3, 5e-3),
  });
}

function challengeBackwards(rng) {
  const a = rng.int(-3, 8);
  const v = rng.int(-9, 12);
  const m = rng.nonzero(-6, 6);
  const h = rng.pick([-0.2, -0.1, 0.1, 0.2]);
  const x = round(a + h, 2);
  const L = round(v + m * h, 2);
  if (rng.bool(0.4)) {
    return q({
      prompt: R`A differentiable function has \(f(${a}) = ${v}\). The tangent-line approximation at \(x = ${a}\) gives \(f(${num(x)}) \approx ${num(L)}\). What is \(f'(${a})\)?`,
      correct: m,
      wrong: [{ value: round(L - v, 2), why: R`That is the change in the estimate. Divide it by the change in \(x\), which is \(${num(h)}\), to get the slope.` }, -m, { value: L, why: R`That is the estimated value of \(f\), not the slope.` }, round(m / 10, 2), m + 1],
      solution: [R`\(f(${num(x)}) \approx f(${a}) + f'(${a})(${num(h)})\), so \(${num(L)} = ${v} + f'(${a})(${num(h)})\).`, R`\(f'(${a}) = \dfrac{${num(L)} - ${v < 0 ? `(${v})` : v}}{${num(h)}} = ${m}\).`],
      rule: 0,
      skill: 'working backwards',
      check: () => checkEqual(v + m * h, L, 1e-9, 'estimate'),
    });
  }
  const up = rng.bool(0.5);
  const d = rng.pick([0.01, 0.02, 0.03]);
  const actual = round(L + (up ? d : -d), 2);
  const c = (up ? d : -d) / (h * h);
  const f = (t) => v + m * (t - a) + c * (t - a) ** 2;
  const others = [L, round(L + (up ? -d : d), 2), round(L + (up ? -3 * d : 3 * d), 2)];
  return q({
    prompt: R`A function \(f\) has \(f(${a}) = ${v}\) and \(f'(${a}) = ${m}\), and \(f''(x) ${up ? '>' : '<'} 0\) for all \(x\). Which of these could be the value of \(f(${num(x)})\)?`,
    correct: actual,
    wrong: [
      { value: L, why: R`That is exactly the tangent-line value. Because \(f''\) is never 0, the graph bends away from the tangent line, so the true value cannot equal it.` },
      { value: others[1], why: `The graph is concave ${up ? 'up, so it lies above' : 'down, so it lies below'} its tangent line.` },
      others[2],
    ],
    solution: [
      R`Tangent-line value: \(${v} + (${m})(${num(h)}) = ${num(L)}\).`,
      up ? R`\(f'' > 0\) means the graph is concave up, so it lies above its tangent line: \(f(${num(x)}) > ${num(L)}\).` : R`\(f'' < 0\) means the graph is concave down, so it lies below its tangent line: \(f(${num(x)}) < ${num(L)}\).`,
      R`Only \(${num(actual)}\) is on the correct side of \(${num(L)}\).`,
    ],
    rule: 2,
    skill: 'overestimate or underestimate',
    check: () => checkAll(checkEqual(f(x), actual, 1e-9, 'a function with these properties'), others.every((o) => (up ? o <= L : o >= L)) ? true : 'a wrong choice is on the allowed side'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'linearization-lhopital',
  title: "Linear Approximation & L'Hôpital's Rule",
  summary: "Estimate values with tangent lines and differentials, and evaluate indeterminate limits with L'Hôpital's rule.",
  standards: ['AP Calculus 4.6', 'AP Calculus 4.7'],

  explain: {
    intro: R`Near a point, a differentiable function looks almost like its tangent line. That simple fact has two uses here. It lets us estimate values such as \(\sqrt{4.1}\) by hand, and it is the reason L'Hôpital's rule works: when two functions both tend to 0, their ratio behaves like the ratio of their slopes.`,
    rules: [
      {
        title: 'Linearization',
        text: R`The linearization of \(f\) at \(a\) is the tangent line written as a function: \(L(x) = f(a) + f'(a)(x - a)\). For \(x\) near \(a\), \(f(x) \approx L(x)\).`,
        example: R`\(f(x) = \sqrt{x}\) at \(a = 4\): \(f(4) = 2\), \(f'(4) = \frac{1}{4}\), so \(L(x) = 2 + \frac{1}{4}(x - 4)\).`,
      },
      {
        title: 'Estimating a value',
        text: R`Choose a nearby \(a\) where \(f(a)\) and \(f'(a)\) are easy to find. Then \(f(a + h) \approx f(a) + f'(a)\,h\), where \(h\) is the small change in \(x\) (it may be negative).`,
        example: R`\(\sqrt{4.1} \approx 2 + \frac{1}{4}(0.1) = 2.025\). (The true value is \(2.0248\ldots\))`,
      },
      {
        title: 'Overestimate or underestimate?',
        text: R`If \(f'' > 0\) near \(a\), the graph is concave up and lies **above** its tangent line, so the estimate is too small (an underestimate). If \(f'' < 0\), the graph is concave down and lies **below** its tangent line, so the estimate is too large (an overestimate).`,
        example: R`\(\sqrt{x}\) is concave down, so \(2.025\) is slightly more than \(\sqrt{4.1}\).`,
      },
      {
        title: 'Differentials',
        text: R`If \(y = f(x)\), the differential \(dy = f'(x)\,dx\) estimates the change in \(y\) caused by a small change \(dx\) in \(x\). It is used to estimate how an error in a measurement affects a calculated quantity. Dividing by \(y\) gives the relative (percentage) error.`,
        example: R`A cube's edge is \(10 \pm 0.1\) cm. \(V = s^{3}\), so \(dV = 3s^{2}\,ds = 3(100)(0.1) = 30\) cm³.`,
      },
      {
        title: "L'Hôpital's rule",
        text: R`If \(\lim \dfrac{f(x)}{g(x)}\) has the form \(\dfrac{0}{0}\) or \(\dfrac{\infty}{\infty}\), then \(\lim \dfrac{f(x)}{g(x)} = \lim \dfrac{f'(x)}{g'(x)}\), provided the second limit exists or is \(\pm\infty\). Differentiate the numerator and the denominator **separately** (this is not the quotient rule). If the new limit is still indeterminate, apply the rule again.`,
        example: R`\(\lim\limits_{x \to 0} \dfrac{e^{2x} - 1}{\sin 3x} = \lim\limits_{x \to 0} \dfrac{2e^{2x}}{3\cos 3x} = \dfrac{2}{3}\).`,
      },
      {
        title: 'Check the form first',
        text: R`The rule applies only to \(\dfrac{0}{0}\) and \(\dfrac{\infty}{\infty}\). If substituting gives an ordinary number, that number is the limit. If it gives a nonzero number over 0, the quotient is unbounded. Applying the rule in those cases gives wrong answers. A product of the form \(0 \cdot \infty\) can be rewritten as a quotient first.`,
        example: R`\(\lim\limits_{x \to 0} \dfrac{x + 2}{x + 1} = 2\) by substitution. L'Hôpital's rule would wrongly give \(\dfrac{1}{1} = 1\).`,
      },
    ],
    vocab: [
      { term: 'linearization', def: R`The function \(L(x) = f(a) + f'(a)(x - a)\) whose graph is the tangent line to \(f\) at \(a\).` },
      { term: 'differential', def: R`\(dy = f'(x)\,dx\): the change along the tangent line when \(x\) changes by \(dx\).` },
      { term: 'indeterminate form', def: R`A form such as \(\frac{0}{0}\) or \(\frac{\infty}{\infty}\) that does not by itself decide the value of a limit.` },
      { term: 'concave up / concave down', def: R`Concave up: \(f'' > 0\), the graph bends upward. Concave down: \(f'' < 0\), the graph bends downward.` },
    ],
    mistakes: [
      R`Using the quotient rule inside L'Hôpital's rule. Differentiate the top and the bottom separately.`,
      R`Applying L'Hôpital's rule without checking that the form is \(\frac{0}{0}\) or \(\frac{\infty}{\infty}\).`,
      R`Stopping while the limit is still \(\frac{0}{0}\) and calling it 0.`,
      R`Forgetting to multiply by the small change: \(f(a + h) \approx f(a) + f'(a)\,h\), not \(f(a) + f'(a)\).`,
      R`Mixing up the two cases: concave up means the tangent line is below the graph, so the estimate is too small.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 9],
      y: [0, 4],
      step: [1, 1],
      fns: [{ f: Math.sqrt }, { f: (x) => 2 + 0.25 * (x - 4), color: 'b', dashed: true, label: 'L', labelAt: 0.9 }],
      points: [{ x: 4, y: 2 }],
      alt: 'Graph of y = √x with its tangent line at the point (4, 2). Near x = 4 the line and the curve are almost indistinguishable; farther away the line lies above the curve, because the curve is concave down.',
    },
  },

  examples: [
    {
      title: 'Estimating with a tangent line',
      problem: R`Use a linearization to estimate \(\sqrt{4.1}\). Is the estimate too large or too small?`,
      steps: [
        R`Take \(f(x) = \sqrt{x}\) and \(a = 4\): \(f(4) = 2\), and \(f'(x) = \dfrac{1}{2\sqrt{x}}\) gives \(f'(4) = \dfrac{1}{4}\).`,
        R`\(L(x) = 2 + \dfrac{1}{4}(x - 4)\), so \(\sqrt{4.1} \approx 2 + \dfrac{1}{4}(0.1) = 2.025\).`,
        R`\(f''(x) = -\dfrac{1}{4x^{3/2}} < 0\): the graph is concave down and lies below its tangent line.`,
      ],
      answer: R`\(\sqrt{4.1} \approx 2.025\), a slight overestimate (the true value is about \(2.02485\)).`,
    },
    {
      title: 'Word problem: an error in a measurement',
      word: true,
      problem: 'The radius of a ball bearing is measured as 2 cm, with a possible error of 0.05 cm. Estimate the possible error in the calculated volume, and the percentage error.',
      steps: [
        R`Volume: \(V = \frac{4}{3}\pi r^{3}\). Differential: \(dV = 4\pi r^{2}\,dr\).`,
        R`With \(r = 2\) and \(dr = 0.05\): \(dV = 4\pi(4)(0.05) = 0.8\pi \approx 2.5\) cm³.`,
        R`Relative error: \(\dfrac{dV}{V} = 3\,\dfrac{dr}{r} = 3 \cdot \dfrac{0.05}{2} = 0.075\).`,
      ],
      answer: R`About \(0.8\pi \approx 2.5\) cm³, which is 7.5% of the volume. (The radius itself is only off by 2.5%.)`,
    },
    {
      title: "L'Hôpital's rule, applied twice",
      problem: R`Evaluate \(\lim\limits_{x \to 0} \dfrac{1 - \cos x}{x^{2}}\).`,
      steps: [
        R`Substituting gives \(\frac{0}{0}\), so the rule applies.`,
        R`Differentiate top and bottom: \(\lim\limits_{x \to 0} \dfrac{\sin x}{2x}\). This is still \(\frac{0}{0}\).`,
        R`Apply the rule again: \(\lim\limits_{x \to 0} \dfrac{\cos x}{2}\).`,
        R`Now substitute: \(\dfrac{\cos 0}{2}\).`,
      ],
      answer: R`\(\dfrac{1}{2}\)`,
    },
    {
      title: 'A limit at infinity, and a case where the rule fails',
      problem: R`Evaluate \(\lim\limits_{x \to \infty} \dfrac{x^{2}}{e^{x}}\) and \(\lim\limits_{x \to 0} \dfrac{\cos x}{x + 2}\).`,
      steps: [
        R`First limit: the form is \(\frac{\infty}{\infty}\). Apply the rule: \(\lim\limits_{x \to \infty} \dfrac{2x}{e^{x}}\), still \(\frac{\infty}{\infty}\). Apply it again: \(\lim\limits_{x \to \infty} \dfrac{2}{e^{x}} = 0\).`,
        R`Second limit: substituting gives \(\dfrac{1}{2}\). This is not an indeterminate form, so the rule must not be used.`,
      ],
      answer: R`\(0\) and \(\dfrac{1}{2}\). (Using the rule on the second limit would give \(\frac{-\sin 0}{1} = 0\), which is wrong.)`,
    },
  ],

  models: [
    {
      id: 'tangent-estimate',
      title: 'Estimate with a tangent line',
      intro: 'Choose a function, a base point a and a small step h. Compare the tangent-line estimate with the true value.',
      inputs: [
        { name: 'fn', label: 'Function', type: 'select', value: 'sqrt', options: [{ value: 'sqrt', label: '√x' }, { value: 'cube', label: 'x³' }, { value: 'recip', label: '1/x' }, { value: 'ln', label: 'ln x' }] },
        { name: 'a', label: 'Base point a', type: 'int', min: 1, max: 25, value: 4 },
        { name: 'h', label: 'Step h', type: 'number', min: -0.9, max: 2, step: 0.1, value: 0.1 },
      ],
      compute({ fn, a, h }) {
        if (Math.abs(h) < 1e-9) return { error: 'With h = 0 there is nothing to estimate. Choose a nonzero step.' };
        const F = {
          sqrt: { tex: '\\sqrt{x}', f: Math.sqrt, d: 1 / (2 * Math.sqrt(a)), dTex: `\\dfrac{1}{2\\sqrt{${a}}}`, up: false, label: 'y = √x' },
          cube: { tex: 'x^{3}', f: (x) => x ** 3, d: 3 * a * a, dTex: `3(${a})^{2}`, up: true, label: 'y = x³' },
          recip: { tex: '\\dfrac{1}{x}', f: (x) => 1 / x, d: -1 / (a * a), dTex: `-\\dfrac{1}{${a}^{2}}`, up: true, label: 'y = 1/x' },
          ln: { tex: '\\ln x', f: Math.log, d: 1 / a, dTex: `\\dfrac{1}{${a}}`, up: false, label: 'y = ln x' },
        }[fn];
        const x = round(a + h, 4);
        const fa = F.f(a);
        const est = fa + F.d * h;
        const actual = F.f(x);
        const lo = Math.max(0.2, a - 3);
        return {
          problem: R`Estimate \(f(${num(x)})\) for \(f(x) = ${F.tex}\), using the tangent line at \(x = ${a}\).`,
          steps: [
            R`\(f(${a}) = ${num(round(fa, 5))}\) and \(f'(${a}) = ${F.dTex} = ${num(round(F.d, 5))}\).`,
            R`\(L(x) = f(${a}) + f'(${a})(x - ${a})\), and here \(x - ${a} = ${num(h)}\).`,
            R`Estimate: \(${num(round(fa, 5))} + (${num(round(F.d, 5))})(${num(h)}) = ${num(round(est, 5))}\).`,
            R`True value: \(f(${num(x)}) = ${num(round(actual, 5))}\). The estimate is off by about \(${num(round(Math.abs(est - actual), 5))}\).`,
            F.up ? 'The graph is concave up, so it lies above the tangent line: the estimate is too small.' : 'The graph is concave down, so it lies below the tangent line: the estimate is too large.',
          ],
          answer: R`\(f(${num(x)}) \approx ${num(round(est, 5))}\) (${F.up ? 'an underestimate' : 'an overestimate'})`,
          visual: {
            type: 'plot',
            ...fit([F.f, (t) => fa + F.d * (t - a)], lo, a + 3, { pad: 0.1, minPad: 0.2 }),
            fns: [{ f: F.f }, { f: (t) => fa + F.d * (t - a), color: 'b', dashed: true }],
            points: [{ x: a, y: fa }, { x, y: est, color: 'b' }],
            alt: `Graph of ${F.label} with its tangent line at x = ${a}. The estimate is read from the tangent line at x = ${txt(x)}; the curve is ${F.up ? 'above' : 'below'} the line there.`,
          },
        };
      },
    },
    {
      id: 'measurement-error',
      title: 'Word problem: how much does a measuring error matter?',
      word: true,
      intro: 'A length is measured with a small error. See how the error carries over to a calculated area or volume.',
      inputs: [
        { name: 'shape', label: 'Quantity', type: 'select', value: 'cube', options: [{ value: 'cube', label: 'volume of a cube' }, { value: 'sphere', label: 'volume of a sphere' }, { value: 'square', label: 'area of a square' }, { value: 'circle', label: 'area of a circle' }] },
        { name: 'x', label: 'Measured length (cm)', type: 'number', min: 1, max: 50, step: 0.5, value: 10 },
        { name: 'dx', label: 'Possible error (cm)', type: 'number', min: 0.01, max: 1, step: 0.01, value: 0.1 },
      ],
      compute({ shape, x, dx }) {
        const S = {
          cube: { name: 'edge of a cube', q: 'volume', F: 'V = s^{3}', dF: 'dV = 3s^{2}\\,ds', v: 's', f: (t) => t ** 3, d: 3 * x * x, n: 3, unit: 'cm³' },
          sphere: { name: 'radius of a sphere', q: 'volume', F: 'V = \\tfrac{4}{3}\\pi r^{3}', dF: 'dV = 4\\pi r^{2}\\,dr', v: 'r', f: (t) => (4 / 3) * Math.PI * t ** 3, d: 4 * Math.PI * x * x, n: 3, unit: 'cm³' },
          square: { name: 'side of a square', q: 'area', F: 'A = s^{2}', dF: 'dA = 2s\\,ds', v: 's', f: (t) => t * t, d: 2 * x, n: 2, unit: 'cm²' },
          circle: { name: 'radius of a circle', q: 'area', F: 'A = \\pi r^{2}', dF: 'dA = 2\\pi r\\,dr', v: 'r', f: (t) => Math.PI * t * t, d: 2 * Math.PI * x, n: 2, unit: 'cm²' },
        }[shape];
        const err = S.d * dx;
        const value = S.f(x);
        const pctIn = (100 * dx) / x;
        return {
          problem: `The ${S.name} is measured as ${txt(x)} cm, with a possible error of ${txt(dx)} cm. Estimate the possible error in the calculated ${S.q}.`,
          steps: [
            R`Formula: \(${S.F}\), which gives ${/^[aeiou]/.test(S.q) ? 'an' : 'a'} ${S.q} of about \(${num(round(value, 2))}\) ${S.unit}.`,
            R`Differential: \(${S.dF}\).`,
            R`Substitute \(${S.v} = ${num(x)}\) and \(d${S.v} = ${num(dx)}\): the error is about \(${num(round(err, 2))}\) ${S.unit}.`,
            R`As a percentage: the length is off by up to \(${num(round(pctIn, 2))}\%\), and the ${S.q} by about \(${S.n} \times ${num(round(pctIn, 2))}\% = ${num(round(S.n * pctIn, 2))}\%\).`,
          ],
          answer: R`About \(${num(round(err, 2))}\) ${S.unit}, or \(${num(round(S.n * pctIn, 2))}\%\) of the ${S.q}.`,
          note: `The actual largest change, found by recalculating with ${txt(round(x + dx, 2))} cm, is ${txt(round(S.f(x + dx) - value, 2))} ${S.unit}. The differential is a close, quick estimate.`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyLinearValue, easyLinearization, easyFormCheck],
    medium: [mediumEstimate, mediumOverUnder, mediumLHopital, mediumDifferential],
    hard: [hardLHopitalInfinity, hardLHopitalRepeated, hardNotApply, hardErrorPercent],
    challenge: [challengeRewrite, challengeFindConstant, challengeBackwards],
  },
};
