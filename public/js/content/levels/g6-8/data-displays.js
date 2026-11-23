import { R, q, num, frac, txt, ordinal, person, people, round, approx, sum } from '../../lib/index.js';
import { pct, clean } from './_shared.js';

// ───────────── Helpers ─────────────

const sortNum = (a) => [...a].sort((x, y) => x - y);
const mean = (a) => sum(a) / a.length;
const list = (a) => a.map((v) => txt(v)).join(', ');
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const plus = (a) => a.join(' + ');
/** Whole numbers with thousands commas in math mode, to match the prose: big(3200) → 3{,}200. */
const big = (v) => num(v, { commas: true });
const bigFmt = (v) => `\\(${big(v)}\\)`;
/** "1 IQR", "2.5 IQRs". */
const spreads = (r, word) => `${num(r)} ${r === 1 ? word : `${word}s`}`;
/** What a number of spreads between two centers says about the overlap. */
const overlap = (r) => (r >= 2 ? 'That is large compared with the spread, so the two groups overlap only a little.' : r <= 1 ? 'That is small compared with the spread, so the two groups overlap a lot.' : 'The groups overlap, but the difference is noticeable.');
function median(a) {
  const s = sortNum(a);
  const m = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[m - 1] + s[m]) / 2;
}
/** Five-number summary. Quartiles are the medians of the lower and upper halves; with an odd count the median is left out of both. */
function fiveNum(a) {
  const s = sortNum(a);
  const half = Math.floor(s.length / 2);
  const lower = s.slice(0, half);
  const upper = s.slice(s.length - half);
  return { s, lower, upper, min: s[0], q1: median(lower), med: median(s), q3: median(upper), max: s[s.length - 1] };
}
const sumText = (f) => `${txt(f.min)}, ${txt(f.q1)}, ${txt(f.med)}, ${txt(f.q3)}, ${txt(f.max)}`;
/** Mean absolute deviation, worked out as twice the total distance above the mean, over n (a second route used by checks). */
const madCheck = (a) => (2 * sum(a.filter((v) => v > mean(a)).map((v) => v - mean(a)))) / a.length;

/**
 * Box plots drawn on one horizontal number line with the plot picture: each box is a polygon from the lower
 * to the upper quartile, the median is a segment across the box, and the whiskers are segments to the
 * minimum and maximum, with short end caps. groups[0] is drawn on top.
 */
function boxPlot(groups, { lo, hi, step, label, alt }) {
  const rows = groups.length;
  const polygons = [];
  const segments = [];
  groups.forEach((g, i) => {
    const c = g.color ?? 'ab'[i % 2];
    const yc = 2 * (rows - i) - 0.9;
    const [y0, y1] = [yc - 0.45, yc + 0.45];
    polygons.push({ points: [[g.q1, y0], [g.q3, y0], [g.q3, y1], [g.q1, y1]], color: c });
    segments.push(
      { from: [g.min, yc], to: [g.q1, yc], color: c },
      { from: [g.q3, yc], to: [g.max, yc], color: c },
      { from: [g.min, yc - 0.25], to: [g.min, yc + 0.25], color: c },
      { from: [g.max, yc - 0.25], to: [g.max, yc + 0.25], color: c },
      { from: [g.med, y0], to: [g.med, y1], color: c },
    );
  });
  return { type: 'plot', x: [lo, hi], y: [0, 2 * rows], step: [step, 100], size: [360, 60 + 70 * rows], axisLabels: label ? [label] : undefined, polygons, segments, alt };
}
const boxAlt = (f) => `minimum ${txt(f.min)}, lower quartile ${txt(f.q1)}, median ${txt(f.med)}, upper quartile ${txt(f.q3)}, maximum ${txt(f.max)}`;
/** The values a box plot picture actually draws, read back from its segments (used by checks). */
function readBox(visual, i = 0) {
  const sg = visual.segments.slice(5 * i, 5 * i + 5);
  return { min: sg[0].from[0], q1: sg[0].to[0], q3: sg[1].from[0], max: sg[1].to[0], med: sg[4].from[0] };
}
/** A number line for a box plot: at most 10 steps, with room on each side. */
function scaleFor(min, max) {
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100]) {
    const lo = Math.max(0, (Math.floor(min / step) - 1) * step);
    const hi = (Math.ceil(max / step) + 1) * step;
    if ((hi - lo) / step <= 10) return { lo, hi, step };
  }
  return { lo: 0, hi: 1000, step: 100 };
}

const dash = '–';
const intervalLabel = (start, width, i) => `${start + i * width}${dash}${start + (i + 1) * width - 1}`;
function histogram(start, width, counts, { xLabel, yLabel, alt, showValues }) {
  return {
    type: 'barChart',
    bars: counts.map((c, i) => ({ label: intervalLabel(start, width, i), value: c })),
    xLabel,
    yLabel,
    step: Math.max(...counts) <= 10 ? 1 : 2,
    showValues,
    alt,
  };
}
const histAlt = (start, width, counts, what) => `A histogram of ${what}: ${counts.map((c, i) => `${c} in ${intervalLabel(start, width, i)}`).join(', ')}.`;

// ───────────── Story settings ─────────────

const HIST = [
  { desc: 'the number of minutes each student in a book club read over the weekend', who: 'students', xLabel: 'Minutes read', width: 10, starts: [0, 10, 20], more: (v) => `read for ${v} minutes or more` },
  { desc: 'the heights, in centimeters, of the bean plants in a class garden', who: 'plants', xLabel: 'Height (cm)', width: 5, starts: [5, 10, 15], more: (v) => `are ${v} centimeters tall or taller` },
  { desc: 'how many push-ups each student in a gym class did in one minute', who: 'students', xLabel: 'Push-ups', width: 5, starts: [0, 5, 10], more: (v) => `did ${v} push-ups or more` },
  { desc: 'the ages of the people at a family reunion', who: 'people', xLabel: 'Age (years)', width: 10, starts: [0, 10], more: (v) => `are ${v} years old or older` },
  { desc: 'the high temperature, in degrees Fahrenheit, on each day of a summer camp', who: 'days', xLabel: 'High temperature (°F)', width: 5, starts: [60, 65, 70], more: (v) => `had a high of ${v} degrees or more` },
  { desc: 'how many minutes each student took to get to school', who: 'students', xLabel: 'Minutes to school', width: 5, starts: [0, 5], more: (v) => `took ${v} minutes or more` },
];

const BOX = [
  { what: 'the scores of the students in a class on a test', label: 'Score', step: 5, los: [40, 45, 50], who: 'students', Ns: [20, 24, 28, 32], phrase: (r) => `scored ${r} points` },
  { what: 'the number of minutes each student in a class spent on homework one night', label: 'Minutes', step: 5, los: [5, 10, 15], who: 'students', Ns: [20, 24, 28, 32], phrase: (r) => `spent ${r} minutes on homework` },
  { what: 'the heights, in centimeters, of the sunflowers in a garden', label: 'Height (cm)', step: 10, los: [60, 80, 100], who: 'sunflowers', Ns: [40, 60, 80, 100], phrase: (r) => `are ${r} centimeters tall` },
  { what: 'the number of push-ups each student in a gym class did', label: 'Push-ups', step: 2, los: [2, 4, 6], who: 'students', Ns: [24, 28, 32], phrase: (r) => `did ${r} push-ups` },
  { what: 'the number of raisins in each small box from a large pack', label: 'Raisins', step: 1, los: [20, 22, 24], who: 'boxes', Ns: [40, 60, 80, 100], phrase: (r) => `hold ${r} raisins` },
  { what: 'the number of points a basketball team scored in each game of its season', label: 'Points', step: 5, los: [30, 35, 40], who: 'games', Ns: [40, 60, 80], phrase: (r) => `had a score of ${r} points` },
];

/** Two groups to compare. `a` is drawn on top. */
const PAIRS = [
  { a: 'Class A', b: 'Class B', what: 'test scores', label: 'Score', step: 5, los: [40, 45, 50] },
  { a: 'the plants given plant food', b: 'the plants given only water', what: 'heights, in centimeters,', label: 'Height (cm)', step: 2, los: [10, 20, 30] },
  { a: 'the 6th graders', b: 'the 8th graders', what: 'daily reading times, in minutes,', label: 'Minutes', step: 5, los: [5, 10, 15] },
  { a: 'the Hawks', b: 'the Owls', what: 'game scores', label: 'Points', step: 5, los: [30, 35, 40] },
  { a: 'Route 1', b: 'Route 2', what: 'bus travel times, in minutes,', label: 'Minutes', step: 2, los: [10, 14, 18] },
];

// ───────────── Easy (Grade 6): statistical questions, reading histograms, dot plots and box plots ─────────────

const STAT = [
  'How many hours of sleep do the students in our class get on a school night?',
  'How tall are the sunflowers in the school garden?',
  'How many minutes does it take the students at our school to get to school?',
  'How many pets do the families on our street have?',
  'What shoe sizes do the players on the soccer team wear?',
  'How many books did each student in our grade read over the summer?',
  'How much do the apples in this crate weigh?',
  'How many text messages do the students in our class send in a day?',
  'What were the daily high temperatures in our town last month?',
  'How long are the songs on this playlist?',
  'How many points did the basketball team score in each game this season?',
  'How many brothers and sisters do the students in our grade have?',
  'How far can the students in our class throw a softball?',
  'How many raisins are in the small boxes in this pack?',
];
const NONSTAT = [
  (p) => `How many hours did ${p} sleep last night?`,
  () => 'How tall is the flagpole in front of the school?',
  (p) => `How many minutes did it take ${p} to get to school today?`,
  (p) => `How many pets does ${p}'s family have?`,
  (p) => `What is ${p}'s shoe size?`,
  () => 'How many days are in a leap year?',
  (p) => `How many letters are in the name ${p}?`,
  () => 'How many windows are in the school library?',
  () => 'What was the high temperature in our town yesterday?',
  () => 'How many players does a soccer team have on the field at one time?',
  (p) => `How much does ${p}'s backpack weigh right now?`,
  () => 'How many pages are in this dictionary?',
];

