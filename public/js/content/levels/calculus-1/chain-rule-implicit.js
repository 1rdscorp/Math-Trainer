import { R, q, frac, gcd, terms, poly, polyEval, polyDeriv, linear, power, over, num, txt, ordinal, round, range, factorial, checkDeriv, checkEqual, checkAll, numDeriv, numPartial } from '../../lib/index.js';
import { M, dfrac, fit, rowTable, numDeriv2 } from './_shared.js';

// name(u) or name^k(u), e.g. fn('sin', '3x', 2) → \sin^{2}(3x)
const fn = (name, u, k = 1) => (k === 1 ? `\\${name}(${u})` : `\\${name}^{${k}}(${u})`);
const xk = (k) => power('x', k);
const T = (c, body) => M(terms([[c, body]]));

// ───────────── Easy ─────────────

function easyPowerLinear(rng) {
  const a = rng.pick([-4, -3, -2, 2, 3, 4, 5, 6]);
  const b = rng.nonzero(-9, 9);
  const n = rng.int(3, 8);
  const u = linear(a, b);
  const pw = (c, k) => T(c, k === 1 ? `(${u})` : `(${u})^{${k}}`);
  return q({
    prompt: R`Differentiate \(y = (${u})^{${n}}\).`,
    correct: pw(a * n, n - 1),
    wrong: [
      { value: pw(n, n - 1), why: R`Multiply by the derivative of the inside as well: \(\frac{d}{dx}(${u}) = ${a}\).` },
      { value: pw(a * n, n), why: 'The power rule on the outside lowers the exponent by 1.' },
      pw(a, n - 1),
      pw(a * n, n - 2),
    ],
    solution: [
      R`Outside: \(u^{${n}}\). Inside: \(u = ${u}\).`,
      R`Derivative of the outside, with the inside left alone: \(${n}(${u})^{${n - 1}}\).`,
      R`Multiply by the derivative of the inside, \(${a}\): \(\dfrac{dy}{dx} = ${terms([[a * n, `(${u})^{${n - 1}}`]])}\).`,
    ],
    rule: 0,
    skill: 'chain rule with powers',
    check: () => checkDeriv((x) => (a * x + b) ** n, (x) => a * n * (a * x + b) ** (n - 1)),
  });
}

function easyTrigExpLinear(rng) {
  const a = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7]);
  const b = rng.bool(0.4) ? rng.nonzero(-9, 9) : 0;
  const u = linear(a, b);
  const kind = rng.pick(['sin', 'cos', 'exp']);
  const body = { sin: fn('sin', u), cos: fn('cos', u), exp: `e^{${u}}` };
  const spec = {
    sin: {
      correct: T(a, body.cos),
      wrong: [{ value: T(1, body.cos), why: R`Multiply by the derivative of the inside, which is \(${a}\).` }, { value: T(-a, body.cos), why: R`The derivative of sine is \(+\cos\). Only cosine picks up a minus sign.` }, T(a, body.sin), T(a, '\\cos x')],
      f: Math.sin,
      df: Math.cos,
      rule: R`\(\frac{d}{du}\sin u = \cos u\)`,
    },
    cos: {
      correct: T(-a, body.sin),
      wrong: [{ value: T(-1, body.sin), why: R`Multiply by the derivative of the inside, which is \(${a}\).` }, { value: T(a, body.sin), why: R`\(\frac{d}{du}\cos u = -\sin u\). Keep the minus sign.` }, T(-a, body.cos), T(-a, '\\sin x')],
      f: Math.cos,
      df: (x) => -Math.sin(x),
      rule: R`\(\frac{d}{du}\cos u = -\sin u\)`,
    },
    exp: {
      correct: T(a, body.exp),
      wrong: [{ value: T(1, body.exp), why: R`Multiply by the derivative of the exponent, which is \(${a}\).` }, { value: M(`(${u})e^{${linear(a, b - 1)}}`), why: R`The power rule is for \(x^{n}\). Here the variable is in the exponent, so \(e^{u}\) keeps its exponent.` }, T(-a, body.exp), T(a, 'e^{x}')],
      f: Math.exp,
      df: Math.exp,
      rule: R`\(\frac{d}{du}e^{u} = e^{u}\)`,
    },
  }[kind];
  return q({
    prompt: R`Find \(\dfrac{dy}{dx}\) for \(y = ${body[kind]}\).`,
    correct: spec.correct,
    wrong: spec.wrong,
    solution: [R`Inside: \(u = ${u}\), with \(\dfrac{du}{dx} = ${a}\).`, R`Outside: ${spec.rule}, with the inside left alone.`, R`Multiply the two: \(\dfrac{dy}{dx} = ${spec.correct.slice(2, -2)}\).`],
    rule: 1,
    skill: 'chain rule with trig and exponentials',
    check: () => checkDeriv((x) => spec.f(a * x + b), (x) => a * spec.df(a * x + b), [0.11, 0.23, 0.37]),
  });
}

function easyIdentifyLayers(rng) {
  const n = rng.int(3, 9);
  const k = rng.int(2, 5);
  const a = rng.int(2, 9);
  const b = rng.nonzero(-9, 9);
  const pair = (o, i) => R`Outside \(${o}\), inside \(u = ${i}\)`;
  const reversed = 'The outside function is the operation performed last when you evaluate the expression.';
  const deriv = 'That is the derivative of the outside. The question asks for the outside function itself.';
  const p = terms([[1, 'x^{2}'], [b, 'x']]);
  const lin = linear(a, b);
  const q2 = terms([[a, 'x^{2}'], [b, '']]);
  const item = rng.pick([
    { y: `(${p})^{${n}}`, ok: pair(`u^{${n}}`, p), wrong: [{ value: pair(terms([[1, 'u^{2}'], [b, 'u']]), `x^{${n}}`), why: reversed }, { value: pair(`${n}u^{${n - 1}}`, p), why: deriv }, pair(`u^{${n}}`, 'x^{2}')], last: `raising to the power ${n}` },
    { y: `\\sin(x^{${k}})`, ok: pair('\\sin u', `x^{${k}}`), wrong: [{ value: pair(`u^{${k}}`, '\\sin x'), why: R`That describes \(\sin^{${k}} x = (\sin x)^{${k}}\). Here the power is applied first and the sine last.` }, { value: pair('\\cos u', `x^{${k}}`), why: deriv }, pair('\\sin u', `${k}${xk(k - 1)}`)], last: 'taking the sine' },
    { y: `\\cos^{${k}} x`, ok: pair(`u^{${k}}`, '\\cos x'), wrong: [{ value: pair('\\cos u', `x^{${k}}`), why: R`\(\cos^{${k}} x\) means \((\cos x)^{${k}}\): the cosine is taken first and the power last.` }, { value: pair(`${k}u^{${k - 1}}`, '\\cos x'), why: deriv }, pair(`u^{${k}}`, '-\\sin x')], last: `raising to the power ${k}` },
    { y: `e^{${q2}}`, ok: pair('e^{u}', q2), wrong: [{ value: pair(terms([[a, 'u^{2}'], [b, '']]), 'e^{x}'), why: reversed }, { value: pair('e^{u}', terms([[2 * a, 'x']])), why: 'That is the derivative of the inside. The inside function is the whole exponent.' }, pair('u^{2}', `e^{${a}x}`)], last: 'applying the exponential function' },
    { y: `\\sqrt{${lin}}`, ok: pair('\\sqrt{u}', lin), wrong: [{ value: pair(terms([[a, 'u'], [b, '']]), '\\sqrt{x}'), why: reversed }, { value: pair('\\dfrac{1}{2\\sqrt{u}}', lin), why: deriv }, pair('\\sqrt{u}', String(a))], last: 'taking the square root' },
    { y: `\\ln(${terms([[1, 'x^{2}'], [a, '']])})`, ok: pair('\\ln u', terms([[1, 'x^{2}'], [a, '']])), wrong: [{ value: pair(terms([[1, 'u^{2}'], [a, '']]), '\\ln x'), why: reversed }, { value: pair('\\dfrac{1}{u}', terms([[1, 'x^{2}'], [a, '']])), why: deriv }, pair('\\ln u', '2x')], last: 'taking the logarithm' },
  ]);
  return q({
    prompt: R`To differentiate \(y = ${item.y}\) with the chain rule, write it as \(y = f(u)\) with \(u = g(x)\). Which choice identifies the outside function \(f(u)\) and the inside function \(u\)?`,
    correct: item.ok,
    wrong: item.wrong,
    solution: [`Ask: when evaluating the expression for a number x, which operation is performed last? Here it is ${item.last}. That is the outside function.`, 'Everything that operation is applied to is the inside function u.', `${item.ok}.`],
    rule: 0,
    skill: 'identifying a composition',
  });
}

function easySecondDerivative(rng) {
  const coefs = [rng.nonzero(-4, 4), rng.int(-6, 6), rng.int(-9, 9), rng.int(-9, 9)];
  const d1 = polyDeriv(coefs);
  const d2 = polyDeriv(d1);
  const f1 = (x) => polyEval(d1, x);
  const check = () => checkAll(checkDeriv((x) => polyEval(coefs, x), f1), checkDeriv(f1, (x) => polyEval(d2, x)));
  if (rng.bool(0.5)) {
    const p = rng.int(-3, 3);
    const v = polyEval(d2, p);
    return q({
      prompt: R`If \(f(x) = ${poly(coefs)}\), what is \(f''(${p})\)?`,
      correct: v,
      wrong: [{ value: polyEval(d1, p), why: R`That is \(f'(${p})\). Differentiate once more before substituting.` }, { value: polyEval(coefs, p), why: R`That is \(f(${p})\). The second derivative needs two differentiations.` }, d2[0] * p, v + d1[d1.length - 1]],
      solution: [R`First derivative: \(f'(x) = ${poly(d1)}\).`, R`Second derivative: \(f''(x) = ${poly(d2)}\).`, R`Substitute \(x = ${p}\): \(f''(${p}) = ${v}\).`],
      rule: 5,
      skill: 'higher-order derivatives',
      check,
    });
  }
  return q({
    prompt: R`Find the second derivative \(f''(x)\) of \(f(x) = ${poly(coefs)}\).`,
    correct: M(poly(d2)),
    wrong: [
      { value: M(poly(d1)), why: 'That is the first derivative. Differentiate it once more.' },
      { value: M(poly([d2[0], d2[1] + coefs[2]])), why: R`The constant \(${coefs[2]}\) in \(f'(x)\) has derivative 0.` },
      M(poly([d2[0] / 2, d2[1]])),
      M(poly([d2[0], d2[1] / 2])),
      M(poly([d2[0], d2[1] + 1])),
    ],
    solution: [R`First derivative: \(f'(x) = ${poly(d1)}\).`, R`Differentiate again, term by term: \(f''(x) = ${poly(d2)}\).`],
    rule: 5,
    skill: 'higher-order derivatives',
    check,
  });
}

// ───────────── Medium ─────────────

