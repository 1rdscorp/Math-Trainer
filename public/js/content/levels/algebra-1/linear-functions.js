import { R, q, frac, Frac, tryFrac, fracTex, linear, terms, num, txt, signed, paren, dot, point, money, ordinal, gcd, checkEqual } from '../../lib/index.js';
import { val, F, lineEq, timesTex, fitY, pointText, show } from './_shared.js';

const eq = (m, b) => R`\(${lineEq(m, b)}\)`;
const neg = (v) => (v instanceof Frac ? v.neg() : -v);
const std = (a, b, c) => R`\(${terms([[a, 'x'], [b, 'y']])} = ${c}\)`;
const yMinus = (y1) => terms([[1, 'y'], [-y1, '']]); // "y - 3", "y + 3" or "y"
const seqTex = (a1, d, n = 4) => Array.from({ length: n }, (_, i) => a1 + i * d).join(', ');

// ───────────── Easy ─────────────

function easySlopeTwoPoints(rng) {
  const x1 = rng.int(-8, 8);
  const x2 = rng.intExcept(-8, 8, [x1]);
  const y1 = rng.int(-8, 8);
  const y2 = rng.intExcept(-8, 8, [y1]);
  const [dy, dx] = [y2 - y1, x2 - x1];
  const m = frac(dy, dx);
  return q({
    prompt: R`What is the slope of the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\)?`,
    correct: m,
    wrong: [
      { value: frac(dx, dy), why: R`Slope is rise over run: the change in \(y\) goes on top.` },
      { value: m.neg(), why: R`Subtract in the same order on the top and on the bottom: \(y_2 - y_1\) over \(x_2 - x_1\).` },
      tryFrac(y2 + y1, x2 + x1),
      frac(dy, 1),
    ],
    solution: [
      R`Slope \(= \dfrac{y_2 - y_1}{x_2 - x_1} = \dfrac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}}\).`,
      R`That is \(${fracTex(dy, dx)}${m.tex() === fracTex(dy, dx) ? '' : ` = ${m.tex()}`}\).`,
    ],
    rule: 0,
    skill: 'slope from two points',
    check: () => checkEqual(y1 + m.value * dx, y2),
  });
}

function easyReadEquation(rng) {
  const m = rng.pick([rng.nonzero(-9, 9), rng.nonzero(-9, 9), frac(rng.pick([1, -1, 3, -3, 5, -5]), 2), frac(rng.pick([1, -1, 2, -2, 4, -4]), 3)]);
  const b = rng.intExcept(-12, 12, [0, val(m), -val(m)]);
  const reversed = rng.bool(0.4);
  const tex = reversed ? `y = ${terms([[b, ''], [m, 'x']])}` : lineEq(m, b);
  const askSlope = rng.bool();
  const [right, other] = askSlope ? [m, b] : [b, m];
  return q({
    prompt: R`What is the ${askSlope ? 'slope' : R`\(y\)-intercept`} of the line \(${tex}\)?`,
    correct: right,
    wrong: [
      { value: other, why: R`In \(y = mx + b\), the slope \(m\) is the number multiplying \(x\), and the \(y\)-intercept \(b\) is the constant term.` },
      { value: neg(right), why: 'The sign in front of a term belongs to that term. Keep it.' },
      neg(other),
    ],
    solution: [
      reversed ? R`Rewrite with the \(x\)-term first: \(${lineEq(m, b)}\).` : R`The equation is already in slope-intercept form, \(y = mx + b\).`,
      R`The slope is the coefficient of \(x\): \(m = ${num(m)}\). The \(y\)-intercept is the constant: \(b = ${b}\).`,
      R`So the ${askSlope ? 'slope' : R`\(y\)-intercept`} is \(${num(right)}\).`,
    ],
    rule: 1,
    skill: 'slope-intercept form',
  });
}

function easySlopeFromGraph(rng) {
  const dx = rng.int(1, 3);
  const dy = rng.nonzero(-4, 4);
  const k = Math.abs(dy) <= 2 ? rng.int(1, 2) : 1;
  const x1 = rng.int(-4, -1);
  const y1 = rng.int(-2, 2);
  const [x2, y2] = [x1 + k * dx, y1 + k * dy];
  const m = frac(dy, dx);
  return q({
    prompt: 'What is the slope of the line in the graph?',
    visual: {
      type: 'plot', x: [-7, 7], y: [-7, 7], step: [1, 1], square: true,
      fns: [{ f: (x) => y1 + (dy / dx) * (x - x1) }],
      points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
      alt: `Graph of a straight line through the marked points ${pointText(x1, y1)} and ${pointText(x2, y2)}.`,
    },
    correct: m,
    wrong: [
      { value: m.inv(), why: 'Slope is rise over run: the vertical change divided by the horizontal change.' },
      { value: m.neg(), why: dy > 0 ? 'The line rises from left to right, so its slope is positive.' : 'The line falls from left to right, so its slope is negative.' },
      m.inv().neg(),
      frac(k * dy, 1),
    ],
    solution: [
      R`Use the two marked points, \(${point(x1, y1)}\) and \(${point(x2, y2)}\).`,
      R`From the left point to the right point the line goes ${dy > 0 ? 'up' : 'down'} \(${Math.abs(k * dy)}\) (rise \(= ${k * dy}\)) and right \(${k * dx}\) (run \(= ${k * dx}\)).`,
      R`Slope \(= \dfrac{\text{rise}}{\text{run}} = ${fracTex(k * dy, k * dx)}${m.tex() === fracTex(k * dy, k * dx) ? '' : ` = ${m.tex()}`}\).`,
    ],
    rule: 0,
    skill: 'slope from a graph',
    check: () => checkEqual(y1 + m.value * (x2 - x1), y2),
  });
}

function easySequence(rng) {
  const a1 = rng.int(-10, 20);
  const d = rng.intExcept(-9, 9, [-1, 0, 1]);
  const next = a1 + 4 * d;
  const start = R`An arithmetic sequence starts \(${seqTex(a1, d)}, \dots\)`;
  if (rng.bool()) {
    return q({
      prompt: `${start} What is the common difference?`,
      correct: d,
      wrong: [{ value: -d, why: R`Subtract a term from the one after it: \(${a1 + d} - ${paren(a1)} = ${d}\).` }, { value: a1, why: 'That is the first term. The common difference is the amount added at each step.' }, d + 1, d - 1],
      solution: [R`Subtract any term from the next one: \(${a1 + d} - ${paren(a1)} = ${d}\).`, R`Check with another pair: \(${a1 + 2 * d} - ${paren(a1 + d)} = ${d}\). The common difference is \(${d}\).`],
      rule: 5,
      skill: 'arithmetic sequences',
      check: () => checkEqual(a1 + 3 * d - (a1 + 2 * d), d),
    });
  }
  return q({
    prompt: `${start} What is the next term?`,
    correct: next,
    wrong: [{ value: next - 2 * d, why: R`The terms change by \(${d}\) each time. Apply that change to the last term shown, \(${a1 + 3 * d}\).` }, { value: next + d, why: 'That skips a term. Add the common difference only once.' }, next + 1, next - 1],
    solution: [R`Find the common difference: \(${a1 + d} - ${paren(a1)} = ${d}\).`, R`Add it to the last term shown: \(${a1 + 3 * d} + ${paren(d)} = ${next}\).`],
    rule: 5,
    skill: 'arithmetic sequences',
    check: () => checkEqual(next - (a1 + 3 * d), a1 + d - a1),
  });
}

// ───────────── Medium ─────────────

