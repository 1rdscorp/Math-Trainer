import { R, q, num, round, linear, terms, signed, paren, point, isSquare, person, checkEqual, checkAll } from '../../lib/index.js';
import { grid } from './_shared.js';

/** A number of degrees as a finished answer: degM(65) → \(65^\circ\). */
const degM = (v) => R`\(${num(v)}^\circ\)`;
const asX = (v) => R`\(x = ${num(v)}\)`;
/** Degrees as plain text for picture labels: degT(65) → 65°. */
const degT = (v) => `${v}°`;
/** The angle (ax + b)° for math mode, and as plain text for picture labels. */
const exprM = (a, b) => R`(${linear(a, b)})^\circ`;
const exprT = (a, b) => `(${a === 1 ? '' : a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)})°`;
/** A point as plain text for a picture label: lab(2, -3) → "(2, −3)". */
const lab = (x, y) => `(${x}, ${y})`.replace(/-/g, '−');
const an = (n) => ([8, 11, 18].includes(n) ? 'an' : 'a');
const rad = (d) => (d * Math.PI) / 180;
/** The corners of a triangle drawn to scale, with angle A at the left end of its base and angle B at the right end. */
function triangle(A, B) {
  const side = (10 * Math.sin(rad(B))) / Math.sin(rad(180 - A - B));
  return [[0, 0], [10, 0], [side * Math.cos(rad(A)), side * Math.sin(rad(A))]];
}
/** The angle, in degrees, at corner i of a triangle given by its three corners. */
function angleAt(pts, i) {
  const [p, a, b] = [pts[i], pts[(i + 1) % 3], pts[(i + 2) % 3]];
  const [u, v] = [[a[0] - p[0], a[1] - p[1]], [b[0] - p[0], b[1] - p[1]]];
  return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI;
}
/** A right triangle with its right angle at the bottom left. sides: [bottom, hypotenuse, left]. */
const rightTriangle = (a, b, sides, alt) => ({ type: 'polygon', points: [[0, 0], [a, 0], [0, b]], sides, right: [0], alt });

// Two parallel lines and a transversal. Positions: top crossing 1 upper-left, 2 upper-right, 3 lower-left,
// 4 lower-right; bottom crossing 5–8 in the same pattern. If the angle at position 2 is s, then positions
// 2, 3, 6 and 7 measure s and the other four measure 180 − s.
const size = (s, pos) => ([2, 3, 6, 7].includes(pos) ? s : 180 - s);
const WHERE = {
  1: 'above the top line, to the left of the transversal',
  2: 'above the top line, to the right of the transversal',
  3: 'below the top line, to the left of the transversal',
  4: 'below the top line, to the right of the transversal',
  5: 'above the bottom line, to the left of the transversal',
  6: 'above the bottom line, to the right of the transversal',
  7: 'below the bottom line, to the left of the transversal',
  8: 'below the bottom line, to the right of the transversal',
};
const PAIRS = [
  { name: 'corresponding angles', same: true, list: [[1, 5], [2, 6], [3, 7], [4, 8]], where: 'in the same position at each crossing' },
  { name: 'alternate interior angles', same: true, list: [[3, 6], [4, 5]], where: 'between the parallel lines, on opposite sides of the transversal' },
  { name: 'alternate exterior angles', same: true, list: [[1, 8], [2, 7]], where: 'outside the parallel lines, on opposite sides of the transversal' },
  { name: 'same-side interior angles', same: false, list: [[3, 5], [4, 6]], where: 'between the parallel lines, on the same side of the transversal' },
];
/** The measure of the angle at a position, worked out from the picture: the region it fills at its crossing. */
const regionSize = (s, pos) => [180 - s, 180 - s, s, s][pos % 4 === 0 ? 1 : pos % 4 === 1 ? 0 : 2];
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [6, 8, 10], [9, 12, 15], [12, 16, 20], [15, 20, 25], [10, 24, 26]];

// ───────────── Easy (Grade 7): angle pairs and the angles of a triangle ─────────────

function easyAnglePairs(rng) {
  const comp = rng.bool();
  const total = comp ? 90 : 180;
  const a = comp ? rng.int(15, 75) : rng.intExcept(25, 155, [90]);
  const x = total - a;
  const picture = rng.bool(0.6);
  const word = comp ? 'complementary' : 'supplementary';
  return q({
    prompt: picture ? `The two angles together make a ${comp ? 'right angle' : 'straight line'}. What is the measure of the angle marked x?` : R`Two angles are ${word}. One of them measures \(${a}^\circ\). What does the other angle measure?`,
    visual: picture
      ? {
          type: 'angle',
          rays: [0, total, a],
          arcs: [{ from: 0, to: a, label: degT(a) }, { from: a, to: total, label: 'x' }, ...(comp ? [{ from: 0, to: 90 }] : [])],
          ...(comp ? { center: [90, 180] } : {}),
          alt: comp ? `A right angle split into two parts by a ray. One part is ${a} degrees and the other part is marked x.` : `A straight line with a ray drawn from a point on it. The angle on one side of the ray is ${a} degrees and the angle on the other side is marked x.`,
        }
      : undefined,
    correct: x,
    fmt: degM,
    wrong: [
      { value: comp ? 180 - a : a < 90 ? 90 - a : null, why: comp ? R`${picture ? 'A right angle is' : 'Complementary angles add up to'} \(90^\circ\), not \(180^\circ\).` : R`${picture ? 'A straight line is' : 'Supplementary angles add up to'} \(180^\circ\), not \(90^\circ\).` },
      { value: a, why: R`The two angles do not have to be equal. Together they make \(${total}^\circ\), so subtract \(${a}^\circ\) from \(${total}^\circ\).` },
      360 - a,
      total + a,
    ],
    solution: [picture ? R`The two angles together make a ${comp ? 'right angle' : 'straight line'}, which is \(${total}^\circ\). Angles like this are called ${word}.` : R`${comp ? 'Complementary' : 'Supplementary'} angles add up to \(${total}^\circ\).`, R`\(${total}^\circ - ${a}^\circ = ${x}^\circ\).`],
    rule: 0,
    skill: `${word} angles`,
    check: () => checkEqual(a + x, total),
  });
}

function easyCrossingLines(rng) {
  const a = rng.intExcept(25, 155, [90]);
  const d1 = rng.int(0, 25);
  const d2 = d1 + a;
  const vertical = rng.bool();
  const x = vertical ? a : 180 - a;
  const arcX = vertical ? { from: d1 + 180, to: d2 + 180, label: 'x' } : { from: d2, to: d1 + 180, label: 'x' };
  return q({
    prompt: 'Two straight lines cross. What is the measure of the angle marked x?',
    visual: { type: 'angle', lines: true, rays: [d1, d2], arcs: [{ from: d1, to: d2, label: degT(a) }, arcX], alt: `Two straight lines that cross. One angle is ${a} degrees. The angle ${vertical ? 'directly opposite it' : 'next to it, on the same straight line,'} is marked x.` },
    correct: x,
    fmt: degM,
    wrong: vertical
      ? [{ value: 180 - a, why: R`\(${180 - a}^\circ\) is the angle next to the \(${a}^\circ\) angle. The angle marked \(x\) is opposite it, and opposite (vertical) angles are equal.` }, 360 - a, Math.abs(90 - a), 360 - 2 * a > 0 ? 360 - 2 * a : null]
      : [{ value: a, why: R`Only the angle opposite the \(${a}^\circ\) angle is equal to it. The angle next to it makes a straight line with it, so the two add up to \(180^\circ\).` }, { value: 360 - a, why: R`The two angles lie on a straight line, which is \(180^\circ\), not a full turn of \(360^\circ\).` }, Math.abs(90 - a)],
    solution: vertical
      ? [R`The angle marked \(x\) is directly opposite the \(${a}^\circ\) angle. These are vertical angles.`, R`Vertical angles are equal, so \(x = ${a}^\circ\).`]
      : [R`The angle marked \(x\) and the \(${a}^\circ\) angle are next to each other on a straight line, so they add up to \(180^\circ\).`, R`\(x = 180^\circ - ${a}^\circ = ${x}^\circ\).`],
    rule: 1,
    skill: vertical ? 'vertical angles' : 'angles on a straight line',
    check: () => checkEqual((((arcX.to - arcX.from) % 360) + 360) % 360, x),
  });
}

