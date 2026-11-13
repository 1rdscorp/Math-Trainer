import { R, q, num, linear, terms, signed, dot, tryFrac, person } from '../../lib/index.js';
import { deg, degM, degT, rad, angleAt } from './_shared.js';

const asX = (v) => R`\(x = ${num(v)}\)`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
// "a" or "an" before a number read aloud: an 8, an 11, an 18, an 80-something; a 7, a 100.
const an = (n) => (/^(8|11|18)/.test(String(n)) && !/^(11|18)\d\d/.test(String(n)) && !/^1[18]\d$/.test(String(n)) ? 'an' : 'a');
const expr = (a, b) => R`(${linear(a, b)})^\circ`; // LaTeX for an angle such as (3x + 5)°
// n / d when that is a positive whole number, otherwise null (q() skips null choices).
const posInt = (n, d) => (d !== 0 && n % d === 0 && n / d > 0 ? n / d : null);

// ───────────── Two lines and a transversal ─────────────
// Positions: top crossing 1 upper-left, 2 upper-right, 3 lower-left, 4 lower-right; bottom crossing 5–8
// in the same pattern. If position 2 measures s, positions 2, 3, 6, 7 measure s and the rest 180 − s.

const SAME_AS_2 = [2, 3, 6, 7];
const measureAt = (s, pos) => (SAME_AS_2.includes(pos) ? s : 180 - s);
const POS_WORDS = {
  1: 'above the top line, left of the transversal',
  2: 'above the top line, right of the transversal',
  3: 'below the top line, left of the transversal',
  4: 'below the top line, right of the transversal',
  5: 'above the bottom line, left of the transversal',
  6: 'above the bottom line, right of the transversal',
  7: 'below the bottom line, left of the transversal',
  8: 'below the bottom line, right of the transversal',
};
const PAIR_TYPES = {
  corresponding: { pairs: [[1, 5], [2, 6], [3, 7], [4, 8]], same: true, where: 'they are in the same position at each crossing.' },
  'alternate interior': { pairs: [[3, 6], [4, 5]], same: true, where: 'they are between the two lines, on opposite sides of the transversal.' },
  'alternate exterior': { pairs: [[1, 8], [2, 7]], same: true, where: 'they are outside the two lines, on opposite sides of the transversal.' },
  'same-side interior': { pairs: [[3, 5], [4, 6]], same: false, where: 'they are between the two lines, on the same side of the transversal.' },
};
const VERT_OF = { 1: 4, 4: 1, 2: 3, 3: 2, 5: 8, 8: 5, 6: 7, 7: 6 };
const corrOf = (p) => (p <= 4 ? p + 4 : p - 4);
const NUMBERED = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8' };
const NUMBERED_ALT = 'cut by a transversal. Angles 1 to 4 are at the top crossing: 1 upper left, 2 upper right, 3 lower left, 4 lower right. Angles 5 to 8 are at the bottom crossing in the same pattern.';

function pickPair(rng, types = Object.keys(PAIR_TYPES)) {
  const type = rng.pick(types);
  const [p1, p2] = rng.shuffle(rng.pick(PAIR_TYPES[type].pairs));
  return { type, rel: PAIR_TYPES[type], p1, p2 };
}

function tvFigure(s, labels, parallel = true) {
  const desc = Object.entries(labels).map(([k, v]) => `the angle ${POS_WORDS[k]} is ${v}`).join('; ');
  return { type: 'transversal', slant: Math.max(40, Math.min(140, s)), labels, parallelMarks: parallel, alt: `${parallel ? 'Two parallel lines' : 'Two lines'} cut by a transversal: ${desc}.` };
}

// ───────────── Easy ─────────────

function easyClassify(rng) {
  const kind = rng.pick(['acute', 'acute', 'acute', 'obtuse', 'obtuse', 'obtuse', 'right', 'straight']);
  const a = kind === 'acute' ? rng.int(12, 89) : kind === 'obtuse' ? rng.int(91, 172) : kind === 'right' ? 90 : 180;
  const names = { acute: 'Acute', right: 'Right', obtuse: 'Obtuse', straight: 'Straight' };
  const reason = {
    acute: R`\(${deg(a)}\) is less than \(90^\circ\), so the angle is acute.`,
    right: R`An angle of exactly \(90^\circ\) is a right angle.`,
    obtuse: R`\(${deg(a)}\) is between \(90^\circ\) and \(180^\circ\), so the angle is obtuse.`,
    straight: R`An angle of exactly \(180^\circ\) is a straight angle: its sides form a line.`,
  };
  return q({
    prompt: R`An angle measures \(${deg(a)}\). What type of angle is it?`,
    visual: { type: 'angle', rays: [0, a], arcs: [{ from: 0, to: a, label: degT(a) }], alt: `An angle of ${a} degrees.` },
    correct: names[kind],
    wrong: ['Acute', 'Right', 'Obtuse', 'Straight'],
    solution: [R`Compare the measure with \(90^\circ\) and \(180^\circ\).`, reason[kind]],
    rule: 0,
    skill: 'classifying angles',
  });
}

function easyVocab(rng) {
  const [A, B] = rng.pick([['A', 'B'], ['P', 'Q'], ['M', 'N'], ['R', 'S'], ['X', 'Y'], ['C', 'D']]);
  const ray = R`\(\overrightarrow{${A}${B}}\)`;
  const yar = R`\(\overrightarrow{${B}${A}}\)`;
  const line = R`\(\overleftrightarrow{${A}${B}}\)`;
  const seg = R`\(\overline{${A}${B}}\)`;
  const item = rng.pick([
    { ask: 'Which figure has exactly one endpoint and extends without end in one direction?', right: 'A ray', wrong: ['A line', 'A segment', 'An angle'], steps: ['A line has no endpoints and a segment has two.', 'One endpoint, then on without end: that is a ray.'] },
    { ask: 'Which figure is part of a line and has two endpoints?', right: 'A segment', wrong: ['A ray', 'A line', 'A point'], steps: ['A ray has one endpoint and a line has none.', 'A segment is the part of a line between two endpoints.'] },
    { ask: 'Which figure extends without end in both directions?', right: 'A line', wrong: ['A ray', 'A segment', 'An angle'], steps: ['A segment stops at both ends and a ray stops at one.', 'A line has no endpoints at all.'] },
    { ask: 'Two rays that share an endpoint form which figure?', right: 'An angle', wrong: ['A line', 'A segment', 'A transversal'], steps: ['The shared endpoint is the vertex and the rays are the sides.', 'Together they form an angle.'] },
    { ask: 'What is the common endpoint of the two sides of an angle called?', right: 'The vertex', wrong: ['The midpoint', 'The transversal', 'The bisector'], steps: ['An angle is made of two rays that start at the same point.', 'That point is the vertex of the angle.'] },
    { ask: 'Points that lie on the same line are called what?', right: 'Collinear', wrong: ['Congruent', 'Parallel', 'Complementary'], steps: ['"Co-linear" means "on a line together".', 'Points on one line are collinear.'] },
    { ask: 'Two angles that have the same measure are called what?', right: 'Congruent', wrong: ['Complementary', 'Supplementary', 'Collinear'], steps: ['Figures with the same size and shape are congruent.', 'For angles, that means equal measures.'] },
    { ask: 'Two lines in the same plane that never meet are called what?', right: 'Parallel', wrong: ['Perpendicular', 'Collinear', 'Congruent'], steps: ['Perpendicular lines meet at a right angle.', 'Lines in a plane that never meet are parallel.'] },
    { ask: 'Two lines that meet at a right angle are called what?', right: 'Perpendicular', wrong: ['Parallel', 'Supplementary', 'Collinear'], steps: ['Parallel lines never meet.', R`Lines that cross at \(90^\circ\) are perpendicular.`] },
    { ask: 'A line that crosses two other lines at two different points is called what?', right: 'A transversal', wrong: ['A bisector', 'A segment', 'A vertex'], steps: ['A bisector cuts a segment or an angle in half.', 'A line that cuts across two or more lines is a transversal.'] },
    { ask: 'What does the midpoint of a segment do?', right: 'It divides the segment into two congruent segments.', wrong: ['It divides the segment into two segments of any lengths.', 'It marks one end of the segment.', 'It makes a right angle with the segment.'], steps: ['"Mid" means middle.', 'The midpoint is the same distance from both endpoints, so the two parts are congruent.'] },
    { ask: 'What does an angle bisector do?', right: 'It divides the angle into two congruent angles.', wrong: ['It divides the angle into two complementary angles.', 'It makes a right angle with one side.', 'It doubles the measure of the angle.'], steps: ['"Bisect" means cut into two equal parts.', 'An angle bisector is a ray that splits an angle into two congruent angles.'] },
    { ask: R`Which notation names the **ray** that starts at \(${A}\) and passes through \(${B}\)?`, right: ray, wrong: [yar, line, seg], steps: [R`An arrow in one direction means a ray. The endpoint is written first.`, R`The ray starts at \(${A}\), so it is ${ray}.`] },
    { ask: R`Which notation names the **segment** with endpoints \(${A}\) and \(${B}\)?`, right: seg, wrong: [ray, line, R`\(\angle ${A}${B}\)`], steps: ['A bar with no arrows means the figure stops at both ends.', R`The segment is ${seg}.`] },
    { ask: R`Which notation names the **line** through \(${A}\) and \(${B}\)?`, right: line, wrong: [ray, seg, yar], steps: ['Arrows on both ends mean the figure goes on in both directions.', R`The line is ${line}.`] },
  ]);
  return q({ prompt: item.ask, correct: item.right, wrong: item.wrong, solution: item.steps, rule: 0, skill: 'vocabulary and notation' });
}

