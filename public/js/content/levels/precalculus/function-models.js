import { R, q, frac, Frac, linear, term, signed, num, paren, txt, round, point, checkEqual } from '../../lib/index.js';
import { M, apart, dec } from './_shared.js';

// ───────────── Helpers ─────────────

const val = (v) => (v instanceof Frac ? v.value : v);
const absF = (v) => (v instanceof Frac ? frac(Math.abs(v.n), v.d) : Math.abs(v));
// A number as plain text for pictures and alt text, with no "−0".
const t1 = (v, p = 1) => txt(round(v, p) || 0, { places: p });
const mean = (l) => l.reduce((s, v) => s + v, 0) / l.length;
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

// Coefficient in front of a symbol: 1 → "", −1 → "-", ½ → "\frac{1}{2}".
const coef = (a) => (val(a) === 1 ? '' : val(a) === -1 ? '-' : num(a));
// The input of f in a·f(b(x − h)) + k.
function inner(b, h, v = 'x') {
  if (!h) return `${coef(b)}${v}`;
  if (val(b) === 1) return linear(1, -h, v);
  return `${coef(b)}(${linear(1, -h, v)})`;
}
const gTex = ({ a = 1, b = 1, h = 0, k = 0 }, f = 'f') => `${coef(a)}${f}\\left(${inner(b, h)}\\right)${k ? ` ${signed(k)}` : ''}`;
const gOf = (f, { a = 1, b = 1, h = 0, k = 0 }) => (x) => val(a) * f(val(b) * (x - h)) + k;
// The image of (x, y) on f under a·f(b(x − h)) + k.
const image = ([x, y], { a = 1, b = 1, h = 0, k = 0 }) => [x / val(b) + h, val(a) * y + k];
// Worked arithmetic for the image of a point: "p ÷ b + h" and "a(r) + k", leaving out steps that do nothing.
function xWork(p, { b = 1, h = 0 }) {
  const base = val(b) === 1 ? num(p) : Number.isInteger(val(b)) ? `\\frac{${num(p)}}{${num(b)}}` : `${paren(p)} \\div ${num(b)}`;
  return h ? `${base} ${signed(h)}` : base;
}
function yWork(r, { a = 1, k = 0 }) {
  const base = val(a) === 1 ? num(r) : val(a) === -1 ? `-(${num(r)})` : `${num(a)}(${num(r)})`;
  return k ? `${base} ${signed(k)}` : base;
}
// A test function through (p, r), for checking point images.
const through = (p, r) => (x) => r + 0.5 * (x - p) + 0.25 * (x - p) ** 2;

/** Point choices, dropping any candidate equal to the answer or to an earlier one. */
function pointChoices(correct, cands) {
  const key = ([x, y]) => `${round(x, 9)},${round(y, 9)}`;
  const seen = new Set([key(correct)]);
  const out = [];
  for (const c of cands) {
    if (!c) continue;
    const v = Array.isArray(c) ? c : c.value;
    if (!v.every(Number.isFinite) || seen.has(key(v))) continue;
    seen.add(key(v));
    const tex = M(point(...v.map((t) => round(t, 2))));
    out.push(Array.isArray(c) ? tex : { value: tex, why: c.why });
  }
  return out;
}

/** Words for a·f(b(x − h)) + k, in the order the changes happen. */
function describe({ a = 1, b = 1, h = 0, k = 0 }) {
  const A = val(a);
  const B = val(b);
  const parts = [];
  if (B < 0) parts.push(R`reflect across the \(y\)-axis`);
  const inv = Number.isInteger(2 * Math.abs(B)) ? frac(2, 2 * Math.abs(B)) : round(1 / Math.abs(B), 4);
  if (Math.abs(B) > 1) parts.push(R`compress horizontally by a factor of \(${num(inv)}\)`);
  if (Math.abs(B) < 1) parts.push(R`stretch horizontally by a factor of \(${num(inv)}\)`);
  if (h) parts.push(`shift ${h > 0 ? 'right' : 'left'} ${Math.abs(h)}`);
  if (A < 0) parts.push(R`reflect across the \(x\)-axis`);
  if (Math.abs(A) > 1) parts.push(R`stretch vertically by a factor of \(${num(absF(a))}\)`);
  if (Math.abs(A) < 1) parts.push(R`compress vertically by a factor of \(${num(absF(a))}\)`);
  if (k) parts.push(`shift ${k > 0 ? 'up' : 'down'} ${Math.abs(k)}`);
  if (!parts.length) return 'No change: the graph of g is the graph of f';
  const s = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')}, then ${parts.at(-1)}`;
  return s[0].toUpperCase() + s.slice(1);
}

const PARENTS = {
  sq: { f: (x) => x * x, tex: 'x^{2}', text: 'x²', pts: [[-1, 1], [0, 0], [1, 1]], dom: 'all', ran: 'up' },
  abs: { f: Math.abs, tex: '|x|', text: '|x|', pts: [[-1, 1], [0, 0], [1, 1]], dom: 'all', ran: 'up' },
  sqrt: { f: (x) => Math.sqrt(Math.max(0, x)), tex: '\\sqrt{x}', text: '√x', pts: [[0, 0], [1, 1], [4, 2]], dom: 'right', ran: 'up' },
  cube: { f: (x) => x ** 3, tex: 'x^{3}', text: 'x³', pts: [[-1, -1], [0, 0], [1, 1]], dom: 'all', ran: 'all' },
  exp2: { f: (x) => 2 ** x, tex: '2^{x}', text: '2ˣ', pts: [[-1, 0.5], [0, 1], [1, 2]], dom: 'all', ran: 'pos' },
};
const INF = '\\infty';
function domainRange(P, { a = 1, b = 1, h = 0, k = 0 }) {
  const dom = P.dom === 'all' ? `(-${INF}, ${INF})` : val(b) > 0 ? `[${num(h)}, ${INF})` : `(-${INF}, ${num(h)}]`;
  const open = P.ran === 'pos';
  const ran = P.ran === 'all' ? `(-${INF}, ${INF})` : val(a) > 0 ? `${open ? '(' : '['}${num(k)}, ${INF})` : `(-${INF}, ${num(k)}${open ? ')' : ']'}`;
  return { dom, ran };
}

// Least squares and residual diagnostics.
function fitLine(xs, ys) {
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
  });
  const m = sxy / sxx;
  return { m, c: my - m * mx };
}
function fitExp(xs, ys) {
  const { m, c } = fitLine(xs, ys.map(Math.log));
  return { a: Math.exp(c), b: Math.exp(m) };
}
const sse = (xs, ys, f) => xs.reduce((s, x, i) => s + (ys[i] - f(x)) ** 2, 0);
const signChanges = (rs) => rs.slice(1).reduce((n, r, i) => n + (Math.sign(r) * Math.sign(rs[i]) < 0 ? 1 : 0), 0);
// Least-squares line by a second route (normal equations solved by Cramer's rule), for checks.
function lineByNormal(xs, ys) {
  const n = xs.length;
  const sx = xs.reduce((s, x) => s + x, 0);
  const sxx = xs.reduce((s, x) => s + x * x, 0);
  const sy = ys.reduce((s, y) => s + y, 0);
  const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const det = n * sxx - sx * sx;
  return { m: (n * sxy - sx * sy) / det, c: (sxx * sy - sx * sxy) / det };
}
// Share of the spread of the residuals that a parabola explains: near 1 for a curved pattern, near 0 for random scatter.
function quadShare(xs, rs) {
  const S = (p) => xs.reduce((s, x) => s + x ** p, 0);
  const T = (p) => xs.reduce((s, x, i) => s + x ** p * rs[i], 0);
  const A = [[S(4), S(3), S(2)], [S(3), S(2), S(1)], [S(2), S(1), xs.length]];
  const v = [T(2), T(1), T(0)];
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det3(A);
  const co = [0, 1, 2].map((j) => det3(A.map((row, i) => row.map((e, jj) => (jj === j ? v[i] : e)))) / d);
  const mr = mean(rs);
  const tot = rs.reduce((s, r) => s + (r - mr) ** 2, 0);
  const left = sse(xs, rs, (x) => co[0] * x * x + co[1] * x + co[2]);
  return tot ? 1 - left / tot : 0;
}
function residualPlot(xs, rs, label) {
  const top = Math.max(...rs.map(Math.abs), 0.1) * 1.35;
  return {
    type: 'plot',
    x: [Math.min(0, xs[0]) - 0.5, xs.at(-1) + 0.5],
    y: [-top, top],
    points: xs.map((x, i) => ({ x, y: rs[i] })),
    hlines: [{ y: 0 }],
    axisLabels: ['x', label],
    alt: `Residual plot for the ${label.replace(' residual', '')} model, with a dashed line at residual 0. Residuals at x = ${xs.join(', ')}: ${rs.map((r) => t1(r)).join(', ')}.`,
  };
}
const dataTable = (xs, ys, yName, places = 1) => ({
  type: 'table',
  headers: [M('x'), ...xs.map((x) => M(num(x)))],
  rows: [[M(yName), ...ys.map((y) => M(num(y, { places })))]],
  rowHeaders: true,
  alt: `Table of data. x: ${xs.join(', ')}. ${yName}: ${ys.map((y) => t1(y, places)).join(', ')}.`,
});

// ───────────── Easy ─────────────

function easyTransformPoint(rng) {
  if (rng.bool()) {
    const xs = [-2, -1, 0, 1, 2, 3];
    const ys = xs.map(() => rng.int(-6, 9));
    const a = rng.pick([1, 2, -1, 3]);
    const h = rng.nonzero(-3, 3);
    const k = rng.nonzero(-5, 5);
    const xf = rng.pick(xs);
    const x0 = xf + h;
    const at = (x) => (xs.includes(x) ? ys[xs.indexOf(x)] : null);
    const fv = at(xf);
    const ans = a * fv + k;
    const T = { a, h, k };
    return q({
      prompt: R`Use the table of \(f\). If \(g(x) = ${gTex(T)}\), what is \(g(${x0})\)?`,
      visual: dataTable(xs, ys, 'f(x)', 0),
      correct: ans,
      wrong: [
        at(x0 + h) != null ? { value: a * at(x0 + h) + k, why: R`Substitute \(x = ${x0}\) into the input: \(${x0} ${signed(-h)} = ${xf}\), so look up \(f(${xf})\), not \(f(${x0 + h})\).` } : null,
        a !== 1 ? { value: a * (fv + k), why: R`Only \(f\) is multiplied by \(${a}\). Multiply first, then add \(${k}\).` } : null,
        at(x0) != null ? a * at(x0) + k : null,
        a * fv - k,
        fv + k,
      ],
      solution: [
        R`Substitute: \(g(${x0}) = ${coef(a)}f(${x0} ${signed(-h)}) ${signed(k)}\).`,
        R`The input of \(f\) is \(${x0} ${signed(-h)} = ${xf}\), and the table gives \(f(${xf}) = ${fv}\).`,
        R`\(g(${x0}) = ${yWork(fv, T)} = ${ans}\).`,
      ],
      rule: 0,
      skill: 'transformations from a table',
      check: () => {
        // Build the table of g by moving every point of f, then look up x0.
        const moved = xs.map((x, i) => image([x, ys[i]], T));
        const hit = moved.find(([x]) => x === x0);
        return hit && hit[1] === ans ? true : 'table of g disagrees';
      },
    });
  }
  const kind = rng.pick(['shift', 'vert', 'horiz']);
  let p = rng.int(-4, 5);
  const r = rng.nonzero(-5, 6);
  let T;
  let cands;
  if (kind === 'shift') {
    const h = rng.nonzero(-5, 5);
    const k = rng.intExcept(-5, 5, [0, h]);
    T = { h, k };
    cands = [
      { value: [p - h, r + k], why: R`\(f(${inner(1, h)})\) moves the graph ${h > 0 ? 'right' : 'left'}: add \(${h}\) to the \(x\)-coordinate.` },
      { value: [p + k, r + h], why: 'The number inside the brackets moves the graph sideways; the number outside moves it up or down.' },
      [p + h, r - k],
      [p - h, r - k],
    ];
  } else if (kind === 'vert') {
    const a = rng.pick([2, 3, -2, -3, -1]);
    const k = rng.nonzero(-5, 5);
    T = { a, k };
    cands = [
      { value: [p, a * (r + k)], why: R`Multiply the \(y\)-coordinate by \(${a}\) first, then add \(${k}\).` },
      { value: [a * p, r + k], why: R`The factor \(${a}\) multiplies the output \(f(x)\), so it changes \(y\)-coordinates, not \(x\)-coordinates.` },
      [p, r + k],
      [p, -a * r + k],
      [p + k, a * r],
      [-p, a * r + k],
    ];
  } else {
    const b = rng.pick([2, 3, -1, -2]);
    p = b * rng.nonzero(-3, 3);
    const k = rng.int(-4, 4);
    T = { b, k };
    cands = [
      { value: [b * p, r + k], why: R`The input is multiplied by \(${b}\), so the graph is squeezed: divide each \(x\)-coordinate by \(${b}\).` },
      { value: [p, b * r + k], why: 'A number multiplying x inside the brackets acts horizontally, on x-coordinates.' },
      [-p / b, r + k],
      [p / b, r - k],
      [p / b, -r + k],
      [p / b + k, r],
    ];
  }
  const img = image([p, r], T);
  return q({
    prompt: R`The point \(${point(p, r)}\) is on the graph of \(y = f(x)\). Which point must be on the graph of \(y = ${gTex(T)}\)?`,
    correct: M(point(...img)),
    wrong: pointChoices(img, cands),
    solution: [
      R`A point \((x, y)\) on \(f\) moves to \(\left(\frac{x}{b} + h,\ ay + k\right)\) on \(y = af\big(b(x - h)\big) + k\). Here \(a = ${num(T.a ?? 1)}\), \(b = ${num(T.b ?? 1)}\), \(h = ${num(T.h ?? 0)}\), \(k = ${num(T.k ?? 0)}\).`,
      R`${kind === 'vert' ? R`The \(x\)-coordinate stays \(${p}\)` : R`New \(x\): \(${xWork(p, T)} = ${num(img[0])}\)`}. New \(y\): \(${yWork(r, T)} = ${num(img[1])}\).`,
      R`The point is \(${point(...img)}\).`,
    ],
    rule: 0,
    skill: 'transforming a point',
    check: () => (close(gOf(through(p, r), T)(img[0]), img[1]) ? true : 'image point is not on g'),
  });
}

