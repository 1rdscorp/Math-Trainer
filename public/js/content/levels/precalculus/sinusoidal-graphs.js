import { R, q, frac, num, txt, round, checkEqual } from '../../lib/index.js';
import { M, piTex, piText } from './_shared.js';

const TRIGF = { sin: Math.sin, cos: Math.cos };
const lead = (a) => (a === 1 ? '' : a === -1 ? '-' : num(a));
const shift = (k) => (k ? ` ${k > 0 ? '+' : '-'} ${num(Math.abs(k))}` : '');
// bx as LaTeX for b = bn/bd: "x", "2x", "\frac{x}{2}".
const bx = (bn, bd, x = 'x') => (bd === 1 ? `${bn === 1 ? '' : bn}${x}` : R`\frac{${bn === 1 ? '' : bn}${x}}{${bd}}`);
const same = (f, g) => [0.3, 1.1, 2.6, 4.2, 5.9].every((x) => Math.abs(f(x) - g(x)) < 1e-9);

/**
 * The sinusoid y = a·fn(b(x − h)) + k with b = bn/bd and h = (hn/hd)·π: its function, LaTeX and features.
 */
function wave({ fn, a, bn = 1, bd = 1, hn = 0, hd = 1, k = 0 }) {
  const b = bn / bd;
  const h = (hn / hd) * Math.PI;
  const moved = `x ${hn > 0 ? '-' : '+'} ${piTex(Math.abs(hn), hd)}`;
  const inner = hn === 0 ? bx(bn, bd) : b === 1 ? moved : `${bd === 1 ? bn : R`\frac{${bn}}{${bd}}`}\\left(${moved}\\right)`;
  const arg = hn === 0 && bd === 1 ? ` ${inner}` : `\\left(${inner}\\right)`;
  return {
    f: (x) => a * TRIGF[fn](b * (x - h)) + k,
    tex: `y = ${lead(a)}\\${fn}${arg}${shift(k)}`,
    period: [2 * bd, bn], // as a multiple of π
    amp: Math.abs(a),
    max: k + Math.abs(a),
    min: k - Math.abs(a),
    fn, a, bn, bd, hn, hd, k,
  };
}
const periodOf = (w) => (w.period[0] / w.period[1]) * Math.PI;
// x-position (as [n, d] multiples of π) of the first maximum and minimum at or after the start of the cycle.
function extremes(w) {
  const [pn, pd] = w.period;
  const quarter = (j) => { const fr = frac(pn * j, pd * 4).add(frac(w.hn, w.hd)); return [fr.n, fr.d]; };
  const up = w.fn === 'sin' ? (w.a > 0 ? 1 : 3) : w.a > 0 ? 0 : 2;
  return { maxAt: quarter(up), minAt: quarter((up + 2) % 4) };
}
function wavePlot(w, { xMax, alt, label = true }) {
  const { maxAt, minAt } = extremes(w);
  const at = ([n, d]) => (n / d) * Math.PI;
  return {
    type: 'plot',
    x: [0, xMax],
    y: [Math.min(w.min, 0) - 1, Math.max(w.max, 0) + 1],
    piTicks: true,
    fns: [{ f: w.f }],
    points: [
      { x: at(maxAt), y: w.max, label: label ? `(${piText(...maxAt)}, ${txt(w.max)})` : undefined },
      { x: at(minAt), y: w.min, label: label ? `(${piText(...minAt)}, ${txt(w.min)})` : undefined, color: 'b' },
    ],
    alt: alt ?? `Graph of a wave. Its highest points are at height ${txt(w.max)} and its lowest points at height ${txt(w.min)}. One maximum is at x = ${piText(...maxAt)} and the nearest minimum is at x = ${piText(...minAt)}. At x = 0 the height is ${txt(round(w.f(0), 2))}.`,
  };
}
const randomWave = (rng, opts = {}) => {
  const [bn, bd] = rng.pick(opts.bs ?? [[1, 1], [2, 1], [1, 2]]);
  return wave({ fn: rng.pick(['sin', 'cos']), a: rng.int(opts.aMin ?? 1, 4) * rng.sign(), bn, bd, k: rng.int(-2, 3) });
};

// ───────────── Easy ─────────────

function easyAmplitudeMidline(rng) {
  const [bn, bd] = rng.pick([[1, 1], [2, 1], [3, 1], [1, 2], [4, 1]]);
  const w = wave({ fn: rng.pick(['sin', 'cos']), a: rng.int(2, 7) * rng.sign(), bn, bd, k: rng.nonzero(-6, 8) });
  const kind = rng.pick(['amplitude', 'midline', 'max', 'min']);
  const sampled = () => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i <= 4000; i++) {
      const v = w.f((i / 4000) * periodOf(w));
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return [lo, hi];
  };
  const base = { rule: 0, check: () => { const [lo, hi] = sampled(); return Math.abs(hi - w.max) < 1e-4 && Math.abs(lo - w.min) < 1e-4 ? true : 'extremes do not match'; } };
  if (kind === 'amplitude') {
    return q({
      ...base,
      prompt: R`What is the amplitude of \(${w.tex}\)?`,
      correct: w.amp,
      wrong: [
        w.a < 0 ? { value: w.a, why: R`Amplitude is a distance, so it is never negative: it is \(|${w.a}|\).` } : { value: 2 * w.amp, why: 'That is the full height from minimum to maximum. The amplitude is half of it.' },
        { value: w.k, why: R`\(${w.k}\) is the vertical shift, which sets the midline.` },
        { value: w.max, why: 'That is the maximum value. Amplitude is measured from the midline, not from zero.' },
        w.amp + 1,
        2 * w.amp,
      ],
      solution: [R`In \(y = a\sin(bx) + k\) or \(y = a\cos(bx) + k\), the amplitude is \(|a|\).`, R`Here \(a = ${w.a}\), so the amplitude is \(${w.amp}\).`],
      skill: 'amplitude',
    });
  }
  if (kind === 'midline') {
    return q({
      ...base,
      prompt: R`What is the midline of \(${w.tex}\)?`,
      correct: R`\(y = ${w.k}\)`,
      wrong: [
        { value: R`\(y = ${w.a}\)`, why: R`\(${w.a}\) multiplies the function: it sets the amplitude. The midline comes from the number added at the end.` },
        { value: R`\(x = ${w.k}\)`, why: R`The midline is a horizontal line, so its equation is \(y = \text{constant}\).` },
        R`\(y = ${-w.k}\)`,
        R`\(y = 0\)`,
      ],
      solution: [R`The graph of \(\sin\) or \(\cos\) is centred on \(y = 0\). Adding \(k\) moves the whole graph, and its centre line, to \(y = k\).`, R`Here \(k = ${w.k}\), so the midline is \(y = ${w.k}\).`],
      skill: 'midline',
    });
  }
  const isMax = kind === 'max';
  const ans = isMax ? w.max : w.min;
  return q({
    ...base,
    prompt: R`What is the ${isMax ? 'maximum' : 'minimum'} value of \(${w.tex}\)?`,
    correct: ans,
    wrong: [
      { value: isMax ? w.min : w.max, why: `That is the ${isMax ? 'minimum' : 'maximum'} value.` },
      { value: isMax ? w.amp : -w.amp, why: R`That would be right with no vertical shift. The whole graph is moved ${w.k > 0 ? 'up' : 'down'} by \(${Math.abs(w.k)}\).` },
      w.k + w.a === ans ? w.k : w.k + w.a,
      w.k,
      ans + (isMax ? 1 : -1),
    ],
    solution: [
      R`\(\sin\) and \(\cos\) take values from \(-1\) to \(1\), so \(${lead(w.a)}${T(w.fn)}(\dots)\) takes values from \(${-w.amp}\) to \(${w.amp}\).`,
      R`Adding \(${w.k < 0 ? `(${w.k})` : w.k}\) moves that range to \([${w.min}, ${w.max}]\): midline \(${w.k}\) ${isMax ? 'plus' : 'minus'} amplitude \(${w.amp}\).`,
      R`The ${isMax ? 'maximum' : 'minimum'} value is \(${ans}\).`,
    ],
    skill: 'range of a sinusoid',
  });
}
function T(name) { return `\\${name}`; }

