import { R, q, frac, tryFrac, terms, poly, linear, factor, num, txt, paren, gcd, divisors, joinList, polyEval, polyMul, polySub, polyAdd, checkSame, checkRoots } from '../../lib/index.js';
import { M, val, cx, symChoices, checkComplexRoot } from './_shared.js';

// ───────────── Helpers ─────────────

// Synthetic division of a polynomial (coefficients highest power first) by x − c.
function synth(coefs, c) {
  const bottom = [coefs[0]];
  const mid = [];
  for (let i = 1; i < coefs.length; i++) {
    mid.push(c * bottom[i - 1]);
    bottom.push(coefs[i] + mid[i - 1]);
  }
  return { mid, bottom, quotient: bottom.slice(0, -1), remainder: bottom[bottom.length - 1] };
}

// The synthetic-division tableau as a LaTeX array (for display math).
function synthTex(coefs, c) {
  const { mid, bottom } = synth(coefs, c);
  return R`\begin{array}{r|${'r'.repeat(coefs.length)}} ${c} & ${coefs.join(' & ')} \\ & & ${mid.join(' & ')} \\ \hline & ${bottom.join(' & ')} \end{array}`;
}

// quotient + remainder/divisor, with the sign of a one-term remainder written in front of the fraction.
function divResultTex(quot, rem, denTex) {
  const r = Array.isArray(rem) ? rem : [rem];
  const nonzero = r.filter((v) => v !== 0);
  if (!nonzero.length) return poly(quot);
  if (nonzero.every((v) => v < 0)) return `${poly(quot)} - \\frac{${poly(r.map((v) => -v))}}{${denTex}}`;
  return `${poly(quot)} + \\frac{${poly(r)}}{${denTex}}`;
}

// lead·(x − r₁)^m₁(x − r₂)^m₂… from zeros given as [r, m] pairs.
const factorPow = (r, m = 1) => factor(r) + (m > 1 ? `^{${m}}` : '');
const factoredTex = (lead, zeros) => (lead === 1 ? '' : lead === -1 ? '-' : num(lead)) + [...zeros.filter((z) => z[0] === 0), ...zeros.filter((z) => z[0] !== 0)].map(([r, m]) => factorPow(r, m)).join('');
const evalFactored = (lead, zeros, x) => zeros.reduce((acc, [r, m]) => acc * (x - r) ** m, lead);
const expand = (lead, zeros) => zeros.reduce((acc, [r, m]) => { for (let k = 0; k < m; k++) acc = polyMul(acc, [1, -r]); return acc; }, [lead]);

// "x = -3, 1, 2": zeros sorted, duplicates merged.
function zerosTex(zs) {
  const seen = new Map();
  for (const z of zs) seen.set(String(val(z)), z);
  return `x = ${[...seen.values()].sort((a, b) => val(a) - val(b)).map((z) => num(z)).join(',\\; ')}`;
}

const asX = (v) => M(`x = ${num(v)}`);
const ENDS = {
  uu: 'Rises on the left and rises on the right',
  dd: 'Falls on the left and falls on the right',
  du: 'Falls on the left and rises on the right',
  ud: 'Rises on the left and falls on the right',
};
const endsOf = (degree, lead) => {
  const right = lead > 0 ? 'u' : 'd';
  const left = degree % 2 === 0 ? right : right === 'u' ? 'd' : 'u';
  return left + right;
};
const arrow = (d) => (d === 'u' ? R`\infty` : R`-\infty`);

// ───────────── Easy ─────────────

function easyEndBehavior(rng) {
  const degree = rng.int(2, 6);
  const lead = rng.nonzero(-6, 6);
  const coefs = [lead];
  for (let i = 0; i < degree; i++) coefs.push(rng.bool(0.5) ? rng.nonzero(-9, 9) : 0);
  if (coefs.slice(1).every((c) => c === 0)) coefs[degree] = rng.nonzero(-9, 9);
  const ends = endsOf(degree, lead);
  const even = degree % 2 === 0;
  const flipLeft = (ends[0] === 'u' ? 'd' : 'u') + ends[1];
  return q({
    prompt: R`Describe the end behaviour of \(f(x) = ${poly(coefs)}\).`,
    correct: ENDS[ends],
    wrong: [
      { value: ENDS[flipLeft], why: even ? 'The degree is even, so both ends go the same way.' : 'The degree is odd, so the two ends go opposite ways.' },
      { value: ENDS[endsOf(degree, -lead)], why: `The leading coefficient is ${lead > 0 ? 'positive' : 'negative'}, so the right end ${lead > 0 ? 'rises' : 'falls'}.` },
      ENDS[endsOf(degree + 1, -lead)],
    ],
    solution: [
      R`Only the leading term \(${terms([[lead, `x^{${degree}}`]])}\) matters for end behaviour.`,
      `The degree, ${degree}, is ${even ? 'even, so both ends go the same way' : 'odd, so the ends go opposite ways'}. The leading coefficient is ${lead > 0 ? 'positive, so the right end rises' : 'negative, so the right end falls'}.`,
      R`As \(x \to -\infty\), \(f(x) \to ${arrow(ends[0])}\); as \(x \to \infty\), \(f(x) \to ${arrow(ends[1])}\). ${ENDS[ends]}.`,
    ],
    rule: 3,
    skill: 'end behaviour',
    check: () => {
      const dir = (x) => (polyEval(coefs, x) > 0 ? 'u' : 'd');
      return dir(-1000) + dir(1000) === ends ? true : 'values far from 0 do not match the stated end behaviour';
    },
  });
}

// "2(8) - 3(4) + 5(2) - 1" for p(c), then the products.
function substitutionTex(coefs, c) {
  const n = coefs.length - 1;
  const shown = terms(coefs.map((a, i) => [a, i === n ? '' : `(${c ** (n - i)})`]));
  const products = terms(coefs.map((a, i) => [a * c ** (n - i), '']));
  return `${shown} = ${products}`;
}

function easyRemainder(rng) {
  const coefs = [rng.pick([1, 1, 2, -1, 3]), rng.int(-6, 6), rng.int(-9, 9), rng.nonzero(-9, 9)].slice(rng.int(0, 1));
  if (coefs[0] === 0) coefs[0] = 1;
  const c = rng.pick([-3, -2, -1, 1, 2, 3]);
  const value = polyEval(coefs, c);
  return q({
    prompt: R`What is the remainder when \(p(x) = ${poly(coefs)}\) is divided by \(${linear(1, -c)}\)?`,
    correct: value,
    wrong: [
      { value: polyEval(coefs, -c), why: R`The divisor \(${linear(1, -c)}\) is zero when \(x = ${c}\), so evaluate \(p(${c})\), not \(p(${-c})\).` },
      { value: coefs[coefs.length - 1], why: R`The constant term is \(p(0)\). The remainder here is \(p(${c})\).` },
      value + c,
      -value,
    ],
    solution: [
      R`Remainder theorem: dividing \(p(x)\) by \(x - c\) leaves the remainder \(p(c)\). Here \(c = ${c}\).`,
      R`\(p(${c}) = ${substitutionTex(coefs, c)} = ${value}\).`,
      R`The remainder is \(${value}\).`,
    ],
    rule: 1,
    skill: 'remainder theorem',
    check: () => (synth(coefs, c).remainder === value ? true : `synthetic division gives remainder ${synth(coefs, c).remainder}`),
  });
}

function easyZerosFactored(rng) {
  const rs = rng.sample([-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7], 3);
  const lead = rng.pick([1, 1, 2, 3, -1, -2, 5]);
  const zeros = rs.map((r) => [r, 1]);
  const others = [8, 9, -8, -9].filter((v) => v !== lead);
  return q({
    prompt: R`Find the zeros of \(f(x) = ${factoredTex(lead, zeros)}\).`,
    correct: M(zerosTex(rs)),
    wrong: [
      { value: M(zerosTex(rs.map((r) => -r))), why: R`A factor \((x - r)\) is zero when \(x = r\), so the sign is the opposite of the one inside the parentheses.` },
      Math.abs(lead) > 1 && !rs.includes(lead) ? { value: M(zerosTex([...rs, lead])), why: R`The constant factor \(${lead}\) is never zero, so it does not give a zero of the function.` } : null,
      M(zerosTex([-rs[0], rs[1], rs[2]])),
      M(zerosTex([rs[0], -rs[1], -rs[2]])),
      M(zerosTex([rs[0], rs[1], others[0]])),
      M(zerosTex([rs[0], others[1], rs[2]])),
      M(zerosTex(rs.map((r) => r + 1))),
    ],
    solution: [
      'A product is zero only when one of its factors is zero.',
      R`Set each factor equal to 0: ${joinList(rs.map((r) => R`\(${r === 0 ? 'x' : linear(1, -r)} = 0\) gives \(x = ${r}\)`))}.`,
      R`The zeros are \(${zerosTex(rs)}\).`,
    ],
    rule: 2,
    skill: 'zeros from factors',
    check: () => checkRoots((x) => evalFactored(lead, zeros, x), rs),
  });
}