function easyTriangleSum(rng) {
  const right = rng.bool(0.3);
  const A = right ? 90 : rng.int(25, 110);
  const B = rng.int(25, Math.min(110, 160 - A));
  const C = 180 - A - B;
  const pts = triangle(A, B);
  return q({
    prompt: `What is the measure of the angle marked x${right ? ' in this right triangle' : ''}?`,
    visual: { type: 'polygon', points: pts, angles: [right ? '' : degT(A), degT(B), 'x'], right: right ? [0] : [], alt: `A triangle. ${right ? 'One angle is a right angle' : `One angle is ${A} degrees`}, another is ${B} degrees, and the third is marked x.` },
    correct: C,
    fmt: degM,
    wrong: [
      { value: A + B, why: R`\(${A + B}^\circ\) is the sum of the two known angles. Subtract it from \(180^\circ\).` },
      right ? { value: 180 - B, why: R`The small square marks a right angle, \(90^\circ\). Subtract it as well.` } : { value: 360 - A - B, why: R`The angles of a triangle add up to \(180^\circ\), not \(360^\circ\).` },
      right ? 360 - A - B : 180 - B,
      180 - A,
    ],
    solution: [R`The three angles of a triangle add up to \(180^\circ\).${right ? R` The small square marks a right angle, \(90^\circ\).` : ''}`, R`\(x = 180^\circ - ${A}^\circ - ${B}^\circ = ${C}^\circ\).`],
    rule: 3,
    skill: 'angles of a triangle',
    check: () => checkEqual(angleAt(pts, 2), C, 1e-6),
  });
}

// ───────────── Medium: equations for angles, parallel lines, exterior angles, the Pythagorean theorem ─────────────

function mediumAngleEquation(rng) {
  const kind = rng.pick(['complementary', 'supplementary', 'vertical']);
  const total = kind === 'complementary' ? 90 : 180;
  for (;;) {
    const x = rng.int(5, 24);
    const [c1, c2] = [rng.int(1, 5), rng.int(1, 5)];
    const A = kind === 'complementary' ? rng.int(20, 70) : rng.intExcept(30, 150, [90]);
    const B = kind === 'vertical' ? A : total - A;
    const [d1, d2] = [A - c1 * x, B - c2 * x];
    if (d1 === 0 || d2 === 0 || Math.abs(d1) > 45 || Math.abs(d2) > 45 || (kind === 'vertical' && c1 <= c2)) continue;
    const other = kind === 'vertical' ? (180 - d1 - d2) / (c1 + c2) : c1 === c2 ? null : (d2 - d1) / (c1 - c2);
    const tilt = rng.int(5, 25);
    const visual =
      kind === 'vertical'
        ? { type: 'angle', lines: true, rays: [tilt, tilt + A], arcs: [{ from: tilt, to: tilt + A, label: exprT(c1, d1) }, { from: tilt + 180, to: tilt + A + 180, label: exprT(c2, d2) }], alt: `Two straight lines that cross. One angle is labelled ${exprT(c1, d1)}. The angle directly opposite it is labelled ${exprT(c2, d2)}.` }
        : { type: 'angle', rays: [0, total, A], arcs: [{ from: 0, to: A, label: exprT(c1, d1) }, { from: A, to: total, label: exprT(c2, d2) }, ...(total === 90 ? [{ from: 0, to: 90 }] : [])], ...(total === 90 ? { center: [90, 180] } : {}), alt: `A ${total === 90 ? 'right angle' : 'straight line'} split into two angles by a ray. One angle is labelled ${exprT(c1, d1)} and the other is labelled ${exprT(c2, d2)}.` };
    return q({
      prompt: kind === 'vertical' ? R`Two straight lines cross. What is the value of \(x\)?` : R`The two angles together make a ${total === 90 ? 'right angle' : 'straight line'}. What is the value of \(x\)?`,
      visual,
      correct: x,
      fmt: asX,
      wrong: [
        { value: Number.isInteger(other) && other > 0 ? other : null, why: kind === 'vertical' ? R`These are vertical angles, so they are equal. They do not add up to \(180^\circ\).` : R`The two angles are not equal. Together they make \(${total}^\circ\).` },
        { value: A, why: R`\(${A}\) is the measure of one of the angles. The question asks for \(x\).` },
        kind === 'vertical' ? null : { value: (270 - total - d1 - d2) % (c1 + c2) === 0 && 270 - total - d1 - d2 > 0 ? (270 - total - d1 - d2) / (c1 + c2) : null, why: R`A ${total === 90 ? 'right angle' : 'straight line'} is \(${total}^\circ\), not \(${270 - total}^\circ\).` },
      ],
      solution:
        kind === 'vertical'
          ? [
              R`The two angles are opposite each other, so they are vertical angles. Vertical angles are equal: \(${linear(c1, d1)} = ${linear(c2, d2)}\).`,
              R`Subtract \(${terms([[c2, 'x']])}\) from both sides: \(${linear(c1 - c2, d1)} = ${d2}\).`,
              R`${d1 > 0 ? 'Subtract' : 'Add'} \(${Math.abs(d1)}\): \(${terms([[c1 - c2, 'x']])} = ${d2 - d1}\), so \(x = ${x}\).`,
              R`Check: both angles are \(${A}^\circ\). ✓`,
            ]
          : [
              R`The two angles add up to \(${total}^\circ\): \((${linear(c1, d1)}) + (${linear(c2, d2)}) = ${total}\).`,
              R`Combine like terms: \(${linear(c1 + c2, d1 + d2)} = ${total}\).`,
              R`${d1 + d2 === 0 ? '' : `${d1 + d2 > 0 ? 'Subtract' : 'Add'} \\(${Math.abs(d1 + d2)}\\): \\(${c1 + c2}x = ${total - d1 - d2}\\). `}Divide by \(${c1 + c2}\): \(x = ${x}\).`,
              R`Check: the angles are \(${A}^\circ\) and \(${B}^\circ\), and \(${A} + ${B} = ${total}\). ✓`,
            ],
      rule: kind === 'vertical' ? 1 : 0,
      skill: 'equations for angles',
      check: () => checkAll(checkEqual(c1 * x + d1, A), checkEqual(c2 * x + d2, B), checkEqual(kind === 'vertical' ? A - B : A + B, kind === 'vertical' ? 0 : total)),
    });
  }
}

function mediumTransversal(rng) {
  const s = rng.int(40, 80);
  const type = rng.pick(PAIRS);
  const [p, r] = rng.shuffle(rng.pick(type.list));
  const [given, x] = [size(s, p), size(s, r)];
  return q({
    prompt: 'The two horizontal lines are parallel. What is the measure of the angle marked x?',
    visual: { type: 'transversal', slant: s, labels: { [p]: degT(given), [r]: 'x' }, alt: `Two parallel lines cut by a transversal. The angle ${WHERE[p]} is ${given} degrees. The angle ${WHERE[r]} is marked x.` },
    correct: x,
    fmt: degM,
    wrong: [
      { value: 180 - x, why: type.same ? R`These are ${type.name}: they are ${type.where}. When the lines are parallel they are equal.` : R`These are ${type.name}: they are ${type.where}. When the lines are parallel they add up to \(180^\circ\), so they are not equal.` },
      Math.abs(90 - given),
      360 - given,
    ],
    solution: [
      R`The two marked angles are ${type.name}: they are ${type.where}.`,
      type.same ? R`When the lines are parallel, ${type.name} are equal. So \(x = ${given}^\circ\).` : R`When the lines are parallel, ${type.name} add up to \(180^\circ\). So \(x = 180^\circ - ${given}^\circ = ${x}^\circ\).`,
    ],
    rule: 2,
    skill: type.name,
    check: () => checkAll(checkEqual(regionSize(s, p), given), checkEqual(regionSize(s, r), x)),
  });
}