function easyPartner(rng) {
  const comp = rng.bool();
  const total = comp ? 90 : 180;
  const a = comp ? rng.int(18, 72) : rng.int(22, 158);
  const x = total - a;
  const word = comp ? 'complementary' : 'supplementary';
  return q({
    prompt: R`Two angles are **${word}**. One measures \(${deg(a)}\). What is the measure of the other?`,
    visual: {
      type: 'angle',
      rays: [0, total, a],
      arcs: [{ from: 0, to: a, label: degT(a) }, { from: a, to: total, label: 'x' }],
      center: comp ? [90, 180] : undefined,
      alt: `Two angles side by side that together make a ${comp ? 'right angle' : 'straight line'}. One is ${a} degrees and the other is marked x.`,
    },
    correct: x,
    fmt: degM,
    wrong: [
      comp
        ? { value: 180 - a, why: R`Complementary angles add to \(90^\circ\). A sum of \(180^\circ\) is for supplementary angles.` }
        : { value: a < 90 ? 90 - a : a - 90, why: R`Supplementary angles add to \(180^\circ\). A sum of \(90^\circ\) is for complementary angles.` },
      { value: a, why: 'The two angles are equal only in special cases. Use the sum instead.' },
      360 - a,
      total + a,
    ],
    solution: [
      R`${cap(word)} angles add to \(${deg(total)}\).`,
      R`Subtract the known angle: \(${total} - ${a} = ${x}\).`,
      R`The other angle measures \(${deg(x)}\).`,
    ],
    rule: 1,
    skill: 'complementary and supplementary',
    check: () => (a + x === total ? true : 'angles do not have the right sum'),
  });
}

function easyIntersecting(rng) {
  const a = rng.intExcept(25, 155, [90]);
  const vertical = rng.bool();
  const t = rng.int(0, 25);
  const x = vertical ? a : 180 - a;
  return q({
    prompt: R`Two lines intersect. One of the angles they form measures \(${deg(a)}\). Find \(x\), the measure of the angle ${vertical ? 'directly opposite it' : 'next to it'}.`,
    visual: {
      type: 'angle',
      lines: true,
      rays: [t, t + a],
      arcs: [{ from: t, to: t + a, label: degT(a) }, vertical ? { from: t + 180, to: t + a + 180, label: 'x' } : { from: t + a, to: t + 180, label: 'x' }],
      alt: `Two crossing lines. One angle is ${a} degrees. The angle marked x is ${vertical ? 'opposite it, across the crossing point' : 'beside it, sharing one side'}.`,
    },
    correct: x,
    fmt: degM,
    wrong: [
      vertical
        ? { value: 180 - a, why: 'That is the angle beside it. Opposite (vertical) angles are congruent.' }
        : { value: a, why: R`Opposite angles are congruent, but \(x\) is beside the given angle. The two form a linear pair.` },
      a < 90 ? 90 - a : a - 90,
      360 - a,
      vertical ? 360 - 2 * a : 2 * a,
    ],
    solution: vertical
      ? [R`The two angles are opposite each other, so they are vertical angles.`, R`Vertical angles are congruent: \(x = ${deg(a)}\).`]
      : [R`The two angles sit side by side on a straight line, so they form a linear pair.`, R`A linear pair is supplementary: \(x = 180 - ${a} = ${x}\), so \(x = ${deg(x)}\).`],
    rule: 2,
    skill: 'vertical angles and linear pairs',
    check: () => {
      const got = vertical ? angleAt([-Math.cos(rad(t)), -Math.sin(rad(t))], [0, 0], [-Math.cos(rad(t + a)), -Math.sin(rad(t + a))]) : angleAt([Math.cos(rad(t + a)), Math.sin(rad(t + a))], [0, 0], [-Math.cos(rad(t)), -Math.sin(rad(t))]);
      return Math.abs(got - x) < 1e-6 ? true : `figure gives ${got}`;
    },
  });
}

function easyBisect(rng) {
  const kind = rng.pick(['mid-whole', 'mid-half', 'bis-half', 'bis-whole', 'between']);
  if (kind === 'between') {
    const ab = rng.int(3, 20);
    const bc = rng.int(3, 20);
    const findWhole = rng.bool();
    return q({
      prompt: findWhole
        ? R`Point \(B\) lies on segment \(\overline{AC}\), between \(A\) and \(C\). If \(AB = ${ab}\) and \(BC = ${bc}\), what is \(AC\)?`
        : R`Point \(B\) lies on segment \(\overline{AC}\), between \(A\) and \(C\). If \(AC = ${ab + bc}\) and \(AB = ${ab}\), what is \(BC\)?`,
      correct: findWhole ? ab + bc : bc,
      wrong: findWhole ? [ab !== bc ? { value: Math.abs(ab - bc), why: 'The two parts are joined end to end to make the whole segment, so add them.' } : null, 2 * (ab + bc), ab * bc, ab + bc + 2] : [{ value: 2 * ab + bc, why: R`\(AC\) is the whole segment. Subtract \(AB\) from it to get the other part.` }, ab, bc + 2, Math.abs(bc - ab)],
      solution: findWhole
        ? [R`\(B\) is between \(A\) and \(C\), so the two parts make the whole: \(AB + BC = AC\).`, R`\(AC = ${ab} + ${bc} = ${ab + bc}\).`]
        : [R`\(B\) is between \(A\) and \(C\), so \(AB + BC = AC\).`, R`\(BC = AC - AB = ${ab + bc} - ${ab} = ${bc}\).`],
      rule: 0,
      skill: 'segments and midpoints',
    });
  }
  if (kind.startsWith('mid')) {
    const k = rng.int(3, 24);
    const whole = kind === 'mid-whole';
    return q({
      prompt: whole
        ? R`\(M\) is the midpoint of \(\overline{AB}\) and \(AM = ${k}\). What is \(AB\)?`
        : R`\(M\) is the midpoint of \(\overline{AB}\) and \(AB = ${2 * k}\). What is \(MB\)?`,
      correct: whole ? 2 * k : k,
      wrong: whole
        ? [{ value: k, why: R`\(AM\) is only half of the segment. \(AB = AM + MB\).` }, posInt(k, 2), 3 * k, 2 * k + 2]
        : [{ value: 2 * k, why: R`That is the whole segment. \(MB\) is half of it.` }, 4 * k, k + 2, posInt(k, 2)],
      solution: [
        R`A midpoint divides a segment into two congruent parts, so \(AM = MB\).`,
        whole ? R`\(AB = AM + MB = ${k} + ${k} = ${2 * k}\).` : R`\(MB = \frac{1}{2}AB = \frac{1}{2}(${2 * k}) = ${k}\).`,
      ],
      rule: 0,
      skill: 'segments and midpoints',
    });
  }
  const k = rng.int(18, 85);
  const whole = kind === 'bis-whole';
  return q({
    prompt: whole
      ? R`Ray \(\overrightarrow{BD}\) bisects \(\angle ABC\), and \(m\angle ABD = ${deg(k)}\). What is \(m\angle ABC\)?`
      : R`Ray \(\overrightarrow{BD}\) bisects \(\angle ABC\), and \(m\angle ABC = ${deg(2 * k)}\). What is \(m\angle ABD\)?`,
    visual: {
      type: 'angle',
      rays: [{ deg: 0, label: 'C' }, { deg: 2 * k, label: 'A' }, { deg: k, label: 'D' }],
      arcs: whole ? [{ from: k, to: 2 * k, label: degT(k) }] : [{ from: 0, to: 2 * k, label: degT(2 * k), r: 40 }],
      alt: `Angle ABC with vertex B. Ray BD runs through the middle of the angle. ${whole ? `Angle ABD is ${k} degrees.` : `Angle ABC is ${2 * k} degrees.`}`,
    },
    correct: whole ? 2 * k : k,
    fmt: degM,
    wrong: whole
      ? [{ value: k, why: 'The bisector cuts the angle into two equal parts, so the whole angle is twice as large.' }, posInt(k, 2), 180 - k, 90 - k > 0 ? 90 - k : 3 * k, 2 * k + 20 < 180 ? 2 * k + 20 : 2 * k - 20, 3 * k]
      : [{ value: 2 * k, why: 'That is the whole angle. The bisector cuts it into two equal halves.' }, 4 * k, 180 - 2 * k > 0 ? 180 - 2 * k : k + 10, k + 5],
    solution: [
      R`A bisector divides an angle into two congruent angles: \(m\angle ABD = m\angle DBC\).`,
      whole ? R`\(m\angle ABC = 2 \cdot ${k}^\circ = ${deg(2 * k)}\).` : R`\(m\angle ABD = \frac{1}{2}(${deg(2 * k)}) = ${deg(k)}\).`,
    ],
    rule: 0,
    skill: 'angle bisectors',
  });
}

