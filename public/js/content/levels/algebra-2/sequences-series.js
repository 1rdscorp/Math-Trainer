import { R, q, frac, terms, linear, num, txt, money, ordinal, paren, signed, dot, sum, range, polyEval, person, checkEqual } from '../../lib/index.js';
import { M, symChoices, val } from './_shared.js';

// ───────────── Helpers ─────────────

const one = frac(1);
// A list of terms: "3, 6, 12, \ldots". Thousands separators are left out so they cannot be read as list commas.
const listTex = (ts, tail = R`, \ldots`) => ts.map((t) => num(t, { commas: false })).join(', ') + tail;
// A series: "9 - 6 + 4 - \cdots". Pass the next term to continue with the right sign.
const seriesTex = (ts, next) => terms(ts.map((t) => [t, ''])) + (next == null ? '' : ` ${val(next) < 0 ? '-' : '+'} \\cdots`);
// The k-th term of a geometric sequence, as an exact fraction (r is a Frac).
const geo = (a1, r, k) => r.pow(k - 1).mul(a1);
// A ratio written as the base of a power: 2 → "2", −2 → "\left(-2\right)", 1/2 → "\left(\frac{1}{2}\right)".
const base = (r) => (r.isInt() && r.n > 0 ? num(r) : `\\left(${num(r)}\\right)`);
const whole = (v) => (Number.isInteger(v) ? v : null);

// Geometric sequences with tidy terms: the ratio, possible first terms and the range for n.
const GEO = [
  { r: [2, 1], firsts: [1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -5], n: [6, 10] },
  { r: [3, 1], firsts: [1, 2, 3, 4, 5, -1, -2, -4], n: [5, 8] },
  { r: [-2, 1], firsts: [1, 2, 3, 4, 5, 6, -1, -3], n: [6, 9] },
  { r: [-3, 1], firsts: [1, 2, 3, 4, -2], n: [5, 7] },
  { r: [1, 2], firsts: [32, 48, 64, 80, 96, 160], n: [5, 8] },
  { r: [-1, 2], firsts: [32, 64, 96, 128], n: [5, 8] },
  { r: [1, 3], firsts: [81, 162, 243], n: [4, 7] },
  { r: [2, 3], firsts: [81, 162, 243], n: [4, 6] },
  { r: [3, 2], firsts: [16, 32, 64], n: [4, 6] },
];
function pickGeo(rng) {
  const g = rng.pick(GEO);
  return { a1: rng.pick(g.firsts), r: frac(...g.r), n: rng.int(...g.n) };
}

// ───────────── Easy ─────────────

function easyNextTerm(rng) {
  if (rng.bool(0.5)) {
    const a1 = rng.int(-12, 25);
    const d = rng.nonzero(-9, 9);
    const t = range(0, 3).map((k) => a1 + k * d);
    const next = t[3] + d;
    return q({
      prompt: R`What is the next term of the arithmetic sequence \(${listTex(t)}\)?`,
      correct: next,
      wrong: [
        { value: next + d, why: R`That is two steps past \(${t[3]}\). Add the common difference only once.` },
        d < 0 ? { value: t[3] - d, why: R`The terms are going down: \(${t[1]} - ${paren(t[0])} = ${d}\), so the common difference is negative.` } : null,
      ],
      solution: [
        R`Subtract neighbouring terms to find the common difference: \(${t[1]} - ${paren(t[0])} = ${d}\).`,
        R`Add it to the last term shown: \(${t[3]} + ${paren(d)} = ${next}\).`,
      ],
      rule: 0, skill: 'arithmetic sequences',
      check: () => (next - t[3] === t[1] - t[0] && t[3] - t[2] === t[1] - t[0] ? true : 'the differences are not equal'),
    });
  }
  const r = frac(...rng.pick([[2, 1], [3, 1], [4, 1], [5, 1], [-2, 1], [-3, 1], [1, 2], [1, 3]]));
  const a1 = r.isInt() ? rng.nonzero(-5, 6) : r.d ** 4 * rng.int(1, 5);
  const t = range(1, 4).map((k) => geo(a1, r, k));
  const next = geo(a1, r, 5);
  return q({
    prompt: R`What is the next term of the geometric sequence \(${listTex(t)}\)?`,
    correct: next,
    wrong: [
      r.n < 0 ? { value: next.neg(), why: R`Multiplying by \(${num(r)}\) changes the sign every time, so the signs alternate.` } : null,
      { value: t[3].add(t[3].sub(t[2])), why: R`The gaps between the terms are not equal, so repeating the last gap does not work. Each term is the one before **times** \(${num(r)}\).` },
      { value: geo(a1, r, 6), why: R`That is two steps past \(${num(t[3])}\). Multiply by the common ratio only once.` },
      r.isInt() ? t[3].add(r) : null,
    ],
    solution: [
      R`Divide a term by the one before it to find the common ratio: \(${num(t[1])} \div ${paren(t[0])} = ${num(r)}\).`,
      R`Multiply the last term shown by the ratio: \(${dot(t[3], r)} = ${num(next)}\).`,
    ],
    rule: 1, skill: 'geometric sequences',
    check: () => (next.mul(t[0]).eq(t[3].mul(t[1])) && t[2].mul(t[0]).eq(t[1].mul(t[1])) ? true : 'the ratios are not equal'),
  });
}

function easyExplicitTerm(rng) {
  const kind = rng.pick(['first', 'rule', 'power']);
  if (kind === 'power') {
    const a = rng.int(2, 5);
    const r = rng.int(2, 4);
    const n = rng.int(3, 8 - r); // keeps every choice below about 100 000
    const value = a * r ** (n - 1);
    return q({
      prompt: R`The rule for a geometric sequence is \(a_n = ${a} \cdot ${r}^{n-1}\). Find \(a_{${n}}\).`,
      correct: value,
      wrong: [
        { value: a * r ** n, why: R`The exponent is \(n - 1\). For \(n = ${n}\) that is \(${n - 1}\), not \(${n}\).` },
        { value: (a * r) ** (n - 1), why: R`The exponent applies only to \(${r}\). Find \(${r}^{${n - 1}}\) first, then multiply by \(${a}\).` },
        a * r * (n - 1), a * r ** (n - 2),
      ],
      solution: [
        R`Substitute \(n = ${n}\): \(a_{${n}} = ${a} \cdot ${r}^{${n} - 1} = ${a} \cdot ${r}^{${n - 1}}\).`,
        R`Powers come before multiplication: \(${r}^{${n - 1}} = ${r ** (n - 1)}\), so \(a_{${n}} = ${a} \cdot ${r ** (n - 1)} = ${value}\).`,
      ],
      rule: 1, skill: 'explicit rules',
      check: () => (range(2, n).reduce((v) => v * r, a) === value ? true : 'repeated multiplication gives a different term'),
    });
  }
  const d = rng.intExcept(-9, 9, [-1, 0, 1]);
  const n = rng.int(8, 30);
  if (kind === 'first') {
    const a1 = rng.nonzero(-15, 20);
    const value = a1 + (n - 1) * d;
    return q({
      prompt: R`An arithmetic sequence has first term \(a_1 = ${a1}\) and common difference \(d = ${d}\). Find \(a_{${n}}\).`,
      correct: value,
      wrong: [
        { value: a1 + n * d, why: R`Getting from \(a_1\) to \(a_{${n}}\) takes \(${n - 1}\) steps, not \(${n}\).` },
        { value: (n - 1) * d, why: R`That is how far \(a_{${n}}\) is from the first term. Add it to \(a_1 = ${a1}\).` },
        a1 + (n - 2) * d, a1 * n + d,
      ],
      solution: [
        R`Use \(a_n = a_1 + (n - 1)d\) with \(n = ${n}\): \(a_{${n}} = ${a1} + (${n} - 1)(${d})\).`,
        R`\(a_{${n}} = ${a1} + ${n - 1}(${d}) = ${a1} ${signed((n - 1) * d)} = ${value}\).`,
      ],
      rule: 0, skill: 'explicit rules',
      check: () => (range(2, n).reduce((v) => v + d, a1) === value ? true : 'repeated addition gives a different term'),
    });
  }
  const c = rng.nonzero(-12, 12);
  const value = d * n + c;
  return q({
    prompt: R`The rule for a sequence is \(a_n = ${linear(d, c, 'n')}\). Find \(a_{${n}}\).`,
    correct: value,
    wrong: [
      { value: d * (n - 1) + c, why: R`This rule gives the term directly, so substitute \(n = ${n}\), not \(${n - 1}\).` },
      { value: d * n, why: R`The constant term \(${c}\) is part of the rule too.` },
      d * (n + c), d + n + c,
    ],
    solution: [R`Substitute \(n = ${n}\) into the rule: \(a_{${n}} = ${d}(${n}) ${signed(c)}\).`, R`\(a_{${n}} = ${d * n} ${signed(c)} = ${value}\).`],
    rule: 0, skill: 'explicit rules',
    check: () => (polyEval([d, c], n) === value ? true : 'the rule gives a different value'),
  });
}

