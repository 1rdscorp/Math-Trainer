import { R, q, num, txt, frac, gcd, paren, signed, dot, terms, round, rootsTex, isSquare, checkEqual, checkRoots, checkAll } from '../../lib/index.js';
import { clean } from './_shared.js';

const m = (tex) => R`\(${tex}\)`;
const LETTERS = ['x', 'y', 'a', 'n'];
/** A number for math mode: commas from 1,000 up, and small decimals are not rounded away. */
const N = (x) => num(x, { places: Number.isInteger(x) ? 0 : 12, commas: true });
/** A power: pw(5, 3) → 5^{3}. An exponent of 1 is left out. */
const pw = (b, k) => (k === 1 ? `${b}` : `${b}^{${k}}`);
/** A power written with a positive exponent: pos('x', -3) → \frac{1}{x^{3}}, pos('x', 0) → 1. */
const pos = (b, k) => (k === 0 ? '1' : k > 0 ? pw(b, k) : R`\frac{1}{${pw(b, -k)}}`);
/** Scientific notation: sci(4.5, 7) → 4.5 \times 10^{7}. */
const sci = (a, n) => R`${num(a)} \times 10^{${n}}`;
/** The same as inline math, after moving the decimal point so that the front number is at least 1 and less than 10. Null if that is impossible or the exponent would be 0. */
const sciNorm = (a, n) => (a <= 0 ? null : a >= 10 ? sciNorm(round(a / 10, 6), n + 1) : a < 1 ? sciNorm(round(a * 10, 6), n - 1) : n === 0 ? null : m(sci(a, n)));
/** A check that f is a proper front number for scientific notation. */
const front = (f) => (f >= 1 && f < 10 ? true : `front number ${f} is not between 1 and 10`);

// ───────────── Easy: one rule at a time ─────────────

function easyExponentRules(rng) {
  const numeric = rng.bool(0.6);
  const b = numeric ? rng.int(2, 12) : rng.pick(LETTERS);
  const t = numeric ? b : 1.3;
  const doubled = numeric ? b * b : `2${b}`;
  const times = rng.bool();
  for (;;) {
    const v = rng.int(2, times ? 9 : 7);
    const u = times ? rng.int(2, 9) : v + rng.int(2, 7);
    const k = times ? u + v : u - v;
    if (k === (times ? u * v : u / v)) continue;
    const tex = times ? R`${pw(b, u)} \cdot ${pw(b, v)}` : R`\dfrac{${pw(b, u)}}{${pw(b, v)}}`;
    return q({
      prompt: R`Which expression is equal to \(${tex}\)?`,
      correct: m(pw(b, k)),
      wrong: times
        ? [{ value: m(pw(b, u * v)), why: 'When powers of the same base are multiplied, the exponents are added, not multiplied.' }, { value: m(pw(doubled, k)), why: R`The base stays \(${b}\). Only the exponents are added.` }, m(pw(doubled, u * v)), m(pw(b, k + 1))]
        : [u % v === 0 ? { value: m(pw(b, u / v)), why: 'When powers of the same base are divided, the exponents are subtracted, not divided.' } : null, { value: m(pw(b, u + v)), why: 'Adding the exponents is for multiplying. To divide, subtract them.' }, m(pw(b, u * v)), m(pw(b, k + 1))],
      solution: times
        ? [R`\(${pw(b, u)}\) is ${u} factors of \(${b}\), and \(${pw(b, v)}\) is ${v} more. Together that is \(${u} + ${v} = ${k}\) factors of \(${b}\).`, R`Keep the base and add the exponents: \(${tex} = ${pw(b, k)}\).`]
        : [R`The top has ${u} factors of \(${b}\) and the bottom has ${v}. The ${v} on the bottom cancel ${v} on the top, leaving \(${u} - ${v} = ${k}\) factors.`, R`Keep the base and subtract the exponents: \(${tex} = ${pw(b, k)}\).`],
      rule: 0,
      skill: times ? 'multiplying powers' : 'dividing powers',
      check: () => checkEqual((times ? t ** u * t ** v : t ** u / t ** v) / t ** k, 1),
    });
  }
}

function easyZeroNegative(rng) {
  if (rng.bool(0.7)) {
    const b = rng.int(2, 10);
    const n = rng.int(1, b <= 3 ? 4 : b <= 5 || b === 10 ? 3 : 2);
    const p = b ** n;
    return q({
      prompt: R`What is the value of \(${b}^{-${n}}\)?`,
      correct: frac(1, p),
      wrong: [{ value: -p, why: R`A negative exponent does not make the value negative. It means 1 divided by \(${pw(b, n)}\).` }, n > 1 ? { value: -b * n, why: R`The exponent is not multiplied by the base. \(${b}^{-${n}}\) means \(\frac{1}{${pw(b, n)}}\).` } : null, frac(-1, p), p, frac(1, b * n)],
      solution: [R`A negative exponent means "1 divided by" the positive power: \(${b}^{-${n}} = \frac{1}{${pw(b, n)}}\).`, n > 1 ? R`\(${pw(b, n)} = ${p}\), so \(${b}^{-${n}} = \frac{1}{${p}}\).` : R`The value is \(\frac{1}{${b}}\): a small positive number, not a negative one.`],
      rule: 2,
      skill: 'negative exponents',
      check: () => checkEqual(b ** -n * p, 1),
    });
  }
  const b = rng.int(2, 60);
  return q({
    prompt: R`What is the value of \(${b}^{0}\)?`,
    correct: 1,
    wrong: [{ value: 0, why: R`\(${b}^{0}\) does not mean \(${b} \times 0\). Each step down in the exponent divides by \(${b}\), and \(${b}^{1} \div ${b} = 1\).` }, { value: b, why: R`\(${b}\) is \(${b}^{1}\). Dividing once more by \(${b}\) gives \(${b}^{0} = 1\).` }, frac(1, b)],
    solution: [R`Each time the exponent goes down by 1, the value is divided by \(${b}\): \(${b}^{2} = ${N(b * b)}\), then \(${b}^{1} = ${b}\).`, R`One more step down: \(${b}^{0} = ${b} \div ${b} = 1\). Any number except 0 raised to the power 0 is 1.`],
    rule: 2,
    skill: 'zero exponent',
    check: () => checkEqual(b ** 1 / b, 1),
  });
}

function easyRoots(rng) {
  if (rng.bool(0.65)) {
    const k = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20]);
    const p = k * k;
    return q({
      prompt: R`What is \(\sqrt{${p}}\)?`,
      correct: k,
      wrong: [{ value: p / 2, why: R`A square root is not half of the number. Look for the number that, multiplied by itself, gives \(${p}\).` }, k + 1, k - 1, 2 * k],
      solution: [R`Look for the number that, multiplied by itself, gives \(${p}\).`, R`\(${k} \times ${k} = ${p}\), so \(\sqrt{${p}} = ${k}\).`],
      rule: 3,
      skill: 'square roots',
      check: () => checkEqual(Math.sqrt(p), k),
    });
  }
  const k = rng.pick([2, 3, 4, 5, 6, 10]);
  const p = k ** 3;
  const s = Math.sqrt(p);
  return q({
    prompt: R`What is \(\sqrt[3]{${N(p)}}\)?`,
    correct: k,
    wrong: [{ value: clean(p / 3, 0), why: R`A cube root is not a third of the number. Look for the number that, used as a factor three times, gives \(${N(p)}\).` }, isSquare(p) ? { value: s, why: R`That is the square root: \(${s} \times ${s} = ${p}\). A cube root needs three equal factors.` } : null, { value: k * k, why: R`\(${k * k} \times ${k} = ${N(p)}\), but the three factors must all be the same number.` }, k + 1, k - 1],
    solution: [R`Look for the number that, used as a factor three times, gives \(${N(p)}\).`, R`\(${k} \times ${k} \times ${k} = ${N(p)}\), so \(\sqrt[3]{${N(p)}} = ${k}\).`],
    rule: 3,
    skill: 'cube roots',
    check: () => checkEqual(Math.cbrt(p), k),
  });
}