function mediumPowerRoot(rng) {
  const form = rng.pick(['quad', 'root', 'recip']);
  const a = rng.int(2, 6);
  const b = rng.int(1, 9);
  const n = rng.int(2, 6);
  if (form === 'quad') {
    const s = rng.sign();
    const u = terms([[a, 'x^{2}'], [s * b, '']]);
    const pw = (k) => (k === 1 ? `(${u})` : `(${u})^{${k}}`);
    return q({
      prompt: R`Differentiate \(y = ${pw(n)}\).`,
      correct: T(2 * a * n, `x${pw(n - 1)}`),
      wrong: [
        { value: T(n, pw(n - 1)), why: R`Multiply by the derivative of the inside: \(\frac{d}{dx}(${u}) = ${2 * a}x\).` },
        { value: M(`${n}(${2 * a}x)^{${n - 1}}`), why: 'In the derivative of the outside, the inside stays exactly as it was.' },
        T(2 * a * n, `x${pw(n)}`),
        T(a * n, `x${pw(n - 1)}`),
      ],
      solution: [R`Outside: \(u^{${n}}\). Inside: \(u = ${u}\), with \(\dfrac{du}{dx} = ${2 * a}x\).`, R`\(\dfrac{dy}{dx} = ${n}${pw(n - 1)} \cdot ${2 * a}x\).`, R`\(\dfrac{dy}{dx} = ${terms([[2 * a * n, `x${pw(n - 1)}`]])}\).`],
      rule: 0,
      skill: 'chain rule with powers',
      check: () => checkDeriv((x) => (a * x * x + s * b) ** n, (x) => 2 * a * n * x * (a * x * x + s * b) ** (n - 1)),
    });
  }
  const u = linear(a, b);
  if (form === 'root') {
    const rootFrac = (fr) => `\\dfrac{${fr.n}}{${fr.d === 1 ? '' : fr.d}\\sqrt{${u}}}`;
    const half = frac(a, 2);
    return q({
      prompt: R`Differentiate \(y = \sqrt{${u}}\).`,
      correct: M(rootFrac(half)),
      wrong: [
        { value: M(rootFrac(frac(1, 2))), why: R`Multiply by the derivative of the inside, which is \(${a}\).` },
        { value: M(terms([[half, `\\sqrt{${u}}`]])), why: R`The new exponent is \(\frac{1}{2} - 1 = -\frac{1}{2}\), so the root moves to the denominator.` },
        M(rootFrac(frac(a, 1))),
        M(rootFrac(frac(2 * a, 1))),
      ],
      solution: [R`Rewrite: \(y = (${u})^{1/2}\). Outside: \(u^{1/2}\). Inside: \(u = ${u}\).`, R`\(\dfrac{dy}{dx} = \dfrac{1}{2}(${u})^{-1/2} \cdot ${a}\).`, R`\(\dfrac{dy}{dx} = ${rootFrac(half)}\).`],
      rule: 0,
      skill: 'chain rule with powers',
      check: () => checkDeriv((x) => Math.sqrt(a * x + b), (x) => a / (2 * Math.sqrt(a * x + b))),
    });
  }
  const den = (k) => `(${u})^{${k}}`;
  return q({
    prompt: R`Differentiate \(y = \dfrac{1}{${den(n)}}\).`,
    correct: M(over(-a * n, den(n + 1))),
    wrong: [
      { value: M(over(-n, den(n + 1))), why: R`Multiply by the derivative of the inside, which is \(${a}\).` },
      { value: M(over(a * n, den(n + 1))), why: R`The exponent \(-${n}\) is negative, so bringing it down makes the derivative negative.` },
      { value: M(over(-a * n, den(n - 1))), why: R`Subtracting 1 from \(-${n}\) gives \(-${n + 1}\).` },
      M(over(-a, den(n + 1))),
    ],
    solution: [R`Rewrite: \(y = (${u})^{-${n}}\). Outside: \(u^{-${n}}\). Inside: \(u = ${u}\).`, R`\(\dfrac{dy}{dx} = -${n}(${u})^{-${n + 1}} \cdot ${a}\).`, R`\(\dfrac{dy}{dx} = ${over(-a * n, den(n + 1))}\).`],
    rule: 0,
    skill: 'chain rule with powers',
    check: () => checkDeriv((x) => (a * x + b) ** -n, (x) => -a * n * (a * x + b) ** (-n - 1)),
  });
}

function mediumExpLog(rng) {
  const a = rng.pick([-4, -3, -2, 2, 3, 4, 5]);
  const b = rng.nonzero(-6, 6);
  const c = rng.int(1, 9);
  const p = rng.int(2, 6);
  const k = rng.int(2, 4);
  const base = rng.pick([2, 3, 5, 7, 10]);
  const ex = terms([[a, 'x^{2}']]);
  const exb = terms([[a, 'x^{2}'], [b, 'x']]);
  const lq = terms([[1, 'x^{2}'], [c, '']]);
  const ll = linear(p, c);
  const xpk = `x^{${k}}`;
  const s = rng.pick([
    { y: `e^{${ex}}`, ok: T(2 * a, `xe^{${ex}}`), wrong: [{ value: M(`e^{${ex}}`), why: R`Multiply by the derivative of the exponent, \(${2 * a}x\).` }, { value: T(a, `x^{2}e^{${terms([[a, 'x^{2}'], [-1, '']])}}`), why: R`The power rule does not apply to \(e^{u}\): the exponent stays the same.` }, T(2 * a, `xe^{${terms([[2 * a, 'x']])}}`), T(a, `xe^{${ex}}`)], f: (x) => Math.exp(a * x * x), df: (x) => 2 * a * x * Math.exp(a * x * x), how: [R`Outside: \(e^{u}\). Inside: \(u = ${ex}\), with \(\dfrac{du}{dx} = ${2 * a}x\).`, R`\(e^{u}\) is its own derivative, so \(\dfrac{dy}{dx} = e^{${ex}} \cdot ${a < 0 ? `(${2 * a}x)` : `${2 * a}x`}\).`] },
    { y: `e^{${exb}}`, ok: M(`(${linear(2 * a, b)})e^{${exb}}`), wrong: [{ value: M(`e^{${exb}}`), why: R`Multiply by the derivative of the exponent, \(${linear(2 * a, b)}\).` }, { value: M(`(${exb})e^{${exb}}`), why: 'Multiply by the derivative of the exponent, not by the exponent itself.' }, M(`(${linear(2 * a, b)})e^{${linear(2 * a, b)}}`), M(`(${linear(a, b)})e^{${exb}}`)], f: (x) => Math.exp(a * x * x + b * x), df: (x) => (2 * a * x + b) * Math.exp(a * x * x + b * x), how: [R`Outside: \(e^{u}\). Inside: \(u = ${exb}\), with \(\dfrac{du}{dx} = ${linear(2 * a, b)}\).`, R`\(e^{u}\) is its own derivative, so \(\dfrac{dy}{dx} = e^{u} \cdot \dfrac{du}{dx}\).`] },
    { y: `\\ln(${lq})`, ok: M(`\\dfrac{2x}{${lq}}`), wrong: [{ value: M(`\\dfrac{1}{${lq}}`), why: R`Multiply by the derivative of the inside, \(2x\).` }, { value: M('\\dfrac{1}{2x}'), why: R`\(\frac{d}{du}\ln u = \frac{1}{u}\) with the inside left alone, then times \(\frac{du}{dx}\).` }, M(`\\dfrac{2x}{(${lq})^{2}}`), M(`\\dfrac{x}{${lq}}`)], f: (x) => Math.log(x * x + c), df: (x) => (2 * x) / (x * x + c), how: [R`Outside: \(\ln u\). Inside: \(u = ${lq}\), with \(\dfrac{du}{dx} = 2x\).`, R`\(\dfrac{dy}{dx} = \dfrac{1}{u} \cdot \dfrac{du}{dx} = \dfrac{1}{${lq}} \cdot 2x\).`] },
    { y: `\\ln(${ll})`, ok: M(`\\dfrac{${p}}{${ll}}`), wrong: [{ value: M(`\\dfrac{1}{${ll}}`), why: R`Multiply by the derivative of the inside, which is \(${p}\).` }, { value: M(`\\dfrac{1}{${p}}`), why: R`\(\frac{d}{du}\ln u = \frac{1}{u}\) with the inside left alone, then times \(\frac{du}{dx}\).` }, M(`\\dfrac{${p}}{(${ll})^{2}}`), M(`\\dfrac{${p}}{x}`)], f: (x) => Math.log(p * x + c), df: (x) => p / (p * x + c), how: [R`Outside: \(\ln u\). Inside: \(u = ${ll}\), with \(\dfrac{du}{dx} = ${p}\).`, R`\(\dfrac{dy}{dx} = \dfrac{1}{u} \cdot \dfrac{du}{dx} = \dfrac{1}{${ll}} \cdot ${p}\).`] },
    { y: fn('sin', xpk), ok: T(k, `${xk(k - 1)}${fn('cos', xpk)}`), wrong: [{ value: M(fn('cos', xpk)), why: R`Multiply by the derivative of the inside, \(${k}${xk(k - 1)}\).` }, { value: M(fn('cos', `${k}${xk(k - 1)}`)), why: 'In the derivative of the outside, the inside stays exactly as it was.' }, T(-k, `${xk(k - 1)}${fn('cos', xpk)}`), T(k, `${xk(k - 1)}${fn('sin', xpk)}`)], f: (x) => Math.sin(x ** k), df: (x) => k * x ** (k - 1) * Math.cos(x ** k), how: [R`Outside: \(\sin u\). Inside: \(u = ${xpk}\), with \(\dfrac{du}{dx} = ${k}${xk(k - 1)}\).`, R`\(\dfrac{dy}{dx} = \cos(u) \cdot \dfrac{du}{dx}\).`] },
    { y: fn('cos', xpk), ok: T(-k, `${xk(k - 1)}${fn('sin', xpk)}`), wrong: [{ value: M(`-${fn('sin', xpk)}`), why: R`Multiply by the derivative of the inside, \(${k}${xk(k - 1)}\).` }, { value: T(k, `${xk(k - 1)}${fn('sin', xpk)}`), why: R`\(\frac{d}{du}\cos u = -\sin u\). Keep the minus sign.` }, M(`-${fn('sin', `${k}${xk(k - 1)}`)}`), T(-k, `${xk(k - 1)}${fn('cos', xpk)}`)], f: (x) => Math.cos(x ** k), df: (x) => -k * x ** (k - 1) * Math.sin(x ** k), how: [R`Outside: \(\cos u\). Inside: \(u = ${xpk}\), with \(\dfrac{du}{dx} = ${k}${xk(k - 1)}\).`, R`\(\dfrac{dy}{dx} = -\sin(u) \cdot \dfrac{du}{dx}\).`] },
    { y: `${base}^{x}`, ok: M(`${base}^{x}\\ln ${base}`), wrong: [{ value: M(`x \\cdot ${base}^{x - 1}`), why: R`The power rule is for \(x^{n}\). Here the variable is in the exponent.` }, { value: M(`${base}^{x}`), why: R`Only \(e^{x}\) is its own derivative. Any other base \(b\) brings a factor \(\ln b\).` }, M(`\\dfrac{${base}^{x}}{\\ln ${base}}`), M(`${base}^{x}\\ln x`)], f: (x) => base ** x, df: (x) => base ** x * Math.log(base), how: [R`Write \(${base}^{x} = e^{x\ln ${base}}\). Outside: \(e^{u}\). Inside: \(u = x\ln ${base}\), with \(\dfrac{du}{dx} = \ln ${base}\).`, R`\(\dfrac{dy}{dx} = e^{x\ln ${base}} \cdot \ln ${base}\).`] },
  ]);
  return q({
    prompt: R`Find \(\dfrac{dy}{dx}\) for \(y = ${s.y}\).`,
    correct: s.ok,
    wrong: s.wrong,
    solution: [...s.how, R`\(\dfrac{dy}{dx} = ${s.ok.slice(2, -2)}\).`],
    rule: 1,
    skill: 'chain rule with exponentials and logs',
    check: () => checkDeriv(s.f, s.df, [0.31, 0.57, 0.83]),
  });
}

function chainTable(rng) {
  const xs = [1, 2, 3, 4];
  const g = rng.shuffle(xs);
  const f = xs.map(() => rng.int(1, 9));
  const df = xs.map(() => rng.nonzero(-6, 6));
  const dg = xs.map(() => rng.nonzero(-5, 5));
  const visual = (ff = f) => rowTable(['x', 'f(x)', "f'(x)", 'g(x)', "g'(x)"], xs.map((x, i) => [x, ff[i], df[i], g[i], dg[i]]), `Table of values. ${xs.map((x, i) => `At x = ${x}: f = ${txt(ff[i])}, f′ = ${txt(df[i])}, g = ${g[i]}, g′ = ${txt(dg[i])}`).join('. ')}.`);
  return { xs, f, df, g, dg, visual };
}

