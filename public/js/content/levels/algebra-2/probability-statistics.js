import { R, q, frac, fracTex, num, txt, choose, permutations, factorial, round, range, sum, over, person, integrate, plural } from '../../lib/index.js';
import { M } from './_shared.js';

// ───────────── Helpers ─────────────

const whole = (v) => (Number.isInteger(v) ? v : null);
const quarter = (v) => (Number.isInteger(v * 4) ? v : null); // keeps decimals that end by the second place
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const percent = (v) => M(`${num(v)}\\%`);
// A fraction as first written and, if it reduces, in lowest terms: "\frac{6}{56} = \frac{3}{28}".
const reduced = (n, d) => (frac(n, d).tex() === fracTex(n, d) ? fracTex(n, d) : `${fracTex(n, d)} = ${frac(n, d).tex()}`);
// n(n − 1)(n − 2)… with r factors, written out: "7 \cdot 6 \cdot 5".
const falling = (n, r) => range(n, n - r + 1, -1).join(' \\cdot ');

// The normal curve, scaled to height 1, and the percent of values between lo and hi standard deviations from the mean.
const bell = (z) => Math.exp((-z * z) / 2);
const area = (lo, hi) => (100 * integrate(bell, Math.max(lo, -8), Math.min(hi, 8))) / Math.sqrt(2 * Math.PI);
// The same percent from the 68–95–99.7 rule (lo and hi are whole numbers from −3 to 3, or ±Infinity).
// The bands are: below −3, −3 to −2, −2 to −1, −1 to 0, 0 to 1, 1 to 2, 2 to 3, above 3.
const BANDS = [0.15, 2.35, 13.5, 34, 34, 13.5, 2.35, 0.15];
const bandsIn = (lo, hi) => BANDS.slice(Math.max(lo, -4) + 4, Math.min(hi, 4) + 4);
const ruleArea = (lo, hi) => round(sum(bandsIn(lo, hi)), 2);
const sds = (k) => `${k} standard ${k === 1 ? 'deviation' : 'deviations'}`;

const NORMAL = [
  { what: 'The scores on a test', plural: 'the scores', one: 'a score of', unit: '', items: 'students', mean: (rng) => rng.int(60, 75), sds: [4, 6, 8] },
  { what: 'The heights of the students at a school', plural: 'the heights', one: 'a height of', unit: ' cm', items: 'students', mean: (rng) => rng.int(158, 175), sds: [6, 8, 10] },
  { what: 'The lifetimes of a brand of light bulb', plural: 'the lifetimes', one: 'a lifetime of', unit: ' hours', items: 'light bulbs', mean: (rng) => 50 * rng.int(18, 30), sds: [40, 50, 60, 80, 100] },
  { what: 'The weights of the apples from an orchard', plural: 'the weights', one: 'a weight of', unit: ' g', items: 'apples', mean: (rng) => 5 * rng.int(30, 44), sds: [8, 10, 12, 20] },
  { what: 'The times that students take to travel to school', plural: 'the times', one: 'a time of', unit: ' minutes', items: 'students', mean: (rng) => rng.int(28, 44), sds: [4, 6, 8] },
];
function pickNormal(rng) {
  const s = rng.pick(NORMAL);
  const [mean, sd] = [s.mean(rng), rng.pick(s.sds)];
  // The value z standard deviations from the mean; an interval between two such values, in words.
  const at = (z) => txt(mean + z * sd);
  const phrase = (lo, hi) => (lo === -Infinity ? `less than ${at(hi)}${s.unit}` : hi === Infinity ? `more than ${at(lo)}${s.unit}` : `between ${at(lo)} and ${at(hi)}${s.unit}`);
  const setup = `${s.what} are normally distributed with mean ${txt(mean)}${s.unit} and standard deviation ${sd}${s.unit}.`;
  return { s, mean, sd, at, phrase, setup };
}

// ───────────── Easy ─────────────

const DIE_EVENTS = [['an even number', 3], ['an odd number', 3], ['a 6', 1], ['a number greater than 4', 2], ['a number less than 3', 2], ['a number greater than 2', 4]];

function easyIndependent(rng) {
  const kind = rng.pick(['marbles', 'spinners', 'coin']);
  let [a, n1, b, n2, text, names, extra] = [1, 2, 1, 6, '', ['first', 'second'], null];
  if (kind === 'marbles') {
    const [red, blue, mixed] = [rng.int(2, 7), rng.int(2, 7), rng.bool(0.5)];
    [a, n1, b, n2, names] = [red, red + blue, mixed ? blue : red, red + blue, ['red', mixed ? 'blue' : 'red']];
    text = `A bag holds ${red} red marbles and ${blue} blue marbles. One marble is drawn at random and put back. Then a second marble is drawn at random. What is the probability that ${mixed ? 'the first marble is red and the second is blue' : 'both marbles are red'}?`;
    extra = { value: frac(a * (mixed ? b : a - 1), n1 * (n1 - 1)), why: `The first marble is put back, so the second draw is from all ${n1} marbles again.` };
  } else if (kind === 'spinners') {
    [n1, n2] = [rng.pick([3, 4, 5, 6, 8]), rng.pick([4, 5, 6, 8, 10])];
    [a, b, names] = [rng.int(1, n1 - 1), rng.int(1, n2 - 1), ['green on A', 'green on B']];
    text = `Spinner A has ${n1} equal sections, and ${a} of them ${a === 1 ? 'is' : 'are'} green. Spinner B has ${n2} equal sections, and ${b} of them ${b === 1 ? 'is' : 'are'} green. Each spinner is spun once. What is the probability that both land on green?`;
  } else {
    const [side, [event, count]] = [rng.pick(['heads', 'tails']), rng.pick(DIE_EVENTS)];
    [b, names] = [count, [side, event]];
    text = `A fair coin is flipped and a fair six-sided die is rolled. What is the probability of getting ${side} on the coin and ${event} on the die?`;
  }
  const [p1, p2] = [frac(a, n1), frac(b, n2)];
  const added = p1.add(p2);
  return q({
    prompt: text,
    correct: p1.mul(p2),
    wrong: [
      added.value < 1 ? { value: added, why: 'These two events must both happen, and they do not affect each other. Multiply their probabilities. Adding is for "or".' } : null,
      extra,
      { value: frac(a + b, n1 + n2), why: 'Find each probability on its own, then multiply. Do not combine the counts first.' },
      { value: p1, why: 'That is the probability of the first event only. Multiply by the probability of the second.' },
      p2,
    ],
    solution: [
      'Neither result changes the chances of the other, so the two events are independent.',
      R`\(P(\text{${names[0]}}) = ${reduced(a, n1)}\) and \(P(\text{${names[1]}}) = ${reduced(b, n2)}\).`,
      R`Multiply: \(${p1.tex()} \cdot ${p2.tex()} = ${p1.mul(p2).tex()}\).`,
    ],
    rule: 0, skill: 'independent events',
    check: () => {
      let hits = 0;
      for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) if (i < a && j < b) hits++;
      return p1.mul(p2).eq(frac(hits, n1 * n2)) ? true : 'counting the equally likely pairs gives a different answer';
    },
  });
}

