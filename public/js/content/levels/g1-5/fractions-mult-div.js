import { R, q, frac, fracTex, mixedTex, gcd, person, plural, fractionWord } from '../../lib/index.js';

// A fraction exactly as written (not reduced), wrapped as inline math.
const F = (n, d) => R`\(${fracTex(n, d)}\)`;
// A Frac shown in simplest form, as a mixed number when it is greater than 1.
const mixed = (f) => R`\(${f.mixedTex()}\)`;
const withUnit = (f, one, many) => R`\(${f.mixedTex()}\) ${f.value > 1 ? many : one}`;

function proper(rng, dens = [2, 3, 4, 5, 6, 8]) {
  for (;;) {
    const d = rng.pick(dens);
    const n = rng.int(1, d - 1);
    if (gcd(n, d) === 1) return [n, d];
  }
}

// "Write it in simplest form" step, or nothing when the fraction is already simple and less than 1.
function simplest(n, d) {
  const f = frac(n, d);
  if (f.d === d && n < d) return [];
  return [f.isInt() ? R`\(${fracTex(n, d)} = ${f.n}\).` : R`Write it in simplest form: \(${fracTex(n, d)} = ${f.mixedTex()}\).`];
}

// An area picture for a/b × c/d: b columns and d rows; a columns and c rows overlap in a·c small parts.
const areaPic = (a, b, c, d) => ({ type: 'array', rows: d, cols: b, style: 'squares', split: { cols: a, rows: c }, labels: false, alt: `A square cut into ${b} columns and ${d} rows. ${a} of the columns and ${c} of the rows overlap in ${a * c} of the ${b * d} small parts.` });

// ───────────── Easy: a whole number times a fraction ─────────────

function easyWholeTimes(rng) {
  const [n, d] = proper(rng, [3, 4, 5, 7, 8]);
  const w = rng.pick([2, 3, 4, 5].filter((v) => gcd(v, d) === 1));
  const ans = frac(w * n, d);
  const max = Math.max(1, Math.ceil(ans.value));
  return q({
    prompt: R`What is \(${w} \times ${fracTex(n, d)}\)?`,
    visual: { type: 'numberLine', min: 0, max, step: 1 / d, labels: Array.from({ length: max + 1 }, (_, i) => ({ value: i, text: String(i) })), jumps: Array.from({ length: w }, (_, i) => ({ from: (i * n) / d, to: ((i + 1) * n) / d })), alt: `A number line with ${w} equal jumps. Each jump is ${n} ${fractionWord(d, n)} long.` },
    correct: mixed(ans),
    wrong: [
      { value: F(w * n, w * d), why: 'Multiply only the top number. The bottom number is the size of the pieces, and that stays the same.' },
      { value: mixed(frac(w + n, d)), why: `This adds ${w} to the top. Take ${w} groups of ${plural(n, 'piece')} instead.` },
      mixed(frac(w * n + 1, d)),
      mixed(frac(n, d).add(w)),
      mixed(frac(w * n - 1, d)),
    ],
    solution: [`${w} groups of ${n} ${fractionWord(d, n)} is ${w * n} ${fractionWord(d)}.`, n === 1 ? R`\(${w} \times ${fracTex(n, d)} = ${fracTex(w, d)}\).` : R`\(${w} \times ${fracTex(n, d)} = \frac{${w} \times ${n}}{${d}} = ${fracTex(w * n, d)}\).`, ...simplest(w * n, d)],
    rule: 0,
    skill: 'whole number times fraction',
    check: () => (Array(w).fill(frac(n, d)).reduce((s, f) => s.add(f), frac(0)).eq(ans) ? true : 'repeated addition does not match'),
  });
}

function easyRepeated(rng) {
  const [n, d] = proper(rng);
  const w = rng.int(3, 5);
  const f = fracTex(n, d);
  return q({
    prompt: R`Which is the same as \(${w} \times ${f}\)?`,
    correct: R`\(${Array(w).fill(f).join(' + ')}\)`,
    wrong: [
      { value: R`\(${w} + ${f}\)`, why: `That adds ${w} wholes. ${w} times means ${w} groups of ${F(n, d)}.` },
      { value: R`\(${Array(w).fill(f).join(' \\times ')}\)`, why: 'Multiplying by a whole number is repeated adding, not repeated multiplying.' },
      R`\(${Array(w - 1).fill(f).join(' + ')}\)`,
      R`\(${fracTex(w, d)} + ${f}\)`,
    ],
    solution: [`${w} times ${F(n, d)} means ${w} groups of ${F(n, d)}.`, `Add ${F(n, d)} ${w} times.`, R`\(${Array(w).fill(f).join(' + ')} = ${frac(w * n, d).mixedTex()}\).`],
    rule: 0,
    skill: 'whole number times fraction',
    check: () => (Array(w).fill(frac(n, d)).reduce((s, x) => s.add(x), frac(0)).eq(frac(n, d).mul(w)) ? true : 'repeated addition does not match'),
  });
}

