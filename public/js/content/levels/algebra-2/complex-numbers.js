import { R, q, frac, terms, poly, linear, num, paren, signed, product, simplifySqrt, sqrtTex, gcd, rootsTex } from '../../lib/index.js';
import { M, cx, cmul, checkProduct, checkComplexRoot } from './_shared.js';

const C = (a, b) => M(cx(a, b));
// k·i with the 1 hidden: iTex(1) → "i", iTex(3) → "3i".
const iTex = (k) => (k === 1 ? 'i' : `${k}i`);
const I_POWERS = ['1', 'i', '-1', '-i'];
const I_VALUES = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const allOf = (...results) => results.find((r) => r !== true) ?? true;

// ───────────── Easy ─────────────

function easySqrtNegative(rng) {
  const k = rng.int(2, 12);
  const c = rng.pick([1, 1, 1, -1, 2, 3, 4, 5]);
  const n = k * k;
  const lead = c === 1 ? '' : c === -1 ? '-' : String(c);
  const ans = c * k;
  return q({
    prompt: R`Simplify \(${lead}\sqrt{-${n}}\).`,
    correct: M(`${ans}i`),
    wrong: [
      { value: M(`${-ans}`), why: R`A negative number under a square root gives an imaginary number: \(\sqrt{-${n}} = \sqrt{${n}}\cdot\sqrt{-1} = ${k}i\).` },
      { value: M(`${ans}`), why: R`The \(i\) is missing. \(\sqrt{-1} = i\), so \(\sqrt{-${n}} = ${k}i\).` },
      M(`${c * n}i`),
    ],
    solution: [
      R`Split off \(\sqrt{-1}\): \(\sqrt{-${n}} = \sqrt{${n}} \cdot \sqrt{-1}\).`,
      R`\(\sqrt{${n}} = ${k}\) and \(\sqrt{-1} = i\), so \(\sqrt{-${n}} = ${k}i\).`,
      ...(c === 1 ? [] : [R`Keep the number in front: \(${lead}\sqrt{-${n}} = ${ans}i\).`]),
    ],
    rule: 0,
    skill: 'square roots of negatives',
    check: () => checkProduct([0, k], [0, k], [-n, 0]),
  });
}

function easyPowerOfI(rng) {
  const n = rng.int(5, 99);
  const r = n % 4;
  const quo = (n - r) / 4;
  return q({
    prompt: R`Simplify \(i^{${n}}\).`,
    correct: M(I_POWERS[r]),
    wrong: [
      { value: M(I_POWERS[(r + 2) % 4]), why: R`Check the remainder: \(${n} = 4 \cdot ${quo} + ${r}\), and \(i^{${r}} = ${I_POWERS[r]}\).` },
      M(I_POWERS[(r + 1) % 4]),
      M(I_POWERS[(r + 3) % 4]),
    ],
    solution: [
      R`The powers of \(i\) repeat every four: \(i^{1} = i,\; i^{2} = -1,\; i^{3} = -i,\; i^{4} = 1\).`,
      R`Divide the exponent by 4: \(${n} = 4 \cdot ${quo} + ${r}\). The remainder is \(${r}\).`,
      r === 0 ? R`A remainder of 0 means \(i^{${n}} = (i^{4})^{${quo}} = 1\).` : R`\(i^{${n}} = (i^{4})^{${quo}} \cdot i^{${r}} = i^{${r}} = ${I_POWERS[r]}\).`,
    ],
    rule: 1,
    skill: 'powers of i',
    check: () => {
      let z = [1, 0];
      for (let k = 0; k < n; k++) z = cmul(z, [0, 1]);
      return z[0] === I_VALUES[r][0] && z[1] === I_VALUES[r][1] ? true : `i^${n} is ${z[0]} + ${z[1]}i`;
    },
  });
}

function easyAddSub(rng) {
  const [a, b, c, d] = [rng.nonzero(-9, 9), rng.nonzero(-9, 9), rng.nonzero(-9, 9), rng.nonzero(-9, 9)];
  const s = rng.sign();
  const op = s > 0 ? '+' : '-';
  const re = a + s * c;
  const im = b + s * d;
  return q({
    prompt: R`Simplify \((${cx(a, b)}) ${op} (${cx(c, d)})\).`,
    correct: C(re, im),
    wrong: [
      { value: C(re, b - s * d), why: s > 0 ? 'Add the imaginary parts the same way as the real parts.' : 'The minus sign applies to both parts of the second number.' },
      C(a - s * c, im),
      C(a - s * c, b - s * d),
    ],
    solution: [
      s > 0 ? R`Group like terms: \(${terms([[a, ''], [c, ''], [b, 'i'], [d, 'i']])}\).` : R`Distribute the minus sign, then group like terms: \(${terms([[a, ''], [-c, ''], [b, 'i'], [-d, 'i']])}\).`,
      R`Real parts: \(${a} ${op} ${paren(c)} = ${re}\). Imaginary parts: \(${b} ${op} ${paren(d)} = ${im}\).`,
      R`The result is \(${cx(re, im)}\).`,
    ],
    rule: 2,
    skill: 'adding and subtracting',
    check: () => (re - s * c === a && im - s * d === b ? true : 'undoing the operation does not give back the first number'),
  });
}

function easyImaginaryProduct(rng) {
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const b = rng.intExcept(-9, 9, [-1, 0, 1]);
  return q({
    prompt: R`Simplify \((${a}i)(${b}i)\).`,
    correct: M(`${-a * b}`),
    wrong: [
      { value: M(`${a * b}`), why: R`\(i \cdot i = i^{2} = -1\), which changes the sign.` },
      { value: M(`${a * b}i`), why: R`Two factors of \(i\) make \(i^{2} = -1\), so no \(i\) is left.` },
      M(`${-a * b}i`),
    ],
    solution: [
      R`Multiply the numbers and the \(i\)'s separately: \(${product(a, b)} \cdot i \cdot i = ${a * b}i^{2}\).`,
      R`Replace \(i^{2}\) with \(-1\): \(${product(a * b, -1)} = ${-a * b}\).`,
    ],
    rule: 0,
    skill: 'i squared',
    check: () => checkProduct([0, a], [0, b], [-a * b, 0]),
  });
}

function easyCircuit(rng) {
  const a = rng.int(2, 12);
  const c = rng.int(2, 12);
  const b = rng.nonzero(-9, 9);
  const d = rng.nonzero(-9, 9);
  const [pr, pi] = cmul([a, b], [c, d]);
  const ohms = (x, y) => `${C(x, y)} ohms`;
  return q({
    prompt: R`In an AC circuit, the impedance of each part is written as a complex number. Two parts with impedances \(${cx(a, b)}\) ohms and \(${cx(c, d)}\) ohms are connected in series, so the total impedance is their sum. What is the total impedance?`,
    correct: ohms(a + c, b + d),
    wrong: [
      { value: ohms(pr, pi), why: 'That is the product. Impedances in series are added.' },
      { value: ohms(a + c, b - d), why: 'Add the imaginary parts, keeping the sign of each.' },
      ohms(a - c, b + d),
      ohms(a + b, c + d),
    ],
    solution: [
      R`Add the real parts: \(${a} + ${c} = ${a + c}\).`,
      R`Add the imaginary parts: \(${b} + ${paren(d)} = ${b + d}\).`,
      R`Total impedance: \(${cx(a + c, b + d)}\) ohms.`,
    ],
    rule: 2,
    skill: 'adding and subtracting',
  });
}

// ───────────── Medium ─────────────

