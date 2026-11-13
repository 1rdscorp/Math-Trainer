import { R, q, num, txt, round, fracTex, checkEqual } from '../../lib/index.js';
import { apart, dec, toRad, toDeg } from './_shared.js';

const sinD = (d) => Math.sin(toRad(d));
const cosD = (d) => Math.cos(toRad(d));
const asinD = (v) => toDeg(Math.asin(v));
const acosD = (v) => toDeg(Math.acos(v));
const deg1 = (v) => R`\(${num(v, { fixed: 1 })}^{\circ}\)`;
const n1 = (v) => num(v, { fixed: 1 });
const bearing = (d) => `${String(d).padStart(3, '0')}°`;
// The third side from two sides and the included angle (degrees).
const third = (a, b, C) => Math.sqrt(a * a + b * b - 2 * a * b * cosD(C));
// The angle (degrees) opposite side c in a triangle with sides a, b, c.
const angleOpp = (a, b, c) => acosD((a * a + b * b - c * c) / (2 * a * b));

/**
 * A triangle drawn to scale from its three sides (side a is opposite vertex A, and so on).
 * labels: text for any of a, b, c (sides) and A, B, C (angles); names: the three vertex names.
 */
function tri(a, b, c, labels, names = ['A', 'B', 'C']) {
  const A = toRad(angleOpp(b, c, a));
  const parts = Object.entries(labels).map(([k, v]) => `${k === k.toUpperCase() ? `the angle at ${names['ABC'.indexOf(k)]}` : `the side opposite ${names['abc'.indexOf(k)]}`} labelled ${v}`);
  return {
    type: 'polygon',
    points: [[0, 0], [c, 0], [b * Math.cos(A), b * Math.sin(A)]],
    vertices: names,
    sides: [labels.c ?? '', labels.a ?? '', labels.b ?? ''],
    angles: [labels.A ?? '', labels.B ?? '', labels.C ?? ''],
    alt: `Triangle ${names.join('')} drawn to scale, with ${parts.join(', ')}.`,
  };
}

// ───────────── Easy ─────────────

function easyChooseLaw(rng) {
  const kind = rng.pick(['SAS', 'SSS', 'AAS', 'SSA', 'angles']);
  const a = rng.int(7, 16);
  const b = rng.intExcept(5, 15, [a]);
  const C = rng.int(35, 115);
  const c0 = third(a, b, C);
  const [A0, B0] = [angleOpp(b, c0, a), angleOpp(a, c0, b)];
  const names = ['The Law of Sines', 'The Law of Cosines', 'The angle sum of a triangle', 'The Pythagorean theorem'];
  const spec = {
    SAS: { given: R`\(a = ${a}\), \(b = ${b}\) and \(C = ${C}^{\circ}\)`, find: R`the side \(c\)`, labels: { a: `${a}`, b: `${b}`, C: `${C}°`, c: 'x' }, ans: 1, sides: [a, b, c0], why: R`Two sides and the angle between them are known (SAS). No side is paired with a known opposite angle, so the Law of Sines cannot start. \(c^{2} = a^{2} + b^{2} - 2ab\cos C\) gives \(c\) directly.` },
    SSS: { given: R`\(a = ${a}\), \(b = ${b}\) and \(c = ${round(c0, 0)}\)`, find: R`the angle \(C\)`, labels: { a: `${a}`, b: `${b}`, c: `${round(c0, 0)}`, C: 'x' }, ans: 1, sides: [a, b, round(c0, 0)], why: R`All three sides are known (SSS) and no angle is. The Law of Cosines, rearranged to \(\cos C = \dfrac{a^{2} + b^{2} - c^{2}}{2ab}\), gives the angle.` },
    AAS: { given: R`\(A = ${round(A0, 0)}^{\circ}\), \(B = ${round(B0, 0)}^{\circ}\) and \(a = ${a}\)`, find: R`the side \(b\)`, labels: { A: `${round(A0, 0)}°`, B: `${round(B0, 0)}°`, a: `${a}`, b: 'x' }, ans: 0, sides: [a, b, c0], why: R`Side \(a\) and its opposite angle \(A\) are both known, and \(b\) is opposite the known angle \(B\). The Law of Sines, \(\dfrac{a}{\sin A} = \dfrac{b}{\sin B}\), gives \(b\) directly.` },
    SSA: { given: R`\(A = ${round(Math.max(A0, B0), 0)}^{\circ}\), \(a = ${Math.max(a, b)}\) and \(b = ${Math.min(a, b)}\)`, find: R`the angle \(B\)`, labels: { A: `${round(Math.max(A0, B0), 0)}°`, a: `${Math.max(a, b)}`, b: `${Math.min(a, b)}`, B: 'x' }, ans: 0, sides: [Math.max(a, b), Math.min(a, b), c0], why: R`Side \(a\) and its opposite angle \(A\) are both known, and \(B\) is opposite the known side \(b\). The Law of Sines, \(\dfrac{\sin B}{b} = \dfrac{\sin A}{a}\), gives \(B\).` },
    angles: { given: R`\(A = ${round(A0, 0)}^{\circ}\), \(B = ${round(B0, 0)}^{\circ}\) and \(c = ${round(c0, 0)}\)`, find: R`the angle \(C\)`, labels: { A: `${round(A0, 0)}°`, B: `${round(B0, 0)}°`, c: `${round(c0, 0)}`, C: 'x' }, ans: 2, sides: [a, b, c0], why: R`Two angles are known, so the third comes from the angle sum: \(C = 180^{\circ} - A - B\). No trigonometry is needed.` },
  }[kind];
  const notes = [
    'The Law of Sines needs a side and its opposite angle that are both known, plus one more part.',
    'The Law of Cosines is for two sides with the angle between them, or for three sides.',
    'The angle sum only helps when two of the three angles are already known.',
    'The Pythagorean theorem works only in a right triangle.',
  ];
  return q({
    prompt: R`In triangle \(ABC\), ${spec.given}. Which tool finds ${spec.find} (marked \(x\)) directly from these measurements?`,
    visual: tri(...spec.sides, spec.labels),
    correct: names[spec.ans],
    wrong: [0, 1, 2, 3].filter((i) => i !== spec.ans).map((i) => ({ value: names[i], why: notes[i] })),
    solution: [spec.why],
    rule: 2,
    skill: 'choosing a law',
  });
}