function easyDescribe(rng) {
  const kind = rng.pick(['shift', 'vert', 'horiz']);
  let T;
  let muts;
  if (kind === 'shift') {
    const h = rng.nonzero(-6, 6);
    const k = rng.intExcept(-6, 6, [0, h, -h]);
    T = { h, k };
    muts = [
      [{ h: -h, k }, R`Inside the brackets the sign works backwards: \(f(${inner(1, h)})\) is a shift to the ${h > 0 ? 'right' : 'left'}.`],
      [{ h: k, k: h }, 'The number added inside the brackets moves the graph sideways; the number added outside moves it up or down.'],
      [{ h, k: -k }],
      [{ h: -h, k: -k }],
    ];
  } else if (kind === 'vert') {
    const a = rng.pick([2, 3, -2, -3, -1, frac(1, 2), frac(-1, 2), frac(1, 3)]);
    const k = rng.nonzero(-6, 6);
    T = { a, k };
    muts = [
      [{ b: val(a) === -1 ? -1 : a, k }, R`\(${num(a)}\) multiplies the output \(f(x)\), so it acts vertically.`],
      [{ a: val(a) < 0 ? absF(a) : a instanceof Frac ? a.neg() : -a, k }, val(a) < 0 ? 'A negative factor in front of f also reflects the graph across the x-axis.' : null],
      [{ a, k: -k }],
      Math.abs(val(a)) !== 1 ? [{ a: a instanceof Frac ? a.inv() : frac(1, a), k }] : [{ a: absF(a), k: -k }],
    ];
  } else {
    const b = rng.pick([2, 3, -1, -2, frac(1, 2), frac(1, 3)]);
    const k = rng.nonzero(-6, 6);
    T = { b, k };
    muts = [
      Math.abs(val(b)) !== 1 ? [{ b: b instanceof Frac ? b.inv() : frac(1, b), k }, R`Multiplying the input by \(${num(b)}\) makes the graph reach each height ${Math.abs(val(b)) > 1 ? 'sooner' : 'later'}: the horizontal factor is \(\frac{1}{|b|} = ${num(round(1 / Math.abs(val(b)), 6))}\)${Math.abs(val(b)) > 1 ? ', a compression' : ', a stretch'}.`] : [{ b: 1, a: -1, k }, R`\(f(-x)\) changes the sign of the input: a reflection across the \(y\)-axis.`],
      [{ a: b, k }, 'A number multiplying x inside the brackets acts horizontally, not vertically.'],
      [{ b, k: -k }],
      [{ b: val(b) < 0 ? 1 : b instanceof Frac ? b.neg() : -b, k }],
    ];
  }
  return q({
    prompt: R`How is the graph of \(y = ${gTex(T)}\) obtained from the graph of \(y = f(x)\)?`,
    correct: describe(T),
    wrong: muts.map(([U, why]) => (why ? { value: describe(U), why } : describe(U))),
    solution: [
      R`Compare with \(y = af\big(b(x - h)\big) + k\): here \(a = ${num(T.a ?? 1)}\), \(b = ${num(T.b ?? 1)}\), \(h = ${num(T.h ?? 0)}\), \(k = ${num(T.k ?? 0)}\).`,
      R`Inside the brackets (\(b\) and \(h\)) the change is horizontal; outside (\(a\) and \(k\)) it is vertical.`,
      `${describe(T)}.`,
    ],
    rule: 0,
    skill: 'describing a transformation',
    check: () => {
      // Every point of f must land where the words say.
      const fT = through(1, 2);
      const g = gOf(fT, T);
      return [-2, 0.5, 3].every((x) => close(g(image([x, fT(x)], T)[0]), image([x, fT(x)], T)[1])) ? true : 'description and formula disagree';
    },
  });
}

const CONTEXTS = [
  { type: 'Exponential', confuse: 'Linear', why: 'A fixed percent of a growing amount is a growing amount, so the change is not the same each year.', make: (rng) => `An account starts with $${txt(rng.int(5, 40) * 100)} and earns ${rng.int(2, 7)}% interest, compounded once a year. The balance is modelled as a function of time.` },
  { type: 'Linear', confuse: 'Exponential', why: 'The cost goes up by the same amount for every mile: a constant rate of change.', make: (rng) => `A van rental costs $${rng.int(25, 60)} plus $${rng.pick(['0.20', '0.25', '0.30', '0.40', '0.45'])} per mile. The cost is modelled as a function of miles driven.` },
  { type: 'Quadratic', confuse: 'Sinusoidal', why: 'The ball rises and falls only once; nothing repeats.', make: (rng) => `A ball is thrown upward at ${rng.int(8, 25)} m/s from a height of ${rng.int(1, 3)} m. Its height is modelled as a function of time until it lands.` },
  { type: 'Sinusoidal', confuse: 'Quadratic', why: 'The depth rises and falls over and over with the same period, which is the pattern of a sine wave.', make: (rng) => `The water depth at a harbour rises and falls with the tides, from about ${rng.int(1, 3)} m to ${rng.int(5, 9)} m, repeating every 12.4 hours. Depth is modelled as a function of time over a week.` },
  { type: 'Cubic', confuse: 'Quadratic', why: 'Volume multiplies three lengths: s · s · s.', make: (rng) => `A company makes cube-shaped boxes with edges from ${rng.int(5, 15)} cm to ${rng.int(30, 60)} cm. The volume of a box is modelled as a function of its edge length.` },
  { type: 'Logarithmic', confuse: 'Exponential', why: 'Multiplying the input by 10 adds the same amount to the output. That is the pattern of a logarithm, the inverse of an exponential.', make: (rng) => `Every tenfold increase in sound intensity raises the loudness by 10 decibels. Loudness, starting from ${rng.int(20, 50)} dB, is modelled as a function of intensity.` },
  { type: 'Piecewise', confuse: 'Linear', why: 'The rule changes once the daily maximum is reached, so one formula does not fit the whole domain.', make: (rng) => { const r = rng.int(2, 5); const n = rng.int(3, 5); return `A parking garage charges $${r} per hour for the first ${n} hours and a flat $${r * n + rng.int(2, 6)} for any longer stay that day. The charge is modelled as a function of hours parked.`; } },
  { type: 'Exponential', confuse: 'Linear', why: 'Losing the same percent each minute means the amount lost shrinks as the coffee cools.', make: (rng) => `A cup of coffee starts ${rng.int(50, 70)} °C above room temperature, and that difference falls by ${rng.int(3, 9)}% each minute. The difference is modelled as a function of time.` },
  { type: 'Sinusoidal', confuse: 'Linear', why: 'Daylight lengthens and shortens each year in a repeating cycle.', make: (rng) => `In a city, the hours of daylight vary from about ${rng.int(8, 10)} hours in winter to ${rng.int(14, 16)} hours in summer. Daylight is modelled as a function of the day of the year over ${rng.int(2, 4)} years.` },
  { type: 'Quadratic', confuse: 'Linear', why: 'The radius grows at a constant rate, but area is π times the radius squared.', make: (rng) => `A circular ripple spreads outward at ${rng.int(10, 40)} cm per second. The area inside the ripple is modelled as a function of time.` },
  { type: 'Logarithmic', confuse: 'Linear', why: 'Each tenfold change in concentration changes the pH by 1, so equal steps in pH are multiplications of the input.', make: (rng) => `A chemist records the pH of solutions whose hydrogen-ion concentrations range from \\(10^{-${rng.int(1, 3)}}\\) to \\(10^{-${rng.int(9, 12)}}\\) mol/L. pH is modelled as a function of concentration.` },
  { type: 'Piecewise', confuse: 'Exponential', why: 'The tax rate changes at each threshold, so the formula changes from one income band to the next.', make: (rng) => `A tax is 10% of income up to $${txt(rng.int(2, 5) * 10000)} and ${rng.int(15, 25)}% of every dollar above that. The tax is modelled as a function of income.` },
];
const TYPES = ['Linear', 'Quadratic', 'Cubic', 'Exponential', 'Logarithmic', 'Sinusoidal', 'Piecewise'];

function easyContextModel(rng) {
  const i = rng.int(0, CONTEXTS.length - 1);
  const c = CONTEXTS[i];
  const story = c.make(rng);
  const others = rng.shuffle(TYPES.filter((t) => t !== c.type && t !== c.confuse));
  return q({
    prompt: `${story} Which type of model fits this situation best?`,
    correct: c.type,
    wrong: [{ value: c.confuse, why: c.why }, ...others],
    solution: [
      `Ask how the quantity changes: ${c.why.charAt(0).toLowerCase() + c.why.slice(1)}`,
      `So ${/^[AEIOU]/.test(c.type) ? 'an' : 'a'} ${c.type.toLowerCase()} model fits best.`,
    ],
    rule: 2,
    skill: 'choosing a model from a context',
    check: () => (TYPES.includes(c.type) && c.type !== c.confuse ? true : 'bad context'),
  });
}

const RESID = [
  { what: 'the price, in thousands of dollars, of a used car that is \\(x\\) years old', m: [-30, -15], c: [220, 320], x: [2, 6] },
  { what: 'the height, in centimetres, of a sunflower \\(x\\) days after it sprouts', m: [18, 35], c: [10, 50], x: [5, 20] },
  { what: 'the monthly electricity bill, in dollars, for \\(x\\) hundred kilowatt-hours used', m: [120, 160], c: [80, 150], x: [3, 9] },
  { what: 'the time, in minutes, a runner takes for a 5 km race after \\(x\\) weeks of training', m: [-6, -2], c: [280, 340], x: [2, 12] },
];

