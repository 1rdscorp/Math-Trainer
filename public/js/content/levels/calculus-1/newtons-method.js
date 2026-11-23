import { R, q, frac, num, txt, poly, polyEval, polyDeriv, terms, round, checkAll, checkEqual, numDeriv, close, person } from '../../lib/index.js';
import { M, fit, fromBank } from './_shared.js';

// ───────────── Helpers ─────────────

const F4 = (v) => M(num(v, { fixed: 4 })); // every decimal answer is shown to 4 places
const r4 = (v) => round(v, 4);
const d6 = (v) => num(round(v, 6));
const ap = (v) => (Number.isInteger(round(v, 9)) ? `= ${num(round(v, 9))}` : `\\approx ${d6(v)}`); // "= 3" for an exact value, "≈ 0.4597" otherwise
const sci = (v) => {
  const e = Math.floor(Math.log10(v));
  return `${num(round(v / 10 ** e, 2))} \\times 10^{${e}}`;
};

/** Bisection: a root of g in [a, b] (g(a) and g(b) of opposite signs), to full double precision. */
function bisect(g, a, b) {
  let [lo, hi] = [a, b];
  const sLo = Math.sign(g(lo));
  for (let i = 0; i < 200 && hi - lo > 1e-15 * Math.max(1, Math.abs(lo)); i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(g(mid)) === sLo) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The iterates x₀, x₁, …, xₙ (stops early, and marks `fail`, at a horizontal tangent or a blow-up). */
function newton(f, df, x0, n) {
  const xs = [x0];
  let x = x0;
  for (let i = 0; i < n; i++) {
    const d = df(x);
    if (d === 0 || !Number.isFinite(d)) return Object.assign(xs, { fail: 'flat' });
    x -= f(x) / d;
    if (!Number.isFinite(x) || Math.abs(x) > 1e8) return Object.assign(xs, { fail: 'blowup' });
    xs.push(x);
  }
  return xs;
}

/** A second route to xₙ₊₁: where the tangent line at xₙ (slope from a numerical derivative) meets the x-axis, found by bisection on the line. */
function tangentCross(f, x0) {
  const m = numDeriv(f, x0, 1e-6);
  const L = (x) => f(x0) + m * (x - x0);
  const K = 2 * Math.abs(f(x0) / m) + 1;
  return bisect(L, x0 - K, x0 + K);
}
const checkIterates = (f, xs, tol = 1e-6) => checkAll(...xs.slice(1).map((x, i) => checkEqual(tangentCross(f, xs[i]), x, tol, `x${i + 1} by the tangent line`)));

/** Wrong numeric answers, rounded to 4 places and kept only when they are at least `gap` from the answer and from each other. */
function apart(right, list, gap = 0.002) {
  const seen = [r4(right)];
  const out = [];
  const fill = [0.1, -0.1, 0.25, -0.25, 0.5].map((d) => right + d);
  for (const w of [...list, ...fill]) {
    if (w == null) continue;
    const v = typeof w === 'object' ? w.value : w;
    if (!Number.isFinite(v) || Math.abs(v) > 1e5) continue;
    const rv = r4(v);
    if (seen.some((s) => Math.abs(s - rv) < gap)) continue;
    seen.push(rv);
    out.push(typeof w === 'object' ? { ...w, value: rv } : rv);
  }
  return out;
}
const SIGN_WHY = R`The formula subtracts: \(x_{n+1} = x_n - \dfrac{f(x_n)}{f'(x_n)}\). Adding the step moves away from the root.`;
const FLIP_WHY = R`The step is \(\dfrac{f(x_n)}{f'(x_n)}\): the function value over the slope, not the slope over the value.`;

// Polynomials with integer coefficients and a starting value near a root: x² − a, x³ − a, x³ + px + c.
function polyCase(rng) {
  const kind = rng.pick(['sq', 'cube', 'cubic']);
  if (kind === 'sq') {
    const a = rng.pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 17, 18, 19, 20, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 35, 37, 39, 40, 42, 45, 47, 50]);
    return { coefs: [1, 0, -a], x0: Math.round(Math.sqrt(a)), lo: 0, hi: 8 };
  }
  if (kind === 'cube') {
    const a = rng.pick([2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 15, 17, 19, 20, 22, 25, 26, 28, 30, 33, 35, 40, 45, 50, 60, 70, 80, 90, 100]);
    return { coefs: [1, 0, 0, -a], x0: Math.round(Math.cbrt(a)), lo: 0, hi: 5 };
  }
  let [p, c] = [0, 0];
  const f = (x) => x ** 3 + p * x + c;
  do {
    [p, c] = [rng.int(1, 6), rng.nonzero(-12, 12)];
  } while (Number.isInteger(round(bisect(f, -10, 10), 9))); // an integer root needs no approximating
  const r = bisect(f, -10, 10);
  let x0 = Math.round(r);
  if (f(x0) === 0) x0 += 1;
  return { coefs: [1, 0, p, c], x0, lo: -10, hi: 10 };
}
const asFns = (coefs) => ({ f: (x) => polyEval(coefs, x), df: (x) => polyEval(polyDeriv(coefs), x), tex: poly(coefs), dtex: poly(polyDeriv(coefs)) });

// ───────────── Easy ─────────────

function easyOneStep(rng) {
  const c = polyCase(rng);
  const { f, df, tex, dtex } = asFns(c.coefs);
  const x0 = c.x0;
  const [fv, dv] = [f(x0), df(x0)];
  const x1 = frac(x0 * dv - fv, dv);
  const wrong = apart(x1.value, [
    { value: x0 + fv / dv, why: SIGN_WHY },
    { value: x0 - dv / fv, why: FLIP_WHY },
    { value: -fv / dv, why: R`\(-\dfrac{f(x_0)}{f'(x_0)}\) is only the step. Add it to \(x_0 = ${x0}\).` },
    x0 - fv,
  ]);
  return q({
    prompt: R`Apply one step of Newton's method to \(f(x) = ${tex}\), starting at \(x_0 = ${x0}\). Give \(x_1\) rounded to 4 decimal places.`,
    correct: r4(x1.value),
    fmt: F4,
    wrong,
    solution: [
      R`\(f(${x0}) = ${fv}\), and \(f'(x) = ${dtex}\) gives \(f'(${x0}) = ${dv}\).`,
      R`\(x_1 = x_0 - \dfrac{f(x_0)}{f'(x_0)} = ${x0} - \dfrac{${fv}}{${dv}} = ${x1.tex()}\).`,
      R`Rounded to 4 decimal places, \(x_1 \approx ${num(x1.value, { fixed: 4 })}\).`,
    ],
    rule: 1,
    skill: 'one Newton step',
    check: () => checkAll(checkEqual(numDeriv(f, x0), dv, 1e-6, "f'(x0)"), checkIterates(f, [x0, x1.value])),
  });
}

// "Which function has the wanted number as its root?" Each entry: the prompt, the target number found
// independently, the right f, and wrong f's (TeX, function, note).
const SETUPS = [
  (rng) => {
    const a = rng.pick([2, 3, 5, 6, 7, 10, 11, 13, 15, 17, 19, 21, 23, 29, 31, 37, 41, 43]);
    return {
      ask: R`approximate \(\sqrt{${a}}\)`, target: Math.sqrt(a),
      right: [`x^{2} - ${a}`, (x) => x * x - a],
      wrong: [[`x^{2} + ${a}`, (x) => x * x + a, R`\(x^{2} + ${a}\) is never 0, so there is no root to find.`], [R`\sqrt{x} - ${a}`, (x) => Math.sqrt(x) - a, R`The root of \(\sqrt{x} - ${a}\) is \(x = ${a * a}\), not \(\sqrt{${a}}\).`], [`x^{2} - ${a * a}`, (x) => x * x - a * a], ['2x', (x) => 2 * x, "That is the derivative of the right function, which is used in the formula but is not the function itself."]],
    };
  },
  (rng) => {
    const a = rng.pick([2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 15, 20, 25, 30, 50, 100]);
    return {
      ask: R`approximate \(\sqrt[3]{${a}}\)`, target: Math.cbrt(a),
      right: [`x^{3} - ${a}`, (x) => x ** 3 - a],
      wrong: [[`x^{2} - ${a}`, (x) => x * x - a, R`That function has root \(\sqrt{${a}}\). A cube root needs \(x^{3}\).`], [R`\sqrt[3]{x} - ${a}`, (x) => Math.cbrt(x) - a, R`The root of \(\sqrt[3]{x} - ${a}\) is \(x = ${a ** 3}\).`], [`x^{3} + ${a}`, (x) => x ** 3 + a], ['3x^{2}', (x) => 3 * x * x]],
    };
  },
  (rng) => {
    const k = rng.int(2, 6);
    return {
      ask: R`solve \(e^{x} = ${k} - x\)`, target: bisect((x) => Math.exp(x) - (k - x), -5, 5),
      right: [`e^{x} + x - ${k}`, (x) => Math.exp(x) + x - k],
      wrong: [[`e^{x} - x - ${k}`, (x) => Math.exp(x) - x - k, R`Moving \(-x\) to the left side makes it \(+x\): \(e^{x} + x - ${k} = 0\).`], [`e^{x} + 1`, (x) => Math.exp(x) + 1, "That is the derivative of the right function. It is never 0."], [`e^{x} + x + ${k}`, (x) => Math.exp(x) + x + k], [`e^{x} - ${k}`, (x) => Math.exp(x) - k]],
    };
  },
  (rng) => {
    const k = rng.int(1, 4);
    const kx = terms([[k, 'x']]);
    return {
      ask: R`solve \(\cos x = ${kx}\)`, target: bisect((x) => Math.cos(x) - k * x, 0, 1.6),
      right: [terms([[1, '\\cos x'], [-k, 'x']]), (x) => Math.cos(x) - k * x],
      wrong: [[terms([[1, '\\cos x'], [k, 'x']]), (x) => Math.cos(x) + k * x, R`Subtract \(${kx}\) from both sides: \(${terms([[1, '\\cos x'], [-k, 'x']])} = 0\).`], [terms([[-1, '\\sin x'], [-k, '']]), (x) => -Math.sin(x) - k, "That is the derivative of the right function, not the function."], [terms([[1, '\\sin x'], [-k, 'x']]), (x) => Math.sin(x) - k * x]],
    };
  },
  (rng) => {
    const k = rng.int(2, 5);
    return {
      ask: R`solve \(\ln x = ${k} - x\)`, target: bisect((x) => Math.log(x) - (k - x), 0.1, 10),
      right: [R`\ln x + x - ${k}`, (x) => Math.log(x) + x - k],
      wrong: [[R`\ln x - x - ${k}`, (x) => Math.log(x) - x - k, R`Moving \(-x\) to the left side makes it \(+x\).`], [R`\dfrac{1}{x} + 1`, (x) => 1 / x + 1, "That is the derivative of the right function, not the function."], [R`\ln x + x + ${k}`, (x) => Math.log(x) + x + k], [R`\ln x - ${k}`, (x) => Math.log(x) - k]],
    };
  },
];

