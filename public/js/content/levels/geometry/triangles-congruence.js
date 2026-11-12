import { R, q, num, linear, person, plural } from '../../lib/index.js';
import { deg, degM, degT, rad, angleAt, triSSS, triAA, midpoint, arcMark, angleMark, rightMark, tickMark, labelAt } from './_shared.js';

const asX = (v) => R`\(x = ${num(v)}\)`;
const expr = (a, b) => (b === 0 ? R`${linear(a, 0)}^\circ` : R`(${linear(a, b)})^\circ`);
const posInt = (n, d) => (d !== 0 && n % d === 0 && n / d > 0 ? n / d : null);
const r3 = (v) => Math.round(v * 1000) / 1000;
const LETTERS = [['A', 'B', 'C', 'D', 'E', 'F'], ['P', 'Q', 'R', 'X', 'Y', 'Z'], ['J', 'K', 'L', 'M', 'N', 'P'], ['R', 'S', 'T', 'U', 'V', 'W'], ['A', 'B', 'C', 'X', 'Y', 'Z'], ['D', 'E', 'F', 'G', 'H', 'K']];

// An isosceles triangle with the given base angle: base on the bottom, apex (index 2) on top.
const isoPts = (base, half = 3) => [[0, 0], [2 * half, 0], [half, r3(half * Math.tan(rad(base)))]];
const congS = (L, M, i, j) => R`\(\overline{${L[i]}${L[j]}} \cong \overline{${M[i]}${M[j]}}\)`;
const congA = (L, M, i) => R`\(\angle ${L[i]} \cong \angle ${M[i]}\)`;
const edgeOf = (i, j) => ((i + 1) % 3 === j ? i : j); // polygon edge e joins vertex e to vertex e + 1

// ───────────── Easy ─────────────

function easyThirdAngle(rng) {
  for (;;) {
    const A = rng.int(25, 105);
    const B = rng.int(25, 105);
    const C = 180 - A - B;
    if (C < 20) continue;
    const pts = triAA(A, B);
    return q({
      prompt: R`Two angles of a triangle measure \(${deg(A)}\) and \(${deg(B)}\). What is the measure of the third angle?`,
      visual: { type: 'polygon', points: pts, angles: [degT(A), degT(B), 'x'], alt: `A triangle with angles of ${A} degrees and ${B} degrees. The third angle is marked x.` },
      correct: C,
      fmt: degM,
      wrong: [
        { value: A + B, why: R`That is the sum of the two known angles. Subtract it from \(180^\circ\).` },
        { value: 360 - A - B, why: R`The angles of a triangle add to \(180^\circ\), not \(360^\circ\).` },
        180 - A,
        180 - B,
        C + 10,
      ],
      solution: [R`The three angles of a triangle add to \(180^\circ\).`, R`\(${A} + ${B} = ${A + B}\), and \(180 - ${A + B} = ${C}\).`, R`The third angle measures \(${deg(C)}\).`],
      rule: 0,
      skill: 'triangle angle sum',
      check: () => (Math.abs(angleAt(pts[0], pts[2], pts[1]) - C) < 0.05 ? true : 'the figure has a different third angle'),
    });
  }
}

function easyIsosceles(rng) {
  const fromVertex = rng.bool();
  const base = fromVertex ? rng.int(20, 80) : rng.int(25, 80);
  const V = 180 - 2 * base;
  const pts = isoPts(base);
  const figure = (labels, alt) => ({ type: 'polygon', points: pts, marks: [0, 1, 1], angles: labels, alt });
  if (fromVertex) {
    return q({
      prompt: R`An isosceles triangle has a vertex angle of \(${deg(V)}\) between its two congruent sides. What is the measure of each base angle?`,
      visual: figure(['x', 'x', degT(V)], `An isosceles triangle with two congruent sides meeting at the top. The top angle is ${V} degrees and each bottom angle is marked x.`),
      correct: base,
      fmt: degM,
      wrong: [
        { value: 180 - V, why: 'That is the sum of the two base angles. They are congruent, so divide it by 2.' },
        { value: V, why: 'All three angles are equal only in an equilateral triangle.' },
        90 - V > 0 ? 90 - V : null,
        base + 10,
        base > 15 ? base - 10 : base + 20,
      ],
      solution: [
        R`The base angles of an isosceles triangle are congruent. Call each one \(x\).`,
        R`Angle sum: \(x + x + ${V} = 180\), so \(2x = ${180 - V}\).`,
        R`\(x = ${base}\). Each base angle measures \(${deg(base)}\).`,
      ],
      rule: 2,
      skill: 'isosceles triangles',
      check: () => (Math.abs(angleAt(pts[1], pts[0], pts[2]) - base) < 0.05 && Math.abs(angleAt(pts[0], pts[2], pts[1]) - V) < 0.05 ? true : 'the figure has different angles'),
    });
  }
  return q({
    prompt: R`Each base angle of an isosceles triangle measures \(${deg(base)}\). What is the measure of the vertex angle, between the two congruent sides?`,
    visual: figure([degT(base), degT(base), 'x'], `An isosceles triangle with two congruent sides meeting at the top. Each bottom angle is ${base} degrees and the top angle is marked x.`),
    correct: V,
    fmt: degM,
    wrong: [
      { value: 180 - base, why: R`There are two base angles of \(${deg(base)}\). Subtract both from \(180^\circ\).` },
      { value: base, why: 'All three angles are equal only in an equilateral triangle.' },
      90 - base > 0 ? 90 - base : null,
      2 * base,
      V + 10,
    ],
    solution: [
      R`The two base angles are congruent, so together they measure \(2 \cdot ${base} = ${2 * base}\) degrees.`,
      R`Angle sum: \(180 - ${2 * base} = ${V}\).`,
      R`The vertex angle measures \(${deg(V)}\).`,
    ],
    rule: 2,
    skill: 'isosceles triangles',
    check: () => (Math.abs(angleAt(pts[0], pts[2], pts[1]) - V) < 0.05 ? true : 'the figure has a different vertex angle'),
  });
}

function easyExterior(rng) {
  const A = rng.int(30, 80);
  const C = rng.int(30, 75);
  const E = A + C;
  // Keep the slips (180 − one angle, the interior angle) well away from the right answer.
  if ([180 - A, 180 - C, 180 - E].some((v) => Math.abs(v - E) < 4)) return easyExterior(rng);
  const pts = triAA(A, 180 - E, 8);
  return q({
    prompt: R`A triangle has interior angles of \(${deg(A)}\) and \(${deg(C)}\). At the third vertex, one side is extended to form an exterior angle, as shown. Find \(x\), the measure of that exterior angle.`,
    visual: {
      type: 'polygon',
      points: pts,
      angles: [degT(A), '', degT(C)],
      extra: [{ from: [8, 0], to: [11.5, 0], dashed: false }, ...arcMark([8, 0], 0, E, 1, 'x')],
      alt: `A triangle with interior angles of ${A} degrees at the bottom left and ${C} degrees at the top. The bottom side is extended to the right past the third vertex, and the exterior angle there is marked x.`,
    },
    correct: E,
    fmt: degM,
    wrong: [
      { value: 180 - E, why: 'That is the interior angle at the same vertex. The exterior angle is its supplement.' },
      { value: 180 - A, why: 'The exterior angle equals the sum of both remote interior angles.' },
      180 - C,
      Math.abs(A - C) || A,
      360 - E,
    ],
    solution: [
      R`An exterior angle of a triangle equals the sum of the two remote interior angles (the two angles that do not touch it).`,
      R`\(x = ${A} + ${C} = ${E}\).`,
      R`Check: the interior angle at that vertex is \(180 - ${E} = ${180 - E}\) degrees, and \(${A} + ${C} + ${180 - E} = 180\). ✓`,
    ],
    rule: 1,
    skill: 'exterior angles',
    check: () => (Math.abs(angleAt([11.5, 0], pts[1], pts[2]) - E) < 0.05 ? true : 'the figure has a different exterior angle'),
  });
}

function easyWhichTriple(rng) {
  for (;;) {
    const good = [rng.int(3, 9)];
    good.push(good[0] + rng.int(0, 5));
    good.push(rng.int(good[1], good[0] + good[1] - 1));
    const short = () => {
      const a = rng.int(2, 8);
      const b = a + rng.int(0, 5);
      return [a, b, a + b + rng.int(1, 5)];
    };
    const flat = (() => {
      const a = rng.int(2, 8);
      const b = a + rng.int(0, 5);
      return [a, b, a + b];
    })();
    const bad = [short(), short()];
    const all = [good, flat, ...bad];
    if (new Set(all.map((t) => t.join())).size < 4) continue;
    const show = (t) => R`\(${t[0]},\ ${t[1]},\ ${t[2]}\)`;
    return q({
      prompt: 'Which three lengths could be the side lengths of a triangle?',
      correct: show(good),
      wrong: [
        { value: show(flat), why: R`\(${flat[0]} + ${flat[1]}\) is exactly \(${flat[2]}\), so the two shorter sides would lie flat along the longest one. The sum must be greater.` },
        { value: show(bad[0]), why: R`\(${bad[0][0]} + ${bad[0][1]} = ${bad[0][0] + bad[0][1]}\), which is less than \(${bad[0][2]}\). The two shorter sides cannot reach each other.` },
        show(bad[1]),
      ],
      solution: [
        'In a triangle, the two shorter sides together must be longer than the longest side.',
        R`\(${good[0]} + ${good[1]} = ${good[0] + good[1]}\), which is greater than \(${good[2]}\), so \(${good[0]}, ${good[1]}, ${good[2]}\) works.`,
        R`The others fail: \(${flat[0]} + ${flat[1]} = ${flat[2]}\) (not greater), \(${bad[0][0]} + ${bad[0][1]} < ${bad[0][2]}\) and \(${bad[1][0]} + ${bad[1][1]} < ${bad[1][2]}\).`,
      ],
      rule: 3,
      skill: 'triangle inequality',
      check: () => (all.filter((t) => t[0] + t[1] > t[2] && t[0] + t[2] > t[1] && t[1] + t[2] > t[0]).length === 1 && good[0] + good[1] > good[2] ? true : 'not exactly one valid triple'),
    });
  }
}

// ───────────── Medium ─────────────

