import { R, q, num, frac, Frac, lcm, linear, terms, paren, money, txt, person, round, checkRoots } from '../../lib/index.js';
import { lineFor, clean, tape, unitFmt, an } from './_shared.js';

const asX = (v) => R`\(x = ${num(v)}\)`;
const val = (v) => (v instanceof Frac ? v.value : v);
const solves = (f, x) => () => checkRoots(f, [val(x)]);

const SYM = { '<': '<', '>': '>', '<=': R`\le`, '>=': R`\ge` };
const FLIP = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
const SOFT = { '<': '<=', '>': '>=', '<=': '<', '>=': '>' };
const RELS = ['<', '>', '<=', '>='];
const ineq = (rel, n) => R`\(x ${SYM[rel]} ${num(n)}\)`;
const holds = (rel, a, b) => (rel === '<' ? a < b : rel === '>' ? a > b : rel === '<=' ? a <= b + 1e-9 : a >= b - 1e-9);
/** Passes when "x ansRel b" describes exactly the numbers t with "f(t) rel r". */
const sameSet = (f, rel, r, ansRel, b) => () => ([b - 2.3, b - 0.4, b, b + 0.4, b + 2.3].every((t) => holds(rel, f(t), r) === holds(ansRel, t, b)) ? true : 'solution set does not match the inequality');
const rayFor = (rel, b) => ({ from: b, dir: rel.startsWith('<') ? 'left' : 'right', open: rel.length === 1 });
const describe = (rel, b) => `${rel.length === 1 ? 'An open' : 'A closed'} circle at ${txt(b)} with an arrow pointing ${rel.startsWith('<') ? 'left' : 'right'}`;

// ───────────── Easy (Grade 6): what a solution is, one-step equations, reading inequality graphs ─────────────

function easyOneStep(rng) {
  const kind = rng.pick(['add', 'sub', 'mul', 'div']);
  const p = rng.int(2, 12);
  const x = rng.int(2, 15);
  const spec = {
    add: { eq: R`x + ${p} = ${x + p}`, f: (t) => t + p - (x + p), undo: `Subtract ${p} from both sides`, work: R`${x + p} - ${p}`, bad: x + 2 * p, why: `To undo adding ${p}, subtract ${p} from both sides.` },
    sub: { eq: R`x - ${p} = ${x}`, f: (t) => t - p - x, undo: `Add ${p} to both sides`, work: R`${x} + ${p}`, bad: x > p ? x - p : null, why: `To undo subtracting ${p}, add ${p} to both sides.`, ans: x + p },
    mul: { eq: R`${p}x = ${p * x}`, f: (t) => p * t - p * x, undo: `Divide both sides by ${p}`, work: R`${p * x} \div ${p}`, bad: p * x * p, why: `${p}x means ${p} times x. To undo multiplying by ${p}, divide both sides by ${p}.` },
    div: { eq: R`\frac{x}{${p}} = ${x}`, f: (t) => t / p - x, undo: `Multiply both sides by ${p}`, work: R`${x} \times ${p}`, bad: frac(x, p), why: `To undo dividing by ${p}, multiply both sides by ${p}.`, ans: x * p },
  }[kind];
  const ans = spec.ans ?? x;
  return q({
    prompt: R`Solve for \(x\): \(\;${spec.eq}\)`,
    correct: ans,
    fmt: asX,
    wrong: [{ value: spec.bad, why: spec.why }, ans + 1, ans - 1, ans + p],
    solution: [`${spec.undo}, so the equation stays balanced.`, R`\(x = ${spec.work} = ${ans}\).`, 'Check by putting the value back into the equation: both sides match. ✓'],
    rule: 1,
    skill: 'one-step equations',
    check: solves(spec.f, ans),
  });
}

function easyIsSolution(rng) {
  const a = rng.int(2, 6);
  const b = rng.int(1, 9);
  const x0 = rng.int(3, 9);
  const asInequality = rng.bool(0.4);
  const tries = [x0 - 2, x0 - 1, x0, x0 + 1];
  if (asInequality) {
    // a·x + b > c holds only for the largest of the four values; x0 itself gives exactly c.
    const c = a * x0 + b;
    return q({
      prompt: R`Which value of \(x\) is a solution of \(${a}x + ${b} > ${c}\)?`,
      correct: x0 + 1,
      fmt: asX,
      wrong: [{ value: x0, why: R`With \(x = ${x0}\) the left side is exactly \(${c}\). The inequality needs a value **greater** than \(${c}\).` }, x0 - 1, x0 - 2],
      solution: [
        'A solution makes the statement true. Substitute each value and compare.',
        ...tries.map((v) => R`\(x = ${v}\): \(${a}(${v}) + ${b} = ${a * v + b}\), which is ${v === x0 + 1 ? 'greater than' : v === x0 ? 'equal to, not greater than,' : 'not greater than'} \(${c}\).`),
        R`Only \(x = ${x0 + 1}\) makes the inequality true.`,
      ],
      rule: 0,
      skill: 'checking solutions',
      check: () => (a * (x0 + 1) + b > c && tries.slice(0, 3).every((v) => !(a * v + b > c)) ? true : 'more than one choice works'),
    });
  }
  const c = a * x0 + b;
  return q({
    prompt: R`Which value of \(x\) is a solution of \(${a}x + ${b} = ${c}\)?`,
    correct: x0,
    fmt: asX,
    wrong: tries.filter((v) => v !== x0).concat(x0 + 2),
    solution: ['A solution makes the equation true. Substitute each value into the left side.', ...tries.map((v) => R`\(x = ${v}\): \(${a}(${v}) + ${b} = ${a * v + b}\)${v === x0 ? R`, which equals \(${c}\). ✓` : R`, not \(${c}\).`}`)],
    rule: 0,
    skill: 'checking solutions',
    check: solves((t) => a * t + b - c, x0),
  });
}

function easyInequalityGraph(rng) {
  const b = rng.int(-8, 8);
  const rel = rng.pick(RELS);
  const line = { type: 'numberLine', min: -10, max: 10, step: 1, ray: rayFor(rel, b), alt: `A number line. ${describe(rel, b)}.` };
  const open = rel.length === 1;
  const circleWhy = open ? `The circle is open, so ${txt(b)} itself is not a solution.` : `The circle is filled in, so ${txt(b)} itself is a solution.`;
  const arrowWhy = `The arrow points ${rel.startsWith('<') ? 'left, toward smaller numbers' : 'right, toward greater numbers'}.`;
  if (rng.bool()) {
    return q({
      prompt: 'Which inequality does this number line show?',
      visual: line,
      correct: ineq(rel, b),
      wrong: [{ value: ineq(SOFT[rel], b), why: circleWhy }, { value: ineq(FLIP[rel], b), why: arrowWhy }, ineq(SOFT[FLIP[rel]], b)],
      solution: [`${arrowWhy} So the solutions are ${rel.startsWith('<') ? 'less' : 'greater'} than ${txt(b)}.`, circleWhy, `The graph shows ${ineq(rel, b)}.`],
      rule: 5,
      skill: 'graphing inequalities',
    });
  }
  return q({
    prompt: `Which sentence describes the graph of ${ineq(rel, b)} on a number line?`,
    correct: describe(rel, b),
    wrong: [{ value: describe(SOFT[rel], b), why: open ? R`\(${SYM[rel]}\) does not include ${txt(b)} itself, so the circle is open.` : R`\(${SYM[rel]}\) includes ${txt(b)} itself, so the circle is filled in.` }, { value: describe(FLIP[rel], b), why: `Numbers ${rel.startsWith('<') ? 'less' : 'greater'} than ${txt(b)} are to its ${rel.startsWith('<') ? 'left' : 'right'}.` }, describe(SOFT[FLIP[rel]], b)],
    solution: [
      open ? R`\(${SYM[rel]}\) means ${txt(b)} is not included: use an open circle.` : R`\(${SYM[rel]}\) means ${txt(b)} is included: use a closed (filled) circle.`,
      `The solutions are ${rel.startsWith('<') ? 'less' : 'greater'} than ${txt(b)}, so the arrow points ${rel.startsWith('<') ? 'left' : 'right'}.`,
    ],
    rule: 5,
    skill: 'graphing inequalities',
  });
}

