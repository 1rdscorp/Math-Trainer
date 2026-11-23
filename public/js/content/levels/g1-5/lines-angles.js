import { R, q, frac, person, plural } from '../../lib/index.js';

// ───────────── Helpers ─────────────

const rad = (d) => (d * Math.PI) / 180;
const r2 = (x) => Math.round(x * 100) / 100;
const turn = (pts, deg) => pts.map(([x, y]) => [r2(x * Math.cos(rad(deg)) - y * Math.sin(rad(deg))), r2(x * Math.sin(rad(deg)) + y * Math.cos(rad(deg)))]);
const regular = (k, r = 5, start = 90) => Array.from({ length: k }, (_, i) => [r2(r * Math.cos(rad(start + (360 * i) / k))), r2(r * Math.sin(rad(start + (360 * i) / k)))]);
const D = (v) => R`\(${v}^{\circ}\)`;
const deg = (v) => `${v}°`;
const steps5 = (lo, hi) => Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + 5 * i);
const kindOf = (a) => (a < 90 ? 'acute' : a === 90 ? 'right' : a < 180 ? 'obtuse' : 'straight');
// The kind again, from the two ray directions (dot product), not from the number.
function kindFromRays(d1, d2) {
  const dot = Math.cos(rad(d1)) * Math.cos(rad(d2)) + Math.sin(rad(d1)) * Math.sin(rad(d2));
  return Math.abs(dot) < 1e-9 ? 'right' : dot > 0 ? 'acute' : dot < -1 + 1e-9 ? 'straight' : 'obtuse';
}
const sweep = (from, to) => (((to - from) % 360) + 360) % 360;
const ANGLE_WORDS = {
  acute: 'An acute angle is less than a right angle.',
  right: 'A right angle is a square corner, 90°.',
  obtuse: 'An obtuse angle is between a right and a straight angle.',
  straight: 'A straight angle is a straight line, 180°.',
};

// A picture of one angle, with an arc and an optional label.
const anglePic = (start, a, label, alt) => ({ type: 'angle', rays: [start, start + a], arcs: [{ from: start, to: start + a, label }], alt });
// Two angles side by side, sharing a ray.
const twoAngles = (s, a, b, la, lb, alt) => ({ type: 'angle', rays: [s, s + a, s + a + b], arcs: [{ from: s, to: s + a, label: la }, { from: s + a, to: s + a + b, label: lb }], alt });

// Count pairs of parallel sides with slopes in lowest terms (a second way to the cross product).
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
function slopeKey([x, y]) {
  if (x === 0) return 'up';
  const g = gcd(x, y) || 1;
  const s = Math.sign(x);
  return `${(s * y) / g}/${(s * x) / g}`;
}
const sideVec = (pts, i) => [pts[(i + 1) % pts.length][0] - pts[i][0], pts[(i + 1) % pts.length][1] - pts[i][1]];
function quadParts(pts) {
  const v = [0, 1, 2, 3].map((i) => sideVec(pts, i));
  const par = [0, 1].filter((i) => v[i][0] * v[i + 2][1] - v[i][1] * v[i + 2][0] === 0).length;
  const right = [0, 1, 2, 3].filter((i) => v[i][0] * v[(i + 3) % 4][0] + v[i][1] * v[(i + 3) % 4][1] === 0);
  return { par, right };
}