const CRITERIA = {
  SSS: { parts: (i, j, k) => [['s', i, j], ['s', j, k], ['s', k, i]], why: 'All three pairs of sides are congruent: Side-Side-Side.' },
  SAS: { parts: (i, j) => [['s', i, j], ['a', j], ['s', j, 3 - i - j]], why: 'Two pairs of sides are congruent, and so are the angles between them (the included angles): Side-Angle-Side.' },
  ASA: { parts: (i, j) => [['a', i], ['s', i, j], ['a', j]], why: 'Two pairs of angles are congruent, and so are the sides between them (the included sides): Angle-Side-Angle.' },
  AAS: { parts: (i, j) => [['a', i], ['a', j], ['s', j, 3 - i - j]], why: 'Two pairs of angles are congruent, and so is a pair of sides that is not between them: Angle-Angle-Side.' },
  HL: { parts: (i, j, k) => [['r', k], ['s', i, j], ['s', j, k]], why: 'Both are right triangles, with congruent hypotenuses and a pair of congruent legs: Hypotenuse-Leg.' },
};

// Two congruent triangles drawn as mirror images, with tick marks and angle marks on the given parts.
function criterionFigure(parts, L, M, angles) {
  const pts = triAA(angles[0], angles[1], 10);
  const marks = [0, 0, 0];
  const angleLabels = ['', '', ''];
  const right = [];
  const words = [];
  let ticks = 0;
  let dots = 0;
  for (const p of parts) {
    if (p[0] === 's') {
      marks[edgeOf(p[1], p[2])] = ++ticks;
      words.push(`side ${L[p[1]]}${L[p[2]]} and side ${M[p[1]]}${M[p[2]]}`);
    } else if (p[0] === 'a') {
      angleLabels[p[1]] = '•'.repeat(++dots);
      words.push(`angle ${L[p[1]]} and angle ${M[p[1]]}`);
    } else {
      right.push(p[1]);
      words.push(`right angles at ${L[p[1]]} and ${M[p[1]]}`);
    }
  }
  return [
    { type: 'polygon', points: pts, vertices: L, marks, angles: angleLabels, right, alt: `Triangle ${L.join('')}, drawn beside triangle ${M.join('')}. Matching marks show these congruent parts: ${words.join('; ')}.` },
    { type: 'polygon', points: pts.map(([x, y]) => [10 - x, y]), vertices: M, marks, angles: angleLabels, right, fill: 'b', alt: `Triangle ${M.join('')}, with the same marks as triangle ${L.join('')}.` },
  ];
}

const partText = (p, L, M) => (p[0] === 's' ? congS(L, M, p[1], p[2]) : p[0] === 'a' ? congA(L, M, p[1]) : R`\(\angle ${L[p[1]]}\) and \(\angle ${M[p[1]]}\) are right angles`);

function shapeAngles(rng, rightAt = null) {
  if (rightAt == null) {
    for (;;) {
      const a = rng.int(40, 75);
      const b = rng.int(40, 75);
      if (180 - a - b >= 35 && Math.abs(a - b) > 6) return [a, b, 180 - a - b];
    }
  }
  const t = rng.pick([32, 35, 38, 52, 55, 58]);
  const out = [t, 90 - t, 0];
  out.splice(rightAt, 0, 90);
  return out.slice(0, 3);
}

function mediumCriterion(rng) {
  const set = rng.pick(LETTERS);
  const L = set.slice(0, 3);
  const M = set.slice(3);
  const key = rng.pick(Object.keys(CRITERIA));
  const [i, j] = rng.pick([[0, 1], [1, 2], [2, 0], [1, 0], [2, 1], [0, 2]]);
  const k = 3 - i - j;
  const parts = CRITERIA[key].parts(i, j, k);
  const angles = shapeAngles(rng, key === 'HL' ? k : null);
  const confusable = { SSS: ['SAS', 'ASA', 'HL'], SAS: ['ASA', 'SSS', 'AAS'], ASA: ['AAS', 'SAS', 'SSS'], AAS: ['ASA', 'SAS', 'HL'], HL: ['SAS', 'SSS', 'AAS'] }[key];
  return q({
    prompt: R`In \(\triangle ${L.join('')}\) and \(\triangle ${M.join('')}\): ${parts.map((p) => partText(p, L, M)).join(', ')}. Which criterion proves that the triangles are congruent?`,
    visual: criterionFigure(parts, L, M, angles),
    correct: key,
    wrong: confusable,
    solution: [
      `List what is given, in order around the triangle: ${parts.map((p) => (p[0] === 's' ? 'a side' : p[0] === 'a' ? 'an angle' : 'a right angle')).join(', ')}.`,
      CRITERIA[key].why,
      R`So \(\triangle ${L.join('')} \cong \triangle ${M.join('')}\) by ${key}.`,
    ],
    rule: 4,
    skill: 'congruence criteria',
  });
}

function mediumCpctc(rng) {
  for (;;) {
    const set = rng.pick(LETTERS);
    const L = set.slice(0, 3);
    const M = rng.shuffle(set.slice(3));
    const len = [rng.int(5, 14), rng.int(5, 14), rng.int(5, 14)]; // len[e] is the side joining L[e] and L[e + 1]
    if (new Set(len).size < 3 || 2 * Math.max(...len) >= len[0] + len[1] + len[2] - 1) continue;
    const [i, j] = rng.pick([[0, 1], [1, 2], [2, 0], [1, 0], [2, 1], [0, 2]]);
    const answer = len[edgeOf(i, j)];
    // The slip of matching vertices alphabetically instead of by position.
    const sorted = [...M].sort();
    const alpha = len[edgeOf(sorted.indexOf(M[i]), sorted.indexOf(M[j]))];
    const pts = triSSS(len[1], len[2], len[0]);
    return q({
      prompt: R`\(\triangle ${L.join('')} \cong \triangle ${M.join('')}\). In \(\triangle ${L.join('')}\), \(${L[0]}${L[1]} = ${len[0]}\) cm, \(${L[1]}${L[2]} = ${len[1]}\) cm and \(${L[2]}${L[0]} = ${len[2]}\) cm. What is the length of \(\overline{${M[i]}${M[j]}}\)?`,
      visual: { type: 'polygon', points: pts, vertices: L, sides: len.map((v) => `${v} cm`), alt: `Triangle ${L.join('')} with ${L[0]}${L[1]} = ${len[0]} cm, ${L[1]}${L[2]} = ${len[1]} cm and ${L[2]}${L[0]} = ${len[2]} cm.` },
      correct: answer,
      unit: 'cm',
      wrong: [
        alpha !== answer ? { value: alpha, why: 'Match vertices by their positions in the congruence statement, not by alphabetical order.' } : null,
        ...len.filter((v) => v !== answer && v !== alpha),
        len[0] + len[1] + len[2] - answer,
        answer + 2,
      ],
      solution: [
        R`The order of the letters shows which vertices match: \(${L[0]} \leftrightarrow ${M[0]}\), \(${L[1]} \leftrightarrow ${M[1]}\), \(${L[2]} \leftrightarrow ${M[2]}\).`,
        R`\(${M[i]}\) matches \(${L[i]}\) and \(${M[j]}\) matches \(${L[j]}\), so \(\overline{${M[i]}${M[j]}}\) corresponds to \(\overline{${L[i]}${L[j]}}\).`,
        R`Corresponding parts of congruent triangles are congruent: \(${M[i]}${M[j]} = ${L[i]}${L[j]} = ${answer}\) cm.`,
      ],
      rule: 5,
      skill: 'corresponding parts',
    });
  }
}

// Triangle ABC with base BC, and M, N the midpoints of AB and AC. Vertex order in the picture: B, C, N, A, M.
function midFigure(ab, ac, bc, baseLabel, midLabel, alt) {
  const [B, C, A] = triSSS(ac, ab, bc);
  const M = midpoint(A, B);
  const N = midpoint(A, C);
  return { type: 'polygon', points: [B, C, N, A, M], vertices: ['B', 'C', 'N', 'A', 'M'], marks: [0, 1, 1, 2, 2], sides: [baseLabel, '', '', '', ''], extra: [{ from: M, to: N, dashed: false, label: midLabel }], alt };
}

function midShape(rng, bc) {
  for (;;) {
    const ab = Math.round(bc * rng.float(0.6, 1.1));
    const ac = Math.round(bc * rng.float(0.6, 1.1));
    if (ab + ac > bc * 1.25 && Math.abs(ab - ac) < bc * 0.6) return [ab, ac];
  }
}

