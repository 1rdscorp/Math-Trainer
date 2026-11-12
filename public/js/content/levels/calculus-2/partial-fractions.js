import { R, q, frac, terms, linear, poly, factor, num, paren, polyMul, polyAdd, polyEval, checkAntideriv, checkIntegral, checkSame, checkAll, checkEqual } from '../../lib/index.js';
import { M, K, exactChoices, combo, antiChoices, fterms, lnCombo } from './_shared.js';

// Decomposition constants are called A, B and D: the letter C is kept for the constant of integration.
const fac = (r) => linear(1, -r); // x − r
// (x − r)ⁿ, written x^{n} when r = 0.
const pw = (r, n) => (n === 1 ? fac(r) : r === 0 ? `x^{${n}}` : `(${fac(r)})^{${n}}`);
const lnAbs = (r) => `\\ln|${fac(r)}|`;
const lnJs = (r) => (x) => Math.log(Math.abs(x - r));
// Sample points to the right of every pole.
const rightOf = (...poles) => [0.35, 0.8, 1.3, 1.9].map((d) => Math.max(...poles) + d);
// A/(x − r) + B/(x − s) + …  as LaTeX: pieces([[2, 1], [-3, -2]]) → "\frac{2}{x - 1} - \frac{3}{x + 2}"
const pieces = (list) => fterms(list.map(([c, r, power = 1]) => [c, '', pw(r, power)]));
const distinctPair = (rng, lo, hi) => {
  const r = rng.int(lo, hi);
  return [r, rng.intExcept(lo, hi, [r])];
};

// ───────────── Easy ─────────────

function easyForm(rng) {
  const kind = rng.pick(['two', 'two', 'repeated', 'quad', 'three']);
  const frc = (top, bottom) => R`\dfrac{${top}}{${bottom}}`;
  const sum = (...parts) => M(parts.join(' + '));
  const k = rng.int(1, 9);
  if (kind === 'two') {
    const [r, s] = distinctPair(rng, -6, 6);
    let p;
    let c;
    do {
      p = rng.int(0, 5);
      c = rng.nonzero(-9, 9);
    } while (p * r + c === 0 || p * s + c === 0);
    return q({
      prompt: R`Which form should you use for the partial fraction decomposition of \(\dfrac{${linear(p, c)}}{${factor(r)}${factor(s)}}\)?`,
      correct: sum(frc('A', fac(r)), frc('B', fac(s))),
      wrong: [
        { value: sum(frc('Ax + B', fac(r)), frc('Dx + E', fac(s))), why: 'A linear factor needs only a constant in its numerator.' },
        { value: M(frc('A', `${factor(r)}${factor(s)}`)), why: 'Each factor of the denominator gets a fraction of its own.' },
        { value: sum(frc('A', fac(-r === r ? r + 1 : -r)), frc('B', fac(-s === s ? s + 1 : -s))), why: 'The denominators of the pieces are exactly the factors of the original denominator.' },
        sum(frc('A', fac(r)), frc('B', pw(s, 2))),
      ],
      solution: [
        R`The denominator is a product of two different linear factors, \(${fac(r)}\) and \(${fac(s)}\), and the numerator has lower degree.`,
        R`Each distinct linear factor gets one fraction with a constant on top: \(${frc('A', fac(r))} + ${frc('B', fac(s))}\).`,
      ],
      rule: 0,
      skill: 'form of the decomposition',
    });
  }
  if (kind === 'repeated') {
    const [r, s] = distinctPair(rng, -6, 6);
    return q({
      prompt: R`Which form should you use for the partial fraction decomposition of \(\dfrac{${k}}{${pw(r, 2)}${factor(s)}}\)?`,
      correct: sum(frc('A', fac(r)), frc('B', pw(r, 2)), frc('D', fac(s))),
      wrong: [
        { value: sum(frc('A', pw(r, 2)), frc('B', fac(s))), why: 'A repeated factor needs one fraction for each power, from the first power up to the power in the denominator.' },
        { value: sum(frc('A', fac(r)), frc('B', fac(r)), frc('D', fac(s))), why: R`Two fractions with the same denominator would simply combine into one. The second one needs \(${pw(r, 2)}\).` },
        { value: sum(frc('A', fac(r)), frc('B', fac(s))), why: R`The factor \(${fac(r)}\) appears twice, so it needs a second fraction with \(${pw(r, 2)}\) underneath.` },
        sum(frc('A', fac(r)), frc('B', pw(r, 2)), frc('D', pw(s, 2))),
      ],
      solution: [
        R`The factor \(${fac(r)}\) is squared, so it gets two fractions: one over \(${fac(r)}\) and one over \(${pw(r, 2)}\).`,
        R`The factor \(${fac(s)}\) appears once, so it gets one fraction.`,
        R`Form: \(${frc('A', fac(r))} + ${frc('B', pw(r, 2))} + ${frc('D', fac(s))}\).`,
      ],
      rule: 3,
      skill: 'form of the decomposition',
    });
  }
  if (kind === 'quad') {
    const r = rng.int(-6, 6);
    const m = rng.int(1, 9);
    const quad = `x^{2} + ${m}`;
    return q({
      prompt: R`Which form should you use for the partial fraction decomposition of \(\dfrac{${k}}{${factor(r)}(${quad})}\)?`,
      correct: sum(frc('A', fac(r)), frc('Bx + D', quad)),
      wrong: [
        { value: sum(frc('A', fac(r)), frc('B', quad)), why: R`A quadratic factor that cannot be factored needs a linear numerator, \(Bx + D\).` },
        { value: sum(frc('Ax + B', fac(r)), frc('D', quad)), why: 'The linear numerator belongs over the quadratic factor. A linear factor gets a constant.' },
        sum(frc('A', fac(r)), frc('B', 'x'), frc('D', quad)),
        sum(frc('A', fac(r)), frc('Bx^{2} + D', quad)),
      ],
      solution: [
        R`\(${quad}\) has no real roots, so it cannot be factored: it is an irreducible quadratic.`,
        R`The linear factor \(${fac(r)}\) gets a constant, and the quadratic factor gets a linear numerator.`,
        R`Form: \(${frc('A', fac(r))} + ${frc('Bx + D', quad)}\).`,
      ],
      rule: 4,
      skill: 'form of the decomposition',
    });
  }
  const [r, s, t] = rng.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 3);
  return q({
    prompt: R`Which form should you use for the partial fraction decomposition of \(\dfrac{${k}}{${factor(r)}${factor(s)}${factor(t)}}\)?`,
    correct: sum(frc('A', fac(r)), frc('B', fac(s)), frc('D', fac(t))),
    wrong: [
      { value: sum(frc('A', fac(r)), frc('B', fac(s))), why: R`Every factor needs its own fraction. The factor \(${fac(t)}\) is missing.` },
      { value: sum(frc('A', `${factor(r)}${factor(s)}`), frc('B', fac(t))), why: 'Split the denominator completely: one fraction for each linear factor.' },
      sum(frc('Ax + B', fac(r)), frc('D', fac(s)), frc('E', fac(t))),
      sum(frc('A', fac(r)), frc('B', pw(s, 2)), frc('D', pw(t, 3))),
    ],
    solution: [
      R`The denominator has three different linear factors.`,
      R`Each one gets a fraction with a constant on top: \(${frc('A', fac(r))} + ${frc('B', fac(s))} + ${frc('D', fac(t))}\).`,
    ],
    rule: 0,
    skill: 'form of the decomposition',
  });
}

function easyCoverUp(rng) {
  const [r, s] = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 2);
  const A = rng.nonzero(-6, 6);
  const B = rng.nonzero(-6, 6);
  const p = A + B;
  const c = -(A * s + B * r);
  const askA = rng.bool();
  const [root, otherRoot, want, other, name] = askA ? [r, s, A, B, 'A'] : [s, r, B, A, 'B'];
  const top = p * root + c;
  return q({
    prompt: R`The decomposition \(\dfrac{${linear(p, c)}}{${factor(r)}${factor(s)}} = \dfrac{A}{${fac(r)}} + \dfrac{B}{${fac(s)}}\) holds for every \(x\). Find \(${name}\).`,
    correct: want,
    fmt: (v) => R`\(${name} = ${num(v)}\)`,
    wrong: [
      { value: other, why: R`That is the other constant. For \(${name}\), substitute the root of its own denominator, \(x = ${root}\).` },
      { value: top, why: R`Divide by what is left of the denominator at \(x = ${root}\): \(${root} - ${paren(otherRoot)} = ${root - otherRoot}\).` },
      { value: -want, why: R`Check the sign of the remaining factor: \(${root} - ${paren(otherRoot)} = ${root - otherRoot}\).` },
      p,
      want + other,
    ],
    solution: [
      R`Multiply both sides by \(${factor(r)}${factor(s)}\): \(${linear(p, c)} = A(${fac(s)}) + B(${fac(r)})\).`,
      R`Substitute \(x = ${root}\) so that the other term vanishes: \(${p === 0 ? c : `${p}(${root}) ${c >= 0 ? '+' : '-'} ${Math.abs(c)}`} = ${name}(${root} - ${paren(otherRoot)})\), that is \(${top} = ${terms([[root - otherRoot, name]])}\).`,
      R`So \(${name} = ${want}\).`,
    ],
    rule: 1,
    skill: 'finding the constants',
    check: () => checkSame((x) => (p * x + c) / ((x - r) * (x - s)), (x) => A / (x - r) + B / (x - s), rightOf(r, s)),
  });
}