function easySinesSide(rng) {
  const A = rng.int(30, 85);
  const B = rng.intExcept(30, 85, [A]);
  if (A + B > 145) return easySinesSide(rng);
  const a = rng.int(5, 20);
  const C = 180 - A - B;
  const b = (a * sinD(B)) / sinD(A);
  const c = (a * sinD(C)) / sinD(A);
  const ans = round(b, 1);
  return q({
    prompt: R`In triangle \(ABC\), \(A = ${A}^{\circ}\), \(B = ${B}^{\circ}\) and \(a = ${a}\) cm. Find \(b\), to the nearest tenth of a centimetre.`,
    visual: tri(a, b, c, { A: `${A}°`, B: `${B}°`, a: `${a}`, b: 'x' }),
    correct: ans,
    fmt: dec(1, 'cm'),
    wrong: apart(ans, [
      { value: (a * sinD(A)) / sinD(B), why: R`Each side goes with the sine of its own opposite angle: \(\dfrac{b}{\sin B} = \dfrac{a}{\sin A}\), so \(b = \dfrac{a\sin B}{\sin A}\).` },
      { value: (a * B) / A, why: 'Sides are proportional to the sines of the opposite angles, not to the angles themselves.' },
      { value: a * sinD(B), why: R`After multiplying by \(\sin B\), divide by \(\sin A\) as well.` },
      c,
    ], { places: 1, positive: true }),
    solution: [
      R`A side and its opposite angle are known (\(a\) and \(A\)), so use the Law of Sines: \(\dfrac{b}{\sin B} = \dfrac{a}{\sin A}\).`,
      R`\(b = \dfrac{a\sin B}{\sin A} = \dfrac{${a}\sin ${B}^{\circ}}{\sin ${A}^{\circ}}\).`,
      R`\(b \approx ${n1(ans)}\) cm.`,
    ],
    rule: 0,
    skill: 'Law of Sines: a side',
    // Independent check: with all three sides in hand, the Law of Cosines must hold as well.
    check: () => checkEqual(a * a, b * b + c * c - 2 * b * c * cosD(A), 1e-9),
  });
}

function easyArea(rng) {
  const a = rng.int(4, 20);
  const b = rng.int(4, 20);
  const C = rng.int(20, 160);
  if (C === 90) return easyArea(rng);
  const area = 0.5 * a * b * sinD(C);
  const ans = round(area, 1);
  const c = third(a, b, C);
  return q({
    prompt: R`Two sides of a triangle are ${a} cm and ${b} cm long, and the angle between them is \(${C}^{\circ}\). Find the area, to the nearest tenth of a square centimetre.`,
    visual: tri(a, b, c, { a: `${a}`, b: `${b}`, C: `${C}°` }),
    correct: ans,
    fmt: dec(1, 'cm²'),
    wrong: apart(ans, [
      { value: a * b * sinD(C), why: R`The formula is \(\frac{1}{2}ab\sin C\). The factor \(\frac{1}{2}\) is missing.` },
      { value: 0.5 * a * b, why: R`\(\frac{1}{2}ab\) is the area only when the angle between the sides is \(90^{\circ}\). Multiply by \(\sin C\).` },
      { value: Math.abs(0.5 * a * b * cosD(C)), why: 'The height of the triangle comes from the sine of the included angle, not the cosine.' },
      0.5 * (a + b) * sinD(C),
    ], { places: 1, positive: true }),
    solution: [
      R`With two sides and the included angle, the area is \(\frac{1}{2}ab\sin C\): the height onto side \(a\) is \(b\sin C\).`,
      R`Area \(= \frac{1}{2}(${a})(${b})\sin ${C}^{\circ} \approx ${n1(ans)}\) cm².`,
    ],
    rule: 4,
    skill: 'area of a triangle',
    // Independent check: Heron's formula with the third side from the Law of Cosines.
    check: () => {
      const s = (a + b + c) / 2;
      return checkEqual(area, Math.sqrt(s * (s - a) * (s - b) * (s - c)), 1e-9);
    },
  });
}

// ───────────── Medium ─────────────

function mediumCosinesSide(rng) {
  const a = rng.int(5, 20);
  const b = rng.int(5, 20);
  const C = rng.int(25, 150);
  if (C === 90) return mediumCosinesSide(rng);
  const c = third(a, b, C);
  const ans = round(c, 1);
  return q({
    prompt: R`In triangle \(ABC\), \(a = ${a}\) cm, \(b = ${b}\) cm and \(C = ${C}^{\circ}\). Find \(c\), to the nearest tenth of a centimetre.`,
    visual: tri(a, b, c, { a: `${a}`, b: `${b}`, C: `${C}°`, c: 'x' }),
    correct: ans,
    fmt: dec(1, 'cm'),
    wrong: apart(ans, [
      { value: Math.sqrt(a * a + b * b + 2 * a * b * cosD(C)), why: R`The Law of Cosines subtracts: \(c^{2} = a^{2} + b^{2} - 2ab\cos C\). ${C > 90 ? R`Here \(\cos C\) is negative, so subtracting it makes \(c^{2}\) larger.` : ''}` },
      { value: Math.sqrt(a * a + b * b), why: R`\(c^{2} = a^{2} + b^{2}\) holds only when \(C = 90^{\circ}\). The term \(-2ab\cos C\) adjusts for other angles.` },
      { value: a * a + b * b - 2 * a * b * cosD(C), why: R`That is \(c^{2}\). Take the square root.` },
      Math.sqrt(Math.abs(a * a + b * b - a * b * cosD(C))),
    ], { places: 1, positive: true }),
    solution: [
      R`Two sides and the included angle are known (SAS), so use the Law of Cosines: \(c^{2} = a^{2} + b^{2} - 2ab\cos C\).`,
      R`\(c^{2} = ${a}^{2} + ${b}^{2} - 2(${a})(${b})\cos ${C}^{\circ} \approx ${num(c * c, { places: 2 })}\).`,
      R`\(c \approx ${n1(ans)}\) cm.`,
    ],
    rule: 1,
    skill: 'Law of Cosines: a side',
    // Independent check: put C at the origin and measure the distance between the other two vertices.
    check: () => checkEqual(c, Math.hypot(b - a * cosD(C), a * sinD(C)), 1e-9),
  });
}

function mediumCosinesAngle(rng) {
  const a = rng.int(5, 15);
  const b = rng.int(5, 15);
  const c = rng.int(Math.abs(a - b) + 3, a + b - 3);
  if (c < 3 || new Set([a, b, c]).size < 3) return mediumCosinesAngle(rng);
  const C = angleOpp(a, b, c);
  const ans = round(C, 1);
  const cosC = (a * a + b * b - c * c) / (2 * a * b);
  return q({
    prompt: R`A triangle has sides \(a = ${a}\), \(b = ${b}\) and \(c = ${c}\). Find the angle \(C\) (opposite side \(c\)), to the nearest tenth of a degree.`,
    visual: tri(a, b, c, { a: `${a}`, b: `${b}`, c: `${c}`, C: 'x' }),
    correct: ans,
    fmt: deg1,
    wrong: apart(ans, [
      { value: angleOpp(b, c, a), why: R`That is angle \(A\). For angle \(C\), the side that is subtracted in the numerator is \(c\), the side opposite \(C\).` },
      { value: 180 - C, why: R`Check the sign of \(\cos C = ${num(cosC, { places: 3 })}\): a ${cosC > 0 ? 'positive cosine means an acute angle' : 'negative cosine means an obtuse angle'}.` },
      { value: angleOpp(a, c, b), why: R`That is angle \(B\). Use the side opposite \(C\), which is \(c\).` },
      Math.abs(cosC) <= 1 ? asinD(Math.abs(cosC)) : null,
    ], { places: 1, positive: true, gap: 0.03 }),
    solution: [
      R`Three sides are known (SSS), so solve the Law of Cosines for the angle: \(\cos C = \dfrac{a^{2} + b^{2} - c^{2}}{2ab}\).`,
      R`\(\cos C = \dfrac{${a}^{2} + ${b}^{2} - ${c}^{2}}{2(${a})(${b})} = ${fracTex(a * a + b * b - c * c, 2 * a * b)} \approx ${num(cosC, { places: 4 })}\).`,
      R`\(C = \cos^{-1}(${num(cosC, { places: 4 })}) \approx ${n1(ans)}^{\circ}\).`,
    ],
    rule: 1,
    skill: 'Law of Cosines: an angle',
    check: () => checkEqual(c, Math.hypot(b - a * cosD(C), a * sinD(C)), 1e-9),
  });
}

