import { R, q, frac, tryFrac, Frac, linear, terms, num, paren, lcm, money, person, checkRoots } from '../../lib/index.js';

const asX = (v) => R`\(x = ${num(v)}\)`;
const val = (v) => (v instanceof Frac ? v.value : v);
// "subtract 3x from" / "add 3x to" — the step that removes the term cx from one side.
const removeTerm = (c, x = 'x') => (c > 0 ? R`subtract \(${terms([[c, x]])}\) from` : R`add \(${terms([[-c, x]])}\) to`);
// A solution check: the value really makes both sides equal.
const solves = (lhs, rhs, x) => () => checkRoots((t) => lhs(t) - rhs(t), [val(x)]);

// ───────────── Easy: two-step equations ─────────────

function easyTwoStep(rng) {
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const x = rng.nonzero(-9, 9);
  const b = rng.nonzero(-12, 12);
  const c = a * x + b;
  return q({
    prompt: R`Solve for \(x\): \(\;${linear(a, b)} = ${c}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(c + b, a), why: R`To undo \(${b > 0 ? '+' : '-'} ${Math.abs(b)}\), do the opposite on both sides.` },
      { value: c - b, why: R`This stops after the first step. \(${a}x = ${c - b}\) still needs dividing by \(${a}\).` },
      -x,
      frac(c, a).sub(b),
    ],
    solution: [
      R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\) ${b > 0 ? 'from' : 'to'} both sides: \(${a}x = ${c - b}\).`,
      R`Divide both sides by \(${a}\): \(x = ${x}\).`,
      R`Check: \(${a}${paren(x)} ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${c}\). ✓`,
    ],
    rule: 1,
    skill: 'two-step equations',
    check: solves((t) => a * t + b, () => c, x),
  });
}

function easyDivided(rng) {
  const a = rng.int(2, 9);
  const b = rng.nonzero(-10, 10);
  const k = rng.nonzero(-8, 8);
  const x = a * k;
  const c = k + b;
  return q({
    prompt: R`Solve for \(x\): \(\;\frac{x}{${a}} ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${c}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(c - b, a), why: R`Undo "divided by \(${a}\)" by multiplying by \(${a}\), not dividing again.` },
      { value: a * (c + b), why: R`Undo \(${b > 0 ? '+' : '-'} ${Math.abs(b)}\) with the opposite operation.` },
      a * c - b,
      k,
    ],
    solution: [
      R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\) on both sides: \(\frac{x}{${a}} = ${k}\).`,
      R`Multiply both sides by \(${a}\): \(x = ${x}\).`,
    ],
    rule: 1,
    skill: 'two-step equations',
    check: solves((t) => t / a + b, () => c, x),
  });
}

function easyStory(rng) {
  const each = rng.int(3, 12);
  const fee = rng.int(2, 15);
  const n = rng.int(2, 12);
  const total = each * n + fee;
  const name = person(rng);
  const [thing, feeName] = rng.pick([
    ['tickets', 'booking fee'],
    ['T-shirts', 'shipping fee'],
    ['notebooks', 'delivery fee'],
    ['pizzas', 'delivery fee'],
  ]);
  return q({
    prompt: R`${name} buys some ${thing} that cost ${money(each)} each, plus a one-time ${feeName} of ${money(fee)}. The total is ${money(total)}. How many ${thing} did ${name} buy?`,
    correct: n,
    wrong: [
      (total + fee) % each === 0 ? { value: (total + fee) / each, why: 'The fee is part of the total, so take it away before dividing.' } : null,
      { value: total - fee, why: `That is the cost of the ${thing} alone, in dollars. Divide by the price of one.` },
      n + 1,
      n - 1,
      n + 2,
    ],
    solution: [
      R`Let \(x\) be the number of ${thing}. Cost of the ${thing} plus the fee equals the total: \(${each}x + ${fee} = ${total}\).`,
      R`Subtract \(${fee}\): \(${each}x = ${total - fee}\).`,
      R`Divide by \(${each}\): \(x = ${n}\). ${name} bought ${n} ${thing}.`,
    ],
    rule: 1,
    skill: 'writing equations',
    check: solves((t) => each * t + fee, () => total, n),
  });
}

// ───────────── Medium: both sides, distributing ─────────────

