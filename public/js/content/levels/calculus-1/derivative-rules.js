import { R, q, frac, terms, over, texFrac, power, poly, polyEval, polyDeriv, linear, num, paren, product, rootsTex, checkDeriv, checkEqual, numDeriv } from '../../lib/index.js';

const M = (tex) => R`\(${tex}\)`;
// a·xⁿ as LaTeX (n may be negative or a Frac).
const mono = (a, n) => terms([[a, power('x', n)]]);

// True when two functions agree at a few sample points (used to drop a "wrong" choice that is really right).
const sameFunction = (f, g) => [0.7, 1.3, 2.1].every((x) => Math.abs(f(x) - g(x)) < 1e-9 * Math.max(1, Math.abs(f(x))));

// ───────────── Easy ─────────────

function easyPower(rng) {
  const a = rng.nonzero(-9, 9);
  const n = rng.int(2, 9);
  return q({
    prompt: R`Find \(f'(x)\) if \(f(x) = ${mono(a, n)}\).`,
    correct: M(mono(a * n, n - 1)),
    wrong: [
      { value: M(mono(a * n, n)), why: 'The power rule also lowers the exponent by 1.' },
      { value: M(mono(a, n - 1)), why: R`Multiply by the old exponent as well: \(${a} \cdot ${n} = ${a * n}\).` },
      { value: M(terms([[frac(a, n + 1), power('x', n + 1)]])), why: 'That raises the exponent, which is the rule for antiderivatives.' },
      M(mono(a * (n - 1), n - 1)),
    ],
    solution: [
      R`Power rule: \(\frac{d}{dx}\,x^{n} = n\,x^{n-1}\). A constant multiple stays in front.`,
      R`Bring the exponent down and subtract 1 from it: \(${a} \cdot ${n}\,x^{${n} - 1}\).`,
      R`\(f'(x) = ${mono(a * n, n - 1)}\).`,
    ],
    rule: 0,
    skill: 'power rule',
    check: () => checkDeriv((x) => a * x ** n, (x) => a * n * x ** (n - 1)),
  });
}

function easyPolynomial(rng) {
  const deg = rng.int(2, 3);
  const coefs = [rng.nonzero(-6, 6)];
  for (let i = 0; i < deg - 1; i++) coefs.push(rng.int(-7, 7));
  coefs.push(rng.nonzero(-9, 9));
  if (coefs.slice(1, -1).every((c) => c === 0)) coefs[1] = rng.nonzero(-7, 7);
  const d = polyDeriv(coefs);
  const constant = coefs[coefs.length - 1];
  const noDrop = coefs.map((c, i) => c * (deg - i)).slice(0, -1); // multiplied but exponents not lowered
  return q({
    prompt: R`Differentiate \(f(x) = ${poly(coefs)}\).`,
    correct: M(poly(d)),
    wrong: [
      { value: M(poly([...d.slice(0, -1), d[d.length - 1] + constant])), why: R`The derivative of a constant is 0, so \(${constant}\) disappears.` },
      { value: M(poly([...noDrop, 0])), why: 'Each exponent must go down by 1.' },
      M(poly(d.map((c, i) => (i === 0 ? c + 1 : c)))),
      M(poly(d.map((c) => -c))),
      M(poly([...d, constant])),
    ],
    solution: [
      R`Differentiate term by term (sum rule), using the power rule on each term.`,
      R`${coefs.map((c, i) => (c === 0 ? null : R`\(${mono(c, deg - i)} \to ${deg - i === 0 ? '0' : mono(c * (deg - i), deg - i - 1)}\)`)).filter(Boolean).join(', ')}.`,
      R`\(f'(x) = ${poly(d)}\).`,
    ],
    rule: 1,
    skill: 'sum rule',
    check: () => checkDeriv((x) => polyEval(coefs, x), (x) => polyEval(d, x)),
  });
}

const BASIC = [
  { f: '\\sin x', d: (a) => terms([[a, '\\cos x']]), wrong: (a) => [terms([[-a, '\\cos x']]), terms([[a, '\\sin x']]), terms([[-a, '\\sin x']])], note: R`\(\frac{d}{dx}\sin x = \cos x\)`, js: Math.sin, djs: Math.cos },
  { f: '\\cos x', d: (a) => terms([[-a, '\\sin x']]), wrong: (a) => [terms([[a, '\\sin x']]), terms([[a, '\\cos x']]), terms([[-a, '\\cos x']])], note: R`\(\frac{d}{dx}\cos x = -\sin x\) (note the minus sign)`, js: Math.cos, djs: (x) => -Math.sin(x) },
  { f: 'e^{x}', d: (a) => terms([[a, 'e^{x}']]), wrong: (a) => [terms([[a, 'x e^{x-1}']]), terms([[a, 'e^{x-1}']]), terms([[a, '\\ln x']])], note: R`\(\frac{d}{dx}e^{x} = e^{x}\) (the power rule does not apply, because the variable is in the exponent)`, js: Math.exp, djs: Math.exp },
  { f: '\\ln x', d: (a) => over(a, 'x'), wrong: (a) => [terms([[a, 'e^{x}']]), over(a, 'x^{2}'), terms([[a, 'x']])], note: R`\(\frac{d}{dx}\ln x = \frac{1}{x}\)`, js: Math.log, djs: (x) => 1 / x },
];

function easyBasic(rng) {
  const b = rng.pick(BASIC);
  const a = rng.intExcept(-9, 9, [0, 1]);
  return q({
    prompt: R`Find \(\dfrac{d}{dx}\left[${terms([[a, b.f]])}\right]\).`,
    correct: M(b.d(a)),
    wrong: b.wrong(a).map(M),
    solution: [R`Keep the constant \(${a}\) in front (constant multiple rule).`, `Use the basic derivative: ${b.note}.`, R`The derivative is \(${b.d(a)}\).`],
    rule: 2,
    skill: 'basic derivatives',
    check: () => checkDeriv((x) => a * b.js(x), (x) => a * b.djs(x)),
  });
}

