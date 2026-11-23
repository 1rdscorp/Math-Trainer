import { R, q, num, linear, signed, isPrime, person, people, frac } from '../../lib/index.js';
import { dist, angleAt, angleMark, labelAt, tickMark } from './_shared.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const near = (a, b) => Math.abs(a - b) < 1e-6;

// ───────────── Data that decides every logic question ─────────────
// Each domain lists properties and a set of representatives that between them cover every case
// (the quadrilateral and triangle classes partition all shapes of that kind), so a conditional is true
// exactly when no representative makes the hypothesis true and the conclusion false. `has` is written
// by hand; the checks recompute it from coordinates, side lengths or a much wider range of integers.

function quadFacts(p) {
  const v = (i, j) => [p[j][0] - p[i][0], p[j][1] - p[i][1]];
  const dotp = (a, b) => a[0] * b[0] + a[1] * b[1];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const s = [0, 1, 2, 3].map((i) => dist(p[i], p[(i + 1) % 4]));
  const rightAt = [0, 1, 2, 3].map((i) => near(dotp(v(i, (i + 1) % 4), v(i, (i + 3) % 4)), 0));
  const rect = rightAt.every(Boolean);
  const rhom = s.every((x) => near(x, s[0]));
  const d1 = v(0, 2);
  const d2 = v(1, 3);
  const f = {
    sq: rect && rhom, rect, rhom, para: near(cross(v(0, 1), v(3, 2)), 0) && near(cross(v(1, 2), v(0, 3)), 0),
    r4: rect, s4: rhom, sqdef: rect && rhom,
    db: near(p[0][0] + p[2][0], p[1][0] + p[3][0]) && near(p[0][1] + p[2][1], p[1][1] + p[3][1]),
    os: near(s[0], s[2]) && near(s[1], s[3]),
    dc: near(Math.hypot(...d1), Math.hypot(...d2)), dp: near(dotp(d1, d2), 0),
    r1: rightAt.some(Boolean), adj: [0, 1, 2, 3].some((i) => near(s[i], s[(i + 1) % 4])),
  };
  return new Set(Object.keys(f).filter((k) => f[k]));
}

function triFacts(sides) {
  const [a, b, c] = sides;
  const ang = [[a, b, c], [b, c, a], [c, a, b]].map(([x, y, z]) => (Math.acos((y * y + z * z - x * x) / (2 * y * z)) * 180) / Math.PI);
  const eqS = [near(a, b), near(b, c), near(a, c)];
  const eqA = [near(ang[0], ang[1]), near(ang[1], ang[2]), near(ang[0], ang[2])];
  const big = Math.max(...ang);
  const f = {
    equi: eqS.every(Boolean), iso: eqS.some(Boolean), right: near(big, 90), acute: big < 90 - 1e-6, obtuse: big > 90 + 1e-6,
    eqang: eqA.every(Boolean), isoang: eqA.some(Boolean), obtang: big > 90 + 1e-6, rightang: ang.some((x) => near(x, 90)),
  };
  return new Set(Object.keys(f).filter((k) => f[k]));
}

const SQ = [[0, 0], [4, 0], [4, 4], [0, 4]];
const RECT = [[0, 0], [6, 0], [6, 3], [0, 3]];
const RHOM = [[0, 0], [5, 0], [8, 4], [3, 4]];
const PARA = [[0, 0], [6, 0], [8, 3], [2, 3]];
const TRAP = [[0, 0], [8, 0], [6, 3], [2, 3]];

const QUAD = {
  noun: 'quadrilateral',
  subjects: ['quadrilateral ABCD', 'quadrilateral PQRS', 'quadrilateral WXYZ'],
  props: {
    sq: { is: 'is a square', not: 'is not a square', np: 'square' },
    rect: { is: 'is a rectangle', not: 'is not a rectangle', np: 'rectangle' },
    rhom: { is: 'is a rhombus', not: 'is not a rhombus', np: 'rhombus' },
    para: { is: 'is a parallelogram', not: 'is not a parallelogram', np: 'parallelogram' },
    r4: { is: 'has four right angles', extra: true },
    s4: { is: 'has four congruent sides', extra: true },
    db: { is: 'has diagonals that bisect each other', extra: true },
    os: { is: 'has both pairs of opposite sides congruent', extra: true },
    sqdef: { is: 'has four right angles and four congruent sides', extra: true },
  },
  reps: [
    { name: 'a square', pts: SQ, has: ['sq', 'rect', 'rhom', 'para', 'r4', 's4', 'db', 'os', 'sqdef'] },
    { name: 'a rectangle that is not a square', pts: RECT, has: ['rect', 'para', 'r4', 'db', 'os'] },
    { name: 'a rhombus that is not a square', pts: RHOM, has: ['rhom', 'para', 's4', 'db', 'os'] },
    { name: 'a parallelogram that is neither a rectangle nor a rhombus', pts: PARA, has: ['para', 'db', 'os'] },
    { name: 'a quadrilateral that is not a parallelogram', pts: TRAP, has: [] },
  ],
  facts: (r) => quadFacts(r.pts),
};

const PGRAM = {
  noun: 'parallelogram',
  subjects: ['parallelogram JKLM', 'parallelogram ABCD'],
  props: {
    rect: { is: 'is a rectangle', not: 'is not a rectangle' },
    rhom: { is: 'is a rhombus', not: 'is not a rhombus' },
    sq: { is: 'is a square', not: 'is not a square' },
    dc: { is: 'has congruent diagonals', extra: true },
    dp: { is: 'has perpendicular diagonals', extra: true },
    r1: { is: 'has a right angle', extra: true },
    adj: { is: 'has two consecutive sides that are congruent', extra: true },
  },
  reps: [
    { name: 'a square', pts: SQ, has: ['rect', 'rhom', 'sq', 'dc', 'dp', 'r1', 'adj'] },
    { name: 'a rectangle that is not a square', pts: RECT, has: ['rect', 'dc', 'r1'] },
    { name: 'a rhombus that is not a square', pts: RHOM, has: ['rhom', 'dp', 'adj'] },
    { name: 'a parallelogram that is neither a rectangle nor a rhombus', pts: PARA, has: [] },
  ],
  facts: (r) => quadFacts(r.pts),
};

const TRI = {
  noun: 'triangle',
  subjects: ['triangle PQR', 'triangle JKL', 'triangle XYZ'],
  note: 'Here an isosceles triangle is one with at least two congruent sides.',
  props: {
    equi: { is: 'is equilateral', not: 'is not equilateral', np: 'equilateral triangle' },
    iso: { is: 'is isosceles', not: 'is not isosceles', np: 'isosceles triangle' },
    right: { is: 'is a right triangle', not: 'is not a right triangle', np: 'right triangle' },
    acute: { is: 'is acute', not: 'is not acute', np: 'acute triangle' },
    obtuse: { is: 'is obtuse', not: 'is not obtuse', np: 'obtuse triangle' },
    eqang: { is: 'has three congruent angles', extra: true },
    isoang: { is: 'has at least two congruent angles', extra: true },
    obtang: { is: R`has an angle greater than \(90^\circ\)`, extra: true },
    rightang: { is: R`has a \(90^\circ\) angle`, extra: true },
  },
  reps: [
    { name: 'an equilateral triangle', sides: [5, 5, 5], has: ['equi', 'iso', 'acute', 'eqang', 'isoang'] },
    { name: 'an acute isosceles triangle that is not equilateral', sides: [5, 5, 6], has: ['iso', 'acute', 'isoang'] },
    { name: 'an isosceles right triangle', sides: [5, 5, 5 * Math.SQRT2], has: ['iso', 'right', 'isoang', 'rightang'] },
    { name: 'an obtuse isosceles triangle', sides: [5, 5, 8], has: ['iso', 'obtuse', 'isoang', 'obtang'] },
    { name: 'an acute scalene triangle', sides: [5, 6, 7], has: ['acute'] },
    { name: 'a scalene right triangle', sides: [3, 4, 5], has: ['right', 'rightang'] },
    { name: 'an obtuse scalene triangle', sides: [4, 5, 8], has: ['obtuse', 'obtang'] },
  ],
  facts: (r) => triFacts(r.sides),
};

const mult = (k) => ({ is: `is a multiple of ${k}`, not: `is not a multiple of ${k}`, np: `multiple of ${k}`, t: (n) => n % k === 0 });
const both = (j, k) => ({ is: `is a multiple of both ${j} and ${k}`, extra: true, t: (n) => n % j === 0 && n % k === 0 });
const INT = {
  noun: 'positive integer',
  props: {
    even: { is: 'is even', not: 'is not even', np: 'even number', t: (n) => n % 2 === 0 },
    m3: mult(3), m4: mult(4), m5: mult(5), m6: mult(6), m9: mult(9), m10: mult(10), m12: mult(12), m15: mult(15),
    prime: { is: 'is prime', not: 'is not prime', np: 'prime number', t: (n) => isPrime(n) },
    square: { is: 'is a perfect square', not: 'is not a perfect square', np: 'perfect square', t: (n) => Number.isInteger(Math.sqrt(n)) },
    b23: both(2, 3), b34: both(3, 4), b26: { ...both(2, 6), noTrue: true }, b35: both(3, 5), b25: both(2, 5),
    e0: { is: 'ends in 0', extra: true, t: (n) => n % 10 === 0 },
    e05: { is: 'ends in 0 or 5', extra: true, t: (n) => n % 5 === 0 },
    e5: { is: 'ends in 5', extra: true, t: (n) => n % 10 === 5 },
    eEven: { is: 'ends in 0, 2, 4, 6 or 8', extra: true, t: (n) => n % 2 === 0 },
  },
};
const intRep = (n) => ({ n, name: `\\(${n}\\)`, has: new Set(Object.keys(INT.props).filter((k) => INT.props[k].t(n))) });
INT.reps = range(1, 240).map(intRep);
let wideInts = null;
INT.reps2 = () => (wideInts ??= range(1, 2000).map(intRep));

for (const dom of [QUAD, PGRAM, TRI]) {
  for (const r of dom.reps) r.has = new Set(r.has);
  dom.reps2 = () => dom.reps.map((r) => ({ name: r.name, has: dom.facts(r) }));
}
const DOMS = [INT, QUAD, TRI, PGRAM];
for (const dom of DOMS) {
  const key = (p) => dom.reps.map((r) => (r.has.has(p) ? 1 : 0)).join('');
  dom.key = key;
  const base = Object.keys(dom.props).filter((p) => !dom.props[p].extra);
  dom.pairs = base.flatMap((P) => base.filter((Q) => Q !== P && key(P) !== key(Q)).map((Q) => [P, Q]));
  const all = Object.keys(dom.props);
  dom.allPairs = all.flatMap((P) => all.filter((Q) => Q !== P).map((Q) => [P, Q]));
}
const WEIGHTED = [INT, INT, QUAD, QUAD, TRI, TRI, PGRAM];

const L = (p, neg = false) => ({ p, neg });
const notL = (l) => ({ p: l.p, neg: !l.neg });
const holds = (r, l) => r.has.has(l.p) !== l.neg;
const truth = (reps, st) => reps.every((r) => !holds(r, st.A) || holds(r, st.B));
const cxOf = (reps, st) => reps.filter((r) => holds(r, st.A) && !holds(r, st.B));
const phr = (dom, l) => (l.neg ? dom.props[l.p].not : dom.props[l.p].is);
const say = (dom, st) => `If a ${dom.noun} ${phr(dom, st.A)}, then it ${phr(dom, st.B)}.`;
const bicond = (dom, P, Q) => `A ${dom.noun} ${dom.props[P].is} if and only if it ${dom.props[Q].is}.`;
const tf = (b) => (b ? 'true' : 'false');
const noteFor = (dom, ids) => (dom === TRI && ids.some((p) => p === 'iso' || p === 'isoang') ? `\n${TRI.note}` : '');

function forms(P, Q) {
  return {
    orig: { A: L(P), B: L(Q) }, conv: { A: L(Q), B: L(P) }, inv: { A: L(P, true), B: L(Q, true) }, contra: { A: L(Q, true), B: L(P, true) },
    pnq: { A: L(P), B: L(Q, true) }, nqp: { A: L(Q, true), B: L(P) }, npq: { A: L(P, true), B: L(Q) }, qnp: { A: L(Q), B: L(P, true) },
  };
}
const FORM_NAME = { conv: 'converse', inv: 'inverse', contra: 'contrapositive' };

function pickPair(rng, ok = () => true, doms = WEIGHTED) {
  for (let i = 0; i < 500; i++) {
    const dom = rng.pick(doms);
    const [P, Q] = rng.pick(dom.pairs);
    const F = forms(P, Q);
    if (ok(dom, F, P, Q)) return { dom, P, Q, F };
  }
  throw new Error('pickPair: no pair fits');
}