function easyRecursive(rng) {
  const kind = rng.pick(['add', 'add', 'times', 'both']);
  const m = kind === 'add' ? 1 : rng.pick(kind === 'times' ? [2, 3, -2] : [2, 3]);
  const c = kind === 'times' ? 0 : kind === 'add' ? rng.nonzero(-9, 9) : rng.nonzero(-5, 5);
  const a1 = kind === 'times' ? rng.nonzero(-4, 6) : rng.int(-6, 10);
  const n = rng.int(4, kind === 'add' ? 6 : 5);
  const a = [a1];
  for (let k = 1; k <= n; k++) a.push(m * a[k - 1] + c); // a[k] holds the term a_{k+1}
  if (a[1] === a[0]) return easyRecursive(rng); // a constant sequence makes a dull question
  const value = a[n - 1];
  const work = (prev) => (kind === 'add' ? `${prev} ${signed(c)}` : kind === 'times' ? dot(m, prev) : `${dot(m, prev)} ${signed(c)}`);
  return q({
    prompt: R`A sequence is defined by \(a_1 = ${a1}\) and \(a_n = ${terms([[m, 'a_{n-1}'], [c, '']])}\) for \(n \ge 2\). Find \(a_{${n}}\).`,
    correct: value,
    wrong: [
      { value: a[n - 2], why: R`That is \(a_{${n - 1}}\). Apply the rule once more.` },
      { value: m * (n - 1) + c, why: R`\(a_{n-1}\) means the previous **term** of the sequence, not the number \(n - 1\).` },
      { value: a[n], why: R`That is \(a_{${n + 1}}\). Starting from \(a_1\), the rule is applied \(${n - 1}\) times to reach \(a_{${n}}\).` },
    ],
    solution: [
      R`A recursive rule builds each term from the one before it. Start from \(a_1 = ${a1}\).`,
      range(2, n).map((k) => R`\(a_{${k}} = ${work(a[k - 2])} = ${a[k - 1]}\)`).join(', ') + '.',
      R`So \(a_{${n}} = ${value}\).`,
    ],
    rule: 2, skill: 'recursive rules',
    check: () => {
      const p = m ** (n - 1);
      const closed = m === 1 ? a1 + (n - 1) * c : p * a1 + (c * (p - 1)) / (m - 1);
      return closed === value ? true : `the closed form gives ${closed}`;
    },
  });
}

// ───────────── Medium ─────────────

function mediumGeometricTerm(rng) {
  const { a1, r, n } = pickGeo(rng);
  const t = range(1, 3).map((k) => geo(a1, r, k));
  const value = geo(a1, r, n);
  const even = (n - 1) % 2 === 0;
  return q({
    prompt: R`Find the ${ordinal(n)} term of the geometric sequence \(${listTex(t)}\).`,
    correct: value,
    wrong: [
      r.n < 0 ? { value: value.neg(), why: R`\(${base(r)}^{${n - 1}}\) is ${even ? 'positive' : 'negative'}, because the exponent \(${n - 1}\) is ${even ? 'even' : 'odd'}.` } : null,
      { value: geo(a1, r, n + 1), why: R`The first term has not been multiplied by the ratio yet, so the ${ordinal(n)} term uses the exponent \(${n - 1}\), not \(${n}\).` },
      { value: r.mul(n - 1).add(a1), why: R`That adds the ratio each time. In a geometric sequence each term is **multiplied** by the ratio.` },
      geo(a1, r, n - 1), r.mul(a1 * (n - 1)),
    ],
    solution: [
      R`Common ratio: \(r = ${num(t[1])} \div ${paren(t[0])} = ${num(r)}\).`,
      R`Use \(a_n = a_1 \cdot r^{n-1}\) with \(n = ${n}\): \(a_{${n}} = ${a1} \cdot ${base(r)}^{${n - 1}}\).`,
      R`\(${base(r)}^{${n - 1}} = ${num(r.pow(n - 1))}\), so \(a_{${n}} = ${dot(a1, r.pow(n - 1))} = ${num(value)}\).`,
    ],
    rule: 1, skill: 'geometric sequences',
    check: () => (range(2, n).reduce((v) => v.mul(r), frac(a1)).eq(value) ? true : 'repeated multiplication gives a different term'),
  });
}

function mediumArithmeticSeries(rng) {
  const a1 = rng.int(-10, 20);
  const d = rng.nonzero(-6, 9);
  const n = rng.int(10, 40);
  const last = a1 + (n - 1) * d;
  const total = (n * (a1 + last)) / 2;
  return q({
    prompt: R`Find the sum of the first ${n} terms of the arithmetic sequence \(${listTex([a1, a1 + d, a1 + 2 * d])}\).`,
    correct: total,
    wrong: [
      { value: n * (a1 + last), why: R`The sum is the number of terms times the **average** of the first and last terms, so divide by 2.` },
      { value: last, why: R`That is the ${ordinal(n)} term. The question asks for the sum of the first ${n} terms.` },
      { value: whole((n * (2 * a1 + n * d)) / 2), why: R`The ${ordinal(n)} term is \(a_1 + ${n - 1}d = ${last}\). It is \(${n - 1}\) steps from the first term, not \(${n}\).` },
      whole(((n - 1) * (a1 + last)) / 2), total + n,
    ],
    solution: [
      R`Common difference: \(d = ${a1 + d} - ${paren(a1)} = ${d}\).`,
      R`The ${ordinal(n)} term: \(a_{${n}} = ${a1} + ${n - 1}(${d}) = ${last}\).`,
      R`\(S_{${n}} = \dfrac{n(a_1 + a_n)}{2} = \dfrac{${n}(${a1} + ${paren(last)})}{2} = ${num(total)}\).`,
    ],
    rule: 3, skill: 'arithmetic series',
    check: () => (sum(range(0, n - 1).map((k) => a1 + k * d)) === total ? true : 'adding the terms one by one gives a different total'),
  });
}

