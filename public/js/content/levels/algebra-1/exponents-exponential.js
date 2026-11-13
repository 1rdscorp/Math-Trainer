import { R, q, frac, tryFrac, linear, num, txt, money, power, round, person, checkEqual } from '../../lib/index.js';
import { F, fitY, pointText } from './_shared.js';

const m = (tex) => R`\(${tex}\)`;
const asX = (v) => R`\(x = ${num(v)}\)`;

// A monomial with positive exponents only: mono(frac(3, 2), [['x', 2], ['y', -4]]) → "\frac{3x^{2}}{2y^{4}}".
function mono(c, vars) {
  const f = F(c);
  const top = vars.filter(([, e]) => e > 0).map(([s, e]) => power(s, e)).join('');
  const bot = vars.filter(([, e]) => e < 0).map(([s, e]) => power(s, -e)).join('');
  const n = Math.abs(f.n);
  const numTex = (n === 1 && top ? '' : num(n)) + top;
  const denTex = (f.d === 1 ? '' : num(f.d)) + bot;
  return (f.n < 0 ? '-' : '') + (denTex ? R`\frac{${numTex}}{${denTex}}` : numTex);
}
const monoVal = (c, vars, at) => vars.reduce((v, [s, e]) => v * at[s] ** e, F(c).value);
const AT = { x: 1.3, y: 0.7 };
const expTex = (a, b) => (a === 1 ? '' : R`${num(a)} \cdot `) + (Number.isInteger(b) ? `${b}^{x}` : R`\left(${num(b)}\right)^{x}`);

// ───────────── Easy ─────────────

function easyRules(rng) {
  const v = rng.pick(['x', 'a', 'n', 'y']);
  const kind = rng.pick(['product', 'quotient', 'power']);
  const b = rng.int(2, 6);
  const a = kind === 'quotient' ? b + rng.int(1, 6) : rng.intExcept(2, 9, [b]);
  const p = (e) => m(power(v, e));
  const spec = {
    product: {
      tex: R`${power(v, a)} \cdot ${power(v, b)}`, ans: a + b,
      wrong: [{ value: p(a * b), why: 'To multiply powers of the same base, add the exponents. Multiplying the exponents is the rule for a power of a power.' }, { value: m(`2${power(v, a + b)}`), why: 'This is one product of powers, so there is no extra factor of 2.' }, p(a + b + 1), p(Math.abs(a - b))],
      steps: [R`The bases are the same, so add the exponents: \(${power(v, a)} \cdot ${power(v, b)} = ${v}^{${a} + ${b}}\).`, R`That is \(${power(v, a + b)}\): ${a} factors of \(${v}\) times ${b} more factors of \(${v}\).`],
    },
    quotient: {
      tex: R`\frac{${power(v, a)}}{${power(v, b)}}`, ans: a - b,
      wrong: [{ value: p(a + b), why: 'To divide powers of the same base, subtract the exponents.' }, { value: m(R`\frac{1}{${power(v, a - b)}}`), why: 'The larger power is on top, so the factors left over stay on top.' }, p(a * b), p(a - b + 1)],
      steps: [R`The bases are the same, so subtract the exponents: \(${v}^{${a} - ${b}}\).`, R`That is \(${power(v, a - b)}\): ${b} of the ${a} factors on top cancel.`],
    },
    power: {
      tex: R`\left(${power(v, a)}\right)^{${b}}`, ans: a * b,
      wrong: [{ value: p(a + b), why: R`\(\left(${power(v, a)}\right)^{${b}}\) is ${b} copies of \(${power(v, a)}\) multiplied together, so the exponent is \(${a} \cdot ${b}\).` }, { value: m(`${b}${power(v, a)}`), why: 'The outside exponent means repeated multiplication, not multiplying by that number.' }, p(a * b + 1), p(a ** 2)],
      steps: [R`A power of a power: multiply the exponents. \(\left(${power(v, a)}\right)^{${b}} = ${v}^{${a} \cdot ${b}}\).`, R`That is \(${power(v, a * b)}\).`],
    },
  }[kind];
  const orig = { product: (t) => t ** a * t ** b, quotient: (t) => t ** a / t ** b, power: (t) => (t ** a) ** b }[kind];
  return q({
    prompt: R`Simplify: \(\;${spec.tex}\)`,
    correct: p(spec.ans),
    wrong: spec.wrong,
    solution: spec.steps,
    rule: kind === 'power' ? 1 : 0,
    skill: 'laws of exponents',
    check: () => checkEqual(orig(1.3), 1.3 ** spec.ans),
  });
}

function easyZeroNegative(rng) {
  const kind = rng.pick(['zero', 'negative', 'negative', 'fraction']);
  if (kind === 'zero') {
    const b = rng.pick([2, 3, 5, 7, 9, 12, 25, -3, -5, -8]);
    const base = b < 0 ? `(${b})` : `${b}`;
    return q({
      prompt: R`Evaluate: \(\;${base}^{0}\)`,
      correct: frac(1),
      wrong: [{ value: 0, why: 'A power of 0 does not give 0. Any nonzero number to the power 0 is 1.' }, { value: b, why: R`\(${base}^{1}\) is \(${b}\). With an exponent of 0 the value is 1.` }, b < 0 ? -1 : -b],
      solution: [R`Dividing a power by itself gives 1, and the quotient rule gives exponent 0: \(\frac{${base}^{2}}{${base}^{2}} = ${base}^{0}\).`, R`So \(${base}^{0} = 1\). This is true for every nonzero base.`],
      rule: 2,
      skill: 'zero and negative exponents',
      check: () => checkEqual(b ** 0, 1),
    });
  }
  if (kind === 'negative') {
    const b = rng.int(2, 6);
    const k = b <= 3 ? rng.int(1, 4) : rng.int(1, 2);
    const ans = frac(1, b ** k);
    return q({
      prompt: R`Evaluate: \(\;${b}^{-${k}}\)`,
      correct: ans,
      wrong: [
        { value: -(b ** k), why: 'A negative exponent does not make the answer negative. It means the reciprocal of the positive power.' },
        { value: ans.neg(), why: 'The reciprocal of a positive number is still positive.' },
        k > 1 ? frac(1, b * k) : b,
        -b * k,
      ],
      solution: [R`A negative exponent means the reciprocal: \(${b}^{-${k}} = \frac{1}{${b}^{${k}}}\).`, R`\(${b}^{${k}} = ${b ** k}\), so the value is \(${ans.tex()}\).`],
      rule: 2,
      skill: 'zero and negative exponents',
      check: () => checkEqual(b ** -k, ans.value),
    });
  }
  const [p, d] = rng.pick([[2, 3], [3, 4], [2, 5], [3, 5], [1, 2], [1, 3], [3, 2], [4, 3], [5, 2]]);
  const k = rng.int(1, 3);
  const ans = frac(d ** k, p ** k);
  return q({
    prompt: R`Evaluate: \(\;\left(\frac{${p}}{${d}}\right)^{-${k}}\)`,
    correct: ans,
    wrong: [
      { value: ans.inv(), why: 'The negative exponent flips the fraction before the power is applied.' },
      { value: ans.inv().neg(), why: 'A negative exponent means a reciprocal. It does not make the answer negative.' },
      ans.neg(),
      frac(d * k, p * k === d * k ? p * k + 1 : p * k),
    ],
    solution: [R`A negative exponent means the reciprocal, so flip the fraction: \(\left(\frac{${p}}{${d}}\right)^{-${k}} = \left(\frac{${d}}{${p}}\right)^{${k}}\).`, R`Raise the top and the bottom to the power \(${k}\): \(\frac{${d ** k}}{${p ** k}}${ans.tex() === R`\frac{${d ** k}}{${p ** k}}` ? '' : ` = ${ans.tex()}`}\).`],
    rule: 2,
    skill: 'zero and negative exponents',
    check: () => checkEqual((p / d) ** -k, ans.value),
  });
}

