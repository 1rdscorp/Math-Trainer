import { R, q, frac, num, terms, poly, polyEval, polyDeriv, power, over, texFrac, paren, sqrtTex, range, sum, checkEqual, checkIntegral, checkAntideriv, checkDeriv, checkAll, integrate, numDeriv, close } from '../../lib/index.js';
import { M, fit, subst, numDeriv2, checkDistinct } from './_shared.js';

// ───────────── Helpers ─────────────

const C = (tex) => M(`${tex} + C`); // every indefinite integral carries + C
const mono = (a, n, x = 'x') => terms([[a, power(x, n)]]);
// A sum, or an expression that starts with a minus sign, gets parentheses when it is used as an integrand.
const wrap = (tex) => (/ [+-] /.test(tex) || tex.startsWith('-') ? R`\left(${tex}\right)` : tex);
const integral = (lo, hi, body, v = 'x') => R`\int_{${lo}}^{${hi}} ${body}\,d${v}`;
// Antiderivative of a polynomial (coefficients highest power first) with constant term 0, as exact fractions.
const antiPoly = (coefs) => [...coefs.map((c, i) => frac(c, coefs.length - i)), 0];
// c/(d·X) for a fraction c = n/d: fracX(frac(-3, 2), 'x^{2}') → "-\frac{3}{2x^{2}}".
const fracX = (c, X) => (c.d === 1 ? over(c.n, X) : R`${c.n < 0 ? '-' : ''}\frac{${Math.abs(c.n)}}{${c.d}${X}}`);
// True when F is not an antiderivative of f: somewhere F′ ≠ f.
const notAnti = (F, f) => [0.37, 0.83, 1.29, 1.71].some((x) => !close(numDeriv(F, x), f(x), 1e-4));
// Check for "find the antiderivative": the right choice differentiates to f and no wrong choice does.
// (A wrong choice that differed from the right one only by a constant would also be a correct answer.)
const antiCheck = (f, right, wrongs) => () => checkAll(checkAntideriv(right, f), ...wrongs.map((w, i) => (notAnti(w, f) ? true : `wrong choice ${i + 1} is also an antiderivative`)));
// The piecewise-linear function through the points [[x, y], …], and its integral taken one straight piece at a time.
const interp = (pts) => (x) => {
  let i = 1;
  while (i < pts.length - 1 && x > pts[i][0]) i++;
  const [[x0, y0], [x1, y1]] = [pts[i - 1], pts[i]];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
};
const integratePieces = (f, xs) => sum(xs.slice(1).map((x, i) => integrate(f, xs[i], x, 100)));

// ───────────── Easy ─────────────

function easyPower(rng) {
  const single = rng.bool();
  const n = single ? rng.int(1, 6) : rng.int(1, 2); // degree of the integrand
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const coefs = single ? [a, ...new Array(n).fill(0)] : [rng.nonzero(-6, 6), ...(n === 2 ? [rng.int(-8, 8)] : []), rng.nonzero(-9, 9)];
  const right = antiPoly(coefs);
  const wrong = [
    { c: [...coefs, 0], why: 'Raising the exponent is only half of the rule. Divide each term by its new exponent as well.' },
    { c: polyDeriv(coefs), why: 'That is the derivative. An antiderivative raises each exponent by 1 instead of lowering it.' },
    single ? { c: [frac(a, n + 1), ...new Array(n).fill(0)], why: R`Raise the exponent to \(${n + 1}\) first, then divide by \(${n + 1}\).` } : { c: [...right.slice(0, -2), 0, 0], why: R`The constant \(${coefs[n]}\) has an antiderivative too: \(${mono(coefs[n], 1)}\).` },
    { c: single ? [frac(a, n), ...new Array(n + 1).fill(0)] : right.map((v, i) => (i === 0 ? v.neg() : v)) },
  ];
  return q({
    prompt: R`Find \(\displaystyle\int ${wrap(poly(coefs))}\,dx\).`,
    correct: C(poly(right)),
    wrong: wrong.map((w) => (w.why ? { value: C(poly(w.c)), why: w.why } : C(poly(w.c)))),
    solution: single
      ? [R`Power rule for antiderivatives: \(\int x^{n}\,dx = \dfrac{x^{n+1}}{n+1} + C\). The constant \(${a}\) stays in front.`, R`Raise the exponent to \(${n + 1}\) and divide by \(${n + 1}\): \(${a} \cdot \dfrac{x^{${n + 1}}}{${n + 1}} = ${poly(right)}\).`, R`Add the constant of integration: \(${poly(right)} + C\).`]
      : ['Integrate term by term: raise each exponent by 1 and divide by the new exponent.', `${coefs.map((c, i) => (c === 0 ? null : R`\(${mono(c, n - i)} \to ${mono(right[i], n - i + 1)}\)`)).filter(Boolean).join(', ')}.`, R`Add the constant of integration: \(${poly(right)} + C\).`],
    rule: 1, skill: 'power rule for antiderivatives',
    check: antiCheck((x) => polyEval(coefs, x), (x) => polyEval(right, x), wrong.map((w) => (x) => polyEval(w.c, x))),
  });
}

const BASIC = [
  {
    f: (a) => terms([[a, R`\cos x`]]), F: (a) => terms([[a, R`\sin x`]]), js: [Math.cos, Math.sin], rule: R`\(\int \cos x\,dx = \sin x + C\)`,
    wrong: (a) => [[terms([[-a, R`\sin x`]]), R`The minus sign belongs to the other rule: \(\int \sin x\,dx = -\cos x + C\).`], [terms([[a, R`\cos x`]])], [terms([[-a, R`\cos x`]])]],
  },
  {
    f: (a) => terms([[a, R`\sin x`]]), F: (a) => terms([[-a, R`\cos x`]]), js: [Math.sin, (x) => -Math.cos(x)], rule: R`\(\int \sin x\,dx = -\cos x + C\)`,
    wrong: (a) => [[terms([[a, R`\cos x`]]), R`Check by differentiating: \(\frac{d}{dx}\cos x = -\sin x\), so a minus sign is needed.`], [terms([[a, R`\sin x`]])], [terms([[-a, R`\sin x`]])]],
  },
  {
    f: (a) => terms([[a, 'e^{x}']]), F: (a) => terms([[a, 'e^{x}']]), js: [Math.exp, Math.exp], rule: R`\(\int e^{x}\,dx = e^{x} + C\)`,
    wrong: (a) => [[texFrac(terms([[a, 'e^{x+1}']]), 'x + 1'), R`The power rule is for \(x^{n}\). Here the variable is in the exponent, and \(e^{x}\) is its own antiderivative.`], [terms([[a, 'xe^{x}']])], [terms([[a, 'e^{x+1}']])]],
  },
  {
    f: (a) => over(a, 'x'), F: (a) => terms([[a, R`\ln|x|`]]), js: [(x) => 1 / x, (x) => Math.log(Math.abs(x))], rule: R`\(\int \frac{1}{x}\,dx = \ln|x| + C\)`,
    wrong: (a) => [[over(-a, 'x^{2}'), R`That is the derivative of \(${over(a, 'x')}\), not an antiderivative.`], [R`\ln|${Math.abs(a)}x|`, 'The constant multiplies the logarithm. It does not move inside it.'], [terms([[a, 'e^{x}']])]],
  },
  {
    f: (a) => terms([[a, R`\sec^{2} x`]]), F: (a) => terms([[a, R`\tan x`]]), js: [(x) => 1 / Math.cos(x) ** 2, Math.tan], rule: R`\(\int \sec^{2} x\,dx = \tan x + C\)`,
    wrong: (a) => [[terms([[frac(a, 3), R`\sec^{3} x`]]), R`The power rule does not work on a power of \(\sec x\). Use \(\frac{d}{dx}\tan x = \sec^{2} x\).`], [terms([[a, R`\sec x\tan x`]])], [terms([[-a, R`\tan x`]])]],
  },
];

