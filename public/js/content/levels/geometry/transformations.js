import { R, q, num, frac, Frac, terms, linear, signed, point, plural, person, sqrtTex, isSquare } from '../../lib/index.js';
import { deg, degM, T, rad, dist, angleAt } from './_shared.js';

// ───────────── Transformations as data ─────────────
// Reflections and rotations about the origin as matrices [[a, b], [c, d]]: (x, y) → (ax + by, cx + dy).

const MOVES = {
  rx: { m: [[1, 0], [0, -1]], name: R`a reflection across the \(x\)-axis`, does: R`keeps \(x\) and changes the sign of \(y\)` },
  ry: { m: [[-1, 0], [0, 1]], name: R`a reflection across the \(y\)-axis`, does: R`changes the sign of \(x\) and keeps \(y\)` },
  rd: { m: [[0, 1], [1, 0]], name: R`a reflection across the line \(y = x\)`, does: 'swaps the two coordinates' },
  ra: { m: [[0, -1], [-1, 0]], name: R`a reflection across the line \(y = -x\)`, does: 'swaps the two coordinates and changes both signs' },
  r90: { m: [[0, -1], [1, 0]], name: R`a rotation of \(90^\circ\) counterclockwise about the origin`, does: 'swaps the coordinates and changes the sign of the new first coordinate' },
  r180: { m: [[-1, 0], [0, -1]], name: R`a rotation of \(180^\circ\) about the origin`, does: 'changes the sign of both coordinates' },
  r270: { m: [[0, 1], [-1, 0]], name: R`a rotation of \(270^\circ\) counterclockwise about the origin`, does: 'swaps the coordinates and changes the sign of the new second coordinate' },
};
const KEYS = Object.keys(MOVES);
const apply = (m, [x, y]) => [m[0][0] * x + m[0][1] * y + 0, m[1][0] * x + m[1][1] * y + 0];
const mul = (m2, m1) => [0, 1].map((i) => [0, 1].map((j) => m2[i][0] * m1[0][j] + m2[i][1] * m1[1][j]));
const sameM = (a, b) => a.every((row, i) => row.every((v, j) => v === b[i][j]));
const ruleTex = (m) => `(${terms([[m[0][0], 'x'], [m[0][1], 'y']])}, ${terms([[m[1][0], 'x'], [m[1][1], 'y']])})`;
const rule = (k) => R`\((x, y) \to ${ruleTex(MOVES[k].m)}\)`;
const cap = (s) => s.replace(/^an? /, '').replace(/^./, (c) => c.toUpperCase());

// The same moves computed from angles, used only to check answers a second way.
const rotateGeo = (d, [x, y]) => [x * Math.cos(rad(d)) - y * Math.sin(rad(d)), x * Math.sin(rad(d)) + y * Math.cos(rad(d))];
const reflectGeo = (phi, [x, y]) => [x * Math.cos(rad(2 * phi)) + y * Math.sin(rad(2 * phi)), x * Math.sin(rad(2 * phi)) - y * Math.cos(rad(2 * phi))];
const GEO = { rx: (p) => reflectGeo(0, p), ry: (p) => reflectGeo(90, p), rd: (p) => reflectGeo(45, p), ra: (p) => reflectGeo(135, p), r90: (p) => rotateGeo(90, p), r180: (p) => rotateGeo(180, p), r270: (p) => rotateGeo(270, p) };
const near = (p, r) => Math.abs(p[0] - r[0]) < 1e-9 && Math.abs(p[1] - r[1]) < 1e-9;

const pt = (p) => R`\(${point(p[0], p[1])}\)`;
const sq = (v) => (v < 0 ? `(${num(v)})^2` : `${num(v)}^2`);
const pT = (p) => `(${T(p[0])}, ${T(p[1])})`;
const shiftWords = (a, b) => [a && `${plural(Math.abs(a), 'unit')} ${a > 0 ? 'right' : 'left'}`, b && `${plural(Math.abs(b), 'unit')} ${b > 0 ? 'up' : 'down'}`].filter(Boolean).join(' and ');
const shiftRule = (a, b) => R`\((x, y) \to (${linear(1, a)}, ${linear(1, b, 'y')})\)`;

// A point with nonzero coordinates of different sizes, so all eight reflections and rotations of it are different.
function freePoint(rng, lim = 6) {
  for (;;) {
    const p = [rng.nonzero(-lim, lim), rng.nonzero(-lim, lim)];
    if (Math.abs(p[0]) !== Math.abs(p[1])) return p;
  }
}

// A square coordinate plane centred on the origin, big enough for everything drawn on it.
function plane(items, alt) {
  const all = [...(items.points ?? []).map((p) => [p.x, p.y]), ...(items.polygons ?? []).flatMap((pg) => pg.points), ...(items.segments ?? []).flatMap((s) => [s.from, s.to])];
  const m = Math.max(5, ...all.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) + 1;
  const lim = Math.ceil(m);
  return { type: 'plot', x: [-lim, lim], y: [-lim, lim], square: true, step: lim <= 9 ? [1, 1] : [2, 2], ...items, alt };
}
const dot1 = (p, label, color = 'a') => ({ x: p[0], y: p[1], label, color });

// ───────────── Easy ─────────────

function easyTranslate(rng) {
  const p = [rng.int(-6, 6), rng.int(-6, 6)];
  const a = rng.nonzero(-6, 6);
  const b = rng.nonzero(-6, 6);
  const img = [p[0] + a, p[1] + b];
  const words = rng.bool();
  return q({
    prompt: R`Point \(P${point(...p)}\) is translated ${words ? shiftWords(a, b) : `by the rule ${shiftRule(a, b)}`}. What are the coordinates of its image, \(P'\)?`,
    visual: plane({ points: [dot1(p, 'P')] }, `Coordinate plane with point P at ${pT(p)}.`),
    correct: pt(img),
    wrong: [
      { value: pt([p[0] - a, p[1] - b]), why: words ? 'Right and up add to the coordinates. Left and down subtract. This moves the opposite way.' : 'Follow the signs in the rule exactly. This moves the opposite way.' },
      { value: pt([p[0] + b, p[1] + a]), why: R`The horizontal change belongs to \(x\) and the vertical change belongs to \(y\).` },
      pt([p[0] + a, p[1] - b]),
      pt([p[0] - a, p[1] + b]),
      pt([a, b]),
    ],
    solution: [
      R`A translation slides every point the same way: here \(x\) changes by \(${a}\) and \(y\) changes by \(${b}\).`,
      R`\(x\): \(${p[0]} ${signed(a)} = ${img[0]}\). \(y\): \(${p[1]} ${signed(b)} = ${img[1]}\).`,
      R`\(P' = ${point(...img)}\).`,
    ],
    rule: 0,
    skill: 'translations',
    check: () => (img[0] - p[0] === a && img[1] - p[1] === b ? true : 'image is not the translated point'),
  });
}

function easyReflectAxis(rng) {
  const p = freePoint(rng);
  const k = rng.pick(['rx', 'ry']);
  const other = k === 'rx' ? 'ry' : 'rx';
  const img = apply(MOVES[k].m, p);
  const axis = k === 'rx' ? R`\(x\)-axis` : R`\(y\)-axis`;
  return q({
    prompt: R`Point \(P${point(...p)}\) is reflected across the ${axis}. What are the coordinates of \(P'\)?`,
    visual: plane({ points: [dot1(p, 'P')] }, `Coordinate plane with point P at ${pT(p)}.`),
    correct: pt(img),
    wrong: [
      { value: pt(apply(MOVES[other].m, p)), why: k === 'rx' ? R`That is the reflection across the \(y\)-axis. Across the \(x\)-axis, it is the \(y\)-coordinate that changes sign.` : R`That is the reflection across the \(x\)-axis. Across the \(y\)-axis, it is the \(x\)-coordinate that changes sign.` },
      { value: pt(apply(MOVES.r180.m, p)), why: 'Only one coordinate changes sign in a reflection across an axis.' },
      pt(apply(MOVES.rd.m, p)),
      pt(apply(MOVES.ra.m, p)),
    ],
    solution: [
      R`A reflection across the ${axis} ${MOVES[k].does}: ${rule(k)}.`,
      R`\(P${point(...p)} \to P'${point(...img)}\).`,
    ],
    rule: 1,
    skill: 'reflections across the axes',
    check: () => (near(img, GEO[k](p)) ? true : 'image is not the mirror image'),
  });
}

function easyDilate(rng) {
  const k = rng.pick([2, 3, 4, 5, frac(1, 2), frac(1, 3)]);
  const whole = !(k instanceof Frac);
  const den = whole ? 1 : k.d;
  const kv = whole ? k : k.value;
  const p = [den * rng.nonzero(-4, 4), den * rng.nonzero(-4, 4)];
  const img = [Math.round(p[0] * kv), Math.round(p[1] * kv)];
  return q({
    prompt: R`Point \(P${point(...p)}\) is dilated by a scale factor of \(${num(k)}\), with the centre of dilation at the origin. What are the coordinates of \(P'\)?`,
    visual: plane({ points: [dot1(p, 'P')] }, `Coordinate plane with point P at ${pT(p)}.`),
    correct: pt(img),
    wrong: [
      whole
        ? { value: pt([p[0] + k, p[1] + k]), why: 'A dilation multiplies each coordinate by the scale factor. It does not add it.' }
        : { value: pt([p[0] * den, p[1] * den]), why: R`A scale factor less than 1 makes a reduction. Multiply by \(${num(k)}\), which divides each coordinate by \(${den}\).` },
      { value: pt([img[0], p[1]]), why: 'Both coordinates are multiplied by the scale factor.' },
      pt([p[0], img[1]]),
      pt([-img[0], -img[1]]),
      pt([img[1], img[0]]),
    ],
    solution: [
      R`A dilation centred at the origin multiplies both coordinates by the scale factor: \((x, y) \to (${whole ? k : R`\tfrac{1}{${den}}`}x, ${whole ? k : R`\tfrac{1}{${den}}`}y)\).`,
      R`\(${num(k)} \cdot ${p[0] < 0 ? `(${p[0]})` : p[0]} = ${img[0]}\) and \(${num(k)} \cdot ${p[1] < 0 ? `(${p[1]})` : p[1]} = ${img[1]}\).`,
      R`\(P' = ${point(...img)}\).`,
    ],
    rule: 3,
    skill: 'dilations',
    check: () => (Math.abs(dist(img, [0, 0]) - kv * dist(p, [0, 0])) < 1e-9 && img[0] * p[1] === img[1] * p[0] && img[0] * p[0] > 0 ? true : 'image is not on the ray from the origin at k times the distance'),
  });
}

