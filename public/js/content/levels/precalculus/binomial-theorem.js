import { R, q, frac, choose, ordinal, linear, terms, term, poly, polyMul, power, num, paren, txt, round, person, checkEqual, checkAll } from '../../lib/index.js';
import { M, dec, apart } from './_shared.js';

// ───────────── Helpers ─────────────

// (ax + b)^n multiplied out the long way: coefficients, highest power first (index n − k holds x^k).
const expand = (a, b, n) => {
  let p = [1];
  for (let i = 0; i < n; i++) p = polyMul(p, [a, b]);
  return p;
};
const coefOf = (p, k) => p[p.length - 1 - k] ?? 0;
// Laurent polynomials as Map(exponent → coefficient), for terms like 3/x².
const lmul = (P, Q) => {
  const out = new Map();
  for (const [e1, c1] of P) for (const [e2, c2] of Q) out.set(e1 + e2, (out.get(e1 + e2) ?? 0) + c1 * c2);
  return out;
};
const lpow = (P, n) => {
  let out = new Map([[0, 1]]);
  for (let i = 0; i < n; i++) out = lmul(out, P);
  return out;
};
// The rows of Pascal's triangle built by adding the two entries above (no factorials).
const pascalRows = (n) => {
  const rows = [[1]];
  for (let i = 1; i <= n; i++) {
    const prev = rows[i - 1];
    rows.push(prev.map((_, j) => (j === 0 ? 1 : prev[j - 1] + prev[j])).concat(1));
  }
  return rows;
};
const pascalTable = (n) => ({
  type: 'table',
  headers: ['Row', 'Entries'],
  rows: pascalRows(n).map((r, i) => [M(i), M(r.join(',\\ '))]),
  alt: `Pascal's triangle, rows 0 to ${n}. ${pascalRows(n).map((r, i) => `Row ${i}: ${r.join(', ')}`).join('. ')}.`,
});
const B = (n, k) => R`\binom{${n}}{${k}}`;
// Every outcome of n independent trials: the probability of exactly k successes, by brute force.
const bruteProb = (n, p, pred) => {
  let total = 0;
  for (let mask = 0; mask < 2 ** n; mask++) {
    let s = 0;
    let pr = 1;
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) { s++; pr *= p; } else pr *= 1 - p;
    }
    if (pred(s)) total += pr;
  }
  return total;
};
const sumTex = (lo, hi, body) => R`\displaystyle\sum_{k=${lo}}^{${hi}} ${body}`;
// A list of terms written as a sum, negative terms in brackets: "3 + (-6) + 12".
const plusList = (xs) => xs.map((v, i) => (i === 0 ? num(v) : paren(v))).join(' + ');
const sq = (a) => (a < 0 ? `(${a})` : `${a}`);

// ───────────── Easy ─────────────

function easyPascal(rng) {
  const kind = rng.pick(['entry', 'entry', 'sum', 'symmetry', 'subsets']);
  const n = rng.int(4, 10);
  const rows = pascalRows(n);
  if (kind === 'entry') {
    const k = rng.int(2, n - 2);
    const ans = rows[n][k];
    return q({
      prompt: R`Row ${n - 1} of Pascal's triangle is \(${rows[n - 1].join(',\ ')}\). Rows and entries are numbered from 0. What is entry ${k} of row ${n}?`,
      correct: ans,
      wrong: [
        { value: rows[n - 1][k], why: R`That is entry ${k} of row ${n - 1}. Each entry of row ${n} is the sum of the two entries just above it.` },
        { value: rows[n - 1][k - 1] * rows[n - 1][k], why: 'Add the two entries above, do not multiply them.' },
        rows[n][k + 1] === ans ? null : rows[n][k + 1],
        rows[n - 1][k + 1] + rows[n - 1][k],
      ],
      solution: [
        R`Entry ${k} of row ${n} sits below entries ${k - 1} and ${k} of row ${n - 1}, which are \(${rows[n - 1][k - 1]}\) and \(${rows[n - 1][k]}\).`,
        R`Add them: \(${rows[n - 1][k - 1]} + ${rows[n - 1][k]} = ${ans}\). This is \(${B(n, k)} = ${ans}\).`,
      ],
      rule: 0,
      skill: "Pascal's triangle",
      check: () => checkEqual(ans, choose(n, k)),
    });
  }
  if (kind === 'symmetry') {
    const k = rng.intExcept(1, n - 1, [n / 2]);
    return q({
      prompt: R`Pascal's triangle is symmetric. Which number \(m\) other than ${k} makes \(${B(n, k)} = ${B(n, 'm')}\)?`,
      correct: n - k,
      fmt: (v) => R`\(m = ${v}\)`,
      wrong: [
        { value: n + k, why: R`Entries match when they are the same distance from the two ends of the row: \(m = ${n} - ${k}\).` },
        k + 1 === n - k ? null : k + 1,
        n - k - 1 === k ? null : n - k - 1,
        n,
      ],
      solution: [R`Choosing ${k} of ${n} items to keep is the same as choosing the ${n - k} items to leave out, so \(${B(n, k)} = ${B(n, n - k)}\).`, R`\(m = ${n} - ${k} = ${n - k}\). Both equal \(${choose(n, k)}\).`],
      rule: 0,
      skill: "Pascal's triangle",
      check: () => (rows[n][k] === rows[n][n - k] && k !== n - k ? true : 'symmetry fails'),
    });
  }
  const ans = 2 ** n;
  const sum = rows[n].reduce((s, v) => s + v, 0);
  if (kind === 'sum') {
    return q({
      prompt: R`What is the sum of all the entries in row ${n} of Pascal's triangle?`,
      correct: ans,
      wrong: [
        { value: 2 ** (n - 1), why: R`Rows are numbered from 0, so row ${n} sums to \(2^{${n}}\).` },
        { value: n * n, why: R`The row sums double each time: \(1, 2, 4, 8, \dots\), so row ${n} sums to \(2^{${n}}\), not \(${n}^{2}\).` },
        2 * n,
        2 ** (n + 1),
      ],
      solution: [R`Setting \(a = b = 1\) in the binomial theorem: \((1 + 1)^{${n}} = ${B(n, 0)} + ${B(n, 1)} + \dots + ${B(n, n)}\).`, R`So the row sums to \(2^{${n}} = ${ans}\).`],
      rule: 0,
      skill: 'row sums',
      check: () => checkEqual(sum, ans),
    });
  }
  const name = person(rng);
  const story = rng.pick([
    ['pizza', 'toppings', 'pizza'],
    ['burrito', 'fillings', 'burrito'],
    ['phone plan', 'add-on features', 'plan'],
    ['salad', 'extras', 'salad'],
  ]);
  return q({
    prompt: `A café lets ${name} build a ${story[0]} from ${n} ${story[1]}, using any number of them (none, some, or all). How many different ${story[2]}s are possible?`,
    correct: ans,
    wrong: [
      { value: ans - 1, why: 'The choice of none of them counts as one possibility too.' },
      { value: n * n, why: R`Each of the ${n} items is either in or out: \(2 \cdot 2 \cdots 2 = 2^{${n}}\).` },
      { value: Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a * b, 1), why: 'Order does not matter here. Each item is simply in or out.' },
      2 * n,
    ],
    solution: [
      R`Count by size: \(${rows[n].map((_, k) => B(n, k)).join(' + ')}\), which is row ${n} of Pascal's triangle.`,
      R`That row sums to \(2^{${n}} = ${ans}\). (Equivalently, each item is in or out: \(2^{${n}}\) choices.)`,
    ],
    rule: 5,
    skill: 'counting subsets',
    check: () => checkEqual(sum, ans),
  });
}

