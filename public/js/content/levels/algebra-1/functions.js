import { R, q, frac, tryFrac, fracTex, linear, terms, poly, num, txt, signed, paren, dot, money, range, round, rootsTex, polyEval, checkEqual, checkRoots, checkSame } from '../../lib/index.js';
import { between, outside, ray, solves, fitY, pointText, show } from './_shared.js';

const FN = ['f', 'g', 'h', 'p'];
const asX = (v) => R`\(x = ${num(v)}\)`;
const set = (s) => R`\(${s.tex}\)`;
const quad = (a, b, c) => (x) => a * x * x + b * x + c;
// ax² + bx + c with the number k substituted for x: 2(-3)^2 - 4(-3) + 1.
const sub = ([a, b, c], k) => terms([[a, `(${k})^2`], [b, `(${k})`], [c, '']]);
const xyTable = (rows, yHead = R`\(f(x)\)`) => ({ type: 'table', headers: [R`\(x\)`, yHead], rows });

// ───────────── Easy ─────────────

function easyIsFunctionTable(rng) {
  const isFn = rng.bool();
  const xs = rng.sample(range(-6, 9), 5);
  const ys = rng.sample(range(-9, 12), 5);
  if (isFn) ys[1] = ys[0]; // two inputs share an output: still a function
  else xs[1] = xs[0]; // one input has two outputs: not a function
  const xq = isFn ? xs[2] : xs[0];
  const yq = isFn ? ys[0] : ys[2];
  const YES = 'Yes. Each input has exactly one output.';
  const NO_X = R`No. The input \(${xq}\) has two different outputs.`;
  const NO_Y = R`No. The output \(${yq}\) is paired with two different inputs.`;
  const YES_Y = 'Yes. No output is repeated.';
  return q({
    prompt: R`Does this table show \(y\) as a function of \(x\)?`,
    visual: xyTable(rng.shuffle(xs.map((x, i) => [x, ys[i]])), R`\(y\)`),
    correct: isFn ? YES : NO_X,
    wrong: isFn
      ? [{ value: NO_Y, why: 'Two inputs may share an output. A function only needs each input to have one output.' }, NO_X, YES_Y]
      : [{ value: YES, why: R`Look for \(x = ${xq}\) in the table. It appears twice, with different outputs.` }, { value: YES_Y, why: 'Repeated outputs are not the test. Look for an input that appears with two different outputs.' }, NO_Y],
    solution: isFn
      ? [R`Check the inputs. Every \(x\)-value in the table appears only once, so each input has exactly one output.`, R`The output \(${yq}\) appears twice, but that is allowed. This is a function.`]
      : [R`Check the inputs. \(x = ${xq}\) appears twice, paired with \(${ys[0]}\) and with \(${ys[1]}\).`, 'One input with two different outputs means this is not a function.'],
    rule: 0,
    skill: 'identifying functions',
  });
}

function easyEvaluateLinear(rng) {
  const fn = rng.pick(FN);
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const b = rng.nonzero(-12, 12);
  const k = rng.nonzero(-6, 9);
  const ans = a * k + b;
  return q({
    prompt: R`If \(${fn}(x) = ${linear(a, b)}\), what is \(${fn}(${k})\)?`,
    correct: ans,
    wrong: [
      { value: a + k + b, why: R`\(${a}x\) means \(${a}\) times \(x\), so multiply \(${a}\) by \(${paren(k)}\).` },
      { value: tryFrac(k - b, a), why: R`That solves \(${linear(a, b)} = ${k}\). In \(${fn}(${k})\) the \(${k}\) is the input: substitute it for \(x\).` },
      a * k - b,
      a * k,
    ],
    solution: [
      R`\(${fn}(${k})\) means: replace \(x\) with \(${k}\) in the rule.`,
      R`\(${fn}(${k}) = ${a}(${k}) ${signed(b)} = ${a * k} ${signed(b)} = ${ans}\).`,
    ],
    rule: 2,
    skill: 'evaluating functions',
    check: () => checkEqual(polyEval([a, b], k), ans),
  });
}

function easyReadTable(rng) {
  const start = rng.int(-2, 3);
  const xs = range(start, start + 4);
  const [t, x0] = rng.sample(xs, 2);
  const pool = rng.shuffle(range(-9, 15).filter((v) => !xs.includes(v)));
  const out = new Map(xs.map((x, i) => [x, x === x0 ? t : pool[i]])); // t is planted as the output of x0
  const visual = xyTable(xs.map((x) => [x, out.get(x)]));
  const others = xs.filter((x) => x !== t && x !== x0);
  if (rng.bool()) {
    return q({
      prompt: R`The table shows some values of a function \(f\). What is \(f(${t})\)?`,
      visual,
      correct: out.get(t),
      wrong: [
        { value: x0, why: R`\(${x0}\) is the input whose output is \(${t}\). \(f(${t})\) asks for the output when the input is \(${t}\).` },
        out.get(others[0]),
        out.get(others[1]),
      ],
      solution: [R`\(f(${t})\) is the output for the input \(${t}\). Find \(${t}\) in the \(x\) column.`, R`The matching value in the \(f(x)\) column is \(${out.get(t)}\), so \(f(${t}) = ${out.get(t)}\).`],
      rule: 2,
      skill: 'function notation',
    });
  }
  return q({
    prompt: R`The table shows some values of a function \(f\). For which value of \(x\) is \(f(x) = ${t}\)?`,
    visual,
    correct: x0,
    fmt: asX,
    wrong: [
      { value: out.get(t), why: R`That is \(f(${t})\), the output for the input \(${t}\). In \(f(x) = ${t}\), the \(${t}\) is the output.` },
      t,
      others[0],
    ],
    solution: [R`\(f(x) = ${t}\) says the output is \(${t}\). Find \(${t}\) in the \(f(x)\) column.`, R`The matching input in the \(x\) column is \(${x0}\), so \(x = ${x0}\).`],
    rule: 2,
    skill: 'function notation',
  });
}

const RULES = [
  { f: 'C', v: 'h', a: [8, 15], b: [10, 40], up: true, unit: 'dollars', text: (rule) => R`Renting a kayak for \(h\) hours costs \(C(h) = ${rule}\) dollars.`, ask: (k) => `How much does it cost to rent the kayak for ${k} hours?` },
  { f: 'H', v: 't', a: [2, 3], b: [24, 36], up: false, unit: 'cm', text: (rule) => R`A candle is \(H(t) = ${rule}\) centimetres tall after burning for \(t\) hours.`, ask: (k) => `How tall is the candle after ${k} hours?` },
  { f: 'W', v: 'm', a: [12, 45], b: [100, 400], up: true, unit: 'litres', text: (rule) => R`A pool holds \(W(m) = ${rule}\) litres of water \(m\) minutes after a pump is switched on.`, ask: (k) => `How much water is in the pool after ${k} minutes?` },
  { f: 'P', v: 'n', a: [3, 9], b: [12, 30], up: true, unit: 'dollars', text: (rule) => R`A print shop charges \(P(n) = ${rule}\) dollars for an order of \(n\) posters.`, ask: (k) => `How much does an order of ${k} posters cost?` },
  { f: 'B', v: 'h', a: [5, 12], b: [100, 100], up: false, unit: 'percent', text: (rule) => R`A phone battery is at \(B(h) = ${rule}\) percent after \(h\) hours of video.`, ask: (k) => `What is the battery level after ${k} hours of video?` },
];