function easyPartOfSet(rng) {
  const d = rng.pick([2, 3, 4, 5, 6, 8, 10]);
  const k = rng.int(2, 9);
  const w = d * k;
  return q({
    prompt: R`What is \(${fracTex(1, d)}\) of ${w}?`,
    visual: { type: 'barModel', rows: [{ parts: [{ value: 1, label: '?', shade: 'a' }, ...Array(d - 1).fill({ value: 1, shade: 'none' })], total: `${w} in all` }], alt: `A bar for ${w}, cut into ${d} equal parts. One part is marked with a question mark.` },
    correct: k,
    wrong: [
      { value: w - d, why: `To find ${F(1, d)} of a number, split it into ${d} equal parts. Do not take ${d} away.` },
      { value: w * d, why: `${F(1, d)} of ${w} is a part of ${w}, so it is smaller than ${w}.` },
      k + 1,
      k - 1,
      d !== k ? d : k + 2,
    ],
    solution: [`Split ${w} into ${d} equal parts.`, R`\(${w} \div ${d} = ${k}\).`, `One part is ${k}, so ${F(1, d)} of ${w} is ${k}.`],
    rule: 1,
    skill: 'fraction of a number',
    check: () => (k * d === w ? true : 'parts do not rebuild the whole'),
  });
}

const EACH = [
  (f, w) => [`Each cat eats ${f} cup of food a day. How much food do ${w} cats eat in a day?`, 'cup', 'cups'],
  (f, w) => [`One bow uses ${f} yard of ribbon. How much ribbon do ${w} bows use?`, 'yard', 'yards'],
  (f, w) => [`One lap of a track is ${f} mile. How far is ${w} laps?`, 'mile', 'miles'],
  (f, w) => [`Each plant needs ${f} liter of water. How much water do ${w} plants need?`, 'liter', 'liters'],
];

function easyStory(rng) {
  const [n, d] = proper(rng, [2, 3, 4, 5, 8]);
  const w = rng.pick([3, 4, 5, 6, 7].filter((v) => gcd(v, d) === 1));
  const [text, one, many] = rng.pick(EACH)(F(n, d), w);
  const ans = frac(w * n, d);
  const unit = (f) => withUnit(f, one, many);
  return q({
    prompt: text,
    correct: unit(ans),
    wrong: [
      { value: unit(frac(n, d).add(w)), why: `There are ${w} equal amounts of ${F(n, d)}. Multiply, do not add ${w}.` },
      { value: `${F(w * n, w * d)} ${one}`, why: 'Multiply only the top number. The bottom number stays the same.' },
      unit(frac(w * n + 1, d)),
      unit(frac(w * n + d, d)),
      unit(frac(w * n - 1, d)),
    ],
    solution: [`There are ${w} equal amounts of ${F(n, d)}, so multiply.`, R`\(${w} \times ${fracTex(n, d)} = ${fracTex(w * n, d)}\).`, ...simplest(w * n, d), `The answer is ${unit(ans)}.`],
    rule: 0,
    skill: 'word problems',
    check: () => (Array(w).fill(frac(n, d)).reduce((s, f) => s.add(f), frac(0)).eq(ans) ? true : 'repeated addition does not match'),
  });
}

// ───────────── Medium: fraction times fraction; a fraction of a number ─────────────

function twoFractions(rng) {
  for (;;) {
    const [a, b] = proper(rng);
    const [c, d] = proper(rng);
    if (a * d === b * c || (a === c && b === d)) continue;
    return { a, b, c, d, ans: frac(a * c, b * d) };
  }
}
const timesWrong = ({ a, b, c, d, ans }, show = mixed) => [
  { value: show(frac(a + c, b + d)), why: 'This adds the tops and the bottoms. To multiply, multiply the tops and multiply the bottoms.' },
  { value: show(frac(a * d, b * c)), why: 'This multiplies each top by the other bottom. Multiply top by top and bottom by bottom.' },
  show(frac(a * c, b + d)),
  show(ans.add(frac(1, b * d))),
  show(frac(a + c, b * d)),
  show(ans.add(frac(2, b * d))),
  show(frac(a * c, b * d + 1)),
];
const timesSteps = ({ a, b, c, d }) => [R`Multiply the tops: \(${a} \times ${c} = ${a * c}\).`, R`Multiply the bottoms: \(${b} \times ${d} = ${b * d}\).`, R`\(${fracTex(a, b)} \times ${fracTex(c, d)} = ${fracTex(a * c, b * d)}\).`, ...simplest(a * c, b * d)];

function mediumTimes(rng) {
  const p = twoFractions(rng);
  return q({
    prompt: R`What is \(${fracTex(p.a, p.b)} \times ${fracTex(p.c, p.d)}\)? Give the answer in simplest form.`,
    visual: areaPic(p.a, p.b, p.c, p.d),
    correct: mixed(p.ans),
    wrong: timesWrong(p),
    solution: timesSteps(p),
    rule: 2,
    skill: 'fraction times fraction',
    check: () => (Math.abs((p.a / p.b) * (p.c / p.d) - p.ans.value) < 1e-9 ? true : 'product does not match'),
  });
}

