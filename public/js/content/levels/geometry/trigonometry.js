import { R, q, num, round, frac, linear, person } from '../../lib/index.js';
import { deg, degM, degT, T, rad, toDeg, arcMark, TRIPLES } from './_shared.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
const sin = (d) => Math.sin(rad(d));
const cos = (d) => Math.cos(rad(d));
const tan = (d) => Math.tan(rad(d));
const one = (v) => num(v, { places: 1 });
// Right triangle ACB: the angle of interest at A (bottom left), the right angle at C (bottom right), B above C.
// Sides are labelled [adjacent AC, opposite CB, hypotenuse AB].
const fig = (adj, opp, sides, angle, alt, more = {}) => ({ type: 'polygon', points: [[0, 0], [r3(adj), 0], [r3(adj), r3(opp)]], right: [1], sides, angles: [angle, '', ''], alt, ...more });
// Keep only wrong values that differ clearly from the right one and from each other.
function apart(correct, list, gap) {
  const seen = [correct];
  return list.filter((w) => w && Number.isFinite(w.value) && w.value > 0 && seen.every((s) => Math.abs(s - w.value) >= gap) && seen.push(w.value));
}
const FN = { sin: ['opposite', 'hypotenuse'], cos: ['adjacent', 'hypotenuse'], tan: ['opposite', 'adjacent'] };
const TX = { sin: R`\sin`, cos: R`\cos`, tan: R`\tan` }; // LaTeX names, for use as ${TX[f]} inside R`…`
const SN = { opposite: 'opposite side', adjacent: 'adjacent side', hypotenuse: 'hypotenuse' };

// ───────────── Easy ─────────────

function easyRatio(rng) {
  const [p, r, c] = rng.pick(TRIPLES.filter((t) => t[2] <= 41));
  const [a, b] = rng.bool() ? [p, r] : [r, p]; // AC = a (bottom), CB = b (upright)
  const atA = rng.bool();
  const f = rng.pick(['sin', 'cos', 'tan']);
  const side = atA ? { opposite: b, adjacent: a, hypotenuse: c } : { opposite: a, adjacent: b, hypotenuse: c };
  const value = (fn, s = side) => frac(s[FN[fn][0]], s[FN[fn][1]]);
  const other = atA ? { opposite: a, adjacent: b, hypotenuse: c } : { opposite: b, adjacent: a, hypotenuse: c };
  const V = atA ? 'A' : 'B';
  return q({
    prompt: R`In right \(\triangle ABC\), the right angle is at \(C\), with \(AC = ${a}\), \(BC = ${b}\) and \(AB = ${c}\). What is \(${TX[f]} ${V}\)?`,
    visual: { type: 'polygon', points: [[0, 0], [a, 0], [a, b]], right: [1], vertices: ['A', 'C', 'B'], sides: [`${a}`, `${b}`, `${c}`], alt: `Right triangle ABC with the right angle at C. AC = ${a} along the bottom, BC = ${b} upright, and hypotenuse AB = ${c}.` },
    correct: value(f),
    wrong: [
      { value: value(f, other), why: R`That is \(${TX[f]}\) of the other acute angle. "Opposite" and "adjacent" are named from \(\angle ${V}\).` },
      ...['sin', 'cos', 'tan'].filter((g) => g !== f).map((g) => ({ value: value(g), why: R`That is \(${TX[g]} ${V}\) (${FN[g][0]} over ${FN[g][1]}). \(${TX[f]}\) is ${FN[f][0]} over ${FN[f][1]}.` })),
      value(f).inv(),
    ],
    solution: [
      R`From \(\angle ${V}\), the opposite side is \(${side.opposite}\), the adjacent side is \(${side.adjacent}\) and the hypotenuse is \(${side.hypotenuse}\).`,
      R`\(${TX[f]} ${V} = \dfrac{\text{${FN[f][0]}}}{\text{${FN[f][1]}}} = \dfrac{${side[FN[f][0]]}}{${side[FN[f][1]]}}${value(f).tex() === R`\frac{${side[FN[f][0]]}}{${side[FN[f][1]]}}` ? '' : ` = ${value(f).tex()}`}\).`,
    ],
    rule: 0,
    skill: 'trigonometric ratios',
    check: () => {
      const angle = atA ? Math.atan2(b, a) : Math.atan2(a, b);
      return Math.abs(Math[f](angle) - value(f).value) < 1e-9 ? true : 'ratio does not match the angle';
    },
  });
}

function easySetUp(rng) {
  const t = rng.intExcept(20, 70, [45]); // at 45° the sine and cosine equations would both be right
  const L = rng.int(5, 30);
  const [known, find] = rng.pick([['hypotenuse', 'opposite'], ['hypotenuse', 'adjacent'], ['adjacent', 'opposite'], ['opposite', 'adjacent'], ['opposite', 'hypotenuse'], ['adjacent', 'hypotenuse']]);
  const f = Object.keys(FN).find((k) => FN[k].includes(known) && FN[k].includes(find));
  const xOnTop = FN[f][0] === find;
  const eq = (fn, top) => R`\(${TX[fn]} ${deg(t)} = ${top ? R`\dfrac{x}{${L}}` : R`\dfrac{${L}}{x}`}\)`;
  const others = Object.keys(FN).filter((k) => k !== f);
  const label = (s) => (s === known ? `${L}` : s === find ? 'x' : '');
  return q({
    prompt: R`In a right triangle, one acute angle measures \(${deg(t)}\). The side ${known === 'hypotenuse' ? 'that is the hypotenuse' : `${known === 'opposite' ? 'opposite' : 'adjacent to'} that angle`} is \(${L}\) units long, and \(x\) is the length of the ${find === 'hypotenuse' ? 'hypotenuse' : `side ${find === 'opposite' ? 'opposite' : 'adjacent to'} the angle`}. Which equation can be used to find \(x\)?`,
    visual: fig(10 * cos(t), 10 * sin(t), [label('adjacent'), label('opposite'), label('hypotenuse')], degT(t), `A right triangle with an acute angle of ${t} degrees. The ${known} ${known === 'hypotenuse' ? '' : 'side '}is ${L} and the ${find} ${find === 'hypotenuse' ? '' : 'side '}is marked x.`),
    correct: eq(f, xOnTop),
    wrong: [
      { value: eq(f, !xOnTop), why: R`The ratio is upside down. \(${TX[f]}\) is ${FN[f][0]} over ${FN[f][1]}.` },
      { value: eq(others[0], xOnTop), why: R`\(${TX[others[0]]}\) uses the ${SN[FN[others[0]][0]]} and the ${SN[FN[others[0]][1]]}. This problem involves the ${SN[known]} and the ${SN[find]}.` },
      eq(others[1], xOnTop),
      eq(others[0], !xOnTop),
    ],
    solution: [
      `Name the two sides in the problem from the given angle: the known side is the ${SN[known]} and the unknown side is the ${SN[find]}.`,
      R`The ratio that uses the ${SN[FN[f][0]]} and the ${SN[FN[f][1]]} is \(${TX[f]}\): \(${TX[f]} \theta = \dfrac{\text{${FN[f][0]}}}{\text{${FN[f][1]}}}\).`,
      R`So ${eq(f, xOnTop)}.`,
    ],
    rule: 0,
    skill: 'choosing a ratio',
  });
}