function easyIdentify(rng) {
  const kind = rng.pick(['Translation', 'Reflection', 'Rotation', 'Dilation']);
  const w = kind === 'Dilation' ? rng.int(2, 3) : rng.int(2, 4);
  const h = rng.intExcept(1, 4, [w]);
  // For a dilation the triangle sits far enough out that its image does not overlap it.
  const x0 = kind === 'Dilation' ? w + 1 : rng.int(1, 3);
  const y0 = kind === 'Dilation' ? rng.int(1, 2) : rng.int(1, 3);
  const tri = [[x0, y0], [x0 + w, y0], [x0, y0 + h]];
  let f;
  let why;
  if (kind === 'Translation') {
    const a = -rng.int(w + 1, 9);
    const b = rng.int(-8, 1);
    f = ([x, y]) => [x + a, y + b];
    why = [R`Compare matching vertices. Every \(x\)-coordinate changes by \(${a}\) and every \(y\)-coordinate changes by \(${b}\).`, 'Every point slides the same distance in the same direction, and the triangle does not turn or flip. That is a translation.'];
  } else if (kind === 'Reflection') {
    const k = rng.pick(['rx', 'ry']);
    f = (p) => apply(MOVES[k].m, p);
    why = [R`Compare matching vertices. Each point ${MOVES[k].does.replace('keeps', 'kept').replace('changes', 'changed')}.`, R`The image is a mirror image of the original across the ${k === 'rx' ? R`\(x\)` : R`\(y\)`}-axis. That is a reflection.`];
  } else if (kind === 'Rotation') {
    const k = rng.pick(['r90', 'r180', 'r270']);
    f = (p) => apply(MOVES[k].m, p);
    why = [R`Compare matching vertices. Each point follows the rule ${rule(k)}.`, R`Every vertex stays the same distance from the origin and the triangle has turned without flipping. That is ${MOVES[k].name}.`];
  } else {
    f = ([x, y]) => [2 * x, 2 * y];
    why = [R`Compare matching vertices. Every coordinate has been multiplied by \(2\).`, 'The image has the same shape but its sides are twice as long. That is a dilation.'];
  }
  const img = tri.map(f);
  const names = ['A', 'B', 'C'];
  const list = (pts, mark) => pts.map((p, i) => R`\(${names[i]}${mark}${point(...p)}\)`).join(', ');
  return q({
    prompt: R`Triangle \(ABC\) has vertices ${list(tri, '')}. Its image has vertices ${list(img, "'")}. Which type of transformation maps \(\triangle ABC\) onto \(\triangle A'B'C'\)?`,
    visual: plane(
      { polygons: [{ points: tri, color: 'a' }, { points: img, color: 'b' }], points: [...tri.map((p, i) => dot1(p, names[i])), ...img.map((p, i) => dot1(p, `${names[i]}′`, 'b'))] },
      `Coordinate plane with triangle ABC at ${tri.map(pT).join(', ')} and its image at ${img.map(pT).join(', ')}.`,
    ),
    correct: kind,
    wrong: ['Translation', 'Reflection', 'Rotation', 'Dilation'],
    solution: why,
    rule: { Translation: 0, Reflection: 1, Rotation: 2, Dilation: 3 }[kind],
    skill: 'identifying transformations',
    check: () => {
      const side = (t) => [dist(t[0], t[1]), dist(t[1], t[2]), dist(t[2], t[0])];
      const cross = (t) => (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]);
      const sameSize = side(tri).every((s, i) => Math.abs(s - side(img)[i]) < 1e-9);
      const flipped = cross(tri) * cross(img) < 0;
      const slid = img.every((p, i) => p[0] - tri[i][0] === img[0][0] - tri[0][0] && p[1] - tri[i][1] === img[0][1] - tri[0][1]);
      const got = !sameSize ? 'Dilation' : flipped ? 'Reflection' : slid ? 'Translation' : 'Rotation';
      return got === kind ? true : `figure looks like a ${got}`;
    },
  });
}

function easyProperty(rng) {
  const item = rng.pick([
    { ask: 'Which transformation slides every point of a figure the same distance in the same direction?', right: 'Translation', wrong: ['Reflection', 'Rotation', 'Dilation'], steps: ['A slide with no turning, flipping or resizing is a translation.'] },
    { ask: 'Which transformation flips a figure over a line, like a mirror?', right: 'Reflection', wrong: ['Translation', 'Rotation', 'Dilation'], steps: ['A mirror image across a line is a reflection.'] },
    { ask: 'Which transformation turns a figure about a fixed point?', right: 'Rotation', wrong: ['Translation', 'Reflection', 'Dilation'], steps: ['A turn about a fixed centre is a rotation.'] },
    { ask: 'Which transformation enlarges or reduces a figure without changing its shape?', right: 'Dilation', wrong: ['Translation', 'Reflection', 'Rotation'], steps: ['A dilation multiplies all distances from the centre by the scale factor, so the size changes but the shape does not.'] },
    { ask: 'Which transformation can change the lengths of the sides of a figure?', right: 'Dilation', wrong: ['Translation', 'Reflection', 'Rotation'], steps: ['Translations, reflections and rotations are rigid motions: they keep every length.', 'A dilation multiplies every length by the scale factor.'] },
    { ask: 'A triangle is rotated about the origin. Which statement about its image must be true?', right: 'It is congruent to the original triangle.', wrong: ['It is larger than the original triangle.', 'Its angles are different from the original angles.', 'It is a mirror image of the original triangle.'], steps: ['A rotation is a rigid motion. It keeps all side lengths and all angle measures.', 'So the image is congruent to the original.'] },
    { ask: 'A triangle is dilated by a scale factor of 3. Which statement about its image must be true?', right: 'Its angles are the same, but its sides are 3 times as long.', wrong: ['Its sides are the same, but its angles are 3 times as large.', 'Its sides and its angles are both 3 times as large.', 'It is congruent to the original triangle.'], steps: ['A dilation multiplies every length by the scale factor.', 'It does not change angle measures, so the shape stays the same.'] },
    { ask: 'A figure is reflected across a line. What happens to a point of the figure that lies on that line?', right: 'It stays where it is.', wrong: ['It moves to the other side of the line.', 'It moves to the origin.', 'It moves twice as far from the line.'], steps: ['A reflection sends each point to the point the same distance away on the other side of the line.', 'A point on the line is 0 units from it, so it does not move.'] },
    { ask: 'In a rotation, which point does not move?', right: 'The centre of rotation', wrong: ['The point farthest from the centre', 'Every point on the x-axis', 'Every vertex of the figure'], steps: ['Every point turns about the centre through the same angle.', 'The centre itself stays fixed.'] },
    { ask: 'A dilation has a scale factor between 0 and 1. What does it do to a figure?', right: 'It makes the figure smaller, with the same shape.', wrong: ['It makes the figure larger, with the same shape.', 'It flips the figure over.', 'It leaves the figure the same size.'], steps: ['Every length is multiplied by the scale factor.', 'Multiplying by a number between 0 and 1 makes each length shorter. This is called a reduction.'] },
    { ask: 'What is the figure called before a transformation is applied to it?', right: 'The preimage', wrong: ['The image', 'The scale factor', 'The line of symmetry'], steps: ['The figure you start with is the preimage.', 'The figure the transformation produces is the image.'] },
    { ask: 'Which three transformations are rigid motions?', right: 'Translation, reflection and rotation', wrong: ['Translation, rotation and dilation', 'Reflection, rotation and dilation', 'Translation, reflection and dilation'], steps: ['A rigid motion keeps all lengths and angles.', 'Translations, reflections and rotations do this. A dilation changes lengths.'] },
  ]);
  return q({ prompt: item.ask, correct: item.right, wrong: item.wrong, solution: item.steps, rule: 4, skill: 'properties of transformations' });
}

// ───────────── Medium ─────────────

function mediumRotate(rng) {
  const p = freePoint(rng);
  const kind = rng.pick(['r90', 'r180', 'r270', 'cw90', 'cw270']);
  const k = { cw90: 'r270', cw270: 'r90' }[kind] ?? kind;
  const turn = { r90: R`\(90^\circ\) counterclockwise`, r180: R`\(180^\circ\)`, r270: R`\(270^\circ\) counterclockwise`, cw90: R`\(90^\circ\) clockwise`, cw270: R`\(270^\circ\) clockwise` }[kind];
  const angle = { r90: 90, r180: 180, r270: 270, cw90: -90, cw270: -270 }[kind];
  const img = apply(MOVES[k].m, p);
  const opposite = k === 'r90' ? 'r270' : k === 'r270' ? 'r90' : null;
  return q({
    prompt: R`Point \(P${point(...p)}\) is rotated ${turn} about the origin. What are the coordinates of \(P'\)?`,
    visual: plane({ points: [dot1(p, 'P')], segments: [{ from: [0, 0], to: p, dashed: true, color: 'a' }] }, `Coordinate plane with point P at ${pT(p)} and a dashed segment from the origin to P.`),
    correct: pt(img),
    wrong: [
      opposite ? { value: pt(apply(MOVES[opposite].m, p)), why: 'That turns the point the opposite way. Counterclockwise is the direction from the positive x-axis toward the positive y-axis.' } : { value: pt(apply(MOVES.rx.m, p)), why: R`A half turn changes the sign of both coordinates. Changing only \(y\) is a reflection across the \(x\)-axis.` },
      { value: pt(apply(MOVES.rd.m, p)), why: R`Swapping the coordinates without changing a sign is a reflection across \(y = x\), not a rotation.` },
      k === 'r180' ? pt(apply(MOVES.ry.m, p)) : pt(apply(MOVES.r180.m, p)),
      pt(apply(MOVES.ra.m, p)),
    ],
    solution: [
      kind.startsWith('cw') ? R`A turn of ${turn} ends in the same place as a turn of \(${deg(360 + angle)}\) counterclockwise.` : null,
      R`The rule for ${MOVES[k].name} is ${rule(k)}: it ${MOVES[k].does}.`,
      R`\(P${point(...p)} \to P'${point(...img)}\).`,
    ].filter(Boolean),
    rule: 2,
    skill: 'rotations about the origin',
    check: () => (near(img, rotateGeo(angle, p)) ? true : 'image is not the rotated point'),
  });
}

