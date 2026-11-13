import { R, q, person, txt, vertical, longDiv } from '../../lib/index.js';
import { N, M, digits, numberWords } from './_shared.js';

const roundTo = (n, p) => Math.round(n / p) * p;
const sum = (list) => list.reduce((s, v) => s + v, 0);
// 347 → [300, 40, 7]
const placeParts = (n) => digits(n).map((d, i, all) => d * 10 ** (all.length - 1 - i)).filter((v) => v > 0);

function areaPic(a, b, showCells = false) {
  const cols = placeParts(a);
  const rows = placeParts(b);
  return {
    type: 'areaModel',
    rows: rows.map((v) => txt(v)),
    cols: cols.map((v) => txt(v)),
    cells: showCells ? rows.map((r) => cols.map((c) => txt(r * c))) : undefined,
    alt: `An area model. ${txt(a)} is split into ${cols.map((v) => txt(v)).join(' and ')} across the top. ${txt(b)} is split into ${rows.map((v) => txt(v)).join(' and ')} down the side.`,
  };
}

// Every part of b times every part of a, then the total.
function partialSteps(a, b) {
  const products = placeParts(b).flatMap((r) => placeParts(a).map((c) => [r, c, r * c]));
  const steps = [`Break the numbers into place-value parts and multiply each pair.`, products.map(([r, c, p]) => R`\(${N(r)} \times ${N(c)} = ${N(p)}\)`).join(', ') + '.'];
  if (products.length > 1) steps.push(R`Add the parts: \(${products.map(([, , p]) => N(p)).join(' + ')} = ${N(a * b)}\).`);
  return { steps, total: sum(products.map(([, , p]) => p)) };
}

// The standard method: one row for each digit of b.
function rowSteps(a, b) {
  const rows = placeParts(b).reverse();
  const names = ['ones', 'tens', 'hundreds'];
  const steps = rows.map((r) => R`Multiply by the ${names[String(r).length - 1]}: \(${N(a)} \times ${N(r)} = ${N(a * r)}\).`);
  if (rows.length > 1) steps.push(R`Add the rows: \(${rows.map((r) => N(a * r)).join(' + ')} = ${N(a * b)}\).`);
  return { steps, total: sum(rows.map((r) => a * r)) };
}

// Long division, one sentence for each digit of the quotient.
function divWork(n, d) {
  const ds = digits(n);
  const lines = [];
  let cur = 0;
  let started = false;
  let quotient = 0;
  ds.forEach((digit, i) => {
    cur = cur * 10 + digit;
    const last = i === ds.length - 1;
    if (!started && cur < d && !last) return;
    const qd = Math.floor(cur / d);
    const rem = cur - qd * d;
    let text = started ? '' : `Start with ${cur}. `;
    text += qd === 0 ? `${d} does not fit into ${cur}. Write 0 in the quotient.` : R`${d} fits into ${cur} ${numberWords(qd)} ${qd === 1 ? 'time' : 'times'}: \(${qd} \times ${d} = ${qd * d}\). Subtract: \(${cur} - ${qd * d} = ${rem}\).`;
    if (!last) text += ` Bring down the ${ds[i + 1]} to make ${rem * 10 + ds[i + 1]}.`;
    lines.push(text);
    started = true;
    quotient = quotient * 10 + qd;
    cur = rem;
  });
  return { lines, quotient, remainder: cur };
}
const withRemainder = (k, r) => `${txt(k)} remainder ${r}`;

// ───────────── Easy: one-digit factors and divisors ─────────────

function easyAreaModel(rng) {
  const a = rng.int(12, 98);
  const b = rng.int(3, 9);
  if (a % 10 === 0) return easyAreaModel(rng);
  const [tens, ones] = [a - (a % 10), a % 10];
  const w = partialSteps(a, b);
  return q({
    prompt: R`What is \(${a} \times ${b}\)? Break ${a} into ${tens} and ${ones}.`,
    visual: areaPic(a, b),
    correct: a * b,
    fmt: M,
    wrong: [
      { value: tens * b + ones, why: `Multiply both parts by ${b}. Do not leave out the ${ones === 1 ? '1 one' : `${ones} ones`}.` },
      { value: (tens / 10 + ones) * b, why: `The ${tens / 10} in ${a} means ${tens}, not ${tens / 10}.` },
      a * b + 10,
      a * b - b,
      a * b + b,
    ],
    solution: w.steps,
    rule: 0,
    skill: 'partial products',
    check: () => (w.total === a * b ? true : 'partial products do not add up'),
  });
}

