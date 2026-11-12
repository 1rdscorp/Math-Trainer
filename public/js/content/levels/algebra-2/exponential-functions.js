import { R, q, frac, Frac, terms, linear, num, txt, money, round, rootsTex, person, checkEqual } from '../../lib/index.js';
import { M, val, symChoices } from './_shared.js';

// ───────────── Helpers ─────────────

const asX = (v) => M(`x = ${num(v)}`);
// The base of a power: whole numbers and decimals as they are, fractions in parentheses.
const baseTex = (b) => (b instanceof Frac && !b.isInt() ? `\\left(${b.tex()}\\right)` : num(b));
// a·bˣ (the 1 is hidden when a = 1).
const expTex = (a, b, x = 'x') => `${val(a) === 1 ? '' : val(a) === -1 ? '-' : `${num(a)} \\cdot `}${baseTex(b)}^{${x}}`;
// a·bˣ + k. The multiplication dot keeps the coefficient and the base from running together.
const expSum = (a, b, k) => `${expTex(a, b)}${k ? ` ${k > 0 ? '+' : '-'} ${num(Math.abs(k))}` : ''}`;
const expFn = (a, b) => (x) => val(a) * val(b) ** x;
const pct = (v, places = 1) => M(`${num(v, { places })}\\%`);

// ───────────── Easy ─────────────

function easyGrowthDecay(rng) {
  const P = rng.pick([40, 75, 120, 250, 500, 800, 1200, 3000, 4500]);
  const r = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40]);
  const grow = rng.bool(0.5);
  const b = round(grow ? 1 + r / 100 : 1 - r / 100, 2);
  const say = (kind, p) => `${kind} of ${p}% each time period`;
  return q({
    prompt: R`The function \(y = ${P}(${num(b)})^{t}\) models a quantity over time. Does it show growth or decay, and at what rate?`,
    correct: say(grow ? 'Growth' : 'Decay', r),
    wrong: grow
      ? [{ value: say('Growth', round(b * 100, 0)), why: R`The factor \(${num(b)}\) means \(100\% + ${r}\%\) of the previous amount. Only the extra \(${r}\%\) is growth.` }, { value: say('Decay', r), why: 'A factor greater than 1 makes the quantity larger each period, which is growth.' }, say('Growth', num(b)), say('Decay', round(b * 100, 0))]
      : [{ value: say('Decay', round(b * 100, 0)), why: R`\(${num(b)}\) is the part that remains each period. The part lost is \(1 - ${num(b)} = ${num(1 - b)}\), which is \(${r}\%\).` }, { value: say('Growth', r), why: 'A factor between 0 and 1 makes the quantity smaller each period, which is decay.' }, say('Growth', round(b * 100, 0)), say('Decay', num(b))],
    solution: [
      R`In \(y = a \cdot b^{t}\), \(b\) is the factor the quantity is multiplied by each period. Here \(b = ${num(b)}\).`,
      grow ? R`\(b > 1\), so this is growth. \(${num(b)} = 1 + ${num(r / 100)}\), so the rate is \(${r}\%\).` : R`\(0 < b < 1\), so this is decay. \(${num(b)} = 1 - ${num(r / 100)}\), so the rate is \(${r}\%\).`,
    ],
    rule: 1,
    skill: 'growth and decay rates',
    check: () => checkEqual((P * b - P) / P, (grow ? r : -r) / 100, 1e-9, 'change in one period'),
  });
}

function easyEvaluate(rng) {
  const b = rng.pick([2, 3, 4, 5, 10, frac(1, 2), frac(1, 3)]);
  const a = rng.int(2, 9);
  const x = rng.pick(b instanceof Frac ? [0, 1, 2, 3, -1, -2] : val(b) > 4 ? [0, 1, 2, -1] : [0, 1, 2, 3, 4, -1, -2]);
  const B = b instanceof Frac ? b : frac(b, 1);
  const value = B.pow(x).mul(a);
  return q({
    prompt: R`Evaluate \(f(${x})\) for \(f(x) = ${expTex(a, b)}\).`,
    correct: value,
    wrong: [
      x === 0 ? { value: frac(0, 1), why: R`Any nonzero number to the power 0 is 1, not 0. So \(f(0) = ${a} \cdot 1\).` } : null,
      x !== 1 ? { value: B.mul(a).pow(x), why: R`The exponent applies only to the base \(${baseTex(b)}\). Work out the power first, then multiply by \(${a}\).` } : null,
      x < 0 ? { value: value.inv().neg(), why: 'A negative exponent means a reciprocal. It does not make the value negative.' } : null,
      { value: B.mul(a * x), why: R`\(${baseTex(b)}^{${x}}\) is a power, not \(${baseTex(b)}\) times \(${x}\).` },
      value.add(a),
      B.mul(a),
    ],
    solution: [
      x === 0 ? R`\(${baseTex(b)}^{0} = 1\).` : x < 0 ? R`A negative exponent means a reciprocal: \(${baseTex(b)}^{${x}} = ${B.pow(x).tex()}\).` : R`Work out the power first: \(${baseTex(b)}^{${x}} = ${B.pow(x).tex()}\).`,
      R`Multiply by \(${a}\): \(f(${x}) = ${a} \cdot ${B.pow(x).tex()} = ${value.tex()}\).`,
    ],
    rule: 0,
    skill: 'evaluating exponential functions',
    check: () => {
      let v = a;
      for (let i = 0; i < Math.abs(x); i++) v = x > 0 ? v * val(b) : v / val(b);
      return checkEqual(v, value.value, 1e-9, 'repeated multiplication');
    },
  });
}

function easyInterceptAsymptote(rng) {
  const a = rng.nonzero(-6, 6);
  const b = rng.pick([2, 3, 4, frac(1, 2), frac(1, 3), 1.5]);
  const k = rng.nonzero(-7, 7);
  const f = (x) => a * val(b) ** x + k;
  const fn = `y = ${expSum(a, b, k)}`;
  if (rng.bool(0.5)) {
    return q({
      prompt: R`What is the y-intercept of the graph of \(${fn}\)?`,
      correct: a + k,
      fmt: (v) => M(`(0, ${num(v)})`),
      wrong: [
        { value: a, why: R`At \(x = 0\) the power equals 1, so \(y = ${a} \cdot 1 ${k > 0 ? '+' : '-'} ${Math.abs(k)}\). The \(${k > 0 ? '+' : '-'} ${Math.abs(k)}\) still counts.` },
        { value: k, why: R`\(${baseTex(b)}^{0}\) is 1, not 0, so the first term is \(${a}\), not 0.` },
        round(a * val(b) + k, 2),
        a + k + 1,
      ],
      solution: [R`The y-intercept is where \(x = 0\).`, R`\(y = ${a} \cdot ${baseTex(b)}^{0} ${k > 0 ? '+' : '-'} ${Math.abs(k)} = ${a} \cdot 1 ${k > 0 ? '+' : '-'} ${Math.abs(k)} = ${a + k}\).`, R`The y-intercept is \((0, ${a + k})\).`],
      rule: 2,
      skill: 'graph features',
      check: () => checkEqual(f(0), a + k, 1e-9, 'f(0)'),
    });
  }
  return q({
    prompt: R`What is the horizontal asymptote of the graph of \(${fn}\)?`,
    correct: M(`y = ${k}`),
    wrong: [
      { value: M('y = 0'), why: R`The \(${k > 0 ? '+' : '-'} ${Math.abs(k)}\) shifts the whole graph ${k > 0 ? 'up' : 'down'}, and the asymptote moves with it.` },
      { value: M(`y = ${a + k}`), why: R`\(${a + k}\) is the y-intercept. The asymptote is the value the graph approaches when the power gets close to 0.` },
      { value: M(`x = ${k}`), why: 'The asymptote of an exponential graph is a horizontal line, so its equation is y = a number.' },
      M(`y = ${a}`),
    ],
    solution: [
      R`${val(b) > 1 ? R`As \(x\) becomes very negative` : R`As \(x\) becomes very large`}, \(${baseTex(b)}^{x}\) gets closer and closer to 0.`,
      R`So \(y\) gets closer and closer to \(0 ${k > 0 ? '+' : '-'} ${Math.abs(k)} = ${k}\) without reaching it.`,
      R`The horizontal asymptote is \(y = ${k}\).`,
    ],
    rule: 2,
    skill: 'graph features',
    check: () => checkEqual(f(val(b) > 1 ? -60 : 60), k, 1e-6, 'far-away value'),
  });
}

