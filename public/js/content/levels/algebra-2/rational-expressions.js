import { R, q, frac, tryFrac, terms, poly, linear, power, over, texFrac, num, txt, paren, gcd, range, rootsTex, people, person, polyEval, checkSame } from '../../lib/index.js';
import { M, symChoices } from './_shared.js';

// ───────────── Helpers ─────────────

const lin = (c) => linear(1, c); // x + c
const F = (top, bottom) => texFrac(String(top), bottom); // a single negative term has its sign moved in front
const DF = (top, bottom) => `\\dfrac{${top}}{${bottom}}`;
const asX = (v) => M(`x = ${num(v)}`);
const NONZERO = range(-9, 9).filter((v) => v !== 0);
// "x = 2" or "x = -3 \text{ and } x = 2"
const exclTex = (vals) => [...new Set(vals)].sort((a, b) => a - b).map((v) => `x = ${v}`).join(' \\text{ and } ');
// c·xᵏ as a single fraction: monoTex(2/3, 1) → 2x/3, monoTex(2/3, -1) → 2/(3x)
function monoTex(c, k) {
  const top = k > 0 ? terms([[Math.abs(c.n), power('x', k)]]) : `${Math.abs(c.n)}`;
  const bottom = k < 0 ? terms([[c.d, power('x', -k)]]) : `${c.d}`;
  return `${c.n < 0 ? '-' : ''}${bottom === '1' ? top : F(top, bottom)}`;
}
// Pairs of times (a < b) for which working together takes a whole number of hours: [a, b, together].
const WORK = [];
for (let a = 2; a <= 30; a++) for (let b = a + 1; b <= 60; b++) if ((a * b) % (a + b) === 0) WORK.push([a, b, (a * b) / (a + b)]);
// Pairs of speeds whose round-trip average (the harmonic mean) is a whole number.
const SPEEDS = [];
// Both speeds are either cycling speeds (40 km/h or less) or driving speeds (40 km/h or more).
for (let r1 = 10; r1 <= 90; r1 += 5) for (let r2 = r1 + 5; r2 <= 120; r2 += 5) if ((2 * r1 * r2) % (r1 + r2) === 0 && (r2 <= 40 || r1 >= 40)) SPEEDS.push([r1, r2, (2 * r1 * r2) / (r1 + r2)]);

// ───────────── Easy ─────────────

function easyExcluded(rng) {
  const kind = rng.pick(['one', 'one', 'scaled', 'two', 'two']);
  const ask = (expr) => R`Which value or values of \(x\) are excluded from the domain of \(${expr}\)?`;
  if (kind === 'two') {
    const [p, r, n] = rng.sample(NONZERO, 3);
    return q({
      prompt: ask(DF(lin(-n), `(${lin(-p)})(${lin(-r)})`)),
      correct: M(exclTex([p, r])),
      wrong: [
        { value: M(exclTex([-p, -r])), why: R`Set each factor of the denominator equal to 0. \(${lin(-p)} = 0\) gives \(x = ${p}\), not \(x = ${-p}\).` },
        { value: M(exclTex([n])), why: R`\(x = ${n}\) makes the numerator 0, so the fraction equals 0 there. That is allowed. Only a zero denominator is excluded.` },
        M(exclTex([p])),
        M(exclTex([r])),
      ],
      solution: [
        'A fraction is not defined when its denominator is 0. The numerator does not matter.',
        R`Set the denominator equal to 0: \((${lin(-p)})(${lin(-r)}) = 0\), so \(x = ${p}\) or \(x = ${r}\).`,
        R`Excluded values: \(${exclTex([p, r])}\).`,
      ],
      rule: 0,
      skill: 'excluded values',
      check: () => ((p - p) * (p - r) === 0 && (r - p) * (r - r) === 0 && (n - p) * (n - r) !== 0 ? true : 'denominator is not zero at the excluded values'),
    });
  }
  const p = rng.pick(NONZERO);
  if (kind === 'scaled') {
    const c = rng.int(2, 6);
    const n = rng.pick(NONZERO.filter((v) => v !== p && v !== -p));
    return q({
      prompt: ask(DF(lin(-n), linear(c, -c * p))),
      correct: M(exclTex([p])),
      wrong: [
        { value: M(exclTex([c * p])), why: R`Solve \(${linear(c, -c * p)} = 0\) completely: \(${c}x = ${c * p}\), so \(x = ${p}\).` },
        { value: M(exclTex([n])), why: R`\(x = ${n}\) makes the numerator 0, which is allowed. Only a zero denominator is excluded.` },
        M(exclTex([-p])),
        M(exclTex([-c * p])),
      ],
      solution: [
        'A fraction is not defined when its denominator is 0.',
        R`Solve \(${linear(c, -c * p)} = 0\): \(${c}x = ${c * p}\), so \(x = ${p}\).`,
        R`The excluded value is \(x = ${p}\).`,
      ],
      rule: 0,
      skill: 'excluded values',
      check: () => (c * p - c * p === 0 ? true : 'denominator is not zero'),
    });
  }
  const a = rng.int(1, 5);
  const b = rng.pick(NONZERO.filter((v) => v !== -a * p && v !== a * p));
  const numZero = frac(-b, a);
  return q({
    prompt: ask(DF(linear(a, b), lin(-p))),
    correct: M(exclTex([p])),
    wrong: [
      { value: M(exclTex([-p])), why: R`\(${lin(-p)} = 0\) when \(x = ${p}\). Check: \(${p} ${p > 0 ? '-' : '+'} ${Math.abs(p)} = 0\).` },
      { value: M(`x = ${numZero.tex()}`), why: 'That value makes the numerator 0, so the fraction equals 0 there. That is allowed. Only a zero denominator is excluded.' },
      M('x = 0'),
      M(`x = ${b}`),
    ],
    solution: [
      'A fraction is not defined when its denominator is 0. The numerator does not matter.',
      R`Solve \(${lin(-p)} = 0\): \(x = ${p}\).`,
      R`The excluded value is \(x = ${p}\).`,
    ],
    rule: 0,
    skill: 'excluded values',
    check: () => (p - p === 0 && a * p + b !== 0 ? true : 'denominator is not zero'),
  });
}

function easySimplifyFactored(rng) {
  const [p, a, b] = rng.sample(NONZERO, 3);
  const top = rng.shuffle([p, a]);
  const bottom = rng.shuffle([p, b]);
  const original = (x) => ((x + p) * (x + a)) / ((x + p) * (x + b));
  const opt = (n, d, why) => ({ tex: F(lin(n), lin(d)), f: (x) => (x + n) / (x + d), why });
  return q({
    prompt: R`Simplify: \(\;${DF(`(${lin(top[0])})(${lin(top[1])})`, `(${lin(bottom[0])})(${lin(bottom[1])})`)}\)`,
    ...symChoices(opt(a, b), [
      { tex: frac(a, b).tex(), f: () => a / b, why: R`The \(x\) in \(${lin(a)}\) is a term, not a factor, so it cannot be cancelled. Only the whole factor \((${lin(p)})\) cancels.` },
      opt(b, a, 'The numerator and denominator have been swapped.'),
      opt(p, b),
      opt(a, p),
    ]),
    solution: [
      R`The factor \((${lin(p)})\) appears in both the numerator and the denominator.`,
      R`Cancel it: \(${F(lin(a), lin(b))}\).`,
      R`Nothing else is a common factor, so this is fully simplified (for \(x \neq ${-p}\) and \(x \neq ${-b}\)).`,
    ],
    rule: 1,
    skill: 'simplifying',
    check: () => checkSame(original, (x) => (x + a) / (x + b)),
  });
}

function easyMultiplyMonomials(rng) {
  const [a, b, c, d] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
  if (a === b || c === d || a * c === b * d) return easyMultiplyMonomials(rng);
  const m = rng.int(2, 5);
  const n = rng.intExcept(1, 4, [m]);
  const coef = frac(a * c, b * d);
  const opt = (cf, k, why) => ({ tex: monoTex(cf, k), f: (x) => cf.value * x ** k, why });
  return q({
    prompt: R`Multiply and simplify: \(\;${DF(`${a}x^{${m}}`, b)} \cdot ${DF(c, terms([[d, power('x', n)]]))}\)`,
    ...symChoices(opt(coef, m - n), [
      opt(coef, m + n, R`\(${power('x', n)}\) is in the denominator, so the powers of \(x\) are subtracted: \(x^{${m} - ${n}}\).`),
      opt(frac(a * d, b * c), m - n, 'To multiply fractions, multiply the numerators together and the denominators together.'),
      opt(coef.inv(), n - m),
      opt(frac(a + c, b + d), m - n),
      opt(coef.mul(2), m - n),
    ]),
    solution: [
      R`Multiply the numerators and the denominators: \(${DF(`${a * c}x^{${m}}`, terms([[b * d, power('x', n)]]))}\).`,
      R`Simplify the numbers: \(\frac{${a * c}}{${b * d}} = ${coef.tex()}\). Simplify the powers: \(\frac{x^{${m}}}{${power('x', n)}} = ${m - n > 0 ? power('x', m - n) : `\\frac{1}{${power('x', n - m)}}`}\).`,
      R`Result: \(${monoTex(coef, m - n)}\).`,
    ],
    rule: 2,
    skill: 'multiplying',
    check: () => checkSame((x) => ((a * x ** m) / b) * (c / (d * x ** n)), (x) => coef.value * x ** (m - n)),
  });
}