function easyStatQuestion(rng) {
  const p = person(rng);
  const stats = rng.sample(STAT, 3);
  const non = rng.sample(NONSTAT, 3).map((f) => f(p));
  const findStat = rng.bool(0.6);
  const yesWhy = 'This one is statistical: the answers would vary from one person or object to the next.';
  const noWhy = 'This question has a single answer, so no variability is expected. It is not a statistical question.';
  const correct = findStat ? stats[0] : non[0];
  return q({
    prompt: findStat ? 'Which of these is a statistical question?' : 'Which of these is NOT a statistical question?',
    correct,
    wrong: findStat ? non.map((v) => ({ value: v, why: noWhy })) : stats.map((v) => ({ value: v, why: yesWhy })),
    solution: [
      'A statistical question is answered with data that is expected to vary.',
      findStat ? `"${correct}" asks about many people or objects, so the answers will differ.` : `"${correct}" has only one answer.`,
      findStat ? 'Each of the other questions has a single answer.' : 'Each of the other questions asks about many people or objects whose answers will differ.',
    ],
    rule: 0,
    skill: 'statistical questions',
    check: () => (STAT.includes(findStat ? correct : stats[0]) && !STAT.includes(non[0]) ? true : 'question banks are mixed up'),
  });
}

function easyHistogramRead(rng) {
  const c = rng.pick(HIST);
  const start = rng.pick(c.starts);
  const k = 5;
  for (;;) {
    const counts = Array.from({ length: k }, () => rng.int(1, 9));
    const top = Math.max(...counts);
    const total = sum(counts);
    const visual = histogram(start, c.width, counts, { xLabel: c.xLabel, yLabel: `Number of ${c.who}`, alt: histAlt(start, c.width, counts, c.desc) });
    const lead = `The histogram shows ${c.desc}.`;
    const kind = rng.pick(['total', 'atLeast', 'atLeast', 'most']);
    if (kind === 'most') {
      if (counts.filter((v) => v === top).length !== 1) continue;
      const iTop = counts.indexOf(top);
      const others = rng.shuffle(counts.map((_, i) => i).filter((i) => i !== iTop));
      const labels = counts.map((_, i) => intervalLabel(start, c.width, i));
      return q({
        prompt: `${lead} Which interval has the most ${c.who}?`,
        visual,
        correct: labels[iTop],
        wrong: [counts[k - 1] !== top ? { value: labels[k - 1], why: 'That is the interval with the greatest values. Look for the tallest bar instead.' } : null, ...others.map((i) => labels[i])],
        solution: ['The height of each bar is the number of values in that interval.', `The tallest bar is over ${labels[iTop]}, with a height of ${top}.`, `So the ${labels[iTop]} interval has the most ${c.who}.`],
        rule: 2,
        skill: 'reading a histogram',
        check: () => (counts.every((v, i) => i === iTop || v < counts[iTop]) ? true : 'not the tallest bar'),
      });
    }
    if (kind === 'total') {
      return q({
        prompt: `${lead} How many ${c.who} are in the data set?`,
        visual,
        correct: total,
        wrong: [{ value: k, why: `That is the number of bars. Each bar's height is a count, so add the heights.` }, top !== k ? { value: top, why: 'That is only the tallest bar. Add the heights of all the bars.' } : null, total - counts[0], total + 1],
        solution: ['Each bar counts the values that fall in its interval.', R`Add the heights of the bars: \(${plus(counts)} = ${total}\).`, `There are ${total} ${c.who} in the data set.`],
        rule: 2,
        skill: 'reading a histogram',
        check: () => (visual.bars.reduce((a, b) => a + b.value, 0) === total ? true : 'bars do not add up'),
      });
    }
    const j = rng.int(1, k - 2);
    const v = start + j * c.width;
    const ans = sum(counts.slice(j));
    return q({
      prompt: `${lead} How many ${c.who} ${c.more(v)}?`,
      visual,
      correct: ans,
      wrong: [{ value: sum(counts.slice(j + 1)), why: `The interval ${intervalLabel(start, c.width, j)} starts at ${v}, so its bar counts too.` }, { value: total - ans, why: `That counts the values below ${v}. Add the bars from ${v} upward.` }, counts[j] !== ans ? { value: counts[j], why: 'That is only one bar. Add every bar from that interval upward.' } : null, ans + 1],
      solution: [`Values of ${v} or more are in the intervals starting at ${v} and above: ${counts.slice(j).map((_, i) => intervalLabel(start, c.width, j + i)).join(', ')}.`, R`Add those bars: \(${plus(counts.slice(j))} = ${ans}\).`],
      rule: 2,
      skill: 'reading a histogram',
      check: () => (total - sum(counts.slice(0, j)) === ans ? true : 'count is wrong'),
    });
  }
}

const SHAPE_CTX = [
  { label: 'Hours of sleep last night', los: [4, 5], hi: 14 },
  { label: 'Number of pets', los: [0, 1], hi: 14 },
  { label: 'Goals scored in a game', los: [0, 1], hi: 12 },
  { label: 'Books read this month', los: [0, 1, 2], hi: 18 },
  { label: 'Age of campers (years)', los: [8, 9], hi: 18 },
  { label: 'Letters in first name', los: [3, 4], hi: 14 },
];
const SHAPES = {
  sym: 'roughly symmetric',
  right: 'skewed right (the long tail is on the right)',
  left: 'skewed left (the long tail is on the left)',
  flat: 'roughly uniform (the stacks are about the same height)',
};
const dotsAlt = (label, lo, counts) => `A dot plot of ${label.toLowerCase()}: ${counts.map((c, i) => `${c} ${c === 1 ? 'dot' : 'dots'} at ${lo + i}`).join(', ')}.`;

function easyDotPlotShape(rng) {
  const ctx = rng.pick(SHAPE_CTX);
  const lo = rng.pick(ctx.los);
  if (rng.bool(0.35)) {
    // A cluster and one value far away from it.
    for (;;) {
      const len = rng.int(4, 5);
      const gap = rng.int(4, 6);
      const below = rng.bool(0.3);
      const c0 = below ? lo + gap + 1 : lo + rng.int(0, 2);
      const cluster = Array.from({ length: len }, () => rng.int(1, 4));
      if (sum(cluster) < 7) continue;
      const out = below ? c0 - gap - 1 : c0 + len - 1 + gap + 1;
      if (Math.max(out, c0 + len - 1) > ctx.hi) continue;
      const values = [...cluster.flatMap((n, i) => Array(n).fill(c0 + i)), out];
      const min = Math.min(c0, out);
      const max = Math.max(c0 + len - 1, out);
      const counts = Array.from({ length: max - min + 1 }, (_, i) => values.filter((v) => v === min + i).length);
      const edge = below ? c0 : c0 + len - 1;
      const peak = c0 + cluster.indexOf(Math.max(...cluster));
      return q({
        prompt: 'Which value in the dot plot is an outlier?',
        visual: { type: 'dotPlot', values, min, max, label: ctx.label, alt: dotsAlt(ctx.label, min, counts) },
        correct: out,
        wrong: [{ value: edge, why: `That value is at the edge of the cluster. An outlier is far from the rest, with a gap before it.` }, { value: peak, why: 'That is the peak, where the most dots are. An outlier is a value far from the others.' }, below ? c0 + len - 1 : c0, edge + (below ? -2 : 2)],
        solution: [`Most of the dots cluster from ${c0} to ${c0 + len - 1}.`, `There is a gap, and then a single dot at ${out}.`, `So ${out} is an outlier: it is far from the rest of the data.`],
        rule: 1,
        skill: 'describing a distribution',
        check: () => (values.filter((v) => Math.abs(v - out) < gap).length === 1 ? true : 'the outlier has neighbors'),
      });
    }
  }
  const shape = rng.pick(['sym', 'right', 'left']);
  let counts;
  if (shape === 'sym') {
    const c = rng.int(4, 6);
    const a = rng.int(c - 2, c - 1);
    const b = rng.int(1, a - 1);
    const e = rng.int(0, Math.min(1, b));
    counts = [e, b, a, c, a, b, e];
  } else {
    const p = rng.int(5, 7);
    const tail = [];
    let x = p;
    for (let i = 0; i < 5; i++) {
      x = Math.max(1, x - rng.int(1, 2));
      tail.push(x);
    }
    counts = rng.bool(0.5) ? [p, ...tail, 1] : [rng.int(2, p - 1), p, ...tail];
    if (shape === 'left') counts.reverse();
  }
  const values = counts.flatMap((n, i) => Array(n).fill(lo + i));
  const other = shape === 'right' ? 'left' : 'right';
  return q({
    prompt: 'Which description best fits the shape of the data in the dot plot?',
    visual: { type: 'dotPlot', values, min: lo, max: lo + 6, label: ctx.label, alt: dotsAlt(ctx.label, lo, counts) },
    correct: SHAPES[shape],
    wrong: shape === 'sym' ? [{ value: SHAPES.right, why: 'The two sides of the plot mirror each other, so neither side has a long tail.' }, SHAPES.left, { value: SHAPES.flat, why: 'The stacks are tall in the middle and short at the ends, so they are not all about the same height.' }] : [{ value: SHAPES[other], why: `Skew is named for the side with the long tail, not the side with the peak. Here the tail stretches to the ${shape}.` }, { value: SHAPES.sym, why: 'One side has a long, low tail and the other does not, so the halves do not mirror each other.' }, SHAPES.flat],
    solution: shape === 'sym' ? ['Find the peak: the tallest stack is in the middle.', 'The stacks on the left mirror the stacks on the right.', 'So the shape is roughly symmetric.'] : [`Find the peak: the tallest stacks are near the ${other} end.`, `From there the stacks get shorter and shorter toward the ${shape}, making a long tail.`, `A distribution is skewed toward its tail, so it is ${SHAPES[shape]}.`],
    rule: 1,
    skill: 'shape of a distribution',
    check: () => {
      const peakAt = counts.indexOf(Math.max(...counts));
      const ok = shape === 'sym' ? counts.every((v, i) => v === counts[6 - i]) : shape === 'right' ? peakAt <= 1 : peakAt >= 5;
      return ok ? true : 'shape does not match the counts';
    },
  });
}

