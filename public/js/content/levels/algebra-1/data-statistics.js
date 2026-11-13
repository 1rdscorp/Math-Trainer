import { R, q, num, txt, linear, point, money, sum, round, clamp, range, plural, ordinal, joinList, person, checkEqual, checkAll } from '../../lib/index.js';

const sorted = (xs) => [...xs].sort((a, b) => a - b);
const mean = (xs) => sum(xs) / xs.length;
const median = (xs) => {
  const s = sorted(xs);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
// The two halves of the ordered data. When the count is odd, the median belongs to neither half.
const halves = (xs) => {
  const s = sorted(xs);
  const half = Math.floor(s.length / 2);
  return [s.slice(0, half), s.slice(s.length - half)];
};
const quartiles = (xs) => halves(xs).map(median);
// Three other common rules for quartiles: the median kept in both halves, and the two interpolation
// formulas that spreadsheets and statistics packages use. Quiz data are built so that every rule
// gives the same quartiles, and this check confirms it.
function ruleFree(xs) {
  const s = sorted(xs);
  const n = s.length;
  const half = Math.ceil(n / 2);
  const at = (i) => {
    const k = Math.floor(i); // the value at a fractional position, counting from 0
    return s[k] + (i - k) * ((s[k + 1] ?? s[k]) - s[k]);
  };
  const [q1, q3] = quartiles(xs);
  const others = [[median(s.slice(0, half)), median(s.slice(n - half))], [at((n - 1) / 4), at((3 * (n - 1)) / 4)], [at((n + 1) / 4 - 1), at((3 * (n + 1)) / 4 - 1)]];
  return others.every(([a, b]) => a === q1 && b === q3) ? true : 'the quartiles depend on the rule used';
}
// n whole numbers from lo to hi, in order, with a value that appears twice at each quartile position.
function spreadData(rng, n, lo, hi) {
  const i1 = Math.ceil(Math.floor(n / 2) / 2) - 1;
  const q1 = rng.int(lo + 1, lo + Math.floor((hi - lo) / 2) - 1);
  const q3 = rng.int(q1 + 3, hi - 1);
  return sorted(Array.from({ length: n }, (_, i) => (i < i1 ? rng.int(lo, q1 - 1) : i <= i1 + 1 ? q1 : i < n - 2 - i1 ? rng.int(q1 + 1, q3 - 1) : i <= n - 1 - i1 ? q3 : rng.int(q3 + 1, hi))));
}
// Pearson's r and the share of pairs of points that rise together: two ways to judge a scatter plot.
function trend(pts) {
  const [mx, my] = [mean(pts.map((p) => p.x)), mean(pts.map((p) => p.y))];
  const add = (f) => sum(pts.map(f));
  const r = add((p) => (p.x - mx) * (p.y - my)) / Math.sqrt(add((p) => (p.x - mx) ** 2) * add((p) => (p.y - my) ** 2));
  const pairs = pts.flatMap((p, i) => pts.slice(i + 1).filter((o) => o.y !== p.y).map((o) => (o.x - p.x) * (o.y - p.y) > 0));
  return { r, rising: pairs.filter(Boolean).length / pairs.length };
}
// Box plots drawn on the coordinate plot, stacked from the top down. Each row is { min, q1, med, q3, max, label? }.
function boxPlot(rows, [lo, hi], step, alt, marks = false) {
  const rects = [];
  const segments = [];
  rows.forEach((r, i) => {
    const y = 3 * (rows.length - 1 - i) + 0.75; // the bottom of this row's box
    const [mid, top, color] = [y + 0.75, y + 1.5, 'ab'[i % 2]];
    rects.push({ x: r.q1, w: r.q3 - r.q1, y, h: 1.5, color });
    segments.push(
      { from: [r.min, mid], to: [r.q1, mid], color }, { from: [r.q3, mid], to: [r.max, mid], color },
      { from: [r.min, mid + 0.4], to: [r.min, mid - 0.4], color, label: r.label }, { from: [r.max, mid - 0.4], to: [r.max, mid + 0.4], color },
      { from: [r.med, y], to: [r.med, top], color },
    );
    // A label on a very short right-to-left segment is written just above that spot.
    if (marks) [['smallest', r.min, mid + 0.4], ['Q1', r.q1, top], ['median', r.med, top], ['Q3', r.q3, top], ['largest', r.max, mid + 0.4]].forEach(([label, x, at]) => segments.push({ from: [x + 0.001, at], to: [x - 0.001, at], color, label }));
  });
  return { type: 'plot', x: [lo, hi], y: [0, 3 * rows.length], step: [step, 100], size: [360, (marks ? 80 : 60) + 70 * rows.length], rects, segments, alt };
}
const fiveText = (r) => `smallest value ${r.min}, lower quartile ${r.q1}, median ${r.med}, upper quartile ${r.q3}, largest value ${r.max}`;
const lowerFirst = (s) => s[0].toLowerCase() + s.slice(1);

// ───────────── Easy ─────────────

function easyCentre(rng) {
  if (rng.bool()) {
    const n = rng.pick([5, 7]);
    const xs = rng.sample(range(2, 30), n);
    const mid = (n - 1) / 2;
    const s = sorted(xs);
    const m = s[mid];
    if (xs[mid] === m) return easyCentre(rng); // the middle of the unordered list must not already be the median
    const mu = mean(xs);
    return q({
      prompt: `What is the median of the data set ${xs.join(', ')}?`,
      correct: m,
      wrong: [
        { value: xs[mid], why: 'Put the values in order first. The median is the middle value of the ordered list.' },
        Number.isInteger(mu) ? { value: mu, why: 'That is the mean: the total divided by the number of values. The median is the middle value of the ordered list.' } : null,
        s[mid + 1],
        s[mid - 1],
      ],
      solution: [`In order: ${s.join(', ')}.`, `There are ${n} values, so the median is the ${ordinal(mid + 1)} one: ${m}.`],
      rule: 0, skill: 'median',
      check: () => (xs.filter((v) => v < m).length === xs.filter((v) => v > m).length ? true : 'not the middle value'),
    });
  }
  const n = rng.int(4, 6);
  const first = Array.from({ length: n - 1 }, () => rng.int(2, 30));
  const xs = rng.shuffle([...first, rng.pick(range(2, 30).filter((v) => (sum(first) + v) % n === 0))]);
  const total = sum(xs);
  const [mu, med] = [total / n, median(xs)];
  return q({
    prompt: `What is the mean of the data set ${xs.join(', ')}?`,
    correct: mu,
    wrong: [
      { value: total, why: `That is the total. Divide it by the number of values, ${n}.` },
      med === mu ? null : { value: med, why: 'That is the median, the middle of the ordered data. The mean is the total divided by the number of values.' },
      Number.isInteger(total / (n - 1)) ? total / (n - 1) : null,
      mu + 1,
    ],
    solution: [R`Add the values: \(${xs.join(' + ')} = ${total}\).`, R`Divide by the number of values: \(${total} \div ${n} = ${mu}\).`],
    rule: 0, skill: 'mean',
    check: () => checkEqual(xs.reduce((a, v) => a + v, 0) / xs.length, mu),
  });
}

const DOTS = [
  { label: 'Goals scored in a match', intro: 'The dot plot shows the goals a hockey team scored in each match of a season.', lo: 0, hi: 6 },
  { label: 'Books read last month', intro: 'The dot plot shows how many books each member of a book club read last month.', lo: 0, hi: 7 },
  { label: 'Hours of sleep', intro: 'The dot plot shows how many hours each student in a group slept last night.', lo: 5, hi: 10 },
  { label: 'Score out of 10', intro: 'The dot plot shows the scores of a group of students on a 10-point quiz.', lo: 3, hi: 10 },
];

function easyDotPlot(rng) {
  const c = rng.pick(DOTS);
  const n = rng.pick([9, 11, 13]);
  const values = sorted(Array.from({ length: n }, () => rng.int(c.lo, c.hi)));
  const pos = (n + 1) / 2;
  const m = values[pos - 1];
  const below = values.filter((v) => v < m).length;
  const counts = range(c.lo, c.hi).map((v) => [v, values.filter((u) => u === v).length]);
  const tallest = Math.max(...counts.map(([, k]) => k));
  const modes = counts.filter(([, k]) => k === tallest).map(([v]) => v);
  const centre = (values[0] + values[n - 1]) / 2;
  return q({
    prompt: `${c.intro} What is the median?`,
    visual: { type: 'dotPlot', values, label: c.label },
    correct: m,
    wrong: [
      modes.length === 1 && modes[0] !== m ? { value: modes[0], why: 'That is the value with the tallest stack of dots, the most common value. The median is the middle dot when the dots are counted in order.' } : null,
      Number.isInteger(centre) && centre !== m ? { value: centre, why: 'That is the middle of the number line. The median is the middle of the data, so count the dots.' } : null,
      m + 1,
      m > 0 ? m - 1 : null,
    ],
    solution: [
      `There are ${n} dots, so the median is the ${ordinal(pos)} value when the dots are counted in order.`,
      `Counting from the left, ${below} of the dots are to the left of ${m}, so the ${ordinal(pos)} dot is in the stack above ${m}.`,
      `The median is ${m}.`,
    ],
    rule: 0, skill: 'reading a dot plot',
    check: () => (below < pos && values.filter((v) => v <= m).length >= pos ? true : 'not the middle value'),
  });
}

function easyAssociation(rng) {
  const kind = rng.pick(['positive', 'negative', 'none']);
  const draw = () => range(1, 10).map((x) => ({ x, y: kind === 'none' ? rng.int(1, 10) : clamp((kind === 'positive' ? x : 11 - x) + rng.int(-3, 3) / 2, 0.5, 10.5) }));
  const clear = (p) => {
    const { r, rising } = trend(p);
    return kind === 'none' ? Math.abs(r) < 0.15 && rising > 0.38 && rising < 0.62 : (kind === 'positive' ? r : -r) > 0.85 && Math.abs(r) < 0.995 && (kind === 'positive' ? rising : 1 - rising) > 0.8;
  };
  let pts = draw();
  for (let i = 0; i < 300 && !clear(pts); i++) pts = draw(); // redraw until the pattern is unmistakable
  if (!clear(pts)) return easyAssociation(rng);
  const SAY = {
    positive: R`Positive association: \(y\) tends to increase as \(x\) increases`,
    negative: R`Negative association: \(y\) tends to decrease as \(x\) increases`,
    none: 'No association: the points show no overall pattern',
    line: 'A perfect linear association: every point lies on one straight line',
  };
  const seen = { positive: 'the points rise', negative: 'the points fall', none: 'the points neither rise nor fall steadily' }[kind];
  return q({
    prompt: 'Which description fits the scatter plot?',
    visual: {
      type: 'plot', x: [0, 11], y: [0, 11], axisLabels: ['x', 'y'], points: pts,
      alt: `Scatter plot of 10 points. ${kind === 'none' ? 'The points are spread all over the plot, with no rising or falling trend.' : `From left to right the points ${kind === 'positive' ? 'rise' : 'fall'} in a loose band, not in an exact line.`}`,
    },
    correct: SAY[kind],
    wrong: ['positive', 'negative', 'none', 'line'].filter((k) => k !== kind).map((k) => ({
      value: SAY[k],
      why: k === 'line' ? 'The points do not all lie exactly on one line.' : kind === 'none' ? 'Read the plot from left to right: there is no steady rise or fall.' : `Read the plot from left to right: ${seen}${k === 'none' ? ', even though they are not exactly in a line' : ''}.`,
    })),
    solution: [
      `Read the plot from left to right: ${seen}.`,
      kind === 'none' ? R`Knowing \(x\) tells you nothing about \(y\), so there is no association.` : R`So larger values of \(x\) tend to go with ${kind === 'positive' ? 'larger' : 'smaller'} values of \(y\): a ${kind} association. The points only follow a trend; they are not exactly in a line.`,
    ],
    rule: 5, skill: 'association',
    check: () => (clear(pts) ? true : 'the plot does not clearly show this'),
  });
}

// ───────────── Medium ─────────────

function mediumIQR(rng) {
  const n = rng.pick([7, 8, 8, 9, 9, 11, 12]); // with 6 or 10 values the spreadsheet rules cannot be made to agree
  const lo = rng.int(1, 20);
  const xs = spreadData(rng, n, lo, lo + rng.int(10, 16));
  const [lower, upper] = halves(xs);
  const [q1, q3] = quartiles(xs);
  const med = median(xs);
  const part = q3 - med > 0 && q3 - med !== q3 - q1 ? q3 - med : med - q1;
  return q({
    prompt: `These ${n} values are in order: ${xs.join(', ')}. What is the interquartile range?`,
    correct: q3 - q1,
    wrong: [
      { value: xs[n - 1] - xs[0], why: 'That is the range: the largest value minus the smallest. The interquartile range is the distance between the two quartiles.' },
      { value: q3, why: R`That is the upper quartile, \(Q_3\). Subtract the lower quartile, \(Q_1 = ${q1}\), from it.` },
      part > 0 ? { value: part, why: R`That is the distance between the median and one quartile. The interquartile range goes from \(Q_1\) to \(Q_3\).` } : null,
      med,
      q1,
    ],
    solution: [
      n % 2 ? `There are ${n} values, so the median is the ${ordinal((n + 1) / 2)} one, ${med}. Leave it out and split the rest into two halves.` : `There are ${n} values, so they split into two halves of ${n / 2}.`,
      R`Lower half: ${lower.join(', ')}. Its median is the lower quartile, \(Q_1 = ${q1}\).`,
      R`Upper half: ${upper.join(', ')}. Its median is the upper quartile, \(Q_3 = ${q3}\).`,
      R`Interquartile range: \(Q_3 - Q_1 = ${q3} - ${q1} = ${q3 - q1}\).`,
    ],
    rule: 1, skill: 'interquartile range',
    check: () => checkAll(ruleFree(xs), xs.filter((v) => v <= q1).length >= n / 4 && xs.filter((v) => v >= q3).length >= n / 4 ? true : 'quartiles are misplaced'),
  });
}

// What a box plot shows, the grid steps that suit it, and the smallest multiple of the step to start from.
const BOXES = [
  { what: 'the scores on a class quiz', steps: [5], from: 2 },
  { what: 'the ages of the members of a chess club', steps: [2], from: 4 },
  { what: 'the times, in minutes, that some students take to travel to school', steps: [1, 2, 5], from: 2 },
  { what: 'the heights, in centimetres, of some sunflower seedlings', steps: [1, 2, 5], from: 2 },
];
const SECTIONS = ['the left whisker', 'the left part of the box', 'the right part of the box', 'the right whisker'];

function mediumBoxPlot(rng) {
  const c = rng.pick(BOXES);
  const step = rng.pick(c.steps);
  const five = [step * rng.int(c.from, 7)];
  for (let i = 0; i < 4; i++) five.push(five[i] + step * rng.int(1, i === 3 ? 4 : 3));
  const [min, q1, med, q3, max] = five;
  const row = { min, q1, med, q3, max };
  const visual = boxPlot([row], [min - step, max + step], step, `Box plot: ${fiveText(row)}.`);
  const intro = `The box plot shows ${c.what}.`;
  if (rng.bool(0.6)) {
    return q({
      prompt: `${intro} What is the interquartile range?`,
      visual,
      correct: q3 - q1,
      wrong: [
        { value: max - min, why: 'That is the range, from the end of one whisker to the end of the other. The interquartile range is the width of the box.' },
        { value: q3, why: R`That is the upper quartile, the right-hand edge of the box. Subtract the lower quartile, \(${q1}\), from it.` },
        { value: med - q1, why: 'That is the distance from the left edge of the box to the median line. The interquartile range is the whole width of the box.' },
        med,
      ],
      solution: [R`The box runs from the lower quartile, \(Q_1 = ${q1}\), to the upper quartile, \(Q_3 = ${q3}\).`, R`Interquartile range: \(${q3} - ${q1} = ${q3 - q1}\).`],
      rule: 1, skill: 'reading a box plot',
      check: () => checkEqual(visual.rects[0].w, q3 - q1),
    });
  }
  const from = rng.int(0, 3);
  const to = rng.int(from + 1, Math.min(4, from + 3));
  const share = 25 * (to - from);
  return q({
    prompt: `${intro} About what percentage of the values are between ${five[from]} and ${five[to]}?`,
    visual,
    correct: share,
    fmt: (v) => R`\(${v}\%\)`,
    wrong: [25, 50, 75, 100].filter((v) => v !== share).map((v, i) => (i ? v : { value: v, why: 'Each of the four sections of a box plot (the two whiskers and the two parts of the box) holds about a quarter of the values, however long or short it looks.' })),
    solution: [
      'The five marks on a box plot split the data into four sections, and each section holds about 25% of the values.',
      `From ${five[from]} to ${five[to]} covers ${joinList(SECTIONS.slice(from, to))}: ${plural(to - from, 'section')}.`,
      R`\(${to - from} \times 25\% = ${share}\%\).`,
    ],
    rule: 1, skill: 'reading a box plot',
    check: () => checkEqual(share / 25, five.indexOf(five[to]) - five.indexOf(five[from])),
  });
}

// Settings for a line of fit y = mx + b. `slope`, `zero` and `rev` are statements about the size of m.
const FITS = [
  {
    x: 'h', y: 's', where: R`\(h\) is the number of hours a student studied and \(s\) is the predicted test score`, group: "a class's test results",
    ms: [3, 3.5, 4, 4.5, 5, 6], b: [40, 55], xs: [2, 6], unit: 'points', res: 9, item: 'student',
    ask: (v) => `a student who studied for ${v} hours`, actual: (v, a) => `One student studied for ${v} hours and scored ${a} points.`,
    slope: (m, dir) => `Each extra hour of study goes with a predicted ${dir} of ${txt(m)} points in the test score`,
    zero: (m) => `A student who did not study is predicted to score ${txt(m)} points`,
    rev: (m) => `Each extra point on the test goes with ${txt(m)} more hours of study`,
  },
  {
    x: 't', y: 'n', where: R`\(t\) is the afternoon temperature in °C and \(n\) is the predicted number of ice creams sold`, group: "a kiosk's daily sales",
    ms: [8, 9, 10, 12, 14, 15], b: [20, 60], xs: [16, 30], unit: 'ice creams', res: 30, item: 'day',
    ask: (v) => `an afternoon when the temperature is ${v} °C`, actual: (v, a) => `On one day the temperature was ${v} °C and ${a} ice creams were sold.`,
    slope: (m, dir) => `Each extra degree goes with a predicted ${dir} of ${txt(m)} in the number of ice creams sold`,
    zero: (m) => `At 0 °C the kiosk is predicted to sell ${txt(m)} ice creams`,
    rev: (m) => `Each extra ice cream sold goes with a rise of ${txt(m)} degrees in temperature`,
  },
  {
    x: 'a', y: 'v', where: R`\(a\) is the age of a car in years and \(v\) is its predicted value in thousands of dollars`, group: 'the used cars at a dealer',
    ms: [-1.5, -2, -2.5], b: [24, 32], xs: [2, 8], unit: 'thousand dollars', res: 3, item: 'car',
    ask: (v) => `a car that is ${v} years old`, actual: (v, a) => `One car is ${v} years old and is on sale for ${a} thousand dollars.`,
    slope: (m, dir) => `Each extra year of age goes with a predicted ${dir} of ${money(m * 1000)} in the value of a car`,
    zero: (m) => `A brand-new car is predicted to be worth ${money(m * 1000)}`,
    rev: (m) => `Each extra thousand dollars of value goes with ${txt(m)} more years of age`,
  },
];
// A setting, a slope, an intercept and an x-value that gives a whole-number prediction.
function fitCase(rng) {
  const c = rng.pick(FITS);
  const m = rng.pick(c.ms);
  const b = rng.int(...c.b);
  const x0 = Number.isInteger(m) ? rng.int(...c.xs) : 2 * rng.int(c.xs[0] / 2, c.xs[1] / 2);
  return { c, m, b, x0, pred: m * x0 + b, model: R`A line of fit for ${c.group} is \(${c.y} = ${linear(m, b, c.x)}\), where ${c.where}.` };
}

function mediumLineOfFit(rng) {
  const { c, m, b, x0, pred, model } = fitCase(rng);
  if (rng.bool()) {
    return q({
      prompt: `${model} What does the model predict for ${c.ask(x0)}?`,
      correct: pred,
      unit: c.unit,
      wrong: [
        m > 0 ? { value: m * x0, why: R`Add the constant term as well: the model is \(${linear(m, b, c.x)}\).` } : null,
        { value: b * x0 + m, why: R`\(${x0}\) takes the place of \(${c.x}\), so it multiplies \(${num(m)}\), not \(${b}\).` },
        pred - m,
        b + m,
      ],
      solution: [
        R`Substitute \(${c.x} = ${x0}\) into the model: \(${c.y} = ${num(m)}(${x0}) + ${b}\).`,
        R`\(${c.y} = ${num(m * x0)} + ${b} = ${pred}\), so the model predicts ${txt(pred)} ${c.unit}.`,
      ],
      rule: 6, skill: 'line of fit',
      check: () => checkEqual((pred - b) / m, x0),
    });
  }
  const [dir, other] = m > 0 ? ['increase', 'decrease'] : ['decrease', 'increase'];
  const size = Math.abs(m);
  return q({
    prompt: R`${model} What does the number \(${num(m)}\) in the model tell you?`,
    correct: c.slope(size, dir),
    wrong: [
      { value: c.zero(size), why: R`That describes the constant term, \(${b}\), which is the prediction when \(${c.x} = 0\). The number \(${num(m)}\) multiplies \(${c.x}\), so it is a rate.` },
      { value: c.rev(size), why: R`The slope is the change in the predicted \(${c.y}\) for each increase of 1 in \(${c.x}\), not the other way round.` },
      { value: c.slope(size, other), why: R`The slope is ${m > 0 ? 'positive' : 'negative'}, so the prediction goes ${m > 0 ? 'up' : 'down'} as \(${c.x}\) increases.` },
    ],
    solution: [
      R`\(${num(m)}\) multiplies \(${c.x}\), so it is the slope: the change in the prediction for each increase of 1 in \(${c.x}\).`,
      `In this setting, ${lowerFirst(c.slope(size, dir))}.`,
    ],
    rule: 6, skill: 'slope in context',
  });
}

function mediumOutlierEffect(rng) {
  const n = rng.int(5, 7);
  const j = rng.int(2, 8);
  const up = rng.bool(0.65);
  const xs = [rng.int(up ? 10 : 60, up ? 40 : 75)];
  for (let i = 1; i < n; i++) xs.push(xs[i - 1] + rng.int(1, 4));
  const [was, now] = up ? [xs[n - 1], xs[n - 1] + n * j] : [xs[0], xs[0] - n * j];
  const fixed = up ? [...xs.slice(0, -1), now] : [now, ...xs.slice(1)];
  const [end, moves] = up ? ['largest', 'increases'] : ['smallest', 'decreases'];
  return q({
    prompt: `A data set has the values ${xs.join(', ')}. The ${end} value was written down wrongly: it should be ${now}, not ${was}. How do the mean and the median change when the mistake is corrected?`,
    correct: `The mean ${moves} by ${j}, and the median stays the same`,
    wrong: [
      { value: `The mean ${moves} by ${n * j}, and the median stays the same`, why: R`The change of \(${n * j}\) is shared among all ${n} values when the mean is worked out: \(${n * j} \div ${n} = ${j}\).` },
      { value: `The mean and the median both ${moves.slice(0, -1)} by ${j}`, why: `The median is the middle of the ordered list. Changing the ${end} value does not change which value is in the middle.` },
      `The mean stays the same, and the median ${moves} by ${j}`,
    ],
    solution: [
      R`The total ${up ? 'rises' : 'falls'} by \(${Math.max(was, now)} - ${Math.min(was, now)} = ${n * j}\), so the mean ${moves} by \(${n * j} \div ${n} = ${j}\).`,
      `${now} is still the ${end} value, so the order of the list does not change and the middle of the list is where it was. The median stays ${txt(median(xs))}.`,
    ],
    rule: 3, skill: 'effect of an outlier',
    check: () => checkAll(checkEqual(mean(fixed) - mean(xs), up ? j : -j), checkEqual(median(fixed), median(xs))),
  });
}

// ───────────── Hard ─────────────

function hardOutlierRule(rng) {
  const iqr = 2 * rng.int(2, 7);
  const reach = 1.5 * iqr;
  const q1 = rng.int(reach + 6, 60);
  const q3 = q1 + iqr;
  const [low, high] = [q1 - reach, q3 + reach];
  const above = rng.bool();
  const side = (k) => (above ? q3 + k : q1 - k); // a value k beyond the box, on the chosen side
  const out = side(reach + rng.int(1, 4));
  const near = side(iqr + rng.int(1, iqr / 2 - 1));
  const inner = above ? low + rng.int(1, 3) : high - rng.int(1, 3);
  const choices = [out, near, inner, side(rng.int(2, iqr - 1))];
  return q({
    prompt: R`A data set has lower quartile \(Q_1 = ${q1}\) and upper quartile \(Q_3 = ${q3}\). By the \(1.5 \times \text{IQR}\) rule, which of these values would be an outlier?`,
    correct: out,
    wrong: [
      { value: near, why: R`\(${near}\) is more than one IQR ${above ? R`above \(Q_3\)` : R`below \(Q_1\)`}, but the rule uses 1.5 IQRs. The boundary on that side is \(${above ? high : low}\).` },
      { value: inner, why: R`The ${above ? 'lower' : 'upper'} boundary is \(${above ? `${q1} - ${reach} = ${low}` : `${q3} + ${reach} = ${high}`}\), and \(${inner}\) is inside it.` },
      choices[3],
    ],
    solution: [
      R`\(\text{IQR} = ${q3} - ${q1} = ${iqr}\), and \(1.5 \times ${iqr} = ${reach}\).`,
      R`Lower boundary: \(${q1} - ${reach} = ${low}\). Upper boundary: \(${q3} + ${reach} = ${high}\).`,
      R`A value is an outlier if it is below \(${low}\) or above \(${high}\). Of the four values, only \(${out}\) is.`,
    ],
    rule: 3, skill: 'outlier rule',
    check: () => (choices.filter((v) => v < low || v > high).join() === String(out) ? true : 'not exactly one outlier among the choices'),
  });
}

// Distances from the mean that give a whole-number standard deviation.
const SPREADS = [
  [-1, -1, 1, 1], [-2, -2, 2, 2], [-5, 1, 1, 3], [-3, -1, -1, 5], [-3, -3, 3, 3], [-7, -1, 1, 7],
  [-4, 1, 1, 1, 1], [-3, -1, 0, 1, 3], [-1, -1, -1, -1, 4], [-6, -2, 0, 2, 6], [-7, -1, 1, 2, 5],
  [-2, 0, 0, 0, 1, 1], [-1, -1, 0, 0, 0, 2], [-4, 0, 0, 0, 2, 2], [-3, -2, 0, 1, 1, 3], [-2, -2, 0, 0, 0, 4], [-3, -1, -1, 0, 2, 3], [-4, -1, 1, 1, 1, 2], [-6, 0, 0, 0, 3, 3], [-5, -1, -1, 1, 1, 5], [-3, -3, 0, 0, 0, 6],
];

function hardStandardDeviation(rng) {
  const mu = rng.int(8, 30);
  const ds = rng.shuffle(rng.pick(SPREADS));
  const xs = ds.map((d) => mu + d);
  const n = xs.length;
  const squares = ds.map((d) => d * d);
  const [ss, mad] = [sum(squares), sum(ds.map(Math.abs)) / n];
  const sd = Math.sqrt(ss / n);
  return q({
    prompt: `What is the standard deviation of the data set ${xs.join(', ')}? Use the method that divides by the number of values.`,
    correct: sd,
    wrong: [
      { value: ss / n, why: 'That is the average of the squared distances from the mean. The standard deviation is the square root of that number.' },
      Number.isInteger(mad * 10) ? { value: mad, why: 'That is the average distance from the mean. For the standard deviation, square the distances first, average the squares, then take the square root.' } : null,
      { value: Math.max(...xs) - Math.min(...xs), why: 'That is the range, the largest value minus the smallest. The standard deviation is based on the distance of every value from the mean.' },
      ss,
    ],
    solution: [
      R`Mean: \((${xs.join(' + ')}) \div ${n} = ${mu}\).`,
      `Distances from the mean: ${ds.map((d) => txt(d)).join(', ')}. Squared: ${squares.join(', ')}.`,
      R`Average of the squares: \(${ss} \div ${n} = ${ss / n}\).`,
      R`Standard deviation: \(\sqrt{${ss / n}} = ${sd}\).`,
    ],
    rule: 2, skill: 'standard deviation',
    check: () => checkAll(checkEqual(mean(xs), mu), checkEqual(Math.sqrt(mean(xs.map((x) => x * x)) - mean(xs) ** 2), sd)),
  });
}

function hardResidual(rng) {
  const { c, m, b, x0, pred, model } = fitCase(rng);
  const res = rng.nonzero(-c.res, c.res);
  const actual = pred + res;
  const [sign, place] = res > 0 ? ['positive', 'above'] : ['negative', 'below'];
  return q({
    prompt: `${model} ${c.actual(x0, actual)} What is the residual for this ${c.item}?`,
    correct: res,
    unit: c.unit,
    wrong: [
      { value: -res, why: `A residual is the actual value minus the predicted value, in that order. Here the actual value is ${place} the prediction, so the residual is ${sign}.` },
      { value: pred, why: 'That is the predicted value. The residual is the difference between the actual value and this prediction.' },
      actual,
    ],
    solution: [
      R`Predicted value: \(${c.y} = ${num(m)}(${x0}) + ${b} = ${pred}\).`,
      R`Residual \(=\) actual \(-\) predicted \(= ${actual} - ${pred} = ${res}\).`,
      `The residual is ${sign}: the actual value is ${Math.abs(res)} ${c.unit} ${place} the line of fit.`,
    ],
    rule: 6, skill: 'residuals',
    check: () => checkEqual(actual - (m * x0 + b), res),
  });
}

const GROUPS = [
  { a: 'Class A', b: 'Class B', what: 'the scores on a test', thing: 'scores' },
  { a: 'Route A', b: 'Route B', what: 'the journey times, in minutes,', thing: 'journey times' },
  { a: 'Team A', b: 'Team B', what: 'the points scored in each game', thing: 'points totals' },
];

function hardCompare(rng) {
  const c = rng.pick(GROUPS);
  const step = rng.pick([2, 5]);
  const five = (med, box, whisker) => {
    const [q1, q3] = [med - step * rng.int(...box), med + step * rng.int(...box)];
    return { q1, med, q3, min: q1 - step * rng.int(...whisker), max: q3 + step * rng.int(...whisker) };
  };
  const wide = five(step * rng.int(9, 14), [2, 3], [2, 3]);
  const tight = five(wide.med + step * rng.pick([-3, -2, -1, 1, 2, 3]), [1, 1], [1, 2]);
  const aWide = rng.bool();
  const [A, B] = aWide ? [wide, tight] : [tight, wide];
  const [higher, lower] = A.med > B.med ? [c.a, c.b] : [c.b, c.a];
  const [wider, narrower] = aWide ? [c.a, c.b] : [c.b, c.a];
  const say = (m, s) => (m === s ? `${m} has the higher median and the more spread-out ${c.thing}` : `${m} has the higher median, but ${s} has the more spread-out ${c.thing}`);
  const [iqrA, iqrB] = [A.q3 - A.q1, B.q3 - B.q1];
  return q({
    prompt: `The box plots show ${c.what} for ${c.a} (top) and ${c.b} (bottom). Which statement do the box plots support?`,
    visual: boxPlot([{ ...A, label: 'A' }, { ...B, label: 'B' }], [Math.min(A.min, B.min) - step, Math.max(A.max, B.max) + step], step, `Two box plots on the same scale. ${c.a}: ${fiveText(A)}. ${c.b}: ${fiveText(B)}.`),
    correct: say(higher, wider),
    wrong: [
      { value: say(lower, wider), why: `The median is the line inside each box. It is at ${A.med} for ${c.a} and at ${B.med} for ${c.b}.` },
      { value: say(higher, narrower), why: `Spread is shown by the width of the box and of the whole plot. The box for ${wider} is ${Math.max(iqrA, iqrB)} wide, and the box for ${narrower} is only ${Math.min(iqrA, iqrB)} wide.` },
      say(lower, narrower),
    ],
    solution: [
      `Centre: the median line is at ${A.med} for ${c.a} and at ${B.med} for ${c.b}, so ${higher} has the higher median.`,
      R`Spread: the interquartile range is \(${A.q3} - ${A.q1} = ${iqrA}\) for ${c.a} and \(${B.q3} - ${B.q1} = ${iqrB}\) for ${c.b}.`,
      R`The ranges, \(${A.max - A.min}\) and \(${B.max - B.min}\), agree with that, so ${wider} has the more spread-out ${c.thing}.`,
    ],
    rule: 4, skill: 'comparing data sets',
    check: () => (A.med !== B.med && (iqrA - iqrB) * (A.max - A.min - (B.max - B.min)) > 0 && iqrA > iqrB === aWide ? true : 'the comparison is not clear-cut'),
  });
}

// ───────────── Challenge ─────────────

function challengeMissingValue(rng) {
  const n = rng.int(3, 6);
  const before = rng.int(62, 84);
  const d = rng.nonzero(-3, 3);
  const [after, score] = [before + d, before + d * (n + 1)];
  if (score > 100) return challengeMissingValue(rng);
  const name = person(rng);
  return q({
    prompt: `${name}'s mean score on ${n} quizzes is ${before}. After one more quiz, the mean score for all ${n + 1} quizzes is ${after}. What was the score on the last quiz?`,
    correct: score,
    wrong: [
      { value: before + 2 * d, why: `That would be right if ${after} were the mean of just two numbers, ${before} and the new score. But ${before} stands for ${n} quizzes, so compare totals.` },
      { value: after, why: 'That is the new mean. Work out the total before and after the last quiz, and subtract.' },
      before + d * n,
      score + d,
    ],
    solution: [
      R`Total for the first ${n} quizzes: \(${n} \times ${before} = ${n * before}\).`,
      R`Total for all ${n + 1} quizzes: \(${n + 1} \times ${after} = ${(n + 1) * after}\).`,
      R`Score on the last quiz: \(${(n + 1) * after} - ${n * before} = ${score}\).`,
    ],
    rule: 0, skill: 'working backwards from a mean',
    check: () => checkEqual((n * before + score) / (n + 1), after),
  });
}

// Pairs of quantities that move together because of something else. `up` and `down` are statements of association.
const STUDIES = [
  { study: 'For the children at a primary school', x: 'shoe size', y: 'reading score', sign: 1, lurk: "a child's age",
    up: 'Children with larger shoe sizes tend to have higher reading scores', down: 'Children with larger shoe sizes tend to have lower reading scores', cause: 'Having bigger feet makes a child read better' },
  { study: 'For the days of one summer at a beach', x: 'ice-cream sales', y: 'the number of sunburn cases', sign: 1, lurk: 'hot, sunny weather',
    up: 'Days with more ice-cream sales tend to have more sunburn cases', down: 'Days with more ice-cream sales tend to have fewer sunburn cases', cause: 'Eating ice cream causes sunburn' },
  { study: 'For the towns in one region', x: 'the number of cafes', y: 'the number of bus stops', sign: 1, lurk: 'the size of the town',
    up: 'Towns with more cafes tend to have more bus stops', down: 'Towns with more cafes tend to have fewer bus stops', cause: 'Opening a cafe makes a town add bus stops' },
  { study: 'For the cities in one country', x: 'the number of cinemas', y: 'the number of dentists', sign: 1, lurk: 'the size of the city',
    up: 'Cities with more cinemas tend to have more dentists', down: 'Cities with more cinemas tend to have fewer dentists', cause: 'Building a cinema brings more dentists to a city' },
  { study: 'For the weeks of one year at a corner shop', x: 'hot-chocolate sales', y: 'sunscreen sales', sign: -1, lurk: 'the weather',
    up: 'Weeks with higher hot-chocolate sales tend to have higher sunscreen sales', down: 'Weeks with higher hot-chocolate sales tend to have lower sunscreen sales', cause: 'Buying hot chocolate stops people from buying sunscreen' },
  { study: 'For the days of one winter in a town', x: 'the energy used for heating', y: 'the number of people in the park', sign: -1, lurk: 'how cold the day is',
    up: 'Days with more heating tend to have more people in the park', down: 'Days with more heating tend to have fewer people in the park', cause: 'Turning on the heating keeps people out of the park' },
];

function challengeCorrelation(rng) {
  const c = rng.pick(STUDIES);
  const weak = rng.bool(0.25);
  const r = weak ? rng.pick([-0.06, -0.04, -0.02, 0.02, 0.03, 0.05]) : c.sign * (80 + rng.int(0, 17)) / 100;
  const none = `There is almost no linear association between ${c.x} and ${c.y}`;
  const [fits, opposite] = c.sign > 0 ? [c.up, c.down] : [c.down, c.up];
  const noCause = `A correlation shows that two quantities tend to change together. It cannot show that one causes the other: ${c.lurk} could explain both.`;
  const nearZero = R`\(r = ${num(r)}\) is close to 0, so there is hardly any linear association in either direction.`;
  return q({
    prompt: R`${c.study}, the correlation coefficient between ${c.x} and ${c.y} is \(r = ${num(r)}\). Which conclusion does this support?`,
    correct: weak ? none : fits,
    wrong: weak
      ? [{ value: fits, why: nearZero }, { value: c.cause, why: noCause }, { value: opposite, why: nearZero }]
      : [
          { value: c.cause, why: noCause },
          { value: opposite, why: R`\(r\) is ${r > 0 ? 'positive' : 'negative'}, so larger values of one quantity go with ${r > 0 ? 'larger' : 'smaller'} values of the other.` },
          { value: none, why: R`\(r = ${num(r)}\) is close to \(${r > 0 ? 1 : -1}\), so the linear association is strong.` },
        ],
    solution: weak
      ? [R`The size of \(r\) gives the strength of the linear association. \(r = ${num(r)}\) is close to 0, so there is almost none.`, 'So no rising or falling trend is supported, and a correlation never shows cause anyway.']
      : [
          R`The sign of \(r\) gives the direction and its size gives the strength. \(r = ${num(r)}\) is ${r > 0 ? 'positive' : 'negative'} and close to \(${r > 0 ? 1 : -1}\): a strong ${r > 0 ? 'positive' : 'negative'} linear association.`,
          `In words: ${lowerFirst(fits)}.`,
          `It does not show cause. Here ${c.lurk} could explain both quantities.`,
        ],
    rule: 5, skill: 'correlation and causation',
  });
}

function challengeFitPredict(rng) {
  const m = rng.int(3, 6);
  const b = 2 * rng.int(4, 15);
  const x1 = rng.int(1, 3);
  const x2 = x1 + rng.int(3, 5);
  const x3 = rng.int(x2 + 1, 10);
  const f = (x) => m * x + b;
  const [y1, y2, y3] = [f(x1), f(x2), f(x3)];
  const ratio = (y2 * x3) / x2;
  const cloud = range(1, 9).filter((x) => x !== x1 && x !== x2).map((x) => ({ x, y: f(x) + rng.int(-m, m) }));
  return q({
    prompt: R`The scatter plot shows the ages \(w\), in weeks, and the heights \(h\), in centimetres, of some sunflower plants, with a line of fit. The line passes through the two marked points, \(${point(x1, y1)}\) and \(${point(x2, y2)}\). What height does the line predict for a plant that is ${x3} weeks old?`,
    visual: {
      type: 'plot', x: [0, 10], y: [0, 10 * Math.ceil((f(10) + m) / 10)], axisLabels: ['w', 'h'], fns: [{ f }],
      points: [...cloud, { x: x1, y: y1, color: 'b' }, { x: x2, y: y2, color: 'b' }],
      alt: `Scatter plot of height against age for some plants, with a rising line of fit drawn through the points. Two points on the line are marked: (${x1}, ${y1}) and (${x2}, ${y2}).`,
    },
    correct: y3,
    unit: 'cm',
    wrong: [
      Number.isInteger(ratio) ? { value: ratio, why: 'That treats the height as proportional to the age. The line does not pass through (0, 0), so find its slope and its intercept.' } : null,
      { value: y2 + m * x3, why: R`From ${x2} weeks to ${x3} weeks is only \(${x3 - x2}\) more, so add \(${m} \times ${x3 - x2}\) to \(${y2}\).` },
      { value: m * x3, why: R`That leaves out the intercept, \(${b}\).` },
      y3 + m,
      y3 - m,
    ],
    solution: [
      R`Slope of the line: \(\dfrac{${y2} - ${y1}}{${x2} - ${x1}} = ${m}\) cm per week.`,
      R`Intercept: \(${y1} - ${m}(${x1}) = ${b}\), so the line is \(h = ${m}w + ${b}\).`,
      R`For \(w = ${x3}\): \(h = ${m}(${x3}) + ${b} = ${y3}\).`,
    ],
    rule: 6, skill: 'line of fit',
    check: () => checkEqual(y1 + ((y2 - y1) / (x2 - x1)) * (x3 - x1), y3),
  });
}

// ───────────── Interactive models ─────────────

function sixModel(values) {
  const typed = Object.values(values);
  const s = sorted(typed);
  const total = sum(s);
  const [mu, med, q1, q3] = [total / 6, (s[2] + s[3]) / 2, s[1], s[4]];
  const iqr = q3 - q1;
  const [low, high] = [q1 - 1.5 * iqr, q3 + 1.5 * iqr];
  const out = s.filter((v) => v < low || v > high);
  const exact = Number.isInteger((total * 100) / 6);
  return {
    problem: `Describe the centre and spread of the data set ${typed.join(', ')}.`,
    steps: [
      `Put the values in order: ${s.join(', ')}.`,
      R`Mean: the total is ${total}, and \(${total} \div 6 ${exact ? '=' : R`\approx`} ${num(mu, { places: 2 })}\).`,
      R`Median: halfway between the 3rd and 4th values, \(\dfrac{${s[2]} + ${s[3]}}{2} = ${num(med)}\).`,
      R`Lower half: ${s.slice(0, 3).join(', ')}, so \(Q_1 = ${q1}\). Upper half: ${s.slice(3).join(', ')}, so \(Q_3 = ${q3}\).`,
      R`Interquartile range: \(${q3} - ${q1} = ${iqr}\).`,
      R`Outlier boundaries: \(${q1} - 1.5(${iqr}) = ${num(low)}\) and \(${q3} + 1.5(${iqr}) = ${num(high)}\). ${out.length ? `${joinList(out.map(String))} ${out.length === 1 ? 'is' : 'are'} outside them.` : 'No value is outside them.'}`,
    ],
    answer: `Mean ${exact ? '' : 'about '}${txt(round(mu, 2))}, median ${txt(med)}, IQR ${iqr}; ${out.length ? `${out.length === 1 ? 'outlier' : 'outliers'}: ${out.join(', ')}` : 'no outliers'}`,
    note: out.length ? 'An outlier pulls the mean toward it but hardly moves the median, so the median describes a typical value better here.' : undefined,
    visual: { type: 'dotPlot', values: s, label: 'Your six values' },
  };
}

function deviationModel(values) {
  const xs = Object.values(values);
  const total = sum(xs);
  const fifths = xs.map((x) => 5 * x - total); // five times each distance from the mean, kept whole to avoid rounding errors
  const ss = sum(fifths.map((e) => e * e)) / 25;
  const sd = Math.sqrt(ss / 5);
  const exact = Math.abs(round(sd, 2) ** 2 - ss / 5) < 1e-9;
  return {
    problem: `Find the standard deviation of the data set ${xs.join(', ')}.`,
    steps: [
      R`Mean: \(${total} \div 5 = ${num(total / 5)}\).`,
      'Subtract the mean from each value to get its distance from the mean, then square each distance. The table shows the results.',
      R`Average of the squared distances: \(${num(ss)} \div 5 = ${num(ss / 5)}\).`,
      R`Standard deviation: \(\sqrt{${num(ss / 5)}} ${exact ? '=' : R`\approx`} ${num(sd, { places: 2 })}\).`,
    ],
    answer: R`Standard deviation ${exact ? '' : 'about '}\(${num(sd, { places: 2 })}\), around a mean of \(${num(total / 5)}\)`,
    note: sd === 0 ? 'All five values are equal, so every distance from the mean is 0 and there is no spread.' : undefined,
    visual: {
      type: 'table', caption: 'Distances from the mean', headers: ['Value', 'Distance from the mean', 'Distance squared'],
      rows: xs.map((x, i) => [R`\(${x}\)`, R`\(${num(fifths[i] / 5)}\)`, R`\(${num((fifths[i] * fifths[i]) / 25)}\)`]),
    },
  };
}

function fitModel({ m, b, h, s }) {
  const pred = m * h + b;
  const res = s - pred;
  const gap = `${txt(Math.abs(res))} ${Math.abs(res) === 1 ? 'point' : 'points'}`;
  const f = (x) => m * x + b;
  return {
    problem: R`A line of fit for a class is \(s = ${linear(m, b, 'h')}\), where \(h\) is the number of hours a student studied and \(s\) is the predicted test score. One student studied for ${h} hours and scored ${s}. What did the model predict, and what is the residual?`,
    steps: [
      R`Predicted score: \(s = ${num(m)}(${h}) + ${b} = ${num(pred)}\).`,
      R`Residual \(=\) actual \(-\) predicted \(= ${s} - ${num(pred)} = ${num(res)}\).`,
      res === 0 ? 'The residual is 0, so this point lies exactly on the line of fit.' : `The residual is ${res > 0 ? 'positive' : 'negative'}: the student scored ${gap} ${res > 0 ? 'above' : 'below'} the prediction, so the point is ${res > 0 ? 'above' : 'below'} the line.`,
      R`The slope, \(${num(m)}\), is the predicted gain for each extra hour of study. The intercept, \(${b}\), is the prediction for 0 hours.`,
    ],
    answer: `Predicted score ${txt(pred)}; residual ${txt(res)}`,
    note: pred > 100 ? 'The prediction is above 100 points. A line of fit should not be trusted far outside the data it was fitted to.' : undefined,
    visual: {
      type: 'plot', x: [0, 9], y: [10 * Math.floor((Math.min(b, s) - 5) / 10), 10 * Math.ceil((Math.max(f(9), s) + 5) / 10)], axisLabels: ['h', 's'], fns: [{ f }],
      segments: res === 0 ? [] : [{ from: [h, s], to: [h, pred], dashed: true, label: `residual ${txt(res)}` }],
      points: [{ x: h, y: s, color: 'b', label: `(${h}, ${s})` }],
      alt: `Graph of the line of fit with the point (${h}, ${s}) marked. ${res === 0 ? 'The point is on the line.' : `A dashed vertical segment joins the point to the line, which is ${gap} ${res > 0 ? 'below' : 'above'} the point.`}`,
    },
  };
}

const six = (name, label, value) => ({ name, label, type: 'int', min: 0, max: 40, value });

export default {
  id: 'data-statistics',
  title: 'Describing Data',
  summary: 'Describe data with centre and spread, spot outliers, compare data sets, and use scatter plots, lines of fit and residuals.',
  standards: ['CCSS S-ID.A.1', 'CCSS S-ID.A.2', 'CCSS S-ID.A.3', 'CCSS S-ID.B.6', 'CCSS S-ID.C.7', 'CCSS S-ID.C.8'],

  explain: {
    intro: 'A data set is described by two things: where its centre is and how spread out it is. The mean and the median measure the centre. The interquartile range and the standard deviation measure the spread. When two quantities are measured together, a scatter plot shows how they are related, and a line of fit turns that relationship into predictions.',
    rules: [
      {
        title: 'Mean and median measure the centre',
        text: 'The mean is the total of the values divided by how many values there are. The median is the middle value when the values are in order. With an even number of values, the median is halfway between the two middle ones.',
        example: R`For 3, 5, 6, 8, 9, 11, 14 the mean is \(56 \div 7 = 8\) and the median is the 4th value, 8. For 4, 6, 9, 15 the median is \(\frac{6 + 9}{2} = 7.5\).`,
      },
      {
        title: 'Quartiles and the interquartile range',
        text: R`Split the ordered data into a lower half and an upper half. The lower quartile \(Q_1\) is the median of the lower half, and the upper quartile \(Q_3\) is the median of the upper half. In this course, when the number of values is odd, the median itself is left out of both halves. (Some books and spreadsheets use slightly different rules.) The interquartile range, \(\text{IQR} = Q_3 - Q_1\), is the spread of the middle half of the data. A box plot marks the smallest value, \(Q_1\), the median, \(Q_3\) and the largest value.`,
        example: R`For 3, 5, 6, 8, 9, 11, 14, leave out the median, 8. The halves are 3, 5, 6 and 9, 11, 14, so \(Q_1 = 5\), \(Q_3 = 11\) and \(\text{IQR} = 11 - 5 = 6\).`,
      },
      {
        title: 'Standard deviation: a typical distance from the mean',
        text: 'Find the distance of each value from the mean. Square each distance, average the squares by dividing by the number of values, and take the square root. A larger standard deviation means the values are more spread out around the mean. Calculators also show a version that divides by one less than the number of values; this course does not use it.',
        example: R`For 2, 4, 4, 4, 5, 5, 7, 9 the mean is 5. The squared distances add up to 32, then \(32 \div 8 = 4\) and \(\sqrt{4} = 2\).`,
      },
      {
        title: 'Outliers and what they do',
        text: R`An outlier is a value far from the rest. A common test: a value is an outlier if it is more than \(1.5 \times \text{IQR}\) below \(Q_1\) or above \(Q_3\). An outlier pulls the mean toward it but hardly moves the median. For data with an outlier or a long tail, use the median and the IQR. For roughly symmetric data, the mean and the standard deviation work well.`,
        example: R`For 3, 5, 5, 6, 7, 8, 8, 30: \(Q_1 = 5\), \(Q_3 = 8\) and \(\text{IQR} = 3\). The upper boundary is \(8 + 4.5 = 12.5\), so 30 is an outlier. The mean is 9, but the median is 6.5.`,
      },
      {
        title: 'Comparing two data sets',
        text: 'Compare one measure of centre and one measure of spread, and say what each difference means in the setting. A higher median or mean means the values are typically larger. A larger IQR or standard deviation means the values vary more.',
        example: 'Route A: median 26 minutes, IQR 6. Route B: median 30 minutes, IQR 4. Route A is usually quicker, and Route B is more consistent.',
      },
      {
        title: 'Scatter plots and correlation',
        text: R`A scatter plot shows pairs of values as points. If the points rise from left to right, the association is positive; if they fall, it is negative. The correlation coefficient \(r\) is between \(-1\) and \(1\). Its sign gives the direction, and the closer it is to \(-1\) or \(1\), the closer the points are to a straight line. A strong correlation does not show that one quantity causes the other.`,
        example: R`\(r = 0.9\) for ice-cream sales and sunburn cases is a strong positive association. Ice cream does not cause sunburn: hot, sunny weather raises both.`,
      },
      {
        title: 'Lines of fit and residuals',
        text: R`A line of fit \(y = mx + b\) summarises the trend. The slope \(m\) is the predicted change in \(y\) for each increase of 1 in \(x\), and \(b\) is the prediction when \(x = 0\). Substitute an \(x\)-value to make a prediction. A residual is the actual value minus the predicted value: positive for a point above the line, negative for a point below it. If the residuals show no pattern, the line is a reasonable fit.`,
        example: R`\(s = 5h + 50\) predicts \(5(6) + 50 = 80\) points for 6 hours of study. A student who scored 72 has residual \(72 - 80 = -8\).`,
      },
    ],
    vocab: [
      { term: 'median', def: 'The middle value of the ordered data (or halfway between the two middle values).' },
      { term: 'quartiles', def: R`\(Q_1\) and \(Q_3\): the medians of the lower half and the upper half of the ordered data.` },
      { term: 'interquartile range (IQR)', def: R`\(Q_3 - Q_1\), the spread of the middle half of the data.` },
      { term: 'standard deviation', def: 'A typical distance of the values from the mean: the square root of the average squared distance.' },
      { term: 'outlier', def: 'A value that is far from the rest of the data.' },
      { term: 'correlation coefficient', def: R`A number \(r\) from \(-1\) to \(1\) that measures the direction and strength of a linear association.` },
      { term: 'line of fit', def: 'A line drawn through a scatter plot to summarise the trend and make predictions.' },
      { term: 'residual', def: 'Actual value minus predicted value: how far a point is above or below the line of fit.' },
    ],
    mistakes: [
      'Finding the median before putting the values in order.',
      'Giving the range (largest minus smallest) when the question asks for the interquartile range.',
      'Keeping the median in both halves when finding the quartiles of an odd number of values. In this course it is left out.',
      'Stopping at the average of the squared distances. The standard deviation is the square root of that number.',
      'Subtracting the wrong way round for a residual. It is actual minus predicted.',
      'Treating a strong correlation as proof that one thing causes another.',
    ],
    visual: [
      { type: 'dotPlot', values: [2, 4, 4, 5, 6, 7, 7, 10], min: 0, max: 12, label: 'A data set of 8 values' },
      boxPlot([{ min: 2, q1: 4, med: 5.5, q3: 7, max: 10 }], [0, 12], 1, 'Box plot of the same 8 values, with its parts named: smallest value 2, lower quartile Q1 = 4, median 5.5, upper quartile Q3 = 7, largest value 10.', true),
    ],
  },

  examples: [
    {
      title: 'Centre and spread of a small data set',
      problem: 'Seven friends each added some songs to a shared playlist: 3, 5, 6, 8, 9, 11 and 14 songs. Find the mean, the median and the interquartile range.',
      steps: [
        R`Mean: \(3 + 5 + 6 + 8 + 9 + 11 + 14 = 56\), and \(56 \div 7 = 8\).`,
        'Median: the values are in order and there are 7 of them, so the median is the 4th value, 8.',
        R`Quartiles: leave out the median and split the rest into halves. Lower half: 3, 5, 6, so \(Q_1 = 5\). Upper half: 9, 11, 14, so \(Q_3 = 11\).`,
        R`Interquartile range: \(Q_3 - Q_1 = 11 - 5 = 6\).`,
      ],
      answer: 'Mean 8, median 8, interquartile range 6',
    },
    {
      title: 'Standard deviation, step by step',
      problem: 'Find the standard deviation of the data set 2, 4, 4, 4, 5, 5, 7, 9.',
      steps: [
        R`Mean: the total is 40 and there are 8 values, so the mean is \(40 \div 8 = 5\).`,
        'Find how far each value is from the mean, and square each distance. The table shows the results.',
        R`Average of the squared distances: \((9 + 1 + 1 + 1 + 0 + 0 + 4 + 16) \div 8 = 32 \div 8 = 4\).`,
        R`Standard deviation: \(\sqrt{4} = 2\). A typical value is about 2 away from the mean.`,
      ],
      answer: R`Standard deviation \(= 2\)`,
      visual: {
        type: 'table', caption: 'Distances from the mean, 5', headers: ['Value', 'Distance from the mean', 'Distance squared'],
        rows: [[2, -3, 9], [4, -1, 1], [4, -1, 1], [4, -1, 1], [5, 0, 0], [5, 0, 0], [7, 2, 4], [9, 4, 16]].map((row) => row.map((v) => R`\(${v}\)`)),
      },
    },
    {
      title: 'Word problem: is it an outlier, and does it matter?',
      word: true,
      problem: 'Eight students timed their journeys to school, in minutes: 3, 5, 5, 6, 7, 8, 8, 30. Is 30 an outlier? Which describes a typical journey better, the mean or the median?',
      steps: [
        R`Quartiles: the lower half is 3, 5, 5, 6, so \(Q_1 = 5\). The upper half is 7, 8, 8, 30, so \(Q_3 = 8\). \(\text{IQR} = 8 - 5 = 3\).`,
        R`Upper boundary: \(Q_3 + 1.5 \times \text{IQR} = 8 + 4.5 = 12.5\). Since \(30 > 12.5\), the value 30 is an outlier.`,
        R`Mean: \(72 \div 8 = 9\). Median: halfway between 6 and 7, which is 6.5.`,
        'Seven of the eight journeys are shorter than the mean, because the one long journey pulls the mean up. The median is hardly affected by it.',
      ],
      answer: '30 is an outlier. The median, 6.5 minutes, describes a typical journey better than the mean, 9 minutes',
    },
    {
      title: 'Word problem: comparing two bus routes',
      word: true,
      problem: 'The box plots show journey times, in minutes, on two bus routes: Route A (top) and Route B (bottom). Which route is usually quicker, and which is more reliable?',
      steps: [
        'Centre: the median line is at 26 for Route A and at 30 for Route B, so a typical journey on Route A is 4 minutes shorter.',
        R`Spread: the interquartile range is \(30 - 24 = 6\) for Route A and \(32 - 28 = 4\) for Route B. The ranges are \(44 - 20 = 24\) and \(36 - 26 = 10\).`,
        'Route B has the smaller spread, so its journey times vary less from day to day.',
      ],
      answer: 'Route A is usually quicker (lower median). Route B is more reliable (smaller spread)',
      visual: boxPlot([{ label: 'A', min: 20, q1: 24, med: 26, q3: 30, max: 44 }, { label: 'B', min: 26, q1: 28, med: 30, q3: 32, max: 36 }], [18, 46], 2, 'Two box plots on the same scale. Route A: smallest value 20, lower quartile 24, median 26, upper quartile 30, largest value 44. Route B: smallest value 26, lower quartile 28, median 30, upper quartile 32, largest value 36.'),
    },
    {
      title: 'Word problem: a line of fit and a residual',
      word: true,
      problem: R`For one class, a line of fit for test score \(s\) against hours of study \(h\) is \(s = 5h + 50\). Say what the slope and the intercept mean. Then find the residual for a student who studied for 6 hours and scored 72.`,
      steps: [
        'Slope 5: each extra hour of study goes with a predicted increase of 5 points.',
        'Intercept 50: the model predicts 50 points for a student who does not study.',
        R`Prediction for 6 hours: \(s = 5(6) + 50 = 80\).`,
        R`Residual \(=\) actual \(-\) predicted \(= 72 - 80 = -8\). The student scored 8 points below the prediction, so the point is below the line.`,
      ],
      answer: R`Slope: 5 more points per hour. Intercept: 50 points for 0 hours. Residual: \(-8\)`,
      visual: {
        type: 'plot', x: [0, 9], y: [40, 100], axisLabels: ['h', 's'], fns: [{ f: (h) => 5 * h + 50 }],
        segments: [{ from: [6, 72], to: [6, 80], dashed: true, label: 'residual −8' }],
        points: [[1, 54], [2, 62], [3, 63], [4, 72], [5, 73], [7, 86], [8, 89]].map(([x, y]) => ({ x, y })).concat([{ x: 6, y: 72, color: 'b', label: '(6, 72)' }]),
        alt: 'Scatter plot of test score against hours of study with the line of fit s = 5h + 50. The point (6, 72) is 8 points below the line, joined to it by a dashed segment.',
      },
    },
  ],

  models: [
    {
      id: 'six-values',
      title: 'Centre and spread of six values',
      intro: 'Type any six whole numbers. Try making one of them much larger than the rest.',
      inputs: [six('a', 'First value', 3), six('b', 'Second value', 5), six('c', 'Third value', 6), six('d', 'Fourth value', 8), six('e', 'Fifth value', 9), six('f', 'Sixth value', 23)],
      compute: sixModel,
    },
    {
      id: 'standard-deviation',
      title: 'Standard deviation of five values',
      intro: 'Change the values and watch how the distances from the mean change the standard deviation.',
      inputs: [['a', 'First', 2], ['b', 'Second', 4], ['c', 'Third', 5], ['d', 'Fourth', 6], ['e', 'Fifth', 8]].map(([name, label, value]) => ({ name, label: `${label} value`, type: 'int', min: 0, max: 30, value })),
      compute: deviationModel,
    },
    {
      id: 'line-of-fit',
      title: 'Word problem: prediction and residual',
      word: true,
      intro: 'Change the line of fit, the hours of study and the score the student really got.',
      inputs: [
        { name: 'm', label: 'Slope (points per hour)', type: 'number', min: 1, max: 8, step: 0.5, value: 5 },
        { name: 'b', label: 'Intercept (points)', type: 'int', min: 30, max: 60, value: 50 },
        { name: 'h', label: 'Hours studied', type: 'int', min: 0, max: 8, value: 6 },
        { name: 's', label: 'Actual score', type: 'int', min: 0, max: 100, value: 72 },
      ],
      compute: fitModel,
    },
  ],

  quiz: {
    easy: [easyCentre, easyDotPlot, easyAssociation],
    medium: [mediumIQR, mediumBoxPlot, mediumLineOfFit, mediumOutlierEffect],
    hard: [hardOutlierRule, hardStandardDeviation, hardResidual, hardCompare],
    challenge: [challengeMissingValue, challengeCorrelation, challengeFitPredict],
  },
};