// ───────────── Medium (Grades 6–7): two-step equations, rational one-step equations, stories, one-step inequalities ─────────────

function mediumTwoStep(rng) {
  const p = rng.int(2, 9);
  const q0 = rng.nonzero(-12, 12);
  const x = rng.intExcept(-6, 12, [0, -q0]);
  const op = q0 > 0 ? '+' : '-';
  const Q = Math.abs(q0);
  if (rng.bool(0.55)) {
    const r = p * x + q0;
    return q({
      prompt: R`Solve for \(x\): \(\;${linear(p, q0)} = ${r}\)`,
      visual: q0 > 0 && x > 0 && p <= 5 ? { type: 'barModel', rows: [{ parts: [...Array(p).fill({ value: x, label: 'x', shade: 'a' }), { value: q0, label: `${q0}`, shade: 'b' }], total: `${r}` }], alt: `A tape diagram: ${p} boxes labelled x and one box labelled ${q0} make ${r} in all.` } : undefined,
      correct: x,
      fmt: asX,
      wrong: [
        { value: frac(r + q0, p), why: R`To undo \(${op} ${Q}\), do the opposite on both sides.` },
        { value: r - q0, why: R`That is the value of \(${p}x\). Divide by \(${p}\) to finish.` },
        frac(r, p).sub(q0),
        x + 1,
        -x,
      ],
      solution: [R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Q}\) ${q0 > 0 ? 'from' : 'to'} both sides: \(${p}x = ${r - q0}\).`, R`Divide both sides by \(${p}\): \(x = ${x}\).`, R`Check: \(${p}(${x}) ${op} ${Q} = ${r}\). ✓`],
      rule: 2,
      skill: 'two-step equations',
      check: solves((t) => p * t + q0 - r, x),
    });
  }
  const r = p * (x + q0);
  return q({
    prompt: R`Solve for \(x\): \(\;${p}(${linear(1, q0)}) = ${r}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(r - q0, p), why: R`The \(${p}\) multiplies the whole parentheses. Divide both sides by \(${p}\) first, or distribute to get \(${linear(p, p * q0)}\).` },
      { value: frac(r, p).add(q0), why: R`After dividing by \(${p}\), undo \(${op} ${Q}\) with the opposite operation.` },
      r / p,
      x + 1,
      -x,
    ],
    solution: [R`Divide both sides by \(${p}\): \(${linear(1, q0)} = ${r / p}\).`, R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Q}\) ${q0 > 0 ? 'from' : 'to'} both sides: \(x = ${x}\).`, R`Check: \(${p}(${x} ${op} ${Q}) = ${p}(${x + q0}) = ${r}\). ✓`],
    rule: 3,
    skill: 'equations with parentheses',
    check: solves((t) => p * (t + q0) - r, x),
  });
}

function mediumRationalOneStep(rng) {
  const kind = rng.pick(['fracAdd', 'fracMul', 'decAdd', 'decMul']);
  if (kind === 'fracAdd') {
    const [d1, d2] = rng.pick([[2, 4], [3, 6], [4, 8], [2, 6], [5, 10], [3, 4], [2, 3], [2, 5]]);
    const a = frac(rng.int(1, d1 - 1), d1);
    const x = frac(rng.int(1, d2 - 1), d2);
    const sum = x.add(a);
    // The subtraction written out over the common denominator, leaving out any form that repeats.
    const L = lcm(sum.d, a.d);
    const [S, A] = [sum.n * (L / sum.d), a.n * (L / a.d)];
    const chain = [R`${sum.mixedTex()} - ${a.tex()}`, R`\frac{${S}}{${L}} - \frac{${A}}{${L}}`, R`\frac{${S - A}}{${L}}`, x.tex()].filter((t, i, all) => i === 0 || t !== all[i - 1]);
    return q({
      prompt: R`Solve for \(x\): \(\;x + ${a.tex()} = ${sum.mixedTex()}\)`,
      correct: x,
      fmt: asX,
      wrong: [{ value: sum.add(a), why: R`To undo adding \(${a.tex()}\), subtract it from both sides.` }, { value: sum, why: R`That is the right side of the equation. Subtract \(${a.tex()}\) from it to find \(x\).` }, x.add(frac(1, x.d)), x.add(1)],
      solution: [R`Subtract \(${a.tex()}\) from both sides: \(x = ${sum.mixedTex()} - ${a.tex()}\).`, R`Subtract over the common denominator \(${L}\): \(${chain.join(' = ')}\). So \(x = ${x.tex()}\).`, R`Check: \(${x.tex()} + ${a.tex()} = ${sum.mixedTex()}\). ✓`],
      rule: 1,
      skill: 'equations with fractions',
      check: solves((t) => t + a.value - sum.value, x),
    });
  }
  if (kind === 'fracMul') {
    const [n, d] = rng.pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [1, 3], [1, 4]]);
    const k = rng.int(2, 9);
    const x = d * k;
    const c = n * k;
    return q({
      prompt: R`Solve for \(x\): \(\;\frac{${n}}{${d}}x = ${c}\)`,
      correct: x,
      fmt: asX,
      wrong: [{ value: frac(c * n, d), why: R`To undo multiplying by \(\frac{${n}}{${d}}\), multiply both sides by its reciprocal, \(${frac(d, n).tex()}\).` }, n > 1 ? { value: c * d, why: R`Multiplying by \(${d}\) undoes the denominator. Divide by \(${n}\) as well.` } : null, x + d, k, x - 1],
      solution: [R`Multiply both sides by the reciprocal of \(\frac{${n}}{${d}}\), which is \(${frac(d, n).tex()}\).`, R`\(x = ${c} \times ${frac(d, n).tex()} = ${x}\).`, R`Check: \(\frac{${n}}{${d}} \times ${x} = ${c}\). ✓`],
      rule: 1,
      skill: 'equations with fractions',
      check: solves((t) => (n / d) * t - c, x),
    });
  }
  if (kind === 'decAdd') {
    const p = rng.int(11, 69) / 10;
    const minus = rng.bool();
    const x = minus ? round(p + rng.int(4, 60) / 10, 1) : rng.int(12, 95) / 10;
    const r = round(minus ? x - p : x + p, 1);
    return q({
      prompt: R`Solve for \(x\): \(\;x ${minus ? '-' : '+'} ${p} = ${r}\)`,
      correct: x,
      fmt: asX,
      wrong: [{ value: round(minus ? r - p : r + p, 1), why: `To undo ${minus ? 'subtracting' : 'adding'} ${p}, ${minus ? 'add' : 'subtract'} ${p} on both sides.` }, round(x + 1, 1), round(x + 0.1, 1), round(x + 10, 1)],
      solution: [R`${minus ? 'Add' : 'Subtract'} \(${p}\) ${minus ? 'to' : 'from'} both sides: \(x = ${r} ${minus ? '+' : '-'} ${p} = ${x}\).`, R`Check: \(${x} ${minus ? '-' : '+'} ${p} = ${r}\). ✓`],
      rule: 1,
      skill: 'equations with decimals',
      check: solves((t) => (minus ? t - p : t + p) - r, x),
    });
  }
  const p = rng.pick([0.2, 0.25, 0.4, 0.5, 0.8, 1.5, 2.5]);
  const x = rng.pick([4, 6, 8, 10, 12, 16, 20, 24, 30, 40]);
  const r = round(p * x, 2);
  return q({
    prompt: R`Solve for \(x\): \(\;${p}x = ${r}\)`,
    correct: x,
    fmt: asX,
    wrong: [{ value: round(p * r, 3), why: R`\(${p}x\) means \(${p}\) times \(x\). To undo it, divide both sides by \(${p}\).` }, clean(r - p) > 0 ? round(r - p, 2) : null, x * 10, x + 2, x / 2],
    solution: [R`Divide both sides by \(${p}\): \(x = ${r} \div ${p} = ${x}\).`, R`Check: \(${p} \times ${x} = ${r}\). ✓`],
    rule: 1,
    skill: 'equations with decimals',
    check: solves((t) => p * t - r, x),
  });
}

function mediumStory(rng) {
  const name = person(rng);
  const kind = rng.pick(['plumber', 'tickets', 'saving', 'friends']);
  if (kind === 'friends') {
    const n = rng.int(3, 6);
    const snack = rng.int(3, 8);
    const ticket = rng.int(6, 15);
    const total = n * (ticket + snack);
    return q({
      prompt: `${n} friends go to a movie. Each one buys a ticket and ${an(snack)} ${money(snack)} snack. Together they spend ${money(total)}. How much does one ticket cost?`,
      correct: ticket,
      fmt: money,
      wrong: [
        { value: clean((total - snack) / n), why: `Every friend buys a snack, so ${money(snack)} is spent ${n} times, not once.` },
        { value: total / n, why: `That is what one friend spends on a ticket and a snack together. Take away the ${money(snack)} snack.` },
        ticket + snack + 1,
        ticket + 1,
        ticket - 1,
      ],
      solution: [R`Let \(x\) be the price of a ticket. Each friend spends \(x + ${snack}\), and there are ${n} friends: \(${n}(x + ${snack}) = ${total}\).`, R`Divide both sides by \(${n}\): \(x + ${snack} = ${total / n}\).`, R`Subtract \(${snack}\): \(x = ${ticket}\). One ticket costs ${money(ticket)}.`],
      rule: 4,
      skill: 'word problems',
      check: solves((t) => n * (t + snack) - total, ticket),
    });
  }
  const rate = kind === 'plumber' ? rng.int(20, 45) : kind === 'tickets' ? rng.int(6, 18) : rng.int(5, 20);
  const fixed = kind === 'plumber' ? rng.int(25, 60) : kind === 'tickets' ? rng.int(2, 9) : rng.int(15, 90);
  const x = rng.int(2, 9);
  const total = rate * x + fixed;
  const c = {
    plumber: { text: `A plumber charges ${money(fixed)} to come to the house, plus ${money(rate)} for each hour of work. The bill is ${money(total)}. How many hours did the plumber work?`, unit: 'hour', each: `${money(rate)} for each hour`, once: `the ${money(fixed)} call-out charge` },
    tickets: { text: `${name} buys concert tickets online. Each ticket costs ${money(rate)}, and there is one booking fee of ${money(fixed)}. The total is ${money(total)}. How many tickets does ${name} buy?`, unit: 'ticket', each: `${money(rate)} for each ticket`, once: `the ${money(fixed)} booking fee` },
    saving: { text: `${name} has ${money(fixed)} and saves ${money(rate)} every week. After how many weeks will ${name} have exactly ${money(total)}?`, unit: 'week', each: `${money(rate)} for each week`, once: `the ${money(fixed)} ${name} starts with` },
  }[kind];
  return q({
    prompt: c.text,
    correct: x,
    fmt: unitFmt(c.unit),
    wrong: [
      { value: clean((total + fixed) / rate), why: `${c.once[0].toUpperCase()}${c.once.slice(1)} is part of the ${money(total)}, so subtract it before dividing.` },
      { value: clean(total / rate, 1), why: `Not all of the ${money(total)} is ${c.each}. Take away ${c.once} first.` },
      x + 1,
      x - 1,
      x + 2,
    ],
    solution: [
      R`Let \(x\) be the number of ${c.unit}s. ${c.each[0].toUpperCase()}${c.each.slice(1)} gives \(${rate}x\), and ${c.once} is added once: \(${rate}x + ${fixed} = ${total}\).`,
      R`Subtract \(${fixed}\) from both sides: \(${rate}x = ${total - fixed}\).`,
      R`Divide both sides by \(${rate}\): \(x = ${x}\). The answer is ${x} ${c.unit}s.`,
    ],
    rule: 4,
    skill: 'word problems',
    check: solves((t) => rate * t + fixed - total, x),
  });
}

function mediumInequalityOneStep(rng) {
  const kind = rng.pick(['add', 'sub', 'mul', 'div']);
  const rel = rng.pick(RELS);
  const p = rng.int(2, 9);
  const b = rng.nonzero(-9, 12);
  const spec = {
    add: { lhs: `x + ${p}`, r: b + p, f: (t) => t + p, undo: R`Subtract \(${p}\) from both sides`, off: b + 2 * p },
    sub: { lhs: `x - ${p}`, r: b - p, f: (t) => t - p, undo: R`Add \(${p}\) to both sides`, off: b - 2 * p },
    mul: { lhs: `${p}x`, r: b * p, f: (t) => p * t, undo: R`Divide both sides by \(${p}\)`, off: b * p * p },
    div: { lhs: R`\frac{x}{${p}}`, r: b, f: (t) => t / p, undo: R`Multiply both sides by \(${p}\)`, off: frac(b, p), ans: b * p },
  }[kind];
  const ans = spec.ans ?? b;
  return q({
    prompt: R`Solve the inequality: \(\;${spec.lhs} ${SYM[rel]} ${spec.r}\)`,
    correct: ineq(rel, ans),
    wrong: [
      { value: ineq(FLIP[rel], ans), why: 'The inequality sign is reversed only when both sides are multiplied or divided by a negative number. That did not happen here.' },
      { value: ineq(rel, spec.off), why: 'Use the inverse operation to undo what was done to x.' },
      { value: ineq(SOFT[rel], ans), why: R`The symbol does not change: \(${SYM[rel]}\) stays \(${SYM[rel]}\).` },
      ineq(FLIP[rel], spec.off),
    ],
    solution: [`${spec.undo}. ${kind === 'add' || kind === 'sub' ? 'Adding or subtracting never changes the direction of the sign.' : `${p} is positive, so the sign stays the same.`}`, `The solution is ${ineq(rel, ans)}.`],
    rule: 6,
    skill: 'one-step inequalities',
    check: sameSet(spec.f, rel, spec.r, rel, ans),
  });
}

// ───────────── Hard (Grade 7): rational and negative numbers, reversing the sign, stories with inequalities ─────────────

function hardTwoStepRational(rng) {
  const kind = rng.pick(['negative', 'fraction', 'decimal', 'paren']);
  if (kind === 'negative') {
    const p = -rng.int(2, 9);
    const q0 = rng.nonzero(-12, 12);
    const r = rng.int(-15, 15);
    const x = frac(r - q0, p);
    if (x.n === 0) return hardTwoStepRational(rng);
    return q({
      prompt: R`Solve for \(x\): \(\;${linear(p, q0)} = ${r}\)`,
      correct: x,
      fmt: asX,
      wrong: [{ value: x.neg(), why: R`Dividing by \(${p}\) changes the sign: \(${r - q0} \div (${p})\) is ${x.n < 0 ? 'negative' : 'positive'}.` }, { value: frac(r + q0, p), why: R`To undo \(${q0 > 0 ? '+' : '-'} ${Math.abs(q0)}\), do the opposite on both sides.` }, frac(r - q0, 1), x.add(1)],
      solution: [R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(q0)}\) ${q0 > 0 ? 'from' : 'to'} both sides: \(${p}x = ${r - q0}\).`, R`Divide both sides by \(${p}\): \(x = ${x.tex()}\).`, R`Check: \(${p}\left(${x.tex()}\right) ${q0 > 0 ? '+' : '-'} ${Math.abs(q0)} = ${r}\). ✓`],
      rule: 2,
      skill: 'two-step equations',
      check: solves((t) => p * t + q0 - r, x),
    });
  }
  if (kind === 'fraction') {
    const [n, d] = rng.pick([[1, 2], [2, 3], [3, 4], [1, 4], [2, 5], [3, 5], [1, 3], [5, 6]]);
    const sign = rng.sign();
    const k = rng.nonzero(-6, 6);
    if (Math.abs(n * k) === 1) return hardTwoStepRational(rng);
    const q0 = rng.nonzero(-9, 9);
    const x = d * k;
    const r = sign * n * k + q0;
    const coef = frac(sign * n, d);
    return q({
      prompt: R`Solve for \(x\): \(\;${terms([[coef, 'x'], [q0, '']])} = ${r}\)`,
      correct: x,
      fmt: asX,
      wrong: [{ value: coef.mul(r - q0), why: R`To undo multiplying by \(${coef.tex()}\), multiply both sides by its reciprocal, \(${coef.inv().tex()}\).` }, { value: frac((r + q0) * d, sign * n), why: R`To undo \(${q0 > 0 ? '+' : '-'} ${Math.abs(q0)}\), do the opposite on both sides.` }, -x, x + d],
      solution: [R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(q0)}\) ${q0 > 0 ? 'from' : 'to'} both sides: \(${terms([[coef, 'x']])} = ${r - q0}\).`, R`Multiply both sides by the reciprocal, \(${coef.inv().tex()}\): \(x = ${paren(r - q0)} \times ${coef.n < 0 ? R`\left(${coef.inv().tex()}\right)` : coef.inv().tex()} = ${x}\).`, R`Check: \(${coef.tex()} \times ${paren(x)} ${q0 > 0 ? '+' : '-'} ${Math.abs(q0)} = ${r}\). ✓`],
      rule: 2,
      skill: 'equations with fractions',
      check: solves((t) => coef.value * t + q0 - r, x),
    });
  }
  if (kind === 'decimal') {
    const p = rng.pick([0.2, 0.4, 0.5, 1.5, 2.5, 0.25]);
    const x = rng.pick([-12, -8, -4, 4, 8, 12, 16, 20]);
    const q0 = round(rng.nonzero(-40, 40) / 10, 1);
    const r = round(p * x + q0, 2);
    return q({
      prompt: R`Solve for \(x\): \(\;${terms([[p, 'x'], [q0, '']])} = ${num(r)}\)`,
      correct: x,
      fmt: asX,
      wrong: [{ value: round((r + q0) / p, 2), why: R`To undo \(${q0 > 0 ? '+' : '-'} ${Math.abs(q0)}\), do the opposite on both sides.` }, { value: round((r - q0) * p, 3), why: R`To undo multiplying by \(${p}\), divide both sides by \(${p}\).` }, -x, x + 2],
      solution: [R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(q0)}\) ${q0 > 0 ? 'from' : 'to'} both sides: \(${p}x = ${num(round(r - q0, 2))}\).`, R`Divide both sides by \(${p}\): \(x = ${x}\).`, R`Check: \(${p}(${x}) ${q0 > 0 ? '+' : '-'} ${Math.abs(q0)} = ${num(r)}\). ✓`],
      rule: 2,
      skill: 'equations with decimals',
      check: solves((t) => p * t + q0 - r, x),
    });
  }
  const p = rng.pick([-6, -5, -4, -3, -2, frac(1, 2), frac(1, 3), frac(3, 2), frac(2, 3)]);
  const pv = val(p);
  const q0 = rng.nonzero(-8, 8);
  const inner = (p instanceof Frac ? p.d : 1) * rng.nonzero(-5, 5);
  const x = inner - q0;
  const r = p instanceof Frac ? (p.n * inner) / p.d : p * inner;
  if (x === 0) return hardTwoStepRational(rng);
  const pTex = p instanceof Frac ? p.tex() : `${p}`;
  return q({
    prompt: R`Solve for \(x\): \(\;${pTex}(${linear(1, q0)}) = ${r}\)`,
    correct: x,
    fmt: asX,
    wrong: [{ value: clean((r - q0) / pv), why: R`The \(${pTex}\) multiplies the whole parentheses. Divide both sides by it before dealing with \(${q0 > 0 ? '+' : '-'} ${Math.abs(q0)}\).` }, { value: inner + q0, why: R`After dividing, undo \(${q0 > 0 ? '+' : '-'} ${Math.abs(q0)}\) with the opposite operation.` }, -x, inner],
    solution: [R`Divide both sides by \(${pTex}\)${p instanceof Frac ? ' (multiply by its reciprocal)' : ''}: \(${linear(1, q0)} = ${inner}\).`, R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(q0)}\) ${q0 > 0 ? 'from' : 'to'} both sides: \(x = ${x}\).`, R`Check: \(${pTex}(${x} ${q0 > 0 ? '+' : '-'} ${Math.abs(q0)}) = ${pTex}(${inner}) = ${r}\). ✓`],
    rule: 3,
    skill: 'equations with parentheses',
    check: solves((t) => pv * (t + q0) - r, x),
  });
}

function hardInequalityNegative(rng) {
  const p = -rng.int(2, 9);
  const q0 = rng.nonzero(-12, 12);
  const b = rng.nonzero(-9, 9);
  const rel = rng.pick(RELS);
  const r = p * b + q0;
  const ans = FLIP[rel];
  return q({
    prompt: R`Solve the inequality: \(\;${linear(p, q0)} ${SYM[rel]} ${r}\)`,
    correct: ineq(ans, b),
    wrong: [
      { value: ineq(rel, b), why: R`Both sides were divided by \(${p}\), a negative number, so the inequality sign must be reversed.` },
      { value: ineq(ans, -b), why: R`Check the sign of the number: \(${r - q0} \div (${p}) = ${b}\).` },
      ineq(rel, -b),
      ineq(SOFT[ans], b),
    ],
    solution: [
      R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(q0)}\) ${q0 > 0 ? 'from' : 'to'} both sides. The sign stays the same: \(${p}x ${SYM[rel]} ${r - q0}\).`,
      R`Divide both sides by \(${p}\). Dividing by a negative number reverses the sign: \(x ${SYM[ans]} ${b}\).`,
      R`Check a value: \(x = ${ans.startsWith('<') ? b - 1 : b + 1}\) gives \(${p}(${ans.startsWith('<') ? b - 1 : b + 1}) ${q0 > 0 ? '+' : '-'} ${Math.abs(q0)} = ${p * (ans.startsWith('<') ? b - 1 : b + 1) + q0}\), and that is ${rel.startsWith('<') ? 'less' : 'greater'} than \(${r}\). ✓`,
    ],
    rule: 6,
    skill: 'reversing the inequality sign',
    check: sameSet((t) => p * t + q0, rel, r, ans, b),
  });
}