function easyScientific(rng) {
  const d = rng.int(10, 99);
  const a = d / 10;
  if (rng.bool(0.3)) {
    const n = rng.sign() * rng.int(2, 8);
    return q({
      prompt: 'Which number is written in scientific notation?',
      correct: m(sci(a, n)),
      wrong: [{ value: m(sci(d, n)), why: R`The first factor must be at least 1 and less than 10. \(${d}\) is too large.` }, { value: m(sci(d / 100, n)), why: R`The first factor must be at least 1 and less than 10. \(${num(d / 100)}\) is too small.` }, { value: m(R`${num(a)} \times ${Math.abs(n)}^{10}`), why: 'The second factor must be a power of 10: the base is 10 and the exponent is an integer.' }],
      solution: ['Scientific notation is a number that is at least 1 and less than 10, multiplied by a power of 10.', R`Only \(${sci(a, n)}\) fits: \(${num(a)}\) is at least 1 and less than 10, and it is multiplied by a power of 10.`],
      rule: 5,
      skill: 'scientific notation',
    });
  }
  const up = rng.bool();
  const n = up ? rng.int(2, 7) : -rng.int(1, 4);
  const value = up ? d * 10 ** (n - 1) : d / 10 ** (1 - n);
  const gap = -n - 1;
  const places = `${Math.abs(n)} ${Math.abs(n) === 1 ? 'place' : 'places'}`;
  return q({
    prompt: R`Write \(${sci(a, n)}\) as an ordinary number.`,
    correct: value,
    fmt: (x) => m(N(x)),
    wrong: up
      ? [
          d % 10 ? { value: d * 10 ** n, why: R`Move the decimal point ${places}. Do not just write ${n} zeros after the digits, because the digit after the decimal point uses one of the places.` } : null,
          n <= 5 ? { value: d / 10 ** (n + 1), why: 'A positive exponent makes the number larger, so the decimal point moves to the right.' } : null,
          d * 10 ** (n - 2),
          d * 10 ** n,
          d * 10 ** (n + 1),
        ]
      : [
          { value: d / 10 ** (2 - n), why: R`Moving the decimal point ${places} to the left leaves ${gap === 0 ? 'no zeros' : gap === 1 ? 'only 1 zero' : `only ${gap} zeros`} between the point and the first digit.` },
          { value: d * 10 ** (-n - 1), why: 'A negative exponent makes the number smaller, so the decimal point moves to the left.' },
          { value: -d * 10 ** (-n - 1), why: 'A negative exponent does not make the number negative. It makes a small positive number.' },
          d / 10 ** -n,
        ],
    solution: [R`The exponent is \(${n}\), so the decimal point moves ${places} to the ${up ? 'right and the number gets larger' : 'left and the number gets smaller'}.`, R`${up || gap ? 'Fill the empty places with zeros: ' : ''}\(${sci(a, n)} = ${N(value)}\).`],
    rule: 5,
    skill: 'scientific notation',
    check: () => checkEqual(value / 10 ** n, a),
  });
}

// ───────────── Medium: the standard procedures ─────────────

function mediumPowerRules(rng) {
  if (rng.bool()) {
    const numeric = rng.bool(0.4);
    const b = numeric ? rng.int(2, 9) : rng.pick(LETTERS);
    const t = numeric ? b : 1.3;
    const u = rng.int(2, 6);
    const v = rng.int(u === 2 ? 3 : 2, 5);
    const k = u * v;
    return q({
      prompt: R`Which expression is equal to \((${pw(b, u)})^{${v}}\)?`,
      correct: m(pw(b, k)),
      wrong: [{ value: m(pw(b, u + v)), why: 'For a power raised to a power, multiply the exponents. Adding is for multiplying two powers of the same base.' }, u ** v <= 40 ? { value: m(pw(b, u ** v)), why: R`Multiply the exponents: \(${u} \times ${v}\). Do not raise one exponent to the power of the other.` } : null, m(numeric ? R`${v} \cdot ${pw(b, u)}` : `${v}${pw(b, u)}`), m(pw(b, k + 1))],
      solution: [R`\((${pw(b, u)})^{${v}}\) is ${v} copies of \(${pw(b, u)}\) multiplied together. Each copy has ${u} factors of \(${b}\), so there are \(${u} \times ${v} = ${k}\) factors.`, R`Keep the base and multiply the exponents: \((${pw(b, u)})^{${v}} = ${pw(b, k)}\).`],
      rule: 1,
      skill: 'power of a power',
      check: () => checkEqual((t ** u) ** v / t ** k, 1),
    });
  }
  const v = rng.pick(LETTERS);
  const c = rng.int(2, 5);
  const n = c <= 3 ? rng.int(2, 3) : 2;
  const u = rng.intExcept(1, 6, n === 2 ? [2] : []);
  const inner = `${c}${pw(v, u)}`;
  const right = `${c ** n}${pw(v, u * n)}`;
  return q({
    prompt: R`Which expression is equal to \((${inner})^{${n}}\)?`,
    correct: m(right),
    wrong: [{ value: m(`${c}${pw(v, u * n)}`), why: R`The exponent outside applies to every factor inside the parentheses, including the \(${c}\): \(${c}^{${n}} = ${c ** n}\).` }, { value: m(`${c * n}${pw(v, u * n)}`), why: R`\(${c}^{${n}}\) means ${n} factors of \(${c}\), which is \(${c ** n}\), not \(${c} \times ${n}\).` }, m(`${c ** n}${pw(v, u + n)}`), m(`${c}${pw(v, u + n)}`)],
    solution: [R`The exponent \(${n}\) applies to both factors inside the parentheses.`, u === 1 ? R`\(${c}^{${n}} = ${c ** n}\), and \(${v}\) becomes \(${pw(v, n)}\).` : R`\(${c}^{${n}} = ${c ** n}\), and \((${pw(v, u)})^{${n}} = ${pw(v, u * n)}\) because the exponents are multiplied.`, R`So \((${inner})^{${n}} = ${right}\).`],
    rule: 1,
    skill: 'power of a product',
    check: () => checkEqual((c * 1.3 ** u) ** n / (c ** n * 1.3 ** (u * n)), 1),
  });
}

const ROOT_STORIES = {
  2: [(p) => ({ text: `A square patio has an area of ${p} square feet. How long is each side?`, unit: 'feet' }), (p) => ({ text: `A square photo has an area of ${p} square centimeters. How long is each side?`, unit: 'cm' })],
  3: [(p) => ({ text: `A cube-shaped box has a volume of ${txt(p)} cubic centimeters. How long is each edge?`, unit: 'cm' }), (p) => ({ text: `A cube-shaped water tank holds ${txt(p)} cubic feet of water when it is full. How long is each edge of the tank?`, unit: 'feet' })],
};

