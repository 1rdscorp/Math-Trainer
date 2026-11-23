import { R, q, frac, fracTex, num, paren, txt, money, round, range, sum, choose, person, people, plural, joinList } from '../../lib/index.js';
import { M, val } from './_shared.js';

// ───────────── Helpers ─────────────

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const close = (a, b) => Math.abs(a - b) < 1e-9;
// A wrong answer only if it ends by the second decimal place (no 4.6667 among the choices).
const tidy = (v) => (close(v * 100, Math.round(v * 100)) ? v : null);
// Split `total` into k whole parts, each a multiple of `unit` and at least `unit`.
function split(rng, total, k, unit = 5) {
  const parts = Array(k).fill(unit);
  for (let left = total / unit - k; left > 0; left--) parts[rng.int(0, k - 1)] += unit;
  return parts;
}
// A probability given in hundredths (35 → 0.35).
const P = (c) => num(c / 100);
// Distribution table: values in the top row, probabilities (null → '?') in the second.
const distTable = (xs, ps, caption) => ({
  type: 'table', caption, rowHeaders: true,
  headers: [M('x'), ...xs.map((x) => M(num(x)))],
  rows: [[M('P(x)'), ...ps.map((p) => (p == null ? '?' : M(typeof p === 'string' ? p : num(p))))]],
});
// x·P(x) + … written out, from values and probabilities in hundredths.
const sumTex = (xs, cs) => xs.map((x, i) => `${paren(x)}(${P(cs[i])})`).join(' + ');
// Numbers added up, with a negative one written as a subtraction: 1.4 - 2.8 + 0.5.
const addTex = (vs) => vs.map((v, i) => (i === 0 ? num(v) : v < 0 ? `- ${num(-v)}` : `+ ${num(v)}`)).join(' ');
const evOf = (xs, cs) => round(sum(xs.map((x, i) => x * cs[i])) / 100, 4);
// Average of a long list made of the values, each repeated as often as its count: a long-run check.
const listAverage = (xs, counts) => {
  const list = xs.flatMap((x, i) => Array(counts[i]).fill(x));
  return sum(list) / list.length;
};
const pts = (v) => `${M(num(v))} ${Math.abs(val(v)) <= 1 && val(v) !== 0 ? 'point' : 'points'}`;

const DISTS = [
  { x: [0, 1, 2, 3], say: R`\(X\) is the number of cars owned by a randomly chosen household on one street.`, unit: 'cars' },
  { x: [0, 1, 2, 3, 4], say: R`\(X\) is the number of goals a soccer team scores in a randomly chosen game.`, unit: 'goals' },
  { x: [1, 2, 3, 4], say: R`\(X\) is the number of people in a randomly chosen car at a toll booth.`, unit: 'people' },
  { x: [0, 5, 10, 20], say: R`\(X\) is the number of points a player scores on one turn of a board game.`, unit: 'points' },
  { x: [0, 1, 2, 3], say: R`\(X\) is the number of library books a randomly chosen student borrows in a week.`, unit: 'books' },
];

// ───────────── Easy ─────────────

function easyMissingProb(rng) {
  const d = rng.pick(DISTS);
  const k = d.x.length;
  const cs = split(rng, 100, k);
  const miss = rng.int(0, k - 1);
  const given = cs.filter((_, i) => i !== miss);
  const other = rng.pick(given);
  const answer = cs[miss] / 100;
  return q({
    prompt: `${d.say} The table shows its probability distribution, with one probability missing. What is the missing probability?`,
    visual: distTable(d.x, cs.map((c, i) => (i === miss ? null : c / 100)), 'Probability distribution'),
    correct: answer,
    wrong: [
      { value: (cs[miss] + other) / 100, why: 'Add every given probability before subtracting from 1. One of them was left out.' },
      { value: sum(given) / 100, why: 'That is the total of the given probabilities. The missing one is what brings the total up to 1.' },
      { value: round(1 / k, 4), why: 'The outcomes are not equally likely here. Use the fact that all the probabilities add up to 1.' },
      round(answer + 0.1, 2),
    ],
    solution: [
      'The probabilities of all the values of a random variable add up to 1.',
      R`The given probabilities add up to \(${given.map(P).join(' + ')} = ${P(sum(given))}\).`,
      R`The missing probability is \(1 - ${P(sum(given))} = ${P(cs[miss])}\).`,
    ],
    rule: 0, skill: 'missing probability',
    check: () => (sum(cs) === 100 && cs.every((c) => c > 0) && close(answer + sum(given) / 100, 1) ? true : 'the probabilities do not add up to 1'),
  });
}

function easyExpectedTable(rng) {
  const d = rng.pick(DISTS);
  const cs = split(rng, 100, d.x.length);
  const E = evOf(d.x, cs);
  const mean = round(sum(d.x) / d.x.length, 4);
  const mode = d.x[cs.indexOf(Math.max(...cs))];
  return q({
    prompt: `${d.say} The table shows its probability distribution. What is the expected value of ${M('X')}?`,
    visual: distTable(d.x, cs.map((c) => c / 100), 'Probability distribution'),
    correct: E,
    wrong: [
      { value: mean, why: 'That is the plain average of the values. Each value must be weighted by its probability.' },
      { value: tidy(E / d.x.length), why: R`The probabilities already do the averaging. Add up the products \(x \cdot P(x)\) and stop there.` },
      { value: mode, why: 'That is the most likely value. The expected value is the long-run average, which takes every value into account.' },
      round(E + 1, 2),
    ],
    solution: [
      R`Multiply each value by its probability and add: \(E(X) = ${sumTex(d.x, cs)}\).`,
      R`\(E(X) = ${addTex(d.x.map((x, i) => round((x * cs[i]) / 100, 4)))} = ${num(E)}\).`,
      `Over many trials the average of ${M('X')} is about ${num(E)} ${d.unit}.`,
    ],
    rule: 1, skill: 'expected value from a table',
    check: () => (close(listAverage(d.x, cs), E) ? true : 'the average of 100 outcomes in these proportions differs'),
  });
}

