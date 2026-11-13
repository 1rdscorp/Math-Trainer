import { R, q, Frac, frac, num, round, linear, power, range, factorial, choose, integrate, close, checkEqual } from '../../lib/index.js';
import { N, K, fterms, exactChoices, partialSum } from './_shared.js';

const sig = (tex, from = 0) => R`\displaystyle\sum_{n=${from}}^{\infty} ${tex}`;
const val = (c) => (c instanceof Frac ? c.value : c);
const F = (c) => (c instanceof Frac ? c : frac(c));
const first = (...checks) => checks.find((r) => r !== true) ?? true; // the first failed check, or true

// A polynomial is a list of coefficients of (x − a)^k, LOWEST power first: [1, 0, frac(-1, 2)] is 1 − (x − a)²/2.
const base = (a) => (a === 0 ? 'x' : `(${linear(1, -a)})`);
const pw = (u, k) => `${u}^{${k}}`; // a power with a symbolic exponent, such as (x - 2)^{k}
// In a term such as (x − 1)/2 the brackets are not needed: the fraction bar already groups the numerator.
const bare = (c, k, a) => k === 1 && a !== 0 && c instanceof Frac && c.d !== 1 && Math.abs(c.n) === 1;
const tay = (coefs, a = 0) => fterms(coefs.map((c, k) => [c, k === 0 ? '' : bare(c, k, a) ? linear(1, -a) : power(base(a), k)]));
const at = (coefs, x, a = 0) => coefs.reduce((s, c, k) => s + val(c) * (x - a) ** k, 0);

/**
 * P is the degree-n Taylor polynomial of f at a exactly when f − P vanishes to order n + 1 there,
 * so halving h must shrink the error by a factor 2^(n+1). A wrong coefficient leaves an error of lower order.
 */
function checkTaylor(f, coefs, a = 0) {
  const n = coefs.length - 1;
  const h0 = n <= 4 ? 0.1 : n <= 6 ? 0.2 : 0.4;
  for (const h of [h0, -h0]) {
    const e1 = Math.abs(f(a + h) - at(coefs, a + h, a));
    const e2 = Math.abs(f(a + h / 2) - at(coefs, a + h / 2, a));
    if (!(e2 <= (1.6 * e1) / 2 ** (n + 1) + 1e-14)) return `not the Taylor polynomial of degree ${n}: the error only falls from ${e1} to ${e2} when h is halved`;
  }
  return true;
}
// k-th derivative by central differences (used on low-degree polynomials, where it is essentially exact).
const nthDeriv = (f, a, k, h = 0.01) => range(0, k).reduce((s, j) => s + (-1) ** j * choose(k, j) * f(a + (k / 2 - j) * h), 0) / h ** k;

/**
 * Choices that are polynomials. `correct` is a coefficient list; each wrong answer is { c, a?, why? }.
 * A wrong answer that is the same function as the correct one or as an earlier choice is dropped.
 */
function polyChoices(correct, wrongs, a = 0, tail = '') {
  const sign = (c, centre) => [0.3, 0.7, -0.4].map((d) => at(c, a + d, centre));
  const same = (u, v) => u.every((x, i) => close(x, v[i], 1e-9));
  const show = (c, centre) => R`\(${tay(c, centre)}${tail}\)`;
  const seen = [sign(correct, a)];
  const out = [];
  for (const w of wrongs) {
    if (!w) continue;
    const centre = w.a ?? a;
    const s = sign(w.c, centre);
    if (seen.some((t) => same(s, t))) continue;
    seen.push(s);
    out.push(w.why ? { value: show(w.c, centre), why: w.why } : show(w.c, centre));
  }
  return { correct: show(correct, a), wrong: out };
}
// Standard wrong answers for a Taylor polynomial built from the derivative values d[k] = f⁽ᵏ⁾(a).
function slips(d, a, extra = []) {
  const right = d.map((v, k) => F(v).div(factorial(k)));
  return [
    { c: d.map(F), why: R`Divide each derivative by \(k!\): the coefficient of \(${pw(base(a), 'k')}\) is \(\dfrac{f^{(k)}(${a})}{k!}\).` },
    ...extra,
    { c: d.map((v, k) => (k ? F(v).div(k) : F(v))), why: R`Divide by \(k!\), not by \(k\): \(3! = 6\) and \(4! = 24\).` },
    a === 0 ? null : { c: right, a: 0, why: R`A Taylor polynomial about \(x = ${a}\) is written in powers of \(${base(a)}\), not powers of \(x\).` },
    { c: right.map((c) => c.abs()), why: 'Keep the signs of the derivatives.' },
    a === 0 ? null : { c: right, a: -a },
    { c: right.map((c, k) => (k === right.length - 1 ? c.neg() : c)) },
    { c: d.map((v, k) => F(v).div(factorial(k + 1))), why: R`The term with \(${pw(base(a), 'k')}\) is divided by \(k!\), starting with \(0! = 1\).` },
    { c: right.map((c, k) => (k === 1 ? c.neg() : c)) },
  ];
}

// ───────────── numeric evidence for convergence (used only by checks) ─────────────

const logFact = (n) => {
  let s = 0;
  for (let k = 2; k <= n; k++) s += Math.log(k);
  return s;
};
// Σ b(n) with positive, power-like terms converges exactly when 2·b(2N)/b(N) stays below 1 (Cauchy condensation).
const powerConverges = (b) => (2 * b(2 ** 41)) / b(2 ** 40) < 1 - 1e-6;
// Does Σ b(n) (alternating = false) or Σ (−1)ⁿ b(n) (alternating = true) converge, for positive monotone b?
const endpointConverges = (b, alternating) => b(1e100) < 0.01 && (alternating ? range(10, 300).every((n) => b(n + 1) < b(n)) : powerConverges(b));

// ───────────── Easy ─────────────

function easyFromDerivatives(rng) {
  const a = rng.int(-3, 4);
  const n = rng.int(2, 3);
  const d = [rng.nonzero(-9, 9), rng.nonzero(-9, 9), rng.nonzero(-5, 5) * 2, rng.nonzero(-4, 4) * 3].slice(0, n + 1);
  const right = d.map((v, k) => frac(v, factorial(k)));
  const heads = ['f', "f'", "f''", "f'''"].slice(0, n + 1).map((s) => R`\(${s}(${a})\)`);
  return q({
    prompt: R`The table gives values of \(f\) and its derivatives at \(x = ${a}\). Find the ${n === 2 ? 'second' : 'third'}-degree Taylor polynomial for \(f\) about \(x = ${a}\).`,
    ...polyChoices(right, slips(d, a), a),
    visual: { type: 'table', headers: heads, rows: [d.map((v) => R`\(${v}\)`)], alt: `Values at x = ${a}: ${d.map((v, k) => `${['f', 'first derivative', 'second derivative', 'third derivative'][k]} = ${v}`).join(', ')}.` },
    solution: [
      R`The coefficient of \(${pw(base(a), 'k')}\) is \(\dfrac{f^{(k)}(${a})}{k!}\).`,
      R`Divide the table values by \(0! = 1\), \(1! = 1\), \(2! = 2\)${n === 3 ? R`, \(3! = 6\)` : ''}: the coefficients are \(${right.map((c) => c.tex()).join(',\\ ')}\).`,
      R`\(P_{${n}}(x) = ${tay(right, a)}\).`,
    ],
    rule: 0,
    skill: 'Taylor polynomial from derivatives',
    check: () => first(...d.map((v, k) => checkEqual(nthDeriv((x) => at(right, x, a), a, k), v, 1e-3, `derivative ${k} of the polynomial`))),
  });
}

function easyKnownCoefficient(rng) {
  const k = rng.int(1, 7);
  const kf = factorial(k);
  const alt = (j) => (j % 4 < 2 ? 1 : -1); // signs +, +, −, − for powers 0, 1, 2, 3, …
  const it = rng.pick([
    { tex: 'e^{x}', f: Math.exp, coef: (j) => frac(1, factorial(j)), series: R`e^{x} = 1 + x + \dfrac{x^{2}}{2!} + \dfrac{x^{3}}{3!} + \cdots`, say: R`Every power of \(x\) appears, with coefficient \(\frac{1}{n!}\).` },
    { tex: R`\sin x`, f: Math.sin, coef: (j) => (j % 2 ? frac(alt(j), factorial(j)) : frac(0)), series: R`\sin x = x - \dfrac{x^{3}}{3!} + \dfrac{x^{5}}{5!} - \dfrac{x^{7}}{7!} + \cdots`, say: 'Only odd powers appear, with alternating signs.', parity: 'odd' },
    { tex: R`\cos x`, f: Math.cos, coef: (j) => (j % 2 ? frac(0) : frac(alt(j), factorial(j))), series: R`\cos x = 1 - \dfrac{x^{2}}{2!} + \dfrac{x^{4}}{4!} - \dfrac{x^{6}}{6!} + \cdots`, say: 'Only even powers appear, with alternating signs.', parity: 'even' },
    { tex: R`\dfrac{1}{1 - x}`, f: (x) => 1 / (1 - x), coef: () => frac(1), series: R`\dfrac{1}{1 - x} = 1 + x + x^{2} + x^{3} + \cdots`, say: 'This is the geometric series: every coefficient is 1.', geo: true },
  ]);
  const c = it.coef(k);
  const missing = it.parity && c.n === 0;
  return q({
    prompt: R`What is the coefficient of \(${power('x', k)}\) in the Maclaurin series for \(${it.tex}\)?`,
    correct: c,
    wrong: it.geo
      ? [{ value: frac(1, kf), why: 'The geometric series has no factorials. Every coefficient is 1.' }, { value: frac(1, k), why: 'That is the pattern for a logarithm series. In the geometric series every coefficient is 1.' }, frac(0), frac(-1), frac(k)]
      : [
          missing ? { value: frac(1, kf), why: `This series has only ${it.parity} powers of x, so the coefficient of this power is 0.` } : { value: c.neg(), why: R`Check the sign pattern in the series, term by term.` },
          k > 2 ? { value: frac(c.n < 0 ? -1 : 1, k), why: R`The denominators are factorials: \(${k}! = ${num(kf)}\).` } : null,
          missing ? frac(-1, kf) : it.parity ? { value: frac(0), why: `This power does appear: the series for this function has all the ${it.parity} powers of x.` } : frac(0),
          frac(1, factorial(k - 1) * (k > 1 ? 1 : 2)),
          frac(1),
          frac(1, factorial(k + 1)),
        ],
    solution: [R`\(${it.series}\)`, it.say, R`The coefficient of \(${power('x', k)}\) is \(${c.tex()}\)${c.n !== 0 && k > 1 && !it.geo ? R`, since \(${k}! = ${num(kf)}\)` : ''}.`],
    rule: 1,
    skill: 'known Maclaurin series',
    check: () => checkTaylor(it.f, range(0, k).map(it.coef)),
  });
}

