import { R, q, frac, terms, poly, polyEval, linear, factor, num, txt, paren, money, plural, round, range, checkLimit, checkEqual, checkAll } from '../../lib/index.js';
import { M, lim, cases, subst, dfrac, fit, rowTable } from './_shared.js';

const DNE = 'does not exist';
const INF = M('\\infty');
const NINF = M('-\\infty');
const side = (a, s) => `${num(a)}^{${s < 0 ? '-' : '+'}}`;

// ───────────── Easy ─────────────

function easyDirectSub(rng) {
  const coefs = [rng.nonzero(-3, 3), rng.int(-5, 5), rng.int(-9, 9)];
  const [c2, c1, c0] = coefs;
  const a = rng.nonzero(-3, 4);
  const L = polyEval(coefs, a);
  return q({
    prompt: R`Evaluate \(${lim(a)} \left(${poly(coefs)}\right)\).`,
    correct: L,
    wrong: [
      a < 0 ? { value: -c2 * a * a + c1 * a + c0, why: R`\(${paren(a)}^{2} = ${a * a}\), which is positive.` } : { value: polyEval(coefs, -a), why: 'Check the sign of the number you substituted.' },
      { value: DNE, why: 'A polynomial has no breaks or gaps, so its limit at any point is simply its value there.' },
      c2 * a + c1 * a + c0,
      L - c0,
      polyEval(coefs, a + 1),
    ],
    solution: [
      'A polynomial is continuous everywhere, so its limit is found by direct substitution.',
      R`Substitute \(x = ${a}\): \(${subst(coefs, a)} = ${L}\).`,
      R`The limit is \(${L}\).`,
    ],
    rule: 2,
    skill: 'direct substitution',
    check: () => checkLimit((x) => polyEval(coefs, x), a, L),
  });
}

function easyFromTable(rng) {
  const a = rng.int(-3, 5);
  const L1 = rng.int(-6, 9);
  const jump = rng.bool(0.3);
  const L2 = jump ? L1 + rng.pick([-4, -3, -2, 2, 3, 4]) : L1;
  const m1 = rng.pick([-3, -2, -1, 1, 2, 3]);
  const m2 = rng.pick([-3, -2, -1, 1, 2, 3]);
  const f = (d) => (d < 0 ? L1 + m1 * d : L2 + m2 * d);
  const cols = [-0.1, -0.01, -0.001, 0.001, 0.01, 0.1].map((d) => [round(a + d, 3), round(f(d), 3)]);
  const lastRight = round(f(0.001), 3);
  return q({
    prompt: R`The table shows values of a function \(f\) for inputs near \(x = ${a}\). Based on the table, what is the best estimate of \(${lim(a)} f(x)\)?`,
    visual: rowTable(['x', 'f(x)'], cols, `Table of values of f near x = ${txt(a)}: ${cols.map(([x, y]) => `f(${txt(x)}) = ${txt(y)}`).join(', ')}.`),
    correct: jump ? DNE : L1,
    wrong: jump
      ? [
          { value: L1, why: R`The outputs approach \(${L1}\) only for inputs to the left of \(${a}\). From the right they approach \(${L2}\).` },
          { value: L2, why: R`The outputs approach \(${L2}\) only for inputs to the right of \(${a}\). From the left they approach \(${L1}\).` },
          { value: (L1 + L2) / 2, why: 'A limit is not an average of the two sides. If the sides disagree, there is no limit.' },
          0,
          a,
        ]
      : [
          { value: lastRight, why: R`The outputs keep moving toward \(${L1}\) as \(x\) moves toward \(${a}\). The limit is the value being approached, not a table entry.` },
          { value: DNE, why: R`From both sides the outputs approach the same number, so the limit exists.` },
          a !== L1 ? { value: a, why: R`\(${a}\) is the input being approached. The limit is the value that the outputs \(f(x)\) approach.` } : null,
          round(f(-0.001), 3),
          L1 + 1,
        ],
    solution: jump
      ? [
          R`From the left (\(x < ${a}\)) the outputs \(${cols.slice(0, 3).map((c) => num(c[1])).join(',\\ ')}\) approach \(${L1}\).`,
          R`From the right (\(x > ${a}\)) the outputs \(${cols.slice(3).reverse().map((c) => num(c[1])).join(',\\ ')}\) approach \(${L2}\).`,
          R`The two sides approach different numbers, so \(${lim(a)} f(x)\) does not exist.`,
        ]
      : [
          R`From the left (\(x < ${a}\)) the outputs \(${cols.slice(0, 3).map((c) => num(c[1])).join(',\\ ')}\) approach \(${L1}\).`,
          R`From the right (\(x > ${a}\)) the outputs \(${cols.slice(3).reverse().map((c) => num(c[1])).join(',\\ ')}\) also approach \(${L1}\).`,
          R`Both sides agree, so \(${lim(a)} f(x) = ${L1}\).`,
        ],
    rule: jump ? 1 : 0,
    skill: 'limits from tables',
  });
}

function easyFromGraph(rng) {
  const a = rng.int(-2, 2);
  const L1 = rng.int(1, 5);
  const jump = rng.bool(0.6);
  const L2 = jump ? rng.intExcept(1, 5, [L1]) : L1;
  const v = rng.intExcept(0, 6, [L1, L2]);
  const m1 = rng.pick([-1, -0.5, 0.5, 1]);
  const m2 = rng.pick([-1, -0.5, 0.5, 1]);
  const ask = jump ? rng.pick(['left', 'right', 'both', 'value']) : rng.pick(['both', 'both', 'value']);
  const visual = {
    type: 'plot',
    x: [a - 4, a + 4],
    y: [-3.5, 9.5],
    step: [1, 1],
    fns: [
      { f: (x) => L1 + m1 * (x - a), domain: [a - 4, a], color: 'a' },
      { f: (x) => L2 + m2 * (x - a), domain: [a, a + 4], color: 'a' },
    ],
    points: [{ x: a, y: L1, open: true }, ...(jump ? [{ x: a, y: L2, open: true }] : []), { x: a, y: v }],
    alt: `Graph of f. To the left of x = ${txt(a)} the graph is a line that ends at an open circle at height ${L1}. To the right of x = ${txt(a)} it is a line that starts at an open circle at height ${L2}. A single filled dot sits at (${txt(a)}, ${v}).`,
  };
  const target = { left: lim(side(a, -1)), right: lim(side(a, 1)), both: lim(a) }[ask];
  const spec = {
    left: {
      correct: L1,
      wrong: [{ value: L2, why: R`That is the height approached from the right. \(x \to ${side(a, -1)}\) means \(x < ${a}\).` }, { value: v, why: R`That is \(f(${a})\), the filled dot. A limit ignores the value at the point itself.` }, { value: DNE, why: 'A one-sided limit can exist even where the graph jumps.' }],
      solution: [R`\(x \to ${side(a, -1)}\) means: approach \(${a}\) through inputs smaller than \(${a}\), so follow the left branch.`, R`The left branch heads to the open circle at height \(${L1}\).`, R`\(${target} f(x) = ${L1}\).`],
    },
    right: {
      correct: L2,
      wrong: [{ value: L1, why: R`That is the height approached from the left. \(x \to ${side(a, 1)}\) means \(x > ${a}\).` }, { value: v, why: R`That is \(f(${a})\), the filled dot. A limit ignores the value at the point itself.` }, { value: DNE, why: 'A one-sided limit can exist even where the graph jumps.' }],
      solution: [R`\(x \to ${side(a, 1)}\) means: approach \(${a}\) through inputs larger than \(${a}\), so follow the right branch.`, R`The right branch heads to the open circle at height \(${L2}\).`, R`\(${target} f(x) = ${L2}\).`],
    },
    both: jump
      ? {
          correct: DNE,
          wrong: [{ value: L1, why: 'That is only the left-hand limit. The right-hand limit is different.' }, { value: L2, why: 'That is only the right-hand limit. The left-hand limit is different.' }, { value: v, why: R`That is \(f(${a})\). The limit depends on the heights the graph approaches, not on the filled dot.` }],
          solution: [R`From the left the graph approaches height \(${L1}\).`, R`From the right it approaches height \(${L2}\).`, R`The one-sided limits are different, so \(${target} f(x)\) does not exist.`],
        }
      : {
          correct: L1,
          wrong: [{ value: v, why: R`That is \(f(${a})\), the filled dot. The limit is the height the graph approaches, which can differ from the value.` }, { value: DNE, why: 'Both branches head to the same open circle, so the limit exists. The filled dot being elsewhere does not matter.' }, L1 + 1, L1 - 1],
          solution: [R`From the left and from the right the graph heads to the same open circle, at height \(${L1}\).`, R`The filled dot at height \(${v}\) is the value \(f(${a})\). It does not affect the limit.`, R`\(${target} f(x) = ${L1}\).`],
        },
    value: {
      correct: v,
      wrong: [{ value: L1, why: R`That is the height the graph approaches${jump ? ' from the left' : ''}. The value \(f(${a})\) is the filled dot.` }, jump ? { value: L2, why: R`That is the height the graph approaches from the right. The value \(f(${a})\) is the filled dot.` } : null, { value: 'is not defined', why: R`The filled dot shows that \(f(${a})\) is defined.` }, v + 1, v + 2],
      solution: [R`\(f(${a})\) is the actual height of the graph at \(x = ${a}\): the filled dot.`, R`The open circles show heights the graph approaches but does not take.`, R`\(f(${a}) = ${v}\).`],
    },
  }[ask];
  return q({
    prompt: ask === 'value' ? R`The graph of \(f\) is shown. An open circle marks a point that is not on the graph. What is \(f(${a})\)?` : R`The graph of \(f\) is shown. An open circle marks a point that is not on the graph. Find \(${target} f(x)\).`,
    visual,
    ...spec,
    rule: ask === 'both' || ask === 'value' ? 0 : 1,
    skill: 'limits from graphs',
  });
}