function easyLinearConstant(rng) {
  const m = rng.nonzero(-12, 12);
  const k = rng.nonzero(-20, 20);
  const isConstant = rng.bool(0.35);
  const f = isConstant ? String(k) : linear(m, k);
  return q({
    prompt: R`What is the derivative of \(f(x) = ${f}\)?`,
    correct: isConstant ? 0 : m,
    wrong: isConstant
      ? [{ value: k, why: 'A constant function never changes, so its rate of change is 0.' }, 1, { value: M(terms([[k, 'x']])), why: 'That is an antiderivative, not the derivative.' }, -k]
      : [{ value: M(linear(m, k)), why: 'That is the function itself.' }, { value: k, why: R`\(${k}\) is the constant term. The slope is the coefficient of \(x\).` }, { value: M(terms([[m, 'x']])), why: 'The exponent on x drops from 1 to 0, leaving just the coefficient.' }, 0],
    solution: isConstant
      ? [R`The graph of \(f(x) = ${k}\) is a horizontal line.`, R`Its slope is 0 everywhere, so \(f'(x) = 0\).`]
      : [R`\(${linear(m, k)}\) is a line with slope \(${m}\).`, R`The derivative of \(${terms([[m, 'x']])}\) is \(${m}\) and the derivative of the constant \(${k}\) is 0. So \(f'(x) = ${m}\).`],
    rule: 1,
    skill: 'constants and lines',
    check: () => checkDeriv((x) => (isConstant ? k : m * x + k), () => (isConstant ? 0 : m)),
  });
}

// ───────────── Medium ─────────────

function mediumRewrite(rng) {
  const a = rng.int(1, 9) * rng.sign();
  if (rng.bool(0.55)) {
    const n = rng.int(2, 5);
    return q({
      prompt: R`Find \(f'(x)\) if \(f(x) = \dfrac{${a}}{x^{${n}}}\).`,
      correct: M(R`${a > 0 ? '-' : ''}\frac{${Math.abs(a) * n}}{x^{${n + 1}}}`),
      wrong: [
        { value: M(R`${a > 0 ? '' : '-'}\frac{${Math.abs(a) * n}}{x^{${n + 1}}}`), why: R`The exponent \(-${n}\) is negative, so bringing it down changes the sign.` },
        { value: M(R`${a > 0 ? '-' : ''}\frac{${Math.abs(a) * n}}{x^{${n - 1}}}`), why: R`Subtracting 1 from \(-${n}\) gives \(-${n + 1}\), not \(-${n - 1}\).` },
        M(R`${a < 0 ? '-' : ''}\frac{${Math.abs(a)}}{${n}x^{${n - 1}}}`),
        M(R`${a > 0 ? '-' : ''}\frac{${Math.abs(a)}}{x^{${n + 1}}}`),
      ],
      solution: [
        R`Rewrite with a negative exponent: \(f(x) = ${mono(a, -n)}\).`,
        R`Power rule: \(f'(x) = ${a}\cdot(${-n})\,x^{${-n} - 1} = ${mono(-a * n, -n - 1)}\).`,
        R`Write with a positive exponent: \(f'(x) = ${a > 0 ? '-' : ''}\frac{${Math.abs(a) * n}}{x^{${n + 1}}}\).`,
      ],
      rule: 5,
      skill: 'negative exponents',
      check: () => checkDeriv((x) => a / x ** n, (x) => (-a * n) / x ** (n + 1)),
    });
  }
  const c = frac(a, 2);
  const show = (fr) => (fr.isInt() ? R`${fr.n < 0 ? '-' : ''}\frac{${Math.abs(fr.n)}}{\sqrt{x}}` : R`${fr.n < 0 ? '-' : ''}\frac{${Math.abs(fr.n)}}{${fr.d}\sqrt{x}}`);
  return q({
    prompt: R`Find \(f'(x)\) if \(f(x) = ${terms([[a, '\\sqrt{x}']])}\).`,
    correct: M(show(c)),
    wrong: [
      { value: M(terms([[c, '\\sqrt{x}']])), why: R`The new exponent is \(\frac{1}{2} - 1 = -\frac{1}{2}\), which puts \(\sqrt{x}\) in the denominator.` },
      { value: M(show(frac(a, 1))), why: R`Bring down the exponent \(\frac{1}{2}\): the coefficient becomes \(${a} \cdot \frac{1}{2}\).` },
      M(show(frac(2 * a, 1))),
      M(R`${a < 0 ? '-' : ''}\frac{${Math.abs(a)}}{2x}`),
    ],
    solution: [
      R`Rewrite the root as a power: \(f(x) = ${mono(a, frac(1, 2))}\).`,
      R`Power rule: \(f'(x) = ${a}\cdot\frac{1}{2}\,x^{-\frac{1}{2}}\).`,
      R`Since \(x^{-\frac{1}{2}} = \frac{1}{\sqrt{x}}\), \(f'(x) = ${show(c)}\).`,
    ],
    rule: 5,
    skill: 'fractional exponents',
    check: () => checkDeriv((x) => a * Math.sqrt(x), (x) => a / (2 * Math.sqrt(x))),
  });
}

function mediumTrigExp(rng) {
  let a;
  let b;
  let c;
  do {
    a = rng.int(-6, 6);
    b = rng.int(-6, 6);
    c = rng.int(-6, 6);
  } while ([a, b, c].filter((v) => v !== 0).length < 2);
  const f = terms([[a, '\\sin x'], [b, '\\cos x'], [c, 'e^{x}']]);
  const d = terms([[a, '\\cos x'], [-b, '\\sin x'], [c, 'e^{x}']]);
  return q({
    prompt: R`Differentiate \(f(x) = ${f}\).`,
    correct: M(d),
    wrong: [
      b !== 0 ? { value: M(terms([[a, '\\cos x'], [b, '\\sin x'], [c, 'e^{x}']])), why: R`The derivative of \(\cos x\) is \(-\sin x\). The sign flips.` } : null,
      a !== 0 ? { value: M(terms([[-a, '\\cos x'], [-b, '\\sin x'], [c, 'e^{x}']])), why: R`The derivative of \(\sin x\) is \(+\cos x\). Only cosine picks up a minus sign.` } : null,
      c !== 0 ? { value: M(terms([[a, '\\cos x'], [-b, '\\sin x'], [c, 'x e^{x-1}']])), why: R`\(e^{x}\) is its own derivative. The power rule is for \(x^{n}\), not \(e^{x}\).` } : null,
      M(terms([[-a, '\\cos x'], [b, '\\sin x'], [c, 'e^{x}']])),
      M(terms([[a, '\\cos x'], [-b, '\\sin x']])),
      M(terms([[a, '\\sin x'], [-b, '\\cos x'], [c, 'e^{x}']])),
    ],
    solution: [
      R`Differentiate each term: \(\sin x \to \cos x\), \(\cos x \to -\sin x\), \(e^{x} \to e^{x}\).`,
      R`Keep each coefficient: \(f'(x) = ${d}\).`,
    ],
    rule: 2,
    skill: 'basic derivatives',
    check: () => checkDeriv((x) => a * Math.sin(x) + b * Math.cos(x) + c * Math.exp(x), (x) => a * Math.cos(x) - b * Math.sin(x) + c * Math.exp(x)),
  });
}

