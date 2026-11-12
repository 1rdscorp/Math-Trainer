import { R, q, linear, terms, term, poly, power, num, txt, polyAdd, polySub, polyMul, polyEval, checkSame, checkEqual } from '../../lib/index.js';

const P = (coefs) => R`\(${poly(coefs)}\)`;
const same = (f, coefs) => () => checkSame(f, (t) => polyEval(coefs, t));
// A term as plain text for area-model pictures: plain(-3, 'x²') → "−3x²".
const plain = (c, sym = '') => (c === 0 ? '0' : `${c < 0 ? '−' : ''}${Math.abs(c) === 1 && sym ? '' : Math.abs(c)}${sym}`);
const area = (a, b, c, d, filled) => ({
  type: 'areaModel', rows: [plain(a, 'x'), plain(b)], cols: [plain(c, 'x'), plain(d)],
  cells: filled ? [[plain(a * c, 'x²'), plain(a * d, 'x')], [plain(b * c, 'x'), plain(b * d)]] : undefined,
  alt: `Area model for (${plain(a, 'x')} ${b < 0 ? '−' : '+'} ${Math.abs(b)}) times (${plain(c, 'x')} ${d < 0 ? '−' : '+'} ${Math.abs(d)}): a 2-by-2 grid with one box for each of the four products${filled ? `, ${plain(a * c, 'x²')}, ${plain(a * d, 'x')}, ${plain(b * c, 'x')} and ${plain(b * d)}` : ''}.`,
});

// ───────────── Easy ─────────────

function easyDegree(rng) {
  const exps = rng.sample([0, 1, 2, 3, 4, 5, 6], rng.int(3, 4)).sort((a, b) => b - a);
  const coefs = exps.map(() => rng.nonzero(-9, 9));
  let order = rng.shuffle(exps.map((e, i) => i));
  if (order[0] === 0) order = [order[1], order[0], ...order.slice(2)]; // the highest power is never written first
  const tex = terms(order.map((i) => [coefs[i], power('x', exps[i])]));
  const standard = terms(exps.map((e, i) => [coefs[i], power('x', e)]));
  const askDegree = rng.bool();
  const firstExp = exps[order[0]];
  const firstCoef = coefs[order[0]];
  return q({
    prompt: askDegree ? R`What is the degree of the polynomial \(\;${tex}\)?` : R`What is the leading coefficient of the polynomial \(\;${tex}\)?`,
    correct: askDegree ? exps[0] : coefs[0],
    wrong: askDegree
      ? [{ value: firstExp, why: 'The degree is the largest exponent, wherever that term happens to be written.' }, { value: exps.length, why: 'That is the number of terms. The degree is the largest exponent.' }, exps[0] + 1, exps.reduce((s, e) => s + e, 0)]
      : [{ value: firstCoef, why: 'The leading coefficient belongs to the term with the largest exponent, not to the term written first.' }, { value: exps[0], why: R`That is the degree. The leading coefficient is the number multiplying \(${power('x', exps[0])}\).` }, -coefs[0], coefs[coefs.length - 1]],
    solution: [
      R`Write the polynomial in standard form, with the exponents going down: \(${standard}\).`,
      R`The first term is now \(${term(coefs[0], power('x', exps[0]))}\). Its exponent, \(${exps[0]}\), is the degree, and its coefficient, \(${coefs[0]}\), is the leading coefficient.`,
    ],
    rule: 0,
    skill: 'degree and standard form',
    check: () => checkEqual(Math.max(...exps), exps[0]),
  });
}

function easyAdd(rng) {
  const p1 = [rng.nonzero(-6, 6), rng.nonzero(-9, 9), rng.nonzero(-9, 9)];
  const p2 = [rng.intExcept(-6, 6, [0, -p1[0]]), rng.intExcept(-9, 9, [0, -p1[1]]), rng.nonzero(-9, 9)];
  const sum = polyAdd(p1, p2);
  return q({
    prompt: R`Add: \(\;(${poly(p1)}) + (${poly(p2)})\)`,
    correct: P(sum),
    wrong: [
      { value: R`\(${terms([[sum[0], 'x^{4}'], [sum[1], 'x^{2}'], [sum[2], '']])}\)`, why: 'Adding like terms adds the coefficients only. The exponents stay the same.' },
      { value: P([sum[0], p1[1] - p2[1], sum[2]]), why: R`Keep each term's own sign: \(${term(p1[1], 'x')}\) and \(${term(p2[1], 'x')}\) combine to \(${term(sum[1], 'x')}\).` },
      P([sum[0], sum[1], p1[2] - p2[2]]),
      P(polySub(p1, p2)),
      P([sum[0], sum[1], sum[2] + 1]),
    ],
    solution: [
      R`Group the like terms: \((${terms([[p1[0], 'x^{2}'], [p2[0], 'x^{2}']])}) + (${terms([[p1[1], 'x'], [p2[1], 'x']])}) + (${terms([[p1[2], ''], [p2[2], '']])})\).`,
      R`Add the coefficients in each group: \(${poly(sum)}\).`,
    ],
    rule: 1,
    skill: 'adding polynomials',
    check: same((t) => polyEval(p1, t) + polyEval(p2, t), sum),
  });
}