function easyTouchOrCross(rng) {
  const rs = rng.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 3);
  const wantTouch = rng.bool(0.6);
  // Exactly one zero has the behaviour asked about.
  const special = wantTouch ? rng.pick([2, 2, 4]) : rng.pick([1, 3]);
  const other = () => (wantTouch ? rng.pick([1, 1, 3]) : rng.pick([2, 2, 4]));
  const zeros = rng.shuffle([[rs[0], special], [rs[1], other()], [rs[2], other()]]);
  const lead = rng.pick([1, 1, -1, 2]);
  const describe = (m) => (m % 2 === 0 ? 'even, so the graph touches the axis and turns back' : 'odd, so the graph crosses the axis');
  return q({
    prompt: R`At which zero does the graph of \(f(x) = ${factoredTex(lead, zeros)}\) ${wantTouch ? 'touch the x-axis and turn back without crossing it' : 'cross the x-axis'}?`,
    correct: rs[0],
    fmt: asX,
    wrong: [
      { value: rs[1], why: `At that zero the multiplicity is ${wantTouch ? 'odd, so the graph crosses' : 'even, so the graph only touches'} the axis.` },
      rs[2],
      { value: -rs[0], why: R`The factor \(${factor(rs[0])}\) is zero at \(x = ${rs[0]}\), not \(x = ${-rs[0]}\).` },
    ],
    solution: [
      'The exponent on each factor is the multiplicity of that zero.',
      ...zeros.map(([r, m]) => R`\(x = ${r}\): multiplicity ${m}, which is ${describe(m)}.`),
      R`So the graph ${wantTouch ? 'touches without crossing' : 'crosses'} at \(x = ${rs[0]}\).`,
    ],
    rule: 2,
    skill: 'multiplicity',
    check: () => {
      const f = (x) => evalFactored(lead, zeros, x);
      const crosses = (r) => Math.sign(f(r - 0.01)) !== Math.sign(f(r + 0.01));
      const ok = crosses(rs[0]) !== wantTouch && crosses(rs[1]) === wantTouch && crosses(rs[2]) === wantTouch;
      return ok ? true : 'the sign changes near the zeros do not match';
    },
  });
}

// ───────────── Medium ─────────────

function mediumSynthetic(rng) {
  const quot = [rng.pick([1, 1, 1, 2, 3]), rng.int(-6, 6), rng.int(-6, 6)];
  const c = rng.nonzero(-4, 4);
  const rem = rng.bool(0.45) ? 0 : rng.nonzero(-9, 9);
  const P = polyAdd(polyMul(quot, [1, -c]), [rem]);
  const den = linear(1, -c);
  const hasZero = P.some((v, i) => v === 0 && i < P.length - 1);
  const flip = synth(P, -c);
  const at = (qc, r) => (x) => polyEval(qc, x) + r / (x - c);
  const choice = symChoices(
    { tex: divResultTex(quot, rem, den), f: at(quot, rem) },
    [
      { tex: divResultTex(flip.quotient, flip.remainder, den), f: at(flip.quotient, flip.remainder), why: R`For the divisor \(${den}\), the number in the box is \(${c}\), the value that makes \(${den} = 0\).` },
      { tex: poly([...quot, rem]), f: (x) => polyEval([...quot, rem], x), why: 'The quotient is one degree lower than the dividend, and the last number in the bottom row is the remainder.' },
      rem !== 0 ? { tex: divResultTex(quot, -rem, den), f: at(quot, -rem) } : null,
      { tex: divResultTex([quot[0], quot[1], quot[2] + c], rem, den), f: at([quot[0], quot[1], quot[2] + c], rem) },
      { tex: divResultTex([quot[0], -quot[1] || 1, quot[2]], rem + 1, den), f: at([quot[0], -quot[1] || 1, quot[2]], rem + 1) },
    ],
  );
  return q({
    prompt: R`Divide using synthetic division: \(\;(${poly(P)}) \div (${den})\)`,
    ...choice,
    solution: [
      R`The divisor is \(${den}\), so put \(${c}\) in the box. List the coefficients of the dividend${hasZero ? ', writing 0 for the missing term' : ''}: \(${P.join(',\\; ')}\).`,
      R`Bring down the first coefficient. Then multiply by \(${c}\), write the result under the next coefficient, add, and repeat: \[${synthTex(P, c)}\]`,
      R`The bottom row gives the quotient \(${poly(quot)}\) and the remainder \(${rem}\).`,
      R`Result: \(${divResultTex(quot, rem, den)}\).`,
    ],
    rule: 0,
    skill: 'synthetic division',
    check: () => checkSame((x) => polyEval(P, x) / (x - c), at(quot, rem)),
  });
}

function mediumWhichFactor(rng) {
  const roots = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 3);
  const P = expand(1, roots.map((r) => [r, 1]));
  const r = roots[0];
  const pool = [-r, -roots[1], -roots[2], ...rng.shuffle([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6])].filter((w) => !roots.includes(w));
  const wrongRoots = [...new Set(pool)].slice(0, 3);
  const F = (c) => M(linear(1, -c));
  return q({
    prompt: R`Which of these is a factor of \(p(x) = ${poly(P)}\)?`,
    correct: F(r),
    wrong: wrongRoots.map((w, i) => (i === 0 ? { value: F(w), why: R`Test it: \(p(${w}) = ${polyEval(P, w)}\), which is not 0, so \(${linear(1, -w)}\) is not a factor.` } : F(w))),
    solution: [
      R`Factor theorem: \(x - c\) is a factor of \(p(x)\) exactly when \(p(c) = 0\).`,
      R`Test \(c = ${r}\): \(p(${r}) = ${substitutionTex(P, r)} = 0\). So \(${linear(1, -r)}\) is a factor.`,
      R`The other choices fail the test: ${joinList(wrongRoots.map((w) => R`\(p(${w}) = ${polyEval(P, w)}\)`))}.`,
    ],
    rule: 1,
    skill: 'factor theorem',
    check: () => (polyEval(P, r) === 0 && wrongRoots.every((w) => polyEval(P, w) !== 0) ? true : 'the factor test does not single out one choice'),
  });
}

function mediumRationalRoot(rng) {
  let a;
  let d;
  do {
    a = rng.pick([2, 3, 4, 5, 6, 8, 9]);
    d = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10]);
  } while (gcd(a, d) !== 1);
  const coefs = [a, rng.int(-9, 9), rng.int(-9, 9), d * rng.sign()];
  const isCandidate = (f) => d % Math.abs(f.n) === 0 && a % f.d === 0;
  const qs = divisors(a).filter((v) => v > 1);
  const right = frac(rng.pick(divisors(d)) * rng.sign(), rng.pick(qs));
  const s = rng.sign();
  const wrong = [
    { value: frac(s * a, d), why: R`The fraction is upside down. Factors of the constant term go on top; factors of the leading coefficient go on the bottom.` },
    { value: frac(-s * a, 1), why: R`An integer candidate must divide the constant term \(${coefs[3]}\). \(${a}\) is the leading coefficient.` },
    frac(s, d),
    frac(s * 2 * a, d),
  ].filter((w) => !isCandidate(w.value ?? w));
  const list = [];
  for (const p of divisors(d)) for (const qv of divisors(a)) if (!list.some((f) => f.eq(frac(p, qv)))) list.push(frac(p, qv));
  list.sort((x, y) => x.value - y.value);
  return q({
    prompt: R`According to the rational root theorem, which of these could be a zero of \(f(x) = ${poly(coefs)}\)?`,
    correct: right,
    wrong,
    solution: [
      R`A rational zero \(\frac{p}{q}\) must have \(p\) dividing the constant term \(${coefs[3]}\) and \(q\) dividing the leading coefficient \(${a}\).`,
      R`Factors of \(${d}\): \(${divisors(d).join(', ')}\). Factors of \(${a}\): \(${divisors(a).join(', ')}\).`,
      R`Possible rational zeros: \(${list.map((f) => R`\pm ${f.tex()}`).join(',\\; ')}\).`,
      R`Of the choices, only \(${right.tex()}\) is on the list.`,
    ],
    rule: 4,
    skill: 'rational root theorem',
    check: () => (isCandidate(right) && wrong.length >= 3 ? true : 'the answer is not a candidate, or too few wrong answers remain'),
  });
}

