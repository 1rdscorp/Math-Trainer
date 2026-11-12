import { R, q, person, plural, joinList, txt } from '../../lib/index.js';
import { N, M, digits, PLACES, PLACE_ONE, numberWords } from './_shared.js';

const D19 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const D09 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const fromDigits = (ds) => Number(ds.join(''));
const isAre = (n) => (n === 1 ? 'is' : 'are');
const roundTo = (n, p) => Math.round(n / p) * p;
const byValue = (a, b) => a - b;

// "5{,}000 + 70 + 2" for 5,072 (math mode).
function expandedTex(n) {
  const ds = digits(n);
  const parts = ds.map((d, i) => d * 10 ** (ds.length - 1 - i)).filter((v) => v > 0);
  return parts.length ? parts.map(N).join(' + ') : '0';
}

// Four statements about x and y; only the first is true.
function compareChoices(x, y) {
  const sym = x < y ? '<' : '>';
  const other = x < y ? '>' : '<';
  return {
    correct: R`\(${N(x)} ${sym} ${N(y)}\)`,
    wrong: [
      { value: R`\(${N(x)} ${other} ${N(y)}\)`, why: 'The open side of the symbol faces the greater number.' },
      R`\(${N(x)} = ${N(y)}\)`,
      R`\(${N(y)} ${sym} ${N(x)}\)`,
    ],
  };
}

function compareSteps(x, y) {
  const dx = digits(x);
  const dy = digits(y);
  const sym = x < y ? '<' : '>';
  const words = x < y ? 'is less than' : 'is greater than';
  const last = R`So \(${N(x)} ${sym} ${N(y)}\). Say: ${txt(x)} ${words} ${txt(y)}.`;
  if (dx.length !== dy.length) {
    return [`${txt(x)} has ${dx.length} digits. ${txt(y)} has ${dy.length} digits.`, 'A whole number with more digits is greater.', last];
  }
  const i = dx.findIndex((d, k) => d !== dy[k]);
  const place = PLACES[dx.length - 1 - i];
  return [
    i > 0 ? `Start at the left. The digits match until the ${place} place.` : `Start at the left, in the ${place} place.`,
    `In the ${place} place, ${dx[i]} is ${dx[i] < dy[i] ? 'less' : 'greater'} than ${dy[i]}.`,
    last,
  ];
}

// One sentence saying where x and y (same number of digits, x < y) first differ.
function firstDifference(x, y) {
  const dx = digits(x);
  const dy = digits(y);
  const i = dx.findIndex((d, k) => d !== dy[k]);
  return R`Compare \(${N(x)}\) and \(${N(y)}\). They first differ in the ${PLACES[dx.length - 1 - i]} place: ${dx[i]} is less than ${dy[i]}.`;
}

// ───────────── Easy: tens and ones ─────────────

function easyBlocks(rng) {
  const t = rng.int(1, 9);
  const o = rng.bool(0.2) ? 0 : rng.int(1, 9);
  const n = 10 * t + o;
  return q({
    prompt: `The blocks show ${plural(t, 'ten')} and ${plural(o, 'one')}. What number is this?`,
    visual: { type: 'baseTen', value: n, alt: `Base-ten blocks: ${plural(t, 'tens rod')} and ${plural(o, 'ones cube')}.` },
    correct: n,
    wrong: [
      o && o !== t ? { value: 10 * o + t, why: `The tens digit is written first. This number has ${plural(o, 'ten')}.` } : null,
      { value: t + o, why: `${plural(t, 'ten')} ${isAre(t)} worth ${10 * t}, not ${t}.` },
      100 * t + o,
      n + 10,
      n + 1,
    ],
    solution: [`${plural(t, 'ten')} ${isAre(t)} worth ${10 * t}.`, `${plural(o, 'one')} ${isAre(o)} worth ${o}.`, R`\(${10 * t} + ${o} = ${n}\).`],
    rule: 0,
    skill: 'tens and ones',
    check: () => (Math.floor(n / 10) === t && n % 10 === o ? true : 'digits do not match'),
  });
}

function easyDigitValue(rng) {
  const [t, o] = rng.sample(D19, 2);
  const n = 10 * t + o;
  const askTens = rng.bool(0.6);
  const d = askTens ? t : o;
  const value = askTens ? 10 * t : o;
  return q({
    prompt: R`What is the value of the digit ${d} in \(${n}\)?`,
    correct: value,
    wrong: askTens
      ? [{ value: t, why: `The ${t} is in the tens place. It means ${plural(t, 'ten')}.` }, 10 * o, o, 100 * t]
      : [{ value: 10 * o, why: `The ${o} is in the ones place. It is worth just ${o}.` }, t, 10 * t, 100 * o],
    solution: [`${n} has ${plural(t, 'ten')} and ${plural(o, 'one')}.`, `The ${d} is in the ${askTens ? 'tens' : 'ones'} place.`, `Its value is ${value}.`],
    rule: 0,
    skill: 'value of a digit',
    check: () => ((askTens ? n - value === o : n - value === 10 * t) ? true : 'value does not match the place'),
  });
}

function easyBuild(rng) {
  const t = rng.int(1, 9);
  const o = rng.int(0, 9);
  const n = 10 * t + o;
  const swap = o > 0 && rng.bool(0.35);
  return q({
    prompt: swap ? `Which number has ${plural(o, 'one')} and ${plural(t, 'ten')}?` : `Which number has ${plural(t, 'ten')} and ${plural(o, 'one')}?`,
    correct: n,
    wrong: [
      o && o !== t ? { value: 10 * o + t, why: swap ? 'Tens are written first, even when the ones are said first.' : `The tens digit is written first. This number has ${plural(o, 'ten')}.` } : null,
      o
        ? { value: 100 * t + o, why: `${10 * t} and ${o} make ${n}. The ${o} takes the place of the 0.` }
        : { value: t, why: `${plural(t, 'ten')} ${isAre(t)} worth ${10 * t}. Write a 0 for the ones.` },
      o ? { value: t + o, why: `${plural(t, 'ten')} ${isAre(t)} worth ${10 * t}, not ${t}.` } : 100 * t,
      n + 1,
      n + 10,
    ],
    solution: [`${plural(t, 'ten')} ${isAre(t)} worth ${10 * t}.`, `${plural(o, 'one')} ${isAre(o)} worth ${o}.`, R`\(${10 * t} + ${o} = ${n}\).`],
    rule: 0,
    skill: 'tens and ones',
    check: () => (Math.floor(n / 10) === t && n % 10 === o ? true : 'digits do not match'),
  });
}

