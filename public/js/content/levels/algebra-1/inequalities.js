import { R, q, frac, tryFrac, linear, terms, num, paren, dot, signed, money, plural, person, rootsTex, range, checkRoots } from '../../lib/index.js';
import { SYM, FLIP, STRICT, holds, ray, between, outside, agrees, sameSet, around, lineWindow, show } from './_shared.js';

const OPS = ['lt', 'le', 'gt', 'ge'];
const LESS = ['lt', 'le'];
const set = (s) => R`\(${s.tex}\)`;
const isRight = (op) => op === 'gt' || op === 'ge';
const other = (op) => ({ lt: 'le', le: 'lt', gt: 'ge', ge: 'gt' })[op]; // same direction, other circle
const asX = (v) => R`\(x = ${num(v)}\)`;
// Sentence openers for the two standard moves.
const move = (b) => (b > 0 ? R`Subtract \(${b}\) from` : R`Add \(${-b}\) to`);
const divide = (k) => (k < 0 ? R`Divide by \(${k}\). It is negative, so reverse the sign` : R`Divide by \(${k}\). It is positive, so the sign stays`);

// ───────────── Easy ─────────────

function easyOneStep(rng) {
  const op = rng.pick(OPS);
  if (rng.bool()) {
    const v = rng.int(-9, 9);
    const b = rng.nonzero(-12, 12);
    const c = v + b;
    const s = ray(op, v);
    return q({
      prompt: R`Solve: \(\;${linear(1, b)} ${SYM[op]} ${c}\)`,
      correct: set(s),
      wrong: [
        { value: set(ray(FLIP[op], v)), why: 'Adding or subtracting the same number on both sides does not reverse the sign.' },
        { value: set(ray(op, c + b)), why: R`Undo \(${signed(b)}\) with the opposite operation on both sides.` },
        set(ray(FLIP[op], c + b)),
        set(ray(op, -v)),
      ],
      solution: [
        R`${move(b)} both sides: \(x ${SYM[op]} ${c} ${b > 0 ? '-' : '+'} ${Math.abs(b)}\).`,
        R`So \(${s.tex}\). The sign keeps its direction, because nothing was multiplied or divided by a negative number.`,
      ],
      rule: 0,
      skill: 'one-step inequalities',
      check: agrees((t) => holds(op, t + b, c), s),
    });
  }
  const a = rng.int(2, 9);
  const v = rng.nonzero(-9, 9);
  const c = a * v;
  const s = ray(op, v);
  return q({
    prompt: R`Solve: \(\;${a}x ${SYM[op]} ${c}\)`,
    correct: set(s),
    wrong: [
      { value: set(ray(FLIP[op], v)), why: R`The sign reverses only when you multiply or divide by a negative number. Here you divide by \(${a}\), which is positive.` },
      { value: set(ray(op, c - a)), why: R`\(${a}x\) means \(${a}\) times \(x\). Undo it by dividing by \(${a}\).` },
      set(ray(op, c * a)),
      set(ray(op, -v)),
    ],
    solution: [
      R`Divide both sides by \(${a}\): \(x ${SYM[op]} ${c} \div ${a}\).`,
      R`So \(${s.tex}\). Dividing by a positive number keeps the direction of the sign${c < 0 ? R`, even though \(${c}\) is negative` : ''}.`,
    ],
    rule: 0,
    skill: 'one-step inequalities',
    check: agrees((t) => holds(op, a * t, c), s),
  });
}

function easyDivideNegative(rng) {
  const op = rng.pick(OPS);
  const a = rng.int(1, 9);
  const v = rng.nonzero(-9, 9);
  const c = -a * v;
  const s = ray(FLIP[op], v);
  const t = v + (isRight(FLIP[op]) ? 1 : -1);
  return q({
    prompt: R`Solve: \(\;${terms([[-a, 'x']])} ${SYM[op]} ${c}\)`,
    correct: set(s),
    wrong: [
      { value: set(ray(op, v)), why: 'Dividing both sides by a negative number reverses the inequality sign.' },
      { value: set(ray(FLIP[op], -v)), why: R`\(${c} \div ${paren(-a)} = ${v}\). Watch the sign of the quotient.` },
      set(ray(op, -v)),
      set(ray(FLIP[op], c + a)),
    ],
    solution: [
      R`Divide both sides by \(${-a}\). Because \(${-a}\) is negative, reverse the sign: \(x ${SYM[FLIP[op]]} ${c} \div ${paren(-a)}\).`,
      R`So \(${s.tex}\).`,
      R`Check with \(x = ${t}\): \(${dot(-a, t)} = ${-a * t}\), and \(${-a * t} ${SYM[op]} ${c}\) is true. ✓`,
    ],
    rule: 1,
    skill: 'reversing the sign',
    check: agrees((u) => holds(op, -a * u, c), s),
  });
}

function easyReadGraph(rng) {
  const op = rng.pick(OPS);
  const v = rng.int(-8, 8);
  const s = ray(op, v);
  const side = isRight(op) ? 'right' : 'left';
  return q({
    prompt: 'Which inequality is shown on the number line?',
    visual: s.visual(),
    correct: set(s),
    wrong: [
      { value: set(ray(other(op), v)), why: STRICT[op] ? R`An open circle means \(${v}\) itself is not a solution.` : R`A closed circle means \(${v}\) itself is a solution.` },
      { value: set(ray(FLIP[op], v)), why: `The shading is to the ${side} of the circle, where the numbers are ${isRight(op) ? 'greater' : 'less'}.` },
      set(ray(other(FLIP[op]), v)),
    ],
    solution: [
      R`The shading is to the ${side} of \(${v}\), so \(x\) is ${isRight(op) ? 'greater' : 'less'} than \(${v}\).`,
      STRICT[op] ? R`The circle is open, so \(${v}\) is not included: \(${s.tex}\).` : R`The circle is closed, so \(${v}\) is included: \(${s.tex}\).`,
    ],
    rule: 2,
    skill: 'graphing inequalities',
  });
}

function easyIsSolution(rng) {
  const op = rng.pick(OPS);
  const a = rng.int(2, 6);
  const v = rng.int(-6, 6);
  const b = rng.nonzero(-9, 9);
  const c = a * v + b;
  const dir = isRight(op) ? 1 : -1;
  const works = (t) => holds(op, a * t + b, c);
  const correct = !STRICT[op] && rng.bool() ? v : v + dir * rng.int(1, 4);
  const wrong = [v - dir, v - 3 * dir, v - 2 * dir, v - 5 * dir].filter((t) => !works(t));
  return q({
    prompt: R`Which value of \(x\) is a solution of \(\;${linear(a, b)} ${SYM[op]} ${c}\)?`,
    correct,
    fmt: asX,
    wrong: [STRICT[op] ? { value: v, why: R`At \(x = ${v}\) both sides are equal, and \(${SYM[op]}\) does not allow "equal".` } : null, ...wrong],
    solution: [
      R`Solve the inequality. ${move(b)} both sides: \(${a}x ${SYM[op]} ${c - b}\). Divide by \(${a}\): \(${ray(op, v).tex}\).`,
      R`Only \(x = ${correct}\) fits. Check: \(${a}(${correct}) ${signed(b)} = ${a * correct + b}\), and \(${a * correct + b} ${SYM[op]} ${c}\) is true. ✓`,
    ],
    rule: 0,
    skill: 'testing solutions',
    check: () => (works(correct) && wrong.length === 4 ? true : 'the listed solution does not satisfy the inequality'),
  });
}