function mediumCubes(rng) {
  let a;
  let b;
  do {
    a = rng.int(1, 4);
    b = rng.int(1, 5);
  } while (gcd(a, b) !== 1);
  const s = rng.sign();
  const y = rng.bool(0.35) ? 'y' : '';
  const y0 = y ? 1.3 : 1; // value used for y when comparing choices numerically
  const bin = (sign) => `(${terms([[a, 'x'], [sign * b, y]])})`;
  const tri = (mid) => `(${terms([[a * a, 'x^{2}'], [mid, `x${y}`], [b * b, y ? 'y^{2}' : '']])})`;
  const f = (binSign, mid) => (x) => (a * x + binSign * b * y0) * (a * a * x * x + mid * x * y0 + b * b * y0 * y0);
  const A = a === 1 ? 'x' : `${a}x`;
  const B = y ? (b === 1 ? 'y' : `${b}y`) : `${b}`;
  const expr = terms([[a ** 3, 'x^{3}'], [s * b ** 3, y ? 'y^{3}' : '']]);
  return q({
    prompt: R`Factor completely: \(${expr}\)`,
    ...symChoices(
      { tex: bin(s) + tri(-s * a * b), f: f(s, -s * a * b) },
      [
        { tex: bin(s) + tri(s * a * b), f: f(s, s * a * b), why: 'In the trinomial factor, the middle term has the opposite sign to the binomial factor.' },
        { tex: bin(s) + tri(-2 * s * a * b), f: f(s, -2 * s * a * b), why: R`The middle term is \(ab\), not \(2ab\). A middle term of \(2ab\) belongs to a perfect-square trinomial.` },
        { tex: `${bin(s)}^{3}`, f: (x) => (a * x + s * b * y0) ** 3, why: R`\((a ${s > 0 ? '+' : '-'} b)^{3}\) has extra middle terms when it is expanded, so it is not \(a^{3} ${s > 0 ? '+' : '-'} b^{3}\).` },
        { tex: bin(-s) + tri(s * a * b), f: f(-s, s * a * b) },
      ],
    ),
    solution: [
      R`Write each term as a cube: \(${expr} = (${A})^{3} ${s > 0 ? '+' : '-'} (${B})^{3}\).`,
      s > 0 ? R`Sum of cubes: \(a^{3} + b^{3} = (a + b)(a^{2} - ab + b^{2})\), with \(a = ${A}\) and \(b = ${B}\).` : R`Difference of cubes: \(a^{3} - b^{3} = (a - b)(a^{2} + ab + b^{2})\), with \(a = ${A}\) and \(b = ${B}\).`,
      R`\(${expr} = ${bin(s)}${tri(-s * a * b)}\). The trinomial factor has no real zeros, so it cannot be factored further.`,
    ],
    rule: 5,
    skill: 'sum and difference of cubes',
    check: () => checkSame((x) => a ** 3 * x ** 3 + s * b ** 3 * y0 ** 3, f(s, -s * a * b)),
  });
}

function mediumBoxBase(rng) {
  const [h, a, b] = rng.sample([1, 2, 3, 4, 5, 6, 7], 3);
  const V = expand(1, [[-h, 1], [-a, 1], [-b, 1]]);
  const base = [1, a + b, a * b];
  const flip = synth(V, h).quotient;
  const less = polySub(V, [1, h]);
  const [item, unit] = rng.pick([['shipping box', 'cm'], ['storage crate', 'cm'], ['fish tank', 'cm'], ['planter', 'ft'], ['storage shed', 'm'], ['moving van', 'ft']]);
  return q({
    prompt: R`The volume of a ${item} is \(V(x) = ${poly(V)}\) ${unit}³, and its height is \((${linear(1, h)})\) ${unit}. Which expression gives the area of its base?`,
    ...symChoices(
      { tex: poly(base), f: (x) => polyEval(base, x) },
      [
        { tex: poly(flip), f: (x) => polyEval(flip, x), why: R`To divide by \(${linear(1, h)}\), the number in the box is \(${-h}\), because \(${linear(1, h)} = 0\) when \(x = ${-h}\).` },
        { tex: poly(less), f: (x) => polyEval(less, x), why: 'Volume = base area × height, so the base area is the volume divided by the height, not the difference.' },
        { tex: poly([1, a + b, -a * b]), f: (x) => polyEval([1, a + b, -a * b], x) },
        { tex: poly([1, a + b + h, a * b]), f: (x) => polyEval([1, a + b + h, a * b], x) },
      ],
    ),
    solution: [
      R`Volume = base area × height, so base area \(= V(x) \div (${linear(1, h)})\).`,
      R`Synthetic division with \(${-h}\) in the box: \[${synthTex(V, -h)}\]`,
      R`The remainder is 0 and the quotient is \(${poly(base)}\). That is the area of the base in ${unit}².`,
    ],
    rule: 0,
    skill: 'division in context',
    check: () => checkSame((x) => polyEval(V, x) / (x + h), (x) => polyEval(base, x)),
  });
}

// ───────────── Hard ─────────────

function hardZerosCubic(rng) {
  const rational = rng.bool(0.4);
  const [r1, r2, r3] = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 3);
  let P;
  let zeros;
  let quotFactored;
  let wrongs;
  if (rational) {
    const k = rng.pick([2, 3]);
    const m = rng.pick([-5, -4, -2, -1, 1, 2, 4, 5].filter((v) => gcd(v, k) === 1));
    const z = frac(m, k);
    P = polyMul([k, -m], polyMul([1, -r1], [1, -r2]));
    zeros = [r1, r2, z];
    quotFactored = `(${linear(k, -m)})${factor(r2)}`;
    wrongs = [
      { value: M(zerosTex([r1, r2, m])), why: R`The factor \(${linear(k, -m)}\) is zero when \(${k}x = ${m}\), so \(x = ${z.tex()}\).` },
      { value: M(zerosTex([-r1, -r2, z.neg()])), why: R`A factor \((x - r)\) gives the zero \(x = r\). Check the signs.` },
      { value: M(zerosTex([r2, z])), why: R`The given zero \(x = ${r1}\) is still a zero. A cubic can have three.` },
      M(zerosTex([r1, r2, z.neg()])),
      M(zerosTex([r1, -r2, z])),
    ];
  } else {
    P = expand(1, [[r1, 1], [r2, 1], [r3, 1]]);
    zeros = [r1, r2, r3];
    quotFactored = factor(r2) + factor(r3);
    wrongs = [
      { value: M(zerosTex([r1, -r2, -r3])), why: R`The quotient factors as \(${quotFactored}\), and each factor \((x - r)\) gives the zero \(x = r\).` },
      { value: M(zerosTex([r2, r3])), why: R`The given zero \(x = ${r1}\) is still a zero. A cubic can have three.` },
      M(zerosTex([-r1, -r2, -r3])),
      M(zerosTex([-r1, r2, r3])),
      M(zerosTex([r1 + 1, r2 + 1, r3 + 1])),
    ];
  }
  const quot = synth(P, r1).quotient;
  return q({
    prompt: R`One zero of \(p(x) = ${poly(P)}\) is \(x = ${r1}\). Find all the zeros.`,
    correct: M(zerosTex(zeros)),
    wrong: wrongs,
    solution: [
      R`Since \(x = ${r1}\) is a zero, \(${linear(1, -r1)}\) is a factor. Divide it out with synthetic division: \[${synthTex(P, r1)}\]`,
      R`The quotient is \(${poly(quot)}\), so \(p(x) = (${linear(1, -r1)})(${poly(quot)})\).`,
      R`Factor the quadratic: \(${poly(quot)} = ${quotFactored}\).`,
      R`Set each factor equal to 0: \(${zerosTex(zeros)}\).`,
    ],
    rule: 1,
    skill: 'finding all zeros',
    check: () => checkRoots((x) => polyEval(P, x), zeros.map(val)),
  });
}