function easyGreatest(rng) {
  const wantMost = rng.bool(0.6);
  const pool = [];
  let T;
  let u;
  if (wantMost) {
    T = rng.int(3, 9);
    u = rng.int(0, 4);
    for (let t = 1; t < T; t++) for (let o = u + 1; o <= 9; o++) pool.push(10 * t + o);
  } else {
    T = rng.int(1, 7);
    u = rng.int(5, 9);
    for (let t = T + 1; t <= 9; t++) for (let o = 0; o < u; o++) pool.push(10 * t + o);
  }
  const target = 10 * T + u;
  const others = rng.sample(pool, 3);
  const tens = (v) => Math.floor(v / 10);
  return q({
    prompt: `Which number is the ${wantMost ? 'greatest' : 'least'}?`,
    correct: target,
    wrong: others.map((w) => ({
      value: w,
      why: wantMost ? `Look at the tens first. ${w} has only ${plural(tens(w), 'ten')}.` : `Look at the tens first. ${w} has ${plural(tens(w), 'ten')}. ${target} has only ${T}.`,
    })),
    solution: ['Compare the tens first.', `${target} has ${plural(T, 'ten')}. That is the ${wantMost ? 'most' : 'fewest'} tens.`, `So ${target} is the ${wantMost ? 'greatest' : 'least'}.`],
    rule: 4,
    skill: 'comparing',
    key: `easyGreatest:${wantMost}:${[target, ...others].sort(byValue).join(',')}`,
    check: () => (others.every((w) => (wantMost ? w < target : w > target)) ? true : 'target is not the extreme'),
  });
}

// ───────────── Medium: hundreds, tens and ones ─────────────

function mediumBlocks(rng) {
  const h = rng.int(1, 9);
  const t = rng.bool(0.35) ? 0 : rng.int(1, 9);
  let o = rng.bool(0.2) ? 0 : rng.int(1, 9);
  if (!t && !o) o = rng.int(1, 9);
  const n = 100 * h + 10 * t + o;
  const parts = joinList([plural(h, 'hundred'), t ? plural(t, 'ten') : null, o ? plural(o, 'one') : null].filter(Boolean));
  const wrong = [];
  if (!t) {
    wrong.push({ value: 10 * h + o, why: 'There are no tens. A 0 must hold the tens place.' });
    wrong.push({ value: 100 * h + 10 * o, why: 'The ones go in the last place. Write a 0 for the tens before them.' });
  } else if (!o) {
    wrong.push({ value: 10 * h + t, why: 'There are no ones. A 0 must hold the ones place.' });
    wrong.push(100 * h + t);
  } else {
    wrong.push(t !== o ? { value: 100 * h + 10 * o + t, why: 'The tens digit comes before the ones digit.' } : null);
    wrong.push(h !== t ? 100 * t + 10 * h + o : null);
  }
  wrong.push({ value: h + t + o, why: 'Each hundred is worth 100. Each ten is worth 10. Do not just count the blocks.' }, n + 100, n + 10);
  return q({
    prompt: `The blocks show ${parts}. What number is this?`,
    visual: { type: 'baseTen', value: n, alt: `Base-ten blocks: ${parts}.` },
    correct: n,
    wrong,
    solution: [
      `${plural(h, 'hundred')} ${isAre(h)} worth ${100 * h}.`,
      t ? `${plural(t, 'ten')} ${isAre(t)} worth ${10 * t}.` : 'There are no tens. Write 0 in the tens place.',
      o ? `${plural(o, 'one')} ${isAre(o)} worth ${o}.` : 'There are no ones. Write 0 in the ones place.',
      R`\(${expandedTex(n)} = ${n}\).`,
    ],
    rule: 1,
    skill: 'hundreds, tens and ones',
    check: () => (digits(n).join() === [h, t, o].join() ? true : 'digits do not match'),
  });
}

function mediumDigitValue(rng) {
  const ds = rng.sample(D19, 3);
  const n = fromDigits(ds);
  const i = rng.int(0, 2);
  const k = 2 - i;
  const d = ds[i];
  const value = d * 10 ** k;
  const j = (i + 1) % 3;
  return q({
    prompt: R`What is the value of the digit ${d} in \(${n}\)?`,
    correct: value,
    wrong: [
      k > 0 ? { value: d, why: `The ${d} is in the ${PLACES[k]} place. It means ${plural(d, PLACE_ONE[k])}.` } : { value: 10 * d, why: `The ${d} is in the ones place. It is worth just ${d}.` },
      ...[100 * d, 10 * d, d].filter((v) => v !== value),
      ds[j] * 10 ** (2 - j),
    ],
    solution: ['Name the places from the right: ones, tens, hundreds.', `The ${d} is in the ${PLACES[k]} place.`, `Its value is ${value}.`],
    rule: 1,
    skill: 'value of a digit',
    check: () => (Math.floor(n / 10 ** k) % 10 === d ? true : 'digit is not in that place'),
  });
}

