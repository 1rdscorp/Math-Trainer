import { R, q, person, people, plural, vertical, txt } from '../../lib/index.js';
import { N, M, digits, PLACES, PLACE_ONE } from './_shared.js';

const COL = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten thousands', 'Hundred thousands', 'Millions'];
const rev = (n) => digits(n).reverse(); // digits from the ones up
const fromRev = (ds) => Number(ds.slice().reverse().join(''));
const roundTo = (n, p) => Math.round(n / p) * p;
const grouped = (lines, per) => {
  const out = [];
  for (let i = 0; i < lines.length; i += per) out.push(lines.slice(i, i + per).join(' '));
  return out;
};

// ───────────── The column methods, one sentence per column ─────────────

function addWork(a, b) {
  const x = rev(a);
  const y = rev(b);
  const len = Math.max(x.length, y.length);
  const lines = [];
  const carried = [];
  const out = [];
  let carry = 0;
  let carries = 0;
  for (let i = 0; i < len; i++) {
    const parts = [x[i], y[i]].filter((v) => v != null);
    if (carry) parts.push(1);
    const s = parts.reduce((p, v) => p + v, 0);
    const last = i === len - 1;
    carried[i] = carry;
    let text = `${COL[i]}: `;
    text += parts.length === 1 ? `bring down the ${s}.` : R`\(${parts.join(' + ')} = ${s}\).`;
    if (s >= 10 && !last) text += ` Write ${s % 10} and carry 1 ${PLACE_ONE[i + 1]}.`;
    else if (parts.length > 1) text += ` Write ${s}.`;
    out[i] = last ? s : s % 10;
    carry = s >= 10 ? 1 : 0;
    carries += carry;
    lines.push(text);
  }
  return { lines, carried, carries, result: fromRev(out) };
}

function subWork(a, b) {
  const top = rev(a);
  const orig = top.slice();
  const bot = rev(b);
  const lines = [];
  const used = [];
  const out = [];
  let trades = 0;
  let acrossZero = false;
  for (let i = 0; i < top.length; i++) {
    const y = bot[i] ?? 0;
    let text = `${COL[i]}: `;
    if (top[i] !== orig[i]) text += `${top[i]} ${top[i] === 1 ? `${PLACE_ONE[i]} is` : `${PLACES[i]} are`} left. `;
    if (top[i] < y) {
      let j = i + 1;
      while (top[j] === 0) j++;
      trades += 1;
      text += `${top[i]} is less than ${y}. `;
      if (j > i + 1) {
        acrossZero = true;
        text += `There are no ${PLACES[i + 1]} to trade. `;
      }
      for (let k = j; k > i; k--) {
        text += `${k === j ? 'Trade' : 'Then trade'} 1 ${PLACE_ONE[k]} for 10 ${PLACES[k - 1]}. `;
        top[k] -= 1;
        top[k - 1] += 10;
      }
    }
    used[i] = top[i];
    out[i] = top[i] - y;
    if (bot[i] != null) text += R`\(${top[i]} - ${y} = ${out[i]}\).`;
    else if (top[i] === orig[i]) text += `bring down the ${top[i]}.`;
    else text += top[i] === 0 && i === top.length - 1 ? 'Nothing is left to write.' : `Write ${top[i]}.`;
    lines.push(text);
  }
  return { lines, used, trades, acrossZero, result: fromRev(out) };
}

// Answers that common slips produce.
const columnWise = (a, b, f) => {
  const x = rev(a);
  const y = rev(b);
  return fromRev(Array.from({ length: Math.max(x.length, y.length) }, (_, i) => f(x[i] ?? 0, y[i] ?? 0)));
};
// Never adds the carried 1: each column keeps only its ones digit (the last column is written in full).
const noCarry = (a, b) => {
  const x = rev(a);
  const y = rev(b);
  const len = Math.max(x.length, y.length);
  return fromRev(Array.from({ length: len }, (_, i) => ((x[i] ?? 0) + (y[i] ?? 0)) % (i === len - 1 ? 100 : 10)));
};
const upsideDown = (a, b) => columnWise(a, b, (x, y) => Math.abs(x - y)); // smaller digit from bigger digit
const noPayBack = (a, b) => columnWise(a, b, (x, y) => (x - y + 10) % 10); // trades, but the next place stays the same
const sideBySide = (a, b) => Number(digits(a).map((d, i) => d + (digits(b)[i] ?? 0)).join('')); // 47 + 38 → 715 (same length only)

const CARRY_NOTE = 'A column made 10 or more. Add the carried 1 in the next column.';
const FLIP_NOTE = 'When the top digit is smaller, trade from the next place. Do not subtract upside down.';
const PAYBACK_NOTE = 'After a trade, the next place has 1 fewer. Use the new digit.';

function pair(rng, lo, hi, ok) {
  for (;;) {
    const a = rng.int(lo, hi);
    const b = rng.int(lo, hi);
    if (ok(a, b)) return [a, b];
  }
}