function easyApproximate(rng) {
  const half = frac(1, 2);
  const near = [0.1, 0.2, 0.3, 0.4, 0.5];
  const wide = [0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1];
  const it = rng.pick([
    { f: Math.exp, name: 'e^{x}', target: (x) => (x === 1 ? 'e' : `e^{${x}}`), c: [1, 1, half], xs: wide },
    { f: Math.exp, name: 'e^{x}', target: (x) => (x === 1 ? 'e' : `e^{${x}}`), c: [1, 1, half, frac(1, 6)], xs: wide },
    { f: Math.sin, name: R`\sin x`, target: (x) => R`\sin(${x})`, c: [0, 1, 0, frac(-1, 6)], xs: wide },
    { f: Math.cos, name: R`\cos x`, target: (x) => R`\cos(${x})`, c: [1, 0, half.neg()], xs: wide },
    { f: Math.cos, name: R`\cos x`, target: (x) => R`\cos(${x})`, c: [1, 0, half.neg(), 0, frac(1, 24)], xs: wide },
    { f: (x) => Math.log(1 + x), name: R`\ln(1 + x)`, target: (x) => R`\ln(${num(1 + x)})`, c: [0, 1, half.neg()], xs: near, shift: true },
    { f: (x) => Math.log(1 + x), name: R`\ln(1 + x)`, target: (x) => R`\ln(${num(1 + x)})`, c: [0, 1, half.neg(), frac(1, 3)], xs: near, shift: true },
    { f: (x) => Math.sqrt(1 + x), name: R`\sqrt{1 + x}`, target: (x) => R`\sqrt{${num(1 + x)}}`, c: [1, half, frac(-1, 8)], xs: near, shift: true },
  ]);
  const n = it.c.length - 1;
  const last = F(it.c[n]);
  const swap = (c) => [...it.c.slice(0, n), c];
  // The slips a student is likely to make, kept only if they land well clear of the right answer and of each other.
  const build = (x0) => {
    const raw = at(it.c, x0);
    const v = round(raw, 4);
    const tie = Math.abs(((Math.abs(raw) * 1e4) % 1) - 0.5) < 1e-6; // exactly halfway between two 4-place decimals
    const list = [
      { value: round(at(swap(0), x0), 4), why: 'Use every term of the polynomial, including the last one.' },
      { value: round(at(swap(last.mul(factorial(n))), x0), 4), why: R`Check the last term: its coefficient is \(${last.tex()}\).` },
      { value: round(at(swap(last.neg()), x0), 4), why: 'Check the sign of the last term.' },
      it.shift ? { value: round(at(it.c, 1 + x0), 4), why: R`\(${it.target(x0)}\) is \(${it.name}\) with \(x = ${x0}\), not \(x = ${num(1 + x0)}\).` } : null,
      { value: round(it.f(x0), 4), why: R`That is the calculator value of \(${it.target(x0)}\). The polynomial gives a slightly different number.` },
    ];
    const wrong = [];
    for (const w of list) if (w && [v, ...wrong.map((u) => u.value)].every((u) => Math.abs(u - w.value) >= 0.002)) wrong.push(w);
    return { x0, v, wrong: tie ? [] : wrong };
  };
  const { x0, v, wrong } = rng.shuffle(it.xs).map(build).find((b) => b.wrong.length >= 3) ?? build(it.xs[it.xs.length - 1]);
  const shown = it.c.map((c, k) => [val(c) * x0 ** k, k]).filter(([t]) => t !== 0);
  return q({
    prompt: R`The Maclaurin polynomial of degree ${n} for \(${it.name}\) is \(P_{${n}}(x) = ${tay(it.c)}\). Use it to approximate \(${it.target(x0)}\). Give the answer to four decimal places.`,
    correct: v,
    fmt: (w) => R`\(${num(w, { fixed: 4 })}\)`,
    wrong: [...wrong, { value: round(v + 0.05, 4) }, { value: round(v - 0.05, 4) }],
    solution: [
      R`${it.shift ? R`\(${it.target(x0)}\) is \(${it.name}\) with \(x = ${x0}\). ` : ''}Substitute \(x = ${x0}\) into the polynomial.`,
      R`\(P_{${n}}(${x0}) = ${shown.map(([t], i) => `${t < 0 ? '- ' : i ? '+ ' : ''}${num(Math.abs(t), { places: 6 })}`).join(' ')}\)`,
      R`\(P_{${n}}(${x0}) \approx ${num(v, { fixed: 4 })}\). (A calculator gives \(${it.target(x0)} \approx ${num(it.f(x0), { fixed: 4 })}\).)`,
    ],
    rule: 0,
    skill: 'approximating with a Taylor polynomial',
    check: () => first(checkTaylor(it.f, it.c.map(val)), wrong.length >= 3 ? true : 'fewer than three well-separated wrong answers', Math.abs(it.f(x0) - v) <= 2 * x0 ** (n + 1) + 6e-5 ? true : 'the approximation is too far from the function value'),
  });
}

// ───────────── Medium ─────────────

function mediumTaylorPolynomial(rng) {
  const k = rng.pick([2, 3, -1, -2]);
  const m = rng.int(1, 3);
  const a = rng.pick([1, 2]);
  const s = rng.pick([1, 4]);
  const r = Math.sqrt(s);
  const b = rng.pick([1, 2, -1]);
  const kx = k === -1 ? '-x' : `${k}x`;
  const mx = m === 1 ? 'x' : `${m}x`;
  const it = rng.pick([
    { tex: `e^{${kx}}`, a: 0, f: (x) => Math.exp(k * x), d: [1, k, k * k, k ** 3], how: R`\(f'(x) = ${fterms([[k, `e^{${kx}}`]])}\), \(f''(x) = ${fterms([[k * k, `e^{${kx}}`]])}\), \(f'''(x) = ${fterms([[k ** 3, `e^{${kx}}`]])}\).`, extra: [{ c: [1, k, frac(k, 2), frac(k, 6)], why: R`Each derivative brings out another factor \(${k}\), so \(f''(0) = ${k * k}\) and \(f'''(0) = ${k ** 3}\).` }, { c: [1, 1, frac(1, 2), frac(1, 6)], why: R`That is the polynomial for \(e^{x}\). The chain rule gives extra factors of \(${k}\).` }] },
    { tex: R`\ln x`, a: 1, f: Math.log, d: [0, 1, -1, 2], how: R`\(f'(x) = \dfrac{1}{x}\), \(f''(x) = -\dfrac{1}{x^{2}}\), \(f'''(x) = \dfrac{2}{x^{3}}\).` },
    { tex: R`\dfrac{1}{x}`, a, f: (x) => 1 / x, d: [frac(1, a), frac(-1, a * a), frac(2, a ** 3), frac(-6, a ** 4)], how: R`\(f'(x) = -\dfrac{1}{x^{2}}\), \(f''(x) = \dfrac{2}{x^{3}}\), \(f'''(x) = -\dfrac{6}{x^{4}}\).` },
    { tex: R`\sqrt{x}`, a: s, f: Math.sqrt, d: [r, frac(1, 2 * r), frac(-1, 4 * r ** 3)], how: R`\(f'(x) = \dfrac{1}{2\sqrt{x}}\), \(f''(x) = -\dfrac{1}{4x^{3/2}}\).` },
    { tex: R`\cos(${m + 1}x)`, a: 0, f: (x) => Math.cos((m + 1) * x), d: [1, 0, -((m + 1) ** 2), 0, (m + 1) ** 4], how: R`\(f'(x) = -${m + 1}\sin(${m + 1}x)\), \(f''(x) = -${(m + 1) ** 2}\cos(${m + 1}x)\), \(f'''(x) = ${(m + 1) ** 3}\sin(${m + 1}x)\), \(f^{(4)}(x) = ${(m + 1) ** 4}\cos(${m + 1}x)\).`, extra: [{ c: [1, 0, frac(-1, 2), 0, frac(1, 24)], why: R`That is the polynomial for \(\cos x\). The chain rule gives a factor \(${m + 1}\) with every derivative.` }] },
    { tex: R`\ln(1 + ${mx})`, a: 0, f: (x) => Math.log(1 + m * x), d: [0, m, -m * m, 2 * m ** 3], how: R`\(f'(x) = \dfrac{${m}}{1 + ${mx}}\), \(f''(x) = -\dfrac{${m * m}}{(1 + ${mx})^{2}}\), \(f'''(x) = \dfrac{${2 * m ** 3}}{(1 + ${mx})^{3}}\).` },
    { tex: 'x^{3}', a: b, f: (x) => x ** 3, d: [b ** 3, 3 * b * b, 6 * b], how: R`\(f'(x) = 3x^{2}\), \(f''(x) = 6x\).` },
    { tex: R`\dfrac{1}{(1 + x)^{2}}`, a: 0, f: (x) => 1 / (1 + x) ** 2, d: [1, -2, 6, -24], how: R`\(f'(x) = -\dfrac{2}{(1 + x)^{3}}\), \(f''(x) = \dfrac{6}{(1 + x)^{4}}\), \(f'''(x) = -\dfrac{24}{(1 + x)^{5}}\).` },
  ]);
  const n = it.d.length - 1;
  const right = it.d.map((v, j) => F(v).div(factorial(j)));
  return q({
    prompt: R`Find the Taylor polynomial of degree ${n} for \(f(x) = ${it.tex}\) about \(x = ${it.a}\).`,
    ...polyChoices(right, slips(it.d, it.a, it.extra), it.a),
    solution: [R`Differentiate: ${it.how}`, R`Evaluate at \(x = ${it.a}\): \(${it.d.map((v, j) => `f${j < 4 ? "'".repeat(j) : '^{(4)}'}(${it.a}) = ${F(v).tex()}`).join(',\\ ')}\).`, R`Divide the \(k\)th value by \(k!\) and attach \(${pw(base(it.a), 'k')}\): \(P_{${n}}(x) = ${tay(right, it.a)}\).`],
    rule: 0,
    skill: 'Taylor polynomial of a function',
    check: () => checkTaylor(it.f, right.map(val), it.a),
  });
}