function easyResidual(rng) {
  const s = rng.pick(RESID);
  const m10 = rng.int(...s.m);
  const c10 = rng.int(...s.c);
  const x = rng.int(...s.x);
  const pred10 = c10 + m10 * x;
  const r10 = rng.pick([-1, 1]) * rng.int(3, 25);
  const act = (pred10 + r10) / 10;
  const pred = pred10 / 10;
  const res = r10 / 10;
  return q({
    prompt: R`A linear model for ${s.what} is \(\hat{y} = ${linear(m10 / 10, c10 / 10)}\). For \(x = ${x}\), the actual value is \(${num(act)}\). What is the residual?`,
    correct: res,
    fmt: dec(1),
    wrong: [
      { value: -res, why: 'A residual is actual minus predicted, not predicted minus actual.' },
      { value: pred, why: R`\(${num(pred)}\) is the predicted value. The residual is how far the actual value is from it.` },
      act - c10 / 10,
    ],
    solution: [
      R`Predicted value: \(\hat{y} = ${num(m10 / 10)}(${x}) ${signed(c10 / 10)} = ${num(pred)}\).`,
      R`Residual \(=\) actual \(-\) predicted \(= ${num(act)} - ${num(pred)} = ${num(res)}\).`,
      res > 0 ? 'The residual is positive: the actual value is above the model.' : 'The residual is negative: the actual value is below the model.',
    ],
    rule: 4,
    skill: 'computing a residual',
    check: () => (close(pred + res, act, 1e-9) && close(act - (m10 / 10) * x - c10 / 10, res, 1e-9) ? true : 'residual is wrong'),
  });
}

// ───────────── Medium ─────────────

function mediumNoisyTable(rng) {
  const kind = rng.pick(['linear', 'quadratic', 'exponential', 'sinusoidal']);
  const xs = [0, 1, 2, 3, 4, 5, 6, 7];
  const e = () => rng.int(0, 1);
  let ys;
  if (kind === 'linear') {
    const m = rng.sign() * rng.int(5, 9);
    const c = m > 0 ? rng.int(2, 12) : -7 * m + rng.int(3, 12);
    ys = xs.map((x) => c + m * x + e());
  } else if (kind === 'quadratic') {
    const A = rng.pick([5, 6, -5, -6]);
    const B = rng.int(-10, 10);
    const C = rng.int(-10, 20);
    ys = xs.map((x) => A * x * x + B * x + C + e());
  } else if (kind === 'exponential') {
    const b = rng.pick([1.5, 2, 0.5, 0.8]);
    const a = b === 0.5 ? 128 * rng.int(2, 9) : b === 0.8 ? rng.int(5, 12) * 200 : rng.int(20, 60);
    ys = xs.map((x) => Math.round(a * b ** x));
  } else {
    const A = rng.int(6, 12);
    const k = rng.int(15, 40);
    const wave = rng.pick([[0, 1, 0, -1], [1, 0, -1, 0], [0, -1, 0, 1]]);
    ys = xs.map((x) => k + A * wave[x % 4] + e());
  }
  const d1 = ys.slice(1).map((y, i) => y - ys[i]);
  const d2 = d1.slice(1).map((d, i) => d - d1[i]);
  const ratios = ys.slice(1).map((y, i) => y / ys[i]);
  const spread = (l) => (Math.max(...l) - Math.min(...l)) / Math.abs(mean(l));
  const list = (l) => l.map((v) => num(v, { places: 2 })).join(R`,\ `);
  const names = { linear: 'Linear', quadratic: 'Quadratic', exponential: 'Exponential', sinusoidal: 'Sinusoidal' };
  const steps = {
    linear: () => R`The first differences \(${list(d1)}\) are all close to \(${num(round(mean(d1), 1))}\): roughly the same amount is added each step, so a linear model fits.`,
    quadratic: () => R`The first differences \(${list(d1)}\) change steadily, and the second differences \(${list(d2)}\) are all close to \(${num(round(mean(d2), 1))}\): a quadratic model fits.`,
    exponential: () => R`The differences \(${list(d1)}\) are far from constant, but the ratios \(${list(ratios)}\) are all close to \(${num(round(mean(ratios), 2))}\): each step multiplies by about the same factor, so an exponential model fits.`,
    sinusoidal: () => R`The values rise and fall and come back to about the same values every 4 steps (\(y_{0} \approx y_{4}\), \(y_{1} \approx y_{5}\), …): a repeating pattern, so a sinusoidal model fits.`,
  };
  return q({
    prompt: R`The table shows measured data, which include small measurement errors. Which type of model is most appropriate?`,
    visual: dataTable(xs, ys, 'y', 0),
    correct: names[kind],
    wrong: [
      { value: 'Linear', why: 'A linear model needs roughly equal first differences. Check them.' },
      { value: 'Exponential', why: 'An exponential model needs roughly equal ratios of successive values. Check them.' },
      { value: 'Quadratic', why: 'A quadratic model needs roughly equal second differences. Check them.' },
      { value: 'Sinusoidal', why: 'A sinusoidal model needs values that repeat in a cycle.' },
    ],
    solution: [R`The \(x\)-values go up in equal steps of 1, so compare how \(y\) changes from step to step.`, steps[kind]()],
    rule: 2,
    skill: 'choosing a model from data',
    check: () => {
      const tests = {
        linear: spread(d1) <= 0.5,
        quadratic: spread(d1) > 0.5 && spread(d2) <= 0.5,
        exponential: ratios.every((r) => r > 0) && spread(ratios) <= 0.08,
        sinusoidal: ys.slice(4).every((y, i) => Math.abs(y - ys[i]) <= 1) && Math.max(...ys) - Math.min(...ys) >= 10,
      };
      const hits = Object.keys(tests).filter((t) => tests[t]);
      return hits.length === 1 && hits[0] === kind ? true : `data look like ${hits.join(', ') || 'nothing'}`;
    },
  });
}

function mediumBuildQuadratic(rng) {
  const vq = (a, h, k, v = 'x') => `${coef(a)}(${linear(1, -h, v)})^{2} ${signed(k)}`;
  let a;
  let h;
  let k;
  let x1;
  let y1;
  let prompt;
  let v = 'x';
  let name = 'y';
  const word = rng.int(0, 2);
  if (word === 0) {
    a = rng.pick([-2, -3, -4, -5, -10]);
    h = rng.int(8, 20);
    k = rng.int(30, 90) * 10;
    x1 = h + rng.sign() * rng.int(2, 5);
    if (k + a * (x1 - h) ** 2 <= 0) a = -2;
    y1 = k + a * (x1 - h) ** 2;
    v = 'p';
    name = 'P(p)';
    prompt = R`A bakery's weekly profit \(P\), in dollars, is a quadratic function of the price \(p\), in dollars, of a cake. The greatest profit, $${txt(k)}, comes at a price of $${h}. At a price of $${x1} the profit is $${txt(y1)}. Which is the model?`;
  } else if (word === 1) {
    a = -5;
    h = rng.int(1, 3);
    const y0 = rng.int(1, 12);
    k = y0 + 5 * h * h;
    x1 = 0;
    y1 = y0;
    v = 't';
    name = 'h(t)';
    prompt = R`A ball is launched from a height of ${y0} m and reaches its greatest height, ${k} m, after ${h} s. Which quadratic model gives its height \(h\), in metres, after \(t\) seconds?`;
  } else {
    a = rng.pick([1, 2, 3, -1, -2, -3, frac(1, 2), frac(-1, 2)]);
    h = rng.nonzero(-5, 5);
    k = rng.int(-8, 8);
    const d = rng.sign() * (a instanceof Frac ? 2 : rng.int(2, 3));
    x1 = h + d;
    y1 = val(a) * d * d + k;
    prompt = R`A parabola has vertex \(${point(h, k)}\) and passes through \(${point(x1, y1)}\). Which is its equation?`;
  }
  const A = frac(y1 - k, (x1 - h) ** 2);
  const eq = (aa, hh, kk) => R`\(${name} = ${vq(aa, hh, kk, v)}\)`;
  const f = (x) => A.value * (x - h) ** 2 + k;
  return q({
    prompt,
    correct: eq(A, h, k),
    wrong: [
      x1 + h !== 0 ? { value: eq(frac(y1 - k, (x1 + h) ** 2), -h, k), why: R`A vertex at \(${v} = ${h}\) gives the factor \((${linear(1, -h, v)})^{2}\).` } : null,
      { value: eq(frac(y1, (x1 - h) ** 2), h, k), why: R`Subtract the vertex height before dividing: \(a = \frac{${num(y1)} - ${paren0(k)}}{(${num(x1)} - ${paren0(h)})^{2}}\).` },
      { value: eq(A.neg(), h, k), why: A.value < 0 ? 'The vertex is a maximum, so the parabola opens downward: a must be negative.' : 'The point is above the vertex, so the parabola opens upward: a must be positive.' },
      eq(frac(y1 - k, x1 - h), h, k),
      eq(A, k, h),
    ],
    solution: [
      R`Vertex form: \(${name} = a(${linear(1, -h, v)})^{2} ${signed(k)}\), using the vertex \(${point(h, k)}\).`,
      R`Substitute \(${point(x1, y1)}\): \(${num(y1)} = a(${num(x1)} - ${paren0(h)})^{2} ${signed(k)} = ${term((x1 - h) ** 2, 'a')} ${signed(k)}\).`,
      R`So \(a = \frac{${num(y1 - k)}}{${(x1 - h) ** 2}} = ${A.tex()}\), and \(${name} = ${vq(A, h, k, v)}\).`,
    ],
    rule: 3,
    skill: 'building a quadratic model',
    check: () => (close(f(x1), y1) && close(f(h), k) && close(f(h + 1.7), f(h - 1.7)) ? true : 'model misses a given point'),
  });
}
const paren0 = (x) => (x < 0 ? `(${x})` : String(x));