function easySpinner(rng) {
  const n = rng.pick([4, 5, 8, 10]);
  const pool = rng.pick([[1, 2, 3, 5], [0, 2, 4, 10], [1, 3, 5, 10], [0, 1, 5, 20], [2, 4, 6, 8]]);
  const secs = range(1, n).map(() => rng.pick(pool)).sort((a, b) => a - b);
  const distinct = [...new Set(secs)];
  if (distinct.length < 3) return easySpinner(rng);
  const counts = distinct.map((v) => secs.filter((s) => s === v).length);
  const E = round(sum(secs) / n, 4);
  const plainMean = round(sum(distinct) / distinct.length, 4);
  const mid = n % 2 ? secs[(n - 1) / 2] : (secs[n / 2 - 1] + secs[n / 2]) / 2;
  return q({
    prompt: `A spinner has ${n} equal sections labelled ${joinList(secs.map((s) => txt(s)))}. A player scores the number the spinner lands on. What is the expected score for one spin?`,
    correct: E,
    wrong: [
      { value: tidy(plainMean), why: 'Each label counts as many times as it appears on the spinner. Average all the sections, not just the different labels.' },
      { value: mid, why: 'That is the median of the labels. The expected value is the mean of all the sections.' },
      { value: sum(secs), why: `That is the total of all the sections. Divide by ${n}, the number of equally likely sections.` },
      round(E + 1, 2),
    ],
    solution: [
      `The ${n} sections are equally likely, so each has probability ${M(fracTex(1, n))}.`,
      R`Probability distribution: ${distinct.map((v, i) => R`\(P(${v}) = ${fracTex(counts[i], n)}\)`).join(', ')}.`,
      R`\(E = ${distinct.map((v, i) => `${v} \\cdot ${fracTex(counts[i], n)}`).join(' + ')} = \dfrac{${sum(secs)}}{${n}} = ${num(E)}\).`,
    ],
    rule: 1, skill: 'expected value from theory',
    check: () => (close(sum(distinct.map((v, i) => (v * counts[i]) / n)), E) ? true : 'the weighted sum differs from the mean of the sections'),
  });
}

// ───────────── Medium ─────────────

function mediumGame(rng) {
  const cost = rng.pick([1, 2, 3, 5]);
  const die = rng.bool(0.4);
  let n;
  let wins; // [count of outcomes, amount received]
  let story;
  if (die) {
    n = 6;
    const A = rng.pick([6, 8, 9, 10, 12, 15, 18, 20]);
    const B = rng.pick([1, 2, 3, 4, 5, 6].filter((b) => (A + b) % 3 === 0 && b < A));
    wins = [[1, A], [1, B]];
    story = `A fair six-sided die is rolled. A roll of 6 pays ${money(A)}, a roll of 5 pays ${money(B)}, and any other roll pays nothing.`;
  } else {
    n = rng.pick([4, 5, 10]);
    const k1 = rng.int(1, Math.max(1, Math.floor(n / 4)));
    const k2 = rng.int(1, Math.floor(n / 2) - k1 + 1);
    const A = rng.pick([5, 8, 10, 12, 15, 20]);
    const B = rng.pick([1, 2, 3, 4].filter((b) => b < A));
    wins = [[k1, A], [k2, B]];
    story = `A spinner has ${n} equal sections. ${plural(k1, 'section pays', 'sections pay')} ${money(A)}, ${plural(k2, 'section pays', 'sections pay')} ${money(B)}, and the rest pay nothing.`;
  }
  const K = sum(wins.map((w) => w[0]));
  const lose = n - K;
  if (lose < 1) return mediumGame(rng);
  const gross = sum(wins.map(([c, a]) => c * a)) / n;
  const E = round(gross - cost, 2);
  if (E > 0) return mediumGame(rng); // fair games keep the fee or more on average
  return q({
    prompt: `It costs ${money(cost)} to play a game at a fair, and the fee is not returned. ${story} What is the expected value of the game for the player (the expected net winnings per play)?`,
    correct: E,
    fmt: money,
    wrong: [
      { value: round(gross, 2), why: `That is the expected prize. The ${money(cost)} fee is paid on every play, so subtract it.` },
      { value: round(gross - (cost * lose) / n, 2), why: 'The fee is paid on every play, win or lose, so subtract the whole fee.' },
      { value: -cost, why: 'The player sometimes wins a prize. Include the prizes, weighted by their probabilities.' },
      round(E + 1, 2),
    ],
    solution: [
      R`Expected prize: \(${wins.map(([c, a]) => `${a} \\cdot ${fracTex(c, n)}`).join(' + ')} = ${num(round(gross, 4))}\) dollars.`,
      R`Subtract the fee, paid on every play: \(${num(round(gross, 4))} - ${cost} = ${num(E)}\).`,
      E === 0 ? 'The expected value is 0, so the game is fair.' : `The expected value is ${E < 0 ? 'negative: the player loses' : 'positive: the player gains'} ${money(Math.abs(E))} per play on average, so the game is not fair.`,
    ],
    rule: 3, skill: 'expected winnings',
    check: () => {
      const outcomes = range(1, n).map((i) => {
        let left = i;
        for (const [c, a] of wins) {
          if (left <= c) return a - cost;
          left -= c;
        }
        return -cost;
      });
      return close(round(sum(outcomes) / n, 2), E) ? true : 'averaging the net result of every outcome gives a different value';
    },
  });
}

const DATA = [
  { story: (N) => `A café recorded the number of cakes left unsold at closing on each of ${N} days.`, x: [0, 1, 2, 3, 4], xl: 'Cakes left', yl: 'Days', what: 'cakes left unsold on a day', unit: 'cakes' },
  { story: (N) => `A basketball player took 3 free throws in each of ${N} practice rounds and recorded how many went in each round.`, x: [0, 1, 2, 3], xl: 'Free throws made', yl: 'Rounds', what: 'free throws made in a round', unit: 'free throws' },
  { story: (N) => `A teacher recorded the number of students absent on each of ${N} school days.`, x: [0, 1, 2, 3, 4, 5], xl: 'Students absent', yl: 'Days', what: 'students absent on a day', unit: 'students' },
  { story: (N) => `A biologist counted the eggs in each of ${N} robin nests.`, x: [2, 3, 4, 5], xl: 'Eggs in the nest', yl: 'Nests', what: 'eggs in a nest', unit: 'eggs' },
];