function easyIdentifyParts(rng) {
  const a = rng.int(2, 90) * 10;
  const r = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30]);
  const grow = rng.bool();
  const b = round(1 + (grow ? r : -r) / 100, 2);
  const fn = R`\(y = ${a}(${num(b)})^{x}\)`;
  if (rng.bool(0.4)) {
    return q({
      prompt: R`In the exponential function ${fn}, what is the initial value (the value of \(y\) when \(x = 0\))?`,
      correct: a,
      wrong: [{ value: b, why: R`\(${num(b)}\) is the factor \(b\): what \(y\) is multiplied by each time \(x\) goes up by 1.` }, { value: round(a * b, 2), why: R`That is the value when \(x = 1\). When \(x = 0\) the power is \(${num(b)}^{0} = 1\).` }, r, 0],
      solution: [R`Substitute \(x = 0\): \(y = ${a}(${num(b)})^{0} = ${a} \cdot 1\).`, R`The initial value is \(${a}\). In \(y = a \cdot b^{x}\) it is always the number \(a\) in front.`],
      rule: 3,
      skill: 'exponential functions',
      check: () => checkEqual(a * b ** 0, a),
    });
  }
  const say = (up, pct) => `${up ? 'Increases' : 'Decreases'} by ${pct}%`;
  return q({
    prompt: R`In the exponential function ${fn}, how does \(y\) change each time \(x\) increases by 1?`,
    correct: say(grow, r),
    wrong: [
      grow ? { value: say(true, round(b * 100, 0)), why: R`Multiplying by \(${num(b)}\) keeps 100% and adds ${r}% more. The increase is the part above 1.` } : { value: say(false, round(b * 100, 0)), why: R`Multiplying by \(${num(b)}\) leaves ${round(b * 100, 0)}% of the previous value. The decrease is the part that is lost: \(1 - ${num(b)}\).` },
      { value: say(!grow, r), why: grow ? 'A factor greater than 1 makes the values grow.' : 'A factor between 0 and 1 makes the values shrink.' },
      say(grow, r / 100),
      say(grow, r * 10),
    ],
    solution: [
      R`Each step multiplies \(y\) by the factor \(${num(b)}\).`,
      grow ? R`\(${num(b)} = 1 + ${num(r / 100)}\), so each step adds ${r}% of the current value: growth of ${r}%.` : R`\(${num(b)} = 1 - ${num(r / 100)}\), so each step removes ${r}% of the current value: decay of ${r}%.`,
    ],
    rule: 4,
    skill: 'growth and decay rates',
    check: () => checkEqual((b - 1) * 100, grow ? r : -r),
  });
}

// ───────────── Medium ─────────────

function mediumMonomials(rng) {
  const [a, b, c, d] = [rng.int(1, 5), rng.int(1, 5), rng.int(1, 5), rng.int(1, 5)];
  const c1 = rng.intExcept(-6, 6, [-1, 0, 1]);
  const xy = (k, e1, e2) => `${k}${power('x', e1)}${power('y', e2)}`;
  const ch = (k, e1, e2) => m(mono(k, [['x', e1], ['y', e2]]));
  if (rng.bool()) {
    const c2 = rng.intExcept(-6, 6, [-1, 0, 1]);
    return q({
      prompt: R`Simplify: \(\;\left(${xy(c1, a, b)}\right)\left(${xy(c2, c, d)}\right)\)`,
      correct: ch(c1 * c2, a + c, b + d),
      wrong: [
        { value: ch(c1 * c2, a * c, b * d), why: 'When multiplying powers of the same base, add the exponents.' },
        { value: ch(c1 + c2 || 1, a + c, b + d), why: 'The coefficients are multiplied, like any other factors.' },
        ch(c1 * c2, a + c, b * d),
        ch(-c1 * c2, a + c, b + d),
        ch(c1 * c2, a + c + 1, b + d),
        ch(2 * c1 * c2, a + c, b + d),
        ch(c1 * c2, a + c, b + d + 1),
      ],
      solution: [
        R`Multiply the coefficients: \(${c1} \cdot ${c2 < 0 ? `(${c2})` : c2} = ${c1 * c2}\).`,
        R`Add the exponents of \(x\): \(${a} + ${c} = ${a + c}\). Add the exponents of \(y\): \(${b} + ${d} = ${b + d}\).`,
        R`Result: \(${mono(c1 * c2, [['x', a + c], ['y', b + d]])}\).`,
      ],
      rule: 0,
      skill: 'simplifying monomials',
      check: () => checkEqual(monoVal(c1, [['x', a], ['y', b]], AT) * monoVal(c2, [['x', c], ['y', d]], AT), monoVal(c1 * c2, [['x', a + c], ['y', b + d]], AT)),
    });
  }
  const k = Math.abs(c1) > 4 ? Math.sign(c1) * 3 : c1;
  const n = Math.abs(k) === 2 ? rng.int(2, 4) : rng.int(2, 3);
  return q({
    prompt: R`Simplify: \(\;\left(${xy(k, a, b)}\right)^{${n}}\)`,
    correct: ch(k ** n, a * n, b * n),
    wrong: [
      { value: ch(k * n, a * n, b * n), why: R`The coefficient is raised to the power too: \(${k < 0 ? `(${k})` : k}^{${n}} = ${k ** n}\), not \(${k} \cdot ${n}\).` },
      { value: ch(k ** n, a + n, b + n), why: 'For a power of a power, multiply the exponents.' },
      ch(k, a * n, b * n),
      ch(-(k ** n), a * n, b * n),
      ch(k ** n, a * n, b + n),
      ch(2 * k ** n, a * n, b * n),
      ch(k ** n, a * n + 1, b * n + 1),
    ],
    solution: [
      R`The exponent \(${n}\) applies to every factor inside the parentheses.`,
      R`Coefficient: \(${k < 0 ? `(${k})` : k}^{${n}} = ${k ** n}\). Exponents: \(${a} \cdot ${n} = ${a * n}\) for \(x\) and \(${b} \cdot ${n} = ${b * n}\) for \(y\).`,
      R`Result: \(${mono(k ** n, [['x', a * n], ['y', b * n]])}\).`,
    ],
    rule: 1,
    skill: 'simplifying monomials',
    check: () => checkEqual(monoVal(k, [['x', a], ['y', b]], AT) ** n, monoVal(k ** n, [['x', a * n], ['y', b * n]], AT)),
  });
}