function addQuestion(a, b, extra = {}) {
  const w = addWork(a, b);
  const sum = a + b;
  const len = digits(sum).length;
  return q({
    prompt: R`What is \(${N(a)} + ${N(b)}\)?`,
    correct: sum,
    fmt: M,
    wrong: [
      noCarry(a, b) !== sum ? { value: noCarry(a, b), why: CARRY_NOTE } : null,
      ...(extra.wrong ?? []),
      sum + 10,
      sum - 10,
      len >= 3 ? sum + 100 : sum + 1,
      sum - 1,
    ],
    solution: ['Line up the places. Start with the ones.', ...grouped(w.lines, len > 4 ? 3 : len > 3 ? 2 : 1), R`\[${vertical('+', a, b, sum)}\]`],
    rule: w.carries ? 1 : 0,
    skill: w.carries ? 'adding with regrouping' : 'adding',
    check: () => (w.result === sum && sum - b === a ? true : 'column sum does not match'),
  });
}

function subQuestion(a, b, extra = {}) {
  const w = subWork(a, b);
  const d = a - b;
  const len = digits(a).length;
  return q({
    prompt: R`What is \(${N(a)} - ${N(b)}\)?`,
    correct: d,
    fmt: M,
    wrong: [
      upsideDown(a, b) !== d ? { value: upsideDown(a, b), why: FLIP_NOTE } : null,
      noPayBack(a, b) !== d ? { value: noPayBack(a, b), why: PAYBACK_NOTE } : null,
      ...(extra.wrong ?? []),
      d + 10,
      d >= 10 ? d - 10 : d + 2,
      len >= 3 ? d + 100 : d + 1,
      d + 1,
    ],
    solution: ['Line up the places. Start with the ones.', ...grouped(w.lines, len > 4 ? 3 : len > 3 ? 2 : 1), R`\[${vertical('-', a, b, d)}\]`],
    rule: w.acrossZero ? 3 : w.trades ? 2 : 0,
    skill: w.acrossZero ? 'subtracting across zeros' : w.trades ? 'subtracting with regrouping' : 'subtracting',
    check: () => (w.result === d && d + b === a ? true : 'column difference does not match'),
  });
}

// ───────────── Stories that work with numbers of any size ─────────────

const TOGETHER = [
  (p, a, b) => `${p} read ${a} pages last month and ${b} pages this month. How many pages is that in all?`,
  (p, a, b) => `A farm picked ${a} apples on Monday and ${b} apples on Tuesday. How many apples is that?`,
  (p, a, b) => `${p} has ${a} red beads and ${b} blue beads. How many beads does ${p} have?`,
  (p, a, b) => `A bus drove ${a} miles last week and ${b} miles this week. How many miles is that?`,
];
const TAKE = [
  (p, a, b) => `A shop had ${a} balloons. It sold ${b}. How many balloons are left?`,
  (p, a, b) => `${p} had ${a} stickers. ${p} gave away ${b}. How many stickers does ${p} have now?`,
  (p, a, b) => `A baker made ${a} rolls. ${b} were sold. How many rolls are left?`,
  (p, a, b) => `A hall has ${a} seats. ${b} seats are taken. How many seats are empty?`,
];
const COMPARE = [
  (p, a, b, p2) => `${p} has ${a} cards. ${p2} has ${b} cards. How many more cards does ${p} have?`,
  (p, a, b) => `The Red team scored ${a} points. The Blue team scored ${b} points. How many more points did the Red team score?`,
  (p, a, b) => `One book has ${a} pages. Another book has ${b} pages. How many more pages does the first book have?`,
  (p, a, b) => `A big jar holds ${a} beans. A small jar holds ${b} beans. How many fewer beans are in the small jar?`,
];
const STORY_LEAD = {
  together: 'Two amounts are put together, so add.',
  take: 'Some are taken away, so subtract.',
  compare: 'Two amounts are compared. Subtract to find the difference.',
};

function storyQuestion(rng, kind, a, b) {
  const [p1, p2] = people(rng, 2);
  const bank = kind === 'together' ? TOGETHER : kind === 'take' ? TAKE : COMPARE;
  const prompt = rng.pick(bank)(p1, txt(a), txt(b), p2);
  if (kind === 'together') {
    const w = addWork(a, b);
    const sum = a + b;
    return q({
      prompt,
      correct: sum,
      fmt: M,
      wrong: [{ value: Math.abs(a - b) || null, why: 'This subtracts. The two amounts are joined, so add.' }, noCarry(a, b) !== sum ? { value: noCarry(a, b), why: CARRY_NOTE } : null, sum + 10, sum - 10, sum + 1],
      solution: [STORY_LEAD.together, ...grouped(w.lines, 2), R`\(${N(a)} + ${N(b)} = ${N(sum)}\).`],
      rule: 5,
      skill: 'word problems',
      check: () => (w.result === sum ? true : 'column sum does not match'),
    });
  }
  const w = subWork(a, b);
  const d = a - b;
  return q({
    prompt,
    correct: d,
    fmt: M,
    wrong: [
      { value: a + b, why: kind === 'take' ? 'This adds. Some are taken away, so subtract.' : 'This joins the two amounts. To compare, find the difference.' },
      upsideDown(a, b) !== d ? { value: upsideDown(a, b), why: FLIP_NOTE } : null,
      d + 10,
      d >= 10 ? d - 10 : d + 2,
      d + 1,
    ],
    solution: [STORY_LEAD[kind], ...grouped(w.lines, 2), R`\(${N(a)} - ${N(b)} = ${N(d)}\).`],
    rule: 5,
    skill: 'word problems',
    check: () => (w.result === d ? true : 'column difference does not match'),
  });
}