function mediumBothSides(rng) {
  const a = rng.nonzero(-9, 9);
  const c = rng.intExcept(-9, 9, [0, a]);
  const x = rng.nonzero(-9, 9);
  const b = rng.nonzero(-15, 15);
  const d = (a - c) * x + b;
  if (d === 0) return mediumBothSides(rng);
  return q({
    prompt: R`Solve for \(x\): \(\;${linear(a, b)} = ${linear(c, d)}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: tryFrac(d - b, a + c), why: R`When \(${terms([[c, 'x']])}\) moves across the equals sign, subtract it from both sides. Its sign changes.` },
      { value: frac(d + b, a - c), why: 'Moving the constant across needs the opposite operation on both sides.' },
      -x,
      frac(d - b, a),
    ],
    solution: [
      R`Collect the \(x\) terms: ${removeTerm(c)} both sides to get \(${linear(a - c, b)} = ${d}\).`,
      R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\) on both sides: \(${terms([[a - c, 'x']])} = ${d - b}\).`,
      R`Divide by \(${a - c}\): \(x = ${x}\).`,
    ],
    rule: 3,
    skill: 'variables on both sides',
    check: solves((t) => a * t + b, (t) => c * t + d, x),
  });
}

function mediumDistribute(rng) {
  const a = rng.intExcept(-8, 8, [-1, 0, 1]);
  const b = rng.nonzero(-9, 9);
  const x = rng.intExcept(-9, 9, [0, -b]);
  const c = a * (x + b);
  return q({
    prompt: R`Solve for \(x\): \(\;${a}(${linear(1, b)}) = ${c}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(c - b, a), why: R`\(${a}\) multiplies both terms in the parentheses: \(${a} \cdot x\) and \(${a} \cdot ${paren(b)}\).` },
      { value: frac(c, a).add(b), why: R`After dividing by \(${a}\), undo \(${b > 0 ? '+' : '-'} ${Math.abs(b)}\) with the opposite operation.` },
      x + 1,
      -x,
    ],
    solution: [
      R`Distribute: \(${linear(a, a * b)} = ${c}\).`,
      R`${a * b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(a * b)}\) on both sides: \(${a}x = ${c - a * b}\).`,
      R`Divide by \(${a}\): \(x = ${x}\).`,
    ],
    rule: 2,
    skill: 'distributive property',
    check: solves((t) => a * (t + b), () => c, x),
  });
}

function mediumCombine(rng) {
  const a = rng.nonzero(-7, 7);
  const c = rng.intExcept(-7, 7, [0, -a]);
  const x = rng.nonzero(-8, 8);
  const b = rng.nonzero(-12, 12);
  const d = (a + c) * x + b;
  return q({
    prompt: R`Solve for \(x\): \(\;${terms([[a, 'x'], [b, ''], [c, 'x']])} = ${d}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(d - b, a), why: R`There are two \(x\) terms on the left. Combine them first: \(${terms([[a, 'x'], [c, 'x']])} = ${terms([[a + c, 'x']])}\).` },
      tryFrac(d + b, a + c),
      -x,
      x + 2,
    ],
    solution: [
      R`Combine like terms on the left: \(${linear(a + c, b)} = ${d}\).`,
      R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\): \(${terms([[a + c, 'x']])} = ${d - b}\).`,
      R`Divide by \(${a + c}\): \(x = ${x}\).`,
    ],
    rule: 2,
    skill: 'combining like terms',
    check: solves((t) => a * t + b + c * t, () => d, x),
  });
}

function mediumStory(rng) {
  const m1 = rng.int(8, 20);
  const m2 = m1 + rng.int(2, 10);
  const months = rng.int(2, 12);
  const f2 = rng.int(0, 4) * 5;
  const f1 = f2 + (m2 - m1) * months;
  return q({
    prompt: R`Gym A charges a ${money(f1)} joining fee plus ${money(m1)} per month. Gym B charges ${f2 ? `a ${money(f2)} joining fee plus ` : ''}${money(m2)} per month${f2 ? '' : ' with no joining fee'}. After how many months is the total cost the same?`,
    correct: months,
    unit: 'months',
    wrong: [
      f2 > 0 && (f1 + f2) % (m2 - m1) === 0 ? { value: (f1 + f2) / (m2 - m1), why: 'The fees are on opposite sides of the equation, so subtract one from the other.' } : null,
      months + 2,
      months - 1,
      months + 1,
      months + 3,
    ],
    solution: [
      R`Let \(x\) be the number of months. Set the totals equal: \(${linear(m1, f1)} = ${linear(m2, f2)}\).`,
      R`Subtract \(${m1}x\) from both sides: \(${f1} = ${linear(m2 - m1, f2)}\).`,
      f2 ? R`Subtract \(${f2}\): \(${f1 - f2} = ${m2 - m1}x\).` : R`So \(${f1} = ${m2 - m1}x\).`,
      R`Divide by \(${m2 - m1}\): \(x = ${months}\) months.`,
    ],
    rule: 3,
    skill: 'writing equations',
    check: solves((t) => m1 * t + f1, (t) => m2 * t + f2, months),
  });
}

// ───────────── Hard ─────────────

function hardBothDistribute(rng) {
  const a = rng.intExcept(-6, 6, [-1, 0, 1]);
  const d = rng.intExcept(-6, 6, [0, a]);
  const b = rng.nonzero(-7, 7);
  const e = rng.nonzero(-7, 7);
  const x = rng.nonzero(-8, 8);
  const c = d * (x + e) - a * (x + b);
  if (c === 0) return hardBothDistribute(rng);
  const dPart = Math.abs(d) === 1 ? (d === 1 ? `${linear(1, e)}` : `-(${linear(1, e)})`) : `${d}(${linear(1, e)})`;
  return q({
    prompt: R`Solve for \(x\): \(\;${a}(${linear(1, b)}) ${c > 0 ? '+' : '-'} ${Math.abs(c)} = ${dPart}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(d * e - b - c, a - d), why: R`Distribute to every term: \(${a}(${linear(1, b)}) = ${linear(a, a * b)}\), not \(${linear(a, b)}\).` },
      tryFrac(d * e - a * b - c, a + d),
      -x,
      x - 1,
      x + 2,
    ],
    solution: [
      R`Distribute on both sides: \(${terms([[a, 'x'], [a * b, ''], [c, '']])} = ${linear(d, d * e)}\).`,
      R`Combine constants on the left: \(${linear(a, a * b + c)} = ${linear(d, d * e)}\).`,
      R`Collect the \(x\) terms (${removeTerm(d)} both sides) and move the constant: \(${terms([[a - d, 'x']])} = ${d * e - a * b - c}\).`,
      R`Divide by \(${a - d}\): \(x = ${x}\).`,
    ],
    rule: 3,
    skill: 'multi-step equations',
    check: solves((t) => a * (t + b) + c, (t) => d * (t + e), x),
  });
}