function mediumExteriorAngle(rng) {
  const A = rng.int(30, 80);
  const B = rng.int(40, Math.min(110, 155 - A));
  const C = 180 - A - B;
  const E = A + C;
  const findExterior = rng.bool();
  const pts = triangle(A, B);
  return q({
    prompt: findExterior ? 'One side of the triangle is extended. What is the measure of the exterior angle marked x?' : R`One side of the triangle is extended to make an exterior angle of \(${E}^\circ\). What is the measure of the angle marked x?`,
    visual: {
      type: 'polygon',
      points: pts,
      angles: [degT(A), '', findExterior ? degT(C) : 'x'],
      extra: [{ from: [10, 0], to: [13, 0], dashed: false, label: findExterior ? 'x' : degT(E), labelSide: 'left' }],
      alt: findExterior ? `A triangle with angles of ${A} degrees and ${C} degrees. The side between the ${A}-degree angle and the third corner is extended past that corner. The exterior angle there is marked x.` : `A triangle with one angle of ${A} degrees and one angle marked x. The side between the ${A}-degree angle and the third corner is extended past that corner. The exterior angle there is ${E} degrees.`,
    },
    correct: findExterior ? E : C,
    fmt: degM,
    wrong: findExterior
      ? [{ value: B, why: R`\(${B}^\circ\) is the third angle inside the triangle. The exterior angle makes a straight line with it: \(180^\circ - ${B}^\circ\).` }, { value: 360 - E, why: R`The exterior angle equals the sum of the two far interior angles: \(${A}^\circ + ${C}^\circ\).` }, 180 - A, 180 - C]
      : [{ value: B, why: R`\(${B}^\circ\) is the interior angle next to the exterior angle. The angle marked \(x\) is one of the two far angles, which add up to \(${E}^\circ\).` }, { value: E + A < 180 ? E + A : null, why: R`The exterior angle is the sum of the two far angles, so subtract: \(${E}^\circ - ${A}^\circ\).` }, 180 - A, 180 - E + A],
    solution: findExterior
      ? [R`An exterior angle of a triangle equals the sum of the two interior angles that are not next to it.`, R`\(x = ${A}^\circ + ${C}^\circ = ${E}^\circ\).`, R`Check: the third interior angle is \(180^\circ - ${A}^\circ - ${C}^\circ = ${B}^\circ\), and \(${B}^\circ + ${E}^\circ = 180^\circ\). ✓`]
      : [R`An exterior angle of a triangle equals the sum of the two interior angles that are not next to it: \(${A}^\circ + x = ${E}^\circ\).`, R`\(x = ${E}^\circ - ${A}^\circ = ${C}^\circ\).`],
    rule: 3,
    skill: 'exterior angles',
    check: () => checkAll(checkEqual(180 - angleAt(pts, 1), E, 1e-6), checkEqual(angleAt(pts, 2), C, 1e-6)),
  });
}

function mediumPythagorean(rng) {
  const [a, b, c] = rng.pick(TRIPLES);
  const findHyp = rng.bool();
  const name = person(rng);
  const story = rng.bool(0.45)
    ? rng.pick(
        findHyp
          ? [
              { text: `${name} walks ${a} blocks east and then ${b} blocks north. How far is ${name} from the starting point, in a straight line?`, unit: 'blocks', first: 'East and north are at right angles, so the two parts of the walk are the legs of a right triangle. The straight-line distance is the hypotenuse.' },
              { text: `A rectangular gate is ${b} feet wide and ${a} feet tall. A brace runs from one corner to the opposite corner. How long is the brace?`, unit: 'feet', first: 'The width and the height of the gate meet at a right angle, so they are the legs of a right triangle. The brace is the hypotenuse.' },
            ]
          : [
              { text: `${an(c)[0].toUpperCase()}${an(c).slice(1)} ${c}-foot ladder leans against a wall. The bottom of the ladder is ${a} feet from the wall. How high up the wall does the ladder reach?`, unit: 'feet', first: 'The wall and the ground meet at a right angle, so the ladder is the hypotenuse of a right triangle. The height is a leg.' },
              { text: `A ramp is ${c} feet long. It covers ${b} feet of level ground. How high is the top of the ramp?`, unit: 'feet', first: 'The level ground and the height meet at a right angle, so the ramp is the hypotenuse of a right triangle. The height is a leg.' },
            ],
      )
    : null;
  const known = story && !findHyp && story.text.includes('ramp') ? b : a;
  const missing = findHyp ? c : known === a ? b : a;
  const unit = story ? story.unit : 'cm';
  return q({
    prompt: story ? story.text : `What is the length of the side marked ${findHyp ? 'c' : 'x'}?`,
    visual: story ? undefined : rightTriangle(findHyp ? b : known, findHyp ? a : missing, findHyp ? [`${b} cm`, 'c', `${a} cm`] : [`${known} cm`, `${c} cm`, 'x'], findHyp ? `A right triangle with legs of ${a} cm and ${b} cm. The hypotenuse is marked c.` : `A right triangle with a hypotenuse of ${c} cm and one leg of ${known} cm. The other leg is marked x.`),
    correct: missing,
    unit,
    wrong: findHyp
      ? [{ value: a + b, why: 'Add the squares of the legs, not the legs themselves. Then take the square root.' }, { value: a * a + b * b, why: R`\(${a * a + b * b}\) is \(c^{2}\). Take the square root to find \(c\).` }, c + 2, c - 1]
      : [{ value: c - known, why: 'Subtract the squares of the sides, not the sides themselves. Then take the square root.' }, { value: c * c - known * known, why: R`\(${c * c - known * known}\) is the square of the missing side. Take the square root.` }, c + known, missing + 1],
    solution: [
      ...(story ? [story.first] : [findHyp ? R`The side marked \(c\) is opposite the right angle, so it is the hypotenuse.` : R`The longest side, \(${c}\), is the hypotenuse. The side marked \(x\) is a leg.`]),
      findHyp ? R`Add the squares of the legs: \(${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${c * c}\).` : R`Subtract the squares: \(${c}^{2} - ${known}^{2} = ${c * c} - ${known * known} = ${missing * missing}\).`,
      R`Take the square root: \(\sqrt{${missing * missing}} = ${missing}\). The answer is ${missing} ${unit}.`,
    ],
    rule: 4,
    skill: findHyp ? 'finding the hypotenuse' : 'finding a leg',
    check: () => checkEqual(findHyp ? Math.hypot(a, b) : Math.sqrt(c * c - known * known), missing),
  });
}

// ───────────── Hard (Grade 8): rounding, the converse, algebra with parallel lines, distance ─────────────

function hardPythagoreanRound(rng) {
  for (;;) {
    const findHyp = rng.bool();
    const a = rng.int(2, 9);
    const b = rng.int(a + 2, 18);
    const square = findHyp ? a * a + b * b : b * b - a * a;
    const root = Math.sqrt(square);
    const v = round(root, 1);
    if (isSquare(square) || Math.abs(root * 10 - Math.round(root * 10)) > 0.4) continue;
    const story = rng.pick(
      findHyp
        ? [
            { text: `A phone screen is ${a} cm wide and ${b} cm tall. How long is its diagonal?`, unit: 'cm' },
            { text: `A pole is ${b} m tall. A wire runs from the top of the pole to a point on the ground ${a} m from the bottom of the pole. How long is the wire?`, unit: 'm' },
            { text: `A rectangular park is ${b} m long and ${a} m wide. How long is a straight path from one corner to the opposite corner?`, unit: 'm' },
          ]
        : [
            { text: `${an(b)[0].toUpperCase()}${an(b).slice(1)} ${b}-foot ladder leans against a wall. The bottom of the ladder is ${a} feet from the wall. How high up the wall does the ladder reach?`, unit: 'feet' },
            { text: `A kite string is ${b} m long and pulled tight. The kite is directly above a spot ${a} m from the person holding the string. How high is the kite?`, unit: 'm' },
          ],
    );
    const far = (w) => (Math.abs(w - v) < 0.35 ? null : w);
    return q({
      prompt: `${story.text} Round to the nearest tenth.`,
      correct: v,
      fmt: (w) => `\\(${num(w, { fixed: 1 })}\\) ${story.unit}`,
      wrong: findHyp
        ? [{ value: a + b, why: 'Add the squares of the two sides, not the sides themselves. Then take the square root.' }, { value: far(round(Math.sqrt(b * b - a * a), 1)), why: 'The missing length is the hypotenuse, so add the squares. Subtracting is for finding a leg.' }, { value: square, why: R`\(${square}\) is the square of the length. Take the square root.` }, far(round(root / 2, 1))]
        : [{ value: far(round(Math.hypot(a, b), 1)), why: R`The \(${b}\) is the hypotenuse, the longest side. To find a leg, subtract the squares.` }, { value: far(b - a), why: 'Subtract the squares of the sides, not the sides themselves. Then take the square root.' }, { value: square, why: R`\(${square}\) is the square of the height. Take the square root.` }, a + b],
      solution: [
        findHyp ? R`The two given lengths meet at a right angle, so they are the legs of a right triangle. The missing length is the hypotenuse.` : R`The \(${b}\) is the hypotenuse of a right triangle, and the \(${a}\) is one leg. The missing length is the other leg.`,
        findHyp ? R`Add the squares of the legs: \(${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${square}\).` : R`Subtract the squares: \(${b}^{2} - ${a}^{2} = ${b * b} - ${a * a} = ${square}\).`,
        R`Take the square root: \(\sqrt{${square}} \approx ${num(v, { fixed: 1 })}\). The answer is about ${num(v, { fixed: 1 })} ${story.unit}.`,
      ],
      rule: 4,
      skill: 'Pythagorean theorem with rounding',
      check: () => (Math.abs((findHyp ? Math.hypot(a, b) : Math.sqrt(b * b - a * a)) - v) <= 0.05 ? true : 'the rounded value is wrong'),
    });
  }
}

