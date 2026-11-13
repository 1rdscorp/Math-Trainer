import { R, q, num, round, frac, sqrtTex, isSquare, integrate, numDeriv, close, person } from '../../lib/index.js';
import { T, piTex, shoelace, rightMark, LENGTH_UNITS } from './_shared.js';

const PI = Math.PI;
const r3 = (v) => Math.round(v * 1000) / 1000;
const piFmt = (unit) => (v) => R`\(${piTex(v)}\) ${unit}`;
// [offset, height, slanted side]: right triangles used to give slanted sides whole-number lengths.
const SLANTS = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17]];
const MATERIALS = [['aluminium', 2.7], ['glass', 2.5], ['steel', 7.8], ['copper', 8.9], ['silver', 10.5], ['gold', 19.3], ['oak', 0.7], ['pine', 0.5], ['ice', 0.9], ['concrete', 2.4], ['brass', 8.5]];

// ───────────── checks ─────────────
// These measure without the formulas being taught: a circle as a many-sided polygon, a solid as a stack of
// thin slices (integrate), and the faces of a pyramid from the coordinates of its corners.

const disc = (r) => shoelace(Array.from({ length: 720 }, (_, i) => [r * Math.cos((PI * i) / 360), r * Math.sin((PI * i) / 360)]));
const rim = (r) => 1440 * r * Math.sin(PI / 720);
const sphereVolume = (r) => integrate((z) => PI * (r * r - z * z), -r, r);
const coneVolume = (r, h) => integrate((z) => PI * ((r * z) / h) ** 2, 0, h);
const pyramidVolume = (s, h) => integrate((z) => ((s * z) / h) ** 2, 0, h);

function pyramidSurface(s, h) {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [(x * s) / 2, (y * s) / 2, -h]); // seen from the apex
  const face = (u, v) => Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
  return s * s + corners.reduce((sum, P, i) => sum + face(P, corners[(i + 1) % 4]), 0);
}

// ───────────── figures ─────────────

const solid = (kind, labels, alt) => ({ type: 'solid', kind, labels, alt });

/** A flat shape drawn to scale with a dashed height from `top` straight down to the base. */
function heightFigure(points, sides, top, hLabel, alt) {
  const foot = [top[0], 0];
  const width = Math.max(...points.map((pt) => pt[0]));
  return { type: 'polygon', points, sides, extra: [{ from: top, to: foot, label: hLabel }, ...rightMark(top, foot, [width, 0], 0.04 * width)], alt };
}

/** Points along the top half of a circle of radius r centred at (0, y), from the right end to the left end. */
const dome = (r, y) => Array.from({ length: 19 }, (_, i) => [r3(r * Math.cos((PI * i) / 18)), r3(y + r * Math.sin((PI * i) / 18))]);

// ───────────── Easy ─────────────

function easyPolygonArea(rng) {
  const [p, h, s] = rng.pick(SLANTS);
  const u = rng.pick(LENGTH_UNITS);
  const kind = rng.pick(['triangle', 'parallelogram', 'trapezoid']);
  let b = p + rng.int(3, 9);
  if (h % 2 && b % 2) b += 1; // keeps half of base × height a whole number
  let top = rng.int(2, b - p);
  if (h % 2 && top % 2) top += top < b - p ? 1 : -1;
  const slanted = `The side of ${s} ${u} is slanted, so it is not the height. The height is perpendicular to the base.`;
  const spec = {
    triangle: {
      prompt: R`A triangle has a base of \(${b}\) ${u} and a height of \(${h}\) ${u}. One of its other sides is \(${s}\) ${u} long. What is the area of the triangle?`,
      pts: [[0, 0], [b, 0], [p, h]],
      sides: [`${b}`, '', `${s}`],
      seen: `A triangle with a base of ${b} ${u}. A dashed height of ${h} ${u} meets the base at a right angle, and the left side is ${s} ${u} long.`,
      ans: (b * h) / 2,
      wrong: [{ value: (b * s) / 2, why: slanted }, { value: b * h, why: 'That is the area of a parallelogram with this base and height. A triangle is half of it.' }, b + h + s, b * s],
      steps: [R`The area of a triangle is \(A = \frac{1}{2}bh\), where the height \(h\) is perpendicular to the base. The side of \(${s}\) ${u} is not needed.`, R`\(A = \frac{1}{2}(${b})(${h}) = ${(b * h) / 2}\) ${u}².`],
    },
    parallelogram: {
      prompt: R`A parallelogram has a base of \(${b}\) ${u} and a height of \(${h}\) ${u}. Its slanted sides are \(${s}\) ${u} long. What is the area of the parallelogram?`,
      pts: [[0, 0], [b, 0], [b + p, h], [p, h]],
      sides: [`${b}`, `${s}`, '', ''],
      seen: `A parallelogram with a base of ${b} ${u} and slanted sides of ${s} ${u}. A dashed height of ${h} ${u} meets the base at a right angle.`,
      ans: b * h,
      wrong: [{ value: b * s, why: slanted }, { value: (b * h) / 2, why: 'That is the area of a triangle with this base and height. A parallelogram is twice that: base times height.' }, { value: 2 * (b + s), why: 'That is the perimeter, the distance around the parallelogram.' }],
      steps: [R`The area of a parallelogram is \(A = bh\), where the height is the perpendicular distance between the base and the opposite side. The slanted side of \(${s}\) ${u} is not needed.`, R`\(A = (${b})(${h}) = ${b * h}\) ${u}².`],
    },
    trapezoid: {
      prompt: R`A trapezoid has parallel sides of \(${b}\) ${u} and \(${top}\) ${u}, and they are \(${h}\) ${u} apart. One of its other sides is \(${s}\) ${u} long. What is the area of the trapezoid?`,
      pts: [[0, 0], [b, 0], [p + top, h], [p, h]],
      sides: [`${b}`, '', `${top}`, `${s}`],
      seen: `A trapezoid with a bottom side of ${b} ${u} and a parallel top side of ${top} ${u}. A dashed height of ${h} ${u} meets the bottom side at a right angle, and the left side is ${s} ${u} long.`,
      ans: ((b + top) * h) / 2,
      wrong: [{ value: (b + top) * h, why: R`Take **half** the sum of the parallel sides: \(A = \frac{1}{2}(b_1 + b_2)h\).` }, { value: ((b + top) * s) / 2, why: slanted }, { value: b * h, why: 'That uses only one of the parallel sides. Use half of their sum.' }, (b * top * h) / 2],
      steps: [R`The area of a trapezoid is \(A = \frac{1}{2}(b_1 + b_2)h\): half the sum of the parallel sides, times the distance between them. The side of \(${s}\) ${u} is not needed.`, R`\(A = \frac{1}{2}(${b} + ${top})(${h}) = \frac{1}{2}(${b + top})(${h}) = ${((b + top) * h) / 2}\) ${u}².`],
    },
  }[kind];
  return q({
    prompt: spec.prompt,
    visual: heightFigure(spec.pts, spec.sides, [p, h], `${h}`, spec.seen),
    correct: spec.ans,
    unit: `${u}²`,
    wrong: spec.wrong,
    solution: spec.steps,
    rule: 0,
    skill: 'areas of polygons',
    check: () => (Math.abs(shoelace(spec.pts) - spec.ans) < 1e-9 && Math.hypot(p, h) === s ? true : 'the area measured from the coordinates is different'),
  });
}

function easyPrismVolume(rng) {
  const u = rng.pick(LENGTH_UNITS);
  const kind = rng.pick(['box', 'triangular', 'cylinder']);
  if (kind === 'cylinder') {
    const r = rng.int(2, 9);
    const h = rng.intExcept(3, 12, [r]);
    return q({
      prompt: R`A cylinder has a radius of \(${r}\) ${u} and a height of \(${h}\) ${u}. What is its volume? Leave \(\pi\) in the answer.`,
      visual: solid('cylinder', { r: `${r}`, h: `${h}` }, `A cylinder with a radius of ${r} ${u} and a height of ${h} ${u}.`),
      correct: r * r * h,
      fmt: piFmt(`${u}³`),
      wrong: [
        { value: 2 * r * h, why: R`That is the area of the curved side, \(2\pi rh\). The volume is the area of the base times the height.` },
        { value: r * h, why: R`The base is a circle of area \(\pi r^2\), so the radius has to be squared.` },
        { value: r * r, why: 'That is only the area of the base. Multiply it by the height.' },
        4 * r * r * h,
      ],
      solution: [R`The volume of a cylinder is the area of its base times its height: \(V = \pi r^2 h\).`, R`\(V = \pi (${r})^2 (${h}) = \pi \cdot ${r * r} \cdot ${h} = ${r * r * h}\pi\) ${u}³.`],
      rule: 2,
      skill: 'volume of prisms and cylinders',
      check: () => (close(r * r * h * PI, disc(r) * h, 1e-4) ? true : 'base area times height gives a different volume'),
    });
  }
  if (kind === 'box') {
    const [l, w, h] = [rng.int(4, 12), rng.int(2, 8), rng.int(2, 9)];
    return q({
      prompt: R`A rectangular prism is \(${l}\) ${u} long, \(${w}\) ${u} wide and \(${h}\) ${u} high. What is its volume?`,
      visual: solid('box', { l: `${l}`, w: `${w}`, h: `${h}` }, `A rectangular prism ${l} ${u} long, ${w} ${u} wide and ${h} ${u} high.`),
      correct: l * w * h,
      unit: `${u}³`,
      wrong: [
        { value: 2 * (l * w + l * h + w * h), why: 'That is the surface area, the total area of the six faces. Volume is length times width times height.' },
        { value: l + w + h, why: 'Multiply the three dimensions. Adding them does not measure the space inside.' },
        { value: l * w, why: 'That is the area of the base. Multiply it by the height.' },
        2 * l * w * h,
      ],
      solution: [R`The volume of a rectangular prism is the area of its base times its height: \(V = lwh\).`, R`\(V = (${l})(${w})(${h}) = ${l * w * h}\) ${u}³.`],
      rule: 2,
      skill: 'volume of prisms and cylinders',
      check: () => (shoelace([[0, 0], [l, 0], [l, w], [0, w]]) * h === l * w * h ? true : 'base area times height gives a different volume'),
    });
  }
  const b = 2 * rng.int(2, 6);
  const t = rng.int(3, 9);
  const l = rng.int(5, 15);
  return q({
    prompt: R`A triangular prism is \(${l}\) ${u} long. Its base is a right triangle with legs of \(${b}\) ${u} and \(${t}\) ${u}. What is the volume of the prism?`,
    visual: solid('triPrism', { b: `${b}`, h: `${t}`, l: `${l}` }, `A triangular prism ${l} ${u} long. Its base is a right triangle with legs of ${b} ${u} and ${t} ${u}.`),
    correct: (b * t * l) / 2,
    unit: `${u}³`,
    wrong: [
      { value: b * t * l, why: R`The base is a triangle, so its area is \(\frac{1}{2}bh\), half of \(bh\).` },
      { value: (b * t) / 2, why: 'That is only the area of the triangular base. Multiply it by the length of the prism.' },
      (b + t) * l,
      (b * t) / 2 + l,
      b + t + l,
    ],
    solution: [R`The volume of a prism is the area of its base times its length. The base is a right triangle: \(B = \frac{1}{2}(${b})(${t}) = ${(b * t) / 2}\) ${u}².`, R`\(V = ${(b * t) / 2} \cdot ${l} = ${(b * t * l) / 2}\) ${u}³.`],
    rule: 2,
    skill: 'volume of prisms and cylinders',
    check: () => (shoelace([[0, 0], [b, 0], [0, t]]) * l === (b * t * l) / 2 ? true : 'base area times length gives a different volume'),
  });
}

