import { R, q, frac, Frac, plural, joinList } from '../../lib/index.js';

// ───────────── Data sets ─────────────

const cap = (s) => s[0].toUpperCase() + s.slice(1);

// A vote: children choose one thing each.
const vote = (topic, head, cats) => ({
  topic,
  head,
  cats,
  one: 'child',
  many: 'children',
  intro: `Children voted for their ${topic}.`,
  ask: (c) => `How many children chose ${c}?`,
  cmp: (a, b, w) => `How many ${w} children chose ${a} than ${b}?`,
  pair: (a, b) => `How many children chose ${a} or ${b}?`,
  not: (c) => `How many children did not choose ${c}?`,
  all: 'How many children voted in all?',
  most: `Which ${head.toLowerCase()} got the most votes?`,
  least: `Which ${head.toLowerCase()} got the fewest votes?`,
});

const VOTES = [
  vote('favorite fruit', 'Fruit', ['apples', 'bananas', 'grapes', 'oranges', 'pears']),
  vote('favorite pet', 'Pet', ['dogs', 'cats', 'fish', 'birds', 'rabbits']),
  vote('favorite snack', 'Snack', ['popcorn', 'pretzels', 'crackers', 'yogurt', 'cheese']),
  vote('favorite sport', 'Sport', ['soccer', 'basketball', 'swimming', 'tennis', 'running']),
  vote('favorite color', 'Color', ['red', 'blue', 'green', 'yellow', 'purple']),
];
const POND = {
  topic: 'pond animals',
  head: 'Animal',
  cats: ['ducks', 'frogs', 'fish', 'turtles', 'snails'],
  one: 'animal',
  many: 'animals',
  intro: 'A class counted the animals at a pond.',
  ask: (c) => `How many ${c} did the class see?`,
  cmp: (a, b, w) => `How many ${w} ${a} than ${b} did the class see?`,
  pair: (a, b) => `How many ${a} and ${b} did the class see in all?`,
  not: (c) => `How many of the animals were not ${c}?`,
  all: 'How many animals did the class see in all?',
  most: 'Which animal did the class see the most of?',
  least: 'Which animal did the class see the fewest of?',
};
const BOOKS = {
  topic: 'books read',
  head: 'Class',
  cats: ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'],
  one: 'book',
  many: 'books',
  intro: 'Each class kept count of the books it read.',
  ask: (c) => `How many books did ${c} read?`,
  cmp: (a, b, w) => `How many ${w} books did ${a} read than ${b}?`,
  pair: (a, b) => `How many books did ${a} and ${b} read in all?`,
  not: (c) => `How many books did the other classes read, not counting ${c}?`,
  all: 'How many books did the classes read in all?',
  most: 'Which class read the most books?',
  least: 'Which class read the fewest books?',
};
// A "fewer" question names the smaller amount first: "How many fewer children chose pears than apples?"
const pickCtx = (rng, big = false) => (big ? rng.pick([...VOTES, BOOKS]) : rng.pick([...VOTES, VOTES[0], POND]));

/** k different multiples of `step` from lo to hi. */
const distinct = (rng, k, lo, hi, step = 1) => rng.sample(Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step), k);
const total = (vals) => vals.reduce((s, v) => s + v, 0);

// ───────────── Pictures ─────────────

// Tally marks: four bars crossed by a fifth for each group of five.
const tallyTex = (n) => R`\(${[...Array(Math.floor(n / 5)).fill(R`\cancel{||||}`), n % 5 ? '|'.repeat(n % 5) : ''].filter(Boolean).join(R`\;\;`)}\)`;
const countTally = (tex) => (tex.match(/\|/g) ?? []).length + (tex.match(/\\cancel/g) ?? []).length;

function tallyPic(ctx, cats, vals) {
  return {
    type: 'table',
    headers: [ctx.head, 'Tally'],
    rows: cats.map((c, i) => [cap(c), tallyTex(vals[i])]),
    caption: cap(ctx.topic),
    alt: `A tally chart of ${ctx.topic}. ${cats.map((c, i) => `${cap(c)}: ${plural(vals[i], 'tally mark')}.`).join(' ')}`,
  };
}

const STAR = '★';
const keyWords = (ctx, key) => `Each star stands for ${plural(key, ctx.one, ctx.many)}.`;
function picturePic(ctx, cats, stars, key, hide = -1) {
  return {
    type: 'table',
    headers: [ctx.head, 'Number'],
    rows: cats.map((c, i) => [cap(c), i === hide ? '?' : Array(stars[i]).fill(STAR).join(' ')]),
    caption: `${cap(ctx.topic)}. Key: each ${STAR} stands for ${plural(key, ctx.one, ctx.many)}.`,
    alt: `A picture graph of ${ctx.topic}. ${keyWords(ctx, key)} ${cats.map((c, i) => `${cap(c)}: ${i === hide ? 'a question mark' : plural(stars[i], 'star')}.`).join(' ')}`,
  };
}
const countStars = (pic) => pic.rows.map((r) => (r[1].match(/★/g) ?? []).length);

function barPic(ctx, cats, vals, step) {
  return {
    type: 'barChart',
    bars: cats.map((c, i) => ({ label: cap(c), value: vals[i] })),
    step,
    showValues: false,
    yLabel: `Number of ${ctx.many}`,
    xLabel: ctx.head,
    alt: `A bar graph of ${ctx.topic}. The scale goes up by ${step}. ${cats.map((c, i) => `The ${cap(c)} bar reaches ${vals[i]}.`).join(' ')}`,
  };
}

// ───────────── Reading questions shared by the three graph types ─────────────