function mediumEvaluate(rng) {
  const coefs = [rng.nonzero(-4, 4), rng.int(-6, 6), rng.int(-8, 8), rng.int(-9, 9)].slice(rng.int(0, 1));
  const p = rng.int(-3, 3);
  const d = polyDeriv(coefs);
  const value = polyEval(d, p);
  return q({
    prompt: R`If \(f(x) = ${poly(coefs)}\), what is \(f'(${p})\)?`,
    correct: value,
    wrong: [
      { value: polyEval(coefs, p), why: R`That is \(f(${p})\). Differentiate first, then substitute.` },
      { value: polyEval(d, -p), why: 'Check the sign of the number you substituted.' },
      polyEval(d, p + 1),
      value + coefs[coefs.length - 1],
    ],
    solution: [
      R`Differentiate first: \(f'(x) = ${poly(d)}\).`,
      R`Substitute \(x = ${p}\): \(f'(${p}) = ${d.map((c, i) => (i < d.length - 1 ? `${paren(c)}(${p})${d.length - 1 - i > 1 ? `^{${d.length - 1 - i}}` : ''}` : paren(c))).join(' + ')} = ${value}\).`,
    ],
    rule: 1,
    skill: 'evaluating a derivative',
    check: () => checkEqual(value, numDeriv((x) => polyEval(coefs, x), p), 1e-5, "f'(p)"),
  });
}

function mediumVelocity(rng) {
  const a = rng.nonzero(-6, 6);
  const b = rng.int(-12, 12);
  const c = rng.int(0, 20);
  const t = rng.int(1, 5);
  const v = 2 * a * t + b;
  const s = [a, b, c];
  return q({
    prompt: R`A particle moves along a line. Its position after \(t\) seconds is \(s(t) = ${poly(s, 't')}\) meters. What is its velocity at \(t = ${t}\) seconds?`,
    correct: v,
    unit: 'm/s',
    wrong: [
      { value: polyEval(s, t), why: 'That is the position at that time. Velocity is the derivative of position.' },
      { value: 2 * a, why: R`\(${2 * a}\) is the acceleration \(s''(t)\). Velocity is \(s'(t)\).` },
      2 * a * t,
      a * t + b,
    ],
    solution: [
      R`Velocity is the rate of change of position: \(v(t) = s'(t) = ${poly(polyDeriv(s), 't')}\).`,
      R`At \(t = ${t}\): \(v(${t}) = ${2 * a}(${t}) ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${v}\) m/s.${v < 0 ? ' The negative sign means the particle is moving in the negative direction.' : ''}`,
    ],
    rule: 1,
    skill: 'rates of change',
    check: () => checkEqual(v, numDeriv((x) => polyEval(s, x), t), 1e-5, 'velocity'),
  });
}

// ───────────── Hard ─────────────

function hardProductPoly(rng) {
  const a = rng.nonzero(-5, 5);
  const b = rng.nonzero(-6, 6);
  const c = rng.nonzero(-4, 4);
  const d = rng.nonzero(-6, 6);
  const expanded = [3 * a * c, 2 * b * c, a * d];
  return q({
    prompt: R`Use the product rule to find \(f'(x)\) for \(f(x) = (${linear(a, b)})(${terms([[c, 'x^{2}'], [d, '']])})\). Give the simplified answer.`,
    correct: M(poly(expanded)),
    wrong: [
      { value: M(terms([[2 * a * c, 'x']])), why: R`The derivative of a product is **not** the product of the derivatives. Use \(u'v + uv'\).` },
      { value: M(poly([a * c, 2 * b * c, a * d])), why: R`Add both parts: \(u'v\) gives \(${terms([[a * c, 'x^{2}']])}\) and \(uv'\) gives another \(${terms([[2 * a * c, 'x^{2}']])}\).` },
      M(poly([3 * a * c, 2 * b * c, -a * d])),
      M(poly([3 * a * c, b * c, a * d])),
    ],
    solution: [
      R`Let \(u = ${linear(a, b)}\) and \(v = ${terms([[c, 'x^{2}'], [d, '']])}\). Then \(u' = ${a}\) and \(v' = ${terms([[2 * c, 'x']])}\).`,
      R`Product rule: \(f' = u'v + uv' = ${a}(${terms([[c, 'x^{2}'], [d, '']])}) + (${linear(a, b)})(${terms([[2 * c, 'x']])})\).`,
      R`Expand: \(\left(${terms([[a * c, 'x^{2}'], [a * d, '']])}\right) + \left(${terms([[2 * a * c, 'x^{2}'], [2 * b * c, 'x']])}\right)\).`,
      R`Combine like terms: \(f'(x) = ${poly(expanded)}\).`,
    ],
    rule: 3,
    skill: 'product rule',
    check: () => checkDeriv((x) => (a * x + b) * (c * x * x + d), (x) => polyEval(expanded, x)),
  });
}

const PARTNERS = [
  { tex: '\\sin x', dtex: '\\cos x', sign: 1, js: Math.sin, djs: Math.cos },
  { tex: '\\cos x', dtex: '\\sin x', sign: -1, js: Math.cos, djs: (x) => -Math.sin(x) },
  { tex: 'e^{x}', dtex: 'e^{x}', sign: 1, js: Math.exp, djs: Math.exp },
];

function hardProductMixed(rng) {
  const a = rng.nonzero(-6, 6);
  const n = rng.int(1, 4);
  const g = rng.pick(PARTNERS);
  const xn = power('x', n);
  const xn1 = power('x', n - 1);
  const right = terms([[a * n, xn1 + g.tex], [a * g.sign, xn + g.dtex]]);
  const rightJs = (x) => a * n * x ** (n - 1) * g.js(x) + a * x ** n * g.djs(x);
  return q({
    prompt: R`Find \(f'(x)\) for \(f(x) = ${terms([[a, xn + g.tex]])}\).`,
    correct: M(right),
    wrong: [
      { value: M(terms([[a * n * g.sign, xn1 + g.dtex]])), why: R`That multiplies the two derivatives. The product rule is \(u'v + uv'\).` },
      { value: M(terms([[a * n, xn1 + g.tex], [-a * g.sign, xn + g.dtex]])), why: R`Check the sign of the second term: the derivative of \(${g.tex}\) is \(${g.sign < 0 ? '-' : ''}${g.dtex}\).` },
      // Swapping the powers gives the right answer again when n = 1 and v = eˣ, so test the value first.
      sameFunction(rightJs, (x) => a * n * x ** n * g.js(x) + a * x ** (n - 1) * g.djs(x)) ? null : M(terms([[a * n, xn + g.tex], [a * g.sign, xn1 + g.dtex]])),
      M(terms([[a, xn1 + g.tex], [a * g.sign, xn + g.dtex]])),
      M(terms([[a * g.sign, xn + g.dtex]])),
      M(terms([[a * n, xn1 + g.tex], [a * g.sign, power('x', n + 1) + g.dtex]])),
    ],
    solution: [
      R`Let \(u = ${mono(a, n)}\) and \(v = ${g.tex}\). Then \(u' = ${mono(a * n, n - 1)}\) and \(v' = ${g.sign < 0 ? '-' : ''}${g.dtex}\).`,
      R`Product rule: \(f' = u'v + uv'\).`,
      R`\(f'(x) = ${right}\).`,
    ],
    rule: 3,
    skill: 'product rule',
    check: () => checkDeriv((x) => a * x ** n * g.js(x), rightJs),
  });
}