// [picture, the cut or the rotation, answer, wrong answers, reason]
const SECTIONS = [
  ['cylinder', 'A cylinder is cut by a plane parallel to its bases.', 'a circle', ['a rectangle', 'an oval that is not a circle', 'a triangle'], 'Every slice parallel to the bases is congruent to the bases, and the bases are circles.'],
  ['cylinder', 'An upright cylinder is cut by a vertical plane through the centres of both bases.', 'a rectangle', ['a circle', 'a triangle', 'a trapezoid'], 'The cut goes straight down through both bases. It is as wide as the diameter all the way down, so it is a rectangle.'],
  ['cone', 'A cone is cut by a plane parallel to its base.', 'a circle', ['a triangle', 'a rectangle', 'a semicircle'], 'A slice parallel to the base is a smaller copy of the base, so it is a circle.'],
  ['cone', 'An upright cone is cut by a vertical plane through its apex and the centre of its base.', 'a triangle', ['a circle', 'a rectangle', 'a semicircle'], 'The cut passes through the apex and across a diameter of the base. Its edges are that diameter and two slanted lines up to the apex, so it is a triangle.'],
  ['sphere', 'A sphere is cut by a plane.', 'a circle', ['a semicircle', 'an oval that is not a circle', 'a square'], 'Every flat slice of a sphere is a circle. It is largest when the plane passes through the centre.'],
  ['pyramid', 'A square pyramid is cut by a plane parallel to its base.', 'a square', ['a triangle', 'a trapezoid', 'a circle'], 'A slice parallel to the base is a smaller copy of the base, so it is a square.'],
  ['pyramid', 'An upright square pyramid is cut by a vertical plane through its apex.', 'a triangle', ['a square', 'a trapezoid', 'a rectangle'], 'The cut passes through the apex and straight across the base. Its edges are a segment of the base and two lines up to the apex, so it is a triangle.'],
  ['box', 'A rectangular prism is cut by a plane parallel to one of its faces.', 'a rectangle', ['a triangle', 'a trapezoid', 'a hexagon'], 'A slice parallel to a face is congruent to that face, so it is a rectangle.'],
  ['cube', 'A cube is cut by a plane parallel to one of its faces.', 'a square', ['a triangle', 'a hexagon', 'a rectangle that is not a square'], 'A slice parallel to a face is congruent to that face, so it is a square.'],
  ['triPrism', 'A triangular prism is cut by a plane parallel to its triangular bases.', 'a triangle', ['a rectangle', 'a trapezoid', 'a square'], 'Every slice parallel to the bases of a prism is congruent to the bases, which are triangles.'],
  [null, 'A rectangle is rotated all the way around one of its sides.', 'a cylinder', ['a cone', 'a sphere', 'a rectangular prism'], 'The side on the axis stays still. The opposite side sweeps out the curved surface, and the other two sides sweep out the circular ends: a cylinder.'],
  [null, 'A right triangle is rotated all the way around one of its legs.', 'a cone', ['a cylinder', 'a square pyramid', 'a sphere'], 'The leg on the axis becomes the height. The other leg sweeps out a circular base and the hypotenuse sweeps out the slanted surface: a cone.'],
  [null, 'A semicircle is rotated all the way around its diameter.', 'a sphere', ['a cylinder', 'a cone', 'a circle'], 'Every point of the arc stays the same distance from the centre as it turns, so the arc sweeps out a sphere.'],
  [null, 'A circle is slid straight upwards, perpendicular to its own plane.', 'a cylinder', ['a cone', 'a sphere', 'a circle'], 'Sliding a flat shape in a straight line builds a solid whose slices are all congruent to that shape. With a circle, that solid is a cylinder.'],
];

function easyCrossSection(rng) {
  const [pic, action, ans, wrong, reason] = rng.pick(SECTIONS);
  return q({
    prompt: `${action} ${pic ? 'What shape is the cross-section?' : 'What solid does it sweep out?'}`,
    visual: pic ? solid(pic, {}, `A ${{ box: 'rectangular prism', triPrism: 'triangular prism', pyramid: 'square pyramid' }[pic] ?? pic}.`) : undefined,
    correct: ans,
    wrong,
    solution: [reason, `The ${pic ? 'cross-section is' : 'solid is'} ${ans}.`],
    rule: 6,
    skill: 'cross-sections and rotations',
  });
}

// ───────────── Medium ─────────────

function mediumCompositeArea(rng) {
  const kind = rng.pick(['L', 'house', 'regular']);
  if (kind === 'regular') {
    const [n, name] = rng.pick([[5, 'pentagon'], [6, 'hexagon'], [8, 'octagon']]);
    const s = rng.int(4, 12);
    const u = rng.pick(LENGTH_UNITS);
    const exact = s / (2 * Math.tan(PI / n)); // the apothem
    const a = round(exact, 1);
    const big = s / (2 * Math.sin(PI / n));
    const pts = Array.from({ length: n }, (_, i) => [r3(big * Math.cos(-PI / 2 - PI / n + (2 * PI * i) / n)), r3(big * Math.sin(-PI / 2 - PI / n + (2 * PI * i) / n))]);
    const ans = round(0.5 * a * n * s, 2);
    return q({
      prompt: R`A regular ${name} has sides of \(${s}\) ${u} and an apothem of about \(${num(a)}\) ${u}. Using these measurements, what is the area of the ${name}?`,
      visual: { type: 'polygon', points: pts, sides: [`${s}`], extra: [{ from: [0, 0], to: [0, -exact], label: T(a) }, ...rightMark([0, 0], [0, -exact], [s / 2, -exact], 0.07 * s)], alt: `A regular ${name} with sides of ${s} ${u}. A dashed segment of about ${T(a)} ${u}, the apothem, runs from the centre to the middle of the bottom side and meets it at a right angle.` },
      correct: ans,
      unit: `${u}²`,
      wrong: [
        { value: round(a * n * s, 2), why: R`The formula has a half in it: \(A = \frac{1}{2}aP\).` },
        { value: round(0.5 * a * s, 2), why: `That is the area of just one of the ${n} triangles that make up the ${name}.` },
        { value: n * s, why: 'That is the perimeter. The area is half the apothem times the perimeter.' },
        round(0.5 * a * n, 2),
      ],
      solution: [
        R`Lines from the centre to the corners split a regular polygon into congruent triangles, one for each side. Each has base \(s\) and height equal to the apothem \(a\), so the whole area is \(A = \frac{1}{2}aP\), where \(P\) is the perimeter.`,
        R`Perimeter: \(P = ${n} \cdot ${s} = ${n * s}\) ${u}.`,
        R`\(A = \frac{1}{2}(${num(a)})(${n * s}) = ${num(ans)}\) ${u}².`,
      ],
      rule: 1,
      skill: 'regular polygons',
      check: () => (Math.abs(shoelace(pts) - ans) <= 0.5 * 0.051 * n * s + 0.02 ? true : 'the area measured from the coordinates is too far from the answer'),
    });
  }
  if (kind === 'L') {
    const [W, H] = [rng.int(6, 12), rng.int(5, 10)];
    const [a, b] = [rng.int(2, W - 3), rng.int(2, H - 2)];
    const pts = [[0, 0], [W, 0], [W, H - b], [W - a, H - b], [W - a, H], [0, H]];
    const ans = W * H - a * b;
    return q({
      prompt: R`${person(rng)} is laying flooring in an L-shaped room. The room is a rectangle \(${W}\) m by \(${H}\) m with a rectangle \(${a}\) m by \(${b}\) m missing from one corner. What is the area of the floor?`,
      visual: { type: 'polygon', points: pts, sides: [`${W}`, '', '', '', '', `${H}`], extra: [{ from: pts[2], to: pts[3], dashed: false, label: `${a}` }, { from: pts[3], to: pts[4], dashed: false, label: `${b}` }], alt: `An L-shaped floor plan drawn to scale: a rectangle ${W} m wide and ${H} m high with a rectangle ${a} m wide and ${b} m high missing from its top right corner.` },
      correct: ans,
      unit: 'm²',
      wrong: [
        { value: W * H, why: 'That is the area of the whole rectangle. Subtract the corner that is missing.' },
        { value: W * H + a * b, why: 'The small rectangle is missing from the room, so subtract its area instead of adding it.' },
        (W - a) * (H - b),
        2 * (W + H),
      ],
      solution: [
        'Think of the floor as a large rectangle with a small rectangle removed.',
        R`Large rectangle: \(${W} \cdot ${H} = ${W * H}\) m². Missing corner: \(${a} \cdot ${b} = ${a * b}\) m².`,
        R`Area of the floor: \(${W * H} - ${a * b} = ${ans}\) m².`,
        R`Check by splitting the floor into two rectangles instead: \(${W} \cdot ${H - b} + ${W - a} \cdot ${b} = ${W * (H - b)} + ${(W - a) * b} = ${ans}\). ✓`,
      ],
      rule: 1,
      skill: 'composite figures',
      check: () => (shoelace(pts) === ans && W * (H - b) + (W - a) * b === ans ? true : 'the area measured from the coordinates is different'),
    });
  }
  const w = 2 * rng.int(2, 6);
  const h = rng.int(3, 8);
  const t = rng.int(2, 5);
  const u = rng.pick(['m', 'ft']);
  const pts = [[0, 0], [w, 0], [w, h], [w / 2, h + t], [0, h]];
  const ans = w * h + (w * t) / 2;
  return q({
    prompt: R`The end wall of a shed is a rectangle \(${w}\) ${u} wide and \(${h}\) ${u} high with a triangle on top. The triangle is \(${t}\) ${u} high. What is the area of the whole wall?`,
    visual: { type: 'polygon', points: pts, sides: [`${w}`, `${h}`], extra: [{ from: [0, h], to: [w, h] }, { from: [w / 2, h + t], to: [w / 2, h], label: `${t}` }], alt: `A wall drawn to scale: a rectangle ${w} ${u} wide and ${h} ${u} high with a triangle on top of it. The triangle is as wide as the rectangle and ${t} ${u} high.` },
    correct: ans,
    unit: `${u}²`,
    wrong: [
      { value: w * h + w * t, why: R`The top part is a triangle, so its area is \(\frac{1}{2}bh\), not \(bh\).` },
      { value: w * h, why: 'That is only the rectangle. Add the triangle on top.' },
      { value: (w * (h + t)) / 2, why: 'Only the top part is a triangle. The lower part is a whole rectangle.' },
      (w * h * t) / 2,
    ],
    solution: [
      'Split the wall into a rectangle and a triangle, find each area, and add them.',
      R`Rectangle: \(${w} \cdot ${h} = ${w * h}\) ${u}². Triangle: \(\frac{1}{2}(${w})(${t}) = ${(w * t) / 2}\) ${u}².`,
      R`Area of the wall: \(${w * h} + ${(w * t) / 2} = ${ans}\) ${u}².`,
    ],
    rule: 1,
    skill: 'composite figures',
    check: () => (shoelace(pts) === ans ? true : 'the area measured from the coordinates is different'),
  });
}

