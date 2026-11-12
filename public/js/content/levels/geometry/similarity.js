import { R, q, num, frac, gcd, person } from '../../lib/index.js';
import { deg, degT, T, rad, triSSS, triAA, twoTriangles, rightMark, dist } from './_shared.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
const grow = (pts, k) => pts.map(([x, y]) => [r3(x * k), r3(y * k)]);
const posInt = (v) => (Number.isInteger(v) && v > 0 ? v : null);
// Triangles with whole-number sides [bottom, right, left] and a comfortable shape.
const SHAPES = [[4, 3, 5], [5, 4, 6], [6, 5, 7], [6, 4, 7], [6, 5, 5], [7, 6, 8], [7, 5, 8], [8, 6, 9], [6, 4, 5], [8, 5, 7], [9, 6, 8], [10, 7, 9]];
const shapePts = ([b, r, l]) => triSSS(r, l, b);

// Triangle ABC with D on AB and E on AC, DE parallel to BC. Picture vertex order: B, C, E, A, D.
function splitFigure(ab, ac, bc, t, labels, alt) {
  const [B, C, A] = triSSS(ac, ab, bc);
  const D = [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])];
  const E = [A[0] + t * (C[0] - A[0]), A[1] + t * (C[1] - A[1])];
  return { type: 'polygon', points: [B, C, E, A, D], vertices: ['B', 'C', 'E', 'A', 'D'], sides: [labels.bc, labels.ec, labels.ae, labels.ad, labels.db], extra: [{ from: D, to: E, dashed: false, label: labels.de }], alt };
}

// ───────────── Easy ─────────────

function easyScaleFactor(rng) {
  const s = rng.pick(SHAPES);
  const k = rng.int(2, 4);
  const up = rng.bool();
  const i = rng.int(0, 2);
  const lab = (m) => s.map((v, n) => (n === i ? `${v * m} cm` : ''));
  return q({
    prompt: R`The two triangles are similar. A side of the smaller triangle is \(${s[i]}\) cm and the corresponding side of the larger triangle is \(${k * s[i]}\) cm. What is the scale factor from the **${up ? 'smaller to the larger' : 'larger to the smaller'}** triangle?`,
    visual: twoTriangles({ pts: grow(shapePts(s), k), sides: lab(k) }, { pts: shapePts(s), sides: lab(1) }, `Two similar triangles drawn to scale. A side of the larger is ${k * s[i]} cm and the matching side of the smaller is ${s[i]} cm.`),
    correct: up ? frac(k, 1) : frac(1, k),
    wrong: [
      { value: up ? frac(1, k) : frac(k, 1), why: 'That is the scale factor in the other direction. Divide the new length by the original length.' },
      { value: frac(k * s[i] - s[i], 1), why: 'A scale factor is a ratio of corresponding lengths, found by dividing, not subtracting.' },
      up ? frac(k + 1, 1) : frac(1, k + 1),
      up ? frac(k * k, 1) : frac(1, k * k),
    ],
    solution: [
      'The scale factor is a length in the new figure divided by the corresponding length in the original figure.',
      up ? R`From smaller to larger: \(\dfrac{${k * s[i]}}{${s[i]}} = ${k}\).` : R`From larger to smaller: \(\dfrac{${s[i]}}{${k * s[i]}} = \dfrac{1}{${k}}\).`,
    ],
    rule: 0,
    skill: 'scale factor',
  });
}

function easyMissingSide(rng) {
  const s = rng.pick(SHAPES);
  const k = rng.int(2, 3);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const findBig = rng.bool();
  const small = s.map((v, n) => (n === i ? `${v} cm` : n === j ? (findBig ? `${v} cm` : 'x') : ''));
  const big = s.map((v, n) => (n === i ? `${v * k} cm` : n === j ? (findBig ? 'x' : `${v * k} cm`) : ''));
  const x = findBig ? k * s[j] : s[j];
  const known = findBig ? s[j] : k * s[j];
  return q({
    prompt: R`The two triangles are similar. The sides of \(${s[i]}\) cm and \(${k * s[i]}\) cm correspond, and the side marked \(x\) corresponds to the side of \(${known}\) cm. Find \(x\).`,
    visual: twoTriangles({ pts: grow(shapePts(s), k), sides: big }, { pts: shapePts(s), sides: small }, `Two similar triangles drawn to scale. The smaller has sides ${small.filter(Boolean).join(' and ')}; the matching sides of the larger are ${big.filter(Boolean).join(' and ')}.`),
    correct: x,
    unit: 'cm',
    wrong: [
      { value: findBig ? known + (k - 1) * s[i] : posInt(known - (k - 1) * s[i]), why: 'Similar figures are related by multiplying, not by adding the same amount to each side.' },
      { value: findBig ? posInt(known / k) : known * k, why: findBig ? 'The side is in the larger triangle, so multiply by the scale factor.' : 'The side is in the smaller triangle, so divide by the scale factor.' },
      x + k,
      x + 2,
      2 * x,
    ],
    solution: [
      R`Find the scale factor from the pair of known corresponding sides: \(\dfrac{${k * s[i]}}{${s[i]}} = ${k}\). Each side of the larger triangle is \(${k}\) times the matching side of the smaller.`,
      findBig ? R`\(x = ${k} \cdot ${known} = ${x}\) cm.` : R`\(x = ${known} \div ${k} = ${x}\) cm.`,
    ],
    rule: 2,
    skill: 'missing sides',
    check: () => ((findBig ? x * s[i] === known * k * s[i] : x * k * s[i] === known * s[i]) ? true : 'sides are not in proportion'),
  });
}

