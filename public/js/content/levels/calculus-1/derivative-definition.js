import { R, q, frac, gcd, terms, poly, polyEval, linear, num, txt, round, range, checkEqual, checkSame, checkAll, numDeriv, integrate } from '../../lib/index.js';
import { M, lim, cases, subst, dfrac, fit, rowTable, fromBank } from './_shared.js';

const at = (fTex, aTex) => R`\(f(x) = ${fTex}\) at \(x = ${aTex}\)`;

// ───────────── Easy ─────────────

function easyAverageRate(rng) {
  const coefs = [rng.nonzero(-3, 3), rng.int(-6, 6), rng.int(-9, 9)];
  const a = rng.int(-3, 3);
  const b = a + rng.int(2, 4);
  const f = (x) => polyEval(coefs, x);
  const ans = (f(b) - f(a)) / (b - a);
  return q({
    prompt: R`Find the average rate of change of \(f(x) = ${poly(coefs)}\) on the interval \([${a}, ${b}]\).`,
    correct: ans,
    wrong: [
      { value: f(b) - f(a), why: R`That is the change in \(f\). Divide it by the length of the interval, \(${b} - ${a < 0 ? `(${a})` : a} = ${b - a}\).` },
      { value: (f(a) + f(b)) / 2, why: 'That averages the two outputs. A rate of change compares the change in output with the change in input.' },
      f(b) - f(a) !== 0 ? frac(b - a, f(b) - f(a)) : null,
      -ans,
      ans + coefs[0],
    ],
    solution: [
      R`Average rate of change \(= \dfrac{f(b) - f(a)}{b - a}\), the slope of the secant line.`,
      R`\(f(${b}) = ${f(b)}\) and \(f(${a}) = ${f(a)}\).`,
      R`\(\dfrac{${f(b)} - ${f(a) < 0 ? `(${f(a)})` : f(a)}}{${b} - ${a < 0 ? `(${a})` : a}} = \dfrac{${f(b) - f(a)}}{${b - a}} = ${ans}\).`,
    ],
    rule: 0,
    skill: 'average rate of change',
    check: () => checkEqual(ans, integrate((x) => numDeriv(f, x), a, b) / (b - a), 1e-5, 'mean slope'),
  });
}

const RATE_STORIES = [
  { intro: 'The table shows the distance \\(d\\), in kilometers, that a cyclist has ridden \\(t\\) hours after setting out.', y: 'd', ask: 'average speed', unit: 'km/h', step: [1], rates: [8, 24], sign: 1, start: 0 },
  { intro: 'The table shows the temperature \\(T\\), in °C, of an oven \\(t\\) minutes after it is switched on.', y: 'T', ask: 'average rate of change of the temperature', unit: '°C/min', step: [1, 2, 5], rates: [4, 12], sign: 1, start: 20 },
  { intro: 'The table shows the volume \\(V\\), in liters, of water in a tank \\(t\\) minutes after a drain is opened.', y: 'V', ask: 'average rate of change of the volume', unit: 'L/min', step: [1, 2, 5], rates: [3, 9], sign: -1, start: 400 },
  { intro: 'The table shows the height \\(h\\), in centimeters, of a sunflower \\(t\\) weeks after it sprouts.', y: 'h', ask: 'average growth rate', unit: 'cm/week', step: [1, 2], rates: [2, 9], sign: 1, start: 0 },
];

function storyTable(rng, s) {
  const step = rng.pick(s.step);
  const slopes = range(1, 4).map(() => s.sign * rng.int(s.rates[0], s.rates[1]));
  const ts = range(0, 4).map((i) => i * step);
  const ys = [s.start];
  slopes.forEach((m) => ys.push(ys[ys.length - 1] + m * step));
  const visual = rowTable(['t', s.y], ts.map((t, i) => [t, ys[i]]), `Table of values: ${ts.map((t, i) => `at t = ${t}, ${s.y} = ${txt(ys[i])}`).join('; ')}.`);
  return { step, slopes, ts, ys, visual };
}

function easyAverageTable(rng) {
  const s = rng.pick(RATE_STORIES);
  const { slopes, ts, ys, visual } = storyTable(rng, s);
  const i = rng.int(0, 2);
  const j = i + 2;
  const ans = (ys[j] - ys[i]) / (ts[j] - ts[i]);
  return q({
    prompt: R`${s.intro} What is the ${s.ask} from \(t = ${ts[i]}\) to \(t = ${ts[j]}\)?`,
    visual,
    correct: ans,
    unit: s.unit,
    wrong: [
      { value: ys[j] - ys[i], why: R`That is the change in \(${s.y}\). Divide it by the change in \(t\), which is \(${ts[j] - ts[i]}\).` },
      { value: round(ys[j] / ts[j], 2), why: R`That divides the final value by the final time. An average rate uses the change over the interval: \(\dfrac{\Delta ${s.y}}{\Delta t}\).` },
      slopes[i] !== ans ? slopes[i] : slopes[i + 1],
      (ys[i] + ys[j]) / 2,
      -ans,
    ],
    solution: [
      R`Average rate of change \(= \dfrac{\text{change in } ${s.y}}{\text{change in } t}\).`,
      R`\(\dfrac{${ys[j]} - ${ys[i]}}{${ts[j]} - ${ts[i]}} = \dfrac{${ys[j] - ys[i]}}{${ts[j] - ts[i]}} = ${num(ans)}\) ${s.unit}.${ans < 0 ? ' The negative sign shows that the quantity is decreasing.' : ''}`,
    ],
    rule: 0,
    skill: 'average rate of change',
    check: () => checkEqual(ans, (slopes[i] + slopes[i + 1]) / 2, 1e-9, 'mean of the two interval rates'),
  });
}

const MEANING_BANK = [
  (rng) => {
    const a = rng.int(-3, 4);
    const b = a + rng.int(1, 5);
    return {
      prompt: R`For a function \(f\), what does \(\dfrac{f(${b}) - f(${a})}{${b} - ${a < 0 ? `(${a})` : a}}\) represent?`,
      correct: R`The average rate of change of \(f\) on \([${a}, ${b}]\): the slope of a secant line`,
      wrong: [
        { value: R`The instantaneous rate of change of \(f\) at \(x = ${a}\): the slope of a tangent line`, why: 'A quotient over an interval of nonzero length is an average rate. The instantaneous rate needs a limit.' },
        { value: R`The average value of \(f\) on \([${a}, ${b}]\)`, why: 'This quotient compares a change in output with a change in input. It is a rate, not an average height.' },
        R`The total change of \(f\) from \(x = ${a}\) to \(x = ${b}\)`,
      ],
      solution: [R`The numerator is the change in \(f\) and the denominator is the change in \(x\) between \(x = ${a}\) and \(x = ${b}\).`, R`Change in output over change in input is the average rate of change on \([${a}, ${b}]\), the slope of the secant line through the two points.`],
      rule: 0,
    };
  },
  (rng) => {
    const a = rng.int(-5, 6);
    return {
      prompt: R`What does \(${lim(0, 'h')} \dfrac{f(${a} + h) - f(${a})}{h}\) represent, if the limit exists?`,
      correct: R`\(f'(${a})\): the slope of the tangent line to the graph of \(f\) at \(x = ${a}\)`,
      wrong: [
        { value: R`The average rate of change of \(f\) on \([${a}, ${a} + h]\)`, why: 'Before the limit is taken, yes. Letting h tend to 0 turns the average rate into the instantaneous rate.' },
        { value: R`\(f(${a})\): the height of the graph of \(f\) at \(x = ${a}\)`, why: 'The quotient measures how fast the outputs change, not how large they are.' },
        R`The slope of the secant line through \((0, f(0))\) and \((${a}, f(${a}))\)`,
      ],
      solution: [R`The quotient is the slope of the secant line through \((${a}, f(${a}))\) and a nearby point.`, R`As \(h \to 0\) the nearby point slides to \((${a}, f(${a}))\) and the secant slopes approach the tangent slope, which is \(f'(${a})\).`],
      rule: 1,
    };
  },
  (rng) => {
    const t1 = rng.int(1, 5);
    const t2 = t1 + rng.int(1, 5);
    return {
      prompt: R`A particle's position after \(t\) seconds is \(s(t)\) meters. What does \(\dfrac{s(${t2}) - s(${t1})}{${t2} - ${t1}}\) represent?`,
      correct: R`The average velocity between \(t = ${t1}\) and \(t = ${t2}\), in m/s`,
      wrong: [
        { value: R`The velocity at the instant \(t = ${t1}\), in m/s`, why: 'A quotient over a time interval is an average. The velocity at one instant is a limit of such averages.' },
        { value: R`The distance moved between \(t = ${t1}\) and \(t = ${t2}\), in meters`, why: R`That is the numerator alone. Dividing by the elapsed time turns it into a rate.` },
        R`The average position between \(t = ${t1}\) and \(t = ${t2}\), in meters`,
      ],
      solution: [R`The numerator is the change in position and the denominator is the elapsed time.`, R`Change in position divided by elapsed time is the average velocity over the interval \([${t1}, ${t2}]\).`],
      rule: 0,
    };
  },
  (rng) => {
    const t = rng.int(2, 8);
    const v = rng.int(4, 12) * 10;
    return {
      prompt: R`A car's distance from home after \(t\) hours is \(s(t)\) kilometers. What does \(s'(${t}) = ${v}\) mean?`,
      correct: `Exactly ${t} hours after leaving, the distance from home is increasing at ${v} km/h`,
      wrong: [
        { value: `After ${t} hours the car is ${v} km from home`, why: R`That would be \(s(${t}) = ${v}\). The derivative gives a rate, not a distance.` },
        { value: `During the first ${t} hours the car's average speed is ${v} km/h`, why: 'A derivative is the rate at one instant, not an average over an interval.' },
        `The car takes ${t} hours to travel ${v} km`,
      ],
      solution: [R`\(s'(t)\) is the instantaneous rate of change of distance with respect to time, in km/h.`, `So at the instant t = ${t} hours, the distance from home is growing at ${v} km/h.`],
      rule: 3,
    };
  },
];