function mediumPointSlope(rng) {
  const den = rng.pick([1, 1, 2, 3]);
  const m = frac(rng.pick([-5, -4, -2, -1, 1, 2, 4, 5].filter((n) => den === 1 || n % den !== 0)), den);
  const x1 = den * rng.nonzero(-4, 4);
  const y1 = rng.int(-9, 9);
  const b = F(y1).sub(m.mul(x1));
  const slip = F(y1).add(m.mul(x1));
  return q({
    prompt: R`Which equation is the line with slope \(${m.tex()}\) that passes through \(${point(x1, y1)}\)?`,
    correct: eq(m, b),
    wrong: [
      { value: eq(m, y1), why: R`\(${y1}\) is the \(y\)-value at \(x = ${x1}\), not at \(x = 0\). Substitute the point to find \(b\).` },
      { value: eq(m, slip), why: R`In \(y - y_1 = m(x - x_1)\) the coordinates are subtracted. Check the signs when you distribute.` },
      eq(m.neg(), slip),
      eq(m, x1),
      eq(m, b.add(1)),
    ],
    solution: [
      R`Use point-slope form, \(y - y_1 = m(x - x_1)\): \(${yMinus(y1)} = ${timesTex(m, linear(1, -x1))}\).`,
      R`Distribute: \(${yMinus(y1)} = ${terms([[m, 'x'], [m.mul(-x1), '']])}\).`,
      y1 === 0 ? R`That is already slope-intercept form: \(${lineEq(m, b)}\).` : R`${y1 > 0 ? 'Add' : 'Subtract'} \(${Math.abs(y1)}\) on both sides: \(${lineEq(m, b)}\).`,
    ],
    rule: 2,
    skill: 'writing linear equations',
    check: () => checkEqual(m.value * x1 + b.value, y1),
  });
}

function mediumTwoPoints(rng) {
  const m = rng.nonzero(-5, 5);
  const b = rng.nonzero(-9, 9);
  const x1 = rng.int(-5, 4);
  const x2 = rng.intExcept(x1 + 1, 6, [x1]);
  const [y1, y2] = [m * x1 + b, m * x2 + b];
  return q({
    prompt: R`Which equation is the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\)?`,
    correct: eq(m, b),
    wrong: [
      Math.abs(m) !== 1 ? { value: eq(frac(1, m), b), why: R`Slope is the change in \(y\) divided by the change in \(x\): \(${fracTex(y2 - y1, x2 - x1)} = ${m}\).` } : null,
      x1 !== 0 ? { value: eq(m, y1), why: R`\(${y1}\) is the \(y\)-value at \(x = ${x1}\). The \(y\)-intercept is the value at \(x = 0\).` } : null,
      eq(-m, b),
      eq(m, -b),
      eq(m, b + 1),
    ],
    solution: [
      R`Slope: \(m = \dfrac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}} = ${fracTex(y2 - y1, x2 - x1)} = ${m}\).`,
      R`Put one point into \(y = ${terms([[m, 'x']])} + b\). With \(${point(x1, y1)}\): \(${y1} = ${dot(m, x1)} + b\), so \(b = ${y1} - ${paren(m * x1)} = ${b}\).`,
      R`The line is \(${lineEq(m, b)}\). Check the other point: \(${dot(m, x2)} ${signed(b)} = ${y2}\). ✓`,
    ],
    rule: 2,
    skill: 'writing linear equations',
    check: () => (m * x1 + b === y1 && m * x2 + b === y2 ? true : 'the line misses a point'),
  });
}

function mediumIntercepts(rng) {
  const xi = rng.nonzero(-9, 9);
  const yi = rng.intExcept(-9, 9, [0, xi, -xi]);
  const g = gcd(xi, yi) * (yi < 0 ? -1 : 1);
  const [A, B, C] = [yi / g, xi / g, (xi * yi) / g];
  const askX = rng.bool();
  const pt = (x, y) => R`\(${point(x, y)}\)`;
  return q({
    prompt: R`What is the ${askX ? R`\(x\)` : R`\(y\)`}-intercept of the line \(${terms([[A, 'x'], [B, 'y']])} = ${C}\)?`,
    correct: askX ? pt(xi, 0) : pt(0, yi),
    wrong: askX
      ? [
          { value: pt(0, xi), why: R`An \(x\)-intercept lies on the \(x\)-axis, so its \(y\)-coordinate is 0.` },
          { value: pt(yi, 0), why: R`For the \(x\)-intercept set \(y = 0\), then solve for \(x\).` },
          pt(-xi, 0),
          pt(C, 0),
        ]
      : [
          { value: pt(yi, 0), why: R`A \(y\)-intercept lies on the \(y\)-axis, so its \(x\)-coordinate is 0.` },
          { value: pt(0, xi), why: R`For the \(y\)-intercept set \(x = 0\), then solve for \(y\).` },
          pt(0, -yi),
          pt(0, C),
        ],
    solution: askX
      ? [R`On the \(x\)-axis, \(y = 0\). Substitute: \(${terms([[A, 'x']])} = ${C}\).`, R`${A === 1 ? 'So' : R`Divide by \(${A}\):`} \(x = ${xi}\). The \(x\)-intercept is \(${point(xi, 0)}\).`]
      : [R`On the \(y\)-axis, \(x = 0\). Substitute: \(${terms([[B, 'y']])} = ${C}\).`, R`${B === 1 ? 'So' : R`Divide by \(${B}\):`} \(y = ${yi}\). The \(y\)-intercept is \(${point(0, yi)}\).`],
    rule: 3,
    skill: 'intercepts',
    check: () => (A * xi === C && B * yi === C ? true : 'intercepts do not satisfy the equation'),
  });
}

function mediumNthTerm(rng) {
  const a1 = rng.int(-12, 25);
  const d = rng.intExcept(-9, 9, [-1, 0, 1]);
  const start = R`An arithmetic sequence starts \(${seqTex(a1, d)}, \dots\)`;
  if (rng.bool()) {
    const n = rng.int(15, 60);
    const an = a1 + (n - 1) * d;
    return q({
      prompt: `${start} What is the ${ordinal(n)} term?`,
      correct: an,
      wrong: [
        { value: a1 + n * d, why: `The first term is already term number 1, so the common difference is added only ${n - 1} times.` },
        { value: n * d, why: R`That leaves out the first term, \(${a1}\).` },
        an - d,
        a1 * n,
      ],
      solution: [
        R`The common difference is \(d = ${a1 + d} - ${paren(a1)} = ${d}\).`,
        R`Use \(a_n = a_1 + (n - 1)d\) with \(a_1 = ${a1}\) and \(n = ${n}\): \(a_{${n}} = ${a1} + ${n - 1} \cdot ${paren(d)}\).`,
        R`\(a_{${n}} = ${a1} + ${paren((n - 1) * d)} = ${an}\).`,
      ],
      rule: 5,
      skill: 'arithmetic sequences',
      check: () => {
        let t = a1;
        for (let i = 1; i < n; i++) t += d;
        return checkEqual(t, an);
      },
    });
  }
  const form = (k, c) => R`\(a_n = ${linear(k, c, 'n')}\)`;
  return q({
    prompt: R`${start} Which formula gives the \(n\)th term?`,
    correct: form(d, a1 - d),
    wrong: [
      { value: form(d, a1), why: R`Test \(n = 1\): the formula must give the first term, \(${a1}\). This one gives \(${a1 + d}\).` },
      { value: form(a1, d), why: R`The number multiplying \(n\) is the common difference, \(${d}\), because the terms change by that much each step.` },
      form(d, a1 + d),
      form(-d, a1 + d),
    ],
    solution: [
      R`The common difference is \(d = ${d}\), so the sequence is a linear function of \(n\) with slope \(${d}\).`,
      R`\(a_n = a_1 + (n - 1)d = ${terms([[a1, ''], [d, '(n - 1)']])}\).`,
      R`Distribute and combine: \(a_n = ${linear(d, a1 - d, 'n')}\). Check \(n = 1\): \(${d} ${signed(a1 - d)} = ${a1}\). ✓`,
    ],
    rule: 5,
    skill: 'arithmetic sequences',
    check: () => ([1, 2, 3, 4].every((n) => d * n + (a1 - d) === a1 + (n - 1) * d) ? true : 'formula does not reproduce the sequence'),
  });
}

