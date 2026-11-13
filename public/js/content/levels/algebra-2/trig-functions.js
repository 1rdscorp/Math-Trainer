import { R, q, frac, terms, num, txt, gcd, round, range, close, checkEqual } from '../../lib/index.js';
import { M, symChoices, radForm } from './_shared.js';

// ───────────── Helpers ─────────────

const RAD = Math.PI / 180;
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const WORD = { sin: 'sine', cos: 'cosine', tan: 'tangent' };
const TEX = { sin: '\\sin', cos: '\\cos', tan: '\\tan' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const whole = (v) => (Number.isInteger(v) ? v : null);
// A constant answer choice for symChoices: its LaTeX and its value.
const K = (tex, value, why) => ({ tex, f: () => value, why });
const mod360 = (d) => ((d % 360) + 360) % 360;
// Quadrant of an angle in degrees (0 when its terminal side lies on an axis).
const quadrant = (d) => (mod360(d) % 90 === 0 ? 0 : Math.floor(mod360(d) / 90) + 1);
// Reference angle in degrees: the acute angle between the terminal side and the x-axis.
const refAngle = (d) => Math.min(mod360(d) % 180, 180 - (mod360(d) % 180));
// The fraction f of π: 5/6 → "\frac{5\pi}{6}", 2 → "2\pi", −1/3 → "-\frac{\pi}{3}".
function piTex(f) {
  if (f.n === 0) return '0';
  const top = Math.abs(f.n) === 1 ? '\\pi' : `${Math.abs(f.n)}\\pi`;
  return `${f.n < 0 ? '-' : ''}${f.d === 1 ? top : `\\frac{${top}}{${f.d}}`}`;
}
// An angle of d degrees, written in degrees or in radians.
const ang = (d, rad) => (rad ? piTex(frac(d, 180)) : `${d}^\\circ`);
// A function of an angle: "\sin 210^\circ", "\cos\left(\frac{7\pi}{6}\right)".
const call = (fn, d, rad) => (rad || d < 0 ? `${TEX[fn]}\\left(${ang(d, rad)}\\right)` : `${TEX[fn]} ${ang(d, rad)}`);
// b·x where b = c or cπ (c is a Frac): "2x", "\frac{x}{3}", "\pi t", "\frac{\pi t}{6}".
function bxTex(c, pi, x = 'x') {
  const top = `${c.n === 1 ? '' : c.n}${pi ? '\\pi ' : ''}${x}`;
  return c.d === 1 ? top : `\\frac{${top}}{${c.d}}`;
}
const wave = (a, fn, arg, d) => terms([[a, `${TEX[fn]}${/^[a-z]$/.test(arg) ? ` ${arg}` : `\\left(${arg}\\right)`}`], [d, '']]);

// Exact values. Each is { tex, v }.
const V = (tex, v) => ({ tex, v });
const [ZERO, HALF, ROOT2, ROOT3, ONE] = [V('0', 0), V('\\frac{1}{2}', 0.5), V('\\frac{\\sqrt{2}}{2}', Math.SQRT1_2), V('\\frac{\\sqrt{3}}{2}', Math.sqrt(3) / 2), V('1', 1)];
const [TAN30, TAN60, NONE] = [V('\\frac{\\sqrt{3}}{3}', Math.sqrt(3) / 3), V('\\sqrt{3}', Math.sqrt(3)), V('\\text{not defined}', NaN)];
const TABLE = { sin: { 0: ZERO, 30: HALF, 45: ROOT2, 60: ROOT3, 90: ONE }, cos: { 0: ONE, 30: ROOT3, 45: ROOT2, 60: HALF, 90: ZERO }, tan: { 0: ZERO, 30: TAN30, 45: ONE, 60: TAN60, 90: NONE } };
const ON_AXIS = { 0: '(1, 0)', 90: '(0, 1)', 180: '(-1, 0)', 270: '(0, -1)' };
// Sign of each function for an angle m from 0° to 360°, and in quadrant Q.
const SIGN = { sin: (m) => (m < 180 ? 1 : -1), cos: (m) => (m < 90 || m > 270 ? 1 : -1), tan: (m) => (m % 180 < 90 ? 1 : -1) };
const signIn = (fn, Q) => SIGN[fn](90 * Q - 45);
const withSign = (e, s) => (s < 0 && e.v ? V(`-${e.tex}`, -e.v) : e);
const flip = (e) => (e.v ? V(e.v > 0 ? `-${e.tex}` : e.tex.slice(1), -e.v) : e);
// Exact value of a trig function at a multiple of 30° or 45°.
const exact = (fn, d) => withSign(TABLE[fn][refAngle(d)], SIGN[fn](mod360(d)));

function exactChoices(fn, d, rad) {
  const m = mod360(d);
  const Q = quadrant(d);
  const right = exact(fn, d);
  const opt = (e, why) => K(e.tex, e.v, why);
  const where = d === m ? R`\(${ang(d, rad)}\) is` : R`\(${ang(d, rad)}\) is coterminal with \(${ang(m, rad)}\), which is`;
  const place = Q ? `in quadrant ${ROMAN[Q]}, where ${WORD[fn]} is ${right.v > 0 ? 'positive' : 'negative'}` : R`on an axis, at the point \(${ON_AXIS[m]}\) of the unit circle`;
  const other = fn === 'sin' ? 'cos' : 'sin';
  const swap = fn === 'tan' ? withSign(TABLE.tan[90 - refAngle(d)], SIGN.tan(m)) : exact(other, d);
  const swapWhy = fn === 'tan'
    ? R`\(\tan\theta = \dfrac{\sin\theta}{\cos\theta}\). That value is \(\dfrac{\cos\theta}{\sin\theta}\).`
    : R`That is \(${call(other, d, rad)}\). On the unit circle, cosine is the \(x\)-coordinate and sine is the \(y\)-coordinate.`;
  const fill = (fn === 'tan' ? [ONE, TAN60, TAN30, ZERO] : [ONE, HALF, ROOT3, ROOT2, ZERO]).map((e) => opt(withSign(e, right.v < 0 ? -1 : 1)));
  return symChoices(opt(right), [opt(flip(right), `${where} ${place}.`), opt(swap, swapWhy), opt(flip(swap)), ...fill], [0]);
}

function exactSteps(fn, d, rad) {
  const m = mod360(d);
  const [Q, ref, right] = [quadrant(d), refAngle(d), exact(fn, d)];
  const steps = d === m ? [] : [R`Find the coterminal angle within one turn: \(${ang(d, rad)} ${d < m ? '+' : '-'} ${ang(Math.abs(m - d), rad)} = ${ang(m, rad)}\).`];
  if (!Q) {
    steps.push(R`The terminal side of \(${ang(m, rad)}\) lies on an axis. It meets the unit circle at \(${ON_AXIS[m]}\).`);
    if (fn !== 'tan') steps.push(R`${fn === 'sin' ? R`Sine is the \(y\)-coordinate` : R`Cosine is the \(x\)-coordinate`}: \(${call(fn, d, rad)} = ${right.tex}\).`);
    else if (right.v === 0) steps.push(R`\(\tan\theta = \dfrac{y}{x}\), and here \(y = 0\), so \(${call(fn, d, rad)} = 0\).`);
    else steps.push(R`\(\tan\theta = \dfrac{y}{x}\), and here \(x = 0\). Division by 0 is not defined, so \(${call(fn, d, rad)}\) is not defined.`);
    return steps;
  }
  if (Q === 1) {
    steps.push(R`\(${ang(m, rad)}\) is in quadrant I, where every trig value is positive.`);
    steps.push(R`From the special values: \(${call(fn, d, rad)}${d === m ? '' : ` = ${call(fn, m, rad)}`} = ${right.tex}\).`);
    return steps;
  }
  const toAxis = Q === 2 ? `${ang(180, rad)} - ${ang(m, rad)}` : Q === 3 ? `${ang(m, rad)} - ${ang(180, rad)}` : `${ang(360, rad)} - ${ang(m, rad)}`;
  steps.push(R`\(${ang(m, rad)}\) is in quadrant ${ROMAN[Q]}. Its reference angle is \(${toAxis} = ${ang(ref, rad)}\).`);
  steps.push(R`${cap(WORD[fn])} is ${right.v > 0 ? 'positive' : 'negative'} in quadrant ${ROMAN[Q]}, so \(${call(fn, d, rad)} = ${right.v > 0 ? '' : '-'}${call(fn, ref, rad)} = ${right.tex}\).`);
  return steps;
}

function exactQuestion(fn, d, rad) {
  const right = exact(fn, d);
  return q({
    prompt: R`Find the exact value of \(${call(fn, d, rad)}\).`,
    ...exactChoices(fn, d, rad),
    solution: exactSteps(fn, d, rad),
    rule: quadrant(d) ? 4 : 3, skill: 'exact trig values',
    check: () => (Number.isNaN(right.v) ? (Math.abs(Math.cos(d * RAD)) < 1e-9 ? true : 'this tangent is defined') : checkEqual(right.v, Math[fn](d * RAD), 1e-9)),
  });
}

// ───────────── Easy ─────────────

const CONVERTIBLE = []; // degree measures up to 360° whose radian measure is a short fraction of π
for (const den of [1, 2, 3, 4, 5, 6, 9, 10, 12, 18]) for (let k = 1; k <= 2 * den; k++) if (gcd(k, den) === 1) CONVERTIBLE.push((180 * k) / den);

function easyConvert(rng) {
  const d = rng.pick(CONVERTIBLE) * (rng.bool(0.2) ? -1 : 1);
  const f = frac(d, 180);
  const s = Math.sign(d);
  const check = () => (f.n * 180 === d * f.d && close(Math.cos(f.value * Math.PI), Math.cos(d * RAD)) ? true : 'the two measures are different angles');
  if (rng.bool(0.55)) {
    return q({
      prompt: R`Convert \(${d}^\circ\) to radians. Give the exact answer.`,
      ...symChoices(K(piTex(f), f.value * Math.PI), [
        K(num(f), f.value, R`Keep the \(\pi\). Since \(180^\circ = \pi\) radians, multiply the degrees by \(\dfrac{\pi}{180}\).`),
        K(piTex(frac(d, 360)), (d / 360) * Math.PI, R`\(\pi\) radians is \(180^\circ\), not \(360^\circ\), so divide the degrees by 180.`),
        K(piTex(f.inv()), Math.PI / f.value, R`Multiplying by \(\dfrac{\pi}{180}\) puts the 180 on the bottom: \(${s < 0 ? '-' : ''}\dfrac{${Math.abs(d)}\pi}{180}\).`),
        K(piTex(frac(d, 90)), (d / 90) * Math.PI), K(piTex(frac(f.n + s, f.d)), ((f.n + s) / f.d) * Math.PI),
      ], [0]),
      solution: [
        R`Multiply by \(\dfrac{\pi}{180^\circ}\): \(${d}^\circ \cdot \dfrac{\pi}{180^\circ} = ${s < 0 ? '-' : ''}\dfrac{${Math.abs(d)}\pi}{180}\).`,
        R`Divide the top and bottom by \(${gcd(Math.abs(d), 180)}\): \(${piTex(f)}\).`,
      ],
      rule: 0, skill: 'degrees and radians', check,
    });
  }
  return q({
    prompt: R`Convert \(${piTex(f)}\) radians to degrees.`,
    correct: d,
    fmt: (v) => M(`${num(v)}^\\circ`),
    wrong: [
      { value: 2 * d, why: R`\(\pi\) radians is \(180^\circ\), not \(360^\circ\).` },
      Math.abs(f.n) > 1 ? { value: (180 * s) / f.d, why: R`That is \(${piTex(frac(s, f.d))}\). This angle is \(${Math.abs(f.n)}\) times as large.` } : null,
      whole(d / 2), whole((180 * f.d) / f.n), d + 30 * s, d + 45 * s,
    ],
    solution: Math.abs(d) === 180
      ? [R`\(\pi\) radians is half a turn, which is \(180^\circ\).`, R`So \(${piTex(f)}\) radians is \(${d}^\circ\).`]
      : [
        R`Multiply by \(\dfrac{180^\circ}{\pi}\). The \(\pi\) cancels: \(${piTex(f)} \cdot \dfrac{180^\circ}{\pi} = ${num(f)} \cdot 180^\circ\).`,
        R`\(${num(f)} \cdot 180^\circ = ${d}^\circ\).`,
      ],
    rule: 0, skill: 'degrees and radians', check,
  });
}

function easyCoterminal(rng) {
  const rad = rng.bool(0.4);
  const base = rad ? rng.pick([30, 45, 60, 90, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330]) : 15 * rng.int(1, 23);
  const k = rng.pick([-2, -1, 1, 1, 2]);
  const d = base + 360 * k;
  const full = rad ? R`\(2\pi\)` : R`\(360^\circ\)`;
  const A = (v, why) => K(ang(v, rad), v, why);
  const den = frac(d, 180).d;
  return q({
    prompt: R`Find the angle between \(${rad ? '0' : '0^\\circ'}\) and ${full} that is coterminal with \(${ang(d, rad)}\).`,
    ...symChoices(A(base), [
      A((base + 180) % 360, R`Coterminal angles differ by full turns of ${full}, not half turns.`),
      k < 0 ? A(360 - base, R`A negative angle turns clockwise. Add ${full} until the result is positive. Dropping the minus sign gives a different angle.`) : null,
      Math.abs(k) === 2 ? A(base + 180 * k, k > 0 ? R`That angle is still more than one full turn. Subtract ${full} again.` : R`That angle is still negative. Add ${full} again.`) : null,
      A((base + 90) % 360), A((base + 270) % 360),
    ], [0]),
    solution: [
      R`Coterminal angles differ by full turns, so ${k > 0 ? 'subtract' : 'add'} ${full}${Math.abs(k) === 2 ? ' twice' : ''}.`,
      rad
        ? R`With a common denominator: \(${ang(d, true)} ${k > 0 ? '-' : '+'} \dfrac{${2 * Math.abs(k) * den}\pi}{${den}} = ${ang(base, true)}\).`
        : R`\(${d}^\circ ${k > 0 ? '-' : '+'} ${360 * Math.abs(k)}^\circ = ${base}^\circ\).`,
    ],
    rule: 1, skill: 'coterminal angles',
    check: () => ((d - base) % 360 === 0 && base > 0 && base < 360 ? true : 'not a coterminal angle within one turn'),
  });
}

function easyReferenceAngle(rng) {
  const d = 5 * rng.pick(range(21, 69).filter((k) => k % 18 >= 3 && k % 18 <= 15)); // quadrants II to IV, at least 15° from an axis
  const Q = quadrant(d);
  const ref = refAngle(d);
  const axis = Q === 4 ? 360 : 180;
  return q({
    prompt: R`An angle of \(${d}^\circ\) is in standard position. What is its reference angle?`,
    correct: ref,
    fmt: (v) => M(`${v}^\\circ`),
    wrong: [
      { value: 90 - ref, why: R`That is the angle to the \(y\)-axis. A reference angle is measured to the \(x\)-axis.` },
      { value: d, why: R`A reference angle is acute. It is the gap between the terminal side and the nearest part of the \(x\)-axis.` },
      Q === 4
        ? { value: d - 180, why: R`In quadrant IV the nearest part of the \(x\)-axis is at \(360^\circ\), so subtract the angle from \(360^\circ\).` }
        : { value: 360 - d, why: R`In quadrant ${ROMAN[Q]} the nearest part of the \(x\)-axis is at \(180^\circ\), not \(360^\circ\).` },
      180 - ref,
    ],
    solution: [
      R`\(${d}^\circ\) is between \(${90 * (Q - 1)}^\circ\) and \(${90 * Q}^\circ\), so the terminal side is in quadrant ${ROMAN[Q]}.`,
      R`The nearest part of the \(x\)-axis is at \(${axis}^\circ\): \(${Q === 3 ? `${d}^\\circ - 180^\\circ` : `${axis}^\\circ - ${d}^\\circ`} = ${ref}^\circ\).`,
    ],
    rule: 2, skill: 'reference angles',
    visual: { type: 'angle', rays: [0, 90, 180, 270, d], arcs: [{ from: 0, to: d, label: `${d}°` }], alt: `Coordinate axes with an angle of ${d}° in standard position. Its terminal side is in quadrant ${ROMAN[Q]}.` },
    check: () => (ref > 0 && ref < 90 && close(Math.abs(Math.cos(d * RAD)), Math.cos(ref * RAD)) ? true : 'not the acute angle to the x-axis'),
  });
}

// ───────────── Medium ─────────────

const SPECIAL = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];

