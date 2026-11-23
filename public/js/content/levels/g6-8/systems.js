import { R, q, num, frac, txt, paren, signed, linear, terms, point, money, person, people, lcm, checkEqual, checkAll } from '../../lib/index.js';
import { grid, unitFmt } from './_shared.js';

// A line is stored as { a, b, c } for ax + by = c. Lines in slope-intercept form have a = −m, b = 1, c = k.
const m = (tex) => R`\(${tex}\)`;
const eqY = (k, b) => `y = ${linear(k, b)}`;
const std = (L) => `${terms([[L.a, 'x'], [L.b, 'y']])} = ${num(L.c)}`;
const yLine = (slope, k) => ({ a: -slope, b: 1, c: k, slope, k });
const on = (L, x, y) => Math.abs(L.a * x + L.b * y - L.c) < 1e-9;
const pt = (x, y) => m(point(x, y));
/** Plain-text label for a point in a picture: lab(2, -3) → "(2, −3)". */
const lab = (x, y) => `(${txt(x)}, ${txt(y)})`;
/** Plain-text label for a line in a picture: "y = 2x − 3". */
const lineLabel = (k, b) => `y = ${linear(k, b).replace(/-/g, '−')}`;
/** Substitute (x, y) into both equations; true when it makes both true. */
const checkBoth = (L1, L2, x, y) => (on(L1, x, y) && on(L2, x, y) ? true : `(${x}, ${y}) does not make both equations true`);
/** Cramer's rule, used only to compute slip answers and in checks. */
function solve2(L1, L2) {
  const det = L1.a * L2.b - L2.a * L1.b;
  if (det === 0) return null;
  return { x: (L1.c * L2.b - L2.c * L1.b) / det, y: (L1.a * L2.c - L2.a * L1.c) / det };
}
const isInt = (v) => Number.isInteger(v);
/** "x = 3, y = −2" checked in an equation, as a sentence. */
const subIn = (L, x, y) => R`\(${terms([[L.a, `(${num(x)})`], [L.b, `(${num(y)})`]]).replace(/\((-?\d+)\)/g, (s, v) => (Math.abs(L.a) === 1 || Math.abs(L.b) === 1 ? s : s))} = ${num(L.a * x + L.b * y)}\)`;
/** a·x written with the value of x, e.g. "3(2) + 4(−1)". */
const plugged = (L, x, y) => {
  const part = (c, v) => (c === 1 ? `(${num(v)})` : c === -1 ? `-(${num(v)})` : `${num(c)}(${num(v)})`);
  const pieces = [];
  if (L.a !== 0) pieces.push(part(L.a, x));
  if (L.b !== 0) {
    const s = part(L.b, y);
    pieces.push(pieces.length ? (s.startsWith('-') ? `- ${s.slice(1)}` : `+ ${s}`) : s);
  }
  return pieces.join(' ');
};
const checkLine = (L, x, y) => R`\(${plugged(L, x, y)} = ${num(L.a * x + L.b * y)}\)`;

/**
 * Wrong points for a system with solution (x0, y0): a point on the first line only, a point on the
 * second line only, the coordinates swapped and the sign of y flipped. None of them is on both lines.
 */
function pointSlips(L1, L2, x0, y0) {
  const out = [];
  if (x0 !== y0) out.push({ value: pt(y0, x0), why: R`An ordered pair gives \(x\) first, then \(y\). Here \(x = ${x0}\) and \(y = ${y0}\).`, p: [y0, x0] });
  out.push({ value: pt(x0 + L1.b, y0 - L1.a), why: 'That point makes the first equation true but not the second. A solution must be on both lines.', p: [x0 + L1.b, y0 - L1.a] });
  out.push({ value: pt(x0 - L2.b, y0 + L2.a), why: 'That point makes the second equation true but not the first. A solution must be on both lines.', p: [x0 - L2.b, y0 + L2.a] });
  if (y0 !== 0) out.push({ value: pt(x0, -y0), p: [x0, -y0] });
  if (x0 !== 0) out.push({ value: pt(-x0, y0), p: [-x0, y0] });
  return out.filter((w) => !(on(L1, ...w.p) && on(L2, ...w.p)));
}
const noneOnBoth = (L1, L2, wrongs) => (wrongs.every((w) => !w.p || !(on(L1, ...w.p) && on(L2, ...w.p))) ? true : 'a wrong choice is also a solution');