function mediumInterpret(rng) {
  const kind = rng.int(0, 3);
  if (kind === 0) {
    const A = rng.int(15, 45) * 1000;
    const pct = rng.pick([8, 10, 12, 15, 18, 20, 25]);
    const b = 1 - pct / 100;
    return q({
      prompt: R`The value of a car, in dollars, \(t\) years after it is bought is modelled by \(V(t) = ${num(A, { commas: true })}(${num(b)})^{t}\). What does \(${num(b)}\) tell you?`,
      correct: `The car loses ${pct}% of its value each year.`,
      wrong: [
        { value: `The car loses ${round(b * 100, 2)}% of its value each year.`, why: R`Each year the value is multiplied by \(${num(b)}\), so ${round(b * 100, 2)}% is kept and ${pct}% is lost.` },
        { value: `The car loses $${num(b)} of its value each year.`, why: 'An exponential factor is a multiplier, not an amount in dollars.' },
        `The car gains ${pct}% in value each year.`,
        { value: `The car loses ${pct}% of its original value each year.`, why: `Losing ${pct}% of the original value every year would be a linear decrease. Here the loss is ${pct}% of the current value.` },
      ],
      solution: [R`From one year to the next, \(V(t + 1) = ${num(b)} \cdot V(t)\): the value is multiplied by \(${num(b)}\).`, R`Keeping \(${num(b * 100)}\%\) means losing \(${pct}\%\) of the current value each year.`],
      rule: 3,
      skill: 'interpreting parameters',
      check: () => (close(A * b ** 4 / (A * b ** 3), 1 - pct / 100) ? true : 'factor wrong'),
    });
  }
  if (kind === 1) {
    const F = rng.int(5, 40) * 5;
    const vc = rng.int(3, 30);
    const [one, item] = rng.pick([['T-shirt', 'T-shirts'], ['mug', 'mugs'], ['poster', 'posters'], ['hoodie', 'hoodies']]);
    return q({
      prompt: R`The cost, in dollars, of printing \(n\) ${item} is \(C(n) = ${linear(vc, F, 'n')}\). What does \(${vc}\) mean?`,
      correct: `Each additional ${one} adds $${vc} to the cost.`,
      wrong: [
        { value: `The set-up cost, before any ${item} are printed, is $${vc}.`, why: R`The cost with no ${item} is \(C(0) = ${F}\). The ${vc} is multiplied by \(n\), so it is the cost per ${one}.` },
        { value: `Each additional ${one} adds $${F} to the cost.`, why: R`\(${F}\) is added once, whatever \(n\) is: it is the set-up cost.` },
        `Printing ${vc} ${item} costs $${F}.`,
        `The cost per ${one} is $${round((vc + F) / 1, 2)}.`,
      ],
      solution: [R`\(C(n + 1) - C(n) = ${vc}\): each extra ${one} adds $${vc}.`, R`The constant \(${F}\) is \(C(0)\), the set-up cost in dollars.`],
      rule: 3,
      skill: 'interpreting parameters',
      check: () => ((vc * 8 + F) - (vc * 7 + F) === vc ? true : 'slope wrong'),
    });
  }
  if (kind === 2) {
    const P0 = rng.int(12, 90) * 100;
    const pct = rng.int(2, 9);
    return q({
      prompt: R`The population of a town \(t\) years after 2020 is modelled by \(P(t) = ${num(P0, { commas: true })}(${num(1 + pct / 100)})^{t}\). What does \(${num(P0, { commas: true })}\) mean?`,
      correct: `The population in 2020 was about ${txt(P0)}.`,
      wrong: [
        { value: `The population grows by ${txt(P0)} people each year.`, why: R`The yearly change is a percent, set by the factor \(${num(1 + pct / 100)}\). \(${num(P0, { commas: true })}\) is \(P(0)\).` },
        { value: `The population in 2021 was about ${txt(P0)}.`, why: R`\(t = 0\) is 2020, and \(P(0) = ${num(P0, { commas: true })} \cdot 1 = ${num(P0, { commas: true })}\).` },
        `The population will never pass ${txt(P0)}.`,
        `The population grows by ${pct}% of ${txt(P0)} people each year.`,
      ],
      solution: [R`At \(t = 0\) (the year 2020), \(P(0) = ${num(P0, { commas: true })} \cdot ${num(1 + pct / 100)}^{0} = ${num(P0, { commas: true })}\).`, `So ${txt(P0)} is the starting population, in 2020.`],
      rule: 3,
      skill: 'interpreting parameters',
      check: () => checkEqual(P0 * (1 + pct / 100) ** 0, P0),
    });
  }
  const h = rng.int(2, 4);
  const y0 = rng.int(1, 9);
  const k = y0 + 5 * h * h;
  return q({
    prompt: R`The height, in metres, of a ball \(t\) seconds after it is thrown is \(h(t) = -5(t - ${h})^{2} + ${k}\). What does \(${k}\) mean?`,
    correct: `The greatest height of the ball is ${k} m.`,
    wrong: [
      { value: `The ball is thrown from a height of ${k} m.`, why: R`The starting height is \(h(0) = -5(${h})^{2} + ${k} = ${y0}\) m. \(${k}\) is the height at the vertex.` },
      { value: `The ball reaches its greatest height after ${k} s.`, why: R`The time of the greatest height is \(t = ${h}\), the value inside the brackets.` },
      `The ball lands after ${k} s.`,
      `The ball rises ${k} m each second.`,
    ],
    solution: [R`The model is in vertex form \(a(t - h)^{2} + k\) with \(a = -5 < 0\), so the vertex is a maximum.`, R`The vertex is \((${h}, ${k})\): the ball is highest, at ${k} m, after ${h} s.`],
    rule: 3,
    skill: 'interpreting parameters',
    check: () => ([0.5, 1, 1.5].every((d) => -5 * d * d + k < k) ? true : 'vertex is not a maximum'),
  });
}

const STORIES = ['hours studied and test scores', 'outdoor temperature and ice-cream sales', 'age of a tree and its height', 'years since 2015 and a city’s bus riders', 'engine size and fuel use', 'weeks of training and sprint times'];

function mediumResidualPlot(rng) {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8];
  const pattern = rng.bool();
  let rs;
  for (let tries = 0; ; tries++) {
    if (tries > 2000) throw new Error('no residual set found');
    const A = rng.sign() * rng.float(0.6, 1.2);
    const ys = xs.map((x) => 10 + 3 * x + (pattern ? A * (x - 4.5) ** 2 + rng.float(-0.4, 0.4) : rng.float(-2, 2)));
    const { m, c } = fitLine(xs, ys);
    rs = xs.map((x, i) => round(ys[i] - (m * x + c), 1));
    const sc = signChanges(rs);
    const qs = quadShare(xs, rs);
    if (pattern ? sc <= 2 && qs > 0.85 : sc >= 4 && qs < 0.35 && rs.every((r) => r !== 0)) break;
  }
  return q({
    prompt: `A least-squares line was fitted to data on ${rng.pick(STORIES)}. The residual plot is shown. Is a linear model appropriate?`,
    visual: residualPlot(xs, rs, 'linear residual'),
    correct: pattern ? 'No: the residuals form a curved pattern, so a nonlinear model would fit better.' : 'Yes: the residuals are scattered randomly about 0 with no pattern.',
    wrong: [
      pattern ? { value: 'Yes: the residuals are scattered randomly about 0 with no pattern.', why: `Read the signs from left to right: ${rs.map((r) => (r > 0 ? '+' : '−')).join(' ')}. They form runs that bend in a curve, not a random mix.` } : { value: 'No: the residuals form a curved pattern, so a nonlinear model would fit better.', why: `The signs ${rs.map((r) => (r > 0 ? '+' : '−')).join(' ')} switch back and forth with no curve to follow.` },
      { value: 'Yes: there are both positive and negative residuals.', why: 'A least-squares line always has residuals of both signs. What matters is whether they form a pattern.' },
      { value: 'No: the residuals are not all 0.', why: 'Real data never fit a model exactly. Small residuals scattered at random are what a good model leaves.' },
    ],
    solution: [
      `Residuals from x = 1 to 8: ${rs.map((r) => t1(r)).join(', ')}.`,
      pattern ? `The signs run ${rs.map((r) => (r > 0 ? '+' : '−')).join(' ')}: a block of one sign between blocks of the other. That curve is a shape the line missed.` : 'Positive and negative residuals are mixed with no trend or curve.',
      pattern ? 'A pattern means a different model type is needed, so a linear model is not appropriate.' : 'Random scatter about 0 means the linear model is appropriate.',
    ],
    rule: 4,
    skill: 'reading a residual plot',
    check: () => {
      const sc = signChanges(rs);
      const qs = quadShare(xs, rs);
      return (pattern ? sc <= 2 && qs > 0.8 : sc >= 4 && qs < 0.4) ? true : `sign changes ${sc}, curve share ${qs}`;
    },
  });
}

// ───────────── Hard ─────────────

function hardDomainRange(rng) {
  const p = 2 * rng.int(-4, 0);
  let qq = p + 2 * rng.int(2, 5);
  if (qq === -p) qq += 2;
  const r = rng.int(-4, 1);
  let s = r + rng.int(2, 7);
  if (s === -r) s += 1;
  const askRange = rng.bool();
  const ivl = ([lo, hi]) => M(`[${num(lo)}, ${num(hi)}]`);
  const srt = (u, v) => [Math.min(u, v), Math.max(u, v)];
  let T;
  let correct;
  let cands;
  if (askRange) {
    const a = rng.pick([2, 3, -1, -2, -3, frac(1, 2), frac(-1, 2)]);
    const A = val(a);
    const k = rng.nonzero(-6, 6);
    T = { a, h: rng.int(-3, 3), k };
    correct = srt(A * r + k, A * s + k);
    cands = [
      A < 0 ? { value: srt(-A * r + k, -A * s + k), why: R`The factor \(${num(a)}\) is negative, so it flips the range: the top value \(${s}\) becomes the bottom.` } : null,
      { value: srt(A * (r + k), A * (s + k)), why: R`Multiply by \(${num(a)}\) first, then add \(${k}\).` },
      { value: [r + k, s + k], why: R`The factor \(${num(a)}\) multiplies every output, so it stretches the range too.` },
      srt(A * r - k, A * s - k),
      srt(A * r + k + T.h, A * s + k + T.h),
      srt(A * r, A * s),
      [r, s],
      [r - k, s - k],
    ];
  } else {
    const b = rng.pick([2, -1, -2, frac(1, 2)]);
    const B = val(b);
    const h = rng.nonzero(-5, 5);
    T = { a: rng.pick([1, 2, -1]), b, h, k: rng.int(-3, 3) };
    correct = srt(p / B + h, qq / B + h);
    cands = [
      { value: srt(B * p + h, B * qq + h), why: R`Solve \(${num(p)} \le ${inner(b, h)} \le ${num(qq)}\): divide by \(${num(b)}\), do not multiply.` },
      { value: srt(p / B - h, qq / B - h), why: R`The shift inside \(${inner(b, h)}\) moves the graph ${h > 0 ? 'right' : 'left'} ${Math.abs(h)}, so the domain moves ${h > 0 ? 'right' : 'left'} too: add \(${paren(h)}\) after dividing.` },
      srt((p + h) / B, (qq + h) / B),
      [p + h, qq + h],
      { value: [p, qq], why: R`The input of \(f\) is \(${inner(b, h)}\), not \(x\), so the domain changes.` },
      [p - h, qq - h],
    ];
  }
  const ask = askRange ? 'range' : 'domain';
  const fLine = (t) => r + ((s - r) * (t - p)) / (qq - p);
  return q({
    prompt: R`The function \(f\) has domain \([${p}, ${qq}]\) and range \([${r}, ${s}]\). What is the ${ask} of \(g(x) = ${gTex(T)}\)?`,
    correct: ivl(correct),
    wrong: (() => {
      const seen = new Set([correct.join()]);
      return cands.filter((c) => c && !seen.has((c.value ?? c).join()) && seen.add((c.value ?? c).join())).map((c) => (Array.isArray(c) ? ivl(c) : { value: ivl(c.value), why: c.why }));
    })(),
    solution: askRange
      ? [
          R`The range depends only on what happens outside \(f\): every output \(y\) of \(f\) becomes \(${coef(T.a)}y ${signed(T.k)}\).`,
          R`The ends \(${r}\) and \(${s}\) become \(${num(T.a)}(${r}) ${signed(T.k)} = ${num(val(T.a) * r + T.k)}\) and \(${num(T.a)}(${s}) ${signed(T.k)} = ${num(val(T.a) * s + T.k)}\).`,
          `${val(T.a) < 0 ? 'The negative factor swaps their order. ' : ''}The range of g is [${t1(correct[0], 3)}, ${t1(correct[1], 3)}].`,
        ]
      : [
          R`The domain depends only on the input of \(f\): \(g(x)\) is defined when \(${num(p)} \le ${inner(T.b, T.h)} \le ${num(qq)}\).`,
          R`Divide by \(${num(T.b)}\)${val(T.b) < 0 ? ' (which reverses the inequalities)' : ''}, then add \(h = ${num(T.h)}\): the ends become \(${num(p / val(T.b) + T.h)}\) and \(${num(qq / val(T.b) + T.h)}\).`,
          `The domain of g is [${t1(correct[0], 3)}, ${t1(correct[1], 3)}].`,
        ],
    rule: 1,
    skill: `${ask} of a transformed function`,
    check: () => {
      // Use a concrete f (the line from (p, r) to (q, s)) and scan g over its domain.
      const B = val(T.b ?? 1);
      const xsOk = (x) => {
        const t = B * (x - (T.h ?? 0));
        return t >= p - 1e-9 && t <= qq + 1e-9;
      };
      const dom = [p / B + (T.h ?? 0), qq / B + (T.h ?? 0)].sort((u, v) => u - v);
      if (!xsOk(dom[0]) || !xsOk(dom[1]) || xsOk(dom[0] - 0.01) || xsOk(dom[1] + 0.01)) return 'domain ends are wrong';
      if (!askRange) return close(dom[0], correct[0]) && close(dom[1], correct[1]) ? true : 'domain answer is wrong';
      const g = gOf(fLine, T);
      const vals = Array.from({ length: 201 }, (_, i) => g(dom[0] + ((dom[1] - dom[0]) * i) / 200));
      return close(Math.min(...vals), correct[0], 1e-6) && close(Math.max(...vals), correct[1], 1e-6) ? true : 'range answer is wrong';
    },
  });
}