function easyAngles(rng) {
  for (;;) {
    const a = rng.int(35, 80);
    const b = rng.int(35, 80);
    const c = 180 - a - b;
    if (c < 30 || new Set([a, b, c]).size < 3) continue;
    const similar = rng.bool();
    const d = similar ? c : c + rng.pick([-12, -8, 8, 12]);
    const e = 180 - b - d;
    if (e < 25 || d < 25 || [a, c].includes(e)) continue;
    const first = { pts: triAA(a, b, 8), angles: [degT(a), degT(b), ''] };
    const second = { pts: triAA(b, d, 6.5), angles: [degT(b), degT(d), ''] };
    return q({
      prompt: R`One triangle has angles of \(${deg(a)}\) and \(${deg(b)}\). Another triangle has angles of \(${deg(b)}\) and \(${deg(d)}\). Are the triangles similar?`,
      visual: twoTriangles(first, second, `Two triangles. The first has angles of ${a} and ${b} degrees marked. The second has angles of ${b} and ${d} degrees marked.`),
      correct: similar ? 'Yes, by AA: two pairs of angles are congruent.' : 'No: the triangles do not have the same angles.',
      wrong: [
        similar ? { value: 'No: the triangles do not have the same angles.', why: R`Find the third angle of each triangle first. Both are missing an angle, and the angle sum is \(180^\circ\).` } : { value: 'Yes, by AA: two pairs of angles are congruent.', why: 'Only one pair of angles matches. Find the third angle of each triangle to compare them.' },
        'Yes: any two triangles are similar.',
        'It cannot be decided without the side lengths.',
      ],
      solution: [
        R`Find the third angle of each triangle. First: \(180 - ${a} - ${b} = ${c}\) degrees. Second: \(180 - ${b} - ${d} = ${e}\) degrees.`,
        R`The first triangle has angles \(${deg(a)}, ${deg(b)}, ${deg(c)}\). The second has \(${deg(b)}, ${deg(d)}, ${deg(e)}\).`,
        similar ? 'The angles match, so the triangles are similar by AA (two pairs of congruent angles are enough).' : 'Only one angle matches, so the triangles are not similar.',
      ],
      rule: 1,
      skill: 'similarity criteria',
      check: () => ([a, b, c].sort().join() === [b, d, e].sort().join()) === similar ? true : 'angle sets do not fit the answer',
    });
  }
}

// ───────────── Medium ─────────────

function mediumProportion(rng) {
  for (;;) {
    const s = rng.pick(SHAPES);
    const k = rng.pick([frac(3, 2), frac(5, 2), frac(4, 3), frac(5, 3), frac(2, 3), frac(3, 4), frac(1, 2), frac(3, 5)]);
    const m = k.d * rng.int(1, 3);
    const first = s.map((v) => v * m); // sides of triangle ABC: AB, BC, CA
    const second = first.map((v) => (v / k.d) * k.n); // sides of DEF: DE, EF, FD
    const [i, j] = rng.sample([0, 1, 2], 2);
    const names = [['AB', 'DE'], ['BC', 'EF'], ['CA', 'FD']];
    const additive = first[j] + second[i] - first[i];
    if (additive === second[j] || Math.max(...first, ...second) > 45) continue;
    const big = k.value > 1;
    const figA = { pts: grow(shapePts(s), m), vertices: ['A', 'B', 'C'], sides: first.map((v, n) => (n === i || n === j ? `${v}` : '')) };
    const figD = { pts: grow(shapePts(s), m * k.value), vertices: ['D', 'E', 'F'], sides: second.map((v, n) => (n === i ? `${v}` : n === j ? 'x' : '')) };
    return q({
      prompt: R`\(\triangle ABC \sim \triangle DEF\). \(${names[i][0]} = ${first[i]}\), \(${names[j][0]} = ${first[j]}\) and \(${names[i][1]} = ${second[i]}\). Find \(${names[j][1]}\).`,
      visual: twoTriangles(big ? figD : figA, big ? figA : figD, `Similar triangles ABC and DEF drawn to scale, with ${names[i][0]} = ${first[i]}, ${names[j][0]} = ${first[j]}, ${names[i][1]} = ${second[i]} and ${names[j][1]} marked x.`),
      correct: second[j],
      wrong: [
        additive > 0 ? { value: additive, why: 'Corresponding sides of similar triangles have equal ratios, not equal differences.' } : null,
        posInt((first[j] * first[i]) / second[i]) ? { value: (first[j] * first[i]) / second[i], why: R`The ratio is upside down. Match each side of \(\triangle DEF\) with its partner in \(\triangle ABC\).` } : null,
        second[j] + k.d,
        second[j] + 2 * k.d + 1,
        first[j],
      ],
      solution: [
        R`Corresponding sides are in proportion. \(\overline{${names[i][0]}}\) matches \(\overline{${names[i][1]}}\) and \(\overline{${names[j][0]}}\) matches \(\overline{${names[j][1]}}\): \(\dfrac{${names[j][1]}}{${first[j]}} = \dfrac{${second[i]}}{${first[i]}}\).`,
        R`Multiply both sides by \(${first[j]}\): \(${names[j][1]} = \dfrac{${second[i]} \cdot ${first[j]}}{${first[i]}} = ${second[j]}\).`,
        R`Check: the scale factor is \(\dfrac{${second[i]}}{${first[i]}} = ${k.tex()}\), and \(${k.tex()} \cdot ${first[j]} = ${second[j]}\). ✓`,
      ],
      rule: 2,
      skill: 'missing sides',
      check: () => (second[j] * first[i] === second[i] * first[j] ? true : 'sides are not in proportion'),
    });
  }
}