function easyStory(rng) {
  const name = person(rng);
  const kind = rng.pick(['laptop', 'ramp', 'scissors', 'fork']);
  const a = kind === 'ramp' ? rng.int(8, 40) : kind === 'scissors' ? rng.int(20, 80) : rng.int(95, 165);
  const data = {
    laptop: {
      text: R`${name} opens a laptop so the screen makes a \(${deg(a)}\) angle with the keyboard. How many more degrees must the screen turn to lie flat, in a straight line with the keyboard?`,
      x: 180 - a,
      steps: [R`Lying flat means the screen and keyboard form a straight angle of \(180^\circ\).`, R`The turn still needed is the supplement: \(180 - ${a} = ${180 - a}\) degrees.`],
      wrong: [{ value: a - 90, why: R`Flat means a straight angle, \(180^\circ\), not a right angle.` }, 360 - a, a, 270 - a],
      rule: 1,
    },
    fork: {
      text: R`A side road leaves a straight highway. On one side, the angle between the side road and the highway is \(${deg(a)}\). What is the angle between them on the other side of the side road?`,
      x: 180 - a,
      steps: [R`The two angles sit side by side along the straight highway, so they form a linear pair.`, R`A linear pair adds to \(180^\circ\): \(180 - ${a} = ${180 - a}\) degrees.`],
      wrong: [{ value: a, why: 'The two angles are side by side, not opposite each other, so they are supplementary rather than equal.' }, a - 90, 360 - a, 270 - a],
      rule: 2,
    },
    ramp: {
      text: R`A ramp rises at \(${deg(a)}\) above level ground. A post at the bottom of the ramp stands straight up, at a right angle to the ground. What is the angle between the ramp and the post?`,
      x: 90 - a,
      steps: [R`The ground and the post form a right angle, \(90^\circ\). The ramp splits it into two parts.`, R`The two parts are complementary: \(90 - ${a} = ${90 - a}\) degrees.`],
      wrong: [{ value: 180 - a, why: R`The post and the ground make a \(90^\circ\) angle, so the two parts add to \(90^\circ\), not \(180^\circ\).` }, a, 90 + a, 2 * a],
      rule: 1,
    },
    scissors: {
      text: R`The two blades of a pair of scissors cross at the pivot, like two intersecting lines. ${name} opens the blades to an angle of \(${deg(a)}\). What is the angle between the two handles, directly opposite?`,
      x: a,
      steps: [R`The blades and handles lie along two lines that cross at the pivot.`, R`The angle between the handles is opposite the angle between the blades. Vertical angles are congruent, so it is \(${deg(a)}\) too.`],
      wrong: [{ value: 180 - a, why: 'That is the angle between a blade and a handle. The handle angle is opposite the blade angle, so it is equal to it.' }, 90 - a > 0 && 90 - a !== a ? 90 - a : 2 * a, 360 - a, 2 * a + 10],
      rule: 2,
    },
  }[kind];
  return q({ prompt: data.text, correct: data.x, fmt: degM, wrong: data.wrong, solution: data.steps, rule: data.rule, skill: 'angle word problems' });
}

// ───────────── Medium ─────────────

function mediumTransversal(rng) {
  const s = rng.int(40, 89);
  const { type, rel, p1, p2 } = pickPair(rng);
  const given = measureAt(s, p1);
  const x = rel.same ? given : 180 - given;
  return q({
    prompt: R`Two parallel lines are cut by a transversal. One angle measures \(${deg(given)}\), as shown. Find the measure of the angle marked \(x\).`,
    visual: tvFigure(s, { [p1]: degT(given), [p2]: 'x' }),
    correct: x,
    fmt: degM,
    wrong: [
      rel.same
        ? { value: 180 - given, why: `These are ${type} angles. With parallel lines they are congruent, not supplementary.` }
        : { value: given, why: 'These angles are on the same side of the transversal, between the lines. Same-side interior angles are supplementary, not congruent.' },
      ...[Math.abs(90 - given), 360 - given, 180 - Math.abs(90 - given), x > 60 ? x - 30 : x + 30, x > 100 ? x - 15 : x + 15].filter((v) => Math.abs(v - x) >= 5),
    ],
    solution: [
      `The two marked angles are ${type} angles: ${rel.where}`,
      rel.same ? `The lines are parallel, so ${type} angles are congruent.` : R`The lines are parallel, so same-side interior angles are supplementary: they add to \(180^\circ\).`,
      rel.same ? R`\(x = ${deg(x)}\).` : R`\(x = 180 - ${given} = ${x}\), so \(x = ${deg(x)}\).`,
    ],
    rule: rel.same ? 3 : 4,
    skill: 'parallel lines and transversals',
    check: () => (measureAt(s, p2) === x ? true : 'x does not match the figure'),
  });
}

function mediumNamePair(rng) {
  const types = {
    corresponding: PAIR_TYPES.corresponding.pairs,
    'alternate interior': PAIR_TYPES['alternate interior'].pairs,
    'alternate exterior': PAIR_TYPES['alternate exterior'].pairs,
    'same-side interior': PAIR_TYPES['same-side interior'].pairs,
    vertical: [[1, 4], [2, 3], [5, 8], [6, 7]],
    'linear pair': [[1, 2], [1, 3], [2, 4], [3, 4], [5, 6], [5, 7], [6, 8], [7, 8]],
  };
  const type = rng.pick(Object.keys(types));
  const [p1, p2] = rng.shuffle(rng.pick(types[type]));
  const label = { corresponding: 'Corresponding angles', 'alternate interior': 'Alternate interior angles', 'alternate exterior': 'Alternate exterior angles', 'same-side interior': 'Same-side interior angles', vertical: 'Vertical angles', 'linear pair': 'A linear pair' };
  const where = {
    corresponding: 'They are at different crossings but in the same position (for example, both upper left).',
    'alternate interior': 'Both are between the two lines (interior), and they are on opposite sides of the transversal (alternate).',
    'alternate exterior': 'Both are outside the two lines (exterior), and they are on opposite sides of the transversal (alternate).',
    'same-side interior': 'Both are between the two lines (interior), and they are on the same side of the transversal.',
    vertical: 'They are at the same crossing, opposite each other.',
    'linear pair': 'They are at the same crossing, side by side, and together they make a straight line.',
  };
  const order = {
    corresponding: ['alternate interior', 'alternate exterior', 'same-side interior'],
    'alternate interior': ['same-side interior', 'alternate exterior', 'corresponding'],
    'alternate exterior': ['alternate interior', 'corresponding', 'same-side interior'],
    'same-side interior': ['alternate interior', 'corresponding', 'linear pair'],
    vertical: ['linear pair', 'corresponding', 'alternate interior'],
    'linear pair': ['vertical', 'same-side interior', 'corresponding'],
  };
  return q({
    prompt: R`Two lines are cut by a transversal and the eight angles are numbered as shown. What kind of angle pair are \(\angle ${p1}\) and \(\angle ${p2}\)?`,
    visual: { type: 'transversal', labels: NUMBERED, parallelMarks: false, alt: `Two lines ${NUMBERED_ALT}` },
    correct: label[type],
    wrong: order[type].map((t) => label[t]),
    solution: [R`Find \(\angle ${p1}\) and \(\angle ${p2}\) in the figure. ${where[type]}`, `That makes them ${type === 'linear pair' ? 'a linear pair' : `${type} angles`}.`],
    rule: type === 'vertical' || type === 'linear pair' ? 2 : type === 'same-side interior' ? 4 : 3,
    skill: 'naming angle pairs',
  });
}

function mediumSolveX(rng) {
  for (;;) {
    const kind = rng.pick(['vertical', 'linear pair', 'complementary']);
    const x = rng.int(3, 15);
    const a = rng.int(2, 6);
    const c = rng.intExcept(1, 6, [a]);
    const m1 = kind === 'complementary' ? rng.int(20, 70) : rng.intExcept(30, 150, [90]);
    const m2 = kind === 'vertical' ? m1 : kind === 'linear pair' ? 180 - m1 : 90 - m1;
    const b = m1 - a * x;
    const d = m2 - c * x;
    if (b === 0 || d === 0 || Math.abs(b) > 40 || Math.abs(d) > 40) continue;
    const total = kind === 'complementary' ? 90 : 180;
    const equal = kind === 'vertical';
    // What the wrong relationship would give. Keep only cases where the main slip gives a whole number.
    const sumX = (t) => posInt(t - b - d, a + c);
    const eqX = posInt(d - b, a - c);
    if ((equal ? sumX(180) : eqX) == null || eqX === x) continue;
    const visual =
      kind === 'vertical'
        ? { type: 'angle', lines: true, rays: [10, 10 + m1], arcs: [{ from: 10, to: 10 + m1, label: '1' }, { from: 190, to: 190 + m1, label: '2' }], alt: 'Two crossing lines. Angle 1 and angle 2 are opposite each other across the crossing point.' }
        : { type: 'angle', rays: [0, total, m1], arcs: [{ from: 0, to: m1, label: '1' }, { from: m1, to: total, label: '2' }], center: kind === 'complementary' ? [90, 180] : undefined, alt: `Angle 1 and angle 2 side by side, together making a ${kind === 'complementary' ? 'right angle' : 'straight line'}.` };
    const given = R`\(m\angle 1 = ${expr(a, b)}\) and \(m\angle 2 = ${expr(c, d)}\)`;
    return q({
      prompt:
        kind === 'vertical'
          ? R`Two lines intersect, and \(\angle 1\) and \(\angle 2\) are vertical angles. ${given}. Find \(x\).`
          : kind === 'linear pair'
            ? R`\(\angle 1\) and \(\angle 2\) form a linear pair. ${given}. Find \(x\).`
            : R`\(\angle 1\) and \(\angle 2\) are complementary. ${given}. Find \(x\).`,
      visual,
      correct: x,
      fmt: asX,
      wrong: equal
        ? [
            { value: sumX(180), why: R`Vertical angles are congruent, so set the expressions equal. A sum of \(180^\circ\) is for a linear pair.` },
            { value: m1, why: R`That is the measure of each angle. The question asks for \(x\).` },
            x + 2,
            x > 3 ? x - 2 : x + 4,
            x + 5,
          ]
        : [
            { value: eqX, why: R`These angles are not congruent. Their measures add to \(${deg(total)}\).` },
            sumX(270 - total) == null ? null : { value: sumX(270 - total), why: kind === 'complementary' ? R`Complementary angles add to \(90^\circ\), not \(180^\circ\).` : R`A linear pair adds to \(180^\circ\), not \(90^\circ\).` },
            x + 2,
            x > 3 ? x - 2 : x + 4,
            x + 5,
          ],
      solution: equal
        ? [
            R`Vertical angles are congruent, so the expressions are equal: \(${linear(a, b)} = ${linear(c, d)}\).`,
            R`Collect terms: \(${linear(a - c, 0)} = ${d - b}\).`,
            R`${a - c === 1 ? 'So' : R`Divide by \(${a - c}\):`} \(x = ${x}\). Check: both angles are \(${deg(m1)}\).`,
          ]
        : [
            R`${kind === 'complementary' ? 'Complementary angles' : 'The angles of a linear pair'} add to \(${deg(total)}\): \((${linear(a, b)}) + (${linear(c, d)}) = ${total}\).`,
            b + d === 0 ? R`Combine like terms: \(${a + c}x = ${total}\).` : R`Combine like terms: \(${linear(a + c, b + d)} = ${total}\), so \(${a + c}x = ${total - b - d}\).`,
            R`Divide by \(${a + c}\): \(x = ${x}\). Check: \(${deg(m1)} + ${deg(m2)} = ${deg(total)}\).`,
          ],
      rule: 5,
      skill: 'solving for x in angle pairs',
      check: () => {
        const u = a * x + b;
        const v = c * x + d;
        if (u <= 0 || v <= 0) return 'an angle is not positive';
        return (equal ? u === v : u + v === total) ? true : 'x does not satisfy the relationship';
      },
    });
  }
}