// ───────────── Easy: two digits, little or no regrouping ─────────────

function easyAdd(rng) {
  const [a, b] = pair(rng, 11, 88, (x, y) => addWork(x, y).carries === 0 && x + y <= 99);
  const allDigits = [...digits(a), ...digits(b)].reduce((p, v) => p + v, 0);
  return addQuestion(a, b, { wrong: [{ value: allDigits, why: 'Add tens to tens and ones to ones. Do not add all four digits together.' }] });
}

function easySubtract(rng) {
  const [a, b] = pair(rng, 11, 99, (x, y) => x - y >= 11 && subWork(x, y).trades === 0);
  return subQuestion(a, b, { wrong: [{ value: a + b, why: 'This adds. The minus sign means take away.' }] });
}

function easyOnes(rng) {
  const t = rng.int(1, 8);
  if (rng.bool()) {
    const o = rng.int(3, 9);
    const b = rng.int(11 - o, 9);
    const a = 10 * t + o;
    const need = 10 - o;
    const rest = b - need;
    const sum = a + b;
    return q({
      prompt: R`What is \(${a} + ${b}\)? Make the next ten to help.`,
      visual: { type: 'numberLine', min: 10 * t, max: 10 * t + 20, step: 1, jumps: [{ from: a, to: a + need, label: `+${need}` }, { from: a + need, to: sum, label: `+${rest}` }], alt: `A number line. A jump of ${need} goes from ${a} to ${a + need}. A jump of ${rest} goes on to ${sum}.` },
      correct: sum,
      wrong: [
        { value: sum - 10, why: 'The ones made a new ten. The tens digit goes up by 1.' },
        { value: Number(`${t}${o + b}`), why: `${o + b} ones is 1 ten and ${plural(o + b - 10, 'one')}. Regroup the ten.` },
        sum + 1,
        sum - 1,
      ],
      solution: [`${a} needs ${need} more to make ${a + need}.`, `Break ${b} into ${need} and ${rest}.`, R`\(${a} + ${need} = ${a + need}\). Then \(${a + need} + ${rest} = ${sum}\).`],
      rule: 1,
      skill: 'adding with regrouping',
      check: () => (addWork(a, b).result === sum && need + rest === b ? true : 'jumps do not match'),
    });
  }
  const o = rng.int(1, 7);
  const b = rng.int(o + 2, 9);
  const a = 10 * (t + 1) + o;
  const rest = b - o;
  const d = a - b;
  return q({
    prompt: R`What is \(${a} - ${b}\)? Go back to the ten first.`,
    visual: { type: 'numberLine', min: 10 * t, max: 10 * t + 20, step: 1, jumps: [{ from: a, to: a - o, label: `−${o}` }, { from: a - o, to: d, label: `−${rest}` }], alt: `A number line. A jump back of ${o} goes from ${a} to ${a - o}. A jump back of ${rest} goes on to ${d}.` },
    correct: d,
    wrong: [
      { value: a - o + rest, why: `There ${o === 1 ? 'is only 1 one' : `are only ${o} ones`}. Go back through ${a - o} to take away all ${b}.` },
      { value: d + 10, why: 'Going back past a ten makes the tens digit 1 smaller.' },
      d + 1,
      d - 1,
    ],
    solution: [`Break ${b} into ${o} and ${rest}.`, R`\(${a} - ${o} = ${a - o}\).`, R`\(${a - o} - ${rest} = ${d}\).`],
    rule: 2,
    skill: 'subtracting with regrouping',
    check: () => (subWork(a, b).result === d && o + rest === b ? true : 'jumps do not match'),
  });
}

function easyStory(rng) {
  const kind = rng.pick(['together', 'take', 'compare']);
  if (kind === 'together') return storyQuestion(rng, kind, ...pair(rng, 11, 88, (x, y) => addWork(x, y).carries === 0 && x + y <= 99));
  return storyQuestion(rng, kind, ...pair(rng, 11, 99, (x, y) => x - y >= 11 && subWork(x, y).trades === 0));
}

// ───────────── Medium: regrouping once ─────────────

function mediumAdd2(rng) {
  const [a, b] = pair(rng, 14, 89, (x, y) => (x % 10) + (y % 10) >= 10);
  const ones = (a % 10) + (b % 10);
  return addQuestion(a, b, { wrong: [{ value: sideBySide(a, b), why: `${ones} ones is 1 ten and ${plural(ones - 10, 'one')}. Carry the ten.` }] });
}