function easyTens(rng) {
  const [a, b] = [rng.int(2, 9), rng.int(2, 9)];
  const [x, y] = rng.pick([[10 * a, 10 * b], [a, 100 * b], [100 * a, b], [10 * a, 100 * b]]);
  const zeros = String(x * y).length - String(a * b).length;
  return q({
    prompt: R`What is \(${N(x)} \times ${N(y)}\)?`,
    correct: x * y,
    fmt: M,
    wrong: [
      { value: (x * y) / 10, why: `Count the zeros in both factors. The basic fact ${a * b} needs ${zeros} more ${zeros === 1 ? 'zero' : 'zeros'}.` },
      { value: x * y * 10, why: 'That has one zero too many. Count the zeros in the factors again.' },
      { value: x + y, why: 'This adds. The times sign means multiply.' },
      a * b,
    ],
    solution: [R`Start with the basic fact: \(${a} \times ${b} = ${a * b}\).`, `The factors are ${txt(x)} and ${txt(y)}. Together they are ${10 ** zeros} times as big as ${a} and ${b}.`, R`So the product is \(${a * b} \times ${N(10 ** zeros)} = ${N(x * y)}\).`],
    rule: 0,
    skill: 'multiples of ten',
    check: () => (a * b * 10 ** zeros === x * y ? true : 'zeros do not match'),
  });
}

function easyDivideTens(rng) {
  const d = rng.int(2, 9);
  const k = rng.int(2, 9);
  const p = rng.pick([10, 100]);
  const n = d * k * p;
  return q({
    prompt: R`What is \(${N(n)} \div ${d}\)?`,
    correct: k * p,
    fmt: M,
    wrong: [
      { value: k, why: `${txt(n)} is ${d * k} ${p === 10 ? 'tens' : 'hundreds'}. The answer is ${k} ${p === 10 ? 'tens' : 'hundreds'}, not ${k} ones.` },
      { value: k * p * 10, why: 'That has one zero too many.' },
      (k + 1) * p,
      (k - 1) * p,
    ],
    solution: [`${txt(n)} is ${d * k} ${p === 10 ? 'tens' : 'hundreds'}.`, R`\(${d * k} \div ${d} = ${k}\), so the answer is ${k} ${p === 10 ? 'tens' : 'hundreds'}.`, R`\(${N(n)} \div ${d} = ${N(k * p)}\).`],
    rule: 2,
    skill: 'dividing multiples of ten',
    check: () => (k * p * d === n ? true : 'quotient does not multiply back'),
  });
}

function easyDivide(rng) {
  const d = rng.int(2, 8);
  const k = rng.int(11, Math.min(49, Math.floor(99 / d)));
  const n = d * k;
  if (k % 10 === 0) return easyDivide(rng);
  const chunk = Math.floor(k / 10) * 10 * d;
  return q({
    prompt: R`What is \(${n} \div ${d}\)?`,
    correct: k,
    wrong: [{ value: k - (k % 10), why: `That uses up only ${chunk}. Divide the other ${n - chunk} too.` }, k + 1, k - 1, k + 10, { value: n - d, why: 'This subtracts. Dividing splits the number into equal groups.' }],
    solution: [`Break ${n} into ${chunk} and ${n - chunk}.`, R`\(${chunk} \div ${d} = ${chunk / d}\) and \(${n - chunk} \div ${d} = ${(n - chunk) / d}\).`, R`Add the parts: \(${chunk / d} + ${(n - chunk) / d} = ${k}\).`],
    rule: 2,
    skill: 'dividing by one digit',
    check: () => (k * d === n && divWork(n, d).quotient === k ? true : 'quotient does not multiply back'),
  });
}

// ───────────── Medium: bigger products, three-digit division ─────────────