function easyAddLike(rng) {
  const p = rng.pick(NONZERO);
  const den = lin(p);
  if (rng.bool(0.4)) {
    const a = rng.int(2, 9);
    const b = rng.pick(NONZERO.filter((v) => v !== a * p));
    return q({
      prompt: R`${b > 0 ? 'Add' : 'Subtract'}: \(\;${DF(`${a}x`, den)} ${b > 0 ? '+' : '-'} ${DF(Math.abs(b), den)}\)`,
      ...symChoices({ tex: F(linear(a, b), den), f: (x) => (a * x + b) / (x + p) }, [
        { tex: F(linear(a, b), linear(2, 2 * p)), f: (x) => (a * x + b) / (2 * x + 2 * p), why: R`The denominators are the same, so the denominator stays \(${den}\). Only the numerators are combined.` },
        { tex: F(terms([[a + b, 'x']]), den), f: (x) => ((a + b) * x) / (x + p), why: R`\(${a}x\) and \(${b}\) are not like terms, so they cannot be combined into one term.` },
        { tex: F(linear(a, b), `(${den})^{2}`), f: (x) => (a * x + b) / (x + p) ** 2 },
        { tex: F(linear(a, -b), den), f: (x) => (a * x - b) / (x + p) },
      ]),
      solution: [
        R`The denominators are already the same, so keep \(${den}\) and combine the numerators.`,
        R`\(${F(linear(a, b), den)}\). The numerator has no factor in common with the denominator, so this is the final answer.`,
      ],
      rule: 3,
      skill: 'adding with like denominators',
      check: () => checkSame((x) => (a * x) / (x + p) + b / (x + p), (x) => (a * x + b) / (x + p)),
    });
  }
  const a = rng.int(1, 9);
  const s = rng.sign();
  const b = rng.intExcept(1, 9, s < 0 ? [a] : []);
  const total = a + s * b;
  const opt = (n, dTex, df, why) => ({ tex: over(n, dTex), f: (x) => n / df(x), why });
  return q({
    prompt: R`${s > 0 ? 'Add' : 'Subtract'}: \(\;${DF(a, den)} ${s > 0 ? '+' : '-'} ${DF(b, den)}\)`,
    ...symChoices(opt(total, den, (x) => x + p), [
      opt(total, linear(2, 2 * p), (x) => 2 * x + 2 * p, R`The denominator does not change when the denominators are equal, just as \(\frac{1}{7} + \frac{2}{7} = \frac{3}{7}\).`),
      opt(a * b, den, (x) => x + p, 'Combine the numerators by adding or subtracting, not multiplying.'),
      opt(a - s * b || a + 1, den, (x) => x + p),
      opt(total, `(${den})^{2}`, (x) => (x + p) ** 2),
      opt(total, lin(-p), (x) => x - p),
      opt(total + 1, den, (x) => x + p),
    ]),
    solution: [
      R`The denominators are the same, so keep \(${den}\) and ${s > 0 ? 'add' : 'subtract'} the numerators: \(${a} ${s > 0 ? '+' : '-'} ${b} = ${total}\).`,
      R`Result: \(${over(total, den)}\).`,
    ],
    rule: 3,
    skill: 'adding with like denominators',
    check: () => checkSame((x) => a / (x + p) + (s * b) / (x + p), (x) => total / (x + p)),
  });
}

// ───────────── Medium ─────────────

function mediumSimplify(rng) {
  const [p, a, b] = rng.sample(NONZERO.filter((v) => Math.abs(v) <= 7), 3);
  const top = [1, p + a, p * a];
  const bottom = [1, p + b, p * b];
  const opt = (n, d, why) => ({ tex: F(lin(n), lin(d)), f: (x) => (x + n) / (x + d), why });
  return q({
    prompt: R`Simplify: \(\;${DF(poly(top), poly(bottom))}\)`,
    ...symChoices(opt(a, b), [
      { tex: F(linear(p + a, p * a), linear(p + b, p * b)), f: (x) => ((p + a) * x + p * a) / ((p + b) * x + p * b), why: R`\(x^{2}\) is a term here, not a factor, so it cannot be cancelled. Factor the numerator and the denominator first.` },
      opt(-a, -b, R`Check the factoring by multiplying back: \((${lin(p)})(${lin(a)}) = ${poly(top)}\).`),
      opt(b, a),
      { tex: frac(a, b).tex(), f: () => a / b },
      opt(a, p),
    ]),
    solution: [
      R`Factor the numerator: \(${poly(top)} = (${lin(p)})(${lin(a)})\).`,
      R`Factor the denominator: \(${poly(bottom)} = (${lin(p)})(${lin(b)})\).`,
      R`Cancel the common factor \((${lin(p)})\): \(${F(lin(a), lin(b))}\).`,
    ],
    rule: 1,
    skill: 'simplifying',
    check: () => checkSame((x) => polyEval(top, x) / polyEval(bottom, x), (x) => (x + a) / (x + b)),
  });
}

function mediumMultiplyDivide(rng) {
  const [a, b, c, d] = rng.sample(NONZERO.filter((v) => Math.abs(v) <= 6), 4);
  const divide = rng.bool(0.5);
  const first = DF(poly([1, a + b, a * b]), poly([1, c + d, c * d]));
  const second = divide ? DF(lin(a), lin(c)) : DF(lin(c), lin(a));
  const original = (x) => (((x + a) * (x + b)) / ((x + c) * (x + d))) * ((x + c) / (x + a));
  const opt = (n, dd, why) => ({ tex: F(lin(n), lin(dd)), f: (x) => (x + n) / (x + dd), why });
  return q({
    prompt: R`${divide ? 'Divide' : 'Multiply'} and simplify: \(\;${first} ${divide ? R`\div` : R`\cdot`} ${second}\)`,
    ...symChoices(opt(b, d), [
      {
        tex: F(`(${lin(a)})^{2}(${lin(b)})`, `(${lin(c)})^{2}(${lin(d)})`),
        f: (x) => ((x + a) ** 2 * (x + b)) / ((x + c) ** 2 * (x + d)),
        why: divide ? 'To divide by a fraction, multiply by its reciprocal: flip the second fraction first.' : 'Only division flips the second fraction. For multiplication, leave it as it is.',
      },
      opt(d, b, 'The numerator and denominator have been swapped.'),
      opt(-b, -d),
      { tex: frac(b, d).tex(), f: () => b / d },
    ]),
    solution: [
      ...(divide ? [R`Dividing is multiplying by the reciprocal: \(${first} \cdot ${DF(lin(c), lin(a))}\).`] : []),
      R`Factor: \(${poly([1, a + b, a * b])} = (${lin(a)})(${lin(b)})\) and \(${poly([1, c + d, c * d])} = (${lin(c)})(${lin(d)})\).`,
      R`\(${DF(`(${lin(a)})(${lin(b)})`, `(${lin(c)})(${lin(d)})`)} \cdot ${DF(lin(c), lin(a))}\): cancel \((${lin(a)})\) and \((${lin(c)})\).`,
      R`Result: \(${F(lin(b), lin(d))}\).`,
    ],
    rule: 2,
    skill: divide ? 'dividing' : 'multiplying',
    check: () => checkSame(original, (x) => (x + b) / (x + d)),
  });
}

function mediumAddUnlike(rng) {
  const [p, r] = rng.sample(NONZERO.filter((v) => Math.abs(v) <= 6), 2);
  const a = rng.int(1, 7);
  const b = rng.int(1, 7);
  const s = rng.sign();
  const den = `(${lin(p)})(${lin(r)})`;
  const top = [a + s * b, a * r + s * b * p];
  const opt = (n, why) => ({ tex: F(linear(n[0], n[1]), den), f: (x) => (n[0] * x + n[1]) / ((x + p) * (x + r)), why });
  return q({
    prompt: R`${s > 0 ? 'Add' : 'Subtract'}: \(\;${DF(a, lin(p))} ${s > 0 ? '+' : '-'} ${DF(b, lin(r))}\)`,
    ...symChoices(opt(top), [
      { tex: over(a + s * b || 1, linear(2, p + r)), f: (x) => (a + s * b || 1) / (2 * x + p + r), why: R`Fractions are not combined by ${s > 0 ? 'adding' : 'subtracting'} the tops and adding the bottoms. They need a common denominator first.` },
      s < 0
        ? opt([a - b, a * r + b * p], R`The minus sign applies to the whole second numerator: \(-${b}(${lin(p)}) = ${linear(-b, -b * p)}\).`)
        : opt([a + b, a * p + b * r], R`Each numerator is multiplied by the factor its own denominator is missing: \(${a}\) by \((${lin(r)})\) and \(${b}\) by \((${lin(p)})\).`),
      opt([0, a + s * b || 1], 'When a denominator is multiplied by the missing factor, its numerator must be multiplied by the same factor.'),
      opt([a + s * b, a * r - s * b * p + 1]),
      opt([a - s * b, a * r + s * b * p]),
    ]),
    solution: [
      R`The LCD is \(${den}\).`,
      R`Rewrite each fraction with the LCD: \(${DF(`${a === 1 ? '' : a}(${lin(r)})`, den)} ${s > 0 ? '+' : '-'} ${DF(`${b === 1 ? '' : b}(${lin(p)})`, den)}\).`,
      R`Combine the numerators: \(${linear(a, a * r)} ${s > 0 ? '+' : '-'} (${linear(b, b * p)}) = ${linear(top[0], top[1])}\).`,
      R`Result: \(${F(linear(top[0], top[1]), den)}\).`,
    ],
    rule: 3,
    skill: 'adding with unlike denominators',
    check: () => checkSame((x) => a / (x + p) + (s * b) / (x + r), (x) => (top[0] * x + top[1]) / ((x + p) * (x + r))),
  });
}

