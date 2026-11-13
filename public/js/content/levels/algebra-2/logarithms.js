import { R, q, frac, terms, linear, num, txt, money, round, signed, rootsTex, person, checkEqual, checkSame } from '../../lib/index.js';
import { M, symChoices } from './_shared.js';

// ───────────── Helpers ─────────────

const asX = (v) => M(`x = ${num(v)}`);
// The name of a logarithm with base b: \log (base 10), \ln (base e) or \log_{b}.
const logName = (b) => (b === 10 ? R`\log` : b === 'e' ? R`\ln` : `\\log_{${b}}`);
const baseValue = (b) => (b === 'e' ? Math.E : b);
const logB = (b, x) => Math.log(x) / Math.log(baseValue(b));
// log_b of a simple argument ("\log_{2} 8") or of an expression in parentheses.
const logOf = (b, arg, wrap = false) => (wrap ? `${logName(b)}\\left(${arg}\\right)` : `${logName(b)} ${arg}`);
const K = (tex, value, why) => ({ tex, f: () => value, why });

// ───────────── Easy ─────────────

function easyConvertForm(rng) {
  const b = rng.int(2, 10);
  // 2⁴ = 4², so with those pairs a choice with base and exponent swapped would also be a true statement. They are left out.
  const e = rng.pick([2, 3, 4, 5, -2, -3].filter((v) => Math.abs(v) !== b && b ** Math.abs(v) <= 1000 && !(b === 2 && Math.abs(v) === 4) && !(b === 4 && Math.abs(v) === 2)));
  const N = b ** Math.abs(e);
  const value = e > 0 ? `${N}` : `\\frac{1}{${N}}`;
  const exp = `${b}^{${e}} = ${value}`;
  const log = `${logOf(b, value)} = ${e}`;
  if (rng.bool(0.5)) {
    return q({
      prompt: R`Which logarithmic equation says the same thing as \(${exp}\)?`,
      correct: M(log),
      wrong: [
        { value: M(`${logOf(Math.abs(e), value)} = ${e < 0 ? -b : b}`), why: R`The base of the power, \(${b}\), is also the base of the logarithm.` },
        { value: M(`${logOf(b, e, e < 0)} = ${value}`), why: R`A logarithm equals the exponent. Here the exponent is \(${e}\), so the equation ends with \(= ${e}\).` },
        M(`${logOf(N, b)} = ${e}`),
        M(`${logOf(N, e, e < 0)} = ${b}`),
      ],
      solution: [R`\(b^{y} = x\) means the same as \(\log_{b} x = y\): the logarithm is the exponent.`, R`Here the base is \(${b}\), the exponent is \(${e}\) and the result is \(${value}\).`, R`So \(${log}\).`],
      rule: 0,
      skill: 'converting forms',
      check: () => checkEqual(b ** e, e > 0 ? N : 1 / N, 1e-12, 'power'),
    });
  }
  return q({
    prompt: R`Which exponential equation says the same thing as \(${log}\)?`,
    correct: M(exp),
    wrong: [
      { value: M(`${Math.abs(e)}^{${e < 0 ? -b : b}} = ${value}`), why: R`The base of the logarithm, \(${b}\), is the base of the power. The logarithm's value, \(${e}\), is the exponent.` },
      { value: M(`${b}^{${value}} = ${e}`), why: R`The value of the logarithm is the exponent, so \(${e}\) belongs in the exponent.` },
      M(`${N}^{${e}} = ${b}`),
      M(`${e < 0 ? `\\left(${value}\\right)` : value}^{${b}} = ${e}`),
    ],
    solution: [R`\(\log_{b} x = y\) means the same as \(b^{y} = x\).`, R`Here the base is \(${b}\), the logarithm's value (the exponent) is \(${e}\) and the argument is \(${value}\).`, R`So \(${exp}\).`],
    rule: 0,
    skill: 'converting forms',
    check: () => checkEqual(logB(b, e > 0 ? N : 1 / N), e, 1e-9, 'logarithm'),
  });
}

function easyEvaluate(rng) {
  const kind = rng.pick(['power', 'power', 'power', 'one', 'base', 'ln', 'common']);
  const ask = (tex) => R`Evaluate \(${tex}\).`;
  if (kind === 'ln' || kind === 'common') {
    const k = rng.intExcept(-5, 9, [0, 1]);
    const tex = kind === 'ln' ? R`\ln e^{${k}}` : k > 0 && k <= 6 ? `\\log ${num(10 ** k, { commas: true })}` : R`\log 10^{${k}}`;
    return q({
      prompt: ask(tex),
      correct: k,
      wrong: [
        { value: kind === 'ln' ? round(Math.E * k, 2) : 10 * k, why: kind === 'ln' ? R`\(\ln\) asks for the exponent on \(e\) that gives \(e^{${k}}\). That exponent is \(${k}\).` : R`\(\log\) asks for the exponent on 10. \(10^{${k}}\) has exponent \(${k}\).` },
        -k,
        k + 1,
        k - 1,
      ],
      solution: [
        kind === 'ln' ? R`\(\ln\) is the logarithm with base \(e\), so \(\ln e^{${k}}\) asks: \(e\) to what power gives \(e^{${k}}\)?` : R`\(\log\) with no base written means base 10, so this asks: 10 to what power gives \(10^{${k}}\)?`,
        R`The power is \(${k}\).`,
      ],
      rule: 1,
      skill: 'evaluating logarithms',
      check: () => checkEqual(kind === 'ln' ? Math.log(Math.exp(k)) : Math.log10(10 ** k), k, 1e-9, 'logarithm'),
    });
  }
  const b = rng.int(2, 9);
  const k = kind === 'one' ? 0 : kind === 'base' ? 1 : rng.pick([2, 3, 4, 5, 6].filter((v) => b ** v <= 1300));
  const N = b ** k;
  return q({
    prompt: ask(logOf(b, N)),
    correct: k,
    wrong: [
      k > 1 ? { value: frac(N, b), why: R`A logarithm is not a division. It asks: \(${b}\) to what power gives \(${N}\)?` } : null,
      k === 0 ? { value: b, why: R`\(${b}^{0} = 1\), so the power that gives 1 is 0.` } : null,
      k === 1 ? { value: 0, why: R`\(${b}^{0}\) is 1, not \(${b}\). The power that gives \(${b}\) is 1.` } : null,
      k > 1 ? { value: N, why: R`\(${N}\) is the number inside the logarithm. The answer is the exponent that produces it.` } : null,
      k + 1,
      k === 0 ? 1 : k - 1,
      k + 2,
    ],
    solution: [R`\(${logOf(b, N)}\) asks: \(${b}\) to what power gives \(${N}\)?`, R`\(${b}^{${k}} = ${N}\), so \(${logOf(b, N)} = ${k}\).`],
    rule: 1,
    skill: 'evaluating logarithms',
    check: () => checkEqual(logB(b, N), k, 1e-9, 'logarithm'),
  });
}