// `read(i)` says how to read category i from the picture. Returns the parts of q() that depend on the kind.
function graphAsk(rng, ctx, cats, vals, kind, read) {
  const order = cats.map((_, i) => i);
  if (kind === 'one') {
    const i = rng.int(0, cats.length - 1);
    return {
      prompt: ctx.ask(cats[i]),
      correct: vals[i],
      wrong: [...vals.filter((v, j) => j !== i), vals[i] + 1, vals[i] - 1],
      solution: [read(i), `So the answer is ${vals[i]}.`],
      skill: 'reading a graph',
      again: (v) => v[i],
    };
  }
  if (kind === 'more' || kind === 'fewer') {
    const [i, j] = rng.sample(order, 2).sort((x, y) => vals[y] - vals[x]); // i is the bigger one
    const d = vals[i] - vals[j];
    return {
      prompt: kind === 'more' ? ctx.cmp(cats[i], cats[j], 'more') : ctx.cmp(cats[j], cats[i], 'fewer'),
      correct: d,
      wrong: [{ value: vals[i] + vals[j], why: 'Adding puts the two groups together. To compare them, find the difference.' }, { value: vals[i], why: `That is just the ${cats[i]} amount. Subtract the ${cats[j]} amount from it.` }, vals[j], d + 1, d - 1],
      solution: [read(i), read(j), R`Compare by subtracting: \(${vals[i]} - ${vals[j]} = ${d}\).`],
      skill: 'how many more or fewer',
      again: (v) => {
        let c = 0;
        for (let x = v[j]; x < v[i]; x++) c += 1; // count up from the smaller to the bigger
        return c;
      },
    };
  }
  if (kind === 'pair') {
    const [i, j] = rng.sample(order, 2);
    const s = vals[i] + vals[j];
    return {
      prompt: ctx.pair(cats[i], cats[j]),
      correct: s,
      wrong: [{ value: Math.abs(vals[i] - vals[j]), why: 'Subtracting compares the two groups. Here the two groups are put together, so add.' }, total(vals), s + 1, s - 1],
      solution: [read(i), read(j), R`Put the two groups together: \(${vals[i]} + ${vals[j]} = ${s}\).`],
      skill: 'how many in all',
      again: (v) => v[j] + v[i],
    };
  }
  if (kind === 'all') {
    const t = total(vals);
    const lo = Math.min(...vals);
    return {
      prompt: ctx.all,
      correct: t,
      wrong: [{ value: t - lo, why: 'One group was left out. Add every row.' }, { value: cats.length, why: `That is the number of groups. Add the ${ctx.many} in each group.` }, t + 1, t - 1, t + 10],
      solution: [...order.map(read), R`Add them all: \(${vals.join(' + ')} = ${t}\).`],
      skill: 'how many in all',
      again: (v) => [...v].reverse().reduce((s, x) => s + x, 0),
    };
  }
  if (kind === 'not') {
    const i = rng.int(0, cats.length - 1);
    const rest = vals.filter((_, j) => j !== i);
    const t = total(vals);
    return {
      prompt: ctx.not(cats[i]),
      correct: t - vals[i],
      wrong: [{ value: t, why: `That counts ${cats[i]} too. Leave that group out.` }, { value: vals[i], why: `That is the ${cats[i]} group itself. The question asks about all the others.` }, t - vals[i] + 1, t - vals[i] - 1],
      solution: [...order.filter((j) => j !== i).map(read), R`Add the other groups: \(${rest.join(' + ')} = ${t - vals[i]}\).`],
      skill: 'two-step questions',
      again: (v) => total(v) - v[i],
    };
  }
  // most or least: needs four groups so there are three wrong names
  const want = kind === 'most' ? Math.max(...vals) : Math.min(...vals);
  const i = vals.indexOf(want);
  return {
    prompt: kind === 'most' ? ctx.most : ctx.least,
    correct: cap(cats[i]),
    wrong: cats.filter((_, j) => j !== i).map(cap),
    solution: [...order.map(read), `${cap(cats[i])} has the ${kind === 'most' ? 'biggest' : 'smallest'} number, ${want}.`],
    skill: 'reading a graph',
    again: (v) => (v.indexOf(kind === 'most' ? Math.max(...v) : Math.min(...v)) === i ? want : -1),
    answerIsName: true,
    value: want,
  };
}

// Recompute the answer from the numbers read back out of the picture.
const recheck = (a, back, correct) => () => {
  const got = a.again(back());
  const expect = a.answerIsName ? a.value : correct;
  return got === expect ? true : `picture gives ${got}, answer is ${expect}`;
};

// ───────────── Easy ─────────────

function easyTally(rng) {
  const ctx = pickCtx(rng);
  const cats = rng.sample(ctx.cats, 3);
  const vals = distinct(rng, 3, 2, 13);
  const pic = tallyPic(ctx, cats, vals);
  const kind = rng.pick(['one', 'one', 'more', 'fewer', 'all']);
  const a = graphAsk(rng, ctx, cats, vals, kind, (i) => `${cap(cats[i])} has ${plural(vals[i], 'tally mark')}. Count the groups of 5, then the ones.`);
  return q({
    prompt: `${ctx.intro} The tally chart shows the result. ${a.prompt}`,
    visual: pic,
    correct: a.correct,
    wrong: kind === 'one' ? [{ value: Math.floor(a.correct / 5) + (a.correct % 5), why: 'A crossed group stands for 5 marks, not 1.' }, ...a.wrong] : a.wrong,
    solution: a.solution,
    rule: kind === 'one' ? 0 : 3,
    skill: kind === 'one' ? 'tally charts' : a.skill,
    check: recheck(a, () => pic.rows.map((r) => countTally(r[1])), a.correct),
  });
}

function easyPictureOne(rng) {
  const ctx = pickCtx(rng);
  const k = rng.pick([3, 4]);
  const cats = rng.sample(ctx.cats, k);
  const vals = distinct(rng, k, 1, 9);
  const pic = picturePic(ctx, cats, vals, 1);
  const kind = rng.pick(k === 4 ? ['one', 'more', 'fewer', 'most', 'least'] : ['one', 'more', 'fewer', 'all']);
  const a = graphAsk(rng, ctx, cats, vals, kind, (i) => `${cap(cats[i])} has ${plural(vals[i], 'star')}, so ${vals[i]}.`);
  return q({
    prompt: `${ctx.intro} In this picture graph, each star stands for 1. ${a.prompt}`,
    visual: pic,
    correct: a.correct,
    wrong: a.wrong,
    solution: a.solution,
    rule: kind === 'one' || kind === 'most' || kind === 'least' ? 1 : 3,
    skill: a.skill,
    check: recheck(a, () => countStars(pic), a.correct),
  });
}