function easyLimitLaws(rng) {
  const a = rng.int(-4, 6);
  const L = rng.nonzero(-6, 8);
  const K = rng.nonzero(-5, 7);
  const c = rng.int(2, 5);
  const d = rng.int(2, 4);
  const t = rng.pick([
    { tex: R`\left[${c}f(x) - ${d}g(x)\right]`, val: c * L - d * K, fn: (f, g) => c * f - d * g, wrong: [{ value: c * L + d * K, why: 'The two parts are subtracted, not added.' }, L - K, c * L - K, c * d * (L - K)], work: R`${c}(${L}) - ${d}(${K})`, law: 'constant multiples and differences' },
    { tex: R`\left[f(x)\,g(x)\right]`, val: L * K, fn: (f, g) => f * g, wrong: [{ value: L + K, why: 'For a product, multiply the two limits.' }, L - K, -L * K, L * K + 1], work: R`${paren(L)} \cdot ${paren(K)}`, law: 'products' },
    { tex: R`\dfrac{f(x)}{g(x)}`, val: frac(L, K), fn: (f, g) => f / g, wrong: [{ value: frac(K, L), why: R`\(f\) is on top, so its limit is the numerator.` }, L - K, L * K, frac(-L, K)], work: R`\dfrac{${L}}{${K}}`, law: 'quotients (the denominator limit is not 0)' },
    { tex: R`\left(\left[f(x)\right]^{2} + g(x)\right)`, val: L * L + K, fn: (f, g) => f * f + g, wrong: [{ value: 2 * L + K, why: R`\([f(x)]^{2}\) means the limit is squared, not doubled.` }, L + K, -L * L + K, L * L - K], work: R`${paren(L)}^{2} + ${paren(K)}`, law: 'powers and sums' },
  ]);
  return q({
    prompt: R`Suppose \(${lim(a)} f(x) = ${L}\) and \(${lim(a)} g(x) = ${K}\). Find \(${lim(a)} ${t.tex}\).`,
    correct: t.val,
    wrong: t.wrong,
    solution: [`Limit laws: a limit can be taken piece by piece through ${t.law}.`, R`Replace each function by its limit: \(${t.work} = ${num(t.val)}\).`],
    rule: 2,
    skill: 'limit laws',
    check: () => checkLimit((x) => t.fn(L + (x - a), K + 2 * (x - a)), a, +t.val),
  });
}

// ───────────── Medium ─────────────

function mediumFactorCancel(rng) {
  const a = rng.nonzero(-5, 5);
  const b = rng.intExcept(-6, 6, [a]);
  const withDen = rng.bool(0.4);
  const c = withDen ? rng.intExcept(-6, 6, [a, b]) : 0;
  const top = [1, -(a + b), a * b];
  const bot = withDen ? [1, -(a + c), a * c] : [1, -a];
  const L = withDen ? frac(a - b, a - c) : frac(a - b, 1);
  const left = withDen ? R`\dfrac{${linear(1, -b)}}{${linear(1, -c)}}` : linear(1, -b);
  return q({
    prompt: R`Evaluate \(${lim(a)} \dfrac{${poly(top)}}{${poly(bot)}}\).`,
    correct: L,
    wrong: [
      { value: DNE, why: R`\(\frac{0}{0}\) does not say the limit fails to exist. It says: simplify, then try again.` },
      { value: 0, why: R`\(\frac{0}{0}\) is not \(0\). Factor and cancel first.` },
      withDen ? frac(a - c, a - b) : a + b,
      L.neg(),
      withDen ? frac(a + b, a + c === 0 ? 1 : a + c) : -a - b,
    ],
    solution: [
      R`Substituting \(x = ${a}\) gives \(\frac{0}{0}\), so factor.`,
      withDen ? R`\(\dfrac{${poly(top)}}{${poly(bot)}} = \dfrac{${factor(a)}${factor(b)}}{${factor(a)}${factor(c)}}\).` : R`\(${poly(top)} = ${factor(a)}${factor(b)}\).`,
      R`Cancel \(${factor(a)}\), which is allowed because \(x \ne ${a}\) inside a limit. What is left is \(${left}\).`,
      withDen ? R`Substitute \(x = ${a}\): \(\dfrac{${a} - ${paren(b)}}{${a} - ${paren(c)}} = ${L.tex()}\).` : R`Substitute \(x = ${a}\): \(${a} - ${paren(b)} = ${L.tex()}\).`,
    ],
    rule: 3,
    skill: 'factor and cancel',
    check: () => checkLimit((x) => polyEval(top, x) / polyEval(bot, x), a, L.value),
  });
}

function mediumOneSided(rng) {
  const a = rng.int(-2, 3);
  const m1 = rng.nonzero(-3, 3);
  const k1 = rng.int(-5, 5);
  const quad = rng.bool(0.5);
  const m2 = rng.intExcept(-3, 3, [0, m1]);
  let k2 = rng.int(-5, 5);
  const rightAt = (k) => (quad ? a * a + k : m2 * a + k);
  const left = m1 * a + k1;
  if (rng.bool(0.35)) k2 += left - rightAt(k2);
  const right = rightAt(k2);
  const same = left === right;
  const ask = rng.pick(['left', 'right', 'both']);
  const topTex = linear(m1, k1);
  const botTex = quad ? poly([1, 0, k2]) : linear(m2, k2);
  const f = (x) => (x < a ? m1 * x + k1 : quad ? x * x + k2 : m2 * x + k2);
  const def = R`f(x) = ${cases([[topTex, `x < ${a}`], [botTex, `x \\ge ${a}`]])}`;
  const leftStep = R`For \(x < ${a}\) use \(${topTex}\): as \(x \to ${side(a, -1)}\) it approaches \(${subst([m1, k1], a)} = ${left}\).`;
  const rightStep = R`For \(x > ${a}\) use \(${botTex}\): as \(x \to ${side(a, 1)}\) it approaches \(${subst(quad ? [1, 0, k2] : [m2, k2], a)} = ${right}\).`;
  const base = { rule: 1, skill: 'one-sided limits' };
  if (ask === 'both') {
    return q({
      ...base,
      prompt: R`Let \(${def}\). Find \(${lim(a)} f(x)\).`,
      correct: same ? left : DNE,
      wrong: same
        ? [{ value: DNE, why: R`Both one-sided limits equal \(${left}\), so the two-sided limit exists.` }, m1 * a, left + 1, left - 2, k2]
        : [{ value: left, why: 'That is only the left-hand limit. The right-hand limit is different.' }, { value: right, why: 'That is only the right-hand limit. The left-hand limit is different.' }, { value: (left + right) / 2, why: 'A limit is not the average of the two sides.' }, 0],
      solution: [leftStep, rightStep, same ? R`The one-sided limits agree, so \(${lim(a)} f(x) = ${left}\).` : R`\(${left} \ne ${right}\): the one-sided limits disagree, so the limit does not exist.`],
      check: () => (same ? checkLimit(f, a, left) : Math.abs(f(a - 1e-7) - f(a + 1e-7)) > 0.5 ? true : 'the two sides agree, so the limit exists'),
    });
  }
  const isLeft = ask === 'left';
  const ans = isLeft ? left : right;
  const other = isLeft ? right : left;
  return q({
    ...base,
    prompt: R`Let \(${def}\). Find \(${lim(side(a, isLeft ? -1 : 1))} f(x)\).`,
    correct: ans,
    wrong: [
      { value: other, why: isLeft ? R`\(x \to ${side(a, -1)}\) means \(x < ${a}\), so the top formula applies.` : R`\(x \to ${side(a, 1)}\) means \(x > ${a}\), so the bottom formula applies.` },
      { value: DNE, why: 'A one-sided limit only looks at one side, so it can exist even when the two sides disagree.' },
      isLeft ? k1 : k2,
      ans + 1,
      ans - 1,
    ],
    solution: [isLeft ? R`\(x \to ${side(a, -1)}\) means \(x\) is slightly less than \(${a}\), so use the top formula.` : R`\(x \to ${side(a, 1)}\) means \(x\) is slightly greater than \(${a}\), so use the bottom formula.`, isLeft ? leftStep : rightStep, R`The limit is \(${ans}\).`],
    check: () => checkLimit(f, a, ans, { side: isLeft ? -1 : 1 }),
  });
}

