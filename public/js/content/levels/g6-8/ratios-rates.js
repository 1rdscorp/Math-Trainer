import { R, q, num, frac, gcd, money, txt, person, people, round, approx } from '../../lib/index.js';
import { M, ratio, tape, unitFmt, clean, fracLabel, usd, an, singular } from './_shared.js';

// Whole numbers with a comma from 1,000 up, for math mode and as a choice formatter.
const N = (x) => num(x, { commas: true });
const big = { commas: true };

function coprimePair(rng, lo, hi) {
  for (;;) {
    const a = rng.int(lo, hi);
    const b = rng.int(lo, hi);
    if (a !== b && gcd(a, b) === 1) return [a, b];
  }
}

const GROUPS = [
  { x: 'cats', y: 'dogs', all: 'pets', lead: 'An animal shelter has' },
  { x: 'apples', y: 'oranges', all: 'pieces of fruit', lead: 'A bowl holds' },
  { x: 'red marbles', y: 'blue marbles', all: 'marbles', lead: 'A bag holds' },
  { x: 'forks', y: 'spoons', all: 'utensils', lead: 'A drawer holds' },
  { x: 'trucks', y: 'cars', all: 'vehicles', lead: 'A parking lot has' },
  { x: 'pens', y: 'pencils', all: 'writing tools', lead: 'A pencil case holds' },
  { x: 'goats', y: 'sheep', all: 'animals', lead: 'A farm has' },
  { x: 'roses', y: 'tulips', all: 'flowers', lead: 'A vase holds' },
];

const TAPES = [
  { x: 'boys', y: 'girls', all: 'students', lx: 'Boys', ly: 'Girls', intro: 'In a school club, the ratio of boys to girls is' },
  { x: 'cats', y: 'dogs', all: 'pets', lx: 'Cats', ly: 'Dogs', intro: 'At an animal shelter, the ratio of cats to dogs is' },
  { x: 'red beads', y: 'blue beads', all: 'beads', lx: 'Red', ly: 'Blue', intro: 'On a necklace, the ratio of red beads to blue beads is' },
  { x: 'adults', y: 'children', all: 'people', lx: 'Adults', ly: 'Children', intro: 'On a bus, the ratio of adults to children is' },
  { x: 'wins', y: 'losses', all: 'games', lx: 'Wins', ly: 'Losses', intro: 'For one team, the ratio of wins to losses is' },
  { x: 'apple trees', y: 'pear trees', all: 'trees', lx: 'Apple', ly: 'Pear', intro: 'In an orchard, the ratio of apple trees to pear trees is' },
];

const twoTapes = (c, a, b, box) =>
  tape([{ label: c.lx, count: a, shade: 'a', box }, { label: c.ly, count: b, shade: 'b', box }], `A tape diagram: ${a} equal ${a === 1 ? 'box' : 'boxes'} for ${c.x} and ${b} ${b === 1 ? 'box' : 'boxes'} of the same size for ${c.y}.`);

// ───────────── Easy: ratio language, equivalent ratios, unit rates with whole numbers ─────────────

function easyWriteRatio(rng) {
  const c = rng.pick(GROUPS);
  const [a, b] = coprimePair(rng, 2, 9);
  const t = a + b;
  const xFirst = rng.bool();
  const toAll = rng.bool(0.4);
  const first = xFirst ? { name: c.x, n: a } : { name: c.y, n: b };
  const other = xFirst ? { name: c.y, n: b } : { name: c.x, n: a };
  return q({
    prompt: `${c.lead} ${a} ${c.x} and ${b} ${c.y}. What is the ratio of ${first.name} to ${toAll ? `all the ${c.all}` : other.name}?`,
    correct: toAll ? ratio(first.n, t) : ratio(first.n, other.n),
    wrong: toAll
      ? [
          { value: ratio(first.n, other.n), why: `That compares ${first.name} with ${other.name}. The question asks about all the ${c.all}, so the second number is the total.` },
          { value: ratio(t, first.n), why: `Order matters. The ${first.name} are named first, so their number goes first.` },
          ratio(other.n, t),
          ratio(other.n, first.n),
        ]
      : [
          { value: ratio(other.n, first.n), why: `Order matters. The ${first.name} are named first, so their number goes first.` },
          { value: ratio(first.n, t), why: `That compares ${first.name} with all the ${c.all}. The question asks about ${other.name}.` },
          ratio(other.n, t),
          ratio(t, first.n),
        ],
    solution: toAll
      ? [
          R`Find the total: \(${a} + ${b} = ${t}\) ${c.all}.`,
          `The ratio names ${first.name} first and all the ${c.all} second.`,
          `So the ratio is ${ratio(first.n, t)}.`,
        ]
      : [`There are ${first.n} ${first.name} and ${other.n} ${other.name}.`, `The ratio names ${first.name} first, so write that number first.`, `The ratio is ${ratio(first.n, other.n)}.`],
    rule: 0,
    skill: 'writing ratios',
    visual: { type: 'counters', groups: [{ count: a, color: 'a' }, { count: b, color: 'b' }], alt: `${a} blue counters for the ${c.x} and ${b} orange counters for the ${c.y}.` },
  });
}

function easySimplify(rng) {
  const [a, b] = coprimePair(rng, 1, 9);
  const k = rng.int(2, 9);
  const A = a * k;
  const B = b * k;
  const p = [2, 3].find((d) => k % d === 0 && k > d);
  return q({
    prompt: `Write the ratio ${ratio(A, B)} in simplest form.`,
    correct: ratio(a, b),
    wrong: [
      p ? { value: ratio(A / p, B / p), why: R`\(${A / p}\) and \(${B / p}\) still share the factor \(${k / p}\). Keep dividing until the only common factor is 1.`, form: true } : null,
      { value: ratio(a, B), why: 'Only the first number was divided. Divide both parts by the same number.' },
      { value: ratio(b, a), why: 'These are the right numbers in the wrong order.' },
      ratio(A, b),
      ratio(a + 1, b),
    ],
    solution: [
      R`Find the greatest number that divides both \(${A}\) and \(${B}\). It is \(${k}\).`,
      R`Divide both parts by \(${k}\): \(${A} \div ${k} = ${a}\) and \(${B} \div ${k} = ${b}\).`,
      `The simplest form is ${ratio(a, b)}.`,
    ],
    rule: 1,
    skill: 'equivalent ratios',
    check: () => (a * B === b * A && gcd(a, b) === 1 ? true : 'not the same ratio in lowest terms'),
  });
}

function easyEquivalent(rng) {
  const [a, b] = coprimePair(rng, 1, 9);
  const k = rng.int(2, 6);
  return q({
    prompt: `Which ratio is equivalent to ${ratio(a, b)}?`,
    correct: ratio(k * a, k * b),
    wrong: [
      { value: ratio(a + k, b + k), why: 'Adding the same number to both parts changes the ratio. Multiply both parts by the same number instead.' },
      { value: ratio(k * b, k * a), why: 'These are the right numbers in the wrong order.' },
      ratio(k * a, (k + 1) * b),
      ratio((k + 1) * a, k * b),
    ],
    solution: [
      'Equivalent ratios come from multiplying (or dividing) both parts by the same number.',
      R`Multiply both parts by \(${k}\): \(${a} \times ${k} = ${k * a}\) and \(${b} \times ${k} = ${k * b}\).`,
      `So ${ratio(k * a, k * b)} is equivalent to ${ratio(a, b)}.`,
    ],
    rule: 1,
    skill: 'equivalent ratios',
    check: () => (a * (k * b) === b * (k * a) ? true : 'ratios are not equivalent'),
  });
}

const TABLES = [
  ['Cups of flour', 'Cups of milk'],
  ['Blue paint (cups)', 'White paint (cups)'],
  ['Hours', 'Miles'],
  ['Tickets', 'Cost ($)'],
  ['Scoops of mix', 'Cups of water'],
  ['Laps', 'Minutes'],
  ['Bags', 'Oranges'],
  ['Rows', 'Seats'],
];