function mediumExactValue(rng) {
  return exactQuestion(rng.pick(['sin', 'cos', 'tan']), rng.bool(0.2) ? 90 * rng.int(0, 3) : rng.pick(SPECIAL), rng.bool(0.5));
}

function mediumSigns(rng) {
  const want = rng.pick([-1, -1, 1]); // look for the one negative value, or the one positive value
  const picks = [];
  while (picks.length < 4) {
    const fn = rng.pick(['sin', 'cos', 'tan']);
    const d = 10 * rng.pick(range(1, 35).filter((k) => k % 9)) + 360 * rng.pick([-1, 0, 0, 1]);
    const item = { fn, d, s: SIGN[fn](mod360(d)), tex: call(fn, d, false) };
    if (item.s === (picks.length ? -want : want) && !picks.some((p) => p.tex === item.tex)) picks.push(item);
  }
  const sign = (s) => (s > 0 ? 'positive' : 'negative');
  const where = (it) => R`\(${ang(it.d)}\) is ${it.d === mod360(it.d) ? '' : R`coterminal with \(${ang(mod360(it.d))}\), which is `}in quadrant ${ROMAN[quadrant(it.d)]}`;
  return q({
    prompt: `Which of these values is ${sign(want)}?`,
    correct: M(picks[0].tex),
    wrong: picks.slice(1).map((it) => ({ value: M(it.tex), why: `${where(it)}, where ${WORD[it.fn]} is ${sign(it.s)}.` })),
    solution: [
      'Find the quadrant of each angle. Sine is positive in quadrants I and II, cosine in I and IV, and tangent in I and III.',
      `${where(picks[0])}, where ${WORD[picks[0].fn]} is ${sign(want)}.`,
      `The other three values are ${sign(-want)}: ${picks.slice(1).map((it) => `${where(it)}`).join('; ')}.`,
      R`So the ${sign(want)} value is \(${picks[0].tex}\).`,
    ],
    rule: 4, skill: 'signs by quadrant',
    check: () => (picks.every((it, i) => Math.sign(Math[it.fn](it.d * RAD)) === (i ? -want : want)) ? true : 'the signs are not one against three'),
  });
}