function mediumQuotient(rng) {
  const c2 = rng.int(2, 6);
  const c1 = c2 * rng.pick([2, 3, 4, 5, -2, -3]);
  const [a, c] = [rng.int(4, 9), rng.int(1, 3)];
  const [b, d] = [rng.int(1, 4), rng.int(5, 9)];
  const k = c1 / c2;
  const ch = (coef, e1, e2) => m(mono(coef, [['x', e1], ['y', e2]]));
  return q({
    prompt: R`Simplify, using only positive exponents: \(\;\frac{${c1}${power('x', a)}${power('y', b)}}{${c2}${power('x', c)}${power('y', d)}}\)`,
    correct: ch(k, a - c, b - d),
    wrong: [
      { value: ch(k, a - c, d - b), why: R`There are more factors of \(y\) underneath (\(${d}\)) than on top (\(${b}\)), so the leftover \(${power('y', d - b)}\) stays in the denominator.` },
      { value: ch(c1 - c2, a - c, b - d), why: 'Divide the coefficients; do not subtract them.' },
      ch(k, a + c, -(b + d)),
      ch(k, c - a, b - d),
      ch(-k, a - c, b - d),
    ],
    solution: [
      R`Divide the coefficients: \(${c1} \div ${c2} = ${k}\).`,
      R`Subtract the exponents of \(x\): \(${a} - ${c} = ${a - c}\), so \(${power('x', a - c)}\) stays on top.`,
      R`Subtract the exponents of \(y\): \(${b} - ${d} = ${b - d}\). A negative exponent belongs in the denominator: \(y^{${b - d}} = \frac{1}{${power('y', d - b)}}\).`,
      R`Result: \(${mono(k, [['x', a - c], ['y', b - d]])}\).`,
    ],
    rule: 2,
    skill: 'simplifying monomials',
    check: () => checkEqual(monoVal(c1, [['x', a], ['y', b]], AT) / monoVal(c2, [['x', c], ['y', d]], AT), monoVal(k, [['x', a - c], ['y', b - d]], AT)),
  });
}

function mediumGeometric(rng) {
  const half = rng.bool(0.25);
  const r = half ? frac(1, 2) : frac(rng.pick([2, 3, -2, -3, 2, 3]));
  const a1 = half ? rng.pick([64, 96, 160, 192, 320]) : rng.nonzero(-6, 6);
  const n = half ? rng.int(5, 6) : Math.abs(r.n) === 3 ? rng.int(5, 7) : rng.int(6, 9);
  const term = (k) => r.pow(k - 1).mul(a1);
  const an = term(n);
  const shown = [1, 2, 3, 4].map((k) => term(k).tex()).join(', ');
  const rTex = r.n < 0 || !r.isInt() ? R`\left(${r.tex()}\right)` : r.tex();
  const diff = term(2).sub(term(1));
  return q({
    prompt: R`A geometric sequence starts \(${shown}, \dots\) What is the ${n}th term?`,
    correct: an,
    wrong: [
      { value: term(n + 1), why: `The first term has no multiplications yet, so the ${n}th term is reached after ${n - 1} multiplications, not ${n}.` },
      { value: diff.mul(n - 1).add(a1), why: R`The terms are multiplied by \(${r.tex()}\) each time. They do not go up by a fixed amount.` },
      term(n - 1),
      r.mul(a1).mul(n - 1),
    ],
    solution: [
      R`Common ratio: \(${term(2).tex()} \div ${term(1).n < 0 ? `(${term(1).tex()})` : term(1).tex()} = ${r.tex()}\).`,
      R`Use \(a_n = a_1 \cdot r^{\,n - 1}\): \(a_{${n}} = ${a1} \cdot ${rTex}^{${n - 1}}\).`,
      R`\(${rTex}^{${n - 1}} = ${r.pow(n - 1).tex()}\), so \(a_{${n}} = ${an.tex()}\).`,
    ],
    rule: 5,
    skill: 'geometric sequences',
    check: () => {
      let t = frac(a1);
      for (let i = 1; i < n; i++) t = t.mul(r);
      return t.eq(an) ? true : 'nth term does not match repeated multiplication';
    },
  });
}