function mediumSurfaceArea(rng) {
  const u = rng.pick(LENGTH_UNITS);
  const kind = rng.pick(['box', 'cylinder', 'pyramid']);
  if (kind === 'box') {
    const [l, w, h] = [rng.int(5, 12), rng.int(2, 6), rng.int(2, 9)];
    const half = l * w + l * h + w * h;
    return q({
      prompt: R`A closed box is \(${l}\) ${u} long, \(${w}\) ${u} wide and \(${h}\) ${u} high. What is its total surface area?`,
      visual: solid('box', { l: `${l}`, w: `${w}`, h: `${h}` }, `A rectangular box ${l} ${u} long, ${w} ${u} wide and ${h} ${u} high.`),
      correct: 2 * half,
      unit: `${u}²`,
      wrong: [
        { value: l * w * h, why: 'That is the volume. Surface area is the total area of the six faces.' },
        { value: half, why: 'That counts only three faces. Each of them has an identical face opposite it.' },
        4 * (l + w + h),
        2 * half + l * w,
      ],
      solution: [
        R`A rectangular prism has three pairs of identical faces, with areas \(lw\), \(lh\) and \(wh\).`,
        R`\(${l} \cdot ${w} = ${l * w}\), \(${l} \cdot ${h} = ${l * h}\) and \(${w} \cdot ${h} = ${w * h}\). Their sum is \(${half}\) ${u}².`,
        R`Surface area: \(2 \cdot ${half} = ${2 * half}\) ${u}².`,
      ],
      rule: 2,
      skill: 'surface area',
      check: () => ([[l, w], [l, w], [l, h], [l, h], [w, h], [w, h]].reduce((sum, [x, y]) => sum + x * y, 0) === 2 * half ? true : 'the six faces add up to a different area'),
    });
  }
  if (kind === 'cylinder') {
    const r = rng.int(2, 8);
    const h = rng.int(3, 12);
    const ans = 2 * r * r + 2 * r * h;
    return q({
      prompt: R`A closed cylinder has a radius of \(${r}\) ${u} and a height of \(${h}\) ${u}. What is its total surface area? Leave \(\pi\) in the answer.`,
      visual: solid('cylinder', { r: `${r}`, h: `${h}` }, `A cylinder with a radius of ${r} ${u} and a height of ${h} ${u}.`),
      correct: ans,
      fmt: piFmt(`${u}²`),
      wrong: [
        { value: r * r * h, why: 'That is the volume. Surface area adds the areas of the two ends and the curved side.' },
        { value: 2 * r * h, why: R`That is only the curved side. Add the two circular ends, \(2\pi r^2\).` },
        { value: r * r + 2 * r * h, why: 'A closed cylinder has two circular ends, not one.' },
        2 * r * r + r * h,
      ],
      solution: [
        R`A closed cylinder has two circular ends and a curved side. Unrolled, the side is a rectangle \(2\pi r\) long and \(h\) high, so \(SA = 2\pi r^2 + 2\pi rh\).`,
        R`Ends: \(2\pi (${r})^2 = ${2 * r * r}\pi\). Curved side: \(2\pi (${r})(${h}) = ${2 * r * h}\pi\).`,
        R`\(SA = ${2 * r * r}\pi + ${2 * r * h}\pi = ${ans}\pi\) ${u}².`,
      ],
      rule: 2,
      skill: 'surface area',
      check: () => (close(ans * PI, 2 * disc(r) + rim(r) * h, 1e-4) ? true : 'two ends plus the unrolled side give a different area'),
    });
  }
  const s = 2 * rng.int(2, 6);
  const l = s / 2 + rng.int(1, 8);
  const ans = s * s + 2 * s * l;
  return q({
    prompt: R`A square pyramid has a base edge of \(${s}\) ${u} and a slant height of \(${l}\) ${u}. What is its total surface area?`,
    visual: solid('pyramid', { s: `${s}`, slant: `${l}` }, `A square pyramid with a base edge of ${s} ${u}. Its slant height, measured up the middle of a triangular face, is ${l} ${u}.`),
    correct: ans,
    unit: `${u}²`,
    wrong: [
      { value: s * s + 4 * s * l, why: R`Each triangular face has area \(\frac{1}{2}(${s})(${l})\). Four of them make \(2(${s})(${l})\), not \(4(${s})(${l})\).` },
      { value: 2 * s * l, why: 'That is only the four triangular faces. Add the square base.' },
      s * s + s * l,
      (s * s * l) / 2,
    ],
    solution: [
      R`The surface is the square base plus four congruent triangles. Each triangle has base \(${s}\) and height equal to the slant height, \(${l}\).`,
      R`Base: \(${s}^2 = ${s * s}\). Four triangles: \(4 \cdot \frac{1}{2}(${s})(${l}) = ${2 * s * l}\).`,
      R`\(SA = ${s * s} + ${2 * s * l} = ${ans}\) ${u}².`,
    ],
    rule: 3,
    skill: 'surface area',
    check: () => (close(ans, pyramidSurface(s, Math.sqrt(l * l - (s * s) / 4))) ? true : 'the faces measured from the coordinates of the corners add up to a different area'),
  });
}

