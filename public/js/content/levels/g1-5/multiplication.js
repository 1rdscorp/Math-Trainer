import { R, q, person, plural } from '../../lib/index.js';
import { GROUPS, ROWS, M } from './_shared.js';

const X = (a, b) => R`\(${a} \times ${b}\)`;
const addChain = (n, times) => Array(times).fill(n).join(' + ');
const skipList = (n, times) => Array.from({ length: times }, (_, i) => n * (i + 1)).join(', ');
const groupsPic = (g, n) => ({ type: 'counters', groups: Array(g).fill(n), perRow: n, alt: `${g} rows of counters with ${n} in each row. Each row is one group.` });
const arrayPic = (rows, cols, split) => ({ type: 'array', rows, cols, split, alt: `An array of dots: ${rows} rows with ${cols} in each row${split ? `, split into ${split.rows} rows and ${rows - split.rows} rows` : ''}.` });

// ───────────── Easy: equal groups, arrays, skip counting ─────────────

function easyGroups(rng) {
  const g = rng.int(2, 5);
  const n = rng.int(2, 6);
  const total = g * n;
  return q({
    prompt: `The picture shows ${g} groups of ${n}. How many counters are there in all?`,
    visual: groupsPic(g, n),
    correct: total,
    wrong: [{ value: g + n, why: `This adds ${g} and ${n} once. There are ${g} groups, so add ${n} again for each group.` }, total + n, total - n, total + 1],
    solution: [R`Add ${n} for each group: \(${addChain(n, g)} = ${total}\).`, R`That is \(${g} \times ${n} = ${total}\).`],
    rule: 0,
    skill: 'equal groups',
    check: () => (Array(g).fill(n).reduce((s, v) => s + v, 0) === total ? true : 'repeated addition does not match'),
  });
}

function easyRepeated(rng) {
  const n = rng.int(2, 9);
  const k = rng.intExcept(2, 5, [n, n - 1, n + 1]);
  return q({
    prompt: R`Which multiplication matches \(${addChain(n, k)}\)?`,
    correct: X(k, n),
    wrong: [
      { value: X(n, n), why: `Count how many ${n}s are added. There are ${k}.` },
      { value: R`\(${k} + ${n}\)`, why: `That adds ${k} and ${n} just once.` },
      X(k - 1, n),
      X(k + 1, n),
    ],
    solution: [`${n} is added ${k} times.`, `That is ${k} groups of ${n}.`, R`\(${addChain(n, k)} = ${k} \times ${n} = ${k * n}\).`],
    rule: 0,
    skill: 'repeated addition',
    check: () => (Array(k).fill(n).reduce((s, v) => s + v, 0) === k * n ? true : 'repeated addition does not match'),
  });
}

function easyArray(rng) {
  const rows = rng.int(2, 5);
  const cols = rng.intExcept(2, 9, [rows]);
  const total = rows * cols;
  return q({
    prompt: `The array has ${rows} rows. Each row has ${cols} dots. How many dots are there in all?`,
    visual: arrayPic(rows, cols),
    correct: total,
    wrong: [{ value: rows + cols, why: 'This adds the rows and the dots in one row. Count every row.' }, total + cols, total - cols, total + rows],
    solution: [`Skip count by ${cols}, once for each row: ${skipList(cols, rows)}.`, R`\(${rows} \times ${cols} = ${total}\).`],
    rule: 1,
    skill: 'arrays',
    check: () => (Array(rows).fill(cols).reduce((s, v) => s + v, 0) === total ? true : 'rows do not add up'),
  });
}

function easySkip(rng) {
  const n = rng.pick([2, 5, 10, 3, 4]);
  const k = rng.int(3, 6);
  const next = n * (k + 1);
  return q({
    prompt: `Skip count by ${n}: ${skipList(n, k)}, … What number comes next?`,
    correct: next,
    wrong: [{ value: n * k + 1, why: `Each jump is ${n}, not 1.` }, next + n, next - 1, next + 1],
    solution: [`Each number is ${n} more than the one before.`, R`\(${n * k} + ${n} = ${next}\).`, R`That is ${k + 1} jumps of ${n}: \(${k + 1} \times ${n} = ${next}\).`],
    rule: 0,
    skill: 'skip counting',
    check: () => (next - n * k === n && next % n === 0 ? true : 'not the next multiple'),
  });
}