function mediumSqrtSimplify(rng) {
  const k = rng.int(2, 8);
  const m = rng.pick([2, 3, 5, 6, 7, 10, 11, 13]);
  const n = k * k * m;
  const root = R`\sqrt{${m}}`;
  return q({
    prompt: R`Simplify \(\sqrt{-${n}}\).`,
    correct: M(`${k}i${root}`),
    wrong: [
      { value: M(`${k}${root}`), why: R`The radicand is negative, so the answer needs a factor of \(i = \sqrt{-1}\).` },
      { value: M(`${k * k}i${root}`), why: R`\(${k * k}\) is the perfect-square factor. Its square root, \(${k}\), is what comes out of the radical.` },
      M(`-${k}${root}`),
    ],
    solution: [
      R`Factor out \(-1\) and the largest perfect square: \(-${n} = -1 \cdot ${k * k} \cdot ${m}\).`,
      R`\(\sqrt{-${n}} = \sqrt{-1}\cdot\sqrt{${k * k}}\cdot\sqrt{${m}} = i \cdot ${k} \cdot ${root}\).`,
      R`Write the number first, then \(i\), then the radical: \(${k}i${root}\).`,
    ],
    rule: 0,
    skill: 'square roots of negatives',
    check: () => {
      const s = simplifySqrt(n);
      return s.coef === k && s.rad === m ? true : `√${n} simplifies to ${s.coef}√${s.rad}`;
    },
  });
}

function mediumMultiply(rng) {
  const [a, b, c, d] = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const re = a * c - b * d;
  const im = a * d + b * c;
  return q({
    prompt: R`Multiply and write the answer in the form \(a + bi\): \(\;(${cx(a, b)})(${cx(c, d)})\)`,
    correct: C(re, im),
    wrong: [
      { value: C(a * c + b * d, im), why: R`\(${terms([[b * d, 'i^{2}']])}\) equals \(${-b * d}\), because \(i^{2} = -1\).` },
      { value: C(a * c, b * d), why: 'Every term of the first number multiplies every term of the second: there are four products, not two.' },
      C(re, a * d - b * c),
    ],
    solution: [
      R`Multiply each term by each term: \(${terms([[a * c, ''], [a * d, 'i'], [b * c, 'i'], [b * d, 'i^{2}']])}\).`,
      R`Replace \(i^{2}\) with \(-1\): \(${terms([[b * d, 'i^{2}']])} = ${-b * d}\).`,
      R`Combine like terms: real part \(${a * c} ${signed(-b * d)} = ${re}\), imaginary part \(${terms([[a * d, 'i'], [b * c, 'i']])} = ${cx(0, im)}\).`,
      R`The product is \(${cx(re, im)}\).`,
    ],
    rule: 3,
    skill: 'multiplying',
    check: () => checkProduct([a, b], [c, d], [re, im]),
  });
}

function mediumSquare(rng) {
  const a = rng.nonzero(-7, 7);
  const b = rng.nonzero(-7, 7);
  const re = a * a - b * b;
  const im = 2 * a * b;
  return q({
    prompt: R`Simplify \((${cx(a, b)})^{2}\).`,
    correct: C(re, im),
    wrong: [
      { value: C(re, 0), why: R`Squaring means multiplying \((${cx(a, b)})(${cx(a, b)})\). The two middle products add to \(${cx(0, im)}\).` },
      { value: C(a * a + b * b, im), why: R`\((${cx(0, b)})^{2} = ${terms([[b * b, 'i^{2}']])} = ${-b * b}\), because \(i^{2} = -1\).` },
      C(a * a + b * b, 0),
      C(re, a * b),
    ],
    solution: [
      R`Write the square as a product: \((${cx(a, b)})(${cx(a, b)})\).`,
      R`Multiply each term by each term: \(${terms([[a * a, ''], [a * b, 'i'], [a * b, 'i'], [b * b, 'i^{2}']])}\).`,
      R`Replace \(i^{2}\) with \(-1\) and combine: \(${a * a} - ${b * b} = ${re}\) and \(${terms([[a * b, 'i'], [a * b, 'i']])} = ${cx(0, im)}\).`,
      R`The result is \(${cx(re, im)}\).`,
    ],
    rule: 3,
    skill: 'multiplying',
    check: () => checkProduct([a, b], [a, b], [re, im]),
  });
}

function mediumConjugateProduct(rng) {
  const a = rng.nonzero(-9, 9);
  const b = rng.nonzero(-9, 9);
  const total = a * a + b * b;
  return q({
    prompt: R`Multiply \(${cx(a, b)}\) by its complex conjugate.`,
    correct: M(`${total}`),
    wrong: [
      { value: M(`${a * a - b * b}`), why: R`\(${terms([[-b * b, 'i^{2}']])}\) equals \(+${b * b}\), so the squares are added.` },
      { value: C(a * a - b * b, 2 * a * b), why: R`That is \((${cx(a, b)})^{2}\). The conjugate is \(${cx(a, -b)}\).` },
      C(a * a, b * b),
      C(a * a, -b * b),
    ],
    solution: [
      R`The conjugate of \(${cx(a, b)}\) is \(${cx(a, -b)}\).`,
      R`Multiply: \((${cx(a, b)})(${cx(a, -b)}) = ${terms([[a * a, ''], [-a * b, 'i'], [a * b, 'i'], [-b * b, 'i^{2}']])}\).`,
      R`The middle terms cancel and \(${terms([[-b * b, 'i^{2}']])} = ${b * b}\), leaving \(${a * a} + ${b * b} = ${total}\).`,
    ],
    rule: 4,
    skill: 'conjugates',
    check: () => checkProduct([a, b], [a, -b], [total, 0]),
  });
}

function mediumSolveSquare(rng) {
  const kind = rng.pick(['plain', 'plain', 'radical', 'shifted', 'shifted']);
  const X = (tex) => M(`x = ${tex}`);
  if (kind === 'plain') {
    const k = rng.int(2, 12);
    const n = k * k;
    return q({
      prompt: R`Solve \(x^{2} + ${n} = 0\).`,
      correct: X(R`\pm ${k}i`),
      wrong: [
        { value: X(R`\pm ${k}`), why: R`\((\pm ${k})^{2} = ${n}\), but the equation needs \(x^{2} = -${n}\). The solutions are imaginary.` },
        { value: X(`${k}i`), why: R`There are two square roots. \(-${k}i\) also works, so keep the \(\pm\).` },
        X(R`\pm ${n}i`),
      ],
      solution: [R`Isolate the square: \(x^{2} = -${n}\).`, R`Take the square root of both sides, remembering \(\pm\): \(x = \pm\sqrt{-${n}}\).`, R`\(\sqrt{-${n}} = ${k}i\), so \(x = \pm ${k}i\).`],
      rule: 5,
      skill: 'solving x² = negative',
      check: () => allOf(checkComplexRoot([1, 0, n], [0, k]), checkComplexRoot([1, 0, n], [0, -k])),
    });
  }
  if (kind === 'radical') {
    const k = rng.int(2, 5);
    const m = rng.pick([2, 3, 5, 7]);
    const n = k * k * m;
    const root = R`\sqrt{${m}}`;
    return q({
      prompt: R`Solve \(x^{2} = -${n}\).`,
      correct: X(R`\pm ${k}i${root}`),
      wrong: [
        { value: X(R`\pm ${k}${root}`), why: R`The square root of a negative number needs a factor of \(i\).` },
        { value: X(`${k}i${root}`), why: R`There are two square roots, so keep the \(\pm\).` },
        X(R`\pm ${k * k}i${root}`),
      ],
      solution: [R`Take the square root of both sides: \(x = \pm\sqrt{-${n}}\).`, R`\(\sqrt{-${n}} = i\sqrt{${n}} = i\sqrt{${k * k} \cdot ${m}} = ${k}i${root}\).`, R`So \(x = \pm ${k}i${root}\).`],
      rule: 5,
      skill: 'solving x² = negative',
      check: () => allOf(checkComplexRoot([1, 0, n], [0, k * Math.sqrt(m)]), checkComplexRoot([1, 0, n], [0, -k * Math.sqrt(m)])),
    });
  }
  const h = rng.nonzero(-9, 9);
  const k = rng.int(1, 9);
  return q({
    prompt: R`Solve \((${linear(1, -h)})^{2} = -${k * k}\).`,
    correct: X(R`${h} \pm ${iTex(k)}`),
    wrong: [
      { value: X(R`${-h} \pm ${iTex(k)}`), why: R`After taking square roots, \(${linear(1, -h)} = \pm ${iTex(k)}\). ${h > 0 ? 'Add' : 'Subtract'} \(${Math.abs(h)}\) on both sides to finish.` },
      { value: X(R`${h} \pm ${k}`), why: R`\(\sqrt{-${k * k}}\) is \(${iTex(k)}\), not \(${k}\).` },
      k > 1 ? X(R`${h} \pm ${k * k}i`) : null,
      X(R`\pm ${iTex(k)}`),
    ],
    solution: [
      R`Take the square root of both sides: \(${linear(1, -h)} = \pm\sqrt{-${k * k}} = \pm ${iTex(k)}\).`,
      R`${h > 0 ? 'Add' : 'Subtract'} \(${Math.abs(h)}\) on both sides: \(x = ${h} \pm ${iTex(k)}\).`,
    ],
    rule: 5,
    skill: 'solving x² = negative',
    check: () => allOf(checkComplexRoot([1, -2 * h, h * h + k * k], [h, k]), checkComplexRoot([1, -2 * h, h * h + k * k], [h, -k])),
  });
}

