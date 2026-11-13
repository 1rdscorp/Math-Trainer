import { R, q, m, num, frac, linear, point, paren, dot, fracTex, sqrtTex, simplifySqrt, isSquare, people } from '../../lib/index.js';
import { T, dist, angleAt, shoelace } from './_shared.js';

// Slopes n/d used for lines (never 1, so that a slope and its reciprocal are different).
const SLOPES = [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [3, 4], [4, 3], [1, 4], [4, 1]];

const add = (P, v, k = 1) => [P[0] + k * v[0], P[1] + k * v[1]];
const vec = (P, Q) => [Q[0] - P[0], Q[1] - P[1]];
const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
const dotp = (u, v) => u[0] * v[0] + u[1] * v[1];
const len2 = (P, Q) => dotp(vec(P, Q), vec(P, Q));
const inside = (pts, lim = 9) => pts.every(([x, y]) => Math.abs(x) <= lim && Math.abs(y) <= lim);
/** A point for math mode, "(3, -2)", and for plain text, "(3, −2)". */
const pt = (P) => point(P[0], P[1]);
const ptT = (P) => `(${T(P[0])}, ${T(P[1])})`;
const named = (names, pts) => pts.map((P, i) => ({ x: P[0], y: P[1], label: names[i] }));
const lineEq = (slope, c) => m(`y = ${linear(slope, c)}`);
const lineSeen = (slope, c) => `the line with slope ${slope.text()} that crosses the y-axis at ${T(c)}`;

/** A square window on the coordinate plane, centred on the origin, that holds all the given points. */
function plane(pts, more, alt) {
  const L = Math.ceil(Math.max(5, ...pts.flat().map(Math.abs))) + 1;
  return { type: 'plot', x: [-L, L], y: [-L, L], square: true, step: L <= 10 ? [1, 1] : [2, 2], ...more, alt };
}

const segmentPic = (A, B, alt) => plane([A, B], { points: named('AB', [A, B]), segments: [{ from: A, to: B }] }, alt);

/** The value of a printed radical such as "2\sqrt{13}" or "7", so a check tests what the student sees. */
const radValue = (tex) => {
  const hit = tex.match(/^(\d*)\\sqrt\{(\d+)\}$/);
  return hit ? (hit[1] === '' ? 1 : Number(hit[1])) * Math.sqrt(Number(hit[2])) : Number(tex);
};

// ───────────── Easy ─────────────

function easyMidpoint(rng) {
  for (;;) {
    const M = [rng.int(-6, 6), rng.int(-6, 6)];
    const d = [rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
    const [A, B] = [add(M, d, -1), add(M, d)];
    if (!inside([A, B]) || M[0] === M[1] || M[0] === -M[1]) continue;
    const [first, second] = people(rng, 2);
    return q({
      prompt: rng.bool(0.35)
        ? R`On a map of a town, ${first}'s home is at \(A${pt(A)}\) and ${second}'s home is at \(B${pt(B)}\). The two friends meet at the point exactly halfway between their homes. What are the coordinates of that point?`
        : R`What is the midpoint of the segment with endpoints \(A${pt(A)}\) and \(B${pt(B)}\)?`,
      visual: segmentPic(A, B, `A coordinate grid showing the segment from A${ptT(A)} to B${ptT(B)}.`),
      correct: m(pt(M)),
      wrong: [
        { value: m(pt(d)), why: 'That halves the differences of the coordinates. A midpoint is an average: add the coordinates, then halve.' },
        { value: m(pt(add(A, B))), why: 'That adds the coordinates but does not halve them. Divide each sum by 2.' },
        m(pt([M[1], M[0]])),
        m(pt([-M[0], -M[1]])),
        m(pt(add(M, [1, 0]))),
      ],
      solution: [
        R`The midpoint averages the coordinates of the endpoints: \(M = \left(\dfrac{x_1 + x_2}{2}, \dfrac{y_1 + y_2}{2}\right)\).`,
        R`\(x\): \(\dfrac{${A[0]} + ${paren(B[0])}}{2} = ${fracTex(A[0] + B[0], 2)} = ${M[0]}\). \(y\): \(\dfrac{${A[1]} + ${paren(B[1])}}{2} = ${fracTex(A[1] + B[1], 2)} = ${M[1]}\).`,
        R`The midpoint is \(${pt(M)}\).`,
      ],
      rule: 1,
      skill: 'midpoint',
      check: () => (len2(A, M) === len2(M, B) && cross(vec(A, M), vec(A, B)) === 0 ? true : 'that point is not halfway along the segment'),
    });
  }
}

function easyDistance(rng) {
  for (;;) {
    const [p, s, c] = rng.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [9, 12, 15], [12, 9, 15]]);
    const d = [p * rng.sign(), s * rng.sign()];
    const A = [rng.int(-9, 9), rng.int(-9, 9)];
    const B = add(A, d);
    if (!inside([A, B])) continue;
    const corner = [B[0], A[1]];
    return q({
      prompt: R`What is the distance between \(A${pt(A)}\) and \(B${pt(B)}\)?`,
      visual: plane([A, B], { points: named('AB', [A, B]), segments: [{ from: A, to: B }, { from: A, to: corner, dashed: true }, { from: corner, to: B, dashed: true }] }, `A coordinate grid showing the segment from A${ptT(A)} to B${ptT(B)}. Dashed segments from A across to ${ptT(corner)} and from there straight to B make a right triangle with the segment.`),
      correct: c,
      wrong: [
        { value: p + s, why: 'That is the distance along the two dashed legs. The straight-line distance is the hypotenuse of the right triangle.' },
        { value: c * c, why: R`That is \(d^2\). Take the square root.` },
        Math.abs(p - s),
        Math.max(p, s),
      ],
      solution: [
        R`Horizontal change: \(${B[0]} - ${paren(A[0])} = ${d[0]}\). Vertical change: \(${B[1]} - ${paren(A[1])} = ${d[1]}\).`,
        R`Distance formula: \(d = \sqrt{${paren(d[0])}^2 + ${paren(d[1])}^2} = \sqrt{${p * p} + ${s * s}} = \sqrt{${c * c}} = ${c}\).`,
      ],
      rule: 0,
      skill: 'distance',
      check: () => (Math.abs(dist(A, B) - c) < 1e-9 ? true : 'the distance measured from the coordinates is different'),
    });
  }
}

function easySlopes(rng) {
  const [n, d] = rng.pick(SLOPES);
  const s = frac(n * rng.sign(), d);
  const b = rng.int(-4, 4);
  const perp = rng.bool();
  const ans = perp ? s.inv().neg() : s;
  return q({
    prompt: R`Line \(\ell\) has the equation \(y = ${linear(s, b)}\). What is the slope of a line that is ${perp ? 'perpendicular' : 'parallel'} to \(\ell\)?`,
    visual: plane([[0, b]], { fns: [{ f: (x) => s.value * x + b }] }, `A coordinate grid showing ${lineSeen(s, b)}.`),
    correct: ans,
    wrong: perp
      ? [
          { value: s.inv(), why: R`Flip the fraction **and** change its sign. The two slopes must multiply to \(-1\).` },
          { value: s.neg(), why: 'Changing the sign is only half of it. Also flip the fraction to get the reciprocal.' },
          { value: s, why: 'Equal slopes make lines parallel, not perpendicular.' },
          frac(b),
        ]
      : [
          { value: s.inv().neg(), why: 'That is the slope of a perpendicular line. Parallel lines have equal slopes.' },
          { value: s.neg(), why: 'Parallel lines have exactly the same slope, sign included.' },
          { value: frac(b), why: R`That is the \(y\)-intercept. The slope is the number multiplying \(x\).` },
          s.inv(),
        ],
    solution: [
      R`In \(y = mx + b\) the slope is \(m\), so \(\ell\) has slope \(${s.tex()}\).`,
      perp ? R`Perpendicular lines have slopes that are negative reciprocals: flip the fraction and change its sign. The slope is \(${ans.tex()}\).` : R`Parallel lines never meet because they rise at the same rate, so they have equal slopes. The slope is \(${ans.tex()}\).`,
      perp ? R`Check: \(${dot(s, ans)} = -1\). ✓` : null,
    ].filter(Boolean),
    rule: 2,
    skill: 'parallel and perpendicular slopes',
    check: () => ((perp ? s.d * ans.d + s.n * ans.n : s.d * ans.n - s.n * ans.d) === 0 ? true : 'the direction of that line is not right'),
  });
}