/** Five tick positions from 1 to 9 on a ten-step number line, as a five-number summary. */
function boxOnScale(rng, lo, step) {
  const idx = sortNum(rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 5));
  const [min, q1, med, q3, max] = idx.map((i) => lo + i * step);
  return { min, q1, med, q3, max };
}

function easyBoxPlotRead(rng) {
  const c = rng.pick(BOX);
  const lo = rng.pick(c.los);
  const f = boxOnScale(rng, lo, c.step);
  const visual = boxPlot([f], { lo, hi: lo + 10 * c.step, step: c.step, label: c.label, alt: `A box plot of ${c.what}: ${boxAlt(f)}.` });
  const kind = rng.pick(['median', 'q1', 'q3', 'iqr', 'range']);
  const mid = clean((f.min + f.max) / 2, 1);
  const spec = {
    median: { ask: 'What is the median?', ans: f.med, wrong: [{ value: f.q1, why: 'That is the left edge of the box, the lower quartile. The median is the line inside the box.' }, { value: f.q3, why: 'That is the right edge of the box, the upper quartile. The median is the line inside the box.' }, mid !== f.med ? { value: mid, why: 'The median is the line inside the box, not the point halfway between the ends of the whiskers.' } : null, f.min], steps: [`The median is the line drawn inside the box.`, `It is at ${f.med}.`] },
    q1: { ask: 'What is the lower quartile?', ans: f.q1, wrong: [{ value: f.min, why: 'That is the end of the left whisker, the minimum. The lower quartile is the left edge of the box.' }, { value: f.med, why: 'That is the median. The lower quartile is the left edge of the box.' }, f.q3], steps: ['The lower quartile is the left edge of the box.', `It is at ${f.q1}.`] },
    q3: { ask: 'What is the upper quartile?', ans: f.q3, wrong: [{ value: f.max, why: 'That is the end of the right whisker, the maximum. The upper quartile is the right edge of the box.' }, { value: f.med, why: 'That is the median. The upper quartile is the right edge of the box.' }, f.q1], steps: ['The upper quartile is the right edge of the box.', `It is at ${f.q3}.`] },
    iqr: { ask: 'What is the interquartile range (IQR)?', ans: f.q3 - f.q1, wrong: [{ value: f.max - f.min, why: 'That is the range, from the end of one whisker to the other. The IQR is the length of the box.' }, { value: f.q3, why: 'That is the upper quartile. Subtract the lower quartile from it.' }, { value: f.med - f.q1, why: 'That is only the left part of the box. The IQR is the whole box, from the lower quartile to the upper quartile.' }, f.max - f.med], steps: [`The box runs from the lower quartile, ${f.q1}, to the upper quartile, ${f.q3}.`, R`IQR \(= ${f.q3} - ${f.q1} = ${f.q3 - f.q1}\).`] },
    range: { ask: 'What is the range?', ans: f.max - f.min, wrong: [{ value: f.q3 - f.q1, why: 'That is the IQR, the length of the box. The range runs from the end of one whisker to the end of the other.' }, { value: f.max, why: 'That is the maximum. Subtract the minimum from it.' }, f.max - f.med, f.med - f.min], steps: [`The whiskers end at the minimum, ${f.min}, and the maximum, ${f.max}.`, R`Range \(= ${f.max} - ${f.min} = ${f.max - f.min}\).`] },
  }[kind];
  return q({
    prompt: `The box plot shows ${c.what}. ${spec.ask}`,
    visual,
    correct: spec.ans,
    wrong: spec.wrong,
    solution: spec.steps,
    rule: 3,
    skill: 'reading a box plot',
    check: () => {
      const b = readBox(visual);
      const want = { median: b.med, q1: b.q1, q3: b.q3, iqr: b.q3 - b.q1, range: b.max - b.min }[kind];
      return want === spec.ans ? true : 'answer does not match the picture';
    },
  });
}

// ───────────── Medium (Grades 6–7): five-number summaries, quarters of a box plot, samples ─────────────

function mediumFiveNumber(rng) {
  const n = rng.pick([9, 10, 11]);
  const vals = rng.shuffle(rng.sample(Array.from({ length: 38 }, (_, i) => i + 2), n));
  const f = fiveNum(vals);
  const s = f.s;
  const odd = n % 2 === 1;
  const h = Math.floor(n / 2);
  const incl = odd ? { ...f, q1: median(s.slice(0, h + 1)), q3: median(s.slice(h)) } : null;
  // Middle values of the list as it is written, without sorting.
  const midOf = (a) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
  const unsorted = { ...f, q1: midOf(vals.slice(0, h)), med: midOf(vals), q3: midOf(vals.slice(n - h)) };
  const halfway = { ...f, q1: (f.min + f.med) / 2, q3: (f.med + f.max) / 2 };
  const second = { ...f, q1: s[1], q3: s[n - 2] };
  const m = clean(mean(vals), 1);
  const withMean = m != null && m !== f.med ? { ...f, med: m } : null;
  return q({
    prompt: `Which list gives the five-number summary (minimum, lower quartile, median, upper quartile, maximum) of this data? ${list(vals)}`,
    correct: sumText(f),
    wrong: [
      incl ? { value: sumText(incl), why: 'With an odd number of values, leave the median out of both halves before finding the quartiles.' } : null,
      unsorted.q1 <= unsorted.med && unsorted.med <= unsorted.q3 ? { value: sumText(unsorted), why: 'Put the values in order before finding the median and the quartiles.' } : null,
      { value: sumText(halfway), why: 'A quartile is the median of one half of the data, not the number halfway between the minimum and the median.' },
      { value: sumText(second), why: 'A quartile is the median of one half of the data, not the second value from the end.' },
      withMean ? { value: sumText(withMean), why: 'The middle number of the summary is the median, not the mean.' } : null,
      { value: sumText({ ...f, max: f.max - f.min }), why: 'The last number of the summary is the maximum, not the range.' },
      odd ? null : { value: sumText({ ...f, med: s[h] }), why: 'With an even number of values, the median is halfway between the two middle values.' },
    ],
    solution: [
      `Put the values in order: ${list(s)}.`,
      odd ? `There are ${n} values, so the median is the ${ordinal(h + 1)} one: ${f.med}. Leave it out of both halves.` : R`There are ${n} values, so the median is halfway between the ${ordinal(h)} and ${ordinal(h + 1)}: \((${s[h - 1]} + ${s[h]}) \div 2 = ${num(f.med)}\).`,
      `Lower half: ${list(f.lower)}. Its median is the lower quartile, ${txt(f.q1)}.`,
      `Upper half: ${list(f.upper)}. Its median is the upper quartile, ${txt(f.q3)}.`,
      `Five-number summary: ${sumText(f)}.`,
    ],
    rule: 3,
    skill: 'five-number summary',
    check: () => {
      // Quartiles by position: the lower half has h values, so its median sits at position (h - 1) / 2.
      const at = (p) => (Number.isInteger(p) ? s[p] : (s[Math.floor(p)] + s[Math.ceil(p)]) / 2);
      const q1 = at((h - 1) / 2);
      const q3 = at(n - 1 - (h - 1) / 2);
      const below = vals.filter((v) => v < f.med).length;
      return q1 === f.q1 && q3 === f.q3 && below === vals.filter((v) => v > f.med).length ? true : 'summary is wrong';
    },
  });
}

function mediumBoxPlotParts(rng) {
  const c = rng.pick(BOX);
  const lo = rng.pick(c.los);
  const f = boxOnScale(rng, lo, c.step);
  const N = rng.pick(c.Ns);
  const visual = boxPlot([f], { lo, hi: lo + 10 * c.step, step: c.step, label: c.label, alt: `A box plot of ${c.what} for ${N} ${c.who}: ${boxAlt(f)}.` });
  const kinds = [
    { r: `more than ${f.q3}`, part: 1, where: `above the upper quartile, ${f.q3}`, len: f.max - f.q3 },
    { r: `less than ${f.q1}`, part: 1, where: `below the lower quartile, ${f.q1}`, len: f.q1 - f.min },
    { r: `between ${f.q1} and ${f.q3}`, part: 2, where: `inside the box, from ${f.q1} to ${f.q3}`, len: f.q3 - f.q1 },
    { r: `less than ${f.med}`, part: 2, where: `below the median, ${f.med}`, len: f.med - f.min },
    { r: `more than ${f.med}`, part: 2, where: `above the median, ${f.med}`, len: f.max - f.med },
    { r: `more than ${f.q1}`, part: 3, where: `above the lower quartile, ${f.q1}`, len: f.max - f.q1 },
    { r: `less than ${f.q3}`, part: 3, where: `below the upper quartile, ${f.q3}`, len: f.q3 - f.min },
  ];
  const k = rng.pick(kinds);
  const asPercent = rng.bool(0.4);
  const ans = asPercent ? 25 * k.part : (N / 4) * k.part;
  const of = (p) => (asPercent ? 25 * p : (N / 4) * p);
  const lenWhy = { value: k.len, why: 'That is a length on the number line, not a count. Each of the four sections of a box plot holds about a quarter of the data, whatever its length.' };
  return q({
    prompt: asPercent ? `The box plot shows ${c.what}. About what percent of the ${c.who} ${c.phrase(k.r)}?` : `The box plot shows ${c.what}. There are ${N} ${c.who} in all. About how many of them ${c.phrase(k.r)}?`,
    visual,
    correct: ans,
    fmt: asPercent ? (v) => pct(v) : undefined,
    wrong: [
      { value: of(k.part === 2 ? 1 : 2), why: k.part === 2 ? 'This part covers two of the four quarters of the data, not one.' : k.part === 1 ? 'This part is only one of the four quarters, so it holds about a quarter of the data.' : 'This part covers three of the four quarters of the data.' },
      of(k.part === 3 ? 1 : 3),
      asPercent ? null : lenWhy,
      of(4) !== ans ? of(4) : null,
      asPercent ? 10 * k.part : null,
    ],
    solution: [
      'The quartiles and the median split the data into four parts with about the same number of values: about a quarter of the data in each whisker and in each half of the box.',
      `Values ${k.r} are ${k.where}. That covers ${k.part === 1 ? 'one quarter' : k.part === 2 ? 'two quarters, or half' : 'three quarters'} of the data.`,
      asPercent ? R`So about \(${25 * k.part}\%\) of the ${c.who}.` : R`\(${frac(k.part, 4).tex()} \times ${N} = ${ans}\), so about ${ans} ${c.who}.`,
    ],
    rule: 3,
    skill: 'quarters of a box plot',
    check: () => (approx(ans / (asPercent ? 100 : N), k.part / 4) ? true : 'fraction of the data is wrong'),
  });
}