function hardQuotient(rng) {
  const a = rng.nonzero(-6, 6);
  const b = rng.nonzero(-7, 7);
  const c = rng.int(1, 5);
  const d = rng.nonzero(-7, 7);
  const top = a * d - b * c;
  if (top === 0) return hardQuotient(rng);
  const den = `(${linear(c, d)})^{2}`;
  return q({
    prompt: R`Find \(f'(x)\) for \(f(x) = \dfrac{${linear(a, b)}}{${linear(c, d)}}\).`,
    correct: M(over(top, den)),
    wrong: [
      { value: M(over(-top, den)), why: R`Order matters in the numerator: it is \(u'v - uv'\), not \(uv' - u'v\).` },
      { value: M(frac(a, c).tex()), why: 'The derivative of a quotient is not the quotient of the derivatives.' },
      { value: M(over(top, linear(c, d))), why: 'The quotient rule divides by the denominator squared.' },
      a * d + b * c !== 0 ? M(over(a * d + b * c, den)) : null,
      M(over(top + 1, den)),
    ],
    solution: [
      R`Let \(u = ${linear(a, b)}\) and \(v = ${linear(c, d)}\). Then \(u' = ${a}\) and \(v' = ${c}\).`,
      R`Quotient rule: \(f' = \dfrac{u'v - uv'}{v^{2}} = \dfrac{${a}(${linear(c, d)}) - (${linear(a, b)})${paren(c)}}{${den}}\).`,
      R`The numerator simplifies: \(${linear(a * c, a * d)} - (${linear(a * c, b * c)}) = ${top}\).`,
      R`\(f'(x) = ${over(top, den)}\).`,
    ],
    rule: 4,
    skill: 'quotient rule',
    check: () => checkDeriv((x) => (a * x + b) / (c * x + d), (x) => top / (c * x + d) ** 2, [0.31, 0.77, 1.19].filter((x) => Math.abs(c * x + d) > 0.3)),
  });
}

function tableVisual(p, f, df, g, dg) {
  return {
    type: 'table',
    headers: [R`\(x\)`, R`\(f(x)\)`, R`\(f'(x)\)`, R`\(g(x)\)`, R`\(g'(x)\)`],
    rows: [[R`\(${p}\)`, R`\(${f}\)`, R`\(${df}\)`, R`\(${g}\)`, R`\(${dg}\)`]],
    alt: `Table of values at x = ${p}: f is ${f}, f prime is ${df}, g is ${g}, g prime is ${dg}.`,
  };
}

function hardTableProduct(rng) {
  const p = rng.int(-3, 5);
  const [f, df, g, dg] = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const ans = df * g + f * dg;
  return q({
    prompt: R`The table gives values of \(f\), \(g\) and their derivatives at \(x = ${p}\). If \(h(x) = f(x)\,g(x)\), find \(h'(${p})\).`,
    visual: tableVisual(p, f, df, g, dg),
    correct: ans,
    wrong: [
      { value: df * dg, why: R`\(f'(${p}) \cdot g'(${p})\) is not the product rule. Use \(f'g + fg'\).` },
      { value: df * g - f * dg, why: 'The product rule adds the two parts. Subtraction belongs to the quotient rule.' },
      f * g,
      df * g + dg,
    ],
    solution: [
      R`Product rule: \(h'(x) = f'(x)g(x) + f(x)g'(x)\).`,
      R`At \(x = ${p}\): \(h'(${p}) = ${product(df, g)} + ${product(f, dg)}\).`,
      R`\(h'(${p}) = ${df * g} + ${paren(f * dg)} = ${ans}\).`,
    ],
    rule: 3,
    skill: 'product rule',
  });
}

function hardTangentLine(rng) {
  const a = rng.nonzero(-3, 3);
  const b = rng.int(-6, 6);
  const c = rng.int(-8, 8);
  const p = rng.int(-3, 3);
  const y0 = a * p * p + b * p + c;
  const m = 2 * a * p + b;
  const k = y0 - m * p;
  const line = (mm, kk) => M(`y = ${linear(mm, kk)}`);
  return q({
    prompt: R`Find the equation of the tangent line to \(f(x) = ${poly([a, b, c])}\) at \(x = ${p}\).`,
    correct: line(m, k),
    wrong: [
      p !== 0 ? { value: line(m, y0), why: R`\(${y0}\) is the height of the point, not the \(y\)-intercept. Use \(y - ${paren(y0)} = ${m}(x - ${paren(p)})\).` } : null,
      2 * a !== m ? { value: line(2 * a, k), why: R`The slope is \(f'(${p})\), the derivative **evaluated** at \(x = ${p}\).` } : null,
      line(-m, k),
      line(m + 1, k),
      line(m, k + 2),
      line(m - 1, k + 1),
    ],
    solution: [
      R`Point: \(f(${p}) = ${y0}\), so the line passes through \((${p}, ${y0})\).`,
      R`Slope: \(f'(x) = ${linear(2 * a, b)}\), so \(m = f'(${p}) = ${m}\).`,
      R`Point-slope form: \(y - ${paren(y0)} = ${m}(x - ${paren(p)})\).`,
      R`Simplify: \(y = ${linear(m, k)}\).`,
    ],
    rule: 1,
    skill: 'tangent lines',
    check: () => checkEqual(m, numDeriv((x) => a * x * x + b * x + c, p), 1e-5, 'slope') === true && Math.abs(m * p + k - y0) < 1e-9 ? true : 'tangent line does not touch the curve with the right slope',
  });
}

// ───────────── Challenge ─────────────