function mediumWriteRule(rng) {
  const recursive = rng.bool(0.4);
  const opt = (tex, f, why) => ({ tex: `a_n = ${tex}`, f, why });
  if (rng.bool(0.5)) {
    const a1 = rng.nonzero(-9, 15);
    const d = rng.intExcept(-8, 9, [-1, 0, 1, a1]);
    const t = [a1];
    while (t.length < 4) t.push(t[t.length - 1] + d);
    const rule = linear(d, a1 - d, 'n');
    return q({
      prompt: recursive
        ? R`A sequence is defined by \(a_1 = ${a1}\) and \(a_n = a_{n-1} ${signed(d)}\) for \(n \ge 2\). Which explicit rule gives the same sequence?`
        : R`Which explicit rule gives the \(n\)th term of the arithmetic sequence \(${listTex(t)}\)?`,
      ...symChoices(opt(rule, (n) => d * n + a1 - d), [
        opt(linear(d, a1, 'n'), (n) => d * n + a1, R`Test \(n = 1\): this rule gives \(${d + a1}\), but the first term is \(${a1}\). Simplify \(${a1} + (n - 1)(${d})\) instead.`),
        opt(linear(a1, d, 'n'), (n) => a1 * n + d, R`The common difference, \(${d}\), is the number that multiplies \(n\).`),
        opt(linear(-d, a1 + d, 'n'), (n) => -d * n + a1 + d, R`This rule gives the right first term, but test \(n = 2\): it gives \(${a1 - d}\), not \(${a1 + d}\).`),
        opt(linear(d, d - a1, 'n'), (n) => d * n + d - a1),
        opt(linear(d, a1 + d, 'n'), (n) => d * n + a1 + d),
      ], [1, 2, 3, 4]),
      solution: [
        R`The first term is \(a_1 = ${a1}\) and the common difference is \(d = ${d}\).`,
        R`\(a_n = a_1 + (n - 1)d = ${a1} + (n - 1)(${d})\).`,
        R`Distribute and combine: \(a_n = ${rule}\). Check: \(n = 1\) gives \(${a1}\) and \(n = 2\) gives \(${a1 + d}\). ✓`,
      ],
      rule: recursive ? 2 : 0, skill: 'writing explicit rules',
      check: () => (t.every((v, k) => polyEval([d, a1 - d], k + 1) === v) ? true : 'the rule does not reproduce the terms'),
    });
  }
  const a1 = rng.int(2, 7);
  const r = rng.pick([2, 3, 4, 5, -2, -3].filter((v) => Math.abs(v) !== a1));
  const t = [a1];
  while (t.length < 4) t.push(t[t.length - 1] * r);
  const rt = r < 0 ? `(${r})` : `${r}`;
  return q({
    prompt: recursive
      ? R`A sequence is defined by \(a_1 = ${a1}\) and \(a_n = ${r}a_{n-1}\) for \(n \ge 2\). Which explicit rule gives the same sequence?`
      : R`Which explicit rule gives the \(n\)th term of the geometric sequence \(${listTex(t)}\)?`,
    ...symChoices(opt(`${a1} \\cdot ${rt}^{n-1}`, (n) => a1 * r ** (n - 1)), [
      opt(`${a1} \\cdot ${rt}^{n}`, (n) => a1 * r ** n, R`Test \(n = 1\): this rule gives \(${a1 * r}\), but the first term is \(${a1}\).`),
      opt(`${r} \\cdot ${a1}^{n-1}`, (n) => r * a1 ** (n - 1), R`The common ratio, \(${r}\), is the base of the power. The first term goes in front.`),
      opt(`${paren(a1 * r)}^{n-1}`, (n) => (a1 * r) ** (n - 1), R`The exponent applies only to the ratio. Test \(n = 1\): this rule gives \(1\), not \(${a1}\).`),
      opt(linear(r, a1 - r, 'n'), (n) => r * n + a1 - r),
    ], [1, 2, 3, 4]),
    solution: [
      R`The first term is \(a_1 = ${a1}\) and the common ratio is \(r = ${r}\).`,
      R`\(a_n = a_1 \cdot r^{n-1} = ${a1} \cdot ${rt}^{n-1}\).`,
      R`Check: \(n = 1\) gives \(${a1}\) and \(n = 2\) gives \(${a1 * r}\). ✓`,
    ],
    rule: recursive ? 2 : 1, skill: 'writing explicit rules',
    check: () => (t.every((v, k) => a1 * r ** k === v) ? true : 'the rule does not reproduce the terms'),
  });
}

// ───────────── Hard ─────────────

function hardNumberOfTerms(rng) {
  if (rng.bool(0.55)) {
    const a1 = rng.int(-20, 40);
    const d = rng.sign() * rng.int(2, 9);
    const n = rng.int(12, 60);
    const last = a1 + (n - 1) * d;
    return q({
      prompt: R`How many terms are in the arithmetic sequence \(${listTex([a1, a1 + d, a1 + 2 * d], R`, \ldots, ${last}`)}\)?`,
      correct: n,
      wrong: [
        { value: n - 1, why: R`\((${last} - ${paren(a1)}) \div ${paren(d)} = ${n - 1}\) counts the steps between terms. There is one more term than there are steps.` },
        n + 1,
        { value: Math.abs(last - a1), why: R`That is the distance from the first term to the last. Divide it by the size of each step, then add 1.` },
        n - 2,
      ],
      solution: [
        R`Common difference: \(d = ${a1 + d} - ${paren(a1)} = ${d}\).`,
        R`Set the \(n\)th term equal to the last term: \(${a1} + (n - 1)(${d}) = ${last}\).`,
        R`So \((n - 1)(${d}) = ${last} - ${paren(a1)} = ${last - a1}\), which gives \(n - 1 = ${last - a1} \div ${paren(d)} = ${n - 1}\).`,
        R`\(n = ${n}\): the sequence has ${n} terms.`,
      ],
      rule: 0, skill: 'number of terms',
      check: () => {
        let count = 1;
        for (let v = a1; v !== last && count < 500; v += d) count++;
        return count === n ? true : `counting the terms gives ${count}`;
      },
    });
  }
  const [p, den, firsts, lo, hi] = rng.pick([[2, 1, [1, 2, 3, 5, 7], 7, 12], [3, 1, [1, 2, 4, 5], 5, 8], [1, 2, [1, 3, 5], 6, 10], [1, 3, [1, 2], 5, 7]]);
  const r = frac(p, den);
  const n = rng.int(lo, hi);
  const a1 = rng.pick(firsts) * den ** (n - 1); // for a ratio below 1, the LAST term is the small whole number
  const t = range(1, 3).map((k) => geo(a1, r, k));
  const last = geo(a1, r, n);
  const asArithmetic = last.sub(a1).div(t[1].sub(a1)).add(1);
  return q({
    prompt: R`How many terms are in the geometric sequence \(${listTex(t, R`, \ldots, ${num(last, { commas: false })}`)}\)?`,
    correct: n,
    wrong: [
      { value: n - 1, why: R`\(${n - 1}\) is the exponent in \(r^{n-1}\). The number of terms is one more than that.` },
      asArithmetic.isInt() && asArithmetic.n > 0 ? { value: asArithmetic.n, why: R`The differences between these terms are not equal, so the arithmetic rule does not apply. Use \(a_n = a_1 \cdot r^{n-1}\).` } : null,
      n + 1, n + 2,
    ],
    solution: [
      R`Common ratio: \(r = ${num(t[1])} \div ${num(t[0])} = ${num(r)}\).`,
      R`Set the \(n\)th term equal to the last term: \(${a1} \cdot ${base(r)}^{n-1} = ${num(last)}\).`,
      R`Divide by \(${a1}\): \(${base(r)}^{n-1} = ${num(r.pow(n - 1))}\). Since \(${base(r)}^{${n - 1}} = ${num(r.pow(n - 1))}\), \(n - 1 = ${n - 1}\).`,
      R`\(n = ${n}\): the sequence has ${n} terms.`,
    ],
    rule: 1, skill: 'number of terms',
    check: () => {
      let count = 1;
      for (let v = frac(a1); !v.eq(last) && count < 50; v = v.mul(r)) count++;
      return count === n ? true : `counting the terms gives ${count}`;
    },
  });
}

