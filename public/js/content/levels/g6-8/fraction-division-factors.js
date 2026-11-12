import { R, q, num, frac, Frac, fracTex, gcd, lcm, isPrime, primeFactors, divisors, person, people, fractionWord, range } from '../../lib/index.js';
import { mixed, fracLabel } from './_shared.js';

// A fraction exactly as written; a denominator of 1 is left out.
const fr = (n, d) => (d === 1 ? `${n}` : R`\frac{${n}}{${d}}`);
// A product that leaves out a factor of 1.
const times = (a, b) => (a === 1 ? `${b}` : b === 1 ? `${a}` : R`${a} \times ${b}`);
// "A = B = C" without repeating a part that did not change.
const chain = (...parts) => parts.filter((p, i) => i === 0 || p !== parts[i - 1]).join(' = ');
const primes = (n) => primeFactors(n).join(R` \times `);

function proper(rng, lo = 2, hi = 9) {
  for (;;) {
    const d = rng.int(lo, hi);
    const n = rng.int(1, d - 1);
    if (gcd(n, d) === 1) return frac(n, d);
  }
}

function mixedNumber(rng) {
  for (;;) {
    const d = rng.int(2, 6);
    const n = rng.int(1, d - 1);
    if (gcd(n, d) === 1) return frac(rng.int(1, 5) * d + n, d);
  }
}

/** Steps for (a/b) ÷ (c/d), using the numbers exactly as given. */
function divideSteps(a, b, c, d) {
  const N = a * d;
  const D = b * c;
  const ans = frac(N, D);
  const worked = D === 1 ? times(a, d) : R`\frac{${times(a, d)}}{${times(b, c)}}`;
  const steps = [
    R`Dividing by \(${fr(c, d)}\) is the same as multiplying by its reciprocal, \(${fr(d, c)}\).`,
    R`Multiply: \(${chain(R`${fr(a, b)} \times ${fr(d, c)}`, worked, fr(N, D))}\).`,
  ];
  if (ans.d !== D) steps.push(R`Simplify by dividing the top and bottom by \(${D / ans.d}\): \(${fr(N, D)} = ${ans.tex()}\).`);
  if (ans.d !== 1 && ans.n > ans.d) steps.push(R`As a mixed number: \(${ans.tex()} = ${ans.mixedTex()}\).`);
  return steps;
}

/** Two numbers a = g·m and b = g·n whose greatest common factor is exactly g. */
function gcfPair(rng, gs, lo, hi, max) {
  for (;;) {
    const g = rng.pick(gs);
    const m = rng.int(lo, hi);
    const n = rng.int(lo, hi);
    if (m === n || gcd(m, n) !== 1 || g * m > max || g * n > max) continue;
    return { g, m, n, a: g * m, b: g * n };
  }
}

const isGcf = (a, b, g) => () => (a % g === 0 && b % g === 0 && gcd(a / g, b / g) === 1 ? true : `${g} is not the GCF of ${a} and ${b}`);
const isLcm = (nums, L) => () => {
  if (nums.some((n) => L % n !== 0)) return `${L} is not a common multiple`;
  for (let k = Math.max(...nums); k < L; k++) if (nums.every((n) => k % n === 0)) return `${k} is a smaller common multiple`;
  return true;
};
const multiplesTo = (n, L) => range(1, L / n).map((i) => n * i).join(', ');

// ───────────── Easy ─────────────

function easyWholeByUnit(rng) {
  const W = rng.int(2, 6);
  const d = rng.int(2, 8);
  const ans = W * d;
  return q({
    prompt: R`What is \(${W} \div \frac{1}{${d}}\)? (How many ${fractionWord(d)} fit in ${W} wholes?)`,
    visual: { type: 'fractionBars', bars: [{ n: W * d, d, label: `${W} wholes, each cut into ${fractionWord(d)}` }], alt: `${W} whole bars, each cut into ${d} equal pieces.` },
    correct: ans,
    wrong: [
      { value: frac(W, d), why: R`That is \(${W} \times \frac{1}{${d}}\). Dividing by \(\frac{1}{${d}}\) asks how many ${fractionWord(d)} fit in ${W} wholes, so the answer is greater than ${W}.` },
      { value: W + d, why: `Each whole holds ${d} ${fractionWord(d)}, so multiply ${W} by ${d}.` },
      ans + d,
      ans - 1,
    ],
    solution: [
      R`Each whole holds \(${d}\) pieces of size \(\frac{1}{${d}}\).`,
      R`So ${W} wholes hold \(${W} \times ${d} = ${ans}\) pieces.`,
      R`\(${W} \div \frac{1}{${d}} = ${ans}\).`,
    ],
    rule: 0,
    skill: 'dividing by a unit fraction',
    check: () => (ans / d === W ? true : 'quotient times divisor is not the dividend'),
  });
}

function easySameDenominator(rng) {
  for (;;) {
    const d = rng.int(5, 12);
    const b = rng.int(2, 4);
    const k = rng.int(2, 5);
    const a = b * k;
    if (a >= d) continue;
    return q({
      prompt: R`What is \(\frac{${a}}{${d}} \div \frac{${b}}{${d}}\)? (How many groups of ${b} ${fractionWord(d)} fit in ${a} ${fractionWord(d)}?)`,
      visual: { type: 'fractionBars', bars: [{ n: a, d }, { n: b, d }], alt: `Two bars cut into ${fractionWord(d)}: ${a} shaded in the first and ${b} shaded in the second.` },
      correct: k,
      wrong: [
        { value: R`\(${fracTex(k, d)}\)`, why: `The answer counts groups, so it is a whole number, not a number of ${fractionWord(d)}.` },
        { value: R`\(${fracTex(a * b, d * d)}\)`, why: 'That multiplies the fractions. Division asks how many of the second fit in the first.' },
        { value: R`\(${fracTex(a - b, d)}\)`, why: 'That subtracts. Division asks how many groups fit.' },
        k + 1,
      ],
      solution: [
        `Both fractions are ${fractionWord(d)}, so the pieces are the same size.`,
        R`Ask how many groups of \(${b}\) pieces fit in \(${a}\) pieces: \(${a} \div ${b} = ${k}\).`,
        R`So \(\frac{${a}}{${d}} \div \frac{${b}}{${d}} = ${k}\).`,
      ],
      rule: 0,
      skill: 'meaning of division',
      check: () => (k * b === a ? true : 'groups do not fit exactly'),
    });
  }
}

