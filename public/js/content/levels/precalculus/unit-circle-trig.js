import { R, q, frac, tryFrac, num, txt, gcd, round, checkEqual } from '../../lib/index.js';
import { M, Surd, surd, SPECIAL, TRIG, toRad, norm360, refAngle, quadrant, sinDeg, cosDeg, trigDeg, piTex, piText, radTex } from './_shared.js';

const QUAD = ['', 'I', 'II', 'III', 'IV'];
// The LaTeX command for a function name: T('sin') → "\sin".
const T = (name) => `\\${name}`;
const degFmt = (v) => R`\(${num(v)}^{\circ}\)`;
// A trig function applied to an angle: ap('sin', '\frac{\pi}{6}') → "\sin\left(\frac{\pi}{6}\right)"; short angles need no brackets.
const ap = (fn, angleTex) => (/frac|-/.test(angleTex) ? R`${T(fn)}\left(${angleTex}\right)` : R`${T(fn)} ${angleTex}`);
const RECIP = { sin: 'csc', cos: 'sec', tan: 'cot', csc: 'sin', sec: 'cos', cot: 'tan' };
const COFN = { sin: 'cos', cos: 'sin', tan: 'cot', csc: 'sec', sec: 'csc', cot: 'tan' };
const BASE = { sin: 'sin', cos: 'cos', tan: 'tan', csc: 'sin', sec: 'cos', cot: 'tan' };
// Sign (+1/−1) of sin, cos or tan in quadrant 1–4.
const signIn = (fn, qd) => ({ sin: [1, 1, -1, -1], cos: [1, -1, -1, 1], tan: [1, -1, 1, -1] })[BASE[fn]][qd - 1];
const S = (v) => M(v.tex());
// The unit circle with the point at an angle (degrees) marked.
const circlePlot = (deg, alt, extra = {}) => {
  const [x, y] = [Math.cos(toRad(deg)), Math.sin(toRad(deg))];
  return {
    type: 'plot',
    x: [-1.4, 1.4],
    y: [-1.4, 1.4],
    square: true,
    step: [1, 1],
    param: [{ x: Math.cos, y: Math.sin, t: [0, 2 * Math.PI] }],
    segments: [{ from: [0, 0], to: [x, y] }, { from: [x, y], to: [x, 0], dashed: true, color: 'c' }],
    points: [{ x, y, label: extra.label }],
    alt,
  };
};

// ───────────── Easy ─────────────

function easyConvert(rng) {
  const deg = rng.pick([30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 15, 75, 105, 20, 40, 72, 36, 100, 540, 450, 405, -90, -45, -120, -210]);
  if (rng.bool()) {
    return q({
      prompt: R`Convert \(${deg}^{\circ}\) to radians.`,
      correct: M(radTex(deg)),
      wrong: [
        { value: M(piTex(deg, 360)), why: R`\(\pi\) radians is \(180^{\circ}\), so multiply the degrees by \(\frac{\pi}{180}\).` },
        { value: M(piTex(180, deg)), why: R`To go from degrees to radians multiply by \(\frac{\pi}{180}\), not \(\frac{180}{\pi}\).` },
        M(piTex(deg, 90)),
        M(piTex(deg, 120)),
      ],
      solution: [R`\(180^{\circ} = \pi\) radians, so multiply by \(\dfrac{\pi}{180^{\circ}}\).`, R`\(${deg}^{\circ} \cdot \dfrac{\pi}{180^{\circ}} = ${radTex(deg)}\).`],
      rule: 0,
      skill: 'degrees and radians',
    });
  }
  return q({
    prompt: R`Convert \(${radTex(deg)}\) radians to degrees.`,
    correct: deg,
    fmt: degFmt,
    wrong: [
      { value: deg * 2, why: R`\(\pi\) radians is \(180^{\circ}\). A full turn, \(2\pi\), is \(360^{\circ}\).` },
      { value: deg / 2, why: R`\(\pi\) radians is \(180^{\circ}\), not \(90^{\circ}\).` },
      deg + 30,
      deg - 15,
      deg + 60,
    ],
    solution: [R`\(\pi\) radians \(= 180^{\circ}\), so replace \(\pi\) with \(180^{\circ}\) (multiply by \(\frac{180^{\circ}}{\pi}\)).`, R`\(${radTex(deg)} \cdot \dfrac{180^{\circ}}{\pi} = ${deg}^{\circ}\).`],
    rule: 0,
    skill: 'degrees and radians',
  });
}

function easyExactValue(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const d = rng.pick(fn === 'tan' ? [0, 30, 45, 60] : [0, 30, 45, 60, 90]);
  const angle = rng.bool() ? R`${d}^{\circ}` : radTex(d);
  const v = trigDeg(fn, d);
  const co = trigDeg(COFN[fn], d);
  const pool = [surd(1, 2), surd(1, 2, 2), surd(1, 2, 3), surd(1, 3, 3), surd(1, 1, 3), surd(1), surd(0)];
  return q({
    prompt: R`What is the exact value of \(${ap(fn, angle)}\)?`,
    correct: S(v),
    wrong: [
      co && !co.eq(v) ? { value: S(co), why: R`That is \(${ap(COFN[fn], angle)}\).` } : null,
      ...rng.shuffle(pool.filter((p) => !p.eq(v))).map(S),
    ],
    solution: [
      d % 90 === 0
        ? R`The angle \(${angle}\) points along an axis: its point on the unit circle is \(\left(${cosDeg(d).tex()},\ ${sinDeg(d).tex()}\right)\).`
        : R`The point on the unit circle at \(${angle}\) is \(\left(${cosDeg(d).tex()},\ ${sinDeg(d).tex()}\right)\): the \(x\)-coordinate is the cosine and the \(y\)-coordinate is the sine.`,
      fn === 'tan' ? R`\(\tan\theta = \dfrac{\sin\theta}{\cos\theta}\), so \(${ap(fn, angle)} = ${v.tex()}\).` : R`So \(${ap(fn, angle)} = ${v.tex()}\).`,
    ],
    rule: 2,
    skill: 'exact values',
    check: () => checkEqual(v.value, TRIG[fn](toRad(d))),
  });
}

function easyQuadrant(rng) {
  const qd = rng.int(1, 4);
  const [b1, b2] = rng.pick([['sin', 'cos'], ['sin', 'tan'], ['cos', 'tan']]);
  const [f1, f2] = [rng.bool(0.3) ? RECIP[b1] : b1, rng.bool(0.3) ? RECIP[b2] : b2];
  const cond = (f) => R`${T(f)}\theta ${signIn(f, qd) > 0 ? '>' : '<'} 0`;
  const where = (f) => [1, 2, 3, 4].filter((k) => signIn(f, k) === signIn(f, qd)).map((k) => QUAD[k]).join(' and ');
  const fails = (k) => (signIn(f1, k) !== signIn(f1, qd) ? f1 : f2);
  return q({
    prompt: R`If \(${cond(f1)}\) and \(${cond(f2)}\), in which quadrant does the terminal side of \(\theta\) lie?`,
    correct: `Quadrant ${QUAD[qd]}`,
    wrong: [1, 2, 3, 4].filter((k) => k !== qd).map((k) => ({ value: `Quadrant ${QUAD[k]}`, why: R`In Quadrant ${QUAD[k]}, \(${T(fails(k))}\theta\) is ${signIn(fails(k), k) > 0 ? 'positive' : 'negative'}.` })),
    solution: [
      R`\(${cond(f1)}\) in Quadrants ${where(f1)}${f1 !== b1 ? R` (\(${T(f1)}\) has the same sign as \(${T(b1)}\))` : ''}.`,
      R`\(${cond(f2)}\) in Quadrants ${where(f2)}${f2 !== b2 ? R` (\(${T(f2)}\) has the same sign as \(${T(b2)}\))` : ''}.`,
      `Both are true only in Quadrant ${QUAD[qd]}.`,
    ],
    rule: 3,
    skill: 'signs by quadrant',
    check: () => {
      const ok = (k) => [f1, f2].every((f) => Math.sign(TRIG[f](toRad(90 * k - 50))) === signIn(f, qd));
      return ok(qd) && [1, 2, 3, 4].filter((k) => k !== qd).every((k) => !ok(k)) ? true : 'conditions do not single out the quadrant';
    },
  });
}