// ───────────── Medium ─────────────

function mediumDistance(rng) {
  for (;;) {
    const d = [rng.nonzero(-8, 8), rng.nonzero(-8, 8)];
    const n = d[0] ** 2 + d[1] ** 2;
    const A = [rng.int(-8, 8), rng.int(-8, 8)];
    const B = add(A, d);
    const [ax, ay] = d.map(Math.abs);
    if (isSquare(n) || !inside([A, B]) || Math.max(ax, ay) < 2) continue;
    const { coef, rad } = simplifySqrt(n);
    // Wrong answers are kept only if their values differ from the right answer and from each other.
    const seen = [Math.sqrt(n)];
    const wrong = [
      { tex: `${ax + ay}`, why: 'That adds the horizontal and vertical changes. The straight-line distance is the hypotenuse of the right triangle they make.' },
      { tex: `${n}`, why: R`That is \(d^2\). Take the square root.` },
      { tex: sqrtTex(ax + ay), why: R`Square each change before adding: \(d = \sqrt{${ax * ax} + ${ay * ay}}\).` },
      ax === ay ? null : { tex: sqrtTex(Math.abs(ax * ax - ay * ay)), why: 'The squares of the changes are added, not subtracted.' },
      { tex: sqrtTex(2 * n) },
      { tex: sqrtTex(n + 1) },
    ].filter((o) => o && !seen.some((v) => Math.abs(v - radValue(o.tex)) < 1e-9) && seen.push(radValue(o.tex)));
    if (wrong.length < 3) continue;
    return q({
      prompt: R`What is the distance between \(A${pt(A)}\) and \(B${pt(B)}\)? Give the answer in simplest radical form.`,
      visual: segmentPic(A, B, `A coordinate grid showing the segment from A${ptT(A)} to B${ptT(B)}.`),
      correct: m(sqrtTex(n)),
      wrong: wrong.map((o) => ({ value: m(o.tex), why: o.why })),
      solution: [
        R`Horizontal change: \(${B[0]} - ${paren(A[0])} = ${d[0]}\). Vertical change: \(${B[1]} - ${paren(A[1])} = ${d[1]}\).`,
        R`Distance formula: \(d = \sqrt{${paren(d[0])}^2 + ${paren(d[1])}^2} = \sqrt{${ax * ax} + ${ay * ay}} = \sqrt{${n}}\).`,
        coef > 1 ? R`Simplify: \(\sqrt{${n}} = \sqrt{${coef * coef} \cdot ${rad}} = ${sqrtTex(n)}\).` : R`\(${n}\) has no perfect-square factor, so \(\sqrt{${n}}\) is already in simplest form.`,
      ],
      rule: 0,
      skill: 'distance',
      check: () => (Math.abs(radValue(sqrtTex(n)) - dist(A, B)) < 1e-9 ? true : 'the distance measured from the coordinates is different'),
    });
  }
}

function mediumLineEquation(rng) {
  for (;;) {
    const [n, d] = rng.pick(SLOPES);
    const s = frac(n * rng.sign(), d);
    const b = rng.int(-5, 5);
    const perp = rng.bool();
    const s2 = perp ? s.inv().neg() : s;
    const x1 = s2.d * rng.nonzero(-2, 2); // a multiple of the new slope's denominator, so the intercept is a whole number
    const b2 = rng.intExcept(-6, 6, [b, -b, 0]);
    const rise = (s2.n * x1) / s2.d;
    const y1 = rise + b2;
    if (!inside([[x1, y1]])) continue;
    return q({
      prompt: R`Which is an equation of the line through \(P${point(x1, y1)}\) that is ${perp ? 'perpendicular' : 'parallel'} to the line \(y = ${linear(s, b)}\)?`,
      visual: plane([[x1, y1], [0, b]], { fns: [{ f: (x) => s.value * x + b }], points: [{ x: x1, y: y1, label: 'P' }] }, `A coordinate grid showing ${lineSeen(s, b)}, and the point P${ptT([x1, y1])}.`),
      correct: lineEq(s2, b2),
      wrong: perp
        ? [
            { value: lineEq(s, b2), why: 'That line has the same slope as the given line, so it is parallel to it, not perpendicular.' },
            { value: lineEq(s.inv(), b2), why: 'For a perpendicular line, flip the slope and change its sign as well.' },
            { value: lineEq(s2, b), why: 'That line has the right slope, but it does not pass through the given point. Substitute the point to find the intercept.' },
            lineEq(s2, -b2),
          ]
        : [
            { value: lineEq(s, b), why: 'That is the given line itself. The new line has the same slope but must pass through the given point.' },
            { value: lineEq(s.inv().neg(), b2), why: 'That slope belongs to a perpendicular line. Parallel lines have equal slopes.' },
            lineEq(s, -b2),
            lineEq(s.neg(), b2),
          ],
      solution: [
        perp ? R`The given line has slope \(${s.tex()}\). A perpendicular line has the negative reciprocal slope, \(${s2.tex()}\).` : R`The given line has slope \(${s.tex()}\). A parallel line has the same slope, \(${s2.tex()}\).`,
        R`Substitute the point into \(y = mx + b\): \(${y1} = ${dot(s2, x1)} + b\), which is \(${y1} = ${rise} + b\). So \(b = ${b2}\).`,
        R`The line is \(y = ${linear(s2, b2)}\).`,
      ],
      rule: 3,
      skill: 'equations of lines',
      check: () => (Math.abs(s2.value * x1 + b2 - y1) < 1e-9 && (perp ? s.d * s2.d + s.n * s2.n : s.d * s2.n - s.n * s2.d) === 0 ? true : 'the line in the answer misses the point or has the wrong direction'),
    });
  }
}