function mediumInfinity(rng) {
  const kind = rng.pick(['same', 'same', 'same', 'lower', 'lower', 'higher']);
  const m = kind === 'higher' ? rng.int(1, 2) : rng.int(kind === 'lower' ? 2 : 1, 3);
  const n = kind === 'same' ? m : kind === 'lower' ? m - 1 : m + 1;
  const coefs = (deg) => [rng.nonzero(-6, 6), ...Array.from({ length: deg }, (_, i) => (i === deg - 1 ? rng.nonzero(-9, 9) : rng.int(-9, 9)))];
  const top = coefs(n);
  const bot = coefs(m);
  const neg = rng.bool(0.3);
  const to = neg ? '-\\infty' : '\\infty';
  const f = (x) => polyEval(top, x) / polyEval(bot, x);
  const ratio = frac(top[0], bot[0]);
  const prompt = R`Evaluate \(${lim(to)} \dfrac{${poly(top)}}{${poly(bot)}}\).`;
  const base = { prompt, rule: 6, skill: 'limits at infinity' };
  const xm = m === 1 ? 'x' : `x^{${m}}`;
  if (kind === 'higher') {
    const sign = Math.sign(ratio.value) * (neg ? -1 : 1);
    return q({
      ...base,
      correct: sign > 0 ? INF : NINF,
      wrong: [
        { value: sign > 0 ? NINF : INF, why: R`Check the sign of \(${terms([[ratio, 'x']])}\) when \(x\) is a huge ${neg ? 'negative' : 'positive'} number.` },
        { value: ratio, why: 'The numerator has the higher degree, so the quotient does not level off: it grows without bound.' },
        { value: 0, why: 'A limit of 0 happens when the denominator has the higher degree. Here the numerator does.' },
      ],
      solution: [
        R`The numerator has degree \(${n}\) and the denominator has degree \(${m}\). The numerator grows faster, so the quotient is unbounded.`,
        R`For large \(|x|\) the quotient behaves like the ratio of leading terms: \(\dfrac{${terms([[top[0], `x^{${n}}`]])}}{${terms([[bot[0], xm]])}} = ${terms([[ratio, 'x']])}\).`,
        R`As \(x \to ${to}\), \(${terms([[ratio, 'x']])} \to ${sign > 0 ? '\\infty' : '-\\infty'}\).`,
      ],
      check: () => (Math.sign(f(neg ? -1e6 : 1e6)) === sign && Math.abs(f(neg ? -1e6 : 1e6)) > 1e4 ? true : 'wrong sign or not unbounded'),
    });
  }
  const L = kind === 'same' ? ratio : frac(0, 1);
  return q({
    ...base,
    correct: L,
    wrong:
      kind === 'same'
        ? [
            { value: 0, why: 'The degrees are equal, so neither part outgrows the other. The limit is the ratio of the leading coefficients.' },
            { value: INF, why: 'Both parts grow, but at the same rate, so the quotient levels off.' },
            { value: frac(top[n], bot[m]), why: 'For huge inputs the constant terms hardly matter. The highest powers decide the limit.' },
            frac(bot[0], top[0]),
            ratio.neg(),
          ]
        : [
            { value: ratio, why: R`The degrees are different: the denominator has the higher power and outgrows the numerator.` },
            { value: neg ? NINF : INF, why: 'The denominator has the higher degree, so the quotient shrinks toward 0.' },
            1,
            frac(top[n], bot[m]),
          ],
    solution: [
      R`Divide the numerator and the denominator by \(${xm}\), the highest power of \(x\) in the denominator.`,
      R`Every term that still has a power of \(x\) in its denominator tends to 0 as \(x \to ${to}\).`,
      kind === 'same' ? R`What is left is the ratio of the leading coefficients: \(\dfrac{${top[0]}}{${bot[0]}}${ratio.n === top[0] && ratio.d === bot[0] ? '' : ` = ${ratio.tex()}`}\).` : R`The numerator tends to \(0\) and the denominator tends to \(${bot[0]}\), so the limit is \(0\).`,
    ],
    check: () => checkLimit(f, neg ? -Infinity : Infinity, L.value),
  });
}

function mediumSinx(rng) {
  const a = rng.int(2, 9);
  const b = rng.intExcept(2, 9, [a]);
  const k = rng.pick([
    { tex: R`\dfrac{\sin ${a}x}{${b}x}`, f: (x) => Math.sin(a * x) / (b * x), L: frac(a, b), steps: [R`Rewrite so the denominator matches the inside of the sine: \(\dfrac{\sin ${a}x}{${b}x} = \dfrac{${a}}{${b}} \cdot \dfrac{\sin ${a}x}{${a}x}\).`, R`As \(x \to 0\), \(u = ${a}x \to 0\) and \(\dfrac{\sin u}{u} \to 1\).`] },
    { tex: R`\dfrac{\sin ${a}x}{\sin ${b}x}`, f: (x) => Math.sin(a * x) / Math.sin(b * x), L: frac(a, b), steps: [R`Divide the top and the bottom by \(x\): \(\dfrac{\sin ${a}x}{\sin ${b}x} = \dfrac{${a} \cdot \frac{\sin ${a}x}{${a}x}}{${b} \cdot \frac{\sin ${b}x}{${b}x}}\).`, R`Each fraction of the form \(\dfrac{\sin u}{u}\) tends to 1 as \(x \to 0\).`] },
    { tex: R`\dfrac{\tan ${a}x}{${b}x}`, f: (x) => Math.tan(a * x) / (b * x), L: frac(a, b), steps: [R`Write \(\tan ${a}x = \dfrac{\sin ${a}x}{\cos ${a}x}\): the expression is \(\dfrac{${a}}{${b}} \cdot \dfrac{\sin ${a}x}{${a}x} \cdot \dfrac{1}{\cos ${a}x}\).`, R`As \(x \to 0\), \(\dfrac{\sin ${a}x}{${a}x} \to 1\) and \(\cos ${a}x \to 1\).`] },
    { tex: R`\dfrac{${b}x}{\sin ${a}x}`, f: (x) => (b * x) / Math.sin(a * x), L: frac(b, a), steps: [R`Rewrite: \(\dfrac{${b}x}{\sin ${a}x} = \dfrac{${b}}{${a}} \cdot \dfrac{${a}x}{\sin ${a}x}\).`, R`\(\dfrac{${a}x}{\sin ${a}x}\) is the reciprocal of \(\dfrac{\sin u}{u}\) with \(u = ${a}x\), so it also tends to 1.`] },
  ]);
  return q({
    prompt: R`Evaluate \(${lim(0)} ${k.tex}\).`,
    correct: k.L,
    wrong: [
      { value: 1, why: R`\(\dfrac{\sin u}{u} \to 1\) needs the same expression \(u\) inside the sine and in the denominator. Here they differ, so a constant factor is left over.` },
      { value: 0, why: R`\(\frac{0}{0}\) is an indeterminate form, not the number 0.` },
      k.L.inv(),
      { value: DNE, why: 'The function is not defined at 0, but the limit only needs values near 0.' },
      frac(a * b, 1),
    ],
    solution: [...k.steps, R`The limit is \(${k.L.tex()}\).`],
    rule: 4,
    skill: 'special trig limit',
    check: () => checkLimit(k.f, 0, k.L.value),
  });
}

function mediumParking(rng) {
  const p = rng.int(2, 9);
  const n = rng.int(1, 4);
  const ask = rng.pick(['left', 'right', 'both']);
  const hours = n + 2;
  const C = (t) => p * Math.ceil(t);
  const visual = {
    type: 'plot',
    x: [0, hours],
    y: [0, p * (hours + 1)],
    step: [1, p],
    axisLabels: ['t (h)', 'C ($)'],
    segments: range(1, hours).map((k) => ({ from: [k - 1, p * k], to: [k, p * k], color: 'a' })),
    points: range(1, hours).flatMap((k) => [{ x: k - 1, y: p * k, open: true }, { x: k, y: p * k }]),
    alt: `Step graph of the parking cost. The cost is ${p} dollars for any time up to 1 hour, then jumps by ${p} dollars just after each whole hour. Each step has an open circle at its left end and a filled dot at its right end.`,
  };
  const before = money(p * n);
  const after = money(p * (n + 1));
  const spec = {
    left: {
      correct: before,
      wrong: [{ value: after, why: `Just before ${plural(n, 'hour')} the car is still inside hour ${n}, so the next hour has not been charged yet.` }, { value: DNE, why: 'A one-sided limit can exist at a jump. Only the two-sided limit fails.' }, money(p * (n + 2)), money(p * n - p / 2)],
      last: R`Just before \(t = ${n}\) the cost is ${before}, so \(${lim(side(n, -1), 't')} C(t) = ${p * n}\).`,
    },
    right: {
      correct: after,
      wrong: [{ value: before, why: `Just after ${plural(n, 'hour')} a new hour has started, so the cost has already jumped.` }, { value: DNE, why: 'A one-sided limit can exist at a jump. Only the two-sided limit fails.' }, money(p * (n + 2)), money(p * n + p / 2)],
      last: R`Just after \(t = ${n}\) the cost is ${after}, so \(${lim(side(n, 1), 't')} C(t) = ${p * (n + 1)}\).`,
    },
    both: {
      correct: DNE,
      wrong: [{ value: before, why: R`That is the left-hand limit (and also \(C(${n})\)). From the right the cost approaches ${after}.` }, { value: after, why: `That is only the right-hand limit. From the left the cost approaches ${before}.` }, { value: money(p * n + p / 2), why: 'A limit is not the average of the two sides.' }],
      last: R`The one-sided limits, \(${p * n}\) and \(${p * (n + 1)}\), are different, so \(${lim(n, 't')} C(t)\) does not exist.`,
    },
  }[ask];
  return q({
    prompt: R`A parking garage charges ${money(p)} for each hour or part of an hour. Let \(C(t)\) be the cost, in dollars, of parking for \(t\) hours. Find \(${lim(ask === 'both' ? n : side(n, ask === 'left' ? -1 : 1), 't')} C(t)\).`,
    visual,
    correct: spec.correct,
    wrong: spec.wrong,
    solution: [`${n === 1 ? 'Any time up to 1 hour' : `Any time longer than ${plural(n - 1, 'hour')} and up to ${plural(n, 'hour')}`} costs ${before}. Any time longer than ${plural(n, 'hour')} and up to ${plural(n + 1, 'hour')} costs ${after}.`, spec.last],
    rule: 1,
    skill: 'one-sided limits',
    check: () => (C(n - 1e-6) === p * n && C(n + 1e-6) === p * (n + 1) ? true : 'step function values are off'),
  });
}

// ───────────── Hard ─────────────

