import { R, q, num, txt, money, linear, terms, point, tryFrac, person, people, checkEqual, checkAll } from '../../lib/index.js';
import { grid } from './_shared.js';

const m = (tex) => R`\(${tex}\)`;
const lab = (x, y) => `(${txt(x)}, ${txt(y)})`;
const xyTable = (rows, alt, heads = [R`\(x\)`, R`\(y\)`]) => ({ type: 'table', headers: heads, rows: rows.map((r) => r.map((v) => (typeof v === 'number' ? m(num(v)) : v))), alt });
const isFunction = (pairs) => pairs.every(([x, y]) => pairs.every(([x2, y2]) => x !== x2 || y === y2));
const diffs = (ys) => ys.slice(1).map((y, i) => y - ys[i]);

/**
 * A mapping diagram drawn on a plot with no grid: inputs in a column on the left, outputs on the
 * right, an arrow for each pair. (There is no mapping picture type, so a plot stands in for one.)
 */
function mapping(pairs, alt) {
  const ins = [...new Set(pairs.map((p) => p[0]))].sort((a, b) => a - b);
  const outs = [...new Set(pairs.map((p) => p[1]))].sort((a, b) => a - b);
  const n = Math.max(ins.length, outs.length);
  const at = (i, len) => n - (len === 1 ? (n - 1) / 2 : (i * (n - 1)) / (len - 1));
  const yIn = (v) => at(ins.indexOf(v), ins.length);
  const yOut = (v) => at(outs.indexOf(v), outs.length);
  return {
    type: 'plot', x: [0, 5], y: [0, n + 1], step: [100, 100], grid: false,
    points: [...ins.map((v) => ({ x: 1, y: yIn(v), label: txt(v) })), ...outs.map((v) => ({ x: 4, y: yOut(v), label: txt(v), color: 'b' }))],
    segments: pairs.map(([x, y]) => ({ from: [1.12, yIn(x)], to: [3.88, yOut(y)], arrow: true, color: 'a' })),
    alt,
  };
}

// ───────────── Easy (grade 6): variables, equations from stories and tables ─────────────

const SITUATIONS = [
  { story: (n, r) => `${n} earns ${money(r)} for each hour of babysitting.`, i: 'the number of hours worked', d: 'the amount of money earned', k: 'the pay for one hour', x: 'the number of children watched', vi: 'h', vd: 'm', rate: [8, 15] },
  { story: (n, r) => `${n}'s family drives at a steady ${r} miles per hour.`, i: 'the time spent driving', d: 'the distance traveled', k: 'the speed of the car', x: 'the number of people in the car', vi: 't', vd: 'd', rate: [40, 65] },
  { story: (n, r) => `${n} buys notebooks that cost ${money(r)} each.`, i: 'the number of notebooks bought', d: 'the total cost', k: 'the price of one notebook', x: 'the number of pages in a notebook', vi: 'n', vd: 'c', rate: [2, 6] },
  { story: (n, r) => `${n} reads ${r} pages of a book every day.`, i: 'the number of days', d: 'the number of pages read', k: 'the number of pages read each day', x: 'the number of chapters in the book', vi: 'd', vd: 'p', rate: [12, 40] },
  { story: (n, r) => `A hose fills ${n}'s paddling pool with ${r} liters of water each minute.`, i: 'the number of minutes', d: 'the amount of water in the pool', k: 'the amount of water added each minute', x: 'the temperature of the water', vi: 't', vd: 'w', rate: [8, 20] },
  { story: (n, r) => `${n} walks dogs and is paid ${money(r)} for each dog walked.`, i: 'the number of dogs walked', d: 'the amount of money earned', k: 'the pay for one dog', x: 'the length of each walk', vi: 'n', vd: 'm', rate: [4, 9] },
];

function easyVariables(rng) {
  const s = rng.pick(SITUATIONS);
  const r = rng.int(...s.rate);
  const askIndep = rng.bool();
  return q({
    prompt: `${s.story(person(rng), r)} Which quantity is the **${askIndep ? 'independent' : 'dependent'}** variable?`,
    correct: cap(askIndep ? s.i : s.d),
    wrong: [
      { value: cap(askIndep ? s.d : s.i), why: askIndep ? `That one depends on ${s.i}, so it is the dependent variable.` : `That one is chosen first and changes on its own, so it is the independent variable.` },
      { value: cap(s.k), why: 'That number stays the same the whole time. It is a fixed number, not a variable.' },
      { value: cap(s.x), why: 'That is not part of the relationship in the story.' },
    ],
    solution: [`The independent variable is the quantity that changes on its own: ${s.i}.`, `The dependent variable is the result, which depends on it: ${s.d}.`, `So the ${askIndep ? 'independent' : 'dependent'} variable is ${askIndep ? s.i : s.d}.`],
    rule: 0,
    skill: 'independent and dependent',
    // The dependent quantity really does change when the independent one does: r·1 ≠ r·2.
    check: () => (r * 1 !== r * 2 && s.i !== s.d ? true : 'the variables are not distinct'),
  });
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

const AGE_STORIES = [
  { text: (n, k) => `${n} is ${k} years older than ${n}'s cousin. Let \\(c\\) be the cousin's age and \\(a\\) be ${n}'s age.`, vi: 'c', vd: 'a', ask: (n) => `Which equation gives ${n}'s age in terms of the cousin's age?` },
  { text: (n, k) => `A shop sells every item for ${money(k)} more than it paid for it. Let \\(p\\) be the price the shop paid and \\(s\\) be the selling price.`, vi: 'p', vd: 's', ask: () => 'Which equation gives the selling price in terms of the price paid?' },
];

function easyEquation(rng) {
  const name = person(rng);
  if (rng.bool(0.3)) {
    const s = rng.pick(AGE_STORIES);
    const k = rng.int(2, 15);
    const [i, d] = [s.vi, s.vd];
    return q({
      prompt: `${R`${s.text(name, k)}`} ${s.ask(name)}`,
      correct: m(`${d} = ${i} + ${k}`),
      wrong: [{ value: m(`${i} = ${d} + ${k}`), why: R`\(${d}\) is the larger amount, so add \(${k}\) to \(${i}\) to get \(${d}\).` }, { value: m(`${d} = ${k}${i}`), why: R`The difference is always \(${k}\): it is added, not multiplied.` }, m(`${d} = ${i} - ${k}`), m(`${d} + ${i} = ${k}`)],
      solution: [R`\(${d}\) is always \(${k}\) more than \(${i}\).`, R`So \(${d} = ${i} + ${k}\). For example, when \(${i} = 10\), \(${d} = ${10 + k}\).`],
      rule: 0,
      skill: 'writing an equation',
      check: () => checkEqual(10 + k - 10, k),
    });
  }
  const s = rng.pick(SITUATIONS);
  const r = rng.int(...s.rate);
  const [i, d] = [s.vi, s.vd];
  return q({
    prompt: R`${s.story(name, r)} Let \(${i}\) be ${s.i} and \(${d}\) be ${s.d}. Which equation shows \(${d}\) in terms of \(${i}\)?`,
    correct: m(`${d} = ${r}${i}`),
    wrong: [{ value: m(`${i} = ${r}${d}`), why: R`\(${d}\) depends on \(${i}\), so \(${d}\) goes on its own on the left and \(${i}\) is multiplied by \(${r}\).` }, { value: m(`${d} = ${i} + ${r}`), why: R`Each one adds another \(${r}\), so the total is \(${r}\) times \(${i}\), not \(${i} + ${r}\).` }, m(R`${d} = \frac{${i}}{${r}}`), m(`${d} = ${i} - ${r}`)],
    solution: [R`Each time \(${i}\) goes up by 1, \(${d}\) goes up by \(${r}\). So \(${i} = 1\) gives \(${r}\), \(${i} = 2\) gives \(${2 * r}\) and \(${i} = 3\) gives \(${3 * r}\).`, R`The rule is: multiply \(${i}\) by \(${r}\). So \(${d} = ${r}${i}\).`],
    rule: 0,
    skill: 'writing an equation',
    check: () => {
      let total = 0;
      for (let t = 0; t < 3; t++) total += r;
      return checkEqual(total, r * 3);
    },
  });
}

function easyTableEquation(rng) {
  const mul = rng.bool();
  const k = mul ? rng.int(2, 12) : rng.int(2, 20);
  const xs = [...rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4)].sort((a, b) => a - b);
  const f = (x) => (mul ? k * x : x + k);
  const rows = xs.map((x) => [x, f(x)]);
  const [x1, y1] = rows[0];
  const fitsFirst = mul ? { tex: `y = ${linear(1, y1 - x1)}`, f: (x) => x + y1 - x1 } : y1 % x1 === 0 ? { tex: `y = ${terms([[y1 / x1, 'x']])}`, f: (x) => (y1 / x1) * x } : null;
  const okFirst = fitsFirst && !xs.every((x) => fitsFirst.f(x) === f(x)) ? fitsFirst : null;
  return q({
    prompt: 'Which equation fits every row of the table?',
    visual: xyTable(rows, `A table. ${rows.map(([x, y]) => `When x is ${x}, y is ${y}`).join('. ')}.`),
    correct: m(mul ? `y = ${k}x` : `y = x + ${k}`),
    wrong: [
      okFirst ? { value: m(okFirst.tex), why: R`That works for the first row only. Check it with \(x = ${xs[1]}\): it gives \(${okFirst.f(xs[1])}\), not \(${f(xs[1])}\).` } : null,
      { value: m(mul ? `x = ${k}y` : `x = y + ${k}`), why: R`In the table, \(y\) is the larger number, so the equation must give \(y\) from \(x\).` },
      m(mul ? `y = ${k + 1}x` : `y = ${k}x`),
      m(mul ? `y = x + ${k}` : `y = x - ${k}`),
      m(mul ? `y = ${k}x + 1` : `y = x + ${k + 1}`),
    ],
    solution: [R`Compare each \(y\) with its \(x\): ${rows.map(([x, y]) => R`\(${x} \to ${y}\)`).join(', ')}.`, mul ? R`Each \(y\) is \(${k}\) times its \(x\).` : R`Each \(y\) is \(${k}\) more than its \(x\).`, R`So the equation is \(${mul ? `y = ${k}x` : `y = x + ${k}`}\).`],
    rule: 0,
    skill: 'equation from a table',
    check: () => (rows.every(([x, y]) => (mul ? y / x === k : y - x === k)) ? true : 'a row does not fit'),
  });
}