function mediumPartition(rng) {
  for (;;) {
    const [a, b] = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1]]);
    const n = a + b;
    const u = [rng.nonzero(-2, 2), rng.nonzero(-2, 2)]; // one of the n equal steps from A to B
    const A = [rng.int(-8, 8), rng.int(-8, 8)];
    const B = add(A, u, n);
    if (!inside([A, B])) continue;
    const P = add(A, u, a);
    const part = frac(a, n);
    const story = rng.bool(0.4);
    return q({
      prompt: story
        ? R`A drone flies in a straight line from \(A${pt(A)}\) to \(B${pt(B)}\) on a map grid. It stops to take a photo when it has covered \(${part.tex()}\) of the distance. At which point does it stop?`
        : R`Point \(P\) is on the segment from \(A${pt(A)}\) to \(B${pt(B)}\), and \(AP : PB = ${a} : ${b}\). What are the coordinates of \(P\)?`,
      visual: segmentPic(A, B, `A coordinate grid showing the segment from A${ptT(A)} to B${ptT(B)}.`),
      correct: m(pt(P)),
      wrong: [
        { value: m(pt(add(A, u, b))), why: R`That point is \(${frac(b, n).tex()}\) of the way from \(A\) to \(B\). The point asked for is \(${part.tex()}\) of the way.` },
        story ? null : { value: m(point(frac(a * n * u[0], b).add(A[0]), frac(a * n * u[1], b).add(A[1]))), why: R`The parts \(${a}\) and \(${b}\) make \(${n}\) equal steps in all, so \(P\) is \(${part.tex()}\) of the way from \(A\). Dividing \(${a}\) by \(${b}\) instead of by \(${n}\) gives the wrong fraction.` },
        { value: m(pt([a * u[0], a * u[1]])), why: R`Those are the changes in \(x\) and \(y\) from \(A\) to the point. Add them to the coordinates of \(A\).` },
        { value: m(point(frac(A[0] + B[0], 2), frac(A[1] + B[1], 2))), why: 'That is the midpoint, which is exactly halfway along the segment.' },
        m(pt(add(B, u, a))),
      ],
      solution: [
        story ? R`The stopping point \(P\) is \(${part.tex()}\) of the way from \(A\) to \(B\).` : R`The ratio \(${a} : ${b}\) splits the segment into \(${a} + ${b} = ${n}\) equal steps, and \(P\) is \(${a}\) of them from \(A\). So \(P\) is \(${part.tex()}\) of the way from \(A\) to \(B\).`,
        R`From \(A\) to \(B\), \(x\) changes by \(${B[0]} - ${paren(A[0])} = ${n * u[0]}\) and \(y\) changes by \(${B[1]} - ${paren(A[1])} = ${n * u[1]}\).`,
        R`Add \(${part.tex()}\) of each change to \(A\): \(x = ${A[0]} + ${part.tex()}(${n * u[0]}) = ${P[0]}\) and \(y = ${A[1]} + ${part.tex()}(${n * u[1]}) = ${P[1]}\).`,
        R`The point is \(${pt(P)}\).`,
      ],
      rule: 4,
      skill: 'partitioning a segment',
      check: () => (cross(vec(A, P), vec(A, B)) === 0 && dotp(vec(A, P), vec(P, B)) > 0 && b * b * len2(A, P) === a * a * len2(P, B) ? true : 'that point does not divide the segment in the given ratio'),
    });
  }
}

// ───────────── Hard ─────────────

const TRIANGLES = ['right and isosceles', 'right and scalene', 'isosceles, with no right angle', 'scalene, with no right angle'];

/** Classifies a triangle from the squares of its side lengths. */
function triangleType([A, B, C]) {
  const [x, y, z] = [len2(A, B), len2(B, C), len2(C, A)].sort((p, s) => p - s);
  return TRIANGLES[(x + y === z ? 0 : 2) + (x === y || y === z ? 0 : 1)];
}

