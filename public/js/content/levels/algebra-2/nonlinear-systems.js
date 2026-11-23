import { R, q, frac, num, txt, round, range, gcd, poly, linear, terms, point, paren, person, isSquare, sqrtTex } from '../../lib/index.js';
import { M, val } from './_shared.js';

// ───────────── Helpers ─────────────

const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const pt = ([x, y]) => point(x, y);
const byX = (ps) => [...ps].sort((a, b) => val(a[0]) - val(b[0]));
const keyOf = (ps) => [...new Set(ps.map((p) => p.map((v) => round(val(v), 6)).join(',')))].sort().join(';');
// A set of solution points as one answer choice.
function pointsChoice(ps) {
  const s = byX(ps).filter((p, i, all) => i === 0 || keyOf([p]) !== keyOf([all[i - 1]]));
  if (!s.length) return 'No real solution';
  if (s.length === 1) return R`Only \(${pt(s[0])}\)`;
  return s.map((p) => M(pt(p))).join(' and ');
}
// The same set in a sentence: "(1, 3)" or "(1, 3) and (4, 6)".
const pointsText = (ps) => byX(ps).map((p) => M(pt(p))).join(' and ');
// Wrong point sets: drop any set that equals the right one or an earlier wrong one. Each is a list of points or { at, why }.
function wrongSets(cands, right) {
  const seen = new Set([keyOf(right)]);
  const out = [];
  for (const c of cands) {
    if (!c) continue;
    const ps = Array.isArray(c) ? c : c.at;
    const k = keyOf(ps);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c.why ? { value: pointsChoice(ps), why: c.why } : pointsChoice(ps));
  }
  return out;
}
// "x = 2 or x = 5" (sorted), "x = 2" for one value.
const xsChoice = (xs, v = 'x') => [...new Set(xs)].sort((a, b) => a - b).map((x) => M(`${v} = ${num(x)}`)).join(' or ');
const sys = (e1, e2) => R`\[\begin{cases} ${e1} \\ ${e2} \end{cases}\]`;
// Count the places where h changes sign on [a, b] (a fine grid that avoids landing exactly on a root).
function signChanges(h, a, b, n = 4000) {
  let count = 0;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const v = h(a + ((b - a) * (i + 0.5)) / (n + 1));
    if (!Number.isFinite(v)) {
      prev = null;
      continue;
    }
    if (prev != null && Math.sign(v) !== Math.sign(prev) && v !== 0) count++;
    if (v !== 0) prev = v;
  }
  return count;
}
// Number of real roots of Ax² + Bx + C (A ≠ 0) from the value at the vertex, not the discriminant.
const rootCount = (A, B, C) => {
  const v = A * (-B / (2 * A)) ** 2 + B * (-B / (2 * A)) + C;
  return Math.abs(v) < 1e-9 ? 1 : Math.sign(v) === Math.sign(A) ? 0 : 2;
};
const HOW = ['No solution', 'Exactly one solution', 'Exactly two solutions', 'Infinitely many solutions'];
// Why a count is wrong, from the discriminant D of the quadratic after substituting.
const discWhy = (D) => (D > 0 ? `After substituting, the discriminant is ${D}. It is positive, so the quadratic has two real roots.` : D === 0 ? 'After substituting, the discriminant is 0, so the quadratic has one repeated root: the line just touches the curve.' : `After substituting, the discriminant is ${D}. It is negative, so the quadratic has no real roots.`);
const circle = (r, color) => ({ x: (t) => r * Math.cos(t), y: (t) => r * Math.sin(t), t: [0, 2 * Math.PI], color });
// x² − sx + p written with the helpers.
const quadTex = (A, B, C) => poly([A, B, C]);
// (x − r1)(x − r2), or (x − r)² for a double root.
const factored = (r1, r2) => (r1 === r2 ? `${fx(r1)}^{2}` : `${fx(r1)}${fx(r2)}`);
const fx = (r) => (r === 0 ? 'x' : `(${linear(1, -r)})`);

// ───────────── Easy ─────────────

function curveFamily(rng) {
  const kind = rng.pick(['quad', 'quad', 'abs', 'exp', 'sqrt']);
  if (kind === 'quad') {
    const a = rng.pick([1, -1]);
    const [h, k] = [rng.int(-2, 2), a > 0 ? rng.int(-5, 0) : rng.int(0, 5)];
    const [d1, d2] = [rng.int(-3, 0), rng.int(1, 3)];
    const f = (x) => a * (x - h) ** 2 + k;
    return { f, x1: h + d1, x2: h + d2, label: 'y = f(x)', tex: poly([a, -2 * a * h, a * h * h + k]), name: 'a parabola' };
  }
  if (kind === 'abs') {
    const [h, k] = [rng.int(-2, 2), rng.int(-4, 1)];
    const [d1, d2] = [rng.int(1, 4), rng.int(1, 4)];
    return { f: (x) => Math.abs(x - h) + k, x1: h - d1, x2: h + d2, label: 'y = f(x)', name: 'an absolute value graph' };
  }
  if (kind === 'exp') {
    const k = rng.int(-3, 1);
    const [x1, x2] = rng.pick([[0, 1], [0, 2], [1, 2], [-1, 1], [1, 3], [0, 3], [-1, 2]]);
    return { f: (x) => 2 ** x + k, x1, x2, label: 'y = f(x)', name: 'an exponential curve' };
  }
  const [h, k] = [rng.int(-3, 0), rng.int(-2, 2)];
  const [u1, u2] = rng.pick([[0, 1], [0, 4], [1, 4], [1, 9], [0, 9], [4, 9]]);
  return { f: (x) => (x >= h ? Math.sqrt(x - h) + k : NaN), x1: h + u1, x2: h + u2, label: 'y = f(x)', name: 'a square-root curve', lo: h };
}

function easyFromGraph(rng) {
  const c = curveFamily(rng);
  const { f, x1, x2 } = c;
  const [y1, y2] = [f(x1), f(x2)];
  const m = (y2 - y1) / (x2 - x1);
  const g = (x) => y1 + m * (x - x1);
  const X = [Math.min(x1, -1) - 2, Math.max(x2, 1) + 2];
  const ys = [y1, y2, f(X[0]), f(X[1])].filter(Number.isFinite);
  const Y = [Math.min(-1, Math.floor(Math.min(y1, y2)) - 3), Math.max(1, Math.ceil(Math.max(y1, y2)) + 3)];
  if (ys.some((v) => !Number.isInteger(round(v, 9)) && (v === y1 || v === y2))) return easyFromGraph(rng);
  const right = xsChoice([x1, x2]);
  return q({
    prompt: R`The graph shows \(y = f(x)\) and \(y = g(x)\). What are the solutions of the equation \(f(x) = g(x)\)?`,
    visual: {
      type: 'plot', x: X, y: Y, step: [1, Y[1] - Y[0] > 16 ? 2 : 1],
      fns: [{ f, label: 'y = f(x)', labelAt: x2 + 1.5 }, { f: g, color: 'b', label: 'y = g(x)', labelAt: x1 - 1.5 }],
      points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
      alt: `Graph of ${c.name} y = f(x) and a straight line y = g(x). They cross at exactly two points, (${txt(x1)}, ${txt(y1)}) and (${txt(x2)}, ${txt(y2)}).`,
    },
    correct: right,
    wrong: [
      { value: R`\(${pt([x1, y1])}\) and \(${pt([x2, y2])}\)`, why: R`Those are the intersection points. The equation \(f(x) = g(x)\) has only the variable \(x\), so its solutions are the \(x\)-coordinates of those points.` },
      xsChoice([y1, y2]) !== right ? { value: xsChoice([y1, y2]), why: 'Those are the y-coordinates, the common value of the two functions. The solutions are the x-values where the graphs meet.' } : null,
      { value: R`\(x = ${x1}\) only`, why: 'The graphs cross twice, so there are two solutions.' },
      R`\(x = ${x2}\) only`,
    ],
    solution: [
      R`\(f(x) = g(x)\) is true exactly where the two graphs have the same height, which is where they cross.`,
      R`They cross at \(${pt([x1, y1])}\) and \(${pt([x2, y2])}\).`,
      R`The solutions are the \(x\)-coordinates: \(x = ${x1}\) or \(x = ${x2}\).`,
    ],
    rule: 4, skill: 'solving f(x) = g(x) by graphing',
    check: () => (near(f(x1), g(x1)) && near(f(x2), g(x2)) && signChanges((x) => f(x) - g(x), c.lo ?? X[0], X[1]) <= 2 ? true : 'the graphs do not meet exactly at the two x-values'),
  });
}