function mediumSinesAngle(rng) {
  const A = rng.int(40, 115);
  const a = rng.int(10, 20);
  const b = rng.int(4, a - 2);
  const B = asinD((b * sinD(A)) / a);
  const ans = round(B, 1);
  const c = (a * sinD(180 - A - B)) / sinD(A);
  return q({
    prompt: R`In triangle \(ABC\), \(A = ${A}^{\circ}\), \(a = ${a}\) and \(b = ${b}\). Find the angle \(B\), to the nearest tenth of a degree.`,
    visual: tri(a, b, c, { A: `${A}°`, a: `${a}`, b: `${b}`, B: 'x' }),
    correct: ans,
    fmt: deg1,
    wrong: apart(ans, [
      { value: 180 - B, why: R`\(B\) is opposite the shorter side (\(b < a\)), so \(B\) must be smaller than \(A\). An obtuse \(B\) cannot fit.` },
      { value: 180 - A - B, why: R`That is angle \(C\), the one left over after \(A\) and \(B\).` },
      { value: (A * b) / a, why: 'Angles are not proportional to the opposite sides. Their sines are.' },
      (a * sinD(A)) / b <= 1 ? asinD((a * sinD(A)) / b) : null,
    ], { places: 1, positive: true, gap: 0.03 }),
    solution: [
      R`Side \(a\) and angle \(A\) form a known opposite pair, so use the Law of Sines: \(\dfrac{\sin B}{b} = \dfrac{\sin A}{a}\).`,
      R`\(\sin B = \dfrac{${b}\sin ${A}^{\circ}}{${a}} \approx ${num((b * sinD(A)) / a, { places: 4 })}\).`,
      R`\(B = \sin^{-1}(${num((b * sinD(A)) / a, { places: 4 })}) \approx ${n1(ans)}^{\circ}\). Because \(b < a\), \(B\) is acute, so this is the only possibility.`,
    ],
    rule: 0,
    skill: 'Law of Sines: an angle',
    check: () => (Math.abs(sinD(B) / b - sinD(A) / a) < 1e-12 && A + B < 180 ? true : 'angle does not satisfy the Law of Sines'),
  });
}

function mediumSurvey(rng) {
  const base = rng.pick([50, 80, 100, 120, 150, 200, 250]);
  const al = rng.int(40, 80);
  const be = rng.intExcept(40, 80, [al]);
  if (al + be > 150) return mediumSurvey(rng);
  const ga = 180 - al - be;
  const AT = (base * sinD(be)) / sinD(ga);
  const BT = (base * sinD(al)) / sinD(ga);
  const ans = round(AT, 0);
  const [what, where] = rng.pick([['a tree', 'on the far bank of a river'], ['a buoy', 'out at sea'], ['a fire', 'in a forest'], ['a rock', 'on the far side of a canyon']]);
  return q({
    prompt: R`Two surveyors stand at points \(A\) and \(B\), ${base} m apart. They both sight ${what} \(T\) ${where}. The angle \(TAB\) is \(${al}^{\circ}\) and the angle \(TBA\) is \(${be}^{\circ}\). How far is \(T\) from \(A\), to the nearest metre?`,
    visual: tri(BT, AT, base, { A: `${al}°`, B: `${be}°`, c: `${base} m`, b: 'x' }, ['A', 'B', 'T']),
    correct: ans,
    fmt: dec(0, 'm'),
    wrong: apart(ans, [
      { value: BT, why: R`That is the distance from \(B\). The side \(AT\) is opposite the angle at \(B\), so it uses \(\sin ${be}^{\circ}\).` },
      { value: (base * sinD(be)) / sinD(al), why: R`The ${base} m side is opposite the angle at \(T\), which is \(180^{\circ} - ${al}^{\circ} - ${be}^{\circ} = ${ga}^{\circ}\).` },
      { value: base * sinD(be), why: R`Divide by the sine of the angle opposite the known side, \(\sin ${ga}^{\circ}\).` },
      base / sinD(ga),
    ], { places: 0, positive: true, gap: 0.05 }),
    solution: [
      R`The angle at \(T\) is \(180^{\circ} - ${al}^{\circ} - ${be}^{\circ} = ${ga}^{\circ}\). It is opposite the known side \(AB = ${base}\) m.`,
      R`\(AT\) is opposite the angle at \(B\). Law of Sines: \(\dfrac{AT}{\sin ${be}^{\circ}} = \dfrac{${base}}{\sin ${ga}^{\circ}}\).`,
      R`\(AT = \dfrac{${base}\sin ${be}^{\circ}}{\sin ${ga}^{\circ}} \approx ${num(ans)}\) m.`,
    ],
    rule: 5,
    skill: 'surveying',
    // Independent check: place A and B on a line, walk AT from A at angle α, and measure the angle at B.
    check: () => checkEqual(toDeg(Math.atan2(AT * sinD(al), base - AT * cosD(al))), be, 1e-9),
  });
}

// ───────────── Hard ─────────────

// Number of triangles with angle A (degrees) opposite side a and adjacent side b.
function countSSA(A, a, b) {
  const s = (b * sinD(A)) / a;
  if (s > 1 + 1e-9) return 0;
  if (Math.abs(s - 1) <= 1e-9) return A < 90 ? 1 : 0; // side a just reaches the base: one right triangle
  const B1 = asinD(s);
  return [B1, 180 - B1].filter((B, i, all) => A + B < 180 - 1e-9 && all.findIndex((x) => Math.abs(x - B) < 1e-9) === i).length;
}

function ssaTwo(rng) {
  for (;;) {
    const A = rng.int(22, 62);
    const b = rng.int(9, 24);
    const h = b * sinD(A);
    const lo = Math.ceil(h + 0.6);
    if (lo > b - 2) continue;
    const a = rng.int(lo, b - 2);
    if (countSSA(A, a, b) === 2) return { A, a, b, h };
  }
}