function easyReciprocal(rng) {
  for (;;) {
    const n = rng.int(1, 12);
    const d = rng.int(1, 12);
    if (n === d || gcd(n, d) !== 1) continue;
    const x = frac(n, d);
    const ans = x.inv();
    return q({
      prompt: R`What is the reciprocal of \(${x.tex()}\)?`,
      correct: ans,
      wrong: [
        { value: x, why: 'That is the same number. Swap the top and bottom numbers to get the reciprocal.' },
        n < d ? { value: frac(d - n, d), why: 'That is the amount needed to reach 1 by adding. A reciprocal reaches 1 by multiplying.' } : null,
        frac(1, n * d),
        ans.add(1),
      ],
      solution: [
        d === 1 ? R`Write the whole number as a fraction: \(${n} = \frac{${n}}{1}\).` : R`To find a reciprocal, swap the numerator and the denominator.`,
        R`The reciprocal of \(${x.tex()}\) is \(${ans.tex()}\).`,
        R`Check: \(${x.tex()} \times ${ans.tex()} = 1\). ✓`,
      ],
      rule: 1,
      skill: 'reciprocals',
      check: () => (x.mul(ans).eq(1) ? true : 'product is not 1'),
    });
  }
}

function easyGCF(rng) {
  const { g, a, b } = gcfPair(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10], 1, 6, 48);
  const sub = divisors(g).filter((x) => x > 1 && x < g).pop();
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
  return q({
    prompt: `What is the greatest common factor (GCF) of ${a} and ${b}?`,
    correct: g,
    wrong: [
      sub ? { value: sub, why: `${sub} is a common factor, but a greater number also divides both.` } : null,
      { value: lcm(a, b), why: 'That is the least common multiple. A factor of a number is never greater than the number itself.' },
      lo !== g ? { value: lo, why: `${lo} does not divide ${hi} evenly, so it is not a common factor.` } : null,
      { value: 1, why: '1 divides every number, but a greater number also divides both of these.' },
      g * 2,
    ],
    solution: [`Factors of ${a}: ${divisors(a).join(', ')}.`, `Factors of ${b}: ${divisors(b).join(', ')}.`, `The greatest number in both lists is ${g}.`],
    rule: 3,
    skill: 'greatest common factor',
    check: isGcf(a, b, g),
  });
}

function easyLCM(rng) {
  const a = rng.int(2, 12);
  const b = rng.intExcept(2, 12, [a]);
  const L = lcm(a, b);
  return q({
    prompt: `What is the least common multiple (LCM) of ${a} and ${b}?`,
    correct: L,
    wrong: [
      a * b !== L ? { value: a * b, why: `${a * b} is a common multiple, but a smaller one exists.` } : null,
      gcd(a, b) > 1 ? { value: gcd(a, b), why: 'That is the greatest common factor. A common multiple is at least as large as both numbers.' } : null,
      L !== Math.max(a, b) ? { value: Math.max(a, b), why: `${Math.min(a, b)} does not divide ${Math.max(a, b)} evenly, so it is not a multiple of both.` } : null,
      { value: L * 2, why: `${L * 2} is a common multiple, but a smaller one exists.` },
      a + b,
    ],
    solution: [`Multiples of ${a}: ${multiplesTo(a, L)}, …`, `Multiples of ${b}: ${multiplesTo(b, L)}, …`, `The first number in both lists is ${L}.`],
    rule: 4,
    skill: 'least common multiple',
    check: isLcm([a, b], L),
  });
}

// ───────────── Medium ─────────────

function mediumFracDivFrac(rng) {
  for (;;) {
    const x = proper(rng);
    const y = proper(rng);
    const ans = x.div(y);
    if (x.eq(y) || ans.d > 40 || ans.n > 60) continue;
    return q({
      prompt: R`What is \(${x.tex()} \div ${y.tex()}\)? Give the answer in simplest form.`,
      correct: ans,
      fmt: mixed,
      wrong: [
        { value: x.mul(y), why: 'That multiplies the fractions as they are. To divide, multiply by the reciprocal of the second fraction.' },
        { value: y.div(x), why: 'Flip the second fraction (the one you are dividing by), not the first.' },
        { value: x.mul(y).inv(), why: 'Only the second fraction is flipped, not both.' },
      ],
      solution: divideSteps(x.n, x.d, y.n, y.d),
      rule: 1,
      skill: 'dividing fractions',
      check: () => (ans.mul(y).eq(x) ? true : 'quotient times divisor is not the dividend'),
    });
  }
}

const SERVINGS = [
  { text: (W, p, u) => `A pitcher holds ${W} cups of juice. Each glass holds ${p} ${u}. How many glasses can be filled?`, one: 'glass', many: 'glasses', unit: 'cup' },
  { text: (W, p, u) => `A ribbon is ${W} meters long. It is cut into pieces that are each ${p} ${u} long. How many pieces are there?`, one: 'piece', many: 'pieces', unit: 'meter' },
  { text: (W, p, u) => `A baker has ${W} pounds of dough. Each loaf uses ${p} ${u}. How many loaves can the baker make?`, one: 'loaf', many: 'loaves', unit: 'pound' },
  { text: (W, p, u) => `A conference lasts ${W} hours. Each talk takes ${p} ${u}. How many talks fit in the conference?`, one: 'talk', many: 'talks', unit: 'hour' },
  { text: (W, p, u) => `A trail is ${W} miles long. It is split into sections that are each ${p} ${u} long. How many sections are there?`, one: 'section', many: 'sections', unit: 'mile' },
];

// "Write the mixed number(s) as improper fraction(s): …", or null when nothing needs rewriting.
function improperStep(...fs) {
  const m = fs.filter((f) => f.d !== 1 && f.n > f.d);
  if (!m.length) return null;
  return R`Write the mixed ${m.length > 1 ? 'numbers as improper fractions' : 'number as an improper fraction'}: \(${m.map((f) => `${f.mixedTex()} = ${f.tex()}`).join(R`\) and \(`)}\).`;
}