const GOOD = [
  (s, n) => `Give every ${s.one} on ${s.listName} a number, and use a random number generator to choose ${n} of them`,
  (s, n) => `Write the name of every ${s.one} on ${s.listName} on a card, mix the cards well, and draw ${n} cards`,
  (s, n) => `Choose ${n} ${s.many} from ${s.listName} at random, so that every ${s.one} has the same chance of being picked`,
];
const SURVEYS = [
  { goal: 'what the students at a middle school think of the new lunch menu', one: 'student', many: 'students', listName: 'the school list', ns: [30, 40, 50, 60],
    biased: [[(n) => `Ask ${n} students who are standing in line to buy the new lunch`, 'Students who chose the new lunch probably like it more than others do.'], [(n) => `Post a survey on the school website and use the first ${n} replies`, 'Only students who choose to reply are counted, and they often have strong opinions.'], [(n) => `Ask ${n} students from the 8th grade only`, 'The 6th and 7th graders are left out, so the sample does not represent the whole school.'], [(n) => `Ask ${n} members of the cooking club`, 'Cooking club members may think about food differently from other students.']] },
  { goal: 'how many hours a week the adults in a town exercise', one: 'adult', many: 'adults', listName: "the town's list of adult residents", ns: [50, 60, 80, 100],
    biased: [[(n) => `Ask ${n} people as they leave a gym`, 'People leaving a gym probably exercise more than most adults.'], [(n) => `Ask ${n} members of a running club`, 'Members of a running club exercise more than most adults.'], [(n) => `Mail a survey to every home and use the first ${n} that come back`, 'Only people who choose to reply are counted.'], [(n) => `Ask ${n} people who live on one street`, 'One street does not represent the whole town.']] },
  { goal: 'whether the people in a city want a new skate park', one: 'resident', many: 'residents', listName: "the city's list of residents", ns: [60, 80, 100, 120],
    biased: [[(n) => `Ask ${n} people at the old skate ramp`, 'Skaters are much more likely to want a new skate park.'], [(n) => `Ask ${n} people at a quiet reading club`, 'One club of people with the same interest does not represent the city.'], [(n) => `Let anyone vote online and use the first ${n} votes`, 'Only people who choose to vote are counted, and they often care the most.'], [(n) => `Ask ${n} people who live next to the planned site`, 'Neighbors of the site may worry about noise, so they do not represent the city.']] },
  { goal: 'how many books the students at a school read each month', one: 'student', many: 'students', listName: 'the school list', ns: [30, 40, 50, 60],
    biased: [[(n) => `Ask ${n} students who are in the school library`, 'Students in the library probably read more than most students.'], [(n) => `Ask ${n} members of the book club`, 'Book club members read more than most students.'], [(n) => `Ask ${n} students in one 6th-grade class`, 'One class does not represent all the grades in the school.'], [(n) => `Ask the first ${n} students who fill in a form left at the library desk`, 'Only students who visit the library and choose to reply are counted.']] },
  { goal: 'how the students at a school travel to school', one: 'student', many: 'students', listName: 'the school list', ns: [30, 40, 50, 60],
    biased: [[(n) => `Ask ${n} students as they get off the school buses`, 'Every one of them rode a bus, so bus riders are over-counted.'], [(n) => `Ask ${n} students at the bike rack`, 'Students at the bike rack probably ride bikes.'], [(n) => `Ask ${n} students who live on the same street`, 'Students on one street live the same distance from school.'], [(n) => `Ask ${n} students in the car drop-off line`, 'Every one of them came by car.']] },
  { goal: 'the favorite sport of the students at a school', one: 'student', many: 'students', listName: 'the school list', ns: [40, 50, 60, 80],
    biased: [[(n) => `Ask ${n} students at a basketball game`, 'Fans at a basketball game are more likely to pick basketball.'], [(n) => `Ask ${n} students on the swim team`, 'Swimmers are more likely to pick swimming.'], [(n) => `Ask the first ${n} students who answer an online poll`, 'Only students who choose to answer are counted.'], [(n) => `Ask ${n} students in the gym during soccer practice`, 'Soccer players are more likely to pick soccer.']] },
  { goal: 'how many of the light bulbs a factory made today are faulty', one: 'bulb', many: 'bulbs', listName: "today's production list", ns: [50, 80, 100, 120],
    biased: [[(n) => `Test the first ${n} bulbs made this morning`, 'Bulbs from one time of day may differ from the rest, for example if a machine wears out later.'], [(n) => `Test ${n} bulbs that all came from one machine`, 'One machine does not represent all the machines in the factory.'], [(n) => `Test ${n} bulbs that a worker picks because they look fine`, 'Bulbs that look fine are less likely to be faulty.'], [(n) => `Test the last ${n} bulbs made at the end of the day`, 'Bulbs from one time of day may differ from the rest.']] },
  { goal: 'how much screen time the seventh graders at a school have each day', one: 'seventh grader', many: 'seventh graders', listName: 'the list of all seventh graders', ns: [30, 40, 50],
    biased: [[(n) => `Ask ${n} seventh graders in the computer club`, 'Computer club members probably spend more time on screens.'], [(n) => `Ask ${n} seventh graders at a video game contest`, 'Players at a video game contest probably spend more time on screens.'], [(n) => `Ask ${n} seventh graders on the track team`, 'Members of one sports team do not represent the whole grade.'], [(n) => `Ask the first ${n} seventh graders who answer an online poll`, 'Only students who are online and choose to answer are counted.']] },
];

function mediumBiasedSample(rng) {
  const s = rng.pick(SURVEYS);
  const n = rng.pick(s.ns);
  const good = rng.shuffle(GOOD.map((g) => g(s, n)));
  const bad = rng.shuffle(s.biased.map(([f, why]) => ({ value: f(n), why: `This sample is biased. ${why}` })));
  const findGood = rng.bool(0.6);
  const correct = findGood ? good[0] : bad[0].value;
  return q({
    prompt: findGood ? `A group wants to find out ${s.goal}. Which plan is most likely to give a representative sample?` : `A group wants to find out ${s.goal}. Which plan gives a biased sample?`,
    correct,
    wrong: findGood ? bad.slice(0, 3) : good.map((g) => ({ value: g, why: `This is a random sample: every ${s.one} has the same chance of being chosen, so it is likely to be representative.` })),
    solution: findGood
      ? [`A sample represents the population when every ${s.one} has the same chance of being chosen.`, 'Each of the other plans picks from one part of the population, or counts only people who choose to answer.', `"${correct}" is a random sample.`]
      : [`A sample is biased when it favors one part of the population.`, `${bad[0].why}`, 'The other plans are random, so they are likely to be representative.'],
    rule: 4,
    skill: 'biased samples',
    check: () => (GOOD.some((g) => g(s, n) === correct) === findGood ? true : 'plan is classified wrongly'),
  });
}

const ESTIMATES = [
  { pop: (N) => `a school of ${txt(N)} students`, ask: 'walk to school', notAsk: 'do not walk to school', sample: 'students', unit: 'student', many: 'students', ns: [20, 25, 40, 50], ms: [10, 12, 15, 20, 24, 30] },
  { pop: (N) => `a shipment of ${txt(N)} light bulbs`, ask: 'are faulty', notAsk: 'are not faulty', sample: 'bulbs', unit: 'bulb', many: 'bulbs', ns: [40, 50, 80, 100], ms: [20, 25, 40, 50] },
  { pop: (N) => `a forest of ${txt(N)} trees`, ask: 'are oak trees', notAsk: 'are not oak trees', sample: 'trees', unit: 'tree', many: 'trees', ns: [20, 40, 50, 80], ms: [25, 50, 100] },
  { pop: (N) => `a town of ${txt(N)} voters`, ask: 'plan to vote yes on a new library', notAsk: 'do not plan to vote yes', sample: 'voters', unit: 'voter', many: 'voters', ns: [40, 50, 60, 80], ms: [25, 50, 100] },
  { pop: (N) => `a grade of ${txt(N)} students`, ask: 'have a pet dog', notAsk: 'do not have a pet dog', sample: 'students', unit: 'student', many: 'students', ns: [20, 25, 30, 40], ms: [6, 8, 10, 12] },
];

function mediumSampleEstimate(rng) {
  const e = rng.pick(ESTIMATES);
  const n = rng.pick(e.ns);
  const m = rng.pick(e.ms);
  const N = n * m;
  const k = rng.int(2, n - 3);
  const not = rng.bool(0.3);
  const part = not ? n - k : k;
  const ans = part * m;
  const p = frac(part, n);
  const name = person(rng);
  return q({
    prompt: `${name} takes a random sample of ${n} ${e.sample} from ${e.pop(N)}. In the sample, ${k} ${e.ask}. About how many of all ${txt(N)} ${e.many} ${not ? e.notAsk : e.ask}?`,
    correct: ans,
    fmt: bigFmt,
    wrong: [
      { value: part + (N - n), why: 'The count grows in proportion to the size of the group. Multiply by the fraction from the sample instead of adding the extra members.' },
      { value: (not ? k : n - k) * m, why: not ? 'That estimates the ones that do fit the description.' : 'That estimates the ones that do not fit the description.' },
      { value: part, why: `That is the count in the sample of ${n}. The whole population is ${m} times as large.` },
      clean((part * N) / 100, 0) !== ans ? clean((part * N) / 100, 0) : null,
      ans + m,
    ],
    solution: [
      not ? R`In the sample, \(${n} - ${k} = ${part}\) of the ${n} do not fit, a fraction of \(\frac{${part}}{${n}}${p.d !== n ? ` = ${p.tex()}` : ''}\).` : R`In the sample, the fraction is \(\frac{${part}}{${n}}${p.d !== n ? ` = ${p.tex()}` : ''}\).`,
      R`Because the sample is random, expect about the same fraction of the whole population: \(${p.tex()} \times ${big(N)} = ${big(ans)}\).`,
      `About ${txt(ans)} ${e.many}. Another random sample might give a slightly different estimate.`,
    ],
    rule: 4,
    skill: 'estimating from a sample',
    check: () => (approx(ans / N, part / n) ? true : 'estimate is not in proportion'),
  });
}