function mediumFractionOf(rng) {
  const [n, d] = proper(rng, [3, 4, 5, 6, 8]);
  const k = rng.int(2, 9);
  const w = d * k;
  return q({
    prompt: R`What is \(${fracTex(n, d)}\) of ${w}?`,
    visual: { type: 'barModel', rows: [{ parts: [...Array(n).fill({ value: 1, shade: 'a' }), ...Array(d - n).fill({ value: 1, shade: 'none' })], total: `${w} in all` }], alt: `A bar for ${w}, cut into ${d} equal parts. ${n} of the parts are shaded.` },
    correct: n * k,
    wrong: [
      { value: k, why: `That is ${F(1, d)} of ${w}. Take ${n} of those parts.` },
      { value: w * n, why: `A fraction of ${w} that is less than 1 must be smaller than ${w}. Divide by ${d} as well.` },
      n * k + k,
      n * k - 1,
      w - n,
    ],
    solution: [R`"Of" means multiply: \(${fracTex(n, d)} \times ${w}\).`, R`Find one part: \(${w} \div ${d} = ${k}\).`, R`Take ${plural(n, 'part')}: \(${n} \times ${k} = ${n * k}\).`],
    rule: 1,
    skill: 'fraction of a number',
    check: () => (frac(n, d).mul(w).eq(n * k) ? true : 'product does not match'),
  });
}

function mediumStory(rng) {
  const name = person(rng);
  const kind = rng.pick(['recipe', 'area', 'rope']);
  if (kind === 'rope') {
    const [n, d] = proper(rng, [2, 3, 4, 5]);
    const w = rng.pick([3, 5, 7, 9, 10, 11].filter((v) => gcd(v, d) === 1));
    const ans = frac(w * n, d);
    const unit = (f) => withUnit(f, 'foot', 'feet');
    return q({
      prompt: `A rope is ${w} feet long. ${name} uses ${F(n, d)} of it. How many feet of rope does ${name} use?`,
      correct: unit(ans),
      wrong: [
        { value: unit(frac(w * d - n, d)), why: `Taking ${F(n, d)} of the rope means multiplying, not subtracting ${F(n, d)} foot.` },
        { value: unit(frac(w, d)), why: `That is ${F(1, d)} of the rope. Take ${n} of those parts.` },
        unit(ans.add(1)),
        unit(frac(w * n + 1, d)),
        unit(frac(w * d, n)),
      ],
      solution: [R`"Of" means multiply: \(${fracTex(n, d)} \times ${w} = ${fracTex(n * w, d)}\).`, ...simplest(n * w, d), `${name} uses ${unit(ans)}.`],
      rule: 1,
      skill: 'word problems',
      check: () => (Math.abs((n / d) * w - ans.value) < 1e-9 ? true : 'product does not match'),
    });
  }
  const p = twoFractions(rng);
  const [one, many] = kind === 'recipe' ? ['cup', 'cups'] : ['square meter', 'square meters'];
  const unit = (f) => withUnit(f, one, many);
  return q({
    prompt: kind === 'recipe'
      ? `A recipe uses ${F(p.a, p.b)} cup of sugar. ${name} makes ${F(p.c, p.d)} of the recipe. How much sugar does ${name} need?`
      : `A garden bed is ${F(p.a, p.b)} meter long and ${F(p.c, p.d)} meter wide. What is its area?`,
    correct: unit(p.ans),
    wrong: timesWrong(p, unit),
    solution: [kind === 'recipe' ? R`${F(p.c, p.d)} of an amount means multiply: \(${fracTex(p.c, p.d)} \times ${fracTex(p.a, p.b)}\).` : R`Area is length times width: \(${fracTex(p.a, p.b)} \times ${fracTex(p.c, p.d)}\).`, ...timesSteps(p).slice(0, 2), R`The product is \(${fracTex(p.a * p.c, p.b * p.d)}${p.ans.d !== p.b * p.d ? ` = ${p.ans.tex()}` : ''}\), so the answer is ${unit(p.ans)}.`],
    rule: 2,
    skill: 'word problems',
    check: () => (Math.abs((p.a / p.b) * (p.c / p.d) - p.ans.value) < 1e-9 ? true : 'product does not match'),
  });
}

// ───────────── Hard: mixed numbers, scaling, unit fractions and division ─────────────

function mixedPair(rng) {
  for (;;) {
    const [n1, d1] = proper(rng, [2, 3, 4, 5]);
    const w1 = rng.int(1, 3);
    const kind = rng.pick(['whole', 'fraction', 'mixed']);
    const [n2, d2] = kind === 'whole' ? [0, 1] : proper(rng, [2, 3, 4, 5]);
    const w2 = kind === 'fraction' ? 0 : rng.int(kind === 'whole' ? 2 : 1, 3);
    const f1 = frac(w1 * d1 + n1, d1);
    const f2 = frac(w2 * d2 + n2, d2);
    const ans = f1.mul(f2);
    const apart = frac(w1 * w2).add(frac(n1 * n2, d1 * d2));
    if (apart.eq(ans)) continue;
    return { w1, n1, d1, w2, n2, d2, f1, f2, ans, apart, kind, tex1: mixedTex(w1, n1, d1), tex2: mixedTex(w2, n2, d2) };
  }
}

function mixedSteps(p) {
  const steps = [R`Change the mixed ${p.kind === 'mixed' ? 'numbers' : 'number'} to ${p.kind === 'mixed' ? 'improper fractions' : 'an improper fraction'}: \(${p.tex1} = \frac{${p.w1} \times ${p.d1} + ${p.n1}}{${p.d1}} = ${fracTex(p.f1.n, p.f1.d)}\)${p.kind === 'mixed' ? R` and \(${p.tex2} = ${fracTex(p.f2.n, p.f2.d)}\)` : ''}.`];
  const top = p.f1.n * p.f2.n;
  const bottom = p.f1.d * p.f2.d;
  steps.push(p.kind === 'whole' ? R`Multiply the top by ${p.w2}: \(${fracTex(p.f1.n, p.f1.d)} \times ${p.w2} = ${fracTex(top, bottom)}\).` : R`Multiply tops and bottoms: \(${fracTex(p.f1.n, p.f1.d)} \times ${fracTex(p.f2.n, p.f2.d)} = ${fracTex(top, bottom)}\).`);
  return [...steps, ...simplest(top, bottom)];
}

