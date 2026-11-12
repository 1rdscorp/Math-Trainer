import { R, q, frac, num, txt, round, polyEval, checkEqual, checkSame } from '../../lib/index.js';
import { M, surd, SPECIAL, TRIG, toRad, toDeg, norm360, refAngle, sinDeg, cosDeg, trigDeg, piTex, radTex, apart } from './_shared.js';

const T = (name) => `\\${name}`;
const QUAD = ['', 'I', 'II', 'III', 'IV'];
const XS = [1, -1, -1, 1];
const YS = [1, 1, -1, -1];
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
const degFmt = (v) => R`\(${num(v)}^{\circ}\)`;
const angles = (list) => R`\(x = ${list.map((d) => radTex(d)).join(R`,\ `)}\)`;
// Angles (degrees, in [0, 360)) at which fn takes one of the given exact values.
const anglesWhere = (fn, values) => SPECIAL.filter((d) => values.some((v) => trigDeg(fn, d)?.eq(v)));
const INV = { sin: R`\sin^{-1}`, cos: R`\cos^{-1}`, tan: R`\tan^{-1}` };
const ATRIG = { sin: Math.asin, cos: Math.acos, tan: Math.atan };

// ───────────── Easy ─────────────

function easyInverseValue(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const d = rng.pick({ sin: [-90, -60, -45, -30, 0, 30, 45, 60, 90], cos: [0, 30, 45, 60, 90, 120, 135, 150, 180], tan: [-60, -45, -30, 0, 30, 45, 60] }[fn]);
  const v = trigDeg(fn, d);
  const range = { sin: R`-\frac{\pi}{2} \le \theta \le \frac{\pi}{2}`, cos: R`0 \le \theta \le \pi`, tan: R`-\frac{\pi}{2} < \theta < \frac{\pi}{2}` }[fn];
  const outside = fn === 'sin' ? [norm360(180 - d), norm360(d)] : fn === 'cos' ? [360 - d, -d] : [d + 180, d - 180];
  const comp = fn === 'cos' ? Math.abs(90 - d) : Math.sign(d) * (90 - Math.abs(d));
  return q({
    prompt: R`Find the exact value of \(${INV[fn]}\left(${v.tex()}\right)\), in radians.`,
    correct: M(radTex(d)),
    wrong: [
      ...outside.filter((o) => o !== d).map((o) => ({ value: M(radTex(o)), why: R`\(${T(fn)}\) of that angle is \(${v.tex()}\), but \(${INV[fn]}\) only returns angles with \(${range}\).` })),
      d !== 0 && Math.abs(d) !== 45 && d !== 135 ? { value: M(radTex(fn === 'cos' && d > 90 ? 180 - comp : comp)), why: R`Check the table of special values: \(${T(fn)}\) of that angle is not \(${v.tex()}\).` } : null,
      M(radTex(-d || 90)),
      M(radTex(d + 90)),
      M(radTex(d + 180)),
      M(radTex(d - 90)),
    ],
    solution: [
      R`\(${INV[fn]}(x)\) is the angle \(\theta\) with \(${T(fn)}\theta = x\) and \(${range}\).`,
      R`\(${T(fn)}\left(${radTex(d)}\right) = ${v.tex()}\), and \(${radTex(d)}\) lies in that range.`,
      R`So \(${INV[fn]}\left(${v.tex()}\right) = ${radTex(d)}\).`,
    ],
    rule: 0,
    skill: 'inverse trig values',
    check: () => checkEqual(ATRIG[fn](v.value), toRad(d)),
  });
}

const s2 = (x) => Math.sin(x) ** 2;
const c2 = (x) => Math.cos(x) ** 2;
const FORMS = {
  sin: [R`\sin\theta`, Math.sin], cos: [R`\cos\theta`, Math.cos], tan: [R`\tan\theta`, Math.tan], cot: [R`\cot\theta`, TRIG.cot], sec: [R`\sec\theta`, TRIG.sec], csc: [R`\csc\theta`, TRIG.csc],
  one: ['1', () => 1], sin2: [R`\sin^{2}\theta`, s2], cos2: [R`\cos^{2}\theta`, c2], tan2: [R`\tan^{2}\theta`, (x) => Math.tan(x) ** 2], sec2: [R`\sec^{2}\theta`, (x) => 1 / c2(x)], csc2: [R`\csc^{2}\theta`, (x) => 1 / s2(x)], cot2: [R`\cot^{2}\theta`, (x) => c2(x) / s2(x)],
};
// [expression, its value, answer, plausible wrong answers, why]
const SIMPLIFY = [
  [R`1 - \sin^{2}\theta`, (x) => 1 - s2(x), 'cos2', ['sin2', 'cos', 'one'], R`From \(\sin^{2}\theta + \cos^{2}\theta = 1\), subtract \(\sin^{2}\theta\) from both sides.`],
  [R`1 - \cos^{2}\theta`, (x) => 1 - c2(x), 'sin2', ['cos2', 'sin', 'one'], R`From \(\sin^{2}\theta + \cos^{2}\theta = 1\), subtract \(\cos^{2}\theta\) from both sides.`],
  [R`\sec^{2}\theta - 1`, (x) => 1 / c2(x) - 1, 'tan2', ['cot2', 'cos2', 'tan'], R`From \(1 + \tan^{2}\theta = \sec^{2}\theta\), subtract 1 from both sides.`],
  [R`\csc^{2}\theta - 1`, (x) => 1 / s2(x) - 1, 'cot2', ['tan2', 'sin2', 'cot'], R`From \(1 + \cot^{2}\theta = \csc^{2}\theta\), subtract 1 from both sides.`],
  [R`\sec^{2}\theta - \tan^{2}\theta`, (x) => 1 / c2(x) - Math.tan(x) ** 2, 'one', ['cos2', 'sec2', 'tan2'], R`Rearrange \(1 + \tan^{2}\theta = \sec^{2}\theta\).`],
  [R`\csc^{2}\theta - \cot^{2}\theta`, (x) => 1 / s2(x) - c2(x) / s2(x), 'one', ['sin2', 'csc2', 'cot2'], R`Rearrange \(1 + \cot^{2}\theta = \csc^{2}\theta\).`],
  [R`\tan\theta\cos\theta`, (x) => Math.tan(x) * Math.cos(x), 'sin', ['cos', 'one', 'sec'], R`Write \(\tan\theta = \dfrac{\sin\theta}{\cos\theta}\); the cosines cancel.`],
  [R`\cot\theta\sin\theta`, (x) => TRIG.cot(x) * Math.sin(x), 'cos', ['sin', 'one', 'csc'], R`Write \(\cot\theta = \dfrac{\cos\theta}{\sin\theta}\); the sines cancel.`],
  [R`\sin\theta\sec\theta`, (x) => Math.sin(x) / Math.cos(x), 'tan', ['cot', 'one', 'sin'], R`Write \(\sec\theta = \dfrac{1}{\cos\theta}\), giving \(\dfrac{\sin\theta}{\cos\theta}\).`],
  [R`\cos\theta\csc\theta`, (x) => Math.cos(x) / Math.sin(x), 'cot', ['tan', 'one', 'cos'], R`Write \(\csc\theta = \dfrac{1}{\sin\theta}\), giving \(\dfrac{\cos\theta}{\sin\theta}\).`],
  [R`\dfrac{1 - \cos^{2}\theta}{\sin\theta}`, (x) => (1 - c2(x)) / Math.sin(x), 'sin', ['cos', 'sin2', 'csc'], R`The numerator is \(\sin^{2}\theta\), and \(\dfrac{\sin^{2}\theta}{\sin\theta} = \sin\theta\).`],
  [R`\dfrac{1 - \sin^{2}\theta}{\cos\theta}`, (x) => (1 - s2(x)) / Math.cos(x), 'cos', ['sin', 'cos2', 'sec'], R`The numerator is \(\cos^{2}\theta\), and \(\dfrac{\cos^{2}\theta}{\cos\theta} = \cos\theta\).`],
  [R`\sin\theta\csc\theta`, (x) => Math.sin(x) / Math.sin(x), 'one', ['sin2', 'tan', 'cot'], R`\(\csc\theta\) is the reciprocal of \(\sin\theta\), so the product is 1.`],
  [R`(1 + \tan^{2}\theta)\cos^{2}\theta`, (x) => (1 + Math.tan(x) ** 2) * c2(x), 'one', ['sec2', 'cos2', 'tan2'], R`\(1 + \tan^{2}\theta = \sec^{2}\theta = \dfrac{1}{\cos^{2}\theta}\), which cancels with \(\cos^{2}\theta\).`],
  [R`\dfrac{\tan\theta}{\sec\theta}`, (x) => Math.tan(x) * Math.cos(x), 'sin', ['cos', 'cot', 'csc'], R`Dividing by \(\sec\theta\) is multiplying by \(\cos\theta\): \(\dfrac{\sin\theta}{\cos\theta} \cdot \cos\theta\).`],
  [R`\sin^{2}\theta\,(1 + \cot^{2}\theta)`, (x) => s2(x) * (1 + c2(x) / s2(x)), 'one', ['csc2', 'sin2', 'cot2'], R`\(1 + \cot^{2}\theta = \csc^{2}\theta = \dfrac{1}{\sin^{2}\theta}\), which cancels with \(\sin^{2}\theta\).`],
  [R`\dfrac{\sec\theta}{\csc\theta}`, (x) => Math.sin(x) / Math.cos(x), 'tan', ['cot', 'one', 'sec'], R`\(\dfrac{1/\cos\theta}{1/\sin\theta} = \dfrac{\sin\theta}{\cos\theta}\).`],
  [R`\cos\theta + \sin\theta\tan\theta`, (x) => Math.cos(x) + Math.sin(x) * Math.tan(x), 'sec', ['cos', 'one', 'csc'], R`Over a common denominator: \(\dfrac{\cos^{2}\theta + \sin^{2}\theta}{\cos\theta} = \dfrac{1}{\cos\theta}\).`],
];