const EXACT = { sin: { 30: R`\dfrac{1}{2}`, 45: R`\dfrac{\sqrt{2}}{2}`, 60: R`\dfrac{\sqrt{3}}{2}` }, cos: { 30: R`\dfrac{\sqrt{3}}{2}`, 45: R`\dfrac{\sqrt{2}}{2}`, 60: R`\dfrac{1}{2}` }, tan: { 30: R`\dfrac{\sqrt{3}}{3}`, 45: '1', 60: R`\sqrt{3}` } };

function easyExact(rng) {
  const f = rng.pick(['sin', 'cos', 'tan']);
  const t = rng.pick([30, 45, 60]);
  const right = EXACT[f][t];
  const pool = [R`\dfrac{1}{2}`, R`\dfrac{\sqrt{2}}{2}`, R`\dfrac{\sqrt{3}}{2}`, R`\dfrac{\sqrt{3}}{3}`, '1', R`\sqrt{3}`, R`\sqrt{2}`, '2'];
  const swap = f === 'tan' ? EXACT.tan[90 - t] : EXACT[f === 'sin' ? 'cos' : 'sin'][t];
  const frame = rng.pick([R`What is the exact value of \(${TX[f]} ${deg(t)}\)?`, R`Without a calculator, find \(${TX[f]} ${deg(t)}\).`, R`Which is the exact value of \(${TX[f]} ${deg(t)}\)?`]);
  const tri = t === 45 ? R`a \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangle with legs \(1\) and hypotenuse \(\sqrt{2}\)` : R`a \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle with shorter leg \(1\), longer leg \(\sqrt{3}\) and hypotenuse \(2\)`;
  const parts = t === 45 ? { opposite: '1', adjacent: '1', hypotenuse: R`\sqrt{2}` } : t === 30 ? { opposite: '1', adjacent: R`\sqrt{3}`, hypotenuse: '2' } : { opposite: R`\sqrt{3}`, adjacent: '1', hypotenuse: '2' };
  return q({
    prompt: frame,
    correct: R`\(${right}\)`,
    wrong: [swap !== right ? { value: R`\(${swap}\)`, why: f === 'tan' ? R`That is \(\tan ${deg(90 - t)}\). Check which leg is opposite the \(${deg(t)}\) angle.` : R`That is \(${TX[f === 'sin' ? 'cos' : 'sin']} ${deg(t)}\).` } : null, ...rng.shuffle(pool.filter((v) => v !== right && v !== swap)).map((v) => R`\(${v}\)`)],
    solution: [
      R`Use ${tri}.`,
      R`From the \(${deg(t)}\) angle: opposite \(= ${parts.opposite}\), adjacent \(= ${parts.adjacent}\), hypotenuse \(= ${parts.hypotenuse}\).`,
      R`\(${TX[f]} ${deg(t)} = \dfrac{\text{${FN[f][0]}}}{\text{${FN[f][1]}}} = ${right}\)${(t === 45 && f !== 'tan') || (t === 30 && f === 'tan') ? ' after rationalising the denominator' : ''}.`,
    ],
    rule: 4,
    skill: 'exact values',
    check: () => {
      const v = { [R`\dfrac{1}{2}`]: 0.5, [R`\dfrac{\sqrt{2}}{2}`]: Math.SQRT2 / 2, [R`\dfrac{\sqrt{3}}{2}`]: Math.sqrt(3) / 2, [R`\dfrac{\sqrt{3}}{3}`]: Math.sqrt(3) / 3, 1: 1, [R`\sqrt{3}`]: Math.sqrt(3) }[right];
      return Math.abs(v - Math[f](rad(t))) < 1e-9 ? true : 'exact value is wrong';
    },
  });
}

// ───────────── Medium ─────────────

function mediumFindSide(rng) {
  for (;;) {
    const t = rng.int(20, 70);
    const L = rng.int(5, 30);
    const [known, find] = rng.pick([['hypotenuse', 'opposite'], ['hypotenuse', 'adjacent'], ['adjacent', 'opposite'], ['opposite', 'adjacent'], ['opposite', 'hypotenuse'], ['adjacent', 'hypotenuse']]);
    const f = Object.keys(FN).find((k) => FN[k].includes(known) && FN[k].includes(find));
    const multiply = FN[f][0] === find;
    const fv = { sin: sin(t), cos: cos(t), tan: tan(t) };
    const exact = multiply ? L * fv[f] : L / fv[f];
    const ans = round(exact, 1);
    const g = f === 'tan' ? 'sin' : f === 'sin' ? 'cos' : 'sin';
    const wrong = apart(ans, [
      { value: round(multiply ? L / fv[f] : L * fv[f], 1), why: multiply ? R`\(x\) is on top of the ratio, so multiply \(${L}\) by \(${TX[f]} ${deg(t)}\).` : R`\(x\) is on the bottom of the ratio, so divide \(${L}\) by \(${TX[f]} ${deg(t)}\).` },
      { value: round(multiply ? L * fv[g] : L / fv[g], 1), why: R`\(${TX[g]}\) does not link these two sides. From the \(${deg(t)}\) angle they are the ${SN[known]} and the ${SN[find]}, so use \(${TX[f]}\).` },
      { value: round(exact * 1.5, 1) },
      { value: round(exact / 2, 1) },
      { value: round(exact + L / 3, 1) },
    ], Math.max(0.8, 0.04 * exact));
    if (wrong.length < 3 || Number.isInteger(ans)) continue;
    const label = (s) => (s === known ? `${L}` : s === find ? 'x' : '');
    const scale = known === 'hypotenuse' ? L : known === 'adjacent' ? L / cos(t) : L / sin(t);
    return q({
      prompt: R`In the right triangle shown, one acute angle is \(${deg(t)}\) and the ${known === 'hypotenuse' ? 'hypotenuse' : `side ${known === 'opposite' ? 'opposite' : 'adjacent to'} it`} is \(${L}\) cm. Find \(x\), the length of the ${find === 'hypotenuse' ? 'hypotenuse' : `side ${find === 'opposite' ? 'opposite' : 'adjacent to'} the angle`}, to the nearest tenth of a centimetre.`,
      visual: fig(scale * cos(t), scale * sin(t), [label('adjacent'), label('opposite'), label('hypotenuse')], degT(t), `A right triangle with an acute angle of ${t} degrees. The ${known} ${known === 'hypotenuse' ? '' : 'side '}is ${L} cm and the ${find} ${find === 'hypotenuse' ? '' : 'side '}is marked x.`),
      correct: ans,
      unit: 'cm',
      wrong,
      solution: [
        R`From the \(${deg(t)}\) angle, the known side is the ${SN[known]} and \(x\) is the ${SN[find]}. The ratio with those two sides is \(${TX[f]}\).`,
        multiply ? R`\(${TX[f]} ${deg(t)} = \dfrac{x}{${L}}\), so \(x = ${L} \cdot ${TX[f]} ${deg(t)}\).` : R`\(${TX[f]} ${deg(t)} = \dfrac{${L}}{x}\), so \(x = \dfrac{${L}}{${TX[f]} ${deg(t)}}\).`,
        R`\(${TX[f]} ${deg(t)} \approx ${num(fv[f], { places: 4 })}\), so \(x \approx ${one(exact)}\) cm.`,
      ],
      rule: 1,
      skill: 'finding a side',
      check: () => {
        const side = { hypotenuse: scale, adjacent: scale * cos(t), opposite: scale * sin(t) };
        return Math.abs(side[known] - L) < 1e-9 && Math.abs(side[find] - ans) <= 0.05 + 1e-9 ? true : 'side does not match the triangle';
      },
    });
  }
}