function hardClassifyTriangle(rng) {
  for (;;) {
    const want = rng.pick(TRIANGLES);
    const O = [rng.int(-5, 5), rng.int(-5, 5)];
    const u = [rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
    const turn = [-u[1], u[0]];
    const third = want === TRIANGLES[0] ? add(O, turn) : want === TRIANGLES[1] ? add(O, turn, rng.pick([2, 3])) : want === TRIANGLES[2] ? add(O, [u[1], u[0]]) : [rng.int(-8, 8), rng.int(-8, 8)];
    const pts = rng.shuffle([O, add(O, u), third]);
    const [A, B, C] = pts;
    if (triangleType(pts) !== want || !inside(pts) || Math.abs(cross(vec(A, B), vec(A, C))) < 6) continue;
    const sides = [['AB', A, B], ['BC', B, C], ['CA', C, A]].map(([name, P, Q]) => ({ name, d: vec(P, Q), sq: len2(P, Q) }));
    const [small, mid, big] = [...sides].sort((p, s) => p.sq - s.sq);
    const twins = sides.filter((s, i) => sides.some((t, j) => j !== i && t.sq === s.sq));
    const isRight = want.startsWith('right');
    const isIso = want.includes('isosceles');
    return q({
      prompt: R`A triangle has vertices \(A${pt(A)}\), \(B${pt(B)}\) and \(C${pt(C)}\). Which description fits the triangle?`,
      visual: plane(pts, { polygons: [{ points: pts }], points: named('ABC', pts) }, `A coordinate grid showing the triangle with vertices A${ptT(A)}, B${ptT(B)} and C${ptT(C)}.`),
      correct: want,
      wrong: TRIANGLES.filter((t) => t !== want).map((t) => ({
        value: t,
        why: t.includes('isosceles') !== isIso ? 'Compare the squares of the three side lengths to see whether two sides are congruent.' : 'Test for a right angle: the squares of the two shorter sides must add up to the square of the longest side.',
      })),
      solution: [
        `Use the distance formula to find the square of each side length. ${sides.map((s) => R`\(${s.name}^2 = ${paren(s.d[0])}^2 + ${paren(s.d[1])}^2 = ${s.sq}\)`).join(', ')}.`,
        twins.length ? R`\(${twins[0].name}^2 = ${twins[1].name}^2\), so two sides are congruent: the triangle is isosceles.` : 'The three values are all different, so no two sides are congruent: the triangle is scalene.',
        isRight
          ? R`The two smaller values add up to the largest: \(${small.sq} + ${mid.sq} = ${big.sq}\). By the converse of the Pythagorean theorem, the triangle has a right angle.`
          : R`The two smaller values do not add up to the largest: \(${small.sq} + ${mid.sq} = ${small.sq + mid.sq}\), not \(${big.sq}\). So the triangle has no right angle.`,
        `The triangle is ${want}.`,
      ],
      rule: 5,
      skill: 'classifying triangles',
      check: () => {
        const right = [angleAt(B, A, C), angleAt(A, B, C), angleAt(A, C, B)].some((t) => Math.abs(t - 90) < 1e-6);
        const lens = [dist(A, B), dist(B, C), dist(C, A)];
        const iso = lens.some((x, i) => Math.abs(x - lens[(i + 1) % 3]) < 1e-9);
        return right === isRight && iso === isIso ? true : 'the angles and side lengths measured from the coordinates say otherwise';
      },
    });
  }
}

function hardPerimeterArea(rng) {
  for (;;) {
    const O = [rng.int(-5, 5), rng.int(-5, 5)];
    if (rng.bool()) {
      const [p, s, c] = rng.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13]]);
      const [fx, fy] = [rng.sign(), rng.sign()];
      const spec = rng.pick([
        { name: 'triangle', letters: 'ABC', pts: [O, add(O, [p * fx, 0]), add(O, [0, s * fy])], ans: p + s + c, grid: 2 * (p + s), area: (p * s) / 2, sum: `${p} + ${s} + ${c}`, sides: R`\(\overline{AB}\) is horizontal and \(${p}\) units long, and \(\overline{AC}\) is vertical and \(${s}\) units long. \(\overline{BC}\) is slanted` },
        { name: 'triangle', letters: 'ABC', pts: [add(O, [-p, 0]), add(O, [p, 0]), add(O, [0, s * fy])], ans: 2 * p + 2 * c, grid: 4 * p + 2 * s, area: p * s, sum: `${2 * p} + ${c} + ${c}`, sides: R`\(\overline{AB}\) is horizontal and \(${2 * p}\) units long. \(\overline{BC}\) and \(\overline{CA}\) are slanted, and each one goes \(${p}\) across and \(${s}\) up or down` },
        { name: 'rhombus', letters: 'ABCD', pts: [add(O, [p, 0]), add(O, [0, s]), add(O, [-p, 0]), add(O, [0, -s])], ans: 4 * c, grid: 4 * (p + s), area: 2 * p * s, sum: `4 \\cdot ${c}`, sides: R`All four sides are slanted, and each one goes \(${p}\) across and \(${s}\) up or down` },
      ]);
      if (!inside(spec.pts)) continue;
      const list = spec.pts.map((P, i) => R`\(${spec.letters[i]}${pt(P)}\)`);
      return q({
        prompt: R`A flower bed is drawn on a grid where each unit stands for 1 metre. It is a ${spec.name} with corners at ${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}. How many metres of edging are needed to go all the way around it?`,
        visual: plane(spec.pts, { polygons: [{ points: spec.pts }], points: named(spec.letters, spec.pts) }, `A coordinate grid showing a ${spec.name} with corners at ${spec.pts.map((P, i) => `${spec.letters[i]}${ptT(P)}`).join(', ')}.`),
        correct: spec.ans,
        unit: 'm',
        wrong: [
          { value: spec.grid, why: 'A slanted side is shorter than going across and then up. Find its length with the distance formula.' },
          { value: spec.area, why: 'That is the area of the bed. The edging goes around the perimeter.' },
          spec.ans - c,
          spec.ans + c,
        ],
        solution: [
          R`${spec.sides}, so its length is \(\sqrt{${p}^2 + ${s}^2} = \sqrt{${p * p + s * s}} = ${c}\) units.`,
          R`Perimeter: \(${spec.sum} = ${spec.ans}\) units, and each unit is 1 m. So \(${spec.ans}\) m of edging are needed.`,
        ],
        rule: 6,
        skill: 'perimeter and area',
        check: () => (Math.abs(spec.pts.reduce((sum, P, i) => sum + dist(P, spec.pts[(i + 1) % spec.pts.length]), 0) - spec.ans) < 1e-9 ? true : 'the side lengths measured from the coordinates add up to something else'),
      });
    }
    const u = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    const [k, j] = [rng.int(1, 3), rng.int(1, 3)];
    const [B, C] = [add(O, u, k), add(O, [-u[1], u[0]], j)];
    const N = u[0] ** 2 + u[1] ** 2;
    const ans = (k * j * N) / 2;
    const box = (Math.abs(B[0] - C[0]) * Math.abs(B[1] - C[1])) / 2;
    if (!inside([O, B, C]) || box === ans || box === 0) continue;
    return q({
      prompt: R`Triangle \(ABC\) has vertices \(A${pt(O)}\), \(B${pt(B)}\) and \(C${pt(C)}\), with a right angle at \(A\). What is its area in square units?`,
      visual: plane([O, B, C], { polygons: [{ points: [O, B, C] }], points: named('ABC', [O, B, C]) }, `A coordinate grid showing the triangle with vertices A${ptT(O)}, B${ptT(B)} and C${ptT(C)}. The angle at A is a right angle.`),
      correct: ans,
      wrong: [
        { value: 2 * ans, why: R`That is \(AB \cdot AC\). The area of a triangle is half the product of its base and height.` },
        { value: box, why: 'The legs of this triangle are slanted, so their lengths come from the distance formula, not from counting squares across and up.' },
        ans + N,
        k * j * N + N,
      ],
      solution: [
        R`The legs \(\overline{AB}\) and \(\overline{AC}\) meet at the right angle, so they are a base and a height. Find their lengths with the distance formula.`,
        R`\(AB = \sqrt{${paren(k * u[0])}^2 + ${paren(k * u[1])}^2} = \sqrt{${k * k * N}}\) and \(AC = \sqrt{${paren(-j * u[1])}^2 + ${paren(j * u[0])}^2} = \sqrt{${j * j * N}}\).`,
        R`Area: \(\frac{1}{2} \cdot \sqrt{${k * k * N}} \cdot \sqrt{${j * j * N}} = \frac{1}{2}\sqrt{${k * k * j * j * N * N}} = \frac{1}{2}(${k * j * N}) = ${num(ans)}\) square units.`,
      ],
      rule: 6,
      skill: 'perimeter and area',
      check: () => (shoelace([O, B, C]) === ans && dotp(vec(O, B), vec(O, C)) === 0 ? true : 'the area measured from the coordinates is different, or the angle at A is not a right angle'),
    });
  }
}

function hardPerpBisector(rng) {
  for (;;) {
    const [p, r] = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]]).map((v) => v * rng.sign()); // AB runs in the direction (p, r)
    const t = rng.pick([1, 2]);
    const k = rng.int(-1, 1);
    const M = [p * r * k, rng.int(-5, 5)];
    const [A, B] = [add(M, [p, r], -t), add(M, [p, r], t)];
    if (!inside([A, B])) continue;
    const along = frac(r, p); // slope of AB
    const s2 = frac(-p, r); // slope of the bisector
    const b2 = M[1] + p * p * k;
    return q({
      prompt: R`Which is an equation of the perpendicular bisector of the segment with endpoints \(A${pt(A)}\) and \(B${pt(B)}\)?`,
      visual: segmentPic(A, B, `A coordinate grid showing the segment from A${ptT(A)} to B${ptT(B)}.`),
      correct: lineEq(s2, b2),
      wrong: [
        { value: lineEq(along, M[1] - r * r * k), why: R`That line passes through the midpoint with the same slope as \(\overline{AB}\), so it is the line through \(A\) and \(B\). The bisector is perpendicular to the segment.` },
        { value: lineEq(along.inv(), M[1] - p * p * k), why: 'For the perpendicular slope, flip the fraction and change its sign as well.' },
        k === 0 ? null : { value: lineEq(s2, M[1]), why: R`The \(y\)-coordinate of the midpoint is the intercept only when the midpoint is on the \(y\)-axis. Substitute the midpoint into \(y = mx + b\).` },
        lineEq(along.neg(), b2),
        lineEq(s2, b2 + p * p + 1),
      ],
      solution: [
        R`The bisector passes through the midpoint of \(\overline{AB}\): \(M = \left(\dfrac{${A[0]} + ${paren(B[0])}}{2}, \dfrac{${A[1]} + ${paren(B[1])}}{2}\right) = ${pt(M)}\).`,
        R`Slope of \(\overline{AB}\): \(\dfrac{${B[1]} - ${paren(A[1])}}{${B[0]} - ${paren(A[0])}} = ${fracTex(2 * t * r, 2 * t * p)} = ${along.tex()}\). The bisector is perpendicular to the segment, so its slope is the negative reciprocal, \(${s2.tex()}\).`,
        R`Substitute \(M\) into \(y = mx + b\): \(${M[1]} = ${dot(s2, M[0])} + b\), which is \(${M[1]} = ${-p * p * k} + b\). So \(b = ${b2}\).`,
        R`The perpendicular bisector is \(y = ${linear(s2, b2)}\).`,
      ],
      rule: 3,
      skill: 'equations of lines',
      check: () => ([[0, b2], [r, b2 - p]].every((X) => len2(X, A) === len2(X, B)) ? true : 'points of the line in the answer are not the same distance from A and B'),
    });
  }
}

// ───────────── Challenge ─────────────