function mediumTableChain(rng) {
  let t;
  do t = chainTable(rng);
  while (t.xs.every((x) => t.g[x - 1] === x));
  const a = rng.pick(t.xs.filter((x) => t.g[x - 1] !== x));
  const ga = t.g[a - 1];
  const ans = t.df[ga - 1] * t.dg[a - 1];
  return q({
    prompt: R`The table gives values of \(f\), \(g\) and their derivatives. If \(h(x) = f(g(x))\), find \(h'(${a})\).`,
    visual: t.visual(),
    correct: ans,
    wrong: [
      { value: t.df[a - 1] * t.dg[a - 1], why: R`\(f'\) must be evaluated at the inside value \(g(${a}) = ${ga}\), not at \(${a}\).` },
      { value: t.df[ga - 1], why: R`Multiply by the derivative of the inside, \(g'(${a}) = ${t.dg[a - 1]}\).` },
      t.f[ga - 1] * t.dg[a - 1],
      t.df[a - 1] * t.g[a - 1],
      -ans,
    ],
    solution: [R`Chain rule: \(h'(x) = f'(g(x)) \cdot g'(x)\).`, R`At \(x = ${a}\): \(g(${a}) = ${ga}\), so \(h'(${a}) = f'(${ga}) \cdot g'(${a})\).`, R`\(h'(${a}) = (${t.df[ga - 1]})(${t.dg[a - 1]}) = ${ans}\).`],
    rule: 0,
    skill: 'chain rule from a table',
    check: () => checkEqual(numDeriv((x) => t.f[ga - 1] + t.df[ga - 1] * (ga + t.dg[a - 1] * (x - a) - ga), a), ans, 1e-6, "h'(a)"),
  });
}

function mediumImplicitCircle(rng) {
  const [a, b] = rng.pick([[1, 1], [1, 1], [1, 4], [4, 1], [1, 2], [2, 1], [9, 4], [4, 9], [1, 3], [3, 1]]);
  const x0 = rng.nonzero(-4, 4);
  const y0 = rng.nonzero(-4, 4);
  const c = a * x0 * x0 + b * y0 * y0;
  const curve = `${terms([[a, 'x^{2}'], [b, 'y^{2}']])} = ${c}`;
  const r = frac(a, b);
  const slopeTex = (sign, pn, qn) => `${sign < 0 ? '-' : ''}\\dfrac{${pn === 1 ? '' : pn}x}{${qn === 1 ? '' : qn}y}`;
  const branch = (x) => Math.sign(y0) * Math.sqrt((c - a * x * x) / b);
  const m = frac(-a * x0, b * y0);
  const steps = [
    R`Differentiate both sides with respect to \(x\), remembering that \(y\) is a function of \(x\): \(${terms([[2 * a, 'x'], [2 * b, 'y\\,\\dfrac{dy}{dx}']])} = 0\).`,
    R`Solve for \(\dfrac{dy}{dx}\): \(\dfrac{dy}{dx} = -\dfrac{${2 * a}x}{${2 * b}y} = ${slopeTex(-1, r.n, r.d)}\).`,
  ];
  if (rng.bool(0.5)) {
    return q({
      prompt: R`Use implicit differentiation to find \(\dfrac{dy}{dx}\) for the curve \(${curve}\).`,
      correct: M(slopeTex(-1, r.n, r.d)),
      wrong: [
        { value: M(slopeTex(1, r.n, r.d)), why: R`When \(${2 * a}x\) moves to the other side of the equation its sign changes.` },
        { value: M(`-\\dfrac{${r.d === 1 ? '' : r.d}y}{${r.n === 1 ? '' : r.n}x}`), why: R`Divide by the coefficient of \(\frac{dy}{dx}\), which is \(${2 * b}y\). That puts \(y\) in the denominator.` },
        { value: M(r.d === 1 ? terms([[-r.n, 'x']]) : `-\\dfrac{${r.n === 1 ? '' : r.n}x}{${r.d}}`), why: R`\(\frac{d}{dx}(y^{2}) = 2y\,\frac{dy}{dx}\): the factor \(y\) stays.` },
        M(slopeTex(-1, r.d === 1 && r.n === 1 ? 2 : r.d, r.d === 1 && r.n === 1 ? 1 : r.n)),
      ],
      solution: steps,
      rule: 3,
      skill: 'implicit differentiation',
      check: () => checkEqual(numDeriv(branch, x0), m.value, 1e-5, 'slope on the curve'),
    });
  }
  return q({
    prompt: R`Find the slope of the tangent line to the curve \(${curve}\) at the point \((${x0}, ${y0})\).`,
    correct: m,
    wrong: [
      { value: m.neg(), why: R`\(\dfrac{dy}{dx} = ${slopeTex(-1, r.n, r.d)}\): keep the minus sign that appears when solving.` },
      { value: m.inv(), why: R`\(x\) belongs in the numerator and \(y\) in the denominator.` },
      frac(-x0, y0).eq(m) ? frac(-a * x0, b) : frac(-x0, y0),
      frac(-a * x0, b),
      frac(x0, y0),
    ],
    solution: [...steps, R`Substitute \((${x0}, ${y0})\): \(\dfrac{dy}{dx} = -\dfrac{${a}(${x0})}{${b}(${y0})} = ${m.tex()}\).`],
    rule: 3,
    skill: 'implicit differentiation',
    check: () => checkEqual(numDeriv(branch, x0), m.value, 1e-5, 'slope on the curve'),
  });
}

const RATE_CHAINS = [
  { text: (r, v) => `The air temperature drops ${r}°C for every kilometer of altitude gained. A weather balloon climbs at ${v} kilometers per minute. How fast is the temperature around the balloon changing?`, rs: [5, 6, 7, 8, 9], vs: [0.1, 0.2, 0.3, 0.4, 0.5], sign: -1, unit: '°C/min', y: 'T', x: 'h' },
  { text: (r, v) => `Water pressure increases by ${r} kilopascals for every meter of depth. A diver descends at ${v} meters per second. How fast is the pressure on the diver changing?`, rs: [9, 10, 11], vs: [0.2, 0.3, 0.4, 0.5, 0.6], sign: 1, unit: 'kPa/s', y: 'P', x: 'd' },
  { text: (r, v) => `A truck burns ${r} liters of fuel for each kilometer it travels, and it is travelling at ${v} kilometers per hour. How fast is it burning fuel?`, rs: [0.2, 0.3, 0.4, 0.5], vs: [60, 70, 80, 90, 100], sign: 1, unit: 'L/h', y: 'F', x: 's' },
  { text: (r, v) => `A bakery pays ${r} dollars for each kilogram of flour and uses ${v} kilograms of flour per hour. How fast is the bakery's spending on flour growing?`, rs: [2, 3, 4, 5, 6], vs: [5, 15, 25, 35, 45], sign: 1, unit: 'dollars per hour', y: 'C', x: 'm' },
];

function mediumChainRates(rng) {
  const s = rng.pick(RATE_CHAINS);
  const r = rng.pick(s.rs);
  const v = rng.pick(s.vs);
  const ans = round(s.sign * r * v, 2);
  const [big, small] = [Math.max(r, v), Math.min(r, v)];
  return q({
    prompt: s.text(r, v),
    correct: ans,
    unit: s.unit,
    wrong: [
      s.sign < 0 ? { value: -ans, why: 'The quantity is falling, so its rate of change is negative.' } : { value: round(big / small, 2), why: 'The two rates are multiplied, not divided: the units in the middle cancel.' },
      { value: round(s.sign * (r + v), 2), why: 'Rates along a chain multiply. Adding them mixes different units.' },
      round((s.sign * big) / small, 2),
      round(s.sign * big, 2),
      round(ans * 10, 2),
    ],
    solution: [
      R`Two rates are linked: \(\dfrac{d${s.y}}{d${s.x}} = ${num(s.sign * r)}\) and \(\dfrac{d${s.x}}{dt} = ${num(v)}\).`,
      R`Chain rule: \(\dfrac{d${s.y}}{dt} = \dfrac{d${s.y}}{d${s.x}} \cdot \dfrac{d${s.x}}{dt} = (${num(s.sign * r)})(${num(v)}) = ${num(ans)}\).`,
      `The rate of change is ${txt(ans)} ${s.unit}.`,
    ],
    rule: 0,
    skill: 'chain rule with rates',
    check: () => checkEqual(numDeriv((t) => 50 + s.sign * r * (v * t), 3), ans, 1e-6, 'rate'),
  });
}

// ───────────── Hard ─────────────

function hardDoubleChain(rng) {
  const a = rng.pick([2, 3, 4, 5, 6]);
  const n = rng.int(2, 5);
  const b = rng.nonzero(-5, 5);
  const ax = `${a}x`;
  const u = linear(a, b);
  const s = rng.pick([
    { y: fn('sin', ax, n), ok: T(n * a, `${fn('sin', ax, n - 1)}${fn('cos', ax)}`), wrong: [{ value: T(n, `${fn('sin', ax, n - 1)}${fn('cos', ax)}`), why: R`There are three layers. The innermost, \(${ax}\), contributes a factor \(${a}\).` }, { value: T(n * a, fn('sin', ax, n - 1)), why: R`The middle layer \(\sin(\cdot)\) contributes its derivative, \(\cos(${ax})\).` }, T(n * a, fn('cos', ax, n - 1)), T(-n * a, `${fn('sin', ax, n - 1)}${fn('cos', ax)}`)], f: (x) => Math.sin(a * x) ** n, df: (x) => n * a * Math.sin(a * x) ** (n - 1) * Math.cos(a * x), layers: [R`Layers, from the outside in: \(u^{${n}}\), then \(\sin(\cdot)\), then \(${ax}\).`, R`Differentiate each layer and multiply: \(${n}${fn('sin', ax, n - 1)} \cdot \cos(${ax}) \cdot ${a}\).`] },
    { y: fn('cos', ax, n), ok: T(-n * a, `${fn('cos', ax, n - 1)}${fn('sin', ax)}`), wrong: [{ value: T(-n, `${fn('cos', ax, n - 1)}${fn('sin', ax)}`), why: R`There are three layers. The innermost, \(${ax}\), contributes a factor \(${a}\).` }, { value: T(n * a, `${fn('cos', ax, n - 1)}${fn('sin', ax)}`), why: R`The middle layer \(\cos(\cdot)\) has derivative \(-\sin(\cdot)\).` }, T(-n * a, fn('cos', ax, n - 1)), T(-n * a, fn('sin', ax, n - 1))], f: (x) => Math.cos(a * x) ** n, df: (x) => -n * a * Math.cos(a * x) ** (n - 1) * Math.sin(a * x), layers: [R`Layers, from the outside in: \(u^{${n}}\), then \(\cos(\cdot)\), then \(${ax}\).`, R`Differentiate each layer and multiply: \(${n}${fn('cos', ax, n - 1)} \cdot \left(-\sin(${ax})\right) \cdot ${a}\).`] },
    { y: `e^{${fn('sin', ax)}}`, ok: T(a, `${fn('cos', ax)}e^{${fn('sin', ax)}}`), wrong: [{ value: T(1, `${fn('cos', ax)}e^{${fn('sin', ax)}}`), why: R`The innermost layer, \(${ax}\), contributes a factor \(${a}\).` }, { value: T(a, `${fn('cos', ax)}e^{${fn('cos', ax)}}`), why: R`\(e^{u}\) keeps its exponent: the exponent is not differentiated in place.` }, T(a, `e^{${fn('sin', ax)}}`), T(-a, `${fn('cos', ax)}e^{${fn('sin', ax)}}`)], f: (x) => Math.exp(Math.sin(a * x)), df: (x) => a * Math.cos(a * x) * Math.exp(Math.sin(a * x)), layers: [R`Layers, from the outside in: \(e^{u}\), then \(\sin(\cdot)\), then \(${ax}\).`, R`Differentiate each layer and multiply: \(e^{\sin(${ax})} \cdot \cos(${ax}) \cdot ${a}\).`] },
    { y: fn('sin', `e^{${ax}}`), ok: T(a, `e^{${ax}}${fn('cos', `e^{${ax}}`)}`), wrong: [{ value: T(1, `e^{${ax}}${fn('cos', `e^{${ax}}`)}`), why: R`The innermost layer, \(${ax}\), contributes a factor \(${a}\).` }, { value: T(a, fn('cos', `e^{${ax}}`)), why: R`The middle layer \(e^{${ax}}\) contributes its own derivative, \(${a}e^{${ax}}\).` }, T(a, `e^{${ax}}${fn('cos', `${a}e^{${ax}}`)}`), T(-a, `e^{${ax}}${fn('cos', `e^{${ax}}`)}`)], f: (x) => Math.sin(Math.exp(a * x)), df: (x) => a * Math.exp(a * x) * Math.cos(Math.exp(a * x)), layers: [R`Layers, from the outside in: \(\sin(u)\), then \(e^{(\cdot)}\), then \(${ax}\).`, R`Differentiate each layer and multiply: \(\cos(e^{${ax}}) \cdot e^{${ax}} \cdot ${a}\).`] },
    { y: `e^{(${u})^{2}}`, ok: T(2 * a, `(${u})e^{(${u})^{2}}`), wrong: [{ value: T(2, `(${u})e^{(${u})^{2}}`), why: R`The innermost layer, \(${u}\), contributes a factor \(${a}\).` }, { value: T(2 * a, `(${u})e^{2(${u})}`), why: R`\(e^{u}\) keeps its exponent: the exponent is not differentiated in place.` }, T(a, `e^{(${u})^{2}}`), T(2 * a, `e^{(${u})^{2}}`)], f: (x) => Math.exp((a * x + b) ** 2), df: (x) => 2 * a * (a * x + b) * Math.exp((a * x + b) ** 2), layers: [R`Layers, from the outside in: \(e^{u}\), then \((\cdot)^{2}\), then \(${u}\).`, R`Differentiate each layer and multiply: \(e^{(${u})^{2}} \cdot 2(${u}) \cdot ${a}\).`], xs: [-b / a + 0.1, -b / a + 0.3, -b / a - 0.2] },
  ]);
  return q({
    prompt: R`Differentiate \(y = ${s.y}\).`,
    correct: s.ok,
    wrong: s.wrong,
    solution: [...s.layers, R`\(\dfrac{dy}{dx} = ${s.ok.slice(2, -2)}\).`],
    rule: 2,
    skill: 'repeated chain rule',
    check: () => checkDeriv(s.f, s.df, s.xs ?? [0.07, 0.13, 0.21]),
  });
}