// Lines of symmetry by trying every fold through the middle and a corner or the middle of a side.
function symmetryCount(pts) {
  const c = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const cands = [...pts, ...pts.map((p, i) => [(p[0] + pts[(i + 1) % pts.length][0]) / 2, (p[1] + pts[(i + 1) % pts.length][1]) / 2])];
  const found = [];
  for (const p of cands) {
    const dx = p[0] - c[0];
    const dy = p[1] - c[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const [ux, uy] = [dx / L, dy / L];
    const ok = pts.every(([x, y]) => {
      const t = (x - c[0]) * ux + (y - c[1]) * uy;
      const fx = 2 * (c[0] + t * ux) - x;
      const fy = 2 * (c[1] + t * uy) - y;
      return pts.some(([a, b]) => Math.hypot(a - fx, b - fy) < 0.06);
    });
    const ang = ((Math.atan2(uy, ux) * 180) / Math.PI + 180) % 180;
    if (ok && !found.some((f) => Math.min(Math.abs(f - ang), 180 - Math.abs(f - ang)) < 0.5)) found.push(ang);
  }
  return found.length;
}

// ───────────── Easy ─────────────

const FIGURES = {
  point: { name: 'a point', text: 'shows one exact place and has no length' },
  line: { name: 'a line', text: 'is straight and goes on forever in both directions' },
  ray: { name: 'a ray', text: 'has one endpoint and goes on forever in one direction' },
  segment: { name: 'a line segment', text: 'is straight and has two endpoints' },
};
const FIGURE_WHY = {
  line: 'A line has arrows at both ends. It never stops.',
  ray: 'A ray starts at an endpoint and has one arrow.',
  segment: 'A line segment stops at two endpoints. It has no arrows.',
  point: 'A point is a single dot. It has no length.',
};
function figurePic(kind, d) {
  if (kind === 'point') return { type: 'angle', rays: [], alt: 'A single dot.' };
  if (kind === 'ray') return { type: 'angle', rays: [d], alt: 'A straight path that starts at a dot and has an arrow at the other end.' };
  if (kind === 'line') return { type: 'angle', rays: [d], lines: true, alt: 'A straight path with arrows at both ends. A dot marks a point on it.' };
  const [a, b] = [Math.round(6 * Math.cos(rad(d))), Math.round(6 * Math.sin(rad(d)))];
  return { type: 'polygon', points: [[0, 0], [a, b], [2 * a, 2 * b]], fill: 'none', vertices: ['A', '', 'B'], alt: 'A straight path from endpoint A to endpoint B. It has no arrows.' };
}

function easyFigure(rng) {
  const kind = rng.pick(Object.keys(FIGURES));
  const usePic = rng.bool(0.6);
  const d = rng.pick([0, 20, 35, 150, 160, 200, 300, 330]);
  const pic = usePic ? figurePic(kind, d) : undefined;
  return q({
    prompt: usePic ? 'What is this figure called?' : `Which figure ${FIGURES[kind].text}?`,
    visual: pic,
    correct: FIGURES[kind].name,
    wrong: Object.keys(FIGURES).filter((k) => k !== kind).map((k) => ({ value: FIGURES[k].name, why: FIGURE_WHY[k] })),
    solution: [usePic ? FIGURE_WHY[kind] : `The figure ${FIGURES[kind].text}.`, `So it is ${FIGURES[kind].name}.`],
    rule: 0,
    skill: 'points, lines and rays',
    check: () => {
      if (!pic) return true;
      const ends = pic.type === 'polygon' ? 2 : pic.rays.length === 0 ? -1 : pic.lines ? 0 : 1;
      return { point: -1, line: 0, ray: 1, segment: 2 }[kind] === ends ? true : 'picture does not match the figure';
    },
  });
}

function easyAngleKind(rng) {
  const kind = rng.pick(['acute', 'acute', 'right', 'obtuse', 'obtuse', 'straight']);
  const a = kind === 'acute' ? rng.pick(steps5(15, 75)) : kind === 'obtuse' ? rng.pick(steps5(105, 170)) : kind === 'right' ? 90 : 180;
  const s = rng.int(0, 35) * 10;
  const labelled = rng.bool(0.4);
  return q({
    prompt: 'What kind of angle is this?',
    visual: anglePic(s, a, labelled ? deg(a) : undefined, `Two rays meet at a point. The angle between them measures ${a}°.`),
    correct: kind,
    wrong: ['acute', 'right', 'obtuse', 'straight'].filter((k) => k !== kind).map((k) => ({ value: k, why: ANGLE_WORDS[k] })),
    solution: ['Compare the angle with a square corner, 90°.', a === 90 ? 'It is exactly a square corner.' : a === 180 ? 'The two rays make a straight line.' : a < 90 ? 'It is narrower than a square corner.' : 'It is wider than a square corner, but not a straight line.', `So it is ${kind === 'acute' || kind === 'obtuse' ? 'an' : 'a'} ${kind} angle.`],
    rule: 1,
    skill: 'kinds of angles',
    check: () => (kindFromRays(s, s + a) === kind ? true : 'rays do not match the kind'),
  });
}

const LINE_FACTS = {
  par: 'They are parallel. They never cross.',
  perp: 'They are perpendicular. They cross at a right angle.',
  cross: 'They cross, but not at a right angle.',
  apart: 'They are not parallel. They would cross if made longer.',
};
const LINE_WHY = {
  par: 'Parallel lines stay the same distance apart. Check the gap at each end.',
  perp: 'Perpendicular lines make a square corner where they cross.',
  cross: 'Check the corner where they cross. It may be a square corner.',
  apart: 'Lines go on forever. Check if the gap gets smaller.',
};
function linesPic(kind, rng) {
  const r = rng.int(0, 17) * 10;
  if (kind === 'perp' || kind === 'cross') {
    const a = kind === 'perp' ? 90 : rng.pick([30, 40, 50, 60, 120, 130, 140]);
    return { pic: { type: 'angle', rays: [r, r + a], lines: true, arcs: kind === 'perp' ? [{ from: r, to: r + 90 }] : [], alt: kind === 'perp' ? 'Two lines cross. A small square shows a right angle where they meet.' : `Two lines cross. They make angles of ${a}° and ${180 - a}°.` }, d1: [Math.cos(rad(r)), Math.sin(rad(r))], d2: [Math.cos(rad(r + a)), Math.sin(rad(r + a))], crossNow: true };
  }
  const tilt = kind === 'par' ? 0 : rng.pick([-2.5, -2, -1.5, 1.5, 2, 2.5]);
  const [p0, p1, q0, q1] = turn([[0, 0], [8, 0], [0, 3], [8, 3 + tilt]], r);
  return {
    pic: { type: 'polygon', points: [p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], p1], fill: 'none', extra: [{ from: q0, to: q1, dashed: false }], alt: kind === 'par' ? 'Two straight paths, one above the other. The gap between them is the same everywhere.' : `Two straight paths, one above the other. The gap is ${tilt > 0 ? 'bigger on the right' : 'smaller on the right'}. They do not touch.` },
    d1: [p1[0] - p0[0], p1[1] - p0[1]],
    d2: [q1[0] - q0[0], q1[1] - q0[1]],
    crossNow: false,
  };
}

function easyLinesKind(rng) {
  const kind = rng.pick(['par', 'par', 'perp', 'perp', 'cross', 'apart']);
  const { pic, d1, d2, crossNow } = linesPic(kind, rng);
  return q({
    prompt: 'Think of each path as part of a line that goes on forever. Which is true?',
    visual: pic,
    correct: LINE_FACTS[kind],
    wrong: Object.keys(LINE_FACTS).filter((k) => k !== kind).map((k) => ({ value: LINE_FACTS[k], why: LINE_WHY[kind] })),
    solution: [crossNow ? 'The lines cross.' : 'The paths do not touch.', kind === 'perp' ? 'They make a square corner.' : kind === 'cross' ? 'The corners are not square.' : kind === 'par' ? 'The gap stays the same, so they never meet.' : 'The gap changes, so longer lines would meet.', LINE_FACTS[kind]],
    rule: 4,
    skill: 'parallel and perpendicular',
    check: () => {
      const cr = d1[0] * d2[1] - d1[1] * d2[0];
      const dt = d1[0] * d2[0] + d1[1] * d2[1];
      const got = Math.abs(cr) / (Math.hypot(...d1) * Math.hypot(...d2)) < 0.01 ? 'par' : Math.abs(dt) < 1e-9 ? 'perp' : crossNow ? 'cross' : 'apart';
      return got === kind ? true : 'picture does not match';
    },
  });
}

// ───────────── Medium ─────────────

