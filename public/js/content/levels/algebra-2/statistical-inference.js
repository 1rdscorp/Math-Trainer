import { R, q, num, txt, round, sum, ordinal, person, plural } from '../../lib/index.js';
import { M } from './_shared.js';

// ───────────── Helpers ─────────────

const pct = (v) => M(`${num(v)}\\%`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const at = (s) => `${s.prep ?? 'in'} ${s.where}`; // "in a city", "of a phone company"
const atThe = (s) => at(s).replace(/ an? /, ' the '); // later mentions: "in the city"

// A small seeded generator for the models and the fixed examples (topic files may not use Math.random).
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How many successes in n trials, each with probability p.
const binom = (rand, n, p) => {
  let k = 0;
  for (let i = 0; i < n; i++) if (rand() < p) k++;
  return k;
};
// 100 simulated sample percents (n is 20, 25 or 50, so each percent is a whole number).
const simPercents = (rand, n, p0) => Array.from({ length: 100 }, () => (100 * binom(rand, n, p0 / 100)) / n);

// Counts of each value, smallest first: [[value, count], …].
const tally = (values) => [...values.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map())].sort((a, b) => a[0] - b[0]);
const dotAlt = (what, values, show = (v) => txt(v)) => `Dot plot of ${values.length} ${what}. The number of dots at each value: ${tally(values).map(([v, c]) => `${show(v)}: ${c}`).join('; ')}.`;
// How many values are at least as extreme as `obs` in the direction `up` (true: obs or more).
const atLeast = (values, obs, up) => values.filter((v) => (up ? v >= obs - 1e-9 : v <= obs + 1e-9)).length;

function simPlot(values, obs, step, label, what, show) {
  return { type: 'dotPlot', values, min: Math.min(...values, obs), max: Math.max(...values, obs), step, label, alt: dotAlt(what, values, show) };
}

// ───────────── Easy ─────────────

const POPS = [
  { many: 'voters', where: 'a city', N: [20000, 90000], n: [400, 1200], rel: 'who', trait: 'support building a new park' },
  { many: 'students', where: 'a high school', N: [1200, 2400], n: [80, 200], rel: 'who', trait: 'have a part-time job' },
  { many: 'households', where: 'a county', N: [30000, 80000], n: [300, 900], rel: 'that', trait: 'own a dog' },
  { many: 'light bulbs', where: 'a large shipment', N: [10000, 40000], n: [100, 400], rel: 'that', trait: 'are faulty', lo: 2, hi: 9 },
  { many: 'customers', where: 'a phone company', prep: 'of', N: [50000, 200000], n: [500, 1500], rel: 'who', trait: 'are happy with their service' },
  { many: 'trees', where: 'a state forest', N: [100000, 500000], n: [200, 600], rel: 'that', trait: 'show signs of disease', lo: 5, hi: 30 },
];

function easyPopulation(rng) {
  const s = rng.pick(POPS);
  const name = person(rng);
  const N = 100 * rng.int(s.N[0] / 100, s.N[1] / 100);
  const n = 10 * rng.int(s.n[0] / 10, s.n[1] / 10);
  const p = rng.int(s.lo ?? 12, s.hi ?? 78);
  const ch = {
    population: `All ${txt(N)} ${s.many} ${atThe(s)}`,
    sample: `The ${n} ${s.many} that ${name} chose`,
    parameter: `The percent of all ${txt(N)} ${s.many} ${s.rel} ${s.trait}`,
    statistic: `${p}%, the percent of the ${n} chosen ${s.many} ${s.rel} ${s.trait}`,
  };
  const why = {
    population: 'That is the population: the whole group the question is about.',
    sample: 'That is the sample: the part of the population that was actually studied.',
    parameter: 'That is the parameter: a number that describes the whole population. It is usually unknown.',
    statistic: 'That is a statistic: a number computed from the sample.',
  };
  const ask = rng.pick(Object.keys(ch));
  const question = { population: 'What is the population?', sample: 'What is the sample?', parameter: 'Which is the parameter?', statistic: 'Which is the statistic?' }[ask];
  return q({
    prompt: `${name} wants to know what percent of the ${txt(N)} ${s.many} ${at(s)} ${s.trait}. ${name} chooses ${n} of them at random and finds that ${p}% of those ${n} ${s.trait}. ${question}`,
    correct: ch[ask],
    wrong: Object.keys(ch).filter((k) => k !== ask).map((k) => ({ value: ch[k], why: why[k] })),
    solution: [
      `The population is everything the question is about: all ${txt(N)} ${s.many}. The sample is the ${n} that were studied.`,
      `A parameter describes the population (the unknown percent of all ${txt(N)}). A statistic describes the sample (the ${p}% found in the ${n}).`,
      `So the answer is: ${ch[ask]}.`,
    ],
    rule: 0, skill: 'population and sample',
    check: () => (n < N && ch.statistic.startsWith(`${p}%`) && ch.parameter.includes(txt(N)) ? true : 'the sample must be smaller than the population'),
  });
}

const METHOD = {
  srs: 'Simple random sample', strat: 'Stratified random sample', cluster: 'Cluster sample',
  sys: 'Systematic sample', conv: 'Convenience sample', vol: 'Voluntary response sample',
};
const METHOD_DEF = {
  srs: 'A simple random sample draws the whole sample at random from a list of the entire population, so every group of that size has the same chance.',
  strat: 'A stratified sample splits the population into groups and chooses at random from every group.',
  cluster: 'A cluster sample chooses a few whole groups at random and uses every member of those groups.',
  sys: 'A systematic sample takes every kth member of a list, after a random start.',
  conv: 'A convenience sample uses whoever is easiest to reach.',
  vol: 'A voluntary response sample is made of the people who choose to reply.',
};
const RANDOM_METHODS = ['srs', 'strat', 'cluster', 'sys'];

const FRAMES = [
  (rng) => {
    const [n, N, H, k] = [20 * rng.int(4, 8), 100 * rng.int(12, 24), rng.int(40, 60), rng.int(3, 5)];
    const step = Math.floor(N / n);
    return {
      goal: 'how many hours the students at a high school sleep on a school night',
      srs: `Number all ${txt(N)} students and use a random number generator to choose ${n} different numbers.`,
      strat: `Split the students by grade (9, 10, 11 and 12) and choose ${n / 4} students at random from each grade.`,
      cluster: `Choose ${k} of the school's ${H} homerooms at random and survey every student in those homerooms.`,
      sys: `List all ${txt(N)} students in alphabetical order, choose a random starting point among the first ${step}, and then take every ${ordinal(step)} student on the list.`,
      conv: `Survey the first ${n} students who walk into the cafeteria at lunch.`,
      vol: 'Post the survey on the school website and use every reply that comes in.',
    };
  },
  (rng) => {
    const [n, N, Z, B, k] = [100 * rng.int(3, 8), 1000 * rng.int(20, 60), rng.pick([4, 5]), rng.int(300, 900), rng.int(10, 20)];
    const step = Math.floor(N / n);
    return {
      goal: 'what the households in a city think about a new recycling plan',
      srs: `Use a computer to choose ${n} households at random from a complete list of all ${txt(N)} households in the city.`,
      strat: `Split the city into its ${Z} districts and choose ${n / Z} households at random from each district.`,
      cluster: `Choose ${k} of the city's ${B} blocks at random and survey every household on those blocks.`,
      sys: `Take a list of all ${txt(N)} households in street order, choose a random starting point among the first ${step}, and then survey every ${ordinal(step)} household.`,
      conv: `Survey the first ${n} people who walk past a table set up outside the biggest supermarket.`,
      vol: 'Print a reply form in the local newspaper and use every form that is mailed back.',
    };
  },
  (rng) => {
    const [n, N, Mach, bx, k] = [50 * rng.int(2, 8), 1000 * rng.int(10, 40), rng.pick([2, 5, 10]), rng.pick([20, 25, 50]), rng.int(4, 10)];
    const step = Math.floor(N / n);
    return {
      goal: 'what share of the phone chargers made at a factory this week are faulty',
      srs: `Number all ${txt(N)} chargers and use a random number generator to choose ${n} of them to test.`,
      strat: `Split the chargers by the machine that made them (there are ${Mach} machines) and test ${n / Mach} chargers chosen at random from each machine.`,
      cluster: `The chargers are packed in boxes of ${bx}. Choose ${k} boxes at random and test every charger in those boxes.`,
      sys: `As the chargers come off the line, choose a random starting charger among the first ${step} and then test every ${ordinal(step)} charger.`,
      conv: `Test the ${n} chargers at the top of the bin nearest the inspector's desk.`,
      vol: null,
    };
  },
];