function easyMonomialTimes(rng) {
  const k = rng.intExcept(-6, 6, [-1, 0, 1]);
  const j = rng.int(1, 2);
  const b = rng.nonzero(-6, 6);
  const c = rng.nonzero(-9, 9);
  const mono = term(k, power('x', j));
  const out = (c1, e1, c2, e2) => R`\(${terms([[c1, power('x', e1)], [c2, power('x', e2)]])}\)`;
  return q({
    prompt: R`Multiply: \(\;${mono}(${linear(b, c)})\)`,
    correct: out(k * b, j + 1, k * c, j),
    wrong: [
      { value: out(k * b, j + 1, c, 0), why: R`\(${mono}\) multiplies both terms inside the parentheses, the \(${term(b, 'x')}\) and the \(${c}\).` },
      { value: out(k * b, j, k * c, j - 1), why: R`\(${power('x', j)} \cdot x = ${power('x', j + 1)}\): add the exponents when you multiply powers of \(x\).` },
      out(k * b, j + 1, -k * c, j),
      out(k + b, j + 1, k + c, j),
    ],
    solution: [
      R`Distribute \(${mono}\) to each term: \(${mono} \cdot ${b < 0 || b === 1 ? `(${term(b, 'x')})` : term(b, 'x')}\) and \(${mono} \cdot ${c < 0 ? `(${c})` : c}\).`,
      R`Multiply the coefficients and add the exponents: \(${terms([[k * b, power('x', j + 1)], [k * c, power('x', j)]])}\).`,
    ],
    rule: 3,
    skill: 'distributing a monomial',
    check: () => checkSame((t) => k * t ** j * (b * t + c), (t) => k * b * t ** (j + 1) + k * c * t ** j),
  });
}

// ───────────── Medium ─────────────

function mediumSubtract(rng) {
  const p1 = [rng.nonzero(-6, 6), rng.nonzero(-9, 9), rng.nonzero(-9, 9)];
  const p2 = [rng.intExcept(-6, 6, [0, p1[0]]), rng.intExcept(-9, 9, [0, p1[1]]), rng.nonzero(-9, 9)];
  const diff = polySub(p1, p2);
  return q({
    prompt: R`Subtract: \(\;(${poly(p1)}) - (${poly(p2)})\)`,
    correct: P(diff),
    wrong: [
      { value: P([diff[0], p1[1] + p2[1], p1[2] + p2[2]]), why: 'The minus sign applies to every term of the second polynomial, not only the first one.' },
      { value: P(polyAdd(p1, p2)), why: 'This adds the polynomials. To subtract, change the sign of each term in the second one, then combine.' },
      P([diff[0], diff[1], p1[2] + p2[2]]),
      P(polySub(p2, p1)),
    ],
    solution: [
      R`Change the sign of every term in the second polynomial: \(${poly(p1)} ${terms([[0, ''], [-p2[0], 'x^{2}'], [-p2[1], 'x'], [-p2[2], '']]).replace(/^-/, '- ').replace(/^(?![-+] )/, '+ ')}\).`,
      R`Combine like terms: \((${terms([[p1[0], 'x^{2}'], [-p2[0], 'x^{2}']])}) + (${terms([[p1[1], 'x'], [-p2[1], 'x']])}) + (${terms([[p1[2], ''], [-p2[2], '']])})\).`,
      R`Result: \(${poly(diff)}\).`,
    ],
    rule: 2,
    skill: 'subtracting polynomials',
    check: same((t) => polyEval(p1, t) - polyEval(p2, t), diff),
  });
}