/** Check: the hand-written data agrees with the recomputed data, and each statement has the truth value claimed. */
function dataCheck(dom, claims) {
  const reps2 = dom.reps2();
  if (dom !== INT) {
    for (let i = 0; i < dom.reps.length; i++) {
      for (const p of Object.keys(dom.props)) if (dom.reps[i].has.has(p) !== reps2[i].has.has(p)) return `${dom.reps[i].name}: property ${p} disagrees with the figure`;
    }
  }
  for (const [st, want] of claims) if (truth(reps2, st) !== want) return `"${say(dom, st)}" is not ${tf(want)}`;
  return true;
}

/** Does `goal` (a literal, or { A, B }) follow from the premises and facts? Checked over every truth assignment. */
function entails(atoms, premises, facts, goal) {
  for (let m = 0; m < 1 << atoms.length; m++) {
    const val = (l) => ((m >> atoms.indexOf(l.p)) & 1) === 1 !== l.neg;
    if (!premises.every((s) => !val(s.A) || val(s.B)) || !facts.every(val)) continue;
    const ok = goal.A ? !val(goal.A) || val(goal.B) : val(goal);
    if (!ok) return false;
  }
  return true;
}

// ───────────── Easy ─────────────

function easyHypConc(rng) {
  if (rng.bool(0.4)) {
    const { dom, F, P, Q } = pickPair(rng, (d, f, P) => !!d.props[P].np);
    const sentence = `${rng.pick(['Every', 'Any'])} ${dom.props[P].np} ${dom.props[Q].is}.`;
    return q({
      prompt: `Which choice writes this sentence in if-then form?\n**${sentence}**${noteFor(dom, [P, Q])}`,
      correct: say(dom, F.orig),
      wrong: [
        { value: say(dom, F.conv), why: 'That swaps the hypothesis and the conclusion. It is the converse, a different statement.' },
        { value: say(dom, F.inv), why: 'That negates both parts. It is the inverse, a different statement.' },
        say(dom, F.pnq),
      ],
      solution: [`The sentence is about every ${dom.props[P].np}, so being a ${dom.props[P].np} is the hypothesis: "a ${dom.noun} ${dom.props[P].is}".`, `What the sentence says about it is the conclusion: "it ${dom.props[Q].is}".`, `So the if-then form is: ${say(dom, F.orig)}`],
      rule: 0,
      skill: 'if-then form',
    });
  }
  const { dom, F, P, Q } = pickPair(rng);
  const st = F[rng.pick(['orig', 'orig', 'conv', 'inv', 'contra'])];
  const askHyp = rng.bool();
  const clause = (l) => `The ${dom.noun} ${phr(dom, l)}.`;
  const right = askHyp ? st.A : st.B;
  const other = askHyp ? st.B : st.A;
  return q({
    prompt: `What is the ${askHyp ? 'hypothesis' : 'conclusion'} of this conditional?\n**${say(dom, st)}**`,
    correct: clause(right),
    wrong: [
      { value: clause(other), why: askHyp ? 'That part comes after "then", so it is the conclusion. The hypothesis comes after "if".' : 'That part comes after "if", so it is the hypothesis. The conclusion comes after "then".' },
      clause(notL(right)),
      clause(notL(other)),
    ],
    solution: [`The hypothesis is the part after "if": ${clause(st.A).toLowerCase()}`, `The conclusion is the part after "then": ${clause(st.B).toLowerCase()}`, `So the ${askHyp ? 'hypothesis' : 'conclusion'} is: ${clause(right).toLowerCase()}`],
    rule: 0,
    skill: 'hypothesis and conclusion',
    check: () => (P !== Q ? true : 'same property twice'),
  });
}

function easyNameForm(rng) {
  const { dom, F, P, Q } = pickPair(rng);
  const kind = rng.pick(['conv', 'inv', 'contra']);
  const what = { conv: 'swaps the hypothesis and the conclusion', inv: 'negates both the hypothesis and the conclusion', contra: 'swaps the hypothesis and the conclusion and negates both' }[kind];
  if (rng.bool()) {
    return q({
      prompt: `Statement: **${say(dom, F.orig)}**\nWhat is this related statement called?\n**${say(dom, F[kind])}**`,
      correct: `The ${FORM_NAME[kind]}`,
      wrong: [...['conv', 'inv', 'contra'].filter((k) => k !== kind).map((k) => `The ${FORM_NAME[k]}`), 'The biconditional'],
      solution: [`Compare the two statements: the related statement ${what}.`, `That makes it the ${FORM_NAME[kind]}.`],
      rule: 1,
      skill: 'converse, inverse, contrapositive',
    });
  }
  return q({
    prompt: `Statement: **${say(dom, F.orig)}**\nWhich choice is its ${FORM_NAME[kind]}?`,
    correct: say(dom, F[kind]),
    wrong: [...['conv', 'inv', 'contra'].filter((k) => k !== kind).map((k) => ({ value: say(dom, F[k]), why: `That is the ${FORM_NAME[k]}.` })), say(dom, F.pnq)],
    solution: [`The ${FORM_NAME[kind]} ${what}.`, `So it is: ${say(dom, F[kind])}`],
    rule: 1,
    skill: 'converse, inverse, contrapositive',
  });
}

const IND = 'Inductive: it generalizes from specific cases.';
const DED = 'Deductive: it applies a general rule to a specific case.';
const IND_X = 'Inductive: it applies a general rule to a specific case.';
const DED_X = 'Deductive: it generalizes from specific cases.';

function easyInductiveDeductive(rng) {
  const [A, B] = people(rng, 2);
  const k = rng.int(4, 9);
  const x = rng.int(25, 75);
  const y = rng.int(30, 70);
  const s = rng.int(4, 15);
  const mm = rng.pick([40, 45, 50, 55]);
  const inductive = [
    R`${A} measures the angles of ${k} different triangles. Each time they add to \(180^\circ\). ${A} concludes that the angles of every triangle add to \(180^\circ\).`,
    `${A} draws ${k} rhombuses and finds that the diagonals are perpendicular in each one, so ${A} concludes that the diagonals of every rhombus are perpendicular.`,
    `On each of the last ${k} school days the bus reached the stop by 7:${mm}. ${A} concludes that it will be there by 7:${mm} tomorrow.`,
    R`${A} checks that \(n^2 + n\) is even for \(n = 1\) to \(${k + 3}\) and concludes that \(n^2 + n\) is even for every positive integer \(n\).`,
    `${A} cuts out ${k} quadrilaterals, tears off the corners of each and finds that they fit together around a point every time. ${A} concludes that the angles of any quadrilateral add to 360°.`,
  ];
  const deductive = [
    R`${A} knows that vertical angles are congruent. \(\angle 1\) and \(\angle 2\) are vertical angles and \(m\angle 1 = ${x}^\circ\), so ${A} concludes that \(m\angle 2 = ${x}^\circ\).`,
    R`${A} knows that the angles of a triangle add to \(180^\circ\). Two angles of a triangle are \(${x}^\circ\) and \(${y}^\circ\), so ${A} concludes that the third is \(${180 - x - y}^\circ\).`,
    `The school rule says that every student with a signed form may go on the trip. ${B} has a signed form, so ${A} concludes that ${B} may go on the trip.`,
    R`${A} knows that a rhombus has four congruent sides. \(PQRS\) is a rhombus with \(PQ = ${s}\) cm, so ${A} concludes that \(QR = ${s}\) cm.`,
    R`${A} knows that the angles in a linear pair add to \(180^\circ\). \(\angle 1\) and \(\angle 2\) form a linear pair and \(m\angle 1 = ${x}^\circ\), so ${A} concludes that \(m\angle 2 = ${180 - x}^\circ\).`,
  ];
  const isInd = rng.bool();
  const story = rng.pick(isInd ? inductive : deductive);
  return q({
    prompt: `What kind of reasoning is this, and why?\n${story}`,
    correct: isInd ? IND : DED,
    wrong: isInd ? [{ value: DED_X, why: 'No general rule is used here; the conclusion comes from a pattern in examples. That is inductive reasoning.' }, IND_X, DED] : [{ value: IND_X, why: 'Inductive reasoning starts from examples. Here a known rule is applied to one case, which is deductive.' }, DED_X, IND],
    solution: isInd
      ? [`${A} looks at several particular cases, sees a pattern and states a general rule.`, 'Reasoning from examples to a general conjecture is inductive. (The conjecture may be true, but the examples alone do not prove it.)']
      : [`${A} starts from a general fact that is already accepted and applies it to one particular case.`, 'Applying a general rule to a specific case is deductive, so the conclusion is certain if the rule and the facts are true.'],
    rule: 3,
    skill: 'inductive vs deductive',
  });
}

const PROPS = {
  refl: 'Reflexive property', sym: 'Symmetric property', trans: 'Transitive property', subst: 'Substitution property',
  add: 'Addition property of equality', sub: 'Subtraction property of equality', mul: 'Multiplication property of equality',
  div: 'Division property of equality', dist: 'Distributive property',
};
// A wrong choice may never be a property that also justifies the step.
const PARTNER = { trans: ['subst'], subst: ['trans'], sym: ['subst'], add: ['sub'], sub: ['add'], mul: ['div'], div: ['mul'], refl: [], dist: ['subst'] };
const PROP_WHY = {
  refl: 'Anything is equal (or congruent) to itself.',
  sym: 'An equation or congruence may be read in either direction.',
  trans: 'Two things congruent to the same thing are congruent to each other.',
  subst: 'A quantity may be replaced by one equal to it.',
  add: 'The same number was added to both sides.',
  sub: 'The same number was subtracted from both sides.',
  mul: 'Both sides were multiplied by the same number.',
  div: 'Both sides were divided by the same nonzero number.',
  dist: 'A product of a number and a sum was multiplied out.',
};

function easyPropertyName(rng) {
  const key = rng.pick(Object.keys(PROPS));
  const a = rng.int(2, 9);
  const b = rng.int(3, 15);
  const [P1, P2, P3, P4] = rng.pick([['A', 'B', 'C', 'D'], ['P', 'Q', 'R', 'S'], ['J', 'K', 'L', 'M'], ['W', 'X', 'Y', 'Z']]);
  const angle = rng.int(20, 80);
  const n = rng.sample([1, 2, 3, 4, 5, 6, 7, 8], 3);
  const text = {
    refl: rng.bool() ? R`\(\overline{${P1}${P2}} \cong \overline{${P1}${P2}}\)` : R`\(m\angle ${P1}${P2}${P3} = m\angle ${P1}${P2}${P3}\)`,
    sym: rng.bool() ? R`If \(${P1}${P2} = ${P3}${P4}\), then \(${P3}${P4} = ${P1}${P2}\).` : R`If \(\angle ${P1} \cong \angle ${P2}\), then \(\angle ${P2} \cong \angle ${P1}\).`,
    trans: rng.bool() ? R`If \(\angle ${n[0]} \cong \angle ${n[1]}\) and \(\angle ${n[1]} \cong \angle ${n[2]}\), then \(\angle ${n[0]} \cong \angle ${n[2]}\).` : R`If \(\overline{${P1}${P2}} \cong \overline{${P2}${P3}}\) and \(\overline{${P2}${P3}} \cong \overline{${P3}${P4}}\), then \(\overline{${P1}${P2}} \cong \overline{${P3}${P4}}\).`,
    subst: R`If \(m\angle ${n[0]} + m\angle ${n[1]} = 180^\circ\) and \(m\angle ${n[1]} = ${angle}^\circ\), then \(m\angle ${n[0]} + ${angle}^\circ = 180^\circ\).`,
    add: R`If \(x - ${a} = ${b}\), then \(x = ${a + b}\).`,
    sub: R`If \(x + ${a} = ${b + a}\), then \(x = ${b}\).`,
    mul: R`If \(\dfrac{x}{${a}} = ${b}\), then \(x = ${a * b}\).`,
    div: R`If \(${a}x = ${a * b}\), then \(x = ${b}\).`,
    dist: R`If \(${a}(${linear(1, b)}) = ${a * (b + angle)}\), then \(${linear(a, a * b)} = ${a * (b + angle)}\).`,
  }[key];
  const pool = rng.shuffle(Object.keys(PROPS).filter((k) => k !== key && !PARTNER[key].includes(k)));
  return q({
    prompt: `Which property justifies this statement?\n${text}`,
    correct: PROPS[key],
    wrong: pool.map((k) => PROPS[k]),
    solution: [PROP_WHY[key], `That is the ${PROPS[key].toLowerCase()}.`],
    rule: 4,
    skill: 'properties of equality',
  });
}

// ───────────── Medium ─────────────