function mediumPointedVolume(rng) {
  const u = rng.pick(LENGTH_UNITS);
  const kind = rng.pick(['pyramid', 'cone', 'sphere']);
  if (kind === 'sphere') {
    const r = rng.int(2, 9);
    const ans = frac(4 * r ** 3, 3);
    return q({
      prompt: R`A sphere has a radius of \(${r}\) ${u}. What is its volume? Leave \(\pi\) in the answer.`,
      visual: solid('sphere', { r: `${r}` }, `A sphere with a radius of ${r} ${u}.`),
      correct: ans,
      fmt: piFmt(`${u}³`),
      wrong: [
        { value: frac(4 * r * r), why: R`That is the surface area, \(4\pi r^2\). The volume is \(\frac{4}{3}\pi r^3\).` },
        { value: frac(4 * r ** 3), why: R`Divide by 3 as well: \(V = \frac{4}{3}\pi r^3\).` },
        { value: frac(4 * r * r, 3), why: 'The radius is cubed in the volume formula, not squared.' },
        frac(r ** 3),
      ],
      solution: [R`The volume of a sphere is \(V = \frac{4}{3}\pi r^3\).`, R`\(r^3 = ${r}^3 = ${r ** 3}\), so \(V = \frac{4}{3}\pi \cdot ${r ** 3} = ${piTex(ans)}\) ${u}³.`],
      rule: 3,
      skill: 'volume of pyramids, cones and spheres',
      check: () => (close(ans.value * PI, sphereVolume(r)) ? true : 'thin slices of the sphere add up to a different volume'),
    });
  }
  const cone = kind === 'cone';
  const a = rng.int(2, 9); // radius of the cone, or base edge of the pyramid
  const h = a % 3 === 0 ? rng.int(4, 12) : 3 * rng.int(1, 4);
  const ans = (a * a * h) / 3;
  const unit = `${u}³`;
  return q({
    prompt: cone
      ? R`A cone has a radius of \(${a}\) ${u} and a height of \(${h}\) ${u}. What is its volume? Leave \(\pi\) in the answer.`
      : R`A square pyramid has a base edge of \(${a}\) ${u} and a height of \(${h}\) ${u}. What is its volume?`,
    visual: cone ? solid('cone', { r: `${a}`, h: `${h}` }, `A cone with a radius of ${a} ${u} and a height of ${h} ${u}.`) : solid('pyramid', { s: `${a}`, h: `${h}` }, `A square pyramid with a base edge of ${a} ${u} and a height of ${h} ${u}.`),
    correct: ans,
    fmt: cone ? piFmt(unit) : (v) => R`\(${num(v)}\) ${unit}`,
    wrong: [
      { value: a * a * h, why: `That is the volume of the ${cone ? 'cylinder' : 'prism'} with the same base and height. A ${kind} holds one third of that.` },
      { value: (a * a * h) / 2, why: R`The factor for a ${kind} is \(\frac{1}{3}\), not \(\frac{1}{2}\).` },
      (a * h) / 3,
      2 * a * h,
    ],
    solution: cone
      ? [R`The volume of a cone is one third of the area of its base times its height: \(V = \frac{1}{3}\pi r^2 h\).`, R`\(V = \frac{1}{3}\pi (${a})^2 (${h}) = \frac{1}{3}\pi \cdot ${a * a} \cdot ${h} = ${ans}\pi\) ${u}³.`]
      : [R`The volume of a pyramid is one third of the area of its base times its height: \(V = \frac{1}{3}Bh\), and the square base has area \(${a}^2 = ${a * a}\) ${u}².`, R`\(V = \frac{1}{3} \cdot ${a * a} \cdot ${h} = ${ans}\) ${u}³.`],
    rule: 3,
    skill: 'volume of pyramids, cones and spheres',
    check: () => (close(cone ? ans * PI : ans, cone ? coneVolume(a, h) : pyramidVolume(a, h)) ? true : 'thin slices of the solid add up to a different volume'),
  });
}

// ───────────── Hard ─────────────

function hardSlantHeight(rng) {
  const [p, s, l] = rng.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20]]);
  const [a, h] = rng.bool() ? [p, s] : [s, p]; // a is the radius of the cone, or half the base edge of the pyramid
  const u = rng.pick(LENGTH_UNITS);
  const e = 2 * a;
  const spec = rng.pick([
    {
      prompt: R`A cone has a radius of \(${a}\) ${u} and a slant height of \(${l}\) ${u}. What is its volume? Leave \(\pi\) in the answer.`,
      visual: solid('cone', { r: `${a}`, l: `${l}` }, `A cone with a radius of ${a} ${u}. Its slant height, measured along the sloping side from the apex to the edge of the base, is ${l} ${u}.`),
      ans: (a * a * h) / 3,
      fmt: piFmt(`${u}³`),
      wrong: [
        { value: frac(a * a * l, 3), why: R`\(${l}\) ${u} is the slant height, measured along the side. The formula needs the perpendicular height, so find that first with the Pythagorean theorem.` },
        { value: a * a * h, why: R`A cone is one third of the cylinder with the same base and height: \(V = \frac{1}{3}\pi r^2 h\).` },
        { value: a * l, why: R`That is the area of the curved surface, \(\pi r l\).` },
        (a * h) / 3,
      ],
      steps: [R`The radius, the height and the slant height form a right triangle with the slant height as its hypotenuse: \(h = \sqrt{${l}^2 - ${a}^2} = \sqrt{${l * l - a * a}} = ${h}\) ${u}.`, R`\(V = \frac{1}{3}\pi r^2 h = \frac{1}{3}\pi (${a})^2 (${h}) = ${(a * a * h) / 3}\pi\) ${u}³.`],
      measured: () => coneVolume(a, Math.sqrt(l * l - a * a)) / PI,
    },
    {
      prompt: R`A cone has a radius of \(${a}\) ${u} and a height of \(${h}\) ${u}. What is its total surface area, including the base? Leave \(\pi\) in the answer.`,
      visual: solid('cone', { r: `${a}`, h: `${h}` }, `A cone with a radius of ${a} ${u} and a height of ${h} ${u}.`),
      ans: a * a + a * l,
      fmt: piFmt(`${u}²`),
      wrong: [
        { value: a * a + a * h, why: R`The curved surface is \(\pi r l\), where \(l\) is the slant height. \(${h}\) ${u} is the height, so find \(l\) first with the Pythagorean theorem.` },
        { value: a * l, why: 'That is only the curved surface. The question includes the circular base.' },
        { value: (a * a * h) / 3, why: 'That is the volume of the cone, not its surface area.' },
        2 * a * a + 2 * a * h,
      ],
      steps: [R`Slant height: \(l = \sqrt{${a}^2 + ${h}^2} = \sqrt{${a * a + h * h}} = ${l}\) ${u}.`, R`Base: \(\pi r^2 = ${a * a}\pi\). Curved surface: \(\pi r l = \pi (${a})(${l}) = ${a * l}\pi\).`, R`\(SA = ${a * a}\pi + ${a * l}\pi = ${a * a + a * l}\pi\) ${u}².`],
      measured: () => (disc(a) + integrate((z) => ((rim(1) * a * z) / h) * (Math.hypot(a, h) / h), 0, h)) / PI,
    },
    {
      prompt: R`A square pyramid has a base edge of \(${e}\) ${u} and a slant height of \(${l}\) ${u}. What is its volume?`,
      visual: solid('pyramid', { s: `${e}`, slant: `${l}` }, `A square pyramid with a base edge of ${e} ${u}. Its slant height, measured up the middle of a triangular face, is ${l} ${u}.`),
      ans: (e * e * h) / 3,
      fmt: (v) => R`\(${num(v)}\) ${u}³`,
      wrong: [
        { value: frac(e * e * l, 3), why: R`\(${l}\) ${u} is the slant height of a face. The formula needs the perpendicular height of the pyramid, so find that first with the Pythagorean theorem.` },
        { value: e * e * h, why: R`A pyramid is one third of the prism with the same base and height: \(V = \frac{1}{3}Bh\).` },
        (e * e * h) / 2,
        e * h,
      ],
      steps: [
        R`The slant height runs up the middle of a face. With the height of the pyramid and half the base edge, \(${a}\) ${u}, it forms a right triangle: \(h = \sqrt{${l}^2 - ${a}^2} = \sqrt{${l * l - a * a}} = ${h}\) ${u}.`,
        R`\(V = \frac{1}{3}Bh = \frac{1}{3}(${e})^2 (${h}) = \frac{1}{3} \cdot ${e * e} \cdot ${h} = ${(e * e * h) / 3}\) ${u}³.`,
      ],
      measured: () => pyramidVolume(e, Math.sqrt(l * l - a * a)),
    },
    {
      prompt: R`A square pyramid has a base edge of \(${e}\) ${u} and a height of \(${h}\) ${u}. What is its total surface area?`,
      visual: solid('pyramid', { s: `${e}`, h: `${h}` }, `A square pyramid with a base edge of ${e} ${u} and a height of ${h} ${u}.`),
      ans: e * e + 2 * e * l,
      fmt: (v) => R`\(${num(v)}\) ${u}²`,
      wrong: [
        { value: e * e + 2 * e * h, why: 'The triangular faces lean inwards, so their height is the slant height, which is longer than the height of the pyramid. Find it with the Pythagorean theorem.' },
        { value: 2 * e * l, why: 'That is only the four triangular faces. Add the square base.' },
        e * e + 4 * e * l,
        (e * e * h) / 3,
      ],
      steps: [
        R`Slant height: with half the base edge, \(${a}\) ${u}, and the height it forms a right triangle, so \(l = \sqrt{${a}^2 + ${h}^2} = \sqrt{${a * a + h * h}} = ${l}\) ${u}.`,
        R`Base: \(${e}^2 = ${e * e}\). Four triangles: \(4 \cdot \frac{1}{2}(${e})(${l}) = ${2 * e * l}\).`,
        R`\(SA = ${e * e} + ${2 * e * l} = ${e * e + 2 * e * l}\) ${u}².`,
      ],
      measured: () => pyramidSurface(e, h),
    },
  ]);
  return q({
    prompt: spec.prompt,
    visual: spec.visual,
    correct: spec.ans,
    fmt: spec.fmt,
    wrong: spec.wrong,
    solution: spec.steps,
    rule: 3,
    skill: 'slant height',
    check: () => (close(spec.ans, spec.measured(), 1e-4) ? true : `measuring the solid directly gives ${spec.measured()}`),
  });
}

