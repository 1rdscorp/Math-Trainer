import { R, q, num, frac, lcm, paren, product, money, txt, person, round, approx, sum } from '../../lib/index.js';
import { M, mixed, grid, lineFor, signedLabel, clean, unitFmt } from './_shared.js';

const deg = (v) => `${M(v)}°C`;
const meters = (v) => `${M(v)} ${v === 1 ? 'meter' : 'meters'}`;

/** Steps for a + b with signed whole numbers or decimals. */
function addSteps(a, b) {
  const s = round(a + b, 4);
  const [A, B] = [Math.abs(a), Math.abs(b)];
  const expr = R`${num(a)} + ${paren(b)}`;
  if (a === 0 || b === 0) return [R`Adding 0 changes nothing: \(${expr} = ${num(s)}\).`];
  if (a > 0 && b > 0) return [R`Both numbers are positive, so add as usual: \(${expr} = ${num(s)}\).`];
  if (a < 0 && b < 0) {
    return [R`Both numbers are negative. Add their absolute values: \(${num(A)} + ${num(B)} = ${num(round(A + B, 4))}\).`, R`The sum of two negative numbers is negative: \(${expr} = ${num(s)}\).`];
  }
  if (A === B) return [R`\(${num(a)}\) and \(${num(b)}\) are opposites, so their sum is \(0\).`];
  const big = A > B ? a : b;
  return [
    R`The signs are different. Subtract the smaller absolute value from the larger: \(${num(Math.max(A, B))} - ${num(Math.min(A, B))} = ${num(Math.abs(s))}\).`,
    R`\(${num(big)}\) has the larger absolute value, so the answer is ${big < 0 ? 'negative' : 'positive'}: \(${expr} = ${num(s)}\).`,
  ];
}

/** Steps for a − b: rewrite as adding the opposite, then add. */
function subtractSteps(a, b) {
  return [R`Subtracting is the same as adding the opposite: \(${num(a)} - ${paren(b)} = ${num(a)} + ${paren(-b)}\).`, ...addSteps(a, -b)];
}

const signWord = (x) => (x < 0 ? 'negative' : 'positive');

// ───────────── Easy: meaning of negative numbers, opposites, absolute value, order, quadrants ─────────────

const CONTEXTS = [
  { text: (n) => `A submarine is ${n} meters below sea level.`, sign: -1, zero: 'sea level', dir: 'Below sea level', max: 60 },
  { text: (n) => `A hiker stands ${n} meters above sea level.`, sign: 1, zero: 'sea level', dir: 'Above sea level', max: 60 },
  { text: (n) => `The temperature is ${n} degrees below zero.`, sign: -1, zero: 'zero degrees', dir: 'Below zero', max: 30 },
  { text: (n) => `The temperature is ${n} degrees above zero.`, sign: 1, zero: 'zero degrees', dir: 'Above zero', max: 30 },
  { text: (n) => `A bank statement shows a deposit of ${money(n)}.`, sign: 1, zero: 'no change in the balance', dir: 'A deposit (money coming in)', max: 60 },
  { text: (n) => `A bank statement shows a withdrawal of ${money(n)}.`, sign: -1, zero: 'no change in the balance', dir: 'A withdrawal (money going out)', max: 60 },
  { text: (n) => `A football team loses ${n} yards on a play.`, sign: -1, zero: 'no gain and no loss', dir: 'A loss of yards', max: 15 },
  { text: (n) => `A football team gains ${n} yards on a play.`, sign: 1, zero: 'no gain and no loss', dir: 'A gain of yards', max: 15 },
  { text: (n) => `A parking level is ${n} floors below the ground floor.`, sign: -1, zero: 'the ground floor', dir: 'Below the ground floor', max: 5 },
  { text: (n) => `A golfer finishes ${n} strokes under par.`, sign: -1, zero: 'a score of exactly par', dir: 'Under par', max: 9 },
  { text: (n) => `It is ${n} seconds before a rocket launch.`, sign: -1, zero: 'the moment of launch', dir: 'Before the launch', max: 60 },
  { text: (n) => `A shop makes a profit of ${money(n)}.`, sign: 1, zero: 'breaking even', dir: 'A profit', max: 60 },
  { text: (n) => `A shop makes a loss of ${money(n)}.`, sign: -1, zero: 'breaking even', dir: 'A loss', max: 60 },
];

function easyContext(rng) {
  const c = rng.pick(CONTEXTS);
  const n = rng.int(2, c.max);
  const ans = c.sign * n;
  const side = c.sign < 0 ? 'negative' : 'positive';
  return q({
    prompt: `${c.text(n)} Which integer represents this?`,
    correct: ans,
    wrong: [
      { value: -ans, why: `${c.dir} counts as ${side}.` },
      { value: 0, why: `0 stands for ${c.zero}.` },
      ans + 1,
      ans - 1,
    ],
    solution: [`Decide what 0 means here: ${c.zero}.`, `${c.dir} counts as ${side}.`, R`The integer is \(${ans}\).`],
    rule: 0,
    skill: 'negative numbers in context',
  });
}

function easyOpposite(rng) {
  const x = rng.nonzero(-30, 30);
  if (rng.bool(0.65)) {
    return q({
      prompt: R`What is the opposite of \(${x}\)?`,
      visual: lineFor([-Math.abs(x), Math.abs(x)], { points: [{ value: x, label: signedLabel(x).replace('+', '') }], alt: `A number line with a point at ${txt(x)}.` }),
      correct: -x,
      wrong: [
        { value: x, why: 'That is the number itself. Its opposite is the same distance from 0 on the other side.' },
        { value: 0, why: '0 is its own opposite. Every other number has an opposite on the other side of 0.' },
        -x + 1,
        -x - 1,
      ],
      solution: [R`\(${x}\) is \(${Math.abs(x)}\) ${Math.abs(x) === 1 ? 'unit' : 'units'} to the ${x < 0 ? 'left' : 'right'} of 0.`, R`Its opposite is \(${Math.abs(x)}\) ${Math.abs(x) === 1 ? 'unit' : 'units'} to the ${x < 0 ? 'right' : 'left'} of 0: \(${-x}\).`],
      rule: 0,
      skill: 'opposites',
      check: () => (x + -x === 0 ? true : 'a number and its opposite must add to 0'),
    });
  }
  const n = Math.abs(x);
  return q({
    prompt: R`What is the value of \(-(-${n})\)?`,
    correct: n,
    wrong: [
      { value: -n, why: R`\(-(-${n})\) means "the opposite of \(-${n}\)". The opposite of a negative number is positive.` },
      { value: 0, why: R`A number and its opposite add to 0, but the opposite of \(-${n}\) itself is \(${n}\).` },
      -2 * n,
      n + 1,
    ],
    solution: [R`Read \(-(-${n})\) as "the opposite of \(-${n}\)".`, R`\(-${n}\) is \(${n}\) ${n === 1 ? 'unit' : 'units'} left of 0, so its opposite is \(${n}\) ${n === 1 ? 'unit' : 'units'} right of 0.`, R`\(-(-${n}) = ${n}\).`],
    rule: 0,
    skill: 'opposites',
    check: () => (-n + n === 0 ? true : 'a number and its opposite must add to 0'),
  });
}

function easyAbsolute(rng) {
  const x = rng.nonzero(-25, 25);
  const a = Math.abs(x);
  const asDistance = rng.bool(0.4);
  return q({
    prompt: asDistance ? R`How far is \(${x}\) from 0 on the number line?` : R`What is \(|${x}|\)?`,
    visual: asDistance ? lineFor([x, 0], { points: [{ value: x, label: signedLabel(x).replace('+', '') }, { value: 0, color: 'b' }], alt: `A number line with points at ${txt(x)} and 0.` }) : undefined,
    correct: a,
    fmt: asDistance ? unitFmt('unit') : undefined,
    wrong: [
      { value: -a, why: 'Absolute value is a distance from 0, and a distance is never negative.' },
      { value: 0, why: R`Only 0 is at distance 0 from 0. \(${x}\) is \(${a}\) ${a === 1 ? 'unit' : 'units'} away.` },
      a + 1,
      a - 1,
    ],
    solution: [R`The absolute value of a number is its distance from 0.`, R`\(${x}\) is \(${a}\) ${a === 1 ? 'unit' : 'units'} from 0, so \(|${x}| = ${a}\).`],
    rule: 1,
    skill: 'absolute value',
    // The distance from 0, measured as the right-hand end minus the left-hand end.
    check: () => (Math.max(x, 0) - Math.min(x, 0) === a ? true : 'distance from 0 is wrong'),
  });
}

