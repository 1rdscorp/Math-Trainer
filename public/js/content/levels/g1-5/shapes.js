import { R, q, frac, person, people, plural, joinList, fractionWord } from '../../lib/index.js';

// ───────────── Geometry helpers ─────────────

const rad = (d) => (d * Math.PI) / 180;
const r2 = (x) => Math.round(x * 100) / 100;
const turn = (pts, deg) => pts.map(([x, y]) => [r2(x * Math.cos(rad(deg)) - y * Math.sin(rad(deg))), r2(x * Math.sin(rad(deg)) + y * Math.cos(rad(deg)))]);
const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => s + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0)) / 2;
const regular = (k, r = 5, start = 90) => Array.from({ length: k }, (_, i) => [r2(r * Math.cos(rad(start + (360 * i) / k))), r2(r * Math.sin(rad(start + (360 * i) / k)))]);
const SHAPE_NAMES = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 8: 'octagon' };
const article = (w) => (/^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`);

// Count the corners again from the picture: places where the outline really changes direction.
function cornersOf(pts) {
  let n = 0;
  pts.forEach((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const d1 = Math.atan2(p[1] - a[1], p[0] - a[0]);
    const d2 = Math.atan2(b[1] - p[1], b[0] - p[0]);
    const t = Math.abs((((d2 - d1) * 180) / Math.PI + 540) % 360 - 180);
    if (t > 10) n += 1;
  });
  return n;
}

// A k-sided shape that may be turned and stretched. Every corner turns by at least 18 degrees, so each corner shows.
function ngon(rng, k) {
  for (let t = 0; t < 40; t++) {
    const rot = rng.int(0, 359);
    const sx = rng.pick([1, 1, 1.3, 1.6]);
    const pts = Array.from({ length: k }, (_, i) => {
      const a = rad(rot + (360 * i) / k + rng.int(-8, 8) * (5 / k));
      return [r2(5 * sx * Math.cos(a)), r2(5 * Math.sin(a))];
    });
    const turns = pts.map((p, i) => {
      const a = pts[(i + k - 1) % k];
      const b = pts[(i + 1) % k];
      return Math.atan2((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]), (p[0] - a[0]) * (b[0] - p[0]) + (p[1] - a[1]) * (b[1] - p[1])) * (180 / Math.PI);
    });
    if (turns.every((x) => x >= 18)) return pts;
  }
  return regular(k);
}

// Sort a four-sided shape with whole-number corners into exactly one group.
function quadFacts(pts) {
  const sq = pts.map((p, i) => (pts[(i + 1) % 4][0] - p[0]) ** 2 + (pts[(i + 1) % 4][1] - p[1]) ** 2);
  const right = pts.map((p, i) => {
    const a = pts[(i + 3) % 4];
    const b = pts[(i + 1) % 4];
    return (a[0] - p[0]) * (b[0] - p[0]) + (a[1] - p[1]) * (b[1] - p[1]) === 0;
  });
  const allEq = sq.every((s) => s === sq[0]);
  const allRight = right.every(Boolean);
  const kind = allEq && allRight ? 'square' : allRight ? 'rectangle' : allEq ? 'rhombus' : 'other';
  // Tick marks: sides of the same length share a number of ticks.
  const groups = [...new Set(sq)].filter((s) => sq.filter((t) => t === s).length > 1);
  const marks = sq.map((s) => groups.indexOf(s) + 1);
  return { sq, right, allEq, allRight, kind, marks };
}

// A rectangle cut into n equal strips (dir 'v' or 'h'). Returns the pieces as polygons.
function strips(w, h, n, dir) {
  return Array.from({ length: n }, (_, i) =>
    dir === 'v'
      ? [[(w * i) / n, 0], [(w * (i + 1)) / n, 0], [(w * (i + 1)) / n, h], [(w * i) / n, h]]
      : [[0, (h * i) / n], [w, (h * i) / n], [w, (h * (i + 1)) / n], [0, (h * (i + 1)) / n]],
  );
}
// Draw every edge of every piece inside the outline.
const edgesOf = (pieces) => pieces.flatMap((pc) => pc.map((p, i) => ({ from: p.map(r2), to: pc[(i + 1) % pc.length].map(r2), dashed: false })));
const cutPic = (outer, pieces, alt, grid = false) => ({ type: 'polygon', points: outer.map((p) => p.map(r2)), extra: edgesOf(pieces), grid, alt });

// ───────────── Shares of foods ─────────────

const ROUND = ['pizza', 'pancake', 'pie', 'tortilla'];
const LONG = ['sandwich', 'cracker', 'brownie', 'granola bar'];
const SHARE = { 2: 'a half', 3: 'a third', 4: 'a fourth' };

// A food cut into n equal shares. Pieces are given by area so the check can compare them.
function foodPic(food, n, rng) {
  if (ROUND.includes(food)) {
    const start = n === 3 ? 90 : 0;
    const vis = n === 2 ? { type: 'circle', diameter: true } : n === 4 ? { type: 'circle', diameter: true, central: { start: 90, end: 270 } } : { type: 'circle', central: { start: 90, end: 210 }, sector: { start: 210, end: 330 } };
    return { visual: { ...vis, alt: `A round ${food} cut into ${n} equal shares.` }, areas: Array.from({ length: n }, (_, i) => (360 * (i + 1)) / n - (360 * i) / n), start };
  }
  const w = rng.int(6, 9);
  const h = rng.int(3, 4);
  const pieces = strips(w, h, n, 'v');
  return { visual: cutPic([[0, 0], [w, 0], [w, h], [0, h]], pieces, `A ${food} shaped like a rectangle, cut into ${n} equal shares.`), areas: pieces.map(area) };
}
const allSame = (list) => list.every((a) => Math.abs(a - list[0]) < 1e-9);

// ───────────── Solid shapes ─────────────

const FACES_BOX = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
const SOLIDS = {
  cube: { name: 'cube', kind: 'cube', fev: [6, 12, 8], seen: [3, 9, 7], faces: FACES_BOX, flat: 6, things: ['A number cube', 'An ice cube', 'A toy block'] },
  box: { name: 'rectangular prism', kind: 'box', fev: [6, 12, 8], seen: [3, 9, 7], faces: FACES_BOX, flat: 6, things: ['A cereal box', 'A brick', 'A shoe box', 'A tissue box'] },
  pyramid: { name: 'pyramid', kind: 'pyramid', fev: [5, 8, 5], seen: [2, 5, 4], faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]], flat: 5, things: [] },
  cylinder: { name: 'cylinder', kind: 'cylinder', surfaces: ['circle', 'circle', 'curved'], flat: 2, things: ['A soup can', 'A drum', 'A candle', 'A glue stick'] },
  cone: { name: 'cone', kind: 'cone', surfaces: ['circle', 'curved'], flat: 1, things: ['A party hat', 'A traffic cone', 'An ice cream cone'] },
  sphere: { name: 'sphere', kind: 'sphere', surfaces: ['curved'], flat: 0, things: ['A ball', 'An orange', 'A globe', 'A marble'] },
};
const SOLID_ALT = {
  cube: 'A cube. All 6 faces are squares. Dashed lines show hidden edges.',
  box: 'A rectangular prism, like a box. Its 6 faces are rectangles. Dashed lines show hidden edges.',
  pyramid: 'A pyramid with a square base and 4 triangle faces that meet at a point on top.',
  cylinder: 'A cylinder, like a can. It has a flat circle on the top and on the bottom.',
  cone: 'A cone. It has one flat circle at the bottom and comes to a point.',
  sphere: 'A sphere, like a ball. It is curved all over.',
};
const SOLID_FACT = {
  cube: 'A cube has 6 faces. They are squares of the same size.',
  box: 'A rectangular prism has 6 rectangle faces, like a box.',
  pyramid: 'A pyramid has a flat base and triangle faces that meet at a point.',
  cylinder: 'A cylinder has 2 flat circles and a curved side.',
  cone: 'A cone has 1 flat circle and comes to a point.',
  sphere: 'A sphere is round and curved all over.',
};
const solidPic = (key) => ({ type: 'solid', kind: SOLIDS[key].kind, alt: SOLID_ALT[key] });
// Count faces, edges and vertices from the list of faces (an independent count).
function countParts(faces) {
  const edges = new Set();
  for (const f of faces) f.forEach((v, i) => edges.add([v, f[(i + 1) % f.length]].sort().join('-')));
  return [faces.length, edges.size, new Set(faces.flat()).size];
}

// ───────────── Easy ─────────────

function easyCountSides(rng) {
  const k = rng.int(3, 8);
  const pts = ngon(rng, k);
  const ask = rng.pick(['sides', 'corners', 'vertices']);
  return q({
    prompt: ask === 'vertices' ? 'How many vertices (corners) does this shape have?' : `How many ${ask} does this shape have?`,
    visual: { type: 'polygon', points: pts, alt: `A closed shape with ${k} straight sides and ${k} corners.` },
    correct: k,
    wrong: [{ value: k - 1, why: 'Put a finger on one and count around. Stop where you started.' }, k + 1, k + 2],
    solution: [`Start at one ${ask === 'sides' ? 'side' : 'corner'}. Count all the way around.`, `There are ${k} ${ask}.`, `A shape always has as many sides as corners.`],
    rule: 0,
    skill: 'sides and corners',
    check: () => (cornersOf(pts) === k ? true : 'corners in the picture do not match'),
  });
}

function easyNameShape(rng) {
  const name = rng.pick(['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'circle']);
  let pts = null;
  let alt = '';
  if (name === 'square') {
    const a = rng.int(2, 5);
    const b = rng.pick([0, 0, 1, 2]);
    pts = [[0, 0], [a, b], [a - b, a + b], [-b, a]];
    alt = `A shape with 4 equal sides and 4 square corners.${b ? ' It is turned.' : ''}`;
  } else if (name === 'rectangle') {
    const w = rng.int(4, 9);
    const h = rng.int(2, w - 2);
    pts = rng.bool(0.7) ? [[0, 0], [w, 0], [w, h], [0, h]] : [[0, 0], [w, w], [w - h, w + h], [-h, h]];
    alt = `A shape with 4 square corners. Two sides are long and two are short.${pts[1][1] ? ' It is turned.' : ''}`;
  } else if (name !== 'circle') {
    const k = { triangle: 3, pentagon: 5, hexagon: 6 }[name];
    pts = ngon(rng, k);
    alt = `A closed shape with ${k} straight sides and ${k} corners.`;
  }
  const notes = {
    square: name === 'rectangle' ? 'A square needs all 4 sides the same length. These are not.' : null,
    circle: 'A circle is round. It has no straight sides.',
  };
  const others = ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'circle'].filter((x) => x !== name && !(name === 'square' && x === 'rectangle'));
  return q({
    prompt: 'What is the name of this shape?',
    visual: pts ? { type: 'polygon', points: pts, alt } : { type: 'circle', alt: 'A round shape with no straight sides and no corners.' },
    correct: name,
    wrong: rng.shuffle(others).map((x) => (notes[x] ? { value: x, why: notes[x] } : x)),
    solution: pts ? [`Count the sides: there are ${pts.length}.`, name === 'square' ? 'All 4 sides are equal and the corners are square.' : name === 'rectangle' ? 'It has 4 square corners, but the sides are not all equal.' : `A shape with ${pts.length} sides is ${article(name)}.`, 'Turning or stretching a shape does not change its name.'] : ['The shape is round.', 'It has no sides and no corners.', 'It is a circle.'],
    rule: name === 'square' || name === 'rectangle' ? 1 : 0,
    skill: 'naming shapes',
    check: () => {
      if (!pts) return true;
      if (name === 'square' || name === 'rectangle') return quadFacts(pts).kind === name ? true : 'quadrilateral does not match its name';
      return { 3: 'triangle', 5: 'pentagon', 6: 'hexagon' }[cornersOf(pts)] === name ? true : 'corner count does not match the name';
    },
  });
}

function easyShares(rng) {
  const n = rng.pick([2, 4]);
  const style = rng.pick(['strips', 'strips', 'other', 'circle']);
  let pic;
  let pieces = null;
  if (style === 'circle') pic = foodPic('pizza', n, rng).visual;
  else {
    const w = rng.int(4, 8);
    const h = style === 'other' ? w : rng.int(2, 5);
    const dir = rng.pick(['v', 'h']);
    if (style === 'strips') pieces = strips(w, h, n, dir);
    else if (n === 2) pieces = rng.bool() ? [[[0, 0], [w, 0], [w, h]], [[0, 0], [w, h], [0, h]]] : strips(w, h, 2, dir);
    else pieces = rng.bool() ? [[[0, 0], [w, 0], [w / 2, h / 2]], [[w, 0], [w, h], [w / 2, h / 2]], [[w, h], [0, h], [w / 2, h / 2]], [[0, h], [0, 0], [w / 2, h / 2]]] : [0, 1, 2, 3].map((i) => { const x = (i % 2) * (w / 2); const y = Math.floor(i / 2) * (h / 2); return [[x, y], [x + w / 2, y], [x + w / 2, y + h / 2], [x, y + h / 2]]; });
    pic = cutPic([[0, 0], [w, 0], [w, h], [0, h]], pieces, `A ${w === h ? 'square' : 'rectangle'} cut into ${n} equal shares.`);
  }
  const askName = rng.bool();
  return q({
    prompt: askName ? 'The shape is cut into equal shares. What is one share called?' : 'The shape is cut into equal shares. How many shares make the whole?',
    visual: pic,
    correct: askName ? SHARE[n] : n,
    wrong: askName ? [{ value: 'a whole', why: 'The whole is all the shares together. One share is a part.' }, ...Object.values(SHARE).filter((s) => s !== SHARE[n])] : [{ value: n === 4 && style !== 'strips' ? 2 : n - 1, why: 'Count the shares, not the cut lines.' }, n + 1, n + 2],
    solution: [`Count the shares: there are ${n}.`, `${n} equal shares are called ${fractionWord(n)}.`, askName ? `One share is ${SHARE[n]}.` : `${n} ${fractionWord(n)} make one whole.`],
    rule: 4,
    skill: 'equal shares',
    check: () => (!pieces || (pieces.length === n && allSame(pieces.map(area)) && Math.abs(pieces.map(area).reduce((s, a) => s + a, 0) - area(pic.points)) < 1e-6) ? true : 'shares are not equal'),
  });
}

function easyNameSolid(rng) {
  const key = rng.pick(Object.keys(SOLIDS));
  const s = SOLIDS[key];
  const thing = s.things.length && rng.bool(0.4) ? rng.pick(s.things) : null;
  const others = Object.values(SOLIDS).map((o) => o.name).filter((x) => x !== s.name && !(key === 'cube' && x === 'rectangular prism'));
  return q({
    prompt: thing ? `${thing} has the shape of which solid?` : 'What is the name of this solid shape?',
    visual: thing ? undefined : solidPic(key),
    correct: s.name,
    wrong: rng.shuffle(others).map((x) => (x === 'cube' && key === 'box' ? { value: x, why: 'A cube has square faces all the same size. These faces are longer rectangles.' } : x)),
    solution: [SOLID_FACT[key], thing ? `${thing} is shaped like ${article(s.name)}.` : `So the shape is ${article(s.name)}.`],
    rule: 2,
    skill: 'naming solids',
    check: () => ({ cube: 'cube', box: 'rectangular prism', pyramid: 'pyramid', cylinder: 'cylinder', cone: 'cone', sphere: 'sphere' })[solidPic(key).kind] === s.name ? true : 'solid name does not match its picture',
  });
}

// ───────────── Medium ─────────────

function mediumSolidParts(rng) {
  const key = rng.pick(['cube', 'box', 'pyramid', 'pyramid', 'cylinder', 'cone', 'sphere']);
  const s = SOLIDS[key];
  const thing = s.things.length && rng.bool(0.5) ? rng.pick(s.things) : null;
  const lead = thing ? `${thing} is shaped like ${article(s.name)}. ` : '';
  if (!s.fev) {
    const n = s.flat;
    return q({
      prompt: `${lead}How many flat faces does ${thing ? 'it' : 'this ' + s.name} have?`,
      visual: solidPic(key),
      correct: n,
      wrong: [key === 'cylinder' ? { value: 1, why: 'There is a flat circle on the top and one on the bottom.' } : key === 'sphere' ? { value: 1, why: 'A sphere is curved all over. It has no flat faces.' } : { value: 0, why: 'The bottom of a cone is a flat circle.' }, n + 1, n + 2, 3],
      solution: [`Look for flat parts. A curved part is not a flat face.`, key === 'sphere' ? 'A sphere has no flat parts.' : `${s.name === 'cone' ? 'A cone' : 'A cylinder'} has ${plural(n, 'flat circle')}.`, `So it has ${plural(n, 'flat face')}.`],
      rule: 2,
      skill: 'faces, edges, vertices',
      check: () => (s.surfaces.filter((x) => x !== 'curved').length === n ? true : 'flat faces miscounted'),
    });
  }
  const part = rng.pick(key === 'pyramid' ? [0, 1, 2, 3] : [0, 1, 2, 3]);
  if (part === 3) {
    const shape = key === 'pyramid' ? 'triangles' : key === 'cube' ? 'squares' : 'rectangles';
    const n = key === 'pyramid' ? 4 : 6;
    return q({
      prompt: `${lead}How many of its faces are ${shape}?`,
      visual: solidPic(key),
      correct: n,
      wrong: key === 'pyramid' ? [{ value: 5, why: 'The bottom face is a square, not a triangle.' }, 2, 3] : [{ value: 3, why: 'Some faces are at the back. Count them too.' }, 4, 5],
      solution: key === 'pyramid' ? ['The pyramid has 5 faces.', 'The bottom face is a square.', 'The other 4 faces are triangles.'] : [`The ${s.name} has 6 faces.`, `Every face is ${article(shape.slice(0, -1))}.`, `So 6 faces are ${shape}.`],
      rule: 2,
      skill: 'faces, edges, vertices',
      check: () => (s.faces.filter((f) => f.length === (key === 'pyramid' ? 3 : 4)).length === n ? true : 'face shapes miscounted'),
    });
  }
  const word = ['faces', 'edges', 'vertices'][part];
  const n = s.fev[part];
  const others = s.fev.filter((x, i) => i !== part);
  const what = ['flat sides', 'lines where two faces meet', 'corners where edges meet'][part];
  return q({
    prompt: `${lead}How many ${word} does ${thing ? 'it' : 'this ' + s.name} have?`,
    visual: solidPic(key),
    correct: n,
    wrong: [{ value: s.seen[part], why: 'That counts only the parts you can see. The dashed lines show hidden ones.' }, ...others.map((v) => ({ value: v, why: `That is the number of ${['faces', 'edges', 'vertices'][s.fev.indexOf(v)]}.` })), n + 1],
    solution: [`${word[0].toUpperCase() + word.slice(1)} are the ${what}.`, 'Count the ones in front and the hidden ones at the back.', `${article(s.name).replace(/^./, (c) => c.toUpperCase())} has ${n} ${word}.`],
    rule: 2,
    skill: 'faces, edges, vertices',
    check: () => (countParts(s.faces)[part] === n ? true : 'parts miscounted'),
  });
}

// Shapes made of smaller shapes. Each returns the outline, the pieces, and names.
function hexPieces(kind) {
  const v = regular(6, 5, 0);
  const c = [0, 0];
  if (kind === 6) return { outer: v, pieces: v.map((p, i) => [c, p, v[(i + 1) % 6]]), piece: 'triangles', whole: 'hexagon' };
  if (kind === 2) return { outer: v, pieces: [[v[0], v[1], v[2], v[3]], [v[3], v[4], v[5], v[0]]], piece: 'trapezoids', whole: 'hexagon' };
  return { outer: v, pieces: [[c, v[0], v[1], v[2]], [c, v[2], v[3], v[4]], [c, v[4], v[5], v[0]]], piece: 'rhombuses', whole: 'hexagon' };
}
function composeTemplate(rng) {
  const t = rng.pick(['diag', 'x', 'hex', 'trap', 'grid', 'grid']);
  if (t === 'diag') {
    const w = rng.int(4, 8);
    const h = rng.intExcept(2, 6, [w]);
    return { outer: [[0, 0], [w, 0], [w, h], [0, h]], pieces: [[[0, 0], [w, 0], [w, h]], [[0, 0], [w, h], [0, h]]], piece: 'triangles', whole: 'rectangle' };
  }
  if (t === 'x') {
    const s = rng.int(3, 6);
    const m = [s / 2, s / 2];
    return { outer: [[0, 0], [s, 0], [s, s], [0, s]], pieces: [[[0, 0], [s, 0], m], [[s, 0], [s, s], m], [[s, s], [0, s], m], [[0, s], [0, 0], m]], piece: 'triangles', whole: 'square' };
  }
  if (t === 'hex') return hexPieces(rng.pick([6, 2, 3]));
  if (t === 'trap') {
    const h = r2(Math.sqrt(3) * 2);
    return { outer: [[0, 0], [8, 0], [6, h], [2, h]], pieces: [[[0, 0], [4, 0], [2, h]], [[4, 0], [6, h], [2, h]], [[4, 0], [8, 0], [6, h]]], piece: 'triangles', whole: 'trapezoid' };
  }
  const r = rng.int(1, 4);
  const c = rng.int(r === 1 ? 2 : 1, 5);
  const pieces = [];
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) pieces.push([[j, i], [j + 1, i], [j + 1, i + 1], [j, i + 1]]);
  return { outer: [[0, 0], [c, 0], [c, r], [0, r]], pieces, piece: 'squares', whole: r === c ? 'square' : 'rectangle' };
}
// Names that would also be right are left out (a square is also a rectangle and a rhombus).
const ALSO = { square: ['rectangle', 'rhombus', 'trapezoid'], rectangle: ['trapezoid'], rhombus: ['trapezoid'] };
const otherNames = (rng, name) => rng.shuffle(['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'trapezoid'].filter((x) => x !== name && !(ALSO[name] ?? []).includes(x)));

function mediumCompose(rng) {
  const t = composeTemplate(rng);
  const deg = rng.pick([0, 0, 30, 45, 90, 120]);
  const outer = turn(t.outer, deg);
  const pieces = t.pieces.map((pc) => turn(pc, deg));
  const n = pieces.length;
  const askCount = rng.bool(0.6);
  const sides = { triangles: 3, squares: 4, trapezoids: 4, rhombuses: 4 }[t.piece];
  return q({
    prompt: askCount ? `This ${t.whole} is made of smaller ${t.piece}. How many ${t.piece} make it?` : `Some ${t.piece} fit together with no gaps. What shape do they make?`,
    visual: cutPic(outer, pieces, `${article(t.whole).replace(/^./, (c) => c.toUpperCase())} made of ${n} ${t.piece}. Lines inside show where the pieces meet.`),
    correct: askCount ? n : t.whole,
    wrong: askCount ? [{ value: outer.length, why: 'That counts the sides of the big shape. Count the small pieces.' }, n + 1, n - 1, n + 2] : otherNames(rng, t.whole),
    solution: askCount ? [`Count the small ${t.piece} one at a time.`, `There are ${n}.`, `${n} ${t.piece} make the ${t.whole}.`] : [`Look at the outside edge only.`, `It has ${outer.length} sides.`, `The ${t.piece} make ${article(t.whole)}.`],
    rule: 3,
    skill: 'composing shapes',
    check: () => (pieces.every((pc) => pc.length === sides) && Math.abs(pieces.reduce((s, pc) => s + area(pc), 0) - area(outer)) < 0.05 ? true : 'pieces do not fill the shape'),
  });
}

function mediumSharesStory(rng) {
  const round = rng.bool();
  const food = rng.pick(round ? ROUND : LONG);
  const kind = rng.pick(['share', 'count', 'compare']);
  if (kind === 'compare') {
    const [a, b] = people(rng, 2);
    const [m, n] = rng.pick([[2, 4], [2, 3], [3, 4], [4, 2], [3, 2], [4, 3]]);
    const big = m < n ? a : b;
    return q({
      prompt: `${a} cuts a ${food} into ${fractionWord(m)}. ${b} cuts the same size ${food} into ${fractionWord(n)}. Whose shares are bigger?`,
      visual: [{ ...foodPic(food, m, rng).visual, alt: `${a}'s ${food}, cut into ${m} equal shares.` }, { ...foodPic(food, n, rng).visual, alt: `${b}'s ${food}, cut into ${n} equal shares.` }],
      correct: `${big}'s shares`,
      wrong: [{ value: `${big === a ? b : a}'s shares`, why: 'More shares means each share is smaller.' }, { value: 'They are the same size.', why: `The ${food}s are the same, but one is cut into more shares.` }, 'You cannot tell.'],
      solution: [`${a} makes ${m} shares. ${b} makes ${n} shares.`, 'Cutting into more shares makes each share smaller.', `So ${big}'s shares are bigger.`],
      rule: 4,
      skill: 'equal shares',
      check: () => (big === (1 / m > 1 / n ? a : b) ? true : 'compare is wrong'),
    });
  }
  const n = rng.int(2, 4);
  const pic = foodPic(food, n, rng);
  if (kind === 'share') {
    const kids = people(rng, n);
    return q({
      prompt: `${joinList(kids)} share a ${food} equally. What part does each get?`,
      visual: pic.visual,
      correct: SHARE[n],
      wrong: [{ value: 'a whole', why: `The whole ${food} is shared. Each one gets a part.` }, ...Object.values(SHARE).filter((s) => s !== SHARE[n])],
      solution: [`There are ${n} people, so there are ${n} equal shares.`, `${n} equal shares are ${fractionWord(n)}.`, `Each gets ${SHARE[n]} of the ${food}.`],
      rule: 4,
      skill: 'equal shares',
      check: () => (pic.areas.length === kids.length && allSame(pic.areas) ? true : 'shares do not match people'),
    });
  }
  const name = person(rng);
  return q({
    prompt: `${name} cuts a ${food} into ${fractionWord(n)}. How many equal shares are there?`,
    visual: pic.visual,
    correct: n,
    wrong: [{ value: n - 1, why: 'Count the shares, not the cuts.' }, n + 1, n === 2 ? 4 : 2],
    solution: [`${fractionWord(n)[0].toUpperCase() + fractionWord(n).slice(1)} means ${n} equal shares.`, `There are ${n} shares.`],
    rule: 4,
    skill: 'equal shares',
    check: () => (pic.areas.length === n && allSame(pic.areas) ? true : 'share count is wrong'),
  });
}