function mediumCounterexample(rng) {
  for (;;) {
    const { dom, F, P, Q } = pickPair(rng);
    const form = rng.pick(['orig', 'orig', 'conv', 'inv', 'contra']);
    const st = F[form];
    const tv = truth(dom.reps, st);
    const small = (list) => (dom === INT ? rng.pick(list.slice(0, 12)) : rng.pick(list));
    const cxs = cxOf(dom.reps, st);
    const nAB = dom.reps.filter((r) => !holds(r, st.A) && holds(r, st.B));
    const AB = dom.reps.filter((r) => holds(r, st.A) && holds(r, st.B));
    const nAnB = dom.reps.filter((r) => !holds(r, st.A) && !holds(r, st.B));
    const cx = tv ? null : small(cxs);
    const ex = (r) => `False: ${r.name} is a counterexample.`;
    const wrong = [];
    if (nAB.length) wrong.push({ value: ex(small(nAB)), why: 'That example does not make the hypothesis true, so it cannot be a counterexample. A counterexample makes the hypothesis true and the conclusion false.' });
    if (AB.length) wrong.push({ value: ex(small(AB)), why: 'That example makes both the hypothesis and the conclusion true, so it agrees with the statement.' });
    if (nAnB.length) wrong.push(ex(small(nAnB)));
    if (!tv) wrong.unshift({ value: 'True: no counterexample exists.', why: R`One counterexample is enough to make a conditional false.` });
    if (wrong.length < 3) continue;
    const picked = [];
    return q({
      prompt: `Is this conditional true? If it is false, choose a counterexample.\n**${say(dom, st)}**${noteFor(dom, [P, Q])}`,
      correct: tv ? 'True: no counterexample exists.' : ex(cx),
      wrong: wrong.filter((w) => (picked.includes(w.value ?? w) ? false : (picked.push(w.value ?? w), true))),
      solution: tv
        ? [`A counterexample would have to be a ${dom.noun} that ${phr(dom, st.A)} but ${phr(dom, notL(st.B))}.`, `There is none: every ${dom.noun} that ${phr(dom, st.A)} also ${phr(dom, st.B)}.`, 'The statement is true.']
        : [`A counterexample makes the hypothesis true and the conclusion false.`, `${cap(cx.name)} ${phr(dom, st.A)}, but it ${phr(dom, notL(st.B))}.`, `So the statement is false, and ${cx.name} is a counterexample.`],
      rule: 0,
      skill: 'counterexamples',
      check: () => {
        const d = dataCheck(dom, [[st, tv]]);
        if (d !== true) return d;
        if (cx && !(holds(cx, st.A) && !holds(cx, st.B))) return 'the counterexample does not work';
        return true;
      },
    });
  }
}

const OTHERS = ['pnq', 'nqp', 'npq', 'qnp'];

function mediumEquivalent(rng) {
  let dom, F, P, Q, mode, target, answer, t0, extra;
  do {
    ({ dom, F, P, Q } = pickPair(rng, (d, f) => truth(d.reps, f.orig) !== truth(d.reps, f.conv)));
    mode = rng.pick(truth(dom.reps, F.orig) ? ['equiv', 'must', 'conv'] : ['equiv', 'conv']);
    target = mode === 'conv' ? F.conv : F.orig;
    answer = mode === 'conv' ? F.inv : F.contra;
    t0 = truth(dom.reps, target);
    extra = OTHERS.map((k) => F[k]).filter((s) => truth(dom.reps, s) !== t0);
  } while (!extra.length);
  const pool = mode === 'conv' ? [F.orig, F.contra] : [F.conv, F.inv];
  const wrongSts = [...pool, rng.pick(extra)];
  const prompt = {
    equiv: `Which statement is logically equivalent to this one?\n**${say(dom, F.orig)}**`,
    must: `This statement is true:\n**${say(dom, F.orig)}**\nWhich other statement must also be true?`,
    conv: `This is the converse of a statement:\n**${say(dom, F.conv)}**\nWhich statement is logically equivalent to this converse?`,
  }[mode];
  return q({
    prompt: prompt + noteFor(dom, [P, Q]),
    correct: say(dom, answer),
    wrong: wrongSts.map((s, i) => (i < 2 ? { value: say(dom, s), why: mode === 'conv' ? (i === 0 ? 'That is the original statement. A converse and its statement can have different truth values.' : 'That is the contrapositive of the original statement, which matches the original, not the converse.') : i === 0 ? 'That is the converse. A statement and its converse can have different truth values.' : 'That is the inverse. It always matches the converse, not the statement.' } : say(dom, s))),
    solution: mode === 'conv'
      ? ['The converse and the inverse are contrapositives of each other, so they are logically equivalent.', `The inverse of the original statement is: ${say(dom, answer)}`]
      : ['A statement and its contrapositive are logically equivalent: they are always both true or both false.', `The contrapositive swaps and negates both parts: ${say(dom, answer)}`],
    rule: 1,
    skill: 'logical equivalence',
    check: () => dataCheck(dom, [[answer, t0], [target, t0], ...wrongSts.map((s) => [s, !t0])]),
  });
}

function lawSubject(rng, dom) {
  return dom === INT ? `${person(rng)}'s ${rng.pick(['locker number', 'jersey number', 'house number'])}` : rng.pick(dom.subjects);
}

function mediumLaws(rng) {
  const mode = rng.pick(['detach', 'detach', 'tollens', 'affirm', 'deny', 'syll', 'badsyll']);
  const said = (dom, st) => say(dom, st);
  if (mode === 'syll' || mode === 'badsyll') {
    for (;;) {
      const dom = rng.pick([INT, INT, QUAD]);
      const [A, B] = rng.pick(dom.pairs);
      const C = rng.pick(Object.keys(dom.props).filter((p) => !dom.props[p].extra && p !== A && p !== B));
      const R1 = { A: L(A), B: L(B) };
      const R2 = mode === 'syll' ? { A: L(B), B: L(C) } : { A: L(C), B: L(B) };
      if (!truth(dom.reps, R1) || !truth(dom.reps, R2) || truth(dom.reps, { A: L(B), B: L(A) })) continue;
      const AC = { A: L(A), B: L(C) };
      const CA = { A: L(C), B: L(A) };
      if (truth(dom.reps, CA)) continue;
      if (mode === 'badsyll' && (truth(dom.reps, AC) || truth(dom.reps, { A: L(B), B: L(C) }))) continue;
      const none = 'No new if-then statement follows from these two.';
      const BA = { A: L(B), B: L(A) };
      const INV = { A: L(A, true), B: L(C, true) };
      const choices = mode === 'syll' ? [said(dom, AC), { value: said(dom, CA), why: 'That reverses the chain. The law of syllogism keeps the order: the first hypothesis leads to the last conclusion.' }, said(dom, INV), none] : [none, { value: said(dom, AC), why: 'The two statements share a conclusion, not a middle step, so they cannot be chained.' }, said(dom, CA), said(dom, BA)];
      const premises = [R1, R2];
      const atoms = [A, B, C];
      return q({
        prompt: `Assume both statements are true. What can you conclude?\n1. ${said(dom, R1)}\n2. ${said(dom, R2)}`,
        correct: choices[0],
        wrong: choices.slice(1),
        solution: mode === 'syll'
          ? [`The conclusion of statement 1 ("${dom.props[B].is}") is the hypothesis of statement 2.`, 'By the law of syllogism, the hypothesis of the first leads to the conclusion of the second.', `So: ${said(dom, AC)}`]
          : [`Both statements end with the same conclusion, "it ${dom.props[B].is}".`, 'The law of syllogism needs the conclusion of one statement to be the hypothesis of the other. Here it is not.', 'So no new if-then statement follows.'],
        rule: 3,
        skill: 'law of syllogism',
        check: () => {
          const ok = mode === 'syll' ? entails(atoms, premises, [], AC) : !entails(atoms, premises, [], AC);
          if (!ok || entails(atoms, premises, [], CA) || entails(atoms, premises, [], mode === 'syll' ? INV : BA)) return 'a choice does not match the logic';
          return dataCheck(dom, [[R1, true], [R2, true], [CA, false]]);
        },
      });
    }
  }
  for (;;) {
    const dom = rng.pick([INT, INT, QUAD, TRI, PGRAM]);
    const [A, B] = rng.pick(dom.pairs);
    const st = { A: L(A), B: L(B) };
    if (!truth(dom.reps, st) || truth(dom.reps, { A: L(B), B: L(A) })) continue;
    if (!dom.reps.some((r) => !r.has.has(A) && !r.has.has(B))) continue;
    const subj = lawSubject(rng, dom);
    const clause = (l) => `${cap(subj)} ${phr(dom, l)}.`;
    const nothing = (p) => `Nothing can be concluded about whether ${subj} ${dom.props[p].is}.`;
    const fact = { detach: L(A), tollens: L(B, true), affirm: L(B), deny: L(A, true) }[mode];
    const goal = { detach: L(B), tollens: L(A, true) }[mode];
    let correct;
    let wrong;
    if (mode === 'detach') {
      correct = clause(L(B));
      wrong = [clause(L(B, true)), { value: nothing(B), why: 'The hypothesis is true for this case, so the law of detachment gives the conclusion.' }, clause(L(A, true))];
    } else if (mode === 'tollens') {
      correct = clause(L(A, true));
      wrong = [{ value: nothing(A), why: R`If the hypothesis were true, the conclusion would be true too. The conclusion is false, so the hypothesis must be false (the contrapositive).` }, clause(L(A)), clause(L(B))];
    } else if (mode === 'affirm') {
      correct = nothing(A);
      wrong = [{ value: clause(L(A)), why: 'That reasons backwards from the conclusion. The conclusion can be true without the hypothesis being true.' }, clause(L(A, true)), clause(L(B, true))];
    } else {
      correct = nothing(B);
      wrong = [{ value: clause(L(B, true)), why: 'When the hypothesis is false, the statement says nothing about the conclusion.' }, clause(L(B)), clause(L(A))];
    }
    const atoms = [A, B];
    const ex = (f) => (dom === INT ? rng.pick(dom.reps.filter(f).slice(0, 8)) : rng.pick(dom.reps.filter(f)));
    const exA = ex((r) => r.has.has(B) && r.has.has(A));
    const exNA = ex((r) => r.has.has(B) && !r.has.has(A));
    const exB = ex((r) => !r.has.has(A) && r.has.has(B));
    const exNB = ex((r) => !r.has.has(A) && !r.has.has(B));
    return q({
      prompt: `Assume both statements are true. What can you conclude?\n1. ${say(dom, st)}\n2. ${clause(fact)}${noteFor(dom, [A, B])}`,
      correct,
      wrong,
      solution: {
        detach: [`Statement 2 says the hypothesis of statement 1 is true for ${subj}.`, 'By the law of detachment, the conclusion is true for it as well.', clause(L(B))],
        tollens: [`Statement 2 says the conclusion of statement 1 is false for ${subj}.`, `If ${subj} ${dom.props[A].is}, statement 1 would make the conclusion true. So the hypothesis must be false.`, clause(L(A, true))],
        affirm: [`Statement 2 says the conclusion of statement 1 is true. The law of detachment needs the hypothesis, not the conclusion.`, `Both kinds exist: ${exA.name} ${dom.props[B].is} and ${dom.props[A].is}, while ${exNA.name} ${dom.props[B].is} but ${dom.props[A].not}. So nothing follows.`, nothing(A)],
        deny: [`Statement 2 says the hypothesis of statement 1 is false. Then statement 1 says nothing.`, `Both kinds exist: ${exB.name} ${dom.props[A].not} but ${dom.props[B].is}, while ${exNB.name} ${dom.props[A].not} and ${dom.props[B].not}.`, nothing(B)],
      }[mode],
      rule: 3,
      skill: 'law of detachment',
      check: () => {
        const premises = [st];
        const facts = [fact];
        if (goal) {
          if (!entails(atoms, premises, facts, goal) || entails(atoms, premises, facts, notL(goal))) return 'conclusion does not follow';
        } else {
          const p = mode === 'affirm' ? A : B;
          if (entails(atoms, premises, facts, L(p)) || entails(atoms, premises, facts, L(p, true))) return 'something does follow';
        }
        return dataCheck(dom, [[st, true], [{ A: L(B), B: L(A) }, false]]);
      },
    });
  }
}

// Algebraic proofs: each row is { tex, why, key, f, slips }, where f(x) gives [left, right] and slips are wrong rows.
const STEP_WHY = { add: 'Addition property of equality', sub: 'Subtraction property of equality', mul: 'Multiplication property of equality', div: 'Division property of equality', dist: 'Distributive property' };