const LIMITS = [
  { v: 'h', op: 'ge', lo: 40, hi: 56, text: (n) => R`Riders must be at least ${n} inches tall to go on a roller coaster. \(h\) is a rider's height in inches.`, means: (n) => `"At least ${n}" means ${n} or more, so ${n} itself is allowed.` },
  { v: 'w', op: 'le', lo: 300, hi: 900, text: (n) => R`A lift can safely carry at most ${n} kilograms. \(w\) is the load in kilograms.`, means: (n) => `"At most ${n}" means ${n} or less, so ${n} itself is allowed.` },
  { v: 'c', op: 'gt', lo: 20, hi: 75, text: (n) => R`An order ships free when it costs more than ${n} dollars. \(c\) is the cost in dollars of an order that ships free.`, means: (n) => `"More than ${n}" means above ${n}. Exactly ${n} does not count.` },
  { v: 'w', op: 'lt', lo: 15, hi: 45, text: (n) => R`A carry-on bag must weigh less than ${n} pounds. \(w\) is the weight in pounds of a bag that is allowed.`, means: (n) => `"Less than ${n}" means below ${n}. Exactly ${n} is too heavy.` },
  { v: 's', op: 'le', lo: 25, hi: 70, text: (n) => R`Drivers on this road may go no faster than ${n} miles per hour. \(s\) is a legal speed in miles per hour.`, means: (n) => `"No faster than ${n}" means ${n} or slower, so ${n} itself is allowed.` },
  { v: 'm', op: 'ge', lo: 8, hi: 40, text: (n) => R`A club needs no fewer than ${n} members to keep its meeting room. \(m\) is a number of members that keeps the room.`, means: (n) => `"No fewer than ${n}" means ${n} or more, so ${n} itself is allowed.` },
  { v: 't', op: 'lt', lo: 26, hi: 38, text: (n) => R`Frost forms on this crop only when the temperature is below ${n} degrees. \(t\) is a temperature at which frost forms.`, means: (n) => `"Below ${n}" means less than ${n}. Exactly ${n} does not count.` },
  { v: 'p', op: 'ge', lo: 55, hi: 80, text: (n) => R`To pass the course, a student needs a minimum of ${n} points. \(p\) is a passing number of points.`, means: (n) => `"A minimum of ${n}" means ${n} or more, so ${n} itself is allowed.` },
  { v: 'v', op: 'gt', lo: 10, hi: 95, text: (n) => R`A video is listed as trending once it has more than ${n} thousand views. \(v\) is the number of views, in thousands, of a trending video.`, means: (n) => `"More than ${n}" means above ${n}. Exactly ${n} does not count.` },
  { v: 'b', op: 'le', lo: 12, hi: 48, text: (n) => R`Each shelf holds a maximum of ${n} books. \(b\) is the number of books on one shelf.`, means: (n) => `"A maximum of ${n}" means ${n} or fewer, so ${n} itself is allowed.` },
];

function easyStoryPhrase(rng) {
  const item = rng.pick(LIMITS);
  const n = rng.int(item.lo, item.hi);
  const { v, op } = item;
  const form = (o) => R`\(${v} ${SYM[o]} ${n}\)`;
  return q({
    prompt: R`${item.text(n)} Which inequality says this?`,
    correct: form(op),
    wrong: [
      { value: form(other(op)), why: STRICT[op] ? `Exactly ${n} is not allowed here, so the sign must be strict.` : `Exactly ${n} is allowed here, so the sign needs "or equal to".` },
      { value: form(FLIP[op]), why: isRight(op) ? `That would allow ${n - 3}, which is on the wrong side of the limit.` : `That would allow ${n + 3}, which is on the wrong side of the limit.` },
      form(other(FLIP[op])),
    ],
    solution: [item.means(n), R`So the inequality is \(${v} ${SYM[op]} ${n}\).`],
    rule: 6,
    skill: 'writing inequalities',
  });
}

// ───────────── Medium ─────────────

function mediumTwoStep(rng) {
  const op = rng.pick(OPS);
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const v = rng.nonzero(-9, 9);
  const b = rng.nonzero(-12, 12);
  const c = a * v + b;
  const out = a < 0 ? FLIP[op] : op;
  const s = ray(out, v);
  return q({
    prompt: R`Solve: \(\;${linear(a, b)} ${SYM[op]} ${c}\)`,
    correct: set(s),
    wrong: [
      { value: set(ray(FLIP[out], v)), why: a < 0 ? R`Dividing by \(${a}\), a negative number, reverses the sign.` : R`The sign reverses only when you divide by a negative number. \(${a}\) is positive.` },
      { value: set(ray(out, frac(c + b, a))), why: R`Undo \(${signed(b)}\) with the opposite operation on both sides.` },
      set(ray(out, -v)),
      set(ray(FLIP[out], -v)),
    ],
    solution: [
      R`${move(b)} both sides: \(${terms([[a, 'x']])} ${SYM[op]} ${c - b}\).`,
      R`${divide(a)}: \(${s.tex}\).`,
    ],
    rule: a < 0 ? 1 : 0,
    skill: 'two-step inequalities',
    check: agrees((t) => holds(op, a * t + b, c), s),
  });
}

function mediumBothSides(rng) {
  const op = rng.pick(OPS);
  const a = rng.nonzero(-8, 8);
  const c = rng.intExcept(-8, 8, [0, a, a - 1]);
  const k = a - c;
  const v = rng.nonzero(-8, 8);
  const b = rng.nonzero(-12, 12);
  const d = k * v + b;
  if (d === 0) return mediumBothSides(rng);
  const out = k < 0 ? FLIP[op] : op;
  const s = ray(out, v);
  const slip = tryFrac(d - b, a + c);
  return q({
    prompt: R`Solve: \(\;${linear(a, b)} ${SYM[op]} ${linear(c, d)}\)`,
    correct: set(s),
    wrong: [
      { value: set(ray(FLIP[out], v)), why: k < 0 ? R`After collecting terms you divide by \(${k}\), which is negative, so the sign reverses.` : R`After collecting terms you divide by \(${k}\), which is positive, so the sign does not reverse.` },
      slip ? { value: set(ray(out, slip)), why: R`To move \(${terms([[c, 'x']])}\) across, ${c > 0 ? 'subtract it from' : 'add its opposite to'} both sides.` } : null,
      set(ray(out, -v)),
      set(ray(out, frac(d + b, k))),
      set(ray(FLIP[out], -v)),
    ],
    solution: [
      R`Collect the \(x\) terms: ${c > 0 ? R`subtract \(${terms([[c, 'x']])}\) from` : R`add \(${terms([[-c, 'x']])}\) to`} both sides. \(\;${linear(k, b)} ${SYM[op]} ${d}\)`,
      R`${move(b)} both sides: \(${terms([[k, 'x']])} ${SYM[op]} ${d - b}\).`,
      R`${divide(k)}: \(${s.tex}\).`,
    ],
    rule: k < 0 ? 1 : 0,
    skill: 'variables on both sides',
    check: agrees((t) => holds(op, a * t + b, c * t + d), s),
  });
}

function mediumCompoundAnd(rng) {
  const a = rng.int(2, 5);
  const b = rng.nonzero(-9, 9);
  const v1 = rng.int(-7, 4);
  const v2 = v1 + rng.int(2, 7);
  const opL = rng.pick(LESS);
  const opR = rng.pick(LESS);
  const lo = a * v1 + b;
  const hi = a * v2 + b;
  const s = between(v1, opL, opR, v2);
  const half = frac(lo, a);
  return q({
    prompt: R`Solve: \(\;${lo} ${SYM[opL]} ${linear(a, b)} ${SYM[opR]} ${hi}\)`,
    correct: set(s),
    wrong: [
      { value: set(between(lo - b, opL, opR, hi - b)), why: R`After moving the constant, all three parts still need dividing by \(${a}\).` },
      half.lt(v2) ? { value: set(between(half, opL, opR, v2)), why: 'Each step must be done to all three parts, including the left one.' } : null,
      { value: set(outside(opL, v1, FLIP[opR], v2)), why: 'This chain is an "and": both conditions hold at once, so the solutions lie between the two numbers.' },
      opL !== opR ? set(between(v1, opR, opL, v2)) : null,
      set(ray(opR, v2)),
    ],
    solution: [
      R`${move(b)} all three parts: \(${lo - b} ${SYM[opL]} ${a}x ${SYM[opR]} ${hi - b}\).`,
      R`Divide all three parts by \(${a}\) (positive, so the signs stay): \(${s.tex}\).`,
    ],
    rule: 3,
    skill: 'compound inequalities',
    check: agrees((t) => holds(opL, lo, a * t + b) && holds(opR, a * t + b, hi), s),
  });
}