// A parabola y = ax² + bx + c and the line through its points at x = r1 and x = r2.
function parabolaAndLine(rng, a, r1, r2) {
  const b = rng.int(-4, 4);
  const c = rng.int(-6, 6);
  const m = b + a * (r1 + r2);
  const k = c - a * r1 * r2;
  const f = (x) => a * x * x + b * x + c;
  const L = (x) => m * x + k;
  return { b, c, m, k, f, L };
}

function easyWhichPoint(rng) {
  const [r1, r2] = rng.sample(range(-4, 4), 2);
  const { b, c, m, k, f, L } = parabolaAndLine(rng, 1, r1, r2);
  const ok = ([x, y]) => near(f(x), y) && near(L(x), y);
  const x0 = rng.pick(range(-4, 4).filter((x) => x !== r1 && x !== r2));
  const sol = [r1, L(r1)];
  const cands = [
    { at: [x0, f(x0)], why: R`That point is on the parabola, but the line gives \(y = ${L(x0)}\) at \(x = ${x0}\). A solution must fit both equations.` },
    { at: [x0, L(x0)], why: R`That point is on the line, but the parabola gives \(y = ${f(x0)}\) at \(x = ${x0}\). A solution must fit both equations.` },
    { at: [L(r1), r1], why: 'An ordered pair lists x first, then y.' },
    { at: [r1, -L(r1)] },
    { at: [-r1, L(r1)] },
    { at: [r1 + 1, L(r1)] },
    { at: [r1, L(r1) + 1] },
  ].filter((w) => !ok(w.at));
  return q({
    prompt: R`Which ordered pair is a solution of the system? ${sys(R`y = ${poly([1, b, c])}`, R`y = ${linear(m, k)}`)}`,
    correct: M(pt(sol)),
    wrong: cands.map((w) => (w.why ? { value: M(pt(w.at)), why: w.why } : M(pt(w.at)))),
    solution: [
      R`Substitute \(${pt(sol)}\) into the first equation: \(${terms([[1, `(${num(r1)})^{2}`], [b, `(${num(r1)})`], [c, '']])} = ${f(r1)}\). ✓`,
      R`Substitute it into the second equation: \(${terms([[m, `(${num(r1)})`], [k, '']])} = ${L(r1)}\). ✓`,
      'It makes both equations true, so it is a solution. Each other pair fails at least one equation.',
    ],
    rule: 0, skill: 'checking a solution',
    check: () => (ok(sol) ? true : 'the pair does not satisfy both equations'),
  });
}

const RACES = [
  { story: (c, a, b) => `A new video has ${c} thousand views, and its views double every day. An older video has ${a} thousand views and gains ${b} thousand views a day.`, A: 'New video (thousands)', B: 'Older video (thousands)', unit: 'day', ask: 'the two videos have the same number of views' },
  { story: (c, a, b) => `A colony of bacteria has ${c} hundred cells and doubles every hour. A second colony has ${a} hundred cells and grows by ${b} hundred cells an hour.`, A: 'First colony (hundreds)', B: 'Second colony (hundreds)', unit: 'hour', ask: 'the two colonies have the same number of cells' },
];

function easyTableInterval(rng) {
  const s = rng.pick(RACES);
  const c = rng.pick([1, 2, 3, 5]);
  const a = rng.int(5, 40);
  const b = rng.int(2, 15);
  const f = (t) => c * 2 ** t;
  const g = (t) => a + b * t;
  const ts = range(0, 6);
  const d = ts.map((t) => f(t) - g(t));
  const flips = range(0, 5).filter((j) => Math.sign(d[j]) !== Math.sign(d[j + 1]));
  if (d[0] >= 0 || d.some((v) => v === 0) || flips.length !== 1) return easyTableInterval(rng);
  const j = flips[0];
  const say = (i) => `Between ${s.unit} ${i} and ${s.unit} ${i + 1}`;
  const others = range(0, 5).filter((i) => i !== j);
  return q({
    prompt: `${s.story(c, a, b)} The table shows both amounts. Between which two ${s.unit}s does a time come when ${s.ask}?`,
    visual: { type: 'table', rowHeaders: true, headers: [cap(s.unit), ...ts.map(String)], rows: [[s.A, ...ts.map(f)], [s.B, ...ts.map(g)]] },
    correct: say(j),
    wrong: [
      j > 0 ? { value: say(j - 1), why: `At ${s.unit} ${j} the first amount is still smaller (${f(j)} < ${g(j)}). The order changes after that.` } : null,
      j < 5 ? { value: say(j + 1), why: `At ${s.unit} ${j + 1} the first amount has already passed the second (${f(j + 1)} > ${g(j + 1)}).` } : null,
      ...rng.shuffle(others).map(say),
    ],
    solution: [
      'Compare the two rows. The amounts are equal at some moment between two times where the larger amount switches.',
      `${cap(s.unit)} ${j}: ${f(j)} < ${g(j)}. ${cap(s.unit)} ${j + 1}: ${f(j + 1)} > ${g(j + 1)}.`,
      `The amounts are equal at some time between ${s.unit} ${j} and ${s.unit} ${j + 1}.`,
    ],
    rule: 4, skill: 'approximating with a table',
    check: () => {
      let [lo, hi] = [0, 6];
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) - g(mid) < 0) lo = mid;
        else hi = mid;
      }
      return lo > j && lo < j + 1 ? true : 'bisection puts the crossing in another interval';
    },
  });
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ───────────── Medium ─────────────

function mediumLineParabola(rng) {
  const a = rng.pick([1, 1, -1, 2]);
  const r1 = rng.int(-4, 4);
  const r2 = rng.bool(0.2) ? r1 : rng.intExcept(-4, 4, [r1]);
  const { b, c, m, k, f, L } = parabolaAndLine(rng, a, r1, r2);
  const right = r1 === r2 ? [[r1, L(r1)]] : [[r1, L(r1)], [r2, L(r2)]];
  const ok = (ps) => ps.every(([x, y]) => near(f(x), y) && near(L(x), y));
  const [B, C] = [b - m, c - k];
  return q({
    prompt: R`Solve the system: ${sys(R`y = ${poly([a, b, c])}`, R`y = ${linear(m, k)}`)}`,
    correct: pointsChoice(right),
    wrong: wrongSets([
      { at: right.map(([x]) => [-x, L(-x)]), why: R`A factor \((x - r)\) is 0 when \(x = r\), not \(x = -r\).` },
      { at: right.map(([x, y]) => [y, x]), why: R`An ordered pair lists \(x\) first, then \(y\).` },
      r1 !== r2 ? { at: [right[0]], why: 'The quadratic has two roots, so the line crosses the parabola twice.' } : { at: [[r1, L(r1)], [-r1 - 1, L(-r1 - 1)]], why: 'The quadratic is a perfect square, so it has only one root: the line just touches the parabola.' },
      r1 !== r2 ? [right[1]] : null,
      right.map(([x, y]) => [x, -y]),
      [],
      right.map(([x]) => [x + 1, f(x + 1)]),
    ], right),
    solution: [
      R`Both expressions equal \(y\), so set them equal: \(${poly([a, b, c])} = ${linear(m, k)}\).`,
      R`Move everything to one side: \(${quadTex(a, B, C)} = 0\)${a === 1 ? '' : R`, so \(${quadTex(1, B / a, C / a)} = 0\)`}.`,
      R`Factor: \(${factored(r1, r2)} = 0\), so ${r1 === r2 ? R`\(x = ${r1}\) (a double root)` : R`\(x = ${Math.min(r1, r2)}\) or \(x = ${Math.max(r1, r2)}\)`}.`,
      m === 0 ? R`The line gives \(y = ${k}\) at every point. The solution is ${pointsText(right)}.` : R`Find \(y\) from the line: ${byX(right).map(([x, y]) => R`\(y = ${terms([[m, `(${num(x)})`], [k, '']])} = ${y}\)`).join(' and ')}. The solution is ${pointsText(right)}.`,
    ],
    rule: 1, skill: 'line and parabola',
    check: () => (ok(right) && signChanges((x) => f(x) - L(x), -10, 10) === (r1 === r2 ? 0 : 2) ? true : 'the points do not satisfy both equations'),
  });
}