function mediumServings(rng) {
  const c = rng.pick(SERVINGS);
  const p = rng.pick([frac(1, 2), frac(1, 3), frac(2, 3), frac(1, 4), frac(3, 4), frac(2, 5), frac(3, 5), frac(3, 8), frac(1, 6), frac(1, 8)]);
  const W = p.n * rng.int(Math.ceil(2 / p.n), Math.floor(12 / p.n));
  const ans = (W * p.d) / p.n;
  const fmt = (v) => `${mixed(v)} ${(v instanceof Frac ? v.eq(1) : v === 1) ? c.one : c.many}`;
  return q({
    prompt: c.text(W, R`\(${p.tex()}\)`, c.unit),
    correct: ans,
    fmt,
    wrong: [
      { value: p.mul(W), why: R`That multiplies. "How many \(${p.tex()}\) fit in ${W}" is a division.` },
      p.n !== 1 ? { value: W * p.d, why: R`That counts pieces of size \(\frac{1}{${p.d}}\). Each ${c.one} uses ${p.n} of them, so divide by ${p.n} as well.` } : null,
      ans + 1,
      ans + 2,
      ans - 1,
    ],
    solution: [R`The story asks how many groups of \(${p.tex()}\) fit in ${W}, so divide: \(${W} \div ${p.tex()}\).`, ...divideSteps(W, 1, p.n, p.d), `That makes ${ans} ${ans === 1 ? c.one : c.many}.`],
    rule: 0,
    skill: 'word problems',
    check: () => (p.mul(ans).eq(W) ? true : 'servings do not use the whole amount'),
  });
}

function sharedPrimes(a, b) {
  const rest = primeFactors(b);
  return primeFactors(a).filter((p) => {
    const i = rest.indexOf(p);
    if (i >= 0) rest.splice(i, 1);
    return i >= 0;
  });
}

function mediumGCF(rng) {
  const { g, m, a, b } = gcfPair(rng, [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20], 2, 7, 100);
  const sub = divisors(g).filter((x) => x > 1 && x < g).pop();
  const extra = g * primeFactors(m)[0];
  const shared = sharedPrimes(a, b);
  return q({
    prompt: `What is the greatest common factor (GCF) of ${a} and ${b}?`,
    correct: g,
    wrong: [
      { value: sub, why: `${sub} is a common factor, but a greater number also divides both.` },
      { value: extra, why: `${extra} divides ${a} but not ${b}.` },
      g * 2 !== extra ? g * 2 : g * 3,
      2,
    ],
    solution: [
      R`Write each number as a product of primes: \(${a} = ${primes(a)}\) and \(${b} = ${primes(b)}\).`,
      shared.length > 1 ? R`The prime factors they share are \(${shared.join(R` \times `)}\).` : R`The only prime factor they share is \(${shared[0]}\).`,
      shared.length > 1 ? R`Multiply the shared factors: the GCF is \(${g}\).` : R`So the GCF is \(${g}\).`,
    ],
    rule: 3,
    skill: 'greatest common factor',
    check: isGcf(a, b, g),
  });
}

function lcmPair(rng, lo, hi, max) {
  for (;;) {
    const a = rng.int(lo, hi);
    const b = rng.int(lo, hi);
    const L = lcm(a, b);
    if (a === b || gcd(a, b) === 1 || L === Math.max(a, b) || L > max) continue;
    return { a, b, L };
  }
}

function mediumLCM(rng) {
  const { a, b, L } = lcmPair(rng, 4, 20, 100);
  return q({
    prompt: `What is the least common multiple (LCM) of ${a} and ${b}?`,
    correct: L,
    wrong: [
      { value: a * b, why: `${a * b} is a common multiple, but a smaller one exists.` },
      { value: gcd(a, b), why: 'That is the greatest common factor. A common multiple is at least as large as both numbers.' },
      a + b,
      L * 2,
    ],
    solution: [`Multiples of ${a}: ${multiplesTo(a, L)}, …`, `Multiples of ${b}: ${multiplesTo(b, L)}, …`, `The first number in both lists is ${L}.`],
    rule: 4,
    skill: 'least common multiple',
    check: isLcm([a, b], L),
  });
}

function mediumFactorSum(rng) {
  const { g, m, n, a, b } = gcfPair(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 12], 2, 9, 100);
  const p = divisors(g).find((x) => x > 1 && x < g);
  return q({
    prompt: R`Use the greatest common factor to rewrite \(${a} + ${b}\) as a product: the GCF times a sum of two numbers with no common factor.`,
    correct: R`\(${g}(${m} + ${n})\)`,
    wrong: [
      p ? { value: R`\(${p}(${a / p} + ${b / p})\)`, why: R`This equals \(${a} + ${b}\), but \(${a / p}\) and \(${b / p}\) still share the factor \(${g / p}\), so \(${p}\) is not the greatest common factor.`, form: true } : null,
      { value: R`\(${g}(${m} + ${b})\)`, why: R`Both numbers must be divided by \(${g}\), not just the first.` },
      R`\(${g}(${a} + ${n})\)`,
      g !== m ? R`\(${m}(${g} + ${n})\)` : null,
      R`\(${g}(${m} + ${n + 1})\)`,
      R`\(${g}(${m + 1} + ${n})\)`,
    ],
    solution: [
      R`The GCF of \(${a}\) and \(${b}\) is \(${g}\).`,
      R`Divide each number by \(${g}\): \(${a} \div ${g} = ${m}\) and \(${b} \div ${g} = ${n}\).`,
      R`So \(${a} + ${b} = ${g}(${m} + ${n})\). Check: \(${g} \times ${m + n} = ${a + b}\). ✓`,
    ],
    rule: 5,
    skill: 'factoring a sum',
    check: () => (g * (m + n) === a + b && gcd(m, n) === 1 ? true : 'factored form is wrong'),
  });
}

// ───────────── Hard ─────────────

function hardMixedDivide(rng) {
  for (;;) {
    const x = mixedNumber(rng);
    const kind = rng.pick(['mixed', 'mixed', 'proper', 'whole']);
    const y = kind === 'mixed' ? mixedNumber(rng) : kind === 'proper' ? proper(rng, 2, 6) : frac(rng.int(2, 6));
    const ans = x.div(y);
    if (x.eq(y) || ans.d > 30) continue;
    const wx = Math.floor(x.value);
    const wy = Math.floor(y.value);
    const partByPart = kind === 'mixed' ? frac(wx, wy).add(x.sub(wx).div(y.sub(wy))) : null;
    return q({
      prompt: R`What is \(${x.mixedTex()} \div ${y.mixedTex()}\)? Give the answer in simplest form.`,
      correct: ans,
      fmt: mixed,
      wrong: [
        { value: x.mul(y), why: 'That multiplies. To divide, multiply by the reciprocal of the second number.' },
        partByPart ? { value: partByPart, why: 'Mixed numbers cannot be divided part by part. Change each one to an improper fraction first.' } : null,
        { value: y.div(x), why: 'Flip the second number (the one you are dividing by), not the first.' },
      ],
      solution: [
        kind === 'mixed'
          ? R`Write both mixed numbers as improper fractions: \(${x.mixedTex()} = ${x.tex()}\) and \(${y.mixedTex()} = ${y.tex()}\).`
          : R`Write the mixed number as an improper fraction: \(${x.mixedTex()} = ${x.tex()}\).`,
        ...divideSteps(x.n, x.d, y.n, y.d),
      ],
      rule: 2,
      skill: 'dividing mixed numbers',
      check: () => (ans.mul(y).eq(x) ? true : 'quotient times divisor is not the dividend'),
    });
  }
}