const QUADS = {
  square: ['a square', 'A square needs four right angles and four congruent sides. Test both.'],
  rectangle: ['a rectangle, but not a square', 'A rectangle needs four right angles, and it is a square if its sides are congruent as well.'],
  rhombus: ['a rhombus, but not a square', 'A rhombus needs four congruent sides, and it is a square if its angles are right angles as well.'],
  parallelogram: ['a parallelogram, but not a rectangle or a rhombus', 'Check whether both pairs of opposite sides are parallel, then test the angles and the side lengths.'],
  trapezoid: ['a trapezoid with exactly one pair of parallel sides', 'A trapezoid has only one pair of parallel sides. Compare the slopes of both pairs of opposite sides.'],
};

/** Classifies a quadrilateral from its sides: which are parallel, perpendicular or congruent. */
function quadType(P) {
  const side = [0, 1, 2, 3].map((i) => vec(P[i], P[(i + 1) % 4]));
  const parallel = [cross(side[0], side[2]) === 0, cross(side[1], side[3]) === 0];
  if (parallel[0] !== parallel[1]) return 'trapezoid';
  if (!parallel[0]) return 'other';
  const right = dotp(side[0], side[1]) === 0;
  const equal = dotp(side[0], side[0]) === dotp(side[1], side[1]);
  return right && equal ? 'square' : right ? 'rectangle' : equal ? 'rhombus' : 'parallelogram';
}