function hardFractions(rng) {
  const [a, b] = rng.pick([[2, 3], [2, 5], [3, 4], [2, 4], [3, 6], [4, 6], [3, 5], [2, 6]]);
  const L = lcm(a, b);
  const x = L * rng.nonzero(-4, 4);
  const sign = rng.pick([1, -1]);
  const c = x / a + (sign * x) / b;
  if (c === 0) return hardFractions(rng);
  return q({
    prompt: R`Solve for \(x\): \(\;\frac{x}{${a}} ${sign > 0 ? '+' : '-'} \frac{x}{${b}} = ${c}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: c * (a + sign * b), why: 'The denominators cannot simply be added. Multiply every term by the least common denominator.' },
      { value: frac(c, L), why: R`Multiplying by \(${L}\) clears the fractions, so the right side becomes \(${c} \cdot ${L}\).` },
      c * L,
      -x,
    ],
    solution: [
      R`The least common denominator of \(${a}\) and \(${b}\) is \(${L}\). Multiply every term by \(${L}\): \(${terms([[L / a, 'x'], [(sign * L) / b, 'x']])} = ${c * L}\).`,
      R`Combine like terms: \(${terms([[L / a + (sign * L) / b, 'x']])} = ${c * L}\).`,
      R`Divide by \(${L / a + (sign * L) / b}\): \(x = ${x}\).`,
    ],
    rule: 4,
    skill: 'equations with fractions',
    check: solves((t) => t / a + (sign * t) / b, () => c, x),
  });
}

function hardFractionAnswer(rng) {
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const b = rng.nonzero(-9, 9);
  const c = rng.int(-12, 12);
  const sol = frac(c - b, a);
  if (sol.isInt()) return hardFractionAnswer(rng);
  return q({
    prompt: R`Solve for \(x\): \(\;${linear(a, b)} = ${c}\)`,
    correct: sol,
    fmt: asX,
    wrong: [
      { value: sol.inv(), why: R`Divide the number by the coefficient of \(x\): \(x = \frac{${c - b}}{${a}}\), not the other way up.` },
      frac(c + b, a),
      sol.neg(),
      frac(c - b, a + 1 || 2),
    ],
    solution: [
      R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\) on both sides: \(${a}x = ${c - b}\).`,
      R`Divide by \(${a}\): \(x = ${sol.tex()}\). A solution does not have to be a whole number.`,
    ],
    rule: 1,
    skill: 'fraction solutions',
    check: solves((t) => a * t + b, () => c, sol),
  });
}

function hardStory(rng) {
  const w = rng.int(3, 15);
  const k = rng.int(2, 3);
  const extra = rng.int(1, 9);
  const l = k * w + extra;
  const P = 2 * (l + w);
  return q({
    prompt: R`The length of a rectangle is ${extra} cm more than ${k === 2 ? 'twice' : 'three times'} its width. The perimeter is ${P} cm. What is the width?`,
    correct: w,
    unit: 'cm',
    wrong: [
      { value: l, why: 'That is the length. The question asks for the width.' },
      { value: frac(P - extra, k + 1), why: 'A perimeter counts each side twice: 2(length + width).' },
      w + 2,
      frac(P, 2 * (k + 1)),
    ],
    solution: [
      R`Let \(w\) be the width. Then the length is \(${k}w + ${extra}\).`,
      R`Perimeter: \(2(w + ${k}w + ${extra}) = ${P}\), so \(2(${k + 1}w + ${extra}) = ${P}\).`,
      R`Divide by 2: \(${k + 1}w + ${extra} = ${P / 2}\). Subtract \(${extra}\): \(${k + 1}w = ${P / 2 - extra}\).`,
      R`Divide by \(${k + 1}\): \(w = ${w}\) cm.`,
    ],
    rule: 2,
    skill: 'writing equations',
    check: solves((t) => 2 * (t + k * t + extra), () => P, w),
  });
}