function easySetUp(rng) {
  const s = rng.pick(SETUPS)(rng);
  const fx = (tex) => M(`f(x) = ${tex}`);
  return q({
    prompt: R`To ${s.ask} with Newton's method, which function's root should the method find?`,
    correct: fx(s.right[0]),
    wrong: s.wrong.map(([t, , why]) => (why ? { value: fx(t), why } : fx(t))),
    solution: [
      'Newton\'s method finds a root of a function, so rewrite the goal as an equation with 0 on one side.',
      R`Here that gives \(${s.right[0]} = 0\), so use \(f(x) = ${s.right[0]}\).`,
      'Check: the number wanted makes this function 0, and no other choice does.',
    ],
    rule: 2,
    skill: 'setting up f',
    check: () => checkAll(Math.abs(s.right[1](s.target)) < 1e-9 ? true : 'the right function does not vanish at the target', ...s.wrong.map(([, g], i) => (Math.abs(g(s.target)) > 1e-3 ? true : `wrong choice ${i + 1} also vanishes at the target`))),
  });
}

// Graph cases: f(x) = (x − h)ⁿ − a with an integer start whose tangent line meets the axis at a multiple of 1/2.
const GRAPH_CASES = (() => {
  const out = [];
  for (const n of [2, 3]) {
    for (let a = 2; a <= 30; a++) {
      if (Math.round(a ** (1 / n)) ** n === a) continue;
      for (let u = 1; u <= 5; u++) {
        const t1 = u - (u ** n - a) / (n * u ** (n - 1));
        const dist = Math.abs(t1 - u);
        if (Math.abs(2 * t1 - Math.round(2 * t1)) > 1e-9 || dist < 0.5 || dist > 2.5 || t1 <= 0) continue;
        const r = a ** (1 / n);
        if (Math.abs(r - t1) < 0.06 || Math.abs(u ** n - a) > 14 || Math.abs(t1 - r) >= Math.abs(u - r)) continue;
        out.push({ n, a, u, t1 });
      }
    }
  }
  return out;
})();

function easyGraph(rng) {
  const g = rng.pick(GRAPH_CASES);
  const h = rng.int(-2, 2);
  const flip = rng.bool(0.3) ? -1 : 1;
  const f = (x) => flip * ((x - h) ** g.n - g.a);
  const [x0, x1] = [g.u + h, g.t1 + h];
  const root = h + g.a ** (1 / g.n);
  const [y0, m] = [f(x0), numDeriv(f, x0)];
  const yInt = y0 - m * x0;
  const lo = Math.floor(Math.min(x0, x1, root)) - 1;
  const hi = Math.ceil(Math.max(x0, x1, root)) + 1;
  const tan = (x) => y0 + m * (x - x0);
  const win = fit([f, tan], lo, hi, { cap: [-16, 16], minPad: 0.6 });
  const yStep = win.y[1] - win.y[0] > 16 ? 4 : 2;
  return q({
    prompt: R`The graph shows a function \(f\) and its tangent line at the starting value \(x_0 = ${x0}\). Newton's method is used to find the root of \(f\) near there. Use the graph to find \(x_1\).`,
    correct: x1,
    fmt: (v) => M(num(v)),
    wrong: apart(x1, [
      { value: 2 * x0 - x1, why: R`\(x_1\) is where the tangent line meets the x-axis. It lies toward the root, not the same distance on the other side of \(x_0\).` },
      { value: round(root, 2), why: R`That is roughly where the curve itself crosses the x-axis, the root being searched for. \(x_1\) is where the tangent line crosses.` },
      { value: round(yInt, 2), why: 'That is where the tangent line crosses the y-axis. Newton\'s method uses where it crosses the x-axis.' },
      x0,
    ], 0.04),
    solution: [
      R`Newton's method replaces the curve by its tangent line at \(x_0 = ${x0}\) and follows the line down to the x-axis.`,
      R`The dashed tangent line crosses the x-axis at \(x = ${num(x1)}\).`,
      R`So \(x_1 = ${num(x1)}\). (The root itself is at about \(${num(round(root, 3))}\); \(x_1\) is closer to it than \(x_0\) is.)`,
    ],
    rule: 0,
    skill: 'reading a step from a graph',
    visual: {
      type: 'plot',
      ...win,
      step: [0.5, yStep],
      fns: [{ f }, { f: tan, color: 'b', dashed: true, domain: [Math.min(x0, x1) - 0.8, Math.max(x0, x1) + 0.8] }],
      points: [{ x: x0, y: y0, label: 'x₀' }, { x: x1, y: 0, color: 'b', label: 'x₁' }],
      alt: `Graph of y = f(x), which crosses the x-axis near x = ${txt(round(root, 2))}. The dashed tangent line touches the curve at (${txt(x0)}, ${txt(round(y0, 3))}), has slope ${txt(round(m, 3))}, and crosses the x-axis at x = ${txt(x1)}. Grid lines on the x-axis are every 0.5.`,
    },
    check: () => checkAll(checkEqual(tangentCross(f, x0), x1, 1e-6, 'x-intercept of the tangent'), checkEqual(f(bisect(f, root - 0.3, root + 0.3)), 0, 1e-9, 'root')),
  });
}

// ───────────── Medium ─────────────

function mediumTwoSteps(rng) {
  const c = polyCase(rng);
  const { f, df, tex, dtex } = asFns(c.coefs);
  const xs = newton(f, df, c.x0, 2);
  const [x0, x1, x2] = xs;
  const x1f = frac(x0 * df(x0) - f(x0), df(x0));
  const slipped = newton(f, (x) => -df(x), x0, 2)[2];
  const root = bisect(f, c.lo, c.hi);
  return q({
    prompt: R`Use Newton's method with \(x_0 = ${x0}\) to approximate a root of \(f(x) = ${tex}\). Find \(x_2\), keeping full accuracy in \(x_1\) and rounding \(x_2\) to 4 decimal places.`,
    correct: r4(x2),
    fmt: F4,
    wrong: apart(x2, [
      { value: x1, why: R`That is \(x_1\). Apply the formula once more, now at \(x_1\).` },
      { value: x1 - f(x1) / df(x0), why: R`The second step needs the slope at \(x_1\): \(f'(x_1)\), not \(f'(x_0)\).` },
      { value: x0 - f(x1) / df(x1), why: R`The second step starts from \(x_1\): \(x_2 = x_1 - \dfrac{f(x_1)}{f'(x_1)}\).` },
      { value: slipped, why: SIGN_WHY },
    ]),
    solution: [
      R`\(f'(x) = ${dtex}\). First step: \(x_1 = ${x0} - \dfrac{${f(x0)}}{${df(x0)}} = ${x1f.tex()} \approx ${d6(x1)}\).`,
      R`At \(x_1\): \(f(x_1) \approx ${d6(f(x1))}\) and \(f'(x_1) \approx ${d6(df(x1))}\).`,
      R`Second step: \(x_2 = x_1 - \dfrac{f(x_1)}{f'(x_1)} \approx ${d6(x2)}\).`,
      R`Rounded: \(x_2 \approx ${num(x2, { fixed: 4 })}\). (The root is \(${num(root, { fixed: 6 })}\) to 6 places.)`,
    ],
    rule: 1,
    skill: 'two Newton steps',
    check: () => checkAll(checkIterates(f, xs), Math.abs(x2 - root) < Math.abs(x0 - root) && Math.abs(f(root)) < 1e-9 ? true : 'x2 is not closer to the root than x0'),
  });
}