const STICK_SHAPES = [['triangle', 3], ['square', 4], ['pentagon', 5], ['hexagon', 6]];
function sticks(two) {
  return function sticksStory(rng) {
    const name = person(rng);
    const picks = rng.sample(STICK_SHAPES, two ? 2 : 1);
    const counts = picks.map(() => rng.int(two ? 1 : 2, two ? 4 : 5));
    const ask = two ? 'sticks' : rng.pick(['sticks', 'corners']);
    const total = picks.reduce((s, [, k], i) => s + k * counts[i], 0);
    const made = joinList(picks.map(([w], i) => plural(counts[i], w)));
    const wrong = two
      ? [{ value: counts[0] + counts[1], why: 'That counts the shapes. Count the sides of each shape.' }, { value: picks[0][1] * counts[0], why: `Add the sticks for the ${picks[1][0]}s too.` }, counts[0] * picks[1][1] + counts[1] * picks[0][1] === total ? null : counts[0] * picks[1][1] + counts[1] * picks[0][1], total + 1, total - 1]
      : [{ value: counts[0], why: `That counts the shapes. Each ${picks[0][0]} has ${picks[0][1]} ${ask === 'sticks' ? 'sides' : 'corners'}.` }, total + picks[0][1], total - picks[0][1], total + 1];
    return q({
      prompt: ask === 'sticks' ? `${name} makes shapes with craft sticks. Each side is one stick. ${name} makes ${made}. How many sticks are used?` : `${name} draws ${made}. How many corners are there in all?`,
      visual: picks.map(([w, k]) => ({ type: 'polygon', points: regular(k, 3), alt: `${article(w).replace(/^./, (c) => c.toUpperCase())} with ${k} sides and ${k} corners.` })),
      correct: total,
      wrong,
      solution: [...picks.map(([w, k], i) => (counts[i] === 1 ? `1 ${w} has ${k} ${ask === 'sticks' ? 'sides' : 'corners'}.` : R`${counts[i]} ${w}s: \(${Array(counts[i]).fill(k).join(' + ')} = ${k * counts[i]}\).`)), two ? R`In all: \(${picks.map(([, k], i) => k * counts[i]).join(' + ')} = ${total}\).` : `There are ${total} ${ask} in all.`],
      rule: 0,
      skill: 'sides and corners',
      check: () => (picks.reduce((s, [, k], i) => s + cornersOf(regular(k, 3)) * counts[i], 0) === total ? true : 'total does not match'),
    });
  };
}