function easyCounting(rng) {
  const kind = rng.pick(['line', 'P', 'C']);
  if (kind === 'line') {
    const n = rng.int(3, 7);
    const things = rng.pick(['books be arranged in a row on a shelf', 'runners finish a race, if there are no ties', 'songs be played one after another', 'students line up for a photo']);
    return q({
      prompt: `In how many different orders can ${n} ${things}?`,
      correct: factorial(n),
      wrong: [
        { value: n * n, why: R`After the first place is filled, only \(${n - 1}\) choices are left for the next place, then \(${n - 2}\), and so on.` },
        { value: (n * (n + 1)) / 2, why: 'The numbers of choices for each place are multiplied, not added.' },
        factorial(n - 1), 2 ** n,
      ],
      solution: [R`There are \(${n}\) choices for the first place, \(${n - 1}\) for the second, and so on down to \(1\).`, R`\(${n}! = ${falling(n, n)} = ${num(factorial(n))}\).`],
      rule: 4, skill: 'factorials',
      check: () => (permutations(n, n) === factorial(n) ? true : 'the product of the choices is different'),
    });
  }
  const n = rng.int(5, 10);
  const r = rng.int(2, 4);
  const [perms, combos] = [permutations(n, r), choose(n, r)];
  const ordered = kind === 'P';
  return q({
    prompt: R`Evaluate \({}_{${n}}${kind}_{${r}}\).`,
    correct: ordered ? perms : combos,
    wrong: ordered
      ? [
        { value: combos, why: R`That is \({}_{${n}}C_{${r}}\). In a permutation the order matters, so there is no division by \(${r}!\).` },
        { value: n ** r, why: R`With no repeats, the number of choices drops by 1 each time: \(${falling(n, r)}\), not \(${n}^{${r}}\).` },
        n * r, permutations(n, r + 1),
      ]
      : [
        { value: perms, why: R`That is \({}_{${n}}P_{${r}}\). In a combination the order does not matter, so divide by \(${r}! = ${factorial(r)}\).` },
        r > 2 ? { value: whole(perms / r), why: R`Divide by \(${r}! = ${factorial(r)}\), not by \(${r}\).` } : null,
        n * r, choose(n, r - 1), combos + n,
      ],
    solution: ordered
      ? [R`\({}_{n}P_{r}\) is a product of \(r\) numbers, starting at \(n\) and going down by 1 each time.`, R`\({}_{${n}}P_{${r}} = ${falling(n, r)} = ${num(perms)}\).`]
      : [R`First count the ordered choices: \({}_{${n}}P_{${r}} = ${falling(n, r)} = ${num(perms)}\).`, R`Each group of \(${r}\) appears in \(${r}! = ${factorial(r)}\) orders, so divide: \({}_{${n}}C_{${r}} = ${num(perms)} \div ${factorial(r)} = ${num(combos)}\).`],
    rule: 4, skill: 'permutations and combinations',
    check: () => ((ordered ? factorial(n) / factorial(n - r) : factorial(n) / (factorial(r) * factorial(n - r))) === (ordered ? perms : combos) ? true : 'the factorial formula gives a different value'),
  });
}

function easyZScore(rng) {
  const { s, mean, sd, setup } = pickNormal(rng);
  const z = rng.pick([-3, -2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3]);
  const x = mean + z * sd;
  const side = z > 0 ? 'above' : 'below';
  return q({
    prompt: `${setup} What is the z-score of ${s.one} ${txt(x)}${s.unit}?`,
    correct: z,
    wrong: [
      { value: -z, why: R`Subtract the mean from the value: \(${x} - ${mean}\), not the other way round. A value ${side} the mean has a ${z > 0 ? 'positive' : 'negative'} z-score.` },
      { value: x - mean, why: R`That is the distance from the mean. Divide it by the standard deviation, \(${sd}\), to count standard deviations.` },
      { value: quarter(x / sd), why: 'Subtract the mean first, then divide by the standard deviation.' },
      z + (z > 0 ? 1 : -1), z / 2,
    ],
    solution: [
      R`\(z = \dfrac{x - \mu}{\sigma} = \dfrac{${x} - ${mean}}{${sd}} = ${over(x - mean, String(sd))}\).`,
      R`\(z = ${num(z)}\). The value is ${sds(Math.abs(z))} ${side} the mean.`,
    ],
    rule: 6, skill: 'z-scores',
    check: () => (mean + z * sd === x ? true : 'that many standard deviations from the mean is a different value'),
  });
}

// ───────────── Medium ─────────────

const PAIRS = [
  { a: 'red', b: 'blue', item: 'marble', bag: (x, y) => `A bag holds ${x} red marbles and ${y} blue marbles. Two marbles are drawn at random, one after the other, without replacement.`, both: 'both marbles are red', ordered: 'the first marble is red and the second is blue' },
  { a: 'black', b: 'white', item: 'sock', bag: (x, y) => `A drawer holds ${x} black socks and ${y} white socks. Two socks are taken out at random, one after the other.`, both: 'both socks are black', ordered: 'the first sock is black and the second is white' },
  { a: 'senior', b: 'junior', item: 'student', bag: (x, y) => `A club has ${x} seniors and ${y} juniors. Two different students are chosen at random, first a chairperson and then a secretary.`, both: 'both are seniors', ordered: 'the chairperson is a senior and the secretary is a junior' },
];

function mediumDependent(rng) {
  const s = rng.pick(PAIRS);
  const [x, y, ordered] = [rng.int(3, 9), rng.int(3, 9), rng.bool(0.5)];
  const n = x + y;
  const left = ordered ? y : x - 1; // how many of the wanted kind are left for the second choice
  const answer = frac(x * left, n * (n - 1));
  const kind = ordered ? s.b : s.a;
  return q({
    prompt: `${s.bag(x, y)} What is the probability that ${ordered ? s.ordered : s.both}?`,
    correct: answer,
    wrong: [
      { value: frac(x * (ordered ? y : x), n * n), why: `The first ${s.item} is not put back, so the second is chosen from only ${n - 1}${ordered ? '' : `, and only ${x - 1} of them are ${s.a}`}.` },
      ordered
        ? { value: frac(x * (y - 1), n * (n - 1)), why: `The first ${s.item} was ${s.a}, so all ${y} ${s.b} ones are still there.` }
        : { value: frac(x * x, n * (n - 1)), why: `One ${s.a} ${s.item} has already been taken, so only ${x - 1} are left.` },
      { value: frac(x * left, n * n), why: `After the first choice only ${n - 1} are left, so the second fraction is out of ${n - 1}, not ${n}.` },
      ordered ? { value: frac(2 * x * y, n * (n - 1)), why: 'The question fixes the order, so the two orders are not added together.' } : frac(x - 1, n - 1),
    ],
    solution: [
      `The first ${s.item} is not put back, so the second choice depends on the first.`,
      R`\(P(\text{first is ${s.a}}) = ${fracTex(x, n)}\). Then ${left} of the ${n - 1} that are left are ${kind}: \(${fracTex(left, n - 1)}\).`,
      R`Multiply: \(${fracTex(x, n)} \cdot ${fracTex(left, n - 1)} = ${reduced(x * left, n * (n - 1))}\).`,
    ],
    rule: 1, skill: 'dependent events',
    check: () => {
      const kinds = range(1, n).map((i) => (i <= x ? 'a' : 'b'));
      let [hits, total] = [0, 0];
      kinds.forEach((first, i) => kinds.forEach((second, j) => {
        if (i === j) return;
        total++;
        if (first === 'a' && second === (ordered ? 'b' : 'a')) hits++;
      }));
      return answer.eq(frac(hits, total)) ? true : 'listing every ordered pair gives a different answer';
    },
  });
}