function mediumCofunction(rng) {
  const a = rng.intExcept(5, 85, [45]); // at 45° sine and cosine are equal, so the wrong choices would be right
  const f = rng.pick(['sin', 'cos']);
  const g = f === 'sin' ? 'cos' : 'sin';
  if (rng.bool()) {
    return q({
      prompt: R`\(${TX[f]} ${deg(a)} = ${TX[g]}\, x^\circ\), where \(x\) is between \(0\) and \(90\). What is \(x\)?`,
      correct: 90 - a,
      wrong: [
        { value: a, why: R`\(\sin\) and \(\cos\) of the same angle are equal only at \(45^\circ\). The two angles must be complementary.` },
        { value: 180 - a, why: R`The acute angles of a right triangle add to \(90^\circ\), so use the complement, not the supplement.` },
        a < 45 ? 45 - a : a - 45,
        90 - a + 10,
        2 * a,
      ],
      solution: [
        R`In a right triangle, the side opposite one acute angle is adjacent to the other. So the sine of an acute angle equals the cosine of its complement.`,
        R`\(x = 90 - ${a} = ${90 - a}\). Check: \(${TX[f]} ${deg(a)} \approx ${num(Math[f](rad(a)), { places: 4 })}\) and \(${TX[g]} ${deg(90 - a)} \approx ${num(Math[g](rad(90 - a)), { places: 4 })}\).`,
      ],
      rule: 3,
      skill: 'sine and cosine of complements',
      check: () => (Math.abs(Math[f](rad(a)) - Math[g](rad(90 - a))) < 1e-12 ? true : 'values are not equal'),
    });
  }
  const show = (fn, d) => R`\(${TX[fn]} ${deg(d)}\)`;
  return q({
    prompt: R`Which expression has the same value as ${show(f, a)}?`,
    correct: show(g, 90 - a),
    wrong: [
      a !== 45 ? { value: show(g, a), why: R`\(\sin\) and \(\cos\) of the same angle are different unless the angle is \(45^\circ\). Use the complementary angle.` } : null,
      a !== 45 ? { value: show(f, 90 - a), why: R`The function must change as well as the angle: sine of an angle equals cosine of its complement.` } : null,
      show('tan', 90 - a),
      show(g, 180 - a),
      show('tan', a),
    ],
    solution: [
      R`The two acute angles of a right triangle are complementary, and the side opposite one is adjacent to the other.`,
      R`So \(\sin \theta = \cos(90^\circ - \theta)\) and \(\cos \theta = \sin(90^\circ - \theta)\).`,
      R`${show(f, a)} \(=\) ${show(g, 90 - a)}.`,
    ],
    rule: 3,
    skill: 'sine and cosine of complements',
    check: () => (Math.abs(Math[f](rad(a)) - Math[g](rad(90 - a))) < 1e-12 ? true : 'values are not equal'),
  });
}

function mediumElevation(rng) {
  for (;;) {
    const t = rng.int(15, 65);
    const d = rng.int(8, 60);
    const name = person(rng);
    const s = rng.pick([
      { text: R`${name} stands \(${d}\) m from the base of a tree and measures the angle of elevation to its top as \(${deg(t)}\), from ground level. How tall is the tree, to the nearest tenth of a metre?`, f: 'tan', known: 'adjacent', find: 'opposite', labels: [`${d}`, 'x', ''], what: 'The ground distance is adjacent to the angle and the height is opposite it.' },
      { text: R`A kite flies at the end of \(${d}\) m of string, pulled tight. The string makes an angle of \(${deg(t)}\) with the ground. How high is the kite above the ground, to the nearest tenth of a metre?`, f: 'sin', known: 'hypotenuse', find: 'opposite', labels: ['', 'x', `${d}`], what: 'The string is the hypotenuse and the height is opposite the angle.' },
      { text: R`A ramp \(${d}\) m long makes an angle of \(${deg(t)}\) with level ground. How far does the ramp reach along the ground, to the nearest tenth of a metre?`, f: 'cos', known: 'hypotenuse', find: 'adjacent', labels: ['x', '', `${d}`], what: 'The ramp is the hypotenuse and the ground distance is adjacent to the angle.' },
    ]);
    const v = { sin: sin(t), cos: cos(t), tan: tan(t) };
    const exact = d * v[s.f];
    const ans = round(exact, 1);
    const g = s.f === 'tan' ? 'sin' : s.f === 'sin' ? 'cos' : 'sin';
    const wrong = apart(ans, [
      { value: round(d / v[s.f], 1), why: R`The unknown is on top of the ratio, so multiply \(${d}\) by \(${TX[s.f]} ${deg(t)}\) instead of dividing.` },
      { value: round(d * v[g], 1), why: R`${s.what} That calls for \(${TX[s.f]}\), not \(${TX[g]}\).` },
      { value: round(exact / 2, 1) },
      { value: round(exact * 1.5, 1) },
      { value: round(exact + d / 4, 1) },
    ], Math.max(0.8, 0.04 * exact));
    if (wrong.length < 3 || Number.isInteger(ans)) continue;
    const scale = s.known === 'hypotenuse' ? d : d / cos(t);
    return q({
      prompt: s.text,
      visual: fig(scale * cos(t), scale * sin(t), s.labels, degT(t), `A right triangle with an angle of ${t} degrees at the bottom left, between the ground and the sloping side. The ${s.known === 'hypotenuse' ? 'sloping side' : 'ground distance'} is ${d} m and the ${s.find === 'opposite' ? 'height' : 'ground distance'} is marked x.`),
      correct: ans,
      unit: 'm',
      wrong,
      solution: [`Sketch the right triangle. ${s.what}`, R`\(${TX[s.f]} ${deg(t)} = \dfrac{x}{${d}}\), so \(x = ${d} \cdot ${TX[s.f]} ${deg(t)}\).`, R`\(x \approx ${d} \cdot ${num(v[s.f], { places: 4 })} \approx ${one(exact)}\) m.`],
      rule: 5,
      skill: 'trigonometry word problems',
      check: () => {
        const side = { hypotenuse: scale, adjacent: scale * cos(t), opposite: scale * sin(t) };
        return Math.abs(side[s.known] - d) < 1e-9 && Math.abs(side[s.find] - ans) <= 0.05 + 1e-9 ? true : 'length does not match the triangle';
      },
    });
  }
}