function easyIntegratePiece(rng) {
  const a = rng.int(2, 9);
  const r = rng.nonzero(-6, 6);
  const kind = rng.pick(['lin1', 'lin1', 'lin2', 'sq', 'cube']);
  const u = fac(r);
  const xs = rightOf(r);
  const d = (x) => x - r;
  if (kind === 'lin1') {
    const right = { tex: terms([[a, lnAbs(r)]]), F: (x) => a * Math.log(Math.abs(d(x))) };
    return q({
      prompt: R`Find \(\displaystyle\int \frac{${a}}{${u}}\,dx\).`,
      ...antiChoices(
        right,
        [
          { tex: fterms([[-a, '', `(${u})^{2}`]]), F: (x) => -a / d(x) ** 2, why: R`That is the derivative of \(\frac{${a}}{${u}}\). The integral of \(\frac{1}{u}\) is \(\ln|u|\).` },
          { tex: `\\ln|${a}(${u})|`, F: (x) => Math.log(Math.abs(a * d(x))), why: R`The constant \(${a}\) multiplies the logarithm. It does not go inside it.` },
          { tex: terms([[-a, lnAbs(r)]]), F: (x) => -a * Math.log(Math.abs(d(x))) },
          { tex: fterms([[a, '', `(${u})^{2}`]]), F: (x) => a / d(x) ** 2 },
          { tex: terms([[frac(a, 2), `(${u})^{2}`]]), F: (x) => (a / 2) * d(x) ** 2 },
        ],
        xs,
      ),
      solution: [R`Keep the constant \(${a}\) in front and let \(u = ${u}\), so \(du = dx\).`, R`\(\displaystyle\int \frac{1}{u}\,du = \ln|u|\).`, R`Answer: \(${right.tex} + C\).`],
      rule: 2,
      skill: 'integrating one piece',
      check: () => checkAntideriv(right.F, (x) => a / d(x), xs),
    });
  }
  if (kind === 'lin2') {
    const b = rng.int(2, 5);
    const c = rng.nonzero(-9, 9);
    const lin = linear(b, c);
    const ys = rightOf(-c / b);
    const L = (x) => Math.log(Math.abs(b * x + c));
    const right = { tex: terms([[frac(a, b), `\\ln|${lin}|`]]), F: (x) => (a / b) * L(x) };
    return q({
      prompt: R`Find \(\displaystyle\int \frac{${a}}{${lin}}\,dx\).`,
      ...antiChoices(
        right,
        [
          { tex: terms([[a, `\\ln|${lin}|`]]), F: (x) => a * L(x), why: R`With \(u = ${lin}\), \(du = ${b}\,dx\), so a factor of \(\frac{1}{${b}}\) appears.` },
          { tex: terms([[a * b, `\\ln|${lin}|`]]), F: (x) => a * b * L(x), why: R`Integrating divides by the inner coefficient \(${b}\). Multiplying by it is what differentiation does.` },
          { tex: fterms([[-a * b, '', `(${lin})^{2}`]]), F: (x) => (-a * b) / (b * x + c) ** 2 },
          { tex: terms([[frac(a, b), `\\ln|${linear(1, c)}|`]]), F: (x) => (a / b) * Math.log(Math.abs(x + c)) },
        ],
        ys,
      ),
      solution: [
        R`Let \(u = ${lin}\). Then \(du = ${b}\,dx\), so \(dx = \frac{1}{${b}}\,du\).`,
        R`The integral becomes \(${frac(a, b).tex()}\displaystyle\int \frac{1}{u}\,du = ${frac(a, b).tex()}\ln|u|\).`,
        R`Answer: \(${right.tex} + C\).`,
      ],
      rule: 2,
      skill: 'integrating one piece',
      check: () => checkAntideriv(right.F, (x) => a / (b * x + c), ys),
    });
  }
  if (kind === 'sq') {
    const right = { tex: fterms([[-a, '', u]]), F: (x) => -a / d(x) };
    return q({
      prompt: R`Find \(\displaystyle\int \frac{${a}}{(${u})^{2}}\,dx\).`,
      ...antiChoices(
        right,
        [
          { tex: terms([[a, `\\ln\\left((${u})^{2}\\right)`]]), F: (x) => a * Math.log(d(x) ** 2), why: R`Only \(\frac{1}{u}\) integrates to a logarithm. For \(\frac{1}{u^{2}} = u^{-2}\) use the power rule.` },
          { tex: fterms([[a, '', u]]), F: (x) => a / d(x), why: R`The power rule gives \(\frac{u^{-1}}{-1}\): the result is negative.` },
          { tex: fterms([[frac(-a, 3), '', `(${u})^{3}`]]), F: (x) => -a / (3 * d(x) ** 3), why: R`Integrating raises the exponent: \(-2 + 1 = -1\), not \(-3\).` },
          { tex: fterms([[-2 * a, '', `(${u})^{3}`]]), F: (x) => (-2 * a) / d(x) ** 3 },
        ],
        xs,
      ),
      solution: [
        R`Write the integrand as \(${a}(${u})^{-2}\) and let \(u = ${u}\), \(du = dx\).`,
        R`Power rule: \(\displaystyle\int u^{-2}\,du = \frac{u^{-1}}{-1} = -\frac{1}{u}\).`,
        R`Answer: \(${right.tex} + C\).`,
      ],
      rule: 3,
      skill: 'integrating one piece',
      check: () => checkAntideriv(right.F, (x) => a / d(x) ** 2, xs),
    });
  }
  const right = { tex: fterms([[frac(-a, 2), '', `(${u})^{2}`]]), F: (x) => -a / (2 * d(x) ** 2) };
  return q({
    prompt: R`Find \(\displaystyle\int \frac{${a}}{(${u})^{3}}\,dx\).`,
    ...antiChoices(
      right,
      [
        { tex: terms([[a, `\\ln\\left|(${u})^{3}\\right|`]]), F: (x) => a * Math.log(Math.abs(d(x) ** 3)), why: R`Only \(\frac{1}{u}\) integrates to a logarithm. For \(u^{-3}\) use the power rule.` },
        { tex: fterms([[frac(a, 2), '', `(${u})^{2}`]]), F: (x) => a / (2 * d(x) ** 2), why: R`The power rule gives \(\frac{u^{-2}}{-2}\): the result is negative.` },
        { tex: fterms([[-a, '', `(${u})^{2}`]]), F: (x) => -a / d(x) ** 2, why: R`Divide by the new exponent, \(-2\).` },
        { tex: fterms([[frac(-a, 4), '', `(${u})^{4}`]]), F: (x) => -a / (4 * d(x) ** 4) },
      ],
      xs,
    ),
    solution: [
      R`Write the integrand as \(${a}(${u})^{-3}\) and let \(u = ${u}\), \(du = dx\).`,
      R`Power rule: \(\displaystyle\int u^{-3}\,du = \frac{u^{-2}}{-2} = -\frac{1}{2u^{2}}\).`,
      R`Answer: \(${right.tex} + C\).`,
    ],
    rule: 3,
    skill: 'integrating one piece',
    check: () => checkAntideriv(right.F, (x) => a / d(x) ** 3, xs),
  });
}

// ───────────── Medium ─────────────

// A fraction (px + c)/((x − r)(x − s)) built from whole-number constants A and B.
function twoFactors(rng, lo = -5, hi = 5, size = 6) {
  const [r, s] = distinctPair(rng, lo, hi);
  const A = rng.nonzero(-size, size);
  const B = rng.nonzero(-size, size);
  return { r, s, A, B, p: A + B, c: -(A * s + B * r), den: poly([1, -(r + s), r * s]), f: (x) => ((A + B) * x - (A * s + B * r)) / ((x - r) * (x - s)) };
}

function coverUpSteps({ r, s, A, B, p, c }) {
  return [
    R`Clear the denominators: \(${linear(p, c)} = A${factor(s)} + B${factor(r)}\).`,
    R`Substitute \(x = ${r}\): \(${p * r + c} = ${terms([[r - s, 'A']])}\), so \(A = ${A}\). Substitute \(x = ${s}\): \(${p * s + c} = ${terms([[s - r, 'B']])}\), so \(B = ${B}\).`,
  ];
}

