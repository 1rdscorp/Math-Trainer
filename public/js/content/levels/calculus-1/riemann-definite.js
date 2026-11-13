import { R, q, frac, num, round, range, sum, paren, terms, linear, poly, polyEval, product, dot, joinList, checkEqual, checkIntegral, integrate, close } from '../../lib/index.js';
import { M, fit, rowTable } from './_shared.js';

// ───────────── Helpers ─────────────

// Riemann sum of f on [a, b] with n equal subintervals. kind: 'left', 'right', 'mid' or 'trap'.
function riemann(f, a, b, n, kind) {
  const dx = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x = a + i * dx;
    s += kind === 'left' ? f(x) : kind === 'right' ? f(x + dx) : kind === 'mid' ? f(x + dx / 2) : (f(x) + f(x + dx)) / 2;
  }
  return s * dx;
}
// The piecewise-linear function through the points [[x, y], …].
const interp = (pts) => (x) => {
  let i = 1;
  while (i < pts.length - 1 && x > pts[i][0]) i++;
  const [[x0, y0], [x1, y1]] = [pts[i - 1], pts[i]];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
};
// ∫ of a function with corners at the x-values in xs, one smooth piece at a time.
const integratePieces = (f, xs) => sum(xs.slice(1).map((x, i) => integrate(f, xs[i], x, 100)));
// A line with ∫ₐᵇ f = P and ∫_b^c f = Q. (The average of a line over an interval is its value at the midpoint.)
function lineWith(a, b, c, P, Q) {
  const [x1, y1, x2, y2] = [(a + b) / 2, P / (b - a), (b + c) / 2, Q / (c - b)];
  return (x) => y1 + ((y2 - y1) / (x2 - x1)) * (x - x1);
}
// A sum, or an expression that starts with a minus sign, gets parentheses when it is used as an integrand.
const wrap = (tex) => (/ [+-] /.test(tex) || tex.startsWith('-') ? `(${tex})` : tex);
const integral = (lo, hi, body, v = 'x') => R`\int_{${lo}}^{${hi}} ${body}\,d${v}`;
// (n/d)·π as LaTeX: piTex(9, 2) → "\frac{9\pi}{2}", piTex(4) → "4\pi", piTex(1) → "\pi".
function piTex(n, d = 1) {
  const c = frac(n, d);
  const top = R`${c.n === 1 ? '' : c.n}\pi`;
  return c.d === 1 ? top : R`\frac{${top}}{${c.d}}`;
}
const KIND = { left: { name: 'left', points: 'left endpoints', at: 0 }, right: { name: 'right', points: 'right endpoints', at: 1 }, mid: { name: 'midpoint', points: 'midpoints', at: 0.5 } };

// ───────────── Easy ─────────────

const FLOWS = [
  { act: 'A pump fills a tank', rate: 'liters per minute', time: 'minutes', unit: 'liters', axes: ['t (min)', 'L/min'], rates: [5, 8, 10, 12, 15, 20] },
  { act: 'A machine fills bottles', rate: 'bottles per minute', time: 'minutes', unit: 'bottles', axes: ['t (min)', 'bottles/min'], rates: [20, 24, 30, 36, 40, 50] },
  { act: 'A printer prints', rate: 'pages per minute', time: 'minutes', unit: 'pages', axes: ['t (min)', 'pages/min'], rates: [6, 8, 10, 12, 16, 20] },
  { act: 'A file downloads', rate: 'megabytes per second', time: 'seconds', unit: 'megabytes', axes: ['t (s)', 'MB/s'], rates: [2, 3, 4, 5, 6, 8] },
];

function easyAccumulation(rng) {
  const c = rng.pick(FLOWS);
  const [r1, r2] = rng.sample(c.rates, 2);
  const steps = rng.bool();
  const [t1, t2] = [rng.int(2, 5), steps ? rng.int(2, 5) : 0];
  if (!steps && ((r1 + r2) * t1) % 2) return easyAccumulation(rng);
  const total = steps ? r1 * t1 + r2 * t2 : ((r1 + r2) * t1) / 2;
  const ramp = (t) => r1 + ((r2 - r1) * t) / t1;
  return q({
    prompt: `${c.act} at ${steps ? `${r1} ${c.rate} for ${t1} ${c.time}, then at ${r2} ${c.rate} for the next ${t2} ${c.time}` : `a rate that changes steadily from ${r1} to ${r2} ${c.rate} over ${t1} ${c.time}`}. The graph shows the rate. How many ${c.unit} is that in total?`,
    visual: {
      type: 'plot', x: [0, t1 + t2 + 1], y: [0, Math.max(r1, r2) * 1.25], axisLabels: c.axes,
      ...(steps ? { rects: [{ x: 0, w: t1, h: r1, color: 'a' }, { x: t1, w: t2, h: r2, color: 'b' }] } : { fns: [{ f: ramp, domain: [0, t1] }], shade: [{ f: ramp, from: 0, to: t1 }] }),
      alt: steps ? `Rate graph with two horizontal steps: a rate of ${r1} from time 0 to ${t1}, then a rate of ${r2} from time ${t1} to ${t1 + t2}. The rectangle under each step is shaded.` : `Rate graph: a straight line from a rate of ${r1} at time 0 to a rate of ${r2} at time ${t1}. The region under the line is shaded.`,
    },
    correct: total,
    unit: c.unit,
    wrong: steps
      ? [{ value: (r1 + r2) * (t1 + t2), why: 'Each rate applies only during its own time interval. Multiply each rate by its own time, then add.' }, { value: r1 + r2, why: 'Adding the rates ignores how long each one lasts. Each amount is rate × time, the area of a rectangle.' }, r1 * t1, r2 * (t1 + t2), r1 * t2 + r2 * t1]
      : [{ value: r2 * t1, why: 'That uses the final rate for the whole time. The region under the graph is a trapezoid, so average the starting and final rates.' }, { value: (r1 + r2) * t1, why: R`The area of a trapezoid is \(\tfrac{1}{2}\) × (sum of the parallel sides) × width.` }, r1 * t1, (Math.abs(r2 - r1) * t1) / 2],
    solution: steps
      ? ['The total is the area under the rate graph: one rectangle for each time interval.', R`First interval: \(${r1} \cdot ${t1} = ${r1 * t1}\). Second interval: \(${r2} \cdot ${t2} = ${r2 * t2}\).`, R`Total: \(${r1 * t1} + ${r2 * t2} = ${total}\) ${c.unit}.`]
      : ['The total is the area under the rate graph. The graph is a straight line, so the region is a trapezoid.', R`Its parallel sides are the starting rate \(${r1}\) and the final rate \(${r2}\), and its width is \(${t1}\).`, R`Area: \(\tfrac{1}{2}(${r1} + ${r2})(${t1}) = ${total}\) ${c.unit}.`],
    rule: 0, skill: 'accumulation',
    check: () => checkEqual(total, steps ? integrate(() => r1, 0, t1) + integrate(() => r2, t1, t1 + t2) : integrate(ramp, 0, t1), 1e-9, 'area under the rate graph'),
  });
}

function easyRiemannSum(rng) {
  const quad = rng.bool(0.6);
  const [c, m, k] = [rng.int(0, 5), rng.int(1, 4), rng.int(0, 6)];
  const f = quad ? (x) => x * x + c : (x) => m * x + k;
  const fTex = quad ? terms([[1, 'x^{2}'], [c, '']]) : linear(m, k);
  const n = rng.int(2, 4);
  const dx = quad ? 1 : rng.pick([1, 2]);
  const lo = rng.int(0, 2);
  const hi = lo + n * dx;
  const side = rng.pick(['left', 'right']);
  const grid = range(0, n).map((i) => lo + i * dx);
  const [lefts, rights] = [grid.slice(0, -1), grid.slice(1)];
  const used = side === 'left' ? lefts : rights;
  const heights = used.map(f);
  const value = dx * sum(heights);
  return q({
    prompt: R`Use a **${side}** Riemann sum with \(${n}\) rectangles of equal width to approximate \(${integral(lo, hi, wrap(fTex))}\).`,
    visual: {
      type: 'plot', ...fit(f, -0.5, hi + 0.5, { include: [0] }), fns: [{ f }], rects: lefts.map((x, i) => ({ x, w: dx, h: heights[i] })),
      alt: `Graph of the function with ${n} rectangles of width ${dx} between x = ${lo} and x = ${hi}. The top ${side} corner of each rectangle is on the graph.`,
    },
    correct: value,
    wrong: [
      { value: dx * sum((side === 'left' ? rights : lefts).map(f)), why: `That uses the ${side === 'left' ? 'right' : 'left'} endpoints. A ${side} sum takes each height at the ${side} end of its subinterval.` },
      dx !== 1 ? { value: sum(heights), why: R`Each height must be multiplied by the width \(\Delta x = ${dx}\).` } : null,
      { value: dx * sum(grid.map(f)), why: `${n} rectangles need ${n} heights, not ${n + 1}.` },
      dx * sum(used),
    ],
    solution: [
      R`\(\Delta x = \dfrac{${hi} - ${lo}}{${n}} = ${dx}\), so the subintervals have endpoints \(x = ${grid.join(', ')}\). A ${side} sum uses \(x = ${used.join(', ')}\).`,
      R`Heights: ${used.map((x, i) => R`\(f(${x}) = ${heights[i]}\)`).join(', ')}.`,
      dx === 1 ? R`Each width is \(1\), so add the heights: \(${heights.join(' + ')} = ${value}\).` : R`Add the heights and multiply by the width: \((${heights.join(' + ')})(${dx}) = ${value}\).`,
    ],
    rule: 1, skill: 'Riemann sums',
    // f is increasing here, so a left sum must fall below the integral and a right sum above it.
    check: () => (checkEqual(value, riemann(f, lo, hi, n, side), 1e-9, `${side} sum`) === true && (side === 'left') === value < integrate(f, lo, hi) ? true : `${side} sum ${value} is wrong, or on the wrong side of the integral`),
  });
}