function easyReference(rng) {
  if (rng.bool()) {
    const a = rng.pick([rng.int(95, 175), rng.int(185, 265), rng.int(275, 355)]);
    const ref = refAngle(a);
    return q({
      prompt: R`What is the reference angle of \(${a}^{\circ}\)?`,
      correct: ref,
      fmt: degFmt,
      wrong: [
        { value: Math.abs(a - (a < 180 ? 90 : 270)), why: R`A reference angle is measured to the \(x\)-axis, not the \(y\)-axis.` },
        { value: a < 180 ? a - 90 + 0 : a > 270 ? a - 180 : 360 - a, why: R`Find the acute angle between the terminal side and the nearer half of the \(x\)-axis.` },
        ref + 10,
        90 - ref === ref ? ref + 20 : 180 - ref,
      ].filter((w) => (w.value ?? w) > 0),
      solution: [
        R`\(${a}^{\circ}\) is in Quadrant ${QUAD[quadrant(a)]}.`,
        a < 180 ? R`In Quadrant II the reference angle is \(180^{\circ} - ${a}^{\circ} = ${ref}^{\circ}\).` : a < 270 ? R`In Quadrant III the reference angle is \(${a}^{\circ} - 180^{\circ} = ${ref}^{\circ}\).` : R`In Quadrant IV the reference angle is \(360^{\circ} - ${a}^{\circ} = ${ref}^{\circ}\).`,
      ],
      rule: 3,
      skill: 'reference angles',
      check: () => checkEqual(Math.abs(Math.sin(toRad(ref))), Math.abs(Math.sin(toRad(a)))) === true && ref > 0 && ref < 90,
    });
  }
  const a = rng.bool() ? -rng.int(10, 700) : rng.int(370, 1050);
  if (a % 360 === 0) return easyReference(rng);
  const c = norm360(a);
  return q({
    prompt: R`Which angle between \(0^{\circ}\) and \(360^{\circ}\) is coterminal with \(${a}^{\circ}\)?`,
    correct: c,
    fmt: degFmt,
    wrong: [
      a < 0 ? { value: norm360(-a), why: R`Coterminal angles differ by full turns. Add \(360^{\circ}\) until the angle is positive; do not just drop the minus sign.` } : { value: a % 180 === c ? c + 180 : a % 180, why: R`Subtract full turns of \(360^{\circ}\), not half turns.` },
      360 - c,
      (c + 180) % 360,
      (c + 90) % 360,
      (c + 270) % 360,
    ].filter((w) => (w.value ?? w) > 0),
    solution: [
      a < 0 ? R`Add \(360^{\circ}\) until the result is between \(0^{\circ}\) and \(360^{\circ}\): \(${a}^{\circ} + ${(c - a) / 360} \cdot 360^{\circ} = ${c}^{\circ}\).` : R`Subtract \(360^{\circ}\) until the result is between \(0^{\circ}\) and \(360^{\circ}\): \(${a}^{\circ} - ${(a - c) / 360} \cdot 360^{\circ} = ${c}^{\circ}\).`,
      R`\(${a}^{\circ}\) and \(${c}^{\circ}\) end at the same terminal side, so they have the same trig values.`,
    ],
    rule: 3,
    skill: 'coterminal angles',
    check: () => ((a - c) % 360 === 0 && c > 0 && c < 360 ? true : 'not coterminal'),
  });
}

// ───────────── Medium ─────────────

// Wrong exact values for a question whose answer is v: sign slip first, then the co-function value, then other table values.
function exactWrongs(rng, fn, d, v) {
  const ref = refAngle(d);
  const co = trigDeg(COFN[fn], ref);
  const signed = co && (v.value < 0 ? co.abs().neg() : co.abs());
  const pool = (fn === 'tan' ? [surd(1, 3, 3), surd(1), surd(1, 1, 3)] : [surd(1, 2), surd(1, 2, 2), surd(1, 2, 3), surd(1)]).flatMap((p) => [p, p.neg()]).concat(surd(0));
  const qd = quadrant(d);
  return [
    !v.isZero() ? { value: S(v.neg()), why: qd ? R`In Quadrant ${QUAD[qd]}, \(${T(BASE[fn])}\) is ${signIn(fn, qd) > 0 ? 'positive' : 'negative'}${fn !== BASE[fn] ? R`, and \(${T(fn)}\) has the same sign` : ''}.` : 'Check the sign of the coordinate on the axis.' } : null,
    signed && !signed.eq(v) ? { value: S(signed), why: R`The reference angle is \(${radTex(ref)}\). That value belongs to \(${T(COFN[fn])}\) of the reference angle.` } : null,
    ...rng.shuffle(pool.filter((p) => !p.eq(v))).map(S),
  ];
}

function exactSteps(fn, d, angleTex, v) {
  const qd = quadrant(d);
  const ref = refAngle(d);
  const base = trigDeg(fn, ref);
  if (!qd) return [R`\(${angleTex}\) lies on an axis. Its point on the unit circle is \(\left(${cosDeg(d).tex()},\ ${sinDeg(d).tex()}\right)\).`, R`So \(${ap(fn, angleTex)} = ${v.tex()}\).`];
  return [
    R`\(${angleTex}\) is in Quadrant ${QUAD[qd]}, and its reference angle is \(${radTex(ref)}\).`,
    R`\(${ap(fn, radTex(ref))} = ${base.tex()}\).`,
    R`In Quadrant ${QUAD[qd]}, \(${T(fn)}\) is ${signIn(fn, qd) > 0 ? 'positive' : 'negative'}, so \(${ap(fn, angleTex)} = ${v.tex()}\).`,
  ];
}

function mediumExactAnyQuadrant(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const d = rng.pick(SPECIAL.filter((a) => a > 90 && trigDeg(fn, a)));
  const v = trigDeg(fn, d);
  const angle = radTex(d);
  return q({
    prompt: R`Find the exact value of \(${ap(fn, angle)}\).`,
    correct: S(v),
    wrong: exactWrongs(rng, fn, d, v),
    solution: exactSteps(fn, d, angle, v),
    rule: 3,
    skill: 'exact values in any quadrant',
    check: () => checkEqual(v.value, TRIG[fn](toRad(d))),
  });
}

function mediumReciprocal(rng) {
  const fn = rng.pick(['csc', 'sec', 'cot']);
  const d = rng.pick(SPECIAL.filter((a) => trigDeg(fn, a) && a % 90 !== 0));
  const v = trigDeg(fn, d);
  const base = trigDeg(RECIP[fn], d);
  const angle = radTex(d);
  const other = trigDeg(fn === 'csc' ? 'sec' : fn === 'sec' ? 'csc' : 'tan', d);
  return q({
    prompt: R`Find the exact value of \(${ap(fn, angle)}\).`,
    correct: S(v),
    wrong: [
      !base.eq(v) ? { value: S(base), why: R`That is \(${ap(RECIP[fn], angle)}\). \(${T(fn)}\) is its reciprocal.` } : null,
      other && !other.eq(v) ? { value: S(other), why: fn === 'cot' ? R`\(\cot\theta = \dfrac{\cos\theta}{\sin\theta}\), the reciprocal of \(\tan\theta\).` : R`\(\csc\) is the reciprocal of \(\sin\), and \(\sec\) is the reciprocal of \(\cos\).` } : null,
      S(v.neg()),
      S(base.neg()),
      ...rng.shuffle([surd(2), surd(1, 1, 2), surd(2, 3, 3), surd(1, 1, 3), surd(1, 3, 3), surd(1)].flatMap((p) => [p, p.neg()]).filter((p) => !p.eq(v))).map(S),
    ],
    solution: [
      R`\(${T(fn)}\theta = ${fn === 'csc' ? R`\dfrac{1}{\sin\theta}` : fn === 'sec' ? R`\dfrac{1}{\cos\theta}` : R`\dfrac{\cos\theta}{\sin\theta}`}\).`,
      fn === 'cot' ? R`\(${ap('cos', angle)} = ${cosDeg(d).tex()}\) and \(${ap('sin', angle)} = ${sinDeg(d).tex()}\).` : R`\(${ap(RECIP[fn], angle)} = ${base.tex()}\).`,
      R`${fn === 'cot' ? 'Divide' : 'Take the reciprocal'} and simplify: \(${ap(fn, angle)} = ${v.tex()}\).`,
    ],
    rule: 4,
    skill: 'reciprocal functions',
    check: () => checkEqual(v.value, TRIG[fn](toRad(d))),
  });
}

function mediumNotDefined(rng) {
  const all = [];
  for (const fn of ['tan', 'sec', 'csc', 'cot']) for (const d of [0, 90, 180, 270, 360, -90]) all.push({ fn, d, ok: trigDeg(fn, d) != null });
  for (const d of [0, 90, 180, 270]) all.push({ fn: 'sin', d, ok: true }, { fn: 'cos', d, ok: true });
  const bad = rng.pick(all.filter((c) => !c.ok));
  const good = rng.sample(all.filter((c) => c.ok), 3);
  const show = (c) => M(ap(c.fn, radTex(c.d)));
  const zero = bad.fn === 'tan' || bad.fn === 'sec' ? 'cos' : 'sin';
  return q({
    prompt: 'Which of these values is **not** defined?',
    correct: show(bad),
    wrong: good.map((c) => ({ value: show(c), why: R`\(${ap(c.fn, radTex(c.d))} = ${trigDeg(c.fn, c.d).tex()}\), which is a real number.` })),
    solution: [
      R`\(\tan\theta = \dfrac{\sin\theta}{\cos\theta}\) and \(\sec\theta = \dfrac{1}{\cos\theta}\) are not defined where \(\cos\theta = 0\). \(\cot\theta = \dfrac{\cos\theta}{\sin\theta}\) and \(\csc\theta = \dfrac{1}{\sin\theta}\) are not defined where \(\sin\theta = 0\).`,
      R`\(${ap(zero, radTex(bad.d))} = 0\), so \(${ap(bad.fn, radTex(bad.d))}\) would need division by zero. It is not defined.`,
    ],
    rule: 4,
    skill: 'where trig functions are defined',
    check: () => (Math.abs(TRIG[zero](toRad(bad.d))) < 1e-12 && good.every((c) => Math.abs(TRIG[c.fn](toRad(c.d))) < 1e6) ? true : 'wrong classification'),
  });
}