function mediumAbsEquation(rng) {
  const h = rng.nonzero(-9, 9);
  const d = rng.int(1, 12);
  const inner = linear(1, -h);
  const roots = [h - d, h + d];
  const eq = (list) => R`\(${rootsTex(list)}\)`;
  return q({
    prompt: R`Solve: \(\;|${inner}| = ${d}\)`,
    correct: eq(roots),
    wrong: [
      { value: eq([h + d]), why: R`Two numbers are \(${d}\) ${d === 1 ? 'unit' : 'units'} from \(${h}\). The inside can equal \(${d}\) or \(${-d}\).` },
      { value: eq([-h - d, -h + d]), why: R`Solve \(${inner} = ${d}\) and \(${inner} = ${-d}\) carefully: the constant changes sign when it moves across.` },
      eq([-(h + d), h + d]),
      eq([h - d]),
    ],
    solution: [
      R`The inside is \(${d}\) or \(${-d}\): \(${inner} = ${d}\) or \(${inner} = ${-d}\).`,
      R`${move(-h)} both sides of each: \(x = ${h + d}\) or \(x = ${h - d}\).`,
      R`Check: \(|${h + d} ${signed(-h)}| = ${d}\) and \(|${h - d} ${signed(-h)}| = |${-d}| = ${d}\). ✓`,
    ],
    rule: 4,
    skill: 'absolute-value equations',
    check: () => checkRoots((t) => Math.abs(t - h) - d, roots),
  });
}

const SPENDING = [
  { place: 'at a fair', fee: 'Entry', item: 'ride' },
  { place: 'at a bowling alley', fee: 'Shoe rental', item: 'game' },
  { place: 'at a climbing gym', fee: 'Equipment hire', item: 'climb' },
  { place: 'at a print shop', fee: 'The design fee', item: 'poster' },
  { place: 'on a music app this month', fee: 'The membership', item: 'album' },
];

function mediumStoryBudget(rng) {
  const ctx = rng.pick(SPENDING);
  const name = person(rng);
  const p = rng.int(3, 9);
  const fee = rng.int(4, 20);
  const n = rng.int(3, 14);
  const B = fee + p * n + rng.int(1, p - 1);
  const noFee = Math.floor(B / p);
  return q({
    prompt: `${name} has ${money(B)} to spend ${ctx.place}. ${ctx.fee} costs ${money(fee)} and each ${ctx.item} costs ${money(p)}. What is the greatest number of ${ctx.item}s ${name} can pay for?`,
    correct: n,
    wrong: [
      { value: n + 1, why: `${n + 1} ${ctx.item}s would cost ${money(p * (n + 1) + fee)} in all, which is more than ${money(B)}. Round down.` },
      noFee > n + 1 ? { value: noFee, why: `${ctx.fee} uses up ${money(fee)} first. Subtract it before dividing.` } : null,
      n - 1,
      n + 2,
    ],
    solution: [
      R`Let \(x\) be the number of ${ctx.item}s. The total cost must not go above the budget: \(${linear(p, fee)} \le ${B}\).`,
      R`Subtract \(${fee}\): \(${p}x \le ${B - fee}\). Divide by \(${p}\): \(x \le ${frac(B - fee, p).tex()} \approx ${num((B - fee) / p, { places: 2 })}\).`,
      `The answer must be a whole number that does not go over, so round down: ${n} ${ctx.item}s (total ${money(p * n + fee)}).`,
    ],
    rule: 6,
    skill: 'inequality word problems',
    check: () => (p * n + fee <= B && p * (n + 1) + fee > B ? true : 'n is not the largest whole number within the budget'),
  });
}

function mediumGraphCompound(rng) {
  const lo = rng.int(-8, 3);
  const hi = lo + rng.int(2, 8);
  const inner = rng.bool();
  const oA = rng.pick(LESS);
  const oB = rng.pick(LESS);
  const mk = (isInner, a, b) => (isInner ? between(lo, a, b, hi) : outside(a, lo, FLIP[b], hi));
  const s = mk(inner, oA, oB);
  const dots = (o) => (STRICT[o] ? 'open' : 'closed');
  return q({
    prompt: 'Which inequality is shown on the number line?',
    visual: s.visual(),
    correct: set(s),
    wrong: [
      { value: set(mk(!inner, oA, oB)), why: inner ? 'The shading is between the two circles, so both conditions hold at once.' : 'The shading is outside the two circles, so the solution is two separate rays joined by "or".' },
      { value: set(mk(inner, other(oA), oB)), why: R`Look at the circle at \(${lo}\): open means not included, closed means included.` },
      { value: set(mk(inner, oA, other(oB))), why: R`Look at the circle at \(${hi}\): open means not included, closed means included.` },
    ],
    solution: [
      inner ? R`The shaded part lies between \(${lo}\) and \(${hi}\), so \(x\) is greater than \(${lo}\) **and** less than \(${hi}\).` : R`The shaded parts lie to the left of \(${lo}\) and to the right of \(${hi}\), so \(x\) is less than \(${lo}\) **or** greater than \(${hi}\).`,
      R`The circle at \(${lo}\) is ${dots(oA)} and the circle at \(${hi}\) is ${dots(oB)}: \(${s.tex}\).`,
    ],
    rule: 2,
    skill: 'graphing inequalities',
  });
}

// ───────────── Hard ─────────────

function hardDistribute(rng) {
  const op = rng.pick(OPS);
  const p = rng.intExcept(-6, 6, [-1, 0, 1]);
  const r = rng.intExcept(-6, 6, [0, p, p - 1]);
  const k = p - r;
  const m = rng.nonzero(-6, 6);
  const c = rng.nonzero(-20, 20);
  const v = frac(c - p * m, k);
  const out = k < 0 ? FLIP[op] : op;
  const s = ray(out, v);
  return q({
    prompt: R`Solve: \(\;${p}(${linear(1, m)}) ${SYM[op]} ${linear(r, c)}\)`,
    correct: set(s),
    wrong: [
      { value: set(ray(FLIP[out], v)), why: k < 0 ? R`The last step divides by \(${k}\), a negative number, so the sign reverses.` : R`The last step divides by \(${k}\), which is positive, so the sign does not reverse.` },
      { value: set(ray(out, frac(c - m, k))), why: R`\(${p}\) multiplies both terms in the parentheses: \(${p}(${linear(1, m)}) = ${linear(p, p * m)}\).` },
      set(ray(out, frac(c + p * m, k))),
      set(ray(FLIP[out], frac(c - m, k))),
    ],
    solution: [
      R`Distribute: \(${linear(p, p * m)} ${SYM[op]} ${linear(r, c)}\).`,
      R`Collect the \(x\) terms (${r > 0 ? R`subtract \(${terms([[r, 'x']])}\)` : R`add \(${terms([[-r, 'x']])}\)`}): \(${linear(k, p * m)} ${SYM[op]} ${c}\).`,
      R`${move(p * m)} both sides: \(${terms([[k, 'x']])} ${SYM[op]} ${c - p * m}\).`,
      R`${divide(k)}: \(${s.tex}\).`,
    ],
    rule: 1,
    skill: 'multi-step inequalities',
    check: agrees((t) => holds(op, p * (t + m), r * t + c), s),
  });
}

