import { R, q, person, people, plural } from '../../lib/index.js';
import { countList } from './_shared.js';

// Every number a child sees in this topic stays between 0 and 20.
const in20 = (v) => (Number.isInteger(v) && v >= 0 && v <= 20 ? v : null);
const noted = (value, why) => ({ value: in20(value), why });

const TOYS = [['sticker', 'stickers'], ['marble', 'marbles'], ['toy car', 'toy cars'], ['block', 'blocks'], ['shell', 'shells'], ['crayon', 'crayons'], ['bead', 'beads'], ['card', 'cards'], ['balloon', 'balloons'], ['book', 'books']];
const SNACKS = ['grapes', 'crackers', 'berries', 'cookies', 'carrot sticks', 'apple slices'];

// ───────────── Pictures ─────────────

const frames = (a, b) => ({ type: 'counters', frame: true, groups: [a, b], alt: `Ten-frames with ${a} blue counters and ${b} orange counters.` });
const row = (a, b) => ({ type: 'counters', groups: [a, b], alt: `A row of ${a} blue counters and ${b} orange counters.` });
const crossedOut = (a, b, frame = false) => ({ type: 'counters', frame, groups: [a], crossed: b, alt: `${a} counters. The last ${b} are crossed out.` });

// A number line with one labelled jump for each size in `sizes` (negative sizes jump back).
function hops(from, sizes, min = 0, max = 20) {
  const jumps = [];
  let at = from;
  for (const s of sizes) {
    jumps.push({ from: at, to: at + s, label: s > 0 ? `+${s}` : `−${-s}` });
    at += s;
  }
  return { type: 'numberLine', min, max, step: 1, jumps, alt: `A number line. It starts at ${from} and jumps ${sizes.map((s) => (s > 0 ? `forward ${s}` : `back ${-s}`)).join(', then ')} to land on ${at}.` };
}

function compareBars(n1, a, n2, b) {
  // a is the bigger amount; the gap is drawn as an empty box with a question mark.
  return {
    type: 'barModel',
    rows: [
      { label: n1, parts: [{ value: a, label: `${a}` }] },
      { label: n2, parts: [{ value: b, label: `${b}` }, { value: a - b, label: '?', shade: 'none' }] },
    ],
    alt: `Two bars. The bar for ${n1} shows ${a}. The bar for ${n2} shows ${b}, with a gap marked by a question mark.`,
  };
}

// ───────────── Stories (result unknown) ─────────────

function joinStory(rng, a, b) {
  const name = person(rng);
  const [, many] = rng.pick(TOYS);
  return rng.pick([
    `${name} has ${a} ${many}. ${name} gets ${b} more. How many ${many} does ${name} have now?`,
    `${a} children are on the swings. ${b} more children come. How many children are there now?`,
    `${a} ducks swim in a pond. ${b} more ducks fly in. How many ducks are in the pond now?`,
    `There are ${a} fish in a tank. ${name} adds ${b} more. How many fish are in the tank now?`,
  ]);
}

function togetherStory(rng, a, b) {
  const name = person(rng);
  const [, many] = rng.pick(TOYS);
  return rng.pick([
    `${name} has ${a} red ${many} and ${b} blue ${many}. How many ${many} does ${name} have?`,
    `A pet shop has ${a} puppies and ${b} kittens. How many pets is that?`,
    `${name} read ${a} pages at school. ${name} read ${b} pages at home. How many pages did ${name} read?`,
    `A bowl holds ${a} red apples and ${b} green apples. How many apples are in the bowl?`,
  ]);
}

function takeStory(rng, a, b) {
  const name = person(rng);
  const [, many] = rng.pick(TOYS);
  const snack = rng.pick(SNACKS);
  return rng.pick([
    `${name} has ${a} ${many}. ${name} gives ${b} away. How many ${many} are left?`,
    `${a} birds sit in a tree. ${b} fly away. How many birds are still in the tree?`,
    `${name} has ${a} ${snack}. ${name} eats ${b}. How many ${snack} are left?`,
    `There are ${a} books on a shelf. ${name} takes ${b}. How many books are on the shelf now?`,
  ]);
}

function resultStory(rng, kind, a, b) {
  if (kind === 'take') {
    const d = a - b;
    return q({
      prompt: takeStory(rng, a, b),
      correct: d,
      wrong: [noted(a + b, 'This adds. Some are taken away, so the number gets smaller.'), d + 1, d - 1, d + 2, b !== d ? b : d + 3],
      solution: ['Some are taken away, so subtract.', R`\(${a} - ${b} = ${d}\).`, R`Check with addition: \(${d} + ${b} = ${a}\).`],
      rule: 5,
      skill: 'word problems',
      check: () => (d + b === a ? true : 'difference does not add back'),
    });
  }
  const sum = a + b;
  return q({
    prompt: kind === 'join' ? joinStory(rng, a, b) : togetherStory(rng, a, b),
    correct: sum,
    wrong: [a !== b ? noted(Math.abs(a - b), 'This takes away. The groups are joined, so add.') : null, sum + 1, sum - 1, in20(sum + 2), sum - 2],
    solution: [kind === 'join' ? 'More are added to the group, so add.' : 'Two groups are put together, so add.', R`\(${a} + ${b} = ${sum}\).`],
    rule: 5,
    skill: 'word problems',
    check: () => (sum - b === a ? true : 'sum does not undo'),
  });
}

