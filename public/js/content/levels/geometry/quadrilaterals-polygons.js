import { R, q, num, frac, linear, point, person } from '../../lib/index.js';
import { deg, degM, degT, T, rad, dist, labelAt, TRIPLES } from './_shared.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
const asX = (v) => R`\(x = ${num(v)}\)`;
const posInt = (v) => (Number.isInteger(v) && v > 0 ? v : null);
const NAMES = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon', 12: 'dodecagon' };
const polyName = (n) => (NAMES[n] ? `${NAMES[n]}` : `${n}-gon`);
const aPoly = (n) => `${n === 8 || n === 11 || n === 18 ? 'an' : 'a'} ${polyName(n)}`;
const ngon = (n, r = 3) => {
  const start = n % 2 ? 90 : 90 + 180 / n;
  return Array.from({ length: n }, (_, i) => [r3(r * Math.cos(rad(start + (360 * i) / n))), r3(r * Math.sin(rad(start + (360 * i) / n)))]);
};
// A rhombus from its diagonals (horizontal d1, vertical d2), with the diagonals dashed and labelled near their ends.
const rhombus = (d1, d2, alt) => ({
  type: 'polygon',
  points: [[-d1 / 2, 0], [0, -d2 / 2], [d1 / 2, 0], [0, d2 / 2]],
  marks: [1, 1, 1, 1],
  extra: [{ from: [-d1 / 2, 0], to: [d1 / 2, 0] }, { from: [0, -d2 / 2], to: [0, d2 / 2] }, labelAt([d1 * 0.27, 0], [d1 / 2, 0], `${d1}`), labelAt([0, d2 * 0.27], [0, d2 / 2], `${d2}`)],
  alt,
});
// Parallelogram ABCD with base w, slanted side s and angle t at A. Vertex order A, B, C, D (counter-clockwise).
const para = (w, s, t) => [[0, 0], [w, 0], [r3(w + s * Math.cos(rad(t))), r3(s * Math.sin(rad(t)))], [r3(s * Math.cos(rad(t))), r3(s * Math.sin(rad(t)))]];

// ───────────── Easy ─────────────

function easyAngleSum(rng) {
  const n = rng.pick([4, 5, 6, 7, 8, 9, 10, 12]);
  const S = (n - 2) * 180;
  const pts = ngon(n);
  const fan = Array.from({ length: n - 3 }, (_, i) => ({ from: pts[0], to: pts[i + 2] }));
  const visual = { type: 'polygon', points: pts, extra: fan, alt: `A polygon with ${n} sides. Dashed diagonals from one vertex split it into ${n - 2} triangles.` };
  if (rng.bool()) {
    return q({
      prompt: R`What is the sum of the interior angles of ${aPoly(n)} (a polygon with \(${n}\) sides)?`,
      visual,
      correct: S,
      fmt: degM,
      wrong: [
        { value: n * 180, why: R`Subtract \(2\) from the number of sides first. The diagonals from one vertex cut the polygon into \(${n - 2}\) triangles, not \(${n}\).` },
        { value: 360, why: R`\(360^\circ\) is the sum of the exterior angles. The interior angles add to \((n - 2) \cdot 180^\circ\).` },
        (n - 1) * 180,
        (n - 2) * 90,
        S + 90,
      ],
      solution: [R`Diagonals from one vertex split the polygon into \(${n} - 2 = ${n - 2}\) triangles.`, R`Each triangle has an angle sum of \(180^\circ\), so the total is \(${n - 2} \cdot 180 = ${S}\) degrees.`],
      rule: 0,
      skill: 'interior angle sum',
    });
  }
  return q({
    prompt: R`The interior angles of a polygon add up to \(${deg(S)}\). How many sides does the polygon have?`,
    correct: n,
    wrong: [
      { value: n - 2, why: R`That is the number of triangles the polygon splits into. The number of sides is \(2\) more.` },
      { value: posInt(S / 90), why: R`Divide the sum by \(180^\circ\), the angle sum of one triangle, and then add \(2\).` },
      n - 1,
      n + 1,
      n + 2,
    ],
    solution: [R`The angle sum is \((n - 2) \cdot 180\), so \((n - 2) \cdot 180 = ${S}\).`, R`Divide by \(180\): \(n - 2 = ${n - 2}\).`, R`\(n = ${n}\), so the polygon is ${aPoly(n)}.`],
    rule: 0,
    skill: 'interior angle sum',
    check: () => ((n - 2) * 180 === S ? true : 'sides do not give this sum'),
  });
}

function easyParallelogramAngle(rng) {
  const t = rng.bool() ? rng.int(40, 80) : rng.int(100, 140);
  const opposite = rng.bool();
  const x = opposite ? t : 180 - t;
  const pts = para(7, 4.5, t);
  return q({
    prompt: R`In parallelogram \(ABCD\), \(m\angle A = ${deg(t)}\). What is \(m\angle ${opposite ? 'C' : 'B'}\)?`,
    visual: { type: 'polygon', points: pts, vertices: ['A', 'B', 'C', 'D'], angles: opposite ? [degT(t), '', 'x', ''] : [degT(t), 'x', '', ''], alt: `Parallelogram ABCD with vertices in order around the shape. Angle A is ${t} degrees and angle ${opposite ? 'C, opposite it,' : 'B, next to it,'} is marked x.` },
    correct: x,
    fmt: degM,
    wrong: [
      opposite ? { value: 180 - t, why: R`\(\angle A\) and \(\angle C\) are opposite angles, which are congruent. \(180^\circ - m\angle A\) is the angle next to \(\angle A\).` } : { value: t, why: R`\(\angle A\) and \(\angle B\) are consecutive angles, which are supplementary. Only opposite angles are congruent.` },
      90,
      t < 90 ? 90 - t : t - 90,
      360 - t,
      opposite ? 360 - 2 * t : 2 * t,
    ],
    solution: opposite
      ? [R`\(\angle A\) and \(\angle C\) are opposite angles of the parallelogram.`, R`Opposite angles of a parallelogram are congruent, so \(m\angle C = ${deg(t)}\).`]
      : [R`\(\angle A\) and \(\angle B\) are consecutive angles: they share side \(\overline{AB}\).`, R`Consecutive angles of a parallelogram are supplementary: \(m\angle B = 180 - ${t} = ${180 - t}\) degrees.`],
    rule: 2,
    skill: 'parallelogram properties',
    check: () => {
      const at = (i) => {
        const [p, v, w] = [pts[(i + 3) % 4], pts[i], pts[(i + 1) % 4]];
        const a = Math.atan2(p[1] - v[1], p[0] - v[0]) - Math.atan2(w[1] - v[1], w[0] - v[0]);
        return Math.round(Math.abs(((a * 180) / Math.PI + 540) % 360 - 180) * 10) / 10;
      };
      return Math.abs(at(opposite ? 2 : 1) - x) < 0.1 ? true : 'the figure has a different angle';
    },
  });
}

const SHAPES = { para: 'A parallelogram', rect: 'A rectangle', rhom: 'A rhombus', sq: 'A square', trap: 'A trapezoid', iso: 'An isosceles trapezoid', kite: 'A kite' };
const PROPERTIES = [
  { text: 'diagonals that are congruent', yes: ['rect', 'sq', 'iso'], why: 'Rectangles (and so squares) and isosceles trapezoids always have congruent diagonals. A general parallelogram, rhombus, kite or trapezoid does not.' },
  { text: 'diagonals that are perpendicular', yes: ['rhom', 'sq', 'kite'], why: 'The diagonals of every rhombus (and so every square) and every kite meet at right angles. This is not true for rectangles, general parallelograms or trapezoids.' },
  { text: 'diagonals that bisect each other', yes: ['para', 'rect', 'rhom', 'sq'], why: 'The diagonals bisect each other in every parallelogram, and rectangles, rhombuses and squares are all parallelograms. In a kite only one diagonal is bisected, and in a trapezoid neither is.' },
  { text: 'four congruent sides', yes: ['rhom', 'sq'], why: 'Four congruent sides is the definition of a rhombus, and a square is a rhombus with right angles.' },
  { text: 'four right angles', yes: ['rect', 'sq'], why: 'Four right angles is the definition of a rectangle, and a square is a rectangle with congruent sides.' },
  { text: 'two pairs of congruent opposite sides', yes: ['para', 'rect', 'rhom', 'sq'], why: 'Opposite sides are congruent in every parallelogram, including rectangles, rhombuses and squares. A kite has congruent sides that are next to each other, and a trapezoid has only one pair of parallel sides.' },
  { text: 'two pairs of congruent opposite angles', yes: ['para', 'rect', 'rhom', 'sq'], why: 'Opposite angles are congruent in every parallelogram, including rectangles, rhombuses and squares. A kite has just one pair of congruent opposite angles.' },
];