const NATURE = {
  two: 'Two different real solutions',
  one: 'One real solution (a repeated root)',
  none: 'No real solutions (two complex solutions)',
};

function mediumDiscriminant(rng) {
  const kind = rng.pick(['two', 'one', 'none', 'none']);
  let a;
  let b;
  let c;
  if (kind === 'one') {
    const p = rng.int(1, 3);
    const s = rng.nonzero(-6, 6);
    const sign = rng.sign();
    [a, b, c] = [sign * p * p, sign * 2 * p * s, sign * s * s];
  } else {
    do {
      a = rng.pick([1, 1, 2, 3, -1, -2]);
      b = rng.int(-9, 9);
      c = rng.nonzero(-9, 9);
    } while (Math.sign(b * b - 4 * a * c) !== (kind === 'two' ? 1 : -1));
  }
  const D = b * b - 4 * a * c;
  return q({
    prompt: R`Use the discriminant to decide how many real solutions \(${poly([a, b, c])} = 0\) has.`,
    correct: NATURE[kind],
    wrong: [NATURE.two, NATURE.one, NATURE.none, { value: 'No solutions of any kind', why: 'Every quadratic equation has solutions once complex numbers are allowed. A negative discriminant only rules out real ones.' }],
    solution: [
      R`Here \(a = ${a}\), \(b = ${b}\), \(c = ${c}\).`,
      R`Discriminant: \(b^{2} - 4ac = ${paren(b)}^{2} - 4${product(a, c)} = ${b * b} ${signed(-4 * a * c)} = ${D}\).`,
      D > 0 ? 'The discriminant is positive, so there are two different real solutions.' : D === 0 ? 'The discriminant is 0, so there is exactly one real solution (a repeated root).' : 'The discriminant is negative, so there are no real solutions. The two solutions are complex conjugates.',
    ],
    rule: 6,
    skill: 'discriminant',
    check: () => {
      // Independent test: compare the height of the vertex with the direction the parabola opens.
      const xv = -b / (2 * a);
      const side = Math.sign(a * (a * xv * xv + b * xv + c));
      const found = Math.abs(a * xv * xv + b * xv + c) < 1e-9 ? 'one' : side < 0 ? 'two' : 'none';
      return found === kind ? true : `vertex test says "${found}"`;
    },
  });
}

// ───────────── Hard ─────────────