function easyProperties(rng) {
  const a = rng.int(-4, 4);
  const b = a + rng.int(1, 5);
  const c = b + rng.int(1, 5);
  const [P, Q] = [rng.nonzero(-9, 12), rng.nonzero(-9, 12)];
  const k = rng.intExcept(-5, 6, [0, 1]);
  const f = lineWith(a, b, c, P, Q);
  const I = (lo, hi, body = 'f(x)') => integral(lo, hi, body);
  const given = R`\(${I(a, b)} = ${P}\)`;
  const { test, ...spec } = {
    add: {
      prompt: R`If ${given} and \(${I(b, c)} = ${Q}\), what is \(${I(a, c)}\)?`,
      correct: P + Q,
      wrong: [{ value: P - Q, why: 'The two intervals sit side by side, so their integrals add.' }, { value: P * Q, why: 'Integrals over adjacent intervals add. They do not multiply.' }, Q - P, -(P + Q)],
      solution: [R`The intervals \([${a}, ${b}]\) and \([${b}, ${c}]\) join to make \([${a}, ${c}]\), so the integrals add.`, R`\(${I(a, c)} = ${P} + ${paren(Q)} = ${P + Q}\).`],
      test: [f, a, c],
    },
    reverse: {
      prompt: R`If ${given}, what is \(${I(b, a)}\)?`,
      correct: -P,
      wrong: [{ value: P, why: 'Swapping the limits of integration changes the sign of the integral.' }, 0, 2 * P, -2 * P],
      solution: [R`Swapping the limits changes the sign: \(\int_b^a f(x)\,dx = -\int_a^b f(x)\,dx\).`, R`\(${I(b, a)} = ${-P}\).`],
      test: [f, b, a],
    },
    multiple: {
      prompt: R`If ${given}, what is \(${I(a, b, terms([[k, 'f(x)']]))}\)?`,
      correct: k * P,
      wrong: [{ value: P + k, why: 'A constant multiple comes out of the integral as a factor: multiply, do not add.' }, { value: P, why: R`The factor \(${k}\) multiplies the whole integral.` }, -k * P, k * P * (b - a)],
      solution: [R`A constant multiple comes out in front: \(\int_a^b k\,f(x)\,dx = k\int_a^b f(x)\,dx\).`, R`\(${dot(k, P)} = ${k * P}\).`],
      test: [(x) => k * f(x), a, b],
    },
  }[rng.pick(['add', 'reverse', 'multiple'])];
  return q({ ...spec, rule: 6, skill: 'integral properties', check: () => checkEqual(spec.correct, integrate(...test), 1e-9, 'integral of a test function') });
}

// ───────────── Medium ─────────────

function mediumRiemannSum(rng) {
  const kind = rng.pick(['left', 'right', 'mid']);
  const dx = kind === 'mid' ? rng.pick([1, 2]) : rng.pick([0.5, 1, 2]);
  const n = dx === 2 ? 3 : dx === 1 ? rng.int(3, 5) : 4;
  const lo = rng.int(-1, 2);
  const hi = lo + n * dx;
  const coefs = [rng.pick([1, 1, 2, -1]), rng.int(-3, 3), rng.int(0, 9)];
  const f = (x) => polyEval(coefs, x);
  const sumAt = (t) => round(dx * sum(range(0, n - 1).map((i) => f(lo + (i + t) * dx))), 6);
  const pts = range(0, n - 1).map((i) => lo + (i + KIND[kind].at) * dx);
  const heights = pts.map(f);
  const [value, L, Rt] = [sumAt(KIND[kind].at), sumAt(0), sumAt(1)];
  const list = (xs) => xs.map((x) => num(x)).join(R`,\ `);
  const added = terms(heights.map((h) => [h, '']));
  return q({
    prompt: R`Let \(f(x) = ${poly(coefs)}\). Use a **${KIND[kind].name}** Riemann sum with \(${n}\) subintervals of equal width to approximate \(${integral(lo, hi, 'f(x)')}\).`,
    correct: value,
    wrong: [
      kind === 'left' ? { value: Rt, why: 'That uses the right endpoints.' } : { value: L, why: `That uses the left endpoints. A ${KIND[kind].name} sum takes each height at the ${kind === 'mid' ? 'middle' : 'right end'} of its subinterval.` },
      dx !== 1 ? { value: round(sum(heights), 6), why: R`Multiply the sum of the heights by \(\Delta x = ${num(dx)}\).` } : null,
      kind === 'mid' ? { value: round((L + Rt) / 2, 6), why: 'Averaging the left and right sums gives the trapezoidal sum, not the midpoint sum.' } : null,
      kind === 'mid' ? Rt : round((L + Rt) / 2, 6),
      round(value + dx * f(kind === 'left' ? hi : lo), 6),
    ],
    solution: [
      R`\(\Delta x = \dfrac{${hi} - ${paren(lo)}}{${n}} = ${num(dx)}\). The ${KIND[kind].points} of the subintervals are \(x = ${list(pts)}\).`,
      R`The heights \(f(x)\) at those points are \(${list(heights)}\).`,
      dx === 1 ? R`Each width is \(1\), so add the heights: \(${added} = ${num(value)}\).` : R`Add the heights and multiply by the width: \(\left(${added}\right)(${num(dx)}) = ${num(value)}\).`,
    ],
    rule: 1, skill: 'Riemann sums',
    // Independent route: for a quadratic the error of each rule is known exactly, so the sum can be recovered from the integral.
    check: () => {
      const curve = coefs[0] * (hi - lo) * dx * dx;
      const shift = kind === 'mid' ? -curve / 12 : curve / 6 + ((kind === 'left' ? -1 : 1) * (f(hi) - f(lo)) * dx) / 2;
      return checkEqual(value, integrate(f, lo, hi) + shift, 1e-9, `${kind} sum`);
    },
  });
}

const READINGS = [
  { fn: 'R', what: R`the rate \(R(t)\), in liters per minute, at which water flows into a tank`, time: 'minutes', ask: 'the total amount of water that flows into the tank', unit: 'liters', scale: 1 },
  { fn: 'v', what: R`the velocity \(v(t)\), in meters per second, of a cyclist on a straight road`, time: 'seconds', ask: 'the distance the cyclist travels', unit: 'meters', scale: 1 },
  { fn: 'E', what: R`the rate \(E(t)\), in people per minute, at which fans enter a stadium`, time: 'minutes', ask: 'the number of fans who enter', unit: 'people', scale: 2 },
  { fn: 'S', what: R`the rate \(S(t)\), in millimeters per hour, at which rain falls during a storm`, time: 'hours', ask: 'the total rainfall', unit: 'mm', scale: 1 },
];
// Table data: n subintervals with whole-number widths that are not all equal, and readings that drift up and down.
function readings(rng, n, scale = 1) {
  let widths;
  do widths = range(1, n).map(() => rng.int(1, 4));
  while (new Set(widths).size === 1);
  const ts = widths.reduce((acc, w) => [...acc, acc[acc.length - 1] + w], [0]);
  const ys = [rng.int(4, 12)];
  for (let i = 1; i <= n; i++) ys.push(Math.max(1, ys[i - 1] + rng.nonzero(-4, 5)));
  return { widths, ts, ys: ys.map((y) => y * scale) };
}