function mediumStoryGrowth(rng) {
  if (rng.bool()) {
    const P = rng.int(1, 12) * 50;
    const f = rng.pick([2, 2, 3]);
    const t = f === 2 ? rng.int(3, 6) : rng.int(3, 4);
    const [what, unit] = rng.pick([['A colony of bacteria', 'bacteria'], ['A video', 'views'], ['A rumour', 'people who have heard it']]);
    const ans = P * f ** t;
    return q({
      prompt: `${what} starts with ${P} ${unit}, and the number ${f === 2 ? 'doubles' : 'triples'} every hour. How many ${unit} are there after ${t} hours?`,
      correct: ans,
      wrong: [
        { value: P * f * t, why: `${f === 2 ? 'Doubling' : 'Tripling'} every hour multiplies by ${f} again and again: ${t} times in all. That is ${f} to the power ${t}, not ${f} times ${t}.` },
        { value: P * f ** (t - 1), why: `Count the hours: after 1 hour there has already been one multiplication by ${f}.` },
        P + f * t,
        P * t ** f,
      ],
      solution: [
        R`Each hour multiplies the number by \(${f}\), so after \(t\) hours it is \(${P} \cdot ${f}^{t}\).`,
        R`After ${t} hours: \(${P} \cdot ${f}^{${t}} = ${P} \cdot ${f ** t} = ${num(ans)}\).`,
      ],
      rule: 3,
      skill: 'exponential models',
      check: () => {
        let v = P;
        for (let i = 0; i < t; i++) v *= f;
        return checkEqual(v, ans);
      },
    });
  }
  const name = person(rng);
  const P = rng.pick([500, 800, 1000, 2000, 4000, 5000]);
  const r = rng.pick([5, 10, 20]);
  const t = rng.int(2, 3);
  const b = 1 + r / 100;
  if (!frac(P * 100 * (100 + r) ** t, 100 ** t).isInt()) return mediumStoryGrowth(rng); // keep the answer a whole number of cents
  const val = (k) => round(P * b ** k, 2);
  return q({
    prompt: `${name} puts ${money(P)} into an account that grows by ${r}% each year. No money is added or taken out. How much is in the account after ${t} years?`,
    correct: val(t),
    fmt: money,
    wrong: [
      { value: round(P * (1 + (r * t) / 100), 2), why: `That adds ${r}% of the starting amount each year. From the second year on, the ${r}% is worked out on a larger amount.` },
      { value: val(t - 1), why: `That is the amount after ${t - 1} ${t - 1 === 1 ? 'year' : 'years'}. Multiply by ${num(b)} once more.` },
      val(t + 1),
      round(P * (r / 100) * t, 2),
    ],
    solution: [
      R`Growing by ${r}% means multiplying by \(1 + ${num(r / 100)} = ${num(b)}\) each year.`,
      R`After \(t\) years the amount is \(${P}(${num(b)})^{t}\). For \(t = ${t}\): \(${P}(${num(b)})^{${t}} = ${P} \cdot ${num(round(b ** t, 6))}\).`,
      `That is ${money(val(t))}.`,
    ],
    rule: 4,
    skill: 'exponential models',
    check: () => {
      let v = P;
      for (let i = 0; i < t; i++) v += (v * r) / 100;
      return checkEqual(round(v, 2), val(t));
    },
  });
}

// ───────────── Hard ─────────────

function hardNegativeExponents(rng) {
  const ch = (coef, e1, e2) => m(mono(coef, [['x', e1], ['y', e2]]));
  if (rng.bool()) {
    const c = rng.int(2, 5);
    const n = c <= 3 ? rng.int(1, 3) : rng.int(1, 2);
    const a = rng.nonzero(-4, 4);
    const b = rng.intExcept(-4, 4, [0, a]);
    const inside = `${c}${power('x', a)}${power('y', b)}`;
    return q({
      prompt: R`Simplify, using only positive exponents: \(\;\left(${inside}\right)^{-${n}}\)`,
      correct: ch(frac(1, c ** n), -a * n, -b * n),
      wrong: [
        { value: ch(c ** n, -a * n, -b * n), why: R`The exponent \(-${n}\) applies to the coefficient too: \(${c}^{-${n}} = \frac{1}{${c ** n}}\).` },
        { value: ch(frac(1, c ** n), a * n, b * n), why: R`Multiply each exponent by \(-${n}\). That changes its sign.` },
        ch(-(c ** n), -a * n, -b * n),
        ch(frac(1, c ** n), a - n, b - n),
        ch(frac(1, c * n + 1), -a * n, -b * n),
      ],
      solution: [
        R`Apply the exponent \(-${n}\) to every factor: \(${c}^{-${n}} \cdot x^{${a} \cdot (-${n})} \cdot y^{${b} \cdot (-${n})} = ${c}^{-${n}}x^{${-a * n}}y^{${-b * n}}\).`,
        R`Rewrite each negative exponent as a reciprocal. \(${c}^{-${n}} = \frac{1}{${c ** n}}\), and any variable with a negative exponent moves to the denominator.`,
        R`Result: \(${mono(frac(1, c ** n), [['x', -a * n], ['y', -b * n]])}\).`,
      ],
      rule: 2,
      skill: 'negative exponents',
      check: () => checkEqual(monoVal(c, [['x', a], ['y', b]], AT) ** -n, monoVal(frac(1, c ** n), [['x', -a * n], ['y', -b * n]], AT)),
    });
  }
  const a = rng.nonzero(-5, 5);
  const c = rng.intExcept(-5, 5, [0, a]);
  const b = rng.nonzero(-5, 5);
  const d = rng.intExcept(-5, 5, [0, b]);
  if (a > 0 && c > 0 && b > 0 && d > 0) return hardNegativeExponents(rng);
  return q({
    prompt: R`Simplify, using only positive exponents: \(\;\frac{${power('x', a)}${power('y', b)}}{${power('x', c)}${power('y', d)}}\)`,
    correct: ch(1, a - c, b - d),
    wrong: [
      { value: ch(1, a + c, b + d), why: R`To divide powers, subtract the exponents: \(${a} - ${c < 0 ? `(${c})` : c} = ${a - c}\) for \(x\).` },
      { value: ch(1, c - a, d - b), why: 'Subtract the bottom exponent from the top exponent, not the other way round.' },
      ch(1, a - c, d - b),
      ch(1, c - a, b - d),
    ],
    solution: [
      R`Subtract the exponents of \(x\): \(${a} - ${c < 0 ? `(${c})` : c} = ${a - c}\).`,
      R`Subtract the exponents of \(y\): \(${b} - ${d < 0 ? `(${d})` : d} = ${b - d}\).`,
      R`So the expression is \(${power('x', a - c)}${power('y', b - d)}\). Write it with positive exponents only: \(${mono(1, [['x', a - c], ['y', b - d]])}\).`,
    ],
    rule: 2,
    skill: 'negative exponents',
    check: () => checkEqual(monoVal(1, [['x', a], ['y', b]], AT) / monoVal(1, [['x', c], ['y', d]], AT), monoVal(1, [['x', a - c], ['y', b - d]], AT)),
  });
}

