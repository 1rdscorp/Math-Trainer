import { R, q, num, frac, gcd, linear, terms, paren, signed, money, divisors, person, checkSame } from '../../lib/index.js';

const m = (tex) => R`\(${tex}\)`;
const same = (f, g) => () => checkSame(f, g, [-2.5, -1, 0.5, 2, 3.7]);

// ───────────── Easy (Grade 6): exponents, order of operations, words to symbols, substituting ─────────────

const POWERS = [[2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [3, 2], [3, 3], [3, 4], [4, 2], [4, 3], [5, 2], [5, 3], [6, 2], [6, 3], [7, 2], [8, 2], [9, 2], [10, 2], [10, 3], [10, 4], [10, 5], [11, 2], [12, 2], [1, 6], [3, 5], [5, 4]];

function easyExponent(rng) {
  const [a, n] = rng.pick(POWERS);
  const long = Array(n).fill(a).join(R` \times `);
  if (rng.bool()) {
    return q({
      prompt: R`What is the value of \(${a}^{${n}}\)?`,
      correct: a ** n,
      wrong: [
        a * n !== a ** n ? { value: a * n, why: R`The exponent tells how many times to use \(${a}\) as a factor. It is not multiplied by \(${a}\).` } : null,
        n ** a !== a ** n ? { value: n ** a, why: R`The base is \(${a}\) and the exponent is \(${n}\): multiply ${n} copies of \(${a}\), not ${a} copies of \(${n}\).` } : null,
        a ** (n + 1),
        a + n,
        a ** n + a,
      ],
      solution: [R`\(${a}^{${n}}\) means ${n} copies of \(${a}\) multiplied together: \(${long}\).`, R`\(${long} = ${num(a ** n)}\).`],
      rule: 0,
      skill: 'exponents',
      check: () => (Array(n).fill(a).reduce((p, f) => p * f, 1) === a ** n ? true : 'power is wrong'),
    });
  }
  return q({
    prompt: R`Which expression is equal to \(${long}\)?`,
    correct: m(`${a}^{${n}}`),
    wrong: [
      a !== n ? { value: m(`${n}^{${a}}`), why: R`The repeated factor, \(${a}\), is the base. The number of factors, \(${n}\), is the exponent.` } : null,
      { value: m(R`${a} \times ${n}`), why: R`\(${a} \times ${n}\) means ${n} copies of \(${a}\) **added**. Here ${n} copies of \(${a}\) are **multiplied**.` },
      m(`${a}^{${n + 1}}`),
      m(`${a}^{${n - 1}}`),
    ],
    solution: [R`Count the factors: \(${a}\) is used ${n} times.`, R`Write the repeated factor as the base and the count as the exponent: \(${a}^{${n}}\).`],
    rule: 0,
    skill: 'exponents',
  });
}

function easyOrderOps(rng) {
  const kind = rng.pick(['addTimes', 'subDivide', 'parens', 'twoProducts']);
  const a = rng.int(2, 12);
  const b = rng.int(2, 9);
  const c = rng.int(2, 9);
  if (kind === 'addTimes') {
    const ans = a + b * c;
    return q({
      prompt: R`Evaluate \(${a} + ${b} \times ${c}\).`,
      correct: ans,
      wrong: [{ value: (a + b) * c, why: 'Multiply before you add, even though the addition is written first.' }, a * b + c, ans + c, ans - 1],
      solution: [R`Multiply first: \(${b} \times ${c} = ${b * c}\).`, R`Then add: \(${a} + ${b * c} = ${ans}\).`],
      rule: 1,
      skill: 'order of operations',
      check: () => ((ans - a) / b === c ? true : 'value is wrong'),
    });
  }
  if (kind === 'subDivide') {
    const k = rng.int(2, 9);
    const start = k + rng.int(3, 20);
    const ans = start - k;
    const ltr = (start - b * k) / b;
    return q({
      prompt: R`Evaluate \(${start} - ${b * k} \div ${b}\).`,
      correct: ans,
      wrong: [Number.isInteger(ltr) && ltr >= 0 ? { value: ltr, why: 'Divide before you subtract, even though the subtraction is written first.' } : null, start - b * k > 0 ? { value: start - b * k, why: R`\(${b * k}\) has to be divided by \(${b}\) before it is subtracted.` } : null, ans + 2, ans - 1, ans + b],
      solution: [R`Divide first: \(${b * k} \div ${b} = ${k}\).`, R`Then subtract: \(${start} - ${k} = ${ans}\).`],
      rule: 1,
      skill: 'order of operations',
      check: () => ((start - ans) * b === b * k ? true : 'value is wrong'),
    });
  }
  if (kind === 'parens') {
    const ans = (a + b) * c;
    return q({
      prompt: R`Evaluate \((${a} + ${b}) \times ${c}\).`,
      correct: ans,
      wrong: [{ value: a + b * c, why: 'Work out what is inside the parentheses first.' }, a * c + b, ans + c, ans - c],
      solution: [R`Parentheses first: \(${a} + ${b} = ${a + b}\).`, R`Then multiply: \(${a + b} \times ${c} = ${ans}\).`],
      rule: 1,
      skill: 'order of operations',
      check: () => (ans / c - b === a ? true : 'value is wrong'),
    });
  }
  const p = rng.int(4, 9);
  const r = rng.int(3, 9);
  let d;
  let e;
  do {
    d = rng.int(2, 6);
    e = rng.int(2, 6);
  } while (d * e >= p * r);
  const ans = p * r - d * e;
  return q({
    prompt: R`Evaluate \(${p} \times ${r} - ${d} \times ${e}\).`,
    correct: ans,
    wrong: [{ value: (p * r - d) * e, why: 'Do both multiplications before the subtraction. Working strictly left to right gives the wrong value.' }, r > d ? p * (r - d) * e : null, ans + d, ans + e, ans + 1],
    solution: [R`Do both multiplications first: \(${p} \times ${r} = ${p * r}\) and \(${d} \times ${e} = ${d * e}\).`, R`Then subtract: \(${p * r} - ${d * e} = ${ans}\).`],
    rule: 1,
    skill: 'order of operations',
    check: () => (ans + d * e === p * r ? true : 'value is wrong'),
  });
}

const PHRASES = [
  { text: (k, v) => `${k} more than ${v}`, right: (k, v) => `${v} + ${k}`, wrong: (k, v) => [`${k}${v}`, `${v} - ${k}`, `${k} - ${v}`], say: (k, v) => `"More than" adds: start with ${v} and add ${k}.` },
  { text: (k, v) => `${k} less than ${v}`, right: (k, v) => `${v} - ${k}`, wrong: (k, v) => [{ value: `${k} - ${v}`, why: `"${k} less than ${v}" starts with ${v} and takes ${k} away, so ${v} comes first.` }, `${v} + ${k}`, `${k}${v}`], say: (k, v) => `Start with ${v} and take away ${k}. The order matters in subtraction.` },
  { text: (k, v) => `the product of ${k} and ${v}`, right: (k, v) => `${k}${v}`, wrong: (k, v) => [`${v} + ${k}`, `${v}^{${k}}`, R`\frac{${v}}{${k}}`], say: (k, v) => `A product is the result of multiplying. A number next to a letter means multiply.` },
  { text: (k, v) => `${v} divided by ${k}`, right: (k, v) => R`\frac{${v}}{${k}}`, wrong: (k, v) => [{ value: R`\frac{${k}}{${v}}`, why: `${v} is being divided, so ${v} goes on top.` }, `${k}${v}`, `${v} - ${k}`], say: (k, v) => `The amount being divided, ${v}, goes on top of the fraction bar.` },
  { text: (k, v, j) => `${k} times the sum of ${v} and ${j}`, right: (k, v, j) => `${k}(${v} + ${j})`, wrong: (k, v, j) => [{ value: `${k}${v} + ${j}`, why: `The whole sum is multiplied by ${k}, so the sum needs parentheses.` }, `${k} + ${v} + ${j}`, `${v}(${k} + ${j})`], say: (k, v, j) => `Find the sum first, so put it in parentheses. Then multiply by ${k}.` },
  { text: (k, v) => `twice ${v}, decreased by ${k}`, right: (k, v) => `2${v} - ${k}`, wrong: (k, v) => [`2(${v} - ${k})`, `${k} - 2${v}`, `${v}^{2} - ${k}`], say: (k, v) => `"Twice ${v}" is 2 times ${v}. "Decreased by ${k}" subtracts ${k} from that.` },
  { text: (k, v) => `${v} squared, plus ${k}`, right: (k, v) => `${v}^{2} + ${k}`, wrong: (k, v) => [{ value: `2${v} + ${k}`, why: `"Squared" means multiplied by itself: ${v} times ${v}. It does not mean times 2.` }, `(${v} + ${k})^{2}`, `${v} + ${k}^{2}`], say: (k, v) => `"${v} squared" is ${v} times ${v}, written with an exponent of 2. Then add ${k}.` },
  { text: (k, v) => `${k} decreased by ${v}`, right: (k, v) => `${k} - ${v}`, wrong: (k, v) => [{ value: `${v} - ${k}`, why: `Start with ${k} and take ${v} away, so ${k} comes first.` }, `${k} + ${v}`, `${k}${v}`], say: (k, v) => `Start with ${k} and make it smaller by ${v}.` },
  { text: (k, v, j) => `the sum of ${v} and ${k}, divided by ${j}`, right: (k, v, j) => R`\frac{${v} + ${k}}{${j}}`, wrong: (k, v, j) => [{ value: R`${v} + \frac{${k}}{${j}}`, why: `The whole sum is divided by ${j}, not just the ${k}.` }, R`\frac{${j}}{${v} + ${k}}`, `${j}(${v} + ${k})`], say: (k, v, j) => `The whole sum goes on top of the fraction bar, and ${j} goes underneath.` },
  { text: (k, v, j) => `${j} more than the product of ${k} and ${v}`, right: (k, v, j) => `${k}${v} + ${j}`, wrong: (k, v, j) => [{ value: `${k}(${v} + ${j})`, why: `Only ${k} and ${v} are multiplied. Then ${j} is added to that product.` }, `${k + j}${v}`, `${k} + ${v} + ${j}`], say: (k, v, j) => `Multiply ${k} and ${v} first. Then add ${j} to the product.` },
];

function easyWriteExpression(rng) {
  const ph = rng.pick(PHRASES);
  const k = rng.int(2, 12);
  const j = rng.intExcept(2, 12, [k]);
  const v = rng.pick(['x', 'n', 'y', 't', 'w', 'p']);
  return q({
    prompt: `Which expression means "${ph.text(k, v, j)}"?`,
    correct: m(ph.right(k, v, j)),
    wrong: ph.wrong(k, v, j).map((w) => (typeof w === 'string' ? m(w) : { value: m(w.value), why: w.why })),
    solution: [ph.say(k, v, j), `The expression is ${m(ph.right(k, v, j))}.`],
    rule: 2,
    skill: 'writing expressions',
  });
}

function easyEvaluate(rng) {
  const kind = rng.pick(['linear', 'square', 'paren', 'divide']);
  const a = rng.int(2, 9);
  const b = rng.int(1, 12);
  const v = rng.int(2, 9);
  if (kind === 'linear') {
    const ans = a * v + b;
    return q({
      prompt: R`Evaluate \(${a}x + ${b}\) when \(x = ${v}\).`,
      correct: ans,
      wrong: [{ value: Number(`${a}${v}`) + b, why: R`\(${a}x\) means \(${a}\) times \(x\). It does not mean the digits \(${a}\) and \(${v}\) written side by side.` }, { value: a + v + b, why: R`\(${a}x\) means \(${a} \times x\), so multiply \(${a}\) by \(${v}\).` }, a * (v + b), ans + a],
      solution: [R`Replace \(x\) with \(${v}\): \(${a}(${v}) + ${b}\).`, R`Multiply first: \(${a} \times ${v} = ${a * v}\).`, R`Add: \(${a * v} + ${b} = ${ans}\).`],
      rule: 3,
      skill: 'evaluating expressions',
      check: () => ((ans - b) / a === v ? true : 'value is wrong'),
    });
  }
  if (kind === 'square') {
    const ans = v * v + b;
    return q({
      prompt: R`Evaluate \(x^{2} + ${b}\) when \(x = ${v}\).`,
      correct: ans,
      wrong: [{ value: 2 * v + b, why: R`\(x^{2}\) means \(x \times x\), not \(x \times 2\).` }, { value: (v + b) ** 2, why: 'Only x is squared. Square first, then add.' }, v * v, ans + v],
      solution: [R`Replace \(x\) with \(${v}\): \(${v}^{2} + ${b}\).`, R`Exponent first: \(${v}^{2} = ${v} \times ${v} = ${v * v}\).`, R`Add: \(${v * v} + ${b} = ${ans}\).`],
      rule: 3,
      skill: 'evaluating expressions',
      check: () => (Math.sqrt(ans - b) === v ? true : 'value is wrong'),
    });
  }
  if (kind === 'paren') {
    const ans = a * (v + b);
    return q({
      prompt: R`Evaluate \(${a}(x + ${b})\) when \(x = ${v}\).`,
      correct: ans,
      wrong: [{ value: a * v + b, why: R`The \(${a}\) multiplies the whole parentheses. Add inside the parentheses first.` }, a + v + b, ans + a, a * v * b !== ans ? a * v * b : null],
      solution: [R`Replace \(x\) with \(${v}\): \(${a}(${v} + ${b})\).`, R`Parentheses first: \(${v} + ${b} = ${v + b}\).`, R`Multiply: \(${a} \times ${v + b} = ${ans}\).`],
      rule: 3,
      skill: 'evaluating expressions',
      check: () => (ans / a - b === v ? true : 'value is wrong'),
    });
  }
  const k = rng.int(2, 9);
  const ans = k + b;
  return q({
    prompt: R`Evaluate \(\frac{x}{${a}} + ${b}\) when \(x = ${a * k}\).`,
    correct: ans,
    wrong: [{ value: a * k * a + b, why: 'The fraction bar means divide, not multiply.' }, { value: frac(a * k + b, a), why: R`Only \(x\) is divided by \(${a}\). Divide first, then add \(${b}\).` }, ans + 1, k],
    solution: [R`Replace \(x\) with \(${a * k}\): \(\frac{${a * k}}{${a}} + ${b}\).`, R`Divide first: \(${a * k} \div ${a} = ${k}\).`, R`Add: \(${k} + ${b} = ${ans}\).`],
    rule: 3,
    skill: 'evaluating expressions',
    check: () => ((ans - b) * a === a * k ? true : 'value is wrong'),
  });
}

// ───────────── Medium (Grade 6): exponents in the order of operations, distributing, like terms, stories ─────────────

function mediumOrderOpsExponent(rng) {
  const kind = rng.pick(['mixed', 'squareSum', 'squareDiff']);
  if (kind === 'mixed') {
    const a = rng.int(2, 12);
    const b = rng.int(2, 6);
    const c = rng.int(2, 5);
    const d = rng.int(1, 9);
    const ans = a + b * c * c - d;
    return q({
      prompt: R`Evaluate \(${a} + ${b} \times ${c}^{2} - ${d}\).`,
      correct: ans,
      wrong: [
        { value: a + (b * c) ** 2 - d, why: R`The exponent belongs only to \(${c}\). Work out \(${c}^{2}\) before multiplying by \(${b}\).` },
        { value: a + b * c * 2 - d, why: R`\(${c}^{2}\) means \(${c} \times ${c}\), not \(${c} \times 2\).` },
        { value: (a + b) * c * c - d, why: 'Exponents come first, then multiplication, then addition and subtraction.' },
        ans + d,
      ],
      solution: [R`Exponent first: \(${c}^{2} = ${c * c}\).`, R`Multiply: \(${b} \times ${c * c} = ${b * c * c}\).`, R`Add and subtract from left to right: \(${a} + ${b * c * c} - ${d} = ${ans}\).`],
      rule: 1,
      skill: 'order of operations',
      check: () => ((ans + d - a) / b === c * c ? true : 'value is wrong'),
    });
  }
  if (kind === 'squareSum') {
    const s = rng.int(4, 12);
    const a = rng.int(1, s - 1);
    const b = s - a;
    const c = rng.pick(divisors(s * s).filter((x) => x > 1 && x < s * s));
    const ans = (s * s) / c;
    return q({
      prompt: R`Evaluate \((${a} + ${b})^{2} \div ${c}\).`,
      correct: ans,
      wrong: [
        { value: frac(a * a + b * b, c), why: R`Add inside the parentheses first, then square the result. \((${a} + ${b})^{2}\) is not \(${a}^{2} + ${b}^{2}\).` },
        { value: frac(2 * s, c), why: R`\(${s}^{2}\) means \(${s} \times ${s}\), not \(${s} \times 2\).` },
        ans + 1,
        ans * 2,
      ],
      solution: [R`Parentheses first: \(${a} + ${b} = ${s}\).`, R`Exponent next: \(${s}^{2} = ${s * s}\).`, R`Divide: \(${s * s} \div ${c} = ${ans}\).`],
      rule: 1,
      skill: 'order of operations',
      check: () => (ans * c === (a + b) ** 2 ? true : 'value is wrong'),
    });
  }
  const a = rng.int(2, 6);
  const diff = rng.int(2, 5);
  const c = rng.int(1, 6);
  const b = c + diff;
  const d = rng.int(1, 12);
  const ans = a * diff * diff + d;
  return q({
    prompt: R`Evaluate \(${a} \times (${b} - ${c})^{2} + ${d}\).`,
    correct: ans,
    wrong: [
      { value: (a * diff) ** 2 + d, why: R`Square only what is in the parentheses. Then multiply by \(${a}\).` },
      { value: a * diff * 2 + d, why: R`\(${diff}^{2}\) means \(${diff} \times ${diff}\), not \(${diff} \times 2\).` },
      { value: a * (b * b - c * c) + d, why: R`Subtract inside the parentheses first, then square. \((${b} - ${c})^{2}\) is not \(${b}^{2} - ${c}^{2}\).` },
      ans + a,
    ],
    solution: [R`Parentheses first: \(${b} - ${c} = ${diff}\).`, R`Exponent next: \(${diff}^{2} = ${diff * diff}\).`, R`Multiply, then add: \(${a} \times ${diff * diff} = ${a * diff * diff}\), and \(${a * diff * diff} + ${d} = ${ans}\).`],
    rule: 1,
    skill: 'order of operations',
    check: () => ((ans - d) / a === (b - c) ** 2 ? true : 'value is wrong'),
  });
}

function mediumDistribute(rng) {
  const a = rng.int(2, 9);
  const b = rng.int(1, 6);
  const c = rng.nonzero(-9, 9);
  const v = rng.pick(['x', 'n', 'y']);
  const inner = linear(b, c, v);
  return q({
    prompt: R`Use the distributive property to expand \(${a}(${inner})\).`,
    visual: c > 0 ? { type: 'areaModel', rows: [`${a}`], cols: [terms([[b, v]]), `${c}`], alt: `An area model: a rectangle ${a} tall, split into a part ${b === 1 ? '' : b}${v} wide and a part ${c} wide.` } : undefined,
    correct: m(linear(a * b, a * c, v)),
    wrong: [
      { value: m(linear(a * b, c, v)), why: R`Multiply **both** terms inside the parentheses by \(${a}\), not just the first.` },
      { value: m(linear(a + b, a + c, v)), why: R`The \(${a}\) outside multiplies each term. It is not added to them.` },
      m(linear(b, a * c, v)),
      m(linear(a * b, -a * c, v)),
    ],
    solution: [
      R`Multiply each term inside the parentheses by \(${a}\).`,
      R`\(${a} \times ${terms([[b, v]])} = ${terms([[a * b, v]])}\) and \(${a} \times ${paren(c)} = ${a * c}\).`,
      R`So \(${a}(${inner}) = ${linear(a * b, a * c, v)}\).`,
    ],
    rule: 4,
    skill: 'distributive property',
    check: same((t) => a * (b * t + c), (t) => a * b * t + a * c),
  });
}

function mediumCombine(rng) {
  for (;;) {
    const a = rng.int(1, 9);
    const c = rng.nonzero(-8, 9);
    const b = rng.nonzero(-9, 9);
    const d = rng.nonzero(-9, 9);
    if (a + c === 0 || b + d === 0 || a + c === 1) continue;
    const v = rng.pick(['x', 'n', 'y']);
    return q({
      prompt: R`Simplify by combining like terms: \(${terms([[a, v], [b, ''], [c, v], [d, '']])}\)`,
      correct: m(linear(a + c, b + d, v)),
      wrong: [
        a + b + c + d !== 0 ? { value: m(terms([[a + b + c + d, v]])), why: `Only like terms can be combined. A plain number and a number of ${v}s are different kinds of term.` } : null,
        { value: m(linear(a + c, b - d, v)), why: 'Keep the sign in front of each term when you move it next to its like term.' },
        m(linear(a - c, b + d, v)),
        m(linear(a + c, -(b + d), v)),
        m(linear(a + c + 1, b + d, v)),
      ],
      solution: [
        R`Group the ${v}-terms: \(${terms([[a, v], [c, v]])} = ${terms([[a + c, v]])}\).`,
        R`Group the plain numbers: \(${b} ${signed(d)} = ${b + d}\).`,
        R`The simplified expression is \(${linear(a + c, b + d, v)}\).`,
      ],
      rule: 5,
      skill: 'combining like terms',
      check: same((t) => a * t + b + c * t + d, (t) => (a + c) * t + (b + d)),
    });
  }
}

function mediumStory(rng) {
  const name = person(rng);
  const c = rng.pick([
    { v: 'n', unit: 'month', down: false, start: rng.int(10, 45), r: rng.int(5, 30), text: (st, r) => `A gym charges a one-time fee of ${money(st)} to join, plus ${money(r)} each month. Which expression gives the total cost, in dollars, for \\(n\\) months?` },
    { v: 'd', unit: 'mile', down: false, start: rng.int(3, 9), r: rng.int(2, 6), text: (st, r) => `A taxi ride costs ${money(st)} to start, plus ${money(r)} for each mile. Which expression gives the cost, in dollars, of a ride of \\(d\\) miles?` },
    { v: 'w', unit: 'week', down: true, start: rng.int(60, 200), r: rng.int(5, 20), text: (st, r) => `${name} has ${money(st)} in savings and spends ${money(r)} of it each week. Which expression gives the amount, in dollars, left after \\(w\\) weeks?` },
    { v: 'h', unit: 'hour', down: true, start: rng.int(15, 40), r: rng.int(2, 6), text: (st, r) => `A candle is ${st} centimeters tall and burns down ${r} centimeters each hour. Which expression gives its height, in centimeters, after \\(h\\) hours?` },
  ]);
  const { v, start, r } = c;
  if (start === r) return mediumStory(rng);
  const right = c.down ? terms([[start, ''], [-r, v]]) : linear(r, start, v);
  return q({
    prompt: c.text(start, r),
    correct: m(right),
    wrong: [
      { value: m(c.down ? terms([[r, ''], [-start, v]]) : linear(start, r, v)), why: `The amount that repeats every ${c.unit} is the one multiplied by \\(${v}\\). The starting amount is counted once.` },
      { value: m(`${start + r}${v}`), why: `Only the amount for each ${c.unit} is multiplied by \\(${v}\\). The starting amount is counted once.` },
      c.down ? { value: m(linear(r, start, v)), why: 'The amount goes down over time, so the repeated amount is subtracted.' } : m(terms([[start, ''], [-r, v]])),
      m(`${start} + ${r} + ${v}`),
    ],
    solution: [
      `The amount for each ${c.unit} repeats, so multiply it by the number of ${c.unit}s: ${m(terms([[r, v]]))}.`,
      `The starting amount, ${start}, is counted once. ${c.down ? 'The repeated amount is taken away from it.' : 'The repeated amount is added to it.'}`,
      `The expression is ${m(right)}.`,
    ],
    rule: 2,
    skill: 'writing expressions',
  });
}

// ───────────── Hard (Grade 7): factoring, negatives and fractions, expressions for a story ─────────────

function hardFactor(rng) {
  for (;;) {
    const g = rng.int(2, 9);
    const b = rng.int(1, 7);
    const c = rng.nonzero(-9, 9);
    if (gcd(b, c) !== 1) continue;
    const p = divisors(g).find((x) => x > 1 && x < g);
    return q({
      prompt: R`Factor \(${linear(g * b, g * c)}\) completely by taking out the greatest common factor.`,
      correct: m(`${g}(${linear(b, c)})`),
      wrong: [
        p ? { value: m(`${p}(${linear((g * b) / p, (g * c) / p)})`), why: R`This is equal to the original expression, but the terms inside still share the factor \(${g / p}\). It is not factored completely.` } : null,
        { value: m(`${g}(${linear(b, g * c)})`), why: R`Divide **both** terms by \(${g}\). The second term was left as it was.` },
        m(`${g}(${linear(g * b, c)})`),
        m(`${g}(${linear(b, -c)})`),
        m(`${g * b}(${linear(1, c)})`),
      ],
      solution: [
        R`The greatest common factor of \(${g * b}\) and \(${Math.abs(g * c)}\) is \(${g}\).`,
        R`Divide each term by \(${g}\): \(${terms([[g * b, 'x']])} \div ${g} = ${terms([[b, 'x']])}\) and \(${g * c} \div ${g} = ${c}\).`,
        R`So \(${linear(g * b, g * c)} = ${g}(${linear(b, c)})\). Check by distributing: \(${g} \times ${terms([[b, 'x']])} = ${terms([[g * b, 'x']])}\) and \(${g} \times ${paren(c)} = ${g * c}\). ✓`,
      ],
      rule: 6,
      skill: 'factoring',
      check: same((t) => g * b * t + g * c, (t) => g * (b * t + c)),
    });
  }
}

function hardSimplify(rng) {
  for (;;) {
    const useFrac = rng.bool(0.4);
    const k = useFrac ? rng.pick([2, 3, 4]) : 1;
    const a = useFrac ? frac(1, k) : rng.int(2, 6);
    const b = k * rng.int(1, 4);
    const c = k * rng.nonzero(-5, 5);
    const d = rng.int(2, 6);
    const e = rng.int(1, 5);
    const f = rng.nonzero(-9, 9);
    const av = useFrac ? 1 / k : a;
    const [p1, c1, p2, c2] = [useFrac ? b / k : a * b, useFrac ? c / k : a * c, d * e, d * f];
    if (p1 - p2 === 0 || c1 - c2 === 0) continue;
    const aTex = useFrac ? a.tex() : a;
    return q({
      prompt: R`Simplify \(${aTex}(${linear(b, c)}) - ${d}(${linear(e, f)})\).`,
      correct: m(linear(p1 - p2, c1 - c2)),
      wrong: [
        { value: m(linear(p1 - p2, c1 + c2)), why: R`The \(-${d}\) multiplies both terms in the second parentheses: \(-${d} \times ${paren(f)} = ${-c2}\).` },
        { value: m(linear(p1 - p2, c - f)), why: 'The numbers in front multiply every term inside their parentheses, including the plain numbers.' },
        m(linear(p1 + p2, c1 + c2)),
        m(linear(p1 - p2, -(c1 - c2))),
        m(linear(p1 - p2 + 1, c1 - c2)),
      ],
      solution: [
        R`Distribute the first number: \(${aTex}(${linear(b, c)}) = ${linear(p1, c1)}\).`,
        R`Distribute \(-${d}\), watching the signs: \(-${d}(${linear(e, f)}) = ${linear(-p2, -c2)}\).`,
        R`Combine like terms: \(${terms([[p1, 'x'], [-p2, 'x']])} = ${terms([[p1 - p2, 'x']])}\) and \(${c1} ${signed(-c2)} = ${c1 - c2}\).`,
        R`The simplified expression is \(${linear(p1 - p2, c1 - c2)}\).`,
      ],
      rule: 5,
      skill: 'simplifying expressions',
      check: same((t) => av * (b * t + c) - d * (e * t + f), (t) => (p1 - p2) * t + (c1 - c2)),
    });
  }
}

function hardPerimeter(rng) {
  const a = rng.int(1, 6);
  const b = rng.int(1, 9);
  const c = rng.int(1, 6);
  const d = rng.nonzero(-4, 9);
  const [len, wid] = [linear(a, b), linear(c, d)];
  const plain = (s) => s.replace(/-/g, '−');
  const thing = rng.pick(['garden', 'picture frame', 'playing field', 'tabletop', 'patio']);
  return q({
    prompt: R`A rectangular ${thing} has length \(${len}\) and width \(${wid}\), both in meters. Which expression gives its perimeter?`,
    visual: { type: 'polygon', points: [[0, 0], [5, 0], [5, 3], [0, 3]], sides: [plain(len), plain(wid), '', ''], right: [0, 1, 2, 3], alt: `A rectangle with length ${plain(len)} and width ${plain(wid)}.` },
    correct: m(linear(2 * (a + c), 2 * (b + d))),
    wrong: [
      { value: m(linear(a + c, b + d)), why: 'That adds only one length and one width. A rectangle has two of each.' },
      { value: m(linear(2 * (a + c), b + d)), why: 'When the sum is doubled, every term is doubled, including the plain numbers.' },
      m(linear(2 * a + c, 2 * b + d)),
      m(linear(2 * (a + c), 2 * (b - d))),
      m(linear(2 * (a + c) + 2, 2 * (b + d))),
    ],
    solution: [
      R`Perimeter is the distance around: \(2(\text{length}) + 2(\text{width}) = 2(${len}) + 2(${wid})\).`,
      R`Distribute: \(${linear(2 * a, 2 * b)}\) and \(${linear(2 * c, 2 * d)}\).`,
      R`Combine like terms: \(${terms([[2 * a, 'x'], [2 * c, 'x']])} = ${terms([[2 * (a + c), 'x']])}\) and \(${2 * b} ${signed(2 * d)} = ${2 * (b + d)}\). The perimeter is \(${linear(2 * (a + c), 2 * (b + d))}\) meters.`,
    ],
    rule: 5,
    skill: 'word problems',
    check: same((t) => 2 * (a * t + b) + 2 * (c * t + d), (t) => 2 * (a + c) * t + 2 * (b + d)),
  });
}

// ───────────── Challenge ─────────────

function challengeNotEquivalent(rng) {
  for (;;) {
    const a = rng.int(2, 6);
    const b = rng.intExcept(-6, 6, [-1, 0, 1]);
    const c = rng.nonzero(-6, 6);
    const s = a + c;
    if (s === 0 || s === 1 || s === -1) continue;
    const g = gcd(s, a * b);
    const original = terms([[1, `${a}(${linear(1, b)})`], [c, 'x']]);
    const third = g > 1 && s > 0 ? `${g}(${linear(s / g, (a * b) / g)})` : terms([[a * b, ''], [s, 'x']]);
    const bad = linear(s, b);
    return q({
      prompt: R`Which expression is **not** equivalent to \(${original}\)?`,
      correct: m(bad),
      wrong: [m(linear(s, a * b)), m(terms([[c, 'x'], [a, 'x'], [a * b, '']])), m(third)],
      solution: [
        R`Expand the original: \(${a}(${linear(1, b)}) = ${linear(a, a * b)}\), so the expression is \(${terms([[a, 'x'], [a * b, ''], [c, 'x']])}\).`,
        R`Combine like terms: \(${linear(s, a * b)}\). Any expression that simplifies to this is equivalent.`,
        R`\(${bad}\) has the wrong plain number: the \(${a}\) was not multiplied by \(${paren(b)}\). Test \(x = 0\): the original gives \(${a * b}\) but \(${bad}\) gives \(${b}\).`,
      ],
      rule: 6,
      skill: 'equivalent expressions',
      check: () => {
        const f = (t) => a * (t + b) + c * t;
        const eq = checkSame(f, (t) => s * t + a * b);
        return eq === true && checkSame(f, (t) => s * t + b) !== true ? true : 'equivalence is wrong';
      },
    });
  }
}

function challengePercent(rng) {
  const r = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 60]);
  const up = rng.bool();
  const d = r / 100;
  const c = up
    ? rng.pick([
        { text: `A town has \\(n\\) people. Its population grows by ${r}%. Which expression gives the new population?`, v: 'n' },
        { text: `A worker earns \\(w\\) dollars an hour and gets a ${r}% raise. Which expression gives the new hourly pay?`, v: 'w' },
        { text: `A meal costs \\(c\\) dollars. A ${r}% tip is added. Which expression gives the total?`, v: 'c' },
      ])
    : rng.pick([
        { text: `A jacket costs \\(p\\) dollars. It goes on sale for ${r}% off. Which expression gives the sale price?`, v: 'p' },
        { text: `A phone battery holds \\(b\\) hours of charge when new. After a year it holds ${r}% less. Which expression gives the hours it holds now?`, v: 'b' },
        { text: `A lake has \\(f\\) fish. The number of fish drops by ${r}%. Which expression gives the number of fish now?`, v: 'f' },
      ]);
  const v = c.v;
  const right = `${num(up ? 1 + d : 1 - d)}${v}`;
  return q({
    prompt: c.text,
    correct: m(right),
    wrong: [
      { value: m(`${v} ${up ? '+' : '-'} ${num(d)}`), why: R`\(${r}\%\) of \(${v}\) is \(${num(d)}${v}\), not the number \(${num(d)}\) on its own.` },
      { value: m(`${num(d)}${v}`), why: `That is only the amount of the change. The new amount is the original ${up ? 'plus' : 'minus'} the change.` },
      { value: m(`${num(up ? 1 - d : 1 + d)}${v}`), why: `That is a ${r}% ${up ? 'decrease' : 'increase'}.` },
      m(`${v} ${up ? '+' : '-'} ${r}`),
    ],
    solution: [
      R`\(${r}\%\) of \(${v}\) is \(${num(d)}${v}\).`,
      R`The new amount is the original ${up ? 'plus' : 'minus'} that change: \(${v} ${up ? '+' : '-'} ${num(d)}${v}\).`,
      R`Combine like terms: \(${v} ${up ? '+' : '-'} ${num(d)}${v} = (1 ${up ? '+' : '-'} ${num(d)})${v} = ${right}\). ${up ? 'Increasing' : 'Decreasing'} by \(${r}\%\) is the same as multiplying by \(${num(up ? 1 + d : 1 - d)}\).`,
    ],
    rule: 5,
    skill: 'rewriting expressions',
    check: same((t) => (up ? t + d * t : t - d * t), (t) => (up ? 1 + d : 1 - d) * t),
  });
}