function mediumTable(rng) {
  const c = rng.pick(READINGS);
  const n = rng.int(3, 4);
  const { widths, ts, ys } = readings(rng, n, c.scale);
  const method = rng.pick(['left', 'right', 'trap']);
  const trap = method === 'trap';
  const off = method === 'right' ? 1 : 0;
  const [L, Rt] = [0, 1].map((o) => sum(widths.map((w, i) => ys[i + o] * w)));
  const value = trap ? (L + Rt) / 2 : off ? Rt : L;
  const plain = sum(ys.slice(off, off + n)); // the values added up without their widths
  const pts = ts.map((t, i) => [t, ys[i]]);
  const tidy = (v) => (Number.isInteger(2 * v) ? v : null); // a whole number or a half
  return q({
    prompt: R`The table gives ${c.what} at selected times \(t\), in ${c.time}. Use a **${trap ? 'trapezoidal sum' : `${method} Riemann sum`}** with the ${n} subintervals indicated by the table to estimate ${c.ask} from \(t = 0\) to \(t = ${ts[n]}\).`,
    visual: rowTable(['t', `${c.fn}(t)`], pts, `Table of values. At t = ${ts.join(', ')} the values of ${c.fn}(t) are ${ys.join(', ')}.`),
    correct: value,
    unit: c.unit,
    wrong: trap
      ? [{ value: L + Rt, why: R`Each trapezoid has area \(\tfrac{1}{2}\) × (sum of its two values) × width. The factor \(\tfrac{1}{2}\) is missing.` }, { value: L, why: 'That is the left Riemann sum. A trapezoid averages the values at both ends of each subinterval.' }, Rt, tidy((sum(ys) / (n + 1)) * ts[n])]
      : [{ value: off ? L : Rt, why: `That uses the value at the ${off ? 'left' : 'right'} end of each subinterval.` }, { value: plain, why: 'Each value must be multiplied by the width of its own subinterval.' }, (L + Rt) / 2, tidy((ts[n] / n) * plain)],
    solution: [
      R`The subintervals have widths \(${widths.join(', ')}\), which are not all equal. ${trap ? R`Each trapezoid has area \(\tfrac{1}{2}\) × (left value + right value) × width.` : `Multiply each ${method}-hand value by the width of its own subinterval.`}`,
      R`\(${widths.map((w, i) => (trap ? R`\tfrac{1}{2}(${ys[i]} + ${ys[i + 1]})(${w})` : product(ys[i + off], w))).join(' + ')} = ${num(value)}\).`,
      R`The estimate is \(${num(value)}\) ${c.unit}.`,
    ],
    rule: trap ? 2 : 1,
    skill: trap ? 'trapezoidal sums' : 'sums from a table',
    // The trapezoidal sum is the integral of the piecewise-linear graph through the data; a left or right sum is the integral of a step graph.
    check: () => checkEqual(value, trap ? integratePieces(interp(pts), ts) : sum(widths.map((w, i) => integrate(() => ys[i + off], ts[i], ts[i + 1], 10))), 1e-9, `${method} sum`),
  });
}

function mediumSignedArea(rng) {
  if (rng.bool(0.3)) {
    const r = rng.int(1, 6);
    const half = rng.bool();
    const [lo, hi] = half ? [-r, r] : rng.pick([[0, r], [-r, 0]]);
    const f = (x) => Math.sqrt(Math.max(0, r * r - x * x));
    const part = half ? 2 : 4;
    return q({
      prompt: R`Use geometry to evaluate \(${integral(lo, hi, R`\sqrt{${r * r} - x^{2}}`)}\).`,
      visual: { type: 'plot', x: [-r - 1, r + 1], y: [-1, r + 1], square: true, fns: [{ f, domain: [-r, r] }], shade: [{ f, from: lo, to: hi }], alt: `Graph of the top half of a circle of radius ${r} centered at the origin. The region under it from x = ${lo} to x = ${hi} is shaded.` },
      correct: M(piTex(r * r, part)),
      wrong: [
        { value: M(piTex(r * r)), why: R`\(\pi r^{2}\) is the area of the whole disc. The graph is only the top half of the circle.` },
        { value: M(piTex(r * r, half ? 4 : 2)), why: half ? R`From \(-${r}\) to \(${r}\) the region is the whole upper half of the disc, not a quarter of it.` : R`From \(${lo}\) to \(${hi}\) the region is only a quarter of the disc.` },
        M(piTex(r, half ? 1 : 2)),
        M(num((half ? 2 : 1) * r * r)),
        M(piTex(2 * r * r)),
      ],
      solution: [
        R`\(y = \sqrt{${r * r} - x^{2}}\) is the top half of the circle \(x^{2} + y^{2} = ${r * r}\), which has radius \(${r}\).`,
        half ? R`From \(x = -${r}\) to \(x = ${r}\) the region under the graph is the whole half-disc: \(\tfrac{1}{2}\pi(${r})^{2} = ${piTex(r * r, 2)}\).` : R`From \(x = ${lo}\) to \(x = ${hi}\) the region under the graph is a quarter of the disc: \(\tfrac{1}{4}\pi(${r})^{2} = ${piTex(r * r, 4)}\).`,
      ],
      rule: 5, skill: 'area by geometry',
      check: () => checkIntegral(f, lo, hi, (Math.PI * r * r) / part, 1e-3),
    });
  }
  const m = rng.nonzero(-3, 3);
  const r = rng.int(-2, 4);
  const [p, s] = [rng.int(1, 4), rng.int(1, 5)];
  const [a, b] = [r - p, r + s];
  const f = (x) => m * (x - r);
  const fTex = linear(m, -m * r);
  const [A1, A2] = [frac(Math.abs(m) * p * p, 2), frac(Math.abs(m) * s * s, 2)]; // the triangles left and right of the crossing
  const [up, down] = m > 0 ? [A2, A1] : [A1, A2];
  const value = up.sub(down);
  const [sideL, sideR] = m > 0 ? ['below', 'above'] : ['above', 'below'];
  return q({
    prompt: R`The graph of \(y = ${fTex}\) is shown. Use geometry to evaluate \(${integral(a, b, wrap(fTex))}\).`,
    visual: {
      type: 'plot', ...fit(f, a - 1, b + 1, { include: [0] }), fns: [{ f }], shade: [{ f, from: a, to: r, color: m > 0 ? 'b' : 'a' }, { f, from: r, to: b, color: m > 0 ? 'a' : 'b' }],
      alt: `Graph of a line that crosses the x-axis at x = ${r}. The triangle between the line and the axis from x = ${a} to x = ${r} is ${sideL} the axis, and the triangle from x = ${r} to x = ${b} is ${sideR} the axis.`,
    },
    correct: value,
    wrong: [
      { value: up.add(down), why: 'That is the total area. In a definite integral, area below the x-axis counts as negative.' },
      { value: value.neg(), why: 'Subtract the area below the axis from the area above it, not the other way round.' },
      { value: value.mul(2), why: R`Each triangle has area \(\tfrac{1}{2}\) × base × height.` },
      up,
      down.neg(),
    ],
    solution: [
      R`The line crosses the \(x\)-axis at \(x = ${r}\), which splits the region into two triangles.`,
      R`From \(x = ${a}\) to \(x = ${r}\): base \(${p}\), height \(${Math.abs(m) * p}\), area \(${A1.tex()}\), ${sideL} the axis.`,
      R`From \(x = ${r}\) to \(x = ${b}\): base \(${s}\), height \(${Math.abs(m) * s}\), area \(${A2.tex()}\), ${sideR} the axis.`,
      R`Area above minus area below: \(${up.tex()} - ${down.tex()} = ${value.tex()}\).`,
    ],
    rule: 5, skill: 'signed area',
    check: () => checkIntegral(f, a, b, value.value),
  });
}

// Each shape lists "witness" functions on [1, 3] that behave as described. The check tests the answer key against them.
const SHAPES = [
  { say: 'increasing and concave up', inc: 1, cu: 1, wit: [(x) => x * x + 1] },
  { say: 'increasing and concave down', inc: 1, cu: -1, wit: [Math.sqrt] },
  { say: 'decreasing and concave up', inc: -1, cu: 1, wit: [(x) => 6 / x] },
  { say: 'decreasing and concave down', inc: -1, cu: -1, wit: [(x) => 20 - x * x] },
  { say: 'increasing (nothing is known about its concavity)', inc: 1, cu: null, wit: [(x) => x * x + 1, Math.sqrt] },
  { say: 'decreasing (nothing is known about its concavity)', inc: -1, cu: null, wit: [(x) => 6 / x, (x) => 20 - x * x] },
  { say: R`concave up (it is not known whether \(f\) increases or decreases)`, inc: null, cu: 1, wit: [(x) => x * x + 1, (x) => 6 / x] },
  { say: R`concave down (it is not known whether \(f\) increases or decreases)`, inc: null, cu: -1, wit: [Math.sqrt, (x) => 20 - x * x] },
  { say: 'linear and increasing', inc: 1, cu: 0, wit: [(x) => 2 * x + 1] },
  { say: 'linear and decreasing', inc: -1, cu: 0, wit: [(x) => 9 - 2 * x] },
];
// dir: +1 overestimate, −1 underestimate, 0 exact, null cannot be determined.
const METHODS = [
  { name: 'left Riemann sum', kind: 'left', dir: (s) => (s.inc == null ? null : -s.inc) },
  { name: 'right Riemann sum', kind: 'right', dir: (s) => s.inc },
  { name: 'midpoint Riemann sum', kind: 'mid', dir: (s) => (s.cu == null ? null : -s.cu) },
  { name: 'trapezoidal sum', kind: 'trap', dir: (s) => s.cu },
];
const VERDICT = { over: 'It is an overestimate.', under: 'It is an underestimate.', exact: 'It is exactly equal to the integral.', unknown: 'It cannot be determined from the information given.' };
const est = (dir) => (dir > 0 ? 'an overestimate' : 'an underestimate');