function mediumExpanded(rng) {
  const h = rng.int(1, 9);
  const zero = rng.pick(['tens', 'tens', 'ones', 'none']);
  const t = zero === 'tens' ? 0 : rng.int(1, 9);
  const o = zero === 'ones' ? 0 : rng.int(1, 9);
  const n = 100 * h + 10 * t + o;
  const digitsNote = 'This adds the digits. Expanded form adds what each digit is worth.';
  if (rng.bool()) {
    let wrong;
    if (zero === 'tens') {
      wrong = [
        { value: R`\(${10 * h} + ${o}\)`, why: `The ${h} is in the hundreds place. It is worth ${100 * h}.` },
        { value: R`\(${100 * h} + ${10 * o}\)`, why: `The ${o} is in the ones place. It is worth ${o}.` },
        { value: R`\(${h} + 0 + ${o}\)`, why: digitsNote },
      ];
    } else if (zero === 'ones') {
      wrong = [
        { value: R`\(${100 * h} + ${t}\)`, why: `The ${t} is in the tens place. It is worth ${10 * t}.` },
        { value: R`\(${10 * h} + ${t}\)`, why: `The ${h} is in the hundreds place. It is worth ${100 * h}.` },
        { value: R`\(${h} + ${t} + 0\)`, why: digitsNote },
      ];
    } else {
      wrong = [
        { value: R`\(${h} + ${t} + ${o}\)`, why: digitsNote },
        { value: R`\(${100 * h} + ${t} + ${o}\)`, why: `The ${t} is in the tens place. It is worth ${10 * t}.` },
        R`\(${100 * h} + ${10 * t} + ${10 * o}\)`,
        R`\(${10 * h} + ${10 * t} + ${o}\)`,
      ];
    }
    return q({
      prompt: R`Which shows \(${n}\) in expanded form?`,
      correct: R`\(${expandedTex(n)}\)`,
      wrong,
      solution: [
        `The ${h} is in the hundreds place. It is worth ${100 * h}.`,
        t ? `The ${t} is in the tens place. It is worth ${10 * t}.` : 'There are no tens, so nothing is added for them.',
        o ? `The ${o} is in the ones place. It is worth ${o}.` : 'There are no ones, so nothing is added for them.',
        R`\(${n} = ${expandedTex(n)}\).`,
      ],
      rule: 2,
      skill: 'expanded form',
      check: () => (100 * h + 10 * t + o === n ? true : 'parts do not add up'),
    });
  }
  const sideBySide = Number([100 * h, t ? 10 * t : '', o || ''].join(''));
  return q({
    prompt: R`What number is \(${expandedTex(n)}\)?`,
    correct: n,
    fmt: M,
    wrong: [
      zero === 'tens' ? { value: 10 * h + o, why: 'There are no tens. A 0 must hold the tens place.' } : null,
      zero === 'ones' ? { value: 10 * h + t, why: 'There are no ones. A 0 must hold the ones place.' } : null,
      { value: sideBySide, why: 'The parts are added. They are not written side by side.' },
      zero === 'none' ? { value: h + t + o, why: 'Add what each part is worth, not just its first digit.' } : 100 * h + 10 * o + t,
      n + 10,
      n + 100,
    ],
    solution: ['Each part fills one place.', `Hundreds: ${h}. Tens: ${t}. Ones: ${o}.`, R`The number is \(${n}\).`],
    rule: 2,
    skill: 'expanded form',
    check: () => (digits(n).join() === [h, t, o].join() ? true : 'digits do not match'),
  });
}

function mediumCompare(rng) {
  const h = rng.int(1, 9);
  const kind = rng.pick(['tens', 'tens', 'hundreds', 'ones']);
  let a;
  let b; // a < b
  if (kind === 'tens') {
    const [t1, t2] = rng.sample(D09, 2).sort(byValue);
    const [o2, o1] = rng.sample(D09, 2).sort(byValue);
    a = 100 * h + 10 * t1 + o1;
    b = 100 * h + 10 * t2 + o2;
  } else if (kind === 'hundreds') {
    const [h1, h2] = rng.sample(D19, 2).sort(byValue);
    const tails = [rng.int(0, 49), rng.int(50, 99)];
    a = 100 * h1 + tails[1];
    b = 100 * h2 + tails[0];
  } else {
    const t = rng.int(0, 9);
    const [o1, o2] = rng.sample(D09, 2).sort(byValue);
    a = 100 * h + 10 * t + o1;
    b = 100 * h + 10 * t + o2;
  }
  const [x, y] = rng.bool() ? [a, b] : [b, a];
  const c = compareChoices(x, y);
  return q({
    prompt: 'Which comparison is true?',
    correct: c.correct,
    wrong: c.wrong,
    solution: compareSteps(x, y),
    rule: 4,
    skill: 'comparing',
    check: () => (a < b && c.correct.includes(x < y ? '<' : '>') ? true : 'comparison is not true'),
  });
}

function mediumGreatest(rng) {
  const [p, r, s] = rng.sample(D19, 3);
  const perms = [[p, r, s], [p, s, r], [r, p, s], [r, s, p], [s, p, r], [s, r, p]].map(fromDigits);
  const four = rng.sample(perms, 4);
  const wantMost = rng.bool();
  const target = wantMost ? Math.max(...four) : Math.min(...four);
  const hundreds = (v) => Math.floor(v / 100);
  const tied = four.filter((v) => hundreds(v) === hundreds(target));
  const word = wantMost ? 'greatest' : 'least';
  const steps = ['Compare the hundreds first.'];
  if (tied.length === 1) steps.push(`${target} has ${plural(hundreds(target), 'hundred')}. That is the ${wantMost ? 'most' : 'fewest'}.`);
  else {
    steps.push(`${tied[0]} and ${tied[1]} both have ${plural(hundreds(target), 'hundred')}. Compare their tens.`);
    steps.push(`${target} has ${plural(Math.floor(target / 10) % 10, 'ten')}. That is ${wantMost ? 'more' : 'fewer'}.`);
  }
  steps.push(`So ${target} is the ${word}.`);
  return q({
    prompt: `Which number is the ${word}?`,
    correct: target,
    wrong: four.filter((v) => v !== target).map((w) => ({
      value: w,
      why: hundreds(w) === hundreds(target) ? `It has the same hundreds as ${target}. Compare the tens next.` : `Compare the hundreds first. ${w} has ${plural(hundreds(w), 'hundred')}.`,
    })),
    solution: steps,
    rule: 4,
    skill: 'comparing',
    key: `mediumGreatest:${word}:${four.slice().sort(byValue).join(',')}`,
    check: () => (four.every((v) => (wantMost ? v <= target : v >= target)) ? true : 'target is not the extreme'),
  });
}

const BUNDLES = [
  { big: ['box', 'boxes'], mid: ['pack', 'packs'], item: ['crayon', 'crayons'] },
  { big: ['sheet', 'sheets'], mid: ['strip', 'strips'], item: ['sticker', 'stickers'] },
  { big: ['crate', 'crates'], mid: ['bag', 'bags'], item: ['apple', 'apples'] },
  { big: ['jar', 'jars'], mid: ['cup', 'cups'], item: ['bead', 'beads'] },
];

function mediumStory(rng) {
  const { big, mid, item } = rng.pick(BUNDLES);
  const name = person(rng);
  const h = rng.int(1, 9);
  const t = rng.bool(0.3) ? 0 : rng.int(1, 9);
  const o = rng.int(1, 9);
  const n = 100 * h + 10 * t + o;
  const has = joinList([plural(h, big[0], big[1]), t ? plural(t, mid[0], mid[1]) : null, plural(o, `single ${item[0]}`, `single ${item[1]}`)].filter(Boolean));
  return q({
    prompt: `A ${big[0]} holds 100 ${item[1]}. A ${mid[0]} holds 10 ${item[1]}. ${name} has ${has}. How many ${item[1]} does ${name} have?`,
    correct: n,
    wrong: [
      { value: h + t + o, why: `A ${big[0]} is worth 100 ${item[1]}, not 1.` },
      t ? null : { value: 10 * h + o, why: `There are no ${mid[1]}. A 0 must hold the tens place.` },
      t && t !== o ? 100 * h + 10 * o + t : 100 * h + 10 * o,
      n + 10,
      n + 100,
    ],
    solution: [
      `${plural(h, big[0], big[1])}: ${plural(h, 'hundred')}, or ${100 * h}.`,
      t ? `${plural(t, mid[0], mid[1])}: ${plural(t, 'ten')}, or ${10 * t}.` : `No ${mid[1]}: 0 tens.`,
      `Singles: ${plural(o, 'one')}.`,
      R`\(${expandedTex(n)} = ${n}\).`,
    ],
    rule: 1,
    skill: 'word problems',
    check: () => (digits(n).join() === [h, t, o].join() ? true : 'digits do not match'),
  });
}