function hardRationalise(rng) {
  const d = rng.int(2, 7);
  const a = rng.int(-4, 6);
  const c = d * d - a;
  const flip = rng.bool(0.3);
  const root = R`\sqrt{${linear(1, c)}}`;
  const diff = R`${root} - ${d}`;
  const L = flip ? frac(2 * d, 1) : frac(1, 2 * d);
  return q({
    prompt: R`Evaluate \(${lim(a)} ${flip ? R`\dfrac{${linear(1, -a)}}{${diff}}` : R`\dfrac{${diff}}{${linear(1, -a)}}`}\).`,
    correct: L,
    wrong: [
      { value: flip ? frac(d, 1) : frac(1, d), why: R`After cancelling, the conjugate \(${root} + ${d}\) remains, and it tends to \(${d} + ${d} = ${2 * d}\).` },
      { value: 0, why: R`\(\frac{0}{0}\) is not \(0\). Multiply by the conjugate to simplify.` },
      { value: DNE, why: R`\(\frac{0}{0}\) does not mean the limit fails to exist. Multiply by the conjugate to simplify.` },
      L.inv(),
      L.neg(),
    ],
    solution: [
      R`Substituting \(x = ${a}\) gives \(\frac{0}{0}\). Multiply the top and the bottom by the conjugate \(${root} + ${d}\).`,
      R`\(\left(${diff}\right)\left(${root} + ${d}\right) = (${linear(1, c)}) - ${d * d} = ${linear(1, -a)}\).`,
      flip ? R`Cancel \(${linear(1, -a)}\): the expression becomes \(${root} + ${d}\).` : R`Cancel \(${linear(1, -a)}\): the expression becomes \(\dfrac{1}{${root} + ${d}}\).`,
      flip ? R`Substitute \(x = ${a}\): \(${d} + ${d} = ${2 * d}\).` : R`Substitute \(x = ${a}\): \(\dfrac{1}{${d} + ${d}} = \dfrac{1}{${2 * d}}\).`,
    ],
    rule: 3,
    skill: 'rationalising',
    check: () => checkLimit((x) => (flip ? (x - a) / (Math.sqrt(x + c) - d) : (Math.sqrt(x + c) - d) / (x - a)), a, L.value),
  });
}

