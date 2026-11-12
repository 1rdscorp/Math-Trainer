import { R, q, num, frac, txt, person, round, approx, sum } from '../../lib/index.js';
import { M, pct, clean, unitFmt } from './_shared.js';

const sortNum = (a) => [...a].sort((x, y) => x - y);
const mean = (a) => sum(a) / a.length;
function median(a) {
  const s = sortNum(a);
  const m = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[m - 1] + s[m]) / 2;
}
/** Quartiles as the medians of the lower and upper halves (the middle value is left out when the count is odd). */
function quartiles(a) {
  const s = sortNum(a);
  const half = Math.floor(s.length / 2);
  return { lower: s.slice(0, half), upper: s.slice(s.length - half), q1: median(s.slice(0, half)), q3: median(s.slice(s.length - half)) };
}
const list = (a) => a.join(', ');
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const plus = (a) => a.join(' + ');

/** n whole numbers between lo and hi whose mean is a whole number. */
function dataWithMean(rng, n, lo, hi) {
  for (;;) {
    const m = rng.int(lo + 1, hi - 1);
    const vals = Array.from({ length: n - 1 }, () => rng.int(lo, hi));
    const last = m * n - sum(vals);
    if (last >= lo && last <= hi) return rng.shuffle([...vals, last]);
  }
}

const SETTINGS = [
  { what: 'quiz scores', lead: (p, n) => `${p}'s scores on ${n} quizzes were`, lo: 5, hi: 20, unit: 'points' },
  { what: 'goals', lead: (p, n) => `A team's goals in ${n} games were`, lo: 0, hi: 9, unit: 'goals' },
  { what: 'minutes', lead: (p, n) => `${p} practiced the piano on ${n} days. The minutes each day were`, lo: 10, hi: 45, unit: 'minutes' },
  { what: 'books', lead: (p, n) => `${n} students counted the books they read last month. The counts were`, lo: 0, hi: 12, unit: 'books' },
  { what: 'temperatures', lead: (p, n) => `The noon temperatures, in degrees Celsius, on ${n} days were`, lo: 12, hi: 30, unit: 'degrees' },
];

// ───────────── Easy (Grade 6): mean, median, mode, range, reading a dot plot ─────────────

function easyMean(rng) {
  const s = rng.pick(SETTINGS);
  const n = rng.int(4, 6);
  const vals = dataWithMean(rng, n, s.lo, s.hi);
  const m = mean(vals);
  const med = median(vals);
  return q({
    prompt: `${s.lead(person(rng), n)} ${list(vals)}. What is the mean?`,
    correct: m,
    wrong: [{ value: sum(vals), why: `That is the total. Divide it by the number of values, ${n}.` }, med !== m ? { value: med, why: 'That is the median, the middle value. The mean is the total divided by the number of values.' } : null, { value: Math.max(...vals) - Math.min(...vals), why: 'That is the range. The mean is the total divided by the number of values.' }, m + 1, m - 1],
    solution: [R`Add the values: \(${plus(vals)} = ${sum(vals)}\).`, R`Divide by the number of values: \(${sum(vals)} \div ${n} = ${m}\).`, `The mean is ${m}.`],
    rule: 0,
    skill: 'mean',
    check: () => (m * n === sum(vals) ? true : 'mean times count is not the total'),
  });
}

function easyMedianModeRange(rng) {
  const s = rng.pick(SETTINGS);
  const kind = rng.pick(['median', 'range', 'mode']);
  const n = rng.pick([5, 7]);
  const p = person(rng);
  if (kind === 'mode') {
    for (;;) {
      const vals = Array.from({ length: n + 1 }, () => rng.int(s.lo, Math.min(s.hi, s.lo + 8)));
      const counts = new Map();
      vals.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
      const top = Math.max(...counts.values());
      const modes = [...counts].filter(([, c]) => c === top);
      if (top < 2 || modes.length !== 1) continue;
      const mode = modes[0][0];
      return q({
        prompt: `${s.lead(p, n + 1)} ${list(vals)}. What is the mode?`,
        correct: mode,
        wrong: [top !== mode ? { value: top, why: `The mode is the value that appears most often, not how many times it appears. ${mode} appears ${top} times.` } : null, median(vals) !== mode ? { value: median(vals), why: 'That is the median, the middle value. The mode is the value that appears most often.' } : null, Math.max(...vals) !== mode ? Math.max(...vals) : null, Math.min(...vals) !== mode ? Math.min(...vals) : null, mode + 1],
        solution: [`Put the values in order: ${list(sortNum(vals))}.`, `Look for the value that appears most often. ${mode} appears ${top} times, more than any other value.`, `The mode is ${mode}.`],
        rule: 1,
        skill: 'mode',
        check: () => (vals.filter((v) => v === mode).length === top ? true : 'not the most frequent value'),
      });
    }
  }
  const vals = rng.shuffle(rng.sample(Array.from({ length: s.hi - s.lo + 1 }, (_, i) => s.lo + i), Math.min(n, s.hi - s.lo + 1)));
  const sorted = sortNum(vals);
  const [lo, hi] = [sorted[0], sorted[sorted.length - 1]];
  if (kind === 'range') {
    return q({
      prompt: `${s.lead(p, vals.length)} ${list(vals)}. What is the range?`,
      correct: hi - lo,
      wrong: [{ value: hi, why: 'That is the greatest value. The range is the greatest value minus the least value.' }, { value: median(vals), why: 'That is the median. The range is the greatest value minus the least value.' }, hi + lo, vals[0] !== vals[vals.length - 1] ? { value: Math.abs(vals[0] - vals[vals.length - 1]), why: 'Use the greatest and least values, not the first and last ones in the list.' } : null, hi - lo + 1],
      solution: [`The greatest value is ${hi} and the least value is ${lo}.`, R`Subtract: \(${hi} - ${lo} = ${hi - lo}\).`, `The range is ${hi - lo}.`],
      rule: 1,
      skill: 'range',
      check: () => (vals.every((v) => v >= lo && v <= hi) ? true : 'range is wrong'),
    });
  }
  const med = median(vals);
  const middleAsListed = vals[(vals.length - 1) / 2];
  return q({
    prompt: `${s.lead(p, vals.length)} ${list(vals)}. What is the median?`,
    correct: med,
    wrong: [middleAsListed !== med ? { value: middleAsListed, why: 'That is the middle of the list as it is written. Put the values in order first.' } : null, clean(mean(vals), 1) !== med ? { value: clean(mean(vals), 1), why: 'That is the mean. The median is the middle value when the values are in order.' } : null, sorted[(vals.length - 1) / 2 + 1], sorted[(vals.length - 1) / 2 - 1], hi - lo],
    solution: [`Put the values in order: ${list(sorted)}.`, `There are ${vals.length} values, so the middle one is the ${(vals.length + 1) / 2}th.`, `The median is ${med}.`],
    rule: 1,
    skill: 'median',
    check: () => (vals.filter((v) => v < med).length === vals.filter((v) => v > med).length ? true : 'not the middle value'),
  });
}