const CHARGES = [
  { m: [35, 90], b: [40, 95], who: 'A plumber', fixed: 'a call-out fee', units: 'hours of work', x: 'h', rate: 'The charge for each hour of work', start: 'The call-out fee, charged before any work is done', others: ['The total cost of the job', 'The number of hours worked'] },
  { m: [2, 5], b: [6, 12], who: 'A taxi firm', fixed: 'a starting fare', units: 'kilometres', x: 'k', rate: 'The charge for each kilometre travelled', start: 'The starting fare, charged before the taxi moves', others: ['The total cost of the ride', 'The number of kilometres travelled'] },
  { m: [15, 45], b: [50, 99], who: 'A gym', fixed: 'a joining fee', units: 'months', x: 'm', rate: 'The charge for each month of membership', start: 'The joining fee, paid once at the start', others: ['The total paid after several months', 'The number of months of membership'] },
  { m: [2, 9], b: [12, 40], who: 'A print shop', fixed: 'a set-up fee', units: 'posters', x: 'p', rate: 'The charge for each poster printed', start: 'The set-up fee, charged once for the whole order', others: ['The total cost of the order', 'The number of posters printed'] },
  { m: [12, 30], b: [35, 60], who: 'A boat-hire company', fixed: 'a booking fee', units: 'hours', x: 'h', rate: 'The charge for each hour on the water', start: 'The booking fee, paid before the hire starts', others: ['The total cost of the hire', 'The number of hours on the water'] },
];

function mediumStoryInterpret(rng) {
  const c = rng.pick(CHARGES);
  const m = rng.int(...c.m);
  const b = rng.intExcept(c.b[0], c.b[1], [m]);
  const per = c.units.split(' ')[0].replace(/s$/, '');
  const story = `${c.who} charges ${c.fixed} of ${money(b)} plus ${money(m)} per ${per}.`;
  const kind = rng.pick(['write', 'slope', 'start']);
  if (kind === 'write') {
    const form = (tex) => R`\(C = ${tex}\)`;
    return q({
      prompt: R`${story} Which equation gives the total cost \(C\), in dollars, for \(${c.x}\) ${c.units}?`,
      correct: form(`${m}${c.x} + ${b}`),
      wrong: [
        { value: form(`${b}${c.x} + ${m}`), why: `The ${money(m)} repeats for every ${per}, so it multiplies the variable. The ${money(b)} is charged once.` },
        { value: form(`${m + b}${c.x}`), why: `Only the ${money(m)} is charged again for each ${per}. The fee is added once.` },
        form(`${m}${c.x} - ${b}`),
        form(`${m} + ${b} + ${c.x}`),
      ],
      solution: [
        `Two things make up the cost: an amount that repeats for every ${per}, and a fee that is charged once.`,
        R`The repeating part is \(${m}${c.x}\) (the rate times the number of ${c.units}). The one-time part is \(${b}\).`,
        R`So \(C = ${m}${c.x} + ${b}\). The slope is \(${m}\) and the \(C\)-intercept is \(${b}\).`,
      ],
      rule: 6,
      skill: 'linear models',
    });
  }
  const askSlope = kind === 'slope';
  return q({
    prompt: R`${story} The total cost in dollars for \(${c.x}\) ${c.units} is \(C = ${m}${c.x} + ${b}\). What does the number ${askSlope ? m : b} represent?`,
    correct: askSlope ? c.rate : c.start,
    wrong: [
      { value: askSlope ? c.start : c.rate, why: askSlope ? R`The one-time fee is the constant term, \(${b}\). The number multiplying \(${c.x}\) is charged again for every ${per}.` : R`The charge that repeats is the number multiplying \(${c.x}\), which is \(${m}\). The constant term is charged once.` },
      c.others[0],
      c.others[1],
    ],
    solution: askSlope
      ? [R`\(${m}\) multiplies \(${c.x}\), so it is the slope: the amount \(C\) goes up for each extra ${per}.`, `In the story that is ${money(m)} per ${per}: ${c.rate[0].toLowerCase()}${c.rate.slice(1)}.`]
      : [R`\(${b}\) is the constant term, so it is the value of \(C\) when \(${c.x} = 0\): the starting value.`, `In the story that is the fee of ${money(b)}: ${c.start[0].toLowerCase()}${c.start.slice(1)}.`],
    rule: 6,
    skill: 'slope and intercept in context',
  });
}

// ───────────── Hard ─────────────

function hardParallelPerp(rng) {
  const p = rng.nonzero(-5, 5);
  const den = rng.int(1, 4);
  if (gcd(p, den) !== 1 || (Math.abs(p) === 1 && den === 1)) return hardParallelPerp(rng);
  const m0 = frac(p, den);
  const b0 = rng.int(-8, 8);
  const perp = rng.bool();
  const m = perp ? frac(-den, p) : m0;
  const x1 = m.d * rng.nonzero(-3, 3);
  const y1 = rng.int(-8, 8);
  const through = (slope) => F(y1).sub(slope.mul(x1)); // intercept of the line with this slope through the point
  const b = through(m);
  if (b.eq(b0)) return hardParallelPerp(rng);
  const otherSlope = perp ? m0 : frac(-den, p);
  return q({
    prompt: R`Which line passes through \(${point(x1, y1)}\) and is **${perp ? 'perpendicular' : 'parallel'}** to \(${lineEq(m0, b0)}\)?`,
    correct: eq(m, b),
    wrong: perp
      ? [
          { value: eq(otherSlope, through(otherSlope)), why: 'That line has the same slope as the given one, so it is parallel to it.' },
          { value: eq(m.neg(), through(m.neg())), why: R`Flip the slope **and** change its sign. The two slopes must multiply to \(-1\).` },
          { value: eq(m0.neg(), through(m0.neg())), why: R`Changing the sign is half of it. Also flip the fraction: the negative reciprocal of \(${m0.tex()}\) is \(${m.tex()}\).` },
          eq(m, y1),
        ]
      : [
          { value: eq(otherSlope, through(otherSlope)), why: 'That line is perpendicular to the given one. Parallel lines have the same slope.' },
          { value: eq(m, y1), why: R`The slope is right. Now substitute \(${point(x1, y1)}\) to find \(b\); it equals \(${y1}\) only when \(x = 0\).` },
          eq(m.neg(), through(m.neg())),
          eq(m, F(y1).add(m.mul(x1))),
        ],
    solution: [
      perp ? R`The given slope is \(${m0.tex()}\). A perpendicular line has the negative reciprocal slope: \(m = ${m.tex()}\).` : R`Parallel lines have the same slope, so \(m = ${m.tex()}\).`,
      R`Substitute the point into \(y = mx + b\): \(${y1} = ${m.tex()} \cdot ${paren(x1)} + b\), so \(${y1} = ${m.mul(x1).tex()} + b\) and \(b = ${b.tex()}\).`,
      R`The line is \(${lineEq(m, b)}\).`,
    ],
    rule: 4,
    skill: 'parallel and perpendicular lines',
    check: () => (m.mul(x1).add(b).eq(y1) && (perp ? m.mul(m0).eq(-1) : m.eq(m0)) ? true : 'line fails the point or the slope condition'),
  });
}