// ───────────── Medium ─────────────

const CHANGES = [
  { grow: true, amounts: [1200, 2500, 6000, 18000, 24000], story: (P, r) => `A town has ${txt(P)} people, and its population grows by ${r}% each year.`, what: 'the population' },
  { grow: true, amounts: [500, 800, 1200, 2500, 6000], story: (P, r) => `An investment of $${txt(P)} gains ${r}% in value each year.`, what: 'the value in dollars' },
  { grow: true, amounts: [200, 400, 800, 1200], story: (P, r) => `A video has ${txt(P)} views, and the number of views rises by ${r}% each day.`, what: 'the number of views', unit: 'days' },
  { grow: false, amounts: [6000, 12000, 18000, 24000], story: (P, r) => `A car bought for $${txt(P)} loses ${r}% of its value each year.`, what: 'the value in dollars' },
  { grow: false, amounts: [400, 800, 1200, 2500], story: (P, r) => `A lake holds ${txt(P)} fish, and the number falls by ${r}% each year.`, what: 'the number of fish' },
  { grow: false, amounts: [200, 400, 500, 800], story: (P, r) => `A patient has ${txt(P)} mg of a medicine in the body, and ${r}% of it is removed each hour.`, what: 'the amount in mg', unit: 'hours' },
];

function mediumWriteModel(rng) {
  const ctx = rng.pick(CHANGES);
  const P = rng.pick(ctx.amounts);
  const r = rng.pick([2, 3, 4, 5, 6, 8, 12, 15]);
  const s = ctx.grow ? 1 : -1;
  const b = round(1 + (s * r) / 100, 2);
  const opt = (tex, f, why) => ({ tex: `y = ${tex}`, f, why });
  const power = (base) => `${num(P, { commas: false })}(${num(base)})^{t}`;
  return q({
    prompt: `${ctx.story(P, r)} Which function gives ${ctx.what} after t ${ctx.unit ?? 'years'}?`,
    ...symChoices(opt(power(b), (t) => P * b ** t), [
      opt(power(r / 100), (t) => P * (r / 100) ** t, R`Multiplying by \(${num(r / 100)}\) would leave only \(${r}\%\) each time. The factor is \(1 ${ctx.grow ? '+' : '-'} ${num(r / 100)} = ${num(b)}\).`),
      opt(power(round(1 - (s * r) / 100, 2)), (t) => P * (1 - (s * r) / 100) ** t, `That factor describes ${ctx.grow ? 'a decrease' : 'an increase'}. Here the quantity ${ctx.grow ? 'grows' : 'shrinks'}.`),
      opt(`${num(P, { commas: false })} ${ctx.grow ? '+' : '-'} ${num((P * r) / 100)}t`, (t) => P + ((s * P * r) / 100) * t, 'That adds or subtracts the same amount every period, which is linear change. A percent change multiplies by the same factor every period.'),
      opt(power(round(1 + (s * r) / 1000, 3)), (t) => P * (1 + (s * r) / 1000) ** t),
    ], [1, 2, 3.5]),
    solution: [
      R`A change of the same percent each period is exponential: \(y = a(1 ${ctx.grow ? '+' : '-'} r)^{t}\).`,
      R`The starting amount is \(a = ${num(P, { commas: false })}\) and the rate is \(r = ${num(r / 100)}\), so the factor is \(1 ${ctx.grow ? '+' : '-'} ${num(r / 100)} = ${num(b)}\).`,
      R`\(y = ${power(b)}\).`,
    ],
    rule: 1,
    skill: 'writing exponential models',
    check: () => checkEqual(P * b - P, (s * P * r) / 100, 1e-9, 'change in the first period'),
  });
}

function mediumHalfLife(rng) {
  const n = rng.int(2, 5);
  const A = rng.pick([5, 10, 15, 25, 50]) * 2 ** n;
  const h = rng.pick([2, 3, 4, 5, 6, 8, 12, 15, 30]);
  const [stuff, unit] = rng.pick([['a medicine', 'hours'], ['caffeine', 'hours'], ['a radioactive sample', 'days'], ['a radioactive tracer', 'minutes'], ['an isotope', 'years']]);
  const left = A / 2 ** n;
  return q({
    prompt: `The half-life of ${stuff} is ${h} ${unit}. If ${A} mg are present now, how much will be left after ${n * h} ${unit}?`,
    correct: left,
    unit: 'mg',
    wrong: [
      { value: round(A / (2 * n), 2), why: R`Halving \(${n}\) times divides by \(2^{${n}} = ${2 ** n}\), not by \(2 \cdot ${n} = ${2 * n}\).` },
      { value: A / 2, why: `That is the amount after one half-life. ${n * h} ${unit} is ${n} half-lives.` },
      round(A / n, 2),
      left / 2,
      left * 2,
    ],
    solution: [
      R`Count the half-lives: \(${n * h} \div ${h} = ${n}\).`,
      R`Each half-life multiplies the amount by \(\frac{1}{2}\): \(${A} \cdot \left(\frac{1}{2}\right)^{${n}} = \frac{${A}}{${2 ** n}} = ${left}\).`,
      `${left} mg will be left.`,
    ],
    rule: 5,
    skill: 'half-life',
    check: () => {
      let v = A;
      for (let t = h; t <= n * h; t += h) v /= 2;
      return checkEqual(v, left, 1e-9, 'halving step by step');
    },
  });
}