function mediumMultiply(rng) {
  const a = rng.int(123, 4899);
  const b = rng.int(3, 9);
  if (a % 10 === 0) return mediumMultiply(rng);
  const w = partialSteps(a, b);
  const noCarry = Number(digits(a).map((dg, i) => (i === 0 ? dg * b : (dg * b) % 10)).join(''));
  const parts = placeParts(a);
  return q({
    prompt: R`What is \(${N(a)} \times ${b}\)?`,
    correct: a * b,
    fmt: M,
    wrong: [
      { value: (a - parts[1]) * b, why: `One part was left out. Multiply every part of ${txt(a)} by ${b}.` },
      noCarry !== a * b && noCarry > 0 ? { value: noCarry, why: 'The regrouped digits were not added. Add them to the next place.' } : null,
      a * b + 100,
      a * b - 10,
      a * b + b,
    ],
    solution: w.steps,
    rule: 0,
    skill: 'multiplying by one digit',
    check: () => (w.total === a * b ? true : 'partial products do not add up'),
  });
}

function mediumTwoByTwo(rng) {
  const a = rng.int(12, 98);
  const b = rng.int(12, 98);
  if (a % 10 === 0 || b % 10 === 0) return mediumTwoByTwo(rng);
  const w = partialSteps(a, b);
  const [a1, a0, b1, b0] = [a - (a % 10), a % 10, b - (b % 10), b % 10];
  return q({
    prompt: R`What is \(${a} \times ${b}\)?`,
    visual: areaPic(a, b),
    correct: a * b,
    fmt: M,
    wrong: [
      { value: a1 * b1 + a0 * b0, why: `There are four parts. Each part of ${a} multiplies each part of ${b}.` },
      { value: a * b0 + a * (b1 / 10), why: `The ${b1 / 10} in ${b} means ${b1}. Multiply by ${b1}, not by ${b1 / 10}.` },
      a * b + 100,
      a * b - 10,
      a * b + a,
    ],
    solution: w.steps,
    rule: 0,
    skill: 'two-digit times two-digit',
    check: () => (w.total === a * b ? true : 'partial products do not add up'),
  });
}

function divideQuestion(n, d, rule = 2) {
  const w = divWork(n, d);
  const { quotient: k, remainder: r } = w;
  const noZero = String(k).includes('0') ? Number(String(k).replace('0', '')) : null;
  const solution = [...w.lines, r ? `The quotient is ${txt(k)} with ${r} left over.` : R`So \(${N(n)} \div ${d} = ${N(k)}\).`, R`Check: \(${N(k)} \times ${d}${r ? ` + ${r}` : ''} = ${N(n)}\).`];
  const check = () => (k * d + r === n && r < d ? true : 'quotient and remainder do not rebuild the number');
  if (r === 0) {
    return q({
      prompt: R`What is \(${N(n)} \div ${d}\)?`,
      correct: k,
      fmt: M,
      wrong: [noZero ? { value: noZero, why: 'If the divisor does not fit, write 0 in the quotient. The 0 holds the place.' } : null, k + 1, k - 1, k + 10, k > 10 ? k - 10 : k + 2],
      solution,
      rule,
      skill: 'long division',
      check,
    });
  }
  return q({
    prompt: R`What is \(${N(n)} \div ${d}\)?`,
    correct: withRemainder(k, r),
    wrong: [
      noZero ? { value: withRemainder(noZero, r), why: 'If the divisor does not fit, write 0 in the quotient. The 0 holds the place.' } : null,
      { value: withRemainder(k - 1, r + d), why: `A remainder of ${r + d} is too big. ${d} fits one more time.` },
      d - r !== r ? withRemainder(k, d - r) : null,
      withRemainder(k + 1, r),
      withRemainder(k + 10, r),
    ],
    solution,
    rule: 3,
    skill: 'long division',
    check,
  });
}

function mediumDivide(rng) {
  const d = rng.int(3, 9);
  const exact = rng.bool();
  const n = rng.int(13, Math.floor(998 / d)) * d + (exact ? 0 : rng.int(1, d - 1));
  return n < 100 ? mediumDivide(rng) : divideQuestion(n, d);
}

