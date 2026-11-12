import { R, q, person, plural, txt } from '../../lib/index.js';
import { M, N } from './_shared.js';

const UNITS = ['cm', 'm', 'ft', 'yd'];
const sq = (u) => `square ${u}`;
const cu = (u) => `cubic ${u}`;

// A rectangle, l across and w up. `labels` names the bottom and right sides.
function rectPic(l, w, u, { grid = false, all = false } = {}) {
  const sides = grid ? undefined : all ? [`${l} ${u}`, `${w} ${u}`, `${l} ${u}`, `${w} ${u}`] : [`${l} ${u}`, `${w} ${u}`];
  return { type: 'polygon', points: [[0, 0], [l, 0], [l, w], [0, w]], sides, grid, alt: grid ? `A rectangle on a grid. It is ${l} squares across and ${w} squares up.` : `A rectangle ${l} ${u} long and ${w} ${u} wide.` };
}

// An L-shape: an a-by-b rectangle with a c-by-d corner cut from the top right.
// Sides in order: bottom, right, inner step across, inner step up, top, left.
function lShape(a, b, c, d, u, hide = []) {
  const lengths = [a, b - d, c, d, a - c, b];
  return {
    type: 'polygon',
    points: [[0, 0], [a, 0], [a, b - d], [a - c, b - d], [a - c, b], [0, b]],
    sides: lengths.map((v, i) => (hide.includes(i) ? '?' : `${v} ${u}`)),
    alt: `An L-shaped figure. Bottom ${a} ${u}, left side ${b} ${u}, top ${a - c} ${u}. A step ${d} ${u} tall is cut from the top right corner.`,
  };
}
const lParts = (rng) => {
  const a = rng.int(5, 10);
  const b = rng.int(4, 8);
  return { a, b, c: rng.int(2, a - 2), d: rng.int(2, b - 2) };
};
// Count the unit squares of the L-shape one by one (an independent check of the area).
const lCount = (a, b, c, d) => {
  let n = 0;
  for (let x = 0; x < a; x++) for (let y = 0; y < b; y++) if (!(x >= a - c && y >= b - d)) n += 1;
  return n;
};
// Two different side lengths with the longer one first, so "long" and "wide" read naturally.
const longWide = (rng, lo, hi) => {
  const [x, y] = rng.sample(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), 2);
  return [Math.max(x, y), Math.min(x, y)];
};
// A box picture. Pass short = true to label the edges with numbers only (the unit is long, such as "cubes").
const boxPic = (l, w, h, u, short = false) => ({ type: 'solid', kind: 'box', labels: short ? { l: `${l}`, w: `${w}`, h: `${h}` } : { l: `${l} ${u}`, w: `${w} ${u}`, h: `${h} ${u}` }, alt: `A box ${l} ${u} long, ${w} ${u} wide and ${h} ${u} tall.` });

// ───────────── Easy: unit squares, sides of a rectangle ─────────────

function easyAreaCount(rng) {
  const l = rng.int(2, 8);
  const w = rng.int(2, 6);
  const area = l * w;
  return q({
    prompt: `Each small square is 1 square unit. The rectangle is ${l} squares across and ${w} squares up. What is its area?`,
    visual: rectPic(l, w, '', { grid: true }),
    correct: area,
    unit: 'square units',
    wrong: [{ value: 2 * (l + w), why: 'That is the distance around. Area counts the squares inside.' }, { value: l + w, why: `There are ${w} rows of ${l} squares. Count every row.` }, area + l, area - w],
    solution: [`There are ${w} rows with ${l} squares in each row.`, R`\(${w} \times ${l} = ${area}\).`, `The area is ${area} square units.`],
    rule: 1,
    skill: 'area',
    check: () => (Array(w).fill(l).reduce((s, v) => s + v, 0) === area ? true : 'rows do not add up'),
  });
}