function easyCoefficient(rng) {
  const n = rng.int(3, 6);
  const b = rng.nonzero(n >= 5 ? -3 : -5, n >= 5 ? 3 : 5);
  const k = rng.int(1, n - 1);
  const p = expand(1, b, n);
  const ans = choose(n, k) * b ** (n - k);
  return q({
    prompt: R`What is the coefficient of \(${power('x', k)}\) in the expansion of \((${linear(1, b)})^{${n}}\)?`,
    correct: ans,
    wrong: [
      { value: choose(n, k), why: R`The binomial coefficient is only part of it. The term is \(${B(n, k)}\,x^{${k}}(${b})^{${n - k}}\), so multiply by \((${b})^{${n - k}}\).` },
      { value: choose(n, k) * b, why: R`The power of \(${b}\) is \(${n} - ${k} = ${n - k}\): the exponents in each term add to ${n}.` },
      b < 0 ? -ans : null,
      choose(n, k) * b ** k,
    ],
    solution: [
      R`The term with \(${power('x', k)}\) is \(${B(n, k)}\,x^{${k}}(${b})^{${n - k}}\), because the exponents add to ${n}.`,
      R`\(${B(n, k)} = ${choose(n, k)}\) and \((${b})^{${n - k}} = ${b ** (n - k)}\).`,
      R`The coefficient is \(${choose(n, k)} \cdot ${paren(b ** (n - k))} = ${ans}\).`,
    ],
    rule: 2,
    skill: 'one coefficient',
    check: () => checkEqual(coefOf(p, k), ans),
  });
}

function easySigmaExpand(rng) {
  const S1 = (n) => (n * (n + 1)) / 2;
  const S2 = (n) => (n * (n + 1) * (2 * n + 1)) / 6;
  const G = (n) => 2 ** (n + 1) - 1; // 2^0 + … + 2^n
  const lo = rng.int(0, 2);
  const hi = lo + rng.int(2, 4);
  let f;
  let body;
  let closed;
  if (rng.bool(0.65)) {
    const A = rng.pick([1, 1, 2, 3, -1]);
    const Bc = rng.int(-4, 4);
    const C = rng.int(-5, 5);
    f = (k) => A * k * k + Bc * k + C;
    body = Bc === 0 && C === 0 ? term(A, 'k^{2}') : `(${terms([[A, 'k^{2}'], [Bc, 'k'], [C, '']])})`;
    const P = (n) => (n < 0 ? 0 : A * S2(n) + Bc * S1(n) + C * (n + 1));
    closed = P(hi) - P(lo - 1);
  } else {
    const A = rng.pick([1, 3, -1]);
    const Bc = rng.nonzero(-3, 3);
    f = (k) => A * 2 ** k + Bc * k;
    body = `(${terms([[A, '2^{k}'], [Bc, 'k']])})`;
    const P = (n) => (n < 0 ? 0 : A * G(n) + Bc * S1(n));
    closed = P(hi) - P(lo - 1);
  }
  const vals = [];
  for (let k = lo; k <= hi; k++) vals.push(f(k));
  const ans = vals.reduce((s, v) => s + v, 0);
  return q({
    prompt: R`Evaluate \(${sumTex(lo, hi, body)}\).`,
    correct: ans,
    wrong: [
      { value: ans - vals[0], why: R`The sum starts at \(k = ${lo}\), so that term (\(${vals[0]}\)) belongs too.` },
      { value: ans - vals[vals.length - 1], why: R`The top index ${hi} is included: the last term is \(k = ${hi}\).` },
      { value: f(hi), why: 'Sigma notation means add the terms for every k from the bottom index to the top one.' },
      ans + f(hi + 1),
    ],
    solution: [
      R`Substitute \(k = ${lo}, ${lo + 1}, \dots, ${hi}\) into the expression: the terms are \(${plusList(vals)}\).`,
      R`Add them: \(${ans}\).`,
    ],
    rule: 3,
    skill: 'evaluating sigma notation',
    check: () => checkEqual(ans, closed),
  });
}

// ───────────── Medium ─────────────

function mediumCoefficient(rng) {
  const n = rng.int(3, 6);
  const a = rng.pick([2, 3, -2, 2, -1, 3]);
  const b = rng.nonzero(n >= 5 ? -3 : -4, n >= 5 ? 3 : 4);
  const p = expand(a, b, n);
  const middle = n % 2 === 0 && rng.bool(0.35);
  const k = middle ? n / 2 : rng.int(1, n - 1);
  const ans = choose(n, k) * a ** k * b ** (n - k);
  const steps = [
    R`The general term is \(${B(n, 'r')}(${term(a, 'x')})^{r}(${b})^{${n} - r}\). For \(${power('x', k)}\) take \(r = ${k}\).`,
    R`\(${B(n, k)} = ${choose(n, k)}\), \((${term(a, 'x')})^{${k}} = ${term(a ** k, power('x', k))}\) and \((${b})^{${n - k}} = ${b ** (n - k)}\).`,
    R`Multiply: \(${choose(n, k)} \cdot ${paren(a ** k)} \cdot ${paren(b ** (n - k))} = ${ans}\).`,
  ];
  if (middle) {
    const T = (r) => R`\(${term(choose(n, r) * a ** r * b ** (n - r), power('x', r))}\)`;
    return q({
      prompt: R`Find the middle term of the expansion of \((${linear(a, b)})^{${n}}\).`,
      correct: T(k),
      wrong: [
        { value: T(k + 1), why: R`The expansion has ${n + 1} terms, so the middle one is the term with \(x^{${k}}\).` },
        { value: R`\(${term(choose(n, k) * a * b ** (n - k), power('x', k))}\)`, why: R`The whole of \(${term(a, 'x')}\) is raised to the power ${k}, including the ${a}.` },
        T(k - 1),
        R`\(${term(choose(n, k) * Math.abs(a ** k * b ** (n - k)) * (ans < 0 ? 1 : -1), power('x', k))}\)`,
      ],
      solution: [R`\((${linear(a, b)})^{${n}}\) has ${n + 1} terms; the middle one is the ${ordinal(k + 1)}, with \(x^{${k}}\).`, ...steps.slice(1), R`The middle term is \(${term(ans, power('x', k))}\).`],
      rule: 2,
      skill: 'middle term',
      check: () => checkEqual(coefOf(p, k), ans),
    });
  }
  return q({
    prompt: R`What is the coefficient of \(${power('x', k)}\) in the expansion of \((${linear(a, b)})^{${n}}\)?`,
    correct: ans,
    wrong: [
      { value: choose(n, k) * b ** (n - k), why: R`The \(${a}\) in \(${term(a, 'x')}\) is raised to the power ${k} as well.` },
      { value: choose(n, k) * a * b ** (n - k), why: R`\((${term(a, 'x')})^{${k}} = ${paren(a)}^{${k}}x^{${k}}\), not \(${term(a, power('x', k))}\).` },
      { value: choose(n, k) * Math.abs(a ** k * b ** (n - k)) * (ans < 0 ? 1 : -1), why: 'Keep track of the sign: a negative number to an odd power stays negative.' },
      choose(n, k) * a ** (n - k) * b ** k,
    ],
    solution: steps,
    rule: 2,
    skill: 'one coefficient',
    check: () => checkEqual(coefOf(p, k), ans),
  });
}