function mediumSub2(rng) {
  const [a, b] = pair(rng, 21, 98, (x, y) => x - y >= 3 && x % 10 < y % 10);
  return subQuestion(a, b);
}

function mediumAdd3(rng) {
  const [a, b] = pair(rng, 104, 889, (x, y) => addWork(x, y).carries === 1 && x + y <= 999);
  return addQuestion(a, b);
}

function mediumSub3(rng) {
  const [a, b] = pair(rng, 104, 998, (x, y) => x - y >= 15 && subWork(x, y).trades === 1 && !subWork(x, y).acrossZero);
  return subQuestion(a, b);
}

function mediumStory(rng) {
  const kind = rng.pick(['together', 'take', 'compare']);
  const big = rng.bool();
  if (kind === 'together') {
    return storyQuestion(rng, kind, ...(big ? pair(rng, 104, 889, (x, y) => addWork(x, y).carries === 1 && x + y <= 999) : pair(rng, 14, 89, (x, y) => (x % 10) + (y % 10) >= 10)));
  }
  return storyQuestion(rng, kind, ...(big ? pair(rng, 104, 998, (x, y) => x - y >= 15 && subWork(x, y).trades === 1 && !subWork(x, y).acrossZero) : pair(rng, 21, 98, (x, y) => x - y >= 3 && x % 10 < y % 10)));
}

// ───────────── Hard: several regroupings, zeros, estimating ─────────────

function hardAdd(rng) {
  const [lo, hi] = rng.bool() ? [125, 989] : [1025, 8989];
  const [a, b] = pair(rng, lo, hi, (x, y) => addWork(x, y).carries >= 2);
  return addQuestion(a, b);
}

function hardSubtract(rng) {
  const [lo, hi] = rng.bool() ? [125, 999] : [1025, 9999];
  const [a, b] = pair(rng, lo, hi, (x, y) => x - y >= 25 && subWork(x, y).trades >= 2 && !subWork(x, y).acrossZero);
  return subQuestion(a, b);
}

function hardZeros(rng) {
  for (;;) {
    const a = rng.pick([100 * rng.int(2, 9), 100 * rng.int(2, 9) + rng.int(1, 8), 1000 * rng.int(2, 9), 1000 * rng.int(2, 9) + rng.int(1, 99), 1000 * rng.int(1, 9) + 100 * rng.int(1, 9) + rng.int(1, 8)]);
    const b = rng.int(a > 1000 ? 125 : 13, a - 12);
    if (subWork(a, b).acrossZero) return subQuestion(a, b);
  }
}

function hardEstimate(rng) {
  const p = rng.pick([100, 100, 1000]);
  const plus = rng.bool();
  const [a, b] = pair(rng, p + p / 10, 9 * p, (x, y) => (plus || x - y > p) && x % p !== 0 && y % p !== 0 && roundTo(x, p) !== roundTo(y, p));
  const ra = roundTo(a, p);
  const rb = roundTo(b, p);
  const est = plus ? ra + rb : ra - rb;
  const exact = plus ? a + b : a - b;
  const floors = plus ? Math.floor(a / p) * p + Math.floor(b / p) * p : Math.floor(a / p) * p - Math.floor(b / p) * p;
  const op = plus ? '+' : '-';
  return q({
    prompt: R`Estimate \(${N(a)} ${op} ${N(b)}\). Round each number to the nearest ${PLACE_ONE[String(p).length - 1]} first.`,
    correct: est,
    fmt: M,
    wrong: [
      { value: exact, why: 'That is the exact answer. An estimate uses the rounded numbers.' },
      floors !== est ? { value: floors, why: 'Round up when the next digit is 5 or more.' } : null,
      est + p,
      est - p > 0 ? est - p : est + 2 * p,
      roundTo(exact, p / 10),
    ],
    solution: [R`Round \(${N(a)}\) to \(${N(ra)}\).`, R`Round \(${N(b)}\) to \(${N(rb)}\).`, R`\(${N(ra)} ${op} ${N(rb)} = ${N(est)}\).`],
    rule: 4,
    skill: 'estimating',
    check: () => (Math.abs(ra - a) <= p / 2 && Math.abs(rb - b) <= p / 2 && ra % p === 0 && rb % p === 0 ? true : 'rounding is off'),
  });
}

function hardStory(rng) {
  const kind = rng.pick(['together', 'take', 'compare']);
  const [lo, hi] = rng.bool() ? [125, 989] : [1025, 8989];
  if (kind === 'together') return storyQuestion(rng, kind, ...pair(rng, lo, hi, (x, y) => addWork(x, y).carries >= 2));
  return storyQuestion(rng, kind, ...pair(rng, lo, hi + 10, (x, y) => x - y >= 25 && subWork(x, y).trades >= 2));
}

// ───────────── Challenge ─────────────

function challengeBig(rng) {
  const [lo, hi] = rng.bool() ? [10250, 98989] : [102500, 899899];
  if (rng.bool()) return addQuestion(...pair(rng, lo, hi, (x, y) => addWork(x, y).carries >= 3));
  return subQuestion(...pair(rng, lo, hi + 90, (x, y) => x - y >= 1000 && subWork(x, y).trades >= 3));
}