// ───────────── Challenge ─────────────

function challengeHowMany(rng) {
  const a = rng.intExcept(-6, 6, [-1, 0, 1]);
  const b = rng.nonzero(-6, 6);
  const kind = rng.pick(['none', 'all', 'one']);
  const rightA = kind === 'one' ? rng.intExcept(-6, 6, [0, a]) : a;
  const rightB = kind === 'all' ? a * b : a * b + rng.nonzero(-5, 5);
  const answers = { none: 'No solution', all: 'Infinitely many solutions', one: 'Exactly one solution' };
  const steps = [R`Distribute on the left: \(${linear(a, a * b)} = ${linear(rightA, rightB)}\).`];
  if (kind === 'one') {
    steps.push(R`The \(x\) terms are different, so they do not cancel: \(${terms([[a - rightA, 'x']])} = ${rightB - a * b}\).`, R`Dividing gives one value of \(x\). There is exactly one solution.`);
  } else if (kind === 'none') {
    steps.push(R`The \(x\) terms match. Remove them (${removeTerm(a)} both sides): \(${a * b} = ${rightB}\).`, R`That statement is false, so no value of \(x\) works. There is no solution.`);
  } else {
    steps.push(R`Both sides are identical. Removing the \(x\) terms leaves \(${a * b} = ${a * b}\), which is always true.`, R`Every value of \(x\) works. There are infinitely many solutions.`);
  }
  return q({
    prompt: R`How many solutions does this equation have? \(\;${a}(${linear(1, b)}) = ${linear(rightA, rightB)}\)`,
    correct: answers[kind],
    wrong: ['No solution', 'Exactly one solution', 'Infinitely many solutions', 'Exactly two solutions'],
    solution: steps,
    rule: 5,
    skill: 'special cases',
  });
}

function challengeLiteral(rng) {
  const a = rng.int(2, 9);
  const b = rng.intExcept(-9, 9, [-1, 0, 1]);
  const c = rng.nonzero(-20, 20);
  const slope = frac(-a, b);
  const icpt = frac(c, b);
  const form = (m, k) => R`\(y = ${terms([[m, 'x'], [k, '']])}\)`;
  return q({
    prompt: R`Solve for \(y\): \(\;${terms([[a, 'x'], [b, 'y']])} = ${c}\)`,
    correct: form(slope, icpt),
    wrong: [
      { value: form(slope.neg(), icpt), why: R`Moving \(${a}x\) to the other side makes it \(-${a}x\).` },
      { value: form(frac(-a, 1), frac(c, 1)), why: R`Every term must be divided by \(${b}\), the coefficient of \(y\).` },
      form(slope, icpt.neg()),
      form(frac(b, -a), frac(c, a)),
    ],
    solution: [
      R`Subtract \(${a}x\) from both sides: \(${terms([[b, 'y']])} = ${terms([[-a, 'x'], [c, '']])}\).`,
      R`Divide every term by \(${b}\): \(y = ${terms([[slope, 'x'], [icpt, '']])}\).`,
    ],
    rule: 6,
    skill: 'literal equations',
    check: () => {
      // Any point on the original line must satisfy the solved form.
      const x0 = 1.7;
      const y0 = (c - a * x0) / b;
      return Math.abs(slope.value * x0 + icpt.value - y0) < 1e-9 ? true : 'solved form does not match the original equation';
    },
  });
}