function mediumDecompose(rng) {
  const t = twoFactors(rng);
  const { r, s, A, B, p, c } = t;
  const form = (a, b) => M(pieces([[a, r], [b, s]]));
  return q({
    prompt: R`Write \(\dfrac{${linear(p, c)}}{${t.den}}\) as a sum of partial fractions.`,
    correct: form(A, B),
    wrong: [
      A !== B ? { value: form(B, A), why: R`Check with the cover-up method: substituting \(x = ${r}\) gives the constant that sits over \(${fac(r)}\).` } : null,
      { value: form(p * r + c, p * s + c), why: R`After substituting a root, divide by the value of the other factor.` },
      { value: form(A, -B), why: R`Check the sign of \(B\): at \(x = ${s}\) the remaining factor is \(${s} - ${paren(r)} = ${s - r}\).` },
      form(-A, B),
      form(-A, -B),
    ],
    solution: [
      R`Factor the denominator: \(${t.den} = ${factor(r)}${factor(s)}\). Use the form \(\dfrac{A}{${fac(r)}} + \dfrac{B}{${fac(s)}}\).`,
      ...coverUpSteps(t),
      R`So \(\dfrac{${linear(p, c)}}{${t.den}} = ${pieces([[A, r], [B, s]])}\).`,
    ],
    rule: 1,
    skill: 'decomposing a fraction',
    check: () => checkSame(t.f, (x) => A / (x - r) + B / (x - s), rightOf(r, s)),
  });
}

function mediumIntegrateLinear(rng) {
  const t = twoFactors(rng);
  const { r, s, A, B, p, c } = t;
  const xs = rightOf(r, s);
  const basis = [{ tex: lnAbs(r), f: lnJs(r) }, { tex: lnAbs(s), f: lnJs(s) }];
  const right = combo(basis, [A, B]);
  return q({
    prompt: R`Find \(\displaystyle\int \frac{${linear(p, c)}}{${t.den}}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...combo(basis, [B, A]), why: R`Check with the cover-up method: substituting \(x = ${r}\) gives the constant that goes with \(${lnAbs(r)}\).` },
        { tex: `\\ln|${t.den}|`, F: (x) => Math.log(Math.abs((x - r) * (x - s))), why: R`That would need the numerator to be the derivative of the denominator, \(${linear(2, -(r + s))}\).` },
        { tex: pieces([[-A, r, 2], [-B, s, 2]]), F: (x) => -A / (x - r) ** 2 - B / (x - s) ** 2, why: R`That differentiates each piece. The integral of \(\frac{1}{u}\) is \(\ln|u|\).` },
        combo(basis, [A, -B]),
        combo(basis, [-A, -B]),
      ],
      xs,
    ),
    solution: [
      R`Factor the denominator: \(${t.den} = ${factor(r)}${factor(s)}\). Use the form \(\dfrac{A}{${fac(r)}} + \dfrac{B}{${fac(s)}}\).`,
      ...coverUpSteps(t),
      R`Integrate each piece: \(\displaystyle\int \left(${pieces([[A, r], [B, s]])}\right)dx = ${right.tex} + C\).`,
    ],
    rule: 2,
    skill: 'integrating with partial fractions',
    check: () => checkAntideriv(right.F, t.f, xs),
  });
}

function mediumDifferenceOfSquares(rng) {
  const a = rng.int(1, 6);
  const m = rng.nonzero(-4, 4);
  const k = 2 * a * m;
  const A2 = a * a;
  const ratio = (top, bottom) => R`\ln\left|\dfrac{${top}}{${bottom}}\right|`;
  const L = (x) => Math.log(Math.abs((x - a) / (x + a)));
  const xs = rightOf(a);
  const right = { tex: terms([[m, ratio(fac(a), fac(-a))]]), F: (x) => m * L(x) };
  return q({
    prompt: R`Find \(\displaystyle\int ${fterms([[k, '', `x^{2} - ${A2}`]])}\,dx\).`,
    ...antiChoices(
      right,
      [
        { tex: terms([[m, ratio(fac(-a), fac(a))]]), F: (x) => -m * L(x), why: R`Substituting \(x = ${a}\) gives \(A = ${m}\), the coefficient of \(${lnAbs(a)}\). So \(${fac(a)}\) belongs on top of the combined logarithm.` },
        { tex: terms([[frac(k, a), `\\arctan\\dfrac{x}{${a}}`]]), F: (x) => (k / a) * Math.atan(x / a), why: R`Arctangent belongs to a sum \(x^{2} + a^{2}\). A difference of squares factors, so use partial fractions.` },
        { tex: terms([[k, `\\ln|x^{2} - ${A2}|`]]), F: (x) => k * Math.log(Math.abs(x * x - A2)), why: R`\(\ln|u|\) needs \(u' = 2x\) in the numerator. Here the numerator is a constant.` },
        { tex: terms([[k, ratio(fac(a), fac(-a))]]), F: (x) => k * L(x) },
        { tex: terms([[m, `\\ln|x^{2} - ${A2}|`]]), F: (x) => m * Math.log(Math.abs(x * x - A2)) },
      ],
      xs,
    ),
    solution: [
      R`Factor: \(x^{2} - ${A2} = (${fac(a)})(${fac(-a)})\). Use \(\dfrac{A}{${fac(a)}} + \dfrac{B}{${fac(-a)}}\).`,
      R`Clear the denominators: \(${k} = A(${fac(-a)}) + B(${fac(a)})\). At \(x = ${a}\): \(${k} = ${2 * a}A\), so \(A = ${m}\). At \(x = ${-a}\): \(${k} = ${-2 * a}B\), so \(B = ${-m}\).`,
      R`Integrate: \(${terms([[m, lnAbs(a)], [-m, lnAbs(-a)]])}\).`,
      R`Combine the logarithms: \(${right.tex} + C\).`,
    ],
    rule: 2,
    skill: 'integrating with partial fractions',
    check: () => checkAntideriv(right.F, (x) => k / (x * x - A2), xs),
  });
}

function mediumWordRate(rng) {
  const a = rng.int(1, 3);
  const b = a + rng.int(1, 3);
  const m = rng.int(1, 5);
  const k = m * (b - a);
  const T = rng.int(1, 5);
  const ctx = rng.pick([
    { lead: 'Water leaks from a tank', unit: 'liters', per: 'minute', time: 'minutes', ask: 'How much water leaks out' },
    { lead: 'Sand pours onto a pile', unit: 'kilograms', per: 'second', time: 'seconds', ask: 'How much sand is added' },
    { lead: 'A filter removes a pollutant', unit: 'grams', per: 'hour', time: 'hours', ask: 'How much pollutant is removed' },
  ]);
  const right = lnCombo([[m, (T + a) * b, (T + b) * a]]);
  const wrap = (tex) => R`\(${tex}\) ${ctx.unit}`;
  const rate = R`\dfrac{${k}}{(t + ${a})(t + ${b})}`;
  return q({
    prompt: R`${ctx.lead} at a rate of \(r(t) = ${rate}\) ${ctx.unit} per ${ctx.per}, where \(t\) is the time in ${ctx.time}. ${ctx.ask} during the first ${T === 1 ? ctx.per : `${T} ${ctx.time}`}?`,
    ...exactChoices(
      right,
      [
        { k: lnCombo([[m, T + a, T + b]]), why: R`The lower limit matters: at \(t = 0\) the antiderivative is \(${terms([[m, `\\ln\\frac{${a}}{${b}}`]])}\), which is not 0.` },
        { k: lnCombo([[m, (T + a) * (T + b), a * b]]), why: R`The second piece is subtracted: \(\frac{${k}}{(t + ${a})(t + ${b})} = \frac{${m}}{t + ${a}} - \frac{${m}}{t + ${b}}\).` },
        b - a !== 1 ? { k: lnCombo([[k, (T + a) * b, (T + b) * a]]), why: R`The constants in the decomposition are \(\pm${m}\), not \(\pm${k}\): divide \(${k}\) by \(${b} - ${a}\).` } : null,
        lnCombo([[m, (T + b) * a, (T + a) * b]]),
        lnCombo([[2 * m, (T + a) * b, (T + b) * a]]),
        lnCombo([[m, T + b, a]]),
      ],
      wrap,
    ),
    solution: [
      R`The amount is the integral of the rate: \(\displaystyle\int_{0}^{${T}} ${rate}\,dt\).`,
      R`Partial fractions: \(${rate} = \dfrac{${m}}{t + ${a}} - \dfrac{${m}}{t + ${b}}\) (cover-up: at \(t = ${-a}\), \(\frac{${k}}{${b - a}} = ${m}\)).`,
      R`An antiderivative is \(${terms([[m, `\\ln\\dfrac{t + ${a}}{t + ${b}}`]])}\). At \(t = ${T}\): \(${terms([[m, `\\ln\\frac{${T + a}}{${T + b}}`]])}\). At \(t = 0\): \(${terms([[m, `\\ln\\frac{${a}}{${b}}`]])}\).`,
      R`Subtract and combine the logarithms: \(${right.tex}\) ${ctx.unit}, about \(${num(right.value, { places: 2 })}\).`,
    ],
    rule: 2,
    skill: 'accumulation with partial fractions',
    check: () => checkIntegral((t) => k / ((t + a) * (t + b)), 0, T, right.value),
  });
}