function easyPerimeter(rng) {
  const u = rng.pick(UNITS);
  const [l, w] = longWide(rng, 2, 12);
  const p = 2 * l + 2 * w;
  return q({
    prompt: `A rectangle is ${l} ${u} long and ${w} ${u} wide. What is its perimeter?`,
    visual: rectPic(l, w, u, { all: true }),
    correct: p,
    unit: u,
    wrong: [{ value: l + w, why: 'This adds only two sides. A rectangle has four sides.' }, { value: l * w, why: 'That is the area. Perimeter is the distance around.' }, p + 2, 2 * l + w],
    solution: ['Perimeter is the distance around. Add all four sides.', R`\(${l} + ${w} + ${l} + ${w} = ${p}\).`, `The perimeter is ${p} ${u}.`],
    rule: 0,
    skill: 'perimeter',
    check: () => ([l, w, l, w].reduce((s, v) => s + v, 0) === p ? true : 'sides do not add up'),
  });
}

function easyArea(rng) {
  const u = rng.pick(UNITS);
  const [l, w] = longWide(rng, 2, 10);
  const area = l * w;
  return q({
    prompt: `A rectangle is ${l} ${u} long and ${w} ${u} wide. What is its area?`,
    visual: rectPic(l, w, u),
    correct: area,
    unit: sq(u),
    wrong: [{ value: 2 * (l + w), why: 'That is the perimeter. Area is length times width.' }, { value: l + w, why: 'Adding the sides does not count the squares inside. Multiply.' }, area + l, area - w],
    solution: [`Think of ${w} rows of ${l} unit squares.`, R`Area is length times width: \(${l} \times ${w} = ${area}\).`, `The area is ${area} ${sq(u)}.`],
    rule: 1,
    skill: 'area',
    check: () => (Array(w).fill(l).reduce((s, v) => s + v, 0) === area ? true : 'rows do not add up'),
  });
}

function easySquare(rng) {
  const u = rng.pick(UNITS);
  const s = rng.int(2, 10);
  const around = rng.bool();
  return q({
    prompt: `A square has sides ${s} ${u} long. What is its ${around ? 'perimeter' : 'area'}?`,
    correct: around ? 4 * s : s * s,
    unit: around ? u : sq(u),
    wrong: around
      ? [{ value: s * s, why: 'That is the area. Perimeter is the distance around.' }, { value: 2 * s, why: 'A square has 4 equal sides. Add all four.' }, 4 * s + 4, 3 * s, 4 * s + 2]
      : [{ value: 4 * s, why: 'That is the perimeter. Area is side times side.' }, { value: 2 * s, why: `Multiply ${s} by ${s}. Do not double it.` }, s * s + s, s * s - 1, s * s + 2],
    solution: around ? ['A square has 4 equal sides.', R`\(4 \times ${s} = ${4 * s}\).`, `The perimeter is ${4 * s} ${u}.`] : ['A square is a rectangle with equal sides.', R`\(${s} \times ${s} = ${s * s}\).`, `The area is ${s * s} ${sq(u)}.`],
    rule: around ? 0 : 1,
    skill: around ? 'perimeter' : 'area',
    check: () => ((around ? s + s + s + s === 4 * s : Array(s).fill(s).reduce((t, v) => t + v, 0) === s * s) ? true : 'square does not match'),
  });
}

// ───────────── Medium: missing sides; which measure? ─────────────

const AROUND = [(l, w, u) => `A garden is ${l} ${u} long and ${w} ${u} wide. How much fence is needed to go all the way around it?`, (l, w, u) => `A picture is ${l} ${u} long and ${w} ${u} wide. How much ribbon is needed to make a border around it?`, (l, w, u) => `A field is ${l} ${u} long and ${w} ${u} wide. How far is one walk around its edge?`];
const COVER = [(l, w, u) => `A floor is ${l} ${u} long and ${w} ${u} wide. How much carpet is needed to cover it?`, (l, w, u) => `A wall is ${l} ${u} long and ${w} ${u} high. How much paper is needed to cover it?`, (l, w, u) => `A garden is ${l} ${u} long and ${w} ${u} wide. How much ground is there for planting?`];