const TIMES_STORIES = [
  (a, b) => `A box holds ${a} crayons. A school orders ${b} boxes. How many crayons is that?`,
  (a, b) => `A theater has ${b} rows. Each row has ${a} seats. How many seats are there?`,
  (a, b) => `A truck carries ${a} crates on each trip. It makes ${b} trips. How many crates is that?`,
  (a, b) => `A printer prints ${a} pages each hour. How many pages does it print in ${b} hours?`,
];
const SHARE_STORIES = [
  (n, d) => `A baker packs ${n} muffins into boxes of ${d}. How many boxes does the baker fill?`,
  (n, d) => `${n} pencils are shared equally among ${d} classrooms. How many pencils does each classroom get?`,
  (n, d) => `A farmer plants ${n} trees in ${d} equal rows. How many trees are in each row?`,
  (n, d) => `A ribbon ${n} inches long is cut into ${d} equal pieces. How many inches long is each piece?`,
];

function mediumStory(rng) {
  if (rng.bool()) {
    const a = rng.int(12, 48);
    const b = rng.int(12, 36);
    const w = rowSteps(a, b);
    return q({
      prompt: rng.pick(TIMES_STORIES)(a, b),
      correct: a * b,
      fmt: M,
      wrong: [{ value: a + b, why: 'Every group is the same size, so multiply. Adding counts only one group.' }, { value: a * (b % 10) + a * Math.floor(b / 10), why: `The ${Math.floor(b / 10)} in ${b} means ${b - (b % 10)}.` }, a * b + a, a * b - b, a * b + 10],
      solution: [`There are ${b} equal groups of ${a}, so multiply.`, ...w.steps],
      rule: 1,
      skill: 'word problems',
      check: () => (w.total === a * b ? true : 'rows do not add up'),
    });
  }
  const d = rng.int(3, 9);
  const k = rng.int(24, Math.floor(996 / d));
  const n = d * k;
  const w = divWork(n, d);
  return q({
    prompt: rng.pick(SHARE_STORIES)(n, d),
    correct: k,
    fmt: M,
    wrong: [{ value: n - d, why: 'The story makes equal groups, so divide.' }, { value: n * d, why: 'Splitting into equal groups makes a smaller number. Divide.' }, k + 1, k - 1, k + 10],
    solution: [`${n} is split into equal groups, so divide by ${d}.`, ...w.lines, R`\(${n} \div ${d} = ${k}\).`],
    rule: 2,
    skill: 'word problems',
    check: () => (w.quotient === k && w.remainder === 0 ? true : 'division does not come out even'),
  });
}

// ───────────── Hard: two-digit multipliers and divisors, estimating ─────────────

function hardMultiply(rng) {
  const a = rng.int(123, 987);
  const b = rng.int(12, 98);
  if (a % 10 === 0 || b % 10 === 0) return hardMultiply(rng);
  const w = rowSteps(a, b);
  const [b1, b0] = [b - (b % 10), b % 10];
  return q({
    prompt: R`What is \(${a} \times ${b}\)?`,
    correct: a * b,
    fmt: M,
    wrong: [
      { value: a * b0 + a * (b1 / 10), why: `The ${b1 / 10} in ${b} means ${b1}. The second row is \\(${a} \\times ${b1}\\).` },
      { value: a * b1, why: `That is only the tens row. Add the ones row, \\(${a} \\times ${b0}\\).` },
      a * b + 1000,
      a * b - 100,
      a * b + a,
    ],
    solution: [...w.steps, R`\[${vertical('x', a, b, a * b)}\]`],
    rule: 1,
    skill: 'standard method',
    check: () => (w.total === a * b && partialSteps(a, b).total === a * b ? true : 'rows do not add up'),
  });
}

function hardDivideZero(rng) {
  for (;;) {
    const d = rng.int(3, 9);
    const n = rng.int(1001, 9989);
    const w = divWork(n, d);
    if (!String(w.quotient).slice(1).includes('0') || String(w.quotient).length < 3) continue;
    return divideQuestion(n, d);
  }
}

function hardDivideTwoDigit(rng) {
  const d = rng.int(12, 48);
  const exact = rng.bool(0.6);
  const k = rng.int(12, Math.floor(4800 / d) > 98 ? 98 : Math.floor(4800 / d));
  const n = d * k + (exact ? 0 : rng.int(1, d - 1));
  return divideQuestion(n, d);
}