function mediumMidsegment(rng) {
  const k = rng.int(3, 18);
  const [ab, ac] = midShape(rng, 2 * k);
  const kind = rng.pick(['half', 'double', 'medial']);
  const lead = R`In \(\triangle ABC\), \(M\) is the midpoint of \(\overline{AB}\) and \(N\) is the midpoint of \(\overline{AC}\).`;
  if (kind === 'half') {
    return q({
      prompt: R`${lead} If \(BC = ${2 * k}\) cm, what is \(MN\)?`,
      visual: midFigure(ab, ac, 2 * k, `${2 * k} cm`, 'x', `Triangle ABC with M the midpoint of AB and N the midpoint of AC. Segment MN is drawn and marked x. Side BC is ${2 * k} cm.`),
      correct: k,
      unit: 'cm',
      wrong: [
        { value: 4 * k, why: 'A midsegment is half as long as the side it is parallel to, not twice as long.' },
        { value: 2 * k, why: 'The midsegment is parallel to the third side but only half as long.' },
        posInt(k, 2),
        k + 2,
        k + 5,
      ],
      solution: [R`\(\overline{MN}\) joins the midpoints of two sides, so it is a midsegment.`, R`A midsegment is parallel to the third side and half as long: \(MN = \frac{1}{2}BC = \frac{1}{2}(${2 * k}) = ${k}\) cm.`],
      rule: 6,
      skill: 'midsegments',
    });
  }
  if (kind === 'double') {
    return q({
      prompt: R`${lead} If \(MN = ${k}\) cm, what is \(BC\)?`,
      visual: midFigure(ab, ac, 2 * k, 'x', `${k} cm`, `Triangle ABC with M the midpoint of AB and N the midpoint of AC. Segment MN is ${k} cm. Side BC is marked x.`),
      correct: 2 * k,
      unit: 'cm',
      wrong: [
        { value: k, why: 'The midsegment is half as long as the third side, so the third side is twice as long as the midsegment.' },
        posInt(k, 2) == null ? null : { value: posInt(k, 2), why: 'The third side is the longer one: it is twice the midsegment, not half of it.' },
        3 * k,
        2 * k + 2,
        k + 2,
      ],
      solution: [R`\(\overline{MN}\) is a midsegment, so \(MN = \frac{1}{2}BC\).`, R`\(BC = 2 \cdot MN = 2 \cdot ${k} = ${2 * k}\) cm.`],
      rule: 6,
      skill: 'midsegments',
    });
  }
  const sides = [2 * k, 2 * Math.ceil(ab / 2), 2 * Math.ceil(ac / 2)];
  const P = sides[0] + sides[1] + sides[2];
  const [B, C, A] = triSSS(sides[2], sides[1], sides[0]);
  const mids = [midpoint(A, B), midpoint(A, C), midpoint(B, C)];
  return q({
    prompt: R`The sides of a triangle are \(${sides[0]}\) cm, \(${sides[1]}\) cm and \(${sides[2]}\) cm long. The midpoints of the three sides are joined to make a smaller triangle. What is the perimeter of the smaller triangle?`,
    visual: {
      type: 'polygon',
      points: [B, C, A],
      sides: [`${sides[0]} cm`, `${sides[2]} cm`, `${sides[1]} cm`],
      extra: [{ from: mids[0], to: mids[1], dashed: false }, { from: mids[1], to: mids[2], dashed: false }, { from: mids[2], to: mids[0], dashed: false }],
      alt: `A triangle with sides ${sides[0]} cm, ${sides[1]} cm and ${sides[2]} cm. The midpoints of its sides are joined to form a smaller triangle inside it.`,
    },
    correct: P / 2,
    unit: 'cm',
    wrong: [
      { value: P, why: 'That is the perimeter of the large triangle. Each side of the small triangle is a midsegment, half as long as a side of the large one.' },
      posInt(P, 4) == null ? null : { value: posInt(P, 4), why: 'Each midsegment is half of the side it is parallel to, so the perimeter is halved, not quartered.' },
      P / 2 + sides[0] / 2,
      P / 2 - 2,
      P / 2 + 3,
    ],
    solution: [
      'Each side of the small triangle joins two midpoints, so it is a midsegment: half as long as the side of the large triangle it is parallel to.',
      R`The small triangle has sides \(${sides[0] / 2}\), \(${sides[1] / 2}\) and \(${sides[2] / 2}\) cm.`,
      R`Perimeter: \(${sides[0] / 2} + ${sides[1] / 2} + ${sides[2] / 2} = ${P / 2}\) cm, half of \(${P}\) cm.`,
    ],
    rule: 6,
    skill: 'midsegments',
    check: () => {
      const d = (p, r) => Math.hypot(p[0] - r[0], p[1] - r[1]);
      const got = d(mids[0], mids[1]) + d(mids[1], mids[2]) + d(mids[2], mids[0]);
      return Math.abs(got - P / 2) < 0.05 ? true : `midpoint triangle has perimeter ${got}`;
    },
  });
}

function mediumStory(rng) {
  const name = person(rng);
  const a = rng.int(4, 15);
  const b = a + rng.int(1, 12);
  const greatest = rng.bool();
  const [item, job] = rng.pick([['strips of wood', 'a triangular picture frame'], ['plastic straws', 'a triangle for a model bridge'], ['metal rods', 'a triangular brace'], ['craft sticks', 'a triangular ornament']]);
  return q({
    prompt: R`${name} is making ${job} from three ${item}. Two of them are \(${a}\) cm and \(${b}\) cm long. The third must be a whole number of centimetres. What is the **${greatest ? 'greatest' : 'least'}** length it can be?`,
    correct: greatest ? a + b - 1 : b - a + 1,
    unit: 'cm',
    wrong: greatest
      ? [
          { value: a + b, why: R`With a third side of exactly \(${a + b}\) cm the three pieces would lie flat in a line. The third side must be shorter than the other two together.` },
          a + b + 1,
          b,
          b - a + 1,
          a + b - 2,
        ]
      : [
          { value: b - a, why: R`With a third side of exactly \(${b - a}\) cm, \(${b - a} + ${a} = ${b}\), so the pieces would lie flat in a line. The third side must be longer than that.` },
          b - a > 1 ? b - a - 1 : a + b,
          a,
          a + b - 1,
          b - a + 2,
        ],
    solution: [
      'The three pieces make a triangle only if each one is shorter than the other two put together.',
      R`So the third length \(x\) satisfies \(x < ${a} + ${b} = ${a + b}\) and \(x + ${a} > ${b}\), which means \(x > ${b - a}\).`,
      greatest ? R`The greatest whole number less than \(${a + b}\) is \(${a + b - 1}\) cm.` : R`The least whole number greater than \(${b - a}\) is \(${b - a + 1}\) cm.`,
    ],
    rule: 3,
    skill: 'triangle word problems',
    check: () => {
      const ok = (x) => x + a > b && x + b > a && a + b > x;
      const x = greatest ? a + b - 1 : b - a + 1;
      return ok(x) && !ok(greatest ? x + 1 : x - 1) ? true : 'not the extreme whole-number length';
    },
  });
}

// ───────────── Hard ─────────────

function hardExteriorAlgebra(rng) {
  for (;;) {
    const A = rng.int(30, 75);
    const C = rng.int(30, 75);
    const E = A + C;
    const x = rng.int(4, 16);
    const a1 = rng.int(1, 5);
    const a2 = rng.int(1, 5);
    const a3 = rng.intExcept(2, 12, [a1 + a2]);
    const b1 = A - a1 * x;
    const b2 = C - a2 * x;
    const b3 = E - a3 * x;
    if ([b1, b2, b3].some((b) => Math.abs(b) > 45) || (b1 === 0 && b2 === 0)) continue;
    const slip = posInt(180 - b1 - b2 - b3, a1 + a2 + a3);
    const askX = rng.bool();
    if (askX && slip == null) continue;
    const pts = triAA(A, 180 - E, 8);
    const side = a1 + a2 - a3;
    return q({
      prompt: R`In \(\triangle ABC\), side \(\overline{AB}\) is extended past \(B\) to form the exterior angle \(\angle 1\). \(m\angle A = ${expr(a1, b1)}\), \(m\angle C = ${expr(a2, b2)}\) and \(m\angle 1 = ${expr(a3, b3)}\). ${askX ? R`Find \(x\).` : R`What is \(m\angle 1\)?`}`,
      visual: {
        type: 'polygon',
        points: pts,
        vertices: ['A', 'B', 'C'],
        extra: [{ from: [8, 0], to: [11.5, 0], dashed: false }, ...arcMark([8, 0], 0, E, 1, '1')],
        alt: 'Triangle ABC with side AB extended past B. Angle 1 is the exterior angle at B, between the extension and side BC.',
      },
      correct: askX ? x : E,
      fmt: askX ? asX : degM,
      wrong: askX
        ? [
            { value: slip, why: R`\(\angle 1\) is not an interior angle of the triangle. It equals the sum of the two remote interior angles, \(\angle A\) and \(\angle C\).` },
            { value: E, why: R`That is \(m\angle 1\). The question asks for \(x\).` },
            x + 2,
            x > 3 ? x - 2 : x + 4,
            x + 5,
          ]
        : [
            { value: 180 - E, why: R`That is the interior angle at \(B\). \(\angle 1\) is its supplement.` },
            { value: x, why: R`That is the value of \(x\). Substitute it into \(${linear(a3, b3)}\).` },
            A,
            C,
            E + 10,
          ],
      solution: [
        R`An exterior angle equals the sum of the two remote interior angles: \((${linear(a1, b1)}) + (${linear(a2, b2)}) = ${linear(a3, b3)}\).`,
        R`Combine like terms: \(${linear(a1 + a2, b1 + b2)} = ${linear(a3, b3)}\), so \(${linear(Math.abs(side), 0)} = ${Math.abs(b3 - b1 - b2)}\) and \(x = ${x}\).`,
        R`Check: \(m\angle A = ${deg(A)}\), \(m\angle C = ${deg(C)}\) and \(m\angle 1 = ${deg(E)}\), and \(${A} + ${C} = ${E}\). ✓`,
      ],
      rule: 1,
      skill: 'exterior angles',
      check: () => (a1 * x + b1 + a2 * x + b2 === a3 * x + b3 && Math.abs(angleAt([11.5, 0], pts[1], pts[2]) - E) < 0.05 ? true : 'exterior angle relation fails'),
    });
  }
}