function mediumArcLength(rng) {
  const r = rng.pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24]);
  const deg = rng.pick([30, 45, 60, 90, 120, 135, 150, 210, 240, 270, 300]);
  const inDegrees = rng.bool(0.6);
  const [story, unit] = rng.pick([
    [(a) => `The tip of a windscreen wiper is ${r} cm from its pivot and sweeps through an angle of ${a}.`, 'cm'],
    [(a) => `A pendulum ${r} cm long swings through an angle of ${a}.`, 'cm'],
    [(a) => `A child on a roundabout sits ${r} m from the centre and rides through an angle of ${a}.`, 'm'],
    [(a) => `A car on a Ferris wheel is ${r} m from the axle and turns through an angle of ${a}.`, 'm'],
  ].slice(deg > 150 ? 2 : 0));
  const angle = inDegrees ? R`\(${deg}^{\circ}\)` : R`\(${radTex(deg)}\) radians`;
  const len = (tex) => R`\(${tex}\) ${unit}`;
  return q({
    prompt: `${story(angle)} How long is the arc that is traced out?`,
    correct: len(piTex(r * deg, 180)),
    wrong: [
      inDegrees ? { value: len(num(r * deg)), why: R`The formula \(s = r\theta\) needs \(\theta\) in radians. Convert \(${deg}^{\circ}\) first.` } : null,
      { value: len(piTex(r * r * deg, 360)), why: R`\(\frac{1}{2}r^{2}\theta\) is the area of the sector. Arc length is \(s = r\theta\).` },
      { value: len(piTex(2 * r * deg, 180)), why: R`Use the radius, \(${r}\), not the diameter.` },
      len(piTex(r * deg, 360)),
      len(piTex(deg, 180)),
    ],
    solution: [
      inDegrees ? R`Convert the angle to radians: \(${deg}^{\circ} \cdot \dfrac{\pi}{180^{\circ}} = ${radTex(deg)}\).` : R`The angle is already in radians: \(\theta = ${radTex(deg)}\).`,
      R`Arc length: \(s = r\theta = ${r} \cdot ${radTex(deg)} = ${piTex(r * deg, 180)}\) ${unit}.`,
    ],
    rule: 0,
    skill: 'arc length',
    // Second method: the arc is the fraction deg/360 of the whole circumference 2πr.
    check: () => checkEqual(((r * deg) / 180) * Math.PI, (deg / 360) * 2 * Math.PI * r),
  });
}

const SHIFTS = [
  { tex: (t) => `${t} + 2\\pi`, f: (t) => t + 2 * Math.PI, sign: { sin: 1, cos: 1, tan: 1 }, why: R`Adding a full turn \(2\pi\) brings you back to the same point of the unit circle.` },
  { tex: (t) => `-${t}`, f: (t) => -t, sign: { sin: -1, cos: 1, tan: -1 }, why: R`Cosine is even, \(\cos(-\theta) = \cos\theta\). Sine and tangent are odd: \(\sin(-\theta) = -\sin\theta\) and \(\tan(-\theta) = -\tan\theta\).` },
  { tex: (t) => `${t} + \\pi`, f: (t) => t + Math.PI, sign: { sin: -1, cos: -1, tan: 1 }, why: R`Adding \(\pi\) moves to the opposite point of the unit circle, so sine and cosine both change sign. Their quotient, tangent, does not: its period is \(\pi\).` },
  { tex: (t) => `\\pi - ${t}`, f: (t) => Math.PI - t, sign: { sin: 1, cos: -1, tan: -1 }, why: R`\(\pi - \theta\) is the mirror image of \(\theta\) in the \(y\)-axis: the \(y\)-coordinate (sine) stays and the \(x\)-coordinate (cosine) changes sign.` },
  { tex: (t) => `2\\pi - ${t}`, f: (t) => 2 * Math.PI - t, sign: { sin: -1, cos: 1, tan: -1 }, why: R`\(2\pi - \theta\) is coterminal with \(-\theta\): the mirror image in the \(x\)-axis. Cosine stays and sine changes sign.` },
];

function mediumSymmetry(rng) {
  const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]);
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const sg = rng.sign();
  const v = fn === 'tan' ? frac(sg * a, b) : frac(sg * rng.pick([a, b]), c);
  const sh = rng.pick(SHIFTS);
  const ans = sh.sign[fn] > 0 ? v : v.neg();
  const other = fn === 'tan' ? v.inv() : frac(Math.round(Math.sqrt(c * c - v.n * v.n)), c);
  const theta = fn === 'sin' ? Math.asin(v.value) : fn === 'cos' ? Math.acos(v.value) : Math.atan(v.value);
  return q({
    prompt: R`If \(${T(fn)}\theta = ${v.tex()}\), what is \(${T(fn)}(${sh.tex(R`\theta`)})\)?`,
    correct: ans,
    wrong: [{ value: ans.neg(), why: sh.why }, other, other.neg(), frac(1, 1).sub(v.abs())],
    solution: [sh.why, R`So \(${T(fn)}(${sh.tex(R`\theta`)}) = ${sh.sign[fn] > 0 ? '' : '-'}${T(fn)}\theta = ${ans.tex()}\).`],
    rule: 5,
    skill: 'periodicity and symmetry',
    check: () => checkEqual(TRIG[fn](sh.f(theta)), ans.value),
  });
}

function mediumPeriodTable(rng) {
  const P = rng.int(4, 6);
  const ys = rng.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], P);
  const N = rng.bool(0.3) ? -rng.int(2, 15) : rng.int(P + 3, 70);
  const r = ((N % P) + P) % P;
  const k = (N - r) / P;
  return q({
    prompt: R`A function \(f\) is periodic with period \(${P}\). The table shows its values over one full cycle. Find \(f(${N})\).`,
    visual: {
      type: 'table',
      headers: [M('x'), ...ys.map((_, i) => M(i))],
      rows: [[M('f(x)'), ...ys.map((y) => M(num(y)))]],
      rowHeaders: true,
      alt: `Table of one cycle. x: ${ys.map((_, i) => i).join(', ')}. f(x): ${ys.join(', ')}.`,
    },
    correct: ys[r],
    wrong: [
      { value: ys[Math.abs(N) % (P - 1)], why: R`The period is \(${P}\): the values repeat every \(${P}\) units, so reduce \(${N}\) by multiples of \(${P}\).` },
      N < 0 ? { value: ys[Math.abs(N) % P], why: R`For a negative input, add multiples of \(${P}\) until it lands in the table: \(${N} + ${-k} \cdot ${P} = ${r}\).` } : null,
      ...rng.shuffle(ys.filter((y) => y !== ys[r])),
    ],
    solution: [
      R`A function with period \(${P}\) satisfies \(f(x + ${P}) = f(x)\), so adding or subtracting multiples of \(${P}\) does not change the output.`,
      R`\(${N} = ${k < 0 ? `(${k})` : k} \cdot ${P} + ${r}\), so \(f(${N}) = f(${r})\).`,
      R`From the table, \(f(${r}) = ${ys[r]}\).`,
    ],
    rule: 5,
    skill: 'periodic functions',
    check: () => ((N - r) % P === 0 && r >= 0 && r < P ? true : 'remainder is wrong'),
  });
}

// ───────────── Hard ─────────────

// Points in the first quadrant as [x, y, r] in the form [n, radicand]: value n·√radicand.
const LEGS = [
  [[3, 1], [4, 1], [5, 1]], [[4, 1], [3, 1], [5, 1]], [[5, 1], [12, 1], [13, 1]], [[12, 1], [5, 1], [13, 1]], [[8, 1], [15, 1], [17, 1]], [[15, 1], [8, 1], [17, 1]],
  [[7, 1], [24, 1], [25, 1]], [[24, 1], [7, 1], [25, 1]], [[1, 5], [2, 1], [3, 1]], [[2, 1], [1, 5], [3, 1]], [[1, 1], [2, 1], [1, 5]], [[2, 1], [1, 1], [1, 5]],
  [[1, 1], [3, 1], [1, 10]], [[1, 7], [3, 1], [4, 1]], [[3, 1], [1, 7], [4, 1]], [[1, 1], [1, 2], [1, 3]], [[2, 1], [3, 1], [1, 13]], [[1, 3], [1, 6], [3, 1]],
];

function sixValues(x, y, r) {
  return { sin: y.div(r), cos: x.div(r), tan: y.div(x), csc: r.div(y), sec: r.div(x), cot: x.div(y) };
}