function hardGeometricSeries(rng) {
  const { a1, r, n } = pickGeo(rng);
  const t = range(1, 4).map((k) => geo(a1, r, k));
  const sumOf = (count) => one.sub(r.pow(count)).div(one.sub(r)).mul(a1);
  const total = sumOf(n);
  const last = geo(a1, r, n);
  return q({
    prompt: R`Find the sum of the first ${n} terms of the geometric series \(${seriesTex(t.slice(0, 3), t[3])}\).`,
    correct: total,
    wrong: [
      { value: sumOf(n - 1), why: R`That is the sum of only ${n - 1} terms. The exponent in the sum formula is the number of terms, \(${n}\).` },
      { value: last, why: R`That is the ${ordinal(n)} term on its own. The question asks for the sum of all ${n} terms.` },
      { value: one.sub(r.pow(n)).div(one.add(r)).mul(a1), why: R`The denominator is \(1 - r\). With \(r = ${num(r)}\), that is \(${num(one.sub(r))}\).` },
      last.add(a1).mul(n).div(2), total.neg(),
    ],
    solution: [
      R`First term \(a_1 = ${a1}\), common ratio \(r = ${num(t[1])} \div ${paren(t[0])} = ${num(r)}\), number of terms \(n = ${n}\).`,
      R`\(S_n = \dfrac{a_1(1 - r^{n})}{1 - r} = \dfrac{${a1}\left(1 - ${base(r)}^{${n}}\right)}{1 - ${paren(r)}}\).`,
      R`\(${base(r)}^{${n}} = ${num(r.pow(n))}\), so \(S_{${n}} = \dfrac{${a1}\left(${num(one.sub(r.pow(n)))}\right)}{${num(one.sub(r))}} = ${num(total)}\).`,
    ],
    rule: 4, skill: 'geometric series',
    check: () => (range(1, n).reduce((s, k) => s.add(geo(a1, r, k)), frac(0)).eq(total) ? true : 'adding the terms one by one gives a different total'),
  });
}

function hardSigma(rng) {
  if (rng.bool(0.6)) {
    const m = rng.pick([1, 1, 2, 3, 4, 5]);
    const N = m + rng.int(9, 35);
    const a = rng.intExcept(-5, 9, [-1, 0, 1]);
    const b = rng.nonzero(-10, 10);
    const count = N - m + 1;
    const [first, last] = [a * m + b, a * N + b];
    const total = (count * (first + last)) / 2;
    return q({
      prompt: R`Evaluate \(\displaystyle\sum_{k=${m}}^{${N}} (${linear(a, b, 'k')})\).`,
      correct: total,
      wrong: [
        { value: whole(((N - m) * (first + last)) / 2), why: R`From \(k = ${m}\) to \(k = ${N}\) there are \(${N} - ${m} + 1 = ${count}\) terms, not \(${N - m}\).` },
        m > 1 ? { value: (N * (a + b + last)) / 2, why: R`The sum starts at \(k = ${m}\), not \(k = 1\). The first term is \(${first}\) and there are \(${count}\) terms.` } : null,
        { value: count * (first + last), why: R`Multiply the number of terms by the **average** of the first and last terms, so divide by 2.` },
        last, total + a,
      ],
      solution: [
        R`Each term is \(${Math.abs(a)}\) ${a > 0 ? 'more' : 'less'} than the one before, so this is an arithmetic series.`,
        R`First term (\(k = ${m}\)): \(${a}(${m}) ${signed(b)} = ${first}\). Last term (\(k = ${N}\)): \(${a}(${N}) ${signed(b)} = ${last}\).`,
        R`Number of terms: \(${N} - ${m} + 1 = ${count}\).`,
        R`Sum: \(\dfrac{${count}(${first} + ${paren(last)})}{2} = ${num(total)}\).`,
      ],
      rule: 5, skill: 'sigma notation',
      check: () => (sum(range(m, N).map((k) => a * k + b)) === total ? true : 'adding the terms one by one gives a different total'),
    });
  }
  const a = rng.int(2, 6);
  const r = rng.pick([2, 2, 3]);
  const n = rng.int(4, r === 2 ? 8 : 6);
  const form = rng.pick(['k-1', 'from 0', 'k']);
  const lo = form === 'from 0' ? 0 : 1;
  const shift = form === 'k-1' ? 1 : 0; // the exponent is k − shift
  const g = (first, count) => (first * (r ** count - 1)) / (r - 1);
  const [plain, extra, late] = [g(a, n), g(a, n + 1), g(a * r, n)]; // first term a with n terms; with n + 1 terms; first term ar with n terms
  const total = form === 'k-1' ? plain : form === 'from 0' ? extra : late;
  const first = form === 'k' ? a * r : a;
  const count = n - lo + 1;
  return q({
    prompt: R`Evaluate \(\displaystyle\sum_{k=${lo}}^{${n}} ${a} \cdot ${r}^{${shift ? 'k-1' : 'k'}}\).`,
    correct: total,
    wrong: [
      form === 'k-1' ? { value: late, why: R`At \(k = 1\) the exponent is \(0\), so the first term is \(${a}\), not \(${a * r}\).` } : null,
      form === 'from 0' ? { value: plain, why: R`\(k\) runs from \(0\) to \(${n}\). That is \(${n + 1}\) terms, not \(${n}\).` } : null,
      form === 'k' ? { value: plain, why: R`The first term is the value at \(k = 1\), which is \(${a} \cdot ${r} = ${a * r}\), not \(${a}\).` } : null,
      { value: a * r ** (n - shift), why: R`That is only the last term. The \(\Sigma\) sign means add all of the terms.` },
      plain, extra, late,
    ],
    solution: [
      R`Write out the first terms: \(${seriesTex([first, first * r, first * r * r], 1)}\). This is a geometric series with \(a_1 = ${first}\) and \(r = ${r}\).`,
      R`\(k\) runs from \(${lo}\) to \(${n}\), so there are \(${count}\) terms.`,
      R`\(S = \dfrac{a_1(1 - r^{n})}{1 - r} = \dfrac{${first}(1 - ${r}^{${count}})}{1 - ${r}} = \dfrac{${first}(${num(1 - r ** count)})}{${1 - r}} = ${num(total)}\).`,
    ],
    rule: 5, skill: 'sigma notation',
    check: () => (sum(range(lo, n).map((k) => a * r ** (k - shift))) === total ? true : 'adding the terms one by one gives a different total'),
  });
}