function mediumBinomials(rng) {
  const a = rng.pick([1, 1, 2, 3]);
  const c = rng.pick([1, 1, 2, 4, 5]);
  const b = rng.nonzero(-9, 9);
  const d = rng.nonzero(-9, 9);
  if (a * d + b * c === 0) return mediumBinomials(rng);
  const ans = [a * c, a * d + b * c, b * d];
  return q({
    prompt: R`Multiply: \(\;(${linear(a, b)})(${linear(c, d)})\)`,
    visual: area(a, b, c, d, false),
    correct: P(ans),
    wrong: [
      { value: P([a * c, 0, b * d]), why: 'Each term of the first binomial multiplies each term of the second, giving four products. The two middle ones are missing here.' },
      { value: P([a * c, a * d - b * c, b * d]), why: R`The middle products are \(${term(a * d, 'x')}\) and \(${term(b * c, 'x')}\). Keep both signs when you combine them.` },
      P([a * c, a * d + b * c, -b * d]),
      P([a * c, b + d, b * d]),
      P([a * c, a * d + b * c, b + d]),
    ],
    solution: [
      R`Multiply each term by each term (one product for each box of the area model): \(${term(a * c, 'x^{2}')}\), \(${term(a * d, 'x')}\), \(${term(b * c, 'x')}\) and \(${b * d}\).`,
      R`Combine the two \(x\)-terms: \(${terms([[a * d, 'x'], [b * c, 'x']])} = ${term(a * d + b * c, 'x')}\).`,
      R`Result: \(${poly(ans)}\).`,
    ],
    rule: 4,
    skill: 'multiplying binomials',
    check: same((t) => (a * t + b) * (c * t + d), ans),
  });
}

function mediumSquare(rng) {
  const a = rng.nonzero(-9, 9);
  const ans = [1, 2 * a, a * a];
  const inner = linear(1, a);
  return q({
    prompt: R`Expand: \(\;(${inner})^{2}\)`,
    correct: P(ans),
    wrong: [
      { value: P([1, 0, a * a]), why: R`\((${inner})^{2}\) means \((${inner})(${inner})\). The two middle products, \(${term(a, 'x')}\) and \(${term(a, 'x')}\), are missing.` },
      { value: P([1, a, a * a]), why: R`There are two middle products, \(${term(a, 'x')}\) twice, so the middle term is \(${term(2 * a, 'x')}\).` },
      P([1, 2 * a, -a * a]),
      P([1, -2 * a, a * a]),
      P([1, 2 * a, 2 * Math.abs(a)]),
    ],
    solution: [
      R`Write it as a product: \((${inner})(${inner})\).`,
      R`Four products: \(x^{2}\), \(${term(a, 'x')}\), \(${term(a, 'x')}\) and \(${a * a}\).`,
      R`Combine the middle terms: \(${poly(ans)}\). This is the pattern \((a + b)^{2} = a^{2} + 2ab + b^{2}\).`,
    ],
    rule: 6,
    skill: 'special products',
    check: same((t) => (t + a) ** 2, ans),
  });
}

function mediumStoryPerimeter(rng) {
  const place = rng.pick(['garden', 'sports field', 'patio', 'car park', 'poster']);
  const [a, c] = [rng.int(1, 5), rng.int(1, 5)];
  const b = rng.nonzero(-6, 9);
  const d = rng.intExcept(-6, 9, [0, b]);
  const ans = [2 * (a + c), 2 * (b + d)];
  const form = (m, k) => R`\(${linear(m, k)}\)`;
  return q({
    prompt: R`A rectangular ${place} has length \(${linear(a, b)}\) metres and width \(${linear(c, d)}\) metres. Which expression gives its perimeter in metres?`,
    correct: form(...ans),
    wrong: [
      { value: form(a + c, b + d), why: 'That adds one length and one width. A rectangle has two of each.' },
      { value: P([a * c, a * d + b * c, b * d]), why: 'That is length times width, which gives the area. The perimeter is the distance around.' },
      form(2 * (a + c), b + d),
      form(2 * a + c, 2 * b + d),
    ],
    solution: [
      R`The perimeter is two lengths plus two widths: \(2(${linear(a, b)}) + 2(${linear(c, d)})\).`,
      R`Distribute: \(${linear(2 * a, 2 * b)} + ${linear(2 * c, 2 * d).replace(/^-/, '(-').replace(/^\((.*)$/, '($1)')}\).`,
      R`Combine like terms: \(${linear(...ans)}\).`,
    ],
    rule: 1,
    skill: 'polynomial word problems',
    check: same((t) => 2 * (a * t + b) + 2 * (c * t + d), ans),
  });
}

// ───────────── Hard ─────────────