function mediumCommonBase(rng) {
  const b = rng.pick([2, 2, 3, 3, 4, 5, 10]);
  const m = rng.pick([1, 1, 2, 3, -1]);
  const c = rng.int(-5, 5);
  const x = rng.int(-4, 5);
  const k = m * x + c;
  if (b ** Math.abs(k) > 1100 || (m === 1 && c === 0)) return mediumCommonBase(rng);
  const N = b ** Math.abs(k);
  const rhs = k >= 0 ? `${N}` : `\\frac{1}{${N}}`;
  const exponent = linear(m, c);
  return q({
    prompt: R`Solve: \(\;${b}^{${exponent}} = ${rhs}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      k < 0 ? { value: frac(-k - c, m), why: R`\(\frac{1}{${N}}\) is \(${b}^{${k}}\), with a negative exponent.` } : null,
      { value: frac(k, 1), why: R`\(${k}\) is the value of the whole exponent \(${exponent}\). Now solve \(${exponent} = ${k}\) for \(x\).` },
      { value: frac(N - c, m), why: R`Write \(${N}\) as a power of \(${b}\) first. The exponents can be compared only when the bases match.` },
      frac(-x, 1),
      frac(x + 1, 1),
    ],
    solution: [
      R`Write the right side as a power of \(${b}\): \(${rhs} = ${b}^{${k}}\).`,
      R`The bases are equal, so the exponents are equal: \(${exponent} = ${k}\).`,
      R`Solve: \(x = ${x}\).`,
    ],
    rule: 6,
    skill: 'solving with a common base',
    check: () => checkEqual(b ** (m * x + c), k >= 0 ? N : 1 / N, 1e-9, 'left side'),
  });
}

function mediumGraphMatch(rng) {
  const a = rng.int(1, 4);
  const b = rng.pick([2, 3, frac(1, 2), frac(1, 3)].filter((v) => val(v) !== a));
  const grow = val(b) > 1;
  const f = expFn(a, b);
  const second = grow ? { x: 1, y: a * val(b) } : { x: -1, y: a / val(b) };
  const opt = (aa, bb, why) => ({ tex: `y = ${expTex(aa, bb)}`, f: expFn(aa, bb), why });
  const inv = b instanceof Frac ? b.inv() : frac(1, b);
  return q({
    prompt: 'Which function has this graph?',
    visual: {
      type: 'plot',
      x: [-4, 4],
      y: [-1, 13],
      step: [1, 1],
      fns: [{ f }],
      points: [{ x: 0, y: a, label: `(0, ${a})` }, { x: second.x, y: second.y, label: `(${txt(second.x)}, ${txt(second.y)})`, color: 'b' }],
      alt: `Graph of an exponential curve that ${grow ? 'rises' : 'falls'} from left to right, passing through (0, ${a}) and (${txt(second.x)}, ${txt(second.y)}). It gets closer and closer to the x-axis on the ${grow ? 'left' : 'right'}.`,
    },
    ...symChoices(opt(a, b), [
      opt(a, inv.isInt() ? inv.n : inv, `The graph ${grow ? 'rises' : 'falls'} from left to right, so the base is ${grow ? 'greater than 1' : 'between 0 and 1'}.`),
      a > 1 ? opt(grow ? val(b) : inv.n, grow ? a : frac(1, a), R`The y-intercept is the starting value \(a\), and the base is the factor from one point to the next.`) : null,
      opt(a + 1, b),
      opt(a, grow ? val(b) + 1 : frac(1, inv.n + 1)),
      { tex: `y = ${terms([[grow ? a * val(b) - a : a - a / val(b), 'x'], [a, '']])}`, f: (x) => a + (second.y - a) * x * second.x },
    ], [-1.3, 0.6, 1.4]),
    solution: [
      R`The graph crosses the y-axis at \((0, ${a})\), so \(a = ${a}\).`,
      grow ? R`From \(x = 0\) to \(x = 1\) the height goes from \(${a}\) to \(${second.y}\): it is multiplied by \(${num(b)}\). So \(b = ${num(b)}\).` : R`From \(x = -1\) to \(x = 0\) the height goes from \(${second.y}\) to \(${a}\): it is multiplied by \(${b.tex()}\). So \(b = ${b.tex()}\).`,
      R`\(y = ${expTex(a, b)}\).`,
    ],
    rule: 0,
    skill: 'exponential graphs',
    check: () => (Math.abs(f(0) - a) < 1e-9 && Math.abs(f(second.x) - second.y) < 1e-9 ? true : 'the marked points are not on the curve'),
  });
}

// ───────────── Hard ─────────────

const PERIODS = { 2: 'twice a year', 4: 'quarterly', 12: 'monthly' };

function hardCompound(rng) {
  const P = rng.pick([500, 800, 1000, 1500, 2000, 2500, 4000, 5000]);
  const r = rng.pick([2, 3, 4, 5, 6, 8]);
  const n = rng.pick([2, 4, 4, 12, 12]);
  const t = rng.int(2, 10);
  const name = person(rng);
  const i = r / 100 / n;
  const A = round(P * (1 + i) ** (n * t), 2);
  return q({
    prompt: `${name} puts $${txt(P)} into an account that pays ${r}% annual interest, compounded ${PERIODS[n]}. How much is in the account after ${t} years?`,
    correct: A,
    fmt: money,
    wrong: [
      { value: round(P * (1 + r / 100) ** t, 2), why: `That compounds once a year. Here interest is added ${n} times a year: divide the rate by ${n} and use ${n * t} periods.` },
      { value: round(P * (1 + i) ** t, 2), why: R`The exponent counts compounding periods: \(${n} \cdot ${t} = ${n * t}\), not \(${t}\).` },
      { value: round(P * (1 + (r / 100) * t), 2), why: 'That is simple interest. With compounding, each period earns interest on the interest already added.' },
      round(P * (1 + r / 100) ** t + P * i, 2),
    ],
    solution: [
      R`Use \(A = P\left(1 + \dfrac{r}{n}\right)^{nt}\) with \(P = ${num(P, { commas: false })}\), \(r = ${num(r / 100)}\), \(n = ${n}\), \(t = ${t}\).`,
      R`Rate per period: \(\dfrac{${num(r / 100)}}{${n}}\). Number of periods: \(${n} \cdot ${t} = ${n * t}\).`,
      R`\(A = ${num(P, { commas: false })}\left(1 + \dfrac{${num(r / 100)}}{${n}}\right)^{${n * t}} \approx ${num(A, { fixed: 2, commas: false })}\). Keep the full value of the rate in the calculator; rounding it early changes the cents. The balance is ${money(A)}.`,
    ],
    rule: 3,
    skill: 'compound interest',
    check: () => {
      let balance = P;
      for (let k = 0; k < n * t; k++) balance += balance * i;
      return checkEqual(round(balance, 2), A, 1e-9, 'adding interest period by period');
    },
  });
}

function hardContinuous(rng) {
  const bank = rng.bool(0.55);
  const P = bank ? rng.pick([500, 1000, 1500, 2000, 3000, 5000, 8000]) : rng.pick([200, 500, 800, 1200, 2000]);
  const r = bank ? rng.pick([2, 3, 4, 5, 6, 7]) : rng.pick([5, 8, 10, 12, 15, 20]);
  const t = bank ? rng.int(3, 15) : rng.int(2, 8);
  const places = bank ? 2 : 0;
  const A = round(P * Math.exp((r / 100) * t), places);
  const name = person(rng);
  return q({
    prompt: bank
      ? `${name} invests $${txt(P)} at ${r}% annual interest, compounded continuously. What is the investment worth after ${t} years?`
      : `A culture of ${txt(P)} bacteria grows continuously at a rate of ${r}% per hour. About how many bacteria are there after ${t} hours?`,
    correct: A,
    fmt: bank ? money : (v) => M(num(v)),
    wrong: [
      { value: round(P * (1 + r / 100) ** t, places), why: R`That compounds once per ${bank ? 'year' : 'hour'}. Continuous growth uses \(A = Pe^{rt}\).` },
      { value: round(P * (1 + (r / 100) * t), places), why: R`That is growth by the same amount each ${bank ? 'year' : 'hour'} (linear). Continuous growth uses \(A = Pe^{rt}\).` },
      round(P * Math.exp(r / 100) * t, places),
      round(P * Math.exp(t / 100) * (1 + r / 100), places),
    ],
    solution: [
      R`For continuous growth use \(A = Pe^{rt}\) with \(P = ${num(P, { commas: false })}\), \(r = ${num(r / 100)}\), \(t = ${t}\).`,
      R`\(rt = ${num(r / 100)} \cdot ${t} = ${num((r / 100) * t)}\), and \(e^{${num((r / 100) * t)}} \approx ${num(Math.exp((r / 100) * t), { places: 4 })}\).`,
      bank ? R`\(A \approx ${num(P, { commas: false })} \cdot ${num(Math.exp((r / 100) * t), { places: 4 })} \approx ${num(A, { fixed: 2, commas: false })}\). The investment is worth ${money(A)}.` : R`\(A \approx ${num(P, { commas: false })} \cdot ${num(Math.exp((r / 100) * t), { places: 4 })} \approx ${num(A)}\) bacteria.`,
    ],
    rule: 4,
    skill: 'continuous growth',
    // Independent test: compounding a million times per period approaches continuous compounding.
    check: () => (Math.abs(P * (1 + r / 100 / 1e6) ** (1e6 * t) - A) <= 0.5 * 10 ** -places + A * 1e-6 ? true : 'frequent compounding approaches a different value'),
  });
}

const BASE_PAIRS = [[4, 8, 2, 2, 3], [9, 27, 3, 2, 3], [4, 2, 2, 2, 1], [8, 2, 2, 3, 1], [9, 3, 3, 2, 1], [27, 3, 3, 3, 1], [25, 5, 5, 2, 1], [125, 25, 5, 3, 2], [16, 8, 2, 4, 3], [8, 4, 2, 3, 2], [27, 9, 3, 3, 2], [16, 2, 2, 4, 1]];

function hardCommonBase(rng) {
  const [A, B, beta, p, qq] = rng.pick(BASE_PAIRS);
  const m = rng.pick([1, 1, 2]);
  const n = rng.pick([1, 2, 3]);
  const c = rng.int(-4, 4);
  const x = rng.int(-5, 6);
  const d = (p * (m * x + c) - qq * n * x) / qq;
  if (p * m === qq * n || !Number.isInteger(d) || Math.abs(d) > 9 || (c === 0 && d === 0)) return hardCommonBase(rng);
  const [left, right] = [linear(m, c), linear(n, d)];
  return q({
    prompt: R`Solve: \(\;${A}^{${left}} = ${B}^{${right}}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      m !== n ? { value: frac(d - c, m - n), why: R`The exponents can be set equal only when the bases are the same. First write \(${A}\) and \(${B}\) as powers of \(${beta}\).` } : null,
      p * m !== qq * n && (p > 1 || qq > 1) ? { value: frac(d - c, p * m - qq * n), why: R`The power multiplies the whole exponent: \(${p}(${left}) = ${linear(p * m, p * c)}\).` } : null,
      frac(-x, 1),
      frac(x + 1, 1),
      frac(x - 2, 1),
    ],
    solution: [
      R`Write both sides with base \(${beta}\): \(${A} = ${beta}^{${p}}\)${qq === 1 ? '' : R` and \(${B} = ${beta}^{${qq}}\)`}, so \(${beta}^{${p}(${left})} = ${beta}^{${qq === 1 ? right : `${qq}(${right})`}}\).`,
      R`The bases match, so the exponents are equal: \(${linear(p * m, p * c)} = ${linear(qq * n, qq * d)}\).`,
      p * m - qq * n === 1 ? R`Collect terms: \(x = ${x}\).` : R`Collect terms: \(${terms([[p * m - qq * n, 'x']])} = ${qq * d - p * c}\), so \(x = ${x}\).`,
    ],
    rule: 6,
    skill: 'solving with a common base',
    check: () => checkEqual((m * x + c) * Math.log(A), (n * x + d) * Math.log(B), 1e-9, 'logarithm of each side'),
  });
}