// Equations to rewrite as f(x) = 0. Each gives the equation, f and f′ (TeX and functions), starts, and two slips
// with their own (wrong) step functions.
const EQUATIONS = [
  (rng) => {
    const k = rng.int(2, 6);
    return {
      eq: R`e^{x} = ${k} - x`, tex: `e^{x} + x - ${k}`, dtex: 'e^{x} + 1', f: (x) => Math.exp(x) + x - k, df: (x) => Math.exp(x) + 1, x0: rng.pick([0, 1]),
      slips: [[(x) => Math.exp(x) - x - k, (x) => Math.exp(x) - 1, R`Moving \(-x\) to the left side makes it \(+x\): \(f(x) = e^{x} + x - ${k}\).`], [(x) => Math.exp(x) + x - k, (x) => Math.exp(x), R`The derivative of \(x\) is 1: \(f'(x) = e^{x} + 1\).`]],
    };
  },
  (rng) => {
    const k = rng.int(1, 3);
    const kx = terms([[k, 'x']]);
    return {
      eq: R`\cos x = ${kx}`, tex: terms([[1, '\\cos x'], [-k, 'x']]), dtex: terms([[-1, '\\sin x'], [-k, '']]), f: (x) => Math.cos(x) - k * x, df: (x) => -Math.sin(x) - k, x0: rng.pick(k === 1 ? [0.5, 1] : [0.5, 1, 0]), radians: true,
      slips: [[(x) => Math.cos(x) - k * x, (x) => Math.sin(x) - k, R`The derivative of \(\cos x\) is \(-\sin x\).`], [(x) => Math.cos((x * Math.PI) / 180) - k * x, (x) => -Math.sin((x * Math.PI) / 180) - k, 'Calculus formulas for cos and sin use radians. Set the calculator to radian mode.']],
    };
  },
  (rng) => {
    const k = rng.int(2, 4);
    return {
      eq: R`\ln x = ${k} - x`, tex: R`\ln x + x - ${k}`, dtex: R`\dfrac{1}{x} + 1`, f: (x) => Math.log(x) + x - k, df: (x) => 1 / x + 1, x0: rng.pick([1, 2, 3].filter((v) => v <= k)),
      slips: [[(x) => Math.log(x) + x - k, () => 1, R`The derivative of \(\ln x\) is \(\dfrac{1}{x}\), so \(f'(x) = \dfrac{1}{x} + 1\).`], [(x) => Math.log(x) - x - k, (x) => 1 / x - 1, R`Moving \(-x\) to the left side makes it \(+x\).`]],
    };
  },
  (rng) => {
    const k = rng.int(1, 3);
    const kx = terms([[k, 'x']]);
    return {
      eq: R`e^{-x} = ${kx}`, tex: terms([[1, 'e^{-x}'], [-k, 'x']]), dtex: terms([[-1, 'e^{-x}'], [-k, '']]), f: (x) => Math.exp(-x) - k * x, df: (x) => -Math.exp(-x) - k, x0: rng.pick([0, 0.5, 1]),
      slips: [[(x) => Math.exp(-x) - k * x, (x) => Math.exp(-x) - k, R`By the chain rule the derivative of \(e^{-x}\) is \(-e^{-x}\).`], [(x) => Math.exp(-x) + k * x, (x) => -Math.exp(-x) + k, R`Subtract \(${kx}\) from both sides: \(f(x) = ${terms([[1, 'e^{-x}'], [-k, 'x']])}\).`]],
    };
  },
];

function mediumEquation(rng) {
  const e = rng.pick(EQUATIONS)(rng);
  const x0 = e.x0;
  const [fv, dv] = [e.f(x0), e.df(x0)];
  const x1 = x0 - fv / dv;
  const slipStep = ([g, dg, why]) => ({ value: x0 - g(x0) / dg(x0), why });
  return q({
    prompt: R`Use one step of Newton's method, starting at \(x_0 = ${num(x0)}\), to approximate the solution of \(${e.eq}\)${e.radians ? ' (x in radians)' : ''}. Give \(x_1\) rounded to 4 decimal places.`,
    correct: r4(x1),
    fmt: F4,
    wrong: apart(x1, [slipStep(e.slips[0]), slipStep(e.slips[1]), { value: x0 + fv / dv, why: SIGN_WHY }, x0 - dv / fv]),
    solution: [
      R`Move everything to one side: \(f(x) = ${e.tex}\), so \(f'(x) = ${e.dtex}\).`,
      R`\(f(${num(x0)}) ${ap(fv)}\) and \(f'(${num(x0)}) ${ap(dv)}\).`,
      R`\(x_1 = ${num(x0)} - \dfrac{${d6(fv)}}{${d6(dv)}} ${ap(x1)}\), which rounds to \(${num(x1, { fixed: 4 })}\).`,
    ],
    rule: 2,
    skill: 'Newton step for an equation',
    check: () => checkAll(checkIterates(e.f, [x0, x1]), checkEqual(numDeriv(e.f, x0), dv, 1e-6, "f'(x0)")),
  });
}

// Bakery break-even: P(x) = −x³ + bx² − c (hundreds of dollars, x hundred loaves). Interest: three yearly deposits.
function mediumWord(rng) {
  const who = person(rng);
  if (rng.bool()) {
    let [b, c, root, x0] = [0, 0, 0, 0];
    const P = (x) => -(x ** 3) + b * x * x - c;
    const dP = (x) => -3 * x * x + 2 * b * x;
    do {
      b = rng.int(4, 9);
      c = rng.int(2, 20);
      root = P((2 * b) / 3) > 0 ? bisect(P, 0, (2 * b) / 3) : 0;
      x0 = Math.max(1, Math.round(root));
    } while (root < 0.6 || dP(x0) === 0 || P(x0) === 0);
    const x1 = x0 - P(x0) / dP(x0);
    return q({
      prompt: R`${who}'s bakery has weekly profit \(P(x) = ${poly([-1, b, 0, -c])}\) hundred dollars when it bakes \(x\) hundred loaves. Break-even is the smallest positive \(x\) with \(P(x) = 0\). Starting from \(x_0 = ${x0}\), find the next Newton estimate \(x_1\), rounded to 4 decimal places.`,
      correct: r4(x1),
      fmt: F4,
      wrong: apart(x1, [{ value: x0 + P(x0) / dP(x0), why: SIGN_WHY }, { value: x0 - dP(x0) / P(x0), why: FLIP_WHY }, { value: x0 - P(x0) / (-3 * x0 * x0 + b * x0), why: R`The derivative of \(${b}x^{2}\) is \(${2 * b}x\).` }]),
      solution: [
        R`\(P'(x) = ${poly([-3, 2 * b, 0])}\). At \(x_0 = ${x0}\): \(P(${x0}) = ${P(x0)}\) and \(P'(${x0}) = ${dP(x0)}\).`,
        R`\(x_1 = ${x0} - \dfrac{${P(x0)}}{${dP(x0)}} = ${frac(x0 * dP(x0) - P(x0), dP(x0)).tex()} \approx ${num(x1, { fixed: 4 })}\).`,
        R`So break-even is near ${txt(round(100 * x1, 0))} loaves (the exact root is \(${num(root, { fixed: 4 })}\) hundred).`,
      ],
      rule: 1,
      skill: 'Newton word problem',
      check: () => checkAll(checkIterates(P, [x0, x1]), Math.abs(x1 - root) < Math.abs(x0 - root) + 1e-12 ? true : 'x1 moved away from break-even'),
    });
  }
  const D = rng.pick([500, 1000, 2000]);
  const rate = rng.int(3, 9) + rng.pick([0, 0.25, 0.5, 0.75]);
  const B = Math.round((D * [1, 2, 3].reduce((s, k) => s + (1 + rate / 100) ** k, 0)) / 10) * 10;
  const k = B / D;
  const f = (x) => x ** 3 + x * x + x - k;
  const df = (x) => 3 * x * x + 2 * x + 1;
  const x0 = 1.05;
  const x1 = x0 - f(x0) / df(x0);
  const trueX = bisect(f, 1, 1.5);
  return q({
    prompt: R`${who} deposits $${txt(D)} at the start of each year for 3 years. At the end of the third year the account holds $${txt(B)}. The growth factor \(x = 1 + r\) satisfies \(x^{3} + x^{2} + x = ${num(k)}\). Starting from \(x_0 = 1.05\) (a 5% guess), find \(x_1\), rounded to 4 decimal places.`,
    correct: r4(x1),
    fmt: F4,
    wrong: apart(x1, [{ value: x0 + f(x0) / df(x0), why: SIGN_WHY }, { value: x0 - f(x0) / (3 * x0 * x0), why: R`Differentiate every term: \(f'(x) = 3x^{2} + 2x + 1\).` }, { value: x0 - f(x0), why: R`Divide the value \(f(x_0)\) by the slope \(f'(x_0)\) before subtracting.` }]),
    solution: [
      R`Write \(f(x) = x^{3} + x^{2} + x - ${num(k)}\), so \(f'(x) = 3x^{2} + 2x + 1\).`,
      R`\(f(1.05) \approx ${d6(f(x0))}\) and \(f'(1.05) = ${d6(df(x0))}\).`,
      R`\(x_1 = 1.05 - \dfrac{${d6(f(x0))}}{${d6(df(x0))}} \approx ${num(x1, { fixed: 4 })}\), an interest rate of about \(${num(round(100 * (x1 - 1), 2))}\%\).`,
    ],
    rule: 2,
    skill: 'Newton word problem',
    // The rate the iteration is heading for really produces the final balance.
    check: () => checkAll(checkIterates(f, [x0, x1]), Math.abs(D * (trueX + trueX ** 2 + trueX ** 3) - B) < 1e-6 ? true : 'balance not reproduced', Math.abs(x1 - trueX) < 0.003 ? true : 'x1 far from the true factor'),
  });
}

// ───────────── Hard ─────────────