function mediumSigmaWrite(rng) {
  const listOf = (lo, hi, f) => { const o = []; for (let k = lo; k <= hi; k++) o.push(f(k)); return o; };
  let shown;
  let cands; // [tex, lo, hi, f, why?]
  let solution;
  if (rng.bool()) {
    const a1 = rng.int(-5, 9);
    const d = rng.pick([2, 3, 4, 5, 6, -2, -3, -4]);
    const n = rng.int(6, 15);
    const last = a1 + (n - 1) * d;
    const L = (c0) => (k) => d * k + c0;
    const body = (c0) => `(${linear(d, c0, 'k')})`;
    shown = R`${plusList([a1, a1 + d, a1 + 2 * d])} + \dots + ${paren(last)}`;
    cands = [
      [sumTex(1, n, body(a1 - d)), 1, n, L(a1 - d)],
      [sumTex(1, n, body(a1)), 1, n, L(a1), R`At \(k = 1\) that gives \(${a1 + d}\), not the first term \(${a1}\).`],
      [sumTex(1, n - 1, body(a1 - d)), 1, n - 1, L(a1 - d), R`Count the terms: \(\dfrac{${last} - ${paren(a1)}}{${d}} + 1 = ${n}\).`],
      [sumTex(0, n, body(a1)), 0, n, L(a1), R`From \(k = 0\) to \(k = ${n}\) is ${n + 1} terms, one too many.`],
      [sumTex(1, n, `(${linear(a1 === 0 ? 1 : a1, d, 'k')})`), 1, n, (k) => (a1 === 0 ? 1 : a1) * k + d],
    ];
    solution = [
      R`The terms go up by \(${d}\) each time, so the sum is arithmetic with \(a_{k} = ${a1} + (k - 1)${paren(d)} = ${linear(d, a1 - d, 'k')}\).`,
      R`Number of terms: \(\dfrac{${last} - ${paren(a1)}}{${d}} + 1 = ${n}\).`,
      R`So the sum is \(${cands[0][0]}\), which equals \(\dfrac{${n}(${a1} + ${paren(last)})}{2} = ${(n * (a1 + last)) / 2}\).`,
    ];
  } else {
    const a = rng.int(2, 5);
    const r = rng.pick([2, 3, -2, -3, 2]);
    const n = rng.int(5, r === 2 ? 9 : 7);
    const G = (sh) => (k) => a * r ** (k - sh);
    const body = (e) => R`${a} \cdot ${paren(r)}^{${e}}`;
    shown = R`${plusList([a, a * r, a * r * r])} + \dots + ${paren(a * r ** (n - 1))}`;
    cands = [
      [sumTex(1, n, body('k-1')), 1, n, G(1)],
      [sumTex(1, n, body('k')), 1, n, G(0), R`At \(k = 1\) that gives \(${a * r}\), not the first term \(${a}\).`],
      [sumTex(0, n, body('k')), 0, n, G(0), R`From \(k = 0\) to \(k = ${n}\) is ${n + 1} terms, one too many.`],
      [sumTex(1, n - 1, body('k-1')), 1, n - 1, G(1), R`The last term is \(${a} \cdot ${paren(r)}^{${n - 1}}\), which is \(k = ${n}\) in this rule.`],
      [sumTex(1, n, R`${r} \cdot ${a}^{k-1}`), 1, n, (k) => r * a ** (k - 1)],
    ];
    solution = [
      R`Each term is \(${r}\) times the one before, so the sum is geometric: \(a_{k} = ${a} \cdot ${paren(r)}^{k-1}\).`,
      R`The last term \(${a * r ** (n - 1)} = ${a} \cdot ${paren(r)}^{${n - 1}}\), so \(k - 1 = ${n - 1}\) and \(k = ${n}\).`,
      R`So the sum is \(${cands[0][0]}\).`,
    ];
  }
  const lists = cands.map(([, lo, hi, f]) => listOf(lo, hi, f));
  const key = lists[0].join(',');
  const total = (l) => l.reduce((x, y) => x + y, 0);
  const last = Number(shown.split(' + ').pop().replace(/[()]/g, ''));
  return q({
    prompt: R`Which sigma notation represents \(${shown}\)?`,
    correct: M(cands[0][0]),
    wrong: cands.slice(1).filter((c, i) => lists[i + 1].join(',') !== key && total(lists[i + 1]) !== total(lists[0])).map(([tex, , , , why]) => (why ? { value: M(tex), why } : M(tex))),
    solution,
    rule: 3,
    skill: 'writing sigma notation',
    check: () => {
      const first3 = shown.split(' + ').slice(0, 3).map((t) => Number(t.replace(/[()]/g, '')));
      return checkAll(checkEqual(lists[0][0], first3[0]), checkEqual(lists[0][1], first3[1]), checkEqual(lists[0][2], first3[2]), checkEqual(lists[0][lists[0].length - 1], last));
    },
  });
}

function mediumBinomialProb(rng) {
  const [name] = [person(rng)];
  const n = rng.int(4, 8);
  const p = rng.pick([0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 0.25, 0.75]);
  const k = rng.int(1, n - 1);
  const pct = Math.round(p * 100);
  const story = rng.pick([
    `${name} makes ${pct}% of free throws. In a practice set ${name} takes ${n} free throws, each independent of the others. What is the probability that exactly ${k} of them go in?`,
    `A seed packet says ${pct}% of the seeds germinate. ${name} plants ${n} seeds, which germinate independently. What is the probability that exactly ${k} germinate?`,
    `A spinner lands on blue with probability ${p}. ${name} spins it ${n} times. What is the probability that it lands on blue exactly ${k} times?`,
  ]);
  const ans = choose(n, k) * p ** k * (1 - p) ** (n - k);
  if (ans < 0.01) return mediumBinomialProb(rng);
  const v = round(ans, 3);
  const qn = round(1 - p, 2);
  return q({
    prompt: `${story} Round to three decimal places.`,
    correct: v,
    fmt: dec(3),
    wrong: apart(v, [
      { value: p ** k * (1 - p) ** (n - k), why: R`That is the probability of one particular order. There are \(${B(n, k)} = ${choose(n, k)}\) orders with exactly ${k} successes.` },
      { value: choose(n, k) * p ** (n - k) * (1 - p) ** k, why: R`The success probability \(${p}\) goes with the ${k} successes: \(${p}^{${k}}\), and \(${qn}^{${n - k}}\) for the ${n - k} failures.` },
      { value: choose(n, k) * p ** k, why: R`The ${n - k} failures each have probability \(${qn}\), so multiply by \(${qn}^{${n - k}}\) as well.` },
    ], { places: 3, gap: 0.08, positive: true }),
    solution: [
      R`Each trial succeeds with probability \(${p}\) and fails with probability \(${qn}\).`,
      R`One order with ${k} successes and ${n - k} failures has probability \(${p}^{${k}} \cdot ${qn}^{${n - k}}\), and there are \(${B(n, k)} = ${choose(n, k)}\) such orders.`,
      R`\(P = ${choose(n, k)} \cdot ${p}^{${k}} \cdot ${qn}^{${n - k}} \approx ${num(v, { fixed: 3 })}\).`,
    ],
    rule: 5,
    skill: 'binomial probability',
    check: () => checkEqual(bruteProb(n, p, (s) => s === k), ans, 1e-9),
  });
}

// ───────────── Hard ─────────────

