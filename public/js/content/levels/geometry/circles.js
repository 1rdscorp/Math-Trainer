import { R, q, m, num, round, frac, linear, terms, point, paren, simplifySqrt, sqrtTex, isSquare, close } from '../../lib/index.js';
import { deg, degM, degT, T, piTex, piT, rad, toDeg, dist, angleAt, shoelace, triSSS, triAA, ring, rightMark, labelAt, TRIPLES, LENGTH_UNITS } from './_shared.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
// Whole-number right triangles whose legs are not too lopsided to draw clearly.
const DRAWABLE = TRIPLES.filter(([a, b]) => a / b >= 0.4);
const ANGLES = [30, 40, 45, 60, 72, 80, 90, 100, 120, 135, 150, 160, 210, 240, 270];
// Central angles as fractions of π radians.
const TURNS = [[1, 6], [1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [5, 6], [5, 4], [4, 3], [3, 2]];

/** A multiple of π with a unit, as a finished answer choice. */
const piFmt = (unit) => (v) => R`\(${piTex(v)}\) ${unit}`;
const ptT = (x, y) => `(${T(x)}, ${T(y)})`;
/** (x − h)² for a whole number h, written with the right sign: sq(3, 'x') → "(x - 3)^2", sq(0, 'x') → "x^2". */
const sq = (v, x) => (v === 0 ? `${x}^2` : `(${linear(1, -v, x)})^2`);
const circleEq = (h, k, rhs) => `${sq(h, 'x')} + ${sq(k, 'y')} = ${rhs}`;
const centreRadius = (h, k, rTex) => R`centre \(${point(h, k)}\), radius \(${rTex}\)`;
const SIGNS = R`The equation uses \(x - h\) and \(y - k\), so the numbers in the brackets have the opposite signs to the centre's coordinates.`;

/** √(n/d) for a positive Frac, simplified: 25/4 → "\frac{5}{2}", 13/2 → "\frac{\sqrt{26}}{2}", 12 → "2\sqrt{3}". */
function sqrtFracTex(f) {
  const { coef, rad: inside } = simplifySqrt(f.n * f.d);
  const c = frac(coef, f.d);
  if (inside === 1) return c.tex();
  const top = `${c.n === 1 ? '' : c.n}\\sqrt{${inside}}`;
  return c.d === 1 ? top : `\\frac{${top}}{${c.d}}`;
}

// ───────────── checks ─────────────

/** Arc length and sector area measured on a many-sided polygon, so a check does not lean on the formulas. */
function measureSector(r, degrees) {
  const n = 4000;
  const pts = [[0, 0]];
  for (let i = 0; i <= n; i++) pts.push([r * Math.cos(rad((degrees * i) / n)), r * Math.sin(rad((degrees * i) / n))]);
  let len = 0;
  for (let i = 1; i <= n; i++) len += dist(pts[i], pts[i + 1]);
  return { len, area: shoelace(pts) };
}

/** Reads the centre and r² back out of a printed equation such as "(x - 3)^2 + y^2 = 25", so a check tests what the student sees. */
function readCircle(tex) {
  const part = (v) => {
    const hit = tex.match(new RegExp(`\\(${v} ([+-]) (\\d+)\\)\\^2`));
    return hit ? (hit[1] === '-' ? 1 : -1) * Number(hit[2]) : tex.includes(`${v}^2`) ? 0 : NaN;
  };
  return { h: part('x'), k: part('y'), r2: Number((tex.match(/= (\d+)/) ?? [])[1]) };
}

// ───────────── figures (all drawn to scale) ─────────────

/**
 * Circle O with the tangent segment PT touching it at T, the top of the circle: OT = r and TP = t.
 * The label for OP sits beside the longer of its two parts (inside or outside the circle), clear of the circle itself.
 */
function tangentFigure(r, t, { ot = '', tp = '', po, angles, right } = {}, alt) {
  const c = Math.hypot(r, t);
  const X = [(t * r) / c, (r * r) / c]; // where OP crosses the circle
  const extra = ring(0, 0, r);
  if (po) extra.push(r >= c - r ? { from: [0, 0], to: X, dashed: false, label: po } : { from: X, to: [t, r], dashed: false, label: po });
  return { type: 'polygon', points: [[0, 0], [0, r], [t, r]], vertices: ['O', 'T', 'P'], sides: [ot, tp, ''], angles, right: right ? [1] : undefined, extra, alt };
}

/** Circle O of radius r with a horizontal chord AB at distance d below the centre; the perpendicular from O is dashed. */
function chordFigure(r, d, half, { oa = '', ab = '', om } = {}, alt) {
  const M = [0, -d];
  return { type: 'polygon', points: [[0, 0], [-half, -d], [half, -d]], vertices: ['O', 'A', 'B'], sides: [oa, ab, ''], extra: [{ from: [0, 0], to: M, label: om }, ...rightMark([0, 0], M, [half, -d], 0.07 * r), ...ring(0, 0, r)], alt };
}

/**
 * Triangle ABC inscribed in the circle whose diameter is AB (A and B on the x-axis). The labels for AC and BC
 * go inside the triangle, because the circle leaves little room outside those sides.
 */
function semicircleFigure(pts, { ab = '', ac, bc, angles } = {}, alt) {
  const [A, B, C] = pts;
  const c = [(A[0] + B[0]) / 2, 0];
  const extra = ring(c[0], 0, c[0] - A[0]);
  if (ac) extra.push({ from: A, to: C, dashed: false, label: ac });
  if (bc) extra.push({ from: C, to: B, dashed: false, label: bc });
  if (!ab) extra.push(labelAt(c, B, 'O'));
  return { type: 'polygon', points: pts, vertices: ['A', 'B', 'C'], sides: [ab, '', ''], angles, extra, alt };
}

/** Triangle ABC whose sides touch a circle at D (on AB), E (on BC) and F (on CA); x, y, z are the tangent lengths from A, B, C. */
function incircle(x, y, z) {
  const [A, B, C] = triSSS(y + z, z + x, x + y);
  const along = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
  const D = along(A, B, x / (x + y));
  const radius = Math.sqrt((x * y * z) / (x + y + z));
  return { A, B, C, D, E: along(B, C, y / (y + z)), F: along(C, A, z / (z + x)), centre: [D[0], radius], radius };
}

function incircleFigure(x, y, z, sides, alt) {
  const g = incircle(x, y, z);
  const G = [(g.A[0] + g.B[0] + g.C[0]) / 3, (g.A[1] + g.B[1] + g.C[1]) / 3];
  // D, E and F are nudged a hair outwards so that the picture puts their names outside the triangle.
  const out = (P) => [P[0] + ((P[0] - G[0]) * 0.004) / dist(P, G), P[1] + ((P[1] - G[1]) * 0.004) / dist(P, G)];
  return { type: 'polygon', points: [g.A, out(g.D), g.B, out(g.E), g.C, out(g.F)], vertices: ['A', 'D', 'B', 'E', 'C', 'F'], sides, extra: ring(g.centre[0], g.centre[1], g.radius), alt };
}

/** A circle on the coordinate plane, in a window centred on the origin. */
function circlePlot(h, k, r, more, alt) {
  const L = Math.ceil(Math.max(Math.abs(h), Math.abs(k)) + r + 1);
  return { type: 'plot', x: [-L, L], y: [-L, L], square: true, step: L <= 10 ? [1, 1] : L <= 20 ? [2, 2] : [5, 5], param: [{ x: (t) => h + r * Math.cos(t), y: (t) => k + r * Math.sin(t), t: [0, 2 * Math.PI] }], ...more, alt };
}

// ───────────── Easy ─────────────

function easyCircumferenceArea(rng) {
  const r = rng.int(3, 12);
  const d = 2 * r;
  const u = rng.pick(LENGTH_UNITS);
  const giveD = rng.bool();
  const wantArea = rng.bool();
  return q({
    prompt: R`A circle has a ${giveD ? R`diameter of \(${d}\)` : R`radius of \(${r}\)`} ${u}. What is its ${wantArea ? 'area' : 'circumference'}? Leave \(\pi\) in the answer.`,
    visual: { type: 'circle', ...(giveD ? { diameter: `${d} ${u}` } : { radius: `${r} ${u}` }), alt: `A circle with a ${giveD ? `diameter of ${d}` : `radius of ${r}`} ${u}.` },
    correct: wantArea ? r * r : d,
    fmt: piFmt(wantArea ? `${u}²` : u),
    wrong: wantArea
      ? [
          { value: d, why: R`That is the circumference, \(2\pi r\). The area is \(\pi r^2\).` },
          giveD ? { value: d * d, why: 'That squares the diameter. Halve the diameter to get the radius, then square the radius.' } : { value: r, why: R`The radius has to be squared: the area is \(\pi r^2\), not \(\pi r\).` },
          2 * r * r,
          giveD ? r : d * d,
        ]
      : [
          { value: r * r, why: R`That is the area, \(\pi r^2\). The circumference is \(2\pi r\), which is the same as \(\pi d\).` },
          giveD ? { value: 2 * d, why: R`\(C = \pi d\) already uses the whole diameter. Doubling is for when you start from the radius.` } : { value: r, why: R`\(\pi r\) only goes half way round. The circumference is \(2\pi r\).` },
          giveD ? r : 2 * d,
          2 * r * r,
        ],
    solution: wantArea
      ? [giveD ? R`The area formula uses the radius, which is half the diameter: \(r = ${d} \div 2 = ${r}\) ${u}.` : R`The area of a circle is \(A = \pi r^2\), and here \(r = ${r}\) ${u}.`, R`\(A = \pi r^2 = \pi (${r})^2 = ${r * r}\pi\) ${u}².`]
      : [giveD ? R`The circumference is \(\pi\) times the diameter: \(C = \pi d\).` : R`The circumference of a circle is \(C = 2\pi r\), and here \(r = ${r}\) ${u}.`, giveD ? R`\(C = \pi (${d}) = ${d}\pi\) ${u}.` : R`\(C = 2\pi (${r}) = ${d}\pi\) ${u}.`],
    rule: 0,
    skill: 'circumference and area',
    check: () => {
      const whole = measureSector(r, 360);
      return close((wantArea ? r * r : d) * Math.PI, wantArea ? whole.area : whole.len, 1e-5) ? true : 'does not match the circle measured as a many-sided polygon';
    },
  });
}

function easyCentralInscribed(rng) {
  const c = 2 * rng.int(40, 80); // central angle AOB (the picture's label for the inscribed angle needs at least 40°)
  const i = c / 2; // inscribed angle ACB
  const start = rng.pick([-30, -10, 10, 30, 50]);
  const vertex = start + i + 180 + rng.pick([-25, 0, 25]);
  const kind = rng.pick(['inscribed', 'central', 'arc']);
  const spec = {
    inscribed: {
      prompt: R`In circle \(O\), central angle \(AOB\) measures \(${deg(c)}\). Point \(C\) is on the major arc \(AB\). What is \(m\angle ACB\)?`,
      ans: i,
      wrong: [
        { value: c, why: R`The two angles would be equal only if \(C\) were at the centre. An inscribed angle is half the central angle that cuts off the same arc.` },
        c <= 90 ? { value: 2 * c, why: 'The inscribed angle is half of the central angle, not double it.' } : 180 - i,
        180 - c,
        i + 10,
      ],
      steps: [R`\(\angle AOB\) is a central angle and \(\angle ACB\) is an inscribed angle. Both cut off the same arc \(AB\).`, R`An inscribed angle is half the central angle on the same arc: \(m\angle ACB = \frac{1}{2}(${deg(c)}) = ${deg(i)}\).`],
    },
    central: {
      prompt: R`In circle \(O\), inscribed angle \(ACB\) measures \(${deg(i)}\). What is the measure of central angle \(AOB\)?`,
      ans: c,
      wrong: [
        { value: i, why: 'A central angle is twice any inscribed angle that cuts off the same arc.' },
        { value: i / 2, why: 'The central angle is double the inscribed angle, not half of it.' },
        180 - i,
        c + 10,
      ],
      steps: [R`\(\angle ACB\) is an inscribed angle and \(\angle AOB\) is the central angle that cuts off the same arc \(AB\).`, R`The central angle is twice the inscribed angle: \(m\angle AOB = 2(${deg(i)}) = ${deg(c)}\).`],
    },
    arc: {
      prompt: R`Points \(A\), \(B\) and \(C\) are on circle \(O\), and inscribed angle \(ACB\) measures \(${deg(i)}\). What is the measure of the arc \(AB\) that the angle intercepts?`,
      ans: c,
      wrong: [
        { value: i, why: 'An arc has the same measure as its central angle. An inscribed angle is only half of that.' },
        { value: 360 - c, why: R`That is the other arc from \(A\) to \(B\), the one that passes through \(C\).` },
        i / 2,
        180 - i,
      ],
      steps: [R`An inscribed angle is half the measure of its intercepted arc, so the arc is twice the angle.`, R`Arc \(AB = 2(${deg(i)}) = ${deg(c)}\).`],
    },
  }[kind];
  return q({
    prompt: spec.prompt,
    visual: {
      type: 'circle',
      center: 'O',
      central: kind === 'arc' ? undefined : { start, end: start + c, label: kind === 'central' ? 'x' : degT(c) },
      inscribed: { vertex, start, end: start + c, label: kind === 'inscribed' ? 'x' : degT(i) },
      points: [{ deg: start, label: 'A' }, { deg: start + c, label: 'B' }, { deg: vertex, label: 'C' }],
      alt: `A circle with centre O and points A, B and C on it. C lies on the major arc AB. ${kind === 'inscribed' ? `Central angle AOB is ${c} degrees and inscribed angle ACB is marked x.` : kind === 'central' ? `Inscribed angle ACB is ${i} degrees and central angle AOB is marked x.` : `Inscribed angle ACB is ${i} degrees.`}`,
    },
    correct: spec.ans,
    fmt: degM,
    wrong: spec.wrong,
    solution: spec.steps,
    rule: 3,
    skill: 'central and inscribed angles',
    check: () => {
      const [A, B, C] = [start, start + c, vertex].map((a) => [Math.cos(rad(a)), Math.sin(rad(a))]);
      return Math.abs(angleAt(A, C, B) - i) < 1e-6 && Math.abs(angleAt(A, [0, 0], B) - c) < 1e-6 ? true : 'the angles measured from the coordinates are different';
    },
  });
}

const readStep = (v, x, name) => (v > 0 ? R`\(${x} - ${v}\) gives \(${name} = ${v}\)` : R`\(${x} + ${-v} = ${x} - (${v})\) gives \(${name} = ${v}\)`);

function easyReadEquation(rng) {
  const h = rng.nonzero(-9, 9);
  const k = rng.intExcept(-9, 9, [0, h, -h]);
  const r = rng.int(2, 12);
  const eq = circleEq(h, k, r * r);
  return q({
    prompt: R`What are the centre and radius of the circle \(${eq}\)?`,
    correct: centreRadius(h, k, r),
    wrong: [
      { value: centreRadius(-h, -k, r), why: SIGNS },
      { value: centreRadius(h, k, r * r), why: R`The right side of the equation is \(r^2\). Take its square root to get the radius.` },
      centreRadius(-h, -k, r * r),
      centreRadius(k, h, r),
    ],
    solution: [
      R`Compare with \((x - h)^2 + (y - k)^2 = r^2\), the circle with centre \((h, k)\) and radius \(r\).`,
      `${readStep(h, 'x', 'h')}, and ${readStep(k, 'y', 'k')}.`,
      R`\(r^2 = ${r * r}\), so \(r = \sqrt{${r * r}} = ${r}\). The centre is \(${point(h, k)}\) and the radius is \(${r}\).`,
    ],
    rule: 6,
    skill: 'equation of a circle',
    check: () => {
      const seen = readCircle(eq);
      return seen.h === h && seen.k === k && seen.r2 === r * r ? true : 'the printed equation does not match the answer';
    },
  });
}

// ───────────── Medium ─────────────

function mediumArcSector(rng) {
  for (;;) {
    const r = rng.int(3, 12);
    const th = rng.pick(ANGLES);
    const wantArea = rng.bool();
    const ans = wantArea ? frac(r * r * th, 360) : frac(r * th, 180);
    if (ans.d > 3) continue;
    const part = frac(th, 360);
    let u = rng.pick(LENGTH_UNITS);
    let prompt = wantArea
      ? R`A sector of a circle of radius \(${r}\) ${u} has a central angle of \(${deg(th)}\). What is the area of the sector?`
      : R`In a circle of radius \(${r}\) ${u}, a central angle measures \(${deg(th)}\). How long is the arc that it cuts off?`;
    let label = degT(th);
    let seen = `whose central angle is ${th} degrees`;
    let first = R`The central angle is \(\dfrac{${th}}{360} = ${part.tex()}\) of a full turn, so the ${wantArea ? 'sector is that fraction of the whole disc' : 'arc is that fraction of the whole circumference'}.`;
    const story = rng.bool(0.4);
    if (story && wantArea) {
      u = 'm';
      prompt = R`A lawn sprinkler sprays water \(${r}\) m from where it stands and turns through an angle of \(${deg(th)}\). What area of lawn does it water?`;
      first = R`The watered region is a sector of radius \(${r}\) m. Its angle is \(\dfrac{${th}}{360} = ${part.tex()}\) of a full turn.`;
    } else if (story && th % 30 === 0) {
      u = 'cm';
      prompt = R`The minute hand of a clock is \(${r}\) cm long. How far does its tip travel in ${th / 6} minutes?`;
      label = `${th / 6} min`;
      seen = `swept out by the minute hand in ${th / 6} minutes`;
      first = R`In 60 minutes the hand makes a full turn, so in ${th / 6} minutes it makes \(\dfrac{${th / 6}}{60} = ${part.tex()}\) of a turn. Its tip moves along an arc of radius \(${r}\) cm.`;
    }
    return q({
      prompt: R`${prompt} Leave \(\pi\) in the answer.`,
      visual: { type: 'circle', sector: { start: -th, end: 0, label }, radius: `${r} ${u}`, alt: `A circle of radius ${r} ${u} with a shaded sector ${seen}.` },
      correct: ans,
      fmt: piFmt(wantArea ? `${u}²` : u),
      wrong: wantArea
        ? [
            { value: frac(r * th, 180), why: R`That is the length of the arc. The area of a sector is a fraction of \(\pi r^2\).` },
            { value: frac(r * r, 1), why: R`That is the area of the whole circle. Multiply it by \(${part.tex()}\).` },
            frac(r * r * th, 180),
            frac(r * th, 360),
          ]
        : [
            { value: frac(r * r * th, 360), why: R`That is the area of the sector. Arc length is a fraction of the circumference, \(2\pi r\).` },
            { value: frac(2 * r, 1), why: R`That is the whole circumference. Multiply it by \(${part.tex()}\).` },
            frac(r * th, 360),
            frac(r * th, 90),
          ],
      solution: [
        first,
        wantArea ? R`Area of the whole circle: \(\pi r^2 = \pi (${r})^2 = ${r * r}\pi\) ${u}².` : R`Whole circumference: \(2\pi r = 2\pi (${r}) = ${2 * r}\pi\) ${u}.`,
        wantArea ? R`Sector: \(${part.tex()} \cdot ${r * r}\pi = ${piTex(ans)}\) ${u}².` : R`Arc: \(${part.tex()} \cdot ${2 * r}\pi = ${piTex(ans)}\) ${u}.`,
      ],
      rule: 1,
      skill: 'arc length and sector area',
      check: () => {
        const part360 = measureSector(r, th);
        return close(ans.value * Math.PI, wantArea ? part360.area : part360.len, 1e-5) ? true : 'does not match the sector measured as a many-sided polygon';
      },
    });
  }
}

function mediumSemicircle(rng) {
  const lead = R`\(\overline{AB}\) is a diameter of circle \(O\), and \(C\) is another point on the circle.`;
  const why90 = R`\(\angle ACB\) is inscribed in a semicircle (it stands on the diameter \(\overline{AB}\)), so it is a right angle.`;
  const seen = 'Triangle ABC drawn inside a circle. Side AB is a diameter of the circle and C is on the circle.';
  if (rng.bool(0.45)) {
    const a = rng.intExcept(20, 70, [45]);
    const pts = triAA(a, 90 - a, 10);
    return q({
      prompt: R`${lead} \(m\angle CAB = ${deg(a)}\). Find \(m\angle ABC\).`,
      visual: semicircleFigure(pts, { angles: [degT(a), 'x', ''] }, `${seen} The centre O is the midpoint of AB. Angle CAB is ${a} degrees and angle ABC is marked x.`),
      correct: 90 - a,
      fmt: degM,
      wrong: [
        { value: 180 - a, why: R`The triangle also has an angle at \(C\), and it is \(90^\circ\) because it stands on a diameter. That leaves \(90^\circ\) for the other two angles.` },
        { value: 90, why: R`\(90^\circ\) is the angle at \(C\), the one that stands on the diameter.` },
        { value: a, why: R`The angles at \(A\) and \(B\) are equal only when both are \(45^\circ\). Here they must add to \(90^\circ\).` },
        2 * a,
      ],
      solution: [why90, R`The angles of a triangle add to \(180^\circ\), so the angles at \(A\) and \(B\) add to \(90^\circ\).`, R`\(m\angle ABC = 90^\circ - ${deg(a)} = ${deg(90 - a)}\).`],
      rule: 3,
      skill: 'angle in a semicircle',
      check: () => (Math.abs(angleAt(pts[0], pts[2], pts[1]) - 90) < 0.01 && Math.abs(angleAt(pts[2], pts[1], pts[0]) - (90 - a)) < 0.01 && Math.abs(dist(pts[2], [5, 0]) - 5) < 0.001 ? true : 'C is not on the circle, or the angles in the figure are different'),
    });
  }
  const [p, s, c] = rng.pick(DRAWABLE);
  const [ac, bc] = rng.bool() ? [p, s] : [s, p];
  const u = rng.pick(LENGTH_UNITS);
  const findRadius = rng.bool(0.4);
  const pts = triSSS(bc, ac, c);
  return q({
    prompt: findRadius ? R`${lead} \(AC = ${ac}\) ${u} and \(BC = ${bc}\) ${u}. What is the radius of the circle?` : R`${lead} \(AB = ${c}\) ${u} and \(AC = ${ac}\) ${u}. Find \(BC\).`,
    visual: semicircleFigure(pts, findRadius ? { ac: `${ac}`, bc: `${bc}` } : { ab: `${c}`, ac: `${ac}`, bc: 'x' }, `${seen} ${findRadius ? `AC = ${ac} ${u} and BC = ${bc} ${u}.` : `AB = ${c} ${u}, AC = ${ac} ${u} and BC is marked x.`}`),
    correct: findRadius ? c / 2 : bc,
    unit: u,
    wrong: findRadius
      ? [
          { value: c, why: R`That is the diameter \(AB\). The radius is half of it.` },
          { value: (ac + bc) / 2, why: R`\(AB\) is the hypotenuse of a right triangle, so it comes from the Pythagorean theorem, not from adding the legs.` },
          Math.max(ac, bc) / 2,
        ]
      : [
          { value: c - ac, why: R`The triangle has a right angle at \(C\), so the squares of the sides are related: \(BC^2 = AB^2 - AC^2\). Subtracting the lengths themselves does not work.` },
          { value: c / 2, why: R`That is the radius of the circle. \(\overline{BC}\) is a leg of right triangle \(ABC\).` },
          ac,
        ],
    solution: findRadius
      ? [why90, R`So \(\overline{AB}\) is the hypotenuse of right triangle \(ABC\): \(AB^2 = ${ac}^2 + ${bc}^2 = ${ac * ac} + ${bc * bc} = ${c * c}\), and \(AB = ${c}\) ${u}.`, R`\(\overline{AB}\) is a diameter, so the radius is \(${c} \div 2 = ${num(c / 2)}\) ${u}.`]
      : [why90, R`So \(\overline{AB}\) is the hypotenuse of right triangle \(ABC\): \(BC^2 = AB^2 - AC^2 = ${c}^2 - ${ac}^2 = ${c * c} - ${ac * ac} = ${bc * bc}\).`, R`\(BC = \sqrt{${bc * bc}} = ${bc}\) ${u}.`],
    rule: 3,
    skill: 'angle in a semicircle',
    check: () => (Math.abs(dist(pts[2], [c / 2, 0]) - c / 2) < 0.001 && Math.abs(dist(pts[0], pts[2]) - ac) < 0.001 && Math.abs(dist(pts[1], pts[2]) - bc) < 0.001 ? true : 'C is not on the circle with diameter AB'),
  });
}

function mediumTangent(rng) {
  const lead = R`\(\overline{PT}\) is tangent to circle \(O\) at \(T\).`;
  const right = R`A radius drawn to the point of tangency is perpendicular to the tangent, so \(\triangle OTP\) has a right angle at \(T\).`;
  const seen = 'Circle O with radius OT. Segment PT touches the circle at T, and segment OP joins the centre to P, making triangle OTP.';
  if (rng.bool(0.35)) {
    const a = rng.intExcept(25, 65, [45]); // the angle at P
    const atP = rng.bool();
    const [given, find] = atP ? [a, 90 - a] : [90 - a, a];
    const [gName, fName] = atP ? ['TPO', 'TOP'] : ['TOP', 'TPO'];
    const t = r3(5 / Math.tan(rad(a)));
    return q({
      prompt: R`${lead} \(m\angle ${gName} = ${deg(given)}\). Find \(m\angle ${fName}\).`,
      visual: tangentFigure(5, t, { angles: atP ? ['x', '', degT(given)] : [degT(given), '', 'x'] }, `${seen} The angle at ${atP ? 'P' : 'O'} is ${given} degrees and the angle at ${atP ? 'O' : 'P'} is marked x.`),
      correct: find,
      fmt: degM,
      wrong: [
        { value: 180 - given, why: R`The triangle already has a \(90^\circ\) angle at \(T\), where the radius meets the tangent. Only \(90^\circ\) is left for the other two angles.` },
        { value: 90, why: R`\(90^\circ\) is the angle at \(T\), between the radius and the tangent.` },
        { value: given, why: R`The two acute angles are equal only when both are \(45^\circ\). Here they add to \(90^\circ\).` },
        2 * given,
      ],
      solution: [right, R`The acute angles of a right triangle add to \(90^\circ\).`, R`\(m\angle ${fName} = 90^\circ - ${deg(given)} = ${deg(find)}\).`],
      rule: 4,
      skill: 'tangent and radius',
      check: () => (Math.abs(angleAt([0, 5], [t, 5], [0, 0]) - a) < 0.02 && Math.abs(angleAt([0, 5], [0, 0], [t, 5]) - (90 - a)) < 0.02 ? true : 'the triangle in the figure does not have these angles'),
    });
  }
  const [p, s, c] = rng.pick(DRAWABLE);
  const [r, t] = rng.bool() ? [p, s] : [s, p];
  const u = rng.pick(LENGTH_UNITS);
  const L = String; // the units are in the question; short labels stay clear of the lines
  const spec = rng.pick([
    {
      prompt: R`The radius of the circle is \(${r}\) ${u} and \(PT = ${t}\) ${u}. How far is \(P\) from the centre \(O\)?`,
      labels: { ot: L(r), tp: L(t), po: 'x' },
      seen: `OT = ${r} ${u}, PT = ${t} ${u} and OP is marked x.`,
      ans: c,
      wrong: [{ value: r + t, why: 'The legs of a right triangle do not add up to the hypotenuse. Add their squares, then take the square root.' }, { value: c * c, why: R`That is \(OP^2\). Take the square root.` }],
      steps: [R`\(\overline{OP}\) is the hypotenuse: \(OP^2 = OT^2 + PT^2 = ${r}^2 + ${t}^2 = ${r * r} + ${t * t} = ${c * c}\).`, R`\(OP = \sqrt{${c * c}} = ${c}\) ${u}.`],
    },
    {
      prompt: R`The radius of the circle is \(${r}\) ${u} and \(OP = ${c}\) ${u}. Find \(PT\).`,
      labels: { ot: L(r), tp: 'x', po: L(c) },
      seen: `OT = ${r} ${u}, OP = ${c} ${u} and PT is marked x.`,
      ans: t,
      wrong: [{ value: c - r, why: R`Subtract the squares, not the lengths: \(PT^2 = OP^2 - OT^2\).` }, { value: t * t, why: R`That is \(PT^2\). Take the square root.` }, c + r],
      steps: [R`\(\overline{OP}\) is the hypotenuse, so \(PT^2 = OP^2 - OT^2 = ${c}^2 - ${r}^2 = ${c * c} - ${r * r} = ${t * t}\).`, R`\(PT = \sqrt{${t * t}} = ${t}\) ${u}.`],
    },
    {
      prompt: R`\(PT = ${t}\) ${u} and \(OP = ${c}\) ${u}. Find the radius of the circle.`,
      labels: { ot: 'x', tp: L(t), po: L(c) },
      seen: `PT = ${t} ${u}, OP = ${c} ${u} and the radius OT is marked x.`,
      ans: r,
      wrong: [{ value: c - t, why: R`Subtract the squares, not the lengths: \(OT^2 = OP^2 - PT^2\).` }, { value: r * r, why: R`That is \(OT^2\). Take the square root.` }, c + t],
      steps: [R`\(\overline{OP}\) is the hypotenuse, so \(OT^2 = OP^2 - PT^2 = ${c}^2 - ${t}^2 = ${c * c} - ${t * t} = ${r * r}\).`, R`The radius is \(OT = \sqrt{${r * r}} = ${r}\) ${u}.`],
    },
  ]);
  return q({
    prompt: `${lead} ${spec.prompt}`,
    visual: tangentFigure(r, t, spec.labels, `${seen} ${spec.seen}`),
    correct: spec.ans,
    unit: u,
    wrong: spec.wrong,
    solution: [right, ...spec.steps],
    rule: 4,
    skill: 'tangent and radius',
    check: () => (Math.abs(dist([0, 0], [t, r]) - c) < 1e-9 ? true : 'OP measured on the figure is different'),
  });
}

function mediumWriteEquation(rng) {
  const h = rng.int(-5, 5);
  const k = rng.intExcept(-5, 5, [h, -h]);
  const centre = { x: h, y: k, label: 'C' };
  const form = R`A circle with centre \((h, k)\) and radius \(r\) has the equation \((x - h)^2 + (y - k)^2 = r^2\).`;
  if (rng.bool()) {
    const r = rng.int(2, 6);
    return q({
      prompt: R`Which equation represents the circle with centre \(C${point(h, k)}\) and radius \(${r}\)?`,
      visual: circlePlot(h, k, r, { points: [centre], segments: [{ from: [h, k], to: [h + r, k], label: `${r}` }] }, `A circle on a coordinate grid with its centre C at ${ptT(h, k)} and a radius of ${r}.`),
      correct: m(circleEq(h, k, r * r)),
      wrong: [
        { value: m(circleEq(-h, -k, r * r)), why: SIGNS },
        { value: m(circleEq(h, k, r)), why: R`The right side is \(r^2\), not \(r\).` },
        m(circleEq(-h, -k, r)),
        { value: m(circleEq(h, k, 2 * r)), why: R`\(r^2\) means \(r \cdot r\), not \(2r\).` },
      ],
      solution: [form, R`Here \(h = ${h}\), \(k = ${k}\) and \(r^2 = ${r}^2 = ${r * r}\).`, R`\(${circleEq(h, k, r * r)}\)${h < 0 || k < 0 ? '. Subtracting a negative coordinate gives a plus sign inside the brackets.' : ''}`],
      rule: 6,
      skill: 'equation of a circle',
      check: () => {
        const seen = readCircle(circleEq(h, k, r * r));
        return seen.h === h && seen.k === k && seen.r2 === r * r ? true : 'the printed equation does not match the centre and radius';
      },
    });
  }
  const dx = rng.nonzero(-4, 4);
  const dy = rng.nonzero(-4, 4);
  const [px, py] = [h + dx, k + dy];
  const r2 = dx * dx + dy * dy;
  return q({
    prompt: R`A circle has its centre at \(C${point(h, k)}\) and passes through the point \(P${point(px, py)}\). Which equation represents the circle?`,
    visual: circlePlot(h, k, Math.sqrt(r2), { points: [centre, { x: px, y: py, label: 'P', color: 'c' }], segments: [{ from: [h, k], to: [px, py] }] }, `A circle on a coordinate grid with its centre C at ${ptT(h, k)}. It passes through the point P at ${ptT(px, py)}, and the radius CP is drawn.`),
    correct: m(circleEq(h, k, r2)),
    wrong: [
      { value: m(circleEq(px, py, r2)), why: 'The centre goes inside the brackets. The other point is only used to find the radius.' },
      { value: m(circleEq(-h, -k, r2)), why: SIGNS },
      { value: m(circleEq(h, k, Math.abs(dx) + Math.abs(dy))), why: R`\(r^2\) is the sum of the **squares** of the horizontal and vertical distances: \(${dx * dx} + ${dy * dy}\).` },
      m(circleEq(h, k, 2 * r2)),
      m(circleEq(-h, -k, 2 * r2)),
    ],
    solution: [
      R`The radius is the distance from the centre to any point on the circle. By the distance formula, \(r^2 = (${px} - ${paren(h)})^2 + (${py} - ${paren(k)})^2\).`,
      R`\(r^2 = ${paren(dx)}^2 + ${paren(dy)}^2 = ${dx * dx} + ${dy * dy} = ${r2}\). There is no need to take the square root, because the equation uses \(r^2\).`,
      R`Put the centre and \(r^2\) into \((x - h)^2 + (y - k)^2 = r^2\): \(${circleEq(h, k, r2)}\).`,
    ],
    rule: 6,
    skill: 'equation of a circle',
    check: () => {
      const seen = readCircle(circleEq(h, k, r2));
      return seen.h === h && seen.k === k && (px - seen.h) ** 2 + (py - seen.k) ** 2 === seen.r2 ? true : 'the given point is not on the circle in the answer';
    },
  });
}

// ───────────── Hard ─────────────

function hardRadians(rng) {
  const u = rng.pick(LENGTH_UNITS);
  const kind = rng.pick(['arc', 'area', 'angle']);
  if (kind === 'angle') {
    const th = rng.pick([0.5, 0.75, 1.25, 1.5, 2, 2.5, 3]);
    const r = rng.pick([4, 6, 8, 10, 12, 16, 20]);
    const s = th * r;
    return q({
      prompt: R`An arc of a circle is \(${num(s)}\) ${u} long, and the radius of the circle is \(${r}\) ${u}. What is the measure, in radians, of the central angle that cuts off this arc?`,
      visual: { type: 'circle', sector: { start: -toDeg(th), end: 0, label: 'θ', arcLabel: `${T(s)} ${u}` }, radius: `${r} ${u}`, alt: `A circle of radius ${r} ${u} with a shaded sector. The arc of the sector is ${T(s)} ${u} long and its central angle is marked θ.` },
      correct: th,
      fmt: (v) => R`\(${num(v)}\) radians`,
      wrong: [
        { value: round(1 / th, 2), why: 'That divides the radius by the arc. Radian measure is arc length divided by radius.' },
        { value: th / 2, why: 'Divide the arc length by the radius, not by the diameter.' },
        { value: s * r, why: R`\(s = r\theta\), so divide the arc length by the radius to find \(\theta\).` },
      ],
      solution: [R`The radian measure of a central angle is the length of its arc divided by the radius: \(\theta = \dfrac{s}{r}\).`, R`\(\theta = \dfrac{${num(s)}}{${r}} = ${num(th)}\) radians.`],
      rule: 2,
      skill: 'radian measure',
      check: () => (close(measureSector(r, toDeg(th)).len, s, 1e-5) ? true : 'an arc with this angle and radius has a different length'),
    });
  }
  for (;;) {
    const [n, d] = rng.pick(TURNS);
    const r = rng.int(3, 12);
    const isArc = kind === 'arc';
    const ans = isArc ? frac(r * n, d) : frac(r * r * n, 2 * d);
    if (ans.d > 2) continue;
    const th = frac(n, d);
    return q({
      prompt: isArc
        ? R`A circle has a radius of \(${r}\) ${u}. A central angle of \(${piTex(th)}\) radians cuts off an arc of the circle. How long is the arc?`
        : R`A sector of a circle of radius \(${r}\) ${u} has a central angle of \(${piTex(th)}\) radians. What is the area of the sector?`,
      visual: { type: 'circle', sector: { start: -180 * th.value, end: 0, label: piT(th) }, radius: `${r} ${u}`, alt: `A circle of radius ${r} ${u} with a shaded sector whose central angle is ${piT(th)} radians.` },
      correct: ans,
      fmt: piFmt(isArc ? u : `${u}²`),
      wrong: isArc
        ? [
            { value: frac(r * r * n, 2 * d), why: R`That is the area of the sector, \(\frac{1}{2}r^2\theta\). The arc length is \(r\theta\).` },
            { value: frac(n, d * r), why: R`Multiply the angle by the radius: \(s = r\theta\).` },
            frac(r * n, 2 * d),
            frac(2 * r * n, d),
          ]
        : [
            { value: frac(r * n, d), why: R`That is the arc length, \(r\theta\). The area of the sector is \(\frac{1}{2}r^2\theta\).` },
            { value: frac(r * r * n, d), why: R`The formula has a half in it: \(A = \frac{1}{2}r^2\theta\).` },
            frac(r * n, 2 * d),
            frac(r * r * n, 4 * d),
          ],
      solution: isArc
        ? [R`With the angle in radians, the arc length is the radius times the angle: \(s = r\theta\).`, R`\(s = ${r} \cdot ${piTex(th)} = ${piTex(ans)}\) ${u}.`]
        : [R`With the angle in radians, the area of a sector is \(A = \frac{1}{2}r^2\theta\).`, R`\(A = \frac{1}{2} \cdot ${r}^2 \cdot ${piTex(th)} = \frac{1}{2} \cdot ${r * r} \cdot ${piTex(th)} = ${piTex(ans)}\) ${u}².`],
      rule: 2,
      skill: 'radian measure',
      check: () => {
        const sector = measureSector(r, 180 * th.value);
        return close(ans.value * Math.PI, isArc ? sector.len : sector.area, 1e-5) ? true : 'does not match the sector measured as a many-sided polygon';
      },
    });
  }
}

function hardChord(rng) {
  const [p, s, c] = rng.pick(DRAWABLE);
  const [d, half] = p / s >= 0.7 && rng.bool() ? [s, p] : [p, s]; // distance from the centre, and half the chord
  const chord = 2 * half;
  const kind = rng.pick(['chord', 'distance', 'radius', 'depth']);
  const u = kind === 'depth' ? 'cm' : rng.pick(LENGTH_UNITS);
  const L = String; // the units are in the question, and short labels keep clear of the dashed segment
  const spec = {
    chord: {
      prompt: R`A circle has a radius of \(${c}\) ${u}. A chord of the circle is \(${d}\) ${u} from the centre. How long is the chord?`,
      labels: { oa: L(c), om: L(d), ab: 'x' },
      seen: `The radius OA is ${c} ${u}, the dashed segment is ${d} ${u} long and the chord AB is marked x.`,
      ans: chord,
      wrong: [
        { value: half, why: 'That is half the chord. The perpendicular from the centre cuts the chord into two equal parts, so double it.' },
        { value: 2 * (c - d), why: R`Subtract the squares, not the lengths: \((\text{half chord})^2 = r^2 - d^2\).` },
        2 * c,
        c - d,
      ],
      steps: [R`Half the chord: \(\sqrt{${c}^2 - ${d}^2} = \sqrt{${c * c} - ${d * d}} = \sqrt{${half * half}} = ${half}\) ${u}.`, R`The whole chord is \(2 \cdot ${half} = ${chord}\) ${u}.`],
    },
    distance: {
      prompt: R`A chord \(${chord}\) ${u} long is drawn in a circle of radius \(${c}\) ${u}. How far is the chord from the centre of the circle?`,
      labels: { oa: L(c), ab: L(chord), om: 'x' },
      seen: `The radius OA is ${c} ${u}, the chord AB is ${chord} ${u} long and the dashed segment is marked x.`,
      ans: d,
      wrong: [
        { value: c - half, why: R`Subtract the squares, not the lengths: \(d^2 = r^2 - (\text{half chord})^2\).` },
        { value: half, why: 'That is half the chord, which is one leg of the right triangle. The distance from the centre is the other leg.' },
      ],
      steps: [R`Half the chord is \(${chord} \div 2 = ${half}\) ${u}.`, R`Distance from the centre: \(\sqrt{${c}^2 - ${half}^2} = \sqrt{${c * c} - ${half * half}} = \sqrt{${d * d}} = ${d}\) ${u}.`],
    },
    radius: {
      prompt: R`A chord \(${chord}\) ${u} long is \(${d}\) ${u} from the centre of a circle. What is the radius of the circle?`,
      labels: { ab: L(chord), om: L(d), oa: 'x' },
      seen: `The chord AB is ${chord} ${u} long, the dashed segment is ${d} ${u} long and the radius OA is marked x.`,
      ans: c,
      wrong: [
        { value: half + d, why: 'The legs of a right triangle do not add up to the hypotenuse. Add their squares, then take the square root.' },
        { value: c * c, why: R`That is \(r^2\). Take the square root.` },
        chord + d,
      ],
      steps: [R`Half the chord is \(${chord} \div 2 = ${half}\) ${u}.`, R`Radius: \(\sqrt{${half}^2 + ${d}^2} = \sqrt{${half * half} + ${d * d}} = \sqrt{${c * c}} = ${c}\) ${u}.`],
    },
    depth: {
      prompt: R`Water flows through a round pipe with an inside radius of \(${c}\) cm. The surface of the water is \(${chord}\) cm wide, and the pipe is less than half full. How deep is the water at its deepest point?`,
      labels: { oa: L(c), ab: L(chord) },
      seen: `The circle stands for the pipe and the chord AB for the water surface. The radius OA is ${c} cm and the chord AB is ${chord} cm long.`,
      ans: c - d,
      wrong: [
        { value: d, why: 'That is how far the surface is below the centre of the pipe. The depth is measured from the surface down to the bottom of the pipe.' },
        { value: c + d, why: 'That would be the depth if the pipe were more than half full, with the surface above the centre.' },
        c - half,
        half,
      ],
      steps: [R`The surface is a chord \(${chord}\) cm long, so half of it is \(${half}\) cm.`, R`Distance from the centre down to the surface: \(\sqrt{${c}^2 - ${half}^2} = \sqrt{${c * c} - ${half * half}} = \sqrt{${d * d}} = ${d}\) cm.`, R`The bottom of the pipe is one radius below the centre, so the depth is \(${c} - ${d} = ${c - d}\) cm.`],
    },
  }[kind];
  return q({
    prompt: spec.prompt,
    visual: chordFigure(c, d, half, spec.labels, `A circle with centre O and a horizontal chord AB below the centre. A dashed segment from O meets the chord at a right angle. ${spec.seen}`),
    correct: spec.ans,
    unit: u,
    wrong: spec.wrong,
    solution: ['The perpendicular from the centre to a chord bisects the chord. Together with a radius drawn to one end of the chord, it makes a right triangle whose hypotenuse is the radius.', ...spec.steps],
    rule: 5,
    skill: 'chords',
    check: () => (Math.abs(dist([0, 0], [half, -d]) - c) < 1e-9 && chord === 2 * half ? true : 'the ends of the chord are not on the circle'),
  });
}

function hardCompleteSquare(rng) {
  const h = rng.nonzero(-7, 7);
  const k = rng.intExcept(-7, 7, [0, h, -h]);
  const r = rng.int(2, 9);
  const [D, E, F] = [-2 * h, -2 * k, h * h + k * k - r * r];
  return q({
    prompt: R`Find the centre and radius of the circle \(${terms([[1, 'x^2'], [1, 'y^2'], [D, 'x'], [E, 'y'], [F, '']])} = 0\).`,
    correct: centreRadius(h, k, r),
    wrong: [
      { value: centreRadius(-h, -k, r), why: R`After completing the square the equation is \(${circleEq(h, k, r * r)}\). The centre's coordinates have the opposite signs to the numbers in the brackets.` },
      F < 0 ? { value: centreRadius(h, k, sqrtTex(-F)), why: R`Completing the square adds \(${h * h}\) and \(${k * k}\) to both sides, so \(r^2 = ${-F} + ${h * h} + ${k * k}\), not \(${-F}\).` } : null,
      { value: centreRadius(-D, -E, r), why: R`Halve the coefficients of \(x\) and \(y\) when you complete the square.` },
      centreRadius(h, k, r * r),
      centreRadius(-h, -k, r * r),
    ],
    solution: [
      R`Group the \(x\)-terms and the \(y\)-terms, and move the constant across: \((${terms([[1, 'x^2'], [D, 'x']])}) + (${terms([[1, 'y^2'], [E, 'y']])}) = ${-F}\).`,
      R`Complete each square. Half of \(${D}\) is \(${-h}\), and \(${paren(-h)}^2 = ${h * h}\). Half of \(${E}\) is \(${-k}\), and \(${paren(-k)}^2 = ${k * k}\). Add \(${h * h}\) and \(${k * k}\) to both sides.`,
      R`\(${circleEq(h, k, `${-F} + ${h * h} + ${k * k} = ${r * r}`)}\).`,
      R`This is \((x - h)^2 + (y - k)^2 = r^2\) with centre \(${point(h, k)}\) and radius \(\sqrt{${r * r}} = ${r}\).`,
    ],
    rule: 6,
    skill: 'completing the square',
    check: () => ([0.3, 1.9, 4.1].every((t) => Math.abs((h + r * Math.cos(t)) ** 2 + (k + r * Math.sin(t)) ** 2 + D * (h + r * Math.cos(t)) + E * (k + r * Math.sin(t)) + F) < 1e-9) ? true : 'points of the circle in the answer do not satisfy the equation'),
  });
}

function tangentTriangle(rng, mode) {
  for (;;) {
    const [x, y, z] = rng.sample([3, 4, 5, 6, 7, 8, 9], 3); // tangent lengths from A, B and C
    if (Math.max(x, y, z) > 2.5 * Math.min(x, y, z)) continue;
    const [ab, bc, ca] = [x + y, y + z, z + x];
    const half = x + y + z;
    const lead = R`The sides of \(\triangle ABC\) are tangent to a circle: \(\overline{AB}\) touches it at \(D\), \(\overline{BC}\) at \(E\) and \(\overline{CA}\) at \(F\).`;
    const equal = R`Two tangent segments drawn to a circle from the same point are congruent, so \(AD = AF\), \(BD = BE\) and \(CE = CF\).`;
    const seen = 'Triangle ABC with a circle inside it that touches all three sides: side AB at D, side BC at E and side CA at F.';
    const given = R`\(AD = ${x}\), \(BE = ${y}\) and \(CF = ${z}\).`;
    const spec = {
      perimeter: {
        prompt: R`${lead} ${given} What is the perimeter of \(\triangle ABC\)?`,
        ans: 2 * half,
        wrong: [{ value: half, why: 'That adds each length once. Every vertex has two equal tangent segments, so each length is used twice in the perimeter.' }, half + x, 2 * half - z, 3 * half],
        steps: [R`\(AB = ${x} + ${y} = ${ab}\), \(BC = ${y} + ${z} = ${bc}\) and \(CA = ${z} + ${x} = ${ca}\).`, R`Perimeter: \(${ab} + ${bc} + ${ca} = ${2 * half}\).`],
      },
      side: {
        prompt: R`${lead} ${given} How long is \(\overline{BC}\)?`,
        ans: bc,
        wrong: [
          { value: ab, why: R`That is \(AB = AD + DB\). Side \(\overline{BC}\) is made of \(\overline{BE}\) and \(\overline{EC}\).` },
          { value: y, why: R`That is only \(BE\). Add \(EC\), which is equal to \(CF\).` },
          ca,
          2 * y,
        ],
        steps: [R`\(EC = CF = ${z}\).`, R`\(BC = BE + EC = ${y} + ${z} = ${bc}\).`],
      },
      system: {
        prompt: R`${lead} \(AB = ${ab}\), \(BC = ${bc}\) and \(CA = ${ca}\). Find \(AD\).`,
        ans: x,
        wrong: [
          { value: ab / 2, why: R`\(D\) is the midpoint of \(\overline{AB}\) only when \(CA = CB\). Use the equal tangent segments to write equations instead.` },
          { value: y, why: R`That is \(DB\). Check which vertex each tangent length belongs to.` },
          z,
          half,
        ],
        steps: [
          R`Let \(AD = AF = x\), \(BD = BE = y\) and \(CE = CF = z\). Then \(x + y = ${ab}\), \(y + z = ${bc}\) and \(z + x = ${ca}\).`,
          R`Add the three equations: \(2(x + y + z) = ${2 * half}\), so \(x + y + z = ${half}\).`,
          R`Subtract \(y + z = ${bc}\): \(x = ${half} - ${bc} = ${x}\). So \(AD = ${x}\).`,
        ],
      },
    }[mode];
    return q({
      prompt: spec.prompt,
      visual: incircleFigure(x, y, z, mode === 'system' ? ['x', '', '', '', '', ''] : [`${x}`, '', `${y}`, '', `${z}`, ''], `${seen} ${mode === 'system' ? `AB = ${ab}, BC = ${bc} and CA = ${ca}. Segment AD is marked x.` : `AD = ${x}, BE = ${y} and CF = ${z}.`}`),
      correct: spec.ans,
      wrong: spec.wrong,
      solution: [equal, ...spec.steps],
      rule: 4,
      skill: 'tangent segments',
      check: () => {
        const g = incircle(x, y, z);
        const touches = [[g.D, g.A, g.B], [g.E, g.B, g.C], [g.F, g.C, g.A]].every(([P, U, V]) => Math.abs(dist(P, g.centre) - g.radius) < 1e-3 && Math.abs((P[0] - g.centre[0]) * (V[0] - U[0]) + (P[1] - g.centre[1]) * (V[1] - U[1])) < 1e-3);
        const measured = mode === 'perimeter' ? dist(g.A, g.B) + dist(g.B, g.C) + dist(g.C, g.A) : mode === 'side' ? dist(g.B, g.C) : dist(g.A, g.D);
        return touches && Math.abs(measured - spec.ans) < 1e-3 ? true : 'the circle does not touch the sides at D, E and F, or the length measured on the figure is different';
      },
    });
  }
}

function hardTangentSegments(rng) {
  return tangentTriangle(rng, rng.pick(['perimeter', 'side']));
}

// ───────────── Challenge ─────────────

function challengeBackwards(rng) {
  for (;;) {
    const r = rng.int(3, 12);
    const th = rng.pick(ANGLES);
    const part = frac(th, 360);
    if (rng.bool()) {
      const area = frac(r * r * th, 360);
      if (area.d > 1) continue;
      const pizza = th <= 90 && rng.bool(0.5);
      const u = pizza ? 'in' : rng.pick(LENGTH_UNITS);
      return q({
        prompt: pizza
          ? R`A slice of pizza is a sector with a central angle of \(${deg(th)}\) and an area of \(${piTex(area)}\) in². What is the diameter of the whole pizza?`
          : R`A sector of a circle has a central angle of \(${deg(th)}\) and an area of \(${piTex(area)}\) ${u}². What is the radius of the circle?`,
        visual: { type: 'circle', sector: { start: -th, end: 0, label: degT(th) }, alt: `A circle with a shaded sector whose central angle is ${th} degrees. The area of the sector is ${piT(area)} square ${u}.` },
        correct: pizza ? 2 * r : r,
        unit: u,
        wrong: pizza
          ? [{ value: r, why: 'That is the radius. The question asks for the diameter, which is twice as long.' }, { value: r * r, why: R`That is \(r^2\). Take the square root to get the radius, then double it.` }, 2 * r * r, 4 * r]
          : [{ value: r * r, why: R`That is \(r^2\). Take the square root to get the radius.` }, { value: (r * r) / 2, why: R`That comes from the circumference, \(2\pi r\). The area of a sector is a fraction of \(\pi r^2\).` }, 2 * r, r + 3],
        solution: [
          R`The sector is \(\dfrac{${th}}{360} = ${part.tex()}\) of the circle, so \(${part.tex()} \cdot \pi r^2 = ${piTex(area)}\).`,
          R`Divide both sides by \(\pi\), then by \(${part.tex()}\): \(r^2 = ${area.tex()} \div ${part.tex()} = ${r * r}\).`,
          pizza ? R`\(r = \sqrt{${r * r}} = ${r}\) in, so the diameter is \(2 \cdot ${r} = ${2 * r}\) in.` : R`\(r = \sqrt{${r * r}} = ${r}\) ${u}.`,
        ],
        rule: 1,
        skill: 'arc length and sector area',
        check: () => (close(measureSector(r, th).area, area.value * Math.PI, 1e-5) ? true : 'a sector with this radius and angle has a different area'),
      });
    }
    const arc = frac(r * th, 180);
    if (arc.d > 1) continue;
    const u = rng.pick(LENGTH_UNITS);
    const viaArea = (2 * th) / r;
    return q({
      prompt: R`In a circle of radius \(${r}\) ${u}, an arc is \(${piTex(arc)}\) ${u} long. What is the measure of the central angle that cuts off this arc?`,
      visual: { type: 'circle', sector: { start: -th, end: 0, label: 'x', arcLabel: `${piT(arc)} ${u}` }, radius: `${r} ${u}`, alt: `A circle of radius ${r} ${u} with a shaded sector. The arc of the sector is ${piT(arc)} ${u} long and its central angle is marked x.` },
      correct: th,
      fmt: degM,
      wrong: [
        2 * th <= 360 ? { value: 2 * th, why: R`The whole circumference is \(2\pi r = ${2 * r}\pi\) ${u}, not \(${r}\pi\) ${u}.` } : null,
        { value: 360 - th, why: 'That is the angle for the rest of the circle.' },
        Number.isInteger(viaArea) ? { value: viaArea, why: R`Compare the arc with the circumference, \(2\pi r\), not with the area.` } : null,
        th / 2,
        th + 30,
      ],
      solution: [
        R`The whole circumference is \(2\pi r = 2\pi (${r}) = ${2 * r}\pi\) ${u}.`,
        R`The arc is \(\dfrac{${piTex(arc)}}{${2 * r}\pi} = ${part.tex()}\) of the circle.`,
        R`The central angle is the same fraction of \(360^\circ\): \(${part.tex()} \cdot 360^\circ = ${deg(th)}\).`,
      ],
      rule: 1,
      skill: 'arc length and sector area',
      check: () => (close(measureSector(r, th).len, arc.value * Math.PI, 1e-5) ? true : 'an arc with this radius and angle has a different length'),
    });
  }
}

function challengeTangentSystem(rng) {
  return tangentTriangle(rng, 'system');
}

function challengeDiameter(rng) {
  const h = rng.int(-4, 4);
  const k = rng.intExcept(-4, 4, [h, -h]);
  const dx = rng.nonzero(-4, 4);
  const dy = rng.nonzero(-4, 4);
  const [A, B] = [[h - dx, k - dy], [h + dx, k + dy]];
  const r2 = dx * dx + dy * dy;
  return q({
    prompt: R`The segment with endpoints \(A${point(...A)}\) and \(B${point(...B)}\) is a diameter of a circle. Which equation represents the circle?`,
    visual: circlePlot(h, k, Math.sqrt(r2), { points: [{ x: A[0], y: A[1], label: 'A' }, { x: B[0], y: B[1], label: 'B' }], segments: [{ from: A, to: B }] }, `A circle on a coordinate grid. Its diameter AB has endpoints A${ptT(...A)} and B${ptT(...B)}.`),
    correct: m(circleEq(h, k, r2)),
    wrong: [
      { value: m(circleEq(h, k, 4 * r2)), why: R`\(${4 * r2}\) is \(AB^2\), the square of the whole diameter. The radius is half of \(AB\), so \(r^2 = \dfrac{${4 * r2}}{4} = ${r2}\).` },
      { value: m(circleEq(-h, -k, r2)), why: SIGNS },
      { value: m(circleEq(dx, dy, r2)), why: 'The centre is the midpoint of the diameter: add the coordinates of the endpoints and halve. Subtracting them does not give a point.' },
      m(circleEq(A[0], A[1], 4 * r2)),
      m(circleEq(-h, -k, 4 * r2)),
    ],
    solution: [
      R`The centre is the midpoint of the diameter: \(\left(\dfrac{${A[0]} + ${paren(B[0])}}{2}, \dfrac{${A[1]} + ${paren(B[1])}}{2}\right) = ${point(h, k)}\).`,
      R`The radius is the distance from the centre to \(B\): \(r^2 = (${B[0]} - ${paren(h)})^2 + (${B[1]} - ${paren(k)})^2 = ${dx * dx} + ${dy * dy} = ${r2}\).`,
      R`Put the centre and \(r^2\) into \((x - h)^2 + (y - k)^2 = r^2\): \(${circleEq(h, k, r2)}\).`,
    ],
    rule: 6,
    skill: 'equation of a circle',
    check: () => {
      const seen = readCircle(circleEq(h, k, r2));
      const on = (P) => (P[0] - seen.h) ** 2 + (P[1] - seen.k) ** 2 === seen.r2;
      return on(A) && on(B) && 2 * seen.h === A[0] + B[0] && 2 * seen.k === A[1] + B[1] ? true : 'A and B are not opposite ends of a diameter of the circle in the answer';
    },
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'circles',
  title: 'Circles',
  summary: 'Measure arcs, sectors and angles in circles, use tangents and chords, and write the equation of a circle.',
  standards: ['CCSS G-C.A.2', 'CCSS G-C.B.5', 'CCSS G-GPE.A.1', 'CCSS G-GMD.A.1'],

  explain: {
    intro: R`A circle is the set of all points in a plane that are the same distance, the **radius**, from one point, the **centre**. That single fact leads to the formulas for its length and area, the rules for the angles, chords and tangents drawn in it, and its equation on the coordinate plane.`,
    rules: [
      {
        title: 'Circumference and area',
        text: R`For a circle of radius \(r\) and diameter \(d = 2r\), the circumference is \(C = 2\pi r = \pi d\) and the area is \(A = \pi r^2\). Leaving \(\pi\) in the answer keeps it exact.`,
        example: R`\(r = 5\) cm: \(C = 2\pi(5) = 10\pi\) cm and \(A = \pi(5)^2 = 25\pi\) cm².`,
      },
      {
        title: 'Arcs and sectors',
        text: R`A central angle of \(\theta^\circ\) is the fraction \(\frac{\theta}{360}\) of a full turn. The arc it cuts off is that fraction of the circumference, and the sector (the slice) is that fraction of the area: arc length \(= \frac{\theta}{360} \cdot 2\pi r\) and sector area \(= \frac{\theta}{360} \cdot \pi r^2\).`,
        example: R`\(r = 6\), \(\theta = 60^\circ\): the fraction is \(\frac{1}{6}\), so the arc is \(\frac{1}{6} \cdot 12\pi = 2\pi\) and the sector is \(\frac{1}{6} \cdot 36\pi = 6\pi\).`,
      },
      {
        title: 'Radian measure',
        text: R`For a fixed angle, arc length is proportional to the radius, so the ratio \(\frac{\text{arc}}{\text{radius}}\) depends only on the angle. That ratio is the angle in **radians**. A full turn is \(2\pi\) radians, so \(180^\circ = \pi\) radians. With \(\theta\) in radians, arc length is \(s = r\theta\) and sector area is \(A = \frac{1}{2}r^2\theta\).`,
        example: R`\(r = 6\), \(\theta = \frac{2\pi}{3}\): \(s = 6 \cdot \frac{2\pi}{3} = 4\pi\) and \(A = \frac{1}{2} \cdot 36 \cdot \frac{2\pi}{3} = 12\pi\).`,
      },
      {
        title: 'Central and inscribed angles',
        text: R`A central angle has the same measure as the arc it cuts off. An inscribed angle (vertex on the circle) is **half** the arc it cuts off, so it is half the central angle on the same arc. An angle inscribed in a semicircle, standing on a diameter, is always \(90^\circ\).`,
        example: R`A central angle of \(80^\circ\) cuts off an \(80^\circ\) arc. Every inscribed angle that cuts off the same arc is \(40^\circ\).`,
      },
      {
        title: 'Tangents',
        text: R`A tangent touches the circle at exactly one point and is perpendicular to the radius drawn to that point. Two tangent segments drawn to a circle from the same outside point are congruent.`,
        example: R`\(\overline{PT}\) is tangent at \(T\), the radius is \(5\) and \(PT = 12\): \(\triangle OTP\) has a right angle at \(T\), so \(OP = \sqrt{5^2 + 12^2} = 13\).`,
      },
      {
        title: 'Chords',
        text: R`The perpendicular from the centre to a chord bisects the chord. Half the chord, the distance \(d\) from the centre to the chord, and a radius form a right triangle: \(\left(\frac{\text{chord}}{2}\right)^2 + d^2 = r^2\).`,
        example: R`\(r = 10\), \(d = 6\): half the chord is \(\sqrt{100 - 36} = 8\), so the chord is \(16\).`,
      },
      {
        title: 'The equation of a circle',
        text: R`By the distance formula, the circle with centre \((h, k)\) and radius \(r\) is \((x - h)^2 + (y - k)^2 = r^2\). If the equation has been multiplied out, complete the square in \(x\) and in \(y\) to get back to this form.`,
        example: R`\(x^2 + y^2 - 6x + 4y - 12 = 0\) becomes \((x - 3)^2 + (y + 2)^2 = 12 + 9 + 4 = 25\): centre \((3, -2)\), radius \(5\).`,
      },
    ],
    vocab: [
      { term: 'chord', def: 'A segment whose endpoints are both on the circle. A diameter is a chord through the centre.' },
      { term: 'arc', def: R`A part of the circle between two points. A minor arc is less than a semicircle (\(180^\circ\)); a major arc is more.` },
      { term: 'sector', def: 'The region between two radii and the arc that joins them, shaped like a slice of pizza.' },
      { term: 'central angle', def: 'An angle whose vertex is the centre of the circle.' },
      { term: 'inscribed angle', def: 'An angle whose vertex is on the circle and whose sides are chords. The arc inside the angle is its intercepted arc.' },
      { term: 'tangent', def: 'A line that touches the circle at exactly one point, the point of tangency.' },
      { term: 'radian', def: R`The angle whose arc is as long as the radius. \(\pi\) radians \(= 180^\circ\).` },
    ],
    mistakes: [
      R`Mixing up the two formulas. \(2\pi r\) is a length (the circumference) and \(\pi r^2\) is an area.`,
      'Using the diameter where a formula needs the radius. Halve the diameter first.',
      'Making an inscribed angle equal to the central angle on the same arc. The inscribed angle is half of it.',
      R`Reading the centre of \((x - 3)^2 + (y + 2)^2 = 25\) as \((-3, 2)\), or its radius as \(25\). The centre is \((3, -2)\) and the radius is \(\sqrt{25} = 5\).`,
      'Completing the square on the left side only. Whatever is added on the left must be added on the right too.',
    ],
    visual: { type: 'circle', center: 'O', central: { start: 10, end: 90, label: '80°' }, inscribed: { vertex: 235, start: 10, end: 90, label: '40°' }, points: [{ deg: 10, label: 'A' }, { deg: 90, label: 'B' }, { deg: 235, label: 'C' }], alt: 'A circle with centre O. Central angle AOB is 80 degrees. Inscribed angle ACB, with C on the circle, cuts off the same arc AB and is 40 degrees.' },
  },

  examples: [
    {
      title: 'Word problem: a lawn sprinkler',
      word: true,
      problem: R`A sprinkler sprays water \(9\) m from where it stands and turns back and forth through \(120^\circ\). What area of lawn does it water, and how long is the curved edge of the wet region?`,
      steps: [
        R`The wet region is a sector of a circle of radius \(9\) m. Its angle is \(\frac{120}{360} = \frac{1}{3}\) of a full turn.`,
        R`Area: \(\frac{1}{3} \cdot \pi (9)^2 = \frac{1}{3} \cdot 81\pi = 27\pi\) m², which is about \(84.8\) m².`,
        R`Curved edge: \(\frac{1}{3} \cdot 2\pi (9) = \frac{1}{3} \cdot 18\pi = 6\pi\) m, which is about \(18.8\) m.`,
        R`Check the arc in radians: \(120^\circ = \frac{2\pi}{3}\), and \(s = r\theta = 9 \cdot \frac{2\pi}{3} = 6\pi\). ✓`,
      ],
      answer: R`Area \(27\pi \approx 84.8\) m²; curved edge \(6\pi \approx 18.8\) m`,
      visual: { type: 'circle', sector: { start: -120, end: 0, label: '120°' }, radius: '9 m', alt: 'A circle of radius 9 m with a shaded sector whose central angle is 120 degrees.' },
    },
    {
      title: 'Angles on a diameter',
      problem: R`\(\overline{AB}\) is a diameter of circle \(O\) and \(C\) is on the circle, with \(m\angle CAB = 28^\circ\). Find \(m\angle ACB\), \(m\angle ABC\) and the measure of arc \(BC\).`,
      steps: [
        R`\(\angle ACB\) is inscribed in a semicircle: the arc it cuts off is half the circle, \(180^\circ\), so the angle is \(\frac{1}{2}(180^\circ) = 90^\circ\).`,
        R`The angles of \(\triangle ABC\) add to \(180^\circ\): \(m\angle ABC = 180^\circ - 90^\circ - 28^\circ = 62^\circ\).`,
        R`\(\angle CAB\) is an inscribed angle that cuts off arc \(BC\), so the arc is twice the angle: \(2(28^\circ) = 56^\circ\).`,
      ],
      answer: R`\(m\angle ACB = 90^\circ\), \(m\angle ABC = 62^\circ\), arc \(BC = 56^\circ\)`,
      visual: semicircleFigure(triAA(28, 62, 10), { angles: ['28°', '', ''] }, 'Triangle ABC drawn inside a circle with centre O. Side AB is a diameter of the circle and C is on the circle. Angle CAB is 28 degrees.'),
    },
    {
      title: 'A tangent from an outside point',
      problem: R`\(\overline{PT}\) is tangent to circle \(O\) at \(T\). The radius is \(8\) cm and \(PT = 15\) cm. How far is \(P\) from the centre, and how far is \(P\) from the circle?`,
      steps: [
        R`The radius \(\overline{OT}\) is perpendicular to the tangent at \(T\), so \(\triangle OTP\) is a right triangle with hypotenuse \(\overline{OP}\).`,
        R`\(OP^2 = 8^2 + 15^2 = 64 + 225 = 289\), so \(OP = 17\) cm.`,
        R`The nearest point of the circle lies on \(\overline{OP}\), one radius from \(O\). So \(P\) is \(17 - 8 = 9\) cm from the circle.`,
      ],
      answer: R`\(OP = 17\) cm, and \(P\) is \(9\) cm from the circle`,
      visual: tangentFigure(8, 15, { ot: '8', tp: '15', right: true }, 'Circle O with radius OT of 8 cm. Segment PT, 15 cm long, touches the circle at T and meets the radius at a right angle. Segment OP joins the centre to P.'),
    },
    {
      title: 'Completing the square',
      problem: R`Find the centre and radius of the circle \(x^2 + y^2 + 8x - 6y - 11 = 0\).`,
      steps: [
        R`Group the \(x\)-terms and the \(y\)-terms, and move the constant across: \((x^2 + 8x) + (y^2 - 6y) = 11\).`,
        R`Half of \(8\) is \(4\), and \(4^2 = 16\). Half of \(-6\) is \(-3\), and \((-3)^2 = 9\). Add \(16\) and \(9\) to **both** sides.`,
        R`\((x^2 + 8x + 16) + (y^2 - 6y + 9) = 11 + 16 + 9\), which is \((x + 4)^2 + (y - 3)^2 = 36\).`,
        R`Compare with \((x - h)^2 + (y - k)^2 = r^2\): \(h = -4\), \(k = 3\) and \(r = \sqrt{36} = 6\).`,
      ],
      answer: R`Centre \((-4, 3)\), radius \(6\)`,
      visual: circlePlot(-4, 3, 6, { points: [{ x: -4, y: 3 }] }, 'A circle on a coordinate grid with its centre at (−4, 3) and a radius of 6. It passes through (2, 3), (−10, 3), (−4, 9) and (−4, −3).'),
    },
  ],

  models: [
    {
      id: 'arc-and-sector',
      title: 'Arc length and sector area',
      intro: 'Set the radius and the central angle. The picture shows the sector.',
      inputs: [
        { name: 'r', label: 'Radius', type: 'int', min: 1, max: 20, value: 6 },
        { name: 'angle', label: 'Central angle (degrees)', type: 'int', min: 1, max: 360, value: 120 },
      ],
      compute({ r, angle }) {
        const part = frac(angle, 360);
        const arc = part.mul(2 * r);
        const area = part.mul(r * r);
        const th = frac(angle, 180);
        const approx = (f) => num(f.value * Math.PI, { places: 2 });
        const times = angle === 360 ? '' : R`${part.tex()} \cdot `;
        return {
          problem: R`A circle has radius \(${r}\). Find the arc length and the sector area for a central angle of \(${deg(angle)}\).`,
          steps: [
            angle === 360 ? R`\(360^\circ\) is one full turn, so the arc is the whole circumference and the sector is the whole circle.` : R`The angle is \(\dfrac{${angle}}{360}${part.d === 360 ? '' : ` = ${part.tex()}`}\) of a full turn.`,
            R`Arc length: \(${times}2\pi (${r}) = ${piTex(arc)} \approx ${approx(arc)}\).`,
            R`Sector area: \(${times}\pi (${r})^2 = ${piTex(area)} \approx ${approx(area)}\).`,
            R`In radians the angle is \(${angle} \cdot \dfrac{\pi}{180} = ${piTex(th)}\). Check the arc: \(s = r\theta = ${r} \cdot ${piTex(th)} = ${piTex(arc)}\). ✓`,
          ],
          answer: R`Arc length \(${piTex(arc)} \approx ${approx(arc)}\); sector area \(${piTex(area)} \approx ${approx(area)}\)`,
          visual: { type: 'circle', sector: { start: -Math.min(angle, 359.9), end: 0, label: degT(angle) }, radius: `${r}`, alt: `A circle of radius ${r} with a shaded sector whose central angle is ${angle} degrees.` },
        };
      },
    },
    {
      id: 'water-in-a-pipe',
      title: 'Word problem: water in a pipe',
      word: true,
      intro: 'Set the radius of the pipe and the width of the water surface. Lengths are in centimetres.',
      inputs: [
        { name: 'r', label: 'Inside radius of the pipe (cm)', type: 'int', min: 2, max: 50, value: 13 },
        { name: 'w', label: 'Width of the water surface (cm)', type: 'int', min: 2, max: 100, value: 24 },
      ],
      compute({ r, w }) {
        if (w > 2 * r) return { error: `The water surface cannot be wider than the pipe, which is ${2 * r} cm across. Make the surface narrower or the pipe bigger.` };
        const problem = R`Water flows through a round pipe with an inside radius of \(${r}\) cm. The water surface is \(${w}\) cm wide and the pipe is no more than half full. How deep is the water at its deepest point?`;
        if (w === 2 * r) {
          return {
            problem,
            steps: [R`The surface is as wide as the pipe: \(${w}\) cm is the diameter. So the surface passes through the centre of the circle.`, R`The water fills the lower half of the pipe, and its depth is the radius, \(${r}\) cm.`],
            answer: R`The water is \(${r}\) cm deep.`,
            visual: { type: 'circle', diameter: `${w} cm`, alt: `A circle with a horizontal diameter of ${w} cm, which stands for the water surface.` },
          };
        }
        const half = w / 2;
        const d = Math.sqrt(r * r - half * half);
        const exact = isSquare(4 * r * r - w * w);
        const dTex = num(d, { places: 2 });
        const depth = num(r - round(d, 2), { places: 2 });
        return {
          problem,
          steps: [
            R`The surface is a chord of the circle. The perpendicular from the centre bisects it, so half the chord is \(${w} \div 2 = ${num(half)}\) cm.`,
            R`Half the chord, the distance \(d\) from the centre down to the surface, and a radius form a right triangle: \(d^2 + ${num(half)}^2 = ${r}^2\).`,
            R`\(d = \sqrt{${r * r} - ${num(half * half)}} = \sqrt{${num(r * r - half * half)}} ${exact ? '=' : R`\approx`} ${dTex}\) cm.`,
            R`The bottom of the pipe is one radius below the centre, so the depth is \(${r} - ${dTex} = ${depth}\) cm.`,
          ],
          answer: R`The water is ${exact ? '' : 'about '}\(${depth}\) cm deep.`,
          visual: chordFigure(r, d, half, { oa: `${r} cm`, ab: `${w} cm`, om: 'd' }, `A circle with centre O, which stands for the pipe, and a horizontal chord AB below the centre, which stands for the water surface. The radius OA is ${r} cm and the chord AB is ${w} cm long. A dashed segment marked d runs from O to the chord and meets it at a right angle.`),
        };
      },
    },
    {
      id: 'complete-the-square',
      title: 'From general form to centre and radius',
      intro: R`Choose \(D\), \(E\) and \(F\) in the equation \(x^2 + y^2 + Dx + Ey + F = 0\).`,
      inputs: [
        { name: 'D', label: 'D, the coefficient of x', type: 'int', min: -20, max: 20, value: -6 },
        { name: 'E', label: 'E, the coefficient of y', type: 'int', min: -20, max: 20, value: 4 },
        { name: 'F', label: 'F, the constant', type: 'int', min: -60, max: 60, value: -12 },
      ],
      compute({ D, E, F }) {
        const [h, k] = [frac(-D, 2), frac(-E, 2)];
        const [hh, kk] = [h.mul(h), k.mul(k)];
        const r2 = hh.add(kk).sub(F);
        if (r2.value < 0) return { error: `No point satisfies this equation: after completing the square the right side would be ${r2.text()}, and a sum of squares cannot be negative. Try a smaller F.` };
        if (r2.value === 0) return { error: `Only the point (${h.text()}, ${k.text()}) satisfies this equation, so it is not a circle. Try a smaller F.` };
        const group = (c, x) => (c === 0 ? `${x}^2` : `(${terms([[1, `${x}^2`], [c, x]])})`);
        const square = (v, x) => (v.n === 0 ? `${x}^2` : R`\left(${terms([[1, x], [v.neg(), '']])}\right)^2`);
        const halves = [[D, h, hh], [E, k, kk]].filter(([c]) => c !== 0).map(([c, v, v2]) => R`Half of \(${c}\) is \(${v.neg().tex()}\), and its square is \(${v2.tex()}\).`);
        const sum = terms([[-F, ''], [hh, ''], [kk, '']]);
        const root = R`\sqrt{${r2.tex()}}`;
        const rTex = sqrtFracTex(r2);
        const rational = isSquare(r2.n) && isSquare(r2.d);
        const rValue = Math.sqrt(r2.value);
        const about = rational ? '' : R` \approx ${num(rValue, { places: 2 })}`;
        return {
          problem: R`Find the centre and radius of the circle \(${terms([[1, 'x^2'], [1, 'y^2'], [D, 'x'], [E, 'y'], [F, '']])} = 0\).`,
          steps: [
            R`Group the \(x\)-terms and the \(y\)-terms, and move the constant to the right: \(${group(D, 'x')} + ${group(E, 'y')} = ${-F}\).`,
            halves.length ? `${halves.join(' ')} Add ${halves.length === 2 ? 'both squares' : 'that square'} to both sides.` : R`There is no \(x\)-term or \(y\)-term, so both squares are already complete.`,
            halves.length ? R`\(${square(h, 'x')} + ${square(k, 'y')} = ${sum === r2.tex() ? sum : `${sum} = ${r2.tex()}`}\).` : null,
            R`Compare with \((x - h)^2 + (y - k)^2 = r^2\): the centre is \(\left(${h.tex()}, ${k.tex()}\right)\) and the radius is \(r = ${rTex === root ? root : `${root} = ${rTex}`}${about}\).`,
          ].filter(Boolean),
          answer: R`Centre \(\left(${h.tex()}, ${k.tex()}\right)\), radius \(${rTex}${about}\)`,
          visual: circlePlot(h.value, k.value, rValue, { points: [{ x: h.value, y: k.value }] }, `A circle on a coordinate grid with its centre at (${h.text()}, ${k.text()}) and a radius of ${rational ? '' : 'about '}${T(rValue)}.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyCircumferenceArea, easyCentralInscribed, easyReadEquation],
    medium: [mediumArcSector, mediumSemicircle, mediumTangent, mediumWriteEquation],
    hard: [hardRadians, hardChord, hardCompleteSquare, hardTangentSegments],
    challenge: [challengeBackwards, challengeTangentSystem, challengeDiameter],
  },
};