function easyDotPlot(rng) {
  for (;;) {
    const [what, who, verb, thing, oneThing] = rng.pick([['books read last month', 'students', 'read', 'books', 'book'], ['pets at home', 'students', 'have', 'pets', 'pet'], ['goals scored in a game', 'players', 'scored', 'goals', 'goal'], ['movies watched last month', 'students', 'watched', 'movies', 'movie'], ['brothers and sisters', 'students', 'have', 'brothers and sisters', 'brother or sister']]);
    const lo = rng.int(0, 2);
    const counts = Array.from({ length: 6 }, () => rng.int(0, 4));
    const values = counts.flatMap((c, i) => Array(c).fill(lo + i));
    const top = Math.max(...counts);
    if (values.length < 8 || counts.filter((c) => c === top).length !== 1 || counts[0] === 0 || counts[5] === 0) continue;
    const visual = { type: 'dotPlot', values, label: `Number of ${what}`, alt: `A dot plot of the number of ${what}: ${counts.map((c, i) => `${c} ${c === 1 ? 'dot' : 'dots'} at ${lo + i}`).join(', ')}.` };
    const kind = rng.pick(['total', 'moreThan', 'mode']);
    if (kind === 'total') {
      return q({
        prompt: `Each dot stands for one of the ${who}. How many ${who} are shown in the dot plot?`,
        visual,
        correct: values.length,
        wrong: [{ value: 6, why: 'That is the number of different values on the number line. Count every dot.' }, sum(values) !== values.length ? { value: sum(values), why: `That adds up the values. Each dot is one of the ${who}, so count the dots.` } : null, values.length + 1, values.length - 1],
        solution: [`Each dot is one of the ${who}, so count all the dots.`, R`Add the stacks: \(${plus(counts.filter((c) => c > 0))} = ${values.length}\).`, `The dot plot shows ${values.length} ${who}.`],
        rule: 1,
        skill: 'reading a dot plot',
        check: () => (sum(counts) === values.length ? true : 'the stacks do not add up to the number of dots'),
      });
    }
    if (kind === 'mode') {
      const mode = lo + counts.indexOf(top);
      return q({
        prompt: `Each dot stands for one of the ${who}. What is the mode of the data?`,
        visual,
        correct: mode,
        wrong: [top !== mode ? { value: top, why: `That is how many dots are in the tallest stack. The mode is the value under that stack, ${mode}.` } : null, lo + 5 !== mode ? { value: lo + 5, why: 'That is the greatest value. The mode is the value with the most dots.' } : null, mode + 1, mode - 1 >= 0 ? mode - 1 : mode + 2, lo !== mode ? lo : null],
        solution: ['The mode is the value that appears most often, so look for the tallest stack of dots.', `The tallest stack is above ${mode}, with ${top} dots.`, `The mode is ${mode}.`],
        rule: 1,
        skill: 'reading a dot plot',
        // Tally the plotted values directly: no other value may appear as often as the mode.
        check: () => {
          const times = (v) => values.filter((w) => w === v).length;
          return values.every((v) => v === mode || times(v) < times(mode)) ? true : 'the mode is not the most frequent value';
        },
      });
    }
    const k = lo + rng.int(1, 3);
    const more = values.filter((v) => v > k).length;
    const atLeast = values.filter((v) => v >= k).length;
    return q({
      prompt: `Each dot stands for one of the ${who}. How many of the ${who} ${verb} more than ${k} ${k === 1 ? oneThing : thing}?`,
      visual,
      correct: more,
      wrong: [atLeast !== more ? { value: atLeast, why: `"More than ${k}" does not include ${k} itself.` } : null, { value: values.length - more, why: `That counts the dots at ${k} or less. Count the dots to the right of ${k}.` }, lo + 5 - k !== more ? { value: lo + 5 - k, why: 'That counts the values on the number line. Count the dots above them.' } : null, more + 1, more + 2],
      solution: [`Values that are more than ${k} are to the right of ${k} on the plot.`, `Count the dots above ${Array.from({ length: lo + 5 - k }, (_, i) => k + 1 + i).join(', ')}: ${more} in all.`],
      rule: 1,
      skill: 'reading a dot plot',
      check: () => (sum(counts.slice(k - lo + 1)) === more ? true : 'the stacks to the right do not add up to the answer'),
    });
  }
}

// ───────────── Medium (Grades 6–7): quartiles, a chart, simple probability ─────────────

function mediumIQR(rng) {
  const n = rng.pick([7, 8]);
  const vals = rng.shuffle(rng.sample(Array.from({ length: 25 }, (_, i) => i + 2), n));
  const s = sortNum(vals);
  const { lower, upper, q1, q3 } = quartiles(vals);
  const iqr = q3 - q1;
  return q({
    prompt: `Find the interquartile range (IQR) of this data set: ${list(vals)}.`,
    correct: iqr,
    wrong: [{ value: s[n - 1] - s[0], why: 'That is the range. The IQR is the upper quartile minus the lower quartile.' }, { value: q3, why: 'That is the upper quartile. Subtract the lower quartile from it.' }, median(vals) !== iqr ? { value: median(vals), why: 'That is the median. The IQR is the upper quartile minus the lower quartile.' } : null, round(iqr + 1, 1), round(iqr + 2, 1)],
    solution: [
      `Put the values in order: ${list(s)}. The median is ${median(vals)}.`,
      `Lower half: ${list(lower)}. Its median is the lower quartile, ${q1}.`,
      `Upper half: ${list(upper)}. Its median is the upper quartile, ${q3}.`,
      R`IQR \(= ${q3} - ${q1} = ${iqr}\).`,
    ],
    rule: 2,
    skill: 'interquartile range',
    check: () => ((n === 7 ? s[5] - s[1] : (s[5] + s[6]) / 2 - (s[1] + s[2]) / 2) === iqr ? true : 'quartiles are wrong'),
  });
}