function overUnderReason(s, m, dir) {
  if (m.kind === 'left' || m.kind === 'right') {
    if (dir == null) return [R`A left or right sum is too large or too small according to whether \(f\) is increasing or decreasing.`, R`Only the concavity of \(f\) is given, so the direction of the error cannot be determined.`];
    const [atLeft, atRight] = s.inc > 0 ? ['smallest', 'largest'] : ['largest', 'smallest'];
    return [R`Because \(f\) is ${s.inc > 0 ? 'increasing' : 'decreasing'}, its ${atLeft} value on each subinterval is at the left endpoint and its ${atRight} value is at the right endpoint.`, `A ${m.name} uses the ${m.kind} endpoints, so every rectangle is too ${dir > 0 ? 'tall' : 'short'}: the sum is ${est(dir)}.`];
  }
  if (dir == null) return [R`A midpoint or trapezoidal sum is too large or too small according to the concavity of \(f\).`, R`Only the direction of \(f\) (increasing or decreasing) is given, so the direction of the error cannot be determined.`];
  if (dir === 0) {
    return m.kind === 'trap'
      ? ['The graph is a straight line, so the top of each trapezoid lies exactly on the graph.', 'The trapezoidal sum is exactly equal to the integral.']
      : ['On a straight line, the height at the midpoint is the average of the heights at the two ends.', 'So each midpoint rectangle has exactly the area under the line, and the sum is exactly equal to the integral.'];
  }
  const cup = s.cu > 0 ? 'up' : 'down';
  return m.kind === 'trap'
    ? [`On a concave ${cup} graph, every chord lies ${s.cu > 0 ? 'above' : 'below'} the curve.`, `The top of each trapezoid is a chord, so the trapezoidal sum is ${est(dir)}.`]
    : ['Each midpoint rectangle has the same area as the trapezoid under the tangent line at the midpoint.', `On a concave ${cup} graph, every tangent line lies ${s.cu > 0 ? 'below' : 'above'} the curve, so the midpoint sum is ${est(dir)}.`];
}

function mediumOverUnder(rng) {
  const s = rng.pick(SHAPES);
  const m = rng.pick(METHODS);
  const dir = m.dir(s);
  const a = rng.int(0, 4);
  const b = a + rng.int(2, 6);
  const reason = overUnderReason(s, m, dir);
  const key = dir == null ? 'unknown' : dir > 0 ? 'over' : dir < 0 ? 'under' : 'exact';
  const sided = dir == null ? 'That is true for some functions of this kind but not for others.' : reason[0];
  const notes = { over: sided, under: sided, unknown: m.kind === 'left' || m.kind === 'right' ? R`Whether \(f\) is increasing or decreasing decides this, and that is given.` : R`The concavity of \(f\) decides this, and that is given.` };
  return q({
    prompt: R`On \([${a}, ${b}]\), a continuous function \(f\) is ${s.say}. A **${m.name}** with \(${rng.int(3, 8)}\) subintervals of equal width is used to approximate \(${integral(a, b, 'f(x)')}\). How does the approximation compare with the exact value of the integral?`,
    correct: VERDICT[key],
    wrong: ['over', 'under', 'unknown', 'exact'].filter((v) => v !== key).map((v) => (notes[v] ? { value: VERDICT[v], why: notes[v] } : VERDICT[v])),
    solution: reason,
    rule: 3, skill: 'over- and underestimates',
    check: () => {
      const signs = new Set(s.wit.map((f) => {
        const d = riemann(f, 1, 3, 4, m.kind) - integrate(f, 1, 3);
        return Math.abs(d) < 1e-9 ? 0 : Math.sign(d);
      }));
      const seen = signs.size > 1 ? null : [...signs][0];
      return seen === dir ? true : `test functions give ${[...signs]} but the key says ${dir}`;
    },
  });
}

// ───────────── Hard ─────────────

const SUMMANDS = [
  { fn: (x) => x * x, of: (u, plain) => (plain ? `${u}^{2}` : R`\left(${u}\right)^{2}`), times: (k) => `${k}x^{2}`, minA: 0 },
  { fn: (x) => x ** 3, of: (u, plain) => (plain ? `${u}^{3}` : R`\left(${u}\right)^{3}`), times: (k) => `${k}x^{3}`, minA: 0 },
  { fn: Math.sqrt, of: (u) => R`\sqrt{${u}}`, times: (k) => R`${k}\sqrt{x}`, minA: 0 },
  { fn: (x) => 1 / x, of: (u) => R`\frac{1}{${u}}`, times: (k) => R`\frac{${k}}{x}`, minA: 1 },
  { fn: Math.sin, of: (u, plain) => (plain ? R`\sin ${u}` : R`\sin\left(${u}\right)`), times: (k) => R`${k}\sin x`, minA: 0 },
  { fn: Math.exp, of: (u) => `e^{${u}}`, times: (k) => `${k}e^{x}`, minA: 0 },
  { fn: Math.log, of: (u, plain) => (plain ? R`\ln ${u}` : R`\ln\left(${u}\right)`), times: (k) => R`${k}\ln x`, minA: 1 },
];

function hardSigmaToIntegral(rng) {
  const g = rng.pick(SUMMANDS);
  const a = rng.int(g.minA, 4);
  const w = rng.int(2, 5);
  const xi = R`${a === 0 ? '' : `${a} + `}\frac{${w}i}{n}`;
  const gx = g.of('x', true);
  const choice = (lo, hi, body, fn, why) => ({ value: M(integral(lo, hi, body)), val: integrate(fn, lo, hi), why });
  const right = choice(a, a + w, gx, g.fn);
  const wrong = [
    a > 0 ? choice(a, a + w, g.of(`${a} + x`, false), (x) => g.fn(a + x), R`\(${xi}\) is already the sample point \(x_i\). The function is applied to \(x\), not to \(${a} + x\).`) : null,
    a > 0 && g.minA === 0 ? choice(0, w, gx, g.fn, R`The sample points \(${xi}\) start at \(${a}\), so the interval is \([${a}, ${a + w}]\).`) : null,
    a === 0 ? choice(0, w, g.of(`${w}x`, false), (x) => g.fn(w * x), R`\(\frac{${w}i}{n}\) is the sample point \(x_i\) itself, so the function is applied to \(x\).`) : null,
    choice(a, a + w, g.times(w), (x) => w * g.fn(x), R`The factor \(\frac{${w}}{n}\) is \(\Delta x\). It turns into \(dx\), not into an extra factor of \(${w}\).`),
    choice(a, a + 1, gx, g.fn, R`\(\Delta x = \frac{${w}}{n}\), so the interval has length \(${w}\), not \(1\).`),
  ].filter((c) => c && !close(c.val, right.val, 1e-3));
  if (wrong.length < 3) return hardSigmaToIntegral(rng);
  return q({
    prompt: R`Which definite integral is equal to this limit of Riemann sums? \[\lim_{n \to \infty} \sum_{i=1}^{n} ${g.of(xi, false)} \cdot \frac{${w}}{n}\]`,
    correct: right.value,
    wrong,
    solution: [
      R`Match the sum to \(\sum f(x_i)\,\Delta x\), where \(\Delta x = \dfrac{b - a}{n}\) and \(x_i = a + i\,\Delta x\).`,
      R`\(\Delta x = \dfrac{${w}}{n}\), so \(b - a = ${w}\). The sample point is \(x_i = ${xi}\), so \(a = ${a}\) and \(b = ${a + w}\).`,
      R`The function applied to \(x_i\) is \(f(x) = ${gx}\), so the limit is \(${integral(a, a + w, gx)}\).`,
    ],
    rule: 4, skill: 'limit of Riemann sums',
    // Add up the sum itself for a large n and compare it with the chosen integral.
    check: () => {
      const N = 20000;
      let s = 0;
      for (let i = 1; i <= N; i++) s += g.fn(a + (w * i) / N);
      return checkEqual((s * w) / N, right.val, 2e-3, 'Riemann sum with n = 20000');
    },
  });
}