const COUNTS = { one: 'Exactly one solution', none: 'No solution', many: 'Infinitely many solutions', two: 'Exactly two solutions' };
/** How many solutions, found by testing points rather than by comparing slopes. */
function countByPoints(L1, L2) {
  const s = solve2(L1, L2);
  if (s) return on(L1, s.x, s.y) && on(L2, s.x, s.y) ? 'one' : 'bad';
  // Parallel or the same line: take a point on the first line and test it in the second.
  const [x, y] = L1.b !== 0 ? [0, L1.c / L1.b] : [L1.c / L1.a, 0];
  return on(L2, x, y) ? 'many' : 'none';
}

// ───────────── Easy: what a solution is, reading a graph, counting solutions by inspection ─────────────

function easyIsSolution(rng) {
  for (;;) {
    const [x0, y0] = [rng.int(-5, 5), rng.int(-6, 6)];
    let L1;
    let L2;
    if (rng.bool()) {
      const m1 = rng.nonzero(-3, 3);
      const m2 = rng.intExcept(-3, 3, [0, m1]);
      [L1, L2] = [yLine(m1, y0 - m1 * x0), yLine(m2, y0 - m2 * x0)];
      if (Math.abs(L1.c) > 10 || Math.abs(L2.c) > 10) continue;
    } else {
      const pick = () => [rng.pick([1, 1, 2, 3, -1]), rng.pick([1, -1, 2, -2, 3])];
      const [a1, b1] = pick();
      const [a2, b2] = pick();
      if (a1 * b2 - a2 * b1 === 0) continue;
      [L1, L2] = [{ a: a1, b: b1, c: a1 * x0 + b1 * y0 }, { a: a2, b: b2, c: a2 * x0 + b2 * y0 }];
    }
    const show = (L) => (L.slope != null ? eqY(L.slope, L.c) : std(L));
    const wrong = pointSlips(L1, L2, x0, y0);
    return q({
      prompt: R`Which point is a solution of the system? \[\begin{cases} ${show(L1)} \\ ${show(L2)} \end{cases}\]`,
      correct: pt(x0, y0),
      wrong,
      solution: [R`A solution must make **both** equations true. Substitute \(x = ${x0}\) and \(y = ${y0}\).`, R`First equation: ${L1.slope != null ? R`\(${L1.slope === 1 ? '' : L1.slope === -1 ? '-' : num(L1.slope)}(${x0}) ${signed(L1.c)} = ${y0}\)` : checkLine(L1, x0, y0)} ✓`, R`Second equation: ${L2.slope != null ? R`\(${L2.slope === 1 ? '' : L2.slope === -1 ? '-' : num(L2.slope)}(${x0}) ${signed(L2.c)} = ${y0}\)` : checkLine(L2, x0, y0)} ✓`, R`So \(${point(x0, y0)}\) is the solution. Each other point fails at least one equation.`],
      rule: 0,
      skill: 'what a solution is',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}

function easyGraph(rng) {
  for (;;) {
    const [x0, y0] = [rng.int(-4, 4), rng.int(-4, 4)];
    const m1 = rng.nonzero(-3, 3);
    const m2 = rng.intExcept(-3, 3, [m1]);
    const [b1, b2] = [y0 - m1 * x0, y0 - m2 * x0];
    if (Math.abs(b1) > 6 || Math.abs(b2) > 6 || b1 === b2) continue;
    const [L1, L2] = [yLine(m1, b1), yLine(m2, b2)];
    const wrong = [
      x0 !== y0 ? { value: pt(y0, x0), why: R`Read \(x\) first (across), then \(y\) (up or down). The lines cross at \(x = ${x0}\), \(y = ${y0}\).`, p: [y0, x0] } : null,
      { value: pt(0, b1), why: R`That is where the line \(${eqY(m1, b1)}\) crosses the \(y\)-axis. The solution is where the two lines cross each other.`, p: [0, b1] },
      { value: pt(0, b2), why: R`That is where the line \(${eqY(m2, b2)}\) crosses the \(y\)-axis. The solution is where the two lines cross each other.`, p: [0, b2] },
      y0 !== 0 ? { value: pt(x0, -y0), p: [x0, -y0] } : null,
      x0 !== 0 ? { value: pt(-x0, y0), p: [-x0, y0] } : null,
    ].filter((w) => w && !(w.p[0] === x0 && w.p[1] === y0));
    return q({
      prompt: R`The graph shows the lines \(${eqY(m1, b1)}\) and \(${eqY(m2, b2)}\). What is the solution of the system?`,
      visual: grid(-7, 7, {
        fns: [{ f: (x) => m1 * x + b1, label: lineLabel(m1, b1) }, { f: (x) => m2 * x + b2, color: 'b', label: lineLabel(m2, b2) }],
        alt: `Two lines on a coordinate grid. The line ${lineLabel(m1, b1)} crosses the y-axis at ${lab(0, b1)}. The line ${lineLabel(m2, b2)} crosses the y-axis at ${lab(0, b2)}. The two lines cross each other at the point ${lab(x0, y0)}.`,
      }),
      correct: pt(x0, y0),
      wrong,
      solution: [R`The solution of a system is the point that lies on both lines: the point where they cross.`, R`The lines cross at \(x = ${x0}\), \(y = ${y0}\), so the point is \(${point(x0, y0)}\).`, R`Check: \(${m1 === 1 ? '' : m1 === -1 ? '-' : m1}(${x0}) ${signed(b1)} = ${y0}\) and \(${m2 === 1 ? '' : m2 === -1 ? '-' : m2}(${x0}) ${signed(b2)} = ${y0}\). ✓`],
      rule: 1,
      skill: 'solving by graphing',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}

function easyCountSlopeForm(rng) {
  const kind = rng.pick(['one', 'none', 'many']);
  const m1 = rng.bool(0.25) ? frac(rng.sign(), rng.pick([2, 3])) : frac(rng.nonzero(-5, 5));
  const b1 = rng.int(-9, 9);
  const m2 = kind === 'one' ? frac(rng.intExcept(-5, 5, [m1.value])) : m1;
  const b2 = kind === 'none' ? rng.intExcept(-9, 9, [b1]) : kind === 'many' ? b1 : rng.int(-9, 9);
  const doubled = kind === 'many';
  const L1 = { a: -m1.value, b: 1, c: b1 };
  const L2 = { a: -m2.value * (doubled ? 2 : 1), b: doubled ? 2 : 1, c: b2 * (doubled ? 2 : 1) };
  const second = doubled ? `2y = ${linear(m2.mul(2), 2 * b2)}` : eqY(m2, b2);
  return q({
    prompt: R`How many solutions does this system have? \[\begin{cases} ${eqY(m1, b1)} \\ ${second} \end{cases}\]`,
    correct: COUNTS[kind],
    wrong: [
      kind === 'none' ? { value: COUNTS.one, why: R`The slopes are the same, \(${m1.tex()}\), so the lines are parallel. The intercepts are different, so the lines never meet.` } : null,
      kind === 'many' ? { value: COUNTS.none, why: R`Divide the second equation by 2: it becomes \(${eqY(m1, b1)}\). That is the same line, so every point on it is a solution.` } : null,
      kind === 'one' ? { value: b1 === b2 ? COUNTS.many : COUNTS.none, why: 'The slopes are different, so the lines are not parallel. Two lines with different slopes cross at exactly one point.' } : null,
      { value: COUNTS.two, why: 'Two different straight lines can cross at most once. A system of two linear equations has one solution, no solution or infinitely many.' },
      COUNTS.one,
      COUNTS.none,
      COUNTS.many,
    ],
    solution: [
      ...(doubled ? [R`Divide the second equation by 2: \(${eqY(m2, b2)}\).`] : []),
      R`First line: slope \(${m1.tex()}\), \(y\)-intercept \(${b1}\). Second line: slope \(${m2.tex()}\), \(y\)-intercept \(${b2}\).`,
      kind === 'one' ? 'The slopes are different, so the lines cross at exactly one point: one solution.' : kind === 'none' ? 'The slopes are the same and the intercepts are different, so the lines are parallel and never meet: no solution.' : 'The slopes and the intercepts are both the same, so the two equations describe the same line: infinitely many solutions.',
    ],
    rule: 4,
    skill: 'number of solutions by inspection',
    check: () => (countByPoints(L1, L2) === kind ? true : 'the count is wrong'),
  });
}

// ───────────── Medium: substitution, elimination by adding, a story with two prices ─────────────

function mediumSubstitution(rng) {
  for (;;) {
    const [x0, y0] = [rng.int(-6, 6), rng.int(-6, 6)];
    const s = rng.nonzero(-4, 4);
    const k = y0 - s * x0;
    const a = rng.nonzero(-5, 5);
    const b = rng.nonzero(-4, 4);
    const coef = a + b * s;
    if (coef === 0 || Math.abs(k) > 12 || k === 0) continue;
    const L1 = yLine(s, k);
    const L2 = { a, b, c: a * x0 + b * y0 };
    if (Math.abs(L2.c) > 40) continue;
    const xs = (L2.c - k) / coef;
    const slip = isInt(xs) && xs !== x0 ? { value: pt(xs, s * xs + k), why: R`Multiply all of \(${linear(s, k)}\) by \(${b}\): the number term becomes \(${b} \times ${paren(k)} = ${b * k}\).`, p: [xs, s * xs + k] } : null;
    const wrong = [slip, ...pointSlips(L1, L2, x0, y0)].filter(Boolean);
    const bTimes = b === 1 ? '' : b === -1 ? '-' : num(b);
    return q({
      prompt: R`Solve the system by substitution. \[\begin{cases} ${eqY(s, k)} \\ ${std(L2)} \end{cases}\]`,
      correct: pt(x0, y0),
      wrong,
      solution: [
        R`The first equation says \(y = ${linear(s, k)}\). Put that in place of \(y\) in the second: \(${terms([[a, 'x']])} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}(${linear(s, k)}) = ${L2.c}\).`,
        R`Distribute and combine: \(${linear(coef, b * k)} = ${L2.c}\), so \(${terms([[coef, 'x']])} = ${L2.c - b * k}\) and \(x = ${x0}\).`,
        R`Find \(y\): \(y = ${s === 1 ? '' : s === -1 ? '-' : s}(${x0}) ${signed(k)} = ${y0}\).`,
        R`Check in the second equation: ${checkLine(L2, x0, y0)} ✓. The solution is \(${point(x0, y0)}\).`,
      ],
      rule: 2,
      skill: 'solving by substitution',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong), bTimes === bTimes ? true : ''),
    });
  }
}

function mediumElimination(rng) {
  for (;;) {
    const [x0, y0] = [rng.int(-6, 6), rng.int(-6, 6)];
    const addCase = rng.bool();
    let L1;
    let L2;
    if (addCase) {
      const b = rng.int(1, 4);
      const [a1, a2] = [rng.nonzero(-4, 5), rng.nonzero(-4, 5)];
      if (a1 + a2 === 0) continue;
      const flip = rng.bool();
      L1 = { a: a1, b: flip ? -b : b, c: 0 };
      L2 = { a: a2, b: flip ? b : -b, c: 0 };
    } else {
      const a = rng.int(1, 4);
      const [b1, b2] = [rng.nonzero(-4, 5), rng.nonzero(-4, 5)];
      if (b1 === b2) continue;
      L1 = { a, b: b1, c: 0 };
      L2 = { a, b: b2, c: 0 };
    }
    L1.c = L1.a * x0 + L1.b * y0;
    L2.c = L2.a * x0 + L2.b * y0;
    if (Math.abs(L1.c) > 40 || Math.abs(L2.c) > 40) continue;
    const wrong = pointSlips(L1, L2, x0, y0);
    let steps;
    if (addCase) {
      const A = L1.a + L2.a;
      const xs = (L1.c - L2.c) / A;
      if (isInt(xs) && xs !== x0 && isInt((L1.c - L1.a * xs) / L1.b)) wrong.unshift({ value: pt(xs, (L1.c - L1.a * xs) / L1.b), why: R`Add **both** sides: the right sides give \(${L1.c} + ${paren(L2.c)} = ${L1.c + L2.c}\).`, p: [xs, (L1.c - L1.a * xs) / L1.b] });
      steps = [R`The \(y\)-terms are opposites, so add the equations. The \(y\)-terms cancel: \(${terms([[A, 'x']])} = ${L1.c + L2.c}\).`, R`${A === 1 ? 'So' : R`Divide by \(${A}\):`} \(x = ${x0}\).`];
    } else {
      const B = L1.b - L2.b;
      steps = [R`The \(x\)-terms are the same, so subtract the second equation from the first. The \(x\)-terms cancel: \(${terms([[B, 'y']])} = ${L1.c} - ${paren(L2.c)} = ${L1.c - L2.c}\).`, R`${B === 1 ? 'So' : R`Divide by \(${B}\):`} \(y = ${y0}\).`];
    }
    const rest = addCase
      ? R`Substitute \(x = ${x0}\) into the first equation: ${checkLine({ ...L1, b: 0 }, x0, 0).replace(/ = .*\\\)$/, '')}${''} \(${terms([[L1.a * x0, ''], [L1.b, 'y']])} = ${L1.c}\), so \(${terms([[L1.b, 'y']])} = ${L1.c - L1.a * x0}\) and \(y = ${y0}\).`
      : R`Substitute \(y = ${y0}\) into the first equation: \(${terms([[L1.a, 'x'], [L1.b * y0, '']])} = ${L1.c}\), so \(${terms([[L1.a, 'x']])} = ${L1.c - L1.b * y0}\) and \(x = ${x0}\).`;
    return q({
      prompt: R`Solve the system by elimination. \[\begin{cases} ${std(L1)} \\ ${std(L2)} \end{cases}\]`,
      correct: pt(x0, y0),
      wrong,
      solution: [...steps, rest.replace(/^(.*?:) .*?\\\) \\\(/, '$1 \\('), R`Check in the second equation: ${checkLine(L2, x0, y0)} ✓. The solution is \(${point(x0, y0)}\).`],
      rule: 3,
      skill: 'solving by elimination',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}