function easyCompare(rng) {
  for (;;) {
    const nums = rng.sample([-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 4);
    const negs = nums.filter((v) => v < 0);
    if (negs.length < 2 || !nums.some((v) => v > 0)) continue;
    const least = rng.bool(0.6);
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    const ans = least ? lo : hi;
    const trap = least ? Math.max(...negs) : Math.abs(lo) > hi ? lo : null;
    return q({
      prompt: R`Which of these numbers is the ${least ? 'least' : 'greatest'}? \(\;${nums.join(R`,\;\; `)}\)`,
      visual: { type: 'numberLine', min: -12, max: 12, step: 1, alt: 'A number line from −12 to 12.' },
      correct: ans,
      wrong: nums
        .filter((v) => v !== ans)
        .map((v) =>
          v === trap
            ? { value: v, why: least ? R`\(${v}\) is closer to 0 than \(${lo}\), so it is to the right of \(${lo}\) on the number line. That makes it greater, not less.` : R`\(${v}\) has the largest absolute value, but it is the farthest left on the number line, so it is the least.` }
            : v,
        ),
      solution: [
        'On a number line, numbers get greater as you move right and smaller as you move left.',
        R`In order from left to right: \(${[...nums].sort((p, r) => p - r).join(R`,\; `)}\).`,
        R`The ${least ? 'least is the one farthest left' : 'greatest is the one farthest right'}: \(${ans}\).`,
      ],
      rule: 1,
      skill: 'ordering',
      check: () => (nums.every((v) => (least ? ans <= v : ans >= v)) ? true : 'not the extreme value'),
    });
  }
}

const QUADRANTS = { '1,1': 'Quadrant I', '-1,1': 'Quadrant II', '-1,-1': 'Quadrant III', '1,-1': 'Quadrant IV' };
const pt = (x, y) => `(${txt(x)}, ${txt(y)})`;

function easyQuadrant(rng) {
  const x = rng.nonzero(-8, 8);
  const y = rng.nonzero(-8, 8);
  const ans = QUADRANTS[`${Math.sign(x)},${Math.sign(y)}`];
  const swapped = QUADRANTS[`${Math.sign(y)},${Math.sign(x)}`];
  return q({
    prompt: R`In which quadrant is the point \((${x}, ${y})\)?`,
    visual: grid(-9, 9, { points: [{ x, y, label: pt(x, y) }], alt: `A coordinate plane with the point ${pt(x, y)} marked.` }),
    correct: ans,
    wrong: Object.values(QUADRANTS)
      .filter((v) => v !== ans)
      .map((v) => (v === swapped ? { value: v, why: 'The first number is x (left or right). The second number is y (up or down). These two have been swapped.' } : v)),
    solution: [
      R`The x-coordinate is \(${x}\): ${x < 0 ? 'negative, so the point is left of the y-axis' : 'positive, so the point is right of the y-axis'}.`,
      R`The y-coordinate is \(${y}\): ${y < 0 ? 'negative, so the point is below the x-axis' : 'positive, so the point is above the x-axis'}.`,
      `${x < 0 ? 'Left' : 'Right'} and ${y < 0 ? 'below' : 'above'} is ${ans}.`,
    ],
    rule: 2,
    skill: 'quadrants',
  });
}

// ───────────── Medium: integer operations, ordering rationals, reflections, simple stories ─────────────

function mediumAdd(rng) {
  for (;;) {
    const a = rng.nonzero(-20, 20);
    const b = rng.nonzero(-20, 20);
    if (a > 0 && b > 0) continue;
    const s = a + b;
    const differ = Math.sign(a) !== Math.sign(b);
    return q({
      prompt: R`What is \(${a} + ${paren(b)}\)?`,
      correct: s,
      wrong: [
        differ ? { value: (Math.abs(a) > Math.abs(b) ? Math.sign(a) : Math.sign(b)) * (Math.abs(a) + Math.abs(b)), why: 'The signs are different, so the numbers pull in opposite directions. Subtract the absolute values instead of adding them.' } : { value: Math.abs(a) + Math.abs(b), why: 'Two negative numbers add to a negative number.' },
        s !== 0 ? { value: -s, why: differ ? 'The sum takes the sign of the number with the larger absolute value.' : 'Check the sign: both numbers are negative, so the sum is negative.' } : null,
        differ ? -(Math.abs(a) + Math.abs(b)) : Math.abs(Math.abs(a) - Math.abs(b)) || null,
        s + 2,
        s - 1,
      ],
      solution: addSteps(a, b),
      rule: 3,
      skill: 'adding integers',
      check: () => (s - b === a ? true : 'sum minus one addend is not the other'),
    });
  }
}

function mediumSubtract(rng) {
  for (;;) {
    const a = rng.nonzero(-20, 20);
    const b = rng.nonzero(-20, 20);
    if (a > 0 && b > 0 && a >= b) continue;
    const d = a - b;
    return q({
      prompt: R`What is \(${a} - ${paren(b)}\)?`,
      correct: d,
      wrong: [
        b < 0 ? { value: a + b, why: R`Subtracting a negative number is the same as adding its opposite: \(${a} - (${b}) = ${a} + ${-b}\).` } : { value: a + b, why: 'This adds. Subtracting a positive number moves left on the number line.' },
        d !== 0 ? { value: -d, why: 'The size is right but the sign is not. Rewrite the subtraction as adding the opposite, then check which number has the larger absolute value.' } : null,
        b - a !== -d ? b - a : null,
        Math.abs(a) + Math.abs(b) !== Math.abs(d) ? Math.abs(a) + Math.abs(b) : Math.abs(Math.abs(a) - Math.abs(b)),
        d + 2,
        d - 1,
      ],
      solution: subtractSteps(a, b),
      rule: 4,
      skill: 'subtracting integers',
      check: () => (d + b === a ? true : 'difference plus the subtrahend is not the starting number'),
    });
  }
}

function mediumMultiplyDivide(rng) {
  for (;;) {
    const a = rng.intExcept(-12, 12, [-1, 0, 1]);
    const b = rng.intExcept(-12, 12, [-1, 0, 1]);
    if (a > 0 && b > 0) continue;
    const prod = a * b;
    const same = Math.sign(a) === Math.sign(b);
    const rule = same ? 'The signs are the same, so the answer is positive.' : 'The signs are different, so the answer is negative.';
    if (rng.bool()) {
      return q({
        prompt: R`What is \(${a} \times ${paren(b)}\)?`,
        correct: prod,
        wrong: [
          { value: -prod, why: same ? 'A negative times a negative is positive.' : 'A positive times a negative (in either order) is negative.' },
          { value: a + b, why: 'This adds the numbers. The sign between them is a multiplication sign.' },
          prod + Math.abs(a),
          -(prod + Math.abs(a)),
        ],
        solution: [R`Multiply the absolute values: \(${Math.abs(a)} \times ${Math.abs(b)} = ${Math.abs(prod)}\).`, R`${rule} \(${a} \times ${paren(b)} = ${prod}\).`],
        rule: 5,
        skill: 'multiplying integers',
        check: () => (prod / b === a ? true : 'product divided by one factor is not the other'),
      });
    }
    return q({
      prompt: R`What is \(${prod} \div ${paren(b)}\)?`,
      correct: a,
      wrong: [
        { value: -a, why: prod < 0 === b < 0 ? 'A quotient of two numbers with the same sign is positive.' : 'A quotient of two numbers with different signs is negative.' },
        { value: prod * b, why: 'This multiplies. The sign between the numbers is a division sign.' },
        a + 1,
        -(a + 1),
      ],
      solution: [
        R`Divide the absolute values: \(${Math.abs(prod)} \div ${Math.abs(b)} = ${Math.abs(a)}\).`,
        R`${prod < 0 === b < 0 ? 'The signs are the same, so the answer is positive.' : 'The signs are different, so the answer is negative.'} \(${prod} \div ${paren(b)} = ${a}\).`,
        R`Check by multiplying back: \(${a} \times ${paren(b)} = ${prod}\). ✓`,
      ],
      rule: 5,
      skill: 'dividing integers',
      check: () => (a * b === prod ? true : 'quotient times divisor is not the dividend'),
    });
  }
}

const ORDER_POOL = [
  ...[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => [String(v), v]),
  ...[-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, -0.25, -0.75, 0.25, 0.75, -1.2, -2.8, 1.8, -3.1].map((v) => [num(v), v]),
  ...[[-1, 2], [1, 2], [-3, 4], [3, 4], [-1, 4], [1, 4], [-2, 3], [2, 3], [-5, 2], [5, 2], [-7, 4], [-4, 3], [-1, 3], [-9, 2]].map(([n, d]) => [frac(n, d).tex(), n / d]),
];

function mediumOrder(rng) {
  for (;;) {
    const picks = rng.sample(ORDER_POOL, 4);
    const vals = picks.map((p) => p[1]);
    if (new Set(vals).size < 4 || new Set(vals.map(Math.abs)).size < 4) continue;
    if (vals.filter((v) => v < 0).length < 2 || !vals.some((v) => v > 0) || picks.every((p) => Number.isInteger(p[1]))) continue;
    const list = (arr) => R`\(${arr.map((p) => p[0]).join(R`,\;\; `)}\)`;
    const asc = [...picks].sort((a, b) => a[1] - b[1]);
    const byAbs = [...picks].sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]));
    const negsFlipped = [...asc.filter((p) => p[1] < 0).reverse(), ...asc.filter((p) => p[1] >= 0)];
    // The fractions, each with its decimal value ("≈" when the decimal is rounded).
    const asDecimals = picks.filter((p) => p[0] !== num(p[1])).map((p) => R`\(${p[0]} ${clean(p[1], 2) == null ? R`\approx` : '='} ${num(p[1], { places: 2 })}\)`);
    return q({
      prompt: `Which list shows these numbers in order from least to greatest? ${list(picks)}`,
      correct: list(asc),
      wrong: [
        { value: list(negsFlipped), why: 'Among negative numbers, the one farther from 0 is the smaller one.' },
        { value: list([...asc].reverse()), why: 'That list goes from greatest to least.' },
        { value: list(byAbs), why: 'This orders the numbers by their distance from 0. A negative number far from 0 is small, not large.' },
        list([asc[1], asc[0], asc[2], asc[3]]),
        list([asc[0], asc[1], asc[3], asc[2]]),
      ],
      solution: [
        asDecimals.length ? `Write ${asDecimals.length > 1 ? 'the fractions as decimals' : 'the fraction as a decimal'} to compare: ${asDecimals.length > 2 ? `${asDecimals.slice(0, -1).join(', ')} and ${asDecimals.at(-1)}` : asDecimals.join(' and ')}.` : null,
        'Negative numbers are to the left of 0, and the farther left a number is, the smaller it is.',
        `From left to right on the number line: ${list(asc)}.`,
      ].filter(Boolean),
      rule: 1,
      skill: 'ordering',
      check: () => (asc.every((p, i) => i === 0 || asc[i - 1][1] < p[1]) ? true : 'list is not increasing'),
    });
  }
}