// ───────────── Easy: facts within 10, counting on, doubles ─────────────

function easyAdd(rng) {
  const a = rng.int(1, 9);
  const b = rng.int(1, 10 - a);
  const sum = a + b;
  return q({
    prompt: R`What is \(${a} + ${b}\)? The picture shows ${a} blue and ${b} orange.`,
    visual: row(a, b),
    correct: sum,
    wrong: [a !== b ? noted(Math.abs(a - b), 'This takes away. The plus sign means join the groups.') : null, sum + 1, sum - 1, sum + 2],
    solution: [`Start with the ${a} blue.`, `Count on the ${b} orange: ${countList(a, b)}.`, R`So \(${a} + ${b} = ${sum}\).`],
    rule: 0,
    skill: 'facts within 10',
    check: () => (sum - a === b ? true : 'sum does not undo'),
  });
}

function easyCountOn(rng) {
  const b = rng.int(1, 3);
  const a = rng.int(5, 20 - b);
  const sum = a + b;
  const lo = Math.max(0, Math.min(a - 2, 10));
  const flip = rng.bool();
  return q({
    prompt: flip ? R`What is \(${b} + ${a}\)? Start at the bigger number and count on.` : R`What is \(${a} + ${b}\)? Count on from ${a}.`,
    visual: hops(a, Array(b).fill(1), lo, lo + 10),
    correct: sum,
    wrong: [noted(sum - 1, `Do not count ${a} again. The first number you say is ${a + 1}.`), in20(sum + 1), in20(sum + 2), sum - 2, sum - 3],
    solution: [`Start at the bigger number, ${a}.`, `Count on ${b} more: ${countList(a, b)}.`, flip ? R`So \(${b} + ${a} = ${sum}\).` : R`So \(${a} + ${b} = ${sum}\).`],
    rule: 0,
    skill: 'counting on',
    check: () => (sum - b === a ? true : 'sum does not undo'),
  });
}

function easySubtract(rng) {
  const a = rng.int(2, 10);
  const b = rng.int(1, a - 1);
  const d = a - b;
  return q({
    prompt: R`What is \(${a} - ${b}\)? The picture shows ${a} counters with ${b} crossed out.`,
    visual: crossedOut(a, b),
    correct: d,
    wrong: [noted(a + b, 'This adds. The minus sign means take away.'), d + 1, d - 1, b !== d ? b : d + 2, d + 3],
    solution: [`Start with ${a} counters.`, `Cross out ${b}.`, `Count the ones that are left: ${d}.`, R`Check with addition: \(${d} + ${b} = ${a}\).`],
    rule: 3,
    skill: 'facts within 10',
    check: () => (d + b === a ? true : 'difference does not add back'),
  });
}

function easyDoubles(rng) {
  const n = rng.int(1, 10);
  return q({
    prompt: R`What is the double \(${n} + ${n}\)?`,
    visual: { type: 'counters', groups: [n, n], perRow: n, alt: `Two equal rows, each with ${plural(n, 'counter')}.` },
    correct: 2 * n,
    wrong: [in20(2 * n + 1), 2 * n - 1, in20(2 * n + 2), 2 * n - 2, noted(n, 'A double has two equal groups. Count both rows.')],
    solution: [`A double is two equal groups of ${n}.`, R`\(${n} + ${n} = ${2 * n}\).`],
    rule: 2,
    skill: 'doubles',
    check: () => ((2 * n) / 2 === n ? true : 'not a double'),
  });
}

function easyStory(rng) {
  const kind = rng.pick(['join', 'together', 'take']);
  if (kind === 'take') {
    const a = rng.int(4, 10);
    return resultStory(rng, kind, a, rng.int(2, a - 2));
  }
  const a = rng.int(2, 8);
  return resultStory(rng, kind, a, rng.int(2, 10 - a));
}

// ───────────── Medium: facts that cross ten ─────────────

function makeTenSteps(a, b) {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const need = 10 - big;
  const rest = small - need;
  return [
    a === b ? `Start with ${big}.` : `Start with the bigger number, ${big}.`,
    `${big} needs ${need} more to make 10.`,
    `Break ${small} into ${need} and ${rest}.`,
    R`\(${big} + ${need} = 10\). Then \(10 + ${rest} = ${a + b}\).`,
  ];
}

function mediumMakeTen(rng) {
  const a = rng.int(2, 9);
  const b = rng.int(11 - a, 9);
  const sum = a + b;
  const small = Math.min(a, b);
  return q({
    prompt: R`What is \(${a} + ${b}\)? Make a ten to help.`,
    visual: frames(a, b),
    correct: sum,
    wrong: [
      noted(10 + small, `Part of the ${small} was used to make ten. Add only what is left.`),
      noted(sum - 10, 'Remember the ten you made.'),
      sum - 1,
      in20(sum + 1),
      sum - 2,
    ],
    solution: makeTenSteps(a, b),
    rule: 1,
    skill: 'making ten',
    check: () => (sum - a === b && sum > 10 ? true : 'sum does not undo'),
  });
}