function algebraProof(rng, kinds = ['dist', 'both', 'frac']) {
  const kind = rng.pick(kinds);
  const x = rng.nonzero(-9, 12);
  const row = (tex, f, key) => ({ tex, f, key, why: key ? STEP_WHY[key] : 'Given' });
  const slip = (tex, f) => ({ tex, f });
  let rows;
  let eq;
  if (kind === 'dist') {
    const a = rng.int(2, 7);
    const b = rng.nonzero(-9, 9);
    const c = a * (x + b);
    const k = c - a * b;
    eq = `${a}(${linear(1, b)}) = ${c}`;
    rows = [
      row(eq, (t) => [a * (t + b), c]),
      { ...row(`${linear(a, a * b)} = ${c}`, (t) => [a * t + a * b, c], 'dist'), slips: [slip(`${linear(a, b)} = ${c}`, (t) => [a * t + b, c]), slip(`${linear(a, -a * b)} = ${c}`, (t) => [a * t - a * b, c]), slip(`${linear(a, a + b)} = ${c}`, (t) => [a * t + a + b, c])] },
      { ...row(`${a}x = ${k}`, (t) => [a * t, k], a * b > 0 ? 'sub' : 'add'), slips: [slip(`${a}x = ${c + a * b}`, (t) => [a * t, c + a * b]), slip(`${a}x = ${c - b}`, (t) => [a * t, c - b]), slip(`${a}x = ${a * b - c}`, (t) => [a * t, a * b - c])] },
      { ...row(`x = ${x}`, (t) => [t, x], 'div'), slips: [slip(`x = ${k - a}`, (t) => [t, k - a]), slip(`x = ${k * a}`, (t) => [t, k * a]), slip(`x = ${-x}`, (t) => [t, -x])] },
    ];
  } else if (kind === 'both') {
    const a = rng.int(3, 9);
    const c = rng.int(1, a - 2);
    const b = rng.nonzero(-12, 12);
    const d = (a - c) * x + b;
    const e = a - c;
    eq = `${linear(a, b)} = ${linear(c, d)}`;
    rows = [
      row(eq, (t) => [a * t + b, c * t + d]),
      { ...row(`${linear(e, b)} = ${d}`, (t) => [e * t + b, d], 'sub'), slips: [slip(`${linear(a + c, b)} = ${d}`, (t) => [(a + c) * t + b, d]), slip(`${linear(e, -b)} = ${d}`, (t) => [e * t - b, d]), slip(`${linear(a, b)} = ${d}`, (t) => [a * t + b, d])] },
      { ...row(`${e}x = ${d - b}`, (t) => [e * t, d - b], b > 0 ? 'sub' : 'add'), slips: [slip(`${e}x = ${d + b}`, (t) => [e * t, d + b]), slip(`${e}x = ${b - d}`, (t) => [e * t, b - d]), slip(`${a + c}x = ${d - b}`, (t) => [(a + c) * t, d - b])] },
      { ...row(`x = ${x}`, (t) => [t, x], 'div'), slips: [slip(`x = ${d - b - e}`, (t) => [t, d - b - e]), slip(`x = ${(d - b) * e}`, (t) => [t, (d - b) * e]), slip(`x = ${-x}`, (t) => [t, -x])] },
    ];
  } else {
    const a = rng.int(2, 6);
    const m = rng.nonzero(-6, 8);
    const b = rng.nonzero(-9, 9);
    const c = m + b;
    const xx = a * m;
    eq = R`\dfrac{x}{${a}} ${signed(b)} = ${c}`;
    rows = [
      row(eq, (t) => [t / a + b, c]),
      { ...row(R`\dfrac{x}{${a}} = ${m}`, (t) => [t / a, m], b > 0 ? 'sub' : 'add'), slips: [slip(R`\dfrac{x}{${a}} = ${c + b}`, (t) => [t / a, c + b]), slip(R`\dfrac{x}{${a}} = ${b - c}`, (t) => [t / a, b - c]), slip(R`\dfrac{x}{${a}} = ${c}`, (t) => [t / a, c])] },
      { ...row(`x = ${xx}`, (t) => [t, xx], 'mul'), slips: [slip(`x = ${m + a}`, (t) => [t, m + a]), slip(`x = ${-xx}`, (t) => [t, -xx]), slip(`x = ${m}`, (t) => [t, m])] },
    ];
    return finishAlgebra(rows, xx, eq);
  }
  return finishAlgebra(rows, x, eq);
}

function finishAlgebra(rows, x, eq) {
  const ok = (r) => near(...r.f(x));
  for (const r of rows) if (r.slips) r.slips = r.slips.filter((s, i, all) => !ok(s) && s.tex !== r.tex && all.findIndex((t) => t.tex === s.tex) === i);
  return { rows, x, eq, kind: 'algebra' };
}

const algebraCheck = (pf) => () => {
  for (const r of pf.rows) {
    if (!near(...r.f(pf.x))) return `step ${r.tex} is false at the solution`;
    for (const s of r.slips ?? []) if (near(...s.f(pf.x))) return `slip ${s.tex} is true at the solution`;
  }
  return true;
};

const algebraTable = (pf, missing, mode) => ({
  type: 'table',
  headers: ['Statement', 'Reason'],
  rows: pf.rows.map((r, i) => [mode === 'statement' && i === missing ? `${i + 1}. ?` : `${i + 1}. \\(${r.tex}\\)`, mode === 'reason' && i === missing ? '?' : r.why]),
  caption: mode === 'statement' ? 'An algebraic proof with one statement missing' : 'An algebraic proof with one reason missing',
});

function algebraWrongReasons(key) {
  return Object.keys(PROPS).filter((k) => k !== key && !PARTNER[key].includes(k) && k !== 'subst');
}

function stepWhy(pf, i) {
  const r = pf.rows[i];
  const prev = pf.rows[i - 1];
  return `From \\(${prev.tex}\\) to \\(${r.tex}\\): ${PROP_WHY[r.key].charAt(0).toLowerCase()}${PROP_WHY[r.key].slice(1)}`;
}

function mediumAlgebraReason(rng) {
  const pf = algebraProof(rng);
  const i = rng.int(1, pf.rows.length - 1);
  const r = pf.rows[i];
  return q({
    prompt: R`This proof solves \(${pf.eq}\). Which reason belongs in place of the "?" in step ${i + 1}?`,
    visual: algebraTable(pf, i, 'reason'),
    correct: r.why,
    wrong: rng.shuffle(algebraWrongReasons(r.key)).map((k) => PROPS[k]),
    solution: [stepWhy(pf, i), `The reason is the ${r.why.toLowerCase()}.`],
    rule: 4,
    skill: 'algebraic proof',
    check: algebraCheck(pf),
  });
}

// ───────────── Hard ─────────────

function hardRelatedTruth(rng) {
  const { dom, F, P, Q } = pickPair(rng);
  const reps = dom.reps;
  const c = truth(reps, F.conv);
  const k = truth(reps, F.orig);
  const fmt = (a, b, d) => `Converse ${tf(a)}, inverse ${tf(b)}, contrapositive ${tf(d)}`;
  const line = (name, st) => {
    const t = truth(reps, st);
    const x = cxOf(reps, st)[0];
    const quoted = say(dom, st).slice(0, -1);
    return t ? `The ${name}, "${quoted}", is true.` : `The ${name}, "${quoted}", is false: ${x.name} ${phr(dom, st.A)} but ${phr(dom, notL(st.B))}.`;
  };
  return q({
    prompt: `Statement: **${say(dom, F.orig)}**\nWhich choice gives the truth values of its converse, inverse and contrapositive?${noteFor(dom, [P, Q])}`,
    correct: fmt(c, c, k),
    wrong: [
      { value: fmt(c, !c, k), why: 'The converse and the inverse are contrapositives of each other, so they always have the same truth value.' },
      { value: fmt(c, c, !k), why: 'The contrapositive always has the same truth value as the original statement.' },
      fmt(!c, !c, k),
      fmt(!c, !c, !k),
    ],
    solution: [line('statement', F.orig), line('converse', F.conv), 'The inverse has the same truth value as the converse, and the contrapositive the same as the statement.', `So: ${fmt(c, c, k).toLowerCase()}.`],
    rule: 1,
    skill: 'truth of related statements',
    check: () => dataCheck(dom, [[F.conv, c], [F.inv, c], [F.contra, k], [F.orig, k]]),
  });
}

function hardBiconditional(rng) {
  for (;;) {
    const dom = rng.pick([INT, INT, QUAD, TRI, PGRAM]);
    const same = (P, Q) => dom.key(P) === dom.key(Q);
    const trues = dom.allPairs.filter(([P, Q]) => same(P, Q) && (dom.props[P].extra || dom.props[Q].extra) && !(dom.props[P].extra && dom.props[Q].extra) && !dom.props[P].extra && !dom.props[Q].noTrue);
    const [P, Q] = rng.pick(trues);
    const oneWay = (A, B) => truth(dom.reps, { A: L(A), B: L(B) });
    const decoyPairs = rng.shuffle(dom.allPairs.filter(([A, B]) => !same(A, B) && !dom.props[A].extra));
    const telling = decoyPairs.filter(([A, B]) => (A === P || B === Q) && (oneWay(A, B) || oneWay(B, A)));
    const seen = new Set([[P, Q].sort().join()]);
    const decoys = [];
    for (const d of [...telling, ...decoyPairs]) {
      const k = [...d].sort().join();
      if (seen.has(k) || decoys.length >= 3) continue;
      seen.add(k);
      decoys.push(d);
    }
    if (decoys.length < 3) continue;
    const whyFalse = ([A, B]) => {
      const f = cxOf(dom.reps, { A: L(A), B: L(B) })[0] ?? cxOf(dom.reps, { A: L(B), B: L(A) })[0];
      const dir = cxOf(dom.reps, { A: L(A), B: L(B) }).length ? [A, B] : [B, A];
      return `${cap(f.name)} ${dom.props[dir[0]].is}, but it does not satisfy "${dom.props[dir[1]].is}", so one direction is false.`;
    };
    return q({
      prompt: `A good definition can be written as a true biconditional. Which biconditional is true?${noteFor(dom, [P, Q, ...decoys.flat()])}`,
      correct: bicond(dom, P, Q),
      wrong: decoys.map((d) => ({ value: bicond(dom, d[0], d[1]), why: whyFalse(d) })),
      solution: [`A biconditional "p if and only if q" is true only when "if p, then q" and "if q, then p" are both true.`, `${cap(`if a ${dom.noun} ${dom.props[P].is}, then it ${dom.props[Q].is}`)}, and the converse is also true: no ${dom.noun} has one property without the other.`, `Each of the other choices fails in one direction. For example: ${whyFalse(decoys[0])}`, `So the true biconditional is: ${bicond(dom, P, Q)}`],
      rule: 2,
      skill: 'biconditionals',
      check: () => {
        const both2 = (A, B) => [[{ A: L(A), B: L(B) }, true], [{ A: L(B), B: L(A) }, true]];
        const d = dataCheck(dom, both2(P, Q));
        if (d !== true) return d;
        const reps2 = dom.reps2();
        for (const [A, B] of decoys) if (truth(reps2, { A: L(A), B: L(B) }) && truth(reps2, { A: L(B), B: L(A) })) return `decoy ${A} ⇔ ${B} is true`;
        return true;
      },
    });
  }
}

// Geometric proofs. Each step is { st, why, wr: wrong reasons, ws: wrong statements, ok: check }.
const VERT_OF = { 1: 4, 4: 1, 2: 3, 3: 2, 5: 8, 8: 5, 6: 7, 7: 6 };
const corrOf = (p) => (p <= 4 ? p + 4 : p - 4);
const sameClass = (p, r) => [2, 3, 6, 7].includes(p) === [2, 3, 6, 7].includes(r);
const nbOf = (p) => (p <= 4 ? [1, 2, 3, 4] : [5, 6, 7, 8]).filter((k) => k !== p && k !== VERT_OF[p]);
const cong = (a, b) => R`\(\angle ${a} \cong \angle ${b}\)`;
const STRAIGHT = R`Angles that form a straight angle add to \(180^\circ\)`;
const T = {
  given: 'Given', lin: 'Angles in a linear pair are supplementary', vert: 'Vertical angles are congruent', corr: 'Corresponding angles of parallel lines are congruent',
  alt: 'Alternate interior angles of parallel lines are congruent', ssi: 'Same-side interior angles of parallel lines are supplementary', convCorr: 'If corresponding angles are congruent, then the lines are parallel',
  subst: 'Substitution property', sub: 'Subtraction property of equality', add: 'Addition property of equality', div: 'Division property of equality', refl: 'Reflexive property', sym: 'Symmetric property',
  trans: 'Transitive property of congruence', defCong: 'Definition of congruent angles', comp: 'Definition of complementary angles', dist: 'Distributive property',
  sum: 'Triangle angle sum theorem', base: 'Base angles of an isosceles triangle are congruent', baseConv: 'If two angles of a triangle are congruent, the sides opposite them are congruent',
  suppCong: 'Supplements of congruent angles are congruent', suppSame: 'Supplements of the same angle are congruent', defPara: 'Definition of parallelogram', oppSides: 'Opposite sides of a parallelogram are congruent',
  ASA: 'ASA', SSS: 'SSS', SAS: 'SAS', HL: 'HL', CPCTC: 'CPCTC', mid: 'Definition of midpoint', straight: STRAIGHT,
};
const EXPLAIN = {
  [T.given]: 'It is part of the given information.',
  [T.lin]: 'The two angles are side by side and their outer rays form a line, so they are a linear pair and add to 180°.',
  [T.vert]: 'The two angles are opposite each other where two lines cross, so they are vertical angles.',
  [T.alt]: 'The angles lie between two parallel lines on opposite sides of a transversal, so they are alternate interior angles.',
  [T.ssi]: 'Each pair of angles lies between two parallel sides, on the same side of the side that crosses them, so they are same-side interior angles.',
  [T.convCorr]: 'The previous step shows a pair of corresponding angles is congruent. The converse of the corresponding angles postulate then makes the lines parallel. (The postulate itself cannot be used: it assumes the lines are already parallel.)',
  [T.subst]: 'An equal quantity from an earlier step replaces one in another equation.',
  [T.sub]: 'The same quantity is subtracted from both sides of the equation in the step before.',
  [T.trans]: 'The two angles are each congruent to the same angle, so they are congruent to each other.',
  [T.defCong]: 'Angles with equal measures are congruent by definition.',
  [T.straight]: 'The three angles at B fit together along line ℓ, which is a straight angle of 180°.',
  [T.sum]: 'The three angles of a triangle add to 180°.',
  [T.base]: 'The triangle has two congruent sides, so the angles opposite them are congruent.',
  [T.suppCong]: 'The two angles are supplements of two angles already known to be congruent.',
  [T.suppSame]: 'Angles A and C are both supplements of angle B.',
  [T.defPara]: 'By definition, a parallelogram has both pairs of opposite sides parallel.',
  [T.oppSides]: 'This is a theorem about every parallelogram.',
  [T.ASA]: 'Two pairs of angles and the sides between them are congruent.',
  [T.CPCTC]: 'The triangles are congruent, so their corresponding parts are congruent.',
};