function mediumReflect(rng) {
  for (;;) {
    const x = rng.nonzero(-8, 8);
    const y = rng.nonzero(-8, 8);
    if (Math.abs(x) === Math.abs(y)) continue;
    const axis = rng.pick(['x', 'y']);
    const P = (a, b) => R`\((${a}, ${b})\)`;
    const ans = axis === 'x' ? [x, -y] : [-x, y];
    const other = axis === 'x' ? [-x, y] : [x, -y];
    return q({
      prompt: R`The point \((${x}, ${y})\) is reflected across the ${axis}-axis. What are the coordinates of its image?`,
      visual: grid(-9, 9, { points: [{ x, y, label: pt(x, y) }], alt: `A coordinate plane with the point ${pt(x, y)} marked.` }),
      correct: P(...ans),
      wrong: [
        { value: P(...other), why: `That is the reflection across the ${axis === 'x' ? 'y' : 'x'}-axis. A reflection across the ${axis}-axis keeps the ${axis}-coordinate and changes the sign of the other one.` },
        { value: P(-x, -y), why: 'Only one coordinate changes sign in a reflection across one axis.' },
        P(y, x),
        P(x, y),
      ],
      solution: [
        `A reflection across the ${axis}-axis flips the point to the other side of that axis, the same distance away.`,
        `The ${axis}-coordinate stays the same. The ${axis === 'x' ? 'y' : 'x'}-coordinate changes to its opposite.`,
        `The image is ${P(...ans)}.`,
      ],
      rule: 2,
      skill: 'reflections',
      // The mirror line passes through the midpoint of a point and its image.
      check: () => ((axis === 'x' ? ans[0] === x && (ans[1] + y) / 2 === 0 : ans[1] === y && (ans[0] + x) / 2 === 0) ? true : 'the image is not the mirror point'),
    });
  }
}

function mediumStory(rng) {
  const name = person(rng);
  const kind = rng.pick(['temp', 'dive', 'bank']);
  const up = rng.bool();
  if (kind === 'temp') {
    const a = rng.int(-15, 8);
    const d = rng.int(3, 20);
    const ans = up ? a + d : a - d;
    return q({
      prompt: `At 6 a.m. the temperature was ${M(a)}°C. By noon it had ${up ? 'risen' : 'fallen'} ${d} degrees. What was the temperature at noon?`,
      correct: ans,
      fmt: deg,
      wrong: [
        { value: up ? a - d : a + d, why: up ? 'A rise in temperature is added.' : 'A fall in temperature is subtracted.' },
        ans !== 0 ? { value: -ans, why: 'The size is right, but check the sign by thinking about which side of 0 the temperature ends on.' } : null,
        ans + 2,
        ans - 2,
      ],
      solution: [`A ${up ? 'rise' : 'fall'} of ${d} degrees means ${up ? 'add' : 'subtract'} ${d}: \\(${a} ${up ? '+' : '-'} ${d}\\).`, ...(up ? addSteps(a, d) : subtractSteps(a, d)), `The temperature at noon was ${deg(ans)}.`],
      rule: up ? 3 : 4,
      skill: 'word problems',
      check: () => ((up ? ans - d : ans + d) === a ? true : 'undoing the change does not give the start'),
    });
  }
  if (kind === 'dive') {
    const a = rng.int(8, 40);
    const d = up ? rng.int(3, a - 2) : rng.int(3, 25);
    const ans = up ? -a + d : -a - d;
    return q({
      prompt: `A diver is ${a} meters below the surface of the sea, at an elevation of ${M(-a)} meters. The diver ${up ? 'rises' : 'goes down'} ${d} meters. What is the diver's new elevation?`,
      correct: ans,
      fmt: meters,
      wrong: [
        { value: up ? -a - d : -a + d, why: up ? 'Rising moves toward the surface, so add.' : 'Going down moves farther from the surface, so subtract.' },
        { value: -ans, why: 'The diver is still below the surface, so the elevation is negative.' },
        ans + 2,
        ans - 2,
      ],
      solution: [`${up ? 'Rising' : 'Going down'} ${d} meters means ${up ? 'add' : 'subtract'} ${d}: \\(${-a} ${up ? '+' : '-'} ${d}\\).`, ...(up ? addSteps(-a, d) : subtractSteps(-a, d)), `The new elevation is ${meters(ans)}.`],
      rule: up ? 3 : 4,
      skill: 'word problems',
      check: () => ((up ? ans - d : ans + d) === -a ? true : 'undoing the change does not give the start'),
    });
  }
  const a = rng.int(5, 60);
  const d = rng.int(10, 90);
  const ans = up ? -a + d : -a - d;
  return q({
    prompt: `${name}'s bank account is overdrawn: the balance is ${money(-a)}. ${name} ${up ? `deposits ${money(d)}` : `spends another ${money(d)}`}. What is the new balance?`,
    correct: ans,
    fmt: money,
    wrong: [
      { value: up ? -a - d : -a + d, why: up ? 'A deposit adds money to the account.' : 'Spending takes money out of the account.' },
      ans !== 0 ? { value: -ans, why: 'The size is right. Check the sign: is there money in the account, or is money still owed?' } : null,
      up ? a + d : null,
      ans + 10,
      ans - 5,
    ],
    solution: [`${up ? 'A deposit of' : 'Spending'} ${money(d)} means ${up ? 'add' : 'subtract'} ${d}: \\(${-a} ${up ? '+' : '-'} ${d}\\).`, ...(up ? addSteps(-a, d) : subtractSteps(-a, d)), `The new balance is ${money(ans)}.`],
    rule: up ? 3 : 4,
    skill: 'word problems',
    check: () => ((up ? ans - d : ans + d) === -a ? true : 'undoing the change does not give the start'),
  });
}

// ───────────── Hard: signed decimals and fractions, order of operations, stories that need setting up ─────────────

function hardDecimals(rng) {
  for (;;) {
    const a = round(rng.sign() * rng.int(3, 95) * 0.1, 1);
    const b = round(rng.sign() * rng.int(3, 95) * 0.1, 1);
    const add = rng.bool();
    if (a > 0 && b > 0 && (add || a > b)) continue;
    const ans = round(add ? a + b : a - b, 1);
    const other = round(add ? a - b : a + b, 1);
    return q({
      prompt: R`What is \(${num(a)} ${add ? '+' : '-'} ${paren(b)}\)?`,
      correct: ans,
      wrong: [
        { value: other, why: add ? 'Adding a negative number moves left on the number line. Adding a positive number moves right.' : 'Subtracting is the same as adding the opposite. Check the sign of the number being subtracted.' },
        ans !== 0 ? { value: -ans, why: 'The size is right but the sign is not. The answer takes the sign of the number with the larger absolute value.' } : null,
        other !== 0 ? -other : null,
        round(ans + 1, 1),
        round(ans - 0.1, 1),
      ],
      solution: add ? addSteps(a, b) : subtractSteps(a, b),
      rule: 6,
      skill: 'signed decimals',
      check: () => (approx(add ? ans - b : ans + b, a) ? true : 'undoing the operation does not give the first number'),
    });
  }
}

function signedFrac(rng) {
  for (;;) {
    const d = rng.int(2, 8);
    const n = rng.int(1, d + 3);
    const f = frac(rng.sign() * n, d);
    if (!f.isInt()) return f;
  }
}