function mediumNearDouble(rng) {
  const n = rng.int(3, 9);
  const flip = rng.bool();
  const sum = 2 * n + 1;
  return q({
    prompt: flip ? R`What is \(${n + 1} + ${n}\)? Use a double to help.` : R`What is \(${n} + ${n + 1}\)? Use a double to help.`,
    correct: sum,
    wrong: [
      noted(2 * n, `That is the double \\(${n} + ${n}\\). ${n + 1} is one more than ${n}, so add 1 more.`),
      noted(2 * n + 2, `That is the double \\(${n + 1} + ${n + 1}\\). ${n} is one less than ${n + 1}, so take 1 away.`),
      sum - 2,
      in20(sum + 2),
    ],
    solution: [`${n} and ${n + 1} are one apart.`, R`Use the double \(${n} + ${n} = ${2 * n}\).`, R`Add 1 more: \(${2 * n} + 1 = ${sum}\).`],
    rule: 2,
    skill: 'near doubles',
    check: () => (sum - n === n + 1 ? true : 'sum does not undo'),
  });
}

function mediumSubtract(rng) {
  const a = rng.int(11, 18);
  const b = rng.int(a - 9, 9);
  const d = a - b;
  const toTen = 10 - b;
  const past = a - 10;
  return q({
    prompt: R`What is \(${a} - ${b}\)? Think: ${b} plus what makes ${a}?`,
    visual: hops(b, [toTen, past]),
    correct: d,
    wrong: [
      noted(d + 1, 'When you count up, do not count the starting number.'),
      d - 1,
      noted(a + b, 'This adds. The minus sign means take away.'),
      d + 2,
      d - 2,
    ],
    solution: [
      `Think: ${b} plus what makes ${a}?`,
      R`Jump to ten: \(${b} + ${toTen} = 10\).`,
      R`Jump to ${a}: \(10 + ${past} = ${a}\).`,
      R`The jumps are \(${toTen} + ${past} = ${d}\). So \(${a} - ${b} = ${d}\).`,
    ],
    rule: 3,
    skill: 'subtracting from teens',
    check: () => (d + b === a ? true : 'difference does not add back'),
  });
}

function mediumFactFamily(rng) {
  for (;;) {
    const a = rng.int(3, 11);
    const b = rng.int(2, 9);
    const s = a + b;
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    if (a === b || s > 18 || big - small === small) continue;
    const correct = rng.pick([R`\(${s} - ${a} = ${b}\)`, R`\(${s} - ${b} = ${a}\)`, R`\(${b} + ${a} = ${s}\)`]);
    // A true fact that uses a number from outside the family.
    const outside = s + small <= 20 ? [s, '+', small, s + small] : [small, '+', small, 2 * small];
    return q({
      prompt: R`\(${a} + ${b} = ${s}\). Which fact is in the same fact family?`,
      correct,
      wrong: [
        { value: R`\(${big} - ${small} = ${big - small}\)`, why: `This fact is true. But ${big - small} is not a family number.` },
        { value: R`\(${outside[0]} ${outside[1]} ${outside[2]} = ${outside[3]}\)`, why: `This fact is true. But ${outside[3]} is not a family number.` },
        R`\(${a + 1} + ${b} = ${s + 1}\)`,
        R`\(${s} - 1 = ${s - 1}\)`,
      ],
      solution: [`The family uses only ${a}, ${b} and ${s}.`, R`Its facts are \(${a} + ${b} = ${s}\), \(${b} + ${a} = ${s}\), \(${s} - ${a} = ${b}\) and \(${s} - ${b} = ${a}\).`, `The matching fact is ${correct}.`],
      rule: 4,
      skill: 'fact families',
      check: () => {
        const family = [a, b, s];
        if (s - a !== b || s - b !== a) return 'family numbers do not fit';
        if (family.includes(big - small) || family.includes(outside[3]) || outside[3] > 20) return 'a wrong fact uses only family numbers';
        return true;
      },
    });
  }
}

function mediumStory(rng) {
  const kind = rng.pick(['join', 'together', 'take']);
  if (kind === 'take') {
    const a = rng.int(11, 18);
    return resultStory(rng, kind, a, rng.int(a - 9, 9));
  }
  const a = rng.int(3, 9);
  return resultStory(rng, kind, a, rng.int(11 - a, 9));
}

// ───────────── Hard: a missing number; comparing ─────────────