function easySamplingMethod(rng) {
  const f = rng.pick(FRAMES)(rng);
  const methods = Object.keys(METHOD).filter((k) => f[k]);
  if (rng.bool(0.3)) {
    // Which plan is biased? Three random methods and one that is not random.
    const bad = rng.pick(['conv', 'vol'].filter((k) => f[k]));
    const good = rng.sample(RANDOM_METHODS, 3);
    return q({
      prompt: `A researcher wants to find out ${f.goal}. Which plan is most likely to give a biased sample?`,
      correct: f[bad],
      wrong: good.map((k) => ({ value: f[k], why: `This is a ${METHOD[k].toLowerCase()}. Chance decides who is chosen, so it is not expected to favour any part of the population.` })),
      solution: [
        'A sample is biased when the way it is chosen favours some part of the population.',
        `Three of the plans let chance decide who is chosen (${good.map((k) => METHOD[k].toLowerCase()).join(', ')}).`,
        `The remaining plan is a ${METHOD[bad].toLowerCase()}. ${METHOD_DEF[bad]} Those members may differ from the rest, so it is likely to be biased.`,
      ],
      rule: 1, skill: 'sampling methods',
      check: () => (!RANDOM_METHODS.includes(bad) && good.every((k) => RANDOM_METHODS.includes(k)) ? true : 'exactly one plan should be non-random'),
    });
  }
  const pick = rng.pick(methods);
  const others = rng.sample(methods.filter((k) => k !== pick), 3);
  return q({
    prompt: `A researcher wants to find out ${f.goal}. The plan is: “${f[pick]}” What kind of sample is this?`,
    correct: METHOD[pick],
    wrong: others.map((k) => ({ value: METHOD[k], why: `${METHOD_DEF[k]} That is not how this plan chooses.` })),
    solution: [METHOD_DEF[pick], `That matches the plan, so it is a ${METHOD[pick].toLowerCase()}.`],
    rule: 1, skill: 'sampling methods',
    check: () => (methods.includes(pick) && !others.includes(pick) ? true : 'the method was offered twice'),
  });
}

const STUDY_TYPES = { survey: 'Sample survey', obs: 'Observational study', exp: 'Randomised experiment', census: 'Census' };
const STUDY_KEY = {
  survey: 'A sample of people is asked questions to learn about a whole population. Nothing is done to them and no groups are compared, so it is a sample survey.',
  obs: 'The groups already existed: the researchers only recorded what happened. Nobody assigned the treatment, so it is an observational study.',
  exp: 'The researchers decided at random who got each treatment. That makes it a randomised experiment.',
  census: 'Data were collected from every member of the population, not from a sample. That is a census.',
};
const STUDIES = {
  survey: [
    (n) => `A polling group calls ${n} randomly chosen adults in a state and asks whether they would use a new train line.`,
    (n) => `A school chooses ${n} students at random and asks each one how many hours of homework they did last night.`,
    (n) => `A city sends a questionnaire to ${n} randomly chosen households, asking how satisfied they are with rubbish collection.`,
  ],
  obs: [
    (n) => `Researchers look at the medical records of ${n} adults, compare those who already drink coffee every day with those who do not, and record how many in each group have high blood pressure.`,
    (n) => `A teacher compares the grades of the ${n} students who chose to join a sports team with the grades of the students who did not.`,
    (n) => `A biologist counts the birds that visit ${n} gardens, comparing gardens that already have tall trees with gardens that do not.`,
  ],
  exp: [
    (n) => `A researcher uses a coin toss to assign each of ${n} volunteers to drink either a new sports drink or water before a run, then compares their running times.`,
    (n) => `A farmer splits a field into ${n} plots and uses a random draw to choose which plots get a new fertiliser, then compares the harvest from the two kinds of plot.`,
    (n) => `A teacher randomly assigns ${n} students to study for a test with either flash cards or practice quizzes, then compares their scores.`,
  ],
  census: [
    (n) => `A school records the travel time to school of every one of its ${txt(n * 10)} students.`,
    (n) => `A town counts the people living in each of its ${txt(n * 10)} homes, visiting every single home.`,
    (n) => `A shop owner checks the expiry date on every one of the ${txt(n * 10)} cartons of milk in the shop.`,
  ],
};

function easyStudyType(rng) {
  const kind = rng.pick(Object.keys(STUDY_TYPES));
  const n = 2 * rng.int(20, 150);
  return q({
    prompt: `${rng.pick(STUDIES[kind])(n)} What kind of study is this?`,
    correct: STUDY_TYPES[kind],
    wrong: Object.keys(STUDY_TYPES).filter((k) => k !== kind).map((k) => ({ value: STUDY_TYPES[k], why: STUDY_KEY[kind] })),
    solution: [
      'Ask: was every member of the population measured? Were people only asked questions? Were existing groups compared? Or did the researcher assign treatments at random?',
      STUDY_KEY[kind],
    ],
    rule: 3, skill: 'types of study',
    check: () => (STUDIES[kind].length === 3 ? true : 'missing study'),
  });
}

const SQUARES = [[100, 10], [400, 5], [625, 4], [1600, 2.5], [2500, 2], [6400, 1.25], [10000, 1]];

function easyMargin(rng) {
  const [n, E] = rng.pick(SQUARES);
  const s = rng.pick(POPS.filter((x) => !x.lo));
  const p = rng.int(25, 75);
  return q({
    prompt: R`A random sample of ${txt(n)} ${s.many} ${at(s)} finds that ${p}% ${s.trait}. Use the rule that the 95% margin of error is about \(\dfrac{1}{\sqrt{n}}\). What is the margin of error?`,
    correct: E,
    fmt: pct,
    wrong: [
      { value: 100 / n, why: R`Divide by \(\sqrt{n}\), not by \(n\): \(\sqrt{${n}} = ${Math.sqrt(n)}\).` },
      { value: round(1 / Math.sqrt(n), 4), why: R`\(\frac{1}{${Math.sqrt(n)}} = ${num(1 / Math.sqrt(n))}\) is a proportion. As a percent it is \(${num(E)}\%\).` },
      { value: 2 * E, why: R`The rule is \(\frac{1}{\sqrt{n}}\), not \(\frac{2}{\sqrt{n}}\).` },
      E / 2,
    ],
    solution: [
      R`\(\sqrt{${n}} = ${Math.sqrt(n)}\), so \(E \approx \dfrac{1}{${Math.sqrt(n)}} = ${num(E / 100)}\).`,
      R`As a percent: \(E \approx ${num(E)}\%\). The sample percent is not needed for this rule.`,
    ],
    rule: 4, skill: 'margin of error',
    check: () => (Math.abs(E * E * n - 10000) < 1e-6 ? true : 'E² · n should be 1 (in proportions)'),
  });
}

// ───────────── Medium ─────────────

const ISSUES = [
  { org: 'The student council', pop: 'the students at a school', issue: 'a later start time for school', fair: 'Do you support or oppose starting the school day 45 minutes later?', leading: 'Since tired students learn less, do you agree that the school day should start later?', spot: 'in the early-morning study hall', open: 'posts the question on the school\'s social media page and counts every reply', N: 1800 },
  { org: 'A city council', pop: 'the adults in a city', issue: 'a new skate park', fair: 'Should the city build a skate park next to the river, or not?', leading: 'Should the city waste money on a noisy skate park by the river?', spot: 'at the old skate ramp', open: 'invites people to vote on its website and counts every vote', N: 60000 },
  { org: 'A town newspaper', pop: 'the voters in a town', issue: 'a tax to repair roads', fair: 'Do you favour or oppose a 1% sales tax to pay for road repairs?', leading: 'Do you favour fixing our dangerous, crumbling roads with a small 1% sales tax?', spot: 'at a car repair shop', open: 'asks readers to text in their answer and counts every text', N: 20000 },
  { org: 'The cafeteria manager', pop: 'the students at a school', issue: 'adding a salad bar', fair: 'Would you use a salad bar in the cafeteria if one were added?', leading: 'Wouldn\'t you like a fresh, healthy salad bar instead of greasy lunches?', spot: 'in the line for pizza', open: 'leaves reply cards on the lunch tables and counts every card that is filled in', N: 1500 },
];
const BIAS = { vol: 'Voluntary response bias', non: 'Nonresponse bias', word: 'Biased question wording', conv: 'Convenience sampling' };
const BIAS_WHY = {
  vol: 'The people in the sample chose themselves by replying. People with strong opinions are the most likely to reply.',
  non: 'The sample was chosen at random, but most of the people chosen did not answer. Those who answer may differ from those who do not.',
  word: 'The sample was random and almost everyone answered, but the question pushes people toward one answer.',
  conv: 'The researcher asked whoever was easy to reach in one place. People in that place may think differently from the rest.',
};