function mediumReflectLine(rng) {
  const kind = rng.pick(['rd', 'ra', 'v', 'h']);
  if (kind === 'rd' || kind === 'ra') {
    const p = freePoint(rng);
    const img = apply(MOVES[kind].m, p);
    const other = kind === 'rd' ? 'ra' : 'rd';
    const sign = kind === 'rd' ? 1 : -1;
    return q({
      prompt: R`Point \(P${point(...p)}\) is reflected across the line \(y = ${kind === 'rd' ? 'x' : '-x'}\). What are the coordinates of \(P'\)?`,
      visual: plane({ points: [dot1(p, 'P')], fns: [{ f: (x) => sign * x, dashed: true, color: 'c' }] }, `Coordinate plane with point P at ${pT(p)} and the dashed line y = ${kind === 'rd' ? 'x' : '−x'}.`),
      correct: pt(img),
      wrong: [
        { value: pt(apply(MOVES[other].m, p)), why: kind === 'rd' ? R`That is the reflection across \(y = -x\). Across \(y = x\) the coordinates swap and keep their signs.` : R`That is the reflection across \(y = x\). Across \(y = -x\) the coordinates swap and both change sign.` },
        pt(apply(MOVES.r90.m, p)),
        pt(apply(MOVES.r270.m, p)),
        pt(apply(MOVES.r180.m, p)),
      ],
      solution: [R`A reflection across \(y = ${kind === 'rd' ? 'x' : '-x'}\) ${MOVES[kind].does}: ${rule(kind)}.`, R`\(P${point(...p)} \to P'${point(...img)}\).`],
      rule: 1,
      skill: 'reflections across other lines',
      check: () => {
        const mid = [(p[0] + img[0]) / 2, (p[1] + img[1]) / 2];
        return mid[1] === sign * mid[0] && (img[0] - p[0]) * 1 + (img[1] - p[1]) * sign === 0 ? true : 'the mirror line is not the perpendicular bisector of PP′';
      },
    });
  }
  const vertical = kind === 'v';
  const k = rng.nonzero(-4, 4);
  const p = [rng.int(-6, 6), rng.int(-6, 6)];
  const i = vertical ? 0 : 1;
  if (p[i] === k || p[i] === 0) p[i] = k + rng.pick([-3, -2, 2, 3]);
  const img = vertical ? [2 * k - p[0], p[1]] : [p[0], 2 * k - p[1]];
  const gap = Math.abs(p[i] - k);
  const side = vertical ? (p[0] > k ? 'right' : 'left') : p[1] > k ? 'above' : 'below';
  const far = vertical ? (p[0] > k ? 'left' : 'right') : p[1] > k ? 'below' : 'above';
  const v = vertical ? 'x' : 'y';
  return q({
    prompt: R`Point \(P${point(...p)}\) is reflected across the line \(${v} = ${k}\). What are the coordinates of \(P'\)?`,
    visual: plane({ points: [dot1(p, 'P')], ...(vertical ? { vlines: [{ x: k }] } : { hlines: [{ y: k }] }) }, `Coordinate plane with point P at ${pT(p)} and the dashed ${vertical ? 'vertical' : 'horizontal'} line ${v} = ${T(k)}.`),
    correct: pt(img),
    wrong: [
      { value: pt(vertical ? [-p[0], p[1]] : [p[0], -p[1]]), why: R`That reflects across the \(${vertical ? 'y' : 'x'}\)-axis. Here the mirror is the line \(${v} = ${k}\).` },
      { value: pt(vertical ? [k - p[0], p[1]] : [p[0], k - p[1]]), why: `The image is as far from the mirror line as the original point, on the other side. Count ${plural(gap, 'unit')} from the line, not from the axis.` },
      pt(vertical ? [p[0], 2 * k - p[1]] : [2 * k - p[0], p[1]]),
      pt(vertical ? [p[0] + 2 * k, p[1]] : [p[0], p[1] + 2 * k]),
      pt(vertical ? [2 * k + p[0], -p[1]] : [-p[0], 2 * k + p[1]]),
    ],
    solution: [
      R`The line \(${v} = ${k}\) is ${vertical ? 'vertical' : 'horizontal'}, so only the \(${v}\)-coordinate changes.`,
      R`\(P\) is ${plural(gap, 'unit')} ${side === 'right' || side === 'left' ? `to the ${side} of` : side} the line. Its image is ${plural(gap, 'unit')} ${far === 'right' || far === 'left' ? `to the ${far} of` : far} the line: \(${v} = ${k} ${far === 'right' || far === 'above' ? '+' : '-'} ${gap} = ${img[i]}\).`,
      R`\(P' = ${point(...img)}\).`,
    ],
    rule: 1,
    skill: 'reflections across other lines',
    check: () => ((p[i] + img[i]) / 2 === k && p[1 - i] === img[1 - i] ? true : 'the mirror line is not halfway between P and P′'),
  });
}