function hardStoryFracDiv(rng) {
  for (;;) {
    const c = rng.pick(SERVINGS);
    const p = rng.pick([frac(1, 2), frac(2, 3), frac(3, 4), frac(2, 5), frac(3, 5), frac(3, 8), frac(5, 8), frac(5, 6), frac(3, 2), frac(5, 4), frac(4, 3)]);
    const k = rng.int(3, 12);
    const L = p.mul(k);
    if (L.isInt()) continue;
    const fmt = (v) => `${mixed(v)} ${(v instanceof Frac ? v.eq(1) : v === 1) ? c.one : c.many}`;
    return q({
      prompt: c.text(R`\(${L.mixedTex()}\)`, R`\(${p.mixedTex()}\)`, p.value > 1 ? `${c.unit}s` : c.unit),
      correct: k,
      fmt,
      wrong: [
        { value: L.mul(p), why: R`That multiplies. "How many \(${p.mixedTex()}\) fit in \(${L.mixedTex()}\)" is a division.` },
        p.n !== 1 ? { value: L.mul(p.d), why: R`That counts pieces of size \(\frac{1}{${p.d}}\). Each ${c.one} uses ${p.n} of them, so divide by ${p.n} as well.` } : null,
        k + 1,
        k - 1,
        k + 2,
      ],
      solution: [
        R`The story asks how many groups of \(${p.mixedTex()}\) fit in \(${L.mixedTex()}\), so divide: \(${L.mixedTex()} \div ${p.mixedTex()}\).`,
        improperStep(L, p),
        ...divideSteps(L.n, L.d, p.n, p.d),
        `That makes ${k} ${c.many}.`,
      ].filter(Boolean),
      rule: 2,
      skill: 'word problems',
      check: () => (p.mul(k).eq(L) ? true : 'pieces do not use the whole amount'),
    });
  }
}

const GCF_STORIES = [
  { a: 'roses', b: 'tulips', many: 'bouquets', one: 'bouquet', lead: (p, A, B) => `${p} has ${A} roses and ${B} tulips. ${p} wants to make bouquets that are all exactly the same and to use every flower.` },
  { a: 'pencils', b: 'erasers', many: 'gift bags', one: 'gift bag', lead: (p, A, B) => `${p} has ${A} pencils and ${B} erasers. ${p} wants to pack gift bags that are all exactly the same and to use every item.` },
  { a: 'apples', b: 'oranges', many: 'fruit baskets', one: 'basket', lead: (p, A, B) => `${p} has ${A} apples and ${B} oranges. ${p} wants to fill fruit baskets that are all exactly the same and to use all the fruit.` },
  { a: 'red beads', b: 'blue beads', many: 'bracelets', one: 'bracelet', lead: (p, A, B) => `${p} has ${A} red beads and ${B} blue beads. ${p} wants to make bracelets that are all exactly the same and to use every bead.` },
  { a: 'sixth graders', b: 'seventh graders', many: 'teams', one: 'team', lead: (p, A, B) => `Coach ${p} has ${A} sixth graders and ${B} seventh graders. Every team must have the same number of sixth graders and the same number of seventh graders, and everyone must be on a team.` },
];

function hardGCFStory(rng) {
  const { g, m, n, a, b } = gcfPair(rng, [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16], 2, 7, 100);
  const s = rng.pick(GCF_STORIES);
  const p = person(rng);
  const askGroups = rng.bool(0.6);
  const sub = divisors(g).filter((x) => x > 1 && x < g).pop();
  const steps = [
    `Each ${s.one} gets the same number of ${s.a} and the same number of ${s.b}, so the number of ${s.many} must divide both ${a} and ${b}. The greatest such number is the GCF.`,
    R`\(${a} = ${primes(a)}\) and \(${b} = ${primes(b)}\), so the GCF is \(${g}\).`,
  ];
  if (askGroups) {
    return q({
      prompt: `${s.lead(p, a, b)} What is the greatest number of ${s.many} that can be made?`,
      correct: g,
      wrong: [
        sub ? { value: sub, why: `${sub} ${s.many} would work, but a greater number is possible.` } : null,
        { value: m, why: `That is the number of ${s.a} in each ${s.one}, not the number of ${s.many}.` },
        { value: lcm(a, b), why: 'That is the least common multiple. Splitting into equal groups uses the greatest common factor.' },
        Math.abs(a - b),
        g + 1,
      ],
      solution: [...steps, `The greatest number of ${s.many} is ${g}. Each has ${m} ${s.a} and ${n} ${s.b}.`],
      rule: 6,
      skill: 'GCF word problems',
      check: isGcf(a, b, g),
    });
  }
  return q({
    prompt: `${s.lead(p, a, b)} When the greatest possible number of ${s.many} is made, how many ${s.a} are in each ${s.one}?`,
    correct: m,
    wrong: [
      { value: g, why: `That is the number of ${s.many}. The question asks how many ${s.a} go in each one.` },
      { value: n, why: `That is the number of ${s.b} in each ${s.one}.` },
      m + n,
      m + 1,
      m * 2,
    ],
    solution: [...steps, R`There are ${g} ${s.many}, so each one gets \(${a} \div ${g} = ${m}\) ${s.a}.`],
    rule: 6,
    skill: 'GCF word problems',
    check: isGcf(a, b, g),
  });
}