function mediumStory(rng) {
  const u = rng.pick(['m', 'ft', 'yd']);
  const [l, w] = longWide(rng, 3, 15);
  const around = rng.bool();
  const p = 2 * (l + w);
  const area = l * w;
  return q({
    prompt: rng.pick(around ? AROUND : COVER)(l, w, u),
    visual: rectPic(l, w, u),
    correct: around ? p : area,
    fmt: (v) => `${M(v)} ${around ? u : sq(u)}`,
    wrong: around
      ? [{ value: area, why: 'That is the area inside. Going around the edge is the perimeter.' }, { value: l + w, why: 'That is only two sides. Go all the way around.' }, p + 4, p - 2, 2 * l + w]
      : [{ value: p, why: 'That is the distance around. Covering a surface is area.' }, { value: l + w, why: 'Covering needs rows of squares. Multiply length by width.' }, area + l, area - w, area + 10],
    solution: around
      ? ['Going around the edge is the perimeter.', R`Add all four sides: \(${l} + ${w} + ${l} + ${w} = ${p}\).`, `The answer is ${p} ${u}.`]
      : ['Covering a flat surface is the area.', R`Multiply length by width: \(${l} \times ${w} = ${area}\).`, `The answer is ${area} ${sq(u)}.`],
    rule: 5,
    skill: 'word problems',
    check: () => ((around ? [l, w, l, w].reduce((s, v) => s + v, 0) === p : Array(w).fill(l).reduce((s, v) => s + v, 0) === area) ? true : 'measure does not match'),
  });
}

function mediumMissingPerimeter(rng) {
  const u = rng.pick(UNITS);
  const [l, w] = longWide(rng, 2, 14);
  const p = 2 * (l + w);
  return q({
    prompt: `The perimeter of a rectangle is ${p} ${u}. It is ${l} ${u} long. How wide is it?`,
    visual: { type: 'polygon', points: [[0, 0], [l, 0], [l, w], [0, w]], sides: [`${l} ${u}`, '?'], alt: `A rectangle ${l} ${u} long. Its width is marked with a question mark.` },
    correct: w,
    unit: u,
    wrong: [
      { value: p - l, why: 'There are two long sides. Take both away, then share what is left between the two short sides.' },
      { value: p - 2 * l, why: 'That is both short sides together. Halve it to get one side.' },
      w + 1,
      w - 1 || w + 2,
      p / 2,
    ],
    solution: [R`The two long sides use \(${l} + ${l} = ${2 * l}\) ${u}.`, R`That leaves \(${p} - ${2 * l} = ${2 * w}\) ${u} for the two short sides.`, R`Each short side is \(${2 * w} \div 2 = ${w}\) ${u}.`],
    rule: 2,
    skill: 'missing side',
    check: () => (l + w + l + w === p ? true : 'sides do not rebuild the perimeter'),
  });
}

function mediumMissingArea(rng) {
  const u = rng.pick(UNITS);
  const [l, w] = longWide(rng, 2, 12);
  const area = l * w;
  return q({
    prompt: `A rectangle has an area of ${area} ${sq(u)}. It is ${l} ${u} long. How wide is it?`,
    visual: { type: 'polygon', points: [[0, 0], [l, 0], [l, w], [0, w]], sides: [`${l} ${u}`, '?'], alt: `A rectangle ${l} ${u} long. Its width is marked with a question mark.` },
    correct: w,
    unit: u,
    wrong: [
      { value: area - l, why: 'Area is length times width. To undo multiplying, divide.' },
      area / 2 - l > 0 && area / 2 - l !== w ? { value: area / 2 - l, why: `That treats ${area} as a perimeter. It is an area, so divide by the length.` } : null,
      w + 1,
      w - 1,
      w + 2,
    ],
    solution: [R`Area is length times width: \(${l} \times \square = ${area}\).`, R`Divide to find the missing side: \(${area} \div ${l} = ${w}\).`, `The rectangle is ${w} ${u} wide.`],
    rule: 2,
    skill: 'missing side',
    check: () => (l * w === area ? true : 'sides do not rebuild the area'),
  });
}

// ───────────── Hard: L-shapes and volume ─────────────

