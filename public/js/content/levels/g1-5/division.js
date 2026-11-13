import { R, q, person, plural } from '../../lib/index.js';
import { GROUPS, ROWS } from './_shared.js';

const D = (a, b) => R`\(${a} \div ${b}\)`;
const skipList = (n, times) => Array.from({ length: times }, (_, i) => n * (i + 1)).join(', ');
const withRemainder = (quotient, r) => `${quotient} remainder ${r}`;

// One row of counters for each equal group; any left over are drawn in a second colour.
function sharePic(groups, each, left = 0) {
  return {
    type: 'counters',
    groups: [...Array(groups).fill({ count: each, color: 'a' }), ...(left ? [{ count: left, color: 'b' }] : [])],
    perRow: each,
    alt: `${groups} rows of ${each} counters${left ? `, and ${left} more in another colour` : ''}.`,
  };
}

// The multiples of d up to the first one that is too big: "4 × 7 = 28 fits. 4 × 8 = 32 is too big."
function fitSteps(n, d) {
  const k = Math.floor(n / d);
  return [
    `Find the biggest multiple of ${d} that fits in ${n}.`,
    R`\(${d} \times ${k} = ${d * k}\) fits. \(${d} \times ${k + 1} = ${d * (k + 1)}\) is too big.`,
    R`Subtract to find what is left: \(${n} - ${d * k} = ${n - d * k}\).`,
  ];
}

// ───────────── Easy: sharing and grouping ─────────────

function easyShare(rng) {
  const g = rng.int(2, 5);
  const n = rng.int(2, 6);
  const total = g * n;
  return q({
    prompt: `${total} counters are shared equally into ${g} groups. How many counters are in each group?`,
    visual: sharePic(g, n),
    correct: n,
    wrong: [{ value: total - g, why: 'Sharing equally is dividing, not taking away.' }, g !== n ? { value: g, why: `${g} is the number of groups. Count how many are in one group.` } : null, n + 1, n - 1, n + 2],
    solution: [`Deal the counters out, one at a time, until all ${total} are used.`, `Each group gets ${n}.`, R`\(${total} \div ${g} = ${n}\), because \(${g} \times ${n} = ${total}\).`],
    rule: 0,
    skill: 'sharing',
    check: () => (g * n === total ? true : 'groups do not rebuild the total'),
  });
}

function easyGroupsOf(rng) {
  const g = rng.int(2, 6);
  const n = rng.int(2, 5);
  const total = g * n;
  return q({
    prompt: `${total} counters are put into groups of ${n}. How many groups are there?`,
    visual: sharePic(g, n),
    correct: g,
    wrong: [{ value: total - n, why: 'Making equal groups is dividing, not taking away.' }, g !== n ? { value: n, why: `${n} is how many are in each group. Count the groups.` } : null, g + 1, g - 1, g + 2],
    solution: [`Make groups of ${n} until all ${total} are used.`, `Skip count by ${n}: ${skipList(n, g)}. That is ${g} groups.`, R`\(${total} \div ${n} = ${g}\).`],
    rule: 0,
    skill: 'grouping',
    check: () => (g * n === total ? true : 'groups do not rebuild the total'),
  });
}

function easyFacts(rng) {
  const d = rng.pick([2, 5, 10]);
  const k = rng.int(2, 10);
  const n = d * k;
  return q({
    prompt: `What is ${D(n, d)}?`,
    correct: k,
    wrong: [{ value: n - d, why: `This takes ${d} away once. Dividing asks how many ${d}s are in ${n}.` }, k + 1, k - 1, k !== d ? d : k + 2],
    solution: [`Skip count by ${d} until you reach ${n}: ${skipList(d, k)}.`, `That took ${k} jumps.`, R`\(${n} \div ${d} = ${k}\).`],
    rule: 1,
    skill: 'facts for 2, 5 and 10',
    check: () => (k * d === n ? true : 'quotient does not multiply back'),
  });
}