function hardAmbiguousCount(rng) {
  const kind = rng.pick(['none', 'two', 'one', 'right', 'obtuse']);
  let A;
  let a;
  let b;
  if (kind === 'two') ({ A, a, b } = ssaTwo(rng));
  else if (kind === 'right') [A, b, a] = (() => { const k = rng.int(4, 12); return [30, 2 * k, k]; })();
  else if (kind === 'obtuse') {
    A = rng.int(100, 140);
    b = rng.int(6, 18);
    a = rng.bool() ? b + rng.int(1, 8) : b - rng.int(0, 4);
  } else {
    A = rng.int(25, 65);
    b = rng.int(9, 24);
    const h = b * sinD(A);
    a = kind === 'none' ? rng.int(2, Math.max(2, Math.floor(h - 0.6))) : b + rng.int(0, 8);
    if (kind === 'none' && a > h - 0.5) return hardAmbiguousCount(rng);
  }
  const n = countSSA(A, a, b);
  const h = b * sinD(A);
  const names = ['No triangle', 'Exactly one triangle', 'Exactly two triangles', 'Infinitely many triangles'];
  const reason = A >= 90
    ? (a > b ? R`\(A\) is obtuse, so it must be the largest angle and \(a\) the longest side. Here \(a > b\), so exactly one triangle exists.` : R`\(A\) is obtuse, so \(a\) would have to be the longest side. Here \(a \le b\), so no triangle exists.`)
    : n === 0 ? R`\(a = ${a}\) is shorter than the height \(${n1(h)}\), so side \(a\) cannot reach the base: no triangle.`
      : kind === 'right' ? R`\(a\) equals the height exactly, so side \(a\) meets the base at a right angle: exactly one (right) triangle.`
        : n === 2 ? R`\(a = ${a}\) is longer than the height \(${n1(h)}\) but shorter than \(b = ${b}\), so side \(a\) can swing to meet the base in two places: two triangles.`
          : R`\(a = ${a}\) is at least as long as \(b = ${b}\), so side \(a\) can meet the base on only one side of \(C\): exactly one triangle.`;
  return q({
    prompt: R`In triangle \(ABC\), \(A = ${A}^{\circ}\), \(a = ${a}\) and \(b = ${b}\). How many different triangles fit these measurements?`,
    correct: names[n],
    wrong: [
      { value: names[1], why: n === 2 ? R`The calculator gives one angle \(B\), but \(180^{\circ} - B\) has the same sine and also leaves room for a third angle.` : R`Compare \(a\) with the height \(b\sin A\) before assuming a triangle exists.` },
      { value: names[2], why: A >= 90 ? 'An obtuse angle leaves no room for a second obtuse possibility, so there is never a second triangle.' : R`Two triangles need \(b\sin A < a < b\). Check both inequalities.` },
      { value: names[0], why: R`A triangle exists whenever \(\sin B = \dfrac{b\sin A}{a}\) is at most 1 and the angles can add to \(180^{\circ}\).` },
      names[3],
    ],
    solution: [
      A >= 90 ? R`Two sides and an angle that is not between them are given (SSA), and the given angle is obtuse.` : R`Two sides and an angle that is not between them are given (SSA). Compare \(a\) with the height from \(C\): \(h = b\sin A = ${b}\sin ${A}^{\circ} ${kind === 'right' ? '=' : R`\approx`} ${kind === 'right' ? a : n1(h)}\).`,
      reason,
    ],
    rule: 3,
    skill: 'the ambiguous case',
    check: () => {
      // Independent count: solve the Law of Cosines a² = b² + c² − 2bc·cos A as a quadratic in c and count positive roots.
      const disc = (2 * b * cosD(A)) ** 2 - 4 * (b * b - a * a);
      const roots = disc < -1e-9 ? [] : Math.abs(disc) < 1e-9 ? [b * cosD(A)] : [b * cosD(A) + Math.sqrt(disc) / 2, b * cosD(A) - Math.sqrt(disc) / 2];
      return roots.filter((c) => c > 1e-9).length === n ? true : `quadratic in c gives ${roots.filter((c) => c > 1e-9).length} triangles`;
    },
  });
}

function hardAmbiguousSolve(rng) {
  const { A, a, b } = ssaTwo(rng);
  const s = (b * sinD(A)) / a;
  const B1 = asinD(s);
  const B2 = 180 - B1;
  if (B1 > 80 || Math.abs(B1 - (180 - A - B1)) < 3 || Math.abs(2 * B1 - 90) < 3) return hardAmbiguousSolve(rng);
  const pair = (u, v) => R`\(B \approx ${n1(u)}^{\circ}\) or \(B \approx ${n1(v)}^{\circ}\)`;
  return q({
    prompt: R`In triangle \(ABC\), \(A = ${A}^{\circ}\), \(a = ${a}\) and \(b = ${b}\). Two triangles fit these measurements. Find the two possible values of \(B\), to the nearest tenth of a degree.`,
    correct: pair(B1, B2),
    wrong: [
      { value: pair(B1, 180 - A - B1), why: R`\(${n1(180 - A - B1)}^{\circ}\) is the angle \(C\) of the first triangle. The second possible \(B\) is \(180^{\circ} - ${n1(B1)}^{\circ}\).` },
      { value: pair(B1, 90 - B1), why: R`Angles with the same sine add up to \(180^{\circ}\), not \(90^{\circ}\).` },
      { value: pair(B1, 180 + A - B1 > 179 ? 2 * B1 : 180 + A - B1), why: R`The second angle is the supplement of the first: \(180^{\circ} - ${n1(B1)}^{\circ}\).` },
      pair(A, 180 - A),
    ],
    solution: [
      R`Law of Sines: \(\sin B = \dfrac{b\sin A}{a} = \dfrac{${b}\sin ${A}^{\circ}}{${a}} \approx ${num(s, { places: 4 })}\).`,
      R`The calculator gives the acute angle \(B \approx ${n1(B1)}^{\circ}\). The obtuse angle with the same sine is \(180^{\circ} - ${n1(B1)}^{\circ} = ${n1(B2)}^{\circ}\).`,
      R`Both work, because \(${A}^{\circ} + ${n1(B2)}^{\circ} < 180^{\circ}\) leaves room for the third angle.`,
    ],
    rule: 3,
    skill: 'the ambiguous case',
    check: () => ([B1, B2].every((B) => Math.abs(sinD(B) / b - sinD(A) / a) < 1e-12 && A + B < 180) ? true : 'an angle does not fit'),
  });
}

function legs(d1, t1, d2, t2) {
  const P = [d1 * sinD(t1), d1 * cosD(t1)];
  const Q = [P[0] + d2 * sinD(t2), P[1] + d2 * cosD(t2)];
  return { P, Q, dist: Math.hypot(Q[0], Q[1]) };
}
const shipVisual = (d1, t1, d2, t2, unit) => {
  const { P, Q } = legs(d1, t1, d2, t2);
  const L = Math.max(d1, d2) * 0.45;
  return {
    type: 'polygon',
    points: [[0, 0], P, Q],
    vertices: ['start', 'turn', 'end'],
    sides: [`${d1} ${unit}`, `${d2} ${unit}`, 'x'],
    extra: [{ from: [0, 0], to: [0, L], label: 'N' }, { from: P, to: [P[0], P[1] + L], label: 'N' }],
    alt: `Route drawn to scale: a first leg of ${d1} ${unit} on a bearing of ${bearing(t1)}, then a second leg of ${d2} ${unit} on a bearing of ${bearing(t2)}. The straight line from the start to the end is marked x. Dashed lines show north at the start and at the turn.`,
  };
};