function challengeHorizontal(rng) {
  const r1 = rng.int(-5, 4);
  const r2 = r1 + 2 * rng.int(1, 3); // r1 + r2 is even, so the coefficients are whole numbers
  const c = rng.int(-9, 9);
  // f'(x) = 3(x − r1)(x − r2)  ⇒  f(x) = x³ − (3/2)(r1 + r2)x² + 3·r1·r2·x + c
  const coefs = [1, (-3 * (r1 + r2)) / 2, 3 * r1 * r2, c];
  const d = polyDeriv(coefs);
  return q({
    prompt: R`At which values of \(x\) does the graph of \(f(x) = ${poly(coefs)}\) have a horizontal tangent line?`,
    correct: M(rootsTex([r1, r2])),
    wrong: [
      { value: M(rootsTex([-r1, -r2])), why: R`The factors are \((x - r)\), so the solutions keep the sign of \(r\): solve each factor \(= 0\).` },
      { value: M(rootsTex([(r1 + r2) / 2])), why: R`That is where \(f''(x) = 0\). A horizontal tangent needs \(f'(x) = 0\).` },
      M(rootsTex([r1, -r2])),
      M(rootsTex([r1 + 1, r2 + 1])),
      M(rootsTex([r1 - 1, r2])),
    ],
    solution: [
      R`A horizontal tangent has slope 0, so solve \(f'(x) = 0\).`,
      R`\(f'(x) = ${poly(d)} = 3(${poly([1, -(r1 + r2), r1 * r2])})\).`,
      R`Factor: \(3${[r1, r2].map((r) => (r === 0 ? 'x' : `(${linear(1, -r)})`)).join('')} = 0\).`,
      R`So \(${rootsTex([r1, r2])}\).`,
    ],
    rule: 1,
    skill: 'horizontal tangents',
    check: () => (Math.abs(polyEval(d, r1)) < 1e-9 && Math.abs(polyEval(d, r2)) < 1e-9 ? checkDeriv((x) => polyEval(coefs, x), (x) => polyEval(d, x)) : 'roots do not make the derivative zero'),
  });
}

const QUOTIENTS = [
  { top: 'e^{x}', num: (a, n) => R`${a === 1 ? '' : a}e^{x}(${linear(1, -n)})`, wrongs: (a, n) => [R`${a === 1 ? '' : a}e^{x}(${linear(1, n)})`, R`${a === 1 ? '' : a}e^{x}(${linear(-1, n)})`, R`${a === 1 ? '' : a}e^{x}`], js: Math.exp, djs: Math.exp, why: R`\(u = e^{x}\), so \(u' = e^{x}\)` },
  { top: '\\sin x', num: (a, n) => terms([[a, 'x\\cos x'], [-a * n, '\\sin x']]), wrongs: (a, n) => [terms([[a, 'x\\cos x'], [a * n, '\\sin x']]), terms([[-a, 'x\\cos x'], [a * n, '\\sin x']]), terms([[a, '\\cos x']])], js: Math.sin, djs: Math.cos, why: R`\(u = \sin x\), so \(u' = \cos x\)` },
  { top: '\\cos x', num: (a, n) => terms([[-a, 'x\\sin x'], [-a * n, '\\cos x']]), wrongs: (a, n) => [terms([[a, 'x\\sin x'], [-a * n, '\\cos x']]), terms([[-a, 'x\\sin x'], [a * n, '\\cos x']]), terms([[-a, '\\sin x']])], js: Math.cos, djs: (x) => -Math.sin(x), why: R`\(u = \cos x\), so \(u' = -\sin x\)` },
  { top: '\\ln x', num: (a, n) => terms([[a, ''], [-a * n, '\\ln x']]), wrongs: (a, n) => [terms([[a, ''], [a * n, '\\ln x']]), terms([[-a, ''], [a * n, '\\ln x']]), terms([[a, 'x'], [-a * n, '\\ln x']])], js: Math.log, djs: (x) => 1 / x, why: R`\(u = \ln x\), so \(u' = \frac{1}{x}\)` },
];

function challengeQuotientMixed(rng) {
  const g = rng.pick(QUOTIENTS);
  const a = rng.int(1, 6);
  const n = rng.int(1, 4);
  const xn = power('x', n);
  const den = power('x', n + 1);
  const numer = g.num(a, n);
  const wrongNums = g.wrongs(a, n);
  return q({
    prompt: R`Find \(f'(x)\) for \(f(x) = \dfrac{${terms([[a, g.top]])}}{${xn}}\). Give the fully simplified answer.`,
    correct: M(texFrac(numer, den)),
    wrong: [
      { value: M(texFrac(wrongNums[0], den)), why: R`The numerator of the quotient rule is \(u'v - uv'\): the second part is subtracted.` },
      { value: M(texFrac(wrongNums[1], den)), why: R`The order is \(u'v - uv'\). Reversing it flips every sign.` },
      { value: M(texFrac(wrongNums[2], terms([[n, power('x', n - 1)]]))), why: 'This divides the derivatives. The quotient rule is needed.' },
      M(texFrac(numer, power('x', 2 * n))),
    ],
    solution: [
      R`Quotient rule with ${g.why}, and \(v = ${xn}\), so \(v' = ${mono(n, n - 1)}\).`,
      R`\(f'(x) = \dfrac{u'v - uv'}{v^{2}}\), with \(v^{2} = ${power('x', 2 * n)}\).`,
      R`Every term in the numerator has a factor of \(${power('x', n - 1) || '1'}\). Cancel it against the denominator to leave \(${den}\).`,
      R`\(f'(x) = ${texFrac(numer, den)}\).`,
    ],
    rule: 4,
    skill: 'quotient rule',
    check: () =>
      checkDeriv(
        (x) => (a * g.js(x)) / x ** n,
        (x) => (a * g.djs(x) * x ** n - a * g.js(x) * n * x ** (n - 1)) / x ** (2 * n),
      ),
  });
}