function easyMeaning(rng) {
  return fromBank(rng, MEANING_BANK, { skill: 'interpreting rates' });
}

function easySlopeFromGraph(rng) {
  const a = rng.int(-2, 2);
  const y0 = rng.int(1, 4);
  const m = rng.pick([frac(-2, 1), frac(-3, 2), frac(-1, 1), frac(-1, 2), frac(1, 2), frac(1, 1), frac(3, 2), frac(2, 1)]);
  const c = rng.pick([-0.4, -0.3, 0.3, 0.4]);
  const f = (x) => y0 + m.value * (x - a) + c * (x - a) ** 2;
  const y1 = y0 + 2 * m.value;
  return q({
    prompt: R`The dashed line is tangent to the graph of \(f\) at the point \((${a}, ${y0})\). The line also passes through \((${a + 2}, ${y1})\). What is \(f'(${a})\)?`,
    visual: {
      type: 'plot',
      x: [a - 4, a + 4],
      y: [-5, 10],
      step: [1, 1],
      fns: [{ f }, { f: (x) => y0 + m.value * (x - a), color: 'b', dashed: true }],
      points: [{ x: a, y: y0 }, { x: a + 2, y: y1, color: 'b' }],
      alt: `Graph of a curve f with a dashed tangent line touching it at (${txt(a)}, ${y0}). The tangent line also passes through (${txt(a + 2)}, ${txt(y1)}).`,
    },
    correct: m,
    wrong: [
      { value: y0, why: R`\(${y0}\) is the height \(f(${a})\). The derivative is the slope of the tangent line.` },
      { value: frac(y1 - y0, 1), why: 'That is the rise alone. Divide it by the run, which is 2.' },
      m.inv(),
      m.neg(),
      y1,
    ],
    solution: [
      R`\(f'(${a})\) is the slope of the tangent line at \(x = ${a}\).`,
      R`Use the two points on the line: slope \(= \dfrac{${y1} - ${y0}}{${a + 2} - ${a < 0 ? `(${a})` : a}} = \dfrac{${y1 - y0}}{2} = ${m.tex()}\).`,
    ],
    rule: 1,
    skill: 'slope of a tangent line',
    check: () => checkEqual(numDeriv(f, a), m.value, 1e-6, 'slope of the curve'),
  });
}

// ───────────── Medium ─────────────

function mediumDifferenceQuotient(rng) {
  const p = rng.nonzero(-4, 4);
  const b = rng.int(-6, 6);
  const c = rng.int(-9, 9);
  const coefs = [p, b, c];
  const f = (x) => polyEval(coefs, x);
  if (rng.bool(0.5)) {
    const a = rng.nonzero(-4, 4);
    const m = 2 * p * a + b;
    return q({
      prompt: R`Let \(f(x) = ${poly(coefs)}\). Simplify the difference quotient \(\dfrac{f(${a} + h) - f(${a})}{h}\) for \(h \ne 0\).`,
      correct: M(terms([[m, ''], [p, 'h']])),
      wrong: [
        { value: M(String(m)), why: R`That is the limit as \(h \to 0\), which is \(f'(${a})\). Before the limit, the quotient still depends on \(h\).` },
        { value: M(terms([[b, ''], [p, 'h']])), why: R`\((${a} + h)^{2} = ${a * a} ${a > 0 ? '+' : '-'} ${Math.abs(2 * a)}h + h^{2}\). The middle term must not be dropped.` },
        M(terms([[m, ''], [p, 'h^{2}']])),
        M(terms([[m, ''], [2 * p, 'h']])),
      ],
      solution: [
        R`\(f(${a} + h) = ${terms([[p, `(${a} + h)^{2}`], [b, `(${a} + h)`], [c, '']])} = ${terms([[f(a), ''], [m, 'h'], [p, 'h^{2}']])}\).`,
        R`Subtract \(f(${a}) = ${f(a)}\): \(f(${a} + h) - f(${a}) = ${terms([[m, 'h'], [p, 'h^{2}']])}\).`,
        R`Divide every term by \(h\): \(${terms([[m, ''], [p, 'h']])}\).`,
      ],
      rule: 2,
      skill: 'difference quotient',
      check: () => checkSame((h) => (f(a + h) - f(a)) / h, (h) => m + p * h),
    });
  }
  return q({
    prompt: R`Let \(f(x) = ${poly(coefs)}\). Simplify the difference quotient \(\dfrac{f(x + h) - f(x)}{h}\) for \(h \ne 0\).`,
    correct: M(terms([[2 * p, 'x'], [p, 'h'], [b, '']])),
    wrong: [
      { value: M(terms([[2 * p, 'x'], [b, '']])), why: R`That is the limit as \(h \to 0\), which is \(f'(x)\). Before the limit, the quotient still contains \(h\).` },
      { value: M(terms([[p, 'h'], [b, '']])), why: R`\((x + h)^{2} = x^{2} + 2xh + h^{2}\). The middle term must not be dropped.` },
      M(terms([[2 * p, 'x'], [p, 'h^{2}'], [b, '']])),
      M(terms([[2 * p, 'x'], [2 * p, 'h'], [b, '']])),
    ],
    solution: [
      R`\(f(x + h) = ${terms([[p, '(x + h)^{2}'], [b, '(x + h)'], [c, '']])} = ${terms([[p, 'x^{2}'], [2 * p, 'xh'], [p, 'h^{2}'], [b, 'x'], [b, 'h'], [c, '']])}\).`,
      R`Subtract \(f(x)\): the terms without \(h\) cancel, leaving \(${terms([[2 * p, 'xh'], [p, 'h^{2}'], [b, 'h']])}\).`,
      R`Divide every term by \(h\): \(${terms([[2 * p, 'x'], [p, 'h'], [b, '']])}\).`,
    ],
    rule: 2,
    skill: 'difference quotient',
    check: () => checkAll(...[0.7, -1.3].map((x) => checkSame((h) => (f(x + h) - f(x)) / h, (h) => 2 * p * x + p * h + b))),
  });
}

function mediumDerivAtPoint(rng) {
  const p = rng.nonzero(-4, 4);
  const b = rng.int(-6, 6);
  const c = rng.int(-9, 9);
  const a = rng.nonzero(-4, 4);
  const coefs = [p, b, c];
  const f = (x) => polyEval(coefs, x);
  const m = 2 * p * a + b;
  return q({
    prompt: R`Use the limit definition of the derivative to find \(f'(${a})\) for \(f(x) = ${poly(coefs)}\).`,
    correct: m,
    wrong: [
      { value: f(a), why: R`That is \(f(${a})\), the height of the graph. The derivative is the limit of the difference quotient.` },
      { value: m + p, why: R`That is the difference quotient with \(h = 1\) (a secant slope). Let \(h \to 0\).` },
      { value: b, why: R`\((${a} + h)^{2}\) has a middle term, \(${2 * a}h\), which contributes \(${2 * p * a}\) to the answer.` },
      2 * p * a,
      -m,
    ],
    solution: [
      R`\(f'(${a}) = ${lim(0, 'h')} \dfrac{f(${a} + h) - f(${a})}{h}\).`,
      R`\(f(${a} + h) - f(${a}) = ${terms([[m, 'h'], [p, 'h^{2}']])}\) after expanding and cancelling.`,
      R`Divide by \(h\): \(${terms([[m, ''], [p, 'h']])}\).`,
      R`Let \(h \to 0\): \(f'(${a}) = ${m}\).`,
    ],
    rule: 2,
    skill: 'derivative from the definition',
    check: () => checkEqual(m, numDeriv(f, a), 1e-5, "f'(a)"),
  });
}