function hardLCMStory(rng) {
  const { a, b, L } = lcmPair(rng, 4, 20, 120);
  const [p1, p2] = people(rng, 2);
  const s = rng.pick([
    { text: `Bus A leaves the station every ${a} minutes. Bus B leaves every ${b} minutes. Both buses leave at 8:00. After how many minutes will they next leave at the same time?`, unit: 'minutes', what: 'leaving times' },
    { text: `A red light flashes every ${a} seconds. A blue light flashes every ${b} seconds. They flash together now. After how many seconds will they next flash together?`, unit: 'seconds', what: 'flashes' },
    { text: `${p1} goes swimming every ${a} days. ${p2} goes swimming every ${b} days. Both swim today. After how many days will they next swim on the same day?`, unit: 'days', what: 'swimming days' },
    { text: `Hot dogs come in packs of ${a}. Buns come in packs of ${b}. What is the smallest number of hot dogs you can buy and still have exactly one bun for every hot dog?`, unit: 'hot dogs', what: 'totals' },
  ]);
  return q({
    prompt: s.text,
    correct: L,
    unit: s.unit,
    wrong: [
      { value: a * b, why: `That is a common multiple of ${a} and ${b}, but a smaller one comes first.` },
      { value: gcd(a, b), why: 'That is the greatest common factor. Things that repeat line up again at a common multiple.' },
      a + b,
      L * 2,
    ],
    solution: [
      `The ${s.what} are multiples of ${a} and multiples of ${b}. They match at common multiples, and the first match is the LCM.`,
      `Multiples of ${a}: ${multiplesTo(a, L)}, …`,
      `Multiples of ${b}: ${multiplesTo(b, L)}, …`,
      `The first number in both lists is ${L}, so the answer is ${L} ${s.unit}.`,
    ],
    rule: 6,
    skill: 'LCM word problems',
    check: isLcm([a, b], L),
  });
}

// ───────────── Challenge ─────────────

function challengeMissing(rng) {
  for (;;) {
    const box = rng.bool(0.6) ? proper(rng, 2, 8) : mixedNumber(rng);
    const quo = proper(rng, 2, 6);
    const total = box.mul(quo);
    if (total.d > 40 || box.eq(quo) || total.isInt()) continue;
    return q({
      prompt: R`What number goes in the box? \(\;${total.mixedTex()} \div \square = ${quo.tex()}\)`,
      correct: box,
      fmt: mixed,
      wrong: [
        { value: total.mul(quo), why: 'The box is the dividend divided by the quotient, not multiplied by it.' },
        { value: quo.div(total), why: 'That divides the wrong way round. Divide the first number by the answer.' },
        total.add(quo),
      ],
      solution: [
        R`If \(${total.mixedTex()} \div \square = ${quo.tex()}\), then \(\square \times ${quo.tex()} = ${total.mixedTex()}\). So \(\square = ${total.mixedTex()} \div ${quo.tex()}\).`,
        improperStep(total),
        ...divideSteps(total.n, total.d, quo.n, quo.d),
      ].filter(Boolean),
      rule: 1,
      skill: 'missing divisor',
      check: () => (total.div(box).eq(quo) ? true : 'the box does not give the stated quotient'),
    });
  }
}

function challengeAreaWidth(rng) {
  const small = () => {
    const d = rng.int(2, 5);
    const n = rng.int(1, d - 1);
    return gcd(n, d) === 1 ? frac(rng.int(0, 3) * d + n, d) : small();
  };
  for (;;) {
    const len = small();
    const wid = small();
    const area = len.mul(wid);
    if (area.isInt() || area.d > 25 || len.eq(wid) || len.value < 1) continue;
    const thing = rng.pick(['garden bed', 'poster', 'tabletop', 'rug', 'window']);
    const [one, many] = rng.pick([['meter', 'meters'], ['foot', 'feet'], ['yard', 'yards']]);
    const u = (f) => (f.value > 1 ? many : one);
    return q({
      prompt: R`A rectangular ${thing} has an area of \(${area.mixedTex()}\) square ${many}. Its width is \(${wid.mixedTex()}\) ${u(wid)}. What is its length?`,
      correct: len,
      fmt: (v) => `${mixed(v)} ${u(v)}`,
      wrong: [
        { value: area.mul(wid), why: 'Area is length times width, so the length is the area divided by the width.' },
        { value: wid.div(area), why: 'That divides the wrong way round. Divide the area by the width.' },
        area.gt(wid) ? area.sub(wid) : area.add(wid),
      ],
      solution: [
        R`Area = length × width, so length = area ÷ width: \(${area.mixedTex()} \div ${wid.mixedTex()}\).`,
        improperStep(area, wid),
        ...divideSteps(area.n, area.d, wid.n, wid.d),
        R`The length is \(${len.mixedTex()}\) ${u(len)}.`,
      ].filter(Boolean),
      rule: 2,
      skill: 'word problems',
      check: () => (len.mul(wid).eq(area) ? true : 'length times width is not the area'),
    });
  }
}

function challengeGcfLcmProduct(rng) {
  const { g, m, n, a, b } = gcfPair(rng, [2, 3, 4, 5, 6, 7, 8, 9], 2, 7, 70);
  const L = g * m * n;
  return q({
    prompt: `Two numbers have a greatest common factor of ${g} and a least common multiple of ${L}. One of the numbers is ${a}. What is the other number?`,
    correct: b,
    wrong: [
      { value: n, why: `${L} ÷ ${a} = ${n} is only the part the other number does not share with ${a}. Multiply it by the GCF.` },
      m * n !== a ? { value: m * n, why: `That is ${L} ÷ ${g}. Divide the LCM by the known number first, then multiply by the GCF.` } : null,
      L - a,
      b + g,
      g * L,
    ],
    solution: [
      R`The known number is \(${a} = ${g} \times ${m}\): the GCF times \(${m}\).`,
      R`The LCM holds everything in both numbers. \(${L} \div ${a} = ${n}\) is the part that only the other number has.`,
      R`The other number is the GCF times that part: \(${g} \times ${n} = ${b}\).`,
      R`Check: GCF × LCM \(= ${g} \times ${L} = ${g * L}\), and \(${a} \times ${b} = ${a * b}\). ✓`,
    ],
    rule: 4,
    skill: 'GCF and LCM together',
    check: () => (gcd(a, b) === g && lcm(a, b) === L ? true : 'GCF or LCM does not match'),
  });
}