function mediumAddition(rng) {
  const N = rng.pick([20, 24, 30, 36, 40, 50, 60]);
  const multiple = (m) => ({ text: m === 2 ? 'even' : `a multiple of ${m}`, group: m === 2 ? 'even numbers' : `multiples of ${m}`, test: (v) => v % m === 0 });
  const less = (k) => ({ text: `less than ${k}`, group: `numbers less than ${k}`, test: (v) => v < k });
  const greater = (k) => ({ text: `greater than ${k}`, group: `numbers greater than ${k}`, test: (v) => v > k });
  const kind = rng.pick(['multiples', 'multiples', 'mixed', 'apart']);
  const [A, B] = kind === 'multiples' ? rng.pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [4, 6]]).map(multiple)
    : kind === 'mixed' ? [multiple(rng.int(2, 5)), rng.bool(0.5) ? less(rng.int(7, N / 2)) : greater(N - rng.int(6, N / 2))]
      : [less(rng.int(4, N / 2 - 2)), greater(rng.int(N / 2 + 2, N - 3))];
  const cards = range(1, N);
  const both = cards.filter((v) => A.test(v) && B.test(v));
  const [nA, nB, k] = [cards.filter(A.test).length, cards.filter(B.test).length, both.length];
  const answer = frac(nA + nB - k, N);
  return q({
    prompt: `Cards numbered from 1 to ${N} are shuffled, and one card is drawn at random. What is the probability that its number is ${A.text} or ${B.text}${k ? ' (or both)' : ''}?`,
    correct: answer,
    wrong: k
      ? [
        nA + nB <= N ? { value: frac(nA + nB, N), why: `${k === 1 ? 'One number is' : `${k} numbers are`} both ${A.text} and ${B.text}, so ${k === 1 ? 'it has' : 'they have'} been counted twice. Subtract ${k === 1 ? 'it' : 'them'} once.` } : null,
        { value: frac(k, N), why: 'That is the probability that the number is both. "Or" also includes the numbers that are only one of the two.' },
        { value: frac(nA + nB - 2 * k, N), why: 'Subtract the overlap only once. A number that is both still counts.' },
        frac(nA, N).mul(frac(nB, N)), frac(nA, N),
      ]
      : [
        { value: frac(nA, N).mul(frac(nB, N)), why: 'These two events cannot both happen, and the question says "or", so add the probabilities. Multiplying is for "and".' },
        { value: frac(N - nA - nB, N), why: 'That is the probability that the number is neither.' },
        frac(nA, N), frac(nB, N), frac(nA + nB + 1, N),
      ],
    solution: [
      `${cap(A.group)}: ${nA} of the ${N} cards. ${cap(B.group)}: ${nB} of the ${N} cards.`,
      k ? `Both: ${plural(k, 'card')}${k <= 8 ? ` (${both.join(', ')})` : ''}. ${k === 1 ? 'It is' : 'They are'} in both groups, so subtract ${k === 1 ? 'it' : 'them'} once.` : 'No card is in both groups, so the events are mutually exclusive and the probabilities simply add.',
      R`\(P(\text{A or B}) = ${fracTex(nA, N)} + ${fracTex(nB, N)}${k ? ` - ${fracTex(k, N)}` : ''} = ${reduced(nA + nB - k, N)}\).`,
    ],
    rule: 3, skill: 'addition rule',
    check: () => (answer.eq(frac(cards.filter((v) => A.test(v) || B.test(v)).length, N)) ? true : 'counting the cards that fit gives a different answer'),
  });
}

function mediumEmpirical(rng) {
  const { mean, sd, at, phrase, setup, s } = pickNormal(rng);
  const k = rng.pick([1, 1, 2, 2, 3]);
  const [kind, low] = [rng.pick(['within', 'half', 'tail', 'most']), rng.bool(0.5)];
  const [lo, hi] = kind === 'within' ? [-k, k] : kind === 'half' ? (low ? [-k, 0] : [0, k]) : kind === 'tail' ? (low ? [-Infinity, -k] : [k, Infinity]) : low ? [-k, Infinity] : [-Infinity, k];
  const [mid, value, half, tail] = [ruleArea(-k, k), ruleArea(lo, hi), ruleArea(0, k), ruleArea(k, Infinity)];
  const outside = round(100 - mid, 2);
  const wrong = {
    within: [{ value: half, why: 'That is the percent on one side of the mean only. This interval reaches the same distance on both sides.' }, ...[68, 95, 99.7].map((v) => ({ value: v, why: `That percent goes with a different number of standard deviations. Here each end is ${sds(k)} from the mean.` }))],
    half: [{ value: mid, why: R`\(${mid}\%\) covers both sides of the mean. This interval is on one side only, so take half.` }, { value: tail, why: 'That is the percent beyond the far end of the interval, not inside it.' }, 50],
    tail: [{ value: outside, why: R`\(${outside}\%\) is everything outside the middle \(${mid}\%\), in both tails together. Each tail has half of that.` }, { value: mid, why: 'That is the percent in the middle. The question asks for one tail.' }, half],
    most: [{ value: mid, why: R`That leaves out a tail that also counts here. Add the \(${tail}\%\) on the far side.` }, { value: tail, why: 'That is the small tail on the other side of the cut-off.' }, half],
  }[kind];
  const end = low ? at(-k) : at(k);
  return q({
    prompt: `${setup} Use the 68–95–99.7 rule: about what percent of ${s.plural} are ${phrase(lo, hi)}?`,
    correct: value,
    fmt: percent,
    wrong: [...wrong, 68, 95, 34, 47.5, 16, 2.5, 84],
    solution: [
      R`\(${end}\) is ${sds(k)} ${low ? 'below' : 'above'} the mean: \(${mean} ${low ? '-' : '+'} ${k} \cdot ${sd} = ${mean + (low ? -k : k) * sd}\).`,
      R`About \(${mid}\%\) of the values are within ${sds(k)} of the mean.`,
      { within: R`The interval runs from ${sds(k)} below the mean to ${sds(k)} above, so the answer is about \(${value}\%\).`,
        half: R`The curve is symmetric, so half of that is on each side of the mean: \(${mid}\% \div 2 = ${value}\%\).`,
        tail: R`That leaves \(100\% - ${mid}\% = ${outside}\%\) outside, split equally between the two tails: \(${outside}\% \div 2 = ${value}\%\).`,
        most: R`The tail on the far side holds half of the \(${outside}\%\) outside, which is \(${tail}\%\). So the answer is \(100\% - ${tail}\% = ${value}\%\).` }[kind],
    ],
    rule: 5, skill: '68–95–99.7 rule',
    check: () => (Math.abs(area(lo, hi) - value) < 0.5 ? true : `the area under the normal curve is ${area(lo, hi)}%`),
  });
}

// ───────────── Hard ─────────────