function easyBarRead(rng) {
  const ctx = pickCtx(rng);
  const step = rng.pick([1, 1, 2]);
  const cats = rng.sample(ctx.cats, 4);
  const vals = distinct(rng, 4, step, 10 * step, step);
  const pic = barPic(ctx, cats, vals, step);
  const kind = rng.pick(['one', 'one', 'more', 'fewer', 'most']);
  const a = graphAsk(rng, ctx, cats, vals, kind, (i) => `The ${cap(cats[i])} bar ends at ${vals[i]}.`);
  return q({
    prompt: `${ctx.intro} The bar graph shows the result. ${a.prompt}`,
    visual: pic,
    correct: a.correct,
    wrong: kind === 'one' && step === 2 ? [{ value: a.correct / 2, why: 'That counts the lines. The scale goes up by 2, so read the number beside the top of the bar.' }, ...a.wrong] : a.wrong,
    solution: [...(step === 2 ? ['The scale goes up by 2 for each line.'] : []), ...a.solution],
    rule: kind === 'more' || kind === 'fewer' ? 3 : 2,
    skill: a.skill,
    check: recheck(a, () => pic.bars.map((b) => b.value), a.correct),
  });
}

// ───────────── Medium ─────────────

function mediumPictureKey(rng) {
  const ctx = pickCtx(rng, true);
  const key = rng.pick([2, 5, 10]);
  const cats = rng.sample(ctx.cats, 4);
  const stars = distinct(rng, 4, 1, 8);
  const vals = stars.map((s) => s * key);
  const pic = picturePic(ctx, cats, stars, key);
  const kind = rng.pick(['one', 'one', 'more', 'fewer', 'pair']);
  const a = graphAsk(rng, ctx, cats, vals, kind, (i) => R`${cap(cats[i])} has ${plural(stars[i], 'star')}: \(${stars[i]} \times ${key} = ${vals[i]}\).`);
  const i = vals.indexOf(a.correct);
  return q({
    prompt: `${ctx.intro} ${keyWords(ctx, key)} ${a.prompt}`,
    visual: pic,
    correct: a.correct,
    wrong: [kind === 'one' ? { value: stars[i], why: `That counts the stars. Each star stands for ${key}, so multiply by ${key}.` } : { value: a.correct / key, why: `That counts stars. Each star stands for ${key}.` }, ...a.wrong, a.correct + key, a.correct - key],
    solution: [`Each star stands for ${key}.`, ...a.solution],
    rule: kind === 'one' ? 1 : 3,
    skill: kind === 'one' ? 'picture graph key' : a.skill,
    check: recheck(a, () => countStars(pic).map((s) => s * key), a.correct),
  });
}

function mediumBarScale(rng) {
  const ctx = pickCtx(rng, true);
  const step = rng.pick([2, 5, 10]);
  const cats = rng.sample(ctx.cats, 4);
  // A scale of 2 or 10 may also end halfway between two lines (7 on a scale of 2, 35 on a scale of 10).
  const unit = step === 5 ? 5 : step / 2;
  const vals = distinct(rng, 4, step, 10 * step, unit);
  const pic = barPic(ctx, cats, vals, step);
  const kind = rng.pick(['one', 'more', 'fewer', 'pair', 'all']);
  const read = (i) => (vals[i] % step ? `The ${cap(cats[i])} bar ends halfway between ${vals[i] - unit} and ${vals[i] + unit}, so ${vals[i]}.` : `The ${cap(cats[i])} bar ends on the line for ${vals[i]}.`);
  const a = graphAsk(rng, ctx, cats, vals, kind, read);
  return q({
    prompt: `${ctx.intro} The bar graph shows the result. The scale goes up by ${step}. ${a.prompt}`,
    visual: pic,
    correct: a.correct,
    wrong: [...a.wrong, a.correct + step, a.correct - step],
    solution: a.solution,
    rule: kind === 'one' ? 2 : 3,
    skill: a.skill,
    check: recheck(a, () => pic.bars.map((b) => b.value), a.correct),
  });
}

const WHOLE_PLOTS = [
  { what: 'the number of pets each child has', axis: 'Number of pets', lo: 0, hi: 5, each: 'child', at: (v) => `How many children have ${plural(v, 'pet')}?`, over: (v) => `How many children have more than ${plural(v, 'pet')}?`, all: 'How many children are shown on the line plot?' },
  { what: 'the length of each pencil in a cup, in inches', axis: 'Length (inches)', lo: 3, hi: 9, each: 'pencil', at: (v) => `How many pencils are ${v} inches long?`, over: (v) => `How many pencils are longer than ${v} inches?`, all: 'How many pencils were measured?' },
  { what: 'the number of books each child read this week', axis: 'Books read', lo: 0, hi: 6, each: 'child', at: (v) => `How many children read ${plural(v, 'book')}?`, over: (v) => `How many children read more than ${plural(v, 'book')}?`, all: 'How many children are shown on the line plot?' },
];

/** n values from lo to hi (whole units of the plot), at most `stack` at any one value. */
function plotData(rng, lo, hi, n, stack = 5) {
  const out = [];
  const count = new Map();
  while (out.length < n) {
    const v = rng.int(lo, hi);
    if ((count.get(v) ?? 0) >= stack) continue;
    count.set(v, (count.get(v) ?? 0) + 1);
    out.push(v);
  }
  return out.sort((a, b) => a - b);
}
const countAt = (vals, v) => vals.filter((x) => x === v).length;
const dotsAlt = (ticks, vals, text) => ticks.filter((t) => countAt(vals, t)).map((t) => `${countAt(vals, t)} at ${text(t)}`).join(', ');

