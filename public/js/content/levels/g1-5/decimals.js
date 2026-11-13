import { R, q, num, txt, money, person, fracTex, plural } from '../../lib/index.js';

// Decimals are built from whole numbers of tenths, hundredths or thousandths, so the arithmetic stays exact.
const val = (k, scale) => Math.round((k / scale) * 1e6) / 1e6;
const dm = (x, opts) => R`\(${num(x, opts)}\)`; // a decimal as inline math
const fix = (x, places) => num(x, { fixed: places });
const F = (n, d) => R`\(${fracTex(n, d)}\)`;
const PLACE = ['ones', 'tenths', 'hundredths', 'thousandths'];
const PLACE_ONE = ['one', 'tenth', 'hundredth', 'thousandth'];
const column = (op, a, b, result, places) => R`\[\begin{array}{r} ${fix(a, places)} \\ ${op}\ ${fix(b, places)} \\ \hline ${fix(result, places)} \end{array}\]`;
const ITEMS = ['notebook', 'marker', 'yo-yo', 'key ring', 'snack bar', 'bookmark'];

// ───────────── Easy: tenths and hundredths ─────────────

function easyFractionToDecimal(rng) {
  const den = rng.bool(0.4) ? 10 : 100;
  const n = den === 10 ? rng.int(1, 9) : rng.intExcept(1, 99, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
  const x = val(n, den);
  const wrong = den === 10
    ? [{ value: val(n, 100), why: `That is ${plural(n, 'hundredth')}. Tenths go in the first place after the point.` }, { value: n, why: `${plural(n, 'tenth')} is less than 1 whole.` }, val(n + 1, 10), val(n, 1000)]
    : n < 10
      ? [{ value: val(n, 10), why: `That is ${plural(n, 'tenth')}. Hundredths need a 0 in the tenths place first.` }, { value: n, why: `${plural(n, 'hundredth')} is much less than 1 whole.` }, val(n, 1000), val(n + 1, 100)]
      : [{ value: val(n, 10), why: `${n} hundredths is less than 1 whole. The number starts with 0.` }, { value: val(n, 1000), why: 'Hundredths fill the first two places after the point.' }, { value: n, why: `${n} hundredths is less than 1 whole.` }, val(n + 1, 100)];
  return q({
    prompt: `Write ${F(n, den)} as a decimal.`,
    correct: x,
    wrong,
    solution: [
      den === 10 ? 'Tenths go in the first place after the decimal point.' : 'Hundredths fill the first two places after the decimal point.',
      den === 100 && n < 10 ? `There are no tenths, so write 0 in the tenths place.` : `${plural(n, den === 10 ? 'tenth' : 'hundredth')} is less than 1, so the ones place is 0.`,
      R`\(${fracTex(n, den)} = ${num(x)}\).`,
    ],
    rule: 0,
    skill: 'fractions as decimals',
    check: () => (Math.abs(x * den - n) < 1e-9 ? true : 'decimal does not match the fraction'),
  });
}

function easyDecimalToFraction(rng) {
  const den = rng.bool(0.4) ? 10 : 100;
  const n = den === 10 ? rng.int(1, 9) : rng.intExcept(1, 99, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
  const x = val(n, den);
  const [tens, ones] = [Math.floor(n / 10), n % 10];
  return q({
    prompt: `Which fraction is equal to ${dm(x)}?`,
    correct: F(n, den),
    wrong: [
      { value: F(n, den === 10 ? 100 : 10), why: den === 10 ? 'One place after the point means tenths.' : 'Two places after the point means hundredths.' },
      tens ? { value: F(tens, ones), why: `The digits ${tens} and ${ones} are not a top and a bottom. Together they say ${n} hundredths.` } : { value: F(1, n === 1 ? 2 : n), why: `The digit ${n} counts the parts. It goes on top.` },
      F(n, 1000),
      F(den, n),
    ],
    solution: [den === 10 ? `${num(x)} has one place after the point. That place is tenths.` : `${num(x)} has two places after the point. The last one is hundredths.`, `Read it as "${plural(n, den === 10 ? 'tenth' : 'hundredth')}".`, R`\(${num(x)} = ${fracTex(n, den)}\).`],
    rule: 0,
    skill: 'decimals as fractions',
    check: () => (Math.abs(n / den - x) < 1e-9 ? true : 'fraction does not match the decimal'),
  });
}

function easyNumberLine(rng) {
  const w = rng.int(0, 9);
  const t = rng.int(1, 9);
  const x = val(10 * w + t, 10);
  return q({
    prompt: `The space between ${w} and ${w + 1} is cut into 10 equal jumps. What decimal is at the point?`,
    visual: { type: 'numberLine', min: w, max: w + 1, step: 0.1, labels: [{ value: w, text: String(w) }, { value: w + 1, text: String(w + 1) }], points: [{ value: x, label: '?' }], alt: `A number line from ${w} to ${w + 1} with 10 equal jumps. A point is ${t} ${t === 1 ? 'jump' : 'jumps'} after ${w}.` },
    correct: x,
    wrong: [
      { value: val(100 * w + t, 100), why: 'Ten jumps make 1 whole, so each jump is one tenth.' },
      { value: val(10 * w + t + 1, 10), why: `Count the jumps, not the tick marks. The point is ${t} ${t === 1 ? 'jump' : 'jumps'} after ${w}.` },
      w ? { value: val(w + 10 * t, 10), why: `The point is between ${w} and ${w + 1}, so the number starts with ${w}.` } : t,
      val(10 * w + t - 1, 10) || val(t + 2, 10),
    ],
    solution: ['Ten equal jumps make 1 whole, so each jump is 1 tenth, or 0.1.', `The point is ${t} ${t === 1 ? 'jump' : 'jumps'} after ${w}.`, `That is ${w} and ${plural(t, 'tenth')}: ${num(x)}.`],
    rule: 0,
    skill: 'decimals on a number line',
    check: () => (Math.abs(x - (w + t * 0.1)) < 1e-9 ? true : 'point does not match'),
  });
}

function easyPlaceValue(rng) {
  const [o, t, h] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const x = val(100 * o + 10 * t + h, 100);
  const i = rng.int(0, 2);
  const d = [o, t, h][i];
  const name = (place) => `${d} ${d === 1 ? PLACE_ONE[place] : PLACE[place]}`;
  const others = [0, 1, 2].filter((k) => k !== i);
  return q({
    prompt: `What is the value of the digit ${d} in ${dm(x)}?`,
    correct: name(i),
    wrong: [
      { value: name(others[0]), why: `Count the places. The ${d} is in the ${PLACE[i]} place.` },
      { value: name(others[1]), why: `Count the places. The ${d} is in the ${PLACE[i]} place.` },
      i === 0 ? name(3) : `${d} ${d === 1 ? 'ten' : 'tens'}`,
    ],
    solution: ['The ones place is just left of the point. Tenths come first after the point, then hundredths.', `The ${d} is in the ${PLACE[i]} place.`, `Its value is ${name(i)}${i ? `, or ${num(val(d, 10 ** i))}` : ''}.`],
    rule: 0,
    skill: 'place value',
    check: () => (Math.floor(Math.round(x * 100) / 10 ** (2 - i)) % 10 === d ? true : 'digit is not in that place'),
  });
}

// ───────────── Medium: comparing, adding and subtracting ─────────────

function comparePair(rng) {
  const w = rng.int(0, 9);
  const deep = rng.bool(0.4);
  const scale = deep ? 100 : 10; // the shorter number has `scale` parts in a whole
  const s = deep ? rng.intExcept(11, 99, [20, 30, 40, 50, 60, 70, 80, 90]) : rng.int(1, 9);
  const l = rng.bool(0.6) ? 10 * s - rng.int(1, 9) : 10 * s + rng.int(1, 9);
  const places = deep ? 3 : 2;
  return { short: val(w * scale + s, scale), long: val(w * scale * 10 + l, scale * 10), sParts: w * scale * 10 + 10 * s, lParts: w * scale * 10 + l, places };
}

function mediumCompare(rng) {
  const p = comparePair(rng);
  const shortFirst = rng.bool();
  const [x, y] = shortFirst ? [p.short, p.long] : [p.long, p.short];
  const less = x < y;
  const sym = less ? '<' : '>';
  const unit = PLACE[p.places];
  return q({
    prompt: 'Which comparison is true?',
    correct: R`\(${num(x)} ${sym} ${num(y)}\)`,
    wrong: [
      { value: R`\(${num(x)} ${less ? '>' : '<'} ${num(y)}\)`, why: `Write both with ${p.places} decimal places, ${fix(p.short, p.places)} and ${fix(p.long, p.places)}. Then compare place by place.` },
      R`\(${num(x)} = ${num(y)}\)`,
      R`\(${num(y)} ${sym} ${num(x)}\)`,
    ],
    solution: [
      `Write both numbers with ${p.places} decimal places: ${fix(p.short, p.places)} and ${fix(p.long, p.places)}.`,
      `Now both count ${unit}: ${txt(p.sParts)} ${unit} and ${txt(p.lParts)} ${unit}.`,
      R`${txt(p.sParts)} is ${p.sParts > p.lParts ? 'more' : 'less'} than ${txt(p.lParts)}, so \(${num(x)} ${sym} ${num(y)}\).`,
    ],
    rule: 1,
    skill: 'comparing decimals',
    check: () => (p.short !== p.long && p.sParts > p.lParts === p.short > p.long ? true : 'comparison does not match'),
  });
}

function mediumAdd(rng) {
  const A = rng.intExcept(101, 989, [200, 300, 400, 500, 600, 700, 800, 900]); // hundredths
  const B = rng.int(3, 98); // tenths
  if (A % 10 === 0 || B % 10 === 0) return mediumAdd(rng);
  const [a, b, sum] = [val(A, 100), val(B, 10), val(A + 10 * B, 100)];
  const flip = rng.bool();
  return q({
    prompt: flip ? R`What is \(${num(b)} + ${num(a)}\)?` : R`What is \(${num(a)} + ${num(b)}\)?`,
    correct: sum,
    wrong: [
      { value: val(A + B, 100), why: `Line up the decimal points, not the last digits. ${num(b)} is the same as ${fix(b, 2)}.` },
      { value: val(A + 10 * B, 10), why: 'The decimal point stays lined up with the points above it.' },
      val(A + 10 * B + 10, 100),
      val(A + 10 * B - 100, 100) > 0 ? val(A + 10 * B - 100, 100) : val(A + 10 * B + 100, 100),
      val(A + 10 * B + 1, 100),
    ],
    solution: [`Line up the decimal points. Write ${num(b)} as ${fix(b, 2)} so both have two places.`, flip ? column('+', b, a, sum, 2) : column('+', a, b, sum, 2), `Add each place, starting at the right. The sum is ${num(sum)}.`],
    rule: 3,
    skill: 'adding decimals',
    check: () => (Math.abs(sum - b - a) < 1e-9 ? true : 'sum does not undo'),
  });
}

function mediumSubtract(rng) {
  const A = rng.int(21, 98); // tenths
  const B = rng.int(105, 10 * A - 12); // hundredths
  if (A % 10 === 0 || B % 10 === 0) return mediumSubtract(rng);
  const [a, b, d] = [val(A, 10), val(B, 100), val(10 * A - B, 100)];
  const digitsOf = (k) => [Math.floor(k / 100), Math.floor(k / 10) % 10, k % 10];
  const upsideDown = digitsOf(10 * A).map((x, i) => Math.abs(x - digitsOf(B)[i]));
  return q({
    prompt: R`What is \(${num(a)} - ${num(b)}\)?`,
    correct: d,
    wrong: [
      { value: val(100 * upsideDown[0] + 10 * upsideDown[1] + upsideDown[2], 100), why: `Write ${num(a)} as ${fix(a, 2)}. Then regroup when the top digit is smaller. Do not subtract upside down.` },
      { value: val(10 * A - (B - (B % 10)), 100), why: `Do not leave out the ${plural(B % 10, 'hundredth')}. Subtract ${B % 10 === 1 ? 'it' : 'them'} too.` },
      { value: val(10 * A + B, 100), why: 'This adds. The sign is a minus.' },
      val(10 * A - B + 10, 100),
      val(10 * A - B + 100, 100),
    ],
    solution: [`Line up the decimal points. Write ${num(a)} as ${fix(a, 2)} so both have two places.`, column('-', a, b, d, 2), `Subtract each place, regrouping when needed. The difference is ${num(d)}.`, R`Check by adding: \(${num(d)} + ${num(b)} = ${num(a)}\).`],
    rule: 3,
    skill: 'subtracting decimals',
    check: () => (Math.abs(d + b - a) < 1e-9 && d > 0 ? true : 'difference does not add back'),
  });
}

function mediumMoney(rng) {
  const name = person(rng);
  const [i1, i2] = rng.sample(ITEMS, 2);
  if (rng.bool()) {
    const [p1, p2] = [5 * rng.int(25, 180), 5 * rng.int(15, 120)];
    const total = p1 + p2;
    return q({
      prompt: `${name} buys a ${i1} for ${money(p1 / 100)} and a ${i2} for ${money(p2 / 100)}. How much does ${name} spend in all?`,
      correct: money(total / 100),
      wrong: [
        p1 !== p2 ? { value: money(Math.abs(p1 - p2) / 100), why: 'The two prices are put together, so add.' } : null,
        { value: money((total - 100) / 100), why: 'When the cents add up to 100 or more, they make another dollar.' },
        money((total + 100) / 100),
        money((total + 10) / 100),
        money((total + 50) / 100),
      ],
      solution: ['Both prices are paid, so add. Line up the decimal points.', column('+', p1 / 100, p2 / 100, total / 100, 2), `${name} spends ${money(total / 100)}.`],
      rule: 3,
      skill: 'word problems',
      check: () => (total - p2 === p1 ? true : 'sum does not undo'),
    });
  }
  const have = rng.pick([5, 10, 20]) * 100;
  const price = 5 * rng.int(21, have / 5 - 11);
  if (price % 100 === 0) return mediumMoney(rng);
  const left = have - price;
  return q({
    prompt: `${name} has ${money(have / 100)}. ${name} buys a ${i1} for ${money(price / 100)}. How much money is left?`,
    correct: money(left / 100),
    wrong: [
      { value: money((left + 100) / 100), why: `Write ${money(have / 100)} as ${fix(have / 100, 2)} and regroup. A dollar is traded for 100 cents.` },
      { value: money((have + price) / 100), why: 'Buying uses up money, so subtract.' },
      money((left + 10) / 100),
      money(left - 100 > 0 ? (left - 100) / 100 : (left + 200) / 100),
      money((left + 5) / 100),
    ],
    solution: [`Money is spent, so subtract. Write ${money(have / 100)} as ${fix(have / 100, 2)}.`, column('-', have / 100, price / 100, left / 100, 2), `${money(left / 100)} is left.`],
    rule: 3,
    skill: 'word problems',
    check: () => (left + price === have && left > 0 ? true : 'difference does not add back'),
  });
}

// ───────────── Hard: rounding, multiplying, dividing ─────────────

function hardRound(rng) {
  const K = rng.int(1001, 9998); // thousandths
  const place = rng.int(0, 2); // 0 whole number, 1 tenth, 2 hundredth
  const unit = 10 ** (3 - place);
  if (K % 10 === 0 || K % unit === 0) return hardRound(rng);
  const x = val(K, 1000);
  const lower = Math.floor(K / unit) * unit;
  const next = Math.floor((K % unit) / (unit / 10));
  const up = next >= 5;
  const correct = up ? lower + unit : lower;
  const show = (k, p = place) => dm(val(k, 1000), { fixed: p });
  const otherPlace = place === 2 ? 1 : place + 1;
  const otherUnit = 10 ** (3 - otherPlace);
  return q({
    prompt: `Round ${dm(x)} to the nearest ${place === 0 ? 'whole number' : PLACE_ONE[place]}.`,
    correct: show(correct),
    wrong: [
      { value: show(up ? lower : lower + unit), why: `The digit to the right is ${next}. That is ${up ? '5 or more, so round up' : 'less than 5, so round down'}.` },
      { value: show(Math.round(K / otherUnit) * otherUnit, otherPlace), why: `That is rounded to the nearest ${otherPlace === 0 ? 'whole number' : PLACE_ONE[otherPlace]}. The question asks for the nearest ${place === 0 ? 'whole number' : PLACE_ONE[place]}.` },
      show(correct + unit),
      show(correct - unit > 0 ? correct - unit : correct + 2 * unit),
      show(correct + 2 * unit),
      show(correct + 3 * unit),
    ],
    solution: [
      `${num(x)} is between ${fix(val(lower, 1000), place)} and ${fix(val(lower + unit, 1000), place)}.`,
      `Look at the digit to the right of the ${PLACE[place]} place. It is ${next}.`,
      up ? `${next} is 5 or more, so round up.` : `${next} is less than 5, so round down.`,
      `${num(x)} rounds to ${fix(val(correct, 1000), place)}.`,
    ],
    rule: 2,
    skill: 'rounding decimals',
    check: () => {
      const gap = Math.abs(K - correct);
      return correct % unit === 0 && (gap < unit / 2 || (gap === unit / 2 && correct > K)) ? true : 'not the nearest value';
    },
  });
}

// A multiplication a × b where a has pa decimal places and b has pb.
function timesParts(rng) {
  const kind = rng.pick(['tenthsWhole', 'hundredthsWhole', 'tenthsTenths']);
  const [A, pa] = kind === 'hundredthsWhole' ? [rng.int(105, 495), 2] : [rng.int(2, 48), 1];
  const [B, pb] = kind === 'tenthsTenths' ? [rng.int(2, 9), 1] : [rng.int(2, 9), 0];
  if (A % 10 === 0) return timesParts(rng);
  return { A, B, pa, pb, a: val(A, 10 ** pa), b: val(B, 10 ** pb), p: val(A * B, 10 ** (pa + pb)), places: pa + pb };
}
const timesSteps = ({ A, B, pa, pb, a, b, p, places }) => [
  R`Multiply as whole numbers: \(${A} \times ${B} = ${A * B}\).`,
  pb ? `${num(a)} has ${pa} decimal ${pa === 1 ? 'place' : 'places'} and ${num(b)} has ${pb}. That is ${places} in all.` : `${num(a)} has ${pa} decimal ${pa === 1 ? 'place' : 'places'}. ${B} has none.`,
  R`Give the product ${places} decimal ${places === 1 ? 'place' : 'places'}: \(${num(a)} \times ${num(b)} = ${num(p)}\).`,
];

function hardMultiply(rng) {
  const t = timesParts(rng);
  return q({
    prompt: R`What is \(${num(t.a)} \times ${num(t.b)}\)?`,
    correct: t.p,
    wrong: [
      { value: val(t.A * t.B, 10 ** (t.places - 1)), why: `Count the decimal places in both factors. The product needs ${t.places}.` },
      { value: val(t.A * t.B, 10 ** (t.places + 1)), why: `That has too many decimal places. The product needs ${t.places}.` },
      { value: val(Math.round((t.a + t.b) * 1000), 1000), why: 'This adds. The sign is a times sign.' },
      val(t.A * t.B + 10 ** t.places, 10 ** t.places),
    ],
    solution: timesSteps(t),
    rule: 4,
    skill: 'multiplying decimals',
    check: () => (Math.abs(t.a * t.b - t.p) < 1e-9 ? true : 'product does not match'),
  });
}

// A division with a whole-number divisor that comes out even.
function divideParts(rng) {
  const d = rng.int(2, 9);
  const scale = rng.pick([10, 10, 100]);
  const Q = scale === 10 ? rng.int(2, 48) : rng.int(3, 148);
  if (Q % 10 === 0) return divideParts(rng);
  const N = Q * d;
  const places = N % 10 === 0 && scale === 100 ? 1 : scale === 10 ? 1 : 2;
  return { d, Q, N, scale, n: val(N, scale), quo: val(Q, scale), unit: scale === 10 ? 'tenths' : 'hundredths', places };
}
const divideSteps = ({ d, Q, N, n, quo, unit }) => [`Think of ${num(n)} as ${N} ${unit}.`, R`\(${N} \div ${d} = ${Q}\), so the answer is ${Q} ${unit}.`, R`${Q} ${unit} is \(${num(quo)}\). Check: \(${num(quo)} \times ${d} = ${num(n)}\).`];

function hardDivide(rng) {
  const p = divideParts(rng);
  return q({
    prompt: R`What is \(${num(p.n)} \div ${p.d}\)?`,
    correct: p.quo,
    wrong: [
      { value: val(p.Q, p.scale / 10), why: `The answer is ${p.Q} ${p.unit}, not ${p.Q} ${p.scale === 10 ? 'ones' : 'tenths'}. Keep the decimal point in place.` },
      { value: val(p.Q, p.scale * 10), why: `The answer is ${p.Q} ${p.unit}. That has too many decimal places.` },
      val(p.Q + 1, p.scale),
      val(p.Q + 10, p.scale),
      val(p.N * p.d, p.scale),
    ],
    solution: divideSteps(p),
    rule: 5,
    skill: 'dividing decimals',
    check: () => (Math.abs(p.quo * p.d - p.n) < 1e-9 ? true : 'quotient does not multiply back'),
  });
}

function hardStory(rng) {
  const name = person(rng);
  if (rng.bool()) {
    const t = timesParts(rng);
    if (t.pb) return hardStory(rng);
    const [things, unit] = rng.pick([['ribbons', 'meters'], ['boards', 'meters'], ['jugs of water', 'liters'], ['bags of rice', 'kilograms']]);
    return q({
      prompt: unit === 'meters' ? `${name} has ${t.B} ${things}. Each one is ${num(t.a)} meters long. How long are they in all?` : `${name} buys ${t.B} ${things}. Each one holds ${num(t.a)} ${unit}. How much is that in all?`,
      correct: t.p,
      unit,
      wrong: [
        { value: val(t.A * t.B, 10 ** (t.places - 1)), why: `Count the decimal places. ${num(t.a)} has ${t.pa}, so the product needs ${t.pa}.` },
        { value: val(Math.round((t.a + t.b) * 1000), 1000), why: `There are ${t.B} equal amounts, so multiply.` },
        val(t.A * t.B + 10 ** t.places, 10 ** t.places),
        val(t.A * t.B, 10 ** (t.places + 1)),
      ],
      solution: [`There are ${t.B} equal amounts of ${num(t.a)} ${unit}, so multiply.`, ...timesSteps(t), `That is ${num(t.p)} ${unit} in all.`],
      rule: 4,
      skill: 'word problems',
      check: () => (Math.abs(t.a * t.b - t.p) < 1e-9 ? true : 'product does not match'),
    });
  }
  const p = divideParts(rng);
  const [stuff, unit] = rng.pick([['rice', 'kilograms'], ['juice', 'liters'], ['rope', 'meters'], ['soil', 'kilograms']]);
  return q({
    prompt: `${num(p.n)} ${unit} of ${stuff} is shared equally into ${p.d} parts. How much is in each part?`,
    correct: p.quo,
    unit,
    wrong: [
      { value: val(p.Q, p.scale / 10), why: 'Each part must be smaller than the whole amount. Keep the decimal point in place.' },
      { value: val(p.N * p.d, p.scale), why: 'Sharing makes smaller amounts, so divide.' },
      val(p.Q, p.scale * 10),
      val(p.Q + 1, p.scale),
      val(p.Q + 10, p.scale),
    ],
    solution: [`The amount is split into ${p.d} equal parts, so divide by ${p.d}.`, ...divideSteps(p)],
    rule: 5,
    skill: 'word problems',
    check: () => (Math.abs(p.quo * p.d - p.n) < 1e-9 ? true : 'quotient does not multiply back'),
  });
}

// ───────────── Challenge ─────────────

function challengeDivideByDecimal(rng) {
  const scale = rng.pick([10, 10, 100]);
  const k = rng.int(2, 9);
  const Q = rng.int(3, 24);
  const d = val(k, scale);
  const n = val(Q * k, scale);
  const story = rng.bool(0.4);
  return q({
    prompt: story ? `A ribbon is ${num(n)} meters long. It is cut into pieces that are each ${num(d)} meter long. How many pieces are there?` : R`What is \(${num(n)} \div ${num(d)}\)?`,
    correct: Q,
    wrong: [
      { value: val(Q, 10), why: `${num(d)} is less than 1, so more than ${num(n)} of them fit. Make both numbers ${scale} times as big first.` },
      { value: val(Math.round(n * d * 1e6), 1e6), why: `This multiplies. Dividing asks how many ${num(d)}s fit into ${num(n)}.` },
      Q * 10,
      Q + 1,
      val(Q, 100),
    ],
    solution: [`Ask: how many ${num(d)}s fit into ${num(n)}?`, R`Make both numbers ${scale} times as big. The answer stays the same: \(${num(val(Q * k * scale, scale))} \div ${k}\).`, R`\(${Q * k} \div ${k} = ${Q}\)${story ? `, so there are ${Q} pieces` : ''}.`, R`Check: \(${Q} \times ${num(d)} = ${num(n)}\).`],
    rule: 5,
    skill: story ? 'word problems' : 'dividing by a decimal',
    check: () => (Math.abs(Q * d - n) < 1e-9 ? true : 'quotient does not multiply back'),
  });
}

function challengeMissing(rng) {
  const kind = rng.pick(['add', 'subtract', 'times']);
  if (kind === 'times') {
    const p = divideParts(rng);
    return q({
      prompt: R`What number goes in the box? \(\;\square \times ${p.d} = ${num(p.n)}\)`,
      correct: p.quo,
      wrong: [{ value: val(p.N * p.d, p.scale), why: `The box is multiplied by ${p.d}. To undo that, divide ${num(p.n)} by ${p.d}.` }, { value: val(p.Q, p.scale / 10), why: 'Check it by multiplying. The decimal point is in the wrong place.' }, val(p.Q + 1, p.scale), val(p.Q, p.scale * 10), val(p.Q + 10, p.scale)],
      solution: [R`Undo the multiplying: \(${num(p.n)} \div ${p.d}\).`, ...divideSteps(p)],
      rule: 5,
      skill: 'missing number',
      check: () => (Math.abs(p.quo * p.d - p.n) < 1e-9 ? true : 'box value does not fit'),
    });
  }
  const X = rng.int(105, 895); // hundredths
  const B = rng.int(11, 79); // tenths
  if (X % 10 === 0 || B % 10 === 0) return challengeMissing(rng);
  const [x, b] = [val(X, 100), val(B, 10)];
  if (kind === 'add') {
    const t = val(X + 10 * B, 100);
    return q({
      prompt: R`What number goes in the box? \(\;\square + ${num(b)} = ${num(t)}\)`,
      correct: x,
      wrong: [{ value: val(X + 20 * B, 100), why: `The box is a part of ${num(t)}, so it is smaller. Subtract ${num(b)}.` }, { value: val(X + 10 * B - B, 100), why: `Line up the decimal points. ${num(b)} is ${fix(b, 2)}.` }, val(X + 10, 100), val(X + 100, 100), val(X - 1, 100)],
      solution: [R`The box is the total minus the part you know: \(${num(t)} - ${num(b)}\).`, column('-', t, b, x, 2), R`Check: \(${num(x)} + ${num(b)} = ${num(t)}\).`],
      rule: 3,
      skill: 'missing number',
      check: () => (Math.abs(x + b - t) < 1e-9 ? true : 'box value does not fit'),
    });
  }
  const start = val(X + 10 * B, 100);
  return q({
    prompt: R`What number goes in the box? \(\;\square - ${num(b)} = ${num(x)}\)`,
    correct: start,
    wrong: [{ value: val(Math.abs(X - 10 * B), 100), why: `The box is the starting number, so it is bigger than ${num(x)}. Add ${num(b)}.` }, { value: val(X + B, 100), why: `Line up the decimal points. ${num(b)} is ${fix(b, 2)}.` }, val(X + 10 * B + 10, 100), val(X + 10 * B + 100, 100), val(X + 10 * B - 1, 100)],
    solution: [R`The box is the two parts put together: \(${num(x)} + ${num(b)}\).`, column('+', x, b, start, 2), R`Check: \(${num(start)} - ${num(b)} = ${num(x)}\).`],
    rule: 3,
    skill: 'missing number',
    check: () => (Math.abs(start - b - x) < 1e-9 ? true : 'box value does not fit'),
  });
}

function challengeOrder(rng) {
  const w = rng.int(0, 9);
  const t = rng.int(2, 9);
  const one = 1000 * w + 100 * t; // one decimal place
  const two = 1000 * w + 100 * (t - 1) + 10 * rng.int(1, 9); // two places, a little less
  const three = 1000 * w + 100 * (t - rng.int(0, 1)) + 10 * rng.int(0, 9) + rng.int(1, 9); // three places
  const sorted = [one, two, three].sort((p, r) => p - r);
  if (new Set(sorted).size < 3 || (sorted[0] === one && sorted[2] === three)) return challengeOrder(rng);
  const chain = (list) => R`\(${list.map((k) => num(val(k, 1000))).join(' < ')}\)`;
  const [a, b, c] = sorted;
  return q({
    prompt: 'Which shows the numbers in order from least to greatest?',
    correct: chain(sorted),
    wrong: [
      { value: chain([one, two, three]), why: 'More digits does not mean a bigger number. Give every number three decimal places, then compare.' },
      { value: chain([c, b, a]), why: 'That is greatest to least. The symbol < means "is less than".' },
      chain([a, c, b]),
      chain([b, a, c]),
    ],
    solution: [`Write every number with three decimal places: ${sorted.map((k) => fix(val(k, 1000), 3)).join(', ')}.`, `Now compare them as thousandths: ${sorted.map((k) => txt(k)).join('; ')}.`, `The order is ${chain(sorted)}.`],
    rule: 1,
    skill: 'ordering decimals',
    check: () => (a < b && b < c ? true : 'not in order'),
  });
}

function challengeShopping(rng) {
  const name = person(rng);
  const item = rng.pick(ITEMS);
  const k = rng.int(2, 5);
  const price = rng.int(115, 495);
  const bill = k * price < 900 ? 1000 : 2000;
  if (price % 10 === 0 || k * price > 1900) return challengeShopping(rng);
  const total = k * price;
  const change = bill - total;
  return q({
    prompt: `${name} buys ${k} ${item}s that cost ${money(price / 100)} each. ${name} pays with a ${money(bill / 100)} bill. How much change does ${name} get?`,
    correct: money(change / 100),
    wrong: [
      { value: money(total / 100), why: `That is the cost of the ${item}s. Subtract it from ${money(bill / 100)} to find the change.` },
      { value: money((bill - price) / 100), why: `That pays for only one ${item}. Multiply the price by ${k} first.` },
      money((change + 100) / 100),
      money((change + 10) / 100),
      money((change + 50) / 100),
    ],
    solution: [R`Find the cost: \(${k} \times ${fix(price / 100, 2)} = ${fix(total / 100, 2)}\).`, R`Subtract from the bill: \(${fix(bill / 100, 2)} - ${fix(total / 100, 2)} = ${fix(change / 100, 2)}\).`, `${name} gets ${money(change / 100)} back.`],
    rule: 4,
    skill: 'word problems',
    check: () => (Array(k).fill(price).reduce((s, v) => s + v, 0) + change === bill && change > 0 ? true : 'change does not add back'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'decimals',
  title: 'Decimals',
  summary: 'Read, compare and round decimals, and add, subtract, multiply and divide them.',
  grade: 'Grades 4–5',
  standards: ['CCSS 4.NF.C.6', 'CCSS 4.NF.C.7', 'CCSS 5.NBT.A.3', 'CCSS 5.NBT.A.4', 'CCSS 5.NBT.B.7'],

  explain: {
    intro: 'A decimal is another way to write some fractions. Their bottom numbers are 10, 100 or 1,000. The decimal point sits just after the ones place. Each place to the right is ten times smaller than the place before it.',
    rules: [
      {
        title: 'Tenths, hundredths, thousandths',
        text: 'The first place after the point is tenths. The second is hundredths. The third is thousandths. A 0 holds a place that is empty.',
        example: R`\(\frac{7}{10} = 0.7\), \(\frac{23}{100} = 0.23\) and \(\frac{3}{100} = 0.03\).`,
      },
      {
        title: 'Comparing decimals',
        text: 'Line up the decimal points. Compare place by place from the left. You can write zeros on the end to make the numbers the same length.',
        example: R`\(0.5 > 0.45\), because \(0.50\) is 50 hundredths and \(0.45\) is 45 hundredths.`,
      },
      {
        title: 'Rounding decimals',
        text: 'Find the place you are rounding to. Look at the digit just to its right. If it is 5 or more, round up. If it is less than 5, round down.',
        example: R`\(3.476\) to the nearest tenth: the next digit is 7, so round up to \(3.5\).`,
      },
      {
        title: 'Adding and subtracting',
        text: 'Line up the decimal points so each place is under the same place. Write zeros in any empty places. Then add or subtract as with whole numbers.',
        example: R`\(2.35 + 1.4\): write \(1.4\) as \(1.40\). Then \(2.35 + 1.40 = 3.75\).`,
      },
      {
        title: 'Multiplying',
        text: 'Multiply as if there were no decimal points. Count the decimal places in both factors. The product has that many decimal places.',
        example: R`\(0.3 \times 0.4\): \(3 \times 4 = 12\), and there are 2 decimal places in all, so the product is \(0.12\).`,
      },
      {
        title: 'Dividing',
        text: 'To divide by a whole number, divide as usual. Keep the decimal point in its place. To divide by a decimal, make both numbers 10 or 100 times as big first.',
        example: R`\(4.8 \div 6 = 0.8\), because 48 tenths divided by 6 is 8 tenths. \(6 \div 0.2 = 60 \div 2 = 30\).`,
      },
    ],
    vocab: [
      { term: 'decimal point', def: 'The dot that separates the ones from the tenths.' },
      { term: 'tenth', def: R`One of 10 equal parts of a whole: \(0.1\).` },
      { term: 'hundredth', def: R`One of 100 equal parts of a whole: \(0.01\).` },
      { term: 'thousandth', def: R`One of 1,000 equal parts of a whole: \(0.001\).` },
    ],
    mistakes: [
      R`Thinking more digits means a bigger number. \(0.45\) is less than \(0.5\).`,
      R`Lining up the last digits instead of the decimal points. \(2.35 + 1.4\) is not \(2.49\).`,
      R`Forgetting the zero that holds a place. Three hundredths is \(0.03\), not \(0.3\).`,
      R`Putting too few decimal places in a product. \(0.3 \times 0.4\) is \(0.12\), not \(1.2\).`,
    ],
    visual: { type: 'numberLine', min: 0, max: 1, step: 0.1, points: [{ value: 0.7, label: '0.7 = 7/10' }], alt: 'A number line from 0 to 1 cut into ten equal jumps. The point 0.7 is seven jumps from 0.' },
  },

  examples: [
    {
      title: 'Fractions as decimals',
      problem: R`Write \(\frac{3}{100}\) as a decimal.`,
      steps: ['Hundredths fill the first two places after the decimal point.', 'There are no tenths, so write 0 in the tenths place.', R`\(\frac{3}{100} = 0.03\).`],
      answer: R`\(0.03\)`,
    },
    {
      title: 'Comparing decimals',
      problem: R`Which is greater, \(0.5\) or \(0.45\)?`,
      steps: ['Write both numbers with 2 decimal places: 0.50 and 0.45.', 'Now both count hundredths: 50 hundredths and 45 hundredths.', R`50 is more than 45, so \(0.5 > 0.45\).`],
      answer: R`\(0.5\) is greater.`,
      visual: { type: 'numberLine', min: 0.4, max: 0.5, step: 0.01, labels: [{ value: 0.4, text: '0.40' }, { value: 0.45, text: '0.45' }, { value: 0.5, text: '0.50' }], points: [{ value: 0.45 }, { value: 0.5 }], alt: 'A number line from 0.40 to 0.50. The point 0.45 is to the left of 0.50.' },
    },
    {
      title: 'Adding decimals of different lengths',
      problem: R`Find \(2.35 + 1.4\).`,
      steps: ['Line up the decimal points. Write 1.4 as 1.40 so both have two places.', column('+', 2.35, 1.4, 3.75, 2), 'Add each place, starting at the right. The sum is 3.75.'],
      answer: R`\(3.75\)`,
    },
    {
      title: 'Word problem: sharing a cost',
      word: true,
      problem: 'Four friends share the cost of a $9.40 pizza equally. How much does each friend pay?',
      steps: ['The cost is split into 4 equal parts, so divide by 4.', 'Think of 9.40 as 940 hundredths.', R`\(940 \div 4 = 235\), so each part is 235 hundredths.`, R`235 hundredths is \(2.35\). Check: \(2.35 \times 4 = 9.40\).`],
      answer: '$2.35',
    },
  ],

  models: [
    {
      id: 'decimal-places',
      title: 'The places of a decimal',
      intro: 'Type a number with up to three decimal places. See what each digit is worth.',
      inputs: [{ name: 'x', label: 'Number', type: 'number', min: 0, max: 999.999, step: 0.001, value: 23.405 }],
      compute({ x }) {
        const K = Math.round(x * 1000);
        const whole = Math.floor(K / 1000);
        const wholeDigits = String(whole).split('').map(Number);
        const fracDigits = [Math.floor(K / 100) % 10, Math.floor(K / 10) % 10, K % 10];
        const wholeNames = ['hundreds', 'tens', 'ones'].slice(3 - wholeDigits.length);
        const parts = [];
        const steps = [];
        wholeDigits.forEach((d, i) => {
          const worth = d * 10 ** (wholeDigits.length - 1 - i);
          if (d) {
            parts.push(num(worth));
            steps.push(`The ${d} is in the ${wholeNames[i]} place. It is worth ${num(worth)}.`);
          }
        });
        fracDigits.forEach((d, i) => {
          if (d) {
            parts.push(num(val(d, 10 ** (i + 1))));
            steps.push(`The ${d} is in the ${PLACE[i + 1]} place. It is worth ${num(val(d, 10 ** (i + 1)))}.`);
          }
        });
        const shown = num(val(K, 1000));
        if (!parts.length) steps.push('Every digit is 0, so the number is zero.');
        else steps.push(parts.length > 1 ? R`Expanded form: \(${shown} = ${parts.join(' + ')}\).` : 'Only one digit is not 0, so the number is already in expanded form.');
        return {
          problem: `What is each digit of ${dm(val(K, 1000))} worth?`,
          steps,
          answer: parts.length ? R`\(${shown} = ${parts.join(' + ')}\)` : R`\(0\)`,
          visual: { type: 'table', headers: [...wholeNames, 'point', 'tenths', 'hundredths', 'thousandths'], rows: [[...wholeDigits.map(String), '.', ...fracDigits.map(String)]], alt: `A place-value table for ${shown}.` },
        };
      },
    },
    {
      id: 'shopping-trip',
      title: 'Word problem: a shopping trip',
      word: true,
      intro: 'Change the price, how many you buy, and the bill you pay with.',
      inputs: [
        { name: 'price', label: 'Price of one notebook ($)', type: 'number', min: 0.05, max: 20, step: 0.05, value: 2.35 },
        { name: 'k', label: 'How many notebooks', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'bill', label: 'Pay with', type: 'select', value: '10', options: [{ value: '5', label: 'a $5 bill' }, { value: '10', label: 'a $10 bill' }, { value: '20', label: 'a $20 bill' }, { value: '50', label: 'a $50 bill' }] },
      ],
      compute({ price, k, bill }) {
        const cents = Math.round(price * 100);
        const paid = Number(bill) * 100;
        const total = cents * k;
        const problem = `Maya buys ${plural(k, 'notebook')} that ${k === 1 ? 'costs' : 'cost'} ${money(cents / 100)} each. Maya pays with a $${bill} bill. How much change does Maya get?`;
        const steps = [k === 1 ? `One notebook costs ${money(cents / 100)}.` : R`Find the cost: \(${k} \times ${fix(cents / 100, 2)} = ${fix(total / 100, 2)}\).`];
        if (total > paid) {
          steps.push(`${money(total / 100)} is more than $${bill}.`, R`Maya still needs \(${fix(total / 100, 2)} - ${fix(paid / 100, 2)} = ${fix((total - paid) / 100, 2)}\).`);
          return { problem, steps, answer: `A $${bill} bill is not enough. Maya needs ${money((total - paid) / 100)} more.` };
        }
        steps.push(R`Subtract from the bill: \(${fix(paid / 100, 2)} - ${fix(total / 100, 2)} = ${fix((paid - total) / 100, 2)}\).`);
        return { problem, steps, answer: total === paid ? 'Maya pays the exact amount. There is no change.' : `Maya gets ${money((paid - total) / 100)} back.`, visual: { type: 'barModel', rows: [{ parts: [{ value: total, label: `cost ${money(total / 100)}` }, ...(paid > total ? [{ value: paid - total, label: 'change', shade: 'none' }] : [])], total: `$${bill} paid` }], alt: `A bar for the $${bill} paid, split into the cost, ${money(total / 100)}, and the change.` } };
      },
    },
  ],

  quiz: {
    easy: [easyFractionToDecimal, easyDecimalToFraction, easyNumberLine, easyPlaceValue],
    medium: [mediumCompare, mediumAdd, mediumSubtract, mediumMoney],
    hard: [hardRound, hardMultiply, hardDivide, hardStory],
    challenge: [challengeDivideByDecimal, challengeMissing, challengeOrder, challengeShopping],
  },
};