// Corner heights of a graph made of line segments (h and k are positive). The graph meets the axis only at corners.
const PROFILES = [(h, k) => [0, h, 0, -k, 0], (h, k) => [h, h, 0, -k], (h, k) => [h, 0, -k, -k], (h, k) => [0, h, h, 0, -k], (h, k) => [-k, 0, h, h], (h, k) => [-k, -k, 0, h, 0], (h, k) => [h + k, h, 0, -k], (h, k) => [0, -k, 0, h, h]];

function hardGraphIntegral(rng) {
  const ys = rng.pick(PROFILES)(rng.int(1, 4), rng.int(1, 4));
  const xs = ys.slice(1).reduce((acc) => [...acc, acc[acc.length - 1] + rng.int(1, 3)], [0]);
  const pts = xs.map((x, i) => [x, ys[i]]);
  const f = interp(pts);
  const last = ys.length - 1;
  const i0 = rng.bool(0.6) ? 0 : rng.int(0, 1);
  const i1 = i0 === 0 && rng.bool(0.7) ? last : rng.int(i0 + 2, last);
  const pieces = range(i0, i1 - 1).map((i) => {
    const [y0, y1, w] = [ys[i], ys[i + 1], xs[i + 1] - xs[i]];
    const shape = y0 === y1 ? 'rectangle' : y0 === 0 || y1 === 0 ? 'triangle' : 'trapezoid';
    const area = frac(Math.abs(y0 + y1) * w, 2);
    const work = shape === 'rectangle' ? product(w, Math.abs(y0)) : shape === 'triangle' ? R`\tfrac{1}{2}${product(w, Math.abs(y0 + y1))}` : R`\tfrac{1}{2}(${Math.abs(y0)} + ${Math.abs(y1)})(${w})`;
    return { above: y0 + y1 > 0, area, text: R`a ${shape} from \(x = ${xs[i]}\) to \(x = ${xs[i + 1]}\) with area \(${work} = ${area.tex()}\)` };
  });
  const total = (list) => list.reduce((acc, p) => acc.add(p.area), frac(0));
  const [above, below] = [pieces.filter((p) => p.above), pieces.filter((p) => !p.above)];
  const [up, down] = [total(above), total(below)];
  const value = up.sub(down);
  return q({
    prompt: R`The graph of \(f\) consists of line segments, as shown. Use geometry to evaluate \(${integral(xs[i0], xs[i1], 'f(x)')}\).`,
    visual: {
      type: 'plot', x: [-0.5, xs[last] + 0.5], y: [Math.min(...ys) - 1, Math.max(...ys) + 1], step: [1, 1],
      fns: [{ f, domain: [0, xs[last]] }], points: pts.map(([x, y]) => ({ x, y })), shade: [{ f, from: xs[i0], to: xs[i1] }],
      alt: `Graph of f made of line segments joining the points ${pts.map(([x, y]) => `(${x}, ${y})`).join(', ')}. The region between the graph and the x-axis from x = ${xs[i0]} to x = ${xs[i1]} is shaded.`,
    },
    correct: value,
    wrong: [
      { value: up.add(down), why: 'That is the total area. Regions below the x-axis count as negative in a definite integral.' },
      { value: up, why: 'The area below the axis must be subtracted, not left out.' },
      value.neg(), value.mul(2), down.neg(), value.add(1), value.sub(1),
    ],
    solution: [
      'Split the region at the corners of the graph. Each piece is a rectangle, a triangle or a trapezoid.',
      above.length ? `Above the axis: ${joinList(above.map((p) => p.text))}.` : null,
      below.length ? `Below the axis: ${joinList(below.map((p) => p.text))}.` : null,
      R`Area above minus area below: \(${up.tex()} - ${down.tex()} = ${value.tex()}\).`,
    ].filter(Boolean),
    rule: 5, skill: 'signed area',
    check: () => checkEqual(value.value, integratePieces(f, xs.slice(i0, i1 + 1)), 1e-9, 'signed area'),
  });
}

function hardProperties(rng) {
  const a = rng.int(-3, 3);
  const b = a + rng.int(1, 4);
  const c = b + rng.int(1, 4);
  const [P, S] = [rng.nonzero(-9, 9), rng.nonzero(-9, 9)];
  const Q = rng.intExcept(-9, 9, [0, P]);
  const k = rng.intExcept(-4, 5, [0, 1]);
  const [mm, d] = [rng.int(2, 4), rng.nonzero(-3, 5)];
  const I = (lo, hi, body = 'f(x)') => integral(lo, hi, body);
  const g = (x) => S / (b - a) + 2 * (x - (a + b) / 2); // a line with ∫ₐᵇ g = S
  const { test, ...spec } = {
    reverse: () => ({
      prompt: R`Suppose \(${I(a, c)} = ${Q}\) and \(${I(a, b)} = ${P}\). Find \(${I(c, b, terms([[k, 'f(x)']]))}\).`,
      correct: k * (P - Q),
      wrong: [{ value: k * (Q - P), why: R`The limits run from \(${c}\) back to \(${b}\), which reverses the sign.` }, { value: k * (P + Q), why: R`\([${b}, ${c}]\) is what is left of \([${a}, ${c}]\) when \([${a}, ${b}]\) is removed, so subtract the integrals.` }, P - Q, -k * (P + Q), Q - P],
      solution: [R`Additivity: \(${I(b, c)} = ${I(a, c)} - ${I(a, b)} = ${Q} - ${paren(P)} = ${Q - P}\).`, R`Reverse the limits: \(${I(c, b)} = ${P - Q}\).`, R`Constant multiple: \(${dot(k, P - Q)} = ${k * (P - Q)}\).`],
      test: [(x) => k * lineWith(a, b, c, P, Q - P)(x), c, b],
    }),
    combine: () => ({
      prompt: R`Suppose \(${I(a, b)} = ${P}\) and \(${I(a, b, 'g(x)')} = ${S}\). Find \(${I(a, b, R`\left[${terms([[k, 'f(x)'], [-mm, 'g(x)'], [d, '']])}\right]`)}\).`,
      correct: k * P - mm * S + d * (b - a),
      wrong: [{ value: k * P - mm * S + d, why: R`The constant \(${d}\) integrates to \(${d}\) times the width of the interval, the signed area of a rectangle.` }, { value: k * P + mm * S + d * (b - a), why: R`The \(g\) term is subtracted.` }, k * P - mm * S, P - S + d * (b - a)],
      solution: [R`Integrate term by term: \(${terms([[k, I(a, b)], [-mm, I(a, b, 'g(x)')]])} + ${I(a, b, paren(d))}\).`, R`The constant gives a rectangle: \(${I(a, b, paren(d))} = ${paren(d)}(${b} - ${paren(a)}) = ${d * (b - a)}\).`, R`Total: \(${product(k, P)} - ${product(mm, S)} + ${paren(d * (b - a))} = ${k * P - mm * S + d * (b - a)}\).`],
      test: [(x) => k * lineWith(a, b, c, P, Q)(x) - mm * g(x) + d, a, b],
    }),
  }[rng.pick(['reverse', 'combine'])]();
  return q({ ...spec, rule: 6, skill: 'integral properties', check: () => checkEqual(spec.correct, integrate(...test), 1e-9, 'integral of a test function') });
}

// ───────────── Challenge ─────────────

function challengeMissingValue(rng) {
  const n = rng.int(3, 4);
  const { widths, ts, ys } = readings(rng, n);
  const j = rng.int(0, n);
  const k = ys[j];
  const twoT = sum(widths.map((w, i) => (ys[i] + ys[i + 1]) * w)); // twice the trapezoidal sum
  const wsum = (j > 0 ? widths[j - 1] : 0) + (j < n ? widths[j] : 0); // twice the coefficient of k
  const rest = twoT - wsum * k;
  const whole = (top, bottom) => (Number.isInteger(top / bottom) ? top / bottom : null);
  const leftRest = sum(widths.map((w, i) => (i === j ? 0 : ys[i] * w)));
  const yTex = (i) => (i === j ? 'k' : String(ys[i]));
  return q({
    prompt: R`The table gives selected values of a continuous function \(f\), where \(k\) is a constant. A trapezoidal sum with the ${n} subintervals indicated by the table gives \(${integral(0, ts[n], 'f(x)')} \approx ${num(twoT / 2)}\). What is \(k\)?`,
    visual: rowTable(['x', 'f(x)'], ts.map((t, i) => [t, i === j ? M('k') : ys[i]]), `Table of values of f. At x = ${ts.join(', ')} the values of f are ${ys.map((y, i) => (i === j ? 'k' : y)).join(', ')}.`),
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: whole(twoT - 2 * rest, 2 * wsum), why: R`Each trapezoid has area \(\tfrac{1}{2}\) × (sum of its two values) × width. Leaving out the \(\tfrac{1}{2}\) changes the equation for \(k\).` },
      j < n ? { value: whole(twoT - 2 * leftRest, 2 * widths[j]), why: 'That treats the estimate as a left Riemann sum. A trapezoidal sum uses the values at both ends of each subinterval.' } : null,
      k + 1, k - 1, k + 2,
    ],
    solution: [
      R`Write the trapezoidal sum with \(k\) in it: \(${widths.map((w, i) => R`\tfrac{1}{2}(${yTex(i)} + ${yTex(i + 1)})(${w})`).join(' + ')} = ${num(twoT / 2)}\).`,
      R`Multiply both sides by 2 and collect terms: \(${terms([[wsum, 'k'], [rest, '']])} = ${twoT}\).`,
      wsum === 1 ? R`So \(k = ${twoT} - ${rest} = ${k}\).` : R`So \(${wsum}k = ${twoT - rest}\), which gives \(k = ${k}\).`,
    ],
    rule: 2, skill: 'trapezoidal sums',
    check: () => (wsum * k + rest === twoT ? checkEqual(twoT / 2, integratePieces(interp(ts.map((t, i) => [t, ys[i]])), ts), 1e-9, 'trapezoidal sum with this k') : 'the equation for k is inconsistent'),
  });
}