function mediumBiasSource(rng) {
  const s = rng.pick(ISSUES);
  const flaw = rng.pick(Object.keys(BIAS));
  const n = 50 * rng.int(4, 16);
  const k = Math.round(n * rng.int(8, 25) / 100);
  const most = n - rng.int(0, Math.floor(n / 40));
  const text = {
    vol: `${s.org} wants to know what ${s.pop} think about ${s.issue}. It ${s.open}, asking “${s.fair}” In all, ${txt(n)} people reply.`,
    non: `${s.org} wants to know what ${s.pop} think about ${s.issue}. It chooses ${txt(n)} of them at random and asks “${s.fair}” Only ${k} of the ${txt(n)} answer; the rest cannot be reached or refuse.`,
    word: `${s.org} wants to know what ${s.pop} think about ${s.issue}. It chooses ${txt(n)} of them at random and asks “${s.leading}” In all, ${most} of the ${txt(n)} answer.`,
    conv: `${s.org} wants to know what ${s.pop} think about ${s.issue}. It asks the first ${txt(n)} people it finds ${s.spot}: “${s.fair}” Every one of them answers.`,
  }[flaw];
  return q({
    prompt: `${text} Which problem is most likely to make the results biased?`,
    correct: BIAS[flaw],
    wrong: Object.keys(BIAS).filter((b) => b !== flaw).map((b) => ({ value: BIAS[b], why: `${BIAS_WHY[flaw]}` })),
    solution: [
      'Check each part: how the sample was chosen, how many of those chosen answered, and how the question was worded.',
      BIAS_WHY[flaw],
      `So the problem is: ${BIAS[flaw].toLowerCase()}.`,
    ],
    rule: 2, skill: 'sources of bias',
    check: () => (k < n / 3 && most >= 0.97 * n ? true : 'the response counts do not fit the story'),
  });
}

function mediumMarginInterval(rng) {
  const kind = rng.pick(['build', 'plausible', 'not']);
  const [n, E] = rng.pick(SQUARES.filter(([, e]) => e >= 2 && (kind === 'build' || (Number.isInteger(e) && e <= 5))));
  const s = rng.pick(POPS.filter((x) => !x.lo));
  const p = rng.int(Math.ceil(E) + 10, 90 - Math.ceil(E));
  const iv = (e) => `${pct(p - e)} to ${pct(p + e)}`;
  if (kind === 'build') {
    return q({
      prompt: R`A random sample of ${txt(n)} ${s.many} ${at(s)} finds that ${p}% ${s.trait}. Using the margin of error \(E \approx \dfrac{1}{\sqrt{n}}\), what is the interval of plausible values for the percent of all ${s.many} ${s.rel} ${s.trait}?`,
      correct: iv(E),
      wrong: [
        { value: iv(2 * E), why: R`The margin is \(\frac{1}{\sqrt{${n}}} = ${num(E)}\%\). Go that far on each side, not twice as far.` },
        { value: iv(E / 2), why: R`Each end is a full margin of error, \(${num(E)}\%\), from the sample percent. The interval's total width is \(${num(2 * E)}\%\).` },
        { value: `${pct(p)} to ${pct(p + E)}`, why: 'The margin goes on both sides of the sample percent.' },
        iv(E + 1),
      ],
      solution: [
        R`\(E \approx \dfrac{1}{\sqrt{${n}}} = \dfrac{1}{${Math.sqrt(n)}} = ${num(E / 100)}\), which is \(${num(E)}\%\).`,
        R`Interval: \(${p}\% \pm ${num(E)}\%\), from \(${num(p - E)}\%\) to \(${num(p + E)}\%\).`,
      ],
      rule: 4, skill: 'interval of plausible values',
      check: () => (Math.abs((p + E) - (p - E) - 200 / Math.sqrt(n)) < 1e-9 ? true : 'width should be 2/√n'),
    });
  }
  const e = E;
  const inside = [p - e + 1, p, p + e - 1].filter((v, i, a) => a.indexOf(v) === i);
  const outside = [p - e - rng.int(1, 3), p + e + rng.int(1, 3), p + 2 * e + rng.int(2, 5), p - 2 * e - rng.int(2, 4)];
  const head = `A poll of ${txt(n)} randomly chosen ${s.many} reports that ${p}% ${s.trait}, with a margin of error of ${e} percentage points (${p}% ± ${e}%).`;
  if (kind === 'plausible') {
    const c = rng.pick(inside);
    return q({
      prompt: `${head} Which of these is a plausible value for the percent of all ${s.many} ${atThe(s)} ${s.rel} ${s.trait}?`,
      correct: c,
      fmt: pct,
      wrong: outside.map((v) => ({ value: v, why: R`The plausible values run from \(${p - e}\%\) to \(${p + e}\%\). This value is outside that interval.` })),
      solution: [R`\(${p}\% \pm ${e}\%\) means from \(${p - e}\%\) to \(${p + e}\%\).`, R`Only \(${c}\%\) is inside that interval.`],
      rule: 4, skill: 'interval of plausible values',
      check: () => (Math.abs(c - p) <= e && outside.every((v) => Math.abs(v - p) > e) ? true : 'choice positions are wrong'),
    });
  }
  const bad = rng.pick(outside);
  const ins = [p - e, p + e, rng.pick(inside)];
  return q({
    prompt: `${head} Which of these is NOT a plausible value for the percent of all ${s.many} ${atThe(s)} ${s.rel} ${s.trait}?`,
    correct: bad,
    fmt: pct,
    wrong: [...new Set(ins)].map((v) => ({ value: v, why: R`\(${v}\%\) is inside the interval from \(${p - e}\%\) to \(${p + e}\%\) (the ends count), so it is plausible.` })).concat(inside.map((v) => ({ value: v, why: 'That value is inside the interval, so it is plausible.' }))),
    solution: [R`\(${p}\% \pm ${e}\%\) means from \(${p - e}\%\) to \(${p + e}\%\).`, R`\(${bad}\%\) is outside that interval, so it is not plausible.`],
    rule: 4, skill: 'interval of plausible values',
    check: () => (Math.abs(bad - p) > e ? true : 'the answer is inside the interval'),
  });
}

const CLAIMS = [
  { who: 'A seed company', claim: (p) => `${p}% of its tomato seeds sprout`, take: 'plants', many: 'seeds', trait: 'sprout' },
  { who: 'A phone company', claim: (p) => `${p}% of its customers are happy with their service`, take: 'surveys', many: 'customers', trait: 'are happy with their service' },
  { who: 'A school newspaper', claim: (p) => `${p}% of the students at the school walk or bike to school`, take: 'surveys', many: 'students', trait: 'walk or bike to school' },
  { who: 'A city council', claim: (p) => `${p}% of the city's adults use public transport every week`, take: 'surveys', many: 'adults', trait: 'use public transport every week' },
  { who: 'A shop', claim: (p) => `${p}% of its shoppers use the self-checkout`, take: 'watches', many: 'shoppers', trait: 'use the self-checkout' },
];

// A claim, 100 simulated sample percents, and an observed percent whose count of "at least as extreme" passes ok(count).
function simSetup(rng, ok) {
  for (;;) {
    const s = rng.pick(CLAIMS);
    const n = rng.pick([20, 25, 50, 50]);
    const step = 100 / n;
    const p0 = n === 50 ? rng.pick([30, 40, 50, 60, 70]) : rng.pick([40, 60, 80, n === 25 ? 20 : 50]);
    const values = simPercents(() => rng.next(), n, p0);
    const up = rng.bool(0.5);
    const cands = [];
    for (let j = 1; j <= 15; j++) {
      const obs = p0 + (up ? j : -j) * step;
      if (obs < 0 || obs > 100) break;
      const c = atLeast(values, obs, up);
      if (ok(c)) cands.push({ obs, c });
    }
    if (!cands.length) continue;
    const { obs, c } = rng.pick(cands);
    if ((Math.max(...values, obs) - Math.min(...values, obs)) / step > 40) continue;
    const name = person(rng);
    const k = Math.round((obs * n) / 100);
    const story = `${s.who} claims that ${s.claim(p0)}. ${name} ${s.take} a random sample of ${n} ${s.many} and finds that ${k} of them ${s.trait} (${obs}%). To see what chance alone can do, a computer simulated 100 random samples of ${n} from a population in which the claim is exactly true. The dot plot shows the percent in each simulated sample.`;
    return { s, n, step, p0, values, up, obs, c, k, story, word: up ? 'or more' : 'or less' };
  }
}

