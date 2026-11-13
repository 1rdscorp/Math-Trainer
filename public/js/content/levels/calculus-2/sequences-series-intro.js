import { R, q, frac, fracTex, num, paren, terms, linear, poly, polyEval, power, person, plural, ordinal, range, checkEqual } from '../../lib/index.js';
import { N, K, exactChoices, partialSum, quad } from './_shared.js';

const DIV = 'Diverges';
const sigma = (from, tex) => R`\displaystyle\sum_{n=${from}}^{\infty} ${tex}`;
// rⁿ with brackets where they are needed: 2^{n}, \left(\frac{2}{3}\right)^{n}, \left(-\frac{1}{2}\right)^{n}.
const rPow = (r, e = 'n') => (r.isInt() && r.n > 0 ? `${r.n}^{${e}}` : R`\left(${r.tex()}\right)^{${e}}`);
// a·rⁿ: a coefficient of 1 is hidden, and a number never sits directly in front of a whole-number base.
const geoTex = (a, r, e = 'n') => (a === 1 ? rPow(r, e) : r.isInt() && r.n > 0 ? R`${a} \cdot ${rPow(r, e)}` : `${a}${rPow(r, e)}`);
// a/c as it is first written, followed by its reduced form when that is different.
const ratioTex = (a, c) => (c === 1 ? `${a}` : frac(a, c).tex() === fracTex(a, c) ? fracTex(a, c) : `${fracTex(a, c)} = ${frac(a, c).tex()}`);
// Σ term(n) for n ≥ from, for a positive term that decays like a power: add 3000 terms, then the tail by the midpoint rule.
const seriesValue = (term, from = 1, count = 3000) => partialSum(term, from, from + count - 1) + quad(term, from + count - 0.5, Infinity);
// f(n) → L as n → ∞: probed far out, where even 1/√n is small.
const tendsTo = (f, L) => (Math.abs(f(1e12) - L) < 1e-4 && Math.abs(f(1e14) - L) < 1e-5 ? true : `the values do not approach ${L}`);
const growsTo = (f) => (Math.abs(f(1e6)) > 1e4 && Math.abs(f(1e7)) > 5 * Math.abs(f(1e6)) ? true : 'the values do not grow without bound');
const SMALL = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5]]; // ratios with |r| < 1
const BIG = [[3, 2], [4, 3], [5, 4], [2, 1], [5, 3], [5, 2], [3, 1]]; // ratios with |r| > 1

// ───────────── Easy ─────────────

function easySequenceLimit(rng) {
  const NONE = 'The sequence diverges';
  const a = rng.nonzero(-9, 9);
  const b = rng.nonzero(-9, 9);
  const c = rng.int(1, 9);
  const d = rng.int(1, 9);
  const kind = rng.pick(['equal', 'equal', 'lower', 'higher', 'power']);
  const ask = (tex) => R`Find \(\displaystyle\lim_{n\to\infty} a_n\) for the sequence \(a_n = ${tex}\), or state that the sequence diverges.`;
  if (kind === 'power') {
    const [p, s] = rng.pick(SMALL);
    const r = frac(rng.bool(0.3) ? -p : p, s);
    return q({
      prompt: ask(terms([[a, ''], [b, rPow(r)]])),
      ...exactChoices(N(a), [{ k: N(a + b), why: R`\(${rPow(r)}\) equals 1 only at \(n = 0\). As \(n\) grows it approaches 0.` }, { k: NONE, why: R`\(${rPow(r)} \to 0\) because \(\left|${r.tex()}\right| < 1\), so the terms settle down.` }, N(frac(b).mul(r).add(a)), N(b), N(0)]),
      solution: [R`\(\left|${r.tex()}\right| < 1\), so \(${rPow(r)} \to 0\) as \(n \to \infty\).`, R`The second term approaches 0, which leaves \(a_n \to ${a}\).`],
      rule: 0,
      skill: 'limit of a sequence',
      check: () => tendsTo((n) => a + b * r.value ** n, a),
    });
  }
  const k = kind === 'equal' ? rng.int(1, 2) : 2;
  const numC = kind === 'lower' ? [a, b] : k === 1 ? [a, b] : kind === 'higher' || rng.bool() ? [a, 0, b] : [a, b, 0];
  const denC = kind === 'higher' || k === 1 ? [c, d] : [c, 0, d];
  const f = (n) => polyEval(numC, n) / polyEval(denC, n);
  const prompt = ask(R`\dfrac{${poly(numC, 'n')}}{${poly(denC, 'n')}}`);
  const last = numC[numC.length - 1];
  if (kind === 'equal') {
    return q({
      prompt,
      ...exactChoices(N(frac(a, c)), [
        last === 0 ? null : { k: N(frac(last, d)), why: R`That compares the constant terms. For large \(n\) the highest powers decide the limit.` },
        { k: NONE, why: R`The numerator and the denominator both grow, but their ratio settles down. Divide both by \(${power('n', k)}\).` },
        { k: N(0), why: 'The limit is 0 only when the denominator has the higher degree. Here the degrees are equal.' },
        N(frac(c, a)),
        N(frac(a, d)),
        N(frac(-a, c)),
      ]),
      solution: [
        R`The numerator and the denominator have the same degree. Divide both by \(${power('n', k)}\), the highest power.`,
        R`Every term that still has \(n\) in its denominator approaches 0. That leaves the leading coefficients.`,
        R`\(\displaystyle\lim_{n\to\infty} a_n = ${ratioTex(a, c)}\).`,
      ],
      rule: 0,
      skill: 'limit of a sequence',
      check: () => tendsTo(f, a / c),
    });
  }
  if (kind === 'lower') {
    return q({
      prompt,
      ...exactChoices(N(0), [
        { k: N(frac(a, c)), why: 'The ratio of the leading coefficients is the limit only when the degrees are equal. Here the denominator has the higher degree.' },
        { k: NONE, why: 'The denominator grows faster than the numerator, so the terms shrink toward 0.' },
        N(frac(b, d)),
        N(frac(a, d)),
        N(1),
      ]),
      solution: [R`The denominator has the higher degree (2 against 1). Divide the numerator and the denominator by \(n^{2}\).`, R`The numerator then approaches 0, and the denominator approaches \(${c}\).`, R`\(\displaystyle\lim_{n\to\infty} a_n = 0\).`],
      rule: 0,
      skill: 'limit of a sequence',
      check: () => tendsTo(f, 0),
    });
  }
  return q({
    prompt,
    ...exactChoices(NONE, [
      { k: N(frac(a, c)), why: 'The ratio of the leading coefficients is the limit only when the degrees are equal. Here the numerator has the higher degree.' },
      { k: N(0), why: 'The terms approach 0 only when the denominator has the higher degree.' },
      N(frac(b, d)),
      N(frac(a, d)),
      N(a),
    ]),
    solution: [
      R`The numerator has the higher degree (2 against 1). Divide the numerator and the denominator by \(n\).`,
      R`The numerator then behaves like \(${terms([[a, 'n']])}\), which is unbounded, while the denominator approaches \(${c}\).`,
      R`The terms go to \(${a > 0 ? '' : '-'}\infty\), so the sequence diverges.`,
    ],
    rule: 0,
    skill: 'limit of a sequence',
    check: () => growsTo(f),
  });
}

function easyPartialSum(rng) {
  if (rng.bool()) {
    const k = rng.int(3, 5);
    const c = rng.int(1, 6);
    const b = rng.int(-4, 9);
    const wrap = (tex) => (b === 0 ? tex : R`\left(${tex}\right)`);
    const it = rng.pick([
      { tex: wrap(linear(c, b, 'n')), f: (n) => frac(c * n + b), closed: (c * k * (k + 1)) / 2 + b * k },
      { tex: wrap(linear(c, b, 'n')), f: (n) => frac(c * n + b), closed: (c * k * (k + 1)) / 2 + b * k },
      { tex: wrap(terms([[1, 'n^{2}'], [b, '']])), f: (n) => frac(n * n + b), closed: (k * (k + 1) * (2 * k + 1)) / 6 + b * k },
      { tex: c === 1 ? '2^{n}' : R`${c} \cdot 2^{n}`, f: (n) => frac(c * 2 ** n), closed: c * (2 ** (k + 1) - 2) },
      { tex: R`\frac{${c}}{n}`, f: (n) => frac(c, n), closed: c * [0, 1, 3 / 2, 11 / 6, 25 / 12, 137 / 60][k] },
    ]);
    const list = range(1, k).map((n) => it.f(n));
    const S = list.reduce((s, t) => s.add(t), frac(0));
    return q({
      prompt: R`Find the partial sum \(S_{${k}}\) of the series \(${sigma(1, it.tex)}\).`,
      correct: S,
      wrong: [
        { value: it.f(k), why: R`That is the single term \(a_{${k}}\). The partial sum \(S_{${k}}\) adds the first ${k} terms.` },
        { value: S.sub(it.f(k)), why: R`That is \(S_{${k - 1}}\). The partial sum \(S_{${k}}\) also includes the term \(a_{${k}}\).` },
        S.add(it.f(k + 1)),
        S.sub(it.f(1)),
        S.add(1),
      ],
      solution: [R`\(S_{${k}}\) is the sum of the first ${k} terms, \(n = 1\) to \(n = ${k}\): \(${list.map((t) => paren(t)).join(' + ')}\).`, R`\(S_{${k}} = ${S.tex()}\).`],
      rule: 1,
      skill: 'partial sums',
      check: () => checkEqual(S.value, it.closed, 1e-9, 'partial sum'),
    });
  }
  const a = rng.int(1, 9);
  const c = rng.int(1, 5);
  const d = rng.int(1, 6);
  let b = rng.nonzero(-6, 6);
  while (b * c === a * d) b = rng.nonzero(-6, 6); // otherwise (aN + b)/(cN + d) would be constant
  const [p, s] = rng.pick(SMALL);
  const r = frac(p, s);
  const kind = rng.pick(['ratio', 'ratio', 'recip', 'geo', 'grow']);
  const it = {
    ratio: { tex: R`\dfrac{${linear(a, b, 'N')}}{${linear(c, d, 'N')}}`, S: (n) => (a * n + b) / (c * n + d), S1: frac(a + b, c + d), sum: frac(a, c), extra: [N(frac(b, d)), N(frac(a, d))], how: R`The degrees are equal, so \(S_N \to ${ratioTex(a, c)}\), the ratio of the leading coefficients.` },
    recip: { tex: R`${a} - \dfrac{${c}}{N + 1}`, S: (n) => a - c / (n + 1), S1: frac(2 * a - c, 2), sum: frac(a), extra: [N(a - c), N(a + c)], how: R`\(\dfrac{${c}}{N + 1} \to 0\), so \(S_N \to ${a}\).` },
    geo: { tex: terms([[a, ''], [-c, rPow(r, 'N')]]), S: (n) => a - c * r.value ** n, S1: frac(a).sub(r.mul(c)), sum: frac(a), extra: [N(a - c), N(a + c)], how: R`\(${rPow(r, 'N')} \to 0\) because \(|r| < 1\), so \(S_N \to ${a}\).` },
    grow: { tex: R`\dfrac{${poly([a, 0, b], 'N')}}{${linear(c, d, 'N')}}`, S: (n) => (a * n * n + b) / (c * n + d), S1: frac(a + b, c + d), sum: null, extra: [N(frac(b, d)), N(frac(a, d))], how: R`The numerator has the higher degree, so \(S_N \to \infty\).` },
  }[kind];
  const prompt = R`The \(N\)th partial sum of a series \(${sigma(1, 'a_n')}\) is \(S_N = ${it.tex}\). Find the sum of the series, or state that it diverges.`;
  const first = { k: N(it.S1), why: R`That is \(S_1\), which is only the first term. The sum is \(\displaystyle\lim_{N\to\infty} S_N\).` };
  const zero = { k: N(0), why: R`In a convergent series the terms \(a_n\) approach 0. The sum is the limit of the partial sums \(S_N\), which is a different limit.` };
  if (!it.sum) {
    return q({
      prompt,
      ...exactChoices(DIV, [{ k: N(frac(a, c)), why: R`The degrees are not equal: the numerator has degree 2, so \(S_N\) grows without bound.` }, zero, first, ...it.extra]),
      solution: [R`The sum of a series is the limit of its partial sums.`, it.how, R`The partial sums have no finite limit, so the series diverges.`],
      rule: 1,
      skill: 'sum as a limit of partial sums',
      check: () => growsTo(it.S),
    });
  }
  return q({
    prompt,
    ...exactChoices(N(it.sum), [first, zero, { k: DIV, why: R`\(S_N\) approaches a finite number, so the series converges.` }, ...it.extra]),
    solution: [R`The sum of a series is the limit of its partial sums.`, it.how, R`The series converges, and its sum is \(${it.sum.tex()}\).`],
    rule: 1,
    skill: 'sum as a limit of partial sums',
    check: () => tendsTo(it.S, it.sum.value),
  });
}