function mediumRecognise(rng) {
  const a = rng.int(2, 5);
  const n = rng.intExcept(2, 5, [a]);
  const [ang, val, cosVal, other] = rng.pick([['\\frac{\\pi}{6}', '\\frac{1}{2}', '\\frac{\\sqrt{3}}{2}', '\\frac{\\pi}{3}'], ['\\frac{\\pi}{3}', '\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}', '\\frac{\\pi}{6}']]);
  const angle = ang.includes('6') ? Math.PI / 6 : Math.PI / 3;
  const hLim = lim(0, 'h');
  const k = rng.pick([
    { expr: R`${hLim} \dfrac{(${a} + h)^{${n}} - ${a ** n}}{h}`, f: `x^{${n}}`, at: a, js: (x) => x ** n, p: a, wrong: [{ value: at(`x^{${n}}`, a ** n), why: R`\(${a ** n} = ${a}^{${n}}\) is the value \(f(${a})\). The point is the number that \(h\) is added to.` }, at(`x^{${a}}`, n), at(`(x + ${a})^{${n}}`, a)] },
    { expr: R`${lim(a)} \dfrac{x^{${n}} - ${a ** n}}{x - ${a}}`, f: `x^{${n}}`, at: a, js: (x) => x ** n, p: a, wrong: [{ value: at(`x^{${n}}`, a ** n), why: R`\(${a ** n} = ${a}^{${n}}\) is the value \(f(${a})\). The point is the number that \(x\) approaches.` }, at(`x^{${a}}`, n), at(`x^{${n}} - ${a ** n}`, 0)] },
    { expr: R`${hLim} \dfrac{\sqrt{${a * a} + h} - ${a}}{h}`, f: '\\sqrt{x}', at: a * a, js: Math.sqrt, p: a * a, wrong: [{ value: at('\\sqrt{x}', a), why: R`\(${a} = \sqrt{${a * a}}\) is the value \(f(${a * a})\). The point is the number that \(h\) is added to.` }, at('x^{2}', a), at(`\\sqrt{x + ${a * a}}`, a * a)] },
    { expr: R`${hLim} \dfrac{\frac{1}{${a} + h} - \frac{1}{${a}}}{h}`, f: '\\dfrac{1}{x}', at: a, js: (x) => 1 / x, p: a, wrong: [{ value: at('\\dfrac{1}{x}', `\\frac{1}{${a}}`), why: R`\(\frac{1}{${a}}\) is the value \(f(${a})\). The point is the number that \(h\) is added to.` }, at('\\dfrac{1}{x^{2}}', a), at(`\\dfrac{1}{x + ${a}}`, a)] },
    { expr: R`${hLim} \dfrac{e^{${a} + h} - e^{${a}}}{h}`, f: 'e^{x}', at: a, js: Math.exp, p: a, wrong: [{ value: at('e^{x}', `e^{${a}}`), why: R`\(e^{${a}}\) is the value \(f(${a})\). The point is the number that \(h\) is added to.` }, at('\\ln x', a), at(`e^{x + ${a}}`, a)] },
    { expr: R`${hLim} \dfrac{\ln(${a} + h) - \ln ${a}}{h}`, f: '\\ln x', at: a, js: Math.log, p: a, wrong: [{ value: at('\\ln x', `\\ln ${a}`), why: R`\(\ln ${a}\) is the value \(f(${a})\). The point is the number that \(h\) is added to.` }, at('e^{x}', a), { value: at('\\dfrac{1}{x}', a), why: R`\(\frac{1}{x}\) is the derivative of \(\ln x\). The limit differentiates \(\ln x\) itself.` }] },
    { expr: R`${hLim} \dfrac{\sin\left(${ang} + h\right) - ${val}}{h}`, f: '\\sin x', at: ang, js: Math.sin, p: angle, wrong: [{ value: at('\\sin x', val), why: R`\(${val} = \sin ${ang}\) is the value of the function. The point is the number that \(h\) is added to.` }, { value: at('\\cos x', ang), why: R`\(\cos ${ang} = ${cosVal}\), which is not the number being subtracted.` }, at('\\sin x', other)] },
    { expr: R`${hLim} \dfrac{\cos\left(${ang} + h\right) - ${cosVal}}{h}`, f: '\\cos x', at: ang, js: Math.cos, p: angle, wrong: [{ value: at('\\cos x', cosVal), why: R`\(${cosVal} = \cos ${ang}\) is the value of the function. The point is the number that \(h\) is added to.` }, { value: at('\\sin x', ang), why: R`\(\sin ${ang} = ${val}\), which is not the number being subtracted.` }, at('\\cos x', other)] },
  ]);
  return q({
    prompt: R`The limit \(${k.expr}\) is the derivative of which function, at which point?`,
    correct: at(k.f, k.at),
    wrong: k.wrong,
    solution: [
      R`Compare with the definition: \(f'(a) = ${lim(0, 'h')} \dfrac{f(a + h) - f(a)}{h}\), or equivalently \(${lim('a')} \dfrac{f(x) - f(a)}{x - a}\).`,
      R`The number subtracted in the numerator is \(f(a)\), and \(a\) is the number that \(h\) is added to (or that \(x\) approaches).`,
      R`So \(f(x) = ${k.f}\) and \(a = ${k.at}\): the limit is \(f'(${k.at})\).`,
    ],
    rule: 1,
    skill: 'recognising a derivative',
    check: () => checkEqual((k.js(k.p + 1e-6) - k.js(k.p - 1e-6)) / 2e-6, numDeriv(k.js, k.p), 1e-4, 'limit value'),
  });
}

function mediumTableEstimate(rng) {
  const s = rng.pick(RATE_STORIES);
  let t;
  do t = storyTable(rng, s);
  while (t.slopes.some((m, i) => i > 0 && m === t.slopes[i - 1]));
  const { step, slopes, ts, ys, visual } = t;
  const i = rng.int(1, 3);
  const ans = (ys[i + 1] - ys[i - 1]) / (2 * step);
  const L = (x) => (ys[i - 1] * (x - ts[i]) * (x - ts[i + 1])) / (2 * step * step) - (ys[i] * (x - ts[i - 1]) * (x - ts[i + 1])) / (step * step) + (ys[i + 1] * (x - ts[i - 1]) * (x - ts[i])) / (2 * step * step);
  return q({
    prompt: R`${s.intro} Estimate \(${s.y}'(${ts[i]})\) using the average rate of change of \(${s.y}\) from \(t = ${ts[i - 1]}\) to \(t = ${ts[i + 1]}\).`,
    visual,
    correct: ans,
    unit: s.unit,
    wrong: [
      { value: ys[i + 1] - ys[i - 1], why: R`That is the change in \(${s.y}\). Divide it by the change in \(t\), which is \(${2 * step}\).` },
      { value: slopes[i - 1], why: R`That uses only the interval from \(t = ${ts[i - 1]}\) to \(t = ${ts[i]}\). The question asks for the interval that has \(t = ${ts[i]}\) in the middle.` },
      slopes[i],
      { value: ys[i], why: R`That is the value \(${s.y}(${ts[i]})\), not its rate of change.` },
      (ys[4] - ys[0]) / (4 * step),
    ],
    solution: [
      R`The derivative is approximated by a difference quotient over a short interval around \(t = ${ts[i]}\).`,
      R`\(${s.y}'(${ts[i]}) \approx \dfrac{${s.y}(${ts[i + 1]}) - ${s.y}(${ts[i - 1]})}{${ts[i + 1]} - ${ts[i - 1]}} = \dfrac{${ys[i + 1]} - ${ys[i - 1]}}{${2 * step}} = ${num(ans)}\) ${s.unit}.`,
    ],
    rule: 4,
    skill: 'estimating a derivative',
    check: () => checkEqual(ans, numDeriv(L, ts[i]), 1e-5, 'slope of the parabola through the three points'),
  });
}

function mediumShrinking(rng) {
  const p = rng.pick([-3, -2, -1, 1, 2, 3]);
  const base = rng.intExcept(-12, 15, [0]);
  const a = rng.int(1, 5);
  const moving = rng.bool(0.5);
  const hs = [1, 0.5, 0.1, 0.01];
  const rates = hs.map((h) => round(base + p * h, 2));
  const cols = hs.map((h, i) => [M(`[${a},\\ ${num(a + h)}]`), rates[i]]);
  const f = (x) => p * (x - a) ** 2 + base * (x - a) + 7;
  return q({
    prompt: moving
      ? R`The table shows the average velocity of a particle, in m/s, over shorter and shorter time intervals that begin at \(t = ${a}\) seconds. What is the most reasonable value for the particle's velocity at the instant \(t = ${a}\)?`
      : R`The table shows the average rate of change of a function \(f\) over shorter and shorter intervals that begin at \(x = ${a}\). What is the most reasonable value for \(f'(${a})\)?`,
    visual: rowTable(['\\text{interval}', moving ? '\\text{average velocity}' : '\\text{average rate}'], cols, `Table: ${hs.map((h, i) => `on the interval from ${a} to ${txt(a + h)} the average rate is ${txt(rates[i])}`).join('; ')}.`),
    correct: base,
    unit: moving ? 'm/s' : undefined,
    wrong: [
      { value: rates[3], why: R`The averages keep moving toward \(${base}\) as the interval shrinks. The instantaneous rate is the limit, not the last table entry.` },
      { value: rates[0], why: 'That is the average over the longest interval. Shorter intervals give better estimates of the rate at an instant.' },
      { value: 0, why: 'The length of the interval tends to 0, but the average rates do not.' },
      round((rates[0] + rates[3]) / 2, 2),
    ],
    solution: [
      `The instantaneous rate is the limit of the average rates as the interval shrinks to a point.`,
      R`The averages \(${rates.map((r) => num(r)).join(',\\ ')}\) are heading to \(${base}\).`,
      moving ? R`The velocity at \(t = ${a}\) is about \(${base}\) m/s.` : R`\(f'(${a}) \approx ${base}\).`,
    ],
    rule: 1,
    skill: 'derivative as a limit',
    check: () => checkAll(checkEqual(numDeriv(f, a), base, 1e-6, 'slope'), ...hs.map((h, i) => checkEqual((f(a + h) - f(a)) / h, rates[i], 1e-6, 'table entry'))),
  });
}

// ───────────── Hard ─────────────