function hardBearings(rng) {
  const d1 = rng.int(2, 9) * 10;
  const d2 = rng.intExcept(2, 9, [d1 / 10]) * 10;
  const t1 = rng.int(2, 14) * 5;
  const turn = rng.intExcept(8, 28, [18]) * 5;
  const t2 = t1 + turn;
  const inside = 180 - turn;
  const { dist } = legs(d1, t1, d2, t2);
  const ans = round(dist, 1);
  const [who, unit] = rng.pick([['A ship', 'km'], ['A ferry', 'km'], ['A small plane', 'km'], ['A yacht', 'km']]);
  return q({
    prompt: `${who} travels ${d1} ${unit} on a bearing of ${bearing(t1)}, then turns and travels ${d2} ${unit} on a bearing of ${bearing(t2)}. How far is it from its starting point, to the nearest tenth of a kilometre? (Bearings are measured clockwise from north.)`,
    visual: shipVisual(d1, t1, d2, t2, unit),
    correct: ans,
    fmt: dec(1, unit),
    wrong: apart(ans, [
      { value: third(d1, d2, turn), why: R`\(${turn}^{\circ}\) is the change of course. The angle inside the triangle at the turn is \(180^{\circ} - ${turn}^{\circ} = ${inside}^{\circ}\).` },
      { value: d1 + d2, why: 'That is the distance travelled. The question asks for the straight-line distance back to the start.' },
      { value: Math.hypot(d1, d2), why: R`The Pythagorean theorem needs a right angle at the turn. Here that angle is \(${inside}^{\circ}\).` },
      third(d1, d2, t2 > 180 ? 360 - t2 : t2),
    ], { places: 1, positive: true }),
    solution: [
      R`The course changes by \(${t2}^{\circ} - ${t1}^{\circ} = ${turn}^{\circ}\), so the angle inside the triangle at the turning point is \(180^{\circ} - ${turn}^{\circ} = ${inside}^{\circ}\).`,
      R`Two sides and the included angle are known. Law of Cosines: \(x^{2} = ${d1}^{2} + ${d2}^{2} - 2(${d1})(${d2})\cos ${inside}^{\circ} \approx ${num(dist * dist, { places: 1 })}\).`,
      R`\(x \approx ${n1(ans)}\) ${unit}.`,
    ],
    rule: 5,
    skill: 'navigation with bearings',
    // Independent check: the answer from the Law of Cosines must match the length found by adding the two legs as vectors.
    check: () => checkEqual(third(d1, d2, inside), dist, 1e-9),
  });
}

function hardAreaSSS(rng) {
  const a = rng.int(5, 16);
  const b = rng.int(5, 16);
  const c = rng.int(Math.abs(a - b) + 3, a + b - 3);
  if (c < 4 || new Set([a, b, c]).size < 2) return hardAreaSSS(rng);
  const C = angleOpp(a, b, c);
  const area = 0.5 * a * b * sinD(C);
  const ans = round(area, 1);
  const cosC = (a * a + b * b - c * c) / (2 * a * b);
  return q({
    prompt: R`A triangular plot of land has sides ${a} m, ${b} m and ${c} m. Find its area, to the nearest tenth of a square metre.`,
    visual: tri(a, b, c, { a: `${a} m`, b: `${b} m`, c: `${c} m` }),
    correct: ans,
    fmt: dec(1, 'm²'),
    wrong: apart(ans, [
      { value: 0.5 * a * b, why: R`\(\frac{1}{2}ab\) assumes a right angle between those two sides. Find the angle first, then use \(\frac{1}{2}ab\sin C\).` },
      { value: a * b * sinD(C), why: R`The formula is \(\frac{1}{2}ab\sin C\). The factor \(\frac{1}{2}\) is missing.` },
      { value: Math.abs(0.5 * a * b * cosC), why: R`The Law of Cosines gives \(\cos C\), but the area formula needs \(\sin C\).` },
      0.5 * c * Math.min(a, b),
    ], { places: 1, positive: true }),
    solution: [
      R`First find an angle with the Law of Cosines: \(\cos C = \dfrac{${a}^{2} + ${b}^{2} - ${c}^{2}}{2(${a})(${b})} \approx ${num(cosC, { places: 4 })}\), so \(C \approx ${n1(C)}^{\circ}\).`,
      R`Then use the area formula with the two sides that enclose \(C\): \(\frac{1}{2}(${a})(${b})\sin ${n1(C)}^{\circ}\).`,
      R`Area \(\approx ${n1(ans)}\) m².`,
    ],
    rule: 4,
    skill: 'area of a triangle',
    check: () => {
      const s = (a + b + c) / 2;
      return checkEqual(area, Math.sqrt(s * (s - a) * (s - b) * (s - c)), 1e-9);
    },
  });
}

// ───────────── Challenge ─────────────

function challengeTower(rng) {
  const al = rng.int(20, 40);
  const be = rng.int(al + 12, 72);
  const d = rng.pick([20, 30, 40, 50, 60, 80, 100]);
  const BT = (d * sinD(al)) / sinD(be - al);
  const h = BT * sinD(be);
  const ans = round(h, 1);
  const foot = d + BT * cosD(be);
  const thing = rng.pick(['a tower', 'a cliff', 'a tall tree', 'a mast']);
  return q({
    prompt: R`From a point \(A\) on level ground, the angle of elevation of the top \(T\) of ${thing} is \(${al}^{\circ}\). From a point \(B\), ${d} m closer to its base, the angle of elevation is \(${be}^{\circ}\). How tall is it, to the nearest tenth of a metre?`,
    visual: {
      type: 'polygon',
      points: [[0, 0], [d, 0], [foot, h]],
      vertices: ['A', 'B', 'T'],
      sides: [`${d} m`, '', ''],
      angles: [`${al}°`, '', ''],
      extra: [{ from: [d, 0], to: [foot, 0] }, { from: [foot, 0], to: [foot, h], label: 'h' }],
      alt: `Triangle ABT drawn to scale. A and B are on the ground, ${d} m apart, and T is the top of the object. The angle at A is ${al}°. A dashed line continues the ground from B to the point below T, and a dashed vertical line of height h joins that point to T.`,
    },
    correct: ans,
    fmt: dec(1, 'm'),
    wrong: apart(ans, [
      { value: BT, why: R`That is the sloping distance \(BT\). The height is \(BT\sin ${be}^{\circ}\).` },
      { value: d * Math.tan(toRad(al)), why: R`\(${d}\) m is the distance between the two viewpoints, not the distance from \(A\) to the base.` },
      { value: d * Math.tan(toRad(be - al)), why: R`\(${be - al}^{\circ}\) is the angle at \(T\) inside triangle \(ABT\). Use it with the Law of Sines to find \(BT\) first.` },
      d * Math.tan(toRad(be)),
    ], { places: 1, positive: true, gap: 0.06 }),
    solution: [
      R`In triangle \(ABT\) the angle at \(B\) is \(180^{\circ} - ${be}^{\circ} = ${180 - be}^{\circ}\), so the angle at \(T\) is \(${be}^{\circ} - ${al}^{\circ} = ${be - al}^{\circ}\).`,
      R`Law of Sines: \(\dfrac{BT}{\sin ${al}^{\circ}} = \dfrac{${d}}{\sin ${be - al}^{\circ}}\), so \(BT \approx ${num(BT, { places: 2 })}\) m.`,
      R`In the right triangle below \(T\), \(h = BT\sin ${be}^{\circ} \approx ${n1(ans)}\) m.`,
    ],
    rule: 5,
    skill: 'two-step surveying',
    // Independent check: with base distance x from B, h = x·tan β and h = (x + d)·tan α.
    check: () => checkEqual(h, d / (1 / Math.tan(toRad(al)) - 1 / Math.tan(toRad(be))), 1e-9),
  });
}