function easyTableMissing(rng) {
  const [hx, hy] = rng.pick(TABLES);
  const [a, b] = coprimePair(rng, 1, 7);
  const mults = rng.pick([[1, 2, 3, 4], [1, 2, 3, 5], [1, 2, 4, 5], [1, 3, 4, 6], [1, 2, 5, 10], [1, 3, 5, 6]]);
  const row = rng.int(1, 3);
  const hideY = rng.bool();
  const xs = mults.map((k) => a * k);
  const ys = mults.map((k) => b * k);
  const k = mults[row];
  const ans = hideY ? ys[row] : xs[row];
  const known = hideY ? xs : ys;
  const hidden = hideY ? ys : xs;
  const [kName, kPart, hPart] = hideY ? [hx, a, b] : [hy, b, a];
  return q({
    prompt: 'The rows of this table are equivalent ratios. What number is missing?',
    visual: {
      type: 'table',
      headers: [hx, hy],
      rows: mults.map((_, i) => [i === row && !hideY ? '?' : xs[i], i === row && hideY ? '?' : ys[i]]),
      alt: `A ratio table with columns ${hx} and ${hy}. One entry is missing.`,
    },
    correct: ans,
    wrong: [
      { value: hidden[row - 1] + (known[row] - known[row - 1]), why: 'Going down a ratio table, both columns are multiplied by the same number. They do not go up by the same amount.' },
      ans + hPart,
      ans - hPart,
      known[row],
    ],
    solution: [
      `The first row gives the ratio ${ratio(a, b)}.`,
      kPart === 1
        ? R`In the row with the missing number, the "${kName}" column shows \(${known[row]}\). The first row shows \(1\) there, so this row is \(${k}\) times the first row.`
        : R`In the row with the missing number, the "${kName}" column shows \(${known[row]}\). Since \(${known[row]} \div ${kPart} = ${k}\), this row is \(${k}\) times the first row.`,
      R`Multiply the other part by \(${k}\) too: \(${hPart} \times ${k} = ${ans}\).`,
    ],
    rule: 1,
    skill: 'ratio tables',
    check: () => ((hideY ? xs[row] * b === ans * a : ans * b === ys[row] * a) ? true : 'row is not equivalent to the first row'),
  });
}

function easyUnitRate(rng) {
  const p = person(rng);
  const n = rng.int(2, 9);
  const kind = rng.pick(['price', 'speed', 'pages', 'pay', 'water']);
  let u;
  let prompt;
  let fmt;
  let one;
  if (kind === 'price') {
    const [item, single] = rng.pick([['notebooks', 'notebook'], ['pens', 'pen'], ['muffins', 'muffin'], ['bus tickets', 'bus ticket'], ['bottles of water', 'bottle of water']]);
    u = rng.pick([0.5, 0.75, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6]);
    prompt = (T) => `${p} pays ${money(T)} for ${n} ${item}. Each one costs the same. What is the price of 1 ${single}?`;
    fmt = money;
    one = single;
  } else if (kind === 'speed') {
    u = rng.int(35, 65);
    prompt = (T) => `A train travels ${T} miles in ${n} hours at a constant speed. How many miles does it travel in 1 hour?`;
    fmt = unitFmt('mile');
    one = 'hour';
  } else if (kind === 'pages') {
    u = rng.int(12, 40);
    prompt = (T) => `${p} reads ${T} pages in ${n} hours, reading at a steady rate. How many pages does ${p} read in 1 hour?`;
    fmt = unitFmt('page');
    one = 'hour';
  } else if (kind === 'pay') {
    u = rng.int(8, 20);
    prompt = (T) => `${p} earns ${money(T)} for ${n} hours of work. How much does ${p} earn for 1 hour?`;
    fmt = money;
    one = 'hour';
  } else {
    u = rng.int(6, 30);
    prompt = (T) => `A hose fills ${an(T)} ${T}-liter tank in ${n} minutes at a steady rate. How many liters flow in 1 minute?`;
    fmt = unitFmt('liter');
    one = 'minute';
  }
  const T = round(u * n, 2);
  return q({
    prompt: prompt(T),
    correct: u,
    fmt,
    wrong: [
      { value: round(T * n, 2), why: 'To find the amount for 1, divide. Multiplying gives the amount for many more.' },
      T - n > 0 ? { value: round(T - n, 2), why: 'Subtracting does not share the total equally. Divide the total into equal parts.' } : null,
      round(T + n, 2),
      round(u * 2, 2),
      round(u + 1, 2),
    ],
    solution: [
      `A unit rate is the amount for 1 ${one}. Split the total into ${n} equal parts.`,
      R`Divide: \(${fmt === money ? usd(T) : T} \div ${n} = ${fmt === money ? usd(u) : u}\).`,
      `The unit rate is ${fmt(u)} for each ${one}.`,
    ],
    rule: 3,
    skill: 'unit rates',
    check: () => (approx(u * n, T) ? true : 'unit rate times count is not the total'),
  });
}

// ───────────── Medium: tape diagrams, using a unit rate, unit prices, one-step conversions ─────────────

function mediumTapeTotal(rng) {
  const c = rng.pick(TAPES);
  const [a, b] = coprimePair(rng, 1, 7);
  const u = rng.int(2, 12);
  const T = (a + b) * u;
  const askX = rng.bool();
  const [name, parts, otherName, otherParts] = askX ? [c.x, a, c.y, b] : [c.y, b, c.x, a];
  const ans = parts * u;
  return q({
    prompt: `${c.intro} ${ratio(a, b)}. There are ${T} ${c.all} in all. How many ${name} are there?`,
    visual: twoTapes(c, a, b),
    correct: ans,
    wrong: [
      { value: otherParts * u, why: `That is the number of ${otherName}. The question asks for the ${name}.` },
      { value: u, why: `That is the value of one box. The ${name} have ${parts} boxes.` },
      T % parts === 0 ? { value: T / parts, why: `The ${T} ${c.all} fill all ${a + b} boxes, not just the ${parts} for the ${name}.` } : null,
      ans + u,
      ans - u > 0 ? ans - u : null,
      ans + 2 * u,
    ],
    solution: [
      R`The tape diagram has \(${a} + ${b} = ${a + b}\) equal boxes for all ${T} ${c.all}.`,
      R`One box is worth \(${T} \div ${a + b} = ${u}\).`,
      parts === 1 ? `The ${name} have 1 box, so there are ${ans} ${name}.` : R`The ${name} have ${parts} boxes: \(${parts} \times ${u} = ${ans}\) ${name}.`,
    ],
    rule: 2,
    skill: 'tape diagrams',
    check: () => (ans * otherParts === (T - ans) * parts ? true : 'parts are not in the given ratio'),
  });
}

function mediumPartOfWhole(rng) {
  const c = rng.pick(TAPES);
  const [a, b] = coprimePair(rng, 2, 9);
  const askX = rng.bool();
  const [name, parts, otherName, otherParts] = askX ? [c.x, a, c.y, b] : [c.y, b, c.x, a];
  return q({
    prompt: `${c.intro} ${ratio(a, b)}. What fraction of all the ${c.all} are ${name}?`,
    correct: frac(parts, a + b),
    wrong: [
      { value: frac(parts, otherParts), why: `That compares the ${name} with the ${otherName}. The whole is both groups together: \\(${a} + ${b} = ${a + b}\\) parts.` },
      { value: frac(otherParts, a + b), why: `That is the fraction that are ${otherName}.` },
      frac(parts, a + b + 1),
      frac(1, parts + 1),
    ],
    solution: [
      R`The ratio \(${a} : ${b}\) means ${a} ${a === 1 ? 'part' : 'parts'} ${c.x} for every ${b} ${b === 1 ? 'part' : 'parts'} ${c.y}. The whole is \(${a} + ${b} = ${a + b}\) parts.`,
      `The ${name} are ${parts} of those ${a + b} parts.`,
      R`So \(${frac(parts, a + b).tex()}\) of the ${c.all} are ${name}.`,
    ],
    rule: 0,
    skill: 'part to whole',
    // The two groups together are the whole, so their fractions must add to 1.
    check: () => (frac(parts, a + b).add(frac(otherParts, a + b)).eq(1) ? true : 'the two fractions do not make the whole'),
  });
}