function hardReciprocalRoot(rng) {
  if (rng.bool(0.5)) {
    const a = rng.int(2, 5);
    const c = rng.pick([-7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7].filter((v) => gcd(v, a) === 1));
    const C = Math.abs(c);
    const lead = C === 1 ? '' : String(C);
    const ans = frac(-c, a * a);
    const fx = dfrac(String(c), 'x');
    const diff = c > 0 ? R`\dfrac{${C}}{${a} + h} - \dfrac{${C}}{${a}} = \dfrac{${lead}\left[${a} - (${a} + h)\right]}{${a}(${a} + h)} = -\dfrac{${lead}h}{${a}(${a} + h)}` : R`-\dfrac{${C}}{${a} + h} + \dfrac{${C}}{${a}} = \dfrac{${lead}\left[(${a} + h) - ${a}\right]}{${a}(${a} + h)} = \dfrac{${lead}h}{${a}(${a} + h)}`;
    const sgn = c > 0 ? '-' : '';
    return q({
      prompt: R`Use the limit definition of the derivative to find \(f'(${a})\) for \(f(x) = ${fx}\).`,
      correct: ans,
      wrong: [
        { value: ans.neg(), why: R`Combining the fractions gives \(${a} - (${a} + h) = -h\). Keep track of that minus sign.` },
        { value: frac(-c, a), why: R`The combined denominator is \(${a}(${a} + h)\), which tends to \(${a} \cdot ${a} = ${a * a}\).` },
        { value: frac(c, a), why: R`That is \(f(${a})\). The derivative is the limit of the difference quotient.` },
        frac(-1, a * a),
        frac(c, a * a * a),
      ],
      solution: [
        R`\(f'(${a}) = ${lim(0, 'h')} \dfrac{f(${a} + h) - f(${a})}{h}\). Start with the numerator.`,
        R`Combine the fractions: \(f(${a} + h) - f(${a}) = ${diff}\).`,
        R`Divide by \(h\): \(${sgn}\dfrac{${C}}{${a}(${a} + h)}\).`,
        R`Let \(h \to 0\): \(f'(${a}) = ${sgn}\dfrac{${C}}{${a} \cdot ${a}} = ${ans.tex()}\).`,
      ],
      rule: 2,
      skill: 'derivative from the definition',
      check: () => checkEqual(ans.value, numDeriv((x) => c / x, a), 1e-5, "f'(a)"),
    });
  }
  const d = rng.int(2, 6);
  const a = rng.int(-3, 8);
  const c = d * d - a;
  const root = (inner) => R`\sqrt{${inner}}`;
  const ans = frac(1, 2 * d);
  return q({
    prompt: R`Use the limit definition of the derivative to find \(f'(${a})\) for \(f(x) = ${root(linear(1, c))}\).`,
    correct: ans,
    wrong: [
      { value: frac(1, d), why: R`After multiplying by the conjugate, the denominator \(${root(`${d * d} + h`)} + ${d}\) tends to \(${d} + ${d} = ${2 * d}\).` },
      { value: d, why: R`That is \(f(${a})\). The derivative is the limit of the difference quotient.` },
      frac(1, 2 * d * d),
      frac(2 * d, 1),
      frac(1, d * d),
    ],
    solution: [
      R`\(f(${a} + h) = ${root(`${d * d} + h`)}\) and \(f(${a}) = ${d}\), so \(f'(${a}) = ${lim(0, 'h')} \dfrac{${root(`${d * d} + h`)} - ${d}}{h}\).`,
      R`Multiply the top and the bottom by the conjugate \(${root(`${d * d} + h`)} + ${d}\): the numerator becomes \((${d * d} + h) - ${d * d} = h\).`,
      R`Cancel \(h\): \(\dfrac{1}{${root(`${d * d} + h`)} + ${d}}\).`,
      R`Let \(h \to 0\): \(f'(${a}) = \dfrac{1}{${d} + ${d}} = \dfrac{1}{${2 * d}}\).`,
    ],
    rule: 2,
    skill: 'derivative from the definition',
    check: () => checkEqual(ans.value, numDeriv((x) => Math.sqrt(x + c), a), 1e-5, "f'(a)"),
  });
}

function hardQuotientCubic(rng) {
  const p = rng.nonzero(-3, 3);
  const b = rng.int(-6, 6);
  const f = (x) => p * x ** 3 + b * x;
  const expr = (c1, c2, hp) => M(terms([[3 * p, 'x^{2}'], [c1, 'xh'], [c2, hp], [b, '']]));
  return q({
    prompt: R`Let \(f(x) = ${terms([[p, 'x^{3}'], [b, 'x']])}\). Simplify the difference quotient \(\dfrac{f(x + h) - f(x)}{h}\) for \(h \ne 0\).`,
    correct: expr(3 * p, p, 'h^{2}'),
    wrong: [
      { value: M(terms([[3 * p, 'x^{2}'], [b, '']])), why: R`That is the limit as \(h \to 0\), which is \(f'(x)\). Before the limit, the quotient still contains \(h\).` },
      { value: expr(0, p, 'h^{2}'), why: R`\((x + h)^{3} = x^{3} + 3x^{2}h + 3xh^{2} + h^{3}\). The term \(3xh^{2}\) must not be dropped.` },
      expr(3 * p, p, 'h^{3}'),
      expr(p, p, 'h^{2}'),
    ],
    solution: [
      R`Expand: \((x + h)^{3} = x^{3} + 3x^{2}h + 3xh^{2} + h^{3}\).`,
      R`\(f(x + h) - f(x) = ${terms([[3 * p, 'x^{2}h'], [3 * p, 'xh^{2}'], [p, 'h^{3}'], [b, 'h']])}\): every term without \(h\) cancels.`,
      R`Divide every term by \(h\): \(${terms([[3 * p, 'x^{2}'], [3 * p, 'xh'], [p, 'h^{2}'], [b, '']])}\).`,
    ],
    rule: 2,
    skill: 'difference quotient',
    check: () => checkAll(...[0.7, -1.3].map((x) => checkSame((h) => (f(x + h) - f(x)) / h, (h) => 3 * p * x * x + 3 * p * x * h + p * h * h + b))),
  });
}

function hardPiecewiseDiff(rng) {
  const a = rng.nonzero(-3, 3);
  const b1 = rng.int(-5, 5);
  const kind = rng.pick(['smooth', 'corner', 'jump']);
  const m = kind === 'corner' ? rng.intExcept(-6, 6, [2 * a]) : 2 * a;
  const b2 = a * a + b1 - m * a + (kind === 'jump' ? rng.pick([-3, -2, -1, 1, 2, 3]) : 0);
  const f = (x) => (x <= a ? x * x + b1 : m * x + b2);
  const choice = {
    smooth: R`Yes: the pieces meet at \(x = ${a}\) and have the same slope there`,
    corner: R`No: \(f\) is continuous at \(x = ${a}\), but the slopes from the left and from the right are different`,
    jump: R`No: \(f\) is not continuous at \(x = ${a}\), so it cannot be differentiable there`,
    never: 'No: a piecewise function is never differentiable where its formula changes',
  };
  const why = {
    smooth: { jump: R`Both pieces give \(${a * a + b1}\) at \(x = ${a}\), so \(f\) is continuous there.`, corner: R`Both slopes equal \(${2 * a}\) at \(x = ${a}\).`, never: 'If the pieces meet and their slopes agree, the graph passes smoothly through the point.' },
    corner: { smooth: R`The pieces meet, but the left slope is \(${2 * a}\) and the right slope is \(${m}\).`, jump: R`Both pieces give \(${a * a + b1}\) at \(x = ${a}\), so \(f\) is continuous there.` },
    jump: { smooth: R`The slopes agree, but the heights do not: the left piece gives \(${a * a + b1}\) and the right piece approaches \(${m * a + b2}\).`, corner: R`The left piece gives \(${a * a + b1}\) and the right piece approaches \(${m * a + b2}\), so \(f\) is not continuous there.` },
  }[kind];
  const h = 1e-6;
  const leftSlope = (f(a) - f(a - h)) / h;
  const rightSlope = (f(a + h) - f(a)) / h;
  return q({
    prompt: R`Is \(f(x) = ${cases([[poly([1, 0, b1]), `x \\le ${a}`], [linear(m, b2), `x > ${a}`]])}\) differentiable at \(x = ${a}\)?`,
    correct: choice[kind],
    wrong: Object.keys(choice).filter((k) => k !== kind).map((k) => (why[k] ? { value: choice[k], why: why[k] } : choice[k])),
    solution: [
      R`First check continuity at \(x = ${a}\): the left piece gives \(${subst([1, 0, b1], a)} = ${a * a + b1}\) and the right piece approaches \(${subst([m, b2], a)} = ${m * a + b2}\).`,
      kind === 'jump' ? R`These are different, so \(f\) is not continuous at \(x = ${a}\). A function that is not continuous at a point cannot be differentiable there, even though the two slope formulas agree.` : R`These agree, so \(f\) is continuous. Now compare slopes: for \(${poly([1, 0, b1])}\) the slope at \(x = ${a}\) is \(${lim(0, 'h')} \frac{(${a} + h)^{2} - ${a * a}}{h} = ${2 * a}\); for the line it is \(${m}\).`,
      kind === 'smooth' ? R`The one-sided slopes are equal, so \(f\) is differentiable at \(x = ${a}\), with \(f'(${a}) = ${m}\).` : kind === 'corner' ? R`\(${2 * a} \ne ${m}\): the graph has a corner, so \(f\) is not differentiable at \(x = ${a}\).` : R`So \(f\) is not differentiable at \(x = ${a}\).`,
    ],
    rule: 5,
    skill: 'differentiability',
    check: () => {
      const smooth = Math.abs(leftSlope - rightSlope) < 1e-3;
      const continuous = Math.abs(f(a + 1e-9) - f(a)) < 1e-6;
      return (kind === 'smooth') === smooth && (kind === 'jump') === !continuous ? true : 'one-sided slopes do not match the answer';
    },
  });
}