function hardConstantTerm(rng) {
  const [pp, qq, n] = rng.pick([[1, 1, 4], [1, 1, 6], [1, 1, 8], [2, 1, 3], [2, 1, 6], [1, 2, 3], [1, 2, 6], [1, 1, 6], [2, 1, 6]]);
  const A = rng.pick([1, 1, 2, 3]);
  const Bc = rng.nonzero(-3, 3);
  const coef = (k) => choose(n, k) * A ** (n - k) * Bc ** k;
  const expo = (k) => pp * (n - k) - qq * k;
  const constant = rng.bool(0.6);
  const k = constant ? (pp * n) / (pp + qq) : rng.intExcept(0, n, [(pp * n) / (pp + qq)]);
  const target = expo(k);
  const ans = coef(k);
  if (Math.abs(ans) > 200000) return hardConstantTerm(rng);
  const first = term(A, power('x', pp));
  const second = R`${Bc < 0 ? '-' : '+'} \dfrac{${Math.abs(Bc)}}{${power('x', qq)}}`;
  const what = constant ? 'the constant term' : R`the coefficient of \(${target === 0 ? '' : power('x', target)}\)`;
  const P = lpow(new Map([[pp, A], [-qq, Bc]]), n);
  const near = [k - 1, k + 1].filter((j) => j >= 0 && j <= n);
  return q({
    prompt: R`Find ${what} in the expansion of \(\left(${first} ${second}\right)^{${n}}\).`,
    correct: ans,
    wrong: [
      { value: coef(near[0]), why: R`Find \(r\) from the exponent: \(${pp === 1 ? '' : pp}(${n} - r) - ${qq === 1 ? '' : qq}r = ${target}\) gives \(r = ${k}\).` },
      { value: choose(n, k) * A ** (n - k), why: R`The \(${Bc}\) is raised to the power ${k} too: \(\left(${Bc < 0 ? '-' : ''}\frac{${Math.abs(Bc)}}{${power('x', qq)}}\right)^{${k}}\).` },
      { value: choose(n, k), why: 'The binomial coefficient still has to be multiplied by the powers of the numbers in each part.' },
      near[1] != null ? coef(near[1]) : null,
      -ans,
    ],
    solution: [
      R`The general term is \(${B(n, 'r')}\left(${first}\right)^{${n} - r}\left(${Bc < 0 ? '-' : ''}\frac{${Math.abs(Bc)}}{${power('x', qq)}}\right)^{r}\), whose power of \(x\) is \(${pp === 1 ? '' : pp}(${n} - r) - ${qq === 1 ? '' : qq}r = ${pp * n} - ${pp + qq}r\).`,
      R`Set \(${pp * n} - ${pp + qq}r = ${target}\): \(r = ${k}\).`,
      R`The coefficient is \(${B(n, k)} \cdot ${A}^{${n - k}} \cdot ${paren(Bc)}^{${k}} = ${choose(n, k)} \cdot ${A ** (n - k)} \cdot ${paren(Bc ** k)} = ${ans}\).`,
    ],
    rule: 2,
    skill: constant ? 'constant term' : 'one coefficient',
    check: () => checkEqual(P.get(target) ?? 0, ans),
  });
}

function hardSeriesSum(rng) {
  const kind = rng.pick(['poly', 'infinite', 'infinite', 'props']);
  if (kind === 'poly') {
    const n = rng.int(10, 30);
    const A = rng.pick([1, 2, 3, -1]);
    const Bc = rng.int(-5, 5);
    const C = rng.nonzero(-6, 6);
    const S1 = (n * (n + 1)) / 2;
    const S2 = (n * (n + 1) * (2 * n + 1)) / 6;
    const ans = A * S2 + Bc * S1 + C * n;
    let brute = 0;
    for (let k = 1; k <= n; k++) brute += A * k * k + Bc * k + C;
    return q({
      prompt: R`Use \(\displaystyle\sum_{k=1}^{n} k = \frac{n(n+1)}{2}\) and \(\displaystyle\sum_{k=1}^{n} k^{2} = \frac{n(n+1)(2n+1)}{6}\) to evaluate \(${sumTex(1, n, `(${terms([[A, 'k^{2}'], [Bc, 'k'], [C, '']])})`)}\).`,
      correct: ans,
      wrong: [
        { value: A * S2 + Bc * S1 + C, why: R`The constant \(${C}\) is added once for every term: \(\sum_{k=1}^{${n}} ${paren(C)} = ${n} \cdot ${paren(C)}\).` },
        { value: A * S1 * S1 + Bc * S1 + C * n, why: R`\(\left(\frac{n(n+1)}{2}\right)^{2}\) is the sum of cubes. Use \(\frac{n(n+1)(2n+1)}{6}\) for the squares.` },
        A * S2 + Bc * S1,
        A * n * n + Bc * n + C,
      ],
      solution: [
        R`Split the sum: \(${A === 1 ? '' : A === -1 ? '-' : A}\sum k^{2} ${Bc === 0 ? '' : `${Bc < 0 ? '-' : '+'} ${Math.abs(Bc) === 1 ? '' : Math.abs(Bc)}\\sum k`} + \sum ${paren(C)}\).`,
        R`\(\sum_{k=1}^{${n}} k^{2} = \frac{${n} \cdot ${n + 1} \cdot ${2 * n + 1}}{6} = ${S2}\) and \(\sum_{k=1}^{${n}} k = \frac{${n} \cdot ${n + 1}}{2} = ${S1}\).`,
        R`Total: \(${A} \cdot ${S2} + ${paren(Bc)} \cdot ${S1} + ${n} \cdot ${paren(C)} = ${ans}\).`,
      ],
      rule: 4,
      skill: 'sum formulas',
      check: () => checkEqual(brute, ans),
    });
  }
  if (kind === 'props') {
    const n = rng.int(8, 40);
    const Pa = rng.int(-20, 60);
    const Qb = rng.int(-20, 60);
    const u = rng.intExcept(-4, 5, [0, 1]);
    const v = rng.nonzero(-4, 4);
    const w = rng.nonzero(-5, 5);
    const ans = u * Pa - v * Qb + w * n;
    // Build real sequences with those sums and add the long way.
    const seqA = Array.from({ length: n }, (_, i) => (i < n - 1 ? (i % 3) - 1 : 0));
    seqA[n - 1] = Pa - seqA.reduce((s, x) => s + x, 0);
    const seqB = Array.from({ length: n }, (_, i) => (i < n - 1 ? (i % 2 ? 2 : -1) : 0));
    seqB[n - 1] = Qb - seqB.reduce((s, x) => s + x, 0);
    const brute = seqA.reduce((s, x, i) => s + u * x - v * seqB[i] + w, 0);
    return q({
      prompt: R`Given \(\displaystyle\sum_{k=1}^{${n}} a_{k} = ${Pa}\) and \(\displaystyle\sum_{k=1}^{${n}} b_{k} = ${Qb}\), find \(${sumTex(1, n, `(${terms([[u, 'a_{k}'], [-v, 'b_{k}'], [w, '']])})`)}\).`,
      correct: ans,
      wrong: [
        { value: u * Pa - v * Qb + w, why: R`The constant \(${w}\) is added in each of the ${n} terms, which gives \(${n} \cdot ${paren(w)}\).` },
        { value: u * Pa + v * Qb + w * n, why: R`Keep the sign in front of \(b_{k}\).` },
        Pa - Qb + w * n,
        u * Pa - v * Qb,
      ],
      solution: [
        R`Sums split term by term and constants factor out: \(${u}\sum a_{k} ${v < 0 ? '+' : '-'} ${Math.abs(v) === 1 ? '' : Math.abs(v)}\sum b_{k} + \sum_{k=1}^{${n}} ${paren(w)}\).`,
        R`\(= ${u} \cdot ${paren(Pa)} ${v < 0 ? '+' : '-'} ${Math.abs(v)} \cdot ${paren(Qb)} + ${n} \cdot ${paren(w)} = ${ans}\).`,
      ],
      rule: 3,
      skill: 'properties of sums',
      check: () => checkEqual(brute, ans),
    });
  }
  const r = rng.pick([frac(1, 2), frac(-1, 2), frac(1, 3), frac(-1, 3), frac(2, 3), frac(3, 4), frac(-2, 5), frac(1, 4)]);
  const a = rng.nonzero(-9, 12);
  const lo = rng.int(0, 2);
  const first = r.pow(lo).mul(a);
  const ans = first.div(frac(1).sub(r));
  const rTex = R`\left(${r.tex()}\right)`;
  let partial = 0;
  for (let k = lo; k < 400; k++) partial += a * r.value ** k;
  return q({
    prompt: R`Find the sum of the infinite series \(\displaystyle\sum_{k=${lo}}^{\infty} ${a === 1 ? '' : a === -1 ? '-' : `${a}`}${rTex}^{k}\).`,
    correct: ans,
    wrong: [
      lo === 0 ? null : { value: frac(a).div(frac(1).sub(r)), why: R`The first term is the \(k = ${lo}\) term, \(${first.tex()}\), not \(${a}\).` },
      { value: first.div(frac(1).add(r)), why: R`The formula is \(\dfrac{a_{1}}{1 - r}\) with \(r = ${r.tex()}\).` },
      { value: first.mul(frac(1).sub(r)), why: 'Divide the first term by 1 − r; do not multiply.' },
      lo === 2 ? frac(a).mul(r).div(frac(1).sub(r)) : first.mul(r).div(frac(1).sub(r)),
    ],
    solution: [
      R`This is a geometric series with ratio \(r = ${r.tex()}\). Since \(|r| < 1\), it has a sum.`,
      R`Its first term (at \(k = ${lo}\)) is \(${a === 1 ? '' : `${a} \\cdot `}${rTex}^{${lo}} = ${first.tex()}\).`,
      R`Sum \(= \dfrac{${first.tex()}}{1 - ${r.lt(frac(0)) ? R`\left(${r.tex()}\right)` : r.tex()}} = \dfrac{${first.tex()}}{${frac(1).sub(r).tex()}} = ${ans.tex()}\).`,
    ],
    rule: 4,
    skill: 'infinite geometric series',
    check: () => checkEqual(partial, ans.value, 1e-9),
  });
}