function hardIsoscelesAlgebra(rng) {
  for (;;) {
    if (rng.bool()) {
      const x = rng.int(2, 9);
      const leg = rng.int(8, 30);
      const base = rng.int(5, Math.min(2 * leg - 3, 40));
      const a1 = rng.int(1, 5);
      const a2 = rng.intExcept(1, 6, [a1]);
      const a3 = rng.int(1, 4);
      const b1 = leg - a1 * x;
      const b2 = leg - a2 * x;
      const b3 = base - a3 * x;
      if ([b1, b2, b3].some((b) => Math.abs(b) > 25 || b === 0) || Math.abs(base - leg) < 3) continue;
      const P = 2 * leg + base;
      const h = Math.sqrt(leg * leg - (base * base) / 4);
      return q({
        prompt: R`In isosceles \(\triangle ABC\), \(\overline{AB} \cong \overline{AC}\). The side lengths, in centimetres, are \(AB = ${linear(a1, b1)}\), \(AC = ${linear(a2, b2)}\) and \(BC = ${linear(a3, b3)}\). What is the perimeter of the triangle?`,
        visual: { type: 'polygon', points: [[0, 0], [base, 0], [base / 2, r3(h)]], vertices: ['B', 'C', 'A'], marks: [0, 1, 1], alt: 'Isosceles triangle ABC with congruent sides AB and AC meeting at the top vertex A, and base BC.' },
        correct: P,
        unit: 'cm',
        wrong: [
          { value: leg, why: 'That is the length of one of the congruent sides. Add all three sides for the perimeter.' },
          { value: 3 * leg, why: R`Only \(\overline{AB}\) and \(\overline{AC}\) are congruent. \(BC = ${base}\) cm.` },
          leg + base,
          P + a3,
          2 * base + leg,
        ],
        solution: [
          R`The congruent sides have equal lengths: \(${linear(a1, b1)} = ${linear(a2, b2)}\).`,
          R`Collect terms: \(${linear(Math.abs(a1 - a2), 0)} = ${Math.abs(b2 - b1)}\), so \(x = ${x}\).`,
          R`Substitute: \(AB = AC = ${leg}\) and \(BC = ${base}\).`,
          R`Perimeter: \(${leg} + ${leg} + ${base} = ${P}\) cm.`,
        ],
        rule: 2,
        skill: 'isosceles triangles',
        check: () => (a1 * x + b1 === a2 * x + b2 && a1 * x + b1 + a2 * x + b2 + a3 * x + b3 === P && 2 * leg > base ? true : 'sides do not fit an isosceles triangle'),
      });
    }
    const base = rng.int(35, 75);
    const V = 180 - 2 * base;
    const x = rng.int(4, 15);
    const a1 = rng.int(1, 5);
    const a2 = rng.int(1, 6);
    const b1 = base - a1 * x;
    const b2 = V - a2 * x;
    if (Math.abs(b1) > 40 || Math.abs(b2) > 40 || base === 60) continue;
    const slipX = posInt(180 - b1 - b2, a1 + a2);
    const slip = slipX == null ? null : a2 * slipX + b2;
    const pts = isoPts(base);
    return q({
      prompt: R`In isosceles \(\triangle ABC\), \(\overline{AB} \cong \overline{AC}\). Each base angle measures \(${expr(a1, b1)}\) and the vertex angle \(\angle A\) measures \(${expr(a2, b2)}\). What is \(m\angle A\)?`,
      visual: { type: 'polygon', points: pts, vertices: ['B', 'C', 'A'], marks: [0, 1, 1], alt: 'Isosceles triangle ABC with congruent sides AB and AC meeting at the top vertex A. The base angles are at B and C.' },
      correct: V,
      fmt: degM,
      wrong: [
        { value: base, why: R`That is a base angle. The question asks for the vertex angle, \(${linear(a2, b2)}\).` },
        slip != null && slip > 0 && slip < 180 ? { value: slip, why: R`There are two base angles, so the equation is \(2(${linear(a1, b1)}) + (${linear(a2, b2)}) = 180\).` } : null,
        { value: x, why: R`That is the value of \(x\). Substitute it to get the angle.` },
        180 - base,
        V + 10,
      ],
      solution: [
        R`The two base angles are congruent, so the angle sum is \(2(${linear(a1, b1)}) + (${linear(a2, b2)}) = 180\).`,
        R`Distribute and combine: \(${linear(2 * a1 + a2, 2 * b1 + b2)} = 180\), so \(${2 * a1 + a2}x = ${180 - 2 * b1 - b2}\) and \(x = ${x}\).`,
        R`Substitute: \(m\angle A = ${deg(V)}\). (Each base angle is \(${deg(base)}\), and \(${base} + ${base} + ${V} = 180\). ✓)`,
      ],
      rule: 2,
      skill: 'isosceles triangles',
      check: () => (2 * (a1 * x + b1) + a2 * x + b2 === 180 && Math.abs(angleAt(pts[0], pts[2], pts[1]) - V) < 0.05 ? true : 'angles do not fit an isosceles triangle'),
    });
  }
}

function hardMissingPart(rng) {
  const set = rng.pick(LETTERS);
  const L = set.slice(0, 3);
  const M = set.slice(3);
  const [i, j] = rng.pick([[0, 1], [1, 2], [2, 0], [1, 0], [2, 1], [0, 2]]);
  const k = 3 - i - j;
  const S = (a, b) => congS(L, M, a, b);
  const A = (a) => congA(L, M, a);
  const target = rng.pick(['SAS', 'ASA', 'AAS', 'SSS']);
  const plan = {
    SAS: {
      given: [S(i, j), A(i)],
      need: S(i, k),
      wrong: [
        { value: S(j, k), why: 'With that side, the congruent angles would not be between the two pairs of sides. That is SSA, which does not prove congruence.' },
        { value: A(j), why: 'That would prove the triangles congruent, but by ASA, not by SAS.' },
        A(k),
      ],
      how: 'SAS needs two pairs of sides with the angle between them. The given angle is formed by the given side and one other side, so that other side is the one needed.',
    },
    ASA: {
      given: [A(i), S(i, j)],
      need: A(j),
      wrong: [
        { value: A(k), why: 'That would prove the triangles congruent, but by AAS, because the side would not be between the two angles.' },
        { value: S(i, k), why: 'That would prove the triangles congruent, but by SAS, not by ASA.' },
        S(j, k),
      ],
      how: 'ASA needs two pairs of angles with the side between them. The given side joins the given angle to one other angle, so that other angle is the one needed.',
    },
    AAS: {
      given: [A(i), A(j)],
      need: S(j, k),
      wrong: [
        { value: S(i, j), why: 'That is the side between the two angles, which gives ASA, not AAS.' },
        { value: A(k), why: 'Three pairs of congruent angles only show that the triangles have the same shape. They could be different sizes.' },
        R`\(\overline{${L[j]}${L[k]}} \cong \overline{${M[i]}${M[j]}}\)`,
      ],
      how: 'AAS needs two pairs of angles and a pair of corresponding sides that is not between them.',
    },
    SSS: {
      given: [S(i, j), S(j, k)],
      need: S(k, i),
      wrong: [
        { value: A(j), why: 'That would prove the triangles congruent, but by SAS, not by SSS.' },
        { value: A(i), why: 'Two pairs of sides and an angle that is not between them (SSA) do not prove congruence.' },
        A(k),
      ],
      how: 'SSS needs all three pairs of sides, so the third pair of sides is the one needed.',
    },
  }[target];
  return q({
    prompt: R`In \(\triangle ${L.join('')}\) and \(\triangle ${M.join('')}\), ${plan.given[0]} and ${plan.given[1]}. Which additional fact would prove \(\triangle ${L.join('')} \cong \triangle ${M.join('')}\) by **${target}**?`,
    correct: plan.need,
    wrong: plan.wrong,
    solution: [plan.how, R`The fact needed is ${plan.need}.`],
    rule: 4,
    skill: 'congruence criteria',
  });
}

function hardSideOrder(rng) {
  for (;;) {
    const ang = [rng.int(25, 110), rng.int(25, 110), 0];
    ang[2] = 180 - ang[0] - ang[1];
    if (ang[2] < 20 || new Set(ang).size < 3) continue;
    const names = ['A', 'B', 'C'];
    const opposite = [R`\(\overline{BC}\)`, R`\(\overline{AC}\)`, R`\(\overline{AB}\)`];
    const longest = rng.bool();
    const pick = ang.indexOf(longest ? Math.max(...ang) : Math.min(...ang));
    const [i, j] = rng.shuffle([0, 1, 2]);
    const k = 3 - i - j;
    if (rng.bool()) {
      return q({
        prompt: R`In \(\triangle ABC\), \(m\angle ${names[i]} = ${deg(ang[i])}\) and \(m\angle ${names[j]} = ${deg(ang[j])}\). Which side of the triangle is the **${longest ? 'longest' : 'shortest'}**?`,
        correct: opposite[pick],
        wrong: [...opposite.filter((_, n) => n !== pick), 'It cannot be determined from the angles.'],
        solution: [
          R`Find the third angle: \(m\angle ${names[k]} = 180 - ${ang[i]} - ${ang[j]} = ${ang[k]}\) degrees.`,
          R`The ${longest ? 'largest' : 'smallest'} angle is \(\angle ${names[pick]}\) (\(${deg(ang[pick])}\)).`,
          R`The ${longest ? 'longest' : 'shortest'} side is opposite the ${longest ? 'largest' : 'smallest'} angle. The side opposite \(\angle ${names[pick]}\) is ${opposite[pick]}.`,
        ],
        rule: 3,
        skill: 'side and angle order',
        check: () => {
          const pts = triAA(ang[0], ang[1]); // A, B, C
          const len = [Math.hypot(pts[1][0] - pts[2][0], pts[1][1] - pts[2][1]), Math.hypot(pts[0][0] - pts[2][0], pts[0][1] - pts[2][1]), Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1])];
          return len.indexOf(longest ? Math.max(...len) : Math.min(...len)) === pick ? true : 'side order does not match the angles';
        },
      });
    }
    // The reverse: sides given, which angle is largest or smallest?
    const s = [rng.int(5, 20), rng.int(5, 20), rng.int(5, 20)]; // s[n] is opposite vertex n
    if (new Set(s).size < 3 || 2 * Math.max(...s) >= s[0] + s[1] + s[2]) continue;
    const sp = s.indexOf(longest ? Math.max(...s) : Math.min(...s));
    const angleNames = names.map((n) => R`\(\angle ${n}\)`);
    return q({
      prompt: R`In \(\triangle ABC\), \(BC = ${s[0]}\), \(AC = ${s[1]}\) and \(AB = ${s[2]}\). Which angle of the triangle is the **${longest ? 'largest' : 'smallest'}**?`,
      correct: angleNames[sp],
      wrong: [...angleNames.filter((_, n) => n !== sp), 'It cannot be determined from the sides.'],
      solution: [
        R`The ${longest ? 'longest' : 'shortest'} side is ${opposite[sp]}, with length \(${s[sp]}\).`,
        R`The ${longest ? 'largest' : 'smallest'} angle is opposite the ${longest ? 'longest' : 'shortest'} side. The angle opposite ${opposite[sp]} is \(\angle ${names[sp]}\), the vertex that is not an endpoint of that side.`,
      ],
      rule: 3,
      skill: 'side and angle order',
      check: () => {
        const pts = triSSS(s[0], s[1], s[2]); // A, B, C
        const a = [angleAt(pts[1], pts[0], pts[2]), angleAt(pts[0], pts[1], pts[2]), angleAt(pts[0], pts[2], pts[1])];
        return a.indexOf(longest ? Math.max(...a) : Math.min(...a)) === sp ? true : 'angle order does not match the sides';
      },
    });
  }
}

// ───────────── Challenge ─────────────