function mediumSubstitution(rng) {
  const k = rng.int(2, 3);
  const h = frac(1, 2);
  const basic = { exp: R`e^{u} = 1 + u + \dfrac{u^{2}}{2!} + \cdots`, sin: R`\sin u = u - \dfrac{u^{3}}{3!} + \dfrac{u^{5}}{5!} - \cdots`, cos: R`\cos u = 1 - \dfrac{u^{2}}{2!} + \dfrac{u^{4}}{4!} - \cdots`, geo: R`\dfrac{1}{1 - u} = 1 + u + u^{2} + \cdots` };
  const power2 = R`The whole of \(u\) is raised to each power, including its number factor.`;
  const it = rng.pick([
    { tex: 'e^{-x^{2}}', f: (x) => Math.exp(-x * x), c: [1, 0, -1, 0, h], known: basic.exp, sub: R`u = -x^{2}`, w: [{ c: [1, 0, -1, 0, frac(1, 24)], why: R`The third term is \(\dfrac{u^{2}}{2!}\). The factorial goes with the power of \(u\), not with the power of \(x\).` }, { c: [1, 0, -1, 0, h.neg()], why: R`\((-x^{2})^{2} = +x^{4}\).` }, { c: [1, -1, h] }, { c: [1, 0, 1, 0, h] }] },
    { tex: `e^{${k}x^{2}}`, f: (x) => Math.exp(k * x * x), c: [1, 0, k, 0, frac(k * k, 2)], known: basic.exp, sub: `u = ${k}x^{2}`, w: [{ c: [1, 0, k, 0, frac(k, 2)], why: power2 }, { c: [1, 0, k, 0, frac(k * k, 24)], why: R`The third term is \(\dfrac{u^{2}}{2!}\). The factorial goes with the power of \(u\), not with the power of \(x\).` }, { c: [1, k, frac(k * k, 2)] }, { c: [1, 0, k, 0, k * k] }] },
    { tex: 'xe^{-x}', f: (x) => x * Math.exp(-x), c: [0, 1, -1, h], known: basic.exp, sub: 'u = -x', times: 'x', w: [{ c: [1, -1, h], why: R`That is the series for \(e^{-x}\). Multiply every term by \(x\).` }, { c: [0, 1, -1, frac(1, 6)], why: R`Multiplying by \(x\) raises each power by 1, but the factorials stay as they were.` }, { c: [0, 1, 1, h] }, { c: [0, 1, -1, 1] }] },
    { tex: R`\sin(${k}x)`, f: (x) => Math.sin(k * x), c: [0, k, 0, frac(-(k ** 3), 6), 0, frac(k ** 5, 120)], known: basic.sin, sub: `u = ${k}x`, w: [{ c: [0, k, 0, frac(-k, 6), 0, frac(k, 120)], why: power2 }, { c: [0, k, 0, frac(k ** 3, 6), 0, frac(k ** 5, 120)], why: 'The signs of the sine series alternate.' }, { c: [0, k, 0, frac(-(k ** 3), 3), 0, frac(k ** 5, 5)] }, { c: [0, 1, 0, frac(-1, 6), 0, frac(1, 120)] }] },
    { tex: R`\cos(${k}x)`, f: (x) => Math.cos(k * x), c: [1, 0, frac(-k * k, 2), 0, frac(k ** 4, 24)], known: basic.cos, sub: `u = ${k}x`, w: [{ c: [1, 0, frac(-k, 2), 0, frac(k, 24)], why: power2 }, { c: [1, 0, frac(k * k, 2), 0, frac(k ** 4, 24)], why: 'The signs of the cosine series alternate.' }, { c: [1, 0, frac(-k * k, 2), 0, frac(k ** 4, 4)] }, { c: [1, 0, frac(-1, 2), 0, frac(1, 24)] }] },
    { tex: R`\dfrac{1}{1 + x^{2}}`, f: (x) => 1 / (1 + x * x), c: [1, 0, -1, 0, 1], known: basic.geo, sub: R`u = -x^{2}`, w: [{ c: [1, 0, 1, 0, 1], why: R`\(1 + x^{2} = 1 - u\) with \(u = -x^{2}\), so the signs alternate.` }, { c: [1, -1, 1], why: R`Replace \(u\) by \(-x^{2}\) in every term: the powers are \(x^{2}, x^{4}, \dots\)` }, { c: [1, 0, -1, 0, h] }, { c: [1, 0, -1, 0, -1] }] },
    { tex: R`\dfrac{1}{1 - ${k}x}`, f: (x) => 1 / (1 - k * x), c: [1, k, k * k], known: basic.geo, sub: `u = ${k}x`, w: [{ c: [1, k, k], why: power2 }, { c: [1, -k, k * k], why: R`With \(u = ${k}x\), every term of \(1 + u + u^{2} + \cdots\) keeps its plus sign.` }, { c: [1, 1, 1] }, { c: [1, k, frac(k * k, 2)] }] },
    { tex: R`x^{2}\cos x`, f: (x) => x * x * Math.cos(x), c: [0, 0, 1, 0, h.neg(), 0, frac(1, 24)], known: basic.cos, sub: 'u = x', times: 'x^{2}', w: [{ c: [1, 0, h.neg(), 0, frac(1, 24)], why: R`That is the series for \(\cos x\). Multiply every term by \(x^{2}\).` }, { c: [0, 0, 1, 0, frac(-1, 24), 0, frac(1, 720)], why: R`Multiplying by \(x^{2}\) raises each power by 2, but the factorials stay as they were.` }, { c: [0, 0, 1, 0, h, 0, frac(1, 24)] }, { c: [0, 0, 1, 0, frac(-1, 6), 0, frac(1, 120)] }] },
    { tex: R`\dfrac{\sin x}{x}`, f: (x) => (x === 0 ? 1 : Math.sin(x) / x), c: [1, 0, frac(-1, 6), 0, frac(1, 120)], known: basic.sin, sub: 'u = x', times: R`\dfrac{1}{x}`, w: [{ c: [0, 1, 0, frac(-1, 6), 0, frac(1, 120)], why: R`That is the series for \(\sin x\). Divide every term by \(x\).` }, { c: [1, 0, h.neg(), 0, frac(1, 24)], why: R`Dividing by \(x\) lowers each power by 1, but the factorials stay as they were.` }, { c: [1, 0, frac(1, 6), 0, frac(1, 120)] }, { c: [1, 0, frac(-1, 3), 0, frac(1, 5)] }] },
  ]);
  return q({
    prompt: R`Use a known Maclaurin series to find the first three nonzero terms of the Maclaurin series for \(f(x) = ${it.tex}\).`,
    ...polyChoices(it.c, it.w, 0, R` + \cdots`),
    solution: [R`Start from \(${it.known}\).`, it.sub === 'u = x' ? R`Multiply every term by \(${it.times}\).` : R`Substitute \(${it.sub}\) and simplify each term${it.times ? R`, then multiply every term by \(${it.times}\)` : ''}.`, R`\(f(x) = ${tay(it.c)} + \cdots\)`],
    rule: 2,
    skill: 'series by substitution',
    check: () => checkTaylor(it.f, it.c.map(val)),
  });
}