function hardFractionSlope(rng) {
  const den = rng.int(2, 5);
  const top = rng.nonzero(-7, 7);
  if (gcd(top, den) !== 1) return hardFractionSlope(rng);
  const m = frac(top, den);
  const b = rng.nonzero(-8, 8);
  const i = rng.int(-3, 2);
  const j = rng.intExcept(i + 1, 4, [i]);
  const [x1, x2] = [den * i, den * j];
  const [y1, y2] = [top * i + b, top * j + b];
  return q({
    prompt: R`Which equation is the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\)?`,
    correct: eq(m, b),
    wrong: [
      { value: eq(m.inv(), b), why: R`Slope is the change in \(y\) over the change in \(x\): \(${fracTex(y2 - y1, x2 - x1)}\).` },
      { value: eq(m.neg(), b), why: 'Subtract the coordinates in the same order on the top and on the bottom.' },
      x1 !== 0 ? eq(m, y1) : eq(m, y2),
      eq(m, -b),
    ],
    solution: [
      R`Slope: \(m = \dfrac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}} = ${fracTex(y2 - y1, x2 - x1)}${m.tex() === fracTex(y2 - y1, x2 - x1) ? '' : ` = ${m.tex()}`}\).`,
      R`Substitute \(${point(x1, y1)}\) into \(y = mx + b\): \(${y1} = ${m.tex()} \cdot ${paren(x1)} + b\), so \(${y1} = ${top * i} + b\) and \(b = ${b}\).`,
      R`The line is \(${lineEq(m, b)}\).`,
    ],
    rule: 2,
    skill: 'writing linear equations',
    check: () => (m.mul(x1).add(b).eq(y1) && m.mul(x2).add(b).eq(y2) ? true : 'the line misses a point'),
  });
}

function hardWhichTerm(rng) {
  const a1 = rng.int(-20, 30);
  const d = rng.intExcept(-12, 12, [-2, -1, 0, 1, 2]);
  const n = rng.int(12, 45);
  const v = a1 + (n - 1) * d;
  return q({
    prompt: R`An arithmetic sequence starts \(${seqTex(a1, d, 3)}, \dots\) Which term of the sequence is equal to \(${v}\)?`,
    correct: n,
    fmt: (k) => `The ${ordinal(k)} term`,
    wrong: [
      { value: n - 1, why: R`\(${fracTex(v - a1, d)} = ${n - 1}\) counts the steps from the first term. The term number is one more than the number of steps.` },
      n + 1,
      n - 2,
      n + 2,
    ],
    solution: [
      R`The common difference is \(d = ${d}\), so \(a_n = ${a1} + (n - 1) \cdot ${paren(d)}\).`,
      R`Set this equal to \(${v}\): \((n - 1) \cdot ${paren(d)} = ${v} - ${paren(a1)} = ${v - a1}\).`,
      R`Divide by \(${d}\): \(n - 1 = ${n - 1}\), so \(n = ${n}\).`,
    ],
    rule: 5,
    skill: 'arithmetic sequences',
    check: () => {
      let t = a1;
      for (let i = 1; i < n; i++) t += d;
      return checkEqual(t, v);
    },
  });
}

const STEADY = [
  { rate: [4, 15], start: [10, 60], unit: 'cm', time: 'weeks', text: (t1, v1, t2, v2) => `A bamboo shoot grows at a steady rate. It is ${v1} cm tall after ${t1} weeks and ${v2} cm tall after ${t2} weeks.`, ask: (t) => `How tall is it after ${t} weeks?` },
  { rate: [2, 6], start: [3, 12], unit: 'dollars', time: 'kilometres', text: (t1, v1, t2, v2) => `A taxi fare is a fixed starting charge plus a steady charge per kilometre. A ${t1} km ride costs ${money(v1)} and a ${t2} km ride costs ${money(v2)}.`, ask: (t) => `How much does a ride of ${t} km cost?` },
  { rate: [20, 60], start: [100, 500], unit: 'litres', time: 'minutes', text: (t1, v1, t2, v2) => `A pool is being filled at a steady rate. It holds ${v1} litres after ${t1} minutes and ${v2} litres after ${t2} minutes.`, ask: (t) => `How much water does it hold after ${t} minutes?` },
  { rate: [-12, -5], start: [150, 240], unit: 'mm', time: 'hours', text: (t1, v1, t2, v2) => `A candle burns down at a steady rate. It is ${v1} mm tall after ${t1} hours and ${v2} mm tall after ${t2} hours.`, ask: (t) => `How tall is it after ${t} hours?` },
];

function hardStoryTwoPoints(rng) {
  const c = rng.pick(STEADY);
  const r = rng.int(...c.rate);
  const s = rng.int(...c.start);
  const t1 = rng.int(2, 3);
  const t2 = t1 + rng.int(2, 3);
  const t3 = t2 + rng.int(2, 4);
  const at = (t) => s + r * t;
  const [v1, v2, v3] = [at(t1), at(t2), at(t3)];
  const prop = tryFrac(v2 * t3, t2);
  return q({
    prompt: `${c.text(t1, v1, t2, v2)} ${c.ask(t3)}`,
    correct: v3,
    unit: c.unit,
    wrong: [
      prop?.isInt() ? { value: prop, why: 'That treats the two quantities as proportional. They are not, because the amount is not 0 at the start. Find the rate and the starting value.' } : null,
      v2 + r * t3 > 0 ? { value: v2 + r * t3, why: R`From ${t2} to ${t3} ${c.time} is only \(${t3 - t2}\) more, so add \(${paren(r)} \cdot ${t3 - t2}\) to the second reading.` } : null,
      r > 0 ? { value: r * t3, why: R`That leaves out the starting value, \(${s}\).` } : { value: v2, why: `That is the second reading. The amount keeps changing between ${t2} and ${t3} ${c.time}.` },
      v3 + r,
      v3 - r,
    ],
    solution: [
      R`Treat the two facts as points \(${point(t1, v1)}\) and \(${point(t2, v2)}\). Rate (slope): \(${fracTex(v2 - v1, t2 - t1)} = ${r}\) ${c.unit} per ${c.time.replace(/s$/, '')}.`,
      R`Starting value (intercept): \(${v1} - ${paren(r)} \cdot ${t1} = ${s}\). So \(y = ${linear(r, s)}\).`,
      R`At \(x = ${t3}\): \(y = ${r}(${t3}) + ${s} = ${v3}\) ${c.unit}.`,
    ],
    rule: 6,
    skill: 'linear models',
    check: () => checkEqual(v2 + ((v2 - v1) / (t2 - t1)) * (t3 - t2), v3),
  });
}

// ───────────── Challenge ─────────────

function challengeMissingCoordinate(rng) {
  const den = rng.pick([1, 1, 2, 3]);
  const top = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].filter((n) => den === 1 || n % den !== 0));
  const m = frac(top, den);
  const x1 = rng.int(-6, 6);
  const dx = den * rng.intExcept(-3, 3, [-1, 0, 1]);
  const x2 = x1 + dx;
  const y1 = rng.int(-8, 8);
  const dy = (top * dx) / den;
  const y2 = y1 + dy;
  const asK = (v) => R`\(k = ${num(v)}\)`;
  const check = () => checkEqual((y2 - y1) / (x2 - x1), m.value);
  if (rng.bool(0.6)) {
    return q({
      prompt: R`The line through \(${point(x1, y1)}\) and \((${x2}, k)\) has slope \(${m.tex()}\). What is \(k\)?`,
      correct: y2,
      fmt: asK,
      wrong: [
        { value: F(y1).add(m), why: R`The slope is the change in \(y\) for each 1 unit of \(x\). Here \(x\) changes by \(${dx}\) units.` },
        { value: dy, why: R`That is the change in \(y\). Add it to the starting \(y\)-value, \(${y1}\).` },
        y1 - dy,
        y1 + dx,
      ],
      solution: [
        R`Write the slope with the unknown: \(\dfrac{k - ${paren(y1)}}{${x2} - ${paren(x1)}} = ${m.tex()}\), so \(\dfrac{k - ${paren(y1)}}{${dx}} = ${m.tex()}\).`,
        R`Multiply both sides by \(${dx}\): \(k - ${paren(y1)} = ${dy}\).`,
        R`So \(k = ${y1} + ${paren(dy)} = ${y2}\).`,
      ],
      rule: 0,
      skill: 'slope',
      check,
    });
  }
  return q({
    prompt: R`The line through \(${point(x1, y1)}\) and \((k, ${y2})\) has slope \(${m.tex()}\). What is \(k\)?`,
    correct: x2,
    fmt: asK,
    wrong: [
      { value: F(x1).add(m.mul(dy)), why: R`Rise \(=\) slope \(\times\) run, so the run is the rise divided by the slope: \(${dy} \div ${den === 1 && top > 0 ? top : `\\left(${m.tex()}\\right)`} = ${dx}\).` },
      { value: dx, why: R`That is the change in \(x\). Add it to the starting \(x\)-value, \(${x1}\).` },
      x1 - dx,
      x1 + dy,
    ],
    solution: [
      R`Write the slope with the unknown: \(\dfrac{${y2} - ${paren(y1)}}{k - ${paren(x1)}} = ${m.tex()}\), so \(\dfrac{${dy}}{k - ${paren(x1)}} = ${m.tex()}\).`,
      R`The run is the rise divided by the slope: \(k - ${paren(x1)} = ${dx}\).`,
      R`So \(k = ${x1} + ${paren(dx)} = ${x2}\).`,
    ],
    rule: 0,
    skill: 'slope',
    check,
  });
}