// ───────────── Hard: thousands and beyond ─────────────

function digitValueQuestion(rng, len, minK) {
  for (;;) {
    const ds = rng.sample(D09, len);
    const i = rng.int(0, len - 1 - minK);
    const k = len - 1 - i;
    const d = ds[i];
    if (ds[0] === 0 || d === 0) continue;
    const n = fromDigits(ds);
    const value = d * 10 ** k;
    return q({
      prompt: R`What is the value of the digit ${d} in \(${N(n)}\)?`,
      correct: value,
      fmt: M,
      wrong: [
        k > 0 ? { value: d, why: `The ${d} is in the ${PLACES[k]} place. It means ${plural(d, PLACE_ONE[k])}.` } : null,
        { value: value * 10, why: `Count the places from the right. The ${d} is in the ${PLACES[k]} place.` },
        k > 0 ? value / 10 : null,
        value * 100,
      ],
      solution: [`Name the places from the right: ${PLACES.slice(0, len).join(', ')}.`, `The ${d} is in the ${PLACES[k]} place.`, R`Its value is \(${N(value)}\).`],
      rule: 1,
      skill: 'value of a digit',
      check: () => (Math.floor(n / 10 ** k) % 10 === d ? true : 'digit is not in that place'),
    });
  }
}

function hardDigitValue(rng) {
  return digitValueQuestion(rng, rng.int(4, 6), 0);
}

function hardExpanded(rng) {
  const len = 5;
  const ds = Array.from({ length: len }, () => rng.int(1, 9));
  if (rng.bool()) {
    const z = rng.int(1, 3);
    ds[z] = 0;
    const n = fromDigits(ds);
    const swapped = (i, j) => {
      const c = ds.slice();
      [c[i], c[j]] = [c[j], c[i]];
      return fromDigits(c);
    };
    const place = PLACES[len - 1 - z];
    return q({
      prompt: R`What number is \(${expandedTex(n)}\)?`,
      correct: n,
      fmt: M,
      wrong: [
        { value: fromDigits(ds.filter((_, i) => i !== z)), why: `There are no ${place}. A 0 must hold that place.` },
        { value: swapped(z, z + 1), why: `The 0 belongs in the ${place} place.` },
        z > 1 ? swapped(z, z - 1) : null,
        fromDigits([...ds.slice(0, z), 0, ...ds.slice(z)]),
      ],
      solution: ['Each part fills one place.', `No part fills the ${place} place, so write 0 there.`, R`The number is \(${N(n)}\).`],
      rule: 2,
      skill: 'expanded form',
      check: () => (ds.reduce((sum, d, i) => sum + d * 10 ** (len - 1 - i), 0) === n ? true : 'parts do not add up'),
    });
  }
  const [z1, z2] = rng.sample([1, 2, 3, 4], 2);
  ds[z1] = 0;
  ds[z2] = 0;
  const n = fromDigits(ds);
  const parts = ds.map((d, i) => [d, len - 1 - i]).filter(([d]) => d > 0);
  const show = (list) => R`\(${list.map(([d, k]) => N(d * 10 ** k)).join(' + ')}\)`;
  const shift = (index, by) => parts.map(([d, k], i) => (i === index ? [d, k + by] : [d, k]));
  const [d1, k1] = parts[1];
  return q({
    prompt: R`Which shows \(${N(n)}\) in expanded form?`,
    correct: show(parts),
    wrong: [
      { value: show(shift(0, -1)), why: `The ${ds[0]} is in the ten thousands place. It is worth ${txt(ds[0] * 10000)}.` },
      { value: show(shift(1, k1 > 0 ? -1 : 1)), why: `The ${d1} is in the ${PLACES[k1]} place. It is worth ${txt(d1 * 10 ** k1)}.` },
      show(shift(2, 1)),
      { value: R`\(${ds.join(' + ')}\)`, why: 'This adds the digits. Expanded form adds what each digit is worth.' },
    ],
    solution: [...parts.map(([d, k]) => `The ${d} is in the ${PLACES[k]} place. It is worth ${txt(d * 10 ** k)}.`), 'The zeros add nothing.', R`\(${N(n)} = ${expandedTex(n)}\).`],
    rule: 2,
    skill: 'expanded form',
    check: () => (parts.reduce((sum, [d, k]) => sum + d * 10 ** k, 0) === n ? true : 'parts do not add up'),
  });
}

function hardWordForm(rng) {
  const th = rng.int(11, 999);
  const rest = rng.int(1, 99);
  const n = th * 1000 + rest;
  const noZeros = Number(`${th}${rest}`);
  const slid = th * 1000 + rest * (rest < 10 ? 100 : 10);
  const extra = th * 10000 + rest;
  const other = rest < 10 ? th * 1000 + rest * 10 : th * 1000 + Math.floor(rest / 10) * 100 + (rest % 10);
  const pad = String(rest).padStart(3, '0');
  const solution = [`"${numberWords(th)} thousand" means ${th} in the thousands group.`, `"${numberWords(rest)}" is ${rest}. The last group needs three digits: ${pad}.`, R`The number is \(${N(n)}\).`];
  if (rng.bool()) {
    return q({
      prompt: `Which number is "${numberWords(n)}"?`,
      correct: n,
      fmt: M,
      wrong: [
        { value: noZeros, why: 'After the thousands comma there are always three digits. Fill empty places with zeros.' },
        { value: slid, why: `"${numberWords(rest)}" is ${rest}. Write it as ${pad} after the comma.` },
        extra,
        other,
      ],
      solution,
      rule: 3,
      skill: 'reading numbers',
      check: () => (Math.floor(n / 1000) === th && n % 1000 === rest ? true : 'groups do not match'),
    });
  }
  return q({
    prompt: R`How do you read \(${N(n)}\)?`,
    correct: numberWords(n),
    wrong: [
      { value: numberWords(slid), why: `The last group is ${pad}. That is ${rest}.` },
      numberWords(noZeros),
      numberWords(other),
      numberWords(extra),
    ],
    solution: [`Read the group before the comma: ${numberWords(th)}. Then say "thousand".`, `Read the group after the comma: ${pad} is ${numberWords(rest)}.`, `Together: ${numberWords(n)}.`],
    rule: 3,
    skill: 'reading numbers',
    check: () => (Math.floor(n / 1000) === th && n % 1000 === rest ? true : 'groups do not match'),
  });
}