function mediumRadius(rng) {
  const a = rng.int(-5, 5);
  const c = rng.int(2, 6);
  const [sq, root] = rng.pick([[4, 2], [9, 3], [16, 4], [25, 5]]);
  const u = base(a);
  const un = pw(u, 'n');
  const lc = Math.log(c);
  // lc(n) = ln|coefficient|, step = how fast the power of x grows, R = the radius (a number or Infinity).
  const it = rng.pick([
    { tex: R`\frac{${un}}{${c}^{n}}`, lc: (n) => -n * lc, R: c, ratio: R`\dfrac{|${linear(1, -a)}|}{${c}}` },
    { tex: R`\frac{n\,${un}}{${c}^{n}}`, lc: (n) => Math.log(n) - n * lc, R: c, ratio: R`\dfrac{n+1}{n} \cdot \dfrac{|${linear(1, -a)}|}{${c}} \to \dfrac{|${linear(1, -a)}|}{${c}}`, from: 1 },
    { tex: R`\frac{${un}}{n \cdot ${c}^{n}}`, lc: (n) => -Math.log(n) - n * lc, R: c, ratio: R`\dfrac{n}{n+1} \cdot \dfrac{|${linear(1, -a)}|}{${c}} \to \dfrac{|${linear(1, -a)}|}{${c}}`, from: 1 },
    { tex: R`\frac{${c}^{n}\,${un}}{n^{2}}`, lc: (n) => n * lc - 2 * Math.log(n), R: frac(1, c), ratio: R`${c}\left(\dfrac{n}{n+1}\right)^{2}|${linear(1, -a)}| \to ${c}|${linear(1, -a)}|`, from: 1 },
    { tex: R`\frac{${un}}{n!}`, lc: (n) => -logFact(n), R: Infinity, ratio: R`\dfrac{|${linear(1, -a)}|}{n+1} \to 0` },
    { tex: R`n!\,${un}`, lc: (n) => logFact(n), R: 0, ratio: R`(n+1)|${linear(1, -a)}| \to \infty` },
    { tex: R`\frac{(-1)^{n}x^{2n}}{${sq}^{n}}`, lc: (n) => -n * Math.log(sq), R: root, step: 2, ratio: R`\dfrac{x^{2}}{${sq}}` },
  ]);
  const { step = 1 } = it;
  const rT = (v) => R`\(R = ${v === Infinity ? '\\infty' : num(v)}\)`;
  const finite = it.R !== Infinity && it.R !== 0;
  const inv = finite ? F(it.R).inv() : null;
  const centre = a === 0 || step === 2 ? '' : R` (the series is centred at \(x = ${a}\))`;
  // ln|term n| at distance d from the centre: very negative means the terms die out, very positive means they blow up.
  const size = (d, n) => it.lc(n) + n * step * Math.log(d);
  return q({
    prompt: R`Find the radius of convergence \(R\) of the power series \(${sig(it.tex, it.from ?? 0)}\).`,
    correct: rT(it.R),
    wrong:
      it.R === Infinity
        ? [{ value: rT(0), why: R`The ratio approaches 0 for every \(x\), and \(0 < 1\) always. So the series converges everywhere.` }, { value: rT(1), why: 'The factorial in the denominator makes the ratio approach 0, not |x|.' }, rT(a === 0 ? 2 : Math.abs(a)), rT(frac(1, 2))]
        : it.R === 0
          ? [{ value: rT(Infinity), why: R`The ratio grows without bound unless \(x = ${a}\). So the series converges only at its centre.` }, { value: rT(1), why: 'The factorial makes the ratio grow without bound, so it is never less than 1.' }, rT(a === 0 ? 2 : Math.abs(a)), rT(frac(1, 2))]
          : [
              step === 2 ? { value: rT(sq), why: R`The ratio contains \(x^{2}\): \(\frac{x^{2}}{${sq}} < 1\) means \(|x| < ${root}\).` } : { value: rT(inv), why: R`The series converges when \(|${linear(1, -a)}| < ${num(it.R)}\), so that number is the radius.` },
              { value: rT(1), why: 'The constant in the ratio changes the radius.' },
              rT(Infinity),
              rT(0),
            ],
    solution: [
      R`Ratio test: \(\left|\dfrac{a_{n+1}}{a_n}\right| = ${it.ratio}\).`,
      it.R === Infinity ? R`The limit is \(0 < 1\) for every \(x\), so the series converges for all \(x\).` : it.R === 0 ? R`The limit is infinite for every \(x \ne ${a}\), so the series converges only at \(x = ${a}\).` : step === 2 ? R`The series converges when \(\dfrac{x^{2}}{${sq}} < 1\), that is, when \(|x| < ${root}\).` : R`The series converges when this limit is less than 1, that is, when \(|${linear(1, -a)}| < ${num(it.R)}\)${centre}.`,
      R`So \(R = ${it.R === Infinity ? '\\infty' : num(it.R)}\).`,
    ],
    rule: 3,
    skill: 'radius of convergence',
    check: () => {
      if (it.R === Infinity) return size(1000, 5000) < -100 ? true : 'the terms do not die out far from the centre';
      if (it.R === 0) return size(0.001, 5000) > 100 ? true : 'the terms do not blow up near the centre';
      const Rv = val(it.R);
      return size(0.9 * Rv, 3000) < -100 && size(1.1 * Rv, 3000) > 100 ? true : 'the terms do not change behaviour at the stated radius';
    },
  });
}

// ───────────── Hard ─────────────

function hardInterval(rng) {
  const a = rng.int(-5, 5);
  const c = rng.int(2, 5);
  const un = pw(base(a), 'n');
  const [lo, hi] = [a - c, a + c];
  const harm = R`\sum \frac{1}{n}`;
  const altHarm = R`\sum \frac{(-1)^{n}}{n}`;
  const ast = 'which converges by the alternating series test';
  const nth = 'whose terms do not approach 0, so it diverges';
  // b(n) = size of the term at an endpoint; `alt` tells whether the series itself carries the factor (−1)ⁿ.
  // right / left = [the series at x = a + c / x = a − c, why, does it converge?]
  const it = rng.pick([
    { tex: R`\frac{${un}}{n \cdot ${c}^{n}}`, b: (n) => 1 / n, alt: false, from: 1, right: [harm, 'the harmonic series, which diverges', false], left: [altHarm, ast, true] },
    { tex: R`\frac{(-1)^{n}${un}}{n \cdot ${c}^{n}}`, b: (n) => 1 / n, alt: true, from: 1, right: [altHarm, ast, true], left: [harm, 'the harmonic series, which diverges', false] },
    { tex: R`\frac{${un}}{n^{2} \cdot ${c}^{n}}`, b: (n) => 1 / (n * n), alt: false, from: 1, right: [R`\sum \frac{1}{n^{2}}`, R`a convergent p-series (\(p = 2\))`, true], left: [R`\sum \frac{(-1)^{n}}{n^{2}}`, 'which converges absolutely', true] },
    { tex: R`\frac{n\,${un}}{${c}^{n}}`, b: (n) => n, alt: false, from: 1, right: [R`\sum n`, nth, false], left: [R`\sum (-1)^{n}n`, nth, false] },
    { tex: R`\frac{${un}}{${c}^{n}}`, b: () => 1, alt: false, from: 0, right: [R`\sum 1`, nth, false], left: [R`\sum (-1)^{n}`, nth, false] },
    { tex: R`\frac{${un}}{\sqrt{n} \cdot ${c}^{n}}`, b: (n) => 1 / Math.sqrt(n), alt: false, from: 1, right: [R`\sum \frac{1}{\sqrt{n}}`, R`a divergent p-series (\(p = \frac{1}{2}\))`, false], left: [R`\sum \frac{(-1)^{n}}{\sqrt{n}}`, ast, true] },
    { tex: R`\frac{(-1)^{n}${un}}{\sqrt{n} \cdot ${c}^{n}}`, b: (n) => 1 / Math.sqrt(n), alt: true, from: 1, right: [R`\sum \frac{(-1)^{n}}{\sqrt{n}}`, ast, true], left: [R`\sum \frac{1}{\sqrt{n}}`, R`a divergent p-series (\(p = \frac{1}{2}\))`, false] },
  ]);
  const [atRight, atLeft] = [it.right[2], it.left[2]];
  const show = (L, Rr) => R`\(${L ? '[' : '('}${lo}, ${hi}${Rr ? ']' : ')'}\)`;
  const end = (x, [series, verdict], yes) => R`At \(x = ${x}\) the series is \(${series}\), ${verdict}. So \(x = ${x}\) is ${yes ? 'included' : 'not included'}.`;
  const wrong = [[!atLeft, atRight], [atLeft, !atRight], [!atLeft, !atRight]].map(([L, Rr]) => ({ value: show(L, Rr), why: L !== atLeft && Rr !== atRight ? 'Test each endpoint separately by substituting it into the series.' : L !== atLeft ? end(lo, it.left, atLeft) : end(hi, it.right, atRight) }));
  return q({
    prompt: R`Find the interval of convergence of \(${sig(it.tex, it.from)}\).`,
    correct: show(atLeft, atRight),
    wrong,
    solution: [
      R`The ratio test gives \(L = \dfrac{|${linear(1, -a)}|}{${c}}\), so the series converges when \(|${linear(1, -a)}| < ${c}\), that is, for \(${lo} < x < ${hi}\). The endpoints need separate tests.`,
      end(hi, it.right, atRight),
      end(lo, it.left, atLeft),
      R`Interval of convergence: \(${show(atLeft, atRight).slice(2, -2)}\).`,
    ],
    rule: 3,
    skill: 'interval of convergence',
    // At x = a + c the factor ((x − a)/c)ⁿ is 1; at x = a − c it is (−1)ⁿ. Numeric evidence must agree with the key at both ends.
    check: () => (endpointConverges(it.b, it.alt) === atRight && endpointConverges(it.b, !it.alt) === atLeft ? true : 'numeric evidence at an endpoint disagrees with the key'),
  });
}

function hardLagrange(rng) {
  const [p, s] = rng.pick([[1, 2], [1, 4], [1, 5], [1, 10], [2, 5], [3, 10], [1, 3]]);
  const d = frac(p, s); // distance from the centre
  const kind = rng.pick(['sin', 'cos', 'exp', 'abstract']);
  const who = rng.pick(['An engineer', 'A programmer', 'A physics student', 'A surveyor']);
  const M = kind === 'exp' ? 3 : kind === 'abstract' ? rng.int(2, 9) : 1;
  // For sine an even degree and for cosine an odd degree: then no sharper bound comes from a "free" extra degree.
  let n = kind === 'sin' ? rng.pick([2, 4]) : kind === 'cos' ? rng.pick([1, 3]) : rng.int(1, 4);
  const boundFor = (deg) => d.pow(deg + 1).mul(M).div(factorial(deg + 1));
  while (boundFor(n).d > 99999 && n > 2) n -= kind === 'sin' || kind === 'cos' ? 2 : 1; // keep the numbers readable
  const fact = factorial(n + 1);
  const bound = boundFor(n);
  const x0 = d.value;
  const ask = R`What is the Lagrange error bound for this approximation?`;
  let prompt;
  let reason;
  let check;
  if (kind === 'sin' || kind === 'cos') {
    const sine = kind === 'sin';
    const coef = (j) => (sine ? (j % 2 ? (j % 4 === 1 ? 1 : -1) / factorial(j) : 0) : j % 2 ? 0 : (j % 4 === 0 ? 1 : -1) / factorial(j));
    const g = sine ? Math.sin : Math.cos;
    prompt = R`${who} approximates \(${sine ? R`\sin` : R`\cos`}\left(${d.tex()}\right)\) with \(P_{${n}}\), the Maclaurin polynomial of degree ${n} for \(${sine ? R`\sin x` : R`\cos x`}\). Every derivative of this function is at most 1 in size, so \(M = 1\). ${ask}`;
    reason = R`Here \(n = ${n}\), \(M = 1\) and the distance from the centre is \(|x - a| = ${d.tex()}\).`;
    check = () => (Math.abs(g(x0) - at(range(0, n).map(coef), x0)) <= bound.value + 1e-15 ? true : 'the actual error is larger than the bound');
  } else if (kind === 'exp') {
    prompt = R`${who} approximates \(e^{${p}/${s}}\) with \(P_{${n}}\), the Maclaurin polynomial of degree ${n} for \(e^{x}\). On \([0, 1]\) every derivative of \(e^{x}\) is less than 3, so use \(M = 3\). ${ask}`;
    reason = R`Here \(n = ${n}\), \(M = 3\) and the distance from the centre is \(|x - a| = ${d.tex()}\).`;
    check = () => (Math.abs(Math.exp(x0) - at(range(0, n).map((j) => 1 / factorial(j)), x0)) <= bound.value ? true : 'the actual error is larger than the bound');
  } else {
    const a = rng.int(1, 4);
    const target = d.add(a);
    prompt = R`A function \(f\) satisfies \(|f^{(${n + 1})}(x)| \le ${M}\) for all \(x\). Its Taylor polynomial \(P_{${n}}\) of degree ${n} about \(x = ${a}\) is used to approximate \(f\left(${target.tex()}\right)\). ${ask}`;
    reason = R`Here \(n = ${n}\) and \(M = ${M}\). The distance from the centre is \(|x - a| = ${target.tex()} - ${a} = ${d.tex()}\).`;
    // g(x) = M(x − a)^(n+1)/(n+1)! meets the hypothesis exactly, and its Taylor polynomial of degree n is 0 (its value and
    // first n derivatives vanish at a). So for this function the error is |g(x)|, and it must equal the bound.
    const g = (x) => (M * (x - a) ** (n + 1)) / fact;
    check = () => first(...range(0, n).map((k) => checkEqual(nthDeriv(g, a, k), 0, 1e-3, `derivative ${k} at the centre`)), checkEqual(Math.abs(g(target.value)), bound.value, 1e-12, 'bound'));
  }
  return q({
    prompt,
    ...exactChoices(N(bound), [
      { k: N(d.pow(n).mul(M).div(factorial(n))), why: R`The bound uses the next derivative: the power and the factorial are both \(n + 1 = ${n + 1}\), not \(${n}\).` },
      { k: N(d.pow(n + 1).mul(M).div(factorial(n))), why: R`Divide by \((n + 1)! = ${num(fact)}\), not by \(n! = ${num(factorial(n))}\).` },
      { k: N(d.pow(n + 1).mul(M)), why: R`Divide by \((n + 1)! = ${num(fact)}\) as well.` },
      N(d.pow(n).mul(M).div(fact)),
      N(bound.div(M === 1 ? 2 : M)),
    ]),
    solution: [
      R`Lagrange error bound: \(|f(x) - P_n(x)| \le \dfrac{M\,|x - a|^{n+1}}{(n+1)!}\), where \(M\) bounds \(|f^{(n+1)}|\) between \(a\) and \(x\).`,
      reason,
      R`\(\dfrac{${M === 1 ? '' : `${M} \\cdot `}\left(${d.tex()}\right)^{${n + 1}}}{${n + 1}!} = \dfrac{${M === 1 ? '' : `${M} \\cdot `}${d.pow(n + 1).tex()}}{${num(fact)}} = ${bound.tex()}\).`,
    ],
    rule: 4,
    skill: 'Lagrange error bound',
    check,
  });
}