const OUTCOMES = {
  flat: R`\(x_1\) cannot be found: \(f'(x_0) = 0\), so the tangent line is horizontal and never meets the x-axis`,
  diverge: 'The iterates move farther and farther from the root: the method diverges',
  other: 'The iterates converge, but to a root farther from the start than the nearest root',
  cycle: 'The iterates bounce between two values forever',
  good: 'The iterates converge quickly to the root nearest the start',
};

// Situations, each with the function as TeX and JS, its derivative, its roots, and a start.
const SITUATIONS = [
  (rng) => { const c = rng.pick([-1, 1, 3, -3]); const x0 = rng.pick([1, -1]); return { tex: poly([1, 0, -3, c]), f: (x) => x ** 3 - 3 * x + c, df: (x) => 3 * x * x - 3, x0, roots: [] }; },
  (rng) => { const a = rng.pick([1, 2, 3]); return { tex: poly([1, -2 * a, a * a - 1]), f: (x) => x * x - 2 * a * x + a * a - 1, df: (x) => 2 * x - 2 * a, x0: a, roots: [a - 1, a + 1] }; },
  (rng) => ({ tex: R`\sqrt[3]{x}`, f: Math.cbrt, df: (x) => 1 / (3 * Math.cbrt(x) ** 2), x0: rng.pick([1, 2, -1, 0.5, 3]), roots: [0] }),
  (rng) => ({ tex: R`\arctan x`, f: Math.atan, df: (x) => 1 / (1 + x * x), x0: rng.pick([1.5, 2, 3, -1.5, -2]), roots: [0] }),
  (rng) => ({ tex: R`xe^{-x}`, f: (x) => x * Math.exp(-x), df: (x) => (1 - x) * Math.exp(-x), x0: rng.pick([2, 3, 4]), roots: [0] }),
  (rng) => { const c = rng.pick([1, 2]); return { tex: poly([1, 0, -5 * c * c, 0]), f: (x) => x ** 3 - 5 * c * c * x, df: (x) => 3 * x * x - 5 * c * c, x0: rng.pick([c, -c]), roots: [-Math.sqrt(5) * c, 0, Math.sqrt(5) * c] }; },
  () => ({ tex: poly([1, 0, -2, 2]), f: (x) => x ** 3 - 2 * x + 2, df: (x) => 3 * x * x - 2, x0: 0, roots: [bisect((x) => x ** 3 - 2 * x + 2, -3, -1)] }),
  (rng) => ({ tex: poly([1, 0, -1, 0]), f: (x) => x ** 3 - x, df: (x) => 3 * x * x - 1, x0: rng.pick([0.5, -0.5, 0.55, -0.55]), roots: [-1, 0, 1] }),
  (rng) => ({ tex: R`\sin x`, f: Math.sin, df: Math.cos, x0: rng.pick([1.2, 1.4, 1.8]), roots: [-Math.PI, 0, Math.PI, 2 * Math.PI] }),
  (rng) => { const a = rng.pick([2, 3, 5, 7, 10]); const x0 = rng.pick([1, 2, 3]); return { tex: `x^{2} - ${a}`, f: (x) => x * x - a, df: (x) => 2 * x, x0, roots: [-Math.sqrt(a), Math.sqrt(a)] }; },
];

/** Classify what Newton's method does from x0 by running it with the derivative df. */
function classify(s, df) {
  if (Math.abs(df(s.x0)) < 1e-6) return 'flat';
  const xs = newton(s.f, df, s.x0, 40);
  if (xs.fail) return 'diverge';
  if (Math.abs(xs[2] - xs[0]) < 1e-6 && Math.abs(xs[1] - xs[0]) > 0.1) return 'cycle';
  const end = xs[xs.length - 1];
  if (!s.roots.some((r) => Math.abs(end - r) < 1e-6)) return 'diverge';
  const nearest = s.roots.reduce((b, r) => (Math.abs(r - s.x0) < Math.abs(b - s.x0) ? r : b), s.roots[0]);
  return Math.abs(end - nearest) < 1e-6 ? 'good' : 'other';
}

function hardFailure(rng) {
  const s = rng.pick(SITUATIONS)(rng);
  const kind = classify(s, s.df);
  const tex = s.tex;
  const xs = newton(s.f, s.df, s.x0, 3);
  const shown = xs.slice(1).map((x, i) => R`\(x_{${i + 1}} ${Number.isInteger(round(x, 9)) ? '=' : '\\approx'} ${num(round(x, 4))}\)`).join(', ');
  const others = Object.keys(OUTCOMES).filter((k) => k !== kind);
  const pickW = rng.shuffle(others).slice(0, 3);
  return q({
    prompt: R`Newton's method is applied to \(f(x) = ${tex}\) with \(x_0 = ${num(s.x0)}\). What happens?`,
    correct: OUTCOMES[kind],
    wrong: pickW.map((k) => OUTCOMES[k]),
    solution: [
      R`\(f'(${num(s.x0)}) = ${num(round(s.df(s.x0), 4))}\).`,
      kind === 'flat' ? R`The tangent line at \(x_0\) is horizontal, so the formula would divide by 0. Choose a different start.` : R`Running the formula: ${shown}.`,
      {
        flat: 'No iterate can be computed from this start.',
        diverge: 'The iterates grow in size instead of settling, so the method diverges. A start closer to the root is needed (if one works at all).',
        other: R`The first tangent line is nearly flat, so \(x_1\) lands far away, and the method then settles on a different root.`,
        cycle: R`\(x_2 = x_0\), so the same two values repeat forever.`,
        good: 'The iterates settle quickly on the nearest root.',
      }[kind],
    ],
    rule: 3,
    skill: 'when Newton\'s method fails',
    // The same outcome with a numerical derivative, and the first step confirmed by the tangent line.
    check: () => checkAll(kind === classify(s, (x) => numDeriv(s.f, x)) ? true : 'classification is not stable', kind === 'flat' ? true : checkIterates(s.f, xs.slice(0, 2), 1e-5)),
  });
}

// Root to 4 decimal places, starting from a point of the student's choosing in a bracket.
const ROOT_EQ = [
  (rng) => { const [p, c] = [rng.int(1, 5), rng.int(3, 30)]; return { eq: `x^{3} + ${terms([[p, 'x']])} = ${c}`, f: (x) => x ** 3 + p * x - c, df: (x) => 3 * x * x + p, dtex: `3x^{2} + ${p}`, ftex: `x^{3} + ${terms([[p, 'x'], [-c, '']])}`, slip: (x) => x ** 3 - p * x - c, sdf: (x) => 3 * x * x - p }; },
  (rng) => { const k = rng.int(2, 6); return { eq: `e^{x} = ${k} - x`, f: (x) => Math.exp(x) + x - k, df: (x) => Math.exp(x) + 1, dtex: 'e^{x} + 1', ftex: `e^{x} + x - ${k}`, slip: (x) => Math.exp(x) - x - k, sdf: (x) => Math.exp(x) - 1 }; },
  (rng) => { const k = rng.int(1, 3); return { eq: R`\cos x = ${terms([[k, 'x']])}`, f: (x) => Math.cos(x) - k * x, df: (x) => -Math.sin(x) - k, dtex: terms([[-1, '\\sin x'], [-k, '']]), ftex: terms([[1, '\\cos x'], [-k, 'x']]), radians: true }; },
  (rng) => { const k = rng.int(2, 9); return { eq: `xe^{x} = ${k}`, f: (x) => x * Math.exp(x) - k, df: (x) => (x + 1) * Math.exp(x), dtex: '(x + 1)e^{x}', ftex: `xe^{x} - ${k}` }; },
];

function hardRoot(rng) {
  let [e, root] = [null, 0];
  do {
    e = rng.pick(ROOT_EQ)(rng);
    root = bisect(e.f, -1, 8);
  } while (Math.abs(root - r4(root)) > 4.5e-5); // not on the edge of a rounding
  const a = Math.floor(root);
  const x0 = a + 1;
  const xs = newton(e.f, e.df, x0, 8);
  let n = 1;
  while (n < xs.length - 1 && r4(xs[n]) !== r4(xs[n - 1])) n++;
  const slipRun = e.slip ? newton(e.slip, e.sdf, x0, 40) : null;
  const slipRoot = slipRun && !slipRun.fail && Math.abs(e.slip(slipRun[slipRun.length - 1])) < 1e-9 ? slipRun[slipRun.length - 1] : null;
  return q({
    prompt: R`The equation \(${e.eq}\)${e.radians ? ' (x in radians)' : ''} has exactly one solution, and it lies between \(${a}\) and \(${a + 1}\). Use Newton's method to find it to 4 decimal places.`,
    correct: r4(root),
    fmt: F4,
    wrong: apart(root, [
      { value: xs[1], why: R`That is only \(x_1\). Keep going until two iterates agree to 4 decimal places.` },
      slipRoot != null ? { value: slipRoot, why: R`That solves a different equation. Move every term to one side: \(f(x) = ${e.ftex}\).` } : null,
      { value: a + 0.5, why: 'That is the midpoint of the interval, one step of bisection, not the solution.' },
      xs[2],
    ]),
    solution: [
      R`Let \(f(x) = ${e.ftex}\), so \(f'(x) = ${e.dtex}\). Start at the right end, \(x_0 = ${x0}\).`,
      R`Iterates: ${xs.slice(1, n + 1).map((x, i) => R`\(x_{${i + 1}} \approx ${num(x, { fixed: 6 })}\)`).join(', ')}.`,
      R`\(x_{${n - 1}}\) and \(x_{${n}}\) agree to 4 decimal places, so the solution is \(x \approx ${num(root, { fixed: 4 })}\).`,
    ],
    rule: 1,
    skill: 'iterating to 4 decimal places',
    check: () => checkAll(checkIterates(e.f, xs.slice(0, 3)), r4(xs[n]) === r4(root) ? true : 'Newton disagrees with bisection at 4 places', Math.abs(root - r4(root)) < 4.9e-5 ? true : 'root too close to a rounding boundary'),
  });
}