function hardCompoundNegative(rng) {
  const a = rng.int(2, 5);
  const b = rng.nonzero(-9, 9);
  const v1 = rng.int(-7, 4);
  const v2 = v1 + rng.int(2, 7);
  const opL = rng.pick(LESS);
  const opR = rng.pick(LESS);
  const lo = -a * v2 + b;
  const hi = -a * v1 + b;
  const s = between(v1, opR, opL, v2);
  return q({
    prompt: R`Solve: \(\;${lo} ${SYM[opL]} ${linear(-a, b)} ${SYM[opR]} ${hi}\)`,
    correct: set(s),
    wrong: [
      { value: set(between(v2, opL, opR, v1)), why: R`Dividing all three parts by \(${-a}\) reverses both signs. As written, no number is above \(${v2}\) and below \(${v1}\) at once.` },
      opL !== opR ? { value: set(between(v1, opL, opR, v2)), why: 'When the chain is turned around, each sign stays with its own endpoint.' } : null,
      { value: set(outside(opR, v1, FLIP[opL], v2)), why: 'A chain is an "and": the solutions lie between the two endpoints.' },
      set(between(a * v1, opR, opL, a * v2)),
      set(between(-v2, opR, opL, -v1)),
    ],
    solution: [
      R`${move(b)} all three parts: \(${lo - b} ${SYM[opL]} ${-a}x ${SYM[opR]} ${hi - b}\).`,
      R`Divide all three parts by \(${-a}\) and reverse both signs: \(${v2} ${SYM[FLIP[opL]]} x ${SYM[FLIP[opR]]} ${v1}\).`,
      R`Rewrite with the smaller number on the left: \(${s.tex}\).`,
    ],
    rule: 3,
    skill: 'compound inequalities',
    check: agrees((t) => holds(opL, lo, -a * t + b) && holds(opR, -a * t + b, hi), s),
  });
}

function hardAbsInequality(rng) {
  const op = rng.pick(OPS);
  const a = rng.pick([1, 1, 2, 3]);
  const x1 = rng.int(-8, 4);
  const w = a % 2 === 0 ? rng.int(1, 8) : 2 * rng.int(1, 4);
  const x2 = x1 + w;
  const d = (a * w) / 2;
  const b = d - a * x2;
  if (b === 0) return hardAbsInequality(rng);
  const inner = linear(a, b);
  const less = !isRight(op);
  const mk = (isLess, lo, hi, o = op) => (isLess ? between(lo, STRICT[o] ? 'lt' : 'le', STRICT[o] ? 'lt' : 'le', hi) : outside(STRICT[o] ? 'lt' : 'le', lo, STRICT[o] ? 'gt' : 'ge', hi));
  const s = mk(less, x1, x2);
  const steps = less
    ? [
        R`"Less than" keeps the inside within \(${d}\) of 0. Write a chain: \(${-d} ${SYM[op]} ${inner} ${SYM[op]} ${d}\).`,
        R`${move(b)} all three parts: \(${-d - b} ${SYM[op]} ${terms([[a, 'x']])} ${SYM[op]} ${d - b}\).`,
        a === 1 ? 'Those are the solutions: every number between the two boundary values.' : R`Divide all three parts by \(${a}\): \(${s.tex}\).`,
      ]
    : [
        R`"Greater than" puts the inside more than \(${d}\) from 0. Split it: \(${inner} ${SYM[FLIP[op]]} ${-d}\) or \(${inner} ${SYM[op]} ${d}\).`,
        R`${move(b)} both sides of each: \(${terms([[a, 'x']])} ${SYM[FLIP[op]]} ${-d - b}\) or \(${terms([[a, 'x']])} ${SYM[op]} ${d - b}\).`,
        a === 1 ? 'Those are the solutions: every number outside the two boundary values.' : R`Divide each by \(${a}\): \(${s.tex}\).`,
      ];
  return q({
    prompt: R`Solve: \(\;|${inner}| ${SYM[op]} ${d}\)`,
    correct: set(s),
    wrong: [
      { value: set(mk(!less, x1, x2)), why: less ? '"Less than" means close to 0: the solutions lie between the two boundary numbers.' : '"Greater than" means far from 0: the solutions lie outside the two boundary numbers.' },
      { value: set(ray(op, x2)), why: R`That solves only \(${inner} ${SYM[op]} ${d}\). The inside can also be negative.` },
      set(mk(less, frac(b - d, a), frac(b + d, a))),
      x1 !== -x2 ? set(mk(less, Math.min(-x1, -x2), Math.max(-x1, -x2))) : null,
      set(mk(less, x1, x2, other(op))),
    ],
    solution: steps,
    rule: 5,
    skill: 'absolute-value inequalities',
    check: agrees((t) => holds(op, Math.abs(a * t + b), d), s),
  });
}

function hardOr(rng) {
  const v1 = rng.int(-8, 3);
  const v2 = v1 + rng.int(2, 7);
  const oL = rng.pick(LESS);
  const oR = rng.pick(['gt', 'ge']);
  const a1 = rng.intExcept(-5, 5, [-1, 0, 1]);
  const a2 = rng.intExcept(-5, 5, [-1, 0, 1]);
  const b1 = rng.nonzero(-9, 9);
  const b2 = rng.nonzero(-9, 9);
  const op1 = a1 < 0 ? FLIP[oL] : oL;
  const op2 = a2 < 0 ? FLIP[oR] : oR;
  const c1 = a1 * v1 + b1;
  const c2 = a2 * v2 + b2;
  const s = outside(oL, v1, oR, v2);
  const either = (p, r) => R`\(${p.tex} \text{ or } ${r.tex}\)`;
  return q({
    prompt: R`Solve: \(\;${linear(a1, b1)} ${SYM[op1]} ${c1} \;\text{ or }\; ${linear(a2, b2)} ${SYM[op2]} ${c2}\)`,
    correct: set(s),
    wrong: [
      a1 < 0 || a2 < 0 ? { value: either(ray(op1, v1), ray(op2, v2)), why: 'Each time you divide by a negative number, reverse that inequality sign.' } : null,
      { value: set(between(v1, 'lt', 'lt', v2)), why: '"Or" keeps every number that satisfies either part. Here that is two separate rays, not the numbers in between.' },
      either(ray(oL, frac(c1 + b1, a1)), ray(oR, v2)),
      either(ray(oL, v1), ray(oR, frac(c2 + b2, a2))),
      set(outside(other(oL), v1, other(oR), v2)),
    ],
    solution: [
      R`First part. ${move(b1)} both sides: \(${terms([[a1, 'x']])} ${SYM[op1]} ${c1 - b1}\). ${divide(a1)}: \(${ray(oL, v1).tex}\).`,
      R`Second part. ${move(b2)} both sides: \(${terms([[a2, 'x']])} ${SYM[op2]} ${c2 - b2}\). ${divide(a2)}: \(${ray(oR, v2).tex}\).`,
      R`"Or" keeps both pieces: \(${s.tex}\).`,
    ],
    rule: 3,
    skill: 'compound inequalities',
    check: agrees((t) => holds(op1, a1 * t + b1, c1) || holds(op2, a2 * t + b2, c2), s),
  });
}

function hardStoryAverage(rng) {
  const name = person(rng);
  const T = rng.pick([78, 80, 82, 84, 85, 86, 88, 90]);
  const need = rng.int(72, 99);
  const S = 4 * T - need;
  const s1 = rng.int(T - 14, T + 9);
  const s2 = rng.int(T - 14, T + 9);
  const s3 = S - s1 - s2;
  if (s3 < 55 || s3 > 100 || need === T) return hardStoryAverage(rng);
  return q({
    prompt: `${name} scored ${s1}, ${s2} and ${s3} on three tests. To earn the grade ${name} wants, the mean of four tests must be at least ${T}. What is the lowest score on the fourth test that is enough?`,
    correct: need,
    wrong: [
      { value: T, why: `The first three scores do not average exactly ${T}, so the fourth score has to make up the difference.` },
      { value: need - 4, why: `The four scores must add up to at least 4 × ${T} = ${4 * T}. Check the total.` },
      need <= 96 ? need + 4 : need - 8,
      need - 2,
    ],
    solution: [
      R`Let \(x\) be the fourth score. The mean must be at least \(${T}\): \(\frac{${s1} + ${s2} + ${s3} + x}{4} \ge ${T}\).`,
      R`Multiply both sides by 4: \(${S} + x \ge ${4 * T}\).`,
      R`Subtract \(${S}\): \(x \ge ${need}\). The lowest score that works is ${need}.`,
    ],
    rule: 6,
    skill: 'inequality word problems',
    check: () => ((S + need) / 4 >= T && (S + need - 1) / 4 < T ? true : 'not the lowest score that reaches the mean'),
  });
}