function challengeRelationship(rng) {
  const A = rng.nonzero(-6, 6);
  const B = rng.intExcept(-6, 6, [0, A, -A]);
  const C = rng.nonzero(-12, 12);
  const kind = rng.pick(['parallel', 'perpendicular', 'same', 'neither']);
  const k = rng.pick([-3, -2, 2, 3]);
  const C2 = rng.nonzero(-12, 12);
  const [A2, B2, D] = { parallel: [k * A, k * B, k * C + rng.nonzero(-9, 9)], same: [k * A, k * B, k * C], perpendicular: rng.bool() ? [B, -A, C2] : [-B, A, C2], neither: rng.bool() ? [A, -B, C2] : [B, A, C2] }[kind];
  const [m1, m2] = [frac(-A, B), frac(-A2, B2)];
  const [b1, b2] = [frac(C, B), frac(D, B2)];
  const NAMES = { parallel: 'Parallel', perpendicular: 'Perpendicular', same: 'The same line', neither: 'Neither parallel nor perpendicular' };
  const notes = {
    parallel: { same: R`The slopes match, but the \(y\)-intercepts are \(${b1.tex()}\) and \(${b2.tex()}\). Different intercepts mean two separate lines.` },
    same: { parallel: R`The \(y\)-intercepts match too: both are \(${b1.tex()}\). Multiplying the first equation by \(${k}\) gives the second one exactly.` },
    perpendicular: { neither: R`Multiply the slopes: \(${m1.tex()} \cdot ${paren(m2)} = -1\). That is the test for perpendicular lines.` },
    neither: { perpendicular: R`The slopes multiply to \(${m1.mul(m2).tex()}\), not \(-1\).`, parallel: R`The slopes are \(${m1.tex()}\) and \(${m2.tex()}\). Parallel lines need equal slopes.` },
  }[kind];
  const last = {
    parallel: R`The slopes are equal and the \(y\)-intercepts (\(${b1.tex()}\) and \(${b2.tex()}\)) are different, so the lines are parallel.`,
    same: R`The slopes are equal and both \(y\)-intercepts are \(${b1.tex()}\), so the two equations describe the same line.`,
    perpendicular: R`The slopes multiply to \(-1\), so the lines are perpendicular.`,
    neither: R`The slopes are not equal, and their product is \(${m1.mul(m2).tex()}\), not \(-1\). The lines are neither parallel nor perpendicular.`,
  }[kind];
  return q({
    prompt: R`How are these two lines related? \(\;${terms([[A, 'x'], [B, 'y']])} = ${C}\;\) and \(\;${terms([[A2, 'x'], [B2, 'y']])} = ${D}\)`,
    correct: NAMES[kind],
    wrong: Object.keys(NAMES).filter((n) => n !== kind).map((n) => (notes[n] ? { value: NAMES[n], why: notes[n] } : NAMES[n])),
    solution: [
      R`Solve each equation for \(y\). First line: \(${lineEq(m1, b1)}\). Second line: \(${lineEq(m2, b2)}\).`,
      R`The slopes are \(${m1.tex()}\) and \(${m2.tex()}\).`,
      last,
    ],
    rule: 4,
    skill: 'parallel and perpendicular lines',
    check: () => {
      const cross = A * B2 - A2 * B;
      const dotp = A * A2 + B * B2;
      const found = cross === 0 ? (A * D === A2 * C ? 'same' : 'parallel') : dotp === 0 ? 'perpendicular' : 'neither';
      return found === kind ? true : `lines are ${found}, not ${kind}`;
    },
  });
}

function challengeTwoTerms(rng) {
  const d = rng.intExcept(-9, 9, [-1, 0, 1]);
  const a1 = rng.int(-20, 30);
  const p = rng.int(3, 7);
  const r = p + rng.int(3, 6);
  const n = rng.int(20, 40);
  const term = (k) => a1 + (k - 1) * d;
  return q({
    prompt: R`In an arithmetic sequence, the ${ordinal(p)} term is \(${term(p)}\) and the ${ordinal(r)} term is \(${term(r)}\). What is the ${ordinal(n)} term?`,
    correct: term(n),
    wrong: [
      { value: term(p) + (n - p) * (term(r) - term(p)), why: R`There are \(${r - p}\) steps between those two terms, so the common difference is \(${fracTex(term(r) - term(p), r - p)} = ${d}\).` },
      { value: term(r) + n * d, why: `From the ${ordinal(r)} term to the ${ordinal(n)} term is ${n - r} steps, not ${n}.` },
      term(n + 1),
      term(n - 1),
    ],
    solution: [
      R`From the ${ordinal(p)} term to the ${ordinal(r)} term is \(${r - p}\) steps, and the value changes by \(${term(r)} - ${paren(term(p))} = ${term(r) - term(p)}\).`,
      R`Common difference: \(d = ${fracTex(term(r) - term(p), r - p)} = ${d}\).`,
      R`From the ${ordinal(r)} term to the ${ordinal(n)} term is \(${n - r}\) more steps: \(${term(r)} + ${n - r} \cdot ${paren(d)} = ${term(n)}\).`,
    ],
    rule: 5,
    skill: 'arithmetic sequences',
    check: () => {
      const seq = [a1];
      for (let i = 1; i < n; i++) seq.push(seq[i - 1] + d);
      return seq[p - 1] === term(p) && seq[r - 1] === term(r) && seq[n - 1] === term(n) ? true : 'terms do not fit one arithmetic sequence';
    },
  });
}