function hardBuildFromZeros(rng) {
  const double = rng.bool(0.45);
  const picks = rng.sample([-4, -3, -2, -1, 0, 1, 2, 3, 4], double ? 2 : 3).sort((x, y) => x - y);
  const zeros = double ? rng.shuffle([[picks[0], 2], [picks[1], 1]]) : picks.map((r) => [r, 1]);
  const a = rng.pick([-3, -2, -1, 2, 3]);
  const x0 = [0, 1, -1, 2, -2].find((v) => !picks.includes(v));
  const K = evalFactored(1, zeros, x0);
  const y0 = a * K;
  const opt = (lead, zs, why) => ({ tex: `f(x) = ${factoredTex(lead, zs)}`, f: (x) => evalFactored(lead, zs, x), why });
  const flipped = zeros.map(([r, m]) => [-r, m]);
  const story = double
    ? R`A cubic function has a zero at \(x = ${zeros.find((z) => z[1] === 2)[0]}\) where its graph touches the x-axis without crossing, and another zero at \(x = ${zeros.find((z) => z[1] === 1)[0]}\).`
    : R`A cubic function has zeros at ${joinList(picks.map((r) => R`\(x = ${r}\)`))}.`;
  return q({
    prompt: R`${story} Its graph passes through \((${x0}, ${y0})\). Which function is it?`,
    ...symChoices(opt(a, zeros), [
      opt(1, zeros, R`Check the extra point: this function gives \(f(${x0}) = ${K}\), not \(${y0}\). A leading coefficient is needed.`),
      opt(a, flipped, R`A zero at \(x = r\) comes from the factor \((x - r)\), so the signs inside the factors are the opposite of the zeros.`),
      opt(-a, zeros),
      y0 !== a ? opt(y0, zeros) : null,
      opt(2 * a, zeros),
    ]),
    solution: [
      R`Start from the zeros${double ? ' (the touching zero has multiplicity 2)' : ''}: \(f(x) = ${factoredTex(1, zeros).replace(/^/, 'a')}\).`,
      R`Substitute the point \((${x0}, ${y0})\): \(${y0} = a \cdot ${paren(K)}\).`,
      R`Solve: \(a = ${a}\). So \(f(x) = ${factoredTex(a, zeros)}\).`,
    ],
    rule: 6,
    skill: 'building a polynomial',
    check: () => {
      const f = (x) => evalFactored(a, zeros, x);
      return f(x0) === y0 && picks.every((r) => f(r) === 0) ? true : 'the function misses a zero or the given point';
    },
  });
}

function hardLongDivision(rng) {
  const d = [1, rng.int(-4, 4), rng.nonzero(-5, 5)];
  const s = rng.nonzero(-5, 5);
  const quot = [rng.pick([1, 1, 2, 3]), s];
  let rem;
  do {
    rem = [rng.int(-6, 6), rng.int(-9, 9)];
  } while (rem[0] === 0 && rem[1] === 0);
  const P = polyAdd(polyMul(d, quot), rem);
  const den = poly(d);
  const at = (qc, rc) => (x) => polyEval(qc, x) + polyEval(rc, x) / polyEval(d, x);
  const first = polyMul([quot[0], 0], d);
  const cur = polySub(P, first);
  const second = polyMul([s], d);
  const addSlip = [rem[0] + 2 * s * d[1], rem[1] + 2 * s * d[2]];
  const xs = [0.37, 1.29, 2.23, 3.1, -0.6].filter((x) => Math.abs(polyEval(d, x)) > 0.3);
  return q({
    prompt: R`Use long division: \(\;(${poly(P)}) \div (${den})\)`,
    ...symChoices(
      { tex: divResultTex(quot, rem, den), f: at(quot, rem) },
      [
        { tex: divResultTex(quot, addSlip, den), f: at(quot, addSlip), why: R`In the last step, subtract \(${poly(second)}\) from \(${poly(cur)}\). Subtracting changes the sign of every term in the row being subtracted.` },
        { tex: poly(quot), f: (x) => polyEval(quot, x), why: R`The division is not exact. The remainder \(${poly(rem)}\) has to be included, written over the divisor.` },
        { tex: divResultTex(quot, rem.map((v) => -v), den), f: at(quot, rem.map((v) => -v)) },
        { tex: divResultTex([quot[0], -s], rem, den), f: at([quot[0], -s], rem) },
      ],
      xs,
    ),
    solution: [
      R`Divide the leading terms: \(${terms([[P[0], 'x^{3}']])} \div x^{2} = ${terms([[quot[0], 'x']])}\). Multiply: \(${terms([[quot[0], 'x']])}(${den}) = ${poly(first)}\). Subtract from the dividend to get \(${poly(cur)}\).`,
      R`Divide the leading terms again: \(${terms([[cur[0], 'x^{2}']])} \div x^{2} = ${s}\). Multiply: \(${s}(${den}) = ${poly(second)}\). Subtract to get \(${poly(rem)}\).`,
      R`The degree of \(${poly(rem)}\) is less than the degree of the divisor, so it is the remainder.`,
      R`Result: \(${divResultTex(quot, rem, den)}\).`,
    ],
    rule: 0,
    skill: 'long division',
    check: () => checkSame((x) => polyEval(P, x) / polyEval(d, x), at(quot, rem), xs),
  });
}

function hardMatchGraph(rng) {
  const lead = rng.sign();
  let zeros;
  let wrongs;
  let seen; // what the graph shows, as plain text (for the picture) and as rich text (for the solution)
  const opt = (l, zs, why) => ({ tex: `f(x) = ${factoredTex(l, zs)}`, f: (x) => evalFactored(l, zs, x), why });
  const rightEnd = `Look at the right end of the graph: it ${lead > 0 ? 'rises' : 'falls'}, so the leading coefficient is ${lead > 0 ? 'positive' : 'negative'}.`;
  if (rng.bool(0.6)) {
    const r1 = rng.int(-3, 3);
    const r2 = rng.pick([r1 - 3, r1 - 2, r1 + 2, r1 + 3].filter((v) => Math.abs(v) <= 3));
    zeros = [[r1, 1], [r2, 2]];
    seen = {
      alt: `It crosses the x-axis at x = ${txt(r1)} and touches the x-axis at x = ${txt(r2)} without crossing.`,
      rich: R`The graph crosses the x-axis at \(x = ${r1}\) and touches it without crossing at \(x = ${r2}\).`,
      why: R`Crossing means odd multiplicity, so \(${factor(r1)}\) appears once. Touching without crossing means even multiplicity, so \(${factor(r2)}\) is squared.`,
    };
    wrongs = [
      opt(lead, [[r1, 2], [r2, 1]], R`The graph touches the axis at \(x = ${r2}\), so that zero has even multiplicity. It crosses at \(x = ${r1}\), so that zero has odd multiplicity.`),
      opt(-lead, zeros, rightEnd),
      opt(lead, [[-r1, 1], [-r2, 2]]),
      opt(-lead, [[r1, 2], [r2, 1]]),
      opt(lead, [[r1, 1], [r2, 1]]),
    ];
  } else {
    const start = rng.int(-3, 0);
    const mid = start + rng.int(1, 2);
    const end = mid + rng.int(1, 2);
    zeros = [[start, 1], [mid, 1], [end, 1]];
    seen = {
      alt: `It crosses the x-axis at x = ${txt(start)}, x = ${txt(mid)} and x = ${txt(end)}.`,
      rich: R`The graph crosses the x-axis at \(x = ${start}\), \(x = ${mid}\) and \(x = ${end}\).`,
      why: 'Each crossing means odd multiplicity, so each factor appears once.',
    };
    wrongs = [
      opt(-lead, zeros, rightEnd),
      opt(lead, zeros.map(([r, m]) => [-r, m]), R`A zero at \(x = r\) comes from the factor \((x - r)\).`),
      opt(lead, [[start, 2], [mid, 1], [end, 1]]),
      opt(lead, [[start, 1], [end, 1]]),
      opt(-lead, zeros.map(([r, m]) => [-r, m])),
    ];
  }
  const xs = zeros.map((z) => z[0]);
  const f = (x) => evalFactored(lead, zeros, x);
  return q({
    prompt: 'Which function has this graph?',
    ...symChoices(opt(lead, zeros), wrongs),
    visual: {
      type: 'plot',
      x: [Math.min(...xs) - 1.5, Math.max(...xs) + 1.5],
      y: [-6, 6],
      step: [1, 2],
      fns: [{ f }],
      points: xs.map((x) => ({ x, y: 0 })),
      alt: `Graph of a polynomial function. ${seen.alt} Its left end ${lead > 0 ? 'falls' : 'rises'} and its right end ${lead > 0 ? 'rises' : 'falls'}.`,
    },
    solution: [
      seen.rich,
      R`${seen.why} That gives the factors \(${factoredTex(1, zeros)}\).`,
      `The right end of the graph ${lead > 0 ? 'rises' : 'falls'}, so the leading coefficient is ${lead > 0 ? 'positive' : 'negative'}.`,
      R`So \(f(x) = ${factoredTex(lead, zeros)}\).`,
    ],
    rule: 2,
    skill: 'graphs and multiplicity',
    check: () => {
      const crosses = (r) => Math.sign(f(r - 0.01)) !== Math.sign(f(r + 0.01));
      return zeros.every(([r, m]) => Math.abs(f(r)) < 1e-12 && crosses(r) === (m % 2 === 1)) && Math.sign(f(50)) === lead && Math.sign(f(-50)) === -lead ? true : 'graph features do not match the function';
    },
  });
}