function mediumEmpirical(rng) {
  const d = rng.pick(DATA);
  const N = rng.pick([20, 25, 50]);
  const f = split(rng, N, d.x.length, 1);
  const E = round(sum(d.x.map((x, i) => x * f[i])) / N, 4);
  const visual = {
    type: 'barChart', xLabel: d.xl, yLabel: d.yl,
    bars: d.x.map((x, i) => ({ label: String(x), value: f[i] })),
    alt: `Bar chart of ${d.xl.toLowerCase()} over ${N} ${d.yl.toLowerCase()}: ${d.x.map((x, i) => `${x}: ${f[i]}`).join(', ')}.`,
  };
  if (rng.bool(0.6)) {
    return q({
      prompt: `${d.story(N)} The bar chart shows the results. Use the data to estimate the expected number of ${d.what}.`,
      visual,
      correct: E,
      wrong: [
        { value: tidy(sum(d.x) / d.x.length), why: 'That is the average of the values on the axis. Each value counts as many times as it was observed.' },
        { value: sum(d.x.map((x, i) => x * f[i])), why: `That is the total over all ${N} ${d.yl.toLowerCase()}. Divide by ${N} to get the average per one.` },
        { value: tidy(N / d.x.length), why: 'That is the average height of the bars. Weight each value by how often it happened.' },
        round(E + 0.5, 2),
      ],
      solution: [
        R`Each relative frequency estimates a probability: \(P(x) \approx \dfrac{\text{count}}{${N}}\).`,
        R`\(E \approx \dfrac{${d.x.map((x, i) => `${x} \\cdot ${f[i]}`).join(' + ')}}{${N}} = \dfrac{${sum(d.x.map((x, i) => x * f[i]))}}{${N}} = ${num(E)}\).`,
        `On average there were about ${num(E)} ${d.what}.`,
      ],
      rule: 2, skill: 'expected value from data',
      check: () => (close(listAverage(d.x, f), E) ? true : 'the mean of the raw data differs'),
    });
  }
  const j = rng.int(1, d.x.length - 2);
  const v = d.x[j];
  const hits = sum(f.slice(j));
  return q({
    prompt: `${d.story(N)} The bar chart shows the results. Based on the data, what is the estimated probability that the number of ${d.what} is at least ${v}?`,
    visual,
    correct: hits / N,
    wrong: [
      { value: (hits - f[j]) / N, why: `"At least ${v}" includes ${v} itself.` },
      { value: f[j] / N, why: `That is the probability of exactly ${v}. "At least" also includes every larger value.` },
      { value: (N - hits) / N, why: `That is the probability of fewer than ${v}.` },
      round(hits / N + 0.1, 2),
    ],
    solution: [
      `Add the counts for ${joinList(d.x.slice(j).map(String))}: ${f.slice(j).join(' + ')} = ${hits}.`,
      R`Divide by the number of observations: \(\dfrac{${hits}}{${N}} = ${num(hits / N)}\).`,
    ],
    rule: 2, skill: 'empirical probability',
    check: () => {
      const raw = d.x.flatMap((x, i) => Array(f[i]).fill(x));
      return close(raw.filter((x) => x >= v).length / raw.length, hits / N) ? true : 'counting the raw data differs';
    },
  });
}

const CHAINS = [
  { text: (a, b) => `On a school morning, the probability of rain is ${a}. When it rains, the probability that the school bus is late is ${b}.`, both: 'it rains and the bus is late', notB: 'it rains and the bus is on time', A: 'rain', B: 'late' },
  { text: (a, b) => `A basketball player makes a first free throw with probability ${a}. After making the first, the player makes the second with probability ${b}.`, both: 'the player makes both free throws', notB: 'the player makes the first free throw and misses the second', A: 'first in', B: 'second in' },
  { text: (a, b) => `At a factory, ${a} of the phones are made on Line 1. Of the phones from Line 1, a fraction ${b} pass inspection the first time.`, both: 'a randomly chosen phone is from Line 1 and passes the first time', notB: 'a randomly chosen phone is from Line 1 and fails the first time', A: 'Line 1', B: 'pass' },
  { text: (a, b) => `At a school, the probability that a randomly chosen student takes the bus is ${a}. Of the students who take the bus, a fraction ${b} live more than 5 km away.`, both: 'a randomly chosen student takes the bus and lives more than 5 km away', notB: 'a randomly chosen student takes the bus and lives 5 km away or closer', A: 'bus', B: 'far' },
];

function mediumMultRule(rng) {
  const s = rng.pick(CHAINS);
  const a = 5 * rng.int(4, 18);
  const b = 5 * rng.int(2, 19);
  const neg = rng.bool(0.35);
  const bb = neg ? 100 - b : b;
  const answer = round((a * bb) / 10000, 4);
  const bTex = neg ? `P(\\text{not ${s.B}} \\mid \\text{${s.A}})` : `P(\\text{${s.B}} \\mid \\text{${s.A}})`;
  return q({
    prompt: `${s.text(P(a), P(b))} What is the probability that ${neg ? s.notB : s.both}?`,
    correct: answer,
    wrong: [
      a + bb < 100 ? { value: (a + bb) / 100, why: 'Both events must happen, so multiply. Adding is for "or".' } : null,
      neg ? { value: round((a * b) / 10000, 4), why: `That is the probability that ${s.both}. Here the second event fails, with probability ${M(`1 - ${P(b)}`)}.` } : { value: b / 100, why: `That is the probability of the second event once the first has happened. Multiply by the probability of the first, ${P(a)}.` },
      neg ? { value: bb / 100, why: `Multiply by the probability of the first event, ${P(a)}, as well.` } : { value: round(1 - answer, 4), why: 'That is the probability that the two events do not both happen.' },
      round(answer + 0.1, 4),
    ],
    solution: [
      R`Use the general multiplication rule: \(P(A \text{ and } B) = P(A) \cdot P(B \mid A)\).`,
      neg ? R`\(${bTex} = 1 - ${P(b)} = ${P(bb)}\).` : R`\(P(\text{${s.A}}) = ${P(a)}\) and \(${bTex} = ${P(b)}\).`,
      R`\(${P(a)} \cdot ${P(bb)} = ${num(answer)}\).`,
    ],
    rule: 5, skill: 'general multiplication rule',
    check: () => {
      // Out of 10,000 equally likely cases: a·100 have the first event, and bb out of every 100 of those have the second.
      const first = a * 100;
      const both = (first / 100) * bb;
      return close(both / 10000, answer) ? true : 'counting 10,000 cases gives a different answer';
    },
  });
}

// ───────────── Hard ─────────────

const PLANS = [
  { thing: 'warranty', text: (W, p1, r1, p2, r2) => `A laptop comes with the offer of a 2-year warranty for ${money(W)}. Without the warranty, over those 2 years there is a ${p1} chance of a repair costing ${money(r1)} and a ${p2} chance of a failure that needs a ${money(r2)} replacement. Otherwise there is no cost.`, r1: [80, 150], r2: [500, 900] },
  { thing: 'insurance', text: (W, p1, r1, p2, r2) => `A phone insurance plan costs ${money(W)} for one year. Without it, during the year there is a ${p1} chance of a cracked screen costing ${money(r1)} to fix and a ${p2} chance of losing the phone, costing ${money(r2)} to replace.`, r1: [100, 250], r2: [600, 1000] },
  { thing: 'trip insurance', text: (W, p1, r1, p2, r2) => `Insurance for a ${money(r2)} vacation costs ${money(W)}. Without it, there is a ${p1} chance of a delay that costs ${money(r1)} in extra fees and a ${p2} chance the trip is cancelled and the full ${money(r2)} is lost.`, r1: [100, 300], r2: [1200, 2500] },
];