function hardConverse(rng) {
  const wantRight = rng.bool();
  const isRight = ([a, b, c]) => a * a + b * b === c * c;
  const scaled = () => {
    const [a, b, c] = rng.pick(TRIPLES.slice(0, 5));
    const k = a === 3 ? rng.int(1, 6) : a === 5 ? rng.int(1, 2) : 1;
    return [a * k, b * k, c * k];
  };
  const bent = () => {
    for (;;) {
      const t = scaled();
      t[rng.int(0, 2)] += rng.pick([-2, -1, 1, 2]);
      t.sort((u, v) => u - v);
      if (t[0] > 1 && t[0] + t[1] > t[2] && !isRight(t)) return t;
    }
  };
  const lists = new Map();
  const add = (t) => lists.set(t.join(', '), t);
  add(wantRight ? scaled() : bent());
  while (lists.size < 4) add(wantRight ? bent() : scaled());
  const [[rightText, [a, b, c]], ...others] = [...lists];
  const [, [u, v, w]] = others[0];
  return q({
    prompt: wantRight ? 'Which three side lengths make a right triangle?' : R`Which three side lengths do **not** make a right triangle?`,
    correct: rightText,
    wrong: others.map(([text]) => text),
    solution: [
      'A triangle is a right triangle when the squares of its two shorter sides add up to the square of its longest side.',
      wantRight ? R`For ${rightText}: \(${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${a * a + b * b}\), and \(${c}^{2} = ${c * c}\). They match, so this is a right triangle.` : R`For ${rightText}: \(${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${a * a + b * b}\), but \(${c}^{2} = ${c * c}\). They do not match, so this is not a right triangle.`,
      wantRight ? R`The other lists fail the test. For example, for ${others[0][0]}: \(${u}^{2} + ${v}^{2} = ${u * u + v * v}\), but \(${w}^{2} = ${w * w}\).` : 'For each of the other lists, the squares of the two shorter sides do add up to the square of the longest side.',
    ],
    rule: 5,
    skill: 'converse of the Pythagorean theorem',
    check: () => (isRight([a, b, c]) === wantRight && others.every(([, t]) => isRight(t) !== wantRight) ? true : 'a list is in the wrong group'),
  });
}

function hardTransversalAlgebra(rng) {
  const askX = rng.bool();
  for (;;) {
    const s = rng.int(40, 80);
    const type = rng.pick(PAIRS);
    const [p, r] = rng.shuffle(rng.pick(type.list));
    const [A, B] = [size(s, p), size(s, r)];
    const x = rng.int(4, 20);
    const [c1, c2] = [rng.int(2, 6), rng.int(1, 5)];
    const [d1, d2] = [A - c1 * x, B - c2 * x];
    if (d1 === 0 || d2 === 0 || Math.abs(d1) > 60 || Math.abs(d2) > 60 || (type.same && c1 <= c2) || x === A) continue;
    const other = type.same ? (180 - d1 - d2) / (c1 + c2) : c1 === c2 ? null : (d2 - d1) / (c1 - c2);
    const slip = Number.isInteger(other) && other > 0 && c1 * other + d1 > 0 && c1 * other + d1 < 180 ? other : null;
    const wrongRule = type.same ? R`Angles \(a\) and \(b\) are ${type.name}, so they are equal. They do not add up to \(180^\circ\).` : R`Angles \(a\) and \(b\) are ${type.name}, so they add up to \(180^\circ\). They are not equal.`;
    return q({
      prompt: R`The two horizontal lines are parallel. Angle \(a\) measures \(${exprM(c1, d1)}\) and angle \(b\) measures \(${exprM(c2, d2)}\). What is ${askX ? R`the value of \(x\)` : R`the measure of angle \(a\)`}?`,
      visual: { type: 'transversal', slant: s, labels: { [p]: 'a', [r]: 'b' }, alt: `Two parallel lines cut by a transversal. Angle a is ${WHERE[p]}. Angle b is ${WHERE[r]}.` },
      correct: askX ? x : A,
      fmt: askX ? asX : degM,
      wrong: askX
        ? [{ value: slip, why: wrongRule }, { value: A, why: R`\(${A}\) is the measure of angle \(a\). The question asks for \(x\).` }]
        : [{ value: x, why: R`\(${x}\) is the value of \(x\). Substitute it into \(${linear(c1, d1)}\) to find angle \(a\).` }, { value: slip === null ? null : c1 * slip + d1, why: wrongRule }, A === B ? null : { value: 180 - A, why: R`\(${180 - A}^\circ\) is the measure of angle \(b\).` }, 180 - A],
      solution: [
        R`Angles \(a\) and \(b\) are ${type.name}: they are ${type.where}.`,
        type.same ? R`The lines are parallel, so these angles are equal: \(${linear(c1, d1)} = ${linear(c2, d2)}\).` : R`The lines are parallel, so these angles add up to \(180^\circ\): \((${linear(c1, d1)}) + (${linear(c2, d2)}) = 180\).`,
        type.same ? R`Collect the \(x\)-terms on the left and the numbers on the right: \(${terms([[c1 - c2, 'x']])} = ${d2 - d1}\), so \(x = ${x}\).` : R`Combine like terms: \(${linear(c1 + c2, d1 + d2)} = 180\). So \(${c1 + c2}x = ${180 - d1 - d2}\) and \(x = ${x}\).`,
        R`Angle \(a\) is \(${c1}(${x}) ${signed(d1)} = ${A}^\circ\) and angle \(b\) is \(${c2}(${x}) ${signed(d2)} = ${B}^\circ\).`,
      ],
      rule: 2,
      skill: 'parallel lines with algebra',
      check: () => checkAll(checkEqual(c1 * x + d1, regionSize(s, p)), checkEqual(c2 * x + d2, regionSize(s, r)), checkEqual(type.same ? A - B : A + B, type.same ? 0 : 180)),
    });
  }
}

function hardDistance(rng) {
  for (;;) {
    const [w, h] = rng.pick([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5]]);
    const [dx, dy] = [w * rng.sign(), h * rng.sign()];
    const [x1, y1] = [rng.int(-7, 7), rng.int(-7, 7)];
    const [x2, y2] = [x1 + dx, y1 + dy];
    if (Math.abs(x2) > 7 || Math.abs(y2) > 7) continue;
    const d = Math.hypot(w, h);
    const sums = (x1 + x2) ** 2 + (y1 + y2) ** 2;
    return q({
      prompt: R`What is the distance between \(A${point(x1, y1)}\) and \(B${point(x2, y2)}\)?`,
      visual: grid(-8, 8, { points: [{ x: x1, y: y1, label: `A ${lab(x1, y1)}` }, { x: x2, y: y2, label: `B ${lab(x2, y2)}` }], segments: [{ from: [x1, y1], to: [x2, y2] }], alt: `A coordinate grid with the points A ${lab(x1, y1)} and B ${lab(x2, y2)} joined by a straight segment.` }),
      correct: d,
      unit: 'units',
      wrong: [
        { value: w + h, why: 'That is the distance along the grid lines. The straight-line distance is the hypotenuse of the right triangle.' },
        { value: w * w + h * h, why: R`\(${w * w + h * h}\) is the square of the distance. Take the square root.` },
        { value: isSquare(sums) && sums > 0 ? Math.sqrt(sums) : null, why: 'Each leg is the difference of the coordinates, not their sum.' },
        Math.max(w, h),
        d + 1,
      ],
      solution: [
        R`Draw a right triangle with \(AB\) as its hypotenuse. Horizontal leg: \(|${x2} - ${paren(x1)}| = ${w}\). Vertical leg: \(|${y2} - ${paren(y1)}| = ${h}\).`,
        R`Use the Pythagorean theorem: \(${w}^{2} + ${h}^{2} = ${w * w} + ${h * h} = ${d * d}\).`,
        R`Take the square root: \(\sqrt{${d * d}} = ${d}\). The distance is ${d} units.`,
      ],
      rule: 6,
      skill: 'distance between two points',
      check: () => checkEqual(Math.hypot(x2 - x1, y2 - y1), d),
    });
  }
}

