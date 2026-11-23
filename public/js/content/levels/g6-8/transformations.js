import { R, q, num, txt, frac, Frac, point, terms, signed, paren, round, person, checkEqual, checkAll } from '../../lib/index.js';
import { grid, clean } from './_shared.js';

const m = (tex) => R`\(${tex}\)`;
/** A point as a choice: P(3, -2) → "\((3, -2)\)". */
const P = ([x, y]) => m(point(x, y));
/** A point as plain text for pictures and alt text: "(3, −2)". */
const lab = ([x, y]) => `(${txt(x)}, ${txt(y)})`;
/** Negate without making −0. */
const neg = (v) => 0 - v;
const units = (n) => `${txt(n)} unit${n === 1 ? '' : 's'}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const same = (p, r) => p[0] === r[0] && p[1] === r[1];
const setKey = (pts) => pts.map((p) => p.join(',')).sort().join(';');
const d2 = (p, r) => (p[0] - r[0]) ** 2 + (p[1] - r[1]) ** 2;
const inBox = (pts, lim) => pts.every(([x, y]) => Math.abs(x) <= lim && Math.abs(y) <= lim);

/** "3 units right and 1 unit down" */
function dirText(a, b) {
  const parts = [];
  if (a) parts.push(`${units(Math.abs(a))} ${a > 0 ? 'right' : 'left'}`);
  if (b) parts.push(`${units(Math.abs(b))} ${b > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}

// The moves about the origin. `rule` is the image of (x, y); `inv` undoes the move.
const MOVE = {
  rx: { f: ([x, y]) => [x, neg(y)], name: R`a reflection across the \(x\)-axis`, verb: R`reflected across the \(x\)-axis`, rule: '(x, -y)', inv: 'rx', ruleNo: 1 },
  ry: { f: ([x, y]) => [neg(x), y], name: R`a reflection across the \(y\)-axis`, verb: R`reflected across the \(y\)-axis`, rule: '(-x, y)', inv: 'ry', ruleNo: 1 },
  r90: { f: ([x, y]) => [neg(y), x], name: 'a rotation of 90° counterclockwise about the origin', verb: 'rotated 90° counterclockwise about the origin', rule: '(-y, x)', inv: 'r270', ruleNo: 2 },
  r180: { f: ([x, y]) => [neg(x), neg(y)], name: 'a rotation of 180° counterclockwise about the origin', verb: 'rotated 180° counterclockwise about the origin', rule: '(-x, -y)', inv: 'r180', ruleNo: 2 },
  r270: { f: ([x, y]) => [y, neg(x)], name: 'a rotation of 270° counterclockwise about the origin', verb: 'rotated 270° counterclockwise about the origin', rule: '(y, -x)', inv: 'r90', ruleNo: 2 },
};
for (const [id, mv] of Object.entries(MOVE)) mv.id = id;
const ABOUT = ['rx', 'ry', 'r90', 'r180', 'r270'];

function shift(a, b) {
  return { id: `t${a},${b}`, f: ([x, y]) => [x + a, y + b], name: `a translation ${dirText(a, b)}`, verb: `translated ${dirText(a, b)}`, rule: `(${terms([[1, 'x'], [a, '']])}, ${terms([[1, 'y'], [b, '']])})`, a, b, ruleNo: 0 };
}
const inverse = (mv) => (mv.a != null ? shift(-mv.a, -mv.b) : MOVE[mv.inv]);
const ruleTex = (mv) => `(x, y) \\to ${mv.rule}`;
/** One line of working: the rule, then the point it gives. */
const applyStep = (mv, p, from, to) => R`${cap(mv.name)} uses the rule \(${ruleTex(mv)}\), so \(${from}${point(...p)} \to ${to}${point(...mv.f(p))}\).`;

/** A scalene triangle with whole-number vertices whose coordinates are between lo and hi, placed in a random quadrant. */
function triangle(rng, lo, hi) {
  const [sx, sy] = [rng.sign(), rng.sign()];
  for (;;) {
    const p = [0, 1, 2].map(() => [sx * rng.int(lo, hi), sy * rng.int(lo, hi)]);
    const area2 = Math.abs((p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]));
    const sides = [d2(p[0], p[1]), d2(p[1], p[2]), d2(p[2], p[0])];
    if (area2 >= 4 && new Set(sides).size === 3) return p;
  }
}

const NAMES = ['A', 'B', 'C'];
/** The first vertex that a wrong move sends to the wrong place: "B would go to (2, 3), but B′ is at (4, 1)". */
function miss(f, tri, img, mark = "'") {
  const i = Math.max(0, tri.findIndex((p, j) => !same(f(p), img[j])));
  return R`\(${NAMES[i]}\) would go to \(${point(...f(tri[i]))}\), but \(${NAMES[i]}${mark}\) is at \(${point(...img[i])}\).`;
}
/** Two triangles on one grid with labelled vertices, and an alt sentence that lists every vertex. */
function figures(orig, image, { lim = 8, mark = '′', names = NAMES, imageNames } = {}) {
  const im = imageNames ?? names.map((n) => n + mark);
  const list = (pts, ns) => pts.map((p, i) => `${ns[i]} ${lab(p)}`).join(', ');
  return grid(-lim, lim, {
    polygons: [{ points: orig, color: 'a' }, { points: image, color: 'b' }],
    points: [...orig.map(([x, y], i) => ({ x, y, label: names[i], color: 'a' })), ...image.map(([x, y], i) => ({ x, y, label: im[i], color: 'b' }))],
    alt: `Two triangles on a coordinate grid. Triangle ${names.join('')} has vertices ${list(orig, names)}. Triangle ${im.join('')} has vertices ${list(image, im)}.`,
  });
}

// ───────────── Easy: translate a point, reflect a point, name the move ─────────────

const SLIDE_STORIES = [
  (n, p, d) => `In a video game, ${n}'s character stands at the point ${p}. One move slides the character ${d}. Where does the character land?`,
  (n, p, d) => `On a coordinate map of a park, ${n}'s picnic blanket is at ${p}. ${n} drags the blanket ${d} to get into the shade. Where is the blanket now?`,
  (n, p, d) => `${n} puts a sticker at ${p} on a coordinate grid, then slides it ${d}. Where is the sticker now?`,
];