function easyFacts(rng) {
  const a = rng.pick([2, 5, 10]);
  const b = rng.int(2, 10);
  const [x, y] = rng.bool() ? [a, b] : [b, a];
  const total = a * b;
  return q({
    prompt: `What is ${X(x, y)}?`,
    correct: total,
    wrong: [{ value: a + b, why: `This adds. ${X(x, y)} means ${x} groups of ${y}.` }, total + a, total - a, total + b],
    solution: [`Skip count by ${a}, ${b} times: ${skipList(a, b)}.`, R`\(${x} \times ${y} = ${total}\).`],
    rule: 0,
    skill: 'facts for 2, 5 and 10',
    check: () => (total / a === b ? true : 'product does not undo'),
  });
}

function groupStory(rng, g, n) {
  const { box, item, prep } = rng.pick(GROUPS);
  const name = person(rng);
  return {
    text: rng.pick([
      `${name} has ${plural(g, box[0], box[1])}. Each ${box[0]} holds ${plural(n, item[0], item[1])}. How many ${item[1]} does ${name} have?`,
      `There are ${plural(n, item[0], item[1])} ${prep} each ${box[0]}. How many ${item[1]} are ${prep} ${plural(g, box[0], box[1])}?`,
    ]),
    lead: `There are ${g} equal groups of ${n}, so multiply.`,
  };
}

function rowStory(rng, r, c) {
  const [things, place] = rng.pick(ROWS);
  return { text: `${place} has ${r} rows of ${things}. Each row has ${c} ${things}. How many ${things} are there?`, lead: `${r} equal rows of ${c} make an array, so multiply.` };
}

function storyQuestion(rng, g, n, kind) {
  const s = kind === 'rows' ? rowStory(rng, g, n) : groupStory(rng, g, n);
  const total = g * n;
  return q({
    prompt: s.text,
    correct: total,
    wrong: [{ value: g + n, why: 'This adds the two numbers once. Each group has the same amount, so multiply.' }, total + n, total - n, total + g, total + 1],
    solution: [s.lead, R`\(${g} \times ${n} = ${total}\).`, `Check by skip counting: ${skipList(n, g)}.`],
    rule: kind === 'rows' ? 1 : 0,
    skill: 'word problems',
    check: () => (Array(g).fill(n).reduce((sum, v) => sum + v, 0) === total ? true : 'groups do not add up'),
  });
}

function easyStory(rng) {
  return storyQuestion(rng, rng.int(2, 5), rng.pick([2, 3, 4, 5, 10]), 'groups');
}

// ───────────── Medium: all the facts; order; zero and one ─────────────

function mediumFacts(rng) {
  const a = rng.int(3, 9);
  const b = rng.int(3, 9);
  const total = a * b;
  return q({
    prompt: `What is ${X(a, b)}?`,
    correct: total,
    wrong: [{ value: total - a, why: `That is ${X(a, b - 1)}. One more group of ${a} is needed.` }, total + b, { value: a + b, why: `This adds. ${X(a, b)} means ${a} groups of ${b}.` }, total + a, total - 1],
    solution: [`Think of ${a} groups of ${b}.`, `Skip count by ${b}: ${skipList(b, a)}.`, R`\(${a} \times ${b} = ${total}\).`],
    rule: 0,
    skill: 'facts to 100',
    check: () => (total / a === b && total % b === 0 ? true : 'product does not undo'),
  });
}

function mediumTurnAround(rng) {
  const a = rng.int(3, 9);
  const b = rng.intExcept(2, 9, [a, a - 1, a + 1]);
  return q({
    prompt: `Which has the same value as ${X(a, b)}?`,
    correct: X(b, a),
    wrong: [
      { value: R`\(${a} + ${b}\)`, why: 'Changing the sign changes the answer. Keep the times sign and swap the numbers.' },
      { value: X(a, b + 1), why: 'A factor changed. Turning a fact around keeps both factors.' },
      X(a - 1, b),
      X(b, b),
    ],
    solution: ['You can multiply in any order.', `${a} rows of ${b} and ${b} rows of ${a} have the same total.`, R`\(${a} \times ${b} = ${b} \times ${a} = ${a * b}\).`],
    rule: 2,
    skill: 'turn-around facts',
    check: () => ([a + b, a * (b + 1), (a - 1) * b, b * b].every((v) => v !== a * b) ? true : 'a wrong choice has the same value'),
  });
}