function mediumStory(rng) {
  const s = rng.int(42, 88);
  const alt = rng.bool();
  const [p1, p2] = rng.shuffle(alt ? rng.pick([[3, 6], [4, 5]]) : rng.pick([[3, 5], [4, 6]]));
  const given = measureAt(s, p1);
  const x = alt ? given : 180 - given;
  const ctx = rng.pick([
    { intro: 'A wooden board has parallel long edges. A straight saw cut goes across it at a slant.', makes: 'the cut makes', a: 'one edge', b: 'the other edge', inside: 'inside the board', t: 'the cut' },
    { intro: 'Two parallel streets are crossed by a straight avenue.', makes: 'the avenue makes', a: 'the first street', b: 'the second street', inside: 'between the streets', t: 'the avenue' },
    { intro: 'A canal has parallel banks. A straight footbridge crosses it at a slant.', makes: 'the bridge makes', a: 'one bank', b: 'the other bank', inside: 'over the water', t: 'the bridge' },
    { intro: 'Two rails of a fence are parallel. A straight brace is nailed across both rails.', makes: 'the brace makes', a: 'the top rail', b: 'the bottom rail', inside: 'between the rails', t: 'the brace' },
  ]);
  return q({
    prompt: R`${ctx.intro} Measured ${ctx.inside}, ${ctx.makes} ${an(given)} \(${deg(given)}\) angle with ${ctx.a}. What angle does it make with ${ctx.b}, also measured ${ctx.inside}, on the **${alt ? 'opposite' : 'same'}** side of ${ctx.t}?`,
    visual: tvFigure(s, { [p1]: degT(given), [p2]: 'x' }),
    correct: x,
    fmt: degM,
    wrong: [
      alt
        ? { value: 180 - given, why: 'The two angles are on opposite sides, so they are alternate interior angles, which are congruent.' }
        : { value: given, why: 'The two angles are on the same side, so they are same-side interior angles, which are supplementary.' },
      ...[Math.abs(90 - given), 180 - Math.abs(90 - given), 360 - given, x > 60 ? x - 30 : x + 30, x > 100 ? x - 15 : x + 15].filter((v) => Math.abs(v - x) >= 5),
    ],
    solution: [
      `Both angles are between the parallel lines, and they are on ${alt ? 'opposite sides' : 'the same side'} of ${ctx.t}. They are ${alt ? 'alternate interior' : 'same-side interior'} angles.`,
      alt ? 'Alternate interior angles formed by parallel lines are congruent.' : R`Same-side interior angles formed by parallel lines add to \(180^\circ\).`,
      alt ? R`The angle is \(${deg(x)}\).` : R`\(180 - ${given} = ${x}\), so the angle is \(${deg(x)}\).`,
    ],
    rule: alt ? 3 : 4,
    skill: 'angle word problems',
    check: () => (measureAt(s, p2) === x ? true : 'x does not match the figure'),
  });
}

// ───────────── Hard ─────────────

// Two angles at the given pair of positions, written as (ax + b)° and (cx + d)°.
function tvAlgebra(rng, pick, needSlip = false) {
  for (;;) {
    const s = rng.int(40, 89);
    const { type, rel, p1, p2 } = pick(rng);
    const m1 = measureAt(s, p1);
    const m2 = measureAt(s, p2);
    const x = rng.int(4, 16);
    const a = rng.int(2, 7);
    const c = rng.intExcept(1, 7, [a]);
    const b = m1 - a * x;
    const d = m2 - c * x;
    if (b === 0 || d === 0 || Math.abs(b) > 45 || Math.abs(d) > 45) continue;
    // The value of x that the wrong relationship would give (equal instead of supplementary, or the reverse).
    const slip = m1 === m2 ? posInt(180 - b - d, a + c) : posInt(d - b, a - c);
    if (needSlip && slip == null) continue;
    const given = R`\(m\angle ${p1} = ${expr(a, b)}\) and \(m\angle ${p2} = ${expr(c, d)}\)`;
    const visual = { type: 'transversal', slant: s, labels: NUMBERED, alt: `Two parallel lines ${NUMBERED_ALT}` };
    return { s, type, rel, p1, p2, m1, m2, x, a, b, c, d, slip, given, same: m1 === m2, visual };
  }
}

const tvCheck = (t) => () => {
  const u = t.a * t.x + t.b;
  const v = t.c * t.x + t.d;
  return u === measureAt(t.s, t.p1) && v === measureAt(t.s, t.p2) && (t.same ? u === v : u + v === 180) ? true : 'the angles do not fit the figure';
};

function tvSteps(t) {
  const pair = R`\(\angle ${t.p1}\) and \(\angle ${t.p2}\) are ${t.type} angles: ${t.rel.where}`;
  return t.same
    ? [
        pair,
        R`The lines are parallel, so they are congruent: \(${linear(t.a, t.b)} = ${linear(t.c, t.d)}\).`,
        t.a - t.c === 1 ? R`Collect terms: \(x = ${t.x}\).` : R`Collect terms: \(${linear(t.a - t.c, 0)} = ${t.d - t.b}\), so \(x = ${t.x}\).`,
      ]
    : [
        pair,
        R`The lines are parallel, so they are supplementary: \((${linear(t.a, t.b)}) + (${linear(t.c, t.d)}) = 180\).`,
        t.b + t.d === 0 ? R`Combine like terms: \(${t.a + t.c}x = 180\), so \(x = ${t.x}\).` : R`Combine like terms: \(${linear(t.a + t.c, t.b + t.d)} = 180\), so \(${t.a + t.c}x = ${180 - t.b - t.d}\) and \(x = ${t.x}\).`,
      ];
}

function hardSolveX(rng) {
  const t = tvAlgebra(rng, pickPair, true);
  return q({
    prompt: R`Two parallel lines are cut by a transversal, and the angles are numbered as shown. ${t.given}. Find \(x\).`,
    visual: t.visual,
    correct: t.x,
    fmt: asX,
    wrong: [
      { value: t.slip, why: t.same ? `These are ${t.type} angles, which are congruent. Set the expressions equal instead of adding them.` : R`Same-side interior angles are supplementary. Add the expressions and set the sum equal to \(180\).` },
      { value: t.m2, why: R`That is the measure of an angle. The question asks for \(x\).` },
      t.x + 3,
      t.x > 5 ? t.x - 3 : t.x + 6,
      t.x + 10,
    ],
    solution: [...tvSteps(t), R`Check: the angles are \(${deg(t.m1)}\) and \(${deg(t.m2)}\), which are ${t.same ? 'equal' : 'supplementary'}.`],
    rule: 5,
    skill: 'transversals with algebra',
    check: tvCheck(t),
  });
}

function hardFindAngle(rng) {
  const t = tvAlgebra(rng, pickPair);
  return q({
    prompt: R`Two parallel lines are cut by a transversal, and the angles are numbered as shown. ${t.given}. What is \(m\angle ${t.p2}\)?`,
    visual: t.visual,
    correct: t.m2,
    fmt: degM,
    wrong: [
      { value: t.x, why: R`That is the value of \(x\). Substitute it into \(${linear(t.c, t.d)}\) to get the angle.` },
      t.same ? 180 - t.m2 : { value: t.m1, why: R`That is \(m\angle ${t.p1}\), the other angle.` },
      Math.abs(90 - t.m2),
      t.m2 + t.x,
      180 - Math.abs(90 - t.m2),
    ],
    solution: [...tvSteps(t), R`Substitute: \(m\angle ${t.p2} = ${dot(t.c, t.x)} ${signed(t.d)} = ${t.m2}\). The angle measures \(${deg(t.m2)}\).`],
    rule: 5,
    skill: 'transversals with algebra',
    check: tvCheck(t),
  });
}