function hardWordSeries(rng) {
  const name = person(rng);
  if (rng.bool(0.3)) {
    const a = rng.int(2, 9);
    const r = rng.pick([2, 2, 3]);
    const n = rng.int(5, r === 2 ? 10 : 7);
    const total = (a * (r ** n - 1)) / (r - 1);
    return q({
      prompt: `A new video gets ${a} views on its first day. Each day after that, it gets ${r === 2 ? 'twice' : 'three times'} as many views as on the day before. How many views does it get altogether in its first ${n} days?`,
      correct: total,
      unit: 'views',
      wrong: [
        { value: a * r ** (n - 1), why: `That is the number of views on day ${n} alone. Add the views from all ${n} days.` },
        { value: (a * (r ** (n - 1) - 1)) / (r - 1), why: R`There are ${n} days, so the exponent in the sum formula is \(${n}\), not \(${n - 1}\).` },
        a * r ** n, whole((n * (a + a * r ** (n - 1))) / 2),
      ],
      solution: [
        R`The daily views form a geometric sequence, \(${listTex([a, a * r, a * r * r])}\), with \(a_1 = ${a}\) and \(r = ${r}\).`,
        R`"Altogether" asks for the sum of ${n} terms: \(S_{${n}} = \dfrac{a_1(1 - r^{n})}{1 - r} = \dfrac{${a}(1 - ${r}^{${n}})}{1 - ${r}}\).`,
        R`\(${r}^{${n}} = ${num(r ** n)}\), so \(S_{${n}} = \dfrac{${a}(${num(1 - r ** n)})}{${1 - r}} = ${num(total)}\) views.`,
      ],
      rule: 4, skill: 'series in context',
      check: () => (sum(range(0, n - 1).map((k) => a * r ** k)) === total ? true : 'adding day by day gives a different total'),
    });
  }
  const a = rng.int(5, 30);
  const d = rng.int(2, 6);
  const n = rng.int(10, 30);
  const last = a + (n - 1) * d;
  const total = (n * (a + last)) / 2;
  const story = rng.pick([
    { text: `A theater has ${n} rows of seats. The first row has ${a} seats, and each row after it has ${d} more seats than the row in front. How many seats does the theater have in all?`, unit: 'seats', part: 'row' },
    { text: `${name} saves ${money(a)} in the first week of a savings plan. Each week after that, ${name} saves ${money(d)} more than the week before. How much does ${name} save altogether in ${n} weeks?`, fmt: money, part: 'week' },
    { text: `Cans are stacked in ${n} rows for a store display. The top row has ${a} cans, and each row below it has ${d} more cans than the row above. How many cans are in the display?`, unit: 'cans', part: 'row' },
  ]);
  return q({
    prompt: story.text,
    correct: total,
    unit: story.unit,
    fmt: story.fmt,
    wrong: [
      { value: last, why: `That is the amount for ${story.part} ${n} alone. Add the amounts for all ${n} ${story.part}s.` },
      { value: n * (a + last), why: R`The sum is the number of terms times the **average** of the first and last terms, so divide by 2.` },
      { value: whole((n * (2 * a + n * d)) / 2), why: R`The last term is \(${a} + ${n - 1}(${d}) = ${last}\). It is \(${n - 1}\) steps from the first term, not \(${n}\).` },
      n * a,
    ],
    solution: [
      R`The same amount is added each ${story.part}, so the amounts form an arithmetic sequence with \(a_1 = ${a}\) and \(d = ${d}\).`,
      R`Last term: \(a_{${n}} = ${a} + ${n - 1}(${d}) = ${last}\).`,
      R`The total is the sum of ${n} terms: \(S_{${n}} = \dfrac{${n}(${a} + ${last})}{2} = ${num(total)}\).`,
    ],
    rule: 3, skill: 'series in context',
    check: () => (sum(range(0, n - 1).map((k) => a + k * d)) === total ? true : 'adding the amounts one by one gives a different total'),
  });
}

// ───────────── Challenge ─────────────

const CONVERGING = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [-1, 2], [-1, 3], [-2, 3], [-1, 4], [-3, 4]];
const DIVERGING = [[3, 2], [2, 1], [-2, 1], [4, 3], [-3, 2], [3, 1], [5, 4]];
const NO_SUM = 'No sum (the series diverges)';

function challengeInfinite(rng) {
  const diverges = rng.bool(0.25);
  const r = frac(...rng.pick(diverges ? DIVERGING : CONVERGING));
  const a1 = r.d ** 2 * rng.int(1, 6);
  const t = range(1, 4).map((k) => geo(a1, r, k));
  const show = (f) => M(num(f));
  const formula = frac(a1).div(one.sub(r)); // a₁/(1 − r), which is the sum only when |r| < 1
  const flipped = frac(a1).div(one.add(r));
  const ratioStep = R`Common ratio: \(r = ${num(t[1])} \div ${num(t[0])} = ${num(r)}\).`;
  return q({
    prompt: R`Find the sum of the infinite geometric series, if it has one: \(\;${seriesTex(t.slice(0, 3), t[3])}\)`,
    correct: diverges ? NO_SUM : show(formula),
    wrong: diverges
      ? [
        { value: show(formula), why: R`\(\dfrac{a_1}{1 - r}\) only works when \(|r| < 1\). Here \(r = ${num(r)}\), so the terms do not shrink towards 0.` },
        show(flipped), show(formula.neg()), show(r.mul(a1)),
      ]
      : [
        { value: show(flipped), why: R`The denominator is \(1 - r\). With \(r = ${num(r)}\), that is \(${num(one.sub(r))}\).` },
        { value: NO_SUM, why: R`\(|r| = ${num(r.abs())}\) is less than 1, so the terms shrink towards 0 and the series does have a sum.` },
        { value: show(formula.mul(r)), why: R`That leaves out the first term. The numerator is \(a_1 = ${a1}\).` },
        show(frac(a1).div(r)),
      ],
    solution: diverges
      ? [ratioStep, R`\(|r| = ${num(r.abs())}\) is not less than 1, so the terms do not shrink towards 0 and the partial sums never settle on one value.`, 'The series diverges: it has no sum.']
      : [ratioStep, R`\(|r| = ${num(r.abs())} < 1\), so the series has a sum: \(S = \dfrac{a_1}{1 - r}\).`, R`\(S = \dfrac{${a1}}{1 - ${paren(r)}} = \dfrac{${a1}}{${num(one.sub(r))}} = ${num(formula)}\).`],
    rule: 6, skill: 'infinite geometric series',
    check: () => {
      if (diverges) return Math.abs(t[1].value) >= Math.abs(t[0].value) ? true : 'the terms shrink, so this series has a sum';
      let s = 0;
      for (let k = 0, v = a1; k < 400; k++, v *= r.value) s += v;
      return checkEqual(s, formula.value, 1e-9, 'sum of 400 terms');
    },
  });
}