function hardMixed(rng) {
  const p = mixedPair(rng);
  return q({
    prompt: R`What is \(${p.tex1} \times ${p.tex2}\)? Give the answer in simplest form.`,
    correct: mixed(p.ans),
    wrong: [
      { value: mixed(p.apart), why: 'Every part of one factor must multiply every part of the other. Change to improper fractions first.' },
      { value: mixed(p.f1.add(p.f2)), why: 'This adds. The sign is a times sign.' },
      mixed(p.ans.add(frac(1, p.ans.d))),
      mixed(p.ans.add(1)),
      mixed(p.ans.add(frac(1, 2))),
    ],
    solution: mixedSteps(p),
    rule: 3,
    skill: 'mixed numbers',
    check: () => (Math.abs((p.w1 + p.n1 / p.d1) * (p.w2 + p.n2 / p.d2) - p.ans.value) < 1e-9 ? true : 'product does not match'),
  });
}

function hardScaling(rng) {
  const w = rng.int(2, 12);
  const [n, d] = proper(rng, [2, 3, 4, 5, 6, 8]);
  const bigger = rng.bool();
  const tex = bigger ? mixedTex(1, n, d) : fracTex(n, d);
  const less = R`It is less than ${w}, because \(${tex}\) is less than 1.`;
  const more = R`It is greater than ${w}, because \(${tex}\) is greater than 1.`;
  return q({
    prompt: R`Do not multiply. Which is true about \(${w} \times ${tex}\)?`,
    correct: bigger ? more : less,
    wrong: [
      bigger ? { value: `It is less than ${w}, because multiplying by a fraction always makes a number smaller.`, why: 'Only a factor less than 1 makes the product smaller. This factor is greater than 1.' } : { value: `It is greater than ${w}, because multiplying always makes a number bigger.`, why: 'Multiplying by a number less than 1 gives only a part of the amount.' },
      `It is equal to ${w}, because multiplying by a fraction does not change a number.`,
      bigger ? less : more,
    ],
    solution: [bigger ? R`\(${tex}\) is greater than 1.` : R`\(${tex}\) is less than 1.`, bigger ? `Multiplying ${w} by a number greater than 1 gives more than ${w}.` : `Multiplying ${w} by a number less than 1 gives only part of ${w}.`, R`So \(${w} \times ${tex}\) is ${bigger ? 'greater' : 'less'} than ${w}.`],
    rule: 4,
    skill: 'scaling',
    check: () => ((bigger ? w * (1 + n / d) > w : w * (n / d) < w) ? true : 'scaling claim is false'),
  });
}

function hardDivide(rng) {
  const b = rng.int(2, 8);
  const n = rng.intExcept(2, 9, [b]);
  if (rng.bool()) {
    return q({
      prompt: R`What is \(${fracTex(1, b)} \div ${n}\)?`,
      visual: { type: 'fractionBars', bars: [{ n: 1, d: b, label: `1/${b}` }, { n: 1, d: b * n, label: `1/${b} cut into ${n} equal parts` }], alt: `Two bars. The first shows 1 of ${b} equal parts. In the second, each part is cut into ${n} smaller parts and one small part is shaded.` },
      correct: frac(1, b * n),
      wrong: [
        { value: mixed(frac(n, b)), why: `That is \\(${n} \\times ${fracTex(1, b)}\\). Splitting ${F(1, b)} into ${n} parts makes smaller pieces.` },
        { value: b * n, why: 'Splitting a small piece into parts cannot give a big number.' },
        mixed(frac(b, n)),
        frac(1, b + n),
      ],
      solution: [`Cut ${F(1, b)} into ${n} equal parts.`, R`The whole now has \(${b} \times ${n} = ${b * n}\) small parts.`, R`Each small part is \(${fracTex(1, b * n)}\), so \(${fracTex(1, b)} \div ${n} = ${fracTex(1, b * n)}\).`],
      rule: 5,
      skill: 'dividing unit fractions',
      check: () => (frac(1, b * n).mul(n).eq(frac(1, b)) ? true : 'quotient does not multiply back'),
    });
  }
  return q({
    prompt: R`What is \(${n} \div ${fracTex(1, b)}\)?`,
    correct: n * b,
    wrong: [
      { value: mixed(frac(n, b)), why: `That is \\(${n} \\times ${fracTex(1, b)}\\). Dividing asks how many ${fractionWord(b)} are in ${n}.` },
      { value: frac(1, n * b), why: `There are many ${fractionWord(b)} in ${n} wholes, so the answer is a big number.` },
      n + b,
      n * b + b,
      n * b - 1,
    ],
    solution: [`Ask: how many ${fractionWord(b)} are in ${n}?`, `Each whole has ${b} ${fractionWord(b)}.`, R`\(${n} \times ${b} = ${n * b}\), so \(${n} \div ${fracTex(1, b)} = ${n * b}\).`],
    rule: 5,
    skill: 'dividing by unit fractions',
    check: () => (frac(1, b).mul(n * b).eq(n) ? true : 'quotient does not multiply back'),
  });
}