const SALES = [
  { seller: 'A school club', item: 'T-shirt', cost: 'Printing' },
  { seller: 'A band', item: 'ticket', cost: 'Renting the hall' },
  { seller: 'A robotics team', item: 'raffle ticket', cost: 'The prizes' },
  { seller: 'A bakery stall', item: 'cake', cost: 'Ingredients and the stall fee' },
];

function hardStoryProfit(rng) {
  const ctx = rng.pick(SALES);
  const p = rng.int(4, 15);
  const C = rng.int(4, 30) * 10;
  const G = rng.int(5, 40) * 10;
  if ((G + C) % p === 0) return hardStoryProfit(rng);
  const n = Math.ceil((G + C) / p);
  const noCost = Math.ceil(G / p);
  return q({
    prompt: `${ctx.seller} sells ${ctx.item}s for ${money(p)} each. ${ctx.cost} cost ${money(C)} in total. What is the smallest number of ${ctx.item}s that gives a profit of at least ${money(G)}?`,
    correct: n,
    wrong: [
      { value: n - 1, why: `${n - 1} ${ctx.item}s give a profit of ${money(p * (n - 1) - C)}, just short of ${money(G)}. Round up.` },
      { value: noCost, why: `The ${money(C)} of costs must be covered before there is any profit.` },
      Math.ceil(C / p),
      n + 1,
      n + 2,
    ],
    solution: [
      R`Let \(x\) be the number of ${ctx.item}s. Profit is income minus costs, and it must reach the goal: \(${p}x - ${C} \ge ${G}\).`,
      R`Add \(${C}\): \(${p}x \ge ${G + C}\). Divide by \(${p}\): \(x \ge ${frac(G + C, p).tex()} \approx ${num((G + C) / p, { places: 2 })}\).`,
      `The answer must be a whole number that reaches the goal, so round up: ${n} ${ctx.item}s (profit ${money(p * n - C)}).`,
    ],
    rule: 6,
    skill: 'inequality word problems',
    check: () => (p * n - C >= G && p * (n - 1) - C < G ? true : 'n is not the smallest whole number that reaches the goal'),
  });
}

// ───────────── Challenge ─────────────

function challengeAbsSpecial(rng) {
  const h = rng.nonzero(-9, 9);
  const d = rng.int(1, 9);
  const inner = `|${linear(1, -h)}|`;
  const NONE = 'No solution';
  const ALL = 'All real numbers';
  const ONE = R`Only \(x = ${h}\)`;
  const EXCEPT = R`All real numbers except \(x = ${h}\)`;
  const band = set(between(h - d, 'lt', 'lt', h + d));
  const rays = set(outside('lt', h - d, 'gt', h + d));
  const never = 'An absolute value is a distance, so it is never negative. There is nothing to split into cases.';
  const cases = {
    ltNeg: { tex: R`${inner} < ${-d}`, right: NONE, has: () => false, wrong: [{ value: band, why: never }, ALL, rays], because: R`\(${inner}\) is never negative, so it is never less than \(${-d}\).` },
    leNeg: { tex: R`${inner} \le ${-d}`, right: NONE, has: () => false, wrong: [{ value: band, why: never }, ALL, ONE], because: R`\(${inner}\) is never negative, so it can never be \(${-d}\) or less.` },
    eqNeg: { tex: R`${inner} = ${-d}`, right: NONE, has: () => false, wrong: [{ value: R`\(${rootsTex([h - d, h + d])}\)`, why: never }, ONE, ALL], because: R`\(${inner}\) is never negative, so it cannot equal \(${-d}\).` },
    gtNeg: { tex: R`${inner} > ${-d}`, right: ALL, has: () => true, wrong: [{ value: rays, why: R`An absolute value is always 0 or more, so it is greater than \(${-d}\) for every \(x\).` }, NONE, EXCEPT], because: R`\(${inner}\) is always 0 or more, and every such number is greater than \(${-d}\).` },
    geNeg: { tex: R`${inner} \ge ${-d}`, right: ALL, has: () => true, wrong: [{ value: rays, why: R`An absolute value is always 0 or more, so it is greater than \(${-d}\) for every \(x\).` }, NONE, band], because: R`\(${inner}\) is always 0 or more, and every such number is greater than \(${-d}\).` },
    leZero: { tex: R`${inner} \le 0`, right: ONE, has: (t) => t === h, wrong: [{ value: NONE, why: R`An absolute value can equal 0. It does when the inside is 0.` }, ALL, EXCEPT], because: R`\(${inner}\) cannot be negative, so the only way is \(${inner} = 0\), which happens when \(x = ${h}\).` },
    ltZero: { tex: R`${inner} < 0`, right: NONE, has: () => false, wrong: [{ value: ONE, why: R`At \(x = ${h}\) the absolute value is 0, and \(0 < 0\) is false.` }, ALL, EXCEPT], because: R`\(${inner}\) is never negative, so it is never less than 0.` },
    geZero: { tex: R`${inner} \ge 0`, right: ALL, has: () => true, wrong: [{ value: EXCEPT, why: R`At \(x = ${h}\) the absolute value is 0, and \(0 \ge 0\) is true.` }, ONE, NONE], because: R`\(${inner}\) is always 0 or more, whatever \(x\) is.` },
    gtZero: { tex: R`${inner} > 0`, right: EXCEPT, has: (t) => t !== h, wrong: [{ value: ALL, why: R`At \(x = ${h}\) the absolute value is 0, and \(0 > 0\) is false.` }, ONE, NONE], because: R`\(${inner}\) is positive unless the inside is 0, which happens only at \(x = ${h}\).` },
  };
  const kind = rng.pick(Object.keys(cases));
  const c = cases[kind];
  const original = { ltNeg: (t) => Math.abs(t - h) < -d, leNeg: (t) => Math.abs(t - h) <= -d, eqNeg: (t) => Math.abs(t - h) === -d, gtNeg: (t) => Math.abs(t - h) > -d, geNeg: (t) => Math.abs(t - h) >= -d, leZero: (t) => Math.abs(t - h) <= 0, ltZero: (t) => Math.abs(t - h) < 0, geZero: (t) => Math.abs(t - h) >= 0, gtZero: (t) => Math.abs(t - h) > 0 }[kind];
  return q({
    prompt: R`Solve: \(\;${c.tex}\)`,
    correct: c.right,
    wrong: c.wrong,
    solution: [R`Before splitting into cases, look at the number on the right. An absolute value is a distance, so it is always 0 or more.`, c.because, c.right === NONE ? 'So there is no solution.' : c.right === ALL ? 'So every real number is a solution.' : R`So the answer is: ${c.right}.`],
    rule: kind === 'eqNeg' ? 4 : 5,
    skill: 'absolute-value special cases',
    check: () => sameSet(original, c.has, around([h - d, h, h + d])),
  });
}

