import { R, q, frac, terms, linear, poly, factor, num, txt, round, texFrac, simplifySqrt, isSquare, gcd, rootsTex, person } from '../../lib/index.js';
import { M, symChoices, radForm } from './_shared.js';

// ───────────── Helpers ─────────────

const rootTex = (index, inside) => (index === 2 ? `\\sqrt{${inside}}` : `\\sqrt[${index}]{${inside}}`);
const asX = (v) => M(`x = ${num(v)}`);
// A constant choice for symChoices: its LaTeX and its value.
const K = (tex, value, why) => ({ tex, f: () => value, why });
const R2 = (p, qq, c, r = 1, why) => { const v = radForm(p, qq, c, r); return K(v.tex, v.value, why); };
// Real value of x^(m/n), allowing a negative x when n is odd.
const ratPow = (x, m, n) => (x < 0 && n % 2 === 1 ? -((-x) ** (1 / n)) : x ** (1 / n)) ** m;

// ───────────── Easy ─────────────

function easyNthRoot(rng) {
  const index = rng.pick([2, 2, 3, 3, 4, 5]);
  const base = index === 2 ? rng.int(4, 15) : index === 3 ? rng.intExcept(-6, 6, [-1, 0, 1]) : index === 4 ? rng.int(2, 5) : rng.pick([-3, -2, 2, 3]);
  const a = base ** index;
  return q({
    prompt: R`Evaluate \(${rootTex(index, a)}\).`,
    correct: base,
    wrong: [
      Number.isInteger(a / index) ? { value: a / index, why: R`A root is not division. Look for the number whose ${index === 2 ? 'square' : index === 3 ? 'cube' : `${index}th power`} is \(${a}\).` } : null,
      { value: -base, why: index % 2 ? R`An odd root keeps the sign of the radicand: \(${rootTex(index, a)}\) is ${a < 0 ? 'negative' : 'positive'}.` : R`The radical sign means the principal (non-negative) root.` },
      base + 1,
      base - 1,
    ],
    solution: [
      R`\(${rootTex(index, 'a')} = b\) means \(b^{${index}} = a\).`,
      R`\(${base < 0 ? `(${base})` : base}^{${index}} = ${a}\), so \(${rootTex(index, a)} = ${base}\).`,
    ],
    rule: 0,
    skill: 'nth roots',
    check: () => (base ** index === a ? true : 'the power does not give back the radicand'),
  });
}

function easyConvertForm(rng) {
  const n = rng.int(2, 6);
  const m = rng.pick([1, 2, 3, 4, 5, 7].filter((v) => gcd(v, n) === 1 && v !== n));
  const x = rng.pick(['x', 'y', 'a', 't']);
  const xm = m === 1 ? x : `${x}^{${m}}`;
  const radical = rootTex(n, xm);
  const power = `${x}^{\\frac{${m}}{${n}}}`;
  const opt = (tex, f, why) => ({ tex, f, why });
  if (rng.bool(0.5)) {
    return q({
      prompt: R`Which expression equals \(${power}\)? (Assume \(${x} > 0\).)`,
      ...symChoices(opt(radical, (v) => v ** (m / n)), [
        opt(m === 1 ? `${x}^{${n}}` : rootTex(m, `${x}^{${n}}`), (v) => v ** (n / m), 'The denominator of the exponent is the index of the root. The numerator is the power.'),
        opt(texFrac(terms([[m, x]]), n), (v) => (m * v) / n, R`\(\frac{${m}}{${n}}\) is an exponent, not a number that multiplies \(${x}\).`),
        opt(`\\frac{1}{${x}^{${m * n}}}`, (v) => v ** (-m * n)),
        opt(rootTex(n, terms([[m, x]])), (v) => (m * v) ** (1 / n)),
        opt(`${x}^{${m + n}}`, (v) => v ** (m + n)),
      ]),
      solution: [
        R`\(${x}^{\frac{1}{${n}}} = ${rootTex(n, x)}\): the denominator \(${n}\) becomes the index of the root.`,
        R`The numerator \(${m}\) is a power: \(${power} = ${radical}\).`,
      ],
      rule: 1,
      skill: 'rational exponents',
    });
  }
  return q({
    prompt: R`Write \(${radical}\) using a rational exponent. (Assume \(${x} > 0\).)`,
    ...symChoices(opt(power, (v) => v ** (m / n)), [
      opt(`${x}^{\\frac{${n}}{${m}}}`, (v) => v ** (n / m), 'The index of the root goes in the denominator of the exponent. The power goes in the numerator.'),
      opt(`${x}^{${m * n}}`, (v) => v ** (m * n), 'Taking a root divides the exponent by the index. It does not multiply.'),
      opt(`${x}^{${m + n}}`, (v) => v ** (m + n)),
      opt(`${x}^{${m - n}}`, (v) => v ** (m - n)),
    ]),
    solution: [
      R`A root is a power with a fraction as the exponent: \(${rootTex(n, x)} = ${x}^{\frac{1}{${n}}}\).`,
      R`So \(${radical} = \left(${xm}\right)^{\frac{1}{${n}}} = ${power}\).`,
    ],
    rule: 1,
    skill: 'rational exponents',
  });
}

function easySimplifySqrt(rng) {
  const k = rng.int(2, 9);
  const m = rng.pick([2, 3, 5, 6, 7, 10]);
  const n = k * k * m;
  const root = (c, r) => K(`${c}\\sqrt{${r}}`, c * Math.sqrt(r));
  return q({
    prompt: R`Simplify \(\sqrt{${n}}\).`,
    ...symChoices(root(k, m), [
      { ...root(k * k, m), why: R`\(${k * k}\) is the perfect-square factor. Its square root, \(${k}\), is what comes out of the radical.` },
      K(num(n / 2), n / 2, 'A square root is not half of the number. Look for a perfect-square factor instead.'),
      root(k, m * 2),
      root(k + 1, m),
    ]),
    solution: [
      R`Find the largest perfect square that divides \(${n}\): \(${n} = ${k * k} \cdot ${m}\).`,
      R`\(\sqrt{${n}} = \sqrt{${k * k}} \cdot \sqrt{${m}} = ${k}\sqrt{${m}}\).`,
    ],
    rule: 2,
    skill: 'simplifying radicals',
    check: () => {
      const s = simplifySqrt(n);
      return s.coef === k && s.rad === m ? true : `√${n} simplifies to ${s.coef}√${s.rad}`;
    },
  });
}