const ROUND_STORIES = [
  (n, place) => `A school collected ${n} cans. About how many is that, to the nearest ${place}?`,
  (n, place) => `A library has ${n} books. About how many is that, to the nearest ${place}?`,
  (n, place) => `${n} people came to a game. About how many is that, to the nearest ${place}?`,
  (n, place) => `A farm grew ${n} pumpkins. About how many is that, to the nearest ${place}?`,
];

function roundingQuestion(rng, n, k, story) {
  const p = 10 ** k;
  const lower = Math.floor(n / p) * p;
  const upper = lower + p;
  const dg = Math.floor(n / (p / 10)) % 10;
  const up = dg >= 5;
  const correct = up ? upper : lower;
  return q({
    prompt: story ? rng.pick(ROUND_STORIES)(txt(n), PLACE_ONE[k]) : R`Round \(${N(n)}\) to the nearest ${PLACE_ONE[k]}.`,
    correct,
    fmt: M,
    wrong: [
      { value: up ? lower : upper, why: `The ${PLACES[k - 1]} digit is ${dg}. That is ${up ? '5 or more, so round up' : 'less than 5, so round down'}.` },
      k >= 2 ? { value: roundTo(n, p / 10), why: `That is rounded to the nearest ${PLACE_ONE[k - 1]}. The question asks for the nearest ${PLACE_ONE[k]}.` } : null,
      roundTo(n, 10 * p) || null,
      up ? upper + p : lower - p > 0 ? lower - p : upper + p,
      up ? lower - p : upper + p,
    ],
    solution: [
      R`\(${N(n)}\) is between \(${N(lower)}\) and \(${N(upper)}\).`,
      `Look at the digit to the right of the ${PLACES[k]} place. It is ${dg}.`,
      up ? `${dg} is 5 or more, so round up.` : `${dg} is less than 5, so round down.`,
      R`\(${N(n)}\) rounds to \(${N(correct)}\).`,
    ],
    rule: 5,
    skill: 'rounding',
    check: () => {
      const gap = Math.abs(n - correct);
      return correct % p === 0 && (gap < p / 2 || (gap === p / 2 && correct > n)) ? true : 'not the nearest multiple';
    },
  });
}

function hardRound(rng) {
  for (;;) {
    const len = rng.int(3, 4);
    const n = rng.int(10 ** (len - 1) + 1, 10 ** len - 1);
    const k = rng.int(1, len - 1);
    if (n % 10 ** k === 0) continue;
    return roundingQuestion(rng, n, k, rng.bool(0.4));
  }
}

function hardCompare(rng) {
  let a;
  let b; // a < b
  if (rng.bool(0.3)) {
    a = rng.int(80000, 99999);
    b = rng.int(100000, 129999);
  } else {
    const len = rng.int(5, 6);
    const m = rng.int(1, len - 3); // places to the right of the first place that differs
    const prefix = rng.int(10 ** (len - m - 2), 10 ** (len - m - 1) - 1);
    const [d1, d2] = rng.sample(D09, 2).sort(byValue);
    const [tail2, tail1] = [rng.int(0, 10 ** m - 1), rng.int(0, 10 ** m - 1)].sort(byValue);
    a = (prefix * 10 + d1) * 10 ** m + tail1;
    b = (prefix * 10 + d2) * 10 ** m + tail2;
  }
  const [x, y] = rng.bool() ? [a, b] : [b, a];
  const c = compareChoices(x, y);
  return q({
    prompt: 'Which comparison is true?',
    correct: c.correct,
    wrong: c.wrong,
    solution: compareSteps(x, y),
    rule: 4,
    skill: 'comparing',
    check: () => (a < b && c.correct.includes(x < y ? '<' : '>') ? true : 'comparison is not true'),
  });
}

// ───────────── Challenge ─────────────

function challengeRound(rng) {
  for (;;) {
    const len = rng.int(5, 7);
    const k = rng.int(2, len - 1);
    const p = 10 ** k;
    let n = rng.int(10 ** (len - 1), 10 ** len - 1);
    // Sometimes force a 9 in the rounding place with 5 or more after it, so the rounding carries.
    if (rng.bool(0.35)) n = Math.floor(n / (10 * p)) * 10 * p + 9 * p + rng.int(5, 9) * (p / 10) + (n % (p / 10));
    if (n % p === 0) continue;
    return roundingQuestion(rng, n, k, false);
  }
}

function challengeRoundBack(rng) {
  const k = rng.int(1, 3);
  const p = 10 ** k;
  const half = p / 2;
  const base = p * rng.int(11, 98);
  const correct = base + rng.intExcept(-half, half - 1, [0]);
  const tooHigh = base + rng.int(half, p - 1);
  const tooLow = base - rng.int(half + 1, p - 1);
  const wayHigh = base + p + rng.int(0, half - 1);
  return q({
    prompt: R`A number rounded to the nearest ${PLACE_ONE[k]} is \(${N(base)}\). Which could be the number?`,
    correct,
    fmt: M,
    wrong: [
      { value: tooHigh, why: tooHigh === base + half ? `This is exactly halfway. A halfway number rounds up, to ${txt(base + p)}.` : `This is closer to ${txt(base + p)}. It rounds up to ${txt(base + p)}.` },
      { value: tooLow, why: `This is closer to ${txt(base - p)}. It rounds down to ${txt(base - p)}.` },
      wayHigh,
    ],
    solution: [
      R`Numbers from \(${N(base - half)}\) to \(${N(base + half - 1)}\) round to \(${N(base)}\).`,
      R`\(${N(correct)}\) is in that range.`,
      R`So \(${N(correct)}\) rounds to \(${N(base)}\).`,
    ],
    rule: 5,
    skill: 'rounding',
    key: `roundBack:${base}:${correct}`,
    check: () => (roundTo(correct, p) === base && [tooHigh, tooLow, wayHigh].every((w) => roundTo(w, p) !== base) ? true : 'rounding does not separate the choices'),
  });
}