function shareStory(rng, total, g) {
  const { item } = rng.pick(GROUPS);
  const name = person(rng);
  return {
    text: `${name} shares ${total} ${item[1]} equally among ${g} friends. How many ${item[1]} does each friend get?`,
    lead: `${total} is shared into ${g} equal groups, so divide.`,
  };
}

function groupStory(rng, total, n) {
  const { box, item, prep } = rng.pick(GROUPS);
  const name = person(rng);
  return {
    text: `${name} has ${total} ${item[1]}. ${name} puts ${n} ${prep} each ${box[0]}. How many ${box[1]} does ${name} fill?`,
    lead: `${total} is put into groups of ${n}, so divide.`,
  };
}

function rowStory(rng, total, rows) {
  const [things, place] = rng.pick(ROWS);
  return { text: `${place} has ${total} ${things} in ${rows} equal rows. How many ${things} are in each row?`, lead: `${total} is split into ${rows} equal rows, so divide.` };
}

function storyQuestion(rng, d, k) {
  const n = d * k;
  const s = rng.pick([shareStory, groupStory, rowStory])(rng, n, d);
  return q({
    prompt: s.text,
    correct: k,
    wrong: [{ value: n - d, why: 'This subtracts. The story makes equal groups, so divide.' }, k !== d ? { value: d, why: `${d} is already in the story. Find the other number.` } : null, k + 1, k - 1, k + 2],
    solution: [s.lead, R`Think: \(${d} \times ${k} = ${n}\).`, R`So \(${n} \div ${d} = ${k}\).`],
    rule: 0,
    skill: 'word problems',
    check: () => (k * d === n ? true : 'quotient does not multiply back'),
  });
}

function easyStory(rng) {
  return storyQuestion(rng, rng.int(2, 5), rng.int(2, 5));
}

// ───────────── Medium: facts to 100, missing numbers ─────────────

function mediumFacts(rng) {
  const d = rng.int(3, 9);
  const k = rng.int(3, 9);
  const n = d * k;
  return q({
    prompt: `What is ${D(n, d)}?`,
    correct: k,
    wrong: [{ value: n - d, why: `This subtracts. Ask: ${d} times what makes ${n}?` }, k + 1, k - 1, k !== d ? d : k + 2, k + 2],
    solution: [`Ask: ${d} times what number makes ${n}?`, R`\(${d} \times ${k} = ${n}\).`, R`So \(${n} \div ${d} = ${k}\).`],
    rule: 1,
    skill: 'facts to 100',
    check: () => (k * d === n ? true : 'quotient does not multiply back'),
  });
}

function mediumThink(rng) {
  const d = rng.int(3, 9);
  const k = rng.intExcept(3, 9, [d]);
  const n = d * k;
  return q({
    prompt: `Which multiplication fact helps you find ${D(n, d)}?`,
    correct: R`\(${d} \times ${k} = ${n}\)`,
    wrong: [
      { value: R`\(${d} \times ${n} = ${d * n}\)`, why: `${n} is the total. Look for a fact with a product of ${n}.` },
      { value: R`\(${d} + ${n - d} = ${n}\)`, why: 'This is an addition fact. Division undoes multiplication.' },
      R`\(${d} \times ${k + 1} = ${d * (k + 1)}\)`,
      R`\(${k} \times ${k} = ${k * k}\)`,
    ],
    solution: [`${D(n, d)} asks: ${d} times what number makes ${n}?`, R`The fact is \(${d} \times ${k} = ${n}\).`, R`So \(${n} \div ${d} = ${k}\).`],
    rule: 1,
    skill: 'think multiplication',
    check: () => (d * k === n && k * k !== n ? true : 'fact does not fit'),
  });
}