function hardWord(rng) {
  const who = person(rng);
  if (rng.bool(0.6)) {
    const Rr = rng.pick([6, 8, 10, 12]);
    const s = rng.pick([0.2, 0.25, 0.3, 0.35, 0.4, 0.6, 0.65, 0.7, 0.75, 0.8]);
    const c = 4 * s * Rr ** 3;
    const f = (h) => h ** 3 - 3 * Rr * h * h + c;
    const df = (h) => 3 * h * h - 6 * Rr * h;
    const xs = newton(f, df, Rr, 2);
    const root = bisect(f, 0, 2 * Rr);
    const volCheck = (Math.PI * root * root * (3 * Rr - root)) / 3 - s * (4 / 3) * Math.PI * Rr ** 3;
    return q({
      prompt: R`${who} floats a wooden ball of radius ${Rr} cm in water. The wood is ${txt(s)} times as dense as water, so the depth \(h\) (cm) of the submerged part satisfies \(h^{3} - ${3 * Rr}h^{2} + ${num(c)} = 0\), with \(0 < h < ${2 * Rr}\). Starting at \(h_0 = ${Rr}\), find \(h_2\) by Newton's method, rounded to 4 decimal places.`,
      correct: r4(xs[2]),
      fmt: (v) => R`${F4(v)} cm`,
      wrong: apart(xs[2], [
        { value: xs[1], why: R`That is \(h_1\). One more step is needed.` },
        { value: xs[1] - f(xs[1]) / df(Rr), why: R`Use the slope at \(h_1\) for the second step, not the slope at \(h_0\).` },
        { value: newton(f, (h) => -df(h), Rr, 2)[2], why: SIGN_WHY },
      ]),
      solution: [
        R`\(f(h) = h^{3} - ${3 * Rr}h^{2} + ${num(c)}\) and \(f'(h) = 3h^{2} - ${6 * Rr}h\).`,
        R`\(h_1 = ${Rr} - \dfrac{f(${Rr})}{f'(${Rr})} = ${Rr} - \dfrac{${num(f(Rr))}}{${num(df(Rr))}} ${ap(xs[1])}\).`,
        R`\(h_2 = h_1 - \dfrac{f(h_1)}{f'(h_1)} \approx ${d6(xs[1])} - \dfrac{${d6(f(xs[1]))}}{${d6(df(xs[1]))}} \approx ${num(xs[2], { fixed: 4 })}\).`,
        R`The ball floats with about ${txt(round(xs[2], 2))} cm under water${s < 0.5 ? ', less than its radius, as a light wood should' : ', more than its radius, as a dense wood should'}.`,
      ],
      rule: 1,
      skill: 'Newton word problem',
      check: () => checkAll(checkIterates(f, xs), Math.abs(volCheck) < 1e-6 ? true : 'displaced volume does not match', Math.abs(xs[2] - root) < 0.01 ? true : 'h2 not near the depth'),
    });
  }
  const n = rng.int(4, 5);
  const D = rng.pick([1000, 2000, 2500]);
  const rate = rng.int(3, 8);
  const B = Math.round((D * Array.from({ length: n }, (_, i) => (1 + rate / 100) ** (i + 1)).reduce((a, b) => a + b, 0)) / 100) * 100;
  const k = B / D;
  const pw = Array.from({ length: n }, (_, i) => n - i);
  const f = (x) => pw.reduce((s, p) => s + x ** p, 0) - k;
  const df = (x) => pw.reduce((s, p) => s + p * x ** (p - 1), 0);
  const xs = newton(f, df, 1, 2);
  const lhs = pw.map((p) => power1(p)).join(' + ');
  const dl = pw.map((p) => (p === 1 ? '1' : `${p}${power1(p - 1)}`)).join(' + ');
  const trueX = bisect(f, 1, 1.5);
  return q({
    prompt: R`${who} deposits $${txt(D)} at the start of each year for ${n} years and has $${txt(B)} at the end. The growth factor \(x = 1 + r\) satisfies \(${lhs} = ${num(k)}\). Start Newton's method at \(x_0 = 1\) and find \(x_2\), rounded to 4 decimal places.`,
    correct: r4(xs[2]),
    fmt: F4,
    wrong: apart(xs[2], [
      { value: xs[1], why: R`That is \(x_1\). Apply the formula once more.` },
      { value: xs[1] - f(xs[1]) / df(1), why: R`The second step needs \(f'(x_1)\), not \(f'(x_0)\).` },
      { value: newton(f, (x) => -df(x), 1, 2)[2], why: SIGN_WHY },
    ]),
    solution: [
      R`\(f(x) = ${lhs} - ${num(k)}\) and \(f'(x) = ${dl}\).`,
      R`\(x_1 = 1 - \dfrac{f(1)}{f'(1)} = 1 - \dfrac{${num(round(f(1), 6))}}{${df(1)}} ${ap(xs[1])}\).`,
      R`\(x_2 = x_1 - \dfrac{f(x_1)}{f'(x_1)} \approx ${num(xs[2], { fixed: 4 })}\): an interest rate of about \(${num(round(100 * (xs[2] - 1), 2))}\%\).`,
    ],
    rule: 2,
    skill: 'Newton word problem',
    check: () => checkAll(checkIterates(f, xs), Math.abs(Array.from({ length: n }, (_, i) => D * trueX ** (i + 1)).reduce((a, b) => a + b, 0) - B) < 1e-6 ? true : 'balance not reproduced'),
  });
}
const power1 = (p) => (p === 1 ? 'x' : `x^{${p}}`);

// ───────────── Challenge ─────────────

function challengeCompare(rng) {
  const kind = rng.pick(['count', 'count', 'bracket', 'bank']);
  if (kind === 'count') {
    const L = rng.pick([1, 2, 4, 0.5, 3]);
    const k = rng.pick([3, 4, 5, 6]);
    let n = 0;
    while (L / 2 ** n >= 10 ** -k) n++;
    return q({
      prompt: R`The bisection method starts with an interval of length \(${num(L)}\) on which \(f\) changes sign, and halves it at each step. How many steps are needed before the interval is shorter than \(10^{-${k}}\)? (Newton's method from a good start usually needs only 3 or 4 steps for this accuracy.)`,
      correct: n,
      wrong: [{ value: n - 1, why: R`After \(${n - 1}\) steps the length is \(${num(L)}/2^{${n - 1}} \approx ${sci(L / 2 ** (n - 1))}\), which is not yet below \(10^{-${k}}\).` }, { value: k, why: 'Each halving gains less than one decimal digit: it takes more than 3 halvings to divide by 10.' }, n + 2, 2 * k],
      solution: [R`After \(n\) steps the interval has length \(\dfrac{${num(L)}}{2^{n}}\). Solve \(\dfrac{${num(L)}}{2^{n}} < 10^{-${k}}\).`, R`\(2^{n} > ${num(L)} \times 10^{${k}}\), so \(n > \log_2(${num(L * 10 ** k)}) \approx ${num(round(Math.log2(L * 10 ** k), 3))}\).`, R`The smallest whole number is \(n = ${n}\).`],
      rule: 5,
      skill: 'Newton versus bisection',
      check: () => (L / 2 ** n < 10 ** -k && L / 2 ** (n - 1) >= 10 ** -k && n === Math.ceil(Math.log2(L * 10 ** k)) ? true : 'step count'),
    });
  }
  if (kind === 'bracket') {
    let [p, c, a, steps] = [0, 0, 0, []];
    const f = (x) => x ** 3 + p * x - c;
    do {
      [p, c] = [rng.int(1, 5), rng.int(3, 40)];
      a = Math.floor(bisect(f, -1, 5));
      steps = [[a, a + 1]];
      for (let i = 0; i < 3; i++) {
        const [lo, hi] = steps[i];
        const mid = (lo + hi) / 2;
        steps.push(Math.sign(f(mid)) === Math.sign(f(lo)) ? [mid, hi] : [lo, mid]);
      }
    } while (steps.some(([lo, hi]) => f(lo) === 0 || f(hi) === 0));
    const iv = ([lo, hi]) => M(`[${num(lo)}, ${num(hi)}]`);
    const [lo3, hi3] = steps[3];
    const w = 0.125;
    const cand = [1, 2, 3].flatMap((k) => [[lo3 - k * w, lo3 - (k - 1) * w], [hi3 + (k - 1) * w, hi3 + k * w]]).filter(([l, h]) => l >= a && h <= a + 1);
    return q({
      prompt: R`\(f(x) = ${poly([1, 0, p, -c])}\) changes sign on \([${a}, ${a + 1}]\). Apply three steps of the bisection method. Which interval contains the root after the third step?`,
      correct: iv(steps[3]),
      wrong: cand.map((iw, i) => (i === 0 ? { value: iv(iw), why: 'Keep the half on which f changes sign: compare the sign of f at the midpoint with the signs at the ends.' } : iv(iw))),
      solution: [
        ...steps.slice(0, 3).map(([l, h], i) => R`Step ${i + 1}: midpoint \(${num((l + h) / 2)}\), \(f(${num((l + h) / 2)}) \approx ${num(round(f((l + h) / 2), 3))}\); keep \([${num(steps[i + 1][0])}, ${num(steps[i + 1][1])}]\).`),
        R`The root lies in \([${num(lo3)}, ${num(hi3)}]\). (Three Newton steps would already give it to several decimal places.)`,
      ],
      rule: 5,
      skill: 'Newton versus bisection',
      check: () => checkAll(f(lo3) * f(hi3) < 0 ? true : 'no sign change in the answer', ...cand.map(([l, h]) => (f(l) * f(h) > 0 ? true : 'a wrong interval contains the root'))),
    });
  }
  return fromBank(rng, BISECT_BANK, { rule: 5, skill: 'Newton versus bisection' });
}