function hardMissingAddend(rng) {
  const a = rng.int(3, 12);
  const x = rng.int(2, 9);
  const t = a + x;
  if (t < 11 || t > 20) return hardMissingAddend(rng);
  const first = rng.bool();
  return q({
    prompt: first ? R`What number goes in the box? \(\;\square + ${a} = ${t}\)` : R`What number goes in the box? \(\;${a} + \square = ${t}\)`,
    correct: x,
    wrong: [
      noted(t, `${t} is the total. The box is the part that is missing.`),
      noted(t + a, `This adds ${a} and ${t}. The box is a part, so it is smaller than ${t}.`),
      x + 1,
      x - 1,
      x + 2,
    ],
    solution: [`The total is ${t}. One part is ${a}. Find the other part.`, R`Subtract: \(${t} - ${a} = ${x}\).`, R`Check: \(${a} + ${x} = ${t}\).`],
    rule: 3,
    skill: 'missing number',
    check: () => (a + x === t ? true : 'box value does not fit'),
  });
}

function hardMissingSubtract(rng) {
  const d = rng.int(2, 9);
  const b = rng.int(3, 9);
  const a = d + b;
  if (a < 11) return hardMissingSubtract(rng);
  if (rng.bool()) {
    return q({
      prompt: R`What number goes in the box? \(\;${a} - \square = ${d}\)`,
      correct: b,
      wrong: [noted(a + d, `Taking away makes ${a} smaller. The box must be less than ${a}.`), b + 1, b - 1, b + 2, b - 2],
      solution: [`${a} is the whole. One part is ${d}. The box is the other part.`, R`Subtract: \(${a} - ${d} = ${b}\).`, R`Check: \(${a} - ${b} = ${d}\).`],
      rule: 4,
      skill: 'missing number',
      check: () => (a - b === d ? true : 'box value does not fit'),
    });
  }
  return q({
    prompt: R`What number goes in the box? \(\;\square - ${b} = ${d}\)`,
    correct: a,
    wrong: [
      noted(Math.abs(d - b), `The box is the starting number. It must be bigger than ${b}. Add ${d} and ${b}.`),
      a - 1,
      in20(a + 1),
      a - 2,
      in20(a + 2),
    ],
    solution: [`The box is the whole. Its parts are ${b} and ${d}.`, R`Add the parts: \(${d} + ${b} = ${a}\).`, R`Check: \(${a} - ${b} = ${d}\).`],
    rule: 4,
    skill: 'missing number',
    check: () => (a - b === d ? true : 'box value does not fit'),
  });
}

function hardCompare(rng) {
  const b = rng.int(3, 12);
  const d = rng.int(2, 9);
  const a = b + d;
  if (a > 20) return hardCompare(rng);
  const [p1, p2] = people(rng, 2);
  const [, many] = rng.pick(TOYS);
  const more = rng.bool();
  return q({
    prompt: `${p1} has ${a} ${many}. ${p2} has ${b} ${many}. ${more ? `How many more ${many} does ${p1} have?` : `How many fewer ${many} does ${p2} have?`}`,
    visual: compareBars(p1, a, p2, b),
    correct: d,
    wrong: [noted(a + b, 'This joins the two groups. To compare, find the difference.'), noted(a, `${a} is how many ${p1} has. The question asks for the gap.`), d + 1, d - 1, d + 2],
    solution: ['Two groups are compared. Find the difference.', R`Subtract the smaller number from the bigger: \(${a} - ${b} = ${d}\).`, more ? `${p1} has ${d} more.` : `${p2} has ${d} fewer.`],
    rule: 5,
    skill: 'comparing',
    check: () => (b + d === a ? true : 'difference does not add back'),
  });
}

function hardChangeStory(rng) {
  const name = person(rng);
  const [, many] = rng.pick(TOYS);
  if (rng.bool()) {
    const a = rng.int(4, 9);
    const x = rng.int(11 - a, 9);
    const t = a + x;
    return q({
      prompt: `${name} had ${a} ${many}. ${name} got some more. Now ${name} has ${t}. How many ${many} did ${name} get?`,
      correct: x,
      wrong: [noted(t, `${t} is how many ${name} has now. Find how many were added.`), noted(a + t, 'The number that was added is smaller than the total.'), x + 1, x - 1, x + 2],
      solution: [R`We know the start and the end: \(${a} + \square = ${t}\).`, R`Find the missing part: \(${t} - ${a} = ${x}\).`, `${name} got ${x} more.`],
      rule: 3,
      skill: 'word problems',
      check: () => (a + x === t ? true : 'change does not fit'),
    });
  }
  const a = rng.int(11, 18);
  const x = rng.int(a - 9, 9);
  const left = a - x;
  const snack = rng.pick(SNACKS);
  return q({
    prompt: `${name} had ${a} ${snack}. ${name} ate some. Now ${left} are left. How many ${snack} did ${name} eat?`,
    correct: x,
    wrong: [noted(a + left, 'Eating makes the number smaller. Subtract to find the part eaten.'), noted(left, `${left} is how many are left. Find how many were eaten.`), x + 1, x - 1, x + 2],
    solution: [R`We know the start and the end: \(${a} - \square = ${left}\).`, R`Find the missing part: \(${a} - ${left} = ${x}\).`, `${name} ate ${x}.`],
    rule: 3,
    skill: 'word problems',
    check: () => (a - x === left ? true : 'change does not fit'),
  });
}