function easyBasic(rng) {
  const b = rng.pick(BASIC);
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  return q({
    prompt: R`Find \(\displaystyle\int ${wrap(b.f(a))}\,dx\).`,
    correct: C(b.F(a)),
    wrong: b.wrong(a).map(([tex, why]) => (why ? { value: C(tex), why } : C(tex))),
    solution: [`Use the basic antiderivative ${b.rule}.`, R`The constant \(${a}\) stays in front, and the constant of integration is added: \(${b.F(a)} + C\).`],
    rule: 2, skill: 'basic antiderivatives',
    check: () => checkAntideriv((x) => a * b.js[1](x), (x) => a * b.js[0](x)),
  });
}

function easyEvaluate(rng) {
  const n = rng.int(1, 3);
  const c = rng.nonzero(-3, 3); // the antiderivative is F(x) = c·xⁿ⁺¹
  const k = c * (n + 1);
  const a = rng.int(0, 2);
  const b = a + rng.int(1, n === 3 ? 2 : 3);
  const F = (x) => c * x ** (n + 1);
  const value = F(b) - F(a);
  const whole = integral(a, b, wrap(mono(k, n)));
  return q({
    prompt: R`Evaluate \(${whole}\).`,
    correct: value,
    wrong: [
      { value: k * (b ** n - a ** n), why: 'Substitute the limits into an antiderivative, not into the integrand itself.' },
      a ? { value: F(b) + F(a), why: R`Subtract the two values: \(F(${b}) - F(${a})\).` } : null,
      { value: -value, why: R`The upper limit goes first: \(F(${b}) - F(${a})\).` },
      k * (b ** (n + 1) - a ** (n + 1)),
      a ? F(b) : null,
    ],
    solution: [
      R`An antiderivative of \(${mono(k, n)}\) is \(F(x) = ${mono(c, n + 1)}\).`,
      R`\(F(${b}) = ${F(b)}\) and \(F(${a}) = ${F(a)}\).`,
      R`\(${whole} = F(${b}) - F(${a}) = ${F(b)} - ${paren(F(a))} = ${value}\).`,
    ],
    rule: 4, skill: 'evaluating definite integrals',
    check: () => checkIntegral((x) => k * x ** n, a, b, value),
  });
}

// ───────────── Medium ─────────────

function mediumRewrite(rng) {
  const a = rng.nonzero(-8, 8);
  const kind = rng.pick(['recip', 'root', 'overRoot']);
  let f;
  let fTex;
  let right; // [TeX, function]
  let wrong; // [TeX, function, note?]
  let solution;
  if (kind === 'recip') {
    const n = rng.int(2, 4);
    const c = frac(-a, n - 1);
    f = (x) => a / x ** n;
    fTex = over(a, power('x', n));
    right = [fracX(c, power('x', n - 1)), (x) => c.value / x ** (n - 1)];
    wrong = [
      [fracX(c.neg(), power('x', n - 1)), (x) => -c.value / x ** (n - 1), R`The new exponent is \(${1 - n}\), a negative number. Dividing by it changes the sign.`],
      [fracX(frac(-a, n + 1), power('x', n + 1)), (x) => -a / ((n + 1) * x ** (n + 1)), R`Adding 1 to the exponent \(-${n}\) gives \(${1 - n}\), not \(-${n + 1}\).`],
      [terms([[a, R`\ln|x^{${n}}|`]]), (x) => a * Math.log(Math.abs(x ** n)), R`Only \(\frac{1}{x}\) has the antiderivative \(\ln|x|\). For other powers of \(x\), use the power rule.`],
      [over(-a * n, power('x', n + 1)), (x) => (-a * n) / x ** (n + 1)],
    ];
    solution = [R`Rewrite with a negative exponent: \(${fTex} = ${mono(a, -n)}\).`, R`Power rule: the new exponent is \(-${n} + 1 = ${1 - n}\), and dividing by \(${1 - n}\) gives \(${mono(c, 1 - n)}\).`, R`Write it with a positive exponent and add the constant: \(${right[0]} + C\).`];
  } else if (kind === 'root') {
    f = (x) => a * Math.sqrt(x);
    fTex = terms([[a, R`\sqrt{x}`]]);
    right = [terms([[frac(2 * a, 3), 'x^{3/2}']]), (x) => (2 * a * x ** 1.5) / 3];
    wrong = [
      [terms([[frac(3 * a, 2), 'x^{3/2}']]), (x) => 1.5 * a * x ** 1.5, R`Divide by the new exponent \(\tfrac{3}{2}\), which is the same as multiplying by \(\tfrac{2}{3}\).`],
      [fracX(frac(a, 2), R`\sqrt{x}`), (x) => a / (2 * Math.sqrt(x)), R`That is the derivative. For an antiderivative the exponent goes up by 1, from \(\tfrac{1}{2}\) to \(\tfrac{3}{2}\).`],
      [terms([[frac(2 * a, 3), R`\sqrt{x}`]]), (x) => (2 * a * Math.sqrt(x)) / 3],
      [terms([[a, 'x^{3/2}']]), (x) => a * x ** 1.5],
    ];
    solution = [R`Rewrite the root as a power: \(${fTex} = ${terms([[a, 'x^{1/2}']])}\).`, R`Power rule: the new exponent is \(\tfrac{3}{2}\), and dividing by \(\tfrac{3}{2}\) multiplies the coefficient by \(\tfrac{2}{3}\).`, R`\(${right[0]} + C\).`];
  } else {
    f = (x) => a / Math.sqrt(x);
    fTex = over(a, R`\sqrt{x}`);
    right = [terms([[2 * a, R`\sqrt{x}`]]), (x) => 2 * a * Math.sqrt(x)];
    wrong = [
      [terms([[frac(a, 2), R`\sqrt{x}`]]), (x) => (a * Math.sqrt(x)) / 2, R`The new exponent is \(\tfrac{1}{2}\). Dividing by \(\tfrac{1}{2}\) doubles the coefficient.`],
      [fracX(frac(-a, 2), 'x^{3/2}'), (x) => -a / (2 * x ** 1.5), R`That is the derivative. For an antiderivative the exponent goes up by 1, from \(-\tfrac{1}{2}\) to \(\tfrac{1}{2}\).`],
      [terms([[a, R`\ln|\sqrt{x}|`]]), (x) => a * Math.log(Math.sqrt(x))],
      [over(2 * a, R`\sqrt{x}`), (x) => (2 * a) / Math.sqrt(x)],
    ];
    solution = [R`Rewrite as a power: \(${fTex} = ${terms([[a, 'x^{-1/2}']])}\).`, R`Power rule: the new exponent is \(-\tfrac{1}{2} + 1 = \tfrac{1}{2}\), and dividing by \(\tfrac{1}{2}\) doubles the coefficient: \(${terms([[2 * a, 'x^{1/2}']])}\).`, R`\(${right[0]} + C\).`];
  }
  return q({
    prompt: R`Find \(\displaystyle\int ${wrap(fTex)}\,dx\).`,
    correct: C(right[0]),
    wrong: wrong.map(([tex, , why]) => (why ? { value: C(tex), why } : C(tex))),
    solution,
    rule: 1, skill: 'rewriting before integrating',
    check: antiCheck(f, right[1], wrong.map((w) => w[1])),
  });
}