function easyProperty(rng) {
  const p = rng.pick(PROPERTIES);
  const good = rng.pick(p.yes);
  const bad = rng.sample(Object.keys(SHAPES).filter((k) => !p.yes.includes(k)), 3);
  return q({
    prompt: `Which of these quadrilaterals must have ${p.text}?`,
    correct: SHAPES[good],
    wrong: bad.map((k) => SHAPES[k]),
    solution: [p.why, `Of the choices, only ${SHAPES[good].toLowerCase()} always has ${p.text}.`],
    rule: ['para'].includes(good) ? 2 : ['trap', 'iso'].includes(good) ? 4 : good === 'kite' ? 5 : 3,
    skill: 'properties of quadrilaterals',
  });
}

// ───────────── Medium ─────────────

function mediumRegular(rng) {
  const n = rng.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]);
  const ext = 360 / n;
  const int = 180 - ext;
  const kind = rng.pick(['interior', 'exterior', 'n-ext', 'n-int', 'robot', n <= 12 ? 'tile' : 'robot']);
  const visual = n <= 12 ? { type: 'polygon', points: ngon(n), alt: `A regular polygon with ${n} congruent sides and ${n} congruent angles.` } : undefined;
  const name = person(rng);
  const steps = [R`The exterior angles of any polygon add to \(360^\circ\). In a regular polygon they are all equal, so each one is \(\dfrac{360}{${n}} = ${ext}\) degrees.`, R`Each interior angle is the supplement of an exterior angle: \(180 - ${ext} = ${int}\) degrees.`];
  if (kind === 'interior' || kind === 'tile') {
    return q({
      prompt: kind === 'tile' ? R`${name} is cutting a tile in the shape of a regular polygon with \(${n}\) sides. What angle must be cut at each corner of the tile?` : R`What is the measure of each interior angle of a regular polygon with \(${n}\) sides?`,
      visual,
      correct: int,
      fmt: degM,
      wrong: [
        { value: ext, why: R`That is each exterior angle. The interior angle is its supplement.` },
        { value: (n - 2) * 180, why: R`That is the sum of all \(${n}\) interior angles. Divide it by \(${n}\).` },
        180 - 2 * ext > 0 ? 180 - 2 * ext : int - 10,
        int - 5,
        posInt((n * 180) / (n + 2)),
      ],
      solution: [...steps, R`Check with the angle sum: \(\dfrac{(${n} - 2) \cdot 180}{${n}} = \dfrac{${(n - 2) * 180}}{${n}} = ${int}\). ✓`],
      rule: 1,
      skill: 'regular polygons',
      check: () => (Math.abs(((n - 2) * 180) / n - int) < 1e-9 ? true : 'interior angle is wrong'),
    });
  }
  if (kind === 'exterior' || kind === 'robot') {
    return q({
      prompt: kind === 'robot' ? R`${name} programs a robot to walk once around a path shaped like a regular polygon with \(${n}\) sides. At each corner the robot turns through one exterior angle. How many degrees does it turn at each corner?` : R`What is the measure of each exterior angle of a regular polygon with \(${n}\) sides?`,
      visual,
      correct: ext,
      fmt: degM,
      wrong: [
        { value: int, why: R`That is each interior angle. The exterior angle is its supplement.` },
        { value: 180 / n, why: R`The exterior angles add to \(360^\circ\), a full turn, not \(180^\circ\).` },
        ext + 10,
        2 * ext,
        (n - 2) * 180,
      ],
      solution: [kind === 'robot' ? R`After one full lap the robot faces the way it started, so its \(${n}\) equal turns add up to one full turn of \(360^\circ\).` : R`The exterior angles of any polygon, one at each vertex, add to \(360^\circ\).`, R`Each turn is \(\dfrac{360}{${n}} = ${ext}\) degrees.`],
      rule: 1,
      skill: 'regular polygons',
    });
  }
  const fromExt = kind === 'n-ext';
  return q({
    prompt: fromExt ? R`Each exterior angle of a regular polygon measures \(${deg(ext)}\). How many sides does the polygon have?` : R`Each interior angle of a regular polygon measures \(${deg(int)}\). How many sides does the polygon have?`,
    correct: n,
    wrong: fromExt
      ? [{ value: posInt(180 / ext), why: R`The exterior angles add to \(360^\circ\), not \(180^\circ\).` }, n + 2, n - 1, 2 * n, n + 1]
      : [{ value: posInt(360 / int) ?? n - 2, why: R`Divide \(360^\circ\) by the exterior angle, \(180 - ${int} = ${ext}\) degrees, not by the interior angle.` }, { value: posInt(180 / ext), why: R`The exterior angles add to \(360^\circ\), not \(180^\circ\).` }, n + 2, n - 1, 2 * n],
    solution: fromExt
      ? [R`The exterior angles add to \(360^\circ\) and are all equal, so the number of sides is \(\dfrac{360}{${ext}} = ${n}\).`, R`Check: \(${n} \cdot ${ext} = 360\). ✓`]
      : [R`Each exterior angle is the supplement of an interior angle: \(180 - ${int} = ${ext}\) degrees.`, R`The exterior angles add to \(360^\circ\), so the number of sides is \(\dfrac{360}{${ext}} = ${n}\).`],
    rule: 1,
    skill: 'regular polygons',
    check: () => (n * ext === 360 && int + ext === 180 ? true : 'angles do not fit the polygon'),
  });
}