function hardFractions(rng) {
  for (;;) {
    const x = signedFrac(rng);
    const y = signedFrac(rng);
    const op = rng.pick(['+', '-', 'times', 'div']);
    if (x.n > 0 && y.n > 0) continue;
    const wrap = (f) => (f.n < 0 ? R`\left(${f.tex()}\right)` : f.tex());
    if (op === '+' || op === '-') {
      const ans = op === '+' ? x.add(y) : x.sub(y);
      const L = lcm(x.d, y.d);
      if (L > 24 || ans.n === 0) continue;
      const nx = x.n * (L / x.d);
      const ny = y.n * (L / y.d);
      const top = op === '+' ? nx + ny : nx - ny;
      return q({
        prompt: R`What is \(${x.tex()} ${op} ${wrap(y)}\)? Give the answer in simplest form.`,
        correct: ans,
        fmt: mixed,
        wrong: [
          { value: op === '+' ? x.sub(y) : x.add(y), why: op === '+' ? 'Check the sign of the second number. Adding a negative moves left; adding a positive moves right.' : 'Subtracting is the same as adding the opposite. Change the sign of the second number, then add.' },
          { value: ans.neg(), why: 'The size is right but the sign is not. Compare the absolute values to decide the sign.' },
          frac(x.n + y.n, x.d + y.d),
        ],
        solution: [
          x.d === y.d
            ? 'The denominators are already the same, so work with the numerators.'
            : R`Use the common denominator \(${L}\): ${[[x, nx], [y, ny]].filter(([f]) => f.d !== L).map(([f, n]) => R`\(${f.tex()} = ${n < 0 ? '-' : ''}\frac{${Math.abs(n)}}{${L}}\)`).join(' and ')}.`,
          op === '+' ? R`Add the numerators, keeping their signs: \(${nx} + ${paren(ny)} = ${top}\).` : R`Subtract the numerators, keeping their signs: \(${nx} - ${paren(ny)} = ${nx} + ${paren(-ny)} = ${top}\).`,
          R`So the answer is \(${top < 0 ? '-' : ''}\frac{${Math.abs(top)}}{${L}}${ans.d !== L || Math.abs(ans.n) > ans.d ? ` = ${ans.mixedTex()}` : ''}\).`,
        ],
        rule: 6,
        skill: 'signed fractions',
        check: () => ((op === '+' ? ans.sub(y) : ans.add(y)).eq(x) ? true : 'undoing the operation does not give the first number'),
      });
    }
    const ans = op === 'times' ? x.mul(y) : x.div(y);
    if (ans.d > 40 || Math.abs(ans.n) > 60) continue;
    const same = x.n < 0 === y.n < 0;
    const sym = op === 'times' ? R`\times` : R`\div`;
    const [ax, ay] = [x.abs(), y.abs()];
    return q({
      prompt: R`What is \(${x.tex()} ${sym} ${wrap(y)}\)? Give the answer in simplest form.`,
      correct: ans,
      fmt: mixed,
      wrong: [
        { value: ans.neg(), why: same ? 'Two numbers with the same sign give a positive answer.' : 'Two numbers with different signs give a negative answer.' },
        { value: op === 'times' ? x.div(y) : x.mul(y), why: op === 'times' ? 'This divides. To multiply fractions, multiply the tops and multiply the bottoms.' : 'To divide by a fraction, multiply by its reciprocal.' },
        (op === 'times' ? x.div(y) : x.mul(y)).neg(),
      ],
      solution: [
        `${same ? 'The signs are the same, so the answer is positive.' : 'The signs are different, so the answer is negative.'} Now work with the absolute values.`,
        op === 'times'
          ? R`Multiply the tops and the bottoms: \(${ax.tex()} \times ${ay.tex()} = \frac{${ax.n * ay.n}}{${ax.d * ay.d}}\).`
          : R`Multiply by the reciprocal: \(${ax.tex()} \div ${ay.tex()} = ${ax.tex()} \times ${ay.inv().tex()} = \frac{${ax.n * ay.d}}{${ax.d * ay.n}}\).`,
        R`With the sign and in simplest form: \(${ans.mixedTex()}\).`,
      ],
      rule: 6,
      skill: 'signed fractions',
      check: () => ((op === 'times' ? ans.div(y) : ans.mul(y)).eq(x) ? true : 'undoing the operation does not give the first number'),
    });
  }
}

function hardExpression(rng) {
  const kind = rng.pick(['addTimes', 'subTimes', 'paren', 'divide']);
  if (kind === 'addTimes' || kind === 'subTimes') {
    const a = rng.nonzero(-12, 12);
    const b = rng.intExcept(-7, 7, [-1, 0, 1]);
    const c = rng.intExcept(-7, 7, [-1, 0, 1]);
    if (b > 0 && c > 0) return hardExpression(rng);
    const plus = kind === 'addTimes';
    const ans = plus ? a + b * c : a - b * c;
    const ltr = plus ? (a + b) * c : (a - b) * c;
    return q({
      prompt: R`Evaluate \(${a} ${plus ? '+' : '-'} ${paren(b)} \times ${paren(c)}\).`,
      correct: ans,
      wrong: [
        { value: ltr, why: 'Multiply before you add or subtract, even when the multiplication is written second.' },
        { value: plus ? a - b * c : a + b * c, why: R`Check the sign of the product: \(${paren(b)} \times ${paren(c)} = ${b * c}\).` },
        -ans || null,
        ans + 2,
      ],
      solution: [
        R`Multiply first: \(${paren(b)} \times ${paren(c)} = ${b * c}\).`,
        plus ? R`Then add: \(${a} + ${paren(b * c)} = ${ans}\).` : R`Then subtract by adding the opposite: \(${a} - ${paren(b * c)} = ${a} + ${paren(-b * c)} = ${ans}\).`,
      ],
      rule: 5,
      skill: 'order of operations',
      check: () => (ans === (plus ? a + b * c : a - b * c) && (ans - a) % b === 0 ? true : 'value is wrong'),
    });
  }
  if (kind === 'paren') {
    const a = rng.intExcept(-6, 6, [-1, 0, 1]);
    const b = rng.int(-9, 9);
    const c = rng.intExcept(-9, 9, [b - 1, b, b + 1]);
    const e = rng.intExcept(-6, 6, [-1, 0, 1]);
    const k = rng.nonzero(-6, 6);
    const d = e * k;
    if (a > 0 && b - c > 0 && d > 0 && e > 0) return hardExpression(rng);
    const ans = a * (b - c) + k;
    return q({
      prompt: R`Evaluate \(${a}(${b} - ${paren(c)}) + ${paren(d)} \div ${paren(e)}\).`,
      correct: ans,
      wrong: [
        { value: a * b - c + k, why: R`The number in front multiplies the whole parentheses. Work out \(${b} - ${paren(c)}\) first.` },
        { value: -a * (b - c) + k, why: R`Check the sign of \(${a} \times ${paren(b - c)}\).` },
        { value: a * (b - c) - k, why: R`Check the sign of \(${paren(d)} \div ${paren(e)}\).` },
        ans + 1,
      ],
      solution: [
        R`Parentheses first: \(${b} - ${paren(c)} = ${b - c}\).`,
        R`Multiply and divide: \(${a} \times ${paren(b - c)} = ${a * (b - c)}\) and \(${paren(d)} \div ${paren(e)} = ${k}\).`,
        R`Add: \(${a * (b - c)} + ${paren(k)} = ${ans}\).`,
      ],
      rule: 5,
      skill: 'order of operations',
      check: () => (ans === a * (b - c) + d / e ? true : 'value is wrong'),
    });
  }
  const c = rng.intExcept(-6, 6, [-1, 0, 1]);
  const k = rng.nonzero(-7, 7);
  const b = rng.nonzero(-9, 9);
  const a = c * k + b;
  const d = rng.nonzero(-9, 9);
  const ans = k - d;
  return q({
    prompt: R`Evaluate \((${a} - ${paren(b)}) \div ${paren(c)} - ${paren(d)}\).`,
    correct: ans,
    wrong: [
      { value: k + d, why: R`Subtracting \(${paren(d)}\) is the same as adding \(${-d}\).` },
      { value: -k - d, why: R`Check the sign of \(${a - b} \div ${paren(c)}\).` },
      b % c === 0 ? { value: a - b / c - d, why: 'Do the subtraction inside the parentheses before dividing.' } : null,
      ans + 2,
      ans - 1,
    ],
    solution: [
      R`Parentheses first: \(${a} - ${paren(b)} = ${a - b}\).`,
      R`Divide: \(${a - b} \div ${paren(c)} = ${k}\).`,
      R`Subtract by adding the opposite: \(${k} - ${paren(d)} = ${k} + ${paren(-d)} = ${ans}\).`,
    ],
    rule: 5,
    skill: 'order of operations',
    check: () => (ans === (a - b) / c - d ? true : 'value is wrong'),
  });
}