function mediumSimCount(rng) {
  const t = simSetup(rng, (c) => c >= 1 && c <= 40);
  const { values, obs, up, c, step } = t;
  const strict = values.filter((v) => (up ? v > obs : v < obs)).length;
  const exact = values.filter((v) => v === obs).length;
  return q({
    prompt: `${t.story} How many of the simulated samples gave ${obs}% ${t.word}?`,
    correct: c,
    wrong: [
      strict !== c ? { value: strict, why: `"${obs}% ${t.word}" includes the samples at exactly ${obs}%. Count those dots too.` } : null,
      { value: 100 - c, why: `That counts the samples on the other side of ${obs}%.` },
      exact !== c ? { value: exact, why: `That counts only the dots at exactly ${obs}%. Add the dots beyond it.` } : null,
      atLeast(values, obs + (up ? step : -step), up),
    ],
    solution: [
      `Find ${obs}% on the dot plot and count the dots at ${obs}% and to the ${up ? 'right' : 'left'} of it.`,
      `${tally(values).filter(([v]) => (up ? v >= obs : v <= obs)).map(([v, k]) => `${v}%: ${k}`).join(', ') || 'No dots'}.`,
      `Total: ${plural(c, 'simulated sample')}.`,
    ],
    rule: 5, skill: 'reading a simulation',
    visual: simPlot(values, obs, step, 'Percent in each simulated sample', 'simulated sample percents', (v) => `${v}%`),
    check: () => (sum(tally(values).filter(([v]) => (up ? v >= obs : v <= obs)).map(([, k]) => k)) === c ? true : 'recount from the tally differs'),
  });
}

const TRIALS = [
  { thing: 'pain-relief pill', aim: 'eases headaches', fake: 'a sugar pill that looks the same', short: 'a sugar pill', judge: 'nurses who record the volunteers\' pain', who: 'nurses' },
  { thing: 'skin cream', aim: 'clears up a rash', fake: 'a plain cream that looks and smells the same', short: 'a plain cream', judge: 'doctors who rate the rash', who: 'doctors' },
  { thing: 'allergy spray', aim: 'reduces sneezing', fake: 'a salt-water spray in the same bottle', short: 'a salt-water spray', judge: 'nurses who count the sneezes', who: 'nurses' },
  { thing: 'sleep supplement', aim: 'helps people fall asleep faster', fake: 'a tablet with no active ingredient', short: 'a dummy tablet', judge: 'technicians who score the sleep recordings', who: 'technicians' },
];
const ROLE = {
  random: { ask: 'Why were the volunteers assigned to the two groups at random?', ans: 'So that other differences between the volunteers, such as age or health, tend to even out between the groups' },
  control: { ask: (t) => `Why does the study include a second group, instead of giving the ${t.thing} to every volunteer?`, ans: 'So there is a baseline: without it, nobody could tell whether changes came from the treatment or would have happened anyway' },
  placebo: { ask: (t) => `Why does the second group get ${t.short} instead of nothing?`, ans: 'So both groups expect to be treated, and any effect of that expectation is the same in both groups' },
  blind: { ask: (t) => `Why are the ${t.who} not told who got the ${t.thing}?`, ans: 'So that what they expect cannot influence the way they measure the results' },
};

function mediumExperimentRole(rng) {
  const t = rng.pick(TRIALS);
  const N = 20 * rng.int(3, 12);
  const which = rng.pick(Object.keys(ROLE));
  const ask = typeof ROLE[which].ask === 'function' ? ROLE[which].ask(t) : ROLE[which].ask;
  const name = { random: 'random assignment', control: 'a control group', placebo: 'a placebo', blind: 'blinding' };
  return q({
    prompt: `Researchers test whether a new ${t.thing} ${t.aim}. ${N} volunteers are randomly assigned to two groups of ${N / 2}. One group gets the ${t.thing}; the other gets ${t.fake}. Neither the volunteers nor the ${t.judge} know who got which. ${ask}`,
    correct: ROLE[which].ans,
    wrong: Object.keys(ROLE).filter((k) => k !== which).map((k) => ({ value: ROLE[k].ans, why: `That is the reason for ${name[k]}, not for ${name[which]}.` })),
    solution: [`This question is about ${name[which]}.`, `${ROLE[which].ans}.`],
    rule: 3, skill: 'experiment design',
    check: () => (N % 2 === 0 && Object.keys(ROLE).length === 4 ? true : 'groups are not equal'),
  });
}

// ───────────── Hard ─────────────

const CAUSE = [
  { doing: 'taking music lessons', better: 'higher test scores', g: 'the music-lesson group', obs: (n) => `Researchers compared ${n} students who already take music lessons with ${n} students who do not.`, exp: (n) => `Researchers randomly assigned ${2 * n} students to two groups: one group took music lessons for a year and the other did not.`, lurk: 'Families who pay for music lessons may also help with schoolwork more.' },
  { doing: 'walking 30 minutes a day', better: 'lower blood pressure', g: 'the walking group', obs: (n) => `Researchers compared ${n} adults who already walk 30 minutes a day with ${n} adults who do not.`, exp: (n) => `Researchers randomly assigned ${2 * n} adults to two groups: one group walked 30 minutes a day for six months and the other kept to its usual routine.`, lurk: 'People who choose to walk every day may also eat better or smoke less.' },
  { doing: 'getting weekly tutoring', better: 'higher maths grades', g: 'the tutored group', obs: (n) => `Researchers compared ${n} students who already get weekly tutoring with ${n} students who do not.`, exp: (n) => `Researchers randomly assigned ${2 * n} students to two groups: one group got weekly tutoring for a term and the other did not.`, lurk: 'Students who sign up for tutoring may be more motivated to begin with.' },
  { doing: 'drinking green tea', better: 'fewer colds', g: 'the green-tea group', obs: (n) => `Researchers compared ${n} adults who already drink green tea daily with ${n} adults who do not.`, exp: (n) => `Researchers randomly assigned ${2 * n} adults to two groups: one group drank green tea daily for a winter and the other drank a tea-coloured drink with no tea in it.`, lurk: 'Daily tea drinkers may differ in diet, sleep or work from other adults.' },
];

function hardCauseEffect(rng) {
  const s = rng.pick(CAUSE);
  const n = 10 * rng.int(4, 30);
  const exp = rng.bool(0.5);
  const st = {
    cause: `${cap(s.doing)} caused ${s.better}.`,
    assoc: `${cap(s.doing)} is linked with ${s.better}, but this study cannot show cause and effect.`,
    none: `There is no link between ${s.doing} and ${s.better}.`,
    reverse: `Having ${s.better} caused people to start ${s.doing}.`,
  };
  const ok = exp ? 'cause' : 'assoc';
  const why = {
    cause: exp ? null : `The study did not assign ${s.doing} at random, so other differences between the groups could explain the result. ${s.lurk}`,
    assoc: exp ? 'Random assignment makes the groups alike in every other way, on average, so a difference too large for chance can be put down to the treatment.' : null,
    none: 'The difference was too large to be explained by chance, so there is a link.',
    reverse: exp ? 'The researchers chose who did it, by chance, so the outcome could not have caused the choice.' : 'Nothing in the study shows which came first. The only safe conclusion is a link.',
  };
  return q({
    prompt: `${exp ? s.exp(n) : s.obs(n)} On average, ${s.g} had ${s.better}, and the difference was too large to be explained by chance alone. Which conclusion does the study support?`,
    correct: st[ok],
    wrong: Object.keys(st).filter((k) => k !== ok).map((k) => ({ value: st[k], why: why[k] })),
    solution: [
      exp ? 'This is a randomised experiment: the researchers used chance to decide who got the treatment.' : 'This is an observational study: the people were already in their groups.',
      exp ? 'Random assignment balances the other differences between the groups, so a difference too large for chance shows cause and effect.' : `Other differences between the groups could explain the result. ${s.lurk}`,
      `Conclusion: ${st[ok]}`,
    ],
    rule: 3, skill: 'cause and effect',
    check: () => (new Set(Object.values(st)).size === 4 ? true : 'statements repeat'),
  });
}