// ───────────── Challenge: several steps, three dimensions, working with unknowns ─────────────

function challengeBoxOrRectangle(rng) {
  if (rng.bool()) {
    const [l, w, h, d] = [...rng.shuffle(rng.pick([[1, 2, 2], [2, 3, 6], [1, 4, 8], [4, 4, 7], [2, 6, 9], [6, 6, 7], [3, 4, 12], [2, 10, 11], [8, 9, 12], [2, 4, 4], [4, 6, 12], [4, 8, 8]])), 0];
    const floor = l * l + w * w;
    const rod = Math.sqrt(floor + h * h);
    return q({
      prompt: `A box is ${l} cm long, ${w} cm wide and ${h} cm high. A straight rod reaches from one bottom corner to the opposite top corner. How long is the rod?`,
      visual: { type: 'solid', kind: 'box', labels: { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` }, alt: `A box ${l} cm long, ${w} cm wide and ${h} cm high.` },
      correct: rod,
      unit: 'cm',
      wrong: [
        { value: l + w + h, why: 'Adding the three edges gives a path along the edges, not the straight-line distance.' },
        { value: isSquare(floor) ? Math.sqrt(floor) : null, why: 'That is the diagonal of the bottom of the box. The rod also rises through the height, so a second right triangle is needed.' },
        { value: floor + h * h, why: R`\(${floor + h * h}\) is the square of the length. Take the square root.` },
        rod + 1,
        rod + d + 2,
      ],
      solution: [
        R`First find the diagonal of the bottom of the box. It is the hypotenuse of a right triangle with legs \(${l}\) and \(${w}\), so its square is \(${l}^{2} + ${w}^{2} = ${floor}\).`,
        R`The rod is the hypotenuse of a second right triangle. Its legs are that diagonal and the height, so its square is \(${floor} + ${h}^{2} = ${floor} + ${h * h} = ${floor + h * h}\).`,
        R`Take the square root: \(\sqrt{${floor + h * h}} = ${rod}\). The rod is ${rod} cm long.`,
      ],
      rule: 4,
      skill: 'Pythagorean theorem in three dimensions',
      check: () => checkEqual(Math.hypot(l, w, h), rod),
    });
  }
  const [a, b, c] = rng.pick(TRIPLES);
  const area = rng.bool();
  return q({
    prompt: `A rectangle has a diagonal of ${c} cm and a width of ${a} cm. What is its ${area ? 'area' : 'perimeter'}?`,
    visual: { type: 'polygon', points: [[0, 0], [b, 0], [b, a], [0, a]], sides: ['', `${a} cm`, '', ''], right: [0, 1, 2, 3], extra: [{ from: [0, 0], to: [b, a], label: `${c} cm` }], alt: `A rectangle with a width of ${a} cm. Its diagonal is ${c} cm. The length is not given.` },
    correct: area ? a * b : 2 * (a + b),
    unit: area ? 'cm²' : 'cm',
    wrong: area
      ? [{ value: a * c, why: 'The diagonal is not a side of the rectangle. Use the Pythagorean theorem to find the length first.' }, { value: b, why: R`\(${b}\) cm is the length of the rectangle. Multiply it by the width to find the area.` }, { value: (a * b) / 2, why: 'That is the area of one of the two right triangles. The rectangle is twice as large.' }, 2 * (a + b)]
      : [{ value: 2 * (a + c), why: 'The diagonal is not a side of the rectangle. Use the Pythagorean theorem to find the length first.' }, { value: a + b, why: 'That adds one length and one width. A rectangle has two of each.' }, { value: a + b + c, why: 'That is the distance around one of the two right triangles, not around the rectangle.' }, a * b],
    solution: [
      R`The diagonal splits the rectangle into two right triangles. The diagonal, \(${c}\), is the hypotenuse, and the width, \(${a}\), is a leg.`,
      R`Find the length: \(${c}^{2} - ${a}^{2} = ${c * c} - ${a * a} = ${b * b}\), and \(\sqrt{${b * b}} = ${b}\).`,
      area ? R`Area \(= ${b} \times ${a} = ${a * b}\) cm².` : R`Perimeter \(= 2 \times (${b} + ${a}) = ${2 * (a + b)}\) cm.`,
    ],
    rule: 4,
    skill: 'Pythagorean theorem in two steps',
    check: () => checkAll(checkEqual(Math.hypot(a, b), c), checkEqual(area ? a * Math.sqrt(c * c - a * a) : 2 * (a + Math.sqrt(c * c - a * a)), area ? a * b : 2 * (a + b))),
  });
}

function challengeDistance(rng) {
  if (rng.bool()) {
    const [w, h, hyp] = rng.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]);
    const [sx, sy] = [rng.sign(), rng.sign()];
    const [x1, y1] = [rng.int(-6, 6 - w) + (sx < 0 ? w : 0), rng.int(-6, 6 - h) + (sy < 0 ? h : 0)];
    const [x2, y2] = [x1 + sx * w, y1 + sy * h];
    const corners = [[x1, y1], [x2, y1], [x2, y2]];
    return q({
      prompt: R`A triangle has vertices \(A${point(x1, y1)}\), \(B${point(x2, y1)}\) and \(C${point(x2, y2)}\). What is its perimeter?`,
      visual: grid(-7, 7, { polygons: [{ points: corners }], points: corners.map(([x, y], i) => ({ x, y, label: `${'ABC'[i]} ${lab(x, y)}` })), alt: `A coordinate grid with a triangle. Its corners are A ${lab(x1, y1)}, B ${lab(x2, y1)} and C ${lab(x2, y2)}.` }),
      correct: w + h + hyp,
      unit: 'units',
      wrong: [
        { value: w + h, why: R`That adds only the sides \(AB\) and \(BC\). Find \(AC\) with the Pythagorean theorem and add it too.` },
        { value: (w * h) / 2, why: 'That is the area of the triangle. The perimeter is the distance around it.' },
        { value: hyp, why: R`That is only the side \(AC\). The perimeter is the sum of all three sides.` },
        2 * (w + h),
        w + h + hyp + 2,
      ],
      solution: [
        R`\(AB\) is horizontal and \(BC\) is vertical, so they meet at a right angle. \(AB = |${x2} - ${paren(x1)}| = ${w}\) and \(BC = |${y2} - ${paren(y1)}| = ${h}\).`,
        R`\(AC\) is the hypotenuse: \(${w}^{2} + ${h}^{2} = ${w * w} + ${h * h} = ${hyp * hyp}\), and \(\sqrt{${hyp * hyp}} = ${hyp}\).`,
        R`Perimeter \(= ${w} + ${h} + ${hyp} = ${w + h + hyp}\) units.`,
      ],
      rule: 6,
      skill: 'perimeter on the coordinate plane',
      check: () => checkEqual(Math.abs(x2 - x1) + Math.abs(y2 - y1) + Math.hypot(x2 - x1, y2 - y1), w + h + hyp),
    });
  }
  for (;;) {
    const [x1, y1, x2, y2] = [rng.int(-7, 7), rng.int(-7, 7), rng.int(-7, 7), rng.int(-7, 7)];
    const [w, h] = [Math.abs(x2 - x1), Math.abs(y2 - y1)];
    const square = w * w + h * h;
    const root = Math.sqrt(square);
    const v = round(root, 1);
    if (w < 2 || h < 2 || isSquare(square) || Math.abs(root * 10 - Math.round(root * 10)) > 0.4) continue;
    const far = (t) => (Math.abs(t - v) < 0.35 ? null : t);
    return q({
      prompt: R`What is the distance between \(A${point(x1, y1)}\) and \(B${point(x2, y2)}\)? Round to the nearest tenth.`,
      visual: grid(-8, 8, { points: [{ x: x1, y: y1, label: `A ${lab(x1, y1)}` }, { x: x2, y: y2, label: `B ${lab(x2, y2)}` }], segments: [{ from: [x1, y1], to: [x2, y2] }], alt: `A coordinate grid with the points A ${lab(x1, y1)} and B ${lab(x2, y2)} joined by a straight segment.` }),
      correct: v,
      fmt: (t) => `\\(${num(t, { fixed: 1 })}\\) units`,
      wrong: [
        { value: w + h, why: 'That is the distance along the grid lines. The straight-line distance is the hypotenuse of the right triangle.' },
        { value: square, why: R`\(${square}\) is the square of the distance. Take the square root.` },
        { value: far(round(Math.hypot(x1 + x2, y1 + y2), 1)), why: 'Each leg is the difference of the coordinates, not their sum.' },
        far(Math.max(w, h)),
        far(round(root / 2, 1)),
      ],
      solution: [
        R`Draw a right triangle with \(AB\) as its hypotenuse. Horizontal leg: \(|${x2} - ${paren(x1)}| = ${w}\). Vertical leg: \(|${y2} - ${paren(y1)}| = ${h}\).`,
        R`Use the Pythagorean theorem: \(${w}^{2} + ${h}^{2} = ${w * w} + ${h * h} = ${square}\).`,
        R`Take the square root: \(\sqrt{${square}} \approx ${num(v, { fixed: 1 })}\). The distance is about ${num(v, { fixed: 1 })} units.`,
      ],
      rule: 6,
      skill: 'distance between two points',
      check: () => (Math.abs(Math.hypot(x2 - x1, y2 - y1) - v) <= 0.05 ? true : 'the rounded value is wrong'),
    });
  }
}

function challengeTriangleAlgebra(rng) {
  if (rng.bool()) {
    const [p, r, t] = rng.pick([[1, 2, 3], [2, 3, 4], [1, 1, 2], [2, 3, 5], [1, 2, 2], [3, 4, 5], [1, 3, 5], [2, 2, 5], [1, 4, 5], [2, 7, 9], [3, 5, 10], [1, 5, 6], [2, 5, 8], [4, 5, 6]]);
    const x = 180 / (p + r + t);
    const pts = triangle(r * x, t * x);
    const part = (k) => `${k === 1 ? '' : k}x°`;
    return q({
      prompt: R`The angles of a triangle measure \(${terms([[p, 'x']])}^\circ\), \(${terms([[r, 'x']])}^\circ\) and \(${terms([[t, 'x']])}^\circ\). What is the measure of the largest angle?`,
      visual: { type: 'polygon', points: pts, angles: [part(r), part(t), part(p)], alt: `A triangle whose angles are labelled ${part(p)}, ${part(r)} and ${part(t)}.` },
      correct: t * x,
      fmt: degM,
      wrong: [
        { value: x, why: R`\(${x}\) is the value of \(x\). The largest angle is \(${t}x\).` },
        { value: (360 * t) / (p + r + t), why: R`The angles of a triangle add up to \(180^\circ\), not \(360^\circ\).` },
        r === t ? null : r * x,
        180 - t * x,
        p * x,
      ],
      solution: [
        R`The angles of a triangle add up to \(180^\circ\): \(${terms([[p, 'x'], [r, 'x'], [t, 'x']])} = 180\).`,
        R`Combine like terms: \(${p + r + t}x = 180\), so \(x = ${x}\).`,
        R`The largest angle is \(${t}x = ${t} \times ${x} = ${t * x}^\circ\).`,
      ],
      rule: 3,
      skill: 'triangle angles with algebra',
      check: () => checkAll(checkEqual(p * x + r * x + t * x, 180), checkEqual(angleAt(pts, 1), t * x, 1e-6)),
    });
  }
  for (;;) {
    const A = rng.int(30, 80);
    const B = rng.int(40, Math.min(110, 155 - A));
    const C = 180 - A - B;
    const E = A + C;
    const x = rng.int(5, 20);
    const [c1, c2] = [rng.int(1, 5), rng.int(1, 5)];
    const [d1, d2] = [A - c1 * x, C - c2 * x];
    if (d1 === 0 || d2 === 0 || Math.abs(d1) > 40 || Math.abs(d2) > 40 || x === A) continue;
    const slip = (180 - d1 - d2) / (c1 + c2);
    const pts = triangle(A, B);
    return q({
      prompt: R`One side of the triangle is extended to make an exterior angle of \(${E}^\circ\). What is the value of \(x\)?`,
      visual: { type: 'polygon', points: pts, angles: [exprT(c1, d1), '', exprT(c2, d2)], extra: [{ from: [10, 0], to: [13, 0], dashed: false, label: degT(E), labelSide: 'left' }], alt: `A triangle with one angle labelled ${exprT(c1, d1)} and another labelled ${exprT(c2, d2)}. A side is extended past the third corner, and the exterior angle there is ${E} degrees.` },
      correct: x,
      fmt: asX,
      wrong: [
        { value: Number.isInteger(slip) && slip > 0 ? slip : null, why: R`The two labelled angles are not next to the exterior angle, so they add up to \(${E}^\circ\), not \(180^\circ\).` },
        { value: A, why: R`\(${A}\) is the measure of one of the angles. The question asks for \(x\).` },
        { value: (E + d1 + d2) % (c1 + c2) === 0 ? (E + d1 + d2) / (c1 + c2) : null, why: R`To move \(${d1 + d2}\) to the other side, do the opposite on both sides.` },
      ],
      solution: [
        R`An exterior angle equals the sum of the two interior angles that are not next to it: \((${linear(c1, d1)}) + (${linear(c2, d2)}) = ${E}\).`,
        R`Combine like terms: \(${linear(c1 + c2, d1 + d2)} = ${E}\).`,
        R`${d1 + d2 === 0 ? '' : `${d1 + d2 > 0 ? 'Subtract' : 'Add'} \\(${Math.abs(d1 + d2)}\\): \\(${c1 + c2}x = ${E - d1 - d2}\\). `}Divide by \(${c1 + c2}\): \(x = ${x}\).`,
        R`Check: the two angles are \(${A}^\circ\) and \(${C}^\circ\), and \(${A} + ${C} = ${E}\). ✓`,
      ],
      rule: 3,
      skill: 'exterior angles with algebra',
      check: () => checkAll(checkEqual(c1 * x + d1 + c2 * x + d2, E), checkEqual(180 - angleAt(pts, 1), E, 1e-6)),
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'pythagorean-angles',
  title: 'Angles, Triangles & the Pythagorean Theorem',
  summary: 'Find missing angles made by crossing lines, parallel lines and triangles, and use the Pythagorean theorem to find lengths and distances.',
  grade: 'Grades 7–8',
  standards: ['CCSS 7.G.B.5', 'CCSS 8.G.A.5', 'CCSS 8.G.B.7', 'CCSS 8.G.B.8'],

  explain: {
    intro: R`A few facts about angles let you find a missing angle without measuring it. In a right triangle, the **Pythagorean theorem** links the three sides, so two sides are enough to find the third. The same idea gives the distance between two points on a grid.`,
    rules: [
      {
        title: 'Complementary and supplementary angles',
        text: R`Two angles are **complementary** if they add up to \(90^\circ\), a right angle. They are **supplementary** if they add up to \(180^\circ\), a straight line. To find a missing angle, subtract the known angle from the total.`,
        example: R`The complement of \(35^\circ\) is \(90^\circ - 35^\circ = 55^\circ\). The supplement of \(35^\circ\) is \(180^\circ - 35^\circ = 145^\circ\).`,
      },
      {
        title: 'Vertical and adjacent angles',
        text: R`When two straight lines cross, the angles opposite each other are **vertical angles**, and they are equal. Angles next to each other (**adjacent** angles) on a straight line add up to \(180^\circ\).`,
        example: R`Two lines cross and one angle is \(130^\circ\). The angle opposite it is also \(130^\circ\). Each angle next to it is \(180^\circ - 130^\circ = 50^\circ\).`,
      },
      {
        title: 'Parallel lines cut by a transversal',
        text: R`A line that crosses two parallel lines makes eight angles, but they come in only two sizes. **Corresponding angles** (in the same position at each crossing) are equal. **Alternate interior angles** (between the parallel lines, on opposite sides of the transversal) are equal. **Same-side interior angles** add up to \(180^\circ\).`,
        example: R`In the picture, angles 2 and 6 are corresponding, angles 3 and 6 are alternate interior, and angles 4 and 6 are same-side interior. If angle 2 is \(65^\circ\), then angles 6 and 3 are \(65^\circ\) and angle 4 is \(115^\circ\).`,
      },
      {
        title: 'Angles in a triangle',
        text: R`The three angles of a triangle add up to \(180^\circ\). An **exterior angle**, made by extending one side, equals the sum of the two interior angles that are not next to it.`,
        example: R`A triangle has angles of \(48^\circ\) and \(67^\circ\). The third angle is \(180^\circ - 48^\circ - 67^\circ = 65^\circ\). The exterior angle next to it is \(48^\circ + 67^\circ = 115^\circ\).`,
      },
      {
        title: 'The Pythagorean theorem',
        text: R`In a right triangle, the two sides that make the right angle are the **legs**, \(a\) and \(b\). The side opposite the right angle is the **hypotenuse**, \(c\). It is the longest side. The sides are linked by \(a^{2} + b^{2} = c^{2}\). To find the hypotenuse, add the squares of the legs and take the square root. To find a leg, subtract the squares instead.`,
        example: R`Legs 6 and 8: \(c^{2} = 6^{2} + 8^{2} = 100\), so \(c = 10\). Hypotenuse 13 and leg 5: \(b^{2} = 13^{2} - 5^{2} = 144\), so \(b = 12\).`,
      },
      {
        title: 'The converse: is it a right triangle?',
        text: R`If the squares of the two shorter sides add up to the square of the longest side, the triangle is a right triangle. If they do not, it is not a right triangle.`,
        example: R`Sides 7, 24, 25: \(7^{2} + 24^{2} = 49 + 576 = 625\), and \(25^{2} = 625\), so it is a right triangle. Sides 5, 6, 8: \(25 + 36 = 61\), but \(8^{2} = 64\), so it is not.`,
      },
      {
        title: 'Distance between two points',
        text: R`Draw a right triangle whose hypotenuse joins the two points. One leg is the difference of the \(x\)-coordinates and the other is the difference of the \(y\)-coordinates. Then use the Pythagorean theorem.`,
        example: R`From \((1, 2)\) to \((4, 6)\): the legs are \(4 - 1 = 3\) and \(6 - 2 = 4\), so the distance is \(\sqrt{3^{2} + 4^{2}} = \sqrt{25} = 5\).`,
      },
    ],
    vocab: [
      { term: 'complementary angles', def: R`Two angles that add up to \(90^\circ\).` },
      { term: 'supplementary angles', def: R`Two angles that add up to \(180^\circ\).` },
      { term: 'vertical angles', def: 'The two angles opposite each other where two lines cross. They are equal.' },
      { term: 'transversal', def: 'A line that crosses two or more other lines.' },
      { term: 'exterior angle', def: 'The angle between one side of a triangle and the extension of the side next to it.' },
      { term: 'hypotenuse', def: 'The side of a right triangle opposite the right angle. It is the longest side.' },
      { term: 'legs', def: 'The two sides of a right triangle that make the right angle.' },
    ],
    mistakes: [
      R`Mixing up complementary (\(90^\circ\)) and supplementary (\(180^\circ\)).`,
      R`Treating the angle next to a given angle as equal to it. Only opposite (vertical) angles are equal. Neighbours on a straight line add up to \(180^\circ\).`,
      R`Adding the sides instead of their squares: with legs 3 and 4, the hypotenuse is 5, not 7.`,
      R`Stopping before the square root: \(c^{2} = 25\) means \(c = 5\).`,
      R`Adding the squares when the hypotenuse is already known. To find a leg, subtract.`,
    ],
    visual: [
      { type: 'transversal', labels: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8' }, alt: 'Two parallel lines cut by a transversal. The four angles at the top crossing are numbered 1 (upper left), 2 (upper right), 3 (lower left) and 4 (lower right). The four angles at the bottom crossing are numbered 5, 6, 7 and 8 in the same pattern.' },
      rightTriangle(4, 3, ['leg a', 'hypotenuse c', 'leg b'], 'A right triangle. The two sides that make the right angle are labelled leg a and leg b. The longest side, opposite the right angle, is labelled hypotenuse c.'),
    ],
  },

  examples: [
    {
      title: 'Two lines that cross',
      problem: R`Two straight lines cross. One of the four angles is \(130^\circ\). Find the other three angles.`,
      steps: [R`The angle opposite the \(130^\circ\) angle is a vertical angle, so it is also \(130^\circ\).`, R`Each angle next to the \(130^\circ\) angle makes a straight line with it: \(180^\circ - 130^\circ = 50^\circ\).`, R`Check: the four angles make a full turn. \(130 + 50 + 130 + 50 = 360\). ✓`],
      answer: R`\(130^\circ\), \(50^\circ\) and \(50^\circ\)`,
      visual: { type: 'angle', lines: true, rays: [10, 140], arcs: [{ from: 10, to: 140, label: '130°' }, { from: 140, to: 190, label: '50°' }, { from: 190, to: 320, label: '130°' }, { from: 320, to: 370, label: '50°' }], alt: 'Two crossing lines. The four angles around the crossing point are 130 degrees, 50 degrees, 130 degrees and 50 degrees. Opposite angles are equal.' },
    },
    {
      title: 'Parallel lines and a transversal',
      problem: R`The two lines are parallel. Find \(x\) and \(y\).`,
      steps: [
        R`The \(65^\circ\) angle and \(x\) are in the same position at each crossing, so they are corresponding angles. Corresponding angles are equal: \(x = 65^\circ\).`,
        R`The angle \(y\) is next to \(x\) on a straight line, so \(y = 180^\circ - 65^\circ = 115^\circ\).`,
      ],
      answer: R`\(x = 65^\circ\) and \(y = 115^\circ\)`,
      visual: { type: 'transversal', slant: 65, labels: { 2: '65°', 6: 'x', 5: 'y' }, alt: 'Two parallel lines cut by a transversal. The angle above the top line, to the right of the transversal, is 65 degrees. The angle above the bottom line, to the right of the transversal, is marked x. The angle above the bottom line, to the left of the transversal, is marked y.' },
    },
    {
      title: 'A triangle and its exterior angle',
      problem: R`A triangle has angles of \(48^\circ\) and \(67^\circ\). Find the third angle and the exterior angle next to it.`,
      steps: [R`The angles of a triangle add up to \(180^\circ\), so the third angle is \(180^\circ - 48^\circ - 67^\circ = 65^\circ\).`, R`The exterior angle makes a straight line with the third angle: \(180^\circ - 65^\circ = 115^\circ\).`, R`A quicker way: the exterior angle equals the sum of the two far interior angles, \(48^\circ + 67^\circ = 115^\circ\).`],
      answer: R`Third angle \(65^\circ\); exterior angle \(115^\circ\)`,
      visual: { type: 'polygon', points: triangle(48, 65), angles: ['48°', '65°', '67°'], extra: [{ from: [10, 0], to: [13, 0], dashed: false, label: '115°', labelSide: 'left' }], alt: 'A triangle with angles of 48, 65 and 67 degrees. The side next to the 65-degree angle is extended, and the exterior angle there is 115 degrees.' },
    },
    {
      title: 'Word problem: a ladder against a wall',
      word: true,
      problem: 'A 13-foot ladder leans against a wall. The bottom of the ladder is 5 feet from the wall. How high up the wall does the ladder reach?',
      steps: [
        'The wall and the ground meet at a right angle, so the ladder, the wall and the ground make a right triangle. The ladder is the hypotenuse.',
        R`The height is a leg, so subtract the squares: \(13^{2} - 5^{2} = 169 - 25 = 144\).`,
        R`Take the square root: \(\sqrt{144} = 12\).`,
      ],
      answer: 'The ladder reaches 12 feet up the wall.',
      visual: rightTriangle(5, 12, ['5 ft', '13 ft', '?'], 'A right triangle. The ground is 5 feet, the ladder is the hypotenuse of 13 feet, and the height on the wall is unknown.'),
    },
    {
      title: 'Distance between two points',
      problem: R`Find the distance between \((-2, -1)\) and \((2, 2)\).`,
      steps: [
        R`Draw a right triangle with the two points at the ends of its hypotenuse. Horizontal leg: \(|2 - (-2)| = 4\). Vertical leg: \(|2 - (-1)| = 3\).`,
        R`Use the Pythagorean theorem: \(4^{2} + 3^{2} = 16 + 9 = 25\).`,
        R`Take the square root: \(\sqrt{25} = 5\).`,
      ],
      answer: '5 units',
      visual: grid(-4, 4, { points: [{ x: -2, y: -1, label: '(−2, −1)' }, { x: 2, y: 2, label: '(2, 2)' }], segments: [{ from: [-2, -1], to: [2, 2] }, { from: [-2, -1], to: [2, -1], dashed: true, label: '4 across' }, { from: [2, -1], to: [2, 2], dashed: true, label: '3 up' }], alt: 'A coordinate grid with the points (−2, −1) and (2, 2) joined by a segment. Dashed legs show 4 units across and 3 units up.' }),
    },
  ],

  models: [
    {
      id: 'parallel-lines',
      title: 'All eight angles at a transversal',
      intro: 'Choose one angle. The picture shows the other seven angles made by the two parallel lines and the transversal.',
      inputs: [{ name: 'a', label: 'Angle above the top line, right of the transversal (degrees)', type: 'int', min: 30, max: 150, value: 65 }],
      compute({ a }) {
        const b = 180 - a;
        return {
          problem: R`Two parallel lines are cut by a transversal. The angle above the top line, to the right of the transversal, is \(${a}^\circ\). Find the other seven angles.`,
          steps: [
            R`The angle opposite it at the same crossing is a vertical angle, so it is also \(${a}^\circ\).`,
            R`Each angle next to it makes a straight line with it: \(180^\circ - ${a}^\circ = ${b}^\circ\).`,
            'The lines are parallel, so corresponding angles are equal. The bottom crossing has the same four angles in the same positions.',
            a === 90 ? 'All eight angles are right angles: the transversal is perpendicular to both lines.' : R`Check with a pair of same-side interior angles: \(${a}^\circ + ${b}^\circ = 180^\circ\). ✓`,
          ],
          answer: a === 90 ? R`All eight angles are \(90^\circ\)` : R`Four angles are \(${a}^\circ\) and four are \(${b}^\circ\)`,
          visual: { type: 'transversal', slant: Math.min(140, Math.max(40, a)), labels: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((p) => [p, degT(size(a, p))])), alt: `Two parallel lines cut by a transversal. At each crossing the upper-right and lower-left angles are ${a} degrees, and the upper-left and lower-right angles are ${b} degrees.` },
        };
      },
    },
    {
      id: 'distance-between-points',
      title: 'Distance between two points',
      intro: 'Choose two points. The steps build a right triangle and use the Pythagorean theorem.',
      inputs: [
        { name: 'x1', label: 'First point: x', type: 'int', min: -8, max: 8, value: -3 },
        { name: 'y1', label: 'First point: y', type: 'int', min: -8, max: 8, value: -2 },
        { name: 'x2', label: 'Second point: x', type: 'int', min: -8, max: 8, value: 3 },
        { name: 'y2', label: 'Second point: y', type: 'int', min: -8, max: 8, value: 6 },
      ],
      compute({ x1, y1, x2, y2 }) {
        const [w, h] = [Math.abs(x2 - x1), Math.abs(y2 - y1)];
        if (w === 0 && h === 0) return { error: 'The two points are the same, so the distance is 0. Change one of the points.' };
        const square = w * w + h * h;
        const root = Math.sqrt(square);
        const problem = R`Find the distance between \(${point(x1, y1)}\) and \(${point(x2, y2)}\).`;
        const points = [{ x: x1, y: y1, label: lab(x1, y1) }, { x: x2, y: y2, label: lab(x2, y2) }];
        if (w === 0 || h === 0) {
          return {
            problem,
            steps: [`The two points are on the same ${w === 0 ? 'vertical' : 'horizontal'} line, so no triangle is needed.`, R`The distance is the difference of the ${w === 0 ? R`\(y\)` : R`\(x\)`}-coordinates: \(${w + h}\).`],
            answer: R`\(${w + h}\) units`,
            visual: grid(-9, 9, { points, segments: [{ from: [x1, y1], to: [x2, y2] }], alt: `A coordinate grid with the points ${lab(x1, y1)} and ${lab(x2, y2)} joined by a ${w === 0 ? 'vertical' : 'horizontal'} segment.` }),
          };
        }
        const whole = isSquare(square);
        return {
          problem,
          steps: [
            R`Draw a right triangle with the two points at the ends of its hypotenuse. Horizontal leg: \(|${x2} - ${paren(x1)}| = ${w}\). Vertical leg: \(|${y2} - ${paren(y1)}| = ${h}\).`,
            R`Use the Pythagorean theorem: \(${w}^{2} + ${h}^{2} = ${w * w} + ${h * h} = ${square}\).`,
            whole ? R`Take the square root: \(\sqrt{${square}} = ${root}\).` : R`Take the square root: \(\sqrt{${square}} \approx ${num(root, { fixed: 2 })}\). (\(${square}\) is not a perfect square, so the distance is not a whole number.)`,
          ],
          answer: whole ? R`\(${root}\) units` : R`\(\sqrt{${square}} \approx ${num(root, { fixed: 2 })}\) units`,
          visual: grid(-9, 9, { points, segments: [{ from: [x1, y1], to: [x2, y2] }, { from: [x1, y1], to: [x2, y1], dashed: true, label: `${w} across` }, { from: [x2, y1], to: [x2, y2], dashed: true, label: `${h} ${y2 > y1 ? 'up' : 'down'}` }], alt: `A coordinate grid with the points ${lab(x1, y1)} and ${lab(x2, y2)} joined by a segment. Dashed legs show ${w} units across and ${h} units ${y2 > y1 ? 'up' : 'down'}.` }),
        };
      },
    },
    {
      id: 'ladder',
      title: 'Word problem: a ladder against a wall',
      word: true,
      intro: 'Change the length of the ladder and how far its bottom is from the wall.',
      inputs: [
        { name: 'len', label: 'Length of the ladder (feet)', type: 'int', min: 5, max: 30, value: 10 },
        { name: 'base', label: 'Distance from the wall (feet)', type: 'int', min: 1, max: 20, value: 6 },
      ],
      compute({ len, base }) {
        if (base >= len) return { error: 'The ladder must be longer than its distance from the wall. Make the ladder longer, or move its bottom closer to the wall.' };
        const square = len * len - base * base;
        const height = Math.sqrt(square);
        const whole = isSquare(square);
        const shown = whole ? `${height}` : num(height, { fixed: 1 });
        return {
          problem: `${an(len) === 'an' ? 'An' : 'A'} ${len}-foot ladder leans against a wall. The bottom of the ladder is ${base} ${base === 1 ? 'foot' : 'feet'} from the wall. How high up the wall does the ladder reach?`,
          steps: [
            'The wall and the ground meet at a right angle, so the ladder, the wall and the ground make a right triangle. The ladder is the hypotenuse.',
            R`The height is a leg, so subtract the squares: \(${len}^{2} - ${base}^{2} = ${len * len} - ${base * base} = ${square}\).`,
            whole ? R`Take the square root: \(\sqrt{${square}} = ${height}\).` : R`Take the square root: \(\sqrt{${square}} \approx ${shown}\), to the nearest tenth.`,
          ],
          answer: whole ? `The ladder reaches ${shown} feet up the wall.` : `The ladder reaches about ${shown} feet up the wall.`,
          visual: rightTriangle(base, height, [`${base} ft`, `${len} ft`, 'h'], `A right triangle. The ground is ${base} feet, the ladder is the hypotenuse of ${len} feet, and the height h on the wall is about ${shown} feet.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyAnglePairs, easyCrossingLines, easyTriangleSum],
    medium: [mediumAngleEquation, mediumTransversal, mediumExteriorAngle, mediumPythagorean],
    hard: [hardPythagoreanRound, hardConverse, hardTransversalAlgebra, hardDistance],
    challenge: [challengeBoxOrRectangle, challengeDistance, challengeTriangleAlgebra],
  },
};