// ───────────── Hard ─────────────

function hardRepeated(rng) {
  if (rng.bool(0.3)) {
    const r = rng.int(-5, 5);
    const p = rng.nonzero(-5, 5);
    const B = rng.nonzero(-9, 9);
    const c = B - p * r; // px + c = p(x − r) + B
    const xs = rightOf(r);
    const form = (a, b) => ({ tex: fterms([[a, lnAbs(r)], [-b, '', fac(r)]]), F: (x) => a * Math.log(Math.abs(x - r)) - b / (x - r) });
    const right = form(p, B);
    return q({
      prompt: R`Find \(\displaystyle\int \frac{${linear(p, c)}}{${pw(r, 2)}}\,dx\).`,
      ...antiChoices(
        right,
        [
          { ...form(p, -B), why: R`\(\displaystyle\int \frac{dx}{${pw(r, 2)}} = -\frac{1}{${fac(r)}}\): the power rule on \(u^{-2}\) brings a minus sign.` },
          { tex: terms([[p, lnAbs(r)], [B, `\\ln\\left(${pw(r, 2)}\\right)`]]), F: (x) => (p + 2 * B) * Math.log(Math.abs(x - r)), why: R`Only \(\frac{1}{u}\) integrates to a logarithm. The piece over \(${pw(r, 2)}\) needs the power rule.` },
          form(B, p),
          form(p, c),
          form(-p, B),
        ],
        xs,
      ),
      solution: [
        R`The factor \(${fac(r)}\) is repeated, so use \(\dfrac{A}{${fac(r)}} + \dfrac{B}{${pw(r, 2)}}\).`,
        R`Clear the denominators: \(${linear(p, c)} = A${factor(r)} + B\). Comparing \(x\)-terms gives \(A = ${p}\). Substituting \(x = ${r}\) gives \(B = ${B}\).`,
        R`Integrate: \(\displaystyle\int ${fterms([[p, '', fac(r)]])}\,dx = ${terms([[p, lnAbs(r)]])}\) and \(\displaystyle\int ${fterms([[B, '', pw(r, 2)]])}\,dx = ${fterms([[-B, '', fac(r)]])}\).`,
        R`Answer: \(${right.tex} + C\).`,
      ],
      rule: 3,
      skill: 'repeated linear factors',
      check: () => checkAntideriv(right.F, (x) => (p * x + c) / (x - r) ** 2, xs),
    });
  }
  const [r, s] = distinctPair(rng, -3, 3);
  const A = rng.nonzero(-3, 3);
  const B = rng.nonzero(-3, 3);
  const D = rng.nonzero(-3, 3);
  // N = A(x − r)(x − s) + B(x − s) + D(x − r)²
  const N = polyAdd(polyAdd(polyMul([A], polyMul([1, -r], [1, -s])), [B, -B * s]), polyMul([D], polyMul([1, -r], [1, -r])));
  const top = poly(N);
  const xs = rightOf(r, s);
  const form = (a, b, d) => ({ tex: fterms([[a, lnAbs(r)], [-b, '', fac(r)], [d, lnAbs(s)]]), F: (x) => a * Math.log(Math.abs(x - r)) - b / (x - r) + d * Math.log(Math.abs(x - s)) });
  const right = form(A, B, D);
  const Nr = polyEval(N, r);
  const Ns = polyEval(N, s);
  const lead = N.length === 3 ? N[0] : 0;
  return q({
    prompt: R`Find \(\displaystyle\int \frac{${top}}{${pw(r, 2)}${factor(s)}}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...form(A, -B, D), why: R`\(\displaystyle\int \frac{dx}{${pw(r, 2)}} = -\frac{1}{${fac(r)}}\): the power rule on \(u^{-2}\) brings a minus sign.` },
        { tex: terms([[A, lnAbs(r)], [B, `\\ln\\left(${pw(r, 2)}\\right)`], [D, lnAbs(s)]]), F: (x) => (A + 2 * B) * Math.log(Math.abs(x - r)) + D * Math.log(Math.abs(x - s)), why: R`Only \(\frac{1}{u}\) integrates to a logarithm. The piece over \(${pw(r, 2)}\) needs the power rule.` },
        form(D, B, A),
        form(A, B, -D),
        form(-A, B, D),
      ],
      xs,
    ),
    solution: [
      R`The factor \(${fac(r)}\) is repeated, so use \(\dfrac{A}{${fac(r)}} + \dfrac{B}{${pw(r, 2)}} + \dfrac{D}{${fac(s)}}\).`,
      R`Clear the denominators: \(${top} = A${factor(r)}${factor(s)} + B${factor(s)} + D${pw(r, 2)}\).`,
      R`At \(x = ${r}\): \(${Nr} = ${terms([[r - s, 'B']])}\), so \(B = ${B}\). At \(x = ${s}\): \(${Ns} = ${terms([[(s - r) ** 2, 'D']])}\), so \(D = ${D}\).`,
      R`Compare the \(x^{2}\) coefficients: \(A + D = ${lead}\), so \(A = ${A}\).`,
      R`Integrate the three pieces: \(${right.tex} + C\).`,
    ],
    rule: 3,
    skill: 'repeated linear factors',
    check: () => checkAntideriv(right.F, (x) => polyEval(N, x) / ((x - r) ** 2 * (x - s)), xs),
  });
}

function hardQuadratic(rng) {
  const a = rng.int(1, 3);
  const a2 = a * a;
  const r = rng.int(-3, 3);
  const A = rng.nonzero(-4, 4);
  const b2 = rng.nonzero(-2, 2); // B = 2·b2, so (B/2) is whole
  const d = rng.nonzero(-3, 3); // D = a·d, so D/a is whole
  const B = 2 * b2;
  const D = a * d;
  // N = A(x² + a²) + (Bx + D)(x − r)
  const N = [A + B, D - B * r, A * a2 - D * r];
  const top = poly(N);
  const quad = `x^{2} + ${a2}`;
  const atan = a === 1 ? '\\arctan x' : `\\arctan\\dfrac{x}{${a}}`;
  const basis = [
    { tex: lnAbs(r), f: lnJs(r) },
    { tex: `\\ln(${quad})`, f: (x) => Math.log(x * x + a2) },
    { tex: atan, f: (x) => Math.atan(x / a) },
  ];
  const xs = rightOf(r);
  const right = combo(basis, [A, b2, d]);
  return q({
    prompt: R`Find \(\displaystyle\int \frac{${top}}{${factor(r)}(${quad})}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...combo(basis, [A, B, d]), why: R`\(\displaystyle\int \frac{x}{${quad}}\,dx = \frac{1}{2}\ln(${quad})\): the substitution \(u = ${quad}\) brings a factor \(\frac{1}{2}\).` },
        a !== 1 ? { ...combo(basis, [A, b2, D]), why: R`\(\displaystyle\int \frac{dx}{x^{2} + a^{2}} = \frac{1}{a}\arctan\frac{x}{a}\). Here \(a = ${a}\).` } : null,
        { ...combo(basis, [A, b2, 0]), why: R`The constant part of the numerator over \(${quad}\) gives an arctangent term.` },
        combo(basis, [A, -b2, d]),
        combo(basis, [b2, A, d]),
        combo(basis, [A, b2, -d]),
      ],
      xs,
    ),
    solution: [
      R`\(${quad}\) cannot be factored, so use \(\dfrac{A}{${fac(r)}} + \dfrac{Bx + D}{${quad}}\).`,
      R`Clear the denominators: \(${top} = A(${quad}) + (Bx + D)(${fac(r)})\). At \(x = ${r}\): \(${polyEval(N, r)} = ${terms([[r * r + a2, 'A']])}\), so \(A = ${A}\).`,
      R`Compare coefficients. \(x^{2}\): \(A + B = ${N[0]}\), so \(B = ${B}\). \(x\): \(${terms([[1, 'D'], [-r, 'B']])} = ${N[1]}\), so \(D = ${D}\).`,
      R`Split the quadratic piece: \(\displaystyle\int ${fterms([[B, 'x', quad]])}\,dx = ${terms([[b2, `\\ln(${quad})`]])}\) and \(\displaystyle\int ${fterms([[D, '', quad]])}\,dx = ${terms([[d, atan]])}\).`,
      R`Answer: \(${right.tex} + C\).`,
    ],
    rule: 4,
    skill: 'irreducible quadratic factors',
    check: () => checkAntideriv(right.F, (x) => polyEval(N, x) / ((x - r) * (x * x + a2)), xs),
  });
}

