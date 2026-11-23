import { R, q, num, txt, money, person, people, linear, round, sum, checkEqual, checkAll } from '../../lib/index.js';
import { pct } from './_shared.js';

// ───────────── Data helpers ─────────────

const mean = (a) => sum(a) / a.length;
/** Pearson correlation of the points, used only in checks. */
function corr(pts) {
  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  const sxy = sum(pts.map((p) => (p.x - mx) * (p.y - my)));
  const sxx = sum(pts.map((p) => (p.x - mx) ** 2));
  const syy = sum(pts.map((p) => (p.y - my) ** 2));
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}
/** Least-squares line through the points: { m, b }. */
function lsq(pts) {
  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  const m = sum(pts.map((p) => (p.x - mx) * (p.y - my))) / sum(pts.map((p) => (p.x - mx) ** 2));
  return { m, b: my - m * mx };
}
const sse = (pts, m, b) => sum(pts.map((p) => (p.y - (m * p.x + b)) ** 2));
/** How much higher the middle third of the points sits than the outer two thirds, as a share of the y-axis. */
function hump(pts, yr) {
  const s = [...pts].sort((p, q2) => p.x - q2.x);
  const k = Math.floor(s.length / 3);
  const mid = s.slice(k, s.length - k).map((p) => p.y);
  const ends = [...s.slice(0, k), ...s.slice(s.length - k)].map((p) => p.y);
  return (mean(mid) - mean(ends)) / (yr[1] - yr[0]);
}
const list = (pts) => pts.map((p) => `(${txt(p.x)}, ${txt(p.y)})`).join(', ');
const byX = (pts) => [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
const eq = (m, b) => `y = ${linear(m, b)}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// An axis label read as part of a sentence: "outside temperature (°C)" → "outside temperature in °C".
const inWords = (label) => label.replace(/ \(([^)]+)\)$/, ' in $1');

// Scatter-plot settings. `line` settings can be used with a line of fit; the others are for describing a pattern.
const CTX = {
  study: { x: 'hours studied', y: 'test score', xr: [0, 10], yr: [30, 100], step: [1, 10], xd: [1, 10], who: 'students', line: { m: [3, 4, 5], b: (m) => [40, 92 - 10 * m] }, noise: 5, fmtY: (v) => `${txt(v)} ${v === 1 ? 'point' : 'points'}`, perX: 'each extra hour of study', change: (v, up) => (up ? `adds about ${v} ${v === 1 ? 'point' : 'points'} to the score` : `lowers the score by about ${v} ${v === 1 ? 'point' : 'points'}`), xUnit: ['hour', 'hours'], zero: 'A student who studies for 0 hours', start: (v) => `is predicted to score about ${v} points`, ask: (k) => `a student who studies for ${k} ${k === 1 ? 'hour' : 'hours'}`, yWord: 'the test score', yn: 'test score', yu: ' points', askX: (Y) => `about how many hours of study give a predicted score of ${Y} points`, fmtX: (v) => `\\(${num(v)}\\) ${v === 1 ? 'hour' : 'hours'}`, label: 'person' },
  car: { x: 'age of the car (years)', y: 'value (thousands of dollars)', xr: [0, 12], yr: [0, 35], step: [1, 5], xd: [1, 12], who: 'cars', line: { m: [-2], b: () => [27, 33] }, noise: 2, fmtY: (v) => money(v * 1000), perX: 'each extra year of age', change: (v, up) => (up ? `adds about ${money(v * 1000)} to the value` : `lowers the value by about ${money(v * 1000)}`), xUnit: ['year', 'years'], zero: 'A new car (0 years old)', start: (v) => `is predicted to be worth about ${money(v * 1000)}`, ask: (k) => `a car that is ${k} ${k === 1 ? 'year' : 'years'} old`, yWord: 'the value', yn: 'value', yu: ' thousand dollars', askX: (Y) => `at about what age is a car predicted to be worth ${money(Y * 1000)}`, fmtX: (v) => `\\(${num(v)}\\) ${v === 1 ? 'year' : 'years'} old`, label: 'Car A' },
  tickets: { x: 'ticket price (dollars)', y: 'tickets sold', xr: [0, 30], yr: [0, 200], step: [5, 20], xd: [4, 28], who: 'concerts', line: { m: [-5, -6], b: (m) => [175, 195 + (m + 6) * 5] }, noise: 10, fmtY: (v) => `${txt(v)} ${v === 1 ? 'ticket' : 'tickets'}`, perX: 'each extra dollar on the ticket price', change: (v, up) => (up ? `adds about ${v} tickets to the number sold` : `lowers the number sold by about ${v} tickets`), xUnit: ['dollar', 'dollars'], zero: 'A free concert (a price of $0)', start: (v) => `is predicted to give away about ${v} tickets`, ask: (k) => `a concert with tickets at ${money(k)}`, yWord: 'the number of tickets sold', yn: 'number of tickets sold', yu: '', askX: (Y) => `at about what ticket price are ${Y} tickets predicted to be sold`, fmtX: (v) => money(v), label: 'Concert A' },
  heating: { x: 'outside temperature (°C)', y: 'heating cost (dollars)', xr: [0, 30], yr: [0, 120], step: [5, 20], xd: [1, 29], who: 'days', line: { m: [-3], b: () => [100, 115] }, noise: 6, fmtY: (v) => money(v), perX: 'each extra degree of outside temperature', change: (v, up) => (up ? `adds about ${money(v)} to the heating cost` : `lowers the heating cost by about ${money(v)}`), xUnit: ['degree', 'degrees'], zero: 'A day when it is 0 °C outside', start: (v) => `is predicted to cost about ${money(v)} to heat`, ask: (k) => `a day when it is ${k} °C outside`, yWord: 'the heating cost', yn: 'heating cost', yu: ' dollars', askX: (Y) => `at about what outside temperature is the heating cost predicted to be ${money(Y)}`, fmtX: (v) => `\\(${num(v)}\\) °C`, label: 'Day A' },
  drinks: { x: 'temperature (°C)', y: 'cold drinks sold', xr: [10, 40], yr: [0, 120], step: [5, 20], xd: [12, 38], who: 'days', line: { m: [3], b: () => [-28, -5] }, noise: 6 },
  height: { x: 'height (cm)', y: 'arm span (cm)', xr: [140, 190], yr: [140, 190], step: [10, 10], xd: [142, 188], who: 'people', line: { m: [1], b: () => [-4, 4] }, noise: 3, yn: 'arm span', yu: ' cm' },
  shoe: { x: 'shoe size', y: 'quiz score', xr: [4, 13], yr: [0, 20], step: [1, 2], xd: [5, 12], who: 'students', band: [3, 19] },
  birthday: { x: 'day of the month born', y: 'height (cm)', xr: [0, 31], yr: [130, 180], step: [5, 10], xd: [1, 31], who: 'students', band: [140, 178] },
  letters: { x: 'letters in first name', y: 'minutes to get to school', xr: [2, 10], yr: [0, 40], step: [1, 5], xd: [3, 9], who: 'students', band: [5, 38] },
  fuel: { x: 'speed (mph)', y: 'fuel economy (mpg)', xr: [10, 80], yr: [10, 40], step: [10, 5], xd: [15, 75], who: 'test drives', band: [14, 37], curve: true },
  ball: { x: 'time (seconds)', y: 'height of a thrown ball (m)', xr: [0, 4], yr: [0, 25], step: [0.5, 5], xd: [0.25, 3.75], dx: 0.25, who: 'moments', band: [2, 22], curve: true },
};
const POS = ['study', 'drinks', 'height'];
const NEG = ['car', 'tickets', 'heating'];
const FIT = ['study', 'car', 'tickets', 'heating'];

/** n x-values from the setting's data range (whole numbers, or steps of dx), as spread out as possible. */
function xs(rng, c, n) {
  const dx = c.dx ?? 1;
  const all = [];
  for (let v = c.xd[0]; v <= c.xd[1] + 1e-9; v += dx) all.push(round(v, 2));
  const out = all.length >= n ? rng.sample(all, n) : [...all, ...Array.from({ length: n - all.length }, () => rng.pick(all))];
  return out.sort((a, b) => a - b);
}
const clampY = (c, y) => Math.max(c.yr[0], Math.min(c.yr[1], y));
/** Points scattered about the line y = mx + b. */
function linePoints(rng, c, m, b, n = rng.int(10, 12), noise = c.noise) {
  const seen = new Set();
  return xs(rng, c, n).map((x) => {
    let y;
    do y = clampY(c, Math.round(m * x + b + rng.float(-noise, noise)));
    while (seen.has(`${x},${y}`));
    seen.add(`${x},${y}`);
    return { x, y };
  });
}
function pickLine(rng, c) {
  const m = rng.pick(c.line.m);
  const [lo, hi] = c.line.b(m);
  return { m, b: rng.int(lo, hi) };
}
/** Points with no association, or (for curve settings) rising then falling. */
function bandPoints(rng, c, shape, n = rng.int(10, 12)) {
  const [lo, hi] = c.band;
  return xs(rng, c, n).map((x) => {
    const u = (x - c.xd[0]) / (c.xd[1] - c.xd[0]);
    const v = shape === 'curve' ? 0.1 + 3.4 * u * (1 - u) + rng.float(-0.06, 0.06) : rng.float(0, 1);
    return { x, y: Math.round(lo + Math.max(0, Math.min(1, v)) * (hi - lo)) };
  });
}
function scatter(c, pts, extra = {}, more = '') {
  return { type: 'plot', x: c.xr, y: c.yr, step: c.step, axisLabels: [c.x, c.y], points: pts.map((p) => ({ x: p.x, y: p.y, label: p.label })), alt: `A scatter plot with ${inWords(c.x)} across and ${inWords(c.y)} up. The ${pts.length} points are ${list(byX(pts))}.${more}`, ...extra };
}
/** The kind of pattern, decided from the numbers alone. */
function classify(pts, yr) {
  const r = corr(pts);
  const h = hump(pts, yr);
  if (r > 0.75) return 'positive';
  if (r < -0.75) return 'negative';
  if (Math.abs(r) < 0.3 && h > 0.25) return 'curve';
  if (Math.abs(r) < 0.3 && Math.abs(h) < 0.12) return 'none';
  return 'unclear';
}

// Two-way tables. Each row and column has the words needed to ask about it.
const SURVEYS = [
  { intro: 'Students were asked whether they have a curfew and whether they do chores at home.', who: 'students', rv: 'having a curfew', cv: 'doing chores', rows: [{ label: 'Has a curfew', noun: 'students with a curfew', is: 'have a curfew' }, { label: 'No curfew', noun: 'students without a curfew', is: 'do not have a curfew' }], cols: [{ label: 'Does chores', pred: 'do chores', noun: 'students who do chores' }, { label: 'No chores', pred: 'do not do chores', noun: 'students who do not do chores' }] },
  { intro: 'Students in two grades were asked whether they prefer dogs or cats.', who: 'students', rv: 'grade', cv: 'preferring dogs or cats', rows: [{ label: 'Grade 7', noun: 'Grade 7 students', is: 'are in Grade 7' }, { label: 'Grade 8', noun: 'Grade 8 students', is: 'are in Grade 8' }], cols: [{ label: 'Dogs', pred: 'prefer dogs', noun: 'students who prefer dogs' }, { label: 'Cats', pred: 'prefer cats', noun: 'students who prefer cats' }] },
  { intro: 'Students were asked whether they play a sport and whether they play an instrument.', who: 'students', rv: 'playing a sport', cv: 'playing an instrument', rows: [{ label: 'Plays a sport', noun: 'students who play a sport', is: 'play a sport' }, { label: 'No sport', noun: 'students who do not play a sport', is: 'do not play a sport' }], cols: [{ label: 'Plays an instrument', pred: 'play an instrument', noun: 'students who play an instrument' }, { label: 'No instrument', pred: 'do not play an instrument', noun: 'students who do not play an instrument' }] },
  { intro: 'Teens and adults were asked whether they prefer texting or calling.', who: 'people', rv: 'age group', cv: 'preferring texting or calling', rows: [{ label: 'Teens', noun: 'teens', is: 'are teens' }, { label: 'Adults', noun: 'adults', is: 'are adults' }], cols: [{ label: 'Texting', pred: 'prefer texting', noun: 'people who prefer texting' }, { label: 'Calling', pred: 'prefer calling', noun: 'people who prefer calling' }] },
  { intro: 'Students were asked how they get to school and whether they eat breakfast.', who: 'students', rv: 'how students get to school', cv: 'eating breakfast', rows: [{ label: 'Walks', noun: 'students who walk to school', is: 'walk to school' }, { label: 'Rides', noun: 'students who ride to school', is: 'ride to school' }], cols: [{ label: 'Eats breakfast', pred: 'eat breakfast', noun: 'students who eat breakfast' }, { label: 'Skips breakfast', pred: 'skip breakfast', noun: 'students who skip breakfast' }] },
];
const NICE = [20, 25, 40, 50, 60, 80, 100];
/** A count k out of total such that 100k/total is a whole number, with the share between lo and hi. */
function share(rng, total, lo, hi) {
  const ok = [];
  for (let k = Math.ceil(lo * total); k <= Math.floor(hi * total); k++) if ((100 * k) % total === 0) ok.push(k);
  return ok.length ? rng.pick(ok) : null;
}
/** A 2 × 2 table [[a, b], [c, d]] with whole-number row percents; `gap` 'big' or 'small' sets how different they are. */
function makeTable(rng, gap) {
  for (;;) {
    const [R1, R2] = [rng.pick(NICE), rng.pick(NICE)];
    if (R1 === R2 && rng.bool(0.7)) continue;
    const a = share(rng, R1, 0.1, 0.9);
    const c = share(rng, R2, 0.1, 0.9);
    if (a == null || c == null) continue;
    const d = Math.abs(a / R1 - c / R2);
    if (gap === 'big' ? d < 0.25 : gap === 'small' ? d > 0.05 : false) continue;
    return [[a, R1 - a], [c, R2 - c]];
  }
}
function tableVisual(s, t, hide = []) {
  const [[a, b], [c, d]] = t;
  const cells = [[a, b, a + b], [c, d, c + d], [a + c, b + d, a + b + c + d]];
  const shown = cells.map((row, i) => row.map((v, j) => (hide.some(([hi, hj]) => hi === i && hj === j) ? '' : v)));
  const said = (v) => (v === '' ? 'blank' : txt(v));
  return {
    type: 'table',
    headers: ['Group', s.cols[0].label, s.cols[1].label, 'Total'],
    rowHeaders: true,
    rows: [[s.rows[0].label, ...shown[0]], [s.rows[1].label, ...shown[1]], ['Total', ...shown[2]]],
    alt: `A two-way table. ${s.rows[0].label}: ${s.cols[0].label} ${said(shown[0][0])}, ${s.cols[1].label} ${said(shown[0][1])}, total ${said(shown[0][2])}. ${s.rows[1].label}: ${s.cols[0].label} ${said(shown[1][0])}, ${s.cols[1].label} ${said(shown[1][1])}, total ${said(shown[1][2])}. Column totals: ${s.cols[0].label} ${said(shown[2][0])}, ${s.cols[1].label} ${said(shown[2][1])}, grand total ${said(shown[2][2])}.`,
  };
}
/** Read the table back from its picture (the numbers in the cells), for checks. */
const readBack = (v) => v.rows.map((r) => r.slice(1).map((x) => (x === '' ? null : Number(String(x).replace(/,/g, '')))));
const clean = (x) => (Number.isFinite(x) && Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : null);

// ───────────── Easy: reading a scatter plot, the kind of association, reading a two-way table ─────────────

function easyReadPlot(rng) {
  const key = rng.pick(['study', 'car', 'height', 'tickets']);
  const c = CTX[key];
  const { m, b } = pickLine(rng, c);
  const pts = linePoints(rng, c, m, b);
  const named = c.label && rng.bool(0.5);
  if (named) {
    const i = rng.int(1, pts.length - 2);
    const p = pts[i];
    p.y = clampY(c, Math.round(p.y / c.step[1]) * c.step[1]);
    if (pts.some((o, j) => j !== i && o.x === p.x && o.y === p.y)) return easyReadPlot(rng);
    const name = c.label === 'person' ? person(rng) : c.label;
    p.label = name;
    const fmt = c.fmtY ?? ((v) => `\\(${num(v)}\\)`);
    return q({
      prompt: `The scatter plot shows the ${inWords(c.x)} and the ${inWords(c.y)} for ${pts.length} ${c.who}. The point for ${name} is labeled. What is the ${c.yn} for ${name}?`,
      visual: scatter(c, pts, {}, ` The point (${txt(p.x)}, ${txt(p.y)}) is labeled ${name}.`),
      correct: p.y,
      fmt,
      wrong: [{ value: p.x, why: `${txt(p.x)} is the ${inWords(c.x)}, read across. The ${c.yn} is read up the side of the graph.` }, p.y + c.step[1], p.y - c.step[1], p.y + c.step[1] / 2, p.y - c.step[1] / 2].filter((w) => (w.value ?? w) > 0 && (w.value ?? w) !== p.y),
      solution: [`Find the point labeled ${name}. It is above ${txt(p.x)} on the across axis.`, `Read across from the point to the up axis, which shows the ${inWords(c.y)}: it is at ${txt(p.y)}.`, `So the ${c.yn} for ${name} is ${fmt(p.y).replace(/\\\(|\\\)/g, '')}.`],
      rule: 0,
      skill: 'reading a scatter plot',
      check: () => {
        const found = scatter(c, pts).points.filter((o) => o.label === name);
        return found.length === 1 && found[0].y === p.y ? true : 'the labeled point does not match';
      },
    });
  }
  const ys = pts.map((p) => p.y).sort((u, v) => u - v);
  const lines = [];
  for (let T = c.yr[0] + c.step[1]; T < c.yr[1]; T += c.step[1]) if (T > ys[1] && T < ys[ys.length - 2] && pts.every((p) => Math.abs(p.y - T) >= c.step[1] * 0.2)) lines.push(T);
  if (!lines.length) return easyReadPlot(rng);
  const T = rng.pick(lines);
  const above = pts.filter((p) => p.y > T).length;
  return q({
    prompt: `The scatter plot shows the ${inWords(c.x)} and the ${inWords(c.y)} for ${pts.length} ${c.who}. How many of the ${c.who} have ${/^[aeiou]/i.test(c.yn) ? 'an' : 'a'} ${c.yn} of more than ${txt(T)}${c.yu}?`,
    visual: scatter(c, pts),
    correct: above,
    wrong: [{ value: pts.length - above, why: `That counts the points below ${txt(T)}. Count the points higher than the grid line at ${txt(T)}.` }, { value: pts.length, why: 'That is every point. Count only the points higher than the grid line.' }, above + 1, above - 1, above + 2],
    solution: [`Each point is one of the ${c.who}. Find the grid line at ${txt(T)} on the up axis.`, `The points above that line are ${list(byX(pts.filter((p) => p.y > T)))}.`, `That is ${above} of the ${pts.length} points.`],
    rule: 0,
    skill: 'reading a scatter plot',
    check: () => checkEqual(scatter(c, pts).points.reduce((n, p) => n + (p.y > T ? 1 : 0), 0), above),
  });
}

const KINDS = { positive: 'Positive linear association', negative: 'Negative linear association', none: 'No association', curve: 'Nonlinear association' };

function easyAssociation(rng) {
  const kind = rng.pick(['positive', 'negative', 'none', 'curve', 'positive', 'negative']);
  const key = rng.pick(kind === 'positive' ? POS : kind === 'negative' ? NEG : kind === 'none' ? ['shoe', 'birthday', 'letters'] : ['fuel', 'ball']);
  const c = CTX[key];
  let pts;
  do {
    if (c.line) {
      const { m, b } = pickLine(rng, c);
      pts = linePoints(rng, c, m, b);
    } else pts = bandPoints(rng, c, kind === 'curve' ? 'curve' : 'flat');
  } while (classify(pts, c.yr) !== kind);
  const say = {
    positive: 'From left to right the points tend to go up, close to a straight line: when one measurement is larger, the other tends to be larger too.',
    negative: 'From left to right the points tend to go down, close to a straight line: when one measurement is larger, the other tends to be smaller.',
    none: 'The points are scattered with no up or down pattern: knowing one measurement does not help predict the other.',
    curve: 'From left to right the points rise and then fall. They follow a curve, not a straight line.',
  };
  return q({
    prompt: 'What kind of association does the scatter plot show?',
    visual: scatter(c, pts),
    correct: KINDS[kind],
    wrong: Object.keys(KINDS).filter((k) => k !== kind).map((k) => ({ value: KINDS[k], why: say[kind] })),
    solution: ['Look at the overall pattern of the points from left to right.', say[kind], `So the plot shows ${KINDS[kind].toLowerCase()}.`],
    rule: kind === 'curve' ? 1 : 0,
    skill: 'describing association',
    check: () => (classify(scatter(c, pts).points, c.yr) === kind ? true : 'the pattern does not match'),
  });
}

function easyTwoWayRead(rng) {
  const s = rng.pick(SURVEYS);
  const t = makeTable(rng, 'any');
  const ask = rng.pick(['cell', 'cell', 'row', 'col', 'all']);
  const [i, j] = [rng.int(0, 1), rng.int(0, 1)];
  const RT = [t[0][0] + t[0][1], t[1][0] + t[1][1]];
  const C = [t[0][0] + t[1][0], t[0][1] + t[1][1]];
  const N = RT[0] + RT[1];
  const hide = ask === 'cell' ? [] : [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]];
  const visual = tableVisual(s, t, hide);
  const unit = s.who;
  const spec = {
    cell: { prompt: `How many ${s.rows[i].noun} ${s.cols[j].pred}?`, ans: t[i][j], wrong: [{ value: t[i][1 - j], why: `That is the cell in the column "${s.cols[1 - j].label}". Use the column "${s.cols[j].label}".` }, { value: t[1 - i][j], why: `That is the cell in the row "${s.rows[1 - i].label}". Use the row "${s.rows[i].label}".` }, RT[i], C[j]], steps: [`Find the row "${s.rows[i].label}" and the column "${s.cols[j].label}".`, `The cell where they meet is ${t[i][j]}.`] },
    row: { prompt: `The totals are missing. How many ${s.rows[i].noun} were surveyed?`, ans: RT[i], wrong: [{ value: C[i], why: 'That adds a column. Add across the row instead.' }, t[i][0], t[i][1], RT[1 - i]], steps: [`Add across the row "${s.rows[i].label}".`, R`\(${t[i][0]} + ${t[i][1]} = ${RT[i]}\).`] },
    col: { prompt: `The totals are missing. How many of the ${unit} surveyed ${s.cols[j].pred}?`, ans: C[j], wrong: [{ value: R[j], why: 'That adds a row. Add down the column instead.' }, t[0][j], t[1][j], C[1 - j]], steps: [`Add down the column "${s.cols[j].label}".`, R`\(${t[0][j]} + ${t[1][j]} = ${C[j]}\).`] },
    all: { prompt: `The totals are missing. How many ${unit} were surveyed in all?`, ans: N, wrong: [RT[0], C[0], N - t[1][1], N + 10], steps: ['Add all four counts.', R`\(${t[0][0]} + ${t[0][1]} + ${t[1][0]} + ${t[1][1]} = ${N}\).`] },
  }[ask];
  return q({
    prompt: `${s.intro} ${spec.prompt}`,
    visual,
    correct: spec.ans,
    unit,
    wrong: spec.wrong,
    solution: [...spec.steps, `The answer is ${spec.ans} ${unit}.`],
    rule: 4,
    skill: 'reading a two-way table',
    check: () => {
      const g = readBack(visual);
      const cells = [[g[0][0], g[0][1]], [g[1][0], g[1][1]]];
      const want = ask === 'cell' ? cells[i][j] : ask === 'row' ? cells[i][0] + cells[i][1] : ask === 'col' ? cells[0][j] + cells[1][j] : sum(cells.flat());
      return checkEqual(want, spec.ans);
    },
  });
}

// ───────────── Medium: outliers and clusters, predicting, what the slope and intercept mean, row percents ─────────────

const DOGS = [{ x: 30, y: 8 }, { x: 50, y: 22 }, { x: 70, y: 40 }];
const GEYSER = [{ x: 2, y: 55 }, { x: 4.4, y: 80 }];

function mediumOutlierCluster(rng) {
  if (rng.bool(0.35)) {
    const dogs = rng.bool();
    const centers = dogs ? (rng.bool() ? DOGS : rng.sample(DOGS, 2).sort((a, b) => a.x - b.x)) : GEYSER;
    const c = dogs ? { x: 'height (cm)', y: 'weight (kg)', xr: [20, 80], yr: [0, 50], step: [10, 10] } : { x: 'eruption length (minutes)', y: 'wait until the next eruption (minutes)', xr: [1, 6], yr: [40, 100], step: [1, 10] };
    const [wx, wy, dp] = dogs ? [6, 4, 0] : [0.4, 6, 1];
    const pts = centers.flatMap((ctr) => {
      const k = rng.int(4, 6);
      return Array.from({ length: k }, (_, i) => ({ x: round(ctr.x - wx + (2 * wx * i) / (k - 1) + rng.float(-wx / 10, wx / 10), dp), y: Math.round(ctr.y + rng.float(-wy, wy)) }));
    });
    const k = centers.length;
    const thing = dogs ? `${pts.length} dogs` : `${pts.length} eruptions of a geyser`;
    return q({
      prompt: `The scatter plot shows the ${inWords(c.x)} and the ${inWords(c.y)} for ${thing}. How many clusters do the points form?`,
      visual: scatter(c, pts),
      correct: k,
      wrong: [k === 2 ? 3 : 2, 1, 4],
      solution: ['A cluster is a group of points that sit close together, with gaps between the groups.', `Reading from left to right, the points form ${k} separate groups${dogs ? `, near heights of ${centers.map((ctr) => ctr.x).join(k === 2 ? ' and ' : ', ')} cm` : ': short eruptions with short waits, and long eruptions with long waits'}.`, `So there are ${k} clusters.`],
      rule: 1,
      skill: 'clusters and outliers',
      check: () => {
        const sx = scatter(c, pts).points.map((p) => p.x).sort((a, b) => a - b);
        const gaps = sx.slice(1).filter((x, i) => x - sx[i] > (c.xr[1] - c.xr[0]) / 10).length;
        return checkEqual(gaps + 1, k);
      },
    });
  }
  const c = CTX[rng.pick([...FIT, 'height'])];
  const { m, b } = pickLine(rng, c);
  const pts = linePoints(rng, c, m, b, rng.int(10, 12), c.noise * 0.6);
  const i = rng.int(Math.floor(pts.length / 3), Math.ceil((2 * pts.length) / 3) - 1);
  const span = c.yr[1] - c.yr[0];
  const fit = m * pts[i].x + b;
  const upRoom = c.yr[1] - fit;
  const shift = rng.float(0.32, 0.42) * span;
  pts[i].y = Math.round(upRoom > shift ? fit + shift : fit - shift);
  if (pts[i].y < c.yr[0] || pts[i].y > c.yr[1]) return mediumOutlierCluster(rng);
  const o = pts[i];
  const P = (p) => R`\((${num(p.x)}, ${num(p.y)})\)`;
  const s = byX(pts);
  const others = pts.filter((p) => p !== o);
  const top = others.reduce((a, p) => (p.y > a.y ? p : a));
  const low = others.reduce((a, p) => (p.y < a.y ? p : a));
  const end = { value: P(s[0] === o ? s[1] : s[0]), why: 'That point is at the end of the pattern, but it still follows the trend of the other points.' };
  return q({
    prompt: 'Which point is an outlier?',
    visual: scatter(c, pts),
    correct: P(o),
    wrong: [end, { value: P(top), why: 'That point has a large value, but it fits the trend of the other points.' }, { value: P(low), why: 'That point has a small value, but it fits the trend of the other points.' }, P(s[s.length - 1] === o ? s[s.length - 2] : s[s.length - 1]), ...rng.shuffle(others).slice(0, 4).map(P)],
    solution: ['An outlier is a point that is far away from the pattern of the other points.', `The points follow a ${m > 0 ? 'rising' : 'falling'} straight-line pattern. The point (${txt(o.x)}, ${txt(o.y)}) is far ${o.y > fit ? 'above' : 'below'} that pattern.`, `So (${txt(o.x)}, ${txt(o.y)}) is the outlier.`],
    rule: 1,
    skill: 'clusters and outliers',
    check: () => {
      const f = lsq(others);
      const worst = Math.max(...others.map((p) => Math.abs(p.y - (f.m * p.x + f.b))));
      return Math.abs(o.y - (f.m * o.x + f.b)) > 3 * worst ? true : 'the outlier is not clearly away from the pattern';
    },
  });
}

function mediumPredict(rng) {
  const c = CTX[rng.pick(FIT)];
  const { m, b } = pickLine(rng, c);
  const pts = linePoints(rng, c, m, b);
  const k = rng.int(Math.ceil(c.xd[0]), Math.floor(c.xd[1]));
  const y = m * k + b;
  return q({
    prompt: R`The line of fit for this scatter plot is \(${eq(m, b)}\), where \(x\) is the ${inWords(c.x)} and \(y\) is the ${inWords(c.y)}. Use the line to predict ${c.yWord} for ${c.ask(k)}.`,
    visual: scatter(c, pts, { fns: [{ f: (x) => m * x + b, color: 'b', label: `y = ${linear(m, b).replace(/-/g, '−')}` }] }, ` A line of fit, y = ${linear(m, b).replace(/-/g, '−')}, is drawn through the points.`),
    correct: y,
    fmt: c.fmtY,
    wrong: [{ value: m * k, why: R`\(${m} \times ${k}\) is only the change from the start. Add the \(y\)-intercept, \(${b}\), as well.` }, { value: y + m, why: R`Substitute \(x = ${k}\) exactly: \(${m}(${k}) ${b < 0 ? '-' : '+'} ${Math.abs(b)}\).` }, y - m, k + b, y + 2 * m].filter((w) => (w.value ?? w) > 0),
    solution: [R`Substitute \(x = ${k}\) into the equation of the line: \(y = ${m}(${k}) ${b < 0 ? '-' : '+'} ${Math.abs(b)}\).`, R`\(y = ${m * k} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${y}\).`, `The line predicts ${c.fmtY(y)}.`],
    rule: 3,
    skill: 'predicting with a line of fit',
    check: () => {
      const [y0, y10] = [b, 10 * m + b];
      return checkEqual(y0 + (k / 10) * (y10 - y0), y);
    },
  });
}

function mediumInterpret(rng) {
  const c = CTX[rng.pick(FIT)];
  const { m, b } = pickLine(rng, c);
  const up = m > 0;
  const am = Math.abs(m);
  const askSlope = rng.bool();
  const rate = (v, dir) => `${cap(c.perX)} ${c.change(v, dir)}.`;
  const start = (v) => `${c.zero} ${c.start(v)}.`;
  return q({
    prompt: R`The line of fit \(${eq(m, b)}\) predicts ${c.yWord} (\(y\)) from the ${inWords(c.x)} (\(x\)). What does the ${askSlope ? 'slope' : R`\(y\)-intercept`}, \(${askSlope ? m : b}\), tell you?`,
    correct: askSlope ? rate(am, up) : start(b),
    wrong: askSlope
      ? [{ value: rate(am, !up), why: R`The slope is ${up ? 'positive' : 'negative'}, so the predicted \(y\) ${up ? 'rises' : 'falls'} as \(x\) increases.` }, { value: start(am), why: R`The value when \(x = 0\) is the \(y\)-intercept, \(${b}\). The slope is a rate: the change for each 1 unit of \(x\).` }, rate(b, up), rate(b, !up)]
      : [{ value: start(am), why: R`\(${m}\) multiplies \(x\), so it is the slope, a rate. The \(y\)-intercept \(${b}\) is the prediction when \(x = 0\).` }, { value: rate(b, up), why: R`The \(y\)-intercept is not a rate. It is the value of \(y\) when \(x = 0\).` }, rate(b, !up), start(b + m)],
    solution: [R`In \(y = mx + b\), the slope \(m\) is the change in \(y\) for each 1 unit of \(x\), and \(b\) is the value of \(y\) when \(x = 0\).`, askSlope ? R`Here the slope is \(${m}\), so \(y\) changes by \(${m}\) for each extra ${c.xUnit[0]}.` : R`Here \(b = ${b}\): when \(x = 0\), \(y = ${b}\).`, `In words: ${(askSlope ? rate(am, up) : start(b)).replace(/^./, (ch) => ch.toLowerCase())}`],
    rule: 3,
    skill: 'meaning of slope and intercept',
    check: () => {
      const f = (x) => m * x + b;
      return checkAll(checkEqual(f(3) - f(2), m), checkEqual(f(0), b));
    },
  });
}

function mediumRowPercent(rng) {
  const s = rng.pick(SURVEYS);
  const t = makeTable(rng, 'any');
  const [i, j] = [rng.int(0, 1), rng.int(0, 1)];
  const R0 = t[i][0] + t[i][1];
  const C = t[0][j] + t[1][j];
  const N = sum(t.flat());
  const p = (100 * t[i][j]) / R0;
  const visual = tableVisual(s, t);
  return q({
    prompt: `${s.intro} What percent of the ${s.rows[i].noun} ${s.cols[j].pred}?`,
    visual,
    correct: p,
    fmt: pct,
    wrong: [{ value: clean((100 * t[i][j]) / C), why: `That divides by the column total, ${C}. The question is about the ${s.rows[i].noun}, so divide by their total, ${R0}.` }, { value: clean((100 * t[i][j]) / N), why: `That divides by everyone surveyed, ${N}. Divide by the number of ${s.rows[i].noun}, ${R0}.` }, { value: 100 - p, why: `That is the percent of ${s.rows[i].noun} who ${s.cols[1 - j].pred}.` }, t[i][j] !== p ? t[i][j] : null, p + 10],
    solution: [`The question is about the ${s.rows[i].noun}, so use their row. There are ${R0} of them in all.`, `${t[i][j]} of them ${s.cols[j].pred}.`, R`\(\frac{${t[i][j]}}{${R0}} = ${num(p / 100)} = ${num(p)}\%\).`],
    rule: 4,
    skill: 'row percents',
    check: () => {
      const g = readBack(visual);
      return checkEqual((100 * g[i][j]) / (g[i][0] + g[i][1]), p);
    },
  });
}

// ───────────── Hard: choosing a line of fit, a line through two points, association in a two-way table ─────────────

function hardBestLine(rng) {
  const c = CTX[rng.pick([...FIT, 'drinks'])];
  const { m, b } = pickLine(rng, c);
  const pts = linePoints(rng, c, m, b);
  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  const shiftBy = (rng.bool() ? 1 : -1) * Math.max(4 * c.noise, Math.round((c.yr[1] - c.yr[0]) / 4));
  const cands = [
    { m: m, b: b + shiftBy, why: `That line has the right steepness, but every point is ${shiftBy > 0 ? 'below' : 'above'} it. A good line of fit has about as many points above it as below it.` },
    { m: -m, b: Math.round(my + m * mx), why: `The points go ${m > 0 ? 'up' : 'down'} from left to right, so the line of fit needs a ${m > 0 ? 'positive' : 'negative'} slope.` },
    { m: 2 * m, b: Math.round(my - 2 * m * mx), why: 'That line is too steep: the points at both ends are far from it.' },
    { m: 0, b: Math.round(my), why: 'A flat line ignores the trend. The points clearly change as x increases.' },
  ];
  return q({
    prompt: 'Which equation is the best line of fit for the data in the scatter plot?',
    visual: scatter(c, pts),
    correct: R`\(${eq(m, b)}\)`,
    wrong: cands.map((w) => ({ value: R`\(${eq(w.m, w.b)}\)`, why: w.why })),
    solution: [`A good line of fit follows the direction of the points and passes close to most of them, with about as many points above it as below.`, `The points go ${m > 0 ? 'up' : 'down'} by about ${Math.abs(m)} for each 1 across, and a point at x = ${txt(pts[0].x)} is near y = ${txt(m * pts[0].x + b)}.`, R`The line \(${eq(m, b)}\) does that. Each of the other lines is too steep, too flat, points the wrong way or misses the points.`],
    rule: 2,
    skill: 'judging a line of fit',
    check: () => {
      const best = sse(pts, m, b);
      return cands.every((w) => sse(pts, w.m, w.b) > 2.5 * best) ? true : 'a wrong line fits almost as well';
    },
  });
}

function hardTwoPoints(rng) {
  const c = CTX[rng.pick(FIT)];
  const { m, b } = pickLine(rng, c);
  const pts = linePoints(rng, c, m, b);
  const [lo, hi] = [Math.ceil(c.xd[0]), Math.floor(c.xd[1])];
  const x1 = rng.int(lo, lo + Math.floor((hi - lo) / 3));
  const x2 = rng.int(hi - Math.floor((hi - lo) / 3), hi);
  const [y1, y2] = [m * x1 + b, m * x2 + b];
  const askRate = rng.bool(0.4);
  const x3 = rng.intExcept(lo, hi, [x1, x2]);
  const y3 = m * x3 + b;
  const dy = y2 - y1;
  const dx = x2 - x1;
  const plot = scatter(c, pts, { fns: [{ f: (x) => m * x + b, color: 'b' }] }, ` A line of fit is drawn through the marked points (${txt(x1)}, ${txt(y1)}) and (${txt(x2)}, ${txt(y2)}).`);
  plot.points = [...plot.points, { x: x1, y: y1, color: 'b', label: `(${txt(x1)}, ${txt(y1)})` }, { x: x2, y: y2, color: 'b', label: `(${txt(x2)}, ${txt(y2)})` }];
  const steps = [R`Slope of the line: \(\frac{${y2} - ${y1 < 0 ? `(${y1})` : y1}}{${x2} - ${x1}} = \frac{${dy}}{${dx}} = ${m}\).`, R`So ${c.perX} ${c.change(Math.abs(m), m > 0)}.`];
  if (askRate) {
    return q({
      prompt: `A line of fit is drawn through the marked points. By about how much does ${c.yWord} ${m > 0 ? 'go up' : 'go down'} for each extra ${c.xUnit[0]}?`,
      visual: plot,
      correct: Math.abs(m),
      fmt: c.fmtY,
      wrong: [{ value: Math.abs(dy), why: R`\(${Math.abs(dy)}\) is the change over \(${dx}\) ${c.xUnit[1]}. Divide by \(${dx}\) to get the change for one ${c.xUnit[0]}.` }, { value: clean(Math.abs(y2 / x2)) !== Math.abs(m) ? clean(Math.abs(y2 / x2)) : null, why: 'Dividing one point’s y by its x only works for a line through (0, 0). Use the change between two points.' }, Math.abs(m) + 1, Math.abs(m) + 2],
      solution: steps,
      rule: 3,
      skill: 'slope of a line of fit',
      check: () => checkEqual((plot.points.at(-1).y - plot.points.at(-2).y) / (plot.points.at(-1).x - plot.points.at(-2).x), m),
    });
  }
  return q({
    prompt: `A line of fit is drawn through the marked points. Use the line to predict ${c.yWord} for ${c.ask(x3)}.`,
    visual: plot,
    correct: y3,
    fmt: c.fmtY,
    wrong: [{ value: m * x3, why: R`The line does not pass through \((0, 0)\). Start from a known point: \(${y1} ${m < 0 ? '-' : '+'} ${Math.abs(m)}(${x3} - ${x1})\).` }, { value: y1 + (x3 - x1), why: R`Each ${c.xUnit[0]} changes \(y\) by the slope, \(${m}\), not by 1.` }, y3 + m, y3 - m, y3 + 2 * m].filter((w) => (w.value ?? w) > 0 && (w.value ?? w) !== y3),
    solution: [...steps, R`From \((${x1}, ${y1})\) to \(x = ${x3}\) is \(${x3 - x1}\) ${Math.abs(x3 - x1) === 1 ? c.xUnit[0] : c.xUnit[1]}: \(${y1} ${m < 0 ? '-' : '+'} ${Math.abs(m)}(${x3 - x1}) = ${y3}\).`, `The line predicts ${c.fmtY(y3)}.`],
    rule: 3,
    skill: 'predicting with a line of fit',
    check: () => checkAll(checkEqual(y1 + ((y2 - y1) / (x2 - x1)) * (x3 - x1), y3), checkEqual(m * x3 + b, y3)),
  });
}

function hardAssociation(rng) {
  const s = rng.pick(SURVEYS);
  const big = rng.bool();
  const t = makeTable(rng, big ? 'big' : 'small');
  const [[a, bb], [c, d]] = t;
  const [R1, R2, C1, N] = [a + bb, c + d, a + c, a + bb + c + d];
  const [p1, p2] = [(100 * a) / R1, (100 * c) / R2];
  const yes = (u, v) => R`Yes. \(${num(Math.round(u))}\%\) of ${s.rows[0].noun} ${s.cols[0].pred}, but \(${num(Math.round(v))}\%\) of ${s.rows[1].noun} do. That is a big difference.`;
  const no = (u, v) => R`No. \(${num(Math.round(u))}\%\) of ${s.rows[0].noun} ${s.cols[0].pred}, and \(${num(Math.round(v))}\%\) of ${s.rows[1].noun} do. Those are about the same.`;
  const same = big ? yes : no;
  const other = big ? no : yes;
  const visual = tableVisual(s, t);
  const grand = [(100 * a) / N, (100 * c) / N];
  const col = [(100 * a) / C1, (100 * c) / C1];
  return q({
    prompt: `${s.intro} Is there an association between ${s.rv} and ${s.cv}?`,
    visual,
    correct: same(p1, p2),
    wrong: [{ value: other(p1, p2), why: `The row percents are ${num(p1)}% and ${num(p2)}%. A difference of ${num(Math.abs(p1 - p2))} percentage points is ${big ? 'large' : 'small'}.` }, { value: same(...grand), why: `Those percents divide by everyone surveyed, ${N}. Compare each row with its own total.` }, { value: same(...col), why: `Those percents divide by the column total, ${C1}. Compare each row with its own total.` }, other(...grand)],
    solution: [`Compare the rows using percents, because the rows have different totals (${R1} and ${R2}).`, R`${cap(s.rows[0].noun)}: \(\frac{${a}}{${R1}} = ${num(p1)}\%\) ${s.cols[0].pred}. ${cap(s.rows[1].noun)}: \(\frac{${c}}{${R2}} = ${num(p2)}\%\).`, big ? `The percents differ by ${num(Math.abs(p1 - p2))} percentage points, so the two variables appear to be associated.` : p1 === p2 ? 'The percents are the same, so there is no association.' : `The percents differ by only ${num(Math.abs(p1 - p2))} percentage points, so there is little or no association.`],
    rule: 5,
    skill: 'association in a two-way table',
    check: () => {
      const g = readBack(visual);
      const gap = Math.abs(g[0][0] / g[0][2] - g[1][0] / g[1][2]);
      return (big ? gap >= 0.25 : gap <= 0.05) ? true : 'the gap does not match the answer';
    },
  });
}

// ───────────── Challenge: column percents and missing cells, working backwards, distance from the line ─────────────

function challengeTable(rng) {
  const s = rng.pick(SURVEYS);
  if (rng.bool()) {
    const u = makeTable(rng, 'any');
    const t = [[u[0][0], u[1][0]], [u[0][1], u[1][1]]];
    const [i, j] = [rng.int(0, 1), rng.int(0, 1)];
    const C = t[0][j] + t[1][j];
    const Rw = t[i][0] + t[i][1];
    const p = (100 * t[i][j]) / C;
    const visual = tableVisual(s, t);
    return q({
      prompt: `${s.intro} Of the ${s.cols[j].noun}, what percent ${s.rows[i].is}?`,
      visual,
      correct: p,
      fmt: pct,
      wrong: [{ value: clean((100 * t[i][j]) / Rw), why: `That divides by the row total, ${Rw}. The question starts "Of the ${s.cols[j].noun}", so divide by their column total, ${C}.` }, { value: clean((100 * t[i][j]) / sum(t.flat())), why: `That divides by everyone surveyed. Divide by the column total, ${C}.` }, { value: 100 - p, why: `That is the percent of ${s.cols[j].noun} who ${s.rows[1 - i].is}.` }, p + 5],
      solution: [`"Of the ${s.cols[j].noun}" means use the column "${s.cols[j].label}". Its total is ${C}.`, `${t[i][j]} of them ${s.rows[i].is}.`, R`\(\frac{${t[i][j]}}{${C}} = ${num(p / 100)} = ${num(p)}\%\).`],
      rule: 4,
      skill: 'column percents',
      check: () => {
        const g = readBack(visual);
        return checkEqual((100 * g[i][j]) / g[2][j], p);
      },
    });
  }
  const t = makeTable(rng, 'any');
  const [[a, b], [c, d]] = t;
  const [R1, C1, C2, N] = [a + b, a + c, b + d, a + b + c + d];
  const visual = tableVisual(s, t, [[0, 1], [1, 0], [1, 1], [1, 2]]);
  return q({
    prompt: `${s.intro} Some cells of the table are blank. How many ${s.rows[1].noun} ${s.cols[1].pred}?`,
    visual,
    correct: d,
    unit: s.who,
    wrong: [{ value: C2 - a, why: R`First find the blank cell in the top row: \(${R1} - ${a} = ${b}\). Then subtract that from the column total.` }, { value: b, why: `${b} is the number of ${s.rows[0].noun} who ${s.cols[1].pred}. The question asks about the ${s.rows[1].noun}.` }, { value: N - R1, why: `${N - R1} is the total for the ${s.rows[1].noun}, both columns together.` }, c, d + 1],
    solution: [R`In the row "${s.rows[0].label}": \(${R1} - ${a} = ${b}\) ${s.cols[1].pred}.`, R`In the column "${s.cols[1].label}": \(${C2} - ${b} = ${d}\).`, R`Check with the other column: \(${C1} - ${a} = ${c}\), and \(${c} + ${d} = ${N - R1} = ${N} - ${R1}\). ✓`, `So ${d} ${s.rows[1].noun} ${s.cols[1].pred}.`],
    rule: 4,
    skill: 'completing a two-way table',
    check: () => {
      const g = readBack(visual);
      const bFound = g[0][2] - g[0][0];
      return checkAll(checkEqual(g[2][1] - bFound, d), checkEqual(g[2][2] - g[0][2] - (g[2][0] - g[0][0]), d));
    },
  });
}

function challengeWorkBack(rng) {
  const c = CTX[rng.pick(FIT)];
  const { m, b } = pickLine(rng, c);
  const pts = linePoints(rng, c, m, b);
  const x0 = rng.int(Math.ceil(c.xd[0]), Math.floor(c.xd[1]));
  const Y = m * x0 + b;
  return q({
    prompt: R`The line of fit \(${eq(m, b)}\) predicts ${c.yWord} (\(y\)) from the ${inWords(c.x)} (\(x\)). According to the line, ${c.askX(Y)}?`,
    visual: scatter(c, pts, { fns: [{ f: (x) => m * x + b, color: 'b' }] }, ` The line of fit y = ${linear(m, b).replace(/-/g, '−')} is drawn.`),
    correct: x0,
    fmt: c.fmtX,
    wrong: [{ value: clean(Y / m) > 0 ? clean(Y / m) : null, why: R`Undo the steps in reverse order: first ${b > 0 ? 'subtract' : 'add'} \(${Math.abs(b)}\), then divide by \(${m}\).` }, { value: clean((Y + b) / m) > 0 ? clean((Y + b) / m) : null, why: R`To undo \(${b < 0 ? '-' : '+'} ${Math.abs(b)}\), ${b > 0 ? 'subtract' : 'add'} \(${Math.abs(b)}\) on both sides.` }, x0 + 1, x0 - 1, x0 + 2].filter((w) => (w?.value ?? w) > 0 && (w?.value ?? w) !== x0),
    solution: [R`Substitute \(y = ${Y}\): \(${Y} = ${linear(m, b)}\).`, R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\) on both sides: \(${Y - b} = ${m}x\).`, R`Divide by \(${m}\): \(x = ${x0}\).`, `So the answer is ${c.fmtX(x0).replace(/\\\(|\\\)/g, '')}.`],
    rule: 3,
    skill: 'working back from a line of fit',
    check: () => checkEqual(m * x0 + b, Y),
  });
}

