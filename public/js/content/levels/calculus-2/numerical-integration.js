import { R, q, num, txt, round, sum, range, poly, polyEval, frac, person, checkEqual, integrate, numDeriv, close } from '../../lib/index.js';
import { M } from './_shared.js';

// ───────────── Helpers ─────────────

// A number rounded to p decimal places and printed with exactly p of them.
const D = (v, p = 4) => num(round(v, p), { fixed: p });
// Plain-text version for alt text.
const T = (v, p = 4) => txt(round(v, p), { fixed: p });

// L, R, M, T or S (Simpson) approximation of ∫ₐᵇ f with n equal subintervals.
function approx(f, a, b, n, kind) {
  const h = (b - a) / n;
  if (kind === 'S') {
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
  }
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x = a + i * h;
    s += kind === 'L' ? f(x) : kind === 'R' ? f(x + h) : kind === 'M' ? f(x + h / 2) : (f(x) + f(x + h)) / 2;
  }
  return s * h;
}

// Second routes, used only by checks.
// The area under the broken line through the points (= the trapezoidal rule).
function chordArea(xs, ys) {
  let s = 0;
  for (let i = 0; i + 1 < xs.length; i++) s += integrate((t) => ys[i] + ((ys[i + 1] - ys[i]) * (t - xs[i])) / (xs[i + 1] - xs[i]), xs[i], xs[i + 1], 8);
  return s;
}
// The area under the parabola through each consecutive triple of points (= Simpson's rule).
function parabolaArea(xs, ys) {
  let s = 0;
  for (let i = 0; i + 2 < xs.length; i += 2) {
    const [x0, x1, x2] = [xs[i], xs[i + 1], xs[i + 2]];
    const [y0, y1, y2] = [ys[i], ys[i + 1], ys[i + 2]];
    const P = (t) => (y0 * (t - x1) * (t - x2)) / ((x0 - x1) * (x0 - x2)) + (y1 * (t - x0) * (t - x2)) / ((x1 - x0) * (x1 - x2)) + (y2 * (t - x0) * (t - x1)) / ((x2 - x0) * (x2 - x1));
    s += integrate(P, x0, x2, 40);
  }
  return s;
}
const grid = (a, b, n) => range(0, n).map((i) => a + ((b - a) * i) / n);
// T_n of a function through the broken-line route; M_n through T_2n = (T_n + M_n)/2.
const trapCheck = (f, a, b, n) => chordArea(grid(a, b, n), grid(a, b, n).map(f));
const midCheck = (f, a, b, n) => 2 * trapCheck(f, a, b, 2 * n) - trapCheck(f, a, b, n);
const simpCheck = (f, a, b, n) => parabolaArea(grid(a, b, n), grid(a, b, n).map(f));
const byCheck = { M: midCheck, T: trapCheck, S: simpCheck };

// Keep wrong answers that are at least `gap` units in the last decimal place away from the right
// answer and from each other, so that rounding can never make two choices look alike.
function apart(correct, list, p, gap = 4) {
  const unit = gap * 10 ** -p;
  const kept = [round(correct, p)];
  const out = [];
  for (const w of list) {
    if (w == null) continue;
    const v = typeof w === 'object' ? w.value : w;
    if (v == null || !Number.isFinite(v)) continue;
    const r = round(v, p);
    if (kept.some((k) => Math.abs(k - r) < unit - 1e-12)) continue;
    kept.push(r);
    out.push(typeof w === 'object' ? { ...w, value: r } : r);
  }
  return out;
}

// A one-row data table: header row of x-values, one row of readings.
function dataTable(xName, yName, xs, ys, alt) {
  return { type: 'table', headers: [M(xName), ...xs.map((x) => M(num(x)))], rows: [[M(yName), ...ys.map((y) => M(num(y)))]], rowHeaders: true, alt };
}

const NAME = { M: 'midpoint rule', T: 'trapezoidal rule', S: "Simpson's rule" };
const SYM = { M: 'M', T: 'T', S: 'S' };
const ART = { M: 'the midpoint rule', T: 'the trapezoidal rule', S: "Simpson's rule" };

// Functions for formula questions. spans: intervals that suit the function.
const FNS = [
  { tex: '\\frac{1}{x}', plain: '1/x', f: (x) => 1 / x, spans: [[1, 2], [1, 3], [2, 4], [1, 5]] },
  { tex: '\\sqrt{x}', plain: '√x', f: Math.sqrt, spans: [[0, 2], [1, 3], [0, 4], [1, 5]] },
  { tex: '\\ln x', plain: 'ln x', f: Math.log, spans: [[1, 2], [1, 3], [2, 4], [1, 5]] },
  { tex: 'e^{-x^{2}}', plain: 'e^(−x²)', f: (x) => Math.exp(-x * x), spans: [[0, 1], [0, 2], [-1, 1]] },
  { tex: '\\sqrt{1 + x^{3}}', plain: '√(1 + x³)', f: (x) => Math.sqrt(1 + x ** 3), spans: [[0, 1], [0, 2], [1, 3]] },
  { tex: '\\frac{1}{1 + x^{2}}', plain: '1/(1 + x²)', f: (x) => 1 / (1 + x * x), spans: [[0, 1], [0, 2], [-1, 1], [1, 3]] },
  { tex: '\\sin(x^{2})', plain: 'sin(x²)', f: (x) => Math.sin(x * x), spans: [[0, 1], [0, 2]] },
  { tex: 'e^{x}', plain: 'eˣ', f: Math.exp, spans: [[0, 1], [0, 2], [-1, 1], [1, 3]] },
  { tex: 'x^{3}', plain: 'x³', f: (x) => x ** 3, spans: [[0, 2], [1, 3], [0, 4]] },
  { tex: '\\cos x', plain: 'cos x', f: Math.cos, spans: [[0, 1], [0, 2], [1, 3]] },
];
// n for which Δx is a multiple of 0.25 (so the sample points print cleanly).
const nOptions = (a, b, list) => list.filter((n) => Number.isInteger((4 * (b - a)) / n));

// Steps for M_n, T_n or S_n of a formula, and the value.
function ruleSteps(fn, a, b, n, kind) {
  const h = (b - a) / n;
  const f = fn.f;
  const xs = grid(a, b, n);
  const at = (x) => R`f(${num(x)})`;
  let body;
  if (kind === 'M') body = R`${num(h)}\left[${range(0, n - 1).map((i) => at(a + (i + 0.5) * h)).join(' + ')}\right]`;
  else if (kind === 'T') body = R`\frac{${num(h)}}{2}\left[${xs.map((x, i) => (i === 0 || i === n ? at(x) : `2${at(x)}`)).join(' + ')}\right]`;
  else body = R`\frac{${num(h)}}{3}\left[${xs.map((x, i) => (i === 0 || i === n ? '' : i % 2 ? '4' : '2') + at(x)).join(' + ')}\right]`;
  const pts = kind === 'M' ? range(0, n - 1).map((i) => a + (i + 0.5) * h) : xs;
  const value = approx(f, a, b, n, kind);
  return {
    value,
    steps: [
      R`\(\Delta x = \dfrac{${b} - ${paren(a)}}{${n}} = ${num(h)}\). The ${kind === 'M' ? 'midpoints' : 'points'} are \(${pts.map((x) => num(x)).join(', ')}\).`,
      R`\(${SYM[kind]}_{${n}} = ${body}\).`,
      R`The values are \(${pts.map((x) => D(f(x))).join(', ')}\) (to 4 places), so \(${SYM[kind]}_{${n}} \approx ${D(value)}\).`,
    ],
  };
}
function paren(x) {
  return x < 0 ? `(${num(x)})` : num(x);
}

// ───────────── Easy ─────────────

function easyMidTrap(rng) {
  const fn = rng.pick(FNS);
  const [a, b] = rng.pick(fn.spans);
  const n = rng.pick(nOptions(a, b, [2, 3, 4, 5, 6]));
  const kind = rng.pick(['M', 'T']);
  const { value, steps } = ruleSteps(fn, a, b, n, kind);
  const h = (b - a) / n;
  const wrong = kind === 'M'
    ? [
        { value: approx(fn.f, a, b, n, 'T'), why: 'That is the trapezoidal rule. The midpoint rule uses one height per subinterval, taken at its centre.' },
        { value: approx(fn.f, a, b, n, 'L'), why: 'That uses the left endpoints. The midpoint rule evaluates f halfway across each subinterval.' },
        h !== 1 ? { value: approx(fn.f, a, b, n, 'M') / h, why: R`Multiply the sum of the heights by the width \(\Delta x = ${num(h)}\).` } : null,
        approx(fn.f, a, b, n, 'R'),
      ]
    : [
        { value: approx(fn.f, a, b, n, 'M'), why: 'That is the midpoint rule. The trapezoidal rule uses the values at the ends of each subinterval.' },
        { value: h * sum(grid(a, b, n).map(fn.f)), why: R`The two end values are counted once and every inside value twice, inside \(\frac{\Delta x}{2}[\ldots]\). That adds every value once.` },
        { value: 2 * value, why: R`The factor in front is \(\frac{\Delta x}{2}\), not \(\Delta x\).` },
        approx(fn.f, a, b, n, 'L'),
      ];
  return q({
    prompt: R`Use the **${NAME[kind]}** with \(n = ${n}\) to approximate \(\displaystyle\int_{${a}}^{${b}} ${fn.tex}\,dx\). Round to four decimal places.`,
    correct: round(value, 4),
    fmt: (v) => M(D(v)),
    wrong: apart(value, wrong, 4).concat([round(value + 0.1, 4), round(value - 0.1, 4)]),
    solution: steps,
    rule: kind === 'M' ? 0 : 1,
    skill: kind === 'M' ? 'midpoint rule' : 'trapezoidal rule',
    check: () => checkEqual(byCheck[kind](fn.f, a, b, n), value, 1e-9, `${kind}_${n}`),
  });
}