// ───────────── Hard ─────────────

function hardFindAngle(rng) {
  for (;;) {
    const f = rng.pick(['sin', 'cos', 'tan']);
    const lo = rng.int(3, 20);
    const hi = rng.int(lo + 1, 30);
    const [top, bottom] = f === 'tan' && rng.bool() ? [hi, lo] : [lo, hi];
    const inv = { sin: Math.asin, cos: Math.acos, tan: Math.atan }[f];
    const exact = toDeg(inv(top / bottom));
    const ans = Math.round(exact);
    if (ans < 12 || ans > 78 || Math.abs(exact - ans) > 0.4 || Math.abs(ans - 45) < 3) continue;
    const sides = { [FN[f][0]]: top, [FN[f][1]]: bottom };
    const full = { opposite: top, adjacent: bottom, hypotenuse: bottom };
    if (f === 'sin') full.adjacent = Math.sqrt(bottom * bottom - top * top);
    if (f === 'cos') [full.adjacent, full.opposite] = [top, Math.sqrt(bottom * bottom - top * top)];
    const g = f === 'tan' ? 'sin' : 'tan';
    const gInv = g === 'sin' ? (top < bottom ? toDeg(Math.asin(top / bottom)) : null) : toDeg(Math.atan(top / bottom));
    const wrong = apart(ans, [
      { value: 90 - ans, why: R`That is the other acute angle of the triangle. Check which sides are opposite and adjacent to \(\angle A\).` },
      gInv == null ? null : { value: Math.round(gInv), why: R`The two given sides are the ${SN[FN[f][0]]} and the ${SN[FN[f][1]]}, so the ratio is \(${TX[f]} A\). Use \(${TX[f]}^{-1}\).` },
      top < bottom ? { value: Math.round((top / bottom) * 90) } : null,
      { value: ans + 10 },
      { value: ans > 25 ? ans - 10 : ans + 20 },
    ], 3);
    if (wrong.length < 3) continue;
    const label = (s) => (sides[s] != null ? `${sides[s]}` : '');
    return q({
      prompt: R`In right \(\triangle ABC\) with the right angle at \(C\), the side ${FN[f][0] === 'adjacent' ? 'adjacent to' : 'opposite'} \(\angle A\) is \(${top}\) and the ${FN[f][1] === 'hypotenuse' ? 'hypotenuse' : R`side adjacent to \(\angle A\)`} is \(${bottom}\). Find \(m\angle A\) to the nearest degree.`,
      visual: fig(full.adjacent, full.opposite, [label('adjacent'), label('opposite'), label('hypotenuse')], 'A', `Right triangle with the angle A at the bottom left and the right angle at the bottom right. The ${FN[f][0]} ${FN[f][0] === 'hypotenuse' ? '' : 'side '}is ${top} and the ${FN[f][1]} ${FN[f][1] === 'hypotenuse' ? '' : 'side '}is ${bottom}.`),
      correct: ans,
      fmt: degM,
      wrong,
      solution: [
        R`From \(\angle A\), the given sides are the ${SN[FN[f][0]]} (\(${top}\)) and the ${SN[FN[f][1]]} (\(${bottom}\)). The ratio with those sides is \(${TX[f]}\): \(${TX[f]} A = \dfrac{${top}}{${bottom}}\).`,
        R`To get the angle from the ratio, use the inverse function: \(A = ${TX[f]}^{-1}\!\left(\dfrac{${top}}{${bottom}}\right)\).`,
        one(exact) === `${ans}` ? R`\(A \approx ${deg(ans)}\).` : R`\(A \approx ${one(exact)}^\circ\), which rounds to \(${deg(ans)}\).`,
      ],
      rule: 2,
      skill: 'finding an angle',
      check: () => (Math.abs(toDeg(Math.atan2(full.opposite, full.adjacent)) - ans) <= 0.5 ? true : 'angle does not match the triangle'),
    });
  }
}

function hardDepression(rng) {
  for (;;) {
    const t = rng.int(12, 55);
    const h = rng.int(15, 90);
    const [place, target] = rng.pick([['a cliff', 'a boat on the water'], ['a lighthouse', 'a buoy'], ['a control tower', 'a parked plane'], ['a lookout tower', 'a campsite']]);
    const sight = rng.bool(0.3);
    const exact = sight ? h / sin(t) : h / tan(t);
    const ans = round(exact, 1);
    const wrong = apart(ans, [
      { value: round(h * tan(t), 1), why: R`The \(${deg(t)}\) angle is measured down from the horizontal, so in the triangle it sits at the ${target.replace(/^an? /, '')}, opposite the height. Divide the height by \(\tan ${deg(t)}\).` },
      { value: round(sight ? h / tan(t) : h / sin(t), 1), why: sight ? 'That is the distance along the ground. The line of sight is the hypotenuse.' : 'That is the length of the line of sight, the hypotenuse. The distance along the ground is the adjacent side.' },
      { value: round(h / cos(t), 1) },
      { value: round(h * sin(t), 1) },
      { value: round(exact / 2, 1) },
    ], Math.max(1, 0.04 * exact));
    if (wrong.length < 3 || Number.isInteger(ans)) continue;
    const adj = h / tan(t);
    return q({
      prompt: R`From the top of ${place} \(${h}\) m high, the angle of depression to ${target} is \(${deg(t)}\). ${sight ? `How long is the straight line of sight from the top of ${place.replace(/^an? /, 'the ')} to ${target.replace(/^an? /, 'the ')}` : `How far is ${target.replace(/^an? /, 'the ')} from the base of ${place.replace(/^an? /, 'the ')}`}, to the nearest tenth of a metre?`,
      visual: fig(adj, h, [sight ? '' : 'x', `${h}`, sight ? 'x' : ''], '', `A right triangle. The upright side on the right is the ${place.replace(/^an? /, '')}, ${h} m high. The bottom side is the ground, from the ${target.replace(/^an? /, '')} on the left to the base. A dashed horizontal line runs from the top, and the angle between it and the line of sight down to the left is ${t} degrees. The ${sight ? 'line of sight' : 'ground distance'} is marked x.`, {
        extra: [{ from: [r3(adj), h], to: [0, h] }, ...arcMark([r3(adj), h], 180, 180 + t, 0.22 * adj, degT(t))],
      }),
      correct: ans,
      unit: 'm',
      wrong,
      solution: [
        R`An angle of depression is measured down from the horizontal at the top. The horizontal is parallel to the ground, so the angle at the ${target.replace(/^an? /, '')} is also \(${deg(t)}\) (alternate interior angles).`,
        sight ? R`From that angle the height \(${h}\) is opposite and the line of sight is the hypotenuse: \(\sin ${deg(t)} = \dfrac{${h}}{x}\).` : R`From that angle the height \(${h}\) is opposite and the ground distance is adjacent: \(\tan ${deg(t)} = \dfrac{${h}}{x}\).`,
        R`\(x = \dfrac{${h}}{${TX[sight ? 'sin' : 'tan']} ${deg(t)}} \approx ${one(exact)}\) m.`,
      ],
      rule: 5,
      skill: 'trigonometry word problems',
      check: () => {
        const depression = toDeg(Math.atan2(h, sight ? Math.sqrt(ans * ans - h * h) : ans));
        return Math.abs(depression - t) < 0.2 ? true : `the angle of depression would be ${depression}`;
      },
    });
  }
}