function mediumSolve(rng) {
  const deg = rng.pick([2, 3]);
  const k = rng.pick(deg === 2 ? [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20] : [2, 3, 4, 5, 6, 10]);
  const p = k ** deg;
  const facts = Array(deg).fill(k).join(R` \times `);
  if (rng.bool()) {
    return q({
      prompt: R`Find **all** the solutions of \(x^{${deg}} = ${N(p)}\).`,
      correct: m(deg === 2 ? rootsTex([k, -k]) : `x = ${k}`),
      wrong:
        deg === 2
          ? [
              { value: m(`x = ${k}`), why: R`\(${k}\) is one solution, but \(-${k}\) also works, because \((-${k})^{2} = ${p}\).` },
              { value: m(`x = ${num(p / 2)}`), why: R`\(x^{2}\) means \(x \cdot x\), not \(2x\). Look for the numbers whose square is \(${p}\).` },
              m(rootsTex([p / 2, -p / 2])),
              m(`x = -${k}`),
            ]
          : [
              { value: m(rootsTex([k, -k])), why: R`A negative number cubed is negative: \((-${k})^{3} = -${N(p)}\). So \(-${k}\) is not a solution.` },
              { value: m(`x = ${frac(p, 3).tex()}`), why: R`\(x^{3}\) means \(x \cdot x \cdot x\), not \(3x\). Look for the number whose cube is \(${N(p)}\).` },
              isSquare(p) ? m(`x = ${Math.sqrt(p)}`) : null,
              m(`x = ${k * k}`),
              m(`x = ${k + 1}`),
            ],
      solution:
        deg === 2
          ? [R`Look for the numbers whose square is \(${p}\). \(${facts} = ${p}\), so \(x = ${k}\) is one solution.`, R`A negative times a negative is positive: \((-${k}) \times (-${k}) = ${p}\). So \(x = -${k}\) is a solution too.`, R`The solutions are \(${rootsTex([k, -k])}\).`]
          : [R`Look for the number whose cube is \(${N(p)}\): \(${facts} = ${N(p)}\), so \(x = ${k}\).`, R`\(-${k}\) does not work, because \((-${k})^{3} = -${N(p)}\). A cube keeps the sign of the number.`, R`The only solution is \(x = ${k}\).`],
      rule: 3,
      skill: deg === 2 ? 'solving with square roots' : 'solving with cube roots',
      check: () => checkAll(checkRoots((x) => x ** deg - p, deg === 2 ? [k, -k] : [k]), deg === 2 || (-k) ** 3 !== p ? true : 'the negative also works'),
    });
  }
  const s = rng.pick(ROOT_STORIES[deg])(p);
  return q({
    prompt: s.text,
    correct: k,
    unit: s.unit,
    wrong:
      deg === 2
        ? [
            { value: clean(p / 4), why: 'Dividing by 4 finds a side from the perimeter. Area is side times side, so take the square root.' },
            { value: p / 2, why: R`Half of the area is not the side. Look for the number that, multiplied by itself, gives \(${p}\).` },
            2 * k,
            k + 1,
          ]
        : [
            { value: clean(p / 3, 0), why: 'Dividing by 3 does not undo cubing. Volume is edge times edge times edge, so take the cube root.' },
            isSquare(p) ? { value: Math.sqrt(p), why: 'That is the square root. A cube has three equal edges multiplied together, so use the cube root.' } : null,
            { value: k * k, why: R`\(${k * k}\) is the area of one face. The edge is the number used three times: \(${facts} = ${N(p)}\).` },
            k + 1,
            k - 1,
          ],
    solution:
      deg === 2
        ? [R`The area of a square is side \(\times\) side, so \(s^{2} = ${p}\).`, R`\(${facts} = ${p}\), so \(s = ${k}\). A length cannot be negative, so \(-${k}\) is not used.`, `Each side is ${k} ${s.unit} long.`]
        : [R`The volume of a cube is edge \(\times\) edge \(\times\) edge, so \(e^{3} = ${N(p)}\).`, R`\(${facts} = ${N(p)}\), so \(e = ${k}\).`, `Each edge is ${k} ${s.unit} long.`],
    rule: 3,
    skill: deg === 2 ? 'square root word problems' : 'cube root word problems',
    check: () => checkEqual(deg === 2 ? Math.sqrt(p) : Math.cbrt(p), k),
  });
}

function mediumEstimateRoot(rng) {
  const closest = rng.bool();
  let n;
  let k;
  do {
    n = rng.int(10, 200);
    k = Math.floor(Math.sqrt(n));
  } while (k * k === n || (closest && (n === k * k + k || n === k * k + k + 1)));
  const [lo, hi] = [k * k, (k + 1) ** 2];
  if (!closest) {
    const between = (x) => `between ${x} and ${x + 1}`;
    return q({
      prompt: R`Between which two consecutive whole numbers does \(\sqrt{${n}}\) lie?`,
      correct: between(k),
      wrong: [{ value: `between ${lo} and ${hi}`, why: R`Those are the perfect squares on each side of \(${n}\). The answer is their square roots, \(${k}\) and \(${k + 1}\).` }, { value: between(Math.floor(n / 2)), why: R`A square root is not half of the number. Look for whole numbers whose squares are just below and just above \(${n}\).` }, between(k - 1), between(k + 1)],
      solution: [R`Find the perfect squares on each side of \(${n}\): \(${k}^{2} = ${lo}\) and \(${k + 1}^{2} = ${hi}\).`, R`\(${lo} < ${n} < ${hi}\), so \(\sqrt{${n}}\) is between \(${k}\) and \(${k + 1}\).`],
      rule: 4,
      skill: 'estimating square roots',
      check: () => (k < Math.sqrt(n) && Math.sqrt(n) < k + 1 ? true : 'the root is not in that interval'),
    });
  }
  const down = n - lo <= k;
  const near = down ? k : k + 1;
  const half = (2 * k + 1) ** 2 / 4;
  return q({
    prompt: R`Which whole number is closest to \(\sqrt{${n}}\)?`,
    correct: near,
    wrong: [{ value: down ? k + 1 : k, why: R`\(\sqrt{${n}}\) is between \(${k}\) and \(${k + 1}\), but \(${num(k + 0.5)}^{2} = ${num(half)}\) is ${down ? 'more' : 'less'} than \(${n}\). So \(\sqrt{${n}}\) is ${down ? 'below' : 'above'} \(${num(k + 0.5)}\).` }, { value: Math.round(n / 2), why: 'A square root is not half of the number.' }, down ? k - 1 : k + 2],
    solution: [R`\(${k}^{2} = ${lo}\) and \(${k + 1}^{2} = ${hi}\), so \(\sqrt{${n}}\) is between \(${k}\) and \(${k + 1}\).`, R`\(${n}\) is ${n - lo} above \(${lo}\) and ${hi - n} below \(${hi}\), so it is nearer to \(${down ? lo : hi}\). (Check with the halfway number: \(${num(k + 0.5)}^{2} = ${num(half)}\), which is ${down ? 'more' : 'less'} than \(${n}\).)`, R`So \(\sqrt{${n}}\) is closest to \(${near}\).`],
    rule: 4,
    skill: 'estimating square roots',
    check: () => (Math.abs(Math.sqrt(n) - near) < 0.5 ? true : 'not the nearest whole number'),
  });
}

function mediumToScientific(rng) {
  const sig = rng.pick([1, 2, 2, 3]);
  let d;
  do d = rng.int(10 ** (sig - 1), 10 ** sig - 1);
  while (sig > 1 && d % 10 === 0);
  const a = d / 10 ** (sig - 1);
  const large = rng.bool();
  const n = large ? rng.int(4, 9) : -rng.int(2, 7 - sig);
  const value = large ? d * 10 ** (n - sig + 1) : d / 10 ** (sig - 1 - n);
  const zeros = large ? n - sig + 1 : n + 1;
  return q({
    prompt: R`Write \(${N(value)}\) in scientific notation.`,
    correct: m(sci(a, n)),
    wrong: [zeros !== n ? { value: m(sci(a, zeros)), why: R`Count the places the decimal point moves, not the zeros. It moves ${Math.abs(n)} places to get from \(${N(value)}\) to \(${num(a)}\).` } : null, { value: m(sci(a, -n)), why: large ? 'A number greater than 10 has a positive exponent. Negative exponents are for numbers between 0 and 1.' : 'A number between 0 and 1 has a negative exponent. A positive exponent would make a large number.' }, m(sci(a, n + 1)), m(sci(a, n - 1))],
    solution: [R`Put the decimal point after the first non-zero digit, so the front number is at least 1 and less than 10: \(${num(a)}\).`, R`Count the places the decimal point moved: from \(${N(value)}\) to \(${num(a)}\) is ${Math.abs(n)} places.`, R`The original number is ${large ? 'large, so the exponent is positive' : 'less than 1, so the exponent is negative'}: \(${N(value)} = ${sci(a, n)}\).`],
    rule: 5,
    skill: 'scientific notation',
    check: () => checkAll(checkEqual((a * 10 ** n) / value, 1), front(a)),
  });
}

// ───────────── Hard: rules together, awkward numbers, set-up needed ─────────────