function hardBinomialTrinomial(rng) {
  const a = rng.pick([1, 1, 2, 3]);
  const b = rng.nonzero(-6, 6);
  const c = rng.nonzero(-6, 6);
  const d = rng.nonzero(-9, 9);
  const tri = [1, c, d];
  const ans = polyMul([a, b], tri);
  return q({
    prompt: R`Multiply: \(\;(${linear(a, b)})(${poly(tri)})\)`,
    correct: P(ans),
    wrong: [
      { value: P([a, a * c, a * d, b * d]), why: R`The \(${b}\) must multiply all three terms of the trinomial, giving \(${poly([b, b * c, b * d])}\).` },
      { value: P(polyMul([a, -b], tri)), why: R`Carry the sign of \(${b}\) through each of its three products.` },
      P([a, a * c + b, a * d + b * c, d]),
      P([a, a * c + b, a * d - b * c, b * d]),
    ],
    solution: [
      R`Multiply the trinomial by \(${term(a, 'x')}\): \(${poly([a, a * c, a * d, 0])}\).`,
      R`Multiply the trinomial by \(${b}\): \(${poly([b, b * c, b * d])}\).`,
      R`Add the two results, combining like terms: \(${poly(ans)}\).`,
    ],
    rule: 5,
    skill: 'multiplying polynomials',
    check: same((t) => (a * t + b) * polyEval(tri, t), ans),
  });
}

function hardSpecial(rng) {
  const a = rng.int(2, 6);
  const b = rng.int(1, 9);
  const kind = rng.pick(['conjugates', 'minus', 'plus']);
  const ax = term(a, 'x');
  if (kind === 'conjugates') {
    return q({
      prompt: R`Multiply: \(\;(${linear(a, b)})(${linear(a, -b)})\)`,
      correct: P([a * a, 0, -b * b]),
      wrong: [
        { value: P([a * a, 0, b * b]), why: R`The last product is \(${b} \cdot (-${b}) = -${b * b}\).` },
        { value: P([a * a, -2 * a * b, b * b]), why: R`The middle products are \(-${a * b}x\) and \(+${a * b}x\). They cancel, so there is no \(x\)-term.` },
        { value: P([a, 0, -b * b]), why: R`\((${ax})(${ax}) = ${a * a}x^{2}\): square the coefficient as well.` },
        P([a * a, 0, -b]),
      ],
      solution: [R`This is the pattern \((a + b)(a - b) = a^{2} - b^{2}\), with \(a = ${ax}\) and \(b = ${b}\).`, R`The middle products \(-${a * b}x\) and \(+${a * b}x\) cancel.`, R`Result: \((${ax})^{2} - ${b}^{2} = ${poly([a * a, 0, -b * b])}\).`],
      rule: 6,
      skill: 'special products',
      check: same((t) => (a * t + b) * (a * t - b), [a * a, 0, -b * b]),
    });
  }
  const s = kind === 'plus' ? 1 : -1;
  const ans = [a * a, 2 * a * b * s, b * b];
  return q({
    prompt: R`Expand: \(\;(${linear(a, s * b)})^{2}\)`,
    correct: P(ans),
    wrong: [
      { value: P([a * a, 0, s * b * b]), why: R`A binomial squared has a middle term: \(2 \cdot ${ax} \cdot ${s < 0 ? `(-${b})` : b} = ${term(2 * a * b * s, 'x')}\).` },
      { value: P([a * a, a * b * s, b * b]), why: R`The middle product \(${term(a * b * s, 'x')}\) appears twice.` },
      { value: P([a, 2 * a * b * s, b * b]), why: R`\((${ax})^{2} = ${a * a}x^{2}\): square the coefficient as well.` },
      P([a * a, -2 * a * b * s, b * b]),
    ],
    solution: [
      R`Use \((a ${s > 0 ? '+' : '-'} b)^{2} = a^{2} ${s > 0 ? '+' : '-'} 2ab + b^{2}\) with \(a = ${ax}\) and \(b = ${b}\).`,
      R`\(a^{2} = ${a * a}x^{2}\), \(2ab = ${2 * a * b}x\) and \(b^{2} = ${b * b}\).`,
      R`Result: \(${poly(ans)}\).`,
    ],
    rule: 6,
    skill: 'special products',
    check: same((t) => (a * t + s * b) ** 2, ans),
  });
}

const BORDERS = [
  { inner: 'A photo', outer: 'a frame', what: 'the frame alone' },
  { inner: 'A swimming pool', outer: 'a deck', what: 'the deck alone' },
  { inner: 'A flower bed', outer: 'a gravel path', what: 'the path alone' },
  { inner: 'A painting', outer: 'a mat border', what: 'the border alone' },
];