function easyTranslatePoint(rng) {
  for (;;) {
    const [x, y, a, b] = [rng.int(-6, 6), rng.int(-6, 6), rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
    const img = [x + a, y + b];
    if (!inBox([img], 8)) continue;
    const story = rng.bool(0.4);
    const d = dirText(a, b);
    return q({
      prompt: story ? rng.pick(SLIDE_STORIES)(person(rng), P([x, y]), d) : R`Point \(P${point(x, y)}\) is translated ${d}. What are the coordinates of its image, \(P'\)?`,
      visual: grid(-8, 8, { points: [{ x, y, label: story ? lab([x, y]) : `P ${lab([x, y])}` }], alt: `A coordinate grid with the point ${lab([x, y])} marked.` }),
      correct: P(img),
      wrong: [
        { value: P([x + b, y + a]), why: R`Moving left or right changes the \(x\)-coordinate. Moving up or down changes the \(y\)-coordinate.` },
        { value: P([x - a, y - b]), why: 'Moving right or up adds; moving left or down subtracts. Both moves went the wrong way here.' },
        P([x + a, y - b]),
        P([x - a, y + b]),
      ],
      solution: [
        R`Moving ${units(Math.abs(a))} ${a > 0 ? 'right adds' : 'left subtracts'} \(${Math.abs(a)}\) ${a > 0 ? 'to' : 'from'} the \(x\)-coordinate: \(${x} ${signed(a)} = ${img[0]}\).`,
        R`Moving ${units(Math.abs(b))} ${b > 0 ? 'up adds' : 'down subtracts'} \(${Math.abs(b)}\) ${b > 0 ? 'to' : 'from'} the \(y\)-coordinate: \(${y} ${signed(b)} = ${img[1]}\).`,
        R`The image is \(${point(...img)}\).`,
      ],
      rule: 0,
      skill: 'translating a point',
      check: () => {
        let [px, py] = [x, y];
        for (let i = 0; i < Math.abs(a); i++) px += Math.sign(a);
        for (let i = 0; i < Math.abs(b); i++) py += Math.sign(b);
        return checkAll(checkEqual(px, img[0]), checkEqual(py, img[1]));
      },
    });
  }
}

function easyReflectPoint(rng) {
  for (;;) {
    const [x, y] = [rng.nonzero(-7, 7), rng.nonzero(-7, 7)];
    if (Math.abs(x) === Math.abs(y)) continue;
    const mv = MOVE[rng.pick(['rx', 'ry'])];
    const other = MOVE[mv.id === 'rx' ? 'ry' : 'rx'];
    const img = mv.f([x, y]);
    const xAxis = mv.id === 'rx';
    return q({
      prompt: R`Point \(P${point(x, y)}\) is ${mv.verb}. What are the coordinates of its image, \(P'\)?`,
      visual: grid(-8, 8, { points: [{ x, y, label: `P ${lab([x, y])}` }], alt: `A coordinate grid with the point P ${lab([x, y])} marked.` }),
      correct: P(img),
      wrong: [
        { value: P(other.f([x, y])), why: xAxis ? R`That is the reflection across the \(y\)-axis. Across the \(x\)-axis, the point flips up or down: \(x\) stays the same and \(y\) changes sign.` : R`That is the reflection across the \(x\)-axis. Across the \(y\)-axis, the point flips left or right: \(y\) stays the same and \(x\) changes sign.` },
        { value: P([neg(x), neg(y)]), why: 'Only one coordinate changes sign in a reflection across an axis. Changing both is a 180° rotation.' },
        P([y, x]),
        P(xAxis ? [neg(y), x] : [y, neg(x)]),
      ],
      solution: [
        xAxis ? R`A reflection across the \(x\)-axis flips the point up or down. The rule is \(${ruleTex(mv)}\).` : R`A reflection across the \(y\)-axis flips the point left or right. The rule is \(${ruleTex(mv)}\).`,
        R`So \(${point(x, y)} \to ${point(...img)}\). The point and its image are the same distance from the ${xAxis ? R`\(x\)` : R`\(y\)`}-axis, on opposite sides.`,
      ],
      rule: 1,
      skill: 'reflecting a point',
      check: () => {
        const mid = [(x + img[0]) / 2, (y + img[1]) / 2];
        return xAxis ? checkAll(checkEqual(mid[1], 0), checkEqual(img[0], x)) : checkAll(checkEqual(mid[0], 0), checkEqual(img[1], y));
      },
    });
  }
}

function easyNameTransformation(rng) {
  for (;;) {
    const tri = triangle(rng, 1, 6);
    const kind = rng.pick(['t', 'rx', 'ry', 'r180']);
    const right = kind === 't' ? shift(rng.nonzero(-6, 6), rng.nonzero(-6, 6)) : MOVE[kind];
    const img = tri.map(right.f);
    if (!inBox(img, 8)) continue;
    const slide = shift(img[0][0] - tri[0][0], img[0][1] - tri[0][1]);
    const others = ['rx', 'ry', 'r180'].filter((k) => k !== kind).map((k) => MOVE[k]);
    if (kind !== 't') others.unshift(slide);
    else others.push(MOVE.r90);
    if (others.some((o) => setKey(tri.map(o.f)) === setKey(img))) continue;
    return q({
      prompt: R`Triangle \(A'B'C'\) is the image of triangle \(ABC\). Which single transformation maps triangle \(ABC\) onto triangle \(A'B'C'\)?`,
      visual: figures(tri, img),
      correct: cap(right.name),
      wrong: others.map((o) => ({ value: cap(o.name), why: `With that move, ${miss(o.f, tri, img)}` })),
      solution: [
        R`Follow one vertex: \(A${point(...tri[0])}\) goes to \(A'${point(...img[0])}\).`,
        kind === 't' ? R`Every vertex moves the same way, ${dirText(right.a, right.b)}, and the triangle still faces the same way. That is a translation.` : R`The rule \(${ruleTex(right)}\) sends every vertex to its image: for example \(B${point(...tri[1])} \to B'${point(...img[1])}\).`,
        R`So the transformation is ${right.name}.`,
      ],
      rule: right.ruleNo,
      skill: 'naming a transformation',
      check: () => ([0, 1, 2].every((i) => d2(tri[i], tri[(i + 1) % 3]) === d2(img[i], img[(i + 1) % 3])) ? true : 'the image is not congruent'),
    });
  }
}

// ───────────── Medium: rotate a point, find the rule, dilate, what is kept ─────────────

const ROTATION_SLIPS = {
  r90: [{ id: 'r270', why: 'That is a 90° turn clockwise. Counterclockwise is the opposite way to the hands of a clock: from quadrant I toward quadrant II.' }, { id: 'ry' }, { id: 'swap' }],
  r270: [{ id: 'r90', why: 'That is a 90° turn counterclockwise. A 270° counterclockwise turn ends in the same place as a 90° turn clockwise.' }, { id: 'rx' }, { id: 'swap' }],
  r180: [{ id: 'rx', why: 'A 180° rotation changes the sign of both coordinates, not just one.' }, { id: 'ry', why: 'A 180° rotation changes the sign of both coordinates, not just one.' }, { id: 'r90' }],
};

function mediumRotatePoint(rng) {
  for (;;) {
    const [x, y] = [rng.nonzero(-7, 7), rng.nonzero(-7, 7)];
    if (Math.abs(x) === Math.abs(y)) continue;
    const mv = MOVE[rng.pick(['r90', 'r180', 'r270'])];
    const img = mv.f([x, y]);
    const angle = { r90: 90, r180: 180, r270: 270 }[mv.id];
    return q({
      prompt: R`Point \(P${point(x, y)}\) is ${mv.verb}. What are the coordinates of its image, \(P'\)?`,
      visual: grid(-8, 8, { points: [{ x: 0, y: 0, label: 'O' }, { x, y, label: `P ${lab([x, y])}` }], segments: [{ from: [0, 0], to: [x, y], dashed: true }], alt: `A coordinate grid with the origin O and the point P ${lab([x, y])} marked, joined by a dashed segment.` }),
      correct: P(img),
      wrong: ROTATION_SLIPS[mv.id].map((s) => ({ value: P(s.id === 'swap' ? [y, x] : MOVE[s.id].f([x, y])), why: s.why })),
      solution: [
        R`A rotation of ${angle}° counterclockwise about the origin uses the rule \(${ruleTex(mv)}\).`,
        R`Here \(x = ${x}\) and \(y = ${y}\), so the image is \(${point(...img)}\).`,
        R`Check: \(P\) and \(P'\) are the same distance from the origin, and the turn from \(P\) to \(P'\) is a ${angle === 180 ? 'half turn' : angle === 90 ? 'quarter turn counterclockwise' : 'three-quarter turn counterclockwise'}.`,
      ],
      rule: 2,
      skill: 'rotating a point',
      check: () => {
        const turn = ((Math.atan2(img[1], img[0]) - Math.atan2(y, x)) * 180) / Math.PI;
        return checkAll(checkEqual(x * x + y * y, img[0] ** 2 + img[1] ** 2), checkEqual(((turn % 360) + 360) % 360, angle));
      },
    });
  }
}

const RULE_SLIPS = { r90: ['r270', 'ry', 'slide'], r270: ['r90', 'rx', 'slide'], rx: ['ry', 'r180', 'slide'], ry: ['rx', 'r180', 'slide'], r180: ['r90', 'rx', 'ry'] };

function mediumRuleForImage(rng) {
  for (;;) {
    const tri = triangle(rng, 1, 6);
    const kind = rng.pick(['t', 'rx', 'ry', 'r90', 'r180', 'r270']);
    const right = kind === 't' ? shift(rng.nonzero(-5, 5), rng.nonzero(-5, 5)) : MOVE[kind];
    const img = tri.map(right.f);
    if (!inBox(img, 8)) continue;
    const slide = shift(img[0][0] - tri[0][0], img[0][1] - tri[0][1]);
    const others = kind === 't' ? [shift(right.b, right.a), shift(-right.a, -right.b), MOVE.r180, MOVE.rx] : RULE_SLIPS[kind].map((k) => (k === 'slide' ? slide : MOVE[k]));
    if (others.some((o) => setKey(tri.map(o.f)) === setKey(img))) continue;
    const why = (o) => (o.id === 'r270' && kind === 'r90' ? 'That rule turns the figure 90° clockwise. ' : o.id === 'r90' && kind === 'r270' ? 'That rule turns the figure 90° counterclockwise. ' : '');
    return q({
      prompt: R`Triangle \(A'B'C'\) is the image of triangle \(ABC\). Which rule maps triangle \(ABC\) onto triangle \(A'B'C'\)?`,
      visual: figures(tri, img),
      correct: m(ruleTex(right)),
      wrong: others.map((o) => ({ value: m(ruleTex(o)), why: `${why(o)}With that rule, ${miss(o.f, tri, img)}` })),
      solution: [
        R`Compare a vertex with its image: \(A${point(...tri[0])} \to A'${point(...img[0])}\) and \(B${point(...tri[1])} \to B'${point(...img[1])}\).`,
        kind === 't' ? R`Each \(x\)-coordinate changes by \(${right.a}\) and each \(y\)-coordinate by \(${right.b}\).` : R`The new coordinates are made from the old ones by the rule \(${ruleTex(right)}\). It works for \(C\) too: \(${point(...tri[2])} \to ${point(...img[2])}\).`,
        R`The rule is \(${ruleTex(right)}\): ${right.name}.`,
      ],
      rule: right.ruleNo,
      skill: 'coordinate rules',
      check: () => (tri.every((p, i) => same(right.f(p), img[i])) && others.every((o) => !tri.every((pt, i) => same(o.f(pt), img[i]))) ? true : 'a wrong rule also fits'),
    });
  }
}

function mediumDilate(rng) {
  const k = rng.pick([frac(2), frac(3), frac(1, 2), frac(3, 2), frac(1, 3)]);
  let x;
  let y;
  do [x, y] = [k.d * rng.nonzero(-4, 4), k.d * rng.nonzero(-4, 4)];
  while (Math.abs(k.value * x) > 12 || Math.abs(k.value * y) > 12 || Math.abs(x) > 12 || Math.abs(y) > 12 || Math.abs(x) === Math.abs(y));
  const img = [k.value * x, k.value * y];
  const far = k.value > 1 ? img : [x, y];
  const visual = grid(-12, 12, { points: [{ x: 0, y: 0, label: 'O' }, { x, y, label: 'A' }, { x: img[0], y: img[1], label: 'A′', color: 'b' }], segments: [{ from: [0, 0], to: far, dashed: true }], alt: `A coordinate grid with the origin O, the point A ${lab([x, y])} and the point A′ ${lab(img)} marked. A dashed ray from O passes through both points.` });
  const kt = k.tex();
  if (rng.bool()) {
    return q({
      prompt: R`Point \(A${point(x, y)}\) is dilated from the origin with a scale factor of \(${kt}\). What are the coordinates of its image, \(A'\)?`,
      correct: P(img),
      wrong: [
        k.isInt() ? { value: P([x + k.value, y + k.value]), why: 'A dilation multiplies each coordinate by the scale factor. It does not add it.' } : { value: P([x / k.value, y / k.value]), why: R`A scale factor less than 1 shrinks the figure toward the origin. Multiply by \(${kt}\); do not divide.` },
        { value: P([img[0], y]), why: 'Multiply both coordinates by the scale factor, not just the first one.' },
        P([x, img[1]]),
        P([img[1], img[0]]),
      ],
      solution: [R`A dilation from the origin with scale factor \(k\) uses the rule \((x, y) \to (kx, ky)\).`, R`Multiply each coordinate by \(${kt}\): \(${kt} \times ${paren(x)} = ${img[0]}\) and \(${kt} \times ${paren(y)} = ${img[1]}\).`, R`The image is \(${point(...img)}\).`],
      rule: 4,
      skill: 'dilating a point',
      visual: grid(-12, 12, { points: [{ x: 0, y: 0, label: 'O' }, { x, y, label: `A ${lab([x, y])}` }], alt: `A coordinate grid with the origin O and the point A ${lab([x, y])} marked.` }),
      check: () => checkAll(checkEqual(img[0] * y - img[1] * x, 0), checkEqual(Math.hypot(...img) / Math.hypot(x, y), k.value)),
    });
  }
  const diff = img[0] - x;
  return q({
    prompt: R`A dilation from the origin maps \(A${point(x, y)}\) to \(A'${point(...img)}\). What is the scale factor?`,
    visual,
    correct: k,
    wrong: [{ value: k.inv(), why: R`The scale factor is image ÷ original: \(${img[0]} \div ${paren(x)}\). That answer divides the other way.` }, Number.isInteger(diff) && !k.eq(diff) ? { value: diff, why: 'A dilation multiplies the coordinates. The scale factor is the number they are multiplied by, not the amount added.' } : null, k.add(1), k.mul(2)],
    solution: [R`In a dilation from the origin, each coordinate of the image is the scale factor times the original coordinate.`, R`\(${num(img[0])} \div ${paren(x)} = ${kt}\) and \(${num(img[1])} \div ${paren(y)} = ${kt}\).`, R`The scale factor is \(${kt}\)${k.value < 1 ? ', so the image is smaller than the original' : ', so the image is larger than the original'}.`],
    rule: 4,
    skill: 'finding a scale factor',
    check: () => checkAll(checkEqual(img[0] / x, k.value), checkEqual(img[1] / y, k.value)),
  });
}

function mediumKeptOrChanged(rng) {
  const first = rng.pick(['r90', 'rx', 't', 'none']);
  const k = rng.pick([2, 3, frac(1, 2)]);
  const kv = k instanceof Frac ? k.value : k;
  const L = (k instanceof Frac ? 2 : 1) * rng.int(2, 9);
  const th = 5 * rng.int(4, kv === 3 ? 11 : 14);
  const kL = kv * L;
  const a = rng.nonzero(-5, 5);
  const pre = { r90: 'rotated 90° counterclockwise about the origin and then', rx: R`reflected across the \(x\)-axis and then`, t: `translated ${dirText(a, 0)} and then`, none: '' }[first];
  const choice = (len, ang) => R`\(A'B' = ${num(len)}\) and \(\angle A' = ${ang}^\circ\)`;
  const moveSlip = { r90: [choice(kL, th + 90), 'A rotation turns the figure, but every angle keeps its size.'], rx: [choice(kL, 180 - th), 'A reflection flips the figure, but every angle keeps its size.'], t: [choice(kL + Math.abs(a), th), 'A translation slides the figure without changing any length. Only the dilation changes lengths.'], none: [choice(L, kv * th), 'Lengths are multiplied by the scale factor, and angles stay the same.'] }[first];
  return q({
    prompt: R`In triangle \(ABC\), \(AB = ${L}\) units and \(\angle A = ${th}^\circ\). The triangle is ${pre ? `${pre} ` : ''}dilated from the origin with a scale factor of \(${num(k)}\). What are \(A'B'\) and \(\angle A'\) in the image?`,
    correct: choice(kL, th),
    wrong: [
      { value: choice(kL, kv * th), why: 'A dilation multiplies lengths by the scale factor, but angles keep their size. That is why the image has the same shape.' },
      { value: choice(L, th), why: R`A dilation with scale factor \(${num(k)}\) changes every length: \(${num(k)} \times ${L} = ${num(kL)}\).` },
      { value: moveSlip[0], why: moveSlip[1] },
      choice(L + kv, th),
    ],
    solution: [
      first === 'none' ? 'There is only one transformation: the dilation.' : R`The first move is a rigid motion, so it keeps every length and every angle: \(AB\) is still \(${L}\) and \(\angle A\) is still \(${th}^\circ\).`,
      R`The dilation multiplies every length by \(${num(k)}\): \(A'B' = ${num(k)} \times ${L} = ${num(kL)}\).`,
      R`A dilation keeps angles the same, so \(\angle A' = ${th}^\circ\).`,
    ],
    rule: 4,
    skill: 'what transformations keep',
    check: () => {
      // Build a real triangle with AB = L and angle A = th, transform it, and measure.
      const rad = (th * Math.PI) / 180;
      let pts = [[1, 2], [1 + L, 2], [1 + 3 * Math.cos(rad), 2 + 3 * Math.sin(rad)]];
      if (first === 'r90') pts = pts.map(([x, y]) => [-y, x]);
      if (first === 'rx') pts = pts.map(([x, y]) => [x, -y]);
      if (first === 't') pts = pts.map(([x, y]) => [x + a, y]);
      pts = pts.map(([x, y]) => [kv * x, kv * y]);
      const [A, B, C] = pts;
      const u = [B[0] - A[0], B[1] - A[1]];
      const v = [C[0] - A[0], C[1] - A[1]];
      const ang = (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI;
      return checkAll(checkEqual(round(Math.hypot(...u), 6), kL), checkEqual(round(ang, 6), th));
    },
  });
}

// ───────────── Hard: two moves in a row, which sequence, similar figures ─────────────

const TWIN = { rx: 'ry', ry: 'rx', r90: 'r270', r270: 'r90', r180: 'rx' };

function twoMoves(rng) {
  const ids = rng.sample(['rx', 'ry', 'r90', 'r180', 'r270', 't'], 2);
  return ids.map((id) => (id === 't' ? shift(rng.nonzero(-4, 4), rng.nonzero(-4, 4)) : MOVE[id]));
}

function hardSequencePoint(rng) {
  for (;;) {
    const [M1, M2] = twoMoves(rng);
    const p = [rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
    const mid = M1.f(p);
    const end = M2.f(mid);
    const cands = [{ value: P(M1.f(M2.f(p))), why: 'The order matters. Do the first move, then apply the second move to that image.' }, { value: P(mid), why: 'That is where the point is after the first move only.' }, { value: P(M2.f(p)), why: 'That applies only the second move to the original point.' }, P([neg(end[0]), neg(end[1])])];
    if (!inBox([mid, end], 9) || new Set(cands.map((c) => c.value ?? c).filter((c) => c !== P(end))).size < 3) continue;
    return q({
      prompt: R`Point \(P${point(...p)}\) is ${M1.verb}. Its image is then ${M2.verb}. What are the coordinates of the final image, \(P''\)?`,
      correct: P(end),
      wrong: cands,
      solution: [applyStep(M1, p, 'P', "P'"), applyStep(M2, mid, "P'", "P''"), R`The final image is \(${point(...end)}\).`],
      rule: 3,
      skill: 'sequences of transformations',
      check: () => (same(inverse(M1).f(inverse(M2).f(end)), p) ? true : 'undoing the moves does not return to P'),
    });
  }
}

function hardWhichSequence(rng) {
  for (;;) {
    const tri = triangle(rng, 1, 5);
    const about = MOVE[rng.pick(ABOUT)];
    const t = shift(rng.nonzero(-4, 4), rng.nonzero(-4, 4));
    const seq = rng.bool() ? [about, t] : [t, about];
    const run = (s) => (pt) => s[1].f(s[0].f(pt));
    const img = tri.map(run(seq));
    if (!inBox(img, 9) || !inBox(tri.map(seq[0].f), 9)) continue;
    const swapT = (mv) => (mv === t ? shift(-t.a, -t.b) : mv);
    const twin = (mv) => (mv === about ? MOVE[TWIN[about.id]] : mv);
    const cands = [[seq[1], seq[0]], seq.map(twin), seq.map(swapT), [twin(seq[1]), twin(seq[0])]];
    const wrong = cands.filter((s) => setKey(tri.map(run(s))) !== setKey(img));
    const text = (s) => `${cap(s[0].name)}, then ${s[1].name}`;
    if (new Set(wrong.map(text)).size < 3) continue;
    return q({
      prompt: R`Triangle \(A''B''C''\) is the image of triangle \(ABC\) after two transformations. Which sequence maps triangle \(ABC\) onto triangle \(A''B''C''\)?`,
      visual: figures(tri, img, { lim: 9, mark: '″' }),
      correct: text(seq),
      wrong: wrong.map((s) => ({ value: text(s), why: R`${s[0] === seq[1] && s[1] === seq[0] ? 'The order matters here. ' : ''}With that sequence, ${miss(run(s), tri, img, "''")}` })),
      solution: [applyStep(seq[0], tri[0], 'A', "A'"), applyStep(seq[1], seq[0].f(tri[0]), "A'", "A''"), R`The same two moves send \(B${point(...tri[1])}\) to \(${point(...img[1])}\) and \(C${point(...tri[2])}\) to \(${point(...img[2])}\), so the sequence is ${seq[0].name}, then ${seq[1].name}.`],
      rule: 3,
      skill: 'describing a sequence',
      check: () => (tri.every((pt, i) => same(inverse(seq[0]).f(inverse(seq[1]).f(img[i])), pt)) ? true : 'the sequence does not map the triangle'),
    });
  }
}

/** A triangle with sides AB = c, BC = a, CA = b, drawn from A(0, 0) and B(c, 0). */
function trianglePoints(a, b, c) {
  const x = (c * c + b * b - a * a) / (2 * c);
  return [[0, 0], [c, 0], [x, Math.sqrt(b * b - x * x)]];
}

function hardSimilar(rng) {
  if (rng.bool()) {
    const name = person(rng);
    const h = rng.pick([1.2, 1.4, 1.5, 1.6, 1.8]);
    const s = rng.pick([0.8, 1, 1.2, 1.5, 2, 2.4]);
    const k = rng.int(3, 12);
    const [S, H] = [round(s * k, 2), round(h * k, 2)];
    const thing = rng.pick(['flagpole', 'tree', 'lamppost', 'building']);
    return q({
      prompt: `At the same time of day, ${name} and a ${thing} stand on flat ground in the sun. ${name} is ${num(h)} m tall and casts a shadow ${num(s)} m long. The ${thing} casts a shadow ${num(S)} m long. How tall is the ${thing}?`,
      correct: H,
      unit: 'm',
      wrong: [{ value: clean(round((S * s) / h, 6)), why: 'Match the parts: height goes with height and shadow goes with shadow. That ratio is upside down.' }, { value: clean(round(S - s + h, 6)), why: 'Similar triangles grow by multiplying, not by adding the same amount.' }, clean(round(S * h, 6)), clean(round(H + h, 6))],
      solution: [
        `Each height and its shadow make a right triangle. The sun's rays hit the ground at the same angle, so the two triangles have two pairs of equal angles. By AA they are similar.`,
        R`The ${thing}'s shadow is \(${num(S)} \div ${num(s)} = ${k}\) times as long as ${name}'s shadow, so the scale factor is \(${k}\).`,
        R`Height of the ${thing}: \(${k} \times ${num(h)} = ${num(H)}\) m.`,
      ],
      rule: 5,
      skill: 'similar triangles in stories',
      check: () => checkEqual(round(H / S, 9), round(h / s, 9)),
    });
  }
  for (;;) {
    const k = rng.pick([frac(2), frac(3), frac(1, 2), frac(3, 2), frac(5, 2)]);
    const [p, qq, r] = [0, 1, 2].map(() => k.d * rng.int(2, 8));
    if (p + qq <= r || qq + r <= p || r + p <= qq || new Set([p, qq, r]).size < 3) continue;
    const [DE, EF] = [k.mul(p), k.mul(qq)];
    const add = DE.sub(p).add(qq);
    const pts = trianglePoints(qq, r, p);
    const big = pts.map(([x, y]) => [x * k.value, y * k.value]);
    return q({
      prompt: R`Triangle \(ABC\) is similar to triangle \(DEF\), with \(A\) matching \(D\), \(B\) matching \(E\) and \(C\) matching \(F\). \(AB = ${p}\), \(BC = ${qq}\), \(CA = ${r}\) and \(DE = ${DE.tex()}\). How long is \(EF\)? (The pictures are not drawn to scale.)`,
      visual: [
        { type: 'polygon', points: pts, vertices: ['A', 'B', 'C'], sides: [String(p), String(qq), String(r)], alt: `Triangle ABC with AB = ${p}, BC = ${qq} and CA = ${r}.` },
        { type: 'polygon', points: big, vertices: ['D', 'E', 'F'], sides: [DE.text(), '?', ''], alt: `Triangle DEF with DE = ${DE.text()}. Side EF is marked with a question mark.` },
      ],
      correct: EF,
      wrong: [{ value: add.value > 0 && !add.eq(EF) ? add : null, why: R`Similar figures change size by multiplying. \(DE\) is \(${k.tex()}\) times \(AB\), so \(EF\) is \(${k.tex()}\) times \(BC\). ${DE.value > p ? 'Adding' : 'Taking away'} the same amount, \(${DE.sub(p).abs().tex()}\), does not keep the shape.` }, { value: k.mul(r), why: R`\(EF\) matches \(BC\), not \(CA\), because \(E\) matches \(B\) and \(F\) matches \(C\).` }, k.inv().mul(qq)],
      solution: [R`Matching sides: \(DE\) goes with \(AB\) and \(EF\) goes with \(BC\).`, R`Scale factor: \(\frac{DE}{AB} = \frac{${DE.tex()}}{${p}} = ${k.tex()}\).`, R`So \(EF = ${k.tex()} \times ${qq} = ${EF.tex()}\).`],
      rule: 5,
      skill: 'missing side of similar figures',
      check: () => checkEqual(EF.value / qq, DE.value / p),
    });
  }
}

// ───────────── Challenge: AA, work backwards, congruent or similar ─────────────

function challengeAngles(rng) {
  for (;;) {
    const a = 5 * rng.int(5, 16);
    const b = 5 * rng.int(5, 16);
    const c = 180 - a - b;
    if (a === b || c < 20 || c === a || c === b) continue;
    const deg = (v) => R`\(${v}^\circ\)`;
    if (rng.bool(0.45)) {
      return q({
        prompt: R`Triangle \(ABC\) is similar to triangle \(DEF\), with \(A\) matching \(D\), \(B\) matching \(E\) and \(C\) matching \(F\). \(\angle A = ${a}^\circ\) and \(\angle E = ${b}^\circ\). What is \(\angle F\)?`,
        correct: c,
        fmt: deg,
        wrong: [{ value: a, why: R`\(\angle F\) matches \(\angle C\), not \(\angle A\).` }, { value: a + b, why: R`The three angles add to \(180^\circ\), so subtract \(${a} + ${b}\) from \(180\).` }, 180 - a, 180 - b],
        solution: [R`Matching angles of similar triangles are equal, so \(\angle D = ${a}^\circ\) and \(\angle E = ${b}^\circ\).`, R`The angles of triangle \(DEF\) add to \(180^\circ\): \(\angle F = 180 - ${a} - ${b} = ${c}\).`, R`So \(\angle F = ${c}^\circ\).`],
        rule: 5,
        skill: 'angles of similar triangles',
        check: () => checkEqual(a + b + c, 180),
      });
    }
    const yes = rng.bool();
    const d = yes ? c : 5 * rng.int(5, 20);
    if (!yes && (d === b || d === c || a + d >= 160 || d === a)) continue;
    const e = 180 - a - d;
    const YES = R`Yes. The third angle of triangle \(ABC\) is \(${c}^\circ\), so two pairs of angles are equal.`;
    const NO = R`No. Triangle \(ABC\) has angles \(${a}^\circ\), \(${b}^\circ\) and \(${c}^\circ\), but triangle \(DEF\) has \(${a}^\circ\), \(${d}^\circ\) and \(${e}^\circ\).`;
    const ONE = R`Yes. Both triangles have an angle of \(${a}^\circ\).`;
    const SIDES = 'It cannot be decided without the side lengths.';
    const CONG = 'Yes, and they must also be congruent.';
    return q({
      prompt: R`Triangle \(ABC\) has \(\angle A = ${a}^\circ\) and \(\angle B = ${b}^\circ\). Triangle \(DEF\) has \(\angle D = ${a}^\circ\) and \(\angle E = ${d}^\circ\). Are the two triangles similar?`,
      correct: yes ? YES : NO,
      wrong: yes
        ? [{ value: R`No. Only one pair of angles is given as equal.`, why: R`Work out the missing angle first: \(180 - ${a} - ${b} = ${c}\). Then triangle \(ABC\) also has a \(${c}^\circ\) angle.` }, { value: SIDES, why: 'Two pairs of equal angles (AA) are enough to show triangles are similar.' }, { value: CONG, why: 'Equal angles give the same shape, not always the same size.' }]
        : [{ value: ONE, why: 'One pair of equal angles is not enough. Similar triangles need two pairs (and so all three).' }, { value: SIDES, why: R`The angles decide it: each triangle's third angle is 180° minus the other two.` }, { value: R`Yes. The angles of each triangle add up to \(180^\circ\).`, why: 'That is true of every triangle, so it says nothing about these two.' }],
      solution: [R`Third angle of \(ABC\): \(180 - ${a} - ${b} = ${c}\), so its angles are \(${a}^\circ\), \(${b}^\circ\), \(${c}^\circ\).`, R`Third angle of \(DEF\): \(180 - ${a} - ${d} = ${e}\), so its angles are \(${a}^\circ\), \(${d}^\circ\), \(${e}^\circ\).`, yes ? 'The angles match in pairs, so by AA the triangles are similar.' : 'The angles do not all match, so the triangles are not similar.'],
      rule: 5,
      skill: 'angle-angle similarity',
      check: () => ([a, b, c].sort().join() === [a, d, e].sort().join()) === yes ? true : 'similarity decided wrongly',
    });
  }
}

function challengeBackwards(rng) {
  for (;;) {
    const [M1, M2] = twoMoves(rng);
    const p = [rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
    const end = M2.f(M1.f(p));
    const [U1, U2] = [inverse(M1), inverse(M2)];
    const cands = [{ value: P(M2.f(M1.f(end))), why: 'That does the moves again. To go backwards, undo each move instead.' }, { value: P(U2.f(U1.f(end))), why: 'Undo the last move first, then the first move.' }, { value: P(U2.f(end)), why: 'That undoes only the second move.' }, P(M1.f(M2.f(end)))];
    if (!inBox([M1.f(p), end], 9) || new Set(cands.map((c) => c.value ?? c).filter((c) => c !== P(p))).size < 3) continue;
    return q({
      prompt: R`A point \(P\) is ${M1.verb}. Its image is then ${M2.verb}. The final image is \(P''${point(...end)}\). What were the coordinates of \(P\)?`,
      correct: P(p),
      wrong: cands,
      solution: [R`Work backwards: undo the last move first. The opposite of ${M2.name} is ${U2.name}: \(${point(...end)} \to ${point(...U2.f(end))}\).`, R`Then undo the first move with ${U1.name}: \(${point(...U2.f(end))} \to ${point(...p)}\).`, R`Check forwards: \(${point(...p)} \to ${point(...M1.f(p))} \to ${point(...end)}\). ✓`],
      rule: 3,
      skill: 'working backwards',
      check: () => (same(M2.f(M1.f(p)), end) ? true : 'the forward check fails'),
    });
  }
}

const VERDICT = {
  rigid: 'Congruent: rigid motions alone map one onto the other.',
  similar: 'Similar but not congruent: a dilation is needed as well.',
  neither: 'Neither: no sequence of rigid motions and dilations maps one onto the other.',
  odd: 'Congruent but not similar.',
};

function challengeCongruentOrSimilar(rng) {
  for (;;) {
    const kind = rng.pick(['rigid', 'similar', 'neither']);
    const [p, qq] = [rng.int(1, 2), rng.int(1, 2)];
    const [u, v] = [rng.int(1, 3), rng.int(1, 3)];
    if (u === v) continue;
    const [sx, sy] = [rng.sign(), rng.sign()];
    const tri = [[p, qq], [p + u, qq], [p, qq + v]].map(([x, y]) => [sx * x, sy * y]);
    const stretchX = rng.bool();
    const pre = { rigid: (pt) => pt, similar: ([x, y]) => [2 * x, 2 * y], neither: ([x, y]) => (stretchX ? [2 * x, y] : [x, 2 * y]) }[kind];
    const mv = MOVE[rng.pick(ABOUT)];
    const t = kind === 'rigid' ? shift(rng.int(-3, 3), rng.int(-3, 3)) : shift(0, 0);
    const img = tri.map((pt) => t.f(mv.f(pre(pt))));
    if (!inBox(img, 10) || setKey(img) === setKey(tri)) continue;
    const legs = (pts) => [Math.sqrt(d2(pts[0], pts[1])), Math.sqrt(d2(pts[0], pts[2]))];
    const [du, dv] = legs(img);
    const notes = {
      rigid: 'Every side of triangle DEF is the same length as the matching side of triangle ABC, so no dilation is needed.',
      similar: 'Every side of triangle DEF is a different length from the matching side of ABC. A rigid motion cannot change lengths, so the triangles are not congruent.',
      neither: 'The legs did not grow by the same scale factor, so the triangles do not have the same shape.',
    };
    return q({
      prompt: R`Compare triangle \(ABC\) and triangle \(DEF\) on the grid, with \(D\), \(E\) and \(F\) matching \(A\), \(B\) and \(C\). Which statement is true?`,
      visual: figures(tri, img, { lim: 10, imageNames: ['D', 'E', 'F'] }),
      correct: VERDICT[kind],
      wrong: [...['rigid', 'similar', 'neither'].filter((x) => x !== kind).map((x) => ({ value: VERDICT[x], why: notes[kind] })), { value: VERDICT.odd, why: 'Congruent figures always have the same shape, so they are always similar (with scale factor 1).' }],
      solution: [
        R`Both are right triangles. In \(ABC\) the legs are \(AB = ${u}\) and \(AC = ${v}\). In \(DEF\) they are \(DE = ${du}\) and \(DF = ${dv}\).`,
        kind === 'rigid' ? R`The legs are the same lengths. ${cap(mv.name)}${t.a || t.b ? `, then ${t.name},` : ''} maps \(ABC\) onto \(DEF\).` : kind === 'similar' ? R`Both legs are multiplied by \(2\). A dilation with scale factor \(2\) from the origin, then ${mv.name}, maps \(ABC\) onto \(DEF\).` : R`One leg is multiplied by \(${du / u === 1 ? dv / v : du / u}\) and the other by \(${du / u === 1 ? 1 : dv / v}\). Rigid motions keep lengths and a dilation multiplies them all by the same number, so no sequence works.`,
        `So the answer is: ${VERDICT[kind]}`,
      ],
      rule: kind === 'rigid' ? 3 : 5,
      skill: 'congruent or similar',
      check: () => {
        const r = [0, 1, 2].map((i) => d2(img[i], img[(i + 1) % 3]) / d2(tri[i], tri[(i + 1) % 3]));
        const sorted = (pts) => [0, 1, 2].map((i) => d2(pts[i], pts[(i + 1) % 3])).sort((x, y) => x - y);
        const [A, B] = [sorted(tri), sorted(img)];
        const sim = B.every((s, i) => Math.abs(s / A[i] - B[0] / A[0]) < 1e-9);
        const got = sim ? (Math.abs(B[0] - A[0]) < 1e-9 ? 'rigid' : 'similar') : 'neither';
        return got === kind && (kind !== 'neither' || r[0] !== r[2]) ? true : `the triangles are really ${got}`;
      },
    });
  }
}

// ───────────── Interactive models ─────────────

const BASE = [[1, 1], [4, 1], [1, 3]];

export default {
  id: 'transformations',
  title: 'Transformations, Congruence & Similarity',
  summary: 'Translate, reflect, rotate and dilate figures on the coordinate plane, and use them to decide whether figures are congruent or similar.',
  grade: 'Grade 8',
  standards: ['CCSS 8.G.A.1', 'CCSS 8.G.A.2', 'CCSS 8.G.A.3', 'CCSS 8.G.A.4', 'CCSS 8.G.A.5'],

  explain: {
    intro: R`A **transformation** moves or resizes a figure. Translations, reflections and rotations are **rigid motions**: they move a figure without changing its size or shape. A **dilation** stretches or shrinks it. On the coordinate plane each transformation has a rule that tells where every point goes. In this topic, every rotation is about the origin and turns **counterclockwise**, and every dilation is from the origin.`,
    rules: [
      { title: 'Translations slide', text: R`A **translation** slides every point the same distance in the same direction. Moving \(a\) units right and \(b\) units up uses the rule \((x, y) \to (x + a, y + b)\). Moving left or down makes \(a\) or \(b\) negative.`, example: R`3 units right and 2 units down: \((1, 4) \to (1 + 3, 4 - 2) = (4, 2)\).` },
      { title: 'Reflections flip', text: R`A **reflection** flips a figure over a line, like a mirror. Across the \(x\)-axis: \((x, y) \to (x, -y)\). Across the \(y\)-axis: \((x, y) \to (-x, y)\). A point and its image are the same distance from the mirror line.`, example: R`Reflect \((2, 5)\) across the \(x\)-axis: \((2, -5)\). Across the \(y\)-axis: \((-2, 5)\).` },
      { title: 'Rotations turn', text: R`A **rotation** turns a figure about a point. Counterclockwise is the opposite way to the hands of a clock. About the origin: 90° gives \((x, y) \to (-y, x)\); 180° gives \((x, y) \to (-x, -y)\); 270° gives \((x, y) \to (y, -x)\). A 270° counterclockwise turn is the same as a 90° clockwise turn.`, example: R`Rotate \((3, 1)\) 90° counterclockwise about the origin: \((-1, 3)\).` },
      { title: 'Rigid motions make congruent figures', text: R`Translations, reflections and rotations keep lengths, angle measures and parallel lines the same. Two figures are **congruent** if a sequence of rigid motions maps one onto the other. In a sequence, do the moves in order: the second move acts on the image of the first.`, example: R`Reflect \((2, 3)\) across the \(y\)-axis to get \((-2, 3)\), then translate 4 units down to get \((-2, -1)\).` },
      { title: 'Dilations resize', text: R`A **dilation** from the origin with **scale factor** \(k\) uses the rule \((x, y) \to (kx, ky)\). Every length is multiplied by \(k\), but every angle stays the same. If \(k > 1\) the figure gets bigger; if \(k\) is between 0 and 1 it gets smaller.`, example: R`Scale factor 3: \((2, -1) \to (6, -3)\). A side of length 4 becomes 12.` },
      { title: 'Similar figures and AA', text: R`Two figures are **similar** if rigid motions and a dilation map one onto the other: same shape, maybe a different size. Matching angles are equal and matching sides are in the same ratio. Two triangles with two pairs of equal angles are similar (**AA**), because the third angles must match too.`, example: R`Triangles with angles 50°, 60°, 70° and 50°, 70°, 60° are similar. If \(AB = 4\) matches \(DE = 10\), the scale factor is \(\frac{10}{4} = 2.5\).` },
    ],
    vocab: [
      { term: 'image', def: R`The figure after a transformation. The image of \(A\) is written \(A'\) ("A prime").` },
      { term: 'rigid motion', def: 'A translation, reflection or rotation: a move that keeps all lengths and angles.' },
      { term: 'congruent', def: 'Same shape and same size: a sequence of rigid motions maps one figure onto the other.' },
      { term: 'similar', def: 'Same shape: rigid motions and a dilation map one figure onto the other.' },
      { term: 'scale factor', def: 'The number every length is multiplied by in a dilation.' },
      { term: 'counterclockwise', def: 'Turning the opposite way to the hands of a clock, from quadrant I toward quadrant II.' },
    ],
    mistakes: [
      R`Mixing up the axes: across the \(x\)-axis, the \(y\)-coordinate changes sign, and \(x\) stays the same.`,
      'Turning the wrong way. Check the direction: a 90° counterclockwise turn takes a point in quadrant I into quadrant II.',
      'Adding the scale factor instead of multiplying by it.',
      'Thinking a dilation changes angles. Only lengths change; that is why the shape stays the same.',
      'Doing the moves of a sequence in the wrong order. Often the order changes the result.',
    ],
    visual: { ...figures(BASE.map(([x, y]) => [x + 1, y]), BASE.map(([x, y]) => MOVE.r90.f([x + 1, y])), { lim: 6 }), alt: 'Triangle ABC with vertices A (2, 1), B (5, 1), C (2, 3), and its image after a 90° counterclockwise rotation about the origin: A′ (−1, 2), B′ (−1, 5), C′ (−3, 2).' },
  },

  examples: [
    {
      title: 'Translating a triangle',
      problem: R`Triangle \(ABC\) has vertices \(A(1, 2)\), \(B(4, 2)\) and \(C(1, 5)\). Translate it 5 units left and 3 units down. Give the rule and the image.`,
      steps: [R`5 left and 3 down: the rule is \((x, y) \to (x - 5, y - 3)\).`, R`\(A(1, 2) \to A'(-4, -1)\), \(B(4, 2) \to B'(-1, -1)\), \(C(1, 5) \to C'(-4, 2)\).`, 'The image is the same size and shape and faces the same way.'],
      answer: R`\((x, y) \to (x - 5, y - 3)\); \(A'(-4, -1)\), \(B'(-1, -1)\), \(C'(-4, 2)\)`,
      visual: figures([[1, 2], [4, 2], [1, 5]], [[-4, -1], [-1, -1], [-4, 2]], { lim: 6 }),
    },
    {
      title: 'Rotating 90° counterclockwise',
      problem: R`Rotate the point \((4, 1)\) 90° counterclockwise about the origin.`,
      steps: [R`The rule for 90° counterclockwise is \((x, y) \to (-y, x)\).`, R`Here \(x = 4\) and \(y = 1\), so the image is \((-1, 4)\).`, R`Check the direction: \((4, 1)\) is in quadrant I, and a quarter turn counterclockwise lands in quadrant II. ✓`],
      answer: R`\((-1, 4)\)`,
      visual: grid(-5, 5, { points: [{ x: 0, y: 0, label: 'O' }, { x: 4, y: 1, label: '(4, 1)' }, { x: -1, y: 4, label: '(−1, 4)', color: 'b' }], segments: [{ from: [0, 0], to: [4, 1], dashed: true }, { from: [0, 0], to: [-1, 4], dashed: true }], alt: 'The points (4, 1) and (−1, 4) joined to the origin by dashed segments that make a right angle.' }),
    },
    {
      title: 'Describing a sequence',
      problem: R`Triangle \(ABC\) has \(A(1, 1)\), \(B(4, 1)\), \(C(1, 3)\). Triangle \(A''B''C''\) has \(A''(-1, -3)\), \(B''(-4, -3)\), \(C''(-1, -1)\). Find a sequence of transformations that maps \(ABC\) onto \(A''B''C''\). Are the triangles congruent?`,
      steps: [R`\(B\) is to the right of \(A\), but \(B''\) is to the left of \(A''\): the triangle has been flipped left to right. Try a reflection across the \(y\)-axis: \(A'(-1, 1)\), \(B'(-4, 1)\), \(C'(-1, 3)\).`, R`Each point is now 4 units above its final place, so translate 4 units down: \(A''(-1, -3)\), \(B''(-4, -3)\), \(C''(-1, -1)\). ✓`, 'Only rigid motions were used, so the triangles are congruent.'],
      answer: R`A reflection across the \(y\)-axis, then a translation 4 units down; the triangles are congruent.`,
      visual: figures([[1, 1], [4, 1], [1, 3]], [[-1, -3], [-4, -3], [-1, -1]], { lim: 5, mark: '″' }),
    },
    {
      title: 'Word problem: a shadow',
      word: true,
      problem: 'At the same time of day, Rosa, who is 1.5 m tall, casts a 2 m shadow. A tree nearby casts a 14 m shadow. How tall is the tree?',
      steps: ['Rosa and her shadow make a right triangle, and so do the tree and its shadow. The sun shines at the same angle on both, so the triangles have two pairs of equal angles. By AA they are similar.', R`The tree's shadow is \(14 \div 2 = 7\) times as long as Rosa's, so the scale factor is 7.`, R`The tree is \(7 \times 1.5 = 10.5\) m tall.`],
      answer: '10.5 m',
    },
  ],

  models: [
    {
      id: 'transform-a-triangle',
      title: 'Transform a triangle',
      intro: 'Choose a transformation. Triangle ABC starts at A(1, 1), B(4, 1), C(1, 3). The steps give the rule and the image of each vertex.',
      inputs: [
        { name: 'kind', label: 'Transformation', type: 'select', value: 'r90', options: [{ value: 't', label: 'translation' }, { value: 'rx', label: 'reflection across the x-axis' }, { value: 'ry', label: 'reflection across the y-axis' }, { value: 'r90', label: 'rotation 90° counterclockwise' }, { value: 'r180', label: 'rotation 180° counterclockwise' }, { value: 'r270', label: 'rotation 270° counterclockwise' }, { value: 'd', label: 'dilation from the origin' }] },
        { name: 'a', label: 'Translation: units right (negative = left)', type: 'int', min: -6, max: 6, value: 3 },
        { name: 'b', label: 'Translation: units up (negative = down)', type: 'int', min: -6, max: 6, value: -2 },
        { name: 'k', label: 'Dilation: scale factor', type: 'number', min: 0.5, max: 3, step: 0.5, value: 2 },
      ],
      compute({ kind, a, b, k }) {
        if (kind === 't' && a === 0 && b === 0) return { error: 'A translation of 0 right and 0 up does not move the triangle. Make at least one of the two numbers different from 0.' };
        const mv = kind === 't' ? shift(a, b) : kind === 'd' ? { name: `a dilation from the origin with scale factor ${num(k)}`, rule: `(${terms([[k, 'x']])}, ${terms([[k, 'y']])})`, f: ([x, y]) => [round(k * x, 2), round(k * y, 2)] } : MOVE[kind];
        const img = BASE.map(mv.f);
        const lim = Math.max(5, ...img.flat().map((v) => Math.ceil(Math.abs(v)) + 1));
        const rigid = kind !== 'd';
        return {
          problem: R`Apply ${mv.name} to triangle \(ABC\).`,
          steps: [
            R`The rule is \(${ruleTex(mv)}\).`,
            ...BASE.map((p, i) => R`\(${NAMES[i]}${point(...p)} \to ${NAMES[i]}'${point(...img[i])}\)`),
            rigid ? R`This is a rigid motion, so the image is congruent: \(AB = 3\) and \(A'B' = 3\), and the right angle at \(A\) is still a right angle at \(A'\).` : R`Every length is multiplied by \(${num(k)}\): \(AB = 3\) becomes \(A'B' = ${num(3 * k)}\). The right angle at \(A\) stays a right angle, so the image is similar${k === 1 ? ' and, with scale factor 1, also congruent' : ''}.`,
          ],
          answer: R`\(A'${point(...img[0])}\), \(B'${point(...img[1])}\), \(C'${point(...img[2])}\)`,
          visual: figures(BASE, img, { lim }),
        };
      },
    },
    {
      id: 'shadow-height',
      title: 'Word problem: measuring with shadows',
      word: true,
      intro: 'A person and a tall object stand in the sun at the same time. Change the heights and shadow lengths.',
      inputs: [
        { name: 'h', label: 'Height of the person (m)', type: 'number', min: 1, max: 2, step: 0.1, value: 1.5 },
        { name: 's', label: "Length of the person's shadow (m)", type: 'number', min: 0.5, max: 5, step: 0.1, value: 2 },
        { name: 'S', label: "Length of the tree's shadow (m)", type: 'number', min: 1, max: 40, step: 0.5, value: 14 },
      ],
      compute({ h, s, S }) {
        const k = S / s;
        const H = round(h * k, 2);
        return {
          problem: `A person ${num(h)} m tall casts a shadow ${num(s)} m long. At the same time, a tree casts a shadow ${num(S)} m long. How tall is the tree?`,
          steps: [
            'Each height and its shadow form a right triangle. The sun shines at the same angle on both, so two pairs of angles are equal. By AA the triangles are similar.',
            R`Scale factor: \(${num(S)} \div ${num(s)} ${Number.isInteger(round(k * 100, 6)) ? '=' : R`\approx`} ${num(k, { places: 2 })}\).`,
            R`Height of the tree: \(${num(h)} \times \frac{${num(S)}}{${num(s)}} ${Number.isInteger(round(h * k * 100, 6)) ? '=' : R`\approx`} ${num(H)}\) m.`,
          ],
          answer: Number.isInteger(round(h * k * 100, 6)) ? `${num(H)} m` : `About ${num(H)} m (to the nearest hundredth)`,
          visual: [
            { type: 'polygon', points: [[0, 0], [s, 0], [0, h]], right: [0], sides: [`${num(s)} m`, '', `${num(h)} m`], alt: `A right triangle: the person is ${num(h)} m tall and the shadow is ${num(s)} m long.` },
            { type: 'polygon', points: [[0, 0], [S, 0], [0, H]], right: [0], sides: [`${num(S)} m`, '', '?'], alt: `A right triangle of the same shape: the tree's shadow is ${num(S)} m long and its height is unknown.` },
          ],
        };
      },
    },
  ],

  quiz: {
    easy: [easyTranslatePoint, easyReflectPoint, easyNameTransformation],
    medium: [mediumRotatePoint, mediumRuleForImage, mediumDilate, mediumKeptOrChanged],
    hard: [hardSequencePoint, hardWhichSequence, hardSimilar],
    challenge: [challengeAngles, challengeBackwards, challengeCongruentOrSimilar],
  },
};