const FORMULAS = [
  { ask: R`Solve \(A = \frac{1}{2}bh\) for \(h\).`, right: R`\(h = \frac{2A}{b}\)`, wrong: [R`\(h = \frac{A}{2b}\)`, R`\(h = 2Ab\)`, R`\(h = \frac{b}{2A}\)`], steps: [R`Multiply both sides by 2: \(2A = bh\).`, R`Divide both sides by \(b\): \(h = \frac{2A}{b}\).`] },
  { ask: R`Solve \(P = 2l + 2w\) for \(w\).`, right: R`\(w = \frac{P - 2l}{2}\)`, wrong: [R`\(w = \frac{P}{2} - 2l\)`, R`\(w = P - 2l\)`, R`\(w = \frac{P + 2l}{2}\)`], steps: [R`Subtract \(2l\) from both sides: \(P - 2l = 2w\).`, R`Divide both sides by 2: \(w = \frac{P - 2l}{2}\).`] },
  { ask: R`Solve \(y = mx + b\) for \(x\).`, right: R`\(x = \frac{y - b}{m}\)`, wrong: [R`\(x = \frac{y}{m} - b\)`, R`\(x = \frac{y + b}{m}\)`, R`\(x = m(y - b)\)`], steps: [R`Subtract \(b\) from both sides: \(y - b = mx\).`, R`Divide both sides by \(m\): \(x = \frac{y - b}{m}\).`] },
  { ask: R`Solve \(C = \frac{5}{9}(F - 32)\) for \(F\).`, right: R`\(F = \frac{9}{5}C + 32\)`, wrong: [R`\(F = \frac{5}{9}C + 32\)`, R`\(F = \frac{9}{5}(C + 32)\)`, R`\(F = \frac{9}{5}C - 32\)`], steps: [R`Multiply both sides by \(\frac{9}{5}\): \(\frac{9}{5}C = F - 32\).`, R`Add 32 to both sides: \(F = \frac{9}{5}C + 32\).`] },
  { ask: R`Solve \(d = rt\) for \(t\).`, right: R`\(t = \frac{d}{r}\)`, wrong: [R`\(t = dr\)`, R`\(t = \frac{r}{d}\)`, R`\(t = d - r\)`], steps: [R`\(t\) is multiplied by \(r\). Divide both sides by \(r\): \(t = \frac{d}{r}\).`, R`Check with numbers: 120 miles at 40 mph takes \(\frac{120}{40} = 3\) hours.`] },
  { ask: R`Solve \(V = lwh\) for \(w\).`, right: R`\(w = \frac{V}{lh}\)`, wrong: [R`\(w = Vlh\)`, R`\(w = \frac{lh}{V}\)`, R`\(w = V - lh\)`], steps: [R`\(w\) is multiplied by \(l\) and \(h\).`, R`Divide both sides by \(lh\): \(w = \frac{V}{lh}\).`] },
  { ask: R`Solve \(I = Prt\) for \(r\).`, right: R`\(r = \frac{I}{Pt}\)`, wrong: [R`\(r = IPt\)`, R`\(r = \frac{Pt}{I}\)`, R`\(r = I - Pt\)`], steps: [R`\(r\) is multiplied by \(P\) and \(t\).`, R`Divide both sides by \(Pt\): \(r = \frac{I}{Pt}\).`] },
  { ask: R`Solve \(ax + b = c\) for \(x\) (with \(a \neq 0\)).`, right: R`\(x = \frac{c - b}{a}\)`, wrong: [R`\(x = \frac{c}{a} - b\)`, R`\(x = \frac{c + b}{a}\)`, R`\(x = a(c - b)\)`], steps: [R`Subtract \(b\) from both sides: \(ax = c - b\).`, R`Divide both sides by \(a\): \(x = \frac{c - b}{a}\).`] },
];

function challengeFormula(rng) {
  const f = rng.pick(FORMULAS);
  return q({ prompt: f.ask, correct: f.right, wrong: f.wrong, solution: f.steps, rule: 6, skill: 'literal equations' });
}