const MAKES = [
  ['pounds of clay', 'pound', 'model', 'models'],
  ['yards of ribbon', 'yard', 'bow', 'bows'],
  ['liters of juice', 'liter', 'glass', 'glasses'],
  ['cups of rice', 'cup', 'serving', 'servings'],
];

function hardDivideStory(rng) {
  const name = person(rng);
  const b = rng.int(2, 6);
  const n = rng.intExcept(2, 8, [b]);
  if (rng.bool()) {
    const [stuff, unit, one, many] = rng.pick(MAKES);
    return q({
      prompt: `${name} has ${n} ${stuff}. Each ${one} uses ${F(1, b)} ${unit}. How many ${many} can ${name} make?`,
      visual: n <= 6 ? { type: 'fractionBars', bars: [{ n: n * b, d: b, label: `${n} wholes cut into ${fractionWord(b)}` }], alt: `${n} whole bars, each cut into ${b} equal parts.` } : undefined,
      correct: n * b,
      wrong: [
        { value: mixed(frac(n, b)), why: `That is ${F(1, b)} of ${n}. The story asks how many ${fractionWord(b)} fit into ${n}.` },
        { value: n + b, why: `Each whole ${unit} makes ${b} ${many}. Multiply ${n} by ${b}.` },
        n * b + b,
        n * b - b,
        n,
      ],
      solution: [R`Ask: how many ${fractionWord(b)} are in ${n}? That is \(${n} \div ${fracTex(1, b)}\).`, `Each whole ${unit} makes ${b} ${many}.`, R`\(${n} \times ${b} = ${n * b}\) ${many}.`],
      rule: 5,
      skill: 'word problems',
      check: () => (frac(1, b).mul(n * b).eq(n) ? true : 'quotient does not multiply back'),
    });
  }
  const food = rng.pick(['pizza', 'pie', 'cake', 'melon']);
  return q({
    prompt: `${n} friends share ${F(1, b)} of a ${food} equally. What fraction of the whole ${food} does each friend get?`,
    correct: frac(1, b * n),
    wrong: [
      { value: mixed(frac(n, b)), why: `Sharing makes each piece smaller than ${F(1, b)}, not bigger.` },
      { value: frac(1, n), why: `That would be sharing the whole ${food}. Only ${F(1, b)} of it is shared.` },
      frac(1, b + n),
      mixed(frac(b, n)),
    ],
    solution: [R`Share ${F(1, b)} among ${n}: \(${fracTex(1, b)} \div ${n}\).`, R`Cutting each ${fractionWord(b, 1)} into ${n} parts makes \(${b} \times ${n} = ${b * n}\) parts in the whole.`, `Each friend gets ${F(1, b * n)} of the ${food}.`],
    rule: 5,
    skill: 'word problems',
    check: () => (frac(1, b * n).mul(n).eq(frac(1, b)) ? true : 'quotient does not multiply back'),
  });
}

// ───────────── Challenge ─────────────

function challengeMixedStory(rng) {
  const p = mixedPair(rng);
  if (p.kind === 'fraction') return challengeMixedStory(rng);
  const name = person(rng);
  const area = rng.bool();
  const unit = (f) => (area ? withUnit(f, 'square meter', 'square meters') : withUnit(f, 'cup', 'cups'));
  return q({
    prompt: area
      ? R`A rug is \(${p.tex1}\) meters long and \(${p.tex2}\) meters wide. What is the area of the rug?`
      : R`One batch of muffins needs \(${p.tex1}\) cups of flour. ${name} makes \(${p.tex2}\) batches. How much flour does ${name} need?`,
    correct: unit(p.ans),
    wrong: [
      { value: unit(p.apart), why: 'Every part of one factor must multiply every part of the other. Change to improper fractions first.' },
      { value: unit(p.f1.add(p.f2)), why: area ? 'Area is length times width, not length plus width.' : 'Each batch needs the same amount, so multiply.' },
      unit(p.ans.add(frac(1, p.ans.d))),
      unit(p.ans.add(1)),
      unit(p.ans.add(frac(1, 2))),
    ],
    solution: [area ? 'Area is length times width, so multiply.' : 'There are equal amounts for each batch, so multiply.', ...mixedSteps(p), `The answer is ${unit(p.ans)}.`],
    rule: 3,
    skill: 'word problems',
    check: () => (Math.abs((p.w1 + p.n1 / p.d1) * (p.w2 + p.n2 / p.d2) - p.ans.value) < 1e-9 ? true : 'product does not match'),
  });
}