function hardStoryArea(rng) {
  const c = rng.pick(BORDERS);
  const w = rng.int(4, 20);
  const h = rng.intExcept(4, 30, [w]);
  const ans = [4, 2 * (w + h), 0];
  return q({
    prompt: R`${c.inner} measures ${w} units by ${h} units. It is surrounded by ${c.outer} that is \(x\) units wide on every side. Which expression gives the area of ${c.what}?`,
    correct: P(ans),
    wrong: [
      { value: P([4, 2 * (w + h), w * h]), why: `That is the whole area, including the ${w} by ${h} rectangle in the middle. Subtract ${w * h}.` },
      { value: P([1, w + h, 0]), why: R`The border adds \(x\) on both sides, so each outside dimension grows by \(2x\), not \(x\).` },
      P([2, w + h, 0]),
      P([4, 2 * (w + h), -w * h]),
    ],
    solution: [
      R`The border adds \(x\) on both sides, so the outside rectangle measures \(${linear(2, w)}\) by \(${linear(2, h)}\).`,
      R`Outside area: \((${linear(2, w)})(${linear(2, h)}) = ${poly([4, 2 * (w + h), w * h])}\).`,
      R`Subtract the inside area, \(${w} \cdot ${h} = ${w * h}\): \(${poly(ans)}\).`,
    ],
    rule: 4,
    skill: 'polynomial word problems',
    check: same((t) => (2 * t + w) * (2 * t + h) - w * h, ans),
  });
}

// ───────────── Challenge ─────────────

function challengeMissing(rng) {
  const a = rng.int(1, 3);
  const b = rng.nonzero(-6, 6);
  const k = rng.intExcept(-9, 9, [0, b, -b]);
  const [B, C] = [a * k + b, b * k];
  if (B === 0) return challengeMissing(rng);
  return q({
    prompt: R`For what value of \(k\) is \(\;(${linear(a, b)})(x + k) = ${poly([a, B, C])}\;\) true for every \(x\)?`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: C - b, why: R`The constant term is the product \(${b} \cdot k\), not a sum. So \(${term(b, 'k')} = ${C}\).` },
      { value: -k, why: R`Check the constant term: \(${b} \cdot k\) must equal \(${C}\).` },
      B,
      B - b,
      k + 1,
    ],
    solution: [
      R`Expand the left side: \(${terms([[a, 'x^{2}'], [a, 'kx'], [b, 'x'], [b, 'k']])}\).`,
      R`Match the constant terms: \(${term(b, 'k')} = ${C}\), so \(k = ${k}\).`,
      R`Check the \(x\)-terms: \(${a}(${k}) ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${B}\). ✓`,
    ],
    rule: 4,
    skill: 'multiplying binomials',
    check: same((t) => (a * t + b) * (t + k), [a, B, C]),
  });
}

function challengeCombo(rng) {
  const a = rng.nonzero(-6, 6);
  const b = rng.nonzero(-6, 6);
  const c = rng.intExcept(-6, 6, [0, -b]);
  const [m, k] = [2 * a - b - c, a * a - b * c];
  if (m === 0 || k === 0 || b + c === 0) return challengeCombo(rng);
  const form = (coefs) => P(coefs.length === 2 ? coefs : coefs);
  return q({
    prompt: R`Simplify: \(\;(${linear(1, a)})^{2} - (${linear(1, b)})(${linear(1, c)})\)`,
    correct: form([m, k]),
    wrong: [
      { value: form([2 * a + b + c, a * a + b * c]), why: R`The minus sign applies to all three terms of the second product, \(${poly([1, b + c, b * c])}\). Here only \(x^{2}\) was subtracted.` },
      { value: form([-(b + c), k]), why: R`\((${linear(1, a)})^{2}\) is \(${poly([1, 2 * a, a * a])}\). The middle term \(${term(2 * a, 'x')}\) is missing.` },
      form([m, a * a + b * c]),
      form([2, 2 * a + b + c, a * a + b * c]),
      form([2 * a + b + c, k]),
    ],
    solution: [
      R`Expand each part: \((${linear(1, a)})^{2} = ${poly([1, 2 * a, a * a])}\) and \((${linear(1, b)})(${linear(1, c)}) = ${poly([1, b + c, b * c])}\).`,
      R`Subtract by changing every sign in the second part: \(${poly([1, 2 * a, a * a])} ${terms([[0, ''], [-1, 'x^{2}'], [-(b + c), 'x'], [-b * c, '']]).replace(/^-/, '- ')}\).`,
      R`The \(x^{2}\)-terms cancel. Combine the rest: \(${linear(m, k)}\).`,
    ],
    rule: 2,
    skill: 'combining operations',
    check: same((t) => (t + a) ** 2 - (t + b) * (t + c), [m, k]),
  });
}