function mediumHowMany(rng) {
  const target = rng.int(0, 2);
  if (rng.bool(0.5)) {
    const b = rng.int(-4, 4);
    const c = rng.int(-5, 5);
    const m = rng.int(-3, 3);
    const B = b - m;
    let k;
    if (target === 1) {
      if (B % 2) return mediumHowMany(rng);
      k = c - (B * B) / 4;
    } else {
      k = rng.int(-8, 8);
    }
    const C = c - k;
    const D = B * B - 4 * C;
    const count = D > 0 ? 2 : D === 0 ? 1 : 0;
    if (count !== target) return mediumHowMany(rng);
    return q({
      prompt: R`How many solutions does the system have? ${sys(R`y = ${poly([1, b, c])}`, R`y = ${linear(m, k)}`)}`,
      correct: HOW[count],
      wrong: HOW.filter((_, i) => i !== count).map((h) => (h === HOW[3] ? { value: h, why: 'A line and a parabola can meet at most twice; infinitely many solutions happen only when two equations describe the same graph.' } : { value: h, why: discWhy(D) })),
      solution: [
        R`Set the expressions equal and move everything to one side: \(${quadTex(1, B, C)} = 0\).`,
        R`Discriminant: \(b^{2} - 4ac = ${paren(B)}^{2} - 4(1)(${C}) = ${D}\).`,
        D > 0 ? 'It is positive, so there are two real roots: the line crosses the parabola twice.' : D === 0 ? 'It is 0, so there is one repeated root: the line is tangent to the parabola.' : 'It is negative, so there are no real roots: the line misses the parabola.',
      ],
      rule: 1, skill: 'counting with the discriminant',
      check: () => (rootCount(1, B, C) === count ? true : 'the vertex test gives a different count'),
    });
  }
  const r = rng.int(2, 6);
  const m = target === 1 ? 0 : rng.int(-2, 2);
  const k = target === 1 ? r * rng.sign() : rng.int(-9, 9);
  const disc = r * r * (1 + m * m) - k * k; // D / 4
  const count = disc > 0 ? 2 : disc === 0 ? 1 : 0;
  if (count !== target) return mediumHowMany(rng);
  const [A2, B2, C2] = [1 + m * m, 2 * m * k, k * k - r * r];
  const D = B2 * B2 - 4 * A2 * C2;
  return q({
    prompt: R`How many solutions does the system have? ${sys(`x^{2} + y^{2} = ${r * r}`, R`y = ${linear(m, k)}`)}`,
    correct: HOW[count],
    wrong: HOW.filter((_, i) => i !== count).map((h) => (h === HOW[3] ? { value: h, why: 'A line and a circle can meet at most twice.' } : { value: h, why: m === 0 ? R`Substituting gives \(x^{2} = ${r * r - k * k}\), which has ${count === 2 ? 'two real solutions' : count === 1 ? 'only the solution 0' : 'no real solution'}.` : discWhy(D) })),
    solution: [
      m === 0 ? R`Substitute \(y = ${k}\): \(x^{2} + ${k * k} = ${r * r}\), so \(x^{2} = ${r * r - k * k}\).` : R`Substitute \(y = ${linear(m, k)}\): \(x^{2} + (${linear(m, k)})^{2} = ${r * r}\), so \(${quadTex(A2, B2, C2)} = 0\).`,
      m === 0 ? (r * r - k * k > 0 ? R`A positive number has two square roots, so there are two values of \(x\).` : r * r === k * k ? R`Only \(x = 0\) works.` : R`No real number squared is negative, so there is no real \(x\).`) : R`Discriminant: \(${paren(B2)}^{2} - 4(${A2})(${C2}) = ${D}\).`,
      count === 2 ? 'Two real solutions: the line cuts through the circle.' : count === 1 ? 'One solution: the line is tangent to the circle.' : 'No real solution: the line misses the circle.',
    ],
    rule: 2, skill: 'counting with the discriminant',
    check: () => {
      const dist = Math.abs(k) / Math.sqrt(1 + m * m); // distance from the centre to the line
      const geo = near(dist, r) ? 1 : dist < r ? 2 : 0;
      return geo === count ? true : 'the distance from the centre to the line gives a different count';
    },
  });
}

function mediumParabolas(rng) {
  const a1 = rng.pick([1, -1, 2]);
  const b1 = rng.int(-4, 4);
  const c1 = rng.int(-5, 5);
  const f = (x) => a1 * x * x + b1 * x + c1;
  const one = rng.bool(0.35);
  const r1 = rng.int(-3, 3);
  const r2 = rng.intExcept(-3, 3, [r1]);
  let a2;
  let b2;
  let c2;
  let d;
  if (one) {
    d = rng.nonzero(-3, 3); // f − g = d(x − r1)
    [a2, b2, c2] = [a1, b1 - d, c1 + d * r1];
  } else {
    d = rng.pick([-2, -1, 1, 2].filter((v) => v !== a1)); // f − g = d(x − r1)(x − r2)
    [a2, b2, c2] = [a1 - d, b1 + d * (r1 + r2), c1 - d * r1 * r2];
  }
  const g = (x) => a2 * x * x + b2 * x + c2;
  const right = one ? [[r1, f(r1)]] : [[r1, f(r1)], [r2, f(r2)]];
  const [A, B, C] = [a1 - a2, b1 - b2, c1 - c2];
  return q({
    prompt: R`Solve the system: ${sys(R`y = ${poly([a1, b1, c1])}`, R`y = ${poly([a2, b2, c2])}`)}`,
    correct: pointsChoice(right),
    wrong: wrongSets([
      { at: right.map(([x]) => [-x, f(-x)]), why: R`A factor \((x - r)\) is 0 when \(x = r\), not \(x = -r\).` },
      { at: right.map(([x, y]) => [y, x]), why: R`An ordered pair lists \(x\) first, then \(y\).` },
      one ? { at: [[r1, f(r1)], [-r1 + 1, f(-r1 + 1)]], why: R`The \(x^{2}\)-terms cancel, so the equation is linear and has only one solution.` } : { at: [right[0]], why: 'The difference is a quadratic with two roots, so the parabolas cross twice.' },
      one ? null : [right[1]],
      right.map(([x, y]) => [x, -y]),
      [],
      right.map(([x]) => [x + 1, f(x + 1)]),
    ], right),
    solution: [
      R`Set the two expressions equal and subtract: \(${A === 0 ? linear(B, C) : quadTex(A, B, C)} = 0\).`,
      one ? R`The \(x^{2}\)-terms cancel. Solve the linear equation: \(x = ${r1}\).` : R`${A === 1 ? '' : R`Divide by \(${A}\): \(${quadTex(1, B / A, C / A)} = 0\). `}Factor: \(${factored(r1, r2)} = 0\), so \(x = ${Math.min(r1, r2)}\) or \(x = ${Math.max(r1, r2)}\).`,
      R`Find \(y\) from the first equation: ${byX(right).map(([x, y]) => R`\(y = ${f(x)}\) at \(x = ${x}\)`).join(' and ')}. The solution is ${pointsText(right)}.`,
    ],
    rule: 3, skill: 'two parabolas',
    check: () => (right.every(([x, y]) => near(f(x), y) && near(g(x), y)) && signChanges((x) => f(x) - g(x), -12, 12) === right.length ? true : 'the points do not satisfy both equations'),
  });
}

