import { R, q, person, plural, divisors } from '../../lib/index.js';
import { GROUPS } from './_shared.js';

// ───────────── Helpers ─────────────

// Factors found the slow way, by testing every number: used by the checks.
const slowFactors = (n) => {
  const out = [];
  for (let k = 1; k <= n; k++) if (n % k === 0) out.push(k);
  return out;
};
const isFactor = (k, n) => k >= 1 && n % k === 0;
const isPrimeSlow = (n) => slowFactors(n).length === 2;
// Factor pairs with the smaller number first: pairsOf(12) → [[1, 12], [2, 6], [3, 4]].
const pairsOf = (n) => {
  const out = [];
  for (let a = 1; a * a <= n; a++) if (n % a === 0) out.push([a, n / a]);
  return out;
};
const list = (xs) => R`\(${xs.join(', ')}\)`;
const pairText = (a, b) => R`\(${a}\) and \(${b}\)`;
const times = (a, b) => R`\(${a} \times ${b} = ${a * b}\)`;
const arrayPic = (r, c, what = 'dots') =>
  r >= 1 && c >= 1 && r <= 12 && c <= 12 ? { type: 'array', rows: r, cols: c, alt: `An array of ${plural(r, 'row')} with ${c} ${what} in each row. There are ${r * c} ${what} in all.` } : undefined;
// The factor pair closest to a square that an array can draw (both numbers 12 or less).
const drawPair = (n) => pairsOf(n).filter(([a, b]) => b <= 12).pop();
// Keep the candidates that pass `keep`, without repeats.
const filtered = (cands, keep) => [...new Set(cands)].filter(keep);
// Numbers 2–100 with at least 4 factors.
const MANY = Array.from({ length: 89 }, (_, i) => i + 12).filter((n) => divisors(n).length >= 4);
const ODD_COMPOSITES = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95, 99];
const PRIMES = Array.from({ length: 99 }, (_, i) => i + 2).filter(isPrimeSlow);
const parity = (n) => (n % 2 ? 'odd' : 'even');

// A pattern: the first `count` terms from a start and a rule.
function terms(start, op, k, count) {
  const out = [start];
  while (out.length < count) out.push(op === '+' ? out[out.length - 1] + k : out[out.length - 1] * k);
  return out;
}
const ruleText = (op, k) => (op === '+' ? `add ${k}` : `multiply by ${k}`);
function termTable(ts, unknownAt) {
  const headers = ts.map((_, i) => `Term ${i + 1}`);
  const row = ts.map((t, i) => (i === unknownAt ? '?' : String(t)));
  return { type: 'table', headers, rows: [row], alt: `A table of terms. ${ts.map((t, i) => (i === unknownAt ? `Term ${i + 1} is unknown.` : `Term ${i + 1} is ${t}.`)).join(' ')}` };
}

// ───────────── Easy ─────────────

function easyFactorPair(rng) {
  const n = rng.pick(MANY.filter((x) => pairsOf(x).length >= 3 && drawPair(x) && drawPair(x)[0] > 1));
  const shown = rng.pick(pairsOf(n).filter(([a, b]) => a > 1 && b <= 12));
  const [r, c] = rng.bool() ? shown : [shown[1], shown[0]];
  const [a, b] = rng.pick(pairsOf(n).filter((p) => p[0] !== shown[0]));
  const x = rng.int(2, Math.floor(n / 2) - 1);
  const wrongPairs = [
    [x, n - x, `These add to ${n}. A factor pair multiplies to ${n}.`],
    [a, b + 1, R`\(${a} \times ${b + 1} = ${a * (b + 1)}\), not ${n}.`],
    [a - 1, b],
    [a + 1, b],
    [a + 1, b - 1],
  ];
  const wrong = wrongPairs.map(([u, v, why]) => (u >= 1 && v >= 1 && u * v !== n ? { value: pairText(u, v), why } : null));
  return q({
    prompt: R`The array shows that \(${r} \times ${c} = ${n}\). Which other pair is also a factor pair of ${n}?`,
    visual: arrayPic(r, c),
    correct: pairText(a, b),
    wrong,
    solution: [`A factor pair is two numbers that multiply to make ${n}.`, times(a, b) + '.', `So ${a} and ${b} are a factor pair of ${n}.`],
    rule: 0,
    skill: 'factor pairs',
    check: () => (a * b === n && r * c === n && a !== Math.min(r, c) && wrongPairs.every(([u, v], i) => wrong[i] == null || u * v !== n) ? true : 'pair does not multiply to n'),
  });
}