function easyStoryEvaluate(rng) {
  const c = rng.pick(RULES);
  const a = rng.int(...c.a);
  const b = rng.int(...c.b);
  const k = rng.int(2, 8);
  const rule = c.up ? terms([[a, c.v], [b, '']]) : terms([[b, ''], [-a, c.v]]);
  const ans = c.up ? a * k + b : b - a * k;
  return q({
    prompt: `${c.text(rule)} ${c.ask(k)}`,
    correct: ans,
    unit: c.unit,
    wrong: c.up
      ? [
          { value: a * k, why: `The fixed amount of ${b} still counts. Add it after multiplying.` },
          { value: (a + b) * k, why: R`Only \(${a}\) is multiplied by \(${c.v}\). The \(${b}\) is added once.` },
          a + b + k,
          a + b * k,
        ]
      : [
          { value: a * k, why: `That is how much has gone. Subtract it from the starting value, ${b}.` },
          { value: (b - a) * k, why: R`Only \(${a}\) is multiplied by \(${c.v}\). Do the multiplication before subtracting.` },
          b - a,
          b - a - k,
        ],
    solution: [
      R`The input is \(${k}\), so find \(${c.f}(${k})\): replace \(${c.v}\) with \(${k}\).`,
      c.up ? R`\(${c.f}(${k}) = ${a}(${k}) + ${b} = ${a * k} + ${b} = ${ans}\).` : R`\(${c.f}(${k}) = ${b} - ${a}(${k}) = ${b} - ${a * k} = ${ans}\).`,
      `The answer is ${txt(ans)} ${c.unit}.`,
    ],
    rule: 2,
    skill: 'functions in context',
    check: () => checkEqual(c.up ? polyEval([a, b], k) : polyEval([-a, b], k), ans),
  });
}

// ───────────── Medium ─────────────

function mediumEvaluateQuadratic(rng) {
  const fn = rng.pick(FN);
  const a = rng.nonzero(-3, 3);
  const b = rng.nonzero(-6, 6);
  const c = rng.nonzero(-9, 9);
  const k = rng.pick([-5, -4, -3, -2, -1, -4, -3, -2, 2, 3]);
  const ans = a * k * k + b * k + c;
  return q({
    prompt: R`If \(${fn}(x) = ${poly([a, b, c])}\), what is \(${fn}(${k})\)?`,
    correct: ans,
    wrong: [
      k < 0 ? { value: -a * k * k + b * k + c, why: R`\((${k})^2 = ${k * k}\), not \(${-k * k}\). A negative number squared is positive.` } : null,
      { value: 2 * a * k + b * k + c, why: R`\(x^2\) means \(x\) times \(x\), not 2 times \(x\).` },
      a * k * k - b * k + c,
      Math.abs(a) > 1 ? (a * k) ** 2 + b * k + c : null,
      a * k * k + b * k - c,
    ],
    solution: [
      R`Replace every \(x\) with \((${k})\): \(${fn}(${k}) = ${sub([a, b, c], k)}\).`,
      R`Powers first: \((${k})^2 = ${k * k}\). Then multiply: \(${fn}(${k}) = ${terms([[a * k * k, ''], [b * k, ''], [c, '']])}\).`,
      R`Add and subtract from left to right: \(${fn}(${k}) = ${ans}\).`,
    ],
    rule: 2,
    skill: 'evaluating functions',
    check: () => checkEqual(polyEval([a, b, c], k), ans),
  });
}

