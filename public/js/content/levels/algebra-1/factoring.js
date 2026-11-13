import { R, q, linear, terms, term, poly, num, gcd, divisors, polyEval, checkSame } from '../../lib/index.js';
import { factored, otherForms } from './_shared.js';

const P = (coefs) => R`\(${poly(coefs)}\)`;
const F = (f) => R`\(${f.tex}\)`;
const pairOf = (p, q) => [[1, p], [1, q]].sort((u, v) => u[1] - v[1]); // (x + p)(x + q), smaller constant first
const expands = (f, coefs) => () => (f.coefs.length === coefs.length && f.coefs.every((v, i) => v === coefs[i]) ? checkSame((t) => polyEval(f.coefs, t), (t) => polyEval(coefs, t)) : 'the factors do not multiply back to the polynomial');
const isSquare = (n) => n >= 0 && Number.isInteger(Math.sqrt(n));
// Another pair of integers with the same product but a different sum.
function otherPair(c, b, positiveOnly = false) {
  for (const u of divisors(c)) {
    for (const [s, t] of positiveOnly ? [[u, c / u]] : [[u, c / u], [-u, -c / u]]) if (s + t !== b && s <= t) return [s, t];
  }
  return null;
}
// A term as plain text for area-model pictures.
const plain = (c, sym = '') => `${c < 0 ? '−' : ''}${Math.abs(c) === 1 && sym ? '' : Math.abs(c)}${sym}`;

// ───────────── Easy ─────────────

function easyGCF(rng) {
  const g = rng.pick([2, 3, 4, 5, 6, 8, 9, 10]);
  const a = rng.int(1, 5);
  const b = rng.nonzero(-9, 9);
  if (gcd(a, b) !== 1) return easyGCF(rng);
  const withX = rng.bool();
  const lead = withX ? [g, 0] : [g];
  const shown = withX ? [g * a, g * b, 0] : [g * a, g * b];
  const correct = factored(lead, [[a, b]]);
  const small = [2, 3, 5].find((d) => g % d === 0 && d !== g);
  return q({
    prompt: R`Factor out the greatest common factor: \(\;${poly(shown)}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      small ? { f: factored(withX ? [small, 0] : [small], [[(a * g) / small, (b * g) / small]]), keep: true, why: R`\(${small}\) is a common factor, but not the greatest one. The terms left inside still share a factor of \(${g / small}\).` } : null,
      withX ? { f: factored([g], [[a, b, 0]]), keep: true, why: R`Both terms also contain \(x\), so \(x\) belongs outside the parentheses as well.` } : null,
      { f: factored(lead, [[a, g * b]]), why: R`Divide every term by the common factor: \(${g * b} \div ${g} = ${b}\).` },
      factored(lead, [[a, -b]]),
      factored(lead, [[g * a, b]]),
    ]),
    solution: [
      R`The greatest number that divides both \(${g * a}\) and \(${Math.abs(g * b)}\) is \(${g}\).${withX ? R` Both terms also contain \(x\), so the greatest common factor is \(${term(g, 'x')}\).` : ''}`,
      R`Divide each term by it: \(${term(g * a, withX ? 'x^{2}' : 'x')} \div ${term(g, withX ? 'x' : '')} = ${term(a, 'x')}\) and \(${term(g * b, withX ? 'x' : '')} \div ${term(g, withX ? 'x' : '')} = ${b}\).`,
      R`So \(${poly(shown)} = ${correct.tex}\). Check by distributing.`,
    ],
    rule: 0,
    skill: 'greatest common factor',
    check: () => (gcd(g * a, g * b) === g ? expands(correct, shown)() : 'g is not the greatest common factor'),
  });
}

function easyTrinomial(rng) {
  const p = rng.int(1, 9);
  const qq = rng.int(p, 10);
  const [b, c] = [p + qq, p * qq];
  const correct = factored([1], pairOf(p, qq));
  const alt = otherPair(c, b, true);
  return q({
    prompt: R`Factor: \(\;${poly([1, b, c])}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      alt ? { f: factored([1], pairOf(...alt)), why: R`\(${alt[0]} \cdot ${alt[1]} = ${c}\), but \(${alt[0]} + ${alt[1]} = ${alt[0] + alt[1]}\). The two numbers must also add to \(${b}\).` } : null,
      { f: factored([1], pairOf(-p, -qq)), why: R`Those numbers multiply to \(${c}\) but add to \(${-b}\). The middle term here is positive, so both numbers are positive.` },
      factored([1], pairOf(-p, qq)),
      factored([1], pairOf(p, qq + 1)),
      factored([1], pairOf(1, b - 1)),
    ]),
    solution: [
      R`Look for two numbers that multiply to \(${c}\) and add to \(${b}\).`,
      R`\(${p} \cdot ${qq} = ${c}\) and \(${p} + ${qq} = ${b}\), so the numbers are \(${p}\) and \(${qq}\).`,
      R`\(${poly([1, b, c])} = ${correct.tex}\).`,
    ],
    rule: 1,
    skill: 'factoring trinomials',
    check: expands(correct, [1, b, c]),
  });
}