function mediumUseUnitRate(rng) {
  const p = person(rng);
  const h = rng.int(2, 6);
  const H = rng.intExcept(3, 12, [h]);
  const ctx = rng.pick([
    { rates: [40, 45, 50, 55, 60, 65], fmt: unitFmt('mile'), one: 'hour', text: (D) => `A car travels ${D} miles in ${h} hours at a constant speed. At that speed, how far does it travel in ${H} hours?` },
    { rates: [12, 15, 18, 20, 24, 25, 30], fmt: unitFmt('page'), one: 'minute', text: (D) => `A printer prints ${D} pages in ${h} minutes. At that rate, how many pages does it print in ${H} minutes?` },
    { rates: [8, 9, 10, 11, 12, 13, 15], fmt: money, one: 'hour', text: (D) => `${p} earns ${money(D)} for ${h} hours of babysitting. At that rate, how much does ${p} earn for ${H} hours?` },
    { rates: [6, 8, 9, 12, 14, 16], fmt: unitFmt('liter'), one: 'minute', text: (D) => `A pump moves ${D} liters of water in ${h} minutes. At that rate, how many liters does it move in ${H} minutes?` },
    { rates: [60, 70, 75, 80, 90], fmt: unitFmt('meter'), one: 'minute', text: (D) => `${p} walks ${D} meters in ${h} minutes at a steady pace. At that pace, how far does ${p} walk in ${H} minutes?` },
  ]);
  const r = rng.pick(ctx.rates);
  const D = r * h;
  const ans = r * H;
  return q({
    prompt: ctx.text(D),
    correct: ans,
    fmt: ctx.fmt,
    wrong: [
      { value: r, why: `That is the amount for 1 ${ctx.one}. Multiply it by ${H}.` },
      { value: D * H, why: `First divide to find the amount for 1 ${ctx.one}. Then multiply by ${H}.` },
      H > h ? { value: r * (H - h), why: `That is only the extra amount for the extra time. The question asks for the whole amount in ${H} ${ctx.one}s.` } : D + r,
      ans + r,
    ],
    solution: [
      R`Find the unit rate (the amount for 1 ${ctx.one}): \(${D} \div ${h} = ${r}\).`,
      R`Multiply by the new number of ${ctx.one}s: \(${r} \times ${H} = ${ans}\).`,
      `The answer is ${ctx.fmt(ans)}.`,
    ],
    rule: 4,
    skill: 'using unit rates',
    check: () => (approx(ans * h, D * H) ? true : 'the two rates differ'),
  });
}

function mediumBetterBuy(rng) {
  const [item, one] = rng.pick([['granola bars', 'bar'], ['pens', 'pen'], ['juice boxes', 'box'], ['batteries', 'battery'], ['tennis balls', 'ball'], ['muffins', 'muffin']]);
  let nA, nB, uA, uB;
  do {
    nA = rng.int(2, 6);
    nB = rng.int(8, 15);
    uA = rng.int(8, 19) * 5;
    uB = rng.intExcept(8, 19, [uA / 5]) * 5;
  } while (uB * nB <= uA * nA); // the larger pack must cost more in total, so the unit prices are needed
  const pA = (uA * nA) / 100;
  const pB = (uB * nB) / 100;
  const aWins = uA < uB;
  const say = (n, cents) => `The ${n}-pack, at ${money(cents / 100)} per ${one}`;
  const [bn, bu, on, ou] = aWins ? [nA, uA, nB, uB] : [nB, uB, nA, uA];
  return q({
    prompt: `A store sells ${item} in two sizes: ${an(nA)} ${nA}-pack for ${money(pA)} and ${an(nB)} ${nB}-pack for ${money(pB)}. Which pack is the better buy, and what is its unit price?`,
    correct: say(bn, bu),
    wrong: [
      { value: say(on, ou), why: `That unit price is correct, but it is the higher one. The better buy has the lower price per ${one}.` },
      { value: say(bn, ou), why: 'The two unit prices have been swapped. Divide each price by its own number of items.' },
      say(on, bu),
    ],
    solution: [
      R`${nA}-pack: \(${usd(pA)} \div ${nA} = ${usd(uA / 100)}\), so ${money(uA / 100)} per ${one}.`,
      R`${nB}-pack: \(${usd(pB)} \div ${nB} = ${usd(uB / 100)}\), so ${money(uB / 100)} per ${one}.`,
      `${money(bu / 100)} is less than ${money(ou / 100)}, so the ${bn}-pack is the better buy.`,
    ],
    rule: 4,
    skill: 'unit prices',
    check: () => (approx(bu * bn, (aWins ? pA : pB) * 100) && bu < ou ? true : 'unit price is wrong'),
  });
}

const CONVERSIONS = [
  { big: ['foot', 'feet'], small: ['inch', 'inches'], k: 12, alt: 10 },
  { big: ['yard', 'yards'], small: ['foot', 'feet'], k: 3, alt: 12 },
  { big: ['hour', 'hours'], small: ['minute', 'minutes'], k: 60, alt: 100 },
  { big: ['minute', 'minutes'], small: ['second', 'seconds'], k: 60, alt: 100 },
  { big: ['pound', 'pounds'], small: ['ounce', 'ounces'], k: 16, alt: 10 },
  { big: ['gallon', 'gallons'], small: ['quart', 'quarts'], k: 4, alt: 2 },
  { big: ['quart', 'quarts'], small: ['cup', 'cups'], k: 4, alt: 2 },
  { big: ['meter', 'meters'], small: ['centimeter', 'centimeters'], k: 100, alt: 10 },
  { big: ['kilometer', 'kilometers'], small: ['meter', 'meters'], k: 1000, alt: 100 },
  { big: ['kilogram', 'kilograms'], small: ['gram', 'grams'], k: 1000, alt: 100 },
  { big: ['liter', 'liters'], small: ['milliliter', 'milliliters'], k: 1000, alt: 100 },
  { big: ['day', 'days'], small: ['hour', 'hours'], k: 24, alt: 12 },
  { big: ['week', 'weeks'], small: ['day', 'days'], k: 7, alt: 5 },
];

function mediumConvert(rng) {
  const c = rng.pick(CONVERSIONS);
  const n = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 1.5, 2.5, 3.5, 4.5]);
  const toSmall = rng.bool();
  const fact = `1 ${c.big[0]} = ${txt(c.k)} ${c.small[1]}`;
  const start = toSmall ? n : round(n * c.k, 2);
  const ans = toSmall ? round(n * c.k, 2) : n;
  const [from, to] = toSmall ? [c.big, c.small] : [c.small, c.big];
  const Cap = (w) => w[0].toUpperCase() + w.slice(1);
  return q({
    prompt: `How many ${to[1]} are equal to ${M(start, big)} ${from[1]}? (${fact})`,
    correct: ans,
    fmt: unitFmt(to[0], to[1], big),
    wrong: toSmall
      ? [
          { value: clean(n / c.k), why: `${Cap(to[1])} are smaller than ${from[1]}, so there must be more of them. Multiply by ${txt(c.k)}.` },
          { value: round(n + c.k, 2), why: `Each ${from[0]} is ${txt(c.k)} ${to[1]}, so multiply by ${txt(c.k)}. Adding counts only one ${from[0]}.` },
          round(n * c.alt, 2),
          round((n + 1) * c.k, 2),
        ]
      : [
          { value: round(start * c.k, 2), why: `${Cap(to[1])} are bigger than ${from[1]}, so there must be fewer of them. Divide by ${txt(c.k)}.` },
          clean(start / c.alt),
          round(start - c.k, 2),
          n + 1,
        ],
    solution: toSmall
      ? [`Each ${from[0]} is ${txt(c.k)} ${to[1]}, so multiply by ${txt(c.k)}.`, R`\(${N(start)} \times ${N(c.k)} = ${N(ans)}\)`, `${M(start, big)} ${from[1]} = ${M(ans, big)} ${to[1]}.`]
      : [`Every ${txt(c.k)} ${from[1]} make 1 ${to[0]}, so divide by ${txt(c.k)}.`, R`\(${N(start)} \div ${N(c.k)} = ${N(ans)}\)`, `${M(start, big)} ${from[1]} = ${M(ans, big)} ${to[1]}.`],
    rule: 5,
    skill: 'converting units',
    check: () => (approx(toSmall ? ans / c.k : ans * c.k, start) ? true : 'conversion does not undo correctly'),
  });
}

// ───────────── Hard: comparison tapes, time from a rate, two-step conversions, awkward scaling ─────────────