// ───────────── Hard ─────────────

const QUAD_CHOICES = { square: 'a square', rectangle: 'a rectangle that is not a square', rhombus: 'a rhombus that is not a square', other: 'a quadrilateral that is none of these' };
function quadOf(rng, kind) {
  if (kind === 'square') {
    const a = rng.int(1, 4);
    const b = rng.int(a === 1 ? 1 : 0, 3);
    return [[0, 0], [a, b], [a - b, a + b], [-b, a]];
  }
  if (kind === 'rectangle') {
    if (rng.bool(0.6)) {
      const w = rng.int(2, 7);
      const h = rng.intExcept(2, 5, [w]);
      return [[0, 0], [w, 0], [w, h], [0, h]];
    }
    const [a, b] = rng.pick([[1, 1], [2, 1], [1, 2], [2, 2], [3, 1]]);
    return [[0, 0], [a, b], [a - 2 * b, b + 2 * a], [-2 * b, 2 * a]];
  }
  if (kind === 'rhombus') {
    const [u, v] = rng.pick([[[3, 1], [1, 3]], [[4, 1], [1, 4]], [[4, 2], [2, 4]], [[3, 2], [2, 3]], [[5, 0], [3, 4]], [[5, 0], [4, 3]], [[2, 1], [2, -1]], [[3, 1], [3, -1]], [[3, 2], [3, -2]], [[1, 3], [-1, 3]], [[2, 3], [-2, 3]]]);
    return [[0, 0], u, [u[0] + v[0], u[1] + v[1]], v];
  }
  const t = rng.pick(['para', 'trap', 'kite', 'any']);
  if (t === 'para') {
    const w = rng.int(3, 6);
    const s = rng.int(1, 3);
    const h = rng.int(2, 4);
    return [[0, 0], [w, 0], [w + s, h], [s, h]];
  }
  if (t === 'trap') {
    const w = rng.int(4, 7);
    const p = rng.int(1, 2);
    const qq = rng.int(0, Math.min(2, w - p - 2));
    const h = rng.int(2, 4);
    return [[0, 0], [w, 0], [w - p, h], [qq, h]];
  }
  if (t === 'kite') {
    const a = rng.int(1, 3);
    const b = rng.int(1, 2);
    const c = rng.int(b * 2 + 2, 6);
    return [[0, 0], [a, b], [0, c], [-a, b]];
  }
  const a = rng.int(3, 6);
  const c = rng.int(2, 5);
  return [[0, 0], [a, 0], [rng.int(Math.ceil(a / 2), a + 1), c], [0, rng.int(1, c + 1)]];
}
// Every corner turns the same way and no corner is flat.
const convex = (pts) => {
  const c = pts.map((p, i) => { const a = pts[(i + 3) % 4]; const b = pts[(i + 1) % 4]; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]); });
  return c.every((x) => x > 0) || c.every((x) => x < 0);
};
function quadAlt(f) {
  const groups = f.marks.filter((m) => m > 0);
  const sidesTxt = f.allEq ? 'All 4 sides are the same length.' : !groups.length ? 'No two sides are the same length.' : new Set(groups).size === 2 ? 'It has two pairs of equal sides.' : `${groups.length} of its sides are the same length.`;
  const r = f.right.filter(Boolean).length;
  return `A four-sided shape on a grid. ${sidesTxt} It has ${r === 0 ? 'no' : r} square ${r === 1 ? 'corner' : 'corners'}.`;
}