function hardLArea(rng) {
  const u = rng.pick(UNITS);
  const { a, b, c, d } = lParts(rng);
  const area = a * (b - d) + (a - c) * d;
  return q({
    prompt: 'What is the area of this L-shaped figure? All the corners are square corners.',
    visual: lShape(a, b, c, d, u),
    correct: area,
    unit: sq(u),
    wrong: [
      { value: a * b, why: `That is a full ${a} by ${b} rectangle. A corner is missing from this figure.` },
      { value: 2 * (a + b), why: 'That is the distance around. Area is the space inside.' },
      { value: a * (b - d) + c * d, why: `The top part is ${a - c} ${u} across, not ${c}.` },
      area + a,
      area - d,
    ],
    solution: [
      `Split the figure into two rectangles with a line across at the step.`,
      R`Bottom rectangle: \(${a} \times ${b - d} = ${a * (b - d)}\).`,
      R`Top rectangle: \(${a - c} \times ${d} = ${(a - c) * d}\).`,
      R`Add the parts: \(${a * (b - d)} + ${(a - c) * d} = ${area}\) ${sq(u)}.`,
    ],
    rule: 3,
    skill: 'area of joined rectangles',
    check: () => (lCount(a, b, c, d) === area ? true : 'unit squares do not match the area'),
  });
}

function hardLPerimeter(rng) {
  const u = rng.pick(UNITS);
  const { a, b, c, d } = lParts(rng);
  const sides = [a, b - d, c, d, a - c, b];
  const p = sides.reduce((s, v) => s + v, 0);
  return q({
    prompt: 'What is the perimeter of this L-shaped figure? All the corners are square corners.',
    visual: lShape(a, b, c, d, u),
    correct: p,
    unit: u,
    wrong: [
      { value: p - c - d, why: 'The two short sides of the step are part of the edge too. Add all six sides.' },
      { value: a * b - c * d, why: 'That is the area inside. Perimeter is the distance around.' },
      { value: a + b, why: 'That is only two of the six sides.' },
      p + 2,
      p - 1,
    ],
    solution: ['Go around the figure and add every side. There are six.', R`\(${sides.join(' + ')} = ${p}\).`, `The perimeter is ${p} ${u}.`],
    rule: 3,
    skill: 'perimeter of joined rectangles',
    check: () => (p === 2 * a + 2 * b ? true : 'six sides do not match the outline'),
  });
}

function hardVolumeCubes(rng) {
  const l = rng.int(2, 6);
  const w = rng.int(2, 5);
  const h = rng.int(2, 5);
  const v = l * w * h;
  return q({
    prompt: `A box is built from unit cubes. It is ${l} cubes long, ${w} cubes wide and ${h} cubes tall. How many cubes are in the box?`,
    visual: boxPic(l, w, h, 'cubes', true),
    correct: v,
    unit: 'cubes',
    wrong: [
      { value: l * w, why: `That is one layer. The box has ${h} layers.` },
      { value: l + w + h, why: 'Adding the three numbers does not count the cubes. Multiply.' },
      { value: 2 * (l * w + l * h + w * h), why: 'That counts squares on the outside. Volume counts the cubes that fill the box.' },
      v + l * w,
      v - l,
    ],
    solution: [R`One layer has \(${l} \times ${w} = ${l * w}\) cubes.`, R`There are ${h} layers: \(${l * w} \times ${h} = ${v}\).`, `The box holds ${v} cubes. Its volume is ${v} cubic units.`],
    rule: 4,
    skill: 'volume',
    check: () => (Array(h).fill(l * w).reduce((s, x) => s + x, 0) === v ? true : 'layers do not add up'),
  });
}