function hardNewSeries(rng) {
  const third = frac(1, 3);
  const intOf = (g) => (x) => integrate(g, 0, x, 400);
  const termwise = 'Integrate term by term: each power goes up by 1 and is divided by its new exponent.';
  const it = rng.pick([
    { tex: R`\displaystyle\int_{0}^{x} e^{-t^{2}}\,dt`, f: intOf((t) => Math.exp(-t * t)), c: [0, 1, 0, third.neg(), 0, frac(1, 10)], from: R`e^{-t^{2}} = 1 - t^{2} + \dfrac{t^{4}}{2} - \cdots`, how: termwise, w: [{ c: [0, 1, 0, -1, 0, frac(1, 2)], why: R`Dividing by the new exponent is part of integrating: \(\int t^{2}\,dt = \frac{t^{3}}{3}\).` }, { c: [1, 0, -1, 0, frac(1, 2)], why: 'That is the series of the integrand. It still has to be integrated.' }, { c: [0, 1, 0, third.neg(), 0, frac(1, 5)] }, { c: [0, 1, 0, third, 0, frac(1, 10)] }] },
    { tex: R`\displaystyle\int_{0}^{x} \frac{dt}{1 + t^{2}}`, f: Math.atan, c: [0, 1, 0, third.neg(), 0, frac(1, 5)], from: R`\dfrac{1}{1 + t^{2}} = 1 - t^{2} + t^{4} - \cdots`, how: termwise, w: [{ c: [0, 1, 0, -1, 0, 1], why: R`Dividing by the new exponent is part of integrating: \(\int t^{2}\,dt = \frac{t^{3}}{3}\).` }, { c: [1, 0, -1, 0, 1], why: 'That is the series of the integrand. It still has to be integrated.' }, { c: [0, 1, 0, frac(-1, 6), 0, frac(1, 120)] }, { c: [0, 1, 0, third, 0, frac(1, 5)] }] },
    { tex: R`\displaystyle\int_{0}^{x} \frac{dt}{1 + t}`, f: Math.log1p, c: [0, 1, frac(-1, 2), third], from: R`\dfrac{1}{1 + t} = 1 - t + t^{2} - \cdots`, how: termwise, w: [{ c: [0, 1, -1, 1], why: R`Dividing by the new exponent is part of integrating: \(\int t\,dt = \frac{t^{2}}{2}\).` }, { c: [1, -1, 1], why: 'That is the series of the integrand. It still has to be integrated.' }, { c: [0, 1, frac(-1, 2), frac(1, 6)] }, { c: [0, 1, frac(1, 2), third] }] },
    { tex: R`\displaystyle\int_{0}^{x} \frac{\sin t}{t}\,dt`, f: intOf((t) => (t === 0 ? 1 : Math.sin(t) / t)), c: [0, 1, 0, frac(-1, 18), 0, frac(1, 600)], from: R`\dfrac{\sin t}{t} = 1 - \dfrac{t^{2}}{6} + \dfrac{t^{4}}{120} - \cdots`, how: termwise, w: [{ c: [0, 1, 0, frac(-1, 6), 0, frac(1, 120)], why: R`That is the series for \(\sin x\). Divide by \(t\) first, then integrate each term.` }, { c: [1, 0, frac(-1, 6), 0, frac(1, 120)], why: 'That is the series of the integrand. It still has to be integrated.' }, { c: [0, 1, 0, frac(-1, 12), 0, frac(1, 480)] }, { c: [0, 1, 0, frac(1, 18), 0, frac(1, 600)] }] },
    { tex: R`\displaystyle\int_{0}^{x} \frac{e^{t} - 1}{t}\,dt`, f: intOf((t) => (t === 0 ? 1 : Math.expm1(t) / t)), c: [0, 1, frac(1, 4), frac(1, 18)], from: R`\dfrac{e^{t} - 1}{t} = 1 + \dfrac{t}{2} + \dfrac{t^{2}}{6} + \cdots`, how: termwise, w: [{ c: [0, 1, frac(1, 2), frac(1, 6)], why: R`That is the series for \(e^{x} - 1\). Divide by \(t\) first, then integrate each term.` }, { c: [1, frac(1, 2), frac(1, 6)], why: 'That is the series of the integrand. It still has to be integrated.' }, { c: [0, 1, frac(1, 2), frac(1, 3)] }, { c: [0, 1, frac(1, 4), frac(1, 12)] }] },
    { tex: R`\dfrac{d}{dx}\left[\dfrac{1}{1 - x}\right] = \dfrac{1}{(1 - x)^{2}}`, f: (x) => 1 / (1 - x) ** 2, c: [1, 2, 3], from: R`\dfrac{1}{1 - x} = 1 + x + x^{2} + x^{3} + \cdots`, how: 'Differentiate term by term: each exponent comes down as a factor and the power drops by 1.', w: [{ c: [1, 1, 1], why: 'That is the original series. Each term still has to be differentiated.' }, { c: [0, 1, 2, 3], why: R`Differentiating lowers each power by 1: \(\frac{d}{dx}x^{2} = 2x\).` }, { c: [1, frac(1, 2), frac(1, 3)], why: 'That divides by the exponents, which is what integration does.' }, { c: [1, 2, 4] }] },
    { tex: R`\dfrac{x}{(1 - x)^{2}}`, f: (x) => x / (1 - x) ** 2, c: [0, 1, 2, 3], from: R`\dfrac{1}{1 - x} = 1 + x + x^{2} + x^{3} + \cdots`, how: R`Differentiate term by term to get \(\dfrac{1}{(1 - x)^{2}} = 1 + 2x + 3x^{2} + \cdots\), then multiply every term by \(x\).`, w: [{ c: [1, 2, 3], why: R`That is the series for \(\dfrac{1}{(1 - x)^{2}}\). Multiply every term by \(x\).` }, { c: [0, 1, 1, 1], why: R`That is \(\dfrac{x}{1 - x}\). The square in the denominator comes from differentiating the geometric series.` }, { c: [0, 1, 2, 4] }, { c: [0, 1, frac(1, 2), frac(1, 3)] }] },
    { tex: R`\displaystyle\int_{0}^{x} \frac{dt}{1 - t^{3}}`, f: intOf((t) => 1 / (1 - t ** 3)), c: [0, 1, 0, 0, frac(1, 4), 0, 0, frac(1, 7)], from: R`\dfrac{1}{1 - t^{3}} = 1 + t^{3} + t^{6} + \cdots`, how: termwise, w: [{ c: [0, 1, 0, 0, 1, 0, 0, 1], why: R`Dividing by the new exponent is part of integrating: \(\int t^{3}\,dt = \frac{t^{4}}{4}\).` }, { c: [1, 0, 0, 1, 0, 0, 1], why: 'That is the series of the integrand. It still has to be integrated.' }, { c: [0, 1, 0, 0, frac(1, 3), 0, 0, frac(1, 6)] }, { c: [0, 1, 0, 0, frac(-1, 4), 0, 0, frac(1, 7)] }] },
  ]);
  return q({
    prompt: R`Find the first three nonzero terms of the Maclaurin series for \(f(x) = ${it.tex}\).`,
    ...polyChoices(it.c, it.w, 0, R` + \cdots`),
    solution: [R`Start from a known series: \(${it.from}\)`, it.how, R`\(f(x) = ${tay(it.c)} + \cdots\)`],
    rule: 2,
    skill: 'differentiating and integrating series',
    check: () => checkTaylor(it.f, it.c.map(val)),
  });
}

// ───────────── Challenge ─────────────