const KITE = [[0, 4], [-3, 1], [0, -3], [3, 1]]; // A top, B left, C bottom, D right
const PROOFS = [
  {
    given: R`\(\overline{AB} \cong \overline{CB}\), and \(\overline{BD}\) bisects \(\angle ABC\)`,
    prove: R`\(\overline{AD} \cong \overline{CD}\)`,
    steps: [
      [R`\(\overline{AB} \cong \overline{CB}\)`, 'Given'],
      [R`\(\angle ABD \cong \angle CBD\)`, 'Definition of angle bisector', ['Vertical angles are congruent', 'CPCTC', 'Reflexive property']],
      [R`\(\overline{BD} \cong \overline{BD}\)`, 'Reflexive property', ['Symmetric property', 'CPCTC', 'Definition of angle bisector']],
      [R`\(\triangle ABD \cong \triangle CBD\)`, 'SAS', ['SSS', 'ASA', 'AAS']],
      [R`\(\overline{AD} \cong \overline{CD}\)`, 'CPCTC', ['Reflexive property', 'SAS', 'Definition of angle bisector']],
    ],
    visual: {
      type: 'polygon',
      points: [[-3, 0], [0, 4], [3, 0], [0, -2.5]],
      vertices: ['A', 'B', 'C', 'D'],
      marks: [1, 1, 0, 0],
      extra: [{ from: [0, 4], to: [0, -2.5], dashed: false }, ...angleMark([-3, 0], [0, 4], [0, -2.5], 0.9), ...angleMark([0, -2.5], [0, 4], [3, 0], 1.05)],
      alt: 'A four-sided figure ABCD with B at the top and D at the bottom. Diagonal BD is drawn, splitting it into triangles ABD and CBD. Sides AB and CB have matching tick marks, and the two angles at B are marked as equal.',
    },
  },
  {
    given: R`\(\overline{AB} \cong \overline{AD}\) and \(\overline{CB} \cong \overline{CD}\)`,
    prove: R`\(\angle B \cong \angle D\)`,
    steps: [
      [R`\(\overline{AB} \cong \overline{AD}\)`, 'Given'],
      [R`\(\overline{CB} \cong \overline{CD}\)`, 'Given'],
      [R`\(\overline{AC} \cong \overline{AC}\)`, 'Reflexive property', ['Transitive property', 'CPCTC', 'Definition of midpoint']],
      [R`\(\triangle ABC \cong \triangle ADC\)`, 'SSS', ['SAS', 'ASA', 'HL']],
      [R`\(\angle B \cong \angle D\)`, 'CPCTC', ['SSS', 'Reflexive property', 'Vertical angles are congruent']],
    ],
    visual: {
      type: 'polygon',
      points: KITE,
      vertices: ['A', 'B', 'C', 'D'],
      marks: [1, 2, 2, 1],
      extra: [{ from: [0, 4], to: [0, -3], dashed: false }],
      alt: 'A kite ABCD with A at the top and C at the bottom. Diagonal AC is drawn, splitting it into triangles ABC and ADC. Sides AB and AD have one tick mark each; sides CB and CD have two tick marks each.',
    },
  },
  {
    given: R`\(ABCD\) is a parallelogram, so \(\overline{AB} \parallel \overline{DC}\) and \(\overline{AD} \parallel \overline{BC}\)`,
    prove: R`\(\overline{AB} \cong \overline{CD}\)`,
    steps: [
      [R`\(\angle BAC \cong \angle DCA\)`, 'Alternate interior angles of parallel lines are congruent', ['Vertical angles are congruent', 'Corresponding angles of parallel lines are congruent', 'CPCTC']],
      [R`\(\overline{AC} \cong \overline{CA}\)`, 'Reflexive property', ['Definition of midpoint', 'CPCTC', 'Transitive property']],
      [R`\(\angle BCA \cong \angle DAC\)`, 'Alternate interior angles of parallel lines are congruent', ['Vertical angles are congruent', 'Definition of angle bisector', 'CPCTC']],
      [R`\(\triangle ABC \cong \triangle CDA\)`, 'ASA', ['SAS', 'SSS', 'AAS']],
      [R`\(\overline{AB} \cong \overline{CD}\)`, 'CPCTC', ['ASA', 'Reflexive property', 'Definition of parallelogram']],
    ],
    visual: {
      type: 'polygon',
      points: [[0, 0], [6, 0], [8, 3.5], [2, 3.5]],
      vertices: ['A', 'B', 'C', 'D'],
      extra: [{ from: [0, 0], to: [8, 3.5], dashed: false }],
      alt: 'Parallelogram ABCD with A at the bottom left, B at the bottom right, C at the top right and D at the top left. Diagonal AC is drawn, splitting it into triangles ABC and CDA.',
    },
  },
  {
    given: R`\(\overline{AB} \cong \overline{AC}\) and \(\overline{AD} \perp \overline{BC}\)`,
    prove: R`\(\overline{BD} \cong \overline{CD}\)`,
    steps: [
      [R`\(\angle ADB\) and \(\angle ADC\) are right angles`, 'Definition of perpendicular lines', ['Definition of angle bisector', 'Vertical angles are congruent', 'CPCTC']],
      [R`\(\overline{AB} \cong \overline{AC}\)`, 'Given'],
      [R`\(\overline{AD} \cong \overline{AD}\)`, 'Reflexive property', ['Symmetric property', 'Definition of midpoint', 'CPCTC']],
      [R`\(\triangle ADB \cong \triangle ADC\)`, 'HL', ['SAS', 'SSS', 'ASA']],
      [R`\(\overline{BD} \cong \overline{CD}\)`, 'CPCTC', ['HL', 'Definition of midpoint', 'Reflexive property']],
    ],
    visual: {
      type: 'polygon',
      points: [[-3, 0], [0, 0], [3, 0], [0, 4.5]],
      vertices: ['B', 'D', 'C', 'A'],
      marks: [0, 0, 1, 1],
      extra: [{ from: [0, 4.5], to: [0, 0], dashed: false }, ...rightMark([0, 4.5], [0, 0], [3, 0], 0.4)],
      alt: 'Triangle ABC with A at the top. Segment AD is drawn from A straight down to D on side BC, meeting BC at a right angle. Sides AB and AC have matching tick marks.',
    },
  },
  {
    given: R`\(\overline{AE}\) and \(\overline{BD}\) bisect each other at \(C\)`,
    prove: R`\(\overline{AB} \cong \overline{ED}\)`,
    steps: [
      [R`\(\overline{AC} \cong \overline{EC}\) and \(\overline{BC} \cong \overline{DC}\)`, 'Definition of segment bisector', ['Reflexive property', 'CPCTC', 'Definition of angle bisector']],
      [R`\(\angle ACB \cong \angle ECD\)`, 'Vertical angles are congruent', ['Alternate interior angles of parallel lines are congruent', 'Reflexive property', 'Definition of angle bisector']],
      [R`\(\triangle ACB \cong \triangle ECD\)`, 'SAS', ['SSS', 'ASA', 'AAS']],
      [R`\(\overline{AB} \cong \overline{ED}\)`, 'CPCTC', ['SAS', 'Vertical angles are congruent', 'Definition of segment bisector']],
    ],
    visual: {
      type: 'polygon',
      points: [[-3.5, 2.5], [3, 1.6], [0, 0], [-3, -1.6], [3.5, -2.5], [0, 0]],
      vertices: ['A', 'B', '', 'D', 'E', ''],
      marks: [0, 2, 2, 0, 1, 1],
      extra: [labelAt([0, 0], [3, 1.6], 'C', 'left')],
      alt: 'Segments AE and BD cross at C, forming two triangles, ACB and ECD, that meet at C. AC and EC have one tick mark each; BC and DC have two tick marks each.',
    },
  },
  {
    given: R`\(\angle B \cong \angle D\), and \(\overline{AC}\) bisects \(\angle BAD\)`,
    prove: R`\(\overline{AB} \cong \overline{AD}\)`,
    steps: [
      [R`\(\angle B \cong \angle D\)`, 'Given'],
      [R`\(\angle BAC \cong \angle DAC\)`, 'Definition of angle bisector', ['Vertical angles are congruent', 'Reflexive property', 'CPCTC']],
      [R`\(\overline{AC} \cong \overline{AC}\)`, 'Reflexive property', ['Definition of angle bisector', 'CPCTC', 'Transitive property']],
      [R`\(\triangle ABC \cong \triangle ADC\)`, 'AAS', ['ASA', 'SAS', 'SSS']],
      [R`\(\overline{AB} \cong \overline{AD}\)`, 'CPCTC', ['AAS', 'Reflexive property', 'Definition of angle bisector']],
    ],
    visual: {
      type: 'polygon',
      points: KITE,
      vertices: ['A', 'B', 'C', 'D'],
      angles: ['', '•', '', '•'],
      extra: [{ from: [0, 4], to: [0, -3], dashed: false }, ...angleMark([-3, 1], [0, 4], [0, -3], 0.9), ...angleMark([0, -3], [0, 4], [3, 1], 1.05)],
      alt: 'A four-sided figure ABCD with A at the top and C at the bottom. Diagonal AC is drawn, splitting it into triangles ABC and ADC. The angles at B and D have matching marks, and the two angles at A are marked as equal.',
    },
  },
];

function challengeProof(rng) {
  const proof = rng.pick(PROOFS);
  const askable = proof.steps.map((s, n) => (s[2] ? n : -1)).filter((n) => n >= 0);
  const ask = rng.pick(askable);
  const [statement, reason, wrong] = proof.steps[ask];
  const table = { type: 'table', headers: ['Statement', 'Reason'], rows: proof.steps.map(([st, why], n) => [`${n + 1}. ${st}`, n === ask ? '**?**' : why]), caption: 'The proof, with one reason missing' };
  const explain = {
    'Reflexive property': 'A segment is congruent to itself. The two triangles share this side.',
    CPCTC: 'Once two triangles are proved congruent, every pair of corresponding parts is congruent. That is CPCTC: corresponding parts of congruent triangles are congruent.',
    'Definition of angle bisector': 'A bisector divides an angle into two congruent angles.',
    'Definition of segment bisector': 'A bisector of a segment passes through its midpoint, so it divides the segment into two congruent parts.',
    'Definition of perpendicular lines': 'Perpendicular lines meet at right angles.',
    'Vertical angles are congruent': 'The two angles are opposite each other where two lines cross, so they are vertical angles.',
    'Alternate interior angles of parallel lines are congruent': 'The diagonal is a transversal of a pair of parallel sides. The two angles are between those sides, on opposite sides of the diagonal.',
    SSS: 'The earlier steps give three pairs of congruent sides.',
    SAS: 'The earlier steps give two pairs of congruent sides and the pair of angles between them.',
    ASA: 'The earlier steps give two pairs of congruent angles and the pair of sides between them.',
    AAS: 'The earlier steps give two pairs of congruent angles and a pair of congruent sides that is not between them.',
    HL: 'Both triangles are right triangles. The earlier steps give congruent hypotenuses and a pair of congruent legs.',
  }[reason];
  return q({
    prompt: R`**Given:** ${proof.given}. **Prove:** ${proof.prove}. In the two-column proof below, which reason justifies step ${ask + 1}, ${statement}?`,
    visual: [proof.visual, table],
    correct: reason,
    wrong,
    solution: [R`Step ${ask + 1} says ${statement}. ${explain}`, `The reason is: ${reason}.`],
    rule: reason === 'CPCTC' ? 5 : 4,
    skill: 'reasons in a proof',
  });
}