function vertProof() {
  const statements = { s2: R`\(m\angle 1 + m\angle 2 = 180^\circ\) and \(m\angle 2 + m\angle 3 = 180^\circ\)`, s4: R`\(m\angle 1 = m\angle 3\)` };
  const m = { 1: 115, 2: 65, 3: 115 };
  return {
    given: R`\(\angle 1\) and \(\angle 2\) form a linear pair, and \(\angle 2\) and \(\angle 3\) form a linear pair`,
    prove: R`\(\angle 1 \cong \angle 3\)`,
    visual: { type: 'angle', lines: true, rays: [25, 140], arcs: [{ from: 25, to: 140, label: '1' }, { from: 140, to: 205, label: '2' }, { from: 205, to: 320, label: '3' }], alt: 'Two lines cross. Angle 1 is at the top, angle 2 is on the left beside it, and angle 3 is at the bottom, opposite angle 1. Angle 2 forms a linear pair with angle 1 and with angle 3.' },
    steps: [
      { st: R`\(\angle 1\) and \(\angle 2\) form a linear pair; \(\angle 2\) and \(\angle 3\) form a linear pair`, why: T.given },
      { st: statements.s2, why: T.lin, wr: [T.vert, T.comp, T.trans], ws: [[R`\(m\angle 1 = m\angle 2\) and \(m\angle 2 = m\angle 3\)`, () => m[1] === m[2]], [R`\(m\angle 1 + m\angle 2 = 90^\circ\) and \(m\angle 2 + m\angle 3 = 90^\circ\)`, () => m[1] + m[2] === 90], [R`\(m\angle 1 + m\angle 3 = 180^\circ\)`, () => m[1] + m[3] === 180]], ok: () => m[1] + m[2] === 180 && m[2] + m[3] === 180 },
      { st: R`\(m\angle 1 + m\angle 2 = m\angle 2 + m\angle 3\)`, why: T.subst, wr: [T.refl, T.vert, T.dist] },
      { st: statements.s4, why: T.sub, wr: [T.add, T.div, T.sym], ws: [[R`\(m\angle 1 = m\angle 2\)`, () => m[1] === m[2]], [R`\(m\angle 2 = m\angle 3\)`, () => m[2] === m[3]], [R`\(m\angle 1 + m\angle 3 = 180^\circ\)`, () => m[1] + m[3] === 180]], ok: () => m[1] === m[3] },
      { st: R`\(\angle 1 \cong \angle 3\)`, why: T.defCong, wr: [T.refl, T.lin, T.corr] },
    ],
  };
}