function challengeProportion(rng) {
  const b = rng.int(2, 7);
  const d = rng.intExcept(2, 7, [b]);
  const x = rng.nonzero(-9, 9);
  const a = rng.nonzero(-9, 9);
  // (x + a)/b = (x + c)/d  →  d(x + a) = b(x + c)  →  c = (d(x + a) − bx)/b must be an integer.
  const numer = d * (x + a) - b * x;
  if (numer % b !== 0) return challengeProportion(rng);
  const c = numer / b;
  if (c === 0 || c === a) return challengeProportion(rng);
  return q({
    prompt: R`Solve for \(x\): \(\;\frac{${linear(1, a)}}{${b}} = \frac{${linear(1, c)}}{${d}}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(c - a, 1), why: 'The denominators are different, so the numerators cannot just be set equal. Multiply both sides by both denominators.' },
      tryFrac(b * c + d * a, d - b),
      -x,
      x + 1,
    ],
    solution: [
      R`Multiply both sides by \(${b} \cdot ${d}\) (cross-multiply): \(${d}(${linear(1, a)}) = ${b}(${linear(1, c)})\).`,
      R`Distribute: \(${linear(d, d * a)} = ${linear(b, b * c)}\).`,
      R`Collect terms: \(${terms([[d - b, 'x']])} = ${b * c - d * a}\).`,
      R`Divide by \(${d - b}\): \(x = ${x}\).`,
    ],
    rule: 4,
    skill: 'equations with fractions',
    check: solves((t) => (t + a) / b, (t) => (t + c) / d, x),
  });
}

function challengeFindK(rng) {
  const a = rng.intExcept(-7, 7, [-1, 0, 1]);
  const b = rng.nonzero(-6, 6);
  const c = rng.intExcept(-12, 12, [a * b]);
  return q({
    prompt: R`For what value of \(k\) does the equation \(\;${a}(${linear(1, b)}) = ${terms([[1, 'kx'], [c, '']])}\;\) have **no solution**?`,
    correct: a,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: a * b, why: R`\(${a * b}\) is the constant after distributing. To lose the \(x\) terms, match the coefficients of \(x\).` },
      { value: -a, why: R`With \(k = ${-a}\) the \(x\) terms do not cancel, so there is one solution.` },
      c,
      0,
    ],
    solution: [
      R`Distribute the left side: \(${linear(a, a * b)} = ${terms([[1, 'kx'], [c, '']])}\).`,
      R`There is no solution when the \(x\) terms cancel but the constants are different.`,
      R`The \(x\) terms cancel when \(k = ${a}\). Then the equation says \(${a * b} = ${c}\), which is false. So \(k = ${a}\).`,
    ],
    rule: 5,
    skill: 'special cases',
  });
}

function challengeConsecutive(rng) {
  const n = rng.int(-20, 40);
  const kind = rng.pick(['three', 'even', 'odd']);
  const first = kind === 'three' ? n : kind === 'even' ? 2 * n : 2 * n + 1;
  const stepSize = kind === 'three' ? 1 : 2;
  const sum = 3 * first + 3 * stepSize;
  const label = kind === 'three' ? 'three consecutive integers' : `three consecutive ${kind} integers`;
  return q({
    prompt: R`The sum of ${label} is \(${sum}\). What is the **largest** of the three?`,
    correct: first + 2 * stepSize,
    wrong: [
      { value: first, why: 'That is the smallest of the three. The question asks for the largest.' },
      { value: first + stepSize, why: 'That is the middle number. The question asks for the largest.' },
      frac(sum, 3).add(3 * stepSize),
      first + 3 * stepSize,
    ],
    solution: [
      R`Call the numbers \(x\), \(x + ${stepSize}\) and \(x + ${2 * stepSize}\).`,
      R`Their sum: \(3x + ${3 * stepSize} = ${sum}\), so \(3x = ${sum - 3 * stepSize}\) and \(x = ${first}\).`,
      R`The numbers are \(${first}\), \(${first + stepSize}\), \(${first + 2 * stepSize}\). The largest is \(${first + 2 * stepSize}\).`,
    ],
    rule: 2,
    skill: 'writing equations',
    check: solves((t) => 3 * t + 3 * stepSize, () => sum, first),
  });
}

// ───────────── Interactive models ─────────────

function solveSteps(a, b, c, d) {
  const steps = [];
  const k = a - c;
  const rhs = d - b;
  if (c !== 0) steps.push(R`Get the \(x\) terms on one side: ${removeTerm(c)} both sides. \(\;${linear(k, b)} = ${d}\)`);
  if (k === 0) {
    if (b === d) return { steps: [...steps, R`The \(x\) terms cancelled and left \(${b} = ${d}\), which is always true.`], answer: 'Every number is a solution (infinitely many solutions).' };
    return { steps: [...steps, R`The \(x\) terms cancelled and left \(${b} = ${d}\), which is never true.`], answer: 'No solution.' };
  }
  if (b !== 0) steps.push(R`Move the constant: ${b > 0 ? 'subtract' : 'add'} \(${Math.abs(b)}\) on both sides. \(\;${terms([[k, 'x']])} = ${rhs}\)`);
  const x = frac(rhs, k);
  if (k !== 1) steps.push(R`Divide both sides by \(${k}\): \(x = ${fracOrInt(rhs, k)}${x.tex() !== fracOrInt(rhs, k) ? ` = ${x.tex()}` : ''}\).`);
  const left = frac(a, 1).mul(x).add(b);
  steps.push(R`Check by substituting: both sides equal \(${left.tex()}\). ✓`);
  return { steps, answer: R`\(x = ${x.tex()}\)`, x };
}

function fracOrInt(n, d) {
  return Number.isInteger(n / d) ? String(n / d) : R`\frac{${n}}{${d}}`;
}

export default {
  id: 'linear-equations',
  title: 'Solving Linear Equations',
  summary: 'Solve multi-step equations, including variables on both sides, fractions and formulas.',
  standards: ['CCSS A-REI.A.1', 'CCSS A-REI.B.3', 'CCSS A-CED.A.1', 'CCSS A-CED.A.4'],

  explain: {
    intro: R`An equation says two expressions are equal. Solving it means finding the value of the variable that makes it true. The plan is always the same: keep both sides balanced while you undo the operations around the variable.`,
    rules: [
      {
        title: 'Keep the balance',
        text: R`Whatever you do to one side, do to the other. You may add, subtract, multiply or divide both sides by the same number (but never divide by 0).`,
        example: R`\(x + 7 = 12\). Subtract 7 from both sides: \(x = 5\).`,
      },
      {
        title: 'Undo operations in reverse order',
        text: R`Look at what was done to the variable, then undo it backwards: first undo addition or subtraction, then undo multiplication or division.`,
        example: R`\(3x - 4 = 11\). Add 4: \(3x = 15\). Divide by 3: \(x = 5\).`,
      },
      {
        title: 'Simplify each side first',
        text: R`Use the distributive property to remove parentheses and combine like terms before you move anything across the equals sign.`,
        example: R`\(2(x + 3) + x = 15\) becomes \(3x + 6 = 15\), so \(x = 3\).`,
      },
      {
        title: 'Variables on both sides',
        text: R`Collect the variable terms on one side by adding or subtracting the same variable term on both sides. Collect the constants on the other side.`,
        example: R`\(5x + 2 = 3x + 10\). Subtract \(3x\): \(2x + 2 = 10\). Then \(x = 4\).`,
      },
      {
        title: 'Clear fractions',
        text: R`Multiply every term on both sides by the least common denominator. The fractions disappear and you are left with whole-number coefficients.`,
        example: R`\(\frac{x}{2} + \frac{x}{3} = 10\). Multiply by 6: \(3x + 2x = 60\), so \(x = 12\).`,
      },
      {
        title: 'Special cases',
        text: R`If the variable terms cancel and you are left with a true statement such as \(6 = 6\), every number is a solution. If you are left with a false statement such as \(6 = 9\), there is no solution.`,
        example: R`\(2(x + 3) = 2x + 6\) is true for every \(x\). \(2(x + 3) = 2x + 9\) is never true.`,
      },
      {
        title: 'Formulas: solve for a letter',
        text: R`To solve a formula for one of its letters, treat the other letters like numbers and use the same steps.`,
        example: R`\(P = 2l + 2w\). Subtract \(2l\), then divide by 2: \(w = \frac{P - 2l}{2}\).`,
      },
    ],
    vocab: [
      { term: 'solution', def: 'A value of the variable that makes the equation true.' },
      { term: 'like terms', def: R`Terms with the same variable part, such as \(3x\) and \(-5x\). They can be combined.` },
      { term: 'coefficient', def: R`The number multiplying a variable. In \(7x\) the coefficient is 7.` },
      { term: 'inverse operations', def: 'Operations that undo each other: addition and subtraction, multiplication and division.' },
    ],
    mistakes: [
      R`Distributing to only the first term: \(3(x + 4)\) is \(3x + 12\), not \(3x + 4\).`,
      R`Losing a negative sign: subtracting \(-2x\) is the same as adding \(2x\).`,
      'Doing an operation on one side only. Write the step on both sides until it is automatic.',
      'Skipping the check. Substituting your answer back takes seconds and catches most slips.',
    ],
  },

  examples: [
    {
      title: 'Two steps',
      problem: R`Solve \(4x - 7 = 21\).`,
      steps: [
        R`Undo the subtraction first. Add 7 to both sides: \(4x = 28\).`,
        R`Undo the multiplication. Divide both sides by 4: \(x = 7\).`,
        R`Check: \(4(7) - 7 = 28 - 7 = 21\). ✓`,
      ],
      answer: R`\(x = 7\)`,
    },
    {
      title: 'Parentheses and variables on both sides',
      problem: R`Solve \(3(x - 2) = x + 8\).`,
      steps: [
        R`Distribute: \(3x - 6 = x + 8\).`,
        R`Subtract \(x\) from both sides: \(2x - 6 = 8\).`,
        R`Add 6 to both sides: \(2x = 14\).`,
        R`Divide by 2: \(x = 7\). Check: \(3(7 - 2) = 15\) and \(7 + 8 = 15\). ✓`,
      ],
      answer: R`\(x = 7\)`,
      visual: {
        type: 'plot',
        x: [-2, 10],
        y: [-8, 22],
        fns: [{ f: (x) => 3 * (x - 2), label: 'y = 3(x − 2)' }, { f: (x) => x + 8, label: 'y = x + 8', color: 'b', labelAt: 2 }],
        points: [{ x: 7, y: 15, label: '(7, 15)' }],
        alt: 'Graph of the lines y = 3(x − 2) and y = x + 8. They cross at the point (7, 15), so the two sides are equal when x is 7.',
      },
    },
    {
      title: 'Word problem: two phone plans',
      word: true,
      problem: R`Plan A costs $20 a month plus $5 per gigabyte of data. Plan B costs $35 a month plus $2 per gigabyte. For how many gigabytes do the plans cost the same?`,
      steps: [
        R`Let \(x\) be the number of gigabytes. Plan A costs \(5x + 20\). Plan B costs \(2x + 35\).`,
        R`"Cost the same" means the expressions are equal: \(5x + 20 = 2x + 35\).`,
        R`Subtract \(2x\): \(3x + 20 = 35\). Subtract 20: \(3x = 15\).`,
        R`Divide by 3: \(x = 5\). Both plans cost $45 at 5 gigabytes.`,
      ],
      answer: '5 gigabytes',
    },
    {
      title: 'Word problem: a formula',
      word: true,
      problem: R`A rectangle has perimeter 54 m and length 17 m. Solve \(P = 2l + 2w\) for \(w\), then find the width.`,
      steps: [
        R`Subtract \(2l\) from both sides: \(P - 2l = 2w\).`,
        R`Divide by 2: \(w = \frac{P - 2l}{2}\).`,
        R`Substitute: \(w = \frac{54 - 2(17)}{2} = \frac{20}{2} = 10\).`,
      ],
      answer: 'The width is 10 m.',
    },
  ],

  models: [
    {
      id: 'solve-linear',
      title: 'Solve ax + b = cx + d',
      intro: 'Choose the four numbers. The steps, the answer and the graph update as you type.',
      inputs: [
        { name: 'a', label: 'a (left x-coefficient)', type: 'int', min: -12, max: 12, value: 5 },
        { name: 'b', label: 'b (left constant)', type: 'int', min: -30, max: 30, value: 2 },
        { name: 'c', label: 'c (right x-coefficient)', type: 'int', min: -12, max: 12, value: 3 },
        { name: 'd', label: 'd (right constant)', type: 'int', min: -30, max: 30, value: 10 },
      ],
      compute({ a, b, c, d }) {
        const r = solveSteps(a, b, c, d);
        const out = { problem: R`\(${linear(a, b)} = ${linear(c, d)}\)`, steps: r.steps, answer: r.answer };
        if (r.x) {
          const x = r.x.value;
          const y = a * x + b;
          const span = Math.max(4, Math.abs(x) * 0.6);
          const ys = [a * (x - span) + b, a * (x + span) + b, c * (x - span) + d, c * (x + span) + d];
          const pad = Math.max(2, (Math.max(...ys) - Math.min(...ys)) * 0.08);
          out.visual = {
            type: 'plot',
            x: [x - span, x + span],
            y: [Math.min(...ys) - pad, Math.max(...ys) + pad],
            fns: [{ f: (t) => a * t + b }, { f: (t) => c * t + d, color: 'b' }],
            points: [{ x, y, label: `x = ${r.x.text()}` }],
            alt: `Graph of the left side and the right side as two lines. They cross where x = ${r.x.text()}, which is the solution.`,
          };
        }
        return out;
      },
    },
    {
      id: 'saving-up',
      title: 'Word problem: saving for a goal',
      word: true,
      intro: 'Change the amounts in the story.',
      inputs: [
        { name: 'have', label: 'Dollars saved already', type: 'int', min: 0, max: 500, value: 40 },
        { name: 'week', label: 'Dollars saved each week', type: 'int', min: 1, max: 100, value: 15 },
        { name: 'goal', label: 'Cost of the goal (dollars)', type: 'int', min: 1, max: 2000, value: 175 },
      ],
      compute({ have, week, goal }) {
        if (goal <= have) return { error: 'The goal is already reached. Try a goal that costs more than the money saved so far.' };
        const x = frac(goal - have, week);
        const whole = Math.ceil(x.value - 1e-12);
        const steps = [
          R`Let \(x\) be the number of weeks. Money saved already plus weekly savings equals the goal: \(${linear(week, have)} = ${goal}\).`,
        ];
        if (have > 0) steps.push(R`Subtract \(${have}\) from both sides: \(${terms([[week, 'x']])} = ${goal - have}\).`);
        if (week > 1) steps.push(R`Divide by \(${week}\): \(x = ${x.tex()}${x.isInt() ? '' : R` \approx ${num(x.value, { places: 2 })}`}\).`);
        else steps.push(R`So \(x = ${x.tex()}\).`);
        if (!x.isInt()) steps.push(R`Weeks come in whole numbers, so round up: after ${whole - 1} weeks there is not enough yet.`);
        return {
          problem: R`Kai has ${money(have)} and saves ${money(week)} each week. A bike costs ${money(goal)}. How many weeks until Kai can buy it?`,
          steps,
          answer: `${whole} week${whole === 1 ? '' : 's'}`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyTwoStep, easyDivided, easyStory],
    medium: [mediumBothSides, mediumDistribute, mediumCombine, mediumStory],
    hard: [hardBothDistribute, hardFractions, hardFractionAnswer, hardStory],
    challenge: [challengeHowMany, challengeLiteral, challengeFormula, challengeProportion, challengeFindK, challengeConsecutive],
  },
};