// ───────────── Challenge: three addends, two steps, balance, harder stories ─────────────

function challengeThree(rng) {
  const x = rng.int(1, 9);
  const c = rng.int(2, 9);
  const order = rng.shuffle([x, 10 - x, c]);
  const sum = 10 + c;
  return q({
    prompt: R`What is \(${order[0]} + ${order[1]} + ${order[2]}\)? Look for a pair that makes ten.`,
    correct: sum,
    wrong: [
      noted(order[0] + order[1], 'There are three numbers to add. This adds only two.'),
      noted(10, 'Ten is the pair. Add the last number too.'),
      sum - 1,
      in20(sum + 1),
      in20(sum + 2),
    ],
    solution: [R`Find the pair that makes ten: \(${x} + ${10 - x} = 10\).`, R`Add the last number: \(10 + ${c} = ${sum}\).`],
    rule: 1,
    skill: 'three addends',
    check: () => (order[0] + order[1] + order[2] === sum ? true : 'three addends do not match'),
  });
}

function challengeTwoStep(rng) {
  const start = rng.int(5, 12);
  const plus = rng.int(3, Math.min(8, 20 - start));
  const mid = start + plus;
  const minus = rng.intExcept(3, Math.min(9, mid - 2), [plus]);
  const end = mid - minus;
  const name = person(rng);
  const [, many] = rng.pick(TOYS);
  return q({
    prompt: `${name} had ${start} ${many}. ${name} got ${plus} more. Then ${name} gave ${minus} away. How many ${many} does ${name} have now?`,
    correct: end,
    wrong: [
      noted(mid, `This is after the first step. ${name} also gave ${minus} away.`),
      start !== minus ? noted(Math.abs(start - minus), `Do not skip the ${plus} that ${name} got.`) : null,
      end + 1,
      end - 1,
      end + 2,
    ],
    solution: [R`First step, more are added: \(${start} + ${plus} = ${mid}\).`, R`Second step, some are taken away: \(${mid} - ${minus} = ${end}\).`, `${name} has ${end} now.`],
    rule: 5,
    skill: 'two-step stories',
    check: () => (end + minus - plus === start ? true : 'steps do not undo'),
  });
}

function challengeBalance(rng) {
  for (;;) {
    const a = rng.int(3, 9);
    const b = rng.int(3, 9);
    const s = a + b;
    const c = rng.int(2, 9);
    const x = s - c;
    if (c === a || c === b || x < 1 || x === a || x === b) continue;
    const boxFirst = rng.bool();
    const right = boxFirst ? R`\square + ${c}` : R`${c} + \square`;
    return q({
      prompt: R`What number goes in the box? \(\;${a} + ${b} = ${right}\)`,
      correct: x,
      wrong: [
        noted(s, `${s} is the left side. The right side must equal ${s} too. It already has ${c}.`),
        noted(s + c, 'The equals sign means both sides are the same amount. It does not mean add everything.'),
        x + 1,
        x - 1,
        x + 2,
      ],
      solution: [R`Find the left side: \(${a} + ${b} = ${s}\).`, `Both sides must be the same amount. So the right side is ${s} too.`, R`\(${s} - ${c} = ${x}\), so the box is ${x}.`, R`Check: \(${x} + ${c} = ${s}\).`],
      rule: 4,
      skill: 'equal sign',
      check: () => (a + b === x + c ? true : 'sides do not balance'),
    });
  }
}

function challengeCompareStory(rng) {
  const small = rng.int(3, 11);
  const d = rng.int(2, 9);
  const big = small + d;
  if (big > 20) return challengeCompareStory(rng);
  const [p1, p2] = people(rng, 2); // p1 has the bigger amount
  const [, many] = rng.pick(TOYS);
  const kind = rng.pick(['bigMore', 'smallFewer', 'smallMore', 'bigFewer']);
  const bars = (unknownBig) => ({
    type: 'barModel',
    rows: [
      { label: p1, parts: [{ value: big, label: unknownBig ? '?' : `${big}` }] },
      { label: p2, parts: [{ value: small, label: unknownBig ? `${small}` : '?' }, { value: d, label: `${d}`, shade: 'none' }] },
    ],
    alt: `Two bars. The bar for ${p1} is longer. The bar for ${p2} is shorter by ${d}.`,
  });
  if (kind === 'bigMore' || kind === 'bigFewer') {
    return q({
      prompt: kind === 'bigMore'
        ? `${p2} has ${small} ${many}. ${p1} has ${d} more ${many} than ${p2}. How many ${many} does ${p1} have?`
        : `${p2} has ${small} ${many}. ${p2} has ${d} fewer ${many} than ${p1}. How many ${many} does ${p1} have?`,
      visual: bars(true),
      correct: big,
      wrong: [noted(small - d > 0 ? small - d : null, `${p1} has the bigger amount. Add ${d} to ${small}.`), noted(d, `${d} is the gap between them. ${p1} has ${small} and ${d} more.`), big - 1, in20(big + 1), big - 2],
      solution: [`${p1} has the bigger amount. The gap is ${d}.`, R`Add the gap to the smaller amount: \(${small} + ${d} = ${big}\).`, `${p1} has ${big}.`],
      rule: 5,
      skill: 'comparing',
      check: () => (big - small === d ? true : 'gap does not match'),
    });
  }
  return q({
    prompt: kind === 'smallFewer'
      ? `${p1} has ${big} ${many}. ${p2} has ${d} fewer ${many} than ${p1}. How many ${many} does ${p2} have?`
      : `${p1} has ${big} ${many}. ${p1} has ${d} more ${many} than ${p2}. How many ${many} does ${p2} have?`,
    visual: bars(false),
    correct: small,
    wrong: [noted(big + d, `${p2} has the smaller amount. Subtract ${d} from ${big}.`), noted(d, `${d} is the gap between them, not how many ${p2} has.`), small + 1, small - 1, small + 2],
    solution: [`${p2} has the smaller amount. The gap is ${d}.`, R`Subtract the gap from the bigger amount: \(${big} - ${d} = ${small}\).`, `${p2} has ${small}.`],
    rule: 5,
    skill: 'comparing',
    check: () => (small + d === big ? true : 'gap does not match'),
  });
}