const BISECT_BANK = [
  {
    prompt: R`Which statement about Newton's method and the bisection method is true?`,
    correct: 'Bisection always closes in on a root once f changes sign on the interval; Newton\'s method can fail from a poor start',
    wrong: [{ value: 'Newton\'s method always converges when f is continuous; bisection can fail', why: 'Newton\'s method can diverge, cycle or hit a horizontal tangent. Bisection cannot fail once there is a sign change.' }, 'Bisection needs the derivative of f, while Newton\'s method needs only values of f', 'Both methods gain the same number of correct digits at each step'],
    solution: ['Bisection keeps a sign change at every step, so by the Intermediate Value Theorem a root is always inside the interval.', 'Newton\'s method follows tangent lines, which can lead away from the root when the start is poor.'],
  },
  {
    prompt: R`Near a simple root, how do the errors of the two methods typically shrink from one step to the next?`,
    correct: 'Bisection halves its error bound each step; Newton\'s method roughly doubles the number of correct digits each step',
    wrong: [{ value: 'Bisection roughly doubles the correct digits each step; Newton\'s method halves the error', why: 'The two are the other way round. Bisection only halves the interval, which is slow.' }, 'Both methods halve the error each step', 'Newton\'s method adds exactly one correct digit each step'],
    solution: ['Each bisection step halves the interval, so it takes more than 3 steps to gain one decimal digit.', 'Near a simple root, Newton\'s error is roughly squared at each step, so the number of correct digits roughly doubles.'],
  },
  {
    prompt: R`To approximate \(\sqrt{7}\), which pair of methods and set-ups is valid?`,
    correct: R`Bisection on \(x^{2} - 7\) over \([2, 3]\), or Newton's method on \(x^{2} - 7\) from \(x_0 = 3\)`,
    wrong: [{ value: R`Bisection on \(x^{2} - 7\) over \([3, 4]\), or Newton's method from \(x_0 = 0\)`, why: R`\(x^{2} - 7\) does not change sign on \([3, 4]\), and \(f'(0) = 0\) gives a horizontal tangent.` }, R`Bisection on \(x^{2} + 7\) over \([2, 3]\), or Newton's method on \(x^{2} + 7\) from \(x_0 = 3\)`, R`Bisection on \(x^{2} - 7\) over \([0, 2]\), or Newton's method on \(x - 7\) from \(x_0 = 3\)`],
    solution: [R`\(f(2) = -3 < 0\) and \(f(3) = 2 > 0\), so \([2, 3]\) brackets \(\sqrt{7}\).`, R`\(f'(3) = 6 \neq 0\), and 3 is close to \(\sqrt{7} \approx 2.6458\), so Newton's method from 3 converges.`],
  },
];

// A cubic with three roots: which starting value leads to a chosen root?
function challengeStart(rng) {
  const s = rng.pick([1, 2]);
  const c = rng.pick([-1, 1]) * rng.pick([1, 2]) * s ** 3 / 2;
  const f = (x) => x ** 3 - 3 * s * s * x + c;
  const df = (x) => 3 * x * x - 3 * s * s;
  const roots = [bisect(f, -3 * s, -s), bisect(f, -s, s), bisect(f, s, 3 * s)];
  const ti = rng.pick([0, 2]);
  const target = roots[ti];
  const grid = [-3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3].map((v) => v * s);
  const where = (x0) => {
    const xs = newton(f, df, x0, 60);
    if (xs.fail) return 'flat';
    const end = xs[xs.length - 1];
    const i = roots.findIndex((r) => Math.abs(r - end) < 1e-8);
    return i < 0 ? 'none' : i;
  };
  const near = grid.filter((x0) => where(x0) === ti && Math.abs(x0 - target) <= 1.6 * s);
  const good = near.length ? near : grid.filter((x0) => where(x0) === ti);
  const right = rng.pick(good);
  const flat = rng.pick([s, -s]);
  const bad = grid.filter((x0) => x0 !== flat && where(x0) !== ti && where(x0) !== 'flat');
  const others = [flat, ...rng.shuffle(bad).slice(0, 2)];
  const describe = (x0) => (where(x0) === 'flat' ? R`\(f'(${num(x0)}) = 0\): the tangent line is horizontal` : where(x0) === 'none' ? R`from \(${num(x0)}\) the iterates do not settle on a root` : R`from \(${num(x0)}\) the method converges to the root near \(${num(round(roots[where(x0)], 2))}\)`);
  const fx = (v) => M(`x_0 = ${num(v)}`);
  const tex = poly([1, 0, -3 * s * s, c]);
  return q({
    prompt: R`The graph shows \(f(x) = ${tex}\), which has three roots. Which starting value makes Newton's method converge to the root near \(x = ${num(round(target, 2))}\)?`,
    correct: fx(right),
    wrong: others.map((v, i) => (i < 2 ? { value: fx(v), why: R`No: ${describe(v)}.` } : fx(v))),
    solution: [
      R`A good start is near the wanted root, on a part of the graph that is steep rather than flat, with no turning point between the start and the root.`,
      R`\(f'(x) = ${poly([3, 0, -3 * s * s])}\) is 0 at \(x = \pm ${s}\), so starts at or near the turning points are poor.`,
      R`From \(x_0 = ${num(right)}\) the iterates are ${newton(f, df, right, 3).slice(1).map((x) => R`\(${num(round(x, 4))}\)`).join(', ')}, which approach \(${num(round(target, 4))}\).`,
    ],
    rule: 4,
    skill: 'choosing a starting value',
    visual: {
      type: 'plot',
      ...fit(f, -3 * s, 3 * s, { cap: [-8 * s ** 3, 8 * s ** 3] }),
      step: [s === 1 ? 0.5 : 1, s === 1 ? 2 : 16],
      fns: [{ f }],
      points: roots.map((r) => ({ x: r, y: 0, open: true })),
      alt: `Graph of y = ${tex.replace(/\^\{3\}/g, '³').replace(/\{|\}/g, '')}, a cubic that rises, turns at x = −${s} and x = ${s}, and crosses the x-axis at about ${roots.map((r) => txt(round(r, 2))).join(', ')}.`,
    },
    check: () => checkAll(
      where(right) === ti ? true : 'right start does not reach the target',
      ...others.map((v) => (where(v) !== ti ? true : `start ${v} also reaches the target`)),
      ...roots.map((r) => (Math.abs(f(r)) < 1e-9 ? true : 'bad root')),
    ),
  });
}

function challengeBackwards(rng) {
  const x0 = rng.int(-3, 5);
  const m = rng.nonzero(-6, 6);
  const step = rng.pick([-1.5, -1, -0.5, -0.25, 0.25, 0.5, 1, 1.5]);
  const x1 = x0 + step;
  const fv = -m * step; // f(x0) = −f′(x0)(x1 − x0)
  const f = (x) => fv + m * (x - x0) + 0.4 * (x - x0) ** 2; // a function with these values at x0
  if (rng.bool()) {
    return q({
      prompt: R`One step of Newton's method from \(x_0 = ${x0}\) gives \(x_1 = ${num(x1)}\). If \(f(${x0}) = ${num(fv)}\), what is \(f'(${x0})\)?`,
      correct: m,
      wrong: [{ value: -m, why: R`From \(x_1 = x_0 - \dfrac{f(x_0)}{f'(x_0)}\): \(f'(x_0) = \dfrac{f(x_0)}{x_0 - x_1}\). Keep the order \(x_0 - x_1\).` }, { value: round(-step / fv, 4), why: R`That fraction is upside down: \(f'(x_0) = \dfrac{f(x_0)}{x_0 - x_1}\).` }, round(fv * step, 4), m + 1],
      solution: [R`Rearrange \(x_1 = x_0 - \dfrac{f(x_0)}{f'(x_0)}\): \(f'(x_0) = \dfrac{f(x_0)}{x_0 - x_1}\).`, R`\(f'(${x0}) = \dfrac{${num(fv)}}{${x0} - ${x1 < 0 ? `(${num(x1)})` : num(x1)}} = \dfrac{${num(fv)}}{${num(-step)}} = ${m}\).`],
      rule: 0,
      skill: 'working backwards',
      check: () => checkAll(checkEqual(numDeriv(f, x0), m, 1e-6, 'slope'), checkEqual(tangentCross(f, x0), x1, 1e-6, 'x1')),
    });
  }
  const b = fv - m * x0;
  return q({
    prompt: R`The tangent line to the graph of \(f\) at \(x = ${x0}\) is \(y = ${terms([[m, 'x'], [b, '']])}\). Newton's method starts at \(x_0 = ${x0}\). What is \(x_1\)?`,
    correct: x1,
    wrong: [{ value: round(b, 4), why: 'That is where the tangent line crosses the y-axis. Newton\'s method uses where it crosses the x-axis.' }, { value: 2 * x0 - x1, why: SIGN_WHY }, { value: fv, why: R`That is \(f(${x0})\), the height of the point of tangency.` }, x0 + 2 * step],
    solution: [R`\(x_1\) is where the tangent line crosses the x-axis: set \(${terms([[m, 'x'], [b, '']])} = 0\).`, R`\(x = \dfrac{${num(-b)}}{${m}} = ${num(x1)}\).`],
    rule: 0,
    skill: 'working backwards',
    check: () => checkAll(checkEqual(f(x0), m * x0 + b, 1e-9, 'tangent passes through the point'), checkEqual(tangentCross(f, x0), x1, 1e-6, 'x1')),
  });
}