// ───────────── Medium (grade 8): is it a function, vertical line test, reading a graph ─────────────

function relation(rng, isFn) {
  for (;;) {
    const xs = rng.sample([-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], isFn ? 5 : 4);
    const ys = rng.sample([-4, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12], 5);
    let pairs;
    let extra;
    if (isFn) {
      ys[4] = ys[rng.int(0, 3)];
      pairs = xs.map((x, i) => [x, ys[i]]);
      const yr = ys[4];
      extra = { yr, from: pairs.filter(([, y]) => y === yr).map(([x]) => x).sort((a, b) => a - b) };
    } else {
      const xr = xs[rng.int(0, 3)];
      pairs = [...xs.map((x, i) => [x, ys[i]]), [xr, ys[4]]];
      extra = { xr, outs: pairs.filter(([x]) => x === xr).map(([, y]) => y).sort((a, b) => a - b) };
    }
    return { pairs: rng.shuffle(pairs), ...extra };
  }
}

const YES = 'Yes. Each input has exactly one output.';

function mediumIsFunction(rng) {
  const isFn = rng.bool();
  const form = rng.pick(['pairs', 'table', 'mapping']);
  const r = relation(rng, isFn);
  const { pairs } = r;
  const listText = pairs.map(([x, y]) => lab(x, y)).join(', ');
  const prompt = {
    pairs: R`Is this relation a function? \(\{${pairs.map(([x, y]) => point(x, y)).join(', ')}\}\)`,
    table: 'The table shows a relation. Is it a function?',
    mapping: 'The mapping diagram shows a relation: each arrow goes from an input on the left to an output on the right. Is it a function?',
  }[form];
  const visual = form === 'table' ? xyTable(pairs, `A table of inputs x and outputs y with the pairs ${listText}.`, [R`Input \(x\)`, R`Output \(y\)`]) : form === 'mapping' ? mapping(pairs, `A mapping diagram. Arrows join each input to its output: ${pairs.map(([x, y]) => `${txt(x)} to ${txt(y)}`).join(', ')}.`) : undefined;
  return q({
    prompt,
    visual,
    correct: isFn ? YES : R`No. The input \(${r.xr}\) has two outputs, \(${r.outs[0]}\) and \(${r.outs[1]}\).`,
    wrong: isFn
      ? [
          { value: R`No. The output \(${r.yr}\) comes from two inputs, \(${r.from[0]}\) and \(${r.from[1]}\).`, why: 'Two inputs may share an output. A function only needs each input to have exactly one output.' },
          { value: 'No. One of the inputs is paired with two different outputs.', why: 'Check the inputs: each one appears only once.' },
          { value: 'No. The inputs do not go up by the same amount each time.', why: 'A function does not need a pattern in its inputs. It only needs one output for each input.' },
        ]
      : [
          { value: YES, why: R`Look at the input \(${r.xr}\): it appears twice, with two different outputs.` },
          { value: 'Yes. No output appears more than once.', why: 'What matters is the inputs: an input with two outputs means the relation is not a function.' },
          { value: R`No. The output \(${r.outs[0]}\) comes from two different inputs.`, why: R`\(${r.outs[0]}\) comes only from the input \(${r.xr}\). The problem is that \(${r.xr}\) has a second output.` },
        ],
    solution: [
      'A relation is a function when each input has exactly one output. Look for an input that appears more than once.',
      isFn ? R`Every input appears once. (The output \(${r.yr}\) appears twice, but that is allowed.)` : R`The input \(${r.xr}\) is paired with \(${r.outs[0]}\) and with \(${r.outs[1]}\).`,
      isFn ? 'So the relation is a function.' : 'So the relation is not a function.',
    ],
    rule: 1,
    skill: 'is it a function',
    check: () => (isFunction(pairs) === isFn ? true : 'function test disagrees'),
  });
}