// The number b in sin(bx) is c or cπ. Each entry: [c, has π].
const B_VALUES = [[frac(2), false], [frac(3), false], [frac(4), false], [frac(6), false], [frac(1, 2), false], [frac(1, 3), false], [frac(1, 4), false], [frac(1), true], [frac(2), true], [frac(1, 2), true], [frac(1, 3), true], [frac(1, 4), true]];
const STORIES = [
  { intro: (f) => R`The height, in metres, of a rider on a Ferris wheel is \(h(t) = ${f}\), where \(t\) is the time in seconds.`, max: 'What is the greatest height the rider reaches?', min: 'What is the lowest height the rider reaches?', period: 'How long does one full turn of the wheel take?', unit: 'm', time: 'seconds' },
  { intro: (f) => R`The depth, in metres, of the water at a pier is \(d(t) = ${f}\), where \(t\) is the time in hours.`, max: 'How deep is the water at high tide?', min: 'How deep is the water at low tide?', period: 'How much time passes from one high tide to the next?', unit: 'm', time: 'hours' },
  { intro: (f) => R`The temperature, in °C, inside a greenhouse is \(T(t) = ${f}\), where \(t\) is the time in hours.`, max: 'What is the highest temperature?', min: 'What is the lowest temperature?', period: 'How long does one full cycle of the temperature take?', unit: '°C', time: 'hours' },
];

function mediumWaveFeatures(rng) {
  const story = rng.bool(0.4) ? rng.pick(STORIES) : null;
  const fn = rng.pick(['sin', 'cos']);
  const a = story ? rng.sign() * rng.int(2, 15) : rng.nonzero(-8, 8);
  const amp = Math.abs(a);
  const d = story ? amp + rng.int(1, 20) : rng.int(-6, 6);
  const [c, pi] = story ? [frac(1, rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30])), true] : rng.pick(B_VALUES);
  const x = story ? 't' : 'x';
  const b = (pi ? Math.PI : 1) * c.value;
  const bTex = pi ? piTex(c) : num(c);
  const fTex = wave(a, fn, bxTex(c, pi, x), d);
  const ask = rng.pick(story ? ['max', 'min', 'period'] : ['amplitude', 'period', 'midline']);
  const P = frac(2).div(c); // the period is P when b = cπ, and Pπ when b = c
  const value = { amplitude: amp, midline: d, max: d + amp, min: d - amp, period: (2 * Math.PI) / b }[ask];
  const compare = R`Compare with \(y = a${TEX[fn]}(b${x}) + d\): here \(a = ${a}\), \(b = ${bTex}\) and \(d = ${d}\).`;
  let parts;
  if (ask === 'period') {
    const half = frac(1).div(c);
    const isB = R`That is \(b\), the number multiplying \(${x}\). The period is \(\dfrac{2\pi}{b}\).`;
    const isHalf = R`One full cycle of ${WORD[fn]} takes \(2\pi\), not \(\pi\). Divide \(2\pi\) by \(b\).`;
    parts = {
      ...symChoices(K(pi ? num(P) : piTex(P), value), pi
        ? [K(num(half), half.value, isHalf), K(piTex(c), b, isB), K(piTex(P), P.value * Math.PI, R`The \(\pi\) cancels: \(2\pi \div ${bTex} = ${num(P)}\).`), K(num(P.mul(2)), P.value * 2)]
        : [K(num(c), b, isB), K(piTex(c.mul(2)), 2 * Math.PI * b, R`Divide \(2\pi\) by \(b\). Do not multiply.`), K(piTex(half), Math.PI / b, isHalf), K('2\\pi', 2 * Math.PI)],
      [0], story ? (tex) => `${M(tex)} ${story.time}` : M),
      steps: [R`The period is \(\dfrac{2\pi}{b} = 2\pi \div ${bTex} = ${pi ? num(P) : piTex(P)}\)${story ? ` ${story.time}` : ''}.`],
    };
  } else if (ask === 'amplitude') {
    parts = {
      correct: amp,
      wrong: [
        a < 0 ? { value: a, why: 'Amplitude is a distance, so it is never negative. Take the absolute value of the number in front.' } : null,
        { value: 2 * amp, why: 'That is the distance from the lowest point to the highest. The amplitude is half of that: from the midline to a peak.' },
        d ? { value: d, why: R`\(${d}\) shifts the graph up or down. The amplitude comes from the number that multiplies the ${WORD[fn]}.` } : null,
        amp + Math.abs(d) + 1,
      ],
      steps: [R`The amplitude is \(|a| = ${amp}\).`],
    };
  } else if (ask === 'midline') {
    const lines = [...new Set([-d, 0, d + amp, d - amp])].filter((v) => v !== d && v !== a);
    parts = {
      correct: M(`y = ${d}`),
      wrong: [
        a !== d ? { value: M(`y = ${a}`), why: R`\(${a}\) multiplies the ${WORD[fn]}, so it sets the amplitude. The midline comes from the number added at the end.` } : null,
        { value: M(`x = ${d}`), why: R`The midline is a horizontal line, so its equation has the form \(y = \text{a number}\).` },
        ...lines.map((v) => M(`y = ${v}`)),
      ],
      steps: [R`The midline is the horizontal line \(y = d\), so it is \(y = ${d}\).`],
    };
  } else {
    const [top, sum, other] = ask === 'max' ? ['greatest', `${d} + ${amp}`, d - amp] : ['least', `${d} - ${amp}`, d + amp];
    parts = {
      correct: value,
      unit: story.unit,
      wrong: [
        { value: d, why: `That is the midline value. The ${top} value is one amplitude ${ask === 'max' ? 'above' : 'below'} it.` },
        { value: other, why: `That is the ${ask === 'max' ? 'least' : 'greatest'} value. The question asks for the ${top} value.` },
        { value: amp, why: `That is the amplitude: how far the values move from the midline. ${ask === 'max' ? 'Add it to' : 'Subtract it from'} the midline value.` },
        ask === 'max' ? d + 2 * amp : d + 1,
      ],
      steps: [R`The midline value is \(${d}\) and the amplitude is \(|a| = ${amp}\).`, R`The ${top} value is \(${sum} = ${value}\) ${story.unit}.`],
    };
  }
  const { steps, ...choices } = parts;
  return q({
    prompt: story ? `${story.intro(fTex)} ${story[ask]}` : R`For the function \(y = ${fTex}\), find the ${ask === 'midline' ? 'equation of the midline' : ask}.`,
    ...choices,
    solution: [compare, ...steps],
    rule: 6, skill: story ? 'waves in context' : 'amplitude, period, midline',
    check: () => {
      const f = (v) => a * Math[fn](b * v) + d;
      if (ask === 'period') return [0.3, 1.1].every((x0) => close(f(x0 + value), f(x0)) && !close(f(x0 + value / 2), f(x0))) ? true : 'the graph does not repeat with this period';
      const ys = range(0, 400).map((i) => f((i / 400) * ((2 * Math.PI) / b))); // one full cycle
      const [hi, lo] = [Math.max(...ys), Math.min(...ys)];
      return checkEqual({ amplitude: (hi - lo) / 2, midline: (hi + lo) / 2, max: hi, min: lo }[ask], value, 1e-9, ask);
    },
  });
}