function mediumMissing(rng) {
  const d = rng.int(3, 9);
  const k = rng.intExcept(3, 9, [d]);
  const n = d * k;
  const kind = rng.pick(['factor', 'divisor', 'dividend']);
  if (kind === 'dividend') {
    return q({
      prompt: R`What number goes in the box? \(\;\square \div ${d} = ${k}\)`,
      correct: n,
      wrong: [{ value: d + k, why: 'The box is the total. Multiply the two numbers to get it.' }, { value: Math.abs(k - d), why: `The box is split into ${d} groups of ${k}. It is bigger than both numbers.` }, n + d, n - d, n + 1],
      solution: [`The box is shared into ${d} groups with ${k} in each.`, R`Multiply to find the total: \(${d} \times ${k} = ${n}\).`, R`Check: \(${n} \div ${d} = ${k}\).`],
      rule: 2,
      skill: 'missing number',
      check: () => (n / d === k ? true : 'box value does not fit'),
    });
  }
  return q({
    prompt: kind === 'factor' ? R`What number goes in the box? \(\;\square \times ${d} = ${n}\)` : R`What number goes in the box? \(\;${n} \div \square = ${d}\)`,
    correct: k,
    wrong: [
      { value: n - d, why: kind === 'factor' ? `The box is multiplied by ${d}, not added. Divide ${n} by ${d}.` : `Dividing is not taking away. Ask: ${n} split into how many groups gives ${d} in each?` },
      { value: d, why: `${d} is already there. The box is the other number in the fact family.` },
      k + 1,
      k - 1,
      k + 2,
    ],
    solution: [R`Use the fact family of \(${k} \times ${d} = ${n}\).`, R`\(${n} \div ${d} = ${k}\), so the box is ${k}.`, kind === 'factor' ? R`Check: \(${k} \times ${d} = ${n}\).` : R`Check: \(${n} \div ${k} = ${d}\).`],
    rule: 2,
    skill: 'missing number',
    check: () => ((kind === 'factor' ? k * d === n : n / k === d) ? true : 'box value does not fit'),
  });
}

function mediumStory(rng) {
  const d = rng.int(3, 9);
  return storyQuestion(rng, d, rng.intExcept(3, 9, [d]));
}

// ───────────── Hard: remainders and what they mean ─────────────

function remainderParts(rng) {
  const d = rng.int(3, 9);
  const k = rng.int(2, 9);
  const r = rng.int(1, d - 1);
  return { d, k, r, n: d * k + r };
}

function hardRemainder(rng) {
  const { d, k, r, n } = remainderParts(rng);
  return q({
    prompt: `What is ${D(n, d)}?`,
    visual: r <= k ? sharePic(d, k, r) : undefined,
    correct: withRemainder(k, r),
    wrong: [
      { value: withRemainder(k - 1, r + d), why: `A remainder of ${r + d} is too big. Another group of ${d} can be made.` },
      d - r !== r ? { value: withRemainder(k, d - r), why: `${d - r} is how many more are needed for another group. The remainder is what is left over.` } : null,
      withRemainder(k + 1, r),
      withRemainder(k, r + 1 < d ? r + 1 : r - 1 || 2),
      withRemainder(k + 1, 0),
    ],
    solution: [...fitSteps(n, d), `${D(n, d)} is ${k} remainder ${r}.`],
    rule: 4,
    skill: 'remainders',
    check: () => (d * k + r === n && r > 0 && r < d ? true : 'quotient and remainder do not rebuild the number'),
  });
}

function hardLeftOver(rng) {
  const { d, k, r, n } = remainderParts(rng);
  const { item } = rng.pick(GROUPS);
  const name = person(rng);
  return q({
    prompt: `${name} shares ${n} ${item[1]} equally among ${d} friends. Each friend gets as many as possible. How many ${item[1]} are left over?`,
    correct: r,
    wrong: [
      k !== r ? { value: k, why: `${k} is how many each friend gets. The question asks what is left over.` } : null,
      d - r !== r ? { value: d - r, why: `${d - r} is how many more are needed for another round. Find what is left.` } : null,
      r + 1,
      r - 1,
      r + 2,
    ],
    solution: [...fitSteps(n, d), `Each friend gets ${k}. ${plural(r, item[0], item[1])} ${r === 1 ? 'is' : 'are'} left over.`],
    rule: 5,
    skill: 'remainder stories',
    check: () => (d * k + r === n && r < d ? true : 'quotient and remainder do not rebuild the number'),
  });
}