function mediumTranslationRule(rng) {
  const A = [rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const a = rng.nonzero(-7, 7);
  const b = rng.intExcept(-7, 7, [0, a]);
  const A2 = [A[0] + a, A[1] + b];
  const askRule = rng.bool();
  const steps = [R`Subtract the original coordinates from the image coordinates: \(x\) changes by \(${A2[0]} - ${A[0] < 0 ? `(${A[0]})` : A[0]} = ${a}\) and \(y\) changes by \(${A2[1]} - ${A[1] < 0 ? `(${A[1]})` : A[1]} = ${b}\).`];
  const figure = (extra = []) => plane({ points: [dot1(A, 'A'), dot1(A2, 'A′', 'b'), ...extra], segments: [{ from: A, to: A2, arrow: true, color: 'b' }] }, `Coordinate plane with an arrow from A at ${pT(A)} to A′ at ${pT(A2)}${extra.length ? `, and point B at ${pT([extra[0].x, extra[0].y])}` : ''}.`);
  if (askRule) {
    return q({
      prompt: R`A translation maps \(A${point(...A)}\) to \(A'${point(...A2)}\). Which rule describes the translation?`,
      visual: figure(),
      correct: shiftRule(a, b),
      wrong: [
        { value: shiftRule(-a, -b), why: 'Subtract in the order image minus original. This rule goes backwards, from the image to the original.' },
        { value: shiftRule(A2[0], A2[1]), why: R`Those are the coordinates of \(A'\). The rule needs the change in each coordinate.` },
        shiftRule(b, a),
        shiftRule(a, -b),
        shiftRule(-a, b),
      ],
      solution: [...steps, R`The rule is ${shiftRule(a, b)}.`],
      rule: 0,
      skill: 'translation rules',
      check: () => (A[0] + a === A2[0] && A[1] + b === A2[1] ? true : 'rule does not map A to A′'),
    });
  }
  let B = [rng.int(-6, 6), rng.int(-6, 6)];
  if (B[0] === A[0] && B[1] === A[1]) B = [A[0] + 2, A[1] - 3];
  const B2 = [B[0] + a, B[1] + b];
  return q({
    prompt: R`A translation maps \(A${point(...A)}\) to \(A'${point(...A2)}\). The same translation maps \(B${point(...B)}\) to \(B'\). What are the coordinates of \(B'\)?`,
    visual: figure([dot1(B, 'B')]),
    correct: pt(B2),
    wrong: [
      { value: pt([B[0] - a, B[1] - b]), why: R`This moves \(B\) the opposite way. \(B\) must move exactly as \(A\) did.` },
      { value: pt([B[0] + A2[0], B[1] + A2[1]]), why: R`Add the change in each coordinate, not the coordinates of \(A'\).` },
      pt([B[0] + b, B[1] + a]),
      pt([B[0] + a, B[1] - b]),
      pt([B[0] - a, B[1] + b]),
    ],
    solution: [...steps, R`A translation moves every point the same way, so add the same changes to \(B\): \((${B[0]} ${signed(a)}, ${B[1]} ${signed(b)})\).`, R`\(B' = ${point(...B2)}\).`],
    rule: 0,
    skill: 'translation rules',
    check: () => (B2[0] - B[0] === A2[0] - A[0] && B2[1] - B[1] === A2[1] - A[1] ? true : 'B did not move the same way as A'),
  });
}

function mediumDilation(rng) {
  const kind = rng.pick(['length', 'length', 'angle', 'factor']);
  const k = rng.pick([2, 3, 4, 5, frac(1, 2), frac(1, 3), frac(3, 2), frac(5, 2), frac(2, 3), frac(4, 3), frac(3, 4)]);
  const kf = k instanceof Frac ? k : frac(k, 1);
  const whole = (f) => (f.isInt() ? f.value : null);
  if (kind === 'angle') {
    const a = 12 * rng.int(2, 11);
    return q({
      prompt: R`In \(\triangle ABC\), \(m\angle A = ${deg(a)}\). The triangle is dilated by a scale factor of \(${num(k)}\). What is \(m\angle A'\) in the image?`,
      correct: a,
      fmt: degM,
      wrong: [
        { value: whole(kf.mul(a)), why: 'A dilation multiplies lengths by the scale factor. Angle measures do not change.' },
        whole(kf.inv().mul(a)),
        180 - a,
        a + 10,
        a - 10,
      ],
      solution: [R`A dilation changes the size of a figure but not its shape, so every angle keeps its measure.`, R`\(m\angle A' = ${deg(a)}\).`],
      rule: 3,
      skill: 'dilations',
    });
  }
  if (kind === 'length') {
    // A length that stays a whole number whether it is multiplied or divided by the scale factor.
    const base = kf.n * kf.d;
    const L = base * (base <= 5 ? rng.int(2, 9) : rng.int(1, 4));
    const L2 = kf.mul(L).value;
    return q({
      prompt: R`Segment \(\overline{AB}\) is \(${L}\) cm long. It is dilated by a scale factor of \(${num(k)}\). How long is its image, \(\overline{A'B'}\)?`,
      correct: L2,
      unit: 'cm',
      wrong: [
        { value: whole(kf.inv().mul(L)), why: R`Multiply the length by the scale factor. Dividing by it undoes the dilation.` },
        { value: L, why: 'Only rigid motions keep lengths the same. A dilation multiplies every length by the scale factor.' },
        kf.isInt() ? L + kf.value : null,
        whole(kf.mul(kf).mul(L)),
        L2 + 2,
        L2 + L,
      ],
      solution: [R`A dilation multiplies every length by the scale factor.`, R`\(A'B' = ${num(k)} \cdot ${L} = ${L2}\) cm.`],
      rule: 3,
      skill: 'dilations',
      check: () => (Number.isInteger(L2) && Math.abs(L2 / L - kf.value) < 1e-9 ? true : 'ratio of lengths is not the scale factor'),
    });
  }
  const L = kf.d * rng.int(2, 9);
  const L2 = kf.mul(L).value;
  return q({
    prompt: R`A dilation maps a segment \(${L}\) cm long onto a segment \(${L2}\) cm long. What is the scale factor of the dilation?`,
    correct: kf,
    wrong: [
      { value: kf.inv(), why: 'The scale factor is image length divided by original length, not the other way round.' },
      { value: Math.abs(L2 - L), why: 'A scale factor is a ratio of lengths, found by dividing, not a difference.' },
      kf.add(1),
      kf.mul(2),
      frac(L2 + 1, L),
    ],
    solution: [R`Scale factor \(= \dfrac{\text{image length}}{\text{original length}} = \dfrac{${L2}}{${L}}\).`, R`Simplify: the scale factor is \(${kf.tex()}\).${kf.value > 1 ? ' It is greater than 1, so the dilation is an enlargement.' : ' It is less than 1, so the dilation is a reduction.'}`],
    rule: 3,
    skill: 'scale factor',
    check: () => (Math.abs(kf.value * L - L2) < 1e-9 ? true : 'scale factor does not give the image length'),
  });
}

const REGULAR = [
  { name: 'an equilateral triangle', n: 3 },
  { name: 'a square', n: 4 },
  { name: 'a regular pentagon', n: 5 },
  { name: 'a regular hexagon', n: 6 },
  { name: 'a regular octagon', n: 8 },
  { name: 'a regular nonagon (9 sides)', n: 9 },
  { name: 'a regular decagon (10 sides)', n: 10 },
  { name: 'a regular dodecagon (12 sides)', n: 12 },
];
const OTHER_SHAPES = [
  { name: 'a rectangle that is not a square', lines: 2, turn: 180, pts: [[0, 0], [6, 0], [6, 3.5], [0, 3.5]], right: [0, 1, 2, 3], why: 'The two lines through the midpoints of opposite sides are lines of symmetry. The diagonals are not: folding along a diagonal does not match the corners.' },
  { name: 'a rhombus that is not a square', lines: 2, turn: 180, pts: [[0, 0], [3.5, -2], [7, 0], [3.5, 2]], marks: [1, 1, 1, 1], why: 'The two diagonals are lines of symmetry. The lines through midpoints of opposite sides are not.' },
  { name: 'a parallelogram that is not a rectangle or a rhombus', lines: 0, turn: 180, pts: [[0, 0], [5, 0], [7, 3], [2, 3]], why: 'No fold makes the two halves match, so there is no line of symmetry. A half turn about the centre does map it onto itself.' },
  { name: 'an isosceles trapezoid', lines: 1, turn: null, pts: [[0, 0], [7, 0], [5, 3], [2, 3]], marks: [0, 1, 0, 1], why: 'The only line of symmetry passes through the midpoints of the two parallel sides.' },
  { name: 'a kite that is not a rhombus', lines: 1, turn: null, pts: [[0, 0], [2, -2.2], [7, 0], [2, 2.2]], marks: [1, 2, 2, 1], why: 'The only line of symmetry is the diagonal between the two vertices where congruent sides meet.' },
  { name: 'an isosceles triangle that is not equilateral', lines: 1, turn: null, pts: [[0, 0], [4, 0], [2, 5]], marks: [0, 1, 1], why: 'The only line of symmetry runs from the vertex between the congruent sides to the midpoint of the base.' },
];
const ngon = (n, r = 3) => {
  const start = n % 2 ? 90 : 90 + 180 / n; // odd: a vertex on top; even: a flat side on top
  return Array.from({ length: n }, (_, i) => [Math.round(r * Math.cos(rad(start + (360 * i) / n)) * 1000) / 1000, Math.round(r * Math.sin(rad(start + (360 * i) / n)) * 1000) / 1000]);
};

function mediumSymmetry(rng) {
  if (rng.bool(0.6)) {
    const s = rng.pick(REGULAR);
    const turn = 360 / s.n;
    const visual = { type: 'polygon', points: ngon(s.n), alt: `${cap(s.name)}: all ${s.n} sides are congruent and all ${s.n} angles are congruent.` };
    if (rng.bool()) {
      return q({
        prompt: `How many lines of symmetry does ${s.name} have?`,
        visual,
        correct: s.n,
        wrong: [
          s.n % 2 === 0 ? { value: s.n / 2, why: 'Count both kinds of line: through opposite vertices, and through midpoints of opposite sides.' } : { value: 1, why: 'There is a line of symmetry through every vertex, not just the top one.' },
          2 * s.n,
          s.n - 1,
          s.n + 1,
          s.n - 2,
        ],
        solution: [
          s.n % 2 === 0 ? `With an even number of sides, there are ${s.n / 2} lines through pairs of opposite vertices and ${s.n / 2} lines through midpoints of opposite sides.` : 'With an odd number of sides, each line of symmetry joins a vertex to the midpoint of the opposite side. There is one for each vertex.',
          R`A regular polygon with \(n\) sides has \(n\) lines of symmetry, so the answer is \(${s.n}\).`,
        ],
        rule: 6,
        skill: 'symmetry',
      });
    }
    const interior = ((s.n - 2) * 180) / s.n;
    return q({
      prompt: R`What is the smallest angle of rotation, greater than \(0^\circ\), that maps ${s.name} onto itself?`,
      visual,
      correct: turn,
      fmt: degM,
      wrong: [
        interior !== turn ? { value: interior, why: R`That is the interior angle of the polygon. The rotation angle is \(360^\circ \div n\).` } : null,
        { value: 180 / s.n, why: R`A full turn is \(360^\circ\), not \(180^\circ\).` },
        2 * turn,
        turn + 15,
        360,
      ],
      solution: [R`The \(${s.n}\) vertices are equally spaced around the centre, so a full turn of \(360^\circ\) is split into \(${s.n}\) equal steps.`, R`\(360 \div ${s.n} = ${turn}\), so the smallest rotation is \(${deg(turn)}\).`],
      rule: 6,
      skill: 'symmetry',
      check: () => {
        const p = ngon(s.n, 1);
        const r = rotateGeo(turn, p[0]);
        return Math.abs(r[0] - p[1][0]) < 1e-3 && Math.abs(r[1] - p[1][1]) < 1e-3 ? true : 'rotation does not carry a vertex to the next vertex';
      },
    });
  }
  const s = rng.pick(OTHER_SHAPES);
  const visual = { type: 'polygon', points: s.pts, right: s.right, marks: s.marks, alt: `${cap(s.name)}.` };
  if (s.turn && rng.bool(0.4)) {
    return q({
      prompt: R`What is the smallest angle of rotation, greater than \(0^\circ\), that maps ${s.name} onto itself?`,
      visual,
      correct: 180,
      fmt: degM,
      wrong: [{ value: 90, why: 'A quarter turn swaps the long and short directions, so it only works for a square.' }, { value: 360, why: R`A full turn maps every figure onto itself. A smaller turn works here.` }, 60, 120, 45],
      solution: ['Opposite sides are parallel and congruent, so a half turn about the centre swaps each side with the opposite side.', R`No smaller turn works, so the answer is \(180^\circ\).`],
      rule: 6,
      skill: 'symmetry',
    });
  }
  return q({
    prompt: `How many lines of symmetry does ${s.name} have?`,
    visual,
    correct: s.lines,
    wrong: [0, 1, 2, 4, 3],
    solution: [s.why, R`It has \(${s.lines}\) ${s.lines === 1 ? 'line' : 'lines'} of symmetry.`],
    rule: 6,
    skill: 'symmetry',
  });
}

function mediumStory(rng) {
  const name = person(rng);
  const start = [rng.int(-5, 5), rng.int(-5, 5)];
  const a = rng.nonzero(-6, 6);
  const b = rng.nonzero(-6, 6);
  const c = rng.nonzero(-6, 6);
  const d = rng.nonzero(-6, 6);
  const mid = [start[0] + a, start[1] + b];
  const end = [mid[0] + c, mid[1] + d];
  const ew = (v) => `${plural(Math.abs(v), 'block')} ${v > 0 ? 'east' : 'west'}`;
  const ns = (v) => `${plural(Math.abs(v), 'block')} ${v > 0 ? 'north' : 'south'}`;
  const thing = rng.pick(['a delivery robot', 'a drone', 'a street sweeper', 'a food cart']);
  const it = thing.replace(/^a /, 'the ');
  return q({
    prompt: R`${name} tracks ${thing} on a city grid where each unit is one block, east is the positive \(x\)-direction and north is the positive \(y\)-direction. It starts at \(${point(...start)}\), goes ${ew(a)} and ${ns(b)}, and then goes ${ew(c)} and ${ns(d)}. Where is ${it} now?`,
    correct: pt(end),
    wrong: [
      { value: pt(mid), why: 'That is the position after the first move only.' },
      { value: pt([start[0] - a - c, start[1] - b - d]), why: R`East and north are the positive directions, so they add. West and south subtract.` },
      pt([start[0] + b + d, start[1] + a + c]),
      pt([a + c, b + d]),
      pt([end[0], start[1] + b - d]),
    ],
    solution: [
      R`Each move is a translation. The first one changes \(x\) by \(${a}\) and \(y\) by \(${b}\): \(${point(...start)} \to ${point(...mid)}\).`,
      R`The second changes \(x\) by \(${c}\) and \(y\) by \(${d}\): \(${point(...mid)} \to ${point(...end)}\).`,
      R`Together they make one translation, ${shiftRule(a + c, b + d)}. The position is \(${point(...end)}\).`,
    ],
    rule: 5,
    skill: 'transformation word problems',
    check: () => (end[0] === start[0] + a + c && end[1] === start[1] + b + d ? true : 'end point is off'),
  });
}

// ───────────── Hard ─────────────

function hardComposition(rng) {
  for (;;) {
    const kinds = rng.sample(['rx', 'ry', 'rd', 'r90', 'r180', 'r270', 'tr', 'tr'], 2);
    if (kinds[0] === 'tr' && kinds[1] === 'tr') continue;
    const a = rng.nonzero(-5, 5);
    const b = rng.nonzero(-5, 5);
    const p = freePoint(rng, 5);
    const step = (k) => (k === 'tr' ? { f: ([x, y]) => [x + a, y + b], geo: ([x, y]) => [x + a, y + b], name: `a translation of ${shiftWords(a, b)}`, rule: shiftRule(a, b) } : { f: (v) => apply(MOVES[k].m, v), geo: GEO[k], name: MOVES[k].name, rule: rule(k) });
    const [s1, s2] = kinds.map(step);
    const mid = s1.f(p);
    const end = s2.f(mid);
    const reversed = s1.f(s2.f(p));
    if (near(end, p) || near(end, mid)) continue;
    return q({
      prompt: R`Point \(P${point(...p)}\) is mapped by ${s1.name}. Then the image is mapped by ${s2.name}. What are the coordinates of the final image, \(P''\)?`,
      visual: plane({ points: [dot1(p, 'P')] }, `Coordinate plane with point P at ${pT(p)}.`),
      correct: pt(end),
      wrong: [
        near(reversed, end) ? null : { value: pt(reversed), why: 'The order matters. This applies the second transformation first.' },
        { value: pt(mid), why: 'That is the image after the first transformation only.' },
        pt(s2.f(p)),
        pt([-end[0], -end[1]]),
        pt([end[1], end[0]]),
        pt([end[0], -end[1]]),
      ],
      solution: [
        R`First apply ${s1.name}, ${s1.rule}: \(P${point(...p)} \to P'${point(...mid)}\).`,
        R`Then apply ${s2.name}, ${s2.rule}, to \(P'\): \(P'${point(...mid)} \to P''${point(...end)}\).`,
        R`\(P'' = ${point(...end)}\).`,
      ],
      rule: 5,
      skill: 'compositions',
      check: () => (near(end, s2.geo(s1.geo(p))) ? true : 'final image does not match the geometric computation'),
    });
  }
}

function hardIdentifyRule(rng) {
  const p = freePoint(rng);
  const r = freePoint(rng);
  const k = rng.pick(KEYS);
  const img = apply(MOVES[k].m, p);
  const img2 = apply(MOVES[k].m, r);
  const confusable = { rx: ['ry', 'r180', 'rd'], ry: ['rx', 'r180', 'ra'], rd: ['ra', 'r90', 'r270'], ra: ['rd', 'r270', 'r90'], r90: ['r270', 'rd', 'r180'], r180: ['rx', 'ry', 'r90'], r270: ['r90', 'ra', 'rd'] }[k];
  return q({
    prompt: R`A transformation maps \(P${point(...p)}\) to \(P'${point(...img)}\) and \(Q${point(...r)}\) to \(Q'${point(...img2)}\). Which of these transformations is it?`,
    visual: plane({ points: [dot1(p, 'P'), dot1(img, 'P′', 'b')] }, `Coordinate plane with point P at ${pT(p)} and its image P′ at ${pT(img)}.`),
    correct: cap(MOVES[k].name),
    wrong: confusable.map((w) => cap(MOVES[w].name)),
    solution: [
      R`Compare each point with its image. The transformation ${MOVES[k].does}.`,
      R`As a rule, that is ${rule(k)}.`,
      R`This is the rule for ${MOVES[k].name}.`,
    ],
    rule: k.startsWith('r') && k !== 'rx' && k !== 'ry' && k !== 'rd' && k !== 'ra' ? 2 : 1,
    skill: 'identifying transformations',
    check: () => (near(GEO[k](p), img) && near(GEO[k](r), img2) && confusable.every((w) => !near(GEO[w](p), img)) ? true : 'another choice also maps P to P′'),
  });
}

function hardScaleFactor(rng) {
  for (;;) {
    const k = rng.pick([frac(3, 2), frac(5, 2), frac(2, 3), frac(1, 3), frac(3, 4), frac(4, 3), frac(5, 3), frac(1, 4), frac(5, 4), frac(2, 5)]);
    const A = [k.d * rng.nonzero(-3, 3), k.d * rng.nonzero(-3, 3)];
    const B = [k.d * rng.nonzero(-3, 3), k.d * rng.nonzero(-3, 3)];
    if (A[0] * B[1] === A[1] * B[0]) continue; // keep B off the line through the origin and A
    const A2 = A.map((v) => (v / k.d) * k.n);
    const B2 = B.map((v) => (v / k.d) * k.n);
    const slide = [B[0] + A2[0] - A[0], B[1] + A2[1] - A[1]];
    const back = [(B[0] * k.d) / k.n, (B[1] * k.d) / k.n];
    const raw = R`\dfrac{${Math.abs(A2[0])}}{${Math.abs(A[0])}}`;
    return q({
      prompt: R`A dilation centred at the origin maps \(A${point(...A)}\) to \(A'${point(...A2)}\). What are the coordinates of \(B'\), the image of \(B${point(...B)}\)?`,
      visual: plane({ points: [dot1(A, 'A'), dot1(A2, 'A′', 'b'), dot1(B, 'B')] }, `Coordinate plane with A at ${pT(A)}, its image A′ at ${pT(A2)}, and B at ${pT(B)}.`),
      correct: pt(B2),
      wrong: [
        { value: pt(slide), why: 'A dilation multiplies every coordinate by the scale factor. Adding the same change to each point would be a translation.' },
        back.every(Number.isInteger) ? { value: pt(back), why: R`The scale factor is image over original, \(${k.tex()}\). This uses its reciprocal.` } : null,
        pt([B[0] * k.n, B[1] * k.n]),
        pt([B2[0], B[1]]),
        pt([-B2[0], -B2[1]]),
        pt([B2[1], B2[0]]),
      ],
      solution: [
        R`Find the scale factor from \(A\) and \(A'\), image over original: \(k = ${Math.abs(A2[0]) === k.n ? k.tex() : `${raw} = ${k.tex()}`}\). (The \(y\)-coordinates give the same ratio.)`,
        R`Multiply both coordinates of \(B\) by \(${k.tex()}\): \(${k.tex()} \cdot ${B[0] < 0 ? `(${B[0]})` : B[0]} = ${B2[0]}\) and \(${k.tex()} \cdot ${B[1] < 0 ? `(${B[1]})` : B[1]} = ${B2[1]}\).`,
        R`\(B' = ${point(...B2)}\).`,
      ],
      rule: 3,
      skill: 'scale factor',
      check: () => (A2[0] * B[0] === B2[0] * A[0] && A2[1] * B[1] === B2[1] * A[1] && Math.abs(dist(B2, [0, 0]) / dist(B, [0, 0]) - dist(A2, [0, 0]) / dist(A, [0, 0])) < 1e-9 ? true : 'B′ is not scaled by the same factor as A′'),
    });
  }
}

function hardSymmetryTurn(rng) {
  const s = rng.pick(REGULAR);
  const unit = 360 / s.n;
  const correct = unit * rng.int(1, s.n - 1);
  const interior = 180 - unit;
  const pool = rng.shuffle([30, 36, 40, 45, 50, 60, 72, 80, 90, 100, 108, 120, 135, 144, 150, 160, 200, 210, 216, 225, 240, 270, 300].filter((v) => v % unit !== 0));
  const wrongVals = [interior % unit !== 0 ? interior : null, ...pool].filter((v) => v != null);
  const used = [...new Set(wrongVals)].slice(0, 3);
  return q({
    prompt: `Which of these rotations about its centre maps ${s.name} onto itself?`,
    visual: { type: 'polygon', points: ngon(s.n), alt: `${cap(s.name)}: all ${s.n} sides are congruent and all ${s.n} angles are congruent.` },
    correct,
    fmt: degM,
    wrong: used.map((v) => (v === interior ? { value: v, why: R`That is the interior angle of the polygon. The rotations that work are multiples of \(360^\circ \div ${s.n}\).` } : v)),
    solution: [
      R`The smallest rotation that maps the polygon onto itself is \(360 \div ${s.n} = ${unit}\) degrees.`,
      R`Any whole-number multiple of \(${deg(unit)}\) also works: ${Array.from({ length: Math.min(5, s.n - 1) }, (_, i) => R`\(${deg(unit * (i + 1))}\)`).join(', ')}${s.n - 1 > 5 ? ', and so on' : ''}.`,
      R`Of the choices, only \(${deg(correct)}\) is a multiple of \(${deg(unit)}\): \(${correct} = ${correct / unit} \cdot ${unit}\).`,
    ],
    rule: 6,
    skill: 'symmetry',
    check: () => (correct % unit === 0 && used.length === 3 && used.every((v) => v % unit !== 0) ? true : 'a wrong choice is also a symmetry rotation'),
  });
}

function hardStory(rng) {
  const [a, b, c] = rng.pick([[3, 4, 5], [5, 5, 6], [4, 6, 7], [6, 8, 10], [5, 7, 9], [7, 7, 10], [4, 5, 6], [8, 9, 11], [6, 6, 9], [9, 10, 12]]);
  const k = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, frac(3, 2), frac(5, 2), frac(1, 2)]);
  const kv = k instanceof Frac ? k.value : k;
  const P = a + b + c;
  const name = person(rng);
  const [thing, big] = rng.pick([['a triangular logo', 'a poster'], ['a triangular sail for a model boat', 'the full-size boat'], ['a triangular patch', 'a banner'], ['a triangular garden bed on a plan', 'the real garden']]);
  const ans = kv * P;
  const sides = [a, b, c].map((s) => num(kv * s));
  const x = (b * b + c * c - a * a) / (2 * c);
  return q({
    prompt: R`${name} draws ${thing} with sides \(${a}\) cm, \(${b}\) cm and \(${c}\) cm. For ${big}, the drawing is dilated by a scale factor of \(${num(k)}\). What is the perimeter of the dilated triangle?`,
    visual: { type: 'polygon', points: [[0, 0], [c, 0], [Math.round(x * 1000) / 1000, Math.round(Math.sqrt(b * b - x * x) * 1000) / 1000]], sides: [`${c} cm`, `${a} cm`, `${b} cm`], alt: `The original triangle, with sides ${a} cm, ${b} cm and ${c} cm.` },
    correct: ans,
    unit: 'cm',
    wrong: [
      { value: P, why: 'That is the perimeter of the original drawing. A dilation multiplies every side by the scale factor.' },
      { value: kv * kv * P, why: 'Lengths, including perimeter, are multiplied by the scale factor once. Squaring it is for areas.' },
      P + kv,
      kv * c,
      ans + a,
    ],
    solution: [
      R`A dilation multiplies every length by the scale factor \(${num(k)}\): the new sides are \(${sides[0]}\), \(${sides[1]}\) and \(${sides[2]}\) cm.`,
      R`Add them: \(${sides.join(' + ')} = ${num(ans)}\).`,
      R`Shortcut: the original perimeter is \(${P}\) cm, and \(${num(k)} \cdot ${P} = ${num(ans)}\) cm.`,
    ],
    rule: 3,
    skill: 'transformation word problems',
    check: () => (Math.abs(kv * a + kv * b + kv * c - ans) < 1e-9 && a + b > c ? true : 'perimeter is not the sum of the scaled sides'),
  });
}