function hardImproper(rng) {
  const [r, s] = distinctPair(rng, -3, 3);
  const A = rng.nonzero(-4, 4);
  const B = rng.nonzero(-4, 4);
  const cubic = rng.bool();
  const m = cubic ? rng.pick([1, 2, 4]) : 0;
  const n = cubic ? rng.int(-3, 3) : rng.nonzero(-3, 3);
  const Q = cubic ? [m, n] : [n];
  const den = [1, -(r + s), r * s];
  const rem = [A + B, -(A * s + B * r)];
  const N = polyAdd(polyMul(Q, den), rem);
  const top = poly(N);
  const bottom = poly(den);
  const xs = rightOf(r, s);
  const basis = [
    { tex: 'x^{2}', f: (x) => x * x },
    { tex: 'x', f: (x) => x },
    { tex: lnAbs(r), f: lnJs(r) },
    { tex: lnAbs(s), f: lnJs(s) },
  ];
  const right = combo(basis, [frac(m, 2), n, A, B]);
  const quotient = poly(Q);
  return q({
    prompt: R`Find \(\displaystyle\int \frac{${top}}{${bottom}}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...combo(basis, [0, 0, A, B]), why: 'The fraction is improper. Divide first: the quotient is part of the integrand and must be integrated too.' },
        cubic
          ? { tex: terms([[m, 'x'], [n, ''], [A, lnAbs(r)], [B, lnAbs(s)]]), F: (x) => m * x + A * Math.log(Math.abs(x - r)) + B * Math.log(Math.abs(x - s)), why: R`The quotient \(${quotient}\) has to be integrated as well.` }
          : { tex: terms([[frac(n, 2), 'x^{2}'], [A, lnAbs(r)], [B, lnAbs(s)]]), F: (x) => (n / 2) * x * x + A * Math.log(Math.abs(x - r)) + B * Math.log(Math.abs(x - s)), why: R`The quotient is the constant \(${n}\), and \(\int ${n}\,dx = ${terms([[n, 'x']])}\).` },
        { ...combo(basis, [frac(m, 2), n, B, A]), why: R`Check with the cover-up method: substituting \(x = ${r}\) gives the constant that goes with \(${lnAbs(r)}\).` },
        combo(basis, [frac(m, 2), n, A, -B]),
        combo(basis, [frac(m, 2), -n, A, B]),
      ],
      xs,
    ),
    solution: [
      R`The degree of the numerator is not smaller than the degree of the denominator, so divide first.`,
      R`Long division: \(\dfrac{${top}}{${bottom}} = ${quotient} + \dfrac{${poly(rem)}}{${bottom}}\).`,
      R`Factor \(${bottom} = ${factor(r)}${factor(s)}\) and decompose the remainder: \(\dfrac{${poly(rem)}}{${bottom}} = ${pieces([[A, r], [B, s]])}\).`,
      R`Integrate the quotient and both pieces: \(${right.tex} + C\).`,
    ],
    rule: 5,
    skill: 'improper fractions',
    check: () => checkAntideriv(right.F, (x) => polyEval(N, x) / polyEval(den, x), xs),
  });
}

function hardDefinite(rng) {
  const a = rng.int(0, 2);
  const b = a + rng.int(1, 3);
  const A = rng.nonzero(-4, 4);
  const B = rng.nonzero(-4, 4);
  const lo = a === 0 ? 1 : rng.int(0, 1);
  const hi = lo + rng.int(1, 3);
  const p = A + B;
  const c = A * b + B * a;
  const den = poly([1, a + b, a * b]);
  const fa = linear(1, a);
  const fb = linear(1, b);
  const right = lnCombo([[A, hi + a, lo + a], [B, hi + b, lo + b]]);
  const part = (k, n, d) => terms([[k, d === 1 ? `\\ln ${n}` : `\\ln\\frac{${n}}{${d}}`]]);
  return q({
    prompt: R`Evaluate \(\displaystyle\int_{${lo}}^{${hi}} \frac{${linear(p, c)}}{${den}}\,dx\).`,
    ...exactChoices(right, [
      { k: lnCombo([[B, hi + a, lo + a], [A, hi + b, lo + b]]), why: R`Check with the cover-up method: substituting \(x = ${-a}\) gives the constant over \(${fa}\).` },
      { k: lnCombo([[A, hi + a], [B, hi + b]]), why: R`The lower limit contributes too: at \(x = ${lo}\) the antiderivative is not 0.` },
      { k: lnCombo([[A, (hi + a) * (lo + a)], [B, (hi + b) * (lo + b)]]), why: 'Subtract the value at the lower limit. Do not add it.' },
      lnCombo([[A, hi + a, lo + a], [-B, hi + b, lo + b]]),
      lnCombo([[-A, hi + a, lo + a], [-B, hi + b, lo + b]]),
      lnCombo([[A + B, (hi + a) * (hi + b), (lo + a) * (lo + b)]]),
    ]),
    solution: [
      R`Factor the denominator: \(${den} = ${a === 0 ? 'x' : `(${fa})`}(${fb})\). Use \(\dfrac{A}{${fa}} + \dfrac{B}{${fb}}\).`,
      R`Clear the denominators: \(${linear(p, c)} = A(${fb}) + B(${a === 0 ? 'x' : fa})\). At \(x = ${-a}\): \(A = ${A}\). At \(x = ${-b}\): \(B = ${B}\).`,
      R`\(\displaystyle\int_{${lo}}^{${hi}} \left(${fterms([[A, '', fa], [B, '', fb]])}\right)dx = \Big[${terms([[A, `\\ln|${fa}|`], [B, `\\ln|${fb}|`]])}\Big]_{${lo}}^{${hi}} = ${part(A, hi + a, lo + a)} ${B < 0 ? '-' : '+'} ${part(Math.abs(B), hi + b, lo + b)}\).`,
      R`Simplify: \(${right.tex}\).`,
    ],
    rule: 2,
    skill: 'definite integrals',
    check: () => checkIntegral((x) => (p * x + c) / ((x + a) * (x + b)), lo, hi, right.value),
  });
}

// ───────────── Challenge ─────────────

function challengeThreeFactors(rng) {
  const [r, s, t] = rng.sample([-4, -3, -2, -1, 1, 2, 3, 4], 3).sort((x, y) => x - y);
  let A;
  let B;
  let D;
  do {
    A = rng.nonzero(-3, 3);
    B = rng.nonzero(-3, 3);
    D = rng.nonzero(-3, 3);
  } while (A === B && B === D);
  const N = polyAdd(polyAdd(polyMul([A], polyMul([1, -s], [1, -t])), polyMul([B], polyMul([1, -r], [1, -t]))), polyMul([D], polyMul([1, -r], [1, -s])));
  const top = poly(N);
  const xs = rightOf(r, s, t);
  const basis = [r, s, t].map((v) => ({ tex: lnAbs(v), f: lnJs(v) }));
  const right = combo(basis, [A, B, D]);
  const cover = (root, others, name, value) => R`At \(x = ${root}\): \(${polyEval(N, root)} = ${terms([[(root - others[0]) * (root - others[1]), name]])}\), so \(${name} = ${value}\).`;
  return q({
    prompt: R`Find \(\displaystyle\int \frac{${top}}{${factor(r)}${factor(s)}${factor(t)}}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...combo(basis, [B, D, A]), why: R`Match each constant to its own factor: substituting \(x = ${r}\) gives the constant that goes with \(${lnAbs(r)}\).` },
        { ...combo(basis, [A, -B, D]), why: R`Check the sign of the middle constant. At \(x = ${s}\) the other two factors multiply to \(${(s - r) * (s - t)}\).` },
        combo(basis, [A, D, B]),
        combo(basis, [-A, B, D]),
        combo(basis, [A, B, -D]),
        combo(basis, [-A, -B, -D]),
      ],
      xs,
    ),
    solution: [
      R`Three distinct linear factors: use \(\dfrac{A}{${fac(r)}} + \dfrac{B}{${fac(s)}} + \dfrac{D}{${fac(t)}}\).`,
      R`Clear the denominators: \(${top} = A(${fac(s)})(${fac(t)}) + B(${fac(r)})(${fac(t)}) + D(${fac(r)})(${fac(s)})\).`,
      R`${cover(r, [s, t], 'A', A)} ${cover(s, [r, t], 'B', B)} ${cover(t, [r, s], 'D', D)}`,
      R`Integrate each piece: \(${right.tex} + C\).`,
    ],
    rule: 1,
    skill: 'three linear factors',
    check: () => checkAntideriv(right.F, (x) => polyEval(N, x) / ((x - r) * (x - s) * (x - t)), xs),
  });
}