function mediumIVP(rng) {
  const exp = rng.bool(0.3);
  const p = exp ? 0 : rng.nonzero(-2, 3);
  const y = rng.int(-9, 12);
  const [a, b, deg] = [rng.nonzero(-3, 3), rng.int(-6, 6), rng.int(2, 3)];
  // family(k, C): the antiderivatives when k = 1; a common slip when k ≠ 1 (the leading term is not divided, or eˣ is treated like a power).
  const family = exp
    ? (k, c) => ({ tex: terms([[a, k === 1 ? 'e^{x}' : 'xe^{x}'], [b, 'x'], [c, '']]), fn: (x) => a * (k === 1 ? 1 : x) * Math.exp(x) + b * x + c })
    : (k, c) => { const cf = deg === 2 ? [k * a, b, c] : [k * a, 0, b, c]; return { tex: poly(cf), fn: (x) => polyEval(cf, x) }; };
  const base = family(1, 0).fn(p);
  if (base === 0) return mediumIVP(rng);
  const df = exp ? (x) => a * Math.exp(x) + b : (x) => (deg === 2 ? 2 * a * x + b : 3 * a * x * x + b);
  const dTex = exp ? terms([[a, 'e^{x}'], [b, '']]) : poly(deg === 2 ? [2 * a, b] : [3 * a, 0, b]);
  const c0 = y - base;
  const right = family(1, c0);
  const slip = family(deg, 0).fn(p);
  const wrong = [
    { ...family(1, y), why: R`\(${y}\) is the value of \(f(${p})\), not the constant. Substitute \(x = ${p}\) and solve for \(C\).` },
    { ...family(1, y + base), why: R`Solving \(${base} + C = ${y}\) gives \(C = ${y} - ${paren(base)} = ${c0}\).` },
    { ...family(deg, y - slip), why: R`Check by differentiating: this does not give back \(f'(x) = ${dTex}\).` },
    family(1, 0),
  ].filter((w) => w.tex !== right.tex); // when C = 0, "no constant" is the right answer itself
  const fits = (g) => checkDeriv(g, df) === true && close(g(p), y, 1e-9);
  return q({
    prompt: R`Find the function \(f\) that satisfies \(f'(x) = ${dTex}\) and \(f(${p}) = ${y}\).`,
    correct: M(`f(x) = ${right.tex}`),
    wrong: wrong.map((w) => (w.why ? { value: M(`f(x) = ${w.tex}`), why: w.why } : M(`f(x) = ${w.tex}`))),
    solution: [
      R`Antidifferentiate: \(f(x) = ${family(1, 0).tex} + C\).`,
      R`Use \(f(${p}) = ${y}\): \(${exp ? terms([[a, 'e^{0}']]) : subst(deg === 2 ? [a, b, 0] : [a, 0, b, 0], p)} + C = ${y}\), so \(${base} + C = ${y}\) and \(C = ${c0}\).`,
      R`\(f(x) = ${right.tex}\).`,
    ],
    rule: 3, skill: 'initial-value problems',
    check: () => (fits(right.fn) && wrong.every((w) => !fits(w.fn)) ? true : 'the key must satisfy both conditions, and no wrong choice may satisfy both'),
  });
}

// Integrands with no elementary antiderivative, so the Fundamental Theorem (part 1) is the only way in.
// of(P) writes the integrand, where P(p) is the TeX for the p-th power of the variable (or of an upper limit).
const INTEGRANDS = [
  { of: (P) => R`\sqrt{1 + ${P(3)}}`, js: (t) => Math.sqrt(1 + t ** 3), d: R`\frac{3x^{2}}{2\sqrt{1 + x^{3}}}`, at: (a) => sqrtTex(1 + a ** 3) },
  { of: (P) => R`\cos\left(${P(2)}\right)`, js: (t) => Math.cos(t * t), d: R`-2x\sin\left(x^{2}\right)`, at: (a) => R`\cos ${a * a}` },
  { of: (P) => `e^{-${P(2)}}`, js: (t) => Math.exp(-t * t), d: '-2xe^{-x^{2}}', at: (a) => `e^{-${a * a}}`, maxA: 2 }, // e⁻⁹ and e⁻¹⁶ are too close to 0 to make a fair wrong answer
  { of: (P) => R`\ln\left(1 + ${P(2)}\right)`, js: (t) => Math.log(1 + t * t), d: R`\frac{2x}{1 + x^{2}}`, at: (a) => R`\ln ${1 + a * a}` },
  { of: (P) => R`\sin\left(${P(2)}\right)`, js: (t) => Math.sin(t * t), d: R`2x\cos\left(x^{2}\right)`, at: (a) => R`\sin ${a * a}` },
];
const pw = (v) => (p) => `${v}^{${p}}`;

function mediumFTC1(rng) {
  const g = rng.pick(INTEGRANDS);
  const a = rng.int(1, g.maxA ?? 4);
  const flipped = rng.bool(0.35); // the variable is the lower limit
  const [gx, gt] = [g.of(pw('x')), g.of(pw('t'))];
  return q({
    prompt: R`Let \(F(x) = \displaystyle${integral(flipped ? 'x' : a, flipped ? a : 'x', gt, 't')}\). Find \(F'(x)\).`,
    correct: M(flipped ? `-${gx}` : gx),
    wrong: flipped
      ? [{ value: M(gx), why: R`Here \(x\) is the lower limit. Swapping the limits changes the sign.` }, M(`${g.at(a)} - ${gx}`), M(`-${gt}`), M(gt)]
      : [
        { value: M(g.d), why: 'That differentiates the integrand. Differentiating the integral gives the integrand back, unchanged.' },
        { value: M(`${gx} - ${g.at(a)}`), why: R`The lower limit \(${a}\) is a constant, so it contributes nothing to the derivative.` },
        { value: M(gt), why: R`\(F\) is a function of \(x\). Replace \(t\) by \(x\).` },
        M(`-${gx}`),
      ],
    solution: flipped
      ? [R`The variable is in the lower limit, so swap the limits first: \(F(x) = -\displaystyle${integral(a, 'x', gt, 't')}\).`, R`Fundamental Theorem, part 1: the derivative of \(\int_a^x g(t)\,dt\) is \(g(x)\). So \(F'(x) = -${gx}\).`]
      : [R`Fundamental Theorem, part 1: if \(F(x) = \int_a^x g(t)\,dt\), then \(F'(x) = g(x)\).`, R`The lower limit \(${a}\) is a constant and does not affect the derivative. Replace \(t\) by \(x\) in the integrand: \(F'(x) = ${gx}\).`],
    rule: 5, skill: 'derivative of an integral',
    // Differentiate the integral itself, numerically.
    check: () => checkAll(...[0.6, 1.1, 1.7].map((x0) => checkEqual((flipped ? -1 : 1) * g.js(x0), numDeriv((x) => (flipped ? integrate(g.js, x, a) : integrate(g.js, a, x)), x0), 1e-4, `F'(${x0})`))),
  });
}

const STOCKS = [
  { open: (A) => R`A tank holds ${A} liters of water at time \(t = 0\).`, flow: (r) => R`Water is pumped in at the rate \(r(t) = ${r}\) liters per minute.`, ask: (T) => R`How much water is in the tank at \(t = ${T}\) minutes?`, unit: 'liters' },
  { open: (A) => R`A seedling is ${A} millimeters tall at time \(t = 0\).`, flow: (r) => R`It grows at the rate \(r(t) = ${r}\) millimeters per week.`, ask: (T) => R`How tall is it at \(t = ${T}\) weeks?`, unit: 'mm' },
  { open: (A) => R`A new video has ${A} views at time \(t = 0\).`, flow: (r) => R`Its number of views grows at the rate \(r(t) = ${r}\) views per hour.`, ask: (T) => R`How many views does it have at \(t = ${T}\) hours?`, unit: 'views' },
];

function mediumNetChange(rng) {
  const c = rng.pick(STOCKS);
  const quad = rng.bool(0.4);
  const [a, b, T] = [rng.int(1, quad ? 3 : 5), rng.int(0, 9), rng.int(2, quad ? 3 : 5)];
  const A0 = 5 * rng.int(2, 12);
  const rate = quad ? [3 * a, 0, b] : [2 * a, b];
  const anti = quad ? [a, 0, b, 0] : [a, b, 0];
  const r = (t) => polyEval(rate, t);
  const gain = polyEval(anti, T);
  const value = A0 + gain;
  return q({
    prompt: `${c.open(A0)} ${c.flow(poly(rate, 't'))} ${c.ask(T)}`,
    correct: value,
    unit: c.unit,
    wrong: [
      { value: gain, why: 'That is how much was added. Add it to the starting amount.' },
      { value: A0 + r(T), why: R`\(r(${T})\) is the rate at that moment, not the total change. Integrate the rate from \(0\) to \(${T}\).` },
      { value: A0 + r(T) * T, why: 'That uses the final rate for the whole time. The rate changes, so integrate it.' },
      A0 + polyEval([...rate, 0], T),
    ],
    solution: [
      R`Net change: the amount at \(t = ${T}\) is the starting amount plus \(${integral(0, T, 'r(t)', 't')}\).`,
      R`\(${integral(0, T, wrap(poly(rate, 't')), 't')} = \Big[${poly(anti, 't')}\Big]_{0}^{${T}} = ${gain}\).`,
      R`\(${A0} + ${gain} = ${value}\) ${c.unit}.`,
    ],
    rule: 6, skill: 'net change',
    check: () => checkEqual(value, A0 + integrate(r, 0, T), 1e-9, 'starting amount plus the integral of the rate'),
  });
}