function hardTapeDifference(rng) {
  const c = rng.pick(TAPES);
  const [a, b] = coprimePair(rng, 1, 8);
  const u = rng.int(2, 12);
  const D = Math.abs(a - b) * u;
  const [more, fewer] = a > b ? [c.x, c.y] : [c.y, c.x];
  const target = rng.pick(['x', 'y', 'all']);
  const ans = target === 'x' ? a * u : target === 'y' ? b * u : (a + b) * u;
  const name = target === 'x' ? c.x : target === 'y' ? c.y : c.all;
  const boxes = target === 'x' ? a : target === 'y' ? b : a + b;
  const extra = Math.abs(a - b);
  const asTotal = (D * boxes) / (a + b);
  return q({
    prompt: `${c.intro} ${ratio(a, b)}. There are ${D} more ${more} than ${fewer}. How many ${name} are there${target === 'all' ? ' in all' : ''}?`,
    visual: twoTapes(c, a, b),
    correct: ans,
    wrong: [
      target !== 'all' && Number.isInteger(asTotal) ? { value: asTotal, why: `${D} is the difference between the groups, not the total. It matches only the ${extra === 1 ? 'one extra box' : `${extra} extra boxes`}.` } : null,
      { value: u, why: `That is the value of one box. Count the boxes for ${target === 'all' ? 'the whole diagram' : `the ${name}`}.` },
      target === 'all' ? { value: D * (a + b), why: `${D} is worth ${extra === 1 ? 'one box' : `${extra} boxes`}, not the whole diagram. Find one box first.` } : (target === 'x' ? b : a) * u,
      ans + u,
      ans + 2 * u,
    ],
    solution: [
      extra === 1
        ? `The ${more} have one more box than the ${fewer}. That one box holds the ${D} extra ${more}, so one box is worth ${D}.`
        : R`The ${more} have \(${Math.max(a, b)} - ${Math.min(a, b)} = ${extra}\) more boxes than the ${fewer}. Those extra boxes hold the ${D} extra ${more}, so one box is worth \(${D} \div ${extra} = ${u}\).`,
      target === 'all' ? R`The whole diagram has \(${a} + ${b} = ${a + b}\) boxes.` : `The ${name} have ${boxes} ${boxes === 1 ? 'box' : 'boxes'}.`,
      boxes === 1 ? `So there are ${ans} ${name}.` : R`\(${boxes} \times ${u} = ${ans}\) ${name}${target === 'all' ? ' in all' : ''}.`,
    ],
    rule: 2,
    skill: 'tape diagrams',
    check: () => (Math.abs(a * u - b * u) === D && ans === boxes * u ? true : 'difference does not match'),
  });
}

function hardTimeForDistance(rng) {
  for (;;) {
    const ctx = rng.pick([
      { rates: [8, 10, 12, 14, 16, 18], time: 'hour', what: 'miles', text: (d1, t1, d2) => `A cyclist rides ${d1} miles in ${t1} hours at a constant speed. At that speed, how long does it take to ride ${d2} miles?` },
      { rates: [4, 6], time: 'hour', what: 'kilometers', text: (d1, t1, d2) => `A hiker walks ${d1} kilometers in ${t1} hours at a steady pace. At that pace, how long does it take to walk ${d2} kilometers?` },
      { rates: [20, 24, 30, 36, 40], time: 'minute', what: 'bottles', text: (d1, t1, d2) => `A machine fills ${d1} bottles in ${t1} minutes. At that rate, how long does it take to fill ${d2} bottles?` },
      { rates: [12, 16, 20, 24], time: 'hour', what: 'miles', text: (d1, t1, d2) => `A ferry travels ${d1} miles in ${t1} hours at a constant speed. At that speed, how long does it take to travel ${d2} miles?` },
    ]);
    const r = rng.pick(ctx.rates);
    const t1 = rng.pick([1.5, 2, 2.5, 3, 4]);
    const t2 = rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4.5, 5, 6]);
    if (t1 === t2) continue;
    const d1 = r * t1;
    const d2 = r * t2;
    return q({
      prompt: ctx.text(d1, t1, d2),
      correct: t2,
      fmt: unitFmt(ctx.time),
      wrong: [
        { value: r, why: `That is the unit rate: ${r} ${ctx.what} for each ${ctx.time}. Divide ${d2} by it to find the time.` },
        { value: clean((t1 * d1) / d2), why: d2 > d1 ? 'A greater amount at the same rate takes more time, not less.' : 'A smaller amount at the same rate takes less time, not more.' },
        clean(d2 / t1),
        t2 + 1,
        t2 + 0.5,
      ],
      solution: [
        R`Find the unit rate: \(${d1} \div ${t1} = ${r}\) ${ctx.what} for each ${ctx.time}.`,
        R`The time is the amount divided by the unit rate: \(${d2} \div ${r} = ${t2}\).`,
        `It takes ${unitFmt(ctx.time)(t2)}.`,
      ],
      rule: 4,
      skill: 'constant speed',
      check: () => (approx(d1 / t1, d2 / t2) ? true : 'the two rates differ'),
    });
  }
}

const CHAINS = [
  { from: ['yard', 'yards'], mid: ['foot', 'feet'], to: ['inch', 'inches'], k1: 3, k2: 12 },
  { from: ['hour', 'hours'], mid: ['minute', 'minutes'], to: ['second', 'seconds'], k1: 60, k2: 60 },
  { from: ['gallon', 'gallons'], mid: ['quart', 'quarts'], to: ['cup', 'cups'], k1: 4, k2: 4 },
  { from: ['day', 'days'], mid: ['hour', 'hours'], to: ['minute', 'minutes'], k1: 24, k2: 60 },
  { from: ['week', 'weeks'], mid: ['day', 'days'], to: ['hour', 'hours'], k1: 7, k2: 24 },
  { from: ['kilometer', 'kilometers'], mid: ['meter', 'meters'], to: ['centimeter', 'centimeters'], k1: 1000, k2: 100 },
  { from: ['meter', 'meters'], mid: ['centimeter', 'centimeters'], to: ['millimeter', 'millimeters'], k1: 100, k2: 10 },
  { from: ['quart', 'quarts'], mid: ['pint', 'pints'], to: ['cup', 'cups'], k1: 2, k2: 2 },
];

function hardConvertTwoStep(rng) {
  const c = rng.pick(CHAINS);
  const n = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 0.5, 1.5, 2.5]);
  const down = rng.bool(0.6);
  const facts = `1 ${c.from[0]} = ${txt(c.k1)} ${c.mid[1]} and 1 ${c.mid[0]} = ${txt(c.k2)} ${c.to[1]}`;
  const small = round(n * c.k1 * c.k2, 2);
  const mid = round(n * c.k1, 2);
  if (mid === 1) return hardConvertTwoStep(rng);
  const Cap = (w) => w[0].toUpperCase() + w.slice(1);
  if (down) {
    return q({
      prompt: `How many ${c.to[1]} are equal to ${M(n)} ${c.from[1]}? (${facts})`,
      correct: small,
      fmt: unitFmt(c.to[0], c.to[1], big),
      wrong: [
        { value: mid, why: `That is the number of ${c.mid[1]}. Convert once more, from ${c.mid[1]} to ${c.to[1]}.` },
        c.k1 !== c.k2 ? { value: round(n * c.k2, 2), why: `That uses only the second fact. First change ${c.from[1]} to ${c.mid[1]}.` } : null,
        { value: round(n * (c.k1 + c.k2), 2), why: 'The two conversion numbers are multiplied one after the other, not added.' },
        round(small * 10, 2),
        round(small / 2, 2),
      ],
      solution: [
        R`${Cap(c.from[1])} to ${c.mid[1]}: \(${n} \times ${N(c.k1)} = ${N(mid)}\) ${c.mid[1]}.`,
        R`${Cap(c.mid[1])} to ${c.to[1]}: \(${N(mid)} \times ${N(c.k2)} = ${N(small)}\) ${c.to[1]}.`,
        `${M(n)} ${c.from[1]} = ${M(small, big)} ${c.to[1]}.`,
      ],
      rule: 5,
      skill: 'converting units',
      check: () => (approx(small / c.k2 / c.k1, n) ? true : 'conversion does not undo correctly'),
    });
  }
  return q({
    prompt: `How many ${c.from[1]} are equal to ${M(small, big)} ${c.to[1]}? (${facts})`,
    correct: n,
    fmt: unitFmt(c.from[0], c.from[1], big),
    wrong: [
      { value: mid, why: `That is the number of ${c.mid[1]}. Convert once more, from ${c.mid[1]} to ${c.from[1]}.` },
      c.k1 !== c.k2 ? { value: clean(small / c.k1), why: `That uses only the first fact. Change ${c.to[1]} to ${c.mid[1]} first, then ${c.mid[1]} to ${c.from[1]}.` } : null,
      n + 1,
      n * 2,
      n + 2,
    ],
    solution: [
      R`${Cap(c.to[1])} to ${c.mid[1]}: \(${N(small)} \div ${N(c.k2)} = ${N(mid)}\) ${c.mid[1]}.`,
      R`${Cap(c.mid[1])} to ${c.from[1]}: \(${N(mid)} \div ${N(c.k1)} = ${n}\) ${c.from[1]}.`,
      `${M(small, big)} ${c.to[1]} = ${M(n)} ${c.from[1]}.`,
    ],
    rule: 5,
    skill: 'converting units',
    check: () => (approx(n * c.k1 * c.k2, small) ? true : 'conversion does not undo correctly'),
  });
}