function hardSixFromOne(rng) {
  const [lx, ly, lr] = rng.pick(LEGS);
  const qd = rng.int(1, 4);
  const x = surd(signIn('cos', qd) * lx[0], 1, lx[1]);
  const y = surd(signIn('sin', qd) * ly[0], 1, ly[1]);
  const r = surd(lr[0], 1, lr[1]);
  const vals = sixValues(x, y, r);
  const g = rng.pick(['sin', 'cos', 'tan']);
  const h = rng.pick(['sin', 'cos', 'tan', 'csc', 'sec', 'cot'].filter((f) => f !== g && f !== RECIP[g]));
  const second = rng.pick(['sin', 'cos', 'tan'].filter((f) => f !== g));
  const where = rng.bool() ? R`\(\theta\) is in Quadrant ${QUAD[qd]}` : R`\(${T(second)}\theta ${signIn(second, qd) > 0 ? '>' : '<'} 0\)`;
  const ans = vals[h];
  const sq = (s) => s.sq().tex();
  const find = g === 'sin'
    ? [R`\(\sin\theta = \dfrac{y}{r}\): take \(y = ${y.tex()}\) and \(r = ${r.tex()}\). Then \(x^{2} = r^{2} - y^{2} = ${sq(r)} - ${sq(y)} = ${sq(x)}\).`, R`In Quadrant ${QUAD[qd]}, \(x\) is ${x.value > 0 ? 'positive' : 'negative'}: \(x = ${x.tex()}\).`]
    : g === 'cos'
      ? [R`\(\cos\theta = \dfrac{x}{r}\): take \(x = ${x.tex()}\) and \(r = ${r.tex()}\). Then \(y^{2} = r^{2} - x^{2} = ${sq(r)} - ${sq(x)} = ${sq(y)}\).`, R`In Quadrant ${QUAD[qd]}, \(y\) is ${y.value > 0 ? 'positive' : 'negative'}: \(y = ${y.tex()}\).`]
      : [R`\(\tan\theta = \dfrac{y}{x}\), and in Quadrant ${QUAD[qd]} the signs are \(x = ${x.tex()}\), \(y = ${y.tex()}\).`, R`\(r^{2} = x^{2} + y^{2} = ${sq(x)} + ${sq(y)} = ${sq(r)}\), so \(r = ${r.tex()}\) (always positive).`];
  const ratio = { sin: R`\dfrac{y}{r}`, cos: R`\dfrac{x}{r}`, tan: R`\dfrac{y}{x}`, csc: R`\dfrac{r}{y}`, sec: R`\dfrac{r}{x}`, cot: R`\dfrac{x}{y}` };
  return q({
    prompt: R`Given \(${T(g)}\theta = ${vals[g].tex()}\) and ${where}, find \(${T(h)}\theta\).`,
    correct: S(ans),
    wrong: [
      { value: S(ans.neg()), why: R`Check the quadrant: the conditions put \(\theta\) in Quadrant ${QUAD[qd]}, where \(${T(h)}\) is ${ans.value > 0 ? 'positive' : 'negative'}.` },
      !vals[RECIP[h]].eq(ans) ? { value: S(vals[RECIP[h]]), why: R`That is \(${T(RECIP[h])}\theta\), the reciprocal of what is asked.` } : null,
      !vals[COFN[h]].eq(ans) ? { value: S(vals[COFN[h]]), why: R`That is \(${T(COFN[h])}\theta\). Check which two of \(x\), \(y\), \(r\) the ratio uses.` } : null,
      S(vals[RECIP[h]].neg()),
      S(vals[COFN[h]].neg()),
      S(vals[g].neg()),
    ],
    solution: [
      second && !where.includes('Quadrant') ? R`\(${T(g)}\theta\) is ${vals[g].value > 0 ? 'positive' : 'negative'} and \(${T(second)}\theta\) is ${signIn(second, qd) > 0 ? 'positive' : 'negative'}, so \(\theta\) is in Quadrant ${QUAD[qd]}.` : R`Think of a point \((x, y)\) on the terminal side, at distance \(r\) from the origin.`,
      ...find,
      R`\(${T(h)}\theta = ${ratio[h]} = ${ans.tex()}\).`,
    ],
    rule: 7,
    skill: 'all six functions from one',
    check: () => {
      const t = Math.atan2(y.value, x.value);
      return checkEqual(TRIG[g](t), vals[g].value) === true && checkEqual(TRIG[h](t), ans.value);
    },
  });
}

function hardTangentGraph(rng) {
  const variants = [];
  for (const [b, bTex] of [[1, 'x'], [2, '2x'], [0.5, R`\frac{x}{2}`]]) for (const s of [1, -1]) for (const a of [1, 2]) variants.push({ a, b, s, tex: M(`y = ${s < 0 ? '-' : ''}${a === 1 ? '' : a}\\tan ${bTex}`), f: (x) => s * a * Math.tan(b * x) });
  const v = rng.pick(variants);
  const wrongs = [
    ...variants.filter((w) => w.b !== v.b && w.s === v.s && w.a === v.a).map((w) => ({ value: w.tex, why: R`Neighbouring asymptotes are \(${v.b === 0.5 ? piTex(2) : piTex(1, v.b)}\) apart, and that distance is the period. For \(\tan bx\) the period is \(\frac{\pi}{b}\).` })),
    { value: variants.find((w) => w.b === v.b && w.s === -v.s && w.a === v.a).tex, why: `Each branch of this graph ${v.s > 0 ? 'rises' : 'falls'} from left to right. A negative sign in front flips the branches.` },
    { value: variants.find((w) => w.b === v.b && w.s === v.s && w.a !== v.a).tex, why: R`Check the marked point: a quarter of a period after a zero, \(\tan\) equals 1, so the height there is the multiplier.` },
  ];
  const asym = [];
  for (let k = -4; k <= 4; k++) {
    const x = (Math.PI / 2 + k * Math.PI) / v.b;
    if (Math.abs(x) < 2 * Math.PI + 0.01) asym.push(x);
  }
  const px = Math.PI / (4 * v.b);
  const half = [1, 2 * v.b];
  const per = v.b === 0.5 ? piTex(2) : piTex(1, v.b);
  const perText = v.b === 0.5 ? piText(2) : piText(1, v.b);
  return q({
    prompt: 'Which function has this graph? (The horizontal axis is in radians.)',
    visual: {
      type: 'plot',
      x: [-2 * Math.PI, 2 * Math.PI],
      y: [-5, 5],
      piTicks: true,
      fns: [{ f: v.f }],
      vlines: asym.map((x) => ({ x })),
      points: [{ x: px, y: v.s * v.a, label: `(${piText(1, 4 * v.b)}, ${v.s * v.a})`.replace('-', '−') }],
      alt: `Graph of a tangent-type function. It has a zero at x = 0, vertical asymptotes at x = ${piText(half[0], half[1])} and x = −${piText(half[0], half[1])} that repeat every ${perText}, and it passes through the point (${piText(1, 4 * v.b)}, ${v.s * v.a}). Each branch ${v.s > 0 ? 'rises' : 'falls'} from left to right.`,
    },
    key: `tan-graph-${v.a}-${v.b}-${v.s}`,
    correct: v.tex,
    wrong: wrongs,
    solution: [
      R`Neighbouring asymptotes are \(${per}\) apart, so the period is \(${per}\). Since the period of \(\tan bx\) is \(\dfrac{\pi}{b}\), \(b = ${v.b === 0.5 ? R`\frac{1}{2}` : v.b}\).`,
      `Each branch ${v.s > 0 ? 'rises' : 'falls'} from left to right, so the multiplier in front is ${v.s > 0 ? 'positive' : 'negative'}.`,
      R`At \(x = ${piTex(1, 4 * v.b)}\) the tangent part equals \(\tan\frac{\pi}{4} = 1\), and the graph's height is \(${v.s * v.a}\). So the multiplier is \(${v.s * v.a}\).`,
      `So ${v.tex}.`,
    ],
    rule: 6,
    skill: 'graph of tangent',
    check: () => (Math.abs(v.f(px) - v.s * v.a) < 1e-9 && Math.abs(v.f(0.3 + Math.PI / v.b) - v.f(0.3)) < 1e-9 && asym.every((x) => Math.abs(Math.cos(v.b * x)) < 1e-9) ? true : 'graph features do not match the formula'),
  });
}

function hardLargeAngle(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const d0 = rng.pick(SPECIAL.filter((a) => a % 90 !== 0 || (trigDeg(fn, a) && rng.bool(0.5))).filter((a) => trigDeg(fn, a)));
  const k = rng.pick([-3, -2, -1, 1, 2]);
  const d = d0 + 360 * k;
  const v = trigDeg(fn, d0);
  const angle = radTex(d);
  return q({
    prompt: R`Find the exact value of \(${ap(fn, angle)}\).`,
    correct: S(v),
    wrong: exactWrongs(rng, fn, d0, v),
    solution: [
      R`Find a coterminal angle between \(0\) and \(2\pi\) by ${k < 0 ? 'adding' : 'subtracting'} \(${piTex(2 * Math.abs(k))}\) (${Math.abs(k) === 1 ? 'one full turn' : `${Math.abs(k)} full turns`}): \(${angle} ${k < 0 ? '+' : '-'} ${piTex(2 * Math.abs(k))} = ${radTex(d0)}\).`,
      ...exactSteps(fn, d0, radTex(d0), v),
    ],
    rule: 3,
    skill: 'coterminal angles',
    check: () => checkEqual(v.value, TRIG[fn](toRad(d)), 1e-6),
  });
}