function easyDifferenceSquares(rng) {
  const k = rng.int(2, 13);
  const correct = factored([1], pairOf(-k, k));
  return q({
    prompt: R`Factor: \(\;x^{2} - ${k * k}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      { f: factored([1], pairOf(-k, -k)), why: R`\((x - ${k})^{2}\) multiplies out to \(x^{2} - ${2 * k}x + ${k * k}\), which has a middle term.` },
      { f: factored([1, 0], [[1, -k * k]]), why: R`\(${k * k}\) has no factor of \(x\), so \(x\) is not a common factor.` },
      factored([1], pairOf(k, k)),
      factored([1], pairOf(-k * k, 1)),
    ]),
    solution: [
      R`Both terms are perfect squares: \(x^{2}\) and \(${k * k} = ${k}^{2}\), and they are subtracted.`,
      R`Use \(a^{2} - b^{2} = (a + b)(a - b)\) with \(a = x\) and \(b = ${k}\): \(${correct.tex}\).`,
      R`Check: the middle products \(${k}x\) and \(-${k}x\) cancel, leaving \(x^{2} - ${k * k}\).`,
    ],
    rule: 3,
    skill: 'difference of squares',
    check: expands(correct, [1, 0, -k * k]),
  });
}

// ───────────── Medium ─────────────

function mediumTrinomialSigns(rng) {
  const p = rng.nonzero(-9, 9);
  const qq = rng.intExcept(-9, 9, [0, -p]);
  if (p > 0 && qq > 0) return mediumTrinomialSigns(rng);
  const [b, c] = [p + qq, p * qq];
  const correct = factored([1], pairOf(p, qq));
  const alt = otherPair(c, b);
  const [lo, hi] = [Math.min(p, qq), Math.max(p, qq)];
  return q({
    prompt: R`Factor: \(\;${poly([1, b, c])}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      { f: factored([1], pairOf(-p, -qq)), why: R`Those numbers multiply to \(${c}\), but they add to \(${-b}\), not \(${b}\). Change both signs.` },
      alt ? { f: factored([1], pairOf(...alt)), why: R`\(${alt[0]} \cdot ${alt[1] < 0 ? `(${alt[1]})` : alt[1]} = ${c}\), but the sum is \(${alt[0] + alt[1]}\), not \(${b}\).` } : null,
      factored([1], pairOf(-p, qq)),
      factored([1], pairOf(p, -qq)),
      factored([1], pairOf(p, qq + 1)),
    ]),
    solution: [
      R`Look for two numbers that multiply to \(${c}\) and add to \(${b}\). ${c < 0 ? 'The product is negative, so one number is positive and one is negative.' : 'The product is positive and the sum is negative, so both numbers are negative.'}`,
      R`\(${lo} \cdot ${hi < 0 ? `(${hi})` : hi} = ${c}\) and \(${lo} + ${hi < 0 ? `(${hi})` : hi} = ${b}\).`,
      R`\(${poly([1, b, c])} = ${correct.tex}\).`,
    ],
    rule: 1,
    skill: 'factoring trinomials',
    check: expands(correct, [1, b, c]),
  });
}

function mediumGCFTrinomial(rng) {
  const k = rng.int(2, 6);
  const p = rng.nonzero(-7, 7);
  const qq = rng.intExcept(-7, 7, [0, -p]);
  const [b, c] = [p + qq, p * qq];
  const shown = [k, k * b, k * c];
  const correct = factored([k], pairOf(p, qq));
  const [lo, hi] = [Math.min(p, qq), Math.max(p, qq)];
  return q({
    prompt: R`Factor completely: \(\;${poly(shown)}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      { f: factored([k], [[1, b, c]]), keep: true, why: R`The common factor is out, but \(${poly([1, b, c])}\) still factors.` },
      { f: factored([1], [[k, k * lo], [1, hi]]), keep: true, why: R`The first factor still has a common factor of \(${k}\). Take it out in front.` },
      { f: factored([1], pairOf(p, qq)), why: R`The factor \(${k}\) cannot be dropped. Multiplying this back gives \(${poly([1, b, c])}\), not the original.` },
      factored([k], pairOf(-p, -qq)),
      factored([k], pairOf(-p, qq)),
    ]),
    solution: [
      R`Every coefficient is a multiple of \(${k}\). Take it out first: \(${k}(${poly([1, b, c])})\).`,
      R`Now factor the trinomial: two numbers with product \(${c}\) and sum \(${b}\) are \(${lo}\) and \(${hi}\).`,
      R`\(${poly(shown)} = ${correct.tex}\).`,
    ],
    rule: 6,
    skill: 'factoring completely',
    check: expands(correct, shown),
  });
}

function mediumSpecial(rng) {
  if (rng.bool()) {
    const a = rng.intExcept(-12, 12, [-1, 0, 1]);
    const shown = [1, 2 * a, a * a];
    const correct = factored([1], pairOf(a, a));
    return q({
      prompt: R`Factor: \(\;${poly(shown)}\)`,
      correct: F(correct),
      wrong: otherForms(correct, [
        { f: factored([1], pairOf(-a, a)), why: R`That is a difference of squares, \(x^{2} - ${a * a}\). It has no middle term.` },
        { f: factored([1], pairOf(-a, -a)), why: R`Check the middle term: \((${linear(1, -a)})^{2}\) gives \(${term(-2 * a, 'x')}\), not \(${term(2 * a, 'x')}\).` },
        factored([1], pairOf(a * a, 1)),
        factored([1], pairOf(2 * a, a)),
      ]),
      solution: [
        R`The first and last terms are perfect squares: \(x^{2}\) and \(${a * a} = ${Math.abs(a)}^{2}\).`,
        R`The middle term is twice the product of \(x\) and \(${a < 0 ? `(${a})` : a}\): \(2 \cdot x \cdot ${a < 0 ? `(${a})` : a} = ${term(2 * a, 'x')}\). So this is a perfect-square trinomial.`,
        R`\(${poly(shown)} = ${correct.tex}\).`,
      ],
      rule: 4,
      skill: 'perfect-square trinomials',
      check: expands(correct, shown),
    });
  }
  const a = rng.int(2, 7);
  const b = rng.int(1, 9);
  if (gcd(a, b) !== 1) return mediumSpecial(rng);
  const shown = [a * a, 0, -b * b];
  const correct = factored([1], [[a, -b], [a, b]]);
  return q({
    prompt: R`Factor: \(\;${poly(shown)}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      { f: factored([1], [[a, -b], [a, -b]]), why: R`\((${linear(a, -b)})^{2}\) has a middle term, \(-${2 * a * b}x\). A difference of squares uses one plus and one minus.` },
      { f: factored([a], [[1, -b], [1, b]]), why: R`\(${a * a}x^{2}\) is \((${a}x)^{2}\), so each factor starts with \(${a}x\).` },
      factored([1], [[a * a, -b], [1, b]]),
      factored([1], [[a, -b * b], [a, 1]]),
    ]),
    solution: [
      R`Both terms are perfect squares: \(${a * a}x^{2} = (${a}x)^{2}\) and \(${b * b} = ${b}^{2}\), and they are subtracted.`,
      R`Use \(a^{2} - b^{2} = (a + b)(a - b)\) with \(a = ${a}x\) and \(b = ${b}\).`,
      R`\(${poly(shown)} = ${correct.tex}\).`,
    ],
    rule: 3,
    skill: 'difference of squares',
    check: expands(correct, shown),
  });
}