function hardChainProduct(rng) {
  const a = rng.pick([-4, -3, -2, 2, 3, 4, 5]);
  const p = Math.abs(a);
  const n = rng.int(1, 4);
  const ax = terms([[a, 'x']]);
  const e = `e^{${ax}}`;
  const s = rng.pick([
    {
      y: `${xk(n)}${e}`,
      ok: M(`${xk(n - 1)}${e}(${linear(a, n)})`),
      wrong: [{ value: T(a * n, `${xk(n - 1)}${e}`), why: R`That multiplies the two derivatives. The product rule is \(u'v + uv'\).` }, { value: M(`${xk(n - 1)}${e}(${linear(1, n)})`), why: R`\(\frac{d}{dx}${e} = ${a}${e}\) by the chain rule. The factor \(${a}\) is missing.` }, M(`${xk(n - 1)}${e}(${linear(a, -n)})`), M(`${xk(n)}${e}(${linear(a, n)})`)],
      f: (x) => x ** n * Math.exp(a * x),
      df: (x) => x ** (n - 1) * Math.exp(a * x) * (a * x + n),
      how: [R`Product rule with \(u = ${xk(n)}\) and \(v = ${e}\): \(u' = ${n === 1 ? '1' : `${n}${xk(n - 1)}`}\) and, by the chain rule, \(v' = ${a}${e}\).`, R`\(u'v + uv' = ${n === 1 ? '' : n}${xk(n - 1)}${e} ${a > 0 ? '+' : '-'} ${p}${xk(n)}${e}\).`, R`Factor out \(${xk(n - 1)}${e}\).`],
    },
    {
      y: `${xk(n)}${fn('sin', `${p}x`)}`,
      ok: M(terms([[n, `${xk(n - 1)}${fn('sin', `${p}x`)}`], [p, `${xk(n)}${fn('cos', `${p}x`)}`]])),
      wrong: [{ value: T(n * p, `${xk(n - 1)}${fn('cos', `${p}x`)}`), why: R`That multiplies the two derivatives. The product rule is \(u'v + uv'\).` }, { value: M(terms([[n, `${xk(n - 1)}${fn('sin', `${p}x`)}`], [1, `${xk(n)}${fn('cos', `${p}x`)}`]])), why: R`\(\frac{d}{dx}\sin(${p}x) = ${p}\cos(${p}x)\) by the chain rule. The factor \(${p}\) is missing.` }, M(terms([[n, `${xk(n - 1)}${fn('sin', `${p}x`)}`], [-p, `${xk(n)}${fn('cos', `${p}x`)}`]])), M(terms([[n, `${xk(n - 1)}${fn('cos', `${p}x`)}`], [p, `${xk(n)}${fn('sin', `${p}x`)}`]]))],
      f: (x) => x ** n * Math.sin(p * x),
      df: (x) => n * x ** (n - 1) * Math.sin(p * x) + p * x ** n * Math.cos(p * x),
      how: [R`Product rule with \(u = ${xk(n)}\) and \(v = \sin(${p}x)\): \(u' = ${n === 1 ? '1' : `${n}${xk(n - 1)}`}\) and, by the chain rule, \(v' = ${p}\cos(${p}x)\).`, R`Add \(u'v\) and \(uv'\).`],
    },
    {
      y: `${xk(n + 1)}\\ln(${p}x)`,
      ok: M(`${xk(n)}\\left(${n + 1}\\ln(${p}x) + 1\\right)`),
      wrong: [{ value: M(`${xk(n)}\\left(${n + 1}\\ln(${p}x) + ${p}\\right)`), why: R`\(\frac{d}{dx}\ln(${p}x) = \frac{${p}}{${p}x} = \frac{1}{x}\): the \(${p}\) cancels.` }, { value: M(`${n + 1}${xk(n - 1)}`), why: R`That multiplies the two derivatives. The product rule is \(u'v + uv'\).` }, M(`${xk(n)}\\left(${n + 1}\\ln(${p}x) - 1\\right)`), M(`${xk(n + 1)}\\left(${n + 1}\\ln(${p}x) + 1\\right)`)],
      f: (x) => x ** (n + 1) * Math.log(p * x),
      df: (x) => x ** n * ((n + 1) * Math.log(p * x) + 1),
      how: [R`Product rule with \(u = ${xk(n + 1)}\) and \(v = \ln(${p}x)\): \(u' = ${n + 1}${xk(n)}\) and, by the chain rule, \(v' = \dfrac{${p}}{${p}x} = \dfrac{1}{x}\).`, R`\(u'v + uv' = ${n + 1}${xk(n)}\ln(${p}x) + ${xk(n + 1)} \cdot \dfrac{1}{x} = ${n + 1}${xk(n)}\ln(${p}x) + ${xk(n)}\).`, R`Factor out \(${xk(n)}\).`],
    },
  ]);
  return q({
    prompt: R`Differentiate \(y = ${s.y}\). Give the answer in simplified form.`,
    correct: s.ok,
    wrong: s.wrong,
    solution: [...s.how, R`\(\dfrac{dy}{dx} = ${s.ok.slice(2, -2)}\).`],
    rule: 1,
    skill: 'chain rule with the product rule',
    check: () => checkDeriv(s.f, s.df, [0.37, 0.83, 1.29]),
  });
}

const IMPLICIT = [
  { tex: 'x^{2} + xy + y^{2}', F: (x, y) => x * x + x * y + y * y, top: (x, y) => -(2 * x + y), bot: (x, y) => x + 2 * y, diff: R`2x + y + x\,\dfrac{dy}{dx} + 2y\,\dfrac{dy}{dx} = 0`, formula: R`-\dfrac{2x + y}{x + 2y}`, naive: (x, y) => frac(-x, y), naiveWhy: R`The term \(xy\) needs the product rule: its derivative is \(y + x\,\frac{dy}{dx}\).` },
  { tex: 'x^{3} + y^{3}', F: (x, y) => x ** 3 + y ** 3, top: (x) => -x * x, bot: (x, y) => y * y, diff: R`3x^{2} + 3y^{2}\,\dfrac{dy}{dx} = 0`, formula: R`-\dfrac{x^{2}}{y^{2}}`, naive: (x, y) => frac(-x, y), naiveWhy: R`\(\frac{d}{dx}(y^{3}) = 3y^{2}\,\frac{dy}{dx}\), so the squares stay: \(\frac{dy}{dx} = -\frac{x^{2}}{y^{2}}\).` },
  { tex: 'x^{2}y + y^{3}', F: (x, y) => x * x * y + y ** 3, top: (x, y) => -2 * x * y, bot: (x, y) => x * x + 3 * y * y, diff: R`2xy + x^{2}\,\dfrac{dy}{dx} + 3y^{2}\,\dfrac{dy}{dx} = 0`, formula: R`-\dfrac{2xy}{x^{2} + 3y^{2}}`, naive: (x, y) => frac(-2 * x, 3 * y * y), naiveWhy: R`The term \(x^{2}y\) needs the product rule: its derivative is \(2xy + x^{2}\,\frac{dy}{dx}\).` },
  { tex: 'xy + y^{2}', F: (x, y) => x * y + y * y, top: (x, y) => -y, bot: (x, y) => x + 2 * y, diff: R`y + x\,\dfrac{dy}{dx} + 2y\,\dfrac{dy}{dx} = 0`, formula: R`-\dfrac{y}{x + 2y}`, naive: (x, y) => frac(-1, 2 * y), naiveWhy: R`The term \(xy\) needs the product rule: its derivative is \(y + x\,\frac{dy}{dx}\).` },
  { tex: 'x^{2} - xy + y^{2}', F: (x, y) => x * x - x * y + y * y, top: (x, y) => -(2 * x - y), bot: (x, y) => 2 * y - x, diff: R`2x - y - x\,\dfrac{dy}{dx} + 2y\,\dfrac{dy}{dx} = 0`, formula: R`\dfrac{y - 2x}{2y - x}`, naive: (x, y) => frac(-x, y), naiveWhy: R`The term \(xy\) needs the product rule: its derivative is \(y + x\,\frac{dy}{dx}\).` },
];

function hardImplicitMixed(rng) {
  let s;
  let x0;
  let y0;
  do {
    s = rng.pick(IMPLICIT);
    x0 = rng.nonzero(-3, 3);
    y0 = rng.nonzero(-3, 3);
  } while (s.bot(x0, y0) === 0 || s.top(x0, y0) === 0 || s.F(x0, y0) === 0);
  const c = s.F(x0, y0);
  const m = frac(s.top(x0, y0), s.bot(x0, y0));
  const naive = s.naive(x0, y0);
  return q({
    prompt: R`Find \(\dfrac{dy}{dx}\) at the point \((${x0}, ${y0})\) on the curve \(${s.tex} = ${c}\).`,
    correct: m,
    wrong: [
      { value: naive, why: s.naiveWhy },
      { value: m.neg(), why: R`Moving the terms without \(\frac{dy}{dx}\) to the other side changes their signs.` },
      m.inv(),
      frac(s.top(x0, y0) + 1, s.bot(x0, y0)),
      frac(s.top(y0, x0), s.bot(y0, x0) === 0 ? 1 : s.bot(y0, x0)),
    ],
    solution: [
      R`Differentiate both sides with respect to \(x\); every \(y\)-term gets a factor \(\dfrac{dy}{dx}\): \(${s.diff}\).`,
      R`Collect the \(\dfrac{dy}{dx}\) terms and solve: \(\dfrac{dy}{dx} = ${s.formula}\).`,
      R`Substitute \(x = ${x0}\), \(y = ${y0}\): \(\dfrac{dy}{dx} = ${dfrac(String(s.top(x0, y0)), String(s.bot(x0, y0)))}${m.tex() === dfrac(String(s.top(x0, y0)), String(s.bot(x0, y0))).replace('dfrac', 'frac') ? '' : ` = ${m.tex()}`}\).`,
    ],
    rule: 3,
    skill: 'implicit differentiation',
    check: () => checkEqual(-numPartial(s.F, [x0, y0], 0) / numPartial(s.F, [x0, y0], 1), m.value, 1e-5, 'slope from the partial derivatives'),
  });
}