// ───────────── Medium ─────────────

function mediumEvalRational(rng) {
  const n = rng.pick([2, 3, 3, 4]);
  const base = rng.int(2, n === 2 ? 9 : n === 3 ? 5 : 3);
  const m = rng.pick([1, 2, 3, 4, 5].filter((v) => gcd(v, n) === 1 && base ** v <= 1000));
  const negative = rng.bool(0.45);
  const a = base ** n;
  const value = negative ? frac(1, base ** m) : frac(base ** m, 1);
  const exp = `${negative ? '-' : ''}\\frac{${m}}{${n}}`;
  return q({
    prompt: R`Evaluate \(${a}^{${exp}}\).`,
    correct: value,
    wrong: [
      negative ? { value: frac(-(base ** m), 1), why: 'A negative exponent means "take the reciprocal". It does not make the answer negative.' } : null,
      { value: frac((negative ? -1 : 1) * a * m, n), why: R`The exponent is not a multiplier. \(${a}^{\frac{${m}}{${n}}}\) means: take the ${n === 2 ? 'square' : n === 3 ? 'cube' : 'fourth'} root${m === 1 ? '' : R`, then raise to the power \(${m}\)`}.` },
      negative ? frac(base ** m, 1) : frac(1, base ** m),
      frac(base * m, 1),
      value.add(1),
    ],
    solution: [
      R`Take the root first: \(${a}^{\frac{1}{${n}}} = ${rootTex(n, a)} = ${base}\).`,
      ...(m === 1 ? [] : [R`Then raise to the power \(${m}\): \(${base}^{${m}} = ${base ** m}\).`]),
      ...(negative ? [R`The exponent is negative, so take the reciprocal: \(${a}^{${exp}} = \frac{1}{${base ** m}}\).`] : []),
    ],
    rule: 1,
    skill: 'rational exponents',
    check: () => (Math.abs(a ** ((negative ? -m : m) / n) - value.value) < 1e-9 ? true : 'the power has a different value'),
  });
}

function mediumAddRadicals(rng) {
  const m = rng.pick([2, 3, 5, 6, 7]);
  const k1 = rng.int(1, 5);
  const k2 = rng.intExcept(2, 6, [k1]);
  const c1 = rng.int(1, 5);
  const c2 = rng.nonzero(-5, 5);
  const total = c1 * k1 + c2 * k2;
  if (total === 0) return mediumAddRadicals(rng);
  const [n1, n2] = [k1 * k1 * m, k2 * k2 * m];
  const expr = terms([[c1, `\\sqrt{${n1}}`], [c2, `\\sqrt{${n2}}`]]);
  const root = (c, r, why) => K(terms([[c, `\\sqrt{${r}}`]]), c * Math.sqrt(r), why);
  return q({
    prompt: R`Simplify \(${expr}\).`,
    ...symChoices(root(total, m), [
      root(c1 + c2 || 1, n1 + n2, 'Radicands cannot be added. Simplify each radical first, then combine like radicals.'),
      root(c1 + c2 || 2, m, R`After simplifying, each coefficient is multiplied by what came out of its radical: \(${c1} \cdot ${k1}\) and \(${c2 < 0 ? `(${c2})` : c2} \cdot ${k2}\).`),
      root(c1 * k1 * k1 + c2 * k2 * k2 || 3, m),
      root(c1 * k1 - c2 * k2 || 4, m),
      root(total, 2 * m),
    ]),
    solution: [
      R`Simplify each radical: ${k1 === 1 ? R`\(\sqrt{${n1}}\) is already simple` : R`\(\sqrt{${n1}} = ${k1}\sqrt{${m}}\)`} and \(\sqrt{${n2}} = ${k2}\sqrt{${m}}\).`,
      R`Substitute: \(${terms([[c1 * k1, `\\sqrt{${m}}`], [c2 * k2, `\\sqrt{${m}}`]])}\).`,
      R`These are like radicals, so combine the coefficients: \(${terms([[total, `\\sqrt{${m}}`]])}\).`,
    ],
    rule: 3,
    skill: 'adding radicals',
    check: () => (Math.abs(c1 * Math.sqrt(n1) + c2 * Math.sqrt(n2) - total * Math.sqrt(m)) < 1e-9 ? true : 'the two sides have different values'),
  });
}

function mediumMultiplyRadicals(rng) {
  const m = rng.pick([2, 3, 5, 7]);
  const [a, b, c, d] = [rng.nonzero(-6, 6), rng.nonzero(-4, 4), rng.nonzero(-6, 6), rng.nonzero(-4, 4)];
  const root = `\\sqrt{${m}}`;
  const bin = (p, qq) => `(${terms([[p, ''], [qq, root]])})`;
  return q({
    prompt: R`Multiply and simplify: \(\;${bin(a, b)}${bin(c, d)}\)`,
    ...symChoices(R2(a * c + b * d * m, a * d + b * c, m), [
      R2(a * c, b * d, m, 1, 'Each term of the first factor multiplies each term of the second: there are four products, not two.'),
      R2(a * c + b * d, a * d + b * c, m, 1, R`\(${root} \cdot ${root} = ${m}\), so the last product is \(${b * d} \cdot ${m} = ${b * d * m}\).`),
      R2(a * c + b * d * m, a * d - b * c, m),
      R2(a * c - b * d * m, a * d + b * c, m),
      R2(a * c + b * d * m + 1, a * d + b * c + 1, m),
    ]),
    solution: [
      R`Multiply each term by each term: \(${terms([[a * c, ''], [a * d, root], [b * c, root], [b * d, `\\sqrt{${m}}\\cdot\\sqrt{${m}}`]])}\).`,
      R`Since \(${root} \cdot ${root} = ${m}\), the last term is \(${b * d * m}\).`,
      R`Combine like terms: \(${radForm(a * c + b * d * m, a * d + b * c, m).tex}\).`,
    ],
    rule: 4,
    skill: 'multiplying radicals',
    check: () => (Math.abs((a + b * Math.sqrt(m)) * (c + d * Math.sqrt(m)) - radForm(a * c + b * d * m, a * d + b * c, m).value) < 1e-9 ? true : 'the product has a different value'),
  });
}