function challengeEvaluateNegative(rng) {
  const kind = rng.pick(['oppositeSquare', 'quadratic', 'nested']);
  const v = -rng.int(2, 6);
  const b = rng.int(2, 6);
  if (kind === 'oppositeSquare') {
    const ans = -(v * v) + b * v;
    return q({
      prompt: R`Evaluate \(-x^{2} + ${b}x\) when \(x = ${v}\).`,
      correct: ans,
      wrong: [
        { value: v * v + b * v, why: R`\(-x^{2}\) means the opposite of \(x^{2}\). Square first to get \(${v * v}\), then take the opposite: \(${-(v * v)}\).` },
        { value: -(v * v) - b * v, why: R`\(${b} \times (${v})\) is negative: a positive times a negative.` },
        v * v - b * v,
        ans + 2,
      ],
      solution: [R`Replace \(x\) with \(${v}\): \(-(${v})^{2} + ${b}(${v})\).`, R`Exponent first: \((${v})^{2} = ${v * v}\), so \(-(${v})^{2} = ${-(v * v)}\).`, R`Multiply: \(${b}(${v}) = ${b * v}\).`, R`Add: \(${-(v * v)} + (${b * v}) = ${ans}\).`],
      rule: 3,
      skill: 'evaluating with negatives',
      check: () => (ans === v * (b - v) ? true : 'value is wrong'),
    });
  }
  if (kind === 'quadratic') {
    const c = rng.int(1, 9);
    const ans = v * v - b * v + c;
    return q({
      prompt: R`Evaluate \(x^{2} - ${b}x + ${c}\) when \(x = ${v}\).`,
      correct: ans,
      wrong: [
        { value: -(v * v) - b * v + c, why: R`A negative number squared is positive: \((${v})^{2} = ${v * v}\).` },
        { value: v * v + b * v + c, why: R`\(-${b} \times (${v})\) is positive: a negative times a negative.` },
        2 * v - b * v + c,
        ans - 2,
      ],
      solution: [R`Replace \(x\) with \(${v}\): \((${v})^{2} - ${b}(${v}) + ${c}\).`, R`Exponent first: \((${v})^{2} = ${v * v}\).`, R`Multiply: \(${b}(${v}) = ${b * v}\), so subtracting it adds \(${-b * v}\).`, R`\(${v * v} + ${-b * v} + ${c} = ${ans}\).`],
      rule: 3,
      skill: 'evaluating with negatives',
      check: () => (ans - c === v * (v - b) ? true : 'value is wrong'),
    });
  }
  const a = rng.int(5, 30);
  const c = rng.int(1, 4);
  const inner = v - c;
  const ans = a - b * inner * inner;
  return q({
    prompt: R`Evaluate \(${a} - ${b}(x - ${c})^{2}\) when \(x = ${v}\).`,
    correct: ans,
    wrong: [
      { value: (a - b) * inner * inner, why: 'Exponents and multiplication come before subtraction. Do not subtract first.' },
      { value: a + b * inner * inner, why: R`\((${inner})^{2}\) is positive, and it is being subtracted (after multiplying by \(${b}\)).` },
      { value: a - (b * inner) ** 2, why: R`Square only what is in the parentheses, then multiply by \(${b}\).` },
      ans + b,
    ],
    solution: [R`Replace \(x\) with \(${v}\): \(${a} - ${b}(${v} - ${c})^{2}\).`, R`Parentheses first: \(${v} - ${c} = ${inner}\).`, R`Exponent next: \((${inner})^{2} = ${inner * inner}\).`, R`Multiply, then subtract: \(${b} \times ${inner * inner} = ${b * inner * inner}\), and \(${a} - ${b * inner * inner} = ${ans}\).`],
    rule: 1,
    skill: 'evaluating with negatives',
    check: () => ((a - ans) / b === (v - c) ** 2 ? true : 'value is wrong'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'expressions',
  title: 'Expressions & Properties',
  summary: 'Use the order of operations, write and evaluate expressions, and rewrite them by distributing, combining like terms and factoring.',
  grade: 'Grades 6–7',
  standards: ['CCSS 6.EE.A.1', 'CCSS 6.EE.A.2', 'CCSS 6.EE.A.3', 'CCSS 6.EE.A.4', 'CCSS 7.EE.A.1'],

  explain: {
    intro: R`An **expression** is a recipe for a calculation, such as \(3x + 5\). The letter (a **variable**) stands for a number that can change. This topic is about reading expressions correctly, working out their value, and rewriting them in simpler forms that always give the same value.`,
    rules: [
      {
        title: 'Exponents: repeated multiplication',
        text: R`An exponent tells how many times the base is used as a factor. It is not the base times the exponent.`,
        example: R`\(2^{5} = 2 \times 2 \times 2 \times 2 \times 2 = 32\), not \(2 \times 5 = 10\).`,
      },
      {
        title: 'The order of operations',
        text: R`Work in this order: (1) inside parentheses, (2) exponents, (3) multiplication and division from left to right, (4) addition and subtraction from left to right.`,
        example: R`\(5 + 3 \times (8 - 2)^{2} \div 4 = 5 + 3 \times 36 \div 4 = 5 + 27 = 32\).`,
      },
      {
        title: 'Writing expressions from words',
        text: R`A number next to a variable means multiply: \(4n\) is 4 times \(n\). Watch the order in subtraction and division: "5 less than \(x\)" is \(x - 5\). When a whole sum is multiplied or divided, put it in parentheses.`,
        example: R`"3 more than twice a number \(n\)" is \(2n + 3\). "Twice the sum of \(n\) and 3" is \(2(n + 3)\).`,
      },
      {
        title: 'Evaluating: substitute, then follow the order of operations',
        text: R`To evaluate an expression, replace each variable with its value (use parentheses, especially for negative numbers) and then calculate in the usual order.`,
        example: R`For \(x = 4\): \(3x^{2} + 2 = 3(4)^{2} + 2 = 3(16) + 2 = 50\).`,
      },
      {
        title: 'The distributive property',
        text: R`A number outside parentheses multiplies **every** term inside: \(a(b + c) = ab + ac\). This is the area of a rectangle split into two parts.`,
        example: R`\(3(2x + 5) = 6x + 15\) and \(-2(x - 4) = -2x + 8\).`,
      },
      {
        title: 'Combining like terms',
        text: R`**Like terms** have the same variable part. Add or subtract their coefficients and keep the variable part. Plain numbers combine with plain numbers. Unlike terms, such as \(3x\) and \(5\), cannot be combined.`,
        example: R`\(3x + 5 + 4x - 2 = 7x + 3\).`,
      },
      {
        title: 'Factoring and equivalent expressions',
        text: R`Factoring is distributing in reverse: divide each term by a common factor and write that factor in front. Two expressions are **equivalent** if they give the same value for every value of the variable. Expanding, combining like terms and factoring all produce equivalent expressions.`,
        example: R`\(12x + 18 = 6(2x + 3)\). Increasing a price \(p\) by \(5\%\) gives \(p + 0.05p = 1.05p\).`,
      },
    ],
    vocab: [
      { term: 'variable', def: 'A letter that stands for a number.' },
      { term: 'term', def: R`A part of an expression separated by + or −. In \(3x + 5\) the terms are \(3x\) and \(5\).` },
      { term: 'coefficient', def: R`The number multiplying a variable. In \(3x\) the coefficient is 3.` },
      { term: 'constant', def: 'A term that is a plain number, with no variable.' },
      { term: 'like terms', def: R`Terms with the same variable part, such as \(3x\) and \(4x\).` },
      { term: 'equivalent expressions', def: 'Expressions that have the same value for every value of the variable.' },
    ],
    mistakes: [
      R`Working left to right and ignoring the order of operations: \(2 + 3 \times 4\) is \(14\), not \(20\).`,
      R`Reading an exponent as multiplication: \(5^{2}\) is \(25\), not \(10\).`,
      R`Distributing to the first term only: \(3(x + 4)\) is \(3x + 12\), not \(3x + 4\).`,
      R`Combining unlike terms: \(3x + 5\) cannot be written as \(8x\).`,
    ],
    visual: { type: 'areaModel', rows: ['3'], cols: ['2x', '5'], cells: [['6x', '15']], alt: 'An area model for 3 times (2x + 5): a rectangle 3 tall split into a part 2x wide with area 6x and a part 5 wide with area 15.' },
  },

  examples: [
    {
      title: 'Order of operations with an exponent',
      problem: R`Evaluate \(5 + 3 \times (8 - 2)^{2} \div 4\).`,
      steps: [
        R`Parentheses first: \(8 - 2 = 6\). Now the expression is \(5 + 3 \times 6^{2} \div 4\).`,
        R`Exponents next: \(6^{2} = 36\).`,
        R`Multiply and divide from left to right: \(3 \times 36 = 108\), then \(108 \div 4 = 27\).`,
        R`Add last: \(5 + 27 = 32\).`,
      ],
      answer: R`\(32\)`,
    },
    {
      title: 'Word problem: write an expression, then evaluate it',
      word: true,
      problem: 'A bowling alley charges $4 to rent shoes and $6 for each game. Write an expression for the cost of g games. Then find the cost of 3 games.',
      steps: [
        R`The $6 repeats for every game, so that part is \(6g\).`,
        R`The $4 for shoes is paid once, so add it: \(6g + 4\).`,
        R`For 3 games, replace \(g\) with 3: \(6(3) + 4 = 18 + 4 = 22\).`,
      ],
      answer: R`\(6g + 4\); 3 games cost $22`,
    },
    {
      title: 'Distribute, then combine like terms',
      problem: R`Simplify \(3(2x + 5) + 4x - 7\).`,
      steps: [
        R`Distribute the 3 to both terms: \(3 \times 2x = 6x\) and \(3 \times 5 = 15\). The expression is now \(6x + 15 + 4x - 7\).`,
        R`Combine the \(x\)-terms: \(6x + 4x = 10x\).`,
        R`Combine the constants: \(15 - 7 = 8\).`,
        R`Check with \(x = 1\): the original gives \(3(7) + 4 - 7 = 18\) and \(10(1) + 8 = 18\). ✓`,
      ],
      answer: R`\(10x + 8\)`,
      visual: { type: 'areaModel', rows: ['3'], cols: ['2x', '5'], cells: [['6x', '15']], alt: 'An area model: 3 times 2x is 6x and 3 times 5 is 15.' },
    },
    {
      title: 'Factoring out the greatest common factor',
      problem: R`Factor \(12x + 18\) completely.`,
      steps: [
        R`The greatest common factor of 12 and 18 is 6.`,
        R`Divide each term by 6: \(12x \div 6 = 2x\) and \(18 \div 6 = 3\).`,
        R`Write the 6 in front: \(6(2x + 3)\).`,
        R`Check by distributing: \(6 \times 2x + 6 \times 3 = 12x + 18\). ✓`,
      ],
      answer: R`\(6(2x + 3)\)`,
    },
  ],

  models: [
    {
      id: 'distribute-combine',
      title: 'Simplify a(bx + c) + dx + e',
      intro: 'Choose the five numbers. The steps distribute, combine like terms and check the answer.',
      inputs: [
        { name: 'a', label: 'a (outside the parentheses)', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'b', label: 'b (coefficient of x inside)', type: 'int', min: 1, max: 9, value: 2 },
        { name: 'c', label: 'c (constant inside)', type: 'int', min: -9, max: 9, value: 5 },
        { name: 'd', label: 'd (coefficient of the extra x-term)', type: 'int', min: -9, max: 9, value: 4 },
        { name: 'e', label: 'e (extra constant)', type: 'int', min: -9, max: 9, value: -7 },
      ],
      compute({ a, b, c, d, e }) {
        if (a === 0 || a === 1) return { error: 'Choose a number other than 0 or 1 outside the parentheses, so there is something to distribute.' };
        if (c === 0) return { error: 'Choose a constant other than 0 inside the parentheses, so there are two terms to multiply.' };
        const inner = linear(b, c);
        const original = terms([[a, `(${inner})`], [d, 'x'], [e, '']]);
        const [A, B] = [a * b + d, a * c + e];
        const x0 = 2;
        const value = a * (b * x0 + c) + d * x0 + e;
        const steps = [
          c === 0 ? R`Multiply the term inside the parentheses by \(${a}\): \(${a} \times ${terms([[b, 'x']])} = ${terms([[a * b, 'x']])}\).` : R`Distribute \(${a}\) to both terms: \(${a} \times ${terms([[b, 'x']])} = ${terms([[a * b, 'x']])}\) and \(${a} \times ${paren(c)} = ${a * c}\).`,
          R`Now the expression is \(${terms([[a * b, 'x'], [a * c, ''], [d, 'x'], [e, '']])}\).`,
        ];
        if (d !== 0) steps.push(R`Combine the \(x\)-terms: \(${terms([[a * b, 'x'], [d, 'x']])} = ${A === 0 ? '0' : terms([[A, 'x']])}\).`);
        if (e !== 0 && c !== 0) steps.push(R`Combine the constants: \(${a * c} ${signed(e)} = ${B}\).`);
        steps.push(R`Check with \(x = ${x0}\): the original expression gives \(${value}\), and the simplified expression gives \(${A * x0 + B}\). ✓`);
        return {
          problem: R`Simplify \(${original}\).`,
          steps,
          answer: R`\(${linear(A, B)}\)`,
          visual: a > 0 && c > 0 ? { type: 'areaModel', rows: [`${a}`], cols: [terms([[b, 'x']]), `${c}`], cells: [[terms([[a * b, 'x']]), `${a * c}`]], alt: `An area model for ${a} times (${b === 1 ? '' : b}x + ${c}): the parts are ${a * b}x and ${a * c}.` } : undefined,
        };
      },
    },
    {
      id: 'phone-plan',
      title: 'Word problem: a monthly phone bill',
      word: true,
      intro: 'Change the fixed charge, the price for each gigabyte and the amount of data used.',
      inputs: [
        { name: 'fee', label: 'Fixed monthly charge (dollars)', type: 'int', min: 5, max: 80, value: 20 },
        { name: 'rate', label: 'Price for each gigabyte (dollars)', type: 'int', min: 2, max: 20, value: 5 },
        { name: 'g', label: 'Gigabytes used', type: 'int', min: 2, max: 50, value: 7 },
      ],
      compute({ fee, rate, g }) {
        const expr = linear(rate, fee, 'g');
        const total = rate * g + fee;
        const steps = [R`The charge for data repeats for every gigabyte, so multiply it by \(g\): \(${terms([[rate, 'g']])}\).`];
        steps.push(fee > 0 ? R`The fixed charge of ${money(fee)} is paid once, so add it: \(${expr}\).` : R`There is no fixed charge, so the expression is just \(${expr}\).`);
        steps.push(R`Replace \(g\) with \(${g}\): \(${rate}(${g})${fee > 0 ? ` + ${fee}` : ''} = ${fee > 0 ? `${rate * g} + ${fee} = ` : ''}${total}\).`);
        return {
          problem: `A phone plan costs ${money(fee)} a month plus ${money(rate)} for each gigabyte of data. Write an expression for the bill when g gigabytes are used. What is the bill for ${g} ${g === 1 ? 'gigabyte' : 'gigabytes'}?`,
          steps,
          answer: R`\(${expr}\); the bill is ${money(total)}`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyExponent, easyOrderOps, easyWriteExpression, easyEvaluate],
    medium: [mediumOrderOpsExponent, mediumDistribute, mediumCombine, mediumStory],
    hard: [hardFactor, hardSimplify, hardPerimeter],
    challenge: [challengeNotEquivalent, challengePercent, challengeEvaluateNegative],
  },
};