function challengeCoefficient(rng) {
  const p1 = [rng.nonzero(-4, 4), rng.nonzero(-5, 5), rng.nonzero(-6, 6)];
  const p2 = [rng.nonzero(-4, 4), rng.nonzero(-5, 5), rng.nonzero(-6, 6)];
  const [a, b, c] = p1;
  const [d, e, f] = p2;
  const product = polyMul(p1, p2);
  const ans = a * f + b * e + c * d;
  return q({
    prompt: R`What is the coefficient of \(x^{2}\) in the product \(\;(${poly(p1)})(${poly(p2)})\)?`,
    correct: ans,
    wrong: [
      { value: b * e, why: R`\(x \cdot x\) is one way to make \(x^{2}\). The products \(x^{2} \cdot \text{constant}\) and \(\text{constant} \cdot x^{2}\) make it too.` },
      { value: a * f + c * d, why: R`The product of the two \(x\)-terms, \(${term(b, 'x')} \cdot ${e < 0 ? `(${term(e, 'x')})` : term(e, 'x')}\), is also an \(x^{2}\)-term.` },
      { value: a * d, why: R`That is the coefficient of \(x^{4}\), from \(x^{2} \cdot x^{2}\).` },
      a + d,
      ans + 1,
    ],
    solution: [
      R`Only three of the nine products give \(x^{2}\): \(x^{2}\) times a constant, \(x\) times \(x\), and a constant times \(x^{2}\).`,
      R`Their coefficients: \(${a} \cdot ${f < 0 ? `(${f})` : f} = ${a * f}\), \(${b} \cdot ${e < 0 ? `(${e})` : e} = ${b * e}\) and \(${c} \cdot ${d < 0 ? `(${d})` : d} = ${c * d}\).`,
      R`Add them: \(${terms([[a * f, ''], [b * e, ''], [c * d, '']])} = ${ans}\). (The full product is \(${poly(product)}\).)`,
    ],
    rule: 5,
    skill: 'multiplying polynomials',
    check: () => checkEqual(product[2], ans),
  });
}

// ───────────── Interactive models ─────────────

function binomialModel({ a, b, c, d }) {
  if (a === 0 || c === 0) return { error: 'Each factor needs an x-term. Choose values other than 0 for the two x-coefficients.' };
  const ans = [a * c, a * d + b * c, b * d];
  const steps = [
    R`Multiply each term of \(${linear(a, b)}\) by each term of \(${linear(c, d)}\). The area model has one box for each product.`,
    R`Top row: \(${term(a, 'x')} \cdot ${c < 0 || c === 1 ? `(${term(c, 'x')})` : term(c, 'x')} = ${term(a * c, 'x^{2}')}\) and \(${term(a, 'x')} \cdot ${d < 0 ? `(${d})` : d} = ${term(a * d, 'x')}\).`,
  ];
  if (b !== 0) steps.push(R`Bottom row: \(${b} \cdot ${c < 0 || c === 1 ? `(${term(c, 'x')})` : term(c, 'x')} = ${term(b * c, 'x')}\) and \(${b} \cdot ${d < 0 ? `(${d})` : d} = ${b * d}\).`);
  steps.push(a * d === 0 || b * c === 0 ? 'Only one of the products is an x-term, so there is nothing to combine.' : R`Combine the like terms: \(${terms([[a * d, 'x'], [b * c, 'x']])} = ${term(a * d + b * c, 'x')}\).`);
  if (b !== 0 && d !== 0 && a * d + b * c === 0) steps.push('The two middle products cancel, which is why the difference-of-squares pattern has no middle term.');
  return { problem: R`Multiply \((${linear(a, b)})(${linear(c, d)})\).`, steps, answer: P(ans), visual: area(a, b, c, d, true) };
}