function hardQuadName(rng) {
  const kind = rng.pick(['square', 'rectangle', 'rhombus', 'other', 'other']);
  let pts = quadOf(rng, kind);
  for (let i = 0; (quadFacts(pts).kind !== kind || !convex(pts)) && i < 30; i++) pts = quadOf(rng, kind);
  const f = quadFacts(pts);
  const whyFor = {
    square: !f.allRight ? 'A square needs 4 square corners.' : 'A square needs 4 sides of the same length.',
    rectangle: !f.allRight ? 'A rectangle needs 4 square corners.' : 'All 4 sides are equal too, so it is a square.',
    rhombus: !f.allEq ? 'A rhombus needs 4 sides of the same length.' : 'It has 4 square corners too, so it is a square.',
    other: 'Check the tick marks and the square corners again. It fits one of the names.',
  };
  return q({
    prompt: 'Sides with the same tick marks are the same length. Which describes this quadrilateral?',
    visual: { type: 'polygon', points: pts, grid: true, marks: f.marks, right: f.right.map((x, i) => (x ? i : -1)).filter((i) => i >= 0), alt: quadAlt(f) },
    correct: QUAD_CHOICES[f.kind],
    wrong: Object.keys(QUAD_CHOICES).filter((k) => k !== f.kind).map((k) => ({ value: QUAD_CHOICES[k], why: whyFor[k] })),
    solution: [f.allEq ? 'All 4 sides are the same length.' : 'The 4 sides are not all the same length.', f.allRight ? 'All 4 corners are square corners.' : 'Not all the corners are square corners.', `So it is ${QUAD_CHOICES[f.kind]}.`],
    rule: 5,
    skill: 'quadrilaterals',
    check: () => (f.kind === kind && convex(pts) ? true : 'shape is not the kind it was built as'),
  });
}

