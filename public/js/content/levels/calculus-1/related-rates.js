import { R, q, frac, terms, poly, polyEval, polyDeriv, num, txt, round, checkEqual, checkAll, numDeriv } from '../../lib/index.js';
import { M, fit, fromBank, numDeriv2, piTimes } from './_shared.js';

// A fraction of π in the denominator: piUnder(frac(8, 9)) → \dfrac{8}{9\pi}
const piUnder = (fr) => `${fr.n < 0 ? '-' : ''}\\dfrac{${Math.abs(fr.n)}}{${fr.d === 1 ? '' : fr.d}\\pi}`;
const TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25]];
const ladderPicture = (x, y, L, xLabel, yLabel) => ({
  type: 'polygon',
  points: [[0, 0], [x, 0], [0, y]],
  sides: [xLabel, `${L} ft`, yLabel],
  right: [0],
  alt: `A right triangle formed by the ground, a wall and a ladder ${L} feet long. The foot of the ladder is ${xLabel} from the wall and the top is ${yLabel} above the ground.`,
});

// ───────────── Easy ─────────────

const CONTEXTS = [
  { f: 'W', what: 'the volume of water in a tank', unit: 'liters', per: 'minute', after: (a) => `${a} minutes after the tap is opened`, noun: 'the volume of water' },
  { f: 'T', what: 'the temperature of a kiln', unit: 'degrees Celsius', per: 'minute', after: (a) => `${a} minutes after it is switched on`, noun: 'the temperature', only: 'up' },
  { f: 'h', what: 'the altitude of a drone', unit: 'meters', per: 'second', after: (a) => `${a} seconds after take-off`, noun: 'the altitude' },
  { f: 'P', what: 'the population of a town', unit: 'people', per: 'year', after: (a) => `${a} years after the census`, noun: 'the population' },
  { f: 'M', what: 'the mass of a block of ice', unit: 'grams', per: 'hour', after: (a) => `${a} hours after it is taken out of the freezer`, noun: 'the mass', only: 'down' },
];

function easyMeaning(rng) {
  const c = rng.pick(CONTEXTS);
  const a = rng.int(2, 12);
  const k = rng.int(2, 40);
  // Some stories only make sense one way round: ice out of the freezer loses mass, a kiln heats up.
  const coin = rng.bool(0.5);
  const up = c.only ? c.only === 'up' : coin;
  const intro = R`Let \(${c.f}(t)\) be ${c.what}, in ${c.unit}, ${c.after(R`\(t\)`)}.`;
  if (rng.bool(0.35)) {
    return q({
      prompt: R`${intro} What are the units of \(${c.f}'(t)\)?`,
      correct: `${c.unit} per ${c.per}`,
      wrong: [
        { value: c.unit, why: R`Those are the units of \(${c.f}(t)\) itself. A derivative is a rate: output units per input unit.` },
        { value: `${c.per}s per ${c.unit.replace(/s$/, '')}`, why: 'The output units go on top: change in output divided by change in input.' },
        `${c.unit} per ${c.per} squared`,
        `${c.per}s`,
      ],
      solution: [R`\(${c.f}'(t)\) is the limit of \(\dfrac{\text{change in } ${c.f}}{\text{change in } t}\).`, `The numerator is measured in ${c.unit} and the denominator in ${c.per}s, so the units are ${c.unit} per ${c.per}.`],
      rule: 0,
      skill: 'units of a derivative',
    });
  }
  const v = up ? k : -k;
  const dir = up ? 'increasing' : 'decreasing';
  return q({
    prompt: R`${intro} What does \(${c.f}'(${a}) = ${v}\) mean?`,
    correct: `Exactly ${c.after(a)}, ${c.noun} is ${dir} at ${k} ${c.unit} per ${c.per}`,
    wrong: [
      { value: `Exactly ${c.after(a)}, ${c.noun} is ${k} ${c.unit}`, why: R`That would be a statement about \(${c.f}(${a})\). The derivative is a rate of change.` },
      { value: `During the first ${a} ${c.per}s, ${c.noun} ${up ? 'increased' : 'decreased'} by ${k} ${c.unit}`, why: 'That describes a total change over an interval. A derivative is the rate at a single instant.' },
      { value: `Exactly ${c.after(a)}, ${c.noun} is ${up ? 'decreasing' : 'increasing'} at ${k} ${c.unit} per ${c.per}`, why: `A ${up ? 'positive' : 'negative'} derivative means the quantity is ${dir}.` },
    ],
    solution: [R`\(${c.f}'(${a})\) is the instantaneous rate of change of \(${c.f}\) at \(t = ${a}\), in ${c.unit} per ${c.per}.`, `Its sign is ${up ? 'positive' : 'negative'}, so ${c.noun} is ${dir}, at ${k} ${c.unit} per ${c.per}.`],
    rule: 0,
    skill: 'interpreting a derivative',
  });
}

function easyVelocity(rng) {
  const coefs = [rng.int(1, 2), rng.int(-6, 6), rng.int(-9, 9), 0];
  const t0 = rng.int(1, 4);
  const v = polyDeriv(coefs);
  const a = polyDeriv(v);
  const s = (t) => polyEval(coefs, t);
  const sTex = poly(coefs, 't');
  const [v0, a0] = [polyEval(v, t0), polyEval(a, t0)];
  if (rng.bool(0.5)) {
    return q({
      prompt: R`A particle moves along a line so that its position after \(t\) seconds is \(s(t) = ${sTex}\) meters. What is its velocity at \(t = ${t0}\)?`,
      correct: v0,
      unit: 'm/s',
      wrong: [{ value: s(t0), why: R`That is the position \(s(${t0})\). Velocity is the derivative of position.` }, { value: a0, why: R`That is the acceleration \(s''(${t0})\). Velocity is the first derivative.` }, polyEval(v, t0 + 1), v0 - coefs[2], -v0],
      solution: [R`Velocity is the derivative of position: \(v(t) = s'(t) = ${poly(v, 't')}\).`, R`\(v(${t0}) = ${v0}\) m/s.${v0 < 0 ? ' The negative sign means the particle is moving in the negative direction.' : ''}`],
      rule: 1,
      skill: 'velocity and acceleration',
      check: () => checkEqual(numDeriv(s, t0), v0, 1e-5, 'velocity'),
    });
  }
  return q({
    prompt: R`A particle moves along a line so that its position after \(t\) seconds is \(s(t) = ${sTex}\) meters. What is its acceleration at \(t = ${t0}\)?`,
    correct: a0,
    unit: 'm/s²',
    wrong: [{ value: v0, why: R`That is the velocity \(s'(${t0})\). Acceleration is the derivative of velocity, so differentiate once more.` }, { value: s(t0), why: R`That is the position \(s(${t0})\). Acceleration is the second derivative of position.` }, a[0] * t0, a0 + 2, -a0],
    solution: [R`Velocity: \(v(t) = s'(t) = ${poly(v, 't')}\).`, R`Acceleration is the derivative of velocity: \(a(t) = v'(t) = ${poly(a, 't')}\).`, R`\(a(${t0}) = ${a0}\) m/s².`],
    rule: 1,
    skill: 'velocity and acceleration',
    check: () => checkEqual(numDeriv2(s, t0), a0, 1e-4, 'acceleration'),
  });
}