function challengeStartStory(rng) {
  const name = person(rng);
  if (rng.bool()) {
    const x = rng.int(4, 11);
    const b = rng.int(3, 9);
    const t = x + b;
    if (t > 20 || t < 11) return challengeStartStory(rng);
    return q({
      prompt: `Some birds sat on a fence. ${b} more birds came. Now there are ${t} birds. How many birds were there at first?`,
      correct: x,
      wrong: [noted(t + b, `There were fewer birds at first. Take the ${b} new birds away from ${t}.`), noted(t, `${t} is how many there are now.`), x + 1, x - 1, x + 2],
      solution: [R`The start is missing: \(\square + ${b} = ${t}\).`, R`Take away the birds that came: \(${t} - ${b} = ${x}\).`, R`Check: \(${x} + ${b} = ${t}\).`],
      rule: 3,
      skill: 'word problems',
      check: () => (x + b === t ? true : 'start does not fit'),
    });
  }
  const b = rng.int(3, 9);
  const left = rng.int(3, 9);
  const x = b + left;
  if (x < 11) return challengeStartStory(rng);
  const snack = rng.pick(SNACKS);
  return q({
    prompt: `${name} had some ${snack}. ${name} ate ${b}. Now ${left} are left. How many ${snack} did ${name} have at first?`,
    correct: x,
    wrong: [b !== left ? noted(Math.abs(left - b), `${name} had more at first. Put the ${b} eaten back with the ${left} left.`) : null, noted(left, `${left} is how many are left now.`), x - 1, in20(x + 1), x - 2],
    solution: [R`The start is missing: \(\square - ${b} = ${left}\).`, R`Put the parts back together: \(${left} + ${b} = ${x}\).`, R`Check: \(${x} - ${b} = ${left}\).`],
    rule: 3,
    skill: 'word problems',
    check: () => (x - b === left ? true : 'start does not fit'),
  });
}

function challengeSameValue(rng) {
  const a = rng.int(4, 9);
  const b = rng.int(4, 9);
  const s = a + b;
  const up = rng.bool();
  const good = up ? R`\(${a + 1} + ${b - 1}\)` : R`\(${a - 1} + ${b + 1}\)`;
  return q({
    prompt: R`Which one has the same value as \(${a} + ${b}\)?`,
    correct: good,
    wrong: [
      { value: R`\(${a + 1} + ${b}\)`, why: 'One number went up by 1. The other must go down by 1 to keep the total.' },
      { value: R`\(${a + 1} + ${b + 1}\)`, why: 'Both numbers went up, so the total is 2 bigger.' },
      R`\(${a} + ${b - 1}\)`,
      R`\(${a - 1} + ${b - 1}\)`,
    ],
    solution: [R`\(${a} + ${b} = ${s}\).`, up ? `Move 1 from ${b} to ${a}. The total does not change.` : `Move 1 from ${a} to ${b}. The total does not change.`, R`${good} is also ${s}.`],
    rule: 1,
    skill: 'equal sign',
    check: () => ((up ? a + 1 + b - 1 : a - 1 + b + 1) === s ? true : 'expressions differ'),
  });
}

// ───────────── Interactive models ─────────────

function addSteps(a, b) {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const sum = a + b;
  if (small === 0) return ['Adding 0 changes nothing.', R`\(${a} + ${b} = ${sum}\).`];
  if (big === 10) return [`10 and ${small} more is ${sum}.`, R`\(${a} + ${b} = ${sum}\).`];
  if (sum <= 10) return [a === b ? `Start at ${big}.` : `Start at the bigger number, ${big}.`, `Count on ${small} more: ${countList(big, small)}.`, R`\(${a} + ${b} = ${sum}\).`];
  return makeTenSteps(a, b);
}