function easyGeometric(rng) {
  const conv = rng.bool(0.75);
  const [p, s] = rng.pick(conv ? SMALL : BIG);
  const r = frac(rng.bool(0.3) ? -p : p, s);
  const a = rng.int(1, 12);
  const listed = rng.bool();
  const series = listed ? R`${terms([0, 1, 2, 3].map((k) => [r.pow(k).mul(a), '']))} + \cdots` : sigma(0, geoTex(a, r));
  const gap = frac(1).sub(r);
  const sum = frac(a).div(gap);
  const prompt = R`Find the sum of the geometric series \(${series}\), or state that it diverges.`;
  const id = R`This is a geometric series with first term \(a = ${a}\) and common ratio \(r = ${r.tex()}\)${listed ? ' (divide any term by the term before it)' : ''}.`;
  if (!conv) {
    return q({
      prompt,
      ...exactChoices(DIV, [{ k: N(sum), why: R`\(\dfrac{a}{1 - r}\) is the sum only when \(|r| < 1\). Here \(|r| = ${r.abs().tex()}\), and the terms do not even approach 0.` }, N(sum.neg()), N(0), N(a), N(r.mul(a))]),
      solution: [id, R`\(|r| = ${r.abs().tex()} \ge 1\), so the terms do not approach 0 and the series diverges. The formula \(\dfrac{a}{1 - r}\) does not apply.`],
      rule: 2,
      skill: 'sum of a geometric series',
      check: () => (Math.abs(a * r.value ** 300) > 1 ? true : 'the terms approach 0'),
    });
  }
  return q({
    prompt,
    ...exactChoices(N(sum), [
      { k: N(frac(a).div(r.add(1))), why: R`The formula is \(\dfrac{a}{1 - r}\). With \(r = ${r.tex()}\), the denominator is \(1 - r = ${gap.tex()}\).` },
      { k: N(sum.mul(r)), why: R`That is \(\dfrac{ar}{1 - r}\), which leaves out the first term \(a = ${a}\).` },
      { k: DIV, why: R`A geometric series converges whenever \(|r| < 1\). Here \(|r| = ${r.abs().tex()}\).` },
      N(gap.mul(a)),
      N(sum.add(a)),
    ]),
    solution: [id, R`\(|r| = ${r.abs().tex()} < 1\), so the series converges to \(\dfrac{a}{1 - r} = ${a} \div ${gap.tex()} = ${sum.tex()}\).`],
    rule: 2,
    skill: 'sum of a geometric series',
    check: () => checkEqual(partialSum((n) => a * r.value ** n, 0, 400), sum.value, 1e-9, 'sum'),
  });
}

function easyPSeries(rng) {
  const c = rng.int(1, 9);
  const half = R`\frac{1}{2}`;
  const it = rng.pick([
    { den: 'n^{2}', p: 2, pT: '2', other: half },
    { den: 'n^{3}', p: 3, pT: '3', other: R`\frac{1}{3}` },
    { den: 'n^{4}', p: 4, pT: '4', other: R`\frac{1}{4}` },
    { den: 'n', p: 1, pT: '1', other: '1' },
    { den: R`\sqrt{n}`, p: 1 / 2, pT: half, other: '2', note: R`\(\sqrt{n} = n^{1/2}\)` },
    { den: R`\sqrt[3]{n}`, p: 1 / 3, pT: R`\frac{1}{3}`, other: '3', note: R`\(\sqrt[3]{n} = n^{1/3}\)` },
    { den: R`n\sqrt{n}`, p: 3 / 2, pT: R`\frac{3}{2}`, other: half, note: R`\(n\sqrt{n} = n^{3/2}\)` },
    { den: R`\sqrt[3]{n^{2}}`, p: 2 / 3, pT: R`\frac{2}{3}`, other: R`\frac{3}{2}`, note: R`\(\sqrt[3]{n^{2}} = n^{2/3}\)` },
    { den: R`\sqrt[3]{n^{4}}`, p: 4 / 3, pT: R`\frac{4}{3}`, other: R`\frac{3}{4}`, note: R`\(\sqrt[3]{n^{4}} = n^{4/3}\)` },
    { den: 'n^{1.01}', p: 1.01, pT: '1.01', other: '0.99' },
    { den: 'n^{0.99}', p: 0.99, pT: '0.99', other: '1.01' },
    { den: 'n^{1.5}', p: 1.5, pT: '1.5', other: '0.5' },
    { den: 'n^{0.9}', p: 0.9, pT: '0.9', other: '1.1' },
    { den: 'n^{1.1}', p: 1.1, pT: '1.1', other: '0.9' },
  ]);
  const conv = it.p > 1;
  const yes = (pT) => R`Converges: it is a p-series with \(p = ${pT} > 1\)`;
  const no = (pT) => (pT === '1' ? R`Diverges: it is a p-series with \(p = 1\)` : R`Diverges: it is a p-series with \(p = ${pT} < 1\)`);
  const size = it.p === 1 ? 'p = 1' : R`p = ${it.pT} < 1`;
  const GEO = { value: R`Converges: it is a geometric series with \(|r| < 1\)`, why: R`In a geometric series \(n\) is the exponent, as in \(r^{n}\). Here \(n\) is the base, which makes this a p-series.` };
  const NOT0 = (why) => ({ value: 'Diverges: its terms do not approach 0', why });
  const f = (n) => c / n ** it.p;
  return q({
    prompt: R`Does \(${sigma(1, R`\frac{${c}}{${it.den}}`)}\) converge or diverge, and why?`,
    correct: conv ? yes(it.pT) : no(it.pT),
    wrong: conv
      ? [
          { value: no(it.other), why: R`Read the exponent of \(n\) in the denominator again: \(p = ${it.pT}\).` },
          { value: 'Diverges: infinitely many positive terms cannot have a finite sum', why: R`They can: \(\frac{1}{2} + \frac{1}{4} + \frac{1}{8} + \cdots = 1\). What matters is how fast the terms shrink.` },
          GEO,
          NOT0(R`The terms do approach 0. For a p-series the size of \(p\) decides: \(p = ${it.pT} > 1\).`),
        ]
      : [
          { value: 'Converges: its terms approach 0', why: R`Terms that approach 0 are necessary for convergence, not sufficient. The harmonic series \(\sum \frac{1}{n}\) diverges although \(\frac{1}{n} \to 0\).` },
          it.p === 1 ? { value: R`Converges: it is a p-series with \(p = 1\)`, why: R`\(p = 1\) gives the harmonic series, the borderline case, and it diverges. Convergence needs \(p > 1\).` } : { value: yes(it.other), why: R`Read the exponent of \(n\) in the denominator again: \(p = ${it.pT}\).` },
          NOT0(R`The terms do approach 0, so the nth-term test says nothing. The p-series rule decides: \(${size}\).`),
          GEO,
        ],
    solution: [
      R`A constant factor does not affect convergence, so compare with \(\displaystyle\sum \frac{1}{n^{p}}\). Here \(p = ${it.pT}\)${it.note ? `, because ${it.note}` : ''}.`,
      R`A p-series converges exactly when \(p > 1\).`,
      conv ? R`\(p = ${it.pT} > 1\), so the series converges.` : R`\(${size}\), so the series diverges${it.p === 1 ? `: it is ${c === 1 ? '' : 'a multiple of '}the harmonic series` : ''}. Its terms approach 0, but too slowly.`,
    ],
    rule: 4,
    skill: 'p-series',
    // Second method (Cauchy condensation): Σ 2^k·a(2^k) is geometric; its ratio is below 1 exactly when the series converges.
    check: () => ((2 * f(2 ** 31)) / f(2 ** 30) < 1 - 1e-9 === conv ? true : 'condensation test disagrees with the verdict'),
  });
}