function easyShapeRate(rng) {
  const r0 = rng.int(2, 9);
  const k = rng.int(2, 5);
  // Answers are whole-number coefficients (of π where the shape is round), so equal values are never offered twice.
  const s = rng.pick([
    { name: 'The side of a square', eq: 'A = s^{2}', v: 's', what: 'its area', unit: 'cm²/s', pi: '', ans: 2 * r0 * k, d: R`\dfrac{dA}{dt} = 2s\,\dfrac{ds}{dt} = 2(${r0})(${k})`, wrong: [2 * r0, r0 * r0, r0 * k, r0 * r0 * k], f: (x) => x * x },
    { name: 'The radius of a circle', eq: 'A = \\pi r^{2}', v: 'r', what: 'its area', unit: 'cm²/s', pi: '\\pi', ans: 2 * r0 * k, d: R`\dfrac{dA}{dt} = 2\pi r\,\dfrac{dr}{dt} = 2\pi(${r0})(${k})`, wrong: [2 * r0, r0 * r0, r0 * k, r0 * r0 * k], f: (x) => Math.PI * x * x },
    { name: 'The radius of a circle', eq: 'C = 2\\pi r', v: 'r', what: 'its circumference', unit: 'cm/s', pi: '\\pi', ans: 2 * k, d: R`\dfrac{dC}{dt} = 2\pi\,\dfrac{dr}{dt} = 2\pi(${k})`, wrong: [2, 2 * r0, 2 * r0 * k, k], f: (x) => 2 * Math.PI * x },
    { name: 'The edge of a cube', eq: 'V = s^{3}', v: 's', what: 'its volume', unit: 'cm³/s', pi: '', ans: 3 * r0 * r0 * k, d: R`\dfrac{dV}{dt} = 3s^{2}\,\dfrac{ds}{dt} = 3(${r0})^{2}(${k})`, wrong: [3 * r0 * r0, r0 ** 3, r0 * r0 * k, 3 * r0 * k], f: (x) => x ** 3 },
  ]);
  const fmt = (c) => R`\(${s.pi ? piTimes(c) : num(c)}\) ${s.unit}`;
  return q({
    prompt: R`${s.name} is growing at ${k} cm/s. How fast is ${s.what} growing at the instant when \(${s.v} = ${r0}\) cm?`,
    correct: s.ans,
    fmt,
    wrong: [{ value: s.wrong[0], why: R`The chain rule adds the factor \(\frac{d${s.v}}{dt} = ${k}\), because \(${s.v}\) is itself changing with time.` }, { value: s.wrong[1], why: `That is not a rate of change: differentiate the formula with respect to time first.` }, s.wrong[2], s.wrong[3]],
    solution: [R`Relate the quantities: \(${s.eq}\).`, R`Differentiate with respect to time \(t\) (chain rule): \(${s.d}\).`, `The rate is ${fmt(s.ans)}.`],
    rule: 3,
    skill: 'related rates with shapes',
    check: () => checkEqual(numDeriv((t) => s.f(r0 + k * t), 0), s.ans * (s.pi ? Math.PI : 1), 1e-5, 'rate'),
  });
}

// ───────────── Medium ─────────────

function mediumMotion(rng) {
  const p = rng.int(1, 4);
  const qv = p + 2 * rng.int(1, 2);
  const m = (p + qv) / 2;
  const coefs = [1, -3 * m, 3 * p * qv, 0];
  const s = (t) => polyEval(coefs, t);
  const v = polyDeriv(coefs);
  const kind = rng.pick(['rest', 'left', 'accel']);
  const head = R`A particle moves along a line with position \(s(t) = ${poly(coefs, 't')}\) meters after \(t\) seconds, for \(t \ge 0\).`;
  const first = [R`Velocity: \(v(t) = s'(t) = ${poly(v, 't')} = 3(t - ${p})(t - ${qv})\).`];
  const base = { rule: 1, skill: 'motion on a line' };
  const vCheck = () => checkAll(checkEqual(numDeriv(s, p), 0, 1e-5, 'v(p)'), checkEqual(numDeriv(s, qv), 0, 1e-5, 'v(q)'), numDeriv(s, m) < 0 && numDeriv(s, p / 2) > 0 && numDeriv(s, qv + 1) > 0 ? true : 'sign pattern of v is off');
  if (kind === 'rest') {
    const at = (...ts) => (ts.length === 1 ? R`At \(t = ${ts[0]}\) only` : R`At \(t = ${ts[0]}\) and \(t = ${ts[1]}\)`);
    return q({
      ...base,
      prompt: `${head} When is the particle at rest?`,
      correct: at(p, qv),
      wrong: [{ value: at(m), why: R`\(t = ${m}\) is where the acceleration is 0. At rest means the velocity is 0.` }, { value: at(p), why: R`\(v(t) = 0\) is a quadratic equation, and both of its solutions are times \(t \ge 0\).` }, at(0, 3 * m - qv === qv ? qv + 1 : m), at(0, qv)],
      solution: [...first, R`At rest means \(v(t) = 0\): \(t = ${p}\) or \(t = ${qv}\).`],
      check: vCheck,
    });
  }
  if (kind === 'left') {
    return q({
      ...base,
      prompt: `${head} During which time interval is the particle moving in the negative direction?`,
      correct: R`\(${p} < t < ${qv}\)`,
      wrong: [{ value: R`\(0 \le t < ${p}\)`, why: R`There \(v(t) > 0\): both factors \((t - ${p})\) and \((t - ${qv})\) are negative, so their product is positive.` }, { value: R`\(0 \le t < ${m}\)`, why: R`That is where the acceleration is negative. The direction of motion is given by the sign of the velocity.` }, R`\(t > ${qv}\)`, R`\(t > ${m}\)`],
      solution: [...first, R`The particle moves in the negative direction when \(v(t) < 0\).`, R`\(3(t - ${p})(t - ${qv}) < 0\) exactly when \(t\) is between the two zeros: \(${p} < t < ${qv}\).`],
      check: vCheck,
    });
  }
  const a1 = 3 * (p - qv);
  return q({
    ...base,
    prompt: `${head} What is its acceleration at the first instant when it is at rest?`,
    correct: a1,
    unit: 'm/s²',
    wrong: [{ value: 0, why: 'At rest means the velocity is 0. The acceleration at that instant is usually not 0.' }, { value: -a1, why: R`That is the acceleration at \(t = ${qv}\), the second time the particle is at rest.` }, s(p), a1 - 6, 6 * p],
    solution: [...first, R`The particle is first at rest at \(t = ${p}\).`, R`Acceleration: \(a(t) = v'(t) = ${poly(polyDeriv(v), 't')}\), so \(a(${p}) = ${a1}\) m/s².`],
    check: () => checkAll(vCheck(), checkEqual(numDeriv2(s, p), a1, 1e-4, 'a(p)')),
  });
}