function challengeAngleChase(rng) {
  const kind = rng.pick(['exterior', 'bisector', 'three']);
  if (kind === 'exterior') {
    const E = rng.int(105, 150);
    const base = 180 - E;
    const V = 2 * E - 180;
    const pts = isoPts(base);
    return q({
      prompt: R`In \(\triangle ABC\), \(\overline{AB} \cong \overline{AC}\). Side \(\overline{BC}\) is extended past \(C\), and the exterior angle at \(C\) measures \(${deg(E)}\). Find \(x = m\angle A\).`,
      visual: {
        type: 'polygon',
        points: pts,
        vertices: ['B', '', 'A'],
        marks: [0, 1, 1],
        angles: ['', '', 'x'],
        extra: [{ from: [6, 0], to: [8.6, 0], dashed: false }, ...arcMark([6, 0], 0, E, 0.8, degT(E)), labelAt([6, 0], [0, 0], 'C', 'left')],
        alt: `Isosceles triangle ABC with congruent sides AB and AC meeting at the top vertex A. Base BC is extended to the right past C, and the exterior angle at C is ${E} degrees. The angle at A is marked x.`,
      },
      correct: V,
      fmt: degM,
      wrong: [
        { value: base, why: R`That is the base angle at \(C\). \(\angle A\) is what is left after both base angles are subtracted from \(180^\circ\).` },
        { value: 2 * base, why: R`That is the sum of the two base angles. Subtract it from \(180^\circ\).` },
        180 - Math.round(E / 2),
        V + base,
        E,
      ],
      solution: [
        R`The interior angle at \(C\) and the exterior angle form a linear pair: \(m\angle C = 180 - ${E} = ${base}\) degrees.`,
        R`\(\overline{AB} \cong \overline{AC}\), so the base angles are congruent: \(m\angle B = ${deg(base)}\) too.`,
        R`Angle sum: \(x = 180 - ${base} - ${base} = ${V}\), so \(m\angle A = ${deg(V)}\).`,
      ],
      rule: 2,
      skill: 'multi-step angle chase',
      check: () => (Math.abs(angleAt(pts[0], pts[2], pts[1]) - V) < 0.05 && Math.abs(angleAt([8.6, 0], pts[1], pts[2]) - E) < 0.05 ? true : 'the figure has different angles'),
    });
  }
  if (kind === 'bisector') {
    const base = 2 * rng.int(20, 38);
    const V = 180 - 2 * base;
    const x = 180 - (3 * base) / 2;
    const [B, C, A] = isoPts(base);
    // D is where the bisector from B (direction base / 2) meets side CA. It is left unrounded so that it
    // lies exactly on CA and the picture puts its label outside the triangle.
    const h = rad(base / 2);
    const u = (-6 * Math.sin(h)) / ((A[0] - 6) * Math.sin(h) - A[1] * Math.cos(h));
    const D = [6 + u * (A[0] - 6), u * A[1]];
    return q({
      prompt: R`In \(\triangle ABC\), \(\overline{AB} \cong \overline{AC}\) and \(m\angle A = ${deg(V)}\). Segment \(\overline{BD}\) bisects \(\angle ABC\) and meets \(\overline{AC}\) at \(D\). Find \(x = m\angle BDC\).`,
      visual: {
        type: 'polygon',
        points: [B, C, D, A],
        vertices: ['B', 'C', 'D', 'A'],
        angles: ['', '', '', degT(V)],
        extra: [{ from: B, to: D, dashed: false }, ...angleMark(B, D, C, 0.7, 'x')],
        alt: `Isosceles triangle ABC with congruent sides AB and AC meeting at the top vertex A, where the angle is ${V} degrees. Segment BD runs from B to point D on side AC and splits angle B into two equal angles. Angle BDC, between DB and DC, is marked x.`,
      },
      correct: x,
      fmt: degM,
      wrong: [
        { value: (3 * base) / 2, why: R`That is the sum of the other two angles of \(\triangle BDC\). Subtract it from \(180^\circ\).` },
        { value: 90, why: 'The bisector of a base angle is not perpendicular to the opposite side unless the triangle is equilateral.' },
        base,
        180 - base,
        V + base,
        180 - base / 2,
        base / 2,
      ],
      solution: [
        R`The base angles are congruent: \(m\angle ABC = m\angle C = \frac{180 - ${V}}{2} = ${base}\) degrees.`,
        R`\(\overline{BD}\) bisects \(\angle ABC\), so \(m\angle DBC = \frac{${base}}{2} = ${base / 2}\) degrees.`,
        R`In \(\triangle BDC\): \(x = 180 - ${base} - ${base / 2} = ${x}\), so \(m\angle BDC = ${deg(x)}\).`,
      ],
      rule: 2,
      skill: 'multi-step angle chase',
      check: () => (Math.abs(angleAt(B, D, C) - x) < 0.05 && Math.abs(angleAt(C, B, D) - base / 2) < 0.05 ? true : `the figure gives ${angleAt(B, D, C)}`),
    });
  }
  const a = rng.int(22, 40);
  const ans = 180 - 3 * a;
  const A = [0, 0];
  const D = [4, 0];
  const B = [r3(4 + 4 * Math.cos(rad(2 * a))), r3(4 * Math.sin(rad(2 * a)))];
  const C = [r3(4 + 8 * Math.cos(rad(2 * a))), 0];
  return q({
    prompt: R`Point \(D\) lies on side \(\overline{AC}\) of \(\triangle ABC\), and \(AD = BD = BC\). If \(m\angle A = ${deg(a)}\), find \(x = m\angle ABC\).`,
    visual: {
      type: 'polygon',
      points: [A, D, C, B],
      vertices: ['A', 'D', 'C', 'B'],
      marks: [1, 0, 1, 0],
      angles: [degT(a), '', '', 'x'],
      extra: [{ from: B, to: D, dashed: false }, ...tickMark(B, D, 0.22)],
      alt: `Triangle ABC with base AC and top vertex B. Point D is on AC, and segment BD is drawn. Segments AD, BD and BC have matching tick marks. The angle at A is ${a} degrees and the whole angle at B, angle ABC, is marked x.`,
    },
    correct: ans,
    fmt: degM,
    wrong: [
      { value: 180 - 4 * a, why: R`That is only \(m\angle DBC\). \(\angle ABC\) also includes \(\angle ABD\).` },
      { value: 180 - 2 * a, why: R`That is \(m\angle ADB\), the angle at \(D\) in \(\triangle ABD\).` },
      2 * a,
      3 * a,
      ans + 10,
    ],
    solution: [
      R`\(AD = BD\), so \(\triangle ABD\) is isosceles and \(m\angle ABD = m\angle A = ${deg(a)}\).`,
      R`\(\angle BDC\) is an exterior angle of \(\triangle ABD\): \(m\angle BDC = ${a} + ${a} = ${2 * a}\) degrees.`,
      R`\(BD = BC\), so \(\triangle BDC\) is isosceles and \(m\angle C = m\angle BDC = ${deg(2 * a)}\).`,
      R`Angle sum in \(\triangle ABC\): \(x = 180 - ${a} - ${2 * a} = ${ans}\), so \(m\angle ABC = ${deg(ans)}\).`,
    ],
    rule: 1,
    skill: 'multi-step angle chase',
    check: () => {
      const d = (p, r) => Math.hypot(p[0] - r[0], p[1] - r[1]);
      return Math.abs(angleAt(A, B, C) - ans) < 0.05 && Math.abs(d(B, D) - 4) < 0.05 && Math.abs(d(B, C) - 4) < 0.05 && Math.abs(angleAt(D, A, B) - a) < 0.05 ? true : `the figure gives ${angleAt(A, B, C)}`;
    },
  });
}