function hardUnitFraction(rng) {
  const n = rng.pick([2, 3, 4, 6, 8]);
  const dir = rng.pick(['v', 'h']);
  const along = n * rng.int(1, Math.max(1, Math.floor((dir === 'v' ? 12 : 8) / n)));
  const other = rng.int(2, dir === 'v' ? 5 : 7);
  const [w, h] = dir === 'v' ? [along, other] : [other, along];
  const pieces = strips(w, h, n, dir);
  const each = (w * h) / n;
  const askFrac = rng.bool();
  return q({
    prompt: askFrac ? `The rectangle is cut into ${n} parts with the same area. What fraction of the whole area is one part?` : `Each small square is 1 square unit. The rectangle is cut into ${n} equal parts. What is the area of one part?`,
    visual: cutPic([[0, 0], [w, 0], [w, h], [0, h]], pieces, `A rectangle on a grid, ${w} squares across and ${h} squares up. Lines cut it into ${n} equal parts.`, true),
    correct: askFrac ? frac(1, n) : each,
    unit: askFrac ? undefined : 'square units',
    wrong: askFrac
      ? [{ value: frac(1, w * h), why: 'That is one small square. Count the parts, not the squares.' }, n > 2 ? { value: frac(1, n - 1), why: 'Count the parts, not the cut lines.' } : null, frac(1, n + 1), frac(2, n + (n % 2 ? 0 : 1))]
      : [{ value: n, why: 'That is the number of parts. Count the squares in one part.' }, { value: w * h, why: 'That is the whole area. Share it among the parts.' }, each + 1, each > 1 ? each - 1 : each + 2],
    solution: askFrac ? [`There are ${n} parts with the same area.`, R`Each part is one of ${n}, so it is \(\frac{1}{${n}}\) of the area.`] : [R`The whole rectangle has \(${w} \times ${h} = ${w * h}\) squares.`, R`Share them among ${n} parts: \(${w * h} \div ${n} = ${each}\).`, `One part is ${plural(each, 'square unit')}.`],
    rule: 4,
    skill: 'unit fractions of area',
    check: () => {
      let cells = 0;
      for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (x + 0.5 < pieces[0][1][0] + 1e-9 && y + 0.5 < pieces[0][2][1] + 1e-9) cells += 1;
      return cells === each && Number.isInteger(each) ? true : 'cells in one part do not match';
    },
  });
}