function mediumSpeedingUp(rng) {
  let b;
  let c;
  let t0;
  let v0;
  let a0;
  do {
    b = rng.int(-9, 4);
    c = rng.int(-9, 9);
    t0 = rng.int(1, 4);
    v0 = 3 * t0 * t0 + 2 * b * t0 + c;
    a0 = 6 * t0 + 2 * b;
  } while (v0 === 0 || a0 === 0);
  const coefs = [1, b, c, 0];
  const s = (t) => polyEval(coefs, t);
  const choice = {
    pp: R`Speeding up: \(v\) and \(a\) are both positive`,
    nn: R`Speeding up: \(v\) and \(a\) are both negative`,
    pn: R`Slowing down: \(v\) is positive and \(a\) is negative`,
    np: R`Slowing down: \(v\) is negative and \(a\) is positive`,
  };
  const key = (v0 > 0 ? 'p' : 'n') + (a0 > 0 ? 'p' : 'n');
  const why = R`Here \(v(${t0}) = ${v0}\) and \(a(${t0}) = ${a0}\). Check the sign of each.`;
  return q({
    prompt: R`A particle moves along a line with position \(s(t) = ${poly(coefs, 't')}\) meters after \(t\) seconds. At \(t = ${t0}\), is it speeding up or slowing down?`,
    correct: choice[key],
    wrong: Object.keys(choice).filter((k) => k !== key).map((k) => ({ value: choice[k], why })),
    solution: [
      R`\(v(t) = s'(t) = ${poly(polyDeriv(coefs), 't')}\), so \(v(${t0}) = ${v0}\).`,
      R`\(a(t) = v'(t) = ${poly(polyDeriv(polyDeriv(coefs)), 't')}\), so \(a(${t0}) = ${a0}\).`,
      v0 * a0 > 0 ? 'Velocity and acceleration have the same sign, so the speed is increasing: the particle is speeding up.' : 'Velocity and acceleration have opposite signs, so the speed is decreasing: the particle is slowing down.',
    ],
    rule: 2,
    skill: 'speeding up or slowing down',
    check: () => (numDeriv((t) => Math.abs(numDeriv(s, t)), t0, 1e-4) > 0 === v0 * a0 > 0 ? true : 'the speed does not change the way the answer says'),
  });
}

function mediumLadder(rng) {
  const [x, y, L] = rng.pick(TRIPLES);
  const k = rng.int(1, 4);
  const findTop = rng.bool(0.6);
  const ans = findTop ? frac(x * k, y) : frac(y * k, x);
  const other = findTop ? frac(y * k, x) : frac(x * k, y);
  const yOf = (t) => Math.sqrt(L * L - (x + k * t) ** 2);
  const xOf = (t) => Math.sqrt(L * L - (y - k * t) ** 2);
  return q({
    prompt: findTop
      ? `A ladder ${L} feet long leans against a vertical wall. The foot of the ladder slides away from the wall at ${k} ft/s. How fast is the top of the ladder sliding down the wall when the foot is ${x} feet from the wall?`
      : `A ladder ${L} feet long leans against a vertical wall. The top of the ladder slides down the wall at ${k} ft/s. How fast is the foot of the ladder moving away from the wall when the top is ${y} feet above the ground?`,
    visual: ladderPicture(x, y, L, findTop ? `${x} ft` : 'x', findTop ? 'y' : `${y} ft`),
    correct: ans,
    unit: 'ft/s',
    wrong: [
      { value: other, why: R`From \(x\,\frac{dx}{dt} + y\,\frac{dy}{dt} = 0\), the unknown rate is multiplied by its own length. Check which length divides.` },
      { value: k, why: 'The two ends of the ladder move at the same speed only when x = y.' },
      findTop ? frac(x * k, L) : frac(y * k, L),
      findTop ? frac(L * k, y) : frac(L * k, x),
    ],
    solution: [
      R`Let \(x\) be the distance of the foot from the wall and \(y\) the height of the top. Then \(x^{2} + y^{2} = ${L}^{2}\).`,
      R`Differentiate with respect to \(t\): \(2x\,\dfrac{dx}{dt} + 2y\,\dfrac{dy}{dt} = 0\).`,
      findTop ? R`At this instant \(x = ${x}\), so \(y = \sqrt{${L * L} - ${x * x}} = ${y}\), and \(\dfrac{dx}{dt} = ${k}\).` : R`At this instant \(y = ${y}\), so \(x = \sqrt{${L * L} - ${y * y}} = ${x}\), and \(\dfrac{dy}{dt} = -${k}\) (the top is moving down).`,
      findTop ? R`\(\dfrac{dy}{dt} = -\dfrac{x}{y}\,\dfrac{dx}{dt} = -\dfrac{(${x})(${k})}{${y}} = ${ans.neg().tex()}\). The top slides down at \(${ans.tex()}\) ft/s.` : R`\(\dfrac{dx}{dt} = -\dfrac{y}{x}\,\dfrac{dy}{dt} = \dfrac{(${y})(${k})}{${x}} = ${ans.tex()}\) ft/s.`,
    ],
    rule: 3,
    skill: 'related rates: ladder',
    check: () => (findTop ? checkEqual(-numDeriv(yOf, 0), ans.value, 1e-5, 'rate of the top') : checkEqual(numDeriv(xOf, 0), ans.value, 1e-5, 'rate of the foot')),
  });
}