function hardAtLeast(rng) {
  const name = person(rng);
  const n = rng.int(5, 10);
  const p = rng.pick([0.1, 0.2, 0.3, 0.6, 0.7, 0.8, 0.9, 0.25, 0.75]);
  const qn = round(1 - p, 2);
  const kind = rng.pick(['atLeastOne', 'atMostOne', 'atLeastAll']);
  const pct = Math.round(p * 100);
  const Pk = (k) => choose(n, k) * p ** k * (1 - p) ** (n - k);
  let ans;
  let phrase;
  let pred;
  let wrong;
  let solution;
  if (kind === 'atLeastOne') {
    ans = 1 - (1 - p) ** n;
    phrase = 'at least one';
    pred = (s) => s >= 1;
    wrong = [
      { value: Pk(1), why: '"At least one" includes 2, 3, … successes, not just exactly one.' },
      { value: p ** n, why: R`That is the chance that all ${n} succeed.` },
      n * p < 1 ? { value: n * p, why: R`Probabilities of the separate trials cannot just be added; work with the complement, "none".` } : null,
      1 - p ** n,
    ];
    solution = [R`"At least one" is the complement of "none". \(P(\text{none}) = ${qn}^{${n}}\).`, R`\(P = 1 - ${qn}^{${n}} \approx ${num(round(ans, 3), { fixed: 3 })}\).`];
  } else if (kind === 'atMostOne') {
    ans = Pk(0) + Pk(1);
    phrase = 'at most one';
    pred = (s) => s <= 1;
    wrong = [
      { value: Pk(1), why: '"At most one" also includes zero successes.' },
      { value: Pk(0), why: '"At most one" also includes exactly one success.' },
      { value: (1 - p) ** n + p * (1 - p) ** (n - 1), why: R`Exactly one success can happen on any of the ${n} trials, so multiply that term by \(${B(n, 1)} = ${n}\).` },
      1 - Pk(0),
    ];
    solution = [
      R`\(P(0) = ${qn}^{${n}}\) and \(P(1) = ${B(n, 1)} \cdot ${p} \cdot ${qn}^{${n - 1}}\).`,
      R`\(P(\text{at most one}) = P(0) + P(1) \approx ${num(round(Pk(0), 4))} + ${num(round(Pk(1), 4))} \approx ${num(round(ans, 3), { fixed: 3 })}\).`,
    ];
  } else {
    ans = Pk(n - 1) + Pk(n);
    phrase = `at least ${n - 1}`;
    pred = (s) => s >= n - 1;
    wrong = [
      { value: Pk(n - 1), why: R`"At least ${n - 1}" also includes all ${n}.` },
      { value: Pk(n), why: R`"At least ${n - 1}" also includes exactly ${n - 1}.` },
      { value: p ** (n - 1) * (1 - p) + p ** n, why: R`Exactly ${n - 1} successes can happen in \(${B(n, n - 1)} = ${n}\) different orders.` },
      1 - Pk(n),
    ];
    solution = [
      R`\(P(${n - 1}) = ${B(n, n - 1)} \cdot ${p}^{${n - 1}} \cdot ${qn}\) and \(P(${n}) = ${p}^{${n}}\).`,
      R`Add them: \(\approx ${num(round(Pk(n - 1), 4))} + ${num(round(Pk(n), 4))} \approx ${num(round(ans, 3), { fixed: 3 })}\).`,
    ];
  }
  if (ans < 0.02 || ans > 0.98) return hardAtLeast(rng);
  const v = round(ans, 3);
  const [story, one, many] = rng.pick([
    [`A quality check finds that ${pct}% of the batteries from a machine last over 500 hours. ${name} tests ${n} batteries chosen at random, independently of each other.`, 'battery lasts over 500 hours', 'batteries last over 500 hours'],
    [`On a quiz, ${name} answers each of ${n} questions correctly with probability ${p}, independently.`, 'question is answered correctly', 'questions are answered correctly'],
    [`A basketball player hits ${pct}% of three-point attempts. ${name} watches the player take ${n} independent attempts.`, 'attempt goes in', 'attempts go in'],
  ]);
  return q({
    prompt: `${story} What is the probability that ${phrase} ${kind === 'atLeastAll' ? many : one}? Round to three decimal places.`,
    correct: v,
    fmt: dec(3),
    wrong: apart(v, wrong, { places: 3, gap: 0.08, positive: true }),
    solution: [R`Each trial succeeds with probability \(${p}\) and fails with probability \(${qn}\); \(P(k) = ${B(n, 'k')}${p}^{k}${qn}^{${n} - k}\).`, ...solution],
    rule: 5,
    skill: 'binomial probability',
    check: () => checkEqual(bruteProb(n, p, pred), ans, 1e-9),
  });
}

// ───────────── Challenge ─────────────