function challengeLimit(rng) {
  const k = rng.int(1, 4);
  const kx = k === 1 ? 'x' : `${k}x`;
  const k2 = k === 1 ? 'x^{2}' : `${k * k}x^{2}`;
  const it = rng.pick([
    { tex: R`\dfrac{\sin(${kx}) - ${kx}}{x^{3}}`, g: (x) => (Math.sin(k * x) - k * x) / x ** 3, L: frac(-(k ** 3), 6), series: R`\sin(${kx}) = ${kx} - \dfrac{${k ** 3 === 1 ? '' : k ** 3}x^{3}}{6} + \cdots`, miss: frac(-(k ** 3)), small: frac(-k, 6) },
    { tex: R`\dfrac{e^{${kx}} - 1 - ${kx}}{x^{2}}`, g: (x) => (Math.expm1(k * x) - k * x) / (x * x), L: frac(k * k, 2), series: R`e^{${kx}} = 1 + ${kx} + \dfrac{${k2}}{2} + \cdots`, miss: frac(k * k), small: frac(k, 2) },
    { tex: R`\dfrac{1 - \cos(${kx})}{x^{2}}`, g: (x) => (2 * Math.sin((k * x) / 2) ** 2) / (x * x), L: frac(k * k, 2), series: R`\cos(${kx}) = 1 - \dfrac{${k2}}{2} + \cdots`, miss: frac(k * k), small: frac(k, 2) },
    { tex: R`\dfrac{\ln(1 + ${kx}) - ${kx}}{x^{2}}`, g: (x) => (Math.log1p(k * x) - k * x) / (x * x), L: frac(-k * k, 2), series: R`\ln(1 + ${kx}) = ${kx} - \dfrac{${k2}}{2} + \cdots`, miss: frac(-k * k), small: frac(-k, 2) },
    { tex: R`\dfrac{${kx} - \arctan(${kx})}{x^{3}}`, g: (x) => (k * x - Math.atan(k * x)) / x ** 3, L: frac(k ** 3, 3), series: R`\arctan(${kx}) = ${kx} - \dfrac{${k ** 3 === 1 ? '' : k ** 3}x^{3}}{3} + \cdots`, miss: frac(k ** 3), small: frac(k, 3) },
    { tex: R`\dfrac{${kx}\cos(${kx}) - \sin(${kx})}{x^{3}}`, g: (x) => (k * x * Math.cos(k * x) - Math.sin(k * x)) / x ** 3, L: frac(-(k ** 3), 3), series: R`${kx}\cos(${kx}) = ${kx} - \dfrac{${k ** 3 === 1 ? '' : k ** 3}x^{3}}{2} + \cdots \text{ and } \sin(${kx}) = ${kx} - \dfrac{${k ** 3 === 1 ? '' : k ** 3}x^{3}}{6} + \cdots`, miss: frac(-(k ** 3), 2), small: frac(-k, 3) },
  ]);
  return q({
    prompt: R`Use Maclaurin series to evaluate \(\displaystyle\lim_{x\to 0} ${it.tex}\).`,
    ...exactChoices(N(it.L), [
      { k: N(it.L.neg()), why: 'Check the signs when the series is substituted into the numerator.' },
      { k: N(it.miss), why: R`Check the coefficient of the first power of \(x\) that does not cancel in the numerator.` },
      k > 1 ? { k: N(it.small), why: R`The factor \(${k}\) is raised to the same power as \(x\).` } : null,
      { k: N(0), why: R`The numerator and the denominator approach 0 at the same rate, so the limit is not 0.` },
      { k: 'The limit does not exist', why: 'The leading terms of the numerator cancel, and what is left is divisible by the denominator.' },
      N(it.L.mul(2)),
    ]),
    solution: [
      R`Replace the function by its Maclaurin series: \(${it.series}\)`,
      R`The low-order terms of the numerator cancel. Divide what is left by the denominator: the quotient is \(${it.L.tex()}\) plus terms that contain \(x\).`,
      R`As \(x \to 0\) those terms vanish, so the limit is \(${it.L.tex()}\).`,
    ],
    rule: 2,
    skill: 'limits with series',
    check: () => ([1e-4, -1e-4].every((x) => Math.abs(it.g(x) - it.L.value) < 1e-3 * Math.max(1, Math.abs(it.L.value))) ? true : 'the values near 0 do not approach the stated limit'),
  });
}

function challengeRecognizeSum(rng) {
  const k = rng.int(2, 5);
  const E = (j) => K([[1, `e^{${j}}`]]);
  const pi = (d) => (d === 1 ? R`\pi` : R`\left(\frac{\pi}{${d}}\right)`);
  const root3 = K([[frac(1, 2), '\\sqrt{3}']]);
  const it = rng.pick([
    { tex: R`\frac{${k}^{n}}{n!}`, from: 0, term: (n) => k ** n / factorial(n), sum: E(k), fn: 'e^{x}', x: `${k}`, wrongs: [{ k: K([[1, `e^{${k}}`], [-1, '']]), why: R`That would be the sum starting at \(n = 1\). This series includes the term \(n = 0\), which is 1.` }, K([[k, 'e']]), E(-k), N(frac(k, k - 1)), K([[1, `e^{${k}}`], [1, '']])] },
    { tex: R`\frac{${k}^{n}}{n!}`, from: 1, term: (n) => k ** n / factorial(n), sum: K([[1, `e^{${k}}`], [-1, '']]), fn: 'e^{x}', x: `${k}`, less: '1', wrongs: [{ k: E(k), why: R`\(e^{${k}}\) is the sum starting at \(n = 0\). This series starts at \(n = 1\), so the first term, 1, is missing.` }, K([[1, `e^{${k}}`], [1, '']]), K([[k, 'e']]), E(-k), K([[1, `e^{${k}}`], [-k, '']])] },
    { tex: R`\frac{(-${k})^{n}}{n!}`, from: 0, term: (n) => (-k) ** n / factorial(n), sum: E(-k), fn: 'e^{x}', x: `-${k}`, wrongs: [{ k: E(k), why: R`The terms alternate in sign, so \(x = -${k}\), not \(${k}\).` }, K([[-1, `e^{${k}}`]]), K([[-k, 'e']]), N(frac(1, k + 1)), N(0)] },
    { tex: R`\frac{(\ln ${k})^{n}}{n!}`, from: 0, term: (n) => Math.log(k) ** n / factorial(n), sum: N(k), fn: 'e^{x}', x: R`\ln ${k}`, wrongs: [{ k: K([[1, `\\ln ${k}`]]), why: R`The sum is \(e^{x}\) with \(x = \ln ${k}\), and \(e^{\ln ${k}} = ${k}\).` }, E(k), N(k - 1), N(frac(1, k)), K([[k, 'e']])] },
    // [cosine?, x = π/d, the sum, the value of the other function at the same x]
    ...[[true, 1, N(-1), N(0)], [true, 2, N(0), N(1)], [true, 3, N(frac(1, 2)), root3], [false, 2, N(1), N(0)], [false, 1, N(0), N(-1)], [false, 6, N(frac(1, 2)), root3]].map(([cosine, d, sum, other]) => {
      const e = cosine ? '2n' : '2n+1';
      const x = d === 1 ? R`\pi` : R`\frac{\pi}{${d}}`;
      return {
        tex: R`\frac{(-1)^{n}${pi(d)}^{${e}}}{(${e})!}`, from: 0, term: (n) => ((-1) ** n * (Math.PI / d) ** (cosine ? 2 * n : 2 * n + 1)) / factorial(cosine ? 2 * n : 2 * n + 1), sum, fn: cosine ? R`\cos x` : R`\sin x`, x,
        wrongs: [{ k: other, why: cosine ? R`That is \(\sin ${x}\). The even powers and \((2n)!\) show that this is the cosine series.` : R`That is \(\cos ${x}\). The odd powers and \((2n+1)!\) show that this is the sine series.` }, K([[1, d === 1 ? 'e^{\\pi}' : `e^{\\pi/${d}}`]]), N(1), N(-1), N(frac(-1, 2)), N(2)],
      };
    }),
  ]);
  return q({
    prompt: R`Find the sum of the series \(${sig(it.tex, it.from)}\).`,
    ...exactChoices(it.sum, it.wrongs),
    solution: [
      R`Compare with a known Maclaurin series. The series for \(${it.fn}\) has exactly this form, with \(x = ${it.x}\).`,
      it.less ? R`The given series starts at \(n = 1\), so the term for \(n = 0\), which is \(${it.less}\), must be subtracted.` : R`The series starts at \(n = 0\), so nothing is missing.`,
      R`The sum is \(${it.sum.tex}\).`,
    ],
    rule: 1,
    skill: 'recognising a known series',
    check: () => checkEqual(partialSum(it.term, it.from, 60), it.sum.value, 1e-9, 'sum'),
  });
}