function easySimplify(rng) {
  const [tex, f, ans, wrong, why] = rng.pick(SIMPLIFY);
  const shuffled = rng.shuffle(wrong);
  return q({
    prompt: R`Simplify \(${tex}\).`,
    correct: M(FORMS[ans][0]),
    wrong: [...shuffled, ...rng.shuffle(Object.keys(FORMS).filter((k) => k !== ans && !wrong.includes(k)))].map((k) => M(FORMS[k][0])),
    solution: [why, R`So \(${tex} = ${FORMS[ans][0]}\).`],
    rule: 2,
    skill: 'Pythagorean identities',
    check: () => checkSame(f, FORMS[ans][1], [0.4, 0.9, 1.3, 2.2]),
  });
}

function easyPythagoreanValue(rng) {
  const [a, b, c] = rng.pick(TRIPLES);
  const qd = rng.int(1, 4);
  const [lx, ly] = rng.bool() ? [a, b] : [b, a];
  const [x, y] = [XS[qd - 1] * lx, YS[qd - 1] * ly];
  const givenSin = rng.bool();
  const [g, h, gv, hv] = givenSin ? ['sin', 'cos', frac(y, c), frac(x, c)] : ['cos', 'sin', frac(x, c), frac(y, c)];
  return q({
    prompt: R`If \(${T(g)}\theta = ${gv.tex()}\) and \(\theta\) is in Quadrant ${QUAD[qd]}, use \(\sin^{2}\theta + \cos^{2}\theta = 1\) to find \(${T(h)}\theta\).`,
    correct: hv,
    wrong: [
      { value: hv.neg(), why: `In Quadrant ${QUAD[qd]}, ${h === 'cos' ? 'cosine' : 'sine'} is ${hv.value > 0 ? 'positive' : 'negative'}.` },
      { value: frac(1).sub(gv.abs()), why: R`The identity uses squares: \(${T(h)}^{2}\theta = 1 - ${T(g)}^{2}\theta\), not \(1 - ${T(g)}\theta\).` },
      { value: hv.mul(hv), why: R`That is \(${T(h)}^{2}\theta\). Take the square root, then choose the sign.` },
      gv.abs(),
      hv.inv(),
    ],
    solution: [
      R`\(${T(h)}^{2}\theta = 1 - ${T(g)}^{2}\theta = 1 - ${gv.mul(gv).tex()} = ${hv.mul(hv).tex()}\).`,
      R`Take the square root: \(${T(h)}\theta = \pm${hv.abs().tex()}\).`,
      `In Quadrant ${QUAD[qd]}, ${h === 'cos' ? 'cosine' : 'sine'} is ${hv.value > 0 ? 'positive' : 'negative'}, so ${M(`${T(h)}\\theta = ${hv.tex()}`)}.`,
    ],
    rule: 2,
    skill: 'Pythagorean identities',
    check: () => checkEqual(TRIG[h](Math.atan2(y, x)), hv.value) === true && checkEqual(TRIG[g](Math.atan2(y, x)), gv.value),
  });
}

// ───────────── Medium ─────────────

const SUMS = [[75, 45, 30, 1], [15, 45, 30, -1], [105, 60, 45, 1], [165, 135, 30, 1], [195, 150, 45, 1], [255, 210, 45, 1], [285, 240, 45, 1], [345, 300, 45, 1]];
const SIX_TWO = [[R`\frac{\sqrt{6} + \sqrt{2}}{4}`, (Math.sqrt(6) + Math.sqrt(2)) / 4], [R`\frac{\sqrt{6} - \sqrt{2}}{4}`, (Math.sqrt(6) - Math.sqrt(2)) / 4], [R`\frac{\sqrt{2} - \sqrt{6}}{4}`, (Math.sqrt(2) - Math.sqrt(6)) / 4], [R`-\frac{\sqrt{6} + \sqrt{2}}{4}`, -(Math.sqrt(6) + Math.sqrt(2)) / 4]];

function mediumSumDifference(rng) {
  const [target, A, B, sg] = rng.pick(SUMS);
  const fn = rng.pick(['sin', 'cos']);
  const inDeg = rng.bool();
  const show = (d) => (inDeg ? `${d}^{\\circ}` : radTex(d));
  const value = TRIG[fn](toRad(target));
  const pick = (v) => SIX_TWO.find(([, n]) => Math.abs(n - v) < 1e-9);
  const right = pick(value);
  const partner = SIX_TWO.find(([, n]) => Math.sign(n) === Math.sign(value) && Math.abs(n - value) > 1e-9);
  // sin(A ± B) = sinA cosB ± cosA sinB;  cos(A ± B) = cosA cosB ∓ sinA sinB
  const [p1, p2] = fn === 'sin' ? [sinDeg(A).mul(cosDeg(B)), cosDeg(A).mul(sinDeg(B))] : [cosDeg(A).mul(cosDeg(B)), sinDeg(A).mul(sinDeg(B))];
  const second = fn === 'sin' ? (sg > 0 ? p2 : p2.neg()) : sg > 0 ? p2.neg() : p2;
  const op = sg > 0 ? '+' : '-';
  const flip = fn === 'sin' ? op : sg > 0 ? '-' : '+';
  const formula = fn === 'sin' ? R`\sin(A ${op} B) = \sin A\cos B ${flip} \cos A\sin B` : R`\cos(A ${op} B) = \cos A\cos B ${flip} \sin A\sin B`;
  return q({
    prompt: R`Use a sum or difference formula to find the exact value of \(${T(fn)}\left(${show(target)}\right)\).`,
    correct: M(right[0]),
    wrong: [
      { value: M(partner[0]), why: R`Check the sign between the two products: \(${formula}\).` },
      { value: M(right[0].replace('{4}', '{2}')), why: 'Each product multiplies two values with denominator 2, so its denominator is 4.' },
      { value: M(pick(-value)[0]), why: R`\(${show(target)}\) is in Quadrant ${QUAD[Math.floor(target / 90) + 1]}, where ${fn === 'sin' ? 'sine' : 'cosine'} is ${value > 0 ? 'positive' : 'negative'}.` },
      M(pick(-partner[1])[0]),
    ],
    solution: [
      R`Write the angle using special angles: \(${show(target)} = ${show(A)} ${op} ${show(B)}\).`,
      R`\(${formula}\) with \(A = ${show(A)}\) and \(B = ${show(B)}\).`,
      R`\(${fn === 'sin' ? R`\sin A\cos B` : R`\cos A\cos B`} = ${p1.tex()}\) and \(${fn === 'sin' ? R`\cos A\sin B` : R`\sin A\sin B`} = ${p2.tex()}\), so the value is \(${p1.tex()} ${flip} ${p2.value < 0 ? `\\left(${p2.tex()}\\right)` : p2.tex()} = ${right[0]}\).`,
    ],
    rule: 3,
    skill: 'sum and difference formulas',
    check: () => checkEqual(p1.value + second.value, value) === true && checkEqual(right[1], value),
  });
}