function challengeMissing(rng) {
  const [lo, hi] = rng.bool() ? [125, 989] : [1025, 8989];
  const kind = rng.pick(['addend', 'takeaway', 'start']);
  if (kind === 'addend') {
    const [x, b] = pair(rng, lo, hi, (u, v) => addWork(u, v).carries >= 1);
    const t = x + b;
    return q({
      prompt: R`What number goes in the box? \(\;\square + ${N(b)} = ${N(t)}\)`,
      correct: x,
      fmt: M,
      wrong: [{ value: t + b, why: `The box is a part of ${txt(t)}, so it must be smaller. Subtract to find it.` }, upsideDown(t, b) !== x ? upsideDown(t, b) : null, x + 10, x - 10, x + 100],
      solution: [R`The total is \(${N(t)}\). One part is \(${N(b)}\).`, R`The missing part is \(${N(t)} - ${N(b)} = ${N(x)}\).`, R`Check: \(${N(x)} + ${N(b)} = ${N(t)}\).`],
      rule: 5,
      skill: 'missing number',
      check: () => (addWork(x, b).result === t ? true : 'box value does not fit'),
    });
  }
  const [a, b] = pair(rng, lo, hi + 10, (u, v) => u - v >= 25 && subWork(u, v).trades >= 1);
  const d = a - b;
  if (kind === 'takeaway') {
    return q({
      prompt: R`What number goes in the box? \(\;${N(a)} - \square = ${N(d)}\)`,
      correct: b,
      fmt: M,
      wrong: [{ value: a + d, why: `Taking the box away from ${txt(a)} leaves ${txt(d)}. So the box is smaller than ${txt(a)}.` }, upsideDown(a, d) !== b ? upsideDown(a, d) : null, b + 10, b - 10, b + 100],
      solution: [R`\(${N(a)}\) is the whole. One part is \(${N(d)}\). The box is the other part.`, R`\(${N(a)} - ${N(d)} = ${N(b)}\).`, R`Check: \(${N(a)} - ${N(b)} = ${N(d)}\).`],
      rule: 5,
      skill: 'missing number',
      check: () => (subWork(a, b).result === d ? true : 'box value does not fit'),
    });
  }
  return q({
    prompt: R`What number goes in the box? \(\;\square - ${N(b)} = ${N(d)}\)`,
    correct: a,
    fmt: M,
    wrong: [{ value: Math.abs(d - b), why: `The box is the starting number. It must be bigger than ${txt(b)}. Add the two parts.` }, noCarry(d, b) !== a ? { value: noCarry(d, b), why: CARRY_NOTE } : null, a + 10, a - 10, a + 100],
    solution: [R`The box is the whole. Its parts are \(${N(b)}\) and \(${N(d)}\).`, R`Add the parts: \(${N(d)} + ${N(b)} = ${N(a)}\).`, R`Check: \(${N(a)} - ${N(b)} = ${N(d)}\).`],
    rule: 5,
    skill: 'missing number',
    check: () => (subWork(a, b).result === d ? true : 'box value does not fit'),
  });
}

function challengeError(rng) {
  const name = person(rng);
  const nothing = 'Nothing went wrong. The answer is correct.';
  if (rng.bool(0.4)) {
    const [a, b] = pair(rng, 115, 889, (x, y) => {
      const said = noCarry(x, y);
      return addWork(x, y).carries >= 1 && x + y <= 999 && x > y && said !== x - y && digits(x + y).length === 3;
    });
    const w = addWork(a, b);
    return q({
      prompt: R`${name} says \(${a} + ${b} = ${noCarry(a, b)}\). What went wrong?`,
      correct: `${name} did not add a carried 1 in the next column.`,
      wrong: [`${name} subtracted the numbers instead of adding them.`, `${name} carried a 1 that was not needed.`, nothing],
      solution: [...grouped(w.lines, 3), R`The sum is \(${a + b}\), not \(${noCarry(a, b)}\).`, `${name} wrote each column without adding the carried 1.`],
      rule: 1,
      skill: 'checking work',
      check: () => (w.result === a + b && noCarry(a, b) !== a + b ? true : 'the shown answer is not a carry slip'),
    });
  }
  const flip = rng.bool();
  const [a, b] = pair(rng, 121, 998, (x, y) => {
    const d = x - y;
    const u = upsideDown(x, y);
    const n = noPayBack(x, y);
    return d >= 15 && subWork(x, y).trades >= 1 && !digits(x).includes(0) && u !== n && u !== d && n !== d && u !== x + y && n !== x + y;
  });
  const w = subWork(a, b);
  const said = flip ? upsideDown(a, b) : noPayBack(a, b);
  const flipText = `${name} took the smaller digit from the bigger one in a column. A trade was needed.`;
  const payText = `${name} traded, but did not make the next place 1 smaller.`;
  return q({
    prompt: R`${name} says \(${a} - ${b} = ${said}\). What went wrong?`,
    correct: flip ? flipText : payText,
    wrong: [flip ? payText : flipText, `${name} added the numbers instead of subtracting them.`, nothing],
    solution: [...grouped(w.lines, 3), R`The difference is \(${a - b}\), not \(${said}\).`, flip ? `${name} subtracted upside down where the top digit was smaller.` : `${name} forgot that a trade makes the next place 1 smaller.`],
    rule: 2,
    skill: 'checking work',
    check: () => (w.result === a - b && said !== a - b ? true : 'the shown answer is not a regrouping slip'),
  });
}