function hardCombineFractions(rng) {
  const a = rng.int(2, 9);
  const c = rng.pick([1, 1, 2, 3, 5].filter((v) => v === 1 || a % v !== 0));
  const atZero = rng.bool(0.5);
  const L = frac(-c, a * a);
  const expr = atZero ? R`\dfrac{\frac{${c}}{${linear(1, a)}} - \frac{${c}}{${a}}}{x}` : R`\dfrac{\frac{${c}}{x} - \frac{${c}}{${a}}}{${linear(1, -a)}}`;
  const f = atZero ? (x) => (c / (x + a) - c / a) / x : (x) => (c / x - c / a) / (x - a);
  const lead = c === 1 ? '' : String(c);
  return q({
    prompt: R`Evaluate \(${lim(atZero ? 0 : a)} ${expr}\).`,
    correct: L,
    wrong: [
      { value: L.neg(), why: atZero ? R`The numerator combines to \(${a} - (${linear(1, a)}) = -x\). Keep the minus sign.` : R`The numerator combines to \(${a} - x = -(${linear(1, -a)})\). Keep the minus sign.` },
      { value: frac(-c, a), why: R`The common denominator has two factors, and both tend to \(${a}\).` },
      { value: 0, why: R`\(\frac{0}{0}\) is not \(0\). Combine the small fractions first.` },
      { value: DNE, why: R`\(\frac{0}{0}\) does not mean the limit fails to exist. Combine the small fractions first.` },
    ],
    solution: atZero
      ? [
          R`Substituting gives \(\frac{0}{0}\). Combine the two fractions in the numerator over the common denominator \(${a}(${linear(1, a)})\).`,
          R`\(\dfrac{${c}}{${linear(1, a)}} - \dfrac{${c}}{${a}} = \dfrac{${c === 1 ? '' : `${c}\\left[`}${a} - (${linear(1, a)})${c === 1 ? '' : '\\right]'}}{${a}(${linear(1, a)})} = -\dfrac{${lead}x}{${a}(${linear(1, a)})}\).`,
          R`Dividing by \(x\) leaves \(-\dfrac{${c}}{${a}(${linear(1, a)})}\).`,
          R`Substitute \(x = 0\): \(-\dfrac{${c}}{${a} \cdot ${a}} = ${L.tex()}\).`,
        ]
      : [
          R`Substituting gives \(\frac{0}{0}\). Combine the two fractions in the numerator over the common denominator \(${a}x\).`,
          R`\(\dfrac{${c}}{x} - \dfrac{${c}}{${a}} = \dfrac{${lead}(${a} - x)}{${a}x} = -\dfrac{${lead}(${linear(1, -a)})}{${a}x}\).`,
          R`Dividing by \(${linear(1, -a)}\) leaves \(-\dfrac{${c}}{${a}x}\).`,
          R`Substitute \(x = ${a}\): \(-\dfrac{${c}}{${a} \cdot ${a}} = ${L.tex()}\).`,
        ],
    rule: 3,
    skill: 'combining fractions',
    check: () => checkLimit(f, atZero ? 0 : a, L.value),
  });
}

function hardInfinite(rng) {
  const a = rng.nonzero(-5, 5);
  const b = rng.nonzero(-4, 4);
  const c = rng.intExcept(-9, 9, [-b * a]);
  const N = b * a + c;
  const kind = rng.pick(['side', 'side', 'side', 'square', 'two']);
  const s = rng.sign();
  const den = kind === 'square' ? `(${linear(1, -a)})^{2}` : linear(1, -a);
  const f = (x) => (b * x + c) / (kind === 'square' ? (x - a) ** 2 : x - a);
  const to = kind === 'side' ? side(a, s) : num(a);
  const prompt = R`Evaluate \(${lim(to)} \dfrac{${linear(b, c)}}{${den}}\).`;
  const base = { prompt, rule: 5, skill: 'infinite limits' };
  const numStep = R`As \(x \to ${a}\), the numerator approaches \(${subst([b, c], a)} = ${N}\), which is ${N > 0 ? 'positive' : 'negative'}, and the denominator approaches \(0\). The quotient is unbounded.`;
  if (kind === 'two') {
    return q({
      ...base,
      correct: DNE,
      wrong: [
        { value: N > 0 ? INF : NINF, why: R`That describes only \(x \to ${side(a, 1)}\). From the left the denominator is negative, and the sign flips.` },
        { value: N > 0 ? NINF : INF, why: R`That describes only \(x \to ${side(a, -1)}\). From the right the denominator is positive, and the sign flips.` },
        { value: 0, why: 'A denominator tending to 0 makes the quotient huge, not small.' },
      ],
      solution: [numStep, R`For \(x > ${a}\) the denominator is a small positive number, so the quotient tends to \(${N > 0 ? '\\infty' : '-\\infty'}\). For \(x < ${a}\) it is a small negative number, so the quotient tends to \(${N > 0 ? '-\\infty' : '\\infty'}\).`, 'The two sides behave differently, so the two-sided limit does not exist.'],
      check: () => (f(a + 1e-7) * f(a - 1e-7) < 0 && Math.abs(f(a + 1e-7)) > 1e4 ? true : 'the two sides do not go to opposite infinities'),
    });
  }
  const denSign = kind === 'square' ? 1 : s;
  const sign = Math.sign(N) * denSign;
  const probe = kind === 'square' ? [a + 1e-4, a - 1e-4] : [a + s * 1e-7];
  return q({
    ...base,
    correct: sign > 0 ? INF : NINF,
    wrong: [
      { value: sign > 0 ? NINF : INF, why: R`Check the signs: the numerator is near \(${N}\) and the denominator is a tiny ${denSign > 0 ? 'positive' : 'negative'} number.` },
      { value: N, why: R`\(${N}\) is the limit of the numerator alone. Dividing by a denominator that tends to 0 makes the quotient unbounded.` },
      { value: 0, why: 'A denominator tending to 0 makes the quotient huge, not small.' },
    ],
    solution: [
      numStep,
      kind === 'square' ? R`The denominator \(${den}\) is a square, so it is positive on both sides of \(${a}\).` : R`For \(x ${s > 0 ? '>' : '<'} ${a}\), the denominator \(${den}\) is a small ${s > 0 ? 'positive' : 'negative'} number.`,
      R`A ${N > 0 ? 'positive' : 'negative'} number divided by a tiny ${denSign > 0 ? 'positive' : 'negative'} number is a huge ${sign > 0 ? 'positive' : 'negative'} number: the limit is \(${sign > 0 ? '\\infty' : '-\\infty'}\).`,
    ],
    check: () => (probe.every((x) => Math.sign(f(x)) === sign && Math.abs(f(x)) > 1e4) ? true : 'wrong sign or not unbounded'),
  });
}

function hardAsymptotes(rng) {
  const a = rng.int(-5, 5);
  const b = rng.intExcept(-6, 6, [a]);
  const c = rng.intExcept(-6, 6, [a, b]);
  const top = [1, -(a + b), a * b];
  const bot = [1, -(a + c), a * c];
  const f = (x) => polyEval(top, x) / polyEval(bot, x);
  const eq = (v) => R`\(x = ${v}\)`;
  return q({
    prompt: R`Which lines are vertical asymptotes of the graph of \(f(x) = \dfrac{${poly(top)}}{${poly(bot)}}\)?`,
    correct: `${eq(c)} only`,
    wrong: [
      { value: `${eq(Math.min(a, c))} and ${eq(Math.max(a, c))}`, why: R`The factor \(${factor(a)}\) cancels, so the limit at \(x = ${a}\) is finite. That is a hole, not an asymptote.` },
      { value: `${eq(a)} only`, why: R`At \(x = ${a}\) the common factor cancels, leaving a hole. The asymptote is where the denominator alone is 0.` },
      { value: `${eq(b)} only`, why: R`At \(x = ${b}\) only the numerator is 0. That is an \(x\)-intercept.` },
      `${eq(Math.min(b, c))} and ${eq(Math.max(b, c))}`,
    ],
    solution: [
      R`Factor: \(f(x) = \dfrac{${factor(a)}${factor(b)}}{${factor(a)}${factor(c)}}\).`,
      R`At \(x = ${a}\) the factor \(${factor(a)}\) cancels, so \(${lim(a)} f(x) = ${frac(a - b, a - c).tex()}\) is finite: the graph has a hole there.`,
      R`At \(x = ${c}\) the denominator is 0 but the numerator is not, so \(f(x) \to \pm\infty\): the line \(x = ${c}\) is a vertical asymptote.`,
    ],
    rule: 5,
    skill: 'vertical asymptotes',
    check: () => checkAll(checkLimit(f, a, (a - b) / (a - c)), Math.abs(f(c + 1e-7)) > 1e4 ? true : 'no blow-up at the claimed asymptote'),
  });
}

function hardBrine(rng) {
  const s = rng.int(4, 40);
  const r = rng.pick([2, 4, 5, 10, 20, 25]);
  const V = rng.pick([200, 400, 500, 1000, 2000, 5000]);
  const C = (t) => (s * r * t) / (V + r * t);
  return q({
    prompt: R`A tank holds ${txt(V)} liters of pure water. Brine containing ${s} grams of salt per liter is pumped in at ${r} liters per minute, so after \(t\) minutes the salt concentration in the tank is \(C(t) = \dfrac{${num(s * r)}t}{${V} + ${r}t}\) grams per liter. What does the concentration approach as \(t \to \infty\)?`,
    correct: s,
    unit: 'g/L',
    wrong: [
      { value: s * r, why: R`The denominator grows too. Divide the top and the bottom by \(t\) before taking the limit.` },
      { value: frac(s * r, V), why: R`For large \(t\) the constant \(${V}\) hardly matters. Compare the terms with \(t\).` },
      { value: R`\(\infty\) (it grows without bound)`, why: 'The numerator and the denominator have the same degree, so the quotient levels off.' },
      0,
    ],
    solution: [
      R`Divide the numerator and the denominator by \(t\): \(C(t) = \dfrac{${num(s * r)}}{\frac{${V}}{t} + ${r}}\).`,
      R`As \(t \to \infty\), \(\dfrac{${V}}{t} \to 0\).`,
      R`So \(C(t) \to \dfrac{${num(s * r)}}{${r}} = ${s}\) g/L, the concentration of the brine being pumped in.`,
    ],
    rule: 6,
    skill: 'limits at infinity',
    check: () => checkAll(checkEqual(C(1e10), s, 1e-5, 'long-run concentration'), C(1e6) < s ? true : 'concentration should stay below the inflow value'),
  });
}

// ───────────── Challenge ─────────────

function challengeSqueeze(rng) {
  const a = rng.nonzero(-4, 4);
  const sq = `(${linear(1, -a)})^{2}`;
  let lowTex;
  let highTex;
  let low;
  let high;
  let L;
  let wrong;
  let why;
  if (rng.bool(0.5)) {
    const c = rng.int(-6, 6);
    L = a * a + c;
    lowTex = linear(2 * a, c - a * a);
    highTex = poly([1, 0, c]);
    low = (x) => 2 * a * x + c - a * a;
    high = (x) => x * x + c;
    wrong = [{ value: c - a * a, why: R`That is the lower bound at \(x = 0\). Evaluate the bounds as \(x \to ${a}\).` }, 2 * a, a * a + 2 * c + 1];
    why = R`\(${lim(a)} (${lowTex}) = ${subst([2 * a, c - a * a], a)} = ${L}\) and \(${lim(a)} (${highTex}) = ${subst([1, 0, c], a)} = ${L}\).`;
  } else {
    const k = rng.int(1, 5);
    L = rng.int(-9, 9);
    lowTex = terms([[L, ''], [-k, sq]]);
    highTex = terms([[L, ''], [k, sq]]);
    low = (x) => L - k * (x - a) ** 2;
    high = (x) => L + k * (x - a) ** 2;
    wrong = [{ value: L + k, why: R`\(${sq} \to 0\) as \(x \to ${a}\), so the upper bound tends to \(${L}\), not \(${L + k}\).` }, L - k, a];
    why = R`As \(x \to ${a}\), \(${sq} \to 0\), so both the lower bound and the upper bound tend to \(${L}\).`;
  }
  return q({
    prompt: R`Suppose \(${lowTex} \le f(x) \le ${highTex}\) for all \(x\) near \(${a}\). What is \(${lim(a)} f(x)\)?`,
    correct: L,
    wrong: [{ value: 'It cannot be determined', why: 'When the lower and upper bounds have the same limit, the squeeze theorem forces the function between them to share it.' }, ...wrong],
    solution: ['Use the squeeze theorem: find the limits of the two bounds.', why, R`\(f\) is trapped between two functions with the same limit, so \(${lim(a)} f(x) = ${L}\).`],
    rule: 4,
    skill: 'squeeze theorem',
    check: () => checkAll(checkLimit(low, a, L), checkLimit(high, a, L), [a - 1, a - 0.3, a + 0.2, a + 1].every((x) => low(x) <= high(x)) ? true : 'bounds are in the wrong order'),
  });
}

function challengeFindConstant(rng) {
  const a = rng.nonzero(-5, 5);
  const b = rng.intExcept(-6, 6, [0, a, -a]);
  const k = -(a + b);
  const C = a * b;
  const askK = rng.bool(0.5);
  const eqn = terms([[a * a, ''], [a, 'k'], [C, '']]);
  const expr = R`\dfrac{${terms([[1, 'x^{2}'], [1, 'kx'], [C, '']])}}{${linear(1, -a)}}`;
  const setup = [
    R`The denominator tends to 0 as \(x \to ${a}\). A finite limit is only possible if the numerator also tends to 0.`,
    R`Set the numerator equal to 0 at \(x = ${a}\): \(${eqn} = 0\), so \(k = ${k}\).`,
  ];
  const check = () => (a * a + k * a + C === 0 ? checkLimit((x) => (x * x + k * x + C) / (x - a), a, a - b) : 'numerator is not 0 at x = a');
  if (askK) {
    return q({
      prompt: R`The limit \(${lim(a)} ${expr}\) exists (as a finite number) for exactly one value of the constant \(k\). What is \(k\)?`,
      correct: k,
      fmt: (v) => R`\(k = ${num(v)}\)`,
      wrong: [{ value: -k, why: R`Solve \(${eqn} = 0\) carefully: watch the signs.` }, { value: -b, why: R`The \(x^{2}\) term also contributes: at \(x = ${a}\) it equals \(${a * a}\).` }, -a, b, a - b],
      solution: [...setup, R`Check: \(${poly([1, k, C])} = ${factor(a)}${factor(b)}\), and the factor \(${factor(a)}\) cancels.`],
      rule: 3,
      skill: 'working backwards',
      check,
    });
  }
  return q({
    prompt: R`For one value of the constant \(k\), the limit \(${lim(a)} ${expr}\) exists as a finite number. For that \(k\), what is the value of the limit?`,
    correct: a - b,
    wrong: [{ value: k, why: R`That is \(k\). Now put it back and evaluate the limit.` }, { value: 0, why: R`\(\frac{0}{0}\) is not the value of the limit. Cancel the common factor first.` }, b - a, a + b, 2 * a],
    solution: [...setup, R`Then \(${poly([1, k, C])} = ${factor(a)}${factor(b)}\). Cancel \(${factor(a)}\) to get \(${linear(1, -b)}\).`, R`Substitute \(x = ${a}\): the limit is \(${a} - ${paren(b)} = ${a - b}\).`],
    rule: 3,
    skill: 'working backwards',
    check,
  });
}

function challengeTrig(rng) {
  const a = rng.int(2, 6);
  const b = rng.int(2, 9);
  const k = rng.pick([
    {
      tex: R`\dfrac{1 - \cos ${a}x}{${b}x^{2}}`,
      f: (x) => (1 - Math.cos(a * x)) / (b * x * x),
      L: frac(a * a, 2 * b),
      wrong: [{ value: frac(a * a, b), why: R`After multiplying by the conjugate, the factor \(\dfrac{1}{1 + \cos ${a}x}\) remains, and it tends to \(\frac{1}{2}\).` }, { value: 0, why: R`\(\dfrac{1 - \cos x}{x} \to 0\), but here the denominator is \(x^{2}\), which changes the answer.` }, frac(a, 2 * b), frac(a, b)],
      steps: [
        R`Multiply the top and the bottom by \(1 + \cos ${a}x\): the numerator becomes \(1 - \cos^{2} ${a}x = \sin^{2} ${a}x\).`,
        R`The expression is \(\dfrac{1}{${b}} \cdot \left(\dfrac{\sin ${a}x}{x}\right)^{2} \cdot \dfrac{1}{1 + \cos ${a}x}\).`,
        R`As \(x \to 0\): \(\dfrac{\sin ${a}x}{x} \to ${a}\) and \(1 + \cos ${a}x \to 2\). The limit is \(\dfrac{${a * a}}{${b} \cdot 2} = ${frac(a * a, 2 * b).tex()}\).`,
      ],
    },
    {
      tex: R`\dfrac{\sin^{2} ${a}x}{${b}x^{2}}`,
      f: (x) => Math.sin(a * x) ** 2 / (b * x * x),
      L: frac(a * a, b),
      wrong: [{ value: frac(a, b), why: R`The sine is squared, so the factor \(${a}\) appears twice.` }, { value: frac(1, b), why: R`\(\dfrac{\sin ${a}x}{x} \to ${a}\), not 1, because the inside of the sine is \(${a}x\).` }, 0, frac(a * a, 2 * b)],
      steps: [
        R`Write the expression as \(\dfrac{1}{${b}} \cdot \left(\dfrac{\sin ${a}x}{x}\right)^{2}\).`,
        R`\(\dfrac{\sin ${a}x}{x} = ${a} \cdot \dfrac{\sin ${a}x}{${a}x} \to ${a}\) as \(x \to 0\).`,
        R`The limit is \(\dfrac{${a}^{2}}{${b}} = ${frac(a * a, b).tex()}\).`,
      ],
    },
    {
      tex: R`\dfrac{\sin ${a}x}{x^{2} + ${b}x}`,
      f: (x) => Math.sin(a * x) / (x * x + b * x),
      L: frac(a, b),
      wrong: [{ value: a, why: R`Factor the denominator as \(x(x + ${b})\): the second factor tends to \(${b}\) and stays in the answer.` }, { value: 0, why: R`\(\frac{0}{0}\) is an indeterminate form, not the number 0.` }, frac(1, b), frac(b, a)],
      steps: [
        R`Factor the denominator: \(x^{2} + ${b}x = x(x + ${b})\).`,
        R`The expression is \(\dfrac{\sin ${a}x}{x} \cdot \dfrac{1}{x + ${b}}\).`,
        R`As \(x \to 0\): \(\dfrac{\sin ${a}x}{x} \to ${a}\) and \(\dfrac{1}{x + ${b}} \to \dfrac{1}{${b}}\). The limit is \(${frac(a, b).tex()}\).`,
      ],
    },
  ]);
  return q({
    prompt: R`Evaluate \(${lim(0)} ${k.tex}\).`,
    correct: k.L,
    wrong: [...k.wrong, { value: DNE, why: 'The function is not defined at 0, but the limit only needs values near 0.' }],
    solution: k.steps,
    rule: 4,
    skill: 'special trig limit',
    check: () => checkAll(...[1e-3, -1e-3].map((x) => (Math.abs(k.f(x) - k.L.value) < 1e-3 * Math.max(1, k.L.value) ? true : `value near 0 is ${k.f(x)}, expected ${k.L.value}`))),
  });
}

function challengeAbs(rng) {
  const a = rng.nonzero(-6, 6);
  const abs = `|${linear(1, -a)}|`;
  const s = rng.pick([-1, 1, 0]);
  const quad = rng.bool(0.5);
  const expr = quad ? R`\dfrac{${poly([1, 0, -a * a])}}{${abs}}` : R`\dfrac{${abs}}{${linear(1, -a)}}`;
  const f = quad ? (x) => (x * x - a * a) / Math.abs(x - a) : (x) => Math.abs(x - a) / (x - a);
  const right = quad ? 2 * a : 1;
  const leftStep = R`For \(x < ${a}\): \(${abs} = -(${linear(1, -a)})\), so the expression equals \(${quad ? `-(${linear(1, a)})` : '-1'}\) and tends to \(${-right}\).`;
  const rightStep = R`For \(x > ${a}\): \(${abs} = ${linear(1, -a)}\), so the expression equals \(${quad ? linear(1, a) : '1'}\) and tends to \(${right}\).`;
  const base = { prompt: R`Evaluate \(${lim(s === 0 ? a : side(a, s))} ${expr}\).`, rule: 1, skill: 'absolute value limits' };
  if (s === 0) {
    return q({
      ...base,
      correct: DNE,
      wrong: [{ value: right, why: R`That is only the right-hand limit. For \(x < ${a}\) the absolute value changes the sign.` }, { value: -right, why: R`That is only the left-hand limit. For \(x > ${a}\) the sign is different.` }, { value: 0, why: R`\(\frac{0}{0}\) is not \(0\). Split into the cases \(x < ${a}\) and \(x > ${a}\).` }],
      solution: [leftStep, rightStep, 'The one-sided limits are different, so the two-sided limit does not exist.'],
      check: () => checkAll(checkLimit(f, a, -right, { side: -1 }), checkLimit(f, a, right, { side: 1 })),
    });
  }
  const ans = s * right;
  return q({
    ...base,
    correct: ans,
    wrong: [
      { value: -ans, why: s < 0 ? R`For \(x < ${a}\), \(${linear(1, -a)}\) is negative, so \(${abs} = -(${linear(1, -a)})\).` : R`For \(x > ${a}\), \(${linear(1, -a)}\) is positive, so \(${abs} = ${linear(1, -a)}\) with no sign change.` },
      { value: DNE, why: 'The two-sided limit does not exist, but each one-sided limit does.' },
      { value: 0, why: R`\(\frac{0}{0}\) is not \(0\). Remove the absolute value using the side you are on.` },
      quad ? s * a : 2 * s,
    ],
    solution: [s < 0 ? leftStep : rightStep, R`The limit is \(${ans}\).`],
    check: () => checkLimit(f, a, ans, { side: s }),
  });
}

function challengeConjugateInfinity(rng) {
  const a = rng.int(1, 4);
  const b = rng.nonzero(-9, 9);
  const L = frac(b, 2 * a);
  const root = R`\sqrt{${terms([[a * a, 'x^{2}'], [b, 'x']])}}`;
  const ax = terms([[a, 'x']]);
  return q({
    prompt: R`Evaluate \(${lim('\\infty')} \left(${root} - ${ax}\right)\).`,
    correct: L,
    wrong: [
      { value: 0, why: R`\(\infty - \infty\) is an indeterminate form, not \(0\). Multiply by the conjugate.` },
      { value: frac(b, a), why: R`After dividing by \(x\), the denominator tends to \(${a} + ${a} = ${2 * a}\), not \(${a}\).` },
      { value: b > 0 ? INF : NINF, why: 'The two parts grow at almost the same rate, so their difference stays bounded.' },
      L.neg(),
      a === 1 ? frac(b, 4) : frac(b, 2),
    ],
    solution: [
      R`The form is \(\infty - \infty\). Multiply and divide by the conjugate \(${root} + ${ax}\).`,
      R`The numerator becomes \((${terms([[a * a, 'x^{2}'], [b, 'x']])}) - ${terms([[a * a, 'x^{2}']])} = ${terms([[b, 'x']])}\), so the expression is \(${dfrac(terms([[b, 'x']]), `${root} + ${ax}`)}\).`,
      R`Divide the top and the bottom by \(x\) (for \(x > 0\), \(x = \sqrt{x^{2}}\)): \(${dfrac(String(b), R`\sqrt{${a * a} ${b > 0 ? '+' : '-'} \frac{${Math.abs(b)}}{x}} + ${a}`)}\).`,
      R`As \(x \to \infty\) this tends to \(${dfrac(String(b), `${a} + ${a}`)} = ${L.tex()}\).`,
    ],
    rule: 6,
    skill: 'limits at infinity',
    check: () => checkLimit((x) => Math.sqrt(a * a * x * x + b * x) - a * x, Infinity, L.value),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'limits',
  title: 'Limits',
  summary: 'Find limits from tables, graphs and algebra, including one-sided limits, infinite limits and limits at infinity.',
  standards: ['AP Calculus 1.2', 'AP Calculus 1.3', 'AP Calculus 1.4', 'AP Calculus 1.5', 'AP Calculus 1.6', 'AP Calculus 1.7', 'AP Calculus 1.8', 'AP Calculus 1.14', 'AP Calculus 1.15'],

  explain: {
    intro: R`A limit describes the value that a function's outputs approach as its input approaches some number. It depends only on what happens **near** that number, never on what happens **at** it. Limits make precise the ideas behind derivatives and integrals.`,
    rules: [
      {
        title: 'What a limit says',
        text: R`\(\lim\limits_{x \to a} f(x) = L\) means that \(f(x)\) can be made as close to \(L\) as we like by taking \(x\) close enough to \(a\), on either side, with \(x \ne a\). The function need not be defined at \(a\), and if it is, the value \(f(a)\) does not affect the limit. Estimate a limit from a table or a graph by watching where the outputs are heading.`,
        example: R`For \(f(x) = \dfrac{x^{2} - 1}{x - 1}\), \(f(1)\) is not defined. But \(f(0.99) = 1.99\) and \(f(1.01) = 2.01\): the outputs approach \(2\), so \(\lim\limits_{x \to 1} f(x) = 2\).`,
      },
      {
        title: 'One-sided limits',
        text: R`\(x \to a^{-}\) uses only inputs less than \(a\); \(x \to a^{+}\) uses only inputs greater than \(a\). The two-sided limit exists exactly when both one-sided limits exist and are equal. If the two sides approach different numbers (a jump), or the outputs grow without bound, or they oscillate without settling, the limit does not exist.`,
        example: R`For \(f(x) = \dfrac{|x|}{x}\): \(\lim\limits_{x \to 0^{-}} f(x) = -1\) and \(\lim\limits_{x \to 0^{+}} f(x) = 1\), so \(\lim\limits_{x \to 0} f(x)\) does not exist.`,
      },
      {
        title: 'Limit laws and direct substitution',
        text: R`Limits can be taken piece by piece through sums, differences, constant multiples, products, powers, and quotients whose denominator does not tend to 0. So for polynomials, and for rational, root, trigonometric, exponential and logarithmic functions at any point of their domain, the limit is found by substituting.`,
        example: R`\(\lim\limits_{x \to 2} \dfrac{x^{2} + 3x}{x + 1} = \dfrac{4 + 6}{3} = \dfrac{10}{3}\).`,
      },
      {
        title: R`The form \(\frac{0}{0}\): simplify first`,
        text: R`If substituting gives \(\frac{0}{0}\), the limit is not decided yet. Rewrite the expression, then substitute again: **factor and cancel**, **multiply by the conjugate** when there is a square root, or **combine fractions**. Cancelling a factor \((x - a)\) is legal because \(x \ne a\) inside the limit.`,
        example: R`\(\lim\limits_{x \to 3} \dfrac{x^{2} - 9}{x - 3} = \lim\limits_{x \to 3} \dfrac{(x - 3)(x + 3)}{x - 3} = \lim\limits_{x \to 3} (x + 3) = 6\).`,
      },
      {
        title: 'A special trig limit and the squeeze theorem',
        text: R`With \(x\) in radians, \(\lim\limits_{x \to 0} \dfrac{\sin x}{x} = 1\), and from it \(\lim\limits_{x \to 0} \dfrac{1 - \cos x}{x} = 0\). **Squeeze theorem:** if \(g(x) \le f(x) \le h(x)\) near \(a\) and \(g\) and \(h\) have the same limit \(L\) at \(a\), then \(f\) has limit \(L\) too.`,
        example: R`\(\lim\limits_{x \to 0} \dfrac{\sin 3x}{x} = \lim\limits_{x \to 0} 3 \cdot \dfrac{\sin 3x}{3x} = 3 \cdot 1 = 3\).`,
      },
      {
        title: 'Infinite limits and vertical asymptotes',
        text: R`If the numerator approaches a nonzero number while the denominator approaches 0, the quotient grows without bound. We write \(\infty\) or \(-\infty\); find the sign from the signs of the top and the bottom on the side you are approaching from. The line \(x = a\) is then a **vertical asymptote**. If a common factor cancels instead, the graph has a hole, not an asymptote.`,
        example: R`\(\lim\limits_{x \to 2^{+}} \dfrac{1}{x - 2} = \infty\) and \(\lim\limits_{x \to 2^{-}} \dfrac{1}{x - 2} = -\infty\), so \(x = 2\) is a vertical asymptote.`,
      },
      {
        title: 'Limits at infinity and horizontal asymptotes',
        text: R`For a rational function as \(x \to \pm\infty\), divide the top and the bottom by the highest power of \(x\) in the denominator; every term of the form \(\dfrac{c}{x^{n}}\) tends to 0. Equal degrees give the ratio of the leading coefficients, a smaller degree on top gives 0, and a larger degree on top gives an unbounded quotient. If \(f(x) \to L\) as \(x \to \infty\) or \(x \to -\infty\), the line \(y = L\) is a **horizontal asymptote**.`,
        example: R`\(\lim\limits_{x \to \infty} \dfrac{3x^{2} - x}{2x^{2} + 5} = \lim\limits_{x \to \infty} \dfrac{3 - \frac{1}{x}}{2 + \frac{5}{x^{2}}} = \dfrac{3}{2}\).`,
      },
    ],
    vocab: [
      { term: 'limit', def: R`The value \(L\) that \(f(x)\) approaches as \(x\) approaches \(a\). Written \(\lim\limits_{x \to a} f(x) = L\).` },
      { term: 'one-sided limit', def: R`A limit that uses inputs on one side of \(a\) only: from the left (\(x \to a^{-}\)) or from the right (\(x \to a^{+}\)).` },
      { term: 'indeterminate form', def: R`An expression such as \(\frac{0}{0}\) or \(\infty - \infty\) whose limit cannot be read off without more work.` },
      { term: 'vertical asymptote', def: R`A line \(x = a\) that the graph approaches as the outputs grow without bound.` },
      { term: 'horizontal asymptote', def: R`A line \(y = L\) that the graph approaches as \(x \to \infty\) or \(x \to -\infty\).` },
    ],
    mistakes: [
      R`Reading \(\frac{0}{0}\) as "0" or as "does not exist". It only means the expression must be simplified before substituting.`,
      R`Using \(f(a)\) as the limit at a hole or a jump. The limit is about nearby inputs, not the input \(a\) itself.`,
      R`Writing \(\lim\limits_{x \to 0} \dfrac{\sin 3x}{x} = 1\). The special limit needs the same expression inside the sine and in the denominator.`,
      R`Comparing constant terms for a limit at infinity. For large \(|x|\) the highest powers decide.`,
      R`Giving one answer for a two-sided limit at a jump or a vertical asymptote without checking both sides.`,
    ],
    visual: {
      type: 'plot',
      x: [-2, 4],
      y: [-1.5, 5.5],
      step: [1, 1],
      fns: [{ f: (x) => x + 1, label: 'y = (x² − 1)/(x − 1)', labelAt: 2.6 }],
      points: [{ x: 1, y: 2, open: true, label: 'hole at (1, 2)' }],
      alt: 'Graph of y = (x² − 1)/(x − 1): the line y = x + 1 with an open circle at the point (1, 2). The function is not defined at x = 1, but the graph approaches height 2 from both sides.',
    },
  },

  examples: [
    {
      title: 'Estimating a limit from a table',
      problem: R`Use the table to estimate \(\lim\limits_{x \to 0} \dfrac{\sin x}{x}\) (with \(x\) in radians).`,
      steps: [
        R`The function is not defined at \(x = 0\), so look at inputs on both sides of 0.`,
        R`From the left, the outputs \(0.9589,\ 0.9983,\ 0.99998\) climb toward 1.`,
        R`From the right, the outputs \(0.9589,\ 0.9983,\ 0.99998\) are the same, and they also climb toward 1.`,
      ],
      answer: R`\(\lim\limits_{x \to 0} \dfrac{\sin x}{x} = 1\)`,
      visual: rowTable(['x', '\\frac{\\sin x}{x}'], [[-0.5, 0.9589], [-0.1, 0.9983], [-0.01, 0.99998], [0.01, 0.99998], [0.1, 0.9983], [0.5, 0.9589]], 'Table of values of sin x over x: at x = ±0.5 it is 0.9589, at x = ±0.1 it is 0.9983, and at x = ±0.01 it is 0.99998.'),
    },
    {
      title: 'Factor and cancel',
      problem: R`Evaluate \(\lim\limits_{x \to 3} \dfrac{x^{2} - x - 6}{x^{2} - 9}\).`,
      steps: [
        R`Substituting \(x = 3\) gives \(\frac{0}{0}\), so simplify.`,
        R`Factor: \(\dfrac{(x - 3)(x + 2)}{(x - 3)(x + 3)}\).`,
        R`Cancel \((x - 3)\), which is not 0 because \(x \ne 3\) in the limit: \(\dfrac{x + 2}{x + 3}\).`,
        R`Substitute \(x = 3\): \(\dfrac{5}{6}\).`,
      ],
      answer: R`\(\dfrac{5}{6}\)`,
    },
    {
      title: 'Multiply by the conjugate',
      problem: R`Evaluate \(\lim\limits_{x \to 0} \dfrac{\sqrt{x + 9} - 3}{x}\).`,
      steps: [
        R`Substituting gives \(\frac{0}{0}\). Multiply the top and the bottom by the conjugate \(\sqrt{x + 9} + 3\).`,
        R`Numerator: \(\left(\sqrt{x + 9} - 3\right)\left(\sqrt{x + 9} + 3\right) = (x + 9) - 9 = x\).`,
        R`Cancel \(x\): the expression is \(\dfrac{1}{\sqrt{x + 9} + 3}\).`,
        R`Substitute \(x = 0\): \(\dfrac{1}{3 + 3}\).`,
      ],
      answer: R`\(\dfrac{1}{6}\)`,
    },
    {
      title: 'One-sided limits of a piecewise function',
      problem: R`Let \(f(x) = \begin{cases} x + 1, & x < 2 \\ x^{2} - 3, & x \ge 2 \end{cases}\). Find \(\lim\limits_{x \to 2^{-}} f(x)\), \(\lim\limits_{x \to 2^{+}} f(x)\) and \(\lim\limits_{x \to 2} f(x)\).`,
      steps: [
        R`From the left, \(x < 2\), so use \(x + 1\): the limit is \(2 + 1 = 3\).`,
        R`From the right, \(x > 2\), so use \(x^{2} - 3\): the limit is \(4 - 3 = 1\).`,
        R`The one-sided limits are different (\(3 \ne 1\)), so the two-sided limit does not exist. Note that \(f(2) = 1\) plays no part in this.`,
      ],
      answer: R`\(\lim\limits_{x \to 2^{-}} f(x) = 3\), \(\lim\limits_{x \to 2^{+}} f(x) = 1\), and \(\lim\limits_{x \to 2} f(x)\) does not exist.`,
      visual: {
        type: 'plot',
        x: [-1, 4],
        y: [-1, 7],
        step: [1, 1],
        fns: [{ f: (x) => x + 1, domain: [-1, 2], color: 'a' }, { f: (x) => x * x - 3, domain: [2, 4], color: 'a' }],
        points: [{ x: 2, y: 3, open: true }, { x: 2, y: 1 }],
        alt: 'Graph of the piecewise function. The left piece is a line rising to an open circle at (2, 3). The right piece is a parabola starting at a filled dot at (2, 1). The graph jumps at x = 2.',
      },
    },
    {
      title: 'Word problem: salt in a tank',
      word: true,
      problem: R`A tank holds 5000 liters of pure water. Brine containing 30 grams of salt per liter is pumped in at 25 liters per minute. After \(t\) minutes the concentration of salt is \(C(t) = \dfrac{750t}{5000 + 25t} = \dfrac{30t}{200 + t}\) grams per liter. What happens to the concentration in the long run?`,
      steps: [
        R`"In the long run" asks for \(\lim\limits_{t \to \infty} C(t)\).`,
        R`Divide the top and the bottom by \(t\): \(C(t) = \dfrac{30}{\frac{200}{t} + 1}\).`,
        R`As \(t \to \infty\), \(\dfrac{200}{t} \to 0\), so \(C(t) \to \dfrac{30}{0 + 1} = 30\).`,
        R`This makes sense: after a long time the tank is almost entirely brine at 30 g/L. The line \(C = 30\) is a horizontal asymptote.`,
      ],
      answer: 'The concentration approaches 30 grams per liter (and never exceeds it).',
      visual: {
        type: 'plot',
        x: [0, 2000],
        y: [0, 36],
        fns: [{ f: (t) => (30 * t) / (200 + t) }],
        hlines: [{ y: 30 }],
        axisLabels: ['t (min)', 'C (g/L)'],
        alt: 'Graph of the concentration C(t) = 30t/(200 + t): it rises quickly from 0 and then levels off, approaching the dashed horizontal line C = 30 from below.',
      },
    },
  ],

  models: [
    {
      id: 'hole-limit',
      title: 'A limit at a hole: factor and cancel',
      intro: R`The function is \(f(x) = \dfrac{(x - a)(x - b)}{x - a}\), written out. Choose \(a\) and \(b\).`,
      inputs: [
        { name: 'a', label: 'a (x approaches this)', type: 'int', min: -5, max: 5, value: 2 },
        { name: 'b', label: 'b (the other root of the numerator)', type: 'int', min: -6, max: 6, value: -1 },
      ],
      compute({ a, b }) {
        const top = [1, -(a + b), a * b];
        const L = a - b;
        const g = (x) => x - b;
        return {
          problem: R`Evaluate \(${lim(a)} \dfrac{${poly(top)}}{${linear(1, -a)}}\).`,
          steps: [
            R`Substitute \(x = ${a}\): the numerator is \(${subst(top, a)} = 0\) and the denominator is \(0\). The form \(\frac{0}{0}\) means: simplify first.`,
            R`Factor the numerator: \(${poly(top)} = ${factor(a)}${factor(b)}\).`,
            R`Cancel the common factor \(${factor(a)}\), which is not 0 because \(x \ne ${a}\) in a limit. For every \(x \ne ${a}\), \(f(x) = ${linear(1, -b)}\).`,
            R`Substitute into what is left: \(${a} - ${paren(b)} = ${L}\).`,
            R`Check with nearby inputs: \(f(${num(a - 0.01)}) = ${num(L - 0.01)}\) and \(f(${num(a + 0.01)}) = ${num(L + 0.01)}\).`,
          ],
          answer: R`\(${lim(a)} f(x) = ${L}\), even though \(f(${a})\) is not defined.`,
          visual: {
            type: 'plot',
            ...fit(g, a - 4, a + 4, { include: [0] }),
            fns: [{ f: g }],
            points: [{ x: a, y: L, open: true, label: `hole at (${txt(a)}, ${txt(L)})` }],
            alt: `Graph of f: a straight line with an open circle (a hole) at the point (${txt(a)}, ${txt(L)}). The graph approaches height ${txt(L)} from both sides.`,
          },
        };
      },
    },
    {
      id: 'end-behavior',
      title: 'Limit at infinity of a rational function',
      intro: R`The function is \(f(x) = \dfrac{p\,x^{n} + 1}{q\,x^{m} + 1}\). Choose the leading coefficients and the degrees, and see what happens as \(x \to \infty\).`,
      inputs: [
        { name: 'p', label: 'p (leading coefficient on top)', type: 'int', min: -9, max: 9, value: 6 },
        { name: 'n', label: 'n (degree on top)', type: 'int', min: 1, max: 4, value: 2 },
        { name: 'q', label: 'q (leading coefficient on the bottom)', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'm', label: 'm (degree on the bottom)', type: 'int', min: 1, max: 4, value: 2 },
      ],
      compute({ p, n, q: qq, m }) {
        if (p === 0 || qq === 0) return { error: 'A leading coefficient cannot be 0. Choose a nonzero value for p and for q.' };
        const xp = (k) => (k === 1 ? 'x' : `x^{${k}}`);
        const f = (x) => (p * x ** n + 1) / (qq * x ** m + 1);
        const ratio = frac(p, qq);
        const problem = R`Find \(${lim('\\infty')} \dfrac{${terms([[p, xp(n)], [1, '']])}}{${terms([[qq, xp(m)], [1, '']])}}\).`;
        const first = R`The highest power of \(x\) in the denominator is \(${xp(m)}\). Divide every term by it.`;
        const small = R`\frac{1}{${xp(m)}}`;
        let steps;
        let answer;
        let L = null;
        if (n === m) {
          L = ratio.value;
          steps = [first, R`\(f(x) = \dfrac{${p} + ${small}}{${qq} + ${small}}\).`, R`As \(x \to \infty\), \(\dfrac{1}{${xp(m)}} \to 0\).`, R`The degrees are equal, so the limit is the ratio of the leading coefficients: \(\dfrac{${p}}{${qq}} = ${ratio.tex()}\).`];
          answer = R`\(${lim('\\infty')} f(x) = ${ratio.tex()}\). The line \(y = ${ratio.tex()}\) is a horizontal asymptote.`;
        } else if (n < m) {
          L = 0;
          steps = [first, R`\(f(x) = \dfrac{\frac{${p}}{${xp(m - n)}} + ${small}}{${qq} + ${small}}\).`, R`As \(x \to \infty\), every term with \(x\) in its denominator tends to 0.`, R`The numerator tends to \(0\) and the denominator tends to \(${qq}\). The denominator has the higher degree, so it wins.`];
          answer = R`\(${lim('\\infty')} f(x) = 0\). The line \(y = 0\) is a horizontal asymptote.`;
        } else {
          const up = ratio.value > 0;
          steps = [first, R`\(f(x) = \dfrac{${terms([[p, xp(n - m)]])} + ${small}}{${qq} + ${small}}\).`, R`As \(x \to \infty\), the denominator tends to \(${qq}\) but the numerator still contains \(${terms([[p, xp(n - m)]])}\), which is unbounded.`, R`The quotient behaves like \(${terms([[ratio, xp(n - m)]])}\), which tends to \(${up ? '\\infty' : '-\\infty'}\).`];
          answer = R`\(${lim('\\infty')} f(x) = ${up ? '\\infty' : '-\\infty'}\). There is no horizontal asymptote.`;
        }
        return {
          problem,
          steps,
          answer,
          visual: {
            type: 'plot',
            ...fit(f, 1.5, 30, { cap: L == null ? [-40, 40] : [L - 6, L + 6], include: L == null ? [] : [L] }),
            x: [0, 30],
            fns: [{ f, domain: [1.5, 30] }],
            hlines: L == null ? [] : [{ y: L }],
            alt: L == null ? 'Graph of f for positive x: the curve keeps rising or falling without levelling off.' : `Graph of f for positive x: the curve levels off and approaches the dashed horizontal line y = ${txt(round(L, 3))}.`,
          },
        };
      },
    },
    {
      id: 'average-cost',
      title: 'Word problem: average cost in the long run',
      word: true,
      intro: 'A workshop has a fixed daily cost plus a cost for each item. Change the numbers and see what the average cost per item approaches.',
      inputs: [
        { name: 'F', label: 'Fixed cost per day ($)', type: 'int', min: 50, max: 5000, value: 600 },
        { name: 'c', label: 'Cost per item ($)', type: 'int', min: 1, max: 60, value: 4 },
        { name: 'x', label: 'Items made', type: 'int', min: 1, max: 5000, value: 200 },
      ],
      compute({ F, c, x }) {
        const A = (t) => F / t + c;
        const here = round(A(x), 2);
        const xMax = Math.max(4 * x, 40);
        return {
          problem: `A workshop pays ${money(F)} a day in fixed costs plus ${money(c)} for each item it makes. What is the average cost per item when ${txt(x)} items are made, and what does the average cost approach as production grows?`,
          steps: [
            R`Total cost of \(x\) items: \(C(x) = ${terms([[F, ''], [c, 'x']])}\) dollars. Average cost per item: \(A(x) = \dfrac{${terms([[F, ''], [c, 'x']])}}{x}\).`,
            R`With \(x = ${num(x)}\): \(A(${num(x)}) = \dfrac{${num(F + c * x)}}{${num(x)}} ${Number.isInteger((F + c * x) * 100 / x) ? '=' : '\\approx'} ${num(here, { fixed: 2 })}\) dollars per item.`,
            R`For the long run, split the fraction: \(A(x) = \dfrac{${F}}{x} + ${c}\).`,
            R`As \(x \to \infty\), \(\dfrac{${F}}{x} \to 0\): the fixed cost is shared among more and more items.`,
          ],
          answer: R`\(${lim('\\infty')} A(x) = ${c}\). With ${txt(x)} items the average cost is ${money(here)}; in the long run it approaches ${money(c)} per item, from above.`,
          visual: {
            type: 'plot',
            x: [0, xMax],
            y: [0, Math.max(3 * c, c + 6)],
            fns: [{ f: A, domain: [xMax / 400, xMax] }],
            hlines: [{ y: c }],
            points: here <= Math.max(3 * c, c + 6) ? [{ x, y: here, label: `A(${txt(x)}) ≈ ${txt(here)}` }] : [],
            axisLabels: ['x (items)', 'A ($)'],
            alt: `Graph of the average cost A(x) = ${F}/x + ${c}: very high for small x, then falling toward the dashed horizontal line A = ${c}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyDirectSub, easyFromTable, easyFromGraph, easyLimitLaws],
    medium: [mediumFactorCancel, mediumOneSided, mediumInfinity, mediumSinx, mediumParking],
    hard: [hardRationalise, hardCombineFractions, hardInfinite, hardAsymptotes, hardBrine],
    challenge: [challengeSqueeze, challengeFindConstant, challengeTrig, challengeAbs, challengeConjugateInfinity],
  },
};