function hardVolume(rng) {
  const u = rng.pick(['cm', 'ft', 'm']);
  const l = rng.int(3, 12);
  const w = rng.int(2, 9);
  const h = rng.int(2, 9);
  const base = l * w;
  const v = base * h;
  const [thing, stuff] = rng.pick([['A fish tank', 'water'], ['A sandbox', 'sand'], ['A crate', 'packing foam'], ['A planter box', 'soil']]);
  const fromBase = rng.bool(0.35);
  return q({
    prompt: fromBase
      ? `The bottom of a box has an area of ${base} ${sq(u)}. The box is ${h} ${u} tall. What is the volume of the box?`
      : `${thing} is ${l} ${u} long, ${w} ${u} wide and ${h} ${u} deep. How much ${stuff} fills it to the top?`,
    visual: fromBase ? undefined : boxPic(l, w, h, u),
    correct: v,
    fmt: (x) => `${M(x)} ${cu(u)}`,
    wrong: fromBase
      ? [{ value: base + h, why: 'Each layer has the same number of cubes. Multiply the base area by the height.' }, v + base, v - base, base * (h + 2), { value: base, why: `That is one layer. There are ${h} layers.` }]
      : [{ value: base, why: `That is only the bottom layer. Multiply by the depth, ${h}.` }, { value: l + w + h, why: 'Volume is length times width times height, not a sum.' }, v + base, v - base, l * h],
    solution: fromBase
      ? [`One layer of cubes covers the bottom: ${base} cubes.`, R`The box is ${h} layers tall: \(${N(base)} \times ${h} = ${N(v)}\).`, `The volume is ${M(v)} ${cu(u)}.`]
      : [R`Bottom layer: \(${l} \times ${w} = ${base}\).`, R`Multiply by the depth: \(${base} \times ${h} = ${N(v)}\).`, `It holds ${M(v)} ${cu(u)} of ${stuff}.`],
    rule: 4,
    skill: fromBase ? 'volume' : 'word problems',
    check: () => (Array(h).fill(base).reduce((s, x) => s + x, 0) === v && base === l * w ? true : 'layers do not add up'),
  });
}

// ───────────── Challenge ─────────────

function challengeMissingHeight(rng) {
  const u = rng.pick(['cm', 'ft', 'm']);
  const l = rng.int(3, 10);
  const w = rng.int(2, 8);
  const h = rng.intExcept(2, 9, [l, w]);
  const v = l * w * h;
  return q({
    prompt: `A box has a volume of ${txt(v)} ${cu(u)}. It is ${l} ${u} long and ${w} ${u} wide. How tall is it?`,
    correct: h,
    unit: u,
    wrong: [
      { value: v / l, why: `Divide by the whole bottom layer, \\(${l} \\times ${w} = ${l * w}\\), not just by ${l}.` },
      { value: v - l - w, why: 'Volume comes from multiplying. To undo it, divide.' },
      h + 1,
      h - 1 || h + 2,
      l !== h ? l : w,
    ],
    solution: [R`The bottom layer is \(${l} \times ${w} = ${l * w}\) ${sq(u)}.`, R`Volume is bottom layer times height: \(${l * w} \times \square = ${N(v)}\).`, R`\(${N(v)} \div ${l * w} = ${h}\), so the box is ${h} ${u} tall.`],
    rule: 4,
    skill: 'missing side',
    check: () => (l * w * h === v ? true : 'sides do not rebuild the volume'),
  });
}

function challengeLMissing(rng) {
  const u = rng.pick(UNITS);
  const { a, b, c, d } = lParts(rng);
  const area = a * (b - d) + (a - c) * d;
  const p = 2 * (a + b);
  const wantArea = rng.bool();
  return q({
    prompt: `Two sides of this L-shaped figure are marked with a question mark. All the corners are square corners. What is the ${wantArea ? 'area' : 'perimeter'} of the figure?`,
    visual: lShape(a, b, c, d, u, [1, 2]),
    correct: wantArea ? area : p,
    unit: wantArea ? sq(u) : u,
    wrong: wantArea
      ? [{ value: a * b, why: `That is a full ${a} by ${b} rectangle. A corner is missing.` }, { value: a * d + (a - c) * d, why: `Find the missing right side first: \\(${b} - ${d} = ${b - d}\\).` }, area + c, area - d, p]
      : [{ value: a + d + (a - c) + b, why: 'That adds only the four labelled sides. Find the two missing sides and add them too.' }, { value: area, why: 'That is the area inside. Perimeter is the distance around.' }, p + 2, p - 2, p - c],
    solution: [
      R`The missing right side: left side minus the step, \(${b} - ${d} = ${b - d}\) ${u}.`,
      R`The missing step across: bottom minus top, \(${a} - ${a - c} = ${c}\) ${u}.`,
      wantArea ? R`Split into two rectangles: \((${a} \times ${b - d}) + (${a - c} \times ${d}) = ${a * (b - d)} + ${(a - c) * d} = ${area}\).` : R`Add all six sides: \(${[a, b - d, c, d, a - c, b].join(' + ')} = ${p}\).`,
      wantArea ? `The area is ${area} ${sq(u)}.` : `The perimeter is ${p} ${u}.`,
    ],
    rule: 3,
    skill: 'joined rectangles',
    check: () => ((wantArea ? lCount(a, b, c, d) === area : [a, b - d, c, d, a - c, b].reduce((s, v) => s + v, 0) === p) ? true : 'figure does not match'),
  });
}