function hardGraphNotDiff(rng) {
  const c = rng.int(-3, 0);
  const d = c + rng.int(2, 3);
  const T = rng.pick(['cornerPeak', 'cornerJump', 'peakJump']);
  const base = { type: 'plot', x: [c - 3, d + 3], y: [-3, 7], step: [1, 1] };
  let visual;
  let key;
  let why;
  let steps;
  if (T === 'cornerPeak') {
    const top = d - c + 0.5;
    visual = {
      ...base,
      fns: [{ f: (x) => Math.abs(x - c) + 1, domain: [c - 3, d - 1], color: 'a' }, { f: (x) => top - 0.5 * (x - d) ** 2, domain: [d - 1, d + 3], color: 'a' }],
      alt: `Graph of f: an unbroken curve with a sharp V-shaped corner at x = ${txt(c)} and a smooth rounded peak at x = ${txt(d)}.`,
    };
    key = 'c';
    why = { d: R`At the smooth peak the tangent line is horizontal, so \(f'(${d}) = 0\) exists.`, both: R`At the smooth peak the tangent line is horizontal, so \(f'(${d}) = 0\) exists.`, none: 'At a sharp corner the slopes from the left and from the right are different.' };
    steps = [R`At \(x = ${c}\) the graph has a sharp corner: the slope is \(-1\) on the left and \(1\) on the right, so \(f'(${c})\) does not exist.`, R`At \(x = ${d}\) the graph has a smooth peak with a horizontal tangent: \(f'(${d}) = 0\).`, R`So \(f\) fails to be differentiable only at \(x = ${c}\).`];
  } else if (T === 'cornerJump') {
    visual = {
      ...base,
      fns: [{ f: (x) => Math.abs(x - c) + 1, domain: [c - 3, d], color: 'a' }, { f: (x) => 1 + 0.5 * (x - d), domain: [d, d + 3], color: 'a' }],
      points: [{ x: d, y: d - c + 1, open: true }, { x: d, y: 1 }],
      alt: `Graph of f: a V shape with a sharp corner at x = ${txt(c)}, rising to an open circle at x = ${txt(d)}, where the graph jumps down to a filled dot and continues as a line.`,
    };
    key = 'both';
    why = { c: R`\(f\) is not continuous at \(x = ${d}\), and a function cannot be differentiable where it is not continuous.`, d: 'At a sharp corner the slopes from the left and from the right are different.', none: 'A corner and a jump each prevent a single tangent line.' };
    steps = [R`At \(x = ${c}\) the graph has a sharp corner, so \(f'(${c})\) does not exist.`, R`At \(x = ${d}\) the graph jumps: \(f\) is not continuous there, so it is not differentiable there.`, R`So \(f\) is not differentiable at \(x = ${c}\) and at \(x = ${d}\).`];
  } else {
    const leftAtD = 4 - 0.5 * (d - c) ** 2;
    visual = {
      ...base,
      fns: [{ f: (x) => 4 - 0.5 * (x - c) ** 2, domain: [c - 3, d], color: 'a' }, { f: (x) => leftAtD + 2 + 0.5 * (x - d), domain: [d, d + 3], color: 'a' }],
      points: [{ x: d, y: leftAtD, open: true }, { x: d, y: leftAtD + 2 }],
      alt: `Graph of f: a smooth rounded peak at x = ${txt(c)}, then the curve falls to an open circle at x = ${txt(d)}, where the graph jumps up to a filled dot and continues as a line.`,
    };
    key = 'd';
    why = { c: R`At the smooth peak the tangent line is horizontal, so \(f'(${c}) = 0\) exists.`, both: R`At the smooth peak the tangent line is horizontal, so \(f'(${c}) = 0\) exists.`, none: R`\(f\) is not continuous at the jump, so it cannot be differentiable there.` };
    steps = [R`At \(x = ${c}\) the graph has a smooth peak with a horizontal tangent: \(f'(${c}) = 0\).`, R`At \(x = ${d}\) the graph jumps: \(f\) is not continuous there, so it is not differentiable there.`, R`So \(f\) fails to be differentiable only at \(x = ${d}\).`];
  }
  const choice = { c: R`At \(x = ${c}\) only`, d: R`At \(x = ${d}\) only`, both: R`At \(x = ${c}\) and at \(x = ${d}\)`, none: R`Nowhere: \(f\) is differentiable on the whole interval` };
  return q({
    prompt: R`The graph of \(f\) is shown for \(${c - 3} < x < ${d + 3}\). At which values of \(x\) in this interval is \(f\) not differentiable?`,
    visual,
    correct: choice[key],
    wrong: Object.keys(choice).filter((k) => k !== key).map((k) => ({ value: choice[k], why: why[k] })),
    solution: steps,
    rule: 5,
    skill: 'differentiability',
  });
}

function hardVelocity(rng) {
  const p = rng.int(1, 5);
  const b = rng.int(0, 12);
  const a = rng.int(1, 5);
  const s = (t) => p * t * t + b * t;
  const v = 2 * p * a + b;
  const sTex = terms([[p, 't^{2}'], [b, 't']]);
  const expand = R`\(s(${a} + h) - s(${a}) = ${terms([[v, 'h'], [p, 'h^{2}']])}\) after expanding and cancelling.`;
  if (rng.bool(0.5)) {
    const e = (list) => R`\(${terms(list)}\) m/s`;
    return q({
      prompt: R`A cart's position after \(t\) seconds is \(s(t) = ${sTex}\) meters. What is its average velocity over the time interval from \(t = ${a}\) to \(t = ${a} + h\), where \(h > 0\)?`,
      correct: e([[v, ''], [p, 'h']]),
      wrong: [
        { value: e([[v, '']]), why: R`That is the limit as \(h \to 0\): the velocity at the instant \(t = ${a}\). Over an interval of length \(h\) the average still depends on \(h\).` },
        { value: e([[b, ''], [p, 'h']]), why: R`\((${a} + h)^{2} = ${a * a} + ${2 * a}h + h^{2}\). The middle term must not be dropped.` },
        e([[v, ''], [p, 'h^{2}']]),
        e([[v, ''], [2 * p, 'h']]),
        e([[s(a), ''], [p, 'h']]),
      ],
      solution: [R`Average velocity \(= \dfrac{s(${a} + h) - s(${a})}{h}\).`, expand, R`Divide by \(h\): the average velocity is \(${terms([[v, ''], [p, 'h']])}\) m/s.`],
      rule: 2,
      skill: 'average and instantaneous velocity',
      check: () => checkSame((h) => (s(a + h) - s(a)) / h, (h) => v + p * h),
    });
  }
  return q({
    prompt: R`A cart's position after \(t\) seconds is \(s(t) = ${sTex}\) meters. Find its instantaneous velocity at \(t = ${a}\) seconds as the limit of its average velocities over \([${a}, ${a} + h]\).`,
    correct: v,
    unit: 'm/s',
    wrong: [
      { value: s(a), why: R`That is the position \(s(${a})\), in meters. Velocity is the rate at which the position changes.` },
      { value: v + p, why: R`That is the average velocity from \(t = ${a}\) to \(t = ${a + 1}\). Let the length of the interval tend to 0.` },
      2 * p * a,
      p * a + b,
      v + 2 * p,
    ],
    solution: [R`Average velocity over \([${a}, ${a} + h]\): \(\dfrac{s(${a} + h) - s(${a})}{h}\).`, expand, R`Divide by \(h\): \(${terms([[v, ''], [p, 'h']])}\).`, R`Let \(h \to 0\): the instantaneous velocity is \(${v}\) m/s.`],
    rule: 2,
    skill: 'average and instantaneous velocity',
    check: () => checkEqual(v, numDeriv(s, a), 1e-5, 'velocity'),
  });
}

// ───────────── Challenge ─────────────

function challengeDisguisedLimit(rng) {
  const a = rng.nonzero(-4, 5);
  const m = rng.nonzero(-8, 8);
  const k = rng.int(2, 5);
  const f = (x) => m * (x - a) + 2 * (x - a) ** 2 + 3;
  const fa = `f(${a})`;
  const hLim = lim(0, 'h');
  const v = rng.pick([
    { expr: R`${hLim} \dfrac{f(${a} + ${k}h) - ${fa}}{h}`, val: frac(k * m, 1), g: (h) => (f(a + k * h) - f(a)) / h, how: [R`Multiply and divide by \(${k}\): \(\dfrac{f(${a} + ${k}h) - ${fa}}{h} = ${k} \cdot \dfrac{f(${a} + ${k}h) - ${fa}}{${k}h}\).`, R`With \(u = ${k}h \to 0\), the last quotient tends to \(f'(${a}) = ${m}\).`], wrong: [frac(m, k), frac(m + k, 1)] },
    { expr: R`${hLim} \dfrac{${fa} - f(${a} + h)}{h}`, val: frac(-m, 1), g: (h) => (f(a) - f(a + h)) / h, how: [R`The numerator is the negative of the usual one: \(${fa} - f(${a} + h) = -\left[f(${a} + h) - ${fa}\right]\).`, R`So the limit is \(-f'(${a})\).`], wrong: [frac(1, m), frac(-1, m)] },
    { expr: R`${hLim} \dfrac{f(${a} + h) - f(${a} - h)}{h}`, val: frac(2 * m, 1), g: (h) => (f(a + h) - f(a - h)) / h, how: [R`Add and subtract \(${fa}\): the quotient is \(\dfrac{f(${a} + h) - ${fa}}{h} + \dfrac{f(${a} - h) - ${fa}}{-h}\).`, R`Each part tends to \(f'(${a}) = ${m}\).`], wrong: [frac(0, 1), frac(m, 2)] },
    { expr: R`${hLim} \dfrac{f(${a} + h) - ${fa}}{${k}h}`, val: frac(m, k), g: (h) => (f(a + h) - f(a)) / (k * h), how: [R`Factor out \(\frac{1}{${k}}\): the quotient is \(\dfrac{1}{${k}} \cdot \dfrac{f(${a} + h) - ${fa}}{h}\).`, R`The last quotient tends to \(f'(${a}) = ${m}\).`], wrong: [frac(k * m, 1), frac(m - k, 1)] },
    { expr: R`${lim(a)} \dfrac{f(x) - ${fa}}{x^{2} - ${a * a}}`, val: frac(m, 2 * a), g: (h) => (f(a + h) - f(a)) / ((a + h) ** 2 - a * a), how: [R`Factor the denominator: \(x^{2} - ${a * a} = (${linear(1, -a)})(${linear(1, a)})\), so the quotient is \(\dfrac{f(x) - ${fa}}{${linear(1, -a)}} \cdot \dfrac{1}{${linear(1, a)}}\).`, R`As \(x \to ${a}\): the first factor tends to \(f'(${a}) = ${m}\) and the second to \(\dfrac{1}{${2 * a}}\).`], wrong: [frac(m, a), frac(2 * a * m, 1)] },
    { expr: R`${hLim} \dfrac{f(${a} - h) - ${fa}}{h}`, val: frac(-m, 1), g: (h) => (f(a - h) - f(a)) / h, how: [R`Write the quotient as \(-\dfrac{f(${a} + (-h)) - ${fa}}{-h}\).`, R`With \(u = -h \to 0\), the quotient \(\dfrac{f(${a} + u) - ${fa}}{u}\) tends to \(f'(${a}) = ${m}\), so the limit is \(-${m < 0 ? `(${m})` : m}\).`], wrong: [frac(1, m), frac(2 * m, 1)] },
  ]);
  return q({
    prompt: R`Suppose \(f\) is differentiable and \(f'(${a}) = ${m}\). Find \(${v.expr}\).`,
    correct: v.val,
    wrong: [{ value: m, why: R`The expression is close to the definition of \(f'(${a})\), but not identical to it. Rewrite it so that the definition appears exactly.` }, ...v.wrong, { value: 'It cannot be determined', why: R`The limit can be rewritten in terms of \(f'(${a})\), which is given.` }],
    solution: [R`Compare with \(f'(${a}) = ${lim(0, 'h')} \dfrac{f(${a} + h) - ${fa}}{h}\).`, ...v.how, R`The limit is \(${v.val.tex()}\).`],
    rule: 1,
    skill: 'recognising a derivative',
    check: () => checkAll(...[1e-5, -1e-5].map((h) => checkEqual(v.g(h), v.val.value, 1e-3, 'limit'))),
  });
}