function mediumLinePlot(rng) {
  const P = rng.pick(WHOLE_PLOTS);
  const n = rng.int(8, 14);
  const vals = plotData(rng, P.lo, P.hi, n);
  const ticks = Array.from({ length: P.hi - P.lo + 1 }, (_, i) => P.lo + i);
  const pic = { type: 'dotPlot', values: vals, min: P.lo, max: P.hi, label: P.axis, alt: `A line plot of ${P.what}. Each dot is one ${P.each}. Dots: ${dotsAlt(ticks, vals, String)}. No other dots.` };
  const kind = rng.pick(['at', 'at', 'over', 'all']);
  const v = kind === 'at' ? rng.pick([...new Set(vals)]) : rng.int(P.lo + 1, P.hi - 2);
  const above = ticks.filter((t) => t > v);
  const overCount = vals.filter((x) => x > v).length;
  const correct = kind === 'at' ? countAt(vals, v) : kind === 'over' ? overCount : n;
  return q({
    prompt: `The line plot shows ${P.what}. ${kind === 'at' ? P.at(v) : kind === 'over' ? P.over(v) : P.all}`,
    visual: pic,
    correct,
    wrong:
      kind === 'at'
        ? [{ value: v, why: `${v} is the number on the line. Count the dots above it.` }, countAt(vals, v + 1) || null, countAt(vals, v - 1) || null, correct + 1, correct - 1 || correct + 2]
        : kind === 'over'
          ? [{ value: overCount + countAt(vals, v), why: `"More than ${v}" does not count the dots at ${v}.` }, { value: n - overCount, why: 'Those are the dots at the number and below it. Count the dots to the right.' }, correct + 1, correct - 1]
          : [{ value: new Set(vals).size, why: 'Some numbers have more than one dot. Count every dot.' }, { value: ticks.length, why: 'That counts the numbers on the line. Count the dots.' }, n + 1, n - 1],
    solution:
      kind === 'at'
        ? [`Find ${v} on the line.`, `Count the dots above it: ${countAt(vals, v)}.`]
        : kind === 'over'
          ? [`Look at the numbers to the right of ${v}: ${above.join(', ')}.`, R`Count their dots: \(${above.map((t) => countAt(vals, t)).join(' + ')} = ${overCount}\).`]
          : [`Each dot is one ${P.each}.`, R`Count the dots at each number: \(${ticks.filter((t) => countAt(vals, t)).map((t) => countAt(vals, t)).join(' + ')} = ${n}\).`],
    rule: 4,
    skill: 'line plots',
    check: () => {
      let c = 0;
      for (const x of pic.values) if (kind === 'all' || (kind === 'at' ? x === v : x > v)) c += 1;
      return c === correct ? true : `recount gives ${c}`;
    },
  });
}

// ───────────── Fraction line plots ─────────────

// Values are kept as whole numbers of parts: k parts of size 1/d.
const fracText = (k, d) => {
  const f = frac(k, d);
  const w = Math.floor(f.n / f.d);
  const r = f.n - w * f.d;
  return r === 0 ? `${w}` : w === 0 ? `${r}/${f.d}` : `${w} ${r}/${f.d}`;
};
const texOf = (f) => (f instanceof Frac ? f : frac(f, 1)).mixedTex();

const MEASURE = [
  { obj: ['ribbon', 'ribbons'], unit: ['inch', 'inches'], axis: 'Length (inches)', what: 'the length of each ribbon', at: (v, u) => `How many ribbons are ${v} ${u} long?`, diff: 'How much longer is the longest ribbon than the shortest ribbon?', sum: 'What is the total length of all the ribbons?', some: (c, v, u) => `What is the total length of the ${c} ribbons that are ${v} ${u} long?` },
  { obj: ['caterpillar', 'caterpillars'], unit: ['inch', 'inches'], axis: 'Length (inches)', what: 'the length of each caterpillar', at: (v, u) => `How many caterpillars are ${v} ${u} long?`, diff: 'How much longer is the longest caterpillar than the shortest one?', sum: 'If the caterpillars lined up end to end, how long would the line be?', some: (c, v, u) => `The ${c} caterpillars that are ${v} ${u} long line up end to end. How long is the line?` },
  { obj: ['bag of sand', 'bags of sand'], unit: ['pound', 'pounds'], axis: 'Weight (pounds)', what: 'the weight of each bag of sand', at: (v, u) => `How many bags weigh ${v} ${u}?`, diff: 'How much heavier is the heaviest bag than the lightest bag?', sum: 'What is the total weight of all the bags?', some: (c, v, u) => `What is the total weight of the ${c} bags that weigh ${v} ${u} each?`, share: (n) => `All the sand is poured out. Then it is shared equally into the ${n} bags. How much sand will each bag hold?` },
  { obj: ['beaker', 'beakers'], unit: ['liter', 'liters'], axis: 'Water (liters)', what: 'how much water is in each beaker', at: (v, u) => `How many beakers hold ${v} ${u} of water?`, diff: 'How much more water is in the fullest beaker than in the beaker with the least?', sum: 'How much water is in all the beakers together?', some: (c, v, u) => `How much water is in the ${c} beakers that hold ${v} ${u} each?`, share: (n) => `The water is shared out equally among the ${n} beakers. How much water will each beaker hold?` },
  { obj: ['glass', 'glasses'], unit: ['cup', 'cups'], axis: 'Juice (cups)', what: 'how much juice is in each glass', at: (v, u) => `How many glasses hold ${v} ${u} of juice?`, diff: 'How much more juice is in the fullest glass than in the glass with the least?', sum: 'How much juice is in all the glasses together?', some: (c, v, u) => `How much juice is in the ${c} glasses that hold ${v} ${u} each?`, share: (n) => `The juice is poured back and shared equally among the ${n} glasses. How much juice will each glass hold?` },
];
const unitFor = (M, f) => (f.n <= f.d ? M.unit[0] : M.unit[1]);
const amount = (M, f) => R`\(${texOf(f)}\) ${unitFor(M, f)}`;

// A plot in parts of 1/d: halves over 2 or 3 wholes, quarters over 1 whole, eighths from 0 to 1.
function fracRange(rng, d) {
  if (d === 2) {
    const w = rng.int(1, 5);
    return [2 * w, 2 * (w + rng.pick([2, 3]))];
  }
  if (d === 4) {
    const w = rng.int(0, 4);
    return [4 * w, 4 * w + 4];
  }
  return [0, 8];
}

function fracPlot(M, parts, d, lo, hi) {
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return {
    type: 'dotPlot',
    values: parts.map((k) => k / d),
    min: lo / d,
    max: hi / d,
    step: 1 / d,
    labels: ticks.map((k) => ({ value: k / d, text: fracText(k, d) })),
    label: M.axis,
    alt: `A line plot of ${M.what}. It is marked in ${['', '', 'halves', '', 'quarters', '', '', '', 'eighths'][d]}. Each dot is one ${M.obj[0]}. Dots: ${dotsAlt(ticks, parts, (k) => fracText(k, d))}. No other dots.`,
  };
}
// Read the parts back out of a plot picture (an independent route to the data).
const partsOf = (pic, d) => pic.values.map((v) => Math.round(v * d));