function graphKind(rng, kind) {
  const [h, k] = [rng.int(-3, 3), rng.int(-3, 3)];
  const s = rng.sign();
  switch (kind) {
    case 'line': {
      const [a, b] = [rng.nonzero(-3, 3), rng.nonzero(-4, 4)];
      return { fn: true, fns: [{ f: (x) => a * x + b }], g: (x, y) => y - (a * x + b), alt: R`A straight line through ${lab(0, b)} and ${lab(1, a + b)}.`, slip: { value: 'No. The line goes on forever, so it has infinitely many outputs.', why: 'Infinitely many inputs and outputs is fine. Each input still has exactly one output.' }, other: { value: 'No. The graph does not pass through the origin.', why: 'A function can cross the axes anywhere.' } };
    }
    case 'const': {
      const c = rng.nonzero(-5, 5);
      return { fn: true, fns: [{ f: () => c }], g: (x, y) => y - c, alt: `A horizontal line through ${lab(0, c)}.`, slip: { value: R`No. Every input has the same output, \(${c}\).`, why: 'Many inputs may share one output. Each input still has exactly one output.' }, other: { value: 'No. The graph does not pass through the origin.', why: 'A function can cross the axes anywhere.' } };
    }
    case 'parabola':
    case 'abs': {
      const f = kind === 'abs' ? (x) => s * Math.abs(x - h) + k : (x) => s * (x - h) ** 2 + k;
      return { fn: true, fns: [{ f }], g: (x, y) => y - f(x), alt: `A ${kind === 'abs' ? 'V-shaped graph' : 'U-shaped curve'} that opens ${s > 0 ? 'up' : 'down'}, with its ${s > 0 ? 'lowest' : 'highest'} point at ${lab(h, k)}. It passes through ${lab(h - 1, k + s)} and ${lab(h + 1, k + s)}.`, slip: { value: R`No. The horizontal line \(y = ${k + s}\) crosses the graph at \(${point(h - 1, k + s)}\) and \(${point(h + 1, k + s)}\).`, why: 'That shows two inputs with the same output, which is allowed. The test for a function uses vertical lines.' }, other: { value: 'No. The graph is not a straight line.', why: 'A function does not have to be linear.' } };
    }
    case 'circle':
      return { fn: false, param: [{ x: (t) => h + 5 * Math.cos(t), y: (t) => k + 5 * Math.sin(t), t: [0, 2 * Math.PI] }], g: (x, y) => (x - h) ** 2 + (y - k) ** 2 - 25, c: h + 3, ys: [k - 4, k + 4], alt: `A circle with center ${lab(h, k)} and radius 5. It passes through ${lab(h + 3, k + 4)} and ${lab(h + 3, k - 4)}.` };
    case 'sideways': {
      const f = (t) => s * (t - k) ** 2 + h;
      return { fn: false, param: [{ x: f, y: (t) => t, t: [k - 5, k + 5] }], g: (x, y) => x - f(y), c: h + 4 * s, ys: [k - 2, k + 2], alt: `A U-shaped curve on its side that opens to the ${s > 0 ? 'right' : 'left'}, with its turning point at ${lab(h, k)}. It passes through ${lab(h + 4 * s, k + 2)} and ${lab(h + 4 * s, k - 2)}.` };
    }
    case 'sideV': {
      const f = (t) => s * Math.abs(t - k) + h;
      return { fn: false, param: [{ x: f, y: (t) => t, t: [k - 9, k + 9] }], g: (x, y) => x - f(y), c: h + 2 * s, ys: [k - 2, k + 2], alt: `A V-shaped graph on its side that opens to the ${s > 0 ? 'right' : 'left'}, with its point at ${lab(h, k)}. It passes through ${lab(h + 2 * s, k + 2)} and ${lab(h + 2 * s, k - 2)}.` };
    }
    default: {
      const c = rng.nonzero(-5, 5);
      return { fn: false, vline: c, g: (x) => x - c, c, ys: [0, 1], alt: `A vertical line through ${lab(c, 0)}.` };
    }
  }
}

function mediumVerticalLine(rng) {
  const kind = rng.pick(['line', 'const', 'parabola', 'abs', 'circle', 'sideways', 'sideV', 'vline']);
  const G = graphKind(rng, kind);
  const visual = grid(-8, 8, { fns: G.fns, param: G.param, vlines: G.vline != null ? [{ x: G.vline, dashed: false, color: 'a' }] : undefined, alt: G.alt });
  const ALL = 'Yes. Every vertical line crosses the graph at most once.';
  const correct = G.fn ? ALL : kind === 'vline' ? R`No. The vertical line \(x = ${G.c}\) is the whole graph: the input \(${G.c}\) has many outputs.` : R`No. The vertical line \(x = ${G.c}\) crosses the graph at \(${point(G.c, G.ys[0])}\) and \(${point(G.c, G.ys[1])}\).`;
  return q({
    prompt: R`Use the vertical line test. Is \(y\) a function of \(x\) for this graph?`,
    visual,
    correct,
    wrong: G.fn
      ? [G.slip, { value: 'No. A vertical line crosses the graph at two points.', why: 'Try any vertical line: it crosses this graph only once.' }, G.other]
      : [
          { value: ALL, why: R`Try the vertical line \(x = ${G.c}\): it meets the graph more than once.` },
          { value: 'Yes. Each output comes from only one input.', why: 'That checks outputs. A function needs exactly one output for each input.' },
          { value: 'Yes. The graph is one unbroken piece.', why: 'Being in one piece does not matter. What matters is whether some input has two outputs.' },
        ],
    solution: [
      'A graph shows a function when no vertical line crosses it more than once: then each input x has only one output y.',
      G.fn ? R`Any vertical line crosses this graph once, at one point.` : kind === 'vline' ? R`The graph itself is the vertical line \(x = ${G.c}\), so the input \(${G.c}\) is paired with every \(y\).` : R`The line \(x = ${G.c}\) crosses at \(${point(G.c, G.ys[0])}\) and \(${point(G.c, G.ys[1])}\): the input \(${G.c}\) has two outputs.`,
      G.fn ? 'So the graph is a function.' : 'So the graph is not a function.',
    ],
    rule: 2,
    skill: 'vertical line test',
    check: () => (G.fn ? checkAll(...[-3, 0, 2.5].map((x) => checkEqual(G.g(x, G.fns[0].f(x)), 0))) : checkAll(checkEqual(G.g(G.c, G.ys[0]), 0), checkEqual(G.g(G.c, G.ys[1]), 0), G.ys[0] !== G.ys[1] ? true : 'one point only')),
  });
}

const GRAPH_STORIES = [
  { lead: 'The graph shows the temperature in a greenhouse, in °C, over time.', x: 'hour', yLab: '°C', base: 10, mult: 1, what: 'the temperature', word: { up: 'rising', down: 'falling', flat: 'not changing' } },
  { lead: 'The graph shows the amount of water in a tank, in liters, over time.', x: 'minute', yLab: 'liters', base: 0, mult: 10, what: 'the amount of water', word: { up: 'increasing', down: 'decreasing', flat: 'staying the same' } },
  { lead: 'The graph shows the height of a kite, in meters, over time.', x: 'second', yLab: 'm', base: 0, mult: 5, what: 'the kite', word: { up: 'going up', down: 'coming down', flat: 'staying at the same height' } },
];

function mediumDescribeGraph(rng) {
  const c = rng.pick(GRAPH_STORIES);
  const ask = rng.pick(['up', 'down', 'flat']);
  for (;;) {
    const others = ['up', 'down', 'flat'].filter((t) => t !== ask);
    const types = rng.shuffle([ask, rng.pick(others), rng.pick(others), rng.pick(others)]);
    const lens = [0, 1, 2, 3].map(() => rng.int(2, 3));
    const xs = [0];
    lens.forEach((l) => xs.push(xs[xs.length - 1] + l));
    const ys = [rng.int(2, 8)];
    types.forEach((t) => ys.push(ys[ys.length - 1] + (t === 'up' ? rng.int(1, 4) : t === 'down' ? -rng.int(1, 4) : 0)));
    if (ys.some((y) => y < 1 || y > 10) || types.some((t, i) => i > 0 && t === types[i - 1])) continue;
    const Y = ys.map((y) => c.base + c.mult * y);
    const iv = (i) => `from ${c.x} ${xs[i]} to ${c.x} ${xs[i + 1]}`;
    const goes = { up: 'goes up', down: 'goes down', flat: 'is flat' };
    const idx = types.indexOf(ask);
    return q({
      prompt: `${c.lead} During which time is ${c.what} ${c.word[ask]}?`,
      visual: { type: 'plot', x: [0, xs[4]], y: [c.base, c.base + 11 * c.mult], step: [1, c.mult], axisLabels: [`${c.x}s`, c.yLab], segments: [0, 1, 2, 3].map((i) => ({ from: [xs[i], Y[i]], to: [xs[i + 1], Y[i + 1]], color: 'a' })), points: xs.map((x, i) => ({ x, y: Y[i] })), alt: `A graph made of straight pieces joining the points ${xs.map((x, i) => lab(x, Y[i])).join(', ')}.` },
      correct: cap(iv(idx)),
      wrong: [0, 1, 2, 3].filter((i) => i !== idx).map((i) => ({ value: cap(iv(i)), why: `From ${c.x} ${xs[i]} to ${c.x} ${xs[i + 1]} the graph ${goes[types[i]]}, so ${c.what} is ${c.word[types[i]]}.` })),
      solution: [`Read the graph from left to right. Going up means increasing, going down means decreasing, and flat means constant.`, `The graph ${goes[ask]} only ${iv(idx)}: ${ask === 'flat' ? `it stays at ${txt(Y[idx])}` : `from ${txt(Y[idx])} to ${txt(Y[idx + 1])}`} ${c.yLab}.`, `So ${c.what} is ${c.word[ask]} ${iv(idx)}.`],
      rule: 4,
      skill: 'reading a graph',
      check: () => {
        const sign = (i) => Math.sign(Y[i + 1] - Y[i]);
        const want = { up: 1, down: -1, flat: 0 }[ask];
        return [0, 1, 2, 3].filter((i) => sign(i) === want).join() === String(idx) ? true : 'the interval does not match';
      },
    });
  }
}