function challengeTwoStep(rng) {
  const [lo, hi] = rng.bool() ? [125, 899] : [1025, 4899];
  if (rng.bool()) {
    const [a, b] = pair(rng, lo, hi, (x, y) => addWork(x, y).carries >= 1);
    const mid = a + b;
    const c = rng.int(Math.floor(lo / 2), mid - 15);
    const end = mid - c;
    return q({
      prompt: `A library had ${txt(a)} books. It got ${txt(b)} new books. Then it gave away ${txt(c)} old books. How many books does it have now?`,
      correct: end,
      fmt: M,
      wrong: [{ value: mid, why: `This is after the new books came. ${txt(c)} books were also given away.` }, { value: mid + c, why: 'Giving books away makes the number smaller. Subtract in the second step.' }, end + 10, end - 10, end + 100],
      solution: [R`New books are added: \(${N(a)} + ${N(b)} = ${N(mid)}\).`, R`Old books are taken away: \(${N(mid)} - ${N(c)} = ${N(end)}\).`, `The library has ${txt(end)} books now.`],
      rule: 5,
      skill: 'two-step stories',
      check: () => (addWork(a, b).result === mid && subWork(mid, c).result === end ? true : 'steps do not match'),
    });
  }
  const a = rng.int(lo * 2, hi * 2);
  const b = rng.int(Math.floor(lo / 2), Math.floor(a / 2) - 5);
  const c = rng.int(Math.floor(lo / 2), Math.floor(a / 2) - 5);
  const sold = b + c;
  const left = a - sold;
  return q({
    prompt: `A bakery made ${txt(a)} cookies. ${txt(b)} were sold in the morning. ${txt(c)} were sold in the afternoon. How many cookies are left?`,
    correct: left,
    fmt: M,
    wrong: [{ value: a - b, why: 'This takes away only the morning cookies. More were sold in the afternoon.' }, { value: sold, why: 'This is how many were sold. The question asks how many are left.' }, left + 10, left - 10 > 0 ? left - 10 : left + 20, left + 100],
    solution: [R`Find how many were sold: \(${N(b)} + ${N(c)} = ${N(sold)}\).`, R`Take them away from the start: \(${N(a)} - ${N(sold)} = ${N(left)}\).`, `${txt(left)} cookies are left.`],
    rule: 5,
    skill: 'two-step stories',
    check: () => (addWork(b, c).result === sold && subWork(a, sold).result === left && left > 0 ? true : 'steps do not match'),
  });
}

// ───────────── Interactive models ─────────────

const BLANK = R`\(\,\)`;
const padLeft = (cells, len) => [...Array(len - cells.length).fill(BLANK), ...cells];

function addTable(a, b) {
  const w = addWork(a, b);
  const sumDigits = digits(a + b).map(String);
  const len = sumDigits.length;
  const carriedRow = Array.from({ length: len }, (_, i) => (w.carried[len - 1 - i] ? '1' : BLANK));
  return {
    type: 'table',
    headers: ['Place', ...COL.slice(0, len).reverse()],
    rows: [['Carried', ...carriedRow], [txt(a), ...padLeft(digits(a).map(String), len)], [`+ ${txt(b)}`, ...padLeft(digits(b).map(String), len)], ['Sum', ...sumDigits]],
    rowHeaders: true,
    alt: `A place-value table for ${txt(a)} plus ${txt(b)}. The sum is ${txt(a + b)}.`,
  };
}

function subTable(a, b) {
  const w = subWork(a, b);
  const len = digits(a).length;
  const rows = [[txt(a), ...digits(a).map(String)]];
  if (w.trades) rows.push(['After trading', ...w.used.slice().reverse().map(String)]);
  rows.push([`− ${txt(b)}`, ...padLeft(digits(b).map(String), len)], ['Difference', ...padLeft(digits(a - b).map(String), len)]);
  return { type: 'table', headers: ['Place', ...COL.slice(0, len).reverse()], rows, rowHeaders: true, alt: `A place-value table for ${txt(a)} minus ${txt(b)}. The difference is ${txt(a - b)}.` };
}