function challengeBouncingBall(rng) {
  const [p, den] = rng.pick([[1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [2, 5], [4, 5], [1, 4]]);
  const k = rng.int(Math.ceil(4 / (den - p)), Math.min(12, Math.floor(40 / (den - p))));
  const H = (den - p) * k; // chosen so that every distance below is a whole number
  const r = frac(p, den);
  const [falls, rises] = [den * k, p * k];
  const total = falls + rises;
  return q({
    prompt: R`A ball is dropped from a height of ${H} m. Each time it hits the ground, it bounces back up to \(${num(r)}\) of the height it just fell from. Treating the bounces as going on forever, find the total vertical distance the ball travels.`,
    correct: total,
    unit: 'm',
    wrong: [
      { value: falls, why: 'That adds up only the falls. After every bounce the ball also travels upward.' },
      { value: 2 * falls, why: `Doubling counts the first drop of ${H} m twice. The ball falls that far once and never rises that far.` },
      rises, total + H,
    ],
    solution: [
      R`Falls: \(${seriesTex([H, r.mul(H), r.pow(2).mul(H)], 1)}\) is an infinite geometric series with \(a_1 = ${H}\) and \(r = ${num(r)}\). Its sum is \(\dfrac{${H}}{1 - ${num(r)}} = ${falls}\) m.`,
      R`Rises: \(${seriesTex([r.mul(H), r.pow(2).mul(H)], 1)}\) is the same series without its first term: \(${falls} - ${H} = ${rises}\) m.`,
      R`Total distance: \(${falls} + ${rises} = ${total}\) m.`,
    ],
    rule: 6, skill: 'infinite series in context',
    check: () => {
      let dist = H;
      for (let i = 0, h = H * r.value; i < 3000; i++, h *= r.value) dist += 2 * h;
      return checkEqual(dist, total, 1e-9, 'distance after 3000 bounces');
    },
  });
}

function challengeTwoTerms(rng) {
  if (rng.bool(0.55)) {
    const i = rng.int(3, 7);
    const gap = rng.int(3, 9);
    const j = i + gap;
    const d = rng.sign() * rng.int(2, 8);
    const a1 = rng.int(-20, 30);
    const at = (k) => a1 + (k - 1) * d;
    const t = rng.bool(0.5) ? 1 : j + rng.int(4, 15);
    const value = at(t);
    const change = at(j) - at(i);
    const notDivided = { why: R`\(${at(j)} - ${paren(at(i))} = ${change}\) is the change over \(${gap}\) steps. Divide it by \(${gap}\) to get \(d = ${d}\).` };
    return q({
      prompt: R`In an arithmetic sequence, \(a_{${i}} = ${at(i)}\) and \(a_{${j}} = ${at(j)}\). Find \(a_{${t}}\).`,
      correct: value,
      wrong: t === 1
        ? [
          { value: at(i) - i * d, why: R`From \(a_1\) to \(a_{${i}}\) is \(${i - 1}\) steps, so go back \(${i - 1}\) steps of \(${d}\), not \(${i}\).` },
          { value: at(i) - (i - 1) * change, ...notDivided },
          { value: d, why: R`\(${d}\) is the common difference. Use it to step back from \(a_{${i}}\) to \(a_1\).` },
          at(2),
        ]
        : [
          { value: value + d, why: R`Count the steps carefully: from \(a_{${j}}\) to \(a_{${t}}\) is \(${t} - ${j} = ${t - j}\) steps.` },
          { value: at(j) + (t - j) * change, ...notDivided },
          { value: at(i) + (t - j) * d, why: R`\(${t - j}\) steps is the distance from \(a_{${j}}\), so start from \(a_{${j}} = ${at(j)}\), not from \(a_{${i}}\).` },
          value - d,
        ],
      solution: [
        R`From \(a_{${i}}\) to \(a_{${j}}\) is \(${j} - ${i} = ${gap}\) steps, so \(${gap}d = ${at(j)} - ${paren(at(i))} = ${change}\) and \(d = ${d}\).`,
        t === 1
          ? R`Go back \(${i - 1}\) steps from \(a_{${i}}\): \(a_1 = ${at(i)} - ${i - 1}(${d}) = ${value}\).`
          : R`Go forward \(${t} - ${j} = ${t - j}\) steps from \(a_{${j}}\): \(a_{${t}} = ${at(j)} + ${t - j}(${d}) = ${value}\).`,
      ],
      rule: 0, skill: 'finding terms from two terms',
      check: () => (change * (t - j) === (value - at(j)) * gap ? true : 'the three terms do not lie on one arithmetic sequence'),
    });
  }
  const i = rng.int(3, 4);
  const gap = rng.pick([2, 3]);
  const j = i + gap;
  const r = frac(...rng.pick([[2, 1], [3, 1], [1, 2]]));
  const a1 = r.isInt() ? rng.int(1, r.n === 2 ? 6 : 3) : 2 ** 8 * rng.pick([1, 3, 5]);
  const at = (k) => geo(a1, r, k);
  const t = rng.bool(0.5) ? 1 : j + 2;
  const value = at(t);
  const jump = at(j).div(at(i)); // r^gap
  const notRooted = { why: R`\(${num(at(j))} \div ${num(at(i))} = ${num(jump)}\) is \(r^{${gap}}\), because the ratio is applied \(${gap}\) times. So \(r = ${num(r)}\).` };
  return q({
    prompt: R`In a geometric sequence with positive terms, \(a_{${i}} = ${num(at(i))}\) and \(a_{${j}} = ${num(at(j))}\). Find \(a_{${t}}\).`,
    correct: value,
    wrong: t === 1
      ? [
        { value: at(0), why: R`From \(a_1\) to \(a_{${i}}\) the ratio is applied \(${i - 1}\) times, so divide by \(r^{${i - 1}}\), not \(r^{${i}}\).` },
        { value: at(i).div(jump.pow(i - 1)), ...notRooted },
        at(2), r,
      ]
      : [
        { value: at(j).mul(jump.pow(2)), ...notRooted },
        { value: at(t + 1), why: R`From \(a_{${j}}\) to \(a_{${t}}\) is \(2\) steps, so multiply by \(r^{2}\), not \(r^{3}\).` },
        { value: at(j).add(at(j).sub(at(i)).div(gap).mul(2)), why: 'That treats the sequence as arithmetic. In a geometric sequence the terms are multiplied by the same ratio each time.' },
        at(t - 1),
      ],
    solution: [
      R`From \(a_{${i}}\) to \(a_{${j}}\) the ratio is applied \(${gap}\) times: \(r^{${gap}} = ${num(at(j))} \div ${num(at(i))} = ${num(jump)}\).`,
      R`The terms are positive, so \(r\) is positive: \(r = ${num(r)}\).`,
      t === 1
        ? R`Go back \(${i - 1}\) steps from \(a_{${i}}\): \(a_1 = ${num(at(i))} \div ${base(r)}^{${i - 1}} = ${num(value)}\).`
        : R`Go forward \(2\) steps from \(a_{${j}}\): \(a_{${t}} = ${num(at(j))} \cdot ${base(r)}^{2} = ${num(value)}\).`,
    ],
    rule: 1, skill: 'finding terms from two terms',
    check: () => (jump.pow(t - j).eq(value.div(at(j)).pow(gap)) ? true : 'the three terms do not lie on one geometric sequence'),
  });
}

// ───────────── Models ─────────────

function seatsModel({ a, d, n }) {
  const last = a + (n - 1) * d;
  const total = (n * (a + last)) / 2;
  const rows = range(1, n).map((k) => a + (k - 1) * d);
  return {
    problem: `A theater has ${n} rows of seats. The first row has ${a} seats, and each row after it has ${d} more ${d === 1 ? 'seat' : 'seats'} than the row in front. How many seats are in the last row, and how many seats are there in all?`,
    steps: [
      R`The row sizes form an arithmetic sequence with \(a_1 = ${a}\) and \(d = ${d}\): \(${listTex(rows.slice(0, 4), n > 4 ? R`, \ldots` : '')}\).`,
      R`Rule for row \(n\): \(a_n = a_1 + (n - 1)d = ${a} + (n - 1)(${d}) = ${linear(d, a - d, 'n')}\).`,
      R`Last row: \(a_{${n}} = ${a} + ${n - 1}(${d}) = ${last}\) seats.`,
      R`All rows: \(S_{${n}} = \dfrac{n(a_1 + a_n)}{2} = \dfrac{${n}(${a} + ${last})}{2} = ${num(total)}\) seats.`,
    ],
    answer: `${last} seats in the last row and ${txt(total)} seats in all`,
    visual: {
      type: 'plot',
      x: [0, n + 1 + Math.max(1.5, n * 0.12)], // room for the axis label to the right of the last bar
      y: [0, last * 1.15],
      rects: rows.map((seats, k) => ({ x: k + 0.65, w: 0.7, h: seats })),
      axisLabels: ['row', 'seats'],
      alt: `Bar graph of the number of seats in each of the ${n} rows. The bars rise in equal steps from ${a} seats in row 1 to ${last} seats in row ${n}. Adding all the bars gives ${txt(total)} seats.`,
    },
  };
}

function geometricModel({ a1, r, n }) {
  if (a1 === 0) return { error: 'Choose a first term other than 0. With a first term of 0, every term is 0.' };
  const [p, den = 1] = String(r).split('/').map(Number);
  const ratio = frac(p, den);
  const t = range(1, n).map((k) => geo(a1, ratio, k));
  const partial = [];
  t.reduce((s, v) => partial[partial.push(s.add(v)) - 1], frac(0));
  const Sn = partial[n - 1];
  const converges = Math.abs(ratio.value) < 1;
  const limit = converges ? frac(a1).div(one.sub(ratio)) : null;
  // Exact when the fraction is short enough to read, a decimal otherwise.
  const eq = (f) => (f.isInt() ? `= ${num(f.n)}` : f.d <= 1000 ? `= ${num(f)}` : `\\approx ${num(f.value, { places: 4 })}`);
  const ys = [0, ...partial.map((s) => s.value), ...(converges ? [limit.value] : [])];
  const pad = (Math.max(...ys) - Math.min(...ys)) * 0.12;
  return {
    problem: R`First term \(a_1 = ${a1}\), common ratio \(r = ${num(ratio)}\), \(n = ${n}\)`,
    steps: [
      R`Each term is the one before it times \(${num(ratio)}\): \(${listTex(t.slice(0, 5), n > 5 ? R`, \ldots` : '')}\).`,
      R`Explicit rule: \(a_n = ${a1} \cdot ${base(ratio)}^{n-1}\), so \(a_{${n}} = ${a1} \cdot ${base(ratio)}^{${n - 1}} ${eq(t[n - 1])}\).`,
      R`Sum of the first ${n} terms: \(S_{${n}} = \dfrac{a_1(1 - r^{n})}{1 - r} = \dfrac{${a1}\left(1 - ${base(ratio)}^{${n}}\right)}{1 - ${paren(ratio)}} ${eq(Sn)}\).`,
      converges
        ? R`\(|r| < 1\), so the terms shrink towards 0 and the partial sums close in on \(S = \dfrac{a_1}{1 - r} = \dfrac{${a1}}{${num(one.sub(ratio))}} ${eq(limit)}\).`
        : R`\(|r| \ge 1\), so the terms do not shrink towards 0. The infinite series has no sum.`,
    ],
    answer: R`\(a_{${n}} ${eq(t[n - 1])}\) and \(S_{${n}} ${eq(Sn)}\). ${converges ? R`Infinite sum: \(S ${eq(limit)}\).` : 'There is no infinite sum.'}`,
    visual: {
      type: 'plot',
      x: [0, n + 1],
      y: [Math.min(...ys) - pad, Math.max(...ys) + pad],
      points: partial.map((s, k) => ({ x: k + 1, y: s.value })),
      hlines: converges ? [{ y: limit.value }] : [],
      axisLabels: ['n', 'Sₙ'],
      alt: `Graph of the first ${n} partial sums, one point for each. ${converges ? `The points close in on the dashed line at ${txt(limit.value, { places: 3 })}, the sum of the infinite series.` : 'The points do not settle near any one value, so the infinite series has no sum.'}`,
    },
  };
}

export default {
  id: 'sequences-series',
  title: 'Sequences & Series',
  summary: 'Write rules for arithmetic and geometric sequences, find terms, and add up finite and infinite series.',
  standards: ['CCSS F-BF.A.2', 'CCSS F-IF.A.3', 'CCSS A-SSE.B.4'],

  explain: {
    intro: R`A sequence is an ordered list of numbers, and each number is a term. Two patterns matter most. An arithmetic sequence adds the same number at every step, so its graph is a line of points. A geometric sequence multiplies by the same number at every step, so its points follow an exponential curve. Adding the terms of a sequence gives a series, and both patterns have a short formula for the sum.`,
    rules: [
      {
        title: 'Arithmetic sequences',
        text: R`Each term is the one before plus a fixed number \(d\), the common difference. Reaching \(a_n\) from \(a_1\) takes \(n - 1\) steps, so \(a_n = a_1 + (n - 1)d\).`,
        example: R`\(5, 8, 11, \ldots\) has \(d = 3\), so \(a_n = 5 + (n - 1)(3) = 3n + 2\) and \(a_{10} = 32\).`,
      },
      {
        title: 'Geometric sequences',
        text: R`Each term is the one before times a fixed number \(r\), the common ratio. Find \(r\) by dividing any term by the term before it. Then \(a_n = a_1 \cdot r^{n-1}\).`,
        example: R`\(48, 24, 12, \ldots\) has \(r = \frac{1}{2}\), so \(a_8 = 48 \cdot \left(\frac{1}{2}\right)^{7} = \frac{48}{128} = \frac{3}{8}\).`,
      },
      {
        title: 'Recursive rules',
        text: R`A recursive rule states the first term and how to get each term from the one before it. Arithmetic: \(a_n = a_{n-1} + d\). Geometric: \(a_n = r \cdot a_{n-1}\). An explicit rule gives \(a_n\) directly from \(n\).`,
        example: R`\(a_1 = 5,\; a_n = a_{n-1} + 3\) gives \(5, 8, 11, 14, \ldots\) The explicit rule for the same sequence is \(a_n = 3n + 2\).`,
      },
      {
        title: 'Arithmetic series',
        text: R`The sum of the first \(n\) terms of an arithmetic sequence is the number of terms times the average of the first and last terms: \(S_n = \dfrac{n(a_1 + a_n)}{2}\).`,
        example: R`\(1 + 2 + 3 + \cdots + 100 = \dfrac{100(1 + 100)}{2} = 5050\).`,
      },
      {
        title: 'Finite geometric series',
        text: R`The sum of the first \(n\) terms of a geometric sequence is \(S_n = \dfrac{a_1(1 - r^{n})}{1 - r}\) for \(r \ne 1\). Here \(n\) is the number of terms being added.`,
        example: R`\(3 + 6 + 12 + 24 + 48 = \dfrac{3(1 - 2^{5})}{1 - 2} = \dfrac{3(-31)}{-1} = 93\).`,
      },
      {
        title: 'Sigma notation',
        text: R`\(\displaystyle\sum_{k=1}^{n} a_k\) means: substitute \(k = 1, 2, \ldots, n\) into the rule and add the results. A sum from \(k = m\) to \(k = n\) has \(n - m + 1\) terms.`,
        example: R`\(\displaystyle\sum_{k=1}^{4} (2k + 1) = 3 + 5 + 7 + 9 = 24\).`,
      },
      {
        title: 'Infinite geometric series',
        text: R`If \(|r| < 1\), the terms shrink towards 0 and the partial sums close in on \(S = \dfrac{a_1}{1 - r}\). If \(|r| \ge 1\), the series diverges: it has no sum.`,
        example: R`\(8 + 4 + 2 + 1 + \cdots = \dfrac{8}{1 - \frac{1}{2}} = 16\). But \(1 + 2 + 4 + 8 + \cdots\) has no sum.`,
      },
    ],
    vocab: [
      { term: 'common difference', def: R`The fixed amount \(d\) added to get from each term of an arithmetic sequence to the next. It can be negative.` },
      { term: 'common ratio', def: R`The fixed number \(r\) that each term of a geometric sequence is multiplied by to get the next.` },
      { term: 'explicit rule', def: R`A formula that gives the \(n\)th term \(a_n\) directly from \(n\), such as \(a_n = 4n + 3\).` },
      { term: 'recursive rule', def: R`A first term together with a rule that builds each term from the one before, such as \(a_1 = 7,\; a_n = a_{n-1} + 4\).` },
      { term: 'series, partial sum', def: R`A series is the sum of the terms of a sequence. The partial sum \(S_n\) is the sum of the first \(n\) terms.` },
      { term: 'converge, diverge', def: 'An infinite series converges if its partial sums close in on one number, which is called its sum. Otherwise it diverges.' },
    ],
    mistakes: [
      R`Using \(n\) where the formula needs \(n - 1\). The first term has had nothing added or multiplied yet, so \(a_n\) is \(n - 1\) steps from \(a_1\).`,
      'Mixing up the two patterns. Test a few terms: equal differences mean arithmetic, equal ratios mean geometric.',
      R`Miscounting terms. From \(k = 3\) to \(k = 10\) there are \(10 - 3 + 1 = 8\) terms, not 7.`,
      'Giving the last term when the question asks for a sum, or a sum when it asks for one term.',
      R`Using \(\dfrac{a_1}{1 - r}\) when \(|r| \ge 1\). The series \(1 + 2 + 4 + \cdots\) has no sum, even though the formula gives \(-1\).`,
    ],
    visual: {
      type: 'plot',
      x: [0, 7],
      y: [0, 36],
      step: [1, 4],
      fns: [{ f: (x) => 3 * x + 2, dashed: true, domain: [1, 6] }, { f: (x) => 2 ** (x - 1), color: 'b', dashed: true, domain: [1, 6] }],
      points: [
        ...range(1, 6).map((k) => ({ x: k, y: 3 * k + 2, label: k === 3 ? 'arithmetic: add 3' : undefined })),
        ...range(1, 6).map((k) => ({ x: k, y: 2 ** (k - 1), color: 'b', label: k === 6 ? 'geometric: times 2' : undefined })),
      ],
      axisLabels: ['n', 'aₙ'],
      alt: 'Graph of two sequences as separate points. The arithmetic sequence 5, 8, 11, 14, 17, 20 lies on a straight line. The geometric sequence 1, 2, 4, 8, 16, 32 lies on a curve that gets steeper and passes the line at the sixth term.',
    },
  },

  examples: [
    {
      title: 'An explicit rule and a far-off term',
      problem: R`Write an explicit rule for the arithmetic sequence \(7, 11, 15, 19, \ldots\) and find the 25th term.`,
      steps: [
        R`The common difference is \(d = 11 - 7 = 4\), and \(a_1 = 7\).`,
        R`\(a_n = a_1 + (n - 1)d = 7 + (n - 1)(4)\).`,
        R`Distribute and combine: \(a_n = 4n + 3\). Check: \(n = 1\) gives \(7\). ✓`,
        R`Substitute \(n = 25\): \(a_{25} = 4(25) + 3 = 103\).`,
      ],
      answer: R`\(a_n = 4n + 3\) and \(a_{25} = 103\)`,
    },
    {
      title: 'A geometric series: count the terms, then add',
      problem: R`Find the sum \(3 + 6 + 12 + \cdots + 768\).`,
      steps: [
        R`The common ratio is \(r = 6 \div 3 = 2\), and \(a_1 = 3\).`,
        R`Count the terms: \(3 \cdot 2^{n-1} = 768\) gives \(2^{n-1} = 256 = 2^{8}\), so \(n - 1 = 8\) and \(n = 9\).`,
        R`\(S_9 = \dfrac{a_1(1 - r^{n})}{1 - r} = \dfrac{3(1 - 2^{9})}{1 - 2} = \dfrac{3(-511)}{-1} = 1533\).`,
      ],
      answer: R`\(1533\)`,
    },
    {
      title: 'Sigma notation',
      problem: R`Evaluate \(\displaystyle\sum_{k=3}^{20} (4k - 1)\).`,
      steps: [
        R`Each term is 4 more than the one before, so this is an arithmetic series.`,
        R`First term (\(k = 3\)): \(4(3) - 1 = 11\). Last term (\(k = 20\)): \(4(20) - 1 = 79\).`,
        R`Number of terms: \(20 - 3 + 1 = 18\).`,
        R`Sum: \(\dfrac{18(11 + 79)}{2} = 810\).`,
      ],
      answer: R`\(810\)`,
    },
    {
      title: 'Word problem: a savings plan',
      word: true,
      problem: 'Maya saves $20 in the first week of a savings plan. Each week after that, Maya saves $5 more than the week before. How much does Maya save in week 12, and how much altogether in the 12 weeks?',
      steps: [
        R`The same amount is added each week, so the weekly amounts form an arithmetic sequence with \(a_1 = 20\) and \(d = 5\).`,
        R`Week 12 is 11 steps after week 1: \(a_{12} = 20 + 11(5) = 75\).`,
        R`"Altogether" asks for a sum of 12 terms: \(S_{12} = \dfrac{12(20 + 75)}{2} = 570\).`,
      ],
      answer: '$75 in week 12 and $570 altogether',
    },
    {
      title: 'Word problem: a bouncing ball',
      word: true,
      problem: R`A ball is dropped from a height of 10 m. Each time it hits the ground, it bounces back up to \(\frac{3}{5}\) of the height it just fell from. Treating the bounces as going on forever, find the total vertical distance the ball travels.`,
      steps: [
        R`Falls: \(10 + 6 + 3.6 + \cdots\) is an infinite geometric series with \(a_1 = 10\) and \(r = \frac{3}{5}\). Since \(|r| < 1\), its sum is \(\dfrac{10}{1 - \frac{3}{5}} = \dfrac{10}{\frac{2}{5}} = 25\) m.`,
        R`Rises: \(6 + 3.6 + \cdots\) is the same series without its first term: \(25 - 10 = 15\) m.`,
        R`Total distance: \(25 + 15 = 40\) m.`,
      ],
      answer: '40 m',
      visual: {
        type: 'barChart',
        bars: [{ label: 'start', value: 10 }, { label: '1', value: 6 }, { label: '2', value: 3.6 }, { label: '3', value: 2.16 }, { label: '4', value: 1.3 }, { label: '5', value: 0.78 }],
        xLabel: 'bounces so far',
        yLabel: 'height (m)',
        alt: 'Bar chart of the height the ball reaches: 10 m at the start, then 6 m, 3.6 m, 2.16 m, about 1.3 m and about 0.78 m. Each bar is three fifths as tall as the one before, so the heights shrink towards 0.',
      },
    },
  ],

  models: [
    {
      id: 'theater-seats',
      title: 'Word problem: seats in a theater',
      word: true,
      intro: 'Change the numbers in the story. The steps use the rule for the last row and the sum for all the rows.',
      inputs: [
        { name: 'a', label: 'Seats in the first row', type: 'int', min: 5, max: 60, value: 18 },
        { name: 'd', label: 'Extra seats in each new row', type: 'int', min: 1, max: 10, value: 2 },
        { name: 'n', label: 'Number of rows', type: 'int', min: 2, max: 60, value: 25 },
      ],
      compute: seatsModel,
    },
    {
      id: 'geometric-series',
      title: 'Geometric sequence: terms, sums and the infinite sum',
      intro: 'Choose a first term and a ratio. The graph shows the partial sums, and whether they close in on one value.',
      inputs: [
        { name: 'a1', label: 'First term', type: 'int', min: -20, max: 20, value: 8 },
        { name: 'r', label: 'Common ratio', type: 'select', value: '1/2', options: ['1/2', '-1/2', '1/3', '2/3', '3/4', '-3/4', '2', '-2', '3', '3/2'].map((v) => ({ value: v, label: v.replace('-', '−') })) },
        { name: 'n', label: 'Number of terms n', type: 'int', min: 2, max: 12, value: 6 },
      ],
      compute: geometricModel,
    },
  ],

  quiz: {
    easy: [easyNextTerm, easyExplicitTerm, easyRecursive],
    medium: [mediumGeometricTerm, mediumArithmeticSeries, mediumWriteRule],
    hard: [hardNumberOfTerms, hardGeometricSeries, hardSigma, hardWordSeries],
    challenge: [challengeInfinite, challengeBouncingBall, challengeTwoTerms],
  },
};