const RATIO_PAIRS = (total) => {
  const out = [];
  for (let n = 2; n <= 17; n++) for (let m = 1; m < n; m++) if (total % (m + n) === 0 && [2, 3, 5, 7, 11, 13].every((p) => m % p || n % p)) out.push([m, n]);
  return out;
};

function hardRatio(rng) {
  const comp = rng.bool();
  const total = comp ? 90 : 180;
  const [m, n] = rng.pick(RATIO_PAIRS(total));
  const k = total / (m + n);
  const larger = rng.bool();
  const ans = (larger ? n : m) * k;
  const otherTotal = ((larger ? n : m) * (270 - total)) / (m + n);
  return q({
    prompt: R`Two ${comp ? 'complementary' : 'supplementary'} angles have measures in the ratio \(${m} : ${n}\). What is the measure of the **${larger ? 'larger' : 'smaller'}** angle?`,
    correct: ans,
    fmt: degM,
    wrong: [
      { value: (larger ? m : n) * k, why: `That is the ${larger ? 'smaller' : 'larger'} angle.` },
      { value: k, why: R`That is the size of one part. The angle is \(${larger ? n : m}\) parts.` },
      Number.isInteger(otherTotal) ? { value: otherTotal, why: R`${comp ? 'Complementary' : 'Supplementary'} angles add to \(${deg(total)}\).` } : null,
      posInt(total * m, n),
      posInt(total, n),
      ans + k,
      total - k,
      total / 2,
      ans > 2 * k ? ans - 2 * k : ans + 3 * k,
    ],
    solution: [
      R`Write the angles as \(${terms([[m, 'k']])}\) and \(${n}k\).`,
      R`They are ${comp ? 'complementary' : 'supplementary'}: \(${terms([[m, 'k'], [n, 'k']])} = ${total}\), so \(${m + n}k = ${total}\) and \(k = ${k}\).`,
      R`The angles are \(${deg(m * k)}\) and \(${deg(n * k)}\). The ${larger ? 'larger' : 'smaller'} is \(${deg(ans)}\).`,
    ],
    rule: 1,
    skill: 'angle pairs with ratios',
    check: () => (m * k + n * k === total && ans * (larger ? m : n) === (total - ans) * (larger ? n : m) ? true : 'ratio or sum is off'),
  });
}

function hardAngleEquation(rng) {
  for (;;) {
    const comp = rng.bool();
    const total = comp ? 90 : 180;
    const k = rng.int(2, 5);
    const y = comp ? rng.int(8, 40) : rng.int(12, 80);
    const x = total - y;
    const d = x - k * y;
    if (Math.abs(d) > 60 || x <= 0) continue;
    const times = ['', '', 'twice', 'three times', 'four times', 'five times'][k];
    const partner = comp ? 'complement' : 'supplement';
    const lead = d === 0 ? '' : R`\(${deg(Math.abs(d))}\) ${d > 0 ? 'more' : 'less'} than `;
    const otherTotal = tryFrac(k * (270 - total) + d, k + 1);
    return q({
      prompt: R`An angle measures ${lead}${times} its ${partner}. What is the measure of the angle?`,
      correct: x,
      fmt: degM,
      wrong: [
        { value: y, why: `That is the ${partner}. The question asks for the angle itself.` },
        otherTotal && otherTotal.isInt() && otherTotal.value > 0 ? { value: otherTotal.value, why: comp ? R`A complement is \(90 - x\). \(180 - x\) is the supplement.` : R`A supplement is \(180 - x\). \(90 - x\) is the complement.` } : null,
        x + 5 * k,
        Math.abs(x - 4 * k) || 1,
        x + 10,
        x > 20 ? x - 15 : x + 25,
      ],
      solution: [
        R`Let the angle be \(x\). Its ${partner} is \(${total} - x\).`,
        R`Write the sentence as an equation: \(x = ${k}(${total} - x)${d === 0 ? '' : ` ${signed(d)}`}\).`,
        R`Distribute and collect: \(x = ${linear(-k, k * total + d)}\), so \(${k + 1}x = ${k * total + d}\).`,
        R`\(x = ${x}\). The angle is \(${deg(x)}\) and its ${partner} is \(${deg(y)}\).`,
      ],
      rule: 5,
      skill: 'angle equations',
      check: () => (x === k * (total - x) + d && x > 0 && x < total ? true : 'x does not satisfy the sentence'),
    });
  }
}

function hardOnALine(rng) {
  for (;;) {
    const m1 = rng.int(30, 80);
    const m3 = rng.int(30, 80);
    const mid = 180 - m1 - m3;
    if (mid < 30 || mid > 100) continue;
    const x = rng.int(3, 14);
    const a = rng.int(2, 6);
    const c = rng.int(1, 6);
    const b = m1 - a * x;
    const d = m3 - c * x;
    if (b === 0 || d === 0 || Math.abs(b) > 30 || Math.abs(d) > 30) continue;
    const skip = posInt(180 - b - d, a + c);
    const round = posInt(360 - b - d - mid, a + c);
    if (skip == null) continue;
    return q({
      prompt: R`Three angles lie side by side along a straight line, as shown. \(m\angle 1 = ${expr(a, b)}\), the middle angle measures \(${deg(mid)}\), and \(m\angle 2 = ${expr(c, d)}\). Find \(x\).`,
      visual: {
        type: 'angle',
        rays: [0, m1, m1 + mid, 180],
        arcs: [{ from: 0, to: m1, label: '1' }, { from: m1, to: m1 + mid, label: degT(mid) }, { from: m1 + mid, to: 180, label: '2', r: 26 }],
        alt: `A straight line with two rays from a point on it, making three angles side by side: angle 1, then an angle of ${mid} degrees, then angle 2.`,
      },
      correct: x,
      fmt: asX,
      wrong: [
        { value: skip, why: R`The \(${deg(mid)}\) angle is part of the straight line too. All three angles add to \(180^\circ\).` },
        round == null ? null : { value: round, why: R`Angles along a straight line add to \(180^\circ\). A sum of \(360^\circ\) is for angles all the way around a point.` },
        x + 2,
        x > 3 ? x - 2 : x + 4,
        x + 5,
      ],
      solution: [
        R`The three angles make a straight angle: \((${linear(a, b)}) + ${mid} + (${linear(c, d)}) = 180\).`,
        R`Combine like terms: \(${linear(a + c, b + d + mid)} = 180\), so \(${a + c}x = ${180 - b - d - mid}\).`,
        R`Divide by \(${a + c}\): \(x = ${x}\). Check: \(${deg(m1)} + ${deg(mid)} + ${deg(m3)} = 180^\circ\).`,
      ],
      rule: 5,
      skill: 'solving for x in angle pairs',
      check: () => (a * x + b + mid + c * x + d === 180 && a * x + b > 0 && c * x + d > 0 ? true : 'the three angles do not add to 180'),
    });
  }
}

// ───────────── Challenge ─────────────

function challengeParallelTest(rng) {
  const { type, rel, p1, p2 } = pickPair(rng);
  const s = rng.int(40, 89);
  const g = measureAt(s, p1);
  const parallel = rng.bool();
  const other = rel.same === parallel ? g : 180 - g;
  const choice = {
    yesCong: `Parallel, because these ${type} angles are congruent.`,
    yesSupp: `Parallel, because these ${type} angles are supplementary.`,
    noCong: `Not parallel, because ${type} angles would have to be congruent.`,
    noSupp: `Not parallel, because ${type} angles would have to be supplementary.`,
  };
  const right = rel.same ? (parallel ? 'yesCong' : 'noCong') : parallel ? 'yesSupp' : 'noSupp';
  const tempting = rel.same ? (parallel ? 'noSupp' : 'yesSupp') : parallel ? 'noCong' : 'yesCong';
  const note = rel.same
    ? `Supplementary is the test for same-side interior angles. ${cap(type)} angles must be congruent.`
    : 'Congruent is the test for corresponding and alternate angles. Same-side interior angles must be supplementary.';
  return q({
    prompt: R`A transversal crosses two lines. Two ${type} angles measure \(${deg(g)}\) and \(${deg(other)}\), as shown (the figure is not drawn to scale). Are the two lines parallel?`,
    visual: tvFigure(s, { [p1]: degT(g), [p2]: degT(other) }, false),
    correct: choice[right],
    wrong: [{ value: choice[tempting], why: note }, ...Object.keys(choice).filter((k) => k !== right && k !== tempting).map((k) => choice[k])],
    solution: [
      `The angles are ${type} angles: ${rel.where}`,
      rel.same ? `Two lines are parallel exactly when a pair of ${type} angles is congruent.` : R`Two lines are parallel exactly when a pair of same-side interior angles is supplementary (adds to \(180^\circ\)).`,
      rel.same
        ? parallel
          ? R`Both angles measure \(${deg(g)}\), so the lines are parallel.`
          : R`\(${deg(g)} \neq ${deg(other)}\), so the lines are not parallel. (Adding to \(180^\circ\) does not help here.)`
        : parallel
          ? R`\(${g} + ${other} = 180\), so the lines are parallel.`
          : R`\(${g} + ${other} = ${g + other}\), not \(180\), so the lines are not parallel. (Being equal does not help here.)`,
    ],
    rule: 6,
    skill: 'proving lines parallel',
    check: () => ((rel.same ? g === other : g + other === 180) === parallel && g !== 90 ? true : 'scenario is inconsistent'),
  });
}