function challengeSubintervals(rng) {
  const a = rng.int(0, 4);
  const span = rng.int(2, 8);
  const b = a + span;
  const [rise, low, inc] = [rng.int(4, 30), rng.int(1, 10), rng.bool()];
  const [fa, fb] = inc ? [low, low + rise] : [low + rise, low];
  const tol = rng.pick([0.3, 0.6, 0.7, 0.9, 1.1, 1.3, 1.7, 2.3]);
  const D = rise * span;
  const need = D / tol;
  if (Math.abs(need - Math.round(need)) < 0.02) return challengeSubintervals(rng);
  const n = Math.ceil(need);
  return q({
    prompt: R`A function \(f\) is ${inc ? 'increasing' : 'decreasing'} on \([${a}, ${b}]\), with \(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\). Let \(L_n\) and \(R_n\) be the left and right Riemann sums with \(n\) subintervals of equal width. What is the smallest \(n\) for which \(\left|R_n - L_n\right| \le ${num(tol)}\)?`,
    correct: n,
    fmt: (v) => R`\(n = ${v}\)`,
    wrong: [
      { value: Math.floor(need), why: R`With that \(n\) the difference is still slightly more than \(${num(tol)}\). Round up.` },
      { value: Math.ceil(rise / tol), why: R`\(\Delta x = \dfrac{${span}}{n}\), not \(\dfrac{1}{n}\). Include the length of the interval.` },
      Math.ceil((Math.max(fa, fb) * span) / tol), Math.ceil(span / tol), n + 1,
    ],
    solution: [
      R`\(R_n\) and \(L_n\) share every height except the first and the last, so \(R_n - L_n = \left[f(${b}) - f(${a})\right]\Delta x\).`,
      R`Here \(\left|f(${b}) - f(${a})\right| = ${rise}\) and \(\Delta x = \dfrac{${span}}{n}\), so \(\left|R_n - L_n\right| = \dfrac{${D}}{n}\).`,
      R`\(\dfrac{${D}}{n} \le ${num(tol)}\) when \(n \ge \dfrac{${D}}{${num(tol)}} \approx ${num(need, { places: 2 })}\). The smallest whole number is \(n = ${n}\).`,
      R`Because \(f\) is monotonic, the integral lies between \(L_n\) and \(R_n\), so each sum is then within \(${num(tol)}\) of the integral.`,
    ],
    rule: 3, skill: 'error of a Riemann sum',
    check: () => {
      const f = (x) => fa + (fb - fa) * ((x - a) / span) ** 2; // a monotonic function with these end values
      const gap = (m) => Math.abs(riemann(f, a, b, m, 'right') - riemann(f, a, b, m, 'left'));
      return gap(n) <= tol && gap(n - 1) > tol ? true : `|R - L| is ${gap(n)} with n = ${n} and ${gap(n - 1)} with one fewer`;
    },
  });
}

function challengeLimitValue(rng) {
  const sumTo = (term, N = 20000) => sum(range(1, N).map((i) => term(i / N))) / N;
  const lead = 'Evaluate the limit by recognising it as a definite integral and then using geometry.';
  const [c0, m, w] = [rng.int(0, 9), rng.int(1, 4), rng.int(2, 6)];
  const c1 = m * w;
  const value = frac(w * (2 * c0 + c1), 2);
  const fTex = linear(m, c0);
  return q({
    prompt: R`${lead} \[\lim_{n \to \infty} \sum_{i=1}^{n} \left(${c0 === 0 ? '' : `${c0} + `}\frac{${c1}i}{n}\right)\frac{${w}}{n}\]`,
    correct: value,
    wrong: [
      { value: w * (c0 + c1), why: `That is a rectangle with the height at the right end. The region under the line is a ${c0 ? 'trapezoid' : 'triangle'}.` },
      { value: frac(2 * c0 + c1, 2), why: R`Multiply by the width of the interval, \(${w}\).` },
      c0 ? w * c0 : null, value.mul(2), value.add(w),
    ],
    solution: [
      R`Read the sum as \(\sum f(x_i)\,\Delta x\) with \(\Delta x = \dfrac{${w}}{n}\) and \(x_i = \dfrac{${w}i}{n}\), so the interval is \([0, ${w}]\).`,
      R`Since \(\dfrac{${c1}i}{n} = ${m === 1 ? '' : m}x_i\), the function is \(f(x) = ${fTex}\) and the limit is \(${integral(0, w, wrap(fTex))}\).`,
      c0 ? R`The region is a trapezoid with parallel sides \(f(0) = ${c0}\) and \(f(${w}) = ${c0 + c1}\) and width \(${w}\): \(\tfrac{1}{2}(${c0} + ${c0 + c1})(${w}) = ${value.tex()}\).` : R`The region is a triangle with base \(${w}\) and height \(f(${w}) = ${c1}\): \(\tfrac{1}{2}${product(w, c1)} = ${value.tex()}\).`,
    ],
    rule: 4, skill: 'limit of Riemann sums',
    check: () => checkEqual(w * sumTo((t) => c0 + c1 * t), value.value, 2e-3, 'Riemann sum with n = 20000'),
  });
}

// ───────────── Topic ─────────────

const exampleF = (x) => x * x + 1;
const exampleLine = (x) => 4 - 2 * x;