// ───────────── Medium ─────────────

function mediumGeometricShifted(rng) {
  const a = rng.int(1, 9);
  const neg = rng.bool(0.3);
  const kind = rng.pick(['start', 'start', 'down', 'up']);
  const [p, s] = rng.pick(kind === 'start' ? SMALL : rng.bool(0.75) ? [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]] : [[3, 2], [4, 3], [5, 3], [5, 4], [5, 2]]);
  const r = frac(neg ? -p : p, s);
  let from = 0;
  let tex;
  let term;
  if (kind === 'start') {
    from = rng.int(1, 3);
    tex = geoTex(a, r);
    term = (n) => a * r.value ** n;
  } else {
    const base = neg ? `(-${p})` : `${p}`;
    const top = (e) => (a === 1 ? `${base}^{${e}}` : neg ? `${a}${base}^{${e}}` : R`${a} \cdot ${base}^{${e}}`);
    const sp = neg ? -p : p;
    if (kind === 'down') {
      tex = R`\frac{${top('n')}}{${s}^{n+1}}`;
      term = (n) => (a * sp ** n) / s ** (n + 1);
    } else {
      from = 1;
      tex = R`\frac{${top('n+1')}}{${s}^{n}}`;
      term = (n) => (a * sp ** (n + 1)) / s ** n;
    }
  }
  const t = (j) => r.pow(j).mul(kind === 'start' ? r.pow(from).mul(a) : kind === 'down' ? frac(a, s) : frac(a * p * p, s));
  const first = t(0);
  const gap = frac(1).sub(r);
  const sum = first.div(gap);
  const prompt = R`Find the sum of \(${sigma(from, tex)}\), or state that it diverges.`;
  const steps = [R`Write out the first terms (\(n = ${from}, ${from + 1}, ${from + 2}\)): \(${terms([[t(0), ''], [t(1), ''], [t(2), '']])} + \cdots\)`, R`The series is geometric. Its first term is \(${first.tex()}\), and each term is \(r = ${r.tex()}\) times the one before.`];
  if (r.abs().gt(1)) {
    return q({
      prompt,
      ...exactChoices(DIV, [{ k: N(sum), why: R`\(\dfrac{\text{first term}}{1 - r}\) is the sum only when \(|r| < 1\). Here \(|r| = ${r.abs().tex()}\).` }, N(sum.neg()), N(0), N(first), N(frac(a).div(gap))]),
      solution: [...steps, R`\(|r| = ${r.abs().tex()} \ge 1\), so the terms do not approach 0 and the series diverges.`],
      rule: 2,
      skill: 'geometric series from any index',
      check: () => (Math.abs(term(250)) > 1 ? true : 'the terms approach 0'),
    });
  }
  return q({
    prompt,
    ...exactChoices(N(sum), [
      { k: N(frac(a).div(gap)), why: R`The numerator of \(\dfrac{a}{1 - r}\) must be the actual first term. Put \(n = ${from}\) into the formula: the first term is \(${first.tex()}\).` },
      { k: N(first.div(r.add(1))), why: R`The denominator is \(1 - r = ${gap.tex()}\).` },
      { k: DIV, why: R`The ratio is \(r = ${r.tex()}\), and \(|r| < 1\), so the series converges.` },
      N(first),
      N(sum.mul(r)),
      N(sum.add(first)),
    ]),
    solution: [...steps, R`\(|r| < 1\), so the sum is \(\dfrac{\text{first term}}{1 - r} = ${first.tex()} \div ${gap.tex()} = ${sum.tex()}\).`],
    rule: 2,
    skill: 'geometric series from any index',
    check: () => checkEqual(partialSum(term, from, from + 250), sum.value, 1e-9, 'sum'),
  });
}

function mediumNthTermTest(rng) {
  const a = rng.nonzero(-9, 9);
  const b = rng.nonzero(-9, 9);
  const c = rng.int(2, 9);
  const d = rng.int(1, 9);
  const m = Math.abs(a);
  const [p, s] = rng.pick(SMALL);
  const r = frac(p, s);
  const zero = rng.bool();
  const it = zero
    ? rng.pick([
        { tex: R`\dfrac{${m}}{n}`, f: (n) => m / n, fake: frac(m), how: R`\(\dfrac{${m}}{n} \to 0\).`, fact: R`In fact this series diverges: it is ${m === 1 ? '' : 'a multiple of '}the harmonic series.` },
        { tex: R`\dfrac{${m}}{\sqrt{n}}`, f: (n) => m / Math.sqrt(n), fake: frac(m), how: R`\(\dfrac{${m}}{\sqrt{n}} \to 0\).`, fact: R`In fact this series diverges: it is a p-series with \(p = \frac{1}{2}\).` },
        { tex: R`\dfrac{${m}}{n^{2}}`, f: (n) => m / (n * n), fake: frac(m), how: R`\(\dfrac{${m}}{n^{2}} \to 0\).`, fact: R`In fact this series converges: it is a p-series with \(p = 2\). The nth-term test cannot show that.` },
        { tex: geoTex(m, r), f: (n) => m * r.value ** n, fake: frac(m), how: R`\(${rPow(r)} \to 0\), because \(|r| < 1\).`, fact: R`In fact this series converges: it is geometric with \(|r| < 1\). The nth-term test cannot show that.` },
        { tex: R`\dfrac{${linear(a, b, 'n')}}{${poly([c, 0, d], 'n')}}`, f: (n) => (a * n + b) / (c * n * n + d), fake: frac(a, c), how: R`The denominator has the higher degree, so \(a_n \to 0\).`, fact: 'Whether this series converges has to be settled by a different test.' },
        { tex: R`\dfrac{${linear(a, b, 'n')}}{${poly([c, 0, d], 'n')}}`, f: (n) => (a * n + b) / (c * n * n + d), fake: frac(a, c), how: R`The denominator has the higher degree, so \(a_n \to 0\).`, fact: 'Whether this series converges has to be settled by a different test.' },
      ])
    : rng.pick([
        { tex: R`\dfrac{${linear(a, b, 'n')}}{${linear(c, d, 'n')}}`, f: (n) => (a * n + b) / (c * n + d), L: frac(a, c), how: R`The degrees are equal, so \(a_n \to ${ratioTex(a, c)}\), the ratio of the leading coefficients.` },
        { tex: R`\dfrac{${linear(a, b, 'n')}}{${linear(c, d, 'n')}}`, f: (n) => (a * n + b) / (c * n + d), L: frac(a, c), how: R`The degrees are equal, so \(a_n \to ${ratioTex(a, c)}\), the ratio of the leading coefficients.` },
        { tex: R`\dfrac{${poly([a, 0, b], 'n')}}{${poly([c, d, 0], 'n')}}`, f: (n) => (a * n * n + b) / (c * n * n + d * n), L: frac(a, c), how: R`The degrees are equal, so \(a_n \to ${ratioTex(a, c)}\), the ratio of the leading coefficients.` },
        { tex: R`\left[${terms([[a, ''], [1, rPow(r)]])}\right]`, f: (n) => a + r.value ** n, L: frac(a), how: R`\(${rPow(r)} \to 0\), so \(a_n \to ${a}\).` },
      ]);
  const noConclusion = R`The test gives no conclusion, because \(a_n \to 0\)`;
  const convZero = R`The series converges, because \(a_n \to 0\)`;
  const divTo = (L) => R`The series diverges, because \(a_n \to ${L.tex()} \ne 0\)`;
  return q({
    prompt: R`What does the nth-term test (the divergence test) say about \(${sigma(1, it.tex)}\)?`,
    correct: zero ? noConclusion : divTo(it.L),
    wrong: zero
      ? [
          { value: convZero, why: R`The test can never prove convergence. \(\sum \frac{1}{n}\) diverges although \(\frac{1}{n} \to 0\).` },
          { value: divTo(it.fake), why: R`Check the limit of the terms again: here \(a_n \to 0\).` },
          { value: R`The series diverges, because \(a_n \to 0\)`, why: R`Terms that approach 0 are not evidence of divergence. The test is silent in that case.` },
        ]
      : [
          { value: R`The series converges to \(${it.L.tex()}\), because \(a_n \to ${it.L.tex()}\)`, why: R`\(${it.L.tex()}\) is the limit of the terms, not of the partial sums. Adding infinitely many terms that are all near \(${it.L.tex()}\) cannot give a finite sum.` },
          { value: noConclusion, why: R`The test is silent only when \(a_n \to 0\). Here the limit of the terms is \(${it.L.tex()}\).` },
          { value: convZero, why: R`Here the terms do not approach 0, and even if they did, that would not prove convergence.` },
        ],
    solution: zero
      ? [R`Find the limit of the terms. ${it.how}`, R`The nth-term test only detects divergence: it applies when the terms do **not** approach 0. Here they do, so the test gives no conclusion.`, it.fact]
      : [R`Find the limit of the terms. ${it.how}`, R`The terms do not approach 0, so the series diverges by the nth-term test.`],
    rule: 3,
    skill: 'nth-term test',
    check: () => tendsTo(it.f, zero ? 0 : it.L.value),
  });
}