function mediumZeroOne(rng) {
  const a = rng.int(2, 12);
  const zero = rng.bool();
  const [x, y] = rng.bool() ? [a, zero ? 0 : 1] : [zero ? 0 : 1, a];
  return q({
    prompt: `What is ${X(x, y)}?`,
    correct: zero ? 0 : a,
    wrong: zero
      ? [{ value: a, why: `${a} groups of nothing is still nothing.` }, 1, a * 10, a + 1]
      : [{ value: 1, why: `One group of ${a} is ${a}.` }, { value: a + 1, why: 'This adds 1. Multiplying by 1 keeps the number the same.' }, 0, a * 10],
    solution: zero ? ['Any number times 0 is 0.', `${X(x, y)} is 0, because there is nothing in the groups.`] : ['Any number times 1 is itself.', R`\(${x} \times ${y} = ${a}\).`],
    rule: 3,
    skill: 'zero and one',
    check: () => (x * y === (zero ? 0 : a) ? true : 'product is wrong'),
  });
}

function mediumStory(rng) {
  return storyQuestion(rng, rng.int(3, 9), rng.int(3, 9), rng.pick(['rows', 'groups']));
}

// ───────────── Hard: break apart, tens, three factors ─────────────

function splitParts(rng) {
  const a = rng.int(6, 9);
  const b = rng.int(3, 9);
  const k = rng.pick([5, 5, 2, 3].filter((v) => v < a - 1));
  return { a, b, k, m: a - k };
}

function hardSplit(rng) {
  const { a, b, k, m } = splitParts(rng);
  const good = R`\((${k} \times ${b}) + (${m} \times ${b})\)`;
  const values = [k * b + m, k * b * m * b, (k + b) * (m + b), k * m + b];
  return q({
    prompt: `The array for ${X(a, b)} is split into ${k} rows and ${m} rows. Which shows the split?`,
    visual: arrayPic(a, b, { rows: k }),
    correct: good,
    wrong: [
      { value: R`\((${k} \times ${b}) + ${m}\)`, why: `The last ${m} rows also have ${b} in each row. Multiply that part too.` },
      { value: R`\((${k} \times ${b}) \times (${m} \times ${b})\)`, why: 'The two parts are joined, so add them.' },
      R`\((${k} + ${b}) \times (${m} + ${b})\)`,
      R`\((${k} \times ${m}) + ${b}\)`,
    ],
    solution: [`The top part has ${k} rows of ${b}: ${X(k, b)}.`, `The bottom part has ${m} rows of ${b}: ${X(m, b)}.`, R`Join the parts: \((${k} \times ${b}) + (${m} \times ${b}) = ${k * b} + ${m * b} = ${a * b}\).`],
    rule: 4,
    skill: 'break apart',
    check: () => (k * b + m * b === a * b && values.every((v) => v !== a * b) ? true : 'split does not match'),
  });
}

function hardSplitBox(rng) {
  const { a, b, k, m } = splitParts(rng);
  const compute = rng.bool();
  if (compute) {
    return q({
      prompt: R`\(${k} \times ${b} = ${k * b}\) and \(${m} \times ${b} = ${m * b}\). Use these facts to find \(${a} \times ${b}\).`,
      correct: a * b,
      wrong: [{ value: k * b + m, why: `Add the whole second fact, ${m * b}, not just ${m}.` }, { value: k * b, why: `That is only ${k} groups of ${b}. Add the other ${m} groups.` }, a * b + b, a * b - b, a * b + 2],
      solution: [`${a} groups of ${b} is ${k} groups and ${m} more groups.`, R`\(${k * b} + ${m * b} = ${a * b}\).`, R`So \(${a} \times ${b} = ${a * b}\).`],
      rule: 4,
      skill: 'break apart',
      check: () => (k + m === a && k * b + m * b === a * b ? true : 'split does not match'),
    });
  }
  return q({
    prompt: R`What number goes in the box? \(\;${a} \times ${b} = (${k} \times ${b}) + (\square \times ${b})\)`,
    correct: m,
    wrong: [{ value: a, why: `The ${a} is split into two parts. One part is ${k}. The box is the other part.` }, { value: b, why: `The ${b} is already there. The box is how many more groups of ${b}.` }, m + 1, m - 1 || m + 2, k],
    solution: [`${a} groups of ${b} are split into ${k} groups and some more.`, R`\(${a} - ${k} = ${m}\), so the box is ${m}.`, R`Check: \(${k * b} + ${m * b} = ${a * b}\).`],
    rule: 4,
    skill: 'break apart',
    check: () => (k * b + m * b === a * b ? true : 'split does not match'),
  });
}