function hardInverseFunction(rng) {
  if (rng.bool(0.55)) {
    const p = rng.int(1, 6);
    const q0 = rng.int(-6, 6);
    const a = rng.int(-2, 2);
    const coefs = [1, 0, p, q0];
    const f = (x) => polyEval(coefs, x);
    const b = f(a);
    const slope = 3 * a * a + p;
    const inv = (y) => {
      let lo = -20;
      let hi = 20;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < y) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };
    return q({
      prompt: R`Let \(f(x) = ${poly(coefs)}\), and let \(g\) be the inverse function of \(f\). Find \(g'(${b})\).`,
      correct: frac(1, slope),
      wrong: [
        { value: frac(1, 3 * b * b + p), why: R`\(f'\) must be evaluated at \(g(${b})\), the input that produces \(${b}\), not at \(${b}\) itself.` },
        { value: slope, why: R`That is \(f'(${a})\). The inverse function has the reciprocal slope.` },
        frac(-1, slope),
        frac(1, slope + 1),
        a !== 0 ? frac(1, 3 * a * a) : frac(1, slope + 2),
      ],
      solution: [
        R`\(g'(b) = \dfrac{1}{f'(a)}\), where \(f(a) = b\).`,
        R`Find the input that gives \(${b}\): \(f(${a}) = ${b}\), so \(g(${b}) = ${a}\).`,
        R`\(f'(x) = ${poly(polyDeriv(coefs))}\), so \(f'(${a}) = ${slope}\).`,
        R`\(g'(${b}) = \dfrac{1}{${slope}}\).`,
      ],
      rule: 4,
      skill: 'derivative of an inverse function',
      check: () => checkEqual(numDeriv(inv, b, 1e-4), 1 / slope, 1e-5, 'slope of the inverse'),
    });
  }
  const a = rng.int(-4, 5);
  const b = rng.intExcept(-6, 7, [a]);
  const m = rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
  const m2 = rng.intExcept(-7, 7, [0, m, 1, -1]);
  return q({
    prompt: R`A differentiable function \(f\) has an inverse function \(g\). You know that \(f(${a}) = ${b}\), \(f'(${a}) = ${m}\) and \(f'(${b}) = ${m2}\). Find \(g'(${b})\).`,
    correct: frac(1, m),
    wrong: [
      { value: frac(1, m2), why: R`\(g'(${b}) = \dfrac{1}{f'(g(${b}))}\), and \(g(${b}) = ${a}\). So use \(f'(${a})\), not \(f'(${b})\).` },
      { value: m, why: 'The inverse function has the reciprocal slope at the matching point.' },
      frac(-1, m),
      m2,
    ],
    solution: [R`\(f(${a}) = ${b}\) means \(g(${b}) = ${a}\).`, R`\(g'(${b}) = \dfrac{1}{f'(g(${b}))} = \dfrac{1}{f'(${a})}\).`, R`\(g'(${b}) = ${frac(1, m).tex()}\).`],
    rule: 4,
    skill: 'derivative of an inverse function',
    check: () => checkEqual(numDeriv((y) => a + (y - b) / m, b), 1 / m, 1e-6, 'slope of the inverse'),
  });
}

function hardInverseTrig(rng) {
  const a = rng.int(2, 7);
  const ax = `${a}x`;
  const a2 = `${a * a}x^{2}`;
  const rootDen = (inside) => `\\sqrt{1 - ${inside}}`;
  const s = rng.pick([
    { y: `\\arcsin(${ax})`, ok: M(`\\dfrac{${a}}{${rootDen(a2)}}`), wrong: [{ value: M(`\\dfrac{1}{${rootDen(a2)}}`), why: R`Multiply by the derivative of the inside, which is \(${a}\).` }, { value: M(`\\dfrac{${a}}{${rootDen(`${a}x^{2}`)}}`), why: R`The inside is squared as a whole: \((${ax})^{2} = ${a2}\).` }, M(`\\dfrac{${a}}{1 + ${a2}}`), M(`-\\dfrac{${a}}{${rootDen(a2)}}`)], f: (x) => Math.asin(a * x), df: (x) => a / Math.sqrt(1 - a * a * x * x), base: R`\(\dfrac{d}{du}\arcsin u = \dfrac{1}{\sqrt{1 - u^{2}}}\)` },
    { y: `\\arccos(${ax})`, ok: M(`-\\dfrac{${a}}{${rootDen(a2)}}`), wrong: [{ value: M(`-\\dfrac{1}{${rootDen(a2)}}`), why: R`Multiply by the derivative of the inside, which is \(${a}\).` }, { value: M(`\\dfrac{${a}}{${rootDen(a2)}}`), why: R`The derivative of \(\arccos u\) is the negative of the derivative of \(\arcsin u\).` }, M(`-\\dfrac{${a}}{${rootDen(`${a}x^{2}`)}}`), M(`-\\dfrac{${a}}{1 + ${a2}}`)], f: (x) => Math.acos(a * x), df: (x) => -a / Math.sqrt(1 - a * a * x * x), base: R`\(\dfrac{d}{du}\arccos u = -\dfrac{1}{\sqrt{1 - u^{2}}}\)` },
    { y: `\\arctan(${ax})`, ok: M(`\\dfrac{${a}}{1 + ${a2}}`), wrong: [{ value: M(`\\dfrac{1}{1 + ${a2}}`), why: R`Multiply by the derivative of the inside, which is \(${a}\).` }, { value: M(`\\dfrac{${a}}{1 + ${a}x^{2}}`), why: R`The inside is squared as a whole: \((${ax})^{2} = ${a2}\).` }, M(`\\dfrac{${a}}{${rootDen(a2)}}`), M(`\\dfrac{${a}}{1 - ${a2}}`)], f: (x) => Math.atan(a * x), df: (x) => a / (1 + a * a * x * x), base: R`\(\dfrac{d}{du}\arctan u = \dfrac{1}{1 + u^{2}}\)` },
    { y: '\\arctan(x^{2})', ok: M('\\dfrac{2x}{1 + x^{4}}'), wrong: [{ value: M('\\dfrac{1}{1 + x^{4}}'), why: R`Multiply by the derivative of the inside, \(2x\).` }, { value: M('\\dfrac{2x}{1 + x^{2}}'), why: R`The inside is squared as a whole: \((x^{2})^{2} = x^{4}\).` }, M('\\dfrac{2x}{\\sqrt{1 - x^{4}}}'), M('\\dfrac{2}{1 + x^{4}}')], f: (x) => Math.atan(x * x), df: (x) => (2 * x) / (1 + x ** 4), base: R`\(\dfrac{d}{du}\arctan u = \dfrac{1}{1 + u^{2}}\)`, inside: 'x^{2}', du: '2x' },
    { y: '\\arcsin(x^{2})', ok: M('\\dfrac{2x}{\\sqrt{1 - x^{4}}}'), wrong: [{ value: M('\\dfrac{1}{\\sqrt{1 - x^{4}}}'), why: R`Multiply by the derivative of the inside, \(2x\).` }, { value: M('\\dfrac{2x}{\\sqrt{1 - x^{2}}}'), why: R`The inside is squared as a whole: \((x^{2})^{2} = x^{4}\).` }, M('\\dfrac{2x}{1 + x^{4}}'), M('-\\dfrac{2x}{\\sqrt{1 - x^{4}}}')], f: (x) => Math.asin(x * x), df: (x) => (2 * x) / Math.sqrt(1 - x ** 4), base: R`\(\dfrac{d}{du}\arcsin u = \dfrac{1}{\sqrt{1 - u^{2}}}\)`, inside: 'x^{2}', du: '2x' },
  ]);
  return q({
    prompt: R`Differentiate \(y = ${s.y}\).`,
    correct: s.ok,
    wrong: s.wrong,
    solution: [R`Inside: \(u = ${s.inside ?? ax}\), with \(\dfrac{du}{dx} = ${s.du ?? a}\).`, `Outside: ${s.base}, with the inside left alone.`, R`Multiply: \(\dfrac{dy}{dx} = ${s.ok.slice(2, -2)}\).`],
    rule: 4,
    skill: 'inverse trigonometric functions',
    check: () => checkDeriv(s.f, s.df, [0.02, 0.05, 0.11]),
  });
}

function hardExpModel(rng) {
  const k = rng.pick([0.1, 0.2, 0.5]);
  const kt = rng.int(1, 3);
  const t0 = round(kt / k, 2);
  const eTo = (sign) => `e^{${sign < 0 ? '-' : ''}${kt === 1 && sign > 0 ? '1' : kt}}`.replace('e^{1}', 'e');
  if (rng.bool(0.5)) {
    const Ts = rng.pick([18, 20, 22, 25]);
    const D = rng.pick([40, 50, 60, 70, 80]);
    const Tf = (t) => Ts + D * Math.exp(-k * t);
    const rate = -k * D;
    const val = (c) => R`\(${num(c)}${eTo(-1)}\) °C/min`;
    return q({
      prompt: R`A cup of coffee cools so that its temperature after \(t\) minutes is \(T(t) = ${Ts} + ${D}e^{-${num(k)}t}\) degrees Celsius. How fast is the temperature changing at \(t = ${num(t0)}\) minutes?`,
      correct: val(rate),
      wrong: [
        { value: val(-D), why: R`The chain rule brings down the coefficient of \(t\) in the exponent: \(\frac{d}{dt}e^{-${num(k)}t} = -${num(k)}e^{-${num(k)}t}\).` },
        { value: val(-rate), why: 'The coffee is cooling, so the rate of change of its temperature is negative.' },
        { value: R`\(${Ts} ${rate < 0 ? '-' : '+'} ${num(Math.abs(rate))}${eTo(-1)}\) °C/min`, why: R`The constant \(${Ts}\) has derivative 0, so it does not appear in \(T'(t)\).` },
        val(rate * t0),
      ],
      solution: [
        R`The rate of change is \(T'(t)\). The constant \(${Ts}\) differentiates to 0.`,
        R`Chain rule: \(\dfrac{d}{dt}e^{-${num(k)}t} = -${num(k)}e^{-${num(k)}t}\), so \(T'(t) = ${num(rate)}e^{-${num(k)}t}\).`,
        R`At \(t = ${num(t0)}\): \(T'(${num(t0)}) = ${num(rate)}${eTo(-1)} \approx ${num(round(rate * Math.exp(-kt), 2))}\) °C/min.`,
      ],
      rule: 1,
      skill: 'rates from exponential models',
      check: () => checkEqual(numDeriv(Tf, t0), rate * Math.exp(-kt), 1e-5, "T'(t)"),
    });
  }
  const P0 = rng.pick([200, 300, 400, 500, 800, 1000]);
  const Pf = (t) => P0 * Math.exp(k * t);
  const rate = k * P0;
  const val = (c) => R`\(${num(c)}${eTo(1)}\) bacteria per hour`;
  return q({
    prompt: R`A culture of bacteria grows so that after \(t\) hours it contains \(P(t) = ${P0}e^{${num(k)}t}\) bacteria. How fast is the population growing at \(t = ${num(t0)}\) hours?`,
    correct: val(rate),
    wrong: [
      { value: val(P0), why: R`The chain rule brings down the coefficient of \(t\) in the exponent: \(\frac{d}{dt}e^{${num(k)}t} = ${num(k)}e^{${num(k)}t}\). (\(${P0}${eTo(1)}\) is the population itself.)` },
      { value: R`\(${num(rate)}\) bacteria per hour`, why: R`That is the growth rate at \(t = 0\). At \(t = ${num(t0)}\) the factor \(${eTo(1)}\) remains.` },
      val(rate * t0),
      val(P0 * t0),
    ],
    solution: [
      R`The growth rate is \(P'(t)\).`,
      R`Chain rule: \(\dfrac{d}{dt}e^{${num(k)}t} = ${num(k)}e^{${num(k)}t}\), so \(P'(t) = ${num(rate)}e^{${num(k)}t}\).`,
      R`At \(t = ${num(t0)}\): \(P'(${num(t0)}) = ${num(rate)}${eTo(1)} \approx ${num(round(rate * Math.exp(kt), 1))}\) bacteria per hour.`,
    ],
    rule: 1,
    skill: 'rates from exponential models',
    check: () => checkEqual(numDeriv(Pf, t0), rate * Math.exp(kt), 1e-5, "P'(t)"),
  });
}

// ───────────── Challenge ─────────────