function easyStatement(rng) {
  const [a, b] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10], 2);
  const n = a * b;
  // [text, true?] built from the fact a × b = n.
  const facts = [
    [R`\(${a}\) is a factor of \(${n}\).`, true],
    [R`\(${n}\) is a multiple of \(${a}\).`, true],
    [R`\(${b}\) is a factor of \(${n}\).`, true],
    [R`\(${n}\) is a multiple of \(${b}\).`, true],
  ];
  const slips = [
    { value: R`\(${n}\) is a factor of \(${a}\).`, why: `A factor is never bigger than the number. ${n} is bigger than ${a}.`, t: () => a % n === 0 },
    { value: R`\(${a}\) is a multiple of \(${n}\).`, why: `Multiples of ${n} are ${n}, ${2 * n}, ${3 * n} and so on.`, t: () => a % n === 0 },
    { value: R`\(${n}\) is a factor of \(${b}\).`, t: () => b % n === 0 },
    { value: R`\(${b}\) is a multiple of \(${n}\).`, t: () => b % n === 0 },
  ];
  const odd = [n + 1, n - 1].find((m) => m % a !== 0);
  slips.push({ value: R`\(${odd}\) is a multiple of \(${a}\).`, why: R`\(${odd} \div ${a}\) leaves a remainder.`, t: () => odd % a === 0 });
  const [text] = rng.pick(facts);
  const wrong = rng.shuffle(slips);
  return q({
    prompt: R`The array shows ${a} rows of ${b}, so \(${a} \times ${b} = ${n}\). Which sentence is true?`,
    visual: arrayPic(a, b),
    correct: text,
    wrong,
    solution: [R`\(${a} \times ${b} = ${n}\).`, `So ${a} and ${b} are factors of ${n}.`, `And ${n} is a multiple of ${a} and of ${b}.`, `The true sentence: ${text}`],
    rule: 2,
    skill: 'factors and multiples',
    check: () => (n % a === 0 && n % b === 0 && wrong.every((w) => !w.t()) ? true : 'a wrong sentence is true'),
  });
}

function easyFactorOrMultiple(rng) {
  if (rng.bool()) {
    const n = rng.pick(MANY);
    const f = rng.pick(divisors(n).filter((d) => d > 1 && d < n && d <= 12));
    const wrong = [
      2 * n <= 200 ? { value: 2 * n, why: `${2 * n} is a multiple of ${n}. A factor of ${n} is never bigger than ${n}.` } : null,
      ...filtered([f + 1, f - 1, f + 2, f - 2, f + 3, f + 4, f + 5, n - 1, n + 1], (v) => v > 1 && n % v !== 0).map((v) => ({ value: v, why: R`\(${n} \div ${v}\) leaves a remainder.` })),
    ];
    return q({
      prompt: `Which number is a factor of ${n}?`,
      correct: f,
      wrong,
      solution: [`A factor of ${n} divides ${n} with nothing left over.`, R`\(${n} \div ${f} = ${n / f}\), with nothing left over.`, `So ${f} is a factor of ${n}.`],
      rule: 2,
      skill: 'is it a factor?',
      check: () => (slowFactors(n).includes(f) && wrong.every((w) => w == null || n % w.value !== 0) ? true : 'choices do not match the factors'),
    });
  }
  const k = rng.int(3, 12);
  const mlt = rng.int(2, 9);
  const v = k * mlt;
  const small = divisors(k).filter((d) => d > 1 && d < k);
  const wrong = [
    small.length ? { value: rng.pick(small), why: `That is a factor of ${k}. A multiple of ${k} is ${k} times a number.` } : null,
    ...filtered([v + 1, v - 1, v + 2, v - 2, v + 3, k + 1, v + 4], (x) => x > 0 && x % k !== 0),
  ];
  return q({
    prompt: `Which number is a multiple of ${k}?`,
    visual: { type: 'numberLine', min: 0, max: k * 10, step: k, alt: `A number line from 0 to ${k * 10} with a tick every ${k}.` },
    correct: v,
    wrong,
    solution: [`Skip count by ${k}s: ${terms(k, '+', k, mlt).join(', ')}.`, `${v} is in the count. ${times(k, mlt)}.`, `So ${v} is a multiple of ${k}.`],
    rule: 2,
    skill: 'is it a multiple?',
    check: () => (terms(k, '+', k, 12).includes(v) && wrong.every((w) => w == null || (typeof w === 'object' ? w.value : w) % k !== 0) ? true : 'choices do not match the multiples'),
  });
}