// ───────────── Hard (grade 8): comparing functions in different forms, describing a table ─────────────

const COMPARE = [
  { who: (rng) => people(rng, 2), lead: 'Two friends are saving money.', per: 'week', amt: (v) => money(v), descA: (n, b, r) => `${n} has ${money(b)} saved and adds ${money(r)} each week.`, eqA: (n, b, r) => R`${n}'s savings after \(x\) weeks are \(y = ${linear(r, b)}\) dollars.`, own: (n) => `${n}'s savings`, col: 'Savings ($)', start: 'started with more money', rate: 'is saving faster', at: (x) => `After ${x} weeks, who has more money saved, and how much more?` },
  { who: () => ['Tank A', 'Tank B'], lead: 'Two tanks are being filled with water.', per: 'minute', amt: (v) => `${txt(v)} liters`, descA: (n, b, r) => `${n} holds ${b} liters and is filled at ${r} liters per minute.`, eqA: (n, b, r) => R`The water in ${n} after \(x\) minutes is \(y = ${linear(r, b)}\) liters.`, own: (n) => `the water in ${n}`, col: 'Water (liters)', start: 'started with more water', rate: 'is filling faster', at: (x) => `After ${x} minutes, which tank holds more water, and how much more?` },
];

function hardCompare(rng) {
  const c = rng.pick(COMPARE);
  const [A, B] = c.who(rng);
  for (;;) {
    const [m1, m2] = [rng.int(2, 12), rng.int(2, 12)];
    const [b1, b2] = [5 * rng.int(1, 12), 5 * rng.int(1, 12)];
    const s = rng.pick([1, 2, 3, 5]);
    const x0 = rng.int(3, 10);
    const [v1, v2] = [m1 * x0 + b1, m2 * x0 + b2];
    if (m1 === m2 || b1 === b2 || v1 === v2) continue;
    const ask = rng.pick(['rate', 'start', 'at']);
    const asGraph = rng.bool(0.4);
    const unit = c.amt;
    const sayRate = (w, d) => `${w}, by ${unit(d)} per ${c.per}`;
    const say = (w, d) => `${w}, by ${unit(d)}`;
    const rows = [1, 2, 3, 4].map((i) => [s * i, b2 + m2 * s * i]);
    const top = b2 + m2 * 10;
    const visual = asGraph
      ? { type: 'plot', x: [0, 10], y: [0, top + 10], axisLabels: [`${c.per}s`, c.col], fns: [{ f: (x) => b2 + m2 * x, domain: [0, 10] }], points: [{ x: 0, y: b2, label: lab(0, b2) }, { x: s, y: b2 + m2 * s, label: lab(s, b2 + m2 * s) }], alt: `A straight line for ${B}, starting at ${lab(0, b2)} and passing through ${lab(s, b2 + m2 * s)}.` }
      : xyTable(rows, `A table for ${B}. ${rows.map(([x, y]) => `After ${x} ${c.per}${x === 1 ? '' : 's'}: ${y}`).join('. ')}.`, [`${cap(c.per)}s`, c.col]);
    const descA = rng.bool() ? c.descA(A, b1, m1) : c.eqA(A, b1, m1);
    const question = { rate: `Which one ${c.rate}, and by how much?`, start: `Which one ${c.start}, and by how much?`, at: c.at(x0) }[ask];
    const raw = m2 * s;
    let correct;
    let wrong;
    if (ask === 'rate') {
      correct = sayRate(m1 > m2 ? A : B, Math.abs(m1 - m2));
      wrong = [{ value: sayRate(m1 > m2 ? B : A, Math.abs(m1 - m2)), why: R`Compare the rates: \(${m1}\) for ${A} and \(${m2}\) for ${B}.` }, raw !== m2 && raw !== m1 ? { value: sayRate(m1 > raw ? A : B, Math.abs(m1 - raw)), why: R`\(${raw}\) is the change over ${s} ${c.per}s. Divide by ${s} to get the rate for one ${c.per}: \(${m2}\).` } : null, { value: sayRate(b1 > b2 ? A : B, Math.abs(b1 - b2)), why: 'That compares the starting amounts, not the rates of change.' }, sayRate(m1 > m2 ? A : B, m1 + m2)];
    } else if (ask === 'start') {
      const y1 = rows[0][1];
      correct = say(b1 > b2 ? A : B, Math.abs(b1 - b2));
      wrong = [{ value: say(b1 > b2 ? B : A, Math.abs(b1 - b2)), why: R`Compare the starting amounts: \(${b1}\) for ${A} and \(${b2}\) for ${B}.` }, asGraph || y1 === b1 ? null : { value: say(b1 > y1 ? A : B, Math.abs(b1 - y1)), why: R`\(${y1}\) is the amount after ${s} ${c.per}${s === 1 ? '' : 's'}. The starting amount is the value when \(x = 0\).` }, { value: say(m1 > m2 ? A : B, Math.abs(m1 - m2)), why: 'That compares the rates of change, not the starting amounts.' }, say(b1 > b2 ? A : B, b1 + b2)];
    } else {
      correct = say(v1 > v2 ? A : B, Math.abs(v1 - v2));
      wrong = [{ value: say(b1 > b2 ? A : B, Math.abs(b1 - b2)), why: `That compares the starting amounts. Work out both amounts after ${x0} ${c.per}s.` }, { value: say(v1 > v2 ? B : A, Math.abs(v1 - v2)), why: R`After ${x0} ${c.per}s, ${A} has \(${v1}\) and ${B} has \(${v2}\).` }, { value: say(m1 > m2 ? A : B, Math.abs(m1 - m2) * x0), why: 'That uses only the rates and leaves out the starting amounts.' }, say(v1 > v2 ? A : B, v1 + v2)];
    }
    const distinct = new Set(wrong.filter(Boolean).map((w) => w.value ?? w).filter((w) => w !== correct));
    if (distinct.size < 3) continue;
    const readB = asGraph ? R`From the graph, ${B} starts at \(${b2}\) and goes up \(${raw}\) in ${s} ${c.per}${s === 1 ? '' : 's'}, so the rate for ${B} is \(${m2}\) per ${c.per}.` : R`In the table, \(x\) goes up by ${s} and \(y\) goes up by \(${raw}\) from row to row, so the rate is \(\frac{${raw}}{${s}} = ${m2}\) per ${c.per}. Going back ${s} ${c.per}${s === 1 ? '' : 's'} from the first row gives the starting amount: \(${rows[0][1]} - ${raw} = ${b2}\).`;
    return q({
      prompt: `${c.lead} ${descA} The ${asGraph ? 'graph' : 'table'} shows ${c.own(B)}. ${question}`,
      visual,
      correct,
      wrong,
      solution: [R`${A}: the starting amount is \(${b1}\) and the rate is \(${m1}\) per ${c.per}.`, readB, ask === 'at' ? R`After ${x0} ${c.per}s: ${A} has \(${m1}(${x0}) + ${b1} = ${v1}\) and ${B} has \(${m2}(${x0}) + ${b2} = ${v2}\).` : ask === 'rate' ? R`Compare the rates: \(${Math.max(m1, m2)} - ${Math.min(m1, m2)} = ${Math.abs(m1 - m2)}\).` : R`Compare the starting amounts: \(${Math.max(b1, b2)} - ${Math.min(b1, b2)} = ${Math.abs(b1 - b2)}\).`, `So the answer is: ${correct}.`],
      rule: 3,
      skill: 'comparing functions',
      check: () => {
        const rateB = (rows[3][1] - rows[0][1]) / (rows[3][0] - rows[0][0]);
        const startB = rows[0][1] - rateB * rows[0][0];
        return checkAll(checkEqual(rateB, m2), checkEqual(startB, b2), checkEqual(rateB * x0 + startB, v2));
      },
    });
  }
}