function hardLinePlotFrac(rng) {
  const M = rng.pick(MEASURE);
  const d = rng.pick([2, 4, 4, 8]);
  const [lo, hi] = fracRange(rng, d);
  const parts = plotData(rng, d === 8 ? 1 : lo, hi, rng.int(8, 12), 4);
  const pic = fracPlot(M, parts, d, lo, hi);
  const kind = rng.pick(['at', 'diff', 'diff', 'some']);
  const stacks = [...new Set(parts)].filter((k) => countAt(parts, k) >= 2);
  if (kind === 'at' || (kind === 'some' && !stacks.length)) {
    const k = rng.pick([...new Set(parts)]);
    const c = countAt(parts, k);
    return q({
      prompt: `The line plot shows ${M.what}. ${M.at(R`\(${texOf(frac(k, d))}\)`, unitFor(M, frac(k, d)))}`,
      visual: pic,
      correct: c,
      wrong: [countAt(parts, k + 1) || null, countAt(parts, k - 1) || null, c + 1, c - 1 || c + 2, c + 2],
      solution: [`Find ${fracText(k, d)} on the line.`, `Count the dots above it: ${c}.`],
      rule: 4,
      skill: 'line plots with fractions',
      check: () => (partsOf(pic, d).filter((x) => x === k).length === c ? true : 'recount differs'),
    });
  }
  const F = (k) => frac(k, d);
  if (kind === 'diff') {
    const big = Math.max(...parts);
    const small = Math.min(...parts);
    const ans = F(big - small);
    return q({
      prompt: `The line plot shows ${M.what}. ${M.diff}`,
      visual: pic,
      correct: ans,
      fmt: (v) => amount(M, v),
      wrong: [{ value: F(big + small), why: 'Adding puts the two amounts together. To compare them, subtract.' }, { value: F(big), why: 'That is the biggest amount. Subtract the smallest amount from it.' }, hi - lo !== big - small ? { value: F(hi - lo), why: 'That uses the ends of the number line. Use the dots at the two ends of the data.' } : null, F(big - small + 1), big - small > 1 ? F(big - small - 1) : null],
      solution: [`The biggest dot is at ${fracText(big, d)}. The smallest is at ${fracText(small, d)}.`, R`Subtract: \(${texOf(F(big))} - ${texOf(F(small))} = ${texOf(ans)}\).`, `The difference is ${amount(M, ans)}.`],
      rule: 5,
      skill: 'line plots with fractions',
      check: () => {
        const back = partsOf(pic, d);
        // count the steps of 1/d from the smallest dot to the biggest
        let steps = 0;
        for (let x = Math.min(...back); x < Math.max(...back); x++) steps += 1;
        return frac(steps, d).eq(ans) ? true : 'step count differs';
      },
    });
  }
  const k = rng.pick(stacks);
  const c = countAt(parts, k);
  const ans = F(c * k);
  return q({
    prompt: `The line plot shows ${M.what}. ${M.some(c, R`\(${texOf(F(k))}\)`, unitFor(M, F(k)))}`,
    visual: pic,
    correct: ans,
    fmt: (v) => amount(M, v),
    wrong: [{ value: F(k), why: `That is the amount for one ${M.obj[0]}. There are ${c} of them.` }, { value: frac(c, 1), why: 'That counts the dots. Add the amount once for each dot.' }, F(c * k + 1), F(c * k - 1)],
    solution: [`There are ${c} dots at ${fracText(k, d)}.`, R`Add \(${texOf(F(k))}\) ${c} times: \(${Array(c).fill(texOf(F(k))).join(' + ')} = ${texOf(ans)}\).`, `The total is ${amount(M, ans)}.`],
    rule: 5,
    skill: 'line plots with fractions',
    check: () => (partsOf(pic, d).filter((x) => x === k).reduce((s) => s.add(F(k)), frac(0, 1)).eq(ans) ? true : 'repeated addition differs'),
  });
}

// ───────────── Hard: two-step questions ─────────────

function twoStepParts(rng, ctx, cats, vals, read) {
  const [i, j, l] = rng.sample(cats.map((_, x) => x), 3);
  const both = vals[i] + vals[j];
  if (both > vals[l] && rng.bool(0.6)) {
    const d = both - vals[l];
    return {
      prompt: ctx === BOOKS ? `How many more books did ${cats[i]} and ${cats[j]} read together than ${cats[l]}?` : ctx === POND ? `How many more ${cats[i]} and ${cats[j]} together than ${cats[l]} did the class see?` : `How many more children chose ${cats[i]} or ${cats[j]} than chose ${cats[l]}?`,
      correct: d,
      wrong: [{ value: both, why: `That is the first two groups together. Now compare with ${cats[l]} by subtracting.` }, { value: both + vals[l], why: 'That adds all three groups. The last step is a comparison, so subtract.' }, { value: Math.abs(vals[i] - vals[l]), why: `Put ${cats[i]} and ${cats[j]} together first.` }, d + 1, d - 1],
      solution: [read(i), read(j), read(l), R`Put the first two together: \(${vals[i]} + ${vals[j]} = ${both}\).`, R`Compare: \(${both} - ${vals[l]} = ${d}\).`],
      again: (v) => v[i] + v[j] - v[l],
    };
  }
  return { ...graphAsk(rng, ctx, cats, vals, 'not', read) };
}

function hardPictureTwoStep(rng) {
  const ctx = pickCtx(rng, true);
  const key = rng.pick([2, 5, 10]);
  const cats = rng.sample(ctx.cats, 4);
  const stars = distinct(rng, 4, 1, 9);
  const vals = stars.map((s) => s * key);
  const pic = picturePic(ctx, cats, stars, key);
  const a = twoStepParts(rng, ctx, cats, vals, (i) => R`${cap(cats[i])}: \(${stars[i]} \times ${key} = ${vals[i]}\).`);
  return q({
    prompt: `${ctx.intro} ${keyWords(ctx, key)} ${a.prompt}`,
    visual: pic,
    correct: a.correct,
    wrong: [...a.wrong, { value: a.correct / key, why: `That counts stars. Each star stands for ${key}.` }, a.correct + key],
    solution: [`Each star stands for ${key}.`, ...a.solution],
    rule: 3,
    skill: 'two-step questions',
    check: recheck(a, () => countStars(pic).map((s) => s * key), a.correct),
  });
}