function hardTens(rng) {
  const a = rng.int(2, 9);
  const t = rng.int(2, 9);
  const [x, y] = rng.bool() ? [a, 10 * t] : [10 * t, a];
  const total = a * t * 10;
  return q({
    prompt: `What is ${X(x, y)}?`,
    correct: total,
    fmt: M,
    wrong: [
      { value: a * t, why: `${10 * t} is ${t} tens. The answer is ${a * t} tens, not ${a * t} ones.` },
      { value: total * 10, why: `${a * t} tens is ${total}. Only one zero is needed here.` },
      { value: a + 10 * t, why: 'This adds. The times sign means equal groups.' },
      total + 10,
    ],
    solution: [`${10 * t} is ${t} tens.`, R`\(${a} \times ${t} = ${a * t}\), so the answer is ${a * t} tens.`, `${a * t} tens is ${total}.`],
    rule: 5,
    skill: 'multiplying by tens',
    check: () => (Array(a).fill(10 * t).reduce((s, v) => s + v, 0) === total ? true : 'repeated addition does not match'),
  });
}

function hardThree(rng) {
  const c = rng.int(3, 9);
  const order = rng.shuffle([2, 5, c]);
  const total = 10 * c;
  return q({
    prompt: R`What is \(${order.join(' \\times ')}\)? Look for an easy pair first.`,
    correct: total,
    wrong: [
      { value: order[0] * order[1], why: 'There are three factors. Multiply by the last one too.' },
      { value: order[0] * order[1] + order[2], why: 'Every sign is a times sign. Multiply all three numbers.' },
      2 + 5 + c,
      total + 10,
      total - c,
    ],
    solution: [R`Multiply the easy pair first: \(2 \times 5 = 10\).`, R`Then \(10 \times ${c} = ${total}\).`, 'You may multiply in any order. The product stays the same.'],
    rule: 2,
    skill: 'three factors',
    check: () => (order[0] * order[1] * order[2] === total ? true : 'product does not match'),
  });
}

function hardStory(rng) {
  const { box, item, prep } = rng.pick(GROUPS);
  const name = person(rng);
  const g = rng.int(3, 9);
  const n = rng.int(3, 9);
  const extra = rng.int(2, 9);
  const more = rng.bool();
  const total = more ? g * n + extra : g * n - extra;
  return q({
    prompt: more
      ? `${name} has ${plural(g, box[0], box[1])} with ${n} ${item[1]} ${prep} each. ${name} also has ${extra} loose ${item[1]}. How many ${item[1]} does ${name} have?`
      : `${name} has ${plural(g, box[0], box[1])} with ${n} ${item[1]} ${prep} each. ${name} gives away ${extra} ${item[1]}. How many ${item[1]} are left?`,
    correct: total,
    wrong: [
      { value: g * n, why: more ? `This counts only the ${item[1]} ${prep} the ${box[1]}. Add the loose ones.` : `This is before any were given away. Take away ${extra}.` },
      { value: more ? g * (n + extra) : g + n + extra, why: more ? `The ${extra} loose ${item[1]} are not ${prep} every ${box[0]}. Add them once, at the end.` : 'The groups are equal, so multiply first. Then subtract.' },
      more ? g * n - extra : g * n + extra,
      total + n,
      total + 1,
    ],
    solution: [R`First find the equal groups: \(${g} \times ${n} = ${g * n}\).`, more ? R`Then add the loose ones: \(${g * n} + ${extra} = ${total}\).` : R`Then take away the ones given away: \(${g * n} - ${extra} = ${total}\).`, `The answer is ${total} ${item[1]}.`],
    rule: 0,
    skill: 'two-step stories',
    check: () => ((more ? total - extra : total + extra) === g * n && total > 0 ? true : 'steps do not undo'),
  });
}