function mediumStoryDimensions(rng) {
  const place = rng.pick(['garden', 'car park', 'playing field', 'floor', 'stage']);
  const p = rng.int(1, 9);
  const qq = p + rng.int(1, 6);
  const [b, c] = [p + qq, p * qq];
  const side = (k) => R`\(${linear(1, k)}\)`;
  return q({
    prompt: R`A rectangular ${place} has an area of \(${poly([1, b, c])}\) square metres. Its length is \(${linear(1, qq)}\) metres. Which expression is its width in metres?`,
    correct: side(p),
    wrong: [
      { value: side(c - qq), why: R`The two constants multiply to \(${c}\). Divide: \(${c} \div ${qq} = ${p}\).` },
      { value: side(b), why: R`\(${b}\) is the sum of the two constants, so the missing one is \(${b} - ${qq}\).` },
      side(-p),
      side(b + qq),
      side(p + 1),
    ],
    solution: [
      R`Area is length times width, so factor the area: \(${poly([1, b, c])} = (x + \square)(${linear(1, qq)})\).`,
      R`The constants must multiply to \(${c}\) and add to \(${b}\). Since one of them is \(${qq}\), the other is \(${c} \div ${qq} = ${p}\).`,
      R`Check the sum: \(${qq} + ${p} = ${b}\). ✓ The width is \(${linear(1, p)}\) metres.`,
    ],
    rule: 1,
    skill: 'factoring word problems',
    check: expands(factored([1], [[1, p], [1, qq]]), [1, b, c]),
  });
}

// ───────────── Hard ─────────────