function hardMarginSize(rng) {
  const kind = rng.pick(['need', 'shrink', 'grow']);
  const s = rng.pick(POPS.filter((x) => !x.lo));
  const name = person(rng);
  if (kind === 'need') {
    const [n, E] = rng.pick(SQUARES);
    return q({
      prompt: R`${name} wants to survey a random sample of the ${s.many} ${at(s)}, with a 95% margin of error of about ${num(E)} percentage points. Using \(E \approx \dfrac{1}{\sqrt{n}}\), how many ${s.many} should be in the sample?`,
      correct: n,
      wrong: [
        { value: 100 / E, why: R`That is \(\sqrt{n}\). Square it to find \(n\).` },
        { value: (200 / E) ** 2, why: R`The rule is \(\frac{1}{\sqrt{n}}\), so \(n = \frac{1}{E^2}\). There is no factor of 2.` },
        n / 2,
      ],
      solution: [R`\(\dfrac{1}{\sqrt{n}} = ${num(E / 100)}\), so \(\sqrt{n} = \dfrac{1}{${num(E / 100)}} = ${num(100 / E)}\).`, R`\(n = ${num(100 / E)}^2 = ${num(n)}\).`],
      rule: 4, skill: 'sample size',
      check: () => (Math.abs(100 / Math.sqrt(n) - E) < 1e-9 ? true : 'that sample size gives a different margin'),
    });
  }
  const [n, E] = rng.pick(SQUARES.filter(([x]) => x <= 2500));
  const k = rng.pick([2, 3, 4]);
  if (kind === 'shrink') {
    const target = E / k;
    return q({
      prompt: R`A random sample of ${txt(n)} ${s.many} gives a 95% margin of error of about ${num(E)} percentage points. About how many ${s.many} would be needed to make the margin of error ${k === 2 ? 'half as large' : `${['', '', '', 'one third', 'one quarter'][k]} as large`} (about ${num(round(target, 3))} points)? Use \(E \approx \dfrac{1}{\sqrt{n}}\).`,
      correct: n * k * k,
      wrong: [
        { value: n * k, why: R`The margin depends on \(\sqrt{n}\). To divide it by \(${k}\), multiply \(n\) by \(${k}^2 = ${k * k}\).` },
        { value: n * 2 * k, why: R`Multiply \(n\) by \(${k}^2 = ${k * k}\), not by \(2 \cdot ${k}\).` },
        { value: n / k, why: 'A smaller margin needs a larger sample, not a smaller one.' },
        n * k ** 3,
      ],
      solution: [R`\(E\) is proportional to \(\dfrac{1}{\sqrt{n}}\). Dividing \(E\) by \(${k}\) means multiplying \(\sqrt{n}\) by \(${k}\).`, R`So multiply \(n\) by \(${k}^2 = ${k * k}\): \(${txt(n)} \cdot ${k * k} = ${num(n * k * k)}\).`],
      rule: 4, skill: 'sample size',
      check: () => (Math.abs(100 / Math.sqrt(n * k * k) - target) < 1e-9 ? true : 'new margin is not E/k'),
    });
  }
  return q({
    prompt: R`A random sample of ${txt(n)} ${s.many} gives a 95% margin of error of about ${num(E)} percentage points. A second poll uses a sample ${k * k} times as large (${txt(n * k * k)} ${s.many}). Using \(E \approx \dfrac{1}{\sqrt{n}}\), what is its margin of error?`,
    correct: round(E / k, 3),
    fmt: pct,
    wrong: [
      { value: round(E / (k * k), 4), why: R`The margin depends on \(\sqrt{n}\), so multiplying \(n\) by \(${k * k}\) divides the margin by \(\sqrt{${k * k}} = ${k}\).` },
      { value: E * k, why: 'A larger sample gives a smaller margin of error, not a larger one.' },
      { value: round(E - k, 3) > 0 ? round(E - k, 3) : null, why: R`The margin is divided by \(${k}\), not reduced by \(${k}\).` },
      round(E / (2 * k), 4), E,
    ],
    solution: [R`New margin: \(\dfrac{1}{\sqrt{${n * k * k}}} = \dfrac{1}{${Math.sqrt(n) * k}} ${round(E / k, 3) === E / k ? '=' : '\\approx'} ${num(round(E / k, 3))}\%\).`, R`That is the old margin divided by \(\sqrt{${k * k}} = ${k}\).`],
    rule: 4, skill: 'sample size',
    check: () => (Math.abs(100 / Math.sqrt(n * k * k) - round(E / k, 3)) < 0.001 ? true : 'recomputed margin differs'),
  });
}

function hardSimUnusual(rng) {
  const t = simSetup(rng, (c) => c <= 2 || (c >= 10 && c <= 45));
  const { values, obs, up, c, step } = t;
  const unusual = c <= 2;
  const verdict = (u) => (u ? 'the result is unusual, so the claim looks doubtful' : 'a result like this is not unusual if the claim is true, so it is not strong evidence against the claim');
  const strict = values.filter((v) => (up ? v > obs : v < obs)).length;
  const say = (k, u) => `${k} of 100; ${verdict(u)}`;
  return q({
    prompt: `${t.story} How many simulated samples gave a result at least as extreme as ${obs}%, and what does that suggest?`,
    correct: say(c, unusual),
    wrong: [
      { value: say(c, !unusual), why: unusual ? `Only ${c} of 100 simulated samples were this extreme by chance, so the observed result is unusual.` : `${c} of 100 simulated samples were this extreme by chance alone, so such a result happens often enough when the claim is true.` },
      { value: say(100 - c, !unusual), why: `Count in the direction of the observed result: ${obs}% ${t.word}.` },
      strict !== c ? { value: say(strict, strict <= 2), why: `Include the samples at exactly ${obs}%.` } : null,
      { value: say(100 - c, unusual) },
    ],
    solution: [
      `Count the dots at ${obs}% and beyond (${up ? 'to the right' : 'to the left'}): ${plural(c, 'simulated sample')} of 100.`,
      unusual ? `That is very rare when the claim is true: the result is outside the middle 95% of the simulated results. So the claim of ${t.p0}% looks doubtful.` : `That happens about ${c}% of the time when the claim is true, so ${obs}% is within the usual range of chance results. The data do not give strong evidence against the claim of ${t.p0}%.`,
    ],
    rule: 5, skill: 'is the result unusual?',
    visual: simPlot(values, obs, step, 'Percent in each simulated sample', 'simulated sample percents', (v) => `${v}%`),
    check: () => (sum(tally(values).filter(([v]) => (up ? v >= obs : v <= obs)).map(([, k]) => k)) === c ? true : 'recount from the tally differs'),
  });
}

// ───────────── Challenge ─────────────

const EXPTS = [
  { aim: 'a memory game improves recall', subj: 'volunteers', unit: 'words remembered', base: [10, 15], spread: 3, tre: 'played the game', con: 'did a puzzle instead' },
  { aim: 'a new fertiliser makes bean plants grow taller', subj: 'bean plants', unit: 'height in cm after 3 weeks', base: [18, 26], spread: 3, tre: 'got the fertiliser', con: 'got plain water' },
  { aim: 'background music raises typing speed', subj: 'volunteers', unit: 'words per minute', base: [35, 45], spread: 4, tre: 'typed with music', con: 'typed in silence' },
];

// Two groups of 5 results whose overall total is even, so every difference of means is a multiple of 0.4.
function experimentData(rng) {
  for (;;) {
    const e = rng.pick(EXPTS);
    const base = rng.int(...e.base);
    const shift = rng.int(0, 4);
    const con = Array.from({ length: 5 }, () => base + rng.int(-e.spread, e.spread));
    const tre = Array.from({ length: 5 }, () => base + shift + rng.int(-e.spread, e.spread));
    if ((sum(con) + sum(tre)) % 2) tre[rng.int(0, 4)] += 1;
    const all = [...tre, ...con];
    const T = sum(all);
    const u = (a) => (2 * sum(a) - T) / 2; // difference of means = u × 0.4
    const obsU = u(tre);
    if (obsU <= 0) continue;
    const simU = Array.from({ length: 100 }, () => u(rng.shuffle(all).slice(0, 5)));
    const vals = simU.map((x) => round(x * 0.4, 1));
    const obs = round(obsU * 0.4, 1);
    if ((Math.max(...vals, obs) - Math.min(...vals, obs)) / 0.4 > 40) continue;
    const c = simU.filter((x) => x >= obsU).length;
    if (c > 45 || obs < 1.2) continue;
    return { e, con, tre, obs, obsU, simU, vals, c };
  }
}