// ───────────── Challenge ─────────────

function challengeMissing(rng) {
  const a = rng.int(3, 9);
  const x = rng.int(3, 9);
  const p = a * x;
  const first = rng.bool();
  return q({
    prompt: first ? R`What number goes in the box? \(\;\square \times ${a} = ${p}\)` : R`What number goes in the box? \(\;${a} \times \square = ${p}\)`,
    correct: x,
    wrong: [
      { value: p - a, why: `The box is multiplied by ${a}, not added to it. Ask: what times ${a} makes ${p}?` },
      { value: p, why: `${p} is the product. The box is a factor, so it is smaller.` },
      x + 1,
      x - 1,
      a === x ? x + 2 : a,
    ],
    solution: [`Ask: what number times ${a} makes ${p}?`, `Skip count by ${a} until you reach ${p}: ${skipList(a, x)}.`, `That took ${x} jumps, so the box is ${x}.`, R`Check: \(${x} \times ${a} = ${p}\).`],
    rule: 0,
    skill: 'missing factor',
    check: () => (x * a === p ? true : 'box value does not fit'),
  });
}

function challengeGreatest(rng) {
  for (;;) {
    const pairs = Array.from({ length: 4 }, () => [rng.int(3, 9), rng.int(4, 9)]);
    const values = pairs.map(([a, b]) => a * b);
    const top = Math.max(...values);
    if (new Set(values).size < 4 || top - Math.min(...values) > 20 || new Set(pairs.map((p) => p.join())).size < 4) continue;
    const best = pairs[values.indexOf(top)];
    const rest = pairs.filter((p) => p !== best);
    return q({
      prompt: 'Which product is the greatest?',
      correct: X(best[0], best[1]),
      wrong: rest.map(([a, b]) => ({ value: X(a, b), why: `${X(a, b)} is ${a * b}. Another choice is bigger.` })),
      solution: [`Find each product: ${pairs.map(([a, b]) => R`\(${a} \times ${b} = ${a * b}\)`).join(', ')}.`, `The greatest is ${top}.`, `So ${X(best[0], best[1])} is the greatest.`],
      rule: 0,
      skill: 'comparing products',
      key: `greatest:${pairs.map((p) => p.join('x')).sort().join(',')}`,
      check: () => (rest.every(([a, b]) => a * b < best[0] * best[1]) ? true : 'not the greatest'),
    });
  }
}

function challengeUseAFact(rng) {
  const b = rng.int(3, 9);
  const kind = rng.pick(['double', 'onemore', 'oneless']);
  if (kind === 'double') {
    const a = rng.int(2, 4);
    return q({
      prompt: R`\(${a} \times ${b} = ${a * b}\). Use this fact to find \(${2 * a} \times ${b}\).`,
      correct: 2 * a * b,
      wrong: [{ value: a * b + b, why: `${2 * a} groups is double ${a} groups. It is not just one more group.` }, { value: a * b + 2, why: `Double the whole product, ${a * b}. Do not just add 2.` }, 2 * a * b + b, 2 * a * b - b, a * b + a],
      solution: [`${2 * a} is double ${a}. So there are twice as many groups of ${b}.`, R`Double the product: \(${a * b} + ${a * b} = ${2 * a * b}\).`, R`So \(${2 * a} \times ${b} = ${2 * a * b}\).`],
      rule: 4,
      skill: 'using known facts',
      check: () => (Array(2 * a).fill(b).reduce((s, v) => s + v, 0) === 2 * a * b ? true : 'doubling does not match'),
    });
  }
  const a = kind === 'onemore' ? 5 : 10;
  const target = kind === 'onemore' ? 6 : 9;
  const total = target * b;
  return q({
    prompt: R`\(${a} \times ${b} = ${a * b}\). Use this fact to find \(${target} \times ${b}\).`,
    correct: total,
    wrong: [
      { value: kind === 'onemore' ? a * b + 1 : a * b - 1, why: `One group of ${b} is ${b}, not 1.` },
      { value: kind === 'onemore' ? a * b - b : a * b + b, why: kind === 'onemore' ? `${target} groups is more than ${a} groups. Add a group.` : `${target} groups is fewer than ${a} groups. Take a group away.` },
      total + 1,
      total - 1,
      kind === 'onemore' ? total + b : total - b,
    ],
    solution: kind === 'onemore'
      ? [`${target} groups of ${b} is ${a} groups and 1 more group.`, R`\(${a * b} + ${b} = ${total}\).`, R`So \(${target} \times ${b} = ${total}\).`]
      : [`${target} groups of ${b} is ${a} groups take away 1 group.`, R`\(${a * b} - ${b} = ${total}\).`, R`So \(${target} \times ${b} = ${total}\).`],
    rule: 4,
    skill: 'using known facts',
    check: () => (Array(target).fill(b).reduce((s, v) => s + v, 0) === total ? true : 'derived fact does not match'),
  });
}

