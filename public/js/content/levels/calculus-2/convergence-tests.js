import { R, q, frac, num, terms, linear, power, person, range, factorial, close, checkDeriv, checkEqual } from '../../lib/index.js';
import { N, piTex, exactChoices, partialSum, quad } from './_shared.js';

const sig = (tex, from = 1) => R`\displaystyle\sum_{n=${from}}^{\infty} ${tex}`;
const first = (...checks) => checks.find((r) => r !== true) ?? true; // the first failed check, or true

// ───────────── numeric evidence for a verdict (used only by checks) ─────────────

const logFact = (n) => {
  let s = 0;
  for (let k = 2; k <= n; k++) s += Math.log(k);
  return s;
};
// lim |a(n+1)/a(n)|, estimated far out from la(n) = ln|a(n)| (logarithms avoid overflow).
const ratioFar = (la, n = 4000) => Math.exp(la(n + 1) - la(n));
const ratioIs = (la, L) => {
  const r = ratioFar(la);
  return (L === Infinity ? r > 100 : L === 0 ? r < 0.01 : Math.abs(r - L) < 0.004 * Math.max(1, L)) ? true : `the ratio far out is ${r}, expected ${L}`;
};
// Cauchy condensation for a positive, decreasing, power-like term: Σ b(n) converges exactly when 2·b(2N)/b(N) stays below 1.
const powerConverges = (b) => (2 * b(2 ** 41)) / b(2 ** 40) < 1 - 1e-6;
// What ∫ f dx still gains between x = e^20 and x = e^700, computed in t = ln x: almost nothing if the integral converges.
const farGrowth = (f) => quad((t) => f(Math.exp(t)) * Math.exp(t), 20, 700);
// b(n) is decreasing from some point on and tends to 0.
const decreasesToZero = (b, from = 10) => range(from, from + 300).every((n) => b(n + 1) < b(n)) && b(1e300) < 0.01 && b(1e300) <= b(1e150);
// Classify a series from evidence: 'abs' (Σ|a_n| converges), 'cond' or 'div'. An item has la (ratio type), log (integral type) or b = |a_n|.
function verdict(it) {
  if (it.la) return ratioFar(it.la) < 0.999 ? 'abs' : ratioFar(it.la) > 1.001 ? 'div' : '?';
  if (it.log) return farGrowth(it.log) < 0.1 ? 'abs' : farGrowth(it.log) > 1 ? 'div' : '?';
  if (!(it.b(1e100) < 0.01)) return 'div'; // the terms do not approach 0 (1/ln n is still about 0.004 there)
  return powerConverges(it.b) ? 'abs' : it.alt && decreasesToZero(it.b) ? 'cond' : 'div';
}
const agrees = (it, cls) => (verdict(it) === cls ? true : `numeric evidence says "${verdict(it)}", the key says "${cls}" for ${it.tex}`);

// ───────────── shared families ─────────────

// Series for the ratio test: tex, la = ln|a_n|, L (a Frac or Infinity), the simplified ratio and the limit that settles it.
function ratioBank(rng) {
  const k = rng.int(1, 3);
  const c = rng.int(2, 6);
  const [p, s] = rng.pick([[1, 2], [2, 3], [3, 4], [3, 2], [4, 3], [5, 2]]);
  const r = frac(p, s).tex();
  const nk = power('n', k);
  const n1k = k === 1 ? 'n+1' : `(n+1)^{${k}}`;
  const up = k === 1 ? R`\frac{n+1}{n}` : R`\left(\frac{n+1}{n}\right)^{${k}}`;
  const down = k === 1 ? R`\frac{n}{n+1}` : R`\left(\frac{n}{n+1}\right)^{${k}}`;
  return [
    { tex: R`\frac{${nk}}{${c}^{n}}`, la: (n) => k * Math.log(n) - n * Math.log(c), L: frac(1, c), c, work: R`\frac{${n1k}}{${c}^{n+1}} \cdot \frac{${c}^{n}}{${nk}} = \frac{1}{${c}} \cdot ${up}`, lim: R`\(${up} \to 1\)` },
    { tex: R`\frac{${c}^{n}}{${nk}}`, la: (n) => n * Math.log(c) - k * Math.log(n), L: frac(c), c, work: R`\frac{${c}^{n+1}}{${n1k}} \cdot \frac{${nk}}{${c}^{n}} = ${c} \cdot ${down}`, lim: R`\(${down} \to 1\)` },
    { tex: R`\frac{${c}^{n}}{n!}`, la: (n) => n * Math.log(c) - logFact(n), L: frac(0), c, work: R`\frac{${c}^{n+1}}{(n+1)!} \cdot \frac{n!}{${c}^{n}} = \frac{${c}}{n+1}`, lim: R`\(\dfrac{${c}}{n+1} \to 0\)` },
    { tex: R`\frac{n!}{${c}^{n}}`, la: (n) => logFact(n) - n * Math.log(c), L: Infinity, c, work: R`\frac{(n+1)!}{${c}^{n+1}} \cdot \frac{${c}^{n}}{n!} = \frac{n+1}{${c}}`, lim: R`\(\dfrac{n+1}{${c}} \to \infty\)` },
    { tex: R`n\left(${r}\right)^{n}`, la: (n) => Math.log(n) + n * Math.log(p / s), L: frac(p, s), c: s, work: R`\frac{(n+1)\left(${r}\right)^{n+1}}{n\left(${r}\right)^{n}} = ${r} \cdot \frac{n+1}{n}`, lim: R`\(\dfrac{n+1}{n} \to 1\)` },
    { tex: R`\frac{(-1)^{n}\,n}{${c}^{n}}`, la: (n) => Math.log(n) - n * Math.log(c), L: frac(1, c), c, work: R`\frac{n+1}{${c}^{n+1}} \cdot \frac{${c}^{n}}{n} = \frac{1}{${c}} \cdot \frac{n+1}{n}`, lim: R`\(\dfrac{n+1}{n} \to 1\)` },
  ];
}

// Positive terms that behave like L/n^e: tex, f, the power e (a Frac), the limit L of a_n·n^e, the leading behaviour,
// and `slip`, the power a student gets by ignoring the numerator (or, with root: true, the square root).
function comparisonBank(rng) {
  const a = rng.int(1, 9);
  const b = rng.int(1, 9);
  const c = rng.int(1, 5);
  const d = rng.int(1, 9);
  const k = rng.int(2, 4);
  const j = rng.int(1, 3);
  const [sq, root] = rng.pick([[1, 1], [4, 2], [9, 3]]);
  const m = rng.int(3, 6);
  const P = (lead, e) => terms([[lead, power('n', e)], [d, '']]); // lead·n^e + d
  const A = a === 1 ? '' : a;
  return [
    { tex: R`\frac{${linear(a, b, 'n')}}{${P(c, k)}}`, f: (n) => (a * n + b) / (c * n ** k + d), e: frac(k - 1), L: frac(a, c), slip: frac(k), like: R`\frac{${A}n}{${c === 1 ? '' : c}n^{${k}}}` },
    { tex: R`\frac{${a}}{${P(c, j)}}`, f: (n) => a / (c * n ** j + d), e: frac(j), L: frac(a, c), like: R`\frac{${a}}{${c === 1 ? '' : c}${power('n', j)}}` },
    { tex: R`\frac{${A}\sqrt{n}}{${P(c, 2)}}`, f: (n) => (a * Math.sqrt(n)) / (c * n * n + d), e: frac(3, 2), L: frac(a, c), slip: frac(2), like: R`\frac{${A}n^{1/2}}{${c === 1 ? '' : c}n^{2}}` },
    { tex: R`\frac{${a}}{\sqrt{${P(sq, k)}}}`, f: (n) => a / Math.sqrt(sq * n ** k + d), e: frac(k, 2), L: frac(a, root), slip: frac(k), root: true, like: R`\frac{${a}}{\sqrt{${sq === 1 ? '' : sq}n^{${k}}}}` },
    { tex: R`\frac{${linear(a, b, 'n')}}{\sqrt{${P(sq, m)}}}`, f: (n) => (a * n + b) / Math.sqrt(sq * n ** m + d), e: frac(m - 2, 2), L: frac(a, root), slip: frac(m, 2), like: R`\frac{${A}n}{\sqrt{${sq === 1 ? '' : sq}n^{${m}}}}` },
  ];
}
const pShow = (e) => (e.isInt() ? `${e.n}` : R`\frac{${e.n}}{${e.d}}`);
const bTex = (e) => (e.eq(1) ? R`\frac{1}{n}` : e.eq(frac(1, 2)) ? R`\frac{1}{\sqrt{n}}` : R`\frac{1}{n^{${e.isInt() ? e.n : `${e.n}/${e.d}`}}}`);

// ───────────── Easy ─────────────

function easyRatioLimit(rng) {
  const k = rng.int(1, 3);
  const nk = power('n', k);
  const it = rng.pick([...ratioBank(rng), { tex: R`\frac{1}{${nk}}`, la: (n) => -k * Math.log(n), L: frac(1), c: k + 1, work: k === 1 ? R`\frac{n}{n+1}` : R`\left(\frac{n}{n+1}\right)^{${k}}`, lim: R`this approaches 1` }]);
  const { L, c } = it;
  const flip = 'That is the limit of the reciprocal. The ratio is the next term divided by the current term.';
  const INF = R`\(L = \infty\)`;
  const wrongs =
    L === Infinity
      ? [{ k: N(0), why: flip }, N(frac(1, c)), N(1), N(c)]
      : L.n === 0
        ? [{ k: INF, why: flip }, { k: N(c), why: R`\((n+1)! = (n+1) \cdot n!\), so a factor \(n + 1\) is left in the denominator.` }, N(1), N(frac(1, c))]
        : L.eq(1)
          ? [{ k: N(0), why: 'The terms approach 0, but the ratio of consecutive terms approaches 1.' }, INF, N(c), N(frac(1, c))]
          : [{ k: N(L.inv()), why: flip }, { k: N(1), why: R`The powers of \(n\) give a factor that approaches 1, but the constant factor stays.` }, N(0), INF];
  return q({
    prompt: R`For the series \(${sig(it.tex)}\), find \(L = \displaystyle\lim_{n\to\infty} \left|\frac{a_{n+1}}{a_n}\right|\).`,
    ...exactChoices(L === Infinity ? INF : N(L), wrongs, (tex) => R`\(L = ${tex}\)`),
    solution: [
      R`Divide the next term by the current one: \(\left|\dfrac{a_{n+1}}{a_n}\right| = ${it.work}\).`,
      R`As \(n \to \infty\), ${it.lim}, so \(L = ${L === Infinity ? '\\infty' : L.tex()}\).`,
      ...(L !== Infinity && L.eq(1) ? ['With L = 1 the ratio test gives no conclusion. This always happens for p-series and other quotients of powers of n.'] : []),
    ],
    rule: 4,
    skill: 'limit of the ratio',
    check: () => ratioIs(it.la, L === Infinity ? Infinity : L.value),
  });
}