const RATE_STORIES = [
  { lead: (n) => `${n} is filling a bucket with a hose.`, x: 'second', y: 'liters', head: 'Liters', sign: 1, start: [0, 6], rate: [1, 4], what: 'the amount of water in the bucket' },
  { lead: (n) => `${n} is riding home from a friend's house.`, x: 'minute', y: 'blocks', head: 'Blocks from home', sign: -1, start: [30, 60], rate: [2, 5], what: `the distance from home` },
  { lead: (n) => `${n} is saving money in a jar.`, x: 'week', y: 'dollars', head: 'Dollars', sign: 1, start: [5, 40], rate: [3, 12], what: 'the money in the jar' },
];

function hardRateAndStart(rng) {
  const c = rng.pick(RATE_STORIES);
  const name = person(rng);
  const r = rng.int(...c.rate);
  const b = rng.int(...c.start);
  const k = c.sign * r;
  const s = rng.pick([2, 3, 4]);
  const x1 = s * rng.int(1, 2);
  const rows = [0, 1, 2, 3].map((i) => [x1 + s * i, b + k * (x1 + s * i)]);
  if (rows.some(([, y]) => y < 0)) return hardRateAndStart(rng);
  const asGraph = rng.bool(0.4);
  const say = (rate, start) => `Rate of change ${txt(rate)} ${c.y} per ${c.x}; initial value ${txt(start)} ${c.y}`;
  const [xa, ya] = rows[0];
  const [xb, yb] = rows[1];
  const visual = asGraph
    ? { type: 'plot', x: [0, rows[3][0] + s], y: [0, Math.max(b, rows[3][1]) * 1.25 + 2], axisLabels: [`${c.x}s`, c.head.toLowerCase()], fns: [{ f: (x) => b + k * x, domain: [0, rows[3][0] + s] }], points: [{ x: xa, y: ya, label: lab(xa, ya) }, { x: xb, y: yb, label: lab(xb, yb) }], alt: `A straight line through the marked points ${lab(xa, ya)} and ${lab(xb, yb)}.` }
    : xyTable(rows, `A table. ${rows.map(([x, y]) => `After ${x} ${c.x}s: ${y} ${c.y}`).join('. ')}.`, [`${cap(c.x)}s`, c.head]);
  return q({
    prompt: `${c.lead(name)} The ${asGraph ? 'graph' : 'table'} shows ${c.what}, which is a linear function of time. What are the rate of change and the initial value?`,
    visual,
    correct: say(k, b),
    wrong: [
      { value: say(k, ya), why: R`\(${ya}\) is the value after ${xa} ${c.x}s. The initial value is the value at time 0, so go back ${xa} ${c.x}s.` },
      { value: say(yb - ya, b), why: R`\(${yb - ya}\) is the change over ${s} ${c.x}s. Divide by ${s} to get the change for one ${c.x}.` },
      { value: say(-k, b), why: `${cap(c.what)} ${k > 0 ? 'goes up' : 'goes down'} over time, so the rate of change is ${k > 0 ? 'positive' : 'negative'}.` },
      say(b, k),
    ],
    solution: [R`Rate of change: \(\frac{${yb} - ${ya}}{${xb} - ${xa}} = \frac{${yb - ya}}{${s}} = ${k}\) ${c.y} per ${c.x}.`, R`Initial value: go back ${xa} ${c.x}s from \(${point(xa, ya)}\): \(${ya} - ${xa} \times ${paren0(k)} = ${b}\).`, `So the rate of change is ${txt(k)} ${c.y} per ${c.x} and the initial value is ${b} ${c.y}.`],
    rule: 3,
    skill: 'rate of change and initial value',
    check: () => checkAll(checkEqual((rows[3][1] - rows[0][1]) / (rows[3][0] - rows[0][0]), k), ...rows.map(([x, y]) => checkEqual(b + k * x, y))),
  });
}
const paren0 = (v) => (v < 0 ? `(${v})` : `${v}`);

const SHAPES = { incLin: 'Increasing and linear', incNon: 'Increasing but not linear', decLin: 'Decreasing and linear', decNon: 'Decreasing but not linear', flat: 'Constant' };

function hardDescribeTable(rng) {
  const kind = rng.pick(Object.keys(SHAPES));
  const xs = [0, 1, 2, 3, 4];
  const [a, b] = [rng.int(2, 9), rng.int(1, 20)];
  const ys = {
    incLin: () => xs.map((x) => b + a * x),
    decLin: () => xs.map((x) => 4 * a + b - a * x),
    incNon: () => rng.pick([() => xs.map((x) => x * x + b), () => xs.map((x) => a * 2 ** x), () => xs.map((x) => (x * (x + 1)) / 2 + b)])(),
    decNon: () => rng.pick([() => xs.map((x) => 40 + b - x * x), () => xs.map((x) => a * 2 ** (4 - x)), () => xs.map((x) => 30 + b - (x * (x + 1)) / 2)])(),
    flat: () => xs.map(() => b),
  }[kind]();
  const d = diffs(ys);
  const linear = new Set(d).size === 1;
  const flip = { incLin: 'incNon', incNon: 'incLin', decLin: 'decNon', decNon: 'decLin', flat: 'incLin' };
  const turn = { incLin: 'decLin', incNon: 'decNon', decLin: 'incLin', decNon: 'incNon', flat: 'decLin' };
  const why = {
    lin: R`Look at the changes in \(y\): ${d.map((v) => txt(v)).join(', ')}. They ${linear ? 'are all the same, so the function is linear' : 'are not all the same, so the function is not linear'}.`,
    dir: `As x goes up, y ${kind.startsWith('inc') ? 'goes up' : kind.startsWith('dec') ? 'goes down' : 'stays the same'}.`,
  };
  return q({
    prompt: 'Which description fits the function in the table?',
    visual: xyTable(xs.map((x, i) => [x, ys[i]]), `A table. ${xs.map((x, i) => `When x is ${x}, y is ${ys[i]}`).join('. ')}.`),
    correct: SHAPES[kind],
    wrong: [{ value: SHAPES[flip[kind]], why: kind === 'flat' ? why.dir : why.lin }, { value: SHAPES[turn[kind]], why: why.dir }, ...rng.shuffle(Object.keys(SHAPES).filter((k) => ![kind, flip[kind], turn[kind]].includes(k))).map((k) => SHAPES[k])],
    solution: [R`The changes in \(y\) from one row to the next are ${d.map((v) => txt(v)).join(', ')}.`, kind === 'flat' ? 'Every change is 0: the output never changes, so the function is constant.' : `${kind.startsWith('inc') ? 'The changes are positive, so the function is increasing' : 'The changes are negative, so the function is decreasing'}. They are ${linear ? 'all the same, so it is linear' : 'not all the same, so it is not linear'}.`, `So it is: ${SHAPES[kind].toLowerCase()}.`],
    rule: 4,
    skill: 'describing a function',
    check: () => {
      const got = d.every((v) => v === 0) ? 'flat' : `${d.every((v) => v > 0) ? 'inc' : d.every((v) => v < 0) ? 'dec' : '?'}${linear ? 'Lin' : 'Non'}`;
      return got === kind ? true : `the table is really ${got}`;
    },
  });
}