function easyPeriod(rng) {
  const a = rng.int(2, 6) * rng.sign();
  const fn = rng.pick(['sin', 'cos']);
  const k = rng.int(-3, 3);
  if (rng.bool(0.55)) {
    const [bn, bd] = rng.pick([[2, 1], [3, 1], [4, 1], [6, 1], [1, 2], [1, 3], [1, 4], [2, 3], [3, 2]]);
    const w = wave({ fn, a, bn, bd, k });
    return q({
      prompt: R`What is the period of \(${w.tex}\)?`,
      correct: M(piTex(2 * bd, bn)),
      wrong: [
        { value: M(piTex(bd, bn)), why: R`\(\frac{\pi}{b}\) is the period of tangent. For sine and cosine the period is \(\frac{2\pi}{b}\).` },
        { value: M(piTex(2 * bn, bd)), why: R`Divide \(2\pi\) by \(b\). A larger \(b\) squeezes the graph, making the period shorter.` },
        M(piTex(2)),
        M(piTex(bn, bd)),
        M(piTex(4 * bd, bn)),
      ],
      solution: [R`The period of \(\sin(bx)\) and \(\cos(bx)\) is \(\dfrac{2\pi}{b}\).`, R`Here \(b = ${frac(bn, bd).tex()}\), so the period is \(\dfrac{2\pi}{${frac(bn, bd).tex()}} = ${piTex(2 * bd, bn)}\).`],
      rule: 1,
      skill: 'period',
      check: () => (same(w.f, (x) => w.f(x + periodOf(w))) && !same(w.f, (x) => w.f(x + periodOf(w) / 2)) ? true : 'period is wrong'),
    });
  }
  const n = rng.pick([1, 2, 3, 4, 5, 6, 12]);
  const half = rng.bool(0.25);
  const P = half ? n : 2 * n; // b = 2π/n gives period n; b = π/n gives period 2n
  const bTex = half ? (n === 1 ? R`2\pi x` : R`\frac{2\pi}{${n}}x`) : n === 1 ? R`\pi x` : R`\frac{\pi}{${n}}x`;
  const f = (x) => a * TRIGF[fn]((2 * Math.PI * x) / P) + k;
  return q({
    prompt: R`What is the period of \(y = ${lead(a)}${T(fn)}\left(${bTex}\right)${shift(k)}\)?`,
    correct: M(String(P)),
    wrong: [
      { value: M(String(half ? 2 * n : n)), why: R`Divide \(2\pi\) by \(b\), and keep track of the factor 2.` },
      { value: M(piTex(2)), why: R`\(2\pi\) is the period only when \(b = 1\). Here \(b = ${half ? piTex(2, n) : piTex(1, n)}\).` },
      { value: M(half ? piTex(2, n) : piTex(1, n)), why: R`That is \(b\) itself. The period is \(\frac{2\pi}{b}\).` },
      M(String(4 * n)),
      M(piTex(P)),
    ],
    solution: [R`The period is \(\dfrac{2\pi}{b}\) with \(b = ${half ? piTex(2, n) : piTex(1, n)}\).`, R`\(2\pi \div ${half ? piTex(2, n) : piTex(1, n)} = ${P}\). The \(\pi\) cancels, so the period is a plain number: \(${P}\).`],
    rule: 1,
    skill: 'period',
    check: () => (same(f, (x) => f(x + P)) && !same(f, (x) => f(x + P / 2)) ? true : 'period is wrong'),
  });
}

function easyGraphFeatures(rng) {
  const w = randomWave(rng);
  const kind = rng.pick(['amplitude', 'midline', 'period']);
  const visual = wavePlot(w, { xMax: w.bd === 2 ? 4 * Math.PI : 2 * Math.PI });
  const key = `graph-features-${kind}-${w.fn}-${w.a}-${w.bn}-${w.bd}-${w.k}`;
  const [pn, pd] = w.period;
  if (kind === 'amplitude') {
    return q({
      prompt: 'The graph shows a sinusoidal function. What is its amplitude?',
      visual,
      key,
      correct: w.amp,
      wrong: [
        { value: w.max - w.min, why: 'That is the full height from the lowest point to the highest. The amplitude is half of that.' },
        w.k !== 0 ? { value: Math.abs(w.max) === w.amp ? Math.abs(w.min) : Math.abs(w.max), why: 'Measure from the midline, not from the x-axis.' } : null,
        w.amp + 1,
        w.amp + 2,
        w.amp / 2,
      ],
      solution: [R`Read the highest and lowest values: \(${w.max}\) and \(${w.min}\).`, R`Amplitude \(= \dfrac{\text{max} - \text{min}}{2} = \dfrac{${w.max} - ${w.min < 0 ? `(${w.min})` : w.min}}{2} = ${w.amp}\).`],
      rule: 3,
      skill: 'reading a sinusoidal graph',
      check: () => checkEqual((w.max - w.min) / 2, Math.abs(w.a)),
    });
  }
  if (kind === 'midline') {
    return q({
      prompt: 'The graph shows a sinusoidal function. What is its midline?',
      visual,
      key,
      correct: R`\(y = ${w.k}\)`,
      wrong: [
        { value: R`\(y = ${w.max}\)`, why: 'That is the height of the maxima. The midline is halfway between the maxima and the minima.' },
        R`\(y = ${w.min}\)`,
        w.k !== 0 ? { value: R`\(y = 0\)`, why: 'This graph is not centred on the x-axis. Average the maximum and minimum heights.' } : R`\(y = ${w.amp}\)`,
        R`\(y = ${w.k + 1}\)`,
        R`\(y = ${w.k - 1}\)`,
        R`\(y = ${w.k + 2}\)`,
      ],
      solution: [R`Read the highest and lowest values: \(${w.max}\) and \(${w.min}\).`, R`The midline is halfway between them: \(y = \dfrac{${w.max} + ${w.min < 0 ? `(${w.min})` : w.min}}{2} = ${w.k}\).`],
      rule: 3,
      skill: 'reading a sinusoidal graph',
      check: () => checkEqual((w.max + w.min) / 2, w.k),
    });
  }
  const { maxAt, minAt } = extremes(w);
  return q({
    prompt: 'The graph shows a sinusoidal function. What is its period?',
    visual,
    key,
    correct: M(piTex(pn, pd)),
    wrong: [
      { value: M(piTex(pn, 2 * pd)), why: 'The distance from a maximum to the nearest minimum is only half a cycle.' },
      M(piTex(2 * pn, pd)),
      M(piTex(pn, 4 * pd)),
      M(piTex(3 * pn, 2 * pd)),
    ],
    solution: [
      R`A maximum is at \(x = ${piTex(...maxAt)}\) and the nearest minimum is at \(x = ${piTex(...minAt)}\). They are half a period apart.`,
      R`Half a period is \(${piTex(pn, 2 * pd)}\), so the period is \(${piTex(pn, pd)}\).`,
    ],
    rule: 3,
    skill: 'reading a sinusoidal graph',
    check: () => (same(w.f, (x) => w.f(x + periodOf(w))) && Math.abs(Math.abs(maxAt[0] / maxAt[1] - minAt[0] / minAt[1]) - pn / pd / 2) < 1e-9 ? true : 'period is wrong'),
  });
}

// ───────────── Medium ─────────────