function subtractSteps(a, b) {
  const d = a - b;
  if (b === 0) return ['Taking away 0 changes nothing.', R`\(${a} - 0 = ${a}\).`];
  if (d === 0) return [`Take away all ${a}. Nothing is left.`, R`\(${a} - ${b} = 0\).`];
  const steps = [`Think: ${b} plus what makes ${a}?`];
  if (b < 10 && a > 10) {
    steps.push(R`Jump to ten: \(${b} + ${10 - b} = 10\).`);
    steps.push(R`Jump to ${a}: \(10 + ${a - 10} = ${a}\).`);
    steps.push(R`The jumps are \(${10 - b} + ${a - 10} = ${d}\).`);
  } else {
    steps.push(d <= 4 ? `Count up from ${b}: ${countList(b, d)}. That is ${d} ${d === 1 ? 'count' : 'counts'}.` : R`\(${b} + ${d} = ${a}\).`);
  }
  steps.push(R`So \(${a} - ${b} = ${d}\).`);
  return steps;
}

export default {
  id: 'add-sub-20',
  title: 'Adding & Subtracting Within 20',
  summary: 'Add and subtract numbers up to 20 by counting on, making ten, using doubles and fact families.',
  grade: 'Grades 1–2',
  standards: ['CCSS 1.OA.A.1', 'CCSS 1.OA.B.4', 'CCSS 1.OA.C.6', 'CCSS 2.OA.B.2'],

  explain: {
    intro: 'Adding puts groups together. Subtracting takes some away. It also tells how many more one group has. Here are smart ways to work with numbers up to 20.',
    rules: [
      {
        title: 'Count on from the bigger number',
        text: 'Start at the bigger number. Count up once for each one you add.',
        example: R`\(3 + 9\): start at 9. Count on 3 more: 10, 11, 12. So \(3 + 9 = 12\).`,
      },
      {
        title: 'Make a ten',
        text: 'Ten is a friendly number. Break one number apart to fill a ten. Then add what is left.',
        example: R`\(8 + 5\): 8 needs 2 more to make 10. Break 5 into 2 and 3. \(8 + 2 = 10\), then \(10 + 3 = 13\).`,
      },
      {
        title: 'Use doubles',
        text: 'A double is a number added to itself. If two numbers are one apart, use a double. Then add 1 more.',
        example: R`\(6 + 7\): the double is \(6 + 6 = 12\). One more makes \(13\).`,
      },
      {
        title: 'To subtract, think addition',
        text: 'Subtraction finds a missing part. Ask: what do I add to get the whole?',
        example: R`\(13 - 8\): think "8 plus what makes 13?" \(8 + 5 = 13\), so \(13 - 8 = 5\).`,
      },
      {
        title: 'Fact families',
        text: 'A whole and its two parts make four facts. Know one fact and you know them all. The equals sign means both sides are the same amount.',
        example: R`8, 5 and 13: \(8 + 5 = 13\), \(5 + 8 = 13\), \(13 - 8 = 5\), \(13 - 5 = 8\).`,
      },
      {
        title: 'Stories: picture what happens',
        text: 'Groups are joined: add. Some are taken away: subtract. Two groups are compared: subtract to find the difference.',
        example: R`Mia has 12 stickers. Leo has 7. Mia has \(12 - 7 = 5\) more.`,
      },
    ],
    vocab: [
      { term: 'sum', def: 'The answer when you add.' },
      { term: 'difference', def: 'The answer when you subtract. It tells how far apart two numbers are.' },
      { term: 'addend', def: 'A number that is added.' },
      { term: 'double', def: R`A number added to itself, like \(6 + 6\).` },
      { term: 'fact family', def: 'The adding and subtracting facts made from the same three numbers.' },
    ],
    mistakes: [
      R`Counting the starting number again. For \(9 + 3\), say 10, 11, 12. Do not start by saying 9.`,
      R`Losing part of a number when making ten. In \(8 + 5\), the 5 breaks into 2 and 3. Use both parts.`,
      'Adding the two groups in a comparing story. To compare, find the difference.',
      'Thinking the equals sign means "write the answer". It means both sides are the same amount.',
    ],
    visual: { type: 'counters', frame: true, groups: [8, 5], alt: 'Two ten-frames show 8 plus 5. The first frame is full: 8 blue counters and 2 orange. The second frame has 3 orange. That is 10 and 3 more, 13.' },
  },

  examples: [
    {
      title: 'Count on',
      problem: R`Find \(7 + 4\).`,
      steps: ['Start at the bigger number, 7.', 'Count on 4 more: 8, 9, 10, 11.', R`So \(7 + 4 = 11\).`],
      answer: R`\(11\)`,
      visual: hops(7, [1, 1, 1, 1], 4, 14),
    },
    {
      title: 'Make a ten',
      problem: R`Find \(9 + 6\).`,
      steps: ['9 needs 1 more to make 10.', 'Break 6 into 1 and 5.', R`\(9 + 1 = 10\).`, R`\(10 + 5 = 15\).`],
      answer: R`\(15\)`,
      visual: frames(9, 6),
    },
    {
      title: 'Use a double',
      problem: R`Find \(7 + 8\).`,
      steps: [R`7 and 8 are one apart. Use the double \(7 + 7 = 14\).`, '8 is one more than 7, so add 1 more.', R`\(14 + 1 = 15\).`],
      answer: R`\(15\)`,
    },
    {
      title: 'Think addition to subtract',
      problem: R`Find \(14 - 9\).`,
      steps: ['Think: 9 plus what makes 14?', R`Jump to ten: \(9 + 1 = 10\).`, R`Jump to 14: \(10 + 4 = 14\).`, R`The jumps are \(1 + 4 = 5\). So \(14 - 9 = 5\).`],
      answer: R`\(5\)`,
      visual: hops(9, [1, 4]),
    },
    {
      title: 'Word problem: comparing',
      word: true,
      problem: 'Mia has 12 stickers. Leo has 7 stickers. How many more stickers does Mia have?',
      steps: ['Two groups are compared. We need the difference.', R`Subtract the smaller number from the bigger: \(12 - 7\).`, R`Think: 7 plus what makes 12? \(7 + 5 = 12\).`, 'Mia has 5 more stickers.'],
      answer: '5 more stickers',
      visual: compareBars('Mia', 12, 'Leo', 7),
    },
    {
      title: 'Word problem: a missing part',
      word: true,
      problem: 'Sam had 6 shells. Sam found some more. Now Sam has 13 shells. How many shells did Sam find?',
      steps: [R`We know the start and the end. The change is missing: \(6 + \square = 13\).`, R`Count up from 6 to 13: \(6 + 4 = 10\), then \(10 + 3 = 13\).`, R`\(4 + 3 = 7\), so Sam found 7 shells.`],
      answer: '7 shells',
    },
  ],

  models: [
    {
      id: 'add-two',
      title: 'Add two numbers',
      intro: 'Pick two numbers. See the counters fill the ten-frames.',
      inputs: [
        { name: 'a', label: 'First number', type: 'int', min: 0, max: 10, value: 8 },
        { name: 'b', label: 'Second number', type: 'int', min: 0, max: 10, value: 5 },
      ],
      compute({ a, b }) {
        return {
          problem: R`\(${a} + ${b}\)`,
          steps: addSteps(a, b),
          answer: R`\(${a + b}\)`,
          visual: frames(a, b),
        };
      },
    },
    {
      id: 'take-away',
      title: 'Subtract by thinking addition',
      intro: 'Pick a number to start with. Then pick how many to take away.',
      inputs: [
        { name: 'a', label: 'Start with', type: 'int', min: 0, max: 20, value: 13 },
        { name: 'b', label: 'Take away', type: 'int', min: 0, max: 20, value: 8 },
      ],
      compute({ a, b }) {
        if (b > a) return { error: `You cannot take ${b} away from ${a} here. Make the first number bigger.` };
        return {
          problem: R`\(${a} - ${b}\)`,
          steps: subtractSteps(a, b),
          answer: R`\(${a - b}\)`,
          visual: crossedOut(a, b, true),
        };
      },
    },
    {
      id: 'who-has-more',
      title: 'Word problem: who has more?',
      word: true,
      intro: 'Change how many stickers each child has.',
      inputs: [
        { name: 'a', label: 'Stickers Maya has', type: 'int', min: 0, max: 20, value: 15 },
        { name: 'b', label: 'Stickers Omar has', type: 'int', min: 0, max: 20, value: 9 },
      ],
      compute({ a, b }) {
        const problem = `Maya has ${plural(a, 'sticker')}. Omar has ${plural(b, 'sticker')}. Who has more? How many more?`;
        if (a === b) {
          return { problem, steps: ['Compare the two numbers.', `${a} and ${b} are the same.`, R`The difference is \(${a} - ${b} = 0\).`], answer: 'They have the same number.' };
        }
        const [bigName, big, smallName, small] = a > b ? ['Maya', a, 'Omar', b] : ['Omar', b, 'Maya', a];
        const d = big - small;
        return {
          problem,
          steps: [`${big} is more than ${small}, so ${bigName} has more.`, R`To find how many more, subtract: \(${big} - ${small}\).`, ...subtractSteps(big, small).slice(small === 0 ? 0 : 1), `${bigName} has ${d} more.`],
          answer: `${bigName} has ${d} more ${d === 1 ? 'sticker' : 'stickers'}.`,
          visual: small > 0 ? compareBars(bigName, big, smallName, small) : undefined,
        };
      },
    },
  ],

  quiz: {
    easy: [easyAdd, easyCountOn, easySubtract, easyDoubles, easyStory],
    medium: [mediumMakeTen, mediumNearDouble, mediumSubtract, mediumFactFamily, mediumStory],
    hard: [hardMissingAddend, hardMissingSubtract, hardCompare, hardChangeStory],
    challenge: [challengeThree, challengeTwoStep, challengeBalance, challengeCompareStory, challengeStartStory, challengeSameValue],
  },
};