function challengeTableNested(rng) {
  const t = chainTable(rng);
  const kind = rng.pick(['power', 'square-in', 'log', 'root', 'exp']);
  const a = kind === 'square-in' ? rng.int(1, 2) : rng.int(1, 4);
  const f = t.f.slice();
  if (kind === 'root') f[a - 1] = rng.pick([1, 4, 9]);
  if (kind === 'exp') f[a - 1] = 0;
  const fa = f[a - 1];
  const dfa = t.df[a - 1];
  const n = rng.int(2, 3);
  const local = (x, at) => f[at - 1] + t.df[at - 1] * (x - at);
  const spec = {
    power: () => ({
      h: `\\left[f(x)\\right]^{${n}}`,
      ans: frac(n * fa ** (n - 1) * dfa, 1),
      wrong: [{ value: dfa ** n, why: R`Differentiate the outside power and keep \(f\) inside: \(${n}\left[f(x)\right]^{${n - 1}} \cdot f'(x)\).` }, { value: n * fa ** (n - 1), why: R`Multiply by the derivative of the inside, \(f'(${a}) = ${dfa}\).` }, fa ** n, n * dfa],
      steps: [R`Chain rule: \(h'(x) = ${n}\left[f(x)\right]^{${n - 1}} \cdot f'(x)\).`, R`\(h'(${a}) = ${n}(${fa})^{${n - 1}}(${dfa})\).`],
      g: (x) => local(x, a) ** n,
    }),
    'square-in': () => ({
      h: 'f(x^{2})',
      ans: frac(2 * a * t.df[a * a - 1], 1),
      wrong: [{ value: t.df[a * a - 1], why: R`Multiply by the derivative of the inside: \(\frac{d}{dx}x^{2} = 2x\), which is \(${2 * a}\) at \(x = ${a}\).` }, { value: 2 * a * dfa, why: R`\(f'\) is evaluated at the inside value \(${a}^{2} = ${a * a}\).` }, 2 * a * f[a * a - 1], a * a * t.df[a * a - 1]],
      steps: [R`Chain rule: \(h'(x) = f'(x^{2}) \cdot 2x\).`, R`\(h'(${a}) = f'(${a * a}) \cdot ${2 * a} = (${t.df[a * a - 1]})(${2 * a})\).`],
      g: (x) => local(x * x, a * a),
    }),
    log: () => ({
      h: '\\ln\\left(f(x)\\right)',
      ans: frac(dfa, fa),
      wrong: [{ value: frac(1, fa), why: R`Multiply by the derivative of the inside, \(f'(${a}) = ${dfa}\).` }, { value: frac(1, dfa), why: R`\(\frac{d}{du}\ln u = \frac{1}{u}\) with \(u = f(${a}) = ${fa}\), then times \(f'(${a})\).` }, frac(fa, dfa), dfa * fa],
      steps: [R`Chain rule: \(h'(x) = \dfrac{1}{f(x)} \cdot f'(x) = \dfrac{f'(x)}{f(x)}\).`, R`\(h'(${a}) = \dfrac{${dfa}}{${fa}}\).`],
      g: (x) => Math.log(local(x, a)),
    }),
    root: () => ({
      h: '\\sqrt{f(x)}',
      ans: frac(dfa, 2 * Math.sqrt(fa)),
      wrong: [{ value: frac(1, 2 * Math.sqrt(fa)), why: R`Multiply by the derivative of the inside, \(f'(${a}) = ${dfa}\).` }, { value: frac(dfa, Math.sqrt(fa)), why: R`\(\frac{d}{du}\sqrt{u} = \frac{1}{2\sqrt{u}}\): the factor \(\frac{1}{2}\) is missing.` }, frac(dfa, 2 * fa), frac(dfa * Math.sqrt(fa), 2)],
      steps: [R`Chain rule: \(h'(x) = \dfrac{1}{2\sqrt{f(x)}} \cdot f'(x)\).`, R`\(h'(${a}) = \dfrac{${dfa}}{2\sqrt{${fa}}} = \dfrac{${dfa}}{${2 * Math.sqrt(fa)}}\).`],
      g: (x) => Math.sqrt(local(x, a)),
    }),
    exp: () => ({
      h: 'e^{f(x)}',
      ans: frac(dfa, 1),
      wrong: [{ value: 0, why: R`\(e^{f(${a})} = e^{0} = 1\), not 0.` }, { value: 1, why: R`\(e^{0} = 1\) is only the first factor. Multiply by \(f'(${a}) = ${dfa}\).` }, -dfa, dfa + 1],
      steps: [R`Chain rule: \(h'(x) = e^{f(x)} \cdot f'(x)\).`, R`\(h'(${a}) = e^{0} \cdot (${dfa}) = 1 \cdot (${dfa})\).`],
      g: (x) => Math.exp(local(x, a)),
    }),
  }[kind]();
  return q({
    prompt: R`The table gives values of \(f\), \(g\) and their derivatives. If \(h(x) = ${spec.h}\), find \(h'(${a})\).`,
    visual: t.visual(f),
    correct: spec.ans,
    wrong: spec.wrong,
    solution: [...spec.steps, R`\(h'(${a}) = ${spec.ans.tex()}\).`],
    rule: 0,
    skill: 'chain rule from a table',
    check: () => checkEqual(numDeriv(spec.g, a), spec.ans.value, 1e-5, "h'(a)"),
  });
}

function challengeImplicitSecond(rng) {
  const a = rng.int(1, 4);
  const c = rng.pick([4, 5, 8, 9, 10, 12, 16, 20, 25, 36]);
  const ax2 = terms([[a, 'x^{2}']]);
  const y = (x) => Math.sqrt(c - a * x * x);
  const x0 = 0.4 * Math.sqrt(c / a);
  const yp = a === 1 ? '-\\dfrac{x}{y}' : `-\\dfrac{${a}x}{y}`;
  return q({
    prompt: R`For the curve \(${ax2} + y^{2} = ${c}\), find \(\dfrac{d^{2}y}{dx^{2}}\). Use the equation of the curve to simplify your answer.`,
    correct: M(`-\\dfrac{${a * c}}{y^{3}}`),
    wrong: [
      { value: M(`\\dfrac{${a * c}}{y^{3}}`), why: R`\(\dfrac{dy}{dx} = ${yp}\) is negative when \(x\) and \(y\) are positive, and the minus sign carries through to the second derivative.` },
      { value: M(a === 1 ? '-\\dfrac{1}{y}' : `-\\dfrac{${a}}{y}`), why: R`\(${yp}\) is a quotient in which \(y\) also depends on \(x\). Use the quotient rule and substitute \(\frac{dy}{dx}\).` },
      M(`-\\dfrac{${a * c}}{y^{2}}`),
      M(`-\\dfrac{${c}}{${a === 1 ? '2' : a}y^{3}}`),
    ],
    solution: [
      R`First derivative: \(${terms([[2 * a, 'x']])} + 2y\,\dfrac{dy}{dx} = 0\), so \(\dfrac{dy}{dx} = ${yp}\).`,
      R`Differentiate again with the quotient rule, remembering that \(y\) depends on \(x\): \(\dfrac{d^{2}y}{dx^{2}} = -${a === 1 ? '' : a}\,\dfrac{y - x\,\frac{dy}{dx}}{y^{2}}\).`,
      R`Substitute \(\dfrac{dy}{dx} = ${yp}\): the numerator becomes \(y + \dfrac{${ax2}}{y} = \dfrac{y^{2} + ${ax2}}{y} = \dfrac{${c}}{y}\), using the equation of the curve.`,
      R`\(\dfrac{d^{2}y}{dx^{2}} = -\dfrac{${a * c}}{y^{3}}\).`,
    ],
    rule: 5,
    skill: 'second derivative, implicitly',
    check: () => checkEqual(numDeriv2(y, x0), (-a * c) / y(x0) ** 3, 1e-4, 'second derivative on the curve'),
  });
}

function challengeTangentLine(rng) {
  const mixed = rng.bool(0.4);
  const [a, b] = mixed ? [1, 1] : rng.pick([[1, 1], [1, 1], [1, 2], [2, 1], [1, 4], [4, 1], [1, 3], [3, 1]]);
  let x0;
  let y0;
  do {
    x0 = rng.nonzero(-4, 4);
    y0 = rng.nonzero(-4, 4);
  } while (mixed && (2 * x0 + y0 === 0 || x0 + 2 * y0 === 0 || Math.abs(x0) === Math.abs(y0)));
  const F = mixed ? (x, y) => x * x + x * y + y * y : (x, y) => a * x * x + b * y * y;
  const c = F(x0, y0);
  const [Fx, Fy] = mixed ? [2 * x0 + y0, x0 + 2 * y0] : [2 * a * x0, 2 * b * y0];
  const line = (p, qq, r) => {
    let g = gcd(gcd(p, qq), r) || 1;
    if (p < 0 || (p === 0 && qq < 0)) g = -g;
    return M(`${terms([[p / g, 'x'], [qq / g, 'y']])} = ${r / g}`);
  };
  const through = (p, qq) => line(p, qq, p * x0 + qq * y0);
  const curve = mixed ? `x^{2} + xy + y^{2} = ${c}` : `${terms([[a, 'x^{2}'], [b, 'y^{2}']])} = ${c}`;
  const m = frac(-Fx, Fy);
  return q({
    prompt: R`Find an equation of the tangent line to the curve \(${curve}\) at the point \((${x0}, ${y0})\).`,
    correct: through(Fx, Fy),
    wrong: [
      { value: through(Fx, -Fy), why: R`The slope is \(${m.tex()}\). This line has the opposite slope.` },
      { value: through(Fy, -Fx), why: 'That line is perpendicular to the tangent line: it is the normal line.' },
      mixed ? through(x0, y0) : a === b ? line(Fx, Fy, Fx * x0 + Fy * y0 + 2 * gcd(Fx, Fy)) : through(x0, y0),
      line(Fx, Fy, 0),
      through(Fy, Fx),
    ],
    solution: [
      mixed ? R`Differentiate implicitly: \(2x + y + x\,\dfrac{dy}{dx} + 2y\,\dfrac{dy}{dx} = 0\), so \(\dfrac{dy}{dx} = -\dfrac{2x + y}{x + 2y}\).` : R`Differentiate implicitly: \(${terms([[2 * a, 'x'], [2 * b, 'y\\,\\dfrac{dy}{dx}']])} = 0\), so \(\dfrac{dy}{dx} = -\dfrac{${terms([[a, 'x']])}}{${terms([[b, 'y']])}}\).`,
      R`At \((${x0}, ${y0})\) the slope is \(m = ${m.tex()}\).`,
      R`Point-slope form: \(y - ${y0 < 0 ? `(${y0})` : y0} = ${m.tex()}\left(x - ${x0 < 0 ? `(${x0})` : x0}\right)\).`,
      R`Clear the fraction and collect terms: \(${through(Fx, Fy).slice(2, -2)}\).`,
    ],
    rule: 3,
    skill: 'tangent line to an implicit curve',
    check: () => checkEqual(-numPartial(F, [x0, y0], 0) / numPartial(F, [x0, y0], 1), -Fx / Fy, 1e-5, 'slope'),
  });
}

function challengeWorkBackwards(rng) {
  const a = rng.int(-4, 5);
  const b = rng.intExcept(-6, 7, [a]);
  const m = rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
  const n = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
  const findOuter = rng.bool(0.5);
  const known = findOuter ? R`\(g'(${a}) = ${n}\)` : R`\(f'(${b}) = ${m}\)`;
  const ans = findOuter ? m : n;
  const other = findOuter ? n : m;
  return q({
    prompt: R`Let \(h(x) = f(g(x))\), where \(f\) and \(g\) are differentiable. You know that \(g(${a}) = ${b}\), ${known} and \(h'(${a}) = ${m * n}\). Find ${findOuter ? R`\(f'(${b})\)` : R`\(g'(${a})\)`}.`,
    correct: ans,
    wrong: [
      { value: m * n * other, why: R`The chain rule multiplies the two derivatives to give \(h'(${a})\). To undo that, divide.` },
      { value: m * n - other, why: 'The two derivatives are multiplied in the chain rule, not added.' },
      { value: m * n, why: R`That is \(h'(${a})\). It equals the product \(f'(${b}) \cdot g'(${a})\).` },
      frac(other, m * n),
      -ans,
    ],
    solution: [
      R`Chain rule at \(x = ${a}\): \(h'(${a}) = f'(g(${a})) \cdot g'(${a}) = f'(${b}) \cdot g'(${a})\).`,
      findOuter ? R`So \(${m * n} = f'(${b}) \cdot (${n})\).` : R`So \(${m * n} = (${m}) \cdot g'(${a})\).`,
      R`Divide: the answer is \(\dfrac{${m * n}}{${other}} = ${ans}\).`,
    ],
    rule: 0,
    skill: 'working backwards',
    check: () => checkEqual(numDeriv((x) => 7 + m * (b + n * (x - a) - b), a), m * n, 1e-6, "h'(a)"),
  });
}