export default {
  id: 'add-sub-multi',
  title: 'Adding & Subtracting Bigger Numbers',
  summary: 'Add and subtract numbers with two or more digits, regrouping when needed, and check by estimating.',
  grade: 'Grades 2–4',
  standards: ['CCSS 2.NBT.B.5', 'CCSS 2.NBT.B.7', 'CCSS 3.NBT.A.2', 'CCSS 4.NBT.B.4'],

  explain: {
    intro: 'Big numbers are added and subtracted one place at a time. Ones go with ones, tens with tens, hundreds with hundreds. When a place has too many or too few, we **regroup**.',
    rules: [
      {
        title: 'Line up the places',
        text: 'Write the numbers in columns. Put ones under ones and tens under tens. Start with the ones and move left.',
        example: R`\(34 + 25\): ones \(4 + 5 = 9\), tens \(3 + 2 = 5\). The sum is \(59\).`,
      },
      {
        title: 'Adding: carry a new ten',
        text: 'If a column adds up to 10 or more, write only the ones digit. Carry the 1 to the next column and add it there.',
        example: R`\(47 + 38\): ones \(7 + 8 = 15\). Write 5 and carry 1. Tens \(4 + 3 + 1 = 8\). The sum is \(85\).`,
      },
      {
        title: 'Subtracting: trade when the top digit is too small',
        text: 'Take 1 from the next place to the left. It becomes 10 in the place where you are working. Then subtract.',
        example: R`\(62 - 27\): 2 is less than 7. Trade 1 ten for 10 ones. Now \(12 - 7 = 5\) and \(5 - 2 = 3\). The answer is \(35\).`,
      },
      {
        title: 'Trading across zeros',
        text: 'A 0 has nothing to trade. Go one more place to the left and trade there first. Then trade again.',
        example: R`\(500 - 263\): trade 1 hundred for 10 tens, then 1 ten for 10 ones. Now 4 hundreds, 9 tens and 10 ones. The answer is \(237\).`,
      },
      {
        title: 'Estimate to check',
        text: 'Round each number. Add or subtract the rounded numbers in your head. Your exact answer should be close to the estimate.',
        example: R`\(487 + 312\) is about \(500 + 300 = 800\). The exact sum, \(799\), is close.`,
      },
      {
        title: 'Stories: what is happening?',
        text: 'Amounts put together: add. Some taken away: subtract. Two amounts compared: subtract. A missing part is the total minus the part you know.',
        example: R`A hall has 350 seats and 128 are taken. Empty seats: \(350 - 128 = 222\).`,
      },
    ],
    vocab: [
      { term: 'sum', def: 'The answer when you add.' },
      { term: 'difference', def: 'The answer when you subtract.' },
      { term: 'regroup', def: 'To trade 10 of one place for 1 of the next place, or 1 for 10. Carrying and trading are both regrouping.' },
      { term: 'estimate', def: 'A close answer found with rounded numbers.' },
    ],
    mistakes: [
      R`Forgetting the carried 1. In \(47 + 38\), the tens are \(4 + 3 + 1\), not \(4 + 3\).`,
      R`Subtracting upside down. In \(62 - 27\), you cannot do \(7 - 2\). Trade a ten first.`,
      'Forgetting that a trade makes the next place 1 smaller.',
      R`Lining up from the left. In \(345 + 27\), the 2 goes under the 4, and the 7 under the 5.`,
    ],
    visual: { type: 'baseTen', value: 85, alt: 'Base-ten blocks for 85: 8 tens rods and 5 ones cubes. 47 plus 38 makes 7 tens and 15 ones, which regroup to 8 tens and 5 ones.' },
  },

  examples: [
    {
      title: 'Adding with regrouping',
      problem: R`Find \(47 + 38\).`,
      steps: ['Line up the places. Start with the ones.', ...addWork(47, 38).lines, R`\[${vertical('+', 47, 38, 85)}\]`],
      answer: R`\(85\)`,
      visual: addTable(47, 38),
    },
    {
      title: 'Subtracting with regrouping',
      problem: R`Find \(62 - 27\).`,
      steps: ['Line up the places. Start with the ones.', ...subWork(62, 27).lines, R`\[${vertical('-', 62, 27, 35)}\]`],
      answer: R`\(35\)`,
      visual: subTable(62, 27),
    },
    {
      title: 'Three digits, two regroupings',
      problem: R`Find \(478 + 356\).`,
      steps: [...addWork(478, 356).lines, R`\[${vertical('+', 478, 356, 834)}\]`, R`Estimate to check: \(500 + 400 = 900\). The answer \(834\) is close.`],
      answer: R`\(834\)`,
    },
    {
      title: 'Subtracting across a zero',
      problem: R`Find \(703 - 458\).`,
      steps: [...subWork(703, 458).lines, R`\[${vertical('-', 703, 458, 245)}\]`, R`Check by adding: \(245 + 458 = 703\).`],
      answer: R`\(245\)`,
      visual: subTable(703, 458),
    },
    {
      title: 'Word problem: comparing two amounts',
      word: true,
      problem: 'The Tigers scored 1,245 points this season. The Bears scored 987 points. How many more points did the Tigers score?',
      steps: ['Two amounts are compared. Subtract to find the difference.', ...grouped(subWork(1245, 987).lines, 2), R`\(1{,}245 - 987 = 258\).`, R`Check by adding: \(258 + 987 = 1{,}245\).`],
      answer: '258 points',
      visual: { type: 'barModel', rows: [{ label: 'Tigers', parts: [{ value: 1245, label: '1,245' }] }, { label: 'Bears', parts: [{ value: 987, label: '987' }, { value: 258, label: '?', shade: 'none' }] }], alt: 'Two bars. The Tigers bar shows 1,245. The Bears bar shows 987 with a gap marked by a question mark.' },
    },
  ],

  models: [
    {
      id: 'column-add',
      title: 'Add in columns',
      intro: 'Type two numbers. Watch each column, and where a 1 is carried.',
      inputs: [
        { name: 'a', label: 'First number', type: 'int', min: 0, max: 9999, value: 478 },
        { name: 'b', label: 'Second number', type: 'int', min: 0, max: 9999, value: 356 },
      ],
      compute({ a, b }) {
        const w = addWork(a, b);
        return {
          problem: R`\(${N(a)} + ${N(b)}\)`,
          steps: ['Line up the places. Start with the ones.', ...w.lines, R`\[${vertical('+', a, b, a + b)}\]`],
          answer: M(a + b),
          visual: addTable(a, b),
          note: w.carries ? undefined : 'No column reached 10, so nothing was carried.',
        };
      },
    },
    {
      id: 'column-subtract',
      title: 'Subtract in columns',
      intro: 'Type two numbers. Watch where a trade is needed.',
      inputs: [
        { name: 'a', label: 'Start with', type: 'int', min: 0, max: 9999, value: 703 },
        { name: 'b', label: 'Take away', type: 'int', min: 0, max: 9999, value: 458 },
      ],
      compute({ a, b }) {
        if (b > a) return { error: `${txt(b)} is more than ${txt(a)}. Make the first number bigger, or the second one smaller.` };
        const w = subWork(a, b);
        return {
          problem: R`\(${N(a)} - ${N(b)}\)`,
          steps: ['Line up the places. Start with the ones.', ...w.lines, R`\[${vertical('-', a, b, a - b)}\]`, R`Check by adding: \(${N(a - b)} + ${N(b)} = ${N(a)}\).`],
          answer: M(a - b),
          visual: subTable(a, b),
        };
      },
    },
    {
      id: 'apple-farm',
      title: 'Word problem: two days of apple picking',
      word: true,
      intro: 'Change the numbers and the question.',
      inputs: [
        { name: 'a', label: 'Apples picked on Monday', type: 'int', min: 1, max: 9999, value: 345 },
        { name: 'b', label: 'Apples picked on Tuesday', type: 'int', min: 1, max: 9999, value: 482 },
        { name: 'ask', label: 'Question', type: 'select', value: 'total', options: [{ value: 'total', label: 'How many in all?' }, { value: 'more', label: 'How many more on the bigger day?' }] },
      ],
      compute({ a, b, ask }) {
        const start = `A farm picked ${txt(a)} apples on Monday and ${txt(b)} apples on Tuesday.`;
        if (ask === 'total') {
          const w = addWork(a, b);
          return {
            problem: `${start} How many apples is that in all?`,
            steps: [STORY_LEAD.together, ...w.lines, R`\(${N(a)} + ${N(b)} = ${N(a + b)}\).`],
            answer: `${txt(a + b)} apples`,
            visual: { type: 'barModel', rows: [{ parts: [{ value: a, label: `Mon ${txt(a)}` }, { value: b, label: `Tue ${txt(b)}` }], total: '? apples in all' }], alt: `One bar made of two parts, ${txt(a)} and ${txt(b)}. The total is unknown.` },
          };
        }
        const problem = `${start} How many more apples were picked on the bigger day?`;
        if (a === b) return { problem, steps: ['Compare the two days.', 'The numbers are the same.', R`\(${N(a)} - ${N(b)} = 0\).`], answer: 'The days are the same. The difference is 0.' };
        const [bigDay, big, smallDay, small] = a > b ? ['Monday', a, 'Tuesday', b] : ['Tuesday', b, 'Monday', a];
        const w = subWork(big, small);
        return {
          problem,
          steps: [`${bigDay} has more. ${STORY_LEAD.compare}`, ...w.lines, R`\(${N(big)} - ${N(small)} = ${N(big - small)}\).`],
          answer: `${txt(big - small)} more apples on ${bigDay}`,
          visual: { type: 'barModel', rows: [{ label: bigDay, parts: [{ value: big, label: txt(big) }] }, { label: smallDay, parts: [{ value: small, label: txt(small) }, { value: big - small, label: '?', shade: 'none' }] }], alt: `Two bars. ${bigDay} shows ${txt(big)}. ${smallDay} shows ${txt(small)} with a gap marked by a question mark.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyAdd, easySubtract, easyOnes, easyStory],
    medium: [mediumAdd2, mediumSub2, mediumAdd3, mediumSub3, mediumStory],
    hard: [hardAdd, hardSubtract, hardZeros, hardEstimate, hardStory],
    challenge: [challengeBig, challengeMissing, challengeError, challengeTwoStep],
  },
};