export default {
  id: 'riemann-definite',
  title: 'Riemann Sums & Definite Integrals',
  summary: 'Estimate accumulated change with Riemann and trapezoidal sums, and find definite integrals from limits, geometry and properties.',
  standards: ['AP Calculus 6.1', 'AP Calculus 6.2', 'AP Calculus 6.3', 'AP Calculus 6.6'],

  explain: {
    intro: R`A definite integral adds up a quantity that keeps changing: the area under a rate graph is the total change. We estimate that area with rectangles or trapezoids, and the definite integral \(\int_a^b f(x)\,dx\) is the exact value that the estimates approach as the pieces get thinner.`,
    rules: [
      {
        title: 'Accumulation is area under the rate graph',
        text: R`If a quantity changes at the rate \(r(t)\), its change from \(t = a\) to \(t = b\) is the area between the graph of \(r\) and the \(t\)-axis. For a constant rate this is rate × time, the area of a rectangle. The units multiply too: (liters per minute) × (minutes) = liters.`,
        example: R`A hose runs at \(12\) L/min for \(5\) min: \(12 \cdot 5 = 60\) L, the area of a \(5\)-by-\(12\) rectangle.`,
      },
      {
        title: 'Left, right and midpoint Riemann sums',
        text: R`Split \([a, b]\) into \(n\) subintervals of width \(\Delta x = \dfrac{b - a}{n}\). On each one, build a rectangle whose height is the value of \(f\) at the left endpoint, the right endpoint or the midpoint. The sum of the areas \(f(x_i^{*})\,\Delta x\) approximates \(\int_a^b f(x)\,dx\). When a table has unequal spacing, multiply each height by its own width.`,
        example: R`\(f(x) = x^{2}\) on \([0, 2]\) with \(n = 2\): left \((0 + 1)(1) = 1\), right \((1 + 4)(1) = 5\), midpoint \((0.25 + 2.25)(1) = 2.5\).`,
      },
      {
        title: 'Trapezoidal rule',
        text: R`Join neighbouring points on the graph with straight lines. Each trapezoid has area \(\tfrac{1}{2}\left[f(x_{i-1}) + f(x_i)\right]\Delta x\). With equal widths the total is the average of the left and right sums: \(T_n = \dfrac{\Delta x}{2}\left[f(x_0) + 2f(x_1) + \dots + 2f(x_{n-1}) + f(x_n)\right]\).`,
        example: R`\(f(x) = x^{2}\) on \([0, 2]\) with \(n = 2\): \(T_2 = \tfrac{1}{2}\left[0 + 2(1) + 4\right] = 3\), the average of \(1\) and \(5\).`,
      },
      {
        title: 'Overestimate or underestimate?',
        text: R`If \(f\) is **increasing**, a left sum is too small and a right sum is too large (the other way round if \(f\) is decreasing). If \(f\) is **concave up**, a trapezoidal sum is too large and a midpoint sum is too small (the other way round if \(f\) is concave down).`,
        example: R`\(f(x) = x^{2}\) is increasing and concave up on \([0, 2]\), where the exact area is \(\tfrac{8}{3} \approx 2.67\). Left \(1\) and midpoint \(2.5\) are too small; trapezoid \(3\) and right \(5\) are too large.`,
      },
      {
        title: 'The definite integral is a limit of Riemann sums',
        text: R`\(\displaystyle\int_a^b f(x)\,dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(x_i)\,\Delta x\), where \(\Delta x = \dfrac{b - a}{n}\) and \(x_i = a + i\,\Delta x\). To read a limit of sums as an integral, find \(\Delta x\) (it gives the length \(b - a\)), then the starting point \(a\), then the function applied to \(x_i\).`,
        example: R`\(\displaystyle\lim_{n \to \infty} \sum_{i=1}^{n} \left(1 + \frac{2i}{n}\right)^{3} \frac{2}{n} = \int_{1}^{3} x^{3}\,dx\).`,
      },
      {
        title: 'Signed area and geometry',
        text: R`\(\int_a^b f(x)\,dx\) is the area above the \(x\)-axis **minus** the area below it. When the graph is made of line segments and circular arcs, use the area formulas for rectangles, triangles, trapezoids and circles.`,
        example: R`\(\int_{0}^{3} (x - 1)\,dx\): a triangle of area \(\tfrac{1}{2}\) below the axis and a triangle of area \(2\) above it, so the integral is \(2 - \tfrac{1}{2} = \tfrac{3}{2}\).`,
      },
      {
        title: 'Properties of definite integrals',
        text: R`\(\int_a^a f\,dx = 0\). Swapping the limits changes the sign: \(\int_b^a f\,dx = -\int_a^b f\,dx\). Adjacent intervals add: \(\int_a^b f\,dx + \int_b^c f\,dx = \int_a^c f\,dx\). Constant multiples and sums split up: \(\int_a^b \left[k\,f(x) \pm g(x)\right]dx = k\int_a^b f\,dx \pm \int_a^b g\,dx\). A constant integrates to a rectangle: \(\int_a^b k\,dx = k(b - a)\).`,
        example: R`If \(\int_{1}^{4} f(x)\,dx = 5\), then \(\int_{4}^{1} f(x)\,dx = -5\) and \(\int_{1}^{4} \left[2f(x) + 3\right]dx = 2(5) + 3(4 - 1) = 19\).`,
      },
    ],
    vocab: [
      { term: 'Riemann sum', def: R`A sum of rectangle areas \(f(x_i^{*})\,\Delta x\) that approximates the area under a graph.` },
      { term: 'subinterval', def: R`One of the pieces that \([a, b]\) is cut into. With \(n\) equal pieces, each has width \(\Delta x = \frac{b - a}{n}\).` },
      { term: 'definite integral', def: R`The number \(\int_a^b f(x)\,dx\): the limit of the Riemann sums, equal to the signed area between the graph and the \(x\)-axis. The integrand is \(f(x)\); the limits of integration are \(a\) and \(b\).` },
      { term: 'signed (net) area', def: 'Area above the axis counted as positive and area below it counted as negative.' },
    ],
    mistakes: [
      R`Adding heights without multiplying by the width. A Riemann sum adds **areas** \(f(x_i)\,\Delta x\).`,
      R`Using \(n + 1\) heights for \(n\) rectangles. A left sum leaves out the last point and a right sum leaves out the first.`,
      'Treating a table with unequal spacing as if every width were the same.',
      R`Counting area below the \(x\)-axis as positive. In a definite integral it is subtracted.`,
      R`Integrating a constant as itself: \(\int_a^b k\,dx\) is \(k(b - a)\), not \(k\).`,
    ],
    visual: {
      type: 'plot', x: [-0.5, 4.5], y: [-0.5, 6], fns: [{ f: (x) => 0.25 * x * x + 1 }], rects: range(0, 3).map((i) => ({ x: i, w: 1, h: 0.25 * i * i + 1 })),
      alt: 'Graph of an increasing curve from x = 0 to x = 4 with four left-endpoint rectangles under it. Each rectangle touches the curve at its top left corner and leaves a gap below the curve, so the left sum is an underestimate.',
    },
  },

  examples: [
    {
      title: 'Left and right Riemann sums',
      problem: R`Approximate \(\int_{0}^{2} (x^{2} + 1)\,dx\) with \(n = 4\) rectangles, first with left endpoints and then with right endpoints.`,
      steps: [
        R`\(\Delta x = \dfrac{2 - 0}{4} = 0.5\), so the subintervals have endpoints \(x = 0,\ 0.5,\ 1,\ 1.5,\ 2\).`,
        R`Heights: \(f(0) = 1\), \(f(0.5) = 1.25\), \(f(1) = 2\), \(f(1.5) = 3.25\), \(f(2) = 5\).`,
        R`Left sum (leave out the last height): \((1 + 1.25 + 2 + 3.25)(0.5) = 3.75\).`,
        R`Right sum (leave out the first height): \((1.25 + 2 + 3.25 + 5)(0.5) = 5.75\).`,
        R`\(f\) is increasing, so the left sum is too small and the right sum is too large: the integral is between \(3.75\) and \(5.75\).`,
      ],
      answer: R`\(L_4 = 3.75\) and \(R_4 = 5.75\)`,
      visual: {
        type: 'plot', x: [-0.25, 2.5], y: [-0.5, 6], fns: [{ f: exampleF }], rects: range(0, 3).map((i) => ({ x: i / 2, w: 0.5, h: exampleF(i / 2) })),
        alt: 'Graph of y = x² + 1 from x = 0 to x = 2 with four left-endpoint rectangles of width 0.5 and heights 1, 1.25, 2 and 3.25. The rectangles lie below the curve.',
      },
    },
    {
      title: 'Word problem: a trapezoidal sum from a table',
      word: true,
      problem: R`Water flows into a tank at the rate \(R(t)\) liters per minute. The table shows \(R(t)\) at selected times. Use a trapezoidal sum with the four subintervals in the table to estimate how much water flows in from \(t = 0\) to \(t = 10\) minutes.`,
      steps: [
        R`The amount of water is the area under the rate graph, \(\int_{0}^{10} R(t)\,dt\). The widths of the subintervals are \(2, 3, 4, 1\) minutes.`,
        R`Each trapezoid has area \(\tfrac{1}{2}\) × (left value + right value) × width.`,
        R`\(\tfrac{1}{2}(8 + 12)(2) + \tfrac{1}{2}(12 + 15)(3) + \tfrac{1}{2}(15 + 11)(4) + \tfrac{1}{2}(11 + 9)(1) = 20 + 40.5 + 52 + 10\).`,
      ],
      answer: R`About \(122.5\) liters`,
      visual: rowTable(['t', 'R(t)'], [[0, 8], [2, 12], [5, 15], [9, 11], [10, 9]], 'Table of values. At t = 0, 2, 5, 9, 10 minutes the rate R(t) is 8, 12, 15, 11, 9 liters per minute.'),
    },
    {
      title: 'Reading a limit of Riemann sums',
      problem: R`Write \(\displaystyle\lim_{n \to \infty} \sum_{i=1}^{n} \left(2 + \frac{3i}{n}\right)^{2} \frac{3}{n}\) as a definite integral.`,
      steps: [
        R`The factor \(\dfrac{3}{n}\) is \(\Delta x = \dfrac{b - a}{n}\), so the interval has length \(b - a = 3\).`,
        R`The sample point is \(x_i = 2 + \dfrac{3i}{n} = a + i\,\Delta x\), so \(a = 2\) and \(b = 5\).`,
        R`The sample point is squared, so \(f(x) = x^{2}\).`,
      ],
      answer: R`\(\displaystyle\int_{2}^{5} x^{2}\,dx\)`,
    },
    {
      title: 'Signed area with geometry',
      problem: R`Use geometry to evaluate \(\int_{0}^{5} (4 - 2x)\,dx\).`,
      steps: [
        R`The line \(y = 4 - 2x\) crosses the \(x\)-axis at \(x = 2\).`,
        R`From \(x = 0\) to \(x = 2\): a triangle above the axis with base \(2\) and height \(4\), area \(\tfrac{1}{2}(2)(4) = 4\).`,
        R`From \(x = 2\) to \(x = 5\): a triangle below the axis with base \(3\) and height \(6\), area \(\tfrac{1}{2}(3)(6) = 9\).`,
        R`Area above minus area below: \(4 - 9 = -5\).`,
      ],
      answer: R`\(\int_{0}^{5} (4 - 2x)\,dx = -5\)`,
      visual: {
        type: 'plot', x: [-1, 6], y: [-7, 5], fns: [{ f: exampleLine }], shade: [{ f: exampleLine, from: 0, to: 2, color: 'a' }, { f: exampleLine, from: 2, to: 5, color: 'b' }],
        alt: 'Graph of the line y = 4 − 2x. A triangle above the x-axis from x = 0 to x = 2 and a larger triangle below the x-axis from x = 2 to x = 5 are shaded.',
      },
    },
  ],

  models: [
    {
      id: 'riemann-sum',
      title: 'Riemann sums for f(x) = ax² + c',
      intro: 'Choose the function, the interval, the number of subintervals and the method. Watch the rectangles (or trapezoids) and the estimate change.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -5, max: 10, value: 1 },
        { name: 'lo', label: 'Left end of the interval', type: 'int', min: -4, max: 6, value: 0 },
        { name: 'hi', label: 'Right end of the interval', type: 'int', min: -3, max: 8, value: 2 },
        { name: 'n', label: 'Number of subintervals n', type: 'int', min: 1, max: 12, value: 4 },
        { name: 'method', label: 'Method', type: 'select', value: 'left', options: [{ value: 'left', label: 'left endpoints' }, { value: 'right', label: 'right endpoints' }, { value: 'mid', label: 'midpoints' }, { value: 'trap', label: 'trapezoids' }] },
      ],
      compute({ a, c, lo, hi, n, method }) {
        if (hi <= lo) return { error: 'The right end of the interval must be greater than the left end.' };
        const f = (x) => a * x * x + c;
        const dx = (hi - lo) / n;
        const nn = (x) => num(x, { places: 4 });
        const eq = (...xs) => (xs.every((x) => Math.abs(x - round(x, 4)) < 1e-9) ? '=' : R`\approx`);
        const list = (xs) => xs.map(nn).join(R`,\ `);
        const grid = range(0, n).map((i) => lo + i * dx);
        const trap = method === 'trap';
        const pts = trap ? grid : grid.slice(0, -1).map((x) => x + KIND[method].at * dx);
        const hs = pts.map(f);
        const added = trap ? 2 * sum(hs) - hs[0] - hs[n] : sum(hs);
        const value = riemann(f, lo, hi, n, method);
        const exact = (a * (hi ** 3 - lo ** 3)) / 3 + c * (hi - lo);
        const shapes = `${trap ? 'trapezoid' : 'rectangle'}${n === 1 ? '' : 's'}`;
        return {
          problem: R`Approximate \(${integral(lo, hi, wrap(terms([[a, 'x^{2}'], [c, '']])))}\) with \(n = ${n}\) ${shapes}${trap ? '' : ` (${KIND[method].points})`}.`,
          steps: [
            R`Width of each subinterval: \(\Delta x = \dfrac{${hi} - ${paren(lo)}}{${n}} ${eq(dx)} ${nn(dx)}\).`,
            R`The ${trap ? 'endpoints' : KIND[method].points} of the subintervals are \(x = ${list(pts)}\).`,
            R`The heights \(f(x)\) at those points are \(${list(hs)}\).`,
            trap
              ? R`Trapezoidal rule: the two end heights count once and the others twice, which adds up to \(${nn(added)}\). Multiply by \(\dfrac{\Delta x}{2}\): \(\left(${nn(added)}\right)\left(${nn(dx / 2)}\right) ${eq(value, dx / 2, added)} ${nn(value)}\).`
              : R`Add the heights, \(${nn(added)}\), and multiply by \(\Delta x\): \(\left(${nn(added)}\right)\left(${nn(dx)}\right) ${eq(value, dx, added)} ${nn(value)}\).`,
          ],
          answer: R`\(${{ left: 'L', right: 'R', mid: 'M', trap: 'T' }[method]}_{${n}} ${eq(value)} ${nn(value)}\)`,
          note: R`The exact value of the integral ${eq(exact) === '=' ? 'is' : 'is about'} \(${nn(exact)}\). ${Math.abs(value - exact) < 1e-9 ? 'This estimate is exact.' : R`This estimate is about \(${nn(Math.abs(value - exact))}\) too ${value > exact ? 'high' : 'low'}.`}`,
          visual: {
            type: 'plot', ...fit(f, lo - 0.5, hi + 0.5, { include: [0] }), fns: [{ f }],
            ...(trap ? { polygons: grid.slice(0, -1).map((x, i) => ({ points: [[x, 0], [x, f(x)], [grid[i + 1], f(grid[i + 1])], [grid[i + 1], 0]], color: 'b' })) } : { rects: hs.map((h, i) => ({ x: grid[i], w: dx, h })) }),
            alt: `Graph of the parabola with ${n} ${shapes}${trap ? '' : ` built on the ${KIND[method].points}`} between x = ${lo} and x = ${hi}. The estimate of the integral is ${nn(value)}.`,
          },
        };
      },
    },
    {
      id: 'tank-net-change',
      title: 'Word problem: net change from a rate graph',
      word: true,
      intro: 'The net flow rate into a tank falls steadily. Change the starting rate, how fast it falls, and the length of time.',
      inputs: [
        { name: 'r0', label: 'Starting rate (L/min)', type: 'int', min: 1, max: 40, value: 12 },
        { name: 'k', label: 'Drop in the rate each minute', type: 'int', min: 1, max: 10, value: 2 },
        { name: 'T', label: 'Time (minutes)', type: 'int', min: 1, max: 15, value: 10 },
      ],
      compute({ r0, k, T }) {
        const r = (t) => r0 - k * t;
        const rT = r(T);
        const net = r0 * T - (k * T * T) / 2;
        const nn = (x) => num(x, { places: 2 });
        const eq = (...xs) => (xs.every((x) => Math.abs(x - round(x, 2)) < 1e-9) ? '=' : R`\approx`);
        const rTex = terms([[r0, ''], [-k, 't']]);
        const tz = r0 / k; // the rate reaches 0 here
        const [up, down] = [(r0 * tz) / 2, (-rT * (T - tz)) / 2];
        const steps = [
          R`The change in the amount of water is the signed area between the rate graph and the \(t\)-axis from \(t = 0\) to \(t = ${T}\).`,
          R`The rate \(r(t) = ${rTex}\) starts at \(r(0) = ${r0}\) and ends at \(r(${T}) = ${rT}\).`,
        ];
        if (rT >= 0) steps.push(rT === 0 ? R`The rate falls to \(0\) exactly at the end, so the region is a triangle: \(\tfrac{1}{2}${product(T, r0)} = ${nn(net)}\).` : R`The rate stays positive, so the region is a trapezoid: \(\tfrac{1}{2}(${r0} + ${rT})(${T}) = ${nn(net)}\).`);
        else {
          steps.push(
            R`The rate reaches \(0\) when \(${rTex} = 0\), at \(t ${eq(tz)} ${nn(tz)}\). Before then the tank gains water; after then it loses water.`,
            R`Triangle above the axis: \(\tfrac{1}{2}\left(${nn(tz)}\right)(${r0}) ${eq(tz, up)} ${nn(up)}\). Triangle below the axis: \(\tfrac{1}{2}\left(${nn(T - tz)}\right)(${-rT}) ${eq(tz, down)} ${nn(down)}\).`,
            R`Area above minus area below: \(${nn(up)} - ${nn(down)} ${eq(up, down)} ${nn(net)}\).`,
          );
        }
        return {
          problem: R`Water flows into a tank while a drain is open. The net rate of change of the amount of water is \(r(t) = ${rTex}\) liters per minute, where a negative rate means the tank is losing water. By how much does the amount of water change during the first ${T === 1 ? 'minute' : `${T} minutes`}?`,
          steps,
          answer: net > 0 ? R`The tank gains \(${nn(net)}\) liters.` : net < 0 ? R`The tank loses \(${nn(-net)}\) liters.` : 'The net change is 0 liters: the tank ends with the same amount of water it started with.',
          visual: {
            type: 'plot', ...fit(r, 0, T, { include: [0] }), fns: [{ f: r }], axisLabels: ['t (min)', 'r (L/min)'],
            shade: rT >= 0 ? [{ f: r, from: 0, to: T }] : [{ f: r, from: 0, to: tz, color: 'a' }, { f: r, from: tz, to: T, color: 'b' }],
            alt: `Graph of the net rate in liters per minute: a line from ${r0} at time 0 to ${rT} at time ${T}. The region between the line and the time axis is shaded${rT < 0 ? ', above the axis first and then below it' : ''}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyAccumulation, easyRiemannSum, easyProperties],
    medium: [mediumRiemannSum, mediumTable, mediumSignedArea, mediumOverUnder],
    hard: [hardSigmaToIntegral, hardGraphIntegral, hardProperties],
    challenge: [challengeMissingValue, challengeSubintervals, challengeLimitValue],
  },
};