function hardEstimate(rng) {
  if (rng.bool()) {
    const a = rng.int(12, 98);
    const b = rng.int(12, 98);
    if (a % 10 === 0 || b % 10 === 0 || a % 10 === 5 || b % 10 === 5) return hardEstimate(rng);
    const [ra, rb] = [roundTo(a, 10), roundTo(b, 10)];
    const floors = (a - (a % 10)) * (b - (b % 10));
    return q({
      prompt: R`Estimate \(${a} \times ${b}\). Round each number to the nearest ten first.`,
      correct: ra * rb,
      fmt: M,
      wrong: [
        { value: a * b, why: 'That is the exact product. An estimate uses the rounded numbers.' },
        { value: (ra * rb) / 10, why: `\\(${ra} \\times ${rb}\\) has two zeros to keep: one from each factor.` },
        floors !== ra * rb ? { value: floors, why: 'Round up when the ones digit is 5 or more.' } : null,
        ra * rb + 100,
        ra * rb * 10,
      ],
      solution: [`Round ${a} to ${ra} and ${b} to ${rb}.`, R`\(${ra / 10} \times ${rb / 10} = ${(ra * rb) / 100}\).`, R`So \(${ra} \times ${rb} = ${N(ra * rb)}\).`],
      rule: 4,
      skill: 'estimating',
      check: () => (Math.abs(ra - a) < 5 && Math.abs(rb - b) < 5 && ra % 10 === 0 && rb % 10 === 0 ? true : 'rounding is off'),
    });
  }
  const dd = 10 * rng.int(2, 9);
  const kk = rng.int(2, 9) * rng.pick([10, 100]);
  const d = dd + rng.pick([-2, -1, 1, 2]);
  const n = dd * kk + rng.int(-Math.floor((dd * kk) / 40), Math.floor((dd * kk) / 40));
  if (n % 1000 === 0) return hardEstimate(rng);
  return q({
    prompt: R`Which is the best estimate for \(${N(n)} \div ${d}\)?`,
    correct: kk,
    fmt: M,
    wrong: [
      { value: kk * 10, why: `Check by multiplying: \\(${N(kk * 10)} \\times ${dd}\\) is ${txt(kk * 10 * dd)}. That is far too big.` },
      { value: kk / 10, why: `Check by multiplying: \\(${kk / 10} \\times ${dd}\\) is only ${txt((kk / 10) * dd)}.` },
      { value: dd * kk - dd, why: 'This subtracts. Dividing asks how many groups fit.' },
      kk * 2,
    ],
    solution: [R`Use numbers that are easy to divide: \(${N(dd * kk)} \div ${dd}\).`, R`\(${N((dd * kk) / 10)} \div ${dd / 10} = ${N(kk)}\).`, R`The quotient is about \(${N(kk)}\).`],
    rule: 4,
    skill: 'estimating',
    check: () => (Math.abs(n / d - kk) < kk / 4 ? true : 'estimate is not close'),
  });
}

// ───────────── Challenge ─────────────

function challengeBig(rng) {
  const a = rng.int(1203, 4987);
  const b = rng.int(12, 68);
  if (a % 10 === 0 || b % 10 === 0) return challengeBig(rng);
  const w = rowSteps(a, b);
  const [b1, b0] = [b - (b % 10), b % 10];
  return q({
    prompt: R`What is \(${N(a)} \times ${b}\)?`,
    correct: a * b,
    fmt: M,
    wrong: [
      { value: a * b0 + a * (b1 / 10), why: `The ${b1 / 10} in ${b} means ${b1}. The second row is \\(${N(a)} \\times ${b1}\\).` },
      { value: roundTo(a, 1000) * roundTo(b, 10), why: 'That is an estimate. The question asks for the exact product.' },
      a * b + 1000,
      a * b - 100,
      a * b + a,
    ],
    solution: [...w.steps, R`Estimate to check: \(${N(roundTo(a, 1000))} \times ${roundTo(b, 10)} = ${N(roundTo(a, 1000) * roundTo(b, 10))}\). The answer is the right size.`],
    rule: 1,
    skill: 'standard method',
    check: () => (w.total === a * b && partialSteps(a, b).total === a * b ? true : 'rows do not add up'),
  });
}