function mediumParallelogramAlgebra(rng) {
  for (;;) {
    const kind = rng.pick(['sides', 'angles', 'diagonals']);
    const x = rng.int(2, 12);
    const a1 = rng.int(1, 5);
    const a2 = rng.intExcept(1, 6, [a1]);
    const t = rng.intExcept(50, 130, [90]);
    const first = kind === 'angles' ? t : rng.int(8, 40);
    const second = kind === 'angles' ? 180 - t : first;
    const b1 = first - a1 * x;
    const b2 = second - a2 * x;
    if (b1 === 0 || b2 === 0 || Math.abs(b1) > 40 || Math.abs(b2) > 40) continue;
    const pts = para(7, 4.5, kind === 'angles' ? t : 65);
    const E = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2];
    const base = { type: 'polygon', points: pts, vertices: ['A', 'B', 'C', 'D'] };
    const eqSteps = [Math.abs(a1 - a2) === 1 ? R`\(${linear(a1, b1)} = ${linear(a2, b2)}\), so \(x = ${x}\).` : R`\(${linear(a1, b1)} = ${linear(a2, b2)}\), so \(${linear(Math.abs(a1 - a2), 0)} = ${Math.abs(b2 - b1)}\) and \(x = ${x}\).`];
    if (kind === 'sides') {
      return q({
        prompt: R`In parallelogram \(ABCD\), \(AB = ${linear(a1, b1)}\) and \(DC = ${linear(a2, b2)}\), in centimetres. How long is \(\overline{AB}\)?`,
        visual: { ...base, alt: 'Parallelogram ABCD with vertices in order around the shape. Sides AB and DC are opposite each other.' },
        correct: first,
        unit: 'cm',
        wrong: [{ value: x, why: R`That is the value of \(x\). Substitute it into \(${linear(a1, b1)}\) to get the length.` }, { value: 2 * first, why: R`That is \(AB + DC\). The question asks for \(AB\) alone.` }, first + a1, first > 6 ? first - 3 : first + 5, first + 10],
        solution: [R`Opposite sides of a parallelogram are congruent, so \(AB = DC\).`, ...eqSteps, R`\(AB = ${a1 === 1 ? '' : a1}(${x})${b1 < 0 ? ` - ${-b1}` : ` + ${b1}`} = ${first}\) cm.`],
        rule: 2,
        skill: 'parallelogram properties',
        check: () => (a1 * x + b1 === a2 * x + b2 && a1 * x + b1 === first ? true : 'opposite sides are not equal'),
      });
    }
    if (kind === 'diagonals') {
      return q({
        prompt: R`The diagonals of parallelogram \(ABCD\) meet at \(E\). \(AE = ${linear(a1, b1)}\) and \(EC = ${linear(a2, b2)}\), in centimetres. How long is diagonal \(\overline{AC}\)?`,
        visual: { ...base, extra: [{ from: pts[0], to: pts[2], dashed: false }, { from: pts[1], to: pts[3], dashed: false }, labelAt(E, pts[1], 'E', 'left')], alt: 'Parallelogram ABCD with both diagonals drawn. They cross at point E.' },
        correct: 2 * first,
        unit: 'cm',
        wrong: [{ value: first, why: R`That is \(AE\), half of the diagonal. \(AC = AE + EC\).` }, { value: x, why: R`That is the value of \(x\). Substitute it, then add the two halves.` }, 3 * first, 4 * first, first + 3],
        solution: [R`The diagonals of a parallelogram bisect each other, so \(AE = EC\).`, ...eqSteps, R`\(AE = EC = ${first}\), so \(AC = ${first} + ${first} = ${2 * first}\) cm.`],
        rule: 2,
        skill: 'parallelogram properties',
        check: () => (a1 * x + b1 === a2 * x + b2 && a1 * x + b1 + a2 * x + b2 === 2 * first ? true : 'the two halves are not equal'),
      });
    }
    const slip = (b2 - b1) % (a1 - a2) === 0 ? (b2 - b1) / (a1 - a2) : null;
    const slipAngle = slip != null ? a2 * slip + b2 : null;
    return q({
      prompt: R`In parallelogram \(ABCD\), \(m\angle A = (${linear(a1, b1)})^\circ\) and \(m\angle B = (${linear(a2, b2)})^\circ\). What is \(m\angle B\)?`,
      visual: { ...base, alt: 'Parallelogram ABCD with vertices in order around the shape. Angles A and B are next to each other, at the two ends of side AB.' },
      correct: second,
      fmt: degM,
      wrong: [
        slipAngle != null && slipAngle > 0 && slipAngle < 180 && slipAngle !== second ? { value: slipAngle, why: R`\(\angle A\) and \(\angle B\) are consecutive angles, so they are supplementary. Only opposite angles are congruent.` } : null,
        { value: first, why: R`That is \(m\angle A\). The question asks for \(m\angle B\).` },
        { value: x, why: R`That is the value of \(x\). Substitute it into \(${linear(a2, b2)}\).` },
        second + 10,
        Math.abs(90 - second) || 45,
      ],
      solution: [
        R`\(\angle A\) and \(\angle B\) are consecutive angles of a parallelogram, so they are supplementary: \((${linear(a1, b1)}) + (${linear(a2, b2)}) = 180\).`,
        R`Combine like terms: \(${linear(a1 + a2, b1 + b2)} = 180\), so \(${a1 + a2}x = ${180 - b1 - b2}\) and \(x = ${x}\).`,
        R`\(m\angle B = ${a2 === 1 ? '' : a2}(${x})${b2 < 0 ? ` - ${-b2}` : ` + ${b2}`} = ${second}\) degrees.`,
      ],
      rule: 2,
      skill: 'parallelogram properties',
      check: () => (a1 * x + b1 + a2 * x + b2 === 180 && a2 * x + b2 === second ? true : 'consecutive angles are not supplementary'),
    });
  }
}

// A trapezoid with bases b1 (bottom) and b2 (top) and its midsegment.
function trapFigure(b1, b2, labels, alt) {
  const h = 0.45 * b1;
  const off = (b1 - b2) * 0.35;
  const pts = [[0, 0], [b1, 0], [r3(off + b2), r3(h)], [r3(off), r3(h)]];
  const M = [off / 2, h / 2];
  const N = [(b1 + off + b2) / 2, h / 2];
  return { type: 'polygon', points: pts, sides: [labels[0], '', labels[1], ''], extra: [{ from: M, to: N, dashed: false, label: labels[2] }], alt, M, N };
}

function mediumMidsegment(rng) {
  const b2 = rng.int(4, 20);
  const b1 = b2 + 2 * rng.int(2, 10);
  const m = (b1 + b2) / 2;
  const kind = rng.pick(['mid', 'top', 'bottom']);
  const lab = kind === 'mid' ? [`${b1}`, `${b2}`, 'x'] : kind === 'top' ? [`${b1}`, 'x', `${m}`] : ['x', `${b2}`, `${m}`];
  const fig = trapFigure(b1, b2, lab, `A trapezoid with a longer base on the bottom (${lab[0]}), a shorter parallel base on top (${lab[1]}), and a midsegment joining the midpoints of the two legs (${lab[2]}).`);
  const { M, N, ...visual } = fig;
  const given = kind === 'top' ? b1 : b2;
  const ans = kind === 'mid' ? m : kind === 'top' ? b2 : b1;
  return q({
    prompt: kind === 'mid' ? R`The bases of a trapezoid are \(${b1}\) cm and \(${b2}\) cm long. How long is its midsegment?` : R`The midsegment of a trapezoid is \(${m}\) cm long and one base is \(${given}\) cm long. How long is the other base?`,
    visual,
    correct: ans,
    unit: 'cm',
    wrong: kind === 'mid'
      ? [{ value: b1 + b2, why: 'The midsegment is half the sum of the bases, their average.' }, { value: (b1 - b2) / 2, why: 'Add the bases before halving. The midsegment is their average, not half their difference.' }, m + 2, m - 1, b1]
      : [{ value: posInt((m + given) / 2), why: R`The midsegment is the average of the two bases, so the bases add to \(2 \cdot ${m} = ${2 * m}\).` }, { value: 2 * m, why: R`\(${2 * m}\) is the sum of both bases. Subtract the base you know.` }, { value: Math.abs(m - given), why: 'That is the gap between the midsegment and the known base. The other base is that far from the midsegment on the other side.' }, ans + 2, ans + 5],
    solution: kind === 'mid'
      ? [R`The midsegment of a trapezoid is parallel to the bases, and its length is the average of their lengths.`, R`\(\dfrac{${b1} + ${b2}}{2} = \dfrac{${b1 + b2}}{2} = ${m}\) cm.`]
      : [R`The midsegment is the average of the bases: \(\dfrac{${given} + x}{2} = ${m}\).`, R`Multiply by \(2\): \(${given} + x = ${2 * m}\).`, R`\(x = ${2 * m} - ${given} = ${ans}\) cm.`],
    rule: 4,
    skill: 'trapezoid midsegment',
    check: () => (Math.abs(dist(M, N) - m) < 1e-6 && b1 + b2 === 2 * m ? true : 'the midsegment drawn has a different length'),
  });
}

// ───────────── Hard ─────────────