function hardDecision(rng) {
  const s = rng.pick(PLANS);
  const r1 = 10 * rng.int(s.r1[0] / 10, s.r1[1] / 10);
  const r2 = 50 * rng.int(s.r2[0] / 50, s.r2[1] / 50);
  const p1 = rng.int(5, 25);
  const p2 = rng.int(2, 10);
  const E = round((p1 * r1 + p2 * r2) / 100, 2);
  const W = 5 * Math.round((E * rng.float(0.6, 1.5)) / 5);
  const D = round(Math.abs(W - E), 2);
  const slip = round(Math.abs(W - (p1 * r1) / 100), 2);
  if (D < 1 || W <= 0 || close(slip, D)) return hardDecision(rng);
  const buy = W < E;
  const say = (b, d) => `${b ? 'Buy' : 'Skip'} the ${s.thing}: on average it costs ${money(d)} less`;
  return q({
    prompt: `${s.text(W, P(p1), r1, P(p2), r2)} Based on expected cost, which choice is better, and by how much?`,
    correct: say(buy, D),
    wrong: [
      { value: say(!buy, D), why: `Compare the ${s.thing} price, ${money(W)}, with the expected cost without it, ${money(E)}. The smaller one is the better choice in the long run.` },
      { value: say(buy, slip), why: 'Both possible costs count. Add the expected cost of each one.' },
      say(!buy, slip),
    ],
    solution: [
      R`Expected cost without the ${s.thing}: \(${P(p1)} \cdot ${r1} + ${P(p2)} \cdot ${r2} = ${num(round((p1 * r1) / 100, 2))} + ${num(round((p2 * r2) / 100, 2))} = ${num(E)}\) dollars.`,
      `The ${s.thing} costs ${money(W)} for certain.`,
      `${money(Math.min(W, E))} is less than ${money(Math.max(W, E))} by ${money(D)}, so ${buy ? `buying the ${s.thing}` : `skipping the ${s.thing}`} costs less on average.`,
    ],
    rule: 4, skill: 'comparing expected costs',
    check: () => {
      // 100 equally likely years: p1 of them have the first cost, p2 the second.
      const total = p1 * r1 + p2 * r2;
      return close(Math.abs(W - total / 100), D) && (W < total / 100) === buy ? true : 'averaging 100 cases gives a different decision';
    },
  });
}

const SCORING = [[1, frac(1, 4)], [1, frac(1, 3)], [1, frac(1, 2)], [4, 1], [3, 1], [2, 1], [5, 2], [6, 2]];

function hardGuessing(rng) {
  const [a, b] = rng.pick(SCORING);
  const k = rng.pick([4, 5]);
  const m = rng.int(0, 2);
  const r = k - m;
  const A = frac(a, 1);
  const B = typeof b === 'number' ? frac(b, 1) : b;
  const E = A.sub(B.mul(r - 1)).div(r);
  const name = person(rng);
  return q({
    prompt: `On a test, each multiple-choice question has ${k} choices. A correct answer earns ${pts(A)}, a wrong answer loses ${pts(B)}, and a blank earns 0. ${m ? `On one question ${name} can rule out ${m === 1 ? 'one choice' : 'two choices'} and guesses at random among the rest.` : `${name} guesses at random on one question.`} What is the expected score for that question?`,
    correct: E,
    fmt: pts,
    wrong: [
      m ? { value: A.sub(B.mul(k - 1)).div(k), why: `${cap(m === 1 ? 'one choice was' : 'two choices were')} ruled out, so the guess is among ${r} choices, not ${k}.` } : null,
      { value: A.div(r), why: `A wrong guess loses ${M(num(B))}. Include it: ${M(`P(\\text{wrong}) = ${fracTex(r - 1, r)}`)}.` },
      { value: A.sub(B), why: 'Weight each result by its probability. A correct guess is much less likely than a wrong one.' },
      { value: A.sub(B).div(r), why: R`The wrong result has probability \(${fracTex(r - 1, r)}\), not \(${fracTex(1, r)}\).` },
    ],
    solution: [
      R`Among ${r} equally likely choices: \(P(\text{correct}) = ${fracTex(1, r)}\) and \(P(\text{wrong}) = ${fracTex(r - 1, r)}\).`,
      R`\(E = ${num(A)} \cdot ${fracTex(1, r)} + (-${num(B)}) \cdot ${fracTex(r - 1, r)} = ${E.tex()}\).`,
      E.value > 0 ? 'The expected score is positive, so guessing beats leaving it blank in the long run.' : E.value < 0 ? 'The expected score is negative, so leaving it blank is better in the long run.' : 'The expected score is 0, the same as leaving it blank.',
    ],
    rule: 4, skill: 'guessing penalty',
    check: () => {
      const scores = range(1, r).map((i) => (i === 1 ? val(A) : -val(B)));
      return close(sum(scores) / r, E.value) ? true : 'averaging the possible guesses differs';
    },
  });
}

const DRAWS = [
  { text: (n, g) => `A box holds ${n} batteries, and ${g} of them are good (the rest are dead). Three batteries are taken out at random, one at a time, without replacement.`, all: 'all three are good', ord: 'the first two are good and the third is dead', rep: false },
  { text: (n, g) => `A class has ${n} students, and ${g} of them play in the band. Three different students are chosen at random, one after another, to give presentations.`, all: 'all three play in the band', ord: 'the first two play in the band and the third does not', rep: false },
  { text: (n, g) => `A playlist has ${n} songs, and ${g} of them are by the same singer. Shuffle mode picks a song at random three times, and a song can be picked again.`, all: 'all three picks are by that singer', ord: 'the first two picks are by that singer and the third is not', rep: true },
];