function challengeResidual(rng) {
  const c = CTX[rng.pick(FIT)];
  const { m, b } = pickLine(rng, c);
  const pts = linePoints(rng, c, m, b);
  const i = rng.int(1, pts.length - 2);
  const p = pts[i];
  const pred = m * p.x + b;
  if (p.y === pred || (b !== 0 && Math.abs(p.y - m * p.x) === Math.abs(p.y - pred))) return challengeResidual(rng);
  const name = c.label === 'person' ? person(rng) : c.label;
  p.label = name;
  const r = p.y - pred;
  const word = (v) => (v > 0 ? 'above' : 'below');
  const say = (v) => `${name}’s actual ${c.yn} is ${c.fmtY(Math.abs(v))} ${word(v)} the prediction.`;
  const slip = p.y - m * p.x;
  return q({
    prompt: R`The line of fit is \(${eq(m, b)}\). The point for ${name}, \((${num(p.x)}, ${num(p.y)})\), is labeled. How does ${name}’s actual ${c.yn} compare with the prediction from the line?`,
    visual: scatter(c, pts, { fns: [{ f: (x) => m * x + b, color: 'b' }] }, ` The line of fit y = ${linear(m, b).replace(/-/g, '−')} is drawn. The point (${txt(p.x)}, ${txt(p.y)}) is labeled ${name}.`),
    correct: say(r),
    wrong: [{ value: say(-r), why: R`The actual value, \(${p.y}\), is ${r > 0 ? 'greater' : 'less'} than the prediction, \(${pred}\), so the point is ${word(r)} the line.` }, slip ? { value: say(slip), why: R`The prediction is \(${m}(${p.x}) ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${pred}\). Include the \(y\)-intercept.` } : null, slip ? say(-slip) : null, say(2 * r), say(-2 * r)],
    solution: [R`Prediction for \(x = ${p.x}\): \(y = ${m}(${p.x}) ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${pred}\).`, R`Actual value: \(${p.y}\). Difference: \(${p.y} - ${pred < 0 ? `(${pred})` : pred} = ${r}\).`, say(r)],
    rule: 2,
    skill: 'distance from a line of fit',
    check: () => checkEqual(p.y - (m * p.x + b), r),
  });
}