function hardLeadingCoef(rng) {
  const [m, n] = rng.pick([[2, 1], [3, 1], [5, 1], [2, 3], [7, 1], [3, 2], [2, 5], [4, 1]]);
  const p = rng.nonzero(-7, 7);
  const qq = rng.nonzero(-7, 7);
  if (gcd(m, p) !== 1 || gcd(n, qq) !== 1 || m * qq + n * p === 0) return hardLeadingCoef(rng);
  const shown = [m * n, m * qq + n * p, p * qq];
  const correct = factored([1], [[m, p], [n, qq]]);
  const [s, t] = [m * qq, n * p]; // the two numbers of the ac method
  return q({
    prompt: R`Factor: \(\;${poly(shown)}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      { f: factored([1], [[m, qq], [n, p]]), why: R`The first and last terms work, but check the middle: the outer and inner products give \(${term(m * p + n * qq, 'x')}\), not \(${term(shown[1], 'x')}\).` },
      { f: factored([1], [[m, -p], [n, -qq]]), why: R`Multiply it back: the middle term comes out as \(${term(-shown[1], 'x')}\). Both signs need to change.` },
      factored([1], [[m, p], [n, -qq]]),
      factored([1], [[m * n, p], [1, qq]]),
      factored([1], [[m, p + 1], [n, qq]]),
    ]),
    solution: [
      R`Multiply \(a \cdot c = ${m * n} \cdot ${shown[2] < 0 ? `(${shown[2]})` : shown[2]} = ${m * n * shown[2]}\). Find two numbers with that product and sum \(${shown[1]}\): \(${s}\) and \(${t}\).`,
      R`Split the middle term: \(${terms([[m * n, 'x^{2}'], [s, 'x'], [t, 'x'], [shown[2], '']])}\).`,
      R`Factor each pair: \(${term(m, 'x')}(${linear(n, qq)}) ${p < 0 ? '-' : '+'} ${Math.abs(p) === 1 ? '' : Math.abs(p)}(${linear(n, qq)})\).`,
      R`Take out the common binomial: \(${correct.tex}\).`,
    ],
    rule: 2,
    skill: 'factoring ax² + bx + c',
    check: expands(correct, shown),
  });
}

function hardGrouping(rng) {
  const a = rng.nonzero(-9, 9);
  const b = rng.int(1, 9);
  const k = rng.pick([1, 1, 2, 3]);
  if (gcd(k, b) !== 1) return hardGrouping(rng); // otherwise kx² + b would still have a common factor
  const shown = [k, k * a, b, a * b];
  const correct = factored([1], [[1, a], [k, 0, b]]);
  const inner = linear(1, a);
  const halfway = terms([[k, `x^{2}(${inner})`], [b, `(${inner})`]]); // the two groups, each factored
  return q({
    prompt: R`Factor by grouping: \(\;${poly(shown)}\)`,
    correct: F(correct),
    wrong: [
      { value: R`\(${halfway}\)`, form: true, why: R`That is still a sum of two terms. Both contain \((${inner})\), so take it out as a common factor.` },
      ...otherForms(correct, [
        { f: factored([1], [[1, b], [k, 0, a]]), why: R`Multiply it back: the \(x^{2}\)-term would be \(${term(k * b, 'x^{2}')}\), not \(${term(k * a, 'x^{2}')}\).` },
        factored([1], [[1, -a], [k, 0, b]]),
        factored([1], [[1, a], [k, 0, -b]]),
      ]),
    ],
    solution: [
      R`Group the terms in pairs: \((${poly([k, k * a, 0, 0])}) + (${linear(b, a * b)})\).`,
      R`Factor each pair: \(${halfway}\).`,
      R`Both parts contain \((${inner})\). Take it out: \(${correct.tex}\).`,
    ],
    rule: 5,
    skill: 'factoring by grouping',
    check: expands(correct, shown),
  });
}

function hardCompletely(rng) {
  const k = rng.int(2, 5);
  if (rng.bool()) {
    const a = rng.int(2, 9);
    const shown = [k, 0, -k * a * a, 0];
    const correct = factored([k, 0], pairOf(-a, a));
    return q({
      prompt: R`Factor completely: \(\;${poly(shown)}\)`,
      correct: F(correct),
      wrong: otherForms(correct, [
        { f: factored([k, 0], [[1, 0, -a * a]]), keep: true, why: R`\(x^{2} - ${a * a}\) is a difference of squares, so it factors again.` },
        { f: factored([k], [[1, 0, -a * a, 0]]), keep: true, why: R`Each term also contains \(x\). Take out \(${k}x\), then look at what is left.` },
        { f: factored([k, 0], pairOf(-a, -a)), why: R`\((x - ${a})^{2}\) has a middle term. A difference of squares factors as \((x - ${a})(x + ${a})\).` },
        factored([1, 0], [[k, -a], [1, a]]),
      ]),
      solution: [
        R`Take out the greatest common factor, \(${k}x\): \(${k}x(x^{2} - ${a * a})\).`,
        R`What is left is a difference of squares: \(x^{2} - ${a * a} = (x - ${a})(x + ${a})\).`,
        R`\(${poly(shown)} = ${correct.tex}\).`,
      ],
      rule: 6,
      skill: 'factoring completely',
      check: expands(correct, shown),
    });
  }
  const p = rng.nonzero(-6, 6);
  const qq = rng.intExcept(-6, 6, [0, -p]);
  const [b, c] = [p + qq, p * qq];
  const shown = [k, k * b, k * c, 0];
  const correct = factored([k, 0], pairOf(p, qq));
  return q({
    prompt: R`Factor completely: \(\;${poly(shown)}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      { f: factored([k, 0], [[1, b, c]]), keep: true, why: R`The trinomial \(${poly([1, b, c])}\) still factors.` },
      { f: factored([k], [[1, b, c, 0]]), keep: true, why: R`Each term also contains \(x\). Take out \(${k}x\), then factor what is left.` },
      { f: factored([k, 0], pairOf(-p, -qq)), why: R`Multiply back: the middle term would have the opposite sign. The two numbers must add to \(${b}\).` },
      factored([k, 0], pairOf(-p, qq)),
    ]),
    solution: [
      R`Take out the greatest common factor, \(${k}x\): \(${k}x(${poly([1, b, c])})\).`,
      R`Factor the trinomial: two numbers with product \(${c}\) and sum \(${b}\) are \(${Math.min(p, qq)}\) and \(${Math.max(p, qq)}\).`,
      R`\(${poly(shown)} = ${correct.tex}\).`,
    ],
    rule: 6,
    skill: 'factoring completely',
    check: expands(correct, shown),
  });
}

// ───────────── Challenge ─────────────

