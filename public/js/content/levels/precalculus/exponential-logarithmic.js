import { R, q, frac, tryFrac, Frac, linear, terms, power, num, paren, txt, round, rootsTex, checkEqual, checkSame } from '../../lib/index.js';
import { M, apart, dec } from './_shared.js';

const logb = (b, x) => Math.log(x) / Math.log(b);
const val = (v) => (v instanceof Frac ? v.value : v);
// b^x as LaTeX for a whole-number or fractional base: pw(2) → "2^{x}", pw(frac(1, 2)) → "\left(\frac{1}{2}\right)^{x}".
const pw = (b, x = 'x') => (b instanceof Frac && !b.isInt() ? R`\left(${b.tex()}\right)^{${x}}` : `${num(b)}^{${x}}`);
// a·b^x as LaTeX.
const expo = (a, b, x = 'x') => (val(a) === 1 ? pw(b, x) : b instanceof Frac && !b.isInt() ? `${num(a)}${pw(b, x)}` : R`${num(a)} \cdot ${pw(b, x)}`);
const table = (headers, xs, ys) => ({
  type: 'table',
  headers: [M(headers[0]), ...xs.map((x) => M(num(x)))],
  rows: [[M(headers[1]), ...ys.map((y) => M(num(y)))]],
  rowHeaders: true,
  alt: `Table of values. ${headers[0]}: ${xs.join(', ')}. ${headers[1].replace(/[\\{}_]/g, '')}: ${ys.map((y) => txt(val(y))).join(', ')}.`,
});

// ───────────── Easy ─────────────

function easySequenceType(rng) {
  if (rng.bool()) {
    const r = rng.pick([2, 3, 4, 5, 10, -2, frac(1, 2), frac(1, 3)]);
    const whole = !(r instanceof Frac);
    const a = whole ? rng.int(1, 6) : rng.int(1, 4) * val(r.inv()) ** 3;
    const seq = [0, 1, 2, 3].map((i) => a * val(r) ** i);
    return q({
      prompt: R`Describe the sequence \(${seq.map((v) => num(v)).join(R`,\ `)},\ \dots\)`,
      correct: R`Geometric, with common ratio \(${num(r)}\)`,
      wrong: [
        { value: R`Arithmetic, with common difference \(${num(seq[1] - seq[0])}\)`, why: R`The differences are \(${[0, 1, 2].map((i) => num(seq[i + 1] - seq[i])).join(R`,\ `)}\), which are not constant.` },
        { value: R`Geometric, with common ratio \(${num(whole ? frac(1, r) : r.inv())}\)`, why: 'The common ratio is each term divided by the term before it.' },
        R`Arithmetic, with common difference \(${num(r)}\)`,
        R`Geometric, with common ratio \(${num(seq[1] - seq[0])}\)`,
        R`Geometric, with common ratio \(${num(seq[1])}\)`,
        R`Arithmetic, with common difference \(${num(seq[0])}\)`,
        R`Geometric, with common ratio \(${num(val(r) + 1)}\)`,
      ],
      solution: [
        R`Compare successive terms. The differences are \(${[0, 1, 2].map((i) => num(seq[i + 1] - seq[i])).join(R`,\ `)}\): not constant, so the sequence is not arithmetic.`,
        R`The ratios are \(\frac{${num(seq[1])}}{${num(seq[0])}} = \frac{${num(seq[2])}}{${num(seq[1])}} = \frac{${num(seq[3])}}{${num(seq[2])}} = ${num(r)}\): constant.`,
        R`The sequence is geometric with common ratio \(${num(r)}\). Each term is the one before multiplied by \(${num(r)}\).`,
      ],
      rule: 0,
      skill: 'arithmetic and geometric sequences',
      check: () => ([0, 1, 2].every((i) => Math.abs(seq[i + 1] / seq[i] - val(r)) < 1e-12) ? true : 'ratios are not constant'),
    });
  }
  const d = rng.nonzero(-9, 9);
  const a = rng.intExcept(-10, 20, [0, -d, -2 * d, -3 * d]);
  const seq = [0, 1, 2, 3].map((i) => a + d * i);
  return q({
    prompt: R`Describe the sequence \(${seq.join(R`,\ `)},\ \dots\)`,
    correct: R`Arithmetic, with common difference \(${d}\)`,
    wrong: [
      { value: R`Geometric, with common ratio \(${frac(seq[1], seq[0]).tex()}\)`, why: R`The ratios \(${seq[1]} \div ${paren(seq[0])}\) and \(${seq[2]} \div ${paren(seq[1])}\) are different, so no single multiplier works.` },
      { value: R`Arithmetic, with common difference \(${-d}\)`, why: 'The common difference is each term minus the term before it.' },
      R`Geometric, with common ratio \(${d}\)`,
      R`Arithmetic, with common difference \(${seq[1]}\)`,
    ],
    solution: [
      R`Subtract each term from the next: \(${[0, 1, 2].map((i) => `${seq[i + 1]} - ${seq[i] < 0 ? `(${seq[i]})` : seq[i]} = ${d}`).join(R`,\ `)}\).`,
      R`The differences are constant, so the sequence is arithmetic with common difference \(${d}\). Each term is the one before plus \(${d < 0 ? `(${d})` : d}\).`,
    ],
    rule: 0,
    skill: 'arithmetic and geometric sequences',
    check: () => ([0, 1, 2].every((i) => seq[i + 1] - seq[i] === d) ? true : 'differences are not constant'),
  });
}

const LOG_SPECIAL = [[4, 2, frac(1, 2)], [8, 2, frac(1, 3)], [9, 3, frac(1, 2)], [27, 3, frac(1, 3)], [4, 8, frac(3, 2)], [8, 4, frac(2, 3)], [25, 5, frac(1, 2)], [16, 2, frac(1, 4)], [16, 8, frac(3, 4)], [9, 27, frac(3, 2)]];