function mediumCriterion(rng) {
  const kind = rng.pick(['AA', 'SAS', 'SSS', 'none']);
  const k = rng.pick([2, 3, frac(3, 2), frac(5, 2)]);
  const kv = typeof k === 'number' ? k : k.value;
  const even = (lo, hi) => 2 * rng.int(lo / 2, hi / 2);
  const answers = { AA: 'Similar by AA', SAS: 'Similar by SAS', SSS: 'Similar by SSS', none: 'Not similar' };
  let text;
  let steps;
  let visual;
  if (kind === 'AA') {
    const a = rng.int(40, 75);
    const b = rng.intExcept(35, 70, [a]);
    text = R`In \(\triangle ABC\), \(m\angle A = ${deg(a)}\) and \(m\angle B = ${deg(b)}\). In \(\triangle DEF\), \(m\angle D = ${deg(a)}\) and \(m\angle E = ${deg(b)}\).`;
    steps = [R`\(\angle A \cong \angle D\) and \(\angle B \cong \angle E\).`, 'Two pairs of congruent angles are enough: the triangles are similar by AA. No side lengths are needed.'];
    visual = twoTriangles({ pts: triAA(a, b, 8), vertices: ['A', 'B', 'C'], angles: [degT(a), degT(b), ''] }, { pts: triAA(a, b, 6), vertices: ['D', 'E', 'F'], angles: [degT(a), degT(b), ''] }, `Triangles ABC and DEF. Angles A and D are ${a} degrees; angles B and E are ${b} degrees.`);
  } else if (kind === 'SAS') {
    const p = even(6, 10);
    const r = even(6, 12);
    const t = rng.int(45, 100);
    const pts = [[0, 0], [p, 0], [r3(r * Math.cos(rad(t))), r3(r * Math.sin(rad(t)))]];
    text = R`In \(\triangle ABC\), \(AB = ${p}\), \(AC = ${r}\) and \(m\angle A = ${deg(t)}\). In \(\triangle DEF\), \(DE = ${p * kv}\), \(DF = ${r * kv}\) and \(m\angle D = ${deg(t)}\).`;
    steps = [R`Compare the ratios of the sides that form the known angles: \(\dfrac{${p * kv}}{${p}} = ${num(k)}\) and \(\dfrac{${r * kv}}{${r}} = ${num(k)}\). They are equal.`, R`The angles between those sides are congruent (\(${deg(t)}\)), so the triangles are similar by SAS.`];
    visual = twoTriangles({ pts: grow(pts, kv), vertices: ['D', 'E', 'F'], sides: [`${p * kv}`, '', `${r * kv}`], angles: [degT(t), '', ''] }, { pts, vertices: ['A', 'B', 'C'], sides: [`${p}`, '', `${r}`], angles: [degT(t), '', ''] }, `Triangles ABC and DEF drawn to scale. AB = ${p}, AC = ${r}, angle A = ${t} degrees; DE = ${p * kv}, DF = ${r * kv}, angle D = ${t} degrees.`);
  } else {
    const s = rng.pick(SHAPES).map((v) => 2 * v);
    const bump = kind === 'none' ? rng.pick([-2, 2, 3]) : 0;
    const big = [s[0] * kv, s[1] * kv, s[2] * kv + bump];
    const ratio = (n) => R`\dfrac{${big[n]}}{${s[n]}}`;
    text = R`\(\triangle ABC\) has sides \(AB = ${s[0]}\), \(BC = ${s[1]}\) and \(CA = ${s[2]}\). \(\triangle DEF\) has sides \(DE = ${big[0]}\), \(EF = ${big[1]}\) and \(FD = ${big[2]}\).`;
    steps = [
      R`Compare the ratios of corresponding sides, shortest with shortest and so on: \(${ratio(0)} = ${num(k)}\), \(${ratio(1)} = ${num(k)}\) and \(${ratio(2)}${bump ? R` \approx ${num(big[2] / s[2], { places: 2 })}` : ` = ${num(k)}`}\).`,
      bump ? 'The three ratios are not all equal, so the sides are not in proportion. The triangles are not similar.' : 'All three ratios are equal, so the triangles are similar by SSS.',
    ];
    visual = twoTriangles({ pts: triSSS(big[1], big[2], big[0]), vertices: ['D', 'E', 'F'], sides: big.map(String) }, { pts: triSSS(s[1], s[2], s[0]), vertices: ['A', 'B', 'C'], sides: s.map(String) }, `Triangles ABC and DEF drawn to scale. ABC has sides ${s.join(', ')}; DEF has sides ${big.join(', ')}.`);
  }
  return q({
    prompt: `${text} Which conclusion does this information justify?`,
    visual,
    correct: answers[kind],
    wrong: Object.values(answers),
    solution: steps,
    rule: 1,
    skill: 'similarity criteria',
  });
}

function mediumShadow(rng) {
  const h = rng.pick([1.5, 1.6, 1.8, 2]);
  const k = rng.int(3, 6); // the object is k times as tall as the person
  const s = rng.pick([0.5, 1, 1.5, 2, 2.5, 3]);
  const H = r3(h * k);
  const S = r3(s * k);
  const name = person(rng);
  const thing = rng.pick(['tree', 'flagpole', 'lamp post', 'tower']);
  const m = (v) => T(v);
  return q({
    prompt: R`${name} is \(${num(h)}\) m tall and casts a shadow \(${num(s)}\) m long. At the same time, a ${thing} casts a shadow \(${num(S)}\) m long. How tall is the ${thing}?`,
    visual: twoTriangles({ pts: [[0, 0], [s, 0], [0, h]], sides: [m(s), '', m(h)], right: [0] }, { pts: [[0, 0], [S, 0], [0, H]], sides: [m(S), '', 'x'], right: [0] }, `Two right triangles drawn to scale, with lengths in metres. ${name} is ${T(h)} m tall with a shadow of ${T(s)} m along the ground. The ${thing} is x metres tall with a shadow of ${T(S)} m.`),
    correct: H,
    unit: 'm',
    wrong: [
      { value: r3(h + S - s), why: 'The shadow is longer by a certain amount, but heights and shadows are related by a ratio, not by a difference.' },
      { value: r3(S * h), why: `Divide by the length of ${name}'s shadow as well. The proportion compares height with shadow for each of them.` },
      S,
      r3(H + h),
      r3(H / 2),
    ],
    solution: [
      `The sun's rays hit the ground at the same angle for both, and both stand upright, so the two right triangles are similar by AA.`,
      R`Height over shadow is the same for both: \(\dfrac{x}{${num(S)}} = \dfrac{${num(h)}}{${num(s)}}\).`,
      R`\(x = \dfrac{${num(h)} \cdot ${num(S)}}{${num(s)}} = ${num(H)}\). The ${thing} is \(${num(H)}\) m tall.`,
    ],
    rule: 4,
    skill: 'indirect measurement',
    check: () => (Math.abs(H / S - h / s) < 1e-9 ? true : 'heights and shadows are not in proportion'),
  });
}

// ───────────── Hard ─────────────

function splitNumbers(rng) {
  for (;;) {
    const d = rng.int(1, 4);
    const n = rng.int(1, 4);
    if (gcd(d, n) !== 1) continue;
    const [i, j, m] = rng.shuffle(rng.pick([[2, 3, 4], [3, 4, 5], [4, 5, 6], [3, 3, 4], [2, 2, 3], [4, 4, 5], [3, 5, 6], [4, 5, 7]]));
    const w = d + n;
    if (w * Math.max(i, j, m) > 42) continue;
    return { ad: d * i, db: n * i, ae: d * j, ec: n * j, bc: w * m, de: d * m, ab: w * i, ac: w * j, t: d / w };
  }
}

