import { R, q, num, frac, Frac, txt, person, round, approx, integrate } from '../../lib/index.js';
import { M, mixed, clean } from './_shared.js';

const EXACT = R`Leave your answer in terms of \(\pi\).`;
const ROUND = R`Use \(3.14\) for \(\pi\) and round to the nearest tenth.`;
const UNITS = ['cm', 'm', 'in', 'ft'];
// A multiple of π for math mode: piTex(36) → "36\pi", piTex(frac(32, 3)) → "\frac{32}{3}\pi".
const piTex = (c) => (c instanceof Frac && !c.isInt() ? R`${c.tex()}\pi` : (c instanceof Frac ? c.n : c) === 1 ? R`\pi` : R`${num(c instanceof Frac ? c.n : c)}\pi`);
const inPi = (unit) => (v) => R`\(${piTex(v)}\) ${unit}`;
const value = (c) => (c instanceof Frac ? c.value : c);
const near = (a, b) => (approx(a, b, 1e-6) ? true : `expected ${b}, got ${a}`);
// Area of a polygon from its corner points (shoelace formula): an independent check on area answers.
const shoelace = (pts) => Math.abs(pts.reduce((s, [x, y], i) => s + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0)) / 2;

// [shift of the top edge, height, slanted side]: the slanted side is a whole number.
const SLANTS = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5], [9, 12, 15], [12, 5, 13]];

function flatShape(tri, b, s, h, slant, unit) {
  const points = tri ? [[0, 0], [b, 0], [s, h]] : [[0, 0], [b, 0], [b + s, h], [s, h]];
  return {
    points,
    visual: { type: 'polygon', points, sides: tri ? [`${b} ${unit}`, '', `${slant} ${unit}`] : [`${b} ${unit}`, `${slant} ${unit}`, '', ''], extra: [{ from: [s, h], to: [s, 0], label: `${h} ${unit}` }], alt: `A ${tri ? 'triangle' : 'parallelogram'} with base ${b} ${unit}, a slanted side of ${slant} ${unit}, and a dashed height of ${h} ${unit} drawn at a right angle to the base.` },
  };
}

// ───────────── Easy (Grade 6): parallelograms, triangles, volume of a box ─────────────

function easyParallelogramTriangle(rng) {
  const [s, h, slant] = rng.pick(SLANTS);
  const b = rng.int(Math.max(5, s + 1), 16);
  const unit = rng.pick(UNITS);
  const tri = rng.bool();
  const area = tri ? (b * h) / 2 : b * h;
  const shape = flatShape(tri, b, s, h, slant, unit);
  return q({
    prompt: `What is the area of this ${tri ? 'triangle' : 'parallelogram'}?`,
    visual: shape.visual,
    correct: area,
    unit: `${unit}²`,
    wrong: tri
      ? [{ value: b * h, why: 'A triangle is half of a parallelogram with the same base and height, so multiply by one half.' }, { value: (b * slant) / 2, why: 'The height is the dashed line that meets the base at a right angle, not the slanted side.' }, b + h + slant, area + b]
      : [{ value: b * slant, why: 'The height is the dashed line that meets the base at a right angle, not the slanted side.' }, { value: (b * h) / 2, why: 'One half is for triangles. A parallelogram is base times height.' }, { value: 2 * (b + slant), why: 'That is the perimeter, the distance around. Area is base times height.' }, area + b],
    solution: tri
      ? [R`Area of a triangle \(= \frac{1}{2} \times \text{base} \times \text{height}\).`, R`The base is \(${b}\) and the height (the dashed line) is \(${h}\): \(\frac{1}{2} \times ${b} \times ${h} = ${num(area)}\).`, `The area is ${num(area)} ${unit}².`]
      : [R`Area of a parallelogram \(= \text{base} \times \text{height}\).`, R`The base is \(${b}\) and the height (the dashed line) is \(${h}\): \(${b} \times ${h} = ${area}\).`, `The area is ${area} ${unit}².`],
    rule: 0,
    skill: tri ? 'area of a triangle' : 'area of a parallelogram',
    check: () => near(area, shoelace(shape.points)),
  });
}

function easyBoxVolume(rng) {
  const [l, w, h] = [rng.int(3, 12), rng.int(2, 9), rng.int(2, 9)];
  const unit = rng.pick(UNITS);
  const v = l * w * h;
  return q({
    prompt: `A box is ${l} ${unit} long, ${w} ${unit} wide and ${h} ${unit} high. What is its volume?`,
    visual: { type: 'solid', kind: 'box', labels: { l: `${l} ${unit}`, w: `${w} ${unit}`, h: `${h} ${unit}` }, alt: `A box ${l} ${unit} long, ${w} ${unit} wide and ${h} ${unit} high.` },
    correct: v,
    unit: `${unit}³`,
    wrong: [{ value: l * w, why: `That is the area of the bottom of the box. Multiply by the height, ${h}, as well.` }, { value: l + w + h, why: 'Volume counts the cubes that fill the box, so the three edges are multiplied, not added.' }, { value: 2 * (l * w + l * h + w * h), why: 'That is the surface area: the total area of the six faces. Volume is length × width × height.' }, v + l * w],
    solution: [R`Volume of a box \(= \text{length} \times \text{width} \times \text{height}\).`, R`\(${l} \times ${w} = ${l * w}\) is the area of the bottom layer.`, R`There are ${h} layers: \(${l * w} \times ${h} = ${v}\). The volume is ${v} ${unit}³.`],
    rule: 4,
    skill: 'volume of a box',
    check: () => near(v / h / w, l),
  });
}