function challengeTwoBoxes(rng) {
  const u = rng.pick(['cm', 'ft', 'm']);
  const w = rng.int(2, 6);
  const [l1, h1, l2, h2] = [rng.int(3, 9), rng.int(2, 6), rng.int(2, 8), rng.int(2, 6)];
  const v1 = l1 * w * h1;
  const v2 = l2 * w * h2;
  return q({
    prompt: `A step is made of two boxes joined together. One box is ${l1} ${u} long, ${w} ${u} wide and ${h1} ${u} tall. The other is ${l2} ${u} long, ${w} ${u} wide and ${h2} ${u} tall. What is the volume of the whole step?`,
    correct: v1 + v2,
    fmt: (x) => `${M(x)} ${cu(u)}`,
    wrong: [
      { value: (l1 + l2) * w * (h1 + h2), why: 'Find the volume of each box by itself. Then add the two volumes.' },
      { value: v1, why: 'That is only the first box. Add the second box.' },
      { value: v1 + l2 + w + h2, why: 'Multiply the three numbers for the second box too.' },
      v1 + v2 + w,
      v1 + v2 - w * h2,
    ],
    solution: [R`First box: \(${l1} \times ${w} \times ${h1} = ${N(v1)}\).`, R`Second box: \(${l2} \times ${w} \times ${h2} = ${N(v2)}\).`, R`Add them: \(${N(v1)} + ${N(v2)} = ${N(v1 + v2)}\) ${cu(u)}.`],
    rule: 4,
    skill: 'adding volumes',
    check: () => (Array(h1).fill(l1 * w).concat(Array(h2).fill(l2 * w)).reduce((s, x) => s + x, 0) === v1 + v2 ? true : 'layers do not add up'),
  });
}