function challengeIsolateAbs(rng) {
  const op = rng.pick(OPS);
  const p = rng.pick([2, 3, 4, 5, -2, -3, -4]);
  const h = rng.nonzero(-8, 8);
  const d = rng.int(1, 7);
  const k = rng.nonzero(-9, 9);
  const r = p * d + k;
  const op2 = p < 0 ? FLIP[op] : op;
  const less = !isRight(op2);
  const inner = `|${linear(1, -h)}|`;
  const mk = (isLess, c, e) => (isLess ? between(c - e, STRICT[op] ? 'lt' : 'le', STRICT[op] ? 'lt' : 'le', c + e) : outside(STRICT[op] ? 'lt' : 'le', c - e, STRICT[op] ? 'gt' : 'ge', c + e));
  const s = mk(less, h, d);
  return q({
    prompt: R`Solve: \(\;${terms([[p, inner], [k, '']])} ${SYM[op]} ${r}\)`,
    correct: set(s),
    wrong: [
      { value: set(mk(!less, h, d)), why: p < 0 ? R`Dividing by \(${p}\) reverses the sign before you split into cases, so this becomes \(${inner} ${SYM[op2]} ${d}\).` : less ? '"Less than" keeps the solutions between the two boundary numbers.' : '"Greater than" puts the solutions outside the two boundary numbers.' },
      { value: set(mk(less, h, Math.abs(p) * d)), why: R`Isolate the absolute value completely: after moving \(${k}\), divide both sides by \(${p}\).` },
      set(mk(less, -h, d)),
      set(mk(!less, -h, d)),
    ],
    solution: [
      R`Isolate the absolute value. ${move(k)} both sides: \(${terms([[p, inner]])} ${SYM[op]} ${r - k}\).`,
      R`${divide(p)}: \(${inner} ${SYM[op2]} ${d}\).`,
      less ? R`"Less than": write a chain. \(${-d} ${SYM[op2]} ${linear(1, -h)} ${SYM[op2]} ${d}\).` : R`"Greater than": split it. \(${linear(1, -h)} ${SYM[FLIP[op2]]} ${-d}\) or \(${linear(1, -h)} ${SYM[op2]} ${d}\).`,
      R`${move(-h)} each part: \(${s.tex}\).`,
    ],
    rule: 5,
    skill: 'absolute-value inequalities',
    check: agrees((t) => holds(op, p * Math.abs(t - h) + k, r), s),
  });
}

const TOLERANCES = [
  { v: 'w', c: [250, 900, 50], d: [3, 12], pass: (c, d) => R`A machine fills boxes with ${c} grams of cereal. A box passes inspection when its mass \(w\), in grams, is within ${d} grams of that target.`, fail: (c, d) => R`A machine fills boxes with ${c} grams of cereal. A box is rejected when its mass \(w\), in grams, differs from that target by more than ${d} grams.` },
  { v: 't', c: [60, 78, 1], d: [2, 5], pass: (c, d) => R`A greenhouse is set to ${c} degrees. The alarm stays off while the temperature \(t\) is within ${d} degrees of that setting.`, fail: (c, d) => R`A greenhouse is set to ${c} degrees. The alarm sounds when the temperature \(t\) is more than ${d} degrees away from that setting.` },
  { v: 'L', c: [40, 120, 5], d: [1, 4], pass: (c, d) => R`A bolt should be ${c} mm long. It is accepted when its length \(L\), in mm, differs from that by at most ${d} mm.`, fail: (c, d) => R`A bolt should be ${c} mm long. It is scrapped when its length \(L\), in mm, is off by more than ${d} mm.` },
  { v: 'p', c: [35, 60, 1], d: [2, 5], pass: (c, d) => R`A poll puts support for a new park at ${c} percent, give or take ${d} percentage points. \(p\) is a level of support, in percent, that agrees with the poll.`, fail: (c, d) => R`A poll puts support for a new park at ${c} percent, give or take ${d} percentage points. \(p\) is a level of support, in percent, that would contradict the poll.` },
];

function challengeWriteAbs(rng) {
  const ctx = rng.pick(TOLERANCES);
  const c = ctx.c[0] + ctx.c[2] * rng.int(0, Math.floor((ctx.c[1] - ctx.c[0]) / ctx.c[2]));
  const d = rng.int(ctx.d[0], ctx.d[1]);
  const pass = rng.bool();
  const op = pass ? 'le' : 'gt';
  const { v } = ctx;
  const form = (inner, o, n) => R`\(|${inner}| ${SYM[o]} ${n}\)`;
  const meaning = (w) => (pass ? w >= c - d && w <= c + d : w < c - d || w > c + d);
  return q({
    prompt: `${pass ? ctx.pass(c, d) : ctx.fail(c, d)} Which inequality describes this?`,
    correct: form(`${v} - ${c}`, op, d),
    wrong: [
      { value: form(`${v} - ${d}`, op, c), why: `The number subtracted inside the bars is the centre (${c}). The number on the right is the allowed distance (${d}).` },
      { value: form(`${v} - ${c}`, pass ? 'ge' : 'le', d), why: pass ? `That describes values ${d} or more away from ${c}, the opposite of what the sentence says.` : `That describes values within ${d} of ${c}, the opposite of what the sentence says.` },
      { value: form(`${v} + ${c}`, op, d), why: R`The distance between \(${v}\) and \(${c}\) is \(|${v} - ${c}|\).` },
      form(v, op, c + d),
    ],
    solution: [
      R`The distance between \(${v}\) and the target \(${c}\) is \(|${v} - ${c}|\).`,
      pass ? R`That distance may be at most \(${d}\): \(|${v} - ${c}| \le ${d}\).` : R`That distance is more than \(${d}\): \(|${v} - ${c}| > ${d}\).`,
      pass ? R`As a chain this is \(${c - d} \le ${v} \le ${c + d}\).` : R`As two rays this is \(${v} < ${c - d}\) or \(${v} > ${c + d}\).`,
    ],
    rule: 5,
    skill: 'writing inequalities',
    check: () => sameSet(meaning, (w) => holds(op, Math.abs(w - c), d), around([c - d, c + d])),
  });
}

function challengeCountIntegers(rng) {
  const a = rng.int(2, 4);
  const b = rng.nonzero(-9, 9);
  const opL = rng.pick(LESS);
  const opR = rng.pick(LESS);
  const lo = rng.int(-20, 5);
  const hi = lo + rng.int(6, 24);
  const xs = range(-40, 40).filter((x) => holds(opL, lo, a * x + b) && holds(opR, a * x + b, hi));
  if (xs.length < 2 || xs.length > 9) return challengeCountIntegers(rng);
  const L = frac(lo - b, a);
  const U = frac(hi - b, a);
  const n = xs.length;
  return q({
    prompt: R`How many integers are solutions of \(\;${lo} ${SYM[opL]} ${linear(a, b)} ${SYM[opR]} ${hi}\)?`,
    correct: n,
    wrong: [
      { value: n + 1, why: 'Check each end: a boundary counts only if it is an integer and its sign includes "or equal to".' },
      { value: n - 1, why: 'Check each end: an integer boundary with "or equal to" is itself a solution.' },
      { value: hi - lo, why: R`First solve for \(x\). The integers to count are values of \(x\), not values of \(${linear(a, b)}\).` },
      n + 2,
    ],
    solution: [
      R`${move(b)} all three parts: \(${lo - b} ${SYM[opL]} ${a}x ${SYM[opR]} ${hi - b}\).`,
      R`Divide all three parts by \(${a}\): \(${L.tex()} ${SYM[opL]} x ${SYM[opR]} ${U.tex()}\).`,
      R`The integers in that interval are \(${xs.join(', ')}\).`,
      `That is ${n} integers.`,
    ],
    rule: 3,
    skill: 'compound inequalities',
    check: () => {
      const first = STRICT[opL] ? Math.floor(L.n / L.d) + 1 : Math.ceil(L.n / L.d);
      const last = STRICT[opR] ? Math.ceil(U.n / U.d) - 1 : Math.floor(U.n / U.d);
      return last - first + 1 === n ? true : `counted ${n} integers but the interval holds ${last - first + 1}`;
    },
  });
}

// ───────────── Interactive models ─────────────

const REL = { ...SYM, eq: '=' };
const opOptions = [
  { value: 'lt', label: '< (less than)' },
  { value: 'le', label: '≤ (less than or equal to)' },
  { value: 'gt', label: '> (greater than)' },
  { value: 'ge', label: '≥ (greater than or equal to)' },
];