// ───────────── Challenge ─────────────

const TRUE_FACTS = ['Every square is a rectangle.', 'Every square is a rhombus.', 'Every rectangle is a quadrilateral.', 'Every rhombus is a quadrilateral.', 'A rectangle always has 4 square corners.', 'Some quadrilaterals are not squares, rectangles or rhombuses.', 'A turned square is still a square.'];
const FALSE_FACTS = [
  ['Every rectangle is a square.', 'A rectangle can have two long sides and two short sides.'],
  ['Every rhombus is a square.', 'A rhombus can lean, so its corners are not square.'],
  ['Every quadrilateral is a rectangle.', 'Many 4-sided shapes have no square corners.'],
  ['A rhombus always has 4 square corners.', 'Only a rhombus that is a square has square corners.'],
  ['A square is not a rectangle.', 'A square has 4 square corners, so it is a rectangle too.'],
  ['Every quadrilateral has 4 equal sides.', 'A quadrilateral just needs 4 sides. They can be different lengths.'],
  ['Every rectangle is a rhombus.', 'A rhombus needs 4 equal sides. Most rectangles do not have them.'],
  ['A turned square becomes a rhombus that is not a square.', 'Turning does not change the sides or the corners.'],
];

function challengeQuadTrue(rng) {
  const askTrue = rng.bool();
  const t = rng.sample(TRUE_FACTS, 3);
  const f = rng.sample(FALSE_FACTS, 3);
  return q({
    prompt: askTrue ? 'Which sentence is true?' : 'Which sentence is false?',
    correct: askTrue ? t[0] : f[0][0],
    wrong: askTrue ? f.map(([s, why]) => ({ value: s, why })) : t.map((s) => ({ value: s, why: 'This one is true. Look for a sentence that breaks a rule.' })),
    solution: askTrue ? [`"${t[0]}"`, 'This follows from the rules for squares, rectangles and rhombuses.'] : [`"${f[0][0]}"`, `This is false. ${f[0][1]}`],
    rule: 5,
    skill: 'quadrilaterals',
    check: () => (t.every((x) => TRUE_FACTS.includes(x)) && f.every(([x]) => !TRUE_FACTS.includes(x)) ? true : 'fact lists mixed up'),
  });
}

// Four parts of a 2c-by-2r rectangle: the left half cut across, the right half cut down.
function fourParts(c, r, y = r, x = c / 2) {
  const W = 2 * c;
  const H = 2 * r;
  return [[[0, 0], [c, 0], [c, y], [0, y]], [[0, y], [c, y], [c, H], [0, H]], [[c, 0], [c + x, 0], [c + x, H], [c, H]], [[c + x, 0], [W, 0], [W, H], [c + x, H]]];
}

function challengeSpotShares(rng) {
  const name = person(rng);
  const c = rng.pick([2, 4, 6]);
  const r = rng.pick([1, 2, 3].filter((x) => 2 * x !== c));
  const equal = rng.bool();
  const ys = [...Array(2 * r - 1).keys()].map((i) => i + 1).filter((v) => v !== r);
  const xs = [...Array(c - 1).keys()].map((i) => i + 1).filter((v) => v !== c / 2);
  const pieces = equal ? fourParts(c, r) : ys.length && (rng.bool() || !xs.length) ? fourParts(c, r, rng.pick(ys)) : fourParts(c, r, r, rng.pick(xs));
  const areas = pieces.map(area);
  const outer = [[0, 0], [2 * c, 0], [2 * c, 2 * r], [0, 2 * r]];
  const sizes = areas.join(', ');
  return q({
    prompt: `${name} says each part of this rectangle is one fourth of its area. Is ${name} right?`,
    visual: cutPic(outer, pieces, `A rectangle on a grid, ${2 * c} squares across and ${2 * r} up, cut into 4 parts. The parts cover ${sizes} squares.`, true),
    correct: equal ? 'Yes. All 4 parts cover the same area.' : 'No. The parts do not cover the same area.',
    wrong: equal
      ? [{ value: 'No. The parts are not the same shape.', why: 'Equal shares can have different shapes. Count the squares in each part.' }, 'No. There should be 8 parts.', 'Yes. Any 4 parts are fourths.']
      : [{ value: 'Yes. Any 4 parts are fourths.', why: 'Fourths must be equal shares. Count the squares in each part.' }, 'Yes. All 4 parts cover the same area.', 'No. There should be 8 parts.'],
    solution: [R`The whole has \(${2 * c} \times ${2 * r} = ${4 * c * r}\) squares.`, `The parts cover ${sizes} squares.`, equal ? `They are all the same, so each is one fourth. The shapes can differ.` : `They are not all the same, so they are not fourths.`],
    rule: 4,
    skill: 'unit fractions of area',
    check: () => (allSame(areas) === equal && Math.abs(areas.reduce((s, a) => s + a, 0) - area(outer)) < 1e-9 ? true : 'part areas do not match the claim'),
  });
}