function challengeFindK(rng) {
  const a = rng.int(2, 12);
  const asK = (v) => R`\(k = ${num(v)}\)`;
  if (rng.bool()) {
    return q({
      prompt: R`For what positive value of \(k\) is \(\;x^{2} + kx + ${a * a}\;\) a perfect-square trinomial?`,
      correct: 2 * a,
      fmt: asK,
      wrong: [
        { value: a, why: R`\((x + ${a})^{2} = x^{2} + ${2 * a}x + ${a * a}\). The middle coefficient is twice \(${a}\), because the middle product appears twice.` },
        { value: a * a, why: R`\(${a * a}\) is the last term, \(${a}^{2}\). The middle coefficient is \(2 \cdot ${a}\).` },
        4 * a,
        a + 2,
      ],
      solution: [
        R`A perfect-square trinomial has the form \((x + a)^{2} = x^{2} + 2ax + a^{2}\).`,
        R`The last term gives \(a^{2} = ${a * a}\), so \(a = ${a}\) (taking the positive value).`,
        R`The middle coefficient is \(2a = ${2 * a}\). Check: \((x + ${a})^{2} = x^{2} + ${2 * a}x + ${a * a}\). ✓`,
      ],
      rule: 4,
      skill: 'perfect-square trinomials',
      check: () => ((2 * a) ** 2 - 4 * a * a === 0 ? true : 'not a perfect square'),
    });
  }
  const s = rng.sign();
  const b = 2 * a * s;
  return q({
    prompt: R`For what value of \(k\) is \(\;${terms([[1, 'x^{2}'], [b, 'x']])} + k\;\) a perfect-square trinomial?`,
    correct: a * a,
    fmt: asK,
    wrong: [
      { value: a, why: R`Half of the middle coefficient is \(${s * a}\). The last term is the square of that number.` },
      { value: 4 * a * a, why: R`Take half of \(${b}\) first, then square it: \(\left(${s * a}\right)^{2}\).` },
      2 * a,
      -a * a,
    ],
    solution: [
      R`A perfect-square trinomial has the form \((x + a)^{2} = x^{2} + 2ax + a^{2}\).`,
      R`The middle coefficient gives \(2a = ${b}\), so \(a = ${s * a}\).`,
      R`The last term is \(a^{2} = ${a * a}\). Check: \((${linear(1, s * a)})^{2} = ${poly([1, b, a * a])}\). ✓`,
    ],
    rule: 4,
    skill: 'perfect-square trinomials',
    check: () => (b * b - 4 * a * a === 0 ? true : 'not a perfect square'),
  });
}

function challengeQuartic(rng) {
  const [b, a] = rng.pick([[1, 2], [1, 3], [1, 4], [1, 5], [2, 1], [2, 3], [2, 5], [3, 1], [3, 2], [3, 4]]);
  const k = rng.pick([1, 1, 2, 3, 5]);
  const shown = [k * b ** 4, 0, 0, 0, -k * a ** 4];
  const [sq, sum] = [[b * b, 0, -a * a], [b * b, 0, a * a]];
  const correct = factored([k], [[b, -a], [b, a], sum]);
  return q({
    prompt: R`Factor completely: \(\;${poly(shown)}\)`,
    correct: F(correct),
    wrong: otherForms(correct, [
      { f: factored([k], [sq, sum]), keep: true, why: R`\(${poly(sq)}\) is itself a difference of squares, so it factors again.` },
      { f: factored([k], [sq, sq]), why: R`\((${poly(sq)})^{2}\) multiplies out with a middle term, \(-${2 * a * a * b * b}x^{2}\). A difference of squares needs one plus and one minus.` },
      factored([k], [[b, -a], [b, -a], sum]),
      factored([k], [[b, -a], [b, a], [b, -a], [b, a]]),
    ]),
    solution: [
      k > 1 ? R`Take out the common factor \(${k}\): \(${k}(${poly([b ** 4, 0, 0, 0, -(a ** 4)])})\).` : R`There is no common factor, and both terms are perfect squares.`,
      R`\(${poly([b ** 4, 0, 0, 0, -(a ** 4)])}\) is a difference of squares, \((${term(b * b, 'x^{2}')})^{2} - ${a * a}^{2}\): it factors as \((${poly(sq)})(${poly(sum)})\).`,
      R`\(${poly(sq)}\) is a difference of squares again: \((${linear(b, -a)})(${linear(b, a)})\). The sum of squares \(${poly(sum)}\) does not factor.`,
      R`Result: \(${correct.tex}\).`,
    ],
    rule: 6,
    skill: 'factoring completely',
    check: expands(correct, shown),
  });
}

function challengePrime(rng) {
  let b = 0;
  let c = rng.int(2, 6) ** 2;
  if (rng.bool(0.7)) {
    do {
      b = rng.nonzero(-9, 9);
      c = rng.nonzero(-12, 12);
    } while (isSquare(b * b - 4 * c));
  }
  const p = rng.nonzero(-8, 8);
  const qq = rng.intExcept(-8, 8, [0, p, -p]);
  const k = rng.int(2, 9);
  const a = rng.nonzero(-7, 7);
  const others = [[1, p + qq, p * qq], [1, 0, -k * k], [1, 2 * a, a * a]];
  const how = [factored([1], pairOf(p, qq)), factored([1], pairOf(-k, k)), factored([1], pairOf(a, a))];
  if (others.some((o) => o[1] === b && o[2] === c)) return challengePrime(rng);
  const pairs = divisors(c).filter((u) => u * u <= Math.abs(c)).flatMap((u) => (u === -c / u ? [[u, c / u]] : [[u, c / u], [-u, -c / u]]));
  return q({
    prompt: 'Which polynomial is prime? (It cannot be written as a product of two binomials with integer coefficients.)',
    correct: P([1, b, c]),
    wrong: others.map((o, i) => ({ value: P(o), why: R`This one factors: \(${how[i].tex}\).` })),
    solution: [
      R`To factor \(x^{2} + bx + c\) you need two integers that multiply to \(c\) and add to \(b\).`,
      R`For \(${poly([1, b, c])}\): the integer pairs with product \(${c}\) are ${pairs.map(([u, v]) => R`\(${u}\) and \(${v}\)`).join('; ')}. Their sums are \(${pairs.map(([u, v]) => u + v).join(', ')}\).`,
      R`None of those sums is \(${b}\), so \(${poly([1, b, c])}\) is prime. The other three all factor.`,
    ],
    rule: 1,
    skill: 'recognising prime polynomials',
    check: () => (!isSquare(b * b - 4 * c) && others.every((o) => isSquare(o[1] * o[1] - 4 * o[2])) && pairs.every(([u, v]) => u + v !== b) ? true : 'prime/factorable classification is wrong'),
  });
}