// ───────────── Hard (Grade 7): comparing groups, the median of a histogram, samples that vary ─────────────

/** Two box plots on one ten-step number line, in tick units: B gets IQR tB, A gets tA, medians d ticks apart. */
function twoBoxes(rng, tA, tB, d) {
  for (let tries = 0; tries < 200; tries++) {
    const lowIsA = rng.bool(0.5);
    const [lowT, highT] = lowIsA ? [tA, tB] : [tB, tA];
    const q1L = rng.int(2, 5);
    const low = { q1: q1L, q3: q1L + lowT, med: q1L + rng.int(1, lowT - 1) };
    const medH = low.med + d;
    const q1H = medH - rng.int(1, highT - 1);
    if (q1H < 2) continue;
    const high = { q1: q1H, q3: q1H + highT, med: medH };
    low.min = rng.int(1, low.q1 - 1);
    low.max = low.q3 + rng.int(1, 2);
    high.min = rng.int(Math.max(1, high.q1 - 3), high.q1 - 1);
    high.max = high.q3 + rng.int(1, 2);
    if (high.max > 9 || low.max > 9) continue;
    return lowIsA ? { A: low, B: high } : { A: high, B: low };
  }
  return null;
}
const toValues = (t, lo, step) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, lo + v * step]));

function hardCompareBoxPlots(rng) {
  const c = rng.pick(PAIRS);
  const lo = rng.pick(c.los);
  const kind = rng.pick(['apart', 'apart', 'iqr']);
  let tA;
  let tB;
  let d;
  let t;
  if (kind === 'apart') {
    tA = tB = rng.pick([2, 2, 3]);
    d = rng.pick(tA === 2 ? [2, 3, 4] : [3]);
  } else {
    [tA, tB] = rng.shuffle(rng.sample([2, 3, 4], 2));
    d = rng.int(1, 3);
  }
  t = twoBoxes(rng, tA, tB, d);
  if (!t) return hardCompareBoxPlots(rng);
  const A = toValues(t.A, lo, c.step);
  const B = toValues(t.B, lo, c.step);
  const visual = boxPlot([A, B], { lo, hi: lo + 10 * c.step, step: c.step, label: c.label, alt: `Two box plots on the same number line. Upper plot, ${c.a}: ${boxAlt(A)}. Lower plot, ${c.b}: ${boxAlt(B)}.` });
  const lead = `The box plots compare the ${c.what} of ${c.a} (upper plot) and ${c.b} (lower plot).`;
  const iA = A.q3 - A.q1;
  const iB = B.q3 - B.q1;
  const diff = Math.abs(A.med - B.med);
  if (kind === 'apart') {
    const r = diff / iA;
    return q({
      prompt: `${lead} The two groups have the same IQR. The difference between the medians is how many IQRs?`,
      visual,
      correct: r,
      wrong: [{ value: diff, why: `That is the difference between the medians. Divide it by the IQR, ${iA}, to see how many IQRs it is.` }, { value: clean(iA / diff, 2), why: 'Divide the difference between the medians by the IQR, not the other way around.' }, { value: clean(diff / (2 * iA), 2), why: 'The IQRs are the same, so divide by one IQR, not by the two added together.' }, r + 1, r + 0.5],
      solution: [
        `Medians: ${A.med} for ${c.a} and ${B.med} for ${c.b}. The difference is ${diff}.`,
        R`IQR of each group: \(${A.q3} - ${A.q1} = ${iA}\) and \(${B.q3} - ${B.q1} = ${iB}\).`,
        R`\(${diff} \div ${iA} = ${num(r)}\), so the medians are ${spreads(r, 'IQR')} apart.`,
        overlap(r),
      ],
      rule: 5,
      skill: 'comparing groups',
      check: () => {
        const a = readBox(visual, 0);
        const b = readBox(visual, 1);
        return approx(Math.abs(a.med - b.med) / (b.q3 - b.q1), r) && a.q3 - a.q1 === b.q3 - b.q1 ? true : 'ratio does not match the picture';
      },
    });
  }
  const [big, small] = iA > iB ? [c.a, c.b] : [c.b, c.a];
  const ans = Math.abs(iA - iB);
  const rangeDiff = Math.abs(A.max - A.min - (B.max - B.min));
  return q({
    prompt: `${lead} How much greater is the IQR of ${big} than the IQR of ${small}?`,
    visual,
    correct: ans,
    wrong: [rangeDiff !== ans ? { value: rangeDiff, why: 'That compares the ranges, from whisker end to whisker end. The IQR is the length of the box.' } : null, diff !== ans ? { value: diff, why: 'That is the difference between the medians. The question asks about the spread of the middle half.' } : null, { value: Math.max(iA, iB), why: `That is the IQR of ${big}. Subtract the IQR of ${small}.` }, ans + c.step, ans * 2],
    solution: [
      R`IQR of ${c.a}: \(${A.q3} - ${A.q1} = ${iA}\).`,
      R`IQR of ${c.b}: \(${B.q3} - ${B.q1} = ${iB}\).`,
      R`\(${Math.max(iA, iB)} - ${Math.min(iA, iB)} = ${ans}\). The middle half of ${big} is more spread out.`,
    ],
    rule: 5,
    skill: 'comparing spreads',
    check: () => {
      const a = readBox(visual, 0);
      const b = readBox(visual, 1);
      return Math.abs(a.q3 - a.q1 - (b.q3 - b.q1)) === ans ? true : 'IQR difference does not match the picture';
    },
  });
}

const MAD_CTX = [
  { what: 'heights of the players', a: 'the basketball team', b: 'the soccer team', unit: 'cm', lo: 150, hi: 185, mads: [3, 4, 5, 6] },
  { what: 'masses of the apples', a: 'Orchard A', b: 'Orchard B', unit: 'grams', lo: 150, hi: 220, mads: [4, 5, 6, 8, 10] },
  { what: 'times to run 100 meters', a: 'the 7th graders', b: 'the 8th graders', unit: 'seconds', lo: 14, hi: 20, mads: [1, 2] },
  { what: 'typing speeds', a: 'the students who took a typing course', b: 'the students who did not', unit: 'words per minute', lo: 20, hi: 45, mads: [2, 3, 4, 5] },
  { what: 'daily high temperatures in July', a: 'City A', b: 'City B', unit: '°F', lo: 70, hi: 90, mads: [2, 3, 4] },
];

function hardMADCompare(rng) {
  const c = rng.pick(MAD_CTX);
  const mad = rng.pick(c.mads);
  const r = rng.pick([1, 1.5, 2, 2.5, 3, 4].filter((x) => Number.isInteger(x * mad)));
  const diff = r * mad;
  const m1 = rng.int(c.lo, c.hi);
  const up = rng.bool(0.5);
  const [mA, mB] = up ? [m1 + diff, m1] : [m1, m1 + diff];
  const u = c.unit === '°F' ? '°F' : ` ${c.unit}`;
  return q({
    prompt: `The table shows the mean and the mean absolute deviation (MAD) of the ${c.what} for two groups. The two MADs are equal. The difference between the means is how many MADs?`,
    visual: { type: 'table', headers: ['Group', 'Mean', 'MAD'], rows: [[cap(c.a), `${mA}${u}`, `${mad}${u}`], [cap(c.b), `${mB}${u}`, `${mad}${u}`]], alt: `A table. ${cap(c.a)}: mean ${mA}${u}, MAD ${mad}${u}. ${cap(c.b)}: mean ${mB}${u}, MAD ${mad}${u}.` },
    correct: r,
    wrong: [{ value: diff, why: `That is the difference between the means in ${c.unit}. Divide it by the MAD to count MADs.` }, { value: clean(mad / diff, 2), why: 'Divide the difference between the means by the MAD, not the other way around.' }, { value: clean(diff / (2 * mad), 2), why: 'The MADs are equal, so divide by one MAD, not by the two added together.' }, r + 1, r + 0.5],
    solution: [
      R`Difference between the means: \(${Math.max(mA, mB)} - ${Math.min(mA, mB)} = ${diff}\).`,
      R`Divide by the MAD: \(${diff} \div ${mad} = ${num(r)}\).`,
      `The means are ${spreads(r, 'MAD')} apart. ${overlap(r)}`,
    ],
    rule: 5,
    skill: 'comparing groups',
    check: () => (approx(Math.abs(mA - mB), r * mad) ? true : 'ratio is wrong'),
  });
}

function hardHistogramMedian(rng) {
  const c = rng.pick(HIST);
  const start = rng.pick(c.starts);
  for (;;) {
    const counts = Array.from({ length: 5 }, () => rng.int(1, 9));
    const n = sum(counts);
    const top = Math.max(...counts);
    if (counts.filter((v) => v === top).length !== 1) continue;
    const cum = counts.map((_, i) => sum(counts.slice(0, i + 1)));
    const where = (pos) => cum.findIndex((t) => t >= pos);
    const [p1, p2] = [Math.ceil(n / 2), Math.floor(n / 2) + 1];
    const iMed = where(p1);
    if (where(p2) !== iMed) continue;
    const iTop = counts.indexOf(top);
    if (iTop === iMed) continue;
    const labels = counts.map((_, i) => intervalLabel(start, c.width, i));
    const others = [0, 1, 2, 3, 4].filter((i) => i !== iMed && i !== iTop && i !== 2).sort((a, b) => Math.abs(a - iMed) - Math.abs(b - iMed));
    return q({
      prompt: `The histogram shows ${c.desc}. Which interval contains the median?`,
      visual: histogram(start, c.width, counts, { xLabel: c.xLabel, yLabel: `Number of ${c.who}`, alt: histAlt(start, c.width, counts, c.desc) }),
      correct: labels[iMed],
      wrong: [{ value: labels[iTop], why: 'That interval has the tallest bar, which shows where the most values are. The median is the middle value, so count up to it.' }, iMed !== 2 ? { value: labels[2], why: 'That is the middle bar, but the bars hold different numbers of values. Count the values to find the middle one.' } : null, ...others.map((i) => labels[i])],
      solution: [
        R`Total: \(${plus(counts)} = ${n}\) ${c.who}.`,
        n % 2 ? `With ${n} values, the median is the ${ordinal(p1)} value in order.` : `With ${n} values, the median is halfway between the ${ordinal(p1)} and ${ordinal(p2)} values in order.`,
        `Running totals from the left: ${cum.join(', ')}.`,
        `The ${ordinal(p2)} value is in the ${labels[iMed]} interval${n % 2 ? '' : ', and so is the ' + ordinal(p1)}, so the median is in ${labels[iMed]}.`,
      ],
      rule: 2,
      skill: 'median from a histogram',
      check: () => {
        const vals = counts.flatMap((k, i) => Array(k).fill(i));
        const m = median(vals);
        return m === iMed ? true : 'median interval is wrong';
      },
    });
  }
}