// ───────────── Hard ─────────────

const LATTICE = [25, 50, 65, 100, 169].map((R2) => {
  const pts = [];
  for (let x = -13; x <= 13; x++) for (let y = -13; y <= 13; y++) if (x * x + y * y === R2) pts.push([x, y]);
  return { R2, pts };
});

function hardLineCircle(rng) {
  const { R2, pts } = rng.pick(LATTICE);
  const [p, s] = rng.sample(pts, 2);
  if (p[0] === s[0] || (s[1] - p[1]) % (s[0] - p[0]) !== 0) return hardLineCircle(rng);
  const m = (s[1] - p[1]) / (s[0] - p[0]);
  if (Math.abs(m) > 4) return hardLineCircle(rng);
  const k = p[1] - m * p[0];
  const L = (x) => m * x + k;
  const right = [p, s];
  const [A, B, C] = [1 + m * m, 2 * m * k, k * k - R2];
  const gg = gcd(gcd(A, Math.abs(B)), Math.abs(C));
  const ok = (ps) => ps.every(([x, y]) => x * x + y * y === R2 && near(L(x), y));
  return q({
    prompt: R`Solve the system: ${sys(`x^{2} + y^{2} = ${R2}`, R`y = ${linear(m, k)}`)}`,
    correct: pointsChoice(right),
    wrong: wrongSets([
      { at: right.map(([x]) => [-x, L(-x)]), why: R`A factor \((x - r)\) is 0 when \(x = r\), not \(x = -r\).` },
      { at: right.map(([x, y]) => [x, -y]), why: R`Those points are on the circle, but not on the line. Find each \(y\) from the line \(y = ${linear(m, k)}\).` },
      { at: right.map(([x, y]) => [y, x]), why: R`An ordered pair lists \(x\) first, then \(y\).` },
      { at: [right[0]], why: 'The quadratic has two roots, so the line crosses the circle twice.' },
      [right[1]],
    ], right),
    solution: [
      R`Substitute the line into the circle: \(x^{2} + (${linear(m, k)})^{2} = ${R2}\).`,
      R`Expand and collect: \(${quadTex(A, B, C)} = 0\)${gg > 1 ? R`. Divide by \(${gg}\): \(${quadTex(A / gg, B / gg, C / gg)} = 0\)` : ''}.`,
      R`Factor or use the quadratic formula: \(x = ${Math.min(p[0], s[0])}\) or \(x = ${Math.max(p[0], s[0])}\).`,
      R`Find each \(y\) from the line: ${pointsText(right)}. Check: ${byX(right).map(([x, y]) => R`\(${paren(x)}^{2} + ${paren(y)}^{2} = ${R2}\)`).join(' and ')}. ✓`,
    ],
    rule: 2, skill: 'line and circle',
    check: () => {
      const roots = [p[0], s[0]].every((x) => near(A * x * x + B * x + C, 0));
      const dist = Math.abs(k) / Math.sqrt(1 + m * m);
      return ok(right) && roots && dist < Math.sqrt(R2) ? true : 'the points do not satisfy both equations';
    },
  });
}

function hardContext(rng) {
  const sv = (t) => R`\(t = ${t}\) s`;
  if (rng.bool(0.55)) {
    // Ball h(t) = p(t) − 5(t − t1)(t − t2), platform p(t) = k + mt.
    const t2 = rng.int(1, 4);
    const t1 = rng.bool(0.6) ? -rng.int(1, 3) : rng.intExcept(1, 4, [t2]);
    const m = rng.intExcept(-3, 6, [0]);
    const k = 5 * rng.int(2, 10);
    const b = 5 * (t1 + t2) + m;
    const c = k - 5 * t1 * t2;
    const p = (t) => k + m * t;
    const h = (t) => -5 * t * t + b * t + c;
    if (b <= 0 || c < 0 || p(Math.max(t1, t2)) <= 0 || (t1 > 0 && p(Math.min(t1, t2)) <= 0)) return hardContext(rng);
    const [lo, hi] = [Math.min(t1, t2), Math.max(t1, t2)];
    const viable = [t1, t2].filter((t) => t >= 0).sort((x, y) => x - y);
    const say = (ts) => (ts.length === 1 ? R`Only at ${sv(ts[0])}` : R`At ${sv(ts[0])} and at ${sv(ts[1])}`);
    const name = person(rng);
    return q({
      prompt: R`${name} throws a ball upward from a balcony. Its height in metres after \(t\) seconds is \(h(t) = ${poly([-5, b, c], 't')}\). At the same moment a window-cleaning platform is at ${k} m and moving at a steady speed, so its height is \(p(t) = ${linear(m, k, 't')}\). When are the ball and the platform at the same height?`,
      correct: say(viable),
      wrong: [
        t1 < 0 ? { value: R`At ${sv(lo)} and at ${sv(hi)}`, why: `A negative time is before the ball was thrown, so it does not fit the situation.` } : { value: say([lo]), why: 'Both times are after the throw and before the ball lands, so both make sense.' },
        t1 < 0 ? { value: say([lo]), why: 'A negative time is before the ball was thrown.' } : say([hi]),
        { value: say([p(hi)]), why: `${p(hi)} is the height in metres at that moment, not the time.` },
        say([hi + 1]),
      ],
      solution: [
        R`Set the heights equal: \(${poly([-5, b, c], 't')} = ${linear(m, k, 't')}\), so \(${poly([-5, b - m, c - k], 't')} = 0\).`,
        R`Divide by \(-5\): \(${poly([1, -(t1 + t2), t1 * t2], 't')} = 0\), which factors as \((${linear(1, -t1, 't')})(${linear(1, -t2, 't')}) = 0\). So \(t = ${lo}\) or \(t = ${hi}\).`,
        t1 < 0 ? R`\(t = ${t1}\) is before the throw, so it is not viable. At \(t = ${t2}\) both heights are \(${p(t2)}\) m.` : R`Both times are after the throw, and the ball is still in the air: the heights are \(${p(lo)}\) m and \(${p(hi)}\) m.`,
      ],
      rule: 5, skill: 'viable solutions in context',
      check: () => ([t1, t2].every((t) => near(h(t), p(t))) && viable.every((t) => t >= 0 && h(t) > 0) ? true : 'the times do not give equal heights in the air'),
    });
  }
  // Break-even: revenue R(x) = −x² + Bx, cost C(x) = mx + F, with R − C = −(x − x1)(x − x2).
  const x1 = rng.int(3, 12);
  const x2 = x1 + rng.int(6, 25);
  const m = rng.int(5, 30);
  const B = x1 + x2 + m;
  const F = x1 * x2;
  const cut = rng.bool(0.5);
  const N = cut ? rng.int(x1 + 1, x2 - 1) : x2 + rng.int(0, 10);
  const viable = [x1, x2].filter((x) => x <= N);
  const say = (xs) => (xs.length === 1 ? R`Only at \(x = ${xs[0]}\)` : R`At \(x = ${xs[0]}\) and at \(x = ${xs[1]}\)`);
  return q({
    prompt: R`A workshop sells \(x\) chairs a month. Its monthly revenue is \(R(x) = ${poly([-1, B, 0])}\) dollars and its monthly cost is \(C(x) = ${linear(m, F)}\) dollars. The workshop can make at most ${N} chairs a month. For which numbers of chairs does the workshop break even (revenue equals cost)?`,
    correct: say(viable),
    wrong: [
      cut ? { value: say([x1, x2]), why: `${x2} chairs is more than the workshop can make, so that solution is not viable.` } : { value: say([x1]), why: `${x2} is within the limit of ${N} chairs, so it counts too.` },
      cut ? { value: say([x2]), why: `${x2} chairs is more than the limit of ${N}.` } : say([x2]),
      { value: say([x1 * (B - x1)]), why: 'That is the revenue in dollars, not the number of chairs.' },
      say([x1 + 1]),
    ],
    solution: [
      R`Set revenue equal to cost: \(${poly([-1, B, 0])} = ${linear(m, F)}\), so \(${poly([-1, B - m, -F])} = 0\).`,
      R`Multiply by \(-1\) and factor: \(${poly([1, -(x1 + x2), F])} = (x - ${x1})(x - ${x2}) = 0\), so \(x = ${x1}\) or \(x = ${x2}\).`,
      cut ? `The limit is ${N} chairs, so only ${x1} chairs is viable.` : `Both are within the limit of ${N} chairs, so both are viable.`,
    ],
    rule: 5, skill: 'viable solutions in context',
    check: () => ([x1, x2].every((x) => -x * x + B * x === m * x + F) && viable.every((x) => x <= N && x >= 0) ? true : 'the break-even numbers do not check'),
  });
}