function hardFromGraph(rng) {
  const key = rng.pick(['sq', 'abs', 'sqrt', 'cube', 'exp2']);
  const P = PARENTS[key];
  const a = rng.pick([1, -1, 2, -2]);
  const h = rng.nonzero(-3, 3);
  const k = rng.intExcept(-3, 3, [h, -h]);
  const T = { a, h, k };
  const g = gOf(P.f, T);
  const imgs = P.pts.map((pt) => image(pt, T));
  const dom = key === 'sqrt' ? [h, 8] : undefined;
  const opts = [
    [T, null],
    [{ a, h: -h, k }, R`The graph moved ${h > 0 ? 'right' : 'left'}, and a shift of \(${Math.abs(h)}\) to the ${h > 0 ? 'right' : 'left'} is written \(f(${linear(1, -h)})\).`],
    [{ a: -a, h, k }, a < 0 ? 'The solid graph is the dashed shape turned upside down, so the factor in front of f is negative.' : 'The solid graph is not turned upside down, so the factor in front of f is positive.'],
    [{ a, h: k, k: h }, 'The number inside the brackets moves the graph sideways and the number outside moves it up or down.'],
    [{ a: Math.abs(a) === 2 ? Math.sign(a) : 2 * a, h, k }],
  ];
  const eq = (U) => R`\(g(x) = ${gTex(U)}\)`;
  return q({
    prompt: R`The dashed graph is \(y = f(x)\), where \(f(x) = ${P.tex}\). The solid graph is \(y = g(x)\), a transformation of \(f\). Which is \(g\)?`,
    visual: {
      type: 'plot',
      x: [-7, 7],
      y: [-8, 8],
      step: [1, 1],
      fns: [
        { f: P.f, color: 'b', dashed: true, domain: key === 'sqrt' ? [0, 8] : undefined },
        { f: g, domain: dom },
      ],
      points: imgs.map(([x, y]) => ({ x, y, label: `(${t1(x)}, ${t1(y)})` })),
      alt: `Dashed graph of f(x) = ${P.text}, through ${P.pts.map(([x, y]) => `(${x}, ${y})`).join(', ')}. Solid graph of g, the same shape ${a < 0 ? 'turned upside down' : 'the same way up'}${Math.abs(a) === 2 ? ' and stretched vertically' : ''}, through the marked points ${imgs.map(([x, y]) => `(${t1(x)}, ${t1(y)})`).join(', ')}.`,
    },
    correct: eq(T),
    wrong: opts.slice(1).map(([U, why]) => (why ? { value: eq(U), why } : eq(U))),
    solution: [
      R`Match key points: \(${point(...P.pts[1])}\) on \(f\) moves to \(${point(...imgs[1])}\) on \(g\), and \(${point(...P.pts[2])}\) moves to \(${point(...imgs[2])}\).`,
      R`The move from \(x = ${P.pts[1][0]}\) to \(x = ${imgs[1][0]}\) is a shift ${h > 0 ? 'right' : 'left'} \(${Math.abs(h)}\): \(h = ${h}\).`,
      R`Heights above the key point change from \(${P.pts[2][1] - P.pts[1][1]}\) to \(${imgs[2][1] - imgs[1][1]}\), so \(a = ${a}\); then the graph is moved ${k > 0 ? 'up' : 'down'} \(${Math.abs(k)}\): \(k = ${k}\).`,
      R`So \(g(x) = ${gTex(T)}\).`,
    ],
    rule: 0,
    skill: 'transformation from a graph',
    check: () => {
      const xsT = key === 'sqrt' ? [h + 0.3, h + 1.1, h + 2.6, h + 5] : [h - 2.3, h - 0.7, h + 0.4, h + 1.9];
      const agrees = (U) => xsT.every((x) => close(gOf(P.f, U)(x), g(x)));
      if (!imgs.every(([x, y]) => close(g(x), y))) return 'marked points are not on g';
      if (!agrees(T)) return 'correct choice is not g';
      const bad = opts.slice(1).find(([U]) => agrees(U));
      return bad ? `a wrong choice also matches g: ${gTex(bad[0])}` : true;
    },
  });
}

const GROWTH = ['the number of electric cars registered in a county (hundreds)', 'the number of members of a hiking club', 'the yearly sales of a small company (thousands of dollars)', 'the number of downloads of a podcast (thousands)', 'the number of stores in a coffee chain'];

function hardCompareResiduals(rng) {
  const xs = [0, 1, 2, 3, 4, 5, 6, 7];
  const truth = rng.pick(['linear', 'exponential']);
  let ys;
  let L;
  let E;
  let rL;
  let rE;
  for (let tries = 0; ; tries++) {
    if (tries > 2000) throw new Error('no data set found');
    if (truth === 'exponential') {
      const a = rng.int(20, 60);
      const b = rng.pick([1.3, 1.35, 1.4, 1.45, 1.5]);
      ys = xs.map((x) => round(a * b ** x * (1 + rng.float(-0.04, 0.04)), 1));
    } else {
      const c = rng.int(3, 10);
      const m = rng.int(6, 12);
      ys = xs.map((x) => round(c + m * x + rng.float(-0.35, 0.35) * m, 1));
    }
    L = fitLine(xs, ys);
    E = fitExp(xs, ys);
    rL = xs.map((x, i) => ys[i] - (L.m * x + L.c));
    rE = xs.map((x, i) => ys[i] - E.a * E.b ** x);
    const [good, bad] = truth === 'linear' ? [rL, rE] : [rE, rL];
    const sg = good.reduce((s, r) => s + r * r, 0);
    const sb = bad.reduce((s, r) => s + r * r, 0);
    if (signChanges(bad) <= 2 && quadShare(xs, bad) > 0.8 && signChanges(good) >= 3 && quadShare(xs, good) < 0.5 && sb > 3 * sg) break;
  }
  const names = { linear: 'linear', exponential: 'exponential' };
  const good = names[truth];
  const bad = truth === 'linear' ? 'exponential' : 'linear';
  const fmtL = R`\(\hat{y} = ${linear(round(L.m, 2), round(L.c, 2))}\)`;
  const fmtE = R`\(\hat{y} = ${num(E.a, { places: 2 })} \cdot ${num(E.b, { places: 3 })}^{x}\)`;
  const badR = truth === 'linear' ? rE : rL;
  return q({
    prompt: `The table gives ${rng.pick(GROWTH)}, x years after records began. Two models were fitted: a linear model ${fmtL} and an exponential model ${fmtE}. Their residual plots are shown. Which model is more appropriate, and why?`,
    visual: [dataTable(xs, ys, 'y'), residualPlot(xs, rL.map((r) => round(r, 2)), 'linear residual'), residualPlot(xs, rE.map((r) => round(r, 2)), 'exponential residual')],
    correct: `The ${good} model, because its residuals are scattered randomly about 0.`,
    wrong: [
      { value: `The ${bad} model, because its residuals are scattered randomly about 0.`, why: `The ${bad} residuals have signs ${badR.map((r) => (r > 0 ? '+' : '−')).join(' ')}: blocks of one sign that bend in a curve, not random scatter.` },
      { value: `The ${bad} model, because its residual plot shows a clear curved pattern.`, why: 'A pattern in the residuals means the model misses part of the shape of the data. A good model leaves only random scatter.' },
      { value: 'Neither model, because both have residuals that are not 0.', why: 'Measured data never fit a model exactly. The question is which model leaves only random error.' },
      `The ${good} model, because all of its residuals are positive.`,
    ],
    solution: [
      `The ${bad} residuals run ${badR.map((r) => (r > 0 ? '+' : '−')).join(' ')}: a curved pattern, so that model has the wrong shape.`,
      `The ${good} residuals mix signs with no curve or trend, and they are smaller overall.`,
      `So the ${good} model is more appropriate.`,
    ],
    rule: 4,
    skill: 'comparing models by residuals',
    check: () => {
      // Recompute the line by a second method and confirm it is the least-squares line; then compare.
      const N = lineByNormal(xs, ys);
      if (!close(N.m, L.m, 1e-6) || !close(N.c, L.c, 1e-6)) return 'line fit disagrees';
      const sL = sse(xs, ys, (x) => N.m * x + N.c);
      const sE = sse(xs, ys, (x) => E.a * E.b ** x);
      const goodS = truth === 'linear' ? sL : sE;
      const badS = truth === 'linear' ? sE : sL;
      const goodR = truth === 'linear' ? rL : rE;
      return goodS < badS && signChanges(goodR) > signChanges(badR) ? true : 'the chosen model is not the better one';
    },
  });
}