function mediumSolveProportion(rng) {
  const x0 = rng.int(-9, 9);
  const p = rng.pick(NONZERO);
  const r = rng.pick(NONZERO.filter((v) => v !== p));
  const u = x0 + p;
  const v = x0 + r;
  if (u * v <= 0) return mediumSolveProportion(rng);
  const g = gcd(u, v);
  const m = rng.pick([1, 1, 2, 3]);
  const a = (m * Math.abs(u)) / g;
  const b = (m * Math.abs(v)) / g;
  if (a > 12 || b > 12) return mediumSolveProportion(rng);
  return q({
    prompt: R`Solve: \(\;${DF(a, lin(p))} = ${DF(b, lin(r))}\)`,
    correct: x0,
    fmt: asX,
    wrong: [
      { value: tryFrac(b * r - a * p, a - b), why: R`Cross-multiplying pairs each numerator with the **other** fraction's denominator: \(${a}(${lin(r)}) = ${b}(${lin(p)})\).` },
      { value: tryFrac(b * p + a * r, a - b), why: 'When a term moves to the other side of the equation, its sign changes.' },
      x0 === 0 ? null : -x0,
      tryFrac(b * p - a * r, a + b),
      x0 + 1,
    ],
    solution: [
      R`Cross-multiply (this multiplies both sides by the LCD): \(${a}(${lin(r)}) = ${b}(${lin(p)})\).`,
      R`Distribute: \(${linear(a, a * r)} = ${linear(b, b * p)}\).`,
      a - b === 1 ? R`Collect terms: \(x = ${x0}\).` : R`Collect terms: \(${terms([[a - b, 'x']])} = ${b * p - a * r}\), so \(x = ${x0}\).`,
      R`Check the denominators: \(${x0} ${p > 0 ? '+' : '-'} ${Math.abs(p)} = ${u}\) and \(${x0} ${r > 0 ? '+' : '-'} ${Math.abs(r)} = ${v}\). Neither is 0, so \(x = ${x0}\) is the solution.`,
    ],
    rule: 5,
    skill: 'solving rational equations',
    check: () => (Math.abs(a / (x0 + p) - b / (x0 + r)) < 1e-12 ? true : 'the value does not satisfy the equation'),
  });
}

const TOGETHER = [
  { story: (A, B, a, b) => `${A} can paint a fence in ${a} hours. ${B} can paint the same fence in ${b} hours.`, ask: 'If they work together, how long will it take to paint the fence?', unit: 'hours' },
  { story: (A, B, a, b) => `One pipe can fill a tank in ${a} hours. A second pipe can fill the same tank in ${b} hours.`, ask: 'With both pipes open, how long does it take to fill the tank?', unit: 'hours' },
  { story: (A, B, a, b) => `One printer can finish a print job in ${a} minutes. A second printer needs ${b} minutes for the same job.`, ask: 'If both printers share the job, how long will it take?', unit: 'minutes' },
  { story: (A, B, a, b) => `${A} can mow the sports field in ${a} hours. ${B} needs ${b} hours to mow it.`, ask: 'If they mow at the same time, how long will it take?', unit: 'hours' },
];

function mediumWorkRate(rng) {
  const [a, b, t] = rng.pick(WORK.filter((w) => w[1] <= 40));
  const [A, B] = people(rng, 2);
  const job = rng.pick(TOGETHER);
  const [first, second] = rng.shuffle([a, b]);
  return q({
    prompt: `${job.story(A, B, first, second)} ${job.ask}`,
    correct: t,
    unit: job.unit,
    wrong: [
      { value: frac(a + b, 2), why: `Working together must be faster than the faster one alone (${a} ${job.unit}). Add the rates, not the times.` },
      { value: a + b, why: 'Adding the times would mean that help makes the job slower. Add the rates instead.' },
      b - a,
      t + 1,
    ],
    solution: [
      R`Write each rate as the part of the job done in one ${job.unit.replace(/s$/, '')}: \(\frac{1}{${first}}\) and \(\frac{1}{${second}}\).`,
      R`Together the rates add. If the job takes \(t\) ${job.unit}: \(\frac{1}{${first}} + \frac{1}{${second}} = \frac{1}{t}\).`,
      R`\(\frac{1}{${first}} + \frac{1}{${second}} = \frac{${a + b}}{${a * b}} = \frac{1}{${t}}\), so \(t = ${t}\) ${job.unit}.`,
    ],
    rule: 6,
    skill: 'work-rate problems',
    check: () => (Math.abs(1 / a + 1 / b - 1 / t) < 1e-12 ? true : 'the rates do not add up'),
  });
}

// ───────────── Hard ─────────────

function hardAddQuadratic(rng) {
  const p = rng.int(1, 7);
  const s = rng.sign(); // the second denominator is x + s·p
  const op = rng.sign();
  const b = rng.int(1, 6);
  const cancels = rng.bool(0.3);
  // First fraction a/(x² − p²); second ± b/(x + sp). Over the LCD the numerator is a ± b(x − sp) = n1·x + n0.
  const a = cancels ? 2 * b * p * op * s : rng.pick(range(1, 9).filter((v) => v !== 2 * b * p));
  const n1 = op * b;
  const n0 = a - op * b * s * p;
  const lcd = `(${lin(-p)})(${lin(p)})`;
  const original = (x) => a / (x * x - p * p) + (op * b) / (x + s * p);
  const keep = n1 * p + n0 === 0 ? p : -n1 * p + n0 === 0 ? -p : null; // after cancelling, the denominator is x + keep
  const right = keep === null ? { tex: F(linear(n1, n0), lcd), f: (x) => (n1 * x + n0) / (x * x - p * p) } : { tex: over(n1, lin(keep)), f: (x) => n1 / (x + keep) };
  const lead = n1 === 1 ? '' : n1 === -1 ? '-' : `${n1}`;
  return q({
    prompt: R`Simplify: \(\;${a < 0 ? '-' : ''}${DF(Math.abs(a), `x^{2} - ${p * p}`)} ${op > 0 ? '+' : '-'} ${DF(b, lin(s * p))}\)`,
    ...symChoices(right, [
      { tex: over(a + op * b || 1, lcd), f: (x) => (a + op * b || 1) / (x * x - p * p), why: R`The second fraction needs the factor \((${lin(-s * p)})\) on the bottom, so its numerator must be multiplied by \((${lin(-s * p)})\) too.` },
      { tex: F(linear(n1, a + op * b * s * p), lcd), f: (x) => (n1 * x + a + op * b * s * p) / (x * x - p * p), why: R`Distribute carefully: \(${op > 0 ? '' : '-'}${b}(${lin(-s * p)}) = ${linear(op * b, -op * b * s * p)}\).` },
      keep === null ? null : { tex: over(n1, lin(-keep)), f: (x) => n1 / (x - keep), why: R`The numerator is \(${lead}(${lin(-keep)})\), so \((${lin(-keep)})\) is the factor that cancels. The factor \((${lin(keep)})\) stays in the denominator.` },
      { tex: F(linear(n1, n0), lin(s * p)), f: (x) => (n1 * x + n0) / (x + s * p) },
      { tex: F(linear(-n1, n0), lcd), f: (x) => (-n1 * x + n0) / (x * x - p * p) },
    ]),
    solution: [
      R`Factor: \(x^{2} - ${p * p} = ${lcd}\). That is the LCD.`,
      R`Rewrite the second fraction over the LCD: \(${DF(`${b}(${lin(-s * p)})`, lcd)}\).`,
      R`Combine the numerators: \(${a} ${op > 0 ? '+' : '-'} ${b}(${lin(-s * p)}) = ${linear(n1, n0)}\).`,
      keep === null
        ? R`Result: \(${right.tex}\). The numerator shares no factor with the denominator.`
        : R`The numerator is \(${lead}(${lin(-keep)})\), which cancels with the same factor in the denominator: \(${right.tex}\).`,
    ],
    rule: 3,
    skill: 'adding with unlike denominators',
    check: () => checkSame(original, right.f),
  });
}