// ───────────── Models ─────────────

const MODEL_FNS = {
  sq: (a) => ({ tex: `x^{2} - ${num(a)}`, dtex: '2x', f: (x) => x * x - a, df: (x) => 2 * x, label: `y = x² − ${txt(a)}`, root: Math.sqrt(a), what: R`\(\sqrt{${num(a)}}\)` }),
  cube: (a) => ({ tex: `x^{3} - ${num(a)}`, dtex: '3x^{2}', f: (x) => x ** 3 - a, df: (x) => 3 * x * x, label: `y = x³ − ${txt(a)}`, root: Math.cbrt(a), what: R`\(\sqrt[3]{${num(a)}}\)` }),
  exp: (a) => ({ tex: `e^{x} + x - ${num(a)}`, dtex: 'e^{x} + 1', f: (x) => Math.exp(x) + x - a, df: (x) => Math.exp(x) + 1, label: `y = eˣ + x − ${txt(a)}`, root: bisect((x) => Math.exp(x) + x - a, -60, 60), what: R`the solution of \(e^{x} = ${num(a)} - x\)` }),
  cos: (a) => ({ tex: terms([[1, '\\cos x'], [-a, 'x']]), dtex: terms([[-1, '\\sin x'], [-a, '']]), f: (x) => Math.cos(x) - a * x, df: (x) => -Math.sin(x) - a, label: `y = cos x − ${txt(a)}x`, root: bisect((x) => Math.cos(x) - a * x, -1 / a - 1, 1 / a + 1), what: R`the solution of \(\cos x = ${terms([[a, 'x']])}\)` }),
};

function stepPlot(F, x0, x1, extra = '') {
  const y0 = F.f(x0);
  const m = F.df(x0);
  const tan = (x) => y0 + m * (x - x0);
  const lo = Math.min(x0, x1, F.root) - 1;
  const hi = Math.max(x0, x1, F.root) + 1;
  return {
    type: 'plot',
    ...fit([F.f, tan], lo, hi, { cap: [-60, 60], minPad: 0.5 }),
    fns: [{ f: F.f, label: F.label }, { f: tan, color: 'b', dashed: true, domain: [Math.min(x0, x1) - 0.5, Math.max(x0, x1) + 0.5] }],
    points: [{ x: x0, y: y0, label: 'x₀' }, { x: x1, y: 0, color: 'b', label: 'x₁' }],
    alt: `Graph of ${F.label}, which crosses the x-axis at about x = ${txt(round(F.root, 4))}. The dashed tangent line at (${txt(round(x0, 4))}, ${txt(round(y0, 4))}) meets the x-axis at x₁ = ${txt(round(x1, 4))}.${extra}`,
  };
}