function challengeWhole(rng) {
  const n = rng.pick([2, 3, 4, 6, 8]);
  const each = rng.int(2, 9);
  const name = person(rng);
  const [place, unit] = rng.pick([['garden bed', 'square feet'], ['poster', 'square inches'], ['quilt', 'square feet'], ['wall', 'square meters']]);
  const k = rng.int(1, n - 1);
  const backwards = rng.bool();
  const whole = n * each;
  const w = n * 2;
  const pic = cutPic([[0, 0], [w, 0], [w, 3], [0, 3]], strips(w, 3, n, 'v'), `A rectangle cut into ${n} equal parts.`);
  return q({
    prompt: backwards ? `${name} splits a ${place} into ${n} equal parts. Each part is ${each} ${unit}. What is the area of the whole ${place}?` : `${name} splits a ${place} of ${whole} ${unit} into ${n} equal parts. ${name} paints ${plural(k, 'part')}. How much area is painted?`,
    visual: pic,
    correct: backwards ? whole : k * each,
    unit,
    wrong: backwards ? [{ value: each + n, why: `Each of the ${n} parts has ${each} ${unit}. Add ${n} of them.` }, whole + each, whole - each, each] : [{ value: each, why: k > 1 ? `That is one part. ${name} paints ${k} parts.` : 'Find one part first.' }, { value: whole - k * each, why: 'That is the part not painted.' }, k * each + each, k * n],
    solution: backwards ? [`Each part is \\(\\frac{1}{${n}}\\) of the whole.`, R`${n} parts of ${each}: \(${n} \times ${each} = ${whole}\).`, `The whole is ${whole} ${unit}.`] : [R`One part: \(${whole} \div ${n} = ${each}\) ${unit}.`, R`${plural(k, 'part')}: \(${k} \times ${each} = ${k * each}\).`, `${k * each} ${unit} are painted.`],
    rule: 4,
    skill: 'unit fractions of area',
    check: () => (Array(n).fill(each).reduce((s, x) => s + x, 0) === whole ? true : 'parts do not rebuild the whole'),
  });
}

function challengeRiddle(rng) {
  const ops = [];
  for (const [b, bn] of Object.entries(SHAPE_NAMES)) {
    const k = Number(b);
    for (const d of [1, 2, 3]) {
      if (SHAPE_NAMES[k + d]) ops.push([`${plural(d, 'more side')} than ${article(bn)}`, k + d, `${k} + ${d}`, k]);
      if (SHAPE_NAMES[k - d]) ops.push([`${plural(d, 'fewer corner')} than ${article(bn)}`, k - d, `${k} - ${d}`, k]);
    }
    if (SHAPE_NAMES[2 * k]) ops.push([`twice as many sides as ${article(bn)}`, 2 * k, `${k} + ${k}`, k]);
    if (k % 2 === 0 && SHAPE_NAMES[k / 2]) ops.push([`half as many corners as ${article(bn)}`, k / 2, `${k} \\div 2`, k]);
  }
  const [clue, n, calc, base] = rng.pick(ops);
  const name = SHAPE_NAMES[n];
  const kid = person(rng);
  return q({
    prompt: `${kid} draws a closed shape. It has ${clue}. What shape does ${kid} draw?`,
    visual: { type: 'polygon', points: regular(base, 4), alt: `${article(SHAPE_NAMES[base]).replace(/^./, (c) => c.toUpperCase())}, with ${base} sides and ${base} corners, to compare with.` },
    correct: name,
    wrong: rng.shuffle(Object.values(SHAPE_NAMES).filter((x) => x !== name)),
    solution: [R`Work out the number: \(${calc} = ${n}\).`, 'A shape has as many sides as corners.', `A shape with ${n} sides is ${article(name)}.`],
    rule: 0,
    skill: 'sides and corners',
    check: () => (cornersOf(regular(n)) === n && SHAPE_NAMES[n] === name ? true : 'count does not match the name'),
  });
}

// ───────────── Topic ─────────────

const SQUARE_TURNED = [[0, 0], [3, 1], [2, 4], [-1, 3]];

