import { R, q, num, frac, txt, paren, signed, linear, terms, point, money, people, lcm, checkEqual, checkAll } from '../../lib/index.js';
import { grid, unitFmt } from './_shared.js';

// A line is stored as { a, b, c } for ax + by = c. A line y = sx + k is { a: −s, b: 1, c: k, slope: s }.
const m = (tex) => R`\(${tex}\)`;
const eqY = (s, k) => `y = ${linear(s, k)}`;
const std = (L) => `${terms([[L.a, 'x'], [L.b, 'y']])} = ${num(L.c)}`;
const yLine = (s, k) => ({ a: -s, b: 1, c: k, slope: s });
const on = (L, x, y) => Math.abs(L.a * x + L.b * y - L.c) < 1e-9;
const pt = (x, y) => m(point(x, y));
const isInt = (v) => Number.isInteger(v);
/** Plain-text label for a point in a picture: lab(2, -3) → "(2, −3)". */
const lab = (x, y) => `(${txt(x)}, ${txt(y)})`;
/** Plain-text label for a line in a picture: "y = 2x − 3". */
const lineLabel = (s, k) => `y = ${linear(s, k).replace(/-/g, '−')}`;
/** A coefficient times a value: times(3, -2) → "3(-2)", times(1, 4) → "4", times(-1, 4) → "-(4)". */
const times = (c, v) => (c === 1 ? paren(v) : c === -1 ? `-(${num(v)})` : `${num(c)}(${num(v)})`);
/** The left side of ax + by = c with the numbers put in, then its value: "3(2) + 4(-1) = 2". */
function plugged(L, x, y) {
  const pieces = [];
  if (L.a !== 0) pieces.push(times(L.a, x));
  if (L.b !== 0) {
    const s = times(L.b, y);
    pieces.push(pieces.length ? (s.startsWith('-') ? `- ${s.slice(1)}` : `+ ${s}`) : s);
  }
  return R`\(${pieces.join(' ')} = ${num(L.a * x + L.b * y)}\)`;
}
/** s(x) + k with the number put in: "2(3) + 1 = 7". */
const pluggedY = (s, k, x) => R`\(${s === 1 && !k ? `(${num(x)})` : times(s, x)}${k ? ` ${signed(k)}` : ''} = ${num(s * x + k)}\)`;
/** Substitute (x, y) into both equations; true when it makes both true. */
const checkBoth = (L1, L2, x, y) => (on(L1, x, y) && on(L2, x, y) ? true : `(${x}, ${y}) does not make both equations true`);
/** Cramer's rule, used only for slip answers and checks. */
function solve2(L1, L2) {
  const det = L1.a * L2.b - L2.a * L1.b;
  if (det === 0) return null;
  return { x: (L1.c * L2.b - L2.c * L1.b) / det, y: (L1.a * L2.c - L2.a * L1.c) / det };
}

/**
 * Wrong points for a system with solution (x0, y0): the coordinates swapped, a point on the first line
 * only, a point on the second line only, and a sign flipped. None of them is on both lines.
 */
function pointSlips(L1, L2, x0, y0) {
  const out = [];
  if (x0 !== y0) out.push({ value: pt(y0, x0), why: R`An ordered pair gives \(x\) first, then \(y\). Here \(x = ${x0}\) and \(y = ${y0}\).`, p: [y0, x0] });
  out.push({ value: pt(x0 + L1.b, y0 - L1.a), why: 'That point makes the first equation true but not the second. A solution must be on both lines.', p: [x0 + L1.b, y0 - L1.a] });
  out.push({ value: pt(x0 - L2.b, y0 + L2.a), why: 'That point makes the second equation true but not the first. A solution must be on both lines.', p: [x0 - L2.b, y0 + L2.a] });
  if (y0 !== 0) out.push({ value: pt(x0, -y0), p: [x0, -y0] });
  if (x0 !== 0) out.push({ value: pt(-x0, y0), p: [-x0, y0] });
  out.push({ value: pt(x0 - L1.b, y0 + L1.a), p: [x0 - L1.b, y0 + L1.a] });
  return out.filter((w) => !(on(L1, ...w.p) && on(L2, ...w.p)));
}
const noneOnBoth = (L1, L2, wrongs) => (wrongs.every((w) => !w?.p || !(on(L1, ...w.p) && on(L2, ...w.p))) ? true : 'a wrong choice is also a solution');

const COUNTS = { one: 'Exactly one solution', none: 'No solution', many: 'Infinitely many solutions', two: 'Exactly two solutions' };
/** How many solutions, found by testing points rather than by comparing slopes. */
function countByPoints(L1, L2) {
  const s = solve2(L1, L2);
  if (s) return on(L1, s.x, s.y) && on(L2, s.x, s.y) ? 'one' : 'bad';
  const [x, y] = L1.b !== 0 ? [0, L1.c / L1.b] : [L1.c / L1.a, 0];
  return on(L2, x, y) ? 'many' : 'none';
}
function countWrongs(kind, noneWhy, manyWhy, oneWhy) {
  return [
    kind === 'none' ? { value: COUNTS.one, why: noneWhy } : null,
    kind === 'many' ? { value: COUNTS.none, why: manyWhy } : null,
    kind === 'one' ? { value: COUNTS.none, why: oneWhy } : null,
    { value: COUNTS.two, why: 'Two different straight lines cross at most once. A system of two linear equations has one solution, no solution or infinitely many.' },
    COUNTS.one,
    COUNTS.none,
    COUNTS.many,
  ];
}

/**
 * Steps that solve a1x + b1y = c1, a2x + b2y = c2 by elimination, multiplying first when needed.
 * Eliminates whichever variable needs the smaller multipliers. Variable names can be changed for stories.
 */
function elimSteps(L1, L2, [vx, vy] = ['x', 'y']) {
  const matchX = Math.abs(L1.a) === Math.abs(L2.a);
  const matchY = Math.abs(L1.b) === Math.abs(L2.b);
  const byY = matchY || (!matchX && lcm(Math.abs(L1.b), Math.abs(L2.b)) <= lcm(Math.abs(L1.a), Math.abs(L2.a)));
  const [p1, p2] = byY ? [L1.b, L2.b] : [L1.a, L2.a];
  const L = lcm(Math.abs(p1), Math.abs(p2));
  const [k1, k2] = [L / Math.abs(p1), L / Math.abs(p2)];
  const E1 = { a: k1 * L1.a, b: k1 * L1.b, c: k1 * L1.c };
  const E2 = { a: k2 * L2.a, b: k2 * L2.b, c: k2 * L2.c };
  const add = Math.sign(p1) !== Math.sign(p2);
  const sgn = add ? 1 : -1;
  const R1 = { a: E1.a + sgn * E2.a, b: E1.b + sgn * E2.b, c: E1.c + sgn * E2.c };
  const show = (E) => `${terms([[E.a, vx], [E.b, vy]])} = ${num(E.c)}`;
  const steps = [];
  const gone = byY ? vy : vx;
  if (k1 !== 1 || k2 !== 1) {
    const say = (k, E, which) => (k === 1 ? `keep the ${which} equation as it is, \\(${show(E)}\\)` : `multiply the ${which} equation by \\(${k}\\): \\(${show(E)}\\)`);
    steps.push(R`To make the \(${gone}\)-terms cancel, ${say(k1, E1, 'first')}, and ${say(k2, E2, 'second')}.`);
  }
  const [cf, rest, keep] = byY ? [R1.a, R1.c, vx] : [R1.b, R1.c, vy];
  steps.push(R`The \(${gone}\)-terms are \(${terms([[byY ? E1.b : E1.a, gone]])}\) and \(${terms([[byY ? E2.b : E2.a, gone]])}\), so ${add ? 'add' : 'subtract'} the equations: \(${terms([[cf, keep]])} = ${num(rest)}\).`);
  const val = rest / cf;
  if (cf !== 1) steps.push(R`Divide both sides by \(${cf}\): \(${keep} = ${num(val)}\).`);
  // Back-substitute into the first equation.
  const [coefKnown, coefOther] = byY ? [L1.a, L1.b] : [L1.b, L1.a];
  const other = (L1.c - coefKnown * val) / coefOther;
  const withVal = byY ? terms([[L1.a * val, ''], [L1.b, vy]]) : terms([[L1.a, vx], [L1.b * val, '']]);
  const otherName = byY ? vy : vx;
  steps.push(R`Substitute \(${keep} = ${num(val)}\) into the first equation: \(${withVal} = ${num(L1.c)}\), so \(${terms([[coefOther, otherName]])} = ${num(L1.c - coefKnown * val)}\)${coefOther === 1 ? '' : R` and \(${otherName} = ${num(other)}\)`}.`);
  return { steps, x: byY ? val : other, y: byY ? other : val, k1, k2 };
}