function challengeStandardForm(rng) {
  const dx = rng.int(2, 5);
  const dy = rng.nonzero(-5, 5);
  if (gcd(dx, dy) !== 1) return challengeStandardForm(rng);
  const x1 = rng.int(-6, 6);
  const y1 = rng.int(-6, 6);
  const k = rng.pick([1, 2]);
  const [x2, y2] = [x1 + k * dx, y1 + k * dy];
  const sgn = dy < 0 ? -1 : 1;
  const [A, B, C] = [sgn * dy, -sgn * dx, sgn * (dy * x1 - dx * y1)];
  const swapC = dx * x1 - dy * y1;
  if (C === 0) return challengeStandardForm(rng);
  const m = frac(dy, dx);
  return q({
    prompt: R`Which equation, in standard form, is the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\)?`,
    correct: std(A, B, C),
    wrong: [
      { value: std(A, -B, C), why: R`Test both points in that equation. Only one sign pattern fits both; watch the sign of the \(y\)-term when it changes sides.` },
      { value: std(dx, -dy, swapC), why: R`That line has slope \(${frac(dx, dy).tex()}\). The slope here is rise over run, \(${m.tex()}\).` },
      std(A, B, -C),
      std(A, B, C + A),
    ],
    solution: [
      R`Slope: \(${fracTex(y2 - y1, x2 - x1)}${k === 1 ? '' : ` = ${m.tex()}`}\).`,
      R`Point-slope form with \(${point(x1, y1)}\): \(${yMinus(y1)} = ${timesTex(m, linear(1, -x1))}\).`,
      R`Multiply both sides by \(${dx}\) to clear the fraction: \(${timesTex(dx, yMinus(y1))} = ${timesTex(dy, linear(1, -x1))}\), which is \(${terms([[dx, 'y'], [-dx * y1, '']])} = ${terms([[dy, 'x'], [-dy * x1, '']])}\).`,
      R`Collect the \(x\) and \(y\) terms on one side${sgn < 0 ? ' and make the first coefficient positive' : ''}: \(${terms([[A, 'x'], [B, 'y']])} = ${C}\).`,
    ],
    rule: 3,
    skill: 'standard form',
    check: () => (A * x1 + B * y1 === C && A * x2 + B * y2 === C ? true : 'a point does not satisfy the equation'),
  });
}

// ───────────── Interactive models ─────────────

function twoPointModel({ x1, y1, x2, y2 }) {
  if (x1 === x2 && y1 === y2) return { error: 'Those are the same point, and many lines pass through one point. Change one of the coordinates.' };
  const problem = R`Find the equation of the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\).`;
  const pts = [{ x: x1, y: y1, label: pointText(x1, y1) }, { x: x2, y: y2, label: pointText(x2, y2) }];
  const [lo, hi] = [Math.min(x1, x2) - 3, Math.max(x1, x2) + 3];
  if (x1 === x2) {
    return {
      problem,
      steps: [
        R`Change in \(y\): \(${y2} - ${paren(y1)} = ${y2 - y1}\). Change in \(x\): \(${x2} - ${paren(x1)} = 0\).`,
        R`The run is 0, and division by 0 is not possible, so the slope of this line is not defined. The line is vertical.`,
        R`Every point on it has \(x = ${x1}\), and that is its equation. It cannot be written as \(y = mx + b\).`,
      ],
      answer: R`\(x = ${x1}\) (a vertical line)`,
      visual: { type: 'plot', x: [lo, hi], y: [Math.min(y1, y2) - 3, Math.max(y1, y2) + 3], vlines: [{ x: x1, dashed: false, color: 'a' }], points: pts, alt: `A vertical line through ${pointText(x1, y1)} and ${pointText(x2, y2)}.` },
    };
  }
  const m = frac(y2 - y1, x2 - x1);
  const b = F(y1).sub(m.mul(x1));
  const f = (x) => m.value * x + b.value;
  const raw = fracTex(y2 - y1, x2 - x1);
  const steps = [
    R`Slope: \(m = \dfrac{y_2 - y_1}{x_2 - x_1} = \dfrac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}} = ${raw}${m.tex() === raw ? '' : ` = ${m.tex()}`}\).`,
  ];
  if (m.n === 0) steps.push(R`A slope of 0 means the line is horizontal: every point has \(y = ${y1}\).`);
  else {
    steps.push(R`Point-slope form with \(${point(x1, y1)}\): \(${yMinus(y1)} = ${x1 === 0 ? terms([[m, 'x']]) : timesTex(m, linear(1, -x1))}\).`);
    steps.push(R`Distribute and solve for \(y\): \(${lineEq(m, b)}\).`);
  }
  steps.push(R`Check the other point: when \(x = ${x2}\), \(y = ${m.mul(x2).add(b).tex()}\). ✓`);
  return {
    problem,
    steps,
    answer: R`\(${lineEq(m, b)}\) (slope \(${m.tex()}\), \(y\)-intercept \(${b.tex()}\))`,
    visual: { type: 'plot', x: [lo, hi], y: fitY(f, lo, hi), fns: [{ f }], points: pts, alt: `Graph of the line through ${pointText(x1, y1)} and ${pointText(x2, y2)}, with slope ${m.text()}.` },
  };
}

function standardModel({ A, B, C }) {
  if (A === 0 && B === 0) return { error: 'With A = 0 and B = 0 there is no x or y left, so there is no line. Give A or B a value other than 0.' };
  const problem = R`Graph \(${terms([[A, 'x'], [B, 'y']])} = ${C}\) using its intercepts.`;
  if (B === 0) {
    const x0 = frac(C, A);
    return {
      problem,
      steps: [R`There is no \(y\)-term, so the equation only fixes \(x\): \(x = ${x0.tex()}\).`, R`Every point with that \(x\)-value is on the line, so the line is vertical. It has an \(x\)-intercept, \((${x0.tex()}, 0)\), and its slope is not defined.`],
      answer: R`\(x = ${x0.tex()}\) (a vertical line)`,
      visual: { type: 'plot', x: [x0.value - 5, x0.value + 5], y: [-5, 5], vlines: [{ x: x0.value, dashed: false, color: 'a' }], points: [{ x: x0.value, y: 0, label: pointText(x0, 0) }], alt: `A vertical line crossing the x-axis at ${x0.text()}.` },
    };
  }
  const yi = frac(C, B);
  const m = frac(-A, B);
  const f = (x) => m.value * x + yi.value;
  if (A === 0) {
    return {
      problem,
      steps: [R`There is no \(x\)-term, so the equation only fixes \(y\): \(y = ${yi.tex()}\).`, R`Every point with that \(y\)-value is on the line, so the line is horizontal. Its slope is 0 and its \(y\)-intercept is \((0, ${yi.tex()})\).`],
      answer: R`\(y = ${yi.tex()}\) (a horizontal line, slope 0)`,
      visual: { type: 'plot', x: [-5, 5], y: fitY(f, -5, 5), fns: [{ f }], points: [{ x: 0, y: yi.value, label: pointText(0, yi) }], alt: `A horizontal line crossing the y-axis at ${yi.text()}.` },
    };
  }
  const xi = frac(C, A);
  const [lo, hi] = [Math.min(0, xi.value) - 3, Math.max(0, xi.value) + 3];
  const pts = C === 0 ? [{ x: 0, y: 0, label: '(0, 0)' }] : [{ x: xi.value, y: 0, label: pointText(xi, 0) }, { x: 0, y: yi.value, label: pointText(0, yi) }];
  return {
    problem,
    steps: [
      R`\(x\)-intercept: set \(y = 0\). ${A === 1 ? R`That leaves \(x = ${xi.tex()}\).` : R`\(${terms([[A, 'x']])} = ${C}\), so \(x = ${xi.tex()}\).`} The point is \((${xi.tex()}, 0)\).`,
      R`\(y\)-intercept: set \(x = 0\). ${B === 1 ? R`That leaves \(y = ${yi.tex()}\).` : R`\(${terms([[B, 'y']])} = ${C}\), so \(y = ${yi.tex()}\).`} The point is \((0, ${yi.tex()})\).`,
      C === 0 ? R`Both intercepts are the origin, so one more point is needed. Solve for \(y\): \(${lineEq(m, 0)}\), and use the slope from \((0, 0)\).` : 'Plot the two intercepts and draw the line through them.',
      R`Solving for \(y\) gives \(${lineEq(m, yi)}\), so the slope is \(${m.tex()}\).`,
    ],
    answer: R`Intercepts \((${xi.tex()}, 0)\) and \((0, ${yi.tex()})\); slope \(${m.tex()}\)`,
    visual: { type: 'plot', x: [lo, hi], y: fitY(f, lo, hi), fns: [{ f }], points: pts, alt: `Graph of the line with x-intercept ${xi.text()} and y-intercept ${yi.text()}.` },
  };
}