function challengeFindConstant(rng) {
  const [r, s] = distinctPair(rng, -4, 4);
  const A = rng.nonzero(-5, 5);
  const B = rng.nonzero(-5, 5);
  const p = A + B;
  const k = -(A * s + B * r);
  const topTex = terms([[p, 'x'], [1, 'k']]);
  return q({
    prompt: R`For certain constants \(k\) and \(B\), \(\displaystyle\int \frac{${topTex}}{${factor(r)}${factor(s)}}\,dx = ${terms([[A, lnAbs(r)]])} + B\ln|${fac(s)}| + C\). Find \(k\).`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: A * (r - s), why: R`Substituting \(x = ${r}\) into the numerator gives \(${p === 0 ? 'k' : `${p * r} + k`}\), not just \(k\).` },
      { value: A * (s - r) - p * r, why: R`At \(x = ${r}\) the remaining factor is \(${r} - ${paren(s)} = ${r - s}\).` },
      { value: A - p * r, why: R`The constant \(${A}\) equals the numerator at \(x = ${r}\) divided by \(${r - s}\). Multiply back by \(${r - s}\).` },
      -k,
      k + A,
    ],
    solution: [
      R`The coefficient of \(${lnAbs(r)}\) is the constant \(A\) in \(\dfrac{A}{${fac(r)}}\), so \(A = ${A}\).`,
      R`Cover-up rule: \(A\) is the numerator at \(x = ${r}\) divided by the other factor at \(x = ${r}\): \(${A} = \dfrac{${p === 0 ? 'k' : `${p * r} + k`}}{${r - s}}\).`,
      R`So \(${p === 0 ? 'k' : `${p * r} + k`} = ${A * (r - s)}\), which gives \(k = ${k}\).`,
    ],
    rule: 1,
    skill: 'working backwards',
    check: () =>
      checkAll(
        checkEqual((p * r + k) / (r - s), A, 1e-9, 'A'),
        checkAntideriv((x) => A * Math.log(Math.abs(x - r)) + B * Math.log(Math.abs(x - s)), (x) => (p * x + k) / ((x - r) * (x - s)), rightOf(r, s)),
      ),
  });
}

function challengeDefiniteQuadratic(rng) {
  const c = rng.int(1, 3);
  const A = rng.nonzero(-3, 3);
  const b2 = rng.nonzero(-2, 2);
  const D = rng.nonzero(-4, 4);
  const B = 2 * b2;
  // N = A(x² + 1) + (Bx + D)(x + c)
  const N = [A + B, B * c + D, A + D * c];
  const top = poly(N);
  const fc = linear(1, c);
  // A·ln((1 + c)/c) + b2·ln 2 + D·π/4, written with ln 2 and ln 3 only.
  const logs = { 1: [A + b2, 0], 2: [b2 - A, A], 3: [2 * A + b2, -A] }[c];
  const make = (l2, l3, piCoef) => K([[l2, '\\ln 2'], [l3, '\\ln 3'], [piCoef, '\\pi']]);
  const right = make(logs[0], logs[1], frac(D, 4));
  const noHalf = { 1: [A + B, 0], 2: [B - A, A], 3: [2 * A + B, -A] }[c];
  const noLower = { 1: [A + b2, 0], 2: [b2, A], 3: [2 * A + b2, 0] }[c];
  return q({
    prompt: R`Evaluate \(\displaystyle\int_{0}^{1} \frac{${top}}{(${fc})(x^{2} + 1)}\,dx\).`,
    ...exactChoices(right, [
      { k: make(noHalf[0], noHalf[1], frac(D, 4)), why: R`\(\displaystyle\int \frac{x}{x^{2} + 1}\,dx = \frac{1}{2}\ln(x^{2} + 1)\): the substitution brings a factor \(\frac{1}{2}\).` },
      c > 1 ? { k: make(noLower[0], noLower[1], frac(D, 4)), why: R`At the lower limit \(\ln|${fc}| = \ln ${c}\), which is not 0.` } : null,
      { k: make(logs[0], logs[1], frac(D, 2)), why: R`\(\arctan 1 = \frac{\pi}{4}\).` },
      make(logs[0], logs[1], frac(-D, 4)),
      make(logs[0], logs[1], 0),
      make(-logs[0], -logs[1], frac(D, 4)),
    ]),
    solution: [
      R`Use \(\dfrac{A}{${fc}} + \dfrac{Bx + D}{x^{2} + 1}\). Clear the denominators: \(${top} = A(x^{2} + 1) + (Bx + D)(${fc})\).`,
      R`At \(x = ${-c}\): \(${polyEval(N, -c)} = ${c * c + 1}A\), so \(A = ${A}\). Comparing \(x^{2}\) coefficients: \(A + B = ${N[0]}\), so \(B = ${B}\). Comparing constants: \(${terms([[1, 'A'], [c, 'D']])} = ${N[2]}\), so \(D = ${D}\).`,
      R`An antiderivative is \(${terms([[A, `\\ln|${fc}|`], [b2, '\\ln(x^{2} + 1)'], [D, '\\arctan x']])}\).`,
      R`At \(x = 1\): \(${fterms([[A, `\\ln ${c + 1}`], [b2, '\\ln 2'], [frac(D, 4), '\\pi']])}\). At \(x = 0\): \(${c === 1 ? '0' : terms([[A, `\\ln ${c}`]])}\).`,
      R`Subtract: \(${right.tex}\).`,
    ],
    rule: 4,
    skill: 'definite integrals',
    check: () => checkIntegral((x) => polyEval(N, x) / ((x + c) * (x * x + 1)), 0, 1, right.value),
  });
}