const RECTANGLES = [];
for (let w = 1; w <= 12; w++) for (let h = w; h <= 14; h++) if (!isSquare(w * w + h * h) && simplifySqrt(w * w + h * h).coef > 1) RECTANGLES.push([w, h]);

function mediumDiagonal(rng) {
  const [w, h] = rng.pick(RECTANGLES);
  const sum = w * w + h * h;
  const s = simplifySqrt(sum);
  const [thing, unit] = rng.pick([['A rectangular gate', 'ft'], ['A rectangular garden', 'm'], ['A rectangular tabletop', 'ft'], ['A rectangular sports field', 'm'], ['A rectangular picture frame', 'cm']]);
  const part = thing.includes('gate') ? 'the diagonal brace across it' : 'its diagonal';
  return q({
    prompt: `${thing} is ${w} ${unit} by ${h} ${unit}. How long is ${part}? Give the exact answer in simplest radical form.`,
    ...symChoices(K(`${s.coef}\\sqrt{${s.rad}}`, Math.sqrt(sum)), [
      K(`${w + h}`, w + h, 'The diagonal is the hypotenuse of a right triangle, so use the Pythagorean theorem. Adding the sides gives the distance around the corner.'),
      K(`${sum}`, sum, R`\(${sum}\) is the square of the diagonal. Take the square root.`),
      K(`${s.coef * s.coef}\\sqrt{${s.rad}}`, s.coef * s.coef * Math.sqrt(s.rad)),
      K(`${s.coef}\\sqrt{${s.rad + 1}}`, s.coef * Math.sqrt(s.rad + 1)),
    ], undefined, (tex) => `${M(tex)} ${unit}`),
    solution: [
      R`The diagonal \(d\) is the hypotenuse of a right triangle with legs ${w} and ${h}: \(d^{2} = ${w}^{2} + ${h}^{2} = ${sum}\).`,
      R`\(d = \sqrt{${sum}} = \sqrt{${s.coef * s.coef} \cdot ${s.rad}} = ${s.coef}\sqrt{${s.rad}}\) ${unit}, which is about ${txt(Math.sqrt(sum), { places: 1 })} ${unit}.`,
    ],
    rule: 2,
    skill: 'radicals in context',
    check: () => (s.coef * s.coef * s.rad === sum ? true : 'the simplified radical does not match'),
  });
}

// ───────────── Hard ─────────────

function hardRationalize(rng) {
  const c = rng.pick([2, 3, 5, 6, 7]);
  const root = `\\sqrt{${c}}`;
  if (rng.bool(0.35)) {
    const k = rng.pick([1, 1, 2, 3]);
    const a = rng.int(2, 12);
    const den = k === 1 ? root : `${k}${root}`;
    return q({
      prompt: R`Rationalize the denominator and simplify: \(\;\dfrac{${a}}{${den}}\)`,
      ...symChoices(R2(0, a, c, k * c), [
        K(frac(a, k * c).tex(), a / (k * c), R`Multiplying the bottom by \(${root}\) means the top must be multiplied by \(${root}\) too.`),
        R2(0, a, c, k === 1 ? 2 * c : k, R`\(${den} \cdot ${root} = ${k * c}\), so the new denominator is \(${k * c}\).`),
        R2(0, a, c, 1),
        R2(0, a * c, c, k),
      ]),
      solution: [
        R`Multiply the top and bottom by \(${root}\): \(\dfrac{${a}}{${den}} \cdot \dfrac{${root}}{${root}} = \dfrac{${a}${root}}{${k * c}}\).`,
        R`Simplify the fraction: \(${radForm(0, a, c, k * c).tex}\).`,
      ],
      rule: 5,
      skill: 'rationalizing denominators',
      check: () => (Math.abs(a / (k * Math.sqrt(c)) - radForm(0, a, c, k * c).value) < 1e-9 ? true : 'the value changed'),
    });
  }
  const b = rng.pick([1, 2, 3, 4, 5, 6].filter((v) => v * v !== c));
  const s = rng.sign();
  const a = rng.int(1, 12);
  const D = b * b - c;
  const den = terms([[b, ''], [s, root]]);
  const conj = terms([[b, ''], [-s, root]]);
  const right = radForm(a * b, -s * a, c, D);
  return q({
    prompt: R`Rationalize the denominator and simplify: \(\;\dfrac{${a}}{${den}}\)`,
    ...symChoices(K(right.tex, right.value), [
      R2(a * b, s * a, c, D, R`Multiply by the conjugate, \(${conj}\). It has the opposite sign in the middle.`),
      R2(a * b, -s * a, c, b * b + c, R`\((${den})(${conj}) = ${b * b} - ${c}\), a difference of squares.`),
      R2(a * c, s * a * b, c, b * c, R`\(\dfrac{${a}}{${den}}\) cannot be split into \(\dfrac{${a}}{${b}}\) and \(\dfrac{${a}}{${root}}\). Only a numerator can be split that way.`),
      R2(a * b, -s * a, c, 1),
      R2(a * b + 1, -s * a, c, D),
    ]),
    solution: [
      R`Multiply the top and bottom by the conjugate of the denominator, \(${conj}\).`,
      R`Bottom: \((${den})(${conj}) = ${b * b} - ${c} = ${D}\).`,
      R`Top: \(${a}(${conj}) = ${terms([[a * b, ''], [-s * a, root]])}\).`,
      R`\(\dfrac{${terms([[a * b, ''], [-s * a, root]])}}{${D}}\) simplifies to \(${right.tex}\).`,
    ],
    rule: 5,
    skill: 'rationalizing denominators',
    check: () => (Math.abs(a / (b + s * Math.sqrt(c)) - right.value) < 1e-9 ? true : 'the value changed'),
  });
}