function hardSideSplitter(rng) {
  const v = splitNumbers(rng);
  const lead = R`In \(\triangle ABC\), \(D\) is on \(\overline{AB}\), \(E\) is on \(\overline{AC}\) and \(\overline{DE} \parallel \overline{BC}\).`;
  if (rng.bool()) {
    if (v.ad === v.db || v.ad === v.ae) return hardSideSplitter(rng);
    const flipped = (v.ae * v.ad) / v.db;
    return q({
      prompt: R`${lead} \(AD = ${v.ad}\), \(DB = ${v.db}\) and \(AE = ${v.ae}\). Find \(EC\).`,
      visual: splitFigure(v.ab, v.ac, v.bc, v.t, { ad: `${v.ad}`, db: `${v.db}`, ae: `${v.ae}`, ec: 'x' }, `Triangle ABC with D on AB and E on AC, and DE parallel to BC. AD = ${v.ad}, DB = ${v.db}, AE = ${v.ae}, and EC is marked x.`),
      correct: v.ec,
      wrong: [
        posInt(flipped) && flipped !== v.ec ? { value: flipped, why: R`The ratio is upside down. \(\dfrac{AD}{DB} = \dfrac{AE}{EC}\): the parts nearer \(A\) go on top on both sides.` } : null,
        { value: posInt(v.ae + v.db - v.ad), why: 'The parts are in proportion. They do not differ by the same amount.' },
        v.db,
        v.ec + 2,
        v.ec + v.ae,
      ],
      solution: [
        R`A line parallel to one side of a triangle divides the other two sides proportionally: \(\dfrac{AD}{DB} = \dfrac{AE}{EC}\).`,
        R`\(\dfrac{${v.ad}}{${v.db}} = \dfrac{${v.ae}}{EC}\), so \(${v.ad} \cdot EC = ${v.db} \cdot ${v.ae} = ${v.db * v.ae}\).`,
        R`\(EC = ${v.ec}\).`,
      ],
      rule: 3,
      skill: 'side-splitter theorem',
      check: () => (v.ad * v.ec === v.db * v.ae ? true : 'the sides are not divided proportionally'),
    });
  }
  const slip = (v.bc * v.ad) / v.db;
  return q({
    prompt: R`${lead} \(AD = ${v.ad}\), \(DB = ${v.db}\) and \(BC = ${v.bc}\). Find \(DE\).`,
    visual: splitFigure(v.ab, v.ac, v.bc, v.t, { ad: `${v.ad}`, db: `${v.db}`, bc: `${v.bc}`, de: 'x' }, `Triangle ABC with D on AB and E on AC, and DE parallel to BC. AD = ${v.ad}, DB = ${v.db}, BC = ${v.bc}, and DE is marked x.`),
    correct: v.de,
    wrong: [
      posInt(slip) && slip !== v.de ? { value: slip, why: R`\(\overline{DE}\) and \(\overline{BC}\) are sides of the similar triangles \(ADE\) and \(ABC\), so use \(\dfrac{AD}{AB}\), not \(\dfrac{AD}{DB}\).` } : { value: v.bc - v.de, why: R`That uses \(\dfrac{DB}{AB}\). \(\overline{DE}\) belongs to the small triangle at the top, so use \(\dfrac{AD}{AB}\).` },
      { value: posInt(v.bc - v.db), why: 'The sides are in proportion. They do not differ by the same amount.' },
      v.bc / 2 !== v.de ? posInt(v.bc / 2) : null,
      v.de + 2,
      v.de + 5,
    ],
    solution: [
      R`\(\overline{DE} \parallel \overline{BC}\) gives two pairs of congruent corresponding angles, so \(\triangle ADE \sim \triangle ABC\) by AA.`,
      R`Use whole sides of the triangles: \(AB = ${v.ad} + ${v.db} = ${v.ab}\), so \(\dfrac{DE}{BC} = \dfrac{AD}{AB} = \dfrac{${v.ad}}{${v.ab}}\).`,
      R`\(DE = \dfrac{${v.ad}}{${v.ab}} \cdot ${v.bc} = ${v.de}\).`,
    ],
    rule: 3,
    skill: 'side-splitter theorem',
    check: () => {
      const f = splitFigure(v.ab, v.ac, v.bc, v.t, {}, '');
      return Math.abs(dist(f.extra[0].from, f.extra[0].to) - v.de) < 0.01 && v.de * v.ab === v.bc * v.ad ? true : 'DE measured on the figure is different';
    },
  });
}

function hardAreaVolume(rng) {
  const [a, b] = rng.pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [1, 4]]);
  const w = rng.int(1, 4);
  const v = rng.int(1, 3);
  const kind = rng.pick(['area', 'area', 'volume', 'perimeter']);
  const toBig = rng.bool();
  const [from, to] = toBig ? [a, b] : [b, a];
  const p = { area: 2, volume: 3, perimeter: 1 }[kind];
  // Amounts chosen so that the likely slips (wrong power of the scale factor) are whole numbers too,
  // and so that a perimeter is comfortably longer than the one side that is given.
  const given = p === 1 ? from * w * a * b * (v + 1) : p === 2 ? a * v * from * from : v * from ** 3;
  const ans = (given * to ** p) / from ** p;
  const slipWith = (e) => posInt((given * to ** e) / from ** e);
  const unit = kind === 'area' ? 'cm²' : kind === 'volume' ? 'cm³' : 'cm';
  const shape = kind === 'volume' ? rng.pick(['cones', 'cylinders', 'pyramids', 'prisms']) : rng.pick(['triangles', 'rectangles', 'parallelograms', 'trapezoids']);
  const size = (t) => (t === from ? (toBig ? 'smaller' : 'larger') : toBig ? 'larger' : 'smaller');
  return q({
    prompt: R`Two similar ${shape} have ${kind === 'volume' ? 'heights' : 'corresponding sides'} of \(${a * w}\) cm and \(${b * w}\) cm. The ${kind} of the ${size(from)} one is \(${given}\) ${unit}. What is the ${kind} of the ${size(to)} one?`,
    correct: ans,
    unit,
    wrong: [
      p !== 1 ? { value: slipWith(1), why: `${kind === 'area' ? 'Areas' : 'Volumes'} do not scale like lengths. Use the ${kind === 'area' ? 'square' : 'cube'} of the scale factor.` } : { value: slipWith(2), why: 'A perimeter is a length, so it is multiplied by the scale factor itself, not by its square.' },
      p === 2 ? { value: slipWith(3), why: 'Cubing the scale factor is for volumes. Areas use the square.' } : p === 3 ? { value: slipWith(2), why: 'Squaring the scale factor is for areas. Volumes use the cube.' } : slipWith(3),
      posInt(given + (to - from) * w),
      given,
      ans + from * to,
    ],
    solution: [
      R`The scale factor from the ${size(from)} to the ${size(to)} is \(\dfrac{${to * w}}{${from * w}}${w === 1 && from !== 1 ? '' : ` = ${frac(to, from).tex()}`}\).`,
      p === 1 ? 'Perimeters are lengths, so they are multiplied by the scale factor.' : p === 2 ? R`Areas are multiplied by the **square** of the scale factor: \(\left(${frac(to, from).tex()}\right)^2 = ${frac(to * to, from * from).tex()}\).` : R`Volumes are multiplied by the **cube** of the scale factor: \(\left(${frac(to, from).tex()}\right)^3 = ${frac(to ** 3, from ** 3).tex()}\).`,
      R`\(${given} \cdot ${frac(to ** p, from ** p).tex()} = ${ans}\) ${unit}.`,
    ],
    rule: 5,
    skill: 'perimeter, area and volume ratios',
    check: () => (Number.isInteger(ans) && Math.abs(ans / given - (to / from) ** p) < 1e-9 && (p !== 1 || (given > 2 * from * w && ans > 2 * to * w)) ? true : 'amounts do not fit the scale factor'),
  });
}