function challengeNthDerivative(rng) {
  const kind = rng.pick(['trig', 'trig', 'exp', 'xexp', 'recip']);
  const base = { rule: 5, skill: 'higher-order derivatives' };
  if (kind === 'trig') {
    const n = rng.int(10, 99);
    const start = rng.pick(['sin', 'cos']);
    const cycle = start === 'sin' ? ['\\sin x', '\\cos x', '-\\sin x', '-\\cos x'] : ['\\cos x', '-\\sin x', '-\\cos x', '\\sin x'];
    const js = start === 'sin' ? [Math.sin, Math.cos, (x) => -Math.sin(x), (x) => -Math.cos(x)] : [Math.cos, (x) => -Math.sin(x), (x) => -Math.cos(x), Math.sin];
    const r = n % 4;
    const why = R`The derivatives repeat in a cycle of length 4. Divide \(${n}\) by 4 and use the remainder, \(${r}\).`;
    return q({
      ...base,
      prompt: R`Find the ${ordinal(n)} derivative of \(f(x) = ${cycle[0]}\).`,
      correct: M(cycle[r]),
      wrong: [1, 2, 3].map((d) => ({ value: M(cycle[(r + d) % 4]), why })),
      solution: [
        R`Differentiate a few times: \(${cycle[0]} \to ${cycle[1]} \to ${cycle[2]} \to ${cycle[3]} \to ${cycle[0]}\). The pattern repeats every 4 derivatives.`,
        R`\(${n} = 4 \cdot ${Math.floor(n / 4)} + ${r}\), so the ${ordinal(n)} derivative is the same as the ${r === 0 ? 'function itself (remainder 0)' : `${ordinal(r)} derivative`}.`,
        R`\(f^{(${n})}(x) = ${cycle[r]}\).`,
      ],
      check: () => checkAll(...[0, 1, 2, 3].map((i) => checkDeriv(js[i], js[(i + 1) % 4]))),
    });
  }
  if (kind === 'exp') {
    const a = rng.pick([-3, -2, 2, 3, 4]);
    const n = rng.int(3, 6);
    const e = `e^{${a}x}`;
    return q({
      ...base,
      prompt: R`Find the ${ordinal(n)} derivative of \(f(x) = ${e}\).`,
      correct: T(a ** n, e),
      wrong: [
        { value: T(a * n, e), why: R`Each differentiation multiplies by \(${a}\). Doing that \(${n}\) times gives \((${a})^{${n}}\), not \(${a} \cdot ${n}\).` },
        { value: M(e), why: R`By the chain rule, each derivative of \(${e}\) brings out a factor \(${a}\).` },
        T(a ** (n - 1), e),
        T(-(a ** n), e),
      ],
      solution: [R`\(f'(x) = ${a}${e}\), \(f''(x) = ${a * a}${e}\): each derivative multiplies by \(${a}\).`, R`After \(${n}\) derivatives the factor is \((${a})^{${n}} = ${a ** n}\).`, R`\(f^{(${n})}(x) = ${terms([[a ** n, e]])}\).`],
      check: () => checkAll(...range(0, n - 1).map((i) => checkDeriv((x) => a ** i * Math.exp(a * x), (x) => a ** (i + 1) * Math.exp(a * x), [0.1, 0.2, 0.3]))),
    });
  }
  if (kind === 'xexp') {
    const n = rng.int(5, 40);
    return q({
      ...base,
      prompt: R`Find the ${ordinal(n)} derivative of \(f(x) = xe^{x}\).`,
      correct: M(`(x + ${n})e^{x}`),
      wrong: [
        { value: M('xe^{x}'), why: R`The product rule adds one more \(e^{x}\) at every step, so the function does change.` },
        { value: M('(x + 1)e^{x}'), why: 'That is the first derivative. Each further derivative adds 1 to the number in the bracket.' },
        M(`(${n}x + 1)e^{x}`),
        M(`x^{${n}}e^{x}`),
      ],
      solution: [R`Product rule: \(f'(x) = e^{x} + xe^{x} = (x + 1)e^{x}\).`, R`Again: \(f''(x) = e^{x} + (x + 1)e^{x} = (x + 2)e^{x}\). Each derivative adds 1 inside the bracket.`, R`\(f^{(${n})}(x) = (x + ${n})e^{x}\).`],
      check: () => checkAll(...range(0, n - 1).map((i) => checkDeriv((x) => (x + i) * Math.exp(x), (x) => (x + i + 1) * Math.exp(x)))),
    });
  }
  const n = rng.int(3, 5);
  const sign = n % 2 === 0 ? 1 : -1;
  const fr = (s, c, kk) => M(over(s * c, `x^{${kk}}`));
  return q({
    ...base,
    prompt: R`Find the ${ordinal(n)} derivative of \(f(x) = \dfrac{1}{x}\).`,
    correct: fr(sign, factorial(n), n + 1),
    wrong: [
      { value: fr(-sign, factorial(n), n + 1), why: 'Each derivative brings down a negative exponent, so the sign alternates: −, +, −, +, …' },
      { value: fr(sign, n, n + 1), why: R`The exponents brought down multiply together: \(1 \cdot 2 \cdots ${n} = ${factorial(n)}\).` },
      fr(sign, factorial(n), n),
      fr(sign, factorial(n - 1), n + 1),
    ],
    solution: [R`Write \(f(x) = x^{-1}\). Then \(f'(x) = -x^{-2}\), \(f''(x) = 2x^{-3}\), \(f'''(x) = -6x^{-4}\).`, R`Pattern: the sign alternates and the coefficient is \(n!\): \(f^{(n)}(x) = (-1)^{n}\,n!\,x^{-(n + 1)}\).`, R`\(f^{(${n})}(x) = ${over(sign * factorial(n), `x^{${n + 1}}`)}\).`],
    check: () => checkAll(...range(0, n - 1).map((i) => checkDeriv((x) => (-1) ** i * factorial(i) * x ** (-i - 1), (x) => (-1) ** (i + 1) * factorial(i + 1) * x ** (-i - 2)))),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'chain-rule-implicit',
  title: 'Chain Rule & Implicit Differentiation',
  summary: 'Differentiate compositions, implicitly defined curves, inverse functions and inverse trig functions, and find higher derivatives.',
  standards: ['AP Calculus 3.1', 'AP Calculus 3.2', 'AP Calculus 3.3', 'AP Calculus 3.4', 'AP Calculus 3.5', 'AP Calculus 3.6'],

  explain: {
    intro: R`Most functions are built by putting one function inside another: \(\sin(3x)\), \(e^{x^{2}}\), \((2x + 1)^{5}\). The chain rule differentiates such compositions, and it has two important consequences: implicit differentiation, for curves such as \(x^{2} + y^{2} = 25\) that are not written as \(y = f(x)\), and a formula for the derivative of an inverse function.`,
    rules: [
      {
        title: 'The chain rule',
        text: R`If \(y = f(u)\) and \(u = g(x)\), then \(\dfrac{dy}{dx} = \dfrac{dy}{du} \cdot \dfrac{du}{dx}\), that is, \(\dfrac{d}{dx}f(g(x)) = f'(g(x)) \cdot g'(x)\). In words: the derivative of the outside, with the inside left alone, times the derivative of the inside.`,
        example: R`\(\dfrac{d}{dx}(3x^{2} + 1)^{5} = 5(3x^{2} + 1)^{4} \cdot 6x = 30x(3x^{2} + 1)^{4}\).`,
      },
      {
        title: 'Chain-rule versions of the basic derivatives',
        text: R`With \(u\) a function of \(x\): \(\dfrac{d}{dx}u^{n} = n\,u^{n-1}u'\), \(\;\dfrac{d}{dx}\sin u = \cos u \cdot u'\), \(\;\dfrac{d}{dx}\cos u = -\sin u \cdot u'\), \(\;\dfrac{d}{dx}e^{u} = e^{u}u'\), \(\;\dfrac{d}{dx}\ln u = \dfrac{u'}{u}\). Also \(\dfrac{d}{dx}b^{x} = b^{x}\ln b\), because \(b^{x} = e^{x \ln b}\).`,
        example: R`\(\dfrac{d}{dx}e^{-2x} = -2e^{-2x}\) and \(\dfrac{d}{dx}\ln(x^{2} + 1) = \dfrac{2x}{x^{2} + 1}\).`,
      },
      {
        title: 'More than two layers',
        text: R`Work from the outside in, one layer at a time, multiplying as you go. Each layer is differentiated with everything inside it left alone.`,
        example: R`\(\dfrac{d}{dx}\sin^{3}(2x) = 3\sin^{2}(2x) \cdot \cos(2x) \cdot 2 = 6\sin^{2}(2x)\cos(2x)\).`,
      },
      {
        title: 'Implicit differentiation',
        text: R`When \(x\) and \(y\) are tied together by an equation, differentiate both sides with respect to \(x\), treating \(y\) as a function of \(x\): every time you differentiate a \(y\)-expression, the chain rule adds a factor \(\dfrac{dy}{dx}\). Then solve for \(\dfrac{dy}{dx}\). A term such as \(xy\) needs the product rule.`,
        example: R`\(x^{2} + y^{2} = 25\): \(2x + 2y\,\dfrac{dy}{dx} = 0\), so \(\dfrac{dy}{dx} = -\dfrac{x}{y}\). At \((3, 4)\) the slope is \(-\dfrac{3}{4}\).`,
      },
      {
        title: 'Inverse functions and inverse trig functions',
        text: R`If \(g\) is the inverse of \(f\) and \(f(a) = b\), then \(g'(b) = \dfrac{1}{f'(a)}\): at matching points the slopes are reciprocals. This gives \(\dfrac{d}{dx}\arcsin x = \dfrac{1}{\sqrt{1 - x^{2}}}\), \(\;\dfrac{d}{dx}\arccos x = -\dfrac{1}{\sqrt{1 - x^{2}}}\), \(\;\dfrac{d}{dx}\arctan x = \dfrac{1}{1 + x^{2}}\). (\(\arcsin x\) is also written \(\sin^{-1} x\).)`,
        example: R`\(\dfrac{d}{dx}\arctan(3x) = \dfrac{1}{1 + (3x)^{2}} \cdot 3 = \dfrac{3}{1 + 9x^{2}}\).`,
      },
      {
        title: 'Higher-order derivatives',
        text: R`Differentiating \(f'\) gives the second derivative \(f''(x) = \dfrac{d^{2}y}{dx^{2}}\); differentiating again gives \(f'''\), and in general \(f^{(n)}\). For motion: position \(\to\) velocity \(\to\) acceleration.`,
        example: R`\(f(x) = \sin(2x)\): \(f'(x) = 2\cos(2x)\), \(f''(x) = -4\sin(2x)\).`,
      },
    ],
    vocab: [
      { term: 'composite function', def: R`A function of the form \(f(g(x))\): the output of the inside function \(g\) is the input of the outside function \(f\).` },
      { term: 'implicit differentiation', def: R`Finding \(\frac{dy}{dx}\) from an equation in \(x\) and \(y\) without first solving for \(y\).` },
      { term: 'inverse function', def: R`The function \(g\) that undoes \(f\): \(g(f(x)) = x\). Its graph is the reflection of the graph of \(f\) in the line \(y = x\).` },
      { term: 'second derivative', def: R`The derivative of the derivative, \(f''(x)\) or \(\frac{d^{2}y}{dx^{2}}\).` },
    ],
    mistakes: [
      R`Forgetting the derivative of the inside: \(\dfrac{d}{dx}\sin(3x)\) is \(3\cos(3x)\), not \(\cos(3x)\).`,
      R`Changing the inside while differentiating the outside: \(\dfrac{d}{dx}(x^{2} + 1)^{5}\) is not \(5(2x)^{4}\).`,
      R`In implicit differentiation, writing \(\dfrac{d}{dx}(y^{2}) = 2y\). It is \(2y\,\dfrac{dy}{dx}\).`,
      R`Forgetting the product rule on a term such as \(xy\).`,
      R`For an inverse function, evaluating \(f'\) at \(b\) instead of at \(a = g(b)\).`,
    ],
  },

  examples: [
    {
      title: 'A power of a function',
      problem: R`Differentiate \(y = (3x^{2} + 1)^{5}\).`,
      steps: [
        R`Outside: \(u^{5}\). Inside: \(u = 3x^{2} + 1\).`,
        R`Derivative of the outside, with the inside left alone: \(5(3x^{2} + 1)^{4}\).`,
        R`Derivative of the inside: \(6x\). Multiply.`,
      ],
      answer: R`\(\dfrac{dy}{dx} = 30x(3x^{2} + 1)^{4}\)`,
    },
    {
      title: 'Three layers',
      problem: R`Differentiate \(y = \cos^{2}(5x)\).`,
      steps: [
        R`Read it as \(y = \left[\cos(5x)\right]^{2}\). Layers from the outside in: \(u^{2}\), then \(\cos(\cdot)\), then \(5x\).`,
        R`Outside layer: \(2\cos(5x)\).`,
        R`Middle layer: \(-\sin(5x)\). Inside layer: \(5\).`,
        R`Multiply all three: \(2\cos(5x) \cdot (-\sin(5x)) \cdot 5\).`,
      ],
      answer: R`\(\dfrac{dy}{dx} = -10\cos(5x)\sin(5x)\)`,
    },
    {
      title: 'Implicit differentiation and a tangent line',
      problem: R`Find the tangent line to the circle \(x^{2} + y^{2} = 25\) at the point \((3, 4)\).`,
      steps: [
        R`Differentiate both sides with respect to \(x\): \(2x + 2y\,\dfrac{dy}{dx} = 0\).`,
        R`Solve: \(\dfrac{dy}{dx} = -\dfrac{x}{y}\).`,
        R`At \((3, 4)\): slope \(= -\dfrac{3}{4}\).`,
        R`Point-slope form: \(y - 4 = -\dfrac{3}{4}(x - 3)\). Multiply by 4 and rearrange.`,
      ],
      answer: R`\(3x + 4y = 25\)`,
      visual: {
        type: 'plot',
        x: [-8, 8],
        y: [-7, 9],
        square: true,
        step: [2, 2],
        param: [{ x: (t) => 5 * Math.cos(t), y: (t) => 5 * Math.sin(t), t: [0, 2 * Math.PI] }],
        fns: [{ f: (x) => (25 - 3 * x) / 4, color: 'b', dashed: true }],
        points: [{ x: 3, y: 4, label: '(3, 4)' }],
        alt: 'The circle x² + y² = 25 with its tangent line at the point (3, 4). The tangent line slopes downward with slope −3/4 and touches the circle only at that point.',
      },
    },
    {
      title: 'Derivative of an inverse function',
      problem: R`Let \(f(x) = x^{3} + x\) and let \(g\) be its inverse. Find \(g'(2)\).`,
      steps: [
        R`Find the input of \(f\) that gives 2: \(f(1) = 1 + 1 = 2\), so \(g(2) = 1\).`,
        R`\(f'(x) = 3x^{2} + 1\), so \(f'(1) = 4\).`,
        R`Slopes at matching points are reciprocals: \(g'(2) = \dfrac{1}{f'(1)}\).`,
      ],
      answer: R`\(g'(2) = \dfrac{1}{4}\)`,
    },
    {
      title: 'Word problem: bacteria',
      word: true,
      problem: R`A culture contains \(P(t) = 500e^{0.2t}\) bacteria after \(t\) hours. How fast is it growing after 5 hours?`,
      steps: [
        R`The growth rate is the derivative \(P'(t)\), in bacteria per hour.`,
        R`Chain rule: the exponent \(0.2t\) has derivative \(0.2\), so \(P'(t) = 500 \cdot 0.2\,e^{0.2t} = 100e^{0.2t}\).`,
        R`At \(t = 5\): \(P'(5) = 100e^{1} \approx 271.8\).`,
      ],
      answer: 'About 272 bacteria per hour.',
    },
  ],

  models: [
    {
      id: 'chain-power',
      title: 'Chain rule on (ax + b)ⁿ',
      intro: 'Choose the inside line, the outside power and a point. See each factor of the chain rule.',
      inputs: [
        { name: 'a', label: 'a (slope of the inside)', type: 'int', min: -6, max: 6, value: 2 },
        { name: 'b', label: 'b (constant of the inside)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'n', label: 'n (outside power)', type: 'int', min: 2, max: 6, value: 3 },
        { name: 'p', label: 'x-value', type: 'int', min: -3, max: 3, value: 1 },
      ],
      compute({ a, b, n, p }) {
        if (a === 0) return { error: 'With a = 0 the inside is a constant and there is nothing to chain. Choose a nonzero a.' };
        const u = linear(a, b);
        const up = a * p + b;
        const value = a * n * up ** (n - 1);
        return {
          problem: R`Differentiate \(y = (${u})^{${n}}\) and find the slope at \(x = ${p}\).`,
          steps: [
            R`Outside: \(y = u^{${n}}\), so \(\dfrac{dy}{du} = ${n}u^{${n - 1}}\). Inside: \(u = ${u}\), so \(\dfrac{du}{dx} = ${a}\).`,
            R`Chain rule: \(\dfrac{dy}{dx} = ${n}(${u})^{${n - 1}} \cdot (${a}) = ${terms([[a * n, `(${u})^{${n - 1}}`]])}\).`,
            R`At \(x = ${p}\) the inside is \(u = ${up}\).`,
            R`Slope: \(${a * n}(${up})^{${n - 1}} = ${num(value)}\).`,
          ],
          answer: R`\(\dfrac{dy}{dx} = ${terms([[a * n, n - 1 === 1 ? `(${u})` : `(${u})^{${n - 1}}`]])}\); at \(x = ${p}\) the slope is \(${num(value)}\).`,
        };
      },
    },
    {
      id: 'implicit-circle',
      title: 'Tangent line to a circle',
      intro: 'Pick a point with whole-number coordinates. The circle centered at the origin through that point is drawn with its tangent line.',
      inputs: [
        { name: 'x0', label: 'x-coordinate of the point', type: 'int', min: -6, max: 6, value: 3 },
        { name: 'y0', label: 'y-coordinate of the point', type: 'int', min: -6, max: 6, value: 4 },
      ],
      compute({ x0, y0 }) {
        if (x0 === 0 && y0 === 0) return { error: 'The origin is the center, not a point on a circle. Choose a different point.' };
        const c = x0 * x0 + y0 * y0;
        const r = Math.sqrt(c);
        const w = Math.ceil(r) + 3;
        const base = { type: 'plot', x: [-w, w], y: [-w, w], square: true, param: [{ x: (t) => r * Math.cos(t), y: (t) => r * Math.sin(t), t: [0, 2 * Math.PI] }], points: [{ x: x0, y: y0, label: `(${txt(x0)}, ${txt(y0)})` }] };
        const first = [R`Differentiate both sides of \(x^{2} + y^{2} = ${c}\) with respect to \(x\): \(2x + 2y\,\dfrac{dy}{dx} = 0\).`, R`Solve: \(\dfrac{dy}{dx} = -\dfrac{x}{y}\).`];
        if (y0 === 0) {
          return {
            problem: R`Find the tangent line to \(x^{2} + y^{2} = ${c}\) at \((${x0}, 0)\).`,
            steps: [...first, R`At \((${x0}, 0)\) the formula divides by \(y = 0\): the slope is not defined, because the tangent line is vertical.`],
            answer: R`The tangent line is the vertical line \(x = ${x0}\).`,
            visual: { ...base, vlines: [{ x: x0, color: 'b' }], alt: `The circle x² + y² = ${c} with a vertical tangent line at the point (${txt(x0)}, 0).` },
          };
        }
        const m = frac(-x0, y0);
        return {
          problem: R`Find the tangent line to \(x^{2} + y^{2} = ${c}\) at \((${x0}, ${y0})\).`,
          steps: [
            ...first,
            R`At \((${x0}, ${y0})\): slope \(= -\dfrac{x}{y} = ${x0 > 0 && y0 > 0 && gcd(x0, y0) === 1 ? '' : `-\\dfrac{${x0}}{${y0}} = `}${m.tex()}\).`,
            R`Point-slope form: \(y - ${y0 < 0 ? `(${y0})` : y0} = ${m.tex()}\left(x - ${x0 < 0 ? `(${x0})` : x0}\right)\).`,
            R`Multiply by \(${y0}\) and rearrange: \(${terms([[x0, 'x'], [y0, 'y']])} = ${c}\).`,
          ],
          answer: R`\(${terms([[x0, 'x'], [y0, 'y']])} = ${c}\), with slope \(${m.tex()}\).`,
          visual: { ...base, fns: [{ f: (x) => y0 + m.value * (x - x0), color: 'b', dashed: true }], alt: `The circle x² + y² = ${c} with its tangent line at the point (${txt(x0)}, ${txt(y0)}). The tangent line has slope ${m.text()}.` },
        };
      },
    },
    {
      id: 'growth-rate',
      title: 'Word problem: how fast is it growing?',
      word: true,
      intro: 'An amount grows or decays exponentially. Change the starting amount, the rate and the time.',
      inputs: [
        { name: 'P0', label: 'Starting amount', type: 'int', min: 100, max: 5000, value: 500 },
        { name: 'pct', label: 'Continuous rate (% per hour)', type: 'int', min: -30, max: 30, value: 20 },
        { name: 't', label: 'Time (hours)', type: 'number', min: 0, max: 20, step: 0.5, value: 5 },
      ],
      compute({ P0, pct, t }) {
        if (pct === 0) return { problem: R`A culture starts with ${txt(P0)} bacteria and changes at a continuous rate of 0% per hour, so \(P(t) = ${P0}\). How fast is the population changing after ${num(t)} hours?`, steps: [R`With a rate of 0% the population is the constant \(${P0}\).`, 'The derivative of a constant is 0.'], answer: R`\(P'(${num(t)}) = 0\): the population is not changing.` };
        const k = pct / 100;
        const P = (x) => P0 * Math.exp(k * x);
        const rate = k * P(t);
        const kTex = num(k);
        return {
          problem: R`A culture starts with ${txt(P0)} bacteria and changes at a continuous rate of ${pct}% per hour, so \(P(t) = ${P0}e^{${kTex}t}\). How fast is the population changing after ${num(t)} hours?`,
          steps: [
            R`The rate of change is \(P'(t)\), in bacteria per hour.`,
            R`Chain rule: the exponent \(${kTex}t\) has derivative \(${kTex}\), so \(P'(t) = ${P0} \cdot (${kTex})\,e^{${kTex}t} = ${num(round(k * P0, 4))}e^{${kTex}t}\).`,
            R`At \(t = ${num(t)}\): \(P(${num(t)}) \approx ${num(round(P(t), 1))}\) and \(P'(${num(t)}) \approx ${num(round(rate, 1))}\).`,
            pct === 0 ? 'A rate of 0% means the population is constant.' : R`Notice that \(P'(t) = ${kTex} \cdot P(t)\): the rate of change is always ${Math.abs(pct)}% of the current population.`,
          ],
          answer: R`About \(${num(round(rate, 1))}\) bacteria per hour${rate < 0 ? ' (the population is shrinking)' : ''}.`,
          visual: {
            type: 'plot',
            x: [0, Math.max(10, t + 4)],
            y: [0, Math.max(P0, P(Math.max(10, t + 4))) * 1.1],
            fns: [{ f: P }, { f: (x) => P(t) + rate * (x - t), color: 'b', dashed: true }],
            points: [{ x: t, y: P(t), label: `slope ≈ ${txt(round(rate, 1))}` }],
            axisLabels: ['t (h)', 'P'],
            alt: `Graph of the population P(t) = ${P0}e^(${txt(k)}t) with its tangent line at t = ${txt(t)} hours, where the slope is about ${txt(round(rate, 1))} bacteria per hour.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyPowerLinear, easyTrigExpLinear, easyIdentifyLayers, easySecondDerivative],
    medium: [mediumPowerRoot, mediumExpLog, mediumTableChain, mediumImplicitCircle, mediumChainRates],
    hard: [hardDoubleChain, hardChainProduct, hardImplicitMixed, hardInverseFunction, hardInverseTrig, hardExpModel],
    challenge: [challengeTableNested, challengeImplicitSecond, challengeTangentLine, challengeWorkBackwards, challengeNthDerivative],
  },
};