// ───────────── Challenge ─────────────

function challengePreimage(rng) {
  const k = rng.pick(['rx', 'ry', 'rd', 'r90', 'r180', 'r270']);
  const inv = { r90: 'r270', r270: 'r90' }[k] ?? k;
  const a = rng.nonzero(-5, 5);
  const b = rng.nonzero(-5, 5);
  const p = freePoint(rng, 5);
  const mid = apply(MOVES[k].m, p);
  const end = [mid[0] + a, mid[1] + b];
  const forward = apply(MOVES[k].m, end).map((v, i) => v + [a, b][i]);
  const wrongOrder = apply(MOVES[inv].m, end).map((v, i) => v - [a, b][i]);
  return q({
    prompt: R`A point \(P\) is mapped by ${MOVES[k].name}, and then its image is translated ${shiftWords(a, b)}. The final image is \(P''${point(...end)}\). What were the coordinates of \(P\)?`,
    visual: plane({ points: [dot1(end, 'P″', 'b')] }, `Coordinate plane with the final image P″ at ${pT(end)}.`),
    correct: pt(p),
    wrong: [
      { value: pt(mid), why: 'That undoes the translation only. The first transformation still has to be undone.' },
      near(wrongOrder, p) ? null : { value: pt(wrongOrder), why: 'Undo the steps in reverse order: the translation was done last, so undo it first.' },
      { value: pt(forward), why: 'That applies the two steps again to the final point. To go back, undo them.' },
      pt(apply(MOVES[k].m, end)),
      pt([end[0] - a, end[1] + b]),
    ],
    solution: [
      R`Work backwards, undoing the last step first. Undo the translation by moving the opposite way: \(P''${point(...end)} \to P'${point(...mid)}\).`,
      inv === k ? R`${cap(MOVES[k].name)} undoes itself, so apply ${rule(k)} to \(P'\).` : R`Undo ${MOVES[k].name} with ${MOVES[inv].name}, ${rule(inv)}.`,
      R`\(P'${point(...mid)} \to P${point(...p)}\). Check by going forwards: \(${point(...p)} \to ${point(...mid)} \to ${point(...end)}\). ✓`,
    ],
    rule: 5,
    skill: 'working backwards',
    check: () => {
      const g = GEO[k](p);
      return near([g[0] + a, g[1] + b], end) ? true : 'applying the steps to P does not give the final image';
    },
  });
}