function challengeMissing(rng) {
  const b = rng.int(2, 6);
  const k = rng.intExcept(2, 9, [b]);
  const kind = rng.pick(['times', 'unitDivide', 'divideUnit']);
  if (kind === 'times') {
    return q({
      prompt: R`What number goes in the box? \(\;\square \times ${fracTex(1, b)} = ${k}\)`,
      correct: k * b,
      wrong: [{ value: mixed(frac(k, b)), why: `Check it: that number times ${F(1, b)} is much less than ${k}. Ask how many ${fractionWord(b)} make ${k} wholes.` }, { value: k, why: `${k} times ${F(1, b)} is less than ${k}. The box must be bigger.` }, k + b, k * b + b, k * b - 1],
      solution: [`${b} ${fractionWord(b)} make 1 whole.`, R`To make ${k} wholes you need \(${k} \times ${b} = ${k * b}\) ${fractionWord(b)}.`, R`Check: \(${k * b} \times ${fracTex(1, b)} = ${k}\).`],
      rule: 5,
      skill: 'missing number',
      check: () => (frac(1, b).mul(k * b).eq(k) ? true : 'box value does not fit'),
    });
  }
  if (kind === 'unitDivide') {
    return q({
      prompt: R`What number goes in the box? \(\;${fracTex(1, b)} \div \square = ${fracTex(1, b * k)}\)`,
      correct: k,
      wrong: [{ value: b * k, why: `${b * k} is the bottom number of the answer. Ask what ${b} was multiplied by to get it.` }, { value: frac(1, k), why: `Dividing by ${F(1, k)} would make the answer bigger than ${F(1, b)}.` }, k + 1, k - 1, b],
      solution: [`Dividing ${F(1, b)} by a whole number cuts each ${fractionWord(b, 1)} into that many parts.`, R`The bottom number became ${b * k}: \(${b} \times \square = ${b * k}\).`, R`\(${b * k} \div ${b} = ${k}\), so the box is ${k}.`],
      rule: 5,
      skill: 'missing number',
      check: () => (frac(1, b).div(k).eq(frac(1, b * k)) ? true : 'box value does not fit'),
    });
  }
  return q({
    prompt: R`What number goes in the box? \(\;\square \div ${fracTex(1, b)} = ${k * b}\)`,
    correct: k,
    wrong: [{ value: k * b * b, why: `Dividing by ${F(1, b)} makes a number ${b} times as big. So the box is smaller than ${k * b}.` }, { value: k * b, why: `Dividing by ${F(1, b)} changes the number. The box is not ${k * b}.` }, k + 1, k - 1, b],
    solution: [`Dividing by ${F(1, b)} counts ${fractionWord(b)}. Each whole has ${b} of them.`, R`So \(\square \times ${b} = ${k * b}\).`, R`\(${k * b} \div ${b} = ${k}\), so the box is ${k}.`],
    rule: 5,
    skill: 'missing number',
    check: () => (frac(k).div(frac(1, b)).eq(k * b) ? true : 'box value does not fit'),
  });
}

function challengeTwoStep(rng) {
  const [a, b] = proper(rng, [2, 3, 4, 5]);
  const [c, d] = proper(rng, [2, 3, 4]);
  const start = b * d * rng.int(1, 3);
  const afterFirst = (start / b) * (b - a);
  const end = (afterFirst / d) * (d - c);
  const fromStart = start - (start / b) * a - (start / d) * c;
  if (end < 2) return challengeTwoStep(rng);
  const name = person(rng);
  const [stuff, use1, use2] = rng.pick([['cups of flour', 'bread', 'muffins'], ['feet of ribbon', 'a banner', 'bows'], ['liters of paint', 'the fence', 'the gate']]);
  return q({
    prompt: `${name} has ${start} ${stuff}. ${name} uses ${F(a, b)} of it for ${use1}. Then ${name} uses ${F(c, d)} of what is left for ${use2}. How much is left at the end?`,
    correct: end,
    unit: stuff.split(' ')[0],
    wrong: [
      { value: afterFirst, why: `That is what is left after ${use1}. Some of it is then used for ${use2}.` },
      fromStart > 0 && fromStart !== end ? { value: fromStart, why: `The second fraction is ${F(c, d)} of what is left. It is not ${F(c, d)} of the ${start} at the start.` } : null,
      { value: start - end, why: 'That is how much was used. The question asks how much is left.' },
      end + 1,
      end + 2,
    ],
    solution: [
      R`First use: \(${fracTex(a, b)} \times ${start} = ${(start / b) * a}\). Left: \(${start} - ${(start / b) * a} = ${afterFirst}\).`,
      R`Second use: \(${fracTex(c, d)} \times ${afterFirst} = ${(afterFirst / d) * c}\). Left: \(${afterFirst} - ${(afterFirst / d) * c} = ${end}\).`,
      `${end} ${stuff} are left.`,
    ],
    rule: 1,
    skill: 'two-step stories',
    check: () => (frac(start).mul(frac(b - a, b)).mul(frac(d - c, d)).eq(end) ? true : 'two steps do not match'),
  });
}