function easyAlternatingTest(rng) {
  const c = rng.int(1, 9);
  const a = rng.int(1, 9);
  const ask = (tex) => R`Let \(b_n = ${tex}\). Which statement about the alternating series \(${sig(R`(-1)^{n+1}\,b_n`)}\) is correct?`;
  if (rng.bool(0.6)) {
    const it = rng.pick([
      { tex: R`\dfrac{${c}}{n}`, b: (n) => c / n },
      { tex: R`\dfrac{${c}}{\sqrt{n}}`, b: (n) => c / Math.sqrt(n) },
      { tex: R`\dfrac{${c}}{n + ${a}}`, b: (n) => c / (n + a) },
      { tex: R`\dfrac{${c}}{2n - 1}`, b: (n) => c / (2 * n - 1) },
      { tex: R`\dfrac{${c}}{\sqrt[3]{n}}`, b: (n) => c / Math.cbrt(n) },
      { tex: R`\dfrac{${c}}{\sqrt{n + ${a}}}`, b: (n) => c / Math.sqrt(n + a) },
      { tex: R`\dfrac{1}{\ln(n + 1)}`, b: (n) => 1 / Math.log(n + 1) },
    ]);
    return q({
      prompt: ask(it.tex),
      correct: R`It converges by the alternating series test: \(b_n\) is positive, decreasing, and \(b_n \to 0\)`,
      wrong: [
        { value: R`It diverges, because \(\sum b_n\) diverges`, why: R`\(\sum b_n\) does diverge, but that only rules out absolute convergence. With alternating signs the partial sums settle down.` },
        { value: R`It diverges by the nth-term test, because \(b_n\) does not approach 0`, why: R`Here \(b_n \to 0\), so the nth-term test says nothing.` },
        { value: R`The alternating series test fails, because \(b_n\) is not decreasing`, why: R`The denominator grows with \(n\), so \(b_n\) gets smaller at every step.` },
      ],
      solution: [R`The alternating series test needs three things: \(b_n > 0\), \(b_n\) decreasing, and \(b_n \to 0\).`, R`Here the denominator of \(b_n\) is positive and keeps growing without bound, so all three hold.`, R`The series converges. Since \(\sum b_n\) itself diverges, the convergence is only conditional.`],
      rule: 3,
      skill: 'alternating series test',
      check: () => (decreasesToZero(it.b, 1) && !powerConverges(it.b) ? true : 'b_n should decrease to 0 while Σ b_n diverges'),
    });
  }
  const top = rng.int(1, 6);
  const bot = rng.intExcept(1, 7, [top]);
  const L = frac(top, bot);
  return q({
    prompt: ask(R`\dfrac{${linear(top, a, 'n')}}{${linear(bot, c, 'n')}}`),
    correct: R`It diverges by the nth-term test: \(b_n \to ${L.tex()}\), so the terms do not approach 0`,
    wrong: [
      { value: 'It converges by the alternating series test, because the signs alternate', why: R`Alternating signs are not enough. The test also needs \(b_n \to 0\), and here \(b_n \to ${L.tex()}\).` },
      { value: R`It converges to \(${L.tex()}\), because \(b_n \to ${L.tex()}\)`, why: R`\(${L.tex()}\) is the limit of the sizes of the terms. It is not a sum.` },
      { value: R`It converges conditionally, because \(\sum b_n\) diverges`, why: R`\(\sum b_n\) does diverge, but the alternating series diverges as well: its terms do not approach 0.` },
    ],
    solution: [R`The degrees are equal, so \(b_n \to ${L.tex()}\), not 0.`, R`The terms \((-1)^{n+1} b_n\) therefore keep jumping between values near \(${L.tex()}\) and \(${L.neg().tex()}\). They do not approach 0.`, R`By the nth-term test the series diverges. The alternating series test cannot be used, because it needs \(b_n \to 0\).`],
    rule: 3,
    skill: 'alternating series test',
    check: () => (Math.abs((top * 1e12 + a) / (bot * 1e12 + c) - L.value) < 1e-6 ? true : 'b_n does not approach the stated limit'),
  });
}

function easyPickComparison(rng) {
  const it = rng.pick(comparisonBank(rng));
  const show = (e) => R`\(\displaystyle\sum ${bTex(e)}\)`;
  const lower = (e) => (e.gt(0) ? e : null);
  const others = [it.e.add(1), lower(it.e.sub(1)), it.e.add(frac(1, 2)), lower(it.e.sub(frac(1, 2))), it.e.mul(2), it.e.add(frac(3, 2)), it.e.add(2)].filter((e) => e && !e.eq(it.e) && !(it.slip && e.eq(it.slip)));
  const slipWhy = it.root ? R`The square root halves the power of \(n\) in the denominator.` : R`Take the numerator into account as well: subtract its power of \(n\) from the power in the denominator.`;
  const conv = it.e.gt(1);
  return q({
    prompt: R`The limit comparison test is to be used on \(${sig(it.tex)}\). Which series \(\sum b_n\) makes \(\displaystyle\lim_{n\to\infty} \frac{a_n}{b_n}\) a finite positive number?`,
    correct: show(it.e),
    wrong: [it.slip ? { value: show(it.slip), why: slipWhy } : null, ...others.map(show)],
    solution: [
      R`For large \(n\) only the highest powers matter: \(a_n\) behaves like \(${it.like}\), a constant times \(${bTex(it.e)}\).`,
      R`With \(b_n = ${bTex(it.e)}\), \(\displaystyle\lim_{n\to\infty} \frac{a_n}{b_n} = ${it.L.tex()}\), which is finite and positive. Any other power of \(n\) gives 0 or \(\infty\).`,
      R`(Since \(\sum b_n\) is a p-series with \(p = ${pShow(it.e)}\), both series ${conv ? 'converge' : 'diverge'}.)`,
    ],
    rule: 2,
    skill: 'choosing a comparison series',
    check: () => {
      const g = (n) => it.f(n) * n ** it.e.value;
      return close(g(1e8), it.L.value, 1e-4) && close(g(1e6), g(1e8), 1e-3) ? true : `a_n·n^e does not approach ${it.L.value}`;
    },
  });
}

// ───────────── Medium ─────────────

function mediumRatioTest(rng) {
  const c = rng.pick([1, 2, 3, 5, 6, 7]);
  const a = rng.int(1, 6);
  const a2 = rng.intExcept(1, 6, [a]);
  const b = rng.int(1, 9);
  const d = rng.int(1, 9);
  const inside = R`\frac{${linear(a, b, 'n')}}{${linear(a2, d, 'n')}}`;
  const it = rng.pick([
    ...ratioBank(rng),
    { tex: R`\frac{${c === 1 ? '' : `${c}^{n}\\,`}(n!)^{2}}{(2n)!}`, la: (n) => n * Math.log(c) + 2 * logFact(n) - logFact(2 * n), L: frac(c, 4), c: 4, work: R`${c === 1 ? '' : `${c} \\cdot `}\frac{(n+1)!\,(n+1)!}{(2n+2)!} \cdot \frac{(2n)!}{n!\,n!} = ${c === 1 ? '' : `${c} \\cdot `}\frac{(n+1)^{2}}{(2n+2)(2n+1)}`, lim: R`\(\dfrac{(n+1)^{2}}{(2n+2)(2n+1)} \to \dfrac{1}{4}\)` },
    { root: true, tex: R`\left(${inside}\right)^{n}`, la: (n) => n * Math.log((a * n + b) / (a2 * n + d)), L: frac(a, a2), c: a2, work: inside, lim: R`the degrees are equal` },
  ]);
  const { L } = it;
  const say = (v) => (v === Infinity ? R`Diverges: \(L = \infty\)` : v.eq(1) ? R`Inconclusive: \(L = 1\)` : v.lt(1) ? R`Converges: \(L = ${v.tex()} < 1\)` : R`Diverges: \(L = ${v.tex()} > 1\)`);
  const flip = it.root ? R`The base is \(${inside}\). Divide the leading coefficients the right way up.` : 'That uses the reciprocal. The ratio is the next term divided by the current term.';
  const one = { value: say(frac(1)), why: /\\to 1/.test(it.lim) ? R`Part of the expression does approach 1, but a constant factor is left over.` : 'Work out the limit again. For this series it is not 1.' };
  const wrong =
    L === Infinity
      ? [{ value: say(frac(0)), why: flip }, one, say(frac(1, it.c)), say(frac(it.c))]
      : L.n === 0
        ? [{ value: say(Infinity), why: flip }, { value: say(frac(it.c)), why: R`\((n+1)! = (n+1) \cdot n!\), so a factor \(n + 1\) is left in the denominator.` }, one, say(frac(1, it.c))]
        : [{ value: say(L.inv()), why: flip }, one, say(frac(0)), say(Infinity)];
  const conv = L !== Infinity && L.lt(1);
  return q({
    prompt: R`Use the ${it.root ? 'root' : 'ratio'} test on \(${sig(it.tex)}\), where \(L = \displaystyle\lim_{n\to\infty} ${it.root ? R`\sqrt[n]{|a_n|}` : R`\left|\frac{a_{n+1}}{a_n}\right|`}\). Which statement is correct?`,
    correct: say(L),
    wrong,
    solution: [
      it.root ? R`Take the \(n\)th root: \(\sqrt[n]{|a_n|} = ${it.work}\).` : R`Divide the next term by the current one: \(\left|\dfrac{a_{n+1}}{a_n}\right| = ${it.work}\).`,
      R`As \(n \to \infty\), ${it.lim}, so \(L = ${L === Infinity ? '\\infty' : L.tex()}\).`,
      conv ? R`\(L < 1\), so the series converges (absolutely).` : R`\(L > 1\), so the terms grow and the series diverges.`,
    ],
    rule: 4,
    skill: it.root ? 'root test' : 'ratio test',
    check: () => (it.root ? checkEqual(Math.exp(it.la(1e7) / 1e7), L.value, 1e-4, 'nth root') : ratioIs(it.la, L === Infinity ? Infinity : L.value)),
  });
}