function hardComplexFraction(rng) {
  const type = rng.pick(['sumdiff', 'squares', 'linear', 'linear', 'difference']);
  const a = rng.int(2, 9);
  let expr;
  let right;
  let wrongs;
  let original;
  let steps;
  if (type === 'sumdiff') {
    expr = DF(R`\frac{1}{x} + \frac{1}{${a}}`, R`\frac{1}{x} - \frac{1}{${a}}`);
    original = (x) => (1 / x + 1 / a) / (1 / x - 1 / a);
    right = { tex: F(`x + ${a}`, `${a} - x`), f: (x) => (x + a) / (a - x) };
    wrongs = [
      { tex: F(`x + ${a}`, `x - ${a}`), f: (x) => (x + a) / (x - a), why: R`In the denominator, \(\frac{1}{x} \cdot ${a}x = ${a}\) and \(\frac{1}{${a}} \cdot ${a}x = x\), so the result is \(${a} - x\), not \(x - ${a}\).` },
      { tex: '-1', f: () => -1, why: R`The \(\frac{1}{x}\) terms cannot be cancelled, because they are added to other terms. Multiply the top and bottom by the LCD instead.` },
      { tex: F(`${a} - x`, `x + ${a}`), f: (x) => (a - x) / (x + a) },
      { tex: F(`x - ${a}`, `x + ${a}`), f: (x) => (x - a) / (x + a) },
    ];
    steps = [
      R`The small fractions have denominators \(x\) and \(${a}\), so the LCD is \(${a}x\). Multiply the top and the bottom by \(${a}x\).`,
      R`Top: \(\left(\frac{1}{x} + \frac{1}{${a}}\right) \cdot ${a}x = ${a} + x\). Bottom: \(\left(\frac{1}{x} - \frac{1}{${a}}\right) \cdot ${a}x = ${a} - x\).`,
      R`Result: \(${right.tex}\).`,
    ];
  } else if (type === 'squares') {
    expr = DF(R`1 + \frac{${a}}{x}`, R`1 - \frac{${a * a}}{x^{2}}`);
    original = (x) => (1 + a / x) / (1 - (a * a) / (x * x));
    right = { tex: F('x', `x - ${a}`), f: (x) => x / (x - a) };
    wrongs = [
      { tex: F('x', `x + ${a}`), f: (x) => x / (x + a), why: R`\(x^{2} - ${a * a} = (x - ${a})(x + ${a})\). The factor that cancels with the numerator is \((x + ${a})\).` },
      { tex: F(`x + ${a}`, `x - ${a}`), f: (x) => (x + a) / (x - a), why: R`Multiply every term by \(x^{2}\): the top becomes \(x^{2} + ${a}x = x(x + ${a})\), not \(x + ${a}\).` },
      { tex: F(`x - ${a}`, 'x'), f: (x) => (x - a) / x },
      { tex: F('1', `x - ${a}`), f: (x) => 1 / (x - a) },
    ];
    steps = [
      R`The LCD of the small fractions is \(x^{2}\). Multiply the top and the bottom by \(x^{2}\).`,
      R`Top: \(x^{2} + ${a}x = x(x + ${a})\). Bottom: \(x^{2} - ${a * a} = (x - ${a})(x + ${a})\).`,
      R`Cancel the common factor \((x + ${a})\): \(${right.tex}\).`,
    ];
  } else if (type === 'linear') {
    let b;
    let c;
    let d;
    do {
      [b, c, d] = [rng.int(1, 6), rng.int(1, 9), rng.int(1, 6)];
    } while (a * d === b * c || (a === b && c === d));
    expr = DF(R`\frac{${a}}{x} + ${b}`, R`\frac{${c}}{x} + ${d}`);
    original = (x) => (a / x + b) / (c / x + d);
    right = { tex: F(linear(b, a), linear(d, c)), f: (x) => (b * x + a) / (d * x + c) };
    wrongs = [
      { tex: F(linear(a, b), linear(c, d)), f: (x) => (a * x + b) / (c * x + d), why: R`Multiplying by \(x\) clears the small fractions: \(\frac{${a}}{x} \cdot x = ${a}\). The whole numbers pick up the \(x\): \(${b}\) becomes \(${terms([[b, 'x']])}\).` },
      { tex: frac(a + b, c + d).tex(), f: () => (a + b) / (c + d), why: R`\(\frac{${a}}{x}\) and \(${b}\) are not like terms, and the \(x\)'s cannot simply be dropped.` },
      { tex: F(linear(d, c), linear(b, a)), f: (x) => (d * x + c) / (b * x + a) },
      { tex: frac(a, c).tex(), f: () => a / c },
    ];
    steps = [
      R`The only small denominator is \(x\). Multiply the top and the bottom by \(x\).`,
      R`Top: \(\left(\frac{${a}}{x} + ${b}\right) \cdot x = ${terms([[a, ''], [b, 'x']])}\). Bottom: \(\left(\frac{${c}}{x} + ${d}\right) \cdot x = ${terms([[c, ''], [d, 'x']])}\).`,
      R`Result: \(${right.tex}\).`,
    ];
  } else {
    expr = DF(R`\frac{1}{x} - \frac{1}{${a}}`, `x - ${a}`);
    original = (x) => (1 / x - 1 / a) / (x - a);
    right = { tex: `-${F(1, `${a}x`)}`, f: (x) => -1 / (a * x) };
    wrongs = [
      { tex: F(1, `${a}x`), f: (x) => 1 / (a * x), why: R`The top simplifies to \(\frac{${a} - x}{${a}x}\), and \(${a} - x = -(x - ${a})\). That leaves a factor of \(-1\).` },
      { tex: `-${a}x`, f: (x) => -a * x, why: R`After cancelling \((x - ${a})\), the \(${a}x\) is still in the denominator.` },
      { tex: F(1, `${a} - x`), f: (x) => 1 / (a - x) },
      { tex: `-${F(1, `x - ${a}`)}`, f: (x) => -1 / (x - a) },
    ];
    steps = [
      R`Combine the top into one fraction: \(\frac{1}{x} - \frac{1}{${a}} = \frac{${a} - x}{${a}x}\).`,
      R`Dividing by \(x - ${a}\) is multiplying by \(\frac{1}{x - ${a}}\): \(\frac{${a} - x}{${a}x(x - ${a})}\).`,
      R`Since \(${a} - x = -(x - ${a})\), the factor \((x - ${a})\) cancels and leaves \(-\frac{1}{${a}x}\).`,
    ];
  }
  const xs = [0.37, 1.29, 2.23].filter((x) => Math.abs(x - a) > 0.05);
  return q({
    prompt: R`Simplify the complex fraction: \(\;${expr}\)`,
    ...symChoices(right, wrongs, xs),
    solution: steps,
    rule: 4,
    skill: 'complex fractions',
    check: () => checkSame(original, right.f, xs),
  });
}

function hardSolveExtraneous(rng) {
  const [a, b] = rng.sample(NONZERO.filter((v) => Math.abs(v) <= 5), 2);
  const ext = rng.bool(0.6);
  const free = NONZERO.filter((v) => Math.abs(v) <= 7 && v !== a && v !== b);
  const [r1, r2] = ext ? [a, rng.pick(free)] : rng.sample(free, 2);
  const k = r1 + r2 - b;
  const m = k * a - r1 * r2;
  if (k === 0 || m === 0 || Math.abs(k) > 9) return hardSolveExtraneous(rng);
  const den = [1, -(a + b), a * b];
  const lhs = (x) => x / (x - a) - k / (x - b);
  const rhs = (x) => m / polyEval(den, x);
  const eq = R`${DF('x', lin(-a))} ${k > 0 ? '-' : '+'} ${DF(Math.abs(k), lin(-b))} = ${m < 0 ? '-' : ''}${DF(Math.abs(m), poly(den))}`;
  const X = (vals) => M(rootsTex(vals));
  const good = ext ? [r2] : [r1, r2];
  return q({
    prompt: R`Solve: \(\;${eq}\)`,
    correct: X(good),
    wrong: ext
      ? [
        { value: X([r1, r2]), why: R`\(x = ${a}\) makes the denominator \(${lin(-a)}\) equal to 0, so it is an extraneous solution and must be rejected.` },
        { value: X([a]), why: R`\(x = ${a}\) is the extraneous one: it makes a denominator 0. The other value is the solution.` },
        'No solution',
        X([-r2]),
        X([r2 + 1]),
      ]
      : [
        { value: X([r1]), why: R`Both values keep every denominator nonzero, so both are solutions. Only \(x = ${a}\) and \(x = ${b}\) would have to be rejected.` },
        X([r2]),
        { value: 'No solution', why: 'A solution is extraneous only if it makes a denominator 0. Neither of these does.' },
        X([-r1, -r2]),
      ],
    solution: [
      R`Factor the last denominator: \(${poly(den)} = (${lin(-a)})(${lin(-b)})\). That is the LCD, and \(x\) cannot be \(${a}\) or \(${b}\).`,
      R`Multiply every term by the LCD: \(x(${lin(-b)}) ${k > 0 ? '-' : '+'} ${Math.abs(k)}(${lin(-a)}) = ${m}\).`,
      R`Expand and collect: \(${poly([1, -(r1 + r2), r1 * r2])} = 0\), which factors as \((${lin(-r1)})(${lin(-r2)}) = 0\).`,
      ext
        ? R`So \(x = ${r1}\) or \(x = ${r2}\). But \(x = ${r1}\) makes a denominator 0, so it is extraneous. The only solution is \(x = ${r2}\).`
        : R`So \(x = ${r1}\) or \(x = ${r2}\). Neither makes a denominator 0, so both are solutions.`,
    ],
    rule: 5,
    skill: 'extraneous solutions',
    check: () => {
      for (const x of good) if (Math.abs(lhs(x) - rhs(x)) > 1e-9) return `x = ${x} does not satisfy the equation`;
      return !ext || polyEval(den, r1) === 0 ? true : 'the rejected value is not extraneous';
    },
  });
}