function hardSimplify(rng) {
  const v = rng.pick(LETTERS);
  const kind = rng.pick(['fraction', 'powerTimes', 'powerOver']);
  const sgn = () => (rng.bool(0.45) ? -1 : 1);
  for (;;) {
    const a = sgn() * rng.int(2, 8);
    const b = kind === 'fraction' ? sgn() * rng.int(2, 8) : rng.int(2, 4);
    const c = sgn() * rng.int(2, 9);
    if (a > 0 && c > 0 && (kind !== 'fraction' || b > 0)) continue;
    const top = kind === 'fraction' ? a + b : a * b;
    const slip = kind === 'fraction' ? a * b : a + b;
    const k = kind === 'powerTimes' ? top + c : top - c;
    if (k === 0 || top === 0 || slip === top || Math.abs(k) > 24) continue;
    const head = kind === 'fraction' ? R`${pw(v, a)} \cdot ${pw(v, b)}` : R`(${pw(v, a)})^{${b}}`;
    const tex = kind === 'powerTimes' ? R`${head} \cdot ${pw(v, c)}` : R`\dfrac{${head}}{${pw(v, c)}}`;
    const value = (x) => (kind === 'fraction' ? x ** a * x ** b : (x ** a) ** b) * (kind === 'powerTimes' ? x ** c : x ** -c);
    return q({
      prompt: R`Simplify \(${tex}\). Write the answer with a positive exponent.`,
      correct: m(pos(v, k)),
      wrong: [
        { value: m(pos(v, kind === 'powerTimes' ? slip + c : slip - c)), why: kind === 'fraction' ? 'Multiplying powers of the same base adds the exponents. It does not multiply them.' : 'A power raised to a power multiplies the exponents. It does not add them.' },
        {
          value: m(pos(v, kind === 'powerTimes' ? top - c : top + c)),
          why: kind === 'powerTimes' ? (c < 0 ? R`Adding a negative exponent lowers the total: \(${top} + (${c}) = ${k}\).` : 'Multiplying by a power adds its exponent.') : c < 0 ? R`Subtracting a negative exponent raises the total: \(${top} - (${c}) = ${k}\).` : 'Dividing by a power subtracts its exponent.',
        },
        m(pos(v, -k)),
        m(pos(v, k + 1)),
        m(pos(v, k - 1)),
        m(pos(v, k + 2)),
      ],
      solution: [
        kind === 'fraction' ? R`Multiply on the top by adding the exponents: \(${a} + ${paren(b)} = ${top}\), so the top is \(${pw(v, top)}\).` : R`A power raised to a power: multiply the exponents. \(${dot(a, b)} = ${top}\), so \((${pw(v, a)})^{${b}} = ${pw(v, top)}\).`,
        kind === 'powerTimes' ? R`Multiply by adding the exponents: \(${top} + ${paren(c)} = ${k}\). That gives \(${pw(v, k)}\).` : R`Divide by subtracting the bottom exponent: \(${top} - ${paren(c)} = ${k}\). That gives \(${pw(v, k)}\).`,
        ...(k < 0 ? [R`A negative exponent means "1 divided by" the positive power: \(${pw(v, k)} = ${pos(v, k)}\).`] : []),
      ],
      rule: kind === 'fraction' ? 0 : 1,
      skill: 'combining exponent rules',
      check: () => checkEqual(value(1.3) / 1.3 ** k, 1),
    });
  }
}

const FRONTS = [1.2, 1.5, 2, 2.4, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9];
const SCI_STORIES = {
  times: [
    (rng) => ({ a: 3, e1: 8, b: rng.pick(FRONTS), e2: rng.int(2, 6), text: (x, y) => R`Light travels about \(${x}\) meters each second. About how far does light travel in \(${y}\) seconds?`, first: 'Distance is speed times time, so multiply the two numbers.' }),
    (rng) => ({ a: rng.pick([1.2, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]), e1: 2, b: rng.int(2, 9), e2: rng.int(4, 6), text: (x, y) => R`Each person in a city uses about \(${x}\) liters of water a day. About \(${y}\) people live in the city. About how many liters of water does the city use each day?`, first: 'Every person uses about the same amount, so multiply the two numbers.' }),
    (rng) => ({ a: rng.pick([1.2, 1.5, 2, 2.5]), e1: -5, b: rng.int(2, 9), e2: rng.int(2, 4), text: (x, y) => R`A sheet of plastic wrap is about \(${x}\) meters thick. About how many meters thick is a stack of \(${y}\) sheets?`, first: 'Every sheet has the same thickness, so multiply the two numbers.' }),
  ],
  divide: [
    (rng) => ({ e1: rng.int(6, 7), e2: rng.int(3, 4), text: (x, y) => R`A large city has about \(${x}\) people. A small town has about \(${y}\) people. About how many times as many people live in the city?`, first: 'To find how many times as large one number is as another, divide.' }),
    () => ({ e1: 10, e2: 6, text: (x, y) => R`A memory card can store \(${x}\) bytes. One photo uses about \(${y}\) bytes. About how many photos fit on the card?`, first: 'To find how many photos fit, divide the space on the card by the size of one photo.' }),
    (rng) => ({ e1: rng.int(1, 3), e2: -6, text: (x, y) => R`A pile of sand has a mass of \(${x}\) kilograms. One grain has a mass of about \(${y}\) kilograms. About how many grains are in the pile?`, first: 'To find how many grains there are, divide the mass of the pile by the mass of one grain.' }),
  ],
};

function hardSciProducts(rng) {
  const op = rng.pick(['times', 'divide']);
  const useStory = rng.bool();
  for (;;) {
    const story = useStory ? rng.pick(SCI_STORIES[op])(rng) : null;
    let a = story?.a ?? rng.pick(FRONTS);
    let b = story?.b ?? rng.int(2, 9);
    if (op === 'divide') {
      // Choose the two front numbers (in tenths) so that the quotient has at most two digits.
      const B = rng.pick([12, 15, 20, 25, 30, 40, 50, 60, 80]);
      const A = rng.int(10, 99);
      if (A === B || (A > B ? (10 * A) % B : (100 * A) % B)) continue;
      [a, b] = [A / 10, B / 10];
    } else if (!story && rng.bool()) [a, b] = [b, a];
    const e1 = story?.e1 ?? rng.nonzero(-9, 9);
    const e2 = story?.e2 ?? rng.nonzero(-9, 9);
    const raw = round(op === 'times' ? a * b : a / b, 4);
    const shift = raw >= 10 ? 1 : raw < 1 ? -1 : 0;
    const e0 = op === 'times' ? e1 + e2 : e1 - e2;
    const [f, e] = [round(raw / 10 ** shift, 4), e0 + shift];
    if ([e, e0, e0 - shift, e1 + e2].includes(0) || e1 === e2 || e < -6) continue;
    const [x, y] = [sci(a, e1), sci(b, e2)];
    const sum = round(a + b, 1);
    return q({
      prompt: story ? `${story.text(x, y)} Give the answer in scientific notation.` : op === 'times' ? R`Multiply. Give the answer in scientific notation. \(\;(${x})(${y})\)` : R`Divide. Give the answer in scientific notation. \(\;\dfrac{${x}}{${y}}\)`,
      correct: m(sci(f, e)),
      wrong: shift
        ? [
            { value: m(R`${num(raw)} \times 10^{${e0}}`), why: R`This has the right value, but it is not in scientific notation: \(${num(raw)}\) is ${shift > 0 ? 'not less than 10' : 'less than 1'}.`, form: true },
            { value: m(sci(f, e0)), why: R`When \(${num(raw)}\) is rewritten as \(${num(f)}\), the exponent has to change as well.` },
            { value: m(sci(f, e0 - shift)), why: shift > 0 ? 'The front number was made 10 times smaller, so the power of 10 must be 10 times larger: the exponent goes **up** by 1.' : 'The front number was made 10 times larger, so the power of 10 must be 10 times smaller: the exponent goes **down** by 1.' },
            ...[(op === 'times' ? e1 - e2 : e1 + e2) + shift, e + 2 * shift, e + 3 * shift].filter((j) => j !== 0).map((j) => m(sci(f, j))),
          ]
        : [
            { value: m(sci(f, op === 'times' ? e1 * e2 : e1 + e2)), why: op === 'times' ? 'To multiply powers of 10, add the exponents. Do not multiply them.' : 'To divide powers of 10, subtract the exponents. Adding is for multiplying.' },
            op === 'divide' ? { value: m(sci(f, -e)), why: 'Subtract the bottom exponent from the top exponent, not the other way round.' } : { value: sum < 10 ? m(sci(sum, e)) : null, why: 'Multiply the front numbers. Only the exponents are added.' },
            ...[e + 1, e - 1, -e, e + 2].filter((j) => j !== 0).map((j) => m(sci(f, j))),
          ],
      solution: [
        ...(story ? [story.first] : []),
        op === 'times' ? R`Multiply the front numbers: \(${num(a)} \times ${num(b)} = ${num(raw)}\).` : R`Divide the front numbers: \(${num(a)} \div ${num(b)} = ${num(raw)}\).`,
        op === 'times' ? R`Multiply the powers of 10 by adding the exponents: \(${e1} + ${paren(e2)} = ${e0}\), which gives \(10^{${e0}}\).` : R`Divide the powers of 10 by subtracting the exponents: \(${e1} - ${paren(e2)} = ${e0}\), which gives \(10^{${e0}}\).`,
        shift
          ? R`\(${num(raw)} \times 10^{${e0}}\) is not in scientific notation, because \(${num(raw)}\) is ${shift > 0 ? 'not less than 10' : 'less than 1'}. Since \(${num(raw)} = ${num(f)} \times ${shift > 0 ? '10' : '10^{-1}'}\), the answer is \(${sci(f, e)}\).`
          : R`\(${num(raw)}\) is at least 1 and less than 10, so the answer is \(${sci(f, e)}\).`,
      ],
      rule: 6,
      skill: op === 'times' ? 'multiplying in scientific notation' : 'dividing in scientific notation',
      check: () => checkAll(checkEqual((op === 'times' ? a * 10 ** e1 * (b * 10 ** e2) : (a * 10 ** e1) / (b * 10 ** e2)) / (f * 10 ** e), 1), front(f)),
    });
  }
}