function easyPointOnGraph(rng) {
  const b = rng.pick([2, 3, 4, 5, 10]);
  const k = rng.pick(b > 4 ? [-1, 1, 2] : [-2, -1, 2, 3]);
  const x = frac(1, 1).mul(k > 0 ? b ** k : 1).div(k < 0 ? b ** -k : 1);
  const P = (px, py) => M(`\\left(${num(px)}, ${num(py)}\\right)`);
  const onGraph = (px, py) => px > 0 && Math.abs(logB(b, px) - py) < 1e-9;
  return q({
    prompt: R`Which point lies on the graph of \(y = ${logOf(b, 'x')}\)?`,
    correct: P(x, k),
    wrong: [
      { value: P(k, x), why: R`That point is on \(y = ${b}^{x}\). The logarithm is the inverse, so the coordinates swap.` },
      { value: P(0, 1), why: R`\(${logOf(b, 0)}\) does not exist, because no power of \(${b}\) equals 0. The graph passes through \((1, 0)\) instead.` },
      { value: P(b, 0), why: R`\(${logOf(b, b)} = 1\), not 0, because \(${b}^{1} = ${b}\).` },
      P(x.add(b), k),
    ],
    solution: [R`A point \((x, y)\) is on the graph when \(y = ${logOf(b, 'x')}\), which means \(${b}^{y} = x\).`, R`Test the point \(\left(${num(x)}, ${k}\right)\): \(${b}^{${k}} = ${num(x)}\). ✓`],
    rule: 6,
    skill: 'graphs of logarithms',
    check: () => (onGraph(x.value, k) && !onGraph(k, x.value) && !onGraph(b, 0) && !onGraph(x.value + b, k) ? true : 'a choice is on the wrong side of the graph test'),
  });
}

// ───────────── Medium ─────────────

function mediumEvaluateFractional(rng) {
  const beta = rng.pick([2, 2, 3, 5, 10]);
  const p = rng.pick([1, 2, 2, 3]);
  if (beta ** p > 125) return mediumEvaluateFractional(rng);
  // With p = 1 only negative exponents are used (whole-number answers belong to the easy tier); otherwise the answer is a fraction.
  const qq = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5].filter((v) => beta ** Math.abs(v) <= 1024 && (p === 1 ? v < 0 : v % p !== 0)));
  const B = beta ** p;
  const A = beta ** Math.abs(qq);
  const arg = qq > 0 ? `${A}` : `\\frac{1}{${A}}`;
  const value = frac(qq, p);
  return q({
    prompt: R`Evaluate \(${logOf(B, arg)}\).`,
    correct: value,
    wrong: [
      qq < 0 ? { value: value.neg(), why: R`\(${arg}\) is less than 1, so the exponent has to be negative.` } : null,
      p > 1 ? { value: value.inv(), why: R`Set up \(${B}^{x} = ${arg}\) and write both sides as powers of \(${beta}\): \(${beta}^{${p}x} = ${beta}^{${qq}}\).` } : null,
      qq > 0 && A % B === 0 ? { value: frac(A, B), why: 'A logarithm is an exponent, not a quotient.' } : null,
      frac(qq, 1),
      value.add(1),
      frac(-qq, p + 1),
    ],
    solution: [
      R`Let \(x = ${logOf(B, arg)}\). In exponential form: \(${B}^{x} = ${arg}\).`,
      p > 1 ? R`Write both sides as powers of \(${beta}\): \((${beta}^{${p}})^{x} = ${beta}^{${qq}}\), so \(${beta}^{${p}x} = ${beta}^{${qq}}\).` : R`Write the right side as a power of \(${beta}\): \(${arg} = ${beta}^{${qq}}\).`,
      p > 1 ? R`The exponents are equal: \(${p}x = ${qq}\), so \(x = ${value.tex()}\).` : R`So \(x = ${value.tex()}\).`,
    ],
    rule: 1,
    skill: 'evaluating logarithms',
    check: () => checkEqual(logB(B, qq > 0 ? A : 1 / A), value.value, 1e-9, 'logarithm'),
  });
}

function mediumExpandCondense(rng) {
  const b = rng.pick([10, 'e', 2, 3, 5]);
  const [a, c] = [rng.int(1, 5), rng.int(1, 5)];
  const d = rng.pick([0, 0, 1, 2, 3, 4]);
  const flip = rng.bool(0.4) && d === 0; // x^a / y^c instead of x^a·y^c
  const pw = (v, e) => (e === 1 ? v : `${v}^{${e}}`);
  const top = flip ? pw('x', a) : pw('x', a) + pw('y', c);
  const bottom = flip ? pw('y', c) : d ? pw('z', d) : '';
  const arg = bottom ? `\\frac{${top}}{${bottom}}` : top;
  const single = logOf(b, arg, Boolean(bottom) || !flip);
  const [X, Y, Z] = [1.7, 2.3, 0.9];
  const L = (v) => logB(b, v);
  const sy = flip ? -1 : 1;
  const L3 = (v) => logOf(b, v);
  const expanded = terms([[a, L3('x')], [sy * c, L3('y')], [-d, L3('z')]]);
  const value = a * L(X) + sy * c * L(Y) - d * L(Z);
  const sumTex = terms([[a, 'x'], [sy * c, 'y'], [-d, 'z']]);
  if (rng.bool(0.5)) {
    return q({
      prompt: R`Expand \(${single}\) as far as possible. (All variables are positive.)`,
      ...symChoices(K(expanded, value), [
        K(terms([[a, L3('x')], [-sy * c, L3('y')], [-d, L3('z')]]), a * L(X) - sy * c * L(Y) - d * L(Z), flip ? 'A quotient inside a logarithm becomes a difference of logarithms.' : 'A product inside a logarithm becomes a sum of logarithms.'),
        K(`${terms([[a, L3('x')]])} \\cdot ${terms([[c, L3('y')]])}`, a * L(X) * c * L(Y), 'The logarithm of a product is the sum of the logarithms, not their product.'),
        d ? K(terms([[a, L3('x')], [c, L3('y')], [d, L3('z')]]), a * L(X) + c * L(Y) + d * L(Z), R`\(z\) is in the denominator, so its logarithm is subtracted.`) : null,
        K(logOf(b, sumTex, true), L(a * X + sy * c * Y - d * Z)),
        K(terms([[c, L3('x')], [sy * a, L3('y')], [-d, L3('z')]]), c * L(X) + sy * a * L(Y) - d * L(Z)),
        K(terms([[a + 1, L3('x')], [sy * c, L3('y')], [-d, L3('z')]]), (a + 1) * L(X) + sy * c * L(Y) - d * L(Z)),
      ]),
      solution: [
        flip ? R`Quotient property: \(${single} = ${logOf(b, pw('x', a))} - ${logOf(b, pw('y', c))}\).` : R`Product${d ? ' and quotient properties' : ' property'}: \(${single} = ${logOf(b, pw('x', a))} + ${logOf(b, pw('y', c))}${d ? ` - ${logOf(b, pw('z', d))}` : ''}\).`,
        R`Power property: each exponent moves to the front as a multiplier.`,
        R`Result: \(${expanded}\).`,
      ],
      rule: 2,
      skill: 'properties of logarithms',
      check: () => checkEqual(L((X ** a * Y ** (sy * c)) / Z ** d), value, 1e-9, 'expanded form'),
    });
  }
  const frac2 = (t, bt) => (bt ? `\\frac{${t}}{${bt}}` : t);
  return q({
    prompt: R`Write \(${expanded}\) as a single logarithm.`,
    ...symChoices(K(single, value), [
      K(logOf(b, sumTex, true), L(a * X + sy * c * Y - d * Z), 'A multiplier in front of a logarithm becomes an exponent inside it, and a sum of logarithms becomes the logarithm of a product.'),
      K(logOf(b, flip ? pw('x', a) + pw('y', c) : frac2(pw('x', a), pw('y', c) + (d ? pw('z', d) : '')), true), flip ? a * L(X) + c * L(Y) : a * L(X) - c * L(Y) - d * L(Z), flip ? 'A difference of logarithms is the logarithm of a quotient.' : 'A sum of logarithms is the logarithm of a product.'),
      d ? K(logOf(b, pw('x', a) + pw('y', c) + pw('z', d), true), a * L(X) + c * L(Y) + d * L(Z), R`The term with \(z\) is subtracted, so \(${pw('z', d)}\) goes in the denominator.`) : null,
      K(logOf(b, frac2(flip ? `${pw('x', a)} - ${pw('y', c)}` : `${pw('x', a)} + ${pw('y', c)}`, d ? pw('z', d) : ''), true), L((X ** a + sy * Y ** c) / Z ** d)),
      K(logOf(b, frac2(flip ? pw('x', c) : pw('x', c) + pw('y', a), flip ? pw('y', a) : d ? pw('z', d) : ''), true), c * L(X) + sy * a * L(Y) - d * L(Z)),
      K(logOf(b, frac2(pw('x', a + 1) + (flip ? '' : pw('y', c)), flip ? pw('y', c) : d ? pw('z', d) : ''), true), (a + 1) * L(X) + sy * c * L(Y) - d * L(Z)),
    ]),
    solution: [
      R`Power property: move each multiplier inside as an exponent: \(${[logOf(b, pw('x', a)), logOf(b, pw('y', c)), d ? logOf(b, pw('z', d)) : null].filter(Boolean).join(', ')}\).`,
      flip ? 'A difference of logarithms is the logarithm of a quotient.' : `A sum of logarithms is the logarithm of a product${d ? ', and a subtracted logarithm goes in the denominator' : ''}.`,
      R`Result: \(${single}\).`,
    ],
    rule: 2,
    skill: 'properties of logarithms',
    check: () => checkEqual(L((X ** a * Y ** (sy * c)) / Z ** d), value, 1e-9, 'single logarithm'),
  });
}