const TENTHS = [
  { tex: (c) => [`2^{x}`, linear(1, c)], f: () => (x) => 2 ** x, g: (c) => (x) => x + c, cs: [2, 3, 4, 5, 6] },
  { tex: (c) => [`2^{x}`, linear(2, c)], f: () => (x) => 2 ** x, g: (c) => (x) => 2 * x + c, cs: [1, 2, 3, 4] },
  { tex: (c) => [`3^{x}`, linear(1, c)], f: () => (x) => 3 ** x, g: (c) => (x) => x + c, cs: [2, 3, 4, 5, 6, 8] },
  { tex: (c) => [`x^{2}`, `${c}\\sqrt{x}`], f: () => (x) => x * x, g: (c) => (x) => c * Math.sqrt(x), cs: [2, 3, 5, 6, 7] },
];

function hardTableTenths(rng) {
  const s = rng.pick(TENTHS);
  const c = rng.pick(s.cs);
  const [f, g] = [s.f(), s.g(c)];
  const h = (x) => f(x) - g(x);
  // The largest crossing: h < 0 just before it, h > 0 after (both curves grow, f faster).
  let [lo, hi] = [0.5, 10];
  if (!(h(lo) < 0 && h(hi) > 0)) return hardTableTenths(rng);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (h(mid) < 0) lo = mid;
    else hi = mid;
  }
  const root = lo;
  const j = Math.floor(root * 10); // the root is between j/10 and (j + 1)/10
  const start = j - rng.int(0, 4);
  const xs = range(0, 5).map((i) => round((start + i) / 10, 1));
  const fr = xs.map((x) => round(f(x), 2));
  const gr = xs.map((x) => round(g(x), 2));
  if (xs.some((x, i) => near(fr[i], gr[i], 0.015)) || near(root * 10, Math.round(root * 10), 1e-6)) return hardTableTenths(rng);
  const [fT, gT] = s.tex(c);
  const say = (i) => R`Between \(x = ${num((start + i) / 10)}\) and \(x = ${num((start + i + 1) / 10)}\)`;
  const at = j - start;
  return q({
    prompt: R`The table gives values of \(f(x) = ${fT}\) and \(g(x) = ${gT}\), rounded to two decimal places. Between which two values of \(x\) is there a solution of \(f(x) = g(x)\)?`,
    visual: { type: 'table', rowHeaders: true, headers: [M('x'), ...xs.map((x) => M(num(x)))], rows: [[M('f(x)'), ...fr.map((v) => M(num(v)))], [M('g(x)'), ...gr.map((v) => M(num(v)))]] },
    correct: say(at),
    wrong: [
      at > 0 ? { value: say(at - 1), why: R`At both of those values \(f(x) < g(x)\). A solution lies where the order of \(f\) and \(g\) switches.` } : null,
      at < 4 ? { value: say(at + 1), why: R`At both of those values \(f(x) > g(x)\), so the switch has already happened.` } : null,
      ...range(0, 3).filter((i) => i !== at && i !== at - 1 && i !== at + 1).map(say),
      at + 2 <= 4 ? say(at + 2) : null,
      at - 2 >= 0 ? say(at - 2) : null,
    ],
    solution: [
      R`Look at \(f(x) - g(x)\). Where it changes sign, the graphs cross.`,
      R`At \(x = ${num(xs[at])}\): \(${num(fr[at])} < ${num(gr[at])}\). At \(x = ${num(xs[at + 1])}\): \(${num(fr[at + 1])} > ${num(gr[at + 1])}\).`,
      R`So a solution lies between \(x = ${num(xs[at])}\) and \(x = ${num(xs[at + 1])}\) (it is about \(${num(round(root, 3))}\)).`,
    ],
    rule: 4, skill: 'approximating with a table',
    check: () => (h(xs[at]) < 0 && h(xs[at + 1]) > 0 && fr[at] < gr[at] && fr[at + 1] > gr[at + 1] ? true : 'the sign of f − g does not change in that interval'),
  });
}

// ───────────── Challenge ─────────────

function challengeTangentK(rng) {
  const a = rng.pick([1, 1, 2, -1]);
  const b = rng.int(-6, 6);
  const c = rng.int(-6, 6);
  const m = rng.int(-4, 4);
  const B = b - m;
  if (B === 0 || (B * B) % (4 * Math.abs(a)) !== 0) return challengeTangentK(rng);
  const k = c - (B * B) / (4 * a);
  const x0 = -B / (2 * a);
  return q({
    prompt: R`For which value of \(k\) does the line \(y = ${linear(m, 0)} + k\) meet the parabola \(y = ${poly([a, b, c])}\) at exactly one point?`.replace(/y = 0 \+ k/, 'y = k'),
    correct: k,
    fmt: (v) => M(`k = ${num(v)}`),
    wrong: [
      { value: c + (B * B) / (4 * a), why: R`Check the sign: \(b^{2} - 4ac = 0\) here means \(${paren(B)}^{2} - 4(${a})(${c} - k) = 0\).` },
      (B * B) % (2 * Math.abs(a)) === 0 ? { value: c - (B * B) / (2 * a), why: R`The discriminant has \(4ac\), so divide \(${B * B}\) by \(${4 * a}\).` } : null,
      { value: c, why: R`With \(k = ${c}\) the equation is \(${quadTex(a, B, 0)} = 0\), which has two roots.` },
      k + 1,
    ],
    solution: [
      R`Set the expressions equal and collect terms: \(${quadTex(a, B, 0)} + (${c} - k) = 0\).`,
      R`Exactly one solution means the discriminant is 0: \(${paren(B)}^{2} - 4(${a})(${c} - k) = 0\).`,
      R`So \(${c} - k = ${num((B * B) / (4 * a))}\) and \(k = ${num(k)}\). The line touches the parabola at \(x = ${num(x0)}\).`,
    ],
    rule: 1, skill: 'tangent line',
    check: () => (rootCount(a, B, c - k) === 1 && rootCount(a, B, c - k - 1) !== 1 ? true : 'with this k the line does not touch the parabola exactly once'),
  });
}