function challengeMakeNumber(rng) {
  const wantMost = rng.bool();
  const ds = wantMost ? rng.sample(D09, 4) : [0, ...rng.sample(D19, 3)];
  const up = ds.slice().sort(byValue);
  const down = up.slice().reverse();
  const shown = joinList(rng.shuffle(ds).map(String));
  const swapped = (list, i, j) => {
    const c = list.slice();
    [c[i], c[j]] = [c[j], c[i]];
    return fromDigits(c);
  };
  // Every arrangement that is a real 4-digit number, for the check.
  const all = [];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) {
    if (new Set([a, b, c, d]).size === 4 && ds[a] !== 0) all.push(fromDigits([ds[a], ds[b], ds[c], ds[d]]));
  }
  if (wantMost) {
    const best = fromDigits(down);
    return q({
      prompt: `Use the digits ${shown} once each. What is the greatest 4-digit number you can make?`,
      correct: best,
      fmt: M,
      wrong: [
        { value: swapped(down, 1, 2), why: 'After the thousands, the next biggest digit goes in the hundreds place.' },
        swapped(down, 2, 3),
        { value: fromDigits(up[0] === 0 ? [up[1], up[0], up[2], up[3]] : up), why: 'That is the least number. For the greatest, put the biggest digits first.' },
        swapped(down, 0, 1),
      ],
      solution: ['Put the biggest digit in the biggest place.', `Thousands: ${down[0]}. Hundreds: ${down[1]}. Tens: ${down[2]}. Ones: ${down[3]}.`, R`The greatest number is \(${N(best)}\).`],
      rule: 1,
      skill: 'building numbers',
      check: () => (Math.max(...all) === best ? true : 'not the greatest arrangement'),
    });
  }
  const least = [up[1], 0, up[2], up[3]];
  const best = fromDigits(least);
  return q({
    prompt: `Use the digits ${shown} once each. What is the least 4-digit number you can make?`,
    correct: best,
    fmt: M,
    wrong: [
      { value: fromDigits(up), why: 'A 4-digit number cannot start with 0. Put the 0 in the hundreds place.' },
      { value: swapped(least, 1, 2), why: 'The 0 is the smallest digit. Put it in the biggest place you can: the hundreds.' },
      swapped(least, 2, 3),
      fromDigits([up[2], 0, up[1], up[3]]),
    ],
    solution: ['Put the smallest digits in the biggest places.', `The thousands digit cannot be 0. Use the next smallest digit: ${up[1]}.`, `Then use 0, ${up[2]} and ${up[3]} in order.`, R`The least number is \(${N(best)}\).`],
    rule: 1,
    skill: 'building numbers',
    check: () => (Math.min(...all) === best ? true : 'not the least arrangement'),
  });
}

const PACKS = [
  { size: 10, box: 'pack', boxes: 'packs', item: 'pencils' },
  { size: 10, box: 'bag', boxes: 'bags', item: 'marbles' },
  { size: 10, box: 'tray', boxes: 'trays', item: 'muffins' },
  { size: 100, box: 'box', boxes: 'boxes', item: 'paper clips' },
  { size: 100, box: 'roll', boxes: 'rolls', item: 'stickers' },
  { size: 100, box: 'jar', boxes: 'jars', item: 'beads' },
];

function challengePacks(rng) {
  const { size, box, boxes, item } = rng.pick(PACKS);
  const n = rng.int(1001, 9999);
  const full = Math.floor(n / size);
  const left = n % size;
  const k = size === 10 ? 1 : 2;
  const digit = Math.floor(n / size) % 10;
  return q({
    prompt: `A ${box} holds ${size} ${item}. How many full ${boxes} can you make from ${txt(n)} ${item}?`,
    correct: full,
    fmt: M,
    wrong: [
      { value: digit, why: `${digit} is only the ${PLACES[k]} digit. The bigger places can be traded for ${PLACES[k]} too.` },
      left ? { value: full + 1, why: `Only full ${boxes} count. ${left} left over ${left === 1 ? 'is' : 'are'} not enough to fill one.` } : null,
      size === 10 ? Math.floor(n / 100) : Math.floor(n / 10),
      Math.floor(n / 1000),
      full + 10,
    ],
    solution: [
      size === 10 ? 'Each hundred is 10 tens. Each thousand is 100 tens.' : 'Each thousand is 10 hundreds.',
      R`So \(${N(n)}\) has ${txt(full)} ${PLACES[k]}${left ? ` and ${left} left over` : ''}.`,
      `You can make ${txt(full)} full ${boxes}.`,
    ],
    rule: 1,
    skill: 'word problems',
    check: () => (full * size <= n && n < (full + 1) * size ? true : 'wrong number of full packs'),
  });
}

function challengeOrder(rng) {
  const lead = rng.int(1, 99);
  const [p, r, s] = rng.sample(D09, 3);
  const tails = rng.sample([[p, r, s], [p, s, r], [r, p, s], [r, s, p], [s, p, r], [s, r, p]], 3);
  const [a, b, c] = tails.map((t) => lead * 1000 + fromDigits(t)).sort(byValue);
  const chain = (x, y, z) => R`\(${N(x)} < ${N(y)} < ${N(z)}\)`;
  return q({
    prompt: 'Which shows the numbers in order from least to greatest?',
    correct: chain(a, b, c),
    wrong: [
      { value: chain(c, b, a), why: 'This is greatest to least. The symbol < means "is less than".' },
      { value: chain(a, c, b), why: `Compare ${txt(b)} and ${txt(c)} place by place, from the left.` },
      chain(b, a, c),
      chain(b, c, a),
    ],
    solution: [firstDifference(a, b), firstDifference(b, c), `So the order is ${chain(a, b, c)}.`],
    rule: 4,
    skill: 'ordering',
    check: () => (a < b && b < c ? true : 'not in order'),
  });
}

function challengeMillions(rng) {
  if (rng.bool()) return digitValueQuestion(rng, 7, 4);
  for (;;) {
    const ds = rng.sample(D09, 7);
    if (ds[0] === 0) continue;
    const i = rng.int(1, 3);
    const k = 6 - i;
    const n = fromDigits(ds);
    return q({
      prompt: R`Which digit is in the ${PLACES[k]} place of \(${N(n)}\)?`,
      correct: ds[i],
      wrong: [
        { value: ds[i + 1], why: `That digit is in the ${PLACES[k - 1]} place. Count the places from the right.` },
        { value: ds[i - 1], why: `That digit is in the ${PLACES[k + 1]} place. Count the places from the right.` },
        ds[6 - i],
        ds[6],
      ],
      solution: [`Name the places from the right: ${PLACES.join(', ')}.`, `The ${PLACES[k]} place is ${k + 1} places from the right.`, `The digit there is ${ds[i]}.`],
      rule: 1,
      skill: 'value of a digit',
      check: () => (Math.floor(n / 10 ** k) % 10 === ds[i] ? true : 'digit is not in that place'),
    });
  }
}