function mediumSolveLog(rng) {
  const b = rng.pick([2, 3, 4, 5, 10]);
  const k = rng.pick([0, 1, 2, 3, 4].filter((v) => b ** v <= 1000));
  const m = rng.int(1, 5);
  const x = rng.int(-5, 12);
  const N = b ** k;
  const c = N - m * x;
  if (c === 0 || Math.abs(c) > 60) return mediumSolveLog(rng);
  const inside = linear(m, c);
  return q({
    prompt: R`Solve: \(\;${logOf(b, inside, true)} = ${k}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(k - c, m), why: R`The logarithm cannot simply be dropped. Rewrite the equation in exponential form: \(${inside} = ${b}^{${k}}\).` },
      { value: frac(b * k - c, m), why: R`\(${b}^{${k}}\) is a power, \(${N}\), not the product \(${b} \cdot ${k}\).` },
      frac(k ** b > 5000 ? N + 1 - c : k ** b - c, m),
      frac(N + c, m),
      frac(x + 1, 1),
    ],
    solution: [
      R`Rewrite in exponential form: \(${inside} = ${b}^{${k}} = ${N}\).`,
      R`Solve the linear equation: \(${terms([[m, 'x']])} = ${N - c}\), so \(x = ${x}\).`,
      R`Check: the argument is \(${m * x + c}\), which is positive, and \(${logOf(b, N)} = ${k}\). ✓`,
    ],
    rule: 5,
    skill: 'logarithmic equations',
    check: () => (m * x + c > 0 ? checkEqual(logB(b, m * x + c), k, 1e-9, 'left side') : 'the argument is not positive'),
  });
}

const SOUNDS = [['a whisper', 2], ['quiet rainfall', 5], ['a normal conversation', 6], ['a vacuum cleaner', 7], ['city traffic', 8], ['a lawn mower', 9], ['a rock concert', 11], ['a jet engine nearby', 13]];

function mediumScaleWord(rng) {
  if (rng.bool(0.5)) {
    const k = rng.int(2, 12);
    const what = rng.pick(['a sample of lake water', 'a cleaning solution', 'a fruit juice', 'a soil sample mixed with water']);
    return q({
      prompt: R`The pH of a solution is \(\text{pH} = -\log[\text{H}^{+}]\), where \([\text{H}^{+}]\) is the concentration of hydrogen ions in moles per litre. Find the pH of ${what} with \([\text{H}^{+}] = 10^{-${k}}\).`,
      correct: k,
      wrong: [
        { value: -k, why: R`\(\log 10^{-${k}} = -${k}\), and the formula has a minus sign in front: \(-(-${k}) = ${k}\).` },
        { value: frac(1, k), why: R`The logarithm of \(10^{-${k}}\) is the exponent, \(-${k}\). No reciprocal is involved.` },
        k + 1,
        10 * k,
      ],
      solution: [R`Substitute: \(\text{pH} = -\log 10^{-${k}}\).`, R`\(\log 10^{-${k}}\) is the exponent on 10, which is \(-${k}\).`, R`\(\text{pH} = -(-${k}) = ${k}\).`],
      rule: 1,
      skill: 'logarithmic scales',
      check: () => checkEqual(-Math.log10(10 ** -k), k, 1e-9, 'pH'),
    });
  }
  const [sound, k] = rng.pick(SOUNDS);
  return q({
    prompt: R`The loudness of a sound in decibels is \(L = 10\log\dfrac{I}{I_{0}}\), where \(I_{0}\) is the intensity of the quietest sound a person can hear. The sound of ${sound} is about \(10^{${k}}\) times as intense as \(I_{0}\). How loud is it?`,
    correct: 10 * k,
    unit: 'decibels',
    wrong: [
      { value: k, why: R`\(\log 10^{${k}} = ${k}\), and the formula then multiplies by 10.` },
      { value: k + 10, why: R`The 10 in front multiplies the logarithm: \(10 \cdot ${k}\).` },
      100 * k,
      10 * k + 10,
    ],
    solution: [R`Here \(\dfrac{I}{I_{0}} = 10^{${k}}\), so \(L = 10\log 10^{${k}}\).`, R`\(\log 10^{${k}} = ${k}\).`, R`\(L = 10 \cdot ${k} = ${10 * k}\) decibels.`],
    rule: 1,
    skill: 'logarithmic scales',
    check: () => checkEqual(10 * Math.log10(10 ** k), 10 * k, 1e-9, 'loudness'),
  });
}

// ───────────── Hard ─────────────

function hardSolveExponential(rng) {
  const b = rng.pick([2, 3, 5, 10]);
  const a = rng.pick([1, 1, 2, 3, 4, 5]);
  const d = rng.pick([0, 0, 1, 2, 3, 5, -1, -2, -4, -7]);
  const ratio = rng.pick([3, 5, 6, 7, 9, 12, 15, 20, 24, 30, 40, 50, 75, 200].filter((v) => !Number.isInteger(round(logB(b, v), 9))));
  const c = a * ratio + d;
  const x = logB(b, ratio);
  const approx = (v) => M(`x \\approx ${num(v, { places: 3 })}`);
  const lhs = `${a === 1 ? '' : `${a} \\cdot `}${b}^{x}${d ? ` ${signed(d)}` : ''}`;
  return q({
    prompt: R`Solve \(${lhs} = ${c}\). Round to three decimal places.`,
    correct: round(x, 3),
    fmt: approx,
    wrong: [
      { value: round(ratio / b, 3), why: R`\(x\) is an exponent, so dividing by \(${b}\) does not isolate it. Take a logarithm of both sides.` },
      b !== 10 ? { value: round(Math.log10(ratio), 3), why: R`\(\log ${ratio}\) answers "10 to what power?". For base \(${b}\), divide by \(\log ${b}\) (change of base).` } : null,
      a !== 1 || d !== 0 ? { value: round(logB(b, c), 3), why: R`Isolate the power first: get \(${b}^{x}\) alone before taking logarithms.` } : null,
      round(1 / x, 3),
      round(x + 1, 3),
      round(x * 2, 3),
    ],
    solution: [
      a !== 1 || d !== 0 ? R`Isolate the power: \(${b}^{x} = ${ratio}\).` : R`The power is already alone: \(${b}^{x} = ${ratio}\).`,
      b === 10 ? R`Take the common logarithm of both sides: \(x = \log ${ratio}\).` : R`Take a logarithm of both sides and use the power property: \(x\log ${b} = \log ${ratio}\), so \(x = \dfrac{\log ${ratio}}{\log ${b}}\).`,
      R`\(x \approx ${num(x, { places: 3 })}\). Check: \(${b}^{${num(x, { places: 3 })}} \approx ${num(b ** round(x, 3), { places: 2 })}\). ✓`,
    ],
    rule: 4,
    skill: 'exponential equations',
    check: () => checkEqual(a * b ** round(x, 3) + d, c, 3e-3, 'left side'),
  });
}

const LOG_PRODUCTS = [];
for (const [b, k] of [[2, 3], [2, 4], [2, 5], [2, 6], [3, 2], [3, 3], [4, 2], [5, 2], [6, 1], [6, 2], [10, 1], [10, 2], [12, 1], [12, 2]]) {
  const N = b ** k;
  for (let r = 1; r * r < N; r++) if (N % r === 0) LOG_PRODUCTS.push([b, k, r, N / r - r]);
}

function hardSolveLogQuadratic(rng) {
  const [b, k, r, d] = rng.pick(LOG_PRODUCTS);
  const N = b ** k;
  const shift = rng.bool(0.5);
  // 'sum' type: log x + log(x + d) = k with solutions r and −(r + d); 'shift' type: log x + log(x − d) = k with solutions r + d and −r.
  const good = shift ? r + d : r;
  const bad = shift ? -r : -(r + d);
  const other = linear(1, shift ? -d : d);
  const X = (vals) => M(rootsTex(vals));
  return q({
    prompt: R`Solve: \(\;${logOf(b, 'x')} + ${logOf(b, other, true)} = ${k}\)`,
    correct: X([good]),
    wrong: [
      { value: X([bad, good]), why: R`\(x = ${bad}\) would put a negative number inside a logarithm, which is not allowed. Reject it.` },
      { value: X([frac(shift ? N + d : N - d, 2)]), why: R`\(${logOf(b, 'x')} + ${logOf(b, other, true)}\) is the logarithm of the product \(x(${other})\), not of the sum.` },
      X([bad]),
      X([shift ? r : r + d]),
      X([good + 1]),
    ],
    solution: [
      R`Product property: \(${logOf(b, `x(${other})`, true)} = ${k}\).`,
      R`Exponential form: \(x(${other}) = ${b}^{${k}} = ${N}\), so \(${terms([[1, 'x^{2}'], [shift ? -d : d, 'x'], [-N, '']])} = 0\).`,
      R`Factor: \((x - ${good})(x + ${-bad}) = 0\), so \(x = ${good}\) or \(x = ${bad}\).`,
      R`Check the arguments. \(x = ${bad}\) makes \(${logOf(b, 'x')}\) the logarithm of a negative number, so it is rejected. \(x = ${good}\) gives \(${logOf(b, good)} + ${logOf(b, shift ? good - d : good + d)} = ${k}\). ✓`,
    ],
    rule: 5,
    skill: 'logarithmic equations',
    check: () => (bad < 0 ? checkEqual(logB(b, good) + logB(b, shift ? good - d : good + d), k, 1e-9, 'left side') : 'the rejected value is not negative'),
  });
}

function hardLetters(rng) {
  const [i, j] = rng.pick([[1, 1], [2, 1], [1, 2], [3, 1], [1, 3], [3, 2], [2, 3], [2, 2], [3, 0], [0, 2], [0, 3], [2, 0], [-1, 1], [1, -1], [-2, 2], [2, -1], [3, -2], [-1, -1], [-2, -1], [-3, 1], [4, 1], [1, -2]]);
  const b = rng.pick(['b', 'a', 'c']);
  const top = 2 ** Math.max(i, 0) * 3 ** Math.max(j, 0);
  const bottom = 2 ** Math.max(-i, 0) * 3 ** Math.max(-j, 0);
  const N = bottom === 1 ? `${top}` : `\\frac{${top}}{${bottom}}`;
  const [p, qv] = [Math.log(2) / Math.log(7), Math.log(3) / Math.log(7)];
  const opt = (tex, value, why) => K(tex, value, why);
  const lin = (u, v) => terms([[u, 'p'], [v, 'q']]);
  const pw = (base, e) => (e === 1 ? `${base}` : `${base}^{${e}}`);
  const factored = [i ? pw(2, i) : null, j ? pw(3, j) : null].filter(Boolean).join(' \\cdot ');
  return q({
    prompt: R`Let \(\log_{${b}} 2 = p\) and \(\log_{${b}} 3 = q\). Write \(\log_{${b}} ${N}\) in terms of \(p\) and \(q\).`,
    ...symChoices(opt(lin(i, j), i * p + j * qv), [
      i > 0 && j > 0 ? opt(`${i === 1 ? 'p' : `p^{${i}}`}${j === 1 ? 'q' : `q^{${j}}`}`, p ** i * qv ** j, 'Inside a logarithm, a product becomes a sum and an exponent becomes a multiplier.') : null,
      i !== j ? opt(lin(j, i), j * p + i * qv, R`\(p\) goes with the factor 2 and \(q\) goes with the factor 3. Check how many times each one appears in \(${N}\).`) : null,
      j !== 0 ? opt(lin(i, -j), i * p - j * qv, 'A factor in the numerator is added; a factor in the denominator is subtracted.') : null,
      i !== 0 ? opt(lin(-i, j), -i * p + j * qv) : null,
      opt(lin(i + 1, j), (i + 1) * p + j * qv),
      opt(lin(i, j + 1), i * p + (j + 1) * qv),
    ]),
    solution: [
      R`Write the number using only the factors 2 and 3: \(${N} = ${factored}\).`,
      R`Products become sums, quotients become differences and exponents become multipliers: \(\log_{${b}} ${N} = ${terms([[i, `\\log_{${b}} 2`], [j, `\\log_{${b}} 3`]])}\).`,
      R`Substitute \(p\) and \(q\): \(${lin(i, j)}\).`,
    ],
    rule: 2,
    skill: 'properties of logarithms',
    check: () => checkEqual(Math.log(top / bottom) / Math.log(7), i * p + j * qv, 1e-9, 'value with base 7'),
  });
}

function hardTimeToReach(rng) {
  const P = rng.pick([500, 800, 1000, 2000, 2500, 4000, 6000]);
  const ratio = rng.pick([1.5, 2, 2.5, 3, 4]);
  const r = rng.pick([2, 3, 4, 5, 6, 7, 8, 10]);
  const T = P * ratio;
  const continuous = rng.bool(0.35);
  const t = continuous ? Math.log(ratio) / (r / 100) : Math.log(ratio) / Math.log(1 + r / 100);
  const name = person(rng);
  return q({
    prompt: `${name} invests $${txt(P)} in an account that pays ${r}% annual interest, compounded ${continuous ? 'continuously' : 'once a year'}. How long will it take for the balance to reach $${txt(T)}? Round to the nearest tenth of a year.`,
    correct: round(t, 1),
    unit: 'years',
    wrong: [
      { value: round((ratio - 1) / (r / 100), 1), why: 'That assumes the same amount of interest every year. The balance grows exponentially, so the equation has to be solved with logarithms.' },
      continuous ? { value: round(Math.log10(ratio) / (r / 100), 1), why: R`\(e^{rt}\) is undone by the natural logarithm, \(\ln\), not by \(\log\) with base 10.` } : { value: round(Math.log(ratio) / (1 + r / 100), 1), why: R`Divide by \(\ln ${num(1 + r / 100)}\), the logarithm of the growth factor, not by the factor itself.` },
      round(ratio / (r / 100), 1),
      round(t * 2, 1),
      round(t / 2, 1),
    ],
    solution: continuous
      ? [
        R`Continuous compounding: \(${num(T, { commas: false })} = ${num(P, { commas: false })}e^{${num(r / 100)}t}\).`,
        R`Divide by \(${num(P, { commas: false })}\): \(e^{${num(r / 100)}t} = ${num(ratio)}\).`,
        R`Take the natural logarithm of both sides: \(${num(r / 100)}t = \ln ${num(ratio)}\), so \(t = \dfrac{\ln ${num(ratio)}}{${num(r / 100)}} \approx ${num(t, { places: 1 })}\) years.`,
      ]
      : [
        R`Annual compounding: \(${num(T, { commas: false })} = ${num(P, { commas: false })}(${num(1 + r / 100)})^{t}\).`,
        R`Divide by \(${num(P, { commas: false })}\): \(${num(1 + r / 100)}^{t} = ${num(ratio)}\).`,
        R`Take a logarithm of both sides: \(t\ln ${num(1 + r / 100)} = \ln ${num(ratio)}\), so \(t = \dfrac{\ln ${num(ratio)}}{\ln ${num(1 + r / 100)}} \approx ${num(t, { places: 1 })}\) years.`,
      ],
    rule: 4,
    skill: 'time to reach a value',
    check: () => checkEqual(continuous ? P * Math.exp((r / 100) * round(t, 1)) : P * (1 + r / 100) ** round(t, 1), T, 6e-3, 'balance at that time'),
  });
}

// ───────────── Challenge ─────────────

function challengeBothSides(rng) {
  const [a, b] = rng.sample([2, 3, 5, 7], 2);
  const c = rng.nonzero(-3, 3);
  const x = (c * Math.log(b)) / (Math.log(a) - Math.log(b));
  const approx = (v) => M(`x \\approx ${num(v, { places: 3 })}`);
  const right = linear(1, c);
  return q({
    prompt: R`Solve \(${a}^{x} = ${b}^{${right}}\). Round to three decimal places.`,
    correct: round(x, 3),
    fmt: approx,
    wrong: [
      { value: round(x + c, 3), why: R`That is the value of \(${right}\), the exponent on the right. The question asks for \(x\).` },
      { value: round((c * b) / (a - b), 3), why: R`After taking logarithms the exponents multiply \(\log ${a}\) and \(\log ${b}\), not \(${a}\) and \(${b}\) themselves.` },
      round((c * Math.log(b)) / (Math.log(a) + Math.log(b)), 3),
      round(-x, 3),
      round(x * 2, 3),
    ],
    solution: [
      R`Take a logarithm of both sides and bring the exponents down: \(x\ln ${a} = (${right})\ln ${b}\).`,
      R`Distribute and collect the \(x\) terms: \(x\ln ${a} - x\ln ${b} = ${c === 1 ? '' : c === -1 ? '-' : c}\ln ${b}\).`,
      R`Factor and divide: \(x = \dfrac{${c === 1 ? '' : c === -1 ? '-' : c}\ln ${b}}{\ln ${a} - \ln ${b}} \approx ${num(x, { places: 3 })}\).`,
    ],
    rule: 4,
    skill: 'exponential equations',
    check: () => checkEqual(round(x, 3) * Math.log(a), (round(x, 3) + c) * Math.log(b), 5e-3, 'logarithms of the two sides'),
  });
}

const ISOTOPES = [
  { h: 5730, unit: 'years', places: 0, story: (p) => `Carbon-14 has a half-life of 5730 years. A wooden tool contains ${p}% of the carbon-14 that the living tree had. About how old is the tool?` },
  { h: 8, unit: 'days', places: 1, story: (p) => `Iodine-131 has a half-life of 8 days. How long does it take for a sample to decay to ${p}% of its original amount?` },
  { h: 5, unit: 'hours', places: 1, story: (p) => `Caffeine has a half-life of about 5 hours in the body. How long does it take until only ${p}% of a dose is left?` },
  { h: 30, unit: 'years', places: 1, story: (p) => `Cesium-137 has a half-life of 30 years. How long does it take for a sample to decay to ${p}% of its original amount?` },
];

function challengeDecayTime(rng) {
  const iso = rng.pick(ISOTOPES);
  const p = rng.pick([10, 15, 20, 30, 35, 40, 60, 65, 70, 80, 85, 90]);
  const t = (iso.h * Math.log(p / 100)) / Math.log(0.5);
  const rd = (v) => round(v, iso.places);
  return q({
    prompt: `${iso.story(p)} Round to the nearest ${iso.places ? 'tenth' : 'year'}.`,
    correct: rd(t),
    unit: iso.unit,
    wrong: [
      { value: rd((iso.h * (100 - p)) / 50), why: 'That treats the decay as linear: the same amount lost in equal times. In exponential decay the same fraction is lost in equal times, so solve with logarithms.' },
      { value: rd((iso.h * p) / 100), why: R`Set up \(\left(\frac{1}{2}\right)^{t/${iso.h}} = ${num(p / 100)}\) and solve for \(t\) with logarithms.` },
      rd((iso.h * 100) / p),
      rd(t / 2),
      rd(t * 2),
    ],
    solution: [
      R`Model: the fraction left after \(t\) ${iso.unit} is \(\left(\frac{1}{2}\right)^{t/${iso.h}}\). Set it equal to \(${num(p / 100)}\).`,
      R`Take logarithms: \(\dfrac{t}{${iso.h}}\ln 0.5 = \ln ${num(p / 100)}\).`,
      R`\(t = ${iso.h} \cdot \dfrac{\ln ${num(p / 100)}}{\ln 0.5} \approx ${num(rd(t))}\) ${iso.unit}.`,
    ],
    rule: 4,
    skill: 'time to reach a value',
    check: () => checkEqual(0.5 ** (rd(t) / iso.h), p / 100, 1e-2, 'fraction left'),
  });
}

function challengeInverse(rng) {
  const b = rng.pick([2, 3, 5, 10, 'e']);
  const bt = b === 'e' ? 'e' : `${b}`;
  const B = baseValue(b);
  const k = rng.nonzero(-6, 6);
  const name = (tex) => `f^{-1}(x) = ${tex}`;
  const opt = (tex, f, why) => ({ tex: name(tex), f, why });
  if (rng.bool(0.55)) {
    const a = rng.pick([1, 2, 3, 4]);
    const inside = (kk) => (a === 1 ? linear(1, -kk) : `\\frac{${linear(1, -kk)}}{${a}}`);
    const f = (x) => a * B ** x + k;
    const inv = (x) => logB(b, (x - k) / a);
    const xs = [Math.abs(k) + 1.3, Math.abs(k) + 2.6, Math.abs(k) + 4.1]; // every choice is defined at these points
    return q({
      prompt: R`Find the inverse of \(f(x) = ${a === 1 ? '' : `${a} \\cdot `}${bt}^{x} ${signed(k)}\).`,
      ...symChoices(opt(logOf(b, inside(k), true), inv), [
        opt(logOf(b, inside(-k), true), (x) => logB(b, (x + k) / a), R`To undo \(${signed(k)}\), ${k > 0 ? 'subtract' : 'add'} \(${Math.abs(k)}\).`),
        a > 1 ? opt(`\\frac{${logOf(b, linear(1, -k), true)}}{${a}}`, (x) => logB(b, x - k) / a, R`Divide by \(${a}\) before taking the logarithm, because \(f\) multiplies by \(${a}\) after taking the power.`) : null,
        opt(`${logOf(b, a === 1 ? 'x' : `\\frac{x}{${a}}`, a !== 1)} ${signed(-k)}`, (x) => logB(b, x / a) - k, R`Undo the steps of \(f\) in reverse order: the \(${signed(k)}\) was done last, so it is undone first.`),
        opt(`${bt}^{${linear(1, -k)}}`, (x) => B ** (x - k)),
        opt(`${logOf(b, 'x')} ${signed(k)}`, (x) => logB(b, x) + k),
      ], xs),
      solution: [
        R`Write \(y = ${a === 1 ? '' : `${a} \\cdot `}${bt}^{x} ${signed(k)}\) and swap \(x\) and \(y\): \(x = ${a === 1 ? '' : `${a} \\cdot `}${bt}^{y} ${signed(k)}\).`,
        R`Isolate the power: \(${bt}^{y} = ${inside(k)}\).`,
        R`Rewrite in logarithmic form: \(y = ${logOf(b, inside(k), true)}\). So \(f^{-1}(x) = ${logOf(b, inside(k), true)}\).`,
      ],
      rule: 6,
      skill: 'inverse of an exponential function',
      check: () => checkSame((x) => f(inv(x)), (x) => x, xs),
    });
  }
  const h = rng.nonzero(-6, 6);
  const f = (x) => logB(b, x - h) + k;
  const inv = (x) => B ** (x - k) + h;
  return q({
    prompt: R`Find the inverse of \(f(x) = ${logOf(b, linear(1, -h), true)} ${signed(k)}\).`,
    ...symChoices(opt(`${bt}^{${linear(1, -k)}} ${signed(h)}`, inv), [
      opt(`${bt}^{${linear(1, k)}} ${signed(h)}`, (x) => B ** (x + k) + h, R`To undo \(${signed(k)}\), ${k > 0 ? 'subtract' : 'add'} \(${Math.abs(k)}\) before changing to exponential form.`),
      opt(`${bt}^{${linear(1, -k)}} ${signed(-h)}`, (x) => B ** (x - k) - h, R`The last step solves \(y ${signed(-h)} = \dots\) for \(y\), so ${h > 0 ? 'add' : 'subtract'} \(${Math.abs(h)}\).`),
      opt(`${bt}^{x} ${signed(h - k)}`, (x) => B ** x + h - k, R`The \(${signed(k)}\) must be undone before the logarithm is, so it ends up in the exponent.`),
      opt(`${logOf(b, linear(1, -k), true)} ${signed(h)}`, (x) => logB(b, x - k) + h),
      opt(`${bt}^{${linear(1, -h)}} ${signed(k)}`, (x) => B ** (x - h) + k),
    ]),
    solution: [
      R`Swap \(x\) and \(y\): \(x = ${logOf(b, linear(1, -h, 'y'), true)} ${signed(k)}\).`,
      R`Isolate the logarithm: \(${linear(1, -k)} = ${logOf(b, linear(1, -h, 'y'), true)}\).`,
      R`Rewrite in exponential form: \(${linear(1, -h, 'y')} = ${bt}^{${linear(1, -k)}}\), so \(f^{-1}(x) = ${bt}^{${linear(1, -k)}} ${signed(h)}\).`,
    ],
    rule: 6,
    skill: 'inverse of a logarithmic function',
    check: () => checkSame((x) => f(inv(x)), (x) => x),
  });
}

// ───────────── Models ─────────────

function solveModel({ a, b, c }) {
  if (b === 1) return { error: 'With b = 1 the left side is always a, so the equation cannot be solved for x. Choose a base other than 1.' };
  const ratio = c / a;
  const x = Math.log(ratio) / Math.log(b);
  const exact = Math.abs(x - Math.round(x)) < 1e-9;
  const f = (t) => a * b ** t;
  return {
    problem: R`\(${a === 1 ? '' : `${num(a)} \\cdot `}${num(b)}^{x} = ${num(c)}\)`,
    steps: [
      a === 1 ? R`The power is already alone: \(${num(b)}^{x} = ${num(ratio, { places: 4 })}\).` : R`Isolate the power. Divide both sides by \(${num(a)}\): \(${num(b)}^{x} = ${num(ratio, { places: 4 })}\).`,
      exact
        ? R`\(${num(ratio, { places: 4 })}\) is an exact power of \(${num(b)}\): \(${num(b)}^{${Math.round(x)}} = ${num(ratio, { places: 4 })}\).`
        : R`Take a logarithm of both sides and bring the exponent down: \(x\log ${num(b)} = \log ${num(ratio, { places: 4 })}\).`,
      exact ? R`So \(x = ${Math.round(x)}\).` : R`Divide: \(x = \dfrac{\log ${num(ratio, { places: 4 })}}{\log ${num(b)}} \approx ${num(x, { places: 3 })}\).`,
      R`Check: \(${a === 1 ? '' : `${num(a)} \\cdot `}${num(b)}^{${num(x, { places: 3 })}} \approx ${num(f(round(x, 3)), { places: 2 })}\).`,
    ],
    answer: exact ? M(`x = ${Math.round(x)}`) : M(`x \\approx ${num(x, { places: 3 })}`),
    visual: {
      type: 'plot',
      x: [Math.min(0, x) - 2, Math.max(0, x) + 2],
      y: [0, Math.max(c, a) * 1.4],
      fns: [{ f }],
      hlines: [{ y: c }],
      points: [{ x, y: c, label: `x ≈ ${txt(x, { places: 2 })}`, color: 'b' }],
      alt: `Graph of the exponential curve and the dashed horizontal line y = ${txt(c)}. They meet where x is about ${txt(x, { places: 2 })}, which is the solution.`,
    },
  };
}

function goalModel({ P, r, T }) {
  if (T <= P) return { error: 'The goal is not more than the starting amount. Choose a larger goal.' };
  const g = 1 + r / 100;
  const t = Math.log(T / P) / Math.log(g);
  const whole = Math.ceil(t - 1e-9);
  return {
    problem: `Sofia invests $${txt(P)} at ${num(r)}% annual interest, compounded once a year. How long until the investment is worth $${txt(T)}?`,
    steps: [
      R`After \(t\) years the balance is \(${num(P, { commas: false })}(${num(g)})^{t}\). Set it equal to the goal: \(${num(P, { commas: false })}(${num(g)})^{t} = ${num(T, { commas: false })}\).`,
      R`Divide by \(${num(P, { commas: false })}\): \(${num(g)}^{t} = ${num(T / P, { places: 4 })}\).`,
      R`Take a logarithm of both sides: \(t\ln ${num(g)} = \ln ${num(T / P, { places: 4 })}\).`,
      R`\(t = \dfrac{\ln ${num(T / P, { places: 4 })}}{\ln ${num(g)}} \approx ${num(t, { places: 2 })}\) years.`,
      `Interest is added once a year, so the balance first passes the goal at the end of year ${whole}.`,
    ],
    answer: R`About \(${num(t, { places: 1 })}\) years (the goal is passed at the end of year ${whole})`,
    visual: {
      type: 'plot',
      x: [0, Math.max(2, whole * 1.25)],
      y: [0, T * 1.25],
      fns: [{ f: (x) => P * g ** x }],
      hlines: [{ y: T }],
      points: [{ x: t, y: T, label: `t ≈ ${txt(t, { places: 1 })}`, color: 'b' }],
      axisLabels: ['years', 'balance ($)'],
      alt: `Graph of the balance over time, an upward-bending curve starting at ${money(P)}, with a dashed horizontal line at the goal of ${money(T)}. The curve reaches the line after about ${txt(t, { places: 1 })} years.`,
    },
  };
}

export default {
  id: 'logarithms',
  title: 'Logarithms',
  summary: 'Use logarithms as inverses of exponentials: evaluate them, apply their properties and solve exponential and logarithmic equations.',
  standards: ['CCSS F-LE.A.4', 'CCSS F-BF.B.5', 'CCSS F-IF.C.7'],

  explain: {
    intro: R`The equation \(2^{x} = 8\) can be solved by inspection, but \(2^{x} = 10\) cannot. A logarithm is the tool that finds an unknown exponent: \(\log_{2} 10\) is defined to be the power of 2 that gives 10. Logarithms turn multiplication into addition and powers into multiplication, which is why they are used to solve exponential equations and to measure quantities that range over many powers of ten.`,
    rules: [
      {
        title: 'A logarithm is an exponent',
        text: R`\(\log_{b} x = y\) means exactly the same as \(b^{y} = x\) (with \(b > 0\), \(b \ne 1\) and \(x > 0\)). \(\log x\) with no base means base 10 (the common logarithm), and \(\ln x\) means base \(e\) (the natural logarithm).`,
        example: R`\(\log_{2} 32 = 5\) because \(2^{5} = 32\). \(\log 1000 = 3\) because \(10^{3} = 1000\).`,
      },
      {
        title: 'Special values and inverse properties',
        text: R`\(\log_{b} 1 = 0\) and \(\log_{b} b = 1\). Because logarithms and exponentials with the same base undo each other, \(\log_{b} b^{x} = x\) and \(b^{\log_{b} x} = x\). A number between 0 and 1 has a negative logarithm (for a base greater than 1).`,
        example: R`\(\ln e^{4} = 4\), \(\log_{3} \dfrac{1}{9} = -2\) and \(\log_{8} 2 = \dfrac{1}{3}\) because \(8^{\frac{1}{3}} = 2\).`,
      },
      {
        title: 'Product, quotient and power properties',
        text: R`\(\log_{b}(MN) = \log_{b} M + \log_{b} N\), \(\;\log_{b}\dfrac{M}{N} = \log_{b} M - \log_{b} N\), \(\;\log_{b} M^{p} = p\log_{b} M\). Used left to right they expand a logarithm; used right to left they condense several logarithms into one.`,
        example: R`\(\log_{2}\dfrac{8x^{3}}{y} = \log_{2} 8 + 3\log_{2} x - \log_{2} y = 3 + 3\log_{2} x - \log_{2} y\).`,
      },
      {
        title: 'Change of base',
        text: R`A calculator has keys only for \(\log\) and \(\ln\). For any other base, \(\log_{b} x = \dfrac{\log x}{\log b} = \dfrac{\ln x}{\ln b}\).`,
        example: R`\(\log_{5} 40 = \dfrac{\log 40}{\log 5} \approx 2.292\). Check: \(5^{2.292} \approx 40\).`,
      },
      {
        title: 'Solving exponential equations',
        text: R`Isolate the power, then take a logarithm of both sides. The power property brings the unknown exponent down in front, where it can be solved for.`,
        example: R`\(5 \cdot 2^{x} = 60\): first \(2^{x} = 12\), then \(x\log 2 = \log 12\), so \(x = \dfrac{\log 12}{\log 2} \approx 3.585\).`,
      },
      {
        title: 'Solving logarithmic equations',
        text: R`Condense each side into a single logarithm, then rewrite in exponential form (or, if both sides are logarithms with the same base, set the arguments equal). Always check: any value that makes an argument zero or negative must be rejected.`,
        example: R`\(\log_{2} x + \log_{2}(x - 2) = 3\) gives \(x(x - 2) = 8\), so \(x = 4\) or \(x = -2\). Reject \(-2\): the answer is \(x = 4\).`,
      },
      {
        title: 'The graph of a logarithm',
        text: R`\(y = \log_{b} x\) is the inverse of \(y = b^{x}\), so its graph is the reflection of the exponential graph in the line \(y = x\). It passes through \((1, 0)\) and \((b, 1)\), has the vertical asymptote \(x = 0\), and exists only for \(x > 0\).`,
        example: R`\((3, 8)\) is on \(y = 2^{x}\), so \((8, 3)\) is on \(y = \log_{2} x\).`,
      },
    ],
    vocab: [
      { term: 'logarithm', def: R`\(\log_{b} x\) is the exponent to which the base \(b\) must be raised to get \(x\).` },
      { term: 'argument', def: R`The number or expression inside a logarithm. It must be positive.` },
      { term: 'common logarithm', def: R`The logarithm with base 10, written \(\log x\).` },
      { term: 'natural logarithm', def: R`The logarithm with base \(e\), written \(\ln x\).` },
      { term: 'change of base', def: R`The rule \(\log_{b} x = \dfrac{\log x}{\log b}\), used to evaluate a logarithm with any base.` },
    ],
    mistakes: [
      R`Splitting a logarithm of a sum: \(\log(x + y)\) is not \(\log x + \log y\). Only products split that way.`,
      R`Writing \(\dfrac{\log 40}{\log 5}\) as \(\log 8\). The quotient property is about \(\log\dfrac{40}{5}\), which is different.`,
      R`Taking logarithms before isolating the power: in \(5 \cdot 2^{x} = 60\), divide by 5 first.`,
      R`Keeping a solution that makes an argument negative. \(\log_{2}(-2)\) does not exist.`,
      R`Reading \(\log_{b} x = y\) as \(x^{y} = b\). The base of the logarithm is the base of the power: \(b^{y} = x\).`,
    ],
    visual: {
      type: 'plot',
      x: [-3, 9],
      y: [-3, 9],
      square: true,
      fns: [{ f: (x) => 2 ** x, label: 'y = 2ˣ', labelAt: 2.6 }, { f: (x) => Math.log2(x), color: 'b', label: 'y = log₂ x', labelAt: 6.5 }, { f: (x) => x, color: 'c', dashed: true }],
      points: [{ x: 0, y: 1, label: '(0, 1)' }, { x: 1, y: 0, label: '(1, 0)', color: 'b' }, { x: 3, y: 8, label: '(3, 8)' }, { x: 8, y: 3, label: '(8, 3)', color: 'b' }],
      alt: 'Graph of y = 2ˣ and y = log₂ x with the dashed line y = x between them. Each curve is the mirror image of the other: (0, 1) and (3, 8) on the exponential match (1, 0) and (8, 3) on the logarithm. The logarithm curve exists only to the right of the y-axis.',
    },
  },

  examples: [
    {
      title: 'Converting and evaluating',
      problem: R`Evaluate \(\log_{3} \dfrac{1}{9}\), \(\log_{4} 8\) and \(\ln e^{5}\).`,
      steps: [
        R`\(\log_{3} \dfrac{1}{9}\): ask "3 to what power is \(\frac{1}{9}\)?" Since \(3^{-2} = \frac{1}{9}\), the answer is \(-2\).`,
        R`\(\log_{4} 8\): let \(4^{x} = 8\). Both are powers of 2: \(2^{2x} = 2^{3}\), so \(x = \frac{3}{2}\).`,
        R`\(\ln e^{5}\): the natural logarithm undoes \(e\) to a power, so the answer is 5.`,
      ],
      answer: R`\(-2\), \(\dfrac{3}{2}\) and \(5\)`,
    },
    {
      title: 'Expanding with the properties',
      problem: R`Expand \(\ln\dfrac{x^{2}\sqrt{y}}{z^{3}}\).`,
      steps: [
        R`Quotient and product properties: \(\ln x^{2} + \ln\sqrt{y} - \ln z^{3}\).`,
        R`Write the root as a power: \(\sqrt{y} = y^{\frac{1}{2}}\).`,
        R`Power property: bring each exponent to the front.`,
      ],
      answer: R`\(2\ln x + \dfrac{1}{2}\ln y - 3\ln z\)`,
    },
    {
      title: 'A logarithmic equation with a rejected value',
      problem: R`Solve \(\log_{2} x + \log_{2}(x - 2) = 3\).`,
      steps: [
        R`Condense the left side with the product property: \(\log_{2}\left(x(x - 2)\right) = 3\).`,
        R`Rewrite in exponential form: \(x(x - 2) = 2^{3} = 8\), so \(x^{2} - 2x - 8 = 0\).`,
        R`Factor: \((x - 4)(x + 2) = 0\), so \(x = 4\) or \(x = -2\).`,
        R`Check the arguments. \(x = -2\) would need \(\log_{2}(-2)\), which does not exist, so reject it. \(x = 4\): \(\log_{2} 4 + \log_{2} 2 = 2 + 1 = 3\). ✓`,
      ],
      answer: R`\(x = 4\)`,
    },
    {
      title: 'Word problem: how long to double?',
      word: true,
      problem: 'A savings account pays 6% interest, compounded once a year. How long does it take for a deposit to double?',
      steps: [
        R`Let the deposit be \(P\). It doubles when \(P(1.06)^{t} = 2P\). Divide by \(P\): \(1.06^{t} = 2\).`,
        R`The unknown is an exponent, so take a logarithm of both sides: \(t\ln 1.06 = \ln 2\).`,
        R`\(t = \dfrac{\ln 2}{\ln 1.06} \approx \dfrac{0.6931}{0.0583} \approx 11.9\).`,
        R`Check: \(1.06^{11.9} \approx 2.00\). ✓ The size of the deposit does not matter.`,
      ],
      answer: 'About 11.9 years, so the balance has doubled by the end of year 12.',
      visual: {
        type: 'plot',
        x: [0, 16],
        y: [0, 2.8],
        fns: [{ f: (t) => 1.06 ** t }],
        hlines: [{ y: 2 }],
        points: [{ x: 11.9, y: 2, label: 't ≈ 11.9', color: 'b' }],
        axisLabels: ['years', 'times the deposit'],
        alt: 'Graph of 1.06 to the power t, rising slowly from 1. A dashed horizontal line at 2 meets the curve at about t = 11.9 years.',
      },
    },
  ],

  models: [
    {
      id: 'solve-exponential',
      title: 'Solve a·bˣ = c with logarithms',
      intro: 'Change a, b and c. The graph shows where the curve reaches the height c.',
      inputs: [
        { name: 'a', label: 'a (multiplier)', type: 'number', min: 0.5, max: 10, step: 0.5, value: 5 },
        { name: 'b', label: 'b (base)', type: 'number', min: 0.2, max: 10, step: 0.1, value: 2 },
        { name: 'c', label: 'c (right-hand side)', type: 'number', min: 1, max: 1000, step: 1, value: 60 },
      ],
      compute: solveModel,
    },
    {
      id: 'time-to-goal',
      title: 'Word problem: time to reach a savings goal',
      word: true,
      intro: 'Change the starting amount, the interest rate and the goal.',
      inputs: [
        { name: 'P', label: 'Starting amount (dollars)', type: 'int', min: 100, max: 50000, value: 2000 },
        { name: 'r', label: 'Annual interest rate (%)', type: 'number', min: 0.5, max: 15, step: 0.5, value: 5 },
        { name: 'T', label: 'Goal (dollars)', type: 'int', min: 200, max: 200000, value: 3000 },
      ],
      compute: goalModel,
    },
  ],

  quiz: {
    easy: [easyConvertForm, easyEvaluate, easyPointOnGraph],
    medium: [mediumEvaluateFractional, mediumExpandCondense, mediumSolveLog, mediumScaleWord],
    hard: [hardSolveExponential, hardSolveLogQuadratic, hardLetters, hardTimeToReach],
    challenge: [challengeBothSides, challengeDecayTime, challengeInverse],
  },
};