function hardModelFromTable(rng) {
  const half = rng.bool(0.25);
  const b = half ? 0.5 : rng.int(2, 5);
  const a = half ? rng.pick([16, 24, 40, 48, 80]) : rng.int(2, 9);
  const ys = [0, 1, 2, 3].map((x) => a * b ** x);
  const form = (tex) => R`\(y = ${tex}\)`;
  const bFrac = half ? frac(1, 2) : b;
  return q({
    prompt: 'Which function fits every row of the table?',
    visual: { type: 'table', headers: [R`\(x\)`, R`\(y\)`], rows: ys.map((y, x) => [x, y]) },
    correct: form(expTex(a, bFrac)),
    wrong: [
      { value: form(linear(ys[1] - ys[0], a)), why: R`That line fits the first two rows only. The \(y\)-values are multiplied by \(${num(bFrac)}\) each step; they do not change by a constant amount.` },
      { value: form(expTex(bFrac, a)), why: R`The value at \(x = 0\) is the number in front, \(${a}\). The base is the common ratio, \(${num(bFrac)}\).` },
      form(R`${a}x^{${half ? 2 : b}}`),
      form(expTex(ys[1], bFrac)),
    ],
    solution: [
      R`Check the ratios of consecutive \(y\)-values: \(${ys[1]} \div ${ys[0]} = ${num(bFrac)}\), \(${ys[2]} \div ${ys[1]} = ${num(bFrac)}\), \(${num(ys[3])} \div ${ys[2]} = ${num(bFrac)}\). A constant ratio means an exponential function with base \(${num(bFrac)}\).`,
      R`The value at \(x = 0\) is \(${a}\), so \(a = ${a}\).`,
      R`The function is \(y = ${expTex(a, bFrac)}\).`,
    ],
    rule: 6,
    skill: 'exponential models',
    check: () => (ys.every((y, x) => Math.abs(a * b ** x - y) < 1e-9) && ys[1] / ys[0] === b ? true : 'model does not reproduce the table'),
  });
}

const ASSETS = [
  { thing: 'car', lo: 8, hi: 30, step: 1000 },
  { thing: 'laptop', lo: 6, hi: 24, step: 100 },
  { thing: 'tractor', lo: 20, hi: 60, step: 1000 },
  { thing: 'camera', lo: 4, hi: 18, step: 100 },
];

function hardStoryDecay(rng) {
  const c = rng.pick(ASSETS);
  const V = rng.int(c.lo, c.hi) * c.step;
  const r = rng.pick([10, 12, 15, 20, 25]);
  const t = rng.int(3, 5);
  const b = 1 - r / 100;
  const exact = frac(V * (100 - r) ** t, 100 ** t); // exact value, so that rounding is never in doubt
  if ((2 * exact.n + exact.d) % (2 * exact.d) === 0) return hardStoryDecay(rng); // exactly half a dollar: skip
  const val = (k) => (k === t ? Math.floor((2 * exact.n + exact.d) / (2 * exact.d)) : Math.round(V * b ** k));
  const straight = V * (1 - (r * t) / 100);
  return q({
    prompt: `A ${c.thing} is bought for ${money(V)} and loses ${r}% of its value each year. To the nearest dollar, what is it worth after ${t} years?`,
    correct: val(t),
    fmt: money,
    wrong: [
      straight > 0 ? { value: Math.round(straight), why: `That takes ${r}% of the original price off every year. Each year's loss is ${r}% of the value at that time, which keeps getting smaller.` } : null,
      { value: Math.round(V * (1 + r / 100) ** t), why: `Losing ${r}% leaves ${100 - r}% of the value, so the factor is ${num(b)}, not ${num(1 + r / 100)}.` },
      val(t - 1),
      val(t + 1),
      Math.round(V * (r / 100) * t),
    ],
    solution: [
      R`Losing ${r}% each year means keeping ${100 - r}%, so multiply by \(1 - ${num(r / 100)} = ${num(b)}\) each year.`,
      R`After \(t\) years the value is \(${V}(${num(b)})^{t}\). For \(t = ${t}\): \(${V}(${num(b)})^{${t}} = ${V} \cdot ${num(round(b ** t, 6))} \approx ${num(round(V * b ** t, 2))}\).`,
      `To the nearest dollar that is ${money(val(t))}.`,
    ],
    rule: 4,
    skill: 'exponential models',
    check: () => {
      let v = V;
      for (let i = 0; i < t; i++) v -= (v * r) / 100;
      return Math.abs(v - val(t)) <= 0.5 + 1e-6 ? true : `value ${v} does not round to ${val(t)}`;
    },
  });
}

// ───────────── Challenge ─────────────

function challengeSolveExponent(rng) {
  const b = rng.pick([2, 3, 5]);
  const kind = rng.pick(['shift', 'multiple', 'bases']);
  const pow = (e) => `${b}^{${e}}`;
  if (kind === 'shift') {
    const k = rng.int(2, b === 2 ? 7 : b === 3 ? 5 : 4);
    const c = rng.nonzero(-4, 4);
    const x = k - c;
    return q({
      prompt: R`Solve for \(x\): \(\;${pow(linear(1, c))} = ${b ** k}\)`,
      correct: x,
      fmt: asX,
      wrong: [
        { value: tryFrac(b ** k, b)?.sub(c), why: R`An exponent cannot be undone by dividing. Write \(${b ** k}\) as a power of \(${b}\) first: \(${b ** k} = ${pow(k)}\).` },
        { value: k + c, why: R`From \(${linear(1, c)} = ${k}\), undo \(${c > 0 ? '+' : '-'} ${Math.abs(c)}\) with the opposite operation.` },
        k,
        x + 1,
      ],
      solution: [R`Write the right side as a power of \(${b}\): \(${b ** k} = ${pow(k)}\).`, R`Now \(${pow(linear(1, c))} = ${pow(k)}\). Equal powers of the same base have equal exponents: \(${linear(1, c)} = ${k}\).`, R`So \(x = ${x}\).`],
      rule: 0,
      skill: 'exponential equations',
      check: () => checkEqual(b ** (x + c), b ** k),
    });
  }
  if (kind === 'multiple') {
    const mult = rng.int(2, 3);
    const x = rng.int(1, b === 2 ? 3 : 2);
    const c = rng.nonzero(-2, 2);
    const k = mult * x + c;
    if (k < 1) return challengeSolveExponent(rng);
    return q({
      prompt: R`Solve for \(x\): \(\;${pow(linear(mult, c))} = ${b ** k}\)`,
      correct: x,
      fmt: asX,
      wrong: [
        { value: k, why: R`\(${k}\) is the whole exponent. Set \(${linear(mult, c)} = ${k}\) and solve for \(x\).` },
        frac(k + c, mult),
        frac(k, mult),
        x + 1,
      ],
      solution: [R`Write the right side as a power of \(${b}\): \(${b ** k} = ${pow(k)}\).`, R`Equal powers of the same base have equal exponents: \(${linear(mult, c)} = ${k}\).`, R`Solve: \(${mult}x = ${k - c}\), so \(x = ${x}\).`],
      rule: 0,
      skill: 'exponential equations',
      check: () => checkEqual(b ** (mult * x + c), b ** k),
    });
  }
  const p = b === 2 ? rng.int(2, 3) : 2;
  const x = rng.int(1, 4);
  const c = (p - 1) * x;
  return q({
    prompt: R`Solve for \(x\): \(\;${b ** p}^{x} = ${pow(linear(1, c))}\)`,
    correct: x,
    fmt: asX,
    wrong: [
      { value: frac(c, p), why: R`After rewriting, the equation is \(${p}x = x + ${c}\). Collect the \(x\)-terms before dividing.` },
      { value: c, why: R`The bases are different, so the exponents cannot be compared yet. Write \(${b ** p}\) as \(${pow(p)}\) first.` },
      x + 1,
      c + p,
    ],
    solution: [R`Write the left side with base \(${b}\): \(${b ** p}^{x} = \left(${pow(p)}\right)^{x} = ${pow(`${p}x`)}\).`, R`Now the bases match, so the exponents are equal: \(${p}x = x + ${c}\).`, p === 2 ? R`Subtract \(x\) from both sides: \(x = ${x}\).` : R`Subtract \(x\) from both sides: \(${p - 1}x = ${c}\), so \(x = ${x}\).`],
    rule: 1,
    skill: 'exponential equations',
    check: () => checkEqual((b ** p) ** x, b ** (x + c)),
  });
}