function easyNextTerm(rng) {
  const k = rng.int(2, 9);
  const s = rng.int(0, 15);
  const ts = terms(s, '+', k, 5);
  const next = ts[4];
  return q({
    prompt: `A pattern starts at ${s}. The rule is "add ${k}." What is term 5?`,
    visual: termTable(ts, 4),
    correct: next,
    wrong: [{ value: ts[3] + k + 1, why: `Add exactly ${k} each time.` }, { value: ts[3] + 2 * k, why: `That skips a term. Term 5 is just one jump after term 4.` }, ts[3] + k - 1, ts[3] + s !== next ? ts[3] + s : null, ts[3] + 1],
    solution: [`Each term is ${k} more than the one before.`, R`Term 4 is ${ts[3]}. Add ${k}: \(${ts[3]} + ${k} = ${next}\).`, `Term 5 is ${next}.`],
    rule: 4,
    skill: 'next term',
    check: () => (next === s + 4 * k ? true : 'term 5 does not match the rule'),
  });
}

// ───────────── Medium ─────────────

function mediumAllFactors(rng) {
  const n = rng.pick(MANY);
  const fs = divisors(n);
  const pairs = pairsOf(n);
  const [ga, gb] = rng.pick(pairs.slice(1));
  const missPair = fs.filter((d) => d !== ga && d !== gb);
  const extra = filtered([ga + 1, gb - 1, ga + 2, gb + 1], (v) => v > 1 && v < n && n % v !== 0)[0];
  const withExtra = extra != null ? [...fs, extra].sort((u, v) => u - v) : null;
  return q({
    prompt: `Which list shows all the factors of ${n}?`,
    correct: list(fs),
    wrong: [
      { value: list(missPair), why: R`This list is missing a pair: \(${ga} \times ${gb} = ${n}\).` },
      { value: list(fs.slice(1, -1)), why: `1 and ${n} are always factors of ${n}.` },
      withExtra ? { value: list(withExtra), why: R`\(${n} \div ${extra}\) leaves a remainder, so ${extra} is not a factor.` } : null,
      list(fs.filter((d) => d <= Math.sqrt(n))),
      list(terms(n, '+', n, 4)),
    ],
    solution: [`Test the numbers 1, 2, 3 and so on. Write each factor pair.`, pairs.map(([u, v]) => times(u, v)).join(', ') + '.', `Stop when the pairs start to repeat.`, `The factors of ${n} are ${list(fs)}.`],
    rule: 1,
    skill: 'all the factors',
    check: () => (slowFactors(n).join(',') === fs.join(',') ? true : 'factor list is wrong'),
  });
}

function mediumPrime(rng) {
  if (rng.bool()) {
    const p = rng.pick(PRIMES.filter((x) => x > 10));
    const comps = rng.sample(ODD_COMPOSITES, 4);
    const [u, v] = pairsOf(comps[0])[1];
    return q({
      prompt: 'Which number is prime?',
      correct: p,
      wrong: [{ value: comps[0], why: R`\(${u} \times ${v} = ${comps[0]}\), so ${comps[0]} has more than two factors.` }, { value: 1, why: '1 has only one factor. It is neither prime nor composite.' }, ...comps.slice(1)],
      solution: [`A prime number has exactly two factors: 1 and itself.`, `The only factor pair of ${p} is 1 and ${p}.`, `So ${p} is prime.`],
      rule: 3,
      skill: 'prime or composite',
      check: () => (isPrimeSlow(p) && comps.every((c) => !isPrimeSlow(c)) ? true : 'prime choice is wrong'),
    });
  }
  const c = rng.pick(ODD_COMPOSITES.concat([12, 26, 34, 38, 46, 58, 62, 74, 86, 94]));
  const ps = rng.sample(PRIMES.filter((x) => x > 2), 3);
  const [u, v] = pairsOf(c)[1];
  return q({
    prompt: 'Which number is composite?',
    correct: c,
    wrong: [rng.pick([{ value: 1, why: '1 has only one factor. It is neither prime nor composite.' }, { value: 2, why: '2 has exactly two factors, 1 and 2. It is prime.' }]), ...ps],
    solution: [`A composite number has more than two factors.`, R`\(${u} \times ${v} = ${c}\).`, `So ${c} has the factors 1, ${u}, ${v} and ${c}. It is composite.`],
    rule: 3,
    skill: 'prime or composite',
    check: () => (!isPrimeSlow(c) && c > 1 && ps.every(isPrimeSlow) ? true : 'composite choice is wrong'),
  });
}