function hardSameTime(rng) {
  const plane = rng.bool(0.4);
  const c = plane ? 10 * rng.int(2, 6) : rng.int(2, 6);
  const v = plane ? 10 * rng.int(15, 45) : c + rng.int(4, 18);
  const t = plane ? rng.pick([2, 3, 4]) : rng.pick([1, 2, 3, 4]);
  const d1 = t * (v + c);
  const d2 = t * (v - c);
  const unit = plane ? 'mph' : 'km/h';
  return q({
    prompt: plane
      ? `A plane flies ${d1} miles with the wind in the same time that it flies ${d2} miles against the wind. The wind blows at ${c} mph. What is the speed of the plane in still air?`
      : `A boat travels ${d1} km downstream in the same time that it travels ${d2} km upstream. The current flows at ${c} km/h. What is the speed of the boat in still water?`,
    correct: v,
    unit,
    wrong: [
      { value: v + c, why: `That is the speed ${plane ? 'with the wind' : 'downstream'}. The question asks for the speed in still ${plane ? 'air' : 'water'}.` },
      { value: v - c, why: `That is the speed ${plane ? 'against the wind' : 'upstream'}. The question asks for the speed in still ${plane ? 'air' : 'water'}.` },
      v + 2 * c,
      v - 2 * c,
    ],
    solution: [
      R`Let \(r\) be the speed in still ${plane ? 'air' : 'water'}. The speed is \(r + ${c}\) ${plane ? 'with the wind' : 'downstream'} and \(r - ${c}\) ${plane ? 'against it' : 'upstream'}.`,
      R`Time = distance ÷ rate, and the two times are equal: \(\dfrac{${d1}}{r + ${c}} = \dfrac{${d2}}{r - ${c}}\).`,
      R`Cross-multiply: \(${d1}(r - ${c}) = ${d2}(r + ${c})\), so \(${d1 - d2}r = ${num(c * (d1 + d2))}\).`,
      R`\(r = ${v}\) ${unit}. Check: \(${d1} \div ${v + c} = ${t}\) and \(${d2} \div ${v - c} = ${t}\), so both trips take ${t} ${t === 1 ? 'hour' : 'hours'}. ✓`,
    ],
    rule: 6,
    skill: 'distance-rate problems',
    check: () => (Math.abs(d1 / (v + c) - d2 / (v - c)) < 1e-12 ? true : 'the two times are not equal'),
  });
}

// ───────────── Challenge ─────────────

function challengeWorkQuadratic(rng) {
  const [a, b, t] = rng.pick(WORK.filter((w) => w[1] <= 45));
  const d = b - a;
  const [A, B] = people(rng, 2);
  const story = rng.pick([
    `${B} takes ${d} hours longer than ${A} to paint a mural alone. Working together, they finish in ${t} hours. How long does ${A} take alone?`,
    `An old pump takes ${d} hours longer than a new pump to empty a tank. Running together, they empty it in ${t} hours. How long does the new pump take alone?`,
    `${B} needs ${d} more hours than ${A} to wire a house alone. Together they can do it in ${t} hours. How long would ${A} need alone?`,
  ]);
  const otherRoot = 2 * t - b; // the negative solution of the quadratic
  return q({
    prompt: story,
    correct: a,
    unit: 'hours',
    wrong: [
      { value: b, why: 'That is the time for the slower one. The question asks about the faster one.' },
      { value: -otherRoot, why: 'That comes from the negative solution of the quadratic. A time cannot be negative, so use the other solution.' },
      t + d,
      2 * t,
      a + 1,
    ],
    solution: [
      R`Let \(x\) be the faster time, so the slower time is \(x + ${d}\). Rates add: \(\frac{1}{x} + \frac{1}{x + ${d}} = \frac{1}{${t}}\).`,
      R`Multiply by the LCD, \(${t}x(x + ${d})\): \(${t}(x + ${d}) + ${t}x = x(x + ${d})\).`,
      R`Simplify to \(${poly([1, d - 2 * t, -t * d])} = 0\), which factors as \((x - ${a})(x + ${-otherRoot}) = 0\).`,
      R`\(x = ${a}\) or \(x = ${otherRoot}\). A time cannot be negative, so \(x = ${a}\) hours.`,
    ],
    rule: 6,
    skill: 'work-rate problems',
    check: () => (Math.abs(1 / a + 1 / (a + d) - 1 / t) < 1e-12 && otherRoot < 0 && a * a + (d - 2 * t) * a - t * d === 0 ? true : 'the equation is not satisfied'),
  });
}

function challengeAverageSpeed(rng) {
  const [r1, r2, avg] = rng.pick(SPEEDS);
  const name = person(rng);
  const [go, back] = rng.shuffle([r1, r2]);
  const place = rng.pick(['the coast', 'a lake', 'a tournament', 'the mountains']);
  return q({
    prompt: `${name} ${r2 <= 40 ? 'cycles' : 'drives'} to ${place} at an average speed of ${go} km/h and returns along the same road at ${back} km/h. What is the average speed for the whole trip?`,
    correct: avg,
    unit: 'km/h',
    wrong: [
      { value: (r1 + r2) / 2, why: 'More time is spent at the slower speed, so the average is below the midpoint. Use total distance ÷ total time.' },
      { value: avg / 2, why: 'The total distance is two one-way trips, not one.' },
      avg + 2,
      avg - 2,
      avg + 4,
    ],
    solution: [
      R`Let \(d\) be the one-way distance. Total distance: \(2d\). Total time: \(\dfrac{d}{${go}} + \dfrac{d}{${back}}\).`,
      R`Average speed = total distance ÷ total time \(= \dfrac{2d}{\frac{d}{${go}} + \frac{d}{${back}}}\). This is a complex fraction.`,
      R`Multiply the top and bottom by \(${go * back}\): \(\dfrac{${2 * go * back}d}{${back}d + ${go}d} = \dfrac{${2 * go * back}d}{${go + back}d} = ${avg}\).`,
      R`The average speed is ${avg} km/h. The distance \(d\) cancels, so it does not matter how far away the place is.`,
    ],
    rule: 4,
    skill: 'distance-rate problems',
    check: () => (Math.abs(2 / (1 / r1 + 1 / r2) - avg) < 1e-9 ? true : 'total distance ÷ total time gives a different speed'),
  });
}