const SURVEYS = [
  { rows: ['Grade 11', 'Grade 12'], cols: ['Plays a sport', 'No sport'], who: 'student', rowIs: ['is in grade 11', 'is in grade 12'], colIs: ['plays a sport', 'does not play a sport'], group: 'the students at a school', free: (T) => `In this survey, playing a sport is independent of the student's grade. How many of the ${T} grade-12 students play a sport?` },
  { rows: ['Adults', 'Children'], cols: ['Bought popcorn', 'No popcorn'], who: 'person', rowIs: ['is an adult', 'is a child'], colIs: ['bought popcorn', 'did not buy popcorn'], group: 'the people at a cinema', free: (T) => `At this cinema, buying popcorn is independent of whether a person is an adult or a child. How many of the ${T} children bought popcorn?` },
  { rows: ['Day shift', 'Night shift'], cols: ['Passed', 'Failed'], who: 'part', rowIs: ['was made on the day shift', 'was made on the night shift'], colIs: ['passed inspection', 'failed inspection'], group: 'the parts made at a factory', free: (T) => `At this factory, passing inspection is independent of the shift. How many of the ${T} parts from the night shift passed?` },
];
const surveyTable = (s, cells, alt) => ({ type: 'table', headers: ['Group', ...s.cols, 'Total'], rowHeaders: true, rows: cells.map((row, i) => [i < 2 ? s.rows[i] : 'Total', ...row]), alt });

function hardTwoWayTable(rng) {
  const s = rng.pick(SURVEYS);
  const cell = [[rng.int(8, 60), rng.int(8, 60)], [rng.int(8, 60), rng.int(8, 60)]];
  const rowTotal = cell.map((r) => r[0] + r[1]);
  const colTotal = [cell[0][0] + cell[1][0], cell[0][1] + cell[1][1]];
  const N = rowTotal[0] + rowTotal[1];
  const [i, j, byRow] = [rng.int(0, 1), rng.int(0, 1), rng.bool(0.5)]; // the cell asked about; whether the condition is its row or its column
  const [given, target, base, other] = byRow ? [s.rowIs[i], s.colIs[j], rowTotal[i], colTotal[j]] : [s.colIs[j], s.rowIs[i], colTotal[j], rowTotal[i]];
  const [line, name, otherName] = byRow ? ['row', s.rows[i], s.cols[j]] : ['column', s.cols[j], s.rows[i]];
  const answer = frac(cell[i][j], base);
  return q({
    prompt: `The table shows a survey of ${s.group}. One ${s.who} from the survey is chosen at random. Given that the ${s.who} ${given}, what is the probability that the ${s.who} ${target}?`,
    correct: answer,
    wrong: [
      { value: frac(cell[i][j], other), why: `That divides by the total for "${otherName}". The condition is that the ${s.who} ${given}, so divide by the total for "${name}", which is ${base}.` },
      { value: frac(cell[i][j], N), why: `Dividing by all ${N} gives the probability of both things together. "Given" narrows the group to the ${base} in the "${name}" ${line}.` },
      { value: frac(other, N), why: `That ignores the condition. Look only at the "${name}" ${line}.` },
      frac(base - cell[i][j], base), frac(base, N),
    ],
    solution: [
      `"Given that the ${s.who} ${given}" means: look only at the "${name}" ${line}. Its total is ${base}.`,
      `In that ${line}, ${cell[i][j]} are also in "${otherName}".`,
      R`\(P = ${reduced(cell[i][j], base)}\).`,
    ],
    rule: 2, skill: 'conditional probability',
    visual: surveyTable(s, [[...cell[0], rowTotal[0]], [...cell[1], rowTotal[1]], [...colTotal, N]], `Two-way table. ${s.rows[0]}: ${cell[0][0]} ${s.cols[0]}, ${cell[0][1]} ${s.cols[1]}, total ${rowTotal[0]}. ${s.rows[1]}: ${cell[1][0]} ${s.cols[0]}, ${cell[1][1]} ${s.cols[1]}, total ${rowTotal[1]}. Column totals: ${colTotal[0]} and ${colTotal[1]}. Grand total: ${N}.`),
    check: () => {
      const all = [0, 1].flatMap((r) => [0, 1].flatMap((c) => Array.from({ length: cell[r][c] }, () => [r, c])));
      const kept = all.filter(([r, c]) => (byRow ? r === i : c === j));
      return answer.eq(frac(kept.filter(([r, c]) => r === i && c === j).length, kept.length)) ? true : 'counting within the given group gives a different answer';
    },
  });
}

const COUNT_STORIES = [
  { ordered: true, max: 12, text: (n, r) => `A club has ${n} members. In how many ways can it choose ${['a president and a secretary', 'a president, a secretary and a treasurer', 'a president, a vice-president, a secretary and a treasurer'][r - 2]}, if nobody holds two posts?`, why: 'The posts are different, so the same people in different posts count as a different result' },
  { ordered: true, max: 12, text: (n, r) => `${n} runners enter a race. In how many ways can the first ${r} places be filled, if there are no ties?`, why: 'Finishing first is different from finishing second' },
  { ordered: true, max: 9, text: (n, r) => `A code is made of ${r} different digits, each chosen from the digits 1 to ${n}. How many codes are possible?`, why: 'The same digits in a different order make a different code' },
  { ordered: false, max: 12, text: (n, r) => `A teacher chooses ${r} of the ${n} students in a club to go to a conference. How many different groups can be chosen?`, why: 'The same students chosen in a different order are the same group' },
  { ordered: false, max: 12, text: (n, r) => `A pizza shop offers ${n} toppings. How many different pizzas with exactly ${r} different toppings can be ordered?`, why: 'The order in which the toppings are chosen does not change the pizza' },
  { ordered: false, max: 12, text: (n, r) => `A reader wants to take ${r} of ${n} library books on a trip. How many different sets of books are possible?`, why: 'The same books chosen in a different order are the same set' },
];

function hardArrangeOrChoose(rng) {
  const s = rng.pick(COUNT_STORIES);
  const [n, r] = [rng.int(6, s.max), rng.int(2, 4)];
  const [perms, combos] = [permutations(n, r), choose(n, r)];
  const answer = s.ordered ? perms : combos;
  return q({
    prompt: s.text(n, r),
    correct: answer,
    wrong: [
      s.ordered
        ? { value: combos, why: R`${s.why}, so the order matters. Do not divide by \(${r}!\).` }
        : { value: perms, why: R`${s.why}, so each one has been counted \(${r}! = ${factorial(r)}\) times. Divide by \(${factorial(r)}\).` },
      { value: n ** r, why: R`That allows repeats. With no repeats the number of choices drops by 1 each time: \(${falling(n, r)}\).` },
      n * r, s.ordered ? permutations(n, r - 1) : choose(n, r + 1), answer + n,
    ],
    solution: s.ordered
      ? [`${s.why}, so the order matters: count permutations.`, R`\({}_{${n}}P_{${r}} = ${falling(n, r)} = ${num(perms)}\).`]
      : [`${s.why}, so the order does not matter: count combinations.`, R`Ordered choices: \({}_{${n}}P_{${r}} = ${falling(n, r)} = ${num(perms)}\). Each group appears \(${r}! = ${factorial(r)}\) times.`, R`\({}_{${n}}C_{${r}} = ${num(perms)} \div ${factorial(r)} = ${num(combos)}\).`],
    rule: 4, skill: 'permutations and combinations',
    check: () => {
      // Count the choices one by one: sequences of r different items, or (for groups) only the increasing ones.
      const count = (chosen) => (chosen.length === r ? 1 : sum(range(1, n).filter((v) => (s.ordered ? !chosen.includes(v) : v > (chosen[chosen.length - 1] ?? 0))).map((v) => count([...chosen, v]))));
      return count([]) === answer ? true : 'listing the choices gives a different count';
    },
  });
}