function challengeLinearVsExp(rng) {
  const a = rng.int(2, 10) * 50;
  const d = rng.int(2, 8) * 10;
  const b = rng.pick([1, 2, 5, 10]);
  const f = rng.pick([2, 2, 3]);
  const A = (n) => a + d * n;
  const B = (n) => b * f ** n;
  let n = 1;
  while (B(n) <= A(n)) n++;
  const name = person(rng);
  return q({
    prompt: `${name} compares two savings plans. Plan A starts with ${money(a)} and adds ${money(d)} every week. Plan B starts with ${money(b)} and ${f === 2 ? 'doubles' : 'triples'} every week. After how many weeks is Plan B first worth more than Plan A?`,
    correct: n,
    fmt: (v) => R`\(${num(v)}\) ${v === 1 ? 'week' : 'weeks'}`,
    wrong: [
      { value: n - 1, why: `After ${n - 1} weeks Plan A has ${money(A(n - 1))} and Plan B has only ${money(B(n - 1))}.` },
      { value: n + 1, why: `Plan B is already ahead one week earlier: after ${n} weeks it has ${money(B(n))} and Plan A has ${money(A(n))}.` },
      n + 2,
      n - 2,
    ],
    solution: [
      R`Plan A is linear: \(A = ${a} + ${d}n\). Plan B is exponential: \(B = ${b === 1 ? '' : R`${b} \cdot `}${f}^{n}\).`,
      `Compare week by week. After ${n - 1} weeks: A has ${money(A(n - 1))}, B has ${money(B(n - 1))}. After ${n} weeks: A has ${money(A(n))}, B has ${money(B(n))}.`,
      `Plan B first passes Plan A after ${n} weeks. Repeated multiplying always overtakes repeated adding in the end.`,
    ],
    rule: 6,
    skill: 'linear versus exponential',
    check: () => (B(n) > A(n) && Array.from({ length: n }, (_, k) => k).every((k) => B(k) <= A(k)) ? true : 'n is not the first week where B is ahead'),
  });
}

function challengeTwoPoints(rng) {
  const a = rng.int(1, 6);
  const b = rng.int(2, 5);
  const x1 = rng.int(1, 2);
  const x2 = x1 + 2;
  const [y1, y2] = [a * b ** x1, a * b ** x2];
  const form = (tex) => R`\(y = ${tex}\)`;
  const slope = (y2 - y1) / 2;
  return q({
    prompt: R`An exponential function \(y = a \cdot b^{x}\) with \(b > 0\) passes through \((${x1}, ${num(y1)})\) and \((${x2}, ${num(y2)})\). Which function is it?`,
    correct: form(expTex(a, b)),
    wrong: [
      { value: form(expTex(a, b * b)), why: R`From \(x = ${x1}\) to \(x = ${x2}\) is two steps, so the ratio \(${num(y2)} \div ${num(y1)} = ${b * b}\) is \(b^{2}\). Then \(b = ${b}\).` },
      { value: form(expTex(y1, b)), why: R`\(${num(y1)}\) is the value at \(x = ${x1}\). The number in front is the value at \(x = 0\): divide by \(${b}\) for each step back.` },
      form(linear(slope, y1 - slope * x1)),
      form(expTex(b, a === 1 ? b + 1 : a)),
      form(expTex(a + 1, b)),
    ],
    solution: [
      R`Divide the two \(y\)-values. The \(a\) cancels: \(\frac{a \cdot b^{${x2}}}{a \cdot b^{${x1}}} = b^{2} = \frac{${num(y2)}}{${num(y1)}} = ${b * b}\), so \(b = ${b}\).`,
      R`Use the first point to find \(a\): \(a \cdot ${b}^{${x1}} = ${num(y1)}\), so \(a = ${num(y1)} \div ${b ** x1} = ${a}\).`,
      R`The function is \(y = ${expTex(a, b)}\). Check the second point: \(${a === 1 ? '' : R`${a} \cdot `}${b}^{${x2}} = ${num(y2)}\). ✓`,
    ],
    rule: 3,
    skill: 'exponential models',
    check: () => (a * b ** x1 === y1 && a * b ** x2 === y2 ? true : 'curve misses a point'),
  });
}

// ───────────── Interactive models ─────────────

function powerModel({ p, n, op }) {
  const pw = (e) => `x^{${e}}`;
  const k = op === 'times' ? p + n : op === 'divide' ? p - n : p * n;
  const problem = { times: R`${pw(p)} \cdot ${pw(n)}`, divide: R`\frac{${pw(p)}}{${pw(n)}}`, power: R`\left(${pw(p)}\right)^{${n}}` }[op];
  const first = {
    times: R`The bases are the same and the powers are multiplied, so add the exponents: \(${p} + ${n < 0 ? `(${n})` : n} = ${k}\).`,
    divide: R`The bases are the same and the powers are divided, so subtract the exponents: \(${p} - ${n < 0 ? `(${n})` : n} = ${k}\).`,
    power: R`A power is raised to a power, so multiply the exponents: \(${p} \cdot ${n < 0 ? `(${n})` : n} = ${k}\).`,
  }[op];
  const steps = [first, R`So \(${problem} = ${pw(k)}\).`];
  if (k < 0) steps.push(R`A negative exponent means a reciprocal: \(${pw(k)} = \frac{1}{${power('x', -k)}}\).`);
  if (k === 0) steps.push(R`Any nonzero number to the power 0 is 1, so \(x^{0} = 1\) (for \(x \ne 0\)).`);
  if (Math.abs(k) <= 20) {
    const two = (e) => frac(2).pow(e);
    const lhs = op === 'times' ? two(p).mul(two(n)) : op === 'divide' ? two(p).div(two(n)) : two(p).pow(n);
    steps.push(R`Check with \(x = 2\): the original expression is \(${num(lhs)}\), and \(2^{${k}} = ${num(two(k))}\). ✓`);
  }
  return { problem: R`Simplify \(${problem}\).`, steps, answer: m(k > 1 ? power('x', k) : k === 1 ? 'x' : k === 0 ? '1' : R`\frac{1}{${power('x', -k)}}`) };
}