function challengeSecond(rng) {
  const a = rng.nonzero(-5, 5);
  const n = rng.int(1, 3);
  // f = a·xⁿ·eˣ.  Then f' = a·eˣ·(xⁿ + n·xⁿ⁻¹)  and  f'' = a·eˣ·(xⁿ + 2n·xⁿ⁻¹ + n(n−1)·xⁿ⁻²).
  // Brackets are written as polynomials (coefficients highest power first, padded down to the constant).
  const bracket = (c1, c2) => {
    const coefs = new Array(n + 1).fill(0);
    coefs[0] = 1;
    coefs[1] += c1;
    if (n >= 2) coefs[2] += c2;
    return poly(coefs);
  };
  const lead = a === 1 ? '' : a === -1 ? '-' : String(a);
  const wrap = (body) => M(`${lead}e^{x}(${body})`);
  const c2 = n * (n - 1);
  const firstBracket = bracket(n, 0);
  return q({
    prompt: R`Find the second derivative \(f''(x)\) for \(f(x) = ${terms([[a, power('x', n) + 'e^{x}']])}\).`,
    correct: wrap(bracket(2 * n, c2)),
    wrong: [
      { value: wrap(firstBracket), why: R`That is the first derivative \(f'(x)\). Differentiate once more.` },
      n >= 2 ? { value: wrap(bracket(n, c2)), why: R`Both uses of the product rule give an \(${power('x', n - 1)}\) term. Add them.` } : null,
      n >= 2 ? { value: wrap(bracket(2 * n, 0)), why: R`The derivative of \(${terms([[n, power('x', n - 1)]])}\) contributes one more term.` } : null,
      wrap(bracket(2 * n + 1, c2)),
      wrap(bracket(2 * n - 1 === n ? 3 * n : 2 * n - 1, c2)),
      wrap(bracket(2 * n + 2, c2)),
    ],
    solution: [
      R`First derivative (product rule): \(f'(x) = ${lead}e^{x}(${firstBracket})\).`,
      R`Differentiate again with the product rule. The derivative of \(e^{x}\) is \(e^{x}\), and the derivative of \(${firstBracket}\) is \(${poly(polyDeriv(n === 1 ? [1, n] : n === 2 ? [1, n, 0] : [1, n, 0, 0]))}\).`,
      R`Add the two parts and factor out \(e^{x}\): \(f''(x) = ${lead}e^{x}(${bracket(2 * n, c2)})\).`,
    ],
    rule: 3,
    skill: 'higher-order derivatives',
    check: () => {
      const d1 = (x) => a * Math.exp(x) * (x ** n + n * x ** (n - 1));
      const d2 = (x) => a * Math.exp(x) * (x ** n + 2 * n * x ** (n - 1) + (n >= 2 ? c2 * x ** (n - 2) : 0));
      return checkDeriv(d1, d2);
    },
  });
}

function challengeTableQuotient(rng) {
  const p = rng.int(-3, 5);
  const g = rng.pick([-2, -1, 1, 2]);
  const [f, df, dg] = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const ans = frac(df * g - f * dg, g * g);
  return q({
    prompt: R`The table gives values of \(f\), \(g\) and their derivatives at \(x = ${p}\). If \(h(x) = \dfrac{f(x)}{g(x)}\), find \(h'(${p})\).`,
    visual: tableVisual(p, f, df, g, dg),
    correct: ans,
    wrong: [
      { value: frac(f * dg - df * g, g * g), why: R`The numerator is \(f'g - fg'\). The derivative of the top comes first.` },
      { value: frac(df, dg), why: 'The derivative of a quotient is not the quotient of the derivatives.' },
      { value: frac(df * g - f * dg, g), why: R`Divide by \(g(${p})^{2}\), not \(g(${p})\).` },
      frac(df * g + f * dg, g * g),
    ],
    solution: [
      R`Quotient rule: \(h'(x) = \dfrac{f'(x)g(x) - f(x)g'(x)}{g(x)^{2}}\).`,
      R`At \(x = ${p}\): \(h'(${p}) = \dfrac{${product(df, g)} - ${product(f, dg)}}{(${g})^{2}}\).`,
      R`\(h'(${p}) = \dfrac{${df * g - f * dg}}{${g * g}} = ${ans.tex()}\).`,
    ],
    rule: 4,
    skill: 'quotient rule',
  });
}

function challengeFindCoefficient(rng) {
  const a = rng.nonzero(-5, 5);
  const b = rng.int(-9, 9);
  const [p1, p2] = rng.pick([[1, 2], [0, 1], [1, 3], [-1, 1], [2, 3], [0, 2]]);
  const m1 = 2 * a * p1 + b;
  const m2 = 2 * a * p2 + b;
  return q({
    prompt: R`A function has the form \(f(x) = ax^{2} + bx + 7\). You know \(f'(${p1}) = ${m1}\) and \(f'(${p2}) = ${m2}\). What is \(a\)?`,
    correct: a,
    fmt: (v) => R`\(a = ${num(v)}\)`,
    wrong: [
      { value: 2 * a, why: R`\(${2 * a}\) is \(2a\), the coefficient of \(x\) in \(f'(x)\). Divide by 2.` },
      { value: b, why: R`That is \(b\). The question asks for \(a\).` },
      -a,
      frac(m2 - m1, 1),
    ],
    solution: [
      R`Differentiate: \(f'(x) = 2ax + b\).`,
      R`Use the two facts: \(${terms([[2 * p1, 'a'], [1, 'b']])} = ${m1}\) and \(${terms([[2 * p2, 'a'], [1, 'b']])} = ${m2}\).`,
      R`Subtract the first equation from the second: \(${terms([[2 * (p2 - p1), 'a']])} = ${m2 - m1}\), so \(a = ${a}\).`,
    ],
    rule: 1,
    skill: 'working backwards',
    check: () => (2 * a * p1 + b === m1 && 2 * a * p2 + b === m2 ? true : 'coefficients do not reproduce the given slopes'),
  });
}

// ───────────── Model ─────────────

function tangentWindow(f, p, y0) {
  const span = 3;
  const ys = [];
  for (let i = 0; i <= 24; i++) ys.push(f(p - span + (2 * span * i) / 24));
  const lo = Math.min(...ys, y0);
  const hi = Math.max(...ys, y0);
  const pad = Math.max(1, (hi - lo) * 0.12);
  return { x: [p - span, p + span], y: [lo - pad, hi + pad] };
}