function challengeConvergenceInfo(rng) {
  const a = rng.int(-3, 3);
  const r1 = rng.int(2, 4);
  const r2 = r1 + rng.int(1, 3);
  const s = rng.sign();
  const p = a + s * r1; // converges here
  const qd = a - s * r2; // diverges here
  const dist = (x) => Math.abs(x - a);
  const must = rng.pick(['converge', 'diverge']);
  const inside = a - s * rng.int(1, r1 - 1);
  const mirrorP = a - s * r1;
  const between = r2 - r1 > 1 ? a + s * (r1 + 1) : null;
  const mirrorQ = a + s * r2;
  const beyond = a + s * (r2 + rng.int(1, 2));
  const X = (x) => R`\(x = ${x}\)`;
  const unknown = R`The radius of convergence \(R\) satisfies \(${r1} \le R \le ${r2}\), and this point is \(${'D'}\) from the centre, so the data do not decide it.`;
  const note = (x) => unknown.replace('D', `${dist(x)}`);
  const correct = must === 'converge' ? inside : beyond;
  const wrong =
    must === 'converge'
      ? [{ value: X(mirrorP), why: R`This point is exactly \(${r1}\) from the centre, like \(x = ${p}\). Convergence at one endpoint says nothing about the other endpoint.` }, between === null ? null : { value: X(between), why: note(between) }, { value: X(mirrorQ), why: note(mirrorQ) }, { value: X(beyond), why: R`This point is \(${dist(beyond)}\) from the centre, farther than \(x = ${qd}\), where the series already diverges.` }]
      : [{ value: X(mirrorQ), why: R`This point is exactly \(${r2}\) from the centre, like \(x = ${qd}\). Divergence at one endpoint says nothing about the other endpoint.` }, between === null ? null : { value: X(between), why: note(between) }, { value: X(mirrorP), why: note(mirrorP) }, { value: X(inside), why: R`This point is \(${dist(inside)}\) from the centre, closer than \(x = ${p}\), so the series converges there.` }];
  // Two extreme series that fit the data: one whose interval ends at the point of convergence p, one that reaches as far as allowed.
  const smallConv = (x) => dist(x) < r1 || x === p;
  const largeConv = (x) => dist(x) < r2 || (dist(x) === r2 && x !== qd);
  const forced = (x) => (must === 'converge' ? smallConv(x) && largeConv(x) : !smallConv(x) && !largeConv(x));
  return q({
    prompt: R`A power series \(${sig(`c_n${pw(base(a), 'n')}`)}\) converges at \(x = ${p}\) and diverges at \(x = ${qd}\). At which of these values of \(x\) must the series ${must}?`,
    correct: X(correct),
    wrong,
    solution: [
      R`The series is centred at \(x = ${a}\). It converges at a point \(${r1}\) from the centre and diverges at a point \(${r2}\) from the centre, so its radius of convergence satisfies \(${r1} \le R \le ${r2}\).`,
      R`It must converge wherever \(|${linear(1, -a)}| < ${r1}\) and must diverge wherever \(|${linear(1, -a)}| > ${r2}\). Nothing else is certain.`,
      R`\(x = ${correct}\) is \(${dist(correct)}\) from the centre, so the series must ${must} there.`,
    ],
    rule: 3,
    skill: 'radius of convergence',
    check: () => (forced(correct) && [mirrorP, mirrorQ, between, must === 'converge' ? beyond : inside].filter((x) => x !== null).every((x) => !forced(x)) ? true : 'the key is not the only forced value'),
  });
}

// ───────────── Topic ─────────────

const FUNCS = {
  exp: { tex: 'e^{x}', label: 'eˣ', f: Math.exp, coef: (j) => frac(1, factorial(j)), M: (x) => Math.exp(Math.max(x, 0)), MT: (x) => (x > 0 ? R`e^{${num(x)}}` : '1') },
  sin: { tex: R`\sin x`, label: 'sin x', f: Math.sin, coef: (j) => (j % 2 ? frac(j % 4 === 1 ? 1 : -1, factorial(j)) : frac(0)), M: () => 1, MT: () => '1' },
  cos: { tex: R`\cos x`, label: 'cos x', f: Math.cos, coef: (j) => (j % 2 ? frac(0) : frac(j % 4 === 0 ? 1 : -1, factorial(j))), M: () => 1, MT: () => '1' },
};
const FUNC_OPTIONS = [{ value: 'exp', label: 'eˣ' }, { value: 'sin', label: 'sin x' }, { value: 'cos', label: 'cos x' }];