function challengeRandomization(rng) {
  const { e, con, tre, obs, simU, vals, c } = experimentData(rng);
  const [mt, mc] = [sum(tre) / 5, sum(con) / 5];
  const strict = simU.filter((x) => x * 0.4 > obs + 1e-9).length;
  const negSide = vals.filter((v) => v <= -obs + 1e-9).length;
  return q({
    prompt: `To test whether ${e.aim}, 10 ${e.subj} were split at random into two groups of 5. The treatment group ${e.tre}; the control group ${e.con}. The table shows the results (${e.unit}). Then the 10 results were shuffled and re-split into two groups of 5, 100 times; the dot plot shows each difference of means (first group minus second). How many shuffles gave a difference at least as large as the observed one (treatment mean minus control mean)?`,
    correct: c,
    wrong: [
      strict !== c ? { value: strict, why: `"At least as large" includes differences equal to ${txt(obs)}.` } : null,
      negSide !== c ? { value: negSide, why: `The observed difference is treatment minus control, which is +${txt(obs)}. Count at ${txt(obs)} and to the right.` } : null,
      { value: 100 - c, why: `That counts the shuffles with a smaller difference than ${txt(obs)}.` },
      c + 3,
    ],
    solution: [
      R`Treatment mean: \(${sum(tre)} \div 5 = ${num(mt)}\). Control mean: \(${sum(con)} \div 5 = ${num(mc)}\).`,
      R`Observed difference: \(${num(mt)} - ${num(mc)} = ${num(obs)}\).`,
      `Count the dots at ${txt(obs)} or more: ${plural(c, 'shuffle')} of 100.`,
      c <= 5 ? 'So few shuffles do as well that chance alone is an unlikely explanation for the difference.' : 'Chance alone often gives a difference this large, so the experiment does not give strong evidence of an effect.',
    ],
    rule: 5, skill: 'comparing two treatments',
    visual: [
      { type: 'table', headers: ['Treatment group', 'Control group'], rows: tre.map((v, i) => [v, con[i]]), caption: e.unit, alt: `Treatment group: ${tre.join(', ')}. Control group: ${con.join(', ')}.` },
      simPlot(vals, obs, 0.4, 'Difference of means in each shuffle', 'shuffled differences of means', (v) => txt(v)),
    ],
    check: () => (Math.abs(mt - mc - obs) < 1e-9 && vals.filter((v) => v >= obs - 1e-9).length === c ? true : 'recount from the rounded values differs'),
  });
}

function challengeEvaluateReport(rng) {
  const s = rng.pick(POPS.filter((x) => !x.lo));
  if (rng.bool(0.35)) {
    const n = 1000 * rng.int(10, 18);
    const p = rng.int(60, 85);
    const org = rng.pick(['A website', 'A TV show', 'A radio station']);
    const v = rng.pick(POPS.filter((x) => x.many === 'voters' || x.many === 'customers'));
    return q({
      prompt: `${org} invites the ${v.many} ${at(v)} to vote online on whether they ${v.trait}. ${txt(n)} of them vote, and ${p}% say yes. A headline reads: “${p}% of the ${v.many} ${atThe(v)} ${v.trait}.” Is the headline justified?`,
      correct: `No: the people who voted chose themselves, so they are unlikely to represent all the ${v.many}, however many voted`,
      wrong: [
        { value: `Yes: with ${txt(n)} votes the margin of error is only about ${txt(round(100 / Math.sqrt(n), 1))} percentage point${round(100 / Math.sqrt(n), 1) === 1 ? '' : 's'}`, why: 'The margin of error only describes chance variation in a random sample. It says nothing about bias in a self-selected sample.' },
        { value: 'Yes: a sample this large must represent the population', why: 'A large biased sample is still biased. Only random selection makes a sample representative.' },
        { value: 'No: the sample is too small to say anything about the population', why: `${txt(n)} is a large sample. The problem is how it was chosen, not its size.` },
      ],
      solution: ['People who choose to vote online are a voluntary response sample. They often have stronger opinions than others.', 'A margin of error applies only to random samples, so a large size does not fix the bias.', 'The headline is not justified.'],
      rule: 1, skill: 'evaluating reports',
      check: () => (n >= 10000 && n < 20000 ? true : 'sample should be large but smaller than the population'),
    });
  }
  const [n, E] = rng.pick(SQUARES.filter(([, e]) => e >= 2 && e <= 5));
  let p;
  do p = rng.int(50, 50 + 2 * E); while (p - E === 50 || p === 50);
  const line = (lo, hi, yes) => `The interval is ${pct(lo)} to ${pct(hi)}; ${yes ? 'every value in it is above 50%, so the headline is supported' : 'it includes 50% or less, so the headline is not supported'}`;
  const supported = p - E > 50;
  const half = E / 2;
  return q({
    prompt: R`A random sample of ${txt(n)} ${s.many} ${at(s)} finds that ${p}% ${s.trait}. A headline says: “Most ${s.many} ${atThe(s)} ${s.trait}.” Using the 95% margin of error \(E \approx \dfrac{1}{\sqrt{n}}\), which statement is correct?`,
    correct: line(p - E, p + E, supported),
    wrong: [
      { value: line(p - E, p + E, !supported), why: supported ? R`Every value from \(${p - E}\%\) to \(${p + E}\%\) is above 50%.` : R`The interval reaches down to \(${p - E}\%\), which is not above 50%.` },
      { value: line(p - half, p + half, p - half > 50), why: R`The margin is \(\frac{1}{\sqrt{${n}}} = ${num(E)}\%\), not \(${num(half)}\%\).` },
      { value: line(p - 2 * E, p + 2 * E, false), why: R`The margin is \(\frac{1}{\sqrt{${n}}} = ${num(E)}\%\), not \(${num(2 * E)}\%\).` },
      { value: line(p - half, p + half, !(p - half > 50)) },
    ],
    solution: [
      R`\(E \approx \dfrac{1}{\sqrt{${n}}} = ${num(E / 100)}\), or \(${num(E)}\%\).`,
      R`Plausible values: \(${p}\% \pm ${num(E)}\%\), from \(${num(p - E)}\%\) to \(${num(p + E)}\%\).`,
      supported ? '"Most" means more than 50%. Every plausible value is above 50%, so the data support the headline.' : '"Most" means more than 50%. Some plausible values are 50% or less, so the data do not show that most of them do.',
    ],
    rule: 4, skill: 'evaluating reports',
    check: () => (supported === (p - 100 / Math.sqrt(n) > 50) ? true : 'the conclusion does not match the interval'),
  });
}

const FLAW_TRIALS = [
  { thing: 'skin cream', aim: 'clears up acne', fake: 'a plain cream that looks the same', who: 'a doctor', act: "rates each volunteer's skin", pick: 'the volunteers with the mildest acne', out: 'the skin' },
  { thing: 'pain gel', aim: 'reduces knee pain', fake: 'a gel with no active ingredient', who: 'a nurse', act: 'rates the pain each volunteer reports', pick: 'the youngest volunteers', out: 'knee pain' },
  { thing: 'hair tonic', aim: 'helps hair grow back', fake: 'a tonic of coloured water', who: 'a doctor', act: 'rates hair growth from photos', pick: 'the volunteers who had lost the least hair', out: 'hair growth' },
];
const FLAW = {
  random: 'Random assignment is missing: the groups were not formed by chance, so they may differ in other ways',
  control: 'A control group is missing: there is nothing to compare the treated volunteers with',
  placebo: 'A placebo is missing: the comparison group knew it was getting no treatment',
  blind: 'Blinding is missing: the person rating the results knew who got the treatment',
};