function challengeError(rng) {
  for (;;) {
    const x = proper(rng, 2, 7);
    const y = proper(rng, 3, 7);
    if (x.eq(y) || y.n === 1 || x.n * y.n === x.d * y.d) continue;
    const p = person(rng);
    const right = x.div(y);
    const slip = rng.pick(['noFlip', 'flipFirst']);
    const claimed = slip === 'noFlip' ? x.mul(y) : y.div(x);
    const options = {
      noFlip: `${p} multiplied the fractions as written. The second fraction should be replaced by its reciprocal first.`,
      flipFirst: `${p} took the reciprocal of the first fraction. Only the second fraction (the divisor) is flipped.`,
      both: `${p} should have taken the reciprocal of both fractions before multiplying.`,
      none: `Nothing went wrong. ${p}'s answer is correct.`,
    };
    return q({
      prompt: R`${p} says \(${x.tex()} \div ${y.tex()} = ${claimed.mixedTex()}\). What went wrong?`,
      correct: options[slip],
      wrong: [options[slip === 'noFlip' ? 'flipFirst' : 'noFlip'], options.none, options.both],
      solution: [
        slip === 'noFlip' ? R`${p} worked out \(${x.tex()} \times ${y.tex()} = ${claimed.tex()}\). That is a multiplication, not a division.` : R`${p} worked out \(${x.inv().tex()} \times ${y.tex()} = ${claimed.mixedTex()}\). The wrong fraction was flipped.`,
        ...divideSteps(x.n, x.d, y.n, y.d),
        R`The correct answer is \(${right.mixedTex()}\).`,
      ],
      rule: 1,
      skill: 'checking work',
    });
  }
}