function hardWordBox(rng) {
  const x0 = rng.int(2, 7);
  const a = rng.int(1, 4);
  const b = a + rng.int(1, 4);
  const V = x0 * (x0 + a) * (x0 + b);
  const coefs = [1, a + b, a * b, -V];
  const quot = synth(coefs, x0).quotient;
  const [thing, unit] = rng.pick([['storage box', 'cm'], ['gift box', 'cm'], ['packing crate', 'cm'], ['raised garden bed', 'ft'], ['storage chest', 'ft'], ['water tank', 'm']]);
  return q({
    prompt: R`A ${thing} is \(x\) ${unit} wide, \(${linear(1, a)}\) ${unit} long and \(${linear(1, b)}\) ${unit} high. Its volume is ${V} ${unit}³. What is its width?`,
    correct: x0,
    unit,
    wrong: [
      { value: x0 + a, why: 'That is the length. The question asks for the width, x.' },
      { value: x0 + b, why: 'That is the height. The question asks for the width, x.' },
      x0 + 1,
      x0 - 1,
    ],
    solution: [
      R`Volume = width × length × height: \(x(${linear(1, a)})(${linear(1, b)}) = ${V}\).`,
      R`Expand and move everything to one side: \(${poly(coefs)} = 0\).`,
      R`Test positive factors of \(${V}\) (rational root theorem). \(x = ${x0}\) works: \(${x0} \cdot ${x0 + a} \cdot ${x0 + b} = ${V}\).`,
      R`Dividing out \(${linear(1, -x0)}\) leaves \(${poly(quot)}\), which has no positive zeros because all of its coefficients are positive. So the width is ${x0} ${unit}.`,
    ],
    rule: 4,
    skill: 'polynomial equations in context',
    check: () => (quot.every((c) => c > 0) ? checkRoots((x) => x * (x + a) * (x + b) - V, [x0]) : 'another positive solution may exist'),
  });
}

// ───────────── Challenge ─────────────

function challengeFindK(rng) {
  const c = rng.pick([-3, -2, -1, 1, 2, 3]);
  const k = rng.nonzero(-6, 6);
  const slot = rng.pick([1, 2]); // k is the coefficient of x² (slot 1) or of x (slot 2)
  const coefs = [1, rng.int(-6, 6), rng.int(-6, 6), rng.nonzero(-9, 9)];
  coefs[slot] = k;
  const asFactor = rng.bool(0.4);
  if (asFactor) coefs[3] -= polyEval(coefs, c);
  if (coefs[3] === 0) return challengeFindK(rng);
  const rem = polyEval(coefs, c);
  const sym = slot === 1 ? 'kx^{2}' : 'kx';
  const shown = terms([[1, 'x^{3}'], slot === 1 ? [1, sym] : [coefs[1], 'x^{2}'], slot === 2 ? [1, sym] : [coefs[2], 'x'], [coefs[3], '']]);
  const power = c ** (3 - slot);
  const rest = rem - k * power; // everything in p(c) except the k term
  const solveWith = (cc, target) => {
    const other = coefs.reduce((acc, v, i) => acc + (i === slot ? 0 : v * cc ** (3 - i)), 0);
    return tryFrac(target - other, cc ** (3 - slot));
  };
  return q({
    prompt: asFactor
      ? R`For what value of \(k\) is \(${linear(1, -c)}\) a factor of \(p(x) = ${shown}\)?`
      : R`When \(p(x) = ${shown}\) is divided by \(${linear(1, -c)}\), the remainder is \(${rem}\). What is \(k\)?`,
    correct: k,
    fmt: (v) => M(`k = ${num(v)}`),
    wrong: [
      { value: solveWith(-c, rem), why: R`The divisor \(${linear(1, -c)}\) is zero at \(x = ${c}\), so substitute \(x = ${c}\), not \(x = ${-c}\).` },
      { value: tryFrac(rem + rest, power), why: 'When the other numbers move to the right-hand side, their signs change.' },
      -k,
      asFactor ? null : solveWith(c, 0),
      k + 1,
    ],
    solution: [
      asFactor ? R`Factor theorem: \(${linear(1, -c)}\) is a factor exactly when \(p(${c}) = 0\).` : R`Remainder theorem: the remainder equals \(p(${c})\), so \(p(${c}) = ${rem}\).`,
      R`Substitute \(x = ${c}\): the term with \(k\) becomes \(${terms([[power, 'k']])}\) and the other terms add up to \(${rest}\). So \(${terms([[power, 'k'], [rest, '']])} = ${rem}\).`,
      power === 1 ? R`Solve: \(k = ${k}\).` : R`Solve: \(${terms([[power, 'k']])} = ${rem - rest}\), so \(k = ${k}\).`,
    ],
    rule: 1,
    skill: 'working backwards',
    check: () => (synth(coefs, c).remainder === rem ? true : 'synthetic division gives a different remainder'),
  });
}

function challengeAllZeros(rng) {
  const r = rng.nonzero(-6, 6);
  const real = rng.bool(0.5);
  const n = real ? rng.pick([2, 3, 5, 6, 7, 10]) : rng.pick([1, 2, 3, 4, 5, 9]);
  const P = polyMul([1, -r], [1, 0, real ? -n : n]);
  const root = Number.isInteger(Math.sqrt(n)) ? `${Math.sqrt(n) === 1 ? '' : Math.sqrt(n)}` : R`\sqrt{${n}}`;
  const iRoot = Number.isInteger(Math.sqrt(n)) ? `${root}i` : `i${root}`;
  const Z = (first, pair) => M(`x = ${first}${pair ? `,\\; \\pm ${pair}` : ''}`);
  const group = terms([[1, 'x^{2}'], [real ? -n : n, '']]);
  return q({
    prompt: R`Find all the zeros of \(p(x) = ${poly(P)}\), including any that are not real.`,
    correct: Z(r, real ? root : iRoot),
    wrong: real
      ? [
        { value: Z(r, n), why: R`\(x^{2} = ${n}\) gives \(x = \pm\sqrt{${n}}\), not \(\pm ${n}\).` },
        { value: Z(r, iRoot), why: R`\(x^{2} - ${n} = 0\) means \(x^{2} = ${n}\), which has real solutions.` },
        Z(-r, root),
        Z(r, ''),
      ]
      : [
        { value: Z(r, root || '1'), why: R`\(x^{2} + ${n} = 0\) means \(x^{2} = -${n}\), so these two zeros are imaginary.` },
        { value: Z(r, ''), why: 'A cubic has three zeros when complex zeros are counted. The quadratic factor gives two more.' },
        Z(-r, iRoot),
        Z(r, `${n === 1 ? 2 : n}i`),
      ],
    solution: [
      R`Factor by grouping: \(${poly(P)} = x^{2}(${linear(1, -r)}) ${real ? '-' : '+'} ${n}(${linear(1, -r)}) = (${linear(1, -r)})(${group})\).`,
      R`\(${linear(1, -r)} = 0\) gives \(x = ${r}\).`,
      real ? R`\(${group} = 0\) gives \(x^{2} = ${n}\), so \(x = \pm ${root}\).` : R`\(${group} = 0\) gives \(x^{2} = -${n}\), so \(x = \pm\sqrt{-${n}} = \pm ${iRoot}\).`,
      R`The zeros are \(x = ${r}\) and \(x = \pm ${real ? root : iRoot}\).`,
    ],
    rule: 1,
    skill: 'finding all zeros',
    check: () => (polyEval(P, r) !== 0 ? 'the rational zero fails' : real ? checkRoots((x) => polyEval(P, x), [Math.sqrt(n), -Math.sqrt(n)]) : checkComplexRoot(P, [0, Math.sqrt(n)])),
  });
}