function mediumEqualGroups(rng) {
  const name = person(rng);
  const n = rng.pick(MANY.filter((x) => divisors(x).some((d) => d >= 3 && d <= 12 && d < x)));
  const f = rng.pick(divisors(n).filter((d) => d >= 3 && d <= 12 && d < n));
  const nonf = rng.shuffle([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((d) => n % d !== 0));
  const chairs = rng.bool();
  const g = rng.pick(GROUPS);
  const prompt = chairs
    ? `${name} sets out ${n} chairs in equal rows. No chairs are left over. How many chairs could be in each row?`
    : `${name} packs ${n} ${g.item[1]} into ${g.box[1]}. Each ${g.box[0]} holds the same number. None are left over. How many could go in each ${g.box[0]}?`;
  return q({
    prompt,
    correct: f,
    wrong: nonf.map((d, i) => (i === 0 ? { value: d, why: R`\(${n} \div ${d} = ${Math.floor(n / d)}\) with ${n % d} left over.` } : d)),
    solution: [`The number in each group must be a factor of ${n}.`, R`\(${n} \div ${f} = ${n / f}\) with nothing left over.`, `So ${f} works. There would be ${n / f} ${chairs ? 'rows' : g.box[1]}.`],
    rule: 2,
    skill: 'word problems',
    check: () => (n % f === 0 && nonf.slice(0, 3).every((d) => n % d !== 0) ? true : 'group size does not divide n'),
  });
}

function mediumNthTerm(rng) {
  if (rng.bool(0.7)) {
    const k = rng.int(2, 9);
    const s = rng.int(1, 12);
    const nth = rng.pick([8, 10, 10, 12]);
    const ts = terms(s, '+', k, nth);
    const ans = ts[nth - 1];
    return q({
      prompt: `A pattern starts at ${s}. The rule is "add ${k}." What is term ${nth}?`,
      visual: termTable(ts.slice(0, 4), -1),
      correct: ans,
      wrong: [{ value: s + nth * k, why: `From term 1 to term ${nth} there are ${nth - 1} jumps, not ${nth}.` }, { value: nth * k, why: `The pattern starts at ${s}, not at 0.` }, ans - 1, ans + 1, ans + 2],
      solution: [`From term 1 to term ${nth} there are ${nth - 1} jumps of ${k}.`, R`\(${nth - 1} \times ${k} = ${(nth - 1) * k}\).`, R`Add the start: \(${s} + ${(nth - 1) * k} = ${ans}\).`, `Term ${nth} is ${ans}.`],
      rule: 4,
      skill: 'a later term',
      check: () => (ans === s + (nth - 1) * k ? true : 'term does not match the rule'),
    });
  }
  const k = rng.pick([2, 2, 3]);
  const s = k === 2 ? rng.int(1, 6) : rng.int(1, 4);
  const ts = terms(s, '*', k, k === 2 ? 6 : 5);
  const last = ts.length;
  const ans = ts[last - 1];
  const add = ts[last - 2] + (ts[last - 2] - ts[last - 3]);
  return q({
    prompt: `A pattern starts at ${s}. The rule is "multiply by ${k}." What is term ${last}?`,
    visual: termTable(ts, last - 1),
    correct: ans,
    wrong: [add !== ans ? { value: add, why: `The rule multiplies by ${k}. It does not add the same amount each time.` } : null, ts[last - 2] + k, ans + k, ans * k],
    solution: [`Each term is ${k} times the one before.`, R`Term ${last - 1} is ${ts[last - 2]}. \(${ts[last - 2]} \times ${k} = ${ans}\).`, `Term ${last} is ${ans}.`],
    rule: 4,
    skill: 'next term',
    check: () => (ans === s * k ** (last - 1) ? true : 'term does not match the rule'),
  });
}

// ───────────── Hard ─────────────

function hardFactorCount(rng) {
  const n = rng.pick(MANY);
  const fs = divisors(n);
  const pairs = pairsOf(n);
  const square = Number.isInteger(Math.sqrt(n));
  return q({
    prompt: `How many factors does ${n} have?`,
    visual: drawPair(n) ? arrayPic(...drawPair(n)) : undefined,
    correct: fs.length,
    wrong: [
      { value: fs.length - 2, why: `Count 1 and ${n} too. They are always factors.` },
      !square ? { value: pairs.length, why: 'That counts the pairs. Each pair has two factors.' } : { value: fs.length + 1, why: R`\(${Math.sqrt(n)} \times ${Math.sqrt(n)}\) uses the same number twice. Count it once.` },
      fs.length + 2,
      fs.length - 1,
    ],
    solution: [`Find the factor pairs: ${pairs.map(([u, v]) => times(u, v)).join(', ')}.`, `The factors are ${list(fs)}.`, `Count them: ${n} has ${fs.length} factors.`],
    rule: 1,
    skill: 'all the factors',
    check: () => (slowFactors(n).length === fs.length ? true : 'factor count is wrong'),
  });
}

function hardCommonBox(rng) {
  const name = person(rng);
  for (;;) {
    const c = rng.int(2, 9);
    const [m1, m2] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 2);
    const A = c * m1;
    const B = c * m2;
    if (A > 100 || B > 100) continue;
    const range = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const onlyA = range.filter((d) => A % d === 0 && B % d !== 0);
    const onlyB = range.filter((d) => B % d === 0 && A % d !== 0);
    const neither = range.filter((d) => A % d !== 0 && B % d !== 0);
    if (!onlyA.length || !onlyB.length) continue;
    const [g1, g2] = rng.sample(GROUPS, 2);
    const a = rng.pick(onlyA);
    const b = rng.pick(onlyB);
    const ne = rng.shuffle(neither);
    return q({
      prompt: `${name} has ${A} ${g1.item[1]} and ${B} ${g2.item[1]}. Each kind goes in its own bags. Every bag holds the same number, and none are left over. How many could go in each bag?`,
      correct: c,
      wrong: [
        { value: a, why: R`${a} works for the ${g1.item[1]}. But \(${B} \div ${a}\) leaves a remainder.` },
        { value: b, why: R`${b} works for the ${g2.item[1]}. But \(${A} \div ${b}\) leaves a remainder.` },
        ...ne,
      ],
      solution: [`The bag size must be a factor of ${A} and a factor of ${B}.`, R`\(${A} \div ${c} = ${m1}\) and \(${B} \div ${c} = ${m2}\). Nothing is left over.`, `So ${c} works for both kinds.`],
      rule: 2,
      skill: 'word problems',
      check: () => (A % c === 0 && B % c === 0 && !(A % a === 0 && B % a === 0) && !(A % b === 0 && B % b === 0) && ne.every((d) => A % d && B % d) ? true : 'bag size check failed'),
    });
  }
}