function hardMirror(rng) {
  const h = rng.pick([1.5, 1.6, 1.8]);
  const d1 = rng.pick([1, 1.5, 2, 2.5]);
  const k = rng.int(3, 6);
  const d2 = d1 * k;
  const H = r3(h * k);
  const name = person(rng);
  const thing = rng.pick(['a flagpole', 'a tree', 'a climbing wall', 'a lighthouse']);
  const it = thing.replace(/^a /, 'the ');
  const m = (v) => T(v);
  return q({
    prompt: R`To measure ${thing}, ${name} lays a mirror flat on the ground \(${num(d2)}\) m from its base, then steps back until the top of ${it} is visible in the mirror. ${name} is then \(${num(d1)}\) m from the mirror, with eyes \(${num(h)}\) m above the ground. How tall is ${it}?`,
    visual: {
      type: 'polygon',
      points: [[-d1, 0], [0, 0], [-d1, h]],
      sides: [m(d1), '', m(h)],
      right: [0],
      extra: [{ from: [0, 0], to: [d2, 0], dashed: false, label: m(d2) }, { from: [d2, 0], to: [d2, H], dashed: false, label: 'x' }, { from: [d2, H], to: [0, 0], dashed: false }, ...rightMark([0, 0], [d2, 0], [d2, H], 0.05 * d2)],
      alt: `Two right triangles that meet at the mirror on the ground, with lengths in metres. On the left, the small triangle has a vertical side of ${T(h)} m (eye height) and a base of ${T(d1)} m. On the right, the large triangle has a base of ${T(d2)} m and a vertical side marked x.`,
    },
    correct: H,
    unit: 'm',
    wrong: [
      { value: r3(h + d2 - d1), why: 'The two triangles are similar, so their sides are related by a ratio, not by a difference.' },
      { value: r3(d2 * h), why: `Divide by ${name}'s distance from the mirror as well. The proportion compares height with ground distance in each triangle.` },
      r3(d2),
      r3(H + h),
      r3(H / 2),
    ],
    solution: [
      'Light reflects off the mirror at the same angle on both sides, and both triangles have a right angle, so they are similar by AA.',
      R`Height over ground distance is the same in both: \(\dfrac{x}{${num(d2)}} = \dfrac{${num(h)}}{${num(d1)}}\).`,
      R`\(x = \dfrac{${num(h)} \cdot ${num(d2)}}{${num(d1)}} = ${num(H)}\) m.`,
    ],
    rule: 4,
    skill: 'indirect measurement',
    check: () => (Math.abs(Math.atan2(H, d2) - Math.atan2(h, d1)) < 1e-9 ? true : 'the two sight lines make different angles with the ground'),
  });
}

// ───────────── Challenge ─────────────

function challengeSplitAlgebra(rng) {
  for (;;) {
    const v = splitNumbers(rng);
    const c = v.ae - v.ad;
    if (c <= 0 || v.ec === v.db) continue;
    return q({
      prompt: R`In \(\triangle ABC\), \(D\) is on \(\overline{AB}\), \(E\) is on \(\overline{AC}\) and \(\overline{DE} \parallel \overline{BC}\). \(AD = x\), \(DB = ${v.db}\), \(AE = x + ${c}\) and \(EC = ${v.ec}\). What is the length of \(\overline{AE}\)?`,
      visual: splitFigure(v.ab, v.ac, v.bc, v.t, { ad: 'x', db: `${v.db}`, ae: `x + ${c}`, ec: `${v.ec}` }, `Triangle ABC with D on AB and E on AC, and DE parallel to BC. AD = x, DB = ${v.db}, AE = x + ${c}, EC = ${v.ec}.`),
      correct: v.ae,
      wrong: [
        { value: v.ad, why: R`That is \(x\), the length of \(\overline{AD}\). The question asks for \(AE = x + ${c}\).` },
        { value: v.ac, why: R`That is the whole side \(\overline{AC}\).` },
        v.ae + c,
        v.ec + c,
        v.ae + 1,
      ],
      solution: [
        R`The parallel line divides the two sides proportionally: \(\dfrac{x}{${v.db}} = \dfrac{x + ${c}}{${v.ec}}\).`,
        R`Cross-multiply: \(${v.ec}x = ${v.db}(x + ${c}) = ${v.db}x + ${v.db * c}\).`,
        v.ec - v.db === 1 ? R`Subtract \(${v.db}x\) from both sides: \(x = ${v.ad}\).` : R`\(${v.ec - v.db}x = ${v.db * c}\), so \(x = ${v.ad}\).`,
        R`\(AE = x + ${c} = ${v.ae}\).`,
      ],
      rule: 3,
      skill: 'side-splitter theorem',
      check: () => (v.ad * v.ec === v.db * (v.ad + c) ? true : 'x does not satisfy the proportion'),
    });
  }
}