function mediumWordGeometric(rng) {
  const [p, s] = rng.pick([[1, 2], [3, 4], [4, 5], [9, 10], [3, 5], [2, 5], [1, 4], [1, 5]]);
  const pct = (100 * p) / s;
  const a = rng.int(2, 12) * (s - p);
  const total = (a * s) / (s - p);
  const ctx = rng.pick([
    { text: `Each swing of a pendulum covers ${pct}% of the distance of the swing before it. The first swing covers ${a} cm. If the pendulum kept swinging in this way forever, what total distance would it cover?`, unit: 'cm', first: 'the first swing', inf: 'An infinite distance' },
    { text: `A young tree grows ${a} cm in its first year. In each later year it grows ${pct}% as much as it grew the year before. If this pattern continued forever, what total growth would the tree approach?`, unit: 'cm', first: 'the first year', inf: 'Unlimited growth' },
    { text: `A robot arm moves ${a} mm toward its target and overshoots, so it corrects. Each correcting move is ${pct}% as long as the move before it. If the corrections went on forever, what total distance would the arm travel?`, unit: 'mm', first: 'the first move', inf: 'An infinite distance' },
    { text: `A spring toy is stretched and let go. Its first swing covers ${a} mm, and every later swing covers ${pct}% of the distance of the swing before it. If it kept moving in this way forever, what total distance would it cover?`, unit: 'mm', first: 'the first swing', inf: 'An infinite distance' },
  ]);
  const rT = frac(p, s).tex();
  return q({
    prompt: ctx.text,
    correct: total,
    unit: ctx.unit,
    wrong: [
      { value: total - a, why: R`That is \(\dfrac{ar}{1 - r}\), which leaves out ${ctx.first}. The series starts with \(a = ${a}\).` },
      { value: ctx.inf, why: R`Infinitely many amounts are added, but each is \(${rT}\) of the one before, so the partial sums approach a finite limit.` },
      { value: frac(a * s, p), why: R`Divide by \(1 - r\), not by \(r\).` },
      total + a,
      2 * a,
    ],
    solution: [
      R`The amounts form a geometric series: \(${a} + ${a}\left(${rT}\right) + ${a}${rPow(frac(p, s), '2')} + \cdots\), with first term \(a = ${a}\) and ratio \(r = ${pct}\% = ${rT}\).`,
      R`\(|r| < 1\), so the series converges to \(\dfrac{a}{1 - r} = ${a} \div ${frac(s - p, s).tex()} = ${total}\).`,
      R`The total approaches \(${total}\) ${ctx.unit}.`,
    ],
    rule: 2,
    skill: 'geometric series in context',
    check: () => checkEqual(partialSum((n) => a * (pct / 100) ** n, 0, 3000), total, 1e-9, 'total'),
  });
}

// ───────────── Hard ─────────────

function hardTelescoping(rng) {
  const c = rng.int(1, 12);
  const kind = rng.pick(['gap1', 'gap1', 'gap2', 'odd', 'three']);
  const a = kind === 'gap1' ? rng.int(0, 5) : rng.int(0, 3);
  const A = a === 0 ? 'n' : `n + ${a}`;
  const pair = (g) => (a === 0 ? `n(n + ${g})` : `(n + ${a})(n + ${a + g})`);
  const unit = (k) => (k === 1 ? '1' : R`\dfrac{1}{${k}}`);
  const times = (k, tex) => (k.eq(1) ? tex : R`${k.tex()}\left(${tex}\right)`); // k·(tex), without brackets when k = 1
  const keep = (k) => R`Partial fractions gives a factor \(\frac{1}{${k}}\) in front of the brackets. Keep it.`;
  const it = {
    gap1: {
      den: pair(1), f: (n) => c / ((n + a) * (n + a + 1)), sum: frac(c, a + 1),
      split: times(frac(c), R`\dfrac{1}{${A}} - \dfrac{1}{n + ${a + 1}}`),
      SN: times(frac(c), R`${unit(a + 1)} - \dfrac{1}{N + ${a + 1}}`),
      wrongs: [{ k: N(frac(c, (a + 1) * (a + 2))), why: 'That is the first term alone. The sum is the limit of the partial sums.' }, { k: N(frac(c, a + 2)), why: R`The fraction that survives comes from \(n = 1\): it is \(${unit(a + 1)}\).` }, N(c), N(2 * c)],
    },
    gap2: {
      den: pair(2), f: (n) => c / ((n + a) * (n + a + 2)), sum: frac(c, 2).mul(frac(1, a + 1).add(frac(1, a + 2))),
      split: times(frac(c, 2), R`\dfrac{1}{${A}} - \dfrac{1}{n + ${a + 2}}`),
      SN: times(frac(c, 2), R`${unit(a + 1)} + \dfrac{1}{${a + 2}} - \dfrac{1}{N + ${a + 1}} - \dfrac{1}{N + ${a + 2}}`),
      wrongs: [{ k: N(frac(c, a + 1).add(frac(c, a + 2))), why: keep(2) }, { k: N(frac(c, 2 * (a + 1))), why: R`The two factors are 2 apart, so two fractions survive at the start: \(${unit(a + 1)}\) and \(\frac{1}{${a + 2}}\).` }, N(frac(c, a + 1))],
    },
    odd: {
      den: '(2n - 1)(2n + 1)', f: (n) => c / ((2 * n - 1) * (2 * n + 1)), sum: frac(c, 2),
      split: times(frac(c, 2), R`\dfrac{1}{2n - 1} - \dfrac{1}{2n + 1}`),
      SN: times(frac(c, 2), R`1 - \dfrac{1}{2N + 1}`),
      wrongs: [{ k: N(c), why: keep(2) }, { k: N(frac(c, 3)), why: 'That is the first term alone. The sum is the limit of the partial sums.' }, N(frac(c, 4))],
    },
    three: {
      den: '(3n - 2)(3n + 1)', f: (n) => c / ((3 * n - 2) * (3 * n + 1)), sum: frac(c, 3),
      split: times(frac(c, 3), R`\dfrac{1}{3n - 2} - \dfrac{1}{3n + 1}`),
      SN: times(frac(c, 3), R`1 - \dfrac{1}{3N + 1}`),
      wrongs: [{ k: N(c), why: keep(3) }, { k: N(frac(c, 4)), why: 'That is the first term alone. The sum is the limit of the partial sums.' }, N(frac(c, 2))],
    },
  }[kind];
  return q({
    prompt: R`Find the sum of \(${sigma(1, R`\frac{${c}}{${it.den}}`)}\), or state that it diverges.`,
    ...exactChoices(N(it.sum), [...it.wrongs.slice(0, 2), { k: DIV, why: R`The partial sums are \(S_N = ${it.SN}\), which approach a finite limit.` }, { k: N(0), why: 'The terms approach 0, but the sum of the series is the limit of its partial sums.' }, ...it.wrongs.slice(2), N(it.sum.mul(2))]),
    solution: [R`Partial fractions: \(\dfrac{${c}}{${it.den}} = ${it.split}\).`, R`Add the first \(N\) terms. The middle terms cancel in pairs (the sum telescopes): \(S_N = ${it.SN}\).`, R`Let \(N \to \infty\). The fractions that contain \(N\) approach 0, so the sum is \(${it.sum.tex()}\).`],
    rule: 5,
    skill: 'telescoping series',
    check: () => checkEqual(seriesValue(it.f), it.sum.value, 1e-8, 'sum'),
  });
}

function hardWordApplication(rng) {
  const m = rng.int(1, 6);
  if (rng.bool()) {
    const [p, s] = rng.pick([[1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [3, 5], [2, 5], [4, 5]]);
    const r = frac(p, s);
    const h = m * (s - p);
    const total = m * (s + p);
    const up = r.mul(h);
    const simulate = () => {
      let height = h;
      let dist = h;
      for (let i = 0; i < 4000; i++) {
        height *= p / s;
        dist += 2 * height;
      }
      return dist;
    };
    return q({
      prompt: R`${person(rng)} drops a ball from a height of ${h} m. After every bounce the ball rises to \(${r.tex()}\) of the height it has just fallen from. If the ball could keep bouncing in this way forever, what total vertical distance would it travel?`,
      correct: total,
      unit: 'm',
      wrong: [
        { value: m * s, why: R`That is \(\dfrac{${h}}{1 - r}\), which counts every height once. After the first drop the ball covers each height twice: up, then down again.` },
        { value: 2 * m * s, why: R`That doubles the first drop as well. The ball falls the first ${h} m but never rises through them.` },
        { value: 'An infinite distance', why: 'There are infinitely many bounces, but their heights shrink geometrically, so the distances have a finite sum.' },
        total - h,
        total + h,
      ],
      solution: [
        R`The ball first falls \(${h}\) m. After that, each bounce takes it up and back down through the same height: \(2 \cdot ${up.tex()}\), then \(2 \cdot ${up.mul(r).tex()}\), and so on.`,
        R`These up-and-down distances form a geometric series with first term \(${up.mul(2).tex()}\) and ratio \(r = ${r.tex()}\). Its sum is \(${up.mul(2).tex()} \div ${frac(s - p, s).tex()} = ${2 * m * p}\).`,
        R`Total distance \(= ${h} + ${2 * m * p} = ${total}\) m.`,
      ],
      rule: 2,
      skill: 'geometric series in context',
      check: () => checkEqual(simulate(), total, 1e-9, 'distance'),
    });
  }
  const [p, s] = rng.pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5]]);
  const r = frac(p, s); // the fraction of the medicine that is still there a day later
  const removed = (100 * (s - p)) / s;
  const D = 10 * m * (s - p);
  const after = 10 * m * s;
  const before = 10 * m * p;
  const isAfter = rng.bool();
  const whole = (x) => (Number.isInteger(x) ? x : null);
  const simulate = () => {
    let amount = 0;
    let justBefore = 0;
    for (let day = 0; day < 5000; day++) {
      justBefore = (amount * p) / s;
      amount = justBefore + D;
    }
    return isAfter ? amount : justBefore;
  };
  return q({
    prompt: R`A patient takes ${D} mg of a medicine at the same time every day. During the 24 hours between doses, the body removes ${removed}% of the medicine that is in it. In the long run, how much medicine is in the body just ${isAfter ? 'after' : 'before'} a dose is taken?`,
    correct: isAfter ? after : before,
    unit: 'mg',
    wrong: isAfter
      ? [
          { value: before, why: R`That is the amount just before a dose. Taking the dose adds \(${D}\) mg to it.` },
          { value: whole((D * s) / p), why: R`The ratio of the series is the fraction that **remains** each day, \(${r.tex()}\), not the fraction that is removed.` },
          { value: D, why: 'Part of every earlier dose is still in the body, so the amount is more than one dose.' },
          after + D,
          2 * D,
        ]
      : [
          { value: after, why: R`That is the amount just after a dose. A day later only \(${r.tex()}\) of it remains.` },
          { value: whole((D * p) / s), why: 'That is what remains of the latest dose alone. Earlier doses also leave something behind.' },
          { value: D, why: R`That is one dose. Just before a dose, the body holds what remains of all the earlier doses.` },
          before + 2 * D,
          2 * D,
        ],
    solution: [
      R`Each day \(${100 - removed}\% = ${r.tex()}\) of the medicine remains.`,
      R`Just after a dose the body holds the new dose plus what remains of all the earlier ones: \(${D} + ${D}\left(${r.tex()}\right) + ${D}${rPow(r, '2')} + \cdots\), a geometric series with first term \(${D}\) and ratio \(r = ${r.tex()}\).`,
      R`Its sum is \(${D} \div ${frac(s - p, s).tex()} = ${after}\) mg.`,
      ...(isAfter ? [] : [R`Just before the next dose, \(${r.tex()}\) of that remains: \(${after} \cdot ${r.tex()} = ${before}\) mg.`]),
    ],
    rule: 2,
    skill: 'geometric series in context',
    check: () => checkEqual(simulate(), isAfter ? after : before, 1e-9, 'amount'),
  });
}