function challengeDifferentiableConstants(rng) {
  const p = rng.pick([-2, -1, 1, 2, 3]);
  const c = rng.nonzero(-3, 3);
  const r = rng.int(-5, 5);
  const a = 2 * p * c;
  const b = r - p * c * c;
  const f = (x, aa = a, bb = b) => (x <= c ? p * x * x + r : aa * x + bb);
  const pair = (u, v) => R`\(a = ${u},\ b = ${v}\)`;
  const h = 1e-6;
  return q({
    prompt: R`Find the constants \(a\) and \(b\) for which \(f(x) = ${cases([[terms([[p, 'x^{2}'], [r, '']]), `x \\le ${c}`], ['ax + b', `x > ${c}`]])}\) is differentiable at \(x = ${c}\).`,
    correct: pair(a, b),
    wrong: [
      { value: pair(a, r), why: R`The slopes match, but the pieces must also meet at \(x = ${c}\): a differentiable function is continuous.` },
      { value: pair(p * c, p * c * c + r - p * c * c), why: R`The slope of \(${terms([[p, 'x^{2}']])}\) at \(x = ${c}\) is \(${2 * p * c}\), not \(${p * c}\).` },
      pair(a, r + p * c * c),
      c !== 1 ? pair(2 * p, p * c * c + r - 2 * p * c) : pair(a + 1, b - c),
      pair(-a, b),
    ],
    solution: [
      R`Differentiable at \(x = ${c}\) requires two things: the pieces meet (continuity) and their slopes agree.`,
      R`Slopes: for \(${terms([[p, 'x^{2}'], [r, '']])}\) the slope at \(x = ${c}\) is \(${lim(0, 'h')} \frac{${p === 1 ? '' : p === -1 ? '-' : p}\left[(${c} + h)^{2} - ${c * c}\right]}{h} = ${a}\). The line has slope \(a\), so \(a = ${a}\).`,
      R`Heights: \(${subst([p, 0, r], c)} = ${p * c * c + r}\) must equal \(a(${c}) + b = ${a * c} + b\).`,
      R`So \(b = ${p * c * c + r} - ${a * c < 0 ? `(${a * c})` : a * c} = ${b}\).`,
    ],
    rule: 5,
    skill: 'differentiability',
    check: () => checkAll(Math.abs(f(c + 1e-9) - f(c)) < 1e-6 ? true : 'pieces do not meet', checkEqual((f(c + h) - f(c)) / h, (f(c) - f(c - h)) / h, 1e-4, 'one-sided slopes')),
  });
}

function challengeIsDifferentiable(rng) {
  const a = rng.int(-5, 5);
  const u = linear(1, -a);
  const U = a === 0 ? 'x' : `(${u})`;
  const fam = rng.pick([
    { tex: `|${u}|`, f: (x) => Math.abs(x - a), ans: 'corner', steps: [R`For \(h > 0\) the difference quotient is \(\dfrac{|h|}{h} = 1\); for \(h < 0\) it is \(-1\).`, 'The one-sided limits are different, so the derivative does not exist: the graph has a corner.'] },
    { tex: `${U}\\,|${u}|`, f: (x) => (x - a) * Math.abs(x - a), ans: 'zero', steps: [R`\(f(${a}) = 0\), so the difference quotient is \(\dfrac{h\,|h|}{h} = |h|\).`, R`\(|h| \to 0\) from both sides, so \(f'(${a}) = 0\).`] },
    { tex: `\\sqrt[3]{${u}}`, f: (x) => Math.cbrt(x - a), ans: 'vertical', steps: [R`\(f(${a}) = 0\), so the difference quotient is \(\dfrac{\sqrt[3]{h}}{h} = \dfrac{1}{h^{2/3}}\).`, R`As \(h \to 0\) this grows without bound: the tangent line is vertical and \(f'(${a})\) does not exist.`] },
    { tex: `|${u}| ${a > 0 ? '+ x -' : a < 0 ? '+ x +' : '+ x'} ${a === 0 ? '' : Math.abs(a)}`.trim(), f: (x) => Math.abs(x - a) + x - a, ans: 'corner', steps: [R`For \(x > ${a}\), \(f(x) = 2(${u})\) with slope 2. For \(x < ${a}\), \(f(x) = 0\) with slope 0.`, 'The one-sided slopes are different, so the derivative does not exist: the graph has a corner.'] },
    { tex: `${U}^{2} + ${rng.int(1, 9)}`, f: (x) => (x - a) ** 2, ans: 'zero', steps: [R`The difference quotient is \(\dfrac{h^{2}}{h} = h\).`, R`\(h \to 0\), so \(f'(${a}) = 0\): the graph has a horizontal tangent there.`] },
  ]);
  const choice = {
    zero: R`Yes, and \(f'(${a}) = 0\)`,
    one: R`Yes, and \(f'(${a}) = 1\)`,
    corner: 'No: the slopes from the left and from the right are different',
    vertical: R`No: the difference quotient is unbounded as \(h \to 0\)`,
    broken: R`No: \(f\) is not continuous at \(x = ${a}\)`,
  };
  const why = {
    broken: R`\(f\) is continuous at \(x = ${a}\). Continuity alone does not settle differentiability, so look at the difference quotient.`,
    one: fam.ans === 'corner' ? 'That is only the slope on one side.' : null,
    zero: fam.ans === 'corner' ? 'The graph has a corner there, not a horizontal tangent.' : fam.ans === 'vertical' ? 'The graph is vertical there, not horizontal.' : null,
    corner: fam.ans === 'zero' ? 'Both one-sided limits of the difference quotient are 0, so they agree.' : null,
  };
  const order = ['zero', 'corner', 'vertical', 'broken', 'one'].filter((k) => k !== fam.ans);
  const h = 1e-6;
  const left = (fam.f(a) - fam.f(a - h)) / h;
  const right = (fam.f(a + h) - fam.f(a)) / h;
  return q({
    prompt: R`Is \(f(x) = ${fam.tex}\) differentiable at \(x = ${a}\)?`,
    correct: choice[fam.ans],
    wrong: order.map((k) => (why[k] ? { value: choice[k], why: why[k] } : choice[k])),
    solution: [R`Use the definition: \(f'(${a}) = ${lim(0, 'h')} \dfrac{f(${a} + h) - f(${a})}{h}\), if this limit exists.`, ...fam.steps],
    rule: 5,
    skill: 'differentiability',
    check: () => {
      const kind = Math.abs(left) > 1e3 || Math.abs(right) > 1e3 ? 'vertical' : Math.abs(left - right) > 1e-3 ? 'corner' : Math.abs(left) < 1e-3 ? 'zero' : 'other';
      return kind === fam.ans ? true : `numeric one-sided slopes ${left}, ${right} suggest "${kind}"`;
    },
  });
}