function challengeBackwards(rng) {
  const [a, b] = rng.pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [1, 2], [1, 3], [5, 6]]);
  const t = rng.int(1, 3);
  const u = rng.int(1, 4);
  const solid = rng.bool(0.4);
  if (solid) {
    const v1 = a ** 3 * u;
    const v2 = b ** 3 * u;
    const s1 = a * a * a * t; // chosen so that the slips below are whole numbers
    const s2 = a * b * b * t;
    return q({
      prompt: R`Two similar solids have volumes of \(${v1}\) cm³ and \(${v2}\) cm³. The surface area of the smaller solid is \(${s1}\) cm². What is the surface area of the larger solid?`,
      correct: s2,
      unit: 'cm²',
      wrong: [
        { value: b ** 3 * t, why: 'That multiplies by the ratio of the volumes. First find the scale factor for lengths, then square it for areas.' },
        { value: a * a * b * t, why: 'That multiplies by the scale factor for lengths. Areas use its square.' },
        s1,
        s2 + a * b,
        2 * s2,
      ],
      solution: [
        R`Volumes are in the ratio of the cubes of corresponding lengths: \(\dfrac{${v2}}{${v1}}${u === 1 ? '' : R` = \dfrac{${b ** 3}}{${a ** 3}}`}\), and \(${b ** 3} = ${b}^3\), \(${a ** 3} = ${a}^3\), so the scale factor for lengths is \(\dfrac{${b}}{${a}}\).`,
        R`Areas are multiplied by the square of the scale factor: \(\left(\dfrac{${b}}{${a}}\right)^2 = \dfrac{${b * b}}{${a * a}}\).`,
        R`\(${s1} \cdot \dfrac{${b * b}}{${a * a}} = ${s2}\) cm².`,
      ],
      rule: 5,
      skill: 'perimeter, area and volume ratios',
      check: () => (Math.abs(Math.cbrt(v2 / v1) ** 2 - s2 / s1) < 1e-9 ? true : 'surface areas do not match the volume ratio'),
    });
  }
  const A1 = a * a * u;
  const A2 = b * b * u;
  const side1 = a * a * t;
  const side2 = a * b * t;
  return q({
    prompt: R`Two similar polygons have areas of \(${A1}\) cm² and \(${A2}\) cm². A side of the smaller polygon is \(${side1}\) cm long. How long is the corresponding side of the larger polygon?`,
    correct: side2,
    unit: 'cm',
    wrong: [
      { value: b * b * t, why: 'That multiplies by the ratio of the areas. Sides are multiplied by the scale factor, which is the square root of the area ratio.' },
      { value: side1 + A2 - A1, why: 'Similar figures are related by multiplying, and areas and lengths cannot be added together.' },
      side1,
      side2 + a,
      2 * side2,
    ],
    solution: [
      R`Areas are in the ratio of the squares of corresponding sides: \(\dfrac{${A2}}{${A1}}${u === 1 ? '' : R` = \dfrac{${b * b}}{${a * a}}`}\).`,
      R`Take the square root to get the scale factor for lengths: \(\dfrac{${b}}{${a}}\).`,
      R`\(${side1} \cdot \dfrac{${b}}{${a}} = ${side2}\) cm.`,
    ],
    rule: 5,
    skill: 'perimeter, area and volume ratios',
    check: () => (Math.abs(Math.sqrt(A2 / A1) - side2 / side1) < 1e-9 ? true : 'sides do not match the area ratio'),
  });
}