function solveModel({ a, b, op, c }) {
  const problem = R`\(${linear(a, b)} ${SYM[op]} ${c}\)`;
  if (a === 0) return { error: 'With a = 0 there is no x left to solve for. Choose a different value for a.' };
  const v = frac(c - b, a);
  const out = a < 0 ? FLIP[op] : op;
  const s = ray(out, v);
  const steps = [];
  if (b !== 0) steps.push(R`${move(b)} both sides. Adding or subtracting never changes the sign: \(${terms([[a, 'x']])} ${SYM[op]} ${c - b}\).`);
  if (a !== 1) steps.push(R`${divide(a)}: \(${s.tex}\).`);
  const t = isRight(out) ? Math.floor(v.value) + 1 : Math.ceil(v.value) - 1;
  steps.push(R`Check a number from the shaded part, \(x = ${t}\): \(${a}(${t}) ${signed(b)} = ${a * t + b}\), and \(${a * t + b} ${SYM[op]} ${c}\) is true. ✓`);
  steps.push(STRICT[out] ? R`Graph: open circle at \(${v.tex()}\) (not included), shading to the ${isRight(out) ? 'right' : 'left'}.` : R`Graph: closed circle at \(${v.tex()}\) (included), shading to the ${isRight(out) ? 'right' : 'left'}.`);
  return { problem, steps, answer: set(s), visual: s.visual() };
}

function absModel({ c, rel, d }) {
  const inside = linear(1, -c);
  const problem = R`\(|${inside}| ${REL[rel]} ${d}\)`;
  const first = R`\(|${inside}|\) is the distance between \(x\) and \(${c}\) on the number line. A distance is never negative.`;
  if (d < 0) {
    const none = rel === 'eq' || rel === 'lt' || rel === 'le';
    return { problem, steps: [first, none ? R`So it can never be ${rel === 'eq' ? 'equal to' : rel === 'lt' ? 'less than' : 'as small as'} the negative number \(${d}\).` : R`So it is greater than the negative number \(${d}\) for every \(x\).`], answer: none ? 'No solution' : 'All real numbers' };
  }
  if (d === 0) {
    const answer = { eq: R`\(x = ${c}\)`, le: R`\(x = ${c}\) only`, lt: 'No solution', ge: 'All real numbers', gt: R`All real numbers except \(x = ${c}\)` }[rel];
    const when = { eq: R`only when \(x = ${c}\)`, le: R`only when \(x = ${c}\), because a distance can equal 0 but cannot be less`, lt: R`for no value of \(x\)`, ge: R`for every \(x\)`, gt: R`for every \(x\) except \(${c}\)` }[rel];
    return { problem, steps: [first, R`The distance is 0 only when \(x = ${c}\). For every other \(x\) it is positive.`, R`So \(|${inside}| ${REL[rel]} 0\) is true ${when}.`], answer };
  }
  const lo = c - d;
  const hi = c + d;
  const shift = c === 0 ? '' : R` ${move(-c)} each part.`;
  if (rel === 'eq') {
    const w = lineWindow([lo, hi]);
    return {
      problem,
      steps: [first, R`Two numbers are exactly \(${d}\) ${d === 1 ? 'unit' : 'units'} from \(${c}\). The inside is \(${d}\) or \(${-d}\): \(${inside} = ${d}\) or \(${inside} = ${-d}\).`, R`${c === 0 ? 'So' : R`${move(-c)} both sides of each:`} \(x = ${hi}\) or \(x = ${lo}\).`],
      answer: R`\(${rootsTex([lo, hi])}\)`,
      visual: { type: 'numberLine', ...w, points: [{ value: lo, label: show(lo) }, { value: hi, label: show(hi) }], alt: `Number line with points at ${show(lo)} and ${show(hi)}, each ${d} ${d === 1 ? 'unit' : 'units'} from ${show(c)}.` },
    };
  }
  const less = !isRight(rel);
  const s = less ? between(lo, rel, rel, hi) : outside(FLIP[rel], lo, rel, hi);
  const steps = less
    ? [first, R`"Less than" means \(x\) is within \(${d}\) ${d === 1 ? 'unit' : 'units'} of \(${c}\). Write a chain: \(${-d} ${SYM[rel]} ${inside} ${SYM[rel]} ${d}\).${shift}`, R`So \(${s.tex}\): the numbers between the two boundary points.`]
    : [first, R`"Greater than" means \(x\) is more than \(${d}\) ${d === 1 ? 'unit' : 'units'} from \(${c}\). Split it: \(${inside} ${SYM[FLIP[rel]]} ${-d}\) or \(${inside} ${SYM[rel]} ${d}\).${shift}`, R`So \(${s.tex}\): the numbers outside the two boundary points.`];
  return { problem, steps, answer: set(s), visual: s.visual() };
}