// Sentences about an "add k" pattern. Each is tested on the first 30 terms.
function featureSentences(k) {
  return [
    { text: 'Every term is odd.', test: (t) => t % 2 === 1 },
    { text: 'Every term is even.', test: (t) => t % 2 === 0 },
    { text: 'The terms take turns: odd, even, odd, even.', test: (t, i) => t % 2 === (i % 2 === 0 ? 1 : 0) },
    { text: 'The terms take turns: even, odd, even, odd.', test: (t, i) => t % 2 === (i % 2 === 0 ? 0 : 1) },
    ...(k !== 2 ? [{ text: `Every term is a multiple of ${k}.`, test: (t) => t % k === 0 }] : []),
    ...(k !== 3 ? [{ text: 'Every term is a multiple of 3.', test: (t) => t % 3 === 0 }] : []),
    ...(k !== 5 ? [{ text: 'Every term is a multiple of 5.', test: (t) => t % 5 === 0 }] : []),
  ];
}

function hardFeature(rng) {
  for (;;) {
    const k = rng.int(2, 9);
    const s = rng.int(1, 15);
    const ts = terms(s, '+', k, 30);
    const all = featureSentences(k).map((f) => {
      const bad = ts.findIndex((t, i) => !f.test(t, i));
      return { ...f, ok: bad < 0, bad };
    });
    const trues = all.filter((f) => f.ok);
    const falses = rng.shuffle(all.filter((f) => !f.ok));
    if (!trues.length || falses.length < 3) continue;
    const right = rng.pick(trues);
    const reason = k % 2 === 0 ? `Adding an even number keeps odd as odd and even as even.` : `Adding an odd number changes odd to even and even to odd.`;
    return q({
      prompt: `A pattern starts at ${s}. The rule is "add ${k}." Which sentence is true for every term?`,
      visual: termTable(ts.slice(0, 5), -1),
      correct: right.text,
      wrong: falses.map((f) => ({ value: f.text, why: `Term ${f.bad + 1} is ${ts[f.bad]}, so this is not always true.` })),
      solution: [`The terms are ${ts.slice(0, 6).join(', ')} and so on.`, reason, right.text.startsWith('Every term is a multiple') ? `The start and the jump are both multiples, so every term is too.` : `Look at the terms: ${ts.slice(0, 6).map(parity).join(', ')}.`, `True: ${right.text}`],
      rule: 5,
      skill: 'pattern features',
      check: () => {
        const again = Array.from({ length: 30 }, (_, i) => s + i * k);
        return again.every((t, i) => right.test(t, i)) && falses.slice(0, 3).every((f) => !again.every((t, i) => f.test(t, i))) ? true : 'sentence truth is wrong';
      },
    });
  }
}

// ───────────── Challenge ─────────────