export default {
  id: 'shapes',
  title: 'Shapes & Their Parts',
  summary: 'Name flat and solid shapes by their sides, corners and faces, put shapes together, and cut them into equal shares.',
  grade: 'Grades 1–3',
  standards: ['CCSS 1.G.A.1', 'CCSS 1.G.A.2', 'CCSS 1.G.A.3', 'CCSS 2.G.A.1', 'CCSS 2.G.A.3', 'CCSS 3.G.A.1', 'CCSS 3.G.A.2'],

  explain: {
    intro: 'A flat shape is closed and has straight sides or a curve. We name it by counting its sides and corners. Solid shapes have faces, edges and vertices. Shapes can be put together or cut into equal shares.',
    rules: [
      {
        title: 'Count the sides and corners',
        text: 'A closed shape with straight sides has as many corners as sides. The number of sides gives the name. Corners are also called vertices.',
        example: '3 sides is a triangle. 4 sides is a quadrilateral. 5 is a pentagon, 6 is a hexagon, 8 is an octagon.',
      },
      {
        title: 'Turning and size do not matter',
        text: 'Colour, size and turning do not change a shape’s name. Only the sides and corners matter. A square is a square even when it stands on a corner.',
        example: 'A big red triangle and a small blue triangle are both triangles.',
      },
      {
        title: 'Solid shapes',
        text: 'A face is a flat side. An edge is where two faces meet. A vertex is a corner where edges meet. Some solids are curved and can roll.',
        example: 'A cube has 6 faces, 12 edges and 8 vertices. A cylinder has 2 flat faces.',
      },
      {
        title: 'Shapes make new shapes',
        text: 'Small shapes can fit together with no gaps. Together they make a bigger shape.',
        example: 'Two triangles can make a rectangle. Six triangles can make a hexagon.',
      },
      {
        title: 'Equal shares',
        text: 'Equal shares cover the same amount. 2 equal shares are halves, 3 are thirds, 4 are fourths. More shares means smaller shares. Equal shares can have different shapes. Each of n equal parts is 1/n of the area.',
        example: R`A square cut into 4 equal parts: each part is a fourth, \(\frac{1}{4}\) of the area.`,
      },
      {
        title: 'Kinds of quadrilaterals',
        text: 'A rhombus has 4 equal sides. A rectangle has 4 square corners. A square has both, so it is also a rectangle and a rhombus. Some quadrilaterals are none of these.',
        example: 'A square is a rectangle. A rectangle with a long side and a short side is not a square.',
      },
    ],
    vocab: [
      { term: 'side', def: 'A straight line that is part of the edge of a flat shape.' },
      { term: 'vertex', def: 'A corner, where two sides or edges meet. More than one are vertices.' },
      { term: 'quadrilateral', def: 'A closed shape with 4 straight sides.' },
      { term: 'face', def: 'A flat side of a solid shape.' },
      { term: 'edge', def: 'A line where two faces of a solid meet.' },
      { term: 'equal shares', def: 'Parts of a whole that are all the same size.' },
    ],
    mistakes: [
      'Thinking a turned square is a new shape. Count its sides and check its corners.',
      'Counting only the faces you can see on a solid. Remember the hidden ones.',
      'Counting the cut lines instead of the shares.',
      'Thinking equal shares must look the same. They only need the same area.',
    ],
    visual: [
      { type: 'polygon', points: regular(3, 4), alt: 'A triangle: 3 sides and 3 corners.' },
      { type: 'polygon', points: SQUARE_TURNED, right: [0, 1, 2, 3], marks: [1, 1, 1, 1], alt: 'A square standing on a corner: 4 equal sides and 4 square corners.' },
      { type: 'polygon', points: regular(6, 4), alt: 'A hexagon: 6 sides and 6 corners.' },
    ],
  },

  examples: [
    {
      title: 'Name a turned shape',
      problem: 'What is the name of this shape?',
      steps: ['Count the sides: there are 4.', 'The tick marks show all 4 sides are equal.', 'All 4 corners are square corners.', 'Turning does not change the name.'],
      answer: 'A square',
      visual: { type: 'polygon', points: SQUARE_TURNED, right: [0, 1, 2, 3], marks: [1, 1, 1, 1], grid: true, alt: 'A shape on a grid standing on a corner. It has 4 equal sides and 4 square corners.' },
    },
    {
      title: 'Faces, edges and vertices',
      problem: 'How many faces, edges and vertices does a pyramid with a square base have?',
      steps: ['Faces: 1 square on the bottom and 4 triangles. That is 5.', 'Edges: 4 around the bottom and 4 up to the top. That is 8.', 'Vertices: 4 at the bottom and 1 on top. That is 5.'],
      answer: '5 faces, 8 edges, 5 vertices',
      visual: solidPic('pyramid'),
    },
    {
      title: 'Word problem: sharing a pizza',
      word: true,
      problem: 'Four friends share a pizza equally. What part does each friend get?',
      steps: ['There are 4 friends, so cut 4 equal shares.', '4 equal shares are called fourths.', R`Each friend gets a fourth of the pizza, \(\frac{1}{4}\).`],
      answer: 'A fourth of the pizza',
      visual: { ...foodPic('pizza', 4, null).visual },
    },
    {
      title: 'Equal area, different shapes',
      problem: 'A 4 by 2 rectangle is cut into 4 parts. Two parts stand up and two lie down. Is each part a fourth?',
      steps: [R`The whole has \(4 \times 2 = 8\) squares.`, 'Each part covers 2 squares.', 'The parts have the same area, so each is a fourth.'],
      answer: 'Yes, each part is a fourth',
      visual: cutPic([[0, 0], [4, 0], [4, 2], [0, 2]], fourParts(2, 1, 1), 'A rectangle on a grid, 4 squares across and 2 up, cut into 4 parts. Each part covers 2 squares.', true),
    },
  ],

  models: [
    {
      id: 'stick-shapes',
      title: 'Word problem: shapes from sticks',
      word: true,
      intro: 'Choose how many of each shape. Each side uses one stick.',
      inputs: [
        { name: 't', label: 'Triangles', type: 'int', min: 0, max: 10, value: 2 },
        { name: 's', label: 'Squares', type: 'int', min: 0, max: 10, value: 1 },
        { name: 'p', label: 'Pentagons', type: 'int', min: 0, max: 10, value: 0 },
        { name: 'h', label: 'Hexagons', type: 'int', min: 0, max: 10, value: 1 },
      ],
      compute({ t, s, p, h }) {
        const list = [['triangle', 3, t], ['square', 4, s], ['pentagon', 5, p], ['hexagon', 6, h]].filter(([, , c]) => c > 0);
        if (!list.length) return { error: 'Make at least one shape.' };
        const total = list.reduce((sum, [, k, c]) => sum + k * c, 0);
        return {
          problem: `Ella makes ${joinList(list.map(([w, , c]) => plural(c, w)))} with sticks. How many sticks does Ella use?`,
          steps: [...list.map(([w, k, c]) => R`Each ${w} has ${k} sides. ${plural(c, w)}: \(${c} \times ${k} = ${c * k}\).`), list.length > 1 ? R`Add them: \(${list.map(([, k, c]) => k * c).join(' + ')} = ${total}\).` : `That is all the shapes.`],
          answer: `${plural(total, 'stick')}`,
          visual: list.map(([w, k]) => ({ type: 'polygon', points: regular(k, 3), alt: `${article(w).replace(/^./, (x) => x.toUpperCase())} with ${k} sides.` })),
        };
      },
    },
    {
      id: 'equal-parts',
      title: 'Cut a rectangle into equal parts',
      intro: 'Choose the size of the rectangle and how many equal parts.',
      inputs: [
        { name: 'n', label: 'Equal parts', type: 'int', min: 2, max: 8, value: 4 },
        { name: 'w', label: 'Squares across', type: 'int', min: 1, max: 12, value: 8 },
        { name: 'h', label: 'Squares up', type: 'int', min: 1, max: 6, value: 3 },
      ],
      compute({ n, w, h }) {
        if (w % n !== 0) return { error: `The squares across must split evenly into ${n} columns. Try ${n} or ${2 * n}.` };
        const each = (w * h) / n;
        return {
          problem: `A rectangle ${w} squares across and ${h} up is cut into ${n} equal parts. What is each part?`,
          steps: [`There are ${n} equal parts. Each one is called a ${fractionWord(n, 1)}.`, R`Each part is \(\frac{1}{${n}}\) of the area.`, R`The whole has \(${w} \times ${h} = ${w * h}\) squares.`, R`Each part has \(${w * h} \div ${n} = ${each}\) ${each === 1 ? 'square' : 'squares'}.`],
          answer: R`Each part is \(\frac{1}{${n}}\) of the area: ${plural(each, 'square unit')}`,
          visual: cutPic([[0, 0], [w, 0], [w, h], [0, h]], strips(w, h, n, 'v'), `A rectangle on a grid, ${w} squares across and ${h} up, cut into ${n} equal parts.`, true),
        };
      },
    },
  ],

  quiz: {
    easy: [easyCountSides, easyNameShape, easyShares, easyNameSolid],
    medium: [mediumSolidParts, mediumCompose, mediumSharesStory, sticks(false)],
    hard: [hardQuadName, hardUnitFraction, sticks(true)],
    challenge: [challengeQuadTrue, challengeSpotShares, challengeWhole, challengeRiddle],
  },
};