function challengeIsoscelesSides(rng) {
  const kind = rng.pick(['perimeter', 'most', 'least']);
  if (kind === 'perimeter') {
    const a = rng.int(2, 9);
    const b = rng.int(2 * a, 2 * a + 8);
    return q({
      prompt: R`An isosceles triangle has one side of length \(${a}\) cm and another of length \(${b}\) cm. What is its perimeter?`,
      correct: a + 2 * b,
      unit: 'cm',
      wrong: [
        { value: 2 * a + b, why: R`Sides of \(${a}\), \(${a}\) and \(${b}\) cm cannot make a triangle, because \(${a} + ${a}\) is not greater than \(${b}\).` },
        { value: a + b, why: 'A triangle has three sides. The third side must equal one of the two given lengths.' },
        2 * (a + b),
        a + 2 * b + 2,
        3 * b,
      ],
      solution: [
        R`An isosceles triangle has two congruent sides, so the third side is either \(${a}\) cm or \(${b}\) cm.`,
        R`Try \(${a}, ${a}, ${b}\): \(${a} + ${a} = ${2 * a}\), which is not greater than \(${b}\). No triangle.`,
        R`Try \(${a}, ${b}, ${b}\): \(${a} + ${b} > ${b}\), so this works.`,
        R`Perimeter: \(${a} + ${b} + ${b} = ${a + 2 * b}\) cm.`,
      ],
      rule: 3,
      skill: 'triangle inequality',
      check: () => (2 * a <= b && a + b > b ? true : 'both isosceles triangles exist, so the answer is not unique'),
    });
  }
  const a = rng.int(4, 15);
  const b = a + rng.int(1, 12);
  const most = kind === 'most';
  const third = most ? a + b - 1 : b - a + 1;
  const name = person(rng);
  return q({
    prompt: R`${name} is putting edging around a triangular flower bed. Two sides of the bed are \(${a}\) m and \(${b}\) m long, and the third side is a whole number of metres. What is the **${most ? 'greatest' : 'least'}** total length of edging that could be needed to go all the way around?`,
    correct: a + b + third,
    unit: 'm',
    wrong: [
      { value: a + b + (most ? a + b : b - a), why: most ? R`A third side of \(${a + b}\) m would make a flat figure, not a triangle. The longest whole-number third side is \(${a + b - 1}\) m.` : R`A third side of \(${b - a}\) m would make a flat figure, not a triangle. The shortest whole-number third side is \(${b - a + 1}\) m.` },
      { value: third, why: 'That is the third side. The edging goes around all three sides.' },
      a + b + (most ? b : a),
      a + b + third + 1,
      a + b + third + 3,
    ],
    solution: [
      R`The edging is the perimeter, so first find the limits on the third side \(x\): \(${b} - ${a} < x < ${a} + ${b}\), that is \(${b - a} < x < ${a + b}\).`,
      most ? R`The greatest whole number in that range is \(${a + b - 1}\).` : R`The least whole number in that range is \(${b - a + 1}\).`,
      R`Perimeter: \(${a} + ${b} + ${third} = ${a + b + third}\) m.`,
    ],
    rule: 3,
    skill: 'triangle word problems',
    check: () => {
      const ok = (x) => x + a > b && a + b > x;
      return ok(third) && !ok(most ? third + 1 : third - 1) ? true : 'third side is not the extreme value';
    },
  });
}