function challengeThirdSide(rng) {
  const { A, a, b } = ssaTwo(rng);
  const root = Math.sqrt(a * a - (b * sinD(A)) ** 2);
  const [big, small] = [b * cosD(A) + root, b * cosD(A) - root];
  if (small < 1.5 || big - small < 2.5) return challengeThirdSide(rng);
  const larger = rng.bool();
  const c = larger ? big : small;
  const ans = round(c, 1);
  const B1 = asinD((b * sinD(A)) / a);
  const B = larger ? B1 : 180 - B1;
  return q({
    prompt: R`In triangle \(ABC\), \(A = ${A}^{\circ}\), \(a = ${a}\) and \(b = ${b}\). Two triangles fit these measurements. Find the ${larger ? 'longer' : 'shorter'} possible length of side \(c\), to the nearest tenth.`,
    correct: ans,
    fmt: (v) => R`\(${n1(v)}\)`,
    wrong: apart(ans, [
      { value: larger ? small : big, why: `That is the ${larger ? 'shorter' : 'longer'} possible length. ${larger ? 'The longer side c goes with the acute angle B, which leaves the larger angle C.' : 'The shorter side c goes with the obtuse angle B, which leaves the smaller angle C.'}` },
      { value: b * cosD(A), why: R`\(b\cos A\) is the distance from \(A\) to the foot of the height. The two possible values of \(c\) lie equally far on either side of it.` },
      { value: Math.sqrt(Math.abs(a * a - b * b)), why: 'The triangle is not right-angled, so the Pythagorean theorem does not apply.' },
      (a * sinD(B)) / sinD(A),
    ], { places: 1, positive: true, gap: 0.06 }),
    solution: [
      R`Law of Sines: \(\sin B = \dfrac{${b}\sin ${A}^{\circ}}{${a}}\), so \(B \approx ${n1(B1)}^{\circ}\) or \(B \approx ${n1(180 - B1)}^{\circ}\).`,
      R`The ${larger ? 'longer' : 'shorter'} side \(c\) is opposite the ${larger ? 'larger' : 'smaller'} angle \(C\), which goes with \(B \approx ${n1(B)}^{\circ}\): \(C \approx 180^{\circ} - ${A}^{\circ} - ${n1(B)}^{\circ} = ${n1(180 - A - B)}^{\circ}\).`,
      R`\(c = \dfrac{a\sin C}{\sin A} = \dfrac{${a}\sin ${n1(180 - A - B)}^{\circ}}{\sin ${A}^{\circ}} \approx ${n1(ans)}\).`,
    ],
    rule: 3,
    skill: 'the ambiguous case',
    // Independent check: both possible sides must satisfy the Law of Cosines for angle A.
    check: () => checkEqual(a * a, b * b + c * c - 2 * b * c * cosD(A), 1e-9),
  });
}