function challengeBackwards(rng) {
  const k = rng.int(2, 9);
  const s = rng.int(1, 15);
  const nth = rng.int(4, 9);
  const t = s + (nth - 1) * k;
  return q({
    prompt: `A pattern follows the rule "add ${k}." Term ${nth} is ${t}. What is term 1?`,
    correct: s,
    wrong: [
      t - nth * k >= 0 ? { value: t - nth * k, why: `From term 1 to term ${nth} there are ${nth - 1} jumps, not ${nth}.` } : null,
      { value: t - k, why: `That is term ${nth - 1}. Keep going back to term 1.` },
      t - (nth - 2) * k,
      t + k,
      s + 1,
    ],
    solution: [`Going back one term means taking away ${k}.`, `From term ${nth} back to term 1 is ${nth - 1} jumps of ${k}.`, R`\(${nth - 1} \times ${k} = ${(nth - 1) * k}\), and \(${t} - ${(nth - 1) * k} = ${s}\).`, `Term 1 is ${s}.`],
    rule: 4,
    skill: 'work backwards',
    check: () => (terms(s, '+', k, nth)[nth - 1] === t ? true : 'start does not rebuild term n'),
  });
}

function challengeMissedFactor(rng) {
  const name = person(rng);
  const n = rng.pick(MANY.filter((x) => divisors(x).length >= 6));
  const fs = divisors(n);
  const miss = rng.pick(fs.slice(1, -1));
  const shown = fs.filter((d) => d !== miss);
  const wrong = filtered([miss + 1, miss - 1, miss + 2, miss + 3, miss - 2, n - 1, 2 * n], (v) => v > 1 && n % v !== 0).map((v, i) =>
    i === 0 ? (v === 2 * n ? { value: v, why: `${v} is a multiple of ${n}, not a factor.` } : { value: v, why: R`\(${n} \div ${v}\) leaves a remainder.` }) : v,
  );
  return q({
    prompt: `${name} lists the factors of ${n}: ${list(shown)}. One factor is missing. Which one?`,
    correct: miss,
    wrong,
    solution: [`Write the factor pairs of ${n}: ${pairsOf(n).map(([u, v]) => times(u, v)).join(', ')}.`, `Look for a factor that is not in the list.`, R`\(${n} \div ${miss} = ${n / miss}\). So ${miss} is the missing factor.`],
    rule: 1,
    skill: 'all the factors',
    check: () => (slowFactors(n).filter((d) => !shown.includes(d)).join(',') === String(miss) ? true : 'missing factor is wrong'),
  });
}

function challengeMystery(rng) {
  for (;;) {
    const a = rng.int(2, 9);
    const x = a * rng.int(2, 8);
    const t = rng.int(2, 4);
    const B = x * t;
    if (B > 100) continue;
    const clue12 = (y) => y % a === 0 && B % y === 0;
    const both = Array.from({ length: 100 }, (_, i) => i + 1).filter(clue12);
    const i = both.indexOf(x);
    if (i < 1 || i >= both.length - 1) continue;
    const lo = both[i - 1];
    const hi = both[i + 1];
    const third = { text: `I am more than ${lo} and less than ${hi}.`, f: (y) => y > lo && y < hi };
    const twoClues = both.filter((y) => y !== x);
    const oneClue = filtered([x + a, x - a, x + 2 * a, 2 * x].filter((y) => y > 0), (y) => y !== x && !clue12(y));
    return q({
      prompt: `Mystery number. Clue 1: I am a multiple of ${a}. Clue 2: I am a factor of ${B}. Clue 3: ${third.text} What number am I?`,
      correct: x,
      wrong: [
        ...twoClues.map((y, i) => (i === 0 ? { value: y, why: `${y} fits clues 1 and 2, but not clue 3.` } : y)),
        ...oneClue.map((y, i) => (i === 0 ? { value: y, why: R`${y} is a multiple of ${a}, but \(${B} \div ${y}\) leaves a remainder.` } : y)),
      ],
      solution: [`Clue 2: list the factors of ${B}: ${list(divisors(B))}.`, `Clue 1: keep the multiples of ${a}: ${list(both)}.`, `Clue 3: only ${x} is left.`, `The mystery number is ${x}.`],
      rule: 2,
      skill: 'factors and multiples',
      check: () => {
        const fit = Array.from({ length: 200 }, (_, i) => i + 1).filter((y) => y % a === 0 && isFactor(y, B) && third.f(y));
        return fit.length === 1 && fit[0] === x ? true : 'clues do not give one number';
      },
    });
  }
}