function hardRootEquations(rng) {
  const deg = rng.pick([2, 3]);
  const top = deg === 2 ? 12 : 5;
  let a;
  let b;
  do {
    a = rng.int(1, top);
    b = rng.int(2, top);
  } while (gcd(a, b) !== 1);
  const [r, p] = [frac(a, b), frac(a ** deg, b ** deg)];
  const one = (f) => m(`x = ${f.tex()}`);
  const two = (f) => m(rootsTex([f, f.neg()]));
  const root = deg === 2 ? R`\sqrt` : R`\sqrt[3]`;
  return q({
    prompt: R`Find **all** the solutions of \(x^{${deg}} = ${p.tex()}\).`,
    correct: deg === 2 ? two(r) : one(r),
    wrong:
      deg === 2
        ? [
            { value: one(r), why: R`\(${r.tex()}\) is one solution, but \(${r.neg().tex()}\) also works, because a negative number squared is positive.` },
            { value: two(frac(a * a, 2 * b * b)), why: R`\(x^{2}\) means \(x \cdot x\), not \(2x\). Take the square root of the top and of the bottom.` },
            two(frac(a, b * b)),
            two(frac(a * a, b)),
          ]
        : [
            { value: two(r), why: R`A negative number cubed is negative, so \(${r.neg().tex()}\) is not a solution. An equation \(x^{3} = p\) has only one solution.` },
            { value: one(frac(a ** 3, 3 * b ** 3)), why: R`\(x^{3}\) means \(x \cdot x \cdot x\), not \(3x\). Take the cube root of the top and of the bottom.` },
            a > 1 ? one(frac(a, b ** 3)) : null,
            one(frac(a ** 3, b)),
            one(frac(a, 3 * b)),
          ],
    solution: [R`Take the ${deg === 2 ? 'square' : 'cube'} root of the top and of the bottom: \(${root}{${a ** deg}} = ${a}\) and \(${root}{${b ** deg}} = ${b}\).`, R`Check: \(${Array(deg).fill(r.tex()).join(R` \times `)} = ${p.tex()}\). ${deg === 2 ? R`The negative works too: \(\left(${r.neg().tex()}\right)^{2} = ${p.tex()}\).` : 'The negative does not work, because a negative number cubed is negative.'}`, deg === 2 ? R`The solutions are \(${rootsTex([r, r.neg()])}\).` : R`The only solution is \(x = ${r.tex()}\).`],
    rule: 3,
    skill: deg === 2 ? 'solving with square roots' : 'solving with cube roots',
    check: () => checkAll(checkRoots((x) => x ** deg - p.value, deg === 2 ? [r.value, -r.value] : [r.value]), deg === 2 || (-r.value) ** 3 < 0 ? true : 'the negative also works'),
  });
}

function hardRootOnLine(rng) {
  for (;;) {
    const k = rng.int(2, 12);
    const n = rng.int(k * k + 1, (k + 1) ** 2 - 1);
    const root = Math.sqrt(n);
    const best = Math.round(root * 10);
    if (Math.abs(root * 10 - best) > 0.35 || best <= 10 * k || best >= 10 * k + 10) continue;
    const others = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => 10 * k + j).filter((x) => Math.abs(x - best) >= 2)).slice(0, 3);
    const spots = [best, ...others].sort((x, y) => x - y);
    const letter = (x) => 'ABCD'[spots.indexOf(x)];
    const other = best < root * 10 ? best + 1 : best - 1;
    const [lo, hi] = [Math.min(best, other), Math.max(best, other)];
    const tenth = (x) => num(x / 10, { fixed: 1 });
    return q({
      prompt: R`Which point on the number line is closest to \(\sqrt{${n}}\)?`,
      visual: {
        type: 'numberLine',
        min: k,
        max: k + 1,
        step: 0.1,
        labels: [k, k + 0.5, k + 1].map((x) => ({ value: x, text: num(x) })),
        points: spots.map((x) => ({ value: x / 10, label: letter(x) })),
        alt: `A number line from ${k} to ${k + 1} with a tick mark at every tenth. ${spots.map((x) => `Point ${letter(x)} is at ${tenth(x)}`).join('. ')}.`,
      },
      correct: `Point ${letter(best)}`,
      wrong: others.map((x) => `Point ${letter(x)}`),
      solution: [R`\(${k}^{2} = ${k * k}\) and \(${k + 1}^{2} = ${(k + 1) ** 2}\), so \(\sqrt{${n}}\) is between \(${k}\) and \(${k + 1}\).`, R`Square the tenths: \(${tenth(lo)}^{2} = ${num((lo * lo) / 100)}\) and \(${tenth(hi)}^{2} = ${num((hi * hi) / 100)}\). \(${n}\) is between these, and it is much closer to \(${num((best * best) / 100)}\).`, R`So \(\sqrt{${n}} \approx ${tenth(best)}\). The point at \(${tenth(best)}\) is point ${letter(best)}.`],
      rule: 4,
      skill: 'roots on a number line',
      check: () => (others.length === 3 && others.every((x) => Math.abs(x / 10 - root) > Math.abs(best / 10 - root) + 0.1) ? true : 'another point is as close'),
    });
  }
}

// ───────────── Challenge: work backwards, mixed notation, comparing ─────────────

function challengeMissingExponent(rng) {
  const numeric = rng.bool();
  const b = numeric ? rng.pick([2, 3, 5, 7, 10]) : rng.pick(['x', 'y', 'a']);
  const t = numeric ? b : 1.3;
  const kind = rng.pick(['product', 'power', 'twoStep']);
  const plain = (x) => x !== 0 && x !== 1;
  for (;;) {
    const n = rng.nonzero(-9, 9);
    const u = kind === 'product' ? rng.nonzero(-9, 9) : kind === 'power' ? rng.sign() * rng.int(2, 5) : rng.int(2, 4);
    const c = rng.nonzero(-9, 9);
    const k = kind === 'product' ? n + u : kind === 'power' ? n * u : u * n - c;
    if (!plain(k) || !plain(u) || !plain(c) || Math.abs(k) > 24 || (kind === 'power' && n === 1)) continue;
    const spec = {
      product: {
        eq: R`${b}^{n} \cdot ${pw(b, u)} = ${pw(b, k)}`,
        left: (x) => x ** n * x ** u,
        wrong: [{ value: k + u, why: R`The exponents on the left are added: \(n + ${paren(u)} = ${k}\). To undo that, subtract \(${paren(u)}\) from \(${k}\).` }, k % u === 0 ? { value: k / u, why: 'Multiplying powers adds the exponents. It does not multiply them.' } : null, u - k],
        solution: [R`Multiplying powers of the same base adds the exponents, so \(n + ${paren(u)} = ${k}\).`, R`${u > 0 ? `Subtract \\(${u}\\) from` : `Add \\(${-u}\\) to`} both sides: \(n = ${k} ${signed(-u)} = ${n}\).`, R`Check: \(${n} + ${paren(u)} = ${k}\). ✓`],
      },
      power: {
        eq: R`(${b}^{n})^{${u}} = ${pw(b, k)}`,
        left: (x) => (x ** n) ** u,
        wrong: [{ value: k - u, why: R`A power raised to a power multiplies the exponents: \(${terms([[u, 'n']])} = ${k}\). To undo that, divide.` }, { value: k * u, why: R`The exponents are multiplied to give \(${k}\), so divide \(${k}\) by \(${paren(u)}\) to find \(n\).` }, -n],
        solution: [R`A power raised to a power multiplies the exponents, so \(${terms([[u, 'n']])} = ${k}\).`, R`Divide both sides by \(${u}\): \(n = ${n}\).`, R`Check: \(${dot(n, u)} = ${k}\). ✓`],
      },
      twoStep: {
        eq: R`\dfrac{(${b}^{n})^{${u}}}{${pw(b, c)}} = ${pw(b, k)}`,
        left: (x) => (x ** n) ** u / x ** c,
        wrong: [{ value: k + c, why: R`That is the value of \(${u}n\). Divide it by \(${u}\) to find \(n\).` }, (k - c) % u === 0 ? { value: (k - c) / u, why: R`Dividing subtracts the bottom exponent: \(${u}n - ${paren(c)} = ${k}\). To undo that, add \(${paren(c)}\) to \(${k}\).` } : null, -n, n + u],
        solution: [R`A power raised to a power multiplies the exponents: \((${b}^{n})^{${u}} = ${b}^{${u}n}\).`, R`Dividing subtracts the bottom exponent, so \(${u}n - ${paren(c)} = ${k}\).`, R`${c > 0 ? 'Add' : 'Subtract'} \(${Math.abs(c)}\) ${c > 0 ? 'to' : 'from'} both sides: \(${u}n = ${k + c}\). Divide by \(${u}\): \(n = ${n}\).`],
      },
    }[kind];
    return q({
      prompt: R`What value of \(n\) makes this equation true? \(\;${spec.eq}\)`,
      correct: n,
      fmt: (x) => R`\(n = ${num(x)}\)`,
      wrong: spec.wrong,
      solution: spec.solution,
      rule: kind === 'product' ? 0 : 1,
      skill: 'missing exponents',
      check: () => checkEqual(spec.left(t) / t ** k, 1),
    });
  }
}