export default {
  id: 'inequalities',
  title: 'Linear Inequalities',
  summary: 'Solve and graph one-variable inequalities, compound inequalities and absolute-value equations and inequalities.',
  standards: ['CCSS A-REI.B.3', 'CCSS A-CED.A.1', 'CCSS A-CED.A.3'],

  explain: {
    intro: R`An inequality compares two expressions with \(<\), \(\le\), \(>\) or \(\ge\). Its solution is usually a whole range of numbers, so the answer is a simpler inequality and a picture on a number line. You solve it with the same balance moves as an equation, plus one extra rule about negative numbers.`,
    rules: [
      {
        title: 'Solve it like an equation',
        text: R`Add or subtract the same number on both sides, or multiply or divide both sides by the same **positive** number. The inequality sign keeps its direction.`,
        example: R`\(3x + 5 < 17\). Subtract 5: \(3x < 12\). Divide by 3: \(x < 4\).`,
      },
      {
        title: 'Negative multiplier: reverse the sign',
        text: R`When you multiply or divide both sides by a **negative** number, reverse the inequality sign. You can see why with numbers: \(2 < 5\), but \(-2 > -5\).`,
        example: R`\(-2x \le 6\). Divide by \(-2\) and reverse the sign: \(x \ge -3\).`,
      },
      {
        title: 'Graph the solutions on a number line',
        text: R`Mark the boundary number. Use an open circle for \(<\) or \(>\) (the boundary is not a solution) and a closed circle for \(\le\) or \(\ge\) (it is). Then shade the side where the solutions are.`,
        example: R`\(x \ge -3\): closed circle at \(-3\), shading to the right.`,
      },
      {
        title: 'Compound inequalities: "and", "or"',
        text: R`"And" means both conditions hold, so the solutions are the overlap. It is often written as one chain such as \(-3 \le x < 3\), and you solve a chain by doing every step to all three parts. "Or" means at least one condition holds, so the solutions are both pieces together.`,
        example: R`\(-5 \le 2x + 1 < 7\). Subtract 1: \(-6 \le 2x < 6\). Divide by 2: \(-3 \le x < 3\).`,
      },
      {
        title: 'Absolute-value equations',
        text: R`\(|A|\) is the distance of \(A\) from 0. If \(|A| = d\) and \(d\) is positive, then \(A = d\) or \(A = -d\): solve both. If \(d\) is negative there is no solution, because a distance is never negative.`,
        example: R`\(|x - 2| = 5\): \(x - 2 = 5\) or \(x - 2 = -5\), so \(x = 7\) or \(x = -3\).`,
      },
      {
        title: 'Absolute-value inequalities',
        text: R`Isolate the absolute value first. \(|A| < d\) says \(A\) is within \(d\) of 0: write the chain \(-d < A < d\) (an "and"). \(|A| > d\) says \(A\) is more than \(d\) from 0: write \(A < -d\) or \(A > d\) (an "or").`,
        example: R`\(|x - 2| \le 5\) becomes \(-5 \le x - 2 \le 5\), so \(-3 \le x \le 7\).`,
      },
      {
        title: 'Inequalities from stories',
        text: R`Find the quantity that is limited. If the limit is a ceiling (a budget, a capacity), the total must be less than or equal to it. If it is a floor (a goal, a requirement), the total must be greater than or equal to it. Write the total as an expression, compare it with the limit and solve. When the answer must be a whole number, round toward the side that still meets the limit.`,
        example: R`$35 to spend, $10 entry, $4 per ride: \(4x + 10 \le 35\), so \(x \le 6.25\). At most 6 rides.`,
      },
    ],
    vocab: [
      { term: 'inequality', def: 'A statement that one expression is less than, greater than, or possibly equal to another.' },
      { term: 'solution set', def: 'All the numbers that make the inequality true.' },
      { term: 'boundary point', def: 'The number where the two sides are equal. It separates the solutions from the non-solutions.' },
      { term: 'compound inequality', def: 'Two inequalities joined by "and" or "or".' },
      { term: 'absolute value', def: R`The distance of a number from 0 on the number line, written \(|x|\). It is never negative.` },
      { term: 'at least, at most', def: R`"At least 5" means 5 or more (\(\ge 5\)). "At most 5" means 5 or less (\(\le 5\)).` },
    ],
    mistakes: [
      R`Forgetting to reverse the sign after dividing by a negative: \(-3x > 12\) gives \(x < -4\).`,
      R`Reversing the sign when it is not needed. A negative number on the other side does not matter: \(3x > -12\) gives \(x > -4\).`,
      R`Mixing up the circles. Open is for \(<\) and \(>\); closed is for \(\le\) and \(\ge\).`,
      R`Writing \(|x| > 3\) as \(-3 > x > 3\). No number is below \(-3\) and above 3 at once. The answer is \(x < -3\) or \(x > 3\).`,
      'Rounding a whole-number answer the wrong way. Put the rounded value back into the story to check it.',
    ],
    visual: ray('ge', -3).visual(),
  },

  examples: [
    {
      title: 'Dividing by a negative',
      problem: R`Solve \(-3x + 4 > 19\) and graph the solutions.`,
      steps: [
        R`Subtract 4 from both sides: \(-3x > 15\). Subtracting does not change the sign.`,
        R`Divide both sides by \(-3\). It is negative, so reverse the sign: \(x < -5\).`,
        R`Check a number in the solution set, \(x = -6\): \(-3(-6) + 4 = 22\), and \(22 > 19\). ✓`,
        R`Graph: open circle at \(-5\) (not included), shading to the left.`,
      ],
      answer: R`\(x < -5\)`,
      visual: ray('lt', -5).visual(),
    },
    {
      title: 'A compound inequality ("and")',
      problem: R`Solve \(-5 \le 2x + 1 < 7\).`,
      steps: [
        R`Do each step to all three parts. Subtract 1: \(-6 \le 2x < 6\).`,
        R`Divide by 2 (positive, so the signs stay): \(-3 \le x < 3\).`,
        R`Graph: closed circle at \(-3\), open circle at 3, shading between them.`,
      ],
      answer: R`\(-3 \le x < 3\)`,
      visual: between(-3, 'le', 'lt', 3).visual(),
    },
    {
      title: 'An absolute-value equation',
      problem: R`Solve \(|2x + 1| = 7\).`,
      steps: [
        R`The inside is 7 units from 0, so it is 7 or \(-7\).`,
        R`Case 1: \(2x + 1 = 7\), so \(2x = 6\) and \(x = 3\).`,
        R`Case 2: \(2x + 1 = -7\), so \(2x = -8\) and \(x = -4\).`,
        R`Check: \(|2(3) + 1| = |7| = 7\) and \(|2(-4) + 1| = |-7| = 7\). ✓`,
      ],
      answer: R`\(x = -4\) or \(x = 3\)`,
    },
    {
      title: 'An absolute-value inequality ("or")',
      problem: R`Solve \(|x - 2| \ge 5\) and graph the solutions.`,
      steps: [
        R`\(|x - 2|\) is the distance between \(x\) and 2. "At least 5 away" points to two separate regions.`,
        R`Split it: \(x - 2 \le -5\) or \(x - 2 \ge 5\).`,
        R`Add 2 to each: \(x \le -3\) or \(x \ge 7\).`,
        R`Graph: closed circles at \(-3\) and 7, shading away from the middle.`,
      ],
      answer: R`\(x \le -3\) or \(x \ge 7\)`,
      visual: outside('le', -3, 'ge', 7).visual(),
    },
    {
      title: 'Word problem: a weight limit',
      word: true,
      problem: 'A delivery van can carry at most 1,200 pounds. The equipment already on board weighs 180 pounds, and each box weighs 45 pounds. How many boxes can the van carry?',
      steps: [
        R`The limit is a ceiling on the total weight. Let \(x\) be the number of boxes: \(45x + 180 \le 1200\).`,
        R`Subtract 180: \(45x \le 1020\).`,
        R`Divide by 45: \(x \le 22.67\) (rounded).`,
        'Boxes come in whole numbers and the total must stay under the limit, so round down. 22 boxes weigh 1,170 pounds with the equipment; 23 boxes would weigh 1,215 pounds.',
      ],
      answer: 'At most 22 boxes',
    },
  ],

  models: [
    {
      id: 'solve-inequality',
      title: 'Solve ax + b < c',
      intro: 'Choose the numbers and the sign. Watch what happens to the sign when a is negative.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x)', type: 'int', min: -12, max: 12, value: -3 },
        { name: 'b', label: 'b (constant)', type: 'int', min: -30, max: 30, value: 4 },
        { name: 'op', label: 'Inequality sign', type: 'select', value: 'gt', options: opOptions },
        { name: 'c', label: 'c (right side)', type: 'int', min: -30, max: 30, value: 19 },
      ],
      compute: solveModel,
    },
    {
      id: 'absolute-value',
      title: 'Absolute value as distance: |x − c| compared with d',
      intro: 'Choose the centre c, the comparison and the distance d. Try a negative d as well.',
      inputs: [
        { name: 'c', label: 'c (centre)', type: 'int', min: -10, max: 10, value: 2 },
        { name: 'rel', label: 'Comparison', type: 'select', value: 'ge', options: [{ value: 'eq', label: '= (equal to)' }, ...opOptions] },
        { name: 'd', label: 'd (distance)', type: 'int', min: -5, max: 12, value: 5 },
      ],
      compute: absModel,
    },
    {
      id: 'budget',
      title: 'Word problem: staying within a budget',
      word: true,
      intro: 'Change the amounts in the story.',
      inputs: [
        { name: 'budget', label: 'Money to spend (dollars)', type: 'int', min: 1, max: 500, value: 35 },
        { name: 'fee', label: 'Entry fee (dollars)', type: 'int', min: 0, max: 100, value: 10 },
        { name: 'price', label: 'Cost of one ride (dollars)', type: 'int', min: 1, max: 50, value: 4 },
      ],
      compute({ budget, fee, price }) {
        if (fee > budget) return { error: 'The entry fee is more than the money to spend, so there is nothing left for rides. Lower the fee or raise the budget.' };
        const x = frac(budget - fee, price);
        const n = Math.floor((budget - fee) / price);
        const steps = [R`Let \(x\) be the number of rides. The budget is a ceiling on the total cost: \(${linear(price, fee)} \le ${budget}\).`];
        if (fee > 0) steps.push(R`Subtract \(${fee}\) from both sides: \(${terms([[price, 'x']])} \le ${budget - fee}\).`);
        if (price > 1) steps.push(R`Divide by \(${price}\). It is positive, so the sign stays: \(x \le ${x.tex()}${x.isInt() ? '' : R` \approx ${num(x.value, { places: 2 })}`}\).`);
        steps.push(x.isInt() ? 'That is a whole number, and it uses up the budget exactly.' : `Rides come in whole numbers and the total must not go over, so round down. ${plural(n + 1, 'ride')} would cost ${money(price * (n + 1) + fee)} in all.`);
        return {
          problem: `Rosa has ${money(budget)} to spend at a fair. ${fee > 0 ? `Entry costs ${money(fee)}` : 'Entry is free'} and each ride costs ${money(price)}. How many rides can Rosa pay for?`,
          steps,
          answer: `At most ${plural(n, 'ride')} (total cost ${money(price * n + fee)})`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyOneStep, easyDivideNegative, easyReadGraph, easyIsSolution, easyStoryPhrase],
    medium: [mediumTwoStep, mediumBothSides, mediumCompoundAnd, mediumAbsEquation, mediumStoryBudget, mediumGraphCompound],
    hard: [hardDistribute, hardCompoundNegative, hardAbsInequality, hardOr, hardStoryAverage, hardStoryProfit],
    challenge: [challengeAbsSpecial, challengeIsolateAbs, challengeWriteAbs, challengeCountIntegers],
  },
};