function challengeAbsLine(rng) {
  const h = rng.int(-4, 4);
  const m = rng.pick([-3, -2, 2, 3]);
  const c = rng.int(-6, 8);
  // Case x ≥ h: x − h = mx + c. Case x < h: h − x = mx + c.
  const right = 1 - m !== 0 ? frac(c + h, 1 - m) : null;
  const left = 1 + m !== 0 ? frac(h - c, 1 + m) : null;
  if (!right || !left || !right.isInt() || !left.isInt() || right.value === h || left.value === h || right.eq(left)) return challengeAbsLine(rng);
  const okR = right.value >= h;
  const okL = left.value < h;
  const sols = [okR ? right.value : null, okL ? left.value : null].filter((v) => v != null);
  if (rng.bool(0.6) && sols.length === 2) return challengeAbsLine(rng); // favour a case with a rejected value
  const both = [right.value, left.value];
  const ans = sols.length ? xsChoice(sols) : 'No real solution';
  const lhs = `|${linear(1, -h)}|`;
  const rhs = linear(m, c);
  return q({
    prompt: R`Solve \(${lhs} = ${rhs}\).`,
    correct: ans,
    wrong: [
      sols.length < 2 ? { value: xsChoice(both), why: ['Check each case answer against its condition.', !okR ? R`\(x = ${right.value}\) is less than \(${h}\), so it does not belong to the case \(x \ge ${h}\).` : '', !okL ? R`\(x = ${left.value}\) is not less than \(${h}\), so it does not belong to the case \(x < ${h}\).` : ''].filter(Boolean).join(' ') } : null,
      sols.length === 2 ? { value: xsChoice([right.value]), why: 'The other case also gives a valid solution: the line crosses both arms of the V.' } : null,
      okR ? xsChoice([left.value]) : xsChoice([right.value]),
      sols.length ? { value: 'No real solution', why: 'Substitute the answer back in: it makes both sides equal.' } : null,
      xsChoice(both.map((v) => -v)),
      'No real solution',
      xsChoice(both.map((v) => v + 1)),
    ].filter((w) => w && (w.value ?? w) !== ans),
    solution: [
      R`Case \(x \ge ${h}\): \(${linear(1, -h)} = ${rhs}\), so \(x = ${right.value}\). ${okR ? 'It satisfies the condition, so it is a solution.' : R`It is not \(\ge ${h}\), so reject it.`}`,
      R`Case \(x < ${h}\): \(${linear(-1, h)} = ${rhs}\), so \(x = ${left.value}\). ${okL ? 'It satisfies the condition, so it is a solution.' : R`It is not \(< ${h}\), so reject it.`}`,
      sols.length ? R`Check: ${sols.map((x) => R`at \(x = ${x}\) both sides equal \(${Math.abs(x - h)}\)`).join(', and ')}. ✓ Answer: ${ans}.` : 'Neither case gives a valid value, so the graphs never meet: there is no solution.',
    ],
    rule: 5, skill: 'absolute value and a line',
    check: () => {
      const H = (x) => Math.abs(x - h) - (m * x + c);
      return sols.every((x) => near(H(x), 0)) && signChanges(H, -60, 60, 24000) === sols.length ? true : 'the solutions do not match the crossings of the graphs';
    },
  });
}

function challengeCircleParabola(rng) {
  const y1 = rng.int(0, 4);
  const s = rng.int(1, 3);
  const a = s * s - y1; // y = x² − a meets the circle at y = y1, where x = ±s
  const y2 = -1 - y1;
  const R2 = a + y1 + y1 * y1;
  const rest = y2 + a; // x² at the second y-value
  if (R2 <= 0 || rest === 0) return challengeCircleParabola(rng);
  const count = rest > 0 ? 4 : 2;
  const pTex = poly([1, 0, -a]);
  return q({
    prompt: R`How many real solutions does the system have? ${sys(`x^{2} + y^{2} = ${R2}`, R`y = ${pTex}`)}`,
    correct: count,
    wrong: [
      count === 2 ? { value: 4, why: R`The second \(y\)-value gives \(x^{2} = ${rest}\), and no real number squared is negative.` } : { value: 2, why: R`Each positive value of \(x^{2}\) gives two values of \(x\), and both \(y\)-values give a positive \(x^{2}\).` },
      { value: count === 2 ? 1 : 3, why: R`Count the \(x\)-values for each \(y\)-value: \(x^{2} = ${y1 + a}\) and \(x^{2} = ${rest}\).` },
      { value: count === 2 ? 3 : 1, why: 'The quadratic in y has two roots; each one gives two points, one point (x = 0) or none.' },
      0,
    ],
    solution: [
      R`From the parabola, \(x^{2} = ${linear(1, a, 'y')}\). Substitute into the circle: \(${linear(1, a, 'y')} + y^{2} = ${R2}\), so \(${poly([1, 1, a - R2], 'y')} = 0\).`,
      R`Factor: \(${y1 === 0 ? 'y' : `(${linear(1, -y1, 'y')})`}(${linear(1, -y2, 'y')}) = 0\), so \(y = ${y1}\) or \(y = ${y2}\).`,
      R`\(y = ${y1}\): \(x^{2} = ${y1 + a}\), so \(x = \pm ${s}\): two points.`,
      rest > 0 ? R`\(y = ${y2}\): \(x^{2} = ${rest}\), so \(x = \pm ${sqrtTex(rest)}\): two more points. In all, 4 solutions.` : R`\(y = ${y2}\): \(x^{2} = ${rest}\), which has no real solution. In all, 2 solutions.`,
    ],
    rule: 3, skill: 'circle and parabola',
    check: () => {
      const r = Math.sqrt(R2);
      const F = (t) => r * Math.sin(t) - (r * r * Math.cos(t) ** 2 - a);
      return signChanges(F, 0.1234, 0.1234 + 2 * Math.PI, 20000) === count ? true : 'tracing the circle finds a different number of crossings';
    },
  });
}

// ───────────── Models ─────────────

function lineCurveModel({ shape, p, m, k }) {
  const circ = shape === 'circle';
  if (circ && p <= 0) return { error: 'A circle needs a positive radius. Make the number r greater than 0.' };
  const [A, B, C] = circ ? [1 + m * m, 2 * m * k, k * k - p * p] : [1, -m, p - k];
  const D = round(B * B - 4 * A * C, 6);
  const L = (x) => m * x + k;
  const roots = D < 0 ? [] : D === 0 ? [-B / (2 * A)] : [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)];
  const exact = roots.every((x) => near(x * 1e4, Math.round(x * 1e4), 1e-6));
  const show = (v) => num(round(v, 2));
  const ptsTxt = roots.map((x) => R`\(${point(round(x, 2), round(L(x), 2))}\)`).join(' and ');
  const curveTex = circ ? `x^{2} + y^{2} = ${num(round(p * p, 4))}` : `y = ${poly([1, 0, p])}`;
  const span = circ ? Math.ceil(p) + 2 : 7;
  const visual = {
    type: 'plot',
    x: [-span, span], y: circ ? [-span, span] : [Math.min(-3, Math.floor(p) - 3), Math.max(12, Math.ceil(p) + 8)],
    square: circ || undefined,
    fns: [...(circ ? [] : [{ f: (x) => x * x + p, label: 'parabola' }]), { f: L, color: 'b', label: 'line' }],
    param: circ ? [circle(p, 'a')] : [],
    points: roots.map((x) => ({ x, y: L(x) })),
    alt: `Graph of the ${circ ? `circle with centre (0, 0) and radius ${txt(p)}` : `parabola y = x² ${p < 0 ? '−' : '+'} ${txt(Math.abs(p))}`} and the line y = ${m === 0 ? '' : `${m === 1 ? '' : m === -1 ? '−' : txt(m)}x ${k < 0 ? '−' : '+'} `}${m === 0 ? txt(k) : txt(Math.abs(k))}. ${roots.length ? `They meet at ${roots.map((x) => `(${txt(round(x, 2))}, ${txt(round(L(x), 2))})`).join(' and ')}.` : 'They do not meet.'}`,
  };
  return {
    problem: R`Solve the system \(${curveTex}\) and \(y = ${linear(m, k)}\).`,
    steps: [
      circ ? R`Substitute the line into the circle: \(x^{2} + (${linear(m, k)})^{2} = ${num(round(p * p, 4))}\).` : R`Set the two expressions for \(y\) equal: \(${poly([1, 0, p])} = ${linear(m, k)}\).`,
      R`Collect terms: \(${quadTex(A, B, C)} = 0\).`,
      R`Discriminant: \(${paren(B)}^{2} - 4(${num(A)})${C < 0 ? `(${num(C)})` : `(${num(C)})`} = ${num(D)}\). ${D > 0 ? 'Positive: two solutions.' : D === 0 ? 'Zero: one solution, the line is tangent.' : 'Negative: no real solution.'}`,
      roots.length ? R`\(x = ${roots.map(show).join(R`\) or \(x = `)}\), and \(y\) comes from the line: ${ptsTxt}${exact ? '' : ' (rounded to two decimal places)'}.` : 'The line and the curve do not meet.',
    ],
    answer: roots.length ? `${ptsTxt}${exact ? '' : ' (rounded)'}` : 'No real solution',
    visual,
  };
}