function hardRepeatingDecimal(rng) {
  const block = rng.pick(range(1, 98).filter((v) => v % 11 !== 0));
  const pad = String(block).padStart(2, '0');
  const a = rng.intExcept(1, 9, [block % 10]);
  const b = rng.intExcept(1, 8, [a]);
  const reduced = (n, d) => (frac(n, d).tex() === fracTex(n, d) ? fracTex(n, d) : `${fracTex(n, d)} = ${frac(n, d).tex()}`);
  const it = {
    two: {
      dec: R`0.\overline{${pad}}`, digits: `0.${pad.repeat(8)}`, value: frac(block, 99),
      wrong: [
        { value: frac(block, 100), why: R`\(${fracTex(block, 100)} = 0.${pad}\) stops after two digits. The repeating blocks form a geometric series.` },
        { value: frac(block, 90), why: R`Each block has two digits, so the ratio is \(\frac{1}{100}\) and \(1 - r = \frac{99}{100}\).` },
        frac(block, 101),
        frac(block, 999),
      ],
      steps: [
        R`\(0.\overline{${pad}} = ${fracTex(block, 100)} + \dfrac{${block}}{100^{2}} + \dfrac{${block}}{100^{3}} + \cdots\)`,
        R`This is a geometric series with first term \(${fracTex(block, 100)}\) and ratio \(r = \frac{1}{100}\).`,
        R`Its sum is \(${fracTex(block, 100)} \div \frac{99}{100} = ${reduced(block, 99)}\).`,
      ],
    },
    prefix: {
      dec: R`0.${a}\overline{${b}}`, digits: `0.${a}${String(b).repeat(15)}`, value: frac(9 * a + b, 90),
      wrong: [
        { value: frac(10 * a + b, 99), why: R`That is \(0.\overline{${a}${b}}\), where both digits repeat. Here only the \(${b}\) repeats.` },
        { value: frac(a, 10).add(frac(b, 9)), why: R`The first repeating digit is in the hundredths place, so the first term is \(\frac{${b}}{100}\), not \(\frac{${b}}{10}\).` },
        frac(10 * a + b, 100),
        frac(10 * a + b, 90),
      ],
      steps: [
        R`Split off the digit that does not repeat: \(0.${a}\overline{${b}} = \frac{${a}}{10} + \frac{${b}}{100} + \frac{${b}}{1000} + \cdots\)`,
        R`The repeating part is a geometric series with first term \(\frac{${b}}{100}\) and ratio \(r = \frac{1}{10}\). Its sum is \(\frac{${b}}{100} \div \frac{9}{10} = \frac{${b}}{90}\).`,
        R`\(\frac{${a}}{10} + \frac{${b}}{90} = ${reduced(9 * a + b, 90)}\).`,
      ],
    },
    whole: {
      dec: R`${a}.\overline{${pad}}`, digits: `${a}.${pad.repeat(7)}`, value: frac(block, 99).add(a),
      wrong: [
        { value: frac(block, 100).add(a), why: R`\(${a} + ${fracTex(block, 100)} = ${a}.${pad}\) stops after two digits. The repeating blocks form a geometric series.` },
        { value: frac(block, 90).add(a), why: R`Each block has two digits, so the ratio is \(\frac{1}{100}\) and \(1 - r = \frac{99}{100}\).` },
        frac(100 * a + block, 99),
        frac(block, 101).add(a),
      ],
      steps: [
        R`\(${a}.\overline{${pad}} = ${a} + ${fracTex(block, 100)} + \dfrac{${block}}{100^{2}} + \cdots\)`,
        R`After the \(${a}\), this is a geometric series with first term \(${fracTex(block, 100)}\) and ratio \(r = \frac{1}{100}\). Its sum is \(${fracTex(block, 100)} \div \frac{99}{100} = ${reduced(block, 99)}\).`,
        R`\(${a} + ${frac(block, 99).tex()} = ${frac(block, 99).add(a).tex()}\).`,
      ],
    },
    prefix2: {
      dec: R`0.${a}\overline{${pad}}`, digits: `0.${a}${pad.repeat(7)}`, value: frac(99 * a + block, 990),
      wrong: [
        { value: frac(a, 10).add(frac(block, 99)), why: R`The first repeating block starts in the hundredths place, so the first term is \(\frac{${block}}{1000}\), not \(${fracTex(block, 100)}\).` },
        { value: frac(100 * a + block, 999), why: 'That treats all three digits as one repeating block. Only the last two repeat.' },
        frac(100 * a + block, 1000),
        frac(a, 10).add(frac(block, 900)),
      ],
      steps: [
        R`Split off the digit that does not repeat: \(0.${a}\overline{${pad}} = \frac{${a}}{10} + \frac{${block}}{1000} + \frac{${block}}{100{,}000} + \cdots\)`,
        R`The repeating part is a geometric series with first term \(\frac{${block}}{1000}\) and ratio \(r = \frac{1}{100}\). Its sum is \(\frac{${block}}{1000} \div \frac{99}{100} = ${reduced(block, 990)}\).`,
        R`\(\frac{${a}}{10} + ${frac(block, 990).tex()} = ${frac(99 * a + block, 990).tex()}\).`,
      ],
    },
  }[rng.pick(['two', 'prefix', 'whole', 'prefix2'])];
  return q({
    prompt: R`Use a geometric series to write the repeating decimal \(${it.dec}\) as a fraction in lowest terms.`,
    correct: it.value,
    wrong: it.wrong,
    solution: it.steps,
    rule: 2,
    skill: 'repeating decimals',
    check: () => checkEqual(Number(it.digits), it.value.value, 1e-12, 'decimal value'),
  });
}

// ───────────── Challenge ─────────────

function challengeMissingValue(rng) {
  if (rng.bool()) {
    const [p, s] = rng.pick(SMALL);
    const neg = rng.bool(0.4);
    const r = frac(neg ? -p : p, s);
    const m = rng.int(1, 6);
    const a = m * (neg ? s + p : s - p);
    const S = m * s;
    return q({
      prompt: R`A convergent geometric series has first term \(${a}\) and sum \(${S}\). Find its common ratio \(r\).`,
      correct: r,
      fmt: (v) => R`\(r = ${num(v)}\)`,
      wrong: [
        { value: frac(a, S), why: R`\(\dfrac{a}{S} = ${frac(a, S).tex()}\) is \(1 - r\). Subtract it from 1 to get \(r\).` },
        { value: r.neg(), why: R`Check it in \(\dfrac{a}{1 - r}\): that ratio would give the sum \(${frac(a).div(r.add(1)).tex()}\), not \(${S}\).` },
        frac(S - a, a),
        frac(S, a),
        frac(1).sub(r).neg(),
      ],
      solution: [R`For a convergent geometric series, \(S = \dfrac{a}{1 - r}\). Here \(${S} = \dfrac{${a}}{1 - r}\).`, R`Solve for \(1 - r\): \(1 - r = ${ratioTex(a, S)}\).`, R`\(r = 1 - ${frac(a, S).tex()} = ${r.tex()}\). Since \(|r| < 1\), the series does converge.`],
      rule: 2,
      skill: 'working backwards from a sum',
      check: () => checkEqual(partialSum((n) => a * r.value ** n, 0, 600), S, 1e-9, 'sum'),
    });
  }
  const c = rng.nonzero(-6, 6);
  const d = rng.int(2, 6);
  const xc = linear(1, -c);
  const kind = rng.pick(['frac', 'split', 'plain', 'scale']);
  const iv = (lo, hi, sign = '<') => R`\(${num(lo)} ${sign} x ${sign} ${num(hi)}\)`;
  const it = {
    frac: { tex: R`\left(\dfrac{${xc}}{${d}}\right)^{n}`, rT: R`\dfrac{${xc}}{${d}}`, ratio: (x) => (x - c) / d, lo: frac(c - d), hi: frac(c + d), cond: R`\(|${xc}| < ${d}\)` },
    split: { tex: R`\dfrac{(${xc})^{n}}{${d}^{n}}`, rT: R`\dfrac{${xc}}{${d}}`, ratio: (x) => (x - c) / d, lo: frac(c - d), hi: frac(c + d), cond: R`\(|${xc}| < ${d}\)` },
    plain: { tex: R`(${xc})^{n}`, rT: xc, ratio: (x) => x - c, lo: frac(c - 1), hi: frac(c + 1), cond: R`\(|${xc}| < 1\)` },
    scale: { tex: R`(${d}x)^{n}`, rT: `${d}x`, ratio: (x) => d * x, lo: frac(-1, d), hi: frac(1, d), cond: R`\(|${d}x| < 1\)` },
  }[kind];
  const centred = { value: iv(-d, d), why: R`The ratio is \(${it.rT}\), so the condition is ${it.cond}. The interval is centred at \(x = ${c}\), not at 0.` };
  return q({
    prompt: R`Find all values of \(x\) for which the geometric series \(${sigma(0, it.tex)}\) converges.`,
    correct: iv(it.lo, it.hi),
    wrong: [
      { value: iv(it.lo, it.hi, R`\le`), why: R`At the endpoints the ratio has \(|r| = 1\), and a geometric series with \(|r| = 1\) diverges.` },
      ...(kind === 'frac' || kind === 'split'
        ? [centred, { value: iv(c - 1, c + 1), why: R`The condition is ${it.cond}, so \(x\) may be up to \(${d}\) away from \(${c}\).` }]
        : kind === 'plain'
          ? [{ value: iv(-1, 1), why: R`The ratio is \(${it.rT}\), so the condition is ${it.cond}. The interval is centred at \(x = ${c}\), not at 0.` }, iv(c - 2, c + 2)]
          : [{ value: iv(-d, d), why: R`The ratio is \(${it.rT}\). ${it.cond} means \(|x| < \frac{1}{${d}}\).` }, iv(-1, 1)]),
      { value: R`\(x < ${num(it.hi)}\)`, why: R`The ratio must also stay above \(-1\), which gives a lower bound for \(x\).` },
    ],
    solution: [R`The series is geometric with ratio \(r = ${it.rT}\).`, R`A geometric series converges exactly when \(|r| < 1\), that is, when ${it.cond}.`, R`So \(${num(it.lo)} < x < ${num(it.hi)}\). At the two endpoints \(|r| = 1\) and the series diverges, so they are not included.`],
    rule: 2,
    skill: 'geometric series with a variable',
    check: () => {
      const [lo, hi] = [it.lo.value, it.hi.value];
      const size = (x) => Math.abs(it.ratio(x));
      return size(lo + 1e-6) < 1 && size(hi - 1e-6) < 1 && size((lo + hi) / 2) < 1 && size(lo - 1e-6) > 1 && size(hi + 1e-6) > 1 ? true : 'the interval does not match |r| < 1';
    },
  });
}

