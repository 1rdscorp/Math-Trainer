import { R, q, frac, fracTex, mixedTex, lcm, person, people, fractionWord } from '../../lib/index.js';

// A fraction exactly as written (not reduced), wrapped as inline math.
const F = (n, d) => R`\(${fracTex(n, d)}\)`;
// A Frac shown as a mixed number when it is greater than 1.
const mixed = (f) => R`\(${f.mixedTex()}\)`;
// A Frac with a unit that agrees with it: "3/4 mile", "1 1/2 miles".
const withUnit = (f, one, many) => R`\(${f.mixedTex()}\) ${f.value > 1 ? many : one}`;

const UNLIKE_PAIRS = [[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [4, 6], [6, 8], [6, 9], [4, 10], [5, 6], [2, 7], [3, 8], [6, 10], [8, 12], [9, 12]];
const LENGTH_THINGS = ['ribbon', 'rope', 'string', 'wire', 'tape'];
const FOODS = ['pizza', 'pie', 'cake', 'pan of brownies', 'loaf of banana bread'];

function barsFor(parts) {
  return { type: 'fractionBars', bars: parts.map(([n, d]) => ({ n, d })) };
}

// ───────────── Easy: same denominators ─────────────

function likePair(rng, kind) {
  // Returns a, b, d with the answer already in simplest form.
  for (;;) {
    const d = rng.int(3, 12);
    const a = rng.int(1, d - 2);
    const b = rng.int(1, d - 2);
    const top = kind === '+' ? a + b : a - b;
    if (top <= 0 || top >= d) continue;
    if (frac(top, d).d !== d) continue;
    return { a, b, d, top };
  }
}

function easyAdd(rng) {
  const { a, b, d, top } = likePair(rng, '+');
  return q({
    prompt: R`What is \(\frac{${a}}{${d}} + \frac{${b}}{${d}}\)?`,
    correct: frac(top, d),
    wrong: [
      { value: F(top, 2 * d), why: 'This adds the bottom numbers too. The bottom number only tells the size of the pieces, so it stays the same.' },
      frac(top + 1, d),
      frac(Math.abs(a - b) || 1, d),
      frac(top - 1, d),
    ],
    solution: [
      R`The bottom numbers are the same, so the pieces are the same size: they are all \(\frac{1}{${d}}\)s.`,
      R`Add the top numbers: \(${a} + ${b} = ${top}\).`,
      R`Keep the bottom number: \(\frac{${a}}{${d}} + \frac{${b}}{${d}} = \frac{${top}}{${d}}\).`,
    ],
    rule: 0,
    skill: 'same denominators',
  });
}

function easySubtract(rng) {
  const { a, b, d, top } = likePair(rng, '-');
  return q({
    prompt: R`What is \(\frac{${a}}{${d}} - \frac{${b}}{${d}}\)?`,
    correct: frac(top, d),
    wrong: [
      { value: frac(a + b, d), why: 'This adds the top numbers. The sign is a minus, so take away.' },
      frac(top + 1, d),
      { value: R`\(${top}\)`, why: 'The answer still needs its bottom number. It tells what size the pieces are.' },
      frac(top, d + 1),
    ],
    solution: [
      R`The bottom numbers are the same, so the pieces are the same size.`,
      R`Subtract the top numbers: \(${a} - ${b} = ${top}\).`,
      R`Keep the bottom number: \(\frac{${a}}{${d}} - \frac{${b}}{${d}} = \frac{${top}}{${d}}\).`,
    ],
    rule: 0,
    skill: 'same denominators',
  });
}

function easyPicture(rng) {
  const { a, b, d, top } = likePair(rng, '+');
  return q({
    prompt: R`Each bar is one whole cut into ${d} equal pieces. The first bar shows \(\frac{${a}}{${d}}\) and the second shows \(\frac{${b}}{${d}}\). How much is shaded in all?`,
    visual: barsFor([[a, d], [b, d]]),
    correct: frac(top, d),
    wrong: [
      { value: F(top, 2 * d), why: `There are two bars, but each piece is still one of ${d} equal pieces of a whole.` },
      frac(top + 1, d),
      frac(top - 1, d),
      frac(d - top, d),
    ],
    solution: [
      R`Count the shaded pieces: \(${a} + ${b} = ${top}\) pieces.`,
      R`Each piece is \(\frac{1}{${d}}\) of a whole, so \(\frac{${top}}{${d}}\) is shaded in all.`,
    ],
    rule: 0,
    skill: 'same denominators',
  });
}

function easyStory(rng) {
  const { a, b, d, top } = likePair(rng, '+');
  const [p1, p2] = people(rng, 2);
  const food = rng.pick(FOODS);
  return q({
    prompt: R`${p1} ate \(\frac{${a}}{${d}}\) of a ${food}. ${p2} ate \(\frac{${b}}{${d}}\) of the same ${food}. What fraction of the ${food} did they eat in all?`,
    correct: frac(top, d),
    wrong: [
      { value: F(top, 2 * d), why: `This adds the bottom numbers too. The pieces are still ${fractionWord(d)}.` },
      frac(Math.abs(a - b) || 1, d),
      frac(top + 1, d),
      frac(d - top, d),
    ],
    solution: [
      R`"In all" means we put the two parts together, so we add: \(\frac{${a}}{${d}} + \frac{${b}}{${d}}\).`,
      R`Same bottom numbers, so add the tops: \(${a} + ${b} = ${top}\).`,
      R`They ate \(\frac{${top}}{${d}}\) of the ${food}.`,
    ],
    rule: 0,
    skill: 'word problems',
  });
}

// ───────────── Medium: one denominator is a multiple of the other ─────────────

function multiplePair(rng, kind) {
  for (;;) {
    const d1 = rng.int(2, 6);
    const k = rng.int(2, 3);
    const d2 = d1 * k;
    const a = rng.int(1, d1 - 1);
    const b = rng.int(1, d2 - 1);
    if (frac(b, d2).d !== d2) continue; // second fraction already in simplest form
    const top = kind === '+' ? a * k + b : a * k - b;
    if (top <= 0 || top >= d2) continue;
    return { a, b, d1, d2, k, top };
  }
}

function mediumAdd(rng) {
  const { a, b, d1, d2, k, top } = multiplePair(rng, '+');
  const ans = frac(top, d2);
  const simplified = ans.d !== d2;
  return q({
    prompt: R`What is \(\frac{${a}}{${d1}} + \frac{${b}}{${d2}}\)? Give the answer in simplest form.`,
    correct: ans,
    wrong: [
      { value: F(a + b, d1 + d2), why: 'This adds tops and bottoms. First make the bottom numbers the same, then add only the tops.' },
      { value: frac(a + b, d2), why: R`\(\frac{${a}}{${d1}}\) was not changed into ${fractionWord(d2)}. Multiply its top by ${k} as well.` },
      frac(top + 1, d2),
      frac(top, d2 + d1),
    ],
    solution: [
      R`The bottom numbers are different. \(${d2}\) is a multiple of \(${d1}\), so use ${fractionWord(d2)} for both.`,
      R`Change the first fraction: \(\frac{${a}}{${d1}} = \frac{${a} \times ${k}}{${d1} \times ${k}} = \frac{${a * k}}{${d2}}\).`,
      R`Add the tops: \(\frac{${a * k}}{${d2}} + \frac{${b}}{${d2}} = \frac{${top}}{${d2}}\).`,
      simplified ? R`Simplify: \(\frac{${top}}{${d2}} = ${ans.tex()}\).` : R`\(\frac{${top}}{${d2}}\) is already in simplest form.`,
    ],
    rule: 1,
    skill: 'unlike denominators',
  });
}

function mediumSubtract(rng) {
  const { a, b, d1, d2, k, top } = multiplePair(rng, '-');
  const ans = frac(top, d2);
  const simplified = ans.d !== d2;
  return q({
    prompt: R`What is \(\frac{${a}}{${d1}} - \frac{${b}}{${d2}}\)? Give the answer in simplest form.`,
    correct: ans,
    wrong: [
      { value: F(Math.abs(a - b) || 1, d2 - d1), why: 'This subtracts tops and bottoms. First make the bottom numbers the same, then subtract only the tops.' },
      { value: frac(a * k + b, d2), why: 'This adds. The sign is a minus.' },
      frac(top + 1, d2),
      frac(Math.abs(a - b) || 1, d2),
    ],
    solution: [
      R`Use ${fractionWord(d2)} for both fractions, because \(${d2}\) is a multiple of \(${d1}\).`,
      R`Change the first fraction: \(\frac{${a}}{${d1}} = \frac{${a * k}}{${d2}}\).`,
      R`Subtract the tops: \(\frac{${a * k}}{${d2}} - \frac{${b}}{${d2}} = \frac{${top}}{${d2}}\).`,
      simplified ? R`Simplify: \(\frac{${top}}{${d2}} = ${ans.tex()}\).` : R`\(\frac{${top}}{${d2}}\) is already in simplest form.`,
    ],
    rule: 1,
    skill: 'unlike denominators',
  });
}

function mediumStory(rng) {
  const { a, b, d1, d2, k, top } = multiplePair(rng, '+');
  const ans = frac(top, d2);
  const name = person(rng);
  const [x, y] = rng.pick([['milk', 'water'], ['flour', 'sugar'], ['red paint', 'blue paint'], ['oats', 'raisins']]);
  return q({
    prompt: R`${name} mixes \(\frac{${a}}{${d1}}\) cup of ${x} with \(\frac{${b}}{${d2}}\) cup of ${y}. How many cups is the mix? Give the answer in simplest form.`,
    correct: R`\(${ans.tex()}\) cup`,
    wrong: [
      { value: R`\(${fracTex(a + b, d1 + d2)}\) cup`, why: 'This adds tops and bottoms. Make the bottom numbers the same first.' },
      R`\(${frac(a + b, d2).tex()}\) cup`,
      R`\(${frac(top + 1, d2).tex()}\) cup`,
      R`\(${frac(top + 2, d2).tex()}\) cup`,
      R`\(${frac(top + 3, d2).tex()}\) cup`,
    ],
    solution: [
      R`The two amounts are put together, so add: \(\frac{${a}}{${d1}} + \frac{${b}}{${d2}}\).`,
      R`Change to ${fractionWord(d2)}: \(\frac{${a}}{${d1}} = \frac{${a * k}}{${d2}}\).`,
      R`Add: \(\frac{${a * k}}{${d2}} + \frac{${b}}{${d2}} = \frac{${top}}{${d2}}${ans.d !== d2 ? ` = ${ans.tex()}` : ''}\) cup.`,
    ],
    rule: 1,
    skill: 'word problems',
  });
}

// ───────────── Hard: find a least common denominator; mixed numbers ─────────────

function lcdParts(rng, kind) {
  for (;;) {
    const [d1, d2] = rng.shuffle(rng.pick(UNLIKE_PAIRS));
    const L = lcm(d1, d2);
    const a = rng.int(1, d1 - 1);
    const b = rng.int(1, d2 - 1);
    if (frac(a, d1).d !== d1 || frac(b, d2).d !== d2) continue;
    const m1 = L / d1;
    const m2 = L / d2;
    const top = kind === '+' ? a * m1 + b * m2 : a * m1 - b * m2;
    if (top <= 0) continue;
    return { a, b, d1, d2, L, m1, m2, top };
  }
}

function lcdSteps({ a, b, d1, d2, L, m1, m2, top }, sign) {
  const ans = frac(top, L);
  const steps = [
    R`List multiples to find the least common denominator of \(${d1}\) and \(${d2}\): it is \(${L}\).`,
    R`Rename both fractions: \(\frac{${a}}{${d1}} = \frac{${a * m1}}{${L}}\) and \(\frac{${b}}{${d2}} = \frac{${b * m2}}{${L}}\).`,
    R`${sign === '+' ? 'Add' : 'Subtract'} the tops: \(\frac{${a * m1}}{${L}} ${sign} \frac{${b * m2}}{${L}} = \frac{${top}}{${L}}\).`,
  ];
  if (ans.d !== L || top > L) steps.push(R`Write it in simplest form: \(\frac{${top}}{${L}} = ${ans.mixedTex()}\).`);
  return steps;
}

function hardAdd(rng) {
  const p = lcdParts(rng, '+');
  const ans = frac(p.top, p.L);
  return q({
    prompt: R`What is \(\frac{${p.a}}{${p.d1}} + \frac{${p.b}}{${p.d2}}\)? Give the answer in simplest form.`,
    correct: mixed(ans),
    wrong: [
      { value: F(p.a + p.b, p.d1 + p.d2), why: 'This adds tops and bottoms. Rename both fractions with a common denominator first.' },
      { value: mixed(frac(p.a + p.b, p.L)), why: R`The bottoms were changed to \(${p.L}\) but the tops were not. Multiply each top by the same number as its bottom.` },
      mixed(frac(p.top + 1, p.L)),
      mixed(frac(p.a * p.m2 + p.b * p.m1, p.L)),
      mixed(frac(p.top + 2, p.L)),
    ],
    solution: lcdSteps(p, '+'),
    rule: 2,
    skill: 'least common denominator',
  });
}

function hardSubtract(rng) {
  const p = lcdParts(rng, '-');
  const ans = frac(p.top, p.L);
  return q({
    prompt: R`What is \(\frac{${p.a}}{${p.d1}} - \frac{${p.b}}{${p.d2}}\)? Give the answer in simplest form.`,
    correct: mixed(ans),
    wrong: [
      { value: mixed(frac(Math.abs(p.a - p.b) || 1, p.L)), why: R`The bottoms were changed to \(${p.L}\) but the tops were not.` },
      { value: mixed(frac(p.a * p.m1 + p.b * p.m2, p.L)), why: 'This adds. The sign is a minus.' },
      mixed(frac(p.top + 1, p.L)),
      mixed(frac(p.top + 2, p.L)),
      mixed(frac(p.top + 3, p.L)),
    ],
    solution: lcdSteps(p, '-'),
    rule: 2,
    skill: 'least common denominator',
  });
}

function hardLcd(rng) {
  const { a, b, d1, d2, L } = lcdParts(rng, '+');
  return q({
    prompt: R`You want to add \(\frac{${a}}{${d1}} + \frac{${b}}{${d2}}\). What is the least common denominator?`,
    correct: L,
    wrong: [
      { value: d1 + d2, why: 'Adding the bottom numbers does not give a number both can be renamed to.' },
      L === d1 * d2 ? L * 2 : { value: d1 * d2, why: R`\(${d1 * d2}\) is a common denominator, but it is not the smallest one.` },
      { value: Math.max(d1, d2), why: R`\(${Math.min(d1, d2)}\) does not divide evenly into \(${Math.max(d1, d2)}\), so this cannot be a common denominator.` },
      Math.min(d1, d2),
    ],
    solution: [
      R`Multiples of \(${d1}\): ${[1, 2, 3, 4, 5, 6].map((i) => d1 * i).join(', ')}, …`,
      R`Multiples of \(${d2}\): ${[1, 2, 3, 4, 5, 6].map((i) => d2 * i).join(', ')}, …`,
      R`The first number in both lists is \(${L}\). That is the least common denominator.`,
    ],
    rule: 2,
    skill: 'least common denominator',
  });
}

function hardMixedLike(rng) {
  for (;;) {
    const d = rng.int(3, 9);
    const w1 = rng.int(1, 4);
    const w2 = rng.int(1, 4);
    const a = rng.int(1, d - 2);
    const b = rng.int(1, d - 2);
    if (a + b >= d || frac(a + b, d).d !== d) continue;
    return q({
      prompt: R`What is \(${mixedTex(w1, a, d)} + ${mixedTex(w2, b, d)}\)?`,
      correct: R`\(${mixedTex(w1 + w2, a + b, d)}\)`,
      wrong: [
        { value: R`\(${mixedTex(w1 + w2, a + b, 2 * d)}\)`, why: 'The bottom number stays the same when the pieces are the same size.' },
        R`\(${mixedTex(w1 + w2 + 1, a + b, d)}\)`,
        R`\(${mixedTex(w1 + w2, Math.abs(a - b) || 1, d)}\)`,
        R`\(${mixedTex(w1 + w2 + 2, a + b, d)}\)`,
      ],
      solution: [
        R`Add the whole numbers: \(${w1} + ${w2} = ${w1 + w2}\).`,
        R`Add the fractions: \(\frac{${a}}{${d}} + \frac{${b}}{${d}} = \frac{${a + b}}{${d}}\).`,
        R`Put them together: \(${mixedTex(w1 + w2, a + b, d)}\).`,
      ],
      rule: 3,
      skill: 'mixed numbers',
    });
  }
}

function hardStory(rng) {
  const p = lcdParts(rng, '-');
  const ans = frac(p.top, p.L);
  const [p1, p2] = people(rng, 2);
  return q({
    prompt: R`${p1} walked \(\frac{${p.a}}{${p.d1}}\) mile. ${p2} walked \(\frac{${p.b}}{${p.d2}}\) mile. How much farther did ${p1} walk than ${p2}? Give the answer in simplest form.`,
    correct: withUnit(ans, 'mile', 'miles'),
    wrong: [
      { value: withUnit(frac(p.a * p.m1 + p.b * p.m2, p.L), 'mile', 'miles'), why: '"How much farther" compares the two distances, so subtract.' },
      withUnit(frac(Math.abs(p.a - p.b) || 1, p.L), 'mile', 'miles'),
      withUnit(frac(p.top + 1, p.L), 'mile', 'miles'),
      withUnit(frac(p.top + 2, p.L), 'mile', 'miles'),
      withUnit(frac(p.top + 3, p.L), 'mile', 'miles'),
    ],
    solution: ['We are comparing two distances, so subtract the smaller from the larger.', ...lcdSteps(p, '-'), R`${p1} walked \(${ans.tex()}\) mile farther.`],
    rule: 2,
    skill: 'word problems',
  });
}

// ───────────── Challenge ─────────────

function challengeRegroup(rng) {
  for (;;) {
    const [d1, d2] = rng.shuffle(rng.pick(UNLIKE_PAIRS));
    const L = lcm(d1, d2);
    const a = rng.int(1, d1 - 1);
    const b = rng.int(1, d2 - 1);
    if (frac(a, d1).d !== d1 || frac(b, d2).d !== d2) continue;
    const n1 = a * (L / d1);
    const n2 = b * (L / d2);
    if (n1 >= n2) continue; // we want to need regrouping
    const w2 = rng.int(1, 3);
    const w1 = w2 + rng.int(1, 3);
    const ans = frac(w1 * L + n1, L).sub(frac(w2 * L + n2, L));
    return q({
      prompt: R`What is \(${mixedTex(w1, a, d1)} - ${mixedTex(w2, b, d2)}\)? Give the answer in simplest form.`,
      correct: mixed(ans),
      wrong: [
        { value: mixed(frac((w1 - w2) * L + (n2 - n1), L)), why: 'This takes the smaller fraction from the bigger one in the wrong order. Trade 1 whole for more pieces instead.' },
        { value: mixed(ans.add(1)), why: 'A whole was traded for pieces, so the whole number should go down by 1.' },
        mixed(frac((w1 - w2) * L + n1 + n2, L)),
        mixed(ans.add(frac(1, L))),
      ],
      solution: [
        R`Rename with the common denominator \(${L}\): \(${mixedTex(w1, n1, L)} - ${mixedTex(w2, n2, L)}\).`,
        R`\(\frac{${n1}}{${L}}\) is smaller than \(\frac{${n2}}{${L}}\), so trade 1 whole for \(\frac{${L}}{${L}}\): \(${mixedTex(w1, n1, L)} = ${mixedTex(w1 - 1, n1 + L, L)}\).`,
        R`Subtract: \(${w1 - 1} - ${w2} = ${w1 - 1 - w2}\) and \(\frac{${n1 + L}}{${L}} - \frac{${n2}}{${L}} = \frac{${n1 + L - n2}}{${L}}\).`,
        R`The answer is \(${ans.mixedTex()}\).`,
      ],
      rule: 3,
      skill: 'mixed numbers',
    });
  }
}

function challengeMissing(rng) {
  const p = lcdParts(rng, '+');
  const total = frac(p.top, p.L);
  const known = frac(p.b, p.d2);
  const ans = frac(p.a, p.d1);
  return q({
    prompt: R`What fraction goes in the box? \(\;\square + ${known.tex()} = ${total.mixedTex()}\)`,
    correct: ans,
    wrong: [
      { value: mixed(total.add(known)), why: 'To find a missing part, subtract the part you know from the total.' },
      frac(p.a + 1, p.d1),
      frac(p.a, p.d1 + 1),
      frac(p.b, p.d1),
    ],
    solution: [
      R`A missing part is the total minus the part we know: \(\square = ${total.mixedTex()} - ${known.tex()}\).`,
      R`Rename with denominator \(${p.L}\): \(\frac{${p.top}}{${p.L}} - \frac{${p.b * p.m2}}{${p.L}} = \frac{${p.a * p.m1}}{${p.L}}\).`,
      R`Simplify: \(\frac{${p.a * p.m1}}{${p.L}} = ${ans.tex()}\).`,
    ],
    rule: 2,
    skill: 'missing part',
  });
}

function challengeThree(rng) {
  for (;;) {
    const [d1, d2, d3] = rng.pick([[2, 3, 6], [2, 4, 8], [3, 4, 6], [2, 3, 4], [2, 5, 10], [3, 6, 9], [4, 6, 12], [3, 4, 12], [2, 6, 12]]);
    const L = lcm(lcm(d1, d2), d3);
    const a = rng.int(1, d1 - 1);
    const b = rng.int(1, d2 - 1);
    const c = rng.int(1, d3 - 1);
    if (frac(a, d1).d !== d1 || frac(b, d2).d !== d2 || frac(c, d3).d !== d3) continue;
    const tops = [a * (L / d1), b * (L / d2), c * (L / d3)];
    const top = tops[0] + tops[1] + tops[2];
    const ans = frac(top, L);
    return q({
      prompt: R`What is \(\frac{${a}}{${d1}} + \frac{${b}}{${d2}} + \frac{${c}}{${d3}}\)? Give the answer in simplest form.`,
      correct: mixed(ans),
      wrong: [
        { value: F(a + b + c, d1 + d2 + d3), why: 'This adds tops and bottoms. Rename all three fractions with a common denominator first.' },
        mixed(frac(a + b + c, L)),
        mixed(frac(top + 1, L)),
        mixed(frac(top - 1, L)),
        mixed(frac(top + 2, L)),
      ],
      solution: [
        R`The least common denominator of \(${d1}\), \(${d2}\) and \(${d3}\) is \(${L}\).`,
        R`Rename: \(\frac{${tops[0]}}{${L}} + \frac{${tops[1]}}{${L}} + \frac{${tops[2]}}{${L}}\).`,
        R`Add the tops: \(${tops.join(' + ')} = ${top}\), so the sum is \(\frac{${top}}{${L}}\).`,
        R`In simplest form: \(${ans.mixedTex()}\).`,
      ],
      rule: 2,
      skill: 'least common denominator',
    });
  }
}

function challengeError(rng) {
  const p = lcdParts(rng, '+');
  const name = person(rng);
  const right = frac(p.top, p.L);
  return q({
    prompt: R`${name} says \(\frac{${p.a}}{${p.d1}} + \frac{${p.b}}{${p.d2}} = \frac{${p.a + p.b}}{${p.d1 + p.d2}}\). What went wrong?`,
    correct: `${name} added the tops and the bottoms. The fractions need a common denominator first.`,
    wrong: [
      `${name} forgot to simplify the answer. Nothing else is wrong.`,
      `${name} should have multiplied the bottom numbers and kept the tops.`,
      `Nothing went wrong. The answer is correct.`,
    ],
    solution: [
      R`The pieces are different sizes (${fractionWord(p.d1)} and ${fractionWord(p.d2)}), so the tops cannot be added yet.`,
      R`Rename both with denominator \(${p.L}\): \(\frac{${p.a * p.m1}}{${p.L}} + \frac{${p.b * p.m2}}{${p.L}} = \frac{${p.top}}{${p.L}}\).`,
      R`The correct sum is \(${right.mixedTex()}\), not \(\frac{${p.a + p.b}}{${p.d1 + p.d2}}\).`,
    ],
    rule: 4,
    skill: 'checking work',
  });
}

function challengeStory(rng) {
  for (;;) {
    const d1 = rng.pick([2, 4]);
    const d2 = rng.pick([4, 8]);
    const d3 = 8;
    const L = 8;
    const start = rng.int(4, 8);
    const s = rng.int(1, d1 - 1);
    const w1 = rng.int(1, 2);
    const a = rng.int(1, d2 - 1);
    const b = rng.int(1, d3 - 1);
    if (frac(a, d2).d !== d2 || frac(b, d3).d !== d3) continue;
    const have = frac(start * d1 + s, d1);
    const use1 = frac(w1 * d2 + a, d2);
    const use2 = frac(b, d3);
    const left = have.sub(use1).sub(use2);
    if (left.value <= 0) continue;
    const name = person(rng);
    const item = rng.pick(LENGTH_THINGS);
    return q({
      prompt: R`${name} has \(${have.mixedTex()}\) feet (ft) of ${item}. ${name} uses \(${use1.mixedTex()}\) ft for one project and \(${use2.tex()}\) ft for another. How much ${item} is left? Give the answer in simplest form.`,
      correct: R`\(${left.mixedTex()}\) ft`,
      wrong: [
        { value: R`\(${have.sub(use1).mixedTex()}\) ft`, why: 'This takes away only the first project. There were two.' },
        { value: R`\(${have.add(use1).add(use2).mixedTex()}\) ft`, why: `Using ${item} makes the amount smaller, so subtract.` },
        R`\(${left.add(frac(1, L)).mixedTex()}\) ft`,
        R`\(${left.add(1).mixedTex()}\) ft`,
        R`\(${left.add(frac(1, 2)).mixedTex()}\) ft`,
      ],
      solution: [
        R`Find how much was used: \(${use1.mixedTex()} + ${use2.tex()} = ${use1.add(use2).mixedTex()}\) ft.`,
        R`Subtract from the start: \(${have.mixedTex()} - ${use1.add(use2).mixedTex()}\). Use eighths for both.`,
        R`\(${have.mixedTex()} - ${use1.add(use2).mixedTex()} = ${left.mixedTex()}\) ft is left.`,
      ],
      rule: 3,
      skill: 'word problems',
    });
  }
}

// ───────────── Interactive models ─────────────

function describeSum(a, b, c, d, op) {
  if (b === 0 || d === 0) return { error: 'A bottom number cannot be 0. You cannot cut something into 0 pieces.' };
  const L = lcm(b, d);
  const m1 = L / b;
  const m2 = L / d;
  const top = op === '+' ? a * m1 + c * m2 : a * m1 - c * m2;
  if (top < 0) return { error: 'The first fraction is smaller than the second, so the answer would be below zero. Try making the first fraction bigger.' };
  const ans = frac(top, L);
  const steps = [];
  if (b === d) {
    steps.push(R`The bottom numbers are already the same (\(${b}\)), so the pieces are the same size.`);
  } else {
    steps.push(R`The bottom numbers are different. The least common denominator of \(${b}\) and \(${d}\) is \(${L}\).`);
    steps.push(R`Rename: \(\frac{${a}}{${b}} = \frac{${a} \times ${m1}}{${b} \times ${m1}} = \frac{${a * m1}}{${L}}\) and \(\frac{${c}}{${d}} = \frac{${c} \times ${m2}}{${d} \times ${m2}} = \frac{${c * m2}}{${L}}\).`);
  }
  steps.push(R`${op === '+' ? 'Add' : 'Subtract'} the tops and keep the bottom: \(\frac{${a * m1}}{${L}} ${op} \frac{${c * m2}}{${L}} = \frac{${top}}{${L}}\).`);
  if (ans.d !== L) steps.push(R`Simplify by dividing top and bottom by \(${L / ans.d}\): \(\frac{${top}}{${L}} = ${ans.tex()}\).`);
  if (ans.d !== 1 && ans.n > ans.d) steps.push(R`As a mixed number: \(${ans.tex()} = ${ans.mixedTex()}\).`);
  const canDraw = b <= 24 && d <= 24 && L <= 48 && a / b <= 4 && c / d <= 4 && top / L <= 4;
  return {
    steps,
    ans,
    visual: canDraw
      ? { type: 'fractionBars', bars: [{ n: a, d: b }, { n: c, d }, { n: top, d: L, label: `${op === '+' ? 'Sum' : 'Difference'}: ${top}/${L}`, color: 'c' }] }
      : undefined,
  };
}

export default {
  id: 'fractions-add-sub',
  title: 'Adding & Subtracting Fractions',
  summary: 'Add and subtract fractions and mixed numbers, with the same or different denominators.',
  grade: 'Grades 4–5',
  standards: ['CCSS 4.NF.B.3', 'CCSS 5.NF.A.1', 'CCSS 5.NF.A.2'],

  explain: {
    intro: R`A fraction tells how many equal pieces you have. The bottom number (the **denominator**) says what size the pieces are. The top number (the **numerator**) counts them. You can only add or subtract pieces that are the same size.`,
    rules: [
      {
        title: 'Same bottom number: add or subtract the tops',
        text: R`When the denominators match, the pieces are the same size. Add or subtract the numerators. Keep the denominator the same.`,
        example: R`\(\frac{2}{7} + \frac{3}{7} = \frac{5}{7}\) because 2 sevenths and 3 sevenths make 5 sevenths.`,
      },
      {
        title: 'Different bottom numbers: rename first',
        text: R`When the denominators are different, the pieces are different sizes. Rename one or both fractions so the denominators match. To rename, multiply the top and the bottom by the same number.`,
        example: R`\(\frac{1}{2} + \frac{1}{4}\): rename \(\frac{1}{2}\) as \(\frac{2}{4}\). Then \(\frac{2}{4} + \frac{1}{4} = \frac{3}{4}\).`,
      },
      {
        title: 'Use the least common denominator',
        text: R`The least common denominator is the smallest number that both denominators divide into. List the multiples of each denominator and pick the first one they share.`,
        example: R`For \(\frac{1}{4}\) and \(\frac{1}{6}\): multiples of 4 are 4, 8, **12**; multiples of 6 are 6, **12**. Use 12.`,
      },
      {
        title: 'Mixed numbers: wholes with wholes, fractions with fractions',
        text: R`Add or subtract the whole numbers and the fractions separately. If the fraction you are taking away is too big, trade 1 whole for extra pieces first.`,
        example: R`\(3\frac{1}{4} - 1\frac{3}{4}\): trade to get \(2\frac{5}{4} - 1\frac{3}{4} = 1\frac{2}{4} = 1\frac{1}{2}\).`,
      },
      {
        title: 'Check that the answer makes sense',
        text: R`Estimate first. If you add two fractions that are each less than 1, the sum must be less than 2. If you add to a number, the answer should be bigger than what you started with.`,
        example: R`\(\frac{1}{2} + \frac{1}{3}\) cannot be \(\frac{2}{5}\), because \(\frac{2}{5}\) is smaller than \(\frac{1}{2}\).`,
      },
    ],
    vocab: [
      { term: 'numerator', def: 'The top number of a fraction. It counts the pieces.' },
      { term: 'denominator', def: 'The bottom number. It tells how many equal pieces make one whole.' },
      { term: 'common denominator', def: 'A denominator that two fractions can share, so their pieces are the same size.' },
      { term: 'simplest form', def: 'A fraction whose top and bottom have no common factor except 1.' },
    ],
    mistakes: [
      R`Adding the bottoms: \(\frac{1}{2} + \frac{1}{3}\) is **not** \(\frac{2}{5}\). Only the tops are added, and only after the bottoms match.`,
      R`Renaming the bottom but not the top. If you multiply the bottom by 3, multiply the top by 3 too.`,
      'Forgetting to simplify when the question asks for simplest form.',
    ],
    visual: { type: 'fractionBars', bars: [{ n: 1, d: 2 }, { n: 2, d: 4, label: '1/2 renamed as 2/4' }, { n: 1, d: 4 }, { n: 3, d: 4, label: '2/4 + 1/4 = 3/4', color: 'c' }], alt: 'Fraction bars: one half is the same amount as two fourths; two fourths plus one fourth makes three fourths.' },
  },

  examples: [
    {
      title: 'Same denominators',
      problem: R`Find \(\frac{3}{8} + \frac{4}{8}\).`,
      steps: [
        R`Both fractions are eighths, so the pieces are the same size.`,
        R`Add the numerators: \(3 + 4 = 7\).`,
        R`Keep the denominator: \(\frac{7}{8}\).`,
      ],
      answer: R`\(\frac{7}{8}\)`,
      visual: barsFor([[3, 8], [4, 8], [7, 8]]),
    },
    {
      title: 'Different denominators',
      problem: R`Find \(\frac{2}{3} - \frac{1}{4}\).`,
      steps: [
        R`Thirds and fourths are different sizes. Multiples of 3: 3, 6, 9, **12**. Multiples of 4: 4, 8, **12**. Use 12.`,
        R`Rename: \(\frac{2}{3} = \frac{8}{12}\) (multiply top and bottom by 4) and \(\frac{1}{4} = \frac{3}{12}\) (multiply top and bottom by 3).`,
        R`Subtract the numerators: \(\frac{8}{12} - \frac{3}{12} = \frac{5}{12}\).`,
        R`5 and 12 share no factor, so \(\frac{5}{12}\) is in simplest form.`,
      ],
      answer: R`\(\frac{5}{12}\)`,
    },
    {
      title: 'Word problem: putting amounts together',
      word: true,
      problem: R`Lucia ran \(\frac{3}{4}\) mile before school and \(\frac{5}{8}\) mile after school. How far did Lucia run in all?`,
      steps: [
        R`The two distances are put together, so add: \(\frac{3}{4} + \frac{5}{8}\).`,
        R`8 is a multiple of 4, so use eighths: \(\frac{3}{4} = \frac{6}{8}\).`,
        R`Add: \(\frac{6}{8} + \frac{5}{8} = \frac{11}{8}\).`,
        R`\(\frac{11}{8}\) is more than 1. Write it as a mixed number: \(1\frac{3}{8}\).`,
      ],
      answer: R`\(1\frac{3}{8}\) miles`,
      visual: { type: 'barModel', rows: [{ parts: [{ value: 6, label: '3/4 mile' }, { value: 5, label: '5/8 mile' }], total: '? miles in all' }], alt: 'A bar made of two parts, three fourths of a mile and five eighths of a mile, with the total unknown.' },
    },
    {
      title: 'Word problem: how much is left',
      word: true,
      problem: R`A board is \(4\frac{1}{3}\) feet long. Omar cuts off \(1\frac{2}{3}\) feet. How long is the board now?`,
      steps: [
        R`Some is taken away, so subtract: \(4\frac{1}{3} - 1\frac{2}{3}\).`,
        R`\(\frac{1}{3}\) is smaller than \(\frac{2}{3}\), so trade 1 whole for \(\frac{3}{3}\): \(4\frac{1}{3} = 3\frac{4}{3}\).`,
        R`Subtract the wholes and the fractions: \(3 - 1 = 2\) and \(\frac{4}{3} - \frac{2}{3} = \frac{2}{3}\).`,
      ],
      answer: R`\(2\frac{2}{3}\) feet`,
    },
  ],

  models: [
    {
      id: 'two-fractions',
      title: 'Add or subtract any two fractions',
      intro: 'Type your own numbers. Watch the bars and the steps change.',
      inputs: [
        { name: 'a', label: 'First top number', type: 'int', min: 0, max: 30, value: 1 },
        { name: 'b', label: 'First bottom number', type: 'int', min: 1, max: 20, value: 2 },
        { name: 'op', label: 'Add or subtract', type: 'select', options: [{ value: '+', label: 'add (+)' }, { value: '-', label: 'subtract (−)' }], value: '+' },
        { name: 'c', label: 'Second top number', type: 'int', min: 0, max: 30, value: 1 },
        { name: 'd', label: 'Second bottom number', type: 'int', min: 1, max: 20, value: 3 },
      ],
      compute({ a, b, op, c, d }) {
        const r = describeSum(a, b, c, d, op);
        if (r.error) return r;
        return {
          problem: R`\(\frac{${a}}{${b}} ${op} \frac{${c}}{${d}}\)`,
          steps: r.steps,
          answer: R`\(${r.ans.mixedTex()}\)`,
          visual: r.visual,
        };
      },
    },
    {
      id: 'two-walks',
      title: 'Word problem: two parts of a walk',
      word: true,
      intro: 'Change the distances in the story.',
      inputs: [
        { name: 'a', label: 'Morning: top number', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'b', label: 'Morning: bottom number', type: 'int', min: 1, max: 12, value: 4 },
        { name: 'c', label: 'Afternoon: top number', type: 'int', min: 1, max: 12, value: 1 },
        { name: 'd', label: 'Afternoon: bottom number', type: 'int', min: 1, max: 12, value: 2 },
      ],
      compute({ a, b, c, d }) {
        const r = describeSum(a, b, c, d, '+');
        if (r.error) return r;
        return {
          problem: R`Maya walks \(\frac{${a}}{${b}}\) mile in the morning and \(\frac{${c}}{${d}}\) mile in the afternoon. How far does Maya walk in all?`,
          steps: [R`The two walks are put together, so add: \(\frac{${a}}{${b}} + \frac{${c}}{${d}}\).`, ...r.steps],
          answer: R`\(${r.ans.mixedTex()}\) ${r.ans.value > 1 ? 'miles' : 'mile'}`,
          visual: r.visual,
        };
      },
    },
  ],

  quiz: {
    easy: [easyAdd, easySubtract, easyPicture, easyStory],
    medium: [mediumAdd, mediumSubtract, mediumStory],
    hard: [hardAdd, hardSubtract, hardLcd, hardMixedLike, hardStory],
    challenge: [challengeRegroup, challengeMissing, challengeThree, challengeError, challengeStory],
  },
};