// Functions with a known, constant concavity on the interval.
const CONCAVE = [
  { tex: 'e^{x}', plain: 'eˣ', f: Math.exp, cu: 1, spans: [[0, 2], [-1, 1], [0, 3]] },
  { tex: '\\ln x', plain: 'ln x', f: Math.log, cu: -1, spans: [[1, 3], [1, 4], [2, 5]] },
  { tex: '\\sqrt{x}', plain: '√x', f: Math.sqrt, cu: -1, spans: [[1, 4], [1, 9], [0.5, 3]] },
  { tex: '\\frac{1}{x}', plain: '1/x', f: (x) => 1 / x, cu: 1, spans: [[1, 2], [1, 3], [2, 4]] },
  { tex: 'x^{3}', plain: 'x³', f: (x) => x ** 3, cu: 1, spans: [[0, 2], [1, 3]] },
  { tex: '\\sin x', plain: 'sin x', f: Math.sin, cu: -1, spans: [[0, 3], [0.5, 2.5]] },
  { tex: '\\cos x', plain: 'cos x', f: Math.cos, cu: -1, spans: [[0, 1.5], [-1, 1]] },
  { tex: 'e^{-x}', plain: 'e^(−x)', f: (x) => Math.exp(-x), cu: 1, spans: [[0, 2], [0, 3]] },
  { tex: '4 - x^{2}', plain: '4 − x²', f: (x) => 4 - x * x, cu: -1, spans: [[0, 2], [-2, 2], [-1, 2]] },
  { tex: '\\arctan x', plain: 'arctan x', f: Math.atan, cu: -1, spans: [[0, 2], [0, 3]] },
  { tex: 'x\\ln x', plain: 'x ln x', f: (x) => x * Math.log(x), cu: 1, spans: [[1, 3], [1, 4]] },
];

function easyOverUnder(rng) {
  const c = rng.pick(CONCAVE);
  const [a, b] = rng.pick(c.spans);
  const n = rng.int(2, 8);
  const I = R`I`;
  const order = (s) => M(s.replace(/M/g, `M_{${n}}`).replace(/T/g, `T_{${n}}`));
  const up = c.cu > 0;
  const right = up ? 'M < I < T' : 'T < I < M';
  const opposite = up ? 'T < I < M' : 'M < I < T';
  const ys = grid(a - 0.2, b + 0.2, 40).map(c.f);
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  return q({
    prompt: R`Let \(I = \displaystyle\int_{${num(a)}}^{${num(b)}} ${c.tex}\,dx\), shown in the graph. How do the midpoint and trapezoidal approximations \(M_{${n}}\) and \(T_{${n}}\) compare with \(${I}\)?`,
    visual: {
      type: 'plot', x: [a - 0.2, b + 0.2], y: [lo - 0.1 * (hi - lo), hi + 0.1 * (hi - lo)],
      fns: [{ f: c.f }], shade: [{ f: c.f, from: a, to: b }],
      alt: `Graph of y = ${c.plain} from x = ${a} to x = ${b}, with the area under it shaded. On this interval the graph is concave ${up ? 'up (it bends upward, like a cup)' : 'down (it bends downward, like a cap)'}.`,
    },
    correct: order(right),
    wrong: [
      { value: order(opposite), why: `The graph is concave ${up ? 'up' : 'down'}. Chords then lie ${up ? 'above' : 'below'} the curve, so the trapezoids are too ${up ? 'big' : 'small'}.` },
      { value: order(up ? 'I < M < T' : 'T < M < I'), why: 'The midpoint and trapezoidal errors have opposite signs when the concavity does not change, so the integral lies between them.' },
      order(up ? 'M < T < I' : 'I < T < M'),
    ],
    solution: [
      R`\(f(x) = ${c.tex}\) is concave ${up ? 'up' : 'down'} on \([${num(a)}, ${num(b)}]\).`,
      `Trapezoidal rule: the top of each trapezoid is a chord, which lies ${up ? 'above' : 'below'} a concave-${up ? 'up' : 'down'} curve, so T is ${up ? 'an overestimate' : 'an underestimate'}.`,
      `Midpoint rule: each rectangle has the same area as the trapezoid under the tangent line at the midpoint, and tangent lines lie ${up ? 'below' : 'above'} the curve, so M is ${up ? 'an underestimate' : 'an overestimate'}.`,
      R`So \(${order(right).slice(2, -2)}\).`,
    ],
    rule: 3,
    skill: 'over- and underestimates',
    check: () => {
      const [m, t, i] = [approx(c.f, a, b, n, 'M'), approx(c.f, a, b, n, 'T'), integrate(c.f, a, b, 20000)];
      return (up ? m < i && i < t : t < i && i < m) ? true : `M=${m}, I=${i}, T=${t}`;
    },
  });
}

const MID_STORIES = [
  { what: (name, h) => `${name} reads a car's speed, in m/s, from the dashboard every ${h} seconds`, x: 't', y: 'v(t)', xu: 's', yu: 'm/s', ask: 'the distance the car travels', unit: 'm', hs: [2, 3, 5], base: [8, 20], step: [0, 3] },
  { what: (name, h) => `Every ${h} hours, ${name} records the rate, in cubic meters per hour, at which water flows into a reservoir`, x: 't', y: 'r(t)', xu: 'h', yu: 'cubic meters per hour', ask: 'the volume of water that flows in', unit: 'm³', hs: [1, 2, 3], base: [30, 60], step: [-6, 6] },
  { what: (name, h) => `${name} measures a cyclist's speed, in m/s, every ${h} seconds`, x: 't', y: 'v(t)', xu: 's', yu: 'm/s', ask: 'the distance the cyclist covers', unit: 'm', hs: [4, 5, 10], base: [4, 9], step: [-1, 2] },
];

function easyWordMidTable(rng) {
  const s = rng.pick(MID_STORIES);
  const name = person(rng);
  const h = rng.pick(s.hs);
  const n = rng.int(2, 4);
  const ts = range(0, 2 * n).map((i) => i * h);
  const ys = [rng.int(...s.base)];
  for (let i = 1; i <= 2 * n; i++) ys.push(Math.max(1, ys[i - 1] + rng.int(...s.step)));
  // Readings on a straight line make every rule agree; draw again.
  if (ys.every((y, i) => i < 2 || y - ys[i - 1] === ys[1] - ys[0])) return easyWordMidTable(rng);
  const odd = ys.filter((_, i) => i % 2);
  const W = 2 * h;
  const Mv = W * sum(odd);
  const Tn = W * sum(ys.filter((_, i) => i % 2 === 0).map((y, j) => (j === 0 || j === n ? y / 2 : y)));
  const T2n = chordArea(ts, ys);
  return q({
    prompt: R`${s.what(name, h)}. Use the **midpoint rule with ${n} subintervals** to estimate ${s.ask} from \(t = 0\) to \(t = ${ts[2 * n]}\) ${s.xu}.`,
    visual: dataTable(`${s.x} \\text{ (${s.xu})}`, s.y, ts, ys, `Table of readings. At t = ${ts.join(', ')} ${s.xu} the readings are ${ys.join(', ')} ${s.yu}.`),
    correct: Mv,
    unit: s.unit,
    wrong: [
      { value: h * sum(odd), why: R`With ${n} subintervals each one is \(${W}\) ${s.xu} wide (the readings are ${h} ${s.xu} apart). Multiply by \(\Delta t = ${W}\).` },
      { value: Tn, why: R`That is the trapezoidal rule with ${n} subintervals, which uses the readings at the ends of each subinterval.` },
      { value: T2n, why: R`That is the trapezoidal rule with all ${2 * n} subintervals. The midpoint rule asked for uses ${n}.` },
      W * sum(ys.filter((_, i) => i % 2 === 0).slice(0, n)),
    ],
    solution: [
      R`${n} equal subintervals of \([0, ${ts[2 * n]}]\) have width \(\Delta t = ${W}\): \(${range(0, n - 1).map((i) => `[${i * W}, ${(i + 1) * W}]`).join(', ')}\).`,
      R`Their midpoints are \(t = ${range(0, n - 1).map((i) => (2 * i + 1) * h).join(', ')}\), where the readings are \(${odd.join(', ')}\).`,
      R`\(M_{${n}} = ${W}(${odd.join(' + ')}) = ${W}(${sum(odd)}) = ${Mv}\) ${s.unit}.`,
    ],
    rule: 0,
    skill: 'midpoint rule from a table',
    // T_2n = (T_n + M_n)/2, so M_n = 2·T_2n − T_n, both from the broken line through the data.
    check: () => checkEqual(2 * T2n - chordArea(ts.filter((_, i) => i % 2 === 0), ys.filter((_, i) => i % 2 === 0)), Mv, 1e-9, 'midpoint sum'),
  });
}