const STATEMENT_BANK = [
  (rng) => {
    const a = rng.int(-6, 6);
    return {
      prompt: R`A function \(f\) is differentiable at \(x = ${a}\). Which statement must be true?`,
      correct: R`\(f\) is continuous at \(x = ${a}\)`,
      wrong: [{ value: R`\(f'(${a}) = 0\)`, why: 'Differentiable means the derivative exists. It can be any number.' }, { value: R`\(f(${a}) = f'(${a})\)`, why: 'The height of the graph and its slope are unrelated numbers.' }, R`\(f\) is increasing near \(x = ${a}\)`],
      solution: [R`If \(f'(${a})\) exists, then \(f(x) - f(${a}) = \dfrac{f(x) - f(${a})}{x - ${a < 0 ? `(${a})` : a}} \cdot (x - ${a < 0 ? `(${a})` : a}) \to f'(${a}) \cdot 0 = 0\) as \(x \to ${a}\).`, R`So \(f(x) \to f(${a})\): differentiability at a point forces continuity there.`],
    };
  },
  (rng) => {
    const a = rng.int(-6, 6);
    return {
      prompt: R`A function \(f\) is continuous at \(x = ${a}\). Which statement must be true?`,
      correct: R`\(${lim(a)} f(x) = f(${a})\)`,
      wrong: [{ value: R`\(f\) is differentiable at \(x = ${a}\)`, why: R`Continuity does not guarantee a derivative: \(|${linear(1, -a)}|\) is continuous at \(x = ${a}\) but has a corner there.` }, { value: R`\(f'(${a}) = 0\)`, why: 'Continuity says nothing about the slope, or even whether a slope exists.' }, R`The graph of \(f\) has a tangent line at \(x = ${a}\)`],
      solution: [R`Continuity at \(x = ${a}\) means exactly that \(${lim(a)} f(x) = f(${a})\).`, R`It does not imply differentiability: \(|${linear(1, -a)}|\) is continuous at \(x = ${a}\) but not differentiable there.`],
    };
  },
  (rng) => {
    const a = rng.int(-6, 6);
    return {
      prompt: R`A function \(f\) is not continuous at \(x = ${a}\). What can be concluded?`,
      correct: R`\(f\) is not differentiable at \(x = ${a}\)`,
      wrong: [{ value: R`\(f\) may or may not be differentiable at \(x = ${a}\)`, why: 'Differentiable implies continuous, so a function that is not continuous at a point cannot be differentiable there.' }, { value: R`\(${lim(a)} f(x)\) does not exist`, why: 'The limit may exist: at a removable discontinuity it does, and continuity fails only because the value does not match.' }, R`\(f(${a})\) is not defined`],
      solution: ['Differentiability at a point implies continuity at that point.', R`Turn that around (the contrapositive): if \(f\) is not continuous at \(x = ${a}\), it cannot be differentiable there.`],
    };
  },
  (rng) => {
    const a = rng.int(-6, 6);
    return {
      prompt: R`The graph of \(f\) is unbroken at \(x = ${a}\) but has a sharp corner there. Which statement is true?`,
      correct: R`\(f\) is continuous at \(x = ${a}\) but not differentiable there`,
      wrong: [{ value: R`\(f\) is differentiable at \(x = ${a}\) but not continuous there`, why: 'That can never happen: a differentiable function is always continuous.' }, { value: R`\(f\) is both continuous and differentiable at \(x = ${a}\)`, why: 'At a corner the slopes from the two sides differ, so there is no single tangent slope.' }, R`\(f\) is neither continuous nor differentiable at \(x = ${a}\)`],
      solution: ['An unbroken graph means the function is continuous there.', 'At a sharp corner the left-hand and right-hand slopes are different, so the limit of the difference quotient does not exist.'],
    };
  },
  (rng) => {
    const a = rng.int(-6, 6);
    const m = rng.nonzero(-9, 9);
    return {
      prompt: R`The limit \(${lim(0, 'h')} \dfrac{f(${a} + h) - f(${a})}{h}\) exists and equals \(${m}\). Which statement must be true?`,
      correct: R`\(f\) is continuous at \(x = ${a}\), and the tangent line there has slope \(${m}\)`,
      wrong: [{ value: R`\(f(${a}) = ${m}\)`, why: R`The limit is the slope \(f'(${a})\), not the height \(f(${a})\).` }, { value: R`\(${lim(a)} f(x) = ${m}\)`, why: R`\(${lim(a)} f(x)\) equals \(f(${a})\), which is not given. The number \(${m}\) is a slope.` }, R`\(f(x) = ${terms([[m, 'x']])}\) for all \(x\)`],
      solution: [R`The limit is the definition of \(f'(${a})\), so \(f'(${a}) = ${m}\): the tangent line at \(x = ${a}\) has slope \(${m}\).`, R`Because \(f\) is differentiable at \(x = ${a}\), it is also continuous there.`],
    };
  },
  (rng) => {
    const a = rng.int(-6, 6);
    return {
      prompt: R`Which statement about a function \(f\) and the number \(${a}\) is always true?`,
      correct: R`If \(f\) is differentiable at \(x = ${a}\), then \(f\) is continuous at \(x = ${a}\)`,
      wrong: [{ value: R`If \(f\) is continuous at \(x = ${a}\), then \(f\) is differentiable at \(x = ${a}\)`, why: R`\(|${linear(1, -a)}|\) is continuous at \(x = ${a}\) but not differentiable there.` }, { value: R`If \(f\) is not differentiable at \(x = ${a}\), then \(f\) is not continuous at \(x = ${a}\)`, why: R`\(|${linear(1, -a)}|\) is not differentiable at \(x = ${a}\), yet it is continuous there.` }, R`If \(f(${a})\) is defined, then \(f\) is continuous at \(x = ${a}\)`],
      solution: ['Differentiable implies continuous: this is a theorem.', R`The converse fails: \(|${linear(1, -a)}|\) is continuous at \(x = ${a}\) but has a corner there.`],
    };
  },
];

function challengeStatements(rng) {
  return fromBank(rng, STATEMENT_BANK, { rule: 5, skill: 'differentiability and continuity' });
}

// ───────────── Topic ─────────────