function challengeEnough(rng) {
  const set = rng.pick(LETTERS);
  const L = set.slice(0, 3);
  const M = set.slice(3);
  const facts = (key) => {
    const [i, j] = rng.pick([[0, 1], [1, 2], [2, 0], [1, 0], [2, 1], [0, 2]]);
    const k = 3 - i - j;
    const S = (a, b) => congS(L, M, a, b);
    const A = (a) => congA(L, M, a);
    return { SSS: [S(i, j), S(j, k), S(k, i)], SAS: [S(i, j), A(j), S(j, k)], ASA: [A(i), S(i, j), A(j)], AAS: [A(i), A(j), S(j, k)], SSA: [S(i, j), S(j, k), A(i)], AAA: [A(i), A(j), A(k)] }[key].join(', ');
  };
  const valid = rng.shuffle(['SSS', 'SAS', 'ASA', 'AAS']);
  const invalid = rng.pick(['SSA', 'AAA']);
  const whyFails = {
    SSA: 'Two pairs of sides and a pair of angles that are not between them (SSA) do not fix the triangle: the third side can swing to two different positions.',
    AAA: 'Three pairs of congruent angles (AAA) only fix the shape. The triangles could be different sizes.',
  };
  const names = { SSS: 'three pairs of sides (SSS)', SAS: 'two pairs of sides and the included angles (SAS)', ASA: 'two pairs of angles and the included sides (ASA)', AAS: 'two pairs of angles and a pair of non-included sides (AAS)' };
  if (rng.bool()) {
    return q({
      prompt: R`Which set of facts is **not** enough to prove that \(\triangle ${L.join('')} \cong \triangle ${M.join('')}\)?`,
      correct: facts(invalid),
      wrong: valid.slice(0, 3).map(facts),
      solution: [whyFails[invalid], `Each of the other sets matches a congruence criterion: ${valid.slice(0, 3).map((k) => names[k]).join('; ')}.`],
      rule: 4,
      skill: 'congruence criteria',
    });
  }
  const other = invalid === 'SSA' ? 'AAA' : 'SSA';
  let second = facts('SSA');
  const first = facts(invalid);
  for (let n = 0; n < 20 && (second === first || invalid !== 'SSA'); n++) {
    second = facts('SSA');
    if (invalid !== 'SSA') break;
  }
  const extra = invalid === 'SSA' ? second : facts('SSA');
  const wrongSets = [{ value: first, why: whyFails[invalid] }, { value: facts(other), why: whyFails[other] }, extra];
  if (new Set(wrongSets.map((w) => (typeof w === 'string' ? w : w.value))).size < 3) return challengeEnough(rng);
  return q({
    prompt: R`Which set of facts is enough to prove that \(\triangle ${L.join('')} \cong \triangle ${M.join('')}\)?`,
    correct: facts(valid[0]),
    wrong: wrongSets,
    solution: [`The correct set gives ${names[valid[0]]}, which is a congruence criterion.`, `The other sets are SSA or AAA. ${whyFails.SSA} ${whyFails.AAA}`],
    rule: 4,
    skill: 'congruence criteria',
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'triangles-congruence',
  title: 'Triangles & Congruence',
  summary: 'Find angles and side limits in triangles, use isosceles and midsegment facts, and prove triangles congruent.',
  standards: ['CCSS G-CO.B.7', 'CCSS G-CO.B.8', 'CCSS G-CO.C.10'],

  explain: {
    intro: R`Every triangle obeys a few rules about its angles and sides, whatever its shape. Two triangles are **congruent** when one can be moved onto the other with rigid motions, so that all six pairs of matching parts are congruent. You do not need to check all six: three well-chosen pairs are enough.`,
    rules: [
      {
        title: 'Angle sum',
        text: R`The three interior angles of a triangle add to \(180^\circ\). A triangle is acute, right or obtuse according to its largest angle.`,
        example: R`Angles of \(48^\circ\) and \(67^\circ\) leave \(180 - 48 - 67 = 65^\circ\) for the third angle.`,
      },
      {
        title: 'Exterior angle',
        text: R`Extending one side of a triangle makes an exterior angle. It equals the sum of the two **remote** interior angles, the two that do not touch it.`,
        example: R`Remote interior angles of \(50^\circ\) and \(72^\circ\) give an exterior angle of \(122^\circ\).`,
      },
      {
        title: 'Isosceles and equilateral triangles',
        text: R`If two sides of a triangle are congruent, the angles opposite them (the base angles) are congruent, and the reverse is also true. An equilateral triangle has three \(60^\circ\) angles.`,
        example: R`An isosceles triangle with a vertex angle of \(40^\circ\) has base angles of \(\frac{180 - 40}{2} = 70^\circ\).`,
      },
      {
        title: 'Triangle inequality',
        text: R`Each side of a triangle is shorter than the sum of the other two. So if two sides are \(a\) and \(b\), the third side is between their difference and their sum. Also, the longest side is opposite the largest angle and the shortest side is opposite the smallest angle.`,
        example: R`With sides \(5\) and \(9\), the third side \(x\) satisfies \(4 < x < 14\).`,
      },
      {
        title: 'Congruence criteria',
        text: R`Two triangles are congruent if they match in **SSS** (three sides), **SAS** (two sides and the angle between them), **ASA** (two angles and the side between them), **AAS** (two angles and a side not between them), or, for right triangles, **HL** (hypotenuse and a leg). **SSA** and **AAA** do not prove congruence: SSA can give two different triangles, and AAA fixes the shape but not the size.`,
        example: R`\(\overline{AB} \cong \overline{DE}\), \(\angle B \cong \angle E\), \(\overline{BC} \cong \overline{EF}\): the angle is between the sides, so the triangles are congruent by SAS.`,
      },
      {
        title: 'Corresponding parts (CPCTC)',
        text: R`Once triangles are known to be congruent, all their corresponding parts are congruent. The order of the letters in the congruence statement tells you which parts correspond.`,
        example: R`If \(\triangle ABC \cong \triangle FDE\), then \(A \leftrightarrow F\), \(B \leftrightarrow D\), \(C \leftrightarrow E\), so \(\overline{BC} \cong \overline{DE}\) and \(\angle A \cong \angle F\).`,
      },
      {
        title: 'Midsegments',
        text: R`A midsegment joins the midpoints of two sides of a triangle. It is parallel to the third side and half as long.`,
        example: R`If \(M\) and \(N\) are the midpoints of \(\overline{AB}\) and \(\overline{AC}\) and \(BC = 18\), then \(MN = 9\) and \(\overline{MN} \parallel \overline{BC}\).`,
      },
    ],
    vocab: [
      { term: 'included angle', def: 'The angle formed by two given sides of a triangle. It lies between them.' },
      { term: 'included side', def: 'The side that joins the vertices of two given angles. It lies between them.' },
      { term: 'remote interior angles', def: 'The two interior angles of a triangle that are not next to a given exterior angle.' },
      { term: 'base angles', def: 'In an isosceles triangle, the two angles opposite the congruent sides.' },
      { term: 'hypotenuse and legs', def: 'In a right triangle, the hypotenuse is the side opposite the right angle. The legs are the two sides that form the right angle.' },
    ],
    mistakes: [
      'Using SSA or AAA to claim that triangles are congruent. Check that the angle is between the two sides (SAS).',
      'Matching parts by how the triangles look instead of by the order of the letters in the congruence statement.',
      'Taking a midsegment to be half of the wrong side. It is half of the side it is parallel to, the one it does not touch.',
      R`Allowing a third side equal to the sum or the difference of the other two. Then the "triangle" is flat.`,
    ],
    visual: criterionFigure([['s', 0, 1], ['a', 1], ['s', 1, 2]], ['A', 'B', 'C'], ['D', 'E', 'F'], [62, 48, 70]),
  },

  examples: [
    {
      title: 'A missing angle and an exterior angle',
      problem: R`In \(\triangle ABC\), \(m\angle A = 52^\circ\) and \(m\angle C = 71^\circ\). Find \(m\angle B\) and the exterior angle at \(B\).`,
      steps: [
        R`Angle sum: \(m\angle B = 180 - 52 - 71 = 57^\circ\).`,
        R`The exterior angle at \(B\) equals the sum of the two remote interior angles: \(52 + 71 = 123^\circ\).`,
        R`Check: the interior and exterior angles at \(B\) form a linear pair, and \(57 + 123 = 180\). ✓`,
      ],
      answer: R`\(m\angle B = 57^\circ\); the exterior angle is \(123^\circ\)`,
      visual: {
        type: 'polygon',
        points: triAA(52, 57, 8),
        vertices: ['A', 'B', 'C'],
        angles: ['52°', '57°', '71°'],
        extra: [{ from: [8, 0], to: [11.5, 0], dashed: false }, ...arcMark([8, 0], 0, 123, 1, '123°')],
        alt: 'Triangle ABC with angles of 52 degrees at A, 57 degrees at B and 71 degrees at C. Side AB is extended past B, and the exterior angle there is 123 degrees.',
      },
    },
    {
      title: 'An isosceles triangle',
      problem: R`In \(\triangle PQR\), \(\overline{PQ} \cong \overline{PR}\) and \(m\angle P = 40^\circ\). Find \(m\angle Q\) and \(m\angle R\).`,
      steps: [
        R`The congruent sides meet at \(P\), so \(\angle P\) is the vertex angle and \(\angle Q\), \(\angle R\) are the base angles.`,
        R`Base angles are congruent. Call each one \(x\): \(x + x + 40 = 180\).`,
        R`\(2x = 140\), so \(x = 70\).`,
      ],
      answer: R`\(m\angle Q = m\angle R = 70^\circ\)`,
      visual: { type: 'polygon', points: isoPts(70), vertices: ['Q', 'R', 'P'], marks: [0, 1, 1], angles: ['70°', '70°', '40°'], alt: 'Isosceles triangle PQR with congruent sides PQ and PR meeting at the top vertex P, where the angle is 40 degrees. The base angles at Q and R are each 70 degrees.' },
    },
    {
      title: 'Can these lengths make a triangle?',
      problem: R`Can a triangle have sides of \(4\), \(7\) and \(12\)? If two sides are \(4\) and \(7\), what lengths are possible for the third side?`,
      steps: [
        R`Compare the two shorter sides with the longest: \(4 + 7 = 11\), which is less than \(12\). The short sides cannot meet, so there is no such triangle.`,
        R`For sides \(4\) and \(7\), the third side \(x\) must be less than \(4 + 7 = 11\).`,
        R`It must also be long enough that \(x + 4 > 7\), so \(x > 3\).`,
      ],
      answer: R`No. With sides \(4\) and \(7\), the third side satisfies \(3 < x < 11\).`,
    },
    {
      title: 'Choose a criterion, then use CPCTC',
      problem: R`In \(\triangle ABC\) and \(\triangle DEF\), \(\overline{AB} \cong \overline{DE}\), \(\angle B \cong \angle E\) and \(\overline{BC} \cong \overline{EF}\). If \(AC = 9\) cm, find \(DF\).`,
      steps: [
        R`Two pairs of sides are congruent, and the congruent angles (\(\angle B\) and \(\angle E\)) are between them.`,
        R`So \(\triangle ABC \cong \triangle DEF\) by SAS.`,
        R`\(\overline{AC}\) and \(\overline{DF}\) are corresponding parts (first and third letters), so they are congruent: \(DF = AC = 9\) cm.`,
      ],
      answer: R`\(\triangle ABC \cong \triangle DEF\) by SAS, and \(DF = 9\) cm`,
      visual: criterionFigure([['s', 0, 1], ['a', 1], ['s', 1, 2]], ['A', 'B', 'C'], ['D', 'E', 'F'], [62, 48, 70]),
    },
    {
      title: 'Word problem: a beam in an A-frame',
      word: true,
      problem: R`The front of an A-frame cabin is a triangle that is \(8\) m wide at ground level. A horizontal beam joins the midpoints of the two sloping sides. How long is the beam?`,
      steps: [
        R`The beam joins the midpoints of two sides of the triangle, so it is a midsegment.`,
        R`A midsegment is parallel to the third side (the ground) and half as long.`,
        R`\(\frac{1}{2} \cdot 8 = 4\).`,
      ],
      answer: 'The beam is 4 m long.',
      visual: midFigure(7, 7, 8, '8 m', '?', 'A triangle ABC that is 8 metres wide along its base BC. Segment MN joins the midpoints of the two sloping sides and is marked with a question mark.'),
    },
  ],

  models: [
    {
      id: 'missing-angles',
      title: 'Two angles give the third',
      intro: 'Type two angles of a triangle. The third angle, the type of triangle and the exterior angles follow.',
      inputs: [
        { name: 'a', label: 'Angle A (degrees)', type: 'int', min: 1, max: 178, value: 48 },
        { name: 'b', label: 'Angle B (degrees)', type: 'int', min: 1, max: 178, value: 67 },
      ],
      compute({ a, b }) {
        if (a + b >= 180) return { error: `Two angles of a triangle must add to less than 180°. These add to ${a + b}°, so make one of them smaller.` };
        const c = 180 - a - b;
        const big = Math.max(a, b, c);
        const type = big < 90 ? 'acute' : big === 90 ? 'right' : 'obtuse';
        return {
          problem: R`In \(\triangle ABC\), \(m\angle A = ${deg(a)}\) and \(m\angle B = ${deg(b)}\).`,
          steps: [
            R`Angle sum: \(m\angle C = 180 - ${a} - ${b} = ${c}\), so \(m\angle C = ${deg(c)}\).`,
            R`The largest angle is \(${deg(big)}\), so the triangle is ${type}.`,
            R`Each exterior angle is the sum of the two remote interior angles: at \(A\), \(${b} + ${c} = ${b + c}\) degrees; at \(B\), \(${a} + ${c} = ${a + c}\) degrees; at \(C\), \(${a} + ${b} = ${a + b}\) degrees.`,
            R`Check: each exterior angle is also \(180^\circ\) minus its interior angle, for example \(180 - ${c} = ${a + b}\). ✓`,
          ],
          answer: R`\(m\angle C = ${deg(c)}\); the triangle is ${type}`,
          visual: { type: 'polygon', points: triAA(a, b), vertices: ['A', 'B', 'C'], angles: [degT(a), degT(b), degT(c)], alt: `Triangle ABC with angles of ${a}, ${b} and ${c} degrees.` },
        };
      },
    },
    {
      id: 'third-straw',
      title: 'Word problem: the third straw',
      word: true,
      intro: 'Change the lengths of the two straws.',
      inputs: [
        { name: 'a', label: 'First straw (cm)', type: 'int', min: 1, max: 40, value: 6 },
        { name: 'b', label: 'Second straw (cm)', type: 'int', min: 1, max: 40, value: 10 },
      ],
      compute({ a, b }) {
        const lo = Math.abs(a - b);
        const hi = a + b;
        const count = hi - 1 - lo;
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        return {
          problem: R`Maya has two straws, \(${a}\) cm and \(${b}\) cm long. Maya wants to cut a third straw so that the three make a triangle. How long can the third straw be?`,
          steps: [
            'The straws make a triangle only if each one is shorter than the other two put together.',
            R`The third straw \(x\) must be shorter than the first two together: \(x < ${a} + ${b} = ${hi}\).`,
            a === b ? R`The two straws are the same length, so any positive length below \(${hi}\) cm also passes the other two checks.` : R`The longest of the first two must be shorter than the other two together: \(${big} < x + ${small}\), so \(x > ${lo}\).`,
            R`So \(${lo} < x < ${hi}\). In whole centimetres that allows ${plural(count, 'length')}${count > 0 ? R`, from \(${lo + 1}\) to \(${hi - 1}\)` : ''}.`,
          ],
          answer: R`Longer than \(${lo}\) cm and shorter than \(${hi}\) cm`,
          visual: { type: 'polygon', points: triSSS(big, small, big), sides: [`${big} cm`, `${big} cm`, `${small} cm`], alt: `One triangle that works: sides of ${small} cm, ${big} cm and ${big} cm.` },
          note: R`The picture shows one possibility, with a third straw of \(${big}\) cm.`,
        };
      },
    },
    {
      id: 'isosceles-angles',
      title: 'Angles of an isosceles triangle',
      intro: 'Say which angle you know and type its measure.',
      inputs: [
        { name: 'known', label: 'The known angle is', type: 'select', value: 'vertex', options: [{ value: 'vertex', label: 'the vertex angle (between the congruent sides)' }, { value: 'base', label: 'a base angle' }] },
        { name: 'a', label: 'Its measure (degrees)', type: 'int', min: 1, max: 178, value: 40 },
      ],
      compute({ known, a }) {
        if (known === 'base' && a >= 90) return { error: 'A base angle of an isosceles triangle must be less than 90°, because the triangle has two of them. Try a smaller angle.' };
        const base = known === 'base' ? a : (180 - a) / 2;
        const vertex = known === 'base' ? 180 - 2 * a : a;
        return {
          problem: known === 'base' ? R`Each base angle of an isosceles triangle measures \(${deg(a)}\). Find the vertex angle.` : R`The vertex angle of an isosceles triangle measures \(${deg(a)}\). Find each base angle.`,
          steps:
            known === 'base'
              ? [R`The base angles are congruent, so together they measure \(2 \cdot ${a} = ${2 * a}\) degrees.`, R`Angle sum: \(180 - ${2 * a} = ${vertex}\).`, R`The vertex angle measures \(${deg(vertex)}\).${vertex === 60 ? ' All three angles are equal, so this triangle is equilateral.' : ''}`]
              : [R`The base angles are congruent. Call each one \(x\): \(2x + ${a} = 180\).`, R`\(2x = ${180 - a}\), so \(x = ${num(base)}\).`, R`Each base angle measures \(${deg(base)}\).${a === 60 ? ' All three angles are equal, so this triangle is equilateral.' : ''}`],
          answer: known === 'base' ? R`Vertex angle \(${deg(vertex)}\)` : R`Base angles \(${deg(base)}\) each`,
          visual: { type: 'polygon', points: isoPts(base), marks: [0, 1, 1], angles: [degT(base), degT(base), degT(vertex)], alt: `An isosceles triangle with base angles of ${num(base)} degrees and a vertex angle of ${vertex} degrees.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyThirdAngle, easyIsosceles, easyExterior, easyWhichTriple],
    medium: [mediumCriterion, mediumCpctc, mediumMidsegment, mediumStory],
    hard: [hardExteriorAlgebra, hardIsoscelesAlgebra, hardMissingPart, hardSideOrder],
    challenge: [challengeProof, challengeAngleChase, challengeIsoscelesSides, challengeEnough],
  },
};