function hardCompareZ(rng) {
  const name = person(rng);
  const subjects = rng.sample(['History', 'Maths', 'Science', 'English', 'Art', 'Geography'], 4);
  let [rows, best, top] = [[], null, null];
  do {
    const zs = rng.sample([-1, -0.5, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5], 4);
    rows = subjects.map((subject, i) => {
      const [sd, mean] = [rng.pick([4, 8, 12, 16, 20]), rng.int(50, 78)];
      return { subject, sd, mean, z: zs[i], x: mean + zs[i] * sd };
    });
    best = rows.reduce((p, r) => (r.z > p.z ? r : p));
    top = rows.reduce((p, r) => (r.x > p.x ? r : p));
  } while (top === best || rows.some((r) => r.x > 100 || r.x < 20) || new Set(rows.map((r) => r.x)).size < 4);
  const far = (r) => `${num(Math.abs(r.z))} standard ${Math.abs(r.z) === 1 ? 'deviation' : 'deviations'} ${r.z > 0 ? 'above' : 'below'} the class mean`;
  return q({
    prompt: `The table shows ${name}'s scores on four tests, with the class mean and standard deviation for each test. On which test did ${name} do best compared with the rest of the class?`,
    correct: best.subject,
    wrong: [
      { value: top.subject, why: `${top.x} is the highest score, but it is only ${far(top)}. Compare z-scores, not raw scores.` },
      ...rows.filter((r) => r !== best && r !== top).map((r) => ({ value: r.subject, why: `That score is ${far(r)}. The best result is ${far(best)}.` })),
    ],
    solution: [
      R`Find each z-score with \(z = \dfrac{x - \mu}{\sigma}\).`,
      `${rows.map((r) => R`${r.subject}: \(\dfrac{${r.x} - ${r.mean}}{${r.sd}} = ${num(r.z)}\)`).join('. ')}.`,
      R`The highest z-score is \(${num(best.z)}\), so ${name} did best in ${best.subject} compared with the class.`,
    ],
    rule: 6, skill: 'comparing with z-scores',
    visual: { type: 'table', headers: ['Test', 'Score', 'Class mean', 'Standard deviation'], rowHeaders: true, rows: rows.map((r) => [r.subject, r.x, r.mean, r.sd]), alt: `Table of four tests. ${rows.map((r) => `${r.subject}: score ${r.x}, class mean ${r.mean}, standard deviation ${r.sd}`).join('. ')}.` },
    check: () => (rows.every((r) => r === best || (r.x - r.mean) / r.sd < (best.x - best.mean) / best.sd) ? true : 'another test has a z-score at least as high'),
  });
}

// ───────────── Challenge ─────────────

function challengeIndependentTable(rng) {
  const s = rng.pick(SURVEYS);
  const [u, v] = rng.pick([[1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 5], [4, 5], [3, 8], [5, 8]]);
  const k = rng.int(4, 12);
  const m = rng.intExcept(3, 12, [k]);
  const [a, T1, c, T2] = [u * k, v * k, u * m, v * m];
  const p = frac(u, v);
  return q({
    prompt: `The table shows part of a survey of ${s.group}. ${s.free(T2)}`,
    correct: c,
    wrong: [
      { value: a, why: 'Independent means the same proportion in each group, not the same count.' },
      { value: T2 - c, why: `That is the number for "${s.cols[1]}". The question asks about "${s.cols[0]}".` },
      a + T2 - T1 > 0 ? { value: a + T2 - T1, why: 'Compare proportions, not differences. Adding the difference between the totals does not keep the probability the same.' } : null,
      whole(T2 / 2), c + m,
    ],
    solution: [
      R`In the first row, \(P(\text{${s.cols[0]}}) = ${reduced(a, T1)}\).`,
      'Independent means the row makes no difference: this probability is the same in the second row.',
      R`\(${p.tex()} \cdot ${T2} = ${c}\).`,
    ],
    rule: 2, skill: 'independence in a table',
    visual: surveyTable(s, [[a, T1 - a, T1], ['?', '?', T2]], `Two-way table with a missing row. ${s.rows[0]}: ${a} ${s.cols[0]}, ${T1 - a} ${s.cols[1]}, total ${T1}. ${s.rows[1]}: the two counts are not shown, total ${T2}.`),
    check: () => (a * T2 === c * T1 && a * (T1 + T2) === T1 * (a + c) ? true : 'with this count the two events are not independent'),
  });
}

const GROUPS = [
  { text: (g1, g2, r) => `A club has ${g1} seniors and ${g2} juniors. A committee of ${r} is chosen at random.`, ask: (k, r) => `exactly ${k} of the ${r} committee members are seniors`, A: 'seniors', B: 'juniors' },
  { text: (g1, g2, r) => `A bag holds ${g1} red marbles and ${g2} blue marbles. ${cap(['three', 'four'][r - 3])} marbles are taken out at random, all at once.`, ask: (k) => `exactly ${k} of them ${k === 1 ? 'is' : 'are'} red`, A: 'red marbles', B: 'blue marbles' },
  { text: (g1, g2, r) => `A box holds ${g1} new batteries and ${g2} used batteries. ${cap(['three', 'four'][r - 3])} batteries are picked at random, all at once.`, ask: (k) => `exactly ${k} of them ${k === 1 ? 'is' : 'are'} new`, A: 'new batteries', B: 'used batteries' },
];

function challengeCommittee(rng) {
  const s = rng.pick(GROUPS);
  const [g1, g2, r] = [rng.int(3, 7), rng.int(3, 7), rng.int(3, 4)];
  const k = rng.int(1, r - 1);
  const n = g1 + g2;
  const [waysA, waysB, total] = [choose(g1, k), choose(g2, r - k), choose(n, r)];
  const answer = frac(waysA * waysB, total);
  return q({
    prompt: `${s.text(g1, g2, r)} What is the probability that ${s.ask(k, r)}?`,
    correct: answer,
    wrong: [
      { value: frac(waysA, total), why: R`The other \(${r - k}\) must be chosen from the \(${g2}\) ${s.B}. Multiply by \({}_{${g2}}C_{${r - k}} = ${waysB}\).` },
      { value: frac(waysA + waysB, total), why: `Every choice of ${s.A} can go with every choice of ${s.B}, so multiply the two counts. Do not add them.` },
      { value: frac(waysA * waysB, permutations(n, r)), why: 'The top counts groups, where order does not matter, so the bottom must be a combination too.' },
      frac(k, r), frac(g1, n).pow(k).mul(frac(g2, n).pow(r - k)),
    ],
    solution: [
      R`All the groups of \(${r}\) are equally likely, and there are \({}_{${n}}C_{${r}} = ${total}\) of them.`,
      R`Choose \(${k}\) of the \(${g1}\) ${s.A} and \(${r - k}\) of the \(${g2}\) ${s.B}: \({}_{${g1}}C_{${k}} \cdot {}_{${g2}}C_{${r - k}} = ${waysA} \cdot ${waysB} = ${waysA * waysB}\).`,
      R`\(P = ${reduced(waysA * waysB, total)}\).`,
    ],
    rule: 4, skill: 'probability with combinations',
    check: () => {
      // List every group of r (as increasing lists of the n items; items 1 to g1 are of the first kind).
      const groups = (chosen) => (chosen.length === r ? [chosen] : range((chosen[chosen.length - 1] ?? 0) + 1, n).flatMap((v) => groups([...chosen, v])));
      const all = groups([]);
      return answer.eq(frac(all.filter((g) => g.filter((v) => v <= g1).length === k).length, all.length)) ? true : 'listing every group gives a different answer';
    },
  });
}