function hardSpecialQuads(rng) {
  const kind = rng.pick(['rhombus', 'rectangle', 'kite']);
  if (kind === 'rhombus') {
    const [a, b, c] = rng.pick(TRIPLES.filter((t) => t[2] <= 30));
    const name = person(rng);
    const side = rng.bool(0.35);
    return q({
      prompt: side
        ? R`The diagonals of a rhombus are \(${2 * a}\) cm and \(${2 * b}\) cm long. How long is each side of the rhombus?`
        : R`${name} is making a window in the shape of a rhombus. Its diagonals are \(${2 * a}\) cm and \(${2 * b}\) cm long. How much edging strip is needed to go once around the outside of the window?`,
      visual: rhombus(2 * b, 2 * a, `A rhombus with its two diagonals drawn as dashed lines. The horizontal diagonal is ${2 * b} cm and the vertical diagonal is ${2 * a} cm. They cross at right angles at their midpoints.`),
      correct: side ? c : 4 * c,
      unit: 'cm',
      wrong: side
        ? [{ value: 2 * c, why: 'The diagonals bisect each other, so the legs of each right triangle are half of each diagonal.' }, { value: a + b, why: 'Each side is the hypotenuse of a right triangle whose legs are the half-diagonals. Use the Pythagorean theorem.' }, 4 * c, c + 2, 2 * a]
        : [{ value: 8 * c, why: 'The diagonals bisect each other, so the legs of each right triangle are half of each diagonal.' }, { value: c, why: 'That is one side. The edging goes around all four sides.' }, 4 * (a + b), 2 * (2 * a + 2 * b) === 4 * (a + b) ? 2 * a * b : 2 * (2 * a + 2 * b), 4 * c + 4],
      solution: [
        R`The diagonals of a rhombus are perpendicular and bisect each other, so they cut it into four right triangles with legs \(${a}\) and \(${b}\).`,
        R`Each side is a hypotenuse: \(\sqrt{${a}^2 + ${b}^2} = \sqrt{${a * a + b * b}} = ${c}\) cm.`,
        ...(side ? [] : [R`All four sides are congruent, so the perimeter is \(4 \cdot ${c} = ${4 * c}\) cm.`]),
      ],
      rule: 3,
      skill: 'rhombus and rectangle properties',
      check: () => (Math.abs(dist([-b, 0], [0, a]) - c) < 1e-9 ? true : 'side length does not match the diagonals'),
    });
  }
  if (kind === 'rectangle') {
    for (;;) {
      const x = rng.int(2, 10);
      const half = rng.int(6, 30);
      const a1 = rng.int(1, 5);
      const a2 = rng.intExcept(1, 6, [a1]);
      const b1 = half - a1 * x;
      const b2 = half - a2 * x;
      if (b1 === 0 || b2 === 0 || Math.abs(b1) > 30 || Math.abs(b2) > 30) continue;
      const pts = [[0, 0], [8, 0], [8, 4.5], [0, 4.5]];
      return q({
        prompt: R`The diagonals of rectangle \(ABCD\) meet at \(E\). \(AE = ${linear(a1, b1)}\) and \(BE = ${linear(a2, b2)}\), in centimetres. How long is diagonal \(\overline{BD}\)?`,
        visual: { type: 'polygon', points: pts, vertices: ['A', 'B', 'C', 'D'], right: [0, 1, 2, 3], extra: [{ from: pts[0], to: pts[2], dashed: false }, { from: pts[1], to: pts[3], dashed: false }, labelAt([4, 2.25], pts[1], 'E', 'left')], alt: 'Rectangle ABCD with both diagonals drawn. They cross at point E.' },
        correct: 2 * half,
        unit: 'cm',
        wrong: [{ value: half, why: R`That is \(BE\), half of the diagonal. \(BD = 2 \cdot BE\).` }, { value: x, why: R`That is the value of \(x\). Substitute it, then double.` }, 4 * half, 2 * half + a2, half + 5],
        solution: [
          R`The diagonals of a rectangle are congruent and bisect each other, so all four half-diagonals are equal: \(AE = BE\).`,
          Math.abs(a1 - a2) === 1 ? R`\(${linear(a1, b1)} = ${linear(a2, b2)}\), so \(x = ${x}\).` : R`\(${linear(a1, b1)} = ${linear(a2, b2)}\), so \(${linear(Math.abs(a1 - a2), 0)} = ${Math.abs(b2 - b1)}\) and \(x = ${x}\).`,
          R`\(BE = ${half}\) cm, so \(BD = 2 \cdot ${half} = ${2 * half}\) cm.`,
        ],
        rule: 3,
        skill: 'rhombus and rectangle properties',
        check: () => (a1 * x + b1 === a2 * x + b2 && a2 * x + b2 === half ? true : 'half-diagonals are not equal'),
      });
    }
  }
  for (;;) {
    const top = 2 * rng.int(30, 65);
    const bottom = 2 * rng.int(15, 45);
    const x = (360 - top - bottom) / 2;
    if (x < 70 || x > 150 || top === bottom || Math.abs(180 - top - x) < 6 || Math.abs(180 - bottom - x) < 6) continue;
    const ya = 3 / Math.tan(rad(top / 2));
    const yc = 3 / Math.tan(rad(bottom / 2));
    const pts = [[0, r3(ya)], [-3, 0], [0, r3(-yc)], [3, 0]];
    return q({
      prompt: R`\(ABCD\) is a kite with \(AB = AD\) and \(CB = CD\). \(m\angle A = ${deg(top)}\) and \(m\angle C = ${deg(bottom)}\). What is \(m\angle B\)?`,
      visual: { type: 'polygon', points: pts, vertices: ['A', 'B', 'C', 'D'], marks: [1, 2, 2, 1], angles: [degT(top), 'x', degT(bottom), ''], alt: `Kite ABCD with A at the top and C at the bottom. Sides AB and AD are congruent, and sides CB and CD are congruent. Angle A is ${top} degrees, angle C is ${bottom} degrees, and angle B is marked x.` },
      correct: x,
      fmt: degM,
      wrong: [
        { value: 360 - top - bottom, why: R`That is \(m\angle B + m\angle D\). The two angles are congruent, so divide by \(2\).` },
        { value: 180 - top > 0 && 180 - top !== x ? 180 - top : 180 - bottom, why: 'A kite is not a parallelogram, so its consecutive angles are not supplementary. Use the angle sum of a quadrilateral.' },
        (top + bottom) / 2,
        (180 - top - bottom + 180) / 2 + 10,
        x - 10,
      ],
      solution: [
        R`The angles of any quadrilateral add to \(360^\circ\).`,
        R`In a kite, the two angles between sides of different lengths are congruent: \(m\angle B = m\angle D = x\).`,
        R`\(${top} + ${bottom} + 2x = 360\), so \(2x = ${360 - top - bottom}\) and \(x = ${x}\).`,
      ],
      rule: 5,
      skill: 'kite properties',
      check: () => {
        const u = [pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]];
        const w = [pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]];
        const got = (Math.acos((u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w))) * 180) / Math.PI;
        return Math.abs(got - x) < 0.05 ? true : `the figure has angle B = ${got}`;
      },
    });
  }
}