function hardRecipeScale(rng) {
  for (;;) {
    const a = rng.int(2, 6);
    const r = rng.int(2, 8);
    const a2 = rng.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 1.5, 2.5, 3.5, 4.5, 7.5]);
    const b = a * r;
    const c = a2 * r;
    if (a2 === a || !Number.isInteger(c) || c % b === 0 || b % c === 0) continue;
    const ctx = rng.pick([
      { text: `A recipe uses ${a} cups of flour to make ${b} muffins. How many cups of flour are needed to make ${c} muffins?`, unit: 'cup', per: 'muffins for each cup' },
      { text: `${a} liters of paint cover ${b} square meters of wall. How many liters are needed to cover ${c} square meters?`, unit: 'liter', per: 'square meters for each liter' },
      { text: `A trail mix uses ${a} cups of nuts for every ${b} cups of oats. How many cups of nuts go with ${c} cups of oats?`, unit: 'cup', per: 'cups of oats for each cup of nuts' },
      { text: `${a} bags of soil fill ${b} flower pots. How many bags are needed to fill ${c} flower pots?`, unit: 'bag', per: 'pots for each bag' },
    ]);
    return q({
      prompt: ctx.text,
      correct: a2,
      fmt: unitFmt(ctx.unit),
      wrong: [
        c > b ? { value: a + (c - b), why: 'The two amounts are linked by multiplying, not by adding. Find the amount for 1 first.' } : null,
        { value: r, why: `That is the unit rate: ${r} ${ctx.per}. Use it to divide ${c}.` },
        { value: clean((a * b) / c), why: c > b ? 'A bigger job needs more, not less.' : 'A smaller job needs less, not more.' },
        a2 + 1,
        a2 + 0.5,
      ],
      solution: [
        R`Find the unit rate: \(${b} \div ${a} = ${r}\) ${ctx.per}.`,
        R`Divide the new amount by the unit rate: \(${c} \div ${r} = ${a2}\).`,
        `The answer is ${unitFmt(ctx.unit)(a2)}.`,
      ],
      rule: 3,
      skill: 'unit rates',
      check: () => (approx(a * c, b * a2) ? true : 'the two ratios are not equivalent'),
    });
  }
}

function hardCompareRates(rng) {
  const [p1, p2] = people(rng, 2);
  const r1 = rng.int(20, 60);
  const r2 = rng.intExcept(20, 60, [r1]);
  const m1 = rng.int(2, 6);
  const m2 = rng.intExcept(2, 6, [m1]);
  const w1 = r1 * m1;
  const w2 = r2 * m2;
  const [fast, slow] = r1 > r2 ? [p1, p2] : [p2, p1];
  const diff = Math.abs(r1 - r2);
  const totalDiff = Math.abs(w1 - w2);
  const say = (who, d) => `${who}, by ${M(d)} ${d === 1 ? 'word' : 'words'} per minute`;
  return q({
    prompt: `${p1} types ${w1} words in ${m1} minutes. ${p2} types ${w2} words in ${m2} minutes. Who types faster, and by how many words per minute?`,
    correct: say(fast, diff),
    wrong: [
      { value: say(slow, diff), why: 'The difference is right, but the faster typist is the one with more words in each minute.' },
      totalDiff !== diff && totalDiff !== 0 ? { value: say(w1 > w2 ? p1 : p2, totalDiff), why: 'The times are different, so the totals cannot be compared directly. Compare the words for 1 minute.' } : null,
      say(fast, diff + 2),
      say(slow, diff + 2),
      say(fast, diff + 5),
    ],
    solution: [
      R`${p1}: \(${w1} \div ${m1} = ${r1}\) words per minute.`,
      R`${p2}: \(${w2} \div ${m2} = ${r2}\) words per minute.`,
      R`\(${Math.max(r1, r2)} - ${Math.min(r1, r2)} = ${diff}\), so ${fast} types faster by ${diff} ${diff === 1 ? 'word' : 'words'} per minute.`,
    ],
    rule: 3,
    skill: 'comparing rates',
    check: () => (approx(w1 / m1, r1) && approx(w2 / m2, r2) ? true : 'rates are wrong'),
  });
}

// ───────────── Challenge ─────────────

function challengeAddToChange(rng) {
  for (;;) {
    const L = rng.pick([12, 18, 20, 24, 30, 36, 40]);
    const divs = [2, 3, 4, 5, 6, 9, 10, 12].filter((d) => L % d === 0 && L / d >= 2);
    const [u, v] = rng.sample(divs, 2);
    const a = L / u;
    const c = L / v;
    const b = rng.int(2, 9);
    const d = rng.int(2, 9);
    if (gcd(a, b) !== 1 || gcd(c, d) !== 1 || d * v <= b * u) continue;
    const before = b * u;
    const after = d * v;
    const ans = after - before;
    const [x, y, place] = rng.pick([['red', 'blue', 'jar'], ['green', 'yellow', 'bag'], ['black', 'white', 'box']]);
    return q({
      prompt: `The ratio of ${x} marbles to ${y} marbles in a ${place} is ${ratio(a, b)}. There are ${L} ${x} marbles. Then some ${y} marbles are added, and the ratio becomes ${ratio(c, d)}. How many ${y} marbles were added?`,
      correct: ans,
      wrong: [
        { value: after, why: `That is how many ${y} marbles there are at the end. The question asks how many were added.` },
        { value: before, why: `That is how many ${y} marbles there were at the start.` },
        d !== b ? Math.abs(d - b) * u : null,
        ans + v,
        ans + u,
      ],
      solution: [
        R`At the start, \(${a}\) parts are ${L} ${x} marbles, so one part is \(${L} \div ${a} = ${u}\). The ${y} marbles: \(${b} \times ${u} = ${before}\).`,
        R`At the end there are still ${L} ${x} marbles, but now they are \(${c}\) parts. One part is \(${L} \div ${c} = ${v}\). The ${y} marbles: \(${d} \times ${v} = ${after}\).`,
        R`Added: \(${after} - ${before} = ${ans}\) ${y} marbles.`,
      ],
      rule: 2,
      skill: 'changing a ratio',
      check: () => (L * b === a * before && L * d === c * (before + ans) ? true : 'ratios do not match'),
    });
  }
}