function challengeWordLogisticTime(rng) {
  const p1 = rng.int(1, 7);
  const p2 = rng.int(p1 + 1, 9);
  const m = rng.int(1, 4);
  const k = 10 * m;
  const right = lnCombo([[m, p2 * (10 - p1), p1 * (10 - p2)]]);
  const months = (tex) => R`\(${tex}\) months`;
  const integrand = R`\dfrac{${k}}{P(10 - P)}`;
  return q({
    prompt: R`A lake can support 1000 fish. With \(P\) measured in hundreds of fish, a model says that the time in months for the population to grow from \(P = ${p1}\) to \(P = ${p2}\) is \(T = \displaystyle\int_{${p1}}^{${p2}} ${integrand}\,dP\). Find \(T\).`,
    ...exactChoices(
      right,
      [
        { k: lnCombo([[m, p2 * (10 - p2), p1 * (10 - p1)]]), why: R`\(\displaystyle\int \frac{dP}{10 - P} = -\ln|10 - P|\). The minus sign comes from the \(-P\).` },
        { k: lnCombo([[m, p2, p1]]), why: R`The second piece counts too: \(${integrand} = \dfrac{${m}}{P} + \dfrac{${m}}{10 - P}\).` },
        { k: lnCombo([[k, p2 * (10 - p1), p1 * (10 - p2)]]), why: R`The constants in the decomposition are \(${m}\) and \(${m}\), not \(${k}\).` },
        lnCombo([[m, 10 - p1, 10 - p2]]),
        lnCombo([[2 * m, p2 * (10 - p1), p1 * (10 - p2)]]),
      ],
      months,
    ),
    solution: [
      R`Decompose: \(${integrand} = \dfrac{A}{P} + \dfrac{B}{10 - P}\). Clearing denominators, \(${k} = A(10 - P) + BP\). At \(P = 0\): \(A = ${m}\). At \(P = 10\): \(B = ${m}\).`,
      R`Integrate: \(\displaystyle\int \left(\frac{${m}}{P} + \frac{${m}}{10 - P}\right)dP = ${terms([[m, '\\ln P'], [-m, '\\ln(10 - P)']])} = ${terms([[m, `\\ln\\dfrac{P}{10 - P}`]])}\) for \(0 < P < 10\).`,
      R`Evaluate from \(${p1}\) to \(${p2}\): \(${terms([[m, `\\ln\\frac{${p2}}{${10 - p2}}`]])} - ${terms([[m, `\\ln\\frac{${p1}}{${10 - p1}}`]])}\).`,
      R`Combine the logarithms: \(T = ${right.tex}\) months, about \(${num(right.value, { places: 1 })}\) months.`,
    ],
    rule: 2,
    skill: 'accumulation with partial fractions',
    check: () => checkIntegral((P) => k / (P * (10 - P)), p1, p2, right.value),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'partial-fractions',
  title: 'Partial Fractions',
  summary: 'Split a rational function into simple fractions, then integrate each piece with logarithms and arctangents.',
  standards: ['AP Calculus 6.12', 'OpenStax Calculus Vol. 2 §3.4'],

  explain: {
    intro: R`A rational function such as \(\dfrac{5x - 4}{(x - 2)(x + 1)}\) is hard to integrate as it stands, but it is the sum of two simple fractions, \(\dfrac{2}{x - 2} + \dfrac{3}{x + 1}\), and each of those integrates to a logarithm. Partial fractions is the algebra that finds the simple pieces. In this lesson the constants are called \(A\), \(B\) and \(D\), because \(C\) is kept for the constant of integration.`,
    rules: [
      {
        title: 'Distinct linear factors',
        text: R`When the numerator has lower degree than the denominator and the denominator is a product of different linear factors, each factor gets one fraction with a constant on top: \(\dfrac{P(x)}{(x - r)(x - s)} = \dfrac{A}{x - r} + \dfrac{B}{x - s}\).`,
        example: R`\(\dfrac{5x - 4}{(x - 2)(x + 1)} = \dfrac{A}{x - 2} + \dfrac{B}{x + 1}\).`,
      },
      {
        title: 'Finding the constants',
        text: R`Multiply both sides by the full denominator. Then either substitute the roots of the denominator one at a time (the cover-up method), or expand and match the coefficients of each power of \(x\).`,
        example: R`\(5x - 4 = A(x + 1) + B(x - 2)\). At \(x = 2\): \(6 = 3A\), so \(A = 2\). At \(x = -1\): \(-9 = -3B\), so \(B = 3\).`,
      },
      {
        title: 'Integrate each piece',
        text: R`\(\displaystyle\int \frac{A}{x - r}\,dx = A\ln|x - r| + C\). If the factor is \(ax + b\), divide by \(a\): \(\displaystyle\int \frac{A}{ax + b}\,dx = \frac{A}{a}\ln|ax + b| + C\). In a definite integral, combine the logarithms at the end.`,
        example: R`\(\displaystyle\int \frac{5x - 4}{(x - 2)(x + 1)}\,dx = 2\ln|x - 2| + 3\ln|x + 1| + C\).`,
      },
      {
        title: 'Repeated linear factors',
        text: R`A factor \((x - r)^{2}\) needs two fractions: \(\dfrac{A}{x - r} + \dfrac{B}{(x - r)^{2}}\). The second one is integrated with the power rule: \(\displaystyle\int \frac{B}{(x - r)^{2}}\,dx = -\frac{B}{x - r} + C\).`,
        example: R`\(\dfrac{x + 5}{(x - 1)^{2}} = \dfrac{1}{x - 1} + \dfrac{6}{(x - 1)^{2}}\), which integrates to \(\ln|x - 1| - \dfrac{6}{x - 1} + C\).`,
      },
      {
        title: 'An irreducible quadratic factor',
        text: R`A quadratic factor with no real roots, such as \(x^{2} + a^{2}\), needs a linear numerator: \(\dfrac{Bx + D}{x^{2} + a^{2}}\). Split it in two: \(\displaystyle\int \frac{x}{x^{2} + a^{2}}\,dx = \tfrac{1}{2}\ln(x^{2} + a^{2})\) and \(\displaystyle\int \frac{dx}{x^{2} + a^{2}} = \frac{1}{a}\arctan\frac{x}{a}\).`,
        example: R`\(\displaystyle\int \frac{2x + 3}{x^{2} + 4}\,dx = \ln(x^{2} + 4) + \tfrac{3}{2}\arctan\frac{x}{2} + C\).`,
      },
      {
        title: 'Improper fractions: divide first',
        text: R`Partial fractions only works when the degree of the numerator is less than the degree of the denominator. If it is not, do polynomial long division first, then decompose the remainder.`,
        example: R`\(\dfrac{x^{3} + x}{x^{2} - 1} = x + \dfrac{2x}{x^{2} - 1} = x + \dfrac{1}{x - 1} + \dfrac{1}{x + 1}\).`,
      },
    ],
    vocab: [
      { term: 'rational function', def: 'A quotient of two polynomials.' },
      { term: 'proper fraction', def: 'A rational function whose numerator has lower degree than its denominator. An improper one must be divided first.' },
      { term: 'partial fraction decomposition', def: 'Writing a proper rational function as a sum of simpler fractions, one group for each factor of the denominator.' },
      { term: 'cover-up method', def: R`A shortcut for a distinct linear factor \(x - r\): cover that factor in the denominator and substitute \(x = r\) into what is left.` },
      { term: 'irreducible quadratic', def: R`A quadratic with no real roots, such as \(x^{2} + 4\). It cannot be split into real linear factors.` },
    ],
    mistakes: [
      R`Forgetting the absolute value: \(\displaystyle\int \frac{dx}{x - r} = \ln|x - r| + C\).`,
      R`Using a logarithm for a squared factor. \(\displaystyle\int \frac{dx}{(x - r)^{2}}\) is \(-\dfrac{1}{x - r}\), not \(\ln\left((x - r)^{2}\right)\).`,
      R`Giving a repeated factor only one fraction, or giving an irreducible quadratic a constant numerator.`,
      R`Decomposing an improper fraction without dividing first. The quotient is then lost.`,
    ],
  },

  examples: [
    {
      title: 'Two distinct linear factors',
      problem: R`Find \(\displaystyle\int \frac{5x - 4}{x^{2} - x - 2}\,dx\).`,
      steps: [
        R`Factor the denominator: \(x^{2} - x - 2 = (x - 2)(x + 1)\). Use \(\dfrac{A}{x - 2} + \dfrac{B}{x + 1}\).`,
        R`Clear the denominators: \(5x - 4 = A(x + 1) + B(x - 2)\).`,
        R`At \(x = 2\): \(6 = 3A\), so \(A = 2\). At \(x = -1\): \(-9 = -3B\), so \(B = 3\).`,
        R`Integrate each piece: \(\displaystyle\int \left(\frac{2}{x - 2} + \frac{3}{x + 1}\right)dx\).`,
      ],
      answer: R`\(2\ln|x - 2| + 3\ln|x + 1| + C\)`,
    },
    {
      title: 'A repeated factor',
      problem: R`Find \(\displaystyle\int \frac{x + 5}{(x - 1)^{2}}\,dx\).`,
      steps: [
        R`The factor \(x - 1\) is squared, so use \(\dfrac{A}{x - 1} + \dfrac{B}{(x - 1)^{2}}\).`,
        R`Clear the denominators: \(x + 5 = A(x - 1) + B\). Matching the \(x\)-terms gives \(A = 1\). At \(x = 1\): \(B = 6\).`,
        R`\(\displaystyle\int \frac{1}{x - 1}\,dx = \ln|x - 1|\) and \(\displaystyle\int \frac{6}{(x - 1)^{2}}\,dx = -\frac{6}{x - 1}\).`,
      ],
      answer: R`\(\ln|x - 1| - \dfrac{6}{x - 1} + C\)`,
    },
    {
      title: 'An irreducible quadratic factor',
      problem: R`Find \(\displaystyle\int \frac{3x^{2} + 3x + 4}{x(x^{2} + 4)}\,dx\).`,
      steps: [
        R`\(x^{2} + 4\) cannot be factored, so use \(\dfrac{A}{x} + \dfrac{Bx + D}{x^{2} + 4}\).`,
        R`Clear the denominators: \(3x^{2} + 3x + 4 = A(x^{2} + 4) + (Bx + D)x\). At \(x = 0\): \(4 = 4A\), so \(A = 1\).`,
        R`Match coefficients. \(x^{2}\): \(A + B = 3\), so \(B = 2\). \(x\): \(D = 3\).`,
        R`\(\displaystyle\int \frac{1}{x}\,dx = \ln|x|\), \(\displaystyle\int \frac{2x}{x^{2} + 4}\,dx = \ln(x^{2} + 4)\) and \(\displaystyle\int \frac{3}{x^{2} + 4}\,dx = \frac{3}{2}\arctan\frac{x}{2}\).`,
      ],
      answer: R`\(\ln|x| + \ln(x^{2} + 4) + \frac{3}{2}\arctan\dfrac{x}{2} + C\)`,
    },
    {
      title: 'An improper fraction',
      problem: R`Find \(\displaystyle\int \frac{x^{3} + x}{x^{2} - 1}\,dx\).`,
      steps: [
        R`The numerator has the higher degree, so divide first: \(x^{3} + x = x(x^{2} - 1) + 2x\). So the integrand is \(x + \dfrac{2x}{x^{2} - 1}\).`,
        R`Decompose the remainder: \(\dfrac{2x}{(x - 1)(x + 1)} = \dfrac{1}{x - 1} + \dfrac{1}{x + 1}\).`,
        R`Integrate the three terms: \(\dfrac{x^{2}}{2} + \ln|x - 1| + \ln|x + 1|\).`,
      ],
      answer: R`\(\dfrac{x^{2}}{2} + \ln|x^{2} - 1| + C\)`,
    },
    {
      title: 'Word problem: water draining from a tank',
      word: true,
      problem: R`Water drains from a tank at a rate of \(r(t) = \dfrac{12}{(t + 1)(t + 3)}\) liters per minute. How much water drains during the first 3 minutes?`,
      steps: [
        R`The amount is the integral of the rate: \(\displaystyle\int_{0}^{3} \frac{12}{(t + 1)(t + 3)}\,dt\).`,
        R`Decompose: \(\dfrac{12}{(t + 1)(t + 3)} = \dfrac{6}{t + 1} - \dfrac{6}{t + 3}\) (at \(t = -1\): \(\frac{12}{2} = 6\); at \(t = -3\): \(\frac{12}{-2} = -6\)).`,
        R`An antiderivative is \(6\ln(t + 1) - 6\ln(t + 3) = 6\ln\dfrac{t + 1}{t + 3}\).`,
        R`Evaluate: \(6\ln\frac{4}{6} - 6\ln\frac{1}{3} = 6\ln\left(\frac{2}{3}\cdot 3\right) = 6\ln 2\).`,
      ],
      answer: R`\(6\ln 2 \approx 4.16\) liters`,
      visual: {
        type: 'plot',
        x: [0, 6],
        y: [0, 4.4],
        fns: [{ f: (t) => 12 / ((t + 1) * (t + 3)) }],
        shade: [{ f: (t) => 12 / ((t + 1) * (t + 3)), from: 0, to: 3 }],
        axisLabels: ['t (min)', 'r (L/min)'],
        alt: 'Graph of the draining rate, which starts at 4 liters per minute and falls quickly towards 0. The area under the curve from t = 0 to t = 3 is shaded; it equals 6 ln 2, about 4.16 liters.',
      },
    },
  ],

  models: [
    {
      id: 'two-linear-factors',
      title: 'Decompose and integrate (px + q) / ((x − r)(x − s))',
      intro: 'Choose the numerator and the two roots of the denominator. The cover-up method finds A and B.',
      inputs: [
        { name: 'p', label: 'p (coefficient of x on top)', type: 'int', min: -9, max: 9, value: 5 },
        { name: 'c', label: 'q (constant on top)', type: 'int', min: -12, max: 12, value: -4 },
        { name: 'r', label: 'r (first root)', type: 'int', min: -6, max: 6, value: 2 },
        { name: 's', label: 's (second root)', type: 'int', min: -6, max: 6, value: -1 },
      ],
      compute({ p, c, r, s }) {
        if (r === s) return { error: 'The two roots are equal, so the factor is repeated and this form does not apply. Choose different values for r and s.' };
        if (p === 0 && c === 0) return { error: 'The numerator is 0, so the whole fraction is 0. Choose a non-zero p or q.' };
        const A = frac(p * r + c, r - s);
        const B = frac(p * s + c, s - r);
        const top = linear(p, c);
        const note = A.n === 0 || B.n === 0 ? R`One constant is 0 because the numerator shares a factor with the denominator: the fraction simplifies to a single piece.` : undefined;
        return {
          problem: R`\(\displaystyle\int \frac{${top}}{${factor(r)}${factor(s)}}\,dx\)`,
          steps: [
            R`Two distinct linear factors: write \(\dfrac{${top}}{${factor(r)}${factor(s)}} = \dfrac{A}{${fac(r)}} + \dfrac{B}{${fac(s)}}\).`,
            R`Clear the denominators: \(${top} = A(${fac(s)}) + B(${fac(r)})\).`,
            R`Substitute \(x = ${r}\): \(${p * r + c} = ${terms([[r - s, 'A']])}\), so \(A = ${A.tex()}\).`,
            R`Substitute \(x = ${s}\): \(${p * s + c} = ${terms([[s - r, 'B']])}\), so \(B = ${B.tex()}\).`,
            R`Integrate each piece with \(\displaystyle\int \frac{dx}{x - a} = \ln|x - a|\).`,
          ],
          answer: R`\(${terms([[A, lnAbs(r)], [B, lnAbs(s)]])} + C\)`,
          note,
        };
      },
    },
    {
      id: 'repeated-factor',
      title: 'A repeated factor: (px + q) / (x − r)²',
      intro: 'Choose the numerator and the repeated root. See why two fractions are needed.',
      inputs: [
        { name: 'p', label: 'p (coefficient of x on top)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'c', label: 'q (constant on top)', type: 'int', min: -12, max: 12, value: 5 },
        { name: 'r', label: 'r (the repeated root)', type: 'int', min: -6, max: 6, value: 1 },
      ],
      compute({ p, c, r }) {
        if (p === 0 && c === 0) return { error: 'The numerator is 0, so the whole fraction is 0. Choose a non-zero p or q.' };
        const B = p * r + c;
        const top = linear(p, c);
        const u = fac(r);
        return {
          problem: R`\(\displaystyle\int \frac{${top}}{(${u})^{2}}\,dx\)`,
          steps: [
            R`The factor \(${u}\) appears twice, so use \(\dfrac{A}{${u}} + \dfrac{B}{(${u})^{2}}\).`,
            R`Clear the denominators: \(${top} = A(${u}) + B\).`,
            R`Match the \(x\)-terms: \(A = ${p}\). Substitute \(x = ${r}\): \(B = ${B}\).`,
            R`Integrate: \(\displaystyle\int \frac{dx}{${u}} = \ln|${u}|\) and \(\displaystyle\int \frac{dx}{(${u})^{2}} = -\frac{1}{${u}}\) (power rule).`,
          ],
          answer: R`\(${fterms([[p, lnAbs(r)], [-B, '', u]])} + C\)`,
        };
      },
    },
    {
      id: 'draining-rate',
      title: 'Word problem: how much drains from the tank?',
      word: true,
      intro: 'A rate of the form k / ((t + a)(t + b)) starts high and fades. Change the numbers and find the total amount.',
      inputs: [
        { name: 'k', label: 'k (size of the rate)', type: 'int', min: 1, max: 60, value: 12 },
        { name: 'a', label: 'a', type: 'int', min: 1, max: 5, value: 1 },
        { name: 'b', label: 'b', type: 'int', min: 1, max: 9, value: 3 },
        { name: 'T', label: 'T (minutes)', type: 'int', min: 1, max: 20, value: 3 },
      ],
      compute({ k, a, b, T }) {
        if (a === b) return { error: 'With a = b the factor is repeated, so this decomposition does not apply. Choose different values for a and b.' };
        const m = frac(k, b - a);
        const exact = lnCombo([[m, (T + a) * b, (T + b) * a]]);
        const r = (t) => k / ((t + a) * (t + b));
        const rate = R`\dfrac{${k}}{(t + ${a})(t + ${b})}`;
        return {
          problem: R`Water drains from a tank at a rate of \(r(t) = ${rate}\) liters per minute. How much drains during the first ${T} minutes?`,
          steps: [
            R`The amount is the integral of the rate: \(\displaystyle\int_{0}^{${T}} ${rate}\,dt\).`,
            R`Decompose with the cover-up method. At \(t = ${-a}\): \(A = \dfrac{${k}}{${b - a}} = ${m.tex()}\). At \(t = ${-b}\): \(B = \dfrac{${k}}{${a - b}} = ${m.neg().tex()}\).`,
            R`An antiderivative is \(${terms([[m, `\\ln(t + ${a})`], [m.neg(), `\\ln(t + ${b})`]])} = ${terms([[m, `\\ln\\dfrac{t + ${a}}{t + ${b}}`]])}\).`,
            R`Evaluate from 0 to \(${T}\): \(${terms([[m, `\\ln\\dfrac{${T + a}}{${T + b}}`]])} - ${m.value < 0 ? `\\left(${terms([[m, `\\ln\\dfrac{${a}}{${b}}`]])}\\right)` : terms([[m, `\\ln\\dfrac{${a}}{${b}}`]])}\).`,
            R`Combine the logarithms: \(${exact.tex}\).`,
          ],
          answer: R`\(${exact.tex} \approx ${num(exact.value, { places: 2 })}\) liters`,
          visual: {
            type: 'plot',
            x: [0, Math.max(6, T * 1.3)],
            y: [0, r(0) * 1.1],
            fns: [{ f: r }],
            shade: [{ f: r, from: 0, to: T }],
            axisLabels: ['t (min)', 'r (L/min)'],
            alt: `Graph of the draining rate, starting at ${num(r(0), { places: 2 })} liters per minute and falling towards 0. The area under the curve from 0 to ${T} minutes is shaded: about ${num(exact.value, { places: 2 })} liters.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyForm, easyCoverUp, easyIntegratePiece],
    medium: [mediumDecompose, mediumIntegrateLinear, mediumDifferenceOfSquares, mediumWordRate],
    hard: [hardRepeated, hardQuadratic, hardImproper, hardDefinite],
    challenge: [challengeThreeFactors, challengeFindConstant, challengeDefiniteQuadratic, challengeWordLogisticTime],
  },
};