function challengeEquivalent(rng) {
  for (;;) {
    const k1 = rng.pick(KEYS);
    const k2 = rng.pick(KEYS);
    const m = mul(MOVES[k2].m, MOVES[k1].m);
    const result = KEYS.find((k) => sameM(MOVES[k].m, m));
    if (!result) continue; // the two cancel out
    const afterFirst = ruleTex(MOVES[k1].m);
    const others = rng.shuffle(KEYS.filter((k) => k !== result && k !== k1 && k !== k2));
    const wrong = [k1 !== result ? k1 : null, k2 !== result && k2 !== k1 ? k2 : null, ...others].filter(Boolean);
    return q({
      prompt: R`A figure is mapped by ${MOVES[k1].name}. Then the image is mapped by ${MOVES[k2].name}. Which single transformation has the same effect as the two together?`,
      correct: cap(MOVES[result].name),
      wrong: wrong.map((k) => cap(MOVES[k].name)),
      solution: [
        R`Follow a general point \((x, y)\). After ${MOVES[k1].name}: \(${afterFirst}\).`,
        R`Now apply ${MOVES[k2].name}, which ${MOVES[k2].does}, to the point \(${afterFirst}\). The result is \(${ruleTex(m)}\).`,
        R`Overall \((x, y) \to ${ruleTex(m)}\), which is the rule for ${MOVES[result].name}.`,
      ],
      rule: 5,
      skill: 'compositions',
      check: () => ([[3, 1], [-2, 5]].every((p) => near(GEO[k2](GEO[k1](p)), GEO[result](p))) ? true : 'the single transformation does not match the composition'),
    });
  }
}

function challengeMirrors(rng) {
  const vertical = rng.bool();
  const a = rng.int(-5, 5);
  const b = rng.intExcept(-5, 5, [a]);
  const shift = 2 * (b - a);
  const v = vertical ? 'x' : 'y';
  const dir = (s) => (vertical ? (s > 0 ? 'right' : 'left') : s > 0 ? 'up' : 'down');
  const cross = (s) => (vertical ? (s > 0 ? 'up' : 'down') : s > 0 ? 'right' : 'left');
  const tr = (s, d) => `A translation of ${plural(Math.abs(s), 'unit')} ${d}`;
  const midline = (a + b) / 2;
  const first = terms([[2 * a, ''], [-1, v]]);
  return q({
    prompt: R`A figure is reflected across the line \(${v} = ${a}\). Then the image is reflected across the line \(${v} = ${b}\). Which single transformation has the same effect as the two reflections together?`,
    correct: tr(shift, dir(shift)),
    wrong: [
      { value: tr(shift / 2, dir(shift)), why: 'Each reflection moves a point twice its distance from the mirror, so the total shift is twice the gap between the two lines.' },
      { value: tr(shift, dir(-shift)), why: 'The shift goes from the first mirror line toward the second one.' },
      Number.isInteger(midline) ? R`A reflection across the line \(${v} = ${midline}\)` : R`A reflection across the line \(${v} = ${b}\)`,
      tr(shift, cross(shift)),
      R`A rotation of \(180^\circ\) about the origin`,
    ],
    solution: [
      R`Follow a general point. A reflection across \(${v} = k\) sends \(${v}\) to \(2k - ${v}\) and leaves the other coordinate alone. With \(k = ${a}\), \(${v}\) becomes \(${first}\).`,
      R`Reflecting that across \(${v} = ${b}\) gives \(${b === 0 ? '-' : `${2 * b} - `}(${first}) = ${linear(1, shift, v)}\).`,
      R`So every point moves \(${Math.abs(shift)}\) units ${dir(shift)}: twice the distance between the lines, in the direction from the first line to the second. Two reflections across parallel lines make a translation.`,
    ],
    rule: 5,
    skill: 'compositions',
    check: () => {
      const p = [1.5, -2.25];
      const i = vertical ? 0 : 1;
      const once = p.slice();
      once[i] = 2 * a - once[i];
      once[i] = 2 * b - once[i];
      return Math.abs(once[i] - (p[i] + shift)) < 1e-9 && once[1 - i] === p[1 - i] ? true : 'the two reflections do not give this translation';
    },
  });
}

function challengeSequence(rng) {
  const rigid = () =>
    rng.pick([
      { text: `a translation of ${shiftWords(rng.nonzero(-6, 6), rng.nonzero(-6, 6))}`, f: (p) => [p[0] + 2, p[1] - 3] },
      { text: MOVES.rx.name, f: GEO.rx },
      { text: MOVES.ry.name, f: GEO.ry },
      { text: MOVES.rd.name, f: GEO.rd },
      { text: MOVES.r90.name, f: GEO.r90 },
      { text: MOVES.r180.name, f: GEO.r180 },
    ]);
  const dilation = (k) => ({ text: R`a dilation with scale factor \(${k.tex()}\) centred at the origin`, f: (p) => [p[0] * k.value, p[1] * k.value], k });
  const factors = [frac(2, 1), frac(3, 1), frac(4, 1), frac(1, 2), frac(1, 3), frac(3, 2), frac(2, 3), frac(1, 4)];
  const plan = rng.pick(['none', 'one', 'one', 'two', 'two', 'cancel']);
  let steps;
  if (plan === 'none') steps = [rigid(), rigid(), rigid()];
  else if (plan === 'one') steps = rng.shuffle([rigid(), dilation(rng.pick(factors)), rigid()]);
  else if (plan === 'cancel') {
    const k = rng.pick(factors);
    steps = [dilation(k), rigid(), dilation(k.inv())];
  } else {
    const k1 = rng.pick(factors);
    const k2 = rng.pick(factors.filter((f) => !f.mul(k1).eq(1)));
    steps = [dilation(k1), rigid(), dilation(k2)];
  }
  if (new Set(steps.map((s) => s.text)).size < steps.length) return challengeSequence(rng);
  const ks = steps.filter((s) => s.k).map((s) => s.k);
  const total = ks.reduce((acc, k) => acc.mul(k), frac(1, 1));
  const congruent = R`It is congruent to \(\triangle ABC\).`;
  const similar = (k) => R`It is similar to \(\triangle ABC\), with sides \(${k.tex()}\) times as long.`;
  const odd = R`It has the same side lengths as \(\triangle ABC\) but different angles.`;
  const sum = ks.length === 2 ? ks[0].add(ks[1]) : null;
  let wrong;
  if (total.eq(1)) {
    wrong = ks.length
      ? [{ value: similar(sum), why: 'When dilations are combined, their scale factors multiply. Here the product is 1, so the size is back to the original.' }, similar(ks[0]), odd]
      : [similar(frac(2, 1)), odd, similar(frac(1, 2))];
  } else {
    wrong = [
      { value: congruent, why: 'A dilation with a scale factor other than 1 changes the side lengths, so the triangles cannot be congruent.' },
      sum && !sum.eq(total) ? { value: similar(sum), why: 'When dilations are combined, their scale factors multiply. They do not add.' } : similar(total.inv()),
      odd,
      similar(total.mul(total)),
    ];
  }
  return q({
    prompt: R`\(\triangle ABC\) is mapped onto \(\triangle A'B'C'\) by this sequence: ${steps.map((s) => s.text).join('; then ')}. Which statement about \(\triangle A'B'C'\) must be true?`,
    correct: total.eq(1) ? congruent : similar(total),
    wrong,
    solution: [
      'Translations, reflections and rotations are rigid motions. They keep every length and every angle.',
      ks.length === 0
        ? 'The sequence uses only rigid motions, so the image has the same side lengths and angles as the original.'
        : ks.length === 1
          ? R`The one dilation multiplies every length by \(${ks[0].tex()}\) and keeps the angles.`
          : R`The two dilations multiply every length by \(${ks[0].tex()} \cdot ${ks[1].tex()} = ${total.tex()}\) and keep the angles.`,
      total.eq(1) ? R`\(\triangle A'B'C'\) is congruent to \(\triangle ABC\).` : R`\(\triangle A'B'C'\) is similar to \(\triangle ABC\), with sides \(${total.tex()}\) times as long.`,
    ],
    rule: 4,
    skill: 'congruence and similarity',
    check: () => {
      const tri = [[1, 1], [5, 2], [2, 4]];
      const img = tri.map((p) => steps.reduce((acc, s) => s.f(acc), p));
      const ratio = dist(img[0], img[1]) / dist(tri[0], tri[1]);
      const ratio2 = dist(img[1], img[2]) / dist(tri[1], tri[2]);
      const sameAngle = Math.abs(angleAt(img[1], img[0], img[2]) - angleAt(tri[1], tri[0], tri[2])) < 1e-6;
      return Math.abs(ratio - total.value) < 1e-9 && Math.abs(ratio2 - total.value) < 1e-9 && sameAngle ? true : `side ratio is ${ratio}, expected ${total.value}`;
    },
  });
}

// ───────────── Topic ─────────────

const DEMO = [[2, 1], [6, 1], [2, 4]];