function hardFerrisHeight(rng) {
  const r = rng.pick([8, 10, 12, 16, 20, 24, 30]);
  const c = r + rng.int(2, 6);
  const d = rng.pick([30, 150, 210, 330, 90, 270]);
  const angle = rng.bool() ? R`${d}^{\circ}` : R`${radTex(d)}\text{ radians}`;
  const s = sinDeg(d).value;
  const h = c + r * s;
  return q({
    prompt: R`A Ferris wheel has radius ${r} m and its centre is ${c} m above the ground. A rider starts level with the centre, at the 3 o'clock position, and the wheel turns counterclockwise through \(${angle}\). How high above the ground is the rider then?`,
    correct: h,
    unit: 'm',
    wrong: [
      Math.abs(s) < 1 ? { value: c - r * s, why: `The angle ends in Quadrant ${QUAD[quadrant(d)]}, where sine is ${s > 0 ? 'positive' : 'negative'}: the rider is ${s > 0 ? 'above' : 'below'} the centre.` } : { value: c, why: 'After a quarter or three-quarter turn the rider is at the top or the bottom of the wheel, not level with the centre.' },
      { value: Math.abs(r * s), why: `That is the distance above or below the centre. The centre itself is ${c} m above the ground.` },
      { value: round(c + r * cosDeg(d).value, 1), why: 'The cosine gives the horizontal position. Height comes from the sine.' },
      c + r,
      c - r,
    ],
    solution: [
      R`Put the centre of the wheel at the origin. After turning through \(${angle}\) the rider is at \(\left(${r}\cos\theta,\ ${r}\sin\theta\right)\), so the height above the centre is \(${r}\sin\theta\).`,
      R`\(${ap('sin', angle.replace(R`\text{ radians}`, ''))} = ${sinDeg(d).tex()}\), so the height relative to the centre is \(${r} \cdot ${s < 0 ? `\\left(${sinDeg(d).tex()}\\right)` : sinDeg(d).tex()} = ${num(r * s)}\) m${s < 0 ? ' (negative means below the centre)' : ''}.`,
      R`Height above the ground: \(${c} ${s > 0 ? '+' : '-'} ${num(Math.abs(r * s))} = ${num(h)}\) m.`,
    ],
    rule: 1,
    skill: 'circular motion',
    check: () => checkEqual(h, c + r * Math.sin(toRad(d))),
  });
}

// ───────────── Challenge ─────────────

function challengeSolveOnCircle(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const ref = rng.pick([30, 45, 60]);
  const sg = rng.sign();
  const base = trigDeg(fn, ref);
  const v = sg > 0 ? base : base.neg();
  const solve = (target) => SPECIAL.filter((a) => trigDeg(fn, a)?.eq(target));
  const show = (list) => list.map((a) => R`\(${radTex(a)}\)`).join(' and ');
  const sols = solve(v);
  const coRef = 90 - ref;
  const cov = sg > 0 ? trigDeg(fn, coRef) : trigDeg(fn, coRef).neg();
  const mixed = fn === 'tan' ? [sols[0], norm360(-sols[0])] : [sols[0], norm360(sols[0] + 180)];
  const quads = [1, 2, 3, 4].filter((k) => signIn(fn, k) === sg);
  return q({
    prompt: R`Find all angles \(\theta\) with \(0 \le \theta < 2\pi\) for which \(${T(fn)}\theta = ${v.tex()}\).`,
    correct: show(sols),
    wrong: [
      { value: show(solve(v.neg())), why: R`\(${T(fn)}\) is ${sg > 0 ? 'positive' : 'negative'} in Quadrants ${QUAD[quads[0]]} and ${QUAD[quads[1]]}. These angles are in the other two quadrants.` },
      ref !== 45 ? { value: show(solve(cov)), why: R`The reference angle is \(${radTex(ref)}\), because \(${ap(fn, radTex(ref))} = ${base.tex()}\).` } : null,
      { value: show(mixed.sort((p, t) => p - t)), why: fn === 'tan' ? R`Tangent has period \(\pi\), so the second solution is \(\pi\) further round.` : R`Use the reference angle \(${radTex(ref)}\) in each quadrant where \(${T(fn)}\) is ${sg > 0 ? 'positive' : 'negative'}.` },
      show([sols[0], norm360(sols[1] + 90)].sort((p, t) => p - t)),
      show([norm360(sols[0] + 90), sols[1]].sort((p, t) => p - t)),
    ],
    solution: [
      R`Ignore the sign first: \(${ap(fn, radTex(ref))} = ${base.tex()}\), so the reference angle is \(${radTex(ref)}\).`,
      R`\(${T(fn)}\) is ${sg > 0 ? 'positive' : 'negative'} in Quadrants ${QUAD[quads[0]]} and ${QUAD[quads[1]]}.`,
      R`Place the reference angle in those quadrants: \(\theta = ${radTex(sols[0])}\) and \(\theta = ${radTex(sols[1])}\).`,
    ],
    rule: 3,
    skill: 'angles from a trig value',
    check: () => (sols.length === 2 && sols.every((a) => Math.abs(TRIG[fn](toRad(a)) - v.value) < 1e-9) ? true : 'solutions are wrong'),
  });
}

function challengeCombine(rng) {
  const fns = ['sin', 'cos', 'tan'];
  const angles = SPECIAL.filter((a) => a % 90 !== 0);
  let f1;
  let f2;
  let d1;
  let d2;
  let prod;
  do {
    [f1, f2] = [rng.pick(fns), rng.pick(fns)];
    [d1, d2] = [rng.pick(angles), rng.pick(angles)];
    prod = trigDeg(f1, d1).mul(trigDeg(f2, d2));
  } while (prod.r !== 1 || (f1 === f2 && d1 === d2) || trigDeg(f1, d1).r === 1);
  const [f3, d3] = rng.pick([['sin', 30], ['sin', 150], ['sin', 210], ['sin', 330], ['cos', 60], ['cos', 120], ['cos', 240], ['cos', 300], ['tan', 45], ['tan', 135], ['tan', 225], ['tan', 315], ['cos', 180], ['sin', 270], ['sin', 90]]);
  const third = trigDeg(f3, d3);
  const minus = rng.bool();
  const P = frac(prod.n, prod.d);
  const Q = frac(third.n, third.d);
  const ans = minus ? P.sub(Q) : P.add(Q);
  const [a1, a2, a3] = [ap(f1, radTex(d1)), ap(f2, radTex(d2)), ap(f3, radTex(d3))];
  return q({
    prompt: R`Find the exact value of \(${a1} \cdot ${a2} ${minus ? '-' : '+'} ${a3}\).`,
    correct: ans,
    wrong: [
      { value: minus ? P.neg().sub(Q) : P.neg().add(Q), why: R`Check the signs of the two factors: \(${a1} = ${trigDeg(f1, d1).tex()}\) and \(${a2} = ${trigDeg(f2, d2).tex()}\).` },
      { value: minus ? P.add(Q) : P.sub(Q), why: R`\(${a3} = ${third.tex()}\). Check its sign in that quadrant.` },
      P,
      ans.neg(),
      ans.add(1),
    ],
    solution: [
      R`\(${a1} = ${trigDeg(f1, d1).tex()}\) and \(${a2} = ${trigDeg(f2, d2).tex()}\). Their product is \(${P.tex()}\).`,
      R`\(${a3} = ${third.tex()}\).`,
      R`\(${P.tex()} ${minus ? '-' : '+'} ${Q.value < 0 ? `\\left(${Q.tex()}\\right)` : Q.tex()} = ${ans.tex()}\).`,
    ],
    rule: 3,
    skill: 'exact values in any quadrant',
    check: () => checkEqual(TRIG[f1](toRad(d1)) * TRIG[f2](toRad(d2)) + (minus ? -1 : 1) * TRIG[f3](toRad(d3)), ans.value),
  });
}