function challengeNormal(rng) {
  const { s, mean, sd, at, phrase, setup } = pickNormal(rng);
  if (rng.bool(0.6)) {
    const [lo, hi] = rng.pick([[-1, 2], [-2, 1], [1, 2], [-2, -1], [1, Infinity], [-Infinity, -1], [2, Infinity], [-Infinity, -2]]);
    const N = 200 * rng.pick([1, 2, 3, 4, 5, 10, 20]);
    const value = ruleArea(lo, hi);
    const of = (p) => round((p * N) / 100, 6);
    const k = Math.max(...[lo, hi].filter(Number.isFinite).map(Math.abs));
    const mid = ruleArea(-k, k);
    const wrong = Number.isFinite(lo) && Number.isFinite(hi)
      ? lo < 0 && hi > 0
        ? [{ value: of(95), why: R`\(95\%\) is for 2 standard deviations on **both** sides of the mean. This interval reaches only 1 standard deviation on one side.` }, { value: of(68), why: R`\(68\%\) covers only 1 standard deviation each side. This interval reaches 2 standard deviations on one side.` }, of(47.5), of(84)]
        : [{ value: of(27), why: R`\(95\% - 68\% = 27\%\) is for both sides of the mean together. This interval is on one side only, so take half.` }, { value: of(47.5), why: R`\(47.5\%\) starts at the mean. Take away the \(34\%\) between the mean and 1 standard deviation.` }, of(34), of(2.5)]
      : [{ value: of(round(100 - mid, 2)), why: R`\(${round(100 - mid, 2)}\%\) is outside the middle \(${mid}\%\) in both tails together. One tail has half of that.` }, { value: of(mid), why: 'That counts the middle of the distribution. The question asks for one tail.' }, of(ruleArea(0, k)), of(50)];
    return q({
      prompt: `${setup} In a group of ${txt(N)} ${s.items}, about how many of ${s.plural} would you expect to be ${phrase(lo, hi)}? Use the 68–95–99.7 rule.`,
      correct: of(value),
      wrong,
      solution: [
        `${[lo, hi].filter(Number.isFinite).map((z) => `${at(z)} is ${sds(Math.abs(z))} ${z < 0 ? 'below' : 'above'} the mean`).join(', and ')}.`,
        R`Add the bands of the normal curve in that region: \(${bandsIn(lo, hi).map((b) => `${b}\\%`).join(' + ')} = ${value}\%\).`,
        R`\(${value}\%\) of \(${N}\) is \(${num(value / 100)} \cdot ${N} = ${num(of(value))}\).`,
      ],
      rule: 5, skill: '68–95–99.7 rule',
      check: () => (Math.abs(of(value) - (area(lo, hi) * N) / 100) <= 0.005 * N ? true : `the normal curve gives about ${(area(lo, hi) * N) / 100}`),
    });
  }
  const k = rng.pick([1, 2, 2, 3]);
  const mid = ruleArea(-k, k);
  const width = 2 * k * sd;
  const unit = s.unit.trim() || undefined;
  const slip = { 1: 'That is the whole width of the interval', 2: 'That is half the width: the distance from the mean to either end', 4: R`Dividing the width by 4 is right for the middle \(95\%\), which is 2 standard deviations each side`, 6: R`Dividing the width by 6 is right for the middle \(99.7\%\), which is 3 standard deviations each side` };
  return q({
    prompt: `${s.what} are normally distributed. About ${mid}% of ${s.plural} are between ${at(-k)} and ${at(k)}${s.unit}, an interval centred on the mean. What is the standard deviation?`,
    correct: sd,
    unit,
    wrong: [2, 1, 4, 6].filter((d) => d !== 2 * k).map((d) => ({ value: whole(width / d), why: `${slip[d]}. The middle ${mid}% reaches ${sds(k)} each side of the mean.` })),
    solution: [
      `About ${mid}% of the values of a normal distribution lie within ${sds(k)} of the mean.`,
      R`So the interval is \(${2 * k}\) standard deviations wide. Its width is \(${mean + k * sd} - ${mean - k * sd} = ${width}\).`,
      R`\(\sigma = ${width} \div ${2 * k} = ${sd}\).`,
    ],
    rule: 5, skill: '68–95–99.7 rule',
    check: () => {
      const inside = (100 * integrate((x) => bell((x - mean) / sd), mean - k * sd, mean + k * sd)) / (sd * Math.sqrt(2 * Math.PI));
      return Math.abs(inside - mid) < 0.5 ? true : `with this standard deviation the interval holds ${inside}%`;
    },
  });
}

// ───────────── Models ─────────────

function drawModel({ red, blue, replace }) {
  const back = replace === 'yes';
  const n = red + blue;
  const d2 = back ? n : n - 1;
  const left = (count) => (back ? count : count - 1); // how many of the same colour are there for the second draw
  const [RR, BB, mixed] = [frac(red * left(red), n * d2), frac(blue * left(blue), n * d2), frac(2 * red * blue, n * d2)];
  const product = (c1, c2) => R`\(${fracTex(c1, n)} \cdot ${fracTex(c2, d2)}\)`;
  return {
    problem: `A bag holds ${plural(red, 'red marble')} and ${plural(blue, 'blue marble')}. Two marbles are drawn at random, one after the other, ${back ? 'and the first is put back before the second is drawn' : 'without replacement'}. Find the probability of two reds, of two blues, and of one of each colour.`,
    steps: [
      back ? `The first marble is put back, so the second draw is from all ${n} marbles again. The draws are independent.` : `The first marble is not put back, so the second draw is from ${n - 1} marbles. The draws are dependent.`,
      R`Two reds: \(${fracTex(red, n)} \cdot ${fracTex(left(red), d2)} = ${reduced(red * left(red), n * d2)}\).`,
      R`Two blues: \(${fracTex(blue, n)} \cdot ${fracTex(left(blue), d2)} = ${reduced(blue * left(blue), n * d2)}\).`,
      R`One of each colour can happen as red then blue, or as blue then red: \(${fracTex(red, n)} \cdot ${fracTex(blue, d2)} + ${fracTex(blue, n)} \cdot ${fracTex(red, d2)} = ${reduced(2 * red * blue, n * d2)}\).`,
      R`Check: these three results cover every possibility, and \(${RR.tex()} + ${BB.tex()} + ${mixed.tex()} = 1\).`,
    ],
    answer: R`Two reds: \(${RR.tex()}\). Two blues: \(${BB.tex()}\). One of each: \(${mixed.tex()}\).`,
    visual: {
      type: 'table',
      caption: 'The four ordered results',
      headers: ['First draw', 'Second draw', 'Probability'],
      rows: [['red', 'red', product(red, left(red))], ['red', 'blue', product(red, blue)], ['blue', 'red', R`\(${fracTex(blue, n)} \cdot ${fracTex(red, d2)}\)`], ['blue', 'blue', R`\(${fracTex(blue, n)} \cdot ${fracTex(left(blue), d2)}\)`]],
    },
  };
}