function hardStoryInequality(rng) {
  const name = person(rng);
  const kind = rng.pick(['rides', 'boxes', 'saving', 'texts']);
  const each = kind === 'boxes' ? rng.int(12, 30) : kind === 'saving' ? rng.int(8, 25) : rng.int(3, 9);
  const fixed = kind === 'boxes' ? rng.int(60, 95) : kind === 'saving' ? rng.int(20, 80) : rng.int(5, 20);
  const n = rng.int(3, 12);
  const extra = rng.int(1, each - 1);
  const atMost = kind !== 'saving';
  const limit = atMost ? each * n + fixed + extra : each * (n - 1) + fixed + extra;
  const c = {
    rides: { text: `${name} has ${money(limit)} to spend at a fair. Entry costs ${money(fixed)} and each ride costs ${money(each)}. What is the greatest number of rides ${name} can pay for?`, unit: 'ride' },
    boxes: { text: `A lift can carry at most ${limit} kilograms. A worker with a mass of ${fixed} kilograms rides in it with boxes that are ${each} kilograms each. What is the greatest number of boxes the lift can carry with the worker?`, unit: 'box', many: 'boxes' },
    texts: { text: `${name}'s phone plan costs ${money(fixed)} a month plus ${money(each)} for each gigabyte of data. ${name} wants the bill to be at most ${money(limit)}. What is the greatest whole number of gigabytes ${name} can use?`, unit: 'gigabyte' },
    saving: { text: `${name} has ${money(fixed)} and saves ${money(each)} each week. ${name} needs at least ${money(limit)} for a tablet. What is the smallest number of weeks ${name} must save?`, unit: 'week' },
  }[kind];
  const exact = frac(limit - fixed, each);
  const rel = atMost ? '<=' : '>=';
  return q({
    prompt: c.text,
    correct: n,
    fmt: unitFmt(c.unit, c.many),
    wrong: [
      { value: atMost ? n + 1 : n - 1, why: atMost ? `${n + 1} would go over the limit. Round down, because part of one more is not enough.` : `After ${n - 1} weeks there is not enough yet. Round up to the next whole week.` },
      { value: Math.floor(limit / each) !== n ? Math.floor(limit / each) : null, why: `The ${kind === 'boxes' ? `worker's ${fixed} kilograms` : money(fixed)} must be taken off first. It is not part of the amount that repeats.` },
      n + 2,
      n - 2 > 0 ? n - 2 : n + 3,
      atMost ? n - 1 : n + 1,
    ],
    solution: [
      R`Let \(x\) be the number of ${c.many ?? `${c.unit}s`}. "${atMost ? 'At most' : 'At least'}" gives the inequality \(${each}x + ${fixed} ${SYM[rel]} ${limit}\).`,
      R`Subtract \(${fixed}\) from both sides: \(${each}x ${SYM[rel]} ${limit - fixed}\).`,
      R`Divide both sides by \(${each}\): \(x ${SYM[rel]} ${exact.mixedTex()}\).`,
      atMost ? `Only whole ${c.many ?? `${c.unit}s`} make sense, so round down: ${n}.` : `Only whole weeks make sense, and ${n - 1} weeks is not enough, so round up: ${n}.`,
    ],
    rule: 6,
    skill: 'word problems',
    check: () => ((atMost ? each * n + fixed <= limit && each * (n + 1) + fixed > limit : each * n + fixed >= limit && each * (n - 1) + fixed < limit) ? true : 'not the best whole number'),
  });
}

// ───────────── Challenge ─────────────

function challengeError(rng) {
  const name = person(rng);
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const rel = rng.pick(RELS);
  const kind = rng.pick(['noFlip', 'flipOnAdd', 'signSlip']);
  const options = {
    noFlip: 'The inequality sign should have been reversed, because both sides were divided by a negative number.',
    flipOnAdd: 'The inequality sign should not have been reversed. Adding or subtracting the same number on both sides keeps the direction.',
    signSlip: 'The sign of the number is wrong. A positive number divided by a negative number is negative.',
    none: `Nothing went wrong. ${name}'s answer is correct.`,
  };
  const spec = {
    noFlip: { given: R`${-a}x ${SYM[rel]} ${a * b}`, wrote: ineq(rel, -b), right: ineq(FLIP[rel], -b), how: R`Divide both sides by \(${-a}\) and reverse the sign: \(x ${SYM[FLIP[rel]]} ${-b}\).` },
    flipOnAdd: { given: R`x + ${a} ${SYM[rel]} ${a + b}`, wrote: ineq(FLIP[rel], b), right: ineq(rel, b), how: R`Subtract \(${a}\) from both sides and keep the sign: \(x ${SYM[rel]} ${b}\).` },
    signSlip: { given: R`${-a}x ${SYM[rel]} ${a * b}`, wrote: ineq(FLIP[rel], b), right: ineq(FLIP[rel], -b), how: R`Divide both sides by \(${-a}\) and reverse the sign: \(${a * b} \div (${-a}) = ${-b}\), so \(x ${SYM[FLIP[rel]]} ${-b}\).` },
  }[kind];
  return q({
    prompt: R`${name} solved \(${spec.given}\) and wrote ${spec.wrote}. What went wrong?`,
    correct: options[kind],
    wrong: Object.keys(options).filter((k) => k !== kind).map((k) => options[k]),
    solution: [spec.how, `The correct solution is ${spec.right}, not ${spec.wrote}.`, 'Reverse the sign only when multiplying or dividing both sides by a negative number.'],
    rule: 6,
    skill: 'checking work',
  });
}

function challengeCount(rng) {
  const p = rng.int(2, 6);
  const q0 = rng.int(1, 12);
  const kind = rng.pick(['count', 'greatest', 'least']);
  if (kind === 'count') {
    const strict = rng.bool();
    const b = rng.int(3, 9);
    const r = p * b + q0;
    const count = strict ? b : b + 1;
    const rel = strict ? '<' : '<=';
    return q({
      prompt: R`How many whole numbers \((0, 1, 2, 3, \ldots)\) are solutions of \(${linear(p, q0)} ${SYM[rel]} ${r}\)?`,
      correct: count,
      wrong: [
        { value: strict ? b + 1 : b, why: strict ? R`\(x < ${b}\) does not include \(${b}\) itself.` : R`Remember to count 0, and \(x \le ${b}\) includes \(${b}\) itself.` },
        strict ? { value: b - 1, why: 'Remember that 0 is a whole number, so start counting at 0.' } : b + 2,
        count + 3,
        count + 5,
      ],
      solution: [R`Subtract \(${q0}\): \(${p}x ${SYM[rel]} ${r - q0}\). Divide by \(${p}\): \(x ${SYM[rel]} ${b}\).`, R`The whole numbers that fit are \(${(strict ? b - 1 : b) <= 4 ? Array.from({ length: count }, (_, i) => i).join(', ') : R`0, 1, 2, \ldots, ${strict ? b - 1 : b}`}\).`, `Counting from 0, that is ${count} numbers.`],
      rule: 6,
      skill: 'counting solutions',
      check: () => (Array.from({ length: 40 }, (_, t) => t).filter((t) => holds(rel, p * t + q0, r)).length === count ? true : 'count is wrong'),
    });
  }
  const b = rng.nonzero(-8, 8);
  const off = rng.int(1, p - 1);
  const greatest = kind === 'greatest';
  // −p·x + q0 > r  ⇔  x < boundary, where the boundary b + off/p is not a whole number.
  const r = -p * b - off + q0;
  const rel = greatest ? '>' : '<';
  const boundary = frac(p * b + off, p);
  const ans = greatest ? Math.floor(boundary.value) : Math.ceil(boundary.value);
  return q({
    prompt: R`What is the ${greatest ? 'greatest' : 'least'} integer that is a solution of \(${linear(-p, q0)} ${SYM[rel]} ${r}\)?`,
    correct: ans,
    wrong: [
      { value: greatest ? ans + 1 : ans - 1, why: R`The solution is \(x ${SYM[FLIP[rel]]} ${boundary.mixedTex()}\). This integer is on the wrong side of the boundary.` },
      ans !== 0 ? { value: -ans, why: R`Check the sign when dividing: \(${r - q0} \div (${-p}) = ${boundary.mixedTex()}\).` } : null,
      ans + 2,
      ans - 2,
      ans + 3,
    ],
    solution: [
      R`Subtract \(${q0}\) from both sides: \(${-p}x ${SYM[rel]} ${r - q0}\).`,
      R`Divide by \(${-p}\) and reverse the sign: \(x ${SYM[FLIP[rel]]} ${boundary.mixedTex()}\).`,
      R`The ${greatest ? 'greatest integer less than' : 'least integer greater than'} \(${boundary.mixedTex()}\) is \(${ans}\).`,
    ],
    rule: 6,
    skill: 'integer solutions',
    check: () => (holds(rel, -p * ans + q0, r) && !holds(rel, -p * (greatest ? ans + 1 : ans - 1) + q0, r) ? true : 'not the extreme integer solution'),
  });
}

function challengeStory(rng) {
  const name = person(rng);
  const kind = rng.pick(['celsius', 'coupon', 'think', 'perimeter']);
  if (kind === 'celsius') {
    const c = rng.pick([-20, -15, -10, -5, 5, 10, 15, 20, 25, 30, 35, 40]);
    const f = (9 * c) / 5 + 32;
    return q({
      prompt: R`The formula \(C = \frac{5}{9}(F - 32)\) changes a temperature in degrees Fahrenheit, \(F\), into degrees Celsius, \(C\). A thermometer shows \(${c}\) degrees Celsius. What is this temperature in degrees Fahrenheit?`,
      correct: f,
      fmt: (v) => R`\(${num(v)}\)°F`,
      wrong: [{ value: clean((5 / 9) * (c - 32), 1), why: 'That puts the Celsius temperature in place of F. Here C is known, so put it on the left and solve for F.' }, { value: (9 * c) / 5 - 32, why: 'After multiplying by the reciprocal, undo "− 32" by adding 32.' }, { value: clean((5 * c) / 9 + 32, 1), why: R`Undo multiplying by \(\frac{5}{9}\) by multiplying by \(\frac{9}{5}\).` }, f + 9, f - 5],
      solution: [R`Substitute \(C = ${c}\): \(${c} = \frac{5}{9}(F - 32)\).`, R`Multiply both sides by \(\frac{9}{5}\): \(F - 32 = ${(9 * c) / 5}\).`, R`Add 32 to both sides: \(F = ${f}\).`],
      rule: 3,
      skill: 'word problems',
      check: solves((t) => (5 / 9) * (t - 32) - c, f),
    });
  }
  if (kind === 'coupon') {
    const n = rng.int(3, 6);
    const snack = rng.int(3, 7);
    const ticket = rng.int(7, 14);
    const off = rng.int(4, 12);
    const total = n * (ticket + snack) - off;
    return q({
      prompt: `${n} friends each buy a movie ticket and ${an(snack)} ${money(snack)} snack. A coupon takes ${money(off)} off the whole bill, and they pay ${money(total)} in all. What is the price of one ticket?`,
      correct: ticket,
      fmt: money,
      wrong: [{ value: clean((total - off) / n - snack), why: `The coupon made the bill smaller. To find the bill before the coupon, add ${money(off)} back.` }, { value: clean((total + off - snack) / n), why: `Every friend buys a snack, so ${money(snack)} is spent ${n} times.` }, ticket + 1, ticket - 1, ticket + snack],
      solution: [R`Let \(x\) be the ticket price: \(${n}(x + ${snack}) - ${off} = ${total}\).`, R`Add \(${off}\) to both sides: \(${n}(x + ${snack}) = ${total + off}\).`, R`Divide both sides by \(${n}\): \(x + ${snack} = ${(total + off) / n}\).`, R`Subtract \(${snack}\): \(x = ${ticket}\). A ticket costs ${money(ticket)}.`],
      rule: 4,
      skill: 'word problems',
      check: solves((t) => n * (t + snack) - off - total, ticket),
    });
  }
  if (kind === 'think') {
    const p = rng.int(2, 7);
    const sub = rng.intExcept(2, 12, [p]);
    const x = rng.intExcept(-9, 9, [0, sub + 1]);
    const r = p * (x - sub);
    return q({
      prompt: `${name} thinks of a number, subtracts ${sub} from it, and then multiplies the result by ${p}. The answer is ${txt(r)}. What number did ${name} start with?`,
      correct: x,
      wrong: [{ value: r / p - sub, why: `Undo "subtract ${sub}" by adding ${sub}.` }, { value: clean((r + sub) / p), why: `Undo the steps in reverse order: divide by ${p} first, then add ${sub}.` }, x + 1, -x, x - 1],
      solution: [R`Write the steps as an equation: \(${p}(x - ${sub}) = ${r}\).`, R`Undo the last step first. Divide both sides by \(${p}\): \(x - ${sub} = ${r / p}\).`, R`Add \(${sub}\) to both sides: \(x = ${x}\).`],
      rule: 3,
      skill: 'working backwards',
      check: solves((t) => p * (t - sub) - r, x),
    });
  }
  const w = rng.int(3, 15);
  const more = rng.int(2, 9);
  const P = 2 * (2 * w + more);
  return q({
    prompt: `A rectangle is ${more} centimeters longer than it is wide. Its perimeter is ${P} centimeters. What is its width?`,
    correct: w,
    unit: 'cm',
    wrong: [{ value: w + more, why: 'That is the length. The question asks for the width.' }, { value: clean((P - more) / 2), why: 'A perimeter counts two lengths and two widths: 2(width + length).' }, { value: clean(P / 4), why: 'That would be the side of a square with this perimeter. Here the length and the width are different.' }, w + 1, w + 2],
    solution: [R`Let \(x\) be the width. The length is \(x + ${more}\), so the perimeter is \(2(x + x + ${more}) = ${P}\).`, R`Divide both sides by 2: \(2x + ${more} = ${P / 2}\).`, R`Subtract \(${more}\): \(2x = ${P / 2 - more}\). Divide by 2: \(x = ${w}\) cm.`],
    rule: 3,
    skill: 'word problems',
    check: solves((t) => 2 * (t + t + more) - P, w),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'equations-inequalities',
  title: 'Equations & Inequalities',
  summary: 'Solve one- and two-step equations and inequalities, graph inequalities on a number line, and write them from stories.',
  grade: 'Grades 6–7',
  standards: ['CCSS 6.EE.B.5', 'CCSS 6.EE.B.7', 'CCSS 6.EE.B.8', 'CCSS 7.EE.B.4'],

  explain: {
    intro: R`An **equation** says that two expressions are equal, like a balanced scale. Solving it means finding the value of the variable that makes it true. An **inequality** uses \(<\), \(>\), \(\le\) or \(\ge\) instead of \(=\), and it usually has many solutions. Both are solved the same way: undo what was done to the variable, doing the same thing to both sides.`,
    rules: [
      {
        title: 'A solution makes the statement true',
        text: R`To test a value, substitute it for the variable and see whether the two sides match (or whether the inequality holds). Always check an answer this way.`,
        example: R`Is \(x = 4\) a solution of \(3x + 2 = 14\)? \(3(4) + 2 = 14\). Yes. ✓`,
      },
      {
        title: 'One-step equations: use the inverse operation',
        text: R`Addition and subtraction undo each other. Multiplication and division undo each other. Do the inverse operation on **both** sides. To undo multiplying by a fraction, multiply by its reciprocal.`,
        example: R`\(x + 7 = 12\) gives \(x = 5\). \(4x = 28\) gives \(x = 7\). \(\frac{2}{3}x = 8\) gives \(x = 8 \times \frac{3}{2} = 12\).`,
      },
      {
        title: 'Two-step equations: px + q = r',
        text: R`Undo the addition or subtraction first, then undo the multiplication or division. This is the order of operations run backwards.`,
        example: R`\(3x + 5 = 20\). Subtract 5: \(3x = 15\). Divide by 3: \(x = 5\).`,
      },
      {
        title: 'Equations with parentheses: p(x + q) = r',
        text: R`The number in front multiplies the whole parentheses. Either divide both sides by it first, or distribute and then solve the two-step equation.`,
        example: R`\(4(x - 2) = 18\). Divide by 4: \(x - 2 = 4.5\). Add 2: \(x = 6.5\).`,
      },
      {
        title: 'Writing an equation or inequality from a story',
        text: R`Name the unknown with a letter. An amount that repeats is multiplied by the letter, and an amount that happens once is added or subtracted. "At most" means \(\le\), "at least" means \(\ge\), "more than" means \(>\) and "fewer than" means \(<\).`,
        example: R`$45 to call a plumber plus $30 an hour, for a bill of $165: \(30h + 45 = 165\).`,
      },
      {
        title: 'Inequalities and their graphs',
        text: R`The solutions of an inequality are graphed as a ray on a number line. Use an **open** circle for \(<\) or \(>\) (the end point is not included) and a **closed** circle for \(\le\) or \(\ge\) (it is included). The arrow points toward the solutions.`,
        example: R`\(x > 3\): open circle at 3, arrow to the right. \(x \le -2\): closed circle at \(-2\), arrow to the left.`,
      },
      {
        title: 'Solving inequalities: reverse the sign for a negative',
        text: R`Solve an inequality with the same steps as an equation. There is one extra rule: when you **multiply or divide both sides by a negative number, reverse the inequality sign**. Adding or subtracting never changes the direction.`,
        example: R`\(-2x + 3 > 11\). Subtract 3: \(-2x > 8\). Divide by \(-2\) and reverse: \(x < -4\). Check \(x = -5\): \(-2(-5) + 3 = 13 > 11\). ✓`,
      },
    ],
    vocab: [
      { term: 'equation', def: 'A statement that two expressions are equal.' },
      { term: 'solution', def: 'A value of the variable that makes an equation or inequality true.' },
      { term: 'inverse operations', def: 'Operations that undo each other: adding and subtracting, multiplying and dividing.' },
      { term: 'inequality', def: R`A statement that compares two expressions with \(<\), \(>\), \(\le\) or \(\ge\).` },
      { term: 'coefficient', def: R`The number that multiplies a variable. In \(3x\) the coefficient is 3.` },
    ],
    mistakes: [
      'Doing an operation on one side only. Whatever you do to one side, do to the other.',
      R`Undoing in the wrong order: in \(3x + 5 = 20\), subtract 5 before dividing by 3.`,
      R`Dividing only part of the equation: in \(4(x - 2) = 18\), the 4 multiplies both \(x\) and \(-2\).`,
      'Forgetting to reverse the inequality sign after multiplying or dividing by a negative number, or reversing it when only adding or subtracting.',
    ],
    visual: { type: 'numberLine', min: -8, max: 4, step: 1, ray: { from: -4, dir: 'left', open: true }, alt: 'A number line showing x < −4: an open circle at −4 with an arrow pointing left.' },
  },

  examples: [
    {
      title: 'A two-step equation',
      problem: R`Solve \(3x + 5 = 20\).`,
      steps: [
        R`The tape diagram shows three \(x\)s and a 5 making 20.`,
        R`Subtract 5 from both sides: \(3x = 15\).`,
        R`Divide both sides by 3: \(x = 5\).`,
        R`Check: \(3(5) + 5 = 20\). ✓`,
      ],
      answer: R`\(x = 5\)`,
      visual: { type: 'barModel', rows: [{ parts: [{ value: 5, label: 'x', shade: 'a' }, { value: 5, label: 'x', shade: 'a' }, { value: 5, label: 'x', shade: 'a' }, { value: 5, label: '5', shade: 'b' }], total: '20' }], alt: 'A tape diagram: three boxes labelled x and one box labelled 5 make 20 in all.' },
    },
    {
      title: 'Parentheses and a decimal answer',
      problem: R`Solve \(4(x - 2) = 18\).`,
      steps: [
        R`The 4 multiplies the whole parentheses, so divide both sides by 4: \(x - 2 = 4.5\).`,
        R`Add 2 to both sides: \(x = 6.5\).`,
        R`Another way is to distribute first: \(4x - 8 = 18\), then \(4x = 26\), then \(x = 6.5\).`,
        R`Check: \(4(6.5 - 2) = 4(4.5) = 18\). ✓`,
      ],
      answer: R`\(x = 6.5\)`,
    },
    {
      title: 'Word problem: writing and solving an equation',
      word: true,
      problem: 'A plumber charges $45 to come to the house plus $30 for each hour of work. The bill is $165. How many hours did the plumber work?',
      steps: [
        R`Let \(h\) be the number of hours. The $30 repeats every hour, and the $45 is charged once: \(30h + 45 = 165\).`,
        R`Subtract 45 from both sides: \(30h = 120\).`,
        R`Divide both sides by 30: \(h = 4\).`,
        R`Check: \(30(4) + 45 = 165\). ✓`,
      ],
      answer: '4 hours',
    },
    {
      title: 'Word problem: an inequality with a negative coefficient',
      word: true,
      problem: 'Maya has $50. Each arcade game costs $4.50. Maya wants to have at least $14 left for the bus and a snack. How many games can Maya play?',
      steps: [
        R`Let \(g\) be the number of games. The money left is \(50 - 4.5g\), and it must be at least 14: \(50 - 4.5g \ge 14\).`,
        R`Subtract 50 from both sides: \(-4.5g \ge -36\).`,
        R`Divide both sides by \(-4.5\). Dividing by a negative number reverses the sign: \(g \le 8\).`,
        R`Check \(g = 8\): \(50 - 4.5(8) = 14\). ✓ Maya can play at most 8 games.`,
      ],
      answer: 'At most 8 games',
      visual: { type: 'numberLine', min: 0, max: 12, step: 1, ray: { from: 8, dir: 'left', open: false }, alt: 'A number line showing g ≤ 8: a closed circle at 8 with an arrow pointing left.' },
    },
  ],

  models: [
    {
      id: 'solve-and-graph',
      title: 'Solve px + q = r, or an inequality, and graph it',
      intro: 'Choose the numbers and the symbol. Try a negative p with an inequality to see the sign reverse.',
      inputs: [
        { name: 'p', label: 'p (the coefficient of x)', type: 'int', min: -9, max: 9, value: -2 },
        { name: 'q', label: 'q (the number added)', type: 'int', min: -20, max: 20, value: 3 },
        { name: 'rel', label: 'Symbol', type: 'select', value: '>', options: [{ value: '=', label: '= (equation)' }, { value: '<', label: '<' }, { value: '>', label: '>' }, { value: '<=', label: '≤' }, { value: '>=', label: '≥' }] },
        { name: 'r', label: 'r (the right side)', type: 'int', min: -40, max: 40, value: 11 },
      ],
      compute({ p, q: q0, rel, r }) {
        if (p === 0) return { error: 'With p = 0 there is no x left in the problem. Choose a p that is not 0.' };
        const sym = rel === '=' ? '=' : SYM[rel];
        const b = frac(r - q0, p);
        const steps = [];
        if (q0 !== 0) steps.push(R`${q0 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(q0)}\) ${q0 > 0 ? 'from' : 'to'} both sides${rel === '=' ? '' : '. Adding or subtracting keeps the sign the same'}: \(${terms([[p, 'x']])} ${sym} ${r - q0}\).`);
        const outRel = rel === '=' ? '=' : p < 0 ? FLIP[rel] : rel;
        const outSym = rel === '=' ? '=' : SYM[outRel];
        if (p !== 1) steps.push(R`Divide both sides by \(${p}\)${rel === '=' ? '' : p < 0 ? '. Dividing by a negative number **reverses** the sign' : '. Dividing by a positive number keeps the sign'}: \(x ${outSym} ${b.tex()}\).`);
        const test = rel === '=' ? b : outRel.startsWith('<') ? b.sub(1) : b.add(1);
        steps.push(R`Check with \(x = ${test.tex()}\): the left side is \(${test.mul(p).add(q0).tex()}\), which is ${rel === '=' ? 'equal to' : rel.startsWith('<') ? 'less than' : 'greater than'} \(${r}\). ✓`);
        const line = rel === '=' ? { points: [{ value: b.value, label: `x = ${b.text()}` }] } : { ray: rayFor(outRel, b.value) };
        return {
          problem: R`\(${linear(p, q0)} ${sym} ${r}\)`,
          steps,
          answer: R`\(x ${outSym} ${b.tex()}\)`,
          visual: lineFor([b.value - 3, b.value + 3], { ...line, alt: rel === '=' ? `A number line with a point at ${b.text()}.` : `A number line. ${describe(outRel, b.value).replace(txt(b.value), b.text())}.` }),
        };
      },
    },
    {
      id: 'fair-budget',
      title: 'Word problem: how many rides?',
      word: true,
      intro: 'Change the money, the entry price and the price of a ride.',
      inputs: [
        { name: 'budget', label: 'Money to spend (dollars)', type: 'int', min: 5, max: 200, value: 40 },
        { name: 'entry', label: 'Entry price (dollars)', type: 'int', min: 1, max: 50, value: 12 },
        { name: 'ride', label: 'Price of one ride (dollars)', type: 'int', min: 2, max: 20, value: 3 },
      ],
      compute({ budget, entry, ride }) {
        if (entry > budget) return { error: 'The entry price is more than the money available. Make the budget bigger or the entry price smaller.' };
        const exact = frac(budget - entry, ride);
        const n = Math.floor(exact.value);
        const steps = [
          R`Let \(x\) be the number of rides. The rides cost \(${ride}x\) and entry is paid once. The total must be at most ${money(budget)}: \(${ride}x + ${entry} \le ${budget}\).`,
          R`Subtract \(${entry}\) from both sides: \(${ride}x \le ${budget - entry}\).`,
          R`Divide both sides by \(${ride}\). It is positive, so the sign stays the same: \(x \le ${exact.mixedTex()}\).`,
        ];
        if (!exact.isInt()) steps.push(`Only whole rides make sense, so round down to ${n}.`);
        steps.push(R`Check: ${n} ${n === 1 ? 'ride costs' : 'rides cost'} \(${ride}(${n}) + ${entry} = ${ride * n + entry}\) dollars, and one more ride would cost ${money(ride * (n + 1) + entry)}, which is too much.`);
        return {
          problem: `Kai has ${money(budget)} to spend at a fair. Entry costs ${money(entry)} and each ride costs ${money(ride)}. What is the greatest number of rides Kai can pay for?`,
          steps,
          answer: `${n} ${n === 1 ? 'ride' : 'rides'}`,
          visual: lineFor([0, Math.max(n + 2, 4)], { ray: { from: exact.value, dir: 'left', open: false }, alt: `A number line showing x ≤ ${exact.text()}: a closed circle with an arrow pointing left.` }),
        };
      },
    },
  ],

  quiz: {
    easy: [easyOneStep, easyIsSolution, easyInequalityGraph],
    medium: [mediumTwoStep, mediumRationalOneStep, mediumStory, mediumInequalityOneStep],
    hard: [hardTwoStepRational, hardInequalityNegative, hardStoryInequality],
    challenge: [challengeError, challengeCount, challengeStory],
  },
};