function challengeApprox(rng) {
  const grow = rng.bool();
  const x = rng.pick([0.01, 0.02, 0.03, 0.04, 0.05]);
  const n = rng.int(6, 12);
  const s = grow ? x : -x;
  const est = round(1 + n * s + choose(n, 2) * s * s, 8);
  const base = num(1 + s);
  const story = grow
    ? rng.pick([`A town's population grows by ${Math.round(x * 100)}% a year, so after ${n} years it has been multiplied by \\(${base}^{${n}}\\).`, `A savings account earns ${Math.round(x * 100)}% interest a year, so after ${n} years the balance has been multiplied by \\(${base}^{${n}}\\).`])
    : rng.pick([`A car loses ${Math.round(x * 100)}% of its value each year, so after ${n} years its value has been multiplied by \\(${base}^{${n}}\\).`, `A medicine's level drops by ${Math.round(x * 100)}% each hour, so after ${n} hours it has been multiplied by \\(${base}^{${n}}\\).`]);
  const pc = expand(1, 1, n); // (X + 1)^n: coefficients of X^n … X^0
  const firstThree = coefOf(pc, 0) + coefOf(pc, 1) * s + coefOf(pc, 2) * s * s;
  return q({
    prompt: R`${story} Estimate \(${base}^{${n}}\) using the first three terms of the binomial expansion of \((1 ${grow ? '+' : '-'} ${num(x)})^{${n}}\).`,
    correct: est,
    wrong: [
      { value: round(1 + n * s, 8), why: 'That uses only the first two terms.' },
      { value: round(1 + n * s + n * s * s, 8), why: R`The third coefficient is \(${B(n, 2)} = ${choose(n, 2)}\), not ${n}.` },
      { value: round(1 + n * s + choose(n, 2) * s, 8), why: R`The third term is \(${B(n, 2)}(${num(s)})^{2}\): the ${num(s)} must be squared.` },
      round(1 + n * s - choose(n, 2) * s * s, 8),
    ],
    solution: [
      R`\((1 + u)^{${n}} = 1 + ${n}u + ${B(n, 2)}u^{2} + \dots\) with \(u = ${num(s)}\).`,
      R`\(${n}u = ${num(round(n * s, 8))}\) and \(${choose(n, 2)}u^{2} = ${choose(n, 2)} \cdot ${num(round(s * s, 8))} = ${num(round(choose(n, 2) * s * s, 8))}\).`,
      R`Estimate: \(1 ${grow ? '+' : '-'} ${num(round(n * x, 8))} + ${num(round(choose(n, 2) * s * s, 8))} = ${num(est)}\). (The true value is about \(${num(round((1 + s) ** n, 5))}\).)`,
    ],
    rule: 5,
    skill: 'binomial approximation',
    check: () => checkAll(checkEqual(firstThree, est, 1e-9), Math.abs((1 + s) ** n - est) <= choose(n, 3) * x ** 3 * 1.7 ? true : 'estimate too far from the true value'),
  });
}

function challengeFindN(rng) {
  const n = rng.int(4, 10);
  const a = rng.pick([2, 3, 4, 5, -2, -3]);
  const P = n * a;
  const Q = choose(n, 2) * a * a;
  const pair = (nn, aa) => R`\(n = ${nn}\) and \(a = ${aa}\)`;
  const alts = [];
  for (let d = 2; d <= Math.abs(P); d++) if (P % d === 0 && d !== n) alts.push([d, P / d]);
  const wrongPairs = [[n, -a], ...rng.shuffle(alts)].filter(([nn, aa]) => choose(nn, 2) * aa * aa !== Q || nn * aa !== P);
  if (wrongPairs.length < 3) return challengeFindN(rng);
  const pc = expand(a, 1, n);
  return q({
    prompt: R`In the expansion of \((1 + ax)^{n}\), the coefficient of \(x\) is \(${P}\) and the coefficient of \(x^{2}\) is \(${Q}\). Find \(n\) and \(a\).`,
    correct: pair(n, a),
    wrong: wrongPairs.map(([nn, aa], i) => (i === 0 ? { value: pair(nn, aa), why: R`Then the coefficient of \(x\) would be \(${nn * aa}\), not \(${P}\).` } : i === 1 ? { value: pair(nn, aa), why: R`That gives \(na = ${P}\), but the \(x^{2}\) coefficient would be \(${B(nn, 2)}(${aa})^{2} = ${choose(nn, 2) * aa * aa}\).` } : pair(nn, aa))),
    solution: [
      R`\((1 + ax)^{n} = 1 + nax + \dfrac{n(n-1)}{2}a^{2}x^{2} + \dots\), so \(na = ${P}\) and \(\dfrac{n(n-1)}{2}a^{2} = ${Q}\).`,
      R`Write the second as \(\dfrac{(n-1)}{2n}(na)^{2} = ${Q}\): \(\dfrac{n-1}{2n} \cdot ${P * P} = ${Q}\), so \(${P * P}(n - 1) = ${2 * Q}n\).`,
      R`\(${P * P - 2 * Q}n = ${P * P}\), so \(n = ${n}\) and \(a = \dfrac{${P}}{${n}} = ${a}\).`,
    ],
    rule: 2,
    skill: 'working backwards',
    check: () => checkAll(checkEqual(coefOf(pc, 1), P), checkEqual(coefOf(pc, 2), Q), wrongPairs.every(([nn, aa]) => coefOf(expand(aa, 1, nn), 1) !== P || coefOf(expand(aa, 1, nn), 2) !== Q) ? true : 'a wrong pair also fits'),
  });
}