function challengeBackwards(rng) {
  const d = rng.int(12, 36);
  const k = rng.int(12, 48);
  if (rng.bool()) {
    const r = rng.int(1, d - 1);
    const n = d * k + r;
    return q({
      prompt: `A number is divided by ${d}. The answer is ${k} remainder ${r}. What is the number?`,
      correct: n,
      fmt: M,
      wrong: [{ value: d * k, why: `Add the ${r} left over to the ${d} groups of ${k}.` }, { value: d * k - r, why: 'The remainder is extra. Add it, do not subtract it.' }, { value: d + k + r, why: `${d} groups of ${k} means multiply.` }, n + d, n + 10],
      solution: [`There are ${d} groups of ${k}, and ${r} left over.`, ...rowSteps(k, d).steps, R`Add the remainder: \(${N(d * k)} + ${r} = ${N(n)}\).`],
      rule: 3,
      skill: 'working backwards',
      check: () => (divWork(n, d).quotient === k && divWork(n, d).remainder === r ? true : 'number does not divide back'),
    });
  }
  const n = d * k;
  const w = divWork(n, d);
  return q({
    prompt: R`What number goes in the box? \(\;\square \times ${d} = ${N(n)}\)`,
    correct: k,
    wrong: [{ value: n - d, why: `The box is multiplied by ${d}. To undo multiplying, divide.` }, k + 1, k - 1, k + 10, k - 10 > 0 ? k - 10 : k + 2],
    solution: [R`Undo the multiplying: \(${N(n)} \div ${d}\).`, ...w.lines, R`The box is ${k}. Check: \(${k} \times ${d} = ${N(n)}\).`],
    rule: 2,
    skill: 'missing factor',
    check: () => (w.quotient === k && w.remainder === 0 ? true : 'box value does not fit'),
  });
}

function challengeError(rng) {
  for (;;) {
    const a = rng.int(23, 98);
    const b = rng.int(23, 98);
    if (a % 10 === 0 || b % 10 === 0) continue;
    const [a1, a0, b1, b0] = [a - (a % 10), a % 10, b - (b % 10), b % 10];
    const noZero = a * b0 + a * (b1 / 10);
    const twoParts = a1 * b1 + a0 * b0;
    if (new Set([a * b, noZero, twoParts, a + b]).size < 4) continue;
    const name = person(rng);
    const first = rng.bool();
    const said = first ? noZero : twoParts;
    const zeroText = `${name} multiplied by ${b1 / 10} instead of ${b1} for the tens of ${b}.`;
    const partsText = `${name} multiplied tens by tens and ones by ones, but left out the other two parts.`;
    return q({
      prompt: R`${name} says \(${a} \times ${b} = ${N(said)}\). What went wrong?`,
      correct: first ? zeroText : partsText,
      wrong: [first ? partsText : zeroText, `${name} added the two numbers instead of multiplying them.`, 'Nothing went wrong. The answer is correct.'],
      solution: [...rowSteps(a, b).steps, first ? R`${name} found \(${a} \times ${b0} = ${a * b0}\) and \(${a} \times ${b1 / 10} = ${a * (b1 / 10)}\), then added them.` : R`${name} found only \(${a1} \times ${b1} = ${N(a1 * b1)}\) and \(${a0} \times ${b0} = ${a0 * b0}\).`, R`The product is \(${N(a * b)}\), not \(${N(said)}\).`],
      rule: first ? 1 : 0,
      skill: 'checking work',
      check: () => (said !== a * b && rowSteps(a, b).total === a * b ? true : 'the shown answer is not a slip'),
    });
  }
}