function challengeNoSolution(rng) {
  const a = rng.pick(NONZERO.filter((v) => Math.abs(v) <= 8));
  const c = rng.pick([-3, -2, -1, 2, 3, 4, 5]);
  const form = rng.pick(['split', 'single', 'parallel']);
  const K = (v) => M(`k = ${num(v)}`);
  if (form === 'split') {
    return q({
      prompt: R`For which value of \(k\) does the equation \(\;${DF('x', lin(-a))} = ${DF('k', lin(-a))} ${c > 0 ? '+' : '-'} ${Math.abs(c)}\;\) have **no solution**?`,
      correct: a,
      fmt: K,
      wrong: [
        { value: -a, why: R`The excluded value is \(x = ${a}\), where \(${lin(-a)} = 0\). The equation fails when its only candidate solution is that value.` },
        { value: c * a, why: R`After clearing fractions, \(x = k ${c > 0 ? '+' : '-'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}(${lin(-a)})\). Solve for \(x\) and set it equal to the excluded value.` },
        c,
        0,
        a + c,
      ],
      solution: [
        R`Multiply both sides by \(${lin(-a)}\): \(x = k ${c > 0 ? '+' : '-'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}(${lin(-a)})\), so \(x = ${terms([[1, 'k'], [c, 'x'], [-c * a, '']])}\).`,
        R`Solve for \(x\): \(${terms([[1 - c, 'x']])} = k ${-c * a > 0 ? '+' : '-'} ${Math.abs(c * a)}\).`,
        R`There is no solution when this candidate is the excluded value \(x = ${a}\): \(${(1 - c) * a} = k ${-c * a > 0 ? '+' : '-'} ${Math.abs(c * a)}\), so \(k = ${a}\).`,
      ],
      rule: 5,
      skill: 'extraneous solutions',
      check: () => (Math.abs((a - c * a) / (1 - c) - a) < 1e-12 ? true : 'with this k the candidate solution is not the excluded value'),
    });
  }
  if (form === 'single') {
    return q({
      prompt: R`For which value of \(k\) does the equation \(\;${DF('x + k', lin(-a))} = ${c}\;\) have **no solution**?`,
      correct: -a,
      fmt: K,
      wrong: [
        { value: a, why: R`With \(k = ${a}\) the candidate solution is \(x = ${frac(a + c * a, c - 1).tex()}\), which is allowed. The equation fails only when the candidate is the excluded value \(x = ${a}\).` },
        c,
        -c * a,
        0,
        c - a,
      ],
      solution: [
        R`Multiply both sides by \(${lin(-a)}\): \(x + k = ${c}(${lin(-a)}) = ${linear(c, -c * a)}\).`,
        R`Solve for \(x\): \(k ${c * a > 0 ? '+' : '-'} ${Math.abs(c * a)} = ${terms([[c - 1, 'x']])}\).`,
        R`There is no solution when the candidate is the excluded value \(x = ${a}\): \(k ${c * a > 0 ? '+' : '-'} ${Math.abs(c * a)} = ${(c - 1) * a}\), so \(k = ${-a}\).`,
        R`Check: with \(k = ${-a}\) the left side is \(${DF(lin(-a), lin(-a))} = 1\) for every allowed \(x\), which never equals \(${c}\).`,
      ],
      rule: 5,
      skill: 'extraneous solutions',
      check: () => (Math.abs((-a + c * a) / (c - 1) - a) < 1e-12 ? true : 'with this k the candidate solution is not the excluded value'),
    });
  }
  const b = rng.pick(NONZERO.filter((v) => Math.abs(v) <= 8 && v !== a));
  const cc = Math.abs(c) === 1 ? 6 : Math.abs(c) + 1;
  return q({
    prompt: R`For which nonzero value of \(k\) does the equation \(\;${DF('k', lin(-a))} = ${DF(cc, lin(-b))}\;\) have **no solution**?`,
    correct: cc,
    fmt: K,
    wrong: [
      { value: -cc, why: R`With \(k = ${-cc}\), cross-multiplying gives \(${terms([[-2 * cc, 'x']])} = ${-cc * (a + b)}\), which has a solution.` },
      a,
      b,
      a - b,
      cc + 1,
    ],
    solution: [
      R`Cross-multiply: \(k(${lin(-b)}) = ${cc}(${lin(-a)})\).`,
      R`Distribute and collect the \(x\) terms on the left: \((k - ${cc})x = ${terms([[b, 'k'], [-cc * a, '']])}\).`,
      R`If \(k = ${cc}\), the \(x\) terms cancel and the equation says \(0 = ${cc * b - cc * a}\), which is false. So there is no solution when \(k = ${cc}\).`,
    ],
    rule: 5,
    skill: 'extraneous solutions',
    check: () => (cc * b - cc * a !== 0 ? true : 'the equation would be true for every x'),
  });
}

function challengeThreeTerms(rng) {
  const p = rng.int(1, 6);
  const a = rng.int(1, 6);
  const b = rng.pick(NONZERO.filter((v) => Math.abs(v) <= 6 && v !== -a));
  const keepPlus = rng.bool(0.5); // which factor survives in the denominator: (x + p) or (x − p)
  // a/(x − p) + b/(x + p) + c/(x² − p²) has numerator (a + b)x + (a − b)p + c.
  const c = keepPlus ? -2 * a * p : 2 * b * p;
  const total = a + b;
  const original = (x) => a / (x - p) + b / (x + p) + c / (x * x - p * p);
  const lcd = `(${lin(-p)})(${lin(p)})`;
  const right = { tex: over(total, lin(keepPlus ? p : -p)), f: (x) => total / (x + (keepPlus ? p : -p)) };
  return q({
    prompt: R`Simplify: \(\;${DF(a, lin(-p))} ${b > 0 ? '+' : '-'} ${DF(Math.abs(b), lin(p))} ${c > 0 ? '+' : '-'} ${DF(Math.abs(c), `x^{2} - ${p * p}`)}\)`,
    ...symChoices(right, [
      { tex: over(total, lin(keepPlus ? -p : p)), f: (x) => total / (x + (keepPlus ? -p : p)), why: R`The combined numerator is \(${total === 1 ? '' : total === -1 ? '-' : total}(${lin(keepPlus ? -p : p)})\), so the factor that cancels is \((${lin(keepPlus ? -p : p)})\). The other factor stays in the denominator.` },
      { tex: over(a + b + c || 1, lcd), f: (x) => (a + b + c || 1) / (x * x - p * p), why: 'Before adding, the first two numerators must be multiplied by the factors their denominators are missing.' },
      { tex: F(terms([[total, 'x']]), lcd), f: (x) => (total * x) / (x * x - p * p) },
      { tex: F(linear(total, (a - b) * p - c), lcd), f: (x) => (total * x + (a - b) * p - c) / (x * x - p * p) },
    ]),
    solution: [
      R`\(x^{2} - ${p * p} = ${lcd}\), so that is the LCD.`,
      R`Write every fraction over the LCD and combine the numerators: \(${a === 1 ? '' : a}(${lin(p)}) ${b > 0 ? '+' : '-'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}(${lin(-p)}) ${c > 0 ? '+' : '-'} ${Math.abs(c)} = ${linear(total, (a - b) * p + c)}\).`,
      R`Factor the numerator: \(${linear(total, (a - b) * p + c)} = ${total === 1 ? '' : total === -1 ? '-' : total}(${lin(keepPlus ? -p : p)})\).`,
      R`Cancel \((${lin(keepPlus ? -p : p)})\): \(${right.tex}\).`,
    ],
    rule: 3,
    skill: 'adding with unlike denominators',
    check: () => checkSame(original, right.f),
  });
}

// ───────────── Models ─────────────

// "x + 3", "x − 3" or "x" in plain text, for picture descriptions.
const plainLin = (c) => (c === 0 ? 'x' : `x ${c > 0 ? '+' : '−'} ${Math.abs(c)}`);

function addModel({ a, p, b, r, op }) {
  const s = op === 'add' ? 1 : -1;
  const sign = s > 0 ? '+' : '-';
  const second = b < 0 ? `\\left(${over(b, lin(r))}\\right)` : over(b, lin(r));
  const problem = R`\(${over(a, lin(p))} ${sign} ${second}\)`;
  if (a === 0 && b === 0) return { problem, steps: ['Both numerators are 0, so both fractions are 0.'], answer: R`\(0\)` };
  if (a === 0) return { problem, steps: [`The first fraction is 0, so only the second one is left${s < 0 ? ', with its sign changed by the subtraction' : ''}.`, R`The expression is not defined at \(x = ${-p}\)${p === r ? '' : R` and \(x = ${-r}\)`}.`], answer: M(over(s * b, lin(r))) };
  if (b === 0) return { problem, steps: ['The second fraction is 0, so only the first one is left.', R`The expression is not defined at \(x = ${-p}\)${p === r ? '' : R` and \(x = ${-r}\)`}.`], answer: M(over(a, lin(p))) };
  if (p === r) {
    const total = a + s * b;
    return {
      problem,
      steps: [
        R`The denominators are already the same, so keep \(${lin(p)}\) and ${s > 0 ? 'add' : 'subtract'} the numerators: \(${a} ${sign} ${paren(b)} = ${total}\).`,
        R`The expression is not defined at \(x = ${-p}\).`,
      ],
      answer: total === 0 ? R`\(0\)` : M(over(total, lin(p))),
    };
  }
  const den = `(${lin(p)})(${lin(r)})`;
  const top = [a + s * b, a * r + s * b * p];
  return {
    problem,
    steps: [
      R`The denominators are different. The LCD is their product, \(${den}\).`,
      R`Multiply each fraction, top and bottom, by the factor its denominator is missing. The numerators become \(${terms([[a, `(${lin(r)})`]])}\) and \(${terms([[b, `(${lin(p)})`]])}\).`,
      R`Expanded, these are \(${linear(a, a * r)}\) and \(${linear(b, b * p)}\).`,
      R`${s > 0 ? 'Add the numerators' : 'Subtract the numerators (the minus sign applies to both terms)'}: \((${linear(a, a * r)}) ${sign} (${linear(b, b * p)}) = ${linear(top[0], top[1])}\).`,
      R`The expression is not defined at \(x = ${-p}\) and \(x = ${-r}\).`,
    ],
    answer: M(top[0] === 0 ? over(top[1], den) : F(linear(top[0], top[1]), den)),
  };
}