function easyAreaStory(rng) {
  const [s, h, slant] = rng.pick(SLANTS);
  const b = rng.int(Math.max(5, s + 1), 18);
  const tri = rng.bool();
  const area = tri ? (b * h) / 2 : b * h;
  const [text, unit] = tri
    ? rng.pick([[`A triangular sail has a base of ${b} feet and a height of ${h} feet. One of its other sides is ${slant} feet long. How much cloth is in the sail?`, 'ft'], [`A triangular flower bed has a base of ${b} meters and a height of ${h} meters. What is its area?`, 'm'], [`A triangular road sign has a base of ${b} inches and a height of ${h} inches. What is the area of the sign?`, 'in']])
    : rng.pick([[`A parking space is a parallelogram with a base of ${b} feet and a height of ${h} feet. Its slanted sides are ${slant} feet long. What is the area of the space?`, 'ft'], [`A floor tile is a parallelogram with a base of ${b} centimeters and a height of ${h} centimeters. What is the area of the tile?`, 'cm'], [`A solar panel is a parallelogram with a base of ${b} meters and a height of ${h} meters. What is its area?`, 'm']]);
  return q({
    prompt: text,
    correct: area,
    unit: `${unit}²`,
    wrong: [tri ? { value: b * h, why: 'A triangle is half of a parallelogram with the same base and height, so multiply by one half.' } : { value: (b * h) / 2, why: 'One half is for triangles. A parallelogram is base times height.' }, { value: tri ? (b * slant) / 2 : b * slant, why: 'Use the height, which is measured at a right angle to the base, not the length of a slanted side.' }, b + h, area + h],
    solution: [tri ? R`The shape is a triangle, so use \(A = \frac{1}{2} \times \text{base} \times \text{height}\).` : R`The shape is a parallelogram, so use \(A = \text{base} \times \text{height}\).`, tri ? R`\(\frac{1}{2} \times ${b} \times ${h} = ${num(area)}\).` : R`\(${b} \times ${h} = ${area}\).`, `The area is ${num(area)} ${unit}².`],
    rule: 0,
    skill: 'word problems',
    check: () => near(area, shoelace(flatShape(tri, b, s, h, slant, unit).points)),
  });
}

// ───────────── Medium (Grades 6–7): trapezoids, composite figures, surface area, fractional edges, circles ─────────────

function mediumTrapezoidComposite(rng) {
  const unit = rng.pick(UNITS);
  if (rng.bool()) {
    const b1 = rng.int(8, 16);
    const b2 = rng.int(3, b1 - 3);
    const h = rng.int(3, 10);
    const left = rng.int(1, b1 - b2 - 1);
    const points = [[0, 0], [b1, 0], [left + b2, h], [left, h]];
    const area = ((b1 + b2) * h) / 2;
    return q({
      prompt: 'What is the area of this trapezoid?',
      visual: { type: 'polygon', points, sides: [`${b1} ${unit}`, '', `${b2} ${unit}`, ''], extra: [{ from: [left, h], to: [left, 0], label: `${h} ${unit}` }], alt: `A trapezoid with parallel sides of ${b1} ${unit} and ${b2} ${unit}, and a dashed height of ${h} ${unit}.` },
      correct: area,
      unit: `${unit}²`,
      wrong: [{ value: (b1 + b2) * h, why: 'Remember the one half: the area is half the sum of the parallel sides, times the height.' }, { value: b1 * h, why: 'That uses only one of the parallel sides. Add both, then take half.' }, { value: (b1 * b2 * h) / 2, why: 'The two parallel sides are added, not multiplied.' }, area + h],
      solution: [R`Area of a trapezoid \(= \frac{1}{2} \times (b_1 + b_2) \times h\), where \(b_1\) and \(b_2\) are the parallel sides.`, R`Add the parallel sides: \(${b1} + ${b2} = ${b1 + b2}\).`, R`\(\frac{1}{2} \times ${b1 + b2} \times ${h} = ${num(area)}\). The area is ${num(area)} ${unit}².`],
      rule: 1,
      skill: 'area of a trapezoid',
      check: () => near(area, shoelace(points)),
    });
  }
  const a = rng.int(7, 14);
  const d = rng.int(6, 12);
  const c = rng.int(2, a - 3);
  const b = rng.int(2, d - 3);
  const points = [[0, 0], [a, 0], [a, b], [c, b], [c, d], [0, d]];
  const area = a * b + c * (d - b);
  return q({
    prompt: 'All the corners of this L-shaped figure are right angles. What is its area?',
    visual: { type: 'polygon', points, sides: [`${a} ${unit}`, `${b} ${unit}`, '', '', `${c} ${unit}`, `${d} ${unit}`], alt: `An L-shaped figure. The bottom is ${a} ${unit}, the right side is ${b} ${unit}, the top is ${c} ${unit} and the left side is ${d} ${unit}.` },
    correct: area,
    unit: `${unit}²`,
    wrong: [{ value: a * d, why: 'That is the area of the whole rectangle around the figure. A corner piece is missing.' }, { value: a * b + c * d, why: 'The two rectangles overlap in that sum. Split the figure so that no part is counted twice.' }, { value: 2 * (a + d), why: 'That is the perimeter. Area is found by adding the areas of the rectangles.' }, area + c],
    solution: [
      R`Split the figure into two rectangles: a bottom one \(${a}\) by \(${b}\), and a top one \(${c}\) wide.`,
      R`The top rectangle's height is the left side minus the right side: \(${d} - ${b} = ${d - b}\).`,
      R`Areas: \(${a} \times ${b} = ${a * b}\) and \(${c} \times ${d - b} = ${c * (d - b)}\).`,
      R`Add: \(${a * b} + ${c * (d - b)} = ${area}\). The area is ${area} ${unit}².`,
    ],
    rule: 1,
    skill: 'composite figures',
    check: () => near(area, shoelace(points)),
  });
}

function mediumSurfaceArea(rng) {
  const [l, w, h] = [rng.int(4, 12), rng.int(2, 8), rng.int(2, 8)];
  const unit = rng.pick(['cm', 'in']);
  const sa = 2 * (l * w + l * h + w * h);
  const name = person(rng);
  return q({
    prompt: `${name} wraps a box that is ${l} ${unit} long, ${w} ${unit} wide and ${h} ${unit} high. How much paper covers the box exactly, with no overlap? (Find the surface area.)`,
    visual: { type: 'solid', kind: 'box', labels: { l: `${l} ${unit}`, w: `${w} ${unit}`, h: `${h} ${unit}` }, alt: `A box ${l} ${unit} long, ${w} ${unit} wide and ${h} ${unit} high.` },
    correct: sa,
    unit: `${unit}²`,
    wrong: [{ value: sa / 2, why: 'A box has six faces: each of the three different faces has a matching face on the opposite side.' }, { value: l * w * h, why: 'That is the volume, the space inside. Surface area adds the areas of the faces.' }, { value: 2 * l * w + 2 * l * h, why: 'Two faces are missing: the two ends of the box.' }, sa + 2 * l * w],
    solution: [
      'Unfold the box into a net: six rectangles in three matching pairs.',
      R`Top and bottom: \(2 \times ${l} \times ${w} = ${2 * l * w}\). Front and back: \(2 \times ${l} \times ${h} = ${2 * l * h}\). Two ends: \(2 \times ${w} \times ${h} = ${2 * w * h}\).`,
      R`Add: \(${2 * l * w} + ${2 * l * h} + ${2 * w * h} = ${sa}\). The surface area is ${sa} ${unit}².`,
    ],
    rule: 3,
    skill: 'surface area',
    // A second way: the four side faces unroll into one strip (2l + 2w) by h, plus the top and bottom.
    check: () => near(sa, (2 * l + 2 * w) * h + 2 * l * w),
  });
}