function parallelProof(rng) {
  const [o1, o2] = rng.shuffle(rng.pick([[3, 6], [4, 5], [1, 8], [2, 7]]));
  const mid = VERT_OF[o1];
  const kind = [3, 4, 5, 6].includes(o1) ? 'alternate interior' : 'alternate exterior';
  const [n1, n2] = nbOf(o1);
  const [n3, n4] = nbOf(o2);
  const diff = (a, b) => () => sameClass(a, b);
  return {
    given: R`line \(m\) (top) and line \(n\) (bottom) are cut by a transversal, and \(\angle ${o1} \cong \angle ${o2}\)`,
    prove: R`\(m \parallel n\)`,
    visual: { type: 'transversal', parallelMarks: false, labels: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8' }, alt: `Line m on top and line n below, cut by a transversal; they are not marked parallel. Angles 1 to 4 are at the top crossing: 1 upper left, 2 upper right, 3 lower left, 4 lower right. Angles 5 to 8 are at the bottom crossing in the same pattern. Angles ${o1} and ${o2} are ${kind} angles.` },
    steps: [
      { st: cong(o1, o2), why: T.given },
      { st: cong(mid, o1), why: T.vert, wr: [T.corr, T.lin, T.refl], ws: [[cong(o1, n1), diff(o1, n1)], [cong(o1, n2), diff(o1, n2)], [cong(mid, nbOf(mid)[0]), diff(mid, nbOf(mid)[0])]], ok: () => VERT_OF[mid] === o1 },
      { st: cong(mid, o2), why: T.trans, wr: [T.vert, T.corr, T.refl], ws: [[cong(mid, n3), diff(mid, n3)], [cong(mid, n4), diff(mid, n4)], [cong(o1, nbOf(mid)[1]), diff(o1, nbOf(mid)[1])]], ok: () => corrOf(mid) === o2 && sameClass(mid, o2) },
      { st: R`\(m \parallel n\)`, why: T.convCorr, wr: [T.corr, T.vert, T.trans] },
    ],
  };
}

const TA = [0, 0];
const TC = [8, 0];
const TB = [3, 4];
const LL = [-1.5, 4];
const LR = [10, 4];
function sumProof() {
  const a1 = angleAt(LL, TB, TA);
  const a2 = angleAt(TA, TB, TC);
  const a3 = angleAt(TC, TB, LR);
  const A = angleAt(TB, TA, TC);
  const C = angleAt(TB, TC, TA);
  return {
    given: R`\(\triangle ABC\), with line \(\ell\) through \(B\) parallel to \(\overline{AC}\)`,
    prove: R`\(m\angle A + m\angle 2 + m\angle C = 180^\circ\)`,
    visual: { type: 'polygon', points: [TA, TC, TB], vertices: ['A', 'C', 'B'], extra: [{ from: LL, to: TB, dashed: false }, { from: TB, to: LR, dashed: false }, { from: [8.5, 4], to: LR, dashed: false, label: 'ℓ' }, ...angleMark(LL, TB, TA, 0.9, '1'), ...angleMark(TA, TB, TC, 1.1, '2'), ...angleMark(TC, TB, LR, 0.9, '3')], alt: 'Triangle ABC with A at the bottom left, C at the bottom right and B at the top. Line ℓ passes through B parallel to AC. At B, angle 1 is between ℓ and BA, angle 2 is the angle of the triangle, and angle 3 is between BC and ℓ.' },
    steps: [
      { st: R`\(\ell \parallel \overline{AC}\)`, why: T.given },
      { st: R`\(m\angle 1 + m\angle 2 + m\angle 3 = 180^\circ\)`, why: T.straight, wr: [T.vert, T.alt, T.comp], ws: [[R`\(m\angle 1 + m\angle 2 + m\angle 3 = 360^\circ\)`, () => near(a1 + a2 + a3, 360)], [R`\(m\angle 1 + m\angle 3 = 180^\circ\)`, () => near(a1 + a3, 180)], [R`\(m\angle 1 + m\angle 2 + m\angle 3 = 90^\circ\)`, () => near(a1 + a2 + a3, 90)]], ok: () => near(a1 + a2 + a3, 180) },
      { st: R`\(\angle 1 \cong \angle A\) and \(\angle 3 \cong \angle C\)`, why: T.alt, wr: [T.corr, T.vert, T.base], ws: [[R`\(\angle 1 \cong \angle C\) and \(\angle 3 \cong \angle A\)`, () => near(a1, C)], [R`\(\angle 1 \cong \angle 3\)`, () => near(a1, a3)], [R`\(\angle 2 \cong \angle A\) and \(\angle 2 \cong \angle C\)`, () => near(a2, A)]], ok: () => near(a1, A) && near(a3, C) },
      { st: R`\(m\angle A + m\angle 2 + m\angle C = 180^\circ\)`, why: T.subst, wr: [T.refl, T.lin, T.sub] },
    ],
  };
}

const EB = [0, 0];
const EC = [6, 0];
const EA = [2, 4];
const ED = [9, 0];
function exteriorProof() {
  const A = angleAt(EB, EA, EC);
  const B = angleAt(EA, EB, EC);
  const ACB = angleAt(EA, EC, EB);
  const ACD = angleAt(EA, EC, ED);
  return {
    given: R`\(\triangle ABC\), with \(\overline{BC}\) extended to \(D\)`,
    prove: R`\(m\angle ACD = m\angle A + m\angle B\)`,
    visual: { type: 'polygon', points: [EB, EC, EA], vertices: ['B', '', 'A'], extra: [{ from: EC, to: ED, dashed: false }, labelAt(EC, EB, 'C', 'left'), labelAt(ED, EC, 'D', 'left'), ...angleMark(ED, EC, EA, 0.8)], alt: 'Triangle ABC with B at the bottom left, C at the bottom right and A at the top. Side BC is extended to the right past C to point D. The exterior angle ACD is marked.' },
    steps: [
      { st: R`\(m\angle A + m\angle B + m\angle ACB = 180^\circ\)`, why: T.sum, wr: [T.lin, T.vert, T.alt], ws: [[R`\(m\angle A + m\angle B + m\angle ACB = 360^\circ\)`, () => near(A + B + ACB, 360)], [R`\(m\angle A + m\angle B = 180^\circ\)`, () => near(A + B, 180)], [R`\(m\angle A + m\angle B + m\angle ACD = 180^\circ\)`, () => near(A + B + ACD, 180)]], ok: () => near(A + B + ACB, 180) },
      { st: R`\(m\angle ACB + m\angle ACD = 180^\circ\)`, why: T.lin, wr: [T.sum, T.vert, T.comp], ws: [[R`\(m\angle ACB = m\angle ACD\)`, () => near(ACB, ACD)], [R`\(m\angle ACB + m\angle ACD = 90^\circ\)`, () => near(ACB + ACD, 90)], [R`\(m\angle A + m\angle ACD = 180^\circ\)`, () => near(A + ACD, 180)]], ok: () => near(ACB + ACD, 180) },
      { st: R`\(m\angle A + m\angle B + m\angle ACB = m\angle ACB + m\angle ACD\)`, why: T.subst, wr: [T.refl, T.sum, T.add] },
      { st: R`\(m\angle A + m\angle B = m\angle ACD\)`, why: T.sub, wr: [T.add, T.div, T.lin], ws: [[R`\(m\angle A + m\angle B = 180^\circ\)`, () => near(A + B, 180)], [R`\(m\angle A = m\angle B\)`, () => near(A, B)], [R`\(m\angle ACB = m\angle ACD\)`, () => near(ACB, ACD)]], ok: () => near(A + B, ACD) },
    ],
  };
}

const IB = [0, 0];
const IC = [6, 0];
const IA = [3, 4.5];
function isoProof() {
  const base = angleAt(IA, IB, IC);
  const apex = angleAt(IB, IA, IC);
  const e1 = angleAt([-3, 0], IB, IA);
  return {
    given: R`\(\overline{AB} \cong \overline{AC}\), with \(\overline{BC}\) extended past \(B\) and past \(C\)`,
    prove: R`\(\angle 1 \cong \angle 2\)`,
    visual: { type: 'polygon', points: [IB, IC, IA], vertices: ['B', 'C', 'A'], marks: [0, 1, 1], extra: [{ from: [-3, 0], to: IB, dashed: false }, { from: IC, to: [9, 0], dashed: false }, ...angleMark([-3, 0], IB, IA, 0.8, '1'), ...angleMark([9, 0], IC, IA, 0.8, '2')], alt: 'Triangle ABC with A at the top. Sides AB and AC have matching tick marks. The base BC is extended both ways. Angle 1 is the exterior angle at B and angle 2 is the exterior angle at C.' },
    steps: [
      { st: R`\(\overline{AB} \cong \overline{AC}\)`, why: T.given },
      { st: R`\(\angle ABC \cong \angle ACB\)`, why: T.base, wr: [T.baseConv, T.vert, T.refl], ws: [[R`\(\angle BAC \cong \angle ABC\)`, () => near(apex, base)], [R`\(\overline{AB} \cong \overline{BC}\)`, () => near(dist(IA, IB), dist(IB, IC))], [R`\(\angle 1 \cong \angle ABC\)`, () => near(e1, base)]], ok: () => near(base, angleAt(IA, IC, IB)) },
      { st: R`\(\angle 1\) and \(\angle ABC\) are supplementary; \(\angle 2\) and \(\angle ACB\) are supplementary`, why: T.lin, wr: [T.base, T.vert, T.comp] },
      { st: R`\(\angle 1 \cong \angle 2\)`, why: T.suppCong, wr: [T.vert, T.base, T.refl] },
    ],
  };
}

const PA = [0, 0];
const PB = [6, 0];
const PC = [8, 3.5];
const PD = [2, 3.5];
const PE = [4, 1.75];
const PGRAM_ALT = 'Parallelogram ABCD with A at the bottom left, B at the bottom right, C at the top right and D at the top left.';
function oppAnglesProof() {
  const A = angleAt(PD, PA, PB);
  const B = angleAt(PA, PB, PC);
  const C = angleAt(PB, PC, PD);
  return {
    given: R`\(ABCD\) is a parallelogram`,
    prove: R`\(\angle A \cong \angle C\)`,
    visual: { type: 'polygon', points: [PA, PB, PC, PD], vertices: ['A', 'B', 'C', 'D'], alt: PGRAM_ALT },
    steps: [
      { st: R`\(ABCD\) is a parallelogram`, why: T.given },
      { st: R`\(\overline{AB} \parallel \overline{DC}\) and \(\overline{AD} \parallel \overline{BC}\)`, why: T.defPara, wr: [T.oppSides, T.refl, T.alt] },
      { st: R`\(\angle A\) and \(\angle B\) are supplementary; \(\angle B\) and \(\angle C\) are supplementary`, why: T.ssi, wr: [T.lin, T.alt, T.vert], ws: [[R`\(\angle A \cong \angle B\) and \(\angle B \cong \angle C\)`, () => near(A, B)], [R`\(\angle A\) and \(\angle C\) are supplementary`, () => near(A + C, 180)], [R`\(\angle A\) and \(\angle B\) are complementary`, () => near(A + B, 90)]], ok: () => near(A + B, 180) && near(B + C, 180) },
      { st: R`\(\angle A \cong \angle C\)`, why: T.suppSame, wr: [T.vert, T.defPara, T.alt] },
    ],
  };
}

function diagonalsProof() {
  const g = (p, v, r) => angleAt(p, v, r);
  const BAE = g(PB, PA, PE);
  const ABE = g(PA, PB, PE);
  const DCE = g(PD, PC, PE);
  const CDE = g(PC, PD, PE);
  const AEB = g(PA, PE, PB);
  const AE = dist(PA, PE);
  const BE = dist(PB, PE);
  const CE = dist(PC, PE);
  const DE = dist(PD, PE);
  return {
    given: R`\(ABCD\) is a parallelogram, and its diagonals meet at \(E\)`,
    prove: R`\(\overline{AE} \cong \overline{CE}\) and \(\overline{BE} \cong \overline{DE}\)`,
    visual: { type: 'polygon', points: [PA, PB, PC, PD], vertices: ['A', 'B', 'C', 'D'], extra: [{ from: PA, to: PC, dashed: false }, { from: PB, to: PD, dashed: false }, labelAt(PE, PB, 'E', 'right')], alt: `${PGRAM_ALT} Diagonals AC and BD are drawn and cross at E, making triangles ABE and CDE.` },
    steps: [
      { st: R`\(ABCD\) is a parallelogram`, why: T.given },
      { st: R`\(\overline{AB} \parallel \overline{DC}\)`, why: T.defPara, wr: [T.oppSides, T.refl, T.CPCTC] },
      { st: R`\(\angle BAE \cong \angle DCE\) and \(\angle ABE \cong \angle CDE\)`, why: T.alt, wr: [T.vert, T.corr, T.base], ws: [[R`\(\angle BAE \cong \angle ABE\) and \(\angle DCE \cong \angle CDE\)`, () => near(BAE, ABE)], [R`\(\angle BAE \cong \angle CDE\) and \(\angle ABE \cong \angle DCE\)`, () => near(BAE, CDE)], [R`\(\angle AEB \cong \angle BAE\)`, () => near(AEB, BAE)]], ok: () => near(BAE, DCE) && near(ABE, CDE) },
      { st: R`\(\overline{AB} \cong \overline{CD}\)`, why: T.oppSides, wr: [T.defPara, T.refl, T.CPCTC] },
      { st: R`\(\triangle ABE \cong \triangle CDE\)`, why: T.ASA, wr: [T.SSS, T.SAS, T.HL] },
      { st: R`\(\overline{AE} \cong \overline{CE}\) and \(\overline{BE} \cong \overline{DE}\)`, why: T.CPCTC, wr: [T.mid, T.refl, T.ASA], ws: [[R`\(\overline{AE} \cong \overline{BE}\) and \(\overline{CE} \cong \overline{DE}\)`, () => near(AE, BE)], [R`\(\overline{AE} \cong \overline{DE}\) and \(\overline{BE} \cong \overline{CE}\)`, () => near(AE, DE)], [R`\(\overline{AB} \cong \overline{AE}\)`, () => near(dist(PA, PB), AE)]], ok: () => near(AE, CE) && near(BE, DE) },
    ],
  };
}

const GEO_PROOFS = [vertProof, parallelProof, sumProof, exteriorProof, isoProof, oppAnglesProof, diagonalsProof];

const proofCheck = (pf) => () => {
  for (const s of pf.steps) {
    if (s.ok && !s.ok()) return `step ${s.st} is false in the figure`;
    for (const [tex, f] of s.ws ?? []) if (f()) return `wrong statement ${tex} is true in the figure`;
    if ((s.wr ?? []).includes(s.why)) return 'a wrong reason equals the right one';
  }
  return true;
};

const proofTable = (pf, missing, mode, swapped) => ({
  type: 'table',
  headers: ['Statement', 'Reason'],
  rows: pf.steps.map((s, i) => [mode === 'statement' && i === missing ? `${i + 1}. ?` : `${i + 1}. ${s.st}`, mode === 'reason' && i === missing ? '?' : i === swapped?.at ? swapped.why : s.why]),
  caption: mode === 'error' ? 'A proof with one wrong reason' : `The proof, with one ${mode} missing`,
});

const RULE_OF = (why) => (Object.values(PROPS).includes(why) || [T.subst, T.sub, T.trans, T.refl, T.add].includes(why) ? 4 : 5);

function hardProofStep(rng) {
  const pf = rng.pick(GEO_PROOFS)(rng);
  const asks = pf.steps.flatMap((s, i) => [...(s.wr ? [[i, 'reason']] : []), ...(s.ws ? [[i, 'statement']] : [])]);
  const [i, mode] = rng.pick(asks);
  const s = pf.steps[i];
  const isReason = mode === 'reason';
  return q({
    prompt: `**Given:** ${pf.given}. **Prove:** ${pf.prove}.\nWhich ${mode} belongs in place of the "?" in step ${i + 1}?`,
    visual: [pf.visual, proofTable(pf, i, mode)],
    correct: isReason ? s.why : s.st,
    wrong: isReason ? s.wr.map((w, k) => (k === 0 && (w === T.corr || w === T.baseConv) ? { value: w, why: w === T.corr ? 'That fact needs the lines to be parallel already. Here parallel lines are what is being proved, so the converse is the reason.' : 'That is the converse of the fact needed. The sides are known; the angles are what follow.' } : w)) : s.ws.map(([tex]) => tex),
    solution: isReason ? [`Step ${i + 1} says ${s.st}.`, EXPLAIN[s.why] ?? PROP_WHY.subst, `The reason is: ${s.why}.`] : [`Step ${i + 1} is justified by: ${s.why}.`, EXPLAIN[s.why] ?? PROP_WHY.subst, `So the missing statement is ${s.st}.`],
    rule: RULE_OF(s.why),
    skill: isReason ? 'reasons in a proof' : 'statements in a proof',
    check: proofCheck(pf),
  });
}

// ───────────── Challenge ─────────────

const STORIES = [
  (n) => ({ e: ['the forecast calls for storms', 'the forecast does not call for storms'], a: ['the class trip is postponed', 'the class trip is not postponed'], b: ['the museum visit moves to Friday', 'the museum visit does not move to Friday'], c: ['the history quiz moves to Monday', 'the history quiz does not move to Monday'], who: n }),
  (n, m) => ({ e: [`${n} sprains an ankle`, `${n} does not sprain an ankle`], a: [`${n} misses Saturday's game`, `${n} does not miss Saturday's game`], b: ['the team needs a substitute', 'the team does not need a substitute'], c: [`the coach calls ${m}`, `the coach does not call ${m}`] }),
  (n) => ({ e: ['the oven breaks', 'the oven does not break'], a: ['the bakery runs out of bread', 'the bakery does not run out of bread'], b: ['the café changes its lunch menu', 'the café does not change its lunch menu'], c: [`${n} orders soup`, `${n} does not order soup`] }),
  (n) => ({ e: ['the bridge is closed', 'the bridge is not closed'], a: ['the bus takes the long route', 'the bus does not take the long route'], b: ['the bus arrives late', 'the bus does not arrive late'], c: [`${n} misses the start of first period`, `${n} does not miss the start of first period`] }),
  (n) => ({ e: ['the power goes out', 'the power does not go out'], a: ['the robotics meeting is cancelled', 'the robotics meeting is not cancelled'], b: ['the team skips the test run', 'the team does not skip the test run'], c: [`${n} rewrites the code on Sunday`, `${n} does not rewrite the code on Sunday`] }),
];

function challengeChain(rng) {
  const [n, m] = people(rng, 2);
  const S = rng.pick(STORIES)(n, m);
  const atoms = ['e', 'a', 'b', 'c'];
  const txt = (l) => S[l.p][l.neg ? 1 : 0];
  const premises = [{ A: L('e'), B: L('a') }, { A: L('a'), B: L('b') }, { A: L('b'), B: L('c') }];
  const flip = rng.int(0, 2); // one premise is written as its contrapositive
  const shown = premises.map((s, i) => (i === flip ? { A: notL(s.B), B: notL(s.A) } : s));
  const order = rng.shuffle([0, 1, 2]);
  const forward = rng.bool();
  const fact = forward ? L('a') : L('b', true);
  const correct = forward ? L('c') : L('e', true);
  const num0 = (k) => order.indexOf(k) + 1; // the number premise k is shown under
  const as = (k) => `statement ${num0(k)}${k === flip ? ', written as its contrapositive' : ''}`;
  const wrongs = forward
    ? [{ l: L('e'), why: `Statement ${num0(0)} links these two, but it does not work backwards: knowing that ${txt(L('a'))} says nothing about whether ${txt(L('e'))}.` }, { l: L('e', true) }, { l: L('c', true) }]
    : [{ l: L('c', true), why: `Statement ${num0(2)} links these two, but it says nothing once ${txt(L('b', true))}.` }, { l: L('c') }, { l: L('e') }];
  const sentence = (l) => `${cap(txt(l))}.`;
  return q({
    prompt: `Assume all of these statements are true.\n${order.map((k, j) => `${j + 1}. If ${txt(shown[k].A)}, then ${txt(shown[k].B)}.`).join('\n')}\n**Fact:** ${sentence(fact)}\nWhich conclusion must be true?`,
    correct: sentence(correct),
    wrong: wrongs.map((w) => (w.why ? { value: sentence(w.l), why: w.why } : sentence(w.l))),
    solution: forward
      ? [`Start from the fact: ${txt(L('a'))}.`, `By ${as(1)} ("if ${txt(L('a'))}, then ${txt(L('b'))}"), ${txt(L('b'))} (law of detachment).`, `By ${as(2)}, ${txt(L('c'))}.`, `Statement ${num0(0)} cannot be used backwards, so nothing tells us whether ${txt(L('e'))}. The conclusion that must be true: ${sentence(correct)}`]
      : [`Start from the fact: ${txt(L('b', true))}.`, `By ${as(1)} ("if ${txt(L('a'))}, then ${txt(L('b'))}"), the conclusion is false, so the hypothesis is false: ${txt(L('a', true))}.`, `By ${as(0)} ("if ${txt(L('e'))}, then ${txt(L('a'))}") in the same way: ${txt(L('e', true))}.`, `Statement ${num0(2)} says nothing when ${txt(L('b', true))}, so nothing tells us whether ${txt(L('c'))}. The conclusion that must be true: ${sentence(correct)}`],
    rule: 3,
    skill: 'chains of reasoning',
    check: () => {
      if (!entails(atoms, shown, [fact], correct)) return 'correct conclusion does not follow';
      for (const w of wrongs) if (entails(atoms, shown, [fact], w.l)) return `wrong conclusion ${txt(w.l)} follows`;
      return true;
    },
  });
}

function challengeSpotError(rng) {
  const geo = rng.bool(0.65);
  const pf = geo ? rng.pick(GEO_PROOFS)(rng) : null;
  const alg = geo ? null : algebraProof(rng, ['dist', 'both']);
  const steps = geo ? pf.steps : alg.rows.map((r) => ({ st: R`\(${r.tex}\)`, why: r.why, wr: r.key ? algebraWrongReasons(r.key).map((k) => PROPS[k]) : null, key: r.key }));
  const candidates = steps.map((s, i) => (s.wr ? i : -1)).filter((i) => i >= 0);
  const at = rng.pick(candidates);
  const bad = rng.pick(steps[at].wr);
  const others = rng.shuffle(steps.map((_, i) => i).filter((i) => i !== at)).slice(0, 3);
  const table = {
    type: 'table',
    headers: ['Statement', 'Reason'],
    rows: steps.map((s, i) => [`${i + 1}. ${s.st}`, i === at ? bad : s.why]),
    caption: 'A proof with one wrong reason',
  };
  const fix = geo ? EXPLAIN[steps[at].why] ?? PROP_WHY.subst : stepWhy(alg, at);
  return q({
    prompt: geo ? `**Given:** ${pf.given}. **Prove:** ${pf.prove}.\nOne reason in this proof is wrong. Which step has the wrong reason?` : R`This proof solves \(${alg.eq}\). One reason in it is wrong. Which step has the wrong reason?`,
    visual: geo ? [pf.visual, table] : table,
    correct: `Step ${at + 1}`,
    wrong: others.map((i) => `Step ${i + 1}`),
    solution: [`Step ${at + 1} gives the reason "${bad}", which does not justify ${steps[at].st}.`, fix, `The correct reason for step ${at + 1} is: ${steps[at].why}.`],
    rule: geo ? RULE_OF(steps[at].why) : 4,
    skill: 'spot the error in a proof',
    check: geo ? proofCheck(pf) : algebraCheck(alg),
  });
}

function challengeAlgebraStatement(rng) {
  for (;;) {
    const pf = algebraProof(rng);
    const i = rng.int(1, pf.rows.length - 1);
    const r = pf.rows[i];
    if (r.slips.length < 3) continue;
    return q({
      prompt: R`This proof solves \(${pf.eq}\). Which statement belongs in place of the "?" in step ${i + 1}?`,
      visual: algebraTable(pf, i, 'statement'),
      correct: R`\(${r.tex}\)`,
      wrong: r.slips.map((s) => R`\(${s.tex}\)`),
      solution: [`The reason for step ${i + 1} is the ${r.why.toLowerCase()}. ${PROP_WHY[r.key]}`, `Apply it to step ${i}, \\(${pf.rows[i - 1].tex}\\): the result is \\(${r.tex}\\).`, `Check: \\(x = ${pf.x}\\) satisfies the original equation, \\(${pf.eq}\\), and step ${i + 1}.`],
      rule: 4,
      skill: 'algebraic proof',
      check: algebraCheck(pf),
    });
  }
}

function challengePattern(rng) {
  const name = person(rng);
  const kind = rng.pick(['poly', 'poly', 'primes', 'odd', 'square', 'circle']);
  if (kind === 'poly') {
    const c = rng.pick([5, 11, 17, 41]);
    const s = rng.pick([1, -1]);
    const f = (n) => n * n + s * n + c;
    let first = 1;
    while (isPrime(f(first))) first++;
    const shown = range(1, Math.min(4, first - 1));
    const tex = s > 0 ? `n^2 + n + ${c}` : `n^2 - n + ${c}`;
    return q({
      prompt: R`${name} works out \(${tex}\) for \(n = ${shown.join(', ')}\) and gets \(${shown.map(f).join(', ')}\), all prime. ${name} conjectures that \(${tex}\) is prime for every positive integer \(n\). What is the smallest positive integer \(n\) that is a counterexample?`,
      correct: first,
      fmt: (v) => R`\(n = ${v}\)`,
      wrong: [{ value: first - 1, why: R`At that value the expression is prime, so it fits the conjecture.` }, c === first ? null : { value: c, why: R`That value is a counterexample, but a smaller one exists.` }, first + 1, shown.length + 1 === first ? null : shown.length + 1, 2 * first],
      solution: [R`Inductive reasoning from a few cases can lead to a false conjecture. Keep testing values of \(n\).`, R`For \(n = 1\) to \(${first - 1}\) the values are all prime.`, R`For \(n = ${first}\): \(${f(first)} = ${smallestFactor(f(first))} \cdot ${f(first) / smallestFactor(f(first))}\), which is not prime.`, R`So the smallest counterexample is \(n = ${first}\).`],
      rule: 3,
      skill: 'a pattern that breaks',
      check: () => (range(1, first - 1).every((k) => isPrime(f(k))) && f(first) % smallestFactor(f(first)) === 0 && smallestFactor(f(first)) < f(first) ? true : 'first counterexample is wrong'),
    });
  }
  if (kind === 'primes') {
    const odd = [3, 5, 7, 11, 13, 17, 19, 23];
    const p = rng.pick(odd);
    const pairs = [];
    while (pairs.length < 2) {
      const [x, y] = rng.sample(odd, 2).sort((u, v) => u - v);
      if (!pairs.some(([u, v]) => u + v === x + y) && x + y !== 2 + p) pairs.push([x, y]);
    }
    const show = (x, y) => `${x} and ${y}`;
    return q({
      prompt: R`${name} notices that \(3 + 5 = 8\), \(5 + 7 = 12\) and \(7 + 11 = 18\), and conjectures that the sum of any two prime numbers is even. Which pair of primes is a counterexample?`,
      correct: show(2, p),
      wrong: [{ value: show(...pairs[0]), why: 'Both are odd primes, and the sum of two odd numbers is even, so this pair fits the conjecture.' }, show(...pairs[1]), { value: show(2, 2), why: R`\(2 + 2 = 4\) is even, so this pair fits the conjecture.` }],
      solution: ['Every prime except 2 is odd, and the sum of two odd numbers is even.', R`So a counterexample must use the even prime 2 with an odd prime: \(2 + ${p} = ${2 + p}\), which is odd.`, `The pair ${show(2, p)} is a counterexample.`],
      rule: 3,
      skill: 'a pattern that breaks',
      check: () => (isPrime(p) && (2 + p) % 2 === 1 && pairs.every(([x, y]) => isPrime(x) && isPrime(y) && (x + y) % 2 === 0) ? true : 'pairs are wrong'),
    });
  }
  if (kind === 'odd') {
    const composite = rng.pick([9, 15, 21, 25, 27, 33, 35, 39, 45, 49]);
    const primes = rng.sample([3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41], 2);
    const even = rng.pick([4, 6, 8, 10, 12, 14, 16]);
    return q({
      prompt: R`${name} checks \(3\), \(5\) and \(7\) and conjectures that every odd number greater than \(1\) is prime. Which number is a counterexample?`,
      correct: composite,
      wrong: [{ value: even, why: 'That number is not odd, so the conjecture says nothing about it.' }, { value: primes[0], why: 'That number is odd and prime, so it fits the conjecture.' }, primes[1]],
      solution: ['A counterexample must be odd, greater than 1, and not prime.', R`\(${composite} = ${smallestFactor(composite)} \cdot ${composite / smallestFactor(composite)}\), so it is odd and not prime.`, R`So \(${composite}\) is a counterexample.`],
      rule: 3,
      skill: 'a pattern that breaks',
      check: () => (composite % 2 === 1 && !isPrime(composite) && even % 2 === 0 && primes.every(isPrime) ? true : 'choices are wrong'),
    });
  }
  if (kind === 'square') {
    const cx = rng.pick([1, 0, frac(1, 2), frac(1, 3), frac(2, 3)]);
    const v = typeof cx === 'number' ? cx : cx.value;
    const wrongs = rng.sample([2, 3, 5, -1, -3, frac(3, 2)], 3);
    return q({
      prompt: R`${name} tries \(2\), \(3\) and \(10\) and conjectures that the square of any number is greater than the number. Which value of \(x\) is a counterexample?`,
      correct: cx,
      fmt: (u) => R`\(x = ${num(u)}\)`,
      wrong: wrongs.map((w) => (typeof w === 'number' && w < 0 ? { value: w, why: R`The square of a negative number is positive, so it is greater than the number.` } : w)),
      solution: [R`A counterexample is a number with \(x^2 \le x\).`, R`For \(x = ${num(cx)}\): \(x^2 = ${num(typeof cx === 'number' ? cx * cx : cx.mul(cx))}\), which is not greater than \(${num(cx)}\).`, R`So \(x = ${num(cx)}\) is a counterexample.`],
      rule: 3,
      skill: 'a pattern that breaks',
      check: () => (v * v <= v && wrongs.every((w) => { const u = typeof w === 'number' ? w : w.value; return u * u > u; }) ? true : 'counterexample is wrong'),
    });
  }
  const pts = rng.pick([6, 7]);
  const regions = (n) => choose(n, 4) + choose(n, 2) + 1;
  return q({
    prompt: R`${name} marks points on a circle and joins every pair with a chord, placing the points so that no three chords meet at one point. With \(1, 2, 3, 4, 5\) points the circle is cut into \(1, 2, 4, 8, 16\) regions. ${name} conjectures that the number doubles each time. How many regions are there with ${pts} points?`,
    correct: regions(pts),
    wrong: [{ value: 2 ** (pts - 1), why: 'That continues the doubling pattern, but the pattern breaks at 6 points.' }, regions(pts) + 1, regions(pts) - 1],
    solution: ['Five cases fit the doubling pattern, but a pattern is only a conjecture until it is proved.', R`Counting carefully (or using the formula \(\binom{n}{4} + \binom{n}{2} + 1\)): ${pts} points give \(${choose(pts, 4)} + ${choose(pts, 2)} + 1 = ${regions(pts)}\) regions.`, `So there are ${regions(pts)} regions, not ${2 ** (pts - 1)}.`],
    rule: 3,
    skill: 'a pattern that breaks',
    check: () => ([1, 2, 3, 4, 5].every((k) => regions(k) === 2 ** (k - 1)) && regions(pts) !== 2 ** (pts - 1) ? true : 'region formula disagrees'),
  });
}

function smallestFactor(n) {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
}
function choose(n, k) {
  if (k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

// ───────────── Topic ─────────────

const SQ_RECT = forms('sq', 'rect');

export default {
  id: 'reasoning-proof',
  title: 'Reasoning & Proof',
  summary: 'Work with conditional statements, reason deductively, and justify each step of a two-column proof.',
  standards: ['CCSS G-CO.C.9', 'CCSS G-CO.C.10', 'CCSS G-CO.C.11'],

  explain: {
    intro: R`A proof is a chain of statements, each one justified by the given information, a definition, a property or a theorem already proved. To build one you need the language of **conditional statements** and the rules that say which conclusions really follow. Truth is settled by checking every case: one counterexample is enough to make a statement false.`,
    rules: [
      {
        title: 'Conditional statements',
        text: R`An if-then statement "if \(p\), then \(q\)" has a **hypothesis** \(p\) (after "if") and a **conclusion** \(q\) (after "then"). It is true when every case that makes \(p\) true also makes \(q\) true. A **counterexample** is one case with \(p\) true and \(q\) false; one is enough to prove the statement false.`,
        example: R`"If a positive integer is prime, then it is odd" is false. Counterexample: \(2\) is prime but not odd.`,
      },
      {
        title: 'Converse, inverse and contrapositive',
        text: R`The **converse** swaps the parts ("if \(q\), then \(p\)"). The **inverse** negates both ("if not \(p\), then not \(q\)"). The **contrapositive** does both ("if not \(q\), then not \(p\)"). A statement and its contrapositive are **logically equivalent**: always both true or both false. The converse and the inverse are equivalent to each other, but either may differ from the statement.`,
        example: 'If a quadrilateral is a square, then it is a rectangle (true). Converse: if a quadrilateral is a rectangle, then it is a square (false: a 6 by 3 rectangle).',
      },
      {
        title: 'Biconditionals and definitions',
        text: R`When a conditional and its converse are both true, they combine into a **biconditional**: "\(p\) if and only if \(q\)". A good definition is a true biconditional, so it works in both directions. If either direction has a counterexample, the biconditional is false.`,
        example: 'A parallelogram is a rectangle if and only if its diagonals are congruent: both directions are true.',
      },
      {
        title: 'Inductive and deductive reasoning',
        text: R`**Inductive** reasoning finds a pattern in examples and makes a conjecture; the conjecture can fail on the next case. **Deductive** reasoning uses accepted facts and logic. **Law of detachment:** if "if \(p\), then \(q\)" is true and \(p\) is true, then \(q\) is true. **Law of syllogism:** "if \(p\), then \(q\)" and "if \(q\), then \(r\)" give "if \(p\), then \(r\)". Knowing only \(q\), or only "not \(p\)", gives no conclusion.`,
        example: R`\(n^2 + n + 41\) is prime for \(n = 1\) to \(39\), but \(40^2 + 40 + 41 = 41^2\). The pattern breaks.`,
      },
      {
        title: 'Properties of equality and congruence',
        text: R`**Reflexive:** \(a = a\). **Symmetric:** if \(a = b\), then \(b = a\). **Transitive:** if \(a = b\) and \(b = c\), then \(a = c\). **Substitution:** an equal quantity may replace another. The **addition, subtraction, multiplication and division** properties do the same thing to both sides. The **distributive** property multiplies out \(a(b + c)\). Reflexive, symmetric and transitive also hold for congruence.`,
        example: R`If \(3x = 12\), then \(x = 4\) (division property of equality).`,
      },
      {
        title: 'Two-column proofs',
        text: R`Write each statement on the left and its reason on the right. A reason may be the given information, a definition, a postulate, a property or a theorem proved earlier, and it may use only the given and earlier steps. Common reasons: vertical angles are congruent; angles in a linear pair are supplementary; the parallel-line angle facts; the triangle angle sum; base angles of an isosceles triangle are congruent; opposite sides of a parallelogram are congruent. A fact cannot be used to prove itself, and a theorem is not the same reason as its converse.`,
        example: R`To prove lines parallel from congruent corresponding angles, the reason is "if corresponding angles are congruent, then the lines are parallel", not "corresponding angles of parallel lines are congruent".`,
      },
    ],
    vocab: [
      { term: 'conjecture', def: 'A statement believed to be true from examples but not yet proved.' },
      { term: 'counterexample', def: 'One case that makes the hypothesis true and the conclusion false.' },
      { term: 'negation', def: R`The opposite of a statement: "not \(p\)".` },
      { term: 'logically equivalent', def: 'Two statements that always have the same truth value, such as a conditional and its contrapositive.' },
      { term: 'theorem', def: 'A statement that has been proved; it can be used as a reason in later proofs.' },
      { term: 'isosceles triangle', def: 'A triangle with at least two congruent sides. An equilateral triangle is isosceles too.' },
    ],
    mistakes: [
      'Assuming the converse of a true statement is true. Check it separately.',
      'Treating the inverse as equivalent to the statement. Only the contrapositive is.',
      'Using an example that makes the hypothesis false as a counterexample. A counterexample needs a true hypothesis and a false conclusion.',
      'Reasoning backwards: from "if p, then q" and q, nothing follows about p.',
      'Citing the theorem being proved, or its converse, as a reason in the proof.',
    ],
    visual: {
      type: 'table',
      caption: 'A conditional and its related statements',
      headers: ['Form', 'Statement', 'True?'],
      rows: [
        ['Conditional', say(QUAD, SQ_RECT.orig), 'Yes'],
        ['Converse', say(QUAD, SQ_RECT.conv), 'No'],
        ['Inverse', say(QUAD, SQ_RECT.inv), 'No'],
        ['Contrapositive', say(QUAD, SQ_RECT.contra), 'Yes'],
      ],
      rowHeaders: true,
    },
  },

  examples: [
    {
      title: 'Converse, inverse and contrapositive',
      problem: 'Write the converse, inverse and contrapositive of "If a quadrilateral is a square, then it is a rectangle," and decide whether each is true.',
      steps: [
        'The statement is true: a square has four right angles.',
        'Converse: if a quadrilateral is a rectangle, then it is a square. False: the 6 by 3 rectangle shown is a counterexample.',
        'Inverse: if a quadrilateral is not a square, then it is not a rectangle. False, with the same counterexample (it is not a square, but it is a rectangle).',
        'Contrapositive: if a quadrilateral is not a rectangle, then it is not a square. True, because it is equivalent to the statement.',
      ],
      answer: 'Converse false, inverse false, contrapositive true',
      visual: { type: 'polygon', points: RECT, sides: ['6', '3', '6', '3'], right: [0, 1, 2, 3], alt: 'A rectangle 6 units long and 3 units high with four right angles: a rectangle that is not a square.' },
    },
    {
      title: 'A biconditional',
      problem: 'Decide whether "A parallelogram is a rectangle if and only if its diagonals are congruent" is true.',
      steps: [
        'Split it into two conditionals and check each.',
        'If a parallelogram is a rectangle, then its diagonals are congruent: true (a property of rectangles).',
        'If a parallelogram has congruent diagonals, then it is a rectangle: true (a theorem about parallelograms).',
        'Both directions are true, so the biconditional is true.',
      ],
      answer: 'True',
      visual: { type: 'polygon', points: RECT, vertices: ['A', 'B', 'C', 'D'], right: [0, 1, 2, 3], extra: [{ from: RECT[0], to: RECT[2], dashed: false }, { from: RECT[1], to: RECT[3], dashed: false }, ...tickMark(RECT[0], RECT[2], 0.25), ...tickMark(RECT[1], RECT[3], 0.25)], alt: 'Rectangle ABCD with diagonals AC and BD drawn. The diagonals have matching tick marks to show they are congruent.' },
    },
    {
      title: 'Word problem: what follows?',
      word: true,
      problem: 'Assume these are true: "If the bridge is closed, then the bus takes the long route." "If the bus takes the long route, then the bus arrives late." On Monday the bridge is closed. What can be concluded? On Tuesday the bus arrives late. What can be concluded?',
      steps: [
        'Law of syllogism: the two statements give "If the bridge is closed, then the bus arrives late."',
        'Monday: the hypothesis is true, so by the law of detachment the bus arrives late.',
        'Tuesday: only the conclusion is known. The bus could be late for another reason, so nothing follows about the bridge.',
      ],
      answer: 'Monday: the bus arrives late. Tuesday: no conclusion about the bridge.',
    },
    {
      title: 'A two-column proof',
      problem: R`Prove the exterior angle theorem: in \(\triangle ABC\) with \(\overline{BC}\) extended to \(D\), \(m\angle ACD = m\angle A + m\angle B\).`,
      steps: [
        R`\(m\angle A + m\angle B + m\angle ACB = 180^\circ\): triangle angle sum theorem.`,
        R`\(m\angle ACB + m\angle ACD = 180^\circ\): angles in a linear pair are supplementary.`,
        R`\(m\angle A + m\angle B + m\angle ACB = m\angle ACB + m\angle ACD\): substitution property.`,
        R`\(m\angle A + m\angle B = m\angle ACD\): subtraction property of equality (subtract \(m\angle ACB\)).`,
      ],
      answer: R`\(m\angle ACD = m\angle A + m\angle B\)`,
      visual: [exteriorProof().visual, { type: 'table', headers: ['Statement', 'Reason'], rows: exteriorProof().steps.map((s, i) => [`${i + 1}. ${s.st}`, s.why]) }],
    },
  ],

  models: [
    {
      id: 'multiples-conditional',
      title: 'Test a conditional and its relatives',
      intro: 'Choose two whole numbers a and b. The statement is "If a positive integer is a multiple of a, then it is a multiple of b."',
      inputs: [
        { name: 'a', label: 'a', type: 'int', min: 2, max: 30, value: 12 },
        { name: 'b', label: 'b', type: 'int', min: 2, max: 30, value: 4 },
      ],
      compute({ a, b }) {
        if (a === b) return { error: 'Choose two different numbers, so that the hypothesis and the conclusion are different.' };
        const orig = a % b === 0;
        const conv = b % a === 0;
        const st = (p, q2, neg) => `If a positive integer ${neg ? 'is not' : 'is'} a multiple of ${p}, then it ${neg ? 'is not' : 'is'} a multiple of ${q2}.`;
        const verdict = (ok, cx) => (ok ? 'True' : `False: counterexample ${cx}`);
        return {
          problem: `Statement: ${st(a, b)}`,
          steps: [
            orig ? R`\(${a} = ${b} \cdot ${a / b}\), so every multiple of \(${a}\) is a multiple of \(${b}\). The statement is true.` : R`\(${a}\) is a multiple of \(${a}\) but not of \(${b}\), so \(${a}\) is a counterexample. The statement is false.`,
            conv ? R`Converse: ${st(b, a)} \(${b} = ${a} \cdot ${b / a}\), so it is true.` : R`Converse: ${st(b, a)} \(${b}\) is a multiple of \(${b}\) but not of \(${a}\), so it is false.`,
            `Inverse: ${st(a, b, true)} It has the same truth value as the converse: ${conv ? 'true' : `false (${b} is a counterexample)`}.`,
            `Contrapositive: ${st(b, a, true)} It has the same truth value as the statement: ${orig ? 'true' : `false (${a} is a counterexample)`}.`,
            orig && conv ? 'Both the statement and its converse are true, so they combine into a biconditional.' : 'The statement and its converse are not both true, so this is not a true biconditional.',
          ],
          answer: `Statement ${orig ? 'true' : 'false'}, converse ${conv ? 'true' : 'false'}, inverse ${conv ? 'true' : 'false'}, contrapositive ${orig ? 'true' : 'false'}`,
          visual: {
            type: 'table',
            headers: ['Form', 'Statement', 'True?'],
            rows: [['Conditional', st(a, b), verdict(orig, a)], ['Converse', st(b, a), verdict(conv, b)], ['Inverse', st(a, b, true), verdict(conv, b)], ['Contrapositive', st(b, a, true), verdict(orig, a)]],
            rowHeaders: true,
          },
        };
      },
    },
    {
      id: 'gym-proof',
      title: 'Word problem: a gym membership',
      word: true,
      intro: 'A gym charges a sign-up fee plus a monthly price. Type the fee, the monthly price and the total paid; the proof finds the number of months and justifies each step.',
      inputs: [
        { name: 'f', label: 'Sign-up fee ($)', type: 'int', min: 0, max: 150, value: 40 },
        { name: 'm', label: 'Price per month ($)', type: 'int', min: 5, max: 100, value: 25 },
        { name: 't', label: 'Total paid ($)', type: 'int', min: 5, max: 3000, value: 190 },
      ],
      compute({ f, m, t }) {
        if (t <= f) return { error: 'The total must be more than the sign-up fee, so that at least one month was paid for.' };
        if ((t - f) % m !== 0) return { error: `After the fee, $${t - f} is left, which is not a whole number of $${m} months. Change the total.` };
        const x = (t - f) / m;
        const rows = [[R`1. \(${f === 0 ? `${m}x` : `${f} + ${m}x`} = ${t}\)`, 'Given']];
        const steps = [`Let x be the number of months. The fee plus x months at $${m} is $${t}: ${f === 0 ? `\\(${m}x = ${t}\\)` : `\\(${f} + ${m}x = ${t}\\)`}.`];
        if (f > 0) {
          rows.push([R`2. \(${m}x = ${t - f}\)`, 'Subtraction property of equality']);
          steps.push(R`Subtract \(${f}\) from both sides: \(${m}x = ${t - f}\) (subtraction property of equality).`);
        }
        rows.push([R`${rows.length + 1}. \(x = ${x}\)`, 'Division property of equality']);
        steps.push(R`Divide both sides by \(${m}\): \(x = ${x}\) (division property of equality).`);
        steps.push(f === 0 ? R`Check: \(${m} \cdot ${x} = ${m * x}\). ✓` : R`Check: \(${f} + ${m} \cdot ${x} = ${f + m * x}\). ✓`);
        return {
          problem: `${f > 0 ? `A gym charges a $${f} sign-up fee` : 'A gym has no sign-up fee'} and $${m} a month. The total paid is $${t}. For how many months is that?`,
          steps,
          answer: `${x} ${x === 1 ? 'month' : 'months'}`,
          visual: { type: 'table', headers: ['Statement', 'Reason'], rows, caption: 'The algebraic proof' },
        };
      },
    },
  ],

  quiz: {
    easy: [easyHypConc, easyNameForm, easyInductiveDeductive, easyPropertyName],
    medium: [mediumCounterexample, mediumEquivalent, mediumLaws, mediumAlgebraReason],
    hard: [hardRelatedTruth, hardBiconditional, hardProofStep],
    challenge: [challengeChain, challengeSpotError, challengePattern, challengeAlgebraStatement],
  },
};