export default {
  id: 'transformations',
  title: 'Transformations',
  summary: 'Translate, reflect, rotate and dilate figures on the coordinate plane, combine moves, and describe symmetry.',
  standards: ['CCSS G-CO.A.2', 'CCSS G-CO.A.3', 'CCSS G-CO.A.4', 'CCSS G-CO.A.5', 'CCSS G-SRT.A.1'],

  explain: {
    intro: R`A transformation is a rule that moves every point of a figure (the **preimage**) to a new point (the **image**, written with a prime: \(A \to A'\)). On the coordinate plane each kind of transformation has a simple coordinate rule. Translations, reflections and rotations keep size and shape. Dilations keep shape but change size.`,
    rules: [
      {
        title: 'Translation: slide',
        text: R`A translation moves every point the same distance in the same direction. Add the horizontal change to \(x\) and the vertical change to \(y\): \((x, y) \to (x + a, y + b)\). Right and up are positive; left and down are negative.`,
        example: R`\(3\) units left and \(2\) units up: \((x, y) \to (x - 3, y + 2)\), so \((4, 1) \to (1, 3)\).`,
      },
      {
        title: 'Reflection: flip over a line',
        text: R`Each point goes to the point the same distance away on the other side of the mirror line. Across the \(x\)-axis: \((x, y) \to (x, -y)\). Across the \(y\)-axis: \((x, y) \to (-x, y)\). Across \(y = x\): \((x, y) \to (y, x)\). Across \(y = -x\): \((x, y) \to (-y, -x)\). For any other horizontal or vertical line, count the distance to the line and go the same distance past it.`,
        example: R`Reflect \((5, 2)\) across \(x = 1\): the point is \(4\) units right of the line, so its image is \(4\) units left of it, at \((-3, 2)\).`,
      },
      {
        title: 'Rotation about the origin: turn',
        text: R`Counterclockwise turns about the origin: \(90^\circ\): \((x, y) \to (-y, x)\). \(180^\circ\): \((x, y) \to (-x, -y)\). \(270^\circ\): \((x, y) \to (y, -x)\). A clockwise turn of \(90^\circ\) is the same as a counterclockwise turn of \(270^\circ\).`,
        example: R`Rotate \((3, 1)\) by \(90^\circ\) counterclockwise: \((-1, 3)\).`,
      },
      {
        title: 'Dilation about the origin: resize',
        text: R`A dilation with scale factor \(k\) centred at the origin multiplies both coordinates by \(k\): \((x, y) \to (kx, ky)\). Every length is multiplied by \(k\) and every angle stays the same. If \(k > 1\) the figure is enlarged; if \(0 < k < 1\) it is reduced. Scale factor \(=\) image length \(\div\) original length.`,
        example: R`With \(k = 2\): \((3, -1) \to (6, -2)\), and a side of length \(5\) becomes \(10\).`,
      },
      {
        title: 'Rigid motions keep lengths and angles',
        text: R`Translations, reflections and rotations are **rigid motions**: the image is congruent to the preimage. A dilation keeps angles but multiplies lengths, so the image is **similar** to the preimage (and congruent only when \(k = 1\)).`,
        example: R`A \(3\)-\(4\)-\(5\) triangle is still \(3\)-\(4\)-\(5\) after a rotation, but becomes \(6\)-\(8\)-\(10\) after a dilation with \(k = 2\).`,
      },
      {
        title: 'Compositions: one move after another',
        text: R`Apply the transformations in the order given, using the image of the first as the starting point for the second. Changing the order can change the result. To find where a point started, undo the steps in reverse order.`,
        example: R`\((2, 1)\): reflect across the \(x\)-axis to get \((2, -1)\), then translate \(3\) up to get \((2, 2)\). Translating first and then reflecting gives \((2, -4)\).`,
      },
      {
        title: 'Symmetry',
        text: R`A figure has **line symmetry** if a reflection maps it onto itself, and **rotational symmetry** if a rotation of less than \(360^\circ\) about its centre maps it onto itself. A regular polygon with \(n\) sides has \(n\) lines of symmetry, and rotations by multiples of \(360^\circ \div n\) map it onto itself.`,
        example: R`A regular hexagon has \(6\) lines of symmetry and maps onto itself under turns of \(60^\circ, 120^\circ, 180^\circ, \ldots\)`,
      },
    ],
    vocab: [
      { term: 'preimage and image', def: 'The figure before a transformation and the figure after it.' },
      { term: 'rigid motion', def: 'A transformation that keeps all lengths and angle measures: a translation, reflection or rotation.' },
      { term: 'scale factor', def: 'The number that every length is multiplied by in a dilation.' },
      { term: 'centre of rotation or dilation', def: 'The one point that does not move. In this topic it is the origin.' },
      { term: 'line of symmetry', def: 'A line that reflects a figure onto itself.' },
    ],
    mistakes: [
      R`Changing the wrong coordinate in a reflection. Across the \(x\)-axis the point moves up or down, so \(y\) changes sign and \(x\) stays.`,
      R`Swapping the coordinates in a \(90^\circ\) rotation but forgetting the sign change. \((x, y) \to (y, x)\) is a reflection across \(y = x\), not a rotation.`,
      'Adding the scale factor in a dilation. A dilation multiplies.',
      'Doing a composition in the wrong order. Do the first-named transformation first.',
    ],
    visual: plane(
      {
        polygons: [{ points: DEMO, color: 'a' }, { points: DEMO.map((p) => apply(MOVES.ry.m, p)), color: 'b' }],
        points: [dot1(DEMO[0], 'A'), dot1(DEMO[1], 'B'), dot1(DEMO[2], 'C'), ...DEMO.map((p, i) => dot1(apply(MOVES.ry.m, p), ['A′', 'B′', 'C′'][i], 'b'))],
      },
      'Triangle ABC with vertices A(2, 1), B(6, 1) and C(2, 4), and its reflection across the y-axis: A′(−2, 1), B′(−6, 1), C′(−2, 4). Each image point is the same distance from the y-axis as its original point.',
    ),
  },

  examples: [
    {
      title: 'Translate a triangle',
      problem: R`Triangle \(ABC\) has vertices \(A(1, 2)\), \(B(4, 2)\) and \(C(2, 5)\). Translate it \(5\) units left and \(3\) units down.`,
      steps: [
        R`Left and down are negative changes, so the rule is \((x, y) \to (x - 5, y - 3)\).`,
        R`\(A(1, 2) \to A'(-4, -1)\).`,
        R`\(B(4, 2) \to B'(-1, -1)\) and \(C(2, 5) \to C'(-3, 2)\).`,
        R`Check: every vertex moved the same way, so the triangle has the same size and shape.`,
      ],
      answer: R`\(A'(-4, -1)\), \(B'(-1, -1)\), \(C'(-3, 2)\)`,
      visual: plane(
        { polygons: [{ points: [[1, 2], [4, 2], [2, 5]], color: 'a' }, { points: [[-4, -1], [-1, -1], [-3, 2]], color: 'b' }], points: [dot1([1, 2], 'A'), dot1([4, 2], 'B'), dot1([2, 5], 'C'), dot1([-4, -1], 'A′', 'b'), dot1([-1, -1], 'B′', 'b'), dot1([-3, 2], 'C′', 'b')] },
        'Triangle ABC at (1, 2), (4, 2), (2, 5) and its image A′B′C′ at (−4, −1), (−1, −1), (−3, 2), which is 5 units left and 3 units down.',
      ),
    },
    {
      title: 'Reflect across an axis and across y = x',
      problem: R`Find the image of \(P(4, -2)\) after a reflection across the \(y\)-axis, and after a reflection across the line \(y = x\).`,
      steps: [
        R`Across the \(y\)-axis the point moves left or right, so \(x\) changes sign: \((x, y) \to (-x, y)\). \(P(4, -2) \to (-4, -2)\).`,
        R`Across \(y = x\) the coordinates swap: \((x, y) \to (y, x)\). \(P(4, -2) \to (-2, 4)\).`,
        R`Check the second one: the midpoint of \((4, -2)\) and \((-2, 4)\) is \((1, 1)\), which lies on \(y = x\). ✓`,
      ],
      answer: R`\((-4, -2)\) and \((-2, 4)\)`,
      visual: plane(
        { points: [dot1([4, -2], 'P'), dot1([-4, -2], '(−4, −2)', 'b'), dot1([-2, 4], '(−2, 4)', 'c')], fns: [{ f: (x) => x, dashed: true, color: 'c' }] },
        'Point P at (4, −2), its reflection across the y-axis at (−4, −2), and its reflection across the dashed line y = x at (−2, 4).',
      ),
    },
    {
      title: 'Rotate about the origin',
      problem: R`Rotate \(\triangle ABC\) with \(A(1, 1)\), \(B(4, 1)\), \(C(4, 3)\) by \(90^\circ\) counterclockwise about the origin.`,
      steps: [
        R`The rule for \(90^\circ\) counterclockwise is \((x, y) \to (-y, x)\): swap the coordinates, then change the sign of the new first coordinate.`,
        R`\(A(1, 1) \to A'(-1, 1)\).`,
        R`\(B(4, 1) \to B'(-1, 4)\) and \(C(4, 3) \to C'(-3, 4)\).`,
        R`Check: \(AB = 3\) and \(A'B' = 3\). A rotation keeps lengths.`,
      ],
      answer: R`\(A'(-1, 1)\), \(B'(-1, 4)\), \(C'(-3, 4)\)`,
      visual: plane(
        { polygons: [{ points: [[1, 1], [4, 1], [4, 3]], color: 'a' }, { points: [[-1, 1], [-1, 4], [-3, 4]], color: 'b' }], points: [dot1([1, 1], 'A'), dot1([4, 1], 'B'), dot1([4, 3], 'C'), dot1([-1, 1], 'A′', 'b'), dot1([-1, 4], 'B′', 'b'), dot1([-3, 4], 'C′', 'b')] },
        'Triangle ABC at (1, 1), (4, 1), (4, 3) and its image after a quarter turn counterclockwise about the origin, at (−1, 1), (−1, 4), (−3, 4).',
      ),
    },
    {
      title: 'Dilate and compare',
      problem: R`\(\triangle ABC\) has vertices \(A(2, 2)\), \(B(6, 2)\), \(C(2, 4)\). Dilate it by a scale factor of \(\frac{1}{2}\) centred at the origin. What happens to the side \(\overline{AB}\) and to \(\angle A\)?`,
      steps: [
        R`Multiply every coordinate by \(\frac{1}{2}\): \(A'(1, 1)\), \(B'(3, 1)\), \(C'(1, 2)\).`,
        R`\(AB = 6 - 2 = 4\) and \(A'B' = 3 - 1 = 2\). The length was multiplied by \(\frac{1}{2}\).`,
        R`\(\angle A\) is a right angle and so is \(\angle A'\). A dilation does not change angles.`,
      ],
      answer: R`\(A'(1, 1)\), \(B'(3, 1)\), \(C'(1, 2)\); sides are half as long, angles are unchanged`,
      visual: plane(
        { polygons: [{ points: [[2, 2], [6, 2], [2, 4]], color: 'a' }, { points: [[1, 1], [3, 1], [1, 2]], color: 'b' }], points: [dot1([2, 2], 'A'), dot1([6, 2], 'B'), dot1([2, 4], 'C'), dot1([1, 1], 'A′', 'b'), dot1([3, 1], 'B′', 'b'), dot1([1, 2], 'C′', 'b')], segments: [{ from: [0, 0], to: [6, 2], dashed: true, color: 'c' }, { from: [0, 0], to: [2, 4], dashed: true, color: 'c' }] },
        'Triangle ABC at (2, 2), (6, 2), (2, 4) and its half-size image at (1, 1), (3, 1), (1, 2). Dashed lines from the origin pass through each image vertex and the matching original vertex.',
      ),
    },
    {
      title: 'Word problem: two moves on a factory floor',
      word: true,
      problem: R`A robot arm holds a part whose corner is at \((4, 1)\) on a grid marked on the floor. The arm rotates the part \(90^\circ\) counterclockwise about the origin and then slides it \(3\) units right. Where does the corner end up?`,
      steps: [
        R`Two transformations happen one after the other, so do them in order.`,
        R`Rotation of \(90^\circ\) counterclockwise, \((x, y) \to (-y, x)\): \((4, 1) \to (-1, 4)\).`,
        R`Translation \(3\) units right, \((x, y) \to (x + 3, y)\): \((-1, 4) \to (2, 4)\).`,
        R`Both moves are rigid motions, so the part keeps its size and shape.`,
      ],
      answer: R`The corner ends at \((2, 4)\).`,
      visual: plane(
        { points: [dot1([4, 1], 'P'), dot1([-1, 4], 'P′', 'b'), dot1([2, 4], 'P″', 'c')], segments: [{ from: [0, 0], to: [4, 1], dashed: true, color: 'a' }, { from: [0, 0], to: [-1, 4], dashed: true, color: 'b' }, { from: [-1, 4], to: [2, 4], arrow: true, color: 'c' }] },
        'The corner starts at P(4, 1), is at P′(−1, 4) after the quarter turn about the origin, and ends at P″(2, 4) after the slide of 3 units right.',
      ),
    },
  ],

  models: [
    {
      id: 'move-a-point',
      title: 'Reflect or rotate a point',
      intro: 'Choose a point and a transformation. The rule, the image and the picture update as you type.',
      inputs: [
        { name: 'x', label: 'x-coordinate', type: 'int', min: -8, max: 8, value: 4 },
        { name: 'y', label: 'y-coordinate', type: 'int', min: -8, max: 8, value: 2 },
        {
          name: 'kind',
          label: 'Transformation',
          type: 'select',
          value: 'r90',
          options: [
            { value: 'rx', label: 'reflect across the x-axis' },
            { value: 'ry', label: 'reflect across the y-axis' },
            { value: 'rd', label: 'reflect across y = x' },
            { value: 'ra', label: 'reflect across y = −x' },
            { value: 'r90', label: 'rotate 90° counterclockwise' },
            { value: 'r180', label: 'rotate 180°' },
            { value: 'r270', label: 'rotate 270° counterclockwise' },
          ],
        },
      ],
      compute({ x, y, kind }) {
        const p = [x, y];
        const img = apply(MOVES[kind].m, p);
        const d2 = x * x + y * y;
        const isTurn = kind.startsWith('r') && kind.length > 2;
        const mirror = { rx: { hlines: [{ y: 0 }] }, ry: { vlines: [{ x: 0 }] }, rd: { fns: [{ f: (t) => t, dashed: true, color: 'c' }] }, ra: { fns: [{ f: (t) => -t, dashed: true, color: 'c' }] } }[kind] ?? {};
        const fixed = img[0] === x && img[1] === y;
        return {
          problem: R`Apply ${MOVES[kind].name} to \(P${point(x, y)}\).`,
          steps: [
            R`The rule is ${rule(kind)}: it ${MOVES[kind].does}.`,
            R`Substitute \(x = ${x}\) and \(y = ${y}\): \(P${point(x, y)} \to P'${point(...img)}\).`,
            fixed
              ? (isTurn ? R`\(P\) is the centre of rotation, so it does not move.` : R`\(P\) lies on the mirror line, so it does not move.`)
              : R`Check: this is a rigid motion, so \(P\) and \(P'\) are the same distance from the origin, \(\sqrt{${sq(x)} + ${sq(y)}} = ${sqrtTex(d2)}\).`,
          ],
          answer: R`\(P' = ${point(...img)}\)`,
          visual: plane(
            { points: [dot1(p, 'P'), dot1(img, 'P′', 'b')], segments: isTurn ? [{ from: [0, 0], to: p, dashed: true, color: 'a' }, { from: [0, 0], to: img, dashed: true, color: 'b' }] : fixed ? [] : [{ from: p, to: img, dashed: true, color: 'b' }], ...mirror },
            `Coordinate plane with P at ${pT(p)} and its image P′ at ${pT(img)}.`,
          ),
        };
      },
    },
    {
      id: 'dilate-triangle',
      title: 'Dilate a right triangle',
      intro: 'Set the legs of the triangle and the scale factor. The triangle has its right angle at A(1, 1).',
      inputs: [
        { name: 'w', label: 'Horizontal leg AB', type: 'int', min: 1, max: 6, value: 4 },
        { name: 'h', label: 'Vertical leg AC', type: 'int', min: 1, max: 6, value: 3 },
        { name: 'k', label: 'Scale factor', type: 'number', min: 0.5, max: 3, step: 0.5, value: 2 },
      ],
      compute({ w, h, k }) {
        const tri = [[1, 1], [1 + w, 1], [1, 1 + h]];
        const img = tri.map(([x, y]) => [x * k, y * k]);
        const hyp2 = w * w + h * h;
        const hyp = isSquare(hyp2) ? num(Math.sqrt(hyp2)) : sqrtTex(hyp2);
        const hypImg = isSquare(hyp2) ? num(k * Math.sqrt(hyp2)) : R`${num(k)} \cdot ${sqrtTex(hyp2)} \approx ${num(k * Math.sqrt(hyp2), { places: 2 })}`;
        return {
          problem: R`\(\triangle ABC\) has vertices \(A(1, 1)\), \(B${point(...tri[1])}\) and \(C${point(...tri[2])}\). Dilate it by a scale factor of \(${num(k)}\) centred at the origin.`,
          steps: [
            R`Multiply every coordinate by \(${num(k)}\): \(A'${point(...img[0])}\), \(B'${point(...img[1])}\), \(C'${point(...img[2])}\).`,
            R`Legs: \(AB = ${w}\) becomes \(A'B' = ${num(k * w)}\), and \(AC = ${h}\) becomes \(A'C' = ${num(k * h)}\).`,
            R`Hypotenuse: \(BC = ${hyp}\) becomes \(B'C' = ${hypImg}\). Every length is multiplied by \(${num(k)}\).`,
            R`The right angle at \(A\) is still a right angle at \(A'\), and the other angles are unchanged too. The area is multiplied by \(${num(k)}^2 = ${num(k * k)}\): from \(${num((w * h) / 2)}\) to \(${num((k * k * w * h) / 2)}\) square units.`,
          ],
          answer: k === 1 ? R`With \(k = 1\) the image is the same triangle.` : R`\(A'${point(...img[0])}\), \(B'${point(...img[1])}\), \(C'${point(...img[2])}\): ${k > 1 ? 'an enlargement' : 'a reduction'} with sides \(${num(k)}\) times as long`,
          visual: plane(
            { polygons: [{ points: tri, color: 'a' }, { points: img, color: 'b' }], points: [dot1(tri[0], 'A'), dot1(tri[1], 'B'), dot1(tri[2], 'C'), dot1(img[0], 'A′', 'b'), dot1(img[1], 'B′', 'b'), dot1(img[2], 'C′', 'b')] },
            `Triangle ABC at ${tri.map(pT).join(', ')} and its image at ${img.map(pT).join(', ')}.`,
          ),
        };
      },
    },
    {
      id: 'drone-flight',
      title: 'Word problem: a drone on a map grid',
      word: true,
      intro: 'Change the starting point and the flight. Use negative numbers for west and south.',
      inputs: [
        { name: 'x', label: 'Start: x-coordinate', type: 'int', min: -10, max: 10, value: -3 },
        { name: 'y', label: 'Start: y-coordinate', type: 'int', min: -10, max: 10, value: 2 },
        { name: 'a', label: 'Units east (negative = west)', type: 'int', min: -10, max: 10, value: 6 },
        { name: 'b', label: 'Units north (negative = south)', type: 'int', min: -10, max: 10, value: -8 },
      ],
      compute({ x, y, a, b }) {
        if (a === 0 && b === 0) return { error: 'The drone does not move. Enter a flight that goes at least 1 unit east, west, north or south.' };
        const end = [x + a, y + b];
        const d2 = a * a + b * b;
        const exact = isSquare(d2);
        const parts = [a && `${plural(Math.abs(a), 'unit')} ${a > 0 ? 'east' : 'west'}`, b && `${plural(Math.abs(b), 'unit')} ${b > 0 ? 'north' : 'south'}`].filter(Boolean).join(' and ');
        return {
          problem: R`A drone hovers at \(${point(x, y)}\) on a map grid, where east is the positive \(x\)-direction and north is the positive \(y\)-direction. It flies ${parts}. Where does it end up, and how far is that from where it started, in a straight line?`,
          steps: [
            R`The flight is a translation. East and north add; west and south subtract: ${shiftRule(a, b)}.`,
            R`Apply the rule to the start: \((${x} ${signed(a)}, ${y} ${signed(b)}) = ${point(...end)}\).`,
            a === 0 || b === 0
              ? R`The flight is along one grid direction, so the straight-line distance is \(${Math.abs(a + b)}\) units.`
              : R`The straight-line distance is the hypotenuse of a right triangle with legs \(${Math.abs(a)}\) and \(${Math.abs(b)}\): \(\sqrt{${Math.abs(a)}^2 + ${Math.abs(b)}^2} = \sqrt{${d2}}${exact ? ` = ${Math.sqrt(d2)}` : R` \approx ${num(Math.sqrt(d2), { places: 1 })}`}\) units.`,
          ],
          answer: R`It ends at \(${point(...end)}\), \(${exact ? Math.sqrt(d2) : R`\sqrt{${d2}} \approx ${num(Math.sqrt(d2), { places: 1 })}`}\) units from the start.`,
          visual: plane({ points: [dot1([x, y], 'start'), dot1(end, 'end', 'b')], segments: [{ from: [x, y], to: end, arrow: true, color: 'b' }] }, `Map grid with an arrow from the start at ${pT([x, y])} to the end at ${pT(end)}.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyTranslate, easyReflectAxis, easyDilate, easyIdentify, easyProperty],
    medium: [mediumRotate, mediumReflectLine, mediumTranslationRule, mediumDilation, mediumSymmetry, mediumStory],
    hard: [hardComposition, hardIdentifyRule, hardScaleFactor, hardSymmetryTurn, hardStory],
    challenge: [challengePreimage, challengeEquivalent, challengeMirrors, challengeSequence],
  },
};