function mediumFractionVolume(rng) {
  const half = () => frac(2 * rng.int(1, 4) + 1, 2);
  const l = half();
  const w = rng.bool() ? half() : frac(rng.pick([5, 7, 9]), 4);
  const h = frac(rng.int(2, 6));
  const v = l.mul(w).mul(h);
  const unit = 'ft';
  const whole = (f) => Math.floor(f.value);
  const partwise = frac(whole(l) * whole(w) * h.n).add(l.sub(whole(l)).mul(w.sub(whole(w))));
  const thing = rng.pick(['planter box', 'fish tank', 'storage chest', 'sandbox']);
  return q({
    prompt: R`A ${thing} is \(${l.mixedTex()}\) ${unit} long, \(${w.mixedTex()}\) ${unit} wide and \(${h.n}\) ${unit} high. What is its volume?`,
    correct: v,
    fmt: (x) => `${mixed(x)} ${unit}³`,
    wrong: [{ value: partwise, why: 'Mixed numbers cannot be multiplied part by part. Change them to improper fractions first.' }, { value: l.mul(w), why: `That is the area of the bottom. Multiply by the height, ${h.n}, as well.` }, { value: l.add(w).add(h), why: 'Volume multiplies the three edges. Adding them gives a length.' }, v.add(frac(1, 2))],
    solution: [
      R`Volume \(= \text{length} \times \text{width} \times \text{height}\). Write the mixed numbers as improper fractions: \(${l.mixedTex()} = ${l.tex()}\) and \(${w.mixedTex()} = ${w.tex()}\).`,
      R`\(${l.tex()} \times ${w.tex()} = ${l.mul(w).tex()}\), the area of the bottom.`,
      R`\(${l.mul(w).tex()} \times ${h.n} = ${v.tex()}${v.isInt() ? '' : ` = ${v.mixedTex()}`}\). The volume is \(${v.mixedTex()}\) ${unit}³.`,
    ],
    rule: 4,
    skill: 'volume with fractions',
    check: () => near(v.value, l.value * w.value * h.value),
  });
}

function mediumCircle(rng) {
  const r = rng.int(2, 15);
  const unit = rng.pick(UNITS);
  const giveD = rng.bool();
  const askArea = rng.bool();
  const given = giveD ? `diameter of ${2 * r} ${unit}` : `radius of ${r} ${unit}`;
  const halve = giveD ? [R`The radius is half the diameter: \(${2 * r} \div 2 = ${r}\).`] : [];
  if (askArea) {
    return q({
      prompt: `A circle has a ${given}. What is its area? ${EXACT}`,
      visual: { type: 'circle', ...(giveD ? { diameter: `${2 * r} ${unit}` } : { radius: `${r} ${unit}` }), alt: `A circle with a ${given}.` },
      correct: r * r,
      fmt: inPi(`${unit}²`),
      wrong: [{ value: 2 * r, why: R`That is the circumference, \(2\pi r\). The area is \(\pi r^{2}\).` }, giveD ? { value: 4 * r * r, why: 'That squares the diameter. Halve the diameter to get the radius first.' } : { value: 2 * r * r, why: R`The area is \(\pi r^{2}\). There is no 2 in the area formula.` }, r, r * r + r],
      solution: [...halve, R`Area \(= \pi r^{2} = \pi \times ${r}^{2}\).`, R`\(${r}^{2} = ${r * r}\), so the area is \(${piTex(r * r)}\) ${unit}².`],
      rule: 2,
      skill: 'area of a circle',
      // The area under the two half-circle curves, found numerically.
      check: () => (approx(r * r * Math.PI, integrate((x) => 2 * Math.sqrt(Math.max(0, r * r - x * x)), -r, r, 20000), 1e-3) ? true : 'area does not match the circle'),
    });
  }
  return q({
    prompt: `A circle has a ${given}. What is its circumference? ${EXACT}`,
    visual: { type: 'circle', ...(giveD ? { diameter: `${2 * r} ${unit}` } : { radius: `${r} ${unit}` }), alt: `A circle with a ${given}.` },
    correct: 2 * r,
    fmt: inPi(unit),
    wrong: [{ value: r * r, why: R`That is the area, \(\pi r^{2}\). The circumference is \(2\pi r\), or \(\pi d\).` }, giveD ? { value: 4 * r, why: R`The circumference is \(\pi d\). The diameter is not doubled again.` } : { value: r, why: R`The circumference is \(2\pi r\): \(\pi\) times the diameter, which is twice the radius.` }, 2 * r + 2, r * r + 2 * r],
    solution: giveD ? [R`Circumference \(= \pi d\).`, R`\(\pi \times ${2 * r} = ${piTex(2 * r)}\). The circumference is \(${piTex(2 * r)}\) ${unit}.`] : [R`Circumference \(= 2\pi r\).`, R`\(2 \times \pi \times ${r} = ${piTex(2 * r)}\). The circumference is \(${piTex(2 * r)}\) ${unit}.`],
    rule: 2,
    skill: 'circumference',
    // The perimeter of a regular polygon with very many sides drawn inside the circle.
    check: () => (approx(2 * r * Math.PI, 2e6 * r * Math.sin(Math.PI / 1e6), 1e-6) ? true : 'circumference does not match the circle'),
  });
}

// ───────────── Hard (Grades 7–8): cylinders, circles in stories, triangular prisms ─────────────