// ───────────── Interactive models ─────────────

function trinomialModel({ a, b, c }) {
  if (a === 0) return { error: 'With a = 0 there is no x² term, so this is not a quadratic. Choose a value other than 0 for a.' };
  const g = gcd(gcd(a, b), c) * (a < 0 ? -1 : 1);
  const [A, B, C] = [a / g, b / g, c / g];
  const problem = R`Factor \(${poly([a, b, c])}\) completely.`;
  const gTex = g === -1 ? '-' : num(g);
  const steps = [g === 1 ? 'The three terms have no common factor other than 1.' : R`Take out the common factor \(${g}\)${g < 0 ? ' (negative, so that the leading coefficient inside is positive)' : ''}: \(${gTex}(${poly([A, B, C])})\).`];
  if (C === 0) {
    const inner = factored([g, 0], B === 0 ? [] : [[A, B]]);
    steps.push(B === 0 ? R`Only one term is left, so the factored form is \(${inner.tex}\).` : R`There is no constant term, so \(x\) is a common factor too: \(${inner.tex}\).`);
    return { problem, steps, answer: F(inner) };
  }
  const prod = A * C;
  let pair = null;
  for (const u of divisors(prod)) {
    for (const [s, t] of [[u, prod / u], [-u, -prod / u]]) if (!pair && s + t === B) pair = [s, t];
  }
  steps.push(R`Find two integers with product \(${A === 1 ? 'c' : R`a \cdot c`} = ${prod}\) and sum \(b = ${B}\).`);
  if (!pair) {
    steps.push(R`Try every pair of factors of \(${prod}\): none of them adds to \(${B}\). (The discriminant \(b^{2} - 4ac = ${B * B - 4 * A * C}\) is not a perfect square.)`);
    return { problem, steps, answer: g === 1 ? 'Prime: it cannot be factored using integers.' : R`\(${gTex}(${poly([A, B, C])})\). The trinomial inside is prime.` };
  }
  const [s, t] = pair;
  const g1 = gcd(A, s);
  const g2 = gcd(t, C) * (t < 0 ? -1 : 1);
  const result = factored([g], [[A / g1, s / g1], [g1, g2]]);
  steps.push(R`The numbers are \(${s}\) and \(${t}\): \(${s} \cdot ${t < 0 ? `(${t})` : t} = ${prod}\) and \(${s} + ${t < 0 ? `(${t})` : t} = ${B}\).`);
  if (A === 1) steps.push(R`The leading coefficient is 1, so they go straight into the factors: \((${linear(1, s)})(${linear(1, t)})\).`);
  else {
    steps.push(R`Split the middle term: \(${terms([[A, 'x^{2}'], [s, 'x'], [t, 'x'], [C, '']])}\).`);
    steps.push(R`Factor each pair: \(${term(g1, 'x')}(${linear(A / g1, s / g1)}) ${g2 < 0 ? '-' : '+'} ${Math.abs(g2) === 1 ? '' : Math.abs(g2)}(${linear(A / g1, s / g1)})\).`);
    steps.push(R`Take out the common binomial: \((${linear(A / g1, s / g1)})(${linear(g1, g2)})\).`);
  }
  steps.push(R`Check by multiplying back: \(${result.tex} = ${poly(result.coefs)}\). ✓`);
  return {
    problem,
    steps,
    answer: F(result),
    visual: {
      type: 'areaModel', rows: [plain(g1, 'x'), plain(g2)], cols: [plain(A / g1, 'x'), plain(s / g1)],
      cells: [[plain(A, 'x²'), plain(s, 'x')], [plain(t, 'x'), plain(C)]],
      alt: `Area model: the four boxes ${plain(A, 'x²')}, ${plain(s, 'x')}, ${plain(t, 'x')} and ${plain(C)} have side lengths ${plain(g1, 'x')} and ${plain(g2)} down the side, and ${plain(A / g1, 'x')} and ${plain(s / g1)} across the top.`,
    },
  };
}