function challengeTiles(rng) {
  const { g, m, n, a, b } = gcfPair(rng, [6, 8, 10, 12, 15, 20, 25, 30], 2, 7, 210);
  const unit = rng.pick(['centimeters', 'inches']);
  const place = rng.pick(['A kitchen backsplash', 'A countertop', 'A tabletop', 'A mosaic panel', 'A shower wall']);
  return q({
    prompt: `${place} is a rectangle ${a} ${unit} by ${b} ${unit}. It will be covered exactly with square tiles, all the same size, with no cutting. If the largest possible tiles are used, how many tiles are needed?`,
    correct: m * n,
    unit: 'tiles',
    wrong: [
      { value: g, why: `That is the side length of each tile in ${unit}. The question asks how many tiles are needed.` },
      { value: m + n, why: 'The tiles form rows and columns, so multiply the two counts.' },
      m * n * 2,
      m * n + m,
      m * n + n,
    ],
    solution: [
      `The side of the tile must divide both ${a} and ${b}. The largest such length is the GCF.`,
      R`\(${a} = ${primes(a)}\) and \(${b} = ${primes(b)}\), so the GCF is \(${g}\). Each tile is ${g} ${unit} on a side.`,
      R`Tiles along each side: \(${a} \div ${g} = ${m}\) and \(${b} \div ${g} = ${n}\).`,
      R`Total: \(${m} \times ${n} = ${m * n}\) tiles.`,
    ],
    rule: 6,
    skill: 'GCF word problems',
    check: () => (isGcf(a, b, g)() === true && m * g === a && n * g === b ? true : 'tile size is not the GCF'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'fraction-division-factors',
  title: 'Dividing Fractions, GCF & LCM',
  summary: 'Divide fractions and mixed numbers, find greatest common factors and least common multiples, and use them in stories.',
  grade: 'Grade 6',
  standards: ['CCSS 6.NS.A.1', 'CCSS 6.NS.B.4'],

  explain: {
    intro: R`Dividing asks "how many of these fit into that?" The same question works for fractions: \(6 \div \frac{3}{4}\) asks how many \(\frac{3}{4}\)s fit into 6. This topic also covers two tools for whole numbers: the **greatest common factor** (for splitting things into equal groups) and the **least common multiple** (for finding when repeating things line up).`,
    rules: [
      {
        title: 'Division asks "how many fit?"',
        text: R`\(a \div b\) asks how many groups of size \(b\) fit into \(a\). When \(b\) is a fraction smaller than 1, more than \(a\) groups fit, so the answer is bigger than \(a\).`,
        example: R`\(3 \div \frac{1}{4} = 12\), because each whole holds 4 fourths and \(3 \times 4 = 12\).`,
      },
      {
        title: 'To divide by a fraction, multiply by its reciprocal',
        text: R`The **reciprocal** of \(\frac{c}{d}\) is \(\frac{d}{c}\). Dividing by \(\frac{1}{4}\) is the same as multiplying by 4. Dividing by \(\frac{3}{4}\) makes groups 3 times as big, so only a third as many fit: multiply by 4, then divide by 3. That is multiplying by \(\frac{4}{3}\).`,
        example: R`\(\frac{2}{3} \div \frac{4}{5} = \frac{2}{3} \times \frac{5}{4} = \frac{10}{12} = \frac{5}{6}\).`,
      },
      {
        title: 'Mixed numbers: change to improper fractions first',
        text: R`Write each mixed number as an improper fraction. Then multiply by the reciprocal of the divisor and simplify. A whole number \(n\) is \(\frac{n}{1}\), so its reciprocal is \(\frac{1}{n}\).`,
        example: R`\(3\frac{1}{2} \div 1\frac{1}{4} = \frac{7}{2} \div \frac{5}{4} = \frac{7}{2} \times \frac{4}{5} = \frac{28}{10} = 2\frac{4}{5}\).`,
      },
      {
        title: 'Greatest common factor (GCF)',
        text: R`A **factor** of a number divides it with no remainder. The GCF of two numbers is the largest number that is a factor of both. List the factors of each, or write each number as a product of primes and multiply the primes they share.`,
        example: R`\(12 = 2 \times 2 \times 3\) and \(18 = 2 \times 3 \times 3\). They share \(2 \times 3\), so the GCF is 6.`,
      },
      {
        title: 'Least common multiple (LCM)',
        text: R`A **multiple** of a number is that number times 1, 2, 3 and so on. The LCM of two numbers is the smallest number that is a multiple of both. List multiples of each until one matches. For any two numbers, GCF × LCM equals the product of the numbers.`,
        example: R`Multiples of 12: 12, 24, **36**. Multiples of 18: 18, **36**. The LCM is 36. Check: \(6 \times 36 = 216 = 12 \times 18\).`,
      },
      {
        title: 'Use the GCF to factor a sum',
        text: R`Divide each number in a sum by the GCF and write the GCF in front of parentheses. This is the distributive property run backwards. The numbers left inside share no common factor.`,
        example: R`\(36 + 8 = 4(9 + 2)\). Check: \(4 \times 11 = 44\).`,
      },
      {
        title: 'GCF or LCM? Read what the story is doing',
        text: R`If things are being **split into equal groups** with nothing left over, the number of groups must divide both amounts: use the GCF. If things **repeat** and you want to know when they happen together, look for a common multiple: use the LCM.`,
        example: R`24 pens and 36 pencils into identical bags: at most GCF = 12 bags. Buses every 12 and 18 minutes: together again after LCM = 36 minutes.`,
      },
    ],
    vocab: [
      { term: 'reciprocal', def: R`The number you multiply by to get 1. The reciprocal of \(\frac{3}{4}\) is \(\frac{4}{3}\).` },
      { term: 'dividend, divisor, quotient', def: R`In \(8 \div 2 = 4\), 8 is the dividend, 2 is the divisor and 4 is the quotient.` },
      { term: 'factor', def: 'A whole number that divides another whole number with no remainder.' },
      { term: 'multiple', def: 'The result of multiplying a whole number by 1, 2, 3, and so on.' },
      { term: 'prime number', def: 'A whole number greater than 1 whose only factors are 1 and itself.' },
    ],
    mistakes: [
      R`Flipping the wrong fraction. Only the divisor (the second fraction) is replaced by its reciprocal.`,
      R`Multiplying straight across without flipping: \(\frac{2}{3} \div \frac{4}{5}\) is **not** \(\frac{8}{15}\).`,
      'Dividing mixed numbers part by part. Change them to improper fractions first.',
      'Mixing up GCF and LCM. A common factor is never bigger than the numbers; a common multiple is never smaller.',
    ],
    visual: { type: 'fractionBars', bars: [{ n: 3, d: 4, label: '3/4' }, { n: 6, d: 8, label: '3/4 = 6/8, so 1/8 fits into it 6 times', color: 'c' }], alt: 'Fraction bars: three fourths is the same amount as six eighths, so one eighth fits into three fourths six times.' },
  },

  examples: [
    {
      title: 'How many fit?',
      problem: R`Find \(\frac{3}{4} \div \frac{1}{8}\).`,
      steps: [
        R`The question asks how many eighths fit into \(\frac{3}{4}\).`,
        R`Multiply by the reciprocal of \(\frac{1}{8}\), which is 8: \(\frac{3}{4} \times 8 = \frac{24}{4}\).`,
        R`Simplify: \(\frac{24}{4} = 6\). Six eighths make \(\frac{3}{4}\). ✓`,
      ],
      answer: R`\(6\)`,
      visual: { type: 'fractionBars', bars: [{ n: 3, d: 4 }, { n: 6, d: 8 }], alt: 'Fraction bars showing that three fourths equals six eighths.' },
    },
    {
      title: 'A fraction divided by a fraction',
      problem: R`Find \(\frac{2}{3} \div \frac{4}{5}\).`,
      steps: [
        R`Keep the first fraction. Replace the divisor \(\frac{4}{5}\) by its reciprocal \(\frac{5}{4}\) and multiply.`,
        R`\(\frac{2}{3} \times \frac{5}{4} = \frac{2 \times 5}{3 \times 4} = \frac{10}{12}\).`,
        R`Simplify by dividing the top and bottom by 2: \(\frac{5}{6}\).`,
        R`Check by multiplying back: \(\frac{5}{6} \times \frac{4}{5} = \frac{20}{30} = \frac{2}{3}\). ✓`,
      ],
      answer: R`\(\frac{5}{6}\)`,
    },
    {
      title: 'Word problem: servings',
      word: true,
      problem: R`A jug holds 6 cups of lemonade. Each serving is \(\frac{3}{4}\) cup. How many servings are in the jug?`,
      steps: [
        R`The story asks how many groups of \(\frac{3}{4}\) fit into 6, so divide: \(6 \div \frac{3}{4}\).`,
        R`Multiply by the reciprocal: \(6 \times \frac{4}{3} = \frac{24}{3}\).`,
        R`Simplify: \(\frac{24}{3} = 8\).`,
        R`Check: \(8 \times \frac{3}{4} = 6\) cups. ✓`,
      ],
      answer: '8 servings',
      visual: { type: 'numberLine', min: 0, max: 6, step: 0.25, labels: range(0, 6).map((v) => ({ value: v, text: String(v) })), jumps: range(0, 7).map((i) => ({ from: i * 0.75, to: (i + 1) * 0.75 })), alt: 'A number line from 0 to 6 cups with eight equal jumps of three fourths of a cup.' },
    },
    {
      title: 'Mixed numbers',
      problem: R`Find \(3\frac{1}{2} \div 1\frac{1}{4}\).`,
      steps: [
        R`Write both as improper fractions: \(3\frac{1}{2} = \frac{7}{2}\) and \(1\frac{1}{4} = \frac{5}{4}\).`,
        R`Multiply by the reciprocal of the divisor: \(\frac{7}{2} \times \frac{4}{5} = \frac{28}{10}\).`,
        R`Simplify: \(\frac{28}{10} = \frac{14}{5} = 2\frac{4}{5}\).`,
      ],
      answer: R`\(2\frac{4}{5}\)`,
    },
    {
      title: 'GCF, LCM and factoring a sum',
      problem: R`Find the GCF and the LCM of 12 and 18. Then use the GCF to rewrite \(12 + 18\).`,
      steps: [
        R`Prime factors: \(12 = 2 \times 2 \times 3\) and \(18 = 2 \times 3 \times 3\).`,
        R`They share one 2 and one 3, so the GCF is \(2 \times 3 = 6\).`,
        R`Multiples of 12: 12, 24, 36. Multiples of 18: 18, 36. The LCM is 36.`,
        R`Factor the sum: \(12 + 18 = 6(2 + 3)\). Check: \(6 \times 5 = 30\). ✓`,
      ],
      answer: R`GCF \(= 6\), LCM \(= 36\), and \(12 + 18 = 6(2 + 3)\)`,
    },
    {
      title: 'Word problem: GCF or LCM?',
      word: true,
      problem: 'Rosa has 24 pens and 36 pencils. Rosa wants to pack identical gift bags and use everything. What is the greatest number of bags, and what goes in each?',
      steps: [
        'Each bag gets the same number of pens and the same number of pencils, so the number of bags must divide both 24 and 36. That is a common factor, and we want the greatest one.',
        R`\(24 = 2 \times 2 \times 2 \times 3\) and \(36 = 2 \times 2 \times 3 \times 3\). They share \(2 \times 2 \times 3 = 12\).`,
        R`With 12 bags, each bag gets \(24 \div 12 = 2\) pens and \(36 \div 12 = 3\) pencils.`,
      ],
      answer: '12 bags, each with 2 pens and 3 pencils',
    },
  ],

  models: [
    {
      id: 'divide-fractions',
      title: 'Divide any two fractions',
      intro: 'Type two fractions. To use a whole number, give it a bottom number of 1.',
      inputs: [
        { name: 'a', label: 'First top number', type: 'int', min: 1, max: 30, value: 2 },
        { name: 'b', label: 'First bottom number', type: 'int', min: 1, max: 20, value: 3 },
        { name: 'c', label: 'Second top number', type: 'int', min: 1, max: 30, value: 4 },
        { name: 'd', label: 'Second bottom number', type: 'int', min: 1, max: 20, value: 5 },
      ],
      compute({ a, b, c, d }) {
        const ans = frac(a * d, b * c);
        const canDraw = a / b <= 6 && c / d <= 6 && b <= 24 && d <= 24;
        return {
          problem: R`\(${fr(a, b)} \div ${fr(c, d)}\)`,
          steps: [...divideSteps(a, b, c, d), R`Check by multiplying back: \(${ans.tex()} \times ${fr(c, d)} = ${chain(frac(a, b).tex(), fr(a, b))}\). ✓`],
          answer: R`\(${ans.mixedTex()}\)`,
          visual: canDraw ? { type: 'fractionBars', bars: [{ n: a, d: b, label: `${a}/${b}` }, { n: c, d, label: `${c}/${d}` }], alt: `Fraction bars showing ${a}/${b} and ${c}/${d}.` } : undefined,
        };
      },
    },
    {
      id: 'servings',
      title: 'Word problem: how many servings?',
      word: true,
      intro: 'Change the size of the jug and the size of a glass.',
      inputs: [
        { name: 'W', label: 'Cups of lemonade in the jug', type: 'int', min: 1, max: 12, value: 6 },
        { name: 'n', label: 'Glass size: top number', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'd', label: 'Glass size: bottom number', type: 'int', min: 1, max: 12, value: 4 },
      ],
      compute({ W, n, d }) {
        if (n > W * d) return { error: 'One glass is bigger than the whole jug. Make the glass smaller or the jug bigger.' };
        const ans = frac(W * d, n);
        const full = Math.floor(ans.value);
        const left = ans.sub(full);
        const size = n / d;
        const steps = Number.isInteger(size)
          ? [R`The story asks how many groups of \(${size}\) fit into ${W}, so divide: \(${W} \div ${size} = ${ans.mixedTex()}\).`]
          : [R`The story asks how many groups of \(${fr(n, d)}\) fit into ${W}, so divide: \(${W} \div ${fr(n, d)}\).`, ...divideSteps(W, 1, n, d)];
        if (!left.eq(0)) steps.push(R`That is ${full} full ${full === 1 ? 'glass' : 'glasses'}, and enough lemonade left for \(${left.tex()}\) of a glass.`);
        return {
          problem: R`A jug holds ${W} ${W === 1 ? 'cup' : 'cups'} of lemonade. Each glass holds \(${frac(n, d).d === 1 ? size : fr(n, d)}\) ${n > d ? 'cups' : 'cup'}. How many glasses can be filled?`,
          steps,
          answer: left.eq(0) ? `${full} ${full === 1 ? 'glass' : 'glasses'}` : R`${full} full ${full === 1 ? 'glass' : 'glasses'} (the exact quotient is \(${ans.mixedTex()}\))`,
          visual: full <= 16 ? { type: 'numberLine', min: 0, max: W, step: 1, jumps: range(0, full - 1).map((i) => ({ from: i * size, to: (i + 1) * size })), alt: `A number line from 0 to ${W} ${W === 1 ? 'cup' : 'cups'} with ${full} equal ${full === 1 ? 'jump' : 'jumps'} of ${fracLabel(frac(n, d))} ${n > d ? 'cups' : 'cup'}.` } : undefined,
        };
      },
    },
    {
      id: 'gcf-lcm',
      title: 'GCF and LCM of two numbers',
      intro: 'Type two whole numbers to see their prime factors, GCF and LCM.',
      inputs: [
        { name: 'a', label: 'First number', type: 'int', min: 2, max: 120, value: 12 },
        { name: 'b', label: 'Second number', type: 'int', min: 2, max: 120, value: 18 },
      ],
      compute({ a, b }) {
        const g = gcd(a, b);
        const L = lcm(a, b);
        const shared = sharedPrimes(a, b);
        const pt = (n) => (isPrime(n) ? R`\(${n}\) is prime` : R`\(${n} = ${primes(n)}\)`);
        const steps = [`Write each number as a product of primes: ${pt(a)} and ${pt(b)}.`];
        if (!shared.length) steps.push('They share no prime factors, so the only common factor is 1. The GCF is 1.');
        else if (shared.length === 1) steps.push(R`The only prime factor they share is \(${shared[0]}\), so the GCF is \(${g}\).`);
        else steps.push(R`They share \(${shared.join(R` \times `)}\), so the GCF is \(${g}\).`);
        steps.push(g === 1 ? R`With a GCF of 1, the LCM is the product: \(${a} \times ${b} = ${num(L)}\).` : R`LCM = product ÷ GCF: \(${a} \times ${b} \div ${g} = ${num(L)}\).`);
        if (g > 1) steps.push(R`The GCF also factors the sum: \(${a} + ${b} = ${g}(${a / g} + ${b / g})\).`);
        return { problem: `Find the GCF and LCM of ${a} and ${b}.`, steps, answer: R`GCF \(= ${g}\), LCM \(= ${num(L)}\)` };
      },
    },
  ],

  quiz: {
    easy: [easyWholeByUnit, easySameDenominator, easyReciprocal, easyGCF, easyLCM],
    medium: [mediumFracDivFrac, mediumServings, mediumGCF, mediumLCM, mediumFactorSum],
    hard: [hardMixedDivide, hardStoryFracDiv, hardGCFStory, hardLCMStory],
    challenge: [challengeMissing, challengeAreaWidth, challengeGcfLcmProduct, challengeError, challengeTiles],
  },
};