function hardCylinder(rng) {
  const r = rng.int(2, 9);
  const h = rng.int(3, 15);
  const [thing, unit] = rng.pick([['can', 'cm'], ['candle', 'cm'], ['drum', 'in'], ['water tank', 'm'], ['water tank', 'ft'], ['pipe section', 'in'], ['storage silo', 'm']]);
  const giveD = rng.bool(0.4);
  const coef = r * r * h;
  return q({
    prompt: `A ${thing} is a cylinder with a ${giveD ? `diameter of ${2 * r}` : `radius of ${r}`} ${unit} and a height of ${h} ${unit}. What is its volume? ${EXACT}`,
    visual: { type: 'solid', kind: 'cylinder', labels: giveD ? { d: `d = ${2 * r} ${unit}`, h: `${h} ${unit}` } : { r: `${r} ${unit}`, h: `${h} ${unit}` }, alt: `A cylinder with a ${giveD ? `diameter of ${2 * r}` : `radius of ${r}`} ${unit} and a height of ${h} ${unit}.` },
    correct: coef,
    fmt: inPi(`${unit}³`),
    wrong: [
      giveD ? { value: 4 * coef, why: 'That uses the diameter as the radius. Halve the diameter first.' } : { value: r * h, why: R`The radius is squared: the base is a circle with area \(\pi r^{2}\).` },
      { value: 2 * r * h, why: R`That is \(2\pi r h\), the area of the curved side. The volume is the base area \(\pi r^{2}\) times the height.` },
      { value: frac(coef, 3), why: 'One third is for a cone. A cylinder is the full base area times the height.' },
      coef + r * r,
    ],
    solution: [...(giveD ? [R`The radius is half the diameter: \(${2 * r} \div 2 = ${r}\).`] : []), R`Volume of a cylinder \(= \pi r^{2} h\): the area of the circular base times the height.`, R`Base area: \(\pi \times ${r}^{2} = ${piTex(r * r)}\).`, R`Times the height: \(${piTex(r * r)} \times ${h} = ${piTex(coef)}\). The volume is \(${piTex(coef)}\) ${unit}³.`],
    rule: 5,
    skill: 'volume of a cylinder',
    check: () => near(coef * Math.PI, integrate(() => Math.PI * r * r, 0, h, 200)),
  });
}

function hardCircleStory(rng) {
  const name = person(rng);
  if (rng.bool()) {
    const w = rng.pick([4, 6, 8, 10, 12]);
    const h = rng.int(3, 9);
    const r = w / 2;
    const half = 0.5 * 3.14 * r * r;
    const ans = round(w * h + half, 1);
    return q({
      prompt: `A window is a rectangle ${w} feet wide and ${h} feet high, with a half circle on top. The flat edge of the half circle is the top of the rectangle. What is the area of the window? ${ROUND}`,
      correct: ans,
      unit: 'ft²',
      wrong: [{ value: round(w * h + 3.14 * r * r, 1), why: 'The top is only half a circle, so use half of the circle area.' }, { value: round(w * h + 0.5 * 3.14 * w * w, 1), why: `The ${w} feet is the diameter of the half circle. Its radius is ${r} ${r === 1 ? 'foot' : 'feet'}.` }, { value: w * h, why: 'That is only the rectangle. Add the area of the half circle.' }, round(ans + 1, 1)],
      solution: [R`Rectangle: \(${w} \times ${h} = ${w * h}\) square feet.`, R`The half circle has diameter \(${w}\), so its radius is \(${r}\). Its area is \(\frac{1}{2} \times 3.14 \times ${r}^{2} = ${num(round(half, 2))}\) square feet.`, R`Total: \(${w * h} + ${num(round(half, 2))} = ${num(round(w * h + half, 2))}\), which is ${num(ans)} ft² to the nearest tenth.`],
      rule: 2,
      skill: 'word problems',
      check: () => (Math.abs(ans - (w * h + (Math.PI * r * r) / 2)) < 0.15 ? true : 'area is too far from the exact value'),
    });
  }
  const r = rng.int(3, 12);
  const k = rng.int(1, 3);
  const coef = (r + k) ** 2 - r * r;
  return q({
    prompt: `A round pond has a radius of ${r} meters. ${name} builds a path ${k} ${k === 1 ? 'meter' : 'meters'} wide all the way around it. What is the area of the path? ${EXACT}`,
    correct: coef,
    fmt: inPi('m²'),
    wrong: [{ value: k * k, why: `The path is a ring, not a small circle of radius ${k}. Subtract the pond from the larger circle.` }, { value: (r + k) ** 2, why: 'That is the pond and the path together. Subtract the area of the pond.' }, { value: 2 * (r + k) - 2 * r || null, why: 'That compares the two circumferences. Area uses the radius squared.' }, coef + r],
    solution: [R`The outer edge of the path is a circle with radius \(${r} + ${k} = ${r + k}\) meters.`, R`Large circle: \(\pi \times ${r + k}^{2} = ${piTex((r + k) ** 2)}\). Pond: \(\pi \times ${r}^{2} = ${piTex(r * r)}\).`, R`Path: \(${piTex((r + k) ** 2)} - ${piTex(r * r)} = ${piTex(coef)}\) m².`],
    rule: 2,
    skill: 'word problems',
    check: () => near(coef * Math.PI, integrate((t) => 2 * Math.PI * t, r, r + k, 200)),
  });
}

function hardTriPrism(rng) {
  const b = rng.int(3, 12);
  const h = rng.pick([2, 4, 6, 8].concat(b % 2 === 0 ? [3, 5, 7] : []));
  const l = rng.int(5, 20);
  const [thing, unit] = rng.pick([['A tent', 'ft'], ['A tent', 'm'], ['A wedge of cheese', 'cm'], ['A wedge of cheese', 'in'], ['A ramp', 'ft'], ['A ramp', 'm'], ['A glass prism', 'cm'], ['A roof space', 'm']]);
  const v = (b * h * l) / 2;
  return q({
    prompt: `${thing} is shaped like a triangular prism. Its triangular end has a base of ${b} ${unit} and a height of ${h} ${unit}, and the prism is ${l} ${unit} long. What is its volume?`,
    visual: { type: 'solid', kind: 'triPrism', labels: { b: `${b} ${unit}`, h: `${h} ${unit}`, l: `${l} ${unit}` }, alt: `A triangular prism. The triangular end has base ${b} ${unit} and height ${h} ${unit}, and the prism is ${l} ${unit} long.` },
    correct: v,
    unit: `${unit}³`,
    wrong: [{ value: b * h * l, why: 'The end is a triangle, so its area is half of base times height.' }, { value: (b * h) / 2, why: `That is the area of the triangular end. Multiply by the length, ${l}.` }, { value: ((b + h) * l) / 2, why: 'The base and height of the triangle are multiplied, not added.' }, v + l],
    solution: [R`Volume of a prism \(=\) area of the end \(\times\) length.`, R`Area of the triangular end: \(\frac{1}{2} \times ${b} \times ${h} = ${(b * h) / 2}\).`, R`Volume: \(${(b * h) / 2} \times ${l} = ${num(v)}\). The volume is ${num(v)} ${unit}³.`],
    rule: 4,
    skill: 'volume of a prism',
    check: () => near(v, integrate((x) => (h * (b - x) * l) / b, 0, b, 200)),
  });
}

// ───────────── Challenge (Grade 8): cones, spheres, working backwards, solids joined together ─────────────