// ───────────── Hard ─────────────

// Definite integrals with exact answers. Each entry gives the integrand, the limits as [TeX, number], an antiderivative and its two values.
const DEFINITE = [
  (rng) => {
    const [a, b] = [rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
    return {
      body: terms([[a, R`\cos x`], [b, R`\sin x`]]), lo: ['0', 0], hi: [R`\frac{\pi}{2}`, Math.PI / 2], f: (x) => a * Math.cos(x) + b * Math.sin(x),
      F: terms([[a, R`\sin x`], [-b, R`\cos x`]]),
      work: R`\(F\left(\frac{\pi}{2}\right) = ${a}(1) - ${paren(b)}(0) = ${a}\) and \(F(0) = ${a}(0) - ${paren(b)}(1) = ${-b}\)`,
      value: a + b,
      wrong: [{ value: a - b, why: R`The antiderivative of \(\sin x\) is \(-\cos x\). Check the sign of that term.` }, { value: a, why: R`\(F(0)\) is not \(0\), because \(\cos 0 = 1\).` }, -a - b, b - a, b],
    };
  },
  (rng) => {
    const [a, k] = [rng.nonzero(-6, 6), rng.int(1, 3)];
    const E = k === 1 ? 'e' : `e^{${k}}`;
    return {
      body: over(a, 'x'), lo: ['1', 1], hi: [E, Math.exp(k)], f: (x) => a / x,
      F: terms([[a, R`\ln|x|`]]),
      work: R`\(F(${E}) = ${terms([[a, R`\ln ${E}`]])} = ${a * k}\) and \(F(1) = ${terms([[a, R`\ln 1`]])} = 0\)`,
      value: a * k,
      wrong: [{ value: a * (k - 1), why: R`\(\ln 1 = 0\), not \(1\).` }, k > 1 ? { value: a, why: R`\(\ln ${E} = ${k}\).` } : null, a * (k + 1), -a * k, 2 * a * k],
    };
  },
  (rng) => {
    const [a, m] = [rng.nonzero(-5, 5), rng.int(2, 6)];
    return {
      body: terms([[a, 'e^{x}']]), lo: ['0', 0], hi: [R`\ln ${m}`, Math.log(m)], f: (x) => a * Math.exp(x),
      F: terms([[a, 'e^{x}']]),
      work: R`\(F(\ln ${m}) = ${terms([[a, R`e^{\ln ${m}}`]])} = ${a * m}\) and \(F(0) = ${terms([[a, 'e^{0}']])} = ${a}\)`,
      value: a * (m - 1),
      wrong: [{ value: a * m, why: R`\(e^{0} = 1\), so \(F(0) = ${a}\), not \(0\).` }, a * (m + 1), -a * (m - 1), a],
    };
  },
  (rng) => {
    const a = rng.nonzero(-6, 6);
    const [p, s] = rng.pick([[0, 1], [1, 2], [0, 2], [1, 3], [2, 3]]);
    const cubes = s ** 3 - p ** 3;
    return {
      body: terms([[a, R`\sqrt{x}`]]), lo: [`${p * p}`, p * p], hi: [`${s * s}`, s * s], f: (x) => a * Math.sqrt(x),
      F: terms([[frac(2 * a, 3), 'x^{3/2}']]),
      work: R`\(${s * s}^{3/2} = ${s ** 3}\) and \(${p * p}^{3/2} = ${p ** 3}\), so \(F(${s * s}) = ${frac(2 * a * s ** 3, 3).tex()}\) and \(F(${p * p}) = ${frac(2 * a * p ** 3, 3).tex()}\)`,
      value: frac(2 * a * cubes, 3),
      wrong: [{ value: a * cubes, why: R`Dividing by the new exponent \(\tfrac{3}{2}\) multiplies by \(\tfrac{2}{3}\).` }, { value: frac(2 * a * (s - p), 3), why: R`The antiderivative contains \(x^{3/2}\), not \(\sqrt{x}\). For example, \(${s * s}^{3/2} = ${s ** 3}\).` }, frac(3 * a * cubes, 2), frac(-2 * a * cubes, 3)],
    };
  },
  (rng) => {
    const [a, b] = [rng.nonzero(-6, 6), rng.int(2, 5)];
    return {
      body: over(a, 'x^{2}'), lo: ['1', 1], hi: [`${b}`, b], f: (x) => a / (x * x),
      F: over(-a, 'x'),
      work: R`\(F(${b}) = ${frac(-a, b).tex()}\) and \(F(1) = ${-a}\)`,
      value: frac(a * (b - 1), b),
      wrong: [{ value: frac(-a * (b - 1), b), why: R`The antiderivative of \(x^{-2}\) is \(-x^{-1}\). Check its sign.` }, { value: frac(a * (1 - b * b), b * b), why: 'Substitute the limits into the antiderivative, not into the integrand.' }, frac(-a, b), frac(a * (b + 1), b)],
    };
  },
];

function hardDefinite(rng) {
  const t = rng.pick(DEFINITE)(rng);
  return q({
    prompt: R`Evaluate \(${integral(t.lo[0], t.hi[0], wrap(t.body))}\).`,
    correct: t.value,
    wrong: t.wrong,
    solution: [R`An antiderivative is \(F(x) = ${t.F}\).`, `${t.work}.`, R`Subtract the value at the lower limit from the value at the upper limit: the integral is \(${num(t.value)}\).`],
    rule: 4, skill: 'evaluating definite integrals',
    check: () => checkIntegral(t.f, t.lo[1], t.hi[1], Number(t.value), 1e-4),
  });
}

// Upper limits u(x): P(p) writes u(x)ᵖ, times(g) writes u′(x)·g and by(g) writes u(x)·g.
const UPPERS = [
  { tex: 'x^{2}', d: '2x', js: (x) => x * x, djs: (x) => 2 * x, P: (p) => `x^{${2 * p}}`, times: (g) => `2x${g}`, by: (g) => `x^{2}${g}` },
  { tex: 'x^{3}', d: '3x^{2}', js: (x) => x ** 3, djs: (x) => 3 * x * x, P: (p) => `x^{${3 * p}}`, times: (g) => `3x^{2}${g}`, by: (g) => `x^{3}${g}` },
  { tex: R`\sin x`, d: R`\cos x`, js: Math.sin, djs: Math.cos, P: (p) => R`\sin^{${p}} x`, times: (g) => R`${g}\cos x`, by: (g) => R`${g}\sin x` },
  { tex: 'e^{x}', d: 'e^{x}', js: Math.exp, djs: Math.exp, P: (p) => `e^{${p}x}`, times: (g) => `e^{x}${g}`, by: () => null },
  ...[2, 3].map((k) => ({ tex: `${k}x`, d: `${k}`, js: (x) => k * x, djs: () => k, P: (p) => `${k ** p}x^{${p}}`, times: (g) => `${k}${g}`, by: (g) => `${k}x${g}` })),
];

function hardFTC1Chain(rng) {
  const g = rng.pick(INTEGRANDS);
  const u = rng.pick(UPPERS);
  if (u.tex === 'e^{x}' && g.of(pw('t')).startsWith('e^')) return hardFTC1Chain(rng); // e to the power −e²ˣ is hard to read
  const a = rng.int(0, 3);
  const [inner, plain] = [g.of(u.P), g.of(pw('x'))];
  const right = [u.times(inner), (x) => u.djs(x) * g.js(u.js(x))];
  const wrong = [
    [inner, (x) => g.js(u.js(x)), R`The upper limit is \(${u.tex}\), not \(x\). By the chain rule, multiply by its derivative \(${u.d}\).`],
    [u.times(plain), (x) => u.djs(x) * g.js(x), R`Replace \(t\) by the upper limit \(${u.tex}\), not by \(x\).`],
    [plain, g.js],
    [u.by(inner), (x) => u.js(x) * g.js(u.js(x))],
  ].filter((w) => w[0]);
  return q({
    prompt: R`Find \(F'(x)\) if \(F(x) = \displaystyle${integral(a, u.tex, g.of(pw('t')), 't')}\).`,
    correct: M(right[0]),
    wrong: wrong.map(([tex, , why]) => (why ? { value: M(tex), why } : M(tex))),
    solution: [
      R`Chain rule with the Fundamental Theorem: \(\dfrac{d}{dx}\displaystyle\int_{a}^{u(x)} g(t)\,dt = g(u(x)) \cdot u'(x)\).`,
      R`Here \(u(x) = ${u.tex}\), so \(u'(x) = ${u.d}\). Replacing \(t\) by \(${u.tex}\) in the integrand gives \(${inner}\).`,
      R`\(F'(x) = ${right[0]}\).`,
    ],
    rule: 5, skill: 'derivative of an integral',
    check: () => checkAll(
      ...[0.4, 0.8, 1.2].map((x0) => checkEqual(right[1](x0), numDeriv((x) => integrate(g.js, a, u.js(x)), x0), 1e-4, `F'(${x0})`)),
      checkDistinct(right[1], wrong.map((w) => w[1])),
    ),
  });
}

function hardDistance(rng) {
  const quad = rng.bool(0.4);
  const r = rng.int(1, quad ? 2 : 4); // the velocity is zero at t = r
  const T = r + rng.int(1, quad ? 2 : 4);
  const m = quad ? rng.int(1, 2) : rng.pick([-6, -4, -2, 2, 4, 6]);
  const vCoefs = quad ? [3 * m, 0, -3 * m * r * r] : [m, -m * r];
  const sCoefs = quad ? [m, 0, -3 * m * r * r, 0] : [m / 2, -m * r, 0];
  const v = (t) => polyEval(vCoefs, t);
  const s = (t) => polyEval(sCoefs, t);
  const [first, second] = [s(r) - s(0), s(T) - s(r)];
  const [disp, dist] = [first + second, Math.abs(first) + Math.abs(second)];
  const wantDist = rng.bool(0.65);
  const who = rng.pick(['robot', 'toy train', 'delivery cart']);
  const [vTex, sTex] = [poly(vCoefs, 't'), poly(sCoefs, 't')];
  return q({
    prompt: R`A ${who} moves along a straight track. Its velocity after \(t\) seconds is \(v(t) = ${vTex}\) meters per second, where a negative velocity means it is moving backward. ${wantDist ? `What is the total distance the ${who} travels` : `What is the displacement of the ${who} (its change in position)`} from \(t = 0\) to \(t = ${T}\)?`,
    correct: wantDist ? dist : disp,
    unit: 'm',
    wrong: wantDist
      ? [{ value: disp, why: 'That is the displacement. The distance traveled counts the backward part as positive too.' }, Math.abs(disp), Math.abs(second), Math.abs(first), dist + Math.abs(first)]
      : [{ value: dist, why: 'That is the total distance. In the displacement, the backward and forward parts cancel each other.' }, -disp, second, first, disp + 1],
    solution: wantDist
      ? [
        R`\(v(t) = 0\) at \(t = ${r}\). The velocity is ${first < 0 ? 'negative' : 'positive'} before that and ${second < 0 ? 'negative' : 'positive'} after it, so split the interval there.`,
        R`An antiderivative of \(v\) is \(s(t) = ${sTex}\). From \(0\) to \(${r}\): \(s(${r}) - s(0) = ${first}\). From \(${r}\) to \(${T}\): \(s(${T}) - s(${r}) = ${second}\).`,
        R`Total distance: \(\left|${first}\right| + \left|${second}\right| = ${dist}\) m.`,
      ]
      : [
        R`Displacement is the integral of the velocity, \(${integral(0, T, 'v(t)', 't')}\). Backward motion counts as negative.`,
        R`An antiderivative of \(v\) is \(s(t) = ${sTex}\), so the displacement is \(s(${T}) - s(0) = ${s(T)} - ${paren(s(0))} = ${disp}\) m.`,
        `The ${who} goes ${Math.abs(first)} m one way and ${Math.abs(second)} m the other way. The total distance, ${dist} m, is a different quantity.`,
      ],
    rule: 6, skill: 'displacement and distance',
    check: () => (wantDist ? checkEqual(dist, integrate((t) => Math.abs(v(t)), 0, r) + integrate((t) => Math.abs(v(t)), r, T), 1e-9, 'integral of |v|') : checkIntegral(v, 0, T, disp)),
  });
}

// ───────────── Challenge ─────────────

function challengeMotion(rng) {
  const [k, m] = [rng.pick([-1, 1, 2]), rng.int(-3, 3)];
  const [v0, s0, T] = [rng.int(-5, 8), rng.int(0, 10), rng.int(1, 3)];
  const sCoefs = [k, m, v0, s0];
  const s = (t) => polyEval(sCoefs, t);
  const a = (t) => 6 * k * t + 2 * m;
  const value = s(T);
  return q({
    prompt: R`A drone flies along a straight path with acceleration \(a(t) = ${poly([6 * k, 2 * m], 't')}\) meters per second squared. At \(t = 0\) its velocity is \(${v0}\) m/s and its position is \(${s0}\) m. What is its position at \(t = ${T}\) ${T === 1 ? 'second' : 'seconds'}?`,
    correct: value,
    unit: 'm',
    wrong: [
      { value: polyEval([3 * k, 2 * m, v0], T), why: 'That is the velocity at that time. Integrate once more to get the position.' },
      v0 ? { value: polyEval([k, m, 0, s0], T), why: R`The first integration has a constant too. Since \(v(0) = ${v0}\), the velocity contains \(${v0}\), which adds \(${mono(v0, 1, 't')}\) to the position.` } : null,
      s0 ? { value: value - s0, why: 'That is the change in position. Add the starting position.' } : null,
      polyEval([k, m, 0, 0], T), a(T), value + T,
    ],
    solution: [
      R`Velocity: \(v(t) = \int a(t)\,dt = ${poly([3 * k, 2 * m, 0], 't')} + C_1\). Since \(v(0) = ${v0}\), \(C_1 = ${v0}\).`,
      R`Position: \(s(t) = \int v(t)\,dt = ${poly([k, m, v0, 0], 't')} + C_2\). Since \(s(0) = ${s0}\), \(C_2 = ${s0}\).`,
      R`\(s(${T}) = ${subst(sCoefs, T)} = ${value}\) m.`,
    ],
    rule: 3, skill: 'initial-value problems',
    // The position function must have the given acceleration, starting velocity and starting position.
    check: () => checkAll(checkEqual(numDeriv2(s, 0.7), a(0.7), 1e-4, "s''"), checkEqual(numDeriv2(s, 1.9), a(1.9), 1e-4, "s''"), checkEqual(numDeriv(s, 0), v0, 1e-6, "s'(0)"), checkEqual(s(0), s0), checkEqual(value, s(T))),
  });
}

// Corner heights of a graph of f made of line segments (h, k > 0). f changes sign exactly once, at a corner.
const ACCUM = [(h, k) => [0, h, 0, -k, 0], (h, k) => [h, h, 0, -k], (h, k) => [0, h, h, 0, -k], (h, k) => [-k, 0, h, h], (h, k) => [0, -k, 0, h, h], (h, k) => [-k, -k, 0, h, 0]];

function challengeAccumGraph(rng) {
  const [h, k] = [rng.int(1, 4), rng.int(1, 4)];
  const ys = rng.pick(ACCUM)(h, k);
  const xs = ys.slice(1).reduce((acc) => [...acc, acc[acc.length - 1] + rng.int(1, 3)], [0]);
  const last = ys.length - 1;
  const pts = xs.map((x, i) => [x, ys[i]]);
  const f = interp(pts);
  const G = (x) => integratePieces(f, [0, ...xs.filter((v) => v > 0 && v < x), x]); // g(x), numerically
  const area = (i) => frac((ys[i] + ys[i + 1]) * (xs[i + 1] - xs[i]), 2); // signed area of piece i
  const gAt = (i) => range(0, i - 1).reduce((acc, j) => acc.add(area(j)), frac(0)); // g at corner i
  const zero = range(1, last - 1).find((i) => ys[i] === 0 && ys[i - 1] * ys[i + 1] < 0);
  const up = ys[zero - 1] > 0; // f is positive before it changes sign
  const spec = {
    value: () => {
      const i = rng.int(2, last);
      const [c, value] = [xs[i], gAt(i)];
      return {
        ask: R`What is \(g(${c})\)?`,
        correct: value,
        wrong: [
          { value: range(0, i - 1).reduce((acc, j) => acc.add(area(j).abs()), frac(0)), why: 'That is the total area. In the integral, area below the axis counts as negative.' },
          { value: ys[i], why: R`That is \(f(${c})\), which equals \(g'(${c})\). The value \(g(${c})\) is the signed area from \(0\) to \(${c}\).` },
          value.neg(), value.add(1), value.sub(1),
        ],
        solution: [R`\(g(${c}) = \int_{0}^{${c}} f(t)\,dt\) is the signed area between the graph of \(f\) and the axis from \(0\) to \(${c}\).`, R`Add the areas of the pieces (triangles, rectangles and trapezoids), counting pieces below the axis as negative: \(${range(0, i - 1).map((j) => (area(j).value < 0 ? R`\left(${area(j).tex()}\right)` : area(j).tex())).join(' + ')} = ${value.tex()}\).`],
        test: () => checkEqual(value.value, G(c), 1e-9, 'g(c)'),
      };
    },
    slope: () => {
      const i = rng.pick(range(0, last).filter((j) => ys[j] !== 0));
      const c = xs[i];
      const j = i < last ? i : i - 1;
      return {
        ask: R`What is \(g'(${c})\)?`,
        correct: ys[i],
        wrong: [
          { value: gAt(i), why: R`That is \(g(${c})\), the signed area up to \(${c}\). The derivative \(g'(${c})\) is the height \(f(${c})\).` },
          { value: frac(ys[j + 1] - ys[j], xs[j + 1] - xs[j]), why: R`That is a slope of the graph of \(f\). By the Fundamental Theorem, \(g'(x) = f(x)\): read the height, not the slope.` },
          0, -ys[i], ys[i] + 1,
        ],
        solution: [R`By the Fundamental Theorem (part 1), \(g'(x) = f(x)\).`, R`Read the height of the graph at \(x = ${c}\): \(g'(${c}) = f(${c}) = ${ys[i]}\).`],
        test: () => checkEqual(numDeriv(G, c), ys[i], 1e-3, "g'(c)"),
      };
    },
    extremum: () => ({
      ask: R`At what value of \(x\) does \(g\) have a local ${up ? 'maximum' : 'minimum'}?`,
      correct: xs[zero],
      fmt: (v) => R`\(x = ${num(v)}\)`,
      wrong: [
        { value: xs[ys.indexOf(up ? h : -k)], why: up ? R`That is where \(f\) is greatest. But \(g\) keeps increasing for as long as \(f\) is positive.` : R`That is where \(f\) is least. But \(g\) keeps decreasing for as long as \(f\) is negative.` },
        ...xs.filter((x) => x !== xs[zero]),
      ],
      solution: [R`By the Fundamental Theorem (part 1), \(g'(x) = f(x)\), so \(g\) increases where \(f\) is positive and decreases where \(f\) is negative.`, R`\(f\) changes from ${up ? 'positive to negative' : 'negative to positive'} at \(x = ${xs[zero]}\), so \(g\) has a local ${up ? 'maximum' : 'minimum'} there.`],
      test: () => ([-0.25, 0.25].every((d) => (up ? G(xs[zero] + d) < G(xs[zero]) : G(xs[zero] + d) > G(xs[zero]))) ? true : 'g does not have that kind of turning point there'),
    }),
  }[rng.pick(['value', 'value', 'slope', 'extremum'])]();
  return q({
    prompt: R`The graph of \(f\) on \([0, ${xs[last]}]\) consists of line segments, as shown. Let \(g(x) = \displaystyle\int_{0}^{x} f(t)\,dt\). ${spec.ask}`,
    visual: {
      type: 'plot', x: [-0.5, xs[last] + 0.5], y: [Math.min(...ys) - 1, Math.max(...ys) + 1], step: [1, 1], fns: [{ f, domain: [0, xs[last]] }], points: pts.map(([x, y]) => ({ x, y })),
      alt: `Graph of f made of line segments joining the points ${pts.map(([x, y]) => `(${x}, ${y})`).join(', ')}.`,
    },
    correct: spec.correct,
    fmt: spec.fmt,
    wrong: spec.wrong,
    solution: spec.solution,
    rule: 5, skill: 'accumulation functions',
    check: spec.test,
  });
}

function challengeRecover(rng) {
  const cubic = rng.bool(0.4);
  const [k, m, a, c] = [rng.nonzero(-4, 4), rng.int(-5, 5), rng.int(1, 3), rng.int(-2, 4)];
  // P(a) = 0, as it must be for an integral that starts at a.
  const P = cubic ? [k, 0, 0, -k * a ** 3] : [k, m, -(k * a * a + m * a)];
  const dP = polyDeriv(P);
  const value = polyEval(dP, c);
  return q({
    prompt: R`A continuous function \(f\) satisfies \(\displaystyle${integral(a, 'x', 'f(t)', 't')} = ${poly(P)}\) for every \(x\). What is \(f(${c})\)?`,
    correct: value,
    wrong: [
      { value: polyEval(P, c), why: R`That is the value of the integral when \(x = ${c}\). To find \(f\), differentiate both sides.` },
      { value: value - polyEval(dP, a), why: R`Differentiating \(\int_a^x f(t)\,dt\) gives \(f(x)\) itself. Nothing is subtracted for the lower limit.` },
      -value, value + P[P.length - 1], polyEval(P, c) + 1,
    ],
    solution: [
      R`Differentiate both sides with respect to \(x\). By the Fundamental Theorem (part 1), the left side becomes \(f(x)\).`,
      R`So \(f(x) = \dfrac{d}{dx}\left(${poly(P)}\right) = ${poly(dP)}\).`,
      R`\(f(${c}) = ${subst(dP, c)} = ${value}\).`,
    ],
    rule: 5, skill: 'derivative of an integral',
    // With f = P′, the integral from a to x really is P(x), and the key is f(c).
    check: () => checkAll(...[a + 0.7, a - 1.3].map((x) => checkEqual(integrate((t) => polyEval(dP, t), a, x), polyEval(P, x), 1e-6, 'integral from a to x')), checkEqual(value, numDeriv((x) => polyEval(P, x), c), 1e-5, 'f(c)')),
  });
}

// ───────────── Topic ─────────────

const cartV = (t) => t * t - 4 * t + 3;

export default {
  id: 'antiderivatives-ftc',
  title: 'Antiderivatives & the Fundamental Theorem',
  summary: 'Find antiderivatives, solve initial-value problems, and use both parts of the Fundamental Theorem of Calculus.',
  standards: ['AP Calculus 6.4', 'AP Calculus 6.5', 'AP Calculus 6.7', 'AP Calculus 6.8'],

  explain: {
    intro: R`Antidifferentiation runs differentiation backwards: given a rate of change, recover the function. The Fundamental Theorem of Calculus says that this is also how to find exact areas, so the two halves of calculus, derivatives and integrals, undo each other.`,
    rules: [
      {
        title: 'Antiderivatives and the constant of integration',
        text: R`\(F\) is an antiderivative of \(f\) if \(F'(x) = f(x)\). Any two antiderivatives of \(f\) differ by a constant, so the indefinite integral names the whole family: \(\int f(x)\,dx = F(x) + C\). Check any answer by differentiating it.`,
        example: R`\(\int 2x\,dx = x^{2} + C\), because \(\dfrac{d}{dx}\left(x^{2} + C\right) = 2x\) for every constant \(C\).`,
      },
      {
        title: 'Power rule in reverse',
        text: R`For \(n \neq -1\): \(\int x^{n}\,dx = \dfrac{x^{n+1}}{n+1} + C\). Raise the exponent by 1, then divide by the new exponent. Constant multiples stay in front, sums are integrated term by term, and a constant \(k\) integrates to \(kx\). Rewrite roots and reciprocals as powers first.`,
        example: R`\(\int \left(6x^{2} + \dfrac{4}{x^{3}}\right)dx = \int \left(6x^{2} + 4x^{-3}\right)dx = 2x^{3} - 2x^{-2} + C = 2x^{3} - \dfrac{2}{x^{2}} + C\).`,
      },
      {
        title: 'Antiderivatives to know by heart',
        text: R`Each derivative rule, read backwards: \(\int \cos x\,dx = \sin x + C\), \(\;\int \sin x\,dx = -\cos x + C\), \(\;\int \sec^{2} x\,dx = \tan x + C\), \(\;\int e^{x}\,dx = e^{x} + C\), \(\;\int \dfrac{1}{x}\,dx = \ln|x| + C\).`,
        example: R`\(\int \left(3\sin x + \dfrac{2}{x}\right)dx = -3\cos x + 2\ln|x| + C\).`,
      },
      {
        title: 'Initial-value problems',
        text: R`A derivative and one point determine the function. Antidifferentiate, substitute the point to find \(C\), then write the function with that value of \(C\).`,
        example: R`\(f'(x) = 2x\) and \(f(3) = 4\): \(f(x) = x^{2} + C\), so \(9 + C = 4\), \(C = -5\) and \(f(x) = x^{2} - 5\).`,
      },
      {
        title: 'Fundamental Theorem, part 2: evaluating a definite integral',
        text: R`If \(f\) is continuous on \([a, b]\) and \(F\) is any antiderivative of \(f\), then \(\int_a^b f(x)\,dx = F(b) - F(a)\), also written \(\Big[F(x)\Big]_a^b\). The constant \(C\) would cancel, so leave it out.`,
        example: R`\(\int_{1}^{3} 2x\,dx = \Big[x^{2}\Big]_{1}^{3} = 9 - 1 = 8\).`,
      },
      {
        title: 'Fundamental Theorem, part 1: differentiating an integral',
        text: R`If \(f\) is continuous, the accumulation function \(g(x) = \int_a^x f(t)\,dt\) is an antiderivative of \(f\): \(g'(x) = f(x)\). So \(g\) increases where \(f\) is positive, and has a local maximum where \(f\) changes from positive to negative. When the upper limit is a function \(u(x)\), use the chain rule: \(\dfrac{d}{dx}\displaystyle\int_a^{u(x)} f(t)\,dt = f(u(x)) \cdot u'(x)\).`,
        example: R`\(\dfrac{d}{dx}\displaystyle\int_{2}^{x} \sqrt{1 + t^{3}}\,dt = \sqrt{1 + x^{3}}\), and \(\dfrac{d}{dx}\displaystyle\int_{2}^{x^{2}} \sqrt{1 + t^{3}}\,dt = 2x\sqrt{1 + x^{6}}\).`,
      },
      {
        title: 'Net change and total distance',
        text: R`The integral of a rate of change is the net change: \(\int_a^b F'(t)\,dt = F(b) - F(a)\). For motion along a line, \(\int_a^b v(t)\,dt\) is the displacement. The total distance traveled is \(\int_a^b |v(t)|\,dt\): split the interval where \(v\) changes sign and add the sizes of the pieces.`,
        example: R`\(v(t) = 2t - 4\) on \([0, 3]\): the displacement is \(\Big[t^{2} - 4t\Big]_{0}^{3} = -3\). The velocity changes sign at \(t = 2\); the two pieces are \(-4\) and \(1\), so the distance is \(4 + 1 = 5\).`,
      },
    ],
    vocab: [
      { term: 'antiderivative', def: R`A function \(F\) whose derivative is \(f\). The indefinite integral \(\int f(x)\,dx\) stands for all of them at once.` },
      { term: 'constant of integration', def: R`The \(+ C\) in an indefinite integral. It records that antiderivatives are only determined up to a constant.` },
      { term: 'initial condition', def: R`A known value such as \(f(0) = 3\), used to find the constant \(C\).` },
      { term: 'accumulation function', def: R`A function defined by an integral with a variable limit, such as \(g(x) = \int_a^x f(t)\,dt\).` },
      { term: 'displacement and distance', def: 'Displacement is the change in position (it can be negative). Distance traveled adds up all the motion, forward and backward.' },
    ],
    mistakes: [
      R`Leaving off \(+ C\) in an indefinite integral, or carrying it into a definite one.`,
      R`Using the power rule on \(\dfrac{1}{x}\). It would divide by zero: \(\int \dfrac{1}{x}\,dx = \ln|x| + C\).`,
      R`Sign slips with sine and cosine: \(\int \sin x\,dx = -\cos x + C\), but \(\int \cos x\,dx = \sin x + C\).`,
      R`Substituting the limits into the integrand instead of the antiderivative, or computing \(F(a) - F(b)\).`,
      R`Forgetting the chain-rule factor \(u'(x)\) when the upper limit is not simply \(x\).`,
      'Giving the displacement when the question asks for the total distance.',
    ],
  },

  examples: [
    {
      title: 'Rewrite, then integrate term by term',
      problem: R`Find \(\displaystyle\int \left(6x^{2} - \dfrac{4}{x^{3}} + 3\sqrt{x}\right)dx\).`,
      steps: [
        R`Rewrite every term as a power of \(x\): \(6x^{2} - 4x^{-3} + 3x^{1/2}\).`,
        R`Raise each exponent by 1 and divide by the new exponent: \(6 \cdot \dfrac{x^{3}}{3}\), \(\;-4 \cdot \dfrac{x^{-2}}{-2}\), \(\;3 \cdot \dfrac{x^{3/2}}{3/2}\).`,
        R`Simplify each term: \(2x^{3} + 2x^{-2} + 2x^{3/2}\). Then add \(C\).`,
        R`Check by differentiating: \(6x^{2} - 4x^{-3} + 3x^{1/2}\), which is the integrand.`,
      ],
      answer: R`\(2x^{3} + \dfrac{2}{x^{2}} + 2x^{3/2} + C\)`,
    },
    {
      title: 'An initial-value problem',
      problem: R`Find \(f\) if \(f'(x) = 6e^{x} - 4x\) and \(f(0) = 1\).`,
      steps: [
        R`Antidifferentiate: \(f(x) = 6e^{x} - 2x^{2} + C\).`,
        R`Use the point: \(f(0) = 6e^{0} - 0 + C = 6 + C\), because \(e^{0} = 1\).`,
        R`Set \(6 + C = 1\), so \(C = -5\).`,
      ],
      answer: R`\(f(x) = 6e^{x} - 2x^{2} - 5\)`,
    },
    {
      title: 'Evaluating a definite integral',
      problem: R`Evaluate \(\displaystyle\int_{1}^{4} \left(3\sqrt{x} + 2x\right)dx\).`,
      steps: [
        R`Find an antiderivative: \(3x^{1/2} \to 2x^{3/2}\) and \(2x \to x^{2}\), so \(F(x) = 2x^{3/2} + x^{2}\).`,
        R`\(F(4) = 2(8) + 16 = 32\) and \(F(1) = 2 + 1 = 3\).`,
        R`Subtract: \(F(4) - F(1) = 32 - 3\).`,
      ],
      answer: R`\(29\)`,
    },
    {
      title: 'Differentiating an integral with the chain rule',
      problem: R`Find \(\dfrac{d}{dx}\displaystyle\int_{0}^{x^{3}} \cos\left(t^{2}\right)dt\).`,
      steps: [
        R`Let \(u = x^{3}\). By the Fundamental Theorem (part 1), \(\dfrac{d}{du}\displaystyle\int_{0}^{u} \cos\left(t^{2}\right)dt = \cos\left(u^{2}\right)\).`,
        R`Chain rule: multiply by \(\dfrac{du}{dx} = 3x^{2}\).`,
        R`Substitute \(u = x^{3}\): \(\cos\left(u^{2}\right) = \cos\left(x^{6}\right)\).`,
      ],
      answer: R`\(3x^{2}\cos\left(x^{6}\right)\)`,
    },
    {
      title: 'Word problem: displacement and total distance',
      word: true,
      problem: R`A cart moves along a straight track with velocity \(v(t) = t^{2} - 4t + 3\) meters per second. Find its displacement and the total distance it travels from \(t = 0\) to \(t = 4\) seconds.`,
      steps: [
        R`An antiderivative of \(v\) is \(s(t) = \tfrac{1}{3}t^{3} - 2t^{2} + 3t\).`,
        R`Displacement: \(\int_{0}^{4} v(t)\,dt = s(4) - s(0) = \tfrac{64}{3} - 32 + 12 = \tfrac{4}{3}\) m.`,
        R`For the distance, find where the cart turns around: \(v(t) = (t - 1)(t - 3) = 0\) at \(t = 1\) and \(t = 3\). The velocity is negative between those times.`,
        R`Integrate over each piece: \(s(1) - s(0) = \tfrac{4}{3}\), \(\;s(3) - s(1) = -\tfrac{4}{3}\), \(\;s(4) - s(3) = \tfrac{4}{3}\).`,
        R`Add the sizes of the pieces: \(\tfrac{4}{3} + \tfrac{4}{3} + \tfrac{4}{3} = 4\) m.`,
      ],
      answer: R`Displacement \(\tfrac{4}{3}\) m; total distance \(4\) m.`,
      visual: {
        type: 'plot', x: [-0.5, 4.5], y: [-2, 4], fns: [{ f: cartV }], axisLabels: ['t (s)', 'v (m/s)'],
        shade: [{ f: cartV, from: 0, to: 1, color: 'a' }, { f: cartV, from: 1, to: 3, color: 'b' }, { f: cartV, from: 3, to: 4, color: 'a' }],
        alt: 'Graph of the velocity, a parabola that crosses the t-axis at t = 1 and t = 3. The regions above the axis from 0 to 1 and from 3 to 4, and the region below the axis from 1 to 3, are shaded. Each has area four thirds.',
      },
    },
  ],

  models: [
    {
      id: 'definite-integral',
      title: 'Evaluate a definite integral with the Fundamental Theorem',
      intro: 'Choose a quadratic and the limits of integration. The steps find an antiderivative, evaluate it at both limits and subtract.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -6, max: 6, value: 3 },
        { name: 'b', label: 'b (coefficient of x)', type: 'int', min: -8, max: 8, value: -2 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'lo', label: 'Lower limit', type: 'int', min: -4, max: 4, value: 0 },
        { name: 'hi', label: 'Upper limit', type: 'int', min: -4, max: 6, value: 2 },
      ],
      compute({ a, b, c, lo, hi }) {
        const coefs = [a, b, c];
        const F = antiPoly(coefs);
        const at = (x) => F.reduce((acc, co) => acc.mul(x).add(co), frac(0)); // exact value of F(x)
        const [Fhi, Flo] = [at(hi), at(lo)];
        const value = Fhi.sub(Flo);
        const f = (x) => polyEval(coefs, x);
        const [x0, x1] = [Math.min(lo, hi), Math.max(lo, hi)];
        const whole = integral(lo, hi, wrap(poly(coefs)));
        return {
          problem: R`Evaluate \(${whole}\).`,
          steps: [
            R`Find an antiderivative, term by term: \(F(x) = ${poly(F)}\). No \(+ C\) is needed, because it would cancel.`,
            R`Upper limit: \(F(${hi}) = ${Fhi.tex()}\).`,
            R`Lower limit: \(F(${lo}) = ${Flo.tex()}\).`,
            R`Subtract: \(F(${hi}) - F(${lo}) = ${Fhi.tex()} - ${paren(Flo)} = ${value.tex()}\).`,
          ],
          answer: R`\(${whole} = ${value.tex()}${value.isInt() ? '' : R` \approx ${num(value.value, { places: 3 })}`}\)`,
          note: lo > hi ? 'The lower limit is greater than the upper limit, so the result is the negative of the signed area between them.' : 'The result is the signed area between the graph and the x-axis. Regions below the axis count as negative.',
          visual: {
            type: 'plot', ...fit(f, x0 - 1, x1 + 1, { include: [0] }), fns: [{ f }], shade: [{ f, from: x0, to: x1 }],
            alt: `Graph of the function, with the region between the graph and the x-axis shaded from x = ${x0} to x = ${x1}.`,
          },
        };
      },
    },
    {
      id: 'ball-distance',
      title: 'Word problem: displacement and total distance',
      word: true,
      intro: 'A ball is thrown straight up. Change the launch speed and the length of time.',
      inputs: [
        { name: 'v0', label: 'Launch speed (m/s)', type: 'int', min: 5, max: 40, value: 20 },
        { name: 'T', label: 'Time (seconds)', type: 'number', min: 0.5, max: 8, step: 0.5, value: 3 },
      ],
      compute({ v0, T }) {
        const v = (t) => v0 - 10 * t;
        const s = (t) => v0 * t - 5 * t * t;
        const top = v0 / 10; // the ball stops rising here
        const [disp, up] = [s(T), s(Math.min(top, T))];
        const down = up - disp;
        const vTex = terms([[v0, ''], [-10, 't']]);
        const steps = [R`Displacement is the integral of the velocity: \(${integral(0, num(T), wrap(vTex), 't')} = \Big[${terms([[v0, 't'], [-5, 't^{2}']])}\Big]_{0}^{${num(T)}} = ${num(disp)}\) m.`];
        if (T <= top) steps.push(R`The velocity is never negative on \([0, ${num(T)}]\), so the ball only moves upward and the distance equals the displacement.`);
        else {
          steps.push(
            R`The velocity is \(0\) at \(t = ${num(top)}\), when the ball stops rising. Split the motion there.`,
            R`Going up: \(${integral(0, num(top), 'v(t)', 't')} = ${num(up)}\) m. Coming down: \(${integral(num(top), num(T), 'v(t)', 't')} = ${num(-down)}\) m, a distance of \(${num(down)}\) m.`,
            R`Total distance: \(${num(up)} + ${num(down)} = ${num(up + down)}\) m.`,
          );
        }
        return {
          problem: R`A ball is thrown straight up from the edge of a high cliff at ${v0} meters per second. Its velocity after \(t\) seconds is \(v(t) = ${vTex}\) meters per second. Find its displacement and the total distance it travels in the first ${num(T)} ${T === 1 ? 'second' : 'seconds'}.`,
          steps,
          answer: R`Displacement \(${num(disp)}\) m (${disp > 0 ? 'above' : disp < 0 ? 'below' : 'level with'} the starting point); total distance \(${num(up + down)}\) m.`,
          visual: {
            type: 'plot', ...fit(v, 0, T, { include: [0] }), fns: [{ f: v }], axisLabels: ['t (s)', 'v (m/s)'],
            shade: T <= top ? [{ f: v, from: 0, to: T }] : [{ f: v, from: 0, to: top, color: 'a' }, { f: v, from: top, to: T, color: 'b' }],
            alt: `Graph of the velocity, a line falling from ${v0} meters per second at time 0 to ${num(v(T))} at time ${num(T)}. The region between the line and the time axis is shaded${T > top ? ', above the axis while the ball rises and below it while the ball falls' : ''}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyPower, easyBasic, easyEvaluate],
    medium: [mediumRewrite, mediumIVP, mediumFTC1, mediumNetChange],
    hard: [hardDefinite, hardFTC1Chain, hardDistance],
    challenge: [challengeMotion, challengeAccumGraph, challengeRecover],
  },
};