function mediumSphere(rng) {
  const r0 = rng.pick([2, 3, 4, 5, 6, 10]);
  const V = (r) => (4 / 3) * Math.PI * r ** 3;
  if (rng.bool(0.5)) {
    const k = rng.int(1, 4);
    return q({
      prompt: `A spherical balloon is inflated so that its radius increases at ${k} cm/s. How fast is its volume increasing when the radius is ${r0} cm?`,
      correct: 4 * r0 * r0 * k,
      fmt: (n) => R`\(${piTimes(n)}\) cm³/s`,
      wrong: [k > 1 ? { value: 4 * r0 * r0, why: R`The chain rule adds the factor \(\frac{dr}{dt} = ${k}\).` } : null, { value: 4 * r0 * k, why: R`The derivative of \(r^{3}\) is \(3r^{2}\), so the radius is squared.` }, 3 * r0 * r0 * k, 2 * r0 * r0 * k, 8 * r0 * k],
      solution: [R`Volume of a sphere: \(V = \frac{4}{3}\pi r^{3}\).`, R`Differentiate with respect to \(t\): \(\dfrac{dV}{dt} = 4\pi r^{2}\,\dfrac{dr}{dt}\).`, R`Substitute \(r = ${r0}\) and \(\dfrac{dr}{dt} = ${k}\): \(\dfrac{dV}{dt} = 4\pi(${r0})^{2}(${k}) = ${num(4 * r0 * r0 * k)}\pi\) cm³/s.`],
      rule: 4,
      skill: 'related rates: sphere',
      check: () => checkEqual(numDeriv((t) => V(r0 + k * t), 0), 4 * Math.PI * r0 * r0 * k, 1e-5, 'dV/dt'),
    });
  }
  const c = rng.pick([frac(1, 1), frac(2, 1), frac(3, 1), frac(5, 1), frac(1, 2), frac(1, 4)]);
  const N = 4 * r0 * r0 * c.value;
  const val = (fr) => R`\(${piUnder(fr)}\) cm/s`;
  return q({
    prompt: `Air is pumped into a spherical balloon at ${txt(N)} cm³/s. How fast is the radius of the balloon increasing when the radius is ${r0} cm?`,
    correct: val(c),
    wrong: [
      { value: val(frac(N, 4 * r0)), why: R`\(\dfrac{dV}{dt} = 4\pi r^{2}\,\dfrac{dr}{dt}\): the radius is squared.` },
      { value: val(c.mul(3)), why: R`Differentiating \(\frac{4}{3}\pi r^{3}\) gives \(4\pi r^{2}\): the 3 from the power cancels the \(\frac{1}{3}\).` },
      val(c.mul(4)),
      val(c.mul(2)),
    ],
    solution: [R`Volume of a sphere: \(V = \frac{4}{3}\pi r^{3}\), so \(\dfrac{dV}{dt} = 4\pi r^{2}\,\dfrac{dr}{dt}\).`, R`Substitute \(\dfrac{dV}{dt} = ${num(N)}\) and \(r = ${r0}\): \(${num(N)} = 4\pi(${r0})^{2}\,\dfrac{dr}{dt} = ${4 * r0 * r0}\pi\,\dfrac{dr}{dt}\).`, R`\(\dfrac{dr}{dt} = \dfrac{${num(N)}}{${4 * r0 * r0}\pi} = ${piUnder(c)}\) cm/s.`],
    rule: 4,
    skill: 'related rates: sphere',
    check: () => checkEqual(numDeriv((t) => V(r0 + (c.value / Math.PI) * t), 0), N, 1e-5, 'dV/dt'),
  });
}

// ───────────── Hard ─────────────

function hardCone(rng) {
  const [Rr, H] = rng.pick([[2, 4], [3, 6], [2, 6], [4, 8], [3, 9], [4, 6], [5, 10], [3, 12]]);
  const h = rng.int(1, H - 1);
  const k = rng.pick([2, 3, 4, 5, 6, 8, 9, 10]);
  const ratio = frac(Rr, H);
  const ans = frac(k * H * H, Rr * Rr * h * h);
  const val = (fr) => R`\(${piUnder(fr)}\) m/min`;
  const Vof = (x) => (Math.PI / 3) * (Rr / H) ** 2 * x ** 3;
  const r2 = ratio.mul(ratio);
  return q({
    prompt: `A water tank has the shape of a cone with its point at the bottom. The tank is ${H} m tall and its top has radius ${Rr} m. Water is poured in at ${k} m³/min. How fast is the water level rising when the water is ${h} m deep?`,
    correct: val(ans),
    wrong: [
      { value: val(frac(k, Rr * Rr)), why: `That uses the radius of the top of the tank. The water surface is smaller: its radius changes with the depth.` },
      { value: val(ans.mul(3)), why: R`Differentiating \(h^{3}\) gives \(3h^{2}\), which cancels the \(\frac{1}{3}\) in the volume formula.` },
      val(ans.div(3)),
      val(frac(k * H, Rr * h)),
      val(ans.mul(2)),
    ],
    solution: [
      R`Let \(r\) and \(h\) be the radius and depth of the water. \(V = \frac{1}{3}\pi r^{2}h\) has two changing quantities, so remove one.`,
      R`Similar triangles: \(\dfrac{r}{h} = \dfrac{${Rr}}{${H}}\), so \(r = ${terms([[ratio, 'h']])}\) and \(V = \dfrac{1}{3}\pi\left(${terms([[ratio, 'h']])}\right)^{2}h = ${terms([[r2.div(3), '\\pi h^{3}']])}\).`,
      R`Differentiate with respect to \(t\): \(\dfrac{dV}{dt} = ${terms([[r2, '\\pi h^{2}']])}\,\dfrac{dh}{dt}\).`,
      R`Substitute \(\dfrac{dV}{dt} = ${k}\) and \(h = ${h}\): \(${k} = ${terms([[r2.mul(h * h), '\\pi']])}\,\dfrac{dh}{dt}\), so \(\dfrac{dh}{dt} = ${piUnder(ans)}\) m/min.`,
    ],
    rule: 4,
    skill: 'related rates: cone',
    check: () => checkEqual(k / numDeriv(Vof, h), ans.value / Math.PI, 1e-5, 'dh/dt'),
  });
}