export default {
  id: 'polynomials',
  title: 'Adding, Subtracting & Multiplying Polynomials',
  summary: 'Name polynomials by degree, add and subtract them, and multiply them using distribution and special-product patterns.',
  standards: ['CCSS A-APR.A.1', 'CCSS A-SSE.A.1'],

  explain: {
    intro: R`A polynomial is a sum of terms such as \(3x^{2} - 5x + 2\), where each term is a number times a whole-number power of the variable. Polynomials behave like whole numbers: add, subtract or multiply two of them and you get another polynomial. Everything comes down to two skills, combining like terms and distributing.`,
    rules: [
      {
        title: 'Terms, degree and standard form',
        text: R`Standard form lists the terms from the highest power to the lowest. The degree is the highest exponent, and the leading coefficient is the number in front of that highest power. One term is a monomial, two a binomial, three a trinomial.`,
        example: R`\(4x - 7x^{3} + 2\) in standard form is \(-7x^{3} + 4x + 2\): degree 3, leading coefficient \(-7\).`,
      },
      {
        title: 'Adding: combine like terms',
        text: R`Like terms have the same variable raised to the same power. Add their coefficients and keep the power unchanged.`,
        example: R`\((3x^{2} + 2x - 5) + (x^{2} - 6x + 1) = 4x^{2} - 4x - 4\).`,
      },
      {
        title: 'Subtracting: change every sign',
        text: R`Subtracting a polynomial means subtracting each of its terms. Change the sign of every term in the second polynomial, then combine like terms.`,
        example: R`\((3x^{2} - 2x + 5) - (x^{2} + 4x - 7) = 3x^{2} - 2x + 5 - x^{2} - 4x + 7 = 2x^{2} - 6x + 12\).`,
      },
      {
        title: 'Monomial times polynomial',
        text: R`Distribute: multiply the monomial by every term. Multiply the coefficients and add the exponents.`,
        example: R`\(3x(2x - 5) = 6x^{2} - 15x\).`,
      },
      {
        title: 'Binomial times binomial',
        text: R`Each term of the first binomial multiplies each term of the second, giving four products (the four boxes of an area model). Then combine the like terms.`,
        example: R`\((x + 3)(x + 2) = x^{2} + 2x + 3x + 6 = x^{2} + 5x + 6\).`,
      },
      {
        title: 'Bigger products',
        text: R`The same idea works for any size: multiply every term of one polynomial by every term of the other, then combine like terms. A binomial times a trinomial gives six products.`,
        example: R`\((x + 2)(x^{2} - 3x + 4) = x^{3} - 3x^{2} + 4x + 2x^{2} - 6x + 8 = x^{3} - x^{2} - 2x + 8\).`,
      },
      {
        title: 'Special products',
        text: R`Three patterns are worth knowing: \((a + b)^{2} = a^{2} + 2ab + b^{2}\), \((a - b)^{2} = a^{2} - 2ab + b^{2}\) and \((a + b)(a - b) = a^{2} - b^{2}\).`,
        example: R`\((3x - 4)^{2} = 9x^{2} - 24x + 16\) and \((2x + 5)(2x - 5) = 4x^{2} - 25\).`,
      },
    ],
    vocab: [
      { term: 'term', def: R`A number, a variable, or a product of them, such as \(-5x^{2}\). Terms are separated by plus and minus signs.` },
      { term: 'like terms', def: R`Terms with the same variable and the same exponent, such as \(3x^{2}\) and \(-x^{2}\).` },
      { term: 'degree', def: 'The largest exponent in a polynomial.' },
      { term: 'standard form', def: 'A polynomial written with its exponents in decreasing order.' },
      { term: 'binomial, trinomial', def: 'A polynomial with two terms; a polynomial with three terms.' },
    ],
    mistakes: [
      R`Squaring a binomial term by term: \((x + 5)^{2}\) is \(x^{2} + 10x + 25\), not \(x^{2} + 25\).`,
      R`Subtracting only the first term: in \(-(x^{2} + 4x - 7)\) all three signs change.`,
      R`Adding exponents when adding terms: \(3x^{2} + 2x^{2} = 5x^{2}\), not \(5x^{4}\).`,
      R`Leaving out products: two binomials always give four products before you combine.`,
    ],
    visual: area(1, 3, 1, 2, true),
  },

  examples: [
    {
      title: 'Subtracting polynomials',
      problem: R`Simplify \((3x^{2} - 2x + 5) - (x^{2} + 4x - 7)\).`,
      steps: [
        R`Change the sign of every term in the second polynomial: \(3x^{2} - 2x + 5 - x^{2} - 4x + 7\).`,
        R`Group like terms: \((3x^{2} - x^{2}) + (-2x - 4x) + (5 + 7)\).`,
        R`Combine: \(2x^{2} - 6x + 12\).`,
      ],
      answer: R`\(2x^{2} - 6x + 12\)`,
    },
    {
      title: 'Two binomials',
      problem: R`Multiply \((2x + 3)(x - 5)\).`,
      steps: [
        R`Four products, one for each box: \(2x \cdot x = 2x^{2}\), \(2x \cdot (-5) = -10x\), \(3 \cdot x = 3x\) and \(3 \cdot (-5) = -15\).`,
        R`Combine the like terms: \(-10x + 3x = -7x\).`,
        R`Result: \(2x^{2} - 7x - 15\).`,
      ],
      answer: R`\(2x^{2} - 7x - 15\)`,
      visual: area(2, 3, 1, -5, true),
    },
    {
      title: 'A binomial times a trinomial',
      problem: R`Multiply \((x + 2)(x^{2} - 3x + 4)\).`,
      steps: [
        R`Multiply the trinomial by \(x\): \(x^{3} - 3x^{2} + 4x\).`,
        R`Multiply the trinomial by 2: \(2x^{2} - 6x + 8\).`,
        R`Add the two rows, combining like terms: \(x^{3} + (-3x^{2} + 2x^{2}) + (4x - 6x) + 8\).`,
        R`Result: \(x^{3} - x^{2} - 2x + 8\).`,
      ],
      answer: R`\(x^{3} - x^{2} - 2x + 8\)`,
    },
    {
      title: 'Word problem: a photo frame',
      word: true,
      problem: R`A photo is 8 inches by 10 inches. A frame \(x\) inches wide goes all the way around it. Write a polynomial for the area of the frame alone.`,
      steps: [
        R`The frame adds \(x\) on both sides, so the outside rectangle is \(2x + 8\) by \(2x + 10\).`,
        R`Outside area: \((2x + 8)(2x + 10) = 4x^{2} + 20x + 16x + 80 = 4x^{2} + 36x + 80\).`,
        R`The photo itself covers \(8 \cdot 10 = 80\) square inches. Subtract it: \(4x^{2} + 36x\).`,
        R`Check with \(x = 1\): the outside is \(10 \cdot 12 = 120\), and \(120 - 80 = 40 = 4 + 36\). ✓`,
      ],
      answer: R`\(4x^{2} + 36x\) square inches`,
    },
  ],

  models: [
    {
      id: 'multiply-binomials',
      title: 'Multiply (ax + b)(cx + d) with an area model',
      intro: 'Choose the four numbers. Each box of the area model holds one product.',
      inputs: [
        { name: 'a', label: 'a (first x-coefficient)', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'b', label: 'b (first constant)', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'c', label: 'c (second x-coefficient)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'd', label: 'd (second constant)', type: 'int', min: -9, max: 9, value: -5 },
      ],
      compute: binomialModel,
    },
    {
      id: 'frame-area',
      title: 'Word problem: the area of a border',
      word: true,
      intro: 'Change the size of the photo and the width of the frame.',
      inputs: [
        { name: 'w', label: 'Photo width (inches)', type: 'int', min: 2, max: 40, value: 8 },
        { name: 'h', label: 'Photo height (inches)', type: 'int', min: 2, max: 40, value: 10 },
        { name: 'x', label: 'Frame width x (inches)', type: 'int', min: 1, max: 9, value: 2 },
      ],
      compute({ w, h, x }) {
        const outer = [4, 2 * (w + h), w * h];
        const frame = [4, 2 * (w + h), 0];
        const total = (2 * x + w) * (2 * x + h);
        return {
          problem: R`A photo is ${w} inches by ${h} inches. A frame \(x\) inches wide goes all the way around it. Write a polynomial for the area of the frame alone, then find that area when \(x = ${x}\).`,
          steps: [
            R`The frame adds \(x\) on both sides, so the outside rectangle is \(${linear(2, w)}\) by \(${linear(2, h)}\).`,
            R`Outside area: \((${linear(2, w)})(${linear(2, h)}) = ${terms([[4, 'x^{2}'], [2 * h, 'x'], [2 * w, 'x'], [w * h, '']])} = ${poly(outer)}\).`,
            R`Subtract the photo, \(${w} \cdot ${h} = ${w * h}\): the frame has area \(${poly(frame)}\).`,
            R`When \(x = ${x}\): \(4(${x})^{2} + ${2 * (w + h)}(${x}) = ${4 * x * x} + ${2 * (w + h) * x} = ${polyEval(frame, x)}\).`,
            R`Check directly: the outside is \(${2 * x + w} \cdot ${2 * x + h} = ${total}\), and \(${total} - ${w * h} = ${total - w * h}\). ✓`,
          ],
          answer: R`\(${poly(frame)}\); when \(x = ${x}\) the frame covers ${txt(polyEval(frame, x))} square inches`,
          visual: {
            type: 'polygon', points: [[0, 0], [w + 2 * x, 0], [w + 2 * x, h + 2 * x], [0, h + 2 * x]],
            sides: [`${w} + 2x`, `${h} + 2x`, '', ''],
            extra: [{ from: [x, x], to: [x + w, x], label: `${w}` }, { from: [x + w, x], to: [x + w, x + h], label: `${h}` }, { from: [x + w, x + h], to: [x, x + h] }, { from: [x, x + h], to: [x, x] }],
            alt: `A ${w} by ${h} photo inside a larger rectangle that is ${w} + 2x wide and ${h} + 2x high. The space between them is the frame.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyDegree, easyAdd, easyMonomialTimes],
    medium: [mediumSubtract, mediumBinomials, mediumSquare, mediumStoryPerimeter],
    hard: [hardBinomialTrinomial, hardSpecial, hardStoryArea],
    challenge: [challengeMissing, challengeCombo, challengeCoefficient],
  },
};