// ───────────── Hard ─────────────

const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];

function hardPythagorean(rng) {
  let [p, h] = [0, rng.int(3, 9)];
  if (rng.bool(0.45)) {
    const t = rng.pick(TRIPLES);
    [p, h] = [t[rng.int(0, 1)], t[2]];
  } else p = rng.pick(range(1, h - 1).filter((v) => gcd(v, h) === 1));
  const Q = rng.int(1, 4);
  const given = rng.pick(['sin', 'cos']);
  const ask = given === 'sin' ? 'cos' : 'sin';
  const sA = signIn(ask, Q);
  const g = frac(signIn(given, Q) * p, h);
  const rest = h * h - p * p;
  const form = (v, why) => K(v.tex, v.value, why);
  const F = (n, den, why) => K(frac(n, den).tex(), n / den, why);
  const right = radForm(0, sA, rest, h);
  return q({
    prompt: R`Given \(${TEX[given]}\theta = ${g.tex()}\) with \(\theta\) in quadrant ${ROMAN[Q]}, find \(${TEX[ask]}\theta\).`,
    ...symChoices(form(right), [
      form(radForm(0, -sA, rest, h), `In quadrant ${ROMAN[Q]}, ${WORD[ask]} is ${sA > 0 ? 'positive' : 'negative'}.`),
      F(sA * (h - p), h, R`The identity uses squares: \(${TEX[ask]}^{2}\theta = 1 - ${TEX[given]}^{2}\theta\). It is not \(1 - ${TEX[given]}\theta\).`),
      F(rest, h * h, R`That is \(${TEX[ask]}^{2}\theta\). Take the square root, then choose the sign for quadrant ${ROMAN[Q]}.`),
      F(sA * p, h), form(radForm(0, sA, rest, p)),
    ], [0]),
    solution: [
      R`Use \(\sin^{2}\theta + \cos^{2}\theta = 1\): \(${TEX[ask]}^{2}\theta = 1 - \left(${g.tex()}\right)^{2} = 1 - ${frac(p * p, h * h).tex()} = ${frac(rest, h * h).tex()}\).`,
      R`Take the square root: \(${TEX[ask]}\theta = \pm${radForm(0, 1, rest, h).tex}\).`,
      R`In quadrant ${ROMAN[Q]}, ${WORD[ask]} is ${sA > 0 ? 'positive' : 'negative'}, so \(${TEX[ask]}\theta = ${right.tex}\).`,
    ],
    rule: 5, skill: 'Pythagorean identity',
    check: () => {
      const alpha = given === 'sin' ? Math.asin(p / h) : Math.acos(p / h);
      const theta = [alpha, Math.PI - alpha, Math.PI + alpha, 2 * Math.PI - alpha][Q - 1];
      return close(Math[given](theta), g.value) && close(Math[ask](theta), right.value) ? true : 'no angle in that quadrant has both values';
    },
  });
}

function hardExactAnyAngle(rng) {
  return exactQuestion(rng.pick(['sin', 'cos', 'tan']), rng.pick(SPECIAL) + 360 * rng.pick([-2, -1, -1, 1, 1]), rng.bool(0.6));
}

// Graphs that are easy to read: b, the width of the window and the tick spacing (both in units of π).
const WINDOWS = [[frac(1, 2), 4, 1], [frac(1), 4, 1 / 2], [frac(2), 2, 1 / 4], [frac(3), 2, 1 / 6]];
const piText = (f) => `${f.n === 1 ? '' : f.n}π${f.d === 1 ? '' : `/${f.d}`}`;