function challengePoint(rng) {
  const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [6, 8, 10], [9, 12, 15]]);
  const [lx, ly] = rng.bool() ? [a, b] : [b, a];
  const qd = rng.int(2, 4);
  const x = signIn('cos', qd) * lx;
  const y = signIn('sin', qd) * ly;
  const kind = rng.pick(['sum', 'product', 'secTan', 'csc', 'cot']);
  const t = Math.atan2(y, x);
  const spec = {
    sum: [R`\sin\theta + \cos\theta`, frac(x + y, c), Math.sin(t) + Math.cos(t), R`\dfrac{y}{r} + \dfrac{x}{r} = \dfrac{${y}}{${c}} + \dfrac{${x}}{${c}}`, [frac(Math.abs(x) + Math.abs(y), c), frac(x + y, 1), frac(y - x, c)]],
    product: [R`\sin\theta\cos\theta`, frac(x * y, c * c), Math.sin(t) * Math.cos(t), R`\dfrac{y}{r} \cdot \dfrac{x}{r} = \dfrac{(${y})(${x})}{${c * c}}`, [frac(-x * y, c * c), frac(x * y, 1), frac(x * y, c)]],
    secTan: [R`\sec\theta + \tan\theta`, frac(c + y, x), 1 / Math.cos(t) + Math.tan(t), R`\dfrac{r}{x} + \dfrac{y}{x} = \dfrac{${c} + (${y})}{${x}}`, [frac(c + Math.abs(y), Math.abs(x)), frac(c + x, y), frac(c - y, x)]],
    csc: [R`\csc\theta`, frac(c, y), 1 / Math.sin(t), R`\dfrac{r}{y} = \dfrac{${c}}{${y}}`, [frac(c, -y), frac(c, x), frac(y, c)]],
    cot: [R`\cot\theta`, frac(x, y), 1 / Math.tan(t), R`\dfrac{x}{y} = \dfrac{${x}}{${y}}`, [frac(-x, y), frac(y, x), frac(x, c)]],
  }[kind];
  const [tex, ans, numeric, work, wrongs] = spec;
  return q({
    prompt: R`The terminal side of an angle \(\theta\) in standard position passes through the point \((${x}, ${y})\). Find \(${tex}\).`,
    correct: ans,
    wrong: [
      { value: wrongs[0], why: `The point is in Quadrant ${QUAD[qd]}, so keep the signs of its coordinates.` },
      { value: wrongs[1], why: kind === 'csc' || kind === 'cot' ? 'Check which two of x, y and r the ratio uses, and in which order.' : R`The point is not on the unit circle. Divide by its distance from the origin, \(r = ${c}\).` },
      wrongs[2],
      ans.neg(),
      ans.inv(),
    ],
    solution: [
      R`Distance from the origin: \(r = \sqrt{(${x})^{2} + (${y})^{2}} = \sqrt{${x * x + y * y}} = ${c}\).`,
      R`For any point on the terminal side, \(\sin\theta = \dfrac{y}{r}\), \(\cos\theta = \dfrac{x}{r}\) and \(\tan\theta = \dfrac{y}{x}\).`,
      R`\(${tex} = ${work} = ${ans.tex()}\).`,
    ],
    rule: 7,
    skill: 'trig values from a point',
    check: () => checkEqual(numeric, ans.value),
  });
}