function hardPolygonAlgebra(rng) {
  for (;;) {
    const n = rng.int(4, 6);
    const total = (n - 2) * 180;
    const angles = Array.from({ length: n - 1 }, () => rng.int(75, 150));
    angles.push(total - angles.reduce((s, v) => s + v, 0));
    if (angles[n - 1] < 70 || angles[n - 1] > 165) continue;
    const x = rng.int(8, 30);
    const k = rng.int(2, 3); // how many angles are written with x
    const co = Array.from({ length: k }, () => rng.int(1, 5));
    const ks = co.map((c, i) => angles[i] - c * x);
    if (ks.some((v) => Math.abs(v) > 45)) continue;
    const show = angles.map((v, i) => (i < k ? (ks[i] === 0 ? R`${linear(co[i], 0)}^\circ` : R`(${linear(co[i], ks[i])})^\circ`) : deg(v)));
    const sumCo = co.reduce((s, v) => s + v, 0);
    const sumK = ks.reduce((s, v) => s + v, 0) + angles.slice(k).reduce((s, v) => s + v, 0);
    const slip = (S) => ((S - sumK) % sumCo === 0 && (S - sumK) / sumCo > 0 ? (S - sumK) / sumCo : null);
    if (slip(n * 180) == null && slip(total - 180) == null && (n === 4 || slip(360) == null)) continue;
    return q({
      prompt: R`The interior angles of a ${polyName(n)} measure ${show.slice(0, -1).map((s) => R`\(${s}\)`).join(', ')} and \(${show[n - 1]}\). Find \(x\).`,
      correct: x,
      fmt: asX,
      wrong: [
        n !== 4 && slip(360) != null ? { value: slip(360), why: R`\(360^\circ\) is the angle sum of a quadrilateral. A ${polyName(n)} has an angle sum of \((${n} - 2) \cdot 180 = ${deg(total)}\).` } : null,
        slip(n * 180) != null ? { value: slip(n * 180), why: R`The angle sum is \((n - 2) \cdot 180\), not \(n \cdot 180\).` } : null,
        slip(total - 180) != null ? { value: slip(total - 180), why: R`A ${polyName(n)} splits into \(${n - 2}\) triangles, so its angle sum is \(${n - 2} \cdot 180 = ${deg(total)}\).` } : null,
        x + 3,
        x > 6 ? x - 4 : x + 6,
        x + 10,
      ],
      solution: [
        R`The interior angles of a ${polyName(n)} add to \((${n} - 2) \cdot 180 = ${total}\) degrees.`,
        R`Add the angles and set the sum equal to \(${total}\): \(${linear(sumCo, sumK)} = ${total}\).`,
        R`\(${sumCo}x = ${total - sumK}\), so \(x = ${x}\).`,
      ],
      rule: 0,
      skill: 'interior angle sum',
      check: () => (co.reduce((s, c, i) => s + c * x + ks[i], 0) + angles.slice(k).reduce((s, v) => s + v, 0) === total ? true : 'angles do not add to the polygon sum'),
    });
  }
}

function hardClassifyCoordinates(rng) {
  for (;;) {
    const kind = rng.pick(['Square', 'Rectangle', 'Rhombus', 'Parallelogram']);
    const p = rng.int(1, 4);
    const r = rng.int(1, 4);
    let u;
    let v;
    if (kind === 'Square') [u, v] = [[p, r], [-r, p]];
    else if (kind === 'Rectangle') [u, v] = [[2 * p, 2 * r], [-r, p]];
    else if (kind === 'Rhombus') [u, v] = [[p, r], [rng.bool() ? r : -r, p]].map((w, i) => (i === 1 && p === r ? [w[0] + 1, w[1]] : w));
    else [u, v] = [[p + 2, r], [rng.int(-2, 2), rng.int(2, 4)]];
    const dot = u[0] * v[0] + u[1] * v[1];
    const [lu, lv] = [u[0] ** 2 + u[1] ** 2, v[0] ** 2 + v[1] ** 2];
    const actual = dot === 0 ? (lu === lv ? 'Square' : 'Rectangle') : lu === lv ? 'Rhombus' : 'Parallelogram';
    if (actual !== kind || u[0] * v[1] - u[1] * v[0] <= 0 || u[0] === 0 || v[0] === 0) continue;
    const A = [rng.int(-5, 0), rng.int(-5, 0)];
    const pts = [A, [A[0] + u[0], A[1] + u[1]], [A[0] + u[0] + v[0], A[1] + u[1] + v[1]], [A[0] + v[0], A[1] + v[1]]];
    const lim = Math.max(...pts.flat().map(Math.abs)) + 1;
    if (lim > 10) continue;
    const slope = (w) => frac(w[1], w[0]).tex();
    const names = ['A', 'B', 'C', 'D'];
    return q({
      prompt: R`Quadrilateral \(ABCD\) has vertices ${pts.map((pt, i) => R`\(${names[i]}${point(...pt)}\)`).join(', ')}. Which is the most specific name for \(ABCD\)?`,
      visual: { type: 'plot', x: [-lim, lim], y: [-lim, lim], square: true, step: [1, 1], polygons: [{ points: pts }], points: pts.map((pt, i) => ({ x: pt[0], y: pt[1], label: names[i] })), alt: `Quadrilateral ABCD on the coordinate plane with vertices ${pts.map((pt, i) => `${names[i]}(${T(pt[0])}, ${T(pt[1])})`).join(', ')}.` },
      correct: kind,
      wrong: [
        kind === 'Square' ? { value: 'Rhombus', why: 'It is a rhombus, but its sides are also perpendicular, which makes it a square. Choose the most specific name.' } : kind === 'Rectangle' ? { value: 'Square', why: 'The sides are perpendicular, but adjacent sides have different lengths, so it is not a square.' } : kind === 'Rhombus' ? { value: 'Square', why: 'All four sides are congruent, but adjacent sides are not perpendicular, so it is not a square.' } : { value: 'Rhombus', why: 'Adjacent sides have different lengths, so it is not a rhombus.' },
        'Square',
        'Rectangle',
        'Rhombus',
        'Parallelogram',
      ],
      solution: [
        R`Slopes: \(\overline{AB}\) and \(\overline{DC}\) both have slope \(${slope(u)}\); \(\overline{BC}\) and \(\overline{AD}\) both have slope \(${slope(v)}\). Both pairs of opposite sides are parallel, so \(ABCD\) is a parallelogram.`,
        R`Lengths: \(AB = \sqrt{${u[0] ** 2} + ${u[1] ** 2}} = \sqrt{${lu}}\) and \(BC = \sqrt{${v[0] ** 2} + ${v[1] ** 2}} = \sqrt{${lv}}\), so adjacent sides are ${lu === lv ? 'congruent' : 'not congruent'}.`,
        dot === 0 ? R`The slopes \(${slope(u)}\) and \(${slope(v)}\) are negative reciprocals (their product is \(-1\)), so adjacent sides are perpendicular.` : R`The product of the slopes \(${slope(u)}\) and \(${slope(v)}\) is not \(-1\), so adjacent sides are not perpendicular.`,
        `${lu === lv ? 'Four congruent sides' : 'Sides of two different lengths'} and ${dot === 0 ? 'right angles' : 'no right angles'}: the most specific name is ${kind.toLowerCase()}.`,
      ],
      rule: 6,
      skill: 'classifying quadrilaterals',
      check: () => {
        const d = (i, j) => dist(pts[i], pts[j]);
        const parallelogram = Math.abs(d(0, 1) - d(3, 2)) < 1e-9 && Math.abs(d(1, 2) - d(0, 3)) < 1e-9;
        const equalSides = Math.abs(d(0, 1) - d(1, 2)) < 1e-9;
        const equalDiagonals = Math.abs(d(0, 2) - d(1, 3)) < 1e-9; // a parallelogram with congruent diagonals is a rectangle
        const got = equalDiagonals ? (equalSides ? 'Square' : 'Rectangle') : equalSides ? 'Rhombus' : 'Parallelogram';
        return parallelogram && got === kind ? true : `the points form a ${got}`;
      },
    });
  }
}

// ───────────── Challenge ─────────────