function mediumMeanChart(rng) {
  const days = rng.pick([['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['Week 1', 'Week 2', 'Week 3', 'Week 4']]);
  const [what, y] = rng.pick([['cups of lemonade sold', 'Cups sold'], ['visitors to a museum', 'Visitors'], ['pages read', 'Pages'], ['minutes of exercise', 'Minutes']]);
  const vals = dataWithMean(rng, days.length, 8, 40);
  const m = mean(vals);
  const hi = Math.max(...vals);
  return q({
    prompt: `The bar chart shows the ${what} on each of ${days.length} ${days.length === 5 ? 'days' : 'weeks'}. What is the mean for one ${days.length === 5 ? 'day' : 'week'}?`,
    visual: { type: 'barChart', bars: days.map((d, i) => ({ label: d, value: vals[i] })), yLabel: y, alt: `A bar chart of ${what}: ${days.map((d, i) => `${d} ${vals[i]}`).join(', ')}.` },
    correct: m,
    wrong: [{ value: sum(vals), why: `That is the total. Divide it by the number of bars, ${days.length}.` }, hi !== m ? { value: hi, why: 'That is the tallest bar. The mean shares the total equally among all the bars.' } : null, median(vals) !== m ? { value: median(vals), why: 'That is the median. The mean is the total divided by the number of values.' } : null, m + 2, m - 1],
    solution: [R`Read the value of each bar and add: \(${plus(vals)} = ${sum(vals)}\).`, R`Divide by the number of bars: \(${sum(vals)} \div ${days.length} = ${m}\).`, 'The mean is the height all the bars would have if the total were shared equally.'],
    rule: 0,
    skill: 'mean from a chart',
    check: () => (m * days.length === sum(vals) ? true : 'mean times count is not the total'),
  });
}

function mediumProbability(rng) {
  const name = person(rng);
  if (rng.bool(0.6)) {
    const colors = rng.sample(['red', 'blue', 'green', 'yellow', 'purple'], 3);
    const counts = [rng.int(2, 8), rng.int(2, 8), rng.int(2, 8)];
    const total = sum(counts);
    const not = rng.bool(0.4);
    const fav = not ? total - counts[0] : counts[0];
    const ans = frac(fav, total);
    return q({
      prompt: `A bag holds ${counts[0]} ${colors[0]}, ${counts[1]} ${colors[1]} and ${counts[2]} ${colors[2]} marbles. ${name} takes one marble without looking. What is the probability that it is ${not ? 'not ' : ''}${colors[0]}?`,
      correct: ans,
      wrong: [{ value: frac(counts[0], total - counts[0]), why: not ? `That compares the ${colors[0]} marbles with the others. Compare the marbles that are not ${colors[0]} with all ${total} marbles.` : `Compare with all ${total} marbles, not just the ones of the other colors.` }, { value: frac(total - fav, total), why: not ? `That is the probability that the marble is ${colors[0]}.` : `That is the probability that the marble is not ${colors[0]}.` }, { value: frac(not ? 2 : 1, 3), why: 'The three colors are not equally likely, because there are different numbers of each.' }, frac(fav, total + 1)],
      solution: [R`Count all the equally likely outcomes: \(${plus(counts)} = ${total}\) marbles.`, not ? R`Count the marbles that are not ${colors[0]}: \(${total} - ${counts[0]} = ${fav}\).` : `Count the favorable outcomes: ${fav} ${colors[0]} ${fav === 1 ? 'marble' : 'marbles'}.`, R`Probability \(= \frac{${fav}}{${total}}${ans.d !== total ? ` = ${ans.tex()}` : ''}\).`],
      rule: 4,
      skill: 'probability of an event',
      check: () => (approx(ans.value, (not ? counts[1] + counts[2] : counts[0]) / total) ? true : 'probability is wrong'),
    });
  }
  const events = [
    { text: 'a number greater than 4', ok: (v) => v > 4 },
    { text: 'an even number', ok: (v) => v % 2 === 0 },
    { text: 'a number less than 3', ok: (v) => v < 3 },
    { text: 'a 5', ok: (v) => v === 5 },
    { text: 'a number that is not 6', ok: (v) => v !== 6 },
    { text: 'a prime number (2, 3 or 5)', ok: (v) => [2, 3, 5].includes(v) },
    { text: 'a multiple of 3', ok: (v) => v % 3 === 0 },
    { text: 'a number greater than 1', ok: (v) => v > 1 },
  ];
  const e = rng.pick(events);
  const favs = [1, 2, 3, 4, 5, 6].filter(e.ok);
  const ans = frac(favs.length, 6);
  return q({
    prompt: `${name} rolls a number cube with faces numbered 1 to 6. What is the probability of rolling ${e.text}?`,
    correct: ans,
    wrong: [{ value: frac(6 - favs.length, 6), why: 'That is the probability that the event does not happen.' }, favs.length < 6 ? { value: frac(favs.length, 6 - favs.length), why: 'Compare the favorable outcomes with all 6 outcomes, not with the unfavorable ones.' } : null, frac(favs.length + 1, 6), frac(1, 6), frac(5, 6)],
    solution: ['A number cube has 6 equally likely outcomes: 1, 2, 3, 4, 5, 6.', favs.length === 1 ? `The only favorable outcome is ${favs[0]}.` : `The favorable outcomes are ${list(favs)}: ${favs.length} of them.`, R`Probability \(= \frac{${favs.length}}{6}${ans.d !== 6 ? ` = ${ans.tex()}` : ''}\).`],
    rule: 4,
    skill: 'probability of an event',
    check: () => (ans.eq(frac([1, 2, 3, 4, 5, 6].filter(e.ok).length, 6)) ? true : 'probability is wrong'),
  });
}

function mediumLikelihood(rng) {
  const p = rng.pick([0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]);
  const words = ['impossible', 'unlikely', 'as likely as not', 'likely', 'certain'];
  const right = p === 0 ? 0 : p < 0.5 ? 1 : p === 0.5 ? 2 : p < 1 ? 3 : 4;
  const shown = rng.pick([M(p), pct(round(p * 100, 0)), p > 0 && p < 1 ? R`\(${frac(Math.round(p * 100), 100).tex()}\)` : M(p)]);
  const event = rng.pick(['it will rain tomorrow', 'a spinner lands on blue', 'the bus arrives on time', 'a seed sprouts', 'a player makes the next free throw', 'a randomly chosen ticket wins a prize']);
  const others = [0, 1, 2, 3, 4].filter((i) => i !== right);
  // Keep the word on the other side of one half, plus the two nearest in meaning.
  const picks = others.length > 3 ? others.filter((i) => Math.abs(i - right) <= 2 || i === 4 - right).slice(0, 3) : others;
  return q({
    prompt: `The probability that ${event} is ${shown}. Which word best describes this event?`,
    correct: words[right],
    wrong: picks.map((i) => words[i]),
    solution: ['A probability is a number from 0 to 1. 0 means impossible, 1 means certain, and one half means as likely as not.', p === 0 || p === 1 || p === 0.5 ? `${shown} is exactly ${p === 0.5 ? 'one half' : p}.` : `${shown} is ${p < 0.5 ? 'between 0 and one half' : 'between one half and 1'}.`, `So the event is ${words[right]}.`],
    rule: 4,
    skill: 'describing likelihood',
  });
}

// ───────────── Hard: mean absolute deviation, a missing value, predictions, two-step events ─────────────

function hardMAD(rng) {
  const n = rng.pick([4, 5]);
  const vals = dataWithMean(rng, n, 2, 18);
  const m = mean(vals);
  const dist = vals.map((v) => Math.abs(v - m));
  const mad = round(sum(dist) / n, 2);
  if (sum(dist) === 0) return hardMAD(rng);
  return q({
    prompt: `Find the mean absolute deviation (MAD) of this data set: ${list(vals)}.`,
    correct: mad,
    wrong: [{ value: sum(dist), why: `That is the total of the distances from the mean. Divide it by the number of values, ${n}.` }, { value: 0, why: 'Use distances, which are never negative. If the differences keep their signs they always cancel out to 0.' }, m !== mad ? { value: m, why: 'That is the mean. The MAD is the average distance of the values from the mean.' } : null, Math.max(...vals) - Math.min(...vals) !== mad ? { value: Math.max(...vals) - Math.min(...vals), why: 'That is the range. The MAD is the average distance of the values from the mean.' } : null],
    solution: [
      R`Find the mean: \((${plus(vals)}) \div ${n} = ${sum(vals)} \div ${n} = ${m}\).`,
      `Find how far each value is from ${m}: ${list(dist)}.`,
      R`Average those distances: \((${plus(dist)}) \div ${n} = ${sum(dist)} \div ${n} = ${num(mad)}\).`,
    ],
    rule: 2,
    skill: 'mean absolute deviation',
    // The distances above the mean equal the distances below it, so the total is twice the part above.
    check: () => (approx(mad, (2 * sum(vals.filter((v) => v > m).map((v) => v - m))) / n) ? true : 'MAD is wrong'),
  });
}

function hardMissingValue(rng) {
  const n = rng.int(4, 6);
  const s = rng.pick(SETTINGS.filter((x) => x.what !== 'temperatures'));
  const vals = dataWithMean(rng, n, s.lo, s.hi);
  const m = mean(vals);
  const known = vals.slice(0, n - 1);
  const missing = vals[n - 1];
  if (missing === 0 || m < 2) return hardMissingValue(rng);
  const p = person(rng);
  return q({
    prompt: `${s.lead(p, n)} ${list(known)} and one more value. The mean of all ${n} values is ${m}. What is the missing value?`,
    correct: missing,
    wrong: [m !== missing ? { value: m, why: `The mean is ${m}, but the missing value has to make the total come out right. Find the total first.` } : null, { value: m * n, why: `That is the total of all ${n} values. Subtract the ${n - 1} values you know.` }, clean(mean(known), 1) !== missing ? { value: clean(mean(known), 1), why: `That is the mean of the ${n - 1} values you know. The missing value must bring the total up to ${m * n}.` } : null, missing + 1, missing - 1 >= 0 ? missing - 1 : missing + 2, missing + 2],
    solution: [R`The total of all ${n} values must be mean × count: \(${m} \times ${n} = ${m * n}\).`, R`The ${n - 1} known values add to \(${plus(known)} = ${sum(known)}\).`, R`Missing value: \(${m * n} - ${sum(known)} = ${missing}\).`],
    rule: 0,
    skill: 'working backwards from the mean',
    check: () => (approx((sum(known) + missing) / n, m) ? true : 'mean does not come out right'),
  });
}

function hardExperimental(rng) {
  const trials = rng.pick([20, 25, 40, 50]);
  const hits = rng.int(2, trials - 5);
  const scale = rng.int(3, 12);
  const big = trials * scale;
  const c = rng.pick([
    { did: `A spinner is spun ${trials} times and lands on red ${hits} times.`, ask: `Based on these results, how many times would you expect it to land on red in ${txt(big)} spins?`, unit: 'time' },
    { did: `A basketball player makes ${hits} of ${trials} free throws in practice.`, ask: `Based on these results, how many free throws would you expect the player to make in ${txt(big)} tries?`, unit: 'free throw' },
    { did: `An inspector tests ${trials} light bulbs and finds that ${hits} are faulty.`, ask: `Based on this sample, how many faulty bulbs would you expect in a batch of ${txt(big)} bulbs?`, unit: 'bulb' },
    { did: `${person(rng)} drops a thumbtack ${trials} times. It lands point up ${hits} times.`, ask: `Based on these results, how many times would you expect it to land point up in ${txt(big)} drops?`, unit: 'time' },
  ]);
  const ans = hits * scale;
  const p = frac(hits, trials);
  return q({
    prompt: `${c.did} ${c.ask}`,
    correct: ans,
    fmt: unitFmt(c.unit),
    wrong: [{ value: hits + (big - trials), why: 'The count grows in proportion to the number of trials. Multiply by the experimental probability instead of adding the extra trials.' }, { value: hits, why: `That is the count for ${trials} trials. There are ${scale} times as many trials now.` }, { value: big - ans, why: 'That is how many times you would expect the event not to happen.' }, ans + scale],
    solution: [R`Experimental probability \(=\) times it happened \(\div\) trials \(= \frac{${hits}}{${trials}}${p.d !== trials ? ` = ${p.tex()}` : ''}\).`, R`Multiply the probability by the new number of trials: \(${p.tex()} \times ${num(big)} = ${ans}\).`, `You would expect about ${ans}. Real results will usually be close to this, not exactly equal.`],
    rule: 5,
    skill: 'experimental probability',
    check: () => (approx(ans / big, hits / trials) ? true : 'prediction is not in proportion'),
  });
}

function hardCompound(rng) {
  const kind = rng.pick(['coin', 'spinners', 'outfits']);
  if (kind === 'outfits') {
    const [a, b] = [rng.int(2, 6), rng.int(2, 6)];
    const [x, y, what] = rng.pick([['shirts', 'pairs of pants', 'outfits'], ['kinds of bread', 'fillings', 'sandwiches'], ['flavors of ice cream', 'toppings', 'sundaes with one flavor and one topping'], ['routes to the park', 'routes home', 'round trips']]);
    return q({
      prompt: `${person(rng)} can choose from ${a} ${x} and ${b} ${y}. How many different ${what} are possible?`,
      correct: a * b,
      wrong: [{ value: a + b, why: `Each of the ${a} ${x} can go with every one of the ${b} ${y}, so multiply instead of adding.` }, a !== b ? { value: Math.max(a, b), why: 'Every choice from the first group can be paired with every choice from the second group.' } : null, a * b + 1, a * b - 1, 2 * (a + b) !== a * b ? 2 * (a + b) : null],
      solution: [`Picture a tree: ${a} branches for the ${x}, and from each of those, ${b} branches for the ${y}.`, R`Count the ends of the branches: \(${a} \times ${b} = ${a * b}\).`, `There are ${a * b} possible ${what}.`],
      rule: 6,
      skill: 'counting outcomes',
      check: () => (Array.from({ length: a }, (_, i) => i).flatMap((i) => Array.from({ length: b }, (_, j) => [i, j])).length === a * b ? true : 'count is wrong'),
    });
  }
  if (kind === 'coin') {
    const e = rng.pick([
      { text: 'heads and an even number', coin: 'H', ok: (v) => v % 2 === 0 },
      { text: 'tails and a number greater than 4', coin: 'T', ok: (v) => v > 4 },
      { text: 'heads and a 6', coin: 'H', ok: (v) => v === 6 },
      { text: 'tails and a number less than 5', coin: 'T', ok: (v) => v < 5 },
      { text: 'heads and a number less than 3', coin: 'H', ok: (v) => v < 3 },
      { text: 'tails and an odd number', coin: 'T', ok: (v) => v % 2 === 1 },
      { text: 'heads and a number greater than 1', coin: 'H', ok: (v) => v > 1 },
    ]);
    const favs = [1, 2, 3, 4, 5, 6].filter(e.ok);
    const ans = frac(favs.length, 12);
    return q({
      prompt: `A coin is flipped and a number cube (1 to 6) is rolled. What is the probability of getting ${e.text}?`,
      visual: { type: 'table', headers: ['Coin', '1', '2', '3', '4', '5', '6'], rowHeaders: true, rows: [['Heads', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'], ['Tails', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6']], alt: 'A table of the 12 outcomes: heads or tails paired with each number from 1 to 6.' },
      correct: ans,
      wrong: [{ value: frac(favs.length, 6), why: 'That ignores the coin. Only half of the 12 outcomes have the right side of the coin.' }, { value: frac(favs.length, 8), why: 'There are 2 × 6 = 12 outcomes, not 2 + 6 = 8.' }, { value: frac(1, 2).add(frac(favs.length, 6)).value <= 1 ? frac(1, 2).add(frac(favs.length, 6)) : null, why: 'For "and", count the outcomes where both things happen. Do not add the two probabilities.' }, frac(favs.length + 1, 12)],
      solution: [R`List the outcomes in a table: 2 results for the coin and 6 for the cube make \(2 \times 6 = 12\) equally likely outcomes.`, `The favorable outcomes are ${favs.map((v) => `${e.coin}${v}`).join(', ')}: ${favs.length} of them.`, R`Probability \(= \frac{${favs.length}}{12}${ans.d !== 12 ? ` = ${ans.tex()}` : ''}\).`],
      rule: 6,
      skill: 'compound events',
      check: () => (ans.eq(frac(['H', 'T'].flatMap((cn) => [1, 2, 3, 4, 5, 6].map((v) => [cn, v])).filter(([cn, v]) => cn === e.coin && e.ok(v)).length, 12)) ? true : 'probability is wrong'),
    });
  }
  const [a, b] = [rng.int(3, 4), rng.int(3, 5)];
  const target = rng.int(3, a + b - 1);
  const pairs = [];
  for (let i = 1; i <= a; i++) for (let j = 1; j <= b; j++) if (i + j === target) pairs.push(`(${i}, ${j})`);
  const ans = frac(pairs.length, a * b);
  return q({
    prompt: `Spinner A has ${a} equal sections numbered 1 to ${a}. Spinner B has ${b} equal sections numbered 1 to ${b}. Both are spun and the two numbers are added. What is the probability that the sum is ${target}?`,
    visual: { type: 'table', headers: ['A + B', ...Array.from({ length: b }, (_, j) => `B = ${j + 1}`)], rowHeaders: true, rows: Array.from({ length: a }, (_, i) => [`A = ${i + 1}`, ...Array.from({ length: b }, (_, j) => i + j + 2)]), alt: `A table of the sums for every pair of results from spinner A (1 to ${a}) and spinner B (1 to ${b}).` },
    correct: ans,
    wrong: [{ value: frac(pairs.length, a + b), why: `The outcomes are pairs of numbers. There are ${a} × ${b} = ${a * b} of them, not ${a} + ${b}.` }, { value: frac(1, a + b - 1), why: 'The possible sums are not equally likely. Count the pairs that give each sum.' }, frac(pairs.length + 1, a * b), frac(pairs.length, a * b + a)],
    solution: [R`Each spin of A can pair with each spin of B: \(${a} \times ${b} = ${a * b}\) equally likely pairs.`, `The pairs with a sum of ${target} are ${pairs.join(', ')}: ${pairs.length} of them.`, R`Probability \(= \frac{${pairs.length}}{${a * b}}${ans.d !== a * b ? ` = ${ans.tex()}` : ''}\).`],
    rule: 6,
    skill: 'compound events',
    check: () => (ans.value > 0 && ans.value < 1 ? true : 'probability is out of range'),
  });
}

// ───────────── Challenge ─────────────

function challengeOutlier(rng) {
  const low = rng.int(12, 24);
  const base = dataWithMean(rng, 4, low, low + 6);
  const a = mean(base);
  const k = rng.int(4, 10);
  const up = rng.bool(0.7) || a - 5 * k < 0;
  const x = up ? a + 5 * k : a - 5 * k;
  const all = [...base, x];
  const [m0, m1] = [median(base), median(all)];
  const p = person(rng);
  return q({
    prompt: `${p}'s scores in the first four games of a tournament were ${list(base)}. In the fifth game ${p} scored ${x}. By how much does the fifth score ${up ? 'raise' : 'lower'} ${p}'s mean score?`,
    correct: k,
    wrong: [{ value: Math.abs(x - a), why: `That is how far the new score is from the old mean. Its effect is shared among all 5 scores.` }, m1 !== m0 ? { value: Math.abs(m1 - m0), why: 'That is the change in the median. The question asks about the mean.' } : null, { value: a + (up ? k : -k), why: 'That is the new mean. The question asks how much the mean changed.' }, k + 1, k * 2],
    solution: [
      R`Mean of the first four scores: \((${plus(base)}) \div 4 = ${sum(base)} \div 4 = ${a}\).`,
      R`Mean of all five: \((${sum(base)} + ${x}) \div 5 = ${sum(all)} \div 5 = ${a + (up ? k : -k)}\).`,
      R`The mean ${up ? 'rises' : 'falls'} by \(${k}\). The median ${m0 === m1 ? `stays at ${m0}` : `only moves from ${m0} to ${m1}`}, so one unusual score (an outlier) changes the mean much more than the median.`,
    ],
    rule: 3,
    skill: 'effect of an outlier',
    check: () => (approx(Math.abs(mean(all) - mean(base)), k) ? true : 'change in the mean is wrong'),
  });
}

const DICE_EVENTS = [
  { text: 'the sum is 7', bySum: true, ok: (a, b) => a + b === 7 },
  { text: 'the sum is 10 or more', bySum: true, ok: (a, b) => a + b >= 10 },
  { text: 'the sum is 4 or less', bySum: true, ok: (a, b) => a + b <= 4 },
  { text: 'both cubes show the same number', ok: (a, b) => a === b },
  { text: 'the sum is 9', bySum: true, ok: (a, b) => a + b === 9 },
  { text: 'at least one cube shows a 6', ok: (a, b) => a === 6 || b === 6, slip: [12, 'The row for 6 and the column for 6 share the cell (6, 6). Count that cell once, not twice.'] },
  { text: 'both cubes show an even number', ok: (a, b) => a % 2 === 0 && b % 2 === 0, slip: [18, 'That is the probability for one cube. Both cubes must show an even number, which leaves 3 × 3 cells.'] },
  { text: 'the product of the two numbers is odd', ok: (a, b) => (a * b) % 2 === 1, slip: [18, 'A product is odd only when both numbers are odd. That leaves 3 × 3 cells, not half of the table.'] },
  { text: 'the sum is 5', bySum: true, ok: (a, b) => a + b === 5 },
  { text: 'the sum is greater than 8', bySum: true, ok: (a, b) => a + b > 8 },
  { text: 'the two numbers differ by exactly 1', ok: (a, b) => Math.abs(a - b) === 1 },
  { text: 'the sum is an odd number', bySum: true, ok: (a, b) => (a + b) % 2 === 1 },
  { text: 'the sum is 11 or 12', bySum: true, ok: (a, b) => a + b >= 11 },
  { text: 'neither cube shows a 1', ok: (a, b) => a !== 1 && b !== 1, slip: [30, 'That is the probability for one cube. Both cubes must avoid 1, which leaves 5 × 5 cells.'] },
];

function challengeTwoDice(rng) {
  const e = rng.pick(DICE_EVENTS);
  const six = [1, 2, 3, 4, 5, 6];
  const pairs = six.flatMap((a) => six.map((b) => [a, b])).filter(([a, b]) => e.ok(a, b));
  const count = pairs.length;
  const ans = frac(count, 36);
  const unordered = pairs.filter(([a, b]) => a <= b).length; // what a student counts who treats (2, 5) and (5, 2) as one outcome
  const sums = new Set(pairs.map(([a, b]) => a + b)).size; // how many of the 11 possible sums fit
  const colors = rng.pick(['a red one and a blue one', 'a green one and a white one', 'a large one and a small one']);
  return q({
    prompt: `Two number cubes, ${colors}, are rolled. Each has faces numbered 1 to 6. What is the probability that ${e.text}?`,
    visual: { type: 'table', headers: ['+', ...six.map(String)], rowHeaders: true, rows: six.map((a) => [String(a), ...six.map((b) => a + b)]), caption: 'Sums of the two cubes', alt: 'A 6 by 6 table showing the sum for every pair of numbers on the two cubes.' },
    correct: ans,
    wrong: [
      e.slip ? { value: frac(e.slip[0], 36), why: e.slip[1] } : null,
      e.bySum ? { value: frac(sums, 11), why: 'The 11 possible sums (2 to 12) are not equally likely. Count the cells in the table of 36.' } : null,
      unordered < count ? { value: frac(unordered, 36), why: 'Count every cell of the table that fits. Pairs such as (2, 5) and (5, 2) are different outcomes.' } : null,
      count < 12 ? { value: frac(count, 12), why: 'Two cubes give 6 × 6 = 36 equally likely outcomes, not 6 + 6 = 12.' } : null,
      { value: frac(unordered, 21), why: 'Ignoring which cube is which gives 21 pairs, but they are not equally likely. Use all 36 cells of the table.' },
      frac(count + 1, 36),
      frac(count + 2, 36),
    ],
    solution: [R`List all the outcomes in a table: \(6 \times 6 = 36\) equally likely pairs.`, `Count the pairs where ${e.text}: there are ${count}.`, R`Probability \(= \frac{${count}}{36}${ans.d !== 36 ? ` = ${ans.tex()}` : ''}\).`],
    rule: 6,
    skill: 'compound events',
    check: () => {
      let c = 0;
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (e.ok(a, b)) c += 1;
      return ans.eq(frac(c, 36)) ? true : 'count is wrong';
    },
  });
}

function challengeReplace(rng) {
  const [x, y] = rng.sample(['red', 'blue', 'green', 'yellow'], 2);
  const [r, b] = [rng.int(2, 6), rng.int(2, 6)];
  const t = r + b;
  const kind = rng.pick(['both', 'oneEach', 'same']);
  const ans = kind === 'both' ? frac(r * r, t * t) : kind === 'oneEach' ? frac(2 * r * b, t * t) : frac(r * r + b * b, t * t);
  const ask = { both: `both marbles are ${x}`, oneEach: `one marble is ${x} and the other is ${y}, in either order`, same: 'both marbles are the same color' }[kind];
  const name = person(rng);
  return q({
    prompt: `A bag holds ${r} ${x} marbles and ${b} ${y} marbles. ${name} takes one marble without looking, notes its color and puts it back. Then ${name} takes a marble again. What is the probability that ${ask}?`,
    correct: ans,
    wrong: [
      kind === 'both' ? { value: frac(r, t), why: `That is the probability for one draw. Both draws must be ${x}: count pairs of draws.` } : kind === 'oneEach' ? { value: frac(r * b, t * t), why: `There are two orders: ${x} then ${y}, and ${y} then ${x}. Count both.` } : { value: frac(r * r, t * t), why: `That counts only two ${x} marbles. Two ${y} marbles are also the same color.` },
      kind === 'both' ? { value: frac(r * (r - 1), t * (t - 1)), why: 'The first marble is put back, so the bag is the same for the second draw.' } : { value: frac(1, 2), why: 'The outcomes are not equally likely here. Count the pairs of draws.' },
      kind === 'both' ? frac(2 * r, t * t) : { value: kind === 'oneEach' ? frac(2 * r * b, t * (t - 1)) : frac(r * (r - 1) + b * (b - 1), t * (t - 1)), why: 'The first marble is put back, so the bag is the same for the second draw.' },
      ans.add(frac(1, t * t)),
    ],
    solution: [
      R`Because the marble is put back, each draw has ${t} equally likely marbles. Two draws give \(${t} \times ${t} = ${t * t}\) equally likely pairs.`,
      kind === 'both' ? R`Pairs with two ${x} marbles: \(${r} \times ${r} = ${r * r}\).` : kind === 'oneEach' ? R`${cap(x)} then ${y}: \(${r} \times ${b} = ${r * b}\) pairs. ${cap(y)} then ${x}: \(${b} \times ${r} = ${r * b}\) pairs. Together: \(${2 * r * b}\).` : R`Two ${x}: \(${r} \times ${r} = ${r * r}\) pairs. Two ${y}: \(${b} \times ${b} = ${b * b}\) pairs. Together: \(${r * r + b * b}\).`,
      R`Probability \(= \frac{${ans.mul(t * t).n}}{${t * t}}${ans.d !== t * t ? ` = ${ans.tex()}` : ''}\).`,
    ],
    rule: 6,
    skill: 'compound events',
    check: () => {
      const bag = [...Array(r).fill('x'), ...Array(b).fill('y')];
      let c = 0;
      for (const first of bag) for (const second of bag) if (kind === 'both' ? first === 'x' && second === 'x' : kind === 'oneEach' ? first !== second : first === second) c += 1;
      return ans.eq(frac(c, t * t)) ? true : 'count of pairs is wrong';
    },
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'statistics-probability',
  title: 'Statistics & Probability',
  summary: 'Describe data with center and spread, read dot plots and bar charts, and find probabilities of simple and compound events.',
  grade: 'Grades 6–7',
  standards: ['CCSS 6.SP.A.3', 'CCSS 6.SP.B.5', 'CCSS 7.SP.C.5', 'CCSS 7.SP.C.7', 'CCSS 7.SP.C.8'],

  explain: {
    intro: R`**Statistics** sums up a whole set of data with a few numbers: a measure of **center** says what is typical, and a measure of **spread** says how much the values vary. **Probability** uses a number from 0 to 1 to say how likely something is to happen.`,
    rules: [
      {
        title: 'Mean: share the total equally',
        text: R`Add all the values and divide by how many there are. The mean is the value everyone would get if the total were shared out equally. Working backwards, the total is the mean times the number of values.`,
        example: R`For 3, 5, 5, 6, 8, 9: the total is 36 and there are 6 values, so the mean is \(36 \div 6 = 6\).`,
      },
      {
        title: 'Median, mode and range',
        text: R`Put the values in order first. The **median** is the middle value; with an even number of values it is halfway between the two middle ones. The **mode** is the value that appears most often. The **range** is the greatest value minus the least value.`,
        example: R`For 3, 5, 5, 6, 8, 9: the median is halfway between 5 and 6, which is 5.5. The mode is 5. The range is \(9 - 3 = 6\).`,
      },
      {
        title: 'Spread: interquartile range and mean absolute deviation',
        text: R`The **lower quartile** is the median of the lower half of the ordered data, and the **upper quartile** is the median of the upper half. (When the number of values is odd, leave the middle value out of both halves.) The **IQR** is the upper quartile minus the lower quartile. The **MAD** is the average distance of the values from the mean.`,
        example: R`For 4, 6, 7, 9, 14: the quartiles are 5 and 11.5, so the IQR is 6.5. The mean is 8, the distances from it are 4, 2, 1, 1, 6, and the MAD is \(14 \div 5 = 2.8\).`,
      },
      {
        title: 'Outliers move the mean more than the median',
        text: R`An **outlier** is a value far from the rest. It pulls the mean toward itself, but the median hardly moves. When data has an outlier, the median is usually the better description of a typical value.`,
        example: R`Scores 70, 75, 80, 85 have mean 77.5 and median 77.5. Add a score of 20: the mean drops to 66, but the median only drops to 75.`,
      },
      {
        title: 'Probability of an event',
        text: R`When all outcomes are equally likely, probability \(=\) favorable outcomes \(\div\) all outcomes. It is always between 0 (impossible) and 1 (certain). The probability that an event does **not** happen is 1 minus the probability that it does.`,
        example: R`A bag has 3 red, 5 blue and 2 green marbles. \(P(\text{red}) = \frac{3}{10}\) and \(P(\text{not red}) = 1 - \frac{3}{10} = \frac{7}{10}\).`,
      },
      {
        title: 'Experimental probability and predictions',
        text: R`Experimental probability comes from data: the number of times something happened divided by the number of trials. To predict, multiply the probability by the number of future trials. Results from many trials get close to the theoretical probability, but they rarely match it exactly.`,
        example: R`A spinner lands on red 18 times in 50 spins: \(\frac{18}{50} = 0.36\). In 300 spins, expect about \(0.36 \times 300 = 108\) reds.`,
      },
      {
        title: 'Compound events: count every outcome',
        text: R`When two things happen (a coin and a number cube, two spinners, two draws), list every possible pair in a table, a tree diagram or an organized list. If the first step has \(a\) outcomes and the second has \(b\), there are \(a \times b\) pairs. Then count the favorable pairs.`,
        example: R`A coin and a number cube give \(2 \times 6 = 12\) outcomes. "Heads and an even number" is H2, H4, H6, so its probability is \(\frac{3}{12} = \frac{1}{4}\).`,
      },
    ],
    vocab: [
      { term: 'mean', def: 'The total of the values divided by the number of values.' },
      { term: 'median', def: 'The middle value when the values are in order.' },
      { term: 'interquartile range (IQR)', def: 'The upper quartile minus the lower quartile: the spread of the middle half of the data.' },
      { term: 'mean absolute deviation (MAD)', def: 'The average distance of the values from the mean.' },
      { term: 'outlier', def: 'A value that is much greater or much less than the rest of the data.' },
      { term: 'sample space', def: 'The list of all possible outcomes.' },
    ],
    mistakes: [
      'Finding the median without putting the values in order first.',
      'Giving how many times a value appears instead of the value itself as the mode.',
      'Stopping at the total of the distances when finding the MAD. Divide by the number of values.',
      R`Adding instead of multiplying to count pairs of outcomes: a coin and a number cube have 12 outcomes, not 8.`,
    ],
    visual: { type: 'dotPlot', values: [3, 5, 5, 6, 8, 9], label: 'Books read', alt: 'A dot plot of the values 3, 5, 5, 6, 8 and 9. There are two dots above 5.' },
  },

  examples: [
    {
      title: 'Mean, median, mode and range',
      problem: 'Six students read 3, 5, 5, 6, 8 and 9 books. Find the mean, median, mode and range.',
      steps: [
        R`Mean: \(3 + 5 + 5 + 6 + 8 + 9 = 36\), and \(36 \div 6 = 6\).`,
        R`Median: the values are already in order. There are 6 of them, so take the two middle values, 5 and 6. Halfway between them is 5.5.`,
        R`Mode: 5 appears twice and every other value appears once, so the mode is 5.`,
        R`Range: \(9 - 3 = 6\).`,
      ],
      answer: 'Mean 6, median 5.5, mode 5, range 6',
      visual: { type: 'dotPlot', values: [3, 5, 5, 6, 8, 9], label: 'Books read', alt: 'A dot plot of the values 3, 5, 5, 6, 8 and 9.' },
    },
    {
      title: 'Interquartile range and mean absolute deviation',
      problem: 'Find the IQR and the MAD of 4, 6, 7, 9, 14.',
      steps: [
        R`The values are in order and the median is 7. Lower half: 4, 6. Upper half: 9, 14.`,
        R`Lower quartile: halfway between 4 and 6 is 5. Upper quartile: halfway between 9 and 14 is 11.5. IQR \(= 11.5 - 5 = 6.5\).`,
        R`Mean: \(40 \div 5 = 8\). Distances from 8: 4, 2, 1, 1, 6.`,
        R`MAD: \((4 + 2 + 1 + 1 + 6) \div 5 = 14 \div 5 = 2.8\).`,
      ],
      answer: 'IQR 6.5; MAD 2.8',
      visual: { type: 'table', headers: ['Value', 'Distance from the mean (8)'], rows: [[4, 4], [6, 2], [7, 1], [9, 1], [14, 6]], alt: 'A table of each value and its distance from the mean: 4, 2, 1, 1 and 6.' },
    },
    {
      title: 'Word problem: probability and a prediction',
      word: true,
      problem: 'A bag holds 3 red, 5 blue and 2 green marbles. Nadia takes one marble without looking and puts it back. What is the probability that it is red? If Nadia does this 50 times, about how many red marbles should Nadia expect?',
      steps: [
        R`There are \(3 + 5 + 2 = 10\) equally likely marbles, and 3 are red: \(P(\text{red}) = \frac{3}{10}\).`,
        R`Multiply the probability by the number of trials: \(\frac{3}{10} \times 50 = 15\).`,
        R`Expect about 15 reds. An actual experiment might give 13 or 17, because chance results vary.`,
      ],
      answer: R`\(\frac{3}{10}\); about 15 red marbles`,
    },
    {
      title: 'Word problem: a compound event',
      word: true,
      problem: 'A coin is flipped and a number cube is rolled. What is the probability of getting heads and an even number?',
      steps: [
        R`Make a table of every outcome: 2 results for the coin and 6 for the cube give \(2 \times 6 = 12\) equally likely outcomes.`,
        R`Find the favorable ones: H2, H4 and H6. That is 3 outcomes.`,
        R`Probability \(= \frac{3}{12} = \frac{1}{4}\).`,
      ],
      answer: R`\(\frac{1}{4}\)`,
      visual: { type: 'table', headers: ['Coin', '1', '2', '3', '4', '5', '6'], rowHeaders: true, rows: [['Heads', 'H1', '**H2**', 'H3', '**H4**', 'H5', '**H6**'], ['Tails', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6']], alt: 'A table of the 12 outcomes of a coin and a number cube, with H2, H4 and H6 in bold.' },
    },
  ],

  models: [
    {
      id: 'data-summary',
      title: 'Summarize six values',
      intro: 'Type six whole numbers. The dot plot and all the measures update as you type.',
      inputs: ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'].map((label, i) => ({ name: `v${i + 1}`, label: `${label} value`, type: 'int', min: 0, max: 40, value: [3, 5, 5, 6, 8, 9][i] })),
      compute(v) {
        const vals = [v.v1, v.v2, v.v3, v.v4, v.v5, v.v6];
        const s = sortNum(vals);
        const total = sum(vals);
        const m = total / 6;
        const exact = clean(m, 2) != null;
        const med = median(vals);
        const dist = vals.map((x) => Math.abs(x - m));
        const mad = sum(dist) / 6;
        const counts = new Map();
        vals.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
        const top = Math.max(...counts.values());
        const modes = sortNum([...counts].filter(([, c]) => c === top).map(([x]) => x));
        const modeText = top === 1 ? 'no mode (every value appears once)' : `${modes.length > 1 ? 'modes' : 'mode'} ${list(modes)}`;
        return {
          problem: `Summarize the data ${list(vals)}.`,
          steps: [
            `In order: ${list(s)}.`,
            R`Mean: \(${plus(vals)} = ${total}\), and \(${total} \div 6 ${exact ? '=' : R`\approx`} ${num(m, { places: 2 })}\).`,
            R`Median: the two middle values are ${s[2]} and ${s[3]}, so the median is \(${num(med)}\).`,
            `Mode: look for the value that appears most often. This data has ${modeText}.`,
            R`Range: \(${s[5]} - ${s[0]} = ${s[5] - s[0]}\).`,
            R`MAD: the distances from the mean add to \(${num(sum(dist), { places: 2 })}\), and \(${num(sum(dist), { places: 2 })} \div 6 ${clean(mad, 2) != null ? '=' : R`\approx`} ${num(mad, { places: 2 })}\).`,
          ],
          answer: R`Mean \(${exact ? '' : R`\approx `}${num(m, { places: 2 })}\), median \(${num(med)}\), range \(${s[5] - s[0]}\), MAD \(${clean(mad, 2) != null ? '' : R`\approx `}${num(mad, { places: 2 })}\)`,
          visual: { type: 'dotPlot', values: vals, alt: `A dot plot of the values ${list(s)}.` },
        };
      },
    },
    {
      id: 'marble-bag',
      title: 'Word problem: marbles in a bag',
      word: true,
      intro: 'Change the number of marbles of each color and the number of draws.',
      inputs: [
        { name: 'red', label: 'Red marbles', type: 'int', min: 1, max: 20, value: 3 },
        { name: 'blue', label: 'Blue marbles', type: 'int', min: 1, max: 20, value: 5 },
        { name: 'green', label: 'Green marbles', type: 'int', min: 1, max: 20, value: 2 },
        { name: 'draws', label: 'Number of draws', type: 'int', min: 10, max: 500, value: 50 },
      ],
      compute({ red, blue, green, draws }) {
        const total = red + blue + green;
        const p = frac(red, total);
        const expected = p.mul(draws);
        const simpler = p.d !== total ? ` = ${p.tex()}` : '';
        return {
          problem: `A bag holds ${red} red, ${blue} blue and ${green} green marbles. Nadia takes one marble without looking and puts it back. What is the probability that it is red? What is the probability that it is not red? In ${draws} draws, about how many reds should Nadia expect?`,
          steps: [
            R`Count all the equally likely outcomes: \(${red} + ${blue} + ${green} = ${total}\) marbles.`,
            R`\(P(\text{red}) = \frac{${red}}{${total}}${simpler}\).`,
            total === red ? 'Every marble is red, so red is certain and "not red" is impossible.' : R`\(P(\text{not red}) = 1 - ${p.tex()} = ${frac(total - red, total).tex()}\).`,
            R`Expected reds: \(${p.tex()} \times ${draws} ${expected.isInt() ? '=' : R`\approx`} ${num(expected.value, { places: 1 })}\).`,
          ],
          answer: R`\(P(\text{red}) = ${p.tex()}\), \(P(\text{not red}) = ${frac(total - red, total).tex()}\), about ${Math.round(expected.value)} reds`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyMean, easyMedianModeRange, easyDotPlot],
    medium: [mediumIQR, mediumMeanChart, mediumProbability, mediumLikelihood],
    hard: [hardMAD, hardMissingValue, hardExperimental, hardCompound],
    challenge: [challengeOutlier, challengeTwoDice, challengeReplace],
  },
};