function hardTwoMoving(rng) {
  const [x, y, z] = rng.pick(TRIPLES.slice(0, 8));
  const a = (z === 13 ? 13 : 5) * rng.int(2, 6) * rng.pick([1, 1, 1, -1]);
  const b = (z === 13 ? 13 : 5) * rng.int(2, 6);
  const ans = frac(x * a + y * b, z);
  const dist = (t) => Math.hypot(x + a * t, y + b * t);
  const [u, w] = rng.pick([['A car', 'a truck'], ['A ship', 'a ferry'], ['A cyclist', 'a runner']]);
  return q({
    prompt: `${u} is ${x} km east of a crossroads and is travelling ${a > 0 ? 'east, away from it,' : 'west, toward it,'} at ${Math.abs(a)} km/h. At the same moment ${w} is ${y} km north of the crossroads and is travelling north, away from it, at ${b} km/h. At what rate is the distance between them changing? (A negative rate means the distance is shrinking.)`,
    correct: ans,
    unit: 'km/h',
    wrong: [
      { value: a + b, why: 'The two velocities point in different directions, so they cannot simply be added.' },
      { value: x * a + y * b, why: R`After differentiating \(z^{2} = x^{2} + y^{2}\), divide by the distance \(z = ${z}\).` },
      frac(x * b + y * a, z),
      frac(Math.abs(x * a) + y * b, z).eq(ans) ? frac(x * a - y * b, z) : frac(Math.abs(x * a) + y * b, z),
      ans.neg(),
    ],
    solution: [
      R`Let \(x\) and \(y\) be the distances east and north of the crossroads, and \(z\) the distance between the two. Then \(z^{2} = x^{2} + y^{2}\).`,
      R`Differentiate with respect to \(t\): \(2z\,\dfrac{dz}{dt} = 2x\,\dfrac{dx}{dt} + 2y\,\dfrac{dy}{dt}\).`,
      R`At this instant \(x = ${x}\), \(y = ${y}\), \(z = \sqrt{${x * x} + ${y * y}} = ${z}\), \(\dfrac{dx}{dt} = ${a}\) and \(\dfrac{dy}{dt} = ${b}\).`,
      R`\(\dfrac{dz}{dt} = \dfrac{(${x})(${a}) + (${y})(${b})}{${z}} = ${ans.tex()}\) km/h.`,
    ],
    rule: 3,
    skill: 'related rates: two moving objects',
    check: () => checkEqual(numDeriv(dist, 0), ans.value, 1e-5, 'dz/dt'),
  });
}

function hardShadow(rng) {
  const p = rng.pick([5, 6]);
  const H = rng.pick([12, 15, 16, 18, 20].filter((v) => v !== 2 * p));
  const w = rng.int(2, 6);
  const len = frac(p * w, H - p);
  const tip = frac(H * w, H - p);
  const askTip = rng.bool(0.5);
  const ans = askTip ? tip : len;
  const sOf = (x) => (p * x) / (H - p);
  return q({
    prompt: `A street light is at the top of a pole ${H} feet tall. A person ${p} feet tall walks away from the pole at ${w} ft/s. ${askTip ? "How fast is the tip of the person's shadow moving along the ground?" : "How fast is the person's shadow getting longer?"}`,
    correct: ans,
    unit: 'ft/s',
    wrong: [
      { value: askTip ? len : tip, why: askTip ? 'That is how fast the shadow lengthens. The tip also moves because the person is moving.' : 'That is the speed of the tip of the shadow, which includes the walking speed. The length grows more slowly.' },
      { value: w, why: 'That is the walking speed. The shadow is linked to it by similar triangles.' },
      frac(p * w, H),
      frac(H * w, p),
    ],
    solution: [
      R`Let \(x\) be the person's distance from the pole and \(s\) the length of the shadow.`,
      R`Similar triangles: \(\dfrac{s}{${p}} = \dfrac{x + s}{${H}}\), so \(${H}s = ${p}x + ${p}s\) and \(s = ${frac(p, H - p).tex()}\,x\).`,
      R`Differentiate: \(\dfrac{ds}{dt} = ${frac(p, H - p).tex()} \cdot \dfrac{dx}{dt} = ${frac(p, H - p).tex()} \cdot ${w} = ${len.tex()}\) ft/s.`,
      askTip ? R`The tip is \(x + s\) from the pole, so it moves at \(\dfrac{dx}{dt} + \dfrac{ds}{dt} = ${w} + ${len.tex()} = ${tip.tex()}\) ft/s.` : R`The shadow lengthens at \(${len.tex()}\) ft/s, whatever the distance from the pole.`,
    ],
    rule: 4,
    skill: 'related rates: shadow',
    check: () => checkAll(checkEqual(sOf(7) / p, (7 + sOf(7)) / H, 1e-9, 'similar triangles'), checkEqual(numDeriv((t) => (askTip ? w * t + sOf(w * t) : sOf(w * t)), 1), ans.value, 1e-6, 'rate')),
  });
}

// ───────────── Challenge ─────────────

function challengeSpeedIntervals(rng) {
  const p = rng.int(1, 4);
  const qv = p + rng.int(2, 4);
  const m = (p + qv) / 2;
  const coefs = [2, -3 * (p + qv), 6 * p * qv, 0];
  const s = (t) => polyEval(coefs, t);
  const iv = (a, b) => (b == null ? R`\(t > ${num(a)}\)` : R`\(${num(a)} < t < ${num(b)}\)`);
  const both = (u, w) => `${u} and ${w}`;
  const speeding = (t) => numDeriv(s, t) * numDeriv2(s, t) > 0;
  return q({
    prompt: R`A particle moves along a line with position \(s(t) = ${poly(coefs, 't')}\) for \(t \ge 0\). On which intervals is the particle speeding up?`,
    correct: both(iv(p, m), iv(qv)),
    wrong: [
      { value: both(iv(0, p), iv(m, qv)), why: 'On those intervals the velocity and the acceleration have opposite signs, so the particle is slowing down.' },
      { value: iv(m), why: 'That is where the acceleration is positive. Speeding up needs velocity and acceleration to have the same sign.' },
      { value: both(iv(0, p), iv(qv)), why: 'That is where the velocity is positive. Speeding up needs velocity and acceleration to have the same sign.' },
      iv(p, qv),
    ],
    solution: [
      R`\(v(t) = ${poly(polyDeriv(coefs), 't')} = 6(t - ${p})(t - ${qv})\): positive for \(t < ${p}\) and \(t > ${qv}\), negative for \(${p} < t < ${qv}\).`,
      R`\(a(t) = ${poly(polyDeriv(polyDeriv(coefs)), 't')} = 12(t - ${num(m)})\): negative for \(t < ${num(m)}\), positive for \(t > ${num(m)}\).`,
      R`The particle speeds up where \(v\) and \(a\) have the same sign: both negative on \(${num(p)} < t < ${num(m)}\), both positive on \(t > ${qv}\).`,
    ],
    rule: 2,
    skill: 'speeding up or slowing down',
    check: () => (speeding((p + m) / 2) && speeding(qv + 1) && !speeding(p / 2) && !speeding((m + qv) / 2) ? true : 'sign pattern is off'),
  });
}