function solveModel({ a, b, k }) {
  const problem = R`\(${DF(lin(a), lin(b))} = ${k}\)`;
  const f = (x) => (x + a) / (x + b);
  const plot = (sol) => {
    const mid = sol == null ? -b : (sol - b) / 2;
    const half = Math.max(5, sol == null ? 5 : Math.abs(sol + b) / 2 + 3);
    return {
      type: 'plot',
      x: [mid - half, mid + half],
      y: [Math.min(-4, k - 2), Math.max(6, k + 2)],
      fns: [{ f }],
      hlines: [{ y: k }],
      vlines: [{ x: -b }],
      points: sol == null ? [] : [{ x: sol, y: k, label: `x = ${txt(sol, { places: 2 })}`, color: 'b' }],
      alt: `Graph of y = (${plainLin(a)})/(${plainLin(b)}), with a dashed vertical line at the excluded value x = ${txt(-b)} and a dashed horizontal line at y = ${txt(k)}. ${sol == null ? 'The curve never meets the horizontal line.' : `The curve meets the horizontal line at x = ${txt(sol, { places: 2 })}.`}`,
    };
  };
  if (a === b) {
    return {
      problem,
      steps: [
        R`The numerator and the denominator are the same, so the left side equals 1 for every \(x\) except the excluded value \(x = ${-b}\).`,
        k === 1 ? 'The equation says 1 = 1, which is always true.' : R`The equation would need \(1 = ${k}\), which is never true.`,
      ],
      answer: k === 1 ? R`Every real number except \(x = ${-b}\)` : 'No solution',
    };
  }
  const steps = [R`The denominator is 0 at \(x = ${-b}\), so that value is excluded.`, k === 1 ? R`Multiply both sides by \(${lin(b)}\): \(${lin(a)} = ${lin(b)}\).` : R`Multiply both sides by \(${lin(b)}\): \(${lin(a)} = ${k}(${lin(b)})\), which is \(${lin(a)} = ${linear(k, k * b)}\).`];
  if (k === 1) {
    steps.push(R`Subtract \(x\) from both sides: \(${a} = ${b}\). That is false, so no value of \(x\) works. On the graph, the curve gets close to the line \(y = 1\) but never reaches it.`);
    return { problem, steps, answer: 'No solution', visual: plot(null) };
  }
  const sol = frac(k * b - a, 1 - k);
  steps.push(k === 0 ? R`Solve: \(x = ${sol.tex()}\).` : R`Collect the \(x\) terms: \(${terms([[1 - k, 'x']])} = ${k * b - a}\), so \(x = ${sol.tex()}\).`);
  steps.push(R`This is not the excluded value, so it is the solution. Check: the numerator is \(${sol.add(a).tex()}\) and the denominator is \(${sol.add(b).tex()}\), and \(${sol.add(a).tex()} \div ${paren(sol.add(b))} = ${k}\). ✓`);
  return { problem, steps, answer: M(`x = ${sol.tex()}`), visual: plot(sol.value) };
}

function workModel({ a, b }) {
  const t = frac(a * b, a + b);
  const mins = Math.round(t.value * 60);
  const reduced = t.d === a + b ? '' : ` = ${t.tex()}`;
  const approx = t.d === 1 ? '' : R` \approx ${num(t.value, { places: 2 })}`;
  return {
    problem: `Rosa can tile a floor in ${a} ${a === 1 ? 'hour' : 'hours'}. Sam can tile the same floor in ${b} ${b === 1 ? 'hour' : 'hours'}. How long does the job take if they work together?`,
    steps: [
      R`Write each rate as the part of the job done in one hour: \(\frac{1}{${a}}\) and \(\frac{1}{${b}}\).`,
      R`Working together, the rates add. If the job takes \(t\) hours: \(\frac{1}{${a}} + \frac{1}{${b}} = \frac{1}{t}\).`,
      R`Add the fractions over the common denominator \(${a * b}\): \(\frac{${b}}{${a * b}} + \frac{${a}}{${a * b}} = \frac{${a + b}}{${a * b}}\).`,
      R`So \(\frac{1}{t} = \frac{${a + b}}{${a * b}}\). Take the reciprocal: \(t = \frac{${a * b}}{${a + b}}${reduced}${approx}\) hours.`,
      `Sense check: the answer is less than ${Math.min(a, b)} ${Math.min(a, b) === 1 ? 'hour' : 'hours'}, the time of the faster worker alone.`,
    ],
    answer: t.d === 1 ? `${t.n} ${t.n === 1 ? 'hour' : 'hours'}` : R`\(${t.tex()}\) hours, which is about ${mins >= 60 ? `${Math.floor(mins / 60)} h ` : ''}${mins % 60} min`,
    visual: {
      type: 'table',
      headers: ['Worker', 'Time alone (h)', 'Part of the job each hour'],
      rows: [['Rosa', `${a}`, R`\(\frac{1}{${a}}\)`], ['Sam', `${b}`, R`\(\frac{1}{${b}}\)`], ['Together', R`\(${t.tex()}\)`, R`\(${frac(a + b, a * b).tex()}\)`]],
      rowHeaders: true,
      alt: `Table of work rates. Rosa: ${a} hours alone, 1/${a} of the job each hour. Sam: ${b} hours alone, 1/${b} of the job each hour. Together: ${t.text()} hours.`,
    },
  };
}