function challengeLeastDegree(rng) {
  const t = rng.int(1, 2);
  const c = rng.int(1, 3);
  const xs = rng.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], t + c);
  const touch = xs.slice(0, t).sort((a, b) => a - b);
  const cross = xs.slice(t).sort((a, b) => a - b);
  const lead = rng.sign();
  const degree = 2 * t + c;
  const ends = endsOf(degree, lead);
  const endText = { uu: 'rises on both ends', dd: 'falls on both ends', du: 'falls on the left and rises on the right', ud: 'rises on the left and falls on the right' }[ends];
  const list = (vals) => joinList(vals.map((v) => R`\(x = ${v}\)`));
  const say = (deg, sign) => `Degree ${deg}, ${sign > 0 ? 'positive' : 'negative'} leading coefficient`;
  return q({
    prompt: R`The graph of a polynomial touches the x-axis without crossing at ${list(touch)}, crosses it at ${list(cross)}, and has no other x-intercepts. The graph ${endText}. What is the least possible degree, and what is the sign of the leading coefficient?`,
    correct: say(degree, lead),
    wrong: [
      { value: say(t + c, lead), why: 'A zero where the graph touches without crossing has even multiplicity, so it counts at least twice toward the degree.' },
      { value: say(degree, -lead), why: `The right end of the graph ${lead > 0 ? 'rises' : 'falls'}, which means the leading coefficient is ${lead > 0 ? 'positive' : 'negative'}.` },
      say(t + c, -lead),
      say(degree + 1, lead),
    ],
    solution: [
      `Each crossing needs multiplicity at least 1 (odd). Each touching point needs multiplicity at least 2 (even).`,
      R`Least degree: \(${t} \cdot 2 + ${c} \cdot 1 = ${degree}\).`,
      `The right end ${lead > 0 ? 'rises' : 'falls'}, so the leading coefficient is ${lead > 0 ? 'positive' : 'negative'}. (Degree ${degree} is ${degree % 2 ? 'odd' : 'even'}, which agrees with the ends going ${degree % 2 ? 'opposite ways' : 'the same way'}.)`,
    ],
    rule: 2,
    skill: 'degree from a graph',
    check: () => {
      const zeros = [...touch.map((r) => [r, 2]), ...cross.map((r) => [r, 1])];
      const f = (x) => evalFactored(lead, zeros, x);
      const dir = (x) => (f(x) > 0 ? 'u' : 'd');
      return dir(-100) + dir(100) === ends ? true : 'end behaviour in the prompt does not match the answer';
    },
  });
}

function challengeComplexZero(rng) {
  const r = rng.nonzero(-5, 5);
  const p = rng.nonzero(-4, 4);
  const qq = rng.int(1, 4);
  const quad = [1, -2 * p, p * p + qq * qq];
  const P = polyMul([1, -r], quad);
  const opt = (coefs, why) => ({ tex: poly(coefs), f: (x) => polyEval(coefs, x), why });
  return q({
    prompt: R`A cubic polynomial with real coefficients and leading coefficient 1 has zeros \(${r}\) and \(${cx(p, qq)}\). Which polynomial is it?`,
    ...symChoices(opt(P), [
      opt(polyMul([1, -r], [1, -2 * p, p * p - qq * qq]), R`\((${cx(p, qq)})(${cx(p, -qq)}) = ${p * p} + ${qq * qq}\), because \(i^{2} = -1\).`),
      opt(polyMul([1, r], quad), R`The zero \(${r}\) comes from the factor \(${linear(1, -r)}\).`),
      opt(polyMul([1, -r], [1, 2 * p, p * p + qq * qq])),
      opt(polyMul([1, -r], [1, -p, p * p + qq * qq])),
    ]),
    solution: [
      R`Complex zeros of a polynomial with real coefficients come in conjugate pairs, so \(${cx(p, -qq)}\) is also a zero.`,
      R`The pair gives the factor \(x^{2} - (\text{sum})x + (\text{product}) = ${poly(quad)}\), since the sum is \(${2 * p}\) and the product is \(${p * p} + ${qq * qq} = ${p * p + qq * qq}\).`,
      R`Multiply by \(${linear(1, -r)}\): \((${linear(1, -r)})(${poly(quad)}) = ${poly(P)}\).`,
    ],
    rule: 6,
    skill: 'conjugate zeros',
    check: () => (polyEval(P, r) === 0 ? checkComplexRoot(P, [p, qq]) : 'the real zero fails'),
  });
}

// ───────────── Models ─────────────

function syntheticModel({ a3, a2, a1, a0, c }) {
  if (a3 === 0) return { error: 'Choose a leading coefficient other than 0 so that the dividend is a cubic.' };
  const P = [a3, a2, a1, a0];
  const { quotient, remainder } = synth(P, c);
  const den = linear(1, -c);
  return {
    problem: R`\((${poly(P)}) \div (${den})\)`,
    steps: [
      R`The divisor \(${den}\) is zero at \(x = ${c}\), so \(${c}\) goes in the box. List the coefficients of the dividend${P.slice(1, 3).includes(0) ? ', with 0 for each missing term' : ''}: \(${P.join(',\\; ')}\).`,
      R`Bring down \(${a3}\). Then multiply by \(${c}\), write the product under the next coefficient, add, and repeat: \[${synthTex(P, c)}\]`,
      R`The first three numbers in the bottom row are the coefficients of the quotient: \(${poly(quotient)}\). The last number, \(${remainder}\), is the remainder.`,
      remainder === 0 ? R`Remainder theorem: \(p(${c}) = 0\), so \(${den}\) is a factor of the polynomial.` : R`Remainder theorem: \(p(${c}) = ${remainder}\). It is not 0, so \(${den}\) is not a factor.`,
    ],
    answer: M(divResultTex(quotient, remainder, den)),
  };
}

function graphModel({ a, r1, m1, r2, m2 }) {
  if (a === 0) return { error: 'With a = 0 the function is just 0. Choose a different leading coefficient.' };
  const zeros = r1 === r2 ? [[r1, m1 + m2]] : [[r1, m1], [r2, m2]];
  const degree = zeros.reduce((s, z) => s + z[1], 0);
  const f = (x) => evalFactored(a, zeros, x);
  const ends = endsOf(degree, a);
  const lo = Math.min(r1, r2);
  const hi = Math.max(r1, r2);
  let peak = 1;
  for (let i = 0; i <= 60; i++) peak = Math.max(peak, Math.abs(f(lo - 0.6 + ((hi - lo + 1.2) * i) / 60)));
  const behaviour = (m) => (m % 2 === 0 ? 'touches the x-axis and turns back' : m === 1 ? 'crosses the x-axis' : 'crosses the x-axis, flattening as it passes through');
  return {
    problem: R`\(f(x) = ${factoredTex(a, zeros)}\)`,
    steps: [
      zeros.length === 1 ? R`There is one zero, and its multiplicity is the degree: \(${degree}\). The leading coefficient is \(${a}\).` : R`Degree: add the multiplicities, \(${zeros.map((z) => z[1]).join(' + ')} = ${degree}\). The leading coefficient is \(${a}\).`,
      `End behaviour: the degree is ${degree % 2 ? 'odd' : 'even'} and the leading coefficient is ${a > 0 ? 'positive' : 'negative'}, so the graph ${ENDS[ends].toLowerCase()}.`,
      ...zeros.map(([r, m]) => R`Zero at \(x = ${r}\) with multiplicity ${m} (${m % 2 ? 'odd' : 'even'}): the graph ${behaviour(m)}.`),
      R`y-intercept: \(f(0) = ${num(f(0))}\).`,
    ],
    answer: `The graph ${zeros.map(([r, m], i) => `${m % 2 ? 'crosses' : 'touches'} ${i === 0 ? 'the x-axis' : 'it'} at x = ${txt(r)}`).join(' and ')}. It ${ENDS[ends].toLowerCase()}.`,
    visual: {
      type: 'plot',
      x: [lo - 2, hi + 2],
      y: [-peak * 1.4, peak * 1.4],
      fns: [{ f }],
      points: zeros.map(([r]) => ({ x: r, y: 0, color: 'b' })),
      alt: `Graph of the polynomial. ${zeros.map(([r, m]) => `At x = ${txt(r)} it ${behaviour(m)}.`).join(' ')} It ${ENDS[ends].toLowerCase()}.`,
    },
  };
}