function mediumPhaseShift(rng) {
  const b = rng.int(2, 4);
  const [hn, hd] = rng.pick([[1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [1, 12], [2, 3], [3, 4]]);
  const right = rng.bool();
  const fn = rng.pick(['sin', 'cos']);
  const a = rng.int(1, 5) * rng.sign();
  const k = rng.int(-3, 3);
  const cTex = piTex(b * hn, hd);
  const hTex = piTex(hn, hd);
  const f = (x) => a * TRIGF[fn](b * x + (right ? -1 : 1) * b * (hn / hd) * Math.PI) + k;
  const base = (x) => a * TRIGF[fn](b * x) + k;
  const say = (tex, dir) => R`\(${tex}\) to the ${dir}`;
  const [dir, opp] = right ? ['right', 'left'] : ['left', 'right'];
  return q({
    prompt: R`Compared with \(y = ${lead(a)}${T(fn)}(${b}x)${shift(k)}\), how is the graph of \(y = ${lead(a)}${T(fn)}\left(${b}x ${right ? '-' : '+'} ${cTex}\right)${shift(k)}\) shifted horizontally?`,
    correct: say(hTex, dir),
    wrong: [
      { value: say(cTex, dir), why: R`Factor out \(${b}\) first: \(${b}x ${right ? '-' : '+'} ${cTex} = ${b}\left(x ${right ? '-' : '+'} ${hTex}\right)\). The shift is what is added to or subtracted from \(x\) itself.` },
      { value: say(hTex, opp), why: R`Replacing \(x\) with \(x - h\) moves a graph to the right; \(x + h\) moves it to the left.` },
      say(cTex, opp),
      say(piTex(b * b * hn, hd), dir),
    ],
    solution: [
      R`Factor the coefficient of \(x\) out of the bracket: \(${b}x ${right ? '-' : '+'} ${cTex} = ${b}\left(x ${right ? '-' : '+'} ${hTex}\right)\).`,
      R`The function now has the form \(a\,${T(fn)}\big(b(x - h)\big) + k\) with \(h = ${right ? '' : '-'}${hTex}\).`,
      R`So the graph is shifted \(${hTex}\) to the ${dir}.`,
    ],
    rule: 2,
    skill: 'phase shift',
    check: () => (same(f, (x) => base(x - (right ? 1 : -1) * (hn / hd) * Math.PI)) ? true : 'shift is wrong'),
  });
}

function mediumEquationFromGraph(rng) {
  const w = randomWave(rng);
  const other = (changes) => wave({ ...w, ...changes });
  const options = [
    [other({ a: -w.a }), w.fn === 'sin' ? `At x = 0 this graph is on its midline and heading ${w.a > 0 ? 'up' : 'down'}. That fixes the sign in front.` : `At x = 0 this graph is at a ${w.a > 0 ? 'maximum' : 'minimum'}. That fixes the sign in front.`],
    [other({ fn: w.fn === 'sin' ? 'cos' : 'sin' }), `At x = 0 a sine curve is on its midline, while a cosine curve is at a maximum or minimum. This graph starts ${w.fn === 'sin' ? 'on its midline' : 'at an extreme'}.`],
    [w.bd === 2 ? other({ bn: 2, bd: 1 }) : other({ bn: 1, bd: w.bn === 1 ? 2 : 1 }), R`The period is \(${piTex(...w.period)}\), and \(b = \dfrac{2\pi}{\text{period}}\).`],
    [w.k !== 0 ? other({ k: -w.k }) : other({ k: w.amp }), R`The midline is halfway between the maximum \(${w.max}\) and the minimum \(${w.min}\).`],
  ];
  return q({
    prompt: 'Which equation has this graph? (The horizontal axis is in radians.)',
    visual: wavePlot(w, { xMax: w.bd === 2 ? 4 * Math.PI : 2 * Math.PI }),
    key: `equation-from-graph-${w.fn}-${w.a}-${w.bn}-${w.bd}-${w.k}`,
    correct: M(w.tex),
    wrong: options.map(([o, why]) => ({ value: M(o.tex), why })),
    solution: [
      R`Maximum \(${w.max}\), minimum \(${w.min}\): the amplitude is \(${w.amp}\) and the midline is \(y = ${w.k}\).`,
      R`One full cycle takes \(${piTex(...w.period)}\), so \(b = \dfrac{2\pi}{${piTex(...w.period)}} = ${frac(w.bn, w.bd).tex()}\).`,
      w.fn === 'sin' ? `At x = 0 the graph is on its midline and heading ${w.a > 0 ? 'up' : 'down'}: a sine curve${w.a > 0 ? '' : ', reflected (negative a)'}.` : `At x = 0 the graph is at a ${w.a > 0 ? 'maximum: a cosine curve' : 'minimum: a cosine curve, reflected (negative a)'}.`,
      `So ${M(w.tex)}.`,
    ],
    rule: 3,
    skill: 'equation from a graph',
    check: () => (options.every(([o]) => !same(o.f, w.f)) && Math.abs(w.f(0) - (w.fn === 'sin' ? w.k : w.k + w.a)) < 1e-9 ? true : 'an option matches the graph when it should not'),
  });
}

const PERIODS = [
  { text: R`\(\pi\)`, P: Math.PI, b: '2x', wrongB: R`\pi x` },
  { text: R`\(4\pi\)`, P: 4 * Math.PI, b: R`\frac{x}{2}`, wrongB: R`4\pi x` },
  { text: '2', P: 2, b: R`\pi x`, wrongB: '2x' },
  { text: '4', P: 4, b: R`\frac{\pi}{2}x`, wrongB: '4x' },
  { text: '6', P: 6, b: R`\frac{\pi}{3}x`, wrongB: '6x' },
  { text: '8', P: 8, b: R`\frac{\pi}{4}x`, wrongB: '8x' },
  { text: '12', P: 12, b: R`\frac{\pi}{6}x`, wrongB: '12x' },
  { text: '24', P: 24, b: R`\frac{\pi}{12}x`, wrongB: '24x' },
];

function mediumEquationFromFeatures(rng) {
  const A = rng.int(2, 6);
  const k = rng.intExcept(-3, 6, [0, A, -A]);
  const per = rng.pick(PERIODS);
  const start = rng.pick([
    { say: 'a maximum', fn: 'cos', s: 1, at0: (kk, aa) => kk + aa },
    { say: 'a minimum', fn: 'cos', s: -1, at0: (kk, aa) => kk - aa },
    { say: 'a point on the midline where the graph is rising', fn: 'sin', s: 1, at0: (kk) => kk },
    { say: 'a point on the midline where the graph is falling', fn: 'sin', s: -1, at0: (kk) => kk },
  ]);
  const eq = (s, amp, fn, b, kk) => M(`y = ${lead(s * amp)}\\${fn}\\left(${b}\\right)${shift(kk)}`);
  const f = (x) => start.s * A * TRIGF[start.fn]((2 * Math.PI * x) / per.P) + k;
  const flip = start.fn === 'cos' ? 'sin' : 'cos';
  return q({
    prompt: R`A sinusoidal function has amplitude ${A}, period ${per.text} and midline \(y = ${k}\). At \(x = 0\) it has ${start.say}. Which equation fits?`,
    correct: eq(start.s, A, start.fn, per.b, k),
    wrong: [
      { value: eq(start.s, A, start.fn, per.wrongB, k), why: R`The number multiplying \(x\) is not the period. It is \(b = \dfrac{2\pi}{\text{period}}\).` },
      { value: eq(start.s, A, flip, per.b, k), why: R`At \(x = 0\), \(\sin\) is on the midline and \(\cos\) is at its maximum. Choose the one that matches the starting point.` },
      { value: eq(-start.s, A, start.fn, per.b, k), why: start.fn === 'cos' ? 'A positive cosine starts at a maximum; a negative one starts at a minimum.' : 'A positive sine starts by rising; a negative one starts by falling.' },
      eq(start.s, Math.abs(k), start.fn, per.b, k < 0 ? -A : A),
    ],
    solution: [
      R`Amplitude ${A} gives \(|a| = ${A}\), and the midline gives \(k = ${k}\).`,
      R`\(b = \dfrac{2\pi}{\text{period}} = \dfrac{2\pi}{${per.text.replace(/\\[()]/g, '')}}\), so the input is \(${per.b}\).`,
      start.fn === 'cos' ? `The graph starts at ${start.say}, which is how ${start.s > 0 ? 'a cosine curve' : 'a reflected cosine curve'} starts.` : `The graph starts on its midline and is ${start.s > 0 ? 'rising' : 'falling'}, which is how ${start.s > 0 ? 'a sine curve' : 'a reflected sine curve'} starts.`,
      `So ${eq(start.s, A, start.fn, per.b, k)}.`,
    ],
    rule: 3,
    skill: 'equation from features',
    check: () => (Math.abs(f(0) - start.at0(k, A)) < 1e-9 && Math.abs(f(0.37 + per.P) - f(0.37)) < 1e-9 && Math.sign(f(per.P / 100) - f(0)) === (start.fn === 'sin' ? start.s : -start.s) ? true : 'features do not match'),
  });
}

const SCENES = [
  { P: 24, unit: '°C', kMin: 12, kMax: 24, aMin: 3, aMax: 9, peakMin: 13, peakMax: 16, intro: (m) => R`The temperature in a city, in °C, is modelled by \(T(t) = ${m}\), where \(t\) is the number of hours after midnight.`, ask: (t) => R`What is the temperature at \(t = ${t}\)?`, v: 'T' },
  { P: 12, unit: 'm', kMin: 3, kMax: 8, aMin: 1, aMax: 3, peakMin: 1, peakMax: 5, intro: (m) => R`The depth of water in a harbour, in metres, is modelled by \(d(t) = ${m}\), where \(t\) is the number of hours after midnight.`, ask: (t) => R`How deep is the water at \(t = ${t}\)?`, v: 'd' },
  { P: 12, unit: 'hours', kMin: 12, kMax: 12, aMin: 2, aMax: 6, peakMin: 6, peakMax: 6, intro: (m) => R`The number of hours of daylight in a town is modelled by \(D(t) = ${m}\), where \(t\) is the number of months since the start of the year.`, ask: (t) => R`How many hours of daylight are there at \(t = ${t}\)?`, v: 'D' },
];

function mediumModelEvaluate(rng) {
  const sc = rng.pick(SCENES);
  const A = rng.int(sc.aMin, sc.aMax);
  const k = rng.int(sc.kMin, sc.kMax);
  const p = rng.int(sc.peakMin, sc.peakMax);
  const [j, c] = rng.pick([[2, frac(1, 2)], [3, frac(0)], [4, frac(-1, 2)], [6, frac(-1)]]); // step of j twelfths of a period
  const dt = (sc.P / 12) * j * rng.sign();
  const t = p + dt;
  if (t < 0 || t > sc.P) return mediumModelEvaluate(rng);
  const model = R`${lead(A)}\cos\left(${piTex(2, sc.P)}(t - ${p})\right) + ${k}`;
  const ans = frac(A).mul(c).add(k);
  const angle = piTex(2 * Math.abs(dt), sc.P);
  return q({
    prompt: `${sc.intro(model)} ${sc.ask(t)}`,
    correct: ans.value,
    unit: sc.unit,
    wrong: [
      { value: k + A, why: R`That is the maximum, which happens at \(t = ${p}\) when the cosine equals 1.` },
      { value: frac(A).mul(c).neg().add(k).value, why: R`Check the sign of the cosine: \(\cos\left(${angle}\right) = ${c.tex()}\).` },
      { value: frac(A).mul(c).value, why: R`Remember to add the vertical shift \(${k}\) after multiplying.` },
      k,
      k - A,
      k + A / 2,
    ],
    solution: [
      R`Substitute \(t = ${t}\): the angle is \(${piTex(2, sc.P)}(${t} - ${p}) = ${dt < 0 ? '-' : ''}${angle}\).`,
      R`\(\cos\left(${dt < 0 ? '-' : ''}${angle}\right) = ${c.tex()}\)${dt < 0 ? ' (cosine is even, so the sign of the angle does not matter)' : ''}.`,
      R`\(${sc.v}(${t}) = ${A} \cdot ${c.value < 0 ? `\\left(${c.tex()}\\right)` : c.tex()} + ${k} = ${num(ans.value)}\) ${sc.unit}.`,
    ],
    rule: 5,
    skill: 'evaluating a sinusoidal model',
    check: () => checkEqual(A * Math.cos(((2 * Math.PI) / sc.P) * (t - p)) + k, ans.value),
  });
}

// ───────────── Hard ─────────────

function hardEquationMaxMin(rng) {
  const tide = rng.bool();
  const half = rng.pick(tide ? [6, 6, 5, 7] : [12]);
  const t1 = tide ? rng.int(1, 5) : rng.int(13, 16);
  if (t1 % half === 0) return hardEquationMaxMin(rng);
  const A = tide ? rng.int(1, 3) : rng.int(3, 8);
  const k = tide ? A + rng.int(1, 4) : rng.int(10, 22);
  const [hi, lo] = [k + A, k - A];
  const v = tide ? 'd' : 'T';
  const build = (amp, bn, bd, fn, sign, kk) => ({
    text: M(`${v}(t) = ${lead(amp)}\\${fn}\\left(${piTex(bn, bd)}(t ${sign > 0 ? '-' : '+'} ${t1})\\right) + ${kk}`),
    f: (t) => amp * TRIGF[fn](((bn * Math.PI) / bd) * (t - sign * t1)) + kk,
  });
  const right = build(A, 1, half, 'cos', 1, k);
  const options = [build(A, 2, half, 'cos', 1, k), build(2 * A, 1, half, 'cos', 1, k), build(A, 1, half, 'cos', -1, k), build(A, 1, half, 'sin', 1, k)];
  const fits = (o) => Math.abs(o.f(t1) - hi) < 1e-9 && Math.abs(o.f(t1 + half) - lo) < 1e-9;
  const story = tide
    ? `In a harbour, high tide is at ${t1} a.m., when the water is ${hi} m deep. The next low tide is ${half} hours later, when the water is ${lo} m deep.`
    : `On one day the temperature peaks at ${hi} °C at ${t1}:00 and reaches its lowest value, ${lo} °C, 12 hours later.`;
  return q({
    prompt: R`${story} Which sinusoidal model fits, with \(t\) in hours after midnight?`,
    correct: right.text,
    wrong: [
      { value: options[0].text, why: `From a maximum to the next minimum is half a cycle, so the period is ${2 * half} hours, not ${half}.` },
      { value: options[1].text, why: R`The amplitude is half the distance between the maximum and the minimum: \(\frac{${hi} - ${lo}}{2} = ${A}\).` },
      { value: options[2].text, why: R`The maximum must happen when the input of the cosine is 0, that is at \(t = ${t1}\). That needs \((t - ${t1})\).` },
      { value: options[3].text, why: R`A cosine is at its maximum when its input is 0, which is what is needed at \(t = ${t1}\). A sine would be on the midline there.` },
    ],
    solution: [
      R`Amplitude: \(\dfrac{${hi} - ${lo}}{2} = ${A}\). Midline: \(\dfrac{${hi} + ${lo}}{2} = ${k}\).`,
      R`Maximum to minimum takes ${half} hours, which is half a period. The period is ${2 * half} hours, so \(b = \dfrac{2\pi}{${2 * half}} = ${piTex(1, half)}\).`,
      R`A cosine curve starts at a maximum, so shift it to start at \(t = ${t1}\): use \((t - ${t1})\).`,
      `So ${right.text}.`,
    ],
    rule: 4,
    skill: 'model from maximum and minimum',
    check: () => (fits(right) && options.every((o) => !fits(o)) ? true : 'the data do not single out the answer'),
  });
}

function hardGraphWithShift(rng) {
  const b = rng.pick([1, 1, 2]);
  const [hn, hd] = rng.pick(b === 1 ? [[1, 6], [1, 4], [1, 3], [1, 2], [2, 3], [3, 4]] : [[1, 6], [1, 4], [1, 3]]);
  const w = wave({ fn: 'cos', a: rng.int(1, 4), bn: b, hn, hd, k: rng.int(-2, 3) });
  const options = [
    [wave({ ...w, hn: -hn }), R`The maximum is at \(x = ${piTex(hn, hd)}\), to the right of the \(y\)-axis. A shift to the right is written \(x - ${piTex(hn, hd)}\).`],
    [wave({ ...w, fn: 'sin' }), R`At \(x = ${piTex(hn, hd)}\) the graph is at a maximum. A cosine starts at a maximum; a sine starts on the midline.`],
    b === 2 ? [wave({ ...w, hn, hd: 2 * hd }), R`The shift is what is subtracted from \(x\) after \(${b}\) has been factored out: \(${b}\left(x - ${piTex(hn, hd)}\right)\).`] : [wave({ ...w, bn: 2 }), R`Neighbouring maxima are \(2\pi\) apart, so the period is \(2\pi\) and \(b = 1\).`],
    [wave({ ...w, k: w.k === 0 ? w.amp : -w.k }), R`The midline is halfway between the maximum \(${w.max}\) and the minimum \(${w.min}\).`],
  ];
  const { maxAt, minAt } = extremes(w);
  return q({
    prompt: 'Which equation has this graph? (The horizontal axis is in radians.)',
    visual: wavePlot(w, { xMax: 2 * Math.PI + 0.4 }),
    key: `shifted-graph-${w.a}-${b}-${hn}-${hd}-${w.k}`,
    correct: M(w.tex),
    wrong: options.map(([o, why]) => ({ value: M(o.tex), why })),
    solution: [
      R`Maximum \(${w.max}\), minimum \(${w.min}\): amplitude \(${w.amp}\), midline \(y = ${w.k}\).`,
      R`A maximum at \(x = ${piTex(...maxAt)}\) and the next minimum at \(x = ${piTex(...minAt)}\) are half a period apart, so the period is \(${piTex(...w.period)}\) and \(b = ${b}\).`,
      R`A cosine curve has a maximum where its input is 0. Here that happens at \(x = ${piTex(hn, hd)}\), so the curve is shifted \(${piTex(hn, hd)}\) to the right.`,
      `So ${M(w.tex)}.`,
    ],
    rule: 2,
    skill: 'equation from a shifted graph',
    check: () => (options.every(([o]) => !same(o.f, w.f)) && Math.abs(w.f((hn / hd) * Math.PI) - w.max) < 1e-9 ? true : 'an option matches the graph when it should not'),
  });
}

function ferris(rng) {
  const A = rng.pick([8, 10, 12, 16, 20, 24]);
  const k = A + rng.int(2, 6);
  const P = rng.pick([30, 36, 48, 60, 72, 90, 120]);
  return { A, k, P, h: (t) => k - A * Math.cos((2 * Math.PI * t) / P), tex: R`h(t) = ${k} - ${A}\cos\left(${piTex(2, P)}t\right)` };
}
const FERRIS_INTRO = (w) => R`A Ferris wheel takes ${w.P} seconds to turn once. A rider boards at the lowest point, and the rider's height above the ground, in metres, after \(t\) seconds is \(${w.tex}\).`;

function hardSolveModel(rng) {
  const w = ferris(rng);
  const [c, frn, frd] = rng.pick([[frac(1, 2), 1, 6], [frac(0), 1, 4], [frac(-1, 2), 1, 3]]); // cos value needed, and the time as a fraction of the period
  const X = w.k - w.A * c.value;
  const t = (w.P * frn) / frd;
  const angle = piTex(2 * frn, frd);
  return q({
    prompt: `${FERRIS_INTRO(w)} When does the rider first reach a height of ${num(X)} m?`,
    correct: t,
    unit: 'seconds',
    wrong: [
      { value: w.P - t, why: `That is the second time the rider is at this height, on the way down. The question asks for the first time.` },
      c.value !== 0 ? { value: w.P / 2 - t, why: R`Check the sign: the equation reduces to \(\cos(\dots) = ${c.tex()}\).` } : { value: w.P / 2, why: 'That is the time to reach the top of the wheel.' },
      w.P / 2,
      w.P / 12,
      t / 2,
      w.P / 8,
    ],
    solution: [
      R`Set \(${w.k} - ${w.A}\cos\left(${piTex(2, w.P)}t\right) = ${num(X)}\). Then \(${w.A}\cos\left(${piTex(2, w.P)}t\right) = ${num(w.k - X)}\), so \(\cos\left(${piTex(2, w.P)}t\right) = ${c.tex()}\).`,
      R`The first positive angle whose cosine is \(${c.tex()}\) is \(${angle}\).`,
      R`\(${piTex(2, w.P)}t = ${angle}\). Multiply both sides by \(\dfrac{${w.P / 2}}{\pi}\): \(t = ${angle} \cdot \dfrac{${w.P / 2}}{\pi} = ${num(t)}\) seconds.`,
    ],
    rule: 5,
    skill: 'solving a sinusoidal model',
    check: () => {
      if (Math.abs(w.h(t) - X) > 1e-9) return 'height at the answer is wrong';
      for (let s = 0.01; s < t - 0.01; s += t / 200) if (w.h(s) >= X) return 'not the first time';
      return true;
    },
  });
}

// ───────────── Challenge ─────────────

function challengeTimeAbove(rng) {
  const w = ferris(rng);
  const [c, part] = rng.pick([[frac(-1, 2), frac(1, 3)], [frac(1, 2), frac(2, 3)], [frac(0), frac(1, 2)]]); // above X when cos < c
  const X = w.k - w.A * c.value;
  const up = (w.P * (1 - part.value)) / 2; // time of first reaching X
  const ans = w.P * part.value;
  return q({
    prompt: `${FERRIS_INTRO(w)} For how long during each turn is the rider more than ${num(X)} m above the ground?`,
    correct: ans,
    unit: 'seconds',
    wrong: [
      { value: up, why: `That is when the rider first reaches ${num(X)} m. The rider stays above that height until coming back down to it.` },
      { value: w.P - ans, why: `That is the time spent below ${num(X)} m.` },
      { value: w.P - up, why: 'That is the moment the rider drops back to this height, not the length of time spent above it.' },
      ans / 2,
      w.P / 4 === ans ? w.P / 8 : w.P / 4,
    ],
    solution: [
      R`Find when the height equals ${num(X)}: \(\cos\left(${piTex(2, w.P)}t\right) = ${c.tex()}\).`,
      R`In one turn this happens at \(t = ${num(up)}\) (going up) and \(t = ${num(w.P - up)}\) (coming down).`,
      R`Between those times the rider is above ${num(X)} m: \(${num(w.P - up)} - ${num(up)} = ${num(ans)}\) seconds.`,
    ],
    rule: 5,
    skill: 'solving a sinusoidal model',
    check: () => {
      let above = 0;
      const N = 6000;
      for (let i = 0; i < N; i++) if (w.h(((i + 0.5) / N) * w.P) > X) above++;
      return Math.abs(above / N - ans / w.P) < 2 / N + 1e-9 ? true : `fraction of time above is ${above / N}`;
    },
  });
}

function challengeEquivalent(rng) {
  const a = rng.int(1, 5);
  const b = rng.int(1, 3);
  const isSin = rng.bool();
  const bxT = b === 1 ? 'x' : `${b}x`;
  const A = lead(a);
  const base = isSin ? (x) => a * Math.sin(b * x) : (x) => a * Math.cos(b * x);
  const half = R`\frac{\pi}{2}`;
  const pool = isSin
    ? [
      [R`y = ${A}\cos\left(${bxT} - ${half}\right)`, (x) => a * Math.cos(b * x - Math.PI / 2)],
      [R`y = ${A}\cos\left(${bxT} + ${half}\right)`, (x) => a * Math.cos(b * x + Math.PI / 2)],
      [R`y = -${A}\cos\left(${bxT} + ${half}\right)`, (x) => -a * Math.cos(b * x + Math.PI / 2)],
      [R`y = -${A}\sin\left(${bxT} + \pi\right)`, (x) => -a * Math.sin(b * x + Math.PI)],
      [R`y = ${A}\sin\left(${bxT} + \pi\right)`, (x) => a * Math.sin(b * x + Math.PI)],
      [R`y = ${A}\sin\left(${bxT} - ${half}\right)`, (x) => a * Math.sin(b * x - Math.PI / 2)],
      [R`y = ${A}\cos\left(${bxT}\right)`, (x) => a * Math.cos(b * x)],
      [R`y = ${A}\sin\left(-${bxT}\right)`, (x) => a * Math.sin(-b * x)],
      [R`y = ${A}\cos\left(${half} - ${bxT}\right)`, (x) => a * Math.cos(Math.PI / 2 - b * x)],
    ]
    : [
      [R`y = ${A}\sin\left(${bxT} + ${half}\right)`, (x) => a * Math.sin(b * x + Math.PI / 2)],
      [R`y = ${A}\sin\left(${bxT} - ${half}\right)`, (x) => a * Math.sin(b * x - Math.PI / 2)],
      [R`y = ${A}\cos\left(-${bxT}\right)`, (x) => a * Math.cos(-b * x)],
      [R`y = -${A}\cos\left(${bxT} + \pi\right)`, (x) => -a * Math.cos(b * x + Math.PI)],
      [R`y = ${A}\cos\left(${bxT} + \pi\right)`, (x) => a * Math.cos(b * x + Math.PI)],
      [R`y = -${A}\cos\left(-${bxT}\right)`, (x) => -a * Math.cos(-b * x)],
      [R`y = ${A}\sin\left(${bxT}\right)`, (x) => a * Math.sin(b * x)],
      [R`y = ${A}\sin\left(${half} - ${bxT}\right)`, (x) => a * Math.sin(Math.PI / 2 - b * x)],
      [R`y = -${A}\sin\left(${bxT} - ${half}\right)`, (x) => -a * Math.sin(b * x - Math.PI / 2)],
    ];
  const good = rng.pick(pool.filter(([, f]) => same(f, base)));
  const bad = rng.sample(pool.filter(([, f]) => !same(f, base)), 3);
  const describe = (f, tex) => (!/pi|-\d*x/.test(tex.replace('y = -', 'y = ')) ? R`That is a different curve: at \(x = 0\) it equals \(${num(f(0))}\), but the given function equals \(${num(base(0))}\).` : same(f, (x) => -base(x)) ? R`It simplifies to \(y = -${A}${isSin ? R`\sin` : R`\cos`}\left(${bxT}\right)\), the reflection of the given graph.` : R`It simplifies to \(y = ${same(f, (x) => a * (isSin ? Math.cos(b * x) : Math.sin(b * x))) ? '' : '-'}${A}${isSin ? R`\cos` : R`\sin`}\left(${bxT}\right)\), which is a different curve.`);
  return q({
    prompt: R`Which equation has exactly the same graph as \(y = ${A}${isSin ? R`\sin` : R`\cos`}\left(${bxT}\right)\)?`,
    correct: M(good[0]),
    wrong: bad.map(([tex, f]) => ({ value: M(tex), why: describe(f, tex) })),
    solution: [
      R`Use the facts \(\cos\left(\theta - \frac{\pi}{2}\right) = \sin\theta\), \(\sin\left(\theta + \frac{\pi}{2}\right) = \cos\theta\), \(\sin(\theta + \pi) = -\sin\theta\), \(\cos(\theta + \pi) = -\cos\theta\), together with \(\sin(-\theta) = -\sin\theta\) and \(\cos(-\theta) = \cos\theta\).`,
      R`Apply them with \(\theta = ${bxT}\) to each choice. Only \(${good[0]}\) simplifies to \(${A}${isSin ? R`\sin` : R`\cos`}\left(${bxT}\right)\).`,
      R`Check with a value such as \(x = 0\): the given function equals \(${isSin ? 0 : a}\) there, and so does the chosen one.`,
    ],
    rule: 2,
    skill: 'equivalent sinusoids',
    check: () => (same(good[1], base) && bad.every(([, f]) => !same(f, base)) ? true : 'equivalence classification failed'),
  });
}

function challengeValueBetween(rng) {
  const [part, c] = rng.pick([[frac(1, 3), frac(1, 2)], [frac(2, 3), frac(-1, 2)], [frac(1, 2), frac(0)]]);
  const half = rng.pick(part.d === 3 ? [3, 6, 9, 12] : [2, 4, 6, 8, 10]);
  const x1 = rng.int(0, 6);
  const A = rng.int(2, 8);
  const k = rng.int(-4, 12);
  const [hi, lo] = [k + A, k - A];
  const x3 = x1 + half * part.value;
  const ans = k + A * c.value;
  const f = (x) => A * Math.cos((Math.PI * (x - x1)) / half) + k;
  return q({
    prompt: R`A sinusoidal function has a maximum at \((${x1}, ${hi})\) and its next minimum at \((${x1 + half}, ${lo})\). What is its value at \(x = ${x3}\)?`,
    correct: ans,
    wrong: [
      part.d === 3 ? { value: round(hi + part.value * (lo - hi), 2), why: 'A sinusoid does not fall at a steady rate. It is nearly flat close to a maximum and steepest as it crosses the midline.' } : { value: hi, why: 'Halfway between a maximum and a minimum the curve is on its midline.' },
      { value: k - A * c.value, why: R`Check the sign of the cosine for an angle of \(${piTex(part.n, part.d)}\).` },
      k,
      k + A * 0.75,
      lo,
    ],
    solution: [
      R`Amplitude \(\dfrac{${hi} - ${lo < 0 ? `(${lo})` : lo}}{2} = ${A}\); midline \(\dfrac{${hi} + ${lo < 0 ? `(${lo})` : lo}}{2} = ${k}\). Maximum to minimum is half a period, so the period is \(${2 * half}\) and \(b = \dfrac{2\pi}{${2 * half}} = ${piTex(1, half)}\).`,
      R`Starting at the maximum: \(y = ${A}\cos\left(${piTex(1, half)}(x - ${x1})\right) ${k < 0 ? '-' : '+'} ${Math.abs(k)}\).`,
      R`At \(x = ${x3}\) the angle is \(${piTex(1, half)} \cdot ${num(x3 - x1)} = ${piTex(part.n, part.d)}\), and \(\cos ${piTex(part.n, part.d)} = ${c.tex()}\).`,
      R`\(y = ${A} \cdot ${c.value < 0 ? `\\left(${c.tex()}\\right)` : c.tex()} ${k < 0 ? '-' : '+'} ${Math.abs(k)} = ${num(ans)}\).`,
    ],
    rule: 4,
    skill: 'model from maximum and minimum',
    check: () => (Math.abs(f(x1) - hi) < 1e-9 && Math.abs(f(x1 + half) - lo) < 1e-9 && Math.abs(f(x3) - ans) < 1e-9 ? true : 'value is wrong'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'sinusoidal-graphs',
  title: 'Sinusoidal Graphs & Models',
  summary: 'Read amplitude, period, midline and phase shift from equations and graphs, and build sinusoidal models from data.',
  standards: ['AP Precalculus 3.5', 'AP Precalculus 3.6', 'AP Precalculus 3.7', 'CCSS F-TF.B.5'],

  explain: {
    intro: R`Every sine or cosine wave is the basic curve stretched and shifted. In \(y = a\sin\big(b(x - h)\big) + k\) or \(y = a\cos\big(b(x - h)\big) + k\), each of the four numbers controls one feature of the graph, so you can read the graph from the equation and write the equation from the graph. Here \(x\) is in radians.`,
    rules: [
      {
        title: 'Amplitude and midline',
        text: R`The midline is \(y = k\), halfway between the maximum and the minimum. The amplitude is \(|a|\), the distance from the midline to a maximum. From a graph or data: \(k = \dfrac{\max + \min}{2}\) and \(|a| = \dfrac{\max - \min}{2}\). The range is \([k - |a|,\ k + |a|]\).`,
        example: R`\(y = -3\cos x + 1\) has amplitude 3, midline \(y = 1\), maximum 4 and minimum \(-2\).`,
      },
      {
        title: 'Period',
        text: R`One full cycle of \(\sin(bx)\) or \(\cos(bx)\) has length \(\dfrac{2\pi}{b}\) (for \(b > 0\)). Going the other way, \(b = \dfrac{2\pi}{\text{period}}\). The frequency, \(\frac{1}{\text{period}}\), counts cycles per unit.`,
        example: R`\(y = \sin 4x\) has period \(\frac{2\pi}{4} = \frac{\pi}{2}\). A period of 12 needs \(b = \frac{2\pi}{12} = \frac{\pi}{6}\).`,
      },
      {
        title: 'Phase shift',
        text: R`Replacing \(x\) with \(x - h\) moves the graph \(h\) units to the right (to the left if \(h\) is negative). If the input is written \(bx - c\), factor out \(b\) first: \(bx - c = b\left(x - \frac{c}{b}\right)\), so the shift is \(\frac{c}{b}\).`,
        example: R`\(y = 2\cos(3x - \pi) = 2\cos\left(3\left(x - \frac{\pi}{3}\right)\right)\) is shifted \(\frac{\pi}{3}\) to the right.`,
      },
      {
        title: 'From a graph to an equation',
        text: R`Find the midline and amplitude from the maximum and minimum, and the period from the distance between neighbouring maxima (or twice the distance from a maximum to the next minimum). Then choose the starting shape: a cosine starts at a maximum, a negative cosine at a minimum, a sine on the midline going up, a negative sine on the midline going down.`,
        example: R`Maximum 5 at \(x = 0\), next minimum \(-1\) at \(x = \frac{\pi}{2}\): amplitude 3, midline 2, period \(\pi\). So \(y = 3\cos 2x + 2\).`,
      },
      {
        title: 'From maximum and minimum data to a model',
        text: R`If a quantity peaks at value \(M\) when \(t = t_{1}\) and next reaches its lowest value \(m\) when \(t = t_{2}\), then \(a = \frac{M - m}{2}\), \(k = \frac{M + m}{2}\), the period is \(2(t_{2} - t_{1})\), and a cosine shifted to start at the peak fits: \(y = a\cos\big(b(t - t_{1})\big) + k\).`,
        example: R`High tide 5 m at \(t = 2\), low tide 1 m at \(t = 8\): \(y = 2\cos\left(\frac{\pi}{6}(t - 2)\right) + 3\).`,
      },
      {
        title: 'Using a model',
        text: R`To evaluate a model, substitute the time and use exact values of sine and cosine where you can. To find when the quantity reaches a level, isolate the sine or cosine, find the angle, then solve for the time. Remember that each level is usually reached twice per cycle.`,
        example: R`\(h(t) = 22 - 20\cos\left(\frac{\pi}{30}t\right)\) equals 32 when \(\cos\left(\frac{\pi}{30}t\right) = -\frac{1}{2}\): first at \(\frac{\pi}{30}t = \frac{2\pi}{3}\), so \(t = 20\).`,
      },
    ],
    vocab: [
      { term: 'sinusoid', def: 'Any graph with the shape of a sine or cosine wave, however it is stretched or shifted.' },
      { term: 'amplitude', def: 'The distance from the midline to a maximum: half the difference between the maximum and minimum values.' },
      { term: 'midline', def: 'The horizontal line halfway between the maximum and minimum values of a sinusoid.' },
      { term: 'period', def: 'The horizontal length of one complete cycle.' },
      { term: 'phase shift', def: 'The horizontal shift of a sinusoid away from the position of the basic sine or cosine curve.' },
    ],
    mistakes: [
      R`Reading the phase shift of \(\sin(2x - \pi)\) as \(\pi\). Factor first: \(2\left(x - \frac{\pi}{2}\right)\), so the shift is \(\frac{\pi}{2}\).`,
      R`Using the period itself as \(b\). A period of 12 gives \(b = \frac{2\pi}{12}\), not \(b = 12\).`,
      'Taking the time from a maximum to the next minimum as the period. It is only half a period.',
      R`Giving a negative amplitude. For \(y = -4\sin x\) the amplitude is 4; the minus sign reflects the graph.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 2 * Math.PI + 0.3],
      y: [-3, 5],
      piTicks: true,
      fns: [{ f: (x) => 3 * Math.sin(2 * (x - Math.PI / 4)) + 1 }],
      hlines: [{ y: 1 }],
      points: [{ x: Math.PI / 2, y: 4, label: 'max 4' }, { x: Math.PI, y: -2, label: 'min −2', color: 'b' }],
      alt: 'Graph of y = 3 sin(2(x − π/4)) + 1 from 0 to 2π. The wave is centred on the dashed midline y = 1, rises to a maximum of 4 at x = π/2, falls to a minimum of −2 at x = π, and completes one cycle every π units.',
    },
  },

  examples: [
    {
      title: 'Reading every feature from an equation',
      problem: R`Find the amplitude, period, phase shift, midline and range of \(y = 3\sin\left(2\left(x - \frac{\pi}{4}\right)\right) + 1\).`,
      steps: [
        R`\(a = 3\): the amplitude is 3. \(k = 1\): the midline is \(y = 1\).`,
        R`\(b = 2\): the period is \(\dfrac{2\pi}{2} = \pi\).`,
        R`\(h = \frac{\pi}{4}\): the graph is shifted \(\frac{\pi}{4}\) to the right.`,
        R`The range runs from \(1 - 3 = -2\) to \(1 + 3 = 4\).`,
      ],
      answer: R`Amplitude 3; period \(\pi\); shift \(\frac{\pi}{4}\) right; midline \(y = 1\); range \([-2, 4]\).`,
    },
    {
      title: 'An equation from a graph',
      problem: R`A sinusoid has a maximum at \((0, 5)\) and its next minimum at \(\left(\frac{\pi}{2}, -1\right)\). Write an equation for it.`,
      steps: [
        R`Amplitude: \(\dfrac{5 - (-1)}{2} = 3\). Midline: \(\dfrac{5 + (-1)}{2} = 2\).`,
        R`Maximum to minimum is half a period, so the period is \(2 \cdot \frac{\pi}{2} = \pi\) and \(b = \dfrac{2\pi}{\pi} = 2\).`,
        R`The graph is at a maximum when \(x = 0\), which is how a cosine curve starts. No shift is needed.`,
      ],
      answer: R`\(y = 3\cos 2x + 2\)`,
      visual: {
        type: 'plot',
        x: [0, 2 * Math.PI],
        y: [-2, 6],
        piTicks: true,
        fns: [{ f: (x) => 3 * Math.cos(2 * x) + 2 }],
        hlines: [{ y: 2 }],
        points: [{ x: 0, y: 5, label: '(0, 5)' }, { x: Math.PI / 2, y: -1, label: '(π/2, −1)', color: 'b' }],
        alt: 'Graph of y = 3 cos 2x + 2. It starts at a maximum at (0, 5), falls to a minimum at (π/2, −1), and repeats every π. The dashed midline is y = 2.',
      },
    },
    {
      title: 'Word problem: a tide model',
      word: true,
      problem: R`High tide in a harbour is 5 m at 2 a.m. and the next low tide is 1 m at 8 a.m. Write a model for the depth \(d\) after \(t\) hours past midnight, and find the depth at 4 a.m.`,
      steps: [
        R`Amplitude: \(\dfrac{5 - 1}{2} = 2\). Midline: \(\dfrac{5 + 1}{2} = 3\).`,
        R`High to low takes 6 hours, half a period. The period is 12 hours, so \(b = \dfrac{2\pi}{12} = \dfrac{\pi}{6}\).`,
        R`Start a cosine at the high tide, \(t = 2\): \(d(t) = 2\cos\left(\frac{\pi}{6}(t - 2)\right) + 3\).`,
        R`At \(t = 4\): \(d(4) = 2\cos\left(\frac{\pi}{3}\right) + 3 = 2 \cdot \frac{1}{2} + 3 = 4\).`,
      ],
      answer: R`\(d(t) = 2\cos\left(\frac{\pi}{6}(t - 2)\right) + 3\); the depth at 4 a.m. is 4 m.`,
      visual: {
        type: 'plot',
        x: [0, 24],
        y: [0, 6],
        step: [2, 1],
        fns: [{ f: (t) => 2 * Math.cos((Math.PI / 6) * (t - 2)) + 3 }],
        hlines: [{ y: 3 }],
        points: [{ x: 2, y: 5, label: 'high (2, 5)' }, { x: 8, y: 1, label: 'low (8, 1)', color: 'b' }, { x: 4, y: 4, label: '(4, 4)', color: 'c' }],
        axisLabels: ['t (h)', 'd (m)'],
        alt: 'Graph of the tide depth over 24 hours. The wave peaks at 5 metres at t = 2, falls to 1 metre at t = 8, and repeats every 12 hours around the dashed midline at 3 metres. The point (4, 4) is marked.',
      },
    },
  ],

  models: [
    {
      id: 'sinusoid-features',
      title: 'Features of a sinusoid',
      intro: 'Change the numbers in y = a·sin(b(x − h)) + k (or cosine) and watch the graph. The shift h is entered in quarter-turns of π/4.',
      inputs: [
        { name: 'fn', label: 'Function', type: 'select', value: 'sin', options: [{ value: 'sin', label: 'sine' }, { value: 'cos', label: 'cosine' }] },
        { name: 'a', label: 'a (stretch; negative reflects)', type: 'int', min: -5, max: 5, value: 3 },
        { name: 'b', label: 'b (frequency factor)', type: 'int', min: 1, max: 4, value: 2 },
        { name: 'h', label: 'h in units of π/4', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'k', label: 'k (vertical shift)', type: 'int', min: -4, max: 4, value: 1 },
      ],
      compute({ fn, a, b, h, k }) {
        if (a === 0) return { error: 'With a = 0 the graph is the flat line y = k. Choose a value of a other than 0.' };
        const w = wave({ fn, a, bn: b, hn: h, hd: 4, k });
        return {
          problem: R`Describe the graph of \(${w.tex}\).`,
          steps: [
            R`Amplitude: \(|a| = ${w.amp}\)${a < 0 ? ' (the negative sign reflects the graph in its midline)' : ''}.`,
            R`Midline: \(y = ${k}\). Range: from \(${k} - ${w.amp} = ${w.min}\) to \(${k} + ${w.amp} = ${w.max}\).`,
            R`Period: \(\dfrac{2\pi}{b} = \dfrac{2\pi}{${b}} = ${piTex(2, b)}\).`,
            h === 0 ? 'Phase shift: none.' : R`Phase shift: \(${piTex(Math.abs(h), 4)}\) to the ${h > 0 ? 'right' : 'left'}.`,
          ],
          answer: R`Amplitude \(${w.amp}\); period \(${piTex(2, b)}\); midline \(y = ${k}\); ${h === 0 ? 'no phase shift' : R`shift \(${piTex(Math.abs(h), 4)}\) ${h > 0 ? 'right' : 'left'}`}; range \([${w.min}, ${w.max}]\).`,
          visual: {
            type: 'plot',
            x: [-Math.PI, 2 * Math.PI],
            y: [Math.min(w.min, 0) - 1, Math.max(w.max, 0) + 1],
            piTicks: true,
            fns: [{ f: w.f }],
            hlines: [{ y: k }],
            alt: `Graph of the sinusoid from −π to 2π. It oscillates between ${txt(w.min)} and ${txt(w.max)} around the dashed midline y = ${txt(k)}, with period ${piText(2, b)}${h === 0 ? '' : `, shifted ${piText(Math.abs(h), 4)} to the ${h > 0 ? 'right' : 'left'}`}.`,
          },
        };
      },
    },
    {
      id: 'tide-model',
      title: 'Word problem: a model from high and low tide',
      word: true,
      intro: 'Enter the depth and time of a high tide, the depth of the next low tide and how many hours later it comes. The model builds the cosine function and evaluates it.',
      inputs: [
        { name: 'high', label: 'High-tide depth (m)', type: 'number', min: 1, max: 12, step: 0.5, value: 5 },
        { name: 'low', label: 'Low-tide depth (m)', type: 'number', min: 0, max: 11, step: 0.5, value: 1 },
        { name: 'tHigh', label: 'Time of high tide (hours after midnight)', type: 'int', min: 0, max: 12, value: 2 },
        { name: 'gap', label: 'Hours from high tide to low tide', type: 'int', min: 2, max: 12, value: 6 },
        { name: 't', label: 'Time to predict (hours after midnight)', type: 'number', min: 0, max: 24, step: 0.5, value: 4 },
      ],
      compute({ high, low, tHigh, gap, t }) {
        if (low >= high) return { error: 'The low-tide depth must be less than the high-tide depth.' };
        const A = (high - low) / 2;
        const k = (high + low) / 2;
        const f = (x) => A * Math.cos((Math.PI / gap) * (x - tHigh)) + k;
        const model = R`${lead(A)}\cos\left(${piTex(1, gap)}(t - ${tHigh})\right) + ${num(k)}`;
        return {
          problem: `High tide is ${num(high)} m at ${tHigh} hours after midnight, and the next low tide is ${num(low)} m, ${gap} hours later. How deep is the water ${num(t)} hours after midnight?`,
          steps: [
            R`Amplitude: \(\dfrac{${num(high)} - ${num(low)}}{2} = ${num(A)}\). Midline: \(\dfrac{${num(high)} + ${num(low)}}{2} = ${num(k)}\).`,
            R`High to low is half a period, so the period is \(2 \cdot ${gap} = ${2 * gap}\) hours and \(b = \dfrac{2\pi}{${2 * gap}} = ${piTex(1, gap)}\).`,
            R`A cosine starts at its maximum, so shift it to \(t = ${tHigh}\): \(d(t) = ${model}\).`,
            R`\(d(${num(t)}) = ${lead(A)}\cos\left(${piTex(1, gap)} \cdot ${t - tHigh < 0 ? `(${num(t - tHigh)})` : num(t - tHigh)}\right) + ${num(k)} \approx ${num(f(t), { places: 2 })}\).`,
          ],
          answer: R`\(d(t) = ${model}\); at \(t = ${num(t)}\) the depth is about ${num(f(t), { places: 2 })} m.`,
          visual: {
            type: 'plot',
            x: [0, 24],
            y: [0, high + 1],
            step: [2, niceY(high)],
            fns: [{ f }],
            hlines: [{ y: k }],
            points: [{ x: tHigh, y: high, label: 'high' }, { x: tHigh + gap, y: low, label: 'low', color: 'b' }, { x: t, y: f(t), label: `${txt(f(t), { places: 2 })} m`, color: 'c' }],
            axisLabels: ['t (h)', 'd (m)'],
            alt: `Graph of the tide depth over 24 hours: a wave between ${txt(low)} and ${txt(high)} metres with period ${2 * gap} hours. At t = ${txt(t)} the depth is about ${txt(f(t), { places: 2 })} metres.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyAmplitudeMidline, easyPeriod, easyGraphFeatures],
    medium: [mediumPhaseShift, mediumEquationFromGraph, mediumEquationFromFeatures, mediumModelEvaluate],
    hard: [hardEquationMaxMin, hardGraphWithShift, hardSolveModel],
    challenge: [challengeTimeAbove, challengeEquivalent, challengeValueBetween],
  },
};

function niceY(high) {
  return high > 6 ? 2 : 1;
}