function challengeAltitude(rng) {
  const [u, w] = rng.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5]]);
  const m = rng.int(1, 3);
  const p = m * u * u;
  const s = m * w * w;
  const h = m * u * w;
  const findH = rng.bool(0.6);
  return q({
    prompt: findH
      ? R`In right \(\triangle ABC\), the right angle is at \(C\). The altitude \(\overline{CD}\) meets the hypotenuse \(\overline{AB}\) at \(D\), with \(AD = ${p}\) and \(DB = ${s}\). Find \(CD\).`
      : R`In right \(\triangle ABC\), the right angle is at \(C\). The altitude \(\overline{CD}\) meets the hypotenuse \(\overline{AB}\) at \(D\), with \(AD = ${p}\) and \(CD = ${h}\). Find \(DB\).`,
    visual: {
      type: 'polygon',
      points: [[0, 0], [p, 0], [p + s, 0], [p, h]],
      vertices: ['A', 'D', 'B', 'C'],
      sides: [`${p}`, findH ? `${s}` : 'x', '', ''],
      right: [3],
      extra: [{ from: [p, h], to: [p, 0], dashed: false, label: findH ? 'x' : `${h}` }, ...rightMark([p, h], [p, 0], [p + s, 0], 0.045 * (p + s))],
      alt: `Right triangle ABC with the right angle at C and hypotenuse AB along the bottom. Segment CD is drawn from C straight down to D on AB. AD = ${p}, ${findH ? `DB = ${s} and CD is marked x` : `CD = ${h} and DB is marked x`}.`,
    },
    correct: findH ? h : s,
    wrong: findH
      ? [
          { value: p * s, why: R`\(CD^2 = AD \cdot DB\). Take the square root of the product.` },
          { value: posInt((p + s) / 2), why: 'The altitude is the geometric mean of the two parts (the square root of their product), not their average.' },
          Math.abs(s - p),
          h + m,
          p + s,
        ]
      : [
          { value: posInt(h * h - p), why: R`\(CD^2 = AD \cdot DB\), so divide \(CD^2\) by \(AD\).` },
          { value: posInt((h * h) / (p * p)) && (h * h) / (p * p) !== s ? (h * h) / (p * p) : 2 * h - p, why: R`\(CD^2 = AD \cdot DB\). Square \(CD\), then divide by \(AD\) once.` },
          h * p,
          s + m,
          h + p,
        ],
    solution: [
      R`The altitude splits the triangle into \(\triangle ADC\) and \(\triangle CDB\). Each shares an acute angle with \(\triangle ABC\) and has a right angle, so all three triangles are similar by AA.`,
      R`From \(\triangle ADC \sim \triangle CDB\): \(\dfrac{AD}{CD} = \dfrac{CD}{DB}\), so \(CD^2 = AD \cdot DB\).`,
      findH ? R`\(CD^2 = ${p} \cdot ${s} = ${p * s}\), so \(CD = ${h}\).` : R`\(${h}^2 = ${p} \cdot DB\), so \(DB = \dfrac{${h * h}}{${p}} = ${s}\).`,
    ],
    rule: 6,
    skill: 'altitude to the hypotenuse',
    check: () => {
      const ac2 = p * p + h * h;
      const bc2 = s * s + h * h;
      return ac2 + bc2 === (p + s) ** 2 ? true : 'the angle at C is not a right angle';
    },
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'similarity',
  title: 'Similarity',
  summary: 'Use scale factors and proportions to find lengths in similar figures, and compare their perimeters, areas and volumes.',
  standards: ['CCSS G-SRT.A.2', 'CCSS G-SRT.A.3', 'CCSS G-SRT.B.4', 'CCSS G-SRT.B.5'],

  explain: {
    intro: R`Two figures are **similar** (\(\sim\)) when they have the same shape: one is an enlargement or reduction of the other. Their corresponding angles are congruent and their corresponding sides are all in the same ratio, the **scale factor**. That one ratio is the key to every problem in this topic.`,
    rules: [
      {
        title: 'Scale factor',
        text: R`The scale factor from one figure to a similar figure is a length in the new figure divided by the corresponding length in the original. Every length is multiplied by the same scale factor; angles do not change.`,
        example: R`Sides of \(4\) and \(10\) correspond: the scale factor from small to large is \(\frac{10}{4} = \frac{5}{2}\), and from large to small it is \(\frac{2}{5}\).`,
      },
      {
        title: 'Showing triangles are similar',
        text: R`Triangles are similar if two pairs of angles are congruent (**AA**), if two pairs of sides are in the same ratio and the angles between them are congruent (**SAS**), or if all three pairs of sides are in the same ratio (**SSS**).`,
        example: R`Sides \(6, 8, 10\) and \(9, 12, 15\): \(\frac{9}{6} = \frac{12}{8} = \frac{15}{10} = \frac{3}{2}\), so the triangles are similar by SSS.`,
      },
      {
        title: 'Finding a missing side',
        text: R`Write a proportion with corresponding sides in matching positions, then solve it. The order of the letters in \(\triangle ABC \sim \triangle DEF\) tells you which sides correspond: \(\overline{AB}\) with \(\overline{DE}\), \(\overline{BC}\) with \(\overline{EF}\), \(\overline{CA}\) with \(\overline{FD}\).`,
        example: R`\(\frac{x}{9} = \frac{8}{6}\) gives \(x = \frac{8 \cdot 9}{6} = 12\).`,
      },
      {
        title: 'A line parallel to a side',
        text: R`If \(\overline{DE}\) is parallel to side \(\overline{BC}\) of \(\triangle ABC\), with \(D\) on \(\overline{AB}\) and \(E\) on \(\overline{AC}\), it divides the two sides proportionally: \(\frac{AD}{DB} = \frac{AE}{EC}\). Also \(\triangle ADE \sim \triangle ABC\), so \(\frac{DE}{BC} = \frac{AD}{AB}\). Notice that the second ratio uses the whole side \(AB\).`,
        example: R`\(AD = 4\), \(DB = 6\), \(BC = 15\): \(DE = \frac{4}{10} \cdot 15 = 6\).`,
      },
      {
        title: 'Indirect measurement',
        text: R`Shadows measured at the same time, and sight lines reflected in a mirror, make right triangles with equal angles. The triangles are similar by AA, so a height you cannot reach can be found from a proportion.`,
        example: R`A \(2\) m post has a \(3\) m shadow while a tree has a \(12\) m shadow: \(\frac{h}{12} = \frac{2}{3}\), so \(h = 8\) m.`,
      },
      {
        title: 'Perimeters, areas and volumes',
        text: R`If the scale factor for lengths is \(k\), perimeters are multiplied by \(k\), areas by \(k^2\) and volumes by \(k^3\). To go backwards, take a square root of an area ratio or a cube root of a volume ratio.`,
        example: R`With \(k = 3\), an area of \(5\) cm² becomes \(5 \cdot 9 = 45\) cm² and a volume of \(2\) cm³ becomes \(2 \cdot 27 = 54\) cm³.`,
      },
      {
        title: 'Altitude to the hypotenuse',
        text: R`In a right triangle, the altitude to the hypotenuse makes two smaller triangles that are similar to the whole triangle and to each other. If the altitude \(h\) divides the hypotenuse into parts \(p\) and \(q\), then \(h^2 = pq\).`,
        example: R`Parts of \(4\) and \(9\): \(h^2 = 36\), so \(h = 6\).`,
      },
    ],
    vocab: [
      { term: 'similar figures', def: 'Figures with the same shape. Corresponding angles are congruent and corresponding sides are proportional.' },
      { term: 'scale factor', def: 'The ratio of a length in one figure to the corresponding length in a similar figure.' },
      { term: 'proportion', def: R`An equation saying two ratios are equal, such as \(\frac{x}{9} = \frac{8}{6}\).` },
      { term: 'geometric mean', def: R`The geometric mean of \(p\) and \(q\) is \(\sqrt{pq}\).` },
    ],
    mistakes: [
      'Adding the same amount to each side. Similar figures are related by multiplying.',
      'Matching sides that do not correspond. Use the order of the letters, or match shortest with shortest and longest with longest.',
      R`Using \(\frac{AD}{DB}\) to find the parallel segment \(DE\). For \(DE\) and \(BC\), use \(\frac{AD}{AB}\).`,
      R`Scaling an area or a volume by \(k\). Areas use \(k^2\) and volumes use \(k^3\).`,
    ],
    visual: twoTriangles({ pts: triSSS(8, 10, 6), vertices: ['D', 'E', 'F'], sides: ['6', '8', '10'], right: [1] }, { pts: triSSS(4, 5, 3), vertices: ['A', 'B', 'C'], sides: ['3', '4', '5'], right: [1] }, 'Two similar right triangles drawn to scale. Triangle ABC has sides 3, 4 and 5. Triangle DEF has sides 6, 8 and 10, each twice as long.'),
  },

  examples: [
    {
      title: 'Scale factor and a missing side',
      problem: R`\(\triangle ABC \sim \triangle DEF\), with \(AB = 6\), \(BC = 9\), \(DE = 8\). Find the scale factor from \(\triangle ABC\) to \(\triangle DEF\), and find \(EF\).`,
      steps: [
        R`\(\overline{AB}\) corresponds to \(\overline{DE}\) (first two letters of each name). Scale factor: \(\frac{DE}{AB} = \frac{8}{6} = \frac{4}{3}\).`,
        R`\(\overline{BC}\) corresponds to \(\overline{EF}\), so \(EF = \frac{4}{3} \cdot 9 = 12\).`,
        R`Check with a proportion: \(\frac{EF}{BC} = \frac{12}{9} = \frac{4}{3}\). ✓`,
      ],
      answer: R`Scale factor \(\frac{4}{3}\); \(EF = 12\)`,
      visual: twoTriangles({ pts: grow(triSSS(9, 7.5, 6), 4 / 3), vertices: ['D', 'E', 'F'], sides: ['8', 'x', ''] }, { pts: triSSS(9, 7.5, 6), vertices: ['A', 'B', 'C'], sides: ['6', '9', ''] }, 'Similar triangles ABC and DEF drawn to scale. AB = 6, BC = 9, DE = 8 and EF is marked x.'),
    },
    {
      title: 'Are the triangles similar?',
      problem: R`One triangle has sides \(4\), \(6\) and \(8\). Another has sides \(6\), \(9\) and \(12\). Are they similar?`,
      steps: [
        R`Match the sides in order of size and compare ratios: \(\frac{6}{4} = \frac{3}{2}\), \(\frac{9}{6} = \frac{3}{2}\), \(\frac{12}{8} = \frac{3}{2}\).`,
        R`All three ratios are equal, so the sides are in proportion.`,
        R`The triangles are similar by SSS, with scale factor \(\frac{3}{2}\).`,
      ],
      answer: 'Yes, by SSS.',
    },
    {
      title: 'A line parallel to a side',
      problem: R`In \(\triangle ABC\), \(\overline{DE} \parallel \overline{BC}\) with \(D\) on \(\overline{AB}\) and \(E\) on \(\overline{AC}\). \(AD = 6\), \(DB = 3\), \(AE = 8\) and \(BC = 12\). Find \(EC\) and \(DE\).`,
      steps: [
        R`The parallel line divides the sides proportionally: \(\frac{AD}{DB} = \frac{AE}{EC}\), so \(\frac{6}{3} = \frac{8}{EC}\) and \(EC = 4\).`,
        R`For \(DE\), use the similar triangles \(ADE\) and \(ABC\) with whole sides: \(AB = 6 + 3 = 9\).`,
        R`\(\frac{DE}{BC} = \frac{AD}{AB}\), so \(DE = \frac{6}{9} \cdot 12 = 8\).`,
      ],
      answer: R`\(EC = 4\) and \(DE = 8\)`,
      visual: splitFigure(9, 12, 12, 2 / 3, { ad: '6', db: '3', ae: '8', ec: '?', bc: '12', de: '?' }, 'Triangle ABC with D on AB and E on AC, and DE parallel to BC. AD = 6, DB = 3, AE = 8 and BC = 12. EC and DE are unknown.'),
    },
    {
      title: 'Word problem: the height of a flagpole',
      word: true,
      problem: R`Lucia is \(1.6\) m tall and casts a shadow \(2.4\) m long. At the same moment a flagpole casts a shadow \(13.5\) m long. How tall is the flagpole?`,
      steps: [
        R`The sun's rays make the same angle with the ground for Lucia and for the flagpole, and both stand at right angles to the ground. The two triangles are similar by AA.`,
        R`Write height over shadow for each: \(\frac{h}{13.5} = \frac{1.6}{2.4}\).`,
        R`\(h = \frac{1.6 \cdot 13.5}{2.4} = 9\).`,
      ],
      answer: 'The flagpole is 9 m tall.',
      visual: twoTriangles({ pts: [[0, 0], [2.4, 0], [0, 1.6]], sides: ['2.4', '', '1.6'], right: [0] }, { pts: [[0, 0], [13.5, 0], [0, 9]], sides: ['13.5', '', 'h'], right: [0] }, 'Two right triangles drawn to scale, with lengths in metres. Lucia is 1.6 m tall with a shadow of 2.4 m. The flagpole has height h and a shadow of 13.5 m.'),
    },
  ],

  models: [
    {
      id: 'similar-right-triangles',
      title: 'Scale a right triangle',
      intro: 'Set the legs of a right triangle and the length that one leg becomes in a similar triangle.',
      inputs: [
        { name: 'a', label: 'First leg', type: 'int', min: 1, max: 20, value: 6 },
        { name: 'b', label: 'Second leg', type: 'int', min: 1, max: 20, value: 8 },
        { name: 'a2', label: 'First leg in the similar triangle', type: 'int', min: 1, max: 40, value: 9 },
      ],
      compute({ a, b, a2 }) {
        const k = frac(a2, a);
        const b2 = k.mul(b);
        const small = { pts: [[0, 0], [a, 0], [0, b]], sides: [`${a}`, '', `${b}`], right: [0] };
        const big = { pts: [[0, 0], [a2, 0], [0, b2.value]], sides: [`${a2}`, '', b2.text()], right: [0] };
        return {
          problem: R`A right triangle has legs \(${a}\) and \(${b}\). In a similar triangle, the leg that corresponds to \(${a}\) is \(${a2}\). Find the other leg and compare the areas.`,
          steps: [
            R`Scale factor: \(k = \dfrac{${a2}}{${a}}${k.tex() === R`\frac{${a2}}{${a}}` ? '' : ` = ${k.tex()}`}\).`,
            R`Every length is multiplied by \(k\): the other leg is \(${k.tex()} \cdot ${b} = ${b2.tex()}\).`,
            R`Areas: \(\frac{1}{2}(${a})(${b}) = ${num(frac(a * b, 2))}\) and \(\frac{1}{2}(${a2})\left(${b2.tex()}\right) = ${num(k.mul(k).mul(frac(a * b, 2)))}\).`,
            R`The area is multiplied by \(k^2 = ${k.mul(k).tex()}\), not by \(k\).`,
          ],
          answer: k.eq(1) ? R`The triangles are congruent: the other leg is still \(${b}\).` : R`The other leg is \(${b2.tex()}\); the area is multiplied by \(${k.mul(k).tex()}\)`,
          visual: k.value >= 1 ? twoTriangles(big, small, `Two similar right triangles drawn to scale, with legs ${a} and ${b}, and ${a2} and ${b2.text()}.`) : twoTriangles(small, big, `Two similar right triangles drawn to scale, with legs ${a} and ${b}, and ${a2} and ${b2.text()}.`),
        };
      },
    },
    {
      id: 'shadow-height',
      title: 'Word problem: measuring with shadows',
      word: true,
      intro: 'Change the measurements. All lengths are in metres.',
      inputs: [
        { name: 'h', label: 'Height of the person (m)', type: 'number', min: 1, max: 2, step: 0.1, value: 1.5 },
        { name: 's', label: 'Shadow of the person (m)', type: 'number', min: 0.5, max: 6, step: 0.5, value: 2 },
        { name: 'S', label: 'Shadow of the tree (m)', type: 'number', min: 1, max: 40, step: 0.5, value: 12 },
      ],
      compute({ h, s, S }) {
        const H = (h * S) / s;
        if (H > 60) return { error: 'These shadows would make the tree more than 60 m tall. Try a shorter tree shadow or a longer shadow for the person.' };
        const m = (v) => T(v);
        const tree = { pts: [[0, 0], [S, 0], [0, r3(H)]], sides: [m(S), '', 'x'], right: [0] };
        const kid = { pts: [[0, 0], [s, 0], [0, h]], sides: [m(s), '', m(h)], right: [0] };
        const alt = `Two right triangles drawn to scale, with lengths in metres: Kai with height ${T(h)} m and shadow ${T(s)} m, and the tree with height x and shadow ${T(S)} m.`;
        return {
          problem: R`Kai is \(${num(h)}\) m tall and casts a shadow \(${num(s)}\) m long. At the same time a tree casts a shadow \(${num(S)}\) m long. How tall is the tree?`,
          steps: [
            'Both stand upright and the sunlight arrives at the same angle, so the two right triangles are similar by AA.',
            R`Height over shadow is the same for both: \(\dfrac{x}{${num(S)}} = \dfrac{${num(h)}}{${num(s)}}\).`,
            R`\(x = \dfrac{${num(h)} \cdot ${num(S)}}{${num(s)}} = ${num(H, { places: 2 })}\).`,
          ],
          answer: R`The tree is ${Number.isInteger(r3(H * 100)) ? '' : 'about '}\(${num(H, { places: 2 })}\) m tall.`,
          visual: twoTriangles(kid, tree, alt),
        };
      },
    },
  ],

  quiz: {
    easy: [easyScaleFactor, easyMissingSide, easyAngles],
    medium: [mediumProportion, mediumCriterion, mediumShadow],
    hard: [hardSideSplitter, hardAreaVolume, hardMirror],
    challenge: [challengeSplitAlgebra, challengeBackwards, challengeAltitude],
  },
};