function hardExtraneous(rng) {
  const c = rng.int(-5, 5);
  const kind = rng.pick(['one', 'one', 'one', 'one', 'both', 'both', 'none']);
  const ok = () => -c + rng.int(0, 6);
  const bad = () => -c - rng.int(1, 6);
  const [r1, r2] = kind === 'one' ? [ok(), bad()] : kind === 'both' ? [ok(), ok()] : [bad(), bad()];
  const a = r1 + r2 + 2 * c;
  const b = c * c - r1 * r2;
  if (a === 0 || r1 === r2) return hardExtraneous(rng);
  const valid = [r1, r2].filter((r) => r + c >= 0);
  const X = (vals) => M(rootsTex(vals));
  const none = 'No solution';
  const side = (r) => R`\(x = ${r}\): left side \(\sqrt{${a * r + b}} = ${Math.abs(r + c)}\), right side \(${r + c}\)${r + c >= 0 ? ' ✓' : ', so it fails'}`;
  return q({
    prompt: R`Solve: \(\;\sqrt{${linear(a, b)}} = ${linear(1, c)}\)`,
    correct: valid.length ? X(valid) : none,
    wrong: kind === 'one'
      ? [{ value: X([r1, r2]), why: R`Check \(x = ${r2}\) in the original equation: the right side is \(${r2 + c}\), but a square root is never negative. It is extraneous.` }, { value: X([r2]), why: R`\(x = ${r2}\) is the extraneous one. Check both values in the original equation.` }, none, X([-r1])]
      : kind === 'both'
        ? [{ value: X([r1]), why: 'Both values satisfy the original equation, so both are solutions.' }, X([r2]), { value: none, why: 'A value is extraneous only if it fails the original equation. Check each one.' }, X([-r1, -r2])]
        : [{ value: X([r1, r2]), why: 'Both values make the right side negative, but a square root is never negative. Neither one works.' }, X([r1]), X([r2]), X([-r1, -r2])],
    solution: [
      R`Square both sides: \(${linear(a, b)} = ${poly([1, 2 * c, c * c])}\).`,
      R`Move everything to one side: \(${poly([1, 2 * c - a, c * c - b])} = 0\), which factors as \(${factor(r1)}${factor(r2)} = 0\).`,
      R`Squaring can create extra solutions, so check both candidates in the original equation. ${side(r1)}. ${side(r2)}.`,
      valid.length ? R`Solution: \(${rootsTex(valid)}\).` : 'Neither candidate works, so there is no solution.',
    ],
    rule: 6,
    skill: 'radical equations',
    check: () => ([r1, r2].every((r) => (Math.abs(Math.sqrt(a * r + b) - (r + c)) < 1e-9) === valid.includes(r)) ? true : 'the accepted and rejected values are wrong'),
  });
}