function hardStory(rng) {
  const name = person(rng);
  const kind = rng.pick(['difference', 'account', 'rate', 'warmer']);
  if (kind === 'difference') {
    const a = rng.int(120, 900);
    const b = rng.int(15, 95);
    return q({
      prompt: `The top of a hill is ${a} meters above sea level. The floor of a nearby lake is ${b} meters below sea level. What is the difference between these two elevations?`,
      correct: a + b,
      unit: 'meters',
      wrong: [
        { value: a - b, why: R`The lake floor is at \(-${b}\) meters. The difference is \(${a} - (-${b})\), and subtracting a negative means adding.` },
        { value: -(a + b), why: 'A difference between two positions is a distance, so it is positive.' },
        a + b + 10,
        a,
      ],
      solution: [
        R`Write both elevations as signed numbers: \(${a}\) and \(-${b}\).`,
        R`Subtract the lower from the higher: \(${a} - (-${b}) = ${a} + ${b} = ${a + b}\).`,
        `The two points are on opposite sides of sea level, so their distances from it add up: ${a + b} meters.`,
      ],
      rule: 4,
      skill: 'word problems',
      check: () => (Math.abs(a - -b) === a + b ? true : 'distance is wrong'),
    });
  }
  if (kind === 'warmer') {
    const a = rng.int(2, 14);
    const b = rng.int(-1, 10);
    const lo = -a;
    if (b <= lo) return hardStory(rng);
    return q({
      prompt: `One winter day the temperature was ${M(lo)}°C at dawn and ${M(b)}°C in the afternoon. How many degrees warmer was the afternoon than dawn?`,
      correct: b - lo,
      fmt: unitFmt('degree'),
      wrong: [
        b + lo !== b - lo ? { value: Math.abs(b + lo), why: R`Find the difference by subtracting: \(${b} - (${lo})\). Subtracting a negative means adding.` } : null,
        { value: -(b - lo), why: 'The afternoon was warmer, so the difference is positive.' },
        b - lo + 2,
        a,
      ],
      solution: [R`"How many degrees warmer" asks for a difference: \(${b} - (${lo})\).`, ...subtractSteps(b, lo), `The afternoon was ${b - lo} ${b - lo === 1 ? 'degree' : 'degrees'} warmer.`],
      rule: 4,
      skill: 'word problems',
      check: () => (lo + (b - lo) === b ? true : 'difference is wrong'),
    });
  }
  if (kind === 'account') {
    const start = -rng.int(8, 60) * 0.5;
    const dep = rng.int(20, 80);
    const buy = rng.int(21, 99) * 0.25;
    const ans = round(start + dep - buy, 2);
    return q({
      prompt: `${name}'s account balance is ${money(start)}. ${name} deposits ${money(dep)} and then pays ${money(buy)} for a book. What is the balance now?`,
      correct: ans,
      fmt: money,
      wrong: [
        { value: round(-start + dep - buy, 2), why: `The starting balance is negative: ${name} owed money. Start from ${M(start)}, not ${M(-start)}.` },
        { value: round(start + dep + buy, 2), why: 'Paying for something takes money out, so subtract it.' },
        { value: round(start - dep - buy, 2), why: 'A deposit puts money in, so add it.' },
        round(ans + 1, 2),
      ],
      solution: [
        R`Write the changes as one expression: \(${num(start)} + ${dep} - ${num(buy)}\).`,
        R`Add the deposit: \(${num(start)} + ${dep} = ${num(round(start + dep, 2))}\).`,
        R`Subtract the payment: \(${num(round(start + dep, 2))} - ${num(buy)} = ${num(ans)}\). The balance is ${money(ans)}.`,
      ],
      rule: 6,
      skill: 'word problems',
      check: () => (approx(ans + buy - dep, start) ? true : 'balance is wrong'),
    });
  }
  const s = rng.int(10, 80);
  const r = rng.int(4, 15);
  const t = rng.int(3, 9);
  const ans = -s - r * t;
  return q({
    prompt: `A submarine is at an elevation of ${M(-s)} meters. It goes down ${r} meters each minute for ${t} minutes. What is its elevation then?`,
    correct: ans,
    fmt: meters,
    wrong: [
      { value: -s + r * t, why: 'Going down makes the elevation more negative, so the change is negative.' },
      { value: -s - r, why: `That is the elevation after 1 minute. The submarine goes down for ${t} minutes.` },
      { value: -ans, why: 'The submarine is below sea level, so its elevation is negative.' },
      ans - r,
    ],
    solution: [
      R`Going down ${r} meters a minute is a change of \(-${r}\) each minute. In ${t} minutes: \(${t} \times (-${r}) = ${-r * t}\).`,
      R`Add the change to the start: \(${-s} + (${-r * t}) = ${ans}\).`,
      `The elevation is ${meters(ans)}.`,
    ],
    rule: 5,
    skill: 'word problems',
    check: () => ((ans + s) / t === -r ? true : 'elevation is wrong'),
  });
}

// ───────────── Challenge ─────────────

function challengeMissing(rng) {
  const kind = rng.pick(['+', '-', 'times', 'div']);
  const x = rng.intExcept(-12, 12, kind === '+' || kind === '-' ? [0] : [-1, 0, 1]);
  const b = rng.intExcept(-12, 12, [-1, 0, 1]);
  if (x > 0 && b > 0) return challengeMissing(rng); // at least one negative number, or it is a Grade 3 question
  const box = R`\square`;
  if (kind === '+') {
    const c = x + b;
    return q({
      prompt: R`What number goes in the box? \(\;${box} + ${paren(b)} = ${c}\)`,
      correct: x,
      wrong: [{ value: c + b, why: R`To undo adding \(${b}\), subtract \(${b}\) from the result.` }, x !== 0 ? -x : null, b - c !== x ? b - c : null, x + 2, x - 1],
      solution: [R`Undo the addition: \(${box} = ${c} - ${paren(b)}\).`, ...subtractSteps(c, b), R`Check: \(${x} + ${paren(b)} = ${c}\). ✓`],
      rule: 4,
      skill: 'missing number',
      check: () => (x + b === c ? true : 'box does not work'),
    });
  }
  if (kind === '-') {
    const c = b - x;
    return q({
      prompt: R`What number goes in the box? \(\;${b} - ${box} = ${c}\)`,
      correct: x,
      wrong: [{ value: c - b, why: R`The box is being subtracted from \(${b}\). It equals \(${b} - ${paren(c)}\), not \(${c} - ${paren(b)}\).` }, { value: b + c, why: R`Start at \(${b}\) and ask what must be taken away to reach \(${c}\): that is \(${b} - ${paren(c)}\).` }, x + 2, x - 1, -x - 1],
      solution: [R`The box is the difference between the start and the result: \(${box} = ${b} - ${paren(c)}\).`, ...subtractSteps(b, c), R`Check: \(${b} - ${paren(x)} = ${c}\). ✓`],
      rule: 4,
      skill: 'missing number',
      check: () => (b - x === c ? true : 'box does not work'),
    });
  }
  if (kind === 'times') {
    const c = x * b;
    return q({
      prompt: R`What number goes in the box? \(\;${box} \times ${paren(b)} = ${c}\)`,
      correct: x,
      wrong: [{ value: -x, why: R`Check the signs: \(${-x} \times ${paren(b)} = ${-c}\), not \(${c}\).` }, { value: c * b, why: 'Undo a multiplication with a division.' }, c - b !== x ? c - b : null, x + 1, x - 1],
      solution: [R`Undo the multiplication: \(${box} = ${c} \div ${paren(b)}\).`, R`\(${Math.abs(c)} \div ${Math.abs(b)} = ${Math.abs(x)}\), and the signs are ${c < 0 === b < 0 ? 'the same, so the quotient is positive' : 'different, so the quotient is negative'}.`, R`\(${box} = ${x}\). Check: \(${x} \times ${paren(b)} = ${c}\). ✓`],
      rule: 5,
      skill: 'missing number',
      check: () => (x * b === c ? true : 'box does not work'),
    });
  }
  const total = x * b;
  return q({
    prompt: R`What number goes in the box? \(\;${box} \div ${paren(b)} = ${x}\)`,
    correct: total,
    wrong: [{ value: -total, why: R`Check the signs: \(${-total} \div ${paren(b)} = ${-x}\), not \(${x}\).` }, x + b !== total ? { value: x + b, why: 'Undo a division with a multiplication.' } : null, total + b, total - b, total + 1],
    solution: [R`Undo the division: \(${box} = ${x} \times ${paren(b)}\).`, R`\(${Math.abs(x)} \times ${Math.abs(b)} = ${Math.abs(total)}\), and the signs are ${x < 0 === b < 0 ? 'the same, so the product is positive' : 'different, so the product is negative'}.`, R`\(${box} = ${total}\). Check: \(${total} \div ${paren(b)} = ${x}\). ✓`],
    rule: 5,
    skill: 'missing number',
    check: () => (total / b === x ? true : 'box does not work'),
  });
}

function challengeAverage(rng) {
  for (;;) {
    const n = rng.pick([4, 5]);
    const temps = Array.from({ length: n }, () => rng.int(-12, 6));
    const total = sum(temps);
    const negs = temps.filter((v) => v < 0);
    const pos = temps.filter((v) => v > 0);
    if (total % n !== 0 || negs.length < 2 || pos.length < 1 || total === 0) continue;
    const ans = total / n;
    const absMean = clean(sum(temps.map(Math.abs)) / n, 1);
    const city = rng.pick(['Oslo', 'Calgary', 'Sapporo', 'Helsinki', 'Fairbanks', 'Ulaanbaatar']);
    return q({
      prompt: R`The low temperatures in ${city} on ${n} days were \(${temps.join(R`,\; `)}\) degrees Celsius. What was the mean (average) low temperature?`,
      correct: ans,
      fmt: deg,
      wrong: [
        { value: total, why: `That is the total. Divide it by the number of days, ${n}.` },
        absMean != null && absMean !== ans ? { value: absMean, why: 'The signs matter when you add. Negative temperatures pull the total down.' } : null,
        { value: -ans, why: 'Check the sign of the total. A negative total divided by a positive number is negative.' },
        ans + 1,
        ans - 1,
      ],
      solution: [
        R`Add the negative numbers: \(${negs.join(' + ').replace(/\+ -/g, '- ')} = ${sum(negs)}\). Add the positive numbers: \(${pos.join(' + ')}${pos.length > 1 ? ` = ${sum(pos)}` : ''}\).`,
        R`Total: \(${sum(negs)} + ${sum(pos)} = ${total}\).`,
        R`Divide by ${n}: \(${total} \div ${n} = ${ans}\). The mean is ${deg(ans)}.`,
      ],
      rule: 5,
      skill: 'word problems',
      check: () => (ans * n === sum(temps) ? true : 'mean is wrong'),
    });
  }
}