function mediumDoubleAngle(rng) {
  const [a, b, c] = rng.pick(TRIPLES.slice(0, 5));
  const qd = rng.int(1, 4);
  const [lx, ly] = rng.bool() ? [a, b] : [b, a];
  const [x, y] = [XS[qd - 1] * lx, YS[qd - 1] * ly];
  const givenSin = rng.bool();
  const given = givenSin ? R`\sin\theta = ${frac(y, c).tex()}` : R`\cos\theta = ${frac(x, c).tex()}`;
  const askSin = rng.bool();
  const t = Math.atan2(y, x);
  const [sv, cv] = [frac(y, c), frac(x, c)];
  const setup = givenSin
    ? R`\(\cos^{2}\theta = 1 - ${sv.mul(sv).tex()} = ${cv.mul(cv).tex()}\), and cosine is ${x > 0 ? 'positive' : 'negative'} in Quadrant ${QUAD[qd]}: \(\cos\theta = ${cv.tex()}\).`
    : R`\(\sin^{2}\theta = 1 - ${cv.mul(cv).tex()} = ${sv.mul(sv).tex()}\), and sine is ${y > 0 ? 'positive' : 'negative'} in Quadrant ${QUAD[qd]}: \(\sin\theta = ${sv.tex()}\).`;
  if (askSin) {
    const ans = frac(2 * x * y, c * c);
    return q({
      prompt: R`If \(${given}\) and \(\theta\) is in Quadrant ${QUAD[qd]}, find \(\sin 2\theta\).`,
      correct: ans,
      wrong: [
        { value: frac(2 * y, c), why: R`\(\sin 2\theta\) is not \(2\sin\theta\). Use \(\sin 2\theta = 2\sin\theta\cos\theta\).` },
        { value: ans.neg(), why: `Check the sign of ${givenSin ? 'cosine' : 'sine'} in Quadrant ${QUAD[qd]}.` },
        frac(x * y, c * c),
        frac(x * x - y * y, c * c),
      ],
      solution: [setup, R`\(\sin 2\theta = 2\sin\theta\cos\theta = 2 \cdot \left(${sv.tex()}\right)\left(${cv.tex()}\right) = ${ans.tex()}\).`],
      rule: 4,
      skill: 'double-angle formulas',
      check: () => checkEqual(Math.sin(2 * t), ans.value),
    });
  }
  const ans = frac(x * x - y * y, c * c);
  return q({
    prompt: R`If \(${given}\) and \(\theta\) is in Quadrant ${QUAD[qd]}, find \(\cos 2\theta\).`,
    correct: ans,
    wrong: [
      { value: frac(2 * x, c), why: R`\(\cos 2\theta\) is not \(2\cos\theta\). Use \(\cos 2\theta = \cos^{2}\theta - \sin^{2}\theta\).` },
      { value: ans.neg(), why: R`The order matters: \(\cos 2\theta = \cos^{2}\theta - \sin^{2}\theta\).` },
      frac(2 * x * y, c * c),
      frac(2 * Math.abs(x * y), c * c).neg(),
      frac(x * x, c * c),
    ],
    solution: [
      givenSin ? R`Use the form with sine only: \(\cos 2\theta = 1 - 2\sin^{2}\theta = 1 - 2 \cdot ${sv.mul(sv).tex()}\).` : R`Use the form with cosine only: \(\cos 2\theta = 2\cos^{2}\theta - 1 = 2 \cdot ${cv.mul(cv).tex()} - 1\).`,
      R`\(\cos 2\theta = ${ans.tex()}\). The quadrant is not needed here, because only the square of the given value is used.`,
    ],
    rule: 4,
    skill: 'double-angle formulas',
    check: () => checkEqual(Math.cos(2 * t), ans.value),
  });
}

function mediumSolveBasic(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const ref = rng.pick([30, 45, 60]);
  const sg = rng.sign();
  const base = trigDeg(fn, ref);
  const v = sg > 0 ? base : base.neg();
  const sols = anglesWhere(fn, [v]);
  const co = trigDeg(fn, 90 - ref);
  const eq = R`${v.d === 1 ? '' : v.d}${T(fn)} x = ${v.mul(v.d).tex()}`;
  const mixed = (fn === 'tan' ? [sols[0], norm360(-sols[0])] : [sols[0], norm360(sols[0] + 180)]).sort((p, t) => p - t);
  return q({
    prompt: R`Solve \(${eq}\) for \(0 \le x < 2\pi\).`,
    correct: angles(sols),
    wrong: [
      { value: angles(anglesWhere(fn, [v.neg()])), why: R`First isolate \(${T(fn)} x = ${v.tex()}\). Its sign decides the quadrants: these angles give \(${v.neg().tex()}\).` },
      ref !== 45 ? { value: angles(anglesWhere(fn, [sg > 0 ? co : co.neg()])), why: R`The reference angle is \(${radTex(ref)}\), because \(${T(fn)}\left(${radTex(ref)}\right) = ${base.tex()}\).` } : null,
      { value: angles(mixed), why: fn === 'tan' ? R`Tangent repeats every \(\pi\), so the second solution is \(\pi\) after the first.` : R`Use the reference angle \(${radTex(ref)}\) in each quadrant where \(${T(fn)}\) is ${sg > 0 ? 'positive' : 'negative'}.` },
      angles([sols[0], norm360(sols[1] + 90)].sort((p, t) => p - t)),
      angles([sols[0]]),
    ],
    solution: [
      v.d === 1 ? R`The equation already gives \(${T(fn)} x = ${v.tex()}\).` : R`Divide both sides by \(${v.d}\): \(${T(fn)} x = ${v.tex()}\).`,
      R`The reference angle is \(${radTex(ref)}\), and \(${T(fn)}\) is ${sg > 0 ? 'positive' : 'negative'} in Quadrants ${[1, 2, 3, 4].filter((k) => Math.sign(TRIG[fn](toRad(90 * k - 45))) === sg).map((k) => QUAD[k]).join(' and ')}.`,
      R`So ${angles(sols)}.`,
    ],
    rule: 5,
    skill: 'basic trig equations',
    check: () => (sols.length === 2 && sols.every((d) => Math.abs(v.d * TRIG[fn](toRad(d)) - v.mul(v.d).value) < 1e-9) ? true : 'solutions are wrong'),
  });
}

function mediumInverseAngle(rng) {
  const kind = rng.pick(['ramp', 'ladder', 'shadow']);
  const L = rng.int(4, 12);
  const s = rng.int(1, L - 1) + rng.pick([0, 0.5]);
  const spec = {
    ramp: { text: `A ramp ${L} m long rises ${num(s)} m. What angle does the ramp make with the ground?`, fn: 'sin', ratio: s / L, words: ['opposite side', 'hypotenuse'], parts: [num(s), L] },
    ladder: { text: `A ladder ${L} m long leans against a wall with its foot ${num(s)} m from the wall. What angle does the ladder make with the ground?`, fn: 'cos', ratio: s / L, words: ['adjacent side', 'hypotenuse'], parts: [num(s), L] },
    shadow: { text: `A pole ${L} m tall casts a shadow ${num(s)} m long on level ground. What is the angle of elevation of the sun?`, fn: 'tan', ratio: L / s, words: ['opposite side', 'adjacent side'], parts: [L, num(s)] },
  }[kind];
  const exact = toDeg(ATRIG[spec.fn](spec.ratio));
  const ans = round(exact, 1);
  if (ans < 5 || ans > 85) return mediumInverseAngle(rng);
  const fmt = (v) => R`\(${num(v, { fixed: 1 })}^{\circ}\)`;
  return q({
    prompt: `${spec.text} Round to the nearest tenth of a degree.`,
    correct: ans,
    fmt,
    wrong: apart(ans, [
      { value: 90 - exact, why: R`The known sides are the ${spec.words[0]} and the ${spec.words[1]}, which is the ratio for \(${T(spec.fn)}\). That is the other acute angle of the triangle.` },
      kind === 'shadow' ? { value: toDeg(Math.asin(Math.min(L, s) / Math.max(L, s))), why: 'Neither given length is the hypotenuse, so use the tangent ratio.' } : { value: toDeg(Math.atan(s / L)), why: `The ${L} m length is the hypotenuse, so the tangent ratio does not apply.` },
      { value: ATRIG[spec.fn](spec.ratio), why: 'That is the angle in radians. Check that the calculator is in degree mode.' },
      exact / 2,
      exact + 20,
    ], { places: 1, positive: true, gap: 0.08 }),
    solution: [
      R`The known sides are the ${spec.words[0]} (\(${spec.parts[0]}\)) and the ${spec.words[1]} (\(${spec.parts[1]}\)), so \(${T(spec.fn)}\theta = \dfrac{${spec.parts[0]}}{${spec.parts[1]}}\).`,
      R`The angle is acute, so \(\theta = ${INV[spec.fn]}\left(\dfrac{${spec.parts[0]}}{${spec.parts[1]}}\right)\).`,
      R`With a calculator in degree mode, \(\theta \approx ${num(ans, { fixed: 1 })}^{\circ}\).`,
    ],
    rule: 0,
    skill: 'inverse trig in context',
    check: () => (Math.abs(TRIG[spec.fn](toRad(exact)) - spec.ratio) < 1e-9 && Math.abs(ans - exact) <= 0.05 + 1e-9 ? true : 'angle does not reproduce the ratio'),
  });
}

// ───────────── Hard ─────────────