function hardMatchGraph(rng) {
  const [b, width, tick] = rng.pick(WINDOWS);
  const fn = rng.pick(['sin', 'cos']);
  const a = rng.nonzero(-4, 4);
  const d = rng.int(-3, 3);
  const amp = Math.abs(a);
  const P = frac(2).div(b);
  const opt = (A, F, B, D, why) => ({ tex: `y = ${wave(A, F, bxTex(B, false), D)}`, f: (x) => A * Math[F](B.value * x) + D, why });
  const right = opt(a, fn, b, d);
  const start = fn === 'sin' ? `on its midline and heads ${a > 0 ? 'up' : 'down'}` : `at its ${a > 0 ? 'highest' : 'lowest'} point`;
  const wrongs = rng.shuffle([
    opt(a, fn, b.d === 1 && b.n > 1 ? b.inv() : b.mul(2), d, R`One full cycle takes \(${piTex(P)}\), so \(b = 2\pi \div ${piTex(P)} = ${num(b)}\).`),
    opt(a, fn === 'sin' ? 'cos' : 'sin', b, d, fn === 'sin' ? R`At \(x = 0\) a cosine graph is at its highest or lowest point. This graph starts on its midline, like sine.` : R`At \(x = 0\) a sine graph is on its midline. This graph starts at its highest or lowest point, like cosine.`),
    opt(-a, fn, b, d, R`At \(x = 0\) this graph is ${start}. Changing the sign of \(a\) flips the graph upside down.`),
    opt(2 * a, fn, b, d, 'The amplitude is the distance from the midline to a peak, not from the lowest point to the highest.'),
    opt(a, fn, b, d ? -d : amp, R`The midline is halfway between the highest and lowest values: \(y = ${d}\).`),
  ]);
  return q({
    prompt: 'Which equation matches the graph?',
    ...symChoices(right, wrongs),
    solution: [
      R`The highest value is \(${d + amp}\) and the lowest is \(${d - amp}\). The midline is halfway between: \(y = ${d}\). The amplitude is \(${d + amp} - ${d < 0 ? `(${d})` : d} = ${amp}\).`,
      R`One full cycle takes \(${piTex(P)}\), so \(b = 2\pi \div ${piTex(P)} = ${num(b)}\).`,
      R`At \(x = 0\) the graph is ${start}, which fits ${fn === 'sin' ? 'sine' : 'cosine'} with \(a = ${a}\): \(${right.tex}\).`,
    ],
    rule: 6, skill: 'equations from graphs',
    visual: {
      type: 'plot',
      x: [0, width * Math.PI],
      y: [Math.min(-1, d - amp - 1), Math.max(1, d + amp + 1)],
      piTicks: true,
      step: [tick * Math.PI, 1],
      fns: [{ f: right.f }],
      alt: `Graph of a wave from x = 0 to x = ${width}π. At x = 0 it is ${start}. Its highest value is ${txt(d + amp)}, its lowest value is ${txt(d - amp)}, and one full cycle takes ${piText(P)}.`,
    },
    check: () => {
      const f = (x) => a * Math[fn](b.value * x) + d;
      const period = P.value * Math.PI;
      const ys = range(0, 400).map((i) => f((i / 400) * period));
      const startOk = fn === 'sin' ? close(f(0), d) && Math.sign(f(0.01) - d) === Math.sign(a) : close(f(0), d + a);
      return close(Math.max(...ys), d + amp) && close(Math.min(...ys), d - amp) && close(f(0.4 + period), f(0.4)) && !close(f(0.4 + period / 2), f(0.4)) && startOk ? true : 'the graph does not have the features in the solution';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeBuildModel(rng) {
  const wheel = rng.bool(0.5);
  const A = wheel ? rng.int(4, 25) : rng.int(2, 12);
  const k = rng.pick(wheel ? [10, 12, 15, 20, 30, 45, 60] : [1, 2, 3, 4, 5, 6]);
  const low = wheel ? rng.int(1, 6) : rng.int(3, 20);
  const [C, P, s, name] = [low + A, 2 * k, wheel ? -1 : 1, wheel ? 'h' : 'y'];
  const bt = bxTex(frac(1, k), true, 't');
  const opt = (amp, arg, bValue, mid, F, why) => ({ tex: `${name}(t) = ${wave(amp, F, arg, mid)}`, f: (t) => amp * Math[F](bValue * t) + mid, why });
  const right = opt(s * A, bt, Math.PI / k, C, 'cos');
  const wrongs = rng.shuffle([
    opt(-s * A, bt, Math.PI / k, C, 'cos', wheel ? R`At \(t = 0\) this gives the highest point, but the rider starts at the lowest point.` : R`At \(t = 0\) this gives the lowest point, but the weight starts at its highest point.`),
    opt(2 * s * A, bt, Math.PI / k, C, 'cos', wheel ? 'The amplitude is the radius of the wheel, which is half of the diameter.' : 'The amplitude is half of the distance between the highest and lowest points.'),
    opt(s * A, `${P}t`, P, C, 'cos', R`The number multiplying \(t\) is \(2\pi\) divided by the period, not the period itself.`),
    opt(s * A, bt, Math.PI / k, wheel ? low : C + A, 'cos', wheel ? 'The midline is the height of the centre of the wheel: the lowest point plus the radius.' : 'The midline is halfway between the highest and lowest heights.'),
    opt(s * A, bt, Math.PI / k, C, 'sin', 'A sine curve starts on its midline. Here the starting value is the highest or lowest value, which fits cosine.'),
  ]);
  return q({
    prompt: wheel
      ? R`A Ferris wheel has a diameter of ${2 * A} m. Its lowest point is ${low} m above the ground, and it makes one full turn every ${P} seconds. A rider gets on at the lowest point when \(t = 0\). Which function gives the rider's height, in metres, after \(t\) seconds?`
      : R`A weight on a spring bobs up and down between ${low} cm and ${C + A} cm above a table. One full bounce, down and back up, takes ${P} seconds. The weight is at its highest point when \(t = 0\). Which function gives its height, in centimetres, after \(t\) seconds?`,
    ...symChoices(right, wrongs),
    solution: [
      wheel
        ? R`Amplitude: the radius, \(${2 * A} \div 2 = ${A}\). Midline: the height of the centre, \(${low} + ${A} = ${C}\).`
        : R`Amplitude: half the distance between the extremes, \((${C + A} - ${low}) \div 2 = ${A}\). Midline: halfway between them, \((${C + A} + ${low}) \div 2 = ${C}\).`,
      R`The period is ${P} seconds, so \(b = \dfrac{2\pi}{${P}} = ${piTex(frac(1, k))}\).`,
      wheel
        ? R`The rider starts at the lowest point. Cosine starts at its highest point, so put a negative sign in front: \(${right.tex}\).`
        : R`The weight starts at its highest point, which is how cosine starts: \(${right.tex}\).`,
      R`Check: \(${name}(0) = ${s * A} + ${C} = ${C + s * A}\). ✓`,
    ],
    rule: 6, skill: 'modelling with sine and cosine',
    check: () => {
      const ys = range(0, 400).map((i) => right.f((i / 400) * P));
      return close(right.f(0), C + s * A) && close(right.f(k), C - s * A) && close(right.f(P + 1.7), right.f(1.7)) && close(Math.max(...ys), C + A) && close(Math.min(...ys), low) ? true : 'the function does not fit the description';
    },
  });
}

function challengeTwoConditions(rng) {
  const t = rng.pick(TRIPLES);
  const [o, adj, h] = rng.bool(0.5) ? t : [t[1], t[0], t[2]];
  const Q = rng.int(1, 4);
  const val = { sin: frac(signIn('sin', Q) * o, h), cos: frac(signIn('cos', Q) * adj, h), tan: frac(signIn('tan', Q) * o, adj) };
  const [given, cond, third] = rng.shuffle(['sin', 'cos', 'tan']);
  const ask = rng.bool(0.5) ? cond : third;
  const spare = ask === cond ? third : cond;
  const rel = (fn) => R`\(${TEX[fn]}\theta ${val[fn].value > 0 ? '>' : '<'} 0\)`;
  const sides = given === 'sin' ? R`opposite \(${o}\) and hypotenuse \(${h}\), so the adjacent side is \(\sqrt{${h}^{2} - ${o}^{2}} = ${adj}\)`
    : given === 'cos' ? R`adjacent \(${adj}\) and hypotenuse \(${h}\), so the opposite side is \(\sqrt{${h}^{2} - ${adj}^{2}} = ${o}\)`
      : R`opposite \(${o}\) and adjacent \(${adj}\), so the hypotenuse is \(\sqrt{${o}^{2} + ${adj}^{2}} = ${h}\)`;
  return q({
    prompt: R`Given \(${TEX[given]}\theta = ${val[given].tex()}\) and ${rel(cond)}, find \(${TEX[ask]}\theta\).`,
    correct: val[ask],
    wrong: [
      { value: val[ask].neg(), why: R`${rel(given)} and ${rel(cond)} put \(\theta\) in quadrant ${ROMAN[Q]}, where ${WORD[ask]} is ${val[ask].value > 0 ? 'positive' : 'negative'}.` },
      { value: val[spare], why: R`That is \(${TEX[spare]}\theta\). The question asks for \(${TEX[ask]}\theta\).` },
      val[ask].inv(), val[spare].neg(), val[spare].inv(),
    ],
    solution: [
      R`${rel(given)} and ${rel(cond)} are both true only in quadrant ${ROMAN[Q]}.`,
      R`Draw a reference triangle. \(|${TEX[given]}\theta| = ${val[given].abs().tex()}\) gives ${sides}.`,
      R`So \(|${TEX[ask]}\theta| = ${val[ask].abs().tex()}\). In quadrant ${ROMAN[Q]}, ${WORD[ask]} is ${val[ask].value > 0 ? 'positive' : 'negative'}: \(${TEX[ask]}\theta = ${val[ask].tex()}\).`,
    ],
    rule: 5, skill: 'trig values from one value',
    check: () => {
      const alpha = Math.atan2(o, adj);
      const theta = [alpha, Math.PI - alpha, Math.PI + alpha, 2 * Math.PI - alpha][Q - 1];
      return ['sin', 'cos', 'tan'].every((fn) => close(Math[fn](theta), val[fn].value)) ? true : 'no angle has these three values';
    },
  });
}

function challengeSolveAngles(rng) {
  const fn = rng.pick(['sin', 'cos', 'tan']);
  const ref = rng.pick([30, 45, 60]);
  const s = rng.sign();
  const rad = rng.bool(0.6);
  const target = withSign(TABLE[fn][ref], s);
  const at = (r, Q) => [r, 180 - r, 180 + r, 360 - r][Q - 1]; // the angle in quadrant Q with reference angle r
  const good = [1, 2, 3, 4].filter((Q) => signIn(fn, Q) === s);
  const bad = [1, 2, 3, 4].filter((Q) => signIn(fn, Q) !== s);
  const mixed = fn === 'sin' ? (s > 0 ? [1, 4] : [2, 3]) : s > 0 ? [1, 2] : [3, 4]; // the quadrants a different function would use
  const show = (r, Qs) => M(Qs.map((Q) => at(r, Q)).sort((x, y) => x - y).map((d) => ang(d, rad)).join(R` \text{ and } `));
  const otherRef = ref === 45 ? 60 : 90 - ref;
  const quads = (Qs) => `quadrants ${ROMAN[Qs[0]]} and ${ROMAN[Qs[1]]}`;
  const sign = s > 0 ? 'positive' : 'negative';
  const how = (Q) => (Q === 1 ? ang(ref, rad) : `${ang(Q === 4 ? 360 : 180, rad)} ${Q === 2 || Q === 4 ? '-' : '+'} ${ang(ref, rad)} = ${ang(at(ref, Q), rad)}`);
  return q({
    prompt: R`Find all angles \(\theta\) with \(${rad ? R`0 \le \theta < 2\pi` : R`0^\circ \le \theta < 360^\circ`}\) for which \(${TEX[fn]}\theta = ${target.tex}\).`,
    correct: show(ref, good),
    wrong: [
      { value: show(ref, bad), why: R`Those angles give \(${TEX[fn]}\theta = ${flip(target).tex}\). ${cap(WORD[fn])} is ${sign} in ${quads(good)}.` },
      { value: show(otherRef, good), why: R`The reference angle is \(${ang(ref, rad)}\), because \(${call(fn, ref, rad)} = ${TABLE[fn][ref].tex}\).` },
      { value: show(ref, mixed), why: `${cap(WORD[fn])} is ${sign} in ${quads(good)}.` },
      show(otherRef, bad),
    ],
    solution: [
      R`Ignore the sign first: \(${call(fn, ref, rad)} = ${TABLE[fn][ref].tex}\), so the reference angle is \(${ang(ref, rad)}\).`,
      `${cap(WORD[fn])} is ${sign} in ${quads(good)}.`,
      R`Quadrant ${ROMAN[good[0]]}: \(${how(good[0])}\). Quadrant ${ROMAN[good[1]]}: \(${how(good[1])}\).`,
    ],
    rule: 4, skill: 'angles from a trig value',
    check: () => {
      const found = range(0, 23).map((i) => 15 * i).filter((d) => close(Math[fn](d * RAD), target.v));
      return found.join() === good.map((Q) => at(ref, Q)).sort((x, y) => x - y).join() ? true : `the solutions are ${found.join(', ')} degrees`;
    },
  });
}

// ───────────── Models ─────────────

const circlePicture = (d, label, alt) => ({
  type: 'plot',
  square: true,
  x: [-1.4, 1.4],
  y: [-1.4, 1.4],
  step: [1, 1],
  param: [{ x: Math.cos, y: Math.sin, t: [0, 2 * Math.PI] }],
  segments: [{ from: [0, 0], to: [Math.cos(d * RAD), Math.sin(d * RAD)] }, { from: [Math.cos(d * RAD), Math.sin(d * RAD)], to: [Math.cos(d * RAD), 0], dashed: true, color: 'c' }],
  points: [{ x: Math.cos(d * RAD), y: Math.sin(d * RAD), label }],
  alt,
});

function angleModel({ deg }) {
  const m = mod360(deg);
  const [Q, ref] = [quadrant(deg), refAngle(deg)];
  const special = [0, 30, 45, 60, 90].includes(ref);
  const show = (fn) => (special ? `= ${exact(fn, deg).tex}` : `\\approx ${num(Math[fn](deg * RAD), { places: 3 })}`);
  const place = Q ? `in quadrant ${ROMAN[Q]}` : `on the ${m % 180 ? 'y' : 'x'}-axis`;
  const toAxis = Q === 1 ? '' : Q === 2 ? R`180^\circ - ${m}^\circ = ` : Q === 3 ? R`${m}^\circ - 180^\circ = ` : R`360^\circ - ${m}^\circ = `;
  const values = R`\(\cos\theta ${show('cos')}\), \(\sin\theta ${show('sin')}\), \(\tan\theta ${show('tan').replace(/^= \\text\{(.*)\}$/, R`\text{ is $1}`)}\)`;
  const steps = [R`In radians: \(${deg}^\circ \cdot \dfrac{\pi}{180^\circ} = ${piTex(frac(deg, 180))}\).`];
  if (deg !== m) steps.push(R`Coterminal angle within one turn: \(${deg}^\circ ${deg < m ? '+' : '-'} ${Math.abs(m - deg)}^\circ = ${m}^\circ\).`);
  steps.push(Q ? R`\(${m}^\circ\) is between \(${90 * (Q - 1)}^\circ\) and \(${90 * Q}^\circ\), so the terminal side is in quadrant ${ROMAN[Q]}.` : R`The terminal side lies on the \(${m % 180 ? 'y' : 'x'}\)-axis and meets the unit circle at \(${ON_AXIS[m]}\).`);
  if (Q) steps.push(R`Reference angle (the acute angle to the \(x\)-axis): \(${toAxis}${ref}^\circ\).`);
  steps.push(R`The point on the unit circle is \((\cos\theta, \sin\theta)\), and \(\tan\theta = \dfrac{\sin\theta}{\cos\theta}\): ${values}.`);
  return {
    problem: R`\(\theta = ${deg}^\circ\) in standard position`,
    steps,
    answer: R`${Q ? R`Quadrant ${ROMAN[Q]}, reference angle \(${ref}^\circ\)` : `On the ${m % 180 ? 'y' : 'x'}-axis`}. ${values}`,
    visual: circlePicture(deg, `(${txt(Math.cos(deg * RAD), { places: 2 })}, ${txt(Math.sin(deg * RAD), { places: 2 })})`, `Unit circle with the terminal side of ${txt(deg)}° drawn from the centre to the point (${txt(Math.cos(deg * RAD), { places: 2 })}, ${txt(Math.sin(deg * RAD), { places: 2 })}), ${place}.`),
  };
}

function wheelModel({ D, low, P, t }) {
  const [A, C] = [D / 2, low + D / 2];
  const h = (x) => -A * Math.cos(((2 * Math.PI) / P) * x) + C;
  const now = h(t);
  const exactNow = close(now, round(now, 2), 1e-9);
  return {
    problem: R`A Ferris wheel has a diameter of ${D} m. Its lowest point is ${low} m above the ground, and it makes one full turn every ${P} seconds. A rider gets on at the lowest point when \(t = 0\). Write a function for the rider's height and find the height after ${t} seconds.`,
    steps: [
      R`Amplitude: the radius, \(${D} \div 2 = ${num(A)}\) m.`,
      R`Midline: the height of the centre, \(${low} + ${num(A)} = ${num(C)}\) m.`,
      R`Period: ${P} seconds, so \(b = \dfrac{2\pi}{${P}}${P % 2 ? '' : ` = ${piTex(frac(2, P))}`}\).`,
      R`The rider starts at the lowest point, so use cosine with a negative sign in front: \(h(t) = -${num(A)}\cos\left(${bxTex(frac(2, P), true, 't')}\right) + ${num(C)}\).`,
      R`At \(t = ${t}\): \(h(${t}) = -${num(A)}\cos\left(${piTex(frac(2 * t, P))}\right) + ${num(C)} ${exactNow ? '=' : R`\approx`} ${num(now, { places: 2 })}\) m.`,
    ],
    answer: `${exactNow ? '' : 'About '}${txt(now, { places: 2 })} m above the ground after ${t} seconds`,
    visual: {
      type: 'plot',
      x: [0, Math.max(2 * P, t * 1.1)],
      y: [0, (low + D) * 1.2],
      fns: [{ f: h }],
      hlines: [{ y: C }],
      points: [{ x: t, y: now, label: `${txt(now, { places: 1 })} m` }],
      axisLabels: ['t (s)', 'h (m)'],
      alt: `Graph of the rider's height against time: a wave that starts at ${txt(low)} m, rises to ${txt(low + D)} m and returns every ${P} seconds, around a dashed midline at ${txt(C)} m. The point at ${t} seconds is marked at a height of about ${txt(now, { places: 1 })} m.`,
    },
  };
}

export default {
  id: 'trig-functions',
  title: 'Trigonometric Functions & the Unit Circle',
  summary: 'Convert between degrees and radians, find exact trig values on the unit circle, and read sine and cosine graphs.',
  standards: ['CCSS F-TF.A.1', 'CCSS F-TF.A.2', 'CCSS F-TF.B.5', 'CCSS F-TF.C.8'],

  explain: {
    intro: R`Angles can turn past a full circle or turn backwards, and they can be measured in degrees or in radians. Put an angle in standard position, with its vertex at the origin and its initial side along the positive \(x\)-axis, and its terminal side meets the unit circle at the point \((\cos\theta, \sin\theta)\). That one picture gives the values of sine, cosine and tangent, their signs, and the wave shape of their graphs.`,
    rules: [
      {
        title: 'Degrees and radians',
        text: R`A full turn is \(360^\circ\) or \(2\pi\) radians, so \(180^\circ = \pi\) radians. To change degrees to radians, multiply by \(\dfrac{\pi}{180^\circ}\). To change radians to degrees, multiply by \(\dfrac{180^\circ}{\pi}\).`,
        example: R`\(150^\circ = \dfrac{150\pi}{180} = \dfrac{5\pi}{6}\) and \(\dfrac{7\pi}{4} = \dfrac{7}{4} \cdot 180^\circ = 315^\circ\).`,
      },
      {
        title: 'Coterminal angles',
        text: R`Positive angles turn counter-clockwise and negative angles turn clockwise. Angles that finish on the same terminal side are coterminal. They differ by full turns, so add or subtract \(360^\circ\) (or \(2\pi\)).`,
        example: R`\(495^\circ - 360^\circ = 135^\circ\) and \(-\dfrac{\pi}{3} + 2\pi = \dfrac{5\pi}{3}\).`,
      },
      {
        title: 'Reference angles',
        text: R`The reference angle is the acute angle between the terminal side and the \(x\)-axis. For \(\theta\) between \(0^\circ\) and \(360^\circ\): in quadrant I it is \(\theta\) itself, in quadrant II it is \(180^\circ - \theta\), in quadrant III it is \(\theta - 180^\circ\), and in quadrant IV it is \(360^\circ - \theta\).`,
        example: R`\(210^\circ\) is in quadrant III, so its reference angle is \(210^\circ - 180^\circ = 30^\circ\).`,
      },
      {
        title: 'The unit circle',
        text: R`The terminal side of \(\theta\) meets the unit circle at the point \((\cos\theta, \sin\theta)\), and \(\tan\theta = \dfrac{\sin\theta}{\cos\theta}\). Know the values for \(30^\circ\), \(45^\circ\) and \(60^\circ\) in the table, and the four points on the axes.`,
        example: R`At \(90^\circ\) the point is \((0, 1)\), so \(\cos 90^\circ = 0\) and \(\sin 90^\circ = 1\). \(\tan 90^\circ\) is not defined, because it would divide by 0.`,
      },
      {
        title: 'Signs by quadrant',
        text: R`A trig value of any angle is the value at its reference angle, with a sign that depends on the quadrant. All three functions are positive in quadrant I. Only sine is positive in II, only tangent in III, and only cosine in IV.`,
        example: R`\(\cos 210^\circ = -\cos 30^\circ = -\dfrac{\sqrt{3}}{2}\), because cosine is negative in quadrant III.`,
      },
      {
        title: 'The Pythagorean identity',
        text: R`Every point on the unit circle satisfies \(x^{2} + y^{2} = 1\), so \(\sin^{2}\theta + \cos^{2}\theta = 1\) for every angle. Use it to find sine from cosine or cosine from sine, then choose the sign from the quadrant.`,
        example: R`If \(\sin\theta = \dfrac{3}{5}\) and \(\theta\) is in quadrant II, then \(\cos^{2}\theta = 1 - \dfrac{9}{25} = \dfrac{16}{25}\), so \(\cos\theta = -\dfrac{4}{5}\).`,
      },
      {
        title: 'Sine and cosine graphs',
        text: R`For \(y = a\sin(bx) + d\) or \(y = a\cos(bx) + d\) with \(b > 0\): the amplitude is \(|a|\), the period is \(\dfrac{2\pi}{b}\) and the midline is \(y = d\). The values run from \(d - |a|\) to \(d + |a|\). At \(x = 0\) a sine graph is on its midline and a cosine graph is at a peak (or at its lowest point when \(a\) is negative).`,
        example: R`\(y = 3\sin(2x) + 1\) has amplitude 3, period \(\dfrac{2\pi}{2} = \pi\) and midline \(y = 1\). Its values run from \(-2\) to \(4\).`,
      },
    ],
    vocab: [
      { term: 'radian', def: R`The angle at the centre of a circle that cuts off an arc as long as the radius. A full turn is \(2\pi\) radians.` },
      { term: 'standard position', def: R`An angle with its vertex at the origin and its initial side along the positive \(x\)-axis.` },
      { term: 'coterminal angles', def: 'Angles in standard position that share the same terminal side.' },
      { term: 'reference angle', def: R`The acute angle between the terminal side of an angle and the \(x\)-axis.` },
      { term: 'unit circle', def: 'The circle of radius 1 centred at the origin.' },
      { term: 'amplitude', def: 'The distance from the midline of a wave to its highest point. It is never negative.' },
      { term: 'period', def: 'The length of one full cycle of a graph that repeats.' },
      { term: 'midline', def: 'The horizontal line halfway between the highest and lowest values of a wave.' },
    ],
    mistakes: [
      R`Swapping the coordinates. On the unit circle, cosine is the \(x\)-coordinate and sine is the \(y\)-coordinate.`,
      'Forgetting the sign. Find the quadrant first, then decide whether the value is positive or negative.',
      R`Measuring a reference angle to the \(y\)-axis. It is always measured to the \(x\)-axis.`,
      R`Reading \(b\) as the period. The period of \(y = \sin(bx)\) is \(\dfrac{2\pi}{b}\), so a larger \(b\) gives a shorter period.`,
      R`Using \(\cos\theta = 1 - \sin\theta\). The identity is about squares: \(\cos^{2}\theta = 1 - \sin^{2}\theta\).`,
      'Giving a negative amplitude. A negative number in front flips the graph, but the amplitude is its absolute value.',
    ],
    visual: [
      circlePicture(35, 'P = (cos θ, sin θ)', 'Unit circle with an angle θ in standard position. Its terminal side meets the circle at the point P with coordinates (cos θ, sin θ). A dashed vertical line from P to the x-axis completes a right triangle.'),
      {
        type: 'table',
        caption: 'Special values to know',
        headers: [R`\(\theta\)`, R`\(0^\circ\)`, R`\(30^\circ\)`, R`\(45^\circ\)`, R`\(60^\circ\)`, R`\(90^\circ\)`],
        rowHeaders: true,
        rows: [
          ['radians', R`\(0\)`, R`\(\frac{\pi}{6}\)`, R`\(\frac{\pi}{4}\)`, R`\(\frac{\pi}{3}\)`, R`\(\frac{\pi}{2}\)`],
          [R`\(\sin\theta\)`, R`\(0\)`, R`\(\frac{1}{2}\)`, R`\(\frac{\sqrt{2}}{2}\)`, R`\(\frac{\sqrt{3}}{2}\)`, R`\(1\)`],
          [R`\(\cos\theta\)`, R`\(1\)`, R`\(\frac{\sqrt{3}}{2}\)`, R`\(\frac{\sqrt{2}}{2}\)`, R`\(\frac{1}{2}\)`, R`\(0\)`],
          [R`\(\tan\theta\)`, R`\(0\)`, R`\(\frac{\sqrt{3}}{3}\)`, R`\(1\)`, R`\(\sqrt{3}\)`, 'not defined'],
        ],
      },
    ],
  },

  examples: [
    {
      title: 'An exact value from a reference angle',
      problem: R`Find the exact value of \(\cos\left(\dfrac{7\pi}{6}\right)\).`,
      steps: [
        R`\(\dfrac{7\pi}{6}\) is a little more than \(\pi\), so the terminal side is in quadrant III.`,
        R`Reference angle: \(\dfrac{7\pi}{6} - \pi = \dfrac{\pi}{6}\).`,
        R`Cosine is negative in quadrant III, so \(\cos\left(\dfrac{7\pi}{6}\right) = -\cos\left(\dfrac{\pi}{6}\right) = -\dfrac{\sqrt{3}}{2}\).`,
      ],
      answer: R`\(-\dfrac{\sqrt{3}}{2}\)`,
      visual: circlePicture(210, '(−√3/2, −½)', 'Unit circle with the terminal side of 7π/6 in quadrant III. It meets the circle at the point (−√3/2, −½), so the cosine is −√3/2.'),
    },
    {
      title: 'An angle outside one turn',
      problem: R`Find the exact value of \(\sin(-510^\circ)\).`,
      steps: [
        R`Add full turns to find a coterminal angle between \(0^\circ\) and \(360^\circ\): \(-510^\circ + 720^\circ = 210^\circ\).`,
        R`\(210^\circ\) is in quadrant III. Its reference angle is \(210^\circ - 180^\circ = 30^\circ\).`,
        R`Sine is negative in quadrant III, so \(\sin(-510^\circ) = -\sin 30^\circ = -\dfrac{1}{2}\).`,
      ],
      answer: R`\(-\dfrac{1}{2}\)`,
    },
    {
      title: 'The Pythagorean identity',
      problem: R`Given \(\sin\theta = \dfrac{5}{13}\) with \(\theta\) in quadrant II, find \(\cos\theta\) and \(\tan\theta\).`,
      steps: [
        R`\(\cos^{2}\theta = 1 - \sin^{2}\theta = 1 - \dfrac{25}{169} = \dfrac{144}{169}\), so \(\cos\theta = \pm\dfrac{12}{13}\).`,
        R`Cosine is negative in quadrant II, so \(\cos\theta = -\dfrac{12}{13}\).`,
        R`\(\tan\theta = \dfrac{\sin\theta}{\cos\theta} = \dfrac{5}{13} \div \left(-\dfrac{12}{13}\right) = -\dfrac{5}{12}\).`,
      ],
      answer: R`\(\cos\theta = -\dfrac{12}{13}\) and \(\tan\theta = -\dfrac{5}{12}\)`,
    },
    {
      title: 'Amplitude, period and midline',
      problem: R`Describe the graph of \(y = 3\sin(2x) + 1\).`,
      steps: [
        R`Compare with \(y = a\sin(bx) + d\): \(a = 3\), \(b = 2\), \(d = 1\).`,
        R`Amplitude: \(|a| = 3\). Midline: \(y = 1\). So the values run from \(1 - 3 = -2\) to \(1 + 3 = 4\).`,
        R`Period: \(\dfrac{2\pi}{b} = \dfrac{2\pi}{2} = \pi\). The graph completes one full cycle between \(x = 0\) and \(x = \pi\).`,
      ],
      answer: R`Amplitude 3, period \(\pi\), midline \(y = 1\)`,
      visual: {
        type: 'plot',
        x: [0, 2 * Math.PI],
        y: [-3, 5],
        piTicks: true,
        step: [Math.PI / 4, 1],
        fns: [{ f: (x) => 3 * Math.sin(2 * x) + 1, label: 'y = 3 sin(2x) + 1', labelAt: 4.1 }],
        hlines: [{ y: 1 }],
        alt: 'Graph of y = 3 sin(2x) + 1 from x = 0 to 2π. The wave moves between −2 and 4 around the dashed midline y = 1, and completes two full cycles, one every π.',
      },
    },
    {
      title: 'Word problem: a Ferris wheel',
      word: true,
      problem: R`A Ferris wheel has a diameter of 40 m. Its lowest point is 2 m above the ground, and it makes one full turn every 60 seconds. A rider gets on at the lowest point when \(t = 0\). Write a function for the rider's height, and find the height after 20 seconds.`,
      steps: [
        R`Amplitude: the radius, 20 m. Midline: the height of the centre, \(2 + 20 = 22\) m.`,
        R`Period: 60 seconds, so \(b = \dfrac{2\pi}{60} = \dfrac{\pi}{30}\).`,
        R`The rider starts at the lowest point. Cosine starts at its highest point, so put a negative sign in front: \(h(t) = -20\cos\left(\dfrac{\pi t}{30}\right) + 22\).`,
        R`At \(t = 20\): \(h(20) = -20\cos\left(\dfrac{2\pi}{3}\right) + 22 = -20\left(-\dfrac{1}{2}\right) + 22 = 32\).`,
      ],
      answer: R`\(h(t) = -20\cos\left(\dfrac{\pi t}{30}\right) + 22\). The rider is 32 m high after 20 seconds.`,
    },
  ],

  models: [
    {
      id: 'unit-circle-angle',
      title: 'Any angle on the unit circle',
      intro: 'Type an angle in degrees. Negative angles and angles past 360° work too.',
      inputs: [{ name: 'deg', label: 'Angle θ (degrees)', type: 'int', min: -720, max: 720, value: 210 }],
      compute: angleModel,
    },
    {
      id: 'ferris-wheel',
      title: 'Word problem: height on a Ferris wheel',
      word: true,
      intro: 'Change the wheel and the time. The graph shows the height as a wave.',
      inputs: [
        { name: 'D', label: 'Diameter of the wheel (m)', type: 'int', min: 10, max: 100, value: 40 },
        { name: 'low', label: 'Height of the lowest point (m)', type: 'int', min: 1, max: 10, value: 2 },
        { name: 'P', label: 'Seconds for one full turn', type: 'int', min: 20, max: 120, value: 60 },
        { name: 't', label: 'Time t (seconds)', type: 'int', min: 0, max: 240, value: 20 },
      ],
      compute: wheelModel,
    },
  ],

  quiz: {
    easy: [easyConvert, easyCoterminal, easyReferenceAngle],
    medium: [mediumExactValue, mediumSigns, mediumWaveFeatures],
    hard: [hardPythagorean, hardExactAnyAngle, hardMatchGraph],
    challenge: [challengeBuildModel, challengeTwoConditions, challengeSolveAngles],
  },
};