const VARY = [
  { by: 'Four classes', who: 'students', pop: (N) => `a school of ${txt(N)} students`, ask: 'walk to school', ns: [20, 25, 40, 50], ms: [12, 20, 24, 30, 40], lo: 0.2, hi: 0.4 },
  { by: 'Four volunteers', who: 'people', pop: (N) => `a town of ${txt(N)} people`, ask: 'prefer the new park design', ns: [40, 50, 80, 100], ms: [20, 25, 50, 100], lo: 0.4, hi: 0.7 },
  { by: 'Four inspectors', who: 'bulbs', pop: (N) => `a shipment of ${txt(N)} light bulbs`, ask: 'are faulty', ns: [50, 80, 100], ms: [20, 25, 40, 50], lo: 0.05, hi: 0.15 },
  { by: 'Four classes', who: 'students', pop: (N) => `a school of ${txt(N)} students`, ask: 'play a musical instrument', ns: [20, 25, 40, 50], ms: [12, 20, 24, 30, 40], lo: 0.25, hi: 0.5 },
];

function hardSampleVariation(rng) {
  const v = rng.pick(VARY);
  const n = rng.pick(v.ns);
  const m = rng.pick(v.ms);
  const N = n * m;
  const lo = Math.max(1, Math.round(v.lo * n));
  const hi = Math.max(lo + 4, Math.round(v.hi * n));
  let counts;
  for (;;) {
    counts = Array.from({ length: 4 }, () => rng.int(lo, hi));
    if (sum(counts) % 4 === 0 && new Set(counts).size >= 3) break;
  }
  const avg = sum(counts) / 4;
  const kind = rng.pick(['mean', 'mean', 'spread']);
  const lead = `${v.by} each took a random sample of ${n} ${v.who} from ${v.pop(N)} and counted how many ${v.ask}. The counts were ${list(counts)}.`;
  const [cMax, cMin] = [Math.max(...counts), Math.min(...counts)];
  if (kind === 'mean') {
    const ans = avg * m;
    return q({
      prompt: `${lead} Using the mean of the four samples, estimate how many of the ${txt(N)} ${v.who} ${v.ask}.`,
      correct: ans,
      fmt: bigFmt,
      wrong: [{ value: sum(counts) * m, why: 'That uses the total of the four counts as if it came from one sample of the same size. Find the mean count first.' }, counts[0] !== avg ? { value: counts[0] * m, why: 'That uses only the first sample. Average the four samples first.' } : null, { value: avg, why: `That is the mean count in a sample of ${n}. Scale it up to all ${txt(N)}.` }, ans + m],
      solution: [R`Mean count: \((${plus(counts)}) \div 4 = ${sum(counts)} \div 4 = ${big(avg)}\) out of ${n}.`, R`Scale up: the population is \(${big(N)} \div ${n} = ${m}\) times the sample, so \(${big(avg)} \times ${m} = ${big(ans)}\).`, `Estimate: about ${txt(ans)} ${v.who}.`],
      rule: 4,
      skill: 'samples vary',
      check: () => (approx(ans / N, mean(counts) / n) ? true : 'estimate is not in proportion'),
    });
  }
  const ans = (cMax - cMin) * m;
  return q({
    prompt: `${lead} Each sample gives its own estimate for all ${txt(N)} ${v.who}. How far apart are the greatest and the least of these four estimates?`,
    correct: ans,
    fmt: bigFmt,
    wrong: [{ value: cMax - cMin, why: `That is the difference between the counts in samples of ${n}. Scale each count up to the population first.` }, { value: cMax * m, why: 'That is the greatest estimate. Subtract the least one.' }, { value: cMin * m, why: 'That is the least estimate. Subtract it from the greatest one.' }, ans + m],
    solution: [R`Each sample stands for \(${big(N)} \div ${n} = ${m}\) times as many ${v.who}.`, R`Greatest estimate: \(${cMax} \times ${m} = ${big(cMax * m)}\). Least estimate: \(${cMin} \times ${m} = ${big(cMin * m)}\).`, R`They are \(${big(cMax * m)} - ${big(cMin * m)} = ${big(ans)}\) apart. Random samples vary, so an estimate is only approximate.`],
    rule: 4,
    skill: 'samples vary',
    check: () => (approx(Math.max(...counts.map((k) => (k / n) * N)) - Math.min(...counts.map((k) => (k / n) * N)), ans) ? true : 'difference of estimates is wrong'),
  });
}

// ───────────── Challenge (Grade 7): spreads apart from raw data, working backwards ─────────────

/** Five whole-number distances from a mean that add to zero and whose sizes add to S. */
function deviations(rng, S) {
  for (;;) {
    const d = Array.from({ length: 4 }, () => rng.int(-6, 6));
    d.push(-sum(d));
    if (Math.abs(d[4]) <= 6 && sum(d.map(Math.abs)) === S) return d;
  }
}

const RAW_CTX = [
  { lead: (p, q2) => `${p} and ${q2} each recorded the number of minutes they practiced the guitar on 5 days.`, unit: 'minutes', lo: 15, hi: 40 },
  { lead: (p, q2) => `${p} and ${q2} each recorded their scores in 5 rounds of a word game.`, unit: 'points', lo: 10, hi: 30 },
  { lead: (p, q2) => `${p} and ${q2} each counted the number of laps they swam on 5 mornings.`, unit: 'laps', lo: 8, hi: 25 },
  { lead: (p, q2) => `${p} and ${q2} each recorded how many minutes their walk to school took on 5 days.`, unit: 'minutes', lo: 10, hi: 25 },
];

function challengeMADApart(rng) {
  const c = rng.pick(RAW_CTX);
  const [p1, p2] = people(rng, 2);
  const S = rng.pick([10, 20]); // a total of distances is always even, because the signed distances add to 0
  const mad = S / 5;
  const dA = deviations(rng, S);
  let dB = deviations(rng, S);
  while (sortNum(dB).join() === sortNum(dA).join()) dB = deviations(rng, S);
  const r = rng.pick([1, 1.5, 2, 2.5, 3].filter((x) => Number.isInteger(x * mad)));
  const diff = r * mad;
  const mA = rng.int(c.lo, c.hi);
  const mB = rng.bool(0.5) ? mA + diff : mA - diff;
  if (mB - 6 < 1) return challengeMADApart(rng);
  const A = rng.shuffle(dA.map((d) => mA + d));
  const B = rng.shuffle(dB.map((d) => mB + d));
  const dist = (a, mm) => a.map((v) => Math.abs(v - mm));
  return q({
    prompt: `${c.lead(p1, p2)} ${p1}: ${list(A)}. ${p2}: ${list(B)}. Both data sets have the same mean absolute deviation (MAD). The difference between the two means is how many MADs?`,
    correct: r,
    wrong: [{ value: diff, why: `That is the difference between the means in ${c.unit}. Divide it by the MAD, ${mad}.` }, { value: clean(diff / S, 2), why: `${S} is the total of the distances from the mean. Divide it by 5 to get the MAD first.` }, { value: clean(mad / diff, 2), why: 'Divide the difference between the means by the MAD, not the other way around.' }, r + 1, r + 0.5],
    solution: [
      R`Means: \((${plus(A)}) \div 5 = ${mA}\) and \((${plus(B)}) \div 5 = ${mB}\).`,
      R`Distances from ${mA}: ${list(dist(A, mA))}. MAD \(= ${S} \div 5 = ${mad}\).`,
      R`Distances from ${mB}: ${list(dist(B, mB))}. MAD \(= ${S} \div 5 = ${mad}\).`,
      R`Difference between the means: \(${Math.max(mA, mB)} - ${Math.min(mA, mB)} = ${diff}\), and \(${diff} \div ${mad} = ${num(r)}\), so the means are ${spreads(r, 'MAD')} apart.`,
    ],
    rule: 5,
    skill: 'spreads apart',
    check: () => (approx(Math.abs(mean(A) - mean(B)) / madCheck(A), r) && approx(madCheck(A), madCheck(B)) ? true : 'ratio is wrong'),
  });
}