function challengeFindN(rng) {
  const kind = rng.pick(['ratio', 'difference', 'sum']);
  if (kind === 'ratio') {
    const k = rng.pick([2, 3, 4, 5, 8, 9, 11, 14, 17]);
    const n = 2 * (k + 1);
    return q({
      prompt: R`Each interior angle of a regular polygon is \(${k}\) times as large as each exterior angle. How many sides does the polygon have?`,
      correct: n,
      wrong: [{ value: k + 1, why: R`\(${k + 1}\) exterior angles make \(180^\circ\). All the exterior angles together make \(360^\circ\).` }, { value: 2 * k, why: R`An interior angle and its exterior angle add to \(180^\circ\), so \(${k}e + e = 180\), not \(${k}e = 180\).` }, n + 2, n - 1, k + 2],
      solution: [
        R`Let each exterior angle be \(e\). Then each interior angle is \(${k}e\), and together they make a straight angle: \(${k}e + e = 180\).`,
        R`\(${k + 1}e = 180\), so \(e = ${180 / (k + 1)}\) degrees.`,
        R`The exterior angles add to \(360^\circ\), so the number of sides is \(\dfrac{360}{${180 / (k + 1)}} = ${n}\).`,
      ],
      rule: 1,
      skill: 'regular polygons',
      check: () => (Math.abs(((n - 2) * 180) / n - (k * 360) / n) < 1e-9 ? true : 'interior angle is not k times the exterior angle'),
    });
  }
  if (kind === 'difference') {
    const n = rng.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24]);
    const e = 360 / n;
    const d = 180 - 2 * e;
    return q({
      prompt: R`Each interior angle of a regular polygon is \(${deg(d)}\) larger than each exterior angle. How many sides does the polygon have?`,
      correct: n,
      wrong: [{ value: posInt(360 / d), why: R`\(${deg(d)}\) is the difference between the two angles, not the exterior angle itself. Use interior \(+\) exterior \(= 180^\circ\) to find the exterior angle.` }, { value: posInt(180 / e), why: R`The exterior angles add to \(360^\circ\), not \(180^\circ\).` }, n + 2, n - 1, n + 1, 2 * n],
      solution: [
        R`Let each exterior angle be \(e\). Then each interior angle is \(e + ${d}\), and together they make \(180^\circ\): \(e + (e + ${d}) = 180\).`,
        R`\(2e = ${180 - d}\), so \(e = ${e}\) degrees.`,
        R`The number of sides is \(\dfrac{360}{${e}} = ${n}\).`,
      ],
      rule: 1,
      skill: 'regular polygons',
      check: () => (Math.abs(((n - 2) * 180) / n - 360 / n - d) < 1e-9 ? true : 'angles do not differ by d'),
    });
  }
  const n = rng.int(11, 30);
  const S = (n - 2) * 180;
  return q({
    prompt: R`The interior angles of a polygon add up to \(${num(S)}^\circ\). How many sides does the polygon have?`,
    correct: n,
    wrong: [{ value: n - 2, why: R`\(${n - 2}\) is the number of triangles the polygon splits into. The number of sides is \(2\) more.` }, { value: n - 1, why: R`Solve \((n - 2) \cdot 180 = ${num(S)}\): after dividing by \(180\), add \(2\).` }, n + 2, n + 1, n - 4],
    solution: [R`\((n - 2) \cdot 180 = ${num(S)}\).`, R`Divide by \(180\): \(n - 2 = ${n - 2}\).`, R`\(n = ${n}\).`],
    rule: 0,
    skill: 'interior angle sum',
    check: () => ((n - 2) * 180 === S ? true : 'sides do not give this sum'),
  });
}

function challengeTrapezoidAlgebra(rng) {
  for (;;) {
    const top = rng.int(4, 20);
    const bottom = top + 2 * rng.int(2, 10);
    const m = (top + bottom) / 2;
    const x = rng.int(2, 9);
    const a1 = rng.int(1, 4);
    const a2 = rng.int(1, 5);
    const b1 = top - a1 * x;
    const b2 = bottom - a2 * x;
    if (b1 === 0 || b2 === 0 || Math.abs(b1) > 20 || Math.abs(b2) > 20) continue;
    const slipX = (m - b1 - b2) % (a1 + a2) === 0 ? (m - b1 - b2) / (a1 + a2) : null;
    const slip = slipX != null && slipX > 0 ? a2 * slipX + b2 : null;
    const { M, N, ...visual } = trapFigure(bottom, top, ['', '', `${m}`], `A trapezoid with a longer base on the bottom, a shorter parallel base on top, and a midsegment of length ${m} joining the midpoints of the legs.`);
    return q({
      prompt: R`The bases of a trapezoid are \(${linear(a1, b1)}\) and \(${linear(a2, b2)}\) centimetres long, and its midsegment is \(${m}\) cm long. How long is the **longer** base?`,
      visual,
      correct: bottom,
      unit: 'cm',
      wrong: [
        slip != null && slip > 0 && slip !== bottom ? { value: slip, why: R`The midsegment is half the sum of the bases, so the bases add to \(2 \cdot ${m} = ${2 * m}\), not \(${m}\).` } : null,
        { value: top, why: 'That is the shorter base.' },
        { value: x, why: R`That is the value of \(x\). Substitute it into the expressions for the bases.` },
        2 * m,
        bottom + 4,
      ],
      solution: [
        R`The midsegment is the average of the bases: \(\dfrac{(${linear(a1, b1)}) + (${linear(a2, b2)})}{2} = ${m}\).`,
        R`Multiply by \(2\) and combine like terms: \(${linear(a1 + a2, b1 + b2)} = ${2 * m}\), so \(${a1 + a2}x = ${2 * m - b1 - b2}\) and \(x = ${x}\).`,
        R`The bases are \(${top}\) cm and \(${bottom}\) cm. The longer one is \(${bottom}\) cm.`,
      ],
      rule: 4,
      skill: 'trapezoid midsegment',
      check: () => (a1 * x + b1 + a2 * x + b2 === 2 * m && Math.abs(dist(M, N) - m) < 1e-6 ? true : 'bases do not average to the midsegment'),
    });
  }
}

const ALWAYS = [
  ['Every square is a rhombus.', 'A square has four congruent sides, which is all a rhombus needs.'],
  ['Every square is a rectangle.', 'A square has four right angles, which is all a rectangle needs.'],
  ['Every rectangle is a parallelogram.', 'In a rectangle both pairs of opposite sides are parallel.'],
  ['Every rhombus is a parallelogram.', 'In a rhombus both pairs of opposite sides are parallel.'],
  ['A parallelogram with perpendicular diagonals is a rhombus.', 'Perpendicular diagonals that bisect each other make four congruent right triangles, so all four sides are congruent.'],
  ['A parallelogram with congruent diagonals is a rectangle.', 'Congruent diagonals make the two triangles on a shared side congruent (SSS), so consecutive angles are congruent and supplementary: right angles.'],
  ['A rhombus with one right angle is a square.', 'Consecutive angles are supplementary and opposite angles are congruent, so one right angle forces four.'],
  ['The diagonals of a parallelogram bisect each other.', 'This is a property of every parallelogram.'],
  ['The diagonals of a rhombus are perpendicular.', 'This is a property of every rhombus.'],
  ['The diagonals of a rectangle are congruent.', 'This is a property of every rectangle.'],
];
const NOT_ALWAYS = [
  ['Every rhombus is a square.', 'A rhombus does not need right angles.'],
  ['Every rectangle is a square.', 'A rectangle does not need four congruent sides.'],
  ['Every parallelogram is a rectangle.', 'A parallelogram does not need right angles.'],
  ['Every parallelogram is a rhombus.', 'A parallelogram can have sides of two different lengths.'],
  ['The diagonals of a rectangle are perpendicular.', 'That happens only when the rectangle is a square.'],
  ['The diagonals of a rhombus are congruent.', 'That happens only when the rhombus is a square.'],
  ['The diagonals of a parallelogram are congruent.', 'That happens only when the parallelogram is a rectangle.'],
  ['A quadrilateral with four congruent sides is a square.', 'It must be a rhombus, but it does not need right angles.'],
  ['A quadrilateral with congruent diagonals is a rectangle.', 'An isosceles trapezoid also has congruent diagonals.'],
  ['A quadrilateral with perpendicular diagonals is a rhombus.', 'A kite also has perpendicular diagonals.'],
  ['Opposite angles of a parallelogram are supplementary.', 'They are congruent. They are supplementary only in a rectangle.'],
  ['A quadrilateral with one pair of parallel sides is a parallelogram.', 'A parallelogram needs two pairs of parallel sides.'],
];