function challengeDesignFlaw(rng) {
  const t = rng.pick(FLAW_TRIALS);
  const N = 20 * rng.int(2, 8);
  const weeks = rng.int(4, 12);
  const flaw = rng.pick(Object.keys(FLAW));
  const rate = `After ${weeks} weeks, ${t.who} ${t.act}`;
  const body = {
    random: `The researchers put ${t.pick} into the ${t.thing} group and the rest into a second group that uses ${t.fake}. The volunteers are not told which they have. ${rate}, without being told who is in which group.`,
    control: `All ${N} volunteers use the ${t.thing}. At the start and after ${weeks} weeks, ${t.who} who knows nothing about the study ${t.act}, and the two ratings are compared.`,
    placebo: `A random draw splits the volunteers into two groups of ${N / 2}. One group uses the ${t.thing}; the other group uses nothing, and knows it. ${rate}, without being told who is in which group.`,
    blind: `A random draw splits the volunteers into two groups of ${N / 2}. One group uses the ${t.thing}; the other uses ${t.fake}, and the volunteers are not told which they have. ${rate}, and is told which volunteers used the ${t.thing}.`,
  }[flaw];
  const reason = {
    random: `The researchers chose ${t.pick} for the treatment group. Those volunteers may do better anyway, whatever the ${t.thing} does.`,
    control: `Everyone used the ${t.thing}, so any change in ${t.out} might have happened without it.`,
    placebo: 'The second group knew it was untreated. Expecting to be treated can change how people feel and what they report, so the groups differ in more than the treatment.',
    blind: `The rater knew who used the ${t.thing} and might, without meaning to, rate those volunteers more kindly.`,
  }[flaw];
  return q({
    prompt: `A company tests whether a new ${t.thing} ${t.aim}, using ${N} volunteers. ${body} What is the main flaw in this design?`,
    correct: FLAW[flaw],
    wrong: Object.keys(FLAW).filter((k) => k !== flaw).map((k) => ({ value: FLAW[k], why: `That is not the main problem here. ${reason}` })),
    solution: [
      'A sound experiment has a control group, random assignment, a placebo when expectations could matter, and blinding of whoever measures the results. Check each one.',
      reason,
      `Main flaw: ${FLAW[flaw].split(':')[0].toLowerCase()}.`,
    ],
    rule: 3, skill: 'experiment design',
    check: () => (N % 2 === 0 && body.includes(t.thing) ? true : 'groups are not equal'),
  });
}

// ───────────── Models ─────────────

function pollModel({ n, k }) {
  if (k > n) return { error: 'The number who said yes cannot be more than the sample size.' };
  const P = (100 * k) / n;
  const E = 100 / Math.sqrt(n);
  const [Pr, Er] = [round(P, 1), round(E, 1)];
  const [lo, hi] = [round(P - E, 1), round(P + E, 1)];
  const exactE = Number.isInteger(Math.sqrt(n));
  return {
    problem: `A town chooses ${plural(n, 'adult')} at random and asks whether they support a new bike lane; ${k} say yes. Estimate the percent of all adults in the town who support it.`,
    steps: [
      R`Sample percent: \(\dfrac{${k}}{${n}} ${Pr === P ? '=' : R`\approx`} ${num(Pr)}\%\). This is a statistic; the percent of all adults is the unknown parameter.`,
      R`Rule used: \(E \approx \dfrac{1}{\sqrt{n}} = \dfrac{1}{\sqrt{${n}}} ${exactE && Er === E ? '=' : R`\approx`} ${num(Er)}\%\).`,
      R`Interval of plausible values: \(${num(Pr)}\% \pm ${num(Er)}\%\), from about \(${num(Math.max(lo, 0))}\%\) to \(${num(Math.min(hi, 100))}\%\).`,
      R`A sample 4 times as large (${txt(4 * n)} adults) would halve the margin, to about \(${num(round(E / 2, 1))}\%\).`,
      n < 100 ? 'With so few people the margin is large; this rough rule is meant for samples of a few hundred or more.' : (lo > 50 ? 'Every plausible value is above 50%, so the data suggest that most adults support the lane.' : hi < 50 ? 'Every plausible value is below 50%, so the data suggest that most adults do not support it.' : 'The interval includes 50%, so the poll cannot tell whether most adults support the lane.'),
    ],
    answer: R`About \(${num(Pr)}\% \pm ${num(Er)}\%\)`,
    visual: {
      type: 'numberLine', min: 0, max: 100, step: 10,
      segment: { from: Math.max(lo, 0), to: Math.min(hi, 100) },
      points: [{ value: Pr, label: `${txt(Pr)}%` }],
      alt: `Number line from 0% to 100% with the sample percent ${txt(Pr)}% marked and the interval of plausible values from ${txt(Math.max(lo, 0))}% to ${txt(Math.min(hi, 100))}% shaded.`,
    },
  };
}

function simModel({ p, n, k }) {
  if (k > n) return { error: 'The observed count cannot be more than the sample size.' };
  const rand = seeded(p * 1000 + n * 41 + 7);
  const counts = Array.from({ length: 100 }, () => binom(rand, n, p / 100));
  const expected = (n * p) / 100;
  const up = k >= expected;
  const c = atLeast(counts, k, up);
  const word = up ? 'or more' : 'or fewer';
  return {
    problem: `A company claims that ${p}% of its customers would recommend it. In a random sample of ${n} customers, ${k} say they would. Is that result unusual if the claim is true?`,
    steps: [
      R`If the claim is true, a sample of ${n} has about \(${n} \cdot ${num(p / 100)} = ${num(round(expected, 2))}\) customers who would recommend, on average.`,
      `The computer drew 100 random samples of ${n} from a population where exactly ${p}% would recommend. The dot plot shows how many said yes in each.`,
      `${c} of the 100 simulated samples had ${k} ${word}, which is at least as extreme as the real sample.`,
      `Rule used: a result is called unusual when 5 or fewer of the 100 simulated results are at least as extreme. ${c <= 5 ? `Here ${c} ≤ 5, so the result is unusual and the claim looks doubtful.` : c <= 10 ? `Here ${c} > 5, so by this rule the result is not unusual, though it is close. It is not strong evidence against the claim.` : `Here ${c} > 5: chance alone often gives a result like this, so it is not evidence against the claim.`}`,
    ],
    answer: c <= 5 ? `Unusual: only ${c} of 100 simulations were as extreme.` : `Not unusual: ${c} of 100 simulations were as extreme.`,
    visual: { type: 'dotPlot', values: counts, min: Math.min(...counts, k), max: Math.max(...counts, k), label: `Number who said yes in each simulated sample of ${n}`, alt: dotAlt('simulated counts', counts) + ` The real sample had ${k}.` },
  };
}

// The fixed simulation used in the lesson: 100 samples of 50 from a population where 50% say yes.
const EX_SIM = simPercents(seeded(2024), 50, 50);
const EX_OBS = 64;
const EX_COUNT = atLeast(EX_SIM, EX_OBS, true);
const EX_PLOT = simPlot(EX_SIM, EX_OBS, 2, 'Percent who say yes in each simulated sample of 50', 'simulated sample percents', (v) => `${v}%`);