// ───────────── Easy: what a solution is, reading a graph, counting solutions by inspection ─────────────

function easyIsSolution(rng) {
  for (;;) {
    const [x0, y0] = [rng.int(-5, 5), rng.int(-6, 6)];
    let L1;
    let L2;
    if (rng.bool()) {
      const s1 = rng.nonzero(-3, 3);
      const s2 = rng.intExcept(-3, 3, [0, s1]);
      [L1, L2] = [yLine(s1, y0 - s1 * x0), yLine(s2, y0 - s2 * x0)];
      if (Math.abs(L1.c) > 10 || Math.abs(L2.c) > 10) continue;
    } else {
      const pick = () => [rng.pick([1, 1, 2, 3, -1]), rng.pick([1, -1, 2, -2, 3])];
      const [a1, b1] = pick();
      const [a2, b2] = pick();
      if (a1 * b2 - a2 * b1 === 0) continue;
      [L1, L2] = [{ a: a1, b: b1, c: a1 * x0 + b1 * y0 }, { a: a2, b: b2, c: a2 * x0 + b2 * y0 }];
    }
    const show = (L) => (L.slope != null ? eqY(L.slope, L.c) : std(L));
    const test = (L) => (L.slope != null ? R`\(y = ${pluggedY(L.slope, L.c, x0).slice(2)}` : plugged(L, x0, y0));
    const wrong = pointSlips(L1, L2, x0, y0);
    return q({
      prompt: R`Which point is a solution of the system? \[\begin{cases} ${show(L1)} \\ ${show(L2)} \end{cases}\]`,
      correct: pt(x0, y0),
      wrong,
      solution: [
        R`A solution must make **both** equations true. Substitute \(x = ${x0}\) and \(y = ${y0}\).`,
        R`First equation: ${test(L1)}${L1.slope != null ? '' : R`, and the right side is \(${L1.c}\)`}. ✓`,
        R`Second equation: ${test(L2)}${L2.slope != null ? '' : R`, and the right side is \(${L2.c}\)`}. ✓`,
        R`So \(${point(x0, y0)}\) is the solution. Each other point fails at least one of the equations.`,
      ],
      rule: 0,
      skill: 'what a solution is',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}

function easyGraph(rng) {
  for (;;) {
    const [x0, y0] = [rng.int(-4, 4), rng.int(-4, 4)];
    const s1 = rng.nonzero(-3, 3);
    const s2 = rng.intExcept(-3, 3, [s1]);
    const [b1, b2] = [y0 - s1 * x0, y0 - s2 * x0];
    if (Math.abs(b1) > 6 || Math.abs(b2) > 6 || b1 === b2) continue;
    const [L1, L2] = [yLine(s1, b1), yLine(s2, b2)];
    const wrong = [
      x0 !== y0 ? { value: pt(y0, x0), why: R`Read \(x\) first (across), then \(y\) (up or down). The lines cross at \(x = ${x0}\) and \(y = ${y0}\).`, p: [y0, x0] } : null,
      { value: pt(0, b1), why: R`That is where the line \(${eqY(s1, b1)}\) crosses the \(y\)-axis. The solution is where the two lines cross each other.`, p: [0, b1] },
      { value: pt(0, b2), why: R`That is where the line \(${eqY(s2, b2)}\) crosses the \(y\)-axis. The solution is where the two lines cross each other.`, p: [0, b2] },
      y0 !== 0 ? { value: pt(x0, -y0), p: [x0, -y0] } : null,
      x0 !== 0 ? { value: pt(-x0, y0), p: [-x0, y0] } : null,
    ].filter((w) => w && !(w.p[0] === x0 && w.p[1] === y0));
    return q({
      prompt: R`The graph shows the lines \(${eqY(s1, b1)}\) and \(${eqY(s2, b2)}\). What is the solution of the system?`,
      visual: grid(-7, 7, {
        fns: [{ f: (x) => s1 * x + b1, label: lineLabel(s1, b1) }, { f: (x) => s2 * x + b2, color: 'b', label: lineLabel(s2, b2) }],
        alt: `Two lines on a coordinate grid. The line ${lineLabel(s1, b1)} crosses the y-axis at ${lab(0, b1)}. The line ${lineLabel(s2, b2)} crosses the y-axis at ${lab(0, b2)}. The two lines cross each other at the point ${lab(x0, y0)}.`,
      }),
      correct: pt(x0, y0),
      wrong,
      solution: [R`The solution of a system is the point on both lines: the point where they cross.`, R`The lines cross at \(x = ${x0}\) and \(y = ${y0}\), so the point is \(${point(x0, y0)}\).`, R`Check: ${pluggedY(s1, b1, x0)} and ${pluggedY(s2, b2, x0)}. Both give \(y = ${y0}\). ✓`],
      rule: 1,
      skill: 'solving by graphing',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}

function easyCountSlopeForm(rng) {
  const kind = rng.pick(['one', 'none', 'many']);
  const s1 = rng.bool(0.25) ? frac(rng.sign(), rng.pick([2, 3])) : frac(rng.nonzero(-5, 5));
  const b1 = rng.int(-9, 9);
  const s2 = kind === 'one' ? frac(rng.intExcept(-5, 5, [s1.value])) : s1;
  const b2 = kind === 'none' ? rng.intExcept(-9, 9, [b1]) : kind === 'many' ? b1 : rng.int(-9, 9);
  const doubled = kind === 'many' || rng.bool(0.3);
  const L1 = { a: -s1.value, b: 1, c: b1 };
  const L2 = { a: -s2.value * (doubled ? 2 : 1), b: doubled ? 2 : 1, c: b2 * (doubled ? 2 : 1) };
  const second = doubled ? `2y = ${linear(s2.mul(2), 2 * b2)}` : eqY(s2, b2);
  return q({
    prompt: R`How many solutions does this system have? \[\begin{cases} ${eqY(s1, b1)} \\ ${second} \end{cases}\]`,
    correct: COUNTS[kind],
    wrong: countWrongs(
      kind,
      R`The slopes are both \(${s1.tex()}\), so the lines are parallel. The \(y\)-intercepts are different, so the lines never meet.`,
      R`Divide the second equation by 2: it becomes \(${eqY(s1, b1)}\). That is the same line, so every point on it is a solution.`,
      'The slopes are different, so the lines are not parallel. Two lines with different slopes cross at exactly one point.',
    ),
    solution: [
      ...(doubled ? [R`Divide the second equation by 2: \(${eqY(s2, b2)}\).`] : []),
      R`First line: slope \(${s1.tex()}\), \(y\)-intercept \(${b1}\). Second line: slope \(${s2.tex()}\), \(y\)-intercept \(${b2}\).`,
      kind === 'one' ? 'The slopes are different, so the lines cross at exactly one point: one solution.' : kind === 'none' ? 'The slopes are the same and the intercepts are different, so the lines are parallel and never meet: no solution.' : 'The slopes are the same and the intercepts are the same, so both equations describe the same line: infinitely many solutions.',
    ],
    rule: 4,
    skill: 'number of solutions by inspection',
    check: () => (countByPoints(L1, L2) === kind ? true : 'the count is wrong'),
  });
}

// ───────────── Medium: substitution, elimination by adding or subtracting, a story with two prices ─────────────

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
    const slip = isInt(xs) && xs !== x0 && b !== 1 ? { value: pt(xs, s * xs + k), why: R`Multiply all of \(${linear(s, k)}\) by \(${b}\): the number term becomes \(${b} \times ${paren(k)} = ${b * k}\).`, p: [xs, s * xs + k] } : null;
    const wrong = [slip, ...pointSlips(L1, L2, x0, y0)].filter(Boolean);
    const bPart = `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}(${linear(s, k)})`;
    return q({
      prompt: R`Solve the system by substitution. \[\begin{cases} ${eqY(s, k)} \\ ${std(L2)} \end{cases}\]`,
      correct: pt(x0, y0),
      wrong,
      solution: [
        R`The first equation says \(y = ${linear(s, k)}\). Put that in place of \(y\) in the second equation: \(${terms([[a, 'x']])} ${bPart} = ${L2.c}\).`,
        R`Distribute and combine like terms: \(${linear(coef, b * k)} = ${L2.c}\), so \(${terms([[coef, 'x']])} = ${L2.c - b * k}\)${coef === 1 ? '' : R` and \(x = ${x0}\)`}.`,
        R`Find \(y\) from the first equation: \(y = ${pluggedY(s, k, x0).slice(2)}.`,
        R`Check in the second equation: ${plugged(L2, x0, y0)} ✓. The solution is \(${point(x0, y0)}\).`,
      ],
      rule: 2,
      skill: 'solving by substitution',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}

function mediumElimination(rng) {
  for (;;) {
    const [x0, y0] = [rng.int(-6, 6), rng.int(-6, 6)];
    let L1;
    let L2;
    if (rng.bool()) {
      const b = rng.int(1, 4);
      const [a1, a2] = [rng.nonzero(-4, 5), rng.nonzero(-4, 5)];
      if (a1 + a2 === 0) continue;
      const flip = rng.bool();
      [L1, L2] = [{ a: a1, b: flip ? -b : b }, { a: a2, b: flip ? b : -b }];
    } else {
      const a = rng.int(1, 4);
      const [b1, b2] = [rng.nonzero(-4, 5), rng.nonzero(-4, 5)];
      if (b1 === b2) continue;
      [L1, L2] = [{ a, b: b1 }, { a, b: b2 }];
    }
    L1.c = L1.a * x0 + L1.b * y0;
    L2.c = L2.a * x0 + L2.b * y0;
    if (Math.abs(L1.c) > 40 || Math.abs(L2.c) > 40) continue;
    const r = elimSteps(L1, L2);
    if (r.x !== x0 || r.y !== y0) throw new Error('elimination steps disagree');
    const wrong = pointSlips(L1, L2, x0, y0);
    const adds = L1.b === -L2.b;
    if (adds) {
      // Adding the left sides but subtracting the right sides.
      const xs = (L1.c - L2.c) / (L1.a + L2.a);
      const ys = isInt(xs) ? (L1.c - L1.a * xs) / L1.b : null;
      if (isInt(xs) && isInt(ys) && xs !== x0) wrong.unshift({ value: pt(xs, ys), why: R`Add **both** sides of the equations. The right sides give \(${L1.c} + ${paren(L2.c)} = ${L1.c + L2.c}\).`, p: [xs, ys] });
    }
    return q({
      prompt: R`Solve the system by elimination. \[\begin{cases} ${std(L1)} \\ ${std(L2)} \end{cases}\]`,
      correct: pt(x0, y0),
      wrong,
      solution: [...r.steps, R`Check in the second equation: ${plugged(L2, x0, y0)} ✓. The solution is \(${point(x0, y0)}\).`],
      rule: 3,
      skill: 'solving by elimination',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}

const TWO_KINDS = [
  {
    lo: 2, hi: 20, value: 'Money, in dollars',
    make: (rng) => { const c = rng.int(4, 12); return [c + rng.int(2, 8), c]; },
    names: ['adult tickets', 'student tickets'], one: ['adult ticket', 'student ticket'],
    story: (n, T, p1, p2) => `A school play sold ${n} tickets and collected ${money(T)}. Adult tickets cost ${money(p1)} each and student tickets cost ${money(p2)} each.`,
    total: (T) => money(T),
  },
  {
    lo: 3, hi: 25, value: 'Value, in cents',
    make: (rng) => rng.pick([[25, 10], [10, 5], [25, 5]]),
    names: ['quarters', 'dimes'], one: ['quarter', 'dime'],
    story: (n, T, p1, p2) => `A jar holds ${n} coins, all ${p1 === 25 ? 'quarters' : 'dimes'} and ${p2 === 5 ? 'nickels' : 'dimes'}. Together they are worth ${money(T / 100)}.`,
    total: (T) => `${T} cents`,
  },
  {
    lo: 3, hi: 20, value: 'Points',
    make: (rng) => rng.pick([[5, 2], [4, 2], [3, 1], [5, 3], [4, 1]]),
    names: ['long questions', 'short questions'], one: ['long question', 'short question'],
    story: (n, T, p1, p2) => `A test has ${n} questions and is worth ${T} points. Each long question is worth ${p1} points and each short question is worth ${p2} ${p2 === 1 ? 'point' : 'points'}.`,
    total: (T) => `${T} points`,
  },
];

function mediumTwoPrices(rng) {
  const c = rng.pick(TWO_KINDS);
  const [p1, p2] = c.make(rng);
  const [A, B] = [rng.int(c.lo, c.hi), rng.int(c.lo, c.hi)];
  const n = A + B;
  const T = p1 * A + p2 * B;
  const coinNames = p1 === 25 ? (p2 === 5 ? ['quarters', 'nickels'] : ['quarters', 'dimes']) : ['dimes', 'nickels'];
  const names = c.names[0] === 'quarters' ? coinNames : c.names;
  const ones = names.map((w) => (w === 'nickels' ? 'nickel' : w.replace(/s$/, '')));
  const askFirst = rng.bool();
  const [ans, other] = askFirst ? [A, B] : [B, A];
  const fmt = unitFmt(ones[askFirst ? 0 : 1], names[askFirst ? 0 : 1]);
  const even = T / (p1 + p2);
  return q({
    prompt: `${c.story(n, T, p1, p2)} How many ${names[askFirst ? 0 : 1]} ${c.names[0] === 'adult tickets' ? 'were sold' : c.names[0] === 'quarters' ? 'are in the jar' : 'are on the test'}?`,
    correct: ans,
    fmt,
    wrong: [
      { value: other, why: `That is the number of ${names[askFirst ? 1 : 0]}. Check which letter stands for which.` },
      isInt(even) && even !== ans ? { value: even, why: 'Dividing the total by the sum of the two values assumes there are equally many of each.' } : null,
      isInt(n / 2) && n / 2 !== ans ? n / 2 : null,
      ans + 1, ans - 1,
    ],
    solution: [
      R`Let \(x\) be the number of ${names[0]} and \(y\) the number of ${names[1]}. Count: \(x + y = ${n}\). ${c.value}: \(${terms([[p1, 'x'], [p2, 'y']])} = ${T}\).`,
      R`From the first equation, \(y = ${n} - x\). Substitute: \(${p1}x + ${p2 === 1 ? '' : p2}(${n} - x) = ${T}\), so \(${terms([[p1 - p2, 'x']])} + ${p2 * n} = ${T}\).`,
      R`Then \(${terms([[p1 - p2, 'x']])} = ${T - p2 * n}\)${p1 - p2 === 1 ? '' : R`, so \(x = ${A}\)`}. That gives \(y = ${n} - ${A} = ${B}\).`,
      R`Check: \(${A} + ${B} = ${n}\) and ${plugged({ a: p1, b: p2 }, A, B)}. ✓ There are ${A} ${names[0]} and ${B} ${names[1]}.`,
    ],
    rule: 5,
    skill: 'systems from stories',
    check: () => checkAll(checkEqual(A + B, n), checkEqual(p1 * A + p2 * B, T), checkEqual((T - p2 * n) / (p1 - p2), A)),
  });
}

// ───────────── Hard: multiplying before eliminating, comparing plans, counting solutions in standard form ─────────────

function hardElimMultiply(rng) {
  for (;;) {
    const [a1, b1, a2, b2] = [rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
    if (Math.abs(a1) === Math.abs(a2) || Math.abs(b1) === Math.abs(b2) || a1 * b2 - a2 * b1 === 0) continue;
    const [x0, y0] = [rng.int(-5, 5), rng.int(-5, 5)];
    const L1 = { a: a1, b: b1, c: a1 * x0 + b1 * y0 };
    const L2 = { a: a2, b: b2, c: a2 * x0 + b2 * y0 };
    if (Math.abs(L1.c) > 30 || Math.abs(L2.c) > 30) continue;
    const r = elimSteps(L1, L2);
    if (r.k1 * r.k2 > 12) continue;
    if (r.x !== x0 || r.y !== y0) throw new Error('elimination steps disagree');
    const wrong = [];
    // Multiplying the left side of an equation but not its right side.
    for (const [k, slipped] of [[r.k1, solve2({ ...L1, c: L1.c / r.k1 }, L2)], [r.k2, solve2(L1, { ...L2, c: L2.c / r.k2 })]]) {
      if (k > 1 && slipped && isInt(slipped.x) && isInt(slipped.y) && !(slipped.x === x0 && slipped.y === y0)) wrong.push({ value: pt(slipped.x, slipped.y), why: 'When you multiply an equation, multiply every term, including the number on the right side.', p: [slipped.x, slipped.y] });
    }
    wrong.push(...pointSlips(L1, L2, x0, y0));
    return q({
      prompt: R`Solve the system. \[\begin{cases} ${std(L1)} \\ ${std(L2)} \end{cases}\]`,
      correct: pt(x0, y0),
      wrong,
      solution: [...r.steps, R`Check in the second equation: ${plugged(L2, x0, y0)} ✓. The solution is \(${point(x0, y0)}\).`],
      rule: 3,
      skill: 'elimination after multiplying',
      check: () => checkAll(checkBoth(L1, L2, x0, y0), noneOnBoth(L1, L2, wrong)),
    });
  }
}

const PLANS = [
  { a: 'Phone plan A', b: 'Phone plan B', fee: 'a month', per: 'gigabyte of data', unit: ['gigabyte', 'gigabytes'], v: 'x', ask: 'For how many gigabytes of data in a month do the two plans cost the same?', cost: 'What is the monthly bill for each plan when they cost the same?', rate: [2, 6], feeStep: 5 },
  { a: 'Bike shop A', b: 'Bike shop B', fee: 'to rent a bike', per: 'hour', unit: ['hour', 'hours'], v: 'x', ask: 'For how many hours of rental do the two shops charge the same?', cost: 'At the number of hours where the two shops charge the same, what is that charge?', rate: [2, 5], feeStep: 2 },
  { a: 'Taxi company A', b: 'Taxi company B', fee: 'for each ride', per: 'mile', unit: ['mile', 'miles'], v: 'x', ask: 'For how many miles do the two rides cost the same?', cost: 'At the distance where the two rides cost the same, what does a ride cost?', rate: [1, 4], feeStep: 1 },
];

function hardCompareCosts(rng) {
  const c = rng.pick(PLANS);
  const rB = rng.int(...c.rate);
  const d = rng.int(1, 4);
  const rA = rB + d;
  const x = rng.int(2, 12);
  const fA = c.feeStep * rng.int(1, 6);
  const fB = fA + d * x;
  const cost = fA + rA * x;
  const askCost = rng.bool(0.4);
  const sum = (fB - fA) / (rA + rB);
  return q({
    prompt: `${c.a} charges ${money(fA)} ${c.fee} plus ${money(rA)} for each ${c.per}. ${c.b} charges ${money(fB)} ${c.fee} plus ${money(rB)} for each ${c.per}. ${askCost ? c.cost : c.ask}`,
    correct: askCost ? cost : x,
    fmt: askCost ? (v) => money(v) : unitFmt(...c.unit),
    wrong: askCost
      ? [{ value: rA * x, why: R`\(${rA} \times ${x}\) is only the charge for the ${c.unit[1]}. Add the fee of ${money(fA)} too.` }, { value: fA + rA * (x + 1), why: `That is the cost for ${x + 1} ${c.unit[1]}. Solve for the number of ${c.unit[1]} first.` }, fB, cost + d]
      : [{ value: isInt(sum) && sum !== x ? sum : null, why: 'The gap between the fees closes by the **difference** of the rates each unit, not their sum.' }, { value: fB - fA, why: `${money(fB - fA)} is the difference between the fees. Divide it by how much the gap closes each ${c.unit[0]}.` }, { value: d, why: `${money(d)} is the difference between the rates, not the number of ${c.unit[1]}.` }, x + 1, x - 1],
    solution: [
      R`Let \(x\) be the number of ${c.unit[1]} and \(y\) the cost in dollars. ${c.a}: \(y = ${linear(rA, fA)}\). ${c.b}: \(y = ${linear(rB, fB)}\).`,
      R`The costs are the same when \(${linear(rA, fA)} = ${linear(rB, fB)}\). Subtract \(${rB === 1 ? '' : rB}x\) and \(${fA}\) from both sides: \(${terms([[d, 'x']])} = ${fB - fA}\)${d === 1 ? '' : R`, so \(x = ${x}\)`}.`,
      R`Cost: \(y = ${rA}(${x}) + ${fA} = ${cost}\). Check with the other plan: \(${rB}(${x}) + ${fB} = ${rB * x + fB}\). ✓`,
      askCost ? `Both cost ${money(cost)}.` : `The costs are the same for ${x} ${c.unit[1]}.`,
    ],
    rule: 5,
    skill: 'systems from stories',
    check: () => checkAll(checkEqual(fA + rA * x, fB + rB * x), checkEqual(fA + rA * x, cost)),
  });
}

function hardCountStandard(rng) {
  const kind = rng.pick(['one', 'none', 'many']);
  for (;;) {
    const [a1, b1] = [rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
    const c1 = rng.int(-12, 12);
    const t = rng.pick([2, 3, -1, -2]);
    let L2;
    if (kind === 'many') L2 = { a: t * a1, b: t * b1, c: t * c1 };
    else if (kind === 'none') L2 = { a: t * a1, b: t * b1, c: t * c1 + rng.nonzero(-6, 6) };
    else L2 = { a: rng.nonzero(-6, 6), b: rng.nonzero(-6, 6), c: rng.int(-12, 12) };
    const L1 = { a: a1, b: b1, c: c1 };
    if (kind === 'one' && a1 * L2.b - L2.a * b1 === 0) continue;
    const yForm = (L) => eqY(frac(-L.a, L.b), frac(L.c, L.b));
    return q({
      prompt: R`How many solutions does this system have? \[\begin{cases} ${std(L1)} \\ ${std(L2)} \end{cases}\]`,
      correct: COUNTS[kind],
      wrong: countWrongs(
        kind,
        R`Multiply the first equation by \(${t}\): the left side matches the second equation, but the right side is \(${t * c1}\), not \(${L2.c}\). The lines are parallel.`,
        R`Multiply the first equation by \(${t}\): you get exactly the second equation. Both equations describe the same line.`,
        'The slopes are different, so the lines are not parallel. They cross at exactly one point.',
      ),
      solution: [
        R`Solve each equation for \(y\). First: \(${yForm(L1)}\). Second: \(${yForm(L2)}\).`,
        kind === 'one' ? R`The slopes, \(${frac(-a1, b1).tex()}\) and \(${frac(-L2.a, L2.b).tex()}\), are different. The lines cross once: exactly one solution.` : kind === 'none' ? R`The slopes are the same but the \(y\)-intercepts are different, so the lines are parallel: no solution.` : R`The slopes and the \(y\)-intercepts are the same, so it is one line: infinitely many solutions.`,
        ...(kind === 'one' ? [] : [R`Another way to see it: multiplying the first equation by \(${t}\) gives \(${std({ a: t * a1, b: t * b1, c: t * c1 })}\).`]),
      ],
      rule: 4,
      skill: 'number of solutions by inspection',
      check: () => (countByPoints(L1, L2) === kind ? true : 'the count is wrong'),
    });
  }
}

// ───────────── Challenge: work backwards, choose a value, a two-purchase story ─────────────

function challengeFindValue(rng) {
  const kind = rng.pick(['none', 'many', 'coef']);
  const fmt = (v) => R`\(k = ${num(v)}\)`;
  for (;;) {
    const [a1, b1] = [rng.nonzero(-4, 5), rng.nonzero(-4, 5)];
    const c1 = rng.nonzero(-10, 10);
    const t = rng.pick([2, 3, 4, -2]);
    const L1 = { a: a1, b: b1, c: c1 };
    if (kind === 'none') {
      const c2 = t * c1 + rng.nonzero(-5, 5);
      const k = t * b1;
      const L2 = { a: t * a1, b: k, c: c2 };
      return q({
        prompt: R`For which value of \(k\) does this system have **no solution**? \[\begin{cases} ${std(L1)} \\ ${terms([[t * a1, 'x']])} + ky = ${c2} \end{cases}\]`,
        correct: k,
        fmt,
        wrong: [{ value: b1, why: R`The \(x\)-term was multiplied by \(${t}\), so the \(y\)-term must be multiplied by \(${t}\) too: \(${t} \times ${paren(b1)} = ${k}\).` }, { value: -k, why: 'Parallel lines have the same slope, so the coefficients must be in the same ratio, sign included.' }, k + t, t, k - 1],
        solution: [R`No solution means parallel lines: the left sides must match after scaling, but the right sides must not.`, R`The \(x\)-coefficient \(${t * a1}\) is \(${t}\) times \(${a1}\). For parallel lines, \(k\) must be \(${t}\) times \(${b1}\): \(k = ${k}\).`, R`Then the first equation times \(${t}\) is \(${std({ a: t * a1, b: k, c: t * c1 })}\), but the second says \(= ${c2}\). The right sides differ, so the lines never meet.`],
        rule: 4,
        skill: 'choosing a value for no solution',
        check: () => (countByPoints(L1, L2) === 'none' ? true : 'that value does not give no solution'),
      });
    }
    if (kind === 'many') {
      const k = t * c1;
      const L2 = { a: t * a1, b: t * b1, c: k };
      return q({
        prompt: R`For which value of \(k\) does this system have **infinitely many solutions**? \[\begin{cases} ${std(L1)} \\ ${terms([[t * a1, 'x'], [t * b1, 'y']])} = k \end{cases}\]`,
        correct: k,
        fmt,
        wrong: [{ value: c1, why: R`The left side of the second equation is \(${t}\) times the first. The right side must be \(${t}\) times \(${c1}\) as well.` }, { value: -k, why: 'Keep the sign: every term is multiplied by the same number.' }, c1 + t, k + t],
        solution: [R`Infinitely many solutions means both equations are the same line.`, R`The left side of the second equation is the first one multiplied by \(${t}\).`, R`So the right side must be \(${t} \times ${paren(c1)} = ${k}\). Then \(k = ${k}\).`],
        rule: 4,
        skill: 'choosing a value for many solutions',
        check: () => (countByPoints(L1, L2) === 'many' ? true : 'that value does not give the same line'),
      });
    }
    const [x0, y0] = [rng.nonzero(-5, 5), rng.int(-5, 5)];
    const a = rng.nonzero(-6, 6);
    const L = { a, b: b1, c: a * x0 + b1 * y0 };
    const [a2, b2] = [rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
    const M2 = { a: a2, b: b2, c: a2 * x0 + b2 * y0 };
    if (a * b2 - a2 * b1 === 0 || Math.abs(L.c) > 40) continue;
    const forgot = L.c - b1 * y0;
    const signSlip = (L.c + b1 * y0) / x0;
    const swapped = y0 !== 0 ? (L.c - b1 * x0) / y0 : null;
    return q({
      prompt: R`The solution of this system is \(${point(x0, y0)}\). What is the value of \(k\)? \[\begin{cases} ${terms([[1, 'kx'], [b1, 'y']])} = ${L.c} \\ ${std(M2)} \end{cases}\]`,
      correct: a,
      fmt,
      wrong: [Math.abs(x0) !== 1 ? { value: forgot, why: R`After subtracting, \(${forgot}\) is \(k\) times \(${x0}\). Divide by \(${x0}\) to find \(k\).` } : null, isInt(signSlip) && signSlip !== a ? { value: signSlip, why: R`To undo \(${terms([[b1, `(${y0})`]])}\), do the opposite on both sides.` } : null, swapped != null && isInt(swapped) && swapped !== a ? { value: swapped, why: R`In \(${point(x0, y0)}\), \(x = ${x0}\) and \(y = ${y0}\).` } : null, -a, a + 1],
      solution: [R`A solution makes both equations true, so substitute \(x = ${x0}\) and \(y = ${y0}\) into the first one: \(k(${x0}) ${b1 < 0 ? '-' : '+'} ${times(Math.abs(b1), y0)} = ${L.c}\).`, R`Work out the known part: \(${terms([[x0, 'k'], [b1 * y0, '']])} = ${L.c}\), so \(${terms([[x0, 'k']])} = ${forgot}\) and \(k = ${a}\).`, R`The second equation is a check that the point fits the system: ${plugged(M2, x0, y0)} ✓.`],
      rule: 0,
      skill: 'working back from a solution',
      check: () => checkBoth(L, M2, x0, y0),
    });
  }
}

const SHOPS = [
  ['notebook', 'notebooks', 'pen', 'pens', 'at a school store'],
  ['sandwich', 'sandwiches', 'drink', 'drinks', 'at a cafe'],
  ['bag of popcorn', 'bags of popcorn', 'bottle of water', 'bottles of water', 'at a game'],
  ['bus ticket', 'bus tickets', 'train ticket', 'train tickets', 'for a trip'],
];

function challengeTwoPurchases(rng) {
  const [one1, many1, one2, many2, where] = rng.pick(SHOPS);
  const [p, r] = people(rng, 2);
  for (;;) {
    const [X, Y] = [rng.int(2, 9), rng.int(1, 7)];
    const [n1, m1, n2, m2] = [rng.int(1, 5), rng.int(1, 5), rng.int(1, 5), rng.int(1, 5)];
    if (X === Y || n1 * m2 - n2 * m1 === 0 || (n1 === n2 && m1 === m2) || (n1 === 1 && m1 === 1) || (n2 === 1 && m2 === 1)) continue;
    const [T1, T2] = [n1 * X + m1 * Y, n2 * X + m2 * Y];
    const L1 = { a: n1, b: m1, c: T1 };
    const L2 = { a: n2, b: m2, c: T2 };
    const r0 = elimSteps(L1, L2);
    if (r0.k1 * r0.k2 > 10) continue;
    const ask = rng.pick(X > Y ? ['x', 'y', 'sum', 'diff'] : ['x', 'y', 'sum']);
    const correct = { x: X, y: Y, sum: X + Y, diff: X - Y }[ask];
    const question = { x: `How much does one ${one1} cost?`, y: `How much does one ${one2} cost?`, sum: `How much do one ${one1} and one ${one2} cost together?`, diff: `How much more does one ${one1} cost than one ${one2}?` }[ask];
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    return q({
      prompt: `${p} buys ${count(n1, one1, many1)} and ${count(m1, one2, many2)} ${where} for ${money(T1)}. ${r} buys ${count(n2, one1, many1)} and ${count(m2, one2, many2)} for ${money(T2)}. ${question}`,
      correct,
      fmt: (v) => money(v),
      wrong: [
        ask !== 'x' ? { value: X, why: `${money(X)} is the price of one ${one1}.` } : null,
        ask !== 'y' ? { value: Y, why: `${money(Y)} is the price of one ${one2}.` } : null,
        ask !== 'sum' ? { value: X + Y, why: `${money(X + Y)} is the price of one of each.` } : null,
        ask === 'diff' ? null : X - Y > 0 && X - Y !== correct ? X - Y : null,
        correct + 1, correct + 2, correct - 1,
      ].filter((w) => w == null || (w.value ?? w) > 0),
      solution: [R`Let \(x\) be the price of one ${one1} and \(y\) the price of one ${one2}, in dollars. Then \(${std(L1)}\) and \(${std(L2)}\).`, ...r0.steps, R`Check: ${plugged(L1, X, Y)} and ${plugged(L2, X, Y)}. ✓ One ${one1} costs ${money(X)} and one ${one2} costs ${money(Y)}.`, { x: `The answer is ${money(X)}.`, y: `The answer is ${money(Y)}.`, sum: R`Together: \(${X} + ${Y} = ${X + Y}\), so ${money(X + Y)}.`, diff: R`Difference: \(${X} - ${Y} = ${X - Y}\), so ${money(X - Y)} more.` }[ask]],
      rule: 5,
      skill: 'systems from stories',
      check: () => checkAll(checkBoth(L1, L2, X, Y), checkEqual(r0.x, X), checkEqual(r0.y, Y)),
    });
  }
}

function challengeSetUp(rng) {
  const kind = rng.pick(['rectangle', 'ages', 'numbers']);
  if (kind === 'rectangle') {
    const W = rng.int(3, 20);
    const d = rng.int(2, 12);
    const L = W + d;
    const P = 2 * L + 2 * W;
    const askL = rng.bool();
    const [E1, E2] = [{ a: 2, b: 2, c: P }, { a: 1, b: -1, c: d }];
    return q({
      prompt: `A rectangle has a perimeter of ${P} cm. Its length is ${d} cm more than its width. What is its ${askL ? 'length' : 'width'}?`,
      correct: askL ? L : W,
      unit: 'cm',
      wrong: [{ value: askL ? W : L, why: `That is the ${askL ? 'width' : 'length'}. The length is the longer side.` }, { value: isInt(askL ? (P + d) / 2 : (P - d) / 2) ? (askL ? (P + d) / 2 : (P - d) / 2) : null, why: R`The perimeter counts the length twice and the width twice, so \(l + w\) is half of ${P}, which is ${P / 2}, not ${P}.` }, { value: P / 2, why: `${P / 2} cm is the length and the width added together.` }, (askL ? L : W) + d, (askL ? L : W) + 2],
      solution: [R`Let \(l\) be the length and \(w\) the width. Perimeter: \(2l + 2w = ${P}\). Length: \(l = w + ${d}\).`, R`Substitute: \(2(w + ${d}) + 2w = ${P}\), so \(4w + ${2 * d} = ${P}\), \(4w = ${P - 2 * d}\) and \(w = ${W}\).`, R`Then \(l = ${W} + ${d} = ${L}\). Check: \(2(${L}) + 2(${W}) = ${P}\). ✓`, `The ${askL ? 'length' : 'width'} is ${askL ? L : W} cm.`],
      rule: 5,
      skill: 'setting up a system',
      check: () => checkBoth(E1, E2, L, W),
    });
  }
  if (kind === 'ages') {
    const [p, r] = people(rng, 2);
    const B = rng.int(3, 14);
    const k = rng.int(2, 4);
    const A = k * B;
    const S = A + B;
    const askOld = rng.bool();
    const [E1, E2] = [{ a: 1, b: 1, c: S }, { a: 1, b: -k, c: 0 }];
    return q({
      prompt: `${p} is ${k} times as old as ${r}. The sum of their ages is ${S}. How old is ${askOld ? p : r}?`,
      correct: askOld ? A : B,
      unit: 'years old',
      wrong: [{ value: askOld ? B : A, why: `That is ${askOld ? r : p}'s age.` }, { value: isInt(S / 2) ? S / 2 : null, why: 'Half the sum would make the two ages equal, but one age is several times the other.' }, S - k, (askOld ? A : B) + 1],
      solution: [R`Let \(a\) be ${p}'s age and \(b\) be ${r}'s age. Then \(a = ${k}b\) and \(a + b = ${S}\).`, R`Substitute: \(${k}b + b = ${S}\), so \(${k + 1}b = ${S}\) and \(b = ${B}\).`, R`Then \(a = ${k}(${B}) = ${A}\). Check: \(${A} + ${B} = ${S}\). ✓`, `${askOld ? p : r} is ${askOld ? A : B} years old.`],
      rule: 5,
      skill: 'setting up a system',
      check: () => checkBoth(E1, E2, A, B),
    });
  }
  const y0 = rng.int(-12, 20);
  const D = rng.int(2, 18);
  const x0 = y0 + D;
  const S = x0 + y0;
  const askBig = rng.bool();
  const [E1, E2] = [{ a: 1, b: 1, c: S }, { a: 1, b: -1, c: D }];
  return q({
    prompt: R`The sum of two numbers is \(${S}\) and their difference is \(${D}\). What is the ${askBig ? 'larger' : 'smaller'} number?`,
    correct: askBig ? x0 : y0,
    wrong: [{ value: askBig ? y0 : x0, why: `That is the ${askBig ? 'smaller' : 'larger'} number.` }, { value: isInt(S / 2) ? S / 2 : null, why: 'Half the sum is the number halfway between the two. It is not one of them.' }, S - D, S + D],
    solution: [R`Let \(x\) be the larger number and \(y\) the smaller. Then \(x + y = ${S}\) and \(x - y = ${D}\).`, R`Add the equations: \(2x = ${S + D}\), so \(x = ${x0}\).`, R`Then \(y = ${S} - ${paren(x0)} = ${y0}\). Check: \(${x0} - ${paren(y0)} = ${D}\). ✓`, R`The ${askBig ? 'larger' : 'smaller'} number is \(${askBig ? x0 : y0}\).`],
    rule: 3,
    skill: 'setting up a system',
    check: () => checkBoth(E1, E2, x0, y0),
  });
}

// ───────────── Interactive models ─────────────

export default {
  id: 'systems',
  title: 'Systems of Linear Equations',
  summary: 'Solve pairs of linear equations by graphing, substitution and elimination, and tell when a system has one, no or infinitely many solutions.',
  grade: 'Grade 8',
  standards: ['CCSS 8.EE.C.8'],

  explain: {
    intro: R`A **system of linear equations** is two equations that must both be true at once. Each equation is a line, so a solution is a point that lies on **both** lines: the place where they cross. You can find it from a graph or with algebra.`,
    rules: [
      {
        title: 'A solution is a point on both lines',
        text: R`An ordered pair \((x, y)\) is a solution of a system only if it makes **every** equation true. Substitute the numbers into each equation and check both. If it fails even one, it is not a solution.`,
        example: R`For \(y = 2x + 1\) and \(y = x + 3\), try \((2, 5)\): \(2(2) + 1 = 5\) ✓ and \(2 + 3 = 5\) ✓. So \((2, 5)\) is the solution.`,
      },
      {
        title: 'Solving by graphing',
        text: R`Graph both lines on the same grid. The point where they cross is the solution. Read the \(x\)-coordinate first, then the \(y\)-coordinate, and check the point in both equations.`,
        example: R`The lines \(y = x + 1\) and \(y = -x + 5\) cross at \((2, 3)\).`,
      },
      {
        title: 'Solving by substitution',
        text: R`If one equation is already solved for a variable, such as \(y = 2x - 1\), put that expression in place of the variable in the other equation. Solve the one-variable equation, then substitute back to find the other variable.`,
        example: R`\(y = 2x - 1\) and \(3x + y = 9\): \(3x + (2x - 1) = 9\), so \(5x = 10\) and \(x = 2\). Then \(y = 2(2) - 1 = 3\).`,
      },
      {
        title: 'Solving by elimination',
        text: R`Line up the equations. If one variable has opposite coefficients, add the equations; if it has the same coefficient, subtract. That variable cancels. If neither matches, first multiply one or both equations (every term!) so that it does.`,
        example: R`\(2x + 3y = 12\) and \(4x - 3y = 6\): add to get \(6x = 18\), so \(x = 3\). Then \(2(3) + 3y = 12\) gives \(y = 2\).`,
      },
      {
        title: 'One, none or infinitely many',
        text: R`Write both equations as \(y = mx + b\). **Different slopes**: the lines cross once, so there is exactly one solution. **Same slope, different intercepts**: the lines are parallel and never meet, so there is no solution. **Same slope and same intercept**: it is the same line, so there are infinitely many solutions.`,
        example: R`\(y = 3x + 1\) and \(y = 3x - 4\) are parallel: no solution. \(y = 3x + 1\) and \(2y = 6x + 2\) are the same line: infinitely many.`,
      },
      {
        title: 'Systems in stories',
        text: R`When a story has two unknown amounts and gives two facts about them, name each amount with a letter, write one equation for each fact, and solve. Check the answer in the story, not only in the equations.`,
        example: R`30 tickets were sold for $285, adults at $12 and students at $7: \(a + s = 30\) and \(12a + 7s = 285\), so \(a = 15\) and \(s = 15\).`,
      },
    ],
    vocab: [
      { term: 'system of equations', def: 'Two or more equations about the same variables that must all be true at once.' },
      { term: 'solution of a system', def: 'An ordered pair that makes every equation in the system true; a point on both lines.' },
      { term: 'substitution', def: 'Replacing a variable with an equal expression from the other equation.' },
      { term: 'elimination', def: 'Adding or subtracting the equations so that one variable cancels.' },
      { term: 'parallel lines', def: 'Lines with the same slope and different intercepts. They never meet.' },
    ],
    mistakes: [
      'Checking only one equation. A solution has to work in both.',
      R`Writing the point backwards. In \((x, y)\) the \(x\)-value comes first.`,
      R`Forgetting to distribute when substituting: \(3(2x - 1)\) is \(6x - 3\), not \(6x - 1\).`,
      'Multiplying only the left side of an equation before eliminating. Every term, including the number on the right, is multiplied.',
      'Stopping after finding one variable. A solution of a system needs both coordinates.',
    ],
    visual: grid(-2, 7, {
      fns: [{ f: (x) => x + 1, label: 'y = x + 1' }, { f: (x) => -x + 5, color: 'b', label: 'y = −x + 5' }],
      points: [{ x: 2, y: 3, label: '(2, 3)' }],
      alt: 'The lines y = x + 1 and y = −x + 5 on one grid. The first crosses the y-axis at (0, 1) and rises; the second crosses at (0, 5) and falls. They cross at the marked point (2, 3), the solution of the system.',
    }),
  },

  examples: [
    {
      title: 'Solving by graphing',
      problem: R`Solve the system \(y = 2x - 3\) and \(y = -x + 3\) by graphing.`,
      steps: [R`Graph \(y = 2x - 3\): start at \((0, -3)\) and go up 2 for every 1 to the right.`, R`Graph \(y = -x + 3\): start at \((0, 3)\) and go down 1 for every 1 to the right.`, R`The lines cross at \((2, 1)\).`, R`Check: \(2(2) - 3 = 1\) ✓ and \(-2 + 3 = 1\) ✓.`],
      answer: R`\((2, 1)\)`,
      visual: grid(-5, 5, { fns: [{ f: (x) => 2 * x - 3, label: 'y = 2x − 3' }, { f: (x) => -x + 3, color: 'b', label: 'y = −x + 3' }], points: [{ x: 2, y: 1, label: '(2, 1)' }], alt: 'The lines y = 2x − 3, through (0, −3), and y = −x + 3, through (0, 3), cross at the marked point (2, 1).' }),
    },
    {
      title: 'Solving by substitution',
      problem: R`Solve \(y = x - 4\) and \(2x + 3y = 13\).`,
      steps: [R`Substitute \(x - 4\) for \(y\) in the second equation: \(2x + 3(x - 4) = 13\).`, R`Distribute: \(2x + 3x - 12 = 13\), so \(5x - 12 = 13\).`, R`Add 12 and divide by 5: \(5x = 25\), so \(x = 5\).`, R`Then \(y = 5 - 4 = 1\). Check: \(2(5) + 3(1) = 13\) ✓.`],
      answer: R`\((5, 1)\)`,
    },
    {
      title: 'Elimination after multiplying',
      problem: R`Solve \(3x + 2y = 16\) and \(x - y = 2\).`,
      steps: [R`Multiply the second equation by 2 (every term): \(2x - 2y = 4\).`, R`Now the \(y\)-terms are \(2y\) and \(-2y\). Add the equations: \(5x = 20\), so \(x = 4\).`, R`Substitute into \(x - y = 2\): \(4 - y = 2\), so \(y = 2\).`, R`Check: \(3(4) + 2(2) = 16\) ✓ and \(4 - 2 = 2\) ✓.`],
      answer: R`\((4, 2)\)`,
    },
    {
      title: 'Word problem: a jar of coins',
      word: true,
      problem: 'A jar holds 22 coins, all dimes and quarters, worth $3.70 in all. How many of each coin are in the jar?',
      steps: [R`Let \(d\) be the number of dimes and \(q\) the number of quarters. There are 22 coins: \(d + q = 22\).`, R`Work in cents: \(10d + 25q = 370\).`, R`From the first equation, \(d = 22 - q\). Substitute: \(10(22 - q) + 25q = 370\), so \(220 + 15q = 370\), \(15q = 150\) and \(q = 10\).`, R`Then \(d = 22 - 10 = 12\). Check: 12 dimes are $1.20 and 10 quarters are $2.50, which make $3.70. ✓`],
      answer: '12 dimes and 10 quarters',
    },
  ],

  models: [
    {
      id: 'two-lines',
      title: 'Where do two lines cross?',
      intro: 'Choose the slope and intercept of each line. The steps solve the system by substitution, and the graph shows the crossing point.',
      inputs: [
        { name: 'm1', label: 'First line: slope', type: 'int', min: -6, max: 6, value: 2 },
        { name: 'b1', label: 'First line: y-intercept', type: 'int', min: -12, max: 12, value: -3 },
        { name: 'm2', label: 'Second line: slope', type: 'int', min: -6, max: 6, value: -1 },
        { name: 'b2', label: 'Second line: y-intercept', type: 'int', min: -12, max: 12, value: 3 },
      ],
      compute({ m1, b1, m2, b2 }) {
        const problem = R`Solve the system \(${eqY(m1, b1)}\) and \(${eqY(m2, b2)}\).`;
        const fns = [{ f: (x) => m1 * x + b1, label: lineLabel(m1, b1) }, { f: (x) => m2 * x + b2, color: 'b', dashed: m1 === m2 && b1 === b2 }];
        if (m1 === m2) {
          const same = b1 === b2;
          return {
            problem,
            steps: [R`Both lines have slope \(${m1}\).`, same ? 'The intercepts are the same too, so the two equations describe one line. Every point on it is a solution.' : R`The intercepts, \(${b1}\) and \(${b2}\), are different, so the lines are parallel and never meet.`, R`Substitution shows the same thing: \(${linear(m1, b1)} = ${linear(m2, b2)}\) leaves \(${b1} = ${b2}\), which is ${same ? 'always true' : 'never true'}.`],
            answer: same ? 'Infinitely many solutions (the same line)' : 'No solution (parallel lines)',
            visual: grid(-10, 10, { fns, alt: same ? `The line ${lineLabel(m1, b1)}. Both equations give this same line.` : `Two parallel lines, ${lineLabel(m1, b1)} and ${lineLabel(m2, b2)}. They never cross.` }),
          };
        }
        const x = frac(b2 - b1, m1 - m2);
        const y = x.mul(m1).add(b1);
        const [cx, cy] = [Math.round(x.value), Math.round(y.value)];
        const d = m1 - m2;
        return {
          problem,
          steps: [
            R`Both equations give \(y\), so set them equal: \(${linear(m1, b1)} = ${linear(m2, b2)}\).`,
            R`${m2 === 0 ? 'There is no \\(x\\)-term on the right.' : R`${m2 > 0 ? 'Subtract' : 'Add'} \(${terms([[Math.abs(m2), 'x']])}\) ${m2 > 0 ? 'from' : 'to'} both sides: \(${linear(d, b1)} = ${b2}\).`} ${b1 === 0 ? '' : R`${b1 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b1)}\) ${b1 > 0 ? 'from' : 'to'} both sides: \(${terms([[d, 'x']])} = ${b2 - b1}\).`}`,
            R`${d === 1 ? 'So' : R`Divide by \(${d}\):`} \(x = ${x.tex()}\).`,
            R`Substitute into the first equation: \(y = ${m1 === 1 ? '' : m1 === -1 ? '-' : m1}\left(${x.tex()}\right) ${b1 ? signed(b1) : ''} = ${y.tex()}\).`,
            R`Check in the second: \(${m2 === 0 ? '' : `${m2 === 1 ? '' : m2 === -1 ? '-' : m2}\\left(${x.tex()}\\right)`} ${m2 === 0 ? num(b2) : b2 ? signed(b2) : ''} = ${x.mul(m2).add(b2).tex()}\). ✓`,
          ],
          answer: R`\(${point(x, y)}\)`,
          visual: { type: 'plot', x: [cx - 9, cx + 9], y: [cy - 9, cy + 9], step: [1, 1], square: true, fns, points: [{ x: x.value, y: y.value, label: `(${x.text()}, ${y.text()})` }], alt: `The lines ${lineLabel(m1, b1)} and ${lineLabel(m2, b2)}. They cross at the marked point (${x.text()}, ${y.text()}).` },
        };
      },
    },
    {
      id: 'ticket-sales',
      title: 'Word problem: ticket sales',
      word: true,
      intro: 'Choose the two ticket prices, the number of tickets sold and the money collected. The steps find how many of each kind were sold.',
      inputs: [
        { name: 'pa', label: 'Adult ticket price ($)', type: 'int', min: 1, max: 40, value: 12 },
        { name: 'ps', label: 'Student ticket price ($)', type: 'int', min: 1, max: 40, value: 7 },
        { name: 'n', label: 'Tickets sold', type: 'int', min: 2, max: 300, value: 30 },
        { name: 'T', label: 'Money collected ($)', type: 'int', min: 1, max: 9000, value: 285 },
      ],
      compute({ pa, ps, n, T }) {
        if (pa === ps) return { error: 'The two prices are the same, so the money cannot tell the kinds apart. Make the adult price different from the student price.' };
        const a = (T - ps * n) / (pa - ps);
        const s = n - a;
        if (!Number.isInteger(a) || a < 0 || s < 0) {
          const lo = Math.min(pa, ps) * n;
          const hi = Math.max(pa, ps) * n;
          return { error: `With these numbers the ticket counts are not whole numbers from 0 to ${n}. The money collected must be between $${lo} and $${hi}, and must fit the prices exactly. Try another total.` };
        }
        const d = pa - ps;
        return {
          problem: `A school play sold ${n} tickets and collected ${money(T)}. Adult tickets cost ${money(pa)} and student tickets cost ${money(ps)}. How many of each were sold?`,
          steps: [
            R`Let \(a\) be the number of adult tickets and \(s\) the number of student tickets. Then \(a + s = ${n}\) and \(${pa}a + ${ps}s = ${T}\).`,
            R`From the first equation, \(s = ${n} - a\). Substitute: \(${pa}a + ${ps}(${n} - a) = ${T}\).`,
            R`Combine: \(${terms([[d, 'a']])} + ${ps * n} = ${T}\), so \(${terms([[d, 'a']])} = ${T - ps * n}\) and \(a = ${a}\).`,
            R`Then \(s = ${n} - ${a} = ${s}\). Check: \(${pa}(${a}) + ${ps}(${s}) = ${pa * a + ps * s}\). ✓`,
          ],
          answer: `${a} adult ${a === 1 ? 'ticket' : 'tickets'} and ${s} student ${s === 1 ? 'ticket' : 'tickets'}`,
          visual: { type: 'plot', x: [0, n], y: [0, n], axisLabels: ['adult', 'student'], fns: [{ f: (x) => n - x, label: `a + s = ${n}` }, { f: (x) => (T - pa * x) / ps, color: 'b' }], points: [{ x: a, y: s, label: lab(a, s) }], alt: `Two lines: one shows every way to sell ${n} tickets, the other every way to collect ${money(T)}. They cross at (${a}, ${s}): ${a} adult and ${s} student tickets.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyIsSolution, easyGraph, easyCountSlopeForm],
    medium: [mediumSubstitution, mediumElimination, mediumTwoPrices],
    hard: [hardElimMultiply, hardCompareCosts, hardCountStandard],
    challenge: [challengeFindValue, challengeTwoPurchases, challengeSetUp],
  },
};