const TWO_STEP = [[1, 6], [1, 7], [2, 5], [2, 8], [3, 8], [4, 7]];

function challengeTwoStep(rng) {
  const t = tvAlgebra(rng, (r) => {
    const [p1, p2] = r.shuffle(r.pick(TWO_STEP));
    return { type: 'two-step', rel: null, p1, p2 };
  });
  const helper = corrOf(t.p1);
  return q({
    prompt: R`Two parallel lines are cut by a transversal, and the angles are numbered as shown. ${t.given}. What is \(m\angle ${t.p2}\)?`,
    visual: t.visual,
    correct: t.m2,
    fmt: degM,
    wrong: [
      { value: t.m1, why: R`That is \(m\angle ${t.p1}\), the other angle.` },
      { value: t.x, why: R`That is the value of \(x\). Substitute it into \(${linear(t.c, t.d)}\) to get the angle.` },
      Math.abs(90 - t.m2),
      180 - Math.abs(90 - t.m2),
      t.m2 + t.x,
    ],
    solution: [
      R`\(\angle ${t.p1}\) and \(\angle ${t.p2}\) are not one of the named pairs, so use a helper angle. \(\angle ${helper}\) corresponds to \(\angle ${t.p1}\), and the lines are parallel, so \(m\angle ${helper} = ${expr(t.a, t.b)}\) too.`,
      R`\(\angle ${helper}\) and \(\angle ${t.p2}\) form a linear pair, so \((${linear(t.a, t.b)}) + (${linear(t.c, t.d)}) = 180\).`,
      R`Combine: \(${linear(t.a + t.c, t.b + t.d)} = 180\), so \(${t.a + t.c}x = ${180 - t.b - t.d}\) and \(x = ${t.x}\).`,
      R`Substitute: \(m\angle ${t.p2} = ${dot(t.c, t.x)} ${signed(t.d)} = ${t.m2}\). The angle measures \(${deg(t.m2)}\).`,
    ],
    rule: 5,
    skill: 'multi-step angle chase',
    check: () => {
      const sameCrossing = (helper <= 4) === (t.p2 <= 4);
      return tvCheck(t)() === true && sameCrossing && VERT_OF[helper] !== t.p2 && helper !== t.p2 ? true : 'the helper-angle argument does not apply';
    },
  });
}

function challengePennant(rng) {
  const a = rng.int(25, 65);
  const b = rng.intExcept(25, 65, [a]);
  const x = a + b;
  const findNotch = rng.bool(0.6);
  const t = 4 / (Math.sin(rad(a)) + Math.cos(rad(a)) * Math.tan(rad(b)));
  const L = Math.round((t * Math.cos(rad(a)) + 3) * 10) / 10;
  const B = [Math.round((L - t * Math.cos(rad(a))) * 1000) / 1000, Math.round((4 - t * Math.sin(rad(a))) * 1000) / 1000];
  const pts = [[0, 0], [L, 0], B, [L, 4], [0, 4]];
  const name = person(rng);
  return q({
    prompt: findNotch
      ? R`${name} cuts a pennant with parallel top and bottom edges and a V-shaped notch in one end. The top edge meets the notch at \(${deg(a)}\) and the bottom edge meets it at \(${deg(b)}\). Find \(x\), the angle between the two cut edges of the notch.`
      : R`${name} cuts a pennant with parallel top and bottom edges and a V-shaped notch in one end. The angle between the two cut edges of the notch is \(${deg(x)}\), and the top edge meets the notch at \(${deg(a)}\). Find \(y\), the angle where the bottom edge meets the notch.`,
    visual: {
      type: 'polygon',
      points: pts,
      angles: ['', findNotch ? degT(b) : 'y', findNotch ? 'x' : degT(x), degT(a), ''],
      right: [0, 4],
      alt: `A pennant: a rectangle whose right-hand end has a V-shaped notch cut into it. The top and bottom edges are parallel. The angle between the top edge and the upper cut is ${a} degrees. The angle between the bottom edge and the lower cut is ${findNotch ? `${b} degrees` : 'marked y'}. The angle between the two cuts, at the point of the V, is ${findNotch ? 'marked x' : `${x} degrees`}.`,
    },
    correct: findNotch ? x : b,
    fmt: degM,
    wrong: findNotch
      ? [
          { value: 180 - x, why: 'The notch is not the third angle of a triangle. Draw a line through its point, parallel to the top and bottom edges.' },
          Math.abs(a - b),
          90 + Math.min(a, b),
          180 - a,
          x + 10,
        ]
      : [
          { value: 180 - x, why: 'Draw a line through the point of the V, parallel to the edges. It splits the notch angle into two parts, one equal to each edge angle.' },
          { value: a, why: 'The two edge angles are equal only when the notch is symmetric. Here they add up to the notch angle.' },
          x + a,
          180 - b,
          90 - a > 0 && 90 - a !== b ? 90 - a : b + 10,
        ],
    solution: findNotch
      ? [
          R`Draw a helper line through the point of the V, parallel to the top and bottom edges. It splits \(x\) into an upper part and a lower part.`,
          R`The upper cut is a transversal of the top edge and the helper line. Alternate interior angles are congruent, so the upper part is \(${deg(a)}\).`,
          R`In the same way the lower part is \(${deg(b)}\).`,
          R`\(x = ${a} + ${b} = ${x}\), so \(x = ${deg(x)}\).`,
        ]
      : [
          R`Draw a helper line through the point of the V, parallel to the top and bottom edges. It splits the \(${deg(x)}\) angle into an upper part and a lower part.`,
          R`The upper cut is a transversal of the top edge and the helper line. Alternate interior angles are congruent, so the upper part is \(${deg(a)}\).`,
          R`The lower part is \(${x} - ${a} = ${b}\) degrees, and by alternate interior angles again it equals \(y\).`,
          R`\(y = ${deg(b)}\).`,
        ],
    rule: 3,
    skill: 'multi-step angle chase',
    check: () => {
      const notch = angleAt(pts[1], pts[2], pts[3]);
      const top = angleAt(pts[4], pts[3], pts[2]);
      const bottom = angleAt(pts[0], pts[1], pts[2]);
      return Math.abs(notch - x) < 0.05 && Math.abs(top - a) < 0.05 && Math.abs(bottom - b) < 0.05 ? true : `figure angles are ${top}, ${bottom}, ${notch}`;
    },
  });
}