function challengeStory(rng) {
  if (rng.bool()) {
    const rows = rng.int(18, 46);
    const seats = rng.int(24, 48);
    const total = rows * seats;
    const sold = roundTo(rng.int(Math.floor(total * 0.5), Math.floor(total * 0.9)), 5);
    return q({
      prompt: `A theater has ${rows} rows with ${seats} seats in each row. ${txt(sold)} tickets are sold for a show. How many seats are empty?`,
      correct: total - sold,
      fmt: M,
      wrong: [{ value: total, why: 'That is every seat. Take away the seats that are sold.' }, { value: total + sold, why: 'Sold seats are not empty. Subtract them.' }, total - sold + 100, total - sold - 10, total - sold + rows],
      solution: [`First find all the seats: ${rows} rows of ${seats}.`, ...rowSteps(seats, rows).steps, R`Then take away the sold seats: \(${N(total)} - ${N(sold)} = ${N(total - sold)}\).`],
      rule: 1,
      skill: 'two-step stories',
      check: () => (rowSteps(seats, rows).total === total && total - sold > 0 ? true : 'seats do not add up'),
    });
  }
  const d = rng.int(24, 56);
  const k = rng.int(6, 24);
  const r = rng.int(1, d - 1);
  const n = d * k + r;
  const w = divWork(n, d);
  return q({
    prompt: `${txt(n)} students are going on a trip. Each bus holds ${d} students. How many buses are needed?`,
    correct: k + 1,
    wrong: [{ value: k, why: `${k} buses hold only ${txt(d * k)} students. ${r} more still need a seat.` }, r !== k + 1 ? { value: r, why: `${r} is how many students are left after the full buses.` } : null, k + 2, k - 1, k + 10],
    solution: [...w.lines, `${k} buses are full, and ${r} ${r === 1 ? 'student is' : 'students are'} left.`, `One more bus is needed: ${k + 1} buses.`],
    rule: 3,
    skill: 'remainder stories',
    check: () => (d * (k + 1) >= n && d * k < n && w.quotient === k ? true : 'not the smallest number of buses'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'multi-digit-mult-div',
  title: 'Multi-Digit Multiplication & Long Division',
  summary: 'Multiply big numbers with area models and the standard method, and divide with long division.',
  grade: 'Grades 4–5',
  standards: ['CCSS 4.NBT.B.5', 'CCSS 4.NBT.B.6', 'CCSS 5.NBT.B.5', 'CCSS 5.NBT.B.6'],

  explain: {
    intro: 'Big multiplication and division problems are made of small facts. Break the numbers apart by place value. Work with one piece at a time. Then put the pieces together.',
    rules: [
      {
        title: 'Break apart by place value',
        text: 'Split each factor into its place-value parts. Multiply every part of one by every part of the other. Add the partial products. An area model keeps the parts in order.',
        example: R`\(34 \times 26\): \(30 \times 20 = 600\), \(4 \times 20 = 80\), \(30 \times 6 = 180\), \(4 \times 6 = 24\). The sum is \(884\).`,
      },
      {
        title: 'The standard way to multiply',
        text: 'Multiply the top number by the ones digit. Then multiply it by the tens digit, which stands for tens. Add the two rows.',
        example: R`\(347 \times 26\): \(347 \times 6 = 2{,}082\) and \(347 \times 20 = 6{,}940\). The sum is \(9{,}022\).`,
      },
      {
        title: 'Long division: divide, multiply, subtract, bring down',
        text: 'Start at the left of the number. See how many times the divisor fits. Multiply, subtract, and bring down the next digit. Do it again until no digits are left.',
        example: R`\(92 \div 4\): 4 fits into 9 two times, with 1 left. Bring down the 2 to make 12. 4 fits into 12 three times. The answer is \(23\).`,
      },
      {
        title: 'Remainders and checking',
        text: 'What is left at the end is the remainder. It must be smaller than the divisor. Check by multiplying the quotient by the divisor and adding the remainder.',
        example: R`\(437 \div 5\) is 87 remainder 2. Check: \(87 \times 5 + 2 = 437\).`,
      },
      {
        title: 'Estimate to see if the answer is the right size',
        text: 'Round the numbers to ones that are easy to work with. The exact answer should be close to the estimate.',
        example: R`\(48 \times 31\) is about \(50 \times 30 = 1{,}500\). \(6{,}138 \div 31\) is about \(6{,}000 \div 30 = 200\).`,
      },
    ],
    vocab: [
      { term: 'partial product', def: 'The product of one part of a factor and one part of the other factor.' },
      { term: 'area model', def: 'A rectangle split into parts that shows the partial products.' },
      { term: 'dividend', def: 'The number being divided.' },
      { term: 'divisor', def: 'The number you divide by.' },
      { term: 'quotient', def: 'The answer to a division problem.' },
    ],
    mistakes: [
      R`Forgetting that a tens digit means tens. In \(34 \times 26\), the second row is \(34 \times 20\), not \(34 \times 2\).`,
      'Leaving out a partial product. Two-digit times two-digit has four parts.',
      'Skipping a zero in the quotient. If the divisor does not fit, write 0 and bring down the next digit.',
      'Leaving a remainder that is as big as the divisor. Then the divisor fits one more time.',
    ],
    visual: areaPic(34, 26, true),
  },

  examples: [
    {
      title: 'An area model',
      problem: R`Find \(34 \times 26\).`,
      steps: partialSteps(34, 26).steps,
      answer: R`\(884\)`,
      visual: areaPic(34, 26, true),
    },
    {
      title: 'The standard method',
      problem: R`Find \(347 \times 26\).`,
      steps: [...rowSteps(347, 26).steps, R`\[${vertical('x', 347, 26, 9022)}\]`, R`Estimate to check: \(300 \times 30 = 9{,}000\). The answer is the right size.`],
      answer: R`\(9{,}022\)`,
    },
    {
      title: 'Long division with a remainder',
      problem: R`Find \(437 \div 5\).`,
      steps: [R`Set it up: \(${longDiv(437, 5)}\).`, ...divWork(437, 5).lines, R`Check: \(87 \times 5 + 2 = 437\).`],
      answer: '87 remainder 2',
    },
    {
      title: 'Word problem: a two-digit divisor',
      word: true,
      problem: 'A printer has 864 stickers. It puts 24 stickers on each sheet. How many sheets does it fill?',
      steps: ['864 is split into equal groups of 24, so divide.', R`Estimate first: \(900 \div 30 = 30\). The answer should be near 30.`, ...divWork(864, 24).lines, R`Check: \(36 \times 24 = 864\).`],
      answer: '36 sheets',
    },
  ],

  models: [
    {
      id: 'area-model',
      title: 'Multiply with an area model',
      intro: 'Type two numbers. See every partial product in the model.',
      inputs: [
        { name: 'a', label: 'First factor', type: 'int', min: 1, max: 999, value: 34 },
        { name: 'b', label: 'Second factor', type: 'int', min: 1, max: 99, value: 26 },
      ],
      compute({ a, b }) {
        const w = partialSteps(a, b);
        return { problem: R`\(${a} \times ${b}\)`, steps: w.steps, answer: M(a * b), visual: areaPic(a, b, true) };
      },
    },
    {
      id: 'packing-muffins',
      title: 'Word problem: packing muffins',
      word: true,
      intro: 'Change the number of muffins and the size of a box. Follow the long division.',
      inputs: [
        { name: 'n', label: 'Muffins', type: 'int', min: 1, max: 9999, value: 437 },
        { name: 'd', label: 'Muffins in each box', type: 'int', min: 2, max: 99, value: 12 },
      ],
      compute({ n, d }) {
        const w = divWork(n, d);
        const { quotient: k, remainder: r } = w;
        return {
          problem: `A baker has ${txt(n)} muffins. Each box holds ${d} muffins. How many boxes are filled, and how many muffins are left over?`,
          steps: [`${txt(n)} is split into groups of ${d}, so divide.`, R`Set it up: \(${longDiv(n, d)}\).`, ...w.lines, R`Check: \(${N(k)} \times ${d}${r ? ` + ${r}` : ''} = ${N(n)}\).`],
          answer: `${txt(k)} full ${k === 1 ? 'box' : 'boxes'}, ${r} left over`,
          note: r === 0 ? 'Nothing is left over, so the division comes out even.' : undefined,
        };
      },
    },
  ],

  quiz: {
    easy: [easyAreaModel, easyTens, easyDivideTens, easyDivide],
    medium: [mediumMultiply, mediumTwoByTwo, mediumDivide, mediumStory],
    hard: [hardMultiply, hardDivideZero, hardDivideTwoDigit, hardEstimate],
    challenge: [challengeBig, challengeBackwards, challengeError, challengeStory],
  },
};