function challengeTelescopingLimit(rng) {
  const c = rng.int(1, 6);
  const big = (tex) => (c === 1 ? R`\left(${tex}\right)` : R`${c}\left(${tex}\right)`); // the summand
  const cTimes = (tex) => (c === 1 ? tex : R`${c}\left(${tex}\right)`); // a partial sum
  const bank = [
    {
      tex: big(R`\dfrac{1}{\sqrt{n}} - \dfrac{1}{\sqrt{n + 1}}`), term: (n) => c / Math.sqrt(n) - c / Math.sqrt(n + 1), b: (n) => c / Math.sqrt(n), lim: 0, sum: N(c),
      SN: cTimes(R`1 - \dfrac{1}{\sqrt{N + 1}}`), last: R`\(\dfrac{1}{\sqrt{N + 1}} \to 0\)`,
      wrongs: [{ k: DIV, why: R`The partial sums \(S_N = ${cTimes(R`1 - \frac{1}{\sqrt{N + 1}}`)}\) approach a finite limit.` }, { k: N(0), why: 'The terms approach 0, but the sum is the limit of the partial sums.' }, N(2 * c), N(frac(c, 2)), N(-c)],
    },
    {
      tex: big('e^{1/n} - e^{1/(n+1)}'), term: (n) => c * (Math.exp(1 / n) - Math.exp(1 / (n + 1))), b: (n) => c * Math.exp(1 / n), lim: c, sum: K([[c, 'e'], [-c, '']]),
      SN: cTimes('e - e^{1/(N+1)}'), last: R`\(e^{1/(N+1)} \to e^{0} = 1\)`,
      wrongs: [{ k: K([[c, 'e']]), why: R`The leftover term does not vanish: \(e^{1/(N+1)} \to e^{0} = 1\), not 0.` }, { k: DIV, why: R`The partial sums \(S_N = ${cTimes('e - e^{1/(N+1)}')}\) approach a finite limit.` }, N(0), K([[c, 'e'], [c, '']]), K([[-c, 'e'], [c, '']])],
    },
    {
      tex: big(R`\cos\dfrac{\pi}{n} - \cos\dfrac{\pi}{n + 1}`), term: (n) => c * (Math.cos(Math.PI / n) - Math.cos(Math.PI / (n + 1))), b: (n) => c * Math.cos(Math.PI / n), lim: c, sum: N(-2 * c),
      SN: cTimes(R`\cos\pi - \cos\dfrac{\pi}{N + 1}`), last: R`\(\cos\dfrac{\pi}{N + 1} \to \cos 0 = 1\)`,
      wrongs: [{ k: N(-c), why: R`The leftover term does not vanish: \(\cos\frac{\pi}{N + 1} \to \cos 0 = 1\), not 0.` }, { k: DIV, why: 'The partial sums approach a finite limit.' }, N(0), N(2 * c), N(c)],
    },
    {
      tex: big(R`\arctan(n + 1) - \arctan n`), term: (n) => c * (Math.atan(n + 1) - Math.atan(n)), b: (n) => -c * Math.atan(n), lim: (-c * Math.PI) / 2, sum: K([[frac(c, 4), '\\pi']]),
      SN: cTimes(R`\arctan(N + 1) - \arctan 1`), last: R`\(\arctan(N + 1) \to \dfrac{\pi}{2}\) and \(\arctan 1 = \dfrac{\pi}{4}\)`,
      wrongs: [{ k: K([[frac(c, 2), '\\pi']]), why: R`The first term of the telescoped sum also survives: subtract \(\arctan 1 = \frac{\pi}{4}\).` }, { k: DIV, why: R`\(\arctan(N + 1)\) is bounded: it approaches \(\frac{\pi}{2}\).` }, K([[frac(-c, 4), '\\pi']]), N(0), K([[frac(3 * c, 4), '\\pi']])],
    },
    {
      tex: big(R`\dfrac{n}{n + 1} - \dfrac{n + 1}{n + 2}`), term: (n) => c * (n / (n + 1) - (n + 1) / (n + 2)), b: (n) => (c * n) / (n + 1), lim: c, sum: N(frac(-c, 2)),
      SN: cTimes(R`\dfrac{1}{2} - \dfrac{N + 1}{N + 2}`), last: R`\(\dfrac{N + 1}{N + 2} \to 1\)`,
      wrongs: [{ k: N(frac(c, 2)), why: R`The leftover term does not vanish: \(\frac{N + 1}{N + 2} \to 1\), not 0.` }, { k: DIV, why: 'The partial sums approach a finite limit.' }, N(0), N(-c), N(c)],
    },
    {
      tex: c === 1 ? R`\ln\dfrac{n + 1}{n}` : R`${c}\ln\dfrac{n + 1}{n}`, term: (n) => c * Math.log((n + 1) / n), b: null, sum: DIV,
      SN: R`${c === 1 ? '' : c}\ln(N + 1)`, split: R`\(\ln\dfrac{n + 1}{n} = \ln(n + 1) - \ln n\)`,
      wrongs: [{ k: N(0), why: R`The terms approach 0, but the partial sums \(S_N = ${c === 1 ? '' : c}\ln(N + 1)\) grow without bound.` }, { k: K([[c, '\\ln 2']]), why: 'That is the first term alone.' }, N(c), K([[-c, '\\ln 2']]), N(1 + c)],
    },
    {
      tex: big(R`\sqrt{n + 1} - \sqrt{n}`), term: (n) => c * (Math.sqrt(n + 1) - Math.sqrt(n)), b: null, sum: DIV,
      SN: cTimes(R`\sqrt{N + 1} - 1`),
      wrongs: [{ k: N(0), why: R`The terms approach 0, but the partial sums \(S_N = ${cTimes(R`\sqrt{N + 1} - 1`)}\) grow without bound.` }, { k: N(-c), why: R`\(\sqrt{N + 1}\) does not approach 0. It grows without bound.` }, N(c), K([[c, '\\sqrt{2}'], [-c, '']]), N(2 * c)],
    },
  ];
  const it = rng.pick(bank);
  const diverges = it.sum === DIV;
  return q({
    prompt: R`Find the sum of \(${sigma(1, it.tex)}\), or state that it diverges.`,
    ...exactChoices(it.sum, it.wrongs),
    solution: diverges
      ? [
          it.split ? R`Write each term as a difference: ${it.split}.` : R`Each term is already a difference of two consecutive values of \(\sqrt{n}\).`,
          R`Add the first \(N\) terms. The middle terms cancel: \(S_N = ${it.SN}\).`,
          R`\(S_N \to \infty\) as \(N \to \infty\), so the series diverges, even though its terms approach 0.`,
        ]
      : [
          R`Add the first \(N\) terms. Each term is a difference, and the middle terms cancel: \(S_N = ${it.SN}\).`,
          R`Take the limit of what is left: ${it.last}.`,
          R`The sum is \(${it.sum.tex}\).`,
        ],
    rule: 5,
    skill: 'telescoping series',
    check: () => {
      if (diverges) return partialSum(it.term, 1, 1e5) - partialSum(it.term, 1, 1e3) > 1 ? true : 'the partial sums do not keep growing';
      // Add the displayed terms directly, then compare with b(1) − b(N + 1) and with the limit of b.
      const direct = checkEqual(partialSum(it.term, 1, 2000), it.b(1) - it.b(2001), 1e-9, 'telescoped partial sum');
      const limit = tendsTo(it.b, it.lim);
      return direct !== true ? direct : limit !== true ? limit : checkEqual(it.sum.value, it.b(1) - it.lim, 1e-9, 'sum');
    },
  });
}