function hardDoubling(rng) {
  const k = rng.int(2, 6);
  const d = rng.pick([2, 3, 4, 5, 6, 8, 9, 10, 12, 20]);
  const ctx = rng.pick([
    { start: rng.pick([50, 100, 200, 250, 500]), story: (s, e) => `A colony of bacteria doubles every ${d} hours. It starts with ${txt(s)} bacteria. How long does it take to reach ${txt(e)} bacteria?`, unit: 'hours' },
    { start: rng.pick([500, 1000, 1500, 2500]), story: (s, e) => `An investment doubles in value every ${d} years. It starts at $${txt(s)}. How long does it take to be worth $${txt(e)}?`, unit: 'years' },
    { start: rng.pick([30, 60, 150, 400]), story: (s, e) => `The number of people who have seen a video doubles every ${d} days. So far ${txt(s)} people have seen it. How long until ${txt(e)} people have seen it?`, unit: 'days' },
  ]);
  const end = ctx.start * 2 ** k;
  return q({
    prompt: ctx.story(ctx.start, end),
    correct: k * d,
    unit: ctx.unit,
    wrong: [
      { value: 2 ** k * d, why: R`The amount becomes \(${2 ** k}\) times as large, but each doubling period multiplies by 2. \(${2 ** k} = 2^{${k}}\), so it takes \(${k}\) periods, not \(${2 ** k}\).` },
      { value: 2 ** (k - 1) * d, why: R`Count doublings by writing the ratio as a power of 2: \(${2 ** k} = 2^{${k}}\).` },
      { value: k, why: `${k} is the number of doublings. Each one takes ${d} ${ctx.unit}.` },
      (k + 1) * d,
      (k - 1) * d,
    ],
    solution: [
      R`Find the growth factor: \(${num(end, { commas: false })} \div ${num(ctx.start, { commas: false })} = ${2 ** k}\).`,
      R`Write it as a power of 2: \(${2 ** k} = 2^{${k}}\). So the amount must double \(${k}\) times.`,
      R`Each doubling takes ${d} ${ctx.unit}: \(${k} \cdot ${d} = ${k * d}\) ${ctx.unit}.`,
    ],
    rule: 5,
    skill: 'doubling time',
    check: () => {
      let amount = ctx.start;
      let time = 0;
      while (amount < end) {
        amount *= 2;
        time += d;
      }
      return amount === end && time === k * d ? true : 'doubling step by step gives a different time';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeTwoPoints(rng) {
  const b = rng.pick([2, 3, 4, 5, frac(1, 2), frac(1, 3), frac(3, 2)]);
  const x1 = rng.pick([1, 2]);
  const x2 = x1 + 2;
  const m = rng.int(1, b instanceof Frac ? 3 : 6);
  const a = b instanceof Frac ? m * b.d ** x2 : m;
  const B = b instanceof Frac ? b : frac(b, 1);
  const y1 = B.pow(x1).mul(a).value;
  const y2 = B.pow(x2).mul(a).value;
  if (y2 > 2000) return challengeTwoPoints(rng);
  const opt = (aa, bb, why) => ({ tex: `y = ${expTex(aa, bb)}`, f: expFn(aa, bb), why });
  const ratio = frac(y2, y1);
  const ratioTex = `\\frac{${y2}}{${y1}}${ratio.tex() === `\\frac{${y2}}{${y1}}` ? '' : ` = ${ratio.tex()}`}`;
  const bp = (e) => (e === 1 ? 'b' : `b^{${e}}`);
  return q({
    prompt: R`An exponential function \(y = a \cdot b^{x}\) with \(b > 0\) passes through \((${x1}, ${y1})\) and \((${x2}, ${y2})\). Which function is it?`,
    ...symChoices(opt(a, b), [
      opt(y1, b, R`\(${y1}\) is the value at \(x = ${x1}\). The number \(a\) is the value at \(x = 0\), so divide by \(${bp(x1)}\).`),
      opt(frac(y1, 1).div(ratio.pow(x1)), ratio, R`From \(x = ${x1}\) to \(x = ${x2}\) is two steps, so \(${ratioTex}\) equals \(b^{2}\), not \(b\).`),
      opt(a, B.inv()),
      opt(y1, ratio),
      opt(a + 1, b),
      opt(a, B.add(1)),
    ], [0.5, 1.5, 2.5]),
    solution: [
      R`Substitute both points: \(a \cdot ${bp(x1)} = ${y1}\) and \(a \cdot ${bp(x2)} = ${y2}\).`,
      R`Divide the second equation by the first. The \(a\) cancels: \(b^{2} = ${ratioTex}\), so \(b = ${B.tex()}\) (the positive root).`,
      R`Substitute back: \(a \cdot ${x1 === 1 ? B.tex() : `${baseTex(b)}^{${x1}}`} = ${y1}\), so \(a = ${y1} \div ${B.pow(x1).tex()} = ${a}\).`,
      R`\(y = ${expTex(a, b)}\).`,
    ],
    rule: 0,
    skill: 'finding an exponential rule',
    check: () => (Math.abs(expFn(a, b)(x1) - y1) < 1e-9 && Math.abs(expFn(a, b)(x2) - y2) < 1e-9 ? true : 'the function misses one of the points'),
  });
}

function challengeQuadraticForm(rng) {
  const b = rng.pick([2, 2, 3, 5]);
  const exps = b === 2 ? [0, 1, 2, 3] : b === 3 ? [0, 1, 2] : [0, 1];
  const X = (vals) => M(rootsTex(vals));
  const u = `${b}^{x}`;
  if (rng.bool(0.5)) {
    const [p, qq] = rng.sample(exps, 2).sort((s, t) => s - t);
    const [S, Pr] = [b ** p + b ** qq, b ** (p + qq)];
    return q({
      prompt: R`Solve: \(\;${b * b}^{x} - ${S} \cdot ${u} + ${Pr} = 0\)`,
      correct: X([p, qq]),
      wrong: [
        { value: X([b ** p, b ** qq]), why: R`Those are the values of \(${u}\). Finish by solving \(${u} = ${b ** p}\) and \(${u} = ${b ** qq}\) for \(x\).` },
        { value: X([qq]), why: R`The quadratic in \(${u}\) has two solutions, and both give a value of \(x\).` },
        X([p + 1, qq + 1]),
        X([-qq, -p]),
        X([p, qq + 1]),
      ],
      solution: [
        R`\(${b * b}^{x} = (${b}^{2})^{x} = (${u})^{2}\). Let \(u = ${u}\): the equation becomes \(u^{2} - ${S}u + ${Pr} = 0\).`,
        R`Factor: \((u - ${b ** p})(u - ${b ** qq}) = 0\), so \(u = ${b ** p}\) or \(u = ${b ** qq}\).`,
        R`Go back to \(x\): \(${u} = ${b ** p}\) gives \(x = ${p}\), and \(${u} = ${b ** qq}\) gives \(x = ${qq}\).`,
      ],
      rule: 6,
      skill: 'equations in quadratic form',
      check: () => ([p, qq].every((x) => Math.abs((b * b) ** x - S * b ** x + Pr) < 1e-9) ? true : 'a listed value does not satisfy the equation'),
    });
  }
  const p = rng.pick(exps);
  const c = rng.pick([1, 2, 3, 4, 5, 6].filter((v) => v !== b ** p));
  const mid = c - b ** p;
  return q({
    prompt: R`Solve: \(\;${b * b}^{x} ${mid > 0 ? '+' : '-'} ${Math.abs(mid) === 1 ? '' : `${Math.abs(mid)} \\cdot `}${u} - ${c * b ** p} = 0\)`,
    correct: X([p]),
    wrong: [
      { value: X([-c, p]), why: R`\(${u} = -${c}\) has no solution, because a power of \(${b}\) is always positive. It does not give \(x = -${c}\).` },
      { value: X([b ** p]), why: R`\(${b ** p}\) is the value of \(${u}\). Solve \(${u} = ${b ** p}\) to find \(x\).` },
      X([p + 1]),
      X([p, c]),
      X([p - 1]),
    ],
    solution: [
      R`\(${b * b}^{x} = (${u})^{2}\). Let \(u = ${u}\): the equation becomes \(${terms([[1, 'u^{2}'], [mid, 'u'], [-c * b ** p, '']])} = 0\).`,
      R`Factor: \((u - ${b ** p})(u + ${c}) = 0\), so \(u = ${b ** p}\) or \(u = -${c}\).`,
      R`\(${u} = -${c}\) is impossible, because \(${u}\) is positive for every \(x\). \(${u} = ${b ** p}\) gives \(x = ${p}\).`,
    ],
    rule: 6,
    skill: 'equations in quadratic form',
    check: () => (Math.abs((b * b) ** p + mid * b ** p - c * b ** p) < 1e-9 ? true : 'the value does not satisfy the equation'),
  });
}

function challengeRewriteRate(rng) {
  const kind = rng.pick(['double', 'half', 'monthly']);
  const P = rng.pick([80, 150, 300, 500, 1200]);
  if (kind === 'double' || kind === 'half') {
    const d = rng.pick(kind === 'double' ? [3, 4, 5, 6, 7, 8, 9, 10, 12, 15] : [2, 3, 4, 5, 6, 8, 10]);
    const base = kind === 'double' ? 2 : 0.5;
    const rate = Math.abs(base ** (1 / d) - 1) * 100;
    return q({
      prompt: kind === 'double'
        ? R`A population is modelled by \(P(t) = ${P} \cdot 2^{\frac{t}{${d}}}\), where \(t\) is in years. By about what percent does it grow each year?`
        : R`The amount of a substance is modelled by \(A(t) = ${P}\left(\frac{1}{2}\right)^{\frac{t}{${d}}}\), where \(t\) is in hours. About what percent of it is lost each hour?`,
      correct: round(rate, 1),
      fmt: (v) => pct(v),
      wrong: [
        kind === 'double'
          ? { value: round(100 / d, 1), why: `Doubling is 100% growth in ${d} years, but the growth compounds, so the yearly rate is less than 100% ÷ ${d}.` }
          : { value: round(50 / d, 1), why: `Losing 50% in ${d} hours does not mean losing 50% ÷ ${d} each hour, because each hour's loss is a percent of what is left at that time.` },
        kind === 'double' ? round(50 / d, 1) : { value: round(base ** (1 / d) * 100, 1), why: 'That is the percent that remains after each hour. The question asks for the percent that is lost.' },
        kind === 'double' ? round(base ** (1 / d) * 100, 1) : round(100 / d, 1),
        round(rate * 2, 1),
      ],
      solution: [
        R`Rewrite the power so that the exponent is just \(t\): \(${kind === 'double' ? '2' : R`\left(\frac{1}{2}\right)`}^{\frac{t}{${d}}} = \left(${kind === 'double' ? '2' : R`\left(\tfrac{1}{2}\right)`}^{\frac{1}{${d}}}\right)^{t}\).`,
        R`\(${kind === 'double' ? '2' : '0.5'}^{\frac{1}{${d}}} \approx ${num(base ** (1 / d), { places: 4 })}\), so the function is about \(${P}(${num(base ** (1 / d), { places: 4 })})^{t}\).`,
        kind === 'double' ? R`The factor is \(1 + r\), so \(r \approx ${num(rate / 100, { places: 4 })}\): about \(${num(rate, { places: 1 })}\%\) growth each year.` : R`The factor is \(1 - r\), so \(r \approx ${num(rate / 100, { places: 4 })}\): about \(${num(rate, { places: 1 })}\%\) is lost each hour.`,
      ],
      rule: 1,
      skill: 'rewriting exponential expressions',
      check: () => checkEqual((1 + ((kind === 'double' ? 1 : -1) * round(rate, 1)) / 100) ** d, base, 0.02, 'factor after one full period'),
    });
  }
  const r = rng.pick([6, 8, 10, 12, 15, 18, 20, 24, 30]);
  const monthly = ((1 + r / 100) ** (1 / 12) - 1) * 100;
  return q({
    prompt: R`The value of a collection is modelled by \(V(t) = ${P}(${num(1 + r / 100)})^{t}\), where \(t\) is in years. What is the equivalent growth rate per month?`,
    correct: round(monthly, 2),
    fmt: (v) => pct(v, 2),
    wrong: [
      { value: round(r / 12, 2), why: `Dividing ${r}% by 12 ignores compounding. Twelve months of growth at that rate would give more than ${r}% in a year.` },
      round(r / 10, 2),
      round(monthly / 2, 2),
      round(monthly * 12 + 1, 2),
    ],
    solution: [
      R`A year is 12 months, so write \(t\) years as \(12t\) months: \((${num(1 + r / 100)})^{t} = \left(${num(1 + r / 100)}^{\frac{1}{12}}\right)^{12t}\).`,
      R`\(${num(1 + r / 100)}^{\frac{1}{12}} \approx ${num((1 + r / 100) ** (1 / 12), { places: 5 })}\). This is the growth factor for one month.`,
      R`So the monthly rate is about \(${num(monthly, { places: 2 })}\%\). It is a little less than \(${r}\% \div 12 = ${num(r / 12, { places: 2 })}\%\).`,
    ],
    rule: 1,
    skill: 'rewriting exponential expressions',
    check: () => checkEqual((1 + round(monthly, 2) / 100) ** 12, 1 + r / 100, 0.003, 'factor after twelve months'),
  });
}

// ───────────── Models ─────────────

const COMPOUNDING = { 1: 'once a year', 4: 'quarterly', 12: 'monthly', 365: 'daily', e: 'continuously' };

function interestModel({ P, r, n, t }) {
  const rate = r / 100;
  const continuous = n === 'e';
  const periods = continuous ? null : Number(n);
  const A = continuous ? P * Math.exp(rate * t) : P * (1 + rate / periods) ** (periods * t);
  const f = (x) => (continuous ? P * Math.exp(rate * x) : P * (1 + rate / periods) ** (periods * x));
  const steps = continuous
    ? [
      R`Continuous compounding uses \(A = Pe^{rt}\), with \(P = ${num(P, { commas: false })}\), \(r = ${num(rate)}\) and \(t = ${t}\).`,
      R`\(rt = ${num(rate)} \cdot ${t} = ${num(rate * t)}\), and \(e^{${num(rate * t)}} \approx ${num(Math.exp(rate * t), { places: 5 })}\).`,
      R`\(A \approx ${num(P, { commas: false })} \cdot ${num(Math.exp(rate * t), { places: 5 })} \approx ${num(A, { fixed: 2, commas: false })}\).`,
    ]
    : [
      R`Use \(A = P\left(1 + \dfrac{r}{n}\right)^{nt}\), with \(P = ${num(P, { commas: false })}\), \(r = ${num(rate)}\), \(n = ${periods}\) and \(t = ${t}\).`,
      R`Rate per period: \(\dfrac{${num(rate)}}{${periods}}\). Number of periods: \(${periods} \cdot ${t} = ${periods * t}\).`,
      R`\(A = ${num(P, { commas: false })}\left(1 + \dfrac{${num(rate)}}{${periods}}\right)^{${periods * t}} \approx ${num(A, { fixed: 2, commas: false })}\).`,
    ];
  steps.push(`Interest earned: ${money(A - P)}. Simple interest at the same rate would have earned ${money(P * rate * t)}.`);
  return {
    problem: `Leah deposits $${txt(P)} in an account that pays ${num(r)}% annual interest, compounded ${COMPOUNDING[n]}. What is the balance after ${t} ${t === 1 ? 'year' : 'years'}?`,
    steps,
    answer: money(A),
    visual: {
      type: 'plot',
      x: [0, t],
      y: [0, A * 1.15],
      fns: [{ f }, { f: (x) => P * (1 + rate * x), color: 'b', dashed: true }],
      points: [{ x: t, y: A, label: money(A) }],
      axisLabels: ['years', 'balance ($)'],
      alt: `Graph of the balance over ${t} ${t === 1 ? 'year' : 'years'}. The solid curve starts at ${money(P)} and bends upward to ${money(A)}. A dashed straight line shows simple interest for comparison, ending lower at ${money(P * (1 + rate * t))}.`,
    },
  };
}

function graphModel({ a, b, k }) {
  if (a === 0) return { error: 'With a = 0 the function is the constant k. Choose a value of a other than 0.' };
  if (b === 1) return { error: 'With b = 1 the power is always 1, so nothing grows or decays. Choose a base other than 1.' };
  const f = (x) => a * b ** x + k;
  const grow = b > 1;
  const row = [-2, -1, 0, 1, 2];
  const ys = row.map(f).concat([k]);
  const pad = (Math.max(...ys) - Math.min(...ys)) * 0.15 + 1;
  return {
    problem: R`\(y = ${expSum(a, b, k)}\)`,
    steps: [
      R`The base is \(b = ${num(b)}\). ${grow ? R`Since \(b > 1\), the power grows as \(x\) increases, by ${num((b - 1) * 100, { places: 0 })}% for each step of 1.` : R`Since \(0 < b < 1\), the power shrinks as \(x\) increases, by ${num((1 - b) * 100, { places: 0 })}% for each step of 1.`}`,
      R`y-intercept: \(y = ${num(a)} \cdot ${num(b)}^{0}${k ? ` ${k > 0 ? '+' : '-'} ${Math.abs(k)}` : ''} = ${num(a + k)}\), so the graph crosses the y-axis at \((0, ${num(a + k)})\).`,
      R`Horizontal asymptote: the power gets close to 0 on the ${grow ? 'left' : 'right'}, so \(y\) gets close to \(${k}\). The asymptote is \(y = ${k}\).`,
      R`Range: the power is always positive and \(a\) is ${a > 0 ? 'positive' : 'negative'}, so \(y ${a > 0 ? '>' : '<'} ${k}\).`,
    ],
    answer: R`y-intercept \((0, ${num(a + k)})\); horizontal asymptote \(y = ${k}\); the graph ${a * (b - 1) > 0 ? 'rises' : 'falls'} from left to right.`,
    visual: [
      {
        type: 'plot',
        x: [-4, 4],
        y: [Math.min(...ys) - pad, Math.max(...ys) + pad],
        fns: [{ f }],
        hlines: [{ y: k }],
        points: [{ x: 0, y: a + k, label: `(0, ${txt(a + k)})` }],
        alt: `Graph of the exponential function. It crosses the y-axis at (0, ${txt(a + k)}) and approaches the dashed horizontal line y = ${txt(k)} on the ${grow ? 'left' : 'right'}.`,
      },
      {
        type: 'table',
        headers: [R`\(x\)`, ...row.map((x) => R`\(${x}\)`)],
        rows: [[R`\(y\)`, ...row.map((x) => R`\(${num(f(x), { places: 2 })}\)`)]],
        rowHeaders: true,
        alt: `Table of values: ${row.map((x) => `x = ${txt(x)} gives y = ${txt(f(x), { places: 2 })}`).join('; ')}.`,
      },
    ],
  };
}

export default {
  id: 'exponential-functions',
  title: 'Exponential Functions & Models',
  summary: 'Model growth and decay with y = a·bˣ, including compound interest and half-life, and solve equations with a common base.',
  standards: ['CCSS F-IF.C.7', 'CCSS F-IF.C.8', 'CCSS F-LE.A.2', 'CCSS A-SSE.B.3'],

  explain: {
    intro: R`A linear function adds the same amount at every step. An exponential function multiplies by the same factor at every step. That one difference explains compound interest, population growth, radioactive decay and anything else that changes by a fixed percent per unit of time.`,
    rules: [
      {
        title: 'The form y = a·bˣ',
        text: R`In \(y = a \cdot b^{x}\), \(a\) is the starting value (the value at \(x = 0\)) and \(b\) is the factor \(y\) is multiplied by each time \(x\) goes up by 1. If \(b > 1\) the function grows; if \(0 < b < 1\) it decays. In a table with equal steps in \(x\), the ratio of consecutive \(y\)-values is \(b\).`,
        example: R`The table values 3, 6, 12, 24 for \(x = 0, 1, 2, 3\) start at 3 and double each step: \(y = 3 \cdot 2^{x}\).`,
      },
      {
        title: 'Percent change',
        text: R`Growth by a rate \(r\) each period multiplies by \(1 + r\); decay multiplies by \(1 - r\). So \(y = a(1 + r)^{t}\) or \(y = a(1 - r)^{t}\), with \(r\) written as a decimal. Exponent rules let you change the time unit: \(b^{t} = \left(b^{\frac{1}{12}}\right)^{12t}\).`,
        example: R`\(y = 500(0.85)^{t}\) starts at 500 and loses 15% each period, because \(0.85 = 1 - 0.15\).`,
      },
      {
        title: 'Features of the graph',
        text: R`The graph of \(y = a \cdot b^{x} + k\) crosses the y-axis at \((0, a + k)\) and has the horizontal asymptote \(y = k\): the curve gets closer and closer to that line without reaching it. The domain is all real numbers.`,
        example: R`\(y = 2 \cdot 3^{x} - 5\) has y-intercept \((0, -3)\) and asymptote \(y = -5\).`,
      },
      {
        title: 'Compound interest',
        text: R`If interest at annual rate \(r\) is added \(n\) times a year, each period multiplies the balance by \(1 + \dfrac{r}{n}\), and there are \(nt\) periods in \(t\) years: \(A = P\left(1 + \dfrac{r}{n}\right)^{nt}\).`,
        example: R`$1000 at 6% compounded monthly for 2 years: \(A = 1000(1.005)^{24} \approx 1127.16\).`,
      },
      {
        title: 'Continuous growth and e',
        text: R`As interest is compounded more and more often, the balance approaches \(A = Pe^{rt}\), where \(e \approx 2.71828\). The same formula models any quantity that grows continuously at rate \(r\) (or decays, when \(r\) is negative).`,
        example: R`$1000 at 6% compounded continuously for 2 years: \(A = 1000e^{0.12} \approx 1127.50\).`,
      },
      {
        title: 'Half-life and doubling time',
        text: R`If a quantity halves every \(h\) units of time, \(y = a\left(\dfrac{1}{2}\right)^{\frac{t}{h}}\). If it doubles every \(d\) units, \(y = a \cdot 2^{\frac{t}{d}}\). The exponent counts how many half-lives or doublings have passed.`,
        example: R`80 mg with a half-life of 6 hours: after 18 hours, \(80\left(\frac{1}{2}\right)^{3} = 10\) mg.`,
      },
      {
        title: 'Solving with a common base',
        text: R`If \(b^{x} = b^{y}\) (with \(b > 0\), \(b \ne 1\)), then \(x = y\). To use this, rewrite both sides of the equation as powers of the same base, then set the exponents equal.`,
        example: R`\(4^{x} = 32\): \(2^{2x} = 2^{5}\), so \(2x = 5\) and \(x = \dfrac{5}{2}\).`,
      },
    ],
    vocab: [
      { term: 'growth factor', def: R`The number \(b\) that the quantity is multiplied by in each period. For growth at rate \(r\) it is \(1 + r\).` },
      { term: 'asymptote', def: 'A line that a graph gets closer and closer to without touching.' },
      { term: 'compound interest', def: 'Interest that is added to the balance, so that later interest is earned on it too.' },
      { term: 'e', def: R`An irrational number, about 2.718, that is the natural base for continuous growth.` },
      { term: 'half-life', def: 'The time it takes for a decaying quantity to fall to half of its value.' },
    ],
    mistakes: [
      R`Using the rate as the factor: 5% growth multiplies by \(1.05\), not by \(0.05\).`,
      R`Reading \(0.85\) as "85% decay". It means 85% remains, so 15% is lost.`,
      R`Multiplying before taking the power: \(3 \cdot 2^{4}\) is \(3 \cdot 16 = 48\), not \(6^{4}\).`,
      R`Forgetting that the exponent in \(A = P\left(1 + \frac{r}{n}\right)^{nt}\) counts periods, not years.`,
      R`Setting exponents equal when the bases are different. \(4^{x} = 8\) does not mean \(x = 8\) or \(x = 2\).`,
    ],
    visual: {
      type: 'plot',
      x: [-3.5, 3.5],
      y: [-1, 9],
      fns: [{ f: (x) => 2 ** x, label: 'y = 2ˣ (growth)', labelAt: 2.2 }, { f: (x) => 0.5 ** x, color: 'b', label: 'y = (½)ˣ (decay)', labelAt: -2.2 }],
      points: [{ x: 0, y: 1, label: '(0, 1)', color: 'c' }],
      alt: 'Graph of y = 2ˣ, which rises from left to right, and y = (½)ˣ, which falls from left to right. Both pass through (0, 1) and both get closer and closer to the x-axis without touching it.',
    },
  },

  examples: [
    {
      title: 'Reading an exponential model',
      problem: R`The value of a scooter is modelled by \(V(t) = 500(0.85)^{t}\) dollars after \(t\) years. Describe the model and find the value after 3 years.`,
      steps: [
        R`The starting value is \(V(0) = 500\) dollars.`,
        R`The factor is \(0.85 = 1 - 0.15\), which is less than 1: the value decays by 15% each year.`,
        R`\(V(3) = 500(0.85)^{3} = 500(0.614125) \approx 307.06\).`,
      ],
      answer: 'It starts at $500 and loses 15% of its value each year; after 3 years it is worth about $307.06.',
    },
    {
      title: 'Solving with a common base',
      problem: R`Solve \(9^{x + 1} = 27^{x}\).`,
      steps: [
        R`Both 9 and 27 are powers of 3: \(9 = 3^{2}\) and \(27 = 3^{3}\).`,
        R`Rewrite: \(3^{2(x + 1)} = 3^{3x}\).`,
        R`The bases match, so the exponents are equal: \(2x + 2 = 3x\).`,
        R`\(x = 2\). Check: \(9^{3} = 729\) and \(27^{2} = 729\). ✓`,
      ],
      answer: R`\(x = 2\)`,
    },
    {
      title: 'Word problem: compound interest two ways',
      word: true,
      problem: 'Amara invests $2000 at 6% annual interest for 5 years. Find the final amount if the interest is compounded (a) quarterly and (b) continuously.',
      steps: [
        R`(a) Quarterly means \(n = 4\): the rate per period is \(\frac{0.06}{4} = 0.015\) and there are \(4 \cdot 5 = 20\) periods.`,
        R`\(A = 2000(1.015)^{20} \approx 2693.71\).`,
        R`(b) Continuously: \(A = Pe^{rt} = 2000e^{0.06 \cdot 5} = 2000e^{0.3} \approx 2699.72\).`,
        R`Continuous compounding gives slightly more, about $6 extra, because interest is added more often.`,
      ],
      answer: '(a) $2693.71   (b) $2699.72',
    },
    {
      title: 'Word problem: half-life',
      word: true,
      problem: 'A dose of 80 mg of a medicine has a half-life of 6 hours. How much is left in the body after 18 hours?',
      steps: [
        R`Count the half-lives: \(18 \div 6 = 3\).`,
        R`Each half-life multiplies the amount by \(\frac{1}{2}\): \(80 \to 40 \to 20 \to 10\).`,
        R`With the formula: \(80\left(\frac{1}{2}\right)^{\frac{18}{6}} = 80\left(\frac{1}{2}\right)^{3} = 10\).`,
      ],
      answer: '10 mg',
      visual: {
        type: 'plot',
        x: [0, 26],
        y: [0, 90],
        step: [6, 20],
        fns: [{ f: (t) => 80 * 0.5 ** (t / 6) }],
        points: [{ x: 0, y: 80, label: '80' }, { x: 6, y: 40, label: '40' }, { x: 12, y: 20, label: '20' }, { x: 18, y: 10, label: '10', color: 'b' }],
        axisLabels: ['hours', 'mg'],
        alt: 'Graph of the amount of medicine over time. The curve starts at 80 mg and falls to 40 mg at 6 hours, 20 mg at 12 hours and 10 mg at 18 hours, halving every 6 hours.',
      },
    },
  ],

  models: [
    {
      id: 'compound-interest',
      title: 'Word problem: compound interest',
      word: true,
      intro: 'Change the deposit, the rate, how often interest is added and the number of years.',
      inputs: [
        { name: 'P', label: 'Deposit (dollars)', type: 'int', min: 100, max: 100000, value: 2000 },
        { name: 'r', label: 'Annual interest rate (%)', type: 'number', min: 0.5, max: 20, step: 0.5, value: 6 },
        { name: 'n', label: 'Compounded', type: 'select', value: '4', options: [{ value: '1', label: 'once a year' }, { value: '4', label: 'quarterly' }, { value: '12', label: 'monthly' }, { value: '365', label: 'daily' }, { value: 'e', label: 'continuously' }] },
        { name: 't', label: 'Years', type: 'int', min: 1, max: 40, value: 5 },
      ],
      compute: interestModel,
    },
    {
      id: 'exponential-graph',
      title: 'Graph y = a·bˣ + k',
      intro: 'Change a, b and k to see the intercept, the asymptote and the shape of the curve.',
      inputs: [
        { name: 'a', label: 'a (multiplier)', type: 'number', min: -5, max: 5, step: 0.5, value: 2 },
        { name: 'b', label: 'b (base)', type: 'number', min: 0.1, max: 4, step: 0.1, value: 1.5 },
        { name: 'k', label: 'k (vertical shift)', type: 'int', min: -5, max: 5, value: 0 },
      ],
      compute: graphModel,
    },
  ],

  quiz: {
    easy: [easyGrowthDecay, easyEvaluate, easyInterceptAsymptote],
    medium: [mediumWriteModel, mediumHalfLife, mediumCommonBase, mediumGraphMatch],
    hard: [hardCompound, hardContinuous, hardCommonBase, hardDoubling],
    challenge: [challengeTwoPoints, challengeQuadraticForm, challengeRewriteRate],
  },
};