const PARTS = [2, 3, 4, 5, 6, 8, 9, 10, 12, 18, 20, 36];
function mediumTurn(rng) {
  const d = rng.pick(PARTS);
  const a = 360 / d;
  const way = rng.pick(['toDeg', 'toDeg', 'toFrac', 'ones']);
  if (way === 'ones') {
    const n = rng.int(11, 170);
    return q({
      prompt: `An angle turns through ${n} one-degree angles. What is its measure?`,
      visual: anglePic(rng.int(0, 17) * 10, n, '?', `An angle made of ${n} one-degree angles.`),
      correct: n,
      fmt: D,
      wrong: [{ value: 360 - n, why: 'Each one-degree angle adds 1°. Count them.' }, n + 10, n > 20 ? n - 10 : n + 20],
      solution: ['A one-degree angle measures 1°.', `${n} of them make ${n}°.`],
      rule: 2,
      skill: 'measuring angles',
      check: () => (Array(n).fill(1).reduce((s, x) => s + x, 0) === n ? true : 'count mismatch'),
    });
  }
  const pic = { type: 'circle', sector: { start: 0, end: a }, central: { start: 0, end: a, label: way === 'toDeg' ? '?' : deg(a) }, alt: `A circle with a shaded slice. The slice is 1 of ${d} equal slices of the circle${way === 'toDeg' ? '' : `, and its angle is ${a}°`}.` };
  if (way === 'toDeg') {
    return q({
      prompt: R`An angle turns through \(\frac{1}{${d}}\) of a full circle. What is its measure?`,
      visual: pic,
      correct: a,
      fmt: D,
      wrong: [{ value: d, why: `${d} is the number of equal parts. Share 360° among them.` }, Number.isInteger(180 / d) && 180 / d !== a ? { value: 180 / d, why: 'A full turn is 360°, not 180°.' } : null, 360 - a, a + 10],
      solution: ['A full turn is 360°.', R`Share it into ${d} equal parts: \(360 \div ${d} = ${a}\).`, `The angle measures ${a}°.`],
      rule: 2,
      skill: 'measuring angles',
      check: () => (Array(d).fill(a).reduce((s, x) => s + x, 0) === 360 ? true : 'parts do not make a full turn'),
    });
  }
  return q({
    prompt: `An angle measures ${a}°. What fraction of a full turn is it?`,
    visual: pic,
    correct: frac(1, d),
    wrong: [{ value: frac(a, 180), why: 'A full turn is 360°, not 180°.' }, frac(1, d + 1), d > 2 ? frac(1, d - 1) : frac(1, 4), frac(1, a)],
    solution: ['A full turn is 360°.', R`\(360 \div ${a} = ${d}\), so ${d} of these angles make a full turn.`, R`The angle is \(\frac{1}{${d}}\) of a turn.`],
    rule: 2,
    skill: 'measuring angles',
    check: () => (a * d === 360 ? true : 'fraction does not rebuild 360'),
  });
}

function mediumMissing(rng) {
  const total = rng.pick([90, 180]);
  const a = total === 90 ? rng.pick(steps5(15, 75)) : rng.pick(steps5(20, 160).filter((x) => x !== 90));
  const x = total - a;
  const s = rng.int(0, 17) * 10;
  return q({
    prompt: `The two angles together make a ${total === 90 ? 'right' : 'straight'} angle. One is ${a}°. What is the other angle?`,
    visual: twoAngles(s, a, x, deg(a), '?', `Two angles side by side make a ${total === 90 ? 'right angle, 90°' : 'straight line, 180°'}. One angle is ${a}°. The other is marked with a question mark.`),
    correct: x,
    fmt: D,
    wrong: total === 90 ? [{ value: 180 - a, why: 'A right angle is 90°, not 180°.' }, { value: a, why: 'The two parts need not be equal. Subtract.' }, 90 + a] : [{ value: 90 - a > 0 ? 90 - a : null, why: 'A straight angle is 180°, not 90°.' }, { value: 360 - a, why: 'A straight angle is half a turn, 180°.' }, a, x + 10],
    solution: [`A ${total === 90 ? 'right' : 'straight'} angle measures ${total}°.`, R`The parts add to ${total}°: \(${a} + ? = ${total}\).`, R`\(${total} - ${a} = ${x}\), so the other angle is ${x}°.`],
    rule: 3,
    skill: 'missing angles',
    check: () => (sweep(s + a, s + total) === x && kindFromRays(s, s + total) === (total === 90 ? 'right' : 'straight') ? true : 'rays do not match'),
  });
}