function growthModel({ P, r, t }) {
  const b = round(1 + r / 100, 2);
  const f = (x) => P * b ** x;
  const final = f(t);
  const grows = r > 0;
  const rows = [0, 1, 2, 3].filter((k) => k <= t).map((k) => [k, money(round(f(k), 2))]);
  const steps = [
    r === 0 ? 'A change of 0% means the amount is multiplied by 1 each year: it stays the same.' : grows ? R`Growing by ${r}% means multiplying by \(1 + ${num(r / 100)} = ${num(b)}\) each year.` : R`Losing ${-r}% means keeping ${100 + r}%, so multiply by \(1 - ${num(-r / 100)} = ${num(b)}\) each year.`,
    R`Start with \(${num(P)}\) and multiply by \(${num(b)}\) once for each year: after \(t\) years the amount is \(${num(P)}(${num(b)})^{t}\).`,
    R`For \(t = ${t}\): \(${num(P)}(${num(b)})^{${t}} \approx ${num(round(final, 2), { commas: true })}\).`,
  ];
  const hi = Math.max(t, 5);
  return {
    problem: grows || r === 0 ? `A savings account holds ${money(P)} and grows by ${r}% each year. How much is in it after ${t} ${t === 1 ? 'year' : 'years'}?` : `A machine is worth ${money(P)} and loses ${-r}% of its value each year. What is it worth after ${t} ${t === 1 ? 'year' : 'years'}?`,
    steps,
    answer: `About ${money(round(final, 2))}`,
    visual: [
      { type: 'plot', x: [0, hi], y: fitY(f, 0, hi), axisLabels: ['years', 'amount'], fns: [{ f }], points: [{ x: t, y: final, label: `(${t}, ${txt(round(final, 0))})` }], alt: `Graph of the amount against time: a curve that ${grows ? 'rises more and more steeply' : r < 0 ? 'falls quickly at first and then levels off' : 'stays level'}, passing through ${pointText(t, round(final, 0))}.` },
      { type: 'table', headers: ['Year', 'Amount'], rows, caption: 'The first few years' },
    ],
  };
}