function challengeTargetMedian(rng) {
  const c = rng.pick(PAIRS);
  const lo = rng.pick(c.los);
  const f = boxOnScale(rng, lo, c.step);
  const iqr = f.q3 - f.q1;
  const r = rng.pick([1.5, 2, 2.5, 3].filter((x) => Number.isInteger(x * iqr)));
  const up = rng.bool(0.6);
  const ans = up ? f.med + r * iqr : f.med - r * iqr;
  // Keep the other group's median on the same number line, so the story stays realistic.
  if (ans < lo + c.step || ans > lo + 9 * c.step) return challengeTargetMedian(rng);
  const visual = boxPlot([f], { lo, hi: lo + 10 * c.step, step: c.step, label: c.label, alt: `A box plot of the ${c.what} of ${c.a}: ${boxAlt(f)}.` });
  const range = f.max - f.min;
  const sgn = up ? 1 : -1;
  return q({
    prompt: `The box plot shows the ${c.what} of ${c.a}. The ${c.what} of ${c.b} have the same IQR, and their median is ${spreads(r, 'IQR')} ${up ? 'greater than' : 'less than'} the median of ${c.a}. What is the median for ${c.b}?`,
    visual,
    correct: ans,
    wrong: [
      { value: f.med + sgn * r, why: `${num(r)} is a number of IQRs. Multiply it by the IQR, ${iqr}, first.` },
      { value: (up ? f.q3 : f.q1) + sgn * r * iqr, why: `Measure from the median, ${f.med}, not from the ${up ? 'upper' : 'lower'} quartile.` },
      f.med + sgn * r * range > 0 ? { value: f.med + sgn * r * range, why: 'Use the IQR, the length of the box, not the range.' } : null,
      f.med - sgn * r * iqr > 0 ? { value: f.med - sgn * r * iqr, why: `The median of ${c.b} is ${up ? 'greater' : 'less'}, so ${up ? 'add' : 'subtract'}.` } : null,
      ans + c.step,
    ],
    solution: [
      R`From the box plot: median ${f.med}, IQR \(= ${f.q3} - ${f.q1} = ${iqr}\).`,
      R`${spreads(r, 'IQR')} is \(${num(r)} \times ${iqr} = ${num(r * iqr)}\).`,
      R`Median for ${c.b}: \(${f.med} ${up ? '+' : '-'} ${num(r * iqr)} = ${num(ans)}\).`,
    ],
    rule: 5,
    skill: 'spreads apart',
    check: () => {
      const b = readBox(visual);
      return approx(Math.abs(ans - b.med) / (b.q3 - b.q1), r) ? true : 'median is not the right number of IQRs away';
    },
  });
}

function challengeSampleBackwards(rng) {
  const e = rng.pick(ESTIMATES);
  const n = rng.pick(e.ns);
  const m = rng.pick(e.ms);
  const N = n * m;
  const name = person(rng);
  if (rng.bool(0.5)) {
    const k = rng.int(2, n - 3);
    const est = k * m;
    return q({
      prompt: `${name} took a random sample from ${e.pop(N)}. In the sample, ${k} ${e.ask}. Based on the sample, ${name} estimated that ${txt(est)} of all ${txt(N)} ${e.many} ${e.ask}. How many ${e.many} were in the sample?`,
      correct: n,
      fmt: bigFmt,
      wrong: [{ value: m, why: `That is how many times larger the population is than the sample. The sample size is ${txt(N)} divided by that.` }, { value: est - k, why: 'The sample and the population have the same fraction, not the same difference.' }],
      solution: [
        R`The fraction in the sample matches the estimate: \(\frac{${k}}{\text{sample size}} = \frac{${big(est)}}{${big(N)}}\).`,
        R`The population is \(${big(est)} \div ${k} = ${m}\) times the sample.`,
        R`Sample size: \(${big(N)} \div ${m} = ${n}\). Check: \(\frac{${k}}{${n}} \times ${big(N)} = ${big(est)}\).`,
      ],
      rule: 4,
      skill: 'estimating from a sample',
      check: () => (approx((k / n) * N, est) ? true : 'sample size does not give the estimate'),
    });
  }
  const k1 = rng.int(Math.ceil(n / 4), n - 2);
  const k2 = rng.int(1, Math.min(k1 - 1, n - k1)); // the two groups may not overlap, so they fit in the sample together
  const [x, y] = rng.pick([['walk', 'ride a bike'], ['prefer summer', 'prefer winter'], ['play a sport', 'play an instrument'], ['own a dog', 'own a cat']]);
  const ans = (k1 - k2) * m;
  return q({
    prompt: `In a random sample of ${n} students from a school of ${txt(N)}, ${k1} ${x} and ${k2} ${y}. Based on the sample, about how many more students at the school ${x} than ${y}?`,
    correct: ans,
    fmt: bigFmt,
    wrong: [{ value: k1 - k2, why: `That is the difference in the sample of ${n}. Scale it up to all ${txt(N)} students.` }, { value: k1 * m, why: `That estimates the students who ${x}. Subtract the estimate for those who ${y}.` }, { value: (k1 + k2) * m, why: 'The question asks how many more, so subtract the two estimates.' }, ans + m],
    solution: [R`The school is \(${big(N)} \div ${n} = ${m}\) times the size of the sample.`, R`Estimates: \(${k1} \times ${m} = ${big(k1 * m)}\) and \(${k2} \times ${m} = ${big(k2 * m)}\).`, R`Difference: \(${big(k1 * m)} - ${big(k2 * m)} = ${big(ans)}\) students.`],
    rule: 4,
    skill: 'estimating from a sample',
    check: () => (approx((k1 / n) * N - (k2 / n) * N, ans) ? true : 'difference is wrong'),
  });
}

// ───────────── Pictures used in the lesson ─────────────

const EX_BOX = fiveNum([12, 15, 9, 20, 14, 18, 11, 25, 16, 13, 17]);
const EX_A = { min: 70, q1: 75, med: 80, q3: 85, max: 90 };
const EX_B = { min: 50, q1: 55, med: 60, q3: 65, max: 75 };
const EX_DOTS = [2, 3, 3, 4, 4, 4, 4, 5, 5, 6, 7, 13];

function sampleTape(k, n, est, N) {
  const pc = (k / n) * 100;
  const row = (label, a, b, total) => ({ label, parts: [a > 0 ? { value: pc, label: String(a) } : null, b > 0 ? { value: 100 - pc, label: String(b), shade: 'none' } : null].filter(Boolean), total });
  return { type: 'barModel', rows: [row('Sample', k, n - k, `${txt(n)} in the sample`), row('Population', est, N - est, `${txt(N)} in all`)], alt: `Two bars of the same length. The sample bar: ${k} of ${n} shaded. The population bar: about ${txt(est)} of ${txt(N)} shaded, the same fraction.` };
}

// ───────────── Topic ─────────────