function hardInverseComposition(rng) {
  if (rng.bool()) {
    const fn = rng.pick(['sin', 'cos', 'tan']);
    const d = rng.pick({ sin: [120, 135, 150, 210, 225, 240, 300, 315, 330], cos: [210, 225, 240, 300, 315, 330, -30, -45, -60], tan: [120, 135, 150, 210, 225, 240] }[fn]);
    const ans = Math.round(toDeg(ATRIG[fn](TRIG[fn](toRad(d)))));
    const range = { sin: R`\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]`, cos: R`[0, \pi]`, tan: R`\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)` }[fn];
    const ref = refAngle(d);
    return q({
      prompt: R`Find the exact value of \(${INV[fn]}\left(${T(fn)}\left(${radTex(d)}\right)\right)\).`,
      correct: M(radTex(ans)),
      wrong: [
        { value: M(radTex(d)), why: R`\(${INV[fn]}\) undoes \(${T(fn)}\) only for angles in \(${range}\). \(${radTex(d)}\) is outside that interval.` },
        { value: M(radTex(ans === ref ? -ref : ref)), why: R`Find the angle in \(${range}\) whose ${fn === 'sin' ? 'sine' : fn === 'cos' ? 'cosine' : 'tangent'} is the same as that of \(${radTex(d)}\), including its sign.` },
        M(radTex(180 - ans === d ? ans + 90 : 180 - ans)),
        M(radTex(-ans)),
        M(radTex(norm360(d + 180))),
        M(radTex(norm360(d))),
        M(radTex(ans + 180)),
        M(radTex(ans + 90)),
      ],
      solution: [
        R`Inside first: \(${T(fn)}\left(${radTex(d)}\right) = ${trigDeg(fn, d).tex()}\).`,
        R`\(${INV[fn]}\) returns the angle in \(${range}\) with that ${fn === 'sin' ? 'sine' : fn === 'cos' ? 'cosine' : 'tangent'}: \(${T(fn)}\left(${radTex(ans)}\right) = ${trigDeg(fn, ans).tex()}\).`,
        R`So the value is \(${radTex(ans)}\), not \(${radTex(d)}\).`,
      ],
      rule: 1,
      skill: 'compositions with inverse trig',
      check: () => checkEqual(TRIG[fn](toRad(ans)), TRIG[fn](toRad(d))) === true && checkEqual(toRad(ans), ATRIG[fn](TRIG[fn](toRad(d)))),
    });
  }
  const [a, b, c] = rng.pick(TRIPLES);
  const inner = rng.pick(['sin', 'cos', 'tan']);
  const outer = rng.pick(['sin', 'cos', 'tan'].filter((f) => f !== inner));
  const neg = rng.bool();
  const sgn = neg ? -1 : 1;
  // The angle θ = inner⁻¹(v): a point (x, y) on its terminal side, at distance c from the origin.
  const [x, y, v] = inner === 'sin' ? [b, sgn * a, frac(sgn * a, c)] : inner === 'cos' ? [sgn * a, b, frac(sgn * a, c)] : [b, sgn * a, frac(sgn * a, b)];
  const ans = { sin: frac(y, c), cos: frac(x, c), tan: frac(y, x) }[outer];
  const where = inner === 'cos' ? (neg ? 'II' : 'I') : neg ? 'IV' : 'I';
  return q({
    prompt: R`Find the exact value of \(${T(outer)}\left(${INV[inner]}\left(${v.tex()}\right)\right)\).`,
    correct: ans,
    wrong: [
      neg ? { value: ans.neg(), why: R`\(${INV[inner]}\) of a negative number is an angle in Quadrant ${where}. Use the signs of that quadrant.` } : { value: v, why: R`The outer function is \(${T(outer)}\), not \(${T(inner)}\), so it does not simply undo the inverse.` },
      { value: ans.inv(), why: R`That is the reciprocal. Check which sides \(${T(outer)}\) uses.` },
      { sin: frac(Math.abs(x), c), cos: frac(Math.abs(y), c), tan: frac(Math.abs(x), Math.abs(y)) }[outer],
      v.neg(),
      ans.neg(),
    ],
    solution: [
      R`Let \(\theta = ${INV[inner]}\left(${v.tex()}\right)\), so \(${T(inner)}\theta = ${v.tex()}\) with \(\theta\) in Quadrant ${where}.`,
      R`Draw a point on the terminal side: \(x = ${x}\), \(y = ${y}\), \(r = ${c}\) (from \(x^{2} + y^{2} = r^{2}\)).`,
      R`\(${T(outer)}\theta = ${{ sin: R`\dfrac{y}{r}`, cos: R`\dfrac{x}{r}`, tan: R`\dfrac{y}{x}` }[outer]} = ${ans.tex()}\).`,
    ],
    rule: 1,
    skill: 'compositions with inverse trig',
    check: () => checkEqual(TRIG[outer](ATRIG[inner](v.value)), ans.value),
  });
}

const R3 = Math.sqrt(3);
// Quadratic-type equations in U = sin x, cos x or tan x: [LaTeX with U2/U, numeric coefficients, values of U that solve it, note for a lost factor].
const QUADS = {
  trig: [
    ['2U2 + U - 1 = 0', [2, 1, -1], [surd(1, 2), surd(-1)]],
    ['2U2 - U - 1 = 0', [2, -1, -1], [surd(-1, 2), surd(1)]],
    ['2U2 - 3U + 1 = 0', [2, -3, 1], [surd(1, 2), surd(1)]],
    ['2U2 + 3U + 1 = 0', [2, 3, 1], [surd(-1, 2), surd(-1)]],
    ['2U2 = U', [2, -1, 0], [surd(0), surd(1, 2)], true],
    ['2U2 + U = 0', [2, 1, 0], [surd(0), surd(-1, 2)], true],
    ['4U2 - 1 = 0', [4, 0, -1], [surd(1, 2), surd(-1, 2)]],
    ['4U2 - 3 = 0', [4, 0, -3], [surd(1, 2, 3), surd(-1, 2, 3)]],
    ['2U2 - 1 = 0', [2, 0, -1], [surd(1, 2, 2), surd(-1, 2, 2)]],
    [R`2U2 = \sqrt{3}\,U`, [2, -R3, 0], [surd(0), surd(1, 2, 3)], true],
  ],
  tan: [
    ['U2 - 1 = 0', [1, 0, -1], [surd(1), surd(-1)]],
    ['U2 - 3 = 0', [1, 0, -3], [surd(1, 1, 3), surd(-1, 1, 3)]],
    ['3U2 - 1 = 0', [3, 0, -1], [surd(1, 3, 3), surd(-1, 3, 3)]],
    ['U2 = U', [1, -1, 0], [surd(0), surd(1)], true],
    ['U2 + U = 0', [1, 1, 0], [surd(0), surd(-1)], true],
    [R`U2 = \sqrt{3}\,U`, [1, -R3, 0], [surd(0), surd(1, 1, 3)], true],
  ],
};

function hardSolveQuadratic(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const [form, coefs, roots, divides] = rng.pick(QUADS[fn === 'tan' ? 'tan' : 'trig']);
  const U = `${T(fn)} x`;
  const tex = form.replace(/U2/g, `${T(fn)}^{2} x`).replace(/U/g, U);
  const sols = anglesWhere(fn, roots);
  const [r0, r1] = roots;
  const symmetric = r0.eq(r1.neg());
  const alts = [
    [[r1], divides ? R`Dividing both sides by \(${U}\) throws away the solutions of \(${U} = 0\). Move everything to one side and factor instead.` : symmetric ? R`\(u^{2} = k\) has two solutions, \(u = \pm\sqrt{k}\). Keep both.` : R`Both factors can be zero. Solve \(${U} = ${r0.tex()}\) as well.`],
    [[r0], symmetric ? R`\(u^{2} = k\) has two solutions, \(u = \pm\sqrt{k}\). Keep both.` : R`Both factors can be zero. Solve \(${U} = ${r1.tex()}\) as well.`],
    [[r0.neg(), r1], 'Check the sign when solving each factor for the trig value.'],
    [[r0, r1.neg()], 'Check the sign when solving each factor for the trig value.'],
    [[r0.neg(), r1.neg()], null],
  ];
  const seen = new Set([sols.join()]);
  const wrong = [];
  for (const [vals, why] of alts) {
    const set = anglesWhere(fn, vals);
    if (!set.length || seen.has(set.join())) continue;
    seen.add(set.join());
    wrong.push(why ? { value: angles(set), why } : angles(set));
  }
  for (const shiftBy of [90, 180, 30]) {
    const set = [...new Set(sols.map((d) => norm360(d + shiftBy)))].sort((p, t) => p - t);
    if (!seen.has(set.join())) {
      seen.add(set.join());
      wrong.push(angles(set));
    }
  }
  const list = (v) => anglesWhere(fn, [v]).map((d) => radTex(d)).join(R`,\ `);
  return q({
    prompt: R`Solve \(${tex}\) for \(0 \le x < 2\pi\).`,
    correct: angles(sols),
    wrong,
    solution: [
      symmetric
        ? R`Isolate the square: \(${T(fn)}^{2} x = ${r0.mul(r0).tex()}\), so \(${U} = ${r0.abs().tex()}\) or \(${U} = ${r0.abs().neg().tex()}\).`
        : R`Treat it as a quadratic in \(u = ${U}\). ${divides ? 'Move everything to one side and factor out the common factor' : 'Factor'}: the solutions are \(${U} = ${r0.tex()}\) or \(${U} = ${r1.tex()}\).`,
      anglesWhere(fn, [r0]).length ? R`\(${U} = ${r0.tex()}\) gives \(x = ${list(r0)}\).` : R`\(${U} = ${r0.tex()}\) has no solution.`,
      anglesWhere(fn, [r1]).length ? R`\(${U} = ${r1.tex()}\) gives \(x = ${list(r1)}\).` : R`\(${U} = ${r1.tex()}\) has no solution.`,
      R`All solutions: ${angles(sols)}.`,
    ],
    rule: 5,
    skill: 'quadratic trig equations',
    check: () => {
      const f = (d) => polyEval(coefs, TRIG[fn](toRad(d)));
      const zeros = [];
      for (let d = 0; d < 360; d += 15) if (Math.abs(f(d)) < 1e-9) zeros.push(d);
      return zeros.join() === sols.join() ? true : `zeros are at ${zeros.join()}, answer lists ${sols.join()}`;
    },
  });
}