function challengeParallelogram(rng) {
  const p = rng.int(6, 20);
  const s = rng.intExcept(5, 18, [p]);
  const th = rng.int(40, 80);
  const longer = rng.bool();
  const [dLong, dShort] = [third(p, s, 180 - th), third(p, s, th)];
  const ans = round(longer ? dLong : dShort, 1);
  const top = [s * cosD(th), s * sinD(th)];
  return q({
    prompt: R`A parallelogram has sides ${p} cm and ${s} cm, and one of its angles is \(${th}^{\circ}\). Find the length of its ${longer ? 'longer' : 'shorter'} diagonal, to the nearest tenth of a centimetre.`,
    visual: {
      type: 'polygon',
      points: [[0, 0], [p, 0], [p + top[0], top[1]], top],
      sides: [`${p}`, `${s}`, '', ''],
      angles: [`${th}°`, '', '', ''],
      extra: [longer ? { from: [0, 0], to: [p + top[0], top[1]], label: 'x' } : { from: [p, 0], to: top, label: 'x' }],
      alt: `A parallelogram drawn to scale with sides ${p} and ${s} and an angle of ${th}°. The ${longer ? 'longer' : 'shorter'} diagonal is drawn dashed and marked x.`,
    },
    correct: ans,
    fmt: dec(1, 'cm'),
    wrong: apart(ans, [
      { value: longer ? dShort : dLong, why: longer ? R`That is the shorter diagonal, opposite the \(${th}^{\circ}\) angle. The longer diagonal is opposite the angle \(180^{\circ} - ${th}^{\circ} = ${180 - th}^{\circ}\).` : R`That is the longer diagonal, opposite the \(${180 - th}^{\circ}\) angle. The shorter diagonal is opposite the \(${th}^{\circ}\) angle.` },
      { value: Math.hypot(p, s), why: 'That would be the diagonal of a rectangle. This parallelogram has no right angle.' },
      { value: (p + s) / 2 + Math.abs(p - s), why: 'A diagonal and two sides form a triangle. Use the Law of Cosines in that triangle.' },
      p + s,
    ], { places: 1, positive: true }),
    solution: [
      R`A diagonal splits the parallelogram into two triangles with sides ${p} and ${s}. Neighbouring angles of a parallelogram add to \(180^{\circ}\), so its angles are \(${th}^{\circ}\) and \(${180 - th}^{\circ}\).`,
      R`The ${longer ? 'longer' : 'shorter'} diagonal is opposite the ${longer ? 'larger' : 'smaller'} angle, \(${longer ? 180 - th : th}^{\circ}\).`,
      R`Law of Cosines: \(x^{2} = ${p}^{2} + ${s}^{2} - 2(${p})(${s})\cos ${longer ? 180 - th : th}^{\circ}\), so \(x \approx ${n1(ans)}\) cm.`,
    ],
    rule: 1,
    skill: 'Law of Cosines in context',
    check: () => checkEqual(longer ? dLong : dShort, longer ? Math.hypot(p + top[0], top[1]) : Math.hypot(p - top[0], top[1]), 1e-9),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'triangle-laws',
  title: 'Law of Sines & Law of Cosines',
  summary: 'Solve any triangle with the Law of Sines or Cosines, handle the ambiguous case, and find areas and distances.',
  standards: ['CCSS G-SRT.D.9', 'CCSS G-SRT.D.10', 'CCSS G-SRT.D.11'],

  explain: {
    intro: R`Right-triangle trigonometry needs a right angle. The Law of Sines and the Law of Cosines work in every triangle. In triangle \(ABC\), side \(a\) is opposite angle \(A\), side \(b\) is opposite \(B\) and side \(c\) is opposite \(C\). Three known parts (including at least one side) are enough to find the rest. Angles here are in degrees, and decimal answers are rounded as each question says.`,
    rules: [
      {
        title: 'The Law of Sines',
        text: R`\(\dfrac{a}{\sin A} = \dfrac{b}{\sin B} = \dfrac{c}{\sin C}\). Each side is paired with the sine of its opposite angle. Use it when a side and its opposite angle are both known, together with one more part (AAS, ASA or SSA).`,
        example: R`\(A = 40^{\circ}\), \(B = 60^{\circ}\), \(a = 12\): \(b = \dfrac{12\sin 60^{\circ}}{\sin 40^{\circ}} \approx 16.2\).`,
      },
      {
        title: 'The Law of Cosines',
        text: R`\(c^{2} = a^{2} + b^{2} - 2ab\cos C\). Use it to find the third side from two sides and the included angle (SAS), or rearranged, \(\cos C = \dfrac{a^{2} + b^{2} - c^{2}}{2ab}\), to find an angle from three sides (SSS). When \(C = 90^{\circ}\) it becomes the Pythagorean theorem.`,
        example: R`\(a = 8\), \(b = 11\), \(C = 37^{\circ}\): \(c^{2} = 64 + 121 - 176\cos 37^{\circ} \approx 44.4\), so \(c \approx 6.7\).`,
      },
      {
        title: 'Choosing a law',
        text: R`Look for a known side with its known opposite angle. If there is such a pair, start with the Law of Sines. If not (SAS or SSS), start with the Law of Cosines. If two angles are known, the third is \(180^{\circ}\) minus their sum.`,
        example: R`Given \(a\), \(b\) and \(C\): no opposite pair is complete, so use the Law of Cosines to find \(c\) first.`,
      },
      {
        title: 'The ambiguous case (SSA)',
        text: R`Two sides and an angle opposite one of them may fit no triangle, one, or two. For acute \(A\) with sides \(a\) (opposite) and \(b\) (adjacent), compare \(a\) with the height \(h = b\sin A\): if \(a < h\) there is no triangle; if \(a = h\), one right triangle; if \(h < a < b\), two triangles (with \(B\) and \(180^{\circ} - B\)); if \(a \ge b\), one. For obtuse \(A\) there is one triangle if \(a > b\) and none otherwise.`,
        example: R`\(A = 30^{\circ}\), \(a = 7\), \(b = 10\): \(h = 5 < 7 < 10\), so two triangles, with \(B \approx 45.6^{\circ}\) or \(134.4^{\circ}\).`,
      },
      {
        title: 'Area from two sides and the included angle',
        text: R`Area \(= \frac{1}{2}ab\sin C\), because the height onto side \(a\) is \(b\sin C\). Any two sides work, as long as the angle used is the one between them.`,
        example: R`Sides 8 and 11 enclosing \(37^{\circ}\): area \(= \frac{1}{2}(8)(11)\sin 37^{\circ} \approx 26.5\).`,
      },
      {
        title: 'Surveying and navigation',
        text: R`Draw the triangle and mark what is known. A bearing is a direction measured clockwise from north (\(090^{\circ}\) is east). When a route turns, the angle inside the triangle at the turning point is \(180^{\circ}\) minus the change of course.`,
        example: R`After 50 km on bearing \(030^{\circ}\) and then 70 km on bearing \(100^{\circ}\), the course has changed by \(70^{\circ}\), so the included angle is \(110^{\circ}\).`,
      },
    ],
    vocab: [
      { term: 'included angle', def: 'The angle formed between two given sides of a triangle.' },
      { term: 'oblique triangle', def: 'A triangle with no right angle.' },
      { term: 'ambiguous case', def: 'The SSA situation, in which the given measurements may fit two different triangles, one, or none.' },
      { term: 'bearing', def: 'A direction given as an angle measured clockwise from north, written with three digits, such as 045°.' },
      { term: 'angle of elevation', def: 'The angle between the horizontal and the line of sight up to an object.' },
    ],
    mistakes: [
      R`Pairing a side with the wrong angle in the Law of Sines. Side \(a\) always goes with \(\sin A\), the angle opposite it.`,
      R`Using the Law of Sines for SAS. With two sides and the angle between them, no opposite pair is complete.`,
      R`Accepting only the calculator's angle in an SSA problem. Check whether \(180^{\circ} - B\) also fits.`,
      R`Using the change of course as the angle inside the triangle. The included angle is \(180^{\circ}\) minus the turn.`,
    ],
    visual: tri(12, 16.16, 18.39, { A: '40°', B: '60°', a: '12', b: 'b', c: 'c' }),
  },

  examples: [
    {
      title: 'Law of Sines: two angles and a side',
      problem: R`In triangle \(ABC\), \(A = 40^{\circ}\), \(B = 60^{\circ}\) and \(a = 12\). Find \(b\) and \(c\).`,
      steps: [
        R`The third angle is \(C = 180^{\circ} - 40^{\circ} - 60^{\circ} = 80^{\circ}\).`,
        R`\(a\) and \(A\) are a known opposite pair: \(\dfrac{b}{\sin 60^{\circ}} = \dfrac{12}{\sin 40^{\circ}}\), so \(b = \dfrac{12\sin 60^{\circ}}{\sin 40^{\circ}} \approx 16.2\).`,
        R`In the same way \(c = \dfrac{12\sin 80^{\circ}}{\sin 40^{\circ}} \approx 18.4\).`,
      ],
      answer: R`\(b \approx 16.2\) and \(c \approx 18.4\)`,
      visual: tri(12, 16.17, 18.39, { A: '40°', B: '60°', C: '80°', a: '12', b: '16.2', c: '18.4' }),
    },
    {
      title: 'Law of Cosines: two sides and the included angle',
      problem: R`In triangle \(ABC\), \(a = 8\), \(b = 11\) and \(C = 37^{\circ}\). Find \(c\) and the area.`,
      steps: [
        R`No side is paired with a known opposite angle, so use the Law of Cosines: \(c^{2} = 8^{2} + 11^{2} - 2(8)(11)\cos 37^{\circ}\).`,
        R`\(c^{2} \approx 185 - 140.56 = 44.44\), so \(c \approx 6.7\).`,
        R`Area \(= \frac{1}{2}ab\sin C = \frac{1}{2}(8)(11)\sin 37^{\circ} \approx 26.5\).`,
      ],
      answer: R`\(c \approx 6.7\); area \(\approx 26.5\) square units`,
    },
    {
      title: 'The ambiguous case',
      problem: R`In triangle \(ABC\), \(A = 30^{\circ}\), \(a = 7\) and \(b = 10\). Find all possible values of \(B\).`,
      steps: [
        R`This is SSA. The height is \(h = b\sin A = 10\sin 30^{\circ} = 5\). Since \(5 < 7 < 10\), two triangles fit.`,
        R`Law of Sines: \(\sin B = \dfrac{10\sin 30^{\circ}}{7} \approx 0.7143\), so \(B \approx 45.6^{\circ}\).`,
        R`The supplement has the same sine: \(B \approx 180^{\circ} - 45.6^{\circ} = 134.4^{\circ}\). It fits too, because \(30^{\circ} + 134.4^{\circ} < 180^{\circ}\).`,
      ],
      answer: R`\(B \approx 45.6^{\circ}\) or \(B \approx 134.4^{\circ}\)`,
    },
    {
      title: 'Word problem: navigation with bearings',
      word: true,
      problem: R`A ship sails 50 km on a bearing of 030°, then 70 km on a bearing of 100°. How far is it from its starting point?`,
      steps: [
        R`The course changes by \(100^{\circ} - 30^{\circ} = 70^{\circ}\), so the angle inside the triangle at the turning point is \(180^{\circ} - 70^{\circ} = 110^{\circ}\).`,
        R`Two sides (50 and 70) and the included angle are known. Law of Cosines: \(x^{2} = 50^{2} + 70^{2} - 2(50)(70)\cos 110^{\circ}\).`,
        R`\(x^{2} \approx 7400 + 2394.1 = 9794.1\), so \(x \approx 99.0\).`,
      ],
      answer: 'About 99.0 km from the start',
      visual: shipVisual(50, 30, 70, 100, 'km'),
    },
  ],

  models: [
    {
      id: 'solve-sas',
      title: 'Solve a triangle from two sides and the included angle',
      intro: 'Choose sides a and b and the angle C between them. The model finds the third side, the other two angles and the area, and draws the triangle to scale.',
      inputs: [
        { name: 'a', label: 'Side a', type: 'int', min: 1, max: 50, value: 8 },
        { name: 'b', label: 'Side b', type: 'int', min: 1, max: 50, value: 11 },
        { name: 'C', label: 'Angle C (degrees)', type: 'int', min: 1, max: 179, value: 37 },
      ],
      compute({ a, b, C }) {
        const c = third(a, b, C);
        // Find the angle opposite the shorter given side first: it is certain to be acute.
        const [small, big, sName, bName] = a <= b ? [a, b, 'A', 'B'] : [b, a, 'B', 'A'];
        const S = asinD(Math.min(1, (small * sinD(C)) / c));
        const Bg = 180 - C - S;
        const [A, B] = a <= b ? [S, Bg] : [Bg, S];
        const area = 0.5 * a * b * sinD(C);
        return {
          problem: R`Solve triangle \(ABC\) with \(a = ${a}\), \(b = ${b}\) and \(C = ${C}^{\circ}\).`,
          steps: [
            R`Law of Cosines: \(c^{2} = ${a}^{2} + ${b}^{2} - 2(${a})(${b})\cos ${C}^{\circ} \approx ${num(c * c, { places: 2 })}\), so \(c \approx ${num(c, { places: 2 })}\).`,
            R`Now \(c\) and \(C\) are an opposite pair. Use the Law of Sines for the angle opposite the shorter side, which must be acute: \(\sin ${sName} = \dfrac{${small}\sin ${C}^{\circ}}{${num(c, { places: 2 })}}\), so \(${sName} \approx ${n1(S)}^{\circ}\).`,
            R`The last angle comes from the angle sum: \(${bName} \approx 180^{\circ} - ${C}^{\circ} - ${n1(S)}^{\circ} = ${n1(Bg)}^{\circ}\).`,
            R`Area \(= \frac{1}{2}ab\sin C = \frac{1}{2}(${a})(${b})\sin ${C}^{\circ} \approx ${num(area, { places: 1 })}\).`,
          ],
          answer: R`\(c \approx ${num(c, { places: 1 })}\), \(A \approx ${n1(A)}^{\circ}\), \(B \approx ${n1(B)}^{\circ}\); area \(\approx ${num(area, { places: 1 })}\)`,
          visual: tri(a, b, c, { a: `${a}`, b: `${b}`, c: txt(c, { places: 1 }), A: `${txt(A, { places: 1 })}°`, B: `${txt(B, { places: 1 })}°`, C: `${C}°` }),
          note: big === small ? 'The two given sides are equal, so the triangle is isosceles and angles A and B are equal.' : undefined,
        };
      },
    },
    {
      id: 'two-leg-journey',
      title: 'Word problem: a journey in two legs',
      word: true,
      intro: 'A ship sails one leg, turns, and sails a second leg. Choose the distances and bearings (clockwise from north) to find how far it ends up from its start.',
      inputs: [
        { name: 'd1', label: 'First leg (km)', type: 'int', min: 1, max: 200, value: 50 },
        { name: 't1', label: 'First bearing (degrees)', type: 'int', min: 0, max: 359, value: 30 },
        { name: 'd2', label: 'Second leg (km)', type: 'int', min: 1, max: 200, value: 70 },
        { name: 't2', label: 'Second bearing (degrees)', type: 'int', min: 0, max: 359, value: 100 },
      ],
      compute({ d1, t1, d2, t2 }) {
        const turn = (((t2 - t1) % 360) + 360) % 360;
        const change = turn > 180 ? 360 - turn : turn;
        const inside = 180 - change;
        const { dist } = legs(d1, t1, d2, t2);
        const steps = [
          change === 0
            ? 'The ship does not change course, so the two legs lie on one straight line.'
            : R`The course changes by \(${change}^{\circ}\) (${turn > 180 ? 'to the left' : turn === 180 ? 'a complete reversal' : 'to the right'}), so the angle inside the triangle at the turning point is \(180^{\circ} - ${change}^{\circ} = ${inside}^{\circ}\).`,
          R`Law of Cosines with sides ${d1} and ${d2} and included angle \(${inside}^{\circ}\): \(x^{2} = ${d1}^{2} + ${d2}^{2} - 2(${d1})(${d2})\cos ${inside}^{\circ} \approx ${num(dist * dist, { places: 1 })}\).`,
          R`\(x \approx ${n1(dist)}\) km.`,
        ];
        const out = {
          problem: `A ship sails ${d1} km on a bearing of ${bearing(t1)}, then ${d2} km on a bearing of ${bearing(t2)}. How far is it from its starting point?`,
          steps,
          answer: `About ${txt(dist, { fixed: 1 })} km`,
        };
        if (inside > 3 && inside < 177) out.visual = shipVisual(d1, t1, d2, t2, 'km');
        return out;
      },
    },
  ],

  quiz: {
    easy: [easyChooseLaw, easySinesSide, easyArea],
    medium: [mediumCosinesSide, mediumCosinesAngle, mediumSinesAngle, mediumSurvey],
    hard: [hardAmbiguousCount, hardAmbiguousSolve, hardBearings, hardAreaSSS],
    challenge: [challengeTower, challengeThirdSide, challengeParallelogram],
  },
};