function challengeStory(rng) {
  const name = person(rng);
  const u = rng.pick(['m', 'ft']);
  const [l, w] = longWide(rng, 4, 12);
  if (rng.bool()) {
    const a = rng.int(2, Math.min(4, l - 2));
    const b = rng.int(1, Math.min(3, w - 2));
    const left = l * w - a * b;
    return q({
      prompt: `${name} paints a wall that is ${l} ${u} long and ${w} ${u} high. A window in the wall is ${a} ${u} long and ${b} ${u} high. It is not painted. How much wall does ${name} paint?`,
      correct: left,
      unit: sq(u),
      wrong: [{ value: l * w, why: 'That is the whole wall. Take away the window.' }, { value: l * w + a * b, why: 'The window is not painted, so subtract its area.' }, { value: 2 * (l + w) - 2 * (a + b), why: 'Paint covers a surface. Use area, not perimeter.' }, left + a, left - b],
      solution: [R`Area of the whole wall: \(${l} \times ${w} = ${l * w}\).`, R`Area of the window: \(${a} \times ${b} = ${a * b}\).`, R`Subtract: \(${l * w} - ${a * b} = ${left}\) ${sq(u)}.`],
      rule: 3,
      skill: 'word problems',
      check: () => (left + a * b === l * w && left > 0 ? true : 'areas do not add back'),
    });
  }
  const p = 2 * (l + w);
  const area = l * w;
  return q({
    prompt: `${name} puts ${p} ${u} of fence around a garden shaped like a rectangle. The garden is ${l} ${u} long. What is the area of the garden?`,
    correct: area,
    unit: sq(u),
    wrong: [{ value: w, why: `That is the width in ${u}. Multiply it by the length to get the area.` }, { value: p * l, why: `${p} ${u} is the distance around, not a side. Find the width first.` }, { value: (p - l) * l, why: 'Take away both long sides, then halve what is left to get the width.' }, area + l, area - w],
    solution: [R`Two long sides use \(${l} + ${l} = ${2 * l}\) ${u} of fence.`, R`The two short sides share \(${p} - ${2 * l} = ${2 * w}\), so each is ${w} ${u}.`, R`Area: \(${l} \times ${w} = ${area}\) ${sq(u)}.`],
    rule: 2,
    skill: 'word problems',
    check: () => (l + w + l + w === p && area === l * w ? true : 'fence does not match the sides'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'area-perimeter-volume',
  title: 'Perimeter, Area & Volume',
  summary: 'Find the distance around a shape, the space inside it, and the space a box takes up.',
  grade: 'Grades 3–5',
  standards: ['CCSS 3.MD.C.7', 'CCSS 3.MD.D.8', 'CCSS 4.MD.A.3', 'CCSS 5.MD.C.5'],

  explain: {
    intro: '**Perimeter** is the distance around a flat shape. **Area** is the space inside it. **Volume** is the space a solid takes up. Each one has its own kind of unit.',
    rules: [
      {
        title: 'Perimeter: add the sides',
        text: 'Walk around the shape and add the length of every side. A rectangle has two long sides and two short sides.',
        example: R`A rectangle 6 cm long and 4 cm wide: \(6 + 4 + 6 + 4 = 20\) cm.`,
      },
      {
        title: 'Area: count the unit squares',
        text: 'Area is how many unit squares cover a shape. For a rectangle, the squares make equal rows. So multiply length by width. Area is measured in square units.',
        example: R`A rectangle 6 cm long and 4 cm wide has 4 rows of 6 squares: \(6 \times 4 = 24\) square cm.`,
      },
      {
        title: 'Finding a missing side',
        text: 'If you know the area and one side, divide. If you know the perimeter and one side, take away two of that side. Then halve what is left.',
        example: R`Area 48 square cm, length 8 cm: width is \(48 \div 8 = 6\) cm.`,
      },
      {
        title: 'Shapes made of rectangles',
        text: 'Split the shape into rectangles. Find each area and add them. If a side has no label, find it from the sides across from it.',
        example: R`An L-shape splits into a 6 by 2 rectangle and a 3 by 2 rectangle: \(12 + 6 = 18\) square units.`,
      },
      {
        title: 'Volume: count the unit cubes',
        text: 'Volume is how many unit cubes fill a solid. Find the cubes in one layer, length times width. Then multiply by the number of layers, the height. Volume is measured in cubic units.',
        example: R`A box 4 cm long, 3 cm wide and 2 cm tall: \(4 \times 3 \times 2 = 24\) cubic cm.`,
      },
      {
        title: 'Which measure fits the story?',
        text: 'Going around an edge is perimeter. Covering a flat surface is area. Filling a space is volume.',
        example: 'A fence around a yard is perimeter. Carpet on a floor is area. Water in a tank is volume.',
      },
    ],
    vocab: [
      { term: 'perimeter', def: 'The distance around the outside of a flat shape.' },
      { term: 'area', def: 'The number of unit squares that cover a flat shape.' },
      { term: 'volume', def: 'The number of unit cubes that fill a solid.' },
      { term: 'square unit', def: 'A square with sides 1 unit long. It is used to measure area.' },
      { term: 'cubic unit', def: 'A cube with edges 1 unit long. It is used to measure volume.' },
    ],
    mistakes: [
      'Mixing up area and perimeter. Around is perimeter. Inside is area.',
      'Adding only two sides for the perimeter of a rectangle. There are four sides.',
      'Leaving out the sides of the step on an L-shape. Every side on the outside counts.',
      'Multiplying only two numbers for volume. A box needs length, width and height.',
    ],
    visual: { type: 'polygon', points: [[0, 0], [6, 0], [6, 4], [0, 4]], grid: true, alt: 'A rectangle on a grid, 6 squares across and 4 squares up. It covers 24 unit squares and the distance around it is 20 units.' },
  },

  examples: [
    {
      title: 'Area and perimeter of a rectangle',
      problem: 'A rectangle is 6 squares across and 4 squares up. Find its area and its perimeter.',
      steps: ['Area: there are 4 rows of 6 squares.', R`\(6 \times 4 = 24\) square units.`, R`Perimeter: add all four sides, \(6 + 4 + 6 + 4 = 20\) units.`],
      answer: 'Area 24 square units, perimeter 20 units',
      visual: rectPic(6, 4, '', { grid: true }),
    },
    {
      title: 'A missing side',
      problem: 'The perimeter of a rectangle is 26 cm. It is 8 cm long. How wide is it?',
      steps: [R`The two long sides use \(8 + 8 = 16\) cm.`, R`That leaves \(26 - 16 = 10\) cm for the two short sides.`, R`Each short side is \(10 \div 2 = 5\) cm.`],
      answer: '5 cm',
    },
    {
      title: 'Area of an L-shape',
      problem: 'Find the area of the L-shaped figure.',
      steps: ['Split the figure into two rectangles with a line across at the step.', R`Bottom rectangle: \(8 \times 3 = 24\).`, R`Top rectangle: \(5 \times 2 = 10\).`, R`Add the parts: \(24 + 10 = 34\) square m.`],
      answer: '34 square m',
      visual: lShape(8, 5, 3, 2, 'm'),
    },
    {
      title: 'Word problem: filling a box',
      word: true,
      problem: 'A toy box is 5 ft long, 4 ft wide and 3 ft tall. How much space is inside it?',
      steps: ['Filling a space is volume.', R`Bottom layer: \(5 \times 4 = 20\) cubes.`, R`There are 3 layers: \(20 \times 3 = 60\).`],
      answer: '60 cubic ft',
      visual: boxPic(5, 4, 3, 'ft'),
    },
  ],

  models: [
    {
      id: 'rectangle',
      title: 'Perimeter and area of a rectangle',
      intro: 'Change the length and the width. Count the squares on the grid.',
      inputs: [
        { name: 'l', label: 'Length (units)', type: 'int', min: 1, max: 12, value: 6 },
        { name: 'w', label: 'Width (units)', type: 'int', min: 1, max: 12, value: 4 },
      ],
      compute({ l, w }) {
        return {
          problem: `A rectangle is ${plural(l, 'unit')} long and ${plural(w, 'unit')} wide. Find its perimeter and its area.`,
          steps: [
            R`Perimeter: add all four sides, \(${l} + ${w} + ${l} + ${w} = ${2 * (l + w)}\) units.`,
            `Area: there ${w === 1 ? 'is 1 row' : `are ${w} rows`} of ${plural(l, 'square')}.`,
            R`\(${l} \times ${w} = ${l * w}\) square ${l * w === 1 ? 'unit' : 'units'}.`,
          ],
          answer: `Perimeter ${2 * (l + w)} units, area ${plural(l * w, 'square unit')}`,
          visual: rectPic(l, w, '', { grid: true }),
          note: l === w ? 'All four sides are equal, so this rectangle is a square.' : undefined,
        };
      },
    },
    {
      id: 'fill-a-box',
      title: 'Word problem: filling a box with cubes',
      word: true,
      intro: 'Change the size of the box. See how the layers build the volume.',
      inputs: [
        { name: 'l', label: 'Length (cm)', type: 'int', min: 1, max: 20, value: 5 },
        { name: 'w', label: 'Width (cm)', type: 'int', min: 1, max: 20, value: 4 },
        { name: 'h', label: 'Height (cm)', type: 'int', min: 1, max: 20, value: 3 },
      ],
      compute({ l, w, h }) {
        const base = l * w;
        return {
          problem: `Maya packs 1-cm cubes into a box. The box is ${l} cm long, ${w} cm wide and ${h} cm tall. How many cubes fill the box?`,
          steps: [R`One layer covers the bottom: \(${l} \times ${w} = ${base}\) ${base === 1 ? 'cube' : 'cubes'}.`, `The box is ${h} cm tall, so there ${h === 1 ? 'is 1 layer' : `are ${h} layers`}.`, R`\(${N(base)} \times ${h} = ${N(base * h)}\).`],
          answer: `${M(base * h)} cubes, so the volume is ${M(base * h)} cubic cm`,
          visual: boxPic(l, w, h, 'cm'),
        };
      },
    },
  ],

  quiz: {
    easy: [easyAreaCount, easyPerimeter, easyArea, easySquare],
    medium: [mediumStory, mediumMissingPerimeter, mediumMissingArea],
    hard: [hardLArea, hardLPerimeter, hardVolumeCubes, hardVolume],
    challenge: [challengeMissingHeight, challengeLMissing, challengeTwoBoxes, challengeStory],
  },
};