export default {
  id: 'statistical-inference',
  title: 'Samples, Studies & Inference',
  summary: 'Choose fair samples, tell experiments from observational studies, use a margin of error, and judge results with a simulation.',
  standards: ['CCSS S-IC.A.1', 'CCSS S-IC.A.2', 'CCSS S-IC.B.3', 'CCSS S-IC.B.4', 'CCSS S-IC.B.5', 'CCSS S-IC.B.6'],
  explain: {
    intro: 'Statistics uses a sample to learn about a whole population. That works only if the sample is chosen fairly, and even then a sample result is an estimate with some chance error. This lesson covers how to choose samples, how to design studies that can show cause and effect, how big the chance error is, and how a simulation shows whether a result could be due to chance alone.',
    rules: [
      {
        title: 'Population and sample, parameter and statistic',
        text: 'The population is the whole group a question is about; the sample is the part that is actually studied. A parameter is a number that describes the population (usually unknown). A statistic is a number computed from the sample, used to estimate the parameter. Collecting data from every member of the population is a census.',
        example: 'In a random sample of 500 of a city\'s 40,000 voters, 58% support a new park. The 58% is a statistic; the percent of all 40,000 voters is the parameter.',
      },
      {
        title: 'Sampling methods',
        text: 'Random methods: a simple random sample draws the whole sample at random from a full list; a stratified sample splits the population into groups and chooses at random from each group; a cluster sample chooses a few whole groups at random and uses everyone in them; a systematic sample takes every kth member after a random start. A convenience sample (whoever is easy to reach) and a voluntary response sample (whoever chooses to reply) are likely to be biased: they favour some part of the population.',
        example: 'Choosing 20 students at random from each grade is stratified. Choosing 3 homerooms at random and asking everyone in them is a cluster sample.',
      },
      {
        title: 'Other sources of bias',
        text: 'Even a random sample can give biased results. Nonresponse bias happens when many of the people chosen do not answer, because those who answer may differ from those who do not. Biased wording happens when a question pushes people toward one answer. A larger sample does not fix bias.',
        example: '“Don\'t you agree that our crumbling roads need fixing?” leads people to say yes. A neutral version is “Do you favour or oppose a tax for road repairs?”',
      },
      {
        title: 'Surveys, observational studies and experiments',
        text: 'A sample survey asks a sample questions. An observational study records what happens in groups that already exist. In an experiment the researcher imposes treatments. Only a randomised experiment can show cause and effect, because random assignment makes the groups alike in every other way, on average. A good experiment also has a control group for comparison, a placebo (a fake treatment) when expectations could matter, and blinding: the subjects, and whoever measures the results, do not know who got which treatment.',
        example: 'Students who sleep more get better grades (observational: a link, not proof of cause). Randomly assigning a bedtime and comparing grades is an experiment.',
      },
      {
        title: 'Margin of error',
        text: R`A sample percent varies from sample to sample. For a random sample of size \(n\), the 95% margin of error is about \(E \approx \dfrac{1}{\sqrt{n}}\), and the interval \(\hat{p} \pm E\) gives the plausible values of the population percent. Because of the square root, a sample 4 times as large halves the margin.`,
        example: R`\(n = 400\): \(E \approx \frac{1}{20} = 5\%\). A result of \(46\%\) gives plausible values from \(41\%\) to \(51\%\). With \(n = 1600\) the margin is about \(2.5\%\).`,
      },
      {
        title: 'Using a simulation',
        text: 'To judge a result, simulate many samples (or many random re-splits of an experiment\'s results) in a world where only chance is at work. Count how many simulated results are at least as extreme as the real one. If very few are (a common rule of thumb is 5 or fewer out of 100), the result is unusual and chance alone is an unlikely explanation. Another common version asks whether the real result lies outside the middle 95% of the simulated results. For two treatments, compare the difference of the group means with the differences from the random re-splits.',
        example: 'If a claim says 50% and only 1 of 100 simulated samples gives 66% or more, a real sample of 66% casts doubt on the claim.',
      },
    ],
    vocab: [
      { term: 'population, sample', def: 'The whole group of interest, and the part of it that is studied.' },
      { term: 'parameter, statistic', def: 'A number describing the population, and a number computed from a sample.' },
      { term: 'bias', def: 'A tendency of a method to favour certain results, so that its estimates are off in one direction.' },
      { term: 'random assignment', def: 'Using chance to decide which subjects get which treatment.' },
      { term: 'control group', def: 'The group that does not get the new treatment, used as a baseline.' },
      { term: 'placebo', def: 'A fake treatment that looks like the real one.' },
      { term: 'blinding', def: 'Keeping subjects (single-blind), or subjects and evaluators (double-blind), from knowing who got which treatment.' },
      { term: 'margin of error', def: R`How far a sample estimate is likely to be from the true value; about \(\frac{1}{\sqrt{n}}\) for a 95% margin.` },
    ],
    mistakes: [
      'Mixing up stratified and cluster samples. Stratified: some from every group. Cluster: everyone from a few groups.',
      'Thinking a huge sample cannot be biased. Thousands of volunteers are still volunteers.',
      'Claiming cause and effect from an observational study. Without random assignment, other differences between the groups could explain the result.',
      R`Using \(\frac{1}{n}\) instead of \(\frac{1}{\sqrt{n}}\), or doubling the sample to halve the margin. Halving the margin takes 4 times the sample.`,
      'Counting only the simulated results beyond the observed value. "At least as extreme" includes the ones equal to it.',
    ],
    visual: EX_PLOT,
  },
  examples: [
    {
      title: 'Naming sampling methods',
      problem: 'A school of 1,600 students wants to know how much time students spend on homework. Name each plan: (a) choose 3 of the 60 homerooms at random and ask everyone in them; (b) choose 25 students at random from each of the four grades; (c) ask the first 100 students to arrive in the morning; (d) from an alphabetical list, start at a random name among the first 16 and take every 16th student.',
      steps: [
        '(a) Whole groups chosen at random, everyone in them asked: a cluster sample.',
        '(b) Some chosen at random from every group: a stratified random sample.',
        '(c) Whoever is easiest to reach: a convenience sample. Early arrivals may differ from other students, so it is likely to be biased.',
        '(d) Every 16th member after a random start: a systematic sample.',
      ],
      answer: '(a) cluster (b) stratified (c) convenience, likely biased (d) systematic',
    },
    {
      title: 'Word problem: a poll and its margin of error',
      word: true,
      problem: 'A random sample of 625 voters finds that 56% support a new library. (a) Find the 95% margin of error using the rule E ≈ 1/√n. (b) Do the data support the claim that most voters support the library? (c) How many voters would be needed to halve the margin?',
      steps: [
        R`(a) \(\sqrt{625} = 25\), so \(E \approx \frac{1}{25} = 0.04\), which is \(4\%\).`,
        R`(b) Plausible values: \(56\% \pm 4\%\), from \(52\%\) to \(60\%\). Every value is above 50%, so the data support "most".`,
        R`(c) Halving the margin takes 4 times the sample: \(4 \cdot 625 = 2500\) voters (\(\frac{1}{\sqrt{2500}} = 2\%\)).`,
      ],
      answer: R`(a) \(4\%\) (b) Yes, \(52\%\) to \(60\%\) (c) 2,500`,
      visual: { type: 'numberLine', min: 40, max: 70, step: 2, segment: { from: 52, to: 60 }, points: [{ value: 56, label: '56%' }], labels: [{ value: 50, text: '50%' }], alt: 'Number line from 40% to 70% with 56% marked and the interval from 52% to 60% shaded; it lies entirely to the right of 50%.' },
    },
    {
      title: 'Word problem: can the study show cause?',
      word: true,
      problem: 'Researchers find that teenagers who already eat breakfast every day have higher test scores than those who skip it. (a) What kind of study is this, and can it show that breakfast raises scores? (b) Describe an experiment that could.',
      steps: [
        '(a) The groups already existed, so this is an observational study. It shows a link only: families who make breakfast every day may differ in other ways, such as sleep or support with homework.',
        '(b) Recruit volunteers who usually skip breakfast and use a random draw to assign half to eat a set breakfast each day (treatment) and half to continue as usual (control).',
        'Have the tests marked by people who do not know which group each student is in (blinding), then compare the mean scores. Random assignment balances the other differences, so a large difference can be credited to breakfast.',
      ],
      answer: '(a) Observational; a link, not cause. (b) A randomised experiment with a control group and blinded scoring.',
    },
    {
      title: 'Word problem: is the result unusual?',
      word: true,
      problem: `A café claims that half of its customers order a hot drink. In a random sample of 50 customers, 32 (64%) do. The dot plot shows the percent in 100 simulated samples of 50 from a population where exactly 50% order a hot drink. Does the sample cast doubt on the claim?`,
      steps: [
        'Count the simulated samples at 64% or more: that is the result itself and everything more extreme.',
        `${plural(EX_COUNT, 'simulated sample')} of 100 reached 64% or more.`,
        EX_COUNT <= 5 ? `That is 5 or fewer out of 100, so a result like 64% is rare when the claim is true. The sample casts doubt on the claim.` : 'That happens often enough by chance, so the sample is not strong evidence against the claim.',
      ],
      answer: EX_COUNT <= 5 ? `Yes: only ${EX_COUNT} of 100 simulations reached 64%.` : `No: ${EX_COUNT} of 100 simulations reached 64%.`,
      visual: EX_PLOT,
    },
  ],
  models: [
    {
      id: 'poll-margin',
      title: 'Word problem: a poll with a margin of error',
      word: true,
      intro: 'Choose the sample size and how many said yes.',
      inputs: [
        { name: 'n', label: 'Sample size n', type: 'int', min: 25, max: 10000, value: 625 },
        { name: 'k', label: 'Number who said yes', type: 'int', min: 0, max: 10000, value: 350 },
      ],
      compute: pollModel,
    },
    {
      id: 'simulate-claim',
      title: 'Word problem: testing a claim by simulation',
      word: true,
      intro: 'Choose the claimed percent, the sample size and the result of the real sample. The computer simulates 100 samples in which the claim is true.',
      inputs: [
        { name: 'p', label: 'Claimed percent', type: 'int', min: 5, max: 95, value: 70 },
        { name: 'n', label: 'Sample size', type: 'int', min: 10, max: 40, value: 30 },
        { name: 'k', label: 'Number in the real sample who would recommend', type: 'int', min: 0, max: 40, value: 16 },
      ],
      compute: simModel,
    },
  ],
  quiz: {
    easy: [easyPopulation, easySamplingMethod, easyStudyType, easyMargin],
    medium: [mediumBiasSource, mediumMarginInterval, mediumSimCount, mediumExperimentRole],
    hard: [hardCauseEffect, hardMarginSize, hardSimUnusual],
    challenge: [challengeRandomization, challengeEvaluateReport, challengeDesignFlaw],
  },
};