function mediumLimitComparison(rng) {
  const it = rng.pick(comparisonBank(rng));
  const conv = it.e.gt(1);
  const say = (L, yes) => R`\(L = ${L}\), and the series ${yes ? 'converges' : 'diverges'}`;
  return q({
    prompt: R`The limit comparison test is used on \(${sig('a_n')}\) with \(a_n = ${it.tex}\) and \(b_n = ${bTex(it.e)}\). Find \(L = \displaystyle\lim_{n\to\infty} \frac{a_n}{b_n}\) and decide what follows.`,
    correct: say(it.L.tex(), conv),
    wrong: [
      { value: say(it.L.tex(), !conv), why: R`\(\sum b_n\) is a p-series with \(p = ${pShow(it.e)}\), so it ${conv ? 'converges' : 'diverges'}. A finite positive \(L\) means that \(\sum a_n\) does the same.` },
      { value: say(0, true), why: R`\(a_n \to 0\), but the test uses the ratio \(\dfrac{a_n}{b_n}\), which approaches \(${it.L.tex()}\).` },
      it.L.eq(1) ? null : say(it.L.inv().tex(), conv),
      say(R`\infty`, false),
      say(it.L.add(1).tex(), conv),
    ],
    solution: [
      R`\(\dfrac{a_n}{b_n} = a_n \cdot ${it.e.eq(1) ? 'n' : it.e.eq(frac(1, 2)) ? R`\sqrt{n}` : `n^{${it.e.isInt() ? it.e.n : `${it.e.n}/${it.e.d}`}}`}\). For large \(n\), \(a_n\) behaves like \(${it.like}\), so the ratio approaches \(L = ${it.L.tex()}\).`,
      R`\(L\) is finite and positive, so \(\sum a_n\) and \(\sum b_n\) either both converge or both diverge.`,
      R`\(\sum b_n\) is a p-series with \(p = ${pShow(it.e)}${conv ? ' > 1' : it.e.eq(1) ? '' : ' < 1'}\), so it ${conv ? 'converges' : 'diverges'}. Therefore \(\sum a_n\) ${conv ? 'converges' : 'diverges'}.`,
    ],
    rule: 2,
    skill: 'limit comparison test',
    check: () => first(checkEqual(it.f(1e8) * 1e8 ** it.e.value, it.L.value, 1e-4, 'limit of a_n/b_n'), powerConverges(it.f) === conv ? true : 'condensation test disagrees with the verdict'),
  });
}

function mediumAlternatingError(rng) {
  const c = rng.int(1, 9);
  const p = rng.int(1, 3);
  const pow = { den: power('n', p), at: (n) => power(`${n}`, p), b: (n) => frac(c, n ** p), bn: (n) => c / n ** p, far: 20000 };
  const it = rng.pick([
    pow,
    pow,
    { den: '2n - 1', at: (n) => `2(${n}) - 1`, b: (n) => frac(c, 2 * n - 1), bn: (n) => c / (2 * n - 1), far: 20000 },
    { den: 'n^{2} + 1', at: (n) => `${n}^{2} + 1`, b: (n) => frac(c, n * n + 1), bn: (n) => c / (n * n + 1), far: 20000 },
    { den: 'n!', at: (n) => `${n}!`, b: (n) => frac(c, factorial(n)), bn: (n) => c / factorial(n), far: 40, fact: true },
  ]);
  const count = it.fact ? rng.int(3, 6) : rng.int(3, 9);
  const term = (n) => (n % 2 ? 1 : -1) * it.bn(n);
  const bound = it.b(count + 1);
  return q({
    prompt: R`The series \(S = ${sig(R`(-1)^{n+1}\,\frac{${c}}{${it.den}}`)}\) converges by the alternating series test. If \(S\) is approximated by the partial sum \(S_{${count}}\), what does the alternating series error bound guarantee?`,
    ...exactChoices(
      N(bound),
      [
        { k: N(it.b(count)), why: R`The bound is the first term that is left out, \(b_{${count + 1}}\), not the last term that is used.` },
        { k: N(it.b(count + 2)), why: R`\(S_{${count}}\) uses the terms up to \(n = ${count}\), so the first term left out has \(n = ${count + 1}\).` },
        N(bound.div(2)),
        N(bound.mul(2)),
        N(it.b(2 * count)),
      ],
      (tex) => R`\(|S - S_{${count}}| \le ${tex}\)`,
    ),
    solution: [
      R`For a convergent alternating series whose terms decrease in size, the error is at most the first term left out: \(|S - S_N| \le b_{N+1}\).`,
      R`\(S_{${count}}\) uses \(n = 1\) to \(${count}\), so the first term left out is \(b_{${count + 1}} = \frac{${c}}{${it.at(count + 1)}}${bound.tex() === R`\frac{${c}}{${it.at(count + 1)}}` ? '' : ` = ${bound.tex()}`}\).`,
      R`So \(|S - S_{${count}}| \le ${bound.tex()}\).`,
    ],
    rule: 3,
    skill: 'alternating series error bound',
    check: () => {
      const S = (partialSum(term, 1, it.far) + partialSum(term, 1, it.far + 1)) / 2; // the average of two neighbours is very close to the sum
      const err = Math.abs(S - partialSum(term, 1, count));
      return first(checkEqual(bound.value, it.bn(count + 1), 1e-12, 'first omitted term'), err <= bound.value + 1e-9 && err >= bound.value - it.bn(count + 2) - 1e-9 ? true : `actual error ${err} does not fit the bound ${bound.value}`);
    },
  });
}

// ───────────── Hard ─────────────

function hardIntegralTest(rng) {
  const c = rng.int(1, 6);
  const C = c === 1 ? '' : `${c}`;
  const ln2 = Math.log(2);
  // f and F are written for c = 1; a positive constant factor does not change convergence.
  const it = rng.pick([
    { tex: `${C}ne^{-n^{2}}`, fx: `${C}xe^{-x^{2}}`, from: 1, f: (x) => x * Math.exp(-x * x), F: (x) => -Math.exp(-x * x) / 2, Finf: 0, anti: terms([[frac(-c, 2), 'e^{-x^{2}}']]), V: { tex: c % 2 ? R`\dfrac{${c}}{2e}` : R`\dfrac{${c / 2}}{e}`, value: c / (2 * Math.E) } },
    { tex: R`\frac{${c}}{n^{2} + 1}`, fx: R`\frac{${c}}{x^{2} + 1}`, from: 1, f: (x) => 1 / (x * x + 1), F: (x) => Math.atan(x), Finf: Math.PI / 2, anti: R`${C}\arctan x`, V: { tex: piTex(frac(c, 4)), value: (c * Math.PI) / 4 } },
    { tex: R`\frac{${c}}{n(\ln n)^{2}}`, fx: R`\frac{${c}}{x(\ln x)^{2}}`, from: 2, f: (x) => 1 / (x * Math.log(x) ** 2), F: (x) => -1 / Math.log(x), Finf: 0, anti: R`-\frac{${c}}{\ln x}`, V: { tex: R`\dfrac{${c}}{\ln 2}`, value: c / ln2 } },
    { tex: R`\frac{${C}n}{(n^{2} + 1)^{2}}`, fx: R`\frac{${C}x}{(x^{2} + 1)^{2}}`, from: 1, f: (x) => x / (x * x + 1) ** 2, F: (x) => -1 / (2 * (x * x + 1)), Finf: 0, anti: c % 2 ? R`-\frac{${c}}{2(x^{2} + 1)}` : R`-\frac{${c / 2}}{x^{2} + 1}`, V: N(frac(c, 4)) },
    { tex: R`\frac{${C}e^{1/n}}{n^{2}}`, fx: R`\frac{${C}e^{1/x}}{x^{2}}`, from: 1, f: (x) => Math.exp(1 / x) / (x * x), F: (x) => -Math.exp(1 / x), Finf: -1, anti: `-${C}e^{1/x}`, V: { tex: c === 1 ? 'e - 1' : `${c}(e - 1)`, value: c * (Math.E - 1) } },
    { tex: R`\frac{${C}n}{n^{2} + 1}`, fx: R`\frac{${C}x}{x^{2} + 1}`, from: 1, f: (x) => x / (x * x + 1), F: (x) => Math.log(x * x + 1) / 2, anti: terms([[frac(c, 2), R`\ln(x^{2} + 1)`]]) },
    { tex: R`\frac{${c}}{n\ln n}`, fx: R`\frac{${c}}{x\ln x}`, from: 2, f: (x) => 1 / (x * Math.log(x)), F: (x) => Math.log(Math.log(x)), anti: R`${C}\ln(\ln x)` },
    { tex: R`\frac{${C}\ln n}{n}`, fx: R`\frac{${C}\ln x}{x}`, from: 3, f: (x) => Math.log(x) / x, F: (x) => Math.log(x) ** 2 / 2, anti: terms([[frac(c, 2), R`(\ln x)^{2}`]]) },
  ]);
  const { from } = it;
  const applies = R`\(f(x) = ${it.fx}\) is positive, continuous and decreasing for \(x \ge ${from}\), so the integral test applies.`;
  const prompt = R`The integral test is applied to \(${sig(it.tex, from)}\), using \(f(x) = ${it.fx}\) on \([${from}, \infty)\). Which statement is correct?`;
  const pts = [from + 0.37, from + 1.3, from + 2.9, from + 5.1];
  if (!it.V) {
    return q({
      prompt,
      correct: 'The integral diverges, so the series diverges',
      wrong: [
        { value: R`The integral converges, because \(f(x) \to 0\), so the series converges`, why: R`\(f(x) \to 0\) is not enough: the area under the curve still grows without bound, as it does for \(\frac{1}{x}\).` },
        { value: 'The integral diverges, but the series converges, because its terms approach 0', why: 'The integral test works in both directions: the series and the integral either both converge or both diverge.' },
        { value: R`The integral test gives no conclusion, because \(f(x) \to 0\)`, why: 'That describes the nth-term test. The integral test always gives a conclusion once the integral has been evaluated.' },
      ],
      solution: [applies, R`\(\displaystyle\int_{${from}}^{b} ${it.fx}\,dx = \Big[${it.anti}\Big]_{${from}}^{b}\), which grows without bound as \(b \to \infty\).`, 'The integral diverges, so the series diverges as well.'],
      rule: 0,
      skill: 'integral test',
      check: () => first(checkDeriv(it.F, it.f, pts), farGrowth(it.f) > 1 ? true : 'the integral does not keep growing'),
    });
  }
  const V = it.V.tex;
  return q({
    prompt,
    correct: R`The integral equals \(${V}\), so the series converges`,
    wrong: [
      { value: R`The integral equals \(${V}\), so the series converges to \(${V}\)`, why: 'The integral test only decides convergence. The sum of the series is a different number from the value of the integral.' },
      { value: 'The integral diverges, so the series diverges', why: 'Evaluate the limit again: the antiderivative approaches a finite value as x grows.' },
      { value: R`The integral equals \(${V}\), which is not 0, so the series diverges`, why: 'That mixes up two tests. The nth-term test looks at the limit of the terms. In the integral test, a finite integral means convergence.' },
    ],
    solution: [applies, R`\(\displaystyle\int_{${from}}^{\infty} ${it.fx}\,dx = \lim_{b\to\infty}\Big[${it.anti}\Big]_{${from}}^{b} = ${V}\).`, R`The integral is finite, so the series converges. The test does not give its sum, which is not \(${V}\).`],
    rule: 0,
    skill: 'integral test',
    check: () => {
      const series = c * (partialSum(it.f, from, 3000) + it.Finf - it.F(3000.5)); // 3000 terms, then the tail by the midpoint rule
      return first(
        checkDeriv(it.F, it.f, pts),
        Math.abs(it.F(1e300) - it.Finf) < 2e-3 ? true : 'wrong limit of the antiderivative',
        checkEqual(c * (it.Finf - it.F(from)), it.V.value, 1e-9, 'value of the integral'),
        farGrowth(it.f) < 0.1 ? true : 'the integral keeps growing',
        Math.abs(series - it.V.value) > 1e-3 ? true : 'the sum equals the integral, so a "wrong" choice would be right',
      );
    },
  });
}