function normalModel({ mean, sd, x }) {
  const z = (x - mean) / sd;
  const zr = round(z, 2);
  const below = area(-Infinity, z);
  const share = below > 99.9 ? 'more than 99.9%' : below < 0.1 ? 'less than 0.1%' : `about ${txt(below, { places: 1 })}%`;
  const size = Math.abs(z);
  const where = size <= 1 ? 'within 1 standard deviation of the mean, like about 68% of all values' : size <= 2 ? 'between 1 and 2 standard deviations from the mean. About 95% of all values are within 2' : size <= 3 ? 'between 2 and 3 standard deviations from the mean. Only about 5% of all values are 2 or more away' : 'more than 3 standard deviations from the mean. Only about 0.3% of all values are that far away';
  const curve = (v) => bell((v - mean) / sd);
  return {
    problem: R`A normal distribution has mean \(\mu = ${num(mean)}\) and standard deviation \(\sigma = ${num(sd)}\). Describe the value \(x = ${num(x)}\).`,
    steps: [
      R`\(z = \dfrac{x - \mu}{\sigma} = \dfrac{${num(x)} - ${num(mean)}}{${num(sd)}} ${z === zr ? '=' : R`\approx`} ${num(zr)}\).`,
      z === 0 ? 'The value is exactly at the mean.' : `The value is ${z > 0 ? 'above' : 'below'} the mean. It is ${where}.`,
      `The shaded area to the left of the value shows the share of values below it: ${share} (found with technology).`,
    ],
    answer: R`\(z ${z === zr ? '=' : R`\approx`} ${num(zr)}\). ${cap(share)} of the values are below \(${num(x)}\).`,
    visual: {
      type: 'plot',
      x: [mean - 4 * sd, mean + 4 * sd],
      y: [0, 1.25],
      step: [sd, 2],
      fns: [{ f: curve }],
      shade: [{ f: curve, from: mean - 4 * sd, to: Math.min(Math.max(x, mean - 4 * sd), mean + 4 * sd) }],
      vlines: [{ x: mean }],
      points: size < 3.9 ? [{ x, y: curve(x), label: `z ${z === zr ? '=' : '≈'} ${txt(zr)}` }] : [],
      alt: `Bell-shaped normal curve centred at ${txt(mean)}, with a dashed line at the mean. The area under the curve to the left of ${txt(x)} is shaded: ${share} of the total.`,
    },
  };
}