export default {
  id: 'derivative-rules',
  title: 'Basic Derivative Rules',
  summary: 'Power, sum, product and quotient rules, plus derivatives of sin, cos, eˣ and ln x.',
  standards: ['AP Calculus 2.5', 'AP Calculus 2.6', 'AP Calculus 2.7', 'AP Calculus 2.8', 'AP Calculus 2.9', 'AP Calculus 2.10'],

  explain: {
    intro: R`The derivative \(f'(x)\) gives the slope of the graph of \(f\) at each point: the instantaneous rate of change. Computing it from the limit definition every time is slow, so we use a small set of rules that cover almost every function you will meet.`,
    rules: [
      {
        title: 'Power rule',
        text: R`For any real number \(n\): \(\dfrac{d}{dx}\,x^{n} = n\,x^{n-1}\). Bring the exponent down as a multiplier, then lower the exponent by 1.`,
        example: R`\(\dfrac{d}{dx}\,x^{5} = 5x^{4}\).`,
      },
      {
        title: 'Constants, constant multiples and sums',
        text: R`The derivative of a constant is 0. A constant multiple stays in front: \((c\,f)' = c\,f'\). Sums and differences are differentiated term by term: \((f \pm g)' = f' \pm g'\).`,
        example: R`\(\dfrac{d}{dx}\left(4x^{3} - 7x + 2\right) = 12x^{2} - 7\).`,
      },
      {
        title: 'Four derivatives to know by heart',
        text: R`\(\dfrac{d}{dx}\sin x = \cos x\), \(\;\dfrac{d}{dx}\cos x = -\sin x\), \(\;\dfrac{d}{dx}e^{x} = e^{x}\), \(\;\dfrac{d}{dx}\ln x = \dfrac{1}{x}\).`,
        example: R`\(\dfrac{d}{dx}\left(3\sin x - 2e^{x}\right) = 3\cos x - 2e^{x}\).`,
      },
      {
        title: 'Product rule',
        text: R`For a product \(u \cdot v\): \((uv)' = u'v + uv'\). Differentiate one factor at a time and add. It is **not** \(u' \cdot v'\).`,
        example: R`\(\dfrac{d}{dx}\left(x^{2}\sin x\right) = 2x\sin x + x^{2}\cos x\).`,
      },
      {
        title: 'Quotient rule',
        text: R`For a quotient: \(\left(\dfrac{u}{v}\right)' = \dfrac{u'v - uv'}{v^{2}}\). The order in the numerator matters because of the subtraction.`,
        example: R`\(\dfrac{d}{dx}\left(\dfrac{x}{x + 1}\right) = \dfrac{(1)(x + 1) - (x)(1)}{(x + 1)^{2}} = \dfrac{1}{(x + 1)^{2}}\).`,
      },
      {
        title: 'Rewrite first',
        text: R`Roots and reciprocals are powers in disguise: \(\sqrt{x} = x^{1/2}\) and \(\dfrac{1}{x^{n}} = x^{-n}\). Rewrite, then use the power rule.`,
        example: R`\(\dfrac{d}{dx}\,\dfrac{1}{x^{3}} = \dfrac{d}{dx}\,x^{-3} = -3x^{-4} = -\dfrac{3}{x^{4}}\).`,
      },
    ],
    vocab: [
      { term: 'derivative', def: R`The function \(f'(x)\) giving the slope of the tangent line to \(f\) at each \(x\).` },
      { term: 'tangent line', def: 'The line that touches a curve at a point and has the same slope as the curve there.' },
      { term: 'second derivative', def: R`The derivative of the derivative, written \(f''(x)\). It measures how the slope is changing.` },
    ],
    mistakes: [
      R`Multiplying derivatives: \((uv)' \neq u'v'\). Use the product rule.`,
      R`Using the power rule on \(e^{x}\). The variable is in the exponent, so \(\dfrac{d}{dx}e^{x} = e^{x}\), not \(x\,e^{x-1}\).`,
      R`Dropping the minus sign in \(\dfrac{d}{dx}\cos x = -\sin x\).`,
      R`Reversing the numerator of the quotient rule. It is \(u'v - uv'\).`,
    ],
  },

  examples: [
    {
      title: 'Power and sum rules',
      problem: R`Differentiate \(f(x) = 5x^{4} - 3x^{2} + 8x - 6\).`,
      steps: [
        R`Work term by term. \(5x^{4} \to 5 \cdot 4x^{3} = 20x^{3}\).`,
        R`\(-3x^{2} \to -6x\), and \(8x \to 8\).`,
        R`The constant \(-6\) has derivative 0.`,
      ],
      answer: R`\(f'(x) = 20x^{3} - 6x + 8\)`,
    },
    {
      title: 'Rewrite, then differentiate',
      problem: R`Differentiate \(g(x) = 6\sqrt{x} + \dfrac{2}{x^{2}}\).`,
      steps: [
        R`Rewrite as powers: \(g(x) = 6x^{1/2} + 2x^{-2}\).`,
        R`Power rule on each term: \(6 \cdot \tfrac{1}{2}x^{-1/2} + 2 \cdot (-2)x^{-3} = 3x^{-1/2} - 4x^{-3}\).`,
        R`Write without negative exponents.`,
      ],
      answer: R`\(g'(x) = \dfrac{3}{\sqrt{x}} - \dfrac{4}{x^{3}}\)`,
    },
    {
      title: 'Product rule',
      problem: R`Differentiate \(h(x) = x^{3}e^{x}\).`,
      steps: [
        R`Let \(u = x^{3}\) and \(v = e^{x}\). Then \(u' = 3x^{2}\) and \(v' = e^{x}\).`,
        R`\(h'(x) = u'v + uv' = 3x^{2}e^{x} + x^{3}e^{x}\).`,
        R`Factor if you like: \(h'(x) = x^{2}e^{x}(3 + x)\).`,
      ],
      answer: R`\(h'(x) = 3x^{2}e^{x} + x^{3}e^{x}\)`,
    },
    {
      title: 'Quotient rule',
      problem: R`Differentiate \(y = \dfrac{2x + 1}{x - 3}\).`,
      steps: [
        R`Let \(u = 2x + 1\) and \(v = x - 3\). Then \(u' = 2\) and \(v' = 1\).`,
        R`\(y' = \dfrac{u'v - uv'}{v^{2}} = \dfrac{2(x - 3) - (2x + 1)(1)}{(x - 3)^{2}}\).`,
        R`Simplify the numerator: \(2x - 6 - 2x - 1 = -7\).`,
      ],
      answer: R`\(y' = -\dfrac{7}{(x - 3)^{2}}\)`,
    },
    {
      title: 'Word problem: a ball thrown upward',
      word: true,
      problem: R`A ball is thrown upward. Its height after \(t\) seconds is \(h(t) = -16t^{2} + 48t + 5\) feet. How fast is it moving at \(t = 1\) second, and when does it reach its highest point?`,
      steps: [
        R`Velocity is the derivative of height: \(v(t) = h'(t) = -32t + 48\).`,
        R`At \(t = 1\): \(v(1) = -32 + 48 = 16\) feet per second (positive, so it is still rising).`,
        R`At the highest point the ball stops rising, so \(v(t) = 0\): \(-32t + 48 = 0\) gives \(t = 1.5\) seconds.`,
      ],
      answer: 'It is rising at 16 ft/s at t = 1 s, and it reaches its highest point at t = 1.5 s.',
      visual: {
        type: 'plot',
        x: [0, 3.2],
        y: [0, 45],
        fns: [{ f: (t) => -16 * t * t + 48 * t + 5 }],
        points: [{ x: 1, y: 37, label: 'slope 16' }, { x: 1.5, y: 41, label: 'slope 0', color: 'b' }],
        axisLabels: ['t (s)', 'h (ft)'],
        alt: 'Graph of the height of the ball over time: a downward-opening parabola rising to a peak of 41 feet at 1.5 seconds. At 1 second the curve is still rising with slope 16.',
      },
    },
  ],

  models: [
    {
      id: 'power-rule',
      title: 'Power rule: differentiate a·xⁿ',
      intro: 'Pick a coefficient and an exponent (negative exponents are allowed).',
      inputs: [
        { name: 'a', label: 'Coefficient a', type: 'int', min: -12, max: 12, value: 3 },
        { name: 'n', label: 'Exponent n', type: 'int', min: -6, max: 9, value: 4 },
      ],
      compute({ a, n }) {
        if (a === 0) return { problem: R`\(f(x) = 0\)`, steps: [R`With \(a = 0\) the function is the constant 0.`, 'A constant never changes, so its derivative is 0.'], answer: R`\(f'(x) = 0\)` };
        if (n === 0) return { problem: R`\(f(x) = ${a}\)`, steps: [R`\(x^{0} = 1\), so \(f(x) = ${a}\) is a constant.`, 'The derivative of a constant is 0.'], answer: R`\(f'(x) = 0\)` };
        const steps = [
          R`Power rule: \(\dfrac{d}{dx}\,x^{n} = n\,x^{n-1}\), and the constant \(${a}\) stays in front.`,
          R`Bring the exponent down: \(${a} \cdot ${paren(n)} = ${a * n}\).`,
          R`Lower the exponent by 1: \(${n} - 1 = ${n - 1}\).`,
        ];
        if (n - 1 < 0) steps.push(R`With a positive exponent: \(${mono(a * n, n - 1)} = ${a * n < 0 ? '-' : ''}\dfrac{${Math.abs(a * n)}}{${power('x', 1 - n)}}\).`);
        return { problem: R`\(f(x) = ${mono(a, n)}\)`, steps, answer: R`\(f'(x) = ${mono(a * n, n - 1)}\)` };
      },
    },
    {
      id: 'tangent-quadratic',
      title: 'Tangent line to a parabola',
      intro: 'Choose a quadratic and a point. See the derivative, the slope there, and the tangent line.',
      inputs: [
        { name: 'a', label: 'a (x² coefficient)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'b', label: 'b (x coefficient)', type: 'int', min: -8, max: 8, value: -2 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'p', label: 'x-value of the point', type: 'int', min: -5, max: 5, value: 2 },
      ],
      compute({ a, b, c, p }) {
        const f = (x) => a * x * x + b * x + c;
        const y0 = f(p);
        const m = 2 * a * p + b;
        const k = y0 - m * p;
        return {
          problem: R`Find the tangent line to \(f(x) = ${poly([a, b, c])}\) at \(x = ${p}\).`,
          steps: [
            R`Differentiate: \(f'(x) = ${linear(2 * a, b)}\).`,
            R`Slope at the point: \(f'(${p}) = ${m}\).`,
            R`Point on the curve: \(f(${p}) = ${y0}\), so the point is \((${p}, ${y0})\).`,
            R`Point-slope form: \(y - ${paren(y0)} = ${m}(x - ${paren(p)})\).`,
          ],
          answer: R`\(y = ${linear(m, k)}\)`,
          visual: {
            type: 'plot',
            ...tangentWindow(f, p, y0),
            fns: [{ f }, { f: (x) => m * x + k, color: 'b', dashed: true }],
            points: [{ x: p, y: y0, label: `(${p}, ${y0})` }],
            alt: `Graph of the parabola with its tangent line at x = ${p}. The tangent line touches the curve at (${p}, ${y0}) and has slope ${m}.`,
          },
        };
      },
    },
    {
      id: 'thrown-ball',
      title: 'Word problem: how fast is the ball moving?',
      word: true,
      intro: 'Change the launch speed, the starting height and the time.',
      inputs: [
        { name: 'v0', label: 'Launch speed (ft/s)', type: 'int', min: 0, max: 120, value: 64 },
        { name: 'h0', label: 'Starting height (ft)', type: 'int', min: 0, max: 100, value: 6 },
        { name: 't', label: 'Time (seconds)', type: 'number', min: 0, max: 6, step: 0.5, value: 1 },
      ],
      compute({ v0, h0, t }) {
        const h = (x) => -16 * x * x + v0 * x + h0;
        const land = (v0 + Math.sqrt(v0 * v0 + 64 * h0)) / 32;
        if (t > land) return { error: `The ball has already landed by then (it lands after about ${num(land, { places: 2 })} seconds). Try an earlier time.` };
        const v = -32 * t + v0;
        const peak = v0 / 32;
        const steps = [
          R`Height: \(h(t) = ${terms([[-16, 't^{2}'], [v0, 't'], [h0, '']])}\) feet.`,
          R`Velocity is the derivative of height: \(v(t) = h'(t) = ${terms([[-32, 't'], [v0, '']])}\).`,
          R`At \(t = ${num(t)}\): \(v = -32(${num(t)}) + ${v0} = ${num(v)}\) ft/s.`,
          v > 0 ? 'The velocity is positive, so the ball is still rising.' : v < 0 ? 'The velocity is negative, so the ball is on its way down.' : 'The velocity is 0: the ball is at its highest point.',
        ];
        return {
          problem: R`A ball is thrown upward at ${v0} ft/s from a height of ${h0} ft. How fast is it moving after ${num(t)} seconds?`,
          steps,
          answer: R`\(${num(v)}\) ft/s ${v > 0 ? '(rising)' : v < 0 ? '(falling)' : '(at the top)'}`,
          visual: {
            type: 'plot',
            x: [0, Math.max(1, Math.ceil(land * 10) / 10)],
            y: [0, Math.max(10, h(peak) * 1.15)],
            fns: [{ f: h }],
            points: [{ x: t, y: h(t), label: `v = ${num(v)}` }],
            axisLabels: ['t (s)', 'h (ft)'],
            alt: `Graph of the ball's height over time, a downward-opening parabola. At ${num(t)} seconds the velocity (the slope) is ${num(v)} feet per second.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyPower, easyPolynomial, easyBasic, easyLinearConstant],
    medium: [mediumRewrite, mediumTrigExp, mediumEvaluate, mediumVelocity],
    hard: [hardProductPoly, hardProductMixed, hardQuotient, hardTableProduct, hardTangentLine],
    challenge: [challengeHorizontal, challengeQuotientMixed, challengeSecond, challengeTableQuotient, challengeFindCoefficient],
  },
};