function hardCompositeSolid(rng) {
  const r = rng.int(2, 6);
  const h = rng.int(4, 12);
  const h2 = rng.int(3, 9);
  const half = frac(2 * r ** 3, 3); // hemisphere, as a multiple of π
  const spec = rng.pick([
    {
      u: 'm',
      prompt: R`A grain silo is a cylinder with a hemisphere (half a sphere) on top. Its radius is \(${r}\) m and the cylinder part is \(${h}\) m high. What is the total volume of the silo?`,
      pts: [[-r, 0], [r, 0], ...dome(r, h)],
      sides: ['', `${h}`],
      extra: [{ from: [0, h], to: [r, h], label: `${r}` }, { from: [-r, h], to: [0, h] }],
      seen: `Side view of a silo, drawn to scale: a rectangle ${2 * r} m wide and ${h} m high with a semicircle of radius ${r} m on top.`,
      ans: half.add(r * r * h),
      wrong: [
        { value: half.mul(2).add(r * r * h), why: R`The roof is half a sphere, so use half of \(\frac{4}{3}\pi r^3\).` },
        { value: frac(r * r * h), why: 'That is only the cylinder. Add the hemisphere on top.' },
        { value: frac(r * r * (h + r)), why: 'That treats the silo as a cylinder all the way up. The rounded roof holds less than a cylinder of the same height.' },
        frac(2 * r * r, 3).add(r * r * h),
      ],
      steps: [R`Cylinder: \(\pi r^2 h = \pi (${r})^2 (${h}) = ${r * r * h}\pi\) m³.`, R`Hemisphere: half of \(\frac{4}{3}\pi r^3\), which is \(\frac{2}{3}\pi (${r})^3 = ${piTex(half)}\) m³.`],
      sum: R`${r * r * h}\pi + ${piTex(half)}`,
      measured: () => disc(r) * h + sphereVolume(r) / 2,
    },
    {
      u: 'cm',
      prompt: R`A wooden peg is a cylinder with a cone on top. Its radius is \(${r}\) cm, the cylinder part is \(${h}\) cm high and the cone part is \(${h2}\) cm high. What is the volume of the peg?`,
      pts: [[-r, 0], [r, 0], [r, h], [0, h + h2], [-r, h]],
      sides: ['', `${h}`],
      extra: [{ from: [-r, h], to: [0, h] }, { from: [0, h], to: [r, h], label: `${r}` }, { from: [0, h + h2], to: [0, h], label: `${h2}` }],
      seen: `Side view of a peg, drawn to scale: a rectangle ${2 * r} cm wide and ${h} cm high with a triangle ${h2} cm high on top. The radius is ${r} cm.`,
      ans: frac(r * r * h2, 3).add(r * r * h),
      wrong: [
        { value: frac(r * r * (h + h2)), why: R`The cone part holds only one third as much as a cylinder of the same height: \(V = \frac{1}{3}\pi r^2 h\).` },
        { value: frac(r * r * (h + h2), 3), why: R`Only the cone has the factor \(\frac{1}{3}\). The cylinder part is \(\pi r^2 h\).` },
        { value: frac(r * r * h), why: 'That is only the cylinder. Add the cone on top.' },
        frac(r * r * h2, 2).add(r * r * h),
      ],
      steps: [R`Cylinder: \(\pi r^2 h = \pi (${r})^2 (${h}) = ${r * r * h}\pi\) cm³.`, R`Cone: \(\frac{1}{3}\pi r^2 h = \frac{1}{3}\pi (${r})^2 (${h2}) = ${piTex(frac(r * r * h2, 3))}\) cm³.`],
      sum: R`${r * r * h}\pi + ${piTex(frac(r * r * h2, 3))}`,
      measured: () => disc(r) * h + coneVolume(r, h2),
    },
    {
      u: 'cm',
      prompt: R`An ice-cream cone is filled with ice cream, with a hemisphere (half a sphere) of ice cream on top. The cone has a radius of \(${r}\) cm and is \(${h}\) cm deep. What is the total volume of ice cream?`,
      pts: [[0, 0], ...dome(r, h)],
      sides: [],
      extra: [{ from: [0, 0], to: [0, h], label: `${h}` }, { from: [0, h], to: [r, h], label: `${r}` }, { from: [-r, h], to: [0, h] }],
      seen: `Side view of an ice cream, drawn to scale: a triangle pointing down, ${h} cm deep and ${2 * r} cm across the top, with a semicircle of radius ${r} cm on top of it.`,
      ans: half.add(frac(r * r * h, 3)),
      wrong: [
        { value: half.mul(2).add(frac(r * r * h, 3)), why: R`Only half a sphere sits on top, so use half of \(\frac{4}{3}\pi r^3\).` },
        { value: half.add(r * r * h), why: R`The cone needs the factor \(\frac{1}{3}\): \(V = \frac{1}{3}\pi r^2 h\).` },
        { value: frac(r * r * h, 3), why: 'That is only the ice cream inside the cone. Add the hemisphere on top.' },
        frac(r * r * (h + r), 3),
      ],
      steps: [R`Cone: \(\frac{1}{3}\pi r^2 h = \frac{1}{3}\pi (${r})^2 (${h}) = ${piTex(frac(r * r * h, 3))}\) cm³.`, R`Hemisphere: half of \(\frac{4}{3}\pi r^3\), which is \(\frac{2}{3}\pi (${r})^3 = ${piTex(half)}\) cm³.`],
      sum: R`${piTex(frac(r * r * h, 3))} + ${piTex(half)}`,
      measured: () => coneVolume(r, h) + sphereVolume(r) / 2,
    },
  ]);
  return q({
    prompt: R`${spec.prompt} Leave \(\pi\) in the answer.`,
    visual: { type: 'polygon', points: spec.pts, sides: spec.sides, extra: spec.extra, alt: spec.seen },
    correct: spec.ans,
    fmt: piFmt(`${spec.u}³`),
    wrong: spec.wrong,
    solution: ['Split the solid into two parts whose volumes you know, then add them.', ...spec.steps, R`Total: \(${spec.sum} = ${piTex(spec.ans)}\) ${spec.u}³.`],
    rule: 3,
    skill: 'composite solids',
    check: () => (close(spec.ans.value * PI, spec.measured(), 1e-4) ? true : 'thin slices of the solid add up to a different volume'),
  });
}

function hardDensity(rng) {
  const kind = rng.pick(['mass', 'density', 'population']);
  if (kind === 'population') {
    const a = rng.int(5, 12);
    const b = rng.intExcept(3, 9, [a]);
    const dens = rng.pick([25, 40, 50, 60, 75, 80, 120, 150, 200, 250]);
    const people = dens * a * b;
    return q({
      prompt: R`A rectangular county is \(${a}\) km long and \(${b}\) km wide, and \(${num(people)}\) people live in it. What is its population density?`,
      visual: { type: 'polygon', points: [[0, 0], [a, 0], [a, b], [0, b]], sides: [`${a} km`, `${b} km`], alt: `A rectangle ${a} km long and ${b} km wide, drawn to scale.` },
      correct: dens,
      unit: 'people per km²',
      wrong: [
        { value: round(people / (2 * (a + b)), 1), why: 'Divide by the area of the county, not by its perimeter.' },
        { value: people / a, why: 'Divide by the whole area, length times width, not by the length alone.' },
        people / b,
        2 * dens,
      ],
      solution: ['Population density is the number of people divided by the area they live in.', R`Area: \(${a} \cdot ${b} = ${a * b}\) km².`, R`Density: \(${num(people)} \div ${a * b} = ${dens}\) people per km².`],
      rule: 4,
      skill: 'density',
      check: () => (dens * shoelace([[0, 0], [a, 0], [a, b], [0, b]]) === people ? true : 'density times area does not give the population'),
    });
  }
  const [material, rho] = rng.pick(MATERIALS);
  const [l, w, h] = [rng.int(4, 10), rng.int(2, 6), rng.int(2, 5)];
  const V = l * w * h;
  const mass = round(rho * V, 1);
  const pic = solid('box', { l: `${l}`, w: `${w}`, h: `${h}` }, `A rectangular block ${l} cm long, ${w} cm wide and ${h} cm high.`);
  const volume = R`Volume of the block: \(${l} \cdot ${w} \cdot ${h} = ${V}\) cm³.`;
  if (kind === 'mass') {
    return q({
      prompt: R`A solid block of ${material} is \(${l}\) cm long, \(${w}\) cm wide and \(${h}\) cm high. The density of ${material} is \(${num(rho)}\) g/cm³. What is the mass of the block?`,
      visual: pic,
      correct: mass,
      unit: 'g',
      wrong: [
        { value: V, why: 'That is the volume of the block in cm³. Multiply it by the density to get the mass.' },
        { value: round(V / rho, 1), why: 'Density is mass divided by volume, so mass is density times volume, not volume divided by density.' },
        round(rho * (l + w + h), 1),
        round(rho * l * w, 1),
      ],
      solution: [volume, R`Density is mass divided by volume, so mass \(=\) density \(\times\) volume: \(${num(rho)} \cdot ${V} = ${num(mass)}\) g.`],
      rule: 4,
      skill: 'density',
      check: () => (close(mass / V, rho) ? true : 'mass divided by volume does not give the density'),
    });
  }
  return q({
    prompt: R`A solid block is \(${l}\) cm long, \(${w}\) cm wide and \(${h}\) cm high. Its mass is \(${num(mass)}\) g. What is the density of the material it is made of?`,
    visual: pic,
    correct: rho,
    unit: 'g/cm³',
    wrong: [
      { value: round(V / mass, 2), why: 'That is volume divided by mass. Density is mass divided by volume.' },
      { value: round(mass / (l * w), 1), why: 'Divide by the volume of the block, not by the area of its base.' },
      round(mass / (l + w + h), 1),
      round(2 * rho, 1),
    ],
    solution: [volume, R`Density \(=\) mass \(\div\) volume: \(${num(mass)} \div ${V} = ${num(rho)}\) g/cm³.`],
    rule: 4,
    skill: 'density',
    check: () => (close(rho * V, mass) ? true : 'density times volume does not give the mass'),
  });
}

// ───────────── Challenge ─────────────