export default {
  id: 'factoring',
  title: 'Factoring Polynomials',
  summary: 'Rewrite polynomials as products: common factors, trinomials, differences of squares, perfect squares and grouping.',
  standards: ['CCSS A-SSE.A.2', 'CCSS A-SSE.B.3'],

  explain: {
    intro: R`Factoring is multiplication run backwards: you start with a polynomial and find the factors that multiply to give it. A factored form shows things the expanded form hides, such as where an expression equals zero. Every answer can be checked by multiplying the factors back together.`,
    rules: [
      {
        title: 'Take out the greatest common factor first',
        text: R`Look for the largest number and the highest power of the variable that divide every term. Write that in front and divide each term by it. Always do this before trying anything else.`,
        example: R`\(6x^{3} - 9x^{2} = 3x^{2}(2x - 3)\).`,
      },
      {
        title: 'x² + bx + c: product c, sum b',
        text: R`Find two numbers that multiply to \(c\) and add to \(b\). They are the constants in the two factors. If \(c\) is positive the numbers have the same sign as \(b\); if \(c\) is negative their signs are different.`,
        example: R`\(x^{2} - x - 12\): the numbers \(-4\) and 3 multiply to \(-12\) and add to \(-1\), so it is \((x - 4)(x + 3)\).`,
      },
      {
        title: 'ax² + bx + c: the ac method',
        text: R`Find two numbers that multiply to \(a \cdot c\) and add to \(b\). Use them to split the middle term into two terms, then factor by grouping.`,
        example: R`\(6x^{2} + 7x - 3\): \(9\) and \(-2\) multiply to \(-18\) and add to 7. \(6x^{2} + 9x - 2x - 3 = 3x(2x + 3) - (2x + 3) = (2x + 3)(3x - 1)\).`,
      },
      {
        title: 'Difference of squares',
        text: R`Two perfect squares that are subtracted factor as a sum times a difference: \(a^{2} - b^{2} = (a + b)(a - b)\). A sum of squares, \(a^{2} + b^{2}\), does not factor with real numbers.`,
        example: R`\(x^{2} - 49 = (x + 7)(x - 7)\) and \(4x^{2} - 25 = (2x + 5)(2x - 5)\).`,
      },
      {
        title: 'Perfect-square trinomials',
        text: R`If the first and last terms are perfect squares and the middle term is twice the product of their square roots, the trinomial is a binomial squared: \(a^{2} \pm 2ab + b^{2} = (a \pm b)^{2}\).`,
        example: R`\(x^{2} - 10x + 25 = (x - 5)^{2}\), because \(2 \cdot x \cdot 5 = 10x\).`,
      },
      {
        title: 'Factoring by grouping',
        text: R`With four terms, group them in pairs and take the common factor out of each pair. If the two pairs leave the same binomial, take that binomial out as a common factor.`,
        example: R`\(x^{3} + 3x^{2} + 2x + 6 = x^{2}(x + 3) + 2(x + 3) = (x + 3)(x^{2} + 2)\).`,
      },
      {
        title: 'Factor completely, then check',
        text: R`Keep going until no factor can be factored again: common factor first, then look for a pattern in what is left. Multiply your factors back together to check.`,
        example: R`\(2x^{3} - 18x = 2x(x^{2} - 9) = 2x(x + 3)(x - 3)\).`,
      },
    ],
    vocab: [
      { term: 'factor', def: 'One of the expressions multiplied together to make a product. To factor a polynomial is to write it as a product.' },
      { term: 'greatest common factor (GCF)', def: 'The largest expression that divides every term of a polynomial.' },
      { term: 'prime polynomial', def: 'A polynomial that cannot be factored using integer coefficients.' },
      { term: 'perfect-square trinomial', def: R`A trinomial that is the square of a binomial, such as \(x^{2} + 6x + 9 = (x + 3)^{2}\).` },
    ],
    mistakes: [
      R`Finding two numbers with the right product but the wrong sum. Check both: for \(x^{2} + 7x + 12\), 2 and 6 multiply to 12 but add to 8.`,
      R`Sign slips. Multiply the factors back together, and check the middle term in particular.`,
      R`Factoring \(x^{2} + 9\) as \((x + 3)^{2}\) or \((x + 3)(x - 3)\). A sum of squares does not factor.`,
      'Stopping too early. After taking out a common factor, look at what is left: it may factor again.',
      R`Dropping the common factor from the final answer: \(3x^{2} + 15x + 18\) is \(3(x + 2)(x + 3)\), not \((x + 2)(x + 3)\).`,
    ],
    visual: { type: 'areaModel', rows: ['x', '2'], cols: ['x', '3'], cells: [['x²', '3x'], ['2x', '6']], alt: 'Area model for x² + 5x + 6. The four boxes x², 3x, 2x and 6 form a rectangle with sides x + 2 and x + 3, so x² + 5x + 6 = (x + 2)(x + 3).' },
  },

  examples: [
    {
      title: 'Common factor, then a trinomial',
      problem: R`Factor \(3x^{2} + 15x + 18\) completely.`,
      steps: [
        R`Every coefficient is a multiple of 3. Take it out: \(3(x^{2} + 5x + 6)\).`,
        R`For \(x^{2} + 5x + 6\), find two numbers with product 6 and sum 5: they are 2 and 3.`,
        R`So \(3x^{2} + 15x + 18 = 3(x + 2)(x + 3)\).`,
        R`Check: \((x + 2)(x + 3) = x^{2} + 5x + 6\), and multiplying by 3 gives the original.`,
      ],
      answer: R`\(3(x + 2)(x + 3)\)`,
    },
    {
      title: 'A leading coefficient other than 1',
      problem: R`Factor \(6x^{2} + 7x - 3\).`,
      steps: [
        R`Multiply \(a \cdot c = 6 \cdot (-3) = -18\). Find two numbers with product \(-18\) and sum 7: they are 9 and \(-2\).`,
        R`Split the middle term: \(6x^{2} + 9x - 2x - 3\).`,
        R`Factor each pair: \(3x(2x + 3) - 1(2x + 3)\).`,
        R`Take out the common binomial: \((2x + 3)(3x - 1)\).`,
      ],
      answer: R`\((2x + 3)(3x - 1)\)`,
      visual: { type: 'areaModel', rows: ['3x', '−1'], cols: ['2x', '3'], cells: [['6x²', '9x'], ['−2x', '−3']], alt: 'Area model with boxes 6x², 9x, −2x and −3. The sides are 3x and −1 down, and 2x and 3 across, so 6x² + 7x − 3 = (3x − 1)(2x + 3).' },
    },
    {
      title: 'Factoring completely',
      problem: R`Factor \(2x^{3} - 18x\) completely.`,
      steps: [
        R`The greatest common factor is \(2x\): \(2x(x^{2} - 9)\).`,
        R`\(x^{2} - 9\) is a difference of squares, \(x^{2} - 3^{2}\). It factors as \((x + 3)(x - 3)\).`,
        R`So \(2x^{3} - 18x = 2x(x + 3)(x - 3)\). None of these factors can be factored again.`,
      ],
      answer: R`\(2x(x + 3)(x - 3)\)`,
    },
    {
      title: 'Word problem: the sides of a rectangle',
      word: true,
      problem: R`A rectangular courtyard has an area of \(x^{2} + 9x + 20\) square metres. Find expressions for its length and width. What are they when \(x = 6\)?`,
      steps: [
        R`Area is length times width, so write the area as a product of two factors.`,
        R`Two numbers with product 20 and sum 9 are 4 and 5: \(x^{2} + 9x + 20 = (x + 4)(x + 5)\).`,
        R`The sides are \(x + 4\) and \(x + 5\) metres. When \(x = 6\) they are 10 m and 11 m.`,
        R`Check: \(10 \cdot 11 = 110\), and \(6^{2} + 9(6) + 20 = 36 + 54 + 20 = 110\). ✓`,
      ],
      answer: R`\(x + 5\) by \(x + 4\) metres; 11 m by 10 m when \(x = 6\)`,
    },
  ],

  models: [
    {
      id: 'factor-trinomial',
      title: 'Factor ax² + bx + c',
      intro: 'Choose the three coefficients. The steps use the ac method, and say so when the trinomial is prime.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -12, max: 12, value: 6 },
        { name: 'b', label: 'b (coefficient of x)', type: 'int', min: -40, max: 40, value: 7 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -60, max: 60, value: -3 },
      ],
      compute: trinomialModel,
    },
    {
      id: 'rectangle-sides',
      title: 'Word problem: from an area back to the sides',
      word: true,
      intro: 'Choose the two side lengths. The model builds the area, then factors it back again.',
      inputs: [
        { name: 'p', label: 'First side is x plus', type: 'int', min: 1, max: 12, value: 4 },
        { name: 'q', label: 'Second side is x plus', type: 'int', min: 1, max: 12, value: 5 },
        { name: 'x', label: 'Value of x (metres)', type: 'int', min: 1, max: 20, value: 6 },
      ],
      compute({ p, q: qq, x }) {
        const [b, c] = [p + qq, p * qq];
        const pairs = divisors(c).filter((u) => u * u <= c).map((u) => [u, c / u]);
        const result = factored([1], pairOf(p, qq));
        return {
          problem: R`A rectangular courtyard has an area of \(${poly([1, b, c])}\) square metres. Find expressions for its sides, and their lengths when \(x = ${x}\).`,
          steps: [
            R`Area is length times width, so factor the area. Look for two numbers with product \(${c}\) and sum \(${b}\).`,
            R`Pairs with product \(${c}\): ${pairs.map(([u, v]) => R`\(${u} \cdot ${v}\) (sum \(${u + v}\))`).join(', ')}.`,
            R`The pair with sum \(${b}\) is \(${Math.min(p, qq)}\) and \(${Math.max(p, qq)}\), so \(${poly([1, b, c])} = ${result.tex}\).`,
            R`When \(x = ${x}\), the sides are \(${x} + ${Math.min(p, qq)} = ${x + Math.min(p, qq)}\) and \(${x} + ${Math.max(p, qq)} = ${x + Math.max(p, qq)}\) metres.`,
            R`Check: \(${x + p} \cdot ${x + qq} = ${(x + p) * (x + qq)}\), and the area formula gives \(${x}^{2} + ${b}(${x}) + ${c} = ${x * x + b * x + c}\). ✓`,
          ],
          answer: R`Sides \(${linear(1, Math.min(p, qq))}\) and \(${linear(1, Math.max(p, qq))}\): ${x + Math.min(p, qq)} m by ${x + Math.max(p, qq)} m when \(x = ${x}\)`,
          visual: { type: 'areaModel', rows: ['x', `${Math.min(p, qq)}`], cols: ['x', `${Math.max(p, qq)}`], cells: [['x²', plain(Math.max(p, qq), 'x')], [plain(Math.min(p, qq), 'x'), `${c}`]], alt: `Area model: boxes x², ${plain(Math.max(p, qq), 'x')}, ${plain(Math.min(p, qq), 'x')} and ${c} make a rectangle with sides x + ${Math.min(p, qq)} and x + ${Math.max(p, qq)}.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyGCF, easyTrinomial, easyDifferenceSquares],
    medium: [mediumTrinomialSigns, mediumGCFTrinomial, mediumSpecial, mediumStoryDimensions],
    hard: [hardLeadingCoef, hardGrouping, hardCompletely],
    challenge: [challengeFindK, challengeQuartic, challengePrime],
  },
};