function hardDivide(rng) {
  const [a, b, c, d] = [rng.nonzero(-7, 7), rng.nonzero(-7, 7), rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
  const N = c * c + d * d;
  const top = [a * c + b * d, b * c - a * d];
  const re = frac(top[0], N);
  const im = frac(top[1], N);
  return q({
    prompt: R`Divide and write the answer in the form \(a + bi\): \(\;\dfrac{${cx(a, b)}}{${cx(c, d)}}\)`,
    correct: C(re, im),
    wrong: [
      { value: C(frac(a, c), frac(b, d)), why: 'Complex numbers cannot be divided part by part. Multiply the top and bottom by the conjugate of the denominator.' },
      c * c !== d * d ? { value: C(frac(top[0], c * c - d * d), frac(top[1], c * c - d * d)), why: R`\((${cx(c, d)})(${cx(c, -d)}) = ${c * c} + ${d * d}\), because \(${terms([[-d * d, 'i^{2}']])} = +${d * d}\).` } : null,
      { value: C(frac(a * c - b * d, N), frac(a * d + b * c, N)), why: R`The top must be multiplied by the conjugate \(${cx(c, -d)}\) as well, not by \(${cx(c, d)}\).` },
      C(top[0], top[1]),
      C(re, im.neg()),
    ],
    solution: [
      R`Multiply the top and bottom by the conjugate of the denominator, \(${cx(c, -d)}\).`,
      R`Bottom: \((${cx(c, d)})(${cx(c, -d)}) = ${c * c} + ${d * d} = ${N}\).`,
      R`Top: \((${cx(a, b)})(${cx(c, -d)}) = ${terms([[a * c, ''], [-a * d, 'i'], [b * c, 'i'], [-b * d, 'i^{2}']])} = ${cx(top[0], top[1])}\).`,
      R`Divide each part by \(${N}\): \(${cx(re, im)}\).`,
    ],
    rule: 4,
    skill: 'dividing',
    check: () => checkProduct([re.value, im.value], [c, d], [a, b]),
  });
}

function hardQuadraticComplex(rng) {
  const a = rng.pick([1, 1, 1, 2]);
  // Solutions (P ± Qi)/a. With a = 2, P and Q are odd so that the coefficients are whole numbers.
  const P = a === 1 ? rng.nonzero(-6, 6) : rng.pick([-5, -3, -1, 1, 3, 5]);
  const Q = a === 1 ? rng.int(1, 6) : rng.pick([1, 3, 5]);
  const b = -2 * P;
  const c = (P * P + Q * Q) / a;
  const re = frac(P, a);
  const im = frac(Q, a);
  const pm = (r, i) => M(`x = ${num(r)} \\pm ${i.value === 1 ? '' : num(i)}i`);
  return q({
    prompt: R`Solve \(${poly([a, b, c])} = 0\).`,
    correct: pm(re, im),
    wrong: [
      { value: pm(re.neg(), im), why: R`The formula starts with \(-b\). Here \(b = ${b}\), so \(-b = ${-b}\).` },
      { value: M(`x = ${num(re)} \\pm ${num(im)}`), why: R`The discriminant is negative, so its square root is imaginary: \(\sqrt{${-4 * Q * Q}} = ${2 * Q}i\).` },
      { value: pm(re, im.mul(2)), why: R`Divide both terms of the numerator by \(2a = ${2 * a}\).` },
      pm(re.mul(2), im.mul(2)),
    ],
    solution: [
      R`Use the quadratic formula with \(a = ${a}\), \(b = ${b}\), \(c = ${c}\).`,
      R`Discriminant: \(b^{2} - 4ac = ${b * b} - ${4 * a * c} = ${-4 * Q * Q}\). It is negative, so the solutions are complex.`,
      R`\(\sqrt{${-4 * Q * Q}} = ${2 * Q}i\), so \(x = \dfrac{${-b} \pm ${2 * Q}i}{${2 * a}}\).`,
      R`Divide both terms by \(${2 * a}\): \(x = ${num(re)} \pm ${im.value === 1 ? '' : num(im)}i\).`,
    ],
    rule: 5,
    skill: 'quadratic formula',
    check: () => allOf(checkComplexRoot([a, b, c], [re.value, im.value]), checkComplexRoot([a, b, c], [re.value, -im.value])),
  });
}

function hardSqrtProduct(rng) {
  let s;
  let u;
  let v;
  do {
    s = rng.pick([1, 2, 3, 5, 6, 7]);
    u = rng.int(1, 4);
    v = rng.int(1, 4);
  } while (s * u * v === 1);
  const a = s * u * u;
  const b = s * v * v;
  const root = s * u * v;
  const both = rng.bool(0.6);
  if (both) {
    return q({
      prompt: R`Simplify \(\sqrt{-${a}} \cdot \sqrt{-${b}}\).`,
      correct: M(`${-root}`),
      wrong: [
        { value: M(`${root}`), why: R`\(\sqrt{a}\cdot\sqrt{b} = \sqrt{ab}\) only works when the radicands are not both negative. Change each root to \(i\) form first.` },
        M(`${root}i`),
        M(`${-root}i`),
      ],
      solution: [
        R`Write each factor with \(i\) first: \(\sqrt{-${a}} = i\sqrt{${a}}\) and \(\sqrt{-${b}} = i\sqrt{${b}}\).`,
        R`Multiply: \(i\sqrt{${a}} \cdot i\sqrt{${b}} = i^{2}\sqrt{${a * b}} = i^{2} \cdot ${root}\).`,
        R`Since \(i^{2} = -1\), the answer is \(${-root}\).`,
      ],
      rule: 0,
      skill: 'products of radicals',
      check: () => checkProduct([0, Math.sqrt(a)], [0, Math.sqrt(b)], [-root, 0]),
    });
  }
  return q({
    prompt: R`Simplify \(\sqrt{-${a}} \cdot \sqrt{${b}}\).`,
    correct: M(`${root}i`),
    wrong: [
      { value: M(`${root}`), why: R`Only one radicand is negative, so one factor of \(i\) remains in the answer.` },
      { value: M(`${-root}`), why: R`There is only one factor of \(i\) here, so \(i^{2}\) never appears.` },
      M(`${-root}i`),
    ],
    solution: [
      R`Write the first factor with \(i\): \(\sqrt{-${a}} = i\sqrt{${a}}\).`,
      R`Multiply: \(i\sqrt{${a}} \cdot \sqrt{${b}} = i\sqrt{${a * b}}\).`,
      R`\(\sqrt{${a * b}} = ${root}\), so the answer is \(${root}i\).`,
    ],
    rule: 0,
    skill: 'products of radicals',
    check: () => checkProduct([0, Math.sqrt(a)], [Math.sqrt(b), 0], [0, root]),
  });
}

function hardPowerSum(rng) {
  let parts;
  let re;
  let im;
  do {
    const count = rng.pick([2, 3]);
    parts = [];
    for (let k = 0; k < count; k++) parts.push({ c: rng.intExcept(-9, 9, [-1, 0, 1]), n: rng.int(2, 40) });
    re = 0;
    im = 0;
    for (const p of parts) {
      re += p.c * I_VALUES[p.n % 4][0];
      im += p.c * I_VALUES[p.n % 4][1];
    }
  } while (re === 0 || im === 0 || new Set(parts.map((p) => p.n)).size < parts.length);
  const expr = terms(parts.map((p) => [p.c, `i^{${p.n}}`]));
  return q({
    prompt: R`Simplify \(${expr}\) and write the answer in the form \(a + bi\).`,
    correct: C(re, im),
    wrong: [
      { value: C(re, -im), why: R`Check the odd powers: a remainder of 1 gives \(i\), but a remainder of 3 gives \(-i\).` },
      { value: C(-re, im), why: R`Check the even powers: a remainder of 2 gives \(-1\), but a remainder of 0 gives \(1\).` },
      C(-re, -im),
    ],
    solution: [
      ...parts.map((p) => R`\(i^{${p.n}}\): \(${p.n} = 4 \cdot ${(p.n - (p.n % 4)) / 4} + ${p.n % 4}\), so \(i^{${p.n}} = ${I_POWERS[p.n % 4]}\) and \(${terms([[p.c, `i^{${p.n}}`]])} = ${cx(p.c * I_VALUES[p.n % 4][0], p.c * I_VALUES[p.n % 4][1])}\).`),
      R`Add the results: \(${cx(re, im)}\).`,
    ],
    rule: 1,
    skill: 'powers of i',
    check: () => {
      let sum = [0, 0];
      for (const p of parts) {
        let z = [1, 0];
        for (let k = 0; k < p.n; k++) z = cmul(z, [0, 1]);
        sum = [sum[0] + p.c * z[0], sum[1] + p.c * z[1]];
      }
      return sum[0] === re && sum[1] === im ? true : `sum is ${sum[0]} + ${sum[1]}i`;
    },
  });
}

function hardCurrent(rng) {
  const I = [rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
  const Z = [rng.int(1, 5), rng.nonzero(-4, 4)];
  const V = cmul(I, Z);
  const N = Z[0] * Z[0] + Z[1] * Z[1];
  const VZ = cmul(V, Z);
  const amps = (x, y) => `${C(x, y)} amps`;
  return q({
    prompt: R`In an AC circuit, voltage, current and impedance are related by \(V = I \cdot Z\). The voltage is \(${cx(V[0], V[1])}\) volts and the impedance is \(${cx(Z[0], Z[1])}\) ohms. Find the current \(I\).`,
    correct: amps(I[0], I[1]),
    wrong: [
      { value: amps(VZ[0], VZ[1]), why: R`That multiplies \(V\) by \(Z\). Solving \(V = I \cdot Z\) for \(I\) means dividing: \(I = \dfrac{V}{Z}\).` },
      { value: amps(I[0], -I[1]), why: R`Multiply the top by the conjugate of the denominator, \(${cx(Z[0], -Z[1])}\), and watch the sign of each product.` },
      amps(V[0] - Z[0], V[1] - Z[1]),
      amps(-I[0], I[1]),
    ],
    solution: [
      R`Solve for the current: \(I = \dfrac{V}{Z} = \dfrac{${cx(V[0], V[1])}}{${cx(Z[0], Z[1])}}\).`,
      R`Multiply the top and bottom by the conjugate \(${cx(Z[0], -Z[1])}\). Bottom: \(${Z[0] * Z[0]} + ${Z[1] * Z[1]} = ${N}\).`,
      R`Top: \((${cx(V[0], V[1])})(${cx(Z[0], -Z[1])}) = ${cx(I[0] * N, I[1] * N)}\).`,
      R`Divide each part by \(${N}\): \(I = ${cx(I[0], I[1])}\) amps.`,
    ],
    rule: 4,
    skill: 'dividing',
    check: () => checkProduct(I, Z, V),
  });
}

// ───────────── Challenge ─────────────

function challengeFindQuadratic(rng) {
  const p = rng.nonzero(-6, 6);
  const qq = rng.nonzero(-6, 6);
  const c = p * p + qq * qq;
  const eq = (coefs) => M(`${poly(coefs)} = 0`);
  return q({
    prompt: R`A quadratic equation with real coefficients has \(${cx(p, qq)}\) as one solution. Which equation could it be?`,
    correct: eq([1, -2 * p, c]),
    wrong: [
      { value: eq([1, 2 * p, c]), why: R`The two solutions add to \(${2 * p}\), and the coefficient of \(x\) is the opposite of that sum.` },
      { value: eq([1, -2 * p, p * p - qq * qq]), why: R`The product of the solutions is \((${cx(p, qq)})(${cx(p, -qq)}) = ${p * p} + ${qq * qq}\), not \(${p * p} - ${qq * qq}\).` },
      eq([1, -p, c]),
      eq([1, -2 * p, -c]),
    ],
    solution: [
      R`Complex solutions of a quadratic with real coefficients come in conjugate pairs, so the other solution is \(${cx(p, -qq)}\).`,
      R`Sum of the solutions: \(${2 * p}\). Product: \((${cx(p, qq)})(${cx(p, -qq)}) = ${p * p} + ${qq * qq} = ${c}\).`,
      R`A quadratic with these solutions is \(x^{2} - (\text{sum})x + (\text{product}) = 0\), which is \(${poly([1, -2 * p, c])} = 0\).`,
    ],
    rule: 5,
    skill: 'conjugate pairs',
    check: () => allOf(checkComplexRoot([1, -2 * p, c], [p, qq]), checkComplexRoot([1, -2 * p, c], [p, -qq])),
  });
}

function challengeFindK(rng) {
  const a = rng.pick([1, 1, 2, 3]);
  const m = rng.nonzero(-5, 5);
  const b = 2 * a * m;
  const T = a * m * m; // the discriminant b² − 4ak is zero exactly when k = T
  const ask = rng.pick(['complex', 'complex', 'one', 'real']);
  const text = { complex: 'two complex (non-real) solutions', one: 'exactly one real solution', real: 'two different real solutions' }[ask];
  const K = (rel, v) => M(`k ${rel} ${v}`);
  const right = { complex: K('>', T), one: K('=', T), real: K('<', T) }[ask];
  const wrong = {
    complex: [{ value: K('<', T), why: 'Those values make the discriminant positive, which gives two real solutions.' }, { value: K('>', b * b), why: R`Solve \(${b * b} - ${4 * a}k < 0\) completely: divide by \(${4 * a}\).` }, K('=', T), K('>', -T)],
    one: [{ value: K('=', b * b), why: R`Set \(${b * b} - ${4 * a}k = 0\) and divide by \(${4 * a}\).` }, K('=', -T), K('>', T), K('<', T)],
    real: [{ value: K('>', T), why: 'Those values make the discriminant negative, which gives complex solutions.' }, { value: K('<', b * b), why: R`Solve \(${b * b} - ${4 * a}k > 0\) completely: divide by \(${4 * a}\).` }, K('=', T), K('<', -T)],
  }[ask];
  const rel = { complex: '<', one: '=', real: '>' }[ask];
  return q({
    prompt: R`For which values of \(k\) does \(${terms([[a, 'x^{2}'], [b, 'x']])} + k = 0\) have ${text}?`,
    correct: right,
    wrong,
    solution: [
      R`The discriminant is \(b^{2} - 4ac = ${paren(b)}^{2} - 4${product(a, 'k')} = ${b * b} - ${4 * a}k\).`,
      R`For ${text}, the discriminant must be ${ask === 'complex' ? 'negative' : ask === 'one' ? 'zero' : 'positive'}: \(${b * b} - ${4 * a}k ${rel} 0\).`,
      R`Solve for \(k\): \(${b * b} ${rel} ${4 * a}k\), so \(k ${ask === 'complex' ? '>' : ask === 'one' ? '=' : '<'} ${T}\).`,
    ],
    rule: 6,
    skill: 'discriminant',
    check: () => {
      const D = (k) => b * b - 4 * a * k;
      return D(T) === 0 && D(T + 1) < 0 && D(T - 1) > 0 ? true : 'the discriminant does not change sign at this value of k';
    },
  });
}

function challengeRealParts(rng) {
  let a;
  let b;
  let c;
  let d;
  do {
    [a, b, c, d] = [rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
  } while (a * d - b * c === 0);
  const x = rng.nonzero(-6, 6);
  const y = rng.intExcept(-6, 6, [0, x]);
  const e = a * x + c * y;
  const f = b * x + d * y;
  const XY = (u, v) => M(`x = ${u},\\; y = ${v}`);
  return q({
    prompt: R`Find the real numbers \(x\) and \(y\) for which \(\;x(${cx(a, b)}) + y(${cx(c, d)}) = ${cx(e, f)}\).`,
    correct: XY(x, y),
    wrong: [
      { value: XY(y, x), why: R`Check by substituting: \(x\) multiplies \(${cx(a, b)}\) and \(y\) multiplies \(${cx(c, d)}\).` },
      XY(-x, y),
      XY(x, -y),
      XY(-x, -y),
    ],
    solution: [
      R`Two complex numbers are equal only when their real parts match and their imaginary parts match.`,
      R`Real parts: \(${terms([[a, 'x'], [c, 'y']])} = ${e}\). Imaginary parts: \(${terms([[b, 'x'], [d, 'y']])} = ${f}\).`,
      R`Solve this system of two linear equations (by elimination or substitution): \(x = ${x}\), \(y = ${y}\).`,
      R`Check: \(${x}(${cx(a, b)}) ${y < 0 ? '-' : '+'} ${Math.abs(y)}(${cx(c, d)}) = ${cx(e, f)}\). ✓`,
    ],
    rule: 2,
    skill: 'equal complex numbers',
    check: () => (a * x + c * y === e && b * x + d * y === f ? true : 'the values do not satisfy both equations'),
  });
}

function challengeReciprocalPower(rng) {
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const n = rng.int(1, 30);
  const r = n % 4;
  const inv = (4 - r) % 4; // 1 / i^n = i^(4 − r)
  const show = (k) => M(cx(a * I_VALUES[k][0], a * I_VALUES[k][1]));
  return q({
    prompt: R`Simplify \(\dfrac{${a}}{i^{${n}}}\).`,
    correct: show(inv),
    wrong: [
      r !== inv ? { value: show(r), why: R`That is \(${a} \cdot i^{${n}}\). Here \(i^{${n}} = ${I_POWERS[r]}\) is in the denominator, so divide by it instead of multiplying.` } : null,
      show((inv + 2) % 4),
      show((inv + 1) % 4),
      show((inv + 3) % 4),
    ],
    solution: [
      R`Simplify the power first: \(${n} = 4 \cdot ${(n - r) / 4} + ${r}\), so \(i^{${n}} = ${I_POWERS[r]}\).`,
      r % 2 === 0
        ? R`Divide: \(\dfrac{${a}}{${I_POWERS[r]}} = ${a * I_VALUES[inv][0]}\).`
        : R`Clear the \(i\) from the denominator by multiplying the top and bottom by \(i\): \(\dfrac{${a}}{${I_POWERS[r]}} \cdot \dfrac{i}{i} = \dfrac{${a}i}{${r === 1 ? 'i^{2}' : '-i^{2}'}} = \dfrac{${a}i}{${r === 1 ? '-1' : '1'}} = ${cx(0, a * I_VALUES[inv][1])}\).`,
    ],
    rule: 1,
    skill: 'powers of i',
    check: () => {
      let z = [1, 0];
      for (let k = 0; k < n; k++) z = cmul(z, [0, 1]);
      return checkProduct([a * I_VALUES[inv][0], a * I_VALUES[inv][1]], z, [a, 0]);
    },
  });
}

const REACH = {
  twice: 'Twice: once on the way up and once on the way down',
  once: 'Exactly once, at the top of its flight',
  never: 'Never: the equation has no real solutions',
};

function challengeReach(rng) {
  const v = 8 * rng.int(4, 12);
  const h0 = rng.pick([0, 3, 4, 5, 6]);
  const rise = (v / 8) ** 2; // the ball climbs v²/64 feet above its starting height
  const kind = rng.pick(['twice', 'once', 'never', 'never']);
  const H = h0 + rise + (kind === 'twice' ? -rng.int(2, Math.min(rise - 2, 40)) : kind === 'never' ? rng.int(1, 30) : 0);
  const D = v * v - 64 * (H - h0);
  return q({
    prompt: R`A ball is thrown upward at ${v} ft/s from ${h0 === 0 ? 'ground level' : `${h0} ft above the ground`}. Its height after \(t\) seconds is \(h(t) = ${terms([[-16, 't^{2}'], [v, 't'], [h0, '']])}\) feet. How many times is the ball exactly ${H} ft above the ground?`,
    correct: REACH[kind],
    wrong: [REACH.twice, REACH.once, REACH.never, 'Three times'],
    solution: [
      R`Set the height equal to \(${H}\): \(${terms([[-16, 't^{2}'], [v, 't'], [h0, '']])} = ${H}\), which rearranges to \(${terms([[16, 't^{2}'], [-v, 't'], [H - h0, '']])} = 0\).`,
      R`Discriminant: \((${-v})^{2} - 4${product(16, H - h0)} = ${v * v} - ${64 * (H - h0)} = ${D}\).`,
      D > 0
        ? 'The discriminant is positive, so there are two real times: one while the ball rises and one while it falls.'
        : D === 0
          ? 'The discriminant is 0, so there is exactly one real time: the ball just reaches this height at the top of its flight.'
          : 'The discriminant is negative, so the solutions are complex numbers, which cannot be times. The ball never gets that high.',
    ],
    rule: 6,
    skill: 'discriminant in context',
    check: () => {
      // Independent test: compare the target with the greatest height, reached at t = v/32.
      const tTop = v / 32;
      const peak = -16 * tTop * tTop + v * tTop + h0;
      const found = Math.abs(peak - H) < 1e-9 ? 'once' : H < peak ? 'twice' : 'never';
      return found === kind && H > h0 ? true : `peak height ${peak} says "${found}"`;
    },
  });
}

// ───────────── Models ─────────────

// (p ± k√m) / den, or (p ± k·i·√m) / den when imag is true, written in lowest terms. k > 0, m square-free.
function pmTex(p, k, m, den, imag) {
  if (den < 0) {
    den = -den;
    p = -p;
  }
  const g = gcd(gcd(p, k), den);
  p /= g;
  k /= g;
  den /= g;
  if (imag && m === 1) {
    const re = frac(p, den);
    const im = frac(k, den);
    return `${re.n === 0 ? '' : `${re.tex()} `}\\pm ${im.value === 1 ? '' : im.tex()}i`;
  }
  const body = `${k === 1 ? '' : k}${imag ? 'i' : ''}\\sqrt{${m}}`;
  if (den === 1) return `${p === 0 ? '' : `${p} `}\\pm ${body}`;
  return p === 0 ? `\\pm \\frac{${body}}{${den}}` : `\\frac{${p} \\pm ${body}}{${den}}`;
}

const OPS = { add: '+', sub: '-', mul: R`\cdot`, div: R`\div` };

function arithmeticModel({ a, b, c, d, op }) {
  const problem = R`\((${cx(a, b)}) ${OPS[op]} (${cx(c, d)})\)`;
  if (op === 'add' || op === 'sub') {
    const s = op === 'add' ? 1 : -1;
    const re = a + s * c;
    const im = b + s * d;
    return {
      problem,
      steps: [
        op === 'sub' ? 'Subtract the real parts and the imaginary parts separately. The minus sign applies to both parts of the second number.' : 'Add the real parts and the imaginary parts separately.',
        R`Real parts: \(${a} ${OPS[op]} ${paren(c)} = ${re}\).`,
        R`Imaginary parts: \(${b} ${OPS[op]} ${paren(d)} = ${im}\).`,
      ],
      answer: C(re, im),
    };
  }
  if (op === 'mul') {
    const [re, im] = cmul([a, b], [c, d]);
    return {
      problem,
      steps: [
        R`Multiply each term of the first number by each term of the second: \(${terms([[a * c, ''], [a * d, 'i'], [b * c, 'i'], [b * d, 'i^{2}']])}\).`,
        R`Replace \(i^{2}\) with \(-1\), so the \(i^{2}\) term becomes \(${-b * d}\).`,
        R`Real part: \(${a * c} ${signed(-b * d)} = ${re}\). Imaginary part: \(${a * d} ${signed(b * c)} = ${im}\).`,
      ],
      answer: C(re, im),
    };
  }
  const N = c * c + d * d;
  if (N === 0) return { error: 'The second number is 0, and division by 0 is not possible. Change c or d.' };
  const top = [a * c + b * d, b * c - a * d];
  const answer = C(frac(top[0], N), frac(top[1], N));
  if (d === 0) return { problem, steps: [R`The denominator is the real number \(${c}\), so divide each part of the top by \(${c}\).`], answer };
  return {
    problem,
    steps: [
      R`Multiply the top and bottom by the conjugate of the denominator, \(${cx(c, -d)}\).`,
      R`Bottom: \((${cx(c, d)})(${cx(c, -d)}) = ${c * c} + ${d * d} = ${N}\). It is a real number.`,
      R`Top: \((${cx(a, b)})(${cx(c, -d)}) = ${cx(top[0], top[1])}\).`,
      R`Divide each part by \(${N}\).`,
    ],
    answer,
  };
}

function quadraticModel({ a, b, c }) {
  if (a === 0) return { error: 'With a = 0 there is no x² term, so the equation is not quadratic. Choose a different value for a.' };
  const D = b * b - 4 * a * c;
  const f = (x) => a * x * x + b * x + c;
  const xv = -b / (2 * a);
  const steps = [R`Discriminant: \(b^{2} - 4ac = ${paren(b)}^{2} - 4${product(a, c)} = ${D}\).`];
  const top = b === 0 ? '' : `${-b} `;
  let answer;
  let roots = [];
  if (D > 0) {
    const s = simplifySqrt(D);
    steps.push('The discriminant is positive, so there are two different real solutions. The graph crosses the x-axis twice.');
    if (s.rad === 1) {
      steps.push(R`Quadratic formula: \(x = \dfrac{${top}\pm \sqrt{${D}}}{${2 * a}} = \dfrac{${top}\pm ${s.coef}}{${2 * a}}\).`);
      answer = M(rootsTex([frac(-b - s.coef, 2 * a), frac(-b + s.coef, 2 * a)]));
    } else {
      steps.push(R`Quadratic formula: \(x = \dfrac{${top}\pm \sqrt{${D}}}{${2 * a}}\)${s.coef > 1 ? R`, and \(\sqrt{${D}} = ${sqrtTex(D)}\)` : ''}.`);
      answer = M(`x = ${pmTex(-b, s.coef, s.rad, 2 * a, false)}`);
    }
    roots = [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)];
  } else if (D === 0) {
    steps.push('The discriminant is 0, so there is one real solution (a repeated root). The graph touches the x-axis at its vertex.');
    steps.push(R`Quadratic formula: \(x = \dfrac{${top}\pm 0}{${2 * a}}\).`);
    answer = M(`x = ${frac(-b, 2 * a).tex()}`);
    roots = [xv];
  } else {
    const s = simplifySqrt(-D);
    const rootTex = `${s.coef === 1 ? '' : s.coef}i${s.rad > 1 ? `\\sqrt{${s.rad}}` : ''}`;
    steps.push('The discriminant is negative, so there are no real solutions. The two solutions are complex conjugates, and the graph never meets the x-axis.');
    steps.push(R`Quadratic formula: \(x = \dfrac{${top}\pm \sqrt{${D}}}{${2 * a}}\), and \(\sqrt{${D}} = ${rootTex}\).`);
    answer = M(`x = ${pmTex(-b, s.coef, s.rad, 2 * a, true)}`);
  }
  const span = Math.max(3, roots.length === 2 ? Math.abs(roots[1] - roots[0]) * 0.8 + 1.5 : 3);
  const ys = [f(xv), f(xv + span), 0];
  const pad = Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.1);
  return {
    problem: R`\(${poly([a, b, c])} = 0\)`,
    steps,
    answer,
    visual: {
      type: 'plot',
      x: [xv - span, xv + span],
      y: [Math.min(...ys) - pad, Math.max(...ys) + pad],
      fns: [{ f }],
      points: roots.map((x) => ({ x, y: 0, color: 'b' })),
      alt: `Graph of the parabola y = ${poly([a, b, c]).replace('x^{2}', 'x²').replace(/-/g, '−')}. ${D > 0 ? 'It crosses the x-axis at two points, the two real solutions.' : D === 0 ? 'It touches the x-axis at one point, the repeated real solution.' : 'It does not meet the x-axis, because the solutions are complex.'}`,
    },
  };
}

function ballModel({ v, h0, H }) {
  const h = (t) => -16 * t * t + v * t + h0;
  const land = (v + Math.sqrt(v * v + 64 * h0)) / 32;
  const peak = h(v / 32);
  const D = v * v - 64 * (H - h0);
  const steps = [
    R`Height after \(t\) seconds: \(h(t) = ${terms([[-16, 't^{2}'], [v, 't'], [h0, '']])}\). Set it equal to \(${H}\) and move everything to one side: \(${terms([[16, 't^{2}'], [-v, 't'], [H - h0, '']])} = 0\).`,
    R`Discriminant: \((${-v})^{2} - 4${product(16, H - h0)} = ${D}\).`,
  ];
  let answer;
  const times = [];
  if (D < 0) {
    steps.push('The discriminant is negative, so the only solutions are complex numbers. A time cannot be complex.');
    steps.push(R`The highest point is \(${num(peak, { places: 2 })}\) ft, which is below ${H} ft.`);
    answer = `No. The ball never reaches ${H} ft.`;
  } else if (D === 0) {
    times.push(v / 32);
    steps.push(R`The discriminant is 0, so there is exactly one time: \(t = \dfrac{${v}}{32} = ${num(v / 32, { places: 2 })}\) seconds.`);
    answer = R`Yes, just barely: at \(t = ${num(v / 32, { places: 2 })}\) s, the top of the flight.`;
  } else {
    const t1 = (v - Math.sqrt(D)) / 32;
    const t2 = (v + Math.sqrt(D)) / 32;
    steps.push(R`The discriminant is positive, so there are two real solutions: \(t = \dfrac{${v} \pm \sqrt{${D}}}{32}\), which gives \(t \approx ${num(t1, { places: 2 })}\) and \(t \approx ${num(t2, { places: 2 })}\).`);
    if (t1 < -1e-9) {
      times.push(t2);
      steps.push('A negative time is before the throw, so only the positive solution counts. The ball starts above this height and passes it once on the way down.');
      answer = R`Yes, once: at \(t \approx ${num(t2, { places: 2 })}\) s, on the way down.`;
    } else {
      times.push(t1, t2);
      answer = R`Yes, twice: at \(t \approx ${num(t1, { places: 2 })}\) s and \(t \approx ${num(t2, { places: 2 })}\) s.`;
    }
  }
  return {
    problem: R`A ball is thrown upward at ${v} ft/s from a height of ${h0} ft. Does it ever reach a height of ${H} ft?`,
    steps,
    answer,
    visual: {
      type: 'plot',
      x: [0, Math.max(1, Math.ceil(land * 10) / 10)],
      y: [0, Math.max(peak, H) * 1.15 + 1],
      fns: [{ f: h }],
      hlines: [{ y: H }],
      points: times.map((t) => ({ x: t, y: H, color: 'b' })),
      axisLabels: ['t (s)', 'h (ft)'],
      alt: `Graph of the ball's height over time, a downward-opening parabola that peaks at about ${num(peak, { places: 1 })} ft, and a dashed horizontal line at ${H} ft. ${times.length ? `The curve meets the line ${times.length === 1 ? 'once' : 'twice'}.` : 'The curve stays below the line.'}`,
    },
  };
}

export default {
  id: 'complex-numbers',
  title: 'Complex Numbers',
  summary: 'Work with i and complex numbers: simplify, add, multiply and divide them, and solve quadratics whose solutions are not real.',
  standards: ['CCSS N-CN.A.1', 'CCSS N-CN.A.2', 'CCSS N-CN.A.3', 'CCSS N-CN.C.7'],

  explain: {
    intro: R`No real number has a negative square, so an equation such as \(x^{2} = -9\) has no real solution. To fix this, a new number \(i\) is defined with \(i^{2} = -1\). Numbers of the form \(a + bi\) are called complex numbers. With them, every quadratic equation has solutions.`,
    rules: [
      {
        title: 'The imaginary unit',
        text: R`\(i\) is the number with \(i^{2} = -1\), so \(i = \sqrt{-1}\). For any positive number \(a\), \(\sqrt{-a} = i\sqrt{a}\). Take out \(i\) first, then simplify the radical as usual.`,
        example: R`\(\sqrt{-25} = 5i\) and \(\sqrt{-12} = i\sqrt{4 \cdot 3} = 2i\sqrt{3}\).`,
      },
      {
        title: 'Powers of i repeat every four',
        text: R`\(i^{1} = i\), \(i^{2} = -1\), \(i^{3} = -i\), \(i^{4} = 1\), and then the pattern starts again. To simplify \(i^{n}\), divide \(n\) by 4 and use only the remainder.`,
        example: R`\(i^{23}\): \(23 = 4 \cdot 5 + 3\), so \(i^{23} = i^{3} = -i\).`,
      },
      {
        title: 'Add and subtract part by part',
        text: R`In \(a + bi\), \(a\) is the real part and \(b\) is the imaginary part. Add or subtract the real parts and the imaginary parts separately, just like combining like terms.`,
        example: R`\((3 + 2i) - (5 - 4i) = 3 - 5 + 2i + 4i = -2 + 6i\).`,
      },
      {
        title: 'Multiply, then replace i²',
        text: R`Multiply complex numbers the way you multiply binomials. Wherever \(i^{2}\) appears, replace it with \(-1\), then combine like terms.`,
        example: R`\((2 + 3i)(1 - 4i) = 2 - 8i + 3i - 12i^{2} = 2 - 5i + 12 = 14 - 5i\).`,
      },
      {
        title: 'Conjugates and division',
        text: R`The conjugate of \(a + bi\) is \(a - bi\). Their product is the real number \(a^{2} + b^{2}\). To divide, multiply the top and bottom by the conjugate of the denominator, then write the result as \(a + bi\).`,
        example: R`\(\dfrac{5}{2 + i} = \dfrac{5(2 - i)}{(2 + i)(2 - i)} = \dfrac{10 - 5i}{5} = 2 - i\).`,
      },
      {
        title: 'Quadratics with complex solutions',
        text: R`The quadratic formula \(x = \dfrac{-b \pm \sqrt{b^{2} - 4ac}}{2a}\) still works when the number under the square root is negative. Write that square root with \(i\). The two solutions are conjugates of each other.`,
        example: R`\(x^{2} - 2x + 5 = 0\): \(x = \dfrac{2 \pm \sqrt{-16}}{2} = \dfrac{2 \pm 4i}{2} = 1 \pm 2i\).`,
      },
      {
        title: 'The discriminant',
        text: R`The discriminant of \(ax^{2} + bx + c = 0\) is \(b^{2} - 4ac\). Positive: two different real solutions. Zero: one real solution (a repeated root). Negative: two complex solutions, and the graph never meets the \(x\)-axis.`,
        example: R`\(x^{2} + 4x + 7 = 0\) has discriminant \(16 - 28 = -12\), so its solutions are complex.`,
      },
    ],
    vocab: [
      { term: 'imaginary unit', def: R`The number \(i\), defined by \(i^{2} = -1\).` },
      { term: 'complex number', def: R`A number \(a + bi\) where \(a\) and \(b\) are real. Every real number is also complex (with \(b = 0\)).` },
      { term: 'real part, imaginary part', def: R`In \(a + bi\), the real part is \(a\) and the imaginary part is \(b\).` },
      { term: 'complex conjugate', def: R`The conjugate of \(a + bi\) is \(a - bi\): same real part, opposite imaginary part.` },
      { term: 'discriminant', def: R`The expression \(b^{2} - 4ac\). Its sign tells how many real solutions a quadratic equation has.` },
    ],
    mistakes: [
      R`Treating \(i^{2}\) as \(+1\). It is \(-1\), so \((3i)^{2} = -9\).`,
      R`Multiplying under the radical too early: \(\sqrt{-4}\cdot\sqrt{-9}\) is \((2i)(3i) = -6\), not \(\sqrt{36} = 6\). Change to \(i\) first.`,
      R`Subtracting only the real part. In \((3 + 2i) - (5 - 4i)\) the minus sign applies to \(-4i\) as well.`,
      R`Dividing by multiplying with the denominator itself. \((2 + i)(2 + i)\) still contains \(i\); the conjugate gives \((2 + i)(2 - i) = 5\).`,
      R`Dropping the \(\pm\). The equation \(x^{2} = -9\) has two solutions, \(3i\) and \(-3i\).`,
    ],
    visual: {
      type: 'plot',
      x: [-3.5, 3.5],
      y: [-3, 7],
      fns: [
        { f: (x) => x * x - 2, label: 'positive', labelAt: 2.6 },
        { f: (x) => x * x, label: 'zero', color: 'b', labelAt: 1.6 },
        { f: (x) => x * x + 2, label: 'negative', color: 'c', labelAt: 0.3 },
      ],
      alt: 'Three parabolas labelled by the sign of the discriminant. The one with a positive discriminant crosses the x-axis twice, the one with a zero discriminant touches it once, and the one with a negative discriminant stays above the x-axis.',
    },
  },

  examples: [
    {
      title: 'Square root of a negative number',
      problem: R`Simplify \(\sqrt{-48}\).`,
      steps: [
        R`Take out \(\sqrt{-1} = i\): \(\sqrt{-48} = i\sqrt{48}\).`,
        R`Find the largest perfect square that divides 48: \(48 = 16 \cdot 3\).`,
        R`\(\sqrt{48} = 4\sqrt{3}\), so \(\sqrt{-48} = 4i\sqrt{3}\).`,
      ],
      answer: R`\(4i\sqrt{3}\)`,
    },
    {
      title: 'Multiply two complex numbers',
      problem: R`Simplify \((3 + 2i)(1 - 4i)\).`,
      steps: [
        R`Multiply each term by each term: \(3 - 12i + 2i - 8i^{2}\).`,
        R`Replace \(i^{2}\) with \(-1\): \(-8i^{2} = 8\).`,
        R`Combine like terms: \(3 + 8 = 11\) and \(-12i + 2i = -10i\).`,
      ],
      answer: R`\(11 - 10i\)`,
    },
    {
      title: 'Divide by a complex number',
      problem: R`Write \(\dfrac{2 + 3i}{1 - 2i}\) in the form \(a + bi\).`,
      steps: [
        R`The conjugate of the denominator is \(1 + 2i\). Multiply the top and bottom by it.`,
        R`Bottom: \((1 - 2i)(1 + 2i) = 1 + 4 = 5\).`,
        R`Top: \((2 + 3i)(1 + 2i) = 2 + 4i + 3i + 6i^{2} = 2 + 7i - 6 = -4 + 7i\).`,
        R`Divide each part by 5.`,
      ],
      answer: R`\(-\dfrac{4}{5} + \dfrac{7}{5}i\)`,
    },
    {
      title: 'A quadratic with complex solutions',
      problem: R`Solve \(x^{2} - 4x + 13 = 0\).`,
      steps: [
        R`Here \(a = 1\), \(b = -4\), \(c = 13\). Discriminant: \((-4)^{2} - 4(1)(13) = 16 - 52 = -36\).`,
        R`It is negative, so the solutions are complex. \(\sqrt{-36} = 6i\).`,
        R`Quadratic formula: \(x = \dfrac{4 \pm 6i}{2} = 2 \pm 3i\).`,
        R`Check with the sum and product: \((2 + 3i) + (2 - 3i) = 4\) and \((2 + 3i)(2 - 3i) = 4 + 9 = 13\). ✓`,
      ],
      answer: R`\(x = 2 + 3i\) or \(x = 2 - 3i\)`,
      visual: {
        type: 'plot',
        x: [-2, 6],
        y: [-4, 30],
        fns: [{ f: (x) => x * x - 4 * x + 13, label: 'y = x² − 4x + 13' }],
        points: [{ x: 2, y: 9, label: 'lowest point (2, 9)' }],
        alt: 'Graph of y = x² − 4x + 13, a parabola opening upward with its lowest point at (2, 9). It never touches the x-axis, which matches the complex solutions.',
      },
    },
    {
      title: 'Word problem: will the ball reach the balcony?',
      word: true,
      problem: R`A ball is thrown upward from 5 ft at 32 ft/s, so its height after \(t\) seconds is \(h(t) = -16t^{2} + 32t + 5\) feet. A balcony rail is 30 ft above the ground. Does the ball reach it?`,
      steps: [
        R`The ball is at 30 ft when \(-16t^{2} + 32t + 5 = 30\). Move everything to one side: \(16t^{2} - 32t + 25 = 0\).`,
        R`Discriminant: \((-32)^{2} - 4(16)(25) = 1024 - 1600 = -576\).`,
        R`The discriminant is negative, so the solutions are complex: \(t = \dfrac{32 \pm 24i}{32} = 1 \pm 0.75i\). A complex number cannot be a time.`,
        R`So the ball never reaches 30 ft. Its greatest height is \(h(1) = 21\) ft.`,
      ],
      answer: 'No. The ball peaks at 21 ft, below the 30 ft rail.',
      visual: {
        type: 'plot',
        x: [0, 2.4],
        y: [0, 34],
        fns: [{ f: (t) => -16 * t * t + 32 * t + 5 }],
        hlines: [{ y: 30 }],
        points: [{ x: 1, y: 21, label: 'top: 21 ft' }],
        axisLabels: ['t (s)', 'h (ft)'],
        alt: 'Graph of the height of the ball over time. The curve rises to 21 feet at 1 second and falls again, staying below a dashed horizontal line at 30 feet.',
      },
    },
  ],

  models: [
    {
      id: 'complex-arithmetic',
      title: 'Add, subtract, multiply or divide (a + bi) and (c + di)',
      intro: 'Choose two complex numbers and an operation.',
      inputs: [
        { name: 'a', label: 'a (real part of the first number)', type: 'int', min: -12, max: 12, value: 3 },
        { name: 'b', label: 'b (imaginary part of the first number)', type: 'int', min: -12, max: 12, value: 2 },
        { name: 'c', label: 'c (real part of the second number)', type: 'int', min: -12, max: 12, value: 1 },
        { name: 'd', label: 'd (imaginary part of the second number)', type: 'int', min: -12, max: 12, value: -4 },
        { name: 'op', label: 'Operation', type: 'select', value: 'mul', options: [{ value: 'add', label: 'add (+)' }, { value: 'sub', label: 'subtract (−)' }, { value: 'mul', label: 'multiply (×)' }, { value: 'div', label: 'divide (÷)' }] },
      ],
      compute: arithmeticModel,
    },
    {
      id: 'quadratic-solutions',
      title: 'Discriminant and solutions of ax² + bx + c = 0',
      intro: 'Change the coefficients and watch the discriminant, the solutions and the graph.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'b', label: 'b (coefficient of x)', type: 'int', min: -20, max: 20, value: -4 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -30, max: 30, value: 13 },
      ],
      compute: quadraticModel,
    },
    {
      id: 'ball-height',
      title: 'Word problem: does the ball reach that height?',
      word: true,
      intro: 'Change the throw and the target height. The discriminant decides the answer.',
      inputs: [
        { name: 'v', label: 'Launch speed (ft/s)', type: 'int', min: 8, max: 160, value: 64 },
        { name: 'h0', label: 'Starting height (ft)', type: 'int', min: 0, max: 50, value: 5 },
        { name: 'H', label: 'Target height (ft)', type: 'int', min: 1, max: 400, value: 80 },
      ],
      compute: ballModel,
    },
  ],

  quiz: {
    easy: [easySqrtNegative, easyPowerOfI, easyAddSub, easyImaginaryProduct, easyCircuit],
    medium: [mediumSqrtSimplify, mediumMultiply, mediumSquare, mediumConjugateProduct, mediumSolveSquare, mediumDiscriminant],
    hard: [hardDivide, hardQuadraticComplex, hardSqrtProduct, hardPowerSum, hardCurrent],
    challenge: [challengeFindQuadratic, challengeFindK, challengeRealParts, challengeReciprocalPower, challengeReach],
  },
};