// [solid, quantity, first dimension, its power in the formula, second dimension (power 1) or null, picture, formula, the formula as a function]
const SCALED = [
  ['cylinder', 'volume', 'radius', 2, 'height', 'cylinder', R`V = \pi r^2 h`, (x, y) => PI * x * x * y],
  ['cone', 'volume', 'radius', 2, 'height', 'cone', R`V = \frac{1}{3}\pi r^2 h`, (x, y) => (PI * x * x * y) / 3],
  ['square pyramid', 'volume', 'base edge', 2, 'height', 'pyramid', R`V = \frac{1}{3}s^2 h`, (x, y) => (x * x * y) / 3],
  ['sphere', 'volume', 'radius', 3, null, 'sphere', R`V = \frac{4}{3}\pi r^3`, (x) => (4 * PI * x ** 3) / 3],
  ['sphere', 'surface area', 'radius', 2, null, 'sphere', R`A = 4\pi r^2`, (x) => 4 * PI * x * x],
  ['cube', 'volume', 'edge length', 3, null, 'cube', R`V = s^3`, (x) => x ** 3],
  ['cube', 'surface area', 'edge length', 2, null, 'cube', R`A = 6s^2`, (x) => 6 * x * x],
];
const FACTORS = [[frac(2), 'doubled'], [frac(3), 'tripled'], [frac(4), 'multiplied by 4'], [frac(1, 2), 'halved'], [frac(1, 3), 'divided by 3']];

function challengeScaling(rng) {
  const [name, quantity, xName, p, yName, pic, formula, fn] = rng.pick(SCALED);
  const [a, aWord] = rng.pick(FACTORS);
  const [b, bWord] = yName ? rng.pick([...FACTORS, [frac(1), '']]) : [frac(1), ''];
  const ans = a.pow(p).mul(b);
  const power = p === 2 ? 'squared' : 'cubed';
  const tex = (v) => (v.d === 1 ? v.tex() : R`\left(${v.tex()}\right)`);
  const change = !yName ? `The ${xName} of a ${name} is ${aWord}.` : b.eq(1) ? `The ${xName} of a ${name} is ${aWord} and its ${yName} stays the same.` : `The ${xName} of a ${name} is ${aWord} and its ${yName} is ${bWord}.`;
  return q({
    prompt: `${change} What happens to its ${quantity}?`,
    visual: solid(pic, {}, `A ${name}.`),
    correct: ans,
    fmt: (v) => (v.eq(1) ? 'It stays the same' : R`It is multiplied by \(${v.tex()}\)`),
    wrong: [
      { value: a.mul(b), why: `The ${xName} is ${power} in the formula, so its scale factor has to be ${power} as well.` },
      !yName
        ? { value: a.pow(5 - p), why: p === 2 ? 'Cubing the scale factor is for volumes. Areas use its square.' : 'Squaring the scale factor is for areas. Volumes use its cube.' }
        : b.eq(1)
          ? { value: a.pow(3), why: `Only the ${xName} changes, and it is squared in the formula, not cubed.` }
          : { value: a.pow(2).mul(b.pow(2)), why: `Only the ${xName} is squared in the formula. The ${yName} appears just once.` },
      yName && !b.eq(1) ? a.pow(p) : null,
      yName && !b.eq(1) ? b : null,
      a.mul(b).mul(p),
      a.pow(p).mul(b).mul(2),
      ans.mul(3),
    ],
    solution: [
      R`Look at how each dimension appears in the formula \(${formula}\).`,
      R`The ${xName} is ${power}, so a factor of \(${a.tex()}\) on the ${xName} gives a factor of \(${tex(a)}^${p} = ${a.pow(p).tex()}\).`,
      !yName ? null : b.eq(1) ? `The ${yName} does not change, so it contributes no factor.` : R`The ${yName} appears once, so it gives a factor of \(${b.tex()}\). Together: \(${a.pow(p).tex()} \cdot ${b.tex()} = ${ans.tex()}\).`,
      ans.eq(1) ? `The two changes cancel, so the ${quantity} stays the same.` : R`The ${quantity} is multiplied by \(${ans.tex()}\).`,
    ].filter(Boolean),
    rule: 5,
    skill: 'scaling',
    check: () => (close(fn(a.value * 3, b.value * 5) / fn(3, 5), ans.value) ? true : 'putting scaled dimensions into the formula gives a different factor'),
  });
}

function challengeMissingDimension(rng) {
  const u = rng.pick(LENGTH_UNITS);
  const kind = rng.pick(['cylinder', 'cone', 'sphere', 'cube']);
  if (kind === 'sphere') {
    const r = rng.int(2, 9);
    const ans = frac(4 * r ** 3, 3);
    return q({
      prompt: R`The surface area of a sphere is \(${4 * r * r}\pi\) ${u}². What is its volume? Leave \(\pi\) in the answer.`,
      visual: solid('sphere', {}, `A sphere. Its surface area is ${4 * r * r}π square ${u}.`),
      correct: ans,
      fmt: piFmt(`${u}³`),
      wrong: [
        { value: frac(4 * r * r, 3), why: R`The volume formula needs \(r^3\). From \(r^2 = ${r * r}\), find \(r = ${r}\) first and then cube it.` },
        { value: frac(4 * r ** 3), why: R`Divide by 3 as well: \(V = \frac{4}{3}\pi r^3\).` },
        frac(r ** 3),
        frac(2 * r ** 3, 3),
      ],
      solution: [R`Surface area of a sphere: \(4\pi r^2 = ${4 * r * r}\pi\), so \(r^2 = ${r * r}\) and \(r = ${r}\) ${u}.`, R`Volume: \(V = \frac{4}{3}\pi r^3 = \frac{4}{3}\pi \cdot ${r ** 3} = ${piTex(ans)}\) ${u}³.`],
      rule: 3,
      skill: 'working backwards',
      check: () => (close(ans.value * PI, sphereVolume(r)) && close(numDeriv(sphereVolume, r), 4 * r * r * PI, 1e-4) ? true : 'a sphere with this surface area has a different volume'),
    });
  }
  if (kind === 'cube') {
    const s = rng.int(2, 9);
    return q({
      prompt: R`The total surface area of a cube is \(${6 * s * s}\) ${u}². What is its volume?`,
      visual: solid('cube', {}, `A cube. Its total surface area is ${6 * s * s} square ${u}.`),
      correct: s ** 3,
      unit: `${u}³`,
      wrong: [
        { value: s * s, why: 'That is the area of one face. Take its square root to get the edge length, then cube it.' },
        { value: s, why: 'That is the edge length. Cube it to get the volume.' },
        3 * s * s,
        6 * s ** 3,
      ],
      solution: [R`A cube has 6 congruent square faces, so one face has area \(${6 * s * s} \div 6 = ${s * s}\) ${u}².`, R`The edge length is \(\sqrt{${s * s}} = ${s}\) ${u}.`, R`Volume: \(${s}^3 = ${s ** 3}\) ${u}³.`],
      rule: 2,
      skill: 'working backwards',
      check: () => (Array.from({ length: 6 }, () => s * s).reduce((x, y) => x + y) === 6 * s * s ? true : 'a cube with this volume has a different surface area'),
    });
  }
  if (kind === 'cylinder') {
    const r = rng.int(2, 9);
    const h = rng.intExcept(3, 12, [r]);
    return q({
      prompt: R`A cylinder has a volume of \(${r * r * h}\pi\) ${u}³ and a height of \(${h}\) ${u}. What is its radius?`,
      visual: solid('cylinder', { r: 'r', h: `${h}` }, `A cylinder with a height of ${h} ${u}. Its radius is marked r and its volume is ${r * r * h}π cubic ${u}.`),
      correct: r,
      unit: u,
      wrong: [
        { value: r * r, why: R`That is \(r^2\). Take the square root to get the radius.` },
        { value: (r * r) / 2, why: R`\(r^2 = ${r * r}\) means \(r \cdot r = ${r * r}\). Take the square root, not half.` },
        2 * r,
        r + h,
      ],
      solution: [R`\(V = \pi r^2 h\), so \(\pi r^2 (${h}) = ${r * r * h}\pi\).`, R`Divide both sides by \(${h}\pi\): \(r^2 = ${r * r * h} \div ${h} = ${r * r}\).`, R`\(r = \sqrt{${r * r}} = ${r}\) ${u}.`],
      rule: 2,
      skill: 'working backwards',
      check: () => (close(disc(r) * h, r * r * h * PI, 1e-4) ? true : 'a cylinder with this radius has a different volume'),
    });
  }
  const r = rng.int(2, 9);
  const h = 3 * rng.int(1, 5);
  const V = (r * r * h) / 3;
  return q({
    prompt: R`A cone has a volume of \(${V}\pi\) ${u}³ and a radius of \(${r}\) ${u}. What is its height?`,
    visual: solid('cone', { r: `${r}`, h: 'h' }, `A cone with a radius of ${r} ${u}. Its height is marked h and its volume is ${V}π cubic ${u}.`),
    correct: h,
    unit: u,
    wrong: [
      { value: h / 3, why: R`For a cone \(V = \frac{1}{3}\pi r^2 h\), so multiply the volume by 3 before dividing by \(r^2\).` },
      { value: r * h, why: R`Divide by \(r^2 = ${r * r}\), not by \(r\).` },
      (r * h) / 3,
      2 * h,
    ],
    solution: [R`\(V = \frac{1}{3}\pi r^2 h\), so \(\frac{1}{3}\pi (${r})^2 h = ${V}\pi\).`, R`Multiply both sides by 3 and divide by \(\pi\): \(${r * r}h = ${3 * V}\).`, R`\(h = ${3 * V} \div ${r * r} = ${h}\) ${u}.`],
    rule: 3,
    skill: 'working backwards',
    check: () => (close(coneVolume(r, h), V * PI) ? true : 'a cone with this height has a different volume'),
  });
}