function challengeConeSphere(rng) {
  const r = rng.int(2, 9);
  const unit = rng.pick(UNITS);
  if (rng.bool()) {
    const h = rng.int(3, 12);
    const coef = frac(r * r * h, 3);
    return q({
      prompt: `A cone has a radius of ${r} ${unit} and a height of ${h} ${unit}. What is its volume? ${EXACT}`,
      visual: { type: 'solid', kind: 'cone', labels: { r: `${r} ${unit}`, h: `${h} ${unit}` }, alt: `A cone with a radius of ${r} ${unit} and a height of ${h} ${unit}.` },
      correct: coef,
      fmt: inPi(`${unit}³`),
      wrong: [{ value: r * r * h, why: 'That is the volume of a cylinder. A cone holds one third as much as a cylinder with the same base and height.' }, { value: frac(r * h, 3), why: R`The radius is squared: the base is a circle with area \(\pi r^{2}\).` }, { value: frac(r * r * h, 2), why: 'The fraction for a cone is one third, not one half.' }, coef.add(r)],
      solution: [R`Volume of a cone \(= \frac{1}{3}\pi r^{2} h\).`, R`\(r^{2} h = ${r}^{2} \times ${h} = ${r * r * h}\).`, R`One third of that: \(${coef.isInt() ? R`\frac{${r * r * h}}{3}\pi = ` : ''}${piTex(coef)}\). The volume is \(${piTex(coef)}\) ${unit}³.`],
      rule: 5,
      skill: 'volume of a cone',
      check: () => near(coef.value * Math.PI, integrate((z) => Math.PI * ((r * z) / h) ** 2, 0, h, 400)),
    });
  }
  const coef = frac(4 * r ** 3, 3);
  return q({
    prompt: `A sphere has a radius of ${r} ${unit}. What is its volume? ${EXACT}`,
    visual: { type: 'solid', kind: 'sphere', labels: { r: `${r} ${unit}` }, alt: `A sphere with a radius of ${r} ${unit}.` },
    correct: coef,
    fmt: inPi(`${unit}³`),
    wrong: [{ value: frac(4 * r * r, 3), why: R`The radius is cubed, not squared: \(${r}^{3} = ${r ** 3}\).` }, { value: r ** 3, why: R`Multiply \(r^{3}\) by \(\frac{4}{3}\) as well.` }, { value: frac(4 * r * 3, 3), why: R`\(${r}^{3}\) means \(${r} \times ${r} \times ${r}\), not \(${r} \times 3\).` }, coef.add(r)],
    solution: [R`Volume of a sphere \(= \frac{4}{3}\pi r^{3}\).`, R`\(r^{3} = ${r} \times ${r} \times ${r} = ${r ** 3}\).`, R`\(\frac{4}{3} \times ${r ** 3} = ${coef.tex()}\). The volume is \(${piTex(coef)}\) ${unit}³.`],
    rule: 5,
    skill: 'volume of a sphere',
    check: () => near(coef.value * Math.PI, integrate((x) => Math.PI * (r * r - x * x), -r, r, 400)),
  });
}

function challengeFindDimension(rng) {
  const unit = rng.pick(UNITS);
  const kind = rng.pick(['cylinderHeight', 'coneHeight', 'cylinderRadius', 'boxHeight']);
  const r = rng.int(2, 9);
  const h = rng.int(3, 12);
  if (kind === 'boxHeight') {
    const [l, w] = [rng.int(4, 12), rng.int(2, 9)];
    const v = l * w * h;
    return q({
      prompt: `A box has a volume of ${txt(v)} ${unit}³. Its base is ${l} ${unit} by ${w} ${unit}. How high is the box?`,
      correct: h,
      unit,
      wrong: [{ value: clean(v / (l + w), 1), why: 'The base area is length times width, not length plus width.' }, { value: v - l * w > 0 ? v - l * w : null, why: 'Volume is base area times height, so divide the volume by the base area.' }, h + 1, h + 2, h - 1],
      solution: [R`Volume \(=\) base area \(\times\) height, so height \(=\) volume \(\div\) base area.`, R`Base area: \(${l} \times ${w} = ${l * w}\).`, R`Height: \(${num(v)} \div ${l * w} = ${h}\) ${unit}.`],
      rule: 4,
      skill: 'working backwards',
      check: () => near(l * w * h, v),
    });
  }
  if (kind === 'cylinderRadius') {
    const coef = r * r * h;
    return q({
      prompt: R`A cylinder has a volume of \(${piTex(coef)}\) ${unit}³ and a height of ${h} ${unit}. What is its radius?`,
      correct: r,
      unit,
      wrong: [{ value: r * r, why: R`That is \(r^{2}\). Take the square root to find \(r\).` }, { value: clean(coef / h / 2, 1) !== r ? clean(coef / h / 2, 1) : null, why: R`\(r^{2} = ${r * r}\) means \(r \times r = ${r * r}\). Halving is not the same as taking a square root.` }, r + 1, r + 2, 2 * r],
      solution: [R`\(V = \pi r^{2} h\), so \(${piTex(coef)} = \pi \times r^{2} \times ${h}\).`, R`Divide both sides by \(${h}\pi\): \(r^{2} = ${coef} \div ${h} = ${r * r}\).`, R`\(r = \sqrt{${r * r}} = ${r}\) ${unit}.`],
      rule: 5,
      skill: 'working backwards',
      check: () => near(Math.PI * r * r * h, coef * Math.PI),
    });
  }
  const cone = kind === 'coneHeight';
  const coef = cone ? frac(r * r * h, 3) : frac(r * r * h);
  return q({
    prompt: R`A ${cone ? 'cone' : 'cylinder'} has a volume of \(${piTex(coef)}\) ${unit}³ and a radius of ${r} ${unit}. What is its height?`,
    correct: h,
    unit,
    wrong: [cone ? { value: frac(h, 3), why: R`For a cone, \(V = \frac{1}{3}\pi r^{2} h\). Multiply the volume by 3 before dividing by \(\pi r^{2}\).` } : { value: h * r, why: R`Divide by \(r^{2} = ${r * r}\), not by \(r\).` }, cone ? { value: h * r, why: R`Divide by \(r^{2} = ${r * r}\), not by \(r\).` } : h * 3, h + 1, h + 2, h - 1],
    solution: cone
      ? [R`\(V = \frac{1}{3}\pi r^{2} h\), so \(${piTex(coef)} = \frac{1}{3} \times \pi \times ${r * r} \times h\).`, R`Multiply both sides by 3 and divide by \(\pi\): \(${r * r * h} = ${r * r}h\).`, R`Divide by \(${r * r}\): \(h = ${h}\) ${unit}.`]
      : [R`\(V = \pi r^{2} h\), so \(${piTex(coef)} = \pi \times ${r * r} \times h\).`, R`Divide both sides by \(${piTex(r * r)}\): \(h = ${r * r * h} \div ${r * r} = ${h}\) ${unit}.`],
    rule: 5,
    skill: 'working backwards',
    check: () => near(coef.value * Math.PI, integrate((z) => Math.PI * (cone ? (r * z) / h : r) ** 2, 0, h, 400)),
  });
}