// ───────────── Interactive models ─────────────

const NUDGE = [4, -6, 2, -3, 5, -1, -5, 3, -2, 6];

export default {
  id: 'scatter-plots',
  title: 'Scatter Plots & Two-Way Tables',
  summary: 'Describe patterns in scatter plots, use a line of fit to predict, and look for associations in two-way tables.',
  grade: 'Grade 8',
  standards: ['CCSS 8.SP.A.1', 'CCSS 8.SP.A.2', 'CCSS 8.SP.A.3', 'CCSS 8.SP.A.4'],

  explain: {
    intro: R`A **scatter plot** shows two measurements for each person or thing as one point. Its pattern tells you whether the two measurements are related. A **line of fit** sums up a straight-line pattern and can be used to predict. For data in categories, such as yes or no answers, a **two-way table** does the same job.`,
    rules: [
      {
        title: 'Reading a scatter plot: the direction of the pattern',
        text: 'Each point is one person or thing: read across for the first measurement and up for the second. If the points tend to go up from left to right, there is a **positive association**. If they tend to go down, there is a **negative association**. If they show no pattern, there is **no association**.',
        example: 'Hours studied and test scores: more study usually goes with higher scores, a positive association. The age of a car and its value: a negative association.',
      },
      {
        title: 'Linear or nonlinear, clusters and outliers',
        text: 'If the points lie close to a straight line, the association is **linear**; if they follow a curve, it is **nonlinear**. A **cluster** is a group of points close together with gaps around it. An **outlier** is a point far away from the pattern of the others.',
        example: 'The height of a thrown ball over time rises and then falls: a nonlinear association.',
      },
      {
        title: 'Fitting a line by eye',
        text: 'A **line of fit** follows the direction of the points and passes close to most of them, with about as many points above it as below. The closer the points are to the line, the better the line fits and the more you can trust its predictions.',
        example: 'A line that has the right slope but sits above every point is a poor fit; move it down into the middle of the points.',
      },
      {
        title: 'Using the equation of a line of fit',
        text: R`Write the line as \(y = mx + b\). To predict, substitute the \(x\)-value. The slope \(m\) is the predicted change in \(y\) for each 1 unit of \(x\). The intercept \(b\) is the predicted \(y\) when \(x = 0\).`,
        example: R`For \(y = 4x + 52\) (\(x\) = hours studied, \(y\) = score): each extra hour of study adds about 4 points, and 0 hours predicts about 52 points. For 6 hours: \(4(6) + 52 = 76\).`,
      },
      {
        title: 'Two-way tables and relative frequencies',
        text: 'A **two-way table** counts how many fall in each pair of categories, with totals for each row and column. A **relative frequency** is a count divided by a total, often written as a percent. For a row percent divide by the row total; for a column percent divide by the column total.',
        example: R`If 18 of 30 students with a curfew do chores, the row percent is \(\frac{18}{30} = 60\%\).`,
      },
      {
        title: 'Association in a two-way table',
        text: 'To decide whether two categories are related, compare row percents (not counts, because the rows can have different totals). Percents that are very different suggest an **association**; percents that are about the same suggest little or no association.',
        example: R`60% of students with a curfew do chores, but only 25% of students without one do: an association. 52% and 50% would be about the same: no association.`,
      },
    ],
    vocab: [
      { term: 'scatter plot', def: 'A graph of points that shows two measurements for each person or thing.' },
      { term: 'association', def: 'A relationship between two variables: knowing one helps you predict the other.' },
      { term: 'outlier', def: 'A point far from the pattern of the other points.' },
      { term: 'line of fit', def: 'A straight line drawn close to the points to sum up a linear pattern.' },
      { term: 'relative frequency', def: 'A count divided by a total, often written as a percent.' },
      { term: 'two-way table', def: 'A table that counts data sorted by two categorical variables at once.' },
    ],
    mistakes: [
      'Reading a point the wrong way round. The first number is read across, the second up the side.',
      'Calling a curved pattern "no association". A curve is a nonlinear association.',
      'Drawing a line through the first and last points only. A line of fit should pass through the middle of all the points.',
      R`Forgetting the intercept when predicting: for \(y = 4x + 52\) and \(x = 6\), the prediction is \(76\), not \(24\).`,
      'Comparing counts in a two-way table when the rows have different totals. Compare percents.',
    ],
    visual: {
      type: 'plot', x: [0, 10], y: [30, 100], step: [1, 10], axisLabels: ['hours studied', 'test score'],
      points: [[1, 58], [2, 57], [3, 66], [4, 66], [5, 74], [6, 75], [7, 82], [8, 81], [9, 90], [10, 89]].map(([x, y]) => ({ x, y })),
      fns: [{ f: (x) => 4 * x + 52, color: 'b', label: 'y = 4x + 52', labelAt: 2.5 }],
      alt: 'A scatter plot of hours studied (across) and test score (up). The 10 points are (1, 58), (2, 57), (3, 66), (4, 66), (5, 74), (6, 75), (7, 82), (8, 81), (9, 90), (10, 89). They rise from left to right. The line of fit y = 4x + 52 passes through the middle of them.',
    },
  },

  examples: [
    {
      title: 'Describing a scatter plot',
      problem: 'Describe the association in the scatter plot of car age and value. Is there an outlier?',
      steps: ['As the age goes up, the value goes down, so the association is negative.', 'Most points lie close to a straight line, so it is linear.', 'The point (6, 26) is far above the pattern: a 6-year-old car worth $26,000 when the others that age are worth about $16,000. It is an outlier.'],
      answer: 'A negative linear association, with one outlier at (6, 26)',
      visual: scatter(CTX.car, [[1, 28], [2, 26], [3, 25], [4, 21], [5, 20], [6, 26], [7, 15], [8, 14], [9, 12], [10, 9]].map(([x, y]) => ({ x, y }))),
    },
    {
      title: 'Word problem: predicting with a line of fit',
      word: true,
      problem: R`A line of fit for hours studied \(x\) and test score \(y\) is \(y = 4x + 52\). Predict the score for 7 hours of study, and say what 4 and 52 mean.`,
      steps: [R`Substitute \(x = 7\): \(y = 4(7) + 52 = 28 + 52 = 80\).`, 'The slope 4 means each extra hour of study adds about 4 points to the predicted score.', 'The intercept 52 means a student who studies for 0 hours is predicted to score about 52 points.'],
      answer: 'About 80 points',
    },
    {
      title: 'Row percents in a two-way table',
      word: true,
      problem: 'Is there an association between having a curfew and doing chores?',
      steps: [R`The rows have different totals (40 and 60), so compare percents. With a curfew: \(\frac{30}{40} = 75\%\) do chores.`, R`Without a curfew: \(\frac{18}{60} = 30\%\) do chores.`, '75% and 30% are very different, so students with a curfew are more likely to do chores. There is an association.'],
      answer: 'Yes: 75% compared with 30%',
      visual: tableVisual(SURVEYS[0], [[30, 10], [18, 42]]),
    },
    {
      title: 'Judging a line of fit',
      problem: 'Two students drew lines of fit for the same data. Line A has 8 points above it and 2 below. Line B has 5 above and 5 below, all close to it. Which line fits better?',
      steps: ['A good line of fit passes through the middle of the points, with about as many above as below.', 'Line A is too low: almost every point is above it.', 'Line B has the points balanced around it and close to it.'],
      answer: 'Line B',
    },
  ],

  models: [
    {
      id: 'line-of-fit',
      title: 'Word problem: predicting test scores',
      word: true,
      intro: 'Choose the slope and intercept of a line of fit for hours studied and test score, and the number of hours to predict for.',
      inputs: [
        { name: 'm', label: 'Slope (points per hour)', type: 'number', min: -10, max: 10, step: 0.5, value: 4 },
        { name: 'b', label: 'Intercept (points at 0 hours)', type: 'int', min: 0, max: 100, value: 52 },
        { name: 'x', label: 'Hours of study', type: 'number', min: 0, max: 15, step: 0.5, value: 6 },
      ],
      compute({ m, b, x }) {
        const y = round(m * x + b, 2);
        const data = NUDGE.map((d, i) => ({ x: i + 1, y: round(m * (i + 1) + b + d, 2) }));
        const ys = [...data.map((p) => p.y), y, b, m * 15 + b];
        const [lo, hi] = [Math.min(0, ...ys), Math.max(100, ...ys)];
        const silly = y < 0 || y > 100;
        return {
          problem: R`A line of fit for hours studied \(x\) and test score \(y\) is \(${eq(m, b)}\). Predict the score for ${num(x)} ${x === 1 ? 'hour' : 'hours'} of study.`,
          steps: [
            R`Substitute \(x = ${num(x)}\): \(y = ${num(m)}(${num(x)}) + ${b} = ${num(round(m * x, 2))} + ${b} = ${num(y)}\).`,
            m === 0 ? 'The slope is 0: in this model study time makes no difference to the score.' : `The slope ${num(m)} means each extra hour of study ${m > 0 ? 'adds' : 'takes away'} about ${num(Math.abs(m))} ${Math.abs(m) === 1 ? 'point' : 'points'}.`,
            `The intercept ${b} means a student who studies for 0 hours is predicted to score about ${b} points.`,
          ],
          answer: `About ${num(y)} ${y === 1 ? 'point' : 'points'}`,
          note: silly ? 'A test score cannot be below 0 or above 100. A line of fit gives sensible predictions only near the data it was drawn from.' : undefined,
          visual: { type: 'plot', x: [0, 15], y: [lo, hi], axisLabels: ['hours', 'score'], points: [...data, { x, y, color: 'b', label: `(${txt(x)}, ${txt(y)})` }], fns: [{ f: (t) => m * t + b, color: 'b' }], alt: `A scatter plot of 10 students, at (${data.map((p) => `${txt(p.x)}, ${txt(p.y)}`).join('), (')}), with the line of fit y = ${linear(m, b).replace(/-/g, '−')}. The prediction (${txt(x)}, ${txt(y)}) is marked on the line.` },
        };
      },
    },
    {
      id: 'two-way-table',
      title: 'Word problem: is there an association?',
      word: true,
      intro: 'Type the four counts from a survey about curfews and chores. The steps find the row percents and compare them.',
      inputs: [
        { name: 'a', label: 'Curfew and chores', type: 'int', min: 0, max: 200, value: 30 },
        { name: 'b', label: 'Curfew, no chores', type: 'int', min: 0, max: 200, value: 10 },
        { name: 'c', label: 'No curfew, chores', type: 'int', min: 0, max: 200, value: 18 },
        { name: 'd', label: 'No curfew, no chores', type: 'int', min: 0, max: 200, value: 42 },
      ],
      compute({ a, b, c, d }) {
        if (a + b === 0 || c + d === 0) return { error: 'Each row needs at least one student, or its percent cannot be found. Make sure both rows have a count above 0.' };
        const s = SURVEYS[0];
        const [R1, R2] = [a + b, c + d];
        const [p1, p2] = [round((100 * a) / R1, 1), round((100 * c) / R2, 1)];
        const gap = round(Math.abs(p1 - p2), 1);
        const verdict = gap >= 20 ? 'a clear association' : gap >= 10 ? 'a weak association' : 'little or no association';
        return {
          problem: 'A survey asked students whether they have a curfew and whether they do chores. Is there an association?',
          steps: [
            `Row totals: ${R1} students with a curfew and ${R2} without.`,
            R`With a curfew: \(\frac{${a}}{${R1}} \approx ${num(p1)}\%\) do chores. Without a curfew: \(\frac{${c}}{${R2}} \approx ${num(p2)}\%\) do chores.`,
            `The row percents differ by ${num(gap)} percentage points, which suggests ${verdict}.`,
          ],
          answer: `${num(p1)}% compared with ${num(p2)}%: ${verdict}`,
          visual: [tableVisual(s, [[a, b], [c, d]]), { type: 'table', headers: ['Group', 'Does chores', 'No chores', 'Total'], rowHeaders: true, rows: [['Has a curfew', `${num(p1)}%`, `${num(round(100 - p1, 1))}%`, '100%'], ['No curfew', `${num(p2)}%`, `${num(round(100 - p2, 1))}%`, '100%']], caption: 'Row percents', alt: `Row percents. Has a curfew: ${num(p1)}% do chores, ${num(round(100 - p1, 1))}% do not. No curfew: ${num(p2)}% do chores, ${num(round(100 - p2, 1))}% do not.` }],
        };
      },
    },
  ],

  quiz: {
    easy: [easyReadPlot, easyAssociation, easyTwoWayRead],
    medium: [mediumOutlierCluster, mediumPredict, mediumInterpret, mediumRowPercent],
    hard: [hardBestLine, hardTwoPoints, hardAssociation],
    challenge: [challengeTable, challengeWorkBack, challengeResidual],
  },
};