function challengeFromPartialSums(rng) {
  const a = rng.int(1, 9);
  const b = rng.int(1, 5);
  const k = rng.int(2, 6);
  const it = rng.pick([
    { tex: R`\dfrac{${terms([[a, 'N']])}}{N + ${b}}`, S: (n) => frac(a * n, n + b), closed: (n) => (a * b) / ((n + b) * (n - 1 + b)), sum: frac(a) },
    { tex: R`\dfrac{${terms([[a, 'N']])}}{N + ${b}}`, S: (n) => frac(a * n, n + b), closed: (n) => (a * b) / ((n + b) * (n - 1 + b)), sum: frac(a) },
    { tex: R`${a} - \dfrac{${b}}{N}`, S: (n) => frac(a * n - b, n), closed: (n) => b / (n * (n - 1)), sum: frac(a) },
    { tex: R`${a} - \dfrac{${b}}{2^{N}}`, S: (n) => frac(a).sub(frac(b, 2 ** n)), closed: (n) => b / 2 ** n, sum: frac(a) },
    { tex: terms([[1, 'N^{2}'], [b, 'N']]), S: (n) => frac(n * n + b * n), closed: (n) => 2 * n - 1 + b, sum: null },
  ]);
  const ak = it.S(k).sub(it.S(k - 1));
  return q({
    prompt: R`The \(N\)th partial sum of a series \(${sigma(1, 'a_n')}\) is \(S_N = ${it.tex}\). Find the term \(a_{${k}}\).`,
    correct: ak,
    fmt: (v) => R`\(a_{${k}} = ${num(v)}\)`,
    wrong: [
      { value: it.S(k), why: R`That is \(S_{${k}}\), the sum of the first ${k} terms. A single term is the difference of two partial sums.` },
      it.sum ? { value: it.sum, why: R`That is the sum of the whole series, \(\displaystyle\lim_{N\to\infty} S_N\).` } : null,
      { value: it.S(k + 1).sub(it.S(k)), why: R`That is \(S_{${k + 1}} - S_{${k}} = a_{${k + 1}}\). For \(a_{${k}}\), subtract \(S_{${k - 1}}\) from \(S_{${k}}\).` },
      it.S(k).sub(it.S(1)),
      it.S(k - 1),
    ],
    solution: [R`\(S_{${k}} = S_{${k - 1}} + a_{${k}}\), so \(a_{${k}} = S_{${k}} - S_{${k - 1}}\).`, R`\(S_{${k}} = ${it.S(k).tex()}\) and \(S_{${k - 1}} = ${it.S(k - 1).tex()}\).`, R`\(a_{${k}} = ${it.S(k).tex()} - ${paren(it.S(k - 1))} = ${ak.tex()}\).`],
    rule: 1,
    skill: 'terms from partial sums',
    // The general term found by algebra must reproduce both the answer and the partial sum.
    check: () => {
      const one = checkEqual(it.closed(k), ak.value, 1e-9, 'term');
      return one !== true ? one : checkEqual(it.S(1).value + partialSum(it.closed, 2, k), it.S(k).value, 1e-9, 'partial sum');
    },
  });
}

// ───────────── Topic ─────────────

const geoS = (n) => 2 - 2 ** (1 - n); // 1 + 1/2 + … (n terms)
const harmonic = (n) => partialSum((j) => 1 / j, 1, n);