// A triangle drawn from its angles: side 6 along the bottom, angles al and be at its ends.
function triFromAngles(al, be) {
  const ga = 180 - al - be;
  const b = (6 * Math.sin(rad(be))) / Math.sin(rad(ga));
  return [[0, 0], [6, 0], [r2(b * Math.cos(rad(al))), r2(b * Math.sin(rad(al)))]];
}
function triAngles(rng, kind) {
  if (kind === 'right') {
    const b = rng.pick(steps5(20, 70));
    return rng.shuffle([90, b, 90 - b]);
  }
  if (kind === 'acute') {
    for (;;) {
      const a = rng.pick(steps5(45, 85));
      const b = rng.pick(steps5(40, 85));
      const c = 180 - a - b;
      if (c >= 20 && c < 90) return [a, b, c];
    }
  }
  const a = rng.pick(steps5(95, 140));
  const b = rng.pick(steps5(15, 165 - a - 15 > 15 ? 165 - a - 15 : 15));
  return rng.shuffle([a, b, 180 - a - b]);
}
const TRI = { acute: 'an acute triangle', right: 'a right triangle', obtuse: 'an obtuse triangle', two: 'a triangle with two right angles' };
const TRI_WHY = {
  acute: 'An acute triangle has all three angles less than 90°.',
  right: 'A right triangle has one angle of exactly 90°.',
  obtuse: 'An obtuse triangle has one angle more than 90°.',
  two: 'A triangle cannot have two right angles. The sides would never meet.',
};
function classifyPts(pts) {
  const dots = pts.map((p, i) => {
    const a = pts[(i + 2) % 3];
    const b = pts[(i + 1) % 3];
    const u = [a[0] - p[0], a[1] - p[1]];
    const v = [b[0] - p[0], b[1] - p[1]];
    return (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  });
  return dots.some((c) => Math.abs(c) < 0.01) ? 'right' : dots.some((c) => c < 0) ? 'obtuse' : 'acute';
}

function mediumTriangle(rng) {
  const kind = rng.pick(['acute', 'right', 'obtuse']);
  const [al, be, ga] = triAngles(rng, kind);
  const pts = turn(triFromAngles(al, be), rng.int(0, 11) * 30);
  const angles = [al, be, ga];
  return q({
    prompt: 'Sort this triangle by its angles. What kind of triangle is it?',
    visual: { type: 'polygon', points: pts, angles: angles.map(deg), right: angles.map((x, i) => (x === 90 ? i : -1)).filter((i) => i >= 0), alt: `A triangle with angles of ${al}°, ${be}° and ${ga}°.` },
    correct: TRI[kind],
    wrong: Object.keys(TRI).filter((k) => k !== kind).map((k) => ({ value: TRI[k], why: TRI_WHY[k] })),
    solution: [`The angles are ${al}°, ${be}° and ${ga}°.`, kind === 'right' ? 'One angle is exactly 90°.' : kind === 'obtuse' ? `${Math.max(...angles)}° is more than 90°, so one angle is obtuse.` : 'Every angle is less than 90°.', `So it is ${TRI[kind]}.`],
    rule: 4,
    skill: 'sorting triangles',
    check: () => (classifyPts(pts) === kind && al + be + ga === 180 ? true : 'drawn triangle does not match its kind'),
  });
}

// ───────────── Hard ─────────────

const DIALS = [['turns a dial', 'the dial'], ['turns a knob', 'the knob'], ['opens a door', 'the door'], ['turns a steering wheel', 'the wheel']];
function hardAdjacent(rng) {
  const name = person(rng);
  const way = rng.pick(['sum', 'part', 'story', 'clock']);
  if (way === 'clock') {
    const k = rng.int(1, 11);
    const ans = 30 * k;
    return q({
      prompt: `The numbers on a clock are 30° apart. The minute hand moves from the 12 to the ${k}. How many degrees does it turn?`,
      visual: { type: 'circle', sector: { start: 90 - ans, end: 90 }, central: { start: 90 - ans, end: 90, label: '?' }, points: [{ deg: 90, label: '12' }, { deg: 90 - ans, label: String(k) }], alt: `A clock face. A shaded slice goes from the 12 around to the ${k}.` },
      correct: ans,
      fmt: D,
      wrong: [{ value: 5 * k, why: `That counts minutes. Each step of 1 number is 30°.` }, { value: 360 - ans, why: 'Count the turn from the 12 to the number, going clockwise.' }, ans + 30, k],
      solution: [`From the 12 to the ${k} is ${plural(k, 'step')} of 30°.`, R`\(${k} \times 30 = ${ans}\).`, `The hand turns ${ans}°.`],
      rule: 3,
      skill: 'angle word problems',
      check: () => (Array(k).fill(30).reduce((s, x) => s + x, 0) === ans && sweep(90 - ans, 90) === ans ? true : 'clock turn mismatch'),
    });
  }
  const a = rng.pick(steps5(20, 110));
  const b = rng.pick(steps5(15, 160 - a > 15 ? 160 - a : 15));
  const w = a + b;
  const s = rng.int(0, 17) * 10;
  const [verb, thing] = rng.pick(DIALS);
  if (way === 'part') {
    return q({
      prompt: `The whole angle measures ${w}°. One part is ${a}°. What is the other part?`,
      visual: twoAngles(s, a, b, deg(a), '?', `An angle of ${w}° is split into two angles. One is ${a}°. The other is marked with a question mark.`),
      correct: b,
      fmt: D,
      wrong: [{ value: w + a, why: `The ${w}° is the whole. Take away the part you know.` }, { value: 180 - a, why: `The whole is ${w}°, not a straight angle.` }, b + 10, b > 15 ? b - 5 : b + 5],
      solution: [R`The parts add up to the whole: \(${a} + ? = ${w}\).`, R`\(${w} - ${a} = ${b}\).`, `The other part is ${b}°.`],
      rule: 3,
      skill: 'adding angles',
      check: () => (a + b === w && sweep(s, s + a + b) === w ? true : 'parts do not add up'),
    });
  }
  return q({
    prompt: way === 'story' ? `${name} ${verb} ${a}°. Then ${name} turns ${thing} ${b}° more, the same way. How far does ${thing} turn in all?` : `Two angles share a ray. One is ${a}° and the other is ${b}°. What is the whole angle?`,
    visual: twoAngles(s, a, b, deg(a), deg(b), `Two angles side by side, ${a}° and ${b}°, sharing a ray.`),
    correct: w,
    fmt: D,
    wrong: [{ value: Math.abs(a - b) || null, why: 'The angles sit side by side. Add them.' }, w + 10, w - 10, 180 - w > 0 && 180 - w !== w ? 180 - w : w + 20],
    solution: ['The two angles sit side by side, so they add.', R`\(${a} + ${b} = ${w}\).`, `The whole turn is ${w}°.`],
    rule: 3,
    skill: way === 'story' ? 'angle word problems' : 'adding angles',
    check: () => (sweep(s, s + a + b) === w % 360 ? true : 'rays do not add up'),
  });
}

function quadShape(rng) {
  const t = rng.pick(['square', 'rect', 'rhombus', 'para', 'trap', 'rtrap', 'kite', 'any']);
  const w = rng.int(3, 6);
  const h = rng.int(2, 4);
  if (t === 'square') return [[0, 0], [w, 0], [w, w], [0, w]];
  if (t === 'rect') return [[0, 0], [w, 0], [w, h === w ? h + 1 : h], [0, h === w ? h + 1 : h]];
  if (t === 'rhombus') return rng.pick([[[0, 0], [3, 1], [4, 4], [1, 3]], [[0, 0], [5, 0], [8, 4], [3, 4]], [[0, 0], [2, 1], [4, 0], [2, -1]], [[0, 0], [3, 2], [6, 0], [3, -2]]]);
  if (t === 'para') {
    const sft = rng.int(1, 2);
    return [[0, 0], [w, 0], [w + sft, h], [sft, h]];
  }
  if (t === 'trap') {
    const p = rng.int(1, 2);
    return [[0, 0], [w + 2, 0], [w + 2 - p, h], [rng.int(1, 2), h]];
  }
  if (t === 'rtrap') return [[0, 0], [w + 1, 0], [w + 1 - rng.int(1, 2), h], [0, h]];
  if (t === 'kite') return [[0, 0], [2, 1], [0, rng.int(4, 5)], [-2, 1]];
  return [[0, 0], [w, 0], [w - 1, h + 1], [rng.int(0, 1), h]];
}

function hardQuadSides(rng) {
  const pts = quadShape(rng);
  const { par, right } = quadParts(pts);
  const askPar = rng.bool();
  const ans = askPar ? par : right.length;
  return q({
    prompt: askPar ? 'How many pairs of parallel sides does this quadrilateral have?' : 'How many right angles does this quadrilateral have?',
    visual: { type: 'polygon', points: pts, grid: true, alt: `A four-sided shape on a grid. It has ${plural(par, 'pair')} of parallel sides and ${plural(right.length, 'right angle')}.` },
    correct: ans,
    wrong: (askPar ? [0, 1, 2, 4] : [0, 1, 2, 4]).filter((x) => x !== ans).map((x) => (askPar && x === 4 ? { value: 4, why: 'Parallel sides come in pairs. Opposite sides make a pair.' } : x)),
    solution: askPar ? ['Check the top and bottom: do they keep the same gap?', 'Check the left and right sides the same way.', `There ${par === 1 ? 'is 1 pair' : `are ${par} pairs`} of parallel sides.`] : ['Check each corner against a square corner.', 'Use the grid lines to help.', `There ${right.length === 1 ? 'is 1 right angle' : `are ${right.length} right angles`}.`],
    rule: 4,
    skill: 'sorting quadrilaterals',
    check: () => {
      const v = [0, 1, 2, 3].map((i) => sideVec(pts, i));
      const p2 = [0, 1].filter((i) => slopeKey(v[i]) === slopeKey(v[i + 2])).length;
      const r2c = [0, 1, 2, 3].filter((i) => { const a = Math.atan2(v[i][1], v[i][0]); const b = Math.atan2(v[(i + 3) % 4][1], v[(i + 3) % 4][0]); return Math.abs(Math.cos(a - b)) < 1e-9; }).length;
      return (askPar ? p2 : r2c) === ans ? true : 'recount does not match';
    },
  });
}

const SYM_SHAPES = [
  ['equilateral triangle', () => regular(3), 3, [0, 1, 6]],
  ['square', () => [[0, 0], [4, 0], [4, 4], [0, 4]], 4, [{ value: 2, why: 'A square also folds along both corner-to-corner lines.' }, 8, 1]],
  ['rectangle', (rng) => { const h = rng.int(3, 4); return [[0, 0], [7, 0], [7, h], [0, h]]; }, 2, [{ value: 4, why: 'Fold a rectangle corner to corner. The halves do not match.' }, 1, 0]],
  ['regular pentagon', () => regular(5), 5, [{ value: 2, why: 'Try a fold through each corner. Every one works.' }, 1, 10]],
  ['regular hexagon', () => regular(6), 6, [{ value: 3, why: 'Folds go corner to corner and also side to side.' }, 2, 12]],
  ['regular octagon', () => regular(8), 8, [{ value: 4, why: 'Folds go corner to corner and also side to side.' }, 2, 16]],
  ['isosceles triangle', (rng) => [[0, 0], [6, 0], [3, rng.int(4, 6)]], 1, [3, 0, 2]],
  ['triangle with no equal sides', () => [[0, 0], [7, 0], [2, 4]], 0, [1, 3, 2]],
  ['parallelogram', () => [[0, 0], [6, 0], [8, 3], [2, 3]], 0, [{ value: 2, why: 'Fold a slanted parallelogram in half. The halves do not line up.' }, 1, 4]],
  ['trapezoid with two equal slanted sides', () => [[0, 0], [8, 0], [6, 3], [2, 3]], 1, [2, 0, 4]],
  ['kite', () => [[0, 0], [3, 2], [0, 6], [-3, 2]], 1, [2, 0, 4]],
  ['rhombus', () => [[0, 0], [3, 2], [6, 0], [3, -2]], 2, [{ value: 4, why: 'Only the two corner-to-corner folds work. Folds side to side do not.' }, 1, 0]],
];

function hardSymmetry(rng) {
  const [name, make, n, wrong] = rng.pick(SYM_SHAPES);
  const pts = turn(make(rng), rng.pick([0, 0, 15, 30, 45, 90]));
  return q({
    prompt: `How many lines of symmetry does this ${name} have?`,
    visual: { type: 'polygon', points: pts, alt: `A ${name}.` },
    correct: n,
    wrong,
    solution: ['A line of symmetry folds a shape into two halves that match.', n ? `Try folds through corners and through the middles of sides. ${n === 1 ? 'Only 1 fold works.' : `${n} folds work.`}` : 'No fold makes the two halves match.', `The ${name} has ${plural(n, 'line')} of symmetry.`],
    rule: 5,
    skill: 'symmetry',
    check: () => (symmetryCount(pts) === n ? true : `found ${symmetryCount(pts)} folds`),
  });
}

// ───────────── Challenge ─────────────

function challengeEqualParts(rng) {
  const total = rng.pick([90, 180, 180, 360]);
  const tname = { 90: 'A right angle', 180: 'A straight angle', 360: 'A full turn' }[total];
  const k = rng.pick([2, 3]);
  const known = total === 90 ? rng.pick(steps5(10, 60)) : total === 180 ? rng.pick(steps5(20, 140)) : rng.pick(steps5(60, 300));
  const rest = total - known;
  if (rest % k !== 0 || rest / k < 5) return challengeEqualParts(rng);
  const x = rest / k;
  const s = rng.int(0, 17) * 10;
  const rays = [s, s + known];
  for (let i = 1; i <= k; i++) rays.push(s + known + i * x);
  return q({
    prompt: `${tname} is split into ${k + 1} angles. One is ${known}°. The other ${k} are equal. What is each equal angle?`,
    visual: { type: 'angle', rays: total === 360 ? rays.slice(0, -1) : rays, arcs: [{ from: s, to: s + known, label: deg(known) }, ...Array.from({ length: k }, (_, i) => ({ from: s + known + i * x, to: s + known + (i + 1) * x, label: '?', r: 40 }))], alt: `${tname}, ${total}°, split into ${k + 1} angles. One is ${known}°. The other ${k} are equal and marked with question marks.` },
    correct: x,
    fmt: D,
    wrong: [{ value: rest, why: `That is all ${k} equal angles together. Share it among them.` }, { value: Number.isInteger(total / (k + 1)) && total / (k + 1) !== x ? total / (k + 1) : null, why: `The ${known}° angle is not one of the equal ones.` }, x + 5, x + 10],
    solution: [`${tname} is ${total}°.`, R`Take away the known angle: \(${total} - ${known} = ${rest}\).`, R`Share among ${k} equal angles: \(${rest} \div ${k} = ${x}\).`, `Each equal angle is ${x}°.`],
    rule: 3,
    skill: 'missing angles',
    check: () => (known + Array(k).fill(x).reduce((a, b) => a + b, 0) === total ? true : 'angles do not add to the whole'),
  });
}

function challengeTurnStory(rng) {
  const name = person(rng);
  const way = rng.pick(['quarters', 'rest', 'slices', 'fan']);
  if (way === 'quarters') {
    const k = rng.int(2, 3);
    const half = rng.bool();
    const ans = 90 * k + (half ? 180 : 0);
    if (ans > 360) return challengeTurnStory(rng);
    return q({
      prompt: `${name} spins on the spot. ${name} makes ${k} quarter turns${half ? ' and then a half turn' : ''}, all the same way. How many degrees is that?`,
      visual: { type: 'circle', sector: { start: 0, end: ans === 360 ? 359.9 : ans }, alt: `A circle with ${ans === 360 ? 'all of it' : `${ans / 90} quarters`} shaded.` },
      correct: ans,
      fmt: D,
      wrong: [{ value: 25 * k + (half ? 50 : 0), why: 'A quarter turn is 90°, not 25°.' }, ans - 90, ans === 360 ? 180 : ans + 90],
      solution: ['A quarter turn is 90°. A half turn is 180°.', half ? R`\(${Array(k).fill(90).join(' + ')} + 180 = ${ans}\).` : R`\(${Array(k).fill(90).join(' + ')} = ${ans}\).`, `${name} turns ${ans}°.`],
      rule: 2,
      skill: 'angle word problems',
      check: () => (ans === 360 * (k / 4 + (half ? 1 / 2 : 0)) ? true : 'turn mismatch'),
    });
  }
  if (way === 'rest') {
    const a = rng.pick(steps5(40, 150));
    const b = rng.pick(steps5(30, 150));
    const ans = 360 - a - b;
    return q({
      prompt: `A skater spins ${a}°, then ${b}° more, the same way. How many more degrees until the skater makes one full turn?`,
      visual: twoAngles(rng.int(0, 17) * 10, a, b, deg(a), deg(b), `Two turns side by side: ${a}° and ${b}°.`),
      correct: ans,
      fmt: D,
      wrong: [{ value: a + b, why: 'That is how far the skater has turned. Find what is left of 360°.' }, { value: 180 - a - b > 0 ? 180 - a - b : null, why: 'A full turn is 360°, not 180°.' }, ans + 10, ans - 10],
      solution: [R`Turned so far: \(${a} + ${b} = ${a + b}\).`, R`A full turn is 360°: \(360 - ${a + b} = ${ans}\).`, `${ans}° more.`],
      rule: 3,
      skill: 'angle word problems',
      check: () => (a + b + ans === 360 ? true : 'turns do not make 360'),
    });
  }
  if (way === 'slices') {
    const n = rng.pick([3, 4, 5, 6, 8, 9, 10, 12]);
    const a = 360 / n;
    const food = rng.pick(['pizza', 'pie', 'cake', 'quesadilla']);
    return q({
      prompt: `${name} cuts a round ${food} into equal slices from the middle. Each slice has a ${a}° angle at the tip. How many slices are there?`,
      visual: { type: 'circle', sector: { start: 0, end: a }, central: { start: 0, end: a, label: deg(a) }, alt: `A round ${food} with one slice shaded. The slice's angle at the middle is ${a}°.` },
      correct: n,
      unit: 'slices',
      wrong: [{ value: Number.isInteger(180 / a) ? 180 / a : null, why: 'The slices go all the way around, 360°.' }, n + 1, n - 1, n + 2],
      solution: ['All the slices fill a full turn, 360°.', R`\(360 \div ${a} = ${n}\).`, `There are ${n} slices.`],
      rule: 2,
      skill: 'angle word problems',
      check: () => (Array(n).fill(a).reduce((s, x) => s + x, 0) === 360 ? true : 'slices do not fill the circle'),
    });
  }
  const n = rng.pick([2, 3, 4, 5, 6]);
  const each = rng.pick(steps5(15, 45).filter((x) => x * n <= 180));
  const w = each * n;
  return q({
    prompt: `${name} opens a paper fan to ${w}°. The fan has ${n} equal folds. What angle does each fold make?`,
    visual: { type: 'angle', rays: Array.from({ length: n + 1 }, (_, i) => 90 - w / 2 + i * each), arcs: [{ from: 90 - w / 2, to: 90 + w / 2, label: deg(w), r: 50 }], alt: `A fan opened to ${w}° with ${n} equal folds.` },
    correct: each,
    fmt: D,
    wrong: [{ value: w - n, why: 'Share the angle equally. Divide.' }, { value: Number.isInteger(w / (n + 1)) ? w / (n + 1) : null, why: `Count the folds, not the rays. There are ${n} folds.` }, each + 5, each + 10],
    solution: [`The ${w}° is shared among ${n} equal folds.`, R`\(${w} \div ${n} = ${each}\).`, `Each fold is ${each}°.`],
    rule: 3,
    skill: 'angle word problems',
    check: () => (Array(n).fill(each).reduce((s, x) => s + x, 0) === w ? true : 'folds do not add up'),
  });
}

function challengeTurnFraction(rng) {
  const d = rng.pick([3, 4, 5, 6, 8, 9, 10, 12]);
  const k = rng.int(2, d - 1);
  const f = frac(k, d);
  if (f.d !== d) return challengeTurnFraction(rng);
  const a = (360 * k) / d;
  const toDeg = rng.bool();
  const pic = { type: 'circle', sector: { start: 0, end: a }, central: { start: 0, end: a, label: toDeg ? '?' : deg(a) }, alt: `A circle with a shaded part. It is ${k} of ${d} equal parts of the circle${toDeg ? '' : `, an angle of ${a}°`}.` };
  if (toDeg) {
    return q({
      prompt: R`An angle turns through \(\frac{${k}}{${d}}\) of a full circle. What is its measure?`,
      visual: pic,
      correct: a,
      fmt: D,
      wrong: [{ value: 360 / d, why: `That is one ${d === 4 ? 'fourth' : 'part'}. There are ${k} parts.` }, { value: (180 * k) / d === a ? null : Number.isInteger((180 * k) / d) ? (180 * k) / d : null, why: 'A full turn is 360°, not 180°.' }, a + 360 / d, a - 360 / d],
      solution: [R`One part is \(360 \div ${d} = ${360 / d}\) degrees.`, R`${k} parts: \(${k} \times ${360 / d} = ${a}\).`, `The angle measures ${a}°.`],
      rule: 2,
      skill: 'measuring angles',
      check: () => (Array(k).fill(360 / d).reduce((s, x) => s + x, 0) === a ? true : 'parts do not add up'),
    });
  }
  return q({
    prompt: `An angle measures ${a}°. What fraction of a full turn is it?`,
    visual: pic,
    correct: f,
    wrong: [{ value: frac(1, d), why: `That is one part of ${360 / d}°. This angle has ${k} of them.` }, { value: frac(a, 180), why: 'A full turn is 360°, not 180°.' }, frac(k + 1, d), frac(k, d + 1)],
    solution: [R`One part of \(\frac{1}{${d}}\) turn is \(360 \div ${d} = ${360 / d}\) degrees.`, R`\(${a} \div ${360 / d} = ${k}\) parts.`, R`So the angle is \(\frac{${k}}{${d}}\) of a turn.`],
    rule: 2,
    skill: 'measuring angles',
    check: () => (Math.abs(f.value * 360 - a) < 1e-9 ? true : 'fraction does not match the angle'),
  });
}

const FACTS_TRUE = ['Perpendicular lines meet at a right angle.', 'Parallel lines never meet.', 'A ray has exactly one endpoint.', 'A right angle is one fourth of a full turn.', 'A straight angle measures 180°.', 'A rectangle has two pairs of parallel sides.', 'A square has 4 lines of symmetry.', 'A right triangle has exactly one right angle.'];
const FACTS_FALSE = [
  ['A line segment goes on forever.', 'A line segment stops at two endpoints.'],
  ['An obtuse angle is less than 90°.', 'Obtuse angles are more than 90°. Acute angles are less.'],
  ['A full turn measures 180°.', 'A full turn is 360°. A half turn is 180°.'],
  ['Parallel lines meet at a right angle.', 'Parallel lines never meet. Perpendicular lines make right angles.'],
  ['Every rectangle has 4 lines of symmetry.', 'A rectangle that is not a square has only 2.'],
  ['A triangle can have two obtuse angles.', 'Two obtuse angles open too wide. The sides could never meet.'],
  ['A one-degree angle is one hundredth of a turn.', 'It is 1/360 of a full turn.'],
  ['A ray has two endpoints.', 'A ray has one endpoint and goes on forever.'],
];
function challengeFacts(rng) {
  const askTrue = rng.bool();
  const t = rng.sample(FACTS_TRUE, 3);
  const f = rng.sample(FACTS_FALSE, 3);
  return q({
    prompt: askTrue ? 'Which sentence is true?' : 'Which sentence is false?',
    correct: askTrue ? t[0] : f[0][0],
    wrong: askTrue ? f.map(([s, why]) => ({ value: s, why })) : t.map((s) => ({ value: s, why: 'This one is true. Look for one that breaks a rule.' })),
    solution: askTrue ? [`"${t[0]}"`, 'This matches the rules for lines and angles.'] : [`"${f[0][0]}"`, `This is false. ${f[0][1]}`],
    rule: askTrue ? 4 : 1,
    skill: 'lines and angles facts',
    check: () => (t.every((x) => FACTS_TRUE.includes(x)) && f.every(([x]) => !FACTS_TRUE.includes(x)) ? true : 'fact lists mixed up'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'lines-angles',
  title: 'Lines, Angles & Symmetry',
  summary: 'Name lines, rays and angles, measure angles in degrees, add angles, and find parallel sides and lines of symmetry.',
  grade: 'Grade 4',
  standards: ['CCSS 4.G.A.1', 'CCSS 4.G.A.2', 'CCSS 4.G.A.3', 'CCSS 4.MD.C.5', 'CCSS 4.MD.C.6', 'CCSS 4.MD.C.7'],

  explain: {
    intro: 'Lines, rays and segments are the straight parts of shapes. Where two rays meet, they make an angle. We measure angles in degrees. A full turn is 360 degrees.',
    rules: [
      {
        title: 'Points, lines, segments and rays',
        text: 'A point is one exact place. A line goes on forever both ways. A line segment has two endpoints. A ray has one endpoint and goes on forever one way.',
        example: 'Arrows show a figure goes on forever. A ray has one arrow. A line has two.',
      },
      {
        title: 'Kinds of angles',
        text: 'A right angle is a square corner, 90°. An acute angle is smaller. An obtuse angle is bigger, but less than 180°. A straight angle is 180°.',
        example: '40° is acute. 90° is right. 130° is obtuse. 180° is straight.',
      },
      {
        title: 'Degrees measure turning',
        text: 'An angle shows a turn around a point. A full turn is 360°. A one-degree angle is 1/360 of a full turn. An angle of n one-degree angles measures n degrees.',
        example: R`A quarter turn is \(360 \div 4 = 90\) degrees.`,
      },
      {
        title: 'Angles add',
        text: 'Angles side by side add to make the whole angle. To find a missing part, subtract the part you know from the whole.',
        example: R`A straight angle split into 130° and a missing part: \(180 - 130 = 50\) degrees.`,
      },
      {
        title: 'Parallel, perpendicular and sorting shapes',
        text: 'Parallel lines never meet. Perpendicular lines meet at a right angle. Sort triangles by their angles: acute, right or obtuse. Sort quadrilaterals by parallel sides and right angles.',
        example: 'A rectangle has 2 pairs of parallel sides and 4 right angles.',
      },
      {
        title: 'Lines of symmetry',
        text: 'A line of symmetry folds a shape into two matching halves. Some shapes have none. Some have many.',
        example: 'A rectangle has 2 lines of symmetry. A square has 4.',
      },
    ],
    vocab: [
      { term: 'endpoint', def: 'A point where a segment or ray stops.' },
      { term: 'vertex', def: 'The point where the two rays of an angle meet.' },
      { term: 'degree (°)', def: 'The unit for angles. One degree is 1/360 of a full turn.' },
      { term: 'parallel', def: 'Always the same distance apart, so never meeting.' },
      { term: 'perpendicular', def: 'Meeting at a right angle.' },
      { term: 'line of symmetry', def: 'A fold line that makes two matching halves.' },
    ],
    mistakes: [
      'Mixing up acute and obtuse. Compare with a square corner first.',
      'Using 180° for a full turn. A full turn is 360°.',
      'Adding when a part is missing. Subtract the known part from the whole.',
      'Counting a rectangle’s corner-to-corner lines as lines of symmetry. They do not fold it evenly.',
    ],
    visual: [
      anglePic(0, 45, '45°', 'An acute angle of 45°.'),
      anglePic(0, 90, '90°', 'A right angle, 90°, marked with a small square.'),
      anglePic(0, 135, '135°', 'An obtuse angle of 135°.'),
      anglePic(0, 180, '180°', 'A straight angle of 180°.'),
    ],
  },

  examples: [
    {
      title: 'What kind of angle?',
      problem: 'An angle measures 120°. What kind of angle is it?',
      steps: ['Compare with a right angle, 90°.', '120° is more than 90°.', '120° is less than 180°.'],
      answer: 'An obtuse angle',
      visual: anglePic(20, 120, '120°', 'An angle of 120°.'),
    },
    {
      title: 'Missing part of a straight angle',
      problem: 'Two angles make a straight angle. One is 130°. What is the other?',
      steps: ['A straight angle is 180°.', R`\(180 - 130 = 50\).`, 'The other angle is 50°.'],
      answer: '50°',
      visual: twoAngles(0, 130, 50, '130°', '?', 'A straight angle split into 130° and a missing angle.'),
    },
    {
      title: 'A fraction of a turn',
      problem: R`An angle turns through \(\frac{1}{8}\) of a circle. What is its measure?`,
      steps: ['A full turn is 360°.', R`\(360 \div 8 = 45\).`],
      answer: '45°',
      visual: { type: 'circle', sector: { start: 0, end: 45 }, central: { start: 0, end: 45, label: '45°' }, alt: 'A circle with one eighth shaded. Its angle is 45°.' },
    },
    {
      title: 'Word problem: the minute hand',
      word: true,
      problem: 'The minute hand moves from the 12 to the 4. Clock numbers are 30° apart. How far does it turn?',
      steps: ['From the 12 to the 4 is 4 steps.', R`\(4 \times 30 = 120\).`, 'The hand turns 120°.'],
      answer: '120°',
      visual: { type: 'circle', sector: { start: -30, end: 90 }, central: { start: -30, end: 90, label: '120°' }, points: [{ deg: 90, label: '12' }, { deg: -30, label: '4' }], alt: 'A clock face with a slice shaded from the 12 to the 4. The slice is 120°.' },
    },
  ],

  models: [
    {
      id: 'missing-turn',
      title: 'Word problem: finish the turn',
      word: true,
      intro: 'Choose the whole turn and how far it has turned. See the missing part.',
      inputs: [
        { name: 'total', label: 'Whole turn', type: 'select', value: '180', options: [{ value: '90', label: 'right angle (90°)' }, { value: '180', label: 'straight angle (180°)' }, { value: '360', label: 'full turn (360°)' }] },
        { name: 'a', label: 'Turned so far (degrees)', type: 'int', min: 1, max: 359, value: 65 },
      ],
      compute({ total, a }) {
        const t = Number(total);
        if (a >= t) return { error: `The turn so far must be less than ${t}°. Try a smaller number.` };
        const x = t - a;
        return {
          problem: `Ravi turns a dial. It must turn ${t}° in all. It has turned ${a}°. How much more must it turn?`,
          steps: [`The parts add up to the whole, ${t}°.`, R`Subtract the part done: \(${t} - ${a} = ${x}\).`, R`Check: \(${a} + ${x} = ${t}\).`],
          answer: `${x}° more`,
          visual: twoAngles(0, a, x, `${a}°`, '?', `A ${t}° turn split into ${a}° done and ${x}° to go.`),
        };
      },
    },
    {
      id: 'turn-fraction',
      title: 'An angle as part of a turn',
      intro: 'Choose a fraction of a full turn. See its angle in degrees.',
      inputs: [
        { name: 'n', label: 'Top number (parts)', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'd', label: 'Bottom number (equal parts in a turn)', type: 'select', value: '8', options: [2, 3, 4, 5, 6, 8, 9, 10, 12, 36, 360].map((v) => ({ value: String(v), label: String(v) })) },
      ],
      compute({ n, d }) {
        const dd = Number(d);
        if (n > dd) return { error: `Choose a top number up to ${dd}, so the angle is not more than a full turn.` };
        const one = 360 / dd;
        const a = one * n;
        return {
          problem: R`What is the measure of \(\frac{${n}}{${dd}}\) of a full turn?`,
          steps: ['A full turn is 360°.', R`One part is \(360 \div ${dd} = ${one}\) ${one === 1 ? 'degree' : 'degrees'}.`, R`${plural(n, 'part')}: \(${n} \times ${one} = ${a}\).`],
          answer: `${a}°`,
          visual: a >= 360 ? { type: 'circle', alt: 'A full circle: the whole turn, 360°.' } : { type: 'circle', sector: { start: 0, end: a }, central: { start: 0, end: a, label: `${a}°` }, alt: `A circle with ${n} of ${dd} equal parts shaded, an angle of ${a}°.` },
          note: a === 90 ? 'This is a right angle.' : a === 180 ? 'This is a straight angle.' : undefined,
        };
      },
    },
  ],

  quiz: {
    easy: [easyFigure, easyAngleKind, easyLinesKind],
    medium: [mediumTurn, mediumMissing, mediumTriangle],
    hard: [hardAdjacent, hardQuadSides, hardSymmetry],
    challenge: [challengeEqualParts, challengeTurnStory, challengeTurnFraction, challengeFacts],
  },
};