function challengeTrueStatement(rng) {
  if (rng.bool()) {
    const [right, why] = rng.pick(ALWAYS);
    const wrong = rng.sample(NOT_ALWAYS, 3);
    return q({
      prompt: 'Which statement is always true?',
      correct: right,
      wrong: wrong.map(([s, w]) => ({ value: s, why: w })),
      solution: [`"${right}" is always true. ${why}`, `The others can fail: ${wrong.map(([s, w]) => `"${s}" ${w}`).join(' ')}`],
      rule: 3,
      skill: 'classifying quadrilaterals',
    });
  }
  const [right, why] = rng.pick(NOT_ALWAYS);
  const wrong = rng.sample(ALWAYS, 3);
  return q({
    prompt: 'Which statement is **not** always true?',
    correct: right,
    wrong: wrong.map(([s, w]) => ({ value: s, why: `This one is always true. ${w}` })),
    solution: [`"${right}" can be false. ${why}`, 'Each of the other statements holds for every figure of that kind.'],
    rule: 3,
    skill: 'classifying quadrilaterals',
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'quadrilaterals-polygons',
  title: 'Quadrilaterals & Polygons',
  summary: 'Find angles of polygons, use the properties of special quadrilaterals to find unknowns, and classify quadrilaterals.',
  standards: ['CCSS G-CO.C.11', 'CCSS G-GPE.B.4'],

  explain: {
    intro: R`A polygon's angles follow simple rules that depend only on its number of sides. Quadrilaterals come in families: a parallelogram has two pairs of parallel sides, and rectangles, rhombuses and squares are parallelograms with extra features. Each family has its own facts about sides, angles and diagonals, and those facts turn pictures into equations.`,
    rules: [
      {
        title: 'Interior angle sum',
        text: R`Diagonals from one vertex cut a polygon with \(n\) sides into \(n - 2\) triangles, so its interior angles add to \((n - 2) \cdot 180^\circ\).`,
        example: R`A hexagon: \((6 - 2) \cdot 180 = 720^\circ\).`,
      },
      {
        title: 'Exterior angles and regular polygons',
        text: R`The exterior angles of any convex polygon, one at each vertex, add to \(360^\circ\). In a **regular** polygon all sides and all angles are congruent, so each exterior angle is \(\frac{360^\circ}{n}\) and each interior angle is \(180^\circ\) minus that.`,
        example: R`A regular octagon: each exterior angle is \(\frac{360}{8} = 45^\circ\) and each interior angle is \(135^\circ\).`,
      },
      {
        title: 'Parallelograms',
        text: R`In every parallelogram: opposite sides are congruent, opposite angles are congruent, consecutive angles are supplementary, and the diagonals bisect each other.`,
        example: R`If \(m\angle A = 70^\circ\) in parallelogram \(ABCD\), then \(m\angle C = 70^\circ\) and \(m\angle B = m\angle D = 110^\circ\).`,
      },
      {
        title: 'Rectangles, rhombuses and squares',
        text: R`A **rectangle** is a parallelogram with four right angles; its diagonals are congruent. A **rhombus** is a parallelogram with four congruent sides; its diagonals are perpendicular and bisect its angles. A **square** is both, so it has every one of these properties.`,
        example: R`A rhombus with diagonals \(6\) and \(8\) is cut into four right triangles with legs \(3\) and \(4\), so each side is \(5\).`,
      },
      {
        title: 'Trapezoids',
        text: R`A trapezoid has exactly one pair of parallel sides, its **bases**. The two angles along each leg are supplementary. The **midsegment** joins the midpoints of the legs; it is parallel to the bases and its length is their average. In an isosceles trapezoid the legs, the base angles and the diagonals are congruent.`,
        example: R`Bases \(10\) and \(16\): midsegment \(\frac{10 + 16}{2} = 13\).`,
      },
      {
        title: 'Kites',
        text: R`A kite has two pairs of congruent sides that are next to each other. Its diagonals are perpendicular, and the two angles between sides of different lengths are congruent.`,
        example: R`A kite with the other two angles \(100^\circ\) and \(40^\circ\): each of the congruent angles is \(\frac{360 - 140}{2} = 110^\circ\).`,
      },
      {
        title: 'Classifying a quadrilateral',
        text: R`Check sides and angles in order. Two pairs of parallel sides (equal slopes): parallelogram. Then four congruent sides: rhombus. Right angles (slopes that are negative reciprocals): rectangle. Both: square. Always give the most specific name that fits.`,
        example: R`Vertices \((0, 0), (3, 1), (2, 4), (-1, 3)\): all sides have length \(\sqrt{10}\) and adjacent slopes are \(\frac{1}{3}\) and \(-3\), so it is a square.`,
      },
    ],
    vocab: [
      { term: 'regular polygon', def: 'A polygon whose sides are all congruent and whose angles are all congruent.' },
      { term: 'consecutive angles', def: 'Two angles of a polygon that share a side.' },
      { term: 'diagonal', def: 'A segment joining two vertices of a polygon that are not next to each other.' },
      { term: 'bases and legs', def: 'In a trapezoid, the bases are the parallel sides and the legs are the other two sides.' },
    ],
    mistakes: [
      R`Using \(n \cdot 180^\circ\) for the angle sum. Subtract \(2\) first: \((n - 2) \cdot 180^\circ\).`,
      'Setting consecutive angles of a parallelogram equal. They are supplementary; opposite angles are the congruent ones.',
      'Using the whole diagonals as the legs of the right triangles in a rhombus. The diagonals bisect each other, so use half of each.',
      'Stopping at "parallelogram" when the figure is also a rectangle, a rhombus or a square.',
    ],
    visual: {
      type: 'table',
      caption: 'Which properties each kind of parallelogram always has',
      headers: ['Property', 'Parallelogram', 'Rectangle', 'Rhombus', 'Square'],
      rows: [
        ['Opposite sides parallel and congruent', '✓', '✓', '✓', '✓'],
        ['Opposite angles congruent', '✓', '✓', '✓', '✓'],
        ['Diagonals bisect each other', '✓', '✓', '✓', '✓'],
        ['Four right angles', '–', '✓', '–', '✓'],
        ['Diagonals congruent', '–', '✓', '–', '✓'],
        ['Four congruent sides', '–', '–', '✓', '✓'],
        ['Diagonals perpendicular', '–', '–', '✓', '✓'],
      ],
      rowHeaders: true,
    },
  },

  examples: [
    {
      title: 'Angles of a regular octagon',
      problem: R`Find the sum of the interior angles of an octagon, and the measure of each interior and exterior angle of a regular octagon.`,
      steps: [
        R`Angle sum: \((8 - 2) \cdot 180 = 1080^\circ\).`,
        R`In a regular octagon the eight angles are congruent: \(\frac{1080}{8} = 135^\circ\) each.`,
        R`Each exterior angle is the supplement: \(180 - 135 = 45^\circ\). Check: \(8 \cdot 45 = 360\). ✓`,
      ],
      answer: R`Sum \(1080^\circ\); each interior angle \(135^\circ\); each exterior angle \(45^\circ\)`,
      visual: { type: 'polygon', points: ngon(8), angles: ['', '', '', '', '135°', '', '', ''], extra: Array.from({ length: 5 }, (_, i) => ({ from: ngon(8)[0], to: ngon(8)[i + 2] })), alt: 'A regular octagon. Dashed diagonals from one vertex split it into 6 triangles. One interior angle is marked 135 degrees.' },
    },
    {
      title: 'A parallelogram with algebra',
      problem: R`In parallelogram \(ABCD\), \(m\angle A = (3x + 10)^\circ\) and \(m\angle B = (5x - 30)^\circ\). Find all four angles.`,
      steps: [
        R`\(\angle A\) and \(\angle B\) are consecutive angles, so they are supplementary: \((3x + 10) + (5x - 30) = 180\).`,
        R`\(8x - 20 = 180\), so \(8x = 200\) and \(x = 25\).`,
        R`\(m\angle A = 3(25) + 10 = 85^\circ\) and \(m\angle B = 5(25) - 30 = 95^\circ\).`,
        R`Opposite angles are congruent: \(m\angle C = 85^\circ\) and \(m\angle D = 95^\circ\).`,
      ],
      answer: R`\(85^\circ, 95^\circ, 85^\circ, 95^\circ\)`,
      visual: { type: 'polygon', points: para(7, 4.5, 85), vertices: ['A', 'B', 'C', 'D'], angles: ['85°', '95°', '85°', '95°'], alt: 'Parallelogram ABCD with angles of 85 degrees at A and C and 95 degrees at B and D.' },
    },
    {
      title: 'Classify from coordinates',
      problem: R`Quadrilateral \(ABCD\) has vertices \(A(-2, -1)\), \(B(4, 1)\), \(C(3, 4)\) and \(D(-3, 2)\). What is its most specific name?`,
      steps: [
        R`Slopes: \(\overline{AB}\): \(\frac{1 - (-1)}{4 - (-2)} = \frac{1}{3}\). \(\overline{DC}\): \(\frac{4 - 2}{3 - (-3)} = \frac{1}{3}\). \(\overline{BC}\): \(\frac{4 - 1}{3 - 4} = -3\). \(\overline{AD}\): \(\frac{2 - (-1)}{-3 - (-2)} = -3\).`,
        R`Both pairs of opposite sides are parallel, so it is a parallelogram. The slopes \(\frac{1}{3}\) and \(-3\) are negative reciprocals, so the angles are right angles: a rectangle.`,
        R`Lengths: \(AB = \sqrt{6^2 + 2^2} = \sqrt{40}\) and \(BC = \sqrt{1^2 + 3^2} = \sqrt{10}\). Adjacent sides are not congruent, so it is not a square.`,
      ],
      answer: 'A rectangle',
      visual: { type: 'plot', x: [-5, 5], y: [-5, 5], square: true, step: [1, 1], polygons: [{ points: [[-2, -1], [4, 1], [3, 4], [-3, 2]] }], points: [{ x: -2, y: -1, label: 'A' }, { x: 4, y: 1, label: 'B' }, { x: 3, y: 4, label: 'C' }, { x: -3, y: 2, label: 'D' }], alt: 'Quadrilateral ABCD on the coordinate plane with vertices A(−2, −1), B(4, 1), C(3, 4) and D(−3, 2).' },
    },
    {
      title: 'Word problem: a rhombus-shaped kite frame',
      word: true,
      problem: R`Tariq builds a frame in the shape of a rhombus from four equal rods. The two cross-braces along its diagonals are \(24\) cm and \(32\) cm long. How long is each rod?`,
      steps: [
        R`The diagonals of a rhombus are perpendicular and bisect each other, so they split the frame into four right triangles.`,
        R`The legs of each triangle are half of each diagonal: \(12\) cm and \(16\) cm.`,
        R`Each rod is a hypotenuse: \(\sqrt{12^2 + 16^2} = \sqrt{400} = 20\) cm.`,
      ],
      answer: 'Each rod is 20 cm long.',
      visual: rhombus(32, 24, 'A rhombus with dashed diagonals of 32 cm (horizontal) and 24 cm (vertical) crossing at right angles at their midpoints.'),
    },
  ],

  models: [
    {
      id: 'polygon-angles',
      title: 'Angles of a polygon',
      intro: 'Choose the number of sides. See the angle sum, and each angle if the polygon is regular.',
      inputs: [{ name: 'n', label: 'Number of sides', type: 'int', min: 3, max: 60, value: 8 }],
      compute({ n }) {
        const S = (n - 2) * 180;
        const ext = 360 / n;
        const two = (v) => num(v, { places: 2 });
        const whole = Number.isInteger(ext);
        return {
          problem: R`A polygon has \(${n}\) sides. Find the sum of its interior angles, and each interior and exterior angle if it is regular.`,
          steps: [
            R`Diagonals from one vertex make \(${n} - 2 = ${n - 2}\) triangles, so the interior angles add to \(${n - 2} \cdot 180 = ${num(S)}\) degrees.`,
            R`If the polygon is regular, each exterior angle is \(\dfrac{360}{${n}} ${whole ? '=' : R`\approx`} ${two(ext)}\) degrees.`,
            R`Each interior angle is \(180 - ${two(ext)} ${whole ? '=' : R`\approx`} ${two(180 - ext)}\) degrees. (Check: \(\dfrac{${num(S)}}{${n}} ${whole ? '=' : R`\approx`} ${two(S / n)}\).)`,
          ],
          answer: R`Sum \(${num(S)}^\circ\); regular: interior \(${whole ? '' : R`\approx `}${two(180 - ext)}^\circ\), exterior \(${whole ? '' : R`\approx `}${two(ext)}^\circ\)`,
          visual: n <= 24 ? { type: 'polygon', points: ngon(n), extra: Array.from({ length: n - 3 }, (_, i) => ({ from: ngon(n)[0], to: ngon(n)[i + 2] })), alt: `A regular polygon with ${n} sides. Dashed diagonals from one vertex split it into ${n - 2} triangles.` } : undefined,
          note: n > 24 ? 'With this many sides the polygon looks almost like a circle, so no picture is drawn.' : undefined,
        };
      },
    },
    {
      id: 'rhombus-window',
      title: 'Word problem: a rhombus-shaped window',
      word: true,
      intro: 'Change the lengths of the two diagonals.',
      inputs: [
        { name: 'd1', label: 'Horizontal diagonal (cm)', type: 'int', min: 2, max: 200, value: 48 },
        { name: 'd2', label: 'Vertical diagonal (cm)', type: 'int', min: 2, max: 200, value: 20 },
      ],
      compute({ d1, d2 }) {
        const h1 = d1 / 2;
        const h2 = d2 / 2;
        const s2 = h1 * h1 + h2 * h2;
        const s = Math.sqrt(s2);
        const exact = Number.isInteger(s);
        const two = (v) => num(v, { places: 2 });
        return {
          problem: R`A window has the shape of a rhombus. Its diagonals are \(${d1}\) cm and \(${d2}\) cm long. How long is each side, how much trim goes around it, and how much glass does it need?`,
          steps: [
            R`The diagonals of a rhombus are perpendicular and bisect each other. They make four right triangles with legs \(${num(h1)}\) cm and \(${num(h2)}\) cm.`,
            R`Each side is a hypotenuse: \(\sqrt{${num(h1)}^2 + ${num(h2)}^2} = \sqrt{${num(s2)}} ${exact ? '=' : R`\approx`} ${two(s)}\) cm.`,
            R`Trim (perimeter): \(4 \cdot ${two(s)} ${exact ? '=' : R`\approx`} ${two(4 * s)}\) cm.`,
            R`Glass (area): four triangles, each \(\frac{1}{2} \cdot ${num(h1)} \cdot ${num(h2)} = ${num((h1 * h2) / 2)}\) cm², so \(${num(2 * h1 * h2)}\) cm² in all. That is half the product of the diagonals.`,
          ],
          answer: R`Side \(${exact ? '' : R`\approx `}${two(s)}\) cm; trim \(${exact ? '' : R`\approx `}${two(4 * s)}\) cm; glass \(${num(2 * h1 * h2)}\) cm²`,
          visual: rhombus(d1, d2, `A rhombus with dashed diagonals of ${d1} cm (horizontal) and ${d2} cm (vertical) crossing at right angles at their midpoints.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyAngleSum, easyParallelogramAngle, easyProperty],
    medium: [mediumRegular, mediumParallelogramAlgebra, mediumMidsegment],
    hard: [hardSpecialQuads, hardPolygonAlgebra, hardClassifyCoordinates],
    challenge: [challengeFindN, challengeTrapezoidAlgebra, challengeTrueStatement],
  },
};