export default {
  id: 'newtons-method',
  title: "Newton's Method",
  summary: "Approximate roots and solutions of equations by following tangent lines, and recognise when Newton's method fails.",
  standards: ["Calculus I: Newton's method", 'AP Calculus 4.6'],

  explain: {
    intro: R`Most equations, such as \(\cos x = x\), cannot be solved with algebra. Newton's method finds a solution numerically: guess a value, replace the curve by its tangent line there, and see where the line crosses the x-axis. That crossing is usually a much better guess. Repeating the step closes in on the root very quickly.`,
    rules: [
      {
        title: 'The idea: follow the tangent line',
        text: R`At the guess \(x_n\), the tangent line is \(y = f(x_n) + f'(x_n)(x - x_n)\). Setting \(y = 0\) gives the next guess \(x_{n+1}\), the point where the tangent line meets the x-axis.`,
        example: R`For \(f(x) = x^{2} - 2\) at \(x_0 = 2\): the tangent line \(y = 2 + 4(x - 2)\) meets the x-axis at \(x_1 = 1.5\).`,
      },
      {
        title: 'The formula, and rounding',
        text: R`\(x_{n+1} = x_n - \dfrac{f(x_n)}{f'(x_n)}\). Keep full calculator accuracy in every iterate and round only the final answer. To get a root to 4 decimal places, iterate until two successive values agree to 4 decimal places.`,
        example: R`\(x^{2} - 2\), \(x_0 = 2\): \(x_1 = 1.5\), \(x_2 = 1.41\overline{6}\), \(x_3 \approx 1.414216\), \(x_4 \approx 1.414214\). So \(\sqrt{2} \approx 1.4142\).`,
      },
      {
        title: 'Setting up f',
        text: R`Newton's method finds roots, so first write the problem as \(f(x) = 0\). For \(\sqrt{a}\) use \(f(x) = x^{2} - a\); for \(\sqrt[3]{a}\) use \(x^{3} - a\); for an equation, move every term to one side. Use radians for trig functions.`,
        example: R`\(e^{x} = 3 - x\) becomes \(f(x) = e^{x} + x - 3\), with \(f'(x) = e^{x} + 1\).`,
      },
      {
        title: 'When it fails',
        text: R`The method breaks down if \(f'(x_n) = 0\) (a horizontal tangent never meets the axis). A nearly flat tangent can throw the next guess far away, toward a different root. Some functions make the iterates cycle or grow: for \(f(x) = \sqrt[3]{x}\), \(x_{n+1} = -2x_n\) from every nonzero start.`,
        example: R`\(f(x) = x^{3} - 3x + 1\) with \(x_0 = 1\): \(f'(1) = 0\), so \(x_1\) does not exist.`,
      },
      {
        title: 'Choosing a starting value',
        text: R`Start close to the root, where the graph is steep, with no turning point between the start and the root. A sketch, a table of values or a sign change (the Intermediate Value Theorem) shows where the root is.`,
        example: R`\(f(1) < 0 < f(2)\) for \(f(x) = x^{3} + x - 5\), so a root lies in \([1, 2]\): start at \(x_0 = 2\), where \(f'(2) = 13\).`,
      },
      {
        title: 'Newton versus bisection',
        text: R`Bisection halves an interval on which \(f\) changes sign, keeping the half that still has a sign change. It always works but is slow: one decimal digit takes more than 3 steps. Newton's method needs \(f'\) and a good start, but near a root it roughly doubles the number of correct digits at each step.`,
        example: R`For \(\sqrt{2}\), bisection on \([1, 2]\) needs 14 steps to reach an interval shorter than \(10^{-4}\); Newton's method from 2 has 4 correct decimals after 3 steps.`,
      },
    ],
    vocab: [
      { term: 'iterate', def: R`One of the successive approximations \(x_0, x_1, x_2, \ldots\) produced by repeating the same step.` },
      { term: 'converge', def: 'The iterates settle on a single number: here, a root of f.' },
      { term: 'diverge', def: 'The iterates do not settle; they may grow without bound or jump about.' },
      { term: 'bisection method', def: 'Repeatedly halving an interval on which f changes sign, keeping the half where the sign still changes.' },
    ],
    mistakes: [
      R`Adding the step instead of subtracting it: \(x_{n+1} = x_n - \dfrac{f(x_n)}{f'(x_n)}\).`,
      R`Writing \(\dfrac{f'(x_n)}{f(x_n)}\) for the step. The value goes on top.`,
      R`Reusing \(f'(x_0)\) in later steps. Each step uses the slope at the newest iterate.`,
      'Rounding each iterate early. Keep full accuracy and round only the final answer.',
      'Using degree mode for trig functions. The derivative formulas need radians.',
    ],
    visual: {
      type: 'plot',
      x: [0, 3],
      y: [-2.5, 7],
      step: [0.5, 1],
      fns: [{ f: (x) => x * x - 2, label: 'y = x² − 2', labelAt: 2.6 }, { f: (x) => 2 + 4 * (x - 2), color: 'b', dashed: true, domain: [1.2, 2.6] }],
      points: [{ x: 2, y: 2, label: 'x₀ = 2' }, { x: 1.5, y: 0, color: 'b', label: 'x₁ = 1.5' }],
      alt: 'Graph of y = x² − 2, which crosses the x-axis at √2 ≈ 1.414. The dashed tangent line at the point (2, 2) has slope 4 and meets the x-axis at x₁ = 1.5, much closer to the root than x₀ = 2.',
    },
  },

  examples: [
    {
      title: 'Two steps toward √5',
      problem: R`Use Newton's method with \(x_0 = 2\) to find \(x_2\) as an approximation to \(\sqrt{5}\), to 4 decimal places.`,
      steps: [
        R`Use \(f(x) = x^{2} - 5\), whose positive root is \(\sqrt{5}\). Then \(f'(x) = 2x\).`,
        R`\(x_1 = 2 - \dfrac{f(2)}{f'(2)} = 2 - \dfrac{-1}{4} = 2.25\).`,
        R`\(x_2 = 2.25 - \dfrac{f(2.25)}{f'(2.25)} = 2.25 - \dfrac{0.0625}{4.5} \approx 2.236111\).`,
      ],
      answer: R`\(x_2 \approx 2.2361\). (\(\sqrt{5} = 2.236068\ldots\), so two steps already give 4 correct decimals.)`,
      visual: { type: 'plot', x: [1, 3], y: [-2, 4], step: [0.25, 1], fns: [{ f: (x) => x * x - 5 }, { f: (x) => -1 + 4 * (x - 2), color: 'b', dashed: true, domain: [1.7, 2.5] }], points: [{ x: 2, y: -1, label: 'x₀' }, { x: 2.25, y: 0, color: 'b', label: 'x₁' }], alt: 'Graph of y = x² − 5 near its root √5 ≈ 2.236. The dashed tangent line at (2, −1) has slope 4 and meets the x-axis at x₁ = 2.25.' },
    },
    {
      title: 'Solving cos x = x',
      problem: R`Solve \(\cos x = x\) to 4 decimal places, starting at \(x_0 = 1\).`,
      steps: [
        R`Set up \(f(x) = \cos x - x\), so \(f'(x) = -\sin x - 1\). Work in radians.`,
        R`\(x_1 = 1 - \dfrac{-0.459698}{-1.841471} \approx 0.750364\).`,
        R`\(x_2 = 0.750364 - \dfrac{-0.018923}{-1.681905} \approx 0.739113\).`,
        R`\(x_3 \approx 0.739085\), and \(x_4 \approx 0.739085\) agrees with it to 6 places.`,
      ],
      answer: R`\(x \approx 0.7391\)`,
    },
    {
      title: 'A function that defeats the method',
      problem: R`Apply Newton's method to \(f(x) = \sqrt[3]{x}\), whose only root is 0, starting at \(x_0 = 1\).`,
      steps: [
        R`\(f'(x) = \dfrac{1}{3}x^{-2/3}\), so \(\dfrac{f(x)}{f'(x)} = \dfrac{x^{1/3}}{\frac{1}{3}x^{-2/3}} = 3x\).`,
        R`The formula becomes \(x_{n+1} = x_n - 3x_n = -2x_n\).`,
        R`From \(x_0 = 1\): \(x_1 = -2\), \(x_2 = 4\), \(x_3 = -8\). Each step doubles the distance from the root.`,
      ],
      answer: 'The iterates diverge from every nonzero start: the tangent lines are so steep near 0 that each one overshoots.',
    },
    {
      title: 'Word problem: how deep does a ball float?',
      word: true,
      problem: R`A wooden ball of radius 10 cm is 0.3 times as dense as water. The depth \(h\) of its submerged part satisfies \(h^{3} - 30h^{2} + 1200 = 0\). Find \(h\) to 4 decimal places, starting from \(h_0 = 10\).`,
      steps: [
        R`\(f(h) = h^{3} - 30h^{2} + 1200\), \(f'(h) = 3h^{2} - 60h\).`,
        R`\(h_1 = 10 - \dfrac{-800}{-300} \approx 7.333333\).`,
        R`\(h_2 = 7.333333 - \dfrac{-18.962963}{-278.666667} \approx 7.265284\), and \(h_3 \approx 7.265150\), \(h_4 \approx 7.265150\).`,
      ],
      answer: R`\(h \approx 7.2652\) cm: less than the radius, as expected for a light wood.`,
    },
  ],

  models: [
    {
      id: 'newton-steps',
      title: "Run Newton's method",
      intro: 'Choose a function, a constant and a starting value. See each iterate, and the first tangent line on the graph.',
      inputs: [
        { name: 'fn', label: 'Function', type: 'select', value: 'sq', options: [{ value: 'sq', label: 'x² − a (for √a)' }, { value: 'cube', label: 'x³ − a (for ∛a)' }, { value: 'exp', label: 'eˣ + x − a (solves eˣ = a − x)' }, { value: 'cos', label: 'cos x − ax (solves cos x = ax)' }] },
        { name: 'a', label: 'Constant a', type: 'number', min: 0.5, max: 50, step: 0.5, value: 5 },
        { name: 'x0', label: 'Starting value x₀', type: 'number', min: -10, max: 10, step: 0.1, value: 2 },
        { name: 'n', label: 'Number of steps', type: 'int', min: 1, max: 6, value: 3 },
      ],
      compute({ fn, a, x0, n }) {
        const F = MODEL_FNS[fn](a);
        const xs = newton(F.f, F.df, x0, n);
        if (xs.fail === 'flat' && xs.length === 1) return { error: `f′(${txt(x0)}) = 0, so the tangent line is horizontal and never meets the x-axis. Choose a different starting value.` };
        if (xs.fail === 'flat') return { error: `The tangent line at x${'₀₁₂₃₄₅₆'[xs.length - 1]} is horizontal, so the method stops there. Try a starting value closer to the root.` };
        if (xs.fail) return { error: 'The iterates run off to very large numbers from this start. Choose a starting value closer to the root.' };
        const steps = [R`\(f(x) = ${F.tex}\) and \(f'(x) = ${F.dtex}\). Formula: \(x_{n+1} = x_n - \dfrac{f(x_n)}{f'(x_n)}\).`];
        for (let i = 1; i < xs.length; i++) steps.push(R`\(x_{${i}} = ${d6(xs[i - 1])} - \dfrac{${d6(F.f(xs[i - 1]))}}{${d6(F.df(xs[i - 1]))}} ${ap(xs[i])}\)`);
        const last = xs[xs.length - 1];
        const err = Math.abs(last - (fn === 'sq' && last < 0 ? -F.root : F.root));
        return {
          problem: R`Approximate ${F.what} with Newton's method from \(x_0 = ${num(x0)}\).`,
          steps,
          answer: R`\(x_{${n}} \approx ${num(last, { fixed: 4 })}\)`,
          note: Number.isFinite(F.root) && Math.abs(F.f(F.root)) < 1e-9 ? `A root is at ${txt(round(F.root, 6))}${fn === 'sq' && x0 < 0 ? ' (or its negative, −√a, which a negative start approaches)' : ''}. ${err < 5e-5 ? 'The last iterate is correct to 4 decimal places.' : 'More steps, or a better start, are needed for 4 decimal places.'}` : undefined,
          visual: stepPlot(F, xs[0], xs[1]),
        };
      },
    },
    {
      id: 'interest-rate',
      title: 'Word problem: what interest rate did the account earn?',
      word: true,
      intro: 'Equal deposits are made at the start of each year. Newton\'s method recovers the yearly interest rate from the final balance.',
      inputs: [
        { name: 'D', label: 'Deposit each year ($)', type: 'int', min: 100, max: 10000, value: 1000 },
        { name: 'years', label: 'Number of years', type: 'int', min: 2, max: 10, value: 3 },
        { name: 'B', label: 'Final balance ($)', type: 'int', min: 100, max: 500000, value: 3300 },
      ],
      compute({ D, years, B }) {
        if (B <= D * years) return { error: `The ${years} deposits add up to $${txt(D * years)}. For a positive interest rate the final balance must be larger than that.` };
        if (B > D * years * 20) return { error: 'That balance would need an interest rate far above 100% a year. Choose a smaller balance.' };
        const k = B / D;
        const f = (x) => Array.from({ length: years }, (_, i) => x ** (i + 1)).reduce((s, v) => s + v, 0) - k;
        const df = (x) => Array.from({ length: years }, (_, i) => (i + 1) * x ** i).reduce((s, v) => s + v, 0);
        const xs = [1.05];
        while (xs.length < 12) {
          xs.push(xs[xs.length - 1] - f(xs[xs.length - 1]) / df(xs[xs.length - 1]));
          if (Math.abs(xs[xs.length - 1] - xs[xs.length - 2]) < 1e-9) break;
        }
        const x = xs[xs.length - 1];
        const shown = xs.slice(1, 5);
        const who = 'Rosa';
        const lhs = years <= 4 ? Array.from({ length: years }, (_, i) => power1(i + 1)).join(' + ') : `x + x^{2} + \\cdots + x^{${years}}`;
        const dl = years <= 4 ? Array.from({ length: years }, (_, i) => (i === 0 ? '1' : `${i + 1}${power1(i)}`)).join(' + ') : `1 + 2x + \\cdots + ${years}x^{${years - 1}}`;
        return {
          problem: `${who} deposits $${txt(D)} at the start of each year for ${years} years and ends with $${txt(B)}. What yearly interest rate did the account earn?`,
          steps: [
            R`Each deposit grows by the factor \(x = 1 + r\) each year, so \(${num(D)}(${lhs}) = ${num(B)}\).`,
            R`Divide by ${txt(D)} and set up \(f(x) = ${lhs} - ${num(round(k, 6))}\), with \(f'(x) = ${dl}\).`,
            R`Start at \(x_0 = 1.05\) (a 5% guess). Iterates: ${shown.map((v, i) => R`\(x_{${i + 1}} \approx ${num(v, { fixed: 6 })}\)`).join(', ')}.`,
            R`The iterates settle at \(x \approx ${num(x, { fixed: 6 })}\), so \(r \approx ${num(round(100 * (x - 1), 3))}\%\).`,
          ],
          answer: R`About \(${num(round(100 * (x - 1), 2))}\%\) a year`,
          visual: stepPlot({ f, df, root: x, label: 'y = f(x)' }, 1.05, xs[1], ' Here x is the growth factor 1 + r.'),
        };
      },
    },
  ],

  quiz: {
    easy: [easyOneStep, easySetUp, easyGraph],
    medium: [mediumTwoSteps, mediumEquation, mediumWord],
    hard: [hardFailure, hardRoot, hardWord],
    challenge: [challengeCompare, challengeStart, challengeBackwards],
  },
};