function hardBarTwoStep(rng) {
  const ctx = pickCtx(rng, true);
  const step = rng.pick([5, 10]);
  const cats = rng.sample(ctx.cats, 4);
  const vals = distinct(rng, 4, step, 10 * step, step);
  const pic = barPic(ctx, cats, vals, step);
  const a = twoStepParts(rng, ctx, cats, vals, (i) => `The ${cap(cats[i])} bar shows ${vals[i]}.`);
  return q({
    prompt: `${ctx.intro} The bar graph shows the result. The scale goes up by ${step}. ${a.prompt}`,
    visual: pic,
    correct: a.correct,
    wrong: [...a.wrong, a.correct + step, a.correct - step],
    solution: a.solution,
    rule: 3,
    skill: 'two-step questions',
    check: recheck(a, () => pic.bars.map((b) => b.value), a.correct),
  });
}

// ───────────── Challenge ─────────────

function challengePlotTotal(rng) {
  const M = rng.pick(MEASURE);
  const d = rng.pick([4, 8, 8]);
  const [lo, hi] = fracRange(rng, d);
  const parts = plotData(rng, d === 8 ? 1 : lo, hi, rng.int(6, 9), 3);
  const pic = fracPlot(M, parts, d, lo, hi);
  const F = (k) => frac(k, d);
  const t = total(parts);
  const ans = F(t);
  const kinds = [...new Set(parts)];
  const groups = kinds.map((k) => (countAt(parts, k) > 1 ? R`${countAt(parts, k)} \times ${texOf(F(k))}` : texOf(F(k))));
  return q({
    prompt: `The line plot shows ${M.what}. ${M.sum}`,
    visual: pic,
    correct: ans,
    fmt: (v) => amount(M, v),
    wrong: [kinds.length < parts.length ? { value: F(total(kinds)), why: `Each dot is one ${M.obj[0]}. Add an amount once for every dot above it.` } : null, { value: frac(parts.length, 1), why: `That counts the ${M.obj[1]}. Add their amounts.` }, F(t + 1), F(t - 1), F(t + 2)],
    solution: [`Add the amount for every dot: ${joinList(kinds.map((k) => `${countAt(parts, k)} at ${fracText(k, d)}`))}.`, R`\(${groups.join(' + ')} = ${texOf(ans)}\).`, `In all: ${amount(M, ans)}.`],
    rule: 5,
    skill: 'adding fractions from a line plot',
    check: () => (partsOf(pic, d).reduce((s, k) => s.add(F(k)), frac(0, 1)).eq(ans) ? true : 'sum of the dots differs'),
  });
}

function challengeShare(rng) {
  const M = rng.pick(MEASURE.filter((x) => x.share));
  const d = rng.pick([4, 8, 8]);
  const [lo, hi] = fracRange(rng, d);
  const first = d === 8 ? 1 : lo;
  const n = rng.int(3, 5) * 2;
  // Build pairs that sit the same distance above and below the equal share, so the share is exact.
  const mid = rng.int(first + 2, hi - 2);
  const reach = Math.min(mid - first, hi - mid);
  let parts;
  for (let tries = 0; tries < 30; tries++) {
    parts = [];
    for (let p = 0; p < n / 2; p++) {
      const t = rng.int(0, reach);
      parts.push(mid - t, mid + t);
    }
    if (Math.max(...parts.map((k) => countAt(parts, k))) <= 4) break;
  }
  parts.sort((a, b) => a - b);
  const pic = fracPlot(M, parts, d, lo, hi);
  const F = (k) => frac(k, d);
  const t = total(parts);
  const ans = F(t).div(frac(n, 1));
  const kinds = [...new Set(parts)];
  return q({
    prompt: `The line plot shows ${M.what}. ${M.share(n)}`,
    visual: pic,
    correct: ans,
    fmt: (v) => amount(M, v),
    wrong: [{ value: F(t), why: `That is the total. Share it equally among the ${n} ${M.obj[1]}: divide by ${n}.` }, { value: F(t).div(frac(n - 1, 1)), why: `There are ${n} ${M.obj[1]}. Count every dot.` }, F(mid + 1), F(mid - 1), F(hi)],
    solution: [
      `Find the total first. Add the amount for every dot.`,
      R`Total: \(${kinds.map((k) => (countAt(parts, k) > 1 ? R`${countAt(parts, k)} \times ${texOf(F(k))}` : texOf(F(k)))).join(' + ')} = ${texOf(F(t))}\).`,
      R`Share it among ${n} ${M.obj[1]}: \(${texOf(F(t))} \div ${n} = ${texOf(ans)}\).`,
      `Each one will hold ${amount(M, ans)}.`,
    ],
    rule: 5,
    skill: 'sharing equally from a line plot',
    check: () => {
      const back = partsOf(pic, d);
      return F(total(back)).eq(ans.mul(frac(back.length, 1))) ? true : 'share times count is not the total';
    },
  });
}