function challengeProduct(rng) {
  const n = rng.int(3, 6);
  const b = rng.nonzero(-3, 3);
  const pcoef = rng.pick([1, 2, 3, -1]);
  const c = rng.nonzero(-5, 5);
  const k = rng.int(2, n);
  const full = polyMul([pcoef, c], expand(1, b, n));
  const fromX = pcoef * choose(n, k - 1) * b ** (n - k + 1);
  const fromC = c * choose(n, k) * b ** (n - k);
  const ans = fromX + fromC;
  return q({
    prompt: R`Find the coefficient of \(${power('x', k)}\) in \((${linear(pcoef, c)})(${linear(1, b)})^{${n}}\).`,
    correct: ans,
    wrong: [
      { value: fromC, why: R`\(${term(pcoef, 'x')}\) times the \(${power('x', k - 1)}\) term also gives \(${power('x', k)}\).` },
      { value: fromX, why: R`\(${c}\) times the \(${power('x', k)}\) term also gives \(${power('x', k)}\).` },
      { value: pcoef * choose(n, k) * b ** (n - k) + c * choose(n, k - 1) * b ** (n - k + 1), why: R`Pair \(${term(pcoef, 'x')}\) with the \(${power('x', k - 1)}\) term and \(${c}\) with the \(${power('x', k)}\) term.` },
      fromX - fromC,
    ],
    solution: [
      R`An \(${power('x', k)}\) term comes from \(${term(pcoef, 'x')} \cdot (\text{the } ${power('x', k - 1)} \text{ term})\) and from \(${c} \cdot (\text{the } ${power('x', k)} \text{ term})\) of \((${linear(1, b)})^{${n}}\).`,
      R`The \(${power('x', k - 1)}\) coefficient of \((${linear(1, b)})^{${n}}\) is \(${B(n, k - 1)}${paren(b)}^{${n - k + 1}} = ${choose(n, k - 1) * b ** (n - k + 1)}\); the \(${power('x', k)}\) coefficient is \(${B(n, k)}${paren(b)}^{${n - k}} = ${choose(n, k) * b ** (n - k)}\).`,
      R`Total: \(${pcoef} \cdot ${paren(choose(n, k - 1) * b ** (n - k + 1))} + ${paren(c)} \cdot ${paren(choose(n, k) * b ** (n - k))} = ${ans}\).`,
    ],
    rule: 2,
    skill: 'coefficient of a product',
    check: () => checkEqual(coefOf(full, k), ans),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'binomial-theorem',
  title: 'Binomial Theorem & Series Notation',
  summary: "Use Pascal's triangle and nCr to expand binomials, find single terms, work with sigma notation, and apply binomial probability.",
  standards: ['CCSS A-APR.C.5', 'CCSS A-SSE.B.4', 'CCSS S-CP.B.9'],

  explain: {
    intro: R`Multiplying out \((a + b)^{n}\) by hand takes a long time, but the answer follows a pattern. Each term is a number of ways to choose, times a power of \(a\), times a power of \(b\). The same numbers count subsets and give the probability of \(k\) successes in \(n\) trials. Sigma notation is the shorthand for writing such long sums.`,
    rules: [
      {
        title: "Pascal's triangle",
        text: R`Each row starts and ends with 1, and every other entry is the sum of the two entries above it. Rows and entries are numbered from 0. Entry \(k\) of row \(n\) is \(${B('n', 'k')} = \dfrac{n!}{k!\,(n-k)!}\). Each row is symmetric, \(${B('n', 'k')} = ${B('n', 'n-k')}\), and row \(n\) adds up to \(2^{n}\).`,
        example: R`Row 4 is \(1, 4, 6, 4, 1\), so row 5 is \(1, 5, 10, 10, 5, 1\), and \(1 + 5 + 10 + 10 + 5 + 1 = 32 = 2^{5}\).`,
      },
      {
        title: 'The binomial theorem',
        text: R`\((a + b)^{n} = ${B('n', 0)}a^{n} + ${B('n', 1)}a^{n-1}b + ${B('n', 2)}a^{n-2}b^{2} + \dots + ${B('n', 'n')}b^{n}\). The power of \(a\) falls as the power of \(b\) rises, and the two always add to \(n\). When a part is \(2x\) or \(-3\), raise the whole part, sign included.`,
        example: R`\((x + 2)^{3} = x^{3} + 3x^{2}(2) + 3x(2)^{2} + 2^{3} = x^{3} + 6x^{2} + 12x + 8\).`,
      },
      {
        title: 'One term without the whole expansion',
        text: R`The general term of \((a + b)^{n}\) is \(${B('n', 'r')}a^{n-r}b^{r}\). Write the power of \(x\) in it as an expression in \(r\), set it equal to the power you want, and solve for \(r\). For even \(n\) the middle term is the one with \(r = \frac{n}{2}\). For a constant term, the power of \(x\) must be 0.`,
        example: R`In \(\left(x + \frac{1}{x}\right)^{6}\) the term \(${B(6, 'r')}x^{6-r}x^{-r}\) has power \(6 - 2r\). It is constant when \(r = 3\): \(${B(6, 3)} = 20\).`,
      },
      {
        title: 'Sigma notation',
        text: R`\(\displaystyle\sum_{k=m}^{n} a_{k}\) means: substitute \(k = m, m + 1, \dots, n\) and add the results; it has \(n - m + 1\) terms. To write a sum in sigma notation, find a rule \(a_{k}\) and the first and last index. Sums split term by term, constants factor out, and \(\sum_{k=1}^{n} c = nc\).`,
        example: R`\(\displaystyle\sum_{k=1}^{4} k^{2} = 1 + 4 + 9 + 16 = 30\). And \(2 + 5 + 8 + \dots + 29 = \displaystyle\sum_{k=1}^{10} (3k - 1)\).`,
      },
      {
        title: 'Formulas for series',
        text: R`\(\sum_{k=1}^{n} k = \frac{n(n+1)}{2}\) and \(\sum_{k=1}^{n} k^{2} = \frac{n(n+1)(2n+1)}{6}\). An arithmetic series has sum \(\frac{n(a_{1} + a_{n})}{2}\). A geometric series with first term \(a_{1}\) and ratio \(r\) has \(n\)-term sum \(a_{1}\frac{1 - r^{n}}{1 - r}\), and when \(|r| < 1\) the infinite series has sum \(\frac{a_{1}}{1 - r}\).`,
        example: R`\(\displaystyle\sum_{k=2}^{\infty} \left(\tfrac{1}{3}\right)^{k}\) starts at \(\frac{1}{9}\), so its sum is \(\dfrac{1/9}{1 - 1/3} = \dfrac{1}{6}\).`,
      },
      {
        title: 'Applications',
        text: R`A set of \(n\) items has \(2^{n}\) subsets. In \(n\) independent trials that each succeed with probability \(p\), the probability of exactly \(k\) successes is \(${B('n', 'k')}p^{k}(1 - p)^{n-k}\). For a small \(u\), the first terms of \((1 + u)^{n} = 1 + nu + ${B('n', 2)}u^{2} + \dots\) give a good estimate.`,
        example: R`\(1.02^{10} \approx 1 + 10(0.02) + 45(0.02)^{2} = 1.218\). The true value is about \(1.21899\).`,
      },
    ],
    vocab: [
      { term: 'binomial coefficient', def: R`\(${B('n', 'k')}\), read "n choose k": the number of ways to choose \(k\) items from \(n\), and entry \(k\) of row \(n\) of Pascal's triangle.` },
      { term: 'general term', def: R`The expression \(${B('n', 'r')}a^{n-r}b^{r}\) that gives every term of \((a + b)^{n}\) as \(r\) runs from 0 to \(n\).` },
      { term: 'index of summation', def: R`The variable (often \(k\)) in sigma notation that runs through whole numbers from the bottom limit to the top limit.` },
      { term: 'binomial probability', def: 'The probability of a given number of successes in a fixed number of independent trials with the same chance of success.' },
    ],
    mistakes: [
      R`Raising only the \(x\) in \((2x)^{3}\). The whole part is cubed: \((2x)^{3} = 8x^{3}\).`,
      R`Dropping the sign of a negative part. In \((x - 3)^{4}\) the terms alternate in sign, because \((-3)^{r}\) is negative for odd \(r\).`,
      R`Miscounting terms in sigma notation. From \(k = 0\) to \(k = 10\) there are 11 terms.`,
      R`Leaving out \(${B('n', 'k')}\) in a probability. \(p^{k}(1 - p)^{n-k}\) is the chance of one particular order only.`,
    ],
    visual: pascalTable(6),
  },

  examples: [
    {
      title: 'Expanding with a negative term',
      problem: R`Expand \((2x - 3)^{4}\).`,
      steps: [
        R`Row 4 of Pascal's triangle is \(1, 4, 6, 4, 1\). Use \(a = 2x\) and \(b = -3\).`,
        R`\(1(2x)^{4} + 4(2x)^{3}(-3) + 6(2x)^{2}(-3)^{2} + 4(2x)(-3)^{3} + (-3)^{4}\).`,
        R`\(= 16x^{4} + 4(8x^{3})(-3) + 6(4x^{2})(9) + 4(2x)(-27) + 81\).`,
        R`\(= 16x^{4} - 96x^{3} + 216x^{2} - 216x + 81\). The signs alternate because \(b\) is negative.`,
      ],
      answer: R`\(16x^{4} - 96x^{3} + 216x^{2} - 216x + 81\)`,
      visual: pascalTable(4),
    },
    {
      title: 'The constant term',
      problem: R`Find the constant term of \(\left(x^{2} + \dfrac{2}{x}\right)^{6}\).`,
      steps: [
        R`General term: \(${B(6, 'r')}(x^{2})^{6-r}\left(\frac{2}{x}\right)^{r} = ${B(6, 'r')}2^{r}x^{12 - 2r - r} = ${B(6, 'r')}2^{r}x^{12 - 3r}\).`,
        R`Constant means \(12 - 3r = 0\), so \(r = 4\).`,
        R`\(${B(6, 4)} \cdot 2^{4} = 15 \cdot 16 = 240\).`,
      ],
      answer: R`\(240\)`,
    },
    {
      title: 'Writing and evaluating a series',
      problem: R`Write \(5 + 9 + 13 + \dots + 81\) in sigma notation and find its sum. Then find \(\displaystyle\sum_{k=1}^{\infty} 6\left(\tfrac{2}{3}\right)^{k}\).`,
      steps: [
        R`The terms go up by 4 and the first is 5, so \(a_{k} = 5 + 4(k - 1) = 4k + 1\).`,
        R`The last term: \(4k + 1 = 81\) gives \(k = 20\). So the sum is \(\displaystyle\sum_{k=1}^{20} (4k + 1) = \frac{20(5 + 81)}{2} = 860\).`,
        R`The infinite series is geometric with \(r = \frac{2}{3}\) and first term \(6 \cdot \frac{2}{3} = 4\). Since \(|r| < 1\), its sum is \(\dfrac{4}{1 - 2/3} = 12\).`,
      ],
      answer: R`\(\displaystyle\sum_{k=1}^{20} (4k + 1) = 860\); the infinite series sums to \(12\).`,
    },
    {
      title: 'Word problem: free throws',
      word: true,
      problem: 'Jordan makes 70% of free throws. In 5 independent attempts, what is the probability that Jordan makes exactly 3?',
      steps: [
        R`Success probability \(p = 0.7\), failure probability \(0.3\), \(n = 5\) trials, \(k = 3\) successes.`,
        R`One order, such as make-make-make-miss-miss, has probability \(0.7^{3} \cdot 0.3^{2} = 0.03087\).`,
        R`There are \(${B(5, 3)} = 10\) orders, so \(P = 10 \cdot 0.03087 = 0.3087\).`,
      ],
      answer: R`\(0.3087\), about \(31\%\)`,
      visual: {
        type: 'barChart',
        bars: [0, 1, 2, 3, 4, 5].map((k) => ({ label: `${k}`, value: round(choose(5, k) * 0.7 ** k * 0.3 ** (5 - k), 3) })),
        xLabel: 'free throws made',
        yLabel: 'probability',
        alt: 'Bar chart of the probability of making 0 to 5 of 5 free throws at 70%: 0 → 0.002, 1 → 0.028, 2 → 0.132, 3 → 0.309, 4 → 0.360, 5 → 0.168.',
      },
    },
  ],

  models: [
    {
      id: 'expand-binomial',
      title: 'Expand (ax + b)ⁿ',
      intro: 'Choose a, b and n. Each term is a binomial coefficient times a power of ax times a power of b.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x)', type: 'int', min: -5, max: 5, value: 2 },
        { name: 'b', label: 'b (constant)', type: 'int', min: -9, max: 9, value: -3 },
        { name: 'n', label: 'n (power)', type: 'int', min: 1, max: 8, value: 4 },
      ],
      compute({ a, b, n }) {
        if (a === 0 || b === 0) return { error: 'With a = 0 or b = 0 there is only one term, so there is nothing to expand. Choose nonzero a and b.' };
        const row = pascalRows(n)[n];
        const p = expand(a, b, n);
        const rows = [];
        for (let r = n; r >= 0; r--) {
          const c = row[r] * a ** r * b ** (n - r);
          rows.push([M(r), M(row[r]), M(num(a ** r)), M(num(b ** (n - r))), M(term(c, power('x', r)))]);
        }
        return {
          problem: R`Expand \((${linear(a, b)})^{${n}}\).`,
          steps: [
            R`Row ${n} of Pascal's triangle: \(${row.join(',\ ')}\).`,
            R`Each term is \(${B(n, 'r')}(${term(a, 'x')})^{r}(${b})^{${n} - r}\); the table works out each one.`,
            R`Add the terms: \(${poly(p)}\).`,
            R`Check: setting \(x = 1\) gives \(${paren(a + b)}^{${n}} = ${num((a + b) ** n)}\), and the coefficients add to \(${num(p.reduce((s, v) => s + v, 0))}\).`,
          ],
          answer: R`\(${poly(p)}\)`,
          visual: {
            type: 'table',
            headers: [M('x\\text{-power } r'), M(B(n, 'r')), M(`${paren(a)}^{r}`), M(`${paren(b)}^{${n}-r}`), 'term'],
            rows,
            alt: `Table of the ${n + 1} terms of the expansion. ${rows.map((rw, i) => `Power ${n - i}: term ${txt(row[n - i] * a ** (n - i) * b ** (i))}`).join('; ')}.`,
          },
        };
      },
    },
    {
      id: 'binomial-probability',
      title: 'Word problem: exactly k successes',
      word: true,
      intro: 'A player takes n independent shots and makes each with the same probability. Choose the numbers to see the probability of exactly k makes and the whole distribution.',
      inputs: [
        { name: 'n', label: 'Number of shots', type: 'int', min: 1, max: 10, value: 6 },
        { name: 'pct', label: 'Chance of making each shot (%)', type: 'int', min: 1, max: 99, value: 60 },
        { name: 'k', label: 'Exactly how many made', type: 'int', min: 0, max: 10, value: 4 },
      ],
      compute({ n, pct, k }) {
        if (k > n) return { error: `There are only ${n} shots, so the number made cannot be more than ${n}.` };
        const p = pct / 100;
        const qn = round(1 - p, 2);
        const P = (j) => choose(n, j) * p ** j * (1 - p) ** (n - j);
        const ans = P(k);
        return {
          problem: `Sam makes ${pct}% of shots and takes ${n} independent ${n === 1 ? 'shot' : 'shots'}. What is the probability that Sam makes exactly ${k}?`,
          steps: [
            R`Success \(p = ${num(p)}\), failure \(${num(qn)}\), \(n = ${n}\), \(k = ${k}\).`,
            R`One order of ${k} makes and ${n - k} misses: \(${num(p)}^{${k}} \cdot ${num(qn)}^{${n - k}} \approx ${num(round(p ** k * (1 - p) ** (n - k), 6))}\).`,
            R`Number of orders: \(${B(n, k)} = ${choose(n, k)}\).`,
            R`\(P = ${choose(n, k)} \cdot ${num(round(p ** k * (1 - p) ** (n - k), 6))} \approx ${num(round(ans, 4), { fixed: 4 })}\).`,
          ],
          answer: R`\(\approx ${num(round(ans, 4), { fixed: 4 })}\)`,
          visual: {
            type: 'barChart',
            bars: Array.from({ length: n + 1 }, (_, j) => ({ label: `${j}`, value: round(P(j), 3) })),
            xLabel: 'shots made',
            yLabel: 'probability',
            showValues: n <= 6,
            alt: `Bar chart of the probability of each number of makes from 0 to ${n}: ${Array.from({ length: n + 1 }, (_, j) => `${j} → ${round(P(j), 3)}`).join(', ')}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyPascal, easyCoefficient, easySigmaExpand],
    medium: [mediumCoefficient, mediumSigmaWrite, mediumBinomialProb],
    hard: [hardConstantTerm, hardSeriesSum, hardAtLeast],
    challenge: [challengeApprox, challengeFindN, challengeProduct],
  },
};