function mediumSolveForInput(rng) {
  const fn = rng.pick(FN);
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const b = rng.nonzero(-12, 12);
  const x0 = rng.nonzero(-8, 8);
  const c = a * x0 + b;
  return q({
    prompt: R`If \(${fn}(x) = ${linear(a, b)}\), for what value of \(x\) is \(${fn}(x) = ${c}\)?`,
    correct: x0,
    fmt: asX,
    wrong: [
      { value: a * c + b, why: R`That is \(${fn}(${c})\), the output for the input \(${c}\). Here \(${c}\) is the output, and the question asks for the input.` },
      frac(c + b, a),
      -x0,
      frac(c, a).sub(b),
    ],
    solution: [
      R`The output is known and the input is not. Set the rule equal to \(${c}\): \(${linear(a, b)} = ${c}\).`,
      R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\): \(${a}x = ${c - b}\). Divide by \(${a}\): \(x = ${x0}\).`,
      R`Check: \(${fn}(${x0}) = ${a}(${x0}) ${signed(b)} = ${c}\). ✓`,
    ],
    rule: 2,
    skill: 'solving f(x) = c',
    check: solves((t) => a * t + b, () => c, x0),
  });
}

function mediumDomainRangeGraph(rng) {
  const x1 = rng.int(-6, -1);
  const x2 = rng.int(1, 6);
  const y1 = rng.int(-5, 6);
  const y2 = rng.intExcept(-5, 6, [y1]);
  if (x1 === Math.min(y1, y2) && x2 === Math.max(y1, y2)) return mediumDomainRangeGraph(rng);
  const openL = rng.bool(0.3);
  const openR = rng.bool(0.3);
  const askDomain = rng.bool();
  const v = askDomain ? 'x' : 'y';
  const op = (open) => (open ? 'lt' : 'le');
  const acrossX = (oL, oR) => between(x1, op(oL), op(oR), x2, v);
  const acrossY = (oL, oR) => (y2 > y1 ? between(y1, op(oL), op(oR), y2, v) : between(y2, op(oR), op(oL), y1, v));
  const [right, other] = askDomain ? [acrossX, acrossY] : [acrossY, acrossX];
  const [vL, vR] = openL === openR ? [!openL, !openR] : [openR, openL]; // a different open/closed pattern
  const dot = (open) => (open ? 'an open' : 'a closed');
  const s = right(openL, openR);
  return q({
    prompt: `What is the ${askDomain ? 'domain' : 'range'} of the function shown in the graph?`,
    visual: {
      type: 'plot', x: [-8, 8], y: [-7, 8], step: [1, 1],
      fns: [{ f: (x) => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1), domain: [x1, x2] }],
      points: [{ x: x1, y: y1, open: openL, label: pointText(x1, y1) }, { x: x2, y: y2, open: openR, label: pointText(x2, y2) }],
      alt: `Graph of a line segment from ${pointText(x1, y1)}, marked with ${dot(openL)} dot, to ${pointText(x2, y2)}, marked with ${dot(openR)} dot.`,
    },
    correct: set(s),
    wrong: [
      { value: set(other(openL, openR)), why: askDomain ? 'Those are the y-values. The domain is read along the x-axis: how far left and right the graph reaches.' : 'Those are the x-values. The range is read along the y-axis: how low and high the graph reaches.' },
      { value: set(right(vL, vR)), why: 'A closed dot means that endpoint is included. An open dot means it is not.' },
      set(other(vL, vR)),
    ],
    solution: [
      askDomain ? R`The domain is the set of inputs. The graph reaches from \(x = ${x1}\) on the left to \(x = ${x2}\) on the right.` : R`The range is the set of outputs. The graph reaches from \(y = ${Math.min(y1, y2)}\) at its lowest to \(y = ${Math.max(y1, y2)}\) at its highest.`,
      R`The dot at \(${pointText(x1, y1).replace(/−/g, '-')}\) is ${openL ? 'open (not included)' : 'closed (included)'} and the dot at \(${pointText(x2, y2).replace(/−/g, '-')}\) is ${openR ? 'open (not included)' : 'closed (included)'}.`,
      R`So the ${askDomain ? 'domain' : 'range'} is \(${s.tex}\).`,
    ],
    rule: 3,
    skill: 'domain and range',
  });
}

function mediumVerticalLine(rng) {
  const h = rng.int(-2, 2);
  const k = rng.int(-2, 2);
  const shapes = [
    { isFn: true, alt: `An upward-opening parabola with its lowest point at ${pointText(h, k - 3)}.`, fns: [{ f: (x) => (x - h) ** 2 + k - 3 }] },
    { isFn: true, alt: `A downward-opening parabola with its highest point at ${pointText(h, k + 3)}.`, fns: [{ f: (x) => -((x - h) ** 2) + k + 3 }] },
    { isFn: true, alt: `A V-shaped graph with its corner at ${pointText(h, k - 2)}.`, fns: [{ f: (x) => Math.abs(x - h) + k - 2 }] },
    { isFn: false, edge: h - 3, dir: 1, alt: `A sideways parabola that opens to the right from the point ${pointText(h - 3, k)}.`, param: [{ x: (t) => (t - k) ** 2 + h - 3, y: (t) => t, t: [-7, 7] }], points: [{ x: h - 3, y: k }] },
    { isFn: false, edge: h + 3, dir: -1, alt: `A sideways parabola that opens to the left from the point ${pointText(h + 3, k)}.`, param: [{ x: (t) => -((t - k) ** 2) + h + 3, y: (t) => t, t: [-7, 7] }], points: [{ x: h + 3, y: k }] },
    { isFn: false, alt: `A circle with centre ${pointText(h, k)} and radius 3.`, param: [{ x: (t) => h + 3 * Math.cos(t), y: (t) => k + 3 * Math.sin(t), t: [0, 2 * Math.PI] }], points: [{ x: h - 3, y: k }, { x: h + 3, y: k }] },
  ];
  const s = rng.pick(shapes);
  const visual = { type: 'plot', x: [-7, 7], y: [-7, 7], step: [1, 1], square: true, fns: s.fns, param: s.param, points: s.points, alt: s.alt };
  const twice = s.edge != null ? s.edge + s.dir * rng.int(1, 3) : h + rng.int(-2, 2); // a vertical line that meets a non-function twice
  if (!s.isFn && rng.bool()) {
    const wrong = s.edge != null
      ? [{ value: s.edge, why: 'That line touches the graph at only one point.' }, { value: s.edge - s.dir, why: 'That line misses the graph completely.' }, s.edge - 2 * s.dir, s.edge - 3 * s.dir]
      : [{ value: h + 3, why: 'That line touches the circle at only one point.' }, { value: h - 4, why: 'That line misses the circle completely.' }, h - 3, h + 4];
    return q({
      prompt: R`This graph does **not** show \(y\) as a function of \(x\). Which vertical line proves it?`,
      visual,
      correct: twice,
      fmt: asX,
      wrong,
      solution: [
        R`A graph is a function only if no vertical line meets it more than once.`,
        R`The line \(x = ${twice}\) crosses this graph at two points, so the input \(${twice}\) has two different outputs.`,
      ],
      rule: 1,
      skill: 'vertical-line test',
    });
  }
  const YES = 'Yes. Every vertical line crosses the graph at most once.';
  const NO = 'No. Some vertical line crosses the graph more than once.';
  return q({
    prompt: R`Does this graph show \(y\) as a function of \(x\)?`,
    visual,
    correct: s.isFn ? YES : NO,
    wrong: s.isFn
      ? [
          { value: NO, why: 'Slide a vertical line across the graph. It never meets the graph twice.' },
          { value: 'No. Two different x-values have the same y-value.', why: 'That is allowed. A function needs one output for each input, and different inputs may share an output.' },
          { value: 'No. The graph is not a straight line.', why: 'A function does not have to be a line. Curves pass the vertical-line test too.' },
        ]
      : [
          { value: YES, why: R`Try the vertical line \(x = ${twice}\). It meets the graph at two points.` },
          { value: 'Yes. The graph is one smooth, unbroken curve.', why: 'Smoothness is not the test. Each x-value must have only one y-value.' },
          { value: 'Yes. Every x-value on the graph has at least one y-value.', why: 'At least one is not enough. A function gives exactly one output for each input.' },
        ],
    solution: s.isFn
      ? ['Use the vertical-line test: imagine sliding a vertical line across the graph.', 'It never meets the graph at more than one point, so each input has exactly one output. This is a function.']
      : ['Use the vertical-line test: imagine sliding a vertical line across the graph.', R`The line \(x = ${twice}\) meets the graph at two points, so that input has two outputs. This is not a function.`],
    rule: 1,
    skill: 'vertical-line test',
  });
}

const MEANINGS = [
  { f: 'h', v: 't', intro: R`\(h(t)\) is the height in metres of a drone \(t\) seconds after take-off.`, right: (a, b) => `After ${a} seconds, the drone is ${b} metres high.`, swap: (a, b) => `After ${b} seconds, the drone is ${a} metres high.`, rate: (a, b) => `The drone climbs ${b} metres every ${a} seconds.`, rate2: (a, b) => `The drone climbs ${a} metres every ${b} seconds.` },
  { f: 'C', v: 'n', intro: R`\(C(n)\) is the cost in dollars of \(n\) concert tickets.`, right: (a, b) => `${a} tickets cost ${money(b)} in total.`, swap: (a, b) => `${b} tickets cost ${money(a)} in total.`, rate: (a, b) => `Each ticket costs ${money(b)}.`, rate2: (a) => `Each ticket costs ${money(a)}.` },
  { f: 'T', v: 'm', intro: R`\(T(m)\) is the temperature in degrees of an oven \(m\) minutes after it is switched on.`, right: (a, b) => `After ${a} minutes, the oven is at ${b} degrees.`, swap: (a, b) => `After ${b} minutes, the oven is at ${a} degrees.`, rate: (a, b) => `The oven warms by ${b} degrees every ${a} minutes.`, rate2: (a, b) => `The oven warms by ${a} degrees every ${b} minutes.` },
  { f: 'D', v: 'g', intro: R`\(D(g)\) is the distance in kilometres a car can travel on \(g\) litres of fuel.`, right: (a, b) => `With ${a} litres of fuel, the car can travel ${b} kilometres.`, swap: (a, b) => `With ${b} litres of fuel, the car can travel ${a} kilometres.`, rate: (a, b) => `The car travels ${b} kilometres on each litre of fuel.`, rate2: (a) => `The car uses ${a} litres of fuel for each kilometre.` },
  { f: 'P', v: 'd', intro: R`\(P(d)\) is the number of visitors at a festival on day \(d\).`, right: (a, b) => `On day ${a}, the festival has ${b} visitors.`, swap: (a, b) => `On day ${b}, the festival has ${a} visitors.`, rate: (a, b) => `The number of visitors grows by ${b} each day.`, rate2: (a, b) => `In the first ${a} days, the festival has ${b} visitors in total.` },
];

function mediumStoryMeaning(rng) {
  const c = rng.pick(MEANINGS);
  const a = rng.int(2, 9);
  const b = rng.int(20, 95);
  return q({
    prompt: R`${c.intro} What does \(${c.f}(${a}) = ${b}\) mean?`,
    correct: c.right(a, b),
    wrong: [
      { value: c.swap(a, b), why: 'The number inside the parentheses is the input. The number after the equals sign is the output.' },
      { value: c.rate(a, b), why: 'One value of a function is a single input paired with its output. It is not a rate.' },
      c.rate2(a, b),
    ],
    solution: [
      R`In \(${c.f}(${a}) = ${b}\), the input is \(${a}\) and the output is \(${b}\).`,
      R`The input \(${c.v}\) and the output \(${c.f}(${c.v})\) are described in the first sentence. Put the numbers in: ${c.right(a, b)}`,
    ],
    rule: 2,
    skill: 'functions in context',
  });
}

// ───────────── Hard ─────────────

function hardAverageRate(rng) {
  const a = rng.nonzero(-3, 3);
  const b = rng.int(-6, 6);
  const c = rng.int(-9, 9);
  const p = rng.int(-4, 3);
  const w = rng.int(2, 5);
  const r = p + w;
  const f = quad(a, b, c);
  const [fp, fr] = [f(p), f(r)];
  if (fp === fr) return hardAverageRate(rng);
  const ans = (fr - fp) / w;
  return q({
    prompt: R`What is the average rate of change of \(f(x) = ${poly([a, b, c])}\) from \(x = ${p}\) to \(x = ${r}\)?`,
    correct: ans,
    wrong: [
      { value: fr - fp, why: R`That is the change in output. Divide it by the change in input, \(${r} - ${paren(p)} = ${w}\).` },
      { value: tryFrac(fr + fp, 2), why: 'That is the average of the two outputs. A rate of change is the change in output divided by the change in input.' },
      -ans,
      tryFrac(fr, r),
      ans + a,
    ],
    solution: [
      R`Find the two outputs: \(f(${p}) = ${sub([a, b, c], p)} = ${fp}\) and \(f(${r}) = ${sub([a, b, c], r)} = ${fr}\).`,
      R`Change in output: \(${fr} - ${paren(fp)} = ${fr - fp}\). Change in input: \(${r} - ${paren(p)} = ${w}\).`,
      R`Average rate of change: \(${fracTex(fr - fp, w)} = ${ans}\).`,
    ],
    rule: 5,
    skill: 'average rate of change',
    check: () => checkEqual(a * (p + r) + b, ans),
  });
}

function hardRateFromTable(rng) {
  const xs = [rng.int(-3, 2)];
  for (let i = 0; i < 4; i++) xs.push(xs[i] + rng.int(1, 3));
  const ys = xs.map(() => rng.int(-12, 20));
  const [i, j] = rng.pick([[0, 2], [0, 3], [0, 4], [1, 3], [1, 4], [2, 4]]);
  const dy = ys[j] - ys[i];
  const dx = xs[j] - xs[i];
  if (dy === 0 || Math.abs(dy) === dx) return hardRateFromTable(rng);
  const ans = frac(dy, dx);
  return q({
    prompt: R`The table shows values of a function \(f\). What is the average rate of change of \(f\) from \(x = ${xs[i]}\) to \(x = ${xs[j]}\)?`,
    visual: xyTable(xs.map((x, n) => [x, ys[n]])),
    correct: ans,
    wrong: [
      dx !== j - i ? { value: frac(dy, j - i), why: R`The \(x\)-values do not go up by 1 each row. Divide by the actual change in \(x\), which is \(${dx}\).` } : null,
      { value: dy, why: 'That is the change in output only. Divide it by the change in input.' },
      { value: frac(dx, dy), why: 'The change in output goes on top and the change in input goes underneath.' },
      ans.neg(),
    ],
    solution: [
      R`Read the two outputs from the table: \(f(${xs[i]}) = ${ys[i]}\) and \(f(${xs[j]}) = ${ys[j]}\).`,
      R`Change in output: \(${ys[j]} - ${paren(ys[i])} = ${dy}\). Change in input: \(${xs[j]} - ${paren(xs[i])} = ${dx}\).`,
      R`Average rate of change: \(${fracTex(dy, dx)}${ans.tex() === fracTex(dy, dx) ? '' : ` = ${ans.tex()}`}\).`,
    ],
    rule: 5,
    skill: 'average rate of change',
    check: () => (ans.n * dx === dy * ans.d ? true : 'rate does not match the table'),
  });
}

function hardKeyFeatures(rng) {
  const [mag, gap] = rng.pick([[1, 2], [1, 4], [1, 6], [2, 2], [0.5, 4], [0.25, 8], [0.5, 8]]);
  const a = rng.sign() * mag;
  const r1 = rng.int(-6, 6 - gap);
  const r2 = r1 + gap;
  const h = (r1 + r2) / 2;
  const k = -a * (gap / 2) ** 2;
  const up = a > 0;
  const visual = {
    type: 'plot', x: [r1 - 3, r2 + 3], y: [Math.min(k, 0) - 3, Math.max(k, 0) + 3], step: [1, 1],
    fns: [{ f: (x) => a * (x - r1) * (x - r2) }],
    points: [{ x: r1, y: 0 }, { x: r2, y: 0 }, { x: h, y: k }],
    alt: `A parabola opening ${up ? 'upward' : 'downward'} that crosses the x-axis at ${show(r1)} and ${show(r2)} and has its ${up ? 'lowest' : 'highest'} point at ${pointText(h, k)}.`,
  };
  const kind = rng.pick(['extreme', 'zeros', 'increasing', 'positive']);
  const word = up ? 'minimum' : 'maximum';
  if (kind === 'extreme') {
    return q({
      prompt: R`The graph shows a function \(f\). What is the ${word} value of \(f\)?`,
      visual,
      correct: k,
      wrong: [{ value: h, why: R`\(${h}\) is the \(x\)-value where the ${word} happens. The ${word} value is the \(y\)-coordinate of that point.` }, -k, r1, r2],
      solution: [R`The ${up ? 'lowest' : 'highest'} point of the graph is \(${pointText(h, k).replace(/−/g, '-')}\).`, R`The ${word} value is the output there, the \(y\)-coordinate: \(${k}\).`],
      rule: 4,
      skill: 'reading graphs',
    });
  }
  if (kind === 'zeros') {
    const eq = (list) => R`\(${rootsTex(list)}\)`;
    return q({
      prompt: R`The graph shows a function \(f\). For which values of \(x\) is \(f(x) = 0\)?`,
      visual,
      correct: eq([r1, r2]),
      wrong: [
        { value: eq([h]), why: R`That is where the turning point is. \(f(x) = 0\) where the graph meets the \(x\)-axis.` },
        eq([r1 - 1, r2 + 1]),
        eq([r1, h]),
        eq([k]),
      ],
      solution: [R`\(f(x) = 0\) means the output is 0, so the point is on the \(x\)-axis.`, R`The graph meets the \(x\)-axis at \(x = ${r1}\) and \(x = ${r2}\).`],
      rule: 4,
      skill: 'reading graphs',
    });
  }
  if (kind === 'increasing') {
    const s = ray(up ? 'gt' : 'lt', h);
    return q({
      prompt: R`The graph shows a function \(f\). For which values of \(x\) is \(f\) increasing?`,
      visual,
      correct: set(s),
      wrong: [
        { value: set(ray(up ? 'lt' : 'gt', h)), why: 'There the graph falls as you move from left to right, so the function is decreasing.' },
        { value: set(up ? outside('lt', r1, 'gt', r2) : between(r1, 'lt', 'lt', r2)), why: R`That is where the graph is above the \(x\)-axis. Increasing means the graph rises from left to right.` },
        set(ray(up ? 'gt' : 'lt', r2)),
        set(ray(up ? 'gt' : 'lt', r1)),
      ],
      solution: [R`Increasing means the graph rises as you move from left to right.`, R`The graph turns at \(x = ${h}\). It rises to the ${up ? 'right' : 'left'} of that point, so \(f\) is increasing for \(${s.tex}\).`],
      rule: 4,
      skill: 'reading graphs',
    });
  }
  const s = up ? outside('lt', r1, 'gt', r2) : between(r1, 'lt', 'lt', r2);
  return q({
    prompt: R`The graph shows a function \(f\). For which values of \(x\) is \(f(x) > 0\)?`,
    visual,
    correct: set(s),
    wrong: [
      { value: set(up ? between(r1, 'lt', 'lt', r2) : outside('lt', r1, 'gt', r2)), why: R`For those inputs the graph is below the \(x\)-axis, so the outputs are negative.` },
      { value: set(ray(up ? 'gt' : 'lt', h)), why: R`That is where the function is increasing. \(f(x) > 0\) asks where the graph is above the \(x\)-axis.` },
      set(ray('gt', r1)),
      set(ray('gt', 0)),
    ],
    solution: [R`\(f(x) > 0\) where the graph is above the \(x\)-axis.`, R`The graph crosses the axis at \(x = ${r1}\) and \(x = ${r2}\), and it is above the axis ${up ? 'outside' : 'between'} those values: \(${s.tex}\).`],
    rule: 4,
    skill: 'reading graphs',
  });
}

const DRAINS = [
  { out: 'W', story: (V, r) => R`A tank holds ${V} litres of water. It drains at ${r} litres per minute until it is empty, so the amount left after \(t\) minutes is \(W(t) = ${V} - ${r}t\).`, end: (n) => `After ${n} minutes the tank is empty` },
  { out: 'H', story: (V, r) => R`A candle is ${V} mm tall. It burns down ${r} mm each hour until nothing is left, so its height after \(t\) hours is \(H(t) = ${V} - ${r}t\).`, end: (n) => `After ${n} hours the candle is gone` },
  { out: 'S', story: (V, r) => R`A printer tray holds ${V} sheets. The printer uses ${r} sheets per minute until the tray is empty, so the number of sheets left after \(t\) minutes is \(S(t) = ${V} - ${r}t\).`, end: (n) => `After ${n} minutes the tray is empty` },
];

function hardStoryDomain(rng) {
  const c = rng.pick(DRAINS);
  const r = rng.int(2, 12);
  const n = rng.intExcept(5, 40, [r]);
  const V = r * n;
  const askDomain = rng.bool();
  const v = askDomain ? 't' : c.out;
  const chain = (hi) => R`\(0 \le ${v} \le ${hi}\)`;
  return q({
    prompt: R`${c.story(V, r)} What is the ${askDomain ? 'domain' : 'range'} of this function in the situation described?`,
    correct: chain(askDomain ? n : V),
    wrong: askDomain
      ? [
          { value: chain(V), why: `${V} is the starting amount, which is an output. The inputs are times, and they stop when the amount reaches 0.` },
          { value: R`\(t \ge 0\)`, why: `${c.end(n)}, so later times are not part of the situation.` },
          R`\(t \le ${n}\)`,
          chain(r),
        ]
      : [
          { value: chain(n), why: `${n} is a time, which is an input. The outputs run from the starting amount, ${V}, down to 0.` },
          { value: R`\(${c.out} \le ${V}\)`, why: 'The amount left cannot be negative, so the outputs stop at 0.' },
          R`\(${c.out} \ge 0\)`,
          chain(r),
        ],
    solution: [
      R`The situation starts at \(t = 0\) with \(${c.out}(0) = ${V}\).`,
      R`It ends when nothing is left: \(${V} - ${r}t = 0\), so \(t = ${n}\).`,
      askDomain ? R`The domain is the set of inputs that make sense: \(0 \le t \le ${n}\).` : R`The range is the set of outputs over that time: from \(${V}\) down to 0, so \(0 \le ${c.out} \le ${V}\).`,
    ],
    rule: 3,
    skill: 'domain and range',
    check: () => checkRoots((t) => V - r * t, [n]),
  });
}

// ───────────── Challenge ─────────────

function challengeExpressionInput(rng) {
  const h = rng.nonzero(-5, 5);
  const inp = linear(1, h);
  const form = (tex) => R`\(${tex}\)`;
  if (rng.bool()) {
    const a = rng.intExcept(-6, 6, [-1, 0, 1]);
    const b = rng.nonzero(-9, 9);
    return q({
      prompt: R`If \(f(x) = ${linear(a, b)}\), which expression equals \(f(${inp})\)?`,
      correct: form(linear(a, a * h + b)),
      wrong: [
        { value: form(linear(a, b + h)), why: R`The whole input \(${inp}\) replaces \(x\), so \(${a}\) multiplies both of its terms: \(${a}(${inp}) ${signed(b)}\).` },
        { value: form(linear(a, a * h)), why: R`After distributing, the \(${signed(b)}\) from the rule is still there.` },
        form(linear(a + h, b)),
        form(linear(a * h, b)),
        form(linear(a, a * h - b)),
        form(linear(a, a * h + b + 1)),
      ],
      solution: [
        R`Replace \(x\) with the whole expression \(${inp}\): \(f(${inp}) = ${a}(${inp}) ${signed(b)}\).`,
        R`Distribute: \(${linear(a, a * h)} ${signed(b)}\).`,
        R`Combine the constants: \(${linear(a, a * h + b)}\).`,
      ],
      rule: 2,
      skill: 'function notation',
      check: () => checkSame((t) => a * (t + h) + b, (t) => polyEval([a, a * h + b], t)),
    });
  }
  const c = rng.nonzero(-9, 9);
  return q({
    prompt: R`If \(f(x) = ${poly([1, 0, c])}\), which expression equals \(f(${inp})\)?`,
    correct: form(poly([1, 2 * h, h * h + c])),
    wrong: [
      { value: form(poly([1, 0, h * h + c])), why: R`\((${inp})^2\) means \((${inp})(${inp}) = ${poly([1, 2 * h, h * h])}\). The middle term is missing.` },
      { value: form(poly([1, 0, c + h])), why: R`The input is squared: \(f(${inp}) = (${inp})^2 ${signed(c)}\). This choice changes the output by \(${h}\) instead.` },
      form(poly([1, 2 * h, c])),
      form(poly([1, h, h * h + c])),
    ],
    solution: [
      R`Replace \(x\) with the whole expression \(${inp}\): \(f(${inp}) = (${inp})^2 ${signed(c)}\).`,
      R`Expand the square: \((${inp})(${inp}) = ${poly([1, 2 * h, h * h])}\).`,
      R`Combine the constants: \(${poly([1, 2 * h, h * h + c])}\).`,
    ],
    rule: 2,
    skill: 'function notation',
    check: () => checkSame((t) => (t + h) ** 2 + c, (t) => polyEval([1, 2 * h, h * h + c], t)),
  });
}

function challengeRateBackwards(rng) {
  const p = rng.int(-5, 4);
  const w = rng.int(2, 6);
  const r = p + w;
  const m = rng.nonzero(-6, 6);
  const y1 = rng.int(-10, 15);
  const y2 = y1 + m * w;
  const forward = rng.bool();
  const lead = R`The average rate of change of a function \(f\) from \(x = ${p}\) to \(x = ${r}\) is \(${m}\)`;
  const spread = R`The rate \(${m}\) applies to every unit of \(x\), and \(x\) changes by \(${w}\) units.`;
  return q({
    prompt: forward ? R`${lead}, and \(f(${p}) = ${y1}\). What is \(f(${r})\)?` : R`${lead}, and \(f(${r}) = ${y2}\). What is \(f(${p})\)?`,
    correct: forward ? y2 : y1,
    wrong: forward
      ? [{ value: y1 + m, why: spread }, { value: m * w, why: R`That is the change in output. Add it to the starting value, \(${y1}\).` }, y1 - m * w, y1 + m * r]
      : [{ value: y2 + m * w, why: R`From \(x = ${p}\) to \(x = ${r}\) the output changes by \(${m * w}\). To go back, undo that change.` }, { value: y2 - m, why: spread }, m * w, y2 - m * p],
    solution: forward
      ? [
          R`Average rate of change is change in output over change in input: \(\frac{f(${r}) - ${paren(y1)}}{${r} - ${paren(p)}} = ${m}\).`,
          R`The change in input is \(${w}\), so the change in output is \(${m} \cdot ${w} = ${m * w}\).`,
          R`\(f(${r}) = ${y1} + ${paren(m * w)} = ${y2}\).`,
        ]
      : [
          R`Average rate of change is change in output over change in input: \(\frac{${y2} - f(${p})}{${r} - ${paren(p)}} = ${m}\).`,
          R`The change in input is \(${w}\), so the change in output is \(${m} \cdot ${w} = ${m * w}\).`,
          R`\(f(${p}) = ${y2} - ${paren(m * w)} = ${y1}\).`,
        ],
    rule: 5,
    skill: 'average rate of change',
    check: () => checkEqual((y2 - y1) / (r - p), m),
  });
}

function challengeTwoInputs(rng) {
  const h = rng.int(-6, 6);
  const s = rng.int(2, 7);
  const c = rng.nonzero(-9, 9);
  const k = s * s + c;
  const base = h === 0 ? 'x' : linear(1, -h);
  const inner = h === 0 ? 'x^2' : `(${base})^2`;
  const rule = terms([[1, inner], [c, '']]);
  const roots = [h - s, h + s];
  const eq = (list) => R`\(${rootsTex(list)}\)`;
  const steps = [
    R`Set the rule equal to \(${k}\): \(${rule} = ${k}\).`,
    R`${c > 0 ? 'Subtract' : 'Add'} \(${Math.abs(c)}\): \(${inner} = ${s * s}\).`,
    R`Two numbers have a square of \(${s * s}\), so \(${base} = ${s}\) or \(${base} = ${-s}\).`,
  ];
  if (h !== 0) steps.push(R`${h > 0 ? 'Add' : 'Subtract'} \(${Math.abs(h)}\): \(x = ${h + s}\) or \(x = ${h - s}\).`);
  return q({
    prompt: R`If \(f(x) = ${rule}\), find every value of \(x\) for which \(f(x) = ${k}\).`,
    correct: eq(roots),
    wrong: [
      { value: eq([h + s]), why: R`Two numbers have a square of \(${s * s}\): \(${s}\) and \(${-s}\). Two different inputs can give the same output.` },
      { value: eq([h - s * s, h + s * s]), why: R`After isolating the square, take the square root: \(\sqrt{${s * s}} = ${s}\).` },
      h !== 0 ? eq([-h - s, -h + s]) : null,
      eq([h + s * s]),
      eq([h - s]),
    ],
    solution: steps,
    rule: 2,
    skill: 'solving f(x) = c',
    check: () => checkRoots((t) => (t - h) ** 2 + c - k, roots),
  });
}

const TRIPS = [
  { who: 'A cyclist', speed: [12, 26] },
  { who: 'A hiker', speed: [3, 6] },
  { who: 'A delivery van', speed: [30, 70] },
  { who: 'A ferry', speed: [15, 35] },
];

function challengeStoryRate(rng) {
  const c = rng.pick(TRIPS);
  const times = [0];
  for (let n = 0; n < 4; n++) times.push(times[n] + rng.int(1, 2));
  const [i, j] = rng.pick([[1, 3], [1, 4], [2, 4]]);
  const avg = rng.int(...c.speed);
  const dist = [0];
  for (let n = 0; n < 4; n++) dist.push(dist[n] + (times[n + 1] - times[n]) * rng.int(...c.speed));
  // Re-plan the legs between readings i and j so that their average speed is exactly `avg`.
  const bump = rng.nonzero(-2, 2) * (times[i + 1] - times[i]);
  for (let n = i; n < j; n++) dist[n + 1] = dist[n] + (times[n + 1] - times[n]) * avg + (n === i ? bump : n === j - 1 ? -bump : 0);
  for (let n = j; n < 4; n++) dist[n + 1] = dist[n] + (times[n + 1] - times[n]) * rng.int(...c.speed);
  const dt = times[j] - times[i];
  const dd = dist[j] - dist[i];
  if (dist.some((d, n) => n > 0 && d <= dist[n - 1]) || dist[j] === avg * times[j]) return challengeStoryRate(rng);
  return q({
    prompt: `${c.who} records the total distance travelled at several times during a trip. What is the average speed between ${times[i]} ${times[i] === 1 ? 'hour' : 'hours'} and ${times[j]} hours?`,
    visual: { type: 'table', headers: ['Time (hours)', 'Distance (km)'], rows: times.map((t, n) => [t, dist[n]]) },
    correct: avg,
    unit: 'km per hour',
    wrong: [
      { value: round(dist[j] / times[j], 1), why: `That is the average speed since the start of the trip. Use only the change between ${times[i]} and ${times[j]} hours.` },
      { value: dd, why: 'That is the distance covered between the two readings. Divide it by the time it took.' },
      dt !== j - i ? { value: round(dd / (j - i), 1), why: 'The readings are not equally spaced. Divide by the hours that passed, not by the number of rows.' } : null,
      (dist[j] + dist[i]) / 2,
    ],
    solution: [
      R`Average speed is the average rate of change of distance: change in distance divided by change in time.`,
      R`Change in distance: \(${dist[j]} - ${dist[i]} = ${dd}\) km. Change in time: \(${times[j]} - ${times[i]} = ${dt}\) hours.`,
      R`\(${fracTex(dd, dt)} = ${avg}\) km per hour.`,
    ],
    rule: 5,
    skill: 'average rate of change',
    check: () => (avg * dt === dd ? true : 'average speed does not match the table'),
  });
}

// ───────────── Interactive models ─────────────

function evaluateModel({ a, b, c, p }) {
  const f = quad(a, b, c);
  const ans = f(p);
  const rule = poly([a, b, c]);
  const steps = [R`\(f(${p})\) means: replace every \(x\) in the rule with \(${p}\). Use parentheses: \(f(${p}) = ${sub([a, b, c], p)}\).`];
  if (a !== 0) steps.push(R`Powers first: \((${p})^2 = ${p * p}\).`);
  if (a !== 0 || b !== 0) steps.push(R`Multiply, then add and subtract from left to right: \(${terms([[a * p * p, ''], [b * p, ''], [c, '']])} = ${ans}\).`);
  steps.push(R`So the input \(${p}\) is paired with the output \(${ans}\). The point \((${p}, ${ans})\) is on the graph.`);
  const [x0, x1] = [p - 4, p + 4];
  return {
    problem: R`\(f(x) = ${rule}\). Find \(f(${p})\).`,
    steps,
    answer: R`\(f(${p}) = ${ans}\)`,
    visual: { type: 'plot', x: [x0, x1], y: fitY(f, x0, x1), fns: [{ f }], points: [{ x: p, y: ans, label: pointText(p, ans) }], alt: `Graph of the function with the point ${pointText(p, ans)} marked.` },
  };
}

function rateModel({ a, b, c, p, r }) {
  if (p === r) return { error: 'The two x-values are the same, so the input does not change. Choose two different x-values.' };
  const f = quad(a, b, c);
  const [fp, fr] = [f(p), f(r)];
  const rate = frac(fr - fp, r - p);
  const [x0, x1] = [Math.min(p, r) - 2, Math.max(p, r) + 2];
  return {
    problem: R`Find the average rate of change of \(f(x) = ${poly([a, b, c])}\) from \(x = ${p}\) to \(x = ${r}\).`,
    steps: [
      R`Find the two outputs: \(f(${p}) = ${sub([a, b, c], p)} = ${fp}\) and \(f(${r}) = ${sub([a, b, c], r)} = ${fr}\).`,
      R`Change in output: \(${fr} - ${paren(fp)} = ${fr - fp}\).`,
      R`Change in input: \(${r} - ${paren(p)} = ${r - p}\).`,
      R`Divide: \(${fracTex(fr - fp, r - p)} = ${rate.tex()}\). This is the slope of the line through the two points.`,
    ],
    answer: R`Average rate of change \(= ${rate.tex()}\)`,
    visual: {
      type: 'plot', x: [x0, x1], y: fitY(f, x0, x1), fns: [{ f }],
      segments: [{ from: [p, fp], to: [r, fr], color: 'b' }],
      points: [{ x: p, y: fp, label: pointText(p, fp) }, { x: r, y: fr, label: pointText(r, fr) }],
      alt: `Graph of the function with the points ${pointText(p, fp)} and ${pointText(r, fr)} joined by a straight line whose slope is ${rate.text()}.`,
    },
  };
}

export default {
  id: 'functions',
  title: 'Functions & Function Notation',
  summary: 'Decide whether a relation is a function, use f(x) notation, find domain and range, and measure average rate of change.',
  standards: ['CCSS F-IF.A.1', 'CCSS F-IF.A.2', 'CCSS F-IF.B.4', 'CCSS F-IF.B.6'],

  explain: {
    intro: R`A function is a rule that takes each input and gives back exactly one output. Tables, graphs and formulas are three ways to show the same rule. Function notation, \(f(x)\), is a compact way to say which input goes in and which output comes out.`,
    rules: [
      {
        title: 'One output for each input',
        text: R`A relation is a function when every input is paired with exactly one output. In a table or a list of pairs, look for an input that appears twice with different outputs. Two different inputs may share an output; that is allowed.`,
        example: R`\((1, 4), (2, 4), (3, 7)\) is a function. \((1, 4), (1, 6), (3, 7)\) is not, because the input 1 has two outputs.`,
      },
      {
        title: 'The vertical-line test',
        text: R`On a graph, each \(x\)-value is a vertical line. If any vertical line meets the graph at more than one point, that input has more than one output, so the graph is not a function.`,
        example: R`A circle fails the test. The parabola \(y = x^2\) passes it.`,
      },
      {
        title: 'Function notation',
        text: R`\(f(x)\) is read "f of x" and means the output of \(f\) for the input \(x\). It does not mean \(f\) times \(x\). To evaluate \(f(3)\), replace every \(x\) in the rule with 3. To solve \(f(x) = 3\), set the rule equal to 3 and find the input.`,
        example: R`If \(f(x) = 2x + 5\), then \(f(3) = 2(3) + 5 = 11\). And \(f(x) = 3\) gives \(2x + 5 = 3\), so \(x = -1\).`,
      },
      {
        title: 'Domain and range',
        text: R`The domain is the set of all inputs; the range is the set of all outputs. On a graph, read the domain along the \(x\)-axis (how far left and right the graph reaches) and the range along the \(y\)-axis (how low and high). In a story, the domain is limited to inputs that make sense.`,
        example: R`A segment from \((-2, 1)\) to \((4, 5)\) has domain \(-2 \le x \le 4\) and range \(1 \le y \le 5\).`,
      },
      {
        title: 'Reading a graph',
        text: R`The \(y\)-intercept is \(f(0)\). The \(x\)-intercepts are where \(f(x) = 0\). The function is increasing where the graph rises from left to right and decreasing where it falls. A maximum or minimum value is the \(y\)-coordinate of the highest or lowest point.`,
        example: R`\(f(x) = x^2 - 4\) has \(x\)-intercepts \(-2\) and 2, \(y\)-intercept \(-4\), and a minimum value of \(-4\).`,
      },
      {
        title: 'Average rate of change',
        text: R`From \(x = a\) to \(x = b\), the average rate of change is \(\dfrac{f(b) - f(a)}{b - a}\): the change in output divided by the change in input. It is the slope of the line through the two points on the graph.`,
        example: R`For \(f(x) = x^2\) from \(x = 1\) to \(x = 3\): \(\frac{9 - 1}{3 - 1} = 4\).`,
      },
    ],
    vocab: [
      { term: 'relation', def: 'Any set of input-output pairs.' },
      { term: 'function', def: 'A relation in which each input has exactly one output.' },
      { term: 'domain', def: 'The set of all inputs of a function.' },
      { term: 'range', def: 'The set of all outputs of a function.' },
      { term: 'intercept', def: R`A point where a graph meets an axis. The \(y\)-intercept has \(x = 0\); an \(x\)-intercept has \(y = 0\).` },
      { term: 'average rate of change', def: 'Change in output divided by change in input between two points.' },
    ],
    mistakes: [
      R`Reading \(f(3)\) as "f times 3". It means the output when the input is 3.`,
      R`Mixing up \(f(2) = {?}\) and \(f(x) = 2\). In the first, 2 is the input. In the second, 2 is the output.`,
      R`Deciding a relation is not a function because an output repeats. Only a repeated input with different outputs breaks the rule.`,
      R`Losing the sign when squaring a negative input: \((-3)^2 = 9\), not \(-9\).`,
      'Stopping at the change in output for a rate of change. Divide by the change in input.',
    ],
    visual: {
      type: 'plot', x: [-2, 7], y: [-4, 4], step: [1, 1],
      param: [{ x: (t) => t * t, y: (t) => t, t: [-3, 3] }],
      vlines: [{ x: 4 }],
      points: [{ x: 4, y: 2, label: '(4, 2)' }, { x: 4, y: -2, label: '(4, −2)' }],
      alt: 'A sideways parabola. The dashed vertical line x = 4 meets it at two points, (4, 2) and (4, −2), so this graph is not a function.',
    },
  },

  examples: [
    {
      title: 'Is it a function?',
      problem: R`Does this table show \(y\) as a function of \(x\)?`,
      visual: { type: 'table', headers: [R`\(x\)`, R`\(y\)`], rows: [[-1, 5], [0, 2], [2, 5], [3, -1], [2, 4]] },
      steps: [
        R`A function gives each input exactly one output, so check the \(x\) column for repeats.`,
        R`The input \(2\) appears twice, once with \(5\) and once with \(4\).`,
        R`One input has two different outputs. (The repeated output 5 would not have been a problem.)`,
      ],
      answer: 'Not a function',
    },
    {
      title: 'Evaluating with a negative input',
      problem: R`For \(f(x) = 3x^2 - 2x + 1\), find \(f(-2)\).`,
      steps: [
        R`Replace every \(x\) with \((-2)\): \(f(-2) = 3(-2)^2 - 2(-2) + 1\).`,
        R`Powers first: \((-2)^2 = 4\). So \(f(-2) = 3(4) - 2(-2) + 1\).`,
        R`Multiply: \(12 + 4 + 1\).`,
        R`Add: \(f(-2) = 17\).`,
      ],
      answer: R`\(f(-2) = 17\)`,
    },
    {
      title: 'Domain and range from a graph',
      problem: 'Find the domain and range of the function in the graph.',
      visual: {
        type: 'plot', x: [-5, 6], y: [-5, 7], step: [1, 1],
        fns: [{ f: (x) => -0.5 * (x - 1) ** 2 + 5, domain: [-3, 4] }],
        points: [{ x: -3, y: -3, label: '(−3, −3)' }, { x: 4, y: 0.5, open: true, label: '(4, 0.5)' }, { x: 1, y: 5, label: '(1, 5)' }],
        alt: 'An arch that starts at the closed dot (−3, −3), rises to its highest point (1, 5) and falls to the open dot (4, 0.5).',
      },
      steps: [
        R`Domain: the graph reaches from \(x = -3\) (closed dot, included) to \(x = 4\) (open dot, not included). So \(-3 \le x < 4\).`,
        R`Range: the lowest point is \((-3, -3)\) and the highest is \((1, 5)\). Every height in between is reached.`,
        R`So the range is \(-3 \le y \le 5\). The open dot at height 0.5 does not matter, because that height is reached elsewhere on the graph.`,
      ],
      answer: R`Domain \(-3 \le x < 4\); range \(-3 \le y \le 5\)`,
    },
    {
      title: 'Average rate of change',
      problem: R`Find the average rate of change of \(f(x) = x^2 + 1\) from \(x = 1\) to \(x = 4\).`,
      steps: [
        R`Find the two outputs: \(f(1) = 2\) and \(f(4) = 17\).`,
        R`Change in output: \(17 - 2 = 15\). Change in input: \(4 - 1 = 3\).`,
        R`Divide: \(\frac{15}{3} = 5\). On average, the output rises 5 units for each 1 unit of \(x\).`,
      ],
      answer: '5',
      visual: {
        type: 'plot', x: [-1, 5], y: [-2, 20],
        fns: [{ f: (x) => x * x + 1, label: 'f(x) = x² + 1', labelAt: 3.4 }],
        segments: [{ from: [1, 2], to: [4, 17], color: 'b' }],
        points: [{ x: 1, y: 2, label: '(1, 2)' }, { x: 4, y: 17, label: '(4, 17)' }],
        alt: 'The curve f(x) = x² + 1 with the points (1, 2) and (4, 17) joined by a straight line of slope 5.',
      },
    },
    {
      title: 'Word problem: a taxi fare',
      word: true,
      problem: R`A taxi ride of \(m\) miles costs \(C(m) = 2.5m + 4\) dollars. (a) Find \(C(6)\) and say what it means. (b) A ride cost $24. How long was it?`,
      steps: [
        R`(a) The input is 6 miles: \(C(6) = 2.5(6) + 4 = 15 + 4 = 19\). A 6-mile ride costs $19.`,
        R`(b) Now the output is known: \(C(m) = 24\), so \(2.5m + 4 = 24\).`,
        R`Subtract 4: \(2.5m = 20\). Divide by 2.5: \(m = 8\).`,
        'The ride was 8 miles long. In (a) the number went in as the input; in (b) it was the output.',
      ],
      answer: '(a) $19 for 6 miles; (b) 8 miles',
    },
  ],

  models: [
    {
      id: 'evaluate',
      title: 'Evaluate f(x) = ax² + bx + c',
      intro: 'Choose the rule and an input. Set a to 0 for a linear function.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -5, max: 5, value: 3 },
        { name: 'b', label: 'b (coefficient of x)', type: 'int', min: -9, max: 9, value: -2 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'p', label: 'Input x', type: 'int', min: -6, max: 6, value: -2 },
      ],
      compute: evaluateModel,
    },
    {
      id: 'rate-of-change',
      title: 'Average rate of change between two inputs',
      intro: 'Choose the rule and two x-values. The orange line joins the two points; its slope is the average rate of change.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'b', label: 'b (coefficient of x)', type: 'int', min: -8, max: 8, value: 0 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'p', label: 'First x-value', type: 'int', min: -6, max: 6, value: 1 },
        { name: 'r', label: 'Second x-value', type: 'int', min: -6, max: 6, value: 4 },
      ],
      compute: rateModel,
    },
    {
      id: 'draining-tank',
      title: 'Word problem: a draining tank',
      word: true,
      intro: 'Change the amounts in the story. Try a time after the tank is empty.',
      inputs: [
        { name: 'V', label: 'Water at the start (litres)', type: 'int', min: 10, max: 2000, value: 600 },
        { name: 'r', label: 'Litres drained each minute', type: 'int', min: 1, max: 100, value: 40 },
        { name: 't', label: 'Time (minutes)', type: 'int', min: 0, max: 120, value: 9 },
      ],
      compute({ V, r, t }) {
        const end = frac(V, r);
        const endTex = end.isInt() ? end.tex() : R`${end.tex()} \approx ${num(end.value, { places: 1 })}`;
        const rule = terms([[V, ''], [-r, 't']]);
        const inDomain = r * t <= V;
        const left = V - r * t;
        return {
          problem: `A tank holds ${txt(V)} litres of water and drains at ${r} ${r === 1 ? 'litre' : 'litres'} per minute. How much water is left after ${t} ${t === 1 ? 'minute' : 'minutes'}?`,
          steps: [
            R`Each minute removes \(${r}\) ${r === 1 ? 'litre' : 'litres'}, so the amount left after \(t\) minutes is \(W(t) = ${rule}\).`,
            R`The tank is empty when \(W(t) = 0\): \(${rule} = 0\), so \(t = ${endTex}\).`,
            R`So the function only makes sense for \(0 \le t \le ${end.tex()}\) (its domain), and its outputs run from \(${V}\) down to 0 (its range, \(0 \le W \le ${V}\)).`,
            inDomain ? R`\(t = ${t}\) is in the domain: \(W(${t}) = ${V} - ${dot(r, t)} = ${left}\).` : R`\(t = ${t}\) is outside the domain. The formula would give \(${num(left)}\) litres, which is impossible: the tank is already empty.`,
          ],
          answer: inDomain ? `${txt(left)} ${left === 1 ? 'litre is' : 'litres are'} left after ${t} ${t === 1 ? 'minute' : 'minutes'}.` : `The tank is already empty, so 0 litres are left after ${t} minutes.`,
          visual: {
            type: 'plot', x: [0, Math.max(end.value * 1.15, t * 1.05, 1)], y: [0, V * 1.1], axisLabels: ['t', 'W'],
            fns: [{ f: (x) => V - r * x, domain: [0, end.value] }],
            points: [{ x: t, y: Math.max(left, 0), label: `(${show(t)}, ${show(Math.max(left, 0))})` }],
            alt: `Graph of the water left against time: a straight line falling from ${txt(V)} litres at 0 minutes to 0 litres at ${num(end.value, { places: 1 })} minutes.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyIsFunctionTable, easyEvaluateLinear, easyReadTable, easyStoryEvaluate],
    medium: [mediumEvaluateQuadratic, mediumSolveForInput, mediumDomainRangeGraph, mediumVerticalLine, mediumStoryMeaning],
    hard: [hardAverageRate, hardRateFromTable, hardKeyFeatures, hardStoryDomain],
    challenge: [challengeExpressionInput, challengeRateBackwards, challengeTwoInputs, challengeStoryRate],
  },
};