function boxModel({ L, W, x }) {
  const limit = Math.min(L, W) / 2;
  if (x >= limit) return { error: `Two cuts of ${num(x)} cm use up the whole ${Math.min(L, W)} cm side. Choose a cut smaller than ${num(limit)} cm.` };
  const V = (t) => t * (L - 2 * t) * (W - 2 * t);
  let best = 0;
  for (let i = 1; i < 400; i++) if (V((limit * i) / 400) > V(best)) best = (limit * i) / 400;
  return {
    problem: R`An open box is made from a ${L} cm by ${W} cm sheet of card by cutting a square of side \(x\) cm from each corner and folding up the sides. What is the volume when \(x = ${num(x)}\)?`,
    steps: [
      R`Folding up the sides makes the height \(x\). Each side of the base loses two cuts: length \(${L} - 2x\), width \(${W} - 2x\).`,
      R`Volume: \(V(x) = x(${L} - 2x)(${W} - 2x) = ${poly([4, -2 * (L + W), L * W, 0])}\), a cubic polynomial.`,
      R`Substitute \(x = ${num(x)}\): \(V = ${num(x)} \cdot ${num(L - 2 * x)} \cdot ${num(W - 2 * x)} = ${num(V(x), { places: 2 })}\).`,
      R`The graph shows that the volume is greatest near \(x \approx ${num(best, { places: 1 })}\), where it is about \(${num(V(best), { places: 0 })}\) cm³.`,
    ],
    answer: R`\(${num(V(x), { places: 2 })}\) cm³`,
    visual: {
      type: 'plot',
      x: [0, limit],
      y: [0, V(best) * 1.15],
      fns: [{ f: V }],
      points: [{ x, y: V(x), label: `V = ${num(V(x), { places: 1 })}` }],
      axisLabels: ['x (cm)', 'V (cm³)'],
      alt: `Graph of the volume of the box against the size of the cut. The volume rises from 0, reaches a highest point near x = ${num(best, { places: 1 })}, and falls back to 0 when the cut is ${num(limit)} cm. The chosen cut of ${num(x)} cm is marked.`,
    },
  };
}