export default {
  id: 'exponents-exponential',
  title: 'Exponent Rules & Exponential Functions',
  summary: 'Simplify expressions with integer exponents, and model growth and decay with exponential functions and geometric sequences.',
  standards: ['CCSS A-SSE.B.3', 'CCSS F-LE.A.1', 'CCSS F-LE.A.2', 'CCSS F-IF.C.8', 'CCSS F-BF.A.2'],

  explain: {
    intro: R`An exponent counts repeated multiplication: \(x^{4}\) means \(x \cdot x \cdot x \cdot x\). Every exponent rule comes from counting factors. When the variable itself is the exponent, as in \(y = 3 \cdot 2^{x}\), you get an exponential function: a quantity that is multiplied by the same number at every step.`,
    rules: [
      {
        title: 'Product and quotient rules',
        text: R`For the same base: to multiply powers, add the exponents; to divide powers, subtract them. \(x^{m} \cdot x^{n} = x^{m + n}\) and \(\dfrac{x^{m}}{x^{n}} = x^{m - n}\).`,
        example: R`\(x^{3} \cdot x^{4} = x^{7}\) (3 factors and 4 more). \(\frac{x^{6}}{x^{2}} = x^{4}\) (2 of the 6 factors cancel).`,
      },
      {
        title: 'Power rules',
        text: R`To raise a power to a power, multiply the exponents: \(\left(x^{m}\right)^{n} = x^{mn}\). An exponent outside parentheses applies to every factor inside: \((xy)^{n} = x^{n}y^{n}\) and \(\left(\frac{x}{y}\right)^{n} = \frac{x^{n}}{y^{n}}\).`,
        example: R`\(\left(2x^{3}\right)^{4} = 2^{4}x^{12} = 16x^{12}\).`,
      },
      {
        title: 'Zero and negative exponents',
        text: R`Any nonzero number to the power 0 is 1. A negative exponent means a reciprocal: \(x^{-n} = \dfrac{1}{x^{n}}\). It does not make the value negative.`,
        example: R`\(5^{0} = 1\), \(2^{-3} = \frac{1}{8}\), and \(\frac{x^{2}}{x^{5}} = x^{-3} = \frac{1}{x^{3}}\).`,
      },
      {
        title: 'Exponential functions',
        text: R`In \(y = a \cdot b^{x}\), the number \(a\) is the initial value (the value at \(x = 0\)) and \(b\) is the factor \(y\) is multiplied by each time \(x\) goes up by 1. If \(b > 1\) the function grows; if \(0 < b < 1\) it decays.`,
        example: R`\(y = 5 \cdot 3^{x}\) gives \(5, 15, 45, 135, \dots\) for \(x = 0, 1, 2, 3\).`,
      },
      {
        title: 'Percent growth and decay',
        text: R`Growing by a rate \(r\) each step means multiplying by \(1 + r\). Shrinking by a rate \(r\) means multiplying by \(1 - r\). Write the percent as a decimal first.`,
        example: R`8% growth: factor \(1.08\). 15% decay: factor \(0.85\). $24,000 losing 15% a year for 3 years: \(24000(0.85)^{3} \approx 14739\).`,
      },
      {
        title: 'Geometric sequences',
        text: R`A geometric sequence multiplies by the same number, the common ratio \(r\), at every step. Its \(n\)th term is \(a_n = a_1 \cdot r^{\,n - 1}\). It is an exponential function whose inputs are the term numbers.`,
        example: R`\(3, 6, 12, 24, \dots\) has \(r = 2\), so \(a_n = 3 \cdot 2^{\,n - 1}\) and \(a_{6} = 3 \cdot 32 = 96\).`,
      },
      {
        title: 'Linear or exponential?',
        text: R`Look at equal steps in \(x\). If \(y\) changes by a constant difference, the pattern is linear. If \(y\) changes by a constant ratio, it is exponential. An exponential growth function always overtakes a linear one eventually.`,
        example: R`\(2, 5, 8, 11\) adds 3 each time: linear. \(2, 6, 18, 54\) multiplies by 3 each time: exponential.`,
      },
    ],
    vocab: [
      { term: 'base and exponent', def: R`In \(x^{5}\), the base is \(x\) and the exponent is 5: the number of times the base is used as a factor.` },
      { term: 'growth factor', def: R`The number \(b\) in \(y = a \cdot b^{x}\): what the output is multiplied by at each step.` },
      { term: 'growth or decay rate', def: 'The percent change per step. A factor of 1.08 is a growth rate of 8%; a factor of 0.85 is a decay rate of 15%.' },
      { term: 'common ratio', def: 'The fixed number each term of a geometric sequence is multiplied by to get the next term.' },
      { term: 'initial value', def: R`The output when the input is 0. In \(y = a \cdot b^{x}\) it is \(a\).` },
    ],
    mistakes: [
      R`Multiplying exponents when the rule says add: \(x^{3} \cdot x^{4}\) is \(x^{7}\), not \(x^{12}\).`,
      R`Treating a negative exponent as a negative number: \(2^{-3}\) is \(\frac{1}{8}\), not \(-8\).`,
      R`Forgetting the coefficient in a power: \(\left(3x^{2}\right)^{2}\) is \(9x^{4}\), not \(3x^{4}\).`,
      R`Using the percent itself as the factor. A 15% loss means multiplying by 0.85, not by 0.15.`,
      R`Treating repeated percent change as adding the same amount each time. Each step's change is worked out on the new value.`,
    ],
    visual: {
      type: 'plot', x: [0, 5], y: [0, 34],
      fns: [{ f: (x) => 2 ** x, label: 'y = 2ˣ', labelAt: 4.3 }, { f: (x) => 3 * x + 1, color: 'b', label: 'y = 3x + 1', labelAt: 1.6 }],
      points: [{ x: 3, y: 8 }, { x: 3, y: 10, color: 'b' }, { x: 4, y: 16 }, { x: 4, y: 13, color: 'b' }],
      alt: 'The line y = 3x + 1 and the curve y = 2ˣ. The line is higher until x is between 3 and 4; after that the exponential curve is higher and climbing faster.',
    },
  },

  examples: [
    {
      title: 'Simplifying with several rules',
      problem: R`Simplify \(\dfrac{\left(3x^{2}y\right)^{3}}{9x^{4}y^{5}}\), using only positive exponents.`,
      steps: [
        R`Power rule on the top: every factor is cubed. \(\left(3x^{2}y\right)^{3} = 27x^{6}y^{3}\).`,
        R`Divide the coefficients: \(27 \div 9 = 3\).`,
        R`Subtract exponents: \(x^{6 - 4} = x^{2}\) and \(y^{3 - 5} = y^{-2}\).`,
        R`Rewrite the negative exponent as a reciprocal: \(3x^{2}y^{-2} = \frac{3x^{2}}{y^{2}}\).`,
      ],
      answer: R`\(\frac{3x^{2}}{y^{2}}\)`,
    },
    {
      title: 'Zero and negative exponents with numbers',
      problem: R`Evaluate \(2^{-3} \cdot 4^{2} \cdot 7^{0}\).`,
      steps: [
        R`\(2^{-3} = \frac{1}{2^{3}} = \frac{1}{8}\).`,
        R`\(4^{2} = 16\) and \(7^{0} = 1\).`,
        R`Multiply: \(\frac{1}{8} \cdot 16 \cdot 1 = 2\).`,
      ],
      answer: '2',
    },
    {
      title: 'An exponential function from a table',
      problem: 'Write a function for the table.',
      visual: { type: 'table', headers: [R`\(x\)`, R`\(y\)`], rows: [[0, 5], [1, 15], [2, 45], [3, 135]] },
      steps: [
        R`Differences: \(10, 30, 90\). They are not constant, so the pattern is not linear.`,
        R`Ratios: \(15 \div 5 = 3\), \(45 \div 15 = 3\), \(135 \div 45 = 3\). A constant ratio means exponential, with \(b = 3\).`,
        R`The value at \(x = 0\) is 5, so \(a = 5\).`,
        R`Check \(x = 3\): \(5 \cdot 3^{3} = 5 \cdot 27 = 135\). ✓`,
      ],
      answer: R`\(y = 5 \cdot 3^{x}\)`,
    },
    {
      title: 'Word problem: a car losing value',
      word: true,
      problem: 'A car is bought for $24,000 and loses 15% of its value every year. What is it worth after 3 years?',
      steps: [
        R`Each year the car keeps 85% of its value, so the value is multiplied by \(1 - 0.15 = 0.85\) each year.`,
        R`After \(t\) years the value is \(24000(0.85)^{t}\).`,
        R`For \(t = 3\): \(24000(0.85)^{3} = 24000 \cdot 0.614125 = 14739\).`,
        'Taking 15% of $24,000 off three times would give $13,200, which is too low: the yearly loss shrinks as the value shrinks.',
      ],
      answer: '$14,739',
    },
  ],

  models: [
    {
      id: 'power-rules',
      title: 'Combine two powers of x',
      intro: 'Choose two exponents and what to do with them. Negative exponents are allowed.',
      inputs: [
        { name: 'p', label: 'First exponent', type: 'int', min: -9, max: 9, value: 5 },
        { name: 'op', label: 'Operation', type: 'select', value: 'times', options: [{ value: 'times', label: 'multiply the powers' }, { value: 'divide', label: 'divide the first by the second' }, { value: 'power', label: 'raise the first power to the second exponent' }] },
        { name: 'n', label: 'Second exponent', type: 'int', min: -9, max: 9, value: -2 },
      ],
      compute: powerModel,
    },
    {
      id: 'growth-decay',
      title: 'Word problem: percent growth and decay',
      word: true,
      intro: 'Change the starting amount, the yearly percent change (negative for a loss) and the number of years.',
      inputs: [
        { name: 'P', label: 'Starting amount (dollars)', type: 'int', min: 1, max: 10000, value: 2000 },
        { name: 'r', label: 'Percent change each year', type: 'int', min: -90, max: 50, value: 5 },
        { name: 't', label: 'Number of years', type: 'int', min: 0, max: 20, value: 3 },
      ],
      compute: growthModel,
    },
  ],

  quiz: {
    easy: [easyRules, easyZeroNegative, easyIdentifyParts],
    medium: [mediumMonomials, mediumQuotient, mediumGeometric, mediumStoryGrowth],
    hard: [hardNegativeExponents, hardModelFromTable, hardStoryDecay],
    challenge: [challengeSolveExponent, challengeLinearVsExp, challengeTwoPoints],
  },
};