function hardOtherRatio(rng) {
  const [p, r, c] = rng.pick(TRIPLES.filter((t) => t[2] <= 41 && [3, 5, 8, 7, 20, 12, 9].includes(t[0]) && frac(t[0], t[1]).d === t[1]));
  const [opp, adj] = rng.bool() ? [p, r] : [r, p];
  const side = { opposite: opp, adjacent: adj, hypotenuse: c };
  const [f, g] = rng.sample(['sin', 'cos', 'tan'], 2);
  const val = (fn) => frac(side[FN[fn][0]], side[FN[fn][1]]);
  const third = ['sin', 'cos', 'tan'].find((k) => k !== f && k !== g);
  const missing = ['opposite', 'adjacent', 'hypotenuse'].find((s) => !FN[f].includes(s));
  return q({
    prompt: R`\(\theta\) is an acute angle of a right triangle and \(${TX[f]} \theta = ${val(f).tex()}\). What is \(${TX[g]} \theta\)?`,
    visual: fig(adj, opp, [FN[f].includes('adjacent') ? `${adj}` : '', FN[f].includes('opposite') ? `${opp}` : '', FN[f].includes('hypotenuse') ? `${c}` : ''], 'θ', `A right triangle with the angle theta at the bottom left. Two of its sides are labelled: ${FN[f].map((s) => `${s} ${side[s]}`).join(' and ')}.`),
    correct: val(g),
    wrong: [
      { value: val(third), why: R`That is \(${TX[third]} \theta\). \(${TX[g]}\) is ${FN[g][0]} over ${FN[g][1]}.` },
      { value: val(g).inv(), why: R`The ratio is upside down. \(${TX[g]}\) is ${FN[g][0]} over ${FN[g][1]}.` },
      val(f).inv(),
      frac(side[FN[g][0]] + 1, side[FN[g][1]]),
      val(third).inv(),
    ],
    solution: [
      R`\(${TX[f]} \theta = \dfrac{\text{${FN[f][0]}}}{\text{${FN[f][1]}}}\), so draw a right triangle with ${FN[f][0]} \(${side[FN[f][0]]}\) and ${FN[f][1]} \(${side[FN[f][1]]}\).`,
      missing === 'hypotenuse' ? R`Find the third side with the Pythagorean theorem: \(\sqrt{${opp}^2 + ${adj}^2} = ${c}\), the hypotenuse.` : R`Find the third side with the Pythagorean theorem: \(\sqrt{${c}^2 - ${side[FN[f][0]]}^2} = ${side[missing]}\), the ${missing} side.`,
      R`\(${TX[g]} \theta = \dfrac{\text{${FN[g][0]}}}{\text{${FN[g][1]}}} = ${val(g).tex()}\).`,
    ],
    rule: 0,
    skill: 'trigonometric ratios',
    check: () => {
      const angle = { sin: Math.asin, cos: Math.acos, tan: Math.atan }[f](val(f).value);
      return Math.abs(Math[g](angle) - val(g).value) < 1e-9 ? true : 'the two ratios do not belong to the same angle';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeCofunctionAlgebra(rng) {
  for (;;) {
    const x = rng.int(3, 15);
    const a = rng.int(1, 5);
    const c = rng.intExcept(1, 5, [a]);
    const A = rng.int(15, 70);
    const b = A - a * x;
    const d = 90 - A - c * x;
    if (Math.abs(b) > 30 || Math.abs(d) > 30 || b === 0 || d === 0) continue;
    const eq = (d - b) % (a - c) === 0 ? (d - b) / (a - c) : null;
    const f = rng.pick(['sin', 'cos']);
    const g = f === 'sin' ? 'cos' : 'sin';
    return q({
      prompt: R`Both angles are acute, and \(${TX[f]}(${linear(a, b)})^\circ = ${TX[g]}(${linear(c, d)})^\circ\). Find \(x\).`,
      correct: x,
      fmt: (v) => R`\(x = ${num(v)}\)`,
      wrong: [
        eq != null && eq > 0 && eq !== x ? { value: eq, why: 'The two angles are not equal. A sine equals a cosine when the angles are complementary, so their sum is 90.' } : null,
        (180 - b - d) % (a + c) === 0 ? { value: (180 - b - d) / (a + c), why: R`Complementary angles add to \(90^\circ\), not \(180^\circ\).` } : null,
        { value: A, why: R`That is the measure of one of the angles. The question asks for \(x\).` },
        x + 2,
        x > 3 ? x - 2 : x + 5,
        x + 4,
      ],
      solution: [
        R`The sine of an acute angle equals the cosine of its complement, so the two angles add to \(90^\circ\): \((${linear(a, b)}) + (${linear(c, d)}) = 90\).`,
        R`Combine like terms: \(${linear(a + c, b + d)} = 90\), so \(${a + c}x = ${90 - b - d}\) and \(x = ${x}\).`,
        R`Check: the angles are \(${deg(A)}\) and \(${deg(90 - A)}\), and \(${TX[f]} ${deg(A)} = ${TX[g]} ${deg(90 - A)} \approx ${num(Math[f](rad(A)), { places: 4 })}\). ✓`,
      ],
      rule: 3,
      skill: 'sine and cosine of complements',
      check: () => (Math.abs(Math[f](rad(a * x + b)) - Math[g](rad(c * x + d))) < 1e-12 && a * x + b > 0 && c * x + d > 0 ? true : 'x does not satisfy the equation'),
    });
  }
}

function challengeFlagpole(rng) {
  for (;;) {
    const d = 5 * rng.int(4, 14);
    const a = rng.int(25, 48);
    const b = a + rng.int(6, 16);
    const exact = d * (tan(b) - tan(a));
    const ans = round(exact, 1);
    const wrong = apart(ans, [
      { value: round(d * tan(b - a), 1), why: R`\(\tan ${deg(b)} - \tan ${deg(a)}\) is not the same as \(\tan ${deg(b - a)}\). Find the two heights separately and subtract.` },
      { value: round(d * tan(b), 1), why: 'That is the height of the top of the flagpole above the ground. Subtract the height of the building.' },
      { value: round(d * tan(a), 1), why: 'That is the height of the building. The flagpole is the extra height above it.' },
      { value: round(d * (sin(b) - sin(a)), 1) },
      { value: round(exact * 2, 1) },
    ], Math.max(1.5, 0.06 * exact));
    if (wrong.length < 3 || Number.isInteger(ans) || ans < 4) continue;
    const top = d * tan(b);
    const roof = d * tan(a);
    return q({
      prompt: R`A flagpole stands on the roof of a building. From a point on the ground \(${d}\) m from the building, the angle of elevation to the bottom of the flagpole is \(${deg(a)}\) and the angle of elevation to its top is \(${deg(b)}\). How tall is the flagpole, to the nearest tenth of a metre?`,
      visual: {
        type: 'polygon',
        points: [[0, 0], [d, 0], [d, r3(top)]],
        right: [1],
        sides: [`${d}`, '', ''],
        extra: [{ from: [0, 0], to: [d, r3(roof)], dashed: false }, ...arcMark([0, 0], 0, a, 0.3 * d, degT(a)), ...arcMark([0, 0], 0, b, 0.45 * d, degT(b))],
        alt: `A right triangle with a horizontal base of ${d} m. The upright side on the right is the building with the flagpole on top. From the left end of the base, one line of sight rises at ${a} degrees to the top of the building, and a steeper one rises at ${b} degrees to the top of the flagpole.`,
      },
      correct: ans,
      unit: 'm',
      wrong,
      solution: [
        R`Both sight lines start from the same point, \(${d}\) m from the building, so there are two right triangles with the same base.`,
        R`Height to the top of the flagpole: \(${d} \tan ${deg(b)} \approx ${num(top, { places: 2 })}\) m. Height of the building: \(${d} \tan ${deg(a)} \approx ${num(roof, { places: 2 })}\) m.`,
        R`The flagpole is the difference: \(${num(top, { places: 2 })} - ${num(roof, { places: 2 })} \approx ${one(exact)}\) m.`,
      ],
      rule: 5,
      skill: 'trigonometry word problems',
      check: () => (Math.abs(toDeg(Math.atan2(roof + ans, d)) - b) < 0.2 && Math.abs(toDeg(Math.atan2(roof, d)) - a) < 1e-9 ? true : 'heights do not give the stated angles'),
    });
  }
}

function challengeIsosceles(rng) {
  for (;;) {
    const L = rng.int(6, 25);
    const t = rng.int(25, 75);
    const askArea = rng.bool(0.4);
    const half = L * cos(t);
    const h = L * sin(t);
    const exact = askArea ? half * h : 2 * half;
    const ans = round(exact, 1);
    const wrong = apart(ans, askArea
      ? [
          { value: round((half * h) / 2, 1), why: R`The whole base is \(2 \cdot ${L}\cos ${deg(t)}\), so the area is \(\frac{1}{2} \cdot \text{base} \cdot \text{height} = (${L}\cos ${deg(t)})(${L}\sin ${deg(t)})\).` },
          { value: round((L * L) / 2, 1), why: R`The two \(${L}\)-cm sides are not perpendicular, so they cannot be used as base and height.` },
          { value: round(2 * half * h, 1) },
          { value: round(L * h, 1) },
          { value: round(exact * 1.5, 1) },
        ]
      : [
          { value: round(half, 1), why: 'That is half of the base, from one of the two right triangles. Double it.' },
          { value: round(2 * h, 1), why: R`The base is adjacent to the \(${deg(t)}\) angle, so use cosine, not sine.` },
          { value: round(2 * L * tan(t), 1) },
          { value: round(h, 1) },
          { value: round(exact * 1.5, 1) },
        ], Math.max(1, (askArea ? 0.06 : 0.04) * exact));
    if (wrong.length < 3 || Number.isInteger(ans)) continue;
    return q({
      prompt: R`An isosceles triangle has two sides of \(${L}\) cm, and each base angle measures \(${deg(t)}\). Find the ${askArea ? 'area of the triangle, to the nearest tenth of a square centimetre' : 'length of the base, to the nearest tenth of a centimetre'}.`,
      visual: { type: 'polygon', points: [[0, 0], [r3(2 * half), 0], [r3(half), r3(h)]], sides: ['', `${L}`, `${L}`], marks: [0, 1, 1], angles: [degT(t), degT(t), ''], extra: [{ from: [r3(half), r3(h)], to: [r3(half), 0] }], alt: `An isosceles triangle with two sides of ${L} cm and base angles of ${t} degrees. A dashed height runs from the top vertex to the middle of the base.` },
      correct: ans,
      unit: askArea ? 'cm²' : 'cm',
      wrong,
      solution: [
        R`Draw the height from the top vertex. It splits the triangle into two congruent right triangles with hypotenuse \(${L}\) and an acute angle of \(${deg(t)}\).`,
        R`Half the base is adjacent to that angle: \(${L} \cos ${deg(t)} \approx ${num(half, { places: 2 })}\) cm.${askArea ? R` The height is opposite it: \(${L} \sin ${deg(t)} \approx ${num(h, { places: 2 })}\) cm.` : ''}`,
        askArea ? R`Area \(= \frac{1}{2} \cdot (2 \cdot ${num(half, { places: 2 })}) \cdot ${num(h, { places: 2 })} \approx ${one(exact)}\) cm².` : R`The whole base is \(2 \cdot ${num(half, { places: 2 })} \approx ${one(exact)}\) cm.`,
      ],
      rule: 1,
      skill: 'multi-step trigonometry',
      check: () => {
        const base = 2 * half;
        const side = Math.hypot(half, h);
        return Math.abs(side - L) < 1e-9 && Math.abs((askArea ? (base * h) / 2 : base) - ans) <= 0.05 + 1e-9 ? true : 'answer does not match the triangle';
      },
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'trigonometry',
  title: 'Right-Triangle Trigonometry',
  summary: 'Use sine, cosine and tangent to find sides and angles of right triangles, including angles of elevation and depression.',
  standards: ['CCSS G-SRT.C.6', 'CCSS G-SRT.C.7', 'CCSS G-SRT.C.8'],

  explain: {
    intro: R`All right triangles with the same acute angle are similar, so the ratios of their sides depend only on that angle. Those ratios have names: **sine**, **cosine** and **tangent**. With them, one side and one acute angle are enough to find every other part of a right triangle.`,
    rules: [
      {
        title: 'The three ratios',
        text: R`Name the sides from the acute angle \(\theta\) you are using: the **opposite** side is across from it, the **adjacent** side touches it (and is not the hypotenuse), and the **hypotenuse** is opposite the right angle. Then \(\sin\theta = \frac{\text{opposite}}{\text{hypotenuse}}\), \(\cos\theta = \frac{\text{adjacent}}{\text{hypotenuse}}\), \(\tan\theta = \frac{\text{opposite}}{\text{adjacent}}\). Many people remember this as SOH-CAH-TOA.`,
        example: R`In a \(3\)-\(4\)-\(5\) triangle, for the angle opposite the side \(3\): \(\sin\theta = \frac{3}{5}\), \(\cos\theta = \frac{4}{5}\), \(\tan\theta = \frac{3}{4}\).`,
      },
      {
        title: 'Finding a side',
        text: R`Pick the ratio that contains the side you know and the side you want. Write the equation, then solve it: multiply if the unknown is on top, divide if it is on the bottom.`,
        example: R`Hypotenuse \(15\), angle \(32^\circ\), opposite side \(x\): \(\sin 32^\circ = \frac{x}{15}\), so \(x = 15\sin 32^\circ \approx 7.9\).`,
      },
      {
        title: 'Finding an angle',
        text: R`If you know two sides, write the ratio and use the inverse function on a calculator (in degree mode): \(\theta = \sin^{-1}(\ldots)\), \(\cos^{-1}(\ldots)\) or \(\tan^{-1}(\ldots)\).`,
        example: R`Opposite \(7\), adjacent \(10\): \(\tan\theta = 0.7\), so \(\theta = \tan^{-1}(0.7) \approx 35^\circ\).`,
      },
      {
        title: 'Sine and cosine of complementary angles',
        text: R`The two acute angles of a right triangle add to \(90^\circ\), and the side opposite one is adjacent to the other. So \(\sin\theta = \cos(90^\circ - \theta)\) and \(\cos\theta = \sin(90^\circ - \theta)\).`,
        example: R`\(\sin 25^\circ = \cos 65^\circ \approx 0.4226\).`,
      },
      {
        title: R`Exact values for \(30^\circ\), \(45^\circ\) and \(60^\circ\)`,
        text: R`These come from the two special right triangles. \(\sin 30^\circ = \frac{1}{2}\), \(\cos 30^\circ = \frac{\sqrt{3}}{2}\), \(\tan 30^\circ = \frac{\sqrt{3}}{3}\). \(\sin 45^\circ = \cos 45^\circ = \frac{\sqrt{2}}{2}\), \(\tan 45^\circ = 1\). \(\sin 60^\circ = \frac{\sqrt{3}}{2}\), \(\cos 60^\circ = \frac{1}{2}\), \(\tan 60^\circ = \sqrt{3}\).`,
        example: R`In a \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle with sides \(1, \sqrt{3}, 2\): \(\sin 60^\circ = \frac{\sqrt{3}}{2}\).`,
      },
      {
        title: 'Angles of elevation and depression',
        text: R`Both are measured from the **horizontal**: an angle of elevation looks up, an angle of depression looks down. Because the horizontal at the top is parallel to the ground, the angle of depression from the top equals the angle of elevation from the bottom.`,
        example: R`From a \(40\) m cliff, a boat is seen at an angle of depression of \(18^\circ\). Its distance from the cliff is \(\frac{40}{\tan 18^\circ} \approx 123.1\) m.`,
      },
    ],
    vocab: [
      { term: 'opposite side', def: 'The side across from the angle you are working with.' },
      { term: 'adjacent side', def: 'The leg that forms the angle you are working with, together with the hypotenuse.' },
      { term: 'inverse trigonometric function', def: R`A function such as \(\sin^{-1}\) that turns a ratio back into an angle.` },
      { term: 'angle of elevation', def: 'The angle between the horizontal and a line of sight to something higher.' },
      { term: 'angle of depression', def: 'The angle between the horizontal and a line of sight to something lower.' },
    ],
    mistakes: [
      'Naming opposite and adjacent from the wrong angle. They swap when you move to the other acute angle.',
      R`Multiplying when the unknown is in the denominator. If \(\cos 40^\circ = \frac{9}{x}\), then \(x = \frac{9}{\cos 40^\circ}\).`,
      'Leaving the calculator in radian mode. Angles in this course are in degrees.',
      'Putting an angle of depression inside the triangle at the top, against the vertical side. It is measured from the horizontal.',
    ],
    visual: fig(5.5, 8, ['adjacent', 'opposite', 'hypotenuse'], 'θ', 'A right triangle with the angle theta at the bottom left. The bottom side, touching the angle, is labelled adjacent. The upright side across from the angle is labelled opposite. The sloping side is labelled hypotenuse.'),
  },

  examples: [
    {
      title: 'Three ratios from one triangle',
      problem: R`In right \(\triangle ABC\) the right angle is at \(C\), with \(AC = 12\), \(BC = 5\) and \(AB = 13\). Find \(\sin A\), \(\cos A\) and \(\tan A\).`,
      steps: [
        R`From \(\angle A\): the opposite side is \(BC = 5\), the adjacent side is \(AC = 12\), and the hypotenuse is \(AB = 13\).`,
        R`\(\sin A = \frac{\text{opposite}}{\text{hypotenuse}} = \frac{5}{13}\).`,
        R`\(\cos A = \frac{\text{adjacent}}{\text{hypotenuse}} = \frac{12}{13}\) and \(\tan A = \frac{\text{opposite}}{\text{adjacent}} = \frac{5}{12}\).`,
      ],
      answer: R`\(\sin A = \frac{5}{13}\), \(\cos A = \frac{12}{13}\), \(\tan A = \frac{5}{12}\)`,
      visual: { type: 'polygon', points: [[0, 0], [12, 0], [12, 5]], right: [1], vertices: ['A', 'C', 'B'], sides: ['12', '5', '13'], alt: 'Right triangle ABC with the right angle at C. AC = 12 along the bottom, BC = 5 upright, and hypotenuse AB = 13.' },
    },
    {
      title: 'Find a side',
      problem: R`A right triangle has a hypotenuse of \(15\) cm and an acute angle of \(32^\circ\). Find the side opposite the \(32^\circ\) angle, to the nearest tenth.`,
      steps: [
        R`The known side is the hypotenuse and the unknown side \(x\) is opposite the angle. The ratio with opposite and hypotenuse is sine.`,
        R`\(\sin 32^\circ = \frac{x}{15}\), so \(x = 15 \sin 32^\circ\).`,
        R`\(\sin 32^\circ \approx 0.5299\), so \(x \approx 7.9\) cm.`,
      ],
      answer: R`\(x \approx 7.9\) cm`,
      visual: fig(15 * cos(32), 15 * sin(32), ['', 'x', '15'], '32°', 'A right triangle with an acute angle of 32 degrees. The hypotenuse is 15 cm and the side opposite the angle is marked x.'),
    },
    {
      title: 'Find an angle',
      problem: R`In a right triangle, the side opposite \(\angle A\) is \(7\) and the side adjacent to \(\angle A\) is \(10\). Find \(m\angle A\) to the nearest degree.`,
      steps: [
        R`Opposite and adjacent are the sides in the tangent ratio: \(\tan A = \frac{7}{10} = 0.7\).`,
        R`Use the inverse tangent to turn the ratio into an angle: \(A = \tan^{-1}(0.7)\).`,
        R`\(A \approx 34.99^\circ\), which rounds to \(35^\circ\).`,
      ],
      answer: R`\(m\angle A \approx 35^\circ\)`,
      visual: fig(10, 7, ['10', '7', ''], 'A', 'A right triangle with the angle A at the bottom left. The side adjacent to A is 10 and the side opposite A is 7.'),
    },
    {
      title: 'Word problem: a boat seen from a cliff',
      word: true,
      problem: R`From the top of a cliff \(40\) m high, the angle of depression to a boat is \(18^\circ\). How far is the boat from the base of the cliff, to the nearest tenth of a metre?`,
      steps: [
        R`The angle of depression is measured down from the horizontal at the top of the cliff. That horizontal is parallel to the water, so the angle at the boat is also \(18^\circ\).`,
        R`From the boat's angle, the cliff (\(40\) m) is opposite and the distance \(x\) is adjacent: \(\tan 18^\circ = \frac{40}{x}\).`,
        R`\(x = \frac{40}{\tan 18^\circ} \approx \frac{40}{0.3249} \approx 123.1\) m.`,
      ],
      answer: 'About 123.1 m',
      visual: fig(40 / tan(18), 40, ['x', '40', ''], '18°', 'A right triangle. The upright side on the right is the cliff, 40 m high. The bottom side is the water, from the boat on the left to the base of the cliff, marked x. A dashed horizontal line runs from the top of the cliff, and the angle between it and the line of sight down to the boat is 18 degrees. The angle at the boat is also 18 degrees.', { extra: [{ from: [r3(40 / tan(18)), 40], to: [0, 40] }, ...arcMark([r3(40 / tan(18)), 40], 180, 198, 27, '18°')] }),
    },
  ],

  models: [
    {
      id: 'solve-triangle',
      title: 'Solve a right triangle',
      intro: 'Give one acute angle and one side. The other two sides and the other angle follow.',
      inputs: [
        { name: 't', label: 'Acute angle (degrees)', type: 'int', min: 1, max: 89, value: 35 },
        { name: 'known', label: 'The side you know is', type: 'select', value: 'hypotenuse', options: [{ value: 'hypotenuse', label: 'the hypotenuse' }, { value: 'opposite', label: 'opposite the angle' }, { value: 'adjacent', label: 'adjacent to the angle' }] },
        { name: 'L', label: 'Its length', type: 'number', min: 1, max: 100, step: 0.5, value: 12 },
      ],
      compute({ t, known, L }) {
        const hyp = known === 'hypotenuse' ? L : known === 'opposite' ? L / sin(t) : L / cos(t);
        const side = { hypotenuse: hyp, opposite: hyp * sin(t), adjacent: hyp * cos(t) };
        const two = (v) => num(v, { places: 2 });
        const steps = {
          hypotenuse: [R`Opposite side: \(\sin ${deg(t)} = \dfrac{x}{${num(L)}}\), so \(x = ${num(L)} \sin ${deg(t)} \approx ${two(side.opposite)}\).`, R`Adjacent side: \(\cos ${deg(t)} = \dfrac{y}{${num(L)}}\), so \(y = ${num(L)} \cos ${deg(t)} \approx ${two(side.adjacent)}\).`],
          opposite: [R`Hypotenuse: \(\sin ${deg(t)} = \dfrac{${num(L)}}{h}\), so \(h = \dfrac{${num(L)}}{\sin ${deg(t)}} \approx ${two(side.hypotenuse)}\).`, R`Adjacent side: \(\tan ${deg(t)} = \dfrac{${num(L)}}{y}\), so \(y = \dfrac{${num(L)}}{\tan ${deg(t)}} \approx ${two(side.adjacent)}\).`],
          adjacent: [R`Hypotenuse: \(\cos ${deg(t)} = \dfrac{${num(L)}}{h}\), so \(h = \dfrac{${num(L)}}{\cos ${deg(t)}} \approx ${two(side.hypotenuse)}\).`, R`Opposite side: \(\tan ${deg(t)} = \dfrac{x}{${num(L)}}\), so \(x = ${num(L)} \tan ${deg(t)} \approx ${two(side.opposite)}\).`],
        }[known];
        const lab = (s) => (s === known ? T(L) : T(side[s], 1)); // short labels: long ones would be clipped beside the upright side
        return {
          problem: R`A right triangle has an acute angle of \(${deg(t)}\). The ${known === 'hypotenuse' ? 'hypotenuse' : `side ${known === 'opposite' ? 'opposite' : 'adjacent to'} that angle`} is \(${num(L)}\). Find the other sides and the other acute angle.`,
          steps: [...steps, R`The acute angles are complementary, so the other one is \(90 - ${t} = ${90 - t}\) degrees.`, R`Check with the Pythagorean theorem: \(${two(side.opposite)}^2 + ${two(side.adjacent)}^2 \approx ${two(side.opposite ** 2 + side.adjacent ** 2)}\) and \(${two(side.hypotenuse)}^2 \approx ${two(side.hypotenuse ** 2)}\).`],
          answer: R`Opposite \(\approx ${two(side.opposite)}\), adjacent \(\approx ${two(side.adjacent)}\), hypotenuse \(\approx ${two(side.hypotenuse)}\); other angle \(${deg(90 - t)}\)`,
          visual: fig(side.adjacent, side.opposite, [lab('adjacent'), lab('opposite'), lab('hypotenuse')], degT(t), `A right triangle with an acute angle of ${t} degrees: adjacent side about ${T(side.adjacent)}, opposite side about ${T(side.opposite)}, hypotenuse about ${T(side.hypotenuse)}.`),
        };
      },
    },
    {
      id: 'elevation',
      title: 'Word problem: how tall is the tower?',
      word: true,
      intro: 'Change the distance, the angle of elevation and the height of the eye above the ground.',
      inputs: [
        { name: 'd', label: 'Distance from the tower (m)', type: 'number', min: 1, max: 200, step: 1, value: 30 },
        { name: 't', label: 'Angle of elevation (degrees)', type: 'int', min: 1, max: 85, value: 40 },
        { name: 'e', label: 'Eye height (m)', type: 'number', min: 0, max: 2, step: 0.1, value: 1.5 },
      ],
      compute({ d, t, e }) {
        const rise = d * tan(t);
        const two = (v) => num(v, { places: 2 });
        return {
          problem: R`Amara stands \(${num(d)}\) m from a tower. From eye level, \(${num(e)}\) m above the ground, the angle of elevation to the top of the tower is \(${deg(t)}\). How tall is the tower?`,
          steps: [
            R`The line of sight, the horizontal at eye level and the tower make a right triangle. The distance \(${num(d)}\) m is adjacent to the \(${deg(t)}\) angle and the rise \(x\) above eye level is opposite it.`,
            R`\(\tan ${deg(t)} = \dfrac{x}{${num(d)}}\), so \(x = ${num(d)} \tan ${deg(t)} \approx ${two(rise)}\) m.`,
            e > 0 ? R`Add the eye height: \(${two(rise)} + ${num(e)} \approx ${two(rise + e)}\) m.` : R`The angle is measured from ground level, so nothing needs to be added.`,
          ],
          answer: R`About \(${two(rise + e)}\) m`,
          visual: fig(d, rise, [T(d), T(rise, 1), ''], degT(t), `A right triangle with a horizontal side of ${T(d)} m at eye level, an angle of elevation of ${t} degrees, and an upright side of about ${T(rise)} m, the part of the tower above eye level.`),
          note: e > 0 ? `The picture shows the triangle above eye level. The tower continues ${T(e)} m below it to the ground.` : undefined,
        };
      },
    },
  ],

  quiz: {
    easy: [easyRatio, easySetUp, easyExact],
    medium: [mediumFindSide, mediumCofunction, mediumElevation],
    hard: [hardFindAngle, hardDepression, hardOtherRatio],
    challenge: [challengeCofunctionAlgebra, challengeFlagpole, challengeIsosceles],
  },
};