function challengeRecast(rng) {
  const kind = rng.pick(['melt', 'rise', 'cups']);
  if (kind === 'cups') {
    const r = rng.int(2, 4);
    const h = rng.int(4, 9);
    const [m, n] = rng.pick([[1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2]]);
    const jug = (m * r) ** 2 * n * h;
    const cup = frac(r * r * h, 3);
    const ans = 3 * m * m * n;
    return q({
      prompt: R`Paper cups shaped like cones have a radius of \(${r}\) cm and a height of \(${h}\) cm. A full cylindrical jug has a radius of \(${m * r}\) cm and a height of \(${n * h}\) cm. How many cups can be filled completely from the jug?`,
      visual: [solid('cone', { r: `${r}`, h: `${h}` }, `A cone-shaped cup with a radius of ${r} cm and a height of ${h} cm.`), solid('cylinder', { r: `${m * r}`, h: `${n * h}` }, `A cylindrical jug with a radius of ${m * r} cm and a height of ${n * h} cm.`)],
      correct: ans,
      unit: 'cups',
      wrong: [
        { value: m * m * n, why: 'A cone holds only one third as much as a cylinder with the same base and height, so three times as many cups can be filled.' },
        m > 1 ? { value: 3 * m * n, why: 'The radius is squared in the volume formula, so its factor counts twice.' } : 3 * n + 1,
        9 * m * m * n,
        ans + 3,
      ],
      solution: [R`Jug: \(\pi r^2 h = \pi (${m * r})^2 (${n * h}) = ${jug}\pi\) cm³.`, R`One cup: \(\frac{1}{3}\pi r^2 h = \frac{1}{3}\pi (${r})^2 (${h}) = ${piTex(cup)}\) cm³.`, R`Number of cups: divide the volume of the jug by the volume of one cup. The \(\pi\) cancels, leaving \(${jug} \div ${cup.tex()} = ${ans}\).`],
      rule: 3,
      skill: 'volume applications',
      check: () => (close((disc(m * r) * n * h) / coneVolume(r, h), ans, 1e-4) ? true : 'the two volumes have a different ratio'),
    });
  }
  const melt = kind === 'melt';
  const [r, rc, H] = rng.pick(melt ? [[3, 2, 9], [3, 3, 4], [6, 3, 32], [6, 4, 18], [6, 6, 8], [9, 6, 27], [9, 9, 12]] : [[3, 6, 1], [3, 4, 2.25], [3, 5, 1.44], [6, 8, 4.5], [6, 10, 2.88], [6, 12, 2], [9, 12, 6.75], [9, 15, 4.32], [9, 18, 3]]);
  const ball = (4 * r ** 3) / 3;
  return q({
    prompt: melt
      ? R`A solid metal sphere with a radius of \(${r}\) cm is melted down and recast as a solid cylinder with a radius of \(${rc}\) cm. No metal is lost. What is the height of the cylinder?`
      : R`A cylindrical tank with a radius of \(${rc}\) cm is partly filled with water. A solid metal ball with a radius of \(${r}\) cm is lowered in until it is completely under water, and no water spills. By how much does the water level rise?`,
    visual: [solid('sphere', { r: `${r}` }, `A sphere with a radius of ${r} cm.`), solid('cylinder', { r: `${rc}`, h: 'h' }, `A cylinder with a radius of ${rc} cm${melt ? '' : ', standing for the extra layer of water'}. Its height is marked h.`)],
    correct: H,
    unit: 'cm',
    wrong: [
      { value: round((3 * H) / 4, 2), why: R`The volume of a sphere is \(\frac{4}{3}\pi r^3\). Do not leave out the \(\frac{4}{3}\).` },
      { value: H * rc, why: R`The base of the cylinder has area \(\pi (${rc})^2\). Divide by \(${rc * rc}\), not by \(${rc}\).` },
      round((4 * r * r) / (rc * rc), 2),
      2 * H,
    ],
    solution: [
      melt ? 'Melting and recasting does not change the volume of metal.' : 'The ball pushes aside its own volume of water. That water forms a layer shaped like a cylinder with the same radius as the tank.',
      R`Sphere: \(\frac{4}{3}\pi r^3 = \frac{4}{3}\pi (${r})^3 = ${ball}\pi\) cm³.`,
      R`Cylinder of height \(h\): \(\pi (${rc})^2 h = ${rc * rc}\pi h\). So \(${rc * rc}\pi h = ${ball}\pi\).`,
      R`\(h = ${ball} \div ${rc * rc} = ${num(H)}\) cm.`,
    ],
    rule: 3,
    skill: 'volume applications',
    check: () => (close(disc(rc) * H, sphereVolume(r), 1e-4) && (melt || rc > r) ? true : 'the cylinder and the sphere have different volumes'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'area-volume',
  title: 'Area, Surface Area & Volume',
  summary: 'Find areas of flat shapes and the surface area and volume of solids, and use them for density, scaling and cross-sections.',
  standards: ['CCSS G-GMD.A.3', 'CCSS G-GMD.B.4', 'CCSS G-MG.A.1', 'CCSS G-MG.A.2'],

  explain: {
    intro: R`Area measures the surface a flat shape covers, in square units. Volume measures the space a solid fills, in cubic units, and surface area is the total area of its outside. Almost every formula here comes from two ideas: **base times height** for shapes and solids with straight sides, and a factor of \(\frac{1}{3}\) for solids that come to a point.`,
    rules: [
      {
        title: 'Areas of triangles, parallelograms and trapezoids',
        text: R`Parallelogram: \(A = bh\). Triangle: \(A = \frac{1}{2}bh\). Trapezoid: \(A = \frac{1}{2}(b_1 + b_2)h\). In each one the height \(h\) is **perpendicular** to the base. A slanted side is not the height.`,
        example: R`A trapezoid with parallel sides \(10\) and \(6\), which are \(4\) apart: \(A = \frac{1}{2}(10 + 6)(4) = 32\).`,
      },
      {
        title: 'Regular polygons and composite figures',
        text: R`A regular polygon with apothem \(a\) (the distance from the centre to the middle of a side) and perimeter \(P\) has area \(A = \frac{1}{2}aP\). For a composite figure, split it into shapes you know, then add their areas, or subtract a part that is missing.`,
        example: R`An \(8\) by \(6\) rectangle with a \(3\) by \(2\) corner removed has area \(48 - 6 = 42\).`,
      },
      {
        title: 'Prisms and cylinders',
        text: R`Volume is the area of the base times the height: \(V = Bh\). For a rectangular prism \(V = lwh\), and for a cylinder \(V = \pi r^2 h\). Surface area is the two bases plus the sides: for a cylinder \(SA = 2\pi r^2 + 2\pi rh\), and for a rectangular prism \(SA = 2(lw + lh + wh)\).`,
        example: R`A cylinder with \(r = 3\) and \(h = 5\): \(V = \pi \cdot 9 \cdot 5 = 45\pi\) and \(SA = 18\pi + 30\pi = 48\pi\).`,
      },
      {
        title: 'Pyramids, cones and spheres',
        text: R`A pyramid or cone holds one third of the prism or cylinder with the same base and height: \(V = \frac{1}{3}Bh\), so a cone has \(V = \frac{1}{3}\pi r^2 h\). Their sloping faces use the **slant height** \(l\): a cone has \(SA = \pi r^2 + \pi r l\) with \(l = \sqrt{r^2 + h^2}\), and a square pyramid with base edge \(s\) has \(SA = s^2 + 2sl\). A sphere has \(V = \frac{4}{3}\pi r^3\) and \(SA = 4\pi r^2\).`,
        example: R`A cone with \(r = 5\) and \(h = 12\): \(V = \frac{1}{3}\pi \cdot 25 \cdot 12 = 100\pi\). Its slant height is \(\sqrt{25 + 144} = 13\), so \(SA = 25\pi + 65\pi = 90\pi\).`,
      },
      {
        title: 'Density',
        text: R`Density compares an amount with the space it occupies: density \(=\) mass \(\div\) volume, so mass \(=\) density \(\times\) volume. Population density is people \(\div\) area.`,
        example: R`A \(200\) cm³ block with a mass of \(540\) g has density \(540 \div 200 = 2.7\) g/cm³.`,
      },
      {
        title: 'Scaling',
        text: R`If every length of a figure is multiplied by \(k\), its area and surface area are multiplied by \(k^2\) and its volume by \(k^3\). If only some dimensions change, look at the formula: a dimension that is squared contributes the square of its factor.`,
        example: R`Doubling the radius of a cylinder and keeping its height multiplies \(V = \pi r^2 h\) by \(2^2 = 4\).`,
      },
      {
        title: 'Cross-sections and solids of revolution',
        text: R`A cross-section is the flat shape made where a plane cuts a solid. A cut parallel to the base of a prism or cylinder is congruent to the base, and a cut parallel to the base of a pyramid or cone is a smaller copy of the base. Rotating a flat shape about a line sweeps out a solid: a rectangle makes a cylinder, a right triangle makes a cone, a semicircle makes a sphere.`,
        example: R`A cone cut parallel to its base gives a circle. Cut straight down through its apex, it gives a triangle.`,
      },
    ],
    vocab: [
      { term: 'height', def: 'The perpendicular distance from the base to the opposite side, face or point.' },
      { term: 'slant height', def: 'The distance along a sloping face from the apex to the edge of the base. It is longer than the height.' },
      { term: 'apothem', def: 'In a regular polygon, the distance from the centre to the midpoint of a side.' },
      { term: 'surface area', def: 'The total area of all the faces and curved surfaces of a solid.' },
      { term: 'density', def: 'Mass per unit of volume, such as grams per cubic centimetre.' },
      { term: 'cross-section', def: 'The flat shape made where a plane cuts through a solid.' },
    ],
    mistakes: [
      'Using a slanted side, or the slant height, where the formula needs the perpendicular height.',
      R`Leaving out the \(\frac{1}{2}\) for a triangle or the \(\frac{1}{3}\) for a pyramid or cone.`,
      'Mixing up surface area (square units) and volume (cubic units).',
      R`Expecting the volume to double when every length doubles. It is multiplied by \(2^3 = 8\).`,
      'Putting the diameter into a formula that needs the radius.',
    ],
    visual: solid('cone', { r: 'r', h: 'h', l: 'l' }, 'A cone with its radius r, its height h (straight up the middle) and its slant height l (along the sloping side) marked. The three lengths form a right triangle.'),
  },

  examples: [
    {
      title: 'Word problem: flooring an L-shaped room',
      word: true,
      problem: R`A room is an \(8\) m by \(6\) m rectangle with a \(3\) m by \(2\) m rectangle missing from one corner. Flooring costs $25 per square metre. How much does it cost to floor the room?`,
      steps: [
        R`Treat the floor as a large rectangle with a small one removed. Large rectangle: \(8 \cdot 6 = 48\) m².`,
        R`Missing corner: \(3 \cdot 2 = 6\) m². Floor area: \(48 - 6 = 42\) m².`,
        R`Each square metre costs $25, so the cost is \(42 \cdot 25 = 1050\) dollars.`,
      ],
      answer: 'The floor is 42 m² and costs $1,050.',
      visual: { type: 'polygon', points: [[0, 0], [8, 0], [8, 4], [5, 4], [5, 6], [0, 6]], sides: ['8', '', '', '', '', '6'], extra: [{ from: [8, 4], to: [5, 4], dashed: false, label: '3' }, { from: [5, 4], to: [5, 6], dashed: false, label: '2' }], alt: 'An L-shaped floor plan drawn to scale: a rectangle 8 m wide and 6 m high with a rectangle 3 m wide and 2 m high missing from its top right corner.' },
    },
    {
      title: 'A cone from its radius and slant height',
      problem: R`A cone has a radius of \(5\) cm and a slant height of \(13\) cm. Find its height, its volume and its total surface area.`,
      steps: [
        R`The radius, the height and the slant height form a right triangle: \(h = \sqrt{13^2 - 5^2} = \sqrt{144} = 12\) cm.`,
        R`Volume: \(V = \frac{1}{3}\pi r^2 h = \frac{1}{3}\pi (5)^2 (12) = 100\pi\) cm³.`,
        R`Surface area: base \(\pi (5)^2 = 25\pi\), curved surface \(\pi r l = \pi (5)(13) = 65\pi\). Total: \(90\pi\) cm².`,
      ],
      answer: R`\(h = 12\) cm, \(V = 100\pi\) cm³, \(SA = 90\pi\) cm²`,
      visual: solid('cone', { r: '5', h: 'h', l: '13' }, 'A cone with a radius of 5 cm and a slant height of 13 cm. Its height is marked h.'),
    },
    {
      title: 'Word problem: the volume of a silo',
      word: true,
      problem: R`A silo is a cylinder with a hemisphere on top. Its radius is \(3\) m and the cylinder part is \(10\) m high. How much grain can it hold, to the nearest cubic metre?`,
      steps: [
        R`Cylinder: \(\pi r^2 h = \pi (3)^2 (10) = 90\pi\) m³.`,
        R`Hemisphere: half of \(\frac{4}{3}\pi r^3\), which is \(\frac{2}{3}\pi (3)^3 = 18\pi\) m³.`,
        R`Total: \(90\pi + 18\pi = 108\pi \approx 339.3\) m³.`,
      ],
      answer: R`\(108\pi\) m³, which is about 339 m³`,
      visual: { type: 'polygon', points: [[-3, 0], [3, 0], ...dome(3, 10)], sides: ['', '10'], extra: [{ from: [0, 10], to: [3, 10], label: '3' }, { from: [-3, 10], to: [0, 10] }], alt: 'Side view of a silo, drawn to scale: a rectangle 6 m wide and 10 m high with a semicircle of radius 3 m on top.' },
    },
    {
      title: 'Word problem: density',
      word: true,
      problem: R`A metal cylinder has a radius of \(2\) cm, a height of \(10\) cm and a mass of \(1005\) g. Find its density to the nearest tenth. Is it more likely to be aluminium (\(2.7\) g/cm³) or steel (\(7.8\) g/cm³)?`,
      steps: [
        R`Volume: \(V = \pi r^2 h = \pi (2)^2 (10) = 40\pi \approx 125.7\) cm³.`,
        R`Density \(=\) mass \(\div\) volume \(= 1005 \div 125.7 \approx 8.0\) g/cm³.`,
        R`That is close to \(7.8\) g/cm³ and nowhere near \(2.7\) g/cm³, so the cylinder is more likely steel.`,
      ],
      answer: R`About \(8.0\) g/cm³, so it is more likely steel.`,
      visual: solid('cylinder', { r: '2', h: '10' }, 'A cylinder with a radius of 2 cm and a height of 10 cm.'),
    },
  ],

  models: [
    {
      id: 'cylinder-and-cone',
      title: 'A cylinder and the cone inside it',
      intro: 'Set a radius and a height. The cylinder and the cone share the same base and the same height.',
      inputs: [
        { name: 'r', label: 'Radius', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'h', label: 'Height', type: 'int', min: 1, max: 20, value: 4 },
      ],
      compute({ r, h }) {
        const cone = frac(r * r * h, 3);
        const exact = isSquare(r * r + h * h);
        const l = Math.sqrt(r * r + h * h);
        const lTex = exact ? `${l}` : R`${sqrtTex(r * r + h * h)} \approx ${num(l, { places: 2 })}`;
        const approx = (v) => num(v * PI, { places: 2 });
        const coneArea = exact ? R`= ${piTex(r * r + r * l)} \approx ${approx(r * r + r * l)}` : R`\approx ${approx(r * r + r * l)}`;
        return {
          problem: R`A cylinder and a cone both have radius \(${r}\) and height \(${h}\). Find the volume and the total surface area of each.`,
          steps: [
            R`Cylinder volume: \(\pi r^2 h = \pi (${r})^2 (${h}) = ${piTex(r * r * h)} \approx ${approx(r * r * h)}\).`,
            R`Cone volume: one third of that, \(${piTex(cone)} \approx ${approx(cone.value)}\).`,
            R`Cylinder surface area: \(2\pi r^2 + 2\pi rh = ${piTex(2 * r * r)} + ${piTex(2 * r * h)} = ${piTex(2 * r * r + 2 * r * h)} \approx ${approx(2 * r * r + 2 * r * h)}\).`,
            R`Slant height of the cone: \(l = \sqrt{${r}^2 + ${h}^2} = \sqrt{${r * r + h * h}}${exact ? ` = ${l}` : R` \approx ${num(l, { places: 2 })}`}\).`,
            R`Cone surface area: \(\pi r^2 + \pi r l = ${piTex(r * r)} + \pi (${r})(${exact ? l : sqrtTex(r * r + h * h)}) ${coneArea}\).`,
          ],
          answer: R`Cylinder: \(V = ${piTex(r * r * h)}\), \(SA = ${piTex(2 * r * r + 2 * r * h)}\). Cone: \(V = ${piTex(cone)}\), \(SA ${coneArea}\), with slant height \(${lTex}\).`,
          visual: [solid('cylinder', { r: `${r}`, h: `${h}` }, `A cylinder with radius ${r} and height ${h}.`), solid('cone', { r: `${r}`, h: `${h}`, l: exact ? `${l}` : `≈ ${T(l)}` }, `A cone with radius ${r}, height ${h} and slant height ${exact ? l : `about ${T(l)}`}.`)],
        };
      },
    },
    {
      id: 'float-or-sink',
      title: 'Word problem: will the block float?',
      word: true,
      intro: 'Set the size of a solid block and its mass. Water has a density of 1 g/cm³.',
      inputs: [
        { name: 'l', label: 'Length (cm)', type: 'int', min: 1, max: 30, value: 10 },
        { name: 'w', label: 'Width (cm)', type: 'int', min: 1, max: 30, value: 5 },
        { name: 'h', label: 'Height (cm)', type: 'int', min: 1, max: 30, value: 4 },
        { name: 'mass', label: 'Mass (g)', type: 'int', min: 1, max: 20000, value: 540 },
      ],
      compute({ l, w, h, mass }) {
        const V = l * w * h;
        const rho = mass / V;
        const shown = num(rho, { places: 2 });
        const exact = round(rho, 2) === round(rho, 6);
        const verdict = round(rho, 6) === 1 ? 'the same as the density of water, so the block neither rises nor sinks' : rho < 1 ? 'less than the density of water, so the block floats' : 'more than the density of water, so the block sinks';
        return {
          problem: R`A solid block is \(${l}\) cm long, \(${w}\) cm wide and \(${h}\) cm high, and its mass is \(${num(mass)}\) g. What is its density? Will it float in water, which has a density of \(1\) g/cm³?`,
          steps: [
            R`Volume: \(${l} \cdot ${w} \cdot ${h} = ${num(V)}\) cm³.`,
            R`Density \(=\) mass \(\div\) volume: \(${num(mass)} \div ${num(V)} ${exact ? '=' : R`\approx`} ${shown}\) g/cm³.`,
            `That is ${verdict}.`,
          ],
          answer: R`The density is ${exact ? '' : 'about '}\(${shown}\) g/cm³, ${verdict}.`,
          visual: solid('box', { l: `${l}`, w: `${w}`, h: `${h}` }, `A rectangular block ${l} cm long, ${w} cm wide and ${h} cm high.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyPolygonArea, easyPrismVolume, easyCrossSection],
    medium: [mediumCompositeArea, mediumSurfaceArea, mediumPointedVolume],
    hard: [hardSlantHeight, hardCompositeSolid, hardDensity],
    challenge: [challengeScaling, challengeMissingDimension, challengeRecast],
  },
};