const SIGN_BANK = [
  { given: (a, b) => R`\(${a}\) is negative and \(${b}\) is positive`, ask: 'always positive', signs: [-1, 1], f: (a, b) => b - a, g: [(a, b) => a - b, (a, b) => a * b, (a, b) => a + b], right: (a, b) => R`\(${b} - ${a}\)`, wrong: (a, b) => [R`\(${a} - ${b}\)`, R`\(${a} \times ${b}\)`, R`\(${a} + ${b}\)`], why: (a, b) => [R`\(${b} - ${a}\) is a positive number minus a negative number, which is the same as adding two positive numbers.`, R`For example, with \(${a} = -3\) and \(${b} = 2\): \(2 - (-3) = 5\).`, R`\(${a} - ${b}\) and \(${a} \times ${b}\) are always negative, and \(${a} + ${b}\) can go either way.`] },
  { given: (a, b) => R`\(${a}\) is negative and \(${b}\) is positive`, ask: 'always negative', signs: [-1, 1], f: (a, b) => a - b, g: [(a, b) => b - a, (a) => a * a, (a, b) => a + b], right: (a, b) => R`\(${a} - ${b}\)`, wrong: (a, b) => [R`\(${b} - ${a}\)`, R`\(${a} \times ${a}\)`, R`\(${a} + ${b}\)`], why: (a, b) => [R`\(${a} - ${b}\) starts at a negative number and moves farther left, so it is always negative.`, R`For example, with \(${a} = -3\) and \(${b} = 2\): \(-3 - 2 = -5\).`, R`\(${b} - ${a}\) and \(${a} \times ${a}\) are always positive, and \(${a} + ${b}\) can go either way.`] },
  { given: (a, b) => R`\(${a}\) is negative and \(${b}\) is positive`, ask: 'sometimes positive and sometimes negative', signs: [-1, 1], f: (a, b) => a + b, g: [(a, b) => a * b, (a, b) => a - b, (a, b) => b - a], right: (a, b) => R`\(${a} + ${b}\)`, wrong: (a, b) => [R`\(${a} \times ${b}\)`, R`\(${a} - ${b}\)`, R`\(${b} - ${a}\)`], why: (a, b) => [R`The sign of \(${a} + ${b}\) depends on which number has the larger absolute value.`, R`For example, \(-3 + 2 = -1\) but \(-3 + 5 = 2\).`, R`\(${a} \times ${b}\) and \(${a} - ${b}\) are always negative, and \(${b} - ${a}\) is always positive.`] },
  { given: (a, b) => R`\(${a}\) and \(${b}\) are both negative`, ask: 'always positive', signs: [-1, -1], f: (a, b) => a * b, g: [(a, b) => a + b, (a, b) => a - b, (a, b) => b - a], right: (a, b) => R`\(${a} \times ${b}\)`, wrong: (a, b) => [R`\(${a} + ${b}\)`, R`\(${a} - ${b}\)`, R`\(${b} - ${a}\)`], why: (a, b) => [R`A negative times a negative is positive, so \(${a} \times ${b}\) is always positive.`, R`For example, with \(${a} = -3\) and \(${b} = -2\): \((-3)(-2) = 6\).`, R`\(${a} + ${b}\) is always negative, and \(${a} - ${b}\) and \(${b} - ${a}\) can go either way.`] },
  { given: (a, b) => R`\(${a}\) and \(${b}\) are both negative`, ask: 'always negative', signs: [-1, -1], f: (a, b) => a + b, g: [(a, b) => a * b, (a, b) => a / b, (a, b) => a - b], right: (a, b) => R`\(${a} + ${b}\)`, wrong: (a, b) => [R`\(${a} \times ${b}\)`, R`\(${a} \div ${b}\)`, R`\(${a} - ${b}\)`], why: (a, b) => [R`Two negative numbers add to a negative number, so \(${a} + ${b}\) is always negative.`, R`For example, with \(${a} = -3\) and \(${b} = -2\): \(-3 + (-2) = -5\).`, R`\(${a} \times ${b}\) and \(${a} \div ${b}\) are always positive, and \(${a} - ${b}\) can go either way.`] },
  { given: (a, b) => R`\(${a}\) and \(${b}\) are both negative`, ask: 'sometimes positive and sometimes negative', signs: [-1, -1], f: (a, b) => a - b, g: [(a, b) => a + b, (a, b) => a * b, (a, b) => a / b], right: (a, b) => R`\(${a} - ${b}\)`, wrong: (a, b) => [R`\(${a} + ${b}\)`, R`\(${a} \times ${b}\)`, R`\(${a} \div ${b}\)`], why: (a, b) => [R`\(${a} - ${b}\) is the same as \(${a}\) plus a positive number, so its sign depends on the sizes.`, R`For example, \(-3 - (-5) = 2\) but \(-5 - (-3) = -2\).`, R`\(${a} + ${b}\) is always negative, and \(${a} \times ${b}\) and \(${a} \div ${b}\) are always positive.`] },
];

// How an expression behaves over a spread of values with the given signs. Each bank entry carries its
// expressions as functions too (f for the right answer, g for the wrong ones), so the wording can be tested.
function signBehaviour(fn, signs) {
  const sizes = [0.5, 1, 2, 3, 7];
  const vals = sizes.flatMap((u) => sizes.map((v) => fn(signs[0] * u, signs[1] * v)));
  if (vals.every((v) => v > 0)) return 'always positive';
  if (vals.every((v) => v < 0)) return 'always negative';
  return vals.some((v) => v > 0) && vals.some((v) => v < 0) ? 'sometimes positive and sometimes negative' : 'other';
}

function challengeSignReasoning(rng) {
  const item = rng.pick(SIGN_BANK);
  const [a, b] = rng.pick([['a', 'b'], ['m', 'n'], ['x', 'y'], ['p', 'q'], ['s', 't'], ['c', 'd'], ['u', 'v']]);
  return q({
    prompt: `Suppose ${item.given(a, b)}. Which expression is ${item.ask}?`,
    correct: item.right(a, b),
    wrong: item.wrong(a, b),
    solution: item.why(a, b),
    rule: 5,
    skill: 'reasoning about signs',
    check: () => (signBehaviour(item.f, item.signs) === item.ask && item.g.every((fn) => signBehaviour(fn, item.signs) !== item.ask) ? true : 'an expression does not behave as the answer key says'),
  });
}

function challengeDistance(rng) {
  for (;;) {
    const horizontal = rng.bool();
    const p = rng.int(-9, 9);
    const r = rng.int(-9, 9);
    const fixed = rng.nonzero(-8, 8);
    if (p >= r || (p >= 0 && r >= 0) || r - p < 3) continue;
    const A = horizontal ? [p, fixed] : [fixed, p];
    const B = horizontal ? [r, fixed] : [fixed, r];
    const opposite = p < 0 && r > 0;
    const dist = r - p;
    const naive = opposite ? Math.abs(Math.abs(p) - Math.abs(r)) : Math.abs(p) + Math.abs(r);
    const coord = horizontal ? 'x' : 'y';
    return q({
      prompt: R`What is the distance between the points \((${A.join(', ')})\) and \((${B.join(', ')})\)?`,
      visual: grid(-10, 10, { points: [{ x: A[0], y: A[1], label: pt(...A) }, { x: B[0], y: B[1], label: pt(...B) }], segments: [{ from: A, to: B, dashed: true }], alt: `A coordinate plane with the points ${pt(...A)} and ${pt(...B)} joined by a dashed ${horizontal ? 'horizontal' : 'vertical'} segment.` }),
      correct: dist,
      fmt: unitFmt('unit'),
      wrong: [
        naive !== dist && naive !== 0 ? { value: naive, why: opposite ? `The points are on opposite sides of the ${horizontal ? 'y' : 'x'}-axis, so their distances from it are added, not subtracted.` : `The points are on the same side of the ${horizontal ? 'y' : 'x'}-axis, so subtract their distances from it.` } : null,
        { value: Math.abs(fixed) !== dist ? Math.abs(fixed) : null, why: `That uses the ${horizontal ? 'y' : 'x'}-coordinate, which is the same for both points. Compare the ${coord}-coordinates.` },
        dist + 1,
        dist - 1,
        dist + 2,
      ],
      solution: [
        `Both points have the same ${horizontal ? 'y' : 'x'}-coordinate, so they are on one ${horizontal ? 'horizontal' : 'vertical'} line. The distance is the difference of the ${coord}-coordinates.`,
        R`\(|${r} - ${paren(p)}| = |${dist}| = ${dist}\).`,
        r === 0 ? R`Check: one point is on the ${horizontal ? 'y' : 'x'}-axis and the other is \(${Math.abs(p)}\) units from it. ✓` : opposite ? R`Check: one point is \(${Math.abs(p)}\) from the axis and the other is \(${r}\) on the other side: \(${Math.abs(p)} + ${r} = ${dist}\). ✓` : R`Check: both points are on the same side of the axis, at distances \(${Math.abs(p)}\) and \(${Math.abs(r)}\) from it: \(${Math.abs(p)} - ${Math.abs(r)} = ${dist}\). ✓`,
      ],
      rule: 4,
      skill: 'distance on the plane',
      check: () => (Math.hypot(A[0] - B[0], A[1] - B[1]) === dist ? true : 'distance is wrong'),
    });
  }
}