function challengeSciAddSub(rng) {
  const sub = rng.bool(0.4);
  const story = rng.bool(0.4);
  for (;;) {
    const gap = rng.pick([1, 1, 2]);
    const A = rng.int(11, 99);
    const B = gap === 1 ? rng.int(11, 99) : 10 * rng.int(1, 9);
    const n = story ? rng.int(3, 6) : rng.nonzero(-6, 7);
    const hi = n + gap;
    const total = sub ? A * 10 ** gap - B : A * 10 ** gap + B;
    const digits = String(total).length;
    const [f, e] = [total / 10 ** (digits - 1), n + digits - 2];
    if (hi === 0 || e === 0) continue;
    const [a, b, small, rawFront] = [A / 10, B / 10, B / 10 ** (gap + 1), total / 10 ** (gap + 1)];
    const plainB = B * 10 ** (n - 1);
    const [x, y] = [sci(a, hi), sci(b, n)];
    const mixedUp = round(sub ? a - b : a + b, 1);
    const tail = 'Give the answer in scientific notation.';
    const prompt = !story
      ? sub
        ? R`Subtract. ${tail} \(\;${x} - ${y}\)`
        : R`Add. ${tail} \(\;${rng.bool() ? `${x} + ${y}` : `${y} + ${x}`}\)`
      : sub
        ? R`A company earned \(${x}\) dollars last year and spent ${txt(plainB)} dollars. How many dollars were left? ${tail}`
        : rng.bool()
          ? R`About \(${x}\) people in a country live in cities, and about ${txt(plainB)} live outside cities. About how many people live in the country? ${tail}`
          : R`A website had \(${x}\) visits last year. This year it had ${txt(plainB)} more visits than last year. How many visits did it have this year? ${tail}`;
    return q({
      prompt,
      correct: m(sci(f, e)),
      wrong: [{ value: sciNorm(mixedUp, hi), why: R`The front numbers can only be ${sub ? 'subtracted' : 'added'} when the powers of 10 are the same. First rewrite \(${y}\) as \(${num(small)} \times 10^{${hi}}\).` }, { value: sciNorm(mixedUp, hi + n), why: `The exponents are added only when multiplying. When ${sub ? 'subtracting' : 'adding'}, the power of 10 stays the same.` }, ...[e - 1, e + 1, e + 2, e - 2].filter((j) => j !== 0).map((j) => m(sci(f, j)))],
      solution: [
        ...(story ? [R`Write the ordinary number in scientific notation: \(${N(plainB)} = ${y}\).`] : []),
        R`The powers of 10 are different, so rewrite the smaller number with \(10^{${hi}}\): \(${y} = ${num(small)} \times 10^{${hi}}\).`,
        R`Now ${sub ? 'subtract' : 'add'} the front numbers: \(${num(a)} ${sub ? '-' : '+'} ${num(small)} = ${num(rawFront)}\).`,
        rawFront >= 10 || rawFront < 1 ? R`\(${num(rawFront)} \times 10^{${hi}}\) is not in scientific notation, so move the decimal point one place: \(${sci(f, e)}\).` : R`The answer is \(${sci(f, e)}\).`,
      ],
      rule: 6,
      skill: sub ? 'subtracting in scientific notation' : 'adding in scientific notation',
      check: () => checkAll(checkEqual((a * 10 ** hi + (sub ? -1 : 1) * b * 10 ** n) / (f * 10 ** e), 1), front(f)),
    });
  }
}