function hardAbsoluteConditional(rng) {
  const c = rng.int(1, 9);
  const a = rng.int(1, 9);
  const k = rng.int(2, 3);
  const g = rng.int(2, 5);
  const top = rng.int(1, 6);
  const bot = rng.intExcept(1, 7, [top]);
  const s = '(-1)^{n}';
  const sc = c === 1 ? s : `${c}${s}`; // c·(-1)^n
  const pS = (pT, yes) => R`\(\sum |a_n| = \sum ${pT}\) is a ${yes ? 'convergent' : 'divergent'} p-series`;
  const ast = R`The sizes \(b_n = |a_n|\) decrease to 0, so \(\sum a_n\) converges by the alternating series test.`;
  const it = rng.pick([
    { tex: R`\frac{${sc}}{n^{${k}}}`, b: (n) => c / n ** k, alt: true, cls: 'abs', why: R`${pS(R`\frac{${c}}{n^{${k}}}`, true)} (\(p = ${k} > 1\)).` },
    { tex: R`\frac{${sc}}{n\sqrt{n}}`, b: (n) => c / n ** 1.5, alt: true, cls: 'abs', why: R`${pS(R`\frac{${c}}{n^{3/2}}`, true)} (\(p = \frac{3}{2} > 1\)).` },
    { tex: R`\frac{${sc}}{n^{2} + ${a}}`, b: (n) => c / (n * n + a), alt: true, cls: 'abs', why: R`\(|a_n| \le \frac{${c}}{n^{2}}\), and \(\sum \frac{${c}}{n^{2}}\) converges, so \(\sum |a_n|\) converges by direct comparison.` },
    { tex: R`\frac{${s}\,n^{${k}}}{${g}^{n}}`, la: (n) => k * Math.log(n) - n * Math.log(g), cls: 'abs', why: R`The ratio test on \(\sum |a_n|\) gives \(L = \frac{1}{${g}} < 1\), so \(\sum |a_n|\) converges.` },
    { tex: R`\frac{(-${g})^{n}}{n!}`, la: (n) => n * Math.log(g) - logFact(n), cls: 'abs', why: R`The ratio test on \(\sum |a_n|\) gives \(L = \lim \frac{${g}}{n+1} = 0 < 1\), so \(\sum |a_n|\) converges.` },
    { tex: R`\frac{\cos(n\pi)}{n^{2}}`, b: (n) => 1 / (n * n), alt: true, cls: 'abs', why: R`\(\cos(n\pi) = (-1)^{n}\), so ${pS(R`\frac{1}{n^{2}}`, true)} (\(p = 2 > 1\)).` },
    { tex: R`\frac{${sc}}{n}`, b: (n) => c / n, alt: true, cls: 'cond', why: R`${pS(R`\frac{${c}}{n}`, false)} (\(p = 1\)). ${ast}` },
    { tex: R`\frac{${sc}}{\sqrt{n}}`, b: (n) => c / Math.sqrt(n), alt: true, cls: 'cond', why: R`${pS(R`\frac{${c}}{\sqrt{n}}`, false)} (\(p = \frac{1}{2} \le 1\)). ${ast}` },
    { tex: R`\frac{${sc}}{n + ${a}}`, b: (n) => c / (n + a), alt: true, cls: 'cond', why: R`\(\sum |a_n| = \sum \frac{${c}}{n + ${a}}\) diverges (limit comparison with the harmonic series). ${ast}` },
    { tex: R`\frac{${s}\,n}{n^{2} + 1}`, b: (n) => n / (n * n + 1), alt: true, cls: 'cond', why: R`\(\sum |a_n| = \sum \frac{n}{n^{2} + 1}\) diverges (limit comparison with the harmonic series). ${ast}` },
    { tex: R`\frac{${s}}{\ln(n + 1)}`, b: (n) => 1 / Math.log(n + 1), alt: true, cls: 'cond', why: R`\(\frac{1}{\ln(n + 1)} > \frac{1}{n + 1}\), so \(\sum |a_n|\) diverges by direct comparison. ${ast}` },
    { tex: R`\frac{\cos(n\pi)}{\sqrt{n}}`, b: (n) => 1 / Math.sqrt(n), alt: true, cls: 'cond', why: R`\(\cos(n\pi) = (-1)^{n}\), so ${pS(R`\frac{1}{\sqrt{n}}`, false)} (\(p = \frac{1}{2} \le 1\)). ${ast}` },
    { tex: R`\frac{${s}(${linear(top, a, 'n')})}{${linear(bot, c, 'n')}}`, b: (n) => (top * n + a) / (bot * n + c), alt: true, cls: 'div', why: R`\(|a_n| \to ${frac(top, bot).tex()} \ne 0\), so the terms do not approach 0. By the nth-term test \(\sum a_n\) diverges, and so does \(\sum |a_n|\).` },
    { tex: R`\frac{${s}\,${g}^{n}}{n^{${k}}}`, la: (n) => n * Math.log(g) - k * Math.log(n), cls: 'div', why: R`The ratio test gives \(L = ${g} > 1\): the terms grow without bound, so \(\sum a_n\) and \(\sum |a_n|\) both diverge.` },
  ]);
  const text = {
    abs: R`\(\sum a_n\) and \(\sum |a_n|\) both converge (absolute convergence)`,
    cond: R`\(\sum a_n\) converges, but \(\sum |a_n|\) diverges (conditional convergence)`,
    never: R`\(\sum a_n\) diverges, but \(\sum |a_n|\) converges`,
    div: R`\(\sum a_n\) and \(\sum |a_n|\) both diverge`,
  };
  const note = {
    abs: it.cls === 'cond' ? R`Check \(\sum |a_n|\) on its own: it diverges here.` : R`The terms do not approach 0, so neither series can converge.`,
    cond: it.cls === 'abs' ? R`Check \(\sum |a_n|\) on its own: it converges here, which is the stronger statement.` : R`The alternating series test needs \(|a_n| \to 0\). Here the terms do not approach 0.`,
    never: R`This can never happen: if \(\sum |a_n|\) converges, then \(\sum a_n\) converges too.`,
    div: it.cls === 'abs' ? R`\(\sum |a_n|\) converges here, and absolute convergence implies convergence.` : R`\(\sum |a_n|\) does diverge, but that does not make \(\sum a_n\) diverge: the alternating signs let it converge.`,
  };
  return q({
    prompt: R`Let \(a_n = ${it.tex}\). Which statement describes \(${sig('a_n')}\)?`,
    correct: text[it.cls],
    wrong: ['abs', 'cond', 'div', 'never'].filter((key) => key !== it.cls).map((key) => ({ value: text[key], why: note[key] })),
    solution: [R`Look at the series of absolute values first. ${it.why}`, it.cls === 'abs' ? 'Absolute convergence implies convergence, so the series itself converges too.' : it.cls === 'cond' ? 'The series converges, but not absolutely: it converges conditionally.' : 'Both series diverge.'],
    rule: 5,
    skill: 'absolute or conditional convergence',
    check: () => agrees(it, it.cls),
  });
}