function challengeThreePart(rng) {
  const parts = rng.sample([1, 2, 3, 4, 5, 6, 7], 3);
  if (gcd(gcd(parts[0], parts[1]), parts[2]) !== 1) return challengeThreePart(rng);
  const u = rng.int(2, 9);
  const sum = parts[0] + parts[1] + parts[2];
  const T = sum * u;
  const ctx = rng.pick([
    { names: ['orange juice', 'apple juice', 'grape juice'], labels: ['Orange', 'Apple', 'Grape'], lead: (p) => `${p} mixes a fruit punch from orange juice, apple juice and grape juice in the ratio`, total: 'cups of punch', unit: 'cups' },
    { names: ['sand', 'gravel', 'cement'], labels: ['Sand', 'Gravel', 'Cement'], lead: (p) => `${p} mixes concrete from sand, gravel and cement in the ratio`, total: 'kilograms of concrete', unit: 'kilograms' },
    { names: ['peanuts', 'raisins', 'almonds'], labels: ['Peanuts', 'Raisins', 'Almonds'], lead: (p) => `${p} makes a snack mix from peanuts, raisins and almonds in the ratio`, total: 'ounces of snack mix', unit: 'ounces' },
  ]);
  const hi = parts.indexOf(Math.max(...parts));
  const lo = parts.indexOf(Math.min(...parts));
  const gap = parts[hi] - parts[lo];
  const ans = gap * u;
  return q({
    prompt: `${ctx.lead(person(rng))} ${ratio(...parts)}. There are ${T} ${ctx.total} in all. How many more ${ctx.unit} of ${ctx.names[hi]} than ${ctx.names[lo]} are in the mix?`,
    visual: tape(parts.map((n, i) => ({ label: ctx.labels[i], count: n })), `A tape diagram with ${parts.join(', ')} equal boxes for ${ctx.names.join(', ')}.`),
    correct: ans,
    unit: ctx.unit,
    wrong: [
      { value: parts[hi] * u, why: `That is all of the ${ctx.names[hi]}. The question asks how much more there is than ${ctx.names[lo]}.` },
      { value: gap, why: `That is the difference in boxes. Each box is worth ${u} ${ctx.unit}.` },
      u,
      ans + u,
      parts[lo] * u,
    ],
    solution: [
      R`There are \(${parts.join(' + ')} = ${sum}\) equal boxes for ${T} ${ctx.unit}, so one box is \(${T} \div ${sum} = ${u}\) ${ctx.unit}.`,
      R`There ${gap === 1 ? 'is' : 'are'} \(${parts[hi]} - ${parts[lo]} = ${gap}\) more ${gap === 1 ? 'box' : 'boxes'} for ${ctx.names[hi]} than for ${ctx.names[lo]}.`,
      gap === 1 ? `One box is ${u} ${ctx.unit}, so there are ${u} ${ctx.unit} more.` : R`\(${gap} \times ${u} = ${ans}\) ${ctx.unit} more.`,
    ],
    rule: 2,
    skill: 'tape diagrams',
    check: () => (parts[hi] * u - parts[lo] * u === ans && sum * u === T ? true : 'difference does not match'),
  });
}

function challengeAverageSpeed(rng) {
  const [s1, s2, t1base, how] = rng.pick([
    [60, 40, 2, 'drives'], [30, 20, 2, 'drives'], [60, 30, 1, 'drives'], [45, 30, 2, 'drives'], [50, 75, 3, 'drives'], [60, 20, 1, 'drives'],
    [40, 60, 3, 'drives'], [15, 10, 2, 'cycles'], [12, 6, 1, 'cycles'], [10, 15, 3, 'cycles'], [12, 4, 1, 'cycles'], [20, 30, 3, 'drives'],
  ]);
  const t1 = t1base === 1 ? rng.int(2, 3) : t1base * rng.int(1, 2);
  const d = s1 * t1;
  const t2 = d / s2;
  const avg = (2 * d) / (t1 + t2);
  const p = person(rng);
  const place = rng.pick(['a lake', 'the coast', 'a campsite', 'a market', 'a museum']);
  return q({
    prompt: `${p} ${how} to ${place} at ${s1} miles per hour, which takes ${t1} ${t1 === 1 ? 'hour' : 'hours'}. ${p} returns along the same road at ${s2} miles per hour. What is the average speed for the whole trip (total distance ÷ total time)?`,
    correct: avg,
    unit: 'miles per hour',
    wrong: [
      { value: (s1 + s2) / 2, why: 'The two parts of the trip take different amounts of time, so the two speeds cannot simply be averaged. Use total distance ÷ total time.' },
      { value: clean(d / (t1 + t2)), why: 'That uses the one-way distance. The whole trip is there and back.' },
      s1,
      s2,
      avg + 2,
    ],
    solution: [
      R`Distance each way: \(${s1} \times ${t1} = ${d}\) miles.`,
      R`Time to return: \(${d} \div ${s2} = ${t2}\) ${t2 === 1 ? 'hour' : 'hours'}.`,
      R`Total distance: \(${d} + ${d} = ${2 * d}\) miles. Total time: \(${t1} + ${t2} = ${t1 + t2}\) hours.`,
      R`Average speed: \(${2 * d} \div ${t1 + t2} = ${avg}\) miles per hour.`,
    ],
    rule: 4,
    skill: 'constant speed',
    check: () => (approx(avg * (t1 + t2), 2 * d) && approx(t2 * s2, d) ? true : 'average speed is wrong'),
  });
}

const RATE_CHANGES = [
  { from: 'inches per minute', to: 'feet per hour', up: 60, down: 12, values: [2, 3, 4, 5, 6, 8, 10, 12], facts: '1 hour = 60 minutes and 1 foot = 12 inches', mid: 'inches per hour', thing: 'A snail crawls' },
  { from: 'feet per second', to: 'yards per minute', up: 60, down: 3, values: [2, 3, 4, 5, 6, 7, 8, 9], facts: '1 minute = 60 seconds and 1 yard = 3 feet', mid: 'feet per minute', thing: 'A remote-control car travels' },
  { from: 'meters per second', to: 'kilometers per hour', up: 3600, down: 1000, values: [5, 10, 15, 20, 25, 30], facts: '1 hour = 3,600 seconds and 1 kilometer = 1,000 meters', mid: 'meters per hour', thing: 'A train moves' },
  { from: 'cups per minute', to: 'gallons per hour', up: 60, down: 16, values: [4, 8, 12, 16, 20, 24], facts: '1 hour = 60 minutes and 1 gallon = 16 cups', mid: 'cups per hour', thing: 'Water flows from a tap at' },
  { from: 'ounces per day', to: 'pounds per week', up: 7, down: 16, values: [16, 32, 48, 64, 80], facts: '1 week = 7 days and 1 pound = 16 ounces', mid: 'ounces per week', thing: 'A large dog eats' },
  { from: 'centimeters per second', to: 'meters per minute', up: 60, down: 100, values: [5, 10, 15, 20, 25, 35, 40, 45], facts: '1 minute = 60 seconds and 1 meter = 100 centimeters', mid: 'centimeters per minute', thing: 'A toy car rolls' },
];

function challengeRateConvert(rng) {
  const c = rng.pick(RATE_CHANGES);
  const v = rng.pick(c.values);
  const mid = v * c.up;
  const ans = round(mid / c.down, 2);
  return q({
    prompt: `${c.thing} ${v} ${c.from}. What is that rate in ${c.to}? (${c.facts})`,
    correct: ans,
    fmt: (x) => `${M(x, big)} ${x === 1 ? c.to.replace(/^\w+/, (w) => singular(w)) : c.to}`,
    wrong: [
      { value: mid, why: `That is the rate in ${c.mid}. The other unit still needs converting.` },
      { value: clean(v / c.down), why: `The time unit changed too. Multiply by ${txt(c.up)} first.` },
      { value: v * c.up * c.down, why: `The new unit is larger, so the number of them is smaller. Divide by ${txt(c.down)}.` },
      ans + 1,
      ans * 2,
    ],
    solution: [
      R`Change the time unit first: \(${v} \times ${N(c.up)} = ${N(mid)}\) ${c.mid}.`,
      R`Change the other unit: \(${N(mid)} \div ${N(c.down)} = ${ans}\).`,
      `The rate is ${M(ans)} ${c.to}.`,
    ],
    rule: 5,
    skill: 'converting rates',
    check: () => (approx((ans * c.down) / c.up, v) ? true : 'rate conversion is wrong'),
  });
}

// "= 1.5" when the decimal is exact to two places, otherwise "≈ 1.29".
const isOrAbout = (x) => (clean(x) != null ? `= ${num(x)}` : R`\approx ${num(x, { places: 2 })}`);