function hardWordFormula(rng) {
  const kind = rng.pick(['horizon', 'fall', 'skid']);
  if (kind === 'horizon') {
    const d = 3 * rng.int(1, 8);
    const h = (d * d) / 1.5;
    return q({
      prompt: R`From a height of \(h\) feet, the distance to the horizon is about \(d = \sqrt{1.5h}\) miles. How high must a lookout be to see ${d} miles?`,
      correct: h,
      unit: 'ft',
      wrong: [
        { value: d / 1.5, why: R`Undo the square root by squaring both sides first: \(${d}^{2} = 1.5h\).` },
        { value: round(Math.sqrt(1.5 * d), 2), why: R`\(${d}\) is the distance \(d\), not the height. Substitute it for \(d\) and solve for \(h\).` },
        1.5 * d * d,
        h + 6,
      ],
      solution: [R`Substitute \(d = ${d}\): \(${d} = \sqrt{1.5h}\).`, R`Square both sides: \(${d * d} = 1.5h\).`, R`Divide by 1.5: \(h = ${h}\) ft. Check: \(\sqrt{1.5 \cdot ${h}} = \sqrt{${d * d}} = ${d}\). ✓`],
      rule: 6,
      skill: 'radical equations in context',
      check: () => (Math.abs(Math.sqrt(1.5 * h) - d) < 1e-9 ? true : 'the height does not give this distance'),
    });
  }
  if (kind === 'fall') {
    const t = rng.pick([1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    const h = 16 * t * t;
    const name = person(rng);
    return q({
      prompt: R`An object dropped from a height of \(h\) feet takes \(t = \dfrac{\sqrt{h}}{4}\) seconds to reach the ground. ${name} times a dropped stone at ${t} seconds. From what height was it dropped?`,
      correct: h,
      unit: 'ft',
      wrong: [
        { value: 4 * t, why: R`\(${num(4 * t)}\) is \(\sqrt{h}\). Square it to get \(h\).` },
        { value: 4 * t * t, why: R`Multiply by 4 before squaring: \(\sqrt{h} = ${num(4 * t)}\), so \(h = ${num(4 * t)}^{2}\).` },
        (t * t) / 16,
        h + 16,
      ],
      solution: [R`Substitute \(t = ${t}\): \(${t} = \dfrac{\sqrt{h}}{4}\).`, R`Multiply both sides by 4: \(\sqrt{h} = ${num(4 * t)}\).`, R`Square both sides: \(h = ${num(h)}\) ft.`],
      rule: 6,
      skill: 'radical equations in context',
      check: () => (Math.abs(Math.sqrt(h) / 4 - t) < 1e-9 ? true : 'the height does not give this time'),
    });
  }
  const s = 12 * rng.int(1, 6);
  const d = (s * s) / 24;
  return q({
    prompt: R`On a dry road, a car that skids \(d\) feet before stopping was travelling at about \(s = \sqrt{24d}\) miles per hour. How long are the skid marks left by a car that was travelling at ${s} mph?`,
    correct: d,
    unit: 'ft',
    wrong: [
      { value: s / 24, why: R`Undo the square root by squaring both sides first: \(${s}^{2} = 24d\).` },
      { value: round(Math.sqrt(24 * s), 2), why: R`\(${s}\) is the speed \(s\), not the distance. Substitute it for \(s\) and solve for \(d\).` },
      24 * s,
      d + 12,
    ],
    solution: [R`Substitute \(s = ${s}\): \(${s} = \sqrt{24d}\).`, R`Square both sides: \(${num(s * s)} = 24d\).`, R`Divide by 24: \(d = ${d}\) ft.`],
    rule: 6,
    skill: 'radical equations in context',
    check: () => (Math.abs(Math.sqrt(24 * d) - s) < 1e-9 ? true : 'the distance does not give this speed'),
  });
}

// ───────────── Challenge ─────────────

function challengeTwoRadicals(rng) {
  const n = rng.int(0, 6);
  const k = rng.int(1, 4);
  const qq = rng.int(-6, 6);
  const x = n * n - qq;
  const p = qq + 2 * n * k + k * k;
  const A = `\\sqrt{${linear(1, p)}}`;
  const B = `\\sqrt{${linear(1, qq)}}`;
  return q({
    prompt: R`Solve: \(\;${A} - ${B} = ${k}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: n * n, why: R`\(${n * n}\) is the value of \(${linear(1, qq)}\). Solve \(${linear(1, qq)} = ${n * n}\) for \(x\).` },
      { value: n * n + qq, why: R`From \(${linear(1, qq)} = ${n * n}\), ${qq > 0 ? 'subtract' : 'add'} \(${Math.abs(qq)}\) on both sides.` },
      (n + k) ** 2,
      x + 1,
      x - 2,
    ],
    solution: [
      R`Isolate one radical: \(${A} = ${k} + ${B}\).`,
      R`Square both sides. The right side is a binomial: \(${linear(1, p)} = ${k * k} + ${2 * k}${B} + ${linear(1, qq)}\).`,
      R`Simplify. The \(x\) terms cancel: \(${2 * k}${B} = ${p - qq - k * k}\), so \(${B} = ${n}\).`,
      R`Square again: \(${linear(1, qq)} = ${n * n}\), so \(x = ${x}\). Check: \(\sqrt{${x + p}} - \sqrt{${x + qq}} = ${n + k} - ${n} = ${k}\). ✓`,
    ],
    rule: 6,
    skill: 'radical equations',
    check: () => (Math.abs(Math.sqrt(x + p) - Math.sqrt(x + qq) - k) < 1e-9 ? true : 'the value does not satisfy the equation'),
  });
}

const POWER_EQUATIONS = [[3, 2, 2], [3, 2, 3], [3, 2, 4], [3, 2, 5], [2, 3, 2], [2, 3, 3], [2, 3, 4], [2, 3, 5], [3, 4, 2], [3, 4, 3], [4, 3, 2], [4, 3, 3], [5, 2, 2], [5, 2, 3], [2, 5, 2], [3, 5, 2], [5, 3, 2]];

function challengeRationalPower(rng) {
  const [m, n, r] = rng.pick(POWER_EQUATIONS);
  const h = rng.int(-6, 6);
  const c = r ** m;
  const u = r ** n;
  const two = m % 2 === 0;
  const inside = linear(1, -h);
  const lhs = h === 0 ? `x^{\\frac{${m}}{${n}}}` : `(${inside})^{\\frac{${m}}{${n}}}`;
  const X = (vals) => M(rootsTex(vals));
  const good = two ? [h - u, h + u] : [h + u];
  return q({
    prompt: R`Find all real solutions: \(\;${lhs} = ${c}\)`,
    correct: X(good),
    wrong: [
      two
        ? { value: X([h + u]), why: R`The numerator \(${m}\) is even, so \(${rootTex(n, inside)}\) can be \(${r}\) or \(-${r}\). That gives a second solution.` }
        : { value: X([h - u, h + u]), why: n % 2 === 0 ? R`\((${inside})^{\frac{${m}}{${n}}}\) needs \(${inside} \ge 0\), so only the positive value works.` : R`The numerator \(${m}\) is odd, so \(${rootTex(n, inside)}\) must be \(${r}\), not \(-${r}\).` },
      { value: X(two ? [h - r, h + r] : [h + r]), why: R`\(${r}\) is the value of \(${rootTex(n, inside)}\). Raise it to the power \(${n}\) to undo the root.` },
      X(two ? [h - c, h + c] : [h + c]),
      h === 0 ? null : X(two ? [-h - u, -h + u] : [-h + u]),
      X(two ? [h - u - 1, h + u + 1] : [h + u + 1]),
    ],
    solution: [
      R`\(${lhs}\) means \(\left(${rootTex(n, inside)}\right)^{${m}}\). So \(\left(${rootTex(n, inside)}\right)^{${m}} = ${c} = ${r}^{${m}}\).`,
      two ? R`The power \(${m}\) is even, so \(${rootTex(n, inside)} = ${r}\) or \(${rootTex(n, inside)} = -${r}\).` : R`The power \(${m}\) is odd, so \(${rootTex(n, inside)} = ${r}\).`,
      R`Raise to the power \(${n}\): \(${inside} = ${two ? `\\pm ${u}` : u}\).`,
      R`So \(${rootsTex(good)}\).`,
    ],
    rule: 1,
    skill: 'equations with rational exponents',
    check: () => (good.every((x) => Math.abs(ratPow(x - h, m, n) - c) < 1e-6) ? true : 'a listed solution does not satisfy the equation'),
  });
}

const FORMULAS = [
  { ask: R`Solve \(r = \sqrt{\dfrac{A}{\pi}}\) for \(A\).`, right: R`\(A = \pi r^{2}\)`, wrong: [R`\(A = \pi r\)`, R`\(A = \dfrac{r^{2}}{\pi}\)`, R`\(A = \sqrt{\pi r}\)`], steps: [R`Square both sides: \(r^{2} = \dfrac{A}{\pi}\).`, R`Multiply both sides by \(\pi\): \(A = \pi r^{2}\).`] },
  { ask: R`The period of a pendulum is \(T = 2\pi\sqrt{\dfrac{L}{g}}\). Solve for \(L\).`, right: R`\(L = \dfrac{gT^{2}}{4\pi^{2}}\)`, wrong: [R`\(L = \dfrac{gT}{2\pi}\)`, R`\(L = \dfrac{gT^{2}}{2\pi}\)`, R`\(L = \dfrac{4\pi^{2}T^{2}}{g}\)`], steps: [R`Divide both sides by \(2\pi\): \(\dfrac{T}{2\pi} = \sqrt{\dfrac{L}{g}}\).`, R`Square both sides: \(\dfrac{T^{2}}{4\pi^{2}} = \dfrac{L}{g}\).`, R`Multiply both sides by \(g\): \(L = \dfrac{gT^{2}}{4\pi^{2}}\).`] },
  { ask: R`Solve \(v = \sqrt{2gh}\) for \(h\).`, right: R`\(h = \dfrac{v^{2}}{2g}\)`, wrong: [R`\(h = \dfrac{v}{2g}\)`, R`\(h = 2gv^{2}\)`, R`\(h = v^{2} - 2g\)`], steps: [R`Square both sides: \(v^{2} = 2gh\).`, R`Divide both sides by \(2g\): \(h = \dfrac{v^{2}}{2g}\).`] },
  { ask: R`Solve \(c = \sqrt{a^{2} + b^{2}}\) for \(a\), where \(a > 0\).`, right: R`\(a = \sqrt{c^{2} - b^{2}}\)`, wrong: [R`\(a = c - b\)`, R`\(a = c^{2} - b^{2}\)`, R`\(a = \sqrt{c^{2} + b^{2}}\)`], steps: [R`Square both sides: \(c^{2} = a^{2} + b^{2}\).`, R`Subtract \(b^{2}\): \(a^{2} = c^{2} - b^{2}\).`, R`Take the positive square root: \(a = \sqrt{c^{2} - b^{2}}\). This does not simplify to \(c - b\).`] },
  { ask: R`Solve \(r = \sqrt[3]{\dfrac{3V}{4\pi}}\) for \(V\).`, right: R`\(V = \dfrac{4\pi r^{3}}{3}\)`, wrong: [R`\(V = \dfrac{4\pi r}{3}\)`, R`\(V = \dfrac{3r^{3}}{4\pi}\)`, R`\(V = \dfrac{4\pi r^{2}}{3}\)`], steps: [R`Cube both sides: \(r^{3} = \dfrac{3V}{4\pi}\).`, R`Multiply both sides by \(4\pi\): \(4\pi r^{3} = 3V\).`, R`Divide by 3: \(V = \dfrac{4\pi r^{3}}{3}\).`] },
  { ask: R`Solve \(t = \sqrt{\dfrac{2d}{a}}\) for \(d\).`, right: R`\(d = \dfrac{at^{2}}{2}\)`, wrong: [R`\(d = \dfrac{at}{2}\)`, R`\(d = \dfrac{2t^{2}}{a}\)`, R`\(d = 2at^{2}\)`], steps: [R`Square both sides: \(t^{2} = \dfrac{2d}{a}\).`, R`Multiply both sides by \(a\): \(at^{2} = 2d\).`, R`Divide by 2: \(d = \dfrac{at^{2}}{2}\).`] },
  { ask: R`Solve \(y = \sqrt{x - 3} + 2\) for \(x\).`, right: R`\(x = (y - 2)^{2} + 3\)`, wrong: [R`\(x = y^{2} - 1\)`, R`\(x = (y - 2)^{2} - 3\)`, R`\(x = (y + 2)^{2} + 3\)`], steps: [R`Isolate the radical: \(y - 2 = \sqrt{x - 3}\).`, R`Square both sides: \((y - 2)^{2} = x - 3\). The whole side \(y - 2\) is squared, not each term.`, R`Add 3: \(x = (y - 2)^{2} + 3\).`] },
  { ask: R`Solve \(s = \sqrt{30fd}\) for \(d\).`, right: R`\(d = \dfrac{s^{2}}{30f}\)`, wrong: [R`\(d = \dfrac{s}{30f}\)`, R`\(d = 30fs^{2}\)`, R`\(d = \dfrac{30f}{s^{2}}\)`], steps: [R`Square both sides: \(s^{2} = 30fd\).`, R`Divide both sides by \(30f\): \(d = \dfrac{s^{2}}{30f}\).`] },
];

function challengeFormula(rng) {
  const f = rng.pick(FORMULAS);
  return q({ prompt: f.ask, correct: f.right, wrong: f.wrong, solution: f.steps, rule: 6, skill: 'formulas with radicals' });
}

// ───────────── Models ─────────────

function equationModel({ a, b, c }) {
  if (a === 0) return { error: 'Choose a value of a other than 0, so that x appears under the square root.' };
  const D = a * a - 4 * a * c + 4 * b;
  const quad = [1, 2 * c - a, c * c - b];
  const problem = R`\(\sqrt{${linear(a, b)}} = ${linear(1, c)}\)`;
  const steps = [R`Square both sides: \(${linear(a, b)} = ${poly([1, 2 * c, c * c])}\).`, R`Move everything to one side: \(${poly(quad)} = 0\).`];
  const edge = -b / a;
  let cands = [];
  if (D < 0) steps.push(R`The discriminant is \(${D}\), which is negative, so this quadratic has no real solutions.`);
  else {
    cands = D === 0 ? [(a - 2 * c) / 2] : [(a - 2 * c - Math.sqrt(D)) / 2, (a - 2 * c + Math.sqrt(D)) / 2];
    steps.push(R`Solve the quadratic (by factoring or the quadratic formula): \(x ${isSquare(D) ? '=' : R`\approx`} ${cands.map((x) => num(x, { places: 2 })).join(R`\text{ or } x ${isSquare(D) ? '=' : R`\approx`} `)}\).`);
    for (const x of cands) {
      const right = x + c;
      steps.push(R`Check \(x ${isSquare(D) ? '=' : R`\approx`} ${num(x, { places: 2 })}\): the left side is \(${num(Math.abs(right), { places: 2 })}\) and the right side is \(${num(right, { places: 2 })}\). ${right >= -1e-9 ? 'They match, so this is a solution.' : 'A square root cannot be negative, so this value is extraneous.'}`);
    }
  }
  const valid = cands.filter((x) => x + c >= -1e-9);
  const xs = [...cands, edge];
  const lo = Math.min(...xs) - 3;
  const hi = Math.max(...xs) + 3;
  const top = Math.max(4, ...cands.map((x) => Math.abs(x + c) + 2), Math.sqrt(Math.max(0, a * (a > 0 ? hi : lo) + b)) + 1, Math.abs((lo + hi) / 2 + c) + 2);
  return {
    problem,
    steps,
    answer: valid.length ? M(`x ${isSquare(D) ? '=' : '\\approx'} ${valid.map((x) => num(x, { places: 2 })).join(`\\text{ or } x ${isSquare(D) ? '=' : '\\approx'} `)}`) : 'No solution',
    visual: {
      type: 'plot',
      x: [lo, hi],
      y: [-top, top],
      fns: [{ f: (x) => Math.sqrt(a * x + b) }, { f: (x) => x + c, color: 'b' }, { f: (x) => -Math.sqrt(a * x + b), color: 'a', dashed: true }],
      points: cands.map((x) => ({ x, y: x + c, open: x + c < -1e-9, color: x + c < -1e-9 ? 'd' : 'c' })),
      alt: `Graph of the square-root curve (solid), its mirror image below the x-axis (dashed) and the line y = ${linear(1, c).replace('-', '−')}. ${valid.length ? `The line meets the solid curve ${valid.length === 1 ? 'once' : 'twice'}, at the ${valid.length === 1 ? 'solution' : 'solutions'}.` : 'The line does not meet the solid curve, so there is no solution.'}${cands.length > valid.length ? ' An open circle marks where the line meets the dashed mirror image: that is the extraneous value.' : ''}`,
    },
  };
}

function swingModel({ T }) {
  const L = (8 * T * T) / (Math.PI * Math.PI);
  const period = (x) => 2 * Math.PI * Math.sqrt(x / 32);
  return {
    problem: R`A playground swing takes ${num(T)} seconds for one full swing back and forth. The period of a pendulum of length \(L\) feet is \(T = 2\pi\sqrt{\dfrac{L}{32}}\) seconds. How long are the chains of the swing?`,
    steps: [
      R`Substitute \(T = ${num(T)}\): \(${num(T)} = 2\pi\sqrt{\dfrac{L}{32}}\).`,
      R`Isolate the radical by dividing both sides by \(2\pi\): \(\sqrt{\dfrac{L}{32}} = \dfrac{${num(T)}}{2\pi} \approx ${num(T / (2 * Math.PI), { places: 4 })}\).`,
      R`Square both sides: \(\dfrac{L}{32} \approx ${num((T / (2 * Math.PI)) ** 2, { places: 4 })}\).`,
      R`Multiply by 32: \(L \approx ${num(L, { places: 2 })}\).`,
    ],
    answer: R`About \(${num(L, { places: 1 })}\) feet`,
    visual: {
      type: 'plot',
      x: [0, Math.max(10, L * 1.4)],
      y: [0, Math.max(4, T * 1.3)],
      fns: [{ f: period }],
      points: [{ x: L, y: T, label: `L ≈ ${txt(L, { places: 1 })} ft` }],
      axisLabels: ['L (ft)', 'T (s)'],
      alt: `Graph of the period of a pendulum against its length: a square-root curve that rises quickly at first and then more slowly. The point for a period of ${txt(T)} seconds is marked at a length of about ${txt(L, { places: 1 })} feet.`,
    },
  };
}

export default {
  id: 'radicals-rational-exponents',
  title: 'Radicals & Rational Exponents',
  summary: 'Simplify and combine radicals, rewrite them as rational exponents, rationalize denominators and solve radical equations.',
  standards: ['CCSS N-RN.A.1', 'CCSS N-RN.A.2', 'CCSS A-REI.A.2'],

  explain: {
    intro: R`Roots undo powers: \(\sqrt[3]{8} = 2\) because \(2^{3} = 8\). A root can also be written as a power with a fraction for an exponent, which lets all the exponent rules apply to radicals. Equations with radicals are solved by raising both sides to a power, a step that can create false solutions, so every answer has to be checked.`,
    rules: [
      {
        title: 'nth roots',
        text: R`\(\sqrt[n]{a} = b\) means \(b^{n} = a\). The radical sign gives the principal root, which is not negative when \(n\) is even. Even roots of negative numbers are not real; odd roots of negative numbers are negative.`,
        example: R`\(\sqrt[4]{81} = 3\) and \(\sqrt[3]{-64} = -4\).`,
      },
      {
        title: 'Rational exponents',
        text: R`\(a^{\frac{1}{n}} = \sqrt[n]{a}\), and \(a^{\frac{m}{n}} = \left(\sqrt[n]{a}\right)^{m} = \sqrt[n]{a^{m}}\). The denominator is the index of the root and the numerator is the power. A negative exponent still means a reciprocal.`,
        example: R`\(27^{\frac{2}{3}} = \left(\sqrt[3]{27}\right)^{2} = 3^{2} = 9\) and \(16^{-\frac{3}{4}} = \dfrac{1}{2^{3}} = \dfrac{1}{8}\).`,
      },
      {
        title: 'Simplify radicals',
        text: R`Use \(\sqrt{ab} = \sqrt{a} \cdot \sqrt{b}\) (for \(a, b \ge 0\)) to take perfect-square factors out of a square root. For a cube root, take out perfect cubes.`,
        example: R`\(\sqrt{72} = \sqrt{36 \cdot 2} = 6\sqrt{2}\) and \(\sqrt[3]{54} = \sqrt[3]{27 \cdot 2} = 3\sqrt[3]{2}\).`,
      },
      {
        title: 'Add and subtract like radicals',
        text: R`Radicals with the same index and the same radicand are like radicals. Combine them by adding their coefficients. Simplify each radical first, because like radicals are often hidden.`,
        example: R`\(\sqrt{50} + \sqrt{8} = 5\sqrt{2} + 2\sqrt{2} = 7\sqrt{2}\).`,
      },
      {
        title: 'Multiply radicals',
        text: R`Multiply coefficients with coefficients and radicands with radicands, and use \(\sqrt{a} \cdot \sqrt{a} = a\). Binomials with radicals are multiplied term by term, like any binomials.`,
        example: R`\((2 + \sqrt{3})(1 + \sqrt{3}) = 2 + 2\sqrt{3} + \sqrt{3} + 3 = 5 + 3\sqrt{3}\).`,
      },
      {
        title: 'Rationalize the denominator',
        text: R`To clear a single square root from a denominator, multiply the top and bottom by that root. For a denominator such as \(a + \sqrt{b}\), multiply the top and bottom by its conjugate \(a - \sqrt{b}\), because \((a + \sqrt{b})(a - \sqrt{b}) = a^{2} - b\).`,
        example: R`\(\dfrac{6}{\sqrt{3}} = \dfrac{6\sqrt{3}}{3} = 2\sqrt{3}\) and \(\dfrac{4}{3 - \sqrt{5}} = \dfrac{4(3 + \sqrt{5})}{9 - 5} = 3 + \sqrt{5}\).`,
      },
      {
        title: 'Solve radical equations and check',
        text: R`Isolate the radical, raise both sides to the power that removes it, and solve. Then check every answer in the original equation. Squaring can create extraneous solutions, which must be rejected.`,
        example: R`\(\sqrt{x + 3} = x + 1\) gives \(x = 1\) or \(x = -2\) after squaring. Only \(x = 1\) works: \(x = -2\) would need \(\sqrt{1} = -1\).`,
      },
    ],
    vocab: [
      { term: 'radicand', def: R`The expression under the radical sign. In \(\sqrt[3]{x + 1}\) the radicand is \(x + 1\).` },
      { term: 'index', def: R`The small number that tells which root to take. In \(\sqrt[3]{8}\) the index is 3. A square root has index 2.` },
      { term: 'like radicals', def: R`Radicals with the same index and radicand, such as \(2\sqrt{5}\) and \(7\sqrt{5}\).` },
      { term: 'conjugate', def: R`The conjugate of \(a + \sqrt{b}\) is \(a - \sqrt{b}\). Their product has no radical.` },
      { term: 'extraneous solution', def: 'A value produced by the solving steps that does not satisfy the original equation.' },
    ],
    mistakes: [
      R`Adding radicands: \(\sqrt{9} + \sqrt{16} = 7\), not \(\sqrt{25}\).`,
      R`Swapping the parts of a rational exponent. In \(x^{\frac{2}{3}}\) the 3 is the root and the 2 is the power.`,
      R`Reading a negative exponent as a negative number: \(8^{-\frac{1}{3}} = \dfrac{1}{2}\), not \(-2\).`,
      R`Squaring a binomial term by term: \((x + 1)^{2} = x^{2} + 2x + 1\), not \(x^{2} + 1\).`,
      'Skipping the check after squaring both sides. That is the only way to catch an extraneous solution.',
    ],
    visual: {
      type: 'plot',
      x: [-4, 5],
      y: [-3, 4],
      fns: [
        { f: (x) => Math.sqrt(x + 3), label: 'y = √(x + 3)', labelAt: 3.4 },
        { f: (x) => x + 1, color: 'b', label: 'y = x + 1', labelAt: -2.9 },
        { f: (x) => -Math.sqrt(x + 3), color: 'a', dashed: true },
      ],
      points: [{ x: 1, y: 2, label: 'solution x = 1', color: 'c' }, { x: -2, y: -1, label: 'extraneous x = −2', open: true, color: 'd' }],
      alt: 'Graph of y = √(x + 3) and the line y = x + 1. They meet once, at x = 1. The line also meets the dashed mirror image y = −√(x + 3) at x = −2, which is the extraneous solution that squaring creates.',
    },
  },

  examples: [
    {
      title: 'Simplify, then combine',
      problem: R`Simplify \(\sqrt{72} + \sqrt{50} - \sqrt{8}\).`,
      steps: [
        R`Take out perfect squares: \(\sqrt{72} = 6\sqrt{2}\), \(\sqrt{50} = 5\sqrt{2}\), \(\sqrt{8} = 2\sqrt{2}\).`,
        R`All three are now like radicals: \(6\sqrt{2} + 5\sqrt{2} - 2\sqrt{2}\).`,
        R`Combine the coefficients: \(6 + 5 - 2 = 9\).`,
      ],
      answer: R`\(9\sqrt{2}\)`,
    },
    {
      title: 'Rationalize with a conjugate',
      problem: R`Rationalize the denominator of \(\dfrac{6}{3 - \sqrt{5}}\).`,
      steps: [
        R`Multiply the top and bottom by the conjugate \(3 + \sqrt{5}\).`,
        R`Bottom: \((3 - \sqrt{5})(3 + \sqrt{5}) = 9 - 5 = 4\).`,
        R`Top: \(6(3 + \sqrt{5}) = 18 + 6\sqrt{5}\).`,
        R`Divide every term by the common factor 2: \(\dfrac{18 + 6\sqrt{5}}{4} = \dfrac{9 + 3\sqrt{5}}{2}\).`,
      ],
      answer: R`\(\dfrac{9 + 3\sqrt{5}}{2}\)`,
    },
    {
      title: 'A radical equation with an extraneous solution',
      problem: R`Solve \(\sqrt{x + 3} = x + 1\).`,
      steps: [
        R`The radical is already alone. Square both sides: \(x + 3 = x^{2} + 2x + 1\).`,
        R`Move everything to one side: \(x^{2} + x - 2 = 0\), so \((x - 1)(x + 2) = 0\) and \(x = 1\) or \(x = -2\).`,
        R`Check \(x = 1\): \(\sqrt{4} = 2\) and \(1 + 1 = 2\). ✓`,
        R`Check \(x = -2\): \(\sqrt{1} = 1\) but \(-2 + 1 = -1\). It fails, so it is extraneous.`,
      ],
      answer: R`\(x = 1\)`,
    },
    {
      title: 'Word problem: distance to the horizon',
      word: true,
      problem: R`From a height of \(h\) feet, you can see about \(d = \sqrt{1.5h}\) miles to the horizon. How high must a lighthouse lamp be for its light to be seen 12 miles away?`,
      steps: [
        R`The distance is known and the height is not. Substitute \(d = 12\): \(12 = \sqrt{1.5h}\).`,
        R`Square both sides to remove the radical: \(144 = 1.5h\).`,
        R`Divide by 1.5: \(h = 96\).`,
        R`Check: \(\sqrt{1.5 \cdot 96} = \sqrt{144} = 12\). ✓`,
      ],
      answer: '96 feet',
    },
  ],

  models: [
    {
      id: 'radical-equation',
      title: 'Solve √(ax + b) = x + c and check',
      intro: 'Change the numbers. The graph shows which candidates are real solutions and which are extraneous.',
      inputs: [
        { name: 'a', label: 'a (under the root: ax + b)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'b', label: 'b (under the root: ax + b)', type: 'int', min: -20, max: 30, value: 3 },
        { name: 'c', label: 'c (right side: x + c)', type: 'int', min: -9, max: 9, value: 1 },
      ],
      compute: equationModel,
    },
    {
      id: 'swing-length',
      title: 'Word problem: how long is the swing?',
      word: true,
      intro: 'Change the time for one full swing.',
      inputs: [{ name: 'T', label: 'Time for one full swing (seconds)', type: 'number', min: 1, max: 10, step: 0.5, value: 3 }],
      compute: swingModel,
    },
  ],

  quiz: {
    easy: [easyNthRoot, easyConvertForm, easySimplifySqrt],
    medium: [mediumEvalRational, mediumAddRadicals, mediumMultiplyRadicals, mediumDiagonal],
    hard: [hardRationalize, hardExtraneous, hardWordFormula],
    challenge: [challengeTwoRadicals, challengeRationalPower, challengeFormula],
  },
};