function challengeClassifyQuad(rng) {
  for (;;) {
    const want = rng.pick(Object.keys(QUADS));
    const s = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    const turn = [-s[1], s[0]];
    const t = want === 'square' ? turn : want === 'rectangle' ? [2 * turn[0], 2 * turn[1]] : want === 'rhombus' ? [s[1], s[0]] : [rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
    const A = [rng.int(-6, 6), rng.int(-6, 6)];
    const P = [A, add(A, s, want === 'trapezoid' ? rng.pick([2, 3]) : 1), add(add(A, t), s), add(A, t)];
    const sides = [0, 1, 2, 3].map((i) => vec(P[i], P[(i + 1) % 4]));
    if (quadType(P) !== want || !inside(P) || sides.some((d) => d[0] === 0) || Math.abs(cross(s, t)) < 6) continue;
    const slope = sides.map((d) => frac(d[1], d[0]));
    const names = ['AB', 'BC', 'CD', 'DA'];
    const [ab2, bc2] = [len2(P[0], P[1]), len2(P[1], P[2])];
    const product = slope[0].mul(slope[1]);
    const family = want !== 'trapezoid';
    return q({
      prompt: R`Quadrilateral \(ABCD\) has vertices \(A${pt(P[0])}\), \(B${pt(P[1])}\), \(C${pt(P[2])}\) and \(D${pt(P[3])}\). What is the most precise name for \(ABCD\)?`,
      visual: plane(P, { polygons: [{ points: P }], points: named('ABCD', P) }, `A coordinate grid showing quadrilateral ABCD with vertices A${ptT(P[0])}, B${ptT(P[1])}, C${ptT(P[2])} and D${ptT(P[3])}.`),
      correct: QUADS[want][0],
      wrong: Object.keys(QUADS).filter((key) => key !== want).map((key) => ({ value: QUADS[key][0], why: QUADS[key][1] })),
      solution: [
        `Find the slope of each side. ${names.map((name, i) => R`\(\overline{${name}}\): \(${slope[i].tex()}\)`).join(', ')}.`,
        family
          ? R`\(\overline{AB}\) and \(\overline{CD}\) have equal slopes, and so do \(\overline{BC}\) and \(\overline{DA}\). Both pairs of opposite sides are parallel, so \(ABCD\) is a parallelogram.`
          : R`\(\overline{AB}\) and \(\overline{CD}\) have equal slopes, so they are parallel. \(\overline{BC}\) and \(\overline{DA}\) have different slopes, so they are not.`,
        family ? R`Adjacent sides: \(${dot(slope[0], slope[1])} = ${product.tex()}\). ${product.eq(-1) ? R`The product is \(-1\), so the sides are perpendicular and the angles are right angles.` : R`The product is not \(-1\), so the angles are not right angles.`}` : null,
        family ? R`Side lengths: \(AB^2 = ${ab2}\) and \(BC^2 = ${bc2}\), so adjacent sides are ${ab2 === bc2 ? 'congruent' : 'not congruent'}.` : null,
        R`\(ABCD\) is ${QUADS[want][0]}.`,
      ].filter(Boolean),
      rule: 5,
      skill: 'classifying quadrilaterals',
      check: () => {
        // A second method: the diagonals. They bisect each other in a parallelogram, are congruent in a rectangle and perpendicular in a rhombus.
        const bisect = P[0][0] + P[2][0] === P[1][0] + P[3][0] && P[0][1] + P[2][1] === P[1][1] + P[3][1];
        const congruent = len2(P[0], P[2]) === len2(P[1], P[3]);
        const perpendicular = dotp(vec(P[0], P[2]), vec(P[1], P[3])) === 0;
        const found = !bisect ? (slope[0].eq(slope[2]) && !slope[1].eq(slope[3]) ? 'trapezoid' : 'other') : congruent && perpendicular ? 'square' : congruent ? 'rectangle' : perpendicular ? 'rhombus' : 'parallelogram';
        return found === want ? true : `the diagonals say this is a ${found}`;
      },
    });
  }
}

function challengeMissingCoordinate(rng) {
  for (;;) {
    const [n, d] = rng.pick(SLOPES);
    const s = frac(n * rng.sign(), d);
    const b = rng.int(-4, 4);
    const perp = rng.bool(0.65);
    const s2 = perp ? s.inv().neg() : s;
    const j = rng.nonzero(-3, 3);
    const A = [rng.int(-6, 6), rng.int(-6, 6)];
    const run = s2.d * j;
    const [x2, k] = [A[0] + run, A[1] + s2.n * j];
    if (!inside([[x2, k]])) continue;
    const slip = (slope) => slope.mul(run).add(A[1]); // the value of k that a different slope would give
    return q({
      prompt: R`The line through \(A${pt(A)}\) and \(B(${x2}, k)\) is ${perp ? 'perpendicular' : 'parallel'} to the line \(y = ${linear(s, b)}\). What is the value of \(k\)?`,
      visual: plane([A, [x2, k], [0, b]], { fns: [{ f: (x) => s.value * x + b }], points: [{ x: A[0], y: A[1], label: 'A' }], vlines: [{ x: x2 }] }, `A coordinate grid showing ${lineSeen(s, b)}, the point A${ptT(A)}, and a dashed vertical line at x = ${T(x2)}, on which B lies.`),
      correct: frac(k),
      fmt: (v) => R`\(k = ${v.tex()}\)`,
      wrong: [
        { value: slip(perp ? s : s.inv().neg()), why: perp ? 'That makes the two lines parallel. Perpendicular lines have slopes that are negative reciprocals.' : 'That makes the two lines perpendicular. Parallel lines have equal slopes.' },
        { value: slip(s2.neg()), why: R`Check the sign of the slope, and whether \(y\) goes up or down from \(A\) to \(B\).` },
        { value: frac(A[1]), why: R`That would make \(\overline{AB}\) horizontal, with slope \(0\).` },
        slip(s2).add(2),
      ],
      solution: [
        perp ? R`The given line has slope \(${s.tex()}\). A perpendicular line has the negative reciprocal slope, so the line through \(A\) and \(B\) has slope \(${s2.tex()}\).` : R`The given line has slope \(${s.tex()}\). A parallel line has the same slope, so the line through \(A\) and \(B\) has slope \(${s2.tex()}\).`,
        R`From \(A\) to \(B\), \(x\) changes by \(${x2} - ${paren(A[0])} = ${run}\). Slope is the change in \(y\) divided by the change in \(x\), so \(y\) changes by \(${dot(s2, run)} = ${s2.n * j}\).`,
        R`\(k = ${A[1]} + ${paren(s2.n * j)} = ${k}\).`,
      ],
      rule: 2,
      skill: 'parallel and perpendicular slopes',
      check: () => ((perp ? dotp([run, k - A[1]], [s.d, s.n]) : cross([run, k - A[1]], [s.d, s.n])) === 0 ? true : 'with that value the line through A and B has the wrong direction'),
    });
  }
}

function challengeMapArea(rng) {
  for (;;) {
    const s = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    const [k, j] = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]]);
    const A = [rng.int(-7, 7), rng.int(-7, 7)];
    const turn = [-s[1], s[0]];
    const B = add(A, s, k);
    const P = [A, B, add(B, turn, j), add(A, turn, j)];
    if (!inside(P)) continue;
    const N = s[0] ** 2 + s[1] ** 2;
    const scale = rng.pick([5, 10, 20]);
    const squares = k * j * N;
    const ans = squares * scale * scale;
    const place = rng.pick(['car park', 'playing field', 'vegetable plot', 'building site']);
    const span = (Math.max(...P.map((X) => X[0])) - Math.min(...P.map((X) => X[0]))) * (Math.max(...P.map((X) => X[1])) - Math.min(...P.map((X) => X[1]))); // the surrounding upright rectangle, in grid squares
    return q({
      prompt: R`A rectangular ${place} has its corners at \(A${pt(P[0])}\), \(B${pt(P[1])}\), \(C${pt(P[2])}\) and \(D${pt(P[3])}\) on a map grid. Each unit on the grid stands for \(${scale}\) m. What is the area of the ${place}?`,
      visual: plane(P, { polygons: [{ points: P }], points: named('ABCD', P) }, `A coordinate grid showing rectangle ABCD with corners A${ptT(P[0])}, B${ptT(P[1])}, C${ptT(P[2])} and D${ptT(P[3])}. Its sides are slanted.`),
      correct: ans,
      unit: 'm²',
      wrong: [
        { value: squares * scale, why: `Each grid square is ${scale} m by ${scale} m, so it stands for ${scale * scale} m², not ${scale} m².` },
        { value: squares, why: 'That is the area in grid squares. Each grid square stands for more than one square metre.' },
        { value: span * scale * scale, why: `That is the area of the upright rectangle that surrounds the ${place}. The ${place} itself is tilted, so find its side lengths with the distance formula.` },
        2 * ans,
      ],
      solution: [
        R`The sides are slanted, so use the distance formula. \(AB = \sqrt{${paren(k * s[0])}^2 + ${paren(k * s[1])}^2} = \sqrt{${k * k * N}}\) and \(BC = \sqrt{${paren(j * turn[0])}^2 + ${paren(j * turn[1])}^2} = \sqrt{${j * j * N}}\) grid units.`,
        R`Area on the grid: \(AB \cdot BC = \sqrt{${k * k * N}} \cdot \sqrt{${j * j * N}} = \sqrt{${k * k * j * j * N * N}} = ${squares}\) square units.`,
        R`Each square unit stands for \(${scale} \cdot ${scale} = ${scale * scale}\) m², so the area is \(${squares} \cdot ${scale * scale} = ${num(ans)}\) m².`,
      ],
      rule: 6,
      skill: 'perimeter and area',
      check: () => (shoelace(P) * scale * scale === ans && quadType(P) === 'rectangle' ? true : 'the area measured from the coordinates is different, or the corners do not make a rectangle'),
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'coordinate-geometry',
  title: 'Coordinate Geometry',
  summary: 'Use coordinates to find distances, midpoints and slopes, write equations of lines, and prove what shape a figure is.',
  standards: ['CCSS G-GPE.B.4', 'CCSS G-GPE.B.5', 'CCSS G-GPE.B.6', 'CCSS G-GPE.B.7'],

  explain: {
    intro: R`On the coordinate plane every point has an address, so geometry can be done with arithmetic. Lengths come from the Pythagorean theorem, directions come from slope, and together they let you **prove** facts about a figure instead of judging by how it looks.`,
    rules: [
      {
        title: 'The distance formula',
        text: R`The segment from \((x_1, y_1)\) to \((x_2, y_2)\) is the hypotenuse of a right triangle whose legs are the horizontal and vertical changes. So \(d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}\).`,
        example: R`From \((1, 2)\) to \((4, 6)\): \(d = \sqrt{3^2 + 4^2} = \sqrt{25} = 5\).`,
      },
      {
        title: 'The midpoint formula',
        text: R`The midpoint of a segment is the average of its endpoints: \(M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)\). Add the coordinates, then halve.`,
        example: R`The midpoint of \((-2, 5)\) and \((4, 1)\) is \(\left(\frac{-2 + 4}{2}, \frac{5 + 1}{2}\right) = (1, 3)\).`,
      },
      {
        title: 'Slopes of parallel and perpendicular lines',
        text: R`Slope is the change in \(y\) divided by the change in \(x\). Parallel lines have **equal** slopes. Perpendicular lines have slopes that are **negative reciprocals**: flip the fraction and change its sign, so the two slopes multiply to \(-1\). (A vertical line and a horizontal line are also perpendicular.)`,
        example: R`Slopes \(\frac{2}{3}\) and \(-\frac{3}{2}\) belong to perpendicular lines: \(\frac{2}{3} \cdot \left(-\frac{3}{2}\right) = -1\).`,
      },
      {
        title: 'Equations of parallel and perpendicular lines',
        text: R`To write the line through a given point that is parallel or perpendicular to a given line: find the slope you need, then substitute the point into \(y = mx + b\) to find \(b\).`,
        example: R`Through \((2, 1)\), perpendicular to \(y = \frac{2}{3}x + 5\): the slope is \(-\frac{3}{2}\), and \(1 = -\frac{3}{2}(2) + b\) gives \(b = 4\). The line is \(y = -\frac{3}{2}x + 4\).`,
      },
      {
        title: 'Partitioning a segment',
        text: R`If \(P\) divides the segment from \(A\) to \(B\) in the ratio \(a : b\), the segment has \(a + b\) equal steps and \(P\) is \(\frac{a}{a + b}\) of the way from \(A\). Add that fraction of the change in \(x\) and of the change in \(y\) to the coordinates of \(A\).`,
        example: R`\(A(1, 2)\), \(B(11, 7)\), ratio \(2 : 3\): \(P\) is \(\frac{2}{5}\) of the way, so \(P = \left(1 + \frac{2}{5}(10), 2 + \frac{2}{5}(5)\right) = (5, 4)\).`,
      },
      {
        title: 'Classifying figures',
        text: R`Use slopes to show that sides are parallel or perpendicular, and the distance formula to show that sides are congruent. Two pairs of parallel sides make a parallelogram; add right angles for a rectangle, four congruent sides for a rhombus, and both for a square. A triangle has a right angle when the squares of its two shorter sides add up to the square of the longest.`,
        example: R`Sides with slopes \(\frac{1}{2}, -2, \frac{1}{2}, -2\) form a parallelogram with right angles, because \(\frac{1}{2} \cdot (-2) = -1\). It is a rectangle.`,
      },
      {
        title: 'Perimeter and area on the plane',
        text: R`Horizontal and vertical lengths can be counted on the grid. Slanted sides need the distance formula. For area, use a base and a height that are perpendicular to each other, and remember that a map scale applies to both of them.`,
        example: R`The triangle with vertices \((0, 0)\), \((4, 0)\) and \((0, 3)\) has sides \(4\), \(3\) and \(\sqrt{4^2 + 3^2} = 5\): perimeter \(12\), area \(\frac{1}{2}(4)(3) = 6\).`,
      },
    ],
    vocab: [
      { term: 'slope', def: R`The steepness of a line: the change in \(y\) divided by the change in \(x\) between any two of its points.` },
      { term: 'negative reciprocal', def: R`The number you get by flipping a fraction and changing its sign. The negative reciprocal of \(\frac{2}{3}\) is \(-\frac{3}{2}\).` },
      { term: 'midpoint', def: 'The point that divides a segment into two congruent parts.' },
      { term: 'perpendicular bisector', def: 'The line that passes through the midpoint of a segment and is perpendicular to it.' },
      { term: 'partition', def: R`To divide a segment into parts with a given ratio, such as \(2 : 3\).` },
    ],
    mistakes: [
      'Subtracting the coordinates to find a midpoint. A midpoint is an average: add, then halve.',
      'Adding the horizontal and vertical changes to get a distance. Square them, add, then take the square root.',
      'Flipping a slope without changing its sign, or changing its sign without flipping it, when a perpendicular slope is needed.',
      R`Using \(\frac{a}{b}\) instead of \(\frac{a}{a + b}\) when a segment is divided in the ratio \(a : b\).`,
      'Naming a figure from the way it looks. Slopes and distances are the proof.',
    ],
    visual: plane([[-3, 1], [5, 7]], { points: [{ x: -3, y: 1, label: 'A' }, { x: 5, y: 7, label: 'B' }, { x: 1, y: 4, label: 'M', color: 'c' }], segments: [{ from: [-3, 1], to: [5, 7] }, { from: [-3, 1], to: [5, 1], dashed: true, label: '8' }, { from: [5, 1], to: [5, 7], dashed: true, label: '6' }] }, 'A coordinate grid showing the segment from A(−3, 1) to B(5, 7) and its midpoint M(1, 4). Dashed legs 8 units across and 6 units up make a right triangle with the segment as its hypotenuse.'),
  },

  examples: [
    {
      title: 'Distance and midpoint',
      problem: R`Find the length and the midpoint of the segment with endpoints \(A(-3, 1)\) and \(B(5, 7)\).`,
      steps: [
        R`Changes: \(x\) goes from \(-3\) to \(5\), a change of \(8\). \(y\) goes from \(1\) to \(7\), a change of \(6\).`,
        R`Length: \(AB = \sqrt{8^2 + 6^2} = \sqrt{64 + 36} = \sqrt{100} = 10\).`,
        R`Midpoint: \(\left(\frac{-3 + 5}{2}, \frac{1 + 7}{2}\right) = (1, 4)\).`,
      ],
      answer: R`\(AB = 10\); the midpoint is \((1, 4)\)`,
      visual: plane([[-3, 1], [5, 7]], { points: [{ x: -3, y: 1, label: 'A' }, { x: 5, y: 7, label: 'B' }], segments: [{ from: [-3, 1], to: [5, 7] }, { from: [-3, 1], to: [5, 1], dashed: true }, { from: [5, 1], to: [5, 7], dashed: true }] }, 'A coordinate grid showing the segment from A(−3, 1) to B(5, 7), with dashed legs 8 units across and 6 units up.'),
    },
    {
      title: 'A perpendicular line through a point',
      problem: R`Write an equation of the line through \((2, 1)\) that is perpendicular to \(y = \frac{2}{3}x + 5\).`,
      steps: [
        R`The given line has slope \(\frac{2}{3}\). A perpendicular line has the negative reciprocal slope: flip to \(\frac{3}{2}\), then change the sign to get \(-\frac{3}{2}\).`,
        R`Substitute the point \((2, 1)\) into \(y = mx + b\): \(1 = -\frac{3}{2}(2) + b\), so \(1 = -3 + b\) and \(b = 4\).`,
        R`The line is \(y = -\frac{3}{2}x + 4\). Check: at \(x = 2\), \(y = -3 + 4 = 1\). ✓`,
      ],
      answer: R`\(y = -\frac{3}{2}x + 4\)`,
      visual: plane([[2, 1], [0, 5]], { fns: [{ f: (x) => (2 * x) / 3 + 5 }, { f: (x) => (-3 * x) / 2 + 4, dashed: true }], points: [{ x: 2, y: 1, label: 'P' }] }, 'A coordinate grid showing the line with slope 2/3 that crosses the y-axis at 5, the point P(2, 1), and a dashed line through P that meets the first line at a right angle.'),
    },
    {
      title: 'Word problem: a rest stop on a trail',
      word: true,
      problem: R`A straight hiking trail runs from the car park at \(A(-4, 1)\) to a lookout at \(B(6, 6)\) on a map grid. A rest stop is built \(\frac{3}{5}\) of the way along the trail from the car park. Where is it?`,
      steps: [
        R`From \(A\) to \(B\), \(x\) changes by \(6 - (-4) = 10\) and \(y\) changes by \(6 - 1 = 5\).`,
        R`The rest stop is \(\frac{3}{5}\) of the way, so take \(\frac{3}{5}\) of each change: \(\frac{3}{5}(10) = 6\) and \(\frac{3}{5}(5) = 3\).`,
        R`Add those to the coordinates of \(A\): \((-4 + 6, 1 + 3) = (2, 4)\).`,
        R`This point divides the trail in the ratio \(3 : 2\), because \(3\) of the \(5\) equal steps are behind it and \(2\) are ahead.`,
      ],
      answer: R`The rest stop is at \((2, 4)\).`,
      visual: plane([[-4, 1], [6, 6]], { points: [{ x: -4, y: 1, label: 'A' }, { x: 6, y: 6, label: 'B' }, { x: 2, y: 4, label: 'P', color: 'c' }], segments: [{ from: [-4, 1], to: [6, 6] }] }, 'A coordinate grid showing the segment from A(−4, 1) to B(6, 6) and the point P(2, 4) on it, three fifths of the way from A to B.'),
    },
    {
      title: 'Proving that a quadrilateral is a rectangle',
      problem: R`Quadrilateral \(ABCD\) has vertices \(A(1, 1)\), \(B(5, 3)\), \(C(4, 5)\) and \(D(0, 3)\). Show that it is a rectangle but not a square, and find its area.`,
      steps: [
        R`Slopes: \(\overline{AB}\): \(\frac{3 - 1}{5 - 1} = \frac{1}{2}\). \(\overline{BC}\): \(\frac{5 - 3}{4 - 5} = -2\). \(\overline{CD}\): \(\frac{3 - 5}{0 - 4} = \frac{1}{2}\). \(\overline{DA}\): \(\frac{1 - 3}{1 - 0} = -2\).`,
        R`Opposite sides have equal slopes, so they are parallel and \(ABCD\) is a parallelogram. Adjacent slopes multiply to \(\frac{1}{2} \cdot (-2) = -1\), so the angles are right angles: it is a rectangle.`,
        R`Lengths: \(AB = \sqrt{4^2 + 2^2} = \sqrt{20}\) and \(BC = \sqrt{(-1)^2 + 2^2} = \sqrt{5}\). They are different, so it is not a square.`,
        R`Area: \(AB \cdot BC = \sqrt{20} \cdot \sqrt{5} = \sqrt{100} = 10\) square units.`,
      ],
      answer: R`\(ABCD\) is a rectangle that is not a square, with area \(10\) square units.`,
      visual: plane([[1, 1], [5, 3], [4, 5], [0, 3]], { polygons: [{ points: [[1, 1], [5, 3], [4, 5], [0, 3]] }], points: named('ABCD', [[1, 1], [5, 3], [4, 5], [0, 3]]) }, 'A coordinate grid showing quadrilateral ABCD with vertices A(1, 1), B(5, 3), C(4, 5) and D(0, 3).'),
    },
  ],

  models: [
    {
      id: 'segment-facts',
      title: 'Length, midpoint and slope of a segment',
      intro: 'Choose the two endpoints of a segment.',
      inputs: [
        { name: 'x1', label: 'x-coordinate of A', type: 'int', min: -10, max: 10, value: -3 },
        { name: 'y1', label: 'y-coordinate of A', type: 'int', min: -10, max: 10, value: 1 },
        { name: 'x2', label: 'x-coordinate of B', type: 'int', min: -10, max: 10, value: 5 },
        { name: 'y2', label: 'y-coordinate of B', type: 'int', min: -10, max: 10, value: 7 },
      ],
      compute({ x1, y1, x2, y2 }) {
        if (x1 === x2 && y1 === y2) return { error: 'A and B are the same point, so there is no segment between them. Change one of the coordinates.' };
        const [dx, dy] = [x2 - x1, y2 - y1];
        const n = dx * dx + dy * dy;
        const M = [frac(x1 + x2, 2), frac(y1 + y2, 2)];
        const root = R`\sqrt{${n}}`;
        const length = isSquare(n) ? `${Math.sqrt(n)}` : sqrtTex(n);
        const about = isSquare(n) ? '' : R` \approx ${num(Math.sqrt(n), { places: 2 })}`;
        const slope = dx === 0 ? null : frac(dy, dx);
        const raw = fracTex(dy, dx);
        const slopeStep =
          slope === null
            ? R`Slope: the change in \(x\) is \(0\), so the segment is vertical and it has no slope: dividing by \(0\) is not possible. Lines parallel to it are vertical, and lines perpendicular to it are horizontal.`
            : slope.n === 0
              ? R`Slope: the change in \(y\) is \(0\), so the segment is horizontal and its slope is \(0\). Lines parallel to it are horizontal, and lines perpendicular to it are vertical.`
              : R`Slope: \(${raw}${raw === slope.tex() ? '' : ` = ${slope.tex()}`}\). Parallel lines have slope \(${slope.tex()}\), and perpendicular lines have slope \(${slope.inv().neg().tex()}\).`;
        return {
          problem: R`Find the length, the midpoint and the slope of the segment from \(A${point(x1, y1)}\) to \(B${point(x2, y2)}\).`,
          steps: [
            R`Change in \(x\): \(${x2} - ${paren(x1)} = ${dx}\). Change in \(y\): \(${y2} - ${paren(y1)} = ${dy}\).`,
            R`Length: \(\sqrt{${paren(dx)}^2 + ${paren(dy)}^2} = ${root === length ? root : `${root} = ${length}`}${about}\).`,
            R`Midpoint: \(\left(\dfrac{${x1} + ${paren(x2)}}{2}, \dfrac{${y1} + ${paren(y2)}}{2}\right) = \left(${M[0].tex()}, ${M[1].tex()}\right)\).`,
            slopeStep,
          ],
          answer: R`Length \(${length}${about}\); midpoint \(\left(${M[0].tex()}, ${M[1].tex()}\right)\); ${slope === null ? 'no slope (the segment is vertical)' : R`slope \(${slope.tex()}\)`}`,
          visual: plane([[x1, y1], [x2, y2]], { points: [{ x: x1, y: y1, label: 'A' }, { x: x2, y: y2, label: 'B' }, { x: M[0].value, y: M[1].value, label: 'M', color: 'c' }], segments: [{ from: [x1, y1], to: [x2, y2] }] }, `A coordinate grid showing the segment from A${ptT([x1, y1])} to B${ptT([x2, y2])} and its midpoint M(${M[0].text()}, ${M[1].text()}).`),
        };
      },
    },
    {
      id: 'bench-on-a-path',
      title: 'Word problem: a bench on a path',
      word: true,
      intro: 'A straight path runs from a gate to a fountain. Choose where they are and how the bench divides the path.',
      inputs: [
        { name: 'x1', label: 'x-coordinate of the gate', type: 'int', min: -10, max: 10, value: -4 },
        { name: 'y1', label: 'y-coordinate of the gate', type: 'int', min: -10, max: 10, value: 1 },
        { name: 'x2', label: 'x-coordinate of the fountain', type: 'int', min: -10, max: 10, value: 6 },
        { name: 'y2', label: 'y-coordinate of the fountain', type: 'int', min: -10, max: 10, value: 6 },
        { name: 'a', label: 'Ratio, first part (gate to bench)', type: 'int', min: 1, max: 9, value: 3 },
        { name: 'b', label: 'Ratio, second part (bench to fountain)', type: 'int', min: 1, max: 9, value: 2 },
      ],
      compute({ x1, y1, x2, y2, a, b }) {
        if (x1 === x2 && y1 === y2) return { error: 'The gate and the fountain are at the same point, so there is no path between them. Move one of them.' };
        const part = frac(a, a + b);
        const [dx, dy] = [x2 - x1, y2 - y1];
        const P = [part.mul(dx).add(x1), part.mul(dy).add(y1)];
        return {
          problem: R`A straight path runs from a gate at \(A${point(x1, y1)}\) to a fountain at \(B${point(x2, y2)}\). A bench at \(P\) divides the path so that \(AP : PB = ${a} : ${b}\). Where is the bench?`,
          steps: [
            R`The ratio \(${a} : ${b}\) splits the path into \(${a} + ${b} = ${a + b}\) equal steps, and the bench is \(${a}\) of them from the gate. So \(P\) is \(${part.tex()}\) of the way from \(A\) to \(B\).`,
            R`From \(A\) to \(B\), \(x\) changes by \(${x2} - ${paren(x1)} = ${dx}\) and \(y\) changes by \(${y2} - ${paren(y1)} = ${dy}\).`,
            R`\(x = ${x1} + ${part.tex()}(${dx}) = ${P[0].tex()}\) and \(y = ${y1} + ${part.tex()}(${dy}) = ${P[1].tex()}\).`,
          ],
          answer: R`The bench is at \(\left(${P[0].tex()}, ${P[1].tex()}\right)\).`,
          visual: plane([[x1, y1], [x2, y2]], { points: [{ x: x1, y: y1, label: 'A' }, { x: x2, y: y2, label: 'B' }, { x: P[0].value, y: P[1].value, label: 'P', color: 'c' }], segments: [{ from: [x1, y1], to: [x2, y2] }] }, `A coordinate grid showing the path from A${ptT([x1, y1])} to B${ptT([x2, y2])} and the bench P at (${P[0].text()}, ${P[1].text()}).`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyMidpoint, easyDistance, easySlopes],
    medium: [mediumDistance, mediumLineEquation, mediumPartition],
    hard: [hardClassifyTriangle, hardPerimeterArea, hardPerpBisector],
    challenge: [challengeClassifyQuad, challengeMissingCoordinate, challengeMapArea],
  },
};