function challengeError(rng) {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = rng.int(2, 6);
  const p = person(rng);
  const m = rng.int(2, 5);
  return q({
    prompt: `${p} says that ${ratio(a, b)} is equivalent to ${ratio(a + k, b + k)} "because I added ${k} to both parts." What should ${p} know?`,
    correct: `Adding the same number changes the ratio. Multiply both parts by the same number instead, as in ${ratio(a * m, b * m)}.`,
    wrong: [
      `${p} is right. Any change is fine as long as it is done to both parts.`,
      `${p} should have added ${k} to the first part only, to get ${ratio(a + k, b)}.`,
      `${p} should have subtracted ${k} from both parts instead of adding.`,
    ],
    solution: [
      R`Compare the unit rates: \(${a} \div ${b} ${isOrAbout(a / b)}\) but \(${a + k} \div ${b + k} ${isOrAbout((a + k) / (b + k))}\). They are different, so the ratios are not equivalent.`,
      'Equivalent ratios come from multiplying or dividing both parts by the same number.',
      R`For example, multiply both parts by \(${m}\): ${ratio(a, b)} is equivalent to ${ratio(a * m, b * m)}.`,
    ],
    rule: 1,
    skill: 'equivalent ratios',
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'ratios-rates',
  title: 'Ratios & Unit Rates',
  summary: 'Write ratios, build equivalent ratios with tables and tape diagrams, and use unit rates for prices, speeds and unit conversions.',
  grade: 'Grade 6',
  standards: ['CCSS 6.RP.A.1', 'CCSS 6.RP.A.2', 'CCSS 6.RP.A.3'],

  explain: {
    intro: R`A **ratio** compares two amounts. It says how much of one thing there is for a certain amount of another. Ratios let you scale a recipe, compare prices, and work out how far you travel at a steady speed.`,
    rules: [
      {
        title: 'A ratio compares two quantities, in order',
        text: R`Write a ratio with the word "to", with a colon, or as a fraction. Keep the order the words give. A ratio can compare one part with another part, or one part with the whole.`,
        example: R`In a bag with 3 red and 5 blue marbles, red to blue is \(3 : 5\), blue to red is \(5 : 3\), and red to all marbles is \(3 : 8\).`,
      },
      {
        title: 'Equivalent ratios: multiply or divide both parts',
        text: R`Multiply or divide both parts of a ratio by the same number (not zero) and you get an equivalent ratio. A **ratio table** lists equivalent ratios in rows. To write a ratio in simplest form, divide both parts by their greatest common factor.`,
        example: R`\(2 : 3 = 4 : 6 = 10 : 15\). Going the other way, \(12 : 18 = 2 : 3\) after dividing both parts by 6.`,
      },
      {
        title: 'Tape diagrams: every box is the same size',
        text: R`Draw one box for each part of the ratio. All the boxes are worth the same amount. Use what you know (a total, one group, or a difference) to find the value of one box. Then count boxes.`,
        example: R`Boys to girls is \(2 : 3\) and there are 30 students. There are 5 boxes, so one box is \(30 \div 5 = 6\). Girls: \(3 \times 6 = 18\).`,
      },
      {
        title: 'A unit rate is the amount for 1',
        text: R`A **rate** compares two amounts with different units, such as miles and hours. The **unit rate** tells how much there is for 1 of the second amount. To find it, divide.`,
        example: R`150 miles in 3 hours is \(150 \div 3 = 50\) miles per hour. $6 for 4 pens is \(6 \div 4 = 1.50\), or $1.50 per pen.`,
      },
      {
        title: 'Use the unit rate to find any amount',
        text: R`Once you know the amount for 1, multiply to find the amount for any number. To go backwards (how many hours? how many items?), divide by the unit rate. To pick the better buy, compare unit prices: the lower price for 1 wins.`,
        example: R`At 50 miles per hour, 4 hours covers \(50 \times 4 = 200\) miles, and 125 miles takes \(125 \div 50 = 2.5\) hours.`,
      },
      {
        title: 'Converting units',
        text: R`A conversion fact such as 1 foot = 12 inches is a unit rate: 12 inches per foot. Going to a smaller unit, there are more of them, so multiply. Going to a larger unit, there are fewer, so divide.`,
        example: R`\(4\) feet \(= 4 \times 12 = 48\) inches. \(150\) minutes \(= 150 \div 60 = 2.5\) hours.`,
      },
    ],
    vocab: [
      { term: 'ratio', def: R`A comparison of two quantities, such as 3 to 5 or \(3 : 5\).` },
      { term: 'equivalent ratios', def: R`Ratios that describe the same comparison, such as \(2 : 3\) and \(4 : 6\).` },
      { term: 'rate', def: 'A ratio of two quantities measured in different units, such as dollars and pounds.' },
      { term: 'unit rate', def: 'A rate for 1 unit: miles in 1 hour, dollars for 1 item.' },
      { term: 'unit price', def: 'The cost of 1 item or 1 unit of measure.' },
    ],
    mistakes: [
      R`Swapping the order. If the question says "dogs to cats", the number of dogs comes first.`,
      R`Adding instead of multiplying. \(2 : 3\) is **not** equivalent to \(4 : 5\). Multiply both parts by the same number: \(4 : 6\).`,
      'Mixing up part-to-part and part-to-whole. Check whether the second quantity is the other group or the total.',
      'Dividing the wrong way round for a unit price. Dollars per item is the cost divided by the number of items.',
    ],
    visual: tape([{ label: 'Blue', count: 2, shade: 'a', box: '1 cup' }, { label: 'Yellow', count: 3, shade: 'b', box: '1 cup' }], 'A tape diagram for the ratio 2 to 3: two equal boxes for blue paint and three boxes of the same size for yellow paint.'),
  },

  examples: [
    {
      title: 'Writing ratios',
      problem: 'A fruit bowl holds 4 apples and 6 oranges. Write the ratio of apples to oranges, and the ratio of apples to all the fruit, in simplest form.',
      steps: [
        R`Apples to oranges: \(4 : 6\). Divide both parts by 2 to get \(2 : 3\).`,
        R`All the fruit: \(4 + 6 = 10\) pieces.`,
        R`Apples to all the fruit: \(4 : 10\). Divide both parts by 2 to get \(2 : 5\).`,
      ],
      answer: R`\(2 : 3\) and \(2 : 5\)`,
      visual: { type: 'counters', groups: [{ count: 4, color: 'c' }, { count: 6, color: 'b' }], alt: 'Four green counters for the apples and six orange counters for the oranges.' },
    },
    {
      title: 'Using a ratio table',
      problem: 'A smoothie uses 2 cups of yogurt for every 3 cups of berries. How many cups of berries go with 8 cups of yogurt?',
      steps: [
        R`Start a table with the ratio \(2 : 3\).`,
        R`\(8 = 2 \times 4\), so multiply both parts by 4.`,
        R`Berries: \(3 \times 4 = 12\) cups.`,
      ],
      answer: '12 cups of berries',
      visual: { type: 'table', headers: ['Cups of yogurt', 'Cups of berries'], rows: [[2, 3], [4, 6], [6, 9], [8, 12]], alt: 'A ratio table: 2 and 3, 4 and 6, 6 and 9, 8 and 12.' },
    },
    {
      title: 'Word problem: a tape diagram',
      word: true,
      problem: R`The ratio of boys to girls in a choir is \(3 : 5\). There are 40 singers. How many girls are in the choir?`,
      steps: [
        R`Draw 3 boxes for boys and 5 boxes for girls. That is \(3 + 5 = 8\) equal boxes for 40 singers.`,
        R`One box is worth \(40 \div 8 = 5\) singers.`,
        R`Girls have 5 boxes: \(5 \times 5 = 25\).`,
        R`Check: boys are \(3 \times 5 = 15\), and \(15 + 25 = 40\). ✓`,
      ],
      answer: '25 girls',
      visual: tape([{ label: 'Boys', count: 3, shade: 'a', box: '5' }, { label: 'Girls', count: 5, shade: 'b', box: '5' }], 'A tape diagram with 3 boxes for boys and 5 boxes for girls. Every box is worth 5.'),
    },
    {
      title: 'Word problem: which is the better buy?',
      word: true,
      problem: 'A 12-ounce box of cereal costs $3.00. An 18-ounce box costs $4.14. Which box is the better buy?',
      steps: [
        R`Find each unit price (the cost of 1 ounce) by dividing the price by the number of ounces.`,
        R`Small box: \(3.00 \div 12 = 0.25\), so $0.25 per ounce.`,
        R`Large box: \(4.14 \div 18 = 0.23\), so $0.23 per ounce.`,
        R`$0.23 is less than $0.25, so the large box costs less for each ounce.`,
      ],
      answer: 'The 18-ounce box ($0.23 per ounce)',
    },
    {
      title: 'Word problem: constant speed and units',
      word: true,
      problem: 'A train travels 150 miles in 2.5 hours at a constant speed. How far does it travel in 4 hours? How many minutes does the 150-mile trip take?',
      steps: [
        R`Unit rate: \(150 \div 2.5 = 60\) miles per hour.`,
        R`In 4 hours: \(60 \times 4 = 240\) miles.`,
        R`Convert 2.5 hours to minutes. Each hour is 60 minutes, so multiply: \(2.5 \times 60 = 150\) minutes.`,
      ],
      answer: '240 miles; the 150-mile trip takes 150 minutes',
    },
  ],

  models: [
    {
      id: 'ratio-table',
      title: 'Scale a ratio',
      intro: 'Choose a ratio and a new amount for the first quantity. The table shows how to find the matching amount of the second quantity.',
      inputs: [
        { name: 'a', label: 'First quantity', type: 'int', min: 1, max: 20, value: 2 },
        { name: 'b', label: 'Second quantity', type: 'int', min: 1, max: 20, value: 3 },
        { name: 'n', label: 'New amount of the first quantity', type: 'int', min: 1, max: 200, value: 8 },
      ],
      compute({ a, b, n }) {
        const y = frac(b * n, a);
        const unit = frac(b, a);
        const steps = [R`The ratio is \(${a} : ${b}\). Every \(${a}\) of the first quantity goes with \(${b}\) of the second.`];
        const rows = [[M(a), M(b)]];
        if (n === a) {
          steps.push(R`The first quantity is still \(${a}\), so the second quantity is still \(${b}\).`);
        } else if (n % a === 0) {
          steps.push(R`\(${n} = ${a} \times ${n / a}\), so multiply both parts by \(${n / a}\).`);
          steps.push(R`Second quantity: \(${b} \times ${n / a} = ${y.tex()}\).`);
          rows.push([M(n), M(y)]);
        } else if (n === 1) {
          steps.push(R`To get from \(${a}\) down to 1, divide both parts by \(${a}\): \(${b} \div ${a} = ${unit.tex()}\).`);
          rows.push([M(1), M(unit)]);
        } else {
          steps.push(R`\(${n}\) is not a whole-number multiple of \(${a}\), so find the amount for 1 first. Divide both parts by \(${a}\): 1 goes with \(${unit.tex()}\).`);
          steps.push(R`Now multiply both parts by \(${n}\): \(${n} \times ${unit.tex()} = ${y.mixedTex()}\).`);
          rows.push([M(1), M(unit)], [M(n), `\\(${y.mixedTex()}\\)`]);
        }
        return {
          problem: R`\(${a} : ${b} = ${n} : \;?\)`,
          steps,
          answer: R`\(${a} : ${b} = ${n} : ${y.mixedTex()}\)`,
          visual: { type: 'table', headers: ['First quantity', 'Second quantity'], rows, alt: `A ratio table that starts with ${a} and ${b} and ends with ${n} and ${fracLabel(y)}.` },
        };
      },
    },
    {
      id: 'paint-mix',
      title: 'Word problem: mixing paint',
      word: true,
      intro: 'Change the ratio and the total. The tape diagram shows what one box is worth.',
      inputs: [
        { name: 'a', label: 'Parts of blue', type: 'int', min: 1, max: 9, value: 2 },
        { name: 'b', label: 'Parts of yellow', type: 'int', min: 1, max: 9, value: 3 },
        { name: 'T', label: 'Liters of paint needed in all', type: 'int', min: 1, max: 200, value: 20 },
      ],
      compute({ a, b, T }) {
        const box = frac(T, a + b);
        const blue = box.mul(a);
        const yellow = box.mul(b);
        const liters = (f) => R`\(${f.mixedTex()}\) ${f.value > 1 ? 'liters' : 'liter'}`;
        const part = (name, n, f) => (n === 1 ? `${name} has 1 box: ${liters(f)}.` : R`${name}: \(${n} \times ${box.mixedTex()} = ${f.mixedTex()}\) ${f.value > 1 ? 'liters' : 'liter'}.`);
        // Write the value in each box only when it fits.
        const label = fracLabel(box).length * 7 < 262 / Math.max(a, b) ? fracLabel(box) : undefined;
        return {
          problem: R`Jada mixes green paint from blue and yellow paint in the ratio \(${a} : ${b}\). Jada needs ${T} ${T === 1 ? 'liter' : 'liters'} of green paint in all. How much blue and how much yellow should Jada use?`,
          steps: [
            R`Draw \(${a}\) ${a === 1 ? 'box' : 'boxes'} for blue and \(${b}\) ${b === 1 ? 'box' : 'boxes'} for yellow: \(${a} + ${b} = ${a + b}\) equal boxes in all.`,
            R`The boxes hold ${T} ${T === 1 ? 'liter' : 'liters'} together, so one box is \(${T} \div ${a + b} = ${box.mixedTex()}\) ${box.value > 1 ? 'liters' : 'liter'}.`,
            part('Blue', a, blue),
            part('Yellow', b, yellow),
            R`Check: \(${blue.mixedTex()} + ${yellow.mixedTex()} = ${T}\). ✓`,
          ],
          answer: `${liters(blue)} of blue and ${liters(yellow)} of yellow`,
          visual: tape([{ label: 'Blue', count: a, shade: 'a', box: label }, { label: 'Yellow', count: b, shade: 'b', box: label }], `A tape diagram with ${a} blue ${a === 1 ? 'box' : 'boxes'} and ${b} yellow ${b === 1 ? 'box' : 'boxes'}. Each box is worth ${fracLabel(box)} ${box.value > 1 ? 'liters' : 'liter'}.`),
        };
      },
    },
    {
      id: 'better-buy',
      title: 'Word problem: the better buy',
      word: true,
      intro: 'Type two pack sizes and prices. The unit prices decide which is the better buy.',
      inputs: [
        { name: 'nA', label: 'Pack A: number of bars', type: 'int', min: 1, max: 60, value: 6 },
        { name: 'pA', label: 'Pack A: price in dollars', type: 'number', min: 0.25, max: 100, step: 0.25, value: 4.5 },
        { name: 'nB', label: 'Pack B: number of bars', type: 'int', min: 1, max: 60, value: 10 },
        { name: 'pB', label: 'Pack B: price in dollars', type: 'number', min: 0.25, max: 100, step: 0.25, value: 7 },
      ],
      compute({ nA, pA, nB, pB }) {
        const uA = frac(Math.round(pA * 100), nA);
        const uB = frac(Math.round(pB * 100), nB);
        // Unit prices are exact fractions of a cent, so the comparison never depends on rounding.
        const places = [2, 3, 4, 5].find((k) => uA.eq(uB) || num(uA.value / 100, { fixed: k }) !== num(uB.value / 100, { fixed: k })) ?? 6;
        const line = (name, p, n, u) => {
          const exact = (u.n * 10 ** (places - 2)) % u.d === 0;
          const tail = places === 2 ? `so ${exact ? '' : 'about '}${money(u.value / 100)} per bar` : 'in dollars per bar';
          return R`${name}: \(${usd(p)} \div ${n} ${exact ? '=' : R`\approx`} ${num(u.value / 100, { fixed: places })}\), ${tail}.`;
        };
        const verdict = uA.eq(uB) ? 'The two unit prices are equal, so neither pack is the better buy.' : `${uA.lt(uB) ? 'Pack A' : 'Pack B'} has the lower unit price, so it is the better buy.`;
        return {
          problem: `Pack A has ${nA} granola ${nA === 1 ? 'bar' : 'bars'} for ${money(pA)}. Pack B has ${nB} granola ${nB === 1 ? 'bar' : 'bars'} for ${money(pB)}. Which pack is the better buy?`,
          steps: ['The better buy has the lower unit price: the cost of 1 bar. Divide each price by its number of bars.', line('Pack A', pA, nA, uA), line('Pack B', pB, nB, uB), verdict],
          answer: uA.eq(uB) ? 'The unit prices are equal.' : uA.lt(uB) ? 'Pack A is the better buy.' : 'Pack B is the better buy.',
        };
      },
    },
  ],

  quiz: {
    easy: [easyWriteRatio, easySimplify, easyEquivalent, easyTableMissing, easyUnitRate],
    medium: [mediumTapeTotal, mediumPartOfWhole, mediumUseUnitRate, mediumBetterBuy, mediumConvert],
    hard: [hardTapeDifference, hardTimeForDistance, hardConvertTwoStep, hardRecipeScale, hardCompareRates],
    challenge: [challengeAddToChange, challengeThreePart, challengeAverageSpeed, challengeRateConvert, challengeError],
  },
};