function challengeProof(rng) {
  const REASON = {
    vert: 'Vertical angles are congruent',
    corr: 'Corresponding angles of parallel lines are congruent',
    trans: 'Transitive property of congruence',
    lin: 'Angles in a linear pair are supplementary',
    sub: 'Substitution property',
    altInt: 'Alternate interior angles of parallel lines are congruent',
    refl: 'Reflexive property of congruence',
    comp: 'Definition of complementary angles',
  };
  const kind = rng.pick(['alternate exterior', 'alternate interior', 'same-side interior']);
  const [o1, o2] = rng.shuffle(rng.pick(PAIR_TYPES[kind].pairs));
  const cong = (p, r) => R`\(\angle ${p} \cong \angle ${r}\)`;
  let rows;
  let goal;
  let mid;
  if (kind === 'same-side interior') {
    mid = corrOf(o1);
    goal = R`\(m\angle ${o1} + m\angle ${o2} = 180^\circ\)`;
    rows = [[cong(o1, mid), 'corr'], [R`\(m\angle ${mid} + m\angle ${o2} = 180^\circ\)`, 'lin'], [goal, 'sub']];
  } else if (rng.bool()) {
    mid = VERT_OF[o1];
    goal = cong(o1, o2);
    rows = [[cong(o1, mid), 'vert'], [cong(mid, o2), 'corr'], [goal, 'trans']];
  } else {
    mid = corrOf(o1);
    goal = cong(o1, o2);
    rows = [[cong(o1, mid), 'corr'], [cong(mid, o2), 'vert'], [goal, 'trans']];
  }
  const ask = rng.int(0, 2);
  const key = rows[ask][1];
  const distractors = {
    vert: ['corr', 'lin', 'altInt', 'trans'],
    corr: ['vert', kind === 'alternate interior' ? 'lin' : 'altInt', 'trans', 'lin'],
    trans: ['refl', 'vert', 'corr', 'sub'],
    lin: ['vert', 'comp', 'corr', 'trans'],
    sub: ['refl', 'vert', 'comp', 'lin'],
  }[key];
  const explain = {
    vert: R`\(\angle ${rows[ask][0].match(/\d/g)[0]}\) and \(\angle ${rows[ask][0].match(/\d/g)[1]}\) are at the same crossing, opposite each other. They are vertical angles.`,
    corr: R`\(\angle ${rows[ask][0].match(/\d/g)[0]}\) and \(\angle ${rows[ask][0].match(/\d/g)[1]}\) are in the same position at the two crossings. They are corresponding angles, and the lines are parallel.`,
    trans: 'The first two steps say that two angles are each congruent to the same angle. The transitive property lets us conclude that they are congruent to each other.',
    lin: R`\(\angle ${mid}\) and \(\angle ${o2}\) are side by side at the same crossing and form a straight line. They are a linear pair.`,
    sub: R`Step 1 says \(\angle ${o1}\) and \(\angle ${mid}\) have equal measures, so \(m\angle ${o1}\) can replace \(m\angle ${mid}\) in step 2. That is substitution.`,
  }[key];
  const lines = rows.map(([st, r], i) => `**${i + 1}.** ${st} — ${i === ask ? '**?**' : `${REASON[r].toLowerCase()}`}`).join('\n');
  return q({
    prompt: R`Lines \(m\) and \(n\) are parallel, and the angles are numbered as shown. Here is a proof that ${goal}. Which reason justifies step ${ask + 1}?` + `\n${lines}`,
    visual: { type: 'transversal', labels: NUMBERED, alt: `Two parallel lines ${NUMBERED_ALT}` },
    correct: REASON[key],
    wrong: distractors.map((k) => REASON[k]),
    solution: [explain, `The reason for step ${ask + 1} is: ${REASON[key].toLowerCase()}.`],
    rule: key === 'vert' || key === 'lin' ? 2 : 3,
    skill: 'reasons in a proof',
    check: () => {
      const s = 62;
      const stepOk = rows.every(([, r], i) => {
        if (r === 'vert') return VERT_OF[i === 0 ? o1 : mid] === (i === 0 ? mid : o2);
        if (r === 'corr') return corrOf(i === 0 ? o1 : mid) === (i === 0 ? mid : o2);
        if (r === 'lin') return (mid <= 4) === (o2 <= 4) && measureAt(s, mid) + measureAt(s, o2) === 180;
        return true;
      });
      const goalOk = kind === 'same-side interior' ? measureAt(s, o1) + measureAt(s, o2) === 180 : measureAt(s, o1) === measureAt(s, o2);
      return stepOk && goalOk ? true : 'a proof step is not valid';
    },
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'angles-lines',
  title: 'Angles & Parallel Lines',
  summary: 'Name angle pairs, find missing angles where lines cross, and use transversals to work with parallel lines.',
  standards: ['CCSS G-CO.A.1', 'CCSS G-CO.C.9'],

  explain: {
    intro: R`Geometry is built from a few basic figures and the angles they form. When two lines cross, or when a transversal crosses two parallel lines, the angles come in pairs that are either **congruent** (equal in measure) or **supplementary** (adding to \(180^\circ\)). Once you know which pairs are which, one angle gives you all the others.`,
    rules: [
      {
        title: 'The basic figures',
        text: R`A **line** extends without end in both directions. A **ray** has one endpoint and extends without end in one direction. A **segment** has two endpoints. An **angle** is two rays with a common endpoint, the vertex. Angles are named by size: **acute** (less than \(90^\circ\)), **right** (exactly \(90^\circ\)), **obtuse** (between \(90^\circ\) and \(180^\circ\)) and **straight** (exactly \(180^\circ\)).`,
        example: R`\(\overrightarrow{AB}\) is the ray that starts at \(A\) and passes through \(B\). An angle of \(132^\circ\) is obtuse.`,
      },
      {
        title: 'Complementary and supplementary angles',
        text: R`Two angles are **complementary** when their measures add to \(90^\circ\) and **supplementary** when they add to \(180^\circ\). They do not have to be next to each other.`,
        example: R`The complement of \(35^\circ\) is \(90 - 35 = 55^\circ\). The supplement of \(35^\circ\) is \(180 - 35 = 145^\circ\).`,
      },
      {
        title: 'Linear pairs and vertical angles',
        text: R`Two intersecting lines form four angles. Two angles side by side form a **linear pair** and are supplementary. Two angles opposite each other are **vertical angles** and are congruent.`,
        example: R`If one of the four angles is \(70^\circ\), the angle opposite it is \(70^\circ\) and the two beside it are \(110^\circ\).`,
      },
      {
        title: 'Parallel lines: three congruent pairs',
        text: R`When a transversal crosses two **parallel** lines, **corresponding** angles are congruent, **alternate interior** angles are congruent and **alternate exterior** angles are congruent.`,
        example: R`In the figure, \(\angle 1 \cong \angle 5\) (corresponding), \(\angle 3 \cong \angle 6\) (alternate interior) and \(\angle 1 \cong \angle 8\) (alternate exterior).`,
      },
      {
        title: 'Parallel lines: same-side interior angles',
        text: R`Two angles between the parallel lines, on the same side of the transversal, are **supplementary**. They are not congruent unless both are right angles.`,
        example: R`In the figure, \(m\angle 3 + m\angle 5 = 180^\circ\). If \(m\angle 3 = 62^\circ\), then \(m\angle 5 = 118^\circ\).`,
      },
      {
        title: 'Turn the relationship into an equation',
        text: R`When angles are given as expressions, first decide whether the pair is congruent or adds to \(180^\circ\) (or \(90^\circ\)). Then write "expression = expression" or "expression + expression = 180" and solve. If the question asks for an angle, substitute \(x\) back.`,
        example: R`Vertical angles \((3x + 10)^\circ\) and \((5x - 20)^\circ\): \(3x + 10 = 5x - 20\), so \(x = 15\) and each angle is \(55^\circ\).`,
      },
      {
        title: 'Proving lines parallel',
        text: R`The parallel-line facts also work in reverse. If a pair of corresponding, alternate interior or alternate exterior angles is congruent, the lines are parallel. If a pair of same-side interior angles is supplementary, the lines are parallel. If the test fails, the lines are not parallel.`,
        example: R`Alternate interior angles of \(48^\circ\) and \(48^\circ\): parallel. Same-side interior angles of \(48^\circ\) and \(48^\circ\): not parallel, because \(48 + 48 \neq 180\).`,
      },
    ],
    vocab: [
      { term: 'congruent angles', def: R`Angles with the same measure. The symbol is \(\cong\).` },
      { term: 'transversal', def: 'A line that crosses two or more other lines at different points.' },
      { term: 'interior and exterior', def: 'Interior angles lie between the two lines that the transversal crosses. Exterior angles lie outside them.' },
      { term: 'linear pair', def: 'Two angles side by side whose outer sides form a straight line.' },
      { term: 'bisector', def: 'A ray, line or segment that divides an angle or a segment into two congruent parts.' },
    ],
    mistakes: [
      R`Setting same-side interior angles equal. They add to \(180^\circ\).`,
      R`Mixing up complementary (\(90^\circ\)) and supplementary (\(180^\circ\)).`,
      R`Stopping at \(x\) when the question asks for an angle. Substitute \(x\) back into the expression.`,
      'Using the parallel-line facts for lines that only look parallel. The lines must be given as parallel, or proved parallel.',
    ],
    visual: { type: 'transversal', labels: NUMBERED, alt: `Two parallel lines ${NUMBERED_ALT}` },
  },

  examples: [
    {
      title: 'Complement and supplement',
      problem: R`An angle measures \(37^\circ\). Find its complement and its supplement.`,
      steps: [
        R`Complementary angles add to \(90^\circ\): \(90 - 37 = 53\). The complement is \(53^\circ\).`,
        R`Supplementary angles add to \(180^\circ\): \(180 - 37 = 143\). The supplement is \(143^\circ\).`,
        R`Check: \(37 + 53 = 90\) and \(37 + 143 = 180\). ✓`,
      ],
      answer: R`Complement \(53^\circ\), supplement \(143^\circ\)`,
      visual: { type: 'angle', rays: [0, 180, 37], arcs: [{ from: 0, to: 37, label: '37°' }, { from: 37, to: 180, label: '143°' }], alt: 'A straight line with a ray from a point on it, making angles of 37 degrees and 143 degrees.' },
    },
    {
      title: 'Vertical angles with algebra',
      problem: R`Two lines intersect. A pair of vertical angles measure \((4x + 6)^\circ\) and \((6x - 24)^\circ\). Find \(x\) and all four angles.`,
      steps: [
        R`Vertical angles are congruent: \(4x + 6 = 6x - 24\).`,
        R`Subtract \(4x\) and add \(24\): \(30 = 2x\), so \(x = 15\).`,
        R`Substitute: \(4(15) + 6 = 66\). Both vertical angles measure \(66^\circ\).`,
        R`Each of the other two angles forms a linear pair with a \(66^\circ\) angle: \(180 - 66 = 114^\circ\).`,
      ],
      answer: R`\(x = 15\); the angles are \(66^\circ, 114^\circ, 66^\circ, 114^\circ\)`,
      visual: { type: 'angle', lines: true, rays: [10, 76], arcs: [{ from: 10, to: 76, label: '(4x + 6)°' }, { from: 190, to: 256, label: '(6x − 24)°' }], alt: 'Two crossing lines. The opposite angles are labelled (4x + 6) degrees and (6x − 24) degrees.' },
    },
    {
      title: 'One angle gives all eight',
      problem: R`Two parallel lines are cut by a transversal. The upper-right angle at the top crossing measures \(65^\circ\). Find the other seven angles.`,
      steps: [
        R`At the top crossing, the angle opposite is also \(65^\circ\) (vertical angles).`,
        R`The two angles beside it each form a linear pair with it: \(180 - 65 = 115^\circ\).`,
        R`Corresponding angles are congruent because the lines are parallel, so the bottom crossing repeats the same four measures in the same positions.`,
      ],
      answer: R`Four angles of \(65^\circ\) and four of \(115^\circ\)`,
      visual: { type: 'transversal', slant: 65, labels: { 1: '115°', 2: '65°', 3: '65°', 4: '115°', 5: '115°', 6: '65°', 7: '65°', 8: '115°' }, alt: 'Two parallel lines cut by a transversal. At each crossing the upper-right and lower-left angles are 65 degrees and the upper-left and lower-right angles are 115 degrees.' },
    },
    {
      title: 'Same-side interior angles with algebra',
      problem: R`Two parallel lines are cut by a transversal, and the angles are numbered as shown. \(m\angle 4 = (3x + 15)^\circ\) and \(m\angle 6 = (2x + 10)^\circ\). Find both angles.`,
      steps: [
        R`\(\angle 4\) and \(\angle 6\) are between the lines and on the same side of the transversal, so they are same-side interior angles. They are supplementary: \((3x + 15) + (2x + 10) = 180\).`,
        R`Combine like terms: \(5x + 25 = 180\), so \(5x = 155\) and \(x = 31\).`,
        R`Substitute: \(m\angle 4 = 3(31) + 15 = 108\) and \(m\angle 6 = 2(31) + 10 = 72\).`,
        R`Check: \(108 + 72 = 180\). ✓`,
      ],
      answer: R`\(108^\circ\) and \(72^\circ\)`,
      visual: { type: 'transversal', slant: 72, labels: NUMBERED, alt: `Two parallel lines ${NUMBERED_ALT}` },
    },
    {
      title: 'Word problem: are the rails parallel?',
      word: true,
      problem: R`A gate has a top rail and a bottom rail joined by a diagonal brace. Between the rails, on the same side of the brace, the brace makes a \(57^\circ\) angle with the top rail and a \(121^\circ\) angle with the bottom rail. Are the rails parallel?`,
      steps: [
        R`The brace is a transversal of the two rails. The two angles are between the rails and on the same side of the brace, so they are same-side interior angles.`,
        R`The rails are parallel exactly when same-side interior angles add to \(180^\circ\).`,
        R`\(57 + 121 = 178\), which is not \(180\).`,
        R`The rails are not parallel. For parallel rails the second angle would have to be \(180 - 57 = 123^\circ\).`,
      ],
      answer: 'No, the rails are not parallel.',
      visual: { type: 'transversal', slant: 57, labels: { 3: '57°', 5: '121°' }, parallelMarks: false, alt: 'Two rails crossed by a brace. Between the rails, on the left of the brace, the upper angle is 57 degrees and the lower angle is 121 degrees.' },
    },
  ],

  models: [
    {
      id: 'angle-partners',
      title: 'One angle, four partners',
      intro: 'Type an angle. See its complement, its supplement and the angles made when two lines cross at that angle.',
      inputs: [{ name: 'a', label: 'Angle (degrees)', type: 'int', min: 1, max: 179, value: 52 }],
      compute({ a }) {
        const steps = [
          a < 90 ? R`Complement: \(90 - ${a} = ${90 - a}\), so the complement is \(${deg(90 - a)}\).` : R`An angle of \(${deg(a)}\) has no complement, because it is already \(90^\circ\) or more.`,
          R`Supplement: \(180 - ${a} = ${180 - a}\), so the supplement is \(${deg(180 - a)}\).`,
          R`When two lines cross at \(${deg(a)}\), the vertical angle is also \(${deg(a)}\).`,
          R`Each angle beside it forms a linear pair with it, so each is \(${deg(180 - a)}\). The four angles add to \(360^\circ\).`,
        ];
        return {
          problem: R`An angle measures \(${deg(a)}\).`,
          steps,
          answer: a < 90 ? R`Complement \(${deg(90 - a)}\), supplement \(${deg(180 - a)}\), vertical angle \(${deg(a)}\)` : R`No complement, supplement \(${deg(180 - a)}\), vertical angle \(${deg(a)}\)`,
          visual: {
            type: 'angle',
            lines: true,
            rays: [0, a],
            arcs: [{ from: 0, to: a, label: degT(a) }, { from: a, to: 180, label: degT(180 - a) }, { from: 180, to: 180 + a, label: degT(a) }, { from: 180 + a, to: 360, label: degT(180 - a) }],
            alt: `Two crossing lines making angles of ${a}, ${180 - a}, ${a} and ${180 - a} degrees around the crossing point.`,
          },
        };
      },
    },
    {
      id: 'transversal-angles',
      title: 'All eight angles from one',
      intro: 'Choose a position and type its measure. The lines are parallel, so the other seven angles follow.',
      inputs: [
        { name: 'pos', label: 'Position of the known angle', type: 'select', value: '2', options: Object.keys(POS_WORDS).map((k) => ({ value: k, label: `${k}: ${POS_WORDS[k]}` })) },
        { name: 'a', label: 'Its measure (degrees)', type: 'int', min: 1, max: 179, value: 65 },
      ],
      compute({ pos, a }) {
        const p = Number(pos);
        const s = SAME_AS_2.includes(p) ? a : 180 - a;
        const crossing = p <= 4 ? [1, 2, 3, 4] : [5, 6, 7, 8];
        const beside = crossing.filter((k) => k !== p && k !== VERT_OF[p]);
        const labels = {};
        for (let k = 1; k <= 8; k++) labels[k] = degT(measureAt(s, k));
        return {
          problem: R`Two parallel lines are cut by a transversal, with the angles numbered 1 to 8. \(m\angle ${p} = ${deg(a)}\). Find the other seven angles.`,
          steps: [
            R`Vertical angles are congruent: \(m\angle ${VERT_OF[p]} = ${deg(a)}\).`,
            R`\(\angle ${beside[0]}\) and \(\angle ${beside[1]}\) each form a linear pair with \(\angle ${p}\): \(180 - ${a} = ${180 - a}\), so each is \(${deg(180 - a)}\).`,
            R`Corresponding angles are congruent because the lines are parallel, so the other crossing repeats the pattern: \(m\angle ${corrOf(p)} = m\angle ${corrOf(VERT_OF[p])} = ${deg(a)}\) and \(m\angle ${corrOf(beside[0])} = m\angle ${corrOf(beside[1])} = ${deg(180 - a)}\).`,
          ],
          answer: R`\(\angle 2, \angle 3, \angle 6, \angle 7\) measure \(${deg(s)}\); \(\angle 1, \angle 4, \angle 5, \angle 8\) measure \(${deg(180 - s)}\)`,
          visual: { type: 'transversal', slant: Math.max(40, Math.min(140, s)), labels, alt: `Two parallel lines cut by a transversal. Angles 2, 3, 6 and 7 are ${s} degrees; angles 1, 4, 5 and 8 are ${180 - s} degrees.` },
          note: s < 40 || s > 140 ? 'The picture is not drawn to scale for very small or very large angles.' : undefined,
        };
      },
    },
    {
      id: 'parallel-test',
      title: 'Word problem: are the shelves parallel?',
      word: true,
      intro: 'Change the two measured angles and the kind of pair they form.',
      inputs: [
        { name: 'kind', label: 'The two angles are', type: 'select', value: 'same-side interior', options: [{ value: 'corresponding', label: 'corresponding angles' }, { value: 'alternate interior', label: 'alternate interior angles' }, { value: 'same-side interior', label: 'same-side interior angles' }] },
        { name: 'a', label: 'Angle at the top shelf (degrees)', type: 'int', min: 1, max: 179, value: 64 },
        { name: 'b', label: 'Angle at the bottom shelf (degrees)', type: 'int', min: 1, max: 179, value: 116 },
      ],
      compute({ kind, a, b }) {
        const same = kind !== 'same-side interior';
        const need = same ? a : 180 - a;
        const ok = b === need;
        // Put the first angle where the picture can show it at its real size.
        const [p1, p2] = (a < 90 ? { corresponding: [2, 6], 'alternate interior': [3, 6], 'same-side interior': [3, 5] } : { corresponding: [1, 5], 'alternate interior': [4, 5], 'same-side interior': [4, 6] })[kind];
        return {
          problem: R`A carpenter fixes a straight brace across two shelves. The brace makes ${an(a)} \(${deg(a)}\) angle with the top shelf and ${an(b)} \(${deg(b)}\) angle with the bottom shelf. The two angles are ${kind} angles. Are the shelves parallel?`,
          steps: [
            `The brace is a transversal of the two shelves. The measured angles are ${kind} angles: ${PAIR_TYPES[kind].where}`,
            same ? `The shelves are parallel exactly when ${kind} angles are congruent.` : R`The shelves are parallel exactly when same-side interior angles add to \(180^\circ\).`,
            same ? (ok ? R`Both angles measure \(${deg(a)}\), so the test is passed.` : R`\(${deg(a)} \neq ${deg(b)}\), so the test fails.`) : ok ? R`\(${a} + ${b} = 180\), so the test is passed.` : R`\(${a} + ${b} = ${a + b}\), not \(180\), so the test fails.`,
            ok ? 'The shelves are parallel.' : R`The shelves are not parallel. With a top angle of \(${deg(a)}\), the bottom angle would have to be \(${deg(need)}\).`,
          ],
          answer: ok ? 'Yes, the shelves are parallel.' : 'No, the shelves are not parallel.',
          visual: tvFigure(Math.min(89, a < 90 ? a : 180 - a), { [p1]: degT(a), [p2]: degT(b) }, false),
          note: ok ? undefined : 'The picture shows the positions of the angles. It is not drawn to scale.',
        };
      },
    },
  ],

  quiz: {
    easy: [easyClassify, easyVocab, easyPartner, easyIntersecting, easyBisect, easyStory],
    medium: [mediumTransversal, mediumNamePair, mediumSolveX, mediumStory],
    hard: [hardSolveX, hardFindAngle, hardRatio, hardAngleEquation, hardOnALine],
    challenge: [challengeParallelTest, challengeTwoStep, challengePennant, challengeProof],
  },
};