// ───────────── Challenge: stories and graphs, choosing a value, when two functions meet ─────────────

const WALK = { away: 'walks away from home', stop: 'stops to rest', toward: 'walks back toward home', home: 'walks back home' };
const HILL = { away: 'walks uphill', stop: 'walks along flat ground', toward: 'walks downhill', home: 'walks downhill' };

function challengeStoryGraph(rng) {
  const name = person(rng);
  for (;;) {
    const types = ['away'];
    for (let i = 1; i < 3; i++) types.push(rng.pick(['away', 'stop', 'toward'].filter((t) => t !== types[i - 1])));
    const ts = [0];
    const ds = [0];
    for (const t of types) {
      ts.push(ts[ts.length - 1] + 5 * rng.int(1, 4));
      const last = ds[ds.length - 1];
      ds.push(t === 'away' ? last + 100 * rng.int(2, 6) : t === 'stop' ? last : last - 100 * rng.int(1, last / 100));
    }
    if (ds[3] > 1200 || ds.slice(1, 3).includes(0)) continue;
    const words = types.map((t, i) => (t === 'toward' && ds[i + 1] === 0 ? 'home' : t));
    const story = (w, dict = WALK) => `${name} ${w.map((t) => dict[t]).join(', then ')}.`;
    // Every other three-piece walk that starts by walking away and never repeats a piece.
    const alts = [];
    for (const t1 of ['stop', 'toward']) for (const t2 of ['away', 'stop', 'toward']) if (t2 !== t1 && `${t1},${t2}` !== `${types[1]},${types[2]}`) alts.push(['away', t1, t2]);
    const wrong = rng.shuffle(alts).map((w) => ({ value: story(w), why: `Check each piece of the graph in order: going up means moving away from home, flat means standing still, and going down means coming back toward home.` }));
    return q({
      prompt: `The graph shows ${name}'s distance from home, in meters, during a walk. Which story matches the graph?`,
      visual: { type: 'plot', x: [0, ts[3] + 5], y: [0, Math.max(...ds) + 200], step: [5, 100], axisLabels: ['minutes', 'meters'], segments: [0, 1, 2].map((i) => ({ from: [ts[i], ds[i]], to: [ts[i + 1], ds[i + 1]], color: 'a' })), points: ts.map((t, i) => ({ x: t, y: ds[i] })), alt: `A graph of distance from home against time, made of straight pieces joining ${ts.map((t, i) => `${t} minutes, ${ds[i]} meters`).join('; ')}.` },
      correct: story(words),
      wrong: [{ value: story(words, HILL), why: 'The graph shows distance from home, not the shape of the ground. A flat piece means the distance is not changing: standing still.' }, ...wrong],
      solution: [
        'The height of the graph is the distance from home. Going up: moving away. Flat: staying in one place. Going down: coming back toward home.',
        types.map((t, i) => `From ${ts[i]} to ${ts[i + 1]} minutes the graph ${t === 'away' ? `goes up from ${ds[i]} to ${ds[i + 1]} m` : t === 'stop' ? `stays at ${ds[i]} m` : `goes down from ${ds[i]} to ${ds[i + 1]} m`}.`).join(' '),
        `So the story is: ${story(words)}`,
      ],
      rule: 5,
      skill: 'matching a story to a graph',
      check: () => {
        const got = [0, 1, 2].map((i) => (ds[i + 1] > ds[i] ? 'away' : ds[i + 1] === ds[i] ? 'stop' : 'toward'));
        return got.join() === types.join() && ds.every((d) => d >= 0) ? true : 'the story does not match the graph';
      },
    });
  }
}

function challengeChooseK(rng) {
  const wantFn = rng.bool();
  for (;;) {
    const xs = rng.sample([-4, -2, -1, 0, 1, 2, 3, 5, 6, 7, 9], 3);
    const ys = rng.sample([-3, -1, 2, 4, 8, 10, 11, 12, 13, 15], 4);
    const yk = ys[3];
    const pairs = xs.map((x, i) => [x, ys[i]]);
    const fresh = rng.sample([-5, -3, 4, 8, 10, 11, 12, 13, 14, 15].filter((v) => !xs.includes(v)), 3);
    const outsNotIn = ys.slice(0, 3).filter((y) => !xs.includes(y));
    const shown = R`\(\{${[...pairs.map(([x, y]) => point(x, y)), `(k, ${yk})`].join(', ')}\}\)`;
    const withK = (k) => [...pairs, [k, yk]];
    if (outsNotIn.length < 1) continue;
    const correct = wantFn ? fresh[0] : rng.pick(xs);
    const wrong = wantFn
      ? xs.map((x) => ({ value: x, why: R`The input \(${x}\) is already paired with \(${pairs.find((p) => p[0] === x)[1]}\). With \(k = ${x}\), it would also be paired with \(${yk}\).` }))
      : [{ value: outsNotIn[0], why: R`\(${outsNotIn[0]}\) is an output. Using it as an input does not repeat any input, so the relation would still be a function.` }, ...fresh.filter((v) => v !== outsNotIn[0]).slice(0, 2)];
    return q({
      prompt: R`Here is a relation: ${shown}. Which value of \(k\) makes the relation ${wantFn ? '**a function**' : '**not** a function'}?`,
      correct,
      fmt: (v) => R`\(k = ${num(v)}\)`,
      wrong,
      solution: [
        'A relation is a function when no input is paired with two different outputs.',
        R`The inputs already used are \(${xs.join(', ')}\). The new pair has the output \(${yk}\), which is different from all the other outputs.`,
        wantFn ? R`So \(k\) must be a new input. Of the choices, only \(k = ${correct}\) is new.` : R`If \(k\) is one of those inputs, that input gets two outputs. So \(k = ${correct}\) makes it not a function.`,
      ],
      rule: 1,
      skill: 'making a relation a function',
      check: () => (isFunction(withK(correct)) === wantFn && wrong.every((w) => isFunction(withK(w.value ?? w)) !== wantFn) ? true : 'a choice gives the wrong result'),
    });
  }
}

const PLANS = [
  { thing: 'gym', A: 'Gym A', B: 'Gym B', per: 'month', join: 'to join' },
  { thing: 'phone plan', A: 'Plan A', B: 'Plan B', per: 'month', join: 'up front' },
  { thing: 'music lessons', A: 'Studio A', B: 'Studio B', per: 'lesson', join: 'to sign up' },
];