export default {
  id: 'derivative-definition',
  title: 'The Derivative as a Limit',
  summary: 'Go from average to instantaneous rate of change, and find and interpret derivatives with the limit definition.',
  standards: ['AP Calculus 2.1', 'AP Calculus 2.2', 'AP Calculus 2.3', 'AP Calculus 2.4'],

  explain: {
    intro: R`How fast is something changing at one instant? Over an interval we can divide the change in output by the change in input, but at a single instant both changes are 0. The way out is a limit: compute average rates over shorter and shorter intervals and see what they approach. That limit is the derivative.`,
    rules: [
      {
        title: 'Average rate of change',
        text: R`The average rate of change of \(f\) on \([a, b]\) is \(\dfrac{f(b) - f(a)}{b - a}\): change in output divided by change in input. It is the slope of the **secant line** through \((a, f(a))\) and \((b, f(b))\).`,
        example: R`For \(f(x) = x^{2}\) on \([1, 3]\): \(\dfrac{9 - 1}{3 - 1} = 4\).`,
      },
      {
        title: 'The derivative at a point',
        text: R`The instantaneous rate of change of \(f\) at \(x = a\) is \(f'(a) = \lim\limits_{h \to 0} \dfrac{f(a + h) - f(a)}{h}\), which can also be written \(f'(a) = \lim\limits_{x \to a} \dfrac{f(x) - f(a)}{x - a}\). It is the slope of the **tangent line** at \((a, f(a))\): the limit of secant slopes as the second point slides toward the first. In the graph, the solid line through two points of the curve is a secant line, and the dashed line is the tangent line at the first point.`,
        example: R`For \(f(x) = x^{2}\): \(f'(1) = \lim\limits_{h \to 0} \dfrac{(1 + h)^{2} - 1}{h} = \lim\limits_{h \to 0} (2 + h) = 2\).`,
      },
      {
        title: 'Using the definition: four steps',
        text: R`(1) Write \(f(a + h)\). (2) Subtract \(f(a)\) and simplify; every term without \(h\) should cancel. (3) Divide by \(h\). (4) Let \(h \to 0\). Step 2 is algebra: expand powers, combine fractions, or multiply by a conjugate.`,
        example: R`\(f(x) = \dfrac{1}{x}\) at \(a = 2\): \(\dfrac{1}{2 + h} - \dfrac{1}{2} = \dfrac{-h}{2(2 + h)}\); divide by \(h\) to get \(\dfrac{-1}{2(2 + h)}\); let \(h \to 0\): \(f'(2) = -\dfrac{1}{4}\).`,
      },
      {
        title: 'The derivative as a function',
        text: R`Leaving \(x\) general gives a new function: \(f'(x) = \lim\limits_{h \to 0} \dfrac{f(x + h) - f(x)}{h}\). Other notations are \(\dfrac{dy}{dx}\) and \(\dfrac{d}{dx}f(x)\). The units of \(f'\) are units of \(f\) per unit of \(x\).`,
        example: R`For \(f(x) = x^{2}\): \(\dfrac{(x + h)^{2} - x^{2}}{h} = 2x + h \to 2x\), so \(f'(x) = 2x\).`,
      },
      {
        title: 'Estimating a derivative from data or a graph',
        text: R`From a table, use a difference quotient over the shortest interval available around the point, ideally with the point in the middle: \(f'(a) \approx \dfrac{f(a + h) - f(a - h)}{2h}\). From a graph, draw the tangent line and find its slope from two points on it.`,
        example: R`If \(f(1.9) = 3.2\) and \(f(2.1) = 3.8\), then \(f'(2) \approx \dfrac{3.8 - 3.2}{0.2} = 3\).`,
      },
      {
        title: 'When the derivative does not exist',
        text: R`\(f\) is not differentiable at \(a\) if the graph has a **corner** or **cusp** there (the one-sided slopes differ), a **vertical tangent** (the difference quotient is unbounded), or a **discontinuity**. If \(f\) is differentiable at \(a\), then \(f\) is continuous at \(a\). The converse is false: a continuous function need not be differentiable.`,
        example: R`\(f(x) = |x|\) is continuous at 0, but \(\dfrac{|h|}{h}\) is \(1\) for \(h > 0\) and \(-1\) for \(h < 0\), so \(f'(0)\) does not exist.`,
      },
    ],
    vocab: [
      { term: 'secant line', def: 'The line through two points of a graph. Its slope is an average rate of change.' },
      { term: 'tangent line', def: R`The line through \((a, f(a))\) with slope \(f'(a)\): the limiting position of secant lines.` },
      { term: 'difference quotient', def: R`\(\dfrac{f(a + h) - f(a)}{h}\): the average rate of change of \(f\) between \(a\) and \(a + h\).` },
      { term: 'derivative', def: R`The limit of the difference quotient as \(h \to 0\): the instantaneous rate of change, written \(f'(a)\).` },
      { term: 'differentiable', def: R`\(f\) is differentiable at \(a\) if \(f'(a)\) exists.` },
    ],
    mistakes: [
      R`Writing \(f(a + h)\) as \(f(a) + h\). Substitute \(a + h\) for every \(x\) in the formula.`,
      R`Expanding \((a + h)^{2}\) as \(a^{2} + h^{2}\). The middle term \(2ah\) is the one that survives in the derivative.`,
      R`Setting \(h = 0\) before dividing by \(h\). That gives \(\frac{0}{0}\); cancel \(h\) first.`,
      R`Reporting a secant slope (an average rate) when the question asks for the rate at an instant.`,
      R`Assuming a continuous function must be differentiable. Corners, cusps and vertical tangents are counterexamples.`,
    ],
    visual: {
      type: 'plot',
      x: [-1, 4],
      y: [-1, 6],
      step: [1, 1],
      fns: [{ f: (x) => 0.5 * x * x }, { f: (x) => 2 * x - 1.5, color: 'b' }, { f: (x) => x - 0.5, color: 'c', dashed: true }],
      points: [{ x: 1, y: 0.5 }, { x: 3, y: 4.5, color: 'b' }],
      alt: 'Graph of a curve with two lines through the point (a, f(a)). The secant line also passes through a second point (a + h, f(a + h)) of the curve. The dashed tangent line touches the curve only at (a, f(a)). As h shrinks, the secant line turns toward the tangent line.',
    },
  },

  examples: [
    {
      title: 'Average rate of change',
      problem: R`Find the average rate of change of \(f(x) = x^{2} - 3x\) on \([1, 4]\).`,
      steps: [
        R`\(f(4) = 16 - 12 = 4\) and \(f(1) = 1 - 3 = -2\).`,
        R`\(\dfrac{f(4) - f(1)}{4 - 1} = \dfrac{4 - (-2)}{3} = \dfrac{6}{3}\).`,
      ],
      answer: R`\(2\). The secant line through \((1, -2)\) and \((4, 4)\) has slope 2.`,
    },
    {
      title: 'A derivative from the definition',
      problem: R`Use the definition to find \(f'(3)\) for \(f(x) = x^{2} + 2x\).`,
      steps: [
        R`\(f(3 + h) = (3 + h)^{2} + 2(3 + h) = 9 + 6h + h^{2} + 6 + 2h = 15 + 8h + h^{2}\).`,
        R`Subtract \(f(3) = 15\): \(f(3 + h) - f(3) = 8h + h^{2}\).`,
        R`Divide by \(h\): \(8 + h\).`,
        R`Let \(h \to 0\): the limit is \(8\).`,
      ],
      answer: R`\(f'(3) = 8\)`,
    },
    {
      title: 'The derivative function',
      problem: R`Use the definition to find \(f'(x)\) for \(f(x) = \sqrt{x}\) (with \(x > 0\)).`,
      steps: [
        R`Difference quotient: \(\dfrac{\sqrt{x + h} - \sqrt{x}}{h}\).`,
        R`Multiply the top and the bottom by the conjugate \(\sqrt{x + h} + \sqrt{x}\): the numerator becomes \((x + h) - x = h\).`,
        R`Cancel \(h\): \(\dfrac{1}{\sqrt{x + h} + \sqrt{x}}\).`,
        R`Let \(h \to 0\): \(\dfrac{1}{\sqrt{x} + \sqrt{x}}\).`,
      ],
      answer: R`\(f'(x) = \dfrac{1}{2\sqrt{x}}\)`,
    },
    {
      title: 'Recognising a limit as a derivative',
      problem: R`The limit \(\lim\limits_{h \to 0} \dfrac{(2 + h)^{3} - 8}{h}\) is the derivative of some function \(f\) at some number \(a\). Find \(f\) and \(a\), then evaluate the limit.`,
      steps: [
        R`Compare with \(\dfrac{f(a + h) - f(a)}{h}\): \(f(a + h) = (2 + h)^{3}\) and \(f(a) = 8 = 2^{3}\).`,
        R`So \(f(x) = x^{3}\) and \(a = 2\): the limit is \(f'(2)\).`,
        R`Expand: \((2 + h)^{3} - 8 = 12h + 6h^{2} + h^{3}\). Divide by \(h\): \(12 + 6h + h^{2}\).`,
        R`Let \(h \to 0\).`,
      ],
      answer: R`\(f(x) = x^{3}\), \(a = 2\), and the limit is \(f'(2) = 12\).`,
    },
    {
      title: 'Word problem: speed from a table',
      word: true,
      problem: R`A sensor records the distance \(s\), in meters, that a cart has rolled down a ramp after \(t\) seconds. Estimate the cart's speed at \(t = 2\) seconds, and say what the answer means.`,
      steps: [
        R`Speed at an instant is the derivative \(s'(2)\). With only a table, estimate it by an average rate over a short interval with \(t = 2\) in the middle.`,
        R`Use \(t = 1.5\) and \(t = 2.5\): \(s'(2) \approx \dfrac{s(2.5) - s(1.5)}{2.5 - 1.5} = \dfrac{7.5 - 2.7}{1}\).`,
        R`\(s'(2) \approx 4.8\). The units are meters per second.`,
      ],
      answer: 'About 4.8 m/s: two seconds after release, the cart is covering distance at roughly 4.8 meters each second.',
      visual: rowTable(['t', 's'], [[1, 1.2], [1.5, 2.7], [2, 4.8], [2.5, 7.5], [3, 10.8]], 'Table of the distance s in meters at time t in seconds: at t = 1, s = 1.2; at t = 1.5, s = 2.7; at t = 2, s = 4.8; at t = 2.5, s = 7.5; at t = 3, s = 10.8.'),
    },
  ],

  models: [
    {
      id: 'secant-to-tangent',
      title: 'From secant slope to tangent slope',
      intro: R`\(f(x) = ax^{2} + bx\). Choose the function, the point \(p\) and the step \(h\). Make \(h\) smaller and watch the secant slope approach the tangent slope.`,
      inputs: [
        { name: 'a', label: 'a (x² coefficient)', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'b', label: 'b (x coefficient)', type: 'int', min: -5, max: 5, value: 0 },
        { name: 'p', label: 'p (the point)', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'h', label: 'h (the step)', type: 'number', min: -2, max: 2, step: 0.1, value: 1 },
      ],
      compute({ a, b, p, h }) {
        if (Math.abs(h) < 1e-9) return { error: 'The step h cannot be 0: a secant line needs two different points. Try a small value such as 0.1.' };
        const f = (x) => a * x * x + b * x;
        const m = 2 * a * p + b;
        const sec = round((f(p + h) - f(p)) / h, 4);
        const x2 = round(p + h, 4);
        return {
          problem: R`For \(f(x) = ${terms([[a, 'x^{2}'], [b, 'x']])}\), find the slope of the secant line through \(x = ${p}\) and \(x = ${num(x2)}\), and the slope of the tangent line at \(x = ${p}\).`,
          steps: [
            R`\(f(${p}) = ${f(p)}\) and \(f(${num(x2)}) = ${num(round(f(x2), 4))}\).`,
            R`Secant slope: \(\dfrac{f(${num(x2)}) - f(${p})}{${num(h)}} = \dfrac{${num(round(f(x2) - f(p), 4))}}{${num(h)}} = ${num(sec)}\).`,
            R`With \(h\) left as a letter: \(\dfrac{f(${p} + h) - f(${p})}{h} = ${terms([[m, ''], [a, 'h']])}\) after expanding, cancelling and dividing by \(h\).`,
            R`Let \(h \to 0\): the secant slopes approach \(f'(${p}) = ${m}\), the slope of the tangent line.`,
          ],
          answer: R`Secant slope with \(h = ${num(h)}\): \(${num(sec)}\). Tangent slope: \(f'(${p}) = ${m}\).`,
          visual: {
            type: 'plot',
            ...fit(f, p - 3, p + 3, { include: [f(p)] }),
            fns: [{ f }, { f: (x) => f(p) + sec * (x - p), color: 'b' }, { f: (x) => f(p) + m * (x - p), color: 'c', dashed: true }],
            points: [{ x: p, y: f(p) }, { x: x2, y: f(x2), color: 'b' }],
            alt: `Graph of f with the secant line through x = ${txt(p)} and x = ${txt(x2)} (slope ${txt(sec)}) and the dashed tangent line at x = ${txt(p)} (slope ${txt(m)}).`,
          },
        };
      },
    },
    {
      id: 'falling-rock',
      title: 'Word problem: average and instantaneous velocity',
      word: true,
      intro: 'A rock is dropped from a cliff. Choose a moment and a time interval that starts there.',
      inputs: [
        { name: 't', label: 'Starting time (seconds)', type: 'number', min: 0, max: 5, step: 0.5, value: 2 },
        { name: 'dt', label: 'Length of the interval (seconds)', type: 'number', min: 0.1, max: 3, step: 0.1, value: 1 },
      ],
      compute({ t, dt }) {
        const s = (x) => 16 * x * x;
        const t2 = round(t + dt, 4);
        const avg = round((s(t2) - s(t)) / dt, 4);
        const inst = 32 * t;
        return {
          problem: R`A rock dropped from a cliff has fallen \(s(t) = 16t^{2}\) feet after \(t\) seconds. Find its average velocity from \(t = ${num(t)}\) to \(t = ${num(t2)}\), and its velocity at the instant \(t = ${num(t)}\).`,
          steps: [
            R`\(s(${num(t)}) = ${num(s(t))}\) ft and \(s(${num(t2)}) = ${num(round(s(t2), 4))}\) ft.`,
            R`Average velocity: \(\dfrac{${num(round(s(t2), 4))} - ${num(s(t))}}{${num(dt)}} = ${num(avg)}\) ft/s.`,
            R`For an interval of any length \(h\): \(\dfrac{16(${num(t)} + h)^{2} - 16(${num(t)})^{2}}{h} = ${num(inst)} + 16h\).`,
            R`Let \(h \to 0\): the instantaneous velocity is \(${num(inst)}\) ft/s.`,
          ],
          answer: R`Average velocity \(${num(avg)}\) ft/s; instantaneous velocity at \(t = ${num(t)}\): \(${num(inst)}\) ft/s.`,
          visual: {
            type: 'plot',
            x: [0, t2 + 1],
            y: [0, s(t2 + 1) * 1.05],
            fns: [{ f: s }, { f: (x) => s(t) + avg * (x - t), color: 'b' }, { f: (x) => s(t) + inst * (x - t), color: 'c', dashed: true }],
            points: [{ x: t, y: s(t) }, { x: t2, y: s(t2), color: 'b' }],
            axisLabels: ['t (s)', 's (ft)'],
            alt: `Graph of the distance fallen, s = 16t², with the secant line from t = ${txt(t)} to t = ${txt(t2)} (slope ${txt(avg)}, the average velocity) and the dashed tangent line at t = ${txt(t)} (slope ${txt(inst)}, the instantaneous velocity).`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyAverageRate, easyAverageTable, easyMeaning, easySlopeFromGraph],
    medium: [mediumDifferenceQuotient, mediumDerivAtPoint, mediumRecognise, mediumTableEstimate, mediumShrinking],
    hard: [hardReciprocalRoot, hardQuotientCubic, hardPiecewiseDiff, hardGraphNotDiff, hardVelocity],
    challenge: [challengeDisguisedLimit, challengeDifferentiableConstants, challengeIsDifferentiable, challengeStatements],
  },
};