function hardFullGroups(rng) {
  const { d, k, r, n } = remainderParts(rng);
  const { box, item, prep } = rng.pick(GROUPS);
  const name = person(rng);
  return q({
    prompt: `${name} has ${n} ${item[1]}. ${name} puts ${d} ${prep} each ${box[0]}. How many ${box[1]} can ${name} fill?`,
    correct: k,
    wrong: [
      { value: k + 1, why: `The last ${box[0]} would have only ${r}. It is not full.` },
      r !== k ? { value: r, why: `${r} is how many ${item[1]} are left over. Count the full ${box[1]}.` } : null,
      k - 1,
      k + 2,
      n - d,
    ],
    solution: [...fitSteps(n, d), `${name} can fill ${plural(k, box[0], box[1])}. The ${r} left over do not fill another one.`],
    rule: 5,
    skill: 'remainder stories',
    check: () => (d * k <= n && n < d * (k + 1) ? true : 'wrong number of full groups'),
  });
}

const RIDES = [
  ['car', 'cars', 'children', (n, d) => `${n} children are going on a trip. Each car holds ${d} children. How many cars are needed?`],
  ['tent', 'tents', 'campers', (n, d) => `${n} campers need a place to sleep. Each tent sleeps ${d} campers. How many tents are needed?`],
  ['table', 'tables', 'guests', (n, d) => `${n} guests are coming to a party. Each table seats ${d} guests. How many tables are needed?`],
  ['boat', 'boats', 'people', (n, d) => `${n} people want to cross a lake. Each boat carries ${d} people. How many boats are needed?`],
];

function hardRoundUp(rng) {
  const { d, k, r, n } = remainderParts(rng);
  const [one, many, who, story] = rng.pick(RIDES);
  return q({
    prompt: story(n, d),
    correct: k + 1,
    wrong: [
      { value: k, why: `${plural(k, one, many)} ${k === 1 ? 'takes' : 'take'} only ${d * k} ${who}. ${r} ${r === 1 ? 'is' : 'are'} still left.` },
      r !== k + 1 ? { value: r, why: `${r} is how many ${who} are left after the full ${many}. They still need one.` } : null,
      k + 2,
      k - 1,
      k + 3,
    ],
    solution: [...fitSteps(n, d), `${plural(k, `full ${one}`, `full ${many}`)} ${k === 1 ? 'takes' : 'take'} ${d * k} ${who}. The other ${r} need one more.`, `${k + 1} ${many} are needed.`],
    rule: 5,
    skill: 'remainder stories',
    check: () => (d * (k + 1) >= n && d * k < n ? true : 'not the smallest number that fits everyone'),
  });
}

// ───────────── Challenge ─────────────

function challengeBackwards(rng) {
  const { d, k, r, n } = remainderParts(rng);
  return q({
    prompt: `A number is divided by ${d}. The answer is ${k} remainder ${r}. What is the number?`,
    correct: n,
    wrong: [
      { value: d * k, why: `That is ${d} groups of ${k}. Add the ${r} left over as well.` },
      { value: d + k + r, why: `${d} groups of ${k} means multiply. Then add the remainder.` },
      d * k + d,
      n + 1,
      d * r + k,
    ],
    solution: [`There are ${d} groups of ${k}, and ${r} left over.`, R`Multiply: \(${d} \times ${k} = ${d * k}\).`, R`Add the remainder: \(${d * k} + ${r} = ${n}\).`],
    rule: 4,
    skill: 'working backwards',
    check: () => (Math.floor(n / d) === k && n % d === r ? true : 'number does not divide back'),
  });
}

function challengeMissingDivisor(rng) {
  for (;;) {
    const x = rng.int(4, 9);
    const k = rng.int(3, 9);
    const r = rng.int(1, x - 1);
    const n = x * k + r;
    if ((n - r) % k !== 0 || k === x) continue;
    return q({
      prompt: R`What number goes in the box? \(\;${n} \div \square = ${k}\) remainder \(${r}\)`,
      correct: x,
      wrong: [
        { value: k, why: `${k} is the quotient. The box is the size of each group.` },
        { value: x + 1, why: `Take the remainder away first: \\(${n} - ${r} = ${n - r}\\). Then divide by ${k}.` },
        x - 1,
        x + 2,
        r,
      ],
      solution: [R`Take away the remainder: \(${n} - ${r} = ${n - r}\).`, R`Now \(${n - r} \div \square = ${k}\). Think: ${k} times what makes ${n - r}?`, R`\(${k} \times ${x} = ${n - r}\), so the box is ${x}.`],
      rule: 2,
      skill: 'missing number',
      check: () => (Math.floor(n / x) === k && n % x === r ? true : 'box value does not fit'),
    });
  }
}