export default {
  id: 'probability-statistics',
  title: 'Probability & the Normal Distribution',
  summary: 'Find probabilities of combined events, count with permutations and combinations, and use the normal distribution.',
  standards: ['CCSS S-CP.A.2', 'CCSS S-CP.A.3', 'CCSS S-CP.B.6', 'CCSS S-CP.B.7', 'CCSS S-CP.B.9', 'CCSS S-ID.A.4'],

  explain: {
    intro: 'Probability measures how likely an event is, on a scale from 0 to 1. For two events the key questions are whether both must happen ("and") or at least one ("or"), and whether one event changes the chances of the other. Counting methods give the numbers of outcomes when listing them all would take too long. The normal distribution describes data that pile up symmetrically around a mean.',
    rules: [
      {
        title: 'Independent events: multiply',
        text: R`Two events are independent when one happening does not change the probability of the other. Then \(P(A \text{ and } B) = P(A) \cdot P(B)\).`,
        example: R`A coin and a die: \(P(\text{heads and a 6}) = \frac{1}{2} \cdot \frac{1}{6} = \frac{1}{12}\).`,
      },
      {
        title: 'Dependent events: adjust the second probability',
        text: R`When the first event changes what is left for the second, use \(P(A \text{ and } B) = P(A) \cdot P(B \mid A)\), where \(P(B \mid A)\) is the probability of \(B\) once \(A\) has happened. Drawing without replacement works this way.`,
        example: R`From 5 red and 3 blue marbles, two reds without replacement: \(\frac{5}{8} \cdot \frac{4}{7} = \frac{5}{14}\).`,
      },
      {
        title: 'Conditional probability',
        text: R`\(P(B \mid A)\) counts only the outcomes where \(A\) happened: \(P(B \mid A) = \dfrac{P(A \text{ and } B)}{P(A)}\). In a two-way table, the row or column for \(A\) becomes the new total. \(A\) and \(B\) are independent exactly when \(P(B \mid A) = P(B)\).`,
        example: R`If 42 of the 70 grade-11 students play a sport, then \(P(\text{sport} \mid \text{grade 11}) = \frac{42}{70} = \frac{3}{5}\).`,
      },
      {
        title: 'The addition rule',
        text: R`\(P(A \text{ or } B) = P(A) + P(B) - P(A \text{ and } B)\). The subtraction removes the outcomes that were counted twice. Mutually exclusive events cannot happen together, so for them \(P(A \text{ and } B) = 0\) and the probabilities simply add.`,
        example: R`Cards numbered 1 to 20: \(P(\text{even or a multiple of 5}) = \frac{10}{20} + \frac{4}{20} - \frac{2}{20} = \frac{3}{5}\).`,
      },
      {
        title: 'Permutations and combinations',
        text: R`A permutation is an arrangement, where order matters: \({}_{n}P_{r} = \dfrac{n!}{(n - r)!}\). A combination is a selection, where order does not matter: \({}_{n}C_{r} = \dfrac{n!}{r!\,(n - r)!}\). When all outcomes are equally likely, a probability is the number of favourable outcomes divided by the total number.`,
        example: R`From 10 runners, the medals can go in \({}_{10}P_{3} = 10 \cdot 9 \cdot 8 = 720\) ways, but a team of 3 can be picked in \({}_{10}C_{3} = 720 \div 6 = 120\) ways.`,
      },
      {
        title: 'The normal distribution',
        text: R`A normal distribution is a symmetric bell shape centred on its mean \(\mu\). About \(68\%\) of the values lie within 1 standard deviation \(\sigma\) of the mean, \(95\%\) within 2, and \(99.7\%\) within 3. By symmetry, each side of the mean holds \(34\%\) in the first standard deviation, \(13.5\%\) in the second and \(2.35\%\) in the third, with \(0.15\%\) beyond.`,
        example: R`With \(\mu = 500\) and \(\sigma = 100\), about \(95\%\) of the values are between 300 and 700, so about \(2.5\%\) are above 700.`,
      },
      {
        title: 'z-scores',
        text: R`The z-score \(z = \dfrac{x - \mu}{\sigma}\) tells how many standard deviations a value is above the mean (positive) or below it (negative). z-scores make values from different distributions comparable.`,
        example: R`A score of 620 where \(\mu = 500\) and \(\sigma = 100\) has \(z = 1.2\). A score of 27 where \(\mu = 21\) and \(\sigma = 4\) has \(z = 1.5\), so the 27 is the better result.`,
      },
    ],
    vocab: [
      { term: 'independent events', def: 'Events where one happening does not change the probability of the other.' },
      { term: 'conditional probability', def: R`The probability of \(B\) given that \(A\) has happened, written \(P(B \mid A)\).` },
      { term: 'mutually exclusive', def: 'Events that cannot both happen in the same trial.' },
      { term: 'factorial', def: R`\(n! = n \cdot (n - 1) \cdots 2 \cdot 1\), the number of ways to arrange \(n\) different things in a row.` },
      { term: 'permutation, combination', def: 'A permutation is an ordered arrangement. A combination is a group in which order does not matter.' },
      { term: 'standard deviation', def: R`A measure of how spread out data are around the mean, written \(\sigma\).` },
      { term: 'z-score', def: 'The number of standard deviations between a value and the mean.' },
    ],
    mistakes: [
      'Forgetting that the totals change. Without replacement, the second fraction has one fewer in the bottom, and often one fewer in the top.',
      R`Adding for "or" without removing the overlap. Outcomes in both events must be subtracted once.`,
      R`Mixing up \(P(B \mid A)\) and \(P(A \mid B)\). The event after the bar is the condition, and it sets the total.`,
      'Using a permutation when order does not matter. A committee of Ana, Ben and Kai is the same committee in any order.',
      R`Giving \(5\%\) for one tail beyond 2 standard deviations. \(5\%\) is both tails together, so one tail is \(2.5\%\).`,
    ],
    visual: {
      type: 'plot',
      x: [100, 900],
      y: [0, 1.75],
      step: [100, 2],
      fns: [{ f: (x) => bell((x - 500) / 100) }],
      shade: [{ f: (x) => bell((x - 500) / 100), from: 200, to: 800, color: 'c' }, { f: (x) => bell((x - 500) / 100), from: 300, to: 700, color: 'b' }, { f: (x) => bell((x - 500) / 100), from: 400, to: 600, color: 'a' }],
      segments: [{ from: [400, 1.12], to: [600, 1.12], label: '68%', color: 'a' }, { from: [300, 1.34], to: [700, 1.34], label: '95%', color: 'b' }, { from: [200, 1.56], to: [800, 1.56], label: '99.7%', color: 'c' }],
      alt: 'Bell-shaped normal curve with mean 500 and standard deviation 100. About 68% of the area lies between 400 and 600, about 95% between 300 and 700, and about 99.7% between 200 and 800.',
    },
  },

  examples: [
    {
      title: 'With and without replacement',
      problem: 'A bag holds 5 red marbles and 3 blue marbles. Two marbles are drawn at random. Find the probability that both are red (a) if the first marble is put back, and (b) if it is not.',
      steps: [
        R`(a) The first marble is put back, so the draws are independent: \(\frac{5}{8} \cdot \frac{5}{8} = \frac{25}{64}\).`,
        R`(b) The first marble is not put back. After one red is taken, 4 of the 7 marbles left are red.`,
        R`\(\frac{5}{8} \cdot \frac{4}{7} = \frac{20}{56} = \frac{5}{14}\).`,
      ],
      answer: R`(a) \(\frac{25}{64}\)  (b) \(\frac{5}{14}\)`,
    },
    {
      title: 'Conditional probability from a two-way table',
      problem: 'The table shows a survey of 150 students. A student is chosen at random. (a) Given that the student is in grade 11, what is the probability that the student plays a sport? (b) Is playing a sport independent of being in grade 11?',
      steps: [
        R`(a) Look only at the grade 11 row. Its total is 70, and 42 of those play a sport: \(\frac{42}{70} = \frac{3}{5}\).`,
        R`(b) For all students, \(P(\text{sport}) = \frac{72}{150} = \frac{12}{25}\).`,
        R`\(\frac{3}{5}\) is not equal to \(\frac{12}{25}\), so knowing the grade changes the probability. The events are not independent.`,
      ],
      answer: R`(a) \(\frac{3}{5}\)  (b) Not independent`,
      visual: { type: 'table', headers: ['Group', 'Plays a sport', 'No sport', 'Total'], rowHeaders: true, rows: [['Grade 11', 42, 28, 70], ['Grade 12', 30, 50, 80], ['Total', 72, 78, 150]] },
    },
    {
      title: 'The addition rule',
      problem: 'Cards numbered from 1 to 30 are shuffled and one is drawn. What is the probability that its number is a multiple of 3 or a multiple of 5?',
      steps: [
        'Multiples of 3: 10 cards. Multiples of 5: 6 cards.',
        'Both (multiples of 15): the cards 15 and 30. They are in both groups, so subtract them once.',
        R`\(\frac{10}{30} + \frac{6}{30} - \frac{2}{30} = \frac{14}{30} = \frac{7}{15}\).`,
      ],
      answer: R`\(\frac{7}{15}\)`,
    },
    {
      title: 'Word problem: choosing a committee',
      word: true,
      problem: 'A club has 6 seniors and 4 juniors. A committee of 3 is chosen at random. What is the probability that exactly 2 of the committee members are seniors?',
      steps: [
        R`Order does not matter in a committee, so count combinations. Total: \({}_{10}C_{3} = \dfrac{10 \cdot 9 \cdot 8}{3 \cdot 2 \cdot 1} = 120\) equally likely committees.`,
        R`Favourable: choose 2 of the 6 seniors and 1 of the 4 juniors: \({}_{6}C_{2} \cdot {}_{4}C_{1} = 15 \cdot 4 = 60\).`,
        R`\(P = \frac{60}{120} = \frac{1}{2}\).`,
      ],
      answer: R`\(\frac{1}{2}\)`,
    },
    {
      title: 'Word problem: light bulbs and the normal distribution',
      word: true,
      problem: 'The lifetimes of a brand of light bulb are normally distributed with mean 1,200 hours and standard deviation 100 hours. (a) About what percent of the bulbs last more than 1,400 hours? (b) What is the z-score of a bulb that lasts 1,050 hours?',
      steps: [
        R`(a) 1,400 is 2 standard deviations above the mean: \(1200 + 2 \cdot 100 = 1400\).`,
        R`About \(95\%\) of the bulbs are within 2 standard deviations of the mean. That leaves \(5\%\) outside, split equally between the two tails: \(2.5\%\) last more than 1,400 hours.`,
        R`(b) \(z = \dfrac{1050 - 1200}{100} = -1.5\). The bulb is 1.5 standard deviations below the mean.`,
      ],
      answer: R`(a) About \(2.5\%\)  (b) \(z = -1.5\)`,
    },
  ],

  models: [
    {
      id: 'two-marbles',
      title: 'Word problem: drawing two marbles',
      word: true,
      intro: 'Change the bag, and choose whether the first marble is put back.',
      inputs: [
        { name: 'red', label: 'Red marbles', type: 'int', min: 1, max: 12, value: 5 },
        { name: 'blue', label: 'Blue marbles', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'replace', label: 'Is the first marble put back?', type: 'select', value: 'no', options: [{ value: 'no', label: 'no (without replacement)' }, { value: 'yes', label: 'yes (with replacement)' }] },
      ],
      compute: drawModel,
    },
    {
      id: 'normal-curve',
      title: 'A value on the normal curve',
      intro: 'Choose a mean, a standard deviation and a value. The graph shades the share of values below it.',
      inputs: [
        { name: 'mean', label: 'Mean μ', type: 'number', min: 0, max: 1000, step: 1, value: 500 },
        { name: 'sd', label: 'Standard deviation σ', type: 'number', min: 1, max: 200, step: 1, value: 100 },
        { name: 'x', label: 'Value x', type: 'number', min: 0, max: 1500, step: 1, value: 650 },
      ],
      compute: normalModel,
    },
  ],

  quiz: {
    easy: [easyIndependent, easyCounting, easyZScore],
    medium: [mediumDependent, mediumAddition, mediumEmpirical],
    hard: [hardTwoWayTable, hardArrangeOrChoose, hardCompareZ],
    challenge: [challengeIndependentTable, challengeCommittee, challengeNormal],
  },
};