function challengePrimeChairs(rng) {
  const name = person(rng);
  const p = rng.pick(PRIMES.filter((x) => x >= 11 && x <= 89));
  const comps = rng.shuffle(Array.from({ length: 21 }, (_, i) => p - 10 + i).filter((y) => y > 3 && !isPrimeSlow(y)));
  const [u, v] = pairsOf(comps[0])[1];
  return q({
    prompt: `${name} tries to put some chairs in equal rows. Each try uses at least 2 rows. Each row has at least 2 chairs. No try works. How many chairs could there be?`,
    correct: p,
    wrong: [{ value: comps[0], why: `${comps[0]} chairs fit in ${u} rows of ${v}.` }, ...comps.slice(1)],
    solution: [`Equal rows show a factor pair of the number of chairs.`, `No pair without 1 works. So the only factor pair is 1 and the number itself.`, `That means the number is prime.`, `${p} is prime, so there could be ${p} chairs.`],
    rule: 3,
    skill: 'word problems',
    check: () => (isPrimeSlow(p) && comps.slice(0, 3).every((c) => pairsOf(c).length > 1) ? true : 'chair count is not prime'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'factors-patterns',
  title: 'Factors, Multiples & Patterns',
  summary: 'Find factor pairs and multiples, tell prime from composite, and follow number patterns.',
  grade: 'Grade 4',
  standards: ['CCSS 4.OA.B.4', 'CCSS 4.OA.C.5'],

  explain: {
    intro: 'Numbers that multiply to make a number are its **factors**. Counting by a number gives its **multiples**. A **pattern** follows a rule, such as "add 3."',
    rules: [
      {
        title: 'Factor pairs make arrays',
        text: 'A factor pair is two numbers that multiply to make a number. Each pair can make a rectangle of equal rows.',
        example: R`\(3 \times 8 = 24\), so 3 and 8 are a factor pair of 24.`,
      },
      {
        title: 'Finding all the factors',
        text: 'Test 1, 2, 3 and so on. Write each pair you find. Stop when the pairs start to repeat.',
        example: R`12: \(1 \times 12\), \(2 \times 6\), \(3 \times 4\). The factors are 1, 2, 3, 4, 6 and 12.`,
      },
      {
        title: 'Factors and multiples go together',
        text: 'Skip count to find multiples. If 6 is a factor of 42, then 42 is a multiple of 6.',
        example: R`\(6 \times 7 = 42\). 6 is a factor of 42. 42 is a multiple of 6.`,
      },
      {
        title: 'Prime and composite',
        text: 'A prime number has exactly two factors: 1 and itself. A composite number has more than two. The number 1 is neither.',
        example: R`7 is prime: only \(1 \times 7\). 9 is composite: \(1 \times 9\) and \(3 \times 3\).`,
      },
      {
        title: 'Patterns follow a rule',
        text: 'Use the rule to get from one term to the next. To reach term 10, make 9 jumps from term 1.',
        example: R`Start at 2, add 5: 2, 7, 12, 17. Term 10 is \(2 + 9 \times 5 = 47\).`,
      },
      {
        title: 'Look for more than the rule says',
        text: 'A pattern can have features the rule does not tell you. Look at odd and even, or at the last digit.',
        example: 'Start at 1, add 3: 1, 4, 7, 10, 13. The terms take turns being odd and even.',
      },
    ],
    vocab: [
      { term: 'factor', def: 'A number that divides another number with nothing left over.' },
      { term: 'factor pair', def: 'Two numbers that multiply to make a given number.' },
      { term: 'multiple', def: 'The product of a number and a whole number. Skip counting gives multiples.' },
      { term: 'prime number', def: 'A number with exactly two factors, 1 and itself.' },
      { term: 'composite number', def: 'A number with more than two factors.' },
      { term: 'term', def: 'One number in a pattern.' },
    ],
    mistakes: [
      'Forgetting 1 and the number itself. Both are always factors.',
      'Mixing up factors and multiples. Factors are small. Multiples are big.',
      'Calling 1 a prime number. It has only one factor, so it is neither.',
      'Making 10 jumps to reach term 10. From term 1, it takes 9 jumps.',
    ],
    visual: { type: 'array', rows: 4, cols: 6, alt: 'An array of 4 rows with 6 dots in each row. There are 24 dots in all, so 4 and 6 are a factor pair of 24.' },
  },

  examples: [
    {
      title: 'All the factor pairs of 24',
      problem: 'Find all the factors of 24.',
      steps: [R`\(1 \times 24 = 24\) and \(2 \times 12 = 24\).`, R`\(3 \times 8 = 24\) and \(4 \times 6 = 24\).`, '5 is not a factor. The next number, 6, is already in a pair. Stop.', 'The factors are 1, 2, 3, 4, 6, 8, 12 and 24.'],
      answer: '1, 2, 3, 4, 6, 8, 12, 24',
      visual: { type: 'array', rows: 3, cols: 8, alt: 'An array of 3 rows with 8 dots in each row, 24 dots in all.' },
    },
    {
      title: 'Factor or multiple?',
      problem: 'Is 6 a factor of 42? Is 42 a multiple of 6?',
      steps: ['Skip count by 6: 6, 12, 18, 24, 30, 36, 42.', R`42 is in the count. \(6 \times 7 = 42\).`, 'So 6 is a factor of 42, and 42 is a multiple of 6.'],
      answer: 'Yes to both',
    },
    {
      title: 'A pattern and its features',
      problem: 'A pattern starts at 1. The rule is "add 3." What is term 10? What else do you notice?',
      steps: ['The terms are 1, 4, 7, 10, 13 and so on.', R`Term 10 is 9 jumps after term 1: \(1 + 9 \times 3 = 28\).`, 'The terms take turns: odd, even, odd, even.', 'Adding an odd number always changes odd to even, and even to odd.'],
      answer: 'Term 10 is 28. The terms take turns being odd and even.',
      visual: termTable([1, 4, 7, 10, 13], -1),
    },
    {
      title: 'Word problem: chairs in rows',
      word: true,
      problem: 'Ava has 36 chairs. Ava wants equal rows with no chairs left over. How many chairs could go in each row?',
      steps: ['Each way of making rows is a factor pair of 36.', R`\(1 \times 36\), \(2 \times 18\), \(3 \times 12\), \(4 \times 9\), \(6 \times 6\).`, 'So a row could hold 1, 2, 3, 4, 6, 9, 12, 18 or 36 chairs.'],
      answer: '1, 2, 3, 4, 6, 9, 12, 18 or 36 chairs',
      visual: { type: 'array', rows: 4, cols: 9, alt: 'An array of 4 rows with 9 chairs in each row, 36 chairs in all.' },
    },
  ],

  models: [
    {
      id: 'factor-pairs',
      title: 'Factor pairs of a number',
      intro: 'Type a number from 1 to 100. See all its factor pairs.',
      inputs: [{ name: 'n', label: 'Number', type: 'int', min: 1, max: 100, value: 24 }],
      compute({ n }) {
        const pairs = pairsOf(n);
        const fs = divisors(n);
        const kind = n === 1 ? '1 is neither prime nor composite.' : fs.length === 2 ? `${n} is prime. Its only factors are 1 and ${n}.` : `${n} is composite. It has ${fs.length} factors.`;
        const dp = drawPair(n);
        return {
          problem: `Find all the factors of ${n}.`,
          steps: [`Test 1, 2, 3 and so on. Keep the numbers that divide ${n} with nothing left over.`, `Factor ${pairs.length === 1 ? 'pair' : 'pairs'}: ${pairs.map(([u, v]) => times(u, v)).join(', ')}.`, `The factors are ${list(fs)}.`, kind],
          answer: `Factors of ${n}: ${list(fs)}`,
          visual: dp ? arrayPic(dp[0], dp[1]) : undefined,
          note: dp ? undefined : 'Every factor pair has a number bigger than 12, so no array is drawn.',
        };
      },
    },
    {
      id: 'chairs-in-rows',
      title: 'Word problem: chairs in equal rows',
      word: true,
      intro: 'Choose the number of chairs and how many go in each row.',
      inputs: [
        { name: 'n', label: 'Chairs', type: 'int', min: 1, max: 100, value: 36 },
        { name: 'r', label: 'Chairs in each row', type: 'int', min: 1, max: 12, value: 9 },
      ],
      compute({ n, r }) {
        if (r > n) return { error: 'A row cannot hold more chairs than there are. Make the rows smaller.' };
        const rows = Math.floor(n / r);
        const left = n % r;
        return {
          problem: `Leo sets out ${plural(n, 'chair')} in rows of ${r}. How many full rows are there? Are any chairs left over?`,
          steps: [
            R`Count the rows: \(${n} \div ${r}\).`,
            left === 0 ? R`\(${rows} \times ${r} = ${n}\). There are no chairs left over.` : R`\(${rows} \times ${r} = ${rows * r}\), and \(${n} - ${rows * r} = ${left}\) left over.`,
            left === 0 ? `So ${r} is a factor of ${n}, and ${n} is a multiple of ${r}.` : `So ${r} is not a factor of ${n}.`,
          ],
          answer: left === 0 ? `${plural(rows, 'full row')}, none left over` : `${plural(rows, 'full row')} and ${plural(left, 'chair')} left over`,
          visual: rows >= 1 && rows <= 12 ? arrayPic(rows, r, 'chairs') : undefined,
          note: left ? `The picture shows only the full rows. ${plural(left, 'chair')} ${left === 1 ? 'is' : 'are'} left over.` : rows > 12 ? 'There are too many rows to draw.' : undefined,
        };
      },
    },
  ],

  quiz: {
    easy: [easyFactorPair, easyStatement, easyFactorOrMultiple, easyNextTerm],
    medium: [mediumAllFactors, mediumPrime, mediumEqualGroups, mediumNthTerm],
    hard: [hardFactorCount, hardCommonBox, hardFeature],
    challenge: [challengeBackwards, challengeMissedFactor, challengeMystery, challengePrimeChairs],
  },
};