function hardGeneralSolution(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const n = rng.int(2, 3);
  const ref = rng.pick([30, 45, 60]);
  const base = trigDeg(fn, ref);
  const v = rng.bool() ? base : base.neg();
  const [a1, a2] = anglesWhere(fn, [v]);
  const term = (d, per) => R`\(x = ${piTex(d, 180 * n)} + ${per} k\)`;
  const full = piTex(2, n);
  const halfPer = piTex(1, n);
  const both = (d1, d2, per) => `${term(d1, per)} or ${term(d2, per)}`;
  const right = fn === 'tan' ? term(a1, halfPer) : both(a1, a2, full);
  const count = () => {
    let c = 0;
    for (let x = 0; x < 360; x += 2.5) if (Math.abs(TRIG[fn](toRad(n * x)) - v.value) < 1e-9) c++;
    return c;
  };
  const family = new Set();
  for (let k = 0; k < 2 * n; k++) for (const a of fn === 'tan' ? [a1] : [a1, a2]) family.add(norm360((a + (fn === 'tan' ? 180 : 360) * k) / n).toFixed(4));
  return q({
    prompt: R`Find the general solution of \(${T(fn)} ${n}x = ${v.tex()}\), where \(k\) is any integer.`,
    correct: right,
    wrong: fn === 'tan'
      ? [
        { value: term(a1, full), why: R`Tangent repeats every \(\pi\), so \(${n}x = ${radTex(a1)} + \pi k\). Dividing by \(${n}\) gives a spacing of \(${halfPer}\).` },
        { value: R`\(x = ${radTex(a1)} + \pi k\)`, why: R`That solves \(\tan x = ${v.tex()}\). Here the angle is \(${n}x\), so divide everything by \(${n}\).` },
        { value: R`\(x = ${piTex(a1, 180 * n)} + \pi k\)`, why: R`Divide the \(\pi k\) by \(${n}\) as well.` },
        term(a2 - 180 === a1 ? a1 + 90 : a2, halfPer),
      ]
      : [
        { value: both(a1, a2, R`2\pi`), why: R`Divide the whole right-hand side by \(${n}\), including the \(2\pi k\).` },
        { value: R`\(x = ${radTex(a1)} + 2\pi k\) or \(x = ${radTex(a2)} + 2\pi k\)`, why: R`Those solve \(${T(fn)} x = ${v.tex()}\). Here the angle is \(${n}x\), so divide everything by \(${n}\).` },
        { value: term(a1, full), why: 'In each full turn two angles have this value, so there are two families of solutions.' },
        both(a1, fn === 'sin' ? norm360(-a1) : norm360(180 - a1), full),
      ],
    solution: [
      R`Solve for the angle \(${n}x\) first. In one turn, \(${T(fn)}\theta = ${v.tex()}\) at \(\theta = ${radTex(a1)}\)${fn === 'tan' ? '' : R` and \(\theta = ${radTex(a2)}\)`}.`,
      fn === 'tan' ? R`Tangent has period \(\pi\): \(${n}x = ${radTex(a1)} + \pi k\).` : R`Add full turns: \(${n}x = ${radTex(a1)} + 2\pi k\) or \(${n}x = ${radTex(a2)} + 2\pi k\).`,
      R`Divide every term by \(${n}\): ${right}.`,
    ],
    rule: 5,
    skill: 'general solutions',
    check: () => {
      const viaFormula = [...family].every((x) => Math.abs(TRIG[fn](toRad(n * Number(x))) - v.value) < 1e-6);
      return viaFormula && family.size === count() ? true : `formula gives ${family.size} solutions per turn, a scan finds ${count()}`;
    },
  });
}

function hardSumFractions(rng) {
  const [t1, t2] = rng.sample(TRIPLES.slice(0, 4), 2);
  const [qa, qb] = [rng.int(1, 4), rng.int(1, 4)];
  const [xa, ya, ra] = [XS[qa - 1] * t1[1], YS[qa - 1] * t1[0], t1[2]];
  const [xb, yb, rb] = [XS[qb - 1] * t2[0], YS[qb - 1] * t2[1], t2[2]];
  const [sA, cA, sB, cB] = [frac(ya, ra), frac(xa, ra), frac(yb, rb), frac(xb, rb)];
  const fn = rng.pick(['sin', 'cos']);
  const plus = rng.bool();
  const value = (sgnA = 1, pl = plus, f = fn) => (f === 'sin'
    ? sA.mul(cB).add(cA.mul(sgnA).mul(sB).mul(pl ? 1 : -1))
    : cA.mul(sgnA).mul(cB).add(sA.mul(sB).mul(pl ? -1 : 1)));
  const ans = value();
  const [A, B] = [Math.atan2(ya, xa), Math.atan2(yb, xb)];
  const op = plus ? '+' : '-';
  const flip = fn === 'sin' ? op : plus ? '-' : '+';
  const P = (fr) => R`\left(${fr.tex()}\right)`;
  return q({
    prompt: R`\(\sin A = ${sA.tex()}\) with \(A\) in Quadrant ${QUAD[qa]}, and \(\cos B = ${cB.tex()}\) with \(B\) in Quadrant ${QUAD[qb]}. Find \(${T(fn)}(A ${op} B)\).`,
    correct: ans,
    wrong: [
      { value: value(1, !plus), why: fn === 'sin' ? R`\(\sin(A ${op} B)\) keeps the same sign between its two products: \(\sin A\cos B ${op} \cos A\sin B\).` : R`\(\cos(A ${op} B)\) uses the opposite sign between its two products: \(\cos A\cos B ${flip} \sin A\sin B\).` },
      { value: value(-1), why: `In Quadrant ${QUAD[qa]}, cos A is ${xa > 0 ? 'positive' : 'negative'}.` },
      { value: fn === 'sin' ? sA.add(sB.mul(plus ? 1 : -1)) : cA.add(cB.mul(plus ? 1 : -1)), why: R`\(${T(fn)}(A ${op} B)\) is not \(${T(fn)} A ${op} ${T(fn)} B\). Use the ${plus ? 'sum' : 'difference'} formula.` },
      value(1, plus, fn === 'sin' ? 'cos' : 'sin'),
      ans.neg(),
    ],
    solution: [
      R`Find the missing values. \(\cos A = ${cA.tex()}\) (${xa > 0 ? 'positive' : 'negative'} in Quadrant ${QUAD[qa]}) and \(\sin B = ${sB.tex()}\) (${yb > 0 ? 'positive' : 'negative'} in Quadrant ${QUAD[qb]}).`,
      fn === 'sin' ? R`\(\sin(A ${op} B) = \sin A\cos B ${op} \cos A\sin B = ${P(sA)}${P(cB)} ${op} ${P(cA)}${P(sB)}\).` : R`\(\cos(A ${op} B) = \cos A\cos B ${flip} \sin A\sin B = ${P(cA)}${P(cB)} ${flip} ${P(sA)}${P(sB)}\).`,
      R`\(= ${ans.tex()}\).`,
    ],
    rule: 3,
    skill: 'sum and difference formulas',
    check: () => checkEqual(TRIG[fn](plus ? A + B : A - B), ans.value),
  });
}

// ───────────── Challenge ─────────────