function challengeAngle(rng) {
  const [d, h] = rng.pick([[40, 30], [30, 40], [120, 50], [50, 120], [80, 60], [60, 80], [150, 80], [80, 150], [400, 300], [300, 400]]);
  const v = rng.pick([5, 10, 20, 25, 50]);
  const ans = frac(d * v, d * d + h * h);
  const theta = (t) => Math.atan((h + v * t) / d);
  return q({
    prompt: `A camera on the ground is ${d} m from the launch pad of a rocket. The rocket rises straight up at ${v} m/s. How fast is the camera's angle of elevation changing, in radians per second, at the instant when the rocket is ${h} m above the ground?`,
    correct: ans,
    unit: 'rad/s',
    wrong: [
      { value: frac(v, d), why: R`Differentiating \(\tan\theta\) gives \(\sec^{2}\theta\,\frac{d\theta}{dt}\). The factor \(\sec^{2}\theta\) has been left out.` },
      { value: frac(h * v, d * d + h * h), why: R`\(\cos^{2}\theta = \dfrac{${d}^{2}}{${d}^{2} + ${h}^{2}}\): the horizontal distance belongs in the numerator.` },
      frac(v, Math.hypot(d, h)),
      frac(d * v, h * h),
    ],
    solution: [
      R`Let \(y\) be the height of the rocket and \(\theta\) the angle of elevation: \(\tan\theta = \dfrac{y}{${d}}\).`,
      R`Differentiate with respect to \(t\): \(\sec^{2}\theta\,\dfrac{d\theta}{dt} = \dfrac{1}{${d}}\,\dfrac{dy}{dt}\).`,
      R`When \(y = ${h}\) the distance from camera to rocket is \(\sqrt{${d}^{2} + ${h}^{2}} = ${Math.hypot(d, h)}\), so \(\cos\theta = \dfrac{${d}}{${Math.hypot(d, h)}}\) and \(\sec^{2}\theta = \dfrac{${Math.hypot(d, h) ** 2}}{${d * d}}\).`,
      R`\(\dfrac{d\theta}{dt} = \dfrac{${d * d}}{${Math.hypot(d, h) ** 2}} \cdot \dfrac{${v}}{${d}} = ${ans.tex()}\) rad/s.`,
    ],
    rule: 3,
    skill: 'related rates: angles',
    check: () => checkEqual(numDeriv(theta, 0), ans.value, 1e-6, 'dθ/dt'),
  });
}