function challengeCompositeSolid(rng) {
  const r = rng.pick([3, 6, 9, 2, 4, 5]);
  const h = rng.int(r + 1, 14);
  const cone = rng.bool();
  const hemi = frac(2 * r ** 3, 3);
  const body = cone ? frac(r * r * h, 3) : frac(r * r * h);
  const total = body.add(hemi);
  const unit = cone ? 'cm' : 'm';
  return q({
    prompt: cone
      ? `An ice cream cone has a radius of ${r} cm and a height of ${h} cm. It is filled with ice cream, with half a sphere of ice cream of the same radius on top. What is the total volume of ice cream? ${EXACT}`
      : `A grain silo is a cylinder with a radius of ${r} m and a height of ${h} m, with a roof shaped like half a sphere of the same radius. What is the total volume of the silo? ${EXACT}`,
    correct: total,
    fmt: inPi(`${unit}³`),
    wrong: [
      { value: body.add(hemi.mul(2)), why: 'The top is only half a sphere, so use half of the sphere formula.' },
      { value: body, why: `That is only the ${cone ? 'cone' : 'cylinder'}. Add the half sphere on top.` },
      cone ? { value: frac(r * r * h).add(hemi), why: 'The bottom part is a cone, which is one third of a cylinder.' } : { value: frac(r * r * h, 3).add(hemi), why: 'The bottom part is a cylinder, so there is no one third.' },
      total.add(r),
    ],
    solution: [
      cone ? R`Cone: \(\frac{1}{3}\pi r^{2} h = \frac{1}{3} \times \pi \times ${r * r} \times ${h} = ${piTex(body)}\).` : R`Cylinder: \(\pi r^{2} h = \pi \times ${r * r} \times ${h} = ${piTex(body)}\).`,
      R`Half sphere: \(\frac{1}{2} \times \frac{4}{3}\pi r^{3} = \frac{2}{3} \times \pi \times ${r ** 3} = ${piTex(hemi)}\).`,
      R`Add: \(${piTex(body)} + ${piTex(hemi)} = ${piTex(total)}\). The total volume is \(${piTex(total)}\) ${unit}³.`,
    ],
    rule: 5,
    skill: 'solids joined together',
    check: () => near(total.value * Math.PI, integrate((z) => Math.PI * (cone ? (r * z) / h : r) ** 2, 0, h, 400) + integrate((x) => Math.PI * (r * r - x * x), 0, r, 400)),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'area-volume',
  title: 'Area, Surface Area & Volume',
  summary: 'Find areas of polygons and circles, surface areas of boxes, and volumes of prisms, cylinders, cones and spheres.',
  grade: 'Grades 6–8',
  standards: ['CCSS 6.G.A.1', 'CCSS 6.G.A.2', 'CCSS 6.G.A.4', 'CCSS 7.G.B.4', 'CCSS 7.G.B.6', 'CCSS 8.G.C.9'],

  explain: {
    intro: R`**Area** measures the flat space inside a shape, in square units. **Surface area** is the total area of all the faces of a solid. **Volume** measures the space a solid fills, in cubic units. Most formulas come from two ideas: cut a shape into pieces you already know, and "volume = area of the base × height".`,
    rules: [
      {
        title: 'Parallelograms and triangles',
        text: R`A parallelogram can be cut and rearranged into a rectangle, so its area is base × height. A triangle is half of a parallelogram, so its area is \(\frac{1}{2}\) × base × height. The **height** is always measured at a right angle to the base. It is not a slanted side.`,
        example: R`A parallelogram with base 9 cm and height 4 cm has area \(9 \times 4 = 36\) cm². A triangle with the same base and height has area \(\frac{1}{2} \times 9 \times 4 = 18\) cm².`,
      },
      {
        title: 'Trapezoids and composite figures',
        text: R`For a trapezoid, add the two parallel sides, multiply by the height and take half: \(A = \frac{1}{2}(b_1 + b_2)h\). For any other figure, split it into rectangles and triangles and add their areas, or find a larger shape and subtract the missing piece.`,
        example: R`A trapezoid with parallel sides 10 m and 6 m and height 5 m: \(\frac{1}{2} \times 16 \times 5 = 40\) m².`,
      },
      {
        title: 'Circles',
        text: R`The radius \(r\) is half the diameter \(d\). Circumference \(= \pi d = 2\pi r\). Area \(= \pi r^{2}\). A question will say either to leave the answer **in terms of \(\pi\)** (an exact answer such as \(25\pi\)) or to use \(3.14\) for \(\pi\) and round.`,
        example: R`A circle with diameter 10 cm has radius 5 cm. Circumference: \(10\pi \approx 31.4\) cm. Area: \(25\pi \approx 78.5\) cm².`,
      },
      {
        title: 'Surface area: add the faces',
        text: R`Unfold the solid into a **net** and add the areas of all the faces. A rectangular box has three pairs of matching faces: \(SA = 2lw + 2lh + 2wh\).`,
        example: R`A box 5 by 3 by 2: \(2(15) + 2(10) + 2(6) = 62\) square units.`,
      },
      {
        title: 'Volume of prisms: base area × height',
        text: R`A prism has the same cross-section all the way along. Its volume is the area of that end face times the length (or height). For a box this is \(V = lwh\), and it works for fractional edges too. For a triangular prism, the end is a triangle.`,
        example: R`A box \(2\frac{1}{2}\) by 4 by \(1\frac{1}{2}\): \(\frac{5}{2} \times 4 \times \frac{3}{2} = 15\) cubic units.`,
      },
      {
        title: 'Cylinders, cones and spheres',
        text: R`A cylinder is a prism with a circular base: \(V = \pi r^{2} h\). A cone holds exactly one third of the cylinder with the same base and height: \(V = \frac{1}{3}\pi r^{2} h\). A sphere: \(V = \frac{4}{3}\pi r^{3}\).`,
        example: R`With \(r = 3\) and \(h = 10\): cylinder \(90\pi\), cone \(30\pi\). A sphere of radius 3: \(\frac{4}{3}\pi \times 27 = 36\pi\).`,
      },
    ],
    vocab: [
      { term: 'height', def: 'The distance from the base to the opposite side or corner, measured at a right angle to the base.' },
      { term: 'radius and diameter', def: 'The radius goes from the center of a circle to its edge. The diameter goes all the way across through the center and is twice the radius.' },
      { term: 'circumference', def: 'The distance around a circle.' },
      { term: 'net', def: 'A flat pattern that folds up to make a solid.' },
      { term: 'prism', def: 'A solid with two matching, parallel end faces and the same cross-section all the way along.' },
    ],
    mistakes: [
      'Using a slanted side as the height. The height meets the base at a right angle.',
      R`Forgetting the \(\frac{1}{2}\) for triangles and trapezoids, or the \(\frac{1}{3}\) for cones.`,
      R`Using the diameter where the formula needs the radius, or mixing up \(2\pi r\) (a length) with \(\pi r^{2}\) (an area).`,
      'Giving area in plain units or volume in square units. Area is in square units and volume is in cubic units.',
    ],
    visual: flatShape(false, 9, 3, 4, 5, 'cm').visual,
  },

  examples: [
    {
      title: 'Word problem: a composite figure',
      word: true,
      problem: 'An L-shaped patio has right-angled corners. Its bottom edge is 10 m, its right edge is 4 m, its top edge is 6 m and its left edge is 9 m. What is the area of the patio?',
      steps: [
        R`Split the L into two rectangles: a bottom one 10 m by 4 m, and a top one 6 m wide.`,
        R`The top rectangle's height is the left edge minus the right edge: \(9 - 4 = 5\) m.`,
        R`Areas: \(10 \times 4 = 40\) and \(6 \times 5 = 30\).`,
        R`Add: \(40 + 30 = 70\). Check by subtracting the missing corner from the big rectangle: \(10 \times 9 - 4 \times 5 = 70\). ✓`,
      ],
      answer: '70 m²',
      visual: { type: 'polygon', points: [[0, 0], [10, 0], [10, 4], [6, 4], [6, 9], [0, 9]], sides: ['10 m', '4 m', '', '', '6 m', '9 m'], extra: [{ from: [0, 4], to: [6, 4] }], alt: 'An L-shaped figure with bottom 10 m, right side 4 m, top 6 m and left side 9 m, split by a dashed line into two rectangles.' },
    },
    {
      title: 'Word problem: a circle, exact and rounded',
      word: true,
      problem: R`A circular rug has a diameter of 6 feet. Find its circumference and its area, first in terms of \(\pi\) and then using \(3.14\) for \(\pi\), rounded to the nearest tenth.`,
      steps: [
        R`The radius is half the diameter: \(6 \div 2 = 3\) feet.`,
        R`Circumference \(= \pi d = 6\pi\) feet. With \(3.14\): \(6 \times 3.14 = 18.84\), about \(18.8\) feet.`,
        R`Area \(= \pi r^{2} = \pi \times 3^{2} = 9\pi\) square feet. With \(3.14\): \(9 \times 3.14 = 28.26\), about \(28.3\) square feet.`,
      ],
      answer: R`Circumference \(6\pi \approx 18.8\) ft; area \(9\pi \approx 28.3\) ft²`,
      visual: { type: 'circle', diameter: '6 ft', radius: '3 ft', alt: 'A circle with a diameter of 6 feet and a radius of 3 feet.' },
    },
    {
      title: 'Surface area and volume of a box',
      problem: 'A gift box is 5 cm long, 3 cm wide and 2 cm high. Find its surface area and its volume.',
      steps: [
        R`The net has three pairs of rectangles. Top and bottom: \(2 \times 5 \times 3 = 30\). Front and back: \(2 \times 5 \times 2 = 20\). Two ends: \(2 \times 3 \times 2 = 12\).`,
        R`Surface area: \(30 + 20 + 12 = 62\) cm².`,
        R`Volume \(=\) base area \(\times\) height: \(5 \times 3 = 15\), and \(15 \times 2 = 30\) cm³.`,
      ],
      answer: 'Surface area 62 cm²; volume 30 cm³',
      visual: [{ type: 'solid', kind: 'box', labels: { l: '5 cm', w: '3 cm', h: '2 cm' }, alt: 'A box 5 cm long, 3 cm wide and 2 cm high.' }, { type: 'table', headers: ['Pair of faces', 'Size of each', 'Area of the pair'], rows: [['Top and bottom', '5 × 3', '30'], ['Front and back', '5 × 2', '20'], ['Two ends', '3 × 2', '12']], alt: 'A table of the three pairs of faces and their areas: 30, 20 and 12.' }],
    },
    {
      title: 'Cylinder, cone and sphere',
      problem: R`A cylinder and a cone both have radius 3 cm and height 10 cm. A sphere has radius 3 cm. Find each volume in terms of \(\pi\).`,
      steps: [
        R`Cylinder: \(\pi r^{2} h = \pi \times 9 \times 10 = 90\pi\) cm³.`,
        R`Cone: one third of the cylinder, \(\frac{1}{3} \times 90\pi = 30\pi\) cm³.`,
        R`Sphere: \(\frac{4}{3}\pi r^{3} = \frac{4}{3} \times \pi \times 27 = 36\pi\) cm³.`,
      ],
      answer: R`Cylinder \(90\pi\) cm³, cone \(30\pi\) cm³, sphere \(36\pi\) cm³`,
      visual: { type: 'solid', kind: 'cone', labels: { r: '3 cm', h: '10 cm' }, alt: 'A cone with radius 3 cm and height 10 cm.' },
    },
  ],

  models: [
    {
      id: 'area-shapes',
      title: 'Area of a triangle, parallelogram, trapezoid or circle',
      intro: 'Choose a shape and its measurements, in centimeters.',
      inputs: [
        { name: 'shape', label: 'Shape', type: 'select', value: 'triangle', options: [{ value: 'triangle', label: 'triangle' }, { value: 'parallelogram', label: 'parallelogram' }, { value: 'trapezoid', label: 'trapezoid' }, { value: 'circle', label: 'circle' }] },
        { name: 'b', label: 'Base (or radius, for a circle)', type: 'number', min: 2, max: 30, step: 0.5, value: 9 },
        { name: 'h', label: 'Height (not used for a circle)', type: 'number', min: 2, max: 20, step: 0.5, value: 4 },
        { name: 'b2', label: 'Second parallel side (trapezoid only)', type: 'number', min: 1, max: 30, step: 0.5, value: 5 },
      ],
      compute({ shape, b, h, b2 }) {
        const dash = (x) => [{ from: [x, h], to: [x, 0], label: `${txt(h)} cm` }];
        if (shape === 'circle') {
          const sq = round(b * b, 2);
          return {
            problem: R`Find the area of a circle with radius ${txt(b)} cm.`,
            steps: [R`Area of a circle \(= \pi r^{2}\).`, R`\(r^{2} = ${num(b)} \times ${num(b)} = ${num(sq)}\), so the exact area is \(${piTex(sq)}\) cm².`, R`With \(3.14\) for \(\pi\): \(${num(sq)} \times 3.14 = ${num(round(sq * 3.14, 4))}\), about \(${num(round(sq * 3.14, 1))}\) cm².`],
            answer: R`\(${piTex(sq)} \approx ${num(round(sq * 3.14, 1))}\) cm²`,
            visual: { type: 'circle', radius: `${txt(b)} cm`, alt: `A circle with radius ${txt(b)} cm.` },
          };
        }
        if (shape === 'trapezoid') {
          const area = round(((b + b2) * h) / 2, 4);
          const left = Math.max(0, (b - b2) / 2);
          const lo = Math.max(0, (b2 - b) / 2);
          return {
            problem: `Find the area of a trapezoid with parallel sides ${txt(b)} cm and ${txt(b2)} cm, and height ${txt(h)} cm.`,
            steps: [R`Area of a trapezoid \(= \frac{1}{2}(b_1 + b_2)h\).`, R`Add the parallel sides: \(${num(b)} + ${num(b2)} = ${num(b + b2)}\).`, R`\(\frac{1}{2} \times ${num(b + b2)} \times ${num(h)} = ${num(area)}\).`],
            answer: R`\(${num(area)}\) cm²`,
            visual: { type: 'polygon', points: [[lo, 0], [lo + b, 0], [left + b2, h], [left, h]], sides: [`${txt(b)} cm`, '', `${txt(b2)} cm`, ''], extra: dash(Math.max(left, lo)), alt: `A trapezoid with parallel sides ${txt(b)} cm and ${txt(b2)} cm and height ${txt(h)} cm.` },
          };
        }
        const tri = shape === 'triangle';
        const area = round(tri ? (b * h) / 2 : b * h, 4);
        const s = round(b / 3, 2);
        return {
          problem: `Find the area of a ${shape} with base ${txt(b)} cm and height ${txt(h)} cm.`,
          steps: tri
            ? [R`Area of a triangle \(= \frac{1}{2} \times \text{base} \times \text{height}\).`, R`\(\frac{1}{2} \times ${num(b)} \times ${num(h)} = ${num(area)}\).`, 'The height is the dashed line at a right angle to the base, not a slanted side.']
            : [R`Area of a parallelogram \(= \text{base} \times \text{height}\).`, R`\(${num(b)} \times ${num(h)} = ${num(area)}\).`, 'The height is the dashed line at a right angle to the base, not a slanted side.'],
          answer: R`\(${num(area)}\) cm²`,
          visual: { type: 'polygon', points: tri ? [[0, 0], [b, 0], [s, h]] : [[0, 0], [b, 0], [b + s, h], [s, h]], sides: [`${txt(b)} cm`], extra: dash(s), alt: `A ${shape} with base ${txt(b)} cm and a dashed height of ${txt(h)} cm.` },
        };
      },
    },
    {
      id: 'round-solids',
      title: 'Word problem: how much does it hold?',
      word: true,
      intro: 'Choose a container and its size, in centimeters.',
      inputs: [
        { name: 'kind', label: 'Container', type: 'select', value: 'cylinder', options: [{ value: 'cylinder', label: 'a can (cylinder)' }, { value: 'cone', label: 'a paper cup (cone)' }, { value: 'sphere', label: 'a ball (sphere)' }] },
        { name: 'r', label: 'Radius (cm)', type: 'int', min: 2, max: 20, value: 3 },
        { name: 'h', label: 'Height (cm, not used for a ball)', type: 'int', min: 2, max: 40, value: 10 },
      ],
      compute({ kind, r, h }) {
        const coef = kind === 'cylinder' ? frac(r * r * h) : kind === 'cone' ? frac(r * r * h, 3) : frac(4 * r ** 3, 3);
        const approxV = round(coef.value * 3.14, 1);
        const steps = {
          cylinder: [R`A cylinder's volume is the area of its circular base times its height: \(V = \pi r^{2} h\).`, R`\(r^{2} = ${r * r}\), so \(V = \pi \times ${r * r} \times ${h} = ${piTex(coef)}\) cm³.`],
          cone: [R`A cone holds one third of a cylinder with the same base and height: \(V = \frac{1}{3}\pi r^{2} h\).`, R`\(r^{2} h = ${r * r} \times ${h} = ${r * r * h}\), so \(V = ${coef.isInt() ? R`\frac{${r * r * h}}{3}\pi = ` : ''}${piTex(coef)}\) cm³.`],
          sphere: [R`Volume of a sphere: \(V = \frac{4}{3}\pi r^{3}\). The height is not needed.`, R`\(r^{3} = ${r ** 3}\), so \(V = \frac{4}{3} \times ${r ** 3} \times \pi = ${piTex(coef)}\) cm³.`],
        }[kind];
        steps.push(R`With \(3.14\) for \(\pi\), that is about \(${num(approxV, { commas: true })}\) cm³ (to the nearest tenth).`);
        const text = { cylinder: `A can is a cylinder with a radius of ${r} cm and a height of ${h} cm.`, cone: `A paper cup is a cone with a radius of ${r} cm and a height of ${h} cm.`, sphere: `A ball is a sphere with a radius of ${r} cm.` }[kind];
        return {
          problem: `${text} What is its volume?`,
          steps,
          answer: R`\(${piTex(coef)} \approx ${num(approxV, { commas: true })}\) cm³`,
          visual: { type: 'solid', kind, labels: kind === 'sphere' ? { r: `${r} cm` } : { r: `${r} cm`, h: `${h} cm` }, alt: `A ${kind} with radius ${r} cm${kind === 'sphere' ? '' : ` and height ${h} cm`}.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyParallelogramTriangle, easyBoxVolume, easyAreaStory],
    medium: [mediumTrapezoidComposite, mediumSurfaceArea, mediumFractionVolume, mediumCircle],
    hard: [hardCylinder, hardCircleStory, hardTriPrism],
    challenge: [challengeConeSphere, challengeFindDimension, challengeCompositeSolid],
  },
};