export default {
  id: 'data-displays',
  title: 'Data Displays, Sampling & Comparing Groups',
  summary: 'Ask statistical questions, read dot plots, histograms and box plots, estimate from random samples, and compare two groups.',
  grade: 'Grades 6–7',
  standards: ['CCSS 6.SP.A.1', 'CCSS 6.SP.A.2', 'CCSS 6.SP.B.4', 'CCSS 7.SP.A.1', 'CCSS 7.SP.A.2', 'CCSS 7.SP.B.3', 'CCSS 7.SP.B.4'],

  explain: {
    intro: 'Statistics starts with a question whose answers vary. A picture of the data (a dot plot, a histogram or a box plot) shows how the values are spread out. When a whole group is too big to ask, a random sample can stand in for it. And to compare two groups, look at both their centers and their spreads.',
    rules: [
      {
        title: 'A statistical question expects different answers',
        text: 'A **statistical question** is one you answer by collecting data that you expect to vary. "How many hours do the students in my class sleep?" is statistical, because different students sleep different amounts. "How many hours did Ravi sleep last night?" has a single answer, so it is not statistical.',
        example: '"How tall are the trees in this park?" is statistical. "How tall is the oak tree by the gate?" is not.',
      },
      {
        title: 'Describe a distribution by its center, spread and shape',
        text: 'The **distribution** of a data set is how its values are spread out. Describe its **center** (the median or the mean), its **spread** (the range, the IQR or the MAD) and its **shape**. A shape is **symmetric** when the two halves mirror each other, **skewed right** when a long tail stretches to the right, and **skewed left** when the long tail is on the left. Also look for clusters, gaps, peaks and outliers. On a dot plot each dot is one value.',
        example: 'For 2, 3, 3, 4, 4, 4, 4, 5, 5, 6, 7, 13: the peak is at 4, most values cluster from 2 to 7, and 13 is an outlier. The tail is on the right, so the data is skewed right.',
      },
      {
        title: 'Histograms group the data into intervals',
        text: 'A **histogram** splits the number line into intervals of equal width, such as 10–19, 20–29 and 30–39, and the height of each bar is how many values fall in that interval. In a histogram the bars really touch, because each interval runs straight into the next. The pictures in this app leave small gaps between the bars, but the intervals still join. A histogram shows the shape of the data, but not the exact values.',
        example: 'If the 20–29 bar has a height of 6, then 6 values are from 20 to 29. To count values of 30 or more, add the bars from 30–39 upward.',
      },
      {
        title: 'Box plots show the five-number summary',
        text: 'Put the values in order and find the **five-number summary**: minimum, lower quartile, median, upper quartile, maximum. The **lower quartile** is the median of the lower half, and the **upper quartile** is the median of the upper half. When the number of values is odd, leave the median out of both halves. A **box plot** draws a box from the lower quartile to the upper quartile, with a line at the median, and whiskers out to the minimum and the maximum. Each whisker and each part of the box holds about a quarter of the data, so the box holds the middle half. The length of the box is the IQR.',
        example: R`For 9, 11, 12, 13, 14, 15, 16, 17, 18, 20, 25: the median is 15. Lower half 9, 11, 12, 13, 14 gives a lower quartile of 12; upper half 16, 17, 18, 20, 25 gives an upper quartile of 18. IQR \(= 18 - 12 = 6\).`,
      },
      {
        title: 'A random sample can stand for the population',
        text: 'The **population** is the whole group you want to know about; a **sample** is the part you actually ask or measure. In a **random sample** every member of the population has the same chance of being chosen, so the sample tends to be **representative**. A sample that favors one part of the population, or counts only people who choose to answer, is **biased**, however large it is. To estimate, assume the population has the same fraction as the sample. Different random samples give slightly different results, so an estimate is only approximate; averaging several samples helps.',
        example: R`12 of 40 randomly chosen students walk to school. The school has 600 students: \(\frac{12}{40} \times 600 = 180\), so about 180 walk.`,
      },
      {
        title: 'Compare two groups by center and spread',
        text: 'To compare two groups, compare their centers (medians or means) and their spreads (IQRs or MADs). Use the median with the IQR, and the mean with the MAD. To judge how far apart the groups are, divide the difference between the centers by the spread. When the centers are 2 or more spreads apart, the groups overlap only a little; when they are about 1 spread apart or less, they overlap a lot.',
        example: R`Mean heights 175 cm and 163 cm, with both MADs 3 cm: \(175 - 163 = 12\), and \(12 \div 3 = 4\). The means are 4 MADs apart.`,
      },
    ],
    vocab: [
      { term: 'statistical question', def: 'A question answered by data that is expected to vary.' },
      { term: 'distribution', def: 'How the values of a data set are spread out: its center, spread and shape.' },
      { term: 'skewed', def: 'Lopsided, with a long tail on one side. The skew is named for the side of the tail.' },
      { term: 'histogram', def: 'A bar graph of counts in equal intervals of a number line; the bars touch.' },
      { term: 'five-number summary', def: 'Minimum, lower quartile, median, upper quartile and maximum.' },
      { term: 'box plot', def: 'A picture of the five-number summary: a box for the middle half and whiskers to the ends.' },
      { term: 'population', def: 'The whole group a question is about.' },
      { term: 'random sample', def: 'A sample in which every member of the population has the same chance of being chosen.' },
      { term: 'biased sample', def: 'A sample that favors some part of the population, so it does not represent the whole.' },
    ],
    mistakes: [
      'Naming the skew after the side with the peak. Skew is named for the side with the long tail.',
      'Keeping the median in both halves when finding the quartiles of an odd number of values. Leave it out.',
      'Reading the length of a part of a box plot as a count. Each of the four parts holds about a quarter of the data, long or short.',
      'Thinking a big sample must be a good one. A large sample chosen in a biased way is still biased.',
      'Comparing two centers without looking at the spreads. A difference of 10 is large when the spread is 2 and small when the spread is 20.',
    ],
    visual: [
      boxPlot([EX_BOX], { lo: 8, hi: 26, step: 2, label: 'Minutes', alt: `A box plot: ${boxAlt(EX_BOX)}.` }),
      histogram(10, 10, [3, 6, 8, 4, 2], { xLabel: 'Minutes read', yLabel: 'Number of students', alt: histAlt(10, 10, [3, 6, 8, 4, 2], 'minutes read') }),
    ],
  },

  examples: [
    {
      title: 'Describe a distribution',
      problem: 'A club asks, "How many hours did our members spend on a hobby last week?" The answers were 2, 3, 3, 4, 4, 4, 4, 5, 5, 6, 7 and 13. Is the question statistical? Describe the center, the spread and the shape.',
      steps: [
        'The members will give different answers, so the question is statistical.',
        'Center: there are 12 values, so the median is halfway between the 6th and 7th values, 4 and 4. The median is 4 hours.',
        R`Spread: lower half 2, 3, 3, 4, 4, 4 has median 3.5; upper half 4, 5, 5, 6, 7, 13 has median 5.5. IQR \(= 5.5 - 3.5 = 2\).`,
        'Shape: the peak is at 4, most values cluster from 2 to 7, and 13 is an outlier far to the right. The long tail is on the right, so the data is skewed right.',
      ],
      answer: 'Statistical; median 4 hours, IQR 2 hours, skewed right with an outlier at 13',
      visual: { type: 'dotPlot', values: EX_DOTS, label: 'Hours on a hobby', alt: 'A dot plot: 1 dot at 2, 2 at 3, 4 at 4, 2 at 5, 1 at 6, 1 at 7, none from 8 to 12, and 1 at 13.' },
    },
    {
      title: 'Make a box plot',
      problem: 'Eleven students timed how many minutes they took to finish a puzzle: 12, 15, 9, 20, 14, 18, 11, 25, 16, 13, 17. Find the five-number summary and draw a box plot.',
      steps: [
        'Put the values in order: 9, 11, 12, 13, 14, 15, 16, 17, 18, 20, 25.',
        'There are 11 values, so the median is the 6th: 15. Leave it out of both halves.',
        'Lower half 9, 11, 12, 13, 14: the lower quartile is 12. Upper half 16, 17, 18, 20, 25: the upper quartile is 18.',
        'Five-number summary: 9, 12, 15, 18, 25. Draw the box from 12 to 18 with a line at 15, and whiskers out to 9 and 25.',
      ],
      answer: 'Minimum 9, lower quartile 12, median 15, upper quartile 18, maximum 25',
      visual: boxPlot([EX_BOX], { lo: 8, hi: 26, step: 2, label: 'Minutes', alt: `A box plot of the puzzle times: ${boxAlt(EX_BOX)}.` }),
    },
    {
      title: 'Word problem: estimate from a sample',
      word: true,
      problem: 'Theo picks 40 students at random from a school of 600 and asks how they get to school. 12 of them walk. About how many students at the school walk? A second random sample of 40 has 15 walkers. What does that show?',
      steps: [
        R`The fraction in the sample is \(\frac{12}{40} = \frac{3}{10}\).`,
        R`A random sample is likely to be representative, so expect about the same fraction of all 600: \(\frac{3}{10} \times 600 = 180\).`,
        R`The second sample gives \(\frac{15}{40} \times 600 = 225\). Random samples vary, so the true number is probably somewhere near 180 to 225.`,
      ],
      answer: 'About 180 students; different samples give somewhat different estimates',
      visual: sampleTape(12, 40, 180, 600),
    },
    {
      title: 'Word problem: compare two groups',
      word: true,
      problem: 'The box plots show the test scores of Class A (upper plot) and Class B (lower plot). Compare the two classes. How many IQRs apart are the medians?',
      steps: [
        'Centers: the median of Class A is 80 and the median of Class B is 60.',
        R`Spreads: Class A has IQR \(85 - 75 = 10\), and Class B has IQR \(65 - 55 = 10\). The spreads are the same.`,
        R`Difference between the medians: \(80 - 60 = 20\), and \(20 \div 10 = 2\) IQRs.`,
        'Two IQRs is a big gap compared with the spread, so the scores overlap only a little: Class A generally scored higher.',
      ],
      answer: 'The medians are 2 IQRs apart; Class A generally scored higher',
      visual: boxPlot([EX_A, EX_B], { lo: 45, hi: 95, step: 5, label: 'Score', alt: `Two box plots on the same number line. Upper plot, Class A: ${boxAlt(EX_A)}. Lower plot, Class B: ${boxAlt(EX_B)}.` }),
    },
  ],

  models: [
    {
      id: 'box-plot-builder',
      title: 'Build a box plot from six values',
      intro: 'Type six whole numbers. The five-number summary and the box plot update as you type.',
      inputs: ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'].map((label, i) => ({ name: `v${i + 1}`, label: `${label} value`, type: 'int', min: 1, max: 60, value: [12, 7, 15, 9, 20, 10][i] })),
      compute(v) {
        const vals = [v.v1, v.v2, v.v3, v.v4, v.v5, v.v6];
        const f = fiveNum(vals);
        const s = f.s;
        const sc = scaleFor(f.min, f.max);
        return {
          problem: `Find the five-number summary of ${list(vals)} and draw a box plot.`,
          steps: [
            `Put the values in order: ${list(s)}.`,
            R`There are 6 values, so the median is halfway between the 3rd and 4th: \((${s[2]} + ${s[3]}) \div 2 = ${num(f.med)}\).`,
            `Lower half ${list(f.lower)}: the lower quartile is its middle value, ${f.q1}. Upper half ${list(f.upper)}: the upper quartile is ${f.q3}.`,
            R`IQR \(= ${f.q3} - ${f.q1} = ${f.q3 - f.q1}\). Range \(= ${f.max} - ${f.min} = ${f.max - f.min}\).`,
            `Draw a box from ${f.q1} to ${f.q3} with a line at ${num(f.med)}, and whiskers out to ${f.min} and ${f.max}.`,
          ],
          answer: `Five-number summary: ${sumText(f)}`,
          visual: boxPlot([f], { ...sc, alt: `A box plot of ${list(s)}: ${boxAlt(f)}.` }),
        };
      },
    },
    {
      id: 'sample-estimate',
      title: 'Word problem: estimate from a random sample',
      word: true,
      intro: 'Change the size of the sample, how many in the sample walk to school, and the size of the school.',
      inputs: [
        { name: 'n', label: 'Students in the sample', type: 'int', min: 5, max: 500, value: 40 },
        { name: 'k', label: 'Students in the sample who walk', type: 'int', min: 0, max: 500, value: 12 },
        { name: 'N', label: 'Students in the whole school', type: 'int', min: 10, max: 10000, value: 600 },
      ],
      compute({ n, k, N }) {
        if (k > n) return { error: 'The number who walk cannot be more than the number of students in the sample.' };
        if (n > N) return { error: 'The sample cannot be bigger than the whole school.' };
        const p = frac(k, n);
        const exact = p.mul(N);
        const est = Math.round(exact.value);
        const percent = round((k / n) * 100, 1);
        return {
          problem: `A random sample of ${txt(n)} students from a school of ${txt(N)} finds that ${txt(k)} walk to school. About how many students at the school walk?`,
          steps: [
            R`Fraction of the sample who walk: \(\frac{${k}}{${n}}${p.d !== n ? ` = ${p.tex()}` : ''}\), which is about \(${num(percent)}\%\).`,
            'The sample is random, so expect about the same fraction of the whole school.',
            R`\(${p.tex()} \times ${num(N)} ${exact.isInt() ? '=' : R`\approx`} ${num(exact.isInt() ? exact.value : round(exact.value, 1))}\).`,
            exact.isInt() ? `So about ${txt(est)} students walk.` : `A number of students is a whole number, so round: about ${txt(est)} students walk.`,
          ],
          answer: `About ${txt(est)} students`,
          note: n < 30 ? 'A small sample like this one can easily be off. A larger random sample usually gives a closer estimate.' : undefined,
          visual: sampleTape(k, n, est, N),
        };
      },
    },
  ],

  quiz: {
    easy: [easyStatQuestion, easyHistogramRead, easyDotPlotShape, easyBoxPlotRead],
    medium: [mediumFiveNumber, mediumBoxPlotParts, mediumBiasedSample, mediumSampleEstimate],
    hard: [hardCompareBoxPlots, hardMADCompare, hardHistogramMedian, hardSampleVariation],
    challenge: [challengeMADApart, challengeTargetMedian, challengeSampleBackwards],
  },
};