function challengeRegroup(rng) {
  const a = rng.int(1, 8);
  const b = rng.int(11, 19);
  const c = rng.int(1, 9);
  const n = 1000 * a + 100 * b + 10 * c;
  return q({
    prompt: `Which number is the same as ${plural(a, 'thousand')}, ${b} hundreds and ${plural(c, 'ten')}?`,
    correct: n,
    fmt: M,
    wrong: [
      { value: Number(`${a}${b}${c}0`), why: `${b} hundreds do not fit in one place. Trade 10 hundreds for 1 thousand.` },
      { value: n - 1000, why: 'The 10 extra hundreds make 1 more thousand. Add it to the thousands.' },
      Number(`${a}${b}${c}`),
      n + 1000,
    ],
    solution: [`${b} hundreds is 10 hundreds and ${b - 10} more.`, '10 hundreds make 1 thousand.', `Now there are ${a + 1} thousands, ${plural(b - 10, 'hundred')} and ${plural(c, 'ten')}.`, R`The number is \(${N(n)}\).`],
    rule: 1,
    skill: 'regrouping places',
    check: () => ((a + 1) * 1000 + (b - 10) * 100 + c * 10 === n ? true : 'regrouping does not match'),
  });
}

// ───────────── Interactive models ─────────────

export default {
  id: 'place-value',
  title: 'Place Value',
  summary: 'Read, write, compare and round whole numbers by knowing what each digit is worth.',
  grade: 'Grades 1–4',
  standards: ['CCSS 1.NBT.B.2', 'CCSS 2.NBT.A.1', 'CCSS 2.NBT.A.4', 'CCSS 4.NBT.A.2', 'CCSS 4.NBT.A.3'],

  explain: {
    intro: 'We write every number with just ten digits, 0 to 9. The place where a digit sits tells what it is worth. This is called **place value**.',
    rules: [
      {
        title: 'Tens and ones',
        text: 'A two-digit number is made of tens and ones. The first digit counts the tens. The second digit counts the ones.',
        example: R`\(47\) is 4 tens and 7 ones. That is \(40 + 7\).`,
      },
      {
        title: 'Each place is worth ten times more',
        text: 'Each place is worth 10 times the place to its right. 10 ones make a ten. 10 tens make a hundred. 10 hundreds make a thousand.',
        example: R`In \(3{,}482\), the 3 is worth \(3{,}000\). The 4 is worth \(400\). The 8 is worth \(80\). The 2 is worth \(2\).`,
      },
      {
        title: 'Expanded form',
        text: 'Expanded form shows a number as a sum. Each digit is written with its full value. A 0 holds a place that is empty.',
        example: R`\(5{,}072 = 5{,}000 + 70 + 2\). The 0 shows there are no hundreds.`,
      },
      {
        title: 'Reading and writing big numbers',
        text: 'Commas split a big number into groups of three digits. Read one group at a time. Say "million" or "thousand" after its group.',
        example: R`\(42{,}065\) is read "forty-two thousand, sixty-five".`,
      },
      {
        title: 'Compare from the left',
        text: 'A whole number with more digits is greater. If the digits are the same in number, start at the left. The first place that is different decides.',
        example: R`\(458 < 485\). Both have 4 hundreds, but 5 tens is less than 8 tens.`,
      },
      {
        title: 'Rounding',
        text: 'Rounding finds the nearest ten, hundred or thousand. Look at the digit just to the right of that place. If it is 5 or more, round up. If it is 4 or less, round down.',
        example: R`Round \(364\) to the nearest hundred. The tens digit is 6, so round up to \(400\).`,
      },
    ],
    vocab: [
      { term: 'digit', def: 'One of the ten symbols 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.' },
      { term: 'place value', def: 'What a digit is worth because of where it sits in a number.' },
      { term: 'expanded form', def: R`A number written as a sum of its place values, like \(300 + 40 + 5\).` },
      { term: '< and >', def: R`\(<\) means "is less than". \(>\) means "is greater than". The open side faces the greater number.` },
      { term: 'round', def: 'To swap a number for a nearby number that is easier to use.' },
    ],
    mistakes: [
      R`Reading a digit without its place. In \(47\), the 4 means 40, not 4.`,
      R`Leaving out a zero. Three hundred five is \(305\), not \(35\).`,
      R`Comparing the ones first. \(71 > 69\) because 7 tens is more than 6 tens.`,
      'Rounding with the wrong digit. Look only at the digit just to the right of the rounding place.',
    ],
    visual: { type: 'baseTen', value: 235, alt: 'Base-ten blocks for 235: 2 hundreds flats, 3 tens rods and 5 ones cubes.' },
  },

  examples: [
    {
      title: 'Tens and ones',
      problem: 'What number has 5 tens and 3 ones?',
      steps: ['5 tens are worth 50.', '3 ones are worth 3.', R`\(50 + 3 = 53\).`],
      answer: R`\(53\)`,
      visual: { type: 'baseTen', value: 53, alt: 'Base-ten blocks: 5 tens rods and 3 ones cubes.' },
    },
    {
      title: 'The value of a digit',
      problem: R`What is the value of the 6 in \(4{,}629\)?`,
      steps: ['Name the places from the right: ones, tens, hundreds, thousands.', 'The 6 is in the hundreds place.', '6 hundreds is 600.'],
      answer: R`\(600\)`,
    },
    {
      title: 'Expanded form with zeros',
      problem: R`Write \(30{,}508\) in expanded form.`,
      steps: ['The 3 is in the ten thousands place. It is worth 30,000.', 'The 5 is in the hundreds place. It is worth 500.', 'The 8 is in the ones place. It is worth 8.', 'The zeros add nothing.'],
      answer: R`\(30{,}000 + 500 + 8\)`,
    },
    {
      title: 'Comparing two numbers',
      problem: R`Which is greater, \(7{,}214\) or \(7{,}241\)?`,
      steps: ['Both numbers have 4 digits. Start at the left.', 'Thousands: 7 and 7. Hundreds: 2 and 2. They match.', 'Tens: 1 is less than 4.', R`So \(7{,}214 < 7{,}241\).`],
      answer: R`\(7{,}241\) is greater.`,
    },
    {
      title: 'Rounding',
      problem: R`Round \(2{,}783\) to the nearest hundred.`,
      steps: [R`\(2{,}783\) is between \(2{,}700\) and \(2{,}800\).`, 'Look at the digit to the right of the hundreds place. It is 8.', '8 is 5 or more, so round up.'],
      answer: R`\(2{,}800\)`,
      visual: { type: 'numberLine', min: 2700, max: 2800, step: 10, labels: [{ value: 2700, text: '2,700' }, { value: 2750, text: '2,750' }, { value: 2800, text: '2,800' }], points: [{ value: 2783, label: '2,783' }], alt: 'A number line from 2,700 to 2,800. 2,783 is marked past the halfway point, 2,750.' },
    },
    {
      title: 'Word problem: boxes and packs',
      word: true,
      problem: 'A box holds 100 crayons. A pack holds 10 crayons. Kai has 2 boxes, 4 packs and 7 single crayons. How many crayons does Kai have?',
      steps: ['2 boxes: 2 hundreds, or 200.', '4 packs: 4 tens, or 40.', 'Singles: 7 ones.', R`\(200 + 40 + 7 = 247\).`],
      answer: '247 crayons',
      visual: { type: 'baseTen', value: 247, alt: 'Base-ten blocks: 2 hundreds flats, 4 tens rods and 7 ones cubes.' },
    },
  ],

  models: [
    {
      id: 'break-apart',
      title: 'Break a number into its places',
      intro: 'Type a number. See its blocks and what each digit is worth.',
      inputs: [{ name: 'n', label: 'Number', type: 'int', min: 0, max: 9999, value: 2305 }],
      compute({ n }) {
        const ds = digits(n);
        const steps = ds.map((d, i) => {
          const k = ds.length - 1 - i;
          if (d === 0) return n === 0 ? 'There are 0 ones.' : `The 0 holds the ${PLACES[k]} place. It adds nothing.`;
          return `The ${d} is in the ${PLACES[k]} place. It is worth ${txt(d * 10 ** k)}.`;
        });
        steps.push(R`Expanded form: \(${N(n)} = ${expandedTex(n)}\).`);
        return {
          problem: R`What is each digit of \(${N(n)}\) worth?`,
          steps,
          answer: R`\(${N(n)} = ${expandedTex(n)}\)`,
          visual: { type: 'baseTen', value: n },
        };
      },
    },
    {
      id: 'round-it',
      title: 'Round a number',
      intro: 'Pick a number and a place to round to.',
      inputs: [
        { name: 'n', label: 'Number', type: 'int', min: 0, max: 999999, value: 2783 },
        {
          name: 'place',
          label: 'Round to the nearest',
          type: 'select',
          value: '100',
          options: [
            { value: '10', label: 'ten' },
            { value: '100', label: 'hundred' },
            { value: '1000', label: 'thousand' },
            { value: '10000', label: 'ten thousand' },
            { value: '100000', label: 'hundred thousand' },
          ],
        },
      ],
      compute({ n, place }) {
        const p = Number(place);
        const k = String(p).length - 1;
        const problem = R`Round \(${N(n)}\) to the nearest ${PLACE_ONE[k]}.`;
        if (n % p === 0) {
          return { problem, steps: [R`\(${N(n)}\) is already a whole number of ${PLACES[k]}.`, 'Rounding does not change it.'], answer: M(n) };
        }
        const lower = Math.floor(n / p) * p;
        const upper = lower + p;
        const half = lower + p / 2;
        const dg = Math.floor(n / (p / 10)) % 10;
        const up = dg >= 5;
        return {
          problem,
          steps: [
            R`\(${N(n)}\) is between \(${N(lower)}\) and \(${N(upper)}\).`,
            R`Halfway between them is \(${N(half)}\).`,
            `Look at the digit to the right of the ${PLACES[k]} place. It is ${dg}.`,
            up ? `${dg} is 5 or more, so round up.` : `${dg} is less than 5, so round down.`,
          ],
          answer: M(up ? upper : lower),
          visual: {
            type: 'numberLine',
            min: lower,
            max: upper,
            step: p / 10,
            labels: [{ value: lower, text: txt(lower) }, { value: half, text: txt(half) }, { value: upper, text: txt(upper) }],
            points: [{ value: n, label: txt(n) }],
            alt: `A number line from ${txt(lower)} to ${txt(upper)}. ${txt(n)} is marked. Halfway is ${txt(half)}.`,
          },
        };
      },
    },
    {
      id: 'two-towns',
      title: 'Word problem: which town is bigger?',
      word: true,
      intro: 'Change how many people live in each town.',
      inputs: [
        { name: 'a', label: 'People in Elm Town', type: 'int', min: 0, max: 999999, value: 48362 },
        { name: 'b', label: 'People in Oak Town', type: 'int', min: 0, max: 999999, value: 48326 },
      ],
      compute({ a, b }) {
        const problem = `Elm Town has ${plural(a, 'person', 'people')}. Oak Town has ${plural(b, 'person', 'people')}. Which town has more people?`;
        const da = digits(a);
        const db = digits(b);
        const table = da.length === db.length
          ? { type: 'table', headers: ['Town', ...PLACES.slice(0, da.length).reverse()], rows: [['Elm Town', ...da.map(String)], ['Oak Town', ...db.map(String)]], rowHeaders: true, alt: `A place-value table with the digits of ${txt(a)} and ${txt(b)}.` }
          : undefined;
        if (a === b) {
          return { problem, steps: ['Compare the digits place by place.', 'Every digit matches.', R`\(${N(a)} = ${N(b)}\).`], answer: 'The towns have the same number of people.', visual: table };
        }
        return {
          problem,
          steps: compareSteps(a, b),
          answer: `${a > b ? 'Elm Town' : 'Oak Town'} has more people.`,
          visual: table,
        };
      },
    },
  ],

  quiz: {
    easy: [easyBlocks, easyDigitValue, easyBuild, easyGreatest],
    medium: [mediumBlocks, mediumDigitValue, mediumExpanded, mediumCompare, mediumGreatest, mediumStory],
    hard: [hardDigitValue, hardExpanded, hardWordForm, hardRound, hardCompare],
    challenge: [challengeRound, challengeRoundBack, challengeMakeNumber, challengePacks, challengeOrder, challengeMillions, challengeRegroup],
  },
};