function hardDirectComparison(rng) {
  const a = rng.int(2, 9);
  const p = rng.int(2, 3);
  const c = rng.int(2, 4);
  const one = R`\dfrac{1}{n}`;
  const sq = R`\dfrac{1}{n^{2}}`;
  const np = R`\dfrac{1}{n^{${p}}}`;
  const geo = R`\dfrac{1}{${c}^{n}}`;
  const it = rng.pick([
    { tex: R`\dfrac{\sin^{2} n}{n^{${p}}}`, from: 1, g: np, conv: true, f: (n) => Math.sin(n) ** 2 / n ** p, gf: (n) => n ** -p, because: R`\(0 \le \sin^{2} n \le 1\)` },
    { tex: R`\dfrac{1}{n^{${p}} + ${a}}`, from: 1, g: np, conv: true, f: (n) => 1 / (n ** p + a), gf: (n) => n ** -p, because: 'a larger denominator makes a smaller fraction' },
    { tex: R`\dfrac{n}{n^{3} + ${a}}`, from: 1, g: sq, conv: true, f: (n) => n / (n ** 3 + a), gf: (n) => n ** -2, because: R`\(\dfrac{n}{n^{3} + ${a}} < \dfrac{n}{n^{3}}\)` },
    { tex: R`\dfrac{1}{n \cdot ${c}^{n}}`, from: 1, g: geo, conv: true, f: (n) => 1 / (n * c ** n), gf: (n) => c ** -n, geo: true, because: R`\(n \ge 1\)` },
    { tex: R`\dfrac{1}{${c}^{n} + n}`, from: 1, g: geo, conv: true, f: (n) => 1 / (c ** n + n), gf: (n) => c ** -n, geo: true, because: 'a larger denominator makes a smaller fraction' },
    { tex: R`\dfrac{${a} + \cos n}{n}`, from: 1, g: one, conv: false, f: (n) => (a + Math.cos(n)) / n, gf: (n) => 1 / n, because: R`\(${a} + \cos n \ge ${a - 1} \ge 1\)` },
    { tex: R`\dfrac{n + ${a}}{n^{2}}`, from: 1, g: one, conv: false, f: (n) => (n + a) / (n * n), gf: (n) => 1 / n, because: R`\(\dfrac{n + ${a}}{n^{2}} = \dfrac{1}{n} + \dfrac{${a}}{n^{2}}\)` },
    { tex: R`\dfrac{\ln n}{n}`, from: 3, g: one, conv: false, f: (n) => Math.log(n) / n, gf: (n) => 1 / n, because: R`\(\ln n > 1\) for \(n \ge 3\)` },
    { tex: R`\dfrac{1}{\sqrt{n} - ${frac(1, a).tex()}}`, from: 1, g: R`\dfrac{1}{\sqrt{n}}`, conv: false, f: (n) => 1 / (Math.sqrt(n) - 1 / a), gf: (n) => 1 / Math.sqrt(n), because: 'a smaller positive denominator makes a larger fraction' },
  ]);
  const { from } = it;
  const S = (g) => R`\(\sum ${g}\)`;
  const convSays = (g) => R`Converges: \(0 \le a_n \le ${g}\) for \(n \ge ${from}\), and ${S(g)} converges`;
  const divSays = (g) => R`Diverges: \(a_n \ge ${g} > 0\) for \(n \ge ${from}\), and ${S(g)} diverges`;
  const zero = { value: R`Converges, because \(a_n \to 0\)`, why: R`\(\frac{1}{n} \to 0\) too, yet \(\sum \frac{1}{n}\) diverges. Terms that approach 0 prove nothing on their own.` };
  return q({
    prompt: R`Let \(a_n = ${it.tex}\). Which argument correctly decides whether \(${sig('a_n', from)}\) converges?`,
    correct: it.conv ? convSays(it.g) : divSays(it.g),
    wrong: it.conv
      ? [
          { value: divSays(one), why: R`That inequality is false: here \(a_n\) is smaller than \(\frac{1}{n}\).` },
          zero,
          { value: R`Diverges: \(a_n \le ${one}\) for \(n \ge ${from}\), and ${S(one)} diverges`, why: 'Being smaller than the terms of a divergent series proves nothing.' },
        ]
      : [
          { value: convSays(sq), why: R`That inequality is false: here \(a_n\) is larger than \(\frac{1}{n^{2}}\).` },
          zero,
          { value: R`Converges: \(a_n \ge ${sq}\) for \(n \ge ${from}\), and ${S(sq)} converges`, why: 'Being larger than the terms of a convergent series proves nothing.' },
        ],
    solution: it.conv
      ? [R`Look for a simpler series with larger terms. Since ${it.because}, \(0 \le a_n \le ${it.g}\) for \(n \ge ${from}\).`, R`${S(it.g)} converges (${it.geo ? R`geometric with \(r = \frac{1}{${c}}\)` : R`a p-series with \(p > 1\)`}).`, 'A series with positive terms that stays below a convergent series also converges.']
      : [R`Look for a simpler series with smaller terms. Since ${it.because}, \(a_n \ge ${it.g} > 0\) for \(n \ge ${from}\).`, R`${S(it.g)} diverges (a p-series with \(p \le 1\)).`, 'A series whose terms stay above those of a divergent positive series also diverges.'],
    rule: 1,
    skill: 'direct comparison test',
    check: () => {
      for (let n = from; n < from + 3000; n++) {
        const [x, y] = [it.f(n), it.gf(n)];
        if (!(it.conv ? x >= 0 && x <= y + 1e-15 : x >= y - 1e-15 && y > 0)) return `the comparison fails at n = ${n}`;
      }
      const gConv = it.geo ? it.gf(11) / it.gf(10) < 1 : powerConverges(it.gf);
      return gConv === it.conv ? true : 'the comparison series does not behave as stated';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeWhichSeries(rng) {
  const a = rng.int(1, 6);
  const c = rng.int(2, 5);
  const k = rng.int(2, 3);
  const mk = (tex, cls, reason, extra) => ({ tex, cls, reason, Lt: '1', ...extra });
  const lc = (g) => R`limit comparison with \(\sum ${g}\)`;
  const pools = {
    div: [
      mk(R`\frac{1}{n + ${a}}`, 'div', lc(R`\frac{1}{n}`), { b: (n) => 1 / (n + a) }),
      mk(R`\frac{1}{\sqrt{n + ${a}}}`, 'div', lc(R`\frac{1}{\sqrt{n}}`), { b: (n) => 1 / Math.sqrt(n + a) }),
      mk(R`\frac{n}{n^{2} + ${a}}`, 'div', lc(R`\frac{1}{n}`), { b: (n) => n / (n * n + a) }),
      mk(R`\frac{1}{${c}n + 1}`, 'div', lc(R`\frac{1}{n}`), { b: (n) => 1 / (c * n + 1) }),
      mk(R`\frac{n^{2}}{n^{3} + ${a}}`, 'div', lc(R`\frac{1}{n}`), { b: (n) => (n * n) / (n ** 3 + a) }),
      mk(R`\frac{1}{\sqrt[3]{n^{2}}}`, 'div', R`a p-series with \(p = \frac{2}{3}\)`, { b: (n) => n ** (-2 / 3) }),
      mk(R`\frac{1}{n\ln n}`, 'div', R`integral test, \(\int \frac{dx}{x\ln x} = \ln(\ln x)\) is unbounded`, { log: (x) => 1 / (x * Math.log(x)) }),
      mk(R`\frac{\ln n}{n}`, 'div', R`its terms are larger than \(\frac{1}{n}\) for \(n \ge 3\)`, { log: (x) => Math.log(x) / x }),
    ],
    conv: [
      mk(R`\frac{1}{n^{2} + ${a}}`, 'abs', R`direct comparison with \(\sum \frac{1}{n^{2}}\)`, { b: (n) => 1 / (n * n + a) }),
      mk(R`\frac{1}{n\sqrt{n}}`, 'abs', R`a p-series with \(p = \frac{3}{2}\)`, { b: (n) => n ** -1.5 }),
      mk(R`\frac{n}{n^{3} + ${a}}`, 'abs', lc(R`\frac{1}{n^{2}}`), { b: (n) => n / (n ** 3 + a) }),
      mk(R`\frac{n^{2}}{n^{4} + ${a}}`, 'abs', lc(R`\frac{1}{n^{2}}`), { b: (n) => (n * n) / (n ** 4 + a) }),
      mk(R`\frac{1}{n^{${k}}}`, 'abs', R`a p-series with \(p = ${k}\)`, { b: (n) => n ** -k }),
      mk(R`\frac{1}{n(\ln n)^{2}}`, 'abs', R`integral test, \(\int \frac{dx}{x(\ln x)^{2}} = -\frac{1}{\ln x}\) has a finite limit`, { log: (x) => 1 / (x * Math.log(x) ** 2) }),
      mk(R`\frac{n^{${k}}}{${c}^{n}}`, 'abs', R`ratio test, \(L = \frac{1}{${c}}\)`, { la: (n) => k * Math.log(n) - n * Math.log(c), Lt: R`\frac{1}{${c}}` }),
      mk(R`\frac{${c}^{n}}{n!}`, 'abs', R`ratio test, \(L = 0\)`, { la: (n) => n * Math.log(c) - logFact(n), Lt: '0' }),
    ],
    fast: [
      mk(R`\frac{n!}{${c}^{n}}`, 'div', R`ratio test, \(L = \infty\)`, { la: (n) => logFact(n) - n * Math.log(c), Lt: R`\infty` }),
      mk(R`\frac{${c}^{n}}{n^{${k}}}`, 'div', R`ratio test, \(L = ${c}\)`, { la: (n) => n * Math.log(c) - k * Math.log(n), Lt: `${c}` }),
      mk(R`\left(\frac{${c}}{${c + 1}}\right)^{n}`, 'abs', R`geometric, \(r = \frac{${c}}{${c + 1}}\)`, { la: (n) => n * Math.log(c / (c + 1)), Lt: R`\frac{${c}}{${c + 1}}` }),
    ],
    cond: [
      mk(R`\frac{(-1)^{n}}{n}`, 'cond', R`alternating series test, and \(\sum \frac{1}{n}\) diverges`, { b: (n) => 1 / n, alt: true }),
      mk(R`\frac{(-1)^{n}}{\sqrt{n}}`, 'cond', R`alternating series test, and \(\sum \frac{1}{\sqrt{n}}\) diverges`, { b: (n) => 1 / Math.sqrt(n), alt: true }),
      mk(R`\frac{(-1)^{n}}{n + ${a}}`, 'cond', R`alternating series test, and \(\sum \frac{1}{n + ${a}}\) diverges`, { b: (n) => 1 / (n + a), alt: true }),
      mk(R`\frac{(-1)^{n}\,n}{n^{2} + 1}`, 'cond', R`alternating series test, and \(\sum \frac{n}{n^{2} + 1}\) diverges`, { b: (n) => n / (n * n + 1), alt: true }),
      mk(R`\frac{(-1)^{n}}{\ln n}`, 'cond', R`alternating series test, and \(\frac{1}{\ln n} > \frac{1}{n}\)`, { b: (n) => 1 / Math.log(n), alt: true }),
    ],
    notCond: [
      mk(R`\frac{(-1)^{n}}{n^{${k}}}`, 'abs', R`\(\sum \frac{1}{n^{${k}}}\) converges`, { b: (n) => n ** -k, alt: true }),
      mk(R`\frac{(-1)^{n}}{n\sqrt{n}}`, 'abs', R`\(\sum \frac{1}{n^{3/2}}\) converges`, { b: (n) => n ** -1.5, alt: true }),
      mk(R`\frac{(-1)^{n}}{n^{2} + ${a}}`, 'abs', R`\(\sum \frac{1}{n^{2} + ${a}}\) converges`, { b: (n) => 1 / (n * n + a), alt: true }),
      mk(R`\frac{(-1)^{n}}{${c}^{n}}`, 'abs', R`\(\sum \frac{1}{${c}^{n}}\) is a convergent geometric series`, { la: (n) => -n * Math.log(c) }),
      mk(R`\frac{(-1)^{n}}{n!}`, 'abs', R`\(\sum \frac{1}{n!}\) converges by the ratio test`, { la: (n) => -logFact(n) }),
      mk(R`\frac{(-1)^{n}\,n}{n + ${a}}`, 'div', 'its terms do not approach 0', { b: (n) => n / (n + a), alt: true }),
      mk(R`\frac{(-1)^{n}(2n + 1)}{3n + ${a}}`, 'div', 'its terms do not approach 0', { b: (n) => (2 * n + 1) / (3 * n + a), alt: true }),
    ],
  };
  const type = rng.pick(['ratio', 'cond', 'div', 'conv']);
  const [right, others, ask] = {
    ratio: [rng.pick([...pools.div, ...pools.conv.slice(0, 6)]), rng.sample([...pools.conv.slice(6), ...pools.fast], 3), R`For exactly one of these series the ratio test gives \(L = 1\), so that the test is inconclusive. Which one?`],
    cond: [rng.pick(pools.cond), rng.sample(pools.notCond, 3), 'Exactly one of these series converges conditionally. Which one?'],
    div: [rng.pick(pools.div), rng.sample(pools.conv, 3), 'Exactly one of these series diverges. Which one?'],
    conv: [rng.pick(pools.conv), rng.sample(pools.div, 3), 'Exactly one of these series converges. Which one?'],
  }[type];
  const show = (it) => R`\(\displaystyle\sum ${it.tex}\)`;
  const verb = { abs: type === 'cond' ? 'converges absolutely' : 'converges', cond: 'converges conditionally', div: 'diverges' };
  const line = (it) => (type === 'ratio' ? R`\(\sum ${it.tex}\): \(L = ${it.Lt}\).` : R`\(\sum ${it.tex}\) ${verb[it.cls]}: ${it.reason}.`);
  return q({
    prompt: R`${ask} (Every sum runs from \(n = 2\) to \(\infty\).)`,
    correct: show(right),
    wrong: others.map(show),
    solution:
      type === 'ratio'
        ? [R`Factorials and exponentials such as \(${c}^{n}\) leave a factor behind in \(\left|\frac{a_{n+1}}{a_n}\right|\). Powers of \(n\) and logarithms do not: their ratio approaches 1.`, line(right), `The other three: ${others.map(line).join(' ')}`]
        : [line(right), ...others.map(line)],
    rule: 6,
    skill: 'choosing a test',
    check: () => {
      if (type !== 'ratio') return first(...[right, ...others].map((it) => agrees(it, it.cls)));
      const ratio = (it) => (it.la ? ratioFar(it.la) : it.log ? it.log(1e6 + 1) / it.log(1e6) : it.b(1e6 + 1) / it.b(1e6));
      return Math.abs(ratio(right) - 1) < 2e-3 && others.every((it) => Math.abs(ratio(it) - 1) > 0.1) ? true : 'the ratio limits do not match the key';
    },
  });
}

function challengeParameter(rng) {
  const k = rng.int(1, 3);
  const m = rng.int(0, 5);
  const d = rng.int(3, 6);
  const c = rng.int(1, 9);
  const j = rng.int(1, 2);
  const thr = frac(m + 1, k);
  const ineq = (lo, sign, hi) => R`\(${lo} ${sign} ${hi}\)`;
  const altClass = (p) => verdict({ b: (n) => n ** -p, alt: true });
  const harmonic = 'At that value the series is the harmonic series (or a multiple of it), which diverges.';
  const it = rng.pick([
    {
      tex: R`\frac{1}{n^{${terms([[k, 'p'], [-m, '']])}}}`, from: 1, ask: 'converge',
      right: ineq('p', '>', thr.tex()),
      wrong: [{ value: ineq('p', R`\ge`, thr.tex()), why: harmonic }, m === 0 ? null : { value: ineq('p', '>', frac(m, k).tex()), why: 'The exponent has to be greater than 1, not just greater than 0.' }, ineq('p', '<', thr.tex()), ineq('p', '>', frac(m + 2, k).tex()), ineq('p', '>', `${m + 1}`), ineq('p', '>', frac(1, k).tex())],
      steps: [R`This is a p-series with exponent \(${terms([[k, 'p'], [-m, '']])}\).`, R`It converges exactly when the exponent is greater than 1: \(${terms([[k, 'p'], [-m, '']])} > 1\).`, R`So \(p > ${thr.tex()}\). At \(p = ${thr.tex()}\) the exponent is exactly 1 and the series diverges.`],
      conv: (p) => powerConverges((n) => n ** -(k * p - m)), tests: [[thr.value + 1, true], [thr.value, false], [thr.value - 0.5, false]],
    },
    {
      tex: R`\frac{n^{p}}{n^{${d}} + ${c}}`, from: 1, ask: 'converge',
      right: ineq('p', '<', d - 1),
      wrong: [{ value: ineq('p', R`\le`, d - 1), why: harmonic.replace('is the', 'behaves like the') }, { value: ineq('p', '<', d), why: R`That only makes the terms approach 0. For convergence the terms must shrink faster than \(\frac{1}{n}\).` }, ineq('p', '>', d - 1), ineq('p', '<', d - 2)],
      steps: [R`For large \(n\) the terms behave like \(\dfrac{n^{p}}{n^{${d}}} = \dfrac{1}{n^{${d} - p}}\) (limit comparison).`, R`That p-series converges exactly when \(${d} - p > 1\).`, R`So \(p < ${d - 1}\). At \(p = ${d - 1}\) the terms behave like \(\frac{1}{n}\) and the series diverges.`],
      conv: (p) => powerConverges((n) => n ** p / (n ** d + c)), tests: [[d - 2, true], [d - 1, false], [d - 0.5, false]],
    },
    {
      tex: R`\frac{1}{n(\ln n)^{p}}`, from: 2, ask: 'converge',
      right: ineq('p', '>', 1),
      wrong: [{ value: ineq('p', R`\ge`, 1), why: R`With \(p = 1\), \(\displaystyle\int \frac{dx}{x\ln x} = \ln(\ln x)\), which is unbounded. The series diverges.` }, { value: ineq('p', '>', 0), why: R`The terms approach 0 for every \(p > 0\), but that is not enough. Use the integral test.` }, ineq('p', '<', 1), ineq('p', '>', 2)],
      steps: [R`Use the integral test with \(u = \ln x\): \(\displaystyle\int_{2}^{\infty} \frac{dx}{x(\ln x)^{p}} = \int_{\ln 2}^{\infty} \frac{du}{u^{p}}\).`, R`This is a p-integral, which converges exactly when \(p > 1\).`, R`So the series converges exactly when \(p > 1\).`],
      conv: (p) => farGrowth((x) => 1 / (x * Math.log(x) ** p)) < 0.1, tests: [[2, true], [3, true], [1, false], [0.5, false]],
    },
    {
      tex: R`\frac{(-1)^{n}}{n^{p}}`, from: 1, ask: 'converge absolutely',
      right: ineq('p', '>', 1),
      wrong: [{ value: ineq('p', '>', 0), why: R`That is where the series converges. Absolute convergence needs \(\sum \frac{1}{n^{p}}\) to converge as well.` }, { value: ineq('p', R`\ge`, 1), why: R`At \(p = 1\), \(\sum |a_n|\) is the harmonic series, which diverges.` }, R`\(0 < p \le 1\)`, ineq('p', '<', 1)],
      steps: [R`Absolute convergence means that \(\displaystyle\sum |a_n| = \sum \frac{1}{n^{p}}\) converges.`, R`That is a p-series, which converges exactly when \(p > 1\).`, R`(For \(0 < p \le 1\) the series still converges by the alternating series test, but only conditionally.)`],
      conv: (p) => altClass(p) === 'abs', tests: [[2, true], [1.5, true], [1, false], [0.5, false]],
    },
    {
      tex: R`\frac{(-1)^{n}}{n^{p}}`, from: 1, ask: 'converge conditionally',
      right: R`\(0 < p \le 1\)`,
      wrong: [{ value: R`\(0 < p < 1\)`, why: R`\(p = 1\) belongs too: the alternating harmonic series converges, and the harmonic series diverges.` }, { value: ineq('p', '>', 0), why: R`For \(p > 1\) the series converges absolutely, which is not conditional convergence.` }, { value: ineq('p', R`\le`, 1), why: R`For \(p \le 0\) the terms do not approach 0, so the series diverges.` }, ineq('p', '>', 1)],
      steps: [R`For \(p > 0\) the sizes \(\frac{1}{n^{p}}\) decrease to 0, so the series converges by the alternating series test. For \(p \le 0\) the terms do not approach 0.`, R`\(\displaystyle\sum |a_n| = \sum \frac{1}{n^{p}}\) diverges exactly when \(p \le 1\).`, R`Conditional convergence needs both: \(0 < p \le 1\).`],
      conv: (p) => altClass(p) === 'cond', tests: [[1, true], [0.5, true], [2, false], [0, false], [-1, false]],
    },
    {
      tex: R`\frac{p^{n}}{${power('n', j)}}`, from: 1, ask: 'converge', positive: true,
      right: j === 1 ? R`\(0 < p < 1\)` : R`\(0 < p \le 1\)`,
      wrong: [
        j === 1 ? { value: R`\(0 < p \le 1\)`, why: R`At \(p = 1\) the series is the harmonic series, which diverges.` } : { value: R`\(0 < p < 1\)`, why: R`At \(p = 1\) the ratio test is inconclusive, but the series is then \(\sum \frac{1}{n^{2}}\), which converges.` },
        { value: ineq('p', '>', 1), why: R`The ratio test gives \(L = p\), and the series converges when \(L < 1\).` },
        ineq('p', R`\ge`, 1),
        R`\(0 < p < ${j + 1}\)`,
      ],
      steps: [R`Ratio test: \(\left|\dfrac{a_{n+1}}{a_n}\right| = p \cdot ${j === 1 ? R`\dfrac{n}{n+1}` : R`\left(\dfrac{n}{n+1}\right)^{2}`} \to p\). The series converges for \(p < 1\) and diverges for \(p > 1\).`, R`At \(p = 1\) the test is inconclusive, so check directly: the series is \(\displaystyle\sum \frac{1}{${power('n', j)}}\), which ${j === 1 ? 'diverges (harmonic series)' : R`converges (p-series with \(p = 2\))`}.`, R`So the series converges exactly when ${j === 1 ? R`\(0 < p < 1\)` : R`\(0 < p \le 1\)`}.`],
      conv: (p) => (p === 1 ? powerConverges((n) => n ** -j) : ratioFar((n) => n * Math.log(p) - j * Math.log(n)) < 1), tests: [[0.5, true], [1, j === 2], [1.5, false]],
    },
  ]);
  return q({
    prompt: R`For which values of \(p\)${it.positive ? R` (with \(p > 0\))` : ''} does \(${sig(it.tex, it.from)}\) ${it.ask}?`,
    correct: it.right,
    wrong: it.wrong,
    solution: it.steps,
    rule: it.ask === 'converge' ? (it.from === 2 ? 0 : it.positive ? 4 : 2) : 5,
    skill: 'convergence with a parameter',
    check: () => {
      const bad = it.tests.find(([p, yes]) => it.conv(p) !== yes);
      return bad ? `numeric evidence at p = ${bad[0]} disagrees with the key` : true;
    },
  });
}

function challengeTermsNeeded(rng) {
  const name = person(rng);
  const it = rng.pick([
    { S: R`\ln 2`, value: Math.log(2), tex: R`\frac{(-1)^{n+1}}{n}`, b: (n) => 1 / n, bT: (n) => R`\frac{1}{${n}}`, tols: [0.03, 0.007, 0.003, 0.0015] },
    { S: R`\dfrac{\pi}{4}`, value: Math.PI / 4, tex: R`\frac{(-1)^{n+1}}{2n - 1}`, b: (n) => 1 / (2 * n - 1), bT: (n) => R`\frac{1}{${2 * n - 1}}`, tols: [0.03, 0.007, 0.004, 0.0015] },
    { S: R`\dfrac{\pi^{2}}{12}`, value: Math.PI ** 2 / 12, tex: R`\frac{(-1)^{n+1}}{n^{2}}`, b: (n) => 1 / (n * n), bT: (n) => R`\frac{1}{${n * n}}`, tols: [0.003, 0.0007, 0.0003, 0.00007] },
    { S: R`1 - \dfrac{1}{e}`, value: 1 - 1 / Math.E, tex: R`\frac{(-1)^{n+1}}{n!}`, b: (n) => 1 / factorial(n), bT: (n) => R`\frac{1}{${num(factorial(n))}}`, tols: [0.03, 0.003, 0.0003, 0.0001] },
    { S: R`\ln\dfrac{3}{2}`, value: Math.log(1.5), tex: R`\frac{(-1)^{n+1}}{n \cdot 2^{n}}`, b: (n) => 1 / (n * 2 ** n), bT: (n) => R`\frac{1}{${num(n * 2 ** n)}}`, tols: [0.03, 0.003, 0.0003, 0.0001] },
  ]);
  const tol = rng.pick(it.tols);
  let count = 1;
  while (!(it.b(count + 1) < tol)) count++;
  const tolT = num(tol, { places: 6 });
  const term = (n) => (n % 2 ? 1 : -1) * it.b(n);
  return q({
    prompt: R`${name} estimates \(${it.S} = ${sig(it.tex)}\) by adding the first \(N\) terms. Using the alternating series error bound, what is the smallest \(N\) that guarantees an error less than \(${tolT}\)?`,
    correct: count,
    fmt: (v) => R`\(N = ${num(v)}\)`,
    wrong: [{ value: count + 1, why: R`\(${count + 1}\) is the position of the first term left out. Only the terms before it are added.` }, { value: count - 1, why: R`With that many terms the first term left out is \(${it.bT(count)}\), which is not less than \(${tolT}\).` }, count + 2, 2 * count],
    solution: [
      R`The error is at most the first term left out: \(|S - S_N| \le b_{N+1}\). So we need \(b_{N+1} < ${tolT}\).`,
      R`Check the terms: \(b_{${count}} = ${it.bT(count)} \approx ${num(it.b(count), { places: 6 })}\) is not small enough, but \(b_{${count + 1}} = ${it.bT(count + 1)} \approx ${num(it.b(count + 1), { places: 6 })} < ${tolT}\).`,
      R`The first term left out must be \(b_{${count + 1}}\), so ${name} adds \(N = ${count}\) terms.`,
    ],
    rule: 3,
    skill: 'alternating series error bound',
    check: () => {
      const err = Math.abs(it.value - partialSum(term, 1, count));
      return it.b(count + 1) < tol && it.b(count) >= tol && Math.abs(it.b(count) - tol) > 1e-9 && err <= it.b(count + 1) && err < tol ? true : `N = ${count} is not the smallest number of terms (actual error ${err})`;
    },
  });
}

// ───────────── Topic ─────────────

const SERIES = {
  ln2: { name: 'ln 2', S: Math.log(2), sTex: R`\ln 2`, b: (n) => 1 / n, terms: R`1 - \frac{1}{2} + \frac{1}{3} - \frac{1}{4} + \cdots`, bTex: (n) => R`\frac{1}{${n}}` },
  pi4: { name: 'π/4', S: Math.PI / 4, sTex: R`\frac{\pi}{4}`, b: (n) => 1 / (2 * n - 1), terms: R`1 - \frac{1}{3} + \frac{1}{5} - \frac{1}{7} + \cdots`, bTex: (n) => R`\frac{1}{${2 * n - 1}}` },
  pi12: { name: 'π²/12', S: Math.PI ** 2 / 12, sTex: R`\frac{\pi^{2}}{12}`, b: (n) => 1 / (n * n), terms: R`1 - \frac{1}{4} + \frac{1}{9} - \frac{1}{16} + \cdots`, bTex: (n) => R`\frac{1}{${n * n}}` },
};

export default {
  id: 'convergence-tests',
  title: 'Convergence Tests',
  summary: 'Decide whether a series converges absolutely, conditionally or not at all by choosing and applying the right test.',
  standards: ['AP Calculus 10.4', 'AP Calculus 10.6', 'AP Calculus 10.7', 'AP Calculus 10.8', 'AP Calculus 10.9', 'AP Calculus 10.10'],

  explain: {
    intro: R`Most series cannot be summed exactly, but we can still decide whether they converge. Each test compares the series with something that is already understood: an improper integral, a p-series or geometric series, or its own neighbouring terms. A series \(\sum a_n\) converges **absolutely** if \(\sum |a_n|\) converges, and **conditionally** if it converges but \(\sum |a_n|\) does not.`,
    rules: [
      {
        title: 'Integral test',
        text: R`Suppose \(a_n = f(n)\), where \(f\) is positive, continuous and decreasing for \(x \ge N\). Then \(\displaystyle\sum_{n=N}^{\infty} a_n\) and \(\displaystyle\int_{N}^{\infty} f(x)\,dx\) either both converge or both diverge. The value of the integral is not the sum of the series.`,
        example: R`\(\displaystyle\int_{2}^{\infty} \frac{dx}{x\ln x} = \lim_{b\to\infty}\Big[\ln(\ln x)\Big]_{2}^{b} = \infty\), so \(\displaystyle\sum_{n=2}^{\infty} \frac{1}{n\ln n}\) diverges.`,
      },
      {
        title: 'Direct comparison test',
        text: R`Suppose \(0 \le a_n \le b_n\) from some point on. If \(\sum b_n\) converges, so does \(\sum a_n\). If \(\sum a_n\) diverges, so does \(\sum b_n\). Being smaller than a divergent series, or larger than a convergent one, proves nothing.`,
        example: R`\(0 \le \dfrac{1}{n^{2} + 5} \le \dfrac{1}{n^{2}}\) and \(\displaystyle\sum \frac{1}{n^{2}}\) converges, so \(\displaystyle\sum \frac{1}{n^{2} + 5}\) converges.`,
      },
      {
        title: 'Limit comparison test',
        text: R`Suppose \(a_n > 0\) and \(b_n > 0\), and \(\displaystyle\lim_{n\to\infty} \frac{a_n}{b_n} = L\) with \(0 < L < \infty\). Then \(\sum a_n\) and \(\sum b_n\) either both converge or both diverge. For \(b_n\), keep only the highest powers of \(n\) in the numerator and the denominator.`,
        example: R`\(\dfrac{2n + 1}{n^{3} + 4}\) behaves like \(\dfrac{2n}{n^{3}} = \dfrac{2}{n^{2}}\). With \(b_n = \dfrac{1}{n^{2}}\), \(L = 2\), so the series converges.`,
      },
      {
        title: 'Alternating series test and error bound',
        text: R`If \(b_n > 0\), \(b_n\) is decreasing and \(b_n \to 0\), then \(\displaystyle\sum (-1)^{n+1} b_n\) converges. Its partial sums then lie alternately above and below the sum \(S\), and the error is at most the first term left out: \(|S - S_N| \le b_{N+1}\).`,
        example: R`\(1 - \frac{1}{2} + \frac{1}{3} - \frac{1}{4} + \cdots\) converges. Using four terms, the error is at most \(b_5 = \frac{1}{5}\).`,
      },
      {
        title: 'Ratio test (and root test)',
        text: R`Let \(L = \displaystyle\lim_{n\to\infty} \left|\frac{a_{n+1}}{a_n}\right|\). If \(L < 1\) the series converges absolutely. If \(L > 1\) (or \(L = \infty\)) it diverges. If \(L = 1\) the test gives no conclusion. The root test uses \(L = \displaystyle\lim_{n\to\infty} \sqrt[n]{|a_n|}\) in the same way. These tests suit factorials and \(n\)th powers.`,
        example: R`For \(\displaystyle\sum \frac{n}{3^{n}}\): \(\dfrac{n+1}{3^{n+1}} \cdot \dfrac{3^{n}}{n} = \dfrac{1}{3} \cdot \dfrac{n+1}{n} \to \dfrac{1}{3} < 1\), so the series converges.`,
      },
      {
        title: 'Absolute and conditional convergence',
        text: R`If \(\sum |a_n|\) converges, then \(\sum a_n\) converges: this is absolute convergence. If \(\sum a_n\) converges but \(\sum |a_n|\) diverges, the convergence is conditional. So for a series with mixed signs, test \(\sum |a_n|\) first. If that diverges, the series itself may still converge.`,
        example: R`\(\displaystyle\sum \frac{(-1)^{n}}{n^{2}}\) converges absolutely. \(\displaystyle\sum \frac{(-1)^{n}}{n}\) converges conditionally.`,
      },
      {
        title: 'Choosing a test',
        text: R`Check first whether the terms approach 0. If they do not, the series diverges. Recognise geometric series and p-series. Factorials or \(n\)th powers: ratio or root test. Quotients of powers and roots of \(n\): limit comparison with a p-series (the ratio test would give \(L = 1\)). Alternating signs: alternating series test, then check \(\sum |a_n|\). A term \(f(n)\) that is easy to integrate, such as \(\frac{1}{n\ln n}\): integral test.`,
        example: R`\(\displaystyle\sum \frac{n^{2}}{2^{n}}\): ratio test. \(\displaystyle\sum \frac{\sqrt{n}}{n^{2} + 1}\): limit comparison with \(\displaystyle\sum \frac{1}{n^{3/2}}\).`,
      },
    ],
    vocab: [
      { term: 'absolute convergence', def: R`\(\sum |a_n|\) converges. The series \(\sum a_n\) then converges as well.` },
      { term: 'conditional convergence', def: R`\(\sum a_n\) converges, but \(\sum |a_n|\) diverges.` },
      { term: 'alternating series', def: R`A series whose terms alternate in sign, such as \(\sum (-1)^{n+1} b_n\) with \(b_n > 0\).` },
      { term: 'inconclusive', def: 'The test gives no information for this series, so a different test is needed.' },
    ],
    mistakes: [
      R`Using the ratio test on a quotient of powers of \(n\). It always gives \(L = 1\), which decides nothing.`,
      R`Comparing in the useless direction: \(a_n \le \frac{1}{n}\) says nothing, because a series below a divergent one may converge or diverge.`,
      R`Taking the value of the integral in the integral test as the sum of the series.`,
      R`Applying the alternating series test without checking that \(b_n \to 0\). If \(b_n\) does not approach 0, the series diverges by the nth-term test.`,
      R`Concluding that \(\sum a_n\) diverges because \(\sum |a_n|\) diverges. It may converge conditionally.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 9],
      y: [0, 1.2],
      step: [1, 0.2],
      fns: [{ f: (x) => 1 / x, domain: [0.84, 9], label: 'y = 1/x', labelAt: 6.5 }],
      rects: range(1, 8).map((n) => ({ x: n, w: 1, h: 1 / n })),
      alt: 'The curve y = 1 over x together with rectangles of width 1 and heights 1, 1/2, 1/3 and so on, each standing on the interval from n to n + 1. Every rectangle reaches above the curve, so the sum of their areas, the harmonic series, is larger than the area under the curve, which is infinite.',
    },
  },

  examples: [
    {
      title: 'Integral test',
      problem: R`Does \(\displaystyle\sum_{n=2}^{\infty} \frac{1}{n(\ln n)^{2}}\) converge?`,
      steps: [
        R`\(f(x) = \dfrac{1}{x(\ln x)^{2}}\) is positive, continuous and decreasing for \(x \ge 2\), so the integral test applies.`,
        R`Substitute \(u = \ln x\), \(du = \dfrac{dx}{x}\): \(\displaystyle\int_{2}^{\infty} \frac{dx}{x(\ln x)^{2}} = \int_{\ln 2}^{\infty} \frac{du}{u^{2}} = \lim_{b\to\infty}\left(\frac{1}{\ln 2} - \frac{1}{b}\right) = \frac{1}{\ln 2}\).`,
        R`The integral is finite, so the series converges.`,
      ],
      answer: R`It converges. (Its sum is not \(\frac{1}{\ln 2}\); the test only decides convergence.)`,
    },
    {
      title: 'Limit comparison test',
      problem: R`Does \(\displaystyle\sum_{n=1}^{\infty} \frac{3n + 1}{n^{3} + 5}\) converge?`,
      steps: [
        R`For large \(n\) the terms behave like \(\dfrac{3n}{n^{3}} = \dfrac{3}{n^{2}}\), so compare with \(b_n = \dfrac{1}{n^{2}}\).`,
        R`\(\displaystyle\lim_{n\to\infty} \frac{a_n}{b_n} = \lim_{n\to\infty} \frac{(3n + 1)\,n^{2}}{n^{3} + 5} = 3\), which is finite and positive.`,
        R`\(\displaystyle\sum \frac{1}{n^{2}}\) is a convergent p-series (\(p = 2\)), so the given series converges too.`,
      ],
      answer: 'It converges, by limit comparison with the p-series with p = 2.',
    },
    {
      title: 'Ratio test with a factorial',
      problem: R`Does \(\displaystyle\sum_{n=1}^{\infty} \frac{3^{n}}{n!}\) converge?`,
      steps: [R`\(\left|\dfrac{a_{n+1}}{a_n}\right| = \dfrac{3^{n+1}}{(n+1)!} \cdot \dfrac{n!}{3^{n}}\).`, R`Simplify with \((n+1)! = (n+1) \cdot n!\): the ratio is \(\dfrac{3}{n+1}\).`, R`\(L = \displaystyle\lim_{n\to\infty} \frac{3}{n+1} = 0 < 1\).`],
      answer: 'It converges (absolutely), by the ratio test.',
    },
    {
      title: 'Absolute or conditional?',
      problem: R`Classify \(\displaystyle\sum_{n=1}^{\infty} \frac{(-1)^{n+1}}{\sqrt{n}}\).`,
      steps: [
        R`Absolute values first: \(\displaystyle\sum \frac{1}{\sqrt{n}}\) is a p-series with \(p = \frac{1}{2} \le 1\), so it diverges. The series does not converge absolutely.`,
        R`Now the series itself: \(b_n = \dfrac{1}{\sqrt{n}}\) is positive, decreasing, and approaches 0. By the alternating series test it converges.`,
      ],
      answer: 'It converges conditionally.',
    },
    {
      title: 'Word problem: how many terms for π?',
      word: true,
      problem: R`Priya computes \(\dfrac{\pi}{4} = 1 - \dfrac{1}{3} + \dfrac{1}{5} - \dfrac{1}{7} + \cdots\) by adding terms. How many terms guarantee an error less than 0.01?`,
      steps: [
        R`The series is alternating with \(b_n = \dfrac{1}{2n - 1}\), which decreases to 0. So \(|S - S_N| \le b_{N+1} = \dfrac{1}{2N + 1}\).`,
        R`We need \(\dfrac{1}{2N + 1} < 0.01\), that is, \(2N + 1 > 100\).`,
        R`\(N = 49\) gives \(2N + 1 = 99\), which is not enough. \(N = 50\) gives \(2N + 1 = 101\).`,
      ],
      answer: '50 terms. The series converges, but very slowly.',
    },
  ],

  models: [
    {
      id: 'ratio-test',
      title: 'Ratio test: watch the ratios settle',
      intro: 'Choose a type of series and its numbers. The steps find L, and the graph shows the ratios of consecutive terms.',
      inputs: [
        { name: 'kind', label: 'Series', type: 'select', value: 'poly', options: [{ value: 'poly', label: 'nᵏ / cⁿ' }, { value: 'exp', label: 'cⁿ / nᵏ' }, { value: 'fact', label: 'cⁿ / n!' }, { value: 'inv', label: 'n! / cⁿ' }] },
        { name: 'k', label: 'k', type: 'int', min: 1, max: 4, value: 2 },
        { name: 'c', label: 'c', type: 'int', min: 2, max: 9, value: 3 },
      ],
      compute({ kind, k, c }) {
        const nk = power('n', k);
        const n1k = k === 1 ? 'n+1' : `(n+1)^{${k}}`;
        const up = k === 1 ? R`\frac{n+1}{n}` : R`\left(\frac{n+1}{n}\right)^{${k}}`;
        const down = k === 1 ? R`\frac{n}{n+1}` : R`\left(\frac{n}{n+1}\right)^{${k}}`;
        const m = {
          poly: { tex: R`\frac{${nk}}{${c}^{n}}`, ratio: (n) => ((n + 1) / n) ** k / c, work: R`\frac{${n1k}}{${c}^{n+1}} \cdot \frac{${c}^{n}}{${nk}} = \frac{1}{${c}} \cdot ${up}`, lim: R`\(${up} \to 1\)`, L: 1 / c, LT: R`\frac{1}{${c}}` },
          exp: { tex: R`\frac{${c}^{n}}{${nk}}`, ratio: (n) => c * (n / (n + 1)) ** k, work: R`\frac{${c}^{n+1}}{${n1k}} \cdot \frac{${nk}}{${c}^{n}} = ${c} \cdot ${down}`, lim: R`\(${down} \to 1\)`, L: c, LT: `${c}` },
          fact: { tex: R`\frac{${c}^{n}}{n!}`, ratio: (n) => c / (n + 1), work: R`\frac{${c}^{n+1}}{(n+1)!} \cdot \frac{n!}{${c}^{n}} = \frac{${c}}{n+1}`, lim: R`\(\dfrac{${c}}{n+1} \to 0\)`, L: 0, LT: '0' },
          inv: { tex: R`\frac{n!}{${c}^{n}}`, ratio: (n) => (n + 1) / c, work: R`\frac{(n+1)!}{${c}^{n+1}} \cdot \frac{${c}^{n}}{n!} = \frac{n+1}{${c}}`, lim: R`\(\dfrac{n+1}{${c}} \to \infty\)`, L: Infinity, LT: R`\infty` },
        }[kind];
        const conv = m.L < 1;
        const ys = range(1, 14).map(m.ratio);
        return {
          problem: R`\(${sig(m.tex)}\)`,
          steps: [
            R`Divide the next term by the current one: \(\left|\dfrac{a_{n+1}}{a_n}\right| = ${m.work}\).`,
            R`As \(n \to \infty\), ${m.lim}, so \(L = ${m.LT}\).`,
            conv ? R`\(L < 1\): from some point on, each term is smaller than the one before by a fixed factor, as in a convergent geometric series.` : R`\(L > 1\): from some point on, the terms grow, so they cannot approach 0.`,
          ],
          answer: conv ? R`\(L = ${m.LT} < 1\): the series converges` : R`\(L = ${m.LT}\): the series diverges`,
          visual: {
            type: 'plot',
            x: [0, 15],
            y: [0, Math.max(1.3, ...ys) * 1.1],
            axisLabels: ['n', 'ratio'],
            points: ys.map((y, i) => ({ x: i + 1, y })),
            hlines: [{ y: 1 }],
            alt: `The ratios of consecutive terms for n from 1 to 14. ${m.L === Infinity ? 'They keep growing and pass the dashed line at height 1.' : `They approach ${num(m.L, { places: 3 })}, which is ${conv ? 'below' : 'above'} the dashed line at height 1.`}`,
          },
        };
      },
    },
    {
      id: 'alternating-error',
      title: 'Word problem: how good is the estimate?',
      word: true,
      intro: 'A program adds the first N terms of an alternating series. Compare the real error with the error bound.',
      inputs: [
        { name: 'which', label: 'Number to estimate', type: 'select', value: 'ln2', options: [{ value: 'ln2', label: 'ln 2 = 1 − 1/2 + 1/3 − …' }, { value: 'pi4', label: 'π/4 = 1 − 1/3 + 1/5 − …' }, { value: 'pi12', label: 'π²/12 = 1 − 1/4 + 1/9 − …' }] },
        { name: 'N', label: 'Number of terms N', type: 'int', min: 1, max: 40, value: 6 },
      ],
      compute({ which, N: count }) {
        const s = SERIES[which];
        const term = (n) => (n % 2 ? 1 : -1) * s.b(n);
        const SN = partialSum(term, 1, count);
        const bound = s.b(count + 1);
        const show = (x) => num(x, { places: 5 });
        const shown = Math.max(count, 12);
        const ys = range(1, shown).map((n) => partialSum(term, 1, n));
        return {
          problem: R`A program estimates \(${s.sTex} = ${s.terms}\) by adding the first ${count === 1 ? 'term' : `${count} terms`}. How far from the true value can the estimate be?`,
          steps: [
            R`The partial sum is \(S_{${count}} \approx ${show(SN)}\).`,
            R`The terms alternate in sign and their sizes decrease to 0, so the error is at most the first term left out: \(b_{${count + 1}} = ${s.bTex(count + 1)} \approx ${show(bound)}\).`,
            R`So \(${s.sTex}\) lies between \(${show(Math.min(SN, SN + (count % 2 ? -bound : bound)))}\) and \(${show(Math.max(SN, SN + (count % 2 ? -bound : bound)))}\).`,
            R`Check: \(${s.sTex} \approx ${show(s.S)}\), so the real error is about \(${show(Math.abs(s.S - SN))}\), within the bound.`,
          ],
          answer: R`\(S_{${count}} \approx ${show(SN)}\), with an error of at most \(${show(bound)}\)`,
          visual: {
            type: 'plot',
            x: [0, shown + 1],
            y: [Math.min(...ys) - 0.08, Math.max(...ys) + 0.08],
            axisLabels: ['N', 'S'],
            points: ys.map((y, i) => ({ x: i + 1, y, color: i + 1 === count ? 'b' : 'a' })),
            hlines: [{ y: s.S }],
            alt: `Partial sums of the alternating series for ${s.name}, for N from 1 to ${shown}. The points jump alternately above and below the dashed line at the true value ${show(s.S)}, getting closer each time.`,
          },
        };
      },
    },
  ],

  quiz: { easy: [easyRatioLimit, easyAlternatingTest, easyPickComparison], medium: [mediumRatioTest, mediumLimitComparison, mediumAlternatingError], hard: [hardIntegralTest, hardAbsoluteConditional, hardDirectComparison], challenge: [challengeWhichSeries, challengeParameter, challengeTermsNeeded] },
};