function ballModel({ v, h0, h1, s }) {
  const T = (v + Math.sqrt(v * v + 20 * h0)) / 10; // when the ball lands
  if (!(T > 0)) return { error: 'The ball needs a starting height or an upward speed above 0.' };
  const A = 5;
  const B = -(v - s);
  const C = -(h0 - h1); // 5t² − (v − s)t − (h0 − h1) = 0
  const D = round(B * B - 4 * A * C, 6);
  const ts = D < 0 ? [] : D === 0 ? [-B / (2 * A)] : [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)];
  const h = (t) => -5 * t * t + v * t + h0;
  const p = (t) => h1 + s * t;
  const judge = (t) => (t < -1e-9 ? 'before the throw, so not viable' : t > T + 1e-9 ? 'after the ball has landed, so not viable' : p(t) < -1e-9 ? 'when the platform would be below the ground, so not viable' : `viable: both are at ${txt(round(p(t), 2))} m`);
  const good = ts.filter((t) => t >= -1e-9 && t <= T + 1e-9 && p(t) >= -1e-9);
  const top = Math.max(h0, h1, h(v / 10 > 0 ? v / 10 : 0), p(T + 0.5), 5);
  return {
    problem: R`A ball is thrown upward: \(h(t) = ${poly([-5, v, h0], 't')}\) metres after \(t\) seconds. A platform starts at ${txt(h1)} m and moves at ${txt(s)} m/s: \(p(t) = ${linear(s, h1, 't')}\). When are they at the same height?`,
    steps: [
      R`Set \(h(t) = p(t)\) and collect terms: \(${poly([5, B, C], 't')} = 0\).`,
      ts.length ? R`Quadratic formula: \(t = ${ts.map((t) => num(round(t, 2))).join(R`\) or \(t = `)}\)${ts.every((t) => near(t * 100, Math.round(t * 100), 1e-6)) ? '' : ' (rounded)'}.` : R`The discriminant is \(${num(D)}\), which is negative, so the heights are never equal.`,
      ...ts.map((t) => `t = ${txt(round(t, 2))} s is ${judge(t)}.`),
      `The ball lands after about ${txt(round(T, 2))} s, so only times from 0 to that make sense.`,
    ],
    answer: good.length ? good.map((t) => `t ${near(t, round(t, 2)) ? '=' : '≈'} ${txt(round(t, 2))} s`).join(' and ') : 'They are never at the same height while the ball is in the air.',
    visual: {
      type: 'plot', x: [0, Math.ceil(T + 0.5)], y: [0, Math.ceil(top / 5) * 5 + 5], axisLabels: ['t', 'height'],
      fns: [{ f: h, domain: [0, T], label: 'ball' }, { f: p, color: 'b', label: 'platform' }],
      points: good.map((t) => ({ x: t, y: p(t) })),
      alt: `Height of the ball, a downward-opening parabola from ${txt(h0)} m that reaches the ground at about ${txt(round(T, 2))} s, and the platform's straight line starting at ${txt(h1)} m. ${good.length ? `They meet at ${good.map((t) => `t ≈ ${txt(round(t, 2))} s`).join(' and ')}.` : 'They do not meet while the ball is in the air.'}`,
    },
  };
}