function easyEvaluateLog(rng) {
  const kind = rng.pick(['int', 'int', 'neg', 'special', 'ln', 'common']);
  let b;
  let argTex;
  let arg;
  let k;
  let logTex;
  if (kind === 'special') {
    [b, arg, k] = rng.pick(LOG_SPECIAL);
    argTex = String(arg);
  } else if (kind === 'ln') {
    b = Math.E;
    k = rng.pick([-3, -2, -1, 0, 1, 2, 3, 4, 5, frac(1, 2)]);
    arg = Math.E ** val(k);
    argTex = val(k) === 0 ? '1' : val(k) === 1 ? 'e' : k instanceof Frac ? R`\sqrt{e}` : val(k) < 0 ? R`\dfrac{1}{${power('e', -k)}}` : `e^{${k}}`;
    logTex = R`\ln ${argTex}`;
  } else if (kind === 'common') {
    b = 10;
    k = rng.pick([-3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
    arg = 10 ** k;
    argTex = k < 0 ? num(arg) : num(arg, { commas: true });
    logTex = R`\log ${argTex}`;
  } else {
    b = rng.pick([2, 3, 4, 5, 6]);
    const max = { 2: 7, 3: 4, 4: 4, 5: 3, 6: 3 }[b];
    k = kind === 'neg' ? -rng.int(1, Math.min(3, max)) : rng.int(0, max);
    arg = b ** k;
    argTex = k < 0 ? R`\dfrac{1}{${b ** -k}}` : String(arg);
  }
  logTex = logTex ?? R`\log_{${b}} ${argTex}`;
  const bTex = kind === 'ln' ? 'e' : String(b);
  const kv = val(k);
  return q({
    prompt: R`Evaluate \(${logTex}\)${kind === 'common' ? ' (the common logarithm, base 10)' : ''}.`,
    correct: k,
    wrong: [
      kind === 'int' && k > 1 ? { value: arg / b, why: R`A logarithm is an exponent: \(${bTex}\) raised to what power gives \(${argTex}\)?` } : null,
      kv !== 0 ? { value: k instanceof Frac ? k.neg() : -k, why: kv < 0 ? 'A number between 0 and 1 is a negative power of the base, so its logarithm is negative.' : 'A number greater than 1 is a positive power of the base, so its logarithm is positive.' } : null,
      k instanceof Frac ? { value: k.inv(), why: R`Check by raising the base to your answer: \(${bTex}^{${k.inv().tex()}}\) is not \(${argTex}\).` } : null,
      kv === 0 ? { value: 1, why: R`\(${bTex}^{0} = 1\), so the logarithm of 1 is 0 in every base.` } : null,
      kv + 1,
      kv - 1,
      kv + 2,
    ],
    solution: [
      R`\(${logTex}\) asks: \(${bTex}\) raised to what power gives \(${argTex}\)?`,
      R`\(${bTex}^{${num(k)}} = ${argTex}\), so \(${logTex} = ${num(k)}\).`,
    ],
    rule: 2,
    skill: 'evaluating logarithms',
    check: () => checkEqual(b ** kv, arg),
  });
}

function easyLogForm(rng) {
  const b = rng.int(2, 6);
  const k = rng.intExcept(2, b === 2 ? 9 : b === 3 ? 5 : 4, [b]);
  const N = b ** k;
  if (N === k ** b) return easyLogForm(rng);
  if (rng.bool()) {
    return q({
      prompt: R`Which equation says the same thing as \(\log_{${b}} ${N} = ${k}\)?`,
      correct: R`\(${b}^{${k}} = ${N}\)`,
      wrong: [
        { value: R`\(${k}^{${b}} = ${N}\)`, why: 'The base of the logarithm is the base of the power. The value of the logarithm is the exponent.' },
        { value: R`\(${b}^{${N}} = ${k}\)`, why: 'A logarithm is an exponent, so the number after the equals sign is the exponent.' },
        R`\(${N}^{${k}} = ${b}\)`,
        R`\(${k}^{${N}} = ${b}\)`,
      ],
      solution: [R`\(\log_{b} x = y\) means exactly \(b^{y} = x\): the logarithm is the exponent.`, R`Base \(${b}\), exponent \(${k}\), result \(${N}\): \(${b}^{${k}} = ${N}\).`],
      rule: 2,
      skill: 'logarithmic and exponential form',
      check: () => checkEqual(logb(b, N), k),
    });
  }
  return q({
    prompt: R`Which equation says the same thing as \(${b}^{${k}} = ${N}\)?`,
    correct: R`\(\log_{${b}} ${N} = ${k}\)`,
    wrong: [
      { value: R`\(\log_{${k}} ${N} = ${b}\)`, why: 'The base of the power becomes the base of the logarithm.' },
      { value: R`\(\log_{${b}} ${k} = ${N}\)`, why: 'A logarithm equals the exponent. Here the exponent is the number to isolate.' },
      R`\(\log_{${N}} ${b} = ${k}\)`,
      R`\(\log_{${N}} ${k} = ${b}\)`,
    ],
    solution: [R`\(b^{y} = x\) means exactly \(\log_{b} x = y\): the logarithm is the exponent.`, R`Base \(${b}\), exponent \(${k}\), result \(${N}\): \(\log_{${b}} ${N} = ${k}\).`],
    rule: 2,
    skill: 'logarithmic and exponential form',
    check: () => checkEqual(logb(b, N), k),
  });
}

function easyGrowthModel(rng) {
  const A = rng.pick([200, 500, 800, 1200, 2500, 4000, 8000, 12500]);
  const p = rng.pick([2, 3, 4, 5, 6, 8, 12, 15, 20, 25]);
  const grow = rng.bool();
  const [what, unit] = rng.pick([['The population of a town', 'year'], ['The number of users of an app', 'month'], ['The value of a collection', 'year'], ['The number of bacteria in a dish', 'hour']]);
  const k = grow ? 1 + p / 100 : 1 - p / 100;
  const f = (lead, base) => R`\(f(t) = ${num(lead)}(${num(base)})^{t}\)`;
  return q({
    prompt: R`${what} is ${txt(A)} now and ${grow ? 'grows' : 'falls'} by ${p}% each ${unit}. Which function gives its size after \(t\) ${unit}s?`,
    correct: f(A, k),
    wrong: [
      { value: f(A, p / 100), why: `That keeps only ${p}% each ${unit}. ${grow ? `Growing by ${p}% keeps the whole amount and adds ${p}% more: multiply by ${num(k)}.` : `Falling by ${p}% keeps ${100 - p}%: multiply by ${num(k)}.`}` },
      { value: f(A, grow ? 1 - p / 100 : 1 + p / 100), why: `A factor ${grow ? 'below' : 'above'} 1 makes the amount ${grow ? 'shrink' : 'grow'}.` },
      { value: R`\(f(t) = ${num(A)} ${grow ? '+' : '-'} ${num((A * p) / 100)}t\)`, why: `That changes by the same amount every ${unit}. A fixed percentage means multiplying by the same factor every ${unit}.` },
      f(A, 1 + p),
    ],
    solution: [
      `${grow ? 'Growing' : 'Falling'} by ${p}% means that each ${unit} the amount is multiplied by ${grow ? `1 + ${num(p / 100)}` : `1 − ${num(p / 100)}`} = ${num(k)}.`,
      R`Repeated multiplication by the same factor is exponential: \(f(t) = a \cdot b^{t}\) with starting value \(a = ${num(A)}\) and factor \(b = ${num(k)}\).`,
      R`So \(f(t) = ${num(A)}(${num(k)})^{t}\).`,
    ],
    rule: 1,
    skill: 'exponential models',
    check: () => checkEqual((A * k - A) / A, (grow ? p : -p) / 100),
  });
}

// ───────────── Medium ─────────────

function mediumTwoPoints(rng) {
  const half = rng.bool(0.25);
  const b = half ? frac(1, 2) : rng.int(2, 5);
  const bv = val(b);
  const x1 = rng.int(1, 2);
  const dx = rng.int(1, half ? 3 : bv <= 3 ? 3 : 2);
  const x2 = x1 + dx;
  const a = half ? rng.pick([32, 64, 96, 160]) : rng.int(2, 6);
  const y1 = a * bv ** x1;
  const y2 = a * bv ** x2;
  const form = (lead, base) => M(`f(x) = ${expo(lead, base)}`);
  const ratio = half ? frac(y2, y1) : y2 / y1;
  return q({
    prompt: R`An exponential function \(f(x) = a \cdot b^{x}\) passes through \((${x1}, ${num(y1)})\) and \((${x2}, ${num(y2)})\). Which function is it?`,
    correct: form(a, b),
    wrong: [
      { value: form(y1, b), why: R`\(${num(y1)}\) is \(f(${x1})\), not \(f(0)\). Divide by \(${power('b', x1)}\) to step back to \(x = 0\).` },
      dx > 1 ? { value: form(a, ratio), why: R`The outputs are multiplied by \(${num(ratio)}\) over \(${dx}\) steps of \(x\), so \(b^{${dx}} = ${num(ratio)}\), not \(b\).` } : null,
      half ? { value: form(a, 2), why: 'The outputs shrink as x grows, so the base must be between 0 and 1.' } : form(bv, a),
      form(half ? a / 2 : a * bv, b),
      form(a + 1, b),
      form(a, half ? frac(1, 4) : bv + 1),
      form(a + 2, b),
    ],
    solution: [
      R`Divide the two outputs: \(\dfrac{f(${x2})}{f(${x1})} = \dfrac{${num(y2)}}{${num(y1)}} = ${num(ratio)}\). In the formula this ratio is \(\dfrac{a${power('b', x2)}}{a${power('b', x1)}} = ${power('b', dx)}\).`,
      dx > 1 ? R`\(b^{${dx}} = ${num(ratio)}\), so \(b = ${num(b)}\).` : R`So \(b = ${num(b)}\).`,
      R`Use one point to find \(a\): \(a \cdot ${x1 === 1 ? num(b) : pw(b, x1)} = ${num(y1)}\), so \(a = ${num(a)}\).`,
      R`\(f(x) = ${expo(a, b)}\).`,
    ],
    rule: 1,
    skill: 'exponential from two points',
    check: () => checkEqual(a * bv ** x1, y1) === true && checkEqual(a * bv ** x2, y2),
  });
}

function mediumCondenseLogs(rng) {
  const L = rng.pick([R`\ln`, R`\log`, R`\log_{2}`, R`\log_{5}`]);
  const m = rng.int(1, 4);
  const n = rng.int(m === 1 ? 2 : 1, 4);
  const p = rng.int(1, 3);
  const [x, y, z] = [1.7, 2.3, 1.4];
  const mono = (c, s) => (c === 1 ? s : `${c}${s}`);
  const want = m * Math.log(x) + n * Math.log(y) - p * Math.log(z);
  const options = [
    [R`${L}\left(\dfrac{${power('x', m)}${power('y', n)}}{${power('z', p)}}\right)`, Math.log((x ** m * y ** n) / z ** p)],
    [R`${L}\left(\dfrac{${mono(m, 'x')} \cdot ${mono(n, 'y')}}{${mono(p, 'z')}}\right)`, Math.log((m * x * n * y) / (p * z))],
    [R`${L}\left(${power('x', m)} + ${power('y', n)} - ${power('z', p)}\right)`, Math.log(x ** m + y ** n - z ** p)],
    [R`${L}\left(${power('x', m)}${power('y', n)}${power('z', p)}\right)`, Math.log(x ** m * y ** n * z ** p)],
    [R`\dfrac{${L}\left(${power('x', m)}${power('y', n)}\right)}{${L}\left(${power('z', p)}\right)}`, Math.log(x ** m * y ** n) / Math.log(z ** p)],
  ];
  const whys = [null, 'A number in front of a logarithm becomes an exponent inside it, not a multiplier.', 'Adding logarithms multiplies the inputs, and subtracting divides them. The inputs themselves are not added.', 'Subtracting a logarithm divides by its input.', null];
  return q({
    prompt: R`Write \(${terms([[m, `${L} x`], [n, `${L} y`], [-p, `${L} z`]])}\) as a single logarithm.`,
    correct: M(options[0][0]),
    wrong: options.slice(1).map(([tex], i) => (whys[i + 1] ? { value: M(tex), why: whys[i + 1] } : M(tex))),
    solution: [
      R`Power rule: move each coefficient up as an exponent. \(${terms([[1, `${L} ${power('x', m)}`], [1, `${L} ${power('y', n)}`], [-1, `${L} ${power('z', p)}`]])}\).`,
      R`Product rule: the sum becomes the logarithm of a product, \(${L}\left(${power('x', m)}${power('y', n)}\right)\).`,
      R`Quotient rule: subtracting \(${L} ${power('z', p)}\) divides: \(${options[0][0]}\).`,
    ],
    rule: 3,
    skill: 'properties of logarithms',
    // The properties hold in every base, so natural logs are enough to test them.
    check: () => (Math.abs(options[0][1] - want) < 1e-9 && options.slice(1).every(([, v]) => !(Math.abs(v - want) < 1e-6)) ? true : 'a choice is equal to the expression when it should not be, or the answer is not'),
  });
}

function mediumSolveExact(rng) {
  const kind = rng.pick(['power', 'twoBases', 'log']);
  if (kind === 'power') {
    const b = rng.pick([2, 3, 5]);
    const p = rng.int(2, { 2: 6, 3: 4, 5: 3 }[b]);
    const m = rng.int(1, 3);
    const x = rng.int(-3, 4);
    const k = p - m * x;
    if (k === 0 || (m === 1 && k === 0)) return mediumSolveExact(rng);
    return q({
      prompt: R`Solve \(${b}^{${linear(m, k)}} = ${b ** p}\).`,
      correct: x,
      fmt: (v) => R`\(x = ${num(v)}\)`,
      wrong: [
        { value: p, why: R`\(${p}\) is the value of the exponent \(${linear(m, k)}\). One more step gives \(x\).` },
        { value: tryFrac(p + k, m), why: R`Solve \(${linear(m, k)} = ${p}\) by undoing \(${k > 0 ? '+' : '-'} ${Math.abs(k)}\) with the opposite operation.` },
        tryFrac(b ** p - k, m),
        -x,
        x + 1,
      ],
      solution: [
        R`Write the right side as a power of \(${b}\): \(${b ** p} = ${b}^{${p}}\).`,
        R`Equal powers of the same base have equal exponents: \(${linear(m, k)} = ${p}\).`,
        R`Solve: \(x = ${x}\).`,
      ],
      rule: 4,
      skill: 'exponential equations',
      check: () => checkEqual(b ** (m * x + k), b ** p),
    });
  }
  if (kind === 'twoBases') {
    const b = rng.pick([2, 3]);
    const [i, j] = rng.pick([[2, 3], [3, 2], [1, 2], [2, 1], [1, 3], [3, 1]]);
    const x = rng.int(-5, 7);
    const c = rng.int(-4, 4);
    const d = (i * (x + c)) / j - x;
    if (!Number.isInteger(d) || d === c || Math.abs(d) > 9) return mediumSolveExact(rng);
    return q({
      prompt: R`Solve \(${b ** i}^{${linear(1, c)}} = ${b ** j}^{${linear(1, d)}}\).`,
      correct: x,
      fmt: (v) => R`\(x = ${num(v)}\)`,
      wrong: [
        { value: tryFrac(d - c, i - j), why: R`The new exponent multiplies the whole old one: \((${b}^{${i}})^{${linear(1, c)}} = ${b}^{${i === 1 ? linear(1, c) : `${i}(${linear(1, c)})`}}\).` },
        { value: tryFrac(j * d + i * c, i - j), why: 'When terms move across the equals sign their signs change.' },
        -x,
        x + 2,
        x - 1,
      ],
      solution: [
        R`Write both sides as powers of \(${b}\): \(${b ** i} = ${power(String(b), i)}\) and \(${b ** j} = ${power(String(b), j)}\).`,
        R`\(${b}^{${i === 1 ? linear(1, c) : `${i}(${linear(1, c)})`}} = ${b}^{${j === 1 ? linear(1, d) : `${j}(${linear(1, d)})`}}\), so the exponents are equal: \(${linear(i, i * c)} = ${linear(j, j * d)}\).`,
        R`Collect terms: \(${terms([[i - j, 'x']])} = ${j * d - i * c}\), so \(x = ${x}\).`,
      ],
      rule: 4,
      skill: 'exponential equations',
      check: () => checkEqual((b ** i) ** (x + c), (b ** j) ** (x + d), 1e-9),
    });
  }
  const b = rng.pick([2, 3, 4, 5, 10]);
  const p = rng.int(1, { 2: 5, 3: 3, 4: 3, 5: 2, 10: 2 }[b]);
  const m = rng.int(1, 4);
  const x = rng.int(-4, 9);
  const k = b ** p - m * x;
  if (k === 0) return mediumSolveExact(rng);
  return q({
    prompt: R`Solve \(\log_{${b}}(${linear(m, k)}) = ${p}\).`,
    correct: x,
    fmt: (v) => R`\(x = ${num(v)}\)`,
    wrong: [
      { value: tryFrac(b * p - k, m), why: R`\(\log_{${b}} A = ${p}\) means \(A = ${b}^{${p}}\), not \(${b} \cdot ${p}\).` },
      { value: tryFrac(p - k, m), why: R`Rewrite in exponential form first: \(${linear(m, k)} = ${b}^{${p}}\).` },
      tryFrac(b ** p + k, m),
      x + 1,
      -x,
    ],
    solution: [
      R`Rewrite in exponential form: \(${linear(m, k)} = ${b}^{${p}} = ${b ** p}\).`,
      R`Solve: \(${terms([[m, 'x']])} = ${b ** p - k}\), so \(x = ${x}\).`,
      R`Check the domain: at \(x = ${x}\) the input of the logarithm is \(${b ** p}\), which is positive. ✓`,
    ],
    rule: 5,
    skill: 'logarithmic equations',
    check: () => checkEqual(logb(b, m * x + k), p),
  });
}

function mediumHalfLife(rng) {
  const n = rng.int(2, 5);
  const T = rng.pick([3, 4, 5, 6, 8, 12, 20, 30]);
  const t = n * T;
  if (rng.bool()) {
    const left = rng.pick([3, 5, 10, 15, 25]);
    const A = left * 2 ** n;
    const [stuff, unit, tUnit] = rng.pick([['A dose of medicine in the bloodstream', 'mg', 'hours'], ['A sample of a radioactive isotope', 'grams', 'days'], ['The charge left in a capacitor', 'units', 'seconds']]);
    return q({
      prompt: `${stuff} has a half-life of ${T} ${tUnit}. If it starts at ${A} ${unit}, how much is left after ${t} ${tUnit}?`,
      correct: left,
      unit,
      wrong: [
        { value: frac(A, 2 * n), why: R`Halving \(${n}\) times divides by \(2^{${n}} = ${2 ** n}\), not by \(2 \cdot ${n}\).` },
        { value: A / 2, why: `That is the amount after one half-life. ${t} ${tUnit} is ${n} half-lives.` },
        frac(A, n),
        left * 2,
        left * 4,
      ],
      solution: [
        R`Count the half-lives: \(${t} \div ${T} = ${n}\).`,
        R`Each half-life multiplies the amount by \(\frac{1}{2}\): \(${A} \cdot \left(\frac{1}{2}\right)^{${n}} = \dfrac{${A}}{${2 ** n}} = ${left}\).`,
        `${left} ${unit} are left.`,
      ],
      rule: 1,
      skill: 'half-life and doubling',
      check: () => checkEqual(A * 0.5 ** (t / T), left),
    });
  }
  const A = rng.pick([50, 100, 200, 300, 500]);
  const [stuff, tUnit] = rng.pick([['bacteria in a culture', 'minutes'], ['views of a video', 'hours'], ['cells in a sample', 'hours']]);
  const ans = A * 2 ** n;
  return q({
    prompt: `The number of ${stuff} doubles every ${T} ${tUnit}. If there are ${A} now, how many will there be after ${t} ${tUnit}?`,
    correct: ans,
    wrong: [
      { value: A * 2 * n, why: R`Doubling \(${n}\) times multiplies by \(2^{${n}} = ${2 ** n}\), not by \(2 \cdot ${n}\).` },
      { value: 2 * A, why: `That is the number after one doubling. ${t} ${tUnit} is ${n} doublings.` },
      ans / 2,
      ans * 2,
      A * n,
    ],
    solution: [
      R`Count the doublings: \(${t} \div ${T} = ${n}\).`,
      R`Each doubling multiplies the number by 2: \(${A} \cdot 2^{${n}} = ${A} \cdot ${2 ** n} = ${num(ans)}\).`,
    ],
    rule: 1,
    skill: 'half-life and doubling',
    check: () => checkEqual(A * 2 ** (t / T), ans),
  });
}

function mediumChooseModel(rng) {
  const kind = rng.pick(['linear', 'quadratic', 'exponential']);
  const xs = [0, 1, 2, 3, 4];
  let ys;
  if (kind === 'linear') {
    const d = rng.nonzero(-9, 9);
    const a = rng.int(-10, 30);
    ys = xs.map((x) => a + d * x);
  } else if (kind === 'quadratic') {
    const a = rng.pick([1, 2, 3, -1, -2]);
    const b = rng.int(-4, 4);
    const c = rng.int(-5, 20);
    ys = xs.map((x) => a * x * x + b * x + c);
  } else {
    const r = rng.pick([2, 3, 4, 0.5]);
    const a = r === 0.5 ? rng.pick([16, 48, 80, 112]) : rng.int(1, 6);
    ys = xs.map((x) => a * r ** x);
  }
  const d1 = ys.slice(1).map((y, i) => y - ys[i]);
  const d2 = d1.slice(1).map((d, i) => d - d1[i]);
  const ratios = ys.slice(1).map((y, i) => y / ys[i]);
  const constant = (list) => list.every((v) => Math.abs(v - list[0]) < 1e-9);
  const list = (vals) => vals.map((v) => num(v)).join(R`,\ `);
  const steps = [R`First differences: \(${list(d1)}\). ${constant(d1) ? 'They are constant, so the same amount is added at each step: a linear model.' : 'Not constant, so the data are not linear.'}`];
  if (kind !== 'linear') steps.push(R`Second differences: \(${list(d2)}\). ${constant(d2) ? 'They are constant, which is the signature of a quadratic model.' : 'Not constant, so the data are not quadratic.'}`);
  if (kind === 'exponential') steps.push(R`Ratios of successive outputs: \(${list(ratios)}\). They are constant, so each step multiplies by \(${num(ratios[0])}\): an exponential model.`);
  const names = { linear: 'Linear', quadratic: 'Quadratic', exponential: 'Exponential' };
  return q({
    prompt: R`Which type of function fits the data in the table exactly?`,
    visual: table(['x', 'y'], xs, ys),
    correct: names[kind],
    wrong: [
      { value: 'Linear', why: 'A linear function adds the same amount at every step. Check the first differences.' },
      { value: 'Exponential', why: 'An exponential function multiplies by the same factor at every step. Check the ratios of successive outputs.' },
      { value: 'Quadratic', why: 'A quadratic function has constant second differences. Check them.' },
      'Logarithmic',
    ],
    solution: steps,
    rule: 6,
    skill: 'choosing a model',
    check: () => ((constant(d1) ? 'linear' : constant(d2) ? 'quadratic' : constant(ratios) ? 'exponential' : 'none') === kind ? true : 'table does not match its type'),
  });
}

// ───────────── Hard ─────────────

function hardSolveExp(rng) {
  const b = rng.pick([2, 3, 5, 1.5, 1.2]);
  const a = rng.intExcept(2, 9, [b]);
  const target = rng.float(1.2, b >= 2 ? 5.5 : 9);
  const c = Math.round(a * b ** target);
  const x = logb(b, c / a);
  if (Math.abs(x - Math.round(x)) < 0.03 || c <= a + 1) return hardSolveExp(rng);
  const ans = round(x, 2);
  return q({
    prompt: R`Solve \(${a} \cdot ${num(b)}^{x} = ${c}\). Round your answer to two decimal places.`,
    correct: ans,
    fmt: (v) => R`\(x \approx ${num(v, { fixed: 2 })}\)`,
    wrong: apart(ans, [
      { value: Math.log(c) / Math.log(a * b), why: R`\(${a} \cdot ${num(b)}^{x}\) is not \(${Number.isInteger(a * b) ? num(a * b) : `(${num(a * b)})`}^{x}\). Divide both sides by \(${a}\) first.` },
      { value: c / (a * b), why: R`\(x\) is an exponent, so division cannot isolate it. Take a logarithm of both sides.` },
      { value: Math.log(c / a), why: R`\(\ln(${num(b)}^{x}) = x \ln ${num(b)}\), so the last step is to divide by \(\ln ${num(b)}\).` },
      logb(b, c - a),
      logb(b, c),
    ], { places: 2, positive: true }),
    solution: [
      R`Isolate the power: \(${num(b)}^{x} = \dfrac{${c}}{${a}}\).`,
      R`Take the natural logarithm of both sides and use the power rule: \(x \ln ${num(b)} = \ln\left(\dfrac{${c}}{${a}}\right)\).`,
      R`\(x = \dfrac{\ln(${c}/${a})}{\ln ${num(b)}} \approx ${num(ans, { fixed: 2 })}\).`,
    ],
    rule: 4,
    skill: 'exponential equations',
    check: () => (Math.abs(a * b ** x - c) < 1e-8 && Math.abs(ans - x) <= 0.005 + 1e-12 ? true : 'solution does not satisfy the equation'),
  });
}

// log_b x + log_b(x − d) = p with a valid root r and an extraneous root d − r.
const LOG_PAIRS = [];
for (const [b, p] of [[2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [3, 2], [3, 3], [4, 2], [5, 2], [6, 2], [10, 1], [10, 2], [6, 1]]) {
  const N = b ** p;
  for (let r = 2; r <= N; r++) {
    const d = r - N / r;
    if (N % r === 0 && d >= 1 && d <= 30) LOG_PAIRS.push({ b, p, N, r, d });
  }
}

function hardLogEquation(rng) {
  const { b, p, N, r, d } = rng.pick(LOG_PAIRS);
  const other = d - r;
  const L = b === 10 ? R`\log` : R`\log_{${b}}`;
  const added = tryFrac(N + d, 2);
  return q({
    prompt: R`Solve \(${L} x + ${L}(${linear(1, -d)}) = ${p}\)${b === 10 ? ' (base 10)' : ''}.`,
    correct: M(rootsTex([r])),
    wrong: [
      { value: M(rootsTex([r, other])), why: R`\(x = ${other}\) would need the logarithm of a negative number, which is not defined. Always check solutions against the domain.` },
      added ? { value: M(rootsTex([added])), why: R`A sum of logarithms is the logarithm of a product: \(x(${linear(1, -d)})\), not \(x + (${linear(1, -d)})\).` } : null,
      M(rootsTex([other])),
      M(rootsTex([-other, r])),
      M(rootsTex([r + d])),
    ],
    solution: [
      R`Combine with the product rule: \(${L}\big(x(${linear(1, -d)})\big) = ${p}\).`,
      R`Rewrite in exponential form: \(x(${linear(1, -d)}) = ${p === 1 ? N : `${b}^{${p}} = ${N}`}\), so \(${terms([[1, 'x^{2}'], [-d, 'x'], [-N, '']])} = 0\).`,
      R`Factor: \((${linear(1, -r)})(${linear(1, -other)}) = 0\), so \(x = ${r}\) or \(x = ${other}\).`,
      R`Check the domain: both inputs need \(x > ${d}\). \(x = ${other}\) fails, so the only solution is \(x = ${r}\).`,
    ],
    rule: 5,
    skill: 'logarithmic equations',
    check: () => (Math.abs(logb(b, r) + logb(b, r - d) - p) < 1e-9 && other <= 0 ? true : 'root check failed'),
  });
}

function hardInequality(rng) {
  if (rng.bool()) {
    const b = rng.pick([2, 3, 4, 5, 10]);
    const p = rng.int(1, { 2: 4, 3: 3, 4: 2, 5: 2, 10: 2 }[b]);
    const a = rng.int(-6, 9);
    const top = a + b ** p;
    const less = rng.bool(0.6);
    const truth = (x) => x > a && (less ? logb(b, x - a) < p : logb(b, x - a) > p);
    const sets = less
      ? [[R`\(${a} < x < ${top}\)`, (x) => x > a && x < top], [R`\(x < ${top}\)`, (x) => x < top], [R`\(x > ${top}\)`, (x) => x > top], [R`\(${a} < x < ${a + b * p}\)`, (x) => x > a && x < a + b * p], [R`\(x > ${a}\)`, (x) => x > a]]
      : [[R`\(x > ${top}\)`, (x) => x > top], [R`\(${a} < x < ${top}\)`, (x) => x > a && x < top], [R`\(x > ${a}\)`, (x) => x > a], [R`\(x > ${a + b * p}\)`, (x) => x > a + b * p], [R`\(x < ${top}\)`, (x) => x < top]];
    if (b * p === b ** p) sets.splice(3, 1);
    const pts = [a - 1, a + 0.01, top - 0.01, top + 0.5, a + b * p + 0.3, a + b * p - 0.3];
    const last = sets[sets.length - 1];
    return q({
      prompt: R`Solve \(\log_{${b}}(${linear(1, -a)}) ${less ? '<' : '>'} ${p}\).`,
      correct: sets[0][0],
      wrong: [
        { value: sets[1][0], why: less ? R`The logarithm is only defined when \(${linear(1, -a)} > 0\), so \(x\) must also be greater than \(${a}\).` : R`Because the base is greater than 1, a larger logarithm means a larger input: the inequality keeps its direction.` },
        sets[2][0],
        b * p !== b ** p ? { value: sets[3][0], why: R`In exponential form the boundary is \(${b}^{${p}} = ${b ** p}\), not \(${b} \cdot ${p}\).` } : null,
        last[0],
      ],
      solution: [
        R`Domain first: \(${linear(1, -a)} > 0\), so \(x > ${a}\).`,
        R`\(\log_{${b}}\) is an increasing function, so \(\log_{${b}}(${linear(1, -a)}) ${less ? '<' : '>'} ${p}\) is the same as \(${linear(1, -a)} ${less ? '<' : '>'} ${b}^{${p}} = ${b ** p}\), that is \(x ${less ? '<' : '>'} ${top}\).`,
        less ? R`Combine with the domain: \(${a} < x < ${top}\).` : R`Every such \(x\) is already in the domain: \(x > ${top}\).`,
      ],
      rule: 5,
      skill: 'logarithmic inequalities',
      check: () => (pts.every((x) => sets[0][1](x) === truth(x)) && sets.slice(1).every(([, has]) => pts.some((x) => has(x) !== truth(x))) ? true : 'solution set does not match the inequality'),
    });
  }
  const d = rng.int(2, 5);
  const k = rng.int(1, { 2: 5, 3: 3, 4: 3, 5: 2 }[d]);
  const op = rng.pick(['<', '>', '<=', '>=']);
  const tex = { '<': '<', '>': '>', '<=': R`\le`, '>=': R`\ge` };
  const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
  const cmp = { '<': (u, v) => u < v - 1e-12, '>': (u, v) => u > v + 1e-12, '<=': (u, v) => u <= v + 1e-12, '>=': (u, v) => u >= v - 1e-12 };
  const truth = (x) => cmp[op]((1 / d) ** x, 1 / d ** k);
  const set = (o, c) => [R`\(x ${tex[o]} ${c}\)`, (x) => cmp[o](x, c)];
  const sets = [set(flip[op], k), set(op, k), set(op, -k), set(flip[op], -k)];
  const pts = [-k - 1, -k, 0, k, k + 1];
  return q({
    prompt: R`Solve \(\left(\dfrac{1}{${d}}\right)^{x} ${tex[op]} \dfrac{1}{${d ** k}}\).`,
    correct: sets[0][0],
    wrong: [
      { value: sets[1][0], why: R`The base \(\frac{1}{${d}}\) is less than 1, so the function is decreasing: comparing exponents reverses the inequality.` },
      { value: sets[2][0], why: R`\(\dfrac{1}{${d ** k}} = \left(\dfrac{1}{${d}}\right)^{${k}}\), with a positive exponent.` },
      sets[3][0],
    ],
    solution: [
      R`Write both sides with the same base: \(\dfrac{1}{${d ** k}} = \left(\dfrac{1}{${d}}\right)^{${k}}\).`,
      R`Because \(0 < \frac{1}{${d}} < 1\), the function \(\left(\frac{1}{${d}}\right)^{x}\) is decreasing: larger exponents give smaller outputs.`,
      R`So the inequality between the exponents is reversed: \(x ${tex[flip[op]]} ${k}\).`,
    ],
    rule: 5,
    skill: 'exponential inequalities',
    check: () => (pts.every((x) => sets[0][1](x) === truth(x)) && sets.slice(1).every(([, has]) => pts.some((x) => has(x) !== truth(x))) ? true : 'solution set does not match the inequality'),
  });
}

function hardContinuousGrowth(rng) {
  const F = rng.int(2, 5);
  const word = { 2: 'double', 3: 'triple', 4: 'quadruple', 5: 'be five times as large' }[F];
  if (rng.bool()) {
    const r = rng.int(2, 9);
    const t = Math.log(F) / (r / 100);
    const ans = round(t, 1);
    return q({
      prompt: R`Money is invested at ${r}% a year, compounded continuously, so its value after \(t\) years is \(A = Pe^{${num(r / 100)}t}\). How long does it take for the investment to ${word}? Round to the nearest tenth of a year.`,
      correct: ans,
      fmt: dec(1, 'years'),
      wrong: apart(ans, [
        { value: (F - 1) / (r / 100), why: `That is how long simple interest would take. With continuous compounding the growth is exponential, so solve with a logarithm.` },
        { value: Math.log10(F) / (r / 100), why: R`The base is \(e\), so use the natural logarithm \(\ln\), not \(\log_{10}\).` },
        { value: F / (r / 100), why: R`Solve \(e^{${num(r / 100)}t} = ${F}\) by taking \(\ln\) of both sides.` },
        t / 2,
      ], { places: 1, positive: true }),
      solution: [
        R`"${word[0].toUpperCase()}${word.slice(1)}" means \(A = ${F}P\): \(${F}P = Pe^{${num(r / 100)}t}\), so \(e^{${num(r / 100)}t} = ${F}\).`,
        R`Take the natural logarithm of both sides: \(${num(r / 100)}t = \ln ${F}\).`,
        R`\(t = \dfrac{\ln ${F}}{${num(r / 100)}} \approx ${num(ans, { fixed: 1 })}\) years.`,
      ],
      rule: 4,
      skill: 'continuous growth',
      check: () => (Math.abs(Math.exp((r / 100) * t) - F) < 1e-9 && Math.abs(ans - t) <= 0.05 + 1e-12 ? true : 'time does not give the stated growth'),
    });
  }
  const T = rng.int(3, 12);
  const N0 = rng.pick([200, 500, 1200, 3000]);
  const k = Math.log(F) / T;
  const ans = round(k, 3);
  return q({
    prompt: R`A colony of ${txt(N0)} bacteria grows continuously according to \(N(t) = ${num(N0)}e^{kt}\), with \(t\) in hours. After ${T} hours there are ${txt(N0 * F)} bacteria. Find \(k\), rounded to three decimal places.`,
    correct: ans,
    fmt: (v) => R`\(k \approx ${num(v, { fixed: 3 })}\)`,
    wrong: apart(ans, [
      { value: F / T, why: R`\(e^{${T}k} = ${F}\) has \(k\) in the exponent. Take \(\ln\) of both sides before dividing by \(${T}\).` },
      { value: Math.log10(F) / T, why: R`The base is \(e\), so use the natural logarithm \(\ln\), not \(\log_{10}\).` },
      { value: (F - 1) / T, why: 'That treats the growth as linear. Exponential growth needs a logarithm to undo it.' },
      Math.log(F) * T,
      k / 2,
    ], { places: 3, positive: true }),
    solution: [
      R`Substitute the data: \(${num(N0 * F)} = ${num(N0)}e^{${T}k}\), so \(e^{${T}k} = ${F}\).`,
      R`Take the natural logarithm of both sides: \(${T}k = \ln ${F}\).`,
      R`\(k = \dfrac{\ln ${F}}{${T}} \approx ${num(ans, { fixed: 3 })}\).`,
    ],
    rule: 4,
    skill: 'continuous growth',
    check: () => (Math.abs(N0 * Math.exp(k * T) - N0 * F) < 1e-6 && Math.abs(ans - k) <= 0.0005 + 1e-12 ? true : 'k does not reproduce the data'),
  });
}

function hardLogScale(rng) {
  const d10 = rng.pick([3, 5, 7, 8, 12, 13, 15, 17, 18, 23, 25]);
  const d = d10 / 10;
  const ratio = 10 ** d;
  const ans = round(ratio, 1);
  const ctx = rng.pick(['quake', 'sound', 'acid']);
  const lo = ctx === 'quake' ? rng.int(30, 55) / 10 : ctx === 'sound' ? rng.int(4, 7) * 10 : rng.int(20, 45) / 10;
  const prompt = {
    quake: R`On the Richter scale, the magnitude of an earthquake is \(M = \log_{10}\left(\dfrac{A}{A_{0}}\right)\), where \(A\) is the amplitude of the ground motion. How many times larger is the amplitude of a magnitude ${num(lo + d, { fixed: 1 })} earthquake than that of a magnitude ${num(lo, { fixed: 1 })} earthquake? Round to the nearest tenth.`,
    sound: R`The loudness of a sound in decibels is \(L = 10\log_{10}\left(\dfrac{I}{I_{0}}\right)\), where \(I\) is its intensity. How many times more intense is a sound of ${lo + d10} dB than a sound of ${lo} dB? Round to the nearest tenth.`,
    acid: R`The pH of a solution is \(-\log_{10}\) of its hydrogen-ion concentration. How many times greater is the hydrogen-ion concentration of a solution with pH ${num(lo, { fixed: 1 })} than that of a solution with pH ${num(lo + d, { fixed: 1 })}? Round to the nearest tenth.`,
  }[ctx];
  const first = {
    quake: R`Subtract the two magnitudes: \(\log_{10}\left(\dfrac{A_{1}}{A_{2}}\right) = ${num(lo + d, { fixed: 1 })} - ${num(lo, { fixed: 1 })} = ${num(d)}\), because a difference of logarithms is the logarithm of a quotient.`,
    sound: R`Subtract the two levels: \(10\log_{10}\left(\dfrac{I_{1}}{I_{2}}\right) = ${lo + d10} - ${lo} = ${d10}\), so \(\log_{10}\left(\dfrac{I_{1}}{I_{2}}\right) = ${num(d)}\).`,
    acid: R`The pH values differ by \(${num(lo + d, { fixed: 1 })} - ${num(lo, { fixed: 1 })} = ${num(d)}\), so the logarithms of the two concentrations differ by \(${num(d)}\).`,
  }[ctx];
  return q({
    prompt,
    correct: ans,
    fmt: dec(1, 'times'),
    wrong: apart(ans, [
      { value: ctx === 'sound' ? d10 : d * 10, why: 'On a logarithmic scale equal steps multiply the quantity by a fixed factor. The ratio is a power of 10, not a multiple of the difference.' },
      { value: Math.exp(d), why: R`These scales use base 10, so the ratio is \(10^{${num(d)}}\), not \(e^{${num(d)}}\).` },
      ctx === 'sound' ? { value: 10 ** (d10 / 20), why: R`Divide the decibel difference by 10 to get the exponent: \(10^{${d10}/10}\).` } : null,
      ctx === 'acid' ? { value: 1 / ratio, why: 'A lower pH means a higher concentration, so the ratio is greater than 1.' } : null,
      d,
      ratio * 10,
      ratio / 3,
    ], { places: 1, positive: true, gap: 0.15 }),
    solution: [
      first,
      R`Rewrite in exponential form: the ratio is \(10^{${num(d)}}\).`,
      R`\(10^{${num(d)}} \approx ${num(ans, { fixed: 1 })}\), so it is about ${num(ans, { fixed: 1 })} times as large.`,
    ],
    rule: 6,
    skill: 'logarithmic scales',
    check: () => (Math.abs(Math.log10(ratio) - d) < 1e-12 && Math.abs(ans - ratio) <= 0.05 + 1e-9 ? true : 'ratio is wrong'),
  });
}

// ───────────── Challenge ─────────────

function challengeExpQuadratic(rng) {
  if (rng.bool()) {
    const b = rng.pick([2, 3]);
    const i = rng.int(0, 2);
    const j = rng.int(i + 1, b === 2 ? 4 : 3);
    const u = b ** i;
    const v = b ** j;
    const f = (x) => b ** (2 * x) - (u + v) * b ** x + u * v;
    return q({
      prompt: R`Solve \(${b}^{2x} - ${u + v} \cdot ${b}^{x} + ${u * v} = 0\).`,
      correct: M(rootsTex([i, j])),
      wrong: [
        { value: M(rootsTex([u, v])), why: R`Those are the values of \(${b}^{x}\). Solve \(${b}^{x} = ${u}\) and \(${b}^{x} = ${v}\) to find \(x\).` },
        { value: M(rootsTex([j])), why: R`Both factors give a solution: \(${b}^{x} = ${u}\) and \(${b}^{x} = ${v}\) are each possible.` },
        M(rootsTex([-i, -j].filter((t, n, all) => all.indexOf(t) === n).concat(i === 0 ? [j] : []))),
        M(rootsTex([i + 1, j + 1])),
        M(rootsTex([i, j + 1])),
      ],
      solution: [
        R`Let \(u = ${b}^{x}\). Then \(${b}^{2x} = u^{2}\) and the equation becomes \(u^{2} - ${u + v}u + ${u * v} = 0\).`,
        R`Factor: \((u - ${u})(u - ${v}) = 0\), so \(${b}^{x} = ${u}\) or \(${b}^{x} = ${v}\).`,
        R`\(${u} = ${b}^{${i}}\) and \(${v} = ${b}^{${j}}\), so \(x = ${i}\) or \(x = ${j}\).`,
      ],
      rule: 4,
      skill: 'equations of quadratic type',
      check: () => checkEqual(f(i), 0) === true && checkEqual(f(j), 0),
    });
  }
  const u = rng.int(2, 9);
  const w = rng.intExcept(2, 9, [u]);
  const f = (x) => Math.exp(2 * x) + (w - u) * Math.exp(x) - u * w;
  return q({
    prompt: R`Solve \(${terms([[1, 'e^{2x}'], [w - u, 'e^{x}'], [-u * w, '']])} = 0\).`,
    correct: R`\(x = \ln ${u}\)`,
    wrong: [
      { value: R`\(x = \ln ${u}\) or \(x = \ln ${w}\)`, why: R`The second factor gives \(e^{x} = -${w}\), which has no solution because \(e^{x}\) is always positive.` },
      { value: R`\(x = ${u}\)`, why: R`\(${u}\) is the value of \(e^{x}\). Take the natural logarithm to find \(x\).` },
      R`\(x = \ln ${w}\)`,
      R`\(x = \ln ${u * w}\)`,
    ],
    solution: [
      R`Let \(u = e^{x}\). The equation becomes \(${terms([[1, 'u^{2}'], [w - u, 'u'], [-u * w, '']])} = 0\).`,
      R`Factor: \((u - ${u})(u + ${w}) = 0\), so \(e^{x} = ${u}\) or \(e^{x} = -${w}\).`,
      R`\(e^{x}\) is always positive, so \(e^{x} = -${w}\) is impossible. From \(e^{x} = ${u}\): \(x = \ln ${u}\).`,
    ],
    rule: 4,
    skill: 'equations of quadratic type',
    check: () => checkEqual(f(Math.log(u)), 0, 1e-9),
  });
}

function challengeLogInTerms(rng) {
  const i = rng.int(1, 4);
  const j = rng.intExcept(1, 4, [i]);
  const quotient = rng.bool(0.4);
  const s = quotient ? -1 : 1;
  const [two, three] = [power('2', i), power('3', j)];
  const NTex = quotient ? R`\dfrac{${2 ** i}}{${3 ** j}}` : String(2 ** i * 3 ** j);
  const N = quotient ? 2 ** i / 3 ** j : 2 ** i * 3 ** j;
  const [p, t] = [logb(7, 2), logb(7, 3)];
  const [base, e, sym] = i > 1 ? [2, i, 'p'] : [3, j, 'q'];
  return q({
    prompt: R`Suppose \(\log_{b} 2 = p\) and \(\log_{b} 3 = q\). Write \(\log_{b} ${NTex}\) in terms of \(p\) and \(q\).`,
    correct: M(terms([[i, 'p'], [s * j, 'q']])),
    wrong: [
      { value: M(`${i * j === 1 ? '' : i * j}pq`), why: 'The logarithm of a product is the sum of the logarithms, not their product.' },
      { value: M(`${power('p', i)}${quotient ? ' - ' : ''}${power('q', j)}`), why: R`\(\log_{b}(${base}^{${e}}) = ${e}\log_{b} ${base}\): the exponent comes out as a multiplier, giving \(${e}${sym}\), not \(${sym}^{${e}}\).` },
      M(terms([[j, 'p'], [s * i, 'q']])),
      M(terms([[i, 'p'], [-s * j, 'q']])),
    ],
    solution: [
      quotient ? R`Write the number with powers of 2 and 3: \(${NTex} = \dfrac{${two}}{${three}}\).` : R`Factor the number: \(${NTex} = ${two} \cdot ${three}\).`,
      quotient ? R`Quotient rule: \(\log_{b}\dfrac{${two}}{${three}} = \log_{b} ${two} - \log_{b} ${three}\).` : R`Product rule: \(\log_{b}(${two} \cdot ${three}) = \log_{b} ${two} + \log_{b} ${three}\).`,
      R`Power rule: \(${terms([[i, R`\log_{b} 2`], [s * j, R`\log_{b} 3`]])} = ${terms([[i, 'p'], [s * j, 'q']])}\).`,
    ],
    rule: 3,
    skill: 'properties of logarithms',
    check: () => checkEqual(i * p + s * j * t, logb(7, N)),
  });
}

function challengeGeometricMean(rng) {
  const [rn, rd] = rng.pick([[2, 1], [3, 1], [4, 1], [5, 1], [1, 2], [1, 3], [3, 2]]);
  const m = rng.int(1, 6) * rd * rd;
  const x1 = rng.int(0, 4);
  const h = rng.int(1, 3);
  const y1 = m;
  const mid = (m * rn) / rd;
  const y3 = (m * rn * rn) / (rd * rd);
  const mean = (y1 + y3) / 2;
  return q({
    prompt: R`An exponential function \(f\) has \(f(${x1}) = ${y1}\) and \(f(${x1 + 2 * h}) = ${y3}\). What is \(f(${x1 + h})\)?`,
    correct: mid,
    wrong: [
      { value: mean, why: R`The average \(\frac{${y1} + ${y3}}{2}\) would be right for a linear function. An exponential function multiplies by the same factor over equal steps.` },
      { value: Math.abs(y3 - y1), why: 'Compare by ratios, not differences: an exponential function has a constant ratio over equal steps.' },
      Number.isInteger(mid / 2) ? mid / 2 : mid * 2,
      mid + y1,
      Math.max(y1, y3) / 2 === mid ? mid * 3 : Math.max(y1, y3) / 2,
    ],
    solution: [
      R`\(x = ${x1 + h}\) is halfway between \(${x1}\) and \(${x1 + 2 * h}\). Over each half the function is multiplied by the same factor \(r\).`,
      R`So \(${y1} \cdot r \cdot r = ${y3}\), which gives \(r^{2} = ${frac(y3, y1).tex()}\) and \(r = ${frac(rn, rd).tex()}\) (the factor is positive).`,
      R`\(f(${x1 + h}) = ${y1} \cdot ${frac(rn, rd).tex()} = ${mid}\). This is the geometric mean \(\sqrt{${y1} \cdot ${y3}}\).`,
    ],
    rule: 0,
    skill: 'exponential reasoning',
    check: () => checkEqual(mid * mid, y1 * y3),
  });
}

function challengeInverse(rng) {
  const h = rng.nonzero(-6, 6);
  const k = rng.intExcept(-6, 6, [0, h, -h]);
  if (rng.bool()) {
    const a = rng.int(2, 5);
    const f = (x) => a * Math.log(x - h) + k;
    const inv = (x) => Math.exp((x - k) / a) + h;
    const sh = (v) => `${v > 0 ? '+' : '-'} ${Math.abs(v)}`;
    return q({
      prompt: R`Find the inverse of \(f(x) = ${a}\ln(${linear(1, -h)}) ${sh(k)}\).`,
      correct: R`\(f^{-1}(x) = e^{(${linear(1, -k)})/${a}} ${sh(h)}\)`,
      wrong: [
        { value: R`\(f^{-1}(x) = e^{x/${a} ${sh(-k)}} ${sh(h)}\)`, why: R`Undo the steps of \(f\) in reverse order: remove \(${sh(k)}\) first, then divide the whole result by \(${a}\).` },
        { value: R`\(f^{-1}(x) = \dfrac{e^{${linear(1, -k)}}}{${a}} ${sh(h)}\)`, why: R`Divide by \(${a}\) before undoing the logarithm, so the division is inside the exponent.` },
        R`\(f^{-1}(x) = e^{(${linear(1, k)})/${a}} ${sh(-h)}\)`,
        R`\(f^{-1}(x) = e^{(${linear(1, -h)})/${a}} ${sh(k)}\)`,
      ],
      solution: [
        R`Swap \(x\) and \(y\): \(x = ${a}\ln(${linear(1, -h, 'y')}) ${sh(k)}\).`,
        R`Isolate the logarithm: \(\ln(${linear(1, -h, 'y')}) = \dfrac{${linear(1, -k)}}{${a}}\).`,
        R`Rewrite in exponential form: \(${linear(1, -h, 'y')} = e^{(${linear(1, -k)})/${a}}\).`,
        R`So \(f^{-1}(x) = e^{(${linear(1, -k)})/${a}} ${sh(h)}\).`,
      ],
      rule: 2,
      skill: 'inverse of a logarithmic function',
      check: () => checkSame((x) => f(inv(x)), (x) => x),
    });
  }
  const b = rng.pick([2, 3, 5, 10]);
  const f = (x) => b ** (x - h) + k;
  const inv = (x) => logb(b, x - k) + h;
  const form = (inside, shift) => R`\(f^{-1}(x) = \log_{${b}}(${inside}) ${shift > 0 ? '+' : '-'} ${Math.abs(shift)}\)`;
  return q({
    prompt: R`Find the inverse of \(f(x) = ${b}^{${linear(1, -h)}} ${k > 0 ? '+' : '-'} ${Math.abs(k)}\).`,
    correct: form(linear(1, -k), h),
    wrong: [
      { value: form(linear(1, -h), k), why: R`Solving for \(y\) removes \(${k > 0 ? '+' : '-'} ${Math.abs(k)}\) before the logarithm is taken, so \(${Math.abs(k)}\) ends up inside the logarithm.` },
      { value: form(linear(1, k), -h), why: 'Each step is undone with the opposite operation.' },
      form(linear(1, -k), -h),
      form(linear(1, k), h),
    ],
    solution: [
      R`Swap \(x\) and \(y\): \(x = ${b}^{${linear(1, -h, 'y')}} ${k > 0 ? '+' : '-'} ${Math.abs(k)}\).`,
      R`Isolate the power: \(${b}^{${linear(1, -h, 'y')}} = ${linear(1, -k)}\).`,
      R`Rewrite in logarithmic form: \(${linear(1, -h, 'y')} = \log_{${b}}(${linear(1, -k)})\).`,
      R`So \(f^{-1}(x) = \log_{${b}}(${linear(1, -k)}) ${h > 0 ? '+' : '-'} ${Math.abs(h)}\).`,
    ],
    rule: 2,
    skill: 'inverse of an exponential function',
    check: () => checkSame((x) => f(inv(x + k + 1)), (x) => x + k + 1),
  });
}

function challengeSemiLog(rng) {
  const m = rng.pick([1, 2, -1]);
  const model = rng.bool();
  const c = m === 1 ? rng.int(model ? 2 : 1, 3) : m === 2 ? (model ? 2 : rng.int(0, 1)) : rng.int(3, 5);
  const big = (e) => num(10 ** e, { commas: true });
  const visual = {
    type: 'plot',
    x: [0, 4.5],
    y: [Math.min(0, c + 3 * m) - 0.5, Math.max(c, c + 3 * m) + 1],
    step: [1, 1],
    fns: [{ f: (x) => m * x + c }],
    points: [0, 1, 2, 3].map((x) => ({ x, y: m * x + c })),
    axisLabels: ['x', 'log₁₀ y'],
    alt: `Semi-log plot: the vertical axis shows the base-10 logarithm of y. The data points (0, ${c}), (1, ${c + m}), (2, ${c + 2 * m}) and (3, ${c + 3 * m}) lie on a straight line with slope ${m}.`,
  };
  if (!model) {
    const xq = rng.int(1, 3);
    const e = c + m * xq;
    return q({
      prompt: R`The graph shows \(\log_{10} y\) plotted against \(x\) for a set of data. What is the value of \(y\) when \(x = ${xq}\)?`,
      visual,
      correct: M(big(e)),
      wrong: [
        { value: M(String(e)), why: R`That is \(\log_{10} y\), the height on this graph. Undo the logarithm: \(y = 10^{${e}}\).` },
        { value: M(num(10 * e, { commas: true })), why: R`\(\log_{10} y = ${e}\) means \(y = 10^{${e}}\), not \(10 \cdot ${e}\).` },
        M(big(e + 1)),
        M(big(e - 1)),
        M(big(e + 2)),
      ],
      solution: [R`Read the graph: at \(x = ${xq}\), \(\log_{10} y = ${e}\).`, R`Rewrite in exponential form: \(y = 10^{${e}} = ${big(e)}\).`],
      rule: 6,
      skill: 'semi-log plots',
      check: () => checkEqual(Math.log10(10 ** e), m * xq + c),
    });
  }
  const a = 10 ** c;
  const b = 10 ** m;
  const form = (lead, base) => R`\(y = ${num(lead, { commas: true })} \cdot ${num(base)}^{x}\)`;
  return q({
    prompt: R`The graph shows \(\log_{10} y\) plotted against \(x\) for a set of data. Which model fits the data?`,
    visual,
    correct: form(a, b),
    wrong: [
      { value: R`\(y = ${linear(m, c)}\)`, why: R`The straight line gives \(\log_{10} y\), not \(y\): \(\log_{10} y = ${linear(m, c)}\).` },
      { value: form(c, b), why: R`The intercept \(${c}\) is \(\log_{10}\) of the starting value, so the starting value is \(10^{${c}} = ${num(a, { commas: true })}\).` },
      { value: R`\(y = ${num(a, { commas: true })}${power('x', m)}\)`, why: 'A power function is a straight line only when both axes are logarithmic. A straight line on a semi-log plot means an exponential model.' },
      form(a, Math.abs(m) === 1 ? 2 : 20),
    ],
    solution: [
      R`The line has intercept \(${c}\) and slope \(${m}\): \(\log_{10} y = ${linear(m, c)}\).`,
      R`Rewrite in exponential form: \(y = 10^{${linear(m, c)}} = 10^{${c}} \cdot \left(10^{${m}}\right)^{x}\).`,
      R`\(10^{${c}} = ${num(a, { commas: true })}\) and \(10^{${m}} = ${num(b)}\), so \(y = ${num(a, { commas: true })} \cdot ${num(b)}^{x}\).`,
    ],
    rule: 6,
    skill: 'semi-log plots',
    check: () => ([0, 1, 2.5].every((x) => Math.abs(Math.log10(a * b ** x) - (m * x + c)) < 1e-9) ? true : 'model does not match the line'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'exponential-logarithmic',
  title: 'Exponential & Logarithmic Functions',
  summary: 'Build exponential models, use logarithms as their inverses, apply log properties, and solve exponential and log equations.',
  standards: ['AP Precalculus 2.1', 'AP Precalculus 2.2', 'AP Precalculus 2.3', 'AP Precalculus 2.5', 'AP Precalculus 2.9', 'AP Precalculus 2.11', 'AP Precalculus 2.12', 'AP Precalculus 2.13', 'AP Precalculus 2.14', 'CCSS F-BF.B.5'],

  explain: {
    intro: R`Linear functions grow by adding the same amount over equal steps. Exponential functions grow by multiplying by the same factor over equal steps. Logarithms run exponential functions backwards: they answer the question "what exponent produces this number?", which is exactly what is needed to solve for a variable in an exponent.`,
    rules: [
      {
        title: 'Add or multiply: linear vs exponential',
        text: R`An arithmetic sequence adds a common difference \(d\) each step: \(a_{n} = a_{0} + dn\). A geometric sequence multiplies by a common ratio \(r\) each step: \(g_{n} = g_{0} \cdot r^{n}\). Linear functions \(f(x) = b + mx\) and exponential functions \(f(x) = a \cdot b^{x}\) are the same two patterns for all real inputs.`,
        example: R`\(5, 8, 11, 14\) adds 3 (arithmetic). \(5, 10, 20, 40\) multiplies by 2 (geometric).`,
      },
      {
        title: 'Exponential models',
        text: R`In \(f(x) = a \cdot b^{x}\), \(a\) is the value at \(x = 0\) and \(b\) is the factor for each unit step: growth if \(b > 1\), decay if \(0 < b < 1\). A change of \(p\%\) per step gives \(b = 1 \pm \frac{p}{100}\). From two points, divide the outputs to find a power of \(b\). Continuous growth uses the natural base \(e \approx 2.718\): \(f(t) = a e^{kt}\).`,
        example: R`Through \((1, 6)\) and \((3, 54)\): \(b^{2} = \frac{54}{6} = 9\), so \(b = 3\) and \(a = \frac{6}{3} = 2\). \(f(x) = 2 \cdot 3^{x}\).`,
      },
      {
        title: 'A logarithm is an exponent',
        text: R`\(\log_{b} x = y\) means \(b^{y} = x\). The functions \(b^{x}\) and \(\log_{b} x\) are inverses: \(\log_{b}(b^{x}) = x\) and \(b^{\log_{b} x} = x\). Only positive numbers have logarithms. \(\ln x\) means \(\log_{e} x\), and \(\log x\) means \(\log_{10} x\).`,
        example: R`\(\log_{2} 32 = 5\) because \(2^{5} = 32\). \(\ln e^{3} = 3\). \(\log 0.01 = -2\).`,
      },
      {
        title: 'Properties of logarithms',
        text: R`Product: \(\log_{b}(MN) = \log_{b} M + \log_{b} N\). Quotient: \(\log_{b}\frac{M}{N} = \log_{b} M - \log_{b} N\). Power: \(\log_{b}(M^{p}) = p\log_{b} M\). Change of base: \(\log_{b} x = \dfrac{\ln x}{\ln b}\).`,
        example: R`\(2\ln x + \ln y - 3\ln z = \ln\dfrac{x^{2}y}{z^{3}}\). \(\log_{2} 12 = \dfrac{\ln 12}{\ln 2} \approx 3.585\).`,
      },
      {
        title: 'Solving exponential equations',
        text: R`Isolate the exponential term. If both sides can be written as powers of the same base, set the exponents equal. Otherwise take a logarithm of both sides and use the power rule to bring the exponent down.`,
        example: R`\(5 \cdot 2^{x} = 60\) gives \(2^{x} = 12\), so \(x = \dfrac{\ln 12}{\ln 2} \approx 3.58\).`,
      },
      {
        title: 'Solving logarithmic equations and inequalities',
        text: R`Combine the logarithms into one, rewrite in exponential form, and solve. Then check every answer against the domain: the input of each logarithm must be positive. For inequalities, remember that \(\log_{b}\) and \(b^{x}\) are increasing when \(b > 1\) and decreasing when \(0 < b < 1\) (which reverses the inequality).`,
        example: R`\(\log_{2} x + \log_{2}(x - 2) = 3\) gives \(x(x - 2) = 8\), so \(x = 4\) or \(x = -2\). Only \(x = 4\) is in the domain.`,
      },
      {
        title: 'Log scales, semi-log plots and choosing a model',
        text: R`On a logarithmic scale, equal steps multiply the quantity by a fixed factor (10 for each unit of \(\log_{10}\)). Exponential data become a straight line when \(\log y\) is plotted against \(x\) (a semi-log plot). To choose a model from a table with equal steps: constant first differences mean linear, constant second differences mean quadratic, constant ratios mean exponential.`,
        example: R`A magnitude 7 earthquake has \(10^{2} = 100\) times the amplitude of a magnitude 5 earthquake.`,
      },
    ],
    vocab: [
      { term: 'common ratio / growth factor', def: R`The number each output is multiplied by when the input goes up by 1: the base \(b\) of \(a \cdot b^{x}\).` },
      { term: 'half-life / doubling time', def: 'The time it takes a decaying quantity to halve, or a growing quantity to double. It is the same no matter when you start.' },
      { term: 'natural logarithm', def: R`The logarithm with base \(e\), written \(\ln x\).` },
      { term: 'extraneous solution', def: 'A value produced by correct algebra that does not satisfy the original equation, for example because it makes the input of a logarithm negative.' },
      { term: 'semi-log plot', def: R`A graph in which one axis (usually \(y\)) uses a logarithmic scale. Exponential data appear as a straight line.` },
    ],
    mistakes: [
      R`Splitting a logarithm over a sum: \(\log(M + N)\) is not \(\log M + \log N\). The product rule applies to \(\log(MN)\).`,
      R`Using 0.05 or 5 as the factor for 5% growth. Growing by 5% multiplies by \(1.05\).`,
      R`Combining \(3 \cdot 2^{x}\) into \(6^{x}\). The exponent applies only to the 2.`,
      'Keeping a solution of a logarithmic equation without checking that every logarithm in the original equation has a positive input.',
    ],
    visual: {
      type: 'plot',
      x: [-4, 9],
      y: [-4, 9],
      square: true,
      fns: [
        { f: (x) => 2 ** x, label: 'y = 2ˣ', labelAt: 2.4 },
        { f: (x) => Math.log2(x), domain: [0.05, 9], color: 'b', label: 'y = log₂ x', labelAt: 6.5 },
        { f: (x) => x, color: 'c', dashed: true },
      ],
      points: [{ x: 3, y: 8, label: '(3, 8)' }, { x: 8, y: 3, label: '(8, 3)', color: 'b' }],
      alt: 'Graphs of y = 2 to the power x and y = log base 2 of x. They are mirror images in the dashed line y = x: the point (3, 8) on the exponential curve matches the point (8, 3) on the logarithmic curve.',
    },
  },

  examples: [
    {
      title: 'An exponential function through two points',
      problem: R`Find the exponential function \(f(x) = a \cdot b^{x}\) with \(f(2) = 12\) and \(f(5) = 96\).`,
      steps: [
        R`Divide the outputs: \(\dfrac{f(5)}{f(2)} = \dfrac{96}{12} = 8\). In the formula, \(\dfrac{ab^{5}}{ab^{2}} = b^{3}\).`,
        R`\(b^{3} = 8\), so \(b = 2\).`,
        R`Use \(f(2) = 12\): \(a \cdot 2^{2} = 12\), so \(a = 3\).`,
      ],
      answer: R`\(f(x) = 3 \cdot 2^{x}\)`,
    },
    {
      title: 'Word problem: how long until it doubles?',
      word: true,
      problem: R`A town of 500 people grows by 8% each year. After how many years will the population reach 1,000?`,
      steps: [
        R`Growing by 8% multiplies the population by 1.08 each year: \(P(t) = 500(1.08)^{t}\).`,
        R`Set \(500(1.08)^{t} = 1000\) and isolate the power: \((1.08)^{t} = 2\).`,
        R`Take the natural logarithm of both sides: \(t \ln 1.08 = \ln 2\).`,
        R`\(t = \dfrac{\ln 2}{\ln 1.08} \approx 9.0\).`,
      ],
      answer: 'About 9 years.',
      visual: {
        type: 'plot',
        x: [0, 14],
        y: [0, 1500],
        fns: [{ f: (t) => 500 * 1.08 ** t }],
        hlines: [{ y: 1000 }],
        points: [{ x: 9.006, y: 1000, label: 't ≈ 9' }, { x: 0, y: 500, label: '500' }],
        axisLabels: ['t (years)', 'P'],
        alt: 'Graph of the population P = 500 times 1.08 to the power t. The curve starts at 500 and bends upward, crossing the dashed line P = 1000 at about t = 9 years.',
      },
    },
    {
      title: 'Condensing with the log properties',
      problem: R`Write \(3\log_{2} x - \log_{2} y + 2\) as a single logarithm.`,
      steps: [
        R`Power rule: \(3\log_{2} x = \log_{2} x^{3}\).`,
        R`Write the constant as a logarithm: \(2 = \log_{2} 2^{2} = \log_{2} 4\).`,
        R`Product and quotient rules: \(\log_{2} x^{3} + \log_{2} 4 - \log_{2} y = \log_{2}\dfrac{4x^{3}}{y}\).`,
      ],
      answer: R`\(\log_{2}\dfrac{4x^{3}}{y}\)`,
    },
    {
      title: 'A logarithmic equation with an extraneous solution',
      problem: R`Solve \(\log_{2} x + \log_{2}(x - 2) = 3\).`,
      steps: [
        R`Product rule: \(\log_{2}\big(x(x - 2)\big) = 3\).`,
        R`Exponential form: \(x(x - 2) = 2^{3} = 8\), so \(x^{2} - 2x - 8 = 0\).`,
        R`Factor: \((x - 4)(x + 2) = 0\), so \(x = 4\) or \(x = -2\).`,
        R`Check the domain: both logarithms need \(x > 2\). \(x = -2\) is rejected.`,
      ],
      answer: R`\(x = 4\)`,
    },
    {
      title: 'Word problem: a logarithmic scale',
      word: true,
      problem: R`Sound level in decibels is \(L = 10\log_{10}\left(\dfrac{I}{I_{0}}\right)\). A concert measures 110 dB and a conversation 60 dB. How many times more intense is the concert sound?`,
      steps: [
        R`Subtract the levels: \(110 - 60 = 50 = 10\log_{10}\left(\dfrac{I_{1}}{I_{2}}\right)\), because a difference of logarithms is the logarithm of a quotient.`,
        R`Divide by 10: \(\log_{10}\left(\dfrac{I_{1}}{I_{2}}\right) = 5\).`,
        R`Exponential form: \(\dfrac{I_{1}}{I_{2}} = 10^{5} = 100{,}000\).`,
      ],
      answer: 'The concert sound is 100,000 times as intense.',
    },
  ],

  models: [
    {
      id: 'two-point-exponential',
      title: 'Exponential function through two points',
      intro: 'Choose two points with positive heights. The model finds f(x) = a·bˣ through both.',
      inputs: [
        { name: 'x1', label: 'First x', type: 'int', min: 0, max: 6, value: 1 },
        { name: 'y1', label: 'First y', type: 'int', min: 1, max: 500, value: 6 },
        { name: 'x2', label: 'Second x', type: 'int', min: 0, max: 10, value: 3 },
        { name: 'y2', label: 'Second y', type: 'int', min: 1, max: 5000, value: 54 },
      ],
      compute({ x1, y1, x2, y2 }) {
        if (x1 === x2) return { error: 'The two points need different x-values.' };
        if (x1 > x2) [x1, y1, x2, y2] = [x2, y2, x1, y1];
        const dx = x2 - x1;
        const ratio = y2 / y1;
        const b = ratio ** (1 / dx);
        const a = y1 / b ** x1;
        const f = (x) => a * b ** x;
        const top = Math.max(y1, y2, f(x2 + 1)) * 1.1;
        return {
          problem: R`Find \(f(x) = a \cdot b^{x}\) through \((${x1}, ${y1})\) and \((${x2}, ${y2})\).`,
          steps: [
            R`Divide the outputs: \(\dfrac{${y2}}{${y1}} = ${num(ratio, { places: 4 })}\). In the formula this is \(b^{${x2} - ${x1}} = b^{${dx}}\).`,
            dx === 1 ? R`So \(b = ${num(b, { places: 4 })}\).` : R`Take the ${dx === 2 ? 'square' : dx === 3 ? 'cube' : `${dx}th`} root: \(b = ${num(ratio, { places: 4 })}^{1/${dx}} ${Number.isInteger(round(b, 9)) ? '=' : R`\approx`} ${num(b, { places: 4 })}\).`,
            x1 === 0 ? R`The first point is at \(x = 0\), so \(a = ${y1}\).` : R`Use the first point: \(a \cdot ${num(b, { places: 4 })}^{${x1}} = ${y1}\), so \(a ${Number.isInteger(round(a, 9)) ? '=' : R`\approx`} ${num(a, { places: 4 })}\).`,
            b > 1 ? R`\(b > 1\): the function grows by ${num((b - 1) * 100, { places: 1 })}% for each unit of \(x\).` : b < 1 ? R`\(0 < b < 1\): the function decays by ${num((1 - b) * 100, { places: 1 })}% for each unit of \(x\).` : R`\(b = 1\): the function is constant.`,
          ],
          answer: R`\(f(x) ${Number.isInteger(round(a, 9)) && Number.isInteger(round(b, 9)) ? '=' : R`\approx`} ${num(a, { places: 4 })} \cdot ${num(b, { places: 4 })}^{x}\)`,
          visual: {
            type: 'plot',
            x: [Math.min(0, x1) - 0.5, x2 + 1],
            y: [0, top],
            fns: [{ f }],
            points: [{ x: x1, y: y1, label: `(${x1}, ${y1})` }, { x: x2, y: y2, label: `(${x2}, ${y2})` }],
            alt: `Graph of the exponential function through the points (${x1}, ${y1}) and (${x2}, ${y2}).`,
          },
        };
      },
    },
    {
      id: 'growth-time',
      title: 'Word problem: time to reach a target',
      word: true,
      intro: 'Set a starting amount, a yearly percentage change (negative for decay) and a target. The model solves for the time with logarithms.',
      inputs: [
        { name: 'start', label: 'Starting amount', type: 'int', min: 1, max: 100000, value: 500 },
        { name: 'rate', label: 'Percent change per year', type: 'int', min: -50, max: 100, value: 8 },
        { name: 'target', label: 'Target amount', type: 'int', min: 1, max: 1000000, value: 1000 },
      ],
      compute({ start, rate, target }) {
        if (rate === 0) return { error: 'With a change of 0% the amount never moves. Choose a rate other than 0.' };
        if (target === start) return { error: 'The target equals the starting amount, so no time is needed. Choose a different target.' };
        if (rate > 0 && target < start) return { error: 'The amount is growing, so it never falls to a smaller target. Choose a target above the starting amount, or a negative rate.' };
        if (rate < 0 && target > start) return { error: 'The amount is shrinking, so it never reaches a larger target. Choose a target below the starting amount, or a positive rate.' };
        const b = 1 + rate / 100;
        const t = Math.log(target / start) / Math.log(b);
        const f = (x) => start * b ** x;
        return {
          problem: `An amount of ${txt(start)} ${rate > 0 ? 'grows' : 'shrinks'} by ${Math.abs(rate)}% each year. When does it reach ${txt(target)}?`,
          steps: [
            R`Each year multiplies the amount by \(1 ${rate > 0 ? '+' : '-'} ${num(Math.abs(rate) / 100)} = ${num(b)}\), so \(A(t) = ${num(start)}(${num(b)})^{t}\).`,
            R`Set \(${num(start)}(${num(b)})^{t} = ${num(target)}\) and isolate the power: \((${num(b)})^{t} = ${num(target / start, { places: 4 })}\).`,
            R`Take the natural logarithm of both sides: \(t \ln ${num(b)} = \ln ${num(target / start, { places: 4 })}\).`,
            R`\(t = \dfrac{\ln ${num(target / start, { places: 4 })}}{\ln ${num(b)}} \approx ${num(t, { places: 2 })}\).`,
          ],
          answer: `After about ${txt(t, { places: 1 })} years.`,
          visual: {
            type: 'plot',
            x: [0, Math.max(1, t * 1.4)],
            y: [0, Math.max(start, target) * 1.25],
            fns: [{ f }],
            hlines: [{ y: target }],
            points: [{ x: t, y: target, label: `t ≈ ${txt(t, { places: 1 })}` }],
            axisLabels: ['t (years)', 'amount'],
            alt: `Graph of the amount over time, starting at ${txt(start)}. The curve meets the dashed target line at ${txt(target)} after about ${txt(t, { places: 1 })} years.`,
          },
        };
      },
    },
    {
      id: 'change-of-base',
      title: 'Evaluate any logarithm',
      intro: 'Choose a base and a number. The change-of-base formula turns the question into natural logarithms.',
      inputs: [
        { name: 'b', label: 'Base b', type: 'int', min: 2, max: 20, value: 2 },
        { name: 'x', label: 'Number x', type: 'int', min: 1, max: 100000, value: 12 },
      ],
      compute({ b, x }) {
        const v = logb(b, x);
        const exact = Number.isInteger(round(v, 9));
        return {
          problem: R`Evaluate \(\log_{${b}} ${num(x)}\).`,
          steps: [
            R`\(\log_{${b}} ${num(x)}\) is the exponent \(y\) with \(${b}^{y} = ${num(x)}\).`,
            R`Change of base: \(\log_{${b}} ${num(x)} = \dfrac{\ln ${num(x)}}{\ln ${b}} = \dfrac{${num(Math.log(x), { places: 4 })}}{${num(Math.log(b), { places: 4 })}}\).`,
            R`\(${exact ? '=' : R`\approx`} ${num(v, { places: 4 })}\). Check: \(${b}^{${num(v, { places: 4 })}} ${exact ? '=' : R`\approx`} ${num(x)}\). ✓`,
          ],
          answer: R`\(\log_{${b}} ${num(x)} ${exact ? '=' : R`\approx`} ${num(v, { places: 4 })}\)`,
        };
      },
    },
  ],

  quiz: {
    easy: [easySequenceType, easyEvaluateLog, easyLogForm, easyGrowthModel],
    medium: [mediumTwoPoints, mediumCondenseLogs, mediumSolveExact, mediumHalfLife, mediumChooseModel],
    hard: [hardSolveExp, hardLogEquation, hardInequality, hardContinuousGrowth, hardLogScale],
    challenge: [challengeExpQuadratic, challengeLogInTerms, challengeGeometricMean, challengeInverse, challengeSemiLog],
  },
};