function hardSemiLog(rng) {
  const base10 = rng.bool(0.35);
  const m = base10 ? rng.pick([0.08, 0.12, 0.15, 0.2, -0.1, -0.15]) : rng.pick([0.18, 0.25, 0.35, 0.41, 0.52, -0.22, -0.36, -0.15]);
  const c = base10 ? rng.int(5, 25) / 10 : rng.int(12, 46) / 10;
  const B0 = base10 ? 10 : Math.E;
  const A = B0 ** c;
  const Bv = B0 ** m;
  const lg = base10 ? '\\log' : '\\ln';
  const fa = (v) => num(v, { fixed: v >= 100 ? 1 : 2 });
  const form = (aa, bb) => R`\(y \approx ${fa(aa)} \cdot ${num(bb, { fixed: 3 })}^{x}\)`;
  const other = base10 ? Math.E : 10;
  const xs = [0, 1, 2, 3, 4, 5, 6];
  const pts = xs.map((x) => ({ x, y: c + m * x + rng.float(-0.06, 0.06) }));
  const lo = Math.min(...pts.map((p) => p.y));
  const hi = Math.max(...pts.map((p) => p.y));
  return q({
    prompt: R`For a set of data, the points \((x, ${lg} y)\) lie close to a line, shown. The least-squares line is \(${lg} y = ${linear(m, c)}\). Which exponential model fits the data?`,
    visual: {
      type: 'plot',
      x: [-0.5, 6.5],
      y: [Math.min(0, lo - 0.5), hi + 0.6],
      fns: [{ f: (x) => c + m * x }],
      points: pts,
      axisLabels: ['x', base10 ? 'log y' : 'ln y'],
      alt: `Semi-log plot of ${base10 ? 'log y' : 'ln y'} against x for x = 0 to 6. The points lie close to the line ${base10 ? 'log y' : 'ln y'} = ${t1(m, 2)}x + ${t1(c, 2)}.`,
    },
    correct: form(A, Bv),
    wrong: [
      { value: form(c, Bv), why: R`The intercept is \(${lg} a\), so \(a = ${base10 ? 10 : 'e'}^{${num(c)}}\), not \(${num(c)}\).` },
      m > 0 ? { value: form(A, m), why: R`The slope is \(${lg} b\), so \(b = ${base10 ? 10 : 'e'}^{${num(m)}}\).` } : { value: form(A, 1 + m), why: R`The slope is \(${lg} b\), so \(b = ${base10 ? 10 : 'e'}^{${num(m)}}\), not \(1 ${signed(m)}\).` },
      { value: form(other ** c, other ** m), why: base10 ? R`\(\log\) means base 10, so undo it with powers of 10, not of \(e\).` : R`\(\ln\) means base \(e\), so undo it with powers of \(e\), not of 10.` },
      form(A, 1 + m),
      form(c, m > 0 ? m : 1 + m),
    ],
    solution: [
      R`Undo the logarithm: \(y = ${base10 ? 10 : 'e'}^{${linear(m, c)}} = ${base10 ? 10 : 'e'}^{${num(c)}} \cdot \left(${base10 ? 10 : 'e'}^{${num(m)}}\right)^{x}\).`,
      R`\(a = ${base10 ? 10 : 'e'}^{${num(c)}} \approx ${fa(A)}\) and \(b = ${base10 ? 10 : 'e'}^{${num(m)}} \approx ${num(Bv, { fixed: 3 })}\).`,
      R`So \(y \approx ${fa(A)} \cdot ${num(Bv, { fixed: 3 })}^{x}\).`,
    ],
    rule: 5,
    skill: 'models from semi-log plots',
    check: () => {
      const aR = Number(fa(A));
      const bR = Number(num(Bv, { fixed: 3 }));
      const L = (v) => Math.log(v) / Math.log(B0);
      return [0, 3, 6].every((x) => Math.abs(L(aR * bR ** x) - (m * x + c)) < 0.01) ? true : 'model does not match the line';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeTransformBack(rng) {
  const b = rng.pick([2, -2, 3, frac(1, 2), -1]);
  const a = rng.pick(val(b) === -1 ? [2, -2, 3, -3] : [2, -2, 3, -1, -3]);
  const h = rng.nonzero(-4, 4);
  const k = rng.intExcept(-6, 6, [0]);
  const T = { a, b, h, k };
  const B = val(b);
  const p = Number.isInteger(B) ? B * rng.nonzero(-3, 3) : rng.int(-3, 3);
  const r = rng.nonzero(-4, 4);
  const [u, v] = image([p, r], T);
  const back = rng.bool();
  const given = back ? [u, v] : [p, r];
  const ans = back ? [p, r] : [u, v];
  const cands = back
    ? [
        { value: image([u, v], T), why: R`That moves the point forward again. To go from \(g\) back to \(f\), undo each step: \(x = b(x_{g} - h)\) and \(y = \frac{y_{g} - k}{a}\).` },
        { value: [B * u - h, (v - k) / val(a)], why: R`Undo in reverse order: subtract \(h\) first, then multiply by \(b\): \(${num(b)}(${u} - ${paren0(h)})\).` },
        { value: [B * (u - h), v / val(a) - k], why: R`Subtract \(k\) before dividing by \(a\): \(\frac{${v} - ${paren0(k)}}{${a}}\).` },
        [B * (u + h), (v - k) / val(a)],
        [(u - h) / B, (v - k) / val(a)],
        [B * (u - h), -(v - k) / val(a)],
      ]
    : [
        { value: [B * p + h, val(a) * r + k], why: R`The input is multiplied by \(${num(b)}\), so \(x\)-coordinates are divided by \(${num(b)}\): \(${xWork(p, T)}\).` },
        { value: [(p + h) / B, val(a) * r + k], why: R`Divide by \(b\) first, then shift: \(x = ${xWork(p, T)}\).` },
        { value: [p / B + h, val(a) * (r + k)], why: R`Multiply \(${r}\) by \(${a}\) first, then add \(${paren(k)}\).` },
        [p / B - h, val(a) * r + k],
        [p / B + h, val(a) * r - k],
        [p / B + h, -val(a) * r + k],
      ];
  return q({
    prompt: back
      ? R`The point \(${point(u, v)}\) is on the graph of \(y = g(x)\), where \(g(x) = ${gTex(T)}\). Which point must be on the graph of \(y = f(x)\)?`
      : R`The point \(${point(p, r)}\) is on the graph of \(y = f(x)\). Which point must be on the graph of \(y = ${gTex(T)}\)?`,
    correct: M(point(...ans)),
    wrong: pointChoices(ans, cands),
    solution: back
      ? [
          R`A point \((x, y)\) on \(f\) goes to \(\left(\frac{x}{b} + h,\ ay + k\right)\) on \(g\). Run each step backwards.`,
          R`\(x\): subtract \(h\), then multiply by \(b\): \(${num(b)}(${u} - ${paren0(h)}) = ${num(p)}\).`,
          R`\(y\): subtract \(k\), then divide by \(a\): \(\frac{${v} - ${paren0(k)}}{${a}} = ${num(r)}\). The point on \(f\) is \(${point(p, r)}\).`,
        ]
      : [
          R`A point \((x, y)\) on \(f\) goes to \(\left(\frac{x}{b} + h,\ ay + k\right)\), with \(a = ${a}\), \(b = ${num(b)}\), \(h = ${h}\), \(k = ${k}\).`,
          R`\(x\): \(${xWork(p, T)} = ${num(u)}\). \(y\): \(${yWork(r, T)} = ${num(v)}\).`,
          R`The point on \(g\) is \(${point(u, v)}\).`,
        ],
    rule: 0,
    skill: 'reversing a transformation',
    check: () => (close(gOf(through(p, r), T)(u), v) ? true : 'point is not on g'),
  });
}

function challengeDomain(rng) {
  const kind = rng.int(0, 2);
  let prompt;
  let T;
  let wrong;
  let solution;
  let check;
  let unit;
  if (kind === 0) {
    const P0 = rng.int(12, 40) * 10;
    const pct = rng.pick([8, 10, 12, 15, 20, 25]);
    const C = P0 * rng.int(3, 8);
    const b = 1 + pct / 100;
    T = Math.log(C / P0) / Math.log(b);
    unit = 'years';
    prompt = R`A nature reserve has ${P0} deer, and the herd grows by ${pct}% each year, so \(P(t) = ${P0}(${num(b)})^{t}\). The reserve can support at most ${txt(C)} deer, and the model applies only until the herd reaches that number. On which domain does the model make sense? (Round to the nearest tenth.)`;
    wrong = [
      { value: C / P0, why: R`\(\frac{${C}}{${P0}} = ${C / P0}\) is the factor the herd must grow by, not the time. Solve \((${num(b)})^{t} = ${C / P0}\) with logarithms.` },
      { value: (C - P0) / (P0 * pct / 100), why: `That assumes the herd gains the same ${pct}% of ${P0} deer every year. Growth by a percent compounds.` },
      Math.log(C / P0) / (pct / 100),
      Math.log(C) / Math.log(b),
    ];
    solution = [R`The ceiling gives \(${P0}(${num(b)})^{t} = ${C}\), so \((${num(b)})^{t} = ${C / P0}\).`, R`\(t = \frac{\ln ${C / P0}}{\ln ${num(b)}} \approx ${num(T, { fixed: 1 })}\).`, R`Time starts at 0, so the domain is \(0 \le t \le ${num(T, { fixed: 1 })}\) years.`];
    check = () => (Math.abs(P0 * b ** T - C) < 1e-6 && P0 * b ** (T - 0.5) < C ? true : 'ceiling time wrong');
  } else if (kind === 1) {
    const V0 = rng.int(15, 45) * 20;
    const rate = rng.int(6, 25);
    const F = rng.int(4, 10) * 10;
    T = (V0 - F) / rate;
    unit = 'minutes';
    prompt = R`A tank holds ${V0} L of water and drains at ${rate} L per minute, so \(V(t) = ${linear(-rate, V0, 't')}\). The pump switches off when ${F} L are left. On which domain does the model describe the draining? (Round to the nearest tenth.)`;
    wrong = [
      { value: V0 / rate, why: `That is when the tank would be empty. The pump stops with ${F} L still in the tank.` },
      { value: (V0 + F) / rate, why: R`Set \(V(t) = ${F}\): \(${V0} - ${rate}t = ${F}\), so \(t = \frac{${V0} - ${F}}{${rate}}\).` },
      F / rate,
      V0 / F,
    ];
    solution = [R`The floor gives \(${V0} - ${rate}t = ${F}\), so \(${rate}t = ${V0 - F}\).`, R`\(t = \frac{${V0 - F}}{${rate}} \approx ${num(T, { fixed: 1 })}\).`, R`The domain is \(0 \le t \le ${num(T, { fixed: 1 })}\) minutes.`];
    check = () => (Math.abs(V0 - rate * T - F) < 1e-9 ? true : 'floor time wrong');
  } else {
    const h0 = rng.int(2, 30);
    const v = rng.int(8, 25);
    T = (v + Math.sqrt(v * v + 19.6 * h0)) / 9.8;
    unit = 'seconds';
    prompt = R`A ball is thrown upward at ${v} m/s from a height of ${h0} m. Its height is \(h(t) = -4.9t^{2} + ${v}t + ${h0}\) metres until it lands on the ground. On which domain does the model make sense? (Round to the nearest tenth.)`;
    wrong = [
      { value: v / 9.8, why: R`\(\frac{${v}}{9.8}\) is the time of the greatest height (the vertex), not when the ball lands.` },
      { value: (2 * v) / 9.8, why: `That is when the ball is back at its starting height of ${h0} m; it still has ${h0} m to fall.` },
      Math.sqrt(h0 / 4.9),
      (v + Math.sqrt(v * v + 4 * 4.9 * h0)) / 4.9,
    ];
    solution = [R`The ball lands when \(h(t) = 0\): \(-4.9t^{2} + ${v}t + ${h0} = 0\).`, R`Quadratic formula: \(t = \frac{-${v} - \sqrt{${v}^{2} + 4(4.9)(${h0})}}{-9.8} \approx ${num(T, { fixed: 1 })}\) (the other root is negative).`, R`The domain is \(0 \le t \le ${num(T, { fixed: 1 })}\) seconds.`];
    check = () => (Math.abs(-4.9 * T * T + v * T + h0) < 1e-6 && -4.9 * (T / 2) ** 2 + v * (T / 2) + h0 > 0 ? true : 'landing time wrong');
  }
  return q({
    prompt,
    correct: round(T, 1),
    fmt: (x) => R`\(0 \le t \le ${num(x, { fixed: 1 })}\) ${unit}`,
    wrong: apart(round(T, 1), wrong, { places: 1, positive: true }),
    solution,
    rule: 3,
    skill: 'a sensible domain',
    check,
  });
}

function challengeExpPredict(rng) {
  const opt = rng.pick([
    { b: 2, d: 2, mult: 1 }, { b: 2, d: 3, mult: 1 }, { b: 1.5, d: 2, mult: 4 }, { b: 1.2, d: 2, mult: 25 },
    { b: 0.5, d: 2, mult: 4 }, { b: 0.5, d: 3, mult: 8 }, { b: 0.8, d: 2, mult: 25 },
  ]);
  const { b, d } = opt;
  const grow = b > 1;
  const t1v = rng.int(1, 4);
  const t2 = t1v + d;
  const t3 = t2 + rng.int(1, 3);
  const y1 = opt.mult * rng.int(grow ? 3 : 12, grow ? 30 : 60);
  const y2 = round(y1 * b ** d, 6);
  const ans = round(y2 * b ** (t3 - t2), 1);
  const story = grow
    ? `A lab counts a bacteria culture: ${txt(y1)} thousand cells after ${t1v} hours and ${txt(y2)} thousand cells after ${t2} hours.`
    : `The amount of a medicine in a patient's blood is ${txt(y1)} mg after ${t1v} hours and ${txt(y2)} mg after ${t2} hours.`;
  const R2 = y2 / y1;
  return q({
    prompt: `${story} Assuming an exponential model, predict the amount after ${t3} hours, to the nearest tenth.`,
    correct: ans,
    fmt: dec(1, grow ? 'thousand cells' : 'mg'),
    wrong: apart(ans, [
      { value: y2 + ((y2 - y1) / d) * (t3 - t2), why: 'That continues the straight line through the two points. An exponential model multiplies by the same factor each hour.' },
      { value: y2 * R2 ** (t3 - t2), why: R`\(\frac{${txt(y2)}}{${txt(y1)}} = ${num(R2)}\) is the factor for ${d} hours, not for one hour: \(b^{${d}} = ${num(R2)}\).` },
      { value: y1 * b ** t3, why: `That treats ${txt(y1)} as the amount at hour 0. It is the amount at hour ${t1v}.` },
      y2 * b,
    ], { places: 1, positive: true }),
    solution: [
      R`Divide the amounts: \(b^{${t2} - ${t1v}} = \frac{${txt(y2)}}{${txt(y1)}} = ${num(R2)}\), so \(b^{${d}} = ${num(R2)}\) and \(b = ${num(b)}\).`,
      R`From hour ${t2} to hour ${t3} is ${t3 - t2} hour${t3 - t2 === 1 ? '' : 's'}: multiply by \(${num(b)}^{${t3 - t2}}\).`,
      R`\(${num(y2)} \cdot ${num(b)}^{${t3 - t2}} ${close(y2 * b ** (t3 - t2), ans) ? '=' : R`\approx`} ${num(ans, { fixed: 1 })}\).`,
    ],
    rule: 3,
    skill: 'building an exponential model',
    check: () => {
      const a = y1 / b ** t1v;
      return close(a * b ** t2, y2, 1e-9) && Math.abs(a * b ** t3 - ans) <= 0.05 + 1e-9 ? true : 'prediction does not follow the model';
    },
  });
}

function challengeSemiLogRate(rng) {
  const m = rng.pick([0.12, 0.2, 0.25, 0.3, 0.4, -0.15, -0.25, -0.35, -0.2]);
  const c = rng.int(5, 30) / 10 + (m < 0 ? 2 : 0);
  const x1 = rng.int(0, 2);
  const x2 = x1 + rng.pick([2, 4, 5]);
  const L1 = round(c + m * x1, 2);
  const L2 = round(c + m * x2, 2);
  const slope = (L2 - L1) / (x2 - x1);
  const grow = slope > 0;
  const pct = grow ? (Math.exp(slope) - 1) * 100 : (1 - Math.exp(slope)) * 100;
  const ans = round(pct, 1);
  const xs = [0, 1, 2, 3, 4, 5, 6, 7];
  const pts = xs.map((x) => ({ x, y: c + m * x + rng.float(-0.07, 0.07) }));
  const ys = [L1, L2, ...pts.map((p) => p.y)];
  return q({
    prompt: R`A semi-log plot of \(\ln y\) against \(x\) is shown with its fitted line, which passes through \(${point(x1, L1)}\) and \(${point(x2, L2)}\). By what percent does \(y\) ${grow ? 'increase' : 'decrease'} for each increase of 1 in \(x\)? (Round to the nearest tenth of a percent.)`,
    visual: {
      type: 'plot',
      x: [-0.5, 7.5],
      y: [Math.min(0, ...ys) - 0.2, Math.max(...ys) + 0.6],
      fns: [{ f: (x) => c + m * x }],
      points: [...pts, { x: x1, y: L1, label: `(${x1}, ${t1(L1, 2)})`, color: 'b' }, { x: x2, y: L2, label: `(${x2}, ${t1(L2, 2)})`, color: 'b' }],
      axisLabels: ['x', 'ln y'],
      alt: `Semi-log plot of ln y against x. The data points lie close to a straight line through (${x1}, ${t1(L1, 2)}) and (${x2}, ${t1(L2, 2)}).`,
    },
    correct: ans,
    fmt: (v) => R`\(${num(v, { fixed: 1 })}\%\)`,
    wrong: apart(ans, [
      { value: Math.abs(slope) * 100, why: R`The slope \(${num(round(slope, 4))}\) is \(\ln b\), not the growth rate. Find \(b = e^{${num(round(slope, 4))}}\) first.` },
      { value: Math.abs(10 ** slope - 1) * 100, why: R`The axis shows the natural logarithm, so undo it with \(e\), not with 10.` },
      { value: Math.abs(Math.exp(L2 - L1) - 1) * 100, why: `That is the change over ${x2 - x1} units of x, not over one.` },
      Math.exp(Math.abs(slope)) * 100,
    ], { places: 1, positive: true }),
    solution: [
      R`Slope of the line: \(\frac{${num(L2)} - ${paren0(L1)}}{${x2} - ${x1}} = ${num(round(slope, 4))}\). This is \(\ln b\).`,
      R`\(b = e^{${num(round(slope, 4))}} \approx ${num(Math.exp(slope), { fixed: 4 })}\).`,
      grow ? R`Each step multiplies \(y\) by about \(${num(Math.exp(slope), { fixed: 4 })}\): an increase of about \(${num(ans, { fixed: 1 })}\%\).` : R`Each step multiplies \(y\) by about \(${num(Math.exp(slope), { fixed: 4 })}\): a decrease of about \(${num(ans, { fixed: 1 })}\%\).`,
    ],
    rule: 5,
    skill: 'growth rate from a semi-log plot',
    check: () => {
      // y at x1 and x2 from the line, then the per-unit factor from those two values.
      const y1 = Math.exp(L1);
      const y2 = Math.exp(L2);
      const per = (y2 / y1) ** (1 / (x2 - x1));
      return Math.abs(Math.abs(per - 1) * 100 - ans) <= 0.05 + 1e-9 ? true : 'percent change wrong';
    },
  });
}

// ───────────── Fixed data for the examples and the model ─────────────

const EX_X = [0, 1, 2, 3, 4, 5, 6];
const EX_Y = [2.1, 2.8, 4.1, 5.9, 8.0, 11.6, 16.3];
const EX_L = fitLine(EX_X, EX_Y);
const EX_E = fitExp(EX_X, EX_Y);
const EX_RL = EX_X.map((x, i) => round(EX_Y[i] - (EX_L.m * x + EX_L.c), 2));
const EX_RE = EX_X.map((x, i) => round(EX_Y[i] - EX_E.a * EX_E.b ** x, 2));

const PLANT_X = [0, 1, 2, 3, 4, 5, 6];
const PLANT_Y = [4.3, 5.8, 8.1, 9.7, 12.2, 13.9, 15.8];
const PLANT_FIT = fitLine(PLANT_X, PLANT_Y);

// ───────────── Topic ─────────────

export default {
  id: 'function-models',
  title: 'Choosing & Checking Function Models',
  summary: 'Transform parent functions, choose and build a model from a context or data, and check it with residuals and semi-log plots.',
  standards: ['AP Precalculus 1.12', 'AP Precalculus 1.13', 'AP Precalculus 1.14', 'AP Precalculus 2.4', 'AP Precalculus 2.6', 'AP Precalculus 2.15', 'CCSS F-LE.A.1'],

  explain: {
    intro: R`A function model is a choice: which family of functions has the right shape, and which version of it, \(g(x) = af\big(b(x - h)\big) + k\), fits the numbers. Make the choice from how the quantity changes, build the model from given information, and then check it: the leftover errors (residuals) should look like random noise.`,
    rules: [
      {
        title: 'Transformations: g(x) = a·f(b(x − h)) + k',
        text: R`Changes inside the brackets act horizontally, in the opposite way to how they look: \(h\) shifts right by \(h\), and \(b\) scales horizontally by \(\frac{1}{|b|}\) (reflecting across the \(y\)-axis if \(b < 0\)). Changes outside act vertically, as they look: \(a\) scales by \(|a|\) (reflecting across the \(x\)-axis if \(a < 0\)) and \(k\) shifts up by \(k\). A point \((x, y)\) on \(f\) moves to \(\left(\frac{x}{b} + h,\ ay + k\right)\).`,
        example: R`\((4, 2)\) on \(f\) moves to \(\left(\frac{4}{2} + 1,\ 3 \cdot 2 - 5\right) = (3, 1)\) on \(g(x) = 3f\big(2(x - 1)\big) - 5\).`,
      },
      {
        title: 'Domain and range after a transformation',
        text: R`The domain changes only with \(b\) and \(h\): solve "input of \(f\) is in the domain of \(f\)". The range changes only with \(a\) and \(k\): multiply the ends by \(a\) (a negative \(a\) swaps them), then add \(k\).`,
        example: R`If \(f\) has domain \([0, 6]\) and range \([-1, 4]\), then \(g(x) = -2f(x - 3) + 1\) has domain \([3, 9]\) and range \([-7, 3]\).`,
      },
      {
        title: 'Choosing a model type',
        text: R`From a context, ask how the quantity changes: the same amount per step (linear), the same percent per step (exponential), one rise and fall such as a projectile (quadratic), volume from a length (cubic), equal additions for each multiplication of the input (logarithmic), a repeating cycle (sinusoidal), or different rules on different intervals (piecewise). From a table with equal steps in \(x\): roughly equal first differences suggest linear, equal second differences quadratic, equal ratios exponential, and values that repeat sinusoidal.`,
        example: R`\(20, 31, 46, 69, 103\): differences \(11, 15, 23, 34\) grow, ratios are all about \(1.5\): exponential.`,
      },
      {
        title: 'Building and interpreting a model',
        text: R`Exponential through two points: divide the outputs to get a power of \(b\). Quadratic from a vertex \((h, k)\) and a point: put the point into \(y = a(x - h)^{2} + k\) and solve for \(a\). Every parameter has units: a slope is "output units per input unit", an exponential base is "multiplied by \(b\) per step". A model only makes sense on a domain that fits the story, ending where a ceiling or floor (a capacity, an empty tank, the ground) is reached.`,
        example: R`Vertex \((2, 9)\) through \((0, 1)\): \(1 = 4a + 9\), so \(a = -2\) and \(y = -2(x - 2)^{2} + 9\).`,
      },
      {
        title: 'Residuals',
        text: R`A residual is actual minus predicted: \(y - \hat{y}\). Positive means the data point is above the model. Plot residuals against \(x\): random scatter about 0 means the model type is appropriate; a curve or other pattern means the model has the wrong shape. Between two models, choose the one whose residuals are smaller and pattern-free.`,
        example: R`The model predicts 52.4 and the actual value is 49.3: the residual is \(49.3 - 52.4 = -3.1\).`,
      },
      {
        title: 'Semi-log plots',
        text: R`If the points \((x, \ln y)\) lie on a line \(\ln y = mx + c\), the data are exponential: \(y = e^{c} \cdot (e^{m})^{x}\), so \(a = e^{c}\) and \(b = e^{m}\). With \(\log y\) (base 10), \(a = 10^{c}\) and \(b = 10^{m}\).`,
        example: R`\(\ln y = 0.26x + 1.95\) gives \(a = e^{1.95} \approx 7.03\) and \(b = e^{0.26} \approx 1.297\): \(y\) grows about 29.7% per unit of \(x\).`,
      },
    ],
    vocab: [
      { term: 'parent function', def: R`The simplest member of a family, such as \(x^{2}\), \(\sqrt{x}\), \(|x|\) or \(2^{x}\), from which the others are made by transformations.` },
      { term: 'dilation', def: 'A stretch or compression. A vertical dilation by a factor of 3 triples every y-coordinate.' },
      { term: 'residual', def: R`Actual value minus the value the model predicts, \(y - \hat{y}\).` },
      { term: 'residual plot', def: 'A graph of the residuals against x. A good model leaves random scatter about 0.' },
      { term: 'semi-log plot', def: R`A graph of \(\ln y\) (or \(\log y\)) against \(x\). Exponential data appear as a straight line.` },
    ],
    mistakes: [
      R`Reading \(f(x - 3)\) as a shift left. Inside the brackets the sign works backwards: \(x - 3\) is a shift right.`,
      R`Multiplying \(x\)-coordinates by \(b\) for \(f(bx)\). The graph is compressed: divide \(x\)-coordinates by \(b\).`,
      'Computing a residual as predicted minus actual. It is actual minus predicted.',
      'Judging a model by whether its residuals are both positive and negative. A least-squares line always has both; look for a pattern instead.',
      R`Using the slope of a semi-log line as the growth rate. The slope is \(\ln b\); the base is \(b = e^{\text{slope}}\).`,
    ],
    visual: {
      type: 'plot',
      x: [-2, 9],
      y: [-5, 4],
      square: true,
      step: [1, 1],
      fns: [
        { f: (x) => Math.sqrt(x), domain: [0, 9], color: 'b', dashed: true, label: 'y = √x', labelAt: 6 },
        { f: (x) => -2 * Math.sqrt(x - 3) + 1, domain: [3, 9], label: 'y = −2√(x − 3) + 1', labelAt: 6.5 },
      ],
      points: [{ x: 4, y: 2, label: '(4, 2)', color: 'b' }, { x: 3, y: 1, label: '(3, 1)' }, { x: 7, y: -3, label: '(7, −3)' }],
      alt: 'The dashed graph of y = √x starts at (0, 0) and passes through (4, 2). The solid graph of y = −2√(x − 3) + 1 is the same curve shifted right 3, flipped upside down, stretched vertically by 2 and moved up 1: it starts at (3, 1) and passes through (7, −3).',
    },
  },

  examples: [
    {
      title: 'Transforming a parent function',
      problem: R`Let \(f(x) = \sqrt{x}\) and \(g(x) = -2f(x - 3) + 1\). Describe the graph of \(g\) and give its domain and range.`,
      steps: [
        R`Inside: \(x - 3\) shifts the graph right 3. Outside: \(-2\) reflects it across the \(x\)-axis and stretches it vertically by 2, then \(+1\) shifts it up 1.`,
        R`Key points \((x, y) \to (x + 3,\ -2y + 1)\): \((0, 0) \to (3, 1)\), \((1, 1) \to (4, -1)\), \((4, 2) \to (7, -3)\).`,
        R`Domain: \(\sqrt{x - 3}\) needs \(x - 3 \ge 0\), so \(x \ge 3\).`,
        R`Range: \(\sqrt{x - 3} \ge 0\), so \(-2\sqrt{x - 3} \le 0\) and \(g(x) \le 1\).`,
      ],
      answer: R`Domain \([3, \infty)\), range \((-\infty, 1]\); the curve starts at \((3, 1)\) and goes down to the right.`,
    },
    {
      title: 'Choosing a model from a table',
      problem: R`Which type of model suits the data \(x = 0, 1, 2, 3, 4, 5\); \(y = 3.0, 4.6, 6.7, 10.1, 15.2, 22.9\)?`,
      steps: [
        R`First differences: \(1.6, 2.1, 3.4, 5.1, 7.7\). They grow, so the data are not linear.`,
        R`Second differences: \(0.5, 1.3, 1.7, 2.6\). They grow as well, so the data are not quadratic.`,
        R`Ratios: \(1.53, 1.46, 1.51, 1.50, 1.51\). All about \(1.5\).`,
      ],
      answer: R`Exponential, roughly \(y = 3 \cdot 1.5^{x}\).`,
      visual: dataTable([0, 1, 2, 3, 4, 5], [3.0, 4.6, 6.7, 10.1, 15.2, 22.9], 'y'),
    },
    {
      title: 'Word problem: choosing between two models',
      word: true,
      problem: R`A new app's users, in thousands, \(x\) months after launch are \(${EX_Y.map((y) => num(y)).join(R`,\ `)}\) for \(x = 0\) to \(6\). A linear model \(\hat{y} = ${linear(round(EX_L.m, 2), round(EX_L.c, 2))}\) and an exponential model \(\hat{y} = ${num(EX_E.a, { places: 2 })} \cdot ${num(EX_E.b, { places: 3 })}^{x}\) were fitted. Which is better?`,
      steps: [
        R`Linear residuals (actual \(-\) predicted): \(${EX_RL.map((r) => num(r)).join(R`,\ `)}\). Positive at both ends, negative in the middle: a U-shaped pattern.`,
        R`Exponential residuals: \(${EX_RE.map((r) => num(r)).join(R`,\ `)}\). Small, with mixed signs and no curve.`,
        'The pattern shows the line has the wrong shape; the exponential model leaves only random error.',
      ],
      answer: 'The exponential model is more appropriate.',
      visual: [residualPlot(EX_X, EX_RL, 'linear residual'), residualPlot(EX_X, EX_RE, 'exponential residual')],
    },
    {
      title: 'Word problem: a model from a semi-log plot',
      word: true,
      problem: R`For the number of a city's bike-share rides (thousands) \(x\) years after 2018, the points \((x, \ln y)\) lie close to the line \(\ln y = 0.26x + 1.95\). Write an exponential model and interpret it.`,
      steps: [
        R`Undo the logarithm: \(y = e^{0.26x + 1.95} = e^{1.95} \cdot \left(e^{0.26}\right)^{x}\).`,
        R`\(e^{1.95} \approx 7.03\) and \(e^{0.26} \approx 1.297\), so \(y \approx 7.03 \cdot 1.297^{x}\).`,
        R`About 7,030 rides in 2018, growing by about 29.7% per year.`,
      ],
      answer: R`\(y \approx 7.03 \cdot 1.297^{x}\) thousand rides.`,
    },
  ],

  models: [
    {
      id: 'transform-parent',
      title: 'Transform a parent function',
      intro: 'Choose a parent function and the four numbers in g(x) = a·f(b(x − h)) + k. The model moves the key points and finds the domain and range.',
      inputs: [
        { name: 'parent', label: 'Parent function f', type: 'select', value: 'sqrt', options: [{ value: 'sq', label: 'x²' }, { value: 'abs', label: '|x|' }, { value: 'sqrt', label: '√x' }, { value: 'cube', label: 'x³' }, { value: 'exp2', label: '2ˣ' }] },
        { name: 'a', label: 'a (vertical factor)', type: 'number', min: -4, max: 4, step: 0.5, value: -2 },
        { name: 'b', label: 'b (horizontal factor)', type: 'number', min: -4, max: 4, step: 0.5, value: 1 },
        { name: 'h', label: 'h (horizontal shift)', type: 'int', min: -6, max: 6, value: 3 },
        { name: 'k', label: 'k (vertical shift)', type: 'int', min: -6, max: 6, value: 1 },
      ],
      compute({ parent, a, b, h, k }) {
        if (a === 0) return { error: 'With a = 0 the graph flattens to the line y = k. Choose a value of a other than 0.' };
        if (b === 0) return { error: 'With b = 0 the input of f is always 0, so g is constant. Choose a value of b other than 0.' };
        const P = PARENTS[parent] ?? PARENTS.sqrt;
        const T = { a, b, h, k };
        const g = gOf(P.f, T);
        const imgs = P.pts.map((pt) => image(pt, T));
        const { dom, ran } = domainRange(P, T);
        const sqrtDom = parent === 'sqrt' ? (b > 0 ? [h, 12] : [-12, h]) : undefined;
        return {
          problem: R`Graph \(g(x) = ${gTex(T)}\), where \(f(x) = ${P.tex}\).`,
          steps: [
            `${describe(T)}.`,
            R`Each point \((x, y)\) moves to \(\left(${b === 1 ? 'x' : R`\frac{x}{${num(b)}}`}${h ? ` ${signed(h)}` : ''},\ ${coef(a)}y${k ? ` ${signed(k)}` : ''}\right)\): ${P.pts.map((pt, i) => R`\(${point(...pt)} \to ${point(...imgs[i].map((v) => round(v, 3)))}\)`).join(', ')}.`,
            P.dom === 'all' ? R`\(f\) accepts every input, so the domain of \(g\) is \(${dom}\).` : R`\(f\) needs input \(\ge 0\): \(${inner(b, h)} \ge 0\) gives the domain \(${dom}\).`,
            P.ran === 'all' ? R`The range of \(f\) is all real numbers, so the range of \(g\) is \(${ran}\).` : R`The outputs of \(f\) are ${P.ran === 'pos' ? 'positive' : R`\(\ge 0\)`}; multiplying by \(${num(a)}\) and adding \(${num(k)}\) gives the range \(${ran}\)${P.ran === 'pos' ? R`, with horizontal asymptote \(y = ${num(k)}\)` : ''}.`,
          ],
          answer: R`Domain \(${dom}\), range \(${ran}\).`,
          visual: {
            type: 'plot',
            x: [-10, 10],
            y: [-10, 10],
            square: true,
            step: [2, 2],
            fns: [{ f: P.f, color: 'b', dashed: true, domain: parent === 'sqrt' ? [0, 12] : undefined }, { f: g, domain: sqrtDom }],
            points: imgs.filter(([x, y]) => Math.abs(x) <= 10 && Math.abs(y) <= 10).map(([x, y]) => ({ x, y, label: `(${t1(x, 2)}, ${t1(y, 2)})` })),
            alt: `Dashed graph of f(x) = ${P.text} and solid graph of g. The key points of f move to ${imgs.map(([x, y]) => `(${t1(x, 2)}, ${t1(y, 2)})`).join(', ')}.`,
          },
        };
      },
    },
    {
      id: 'residuals-line',
      title: 'Word problem: test a line with residuals',
      word: true,
      intro: 'A seedling is measured once a week. Type in the slope and intercept of a line you think fits; the model finds the residuals and judges the line.',
      inputs: [
        { name: 'm', label: 'Slope (cm per week)', type: 'number', min: -5, max: 10, step: 0.1, value: 2 },
        { name: 'c', label: 'Intercept (cm)', type: 'number', min: -10, max: 20, step: 0.1, value: 4 },
      ],
      compute({ m, c }) {
        const pred = PLANT_X.map((x) => m * x + c);
        const rs = PLANT_X.map((x, i) => round(PLANT_Y[i] - pred[i], 2));
        const S = rs.reduce((s, r) => s + r * r, 0);
        const best = sse(PLANT_X, PLANT_Y, (x) => PLANT_FIT.m * x + PLANT_FIT.c);
        const pos = rs.filter((r) => r > 0).length;
        const sc = signChanges(rs);
        const verdict = pos === rs.length ? 'Every residual is positive: the line is too low.'
          : pos === 0 ? 'Every residual is negative: the line is too high.'
            : sc <= 2 ? 'The residuals form runs of one sign (a tilt or curve): the slope or intercept is off.'
              : 'The residuals mix signs with no pattern: the line fits the shape of the data.';
        return {
          problem: R`A seedling's height (cm) at weeks 0 to 6 is ${PLANT_Y.join(', ')}. Test the line \(\hat{y} = ${linear(m, c)}\).`,
          steps: [
            R`Predicted heights \(\hat{y} = ${linear(m, c)}\): \(${pred.map((v) => num(v, { places: 2 })).join(R`,\ `)}\).`,
            R`Residuals \(y - \hat{y}\): \(${rs.map((r) => num(r)).join(R`,\ `)}\).`,
            R`Sum of squared residuals: \(${num(S, { places: 2 })}\). The least-squares line \(\hat{y} = ${linear(round(PLANT_FIT.m, 2), round(PLANT_FIT.c, 2))}\) has \(${num(best, { places: 2 })}\), the smallest possible.`,
            verdict,
          ],
          answer: `${verdict} Sum of squared residuals ${t1(S, 2)} (best possible ${t1(best, 2)}).`,
          visual: [
            {
              type: 'plot',
              x: [-0.5, 6.5],
              y: [0, 20],
              fns: [{ f: (x) => m * x + c }],
              points: PLANT_X.map((x, i) => ({ x, y: PLANT_Y[i] })),
              axisLabels: ['week', 'cm'],
              alt: `Scatter plot of the seedling heights ${PLANT_Y.join(', ')} at weeks 0 to 6, with the line of slope ${t1(m)} and intercept ${t1(c)}.`,
            },
            residualPlot(PLANT_X, rs, 'line residual'),
          ],
        };
      },
    },
  ],

  quiz: {
    easy: [easyTransformPoint, easyDescribe, easyContextModel, easyResidual],
    medium: [mediumNoisyTable, mediumBuildQuadratic, mediumInterpret, mediumResidualPlot],
    hard: [hardDomainRange, hardFromGraph, hardCompareResiduals, hardSemiLog],
    challenge: [challengeTransformBack, challengeDomain, challengeExpPredict, challengeSemiLogRate],
  },
};