export default {
  id: 'taylor-series',
  title: 'Power Series & Taylor Series',
  summary: 'Build Taylor polynomials and series, bound their error, and find where a power series converges.',
  standards: ['AP Calculus 10.11', 'AP Calculus 10.12', 'AP Calculus 10.13', 'AP Calculus 10.14', 'AP Calculus 10.15'],

  explain: {
    intro: R`A Taylor polynomial copies a function near one point: it has the same value and the same first few derivatives there. Letting the degree grow gives a **Taylor series**, a power series \(\sum c_n(x - a)^{n}\). Two questions matter for every power series: for which \(x\) does it converge, and how large is the error when only a few terms are used?`,
    rules: [
      {
        title: 'Taylor polynomials',
        text: R`The Taylor polynomial of degree \(n\) for \(f\) about \(x = a\) is \(P_n(x) = f(a) + f'(a)(x - a) + \dfrac{f''(a)}{2!}(x - a)^{2} + \cdots + \dfrac{f^{(n)}(a)}{n!}(x - a)^{n}\). The coefficient of \((x - a)^{k}\) is \(\dfrac{f^{(k)}(a)}{k!}\). With \(a = 0\) it is called a Maclaurin polynomial. Near \(a\), \(P_n(x) \approx f(x)\).`,
        example: R`For \(f(x) = \ln x\) about \(x = 1\): \(f(1) = 0\), \(f'(1) = 1\), \(f''(1) = -1\), so \(P_2(x) = (x - 1) - \dfrac{(x - 1)^{2}}{2}\).`,
      },
      {
        title: 'Four Maclaurin series to know',
        text: R`\(e^{x} = \displaystyle\sum_{n=0}^{\infty} \frac{x^{n}}{n!}\), \(\ \sin x = \displaystyle\sum_{n=0}^{\infty} \frac{(-1)^{n}x^{2n+1}}{(2n+1)!}\), \(\ \cos x = \displaystyle\sum_{n=0}^{\infty} \frac{(-1)^{n}x^{2n}}{(2n)!}\) for all \(x\), and \(\dfrac{1}{1 - x} = \displaystyle\sum_{n=0}^{\infty} x^{n}\) for \(|x| < 1\).`,
        example: R`\(\sin x = x - \dfrac{x^{3}}{6} + \dfrac{x^{5}}{120} - \cdots\), and \(\displaystyle\sum_{n=0}^{\infty} \frac{2^{n}}{n!} = e^{2}\).`,
      },
      {
        title: 'New series from known ones',
        text: R`Substitute an expression for \(x\), multiply or divide by a power of \(x\), or differentiate or integrate term by term. Differentiating and integrating do not change the radius of convergence. This is usually much quicker than computing derivatives.`,
        example: R`\(e^{-x^{2}} = 1 - x^{2} + \dfrac{x^{4}}{2} - \cdots\), and integrating gives \(\displaystyle\int_{0}^{x} e^{-t^{2}}\,dt = x - \frac{x^{3}}{3} + \frac{x^{5}}{10} - \cdots\)`,
      },
      {
        title: 'Radius and interval of convergence',
        text: R`A power series \(\sum c_n(x - a)^{n}\) converges absolutely for \(|x - a| < R\) and diverges for \(|x - a| > R\), where \(R\) is the radius of convergence (possibly 0 or \(\infty\)). Find \(R\) with the ratio test. At the two endpoints \(x = a \pm R\) the ratio test gives \(L = 1\), so test each endpoint separately with another test.`,
        example: R`\(\displaystyle\sum_{n=1}^{\infty} \frac{x^{n}}{n}\) has \(R = 1\). At \(x = 1\) it is the harmonic series (diverges). At \(x = -1\) it is the alternating harmonic series (converges). Interval: \([-1, 1)\).`,
      },
      {
        title: 'Lagrange error bound',
        text: R`If \(|f^{(n+1)}(t)| \le M\) for all \(t\) between \(a\) and \(x\), then \(|f(x) - P_n(x)| \le \dfrac{M\,|x - a|^{n+1}}{(n+1)!}\). The bound looks like the next term of the series, with the derivative replaced by its largest possible size.`,
        example: R`For \(\sin x\) every derivative is at most 1 in size, so \(|\sin(0.5) - P_3(0.5)| \le \dfrac{(0.5)^{4}}{4!} \approx 0.0026\).`,
      },
    ],
    vocab: [
      { term: 'power series', def: R`A series of the form \(\sum c_n(x - a)^{n}\). The number \(a\) is its centre.` },
      { term: 'Taylor series', def: R`The power series \(\displaystyle\sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x - a)^{n}\) built from the derivatives of \(f\) at \(a\).` },
      { term: 'Maclaurin series', def: 'A Taylor series centred at 0.' },
      { term: 'radius of convergence', def: R`The number \(R\) such that the series converges for \(|x - a| < R\) and diverges for \(|x - a| > R\).` },
      { term: 'interval of convergence', def: 'The set of all x for which the series converges: the open interval given by the radius, together with any endpoints at which the series converges.' },
    ],
    mistakes: [
      R`Leaving out the factorial: the coefficient of \((x - a)^{k}\) is \(\dfrac{f^{(k)}(a)}{k!}\), not \(f^{(k)}(a)\).`,
      R`Writing a Taylor polynomial about \(x = a\) in powers of \(x\) instead of powers of \((x - a)\).`,
      R`Substituting only partly: in \(e^{-x^{2}}\) the term \(\dfrac{u^{2}}{2!}\) becomes \(\dfrac{x^{4}}{2!}\), not \(\dfrac{x^{4}}{4!}\).`,
      R`Stopping at the radius. The two endpoints must be tested one at a time, and they often behave differently.`,
      R`Using \(n\) instead of \(n + 1\) in the Lagrange error bound.`,
    ],
    visual: {
      type: 'plot',
      x: [-2 * Math.PI, 2 * Math.PI],
      y: [-2.5, 2.5],
      piTicks: true,
      fns: [{ f: Math.sin, label: 'sin x', labelAt: -4.71 }, { f: (x) => x, color: 'b', dashed: true }, { f: (x) => x - x ** 3 / 6, color: 'c', dashed: true }, { f: (x) => x - x ** 3 / 6 + x ** 5 / 120, color: 'd', dashed: true }],
      // A small key in the empty corner: one dash in the color of each polynomial.
      segments: [{ from: [3.7, -2.05], to: [4.3, -2.05], color: 'b', dashed: true, label: 'P₁' }, { from: [4.6, -2.05], to: [5.2, -2.05], color: 'c', dashed: true, label: 'P₃' }, { from: [5.5, -2.05], to: [6.1, -2.05], color: 'd', dashed: true, label: 'P₅' }],
      alt: 'The graph of sin x together with its Maclaurin polynomials of degrees 1, 3 and 5, drawn dashed. All three polynomials hug the sine curve near x = 0. The higher the degree, the farther from 0 the polynomial stays close to the curve before it bends away.',
    },
  },

  examples: [
    {
      title: 'A Taylor polynomial from derivatives',
      problem: R`Find the Taylor polynomial of degree 3 for \(f(x) = \ln x\) about \(x = 1\).`,
      steps: [
        R`Differentiate: \(f'(x) = \dfrac{1}{x}\), \(f''(x) = -\dfrac{1}{x^{2}}\), \(f'''(x) = \dfrac{2}{x^{3}}\).`,
        R`Evaluate at \(x = 1\): \(f(1) = 0\), \(f'(1) = 1\), \(f''(1) = -1\), \(f'''(1) = 2\).`,
        R`Divide by \(0!\), \(1!\), \(2!\), \(3!\): the coefficients are \(0,\ 1,\ -\dfrac{1}{2},\ \dfrac{1}{3}\).`,
      ],
      answer: R`\(P_3(x) = (x - 1) - \dfrac{(x - 1)^{2}}{2} + \dfrac{(x - 1)^{3}}{3}\)`,
    },
    {
      title: 'A new series by substitution and integration',
      problem: R`Find the first three nonzero terms of the Maclaurin series for \(\displaystyle\int_{0}^{x} e^{-t^{2}}\,dt\).`,
      steps: [R`Start from \(e^{u} = 1 + u + \dfrac{u^{2}}{2!} + \cdots\) and substitute \(u = -t^{2}\): \(e^{-t^{2}} = 1 - t^{2} + \dfrac{t^{4}}{2} - \cdots\)`, R`Integrate term by term from 0 to \(x\): \(x - \dfrac{x^{3}}{3} + \dfrac{x^{5}}{10} - \cdots\)`],
      answer: R`\(x - \dfrac{x^{3}}{3} + \dfrac{x^{5}}{10} - \cdots\) (This integral has no elementary formula, so the series is genuinely useful.)`,
    },
    {
      title: 'Interval of convergence',
      problem: R`Find the interval of convergence of \(\displaystyle\sum_{n=1}^{\infty} \frac{(x - 2)^{n}}{n \cdot 3^{n}}\).`,
      steps: [
        R`Ratio test: \(\left|\dfrac{a_{n+1}}{a_n}\right| = \dfrac{n}{n+1} \cdot \dfrac{|x - 2|}{3} \to \dfrac{|x - 2|}{3}\). The series converges when \(|x - 2| < 3\), that is, for \(-1 < x < 5\).`,
        R`At \(x = 5\) the series is \(\displaystyle\sum \frac{1}{n}\), the harmonic series, which diverges.`,
        R`At \(x = -1\) the series is \(\displaystyle\sum \frac{(-1)^{n}}{n}\), which converges by the alternating series test.`,
      ],
      answer: R`The interval of convergence is \([-1, 5)\), and the radius is 3.`,
    },
    {
      title: 'A limit by series',
      problem: R`Evaluate \(\displaystyle\lim_{x\to 0} \frac{\sin x - x}{x^{3}}\).`,
      steps: [R`Replace \(\sin x\) by its series: \(\sin x - x = -\dfrac{x^{3}}{6} + \dfrac{x^{5}}{120} - \cdots\)`, R`Divide by \(x^{3}\): \(-\dfrac{1}{6} + \dfrac{x^{2}}{120} - \cdots\)`, R`As \(x \to 0\) every term after the first vanishes.`],
      answer: R`\(-\dfrac{1}{6}\)`,
    },
    {
      title: 'Word problem: how accurate is the shortcut?',
      word: true,
      problem: R`A game engine replaces \(\sin x\) by \(x - \dfrac{x^{3}}{6}\) to save time. For an angle of 0.4 radians, how large can the error be?`,
      steps: [
        R`\(x - \dfrac{x^{3}}{6}\) is the Maclaurin polynomial \(P_3\) for \(\sin x\). Because the \(x^{4}\) term of the sine series is 0, it is also \(P_4\).`,
        R`Every derivative of \(\sin x\) is at most 1 in size, so \(M = 1\). Use the Lagrange error bound with \(n = 4\): \(|\text{error}| \le \dfrac{(0.4)^{5}}{5!}\).`,
        R`\(\dfrac{0.01024}{120} \approx 0.000085\).`,
      ],
      answer: 'The error is less than 0.0001: the shortcut is accurate to within one ten-thousandth.',
      visual: {
        type: 'plot',
        x: [-3.5, 3.5],
        y: [-1.6, 1.6],
        fns: [{ f: Math.sin, label: 'sin x', labelAt: 1.57 }, { f: (x) => x - x ** 3 / 6, color: 'b', dashed: true }],
        segments: [{ from: [2.4, 1.2], to: [2.9, 1.2], color: 'b', dashed: true, label: 'P₃' }],
        points: [{ x: 0.4, y: Math.sin(0.4) }],
        vlines: [{ x: 0.4 }],
        alt: 'The graph of sin x and, dashed, the cubic x minus x cubed over 6. Between about x = −1 and x = 1 the two curves cannot be told apart. At x = 0.4, marked with a point and a vertical line, they differ by less than 0.0001. Beyond x = 2 the cubic bends away below the sine curve.',
      },
    },
  ],

  models: [
    {
      id: 'maclaurin-polynomial',
      title: 'Maclaurin polynomials: watch the fit improve',
      intro: 'Choose a function, a degree and a point. The polynomial is compared with the function there.',
      inputs: [{ name: 'fn', label: 'Function', type: 'select', value: 'sin', options: FUNC_OPTIONS }, { name: 'n', label: 'Degree n', type: 'int', min: 0, max: 9, value: 3 }, { name: 'x', label: 'x', type: 'number', min: -3, max: 3, step: 0.1, value: 1 }],
      compute({ fn, n, x }) {
        if (x === 0) return { error: 'Choose a value of x other than 0. At x = 0 every Maclaurin polynomial gives the function value exactly.' };
        const g = FUNCS[fn];
        const c = range(0, n).map(g.coef);
        const P = (t) => at(c, t);
        const five = (v) => num(v, { places: 5 });
        const bound = (g.M(x) * Math.abs(x) ** (n + 1)) / factorial(n + 1);
        return {
          problem: R`Approximate \(${g.tex}\) at \(x = ${num(x)}\) with its Maclaurin polynomial of degree ${n}.`,
          steps: [
            R`Keep the terms of the Maclaurin series up to degree ${n}: \(P_{${n}}(x) = ${tay(c)}\).`,
            R`Substitute \(x = ${num(x)}\): \(P_{${n}}(${num(x)}) \approx ${five(P(x))}\).`,
            R`The function value is \(${five(g.f(x))}\), so the actual error is about \(${five(Math.abs(g.f(x) - P(x)))}\).`,
            R`Lagrange error bound with \(M = ${g.MT(x)}\): \(\dfrac{M\,${n === 0 ? '|x|' : `|x|^{${n + 1}}`}}{${n + 1}!} \approx ${five(bound)}\). The actual error is within it.`,
          ],
          answer: R`\(P_{${n}}(${num(x)}) \approx ${five(P(x))}\), within \(${five(bound)}\) of \(${five(g.f(x))}\)`,
          visual: {
            type: 'plot',
            x: [-4, 4],
            y: fn === 'exp' ? [-2, 12] : [-2.5, 2.5],
            fns: [{ f: g.f, label: g.label }, { f: P, color: 'b', dashed: true }],
            points: [{ x, y: P(x), color: 'b' }],
            alt: `The graph of ${g.label} with its Maclaurin polynomial of degree ${n} drawn dashed. The two curves agree near x = 0 and separate farther out. A point marks the polynomial's value at x = ${num(x)}.`,
          },
        };
      },
    },
    {
      id: 'degree-needed',
      title: 'Word problem: what degree does the chip need?',
      word: true,
      intro: 'A small processor computes a function from its Maclaurin polynomial. Find the lowest degree that meets the accuracy target.',
      inputs: [{ name: 'fn', label: 'Function', type: 'select', value: 'sin', options: FUNC_OPTIONS }, { name: 'b', label: 'Largest |x| needed', type: 'number', min: 0.1, max: 3, step: 0.1, value: 1 }, { name: 'd', label: 'Decimal places required', type: 'int', min: 1, max: 6, value: 3 }],
      compute({ fn, b, d }) {
        const g = FUNCS[fn];
        const M = g.M(b);
        const target = 0.5 * 10 ** -d;
        const bound = (n) => (M * b ** (n + 1)) / factorial(n + 1);
        let n = 0;
        while (bound(n) >= target) n++;
        const sci = (v) => (v >= 0.001 ? num(v, { places: 5 }) : R`${num(v / 10 ** Math.floor(Math.log10(v)), { places: 2 })} \times 10^{${Math.floor(Math.log10(v))}}`);
        return {
          problem: R`A processor computes \(${g.tex}\) for \(|x| \le ${num(b)}\) from a Maclaurin polynomial. The error must stay below \(${sci(target)}\), which keeps ${d} decimal ${d === 1 ? 'place' : 'places'} correct. What is the lowest degree that the Lagrange error bound guarantees?`,
          steps: [
            R`On this interval every derivative is at most \(M = ${fn === 'exp' ? R`e^{${num(b)}} \approx ${num(M, { places: 3 })}` : '1'}\) in size.`,
            R`The error of \(P_n\) is at most \(\dfrac{M \cdot ${num(b)}^{n+1}}{(n+1)!}\). Increase \(n\) until this is below \(${sci(target)}\).`,
            n === 0 ? R`Already for \(n = 0\) the bound is \(${sci(bound(0))}\).` : R`For \(n = ${n - 1}\) the bound is \(${sci(bound(n - 1))}\), which is too large. For \(n = ${n}\) it is \(${sci(bound(n))}\).`,
          ],
          answer: R`Degree \(${n}\) is enough: the error is at most \(${sci(bound(n))}\)`,
          visual: {
            type: 'plot',
            x: [-4, 4],
            y: fn === 'exp' ? [-2, 12] : [-2.5, 2.5],
            fns: [{ f: g.f, label: g.label }, { f: (t) => at(range(0, n).map(g.coef), t), color: 'b', dashed: true }],
            vlines: [{ x: -b }, { x: b }],
            alt: `The graph of ${g.label} with its Maclaurin polynomial of degree ${n} drawn dashed. Between the two vertical lines at x = −${num(b)} and x = ${num(b)} the curves cannot be told apart.`,
          },
        };
      },
    },
  ],

  quiz: { easy: [easyFromDerivatives, easyKnownCoefficient, easyApproximate], medium: [mediumTaylorPolynomial, mediumSubstitution, mediumRadius], hard: [hardInterval, hardLagrange, hardNewSeries], challenge: [challengeLimit, challengeRecognizeSum, challengeConvergenceInfo] },
};