function challengeTwoStep(rng) {
  for (;;) {
    const packs = rng.int(2, 5);
    const each = rng.int(4, 9);
    const loose = rng.int(1, 9);
    const d = rng.int(3, 6);
    const total = packs * each + loose;
    const k = Math.floor(total / d);
    const r = total % d;
    if (r === 0 || k > 10) continue;
    const name = person(rng);
    const say = (a, b) => `${a} each, ${b} left over`;
    return q({
      prompt: `${name} has ${packs} packs of ${each} stickers and ${loose} loose stickers. ${name} shares them all equally among ${d} friends. How many does each friend get, and how many are left over?`,
      correct: say(k, r),
      wrong: [
        { value: say(Math.floor((packs * each) / d), (packs * each) % d), why: `This shares only the stickers in the packs. Add the ${loose} loose ones first.` },
        { value: say(k - 1, r + d), why: `${r + d} left over is enough for every friend to get one more.` },
        say(k + 1, r),
        say(k, d - r === r ? r + 1 : d - r),
        say(k + 1, 0),
      ],
      solution: [R`Find the total: \(${packs} \times ${each} = ${packs * each}\), then \(${packs * each} + ${loose} = ${total}\).`, R`Share among ${d}: \(${d} \times ${k} = ${d * k}\) fits, and \(${total} - ${d * k} = ${r}\).`, `Each friend gets ${k}. ${r} ${r === 1 ? 'is' : 'are'} left over.`],
      rule: 5,
      skill: 'two-step stories',
      check: () => (d * k + r === packs * each + loose && r < d ? true : 'sharing does not rebuild the total'),
    });
  }
}