// ───────────── Medium ─────────────

function mediumSimpsonFormula(rng) {
  const fn = rng.pick(FNS.filter((g) => g.plain !== 'x³'));
  const [a, b] = rng.pick(fn.spans);
  const n = rng.pick(nOptions(a, b, [4, 6, 8]).filter((k) => k <= 6).concat(nOptions(a, b, [4]))) ?? 4;
  const { value, steps } = ruleSteps(fn, a, b, n, 'S');
  const h = (b - a) / n;
  const xs = grid(a, b, n);
  return q({
    prompt: R`Use **Simpson's rule** with \(n = ${n}\) to approximate \(\displaystyle\int_{${a}}^{${b}} ${fn.tex}\,dx\). Round to four decimal places.`,
    correct: round(value, 4),
    fmt: (v) => M(D(v)),
    wrong: apart(value, [
      { value: approx(fn.f, a, b, n, 'T'), why: R`That is \(T_{${n}}\). Simpson's rule weights the values \(1, 4, 2, 4, \ldots, 4, 1\) and multiplies by \(\frac{\Delta x}{3}\).` },
      { value: 1.5 * value, why: R`The factor in front is \(\frac{\Delta x}{3}\), not \(\frac{\Delta x}{2}\).` },
      { value: (h / 3) * sum(xs.map((x, i) => fn.f(x) * (i === 0 || i === n ? 1 : i % 2 ? 2 : 4))), why: R`The weights are \(4\) at the odd-numbered points and \(2\) at the even-numbered inside points: \(1, 4, 2, \ldots, 2, 4, 1\).` },
      approx(fn.f, a, b, n, 'M'),
      approx(fn.f, a, b, n / 2, 'M'),
    ], 4).concat([round(value + 0.1, 4), round(value - 0.1, 4)]),
    solution: steps,
    rule: 2,
    skill: "Simpson's rule",
    check: () => checkEqual(simpCheck(fn.f, a, b, n), value, 1e-9, `S_${n}`),
  });
}

const SIMP_STORIES = [
  { what: (name, h, W) => `${name} measures the depth of a river every ${h} m across its width of ${W} m`, x: 'x', xu: 'm', y: 'd(x)', yu: 'm', ask: 'the area of a cross-section of the river', unit: 'm²', zeroEnds: true, hs: [2, 3, 4, 5], peak: [15, 45] },
  { what: (name, h, W) => `To find the area of a pond, ${name} measures its width every ${h} m along its ${W} m length`, x: 'x', xu: 'm', y: 'w(x)', yu: 'm', ask: 'the area of the pond', unit: 'm²', zeroEnds: true, hs: [2, 4, 5, 10], peak: [40, 120] },
  { what: (name, h, W) => `${name} reads a train's speed every ${h} seconds as it pulls out of a station for ${W} seconds`, x: 't', xu: 's', y: 'v(t)', yu: 'm/s', ask: 'the distance the train travels', unit: 'm', zeroEnds: false, hs: [2, 5, 10], peak: [60, 200] },
];