export default {
  id: 'sequences-series-intro',
  title: 'Sequences & Infinite Series',
  summary: 'Find limits of sequences, sum geometric and telescoping series, and decide convergence with partial sums and p-series.',
  standards: ['AP Calculus 10.1', 'AP Calculus 10.2', 'AP Calculus 10.3', 'AP Calculus 10.5'],

  explain: {
    intro: R`A **sequence** is an ordered list of numbers, written \(a_1, a_2, a_3, \dots\), and a **series** adds the terms of a sequence. An infinite sum is defined through its **partial sums** \(S_N = a_1 + a_2 + \cdots + a_N\): if \(S_N\) approaches a finite number \(S\) as \(N \to \infty\), the series **converges** and its sum is \(S\). Otherwise it **diverges**.`,
    rules: [
      {
        title: 'Limit of a sequence',
        text: R`\(\displaystyle\lim_{n\to\infty} a_n = L\) means the terms get as close to \(L\) as we like once \(n\) is large enough. For a quotient of polynomials in \(n\), compare degrees: equal degrees give the ratio of the leading coefficients, a higher degree in the denominator gives 0, and a higher degree in the numerator means the sequence diverges. Also \(r^{n} \to 0\) whenever \(|r| < 1\).`,
        example: R`\(\displaystyle\lim_{n\to\infty} \frac{3n^{2} - 1}{2n^{2} + 5n} = \frac{3}{2}\), and \(\displaystyle\lim_{n\to\infty}\left[4 + \left(\tfrac{1}{2}\right)^{n}\right] = 4\).`,
      },
      {
        title: 'Partial sums decide convergence',
        text: R`\(\displaystyle\sum_{n=1}^{\infty} a_n = \lim_{N\to\infty} S_N\), where \(S_N = a_1 + a_2 + \cdots + a_N\). The sum of a series is the limit of its partial sums, not the limit of its terms. A single term can be recovered from two partial sums: \(a_n = S_n - S_{n-1}\).`,
        example: R`If \(S_N = \dfrac{2N}{N + 1}\), the series converges to \(\displaystyle\lim_{N\to\infty} \frac{2N}{N + 1} = 2\).`,
      },
      {
        title: 'Geometric series',
        text: R`In a geometric series each term is a fixed multiple \(r\) of the term before it, as in \(a + ar + ar^{2} + \cdots\), and \(r\) is called the common ratio. The series converges exactly when \(|r| < 1\), and then its sum is \(\dfrac{a}{1 - r}\), where \(a\) is the **first term** of the series, whatever index it starts at. If \(|r| \ge 1\) the series diverges.`,
        example: R`\(\displaystyle\sum_{n=1}^{\infty} 5\left(\tfrac{2}{3}\right)^{n}\) has first term \(\tfrac{10}{3}\) and \(r = \tfrac{2}{3}\), so its sum is \(\tfrac{10}{3} \div \tfrac{1}{3} = 10\).`,
      },
      {
        title: 'The nth-term test for divergence',
        text: R`If \(\displaystyle\lim_{n\to\infty} a_n\) is not 0, or does not exist, then \(\sum a_n\) diverges. The test works in one direction only: if \(a_n \to 0\), it gives **no conclusion**. Terms that approach 0 are necessary for convergence, but they are not sufficient.`,
        example: R`\(\displaystyle\sum_{n=1}^{\infty} \frac{n}{2n + 1}\) diverges, because \(\dfrac{n}{2n + 1} \to \dfrac{1}{2} \ne 0\). For \(\displaystyle\sum \frac{1}{n}\) the terms approach 0, so the test says nothing.`,
      },
      {
        title: 'The harmonic series and p-series',
        text: R`The harmonic series \(\displaystyle\sum_{n=1}^{\infty} \frac{1}{n}\) diverges although its terms approach 0: its partial sums grow without bound, roughly like \(\ln N\). More generally, the p-series \(\displaystyle\sum_{n=1}^{\infty} \frac{1}{n^{p}}\) converges exactly when \(p > 1\). A constant factor does not change this.`,
        example: R`\(\displaystyle\sum \frac{1}{n^{2}}\) converges (\(p = 2\)). \(\displaystyle\sum \frac{1}{\sqrt{n}}\) diverges (\(p = \tfrac{1}{2}\)).`,
      },
      {
        title: 'Telescoping series',
        text: R`If the terms can be written as differences \(a_n = b_n - b_{n+1}\) (often by partial fractions), the partial sums collapse to \(S_N = b_1 - b_{N+1}\). The series converges exactly when \(b_{N+1}\) has a finite limit, and then the sum is \(b_1 - \displaystyle\lim_{N\to\infty} b_{N+1}\). That limit is not always 0.`,
        example: R`\(\displaystyle\sum_{n=1}^{\infty} \frac{1}{n(n+1)} = \sum_{n=1}^{\infty}\left(\frac{1}{n} - \frac{1}{n+1}\right)\) has \(S_N = 1 - \dfrac{1}{N+1}\), so its sum is 1.`,
      },
    ],
    vocab: [
      { term: 'sequence', def: R`An ordered list of numbers \(a_1, a_2, a_3, \dots\), one for each positive whole number \(n\).` },
      { term: 'series', def: 'The sum of the terms of a sequence. An infinite series has infinitely many terms.' },
      { term: 'partial sum', def: R`\(S_N\), the sum of the first \(N\) terms of a series.` },
      { term: 'converges / diverges', def: 'A series converges if its partial sums approach a finite number, called the sum. Otherwise it diverges.' },
      { term: 'common ratio', def: R`The fixed number \(r\) that each term of a geometric series is multiplied by to give the next term.` },
      { term: 'p-series', def: R`A series of the form \(\sum \frac{1}{n^{p}}\). With \(p = 1\) it is the harmonic series.` },
    ],
    mistakes: [
      R`Mixing up the two limits. \(\dfrac{n}{2n + 1} \to \dfrac{1}{2}\) is the limit of the terms. The series \(\displaystyle\sum \frac{n}{2n + 1}\) diverges.`,
      R`Deciding that a series converges because its terms approach 0. The harmonic series is the standard counterexample.`,
      R`Using \(\dfrac{a}{1 - r}\) when \(|r| \ge 1\), or with the wrong first term when the series does not start at \(n = 0\).`,
      R`Cancelling a telescoping sum without checking what is left over. Write out \(S_N\) and then take the limit of the leftover term.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 16],
      y: [0, 3.6],
      step: [2, 0.5],
      axisLabels: ['N', 'S'],
      points: [...range(1, 12).map((n) => ({ x: n, y: geoS(n), label: n === 12 ? 'geometric' : null })), ...range(1, 12).map((n) => ({ x: n, y: harmonic(n), color: 'b', label: n === 12 ? 'harmonic' : null }))],
      hlines: [{ y: 2 }],
      alt: 'Partial sums of two series for N from 1 to 12. The partial sums of the geometric series 1 + 1/2 + 1/4 + … rise quickly and level off just below the line S = 2, which is the sum. The partial sums of the harmonic series 1 + 1/2 + 1/3 + … keep climbing slowly past 3 and never level off.',
    },
  },

  examples: [
    {
      title: 'A geometric series that starts at n = 1',
      problem: R`Find \(\displaystyle\sum_{n=1}^{\infty} \frac{3 \cdot 2^{n}}{5^{n}}\).`,
      steps: [
        R`Write out the first terms: \(\dfrac{6}{5} + \dfrac{12}{25} + \dfrac{24}{125} + \cdots\)`,
        R`Each term is \(\dfrac{2}{5}\) times the one before, so the series is geometric with first term \(\dfrac{6}{5}\) and \(r = \dfrac{2}{5}\).`,
        R`\(|r| < 1\), so the sum is \(\dfrac{\text{first term}}{1 - r} = \dfrac{6}{5} \div \dfrac{3}{5} = 2\).`,
      ],
      answer: R`The series converges to \(2\).`,
    },
    {
      title: 'A repeating decimal',
      problem: R`Write \(0.\overline{36} = 0.363636\ldots\) as a fraction.`,
      steps: [R`\(0.\overline{36} = \dfrac{36}{100} + \dfrac{36}{100^{2}} + \dfrac{36}{100^{3}} + \cdots\)`, R`This is a geometric series with first term \(\dfrac{36}{100}\) and ratio \(r = \dfrac{1}{100}\).`, R`Its sum is \(\dfrac{36}{100} \div \dfrac{99}{100} = \dfrac{36}{99} = \dfrac{4}{11}\).`],
      answer: R`\(0.\overline{36} = \dfrac{4}{11}\)`,
    },
    {
      title: 'A telescoping series',
      problem: R`Find \(\displaystyle\sum_{n=1}^{\infty} \frac{2}{n(n + 2)}\).`,
      steps: [
        R`Partial fractions: \(\dfrac{2}{n(n + 2)} = \dfrac{1}{n} - \dfrac{1}{n + 2}\).`,
        R`Add the first \(N\) terms. Each negative fraction cancels a positive one two terms later: \(\left(1 - \tfrac{1}{3}\right) + \left(\tfrac{1}{2} - \tfrac{1}{4}\right) + \left(\tfrac{1}{3} - \tfrac{1}{5}\right) + \cdots\)`,
        R`What is left: \(S_N = 1 + \dfrac{1}{2} - \dfrac{1}{N + 1} - \dfrac{1}{N + 2}\).`,
        R`As \(N \to \infty\) the last two fractions approach 0.`,
      ],
      answer: R`The series converges to \(\dfrac{3}{2}\).`,
    },
    {
      title: 'Three quick decisions',
      problem: R`Decide whether each series converges: (a) \(\displaystyle\sum_{n=1}^{\infty} \frac{2n}{5n + 1}\), (b) \(\displaystyle\sum_{n=1}^{\infty} \frac{1}{n\sqrt{n}}\), (c) \(\displaystyle\sum_{n=1}^{\infty} \frac{3}{n}\).`,
      steps: [
        R`(a) The terms approach \(\dfrac{2}{5}\), not 0. By the nth-term test the series diverges.`,
        R`(b) \(n\sqrt{n} = n^{3/2}\), so this is a p-series with \(p = \dfrac{3}{2} > 1\). It converges.`,
        R`(c) This is 3 times the harmonic series (\(p = 1\)), so it diverges. Its terms do approach 0, which shows that the nth-term test cannot prove convergence.`,
      ],
      answer: '(a) diverges, (b) converges, (c) diverges',
    },
    {
      title: 'Word problem: a bouncing ball',
      word: true,
      problem: R`A ball is dropped from a height of 10 m. After every bounce it rises to \(\frac{3}{5}\) of the height it has just fallen from. What total vertical distance does it travel?`,
      steps: [
        R`The ball first falls 10 m. Then it goes up 6 m and down 6 m, up 3.6 m and down 3.6 m, and so on.`,
        R`The up-and-down distances \(12 + 7.2 + 4.32 + \cdots\) form a geometric series with first term 12 and ratio \(r = \dfrac{3}{5}\).`,
        R`Its sum is \(\dfrac{12}{1 - \frac{3}{5}} = 12 \div \dfrac{2}{5} = 30\).`,
        R`Add the first fall: \(10 + 30 = 40\).`,
      ],
      answer: 'The ball travels 40 m in total, even though it bounces infinitely many times.',
    },
  ],

  models: [
    {
      id: 'geometric-partial-sums',
      title: 'Geometric series: watch the partial sums',
      intro: 'Choose the first term a, the common ratio r and the number of terms to add.',
      inputs: [{ name: 'a', label: 'First term a', type: 'number', min: -10, max: 10, step: 0.5, value: 3 }, { name: 'r', label: 'Common ratio r', type: 'number', min: -1.25, max: 1.25, step: 0.05, value: 0.5 }, { name: 'N', label: 'Number of terms N', type: 'int', min: 1, max: 20, value: 8 }],
      compute({ a, r, N: count }) {
        if (a === 0) return { error: 'Choose a first term other than 0, so that there is something to add.' };
        const S = (k) => (r === 1 ? a * k : (a * (1 - r ** k)) / (1 - r));
        const conv = Math.abs(r) < 1;
        const sum = a / (1 - r);
        const show = (x) => num(x, { places: 4 });
        const shown = Math.max(count, 10);
        const ys = range(1, shown).map(S);
        const lo = Math.min(0, ...ys, conv ? sum : 0);
        const hi = Math.max(0, ...ys, conv ? sum : 0);
        const pad = 0.1 * (hi - lo) || 1;
        return {
          problem: R`\(\displaystyle\sum_{n=0}^{\infty} ${paren(a, { places: 4 })}\left(${show(r)}\right)^{n}\)`,
          steps: [
            R`Each term is \(r = ${show(r)}\) times the one before: \(${[0, 1, 2, 3].map((k) => show(a * r ** k)).join(',\\ ')}, \dots\)`,
            r === 1
              ? R`With \(r = 1\) every term equals \(a\), so \(S_{${count}} = ${paren(a)} \cdot ${count} = ${show(S(count))}\).`
              : R`Sum of the first ${count} terms: \(S_{${count}} = \dfrac{a(1 - r^{${count}})}{1 - r} = \dfrac{${show(a)}\left(1 - ${paren(r)}^{${count}}\right)}{1 - ${paren(r)}} \approx ${show(S(count))}\).`,
            conv
              ? R`\(|r| = ${show(Math.abs(r))} < 1\), so \(r^{N} \to 0\) and the partial sums approach \(\dfrac{a}{1 - r} = ${show(sum)}\).`
              : R`\(|r| = ${show(Math.abs(r))} \ge 1\), so \(r^{N}\) does not approach 0 and the partial sums have no finite limit.`,
            conv ? (Math.abs(sum - S(count)) < 5e-5 ? `After ${plural(count, 'term')} the partial sum agrees with the sum to four decimal places.` : R`After ${plural(count, 'term')} the partial sum is within \(${show(Math.abs(sum - S(count)))}\) of the sum.`) : R`The formula \(\dfrac{a}{1 - r}\) does not apply here.`,
          ],
          answer: conv ? R`Converges to \(${show(sum)}\); \(S_{${count}} \approx ${show(S(count))}\)` : R`Diverges; \(S_{${count}} \approx ${show(S(count))}\)`,
          visual: {
            type: 'plot',
            x: [0, shown + 1],
            y: [lo - pad, hi + pad],
            axisLabels: ['N', 'S'],
            points: ys.map((y, i) => ({ x: i + 1, y, color: i + 1 === count ? 'b' : 'a' })),
            hlines: conv ? [{ y: sum }] : [],
            alt: `Partial sums of the geometric series with first term ${show(a)} and ratio ${show(r)}, plotted for N from 1 to ${shown}. ${conv ? `The points level off at the dashed line S = ${show(sum)}, the sum of the series.` : 'The points do not level off, because the series diverges.'}`,
          },
        };
      },
    },
    {
      id: 'bouncing-ball',
      title: 'Word problem: how far does a bouncing ball travel?',
      word: true,
      intro: 'A dropped ball rebounds to a fixed percentage of its previous height. Follow the distance bounce by bounce.',
      inputs: [{ name: 'h', label: 'Drop height (m)', type: 'int', min: 1, max: 50, value: 10 }, { name: 'pct', label: 'Rebound (% of the previous height)', type: 'int', min: 5, max: 95, value: 60 }, { name: 'k', label: 'Bounces to follow', type: 'int', min: 1, max: 15, value: 3 }],
      compute({ h, pct, k }) {
        const r = pct / 100;
        const first = 2 * h * r;
        const D = (j) => h + (first * (1 - r ** j)) / (1 - r);
        const total = h + first / (1 - r);
        const two = (x) => num(x, { places: 2 });
        return {
          problem: R`A ball is dropped from ${h} m and rebounds to ${pct}% of its previous height after every bounce. How far has it travelled when it hits the ground for the ${ordinal(k + 1)} time, and how far does it travel in total?`,
          steps: [
            R`The first fall is \(${h}\) m. The first bounce takes the ball up \(${h} \cdot ${num(r)} = ${num(h * r)}\) m and down the same distance: \(${num(first)}\) m in all.`,
            R`Each later bounce covers \(r = ${num(r)}\) times the distance of the bounce before, so the bounces form a geometric series with first term \(${num(first)}\).`,
            R`After ${plural(k, 'bounce')}: \(${h} + \dfrac{${num(first)}\left(1 - ${k === 1 ? num(r) : `${num(r)}^{${k}}`}\right)}{1 - ${num(r)}} \approx ${two(D(k))}\) m.`,
            R`For ever: \(${h} + \dfrac{${num(first)}}{1 - ${num(r)}} = ${two(total)}\) m. The sum is finite because \(|r| < 1\).`,
          ],
          answer: R`About \(${two(D(k))}\) m after ${plural(k, 'bounce')}; \(${two(total)}\) m in total`,
          visual: {
            type: 'plot',
            x: [-1, 16],
            y: [0, total * 1.15],
            axisLabels: ['bounces', 'distance (m)'],
            points: range(0, 15).map((j) => ({ x: j, y: D(j), color: j === k ? 'b' : 'a' })),
            hlines: [{ y: total }],
            alt: `Total distance travelled after 0 to 15 bounces. The points start at ${h} m and level off toward the dashed line at ${two(total)} m, the total distance.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easySequenceLimit, easyPartialSum, easyGeometric, easyPSeries],
    medium: [mediumGeometricShifted, mediumNthTermTest, mediumWordGeometric],
    hard: [hardTelescoping, hardWordApplication, hardRepeatingDecimal],
    challenge: [challengeMissingValue, challengeTelescopingLimit, challengeFromPartialSums],
  },
};