// [equation, f(x) = left − right, solutions in degrees, wrong sets, why the first wrong set is wrong, steps]
const MIXED = [
  [R`\sin 2x = \sin x`, (x) => Math.sin(2 * x) - Math.sin(x), [0, 60, 180, 300], [[60, 300], [0, 180], [0, 30, 150, 180]], R`Dividing by \(\sin x\) loses the solutions of \(\sin x = 0\).`, [R`Use \(\sin 2x = 2\sin x\cos x\): \(2\sin x\cos x - \sin x = 0\).`, R`Factor: \(\sin x\,(2\cos x - 1) = 0\), so \(\sin x = 0\) or \(\cos x = \frac{1}{2}\).`]],
  [R`\sin 2x = \cos x`, (x) => Math.sin(2 * x) - Math.cos(x), [30, 90, 150, 270], [[30, 150], [90, 270], [60, 90, 270, 300]], R`Dividing by \(\cos x\) loses the solutions of \(\cos x = 0\).`, [R`Use \(\sin 2x = 2\sin x\cos x\): \(2\sin x\cos x - \cos x = 0\).`, R`Factor: \(\cos x\,(2\sin x - 1) = 0\), so \(\cos x = 0\) or \(\sin x = \frac{1}{2}\).`]],
  [R`\cos 2x = \cos x`, (x) => Math.cos(2 * x) - Math.cos(x), [0, 120, 240], [[120, 240], [0, 60, 300], [60, 180, 300]], R`The factor \(\cos x - 1\) also gives a solution: \(\cos x = 1\) at \(x = 0\).`, [R`Use \(\cos 2x = 2\cos^{2} x - 1\): \(2\cos^{2} x - \cos x - 1 = 0\).`, R`Factor: \((2\cos x + 1)(\cos x - 1) = 0\), so \(\cos x = -\frac{1}{2}\) or \(\cos x = 1\).`]],
  [R`\cos 2x = \sin x`, (x) => Math.cos(2 * x) - Math.sin(x), [30, 150, 270], [[30, 150], [90, 210, 330], [30, 90, 150]], R`The factor \(\sin x + 1\) also gives a solution: \(\sin x = -1\) at \(x = \frac{3\pi}{2}\).`, [R`Use \(\cos 2x = 1 - 2\sin^{2} x\): \(2\sin^{2} x + \sin x - 1 = 0\).`, R`Factor: \((2\sin x - 1)(\sin x + 1) = 0\), so \(\sin x = \frac{1}{2}\) or \(\sin x = -1\).`]],
  [R`\cos 2x + \cos x = 0`, (x) => Math.cos(2 * x) + Math.cos(x), [60, 180, 300], [[60, 300], [0, 120, 240], [0, 60, 300]], R`The factor \(\cos x + 1\) also gives a solution: \(\cos x = -1\) at \(x = \pi\).`, [R`Use \(\cos 2x = 2\cos^{2} x - 1\): \(2\cos^{2} x + \cos x - 1 = 0\).`, R`Factor: \((2\cos x - 1)(\cos x + 1) = 0\), so \(\cos x = \frac{1}{2}\) or \(\cos x = -1\).`]],
  [R`\cos 2x + \sin x = 1`, (x) => Math.cos(2 * x) + Math.sin(x) - 1, [0, 30, 150, 180], [[30, 150], [0, 180], [0, 180, 210, 330]], R`Dividing by \(\sin x\) loses the solutions of \(\sin x = 0\).`, [R`Use \(\cos 2x = 1 - 2\sin^{2} x\): \(1 - 2\sin^{2} x + \sin x = 1\), so \(\sin x - 2\sin^{2} x = 0\).`, R`Factor: \(\sin x\,(1 - 2\sin x) = 0\), so \(\sin x = 0\) or \(\sin x = \frac{1}{2}\).`]],
  [R`2\sin^{2} x = 1 + \cos x`, (x) => 2 * Math.sin(x) ** 2 - 1 - Math.cos(x), [60, 180, 300], [[60, 300], [0, 120, 240], [60, 120, 180]], R`The factor \(\cos x + 1\) also gives a solution: \(\cos x = -1\) at \(x = \pi\).`, [R`Use \(\sin^{2} x = 1 - \cos^{2} x\): \(2 - 2\cos^{2} x = 1 + \cos x\), so \(2\cos^{2} x + \cos x - 1 = 0\).`, R`Factor: \((2\cos x - 1)(\cos x + 1) = 0\), so \(\cos x = \frac{1}{2}\) or \(\cos x = -1\).`]],
  [R`\sin 2x + \sin x = 0`, (x) => Math.sin(2 * x) + Math.sin(x), [0, 120, 180, 240], [[120, 240], [0, 180], [0, 60, 180, 300]], R`Dividing by \(\sin x\) loses the solutions of \(\sin x = 0\).`, [R`Use \(\sin 2x = 2\sin x\cos x\): \(2\sin x\cos x + \sin x = 0\).`, R`Factor: \(\sin x\,(2\cos x + 1) = 0\), so \(\sin x = 0\) or \(\cos x = -\frac{1}{2}\).`]],
  [R`\cos 2x - 3\cos x + 2 = 0`, (x) => Math.cos(2 * x) - 3 * Math.cos(x) + 2, [0, 60, 300], [[60, 300], [0, 120, 240], [0, 30, 330]], R`The factor \(\cos x - 1\) also gives a solution: \(\cos x = 1\) at \(x = 0\).`, [R`Use \(\cos 2x = 2\cos^{2} x - 1\): \(2\cos^{2} x - 3\cos x + 1 = 0\).`, R`Factor: \((2\cos x - 1)(\cos x - 1) = 0\), so \(\cos x = \frac{1}{2}\) or \(\cos x = 1\).`]],
  [R`\cos 2x + 3\sin x = 2`, (x) => Math.cos(2 * x) + 3 * Math.sin(x) - 2, [30, 90, 150], [[30, 150], [90, 210, 330], [30, 150, 270]], R`The factor \(\sin x - 1\) also gives a solution: \(\sin x = 1\) at \(x = \frac{\pi}{2}\).`, [R`Use \(\cos 2x = 1 - 2\sin^{2} x\): \(1 - 2\sin^{2} x + 3\sin x = 2\), so \(2\sin^{2} x - 3\sin x + 1 = 0\).`, R`Factor: \((2\sin x - 1)(\sin x - 1) = 0\), so \(\sin x = \frac{1}{2}\) or \(\sin x = 1\).`]],
];

function challengeIdentityEquation(rng) {
  const [tex, f, sols, wrongs, why, steps] = rng.pick(MIXED);
  return q({
    prompt: R`Solve \(${tex}\) for \(0 \le x < 2\pi\).`,
    correct: angles(sols),
    wrong: [{ value: angles(wrongs[0]), why }, ...rng.shuffle(wrongs.slice(1)).map((w) => angles(w)), angles(sols.map((d) => norm360(d + 90)).sort((p, t) => p - t))],
    solution: [...steps, R`On \(0 \le x < 2\pi\) that gives ${angles(sols)}.`],
    rule: 5,
    skill: 'equations using identities',
    check: () => {
      const zeros = [];
      for (let d = 0; d < 360; d += 7.5) if (Math.abs(f(toRad(d))) < 1e-9) zeros.push(d);
      return zeros.join() === sols.join() && wrongs.every((w) => w.join() !== sols.join()) ? true : `zeros are at ${zeros.join()}`;
    },
  });
}

function challengeCountSolutions(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const n = rng.int(2, 5);
  const v = rng.pick(fn === 'tan' ? [surd(0), surd(1), surd(-1), surd(1, 1, 3), surd(-1, 1, 3), surd(1, 3, 3)] : [surd(0), surd(1, 2), surd(-1, 2), surd(1, 2, 2), surd(-1, 2, 3), surd(1, 2, 3), surd(1), surd(-1)]);
  const perTurn = anglesWhere(fn, [v]).length;
  const ans = perTurn * n;
  const scan = () => {
    let c = 0;
    for (let x = 0; x < 360; x += 0.25) if (Math.abs(TRIG[fn](toRad(n * x)) - v.value) < 1e-9) c++;
    return c;
  };
  return q({
    prompt: R`How many solutions does \(${T(fn)} ${n}x = ${v.tex()}\) have in the interval \(0 \le x < 2\pi\)?`,
    correct: ans,
    wrong: [
      { value: perTurn, why: R`That counts the solutions of \(${T(fn)}\theta = ${v.tex()}\) in one turn. As \(x\) goes from \(0\) to \(2\pi\), the angle \(${n}x\) goes round \(${n}\) times.` },
      { value: perTurn === 2 ? n : 2 * n, why: perTurn === 2 ? R`Each full turn of the angle \(${n}x\) gives 2 solutions, and there are \(${n}\) turns.` : R`\(${T(fn)}\theta = ${v.tex()}\) happens only once in each turn.` },
      ans + 2,
      ans + perTurn,
      ans - 1,
    ],
    solution: [
      R`Let \(\theta = ${n}x\). As \(x\) runs over \(0 \le x < 2\pi\), \(\theta\) runs over \(0 \le \theta < ${piTex(2 * n)}\): \(${n}\) full turns.`,
      R`In each full turn, \(${T(fn)}\theta = ${v.tex()}\) has ${perTurn === 1 ? '1 solution' : '2 solutions'}.`,
      R`Total: \(${n} \cdot ${perTurn} = ${ans}\) solutions.`,
    ],
    rule: 5,
    skill: 'multiple-angle equations',
    check: () => (scan() === ans ? true : `a scan finds ${scan()} solutions`),
  });
}