function challengeOrderRoots(rng) {
  for (;;) {
    const k = rng.int(3, 9);
    const twoRoots = rng.bool();
    const rootItem = () => {
      const x = rng.int(k * k + 1, (k + 1) ** 2 - 1);
      return { tex: R`\sqrt{${x}}`, sq: x, face: x, root: true };
    };
    const decimalItem = () => {
      const x = 10 * k + rng.int(1, 9);
      return { tex: num(x / 10), sq: (x * x) / 100, face: x / 10, root: false };
    };
    const items = twoRoots ? [rootItem(), decimalItem(), rootItem()] : [decimalItem(), rootItem(), decimalItem()];
    const sorted = [...items].sort((p, r) => p.sq - r.sq);
    const [s0, s1, s2] = sorted;
    if (s1.sq - s0.sq < 1 || s2.sq - s1.sq < 1) continue;
    const show = (list) => list.map((it) => it.tex).join(' < ');
    const decimals = items.filter((it) => !it.root);
    const word = decimals.length > 1 ? 'decimals' : 'decimal';
    const radicand = items.find((it) => it.root).sq;
    return q({
      prompt: R`Which statement puts \(${items[0].tex}\), \(${items[1].tex}\) and \(${items[2].tex}\) in order from least to greatest?`,
      correct: m(show(sorted)),
      wrong: [{ value: m(show([...items].sort((p, r) => p.face - r.face))), why: R`\(\sqrt{${radicand}}\) is much smaller than \(${radicand}\). Square the ${word} so that all three numbers can be compared in the same form.` }, m(show([s0, s2, s1])), m(show([s1, s0, s2])), m(show([s2, s1, s0])), m(show([s1, s2, s0]))],
      solution: [R`Square the ${word} so every number can be compared as a square: ${decimals.map((it) => R`\(${it.tex}^{2} = ${num(it.sq)}\)`).join(' and ')}.`, R`Compare the squares: \(${num(s0.sq)} < ${num(s1.sq)} < ${num(s2.sq)}\).`, R`Positive numbers are in the same order as their squares, so \(${show(sorted)}\).`],
      rule: 4,
      skill: 'comparing roots',
      check: () => {
        const val = (it) => (it.root ? Math.sqrt(it.sq) : it.face);
        return val(s0) < val(s1) && val(s1) < val(s2) ? true : 'the order is wrong';
      },
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'exponents-scientific',
  title: 'Exponents, Roots & Scientific Notation',
  summary: 'Use the exponent rules, find square and cube roots, estimate roots that are not whole numbers, and work with scientific notation.',
  grade: 'Grade 8',
  standards: ['CCSS 8.EE.A.1', 'CCSS 8.EE.A.2', 'CCSS 8.EE.A.3', 'CCSS 8.EE.A.4', 'CCSS 8.NS.A.2'],

  explain: {
    intro: R`An exponent counts repeated multiplication: \(2^{5}\) means five 2s multiplied together. A few rules let you combine powers without writing out every factor. Roots undo powers, and scientific notation uses powers of 10 to write very large and very small numbers.`,
    rules: [
      {
        title: 'Multiplying and dividing powers of the same base',
        text: R`To multiply powers of the same base, keep the base and **add** the exponents: \(a^{m} \cdot a^{n} = a^{m+n}\). To divide, keep the base and **subtract** the exponents: \(\frac{a^{m}}{a^{n}} = a^{m-n}\). The bases must be the same.`,
        example: R`\(5^{3} \cdot 5^{4} = 5^{7}\), because 3 factors of 5 and 4 more factors of 5 make 7 factors. \(\frac{7^{9}}{7^{3}} = 7^{6}\).`,
      },
      {
        title: 'Powers of powers and powers of products',
        text: R`To raise a power to a power, keep the base and **multiply** the exponents: \((a^{m})^{n} = a^{mn}\). An exponent outside parentheses applies to every factor inside: \((ab)^{n} = a^{n}b^{n}\).`,
        example: R`\((x^{3})^{4} = x^{12}\) and \((2x^{3})^{2} = 2^{2} \cdot x^{6} = 4x^{6}\).`,
      },
      {
        title: 'Zero and negative exponents',
        text: R`Any number except 0 raised to the power 0 is 1: \(a^{0} = 1\). A negative exponent means "1 divided by" the positive power: \(a^{-n} = \frac{1}{a^{n}}\). It does not make the number negative.`,
        example: R`\(6^{0} = 1\) and \(5^{-2} = \frac{1}{5^{2}} = \frac{1}{25}\).`,
      },
      {
        title: 'Square roots and cube roots',
        text: R`\(\sqrt{p}\) is the positive number whose square is \(p\), and \(\sqrt[3]{p}\) is the number whose cube is \(p\). For a positive number \(p\), the equation \(x^{2} = p\) has **two** solutions, \(\sqrt{p}\) and \(-\sqrt{p}\), because a negative number squared is positive. The equation \(x^{3} = p\) has **one** solution, \(\sqrt[3]{p}\).`,
        example: R`\(x^{2} = 49\) gives \(x = 7\) or \(x = -7\). \(x^{3} = 64\) gives only \(x = 4\), because \((-4)^{3} = -64\).`,
      },
      {
        title: 'Estimating square roots',
        text: R`If a whole number is not a perfect square, its square root is **irrational**: the decimal goes on forever without repeating. To estimate it, find the perfect squares just below and just above the number. To get closer, square numbers with one decimal place.`,
        example: R`\(49 < 50 < 64\), so \(\sqrt{50}\) is between 7 and 8. Since \(7.1^{2} = 50.41\), \(\sqrt{50}\) is a little less than 7.1.`,
      },
      {
        title: 'Writing numbers in scientific notation',
        text: R`Scientific notation writes a number as \(a \times 10^{n}\), where \(a\) is at least 1 and less than 10, and \(n\) is an integer. The exponent tells how many places the decimal point moved. Numbers of 10 or more have a positive exponent. Numbers between 0 and 1 have a negative exponent.`,
        example: R`\(45{,}000{,}000 = 4.5 \times 10^{7}\) and \(0.00062 = 6.2 \times 10^{-4}\).`,
      },
      {
        title: 'Calculating with scientific notation',
        text: R`To multiply or divide, work with the front numbers and the powers of 10 separately, using the exponent rules. If the front number is no longer between 1 and 10, move its decimal point and change the exponent to match. To add or subtract, first rewrite the numbers with the **same** power of 10.`,
        example: R`\((4 \times 10^{3})(5 \times 10^{4}) = 20 \times 10^{7} = 2 \times 10^{8}\). Also \(3.2 \times 10^{5} + 4.5 \times 10^{4} = 3.2 \times 10^{5} + 0.45 \times 10^{5} = 3.65 \times 10^{5}\).`,
      },
    ],
    vocab: [
      { term: 'base and exponent', def: R`In \(5^{3}\), the base is 5 and the exponent is 3. The exponent tells how many times the base is used as a factor.` },
      { term: 'perfect square', def: R`The square of a whole number, such as \(49 = 7^{2}\).` },
      { term: 'perfect cube', def: R`The cube of a whole number, such as \(64 = 4^{3}\).` },
      { term: 'square root', def: R`\(\sqrt{p}\) is the positive number whose square is \(p\).` },
      { term: 'cube root', def: R`\(\sqrt[3]{p}\) is the number whose cube is \(p\).` },
      { term: 'irrational number', def: R`A number that cannot be written as a fraction of two integers, such as \(\sqrt{2}\) or \(\pi\). Its decimal never ends and never repeats.` },
      { term: 'scientific notation', def: R`A number written as \(a \times 10^{n}\), where \(a\) is at least 1 and less than 10.` },
    ],
    mistakes: [
      R`Multiplying the exponents when multiplying powers: \(x^{3} \cdot x^{4}\) is \(x^{7}\), not \(x^{12}\).`,
      R`Reading a negative exponent as a negative number: \(2^{-3}\) is \(\frac{1}{8}\), not \(-8\).`,
      R`Giving only one solution of \(x^{2} = 25\). Both \(5\) and \(-5\) work.`,
      R`Halving instead of taking a square root: \(\sqrt{36}\) is \(6\), not \(18\).`,
      R`Stopping at an answer such as \(20 \times 10^{7}\). In scientific notation it is \(2 \times 10^{8}\).`,
    ],
    visual: {
      type: 'table',
      caption: 'Each step to the right divides by 10.',
      headers: [R`\(10^{3}\)`, R`\(10^{2}\)`, R`\(10^{1}\)`, R`\(10^{0}\)`, R`\(10^{-1}\)`, R`\(10^{-2}\)`, R`\(10^{-3}\)`],
      rows: [[R`\(1{,}000\)`, R`\(100\)`, R`\(10\)`, R`\(1\)`, R`\(\frac{1}{10}\)`, R`\(\frac{1}{100}\)`, R`\(\frac{1}{1{,}000}\)`]],
      alt: 'A table of powers of 10, from 10 to the power 3 down to 10 to the power negative 3. The values are 1,000, 100, 10, 1, one tenth, one hundredth and one thousandth. Each value is the one before it divided by 10.',
    },
  },

  examples: [
    {
      title: 'Using two exponent rules',
      problem: R`Simplify \(\dfrac{3^{5} \cdot 3^{4}}{3^{7}}\) and find its value.`,
      steps: [R`Multiply on the top by adding the exponents: \(3^{5} \cdot 3^{4} = 3^{5+4} = 3^{9}\).`, R`Divide by subtracting the exponents: \(\dfrac{3^{9}}{3^{7}} = 3^{9-7} = 3^{2}\).`, R`Find the value: \(3^{2} = 3 \times 3 = 9\).`],
      answer: R`\(3^{2} = 9\)`,
    },
    {
      title: 'A negative exponent',
      problem: R`Simplify \(\dfrac{x^{3}}{x^{7}}\). Write the answer with a positive exponent.`,
      steps: [R`Divide by subtracting the exponents: \(x^{3-7} = x^{-4}\).`, R`A negative exponent means "1 divided by" the positive power: \(x^{-4} = \frac{1}{x^{4}}\).`, R`This makes sense: the three \(x\)s on the top cancel three of the seven \(x\)s on the bottom, and four are left on the bottom.`],
      answer: R`\(\frac{1}{x^{4}}\)`,
    },
    {
      title: 'Solving with roots',
      problem: R`Find all the solutions of \(x^{2} = 81\) and of \(x^{3} = 125\).`,
      steps: [R`For \(x^{2} = 81\), look for numbers whose square is 81. \(9 \times 9 = 81\), and \((-9) \times (-9) = 81\) too.`, R`So \(x^{2} = 81\) has two solutions: \(x = 9\) or \(x = -9\).`, R`For \(x^{3} = 125\), look for the number whose cube is 125. \(5 \times 5 \times 5 = 125\), so \(x = 5\).`, R`\(-5\) does not work, because \((-5)^{3} = -125\). So \(x^{3} = 125\) has one solution.`],
      answer: R`\(x = 9\) or \(x = -9\); and \(x = 5\)`,
    },
    {
      title: 'Estimating a square root',
      problem: R`Estimate \(\sqrt{50}\) to the nearest tenth.`,
      steps: [R`Find the perfect squares on each side of 50: \(7^{2} = 49\) and \(8^{2} = 64\). So \(\sqrt{50}\) is between 7 and 8, and much closer to 7.`, R`Square numbers with one decimal place: \(7.0^{2} = 49\) and \(7.1^{2} = 50.41\). So \(\sqrt{50}\) is between 7.0 and 7.1.`, R`Check the halfway number: \(7.05^{2} = 49.7025\), which is less than 50. So \(\sqrt{50}\) is above 7.05, and it rounds to 7.1.`],
      answer: R`\(\sqrt{50} \approx 7.1\)`,
      visual: { type: 'numberLine', min: 7, max: 8, step: 0.1, points: [{ value: Math.sqrt(50), label: '√50' }], alt: 'A number line from 7 to 8 marked in tenths. The square root of 50 is marked a little to the left of 7.1.' },
    },
    {
      title: 'Word problem: how far away is the Sun?',
      word: true,
      problem: R`Light travels about \(3 \times 10^{8}\) meters each second. Sunlight takes about \(5 \times 10^{2}\) seconds to reach Earth. About how far is the Sun from Earth?`,
      steps: [R`Distance is speed times time, so multiply: \((3 \times 10^{8})(5 \times 10^{2})\).`, R`Multiply the front numbers: \(3 \times 5 = 15\).`, R`Multiply the powers of 10 by adding the exponents: \(10^{8} \cdot 10^{2} = 10^{10}\).`, R`\(15 \times 10^{10}\) is not in scientific notation, because 15 is not less than 10. Since \(15 = 1.5 \times 10\), the answer is \(1.5 \times 10^{11}\).`],
      answer: R`About \(1.5 \times 10^{11}\) meters`,
    },
  ],

  models: [
    {
      id: 'power-rules',
      title: 'Combine two powers of the same base',
      intro: 'Choose a base, two exponents and what to do with the powers. The steps show which exponent rule is used.',
      inputs: [
        { name: 'b', label: 'Base', type: 'int', min: 2, max: 10, value: 2 },
        { name: 'u', label: 'First exponent', type: 'int', min: -6, max: 6, value: 3 },
        { name: 'v', label: 'Second exponent', type: 'int', min: -6, max: 6, value: -5 },
        { name: 'op', label: 'What to do', type: 'select', value: 'times', options: [{ value: 'times', label: 'multiply the two powers' }, { value: 'divide', label: 'divide the first power by the second' }, { value: 'power', label: 'raise the first power to the second exponent' }] },
      ],
      compute({ b, u, v, op }) {
        const k = op === 'times' ? u + v : op === 'divide' ? u - v : u * v;
        const expr = op === 'times' ? R`${b}^{${u}} \cdot ${b}^{${v}}` : op === 'divide' ? R`\dfrac{${b}^{${u}}}{${b}^{${v}}}` : R`(${b}^{${u}})^{${v}}`;
        const size = b ** Math.abs(k);
        const small = size <= 1e12;
        const steps = [op === 'times' ? R`The bases are the same, so add the exponents: \(${u} + ${paren(v)} = ${k}\).` : op === 'divide' ? R`The bases are the same, so subtract the exponents: \(${u} - ${paren(v)} = ${k}\).` : R`A power is raised to a power, so multiply the exponents: \(${dot(u, v)} = ${k}\).`, R`So \(${expr} = ${b}^{${k}}\).`];
        if (k === 0) steps.push('Any number except 0 raised to the power 0 is 1.');
        if (k < 0) steps.push(R`A negative exponent means "1 divided by" the positive power: \(${b}^{${k}} = \frac{1}{${pw(b, -k)}}\).`);
        if (Math.abs(k) > 1 && small) steps.push(R`\(${b}^{${Math.abs(k)}}\) is ${Math.abs(k)} factors of \(${b}\) multiplied together: \(${N(size)}\).`);
        const answer = k === 0 ? R`\(1\)` : k > 0 ? (small ? R`\(${b}^{${k}} = ${N(size)}\)` : R`\(${b}^{${k}}\)`) : small && k < -1 ? R`\(\frac{1}{${b}^{${-k}}} = \frac{1}{${N(size)}}\)` : R`\(\frac{1}{${pw(b, -k)}}\)`;
        return { problem: R`Simplify \(${expr}\).`, steps, answer };
      },
    },
    {
      id: 'estimate-root',
      title: 'Estimate a square root',
      intro: 'Choose a whole number. The steps trap its square root between two tenths, and the number line shows where it is.',
      inputs: [{ name: 'n', label: 'Number under the root sign', type: 'int', min: 2, max: 200, value: 50 }],
      compute({ n }) {
        const root = Math.sqrt(n);
        const k = Math.floor(root);
        if (k * k === n) {
          return {
            problem: R`Estimate \(\sqrt{${n}}\).`,
            steps: [R`\(${k} \times ${k} = ${n}\), so \(${n}\) is a perfect square.`, 'Its square root is a whole number, so no estimate is needed.'],
            answer: R`\(\sqrt{${n}} = ${k}\) exactly`,
            visual: { type: 'numberLine', min: k - 1, max: k + 1, step: 0.5, points: [{ value: k, label: `√${n}` }], alt: `A number line from ${k - 1} to ${k + 1}. The square root of ${n} is marked exactly at ${k}.` },
          };
        }
        const lo = Math.floor(root * 10);
        const mid = (10 * lo + 5) ** 2 / 10000;
        const best = mid > n ? lo : lo + 1;
        const tenth = (x) => num(x / 10, { fixed: 1 });
        return {
          problem: R`Estimate \(\sqrt{${n}}\) to the nearest tenth.`,
          steps: [
            R`Find the perfect squares on each side of \(${n}\): \(${k}^{2} = ${k * k}\) and \(${k + 1}^{2} = ${(k + 1) ** 2}\). So \(\sqrt{${n}}\) is between \(${k}\) and \(${k + 1}\).`,
            R`Square numbers with one decimal place until \(${n}\) is trapped: \(${tenth(lo)}^{2} = ${num((lo * lo) / 100)}\) and \(${tenth(lo + 1)}^{2} = ${num((lo + 1) ** 2 / 100)}\). So \(\sqrt{${n}}\) is between \(${tenth(lo)}\) and \(${tenth(lo + 1)}\).`,
            R`Check the halfway number: \(${num((10 * lo + 5) / 100, { fixed: 2 })}^{2} = ${num(mid, { places: 4 })}\), which is ${mid > n ? 'more' : 'less'} than \(${n}\). So \(\sqrt{${n}}\) is closer to \(${tenth(best)}\).`,
          ],
          answer: R`\(\sqrt{${n}} \approx ${tenth(best)}\)`,
          visual: { type: 'numberLine', min: k, max: k + 1, step: 0.1, points: [{ value: root, label: `√${n}` }], alt: `A number line from ${k} to ${k + 1} marked in tenths. The square root of ${n} is marked close to ${tenth(best)}.` },
        };
      },
    },
    {
      id: 'city-water',
      title: 'Word problem: water for a whole city',
      word: true,
      intro: 'Change the two numbers, which are written in scientific notation.',
      inputs: [{ name: 'a', label: 'Liters per person: front number', type: 'number', min: 1, max: 9.9, step: 0.1, value: 3.5 }, { name: 'p', label: 'Liters per person: power of 10', type: 'int', min: 1, max: 3, value: 2 }, { name: 'b', label: 'People: front number', type: 'number', min: 1, max: 9.9, step: 0.1, value: 4 }, { name: 'r', label: 'People: power of 10', type: 'int', min: 3, max: 8, value: 6 }],
      compute({ a, p, b, r }) {
        const prod = round(a * b, 6);
        const shift = prod >= 10 ? 1 : 0;
        const [f, e] = [round(prod / 10 ** shift, 6), p + r + shift];
        return {
          problem: R`Each person in a city uses about \(${sci(a, p)}\) liters of water a day. About \(${sci(b, r)}\) people live in the city. About how many liters of water does the whole city use each day?`,
          steps: [
            R`Every person uses about the same amount, so multiply: \((${sci(a, p)})(${sci(b, r)})\).`,
            R`Multiply the front numbers: \(${num(a)} \times ${num(b)} = ${num(prod)}\).`,
            R`Multiply the powers of 10 by adding the exponents: \(10^{${p}} \cdot 10^{${r}} = 10^{${p + r}}\).`,
            shift
              ? R`\(${num(prod)} \times 10^{${p + r}}\) is not in scientific notation, because \(${num(prod)}\) is not less than 10. Since \(${num(prod)} = ${num(f)} \times 10\), the exponent goes up by 1: \(${sci(f, e)}\).`
              : R`\(${num(prod)}\) is at least 1 and less than 10, so \(${sci(f, e)}\) is already in scientific notation.`,
          ],
          answer: R`About \(${sci(f, e)}\) liters each day`,
          note: R`As an ordinary number, that is about \(${N(Math.round(prod * 10 ** (p + r)))}\) liters.`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyExponentRules, easyZeroNegative, easyRoots, easyScientific],
    medium: [mediumPowerRules, mediumSolve, mediumEstimateRoot, mediumToScientific],
    hard: [hardSimplify, hardSciProducts, hardRootEquations, hardRootOnLine],
    challenge: [challengeMissingExponent, challengeSciAddSub, challengeOrderRoots],
  },
};