function challengeFindWhen(rng) {
  const r = rng.int(2, 9);
  const k = rng.int(2, 5);
  const s = rng.pick([
    { text: `The radius of a circular oil slick grows at ${k} m/min. At the instant when its area is growing at ${2 * r * k}π m²/min, what is its radius?`, eq: R`A = \pi r^{2}`, d: R`\dfrac{dA}{dt} = 2\pi r\,\dfrac{dr}{dt}`, sub: R`${2 * r * k}\pi = 2\pi r(${k})`, f: (x) => Math.PI * x * x, rate: 2 * Math.PI * r * k, wrong: [2 * r * k, 2 * r, r * k], why: R`Set \(2\pi r \cdot ${k}\) equal to the given rate and solve for \(r\).` },
    { text: `The radius of a spherical balloon grows at ${k} cm/s. At the instant when its volume is growing at ${4 * r * r * k}π cm³/s, what is its radius?`, eq: R`V = \tfrac{4}{3}\pi r^{3}`, d: R`\dfrac{dV}{dt} = 4\pi r^{2}\,\dfrac{dr}{dt}`, sub: R`${4 * r * r * k}\pi = 4\pi r^{2}(${k})`, f: (x) => (4 / 3) * Math.PI * x ** 3, rate: 4 * Math.PI * r * r * k, wrong: [r * r, r * k, 2 * r], why: R`The equation gives \(r^{2} = ${r * r}\). Take the square root.` },
    { text: `Each edge of a cube grows at ${k} cm/s. At the instant when its volume is growing at ${3 * r * r * k} cm³/s, how long is each edge?`, eq: R`V = s^{3}`, d: R`\dfrac{dV}{dt} = 3s^{2}\,\dfrac{ds}{dt}`, sub: R`${3 * r * r * k} = 3s^{2}(${k})`, f: (x) => x ** 3, rate: 3 * r * r * k, wrong: [r * r, r * k, 3 * r], why: R`The equation gives \(s^{2} = ${r * r}\). Take the square root.` },
    { text: `Each side of a square grows at ${k} cm/s. At the instant when its area is growing at ${2 * r * k} cm²/s, how long is each side?`, eq: R`A = s^{2}`, d: R`\dfrac{dA}{dt} = 2s\,\dfrac{ds}{dt}`, sub: R`${2 * r * k} = 2s(${k})`, f: (x) => x * x, rate: 2 * r * k, wrong: [2 * r * k, 2 * r, r * k], why: R`Set \(2s \cdot ${k}\) equal to the given rate and solve for \(s\).` },
  ]);
  return q({
    prompt: s.text,
    correct: r,
    unit: s.text.includes('m/min') ? 'm' : 'cm',
    wrong: [{ value: s.wrong[0], why: s.why }, s.wrong[1], s.wrong[2], r + 1],
    solution: [R`Relate the quantities: \(${s.eq}\). Differentiate with respect to time: \(${s.d}\).`, R`Substitute the two known rates: \(${s.sub}\).`, R`Solve: the length is \(${r}\).`],
    rule: 3,
    skill: 'working backwards',
    check: () => checkEqual(numDeriv((t) => s.f(r + k * t), 0), s.rate, 1e-5, 'rate'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'related-rates',
  title: 'Rates of Change & Related Rates',
  summary: 'Interpret derivatives in context, analyse motion along a line, and solve related-rates problems.',
  standards: ['AP Calculus 4.1', 'AP Calculus 4.2', 'AP Calculus 4.3', 'AP Calculus 4.4', 'AP Calculus 4.5'],

  explain: {
    intro: R`A derivative is a rate of change, so it answers "how fast?" questions in any setting: how fast a population grows, a tank drains or a car moves. When two changing quantities are linked by an equation, their rates are linked as well. Differentiating the equation with respect to time gives one rate from the other.`,
    rules: [
      {
        title: 'A derivative in context',
        text: R`\(f'(a)\) is the instantaneous rate of change of \(f\) at \(a\). Its units are the units of \(f\) divided by the units of the input. A positive value means the quantity is increasing at that instant; a negative value means it is decreasing.`,
        example: R`If \(V(t)\) is the volume of water in liters after \(t\) minutes, then \(V'(10) = -4\) means: at \(t = 10\) minutes the volume is decreasing at 4 liters per minute.`,
      },
      {
        title: 'Motion along a line',
        text: R`For position \(s(t)\): velocity \(v(t) = s'(t)\) and acceleration \(a(t) = v'(t) = s''(t)\). The particle moves in the positive direction when \(v > 0\), in the negative direction when \(v < 0\), and is at rest when \(v = 0\). **Speed** is \(|v(t)|\).`,
        example: R`\(s(t) = t^{3} - 6t^{2} + 9t\): \(v(t) = 3t^{2} - 12t + 9 = 3(t - 1)(t - 3)\) and \(a(t) = 6t - 12\). The particle is at rest at \(t = 1\) and \(t = 3\).`,
      },
      {
        title: 'Speeding up or slowing down',
        text: R`A particle speeds up when velocity and acceleration have the **same sign**, and slows down when they have **opposite signs**. The sign of the acceleration alone is not enough.`,
        example: R`In the example above, at \(t = 2.5\): \(v = -2.25\) and \(a = 3\). The signs are opposite, so the particle is slowing down.`,
      },
      {
        title: 'Related rates: the method',
        text: R`(1) Draw a picture and name the changing quantities. (2) Write an equation that relates them at every moment. (3) Differentiate both sides with respect to time \(t\), using the chain rule. (4) Only now substitute the values for the instant in question, and solve for the unknown rate. Substituting a changing length before differentiating treats it as a constant, which is wrong.`,
        example: R`A circle's radius grows at 2 cm/s. From \(A = \pi r^{2}\): \(\dfrac{dA}{dt} = 2\pi r\,\dfrac{dr}{dt}\). When \(r = 5\): \(\dfrac{dA}{dt} = 2\pi(5)(2) = 20\pi\) cm²/s.`,
      },
      {
        title: 'Relations that come up often',
        text: R`Right triangles: \(x^{2} + y^{2} = z^{2}\). Circle: \(A = \pi r^{2}\), \(C = 2\pi r\). Sphere: \(V = \frac{4}{3}\pi r^{3}\). Cone: \(V = \frac{1}{3}\pi r^{2}h\), with **similar triangles** to write \(r\) in terms of \(h\). Shadows and angles: similar triangles and \(\tan\theta = \dfrac{\text{opposite}}{\text{adjacent}}\).`,
        example: R`Sphere: \(\dfrac{dV}{dt} = 4\pi r^{2}\,\dfrac{dr}{dt}\). If \(\dfrac{dV}{dt} = 100\) cm³/s when \(r = 5\) cm, then \(\dfrac{dr}{dt} = \dfrac{100}{100\pi} = \dfrac{1}{\pi}\) cm/s.`,
      },
    ],
    vocab: [
      { term: 'velocity', def: R`The rate of change of position, \(v(t) = s'(t)\). Its sign gives the direction of motion.` },
      { term: 'speed', def: R`The size of the velocity, \(|v(t)|\). It is never negative.` },
      { term: 'acceleration', def: R`The rate of change of velocity, \(a(t) = v'(t) = s''(t)\).` },
      { term: 'related rates', def: 'Rates of change of two or more quantities that are tied together by an equation.' },
    ],
    mistakes: [
      R`Substituting the given lengths before differentiating. Differentiate first, substitute second.`,
      R`Forgetting the chain rule factor: \(\dfrac{d}{dt}(r^{2}) = 2r\,\dfrac{dr}{dt}\), not \(2r\).`,
      R`Giving a rate the wrong sign. A length that is shrinking has a negative rate.`,
      R`Deciding "speeding up" from the sign of the acceleration alone. Compare the signs of \(v\) and \(a\).`,
      R`In a cone problem, leaving both \(r\) and \(h\) in the volume formula. Use similar triangles to remove one of them.`,
    ],
  },

  examples: [
    {
      title: 'Motion along a line',
      problem: R`A particle has position \(s(t) = t^{3} - 6t^{2} + 9t\) meters after \(t\) seconds. When is it at rest? Is it speeding up or slowing down at \(t = 2.5\)?`,
      steps: [
        R`\(v(t) = s'(t) = 3t^{2} - 12t + 9 = 3(t - 1)(t - 3)\).`,
        R`At rest when \(v(t) = 0\): \(t = 1\) and \(t = 3\).`,
        R`\(a(t) = v'(t) = 6t - 12\). At \(t = 2.5\): \(v = 3(1.5)(-0.5) = -2.25\) and \(a = 3\).`,
        R`Velocity and acceleration have opposite signs.`,
      ],
      answer: R`At rest at \(t = 1\) s and \(t = 3\) s. At \(t = 2.5\) s it is slowing down.`,
      visual: {
        type: 'plot',
        x: [0, 4.5],
        y: [-5, 10],
        fns: [{ f: (t) => 3 * (t - 1) * (t - 3), label: 'v', labelAt: 0.35 }, { f: (t) => 6 * t - 12, color: 'b', dashed: true, label: 'a', labelAt: 3.3 }],
        points: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
        axisLabels: ['t (s)', ''],
        alt: 'Graphs of the velocity v(t) = 3(t − 1)(t − 3), a parabola that is negative between t = 1 and t = 3, and the acceleration a(t) = 6t − 12, a rising line that is negative before t = 2 and positive after it.',
      },
    },
    {
      title: 'Word problem: a sliding ladder',
      word: true,
      problem: 'A ladder 10 feet long leans against a wall. Its foot slides away from the wall at 2 ft/s. How fast is the top of the ladder sliding down the wall when the foot is 6 feet from the wall?',
      steps: [
        R`Let \(x\) be the distance of the foot from the wall and \(y\) the height of the top. At every moment \(x^{2} + y^{2} = 100\).`,
        R`Differentiate with respect to \(t\): \(2x\,\dfrac{dx}{dt} + 2y\,\dfrac{dy}{dt} = 0\).`,
        R`At this instant \(x = 6\), so \(y = \sqrt{100 - 36} = 8\), and \(\dfrac{dx}{dt} = 2\).`,
        R`\(2(6)(2) + 2(8)\,\dfrac{dy}{dt} = 0\), so \(\dfrac{dy}{dt} = -\dfrac{24}{16} = -\dfrac{3}{2}\).`,
      ],
      answer: R`The top slides down at \(\frac{3}{2}\) ft/s. (The negative sign of \(\frac{dy}{dt}\) shows that \(y\) is decreasing.)`,
      visual: ladderPicture(6, 8, 10, '6 ft', 'y'),
    },
    {
      title: 'Word problem: filling a cone',
      word: true,
      problem: 'A tank shaped like a cone with its point down is 4 m tall and has radius 2 m at the top. Water is pumped in at 2 m³/min. How fast is the water level rising when the water is 3 m deep?',
      steps: [
        R`Let \(r\) and \(h\) be the radius and depth of the water. \(V = \frac{1}{3}\pi r^{2}h\).`,
        R`Similar triangles: \(\dfrac{r}{h} = \dfrac{2}{4}\), so \(r = \dfrac{h}{2}\) and \(V = \dfrac{1}{3}\pi\left(\dfrac{h}{2}\right)^{2}h = \dfrac{\pi}{12}h^{3}\).`,
        R`Differentiate with respect to \(t\): \(\dfrac{dV}{dt} = \dfrac{\pi}{4}h^{2}\,\dfrac{dh}{dt}\).`,
        R`Substitute \(\dfrac{dV}{dt} = 2\) and \(h = 3\): \(2 = \dfrac{9\pi}{4}\,\dfrac{dh}{dt}\).`,
      ],
      answer: R`\(\dfrac{dh}{dt} = \dfrac{8}{9\pi} \approx 0.28\) m/min`,
    },
  ],

  models: [
    {
      id: 'ladder',
      title: 'Word problem: the sliding ladder',
      word: true,
      intro: 'Change the length of the ladder, where its foot is, and how fast the foot slides away from the wall.',
      inputs: [
        { name: 'L', label: 'Ladder length (ft)', type: 'int', min: 5, max: 30, value: 13 },
        { name: 'x', label: 'Foot distance from wall (ft)', type: 'int', min: 1, max: 29, value: 5 },
        { name: 'k', label: 'Speed of the foot (ft/s)', type: 'number', min: 0.5, max: 6, step: 0.5, value: 2 },
      ],
      compute({ L, x, k }) {
        if (x >= L) return { error: `The foot cannot be ${x} feet from the wall when the ladder is only ${L} feet long. Choose a distance smaller than the ladder length.` };
        const y = Math.sqrt(L * L - x * x);
        const rate = (x * k) / y;
        const yTex = Number.isInteger(y) ? String(y) : num(round(y, 3));
        return {
          problem: `A ladder ${L} feet long leans against a wall. Its foot slides away from the wall at ${txt(k)} ft/s. How fast is the top sliding down when the foot is ${x} feet from the wall?`,
          steps: [
            R`With \(x\) the distance of the foot from the wall and \(y\) the height of the top: \(x^{2} + y^{2} = ${L * L}\).`,
            R`Differentiate with respect to \(t\): \(2x\,\dfrac{dx}{dt} + 2y\,\dfrac{dy}{dt} = 0\), so \(\dfrac{dy}{dt} = -\dfrac{x}{y}\,\dfrac{dx}{dt}\).`,
            R`At this instant \(x = ${x}\) and \(y = \sqrt{${L * L} - ${x * x}} ${Number.isInteger(y) ? '=' : '\\approx'} ${yTex}\).`,
            R`\(\dfrac{dy}{dt} = -\dfrac{${x}}{${yTex}}(${num(k)}) ${Number.isInteger(rate * 1000) ? '=' : '\\approx'} ${num(round(-rate, 3))}\) ft/s.`,
          ],
          answer: R`The top slides down at about \(${num(round(rate, 3))}\) ft/s.`,
          note: 'Try moving the foot farther out: the closer the ladder is to lying flat, the faster its top falls.',
          visual: ladderPicture(x, round(y, 2), L, `${x} ft`, 'y'),
        };
      },
    },
    {
      id: 'motion',
      title: 'Position, velocity and acceleration',
      intro: R`A particle has position \(s(t) = t^{3} + bt^{2} + ct\). Choose \(b\), \(c\) and a time.`,
      inputs: [
        { name: 'b', label: 'b (t² coefficient)', type: 'int', min: -9, max: 9, value: -6 },
        { name: 'c', label: 'c (t coefficient)', type: 'int', min: -12, max: 12, value: 9 },
        { name: 't', label: 'Time t (seconds)', type: 'number', min: 0, max: 5, step: 0.5, value: 2.5 },
      ],
      compute({ b, c, t }) {
        const coefs = [1, b, c, 0];
        const v = polyDeriv(coefs);
        const a = polyDeriv(v);
        const v0 = round(polyEval(v, t), 4);
        const a0 = round(polyEval(a, t), 4);
        const verdict = v0 === 0 ? 'The velocity is 0: at this instant the particle is at rest.' : a0 === 0 ? 'The acceleration is 0: at this instant the speed is neither increasing nor decreasing.' : v0 * a0 > 0 ? 'Velocity and acceleration have the same sign, so the particle is speeding up.' : 'Velocity and acceleration have opposite signs, so the particle is slowing down.';
        return {
          problem: R`For \(s(t) = ${poly(coefs, 't')}\), describe the motion at \(t = ${num(t)}\).`,
          steps: [
            R`Velocity: \(v(t) = s'(t) = ${poly(v, 't')}\), so \(v(${num(t)}) = ${num(v0)}\).`,
            R`Acceleration: \(a(t) = v'(t) = ${poly(a, 't')}\), so \(a(${num(t)}) = ${num(a0)}\).`,
            v0 > 0 ? 'The velocity is positive: the particle is moving in the positive direction.' : v0 < 0 ? 'The velocity is negative: the particle is moving in the negative direction.' : 'The velocity is 0.',
            verdict,
          ],
          answer: R`\(v = ${num(v0)}\), \(a = ${num(a0)}\), speed \(= ${num(Math.abs(v0))}\). ${verdict}`,
          visual: {
            type: 'plot',
            ...fit([(x) => polyEval(v, x), (x) => polyEval(a, x)], 0, 5, { include: [0], cap: [-40, 60] }),
            fns: [{ f: (x) => polyEval(v, x), label: 'v' }, { f: (x) => polyEval(a, x), color: 'b', dashed: true, label: 'a', labelAt: 1 }],
            points: [{ x: t, y: v0 }, { x: t, y: a0, color: 'b' }],
            vlines: [{ x: t }],
            alt: `Graphs of the velocity and the acceleration for t from 0 to 5. At t = ${txt(t)} the velocity is ${txt(v0)} and the acceleration is ${txt(a0)}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyMeaning, easyVelocity, easyShapeRate],
    medium: [mediumMotion, mediumSpeedingUp, mediumLadder, mediumSphere],
    hard: [hardCone, hardTwoMoving, hardShadow],
    challenge: [challengeSpeedIntervals, challengeAngle, challengeFindWhen],
  },
};