function challengeProduct(rng) {
  for (;;) {
    const k = rng.int(3, 4);
    const factors = Array.from({ length: k }, () => rng.intExcept(-5, 5, [-1, 0, 1]));
    const negCount = factors.filter((v) => v < 0).length;
    if (negCount < 2) continue;
    const ans = factors.reduce((a, b) => a * b, 1);
    if (Math.abs(ans) > 400) continue;
    return q({
      prompt: R`What is \(${product(...factors)}\)?`,
      correct: ans,
      wrong: [
        { value: -ans, why: `Count the negative factors. There are ${negCount}, an ${negCount % 2 ? 'odd' : 'even'} number, so the product is ${negCount % 2 ? 'negative' : 'positive'}.` },
        { value: sum(factors), why: 'Numbers written side by side in parentheses are multiplied, not added.' },
        ans + Math.abs(factors[0]),
        -(ans + Math.abs(factors[0])),
        ans * 2,
      ],
      solution: [
        R`Multiply the absolute values: \(${factors.map((v) => Math.abs(v)).join(R` \times `)} = ${Math.abs(ans)}\).`,
        `Each pair of negative factors makes a positive. There are ${negCount} negative factors, an ${negCount % 2 ? 'odd' : 'even'} number, so the product is ${negCount % 2 ? 'negative' : 'positive'}.`,
        R`The product is \(${ans}\).`,
      ],
      rule: 5,
      skill: 'multiplying integers',
      check: () => (factors.reduce((a, b) => a * b, 1) === ans && Math.sign(ans) === (negCount % 2 ? -1 : 1) ? true : 'product is wrong'),
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'integers-rationals',
  title: 'Negative Numbers & Rational Number Operations',
  summary: 'Use negative numbers, absolute value and the coordinate plane, and add, subtract, multiply and divide signed numbers.',
  grade: 'Grades 6–7',
  standards: ['CCSS 6.NS.C.5', 'CCSS 6.NS.C.6', 'CCSS 6.NS.C.7', 'CCSS 7.NS.A.1', 'CCSS 7.NS.A.2', 'CCSS 7.NS.A.3'],

  explain: {
    intro: R`Negative numbers describe amounts below zero: a temperature below freezing, a place below sea level, money that is owed. On a number line they sit to the left of 0. Every rule for adding, subtracting, multiplying and dividing them comes from thinking about direction and distance on that line.`,
    rules: [
      {
        title: 'Negative numbers and opposites',
        text: R`Positive numbers are to the right of 0 and negative numbers are to the left. Two numbers are **opposites** when they are the same distance from 0 on opposite sides. The opposite of the opposite of a number is the number itself.`,
        example: R`The opposite of \(4\) is \(-4\), the opposite of \(-7\) is \(7\), and \(-(-7) = 7\). An elevation of \(-30\) meters means 30 meters below sea level.`,
      },
      {
        title: 'Absolute value and order',
        text: R`The **absolute value** of a number, written \(|x|\), is its distance from 0, so it is never negative. On the number line, a number to the left is always less than a number to its right. Among negative numbers, the one farther from 0 is the smaller one.`,
        example: R`\(|-8| = 8\) and \(|8| = 8\). Also \(-8 < -3\), even though \(|-8| > |-3|\).`,
      },
      {
        title: 'The coordinate plane',
        text: R`A point \((x, y)\) is found by moving \(x\) units right (or left if negative) and \(y\) units up (or down if negative). The axes split the plane into four quadrants, numbered I to IV counter-clockwise from the top right. Reflecting across the x-axis changes the sign of \(y\); reflecting across the y-axis changes the sign of \(x\).`,
        example: R`\((-3, 2)\) is in Quadrant II. Its reflection across the x-axis is \((-3, -2)\), in Quadrant III.`,
      },
      {
        title: 'Adding signed numbers',
        text: R`Adding a positive number moves right on the number line; adding a negative number moves left. **Same signs:** add the absolute values and keep the sign. **Different signs:** subtract the smaller absolute value from the larger, and take the sign of the number with the larger absolute value.`,
        example: R`\(-5 + (-3) = -8\). \(-7 + 4 = -3\), because \(7 - 4 = 3\) and \(-7\) has the larger absolute value.`,
      },
      {
        title: 'Subtracting: add the opposite',
        text: R`Subtracting a number is the same as adding its opposite: \(a - b = a + (-b)\). So subtracting a negative is the same as adding a positive. The distance between two numbers on the number line is the absolute value of their difference.`,
        example: R`\(3 - (-5) = 3 + 5 = 8\) and \(-2 - 6 = -2 + (-6) = -8\). The distance between \(-4\) and \(3\) is \(|3 - (-4)| = 7\).`,
      },
      {
        title: 'Multiplying and dividing signed numbers',
        text: R`Multiply or divide the absolute values. If the two signs are the **same**, the answer is positive. If they are **different**, the answer is negative. With several factors, count the negatives: an even number gives a positive product, an odd number a negative one.`,
        example: R`\((-6)(-4) = 24\), \(5 \times (-3) = -15\), \(-45 \div 9 = -5\) and \(-28 \div (-7) = 4\).`,
      },
      {
        title: 'The same rules work for fractions and decimals',
        text: R`Signed fractions and decimals follow exactly the same sign rules as integers. Decide the sign first, then do the arithmetic with the absolute values.`,
        example: R`\(-3.5 + 1.8 = -1.7\). \(-\frac{2}{3} \times \frac{3}{4} = -\frac{1}{2}\). \(-\frac{1}{2} - \frac{1}{4} = -\frac{3}{4}\).`,
      },
    ],
    vocab: [
      { term: 'integer', def: R`A whole number or the opposite of a whole number: \(\ldots, -2, -1, 0, 1, 2, \ldots\)` },
      { term: 'rational number', def: R`Any number that can be written as a fraction of two integers, such as \(-\frac{3}{4}\), \(2.5\) or \(-6\).` },
      { term: 'opposite', def: 'The number the same distance from 0 on the other side. A number and its opposite add to 0.' },
      { term: 'absolute value', def: R`The distance of a number from 0, written \(|x|\).` },
      { term: 'quadrant', def: 'One of the four regions of the coordinate plane made by the x-axis and the y-axis.' },
    ],
    mistakes: [
      R`Thinking \(-8\) is greater than \(-3\) because 8 is greater than 3. On the number line \(-8\) is farther left, so it is less.`,
      R`Losing the double negative: \(5 - (-2)\) is \(5 + 2 = 7\), not \(3\).`,
      R`Using the multiplication sign rule for addition. \(-3 + (-4)\) is \(-7\), not \(+7\). "Two negatives make a positive" is only for multiplying and dividing.`,
      R`Swapping coordinates. In \((x, y)\) the first number is always left or right, and the second is up or down.`,
    ],
    visual: grid(-5, 5, {
      points: [{ x: 3, y: 2, label: 'I  (3, 2)' }, { x: -3, y: 2, label: 'II  (−3, 2)', color: 'b' }, { x: -3, y: -2, label: 'III  (−3, −2)', color: 'c' }, { x: 3, y: -2, label: 'IV  (3, −2)', color: 'd' }],
      alt: 'A coordinate plane with one point in each quadrant: (3, 2) in Quadrant I, (−3, 2) in Quadrant II, (−3, −2) in Quadrant III and (3, −2) in Quadrant IV.',
    }),
  },

  examples: [
    {
      title: 'Ordering and absolute value',
      problem: R`Put \(-3,\; 2,\; -5,\; 0\) in order from least to greatest. Which has the greatest absolute value?`,
      steps: [
        R`Mark the numbers on a number line. From left to right they are \(-5,\; -3,\; 0,\; 2\). That is least to greatest.`,
        R`Absolute values are distances from 0: \(|-5| = 5\), \(|-3| = 3\), \(|0| = 0\), \(|2| = 2\).`,
        R`\(-5\) is the least number, but it has the greatest absolute value.`,
      ],
      answer: R`\(-5,\; -3,\; 0,\; 2\); the greatest absolute value belongs to \(-5\)`,
      visual: { type: 'numberLine', min: -6, max: 4, step: 1, points: [{ value: -5, label: '−5' }, { value: -3, label: '−3' }, { value: 0, label: '0' }, { value: 2, label: '2' }], alt: 'A number line with points at −5, −3, 0 and 2.' },
    },
    {
      title: 'Adding numbers with different signs',
      problem: R`Find \(-7 + 4\).`,
      steps: [
        R`Start at \(-7\). Adding a positive number moves right, so move 4 units right.`,
        R`You land on \(-3\).`,
        R`With the rule: the signs are different, so subtract the absolute values, \(7 - 4 = 3\). The number with the larger absolute value is \(-7\), so the answer is negative.`,
      ],
      answer: R`\(-3\)`,
      visual: { type: 'numberLine', min: -9, max: 2, step: 1, points: [{ value: -7, label: 'start' }, { value: -3, label: '−3' }], jumps: [{ from: -7, to: -3, label: '+4' }], alt: 'A number line with a jump of 4 to the right from −7 to −3.' },
    },
    {
      title: 'Subtracting by adding the opposite',
      problem: R`Find \(3 - (-5)\) and \(-2 - 6\).`,
      steps: [
        R`Subtracting is adding the opposite. The opposite of \(-5\) is \(5\): \(3 - (-5) = 3 + 5 = 8\).`,
        R`The opposite of \(6\) is \(-6\): \(-2 - 6 = -2 + (-6)\).`,
        R`Both numbers are negative, so add the absolute values and keep the negative sign: \(-8\).`,
      ],
      answer: R`\(8\) and \(-8\)`,
    },
    {
      title: 'Multiplying and dividing',
      problem: R`Find \((-6)(-4)\), \(5 \times (-3)\) and \(-45 \div 9\).`,
      steps: [
        R`Look at a pattern: \(2(-4) = -8\), \(1(-4) = -4\), \(0(-4) = 0\). Each answer goes up by 4, so \((-1)(-4) = 4\). A negative times a negative is positive.`,
        R`\((-6)(-4)\): same signs, so positive. \(6 \times 4 = 24\).`,
        R`\(5 \times (-3)\): different signs, so negative. The answer is \(-15\).`,
        R`\(-45 \div 9\): different signs, so negative. \(45 \div 9 = 5\), so the answer is \(-5\).`,
      ],
      answer: R`\(24\), \(-15\) and \(-5\)`,
    },
    {
      title: 'Word problem: temperature',
      word: true,
      problem: 'At dawn the temperature was −8°C. By noon it had risen 13 degrees. By midnight it had fallen 9 degrees from the noon temperature. What was the temperature at midnight?',
      steps: [
        R`A rise is added and a fall is subtracted: \(-8 + 13 - 9\).`,
        R`\(-8 + 13\): different signs, \(13 - 8 = 5\), and 13 has the larger absolute value, so the result is \(5\).`,
        R`\(5 - 9 = 5 + (-9) = -4\).`,
      ],
      answer: '−4°C',
      visual: { type: 'numberLine', min: -10, max: 7, step: 1, points: [{ value: -8, label: 'dawn' }, { value: 5, label: 'noon' }, { value: -4, label: 'midnight' }], jumps: [{ from: -8, to: 5, label: '+13' }, { from: 5, to: -4, label: '−9' }], alt: 'A number line with a jump of 13 to the right from −8 to 5, then a jump of 9 to the left from 5 to −4.' },
    },
    {
      title: 'Word problem: elevation with decimals',
      word: true,
      problem: 'A diver is at an elevation of −12.5 meters. The diver rises 4.75 meters. Then the diver goes down 2.5 meters. What is the final elevation?',
      steps: [
        R`Rising is added and going down is subtracted: \(-12.5 + 4.75 - 2.5\).`,
        R`\(-12.5 + 4.75\): different signs, \(12.5 - 4.75 = 7.75\). The negative number has the larger absolute value, so the result is \(-7.75\).`,
        R`\(-7.75 - 2.5 = -7.75 + (-2.5) = -10.25\).`,
      ],
      answer: '−10.25 meters',
    },
  ],

  models: [
    {
      id: 'add-subtract',
      title: 'Add or subtract on a number line',
      intro: 'Choose two integers and an operation. The jump on the number line shows what happens.',
      inputs: [
        { name: 'a', label: 'First number', type: 'int', min: -20, max: 20, value: -7 },
        { name: 'op', label: 'Operation', type: 'select', value: '+', options: [{ value: '+', label: 'add (+)' }, { value: '-', label: 'subtract (−)' }] },
        { name: 'b', label: 'Second number', type: 'int', min: -20, max: 20, value: 4 },
      ],
      compute({ a, op, b }) {
        const move = op === '+' ? b : -b;
        const res = a + move;
        const steps = op === '+' ? addSteps(a, b) : subtractSteps(a, b);
        if (move !== 0) steps.unshift(`On the number line: start at ${txt(a)} and move ${Math.abs(move)} ${Math.abs(move) === 1 ? 'unit' : 'units'} to the ${move > 0 ? 'right' : 'left'}.`);
        return {
          problem: R`\(${a} ${op} ${paren(b)}\)`,
          steps,
          answer: R`\(${res}\)`,
          visual: lineFor([a, res, 0], {
            points: [{ value: a, label: 'start' }, ...(move !== 0 ? [{ value: res, label: txt(res), color: 'c' }] : [])],
            jumps: move !== 0 ? [{ from: a, to: res, label: signedLabel(move) }] : [],
            alt: `A number line with a jump from ${txt(a)} to ${txt(res)}.`,
          }),
        };
      },
    },
    {
      id: 'temperature',
      title: 'Word problem: a steady change in temperature',
      word: true,
      intro: 'Set the starting temperature, the change each hour and the number of hours.',
      inputs: [
        { name: 'start', label: 'Starting temperature (°C)', type: 'int', min: -30, max: 30, value: 4 },
        { name: 'c', label: 'Change each hour (degrees)', type: 'int', min: -8, max: 8, value: -3 },
        { name: 'h', label: 'Number of hours', type: 'int', min: 2, max: 12, value: 5 },
      ],
      compute({ start, c, h }) {
        if (c === 0) return { error: 'A change of 0 degrees each hour leaves the temperature the same. Try a positive or negative change.' };
        const total = c * h;
        const end = start + total;
        return {
          problem: `The temperature is ${txt(start)}°C. It ${c < 0 ? 'falls' : 'rises'} ${Math.abs(c)} ${Math.abs(c) === 1 ? 'degree' : 'degrees'} every hour for ${h} hours. What is the temperature then?`,
          steps: [
            R`A ${c < 0 ? 'fall' : 'rise'} of ${Math.abs(c)} ${Math.abs(c) === 1 ? 'degree' : 'degrees'} is a change of \(${c}\) each hour. Over ${h} hours the total change is \(${h} \times ${paren(c)} = ${total}\).`,
            R`Add the total change to the starting temperature: \(${start} + ${paren(total)}\).`,
            ...addSteps(start, total),
          ],
          answer: `${txt(end)}°C`,
          visual: lineFor([start, end, 0], { points: [{ value: start, label: 'start' }, { value: end, label: txt(end), color: 'c' }], jumps: [{ from: start, to: end, label: signedLabel(total) }], alt: `A number line with a jump from ${txt(start)} to ${txt(end)}.` }),
        };
      },
    },
    {
      id: 'plot-point',
      title: 'A point and its reflections',
      intro: 'Choose the coordinates of a point. The graph shows its quadrant and its reflections across both axes.',
      inputs: [
        { name: 'x', label: 'x-coordinate', type: 'int', min: -9, max: 9, value: -3 },
        { name: 'y', label: 'y-coordinate', type: 'int', min: -9, max: 9, value: 2 },
      ],
      compute({ x, y }) {
        const where = x === 0 && y === 0 ? 'at the origin' : x === 0 ? 'on the y-axis' : y === 0 ? 'on the x-axis' : `in ${QUADRANTS[`${Math.sign(x)},${Math.sign(y)}`]}`;
        const points = [{ x, y, label: pt(x, y) }];
        if (y !== 0) points.push({ x, y: -y, label: pt(x, -y), color: 'b' });
        if (x !== 0) points.push({ x: -x, y, label: pt(-x, y), color: 'c' });
        return {
          problem: R`Where is the point \((${x}, ${y})\), and where are its reflections across the axes?`,
          steps: [
            x === 0 ? 'The x-coordinate is 0, so the point is neither left nor right of the y-axis.' : R`The x-coordinate is \(${x}\): move ${Math.abs(x)} ${Math.abs(x) === 1 ? 'unit' : 'units'} ${x < 0 ? 'left' : 'right'} from the origin.`,
            y === 0 ? 'The y-coordinate is 0, so the point is neither above nor below the x-axis.' : R`The y-coordinate is \(${y}\): move ${Math.abs(y)} ${Math.abs(y) === 1 ? 'unit' : 'units'} ${y < 0 ? 'down' : 'up'}.`,
            `The point is ${where}.`,
            y === 0 ? 'The point is on the x-axis, so reflecting across the x-axis does not move it.' : R`Reflecting across the x-axis changes the sign of \(y\): \((${x}, ${-y})\).`,
            x === 0 ? 'The point is on the y-axis, so reflecting across the y-axis does not move it.' : R`Reflecting across the y-axis changes the sign of \(x\): \((${-x}, ${y})\).`,
          ],
          answer: R`\((${x}, ${y})\) is ${where}.`,
          visual: grid(-10, 10, { points, alt: `A coordinate plane showing the point ${pt(x, y)} and its reflections across the axes.` }),
        };
      },
    },
  ],

  quiz: {
    easy: [easyContext, easyOpposite, easyAbsolute, easyCompare, easyQuadrant],
    medium: [mediumAdd, mediumSubtract, mediumMultiplyDivide, mediumOrder, mediumReflect, mediumStory],
    hard: [hardDecimals, hardFractions, hardExpression, hardStory],
    challenge: [challengeMissing, challengeAverage, challengeSignReasoning, challengeDistance, challengeProduct],
  },
};