export default {
  id: 'nonlinear-systems',
  title: 'Nonlinear Systems & Solving by Graphing',
  summary: 'Solve systems with lines, parabolas and circles, read solutions of f(x) = g(x) from graphs and tables, and judge them in context.',
  standards: ['CCSS A-REI.C.7', 'CCSS A-REI.D.11', 'CCSS A-CED.A.3'],

  explain: {
    intro: 'A system becomes nonlinear when one of its graphs is a curve: a parabola, a circle, an exponential. The solutions are still the points the graphs share, but now there can be zero, one, two or more of them. Substitution turns the system into one equation in one variable, usually a quadratic, and the discriminant tells how many solutions to expect before solving.',
    rules: [
      {
        title: 'A solution lies on both graphs',
        text: 'A solution of a system is an ordered pair that makes every equation true, so it is a point where the graphs meet. A line and a parabola, or a line and a circle, can meet 0, 1 or 2 times. Check a solution by substituting it into each equation.',
        example: R`\((3, 4)\) solves \(x^{2} + y^{2} = 25\) and \(y = x + 1\): \(9 + 16 = 25\) and \(3 + 1 = 4\).`,
      },
      {
        title: 'Line and parabola: substitute, then count with the discriminant',
        text: R`Set the two expressions for \(y\) equal, move everything to one side and solve the quadratic. Then find \(y\) from the line. Before solving, \(b^{2} - 4ac\) gives the number of solutions: positive means two, 0 means one (the line is tangent), negative means none.`,
        example: R`\(y = x^{2}\) and \(y = 2x + 3\): \(x^{2} - 2x - 3 = 0\), so \((x - 3)(x + 1) = 0\), giving \((3, 9)\) and \((-1, 1)\).`,
      },
      {
        title: 'Line and circle',
        text: R`Substitute the line's expression for \(y\) into the circle's equation \(x^{2} + y^{2} = r^{2}\). Expand the square carefully, collect terms and solve the quadratic. The discriminant again says whether the line cuts the circle, touches it or misses it.`,
        example: R`\(x^{2} + y^{2} = 25\) and \(y = x + 1\): \(2x^{2} + 2x - 24 = 0\), so \(x^{2} + x - 12 = 0\) and \(x = 3\) or \(x = -4\).`,
      },
      {
        title: 'Two curves',
        text: R`For two parabolas, set the expressions equal and subtract. If the \(x^{2}\)-terms cancel, the equation is linear and there is one solution; otherwise solve the quadratic. For a circle and a parabola, substitute \(x^{2}\) from one equation into the other.`,
        example: R`\(y = x^{2} + 1\) and \(y = 3 - x^{2}\): \(2x^{2} = 2\), so \(x = \pm 1\) and the points are \((-1, 2)\) and \((1, 2)\).`,
      },
      {
        title: 'Solving f(x) = g(x) with graphs and tables',
        text: R`Graph \(y = f(x)\) and \(y = g(x)\). The solutions of \(f(x) = g(x)\) are the \(x\)-coordinates of the intersection points, because the equation has only the variable \(x\). Where a graph is hard to read, use a table: a solution lies between two \(x\)-values where \(f(x) - g(x)\) changes sign. Smaller steps in the table give a closer estimate.`,
        example: R`\(2^{x}\) and \(x + 2\) meet at \((2, 4)\) and near \((-1.69, 0.31)\), so \(2^{x} = x + 2\) has the solutions \(x = 2\) and \(x \approx -1.69\).`,
      },
      {
        title: 'Solutions in context',
        text: 'When the equations model a situation, an intersection answers "when are the two quantities equal?". Keep only the viable solutions: those that fit the constraints of the situation, such as a time that is not negative, an object still in the air, or an amount within a limit.',
        example: R`A ball and a platform are at the same height when \(t = -1\) or \(t = 3\). Only \(t = 3\) seconds is viable, since the ball is thrown at \(t = 0\).`,
      },
    ],
    vocab: [
      { term: 'nonlinear system', def: 'A system of equations in which at least one equation is not linear.' },
      { term: 'substitution', def: 'Replacing a variable with an equal expression from another equation, so that one variable is left.' },
      { term: 'discriminant', def: R`For \(ax^{2} + bx + c = 0\), the number \(b^{2} - 4ac\). It tells how many real solutions there are.` },
      { term: 'tangent', def: 'A line that touches a curve at exactly one point without crossing it there.' },
      { term: 'viable solution', def: 'A solution of the equations that also makes sense in the situation being modelled.' },
    ],
    mistakes: [
      R`Giving the intersection point as the solution of \(f(x) = g(x)\). An equation in \(x\) alone has values of \(x\) as its solutions.`,
      R`Stopping after finding \(x\). A solution of a system is an ordered pair, so find each \(y\) too.`,
      R`Squaring a binomial wrongly in a circle problem: \((x + 1)^{2} = x^{2} + 2x + 1\), not \(x^{2} + 1\).`,
      'Keeping every algebraic solution in a story. A negative time or an amount beyond a limit does not fit the situation.',
    ],
    visual: {
      type: 'plot', x: [-7, 7], y: [-7, 7], step: [1, 1], square: true,
      fns: [{ f: (x) => x + 1, color: 'b', label: 'y = x + 1' }],
      param: [circle(5, 'a')],
      points: [{ x: 3, y: 4, label: '(3, 4)' }, { x: -4, y: -3, label: '(−4, −3)' }],
      alt: 'The circle x² + y² = 25, centred at the origin with radius 5, and the line y = x + 1. They meet at two points, (3, 4) and (−4, −3).',
    },
  },

  examples: [
    {
      title: 'A line and a parabola',
      problem: R`Solve the system \(y = x^{2} - 2x - 3\) and \(y = x + 1\).`,
      steps: [
        R`Set the expressions equal: \(x^{2} - 2x - 3 = x + 1\).`,
        R`Collect terms: \(x^{2} - 3x - 4 = 0\). The discriminant is \(9 + 16 = 25 > 0\), so expect two solutions.`,
        R`Factor: \((x - 4)(x + 1) = 0\), so \(x = 4\) or \(x = -1\).`,
        R`From the line: \(y = 5\) and \(y = 0\). Check \((4, 5)\) in the parabola: \(16 - 8 - 3 = 5\). ✓`,
      ],
      answer: R`\((-1, 0)\) and \((4, 5)\)`,
      visual: {
        type: 'plot', x: [-4, 6], y: [-5, 9], step: [1, 1],
        fns: [{ f: (x) => x * x - 2 * x - 3, label: 'y = x² − 2x − 3', labelAt: -2.3 }, { f: (x) => x + 1, color: 'b', label: 'y = x + 1', labelAt: 1.5 }],
        points: [{ x: -1, y: 0, label: '(−1, 0)' }, { x: 4, y: 5, label: '(4, 5)' }],
        alt: 'The parabola y = x² − 2x − 3 and the line y = x + 1 cross at (−1, 0) and (4, 5).',
      },
    },
    {
      title: 'A line and a circle',
      problem: R`Solve the system \(x^{2} + y^{2} = 25\) and \(y = x + 1\).`,
      steps: [
        R`Substitute: \(x^{2} + (x + 1)^{2} = 25\), so \(x^{2} + x^{2} + 2x + 1 = 25\).`,
        R`Collect: \(2x^{2} + 2x - 24 = 0\). Divide by 2: \(x^{2} + x - 12 = 0\).`,
        R`Factor: \((x + 4)(x - 3) = 0\), so \(x = -4\) or \(x = 3\). From the line, \(y = -3\) or \(y = 4\).`,
      ],
      answer: R`\((-4, -3)\) and \((3, 4)\)`,
    },
    {
      title: 'Solving 2ˣ = x + 2 with a graph and a table',
      problem: R`Find the solutions of \(2^{x} = x + 2\).`,
      steps: [
        R`Graph \(y = 2^{x}\) and \(y = x + 2\). They cross at \((2, 4)\) and at one point with \(x\) between \(-2\) and \(-1\).`,
        R`\(x = 2\) is exact: \(2^{2} = 4 = 2 + 2\).`,
        R`For the other, use a table. At \(x = -1.7\): \(2^{-1.7} \approx 0.31 > 0.3\). At \(x = -1.6\): \(2^{-1.6} \approx 0.33 < 0.4\). The order switches, so the solution is between \(-1.7\) and \(-1.6\).`,
      ],
      answer: R`\(x = 2\) and \(x \approx -1.7\) (between \(-1.7\) and \(-1.6\))`,
      visual: {
        type: 'plot', x: [-4, 4], y: [-2, 8], step: [1, 1],
        fns: [{ f: (x) => 2 ** x, label: 'y = 2ˣ' }, { f: (x) => x + 2, color: 'b', label: 'y = x + 2' }],
        points: [{ x: 2, y: 4 }, { x: -1.69, y: 2 ** -1.69 }],
        alt: 'The curve y = 2ˣ and the line y = x + 2 cross at (2, 4) and at a point near (−1.69, 0.31).',
      },
    },
    {
      title: 'Word problem: a ball and an elevator',
      word: true,
      problem: R`A ball is thrown upward from a cliff. Its height in metres after \(t\) seconds is \(h(t) = -5t^{2} + 15t + 30\). A glass elevator nearby is at 15 m and rising at 5 m/s, so its height is \(e(t) = 15 + 5t\). When are the ball and the elevator at the same height?`,
      steps: [
        R`Set the heights equal: \(-5t^{2} + 15t + 30 = 15 + 5t\), so \(-5t^{2} + 10t + 15 = 0\).`,
        R`Divide by \(-5\): \(t^{2} - 2t - 3 = 0\), so \((t - 3)(t + 1) = 0\) and \(t = 3\) or \(t = -1\).`,
        R`\(t = -1\) is before the throw, so it is not viable. At \(t = 3\): \(h(3) = -45 + 45 + 30 = 30\) and \(e(3) = 30\). ✓`,
      ],
      answer: 'After 3 seconds, at a height of 30 m',
    },
  ],

  models: [
    {
      id: 'line-and-curve',
      title: 'A line with a parabola or a circle',
      intro: R`Choose the curve \(y = x^{2} + p\) or \(x^{2} + y^{2} = p^{2}\), and the line \(y = mx + k\). Watch the discriminant and the crossing points change.`,
      inputs: [
        { name: 'shape', label: 'Curve', type: 'select', value: 'parabola', options: [{ value: 'parabola', label: 'parabola y = x² + p' }, { value: 'circle', label: 'circle x² + y² = p²' }] },
        { name: 'p', label: 'p', type: 'number', min: -6, max: 8, step: 0.5, value: -3 },
        { name: 'm', label: 'Slope m', type: 'number', min: -4, max: 4, step: 0.5, value: 1 },
        { name: 'k', label: 'Intercept k', type: 'number', min: -8, max: 8, step: 0.5, value: 1 },
      ],
      compute: lineCurveModel,
    },
    {
      id: 'ball-platform',
      title: 'Word problem: a ball and a moving platform',
      word: true,
      intro: 'Set how the ball is thrown and how the platform moves. Only meeting times while the ball is in the air are viable.',
      inputs: [
        { name: 'v', label: 'Ball: upward speed (m/s)', type: 'int', min: 0, max: 30, value: 15 },
        { name: 'h0', label: 'Ball: starting height (m)', type: 'int', min: 0, max: 60, value: 30 },
        { name: 'h1', label: 'Platform: starting height (m)', type: 'int', min: 0, max: 60, value: 15 },
        { name: 's', label: 'Platform: speed, up is positive (m/s)', type: 'int', min: -5, max: 10, value: 5 },
      ],
      compute: ballModel,
    },
  ],

  quiz: {
    easy: [easyFromGraph, easyWhichPoint, easyTableInterval],
    medium: [mediumLineParabola, mediumHowMany, mediumParabolas],
    hard: [hardLineCircle, hardContext, hardTableTenths],
    challenge: [challengeTangentK, challengeAbsLine, challengeCircleParabola],
  },
};