function challengeWhenEqual(rng) {
  const c = rng.pick(PLANS);
  for (;;) {
    const x = rng.int(2, 12);
    const [m1, m2] = [5 * rng.int(2, 10), 5 * rng.int(1, 8)];
    if (m1 <= m2) continue;
    const b1 = 5 * rng.int(0, 10);
    const b2 = b1 + (m1 - m2) * x;
    if (b2 > 400) continue;
    const rows = [1, 2, 3, 4].map((i) => [i, b2 + m2 * i]);
    const row1 = rows[0][1];
    const asInt = (n, d) => {
      const f = tryFrac(n, d);
      return f && f.isInt() && f.value > 0 && f.value !== x ? f.value : null;
    };
    return q({
      prompt: `${c.A} charges ${money(b1)} ${c.join} plus ${money(m1)} per ${c.per}. The table shows the total cost for ${c.B}. After how many ${c.per}s do the two cost the same?`,
      visual: xyTable(rows, `A table for ${c.B}. ${rows.map(([i, y]) => `${i} ${c.per}${i === 1 ? '' : 's'}: $${y}`).join('. ')}.`, [`${cap(c.per)}s`, 'Total cost ($)']),
      correct: x,
      fmt: (v) => R`\(${v}\) ${c.per}${v === 1 ? '' : 's'}`,
      wrong: [
        { value: asInt(row1 - b1, m1 - m2), why: R`\(${row1}\) dollars is the cost after 1 ${c.per}. ${c.B}'s starting cost is \(${row1} - ${m2} = ${b2}\).` },
        { value: asInt(b2 - b1, m1 + m2), why: 'Each ' + c.per + R` the gap closes by the difference of the rates, \(${m1} - ${m2}\), not their sum.` },
        { value: asInt(b2 - b1, m1), why: R`Both costs go up every ${c.per}. The gap closes by only \(${m1} - ${m2} = ${m1 - m2}\) dollars each ${c.per}.` },
        x + 1,
        x - 1 > 0 ? x - 1 : null,
      ],
      solution: [
        R`${c.B}: from the table the rate is \(${m2}\) dollars per ${c.per}, and the starting cost is \(${row1} - ${m2} = ${b2}\). So \(y = ${linear(m2, b2)}\).`,
        R`${c.A}: \(y = ${linear(m1, b1)}\).`,
        R`Set them equal: \(${linear(m1, b1)} = ${linear(m2, b2)}\). Subtract \(${m2}x\)${b1 ? R` and \(${b1}\)` : ''}: \(${m1 - m2}x = ${b2 - b1}\), so \(x = ${x}\).`,
        R`Check: after ${x} ${c.per}s both cost \(${m1 * x + b1}\) dollars.`,
      ],
      rule: 3,
      skill: 'when two functions are equal',
      check: () => checkAll(checkEqual(m1 * x + b1, rows[0][1] + (rows[1][1] - rows[0][1]) * (x - 1)), (m1 * (x - 1) + b1 - (b2 + m2 * (x - 1))) * (m1 * (x + 1) + b1 - (b2 + m2 * (x + 1))) < 0 ? true : 'not a crossing'),
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'functions',
  title: 'Functions & Variables',
  summary: 'Name independent and dependent variables, decide whether a relation is a function, compare functions, and read graphs as stories.',
  grade: 'Grades 6–8',
  standards: ['CCSS 6.EE.C.9', 'CCSS 8.F.A.1', 'CCSS 8.F.A.2', 'CCSS 8.F.B.5'],

  explain: {
    intro: R`Many quantities depend on others: the money earned depends on the hours worked. A **function** is a rule that gives exactly one output for each input. Functions can be shown with words, equations, tables, sets of ordered pairs, mapping diagrams and graphs, and each form tells the same story in a different way.`,
    rules: [
      { title: 'Independent and dependent variables', text: R`The **independent variable** is the input: the quantity that changes on its own or is chosen. The **dependent variable** is the output: it depends on the input. Write the dependent variable on its own, in terms of the independent one.`, example: R`Pens cost $3 each. The number of pens \(n\) is independent; the cost \(c\) is dependent: \(c = 3n\).` },
      { title: 'A function: one output for each input', text: R`A relation is a **function** if each input is paired with exactly one output. In a table, a set of ordered pairs or a mapping diagram, look for an input that appears twice with different outputs. Two inputs **may** share the same output.`, example: R`\(\{(1, 5), (2, 5), (3, 7)\}\) is a function. \(\{(1, 5), (1, 6), (3, 7)\}\) is not: the input 1 has two outputs.` },
      { title: 'The vertical line test', text: R`A graph shows \(y\) as a function of \(x\) if no vertical line crosses it more than once. If some vertical line crosses it twice, that input \(x\) has two outputs. Horizontal lines do not matter.`, example: R`A U-shaped curve opening up passes the test. A circle fails it: the line through its center crosses it twice.` },
      { title: 'Comparing functions', text: R`To compare two linear functions given in different forms, find the **rate of change** (how much the output changes for each 1 unit of input) and the **initial value** (the output when the input is 0) of each. In a table, divide the change in output by the change in input.`, example: R`\(y = 4x + 10\) has rate 4 and initial value 10. A table with \((2, 9), (4, 19)\) has rate \(\frac{10}{2} = 5\) and initial value \(9 - 2 \times 5 = -1\).` },
      { title: 'Describing a function', text: R`A function is **increasing** where its graph goes up from left to right, **decreasing** where it goes down, and **constant** where it is flat. It is **linear** if its graph is a straight line, which happens when equal steps in \(x\) always give equal changes in \(y\).`, example: R`Outputs 3, 5, 7, 9 for \(x = 0, 1, 2, 3\): increasing and linear. Outputs 1, 2, 4, 8: increasing but not linear.` },
      { title: 'Graphs tell stories', text: 'On a graph of distance from home against time, going up means moving away from home, a flat piece means staying in one place, and going down means coming back toward home. A steeper piece means moving faster. The graph is not a picture of the path.', example: 'Up for 10 minutes, flat for 5, then down to 0: walk away, stop, walk back home.' },
    ],
    vocab: [
      { term: 'input / output', def: 'The value that goes into a rule, and the value the rule gives back.' },
      { term: 'relation', def: 'Any set of input-output pairs.' },
      { term: 'function', def: 'A relation in which each input has exactly one output.' },
      { term: 'rate of change', def: 'How much the output changes for each 1 unit of input. For a line, it is the slope.' },
      { term: 'initial value', def: 'The output when the input is 0: the starting amount.' },
    ],
    mistakes: [
      'Thinking a repeated output breaks a function. Only a repeated input with different outputs does.',
      'Using horizontal lines for the test. The test for a function uses vertical lines.',
      'Reading the change between two table rows as the rate when the input goes up by more than 1. Divide by the change in input.',
      'Reading a distance graph as a picture of hills. A flat piece means standing still, not walking on flat ground.',
    ],
    visual: { type: 'plot', x: [-4, 4], y: [-2, 6], step: [1, 1], square: true, fns: [{ f: (x) => x * x - 1, label: 'y = x² − 1', labelAt: 2.4 }], vlines: [{ x: 1.5 }], points: [{ x: 1.5, y: 1.25, label: '(1.5, 1.25)' }], alt: 'The U-shaped graph of y = x² − 1 with a dashed vertical line at x = 1.5. The line crosses the graph only once, at (1.5, 1.25).' },
  },

  examples: [
    {
      title: 'Variables and an equation',
      word: true,
      problem: 'Wei earns $11 for each hour of work at a farm stand. Name the independent and dependent variables, and write an equation. How much does Wei earn in 6 hours?',
      steps: ['The number of hours, h, is chosen first: it is the independent variable. The money earned, m, depends on it: it is the dependent variable.', R`Each hour adds $11, so \(m = 11h\).`, R`When \(h = 6\): \(m = 11 \times 6 = 66\).`],
      answer: R`Independent: hours; dependent: money earned; \(m = 11h\); $66`,
      visual: xyTable([[1, 11], [2, 22], [3, 33], [6, 66]], 'A table of hours and earnings: 1 hour, $11; 2 hours, $22; 3 hours, $33; 6 hours, $66.', [R`Hours \(h\)`, R`Money \(m\) ($)`]),
    },
    {
      title: 'Is it a function?',
      problem: 'Is each relation a function? (a) the mapping diagram (b) the set {(2, 4), (5, 1), (2, 7), (6, 0)}',
      steps: [R`(a) The inputs 1 and 3 both point to 4, and 2 points to 6. Each input has one arrow, so it is a function. Sharing an output is allowed.`, R`(b) The input 2 appears twice, with outputs 4 and 7. So it is not a function.`],
      answer: '(a) a function; (b) not a function',
      visual: mapping([[1, 4], [2, 6], [3, 4]], 'A mapping diagram: 1 goes to 4, 2 goes to 6, and 3 goes to 4.'),
    },
    {
      title: 'The vertical line test',
      problem: R`Is the circle with center \((0, 0)\) and radius 5 the graph of a function?`,
      steps: [R`Try the vertical line \(x = 3\). It crosses the circle at \((3, 4)\) and \((3, -4)\).`, R`So the input 3 has two outputs, 4 and \(-4\).`, 'The circle fails the vertical line test: it is not a function.'],
      answer: 'No',
      visual: grid(-6, 6, { param: [{ x: (t) => 5 * Math.cos(t), y: (t) => 5 * Math.sin(t), t: [0, 2 * Math.PI] }], vlines: [{ x: 3 }], points: [{ x: 3, y: 4, label: '(3, 4)' }, { x: 3, y: -4, label: '(3, −4)' }], alt: 'A circle with center (0, 0) and radius 5. A dashed vertical line at x = 3 crosses it at (3, 4) and (3, −4).' }),
    },
    {
      title: 'Word problem: a walk',
      word: true,
      problem: "The graph shows Nadia's distance from home during a walk. Describe the walk.",
      steps: ['From 0 to 10 minutes the graph goes up from 0 to 600 m: Nadia walks away from home.', 'From 10 to 15 minutes it is flat at 600 m: Nadia stops.', 'From 15 to 20 minutes it goes down from 600 m to 0, more steeply than before: Nadia walks back home, faster than on the way out.'],
      answer: 'Nadia walks away from home, stops for 5 minutes, then walks back home faster.',
      visual: { type: 'plot', x: [0, 25], y: [0, 800], step: [5, 100], axisLabels: ['minutes', 'meters'], segments: [{ from: [0, 0], to: [10, 600], color: 'a' }, { from: [10, 600], to: [15, 600], color: 'a' }, { from: [15, 600], to: [20, 0], color: 'a' }], alt: 'Distance from home against time: straight pieces from (0, 0) to (10, 600), then flat to (15, 600), then down to (20, 0).' },
    },
  ],

  models: [
    {
      id: 'earning-table',
      title: 'Word problem: earning by the hour',
      word: true,
      intro: 'Choose the pay for one hour and the number of hours. The steps write the equation, and the table and graph show the function.',
      inputs: [{ name: 'r', label: 'Pay for one hour ($)', type: 'int', min: 1, max: 30, value: 12 }, { name: 'h', label: 'Hours worked', type: 'int', min: 0, max: 40, value: 6 }],
      compute({ r, h }) {
        const rows = [0, 1, 2, 3, 4].map((x) => [x, r * x]);
        return {
          problem: `Sam earns ${money(r)} for each hour of work. How much does Sam earn in ${h} hour${h === 1 ? '' : 's'}?`,
          steps: ['The number of hours h is the independent variable. The money earned m depends on it: it is the dependent variable.', R`Each hour adds \(${r}\) dollars, so \(m = ${terms([[r, 'h']])}\).`, R`When \(h = ${h}\): \(m = ${r} \times ${h} = ${r * h}\).`, 'Each number of hours gives exactly one amount of money, so m is a function of h.'],
          answer: `${money(r * h)}`,
          visual: [
            xyTable(rows, `A table: ${rows.map(([x, y]) => `${x} hours, $${y}`).join('; ')}.`, [R`Hours \(h\)`, R`Money \(m\) ($)`]),
            { type: 'plot', x: [0, Math.max(5, h) + 1], y: [0, r * (Math.max(5, h) + 1)], axisLabels: ['hours', 'dollars'], fns: [{ f: (x) => r * x, domain: [0, Math.max(5, h) + 1], dashed: true }], points: [{ x: h, y: r * h, label: lab(h, r * h), color: 'b' }], alt: `The line m = ${r}h starting at (0, 0), with the point ${lab(h, r * h)} marked.` },
          ],
        };
      },
    },
    {
      id: 'compare-two-plans',
      title: 'Word problem: compare two plans',
      word: true,
      intro: 'Two plans each charge a starting fee plus a monthly amount. Change the numbers and compare the two functions.',
      inputs: [{ name: 'b1', label: 'Plan A: starting fee ($)', type: 'int', min: 0, max: 100, value: 20 }, { name: 'm1', label: 'Plan A: each month ($)', type: 'int', min: 1, max: 50, value: 15 }, { name: 'b2', label: 'Plan B: starting fee ($)', type: 'int', min: 0, max: 100, value: 50 }, { name: 'm2', label: 'Plan B: each month ($)', type: 'int', min: 1, max: 50, value: 10 }],
      compute({ b1, m1, b2, m2 }) {
        const steps = [R`Plan A: initial value \(${b1}\), rate \(${m1}\) per month, so \(y = ${linear(m1, b1)}\).`, R`Plan B: initial value \(${b2}\), rate \(${m2}\) per month, so \(y = ${linear(m2, b2)}\).`];
        let answer;
        let meet = null;
        if (m1 === m2) {
          steps.push(b1 === b2 ? 'The two plans are exactly the same function.' : `The rates are equal, so the gap of ${money(Math.abs(b1 - b2))} never closes. Plan ${b1 < b2 ? 'A' : 'B'} is always cheaper.`);
          answer = b1 === b2 ? 'The plans always cost the same.' : `Plan ${b1 < b2 ? 'A' : 'B'} is always cheaper.`;
        } else {
          meet = (b2 - b1) / (m1 - m2);
          steps.push(R`Plan ${m1 > m2 ? 'A' : 'B'} has the greater rate of change: it costs \(${Math.abs(m1 - m2)}\) dollars more each month.`);
          steps.push(R`They cost the same when \(${linear(m1, b1)} = ${linear(m2, b2)}\): \(x = \frac{${b2 - b1}}{${m1 - m2}}${Number.isInteger(meet) ? ` = ${meet}` : R` \approx ${num(meet, { places: 2 })}`}\).`);
          answer = meet <= 0 ? `Plan ${m1 < m2 ? 'A' : 'B'} is cheaper for every month after the start.` : `They cost the same after ${Number.isInteger(meet) ? meet : `about ${num(meet, { places: 2 })}`} months. After that, Plan ${m1 < m2 ? 'A' : 'B'} is cheaper.`;
        }
        const X = Math.max(6, Math.ceil((meet ?? 0) * 1.4) + 1);
        const top = Math.max(b1 + m1 * X, b2 + m2 * X);
        return {
          problem: `Plan A costs ${money(b1)} to start plus ${money(m1)} each month. Plan B costs ${money(b2)} to start plus ${money(m2)} each month. Compare the plans.`,
          steps,
          answer,
          visual: { type: 'plot', x: [0, X], y: [0, top * 1.1], axisLabels: ['months', 'dollars'], fns: [{ f: (x) => b1 + m1 * x, domain: [0, X], label: 'A' }, { f: (x) => b2 + m2 * x, domain: [0, X], color: 'b', label: 'B', dashed: m1 === m2 && b1 === b2 }], points: meet > 0 ? [{ x: meet, y: b1 + m1 * meet }] : [], alt: `Two lines: Plan A from ${lab(0, b1)} rising ${m1} each month, and Plan B from ${lab(0, b2)} rising ${m2} each month.${meet > 0 ? ` They cross at x = ${num(meet, { places: 2 })}.` : ''}` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyVariables, easyEquation, easyTableEquation],
    medium: [mediumIsFunction, mediumVerticalLine, mediumDescribeGraph],
    hard: [hardCompare, hardRateAndStart, hardDescribeTable],
    challenge: [challengeStoryGraph, challengeChooseK, challengeWhenEqual],
  },
};