export default {
  id: 'rational-expressions',
  title: 'Rational Expressions & Equations',
  summary: 'Simplify, multiply, divide, add and subtract algebraic fractions, and solve equations that contain them.',
  standards: ['CCSS A-APR.D.6', 'CCSS A-APR.D.7', 'CCSS A-REI.A.2'],

  explain: {
    intro: R`A rational expression is a fraction whose numerator and denominator are polynomials, such as \(\dfrac{x + 1}{x - 2}\). Everything you know about numerical fractions still applies: cancel common factors, find common denominators, flip to divide. The one new habit is to watch for values of \(x\) that make a denominator 0.`,
    rules: [
      {
        title: 'Excluded values',
        text: R`A rational expression is not defined wherever its denominator equals 0. Find those values from the **original** denominator, before cancelling anything.`,
        example: R`\(\dfrac{x + 1}{x^{2} - 4}\) is not defined at \(x = 2\) and \(x = -2\).`,
      },
      {
        title: 'Simplify by cancelling common factors',
        text: R`Factor the numerator and the denominator completely, then cancel factors that appear in both. Only factors can be cancelled, never terms that are added or subtracted.`,
        example: R`\(\dfrac{x^{2} - 9}{x^{2} + 5x + 6} = \dfrac{(x - 3)(x + 3)}{(x + 2)(x + 3)} = \dfrac{x - 3}{x + 2}\).`,
      },
      {
        title: 'Multiply and divide',
        text: R`To multiply, factor everything, cancel common factors, then multiply what is left. To divide, multiply by the reciprocal of the second fraction.`,
        example: R`\(\dfrac{x + 1}{x - 2} \div \dfrac{x + 1}{3} = \dfrac{x + 1}{x - 2} \cdot \dfrac{3}{x + 1} = \dfrac{3}{x - 2}\).`,
      },
      {
        title: 'Add and subtract',
        text: R`Fractions need a common denominator before they can be added or subtracted. Use the least common denominator (LCD), rewrite each fraction with it, then combine the numerators. When subtracting, the minus sign applies to the whole second numerator.`,
        example: R`\(\dfrac{3}{x - 1} + \dfrac{2}{x + 2} = \dfrac{3(x + 2) + 2(x - 1)}{(x - 1)(x + 2)} = \dfrac{5x + 4}{(x - 1)(x + 2)}\).`,
      },
      {
        title: 'Complex fractions',
        text: R`A complex fraction has fractions inside its numerator or denominator. Multiply the top and the bottom by the LCD of all the small fractions, and they disappear in one step.`,
        example: R`\(\dfrac{1 + \frac{2}{x}}{1 - \frac{4}{x^{2}}}\): multiply top and bottom by \(x^{2}\) to get \(\dfrac{x^{2} + 2x}{x^{2} - 4} = \dfrac{x(x + 2)}{(x - 2)(x + 2)} = \dfrac{x}{x - 2}\).`,
      },
      {
        title: 'Solving rational equations',
        text: R`Multiply both sides by the LCD to clear the fractions, then solve the equation that is left. Check every answer in the original equation. A value that makes a denominator 0 is an extraneous solution and must be rejected.`,
        example: R`\(\dfrac{x}{x - 3} = \dfrac{3}{x - 3} + 2\) leads to \(x = 3\), which makes the denominators 0. So this equation has no solution.`,
      },
      {
        title: 'Rates: work and travel',
        text: R`If a job takes \(a\) hours, the rate is \(\dfrac{1}{a}\) of the job per hour. Rates of people working together add: \(\dfrac{1}{a} + \dfrac{1}{b} = \dfrac{1}{t}\). For travel, time \(= \dfrac{\text{distance}}{\text{rate}}\).`,
        example: R`One pipe fills a tank in 6 hours and another in 3 hours. Together: \(\dfrac{1}{6} + \dfrac{1}{3} = \dfrac{1}{2}\), so they take 2 hours.`,
      },
    ],
    vocab: [
      { term: 'rational expression', def: 'A fraction whose numerator and denominator are polynomials.' },
      { term: 'excluded value', def: 'A value of the variable that makes a denominator 0. The expression is not defined there.' },
      { term: 'least common denominator (LCD)', def: 'The simplest expression that every denominator divides into.' },
      { term: 'complex fraction', def: 'A fraction that has a fraction in its numerator, its denominator, or both.' },
      { term: 'extraneous solution', def: 'A value found while solving that does not satisfy the original equation, usually because it makes a denominator 0.' },
      { term: 'reciprocal', def: R`The fraction turned upside down. The reciprocal of \(\frac{a}{b}\) is \(\frac{b}{a}\).` },
    ],
    mistakes: [
      R`Cancelling terms instead of factors: \(\dfrac{x + 3}{x + 5}\) is not \(\dfrac{3}{5}\).`,
      R`Finding excluded values after simplifying. \(\dfrac{x - 2}{(x - 2)(x + 3)}\) is not defined at \(x = 2\) as well as at \(x = -3\).`,
      R`Adding the denominators: \(\dfrac{1}{x} + \dfrac{1}{3}\) is not \(\dfrac{2}{x + 3}\).`,
      R`Subtracting only the first term of a numerator: \(-(2x - 5)\) is \(-2x + 5\).`,
      'Keeping a solution that makes a denominator 0. Always check against the excluded values.',
      'Adding the times in a work problem. Add the rates instead.',
    ],
    visual: {
      type: 'plot',
      x: [-4, 8],
      y: [-6, 8],
      fns: [{ f: (x) => (x + 1) / (x - 2), label: 'y = (x + 1)/(x − 2)', labelAt: 5.6 }],
      vlines: [{ x: 2 }],
      alt: 'Graph of y = (x + 1)/(x − 2). The curve has two separate branches with a dashed vertical line between them at x = 2, the excluded value, where the function is not defined.',
    },
  },

  examples: [
    {
      title: 'Simplify and state the excluded values',
      problem: R`Simplify \(\dfrac{x^{2} - 9}{x^{2} + 5x + 6}\) and state the excluded values.`,
      steps: [
        R`Factor both parts: \(\dfrac{(x - 3)(x + 3)}{(x + 2)(x + 3)}\).`,
        R`The original denominator is 0 at \(x = -2\) and \(x = -3\). Those are the excluded values.`,
        R`Cancel the common factor \((x + 3)\).`,
      ],
      answer: R`\(\dfrac{x - 3}{x + 2}\), with \(x \neq -2\) and \(x \neq -3\)`,
    },
    {
      title: 'Divide',
      problem: R`Simplify \(\dfrac{x^{2} - 4}{x + 3} \div \dfrac{x - 2}{2x + 6}\).`,
      steps: [
        R`Multiply by the reciprocal: \(\dfrac{x^{2} - 4}{x + 3} \cdot \dfrac{2x + 6}{x - 2}\).`,
        R`Factor: \(\dfrac{(x - 2)(x + 2)}{x + 3} \cdot \dfrac{2(x + 3)}{x - 2}\).`,
        R`Cancel \((x - 2)\) and \((x + 3)\). What is left is \(2(x + 2)\).`,
      ],
      answer: R`\(2(x + 2) = 2x + 4\)`,
    },
    {
      title: 'Subtract with unlike denominators',
      problem: R`Simplify \(\dfrac{5}{x - 2} - \dfrac{3}{x + 1}\).`,
      steps: [
        R`The LCD is \((x - 2)(x + 1)\).`,
        R`Rewrite: \(\dfrac{5(x + 1)}{(x - 2)(x + 1)} - \dfrac{3(x - 2)}{(x - 2)(x + 1)}\).`,
        R`Combine the numerators, distributing the minus sign: \(5x + 5 - 3x + 6 = 2x + 11\).`,
      ],
      answer: R`\(\dfrac{2x + 11}{(x - 2)(x + 1)}\)`,
    },
    {
      title: 'An equation with an extraneous solution',
      problem: R`Solve \(\dfrac{x}{x - 2} + \dfrac{1}{x - 4} = \dfrac{2}{x^{2} - 6x + 8}\).`,
      steps: [
        R`Factor: \(x^{2} - 6x + 8 = (x - 2)(x - 4)\). The LCD is \((x - 2)(x - 4)\), and \(x\) cannot be 2 or 4.`,
        R`Multiply every term by the LCD: \(x(x - 4) + (x - 2) = 2\).`,
        R`Simplify: \(x^{2} - 3x - 4 = 0\), so \((x - 4)(x + 1) = 0\) and \(x = 4\) or \(x = -1\).`,
        R`\(x = 4\) makes a denominator 0, so it is extraneous. Check \(x = -1\): \(\dfrac{-1}{-3} + \dfrac{1}{-5} = \dfrac{2}{15}\) and \(\dfrac{2}{1 + 6 + 8} = \dfrac{2}{15}\). ✓`,
      ],
      answer: R`\(x = -1\)`,
    },
    {
      title: 'Word problem: working together',
      word: true,
      problem: 'Imani can mow a field in 4 hours. Ben needs 12 hours to mow the same field. How long does it take if they mow together?',
      steps: [
        R`Rates: Imani mows \(\frac{1}{4}\) of the field per hour and Ben mows \(\frac{1}{12}\) per hour.`,
        R`Together their rates add. If the job takes \(t\) hours: \(\frac{1}{4} + \frac{1}{12} = \frac{1}{t}\).`,
        R`\(\frac{1}{4} + \frac{1}{12} = \frac{3}{12} + \frac{1}{12} = \frac{4}{12} = \frac{1}{3}\), so \(t = 3\).`,
        'Sense check: 3 hours is less than 4 hours, Imani alone. Help should make the job faster.',
      ],
      answer: '3 hours',
    },
    {
      title: 'Word problem: a boat and a current',
      word: true,
      problem: 'A boat travels 24 km downstream in the same time it takes to travel 16 km upstream. The current flows at 2 km/h. How fast is the boat in still water?',
      steps: [
        R`Let \(r\) be the speed in still water. Downstream the speed is \(r + 2\); upstream it is \(r - 2\).`,
        R`Time = distance ÷ rate, and the times are equal: \(\dfrac{24}{r + 2} = \dfrac{16}{r - 2}\).`,
        R`Cross-multiply: \(24(r - 2) = 16(r + 2)\), so \(24r - 48 = 16r + 32\) and \(8r = 80\).`,
        R`\(r = 10\). Check: \(24 \div 12 = 2\) hours and \(16 \div 8 = 2\) hours. ✓`,
      ],
      answer: '10 km/h',
    },
  ],

  models: [
    {
      id: 'add-subtract',
      title: 'Add or subtract a/(x + p) and b/(x + q)',
      intro: 'Choose the numerators and the denominators. The steps show how the common denominator is built.',
      inputs: [
        { name: 'a', label: 'First numerator a', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'p', label: 'p in the first denominator x + p', type: 'int', min: -9, max: 9, value: -1 },
        { name: 'b', label: 'Second numerator b', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'r', label: 'q in the second denominator x + q', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'op', label: 'Operation', type: 'select', value: 'add', options: [{ value: 'add', label: 'add (+)' }, { value: 'sub', label: 'subtract (−)' }] },
      ],
      compute: addModel,
    },
    {
      id: 'solve-rational',
      title: 'Solve (x + a)/(x + b) = k',
      intro: 'Change the numbers. The graph shows the excluded value and where the curve meets the line y = k.',
      inputs: [
        { name: 'a', label: 'a in the numerator x + a', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'b', label: 'b in the denominator x + b', type: 'int', min: -9, max: 9, value: -2 },
        { name: 'k', label: 'k (right-hand side)', type: 'int', min: -9, max: 9, value: 2 },
      ],
      compute: solveModel,
    },
    {
      id: 'working-together',
      title: 'Word problem: working together',
      word: true,
      intro: 'Change how long each person takes alone.',
      inputs: [
        { name: 'a', label: 'Hours Rosa takes alone', type: 'int', min: 2, max: 60, value: 6 },
        { name: 'b', label: 'Hours Sam takes alone', type: 'int', min: 2, max: 60, value: 4 },
      ],
      compute: workModel,
    },
  ],

  quiz: {
    easy: [easyExcluded, easySimplifyFactored, easyMultiplyMonomials, easyAddLike],
    medium: [mediumSimplify, mediumMultiplyDivide, mediumAddUnlike, mediumSolveProportion, mediumWorkRate],
    hard: [hardAddQuadratic, hardComplexFraction, hardSolveExtraneous, hardSameTime],
    challenge: [challengeWorkQuadratic, challengeAverageSpeed, challengeNoSolution, challengeThreeTerms],
  },
};