export default {
  id: 'polynomial-functions',
  title: 'Polynomial Functions',
  summary: 'Divide polynomials, find and use their zeros, and connect factors to the shape of the graph.',
  standards: ['CCSS A-APR.B.2', 'CCSS A-APR.B.3', 'CCSS A-APR.D.6', 'CCSS F-IF.C.7'],

  explain: {
    intro: R`A polynomial function such as \(f(x) = x^{3} - 3x^{2} - 6x + 8\) is easiest to understand in factored form. Each factor \((x - r)\) gives a zero, which is an x-intercept of the graph. Division is the tool for finding factors, and the factors together with the leading term tell you the shape of the graph.`,
    rules: [
      {
        title: 'Dividing polynomials',
        text: R`Long division of polynomials works like long division of numbers: divide the leading terms, multiply, subtract, repeat. When the divisor is \(x - c\), synthetic division is a shortcut that uses only the coefficients. Either way, \(\dfrac{p(x)}{d(x)} = q(x) + \dfrac{r(x)}{d(x)}\).`,
        example: R`\((x^{2} + 5x + 7) \div (x + 2) = x + 3 + \dfrac{1}{x + 2}\).`,
      },
      {
        title: 'Remainder and Factor theorems',
        text: R`When \(p(x)\) is divided by \(x - c\), the remainder equals \(p(c)\). So \(x - c\) is a factor of \(p(x)\) exactly when \(p(c) = 0\).`,
        example: R`For \(p(x) = x^{3} - 7x + 6\): \(p(2) = 8 - 14 + 6 = 0\), so \(x - 2\) is a factor.`,
      },
      {
        title: 'Zeros and multiplicity',
        text: R`A factor \((x - r)^{m}\) gives the zero \(x = r\) with multiplicity \(m\). If \(m\) is odd, the graph crosses the x-axis there. If \(m\) is even, the graph touches the axis and turns back.`,
        example: R`\(f(x) = (x + 2)(x - 1)^{2}\) crosses at \(x = -2\) and touches at \(x = 1\).`,
      },
      {
        title: 'End behaviour',
        text: R`The leading term decides what happens far to the left and right. Even degree: both ends go the same way (up if the leading coefficient is positive, down if it is negative). Odd degree: the ends go opposite ways (with a positive leading coefficient the graph falls on the left and rises on the right).`,
        example: R`\(f(x) = -2x^{4} + x\): even degree and a negative leading coefficient, so both ends fall.`,
      },
      {
        title: 'Rational root theorem',
        text: R`If a polynomial with integer coefficients has a rational zero \(\dfrac{p}{q}\) in lowest terms, then \(p\) divides the constant term and \(q\) divides the leading coefficient. That gives a short list of candidates to test.`,
        example: R`For \(2x^{3} + 3x^{2} - 8x + 3\) the candidates are \(\pm 1, \pm 3, \pm\dfrac{1}{2}, \pm\dfrac{3}{2}\). Testing shows \(x = 1\) is a zero.`,
      },
      {
        title: 'Sum and difference of cubes',
        text: R`\(a^{3} + b^{3} = (a + b)(a^{2} - ab + b^{2})\) and \(a^{3} - b^{3} = (a - b)(a^{2} + ab + b^{2})\). The binomial keeps the sign of the original; the middle term of the trinomial takes the opposite sign.`,
        example: R`\(8x^{3} + 27 = (2x)^{3} + 3^{3} = (2x + 3)(4x^{2} - 6x + 9)\).`,
      },
      {
        title: 'Building a polynomial from its zeros',
        text: R`A polynomial with zeros \(r_{1}, r_{2}, \dots\) has the form \(f(x) = a(x - r_{1})(x - r_{2})\cdots\). Use one more point on the graph to find \(a\). If the coefficients are real, complex zeros come in conjugate pairs.`,
        example: R`Zeros \(-1\) and \(3\), through \((0, 6)\): \(f(x) = a(x + 1)(x - 3)\), and \(f(0) = -3a = 6\) gives \(a = -2\).`,
      },
    ],
    vocab: [
      { term: 'zero (root)', def: R`A value of \(x\) that makes \(f(x) = 0\). Real zeros are the x-intercepts of the graph.` },
      { term: 'multiplicity', def: R`How many times a factor appears. In \((x - 1)^{2}\), the zero \(x = 1\) has multiplicity 2.` },
      { term: 'degree', def: 'The highest power of the variable. A polynomial of degree n has n zeros when complex zeros and multiplicities are counted.' },
      { term: 'leading coefficient', def: 'The coefficient of the highest power.' },
      { term: 'synthetic division', def: R`A short way to divide a polynomial by \(x - c\) using only its coefficients.` },
      { term: 'end behaviour', def: R`What \(f(x)\) does as \(x\) goes far to the left or far to the right.` },
    ],
    mistakes: [
      R`Using the wrong number in synthetic division. For the divisor \(x + 2\) the number in the box is \(-2\).`,
      R`Leaving out a missing term. \(x^{3} - 7x + 6\) has coefficients \(1, 0, -7, 6\).`,
      R`Reading a zero with the wrong sign. The factor \((x + 4)\) gives the zero \(x = -4\).`,
      R`Counting a touching point once. It has even multiplicity, so it counts at least twice toward the degree.`,
      R`Writing \(a^{3} + b^{3}\) as \((a + b)^{3}\), or using \(2ab\) as the middle term of the trinomial factor.`,
    ],
    visual: {
      type: 'plot',
      x: [-3.5, 3],
      y: [-4, 6],
      fns: [{ f: (x) => (x + 2) * (x - 1) ** 2, label: 'f(x) = (x + 2)(x − 1)²', labelAt: -1.2 }],
      points: [{ x: -2, y: 0, label: 'crosses' }, { x: 1, y: 0, label: 'touches', color: 'b' }],
      alt: 'Graph of f(x) = (x + 2)(x − 1)². It falls on the left, crosses the x-axis at x = −2, rises to a high point, comes down to touch the x-axis at x = 1, and rises on the right.',
    },
  },

  examples: [
    {
      title: 'Synthetic division',
      problem: R`Divide \(2x^{3} - 3x^{2} - 11x + 6\) by \(x - 3\).`,
      steps: [
        R`The divisor is \(x - 3\), so put 3 in the box and list the coefficients \(2, -3, -11, 6\).`,
        R`Bring down the 2. Multiply by 3 and add to the next coefficient, again and again: \[${synthTex([2, -3, -11, 6], 3)}\]`,
        R`The bottom row \(2, 3, -2\) gives the quotient \(2x^{2} + 3x - 2\). The last number, 0, is the remainder.`,
        R`Because the remainder is 0, \(x - 3\) is a factor: \(2x^{3} - 3x^{2} - 11x + 6 = (x - 3)(2x^{2} + 3x - 2)\).`,
      ],
      answer: R`\(2x^{2} + 3x - 2\), remainder 0`,
    },
    {
      title: 'Long division by a quadratic',
      problem: R`Divide \(2x^{3} + x^{2} - 7x + 5\) by \(x^{2} + x - 3\).`,
      steps: [
        R`Divide the leading terms: \(2x^{3} \div x^{2} = 2x\). Multiply: \(2x(x^{2} + x - 3) = 2x^{3} + 2x^{2} - 6x\). Subtract: \(-x^{2} - x + 5\).`,
        R`Divide the leading terms again: \(-x^{2} \div x^{2} = -1\). Multiply: \(-1(x^{2} + x - 3) = -x^{2} - x + 3\). Subtract: \(2\).`,
        R`The remainder 2 has lower degree than the divisor, so stop. Write the remainder over the divisor.`,
      ],
      answer: R`\(2x - 1 + \dfrac{2}{x^{2} + x - 3}\)`,
    },
    {
      title: 'Factor theorem, then all the zeros',
      problem: R`Show that \(x + 2\) is a factor of \(p(x) = x^{3} - 3x^{2} - 6x + 8\), then find all the zeros.`,
      steps: [
        R`\(x + 2 = 0\) when \(x = -2\). Test it: \(p(-2) = -8 - 12 + 12 + 8 = 0\). So \(x + 2\) is a factor.`,
        R`Divide by \(x + 2\) (synthetic division with \(-2\)): \[${synthTex([1, -3, -6, 8], -2)}\]`,
        R`The quotient is \(x^{2} - 5x + 4 = (x - 1)(x - 4)\).`,
        R`So \(p(x) = (x + 2)(x - 1)(x - 4)\).`,
      ],
      answer: R`\(x = -2,\; 1,\; 4\)`,
    },
    {
      title: 'Sketching from factored form',
      problem: R`Describe the graph of \(f(x) = -(x + 1)^{2}(x - 2)\).`,
      steps: [
        R`Degree: \(2 + 1 = 3\) (odd). Leading coefficient: negative. So the graph rises on the left and falls on the right.`,
        R`Zero \(x = -1\) has multiplicity 2 (even): the graph touches the x-axis there and turns back.`,
        R`Zero \(x = 2\) has multiplicity 1 (odd): the graph crosses the x-axis there.`,
        R`y-intercept: \(f(0) = -(1)^{2}(-2) = 2\).`,
      ],
      answer: 'Rises on the left, touches the axis at x = −1, passes through (0, 2), crosses at x = 2, and falls on the right.',
      visual: {
        type: 'plot',
        x: [-3.2, 3.2],
        y: [-6, 8],
        fns: [{ f: (x) => -((x + 1) ** 2) * (x - 2) }],
        points: [{ x: -1, y: 0, label: 'touches' }, { x: 2, y: 0, label: 'crosses', color: 'b' }, { x: 0, y: 2, label: '(0, 2)', color: 'c' }],
        alt: 'Graph of f(x) = −(x + 1)²(x − 2). It comes down from the upper left, touches the x-axis at x = −1, rises through (0, 2) to a high point, then falls, crossing the x-axis at x = 2.',
      },
    },
    {
      title: 'Word problem: the size of a box',
      word: true,
      problem: R`A box is \(x\) cm wide, \(x + 1\) cm long and \(x + 2\) cm high. Its volume is 60 cm³. Find its dimensions.`,
      steps: [
        R`Volume = width × length × height: \(x(x + 1)(x + 2) = 60\). Expand and collect: \(x^{3} + 3x^{2} + 2x - 60 = 0\).`,
        R`Rational root theorem: any whole-number solution divides 60. Test small positive factors: \(x = 3\) gives \(27 + 27 + 6 - 60 = 0\). ✓`,
        R`Divide out \(x - 3\): the quotient is \(x^{2} + 6x + 20\). Its discriminant is \(36 - 80 = -44\), so it has no real zeros.`,
        R`The only real solution is \(x = 3\).`,
      ],
      answer: 'The box is 3 cm wide, 4 cm long and 5 cm high.',
    },
  ],

  models: [
    {
      id: 'synthetic-division',
      title: 'Synthetic division of a cubic by x − c',
      intro: 'Type the four coefficients and the number c. The table and the result update as you type.',
      inputs: [
        { name: 'a3', label: 'Coefficient of x³', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'a2', label: 'Coefficient of x²', type: 'int', min: -20, max: 20, value: -3 },
        { name: 'a1', label: 'Coefficient of x', type: 'int', min: -20, max: 20, value: -11 },
        { name: 'a0', label: 'Constant term', type: 'int', min: -30, max: 30, value: 6 },
        { name: 'c', label: 'c (divide by x − c)', type: 'int', min: -9, max: 9, value: 3 },
      ],
      compute: syntheticModel,
    },
    {
      id: 'graph-from-factors',
      title: 'From factors to the graph: a(x − r₁)ᵐ(x − r₂)ⁿ',
      intro: 'Change the zeros, their multiplicities and the leading coefficient, and see how the graph responds.',
      inputs: [
        { name: 'a', label: 'Leading coefficient a', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'r1', label: 'First zero', type: 'int', min: -5, max: 5, value: -2 },
        { name: 'm1', label: 'Multiplicity of the first zero', type: 'int', min: 1, max: 3, value: 1 },
        { name: 'r2', label: 'Second zero', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'm2', label: 'Multiplicity of the second zero', type: 'int', min: 1, max: 3, value: 2 },
      ],
      compute: graphModel,
    },
    {
      id: 'open-box',
      title: 'Word problem: volume of an open box',
      word: true,
      intro: 'Change the size of the sheet and the size of the corner cut.',
      inputs: [
        { name: 'L', label: 'Length of the sheet (cm)', type: 'int', min: 10, max: 60, value: 30 },
        { name: 'W', label: 'Width of the sheet (cm)', type: 'int', min: 10, max: 60, value: 20 },
        { name: 'x', label: 'Side of each corner cut (cm)', type: 'number', min: 0.5, max: 15, step: 0.5, value: 4 },
      ],
      compute: boxModel,
    },
  ],

  quiz: {
    easy: [easyEndBehavior, easyRemainder, easyZerosFactored, easyTouchOrCross],
    medium: [mediumSynthetic, mediumWhichFactor, mediumRationalRoot, mediumCubes, mediumBoxBase],
    hard: [hardZerosCubic, hardBuildFromZeros, hardLongDivision, hardMatchGraph, hardWordBox],
    challenge: [challengeFindK, challengeAllZeros, challengeLeastDegree, challengeComplexZero],
  },
};