export default {
  id: 'linear-functions',
  title: 'Linear Functions & Their Graphs',
  summary: 'Find slopes, write and graph line equations in three forms, and use them for parallel lines, sequences and stories.',
  standards: ['CCSS F-IF.C.7', 'CCSS F-LE.A.2', 'CCSS A-CED.A.2', 'CCSS F-BF.A.1', 'CCSS G-GPE.B.5'],

  explain: {
    intro: R`A linear function changes by the same amount for every 1-unit step in \(x\), so its graph is a straight line. Two numbers describe the line completely: how steep it is (the slope) and where it starts (an intercept or any one point). The different forms of the equation are just different ways to write those two facts.`,
    rules: [
      {
        title: 'Slope is rise over run',
        text: R`Between any two points on a line, slope \(m = \dfrac{y_2 - y_1}{x_2 - x_1}\): the change in \(y\) divided by the change in \(x\). A positive slope rises from left to right, a negative slope falls, and a slope of 0 is horizontal. A vertical line has a run of 0, so its slope is not defined.`,
        example: R`Through \((1, 2)\) and \((4, 11)\): \(m = \frac{11 - 2}{4 - 1} = \frac{9}{3} = 3\).`,
      },
      {
        title: 'Slope-intercept form: y = mx + b',
        text: R`\(m\) is the slope and \(b\) is the \(y\)-intercept, the value of \(y\) when \(x = 0\). To graph it, plot \((0, b)\), then use the slope to step to another point.`,
        example: R`\(y = 2x + 1\) crosses the \(y\)-axis at \((0, 1)\) and goes up 2 for every 1 to the right.`,
      },
      {
        title: 'Point-slope form: y − y₁ = m(x − x₁)',
        text: R`Use it to write the equation from a slope and any point \((x_1, y_1)\) on the line. Given two points, find the slope first. Distribute and solve for \(y\) to get slope-intercept form.`,
        example: R`Slope 3 through \((1, 2)\): \(y - 2 = 3(x - 1)\), so \(y = 3x - 1\).`,
      },
      {
        title: 'Standard form and intercepts',
        text: R`In standard form, \(Ax + By = C\), the intercepts are quick to find. Set \(y = 0\) to get the \(x\)-intercept and set \(x = 0\) to get the \(y\)-intercept. Solving for \(y\) shows that the slope is \(-\frac{A}{B}\).`,
        example: R`\(2x + 3y = 12\): \(x\)-intercept \((6, 0)\), \(y\)-intercept \((0, 4)\), slope \(-\frac{2}{3}\).`,
      },
      {
        title: 'Parallel and perpendicular lines',
        text: R`Parallel lines have the same slope and different intercepts. Perpendicular lines have slopes that are negative reciprocals: flip the fraction and change the sign, so the two slopes multiply to \(-1\).`,
        example: R`A line parallel to \(y = 2x + 5\) has slope 2. A line perpendicular to it has slope \(-\frac{1}{2}\).`,
      },
      {
        title: 'Arithmetic sequences are linear',
        text: R`An arithmetic sequence adds the same number, the common difference \(d\), at every step. Its \(n\)th term is \(a_n = a_1 + (n - 1)d\), a linear function of \(n\) whose slope is \(d\).`,
        example: R`\(7, 11, 15, \dots\) has \(d = 4\), so \(a_n = 7 + 4(n - 1) = 4n + 3\). The 20th term is 83.`,
      },
      {
        title: 'Slope and intercept in a story',
        text: R`In a real situation the slope is a rate: how much \(y\) changes for each 1 unit of \(x\), with units such as dollars per hour. The \(y\)-intercept is the starting value, the amount when \(x = 0\).`,
        example: R`\(C = 45h + 60\): a plumber charges $45 per hour (slope) on top of a $60 call-out fee (intercept).`,
      },
    ],
    vocab: [
      { term: 'slope', def: R`The steepness of a line: change in \(y\) divided by change in \(x\).` },
      { term: 'y-intercept', def: R`The point where the line crosses the \(y\)-axis, \((0, b)\).` },
      { term: 'x-intercept', def: R`The point where the line crosses the \(x\)-axis. Its \(y\)-coordinate is 0.` },
      { term: 'negative reciprocal', def: R`Flip a fraction and change its sign: the negative reciprocal of \(\frac{2}{3}\) is \(-\frac{3}{2}\).` },
      { term: 'common difference', def: 'The fixed amount added to each term of an arithmetic sequence to get the next term.' },
      { term: 'rate of change', def: 'How fast one quantity changes compared with another. For a line it is the slope.' },
    ],
    mistakes: [
      R`Putting the change in \(x\) on top. Slope is rise over run: \(y\) on top, \(x\) underneath.`,
      R`Subtracting in different orders: if the top is \(y_2 - y_1\), the bottom must be \(x_2 - x_1\).`,
      R`Using a point's \(y\)-value as \(b\). The intercept is the \(y\)-value at \(x = 0\) only.`,
      R`For a perpendicular line, changing only the sign or only flipping. Do both.`,
      R`Adding \(d\) too many times in a sequence: the \(n\)th term has \(n - 1\) steps after the first term.`,
    ],
    visual: {
      type: 'plot', x: [-3, 5], y: [-3, 8], step: [1, 1],
      fns: [{ f: (x) => 2 * x + 1, label: 'y = 2x + 1', labelAt: 3.1 }],
      segments: [{ from: [1, 3], to: [2, 3], dashed: true, label: 'run 1' }, { from: [2, 3], to: [2, 5], dashed: true, label: 'rise 2' }],
      points: [{ x: 0, y: 1, label: '(0, 1)' }, { x: 1, y: 3 }, { x: 2, y: 5 }],
      alt: 'Graph of y = 2x + 1. It crosses the y-axis at (0, 1). From (1, 3) a step of 1 to the right and 2 up reaches (2, 5), showing a slope of 2.',
    },
  },

  examples: [
    {
      title: 'A line through two points',
      problem: R`Find the equation of the line through \((1, 2)\) and \((4, 11)\).`,
      steps: [
        R`Slope: \(m = \frac{11 - 2}{4 - 1} = \frac{9}{3} = 3\).`,
        R`Point-slope form with \((1, 2)\): \(y - 2 = 3(x - 1)\).`,
        R`Distribute: \(y - 2 = 3x - 3\). Add 2: \(y = 3x - 1\).`,
        R`Check the other point: \(3(4) - 1 = 11\). ✓`,
      ],
      answer: R`\(y = 3x - 1\)`,
      visual: {
        type: 'plot', x: [-2, 6], y: [-4, 14],
        fns: [{ f: (x) => 3 * x - 1, label: 'y = 3x − 1', labelAt: 2.4 }],
        points: [{ x: 1, y: 2, label: '(1, 2)' }, { x: 4, y: 11, label: '(4, 11)' }],
        alt: 'Graph of the line y = 3x − 1 passing through the points (1, 2) and (4, 11).',
      },
    },
    {
      title: 'Graphing from standard form',
      problem: R`Find the intercepts and the slope of \(2x + 3y = 12\).`,
      steps: [
        R`\(x\)-intercept: set \(y = 0\). \(2x = 12\), so \(x = 6\). Point \((6, 0)\).`,
        R`\(y\)-intercept: set \(x = 0\). \(3y = 12\), so \(y = 4\). Point \((0, 4)\).`,
        R`Slope between the intercepts: \(\frac{0 - 4}{6 - 0} = -\frac{2}{3}\).`,
        R`The same slope appears when you solve for \(y\): \(y = -\frac{2}{3}x + 4\).`,
      ],
      answer: R`Intercepts \((6, 0)\) and \((0, 4)\); slope \(-\frac{2}{3}\)`,
      visual: {
        type: 'plot', x: [-2, 8], y: [-2, 6], step: [1, 1],
        fns: [{ f: (x) => (-2 / 3) * x + 4 }],
        points: [{ x: 6, y: 0, label: '(6, 0)' }, { x: 0, y: 4, label: '(0, 4)' }],
        alt: 'Graph of 2x + 3y = 12, a falling line through (0, 4) and (6, 0).',
      },
    },
    {
      title: 'A perpendicular line',
      problem: R`Write the equation of the line through \((2, -1)\) that is perpendicular to \(y = 2x + 5\).`,
      steps: [
        R`The given line has slope 2. The perpendicular slope is the negative reciprocal: \(-\frac{1}{2}\).`,
        R`Point-slope form: \(y + 1 = -\frac{1}{2}(x - 2)\).`,
        R`Distribute: \(y + 1 = -\frac{1}{2}x + 1\). Subtract 1: \(y = -\frac{1}{2}x\).`,
        R`Check: the slopes multiply to \(2 \cdot \left(-\frac{1}{2}\right) = -1\). ✓`,
      ],
      answer: R`\(y = -\frac{1}{2}x\)`,
    },
    {
      title: 'An arithmetic sequence',
      problem: R`The sequence \(7, 11, 15, 19, \dots\) is arithmetic. Write a formula for the \(n\)th term and find the 20th term.`,
      steps: [
        R`Common difference: \(11 - 7 = 4\).`,
        R`\(a_n = a_1 + (n - 1)d = 7 + 4(n - 1)\).`,
        R`Simplify: \(a_n = 4n + 3\). This is a line with slope 4.`,
        R`20th term: \(a_{20} = 4(20) + 3 = 83\).`,
      ],
      answer: R`\(a_n = 4n + 3\); the 20th term is 83`,
    },
    {
      title: 'Word problem: a burning candle',
      word: true,
      problem: 'A candle is 20 cm tall when it is lit and burns down 1.5 cm every hour. Write an equation for its height, say what the slope and intercept mean, and find when it is 11 cm tall.',
      steps: [
        R`The height starts at 20 and drops by 1.5 for each hour, a constant rate. So \(h = -1.5t + 20\), where \(t\) is time in hours.`,
        R`Slope \(-1.5\): the height falls 1.5 cm per hour. Intercept 20: the height at \(t = 0\), when the candle is lit.`,
        R`Set \(h = 11\): \(-1.5t + 20 = 11\), so \(-1.5t = -9\) and \(t = 6\).`,
      ],
      answer: R`\(h = -1.5t + 20\); the candle is 11 cm tall after 6 hours`,
    },
  ],

  models: [
    {
      id: 'two-points',
      title: 'The line through two points',
      intro: 'Choose two points. Try making the x-values equal, or the y-values equal.',
      inputs: [
        { name: 'x1', label: 'First point: x', type: 'int', min: -10, max: 10, value: 1 },
        { name: 'y1', label: 'First point: y', type: 'int', min: -12, max: 12, value: 2 },
        { name: 'x2', label: 'Second point: x', type: 'int', min: -10, max: 10, value: 4 },
        { name: 'y2', label: 'Second point: y', type: 'int', min: -12, max: 12, value: 11 },
      ],
      compute: twoPointModel,
    },
    {
      id: 'standard-form',
      title: 'Intercepts of Ax + By = C',
      intro: 'Choose A, B and C. Set A or B to 0 to see a horizontal or vertical line.',
      inputs: [
        { name: 'A', label: 'A (coefficient of x)', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'B', label: 'B (coefficient of y)', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'C', label: 'C (right side)', type: 'int', min: -36, max: 36, value: 12 },
      ],
      compute: standardModel,
    },
    {
      id: 'water-level',
      title: 'Word problem: a linear model from two readings',
      word: true,
      intro: 'Change the two readings and the time you want to predict.',
      inputs: [
        { name: 't1', label: 'First reading: minutes', type: 'int', min: 0, max: 30, value: 2 },
        { name: 'h1', label: 'First reading: level (cm)', type: 'int', min: 0, max: 200, value: 26 },
        { name: 't2', label: 'Second reading: minutes', type: 'int', min: 0, max: 30, value: 6 },
        { name: 'h2', label: 'Second reading: level (cm)', type: 'int', min: 0, max: 200, value: 38 },
        { name: 't3', label: 'Predict the level at (minutes)', type: 'int', min: 0, max: 60, value: 15 },
      ],
      compute({ t1, h1, t2, h2, t3 }) {
        if (t1 === t2) return { error: 'The two readings are at the same time, so they do not show how the level changes. Use two different times.' };
        const m = frac(h2 - h1, t2 - t1);
        const b = F(h1).sub(m.mul(t1));
        const h3 = m.mul(t3).add(b);
        const dec = (v) => (v.isInt() ? v.tex() : R`${v.tex()} \approx ${num(v.value, { places: 2 })}`);
        const f = (x) => m.value * x + b.value;
        const hi = Math.max(t1, t2, t3) + 2;
        const trend = m.n > 0 ? 'rises' : m.n < 0 ? 'falls' : 'does not change';
        return {
          problem: `The water level in a tank changes at a steady rate. It is ${h1} cm after ${t1} ${t1 === 1 ? 'minute' : 'minutes'} and ${h2} cm after ${t2} ${t2 === 1 ? 'minute' : 'minutes'}. What does the model predict after ${t3} ${t3 === 1 ? 'minute' : 'minutes'}?`,
          steps: [
            R`A steady rate means a linear model. Use the readings as points \(${point(t1, h1)}\) and \(${point(t2, h2)}\).`,
            R`Slope (the rate): \(\dfrac{${h2} - ${h1}}{${t2} - ${t1}} = ${dec(m)}\). The level ${trend}${m.n === 0 ? '' : R` by \(${num(Math.abs(m.value), { places: 2 })}\) cm each minute`}.`,
            R`Intercept (the starting level): \(b = ${h1} - ${paren(m)} \cdot ${t1} = ${dec(b)}\). So \(h = ${terms([[m, 't'], [b, '']])}\).`,
            R`At \(t = ${t3}\): \(h = ${dec(h3)}\).`,
          ],
          answer: h3.value < 0 ? `The model gives ${txt(h3.value, { places: 2 })} cm, which is impossible: the tank is empty before ${t3} ${t3 === 1 ? 'minute' : 'minutes'}.` : `${h3.isInt() ? '' : 'About '}${txt(h3.value, { places: 2 })} cm after ${t3} ${t3 === 1 ? 'minute' : 'minutes'}`,
          note: b.value < 0 ? 'The intercept is negative, so this straight-line model cannot hold all the way back to 0 minutes.' : undefined,
          visual: {
            type: 'plot', x: [0, hi], y: fitY(f, 0, hi), axisLabels: ['t', 'h'], fns: [{ f }],
            points: [{ x: t1, y: h1, label: pointText(t1, h1) }, { x: t2, y: h2, label: pointText(t2, h2) }, { x: t3, y: h3.value, color: 'b', label: `(${show(t3)}, ${txt(h3.value, { places: 2 })})` }],
            alt: `Graph of water level against time: a straight line through ${pointText(t1, h1)} and ${pointText(t2, h2)}, with the predicted point at ${t3} minutes marked.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easySlopeTwoPoints, easyReadEquation, easySlopeFromGraph, easySequence],
    medium: [mediumPointSlope, mediumTwoPoints, mediumIntercepts, mediumNthTerm, mediumStoryInterpret],
    hard: [hardParallelPerp, hardFractionSlope, hardWhichTerm, hardStoryTwoPoints],
    challenge: [challengeMissingCoordinate, challengeRelationship, challengeTwoTerms, challengeStandardForm],
  },
};