function challengeAngularSpeed(rng) {
  const N = rng.pick([30, 45, 60, 90, 120, 150, 180, 240, 300]);
  const [r, rText] = rng.pick([[0.2, '20 cm'], [0.25, '25 cm'], [0.3, '30 cm'], [0.4, '40 cm'], [0.5, '50 cm'], [0.6, '60 cm']]);
  const thing = rng.pick(['A bicycle wheel', 'A grinding wheel', 'A turntable', 'A fan blade', 'A potter\'s wheel']);
  const k = (r * N) / 30;
  const kpi = (c) => `${round(c, 3) === 1 ? '' : num(c, { places: 3 })}\\pi`;
  const speed = (c) => R`\(${kpi(c)}\) m/s`;
  return q({
    prompt: `${thing} of radius ${rText} turns at ${N} revolutions per minute. How fast is a point on its rim moving, in metres per second?`,
    correct: speed(k),
    wrong: [
      { value: speed(2 * r * N), why: 'That is the distance covered in one minute. Divide by 60 to get metres per second.' },
      { value: speed(N / 30), why: R`That is the angular speed in radians per second. Multiply by the radius, \(${num(r)}\) m, to get the linear speed.` },
      { value: speed(k / 2), why: R`One revolution is \(2\pi\) radians, not \(\pi\).` },
      speed((r * N * 100) / 30),
      speed(2 * k),
    ],
    solution: [
      R`Angular speed: \(${N}\) revolutions per minute \(= ${N} \cdot 2\pi\) radians per minute \(= \dfrac{${N} \cdot 2\pi}{60} = ${kpi(N / 30)}\) radians per second.`,
      R`Linear speed is radius times angular speed (from \(s = r\theta\)): \(v = r\omega = ${num(r)} \cdot ${kpi(N / 30)} = ${kpi(k)}\) m/s.`,
      R`That is about \(${num(k * Math.PI, { places: 2 })}\) m/s.`,
    ],
    rule: 0,
    skill: 'angular and linear speed',
    // Second method: N circumferences of 2πr metres are covered every 60 seconds.
    check: () => checkEqual(k * Math.PI, (N * 2 * Math.PI * r) / 60),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'unit-circle-trig',
  title: 'Trigonometric Functions & the Unit Circle',
  summary: 'Use radians and the unit circle to find exact values of all six trig functions in any quadrant.',
  standards: ['AP Precalculus 3.1', 'AP Precalculus 3.2', 'AP Precalculus 3.3', 'AP Precalculus 3.4', 'AP Precalculus 3.8', 'AP Precalculus 3.11', 'CCSS F-TF.A.3', 'CCSS F-TF.A.4'],

  explain: {
    intro: R`Anything that repeats, such as tides, seasons or a turning wheel, is modelled by going round a circle. An angle \(\theta\) in standard position picks out one point on the unit circle (radius 1, centre at the origin), and the coordinates of that point define cosine and sine for every angle, not just the acute angles of a right triangle.`,
    rules: [
      {
        title: 'Radians',
        text: R`One radian is the angle that cuts off an arc equal in length to the radius. A full turn is \(2\pi\) radians, so \(\pi\) radians \(= 180^{\circ}\). Multiply degrees by \(\frac{\pi}{180}\) to get radians and radians by \(\frac{180}{\pi}\) to get degrees. With \(\theta\) in radians, arc length is \(s = r\theta\).`,
        example: R`\(150^{\circ} = 150 \cdot \frac{\pi}{180} = \frac{5\pi}{6}\). On a circle of radius 4 that angle cuts off an arc of length \(4 \cdot \frac{5\pi}{6} = \frac{10\pi}{3}\).`,
      },
      {
        title: 'Sine, cosine and tangent on the unit circle',
        text: R`If the terminal side of \(\theta\) meets the unit circle at \((x, y)\), then \(\cos\theta = x\), \(\sin\theta = y\) and \(\tan\theta = \dfrac{y}{x} = \dfrac{\sin\theta}{\cos\theta}\) (the slope of the terminal side). For a point at distance \(r\) from the origin, divide by \(r\): \(\cos\theta = \frac{x}{r}\), \(\sin\theta = \frac{y}{r}\).`,
        example: R`At \(\theta = \frac{\pi}{2}\) the point is \((0, 1)\): \(\cos\frac{\pi}{2} = 0\) and \(\sin\frac{\pi}{2} = 1\).`,
      },
      {
        title: 'Special angles',
        text: R`Memorise the first quadrant. For \(\frac{\pi}{6}\), \(\frac{\pi}{4}\), \(\frac{\pi}{3}\) (30°, 45°, 60°) the sines are \(\frac{1}{2}\), \(\frac{\sqrt{2}}{2}\), \(\frac{\sqrt{3}}{2}\) and the cosines are the same numbers in reverse order. The tangents are \(\frac{\sqrt{3}}{3}\), \(1\), \(\sqrt{3}\).`,
        example: R`\(\sin\frac{\pi}{3} = \frac{\sqrt{3}}{2}\), \(\cos\frac{\pi}{3} = \frac{1}{2}\), \(\tan\frac{\pi}{3} = \sqrt{3}\).`,
      },
      {
        title: 'Reference angles, signs and coterminal angles',
        text: R`The reference angle is the acute angle between the terminal side and the \(x\)-axis. A trig value of any angle equals the value at its reference angle, with a sign set by the quadrant: all positive in I, only sine in II, only tangent in III, only cosine in IV. Angles that differ by a full turn (\(2\pi\) or 360°) are coterminal and have the same values.`,
        example: R`\(\frac{7\pi}{6}\) is in Quadrant III with reference angle \(\frac{\pi}{6}\), so \(\cos\frac{7\pi}{6} = -\frac{\sqrt{3}}{2}\).`,
      },
      {
        title: 'Reciprocal functions',
        text: R`\(\csc\theta = \dfrac{1}{\sin\theta}\), \(\sec\theta = \dfrac{1}{\cos\theta}\), \(\cot\theta = \dfrac{\cos\theta}{\sin\theta}\). Each has the same sign as the function it comes from, and each is not defined where its denominator is 0.`,
        example: R`\(\sec\frac{2\pi}{3} = \dfrac{1}{-1/2} = -2\). \(\csc\pi\) is not defined, because \(\sin\pi = 0\).`,
      },
      {
        title: 'Periodicity and symmetry',
        text: R`A function is periodic with period \(p\) if \(f(x + p) = f(x)\) for every \(x\). Sine and cosine have period \(2\pi\); tangent has period \(\pi\). Cosine is even, \(\cos(-\theta) = \cos\theta\); sine and tangent are odd, \(\sin(-\theta) = -\sin\theta\) and \(\tan(-\theta) = -\tan\theta\).`,
        example: R`\(\sin\frac{13\pi}{6} = \sin\left(\frac{\pi}{6} + 2\pi\right) = \frac{1}{2}\), and \(\sin\left(-\frac{\pi}{6}\right) = -\frac{1}{2}\).`,
      },
      {
        title: 'The tangent function',
        text: R`\(\tan\theta = \dfrac{\sin\theta}{\cos\theta}\) is zero where \(\sin\theta = 0\) (multiples of \(\pi\)) and has vertical asymptotes where \(\cos\theta = 0\) (at \(\frac{\pi}{2} + k\pi\)). Each branch rises from \(-\infty\) to \(\infty\), and the graph repeats every \(\pi\). For \(y = a\tan(bx)\) the period is \(\dfrac{\pi}{b}\).`,
        example: R`\(y = \tan 2x\) has period \(\frac{\pi}{2}\), with asymptotes at \(x = \frac{\pi}{4} + \frac{k\pi}{2}\).`,
      },
      {
        title: 'All six values from one',
        text: R`Treat the given value as a ratio of two of \(x\), \(y\), \(r\). Find the third from \(x^{2} + y^{2} = r^{2}\), choose the signs of \(x\) and \(y\) from the quadrant (\(r\) is always positive), then read off the other ratios.`,
        example: R`\(\sin\theta = -\frac{3}{5}\) in Quadrant IV: \(y = -3\), \(r = 5\), \(x = 4\). So \(\cos\theta = \frac{4}{5}\) and \(\tan\theta = -\frac{3}{4}\).`,
      },
    ],
    vocab: [
      { term: 'radian', def: R`The angle at the centre of a circle that cuts off an arc one radius long. \(2\pi\) radians make a full turn.` },
      { term: 'standard position', def: 'An angle drawn with its vertex at the origin and its initial side along the positive x-axis. Counterclockwise is positive.' },
      { term: 'reference angle', def: 'The acute angle between the terminal side of an angle and the x-axis.' },
      { term: 'coterminal angles', def: R`Angles with the same terminal side. They differ by a whole number of full turns.` },
      { term: 'period', def: 'The length of one complete cycle of a repeating pattern: the smallest positive shift that leaves the function unchanged.' },
    ],
    mistakes: [
      R`Mixing units: \(\sin 30\) (radians) is not \(\sin 30^{\circ}\). Check the mode of a calculator, and use radians in \(s = r\theta\).`,
      R`Measuring the reference angle to the \(y\)-axis. It is always measured to the \(x\)-axis.`,
      'Forgetting the sign. Find the value at the reference angle first, then fix the sign from the quadrant.',
      R`Pairing the reciprocals by their first letters. \(\sec\) goes with \(\cos\), and \(\csc\) goes with \(\sin\).`,
    ],
    visual: circlePlot(50, 'The unit circle with a radius drawn to a point in the first quadrant. A dashed vertical segment drops from the point to the x-axis. The horizontal coordinate of the point is cos θ and the vertical coordinate is sin θ.', { label: '(cos θ, sin θ)' }),
  },

  examples: [
    {
      title: 'An exact value in another quadrant',
      problem: R`Find \(\cos\dfrac{7\pi}{6}\).`,
      steps: [
        R`\(\frac{7\pi}{6}\) is a little more than \(\pi\), so the terminal side is in Quadrant III.`,
        R`Reference angle: \(\frac{7\pi}{6} - \pi = \frac{\pi}{6}\), and \(\cos\frac{\pi}{6} = \frac{\sqrt{3}}{2}\).`,
        R`In Quadrant III the \(x\)-coordinate is negative, so the cosine is negative.`,
      ],
      answer: R`\(\cos\dfrac{7\pi}{6} = -\dfrac{\sqrt{3}}{2}\)`,
      visual: circlePlot(210, 'The unit circle with a radius drawn at 7π/6, into the third quadrant. The point has coordinates (−√3/2, −1/2), and a dashed segment joins it to the negative x-axis, showing the reference angle π/6.', { label: '(−√3/2, −½)' }),
    },
    {
      title: 'All six values from one',
      problem: R`\(\sin\theta = -\frac{3}{5}\) and \(\theta\) is in Quadrant IV. Find the other five trig values.`,
      steps: [
        R`\(\sin\theta = \frac{y}{r}\): take \(y = -3\) and \(r = 5\).`,
        R`\(x^{2} = r^{2} - y^{2} = 25 - 9 = 16\). In Quadrant IV, \(x\) is positive, so \(x = 4\).`,
        R`\(\cos\theta = \frac{x}{r} = \frac{4}{5}\) and \(\tan\theta = \frac{y}{x} = -\frac{3}{4}\).`,
        R`Reciprocals: \(\csc\theta = -\frac{5}{3}\), \(\sec\theta = \frac{5}{4}\), \(\cot\theta = -\frac{4}{3}\).`,
      ],
      answer: R`\(\cos\theta = \frac{4}{5}\), \(\tan\theta = -\frac{3}{4}\), \(\csc\theta = -\frac{5}{3}\), \(\sec\theta = \frac{5}{4}\), \(\cot\theta = -\frac{4}{3}\)`,
    },
    {
      title: 'The tangent function',
      problem: R`Find \(\tan\dfrac{3\pi}{4}\), and say where \(\tan\theta\) is not defined for \(0 \le \theta < 2\pi\).`,
      steps: [
        R`\(\frac{3\pi}{4}\) is in Quadrant II with reference angle \(\frac{\pi}{4}\). \(\tan\frac{\pi}{4} = 1\), and tangent is negative in Quadrant II: \(\tan\frac{3\pi}{4} = -1\).`,
        R`\(\tan\theta = \frac{\sin\theta}{\cos\theta}\) is not defined where \(\cos\theta = 0\): at \(\theta = \frac{\pi}{2}\) and \(\theta = \frac{3\pi}{2}\).`,
        R`Those are the vertical asymptotes of the tangent graph. Between them the graph repeats every \(\pi\).`,
      ],
      answer: R`\(\tan\dfrac{3\pi}{4} = -1\); not defined at \(\dfrac{\pi}{2}\) and \(\dfrac{3\pi}{2}\).`,
      visual: {
        type: 'plot',
        x: [0, 2 * Math.PI],
        y: [-4, 4],
        piTicks: true,
        fns: [{ f: Math.tan }],
        vlines: [{ x: Math.PI / 2 }, { x: (3 * Math.PI) / 2 }],
        points: [{ x: (3 * Math.PI) / 4, y: -1, label: '(3π/4, −1)' }],
        alt: 'Graph of y = tan θ from 0 to 2π. It has dashed vertical asymptotes at π/2 and 3π/2, crosses the axis at 0, π and 2π, and passes through the point (3π/4, −1).',
      },
    },
    {
      title: 'Word problem: a Ferris wheel',
      word: true,
      problem: R`A Ferris wheel has radius 20 m and its centre is 22 m above the ground. A rider starts level with the centre (the 3 o'clock position) and the wheel turns counterclockwise through \(\frac{5\pi}{6}\). How high is the rider?`,
      steps: [
        R`With the centre as origin, the rider is at \(\left(20\cos\theta,\ 20\sin\theta\right)\): the unit-circle point scaled by the radius.`,
        R`\(\frac{5\pi}{6}\) is in Quadrant II with reference angle \(\frac{\pi}{6}\), so \(\sin\frac{5\pi}{6} = \frac{1}{2}\).`,
        R`Height above the centre: \(20 \cdot \frac{1}{2} = 10\) m. Height above the ground: \(22 + 10 = 32\) m.`,
      ],
      answer: '32 m above the ground',
    },
  ],

  models: [
    {
      id: 'angle-on-circle',
      title: 'Any angle on the unit circle',
      intro: 'Type an angle in degrees. See its coterminal angle, quadrant, reference angle and trig values.',
      inputs: [{ name: 'deg', label: 'Angle (degrees)', type: 'int', min: -720, max: 720, value: 210 }],
      compute({ deg }) {
        const c = norm360(deg);
        const qd = quadrant(c);
        const ref = refAngle(c);
        const special = [0, 30, 45, 60, 90].includes(ref);
        const turns = (c - deg) / 360;
        const value = (fn) => {
          if (special) {
            const v = trigDeg(fn, c);
            return v ? v.tex() : R`\text{not defined}`;
          }
          return num(TRIG[fn](toRad(c)), { places: 4 });
        };
        const steps = [
          turns === 0 ? R`\(${deg}^{\circ}\) is already between \(0^{\circ}\) and \(360^{\circ}\). In radians it is \(${radTex(deg)}\).` : R`Coterminal angle: \(${deg}^{\circ} ${turns > 0 ? '+' : '-'} ${Math.abs(turns) === 1 ? '' : `${Math.abs(turns)} \\cdot `}360^{\circ} = ${c}^{\circ}\). In radians, \(${deg}^{\circ} = ${radTex(deg)}\).`,
          qd ? R`\(${c}^{\circ}\) is in Quadrant ${QUAD[qd]}. Its reference angle is \(${ref}^{\circ}\).` : R`\(${c}^{\circ}\) lies on an axis, at the point \(\left(${cosDeg(c).tex()},\ ${sinDeg(c).tex()}\right)\).`,
        ];
        if (qd) steps.push(special ? R`At the reference angle: \(\sin ${ref}^{\circ} = ${sinDeg(ref).tex()}\) and \(\cos ${ref}^{\circ} = ${cosDeg(ref).tex()}\).` : R`\(${ref}^{\circ}\) is not a special angle, so use a calculator in degree mode: \(\sin ${ref}^{\circ} \approx ${num(Math.sin(toRad(ref)), { places: 4 })}\) and \(\cos ${ref}^{\circ} \approx ${num(Math.cos(toRad(ref)), { places: 4 })}\).`);
        if (qd) steps.push(R`In Quadrant ${QUAD[qd]}, sine is ${signIn('sin', qd) > 0 ? 'positive' : 'negative'}, cosine is ${signIn('cos', qd) > 0 ? 'positive' : 'negative'} and tangent is ${signIn('tan', qd) > 0 ? 'positive' : 'negative'}.`);
        const eq = special ? '=' : R`\approx`;
        return {
          problem: R`Find \(\sin\), \(\cos\) and \(\tan\) of \(${deg}^{\circ}\).`,
          steps,
          answer: R`\(\sin ${deg}^{\circ} ${eq} ${value('sin')}\), \(\cos ${deg}^{\circ} ${eq} ${value('cos')}\), \(\tan ${deg}^{\circ} ${special && !trigDeg('tan', c) ? R`\text{ is not defined}` : `${eq} ${value('tan')}`}\)`,
          visual: circlePlot(c, `The unit circle with a radius drawn at ${c} degrees${qd ? `, in quadrant ${QUAD[qd]}` : ', along an axis'}. The point on the circle is approximately (${txt(Math.cos(toRad(c)), { places: 2 })}, ${txt(Math.sin(toRad(c)), { places: 2 })}).`, { label: `${c}°` }),
        };
      },
    },
    {
      id: 'minute-hand',
      title: 'Word problem: the tip of a minute hand',
      word: true,
      intro: 'The minute hand of a clock turns 360° in 60 minutes. Choose its length and a time interval to find how far the tip travels.',
      inputs: [
        { name: 'len', label: 'Length of the hand (cm)', type: 'int', min: 1, max: 60, value: 12 },
        { name: 'mins', label: 'Minutes that pass', type: 'int', min: 1, max: 120, value: 25 },
      ],
      compute({ len, mins }) {
        const deg = 6 * mins;
        const s = (len * deg * Math.PI) / 180;
        return {
          problem: `The minute hand of a clock is ${len} cm long. How far does its tip travel in ${mins} minutes?`,
          steps: [
            R`The hand turns \(360^{\circ}\) in 60 minutes, which is \(6^{\circ}\) per minute. In ${mins} minutes it turns \(${mins} \cdot 6^{\circ} = ${deg}^{\circ}\).`,
            R`Convert to radians: \(${deg}^{\circ} \cdot \dfrac{\pi}{180^{\circ}} = ${radTex(deg)}\).`,
            R`Arc length: \(s = r\theta = ${len} \cdot ${radTex(deg)} = ${piTex(len * deg, 180)}\) cm.`,
            R`As a decimal, \(${piTex(len * deg, 180)} \approx ${num(s, { places: 1 })}\) cm.`,
          ],
          answer: R`\(${piTex(len * deg, 180)} \approx ${num(s, { places: 1 })}\) cm`,
        };
      },
    },
    {
      id: 'six-from-one',
      title: 'All six values from one',
      intro: 'Give one trig value as a fraction and choose the quadrant. The model finds x, y and r and reads off all six functions.',
      inputs: [
        { name: 'fn', label: 'Known function', type: 'select', value: 'sin', options: [{ value: 'sin', label: 'sin θ' }, { value: 'cos', label: 'cos θ' }, { value: 'tan', label: 'tan θ' }] },
        { name: 'top', label: 'Numerator (size only)', type: 'int', min: 1, max: 40, value: 3 },
        { name: 'bot', label: 'Denominator', type: 'int', min: 1, max: 41, value: 5 },
        { name: 'quad', label: 'Quadrant', type: 'select', value: 4, options: [{ value: 1, label: 'I' }, { value: 2, label: 'II' }, { value: 3, label: 'III' }, { value: 4, label: 'IV' }] },
      ],
      compute({ fn, top, bot, quad }) {
        const g = gcd(top, bot);
        const [n, d] = [top / g, bot / g];
        if (fn !== 'tan' && n >= d) return { error: `The size of ${fn} θ is less than 1 inside a quadrant. Choose a numerator smaller than the denominator.` };
        const [sx, sy] = [signIn('cos', quad), signIn('sin', quad)];
        let x;
        let y;
        let r;
        let how;
        if (fn === 'sin') {
          [y, r, x] = [surd(sy * n), surd(d), surd(sx, 1, d * d - n * n)];
          how = R`\(x^{2} = r^{2} - y^{2} = ${d * d} - ${n * n} = ${d * d - n * n}\), and \(x\) is ${sx > 0 ? 'positive' : 'negative'} in Quadrant ${QUAD[quad]}: \(x = ${x.tex()}\).`;
        } else if (fn === 'cos') {
          [x, r, y] = [surd(sx * n), surd(d), surd(sy, 1, d * d - n * n)];
          how = R`\(y^{2} = r^{2} - x^{2} = ${d * d} - ${n * n} = ${d * d - n * n}\), and \(y\) is ${sy > 0 ? 'positive' : 'negative'} in Quadrant ${QUAD[quad]}: \(y = ${y.tex()}\).`;
        } else {
          [y, x, r] = [surd(sy * n), surd(sx * d), surd(1, 1, n * n + d * d)];
          how = R`\(r^{2} = x^{2} + y^{2} = ${d * d} + ${n * n} = ${n * n + d * d}\), and \(r\) is always positive: \(r = ${r.tex()}\).`;
        }
        const v = sixValues(x, y, r);
        const known = { sin: R`\dfrac{y}{r}`, cos: R`\dfrac{x}{r}`, tan: R`\dfrac{y}{x}` }[fn];
        const size = Math.max(Math.abs(x.value), Math.abs(y.value)) * 1.35;
        return {
          problem: R`\(${T(fn)}\theta = ${v[fn].tex()}\) and \(\theta\) is in Quadrant ${QUAD[quad]}. Find all six trig values.`,
          steps: [
            R`In Quadrant ${QUAD[quad]}, \(${T(fn)}\theta\) is ${v[fn].value > 0 ? 'positive' : 'negative'}, so \(${T(fn)}\theta = ${known} = ${v[fn].tex()}\). Take ${fn === 'sin' ? R`\(y = ${y.tex()}\), \(r = ${r.tex()}\)` : fn === 'cos' ? R`\(x = ${x.tex()}\), \(r = ${r.tex()}\)` : R`\(y = ${y.tex()}\), \(x = ${x.tex()}\)`}.`,
            how,
            R`\(\sin\theta = \dfrac{y}{r} = ${v.sin.tex()}\), \(\cos\theta = \dfrac{x}{r} = ${v.cos.tex()}\), \(\tan\theta = \dfrac{y}{x} = ${v.tan.tex()}\).`,
            R`Reciprocals: \(\csc\theta = ${v.csc.tex()}\), \(\sec\theta = ${v.sec.tex()}\), \(\cot\theta = ${v.cot.tex()}\).`,
          ],
          answer: R`\(\sin\theta = ${v.sin.tex()}\), \(\cos\theta = ${v.cos.tex()}\), \(\tan\theta = ${v.tan.tex()}\), \(\csc\theta = ${v.csc.tex()}\), \(\sec\theta = ${v.sec.tex()}\), \(\cot\theta = ${v.cot.tex()}\)`,
          visual: {
            type: 'plot',
            x: [-size, size],
            y: [-size, size],
            square: true,
            segments: [{ from: [0, 0], to: [x.value, y.value], label: `r = ${r.text()}` }, { from: [x.value, y.value], to: [x.value, 0], dashed: true, color: 'c' }],
            points: [{ x: x.value, y: y.value, label: `(${x.text()}, ${y.text()})` }],
            alt: `The terminal side of the angle drawn from the origin to the point (${x.text()}, ${y.text()}) in quadrant ${QUAD[quad]}, at distance ${r.text()} from the origin, with a dashed vertical segment to the x-axis.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyConvert, easyExactValue, easyQuadrant, easyReference],
    medium: [mediumExactAnyQuadrant, mediumReciprocal, mediumNotDefined, mediumArcLength, mediumSymmetry, mediumPeriodTable],
    hard: [hardSixFromOne, hardTangentGraph, hardLargeAngle, hardFerrisHeight],
    challenge: [challengeSolveOnCircle, challengeCombine, challengePoint, challengeAngularSpeed],
  },
};