function challengeTwoStep(rng) {
  const { box, item } = rng.pick(GROUPS.filter((g) => g.box[0] !== 'shelf'));
  const name = person(rng);
  const n = rng.int(3, 9);
  if (rng.bool()) {
    const g1 = rng.int(2, 5);
    const g2 = rng.int(2, 9 - g1 > 2 ? 9 - g1 : 3);
    const total = (g1 + g2) * n;
    return q({
      prompt: `${name} fills ${plural(g1, box[0], box[1])} on Monday and ${plural(g2, box[0], box[1])} on Tuesday. Each ${box[0]} holds ${n} ${item[1]}. How many ${item[1]} is that in all?`,
      correct: total,
      wrong: [{ value: g1 + g2 + n, why: `Each ${box[0]} holds ${n}. Multiply the number of ${box[1]} by ${n}.` }, { value: g1 * n, why: `This counts only Monday. Add the ${box[1]} from Tuesday.` }, g1 * n + g2, total + n, total - n],
      solution: [R`Count the ${box[1]}: \(${g1} + ${g2} = ${g1 + g2}\).`, R`Each holds ${n}: \(${g1 + g2} \times ${n} = ${total}\).`, R`Another way: \((${g1} \times ${n}) + (${g2} \times ${n}) = ${g1 * n} + ${g2 * n} = ${total}\).`],
      rule: 4,
      skill: 'two-step stories',
      check: () => (g1 * n + g2 * n === total ? true : 'two ways do not agree'),
    });
  }
  const rows = rng.int(3, 9);
  const stacks = rng.int(2, 3);
  const total = stacks * rows * n;
  return q({
    prompt: `A shop has ${stacks} shelves. Each shelf has ${rows} ${box[1]}. Each ${box[0]} holds ${n} ${item[1]}. How many ${item[1]} are in the shop?`,
    correct: total,
    wrong: [{ value: rows * n, why: `That is one shelf. There are ${stacks} shelves.` }, { value: stacks + rows + n, why: 'Each step is equal groups, so multiply.' }, stacks * rows + n, total + n, total - rows],
    solution: [R`${box[1][0].toUpperCase()}${box[1].slice(1)} in the shop: \(${stacks} \times ${rows} = ${stacks * rows}\).`, R`Each holds ${n}: \(${stacks * rows} \times ${n} = ${total}\).`, `There are ${total} ${item[1]}.`],
    rule: 0,
    skill: 'two-step stories',
    check: () => (Array(stacks * rows).fill(n).reduce((s, v) => s + v, 0) === total ? true : 'groups do not add up'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'multiplication',
  title: 'Multiplication: Equal Groups & Arrays',
  summary: 'Multiply by thinking of equal groups and arrays, learn the facts to 100, and use smart strategies.',
  grade: 'Grade 3',
  standards: ['CCSS 3.OA.A.1', 'CCSS 3.OA.A.3', 'CCSS 3.OA.B.5', 'CCSS 3.OA.C.7'],

  explain: {
    intro: R`Multiplying is a fast way to add equal groups. \(4 \times 5\) means 4 groups of 5. The numbers you multiply are **factors**. The answer is the **product**.`,
    rules: [
      {
        title: 'Equal groups',
        text: 'When every group has the same amount, multiply. Count the groups, and count how many are in each group. You can add the same number again and again, or skip count.',
        example: R`4 bags with 5 apples each: \(5 + 5 + 5 + 5 = 20\), so \(4 \times 5 = 20\).`,
      },
      {
        title: 'Arrays',
        text: 'An array has equal rows. Multiply the number of rows by the number in each row.',
        example: R`3 rows of 6 chairs: \(3 \times 6 = 18\) chairs.`,
      },
      {
        title: 'Multiply in any order',
        text: 'Turn an array on its side and the total stays the same. So you can swap the factors. With three factors, you can start with any pair.',
        example: R`\(3 \times 7 = 7 \times 3 = 21\). Also \(2 \times 9 \times 5\) is \(10 \times 9 = 90\).`,
      },
      {
        title: 'Zero and one',
        text: 'Any number times 1 is that same number. Any number times 0 is 0.',
        example: R`\(8 \times 1 = 8\) and \(8 \times 0 = 0\).`,
      },
      {
        title: 'Break apart a fact',
        text: 'Split one factor into two easier parts. Multiply each part. Then add the two products.',
        example: R`\(7 \times 8 = (5 \times 8) + (2 \times 8) = 40 + 16 = 56\).`,
      },
      {
        title: 'Multiplying by tens',
        text: 'Think of the tens as a unit. Multiply the basic fact. Then say how many tens that is.',
        example: R`\(4 \times 60\) is 4 times 6 tens. That is 24 tens, or \(240\).`,
      },
    ],
    vocab: [
      { term: 'factor', def: 'A number that is multiplied.' },
      { term: 'product', def: 'The answer when you multiply.' },
      { term: 'array', def: 'Things set out in equal rows.' },
      { term: 'multiple', def: 'A number you say when you skip count. 5, 10, 15 are multiples of 5.' },
    ],
    mistakes: [
      R`Adding the factors. \(4 \times 5\) is 4 groups of 5, which is 20, not 9.`,
      'Multiplying when the groups are not equal. Every group must have the same amount.',
      R`Saying \(6 \times 0 = 6\). Six groups of nothing is nothing.`,
      R`Leaving out the tens. \(4 \times 60\) is 240, not 24.`,
      R`Breaking apart but multiplying only one part. In \((5 \times 8) + (2 \times 8)\), both parts are multiplied by 8.`,
    ],
    visual: { type: 'array', rows: 7, cols: 8, split: { rows: 5 }, alt: 'An array with 7 rows of 8 dots, split into 5 rows and 2 rows. 5 times 8 is 40, 2 times 8 is 16, and together they make 56.' },
  },

  examples: [
    {
      title: 'Equal groups',
      problem: 'There are 3 groups of 4 counters. How many counters are there?',
      steps: [R`Add 4 for each group: \(4 + 4 + 4 = 12\).`, 'Or skip count by 4: 4, 8, 12.', R`\(3 \times 4 = 12\).`],
      answer: R`\(12\)`,
      visual: groupsPic(3, 4),
    },
    {
      title: 'An array, turned around',
      problem: 'An array has 4 rows of 6 dots. How many dots are there?',
      steps: ['Skip count by 6, once for each row: 6, 12, 18, 24.', R`\(4 \times 6 = 24\).`, R`Turn the array: 6 rows of 4 is also 24. So \(6 \times 4 = 24\) too.`],
      answer: R`\(24\)`,
      visual: arrayPic(4, 6),
    },
    {
      title: 'Break apart a hard fact',
      problem: R`Find \(7 \times 8\).`,
      steps: ['Split 7 into 5 and 2.', R`\(5 \times 8 = 40\) and \(2 \times 8 = 16\).`, R`Add the parts: \(40 + 16 = 56\).`],
      answer: R`\(56\)`,
      visual: arrayPic(7, 8, { rows: 5 }),
    },
    {
      title: 'Multiplying by tens',
      problem: R`Find \(3 \times 40\).`,
      steps: ['40 is 4 tens.', R`\(3 \times 4 = 12\), so the answer is 12 tens.`, '12 tens is 120.'],
      answer: R`\(120\)`,
    },
    {
      title: 'Word problem: equal groups',
      word: true,
      problem: 'A baker fills 6 trays. Each tray holds 8 muffins. How many muffins is that?',
      steps: ['There are 6 equal groups of 8, so multiply.', R`\(6 \times 8 = 48\).`, 'Check by skip counting: 8, 16, 24, 32, 40, 48.'],
      answer: '48 muffins',
      visual: arrayPic(6, 8),
    },
    {
      title: 'Word problem: two steps',
      word: true,
      problem: 'Zoe buys 4 packs of pencils. Each pack has 6 pencils. Zoe also finds 3 loose pencils. How many pencils does Zoe have?',
      steps: [R`First find the equal groups: \(4 \times 6 = 24\).`, R`Then add the loose pencils: \(24 + 3 = 27\).`],
      answer: '27 pencils',
    },
  ],

  models: [
    {
      id: 'build-an-array',
      title: 'Build an array',
      intro: 'Choose the rows and how many are in each row.',
      inputs: [
        { name: 'rows', label: 'Rows', type: 'int', min: 1, max: 12, value: 4 },
        { name: 'cols', label: 'In each row', type: 'int', min: 1, max: 12, value: 6 },
      ],
      compute({ rows, cols }) {
        const total = rows * cols;
        const steps = [`There are ${plural(rows, 'row')} with ${cols} in each row.`];
        steps.push(rows === 1 ? `One row of ${cols} is ${cols}.` : rows <= 6 ? R`Add ${cols} for each row: \(${addChain(cols, rows)} = ${total}\).` : `Skip count by ${cols}, ${rows} times: ${skipList(cols, rows)}.`);
        steps.push(R`\(${rows} \times ${cols} = ${total}\).`);
        if (rows !== cols) steps.push(R`Turn the array around: \(${cols} \times ${rows} = ${total}\) as well.`);
        return { problem: X(rows, cols), steps, answer: R`\(${total}\)`, visual: arrayPic(rows, cols) };
      },
    },
    {
      id: 'break-apart',
      title: 'Break apart a fact',
      intro: 'Split the first factor into two parts. See the array split too.',
      inputs: [
        { name: 'a', label: 'First factor', type: 'int', min: 2, max: 12, value: 7 },
        { name: 'b', label: 'Second factor', type: 'int', min: 1, max: 12, value: 8 },
        { name: 'k', label: 'First part of the split', type: 'int', min: 1, max: 11, value: 5 },
      ],
      compute({ a, b, k }) {
        if (k >= a) return { error: `The first part must be smaller than ${a}. Choose a number from 1 to ${a - 1}.` };
        const m = a - k;
        return {
          problem: R`\(${a} \times ${b}\), with ${a} split into ${k} and ${m}`,
          steps: [`Split ${a} into ${k} and ${m}.`, R`Multiply each part: \(${k} \times ${b} = ${k * b}\) and \(${m} \times ${b} = ${m * b}\).`, R`Add the products: \(${k * b} + ${m * b} = ${a * b}\).`],
          answer: R`\(${a} \times ${b} = ${a * b}\)`,
          visual: arrayPic(a, b, { rows: k }),
        };
      },
    },
    {
      id: 'bags-of-apples',
      title: 'Word problem: bags of apples',
      word: true,
      intro: 'Change the number of bags and the apples in each bag.',
      inputs: [
        { name: 'g', label: 'Bags', type: 'int', min: 1, max: 12, value: 5 },
        { name: 'n', label: 'Apples in each bag', type: 'int', min: 1, max: 12, value: 6 },
      ],
      compute({ g, n }) {
        const total = g * n;
        return {
          problem: `There are ${plural(g, 'bag')}. Each bag holds ${plural(n, 'apple')}. How many apples are there in all?`,
          steps: [g === 1 ? `There is 1 group of ${n}.` : `There are ${g} equal groups of ${n}, so multiply.`, `Skip count by ${n}, once for each bag: ${skipList(n, g)}.`, R`\(${g} \times ${n} = ${total}\).`],
          answer: plural(total, 'apple'),
          visual: { type: 'array', rows: g, cols: n, alt: `${g} rows of ${n} dots. Each row stands for one bag of apples.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyGroups, easyRepeated, easyArray, easySkip, easyFacts, easyStory],
    medium: [mediumFacts, mediumTurnAround, mediumZeroOne, mediumStory],
    hard: [hardSplit, hardSplitBox, hardTens, hardThree, hardStory],
    challenge: [challengeMissing, challengeGreatest, challengeUseAFact, challengeTwoStep],
  },
};