function challengeWorkBack(rng) {
  const ctx = pickCtx(rng, true);
  const cats = rng.sample(ctx.cats, 4);
  const key = rng.pick([2, 5, 10]);
  const stars = distinct(rng, 4, 1, 8);
  const vals = stars.map((s) => s * key);
  if (rng.bool()) {
    // The key is missing: find it from one row, then use it on another.
    const [i, j] = rng.sample([0, 1, 2, 3], 2);
    const pic = picturePic(ctx, cats, stars, key);
    pic.caption = `${cap(ctx.topic)}. Key: each ${STAR} stands for the same number.`;
    pic.alt = pic.alt.replace(keyWords(ctx, key), 'Each star stands for the same number.');
    return q({
      prompt: `${ctx.intro} In this picture graph, each star stands for the same number. The ${cats[i]} row stands for ${plural(vals[i], ctx.one, ctx.many)}. How many ${ctx.many} does the ${cats[j]} row stand for?`,
      visual: pic,
      correct: vals[j],
      wrong: [{ value: stars[j], why: `That counts the stars. First find what one star stands for.` }, { value: key, why: `That is what one star stands for. The ${cats[j]} row has ${stars[j]} stars.` }, vals[j] + key, vals[j] - key, vals[i] + stars[j] - stars[i] > 0 ? vals[i] + stars[j] - stars[i] : null],
      solution: [R`${cap(cats[i])} has ${plural(stars[i], 'star')} for ${vals[i]}. One star: \(${vals[i]} \div ${stars[i]} = ${key}\).`, R`${cap(cats[j])} has ${plural(stars[j], 'star')}: \(${stars[j]} \times ${key} = ${vals[j]}\).`],
      rule: 1,
      skill: 'picture graph key',
      check: () => (countStars(pic)[j] * (vals[i] / countStars(pic)[i]) === vals[j] ? true : 'key does not fit'),
    });
  }
  // One row is hidden: find it from the total.
  const h = rng.int(0, 3);
  const pic = picturePic(ctx, cats, stars, key, h);
  const t = total(vals);
  const known = vals.filter((_, x) => x !== h);
  return q({
    prompt: `${ctx.intro} ${keyWords(ctx, key)} The ${cats[h]} row is hidden. The graph stands for ${plural(t, ctx.one, ctx.many)} in all. How many stars belong in the ${cats[h]} row?`,
    visual: pic,
    correct: stars[h],
    unit: 'stars',
    wrong: [{ value: vals[h], why: `That is the number of ${ctx.many}. Each star stands for ${key}, so divide by ${key}.` }, { value: (t - known[0]) / key, why: 'Take away every row you can see, not just one.' }, stars[h] + 1, stars[h] + 2, stars[h] - 1],
    solution: [R`The rows you can see: \(${known.join(' + ')} = ${total(known)}\).`, R`The hidden row stands for \(${t} - ${total(known)} = ${vals[h]}\).`, R`Each star is ${key}: \(${vals[h]} \div ${key} = ${stars[h]}\) stars.`],
    rule: 1,
    skill: 'working backwards',
    check: () => (countStars(pic).reduce((s, x) => s + x * key, 0) + stars[h] * key === t ? true : 'stars do not rebuild the total'),
  });
}

// ───────────── Topic ─────────────

const DEMO_CATS = ['apples', 'bananas', 'grapes', 'pears'];