function challengeTickets(rng) {
  const price = rng.int(3, 9);
  const k = rng.int(3, 9);
  const r = rng.int(1, price - 1);
  const have = price * k + r;
  const name = person(rng);
  const thing = rng.pick(['tickets', 'toy cars', 'notebooks', 'plants']);
  const say = (a, b) => `${a} ${thing}, $${b} left`;
  return q({
    prompt: `${thing[0].toUpperCase()}${thing.slice(1)} cost $${price} each. ${name} has $${have}. How many ${thing} can ${name} buy, and how much money is left?`,
    correct: say(k, r),
    wrong: [
      { value: say(k - 1, r + price), why: `With $${r + price} left, ${name} can buy one more.` },
      { value: say(k + 1, 0), why: `${k + 1} ${thing} cost $${price * (k + 1)}. That is more than $${have}.` },
      say(k, price - r === r ? r + 1 : price - r),
      say(k + 1, r),
    ],
    solution: [...fitSteps(have, price), `${name} can buy ${k} ${thing} and has $${r} left.`],
    rule: 5,
    skill: 'remainder stories',
    check: () => (price * k + r === have && r < price ? true : 'purchase does not rebuild the money'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'division',
  title: 'Division: Sharing & Remainders',
  summary: 'Divide by sharing and grouping, use multiplication facts to divide, and decide what a remainder means.',
  grade: 'Grades 3–4',
  standards: ['CCSS 3.OA.A.2', 'CCSS 3.OA.A.4', 'CCSS 3.OA.B.6', 'CCSS 4.OA.A.3'],

  explain: {
    intro: R`Dividing splits a total into equal groups. \(12 \div 3 = 4\) says that 12 split into 3 equal groups gives 4 in each. Division undoes multiplication.`,
    rules: [
      {
        title: 'Two ways to see division',
        text: 'Sharing: you know how many groups, and find how many are in each. Grouping: you know how many are in each group, and find how many groups. Both are division.',
        example: R`12 cookies shared by 3 friends: 4 each. 12 cookies in bags of 3: 4 bags. Both are \(12 \div 3 = 4\).`,
      },
      {
        title: 'Think multiplication',
        text: 'To divide, ask a multiplication question. What number times the divisor makes the total?',
        example: R`\(42 \div 6\): ask "6 times what makes 42?" \(6 \times 7 = 42\), so \(42 \div 6 = 7\).`,
      },
      {
        title: 'Fact families',
        text: 'One multiplication fact gives two division facts. Use the family to find any missing number.',
        example: R`\(6 \times 7 = 42\), so \(42 \div 6 = 7\) and \(42 \div 7 = 6\).`,
      },
      {
        title: 'Dividing with 1 and 0',
        text: 'Any number divided by 1 stays the same. Any number divided by itself is 1. Zero divided by a number is 0. You cannot divide by 0.',
        example: R`\(8 \div 1 = 8\), \(8 \div 8 = 1\) and \(0 \div 8 = 0\).`,
      },
      {
        title: 'Remainders',
        text: 'Sometimes the total does not split evenly. What is left over is the remainder. The remainder is always smaller than the divisor.',
        example: R`\(29 \div 4\): \(4 \times 7 = 28\) fits, and \(29 - 28 = 1\). So \(29 \div 4\) is 7 remainder 1.`,
      },
      {
        title: 'What the remainder means in a story',
        text: 'Read the question again. If only full groups count, drop the remainder. If everything must fit, add one more group. If the question asks what is left, the remainder is the answer.',
        example: '29 children, 4 to a car: 7 cars are full, but 8 cars are needed. 1 child is in the last car.',
      },
    ],
    vocab: [
      { term: 'dividend', def: 'The total that is being divided.' },
      { term: 'divisor', def: 'The number you divide by.' },
      { term: 'quotient', def: 'The answer when you divide.' },
      { term: 'remainder', def: 'What is left over when a total does not split evenly.' },
    ],
    mistakes: [
      R`Subtracting instead of dividing. \(12 \div 3\) is 4, not 9.`,
      R`Swapping the numbers. \(12 \div 3\) is not the same as \(3 \div 12\).`,
      R`Leaving a remainder that is too big. \(29 \div 4\) is not 6 remainder 5. Make one more group.`,
      'Forgetting the story. 29 children need 8 cars, even though only 7 cars are full.',
    ],
    visual: sharePic(4, 7, 1),
  },

  examples: [
    {
      title: 'Sharing equally',
      problem: '12 counters are shared equally into 3 groups. How many are in each group?',
      steps: ['Deal the counters out, one at a time, until all 12 are used.', 'Each group gets 4.', R`\(12 \div 3 = 4\), because \(3 \times 4 = 12\).`],
      answer: R`\(4\)`,
      visual: sharePic(3, 4),
    },
    {
      title: 'Think multiplication',
      problem: R`Find \(56 \div 7\).`,
      steps: ['Ask: 7 times what number makes 56?', R`\(7 \times 8 = 56\).`, R`So \(56 \div 7 = 8\).`],
      answer: R`\(8\)`,
    },
    {
      title: 'A remainder',
      problem: R`Find \(29 \div 4\).`,
      steps: [...fitSteps(29, 4), 'There are 7 full groups and 1 left over.'],
      answer: '7 remainder 1',
      visual: sharePic(4, 7, 1),
    },
    {
      title: 'Word problem: how many cars?',
      word: true,
      problem: '29 children are going on a trip. Each car holds 4 children. How many cars are needed?',
      steps: [...fitSteps(29, 4), '7 full cars take 28 children. 1 child still needs a ride.', 'One more car is needed: 8 cars.'],
      answer: '8 cars',
    },
  ],

  models: [
    {
      id: 'share-equally',
      title: 'Share equally',
      intro: 'Choose a total and a number of groups. See what each group gets and what is left over.',
      inputs: [
        { name: 'n', label: 'Total', type: 'int', min: 1, max: 100, value: 29 },
        { name: 'd', label: 'Groups', type: 'int', min: 1, max: 12, value: 4 },
      ],
      compute({ n, d }) {
        const k = Math.floor(n / d);
        const r = n % d;
        const steps = k === 0 ? [`${n} is less than ${d}. No group can get a whole one.`, `All ${n} are left over.`] : [...fitSteps(n, d).slice(0, r ? 3 : 2), r ? `Each group gets ${k}, and ${r} ${r === 1 ? 'is' : 'are'} left over.` : `Each group gets ${k}. Nothing is left over.`];
        const bar = { type: 'barModel', rows: [{ parts: [...Array(d).fill({ value: Math.max(k, 1), label: `${k}`, shade: 'a' }), ...(r ? [{ value: r, label: `${r} left`, shade: 'none' }] : [])], total: `${n} in all` }], alt: `A bar split into ${d} equal parts of ${k}${r ? `, with ${r} left over` : ''}.` };
        return {
          problem: D(n, d),
          steps,
          answer: r ? `${k} remainder ${r}` : R`\(${k}\)`,
          visual: k >= 1 && k <= 12 && r <= k ? sharePic(d, k, r) : bar,
        };
      },
    },
    {
      id: 'trip-vans',
      title: 'Word problem: vans for a trip',
      word: true,
      intro: 'Change the numbers and the question. Watch how the remainder is used.',
      inputs: [
        { name: 'n', label: 'Children', type: 'int', min: 1, max: 150, value: 29 },
        { name: 'd', label: 'Seats in each van', type: 'int', min: 2, max: 12, value: 8 },
        { name: 'ask', label: 'Question', type: 'select', value: 'needed', options: [{ value: 'needed', label: 'How many vans are needed?' }, { value: 'full', label: 'How many vans are full?' }, { value: 'last', label: 'How many ride in the van that is not full?' }] },
      ],
      compute({ n, d, ask }) {
        const k = Math.floor(n / d);
        const r = n % d;
        const question = { needed: 'How many vans are needed?', full: 'How many vans are full?', last: 'How many children ride in the van that is not full?' }[ask];
        const steps = [`Put the children into groups of ${d}, so divide.`, ...(k ? fitSteps(n, d).slice(1, r ? 3 : 2) : [`${n} is less than ${d}, so no van is full.`])];
        let answer;
        if (ask === 'needed') {
          steps.push(r ? `${plural(k, 'van is', 'vans are')} full. The other ${r} ${r === 1 ? 'child needs' : 'children need'} one more van.` : 'Every van is full. No extra van is needed.');
          answer = plural(r ? k + 1 : k, 'van');
        } else if (ask === 'full') {
          steps.push(r ? `Only full vans count. The last ${r} ${r === 1 ? 'child does' : 'children do'} not fill a van.` : 'Every van is full.');
          answer = plural(k, 'full van');
        } else {
          steps.push(r ? `The remainder is the answer: ${r} ${r === 1 ? 'child rides' : 'children ride'} in the last van.` : 'Nothing is left over. Every van is full.');
          answer = r ? plural(r, 'child', 'children') : 'No van is partly full.';
        }
        return {
          problem: `${plural(n, 'child is', 'children are')} going on a trip. Each van has ${d} seats. ${question}`,
          steps,
          answer,
          visual: k + (r ? 1 : 0) <= 15 ? { type: 'barModel', rows: [{ parts: [...Array(k).fill({ value: d, label: `${d}`, shade: 'a' }), ...(r ? [{ value: r, label: `${r}`, shade: 'b' }] : [])], total: `${n} children` }], alt: `A bar with ${k} full vans of ${d}${r ? ` and one van with ${r}` : ''}.` } : undefined,
        };
      },
    },
  ],

  quiz: {
    easy: [easyShare, easyGroupsOf, easyFacts, easyStory],
    medium: [mediumFacts, mediumThink, mediumMissing, mediumStory],
    hard: [hardRemainder, hardLeftOver, hardFullGroups, hardRoundUp],
    challenge: [challengeBackwards, challengeMissingDivisor, challengeTwoStep, challengeTickets],
  },
};