function hardThreeDraws(rng) {
  const s = rng.pick(DRAWS);
  const n = rng.int(8, 15);
  const g = rng.int(4, n - 2);
  const ord = rng.bool(0.4);
  const third = ord ? n - g : g - 2;
  const d = s.rep ? [n, n, n] : [n, n - 1, n - 2];
  const top = s.rep ? [g, g, ord ? n - g : g] : [g, g - 1, third];
  const answer = frac(top[0] * top[1] * top[2], d[0] * d[1] * d[2]);
  const other = s.rep ? frac(g * (g - 1) * (ord ? n - g : g - 2), n * (n - 1) * (n - 2)) : frac(g * g * (ord ? n - g : g), n ** 3);
  return q({
    prompt: `${s.text(n, g)} What is the probability that ${ord ? s.ord : s.all}?`,
    correct: answer,
    wrong: [
      { value: other, why: s.rep ? 'A song can be picked again, so each pick is from all the songs with the same chances. The draws are independent.' : 'The items are not put back, so each later choice is from one fewer item, with one fewer of the kind already taken.' },
      s.rep ? null : { value: frac(top[0] * top[1] * top[2], n ** 3), why: `Without replacement the totals shrink too: ${n}, then ${n - 1}, then ${n - 2}.` },
      { value: frac(top[0], d[0]).mul(frac(top[1], d[1])), why: 'That covers only the first two choices. Multiply by the probability for the third one too.' },
      { value: frac(1, 1).sub(answer), why: 'That is the probability that this does not happen.' },
    ],
    solution: [
      s.rep ? 'Each pick is from all the songs, so the picks are independent and every factor is the same kind of fraction.' : R`Use the general multiplication rule: \(P(A \text{ and } B \text{ and } C) = P(A) \cdot P(B \mid A) \cdot P(C \mid A \text{ and } B)\).`,
      R`\(${top.map((t, i) => fracTex(t, d[i])).join(' \\cdot ')} = ${fracTex(top[0] * top[1] * top[2], d[0] * d[1] * d[2])}\).`,
      R`In lowest terms: \(${answer.tex()}\).`,
    ],
    rule: 5, skill: 'multiplication rule, three events',
    check: () => {
      const items = range(1, n).map((i) => i <= g);
      let [hits, total] = [0, 0];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
        if (!s.rep && (i === j || j === k || i === k)) continue;
        total++;
        if (items[i] && items[j] && (ord ? !items[k] : items[k])) hits++;
      }
      if (!ord && !s.rep && !answer.eq(frac(choose(g, 3), choose(n, 3)))) return 'combinations disagree';
      return answer.eq(frac(hits, total)) ? true : 'listing every ordered triple gives a different answer';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeFairPrice(rng) {
  if (rng.bool(0.5)) {
    const c = rng.pick([1, 2, 3, 5]);
    const n = rng.pick([4, 5, 6, 8, 10, 12, 20]);
    const k = rng.int(1, 3);
    if (k >= n / 2 || (c * n * 100) % k !== 0) return challengeFairPrice(rng);
    const prize = round((c * n) / k, 2);
    return q({
      prompt: `A game costs ${money(c)} to play, and the fee is not returned. A player wins a prize with probability ${M(fracTex(k, n))}; otherwise the player gets nothing. How large should the prize be for the game to be fair?`,
      correct: prize,
      fmt: money,
      wrong: [
        { value: round((c * (n - k)) / k, 2), why: 'The fee is kept even when the player wins, so the prize itself must cover it. That amount would be fair only if the fee were returned with the prize.' },
        { value: round((c * k) / n, 2), why: R`Set the expected value to 0: \(${fracTex(k, n)} \cdot \text{prize} - ${c} = 0\), then divide by \(${fracTex(k, n)}\).` },
        { value: c * n, why: `Divide by the probability of winning, ${M(fracTex(k, n))}, not by ${M(fracTex(1, n))}.` },
        round(prize + 1, 2),
      ],
      solution: [
        R`Fair means the expected net winnings are 0: \(${fracTex(k, n)} \cdot \text{prize} - ${c} = 0\).`,
        R`\(\text{prize} = ${c} \div ${fracTex(k, n)} = ${num(prize)}\) dollars.`,
      ],
      rule: 3, skill: 'fair game',
      check: () => (close((k / n) * prize - c, 0) ? true : 'the expected value with this prize is not 0'),
    });
  }
  const N = rng.pick([100, 200, 250, 500]);
  const t = rng.pick([1, 2, 5]);
  const A = 25 * rng.int(2, 12);
  const kB = rng.int(2, 5);
  const B = 5 * rng.int(2, 8);
  const T = A + kB * B;
  if ((T * 100) % N !== 0 || T >= N * t) return challengeFairPrice(rng);
  const fairPrice = T / N;
  const ask = rng.bool(0.5);
  const story = `To raise money, a club sells ${txt(N)} raffle tickets at ${money(t)} each. One ticket wins ${money(A)}, and ${kB} other tickets win ${money(B)} each.`;
  if (ask) {
    return q({
      prompt: `${story} What ticket price would make the raffle fair for the buyers (expected net winnings of 0)?`,
      correct: fairPrice,
      fmt: money,
      wrong: [
        { value: round((A + B) / N, 2), why: `There are ${kB} prizes of ${money(B)}. Count all of them.` },
        { value: round(T / (kB + 1), 2), why: 'That shares the prizes among the winners only. Each of the tickets sold has the same chance, so divide by the number of tickets.' },
        { value: round(t - fairPrice, 2), why: 'That is how much the club expects to keep per ticket at the current price.' },
        round(fairPrice + 0.1, 2),
      ],
      solution: [
        R`Total prize money: \(${A} + ${kB} \cdot ${B} = ${T}\) dollars.`,
        R`The expected prize per ticket is \(\dfrac{${T}}{${N}} = ${num(fairPrice)}\) dollars. A fair price equals the expected prize.`,
        `The real price is ${money(t)}, so the club keeps about ${money(t - fairPrice)} per ticket on average.`,
      ],
      rule: 3, skill: 'fair price of a raffle',
      check: () => (close(A / N + (kB * B) / N - fairPrice, 0) ? true : 'expected value at this price is not 0'),
    });
  }
  const E = round(fairPrice - t, 2);
  return q({
    prompt: `${story} What is the expected value of one ticket for a buyer?`,
    correct: E,
    fmt: money,
    wrong: [
      { value: fairPrice, why: `That is the expected prize. The ${money(t)} ticket price is paid by every buyer, so subtract it.` },
      { value: round((A + B) / N - t, 2), why: `There are ${kB} prizes of ${money(B)}. Count all of them.` },
      { value: round(t - fairPrice, 2), why: 'That is what the club gains per ticket. For the buyer the sign is the other way.' },
      round(E - 0.5, 2),
    ],
    solution: [
      R`Expected prize: \(${A} \cdot \dfrac{1}{${N}} + ${B} \cdot \dfrac{${kB}}{${N}} = \dfrac{${T}}{${N}} = ${num(fairPrice)}\) dollars.`,
      R`Subtract the price: \(${num(fairPrice)} - ${t} = ${num(E)}\). The buyer loses ${money(-E)} per ticket on average, which is money for the club.`,
    ],
    rule: 3, skill: 'raffle expected value',
    check: () => {
      const total = A + kB * B - N * t; // all tickets together
      return close(total / N, E) ? true : 'the buyers’ total net result per ticket differs';
    },
  });
}

function challengeMissingFromMean(rng) {
  const d = rng.pick(DISTS.filter((x) => x.x.length === 4 && x.x[0] === 0 && x.x[3] === 3));
  const cs = split(rng, 100, 4);
  const [a, p, qq, b] = cs;
  if (p === qq) return challengeMissingFromMean(rng);
  const S = 100 - a - b; // p + q, in hundredths
  const E100 = p + 2 * qq + 3 * b;
  const E = E100 / 100;
  return q({
    prompt: `${d.say} The table shows its distribution, and ${M(`E(X) = ${num(E)}`)}. What is the value of ${M('p')}?`,
    visual: distTable([0, 1, 2, 3], [a / 100, 'p', 'q', b / 100], 'Probability distribution'),
    correct: p / 100,
    wrong: [
      { value: qq / 100, why: R`That is \(q\). Check which of the two unknowns goes with \(x = 1\).` },
      { value: round(S / 200, 4), why: R`\(p\) and \(q\) need not be equal. Use the expected value to set up a second equation.` },
      { value: round((E100 - 3 * b) / 100, 4), why: R`That is \(p + 2q\). Combine it with \(p + q = ${P(S)}\) to find \(p\).` },
      round(p / 100 + 0.1, 2),
    ],
    solution: [
      R`The probabilities add up to 1: \(${P(a)} + p + q + ${P(b)} = 1\), so \(p + q = ${P(S)}\).`,
      R`The expected value: \(0 \cdot ${P(a)} + 1 \cdot p + 2 \cdot q + 3 \cdot ${P(b)} = ${num(E)}\), so \(p + 2q = ${P(E100 - 3 * b)}\).`,
      R`Subtract the first equation from the second: \(q = ${P(E100 - 3 * b)} - ${P(S)} = ${P(qq)}\).`,
      R`Then \(p = ${P(S)} - ${P(qq)} = ${P(p)}\).`,
    ],
    rule: 1, skill: 'working back from E(X)',
    check: () => (close((a + p + qq + b) / 100, 1) && close((p + 2 * qq + 3 * b) / 100, E) ? true : 'p and q do not satisfy both equations'),
  });
}

function challengeFairMethod(rng) {
  const k = rng.int(3, 6);
  const names = people(rng, k);
  const m = rng.int(2, 6);
  const r = rng.int(1, k - 1);
  const N = k * m + r;
  // Each method: its description and the chance each person is chosen.
  const fair = rng.pick(k < 6 ? ['rng', 'die', 'slips'] : ['rng', 'slips']);
  const fairText = {
    rng: `Generate a random whole number from 1 to ${k * m}. ${names[0]} gets 1 to ${m}, ${names[1]} gets ${m + 1} to ${2 * m}, and so on, ${m} numbers each.`,
    die: `Roll a fair die. A roll from 1 to ${k} picks the person with that number in an agreed list; any other roll is rolled again.`,
    slips: `Write each name on an identical slip, mix the ${k} slips in a bag, and draw one without looking.`,
  }[fair];
  const fairProbs = Array(k).fill(frac(1, k));
  // Unfair 1: numbers 1 to N in blocks of m, with the leftover numbers going to the last person.
  const blockProbs = names.map((_, i) => frac(i === k - 1 ? m + r : m, N));
  // Unfair 2: the sum of two dice, the 11 sums 2–12 split into k blocks as evenly as possible.
  const sizes = names.map((_, i) => Math.floor(11 / k) + (i < 11 % k ? 1 : 0));
  const ways = (s) => 6 - Math.abs(s - 7);
  let start = 2;
  const sumProbs = sizes.map((sz) => {
    const w = sum(range(start, start + sz - 1).map(ways));
    start += sz;
    return frac(w, 36);
  });
  // Unfair 3: everyone rolls a die, highest wins, ties go to the first person. Exact chances by listing all rolls.
  const tieProbs = (() => {
    const wins = Array(k).fill(0);
    let total = 0;
    const roll = (i, rolls) => {
      if (i === k) {
        total++;
        const hi = Math.max(...rolls);
        const top = rolls.map((v, j) => (v === hi ? j : -1)).filter((j) => j >= 0);
        wins[top.length > 1 ? 0 : top[0]]++;
        return;
      }
      for (let v = 1; v <= 6; v++) roll(i + 1, [...rolls, v]);
    };
    roll(0, []);
    return wins.map((w) => frac(w, total));
  })();
  const unequal = (ps) => ps.some((p) => !p.eq(ps[0]));
  return q({
    prompt: `${joinList(names)} need to choose one of them at random to go first. Which method gives each of the ${k} people the same chance?`,
    correct: fairText,
    wrong: [
      { value: `Generate a random whole number from 1 to ${N}. ${names[0]} gets 1 to ${m}, ${names[1]} gets ${m + 1} to ${2 * m}, and so on, with ${names[k - 1]} getting ${(k - 1) * m + 1} to ${N}.`, why: `${names[k - 1]} gets ${m + r} of the ${N} numbers and everyone else gets ${m}, so ${names[k - 1]} has a better chance.` },
      { value: `Roll two fair dice and add them. The sums from 2 to 12 are shared out in order, about ${Math.round(11 / k)} sums per person.`, why: R`The sums of two dice are not equally likely: a 7 can happen 6 ways out of 36, but a 2 only 1 way. The chances come out as ${sumProbs.map((p) => M(p.tex())).join(', ')}.` },
      { value: `Each person rolls a die, the highest roll wins, and any tie goes to ${names[0]}.`, why: `Every tie at the top goes to ${names[0]}, so ${names[0]} wins about ${txt(round(100 * tieProbs[0].value, 1))}% of the time instead of ${txt(round(100 / k, 1))}%.` },
    ],
    solution: [
      R`A method is fair when every person has probability \(${fracTex(1, k)}\) of being chosen.`,
      fair === 'rng' ? `Each person gets ${m} of the ${k * m} equally likely numbers: probability ${M(`${fracTex(m, k * m)} = ${fracTex(1, k)}`)}.` : fair === 'die' ? `Rerolling the other numbers leaves ${k} equally likely results, one per person.` : `The ${k} identical slips are equally likely to be drawn.`,
      `The other methods favour someone: a leftover block of numbers, the uneven sums of two dice, or a tie rule.`,
    ],
    rule: 3, skill: 'fair decisions',
    check: () => (sum(fairProbs.map(val)) > 0.999 && !unequal(fairProbs) && unequal(blockProbs) && unequal(sumProbs) && unequal(tieProbs)
      && close(sum(sumProbs.map(val)), 1) && close(sum(tieProbs.map(val)), 1) ? true : 'a method labelled unfair gives equal chances'),
  });
}

// ───────────── Models ─────────────

function gameModel({ cost, prize, win, sections }) {
  if (win >= sections) return { error: 'At least one section must pay nothing. Make the winning sections fewer than the total.' };
  const p = win / sections;
  const E = p * prize - cost;
  const Er = round(E, 2);
  const exact = close(E * 100, Math.round(E * 100));
  const fairPrize = cost / p;
  const fr = round(fairPrize, 2);
  return {
    problem: `A spinner at a school fair has ${plural(sections, 'equal section')}, and ${win === 1 ? '1 of them wins' : `${win} of them win`} a prize of ${money(prize)}. It costs ${money(cost)} to play, and the fee is not returned. What is the expected value of the game for a player, and is it fair?`,
    steps: [
      R`\(P(\text{win}) = ${fracTex(win, sections)}\) and \(P(\text{lose}) = ${fracTex(sections - win, sections)}\).`,
      R`Net result: a win gives \(${prize} - ${cost} = ${prize - cost}\) dollars and a loss gives \(-${cost}\) dollars.`,
      R`\(E = ${prize - cost < 0 ? `(${prize - cost})` : prize - cost} \cdot ${fracTex(win, sections)} + (-${cost}) \cdot ${fracTex(sections - win, sections)} ${exact ? '=' : '\\approx'} ${num(Er)}\) dollars${exact ? '' : ' (rounded to the nearest cent)'}.`,
      Er === 0 && exact ? 'The expected value is 0, so the game is fair.' : `The game is not fair. A fair game would need a prize of ${money(fr)}${close(fairPrize, fr) ? '' : ' (rounded)'}, since ${M(`${fracTex(win, sections)} \\cdot \\text{prize} = ${cost}`)}.`,
    ],
    answer: `${exact ? '' : 'About '}${money(Er)} per play. ${Er === 0 && exact ? 'The game is fair.' : `${Er < 0 ? 'Players lose' : 'Players gain'} on average, so the game is not fair.`}`,
    visual: {
      type: 'barChart', yLabel: 'P(x)', xLabel: 'Net winnings x',
      bars: [{ label: money(prize - cost), value: round(p, 3) }, { label: money(-cost), value: round(1 - p, 3) }],
      alt: `Probability distribution of the net winnings: ${money(prize - cost)} with probability ${txt(round(p, 3))} and ${money(-cost)} with probability ${txt(round(1 - p, 3))}.`,
    },
  };
}

function distModel({ x1, x2, x3, p1, p2 }) {
  if (new Set([x1, x2, x3]).size < 3) return { error: 'Use three different values for X.' };
  const p3 = 100 - p1 - p2;
  if (p3 < 0) return { error: `The first two probabilities add up to ${p1 + p2}%, which is more than 100%. Make them smaller.` };
  const xs = [x1, x2, x3];
  const cs = [p1, p2, p3];
  const E = evOf(xs, cs);
  return {
    problem: R`A random variable \(X\) takes the values ${joinList(xs.map((x) => M(num(x))))} with probabilities \(${P(p1)}\), \(${P(p2)}\) and the rest. Find the missing probability and \(E(X)\).`,
    steps: [
      R`The probabilities add up to 1: \(P(${num(x3)}) = 1 - ${P(p1)} - ${P(p2)} = ${P(p3)}\).`,
      R`\(E(X) = ${sumTex(xs, cs)}\).`,
      R`\(E(X) = ${addTex(xs.map((x, i) => round((x * cs[i]) / 100, 4)))} = ${num(E)}\).`,
      `In a long run of trials, the average value of ${M('X')} gets close to ${num(E)}.`,
    ],
    answer: R`\(P(${num(x3)}) = ${P(p3)}\) and \(E(X) = ${num(E)}\).`,
    visual: [
      distTable(xs, cs.map((c) => c / 100), 'Probability distribution'),
      { type: 'barChart', yLabel: 'P(x)', xLabel: 'x', bars: xs.map((x, i) => ({ label: txt(x), value: cs[i] / 100 })), alt: `Bar chart of the distribution: ${xs.map((x, i) => `P(${txt(x)}) = ${txt(cs[i] / 100)}`).join(', ')}.` },
    ],
  };
}

export default {
  id: 'expected-value',
  title: 'Expected Value & Probability Decisions',
  summary: 'Build probability distributions, find expected values from theory and data, and use them to judge games and make decisions.',
  standards: ['CCSS S-CP.B.8', 'CCSS S-MD.A.1', 'CCSS S-MD.A.2', 'CCSS S-MD.A.3', 'CCSS S-MD.A.4', 'CCSS S-MD.B.5', 'CCSS S-MD.B.6', 'CCSS S-MD.B.7'],

  explain: {
    intro: 'A random variable gives a number to each outcome of a chance process: the number of heads, the prize won, the cost of a repair. Its probability distribution lists the values and how likely each one is. The expected value is the long-run average of the variable, and comparing expected values is a way to judge games, prices and choices made under uncertainty.',
    rules: [
      {
        title: 'Probability distributions',
        text: R`A probability distribution lists each value \(x\) of a random variable \(X\) with its probability \(P(x)\). Every probability is between 0 and 1, and together they add up to exactly 1, so a single missing probability is 1 minus the rest.`,
        example: R`If \(P(0) = 0.2\), \(P(1) = 0.5\) and \(P(2) = 0.1\), then \(P(3) = 1 - 0.8 = 0.2\).`,
      },
      {
        title: 'Expected value',
        text: R`\(E(X) = \sum x \cdot P(x)\): multiply each value by its probability and add. It is the average you would get over many trials, and it need not be a possible value. For equally likely outcomes it is just the mean of the outcomes.`,
        example: R`A fair die: \(E = \frac{1 + 2 + 3 + 4 + 5 + 6}{6} = 3.5\), although no roll is 3.5.`,
      },
      {
        title: 'Expected value from data',
        text: R`When the probabilities are not known, estimate them from data: the relative frequency \(\frac{\text{count}}{\text{total}}\) estimates each probability. The expected value estimated this way equals the mean of the data.`,
        example: R`In 20 games a team scored 0 goals 4 times, 1 goal 10 times and 2 goals 6 times: \(E \approx \frac{0 \cdot 4 + 1 \cdot 10 + 2 \cdot 6}{20} = 1.1\) goals.`,
      },
      {
        title: 'Expected winnings and fairness',
        text: R`For a game, use the net winnings: what you receive minus what you paid. A game is fair when the expected net winnings are 0. A decision method is fair when every person has the same probability of being chosen.`,
        example: R`Pay \$2; a die roll of 6 pays \$9. \(E = 9 \cdot \frac{1}{6} - 2 = -0.5\): the player loses \$0.50 per play on average, so the game is not fair.`,
      },
      {
        title: 'Comparing choices',
        text: 'To choose between options with uncertain results (insurance, a warranty, guessing on a test), find the expected value of each option and compare. The better choice in the long run has the higher expected gain or the lower expected cost.',
        example: R`A \$60 warranty against a 10% chance of a \$400 repair: the expected cost without it is \(0.1 \cdot 400 = 40\) dollars, so skipping it saves \$20 on average.`,
      },
      {
        title: 'The general multiplication rule',
        text: R`\(P(A \text{ and } B) = P(A) \cdot P(B \mid A)\). The second factor is the probability of \(B\) once \(A\) has happened. Without replacement it changes after each draw; with replacement, or for independent events, \(P(B \mid A) = P(B)\). For three events, keep multiplying: \(P(A) \cdot P(B \mid A) \cdot P(C \mid A \text{ and } B)\).`,
        example: R`From 10 batteries with 7 good, three good without replacement: \(\frac{7}{10} \cdot \frac{6}{9} \cdot \frac{5}{8} = \frac{7}{24}\).`,
      },
    ],
    vocab: [
      { term: 'random variable', def: 'A variable whose value is a number decided by the outcome of a chance process.' },
      { term: 'probability distribution', def: 'A table, graph or rule giving the probability of each value of a random variable.' },
      { term: 'expected value', def: R`The long-run average of a random variable, \(E(X) = \sum x \cdot P(x)\).` },
      { term: 'fair game', def: 'A game whose expected net winnings are 0.' },
      { term: 'relative frequency', def: 'The fraction of the observations that had a given result; an estimate of its probability.' },
    ],
    mistakes: [
      'Averaging the values without weighting them. A value that is more likely must count more.',
      'Forgetting the cost to play. Expected winnings use the net amount, and the fee is paid on every play, win or lose.',
      'Expecting the expected value to happen on one trial. It is a long-run average; one play can turn out very differently.',
      R`Using the same fraction for every draw without replacement. After each draw the total goes down by 1, and so may the count of the kind just taken.`,
    ],
    visual: {
      type: 'barChart', xLabel: 'Number of heads in 3 coin flips', yLabel: 'P(x)',
      bars: [{ label: '0', value: 0.125 }, { label: '1', value: 0.375 }, { label: '2', value: 0.375 }, { label: '3', value: 0.125 }],
      alt: 'Probability distribution of the number of heads in 3 fair coin flips: P(0) = 0.125, P(1) = 0.375, P(2) = 0.375, P(3) = 0.125. The expected value is 1.5.',
    },
  },

  examples: [
    {
      title: 'A missing probability and the expected value',
      problem: R`\(X\) is the number of pets in a randomly chosen home on a street. Find the missing probability and \(E(X)\).`,
      visual: distTable([0, 1, 2, 3], [0.3, 0.4, null, 0.1], 'Probability distribution'),
      steps: [
        R`The probabilities add up to 1: \(P(2) = 1 - (0.3 + 0.4 + 0.1) = 0.2\).`,
        R`\(E(X) = 0(0.3) + 1(0.4) + 2(0.2) + 3(0.1) = 0 + 0.4 + 0.4 + 0.3 = 1.1\).`,
        'Over many homes on the street, the average is about 1.1 pets per home.',
      ],
      answer: R`\(P(2) = 0.2\), \(E(X) = 1.1\)`,
    },
    {
      title: 'Word problem: is the game fair?',
      word: true,
      problem: 'A game costs $3 to play, and the fee is not returned. A fair die is rolled: a 6 pays $10, a 5 pays $5, and anything else pays nothing. Find the expected net winnings. Is the game fair?',
      steps: [
        R`Expected prize: \(10 \cdot \frac{1}{6} + 5 \cdot \frac{1}{6} = \frac{15}{6} = 2.5\) dollars.`,
        R`Subtract the fee: \(2.5 - 3 = -0.5\).`,
        'The player loses $0.50 per play on average, so the game is not fair. The fair fee would be $2.50.',
      ],
      answer: '−$0.50 per play; not fair',
    },
    {
      title: 'Word problem: buy the warranty?',
      word: true,
      problem: 'A $50 warranty covers a tablet for 2 years. Without it there is a 0.15 chance of a $120 repair and a 0.05 chance of a $400 replacement. Based on expected cost, should the buyer get the warranty?',
      steps: [
        R`Expected cost without the warranty: \(0.15 \cdot 120 + 0.05 \cdot 400 = 18 + 20 = 38\) dollars.`,
        'The warranty costs $50 for certain.',
        'Skipping the warranty costs $12 less on average. (A buyer who could not afford a $400 surprise might still choose the warranty.)',
      ],
      answer: 'Skip it: expected cost $38 against $50',
    },
    {
      title: 'The multiplication rule with and without replacement',
      problem: 'A box holds 10 batteries, and 7 of them are good. Two are taken at random. Find the probability that both are good (a) if the first is put back, and (b) if it is not.',
      steps: [
        R`(a) With replacement the draws are independent: \(\frac{7}{10} \cdot \frac{7}{10} = \frac{49}{100}\).`,
        R`(b) Without replacement, after one good battery is taken 6 of the 9 left are good: \(P(\text{good, good}) = \frac{7}{10} \cdot \frac{6}{9} = \frac{42}{90} = \frac{7}{15}\).`,
      ],
      answer: R`(a) \(\frac{49}{100}\)  (b) \(\frac{7}{15}\)`,
    },
  ],

  models: [
    {
      id: 'spinner-game',
      title: 'Word problem: a spinner game at a fair',
      word: true,
      intro: 'Set the fee, the prize and the spinner. See the expected net winnings and the prize that would make the game fair.',
      inputs: [
        { name: 'cost', label: 'Cost to play ($)', type: 'int', min: 1, max: 20, value: 2 },
        { name: 'prize', label: 'Prize ($)', type: 'int', min: 1, max: 200, value: 10 },
        { name: 'win', label: 'Winning sections', type: 'int', min: 1, max: 19, value: 1 },
        { name: 'sections', label: 'Total sections', type: 'int', min: 2, max: 20, value: 8 },
      ],
      compute: gameModel,
    },
    {
      id: 'distribution',
      title: 'A probability distribution and its expected value',
      intro: 'Choose three values and two of their probabilities (in percent). The third probability is whatever is left.',
      inputs: [
        { name: 'x1', label: 'First value', type: 'int', min: -20, max: 50, value: 0 },
        { name: 'x2', label: 'Second value', type: 'int', min: -20, max: 50, value: 1 },
        { name: 'x3', label: 'Third value', type: 'int', min: -20, max: 50, value: 5 },
        { name: 'p1', label: 'P(first value), %', type: 'int', min: 0, max: 100, value: 50 },
        { name: 'p2', label: 'P(second value), %', type: 'int', min: 0, max: 100, value: 30 },
      ],
      compute: distModel,
    },
  ],

  quiz: {
    easy: [easyMissingProb, easyExpectedTable, easySpinner],
    medium: [mediumGame, mediumEmpirical, mediumMultRule],
    hard: [hardDecision, hardGuessing, hardThreeDraws],
    challenge: [challengeFairPrice, challengeMissingFromMean, challengeFairMethod],
  },
};