function challengeProjectile(rng) {
  const v = rng.pick([10, 20, 30, 40]);
  const peak = (v * v) / 10;
  const [ratioTex, small, RTex] = rng.pick([
    [R`\frac{1}{2}`, 15, `${peak / 2}`],
    [R`\frac{\sqrt{3}}{2}`, 30, R`${peak / 2}\sqrt{3}`],
    [R`\frac{\sqrt{2}}{2}`, 22.5, R`${peak / 2}\sqrt{2}`],
  ]);
  const larger = rng.bool();
  const ans = larger ? 90 - small : small;
  const R0 = peak * Math.sin(toRad(2 * small));
  return q({
    prompt: R`A ball kicked from the ground at speed \(v\) and angle \(\theta\) lands a distance \(R = \dfrac{v^{2}}{g}\sin 2\theta\) away. Take \(g = 10\) m/s². A ball is kicked at ${v} m/s and lands \(${RTex}\) m away${RTex.includes('sqrt') ? ` (about ${num(R0, { places: 1 })} m)` : ''}. What is the ${larger ? 'larger' : 'smaller'} of the two possible launch angles?`,
    correct: ans,
    fmt: degFmt,
    wrong: [
      { value: larger ? 180 - 2 * small : 2 * small, why: R`That is the value of \(2\theta\). Halve it to get the launch angle.` },
      { value: larger ? small : 90 - small, why: `That is the ${larger ? 'smaller' : 'larger'} of the two angles.` },
      { value: larger ? 180 - small : small / 2, why: R`\(\sin 2\theta = ${ratioTex}\) gives \(2\theta = ${2 * small}^{\circ}\) or \(2\theta = ${180 - 2 * small}^{\circ}\). Halve each one.` },
      45,
      60,
      ans + 5,
    ],
    solution: [
      R`Substitute: \(${RTex} = \dfrac{${v}^{2}}{10}\sin 2\theta = ${peak}\sin 2\theta\), so \(\sin 2\theta = ${ratioTex}\).`,
      R`For a launch angle between \(0^{\circ}\) and \(90^{\circ}\), \(2\theta\) is between \(0^{\circ}\) and \(180^{\circ}\): \(2\theta = ${2 * small}^{\circ}\) or \(2\theta = ${180 - 2 * small}^{\circ}\).`,
      R`So \(\theta = ${num(small)}^{\circ}\) or \(\theta = ${num(90 - small)}^{\circ}\). The ${larger ? 'larger' : 'smaller'} is \(${num(ans)}^{\circ}\).`,
    ],
    rule: 4,
    skill: 'double angle in context',
    check: () => checkEqual(peak * Math.sin(toRad(2 * ans)), R0),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'trig-identities-equations',
  title: 'Trig Identities, Inverse Trig & Equations',
  summary: 'Evaluate inverse trig functions, use Pythagorean, sum and double-angle identities, and solve trig equations.',
  standards: ['AP Precalculus 3.9', 'AP Precalculus 3.10', 'AP Precalculus 3.12', 'CCSS F-TF.B.6', 'CCSS F-TF.B.7', 'CCSS F-TF.C.9'],

  explain: {
    intro: R`Trig functions are periodic, so each output comes from many angles. Inverse trig functions pick out one of them, identities rewrite an expression in a more useful form, and solving a trig equation means finding every angle that works: first in one turn, then in general.`,
    rules: [
      {
        title: 'Inverse sine, cosine and tangent',
        text: R`To have inverses, sine, cosine and tangent are restricted to an interval where they are one-to-one. \(\sin^{-1} x\) is the angle in \(\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]\) whose sine is \(x\); \(\cos^{-1} x\) is the angle in \([0, \pi]\) whose cosine is \(x\); \(\tan^{-1} x\) is the angle in \(\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)\) whose tangent is \(x\).`,
        example: R`\(\sin^{-1}\left(-\frac{1}{2}\right) = -\frac{\pi}{6}\) and \(\cos^{-1}\left(-\frac{1}{2}\right) = \frac{2\pi}{3}\).`,
      },
      {
        title: 'Compositions with inverses',
        text: R`\(\sin(\sin^{-1} x) = x\) whenever \(x\) is in \([-1, 1]\). The other order, \(\sin^{-1}(\sin\theta)\), equals \(\theta\) only if \(\theta\) is already in the range of \(\sin^{-1}\); otherwise find the angle in that range with the same sine. For a mixed composition such as \(\cos(\sin^{-1} x)\), name the angle, draw its triangle, and read off the ratio.`,
        example: R`\(\cos^{-1}\left(\cos\frac{5\pi}{4}\right) = \frac{3\pi}{4}\). \(\tan\left(\cos^{-1}\frac{3}{5}\right) = \frac{4}{3}\).`,
      },
      {
        title: 'Pythagorean identities',
        text: R`\(\sin^{2}\theta + \cos^{2}\theta = 1\). Dividing by \(\cos^{2}\theta\) or \(\sin^{2}\theta\) gives \(1 + \tan^{2}\theta = \sec^{2}\theta\) and \(1 + \cot^{2}\theta = \csc^{2}\theta\). To simplify an expression, look for these patterns, or rewrite everything in terms of sine and cosine.`,
        example: R`\(\dfrac{1 - \cos^{2}\theta}{\sin\theta} = \dfrac{\sin^{2}\theta}{\sin\theta} = \sin\theta\).`,
      },
      {
        title: 'Sum and difference formulas',
        text: R`\(\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B\) and \(\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B\). Sine keeps the sign; cosine switches it.`,
        example: R`\(\sin 75^{\circ} = \sin 45^{\circ}\cos 30^{\circ} + \cos 45^{\circ}\sin 30^{\circ} = \frac{\sqrt{6} + \sqrt{2}}{4}\).`,
      },
      {
        title: 'Double-angle formulas',
        text: R`Setting \(B = A\) in the sum formulas: \(\sin 2\theta = 2\sin\theta\cos\theta\) and \(\cos 2\theta = \cos^{2}\theta - \sin^{2}\theta = 2\cos^{2}\theta - 1 = 1 - 2\sin^{2}\theta\).`,
        example: R`If \(\sin\theta = \frac{3}{5}\) in Quadrant I, then \(\sin 2\theta = 2 \cdot \frac{3}{5} \cdot \frac{4}{5} = \frac{24}{25}\) and \(\cos 2\theta = 1 - 2 \cdot \frac{9}{25} = \frac{7}{25}\).`,
      },
      {
        title: 'Solving trig equations',
        text: R`Isolate the trig function (factor if the equation is quadratic in type, and use an identity so that only one function appears). Find the reference angle, place it in each quadrant with the right sign, and list the solutions in one turn. For the general solution add \(2\pi k\) for sine and cosine or \(\pi k\) for tangent. If the angle is \(nx\), solve for \(nx\) first and then divide everything by \(n\).`,
        example: R`\(2\sin x + 1 = 0\) gives \(\sin x = -\frac{1}{2}\): \(x = \frac{7\pi}{6}, \frac{11\pi}{6}\) in one turn, and \(x = \frac{7\pi}{6} + 2\pi k\) or \(\frac{11\pi}{6} + 2\pi k\) in general.`,
      },
    ],
    vocab: [
      { term: 'identity', def: 'An equation that is true for every value of the variable for which both sides are defined.' },
      { term: 'principal value', def: R`The single angle returned by an inverse trig function, taken from its restricted range.` },
      { term: 'general solution', def: R`A formula with an integer \(k\) that describes every solution of a periodic equation.` },
      { term: 'reference angle', def: 'The acute angle between the terminal side of an angle and the x-axis.' },
    ],
    mistakes: [
      R`Reading \(\sin^{-1} x\) as \(\dfrac{1}{\sin x}\). The reciprocal is \(\csc x\); \(\sin^{-1}\) is the inverse function.`,
      R`Writing \(\sin(A + B) = \sin A + \sin B\) or \(\sin 2\theta = 2\sin\theta\). Use the formulas.`,
      R`Dividing both sides of an equation by \(\sin x\) or \(\cos x\). That loses the solutions where the divisor is 0: factor instead.`,
      R`Giving only the calculator's answer. An equation such as \(\sin x = \frac{1}{2}\) has two solutions in each turn.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 2 * Math.PI],
      y: [-1.5, 1.5],
      piTicks: true,
      fns: [{ f: Math.sin }],
      hlines: [{ y: 0.5 }],
      points: [{ x: Math.PI / 6, y: 0.5, label: 'π/6' }, { x: (5 * Math.PI) / 6, y: 0.5, label: '5π/6' }],
      alt: 'Graph of y = sin x from 0 to 2π with the dashed horizontal line y = ½. The line meets the curve twice in one turn, at x = π/6 and x = 5π/6: the two solutions of sin x = ½.',
    },
  },

  examples: [
    {
      title: 'Inverse trig values and compositions',
      problem: R`Find \(\sin^{-1}\left(-\frac{1}{2}\right)\), \(\cos^{-1}\left(\cos\frac{5\pi}{4}\right)\) and \(\tan\left(\cos^{-1}\frac{3}{5}\right)\).`,
      steps: [
        R`\(\sin^{-1}\left(-\frac{1}{2}\right)\): the angle in \(\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]\) with sine \(-\frac{1}{2}\) is \(-\frac{\pi}{6}\).`,
        R`\(\cos\frac{5\pi}{4} = -\frac{\sqrt{2}}{2}\). The angle in \([0, \pi]\) with that cosine is \(\frac{3\pi}{4}\), so \(\cos^{-1}\left(\cos\frac{5\pi}{4}\right) = \frac{3\pi}{4}\), not \(\frac{5\pi}{4}\).`,
        R`Let \(\theta = \cos^{-1}\frac{3}{5}\): a Quadrant I angle with \(x = 3\), \(r = 5\), so \(y = 4\). Then \(\tan\theta = \frac{4}{3}\).`,
      ],
      answer: R`\(-\dfrac{\pi}{6}\), \(\dfrac{3\pi}{4}\) and \(\dfrac{4}{3}\)`,
    },
    {
      title: 'An exact value from a sum formula',
      problem: R`Find the exact value of \(\cos 105^{\circ}\).`,
      steps: [
        R`Write \(105^{\circ} = 60^{\circ} + 45^{\circ}\).`,
        R`\(\cos(A + B) = \cos A\cos B - \sin A\sin B = \frac{1}{2} \cdot \frac{\sqrt{2}}{2} - \frac{\sqrt{3}}{2} \cdot \frac{\sqrt{2}}{2}\).`,
        R`\(= \frac{\sqrt{2}}{4} - \frac{\sqrt{6}}{4} = \frac{\sqrt{2} - \sqrt{6}}{4}\). It is negative, as it should be in Quadrant II.`,
      ],
      answer: R`\(\cos 105^{\circ} = \dfrac{\sqrt{2} - \sqrt{6}}{4}\)`,
    },
    {
      title: 'A quadratic trig equation',
      problem: R`Solve \(2\sin^{2} x - \sin x - 1 = 0\) for \(0 \le x < 2\pi\).`,
      steps: [
        R`Treat it as a quadratic in \(\sin x\) and factor: \((2\sin x + 1)(\sin x - 1) = 0\).`,
        R`\(\sin x = -\frac{1}{2}\): reference angle \(\frac{\pi}{6}\) in Quadrants III and IV, so \(x = \frac{7\pi}{6}, \frac{11\pi}{6}\).`,
        R`\(\sin x = 1\): \(x = \frac{\pi}{2}\).`,
      ],
      answer: R`\(x = \dfrac{\pi}{2},\ \dfrac{7\pi}{6},\ \dfrac{11\pi}{6}\)`,
      visual: {
        type: 'plot',
        x: [0, 2 * Math.PI],
        y: [-1.6, 2.4],
        piTicks: true,
        fns: [{ f: (x) => 2 * Math.sin(x) ** 2 - Math.sin(x) - 1 }],
        points: [{ x: Math.PI / 2, y: 0, label: 'π/2' }, { x: (7 * Math.PI) / 6, y: 0, label: '7π/6' }, { x: (11 * Math.PI) / 6, y: 0, label: '11π/6' }],
        alt: 'Graph of y = 2 sin²x − sin x − 1 from 0 to 2π. It touches the x-axis at x = π/2 and crosses it at x = 7π/6 and x = 11π/6: the three solutions.',
      },
    },
    {
      title: 'Word problem: the angle of a kick',
      word: true,
      problem: R`A ball kicked at speed \(v\) and angle \(\theta\) lands \(R = \dfrac{v^{2}}{g}\sin 2\theta\) away. With \(g = 10\) m/s², at what angles can a ball kicked at 20 m/s land 20 m away?`,
      steps: [
        R`Substitute: \(20 = \dfrac{20^{2}}{10}\sin 2\theta = 40\sin 2\theta\), so \(\sin 2\theta = \frac{1}{2}\).`,
        R`\(\theta\) is between \(0^{\circ}\) and \(90^{\circ}\), so \(2\theta\) is between \(0^{\circ}\) and \(180^{\circ}\): \(2\theta = 30^{\circ}\) or \(150^{\circ}\).`,
        R`Halve: \(\theta = 15^{\circ}\) or \(\theta = 75^{\circ}\). A low kick and a high kick land in the same place.`,
      ],
      answer: R`\(15^{\circ}\) or \(75^{\circ}\)`,
    },
  ],

  models: [
    {
      id: 'solve-basic-equation',
      title: 'Solve sin x = c, cos x = c or tan x = c',
      intro: 'Choose a function and a value. The model finds the calculator angle, the second angle in one turn, and the general solution, in degrees.',
      inputs: [
        { name: 'fn', label: 'Function', type: 'select', value: 'sin', options: [{ value: 'sin', label: 'sin x' }, { value: 'cos', label: 'cos x' }, { value: 'tan', label: 'tan x' }] },
        { name: 'c', label: 'Value c', type: 'number', min: -5, max: 5, step: 0.05, value: 0.5 },
      ],
      compute({ fn, c }) {
        if (fn !== 'tan' && Math.abs(c) > 1) return { error: `${fn} x is never greater than 1 or less than −1. Choose a value between −1 and 1, or switch to tan x.` };
        const p = toDeg(ATRIG[fn](c));
        const show = (d) => R`${num(d, { places: 1 })}^{\circ}`;
        const first = norm360(p);
        const second = fn === 'sin' ? norm360(180 - p) : fn === 'cos' ? norm360(-p) : norm360(p + 180);
        const sols = [...new Set([round(first, 1), round(second, 1)])].sort((u, w) => u - w);
        const steps = [
          R`The inverse function gives one angle: \(${INV[fn]}(${num(c)}) ${Number.isInteger(round(p, 6)) ? '=' : R`\approx`} ${show(p)}\).`,
          fn === 'sin' ? R`Sine has the same value at \(180^{\circ} - \theta\): \(180^{\circ} - (${show(p)}) = ${show(180 - p)}\).` : fn === 'cos' ? R`Cosine has the same value at \(-\theta\), which is coterminal with \(360^{\circ} - \theta\): \(${show(norm360(-p))}\).` : R`Tangent repeats every \(180^{\circ}\): \(${show(p)} + 180^{\circ} = ${show(p + 180)}\).`,
          R`Solutions with \(0^{\circ} \le x < 360^{\circ}\): \(${sols.map(show).join(R`,\ `)}\).`,
          fn === 'tan' ? R`General solution: \(x = ${show(norm360(p) % 180)} + 180^{\circ}k\) for any integer \(k\).` : sols.length === 1 ? R`General solution: \(x = ${show(sols[0])} + 360^{\circ}k\) for any integer \(k\).` : R`General solution: \(x = ${show(sols[0])} + 360^{\circ}k\) or \(x = ${show(sols[1])} + 360^{\circ}k\) for any integer \(k\).`,
        ];
        const f = (x) => TRIG[fn](toRad(x));
        return {
          problem: R`Solve \(${T(fn)} x = ${num(c)}\).`,
          steps,
          answer: R`\(x ${Number.isInteger(round(p, 6)) ? '=' : R`\approx`} ${sols.map(show).join(R`\text{ or }`)}\) in one turn`,
          visual: {
            type: 'plot',
            x: [0, 360],
            y: fn === 'tan' ? [-6, 6] : [-1.5, 1.5],
            step: [90, fn === 'tan' ? 2 : 0.5],
            fns: [{ f }],
            hlines: [{ y: c }],
            points: sols.map((d) => ({ x: d, y: c, label: `${txt(d, { places: 1 })}°` })),
            axisLabels: ['x (degrees)', ''],
            alt: `Graph of y = ${fn} x from 0° to 360° with the dashed horizontal line y = ${txt(c)}. The line meets the curve at x = ${sols.map((d) => `${txt(d, { places: 1 })}°`).join(' and x = ')}.`,
          },
        };
      },
    },
    {
      id: 'launch-angle',
      title: 'Word problem: launch angle for a given range',
      word: true,
      intro: 'A ball kicked at speed v and angle θ lands R = (v²/g)·sin 2θ away, with g = 9.8 m/s². Choose the speed and the distance.',
      inputs: [
        { name: 'v', label: 'Launch speed (m/s)', type: 'int', min: 5, max: 60, value: 20 },
        { name: 'dist', label: 'Distance to land (m)', type: 'int', min: 1, max: 350, value: 30 },
      ],
      compute({ v, dist }) {
        const max = (v * v) / 9.8;
        if (dist > max) return { error: `At ${v} m/s the ball can travel at most ${txt(max, { places: 1 })} m (when θ = 45°). Choose a shorter distance or a higher speed.` };
        const s = dist / max;
        const two = toDeg(Math.asin(s));
        const [lo, hi] = [two / 2, 90 - two / 2];
        return {
          problem: `A ball is kicked at ${v} m/s and must land ${dist} m away. At what angle should it be kicked?`,
          steps: [
            R`Substitute into \(R = \dfrac{v^{2}}{g}\sin 2\theta\): \(${dist} = \dfrac{${v}^{2}}{9.8}\sin 2\theta\), so \(\sin 2\theta = \dfrac{${dist} \cdot 9.8}{${v * v}} \approx ${num(s, { places: 4 })}\).`,
            R`The inverse sine gives \(2\theta \approx ${num(two, { places: 1 })}^{\circ}\). Sine has the same value at \(180^{\circ} - ${num(two, { places: 1 })}^{\circ} = ${num(180 - two, { places: 1 })}^{\circ}\).`,
            R`Halve both: \(\theta \approx ${num(lo, { places: 1 })}^{\circ}\) or \(\theta \approx ${num(hi, { places: 1 })}^{\circ}\).`,
            'The two angles add up to 90°: a low, flat kick and a high, steep one cover the same distance.',
          ],
          answer: R`About \(${num(lo, { places: 1 })}^{\circ}\) or \(${num(hi, { places: 1 })}^{\circ}\)`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyInverseValue, easySimplify, easyPythagoreanValue],
    medium: [mediumSumDifference, mediumDoubleAngle, mediumSolveBasic, mediumInverseAngle],
    hard: [hardInverseComposition, hardSolveQuadratic, hardGeneralSolution, hardSumFractions],
    challenge: [challengeIdentityEquation, challengeCountSolutions, challengeProjectile],
  },
};