function challengeError(rng) {
  const name = person(rng);
  if (rng.bool()) {
    const b = rng.int(2, 5);
    const k = rng.int(2, 6);
    const n = b * k;
    return q({
      prompt: R`${name} says \(${n} \div ${fracTex(1, b)} = ${k}\). What went wrong?`,
      correct: `${name} found ${F(1, b)} of ${n}. Dividing by ${F(1, b)} asks how many ${fractionWord(b)} are in ${n}.`,
      wrong: [`${name} should have subtracted ${F(1, b)} from ${n}.`, `${name} should have divided ${n} by ${b * b}.`, 'Nothing went wrong. The answer is correct.'],
      solution: [`Each whole has ${b} ${fractionWord(b)}.`, R`So ${n} wholes have \(${n} \times ${b} = ${n * b}\) ${fractionWord(b)}.`, R`\(${n} \div ${fracTex(1, b)} = ${n * b}\), not ${k}.`],
      rule: 5,
      skill: 'checking work',
      check: () => (frac(n).div(frac(1, b)).eq(n * b) && n * b !== k ? true : 'the shown answer is not a slip'),
    });
  }
  const p = twoFractions(rng);
  return q({
    prompt: R`${name} says \(${fracTex(p.a, p.b)} \times ${fracTex(p.c, p.d)} = ${fracTex(p.a + p.c, p.b + p.d)}\). What went wrong?`,
    correct: `${name} added the tops and added the bottoms. To multiply, multiply the tops and multiply the bottoms.`,
    wrong: [`${name} forgot to find a common denominator before multiplying.`, `${name} should have flipped the second fraction first.`, 'Nothing went wrong. The answer is correct.'],
    solution: [...timesSteps(p).slice(0, 3), R`The product is \(${p.ans.tex()}\), not \(${fracTex(p.a + p.c, p.b + p.d)}\).`],
    rule: 2,
    skill: 'checking work',
    check: () => (!frac(p.a + p.c, p.b + p.d).eq(p.ans) ? true : 'the shown answer happens to be right'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'fractions-mult-div',
  title: 'Multiplying & Dividing Fractions',
  summary: 'Multiply fractions, whole numbers and mixed numbers, and divide with unit fractions.',
  grade: 'Grades 4–5',
  standards: ['CCSS 4.NF.B.4', 'CCSS 5.NF.B.4', 'CCSS 5.NF.B.6', 'CCSS 5.NF.B.7'],

  explain: {
    intro: 'Multiplying by a fraction means taking part of an amount. It can also mean adding a fraction again and again. Dividing with a unit fraction asks one of two things. How many small pieces are there? Or how big is each share?',
    rules: [
      {
        title: 'A whole number times a fraction',
        text: 'Think of equal groups of the fraction. Multiply the top number by the whole number. The bottom number stays the same.',
        example: R`\(4 \times \frac{2}{3} = \frac{2}{3} + \frac{2}{3} + \frac{2}{3} + \frac{2}{3} = \frac{8}{3} = 2\frac{2}{3}\).`,
      },
      {
        title: '"Of" means multiply',
        text: 'To find a fraction of a number, first split the number into equal parts. The bottom number tells how many parts. Then take as many parts as the top number says.',
        example: R`\(\frac{3}{4}\) of 20: one fourth of 20 is 5, so three fourths is \(3 \times 5 = 15\).`,
      },
      {
        title: 'A fraction times a fraction',
        text: 'Multiply the tops. Multiply the bottoms. Then write the answer in simplest form.',
        example: R`\(\frac{2}{3} \times \frac{4}{5} = \frac{2 \times 4}{3 \times 5} = \frac{8}{15}\).`,
      },
      {
        title: 'Mixed numbers: change them first',
        text: 'Change each mixed number to an improper fraction. Then multiply tops and bottoms as usual.',
        example: R`\(2\frac{1}{2} \times 1\frac{1}{3} = \frac{5}{2} \times \frac{4}{3} = \frac{20}{6} = 3\frac{1}{3}\).`,
      },
      {
        title: 'Will the answer be bigger or smaller?',
        text: 'Multiplying by a number less than 1 gives a smaller amount. Multiplying by a number greater than 1 gives a bigger amount. Multiplying by 1 changes nothing.',
        example: R`\(8 \times \frac{3}{4}\) is less than 8. \(8 \times 1\frac{1}{4}\) is more than 8.`,
      },
      {
        title: 'Dividing with unit fractions',
        text: 'A unit fraction divided by a whole number: cut each piece into that many parts. A whole number divided by a unit fraction: count how many of those pieces fit.',
        example: R`\(\frac{1}{3} \div 4 = \frac{1}{12}\). And \(4 \div \frac{1}{3} = 12\), because there are 12 thirds in 4.`,
      },
    ],
    vocab: [
      { term: 'unit fraction', def: R`A fraction with 1 on top, like \(\frac{1}{4}\).` },
      { term: 'improper fraction', def: R`A fraction whose top is as big as or bigger than its bottom, like \(\frac{5}{2}\).` },
      { term: 'mixed number', def: R`A whole number and a fraction together, like \(2\frac{1}{2}\).` },
      { term: 'product', def: 'The answer when you multiply.' },
      { term: 'scaling', def: 'Making an amount bigger or smaller by multiplying.' },
    ],
    mistakes: [
      R`Multiplying the bottom too. \(4 \times \frac{2}{3}\) is \(\frac{8}{3}\), not \(\frac{8}{12}\).`,
      R`Adding tops and bottoms. \(\frac{2}{3} \times \frac{4}{5}\) is not \(\frac{6}{8}\).`,
      R`Multiplying mixed numbers piece by piece. \(2\frac{1}{2} \times 1\frac{1}{3}\) is not \(2\frac{1}{6}\).`,
      R`Thinking that dividing always makes a number smaller. \(4 \div \frac{1}{3}\) is 12.`,
    ],
    visual: areaPic(2, 3, 4, 5),
  },

  examples: [
    {
      title: 'A whole number times a fraction',
      problem: R`Find \(4 \times \frac{2}{3}\).`,
      steps: ['4 groups of 2 thirds is 8 thirds.', R`\(4 \times \frac{2}{3} = \frac{8}{3}\).`, R`Write it in simplest form: \(\frac{8}{3} = 2\frac{2}{3}\).`],
      answer: R`\(2\frac{2}{3}\)`,
      visual: { type: 'numberLine', min: 0, max: 3, step: 1 / 3, labels: [0, 1, 2, 3].map((v) => ({ value: v, text: String(v) })), jumps: [0, 1, 2, 3].map((i) => ({ from: (2 * i) / 3, to: (2 * i + 2) / 3 })), alt: 'A number line from 0 to 3 with 4 jumps of two thirds. The jumps end at 2 and two thirds.' },
    },
    {
      title: 'A fraction times a fraction',
      problem: R`Find \(\frac{2}{3} \times \frac{4}{5}\).`,
      steps: timesSteps({ a: 2, b: 3, c: 4, d: 5 }),
      answer: R`\(\frac{8}{15}\)`,
      visual: areaPic(2, 3, 4, 5),
    },
    {
      title: 'Multiplying mixed numbers',
      problem: R`Find \(2\frac{1}{2} \times 1\frac{1}{3}\).`,
      steps: [R`Change to improper fractions: \(2\frac{1}{2} = \frac{5}{2}\) and \(1\frac{1}{3} = \frac{4}{3}\).`, R`Multiply tops and bottoms: \(\frac{5}{2} \times \frac{4}{3} = \frac{20}{6}\).`, R`Write it in simplest form: \(\frac{20}{6} = 3\frac{1}{3}\).`],
      answer: R`\(3\frac{1}{3}\)`,
    },
    {
      title: 'Word problem: dividing by a unit fraction',
      word: true,
      problem: R`Ben has 3 pounds of clay. Each model uses \(\frac{1}{4}\) pound. How many models can Ben make?`,
      steps: [R`Ask: how many fourths are in 3? That is \(3 \div \frac{1}{4}\).`, 'Each whole pound makes 4 models.', R`\(3 \times 4 = 12\) models.`],
      answer: '12 models',
      visual: { type: 'fractionBars', bars: [{ n: 12, d: 4, label: '3 wholes cut into fourths' }], alt: 'Three whole bars, each cut into 4 equal parts. There are 12 parts in all.' },
    },
  ],

  models: [
    {
      id: 'multiply-fractions',
      title: 'Multiply two fractions',
      intro: 'Type two fractions. The picture shows the part where they overlap.',
      inputs: [
        { name: 'a', label: 'First top number', type: 'int', min: 0, max: 12, value: 2 },
        { name: 'b', label: 'First bottom number', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'c', label: 'Second top number', type: 'int', min: 0, max: 12, value: 3 },
        { name: 'd', label: 'Second bottom number', type: 'int', min: 1, max: 12, value: 4 },
      ],
      compute({ a, b, c, d }) {
        const ans = frac(a * c, b * d);
        return {
          problem: R`\(${fracTex(a, b)} \times ${fracTex(c, d)}\)`,
          steps: timesSteps({ a, b, c, d }),
          answer: mixed(ans),
          visual: a <= b && c <= d ? areaPic(a, b, c, d) : undefined,
          note: a > b || c > d ? 'One factor is greater than 1, so the picture is not drawn.' : undefined,
        };
      },
    },
    {
      id: 'part-of-a-trail',
      title: 'Word problem: part of a trail',
      word: true,
      intro: 'Change the length of the trail and the fraction Maya walks.',
      inputs: [
        { name: 'w', label: 'Trail length (miles)', type: 'int', min: 1, max: 60, value: 12 },
        { name: 'n', label: 'Top number', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'd', label: 'Bottom number', type: 'int', min: 1, max: 12, value: 4 },
      ],
      compute({ w, n, d }) {
        if (n > d) return { error: 'Maya cannot walk more than the whole trail. Make the top number no bigger than the bottom number.' };
        const ans = frac(w * n, d);
        const even = w % d === 0;
        const steps = [R`"Of" means multiply: \(${fracTex(n, d)} \times ${w}\).`];
        if (even) steps.push(R`Find one part: \(${w} \div ${d} = ${w / d}\).`, R`Take ${plural(n, 'part')}: \(${n} \times ${w / d} = ${(w / d) * n}\).`);
        else steps.push(R`Multiply the top by ${w}: \(${fracTex(n * w, d)}\).`, ...simplest(n * w, d));
        return {
          problem: `A trail is ${plural(w, 'mile')} long. Maya walks ${F(n, d)} of it. How far does Maya walk?`,
          steps,
          answer: withUnit(ans, 'mile', 'miles'),
          visual: { type: 'barModel', rows: [{ parts: [...Array(n).fill({ value: 1, label: even ? `${w / d}` : undefined, shade: 'a' }), ...Array(d - n).fill({ value: 1, shade: 'none' })], total: `${plural(w, 'mile')} in all` }], alt: `A bar for the ${w}-mile trail, cut into ${d} equal parts. ${n} of the parts are shaded.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyWholeTimes, easyRepeated, easyPartOfSet, easyStory],
    medium: [mediumTimes, mediumFractionOf, mediumStory],
    hard: [hardMixed, hardScaling, hardDivide, hardDivideStory],
    challenge: [challengeMixedStory, challengeMissing, challengeTwoStep, challengeError],
  },
};