function mediumWordSimpsonTable(rng) {
  const s = rng.pick(SIMP_STORIES);
  const name = person(rng);
  const h = rng.pick(s.hs);
  const n = rng.pick([4, 6, 8]);
  const peak = rng.int(...s.peak); // in tenths
  const xs = range(0, n).map((i) => i * h);
  let ys;
  if (s.zeroEnds) ys = range(0, n).map((i) => (i === 0 || i === n ? 0 : Math.max(1, Math.round(peak * Math.sin((Math.PI * i) / n) * (0.85 + 0.3 * rng.next()))) / 10));
  else ys = range(0, n).map((i) => Math.round(peak * (0.1 + (0.9 * i) / n) * (0.9 + 0.2 * rng.next())) / 10); // a train speeding up
  const w = (i) => (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
  const S = (h / 3) * sum(ys.map((y, i) => w(i) * y));
  const Tn = chordArea(xs, ys);
  const Mh = 2 * h * sum(ys.filter((_, i) => i % 2));
  return q({
    prompt: R`${s.what(name, h, n * h)}. Use **Simpson's rule** with the ${n} subintervals in the table to estimate ${s.ask}. Round to two decimal places.`,
    visual: dataTable(`${s.x} \\text{ (${s.xu})}`, `${s.y} \\text{ (${s.yu})}`, xs, ys, `Table of measurements. At ${s.x} = ${xs.join(', ')} ${s.xu} the values of ${s.y} are ${ys.join(', ')} ${s.yu}.`),
    correct: round(S, 2),
    fmt: (v) => R`\(${D(v, 2)}\) ${s.unit}`,
    wrong: apart(S, [
      { value: Tn, why: R`That is the trapezoidal rule. Simpson's rule fits parabolas: weights \(1, 4, 2, 4, \ldots, 4, 1\) times \(\frac{\Delta x}{3}\).` },
      { value: 1.5 * S, why: R`The factor in front is \(\frac{\Delta x}{3} = \frac{${h}}{3}\), not \(\frac{\Delta x}{2}\).` },
      { value: 3 * S, why: R`Multiply the weighted sum by \(\frac{\Delta x}{3}\), not by \(\Delta x\).` },
      Mh,
    ], 2, 5),
    solution: [
      R`\(\Delta ${s.x} = ${h}\) and \(n = ${n}\) is even, so Simpson's rule applies with weights \(${range(0, n).map(w).join(', ')}\).`,
      R`\(S_{${n}} = \dfrac{${h}}{3}\left[${ys.map((y, i) => (w(i) === 1 ? num(y) : `${w(i)}(${num(y)})`)).join(' + ')}\right]\).`,
      R`\(= \dfrac{${h}}{3}(${num(round(sum(ys.map((y, i) => w(i) * y)), 6))}) \approx ${D(S, 2)}\) ${s.unit}.`,
    ],
    rule: 2,
    skill: "Simpson's rule from a table",
    check: () => checkEqual(parabolaArea(xs, ys), S, 1e-9, 'Simpson sum'),
  });
}

// Functions with simple bounds K for |f''| (k2) and |f⁽⁴⁾| (k4) on [a, b]; d2/d4 are the derivatives.
const BOUNDED = [
  { tex: '\\frac{1}{x}', plain: '1/x', f: (x) => 1 / x, d2: (x) => 2 / x ** 3, d4: (x) => 24 / x ** 5, d2tex: '\\frac{2}{x^{3}}', d4tex: '\\frac{24}{x^{5}}', spans: [[1, 2], [1, 3]], k2: () => 2, k4: () => 24, atB: (a, b, o) => (o === 2 ? [2, b ** 3] : [24, b ** 5]), where: R`\(x = 1\)` },
  { tex: '\\ln x', plain: 'ln x', f: Math.log, d2: (x) => -1 / x ** 2, d4: (x) => -6 / x ** 4, d2tex: '-\\frac{1}{x^{2}}', d4tex: '-\\frac{6}{x^{4}}', spans: [[1, 2], [1, 3], [1, 4]], k2: () => 1, k4: () => 6, atB: (a, b, o) => (o === 2 ? [1, b ** 2] : [6, b ** 4]), where: R`\(x = 1\)` },
  { tex: 'e^{-x}', plain: 'e^(−x)', f: (x) => Math.exp(-x), d2: (x) => Math.exp(-x), d4: (x) => Math.exp(-x), d2tex: 'e^{-x}', d4tex: 'e^{-x}', spans: [[0, 1], [0, 2], [0, 3]], k2: () => 1, k4: () => 1, atB: () => null, where: R`\(x = 0\)` },
  { tex: 'x^{3}', plain: 'x³', f: (x) => x ** 3, d2: (x) => 6 * x, d4: () => 0, d2tex: '6x', d4tex: '0', spans: [[0, 1], [0, 2], [1, 2]], k2: (a, b) => 6 * b, k4: () => 0, atB: (a) => (a > 0 ? [6 * a, 1] : null), where: 'the right end of the interval' },
];
const BOUND = {
  T: { c: 12, p: 3, e: 2, ord: 2 },
  M: { c: 24, p: 3, e: 2, ord: 2 },
  S: { c: 180, p: 5, e: 4, ord: 4 },
};
const boundValue = (kind, K, L, n) => (K * L ** BOUND[kind].p) / (BOUND[kind].c * n ** BOUND[kind].e);
const bTex = (kind) => (kind === 'S' ? R`\dfrac{K(b - a)^{5}}{180n^{4}}` : R`\dfrac{K(b - a)^{3}}{${BOUND[kind].c}n^{2}}`);

function mediumErrorBound(rng) {
  const kind = rng.pick(['T', 'M', 'T', 'M', 'S']);
  const g = rng.pick(kind === 'S' ? BOUNDED.filter((f) => f.plain !== 'x³') : BOUNDED);
  const [a, b] = rng.pick(g.spans);
  const L = b - a;
  const n = rng.pick(kind === 'S' ? [4, 6, 8, 10] : [4, 5, 6, 8, 10]);
  const { c: cc, p, e, ord } = BOUND[kind];
  const K = ord === 2 ? g.k2(a, b) : g.k4(a, b);
  const E = boundValue(kind, K, L, n);
  const bound = (KK, pp, ee, c = cc) => (KK == null ? null : frac(KK.n * L ** pp, KK.d * c * n ** ee));
  const Kf = frac(K, 1);
  const wrongK = g.atB(a, b, ord); // [top, bottom] of |f^(ord)| at the wrong end, or null
  const alt = kind === 'T' ? 'M' : 'T';
  return q({
    prompt: R`Use the error bound to find the largest possible error when \(${SYM[kind]}_{${n}}\) (${ART[kind]}) is used to approximate \(\displaystyle\int_{${a}}^{${b}} ${g.tex}\,dx\).`,
    correct: bound(Kf, p, e),
    wrong: [
      kind !== 'S'
        ? { value: bound(Kf, 3, 2, BOUND[alt].c), why: R`That uses the ${NAME[alt]} bound, with \(${BOUND[alt].c}\) in the denominator. The ${NAME[kind]} has \(${cc}\).` }
        : { value: bound(Kf, 5, 2), why: R`Simpson's bound has \(n^{4}\) in the denominator, not \(n^{2}\).` },
      wrongK ? { value: bound(frac(...wrongK), p, e), why: R`\(K\) must bound \(|f^{(${ord})}(x)|\) on the whole interval, so take its largest value, at ${g.where}.` } : null,
      { value: bound(Kf, p, 1), why: R`The bound has \(n^{${e}}\) in the denominator, not \(n\).` },
      bound(Kf, p - 1, e),
    ],
    solution: [
      R`\(f^{${ord === 2 ? '\\prime\\prime' : '(4)'}}(x) = ${ord === 2 ? g.d2tex : g.d4tex}\). On \([${a}, ${b}]\) its absolute value is largest at ${g.where}, so \(K = ${num(K)}\).`,
      R`\(|E_{${SYM[kind]}}| \le ${bTex(kind)} = \dfrac{${num(K)}(${L})^{${p}}}{${cc}(${n})^{${e}}}\).`,
      R`\(|E_{${SYM[kind]}}| \le ${bound(Kf, p, e).tex()} \approx ${num(E, { places: 6 })}\).`,
    ],
    rule: 4,
    skill: 'error bounds',
    check: () => {
      // K really is the largest |f^(ord)| on [a, b] (sampled), the derivative formula matches a numeric
      // derivative, and the actual error is within the bound.
      const d = ord === 2 ? g.d2 : g.d4;
      const sampled = Math.max(...grid(a, b, 400).map((x) => Math.abs(d(x))));
      if (!close(sampled, K, 1e-9)) return `K: sampled ${sampled}, used ${K}`;
      const mid = (a + b) / 2;
      const d1 = (x) => numDeriv(g.f, x, 1e-4);
      if (!close(numDeriv(d1, mid, 1e-3), g.d2(mid), 1e-3)) return 'second derivative formula';
      const err = Math.abs(approx(g.f, a, b, n, kind) - integrate(g.f, a, b, 20000));
      if (err > E + 1e-12) return `actual error ${err} exceeds bound ${E}`;
      return checkEqual(bound(Kf, p, e).value, E, 1e-12, 'bound');
    },
  });
}

// ───────────── Hard ─────────────

const TOLS = [0.01, 0.005, 0.001, 0.0005, 0.0001, 0.00005];

function smallestN(kind, K, L, tol) {
  let n = kind === 'S' ? 2 : 1;
  while (boundValue(kind, K, L, n) > tol) n += kind === 'S' ? 2 : 1;
  return n;
}

function hardSmallestN(rng) {
  const kind = rng.pick(['T', 'M', 'S']);
  const a = rng.int(0, 3);
  const L = rng.int(1, 4);
  const b = a + L;
  const K = rng.int(1, 12);
  const tol = rng.pick(TOLS);
  const B = BOUND[kind];
  const need = ((K * L ** B.p) / (B.c * tol)) ** (1 / B.e);
  if (Math.abs(need - Math.round(need)) < 0.03 || need < 2) return hardSmallestN(rng);
  const up = Math.ceil(need);
  const n = kind === 'S' ? up + (up % 2) : up;
  const alt = kind === 'T' ? 'M' : 'T';
  const altN = Math.ceil(((K * L ** 3) / (BOUND[alt].c * tol)) ** 0.5);
  const tolTex = num(tol);
  return q({
    prompt: R`Suppose \(\left|f^{${kind === 'S' ? '(4)' : "\\prime\\prime"}}(x)\right| \le ${K}\) for all \(x\) in \([${a}, ${b}]\). Using the error bound, what is the smallest \(n\) for which ${ART[kind]} is guaranteed to approximate \(\displaystyle\int_{${a}}^{${b}} f(x)\,dx\) with error at most \(${tolTex}\)?`,
    correct: n,
    fmt: (v) => R`\(n = ${v}\)`,
    wrong: [
      kind === 'S' && up % 2 ? { value: up, why: R`Simpson's rule needs an even number of subintervals, so round up to the next even number.` } : null,
      { value: Math.floor(need) >= 1 ? Math.floor(need) : null, why: R`With that \(n\) the bound is still above \(${tolTex}\). Round up, not down.` },
      kind !== 'S' ? { value: altN, why: R`That uses the ${NAME[alt]} bound (denominator \(${BOUND[alt].c}n^{2}\)).` } : { value: Math.ceil(((K * L ** 5) / (180 * tol)) ** 0.5), why: R`Simpson's bound has \(n^{4}\), so take a fourth root, not a square root.` },
      kind === 'S' ? n + 2 : n + 1,
      kind === 'S' ? n + 4 : n + 2,
    ],
    solution: [
      R`Require \(${bTex(kind)} \le ${tolTex}\) with \(K = ${K}\) and \(b - a = ${L}\): \(\dfrac{${K}(${L})^{${B.p}}}{${B.c}n^{${B.e}}} \le ${tolTex}\).`,
      R`So \(n^{${B.e}} \ge \dfrac{${K * L ** B.p}}{${B.c}(${tolTex})} \approx ${num((K * L ** B.p) / (B.c * tol), { places: 2 })}\), which gives \(n \ge ${num(need, { places: 3 })}\).`,
      kind === 'S' ? R`Round up to an even whole number: \(n = ${n}\).${up % 2 ? R` (\(${up}\) is odd, and Simpson's rule needs even \(n\).)` : ''}` : R`Round up: \(n = ${n}\).`,
    ],
    rule: 5,
    skill: 'choosing n',
    check: () => checkEqual(smallestN(kind, K, L, tol), n, 0, 'smallest n by search'),
  });
}

function hardSimpsonCubic(rng) {
  const c = [rng.nonzero(-3, 3), rng.int(-4, 4), rng.int(-5, 5), rng.int(-6, 6)];
  const a = rng.int(-2, 2);
  const n = rng.pick([2, 4]);
  const b = a + n;
  const p = (x) => polyEval(c, x);
  const xs = range(a, b);
  const ys = xs.map(p);
  const w = (i) => (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
  const ws = sum(ys.map((y, i) => w(i) * y));
  const S = frac(ws, 3);
  const Tn = frac(sum(ys.map((y, i) => (i === 0 || i === n ? y : 2 * y))), 2);
  const Mn = frac(Math.round(8 * approx(p, a, b, n, 'M')), 8);
  const exactI = integrate(p, a, b, 2000);
  if (Math.abs(exactI) < 1e-9) return hardSimpsonCubic(rng);
  return q({
    prompt: R`Use Simpson's rule with \(n = ${n}\) on \(\displaystyle\int_{${a}}^{${b}} \left(${poly(c)}\right)dx\). What value does it give, and how does it compare with the exact integral?`,
    correct: R`\(${S.tex()}\), exactly the integral`,
    wrong: [
      { value: R`\(${S.tex()}\), an overestimate`, why: R`Simpson's rule is exact for every polynomial of degree 3 or less: \(f^{(4)}(x) = 0\), so the error bound is 0.` },
      Tn.eq(S) ? null : { value: R`\(${Tn.tex()}\), exactly the integral`, why: R`That is the trapezoidal rule \(T_{${n}}\). Simpson's rule uses weights \(1, 4, 2, \ldots, 4, 1\) and \(\frac{\Delta x}{3}\).` },
      Mn.eq(S) ? null : R`\(${Mn.tex()}\), an underestimate`,
      R`\(${S.mul(frac(3, 2)).tex()}\), exactly the integral`,
      R`\(${S.tex()}\), an underestimate`,
    ],
    solution: [
      R`\(\Delta x = 1\). The values at \(x = ${xs.join(', ')}\) are \(${ys.join(', ')}\).`,
      R`\(S_{${n}} = \dfrac{1}{3}\left[${ys.map((y, i) => (w(i) === 1 ? paren(y) : `${w(i)}${y < 0 ? `(${y})` : `(${y})`}`)).join(' + ')}\right] = \dfrac{${ws}}{3} = ${S.tex()}\).`,
      R`The integrand is a cubic, so \(f^{(4)} = 0\) and Simpson's error bound is \(0\): the value is exact.`,
    ],
    rule: 2,
    skill: "Simpson's rule is exact for cubics",
    check: () => {
      const P = [c[0] / 4, c[1] / 3, c[2] / 2, c[3], 0];
      return checkEqual(polyEval(P, b) - polyEval(P, a), S.value, 1e-9, 'exact integral') === true && checkEqual(exactI, S.value, 1e-9, 'numeric integral');
    },
  });
}

const BOUND_STORIES = [
  { what: (name, h) => `${name} logs a car's speed every ${h} seconds during a test drive`, y: 'v(t)', yu: 'm/s', xu: 's', est: 'the distance travelled', unit: 'm', hs: [2, 4, 5], base: [10, 25], step: [-2, 3], Ks: [0.2, 0.3, 0.4, 0.5] },
  { what: (name, h) => `${name} records the flow rate of a pipeline every ${h} minutes`, y: 'r(t)', yu: 'liters per minute', xu: 'min', est: 'the volume delivered', unit: 'L', hs: [5, 10], base: [40, 80], step: [-5, 5], Ks: [0.1, 0.2, 0.3] },
];

function hardWordErrorBound(rng) {
  const s = rng.pick(BOUND_STORIES);
  const name = person(rng);
  const h = rng.pick(s.hs);
  const n = rng.int(4, 6);
  const ts = range(0, n).map((i) => i * h);
  const ys = [rng.int(...s.base)];
  for (let i = 1; i <= n; i++) ys.push(Math.max(1, ys[i - 1] + rng.int(...s.step)));
  // K must be at least as large as the data allow: a second difference divided by Δt² equals v'' somewhere.
  const need = Math.max(...range(1, n - 1).map((i) => Math.abs(ys[i + 1] - 2 * ys[i] + ys[i - 1]))) / (h * h);
  const K = Math.max(rng.pick(s.Ks), Math.ceil(need * 10) / 10);
  const Tn = chordArea(ts, ys);
  const Lw = n * h;
  const E = (K * Lw ** 3) / (12 * n * n);
  const Tsum = h * sum(ys.map((y, i) => (i === 0 || i === n ? y / 2 : y)));
  const pair = (t, e) => R`\(T_{${n}} = ${num(round(t, 2))}\) ${s.unit}; bound \(${D(e, 2)}\) ${s.unit}`;
  return q({
    prompt: R`${s.what(name, h)}. An engineer knows that \(|${s.y.replace('(t)', "''(t)")}| \le ${num(K)}\) over the whole run. Find the trapezoidal estimate \(T_{${n}}\) of ${s.est} over the ${Lw} ${s.xu}, and the error bound for it.`,
    visual: dataTable(`t \\text{ (${s.xu})}`, `${s.y} \\text{ (${s.yu})}`, ts, ys, `Table of readings. At t = ${ts.join(', ')} ${s.xu} the readings are ${ys.join(', ')} ${s.yu}.`),
    correct: pair(Tn, E),
    wrong: [
      { value: pair(Tn, E / 2), why: R`\(\frac{K(b - a)^{3}}{24n^{2}}\) is the midpoint-rule bound. The trapezoidal bound has \(12n^{2}\).` },
      { value: pair(Tn, E * n), why: R`The bound has \(n^{2}\) in the denominator, not \(n\).` },
      { value: pair(h * sum(ys), E), why: 'In the trapezoidal rule the first and last readings are counted with weight ½. That adds every reading in full.' },
      pair(Tn, (K * Lw ** 2) / (12 * n * n)),
    ],
    solution: [
      R`\(\Delta t = ${h}\), \(n = ${n}\): \(T_{${n}} = \dfrac{${h}}{2}\left[${ys.map((y, i) => (i === 0 || i === n ? y : `2(${y})`)).join(' + ')}\right] = ${num(round(Tn, 2))}\) ${s.unit}.`,
      R`Error bound with \(K = ${num(K)}\) and \(b - a = ${Lw}\): \(\dfrac{K(b - a)^{3}}{12n^{2}} = \dfrac{${num(K)}(${Lw})^{3}}{12(${n})^{2}} \approx ${D(E, 2)}\) ${s.unit}.`,
      R`So \(T_{${n}} = ${num(round(Tn, 2))}\) ${s.unit}, and the true value is within \(${D(E, 2)}\) ${s.unit} of it.`,
    ],
    rule: 4,
    skill: 'error bounds',
    // For f'' ≡ K the trapezoidal error is exactly K(b − a)Δx²/12, which is the bound: test it on (K/2)t².
    check: () => {
      const g = (t) => (K / 2) * t * t;
      const errExact = approx(g, 0, Lw, n, 'T') - integrate(g, 0, Lw, 2000);
      return checkEqual(Tsum, Tn, 1e-9, 'T from the table') === true && checkEqual(errExact, E, 1e-8, 'bound attained by a quadratic');
    },
  });
}

// ───────────── Challenge ─────────────

function challengeS2n(rng) {
  for (let tries = 0; tries < 40; tries++) {
    const fn = rng.pick(FNS.filter((g) => g.plain !== 'x³'));
    const [a, b] = rng.pick(fn.spans);
    const n = rng.pick([2, 3, 4]);
    const Mn = round(approx(fn.f, a, b, n, 'M'), 5);
    const Tn = round(approx(fn.f, a, b, n, 'T'), 5);
    if (Math.abs(Mn - Tn) < 0.03) continue;
    const S = (2 * Mn + Tn) / 3;
    return q({
      prompt: R`For \(\displaystyle\int_{${a}}^{${b}} ${fn.tex}\,dx\), the midpoint and trapezoidal rules give \(M_{${n}} = ${D(Mn, 5)}\) and \(T_{${n}} = ${D(Tn, 5)}\). Without evaluating the function again, find Simpson's approximation \(S_{${2 * n}}\). Round to four decimal places.`,
      correct: round(S, 4),
      fmt: (v) => M(D(v)),
      wrong: apart(S, [
        { value: (Mn + Tn) / 2, why: R`That is \(T_{${2 * n}}\), the trapezoidal rule with twice as many subintervals. Simpson's rule weights the midpoint rule twice: \(S_{2n} = \frac{2M_{n} + T_{n}}{3}\).` },
        { value: (Mn + 2 * Tn) / 3, why: R`The weights are the other way round. \(M_{n}\) is about twice as accurate as \(T_{n}\), so it gets weight 2.` },
        (4 * Mn - Tn) / 3,
        2 * Mn - Tn,
      ], 4),
      solution: [
        R`The ${2 * n} subintervals of \(S_{${2 * n}}\) use the endpoints of the ${n} subintervals (weights from \(T_{${n}}\)) and their midpoints (weight 4).`,
        R`Adding \(2M_{${n}}\) and \(T_{${n}}\) and dividing by 3 gives exactly those weights: \(S_{${2 * n}} = \dfrac{2M_{${n}} + T_{${n}}}{3}\).`,
        R`\(S_{${2 * n}} = \dfrac{2(${D(Mn, 5)}) + ${Tn < 0 ? `(${D(Tn, 5)})` : D(Tn, 5)}}{3} \approx ${D(S)}\).`,
      ],
      rule: 2,
      skill: 'combining the rules',
      check: () => {
        const direct = approx(fn.f, a, b, 2 * n, 'S');
        const exactId = (2 * approx(fn.f, a, b, n, 'M') + approx(fn.f, a, b, n, 'T')) / 3;
        return checkEqual(simpCheck(fn.f, a, b, 2 * n), exactId, 1e-9, 'identity') === true && (Math.abs(direct - S) < 2e-5 ? true : `direct S ${direct} vs ${S}`);
      },
    });
  }
  throw new Error('challengeS2n: no suitable function');
}

function challengeSimpsonMissing(rng) {
  const n = rng.pick([4, 6]);
  const h = rng.pick([1, 2, 3]);
  const xs = range(0, n).map((i) => i * h);
  const ys = range(0, n).map(() => rng.int(2, 15));
  const j = rng.int(0, n);
  const w = (i) => (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
  // Make the weighted sum a multiple of 3 by nudging an end value that is not k.
  const fix = j === 0 ? n : 0;
  while (sum(ys.map((y, i) => w(i) * y)) % 3) ys[fix] += 1;
  const k = ys[j];
  const ws = sum(ys.map((y, i) => w(i) * y));
  const S = (h * ws) / 3;
  const rest = ws - w(j) * k;
  const tidy = (v) => (Number.isInteger(2 * v) && v > 0 ? v : null);
  const altW = w(j) === 4 ? 2 : w(j) === 2 ? 4 : 2;
  const tw = (i) => (i === 0 || i === n ? 1 : 2);
  const restT = sum(ys.map((y, i) => (i === j ? 0 : tw(i) * y)));
  return q({
    prompt: R`The table gives values of a continuous function \(f\), where \(k\) is a constant. Simpson's rule with the ${n} subintervals in the table gives \(\displaystyle\int_{0}^{${xs[n]}} f(x)\,dx \approx ${num(S)}\). Find \(k\).`,
    visual: { type: 'table', headers: [M('x'), ...xs.map((x) => M(num(x)))], rows: [[M('f(x)'), ...ys.map((y, i) => M(i === j ? 'k' : num(y)))]], rowHeaders: true, alt: `Table of values of f. At x = ${xs.join(', ')} the values are ${ys.map((y, i) => (i === j ? 'k' : y)).join(', ')}.` },
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: tidy(((3 * S) / h - rest) / altW), why: R`\(f(${xs[j]})\) is point number ${j}, so its Simpson weight is \(${w(j)}\), not \(${altW}\).` },
      { value: tidy(((2 * S) / h - restT) / tw(j)), why: R`That treats \(${num(S)}\) as a trapezoidal estimate. Simpson's rule has weights \(1, 4, 2, \ldots, 4, 1\) and \(\frac{\Delta x}{3}\).` },
      { value: tidy((S / h - rest) / w(j)), why: R`Multiply both sides by \(\frac{3}{\Delta x} = \frac{3}{${h}}\) before solving.` },
      k + 1,
      k - 1,
      k + 2,
    ],
    solution: [
      R`Weights \(${range(0, n).map(w).join(', ')}\) and \(\Delta x = ${h}\): \(\dfrac{${h}}{3}\left[${ys.map((y, i) => (i === j ? (w(i) === 1 ? 'k' : `${w(i)}k`) : w(i) === 1 ? y : `${w(i)}(${y})`)).join(' + ')}\right] = ${num(S)}\).`,
      R`Multiply by \(${h === 1 ? '3' : R`\frac{3}{${h}}`}\): \(${w(j) === 1 ? 'k' : `${w(j)}k`} + ${rest} = ${ws}\).`,
      w(j) === 1 ? R`So \(k = ${ws} - ${rest} = ${k}\).` : R`So \(${w(j)}k = ${ws - rest}\), and \(k = ${k}\).`,
    ],
    rule: 2,
    skill: 'working backwards',
    check: () => checkEqual(parabolaArea(xs, ys), S, 1e-9, 'Simpson sum with this k'),
  });
}

const FINDK = [
  { tex: '\\frac{1}{x}', f: (x) => 1 / x, ds: [(x) => -1 / x ** 2, (x) => 2 / x ** 3, (x) => -6 / x ** 4, (x) => 24 / x ** 5], d2tex: '\\frac{2}{x^{3}}', d4tex: '\\frac{24}{x^{5}}', a: 1, bs: [2, 3], K: [null, null, 2, null, 24], where: R`\(x = 1\)` },
  { tex: '\\ln x', f: Math.log, ds: [(x) => 1 / x, (x) => -1 / x ** 2, (x) => 2 / x ** 3, (x) => -6 / x ** 4], d2tex: '-\\frac{1}{x^{2}}', d4tex: '-\\frac{6}{x^{4}}', a: 1, bs: [2, 3, 4], K: [null, null, 1, null, 6], where: R`\(x = 1\)` },
  { tex: 'e^{-2x}', f: (x) => Math.exp(-2 * x), ds: [(x) => -2 * Math.exp(-2 * x), (x) => 4 * Math.exp(-2 * x), (x) => -8 * Math.exp(-2 * x), (x) => 16 * Math.exp(-2 * x)], d2tex: '4e^{-2x}', d4tex: '16e^{-2x}', a: 0, bs: [1, 2], K: [null, null, 4, null, 16], where: R`\(x = 0\)`, chain: [2, 2] },
  { tex: '\\sin 3x', f: (x) => Math.sin(3 * x), ds: [(x) => 3 * Math.cos(3 * x), (x) => -9 * Math.sin(3 * x), (x) => -27 * Math.cos(3 * x), (x) => 81 * Math.sin(3 * x)], d2tex: '-9\\sin 3x', d4tex: '81\\sin 3x', a: 0, bs: [1, 2], K: [null, null, 9, null, 81], where: R`\(x = \frac{\pi}{6}\), where \(|\sin 3x| = 1\)`, chain: [3, 3] },
];

function challengeFindKAndN(rng) {
  const g = rng.pick(FINDK);
  const kind = rng.pick(['T', 'M', 'S']);
  const b = rng.pick(g.bs);
  const L = b - g.a;
  const ord = BOUND[kind].ord;
  const K = g.K[ord];
  const tol = rng.pick([0.001, 0.0005, 0.0001, 0.00001]);
  const B = BOUND[kind];
  const need = ((K * L ** B.p) / (B.c * tol)) ** (1 / B.e);
  if (Math.abs(need - Math.round(need)) < 0.03 || need < 1.5) return challengeFindKAndN(rng);
  const nOf = (KK, kk = kind) => {
    const BB = BOUND[kk];
    const up = Math.ceil(((KK * L ** BB.p) / (BB.c * tol)) ** (1 / BB.e));
    return kk === 'S' ? up + (up % 2) : up;
  };
  const n = nOf(K);
  const atB = Math.abs(g.ds[ord - 1](b));
  const wrongKval = g.chain ? K / g.chain[0] : atB;
  return q({
    prompt: R`What is the smallest \(n\) for which the error bound guarantees that ${ART[kind]} approximates \(\displaystyle\int_{${g.a}}^{${b}} ${g.tex}\,dx\) to within \(${num(tol)}\)?`,
    correct: n,
    fmt: (v) => R`\(n = ${v}\)`,
    wrong: [
      { value: nOf(wrongKval), why: g.chain ? R`Each derivative of the inside function brings out another factor from the chain rule, so \(K = ${K}\).` : R`\(|f^{${ord === 2 ? '\\prime\\prime' : '(4)'}}|\) is largest at ${g.where}, not at \(x = ${b}\). \(K\) must bound it on the whole interval.` },
      kind !== 'S' ? { value: nOf(K, kind === 'T' ? 'M' : 'T'), why: R`That uses the ${NAME[kind === 'T' ? 'M' : 'T']} bound. The ${NAME[kind]} has \(${B.c}n^{2}\) in the denominator.` } : (Math.ceil(need) % 2 ? { value: Math.ceil(need), why: "Simpson's rule needs an even number of subintervals." } : null),
      kind === 'S' ? n + 2 : n + 1,
      kind === 'S' ? Math.max(2, n - 2) : n - 1,
      kind === 'S' ? n + 4 : n + 2,
    ],
    solution: [
      R`\(f^{${ord === 2 ? "\\prime\\prime" : '(4)'}}(x) = ${ord === 2 ? g.d2tex : g.d4tex}\). Its absolute value on \([${g.a}, ${b}]\) is at most \(${K}\) (reached at ${g.where}), so \(K = ${K}\).`,
      R`Require \(\dfrac{${K}(${L})^{${B.p}}}{${B.c}n^{${B.e}}} \le ${num(tol)}\): \(n^{${B.e}} \ge ${num((K * L ** B.p) / (B.c * tol), { places: 2 })}\), so \(n \ge ${num(need, { places: 3 })}\).`,
      kind === 'S' ? R`The smallest even whole number that large is \(n = ${n}\).` : R`Round up: \(n = ${n}\).`,
    ],
    rule: 5,
    skill: 'choosing n',
    check: () => {
      // Each listed derivative is the derivative of the one before; K is the largest |f^(ord)| on [a, b].
      const chain = [g.f, ...g.ds];
      for (let i = 1; i <= 4; i++) {
        const r = [0.3, 0.7, 1.1].every((x) => close(numDeriv(chain[i - 1], g.a + x * L * 0.8 + 0.05, 1e-4), chain[i](g.a + x * L * 0.8 + 0.05), 1e-4));
        if (!r) return `derivative ${i} formula`;
      }
      const sampled = Math.max(...grid(g.a, b, 2000).map((x) => Math.abs(chain[ord](x))));
      if (!close(sampled, K, 1e-4)) return `K: sampled ${sampled}, used ${K}`;
      return checkEqual(smallestN(kind, K, L, tol), n, 0, 'smallest n by search');
    },
  });
}

// ───────────── Pictures for the lesson ─────────────

function rulePicture(f, a, b, n, kind, plain) {
  const h = (b - a) / n;
  const ys = grid(a - 0.3, b + 0.3, 60).map(f);
  const hi = Math.max(0, ...ys);
  const lo = Math.min(0, ...ys);
  const pic = { type: 'plot', x: [a - 0.3, b + 0.3], y: [lo - 0.08 * (hi - lo), hi + 0.12 * (hi - lo)], fns: [{ f }] };
  if (kind === 'M') pic.rects = range(0, n - 1).map((i) => ({ x: a + i * h, w: h, h: f(a + (i + 0.5) * h) }));
  else pic.polygons = range(0, n - 1).map((i) => ({ points: [[a + i * h, 0], [a + i * h, f(a + i * h)], [a + (i + 1) * h, f(a + (i + 1) * h)], [a + (i + 1) * h, 0]] }));
  pic.alt = `Graph of y = ${plain} from x = ${a} to x = ${b}, split into ${n} subintervals of width ${num(h)}. ${kind === 'M' ? `Each rectangle has the height of the curve at the middle of its subinterval; the midpoint rule gives about ${T(approx(f, a, b, n, 'M'))}.` : `Each trapezoid joins the curve's values at the two ends of its subinterval with a straight chord; the trapezoidal rule gives about ${T(approx(f, a, b, n, 'T'))}.`}`;
  return pic;
}

const inv = (x) => 1 / x;
const [M4, T4, S4] = ['M', 'T', 'S'].map((k) => approx(inv, 1, 2, 4, k));
const RIVER = { h: 4, d: [0, 1.2, 2.6, 3.1, 2.4, 1.0, 0] };
const riverS = (RIVER.h / 3) * sum(RIVER.d.map((y, i) => y * (i === 0 || i === 6 ? 1 : i % 2 ? 4 : 2)));
const riverT = chordArea(range(0, 6).map((i) => i * RIVER.h), RIVER.d);

// ───────────── Topic ─────────────

export default {
  id: 'numerical-integration',
  title: 'Numerical Integration',
  summary: "Approximate integrals with the midpoint, trapezoidal and Simpson's rules, and use error bounds to choose n.",
  standards: ['Calculus II: approximate integration', 'AP Calculus 6.2'],

  explain: {
    intro: R`Most integrals have no elementary antiderivative, and data from measurements has no formula at all. Split \([a, b]\) into \(n\) subintervals of width \(\Delta x = \frac{b - a}{n}\) and replace \(f\) on each piece by something easy to integrate: a constant (midpoint rule), a line (trapezoidal rule) or a parabola (Simpson's rule). Error bounds then say how large \(n\) must be.`,
    rules: [
      {
        title: 'Midpoint rule',
        text: R`\(M_{n} = \Delta x\left[f(\bar{x}_{1}) + f(\bar{x}_{2}) + \cdots + f(\bar{x}_{n})\right]\), where \(\bar{x}_{i}\) is the midpoint of the \(i\)th subinterval. From a table, the midpoints must be readings: \(n\) subintervals need \(2n + 1\) evenly spaced readings, using every other one.`,
        example: R`\(\displaystyle\int_{1}^{2} \frac{dx}{x}\), \(n = 4\): \(M_{4} = 0.25\left[f(1.125) + f(1.375) + f(1.625) + f(1.875)\right] \approx ${D(M4)}\).`,
      },
      {
        title: 'Trapezoidal rule',
        text: R`\(T_{n} = \dfrac{\Delta x}{2}\left[f(x_{0}) + 2f(x_{1}) + 2f(x_{2}) + \cdots + 2f(x_{n-1}) + f(x_{n})\right]\): each piece of the curve is replaced by a chord. It is the average of the left and right sums.`,
        example: R`\(\displaystyle\int_{1}^{2} \frac{dx}{x}\), \(n = 4\): \(T_{4} = 0.125\left[1 + 2(0.8) + 2(0.6667) + 2(0.5714) + 0.5\right] \approx ${D(T4)}\).`,
      },
      {
        title: "Simpson's rule (n even)",
        text: R`\(S_{n} = \dfrac{\Delta x}{3}\left[f(x_{0}) + 4f(x_{1}) + 2f(x_{2}) + 4f(x_{3}) + \cdots + 4f(x_{n-1}) + f(x_{n})\right]\): a parabola through each pair of subintervals. It is exact for every polynomial of degree 3 or less, and \(S_{2n} = \dfrac{2M_{n} + T_{n}}{3}\).`,
        example: R`\(\displaystyle\int_{1}^{2} \frac{dx}{x}\), \(n = 4\): \(S_{4} \approx ${D(S4, 6)}\), while \(\ln 2 \approx 0.693147\).`,
      },
      {
        title: 'Over or under? Look at concavity',
        text: R`If \(f'' > 0\) (concave up), chords lie above the curve, so \(T_{n}\) is too large, and tangent lines lie below it, so \(M_{n}\) is too small: \(M_{n} < \int_{a}^{b} f\,dx < T_{n}\). If \(f'' < 0\) the inequalities reverse. The midpoint error is about half the trapezoidal error, with the opposite sign.`,
        example: R`\(1/x\) is concave up on \([1, 2]\): \(M_{4} \approx ${D(M4)} < \ln 2 < T_{4} \approx ${D(T4)}\).`,
      },
      {
        title: 'Error bounds',
        text: R`If \(|f''(x)| \le K\) on \([a, b]\), then \(|E_{T}| \le \dfrac{K(b - a)^{3}}{12n^{2}}\) and \(|E_{M}| \le \dfrac{K(b - a)^{3}}{24n^{2}}\). If \(|f^{(4)}(x)| \le K\), then \(|E_{S}| \le \dfrac{K(b - a)^{5}}{180n^{4}}\). \(K\) is the largest value of the derivative's absolute value on the whole interval.`,
        example: R`For \(1/x\) on \([1, 2]\), \(f'' = 2/x^{3} \le 2\), so \(|E_{T}| \le \dfrac{2(1)^{3}}{12(4)^{2}} = \dfrac{1}{96} \approx 0.0104\) when \(n = 4\).`,
      },
      {
        title: 'Choosing n for a given accuracy',
        text: R`Set the error bound \(\le\) the tolerance and solve for \(n\). Round up to a whole number, and for Simpson's rule up to an even one. Doubling \(n\) divides the \(T\) and \(M\) bounds by 4 and the Simpson bound by 16.`,
        example: R`\(T_{n}\) for \(\int_{1}^{2} dx/x\) within \(10^{-4}\): \(\dfrac{2}{12n^{2}} \le 10^{-4}\) gives \(n^{2} \ge 1666.7\), \(n \ge 40.8\), so \(n = 41\).`,
      },
    ],
    vocab: [
      { term: 'subinterval width', def: R`\(\Delta x = \frac{b - a}{n}\), with points \(x_{i} = a + i\,\Delta x\).` },
      { term: 'error', def: R`\(E = \int_{a}^{b} f\,dx - (\text{approximation})\). A bound limits \(|E|\) without knowing the integral.` },
      { term: 'K', def: R`A number with \(|f''(x)| \le K\) (or \(|f^{(4)}(x)| \le K\) for Simpson) for every \(x\) in \([a, b]\).` },
      { term: 'concave up', def: R`\(f'' > 0\): the graph bends upward, chords lie above it and tangent lines below it.` },
    ],
    mistakes: [
      R`Using \(\Delta x\) instead of \(\frac{\Delta x}{2}\) in the trapezoidal rule, or \(\frac{\Delta x}{2}\) instead of \(\frac{\Delta x}{3}\) in Simpson's rule.`,
      R`Mixing up Simpson's weights: the pattern is \(1, 4, 2, 4, \ldots, 2, 4, 1\), with 4 at every odd-numbered point.`,
      R`Using Simpson's rule with an odd \(n\). It works on pairs of subintervals.`,
      R`Taking \(K\) from the wrong end of the interval. \(K\) must be at least the largest value of \(|f''|\) (or \(|f^{(4)}|\)) anywhere on \([a, b]\).`,
      R`Rounding \(n\) down. A bound just above the tolerance is not good enough.`,
    ],
    visual: rulePicture(Math.exp, 0, 2, 4, 'T', 'eˣ'),
  },

  examples: [
    {
      title: 'Midpoint and trapezoidal rules',
      problem: R`Approximate \(\displaystyle\int_{1}^{2} \frac{1}{x}\,dx = \ln 2\) with \(M_{4}\) and \(T_{4}\), and say which is too large.`,
      steps: [
        R`\(\Delta x = 0.25\). Midpoints \(1.125, 1.375, 1.625, 1.875\): \(M_{4} = 0.25(0.8889 + 0.7273 + 0.6154 + 0.5333) \approx ${D(M4)}\).`,
        R`Points \(1, 1.25, 1.5, 1.75, 2\): \(T_{4} = 0.125\left[1 + 2(0.8) + 2(0.6667) + 2(0.5714) + 0.5\right] \approx ${D(T4)}\).`,
        R`\(f''(x) = 2/x^{3} > 0\): concave up, so \(T_{4}\) is too large and \(M_{4}\) too small. Indeed \(\ln 2 \approx 0.6931\) lies between them.`,
      ],
      answer: R`\(M_{4} \approx ${D(M4)}\) (under), \(T_{4} \approx ${D(T4)}\) (over)`,
      visual: rulePicture(inv, 1, 2, 4, 'M', '1/x'),
    },
    {
      title: "Simpson's rule",
      problem: R`Approximate \(\displaystyle\int_{1}^{2} \frac{1}{x}\,dx\) with \(S_{4}\).`,
      steps: [
        R`\(\Delta x = 0.25\), weights \(1, 4, 2, 4, 1\): \(S_{4} = \dfrac{0.25}{3}\left[1 + 4(0.8) + 2(0.6667) + 4(0.5714) + 0.5\right]\).`,
        R`\(S_{4} \approx ${D(S4, 6)}\). The error is about \(0.0001\), roughly a hundred times smaller than for \(T_{4}\).`,
        R`Check: \(\dfrac{2M_{2} + T_{2}}{3}\) gives the same number, since \(S_{4} = \frac{2M_{2} + T_{2}}{3}\).`,
      ],
      answer: R`\(S_{4} \approx ${D(S4, 6)}\)`,
    },
    {
      title: "Word problem: a river's cross-section",
      word: true,
      problem: R`A surveyor measures the depth of a river every ${RIVER.h} m across its 24 m width: \(${RIVER.d.join(', ')}\) m. Estimate the area of the cross-section with Simpson's rule.`,
      steps: [
        R`\(n = 6\) (even) and \(\Delta x = 4\). Weights \(1, 4, 2, 4, 2, 4, 1\).`,
        R`\(S_{6} = \dfrac{4}{3}\left[0 + 4(1.2) + 2(2.6) + 4(3.1) + 2(2.4) + 4(1.0) + 0\right] = \dfrac{4}{3}(31.2)\).`,
        R`\(S_{6} = ${D(riverS, 1)}\) m². (The trapezoidal rule gives \(${D(riverT, 1)}\) m².)`,
      ],
      answer: R`About \(${D(riverS, 1)}\) m²`,
      visual: { type: 'plot', x: [-1, 25], y: [-3.6, 0.6], axisLabels: ['x (m)', 'depth'], points: RIVER.d.map((d, i) => ({ x: i * RIVER.h, y: -d })), segments: RIVER.d.slice(1).map((d, i) => ({ from: [i * RIVER.h, -RIVER.d[i]], to: [(i + 1) * RIVER.h, -d], color: 'a' })), alt: 'The river bed drawn below the water surface: depths 0, 1.2, 2.6, 3.1, 2.4, 1.0 and 0 m at x = 0, 4, 8, 12, 16, 20 and 24 m.' },
    },
    {
      title: 'Choosing n',
      problem: R`How large must \(n\) be for Simpson's rule to approximate \(\displaystyle\int_{1}^{2} \frac{1}{x}\,dx\) within \(10^{-6}\)?`,
      steps: [
        R`\(f^{(4)}(x) = \dfrac{24}{x^{5}}\), largest at \(x = 1\): \(K = 24\).`,
        R`\(\dfrac{24(1)^{5}}{180n^{4}} \le 10^{-6}\) gives \(n^{4} \ge 133\,333.3\), so \(n \ge 19.1\).`,
        R`Round up to an even number: \(n = 20\). (The trapezoidal rule would need \(n = 409\).)`,
      ],
      answer: R`\(n = 20\)`,
    },
  ],

  models: [
    {
      id: 'three-rules',
      title: 'Compare the three rules',
      intro: 'Choose a function, an interval and n. See M, T and S side by side, and how far each is from a high-accuracy value.',
      inputs: [
        { name: 'fn', label: 'Function', type: 'select', value: 'inv', options: [{ value: 'inv', label: '1/x' }, { value: 'exp', label: 'eˣ' }, { value: 'sqrt', label: '√x' }, { value: 'gauss', label: 'e^(−x²)' }, { value: 'sin', label: 'sin x' }] },
        { name: 'a', label: 'Lower limit a', type: 'number', min: -3, max: 5, step: 0.5, value: 1 },
        { name: 'b', label: 'Upper limit b', type: 'number', min: -2, max: 6, step: 0.5, value: 2 },
        { name: 'n', label: 'Subintervals n', type: 'int', min: 1, max: 20, value: 4 },
        { name: 'pic', label: 'Picture', type: 'select', value: 'M', options: [{ value: 'M', label: 'midpoint rectangles' }, { value: 'T', label: 'trapezoids' }] },
      ],
      compute({ fn, a, b, n, pic }) {
        const F = { inv: [(x) => 1 / x, '\\frac{1}{x}', '1/x'], exp: [Math.exp, 'e^{x}', 'eˣ'], sqrt: [Math.sqrt, '\\sqrt{x}', '√x'], gauss: [(x) => Math.exp(-x * x), 'e^{-x^{2}}', 'e^(−x²)'], sin: [Math.sin, '\\sin x', 'sin x'] }[fn];
        if (b <= a) return { error: 'Make the upper limit b larger than the lower limit a.' };
        if (fn === 'inv' && a <= 0) return { error: '1/x is not defined at 0, so choose a > 0.' };
        if (fn === 'sqrt' && a < 0) return { error: '√x is not defined for negative x, so choose a ≥ 0.' };
        const [f, tex, plain] = F;
        const I = integrate(f, a, b, 20000);
        const m = approx(f, a, b, n, 'M');
        const t = approx(f, a, b, n, 'T');
        const p6 = (v) => D(v, 6);
        const errText = (err) => (Math.abs(err) < 5e-7 ? R`error below \(10^{-6}\)` : R`error \(${num(round(err, 6))}\)`);
        const steps = [
          R`\(\Delta x = \dfrac{${num(b)} - ${paren(a)}}{${n}} = ${num((b - a) / n, { places: 4 })}\).`,
          R`\(M_{${n}} \approx ${p6(m)}\) (${errText(I - m)}); \(T_{${n}} \approx ${p6(t)}\) (${errText(I - t)}).`,
        ];
        let sNote = '';
        if (n % 2 === 0) {
          const s = approx(f, a, b, n, 'S');
          steps.push(R`\(S_{${n}} \approx ${p6(s)}\) (${errText(I - s)}), the same as \(\frac{2M_{${n / 2}} + T_{${n / 2}}}{3}\).`);
        } else sNote = " Simpson's rule needs an even n, so it is not shown.";
        steps.push(R`High-accuracy value: \(\displaystyle\int_{${num(a)}}^{${num(b)}} ${tex}\,dx \approx ${p6(I)}\).`);
        return {
          problem: R`Approximate \(\displaystyle\int_{${num(a)}}^{${num(b)}} ${tex}\,dx\) with \(n = ${n}\).`,
          steps,
          answer: R`\(M_{${n}} \approx ${p6(m)}\), \(T_{${n}} \approx ${p6(t)}\)${n % 2 === 0 ? R`, \(S_{${n}} \approx ${p6(approx(f, a, b, n, 'S'))}\)` : ''}`,
          note: `The midpoint error is about half the trapezoidal error, with the opposite sign.${sNote}`,
          visual: rulePicture(f, a, b, n, pic, plain),
        };
      },
    },
    {
      id: 'river-section',
      title: "Word problem: a river's cross-section",
      word: true,
      intro: 'A surveyor wades across a river and measures the depth at 5 evenly spaced points (the depth is 0 at both banks). Enter the spacing and the depths.',
      inputs: [
        { name: 'h', label: 'Spacing between readings (m)', type: 'number', min: 0.5, max: 20, step: 0.5, value: 3 },
        { name: 'd1', label: 'Depth 1 (m)', type: 'number', min: 0, max: 30, step: 0.1, value: 0.8 },
        { name: 'd2', label: 'Depth 2 (m)', type: 'number', min: 0, max: 30, step: 0.1, value: 1.9 },
        { name: 'd3', label: 'Depth 3 (m)', type: 'number', min: 0, max: 30, step: 0.1, value: 2.5 },
        { name: 'd4', label: 'Depth 4 (m)', type: 'number', min: 0, max: 30, step: 0.1, value: 1.7 },
        { name: 'd5', label: 'Depth 5 (m)', type: 'number', min: 0, max: 30, step: 0.1, value: 0.6 },
      ],
      compute({ h, d1, d2, d3, d4, d5 }) {
        const d = [0, d1, d2, d3, d4, d5, 0];
        if (d.every((v) => v === 0)) return { error: 'All the depths are 0, so there is no water to measure. Enter at least one depth greater than 0.' };
        const xs = range(0, 6).map((i) => i * h);
        const wts = [1, 4, 2, 4, 2, 4, 1];
        const ws = sum(d.map((v, i) => wts[i] * v));
        const S = (h / 3) * ws;
        const Tt = h * sum(d.slice(1, 6));
        const deep = Math.max(...d);
        return {
          problem: R`Depths of \(${d.map((v) => num(v)).join(', ')}\) m are measured every ${num(h)} m across a river ${num(6 * h)} m wide. Estimate the area of its cross-section.`,
          steps: [
            R`There are \(n = 6\) subintervals (even), each \(\Delta x = ${num(h)}\) m wide. The banks have depth 0.`,
            R`Trapezoidal rule: \(T_{6} = \dfrac{${num(h)}}{2}\left[0 + 2(${[d1, d2, d3, d4, d5].map((v) => num(v)).join(' + ')}) + 0\right] = ${D(Tt, 2)}\) m².`,
            R`Simpson's rule: \(S_{6} = \dfrac{${num(h)}}{3}\left[0 + 4(${num(d1)}) + 2(${num(d2)}) + 4(${num(d3)}) + 2(${num(d4)}) + 4(${num(d5)}) + 0\right] = \dfrac{${num(h)}}{3}(${num(round(ws, 4))}) = ${D(S, 2)}\) m².`,
          ],
          answer: R`About \(${D(S, 2)}\) m² by Simpson's rule (\(${D(Tt, 2)}\) m² by the trapezoidal rule)`,
          note: 'Simpson\'s rule fits a parabola through each three neighbouring readings, which usually follows a smooth river bed more closely than straight chords.',
          visual: {
            type: 'plot', x: [-0.05 * 6 * h, 6.05 * h], y: [-1.15 * deep, 0.2 * deep], axisLabels: ['x (m)', 'depth (m)'],
            points: d.map((v, i) => ({ x: xs[i], y: -v })),
            segments: d.slice(1).map((v, i) => ({ from: [xs[i], -d[i]], to: [xs[i + 1], -v], color: 'a' })),
            alt: `The river bed drawn below the water surface: depths ${d.map((v) => txt(v)).join(', ')} m at x = ${xs.map((x) => txt(x)).join(', ')} m.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyMidTrap, easyOverUnder, easyWordMidTable],
    medium: [mediumSimpsonFormula, mediumWordSimpsonTable, mediumErrorBound],
    hard: [hardSmallestN, hardSimpsonCubic, hardWordErrorBound],
    challenge: [challengeS2n, challengeSimpsonMissing, challengeFindKAndN],
  },
};