export default {
  id: 'data-graphs',
  title: 'Picture Graphs, Bar Graphs & Line Plots',
  summary: 'Sort and count data, read picture graphs, bar graphs and line plots, and answer questions with them.',
  grade: 'Grades 1–5',
  standards: ['CCSS 1.MD.C.4', 'CCSS 2.MD.D.10', 'CCSS 3.MD.B.3', 'CCSS 3.MD.B.4', 'CCSS 4.MD.B.4', 'CCSS 5.MD.B.2'],

  explain: {
    intro: '**Data** is information we collect, like votes or measurements. We sort it into groups and count each group. A graph shows the counts as a picture. Then we can answer questions quickly.',
    rules: [
      {
        title: 'Sort and count with tally marks',
        text: 'Make one mark for each thing. Every fifth mark crosses the four before it. To count, count by fives for the groups. Then count on the single marks.',
        example: 'Two crossed groups and 3 more marks: 5, 10, then 11, 12, 13.',
      },
      {
        title: 'Picture graphs: use the key',
        text: 'Each picture stands for an amount. The key tells the amount. Count the pictures in a row. Then multiply by the key.',
        example: R`Each star stands for 5 children. A row of 4 stars: \(4 \times 5 = 20\) children.`,
      },
      {
        title: 'Bar graphs: read the scale',
        text: 'Look at the numbers up the side. That is the scale. Find where the top of the bar ends. A bar can end halfway between two lines.',
        example: 'The scale goes up by 2. A bar halfway between 6 and 8 shows 7.',
      },
      {
        title: 'Compare or put together',
        text: 'To find how many more or fewer, compare two groups. Subtract the smaller from the bigger. To find how many in all, put the groups together. Add them.',
        example: R`Apples 12, pears 7. Apples have \(12 - 7 = 5\) more. Together: \(12 + 7 = 19\).`,
      },
      {
        title: 'Line plots: one dot for each one',
        text: 'A line plot has a number line. Each dot stands for one thing measured. The dots stack above its number.',
        example: 'Three dots above 5 means three pencils are 5 inches long.',
      },
      {
        title: 'Line plots with fractions',
        text: 'The line can be marked in halves, quarters or eighths. To find a total, add the amount for every dot. To share equally, find the total, then divide.',
        example: R`Dots at \(\frac{1}{4}\), \(\frac{1}{4}\) and \(\frac{1}{2}\) liter make \(1\) liter in all. Shared among 4 beakers: \(\frac{1}{4}\) liter each.`,
      },
    ],
    vocab: [
      { term: 'data', def: 'Facts or numbers collected to answer a question.' },
      { term: 'tally mark', def: 'A short line drawn to count one thing.' },
      { term: 'key', def: 'The part of a picture graph that says what one picture stands for.' },
      { term: 'scale', def: 'The numbers along the side of a bar graph. They count up by the same amount.' },
      { term: 'line plot', def: 'A number line with a dot for each piece of data.' },
    ],
    mistakes: [
      'Counting pictures but forgetting the key. Multiply the pictures by the key.',
      'Counting each line on a bar graph as 1. Check how much the scale goes up by.',
      'Adding when the question compares two groups. Compare by subtracting.',
      'Adding each number on a line plot once. Add it once for every dot above it.',
    ],
    visual: { type: 'barChart', bars: [{ label: 'Apples', value: 12 }, { label: 'Bananas', value: 7 }, { label: 'Grapes', value: 10 }, { label: 'Pears', value: 4 }], step: 2, showValues: false, yLabel: 'Number of children', xLabel: 'Fruit', alt: 'A bar graph of favorite fruit. The scale goes up by 2. Apples 12, bananas 7, grapes 10, pears 4.' },
  },

  examples: [
    {
      title: 'Reading a picture graph with a key',
      problem: 'Each star stands for 5 children. Soccer has 6 stars. Tennis has 2 stars. How many more children chose soccer than tennis?',
      steps: [R`Soccer: \(6 \times 5 = 30\) children.`, R`Tennis: \(2 \times 5 = 10\) children.`, R`Compare: \(30 - 10 = 20\).`],
      answer: '20 more children',
      visual: picturePic(VOTES[3], ['soccer', 'basketball', 'tennis'], [6, 4, 2], 5),
    },
    {
      title: 'Word problem: a bar graph',
      word: true,
      problem: 'Children voted for their favorite fruit. How many children chose apples or grapes?',
      steps: ['The scale goes up by 2.', 'The apples bar ends at 12. The grapes bar ends at 10.', R`Put the two groups together: \(12 + 10 = 22\).`],
      answer: '22 children',
      visual: barPic(VOTES[0], DEMO_CATS, [12, 7, 10, 4], 2),
    },
    {
      title: 'A line plot in quarters',
      problem: 'How much longer is the longest ribbon than the shortest ribbon?',
      steps: [R`The shortest dot is at \(2\frac{1}{4}\). The longest is at \(3\).`, R`Subtract: \(3 - 2\frac{1}{4} = \frac{3}{4}\).`],
      answer: R`\(\frac{3}{4}\) inch`,
      visual: fracPlot(MEASURE[0], [9, 9, 10, 10, 10, 11, 12], 4, 8, 12),
    },
    {
      title: 'Word problem: share the water equally',
      word: true,
      problem: 'Four beakers hold water. The line plot shows how much. The water is shared equally among the 4 beakers. How much does each hold?',
      steps: [R`Add the amount for every dot: \(\frac{1}{8} + \frac{3}{8} + \frac{3}{8} + \frac{5}{8} = \frac{12}{8}\).`, R`Share among 4 beakers: \(\frac{12}{8} \div 4 = \frac{3}{8}\).`],
      answer: R`\(\frac{3}{8}\) liter in each beaker`,
      visual: fracPlot(MEASURE[3], [1, 3, 3, 5], 8, 0, 8),
    },
  ],

  models: [
    {
      id: 'picture-graph',
      title: 'Make a picture graph',
      intro: 'Type how many children chose each fruit. Pick what one star stands for.',
      inputs: [
        { name: 'a', label: 'Apples', type: 'int', min: 0, max: 100, value: 20 },
        { name: 'b', label: 'Bananas', type: 'int', min: 0, max: 100, value: 15 },
        { name: 'c', label: 'Grapes', type: 'int', min: 0, max: 100, value: 30 },
        { name: 'key', label: 'Each star stands for', type: 'select', value: '5', options: [{ value: '1', label: '1 child' }, { value: '2', label: '2 children' }, { value: '5', label: '5 children' }, { value: '10', label: '10 children' }] },
      ],
      compute({ a, b, c, key }) {
        const k = Number(key);
        const vals = [a, b, c];
        const cats = ['apples', 'bananas', 'grapes'];
        if (vals.some((v) => v % k)) return { error: `With this key, each number must be a multiple of ${k}. Try another key or other numbers.` };
        const stars = vals.map((v) => v / k);
        if (stars.some((s) => s > 12)) return { error: 'That needs more than 12 stars in a row. Pick a bigger key.' };
        const hi = Math.max(...vals);
        const lo = Math.min(...vals);
        const big = cats[vals.indexOf(hi)];
        const small = cats[vals.indexOf(lo)];
        return {
          problem: 'Show the votes in a picture graph. Then compare the groups.',
          steps: [
            ...cats.map((f, i) => (k === 1 ? `${cap(f)}: ${plural(stars[i], 'star')}.` : R`${cap(f)}: \(${vals[i]} \div ${k} = ${stars[i]}\), so ${plural(stars[i], 'star')}.`)),
            hi === lo ? 'All three rows are the same length.' : R`Most: ${big}. Fewest: ${small}. Difference: \(${hi} - ${lo} = ${hi - lo}\).`,
            R`In all: \(${a} + ${b} + ${c} = ${a + b + c}\) children.`,
          ],
          answer: `${plural(a + b + c, 'child', 'children')} voted in all`,
          visual: picturePic(VOTES[0], cats, stars, k),
        };
      },
    },
    {
      id: 'share-water',
      title: 'Word problem: share the water equally',
      word: true,
      intro: 'Type how many beakers hold each amount. See the line plot and the equal share.',
      inputs: [
        { name: 'q1', label: 'Beakers with 1/4 liter', type: 'int', min: 0, max: 6, value: 2 },
        { name: 'q2', label: 'Beakers with 1/2 liter', type: 'int', min: 0, max: 6, value: 1 },
        { name: 'q3', label: 'Beakers with 3/4 liter', type: 'int', min: 0, max: 6, value: 2 },
        { name: 'q4', label: 'Beakers with 1 liter', type: 'int', min: 0, max: 6, value: 1 },
      ],
      compute({ q1, q2, q3, q4 }) {
        const counts = [q1, q2, q3, q4];
        const n = q1 + q2 + q3 + q4;
        if (n === 0) return { error: 'Put at least one beaker on the line plot.' };
        const parts = counts.flatMap((c, i) => Array(c).fill(i + 1));
        const t = frac(q1 + 2 * q2 + 3 * q3 + 4 * q4, 4);
        const share = t.div(frac(n, 1));
        const M = MEASURE[3];
        const terms = counts.map((c, i) => (c ? (c > 1 ? R`${c} \times ${texOf(frac(i + 1, 4))}` : texOf(frac(i + 1, 4))) : null)).filter(Boolean);
        return {
          problem: `A class has ${plural(n, 'beaker')} of water. The line plot shows how much each holds. The water is shared equally among the beakers. How much does each one hold?`,
          steps: [R`Total: \(${terms.join(' + ')} = ${texOf(t)}\) ${unitFor(M, t)}.`, n === 1 ? 'There is only 1 beaker, so it keeps all the water.' : R`Share among ${n} beakers: \(${texOf(t)} \div ${n} = ${texOf(share)}\).`],
          answer: `${amount(M, share)} in each beaker`,
          visual: fracPlot(M, parts, 4, 0, 4),
        };
      },
    },
  ],

  quiz: {
    easy: [easyTally, easyPictureOne, easyBarRead],
    medium: [mediumPictureKey, mediumBarScale, mediumLinePlot],
    hard: [hardPictureTwoStep, hardBarTwoStep, hardLinePlotFrac],
    challenge: [challengePlotTotal, challengeShare, challengeWorkBack],
  },
};
