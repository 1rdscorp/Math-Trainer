import { R, q, frac, fracTex, gcd, lcm, person, plural, fractionWord } from '../../lib/index.js';

// A fraction exactly as written (not reduced), wrapped as inline math.
const F = (n, d) => R`\(${fracTex(n, d)}\)`;
const DENS = [2, 3, 4, 5, 6, 8, 10, 12];
const bar = (n, d, label = 'One whole') => ({ n, d, label });

function linePic(n, d, max = 1) {
  const labels = Array.from({ length: max + 1 }, (_, i) => ({ value: i, text: String(i) }));
  return { type: 'numberLine', min: 0, max, step: 1 / d, labels, points: [{ value: n / d, label: '?' }], alt: `A number line from 0 to ${max}. Each whole is cut into ${d} equal jumps. A point is ${n} jumps from 0.` };
}

// Four statements comparing two fractions; only the first is true.
function compareChoices(x, y, less) {
  const sym = less ? '<' : '>';
  const other = less ? '>' : '<';
  return {
    correct: R`\(${x} ${sym} ${y}\)`,
    wrong: [{ value: R`\(${x} ${other} ${y}\)`, why: 'The open side of the symbol faces the greater fraction.' }, R`\(${x} = ${y}\)`, R`\(${y} ${sym} ${x}\)`],
  };
}

// ───────────── Easy: naming fractions ─────────────

function easyNameBar(rng) {
  const d = rng.pick([2, 3, 4, 6, 8]);
  const n = rng.int(1, d - 1);
  return q({
    prompt: `A bar is cut into ${d} equal parts. ${plural(n, 'part is', 'parts are')} shaded. What fraction of the bar is shaded?`,
    visual: { type: 'fractionBars', bars: [bar(n, d)], alt: `A bar cut into ${d} equal parts with ${n} shaded.` },
    correct: F(n, d),
    wrong: [
      d - n !== n ? { value: F(d - n, d), why: 'That is the part that is not shaded.' } : null,
      { value: F(n, d - n), why: 'The bottom number counts all the equal parts, shaded or not.' },
      { value: F(d, n), why: 'The parts you count go on top. The parts in the whole go on the bottom.' },
      F(n, d + 1),
    ],
    solution: [`The whole has ${d} equal parts, so the bottom number is ${d}.`, `${plural(n, 'part is', 'parts are')} shaded, so the top number is ${n}.`, `The fraction is ${F(n, d)}.`],
    rule: 0,
    skill: 'naming fractions',
    check: () => (n < d && n / d > 0 ? true : 'not a proper fraction'),
  });
}

function easyUnit(rng) {
  const d = rng.int(2, 12);
  if (rng.bool()) {
    return q({
      prompt: `A whole is cut into ${d} equal parts. What fraction of the whole is one part?`,
      correct: F(1, d),
      wrong: [{ value: F(d, 1), why: `The 1 part goes on top. The ${d} equal parts go on the bottom.` }, F(1, d + 1), d > 2 ? F(1, d - 1) : F(2, 3), { value: F(d, d), why: 'That is all the parts: one whole.' }],
      solution: [`There are ${d} equal parts in the whole.`, `One of them is one ${fractionWord(d, 1)}: ${F(1, d)}.`],
      rule: 0,
      skill: 'unit fractions',
      check: () => (d * (1 / d) > 0.999 ? true : 'parts do not rebuild the whole'),
    });
  }
  return q({
    prompt: `How many ${fractionWord(d)} make one whole?`,
    correct: d,
    wrong: [{ value: 1, why: `One ${fractionWord(d, 1)} is just one part. It takes ${d} of them to make the whole.` }, d + 1, d - 1 || 3, 2 * d],
    solution: [`${fractionWord(d)[0].toUpperCase()}${fractionWord(d).slice(1)} come from cutting a whole into ${d} equal parts.`, `So ${d} ${fractionWord(d)} make one whole: ${F(d, d)} is 1.`],
    rule: 5,
    skill: 'unit fractions',
    check: () => (frac(d, d).eq(1) ? true : 'parts do not make one whole'),
  });
}

function easyCompareUnit(rng) {
  const dens = rng.sample([2, 3, 4, 5, 6, 8, 10, 12], 4).sort((a, b) => a - b);
  const most = rng.bool(0.6);
  const target = most ? dens[0] : dens[3];
  return q({
    prompt: `Which fraction is the ${most ? 'greatest' : 'least'}?`,
    correct: F(1, target),
    wrong: dens.filter((d) => d !== target).map((d) => ({ value: F(1, d), why: most ? `Cutting a whole into ${d} parts makes smaller parts than cutting it into ${target}.` : `Cutting a whole into ${d} parts makes bigger parts than cutting it into ${target}.` })),
    solution: ['Each fraction is one part of the same whole.', 'More parts means each part is smaller.', most ? `The fewest parts is ${target}, so ${F(1, target)} is the greatest.` : `The most parts is ${target}, so ${F(1, target)} is the least.`],
    rule: 2,
    skill: 'comparing fractions',
    key: `unit:${most}:${dens.join(',')}`,
    check: () => (dens.every((d) => (most ? 1 / d <= 1 / target : 1 / d >= 1 / target)) ? true : 'target is not the extreme'),
  });
}

const FOODS = [['pizza', 'slices'], ['pie', 'slices'], ['cake', 'pieces'], ['pan of brownies', 'pieces'], ['loaf of bread', 'slices']];

function easyStory(rng) {
  const d = rng.pick([4, 6, 8, 10, 12]);
  const n = rng.int(1, d - 1);
  const name = person(rng);
  const [food, parts] = rng.pick(FOODS);
  return q({
    prompt: `A ${food} is cut into ${d} equal ${parts}. ${name} eats ${n} of them. What fraction of the ${food} does ${name} eat?`,
    correct: F(n, d),
    wrong: [
      { value: F(n, d - n), why: `The bottom number counts all ${d} equal ${parts}, not just the ones left.` },
      d - n !== n ? { value: F(d - n, d), why: `That is the fraction ${name} did not eat.` } : null,
      F(d, n),
      F(n, d + 2),
    ],
    solution: [`The whole ${food} has ${d} equal ${parts}. That is the bottom number.`, `${name} eats ${n}. That is the top number.`, `${name} eats ${F(n, d)} of the ${food}.`],
    rule: 0,
    skill: 'word problems',
    check: () => (n < d ? true : 'not a proper fraction'),
  });
}

// ───────────── Medium: number lines, simple comparing, wholes ─────────────

function mediumNumberLine(rng) {
  const d = rng.pick([2, 3, 4, 6, 8]);
  const max = rng.bool(0.35) ? 2 : 1;
  const n = rng.intExcept(1, max * d - 1, [d]);
  return q({
    prompt: `Each whole on the number line is cut into ${d} equal jumps. What fraction is at the point?`,
    visual: linePic(n, d, max),
    correct: F(n, d),
    wrong: [
      { value: F(n, d + 1), why: 'Count the equal jumps between 0 and 1, not the tick marks.' },
      { value: F(n + 1, d), why: 'Start counting jumps at 0. The first tick after 0 is one jump.' },
      F(d, n),
      F(n, max * d),
    ],
    solution: [`There are ${d} equal jumps from 0 to 1. Each jump is ${F(1, d)}.`, `The point is ${n} ${n === 1 ? 'jump' : 'jumps'} from 0.`, `The point is at ${F(n, d)}.`],
    rule: 1,
    skill: 'fractions on a number line',
    check: () => (Math.abs(n * (1 / d) - n / d) < 1e-9 && n / d < max ? true : 'point is off the line'),
  });
}

function mediumCompare(rng) {
  let x;
  let y;
  let less;
  let steps;
  if (rng.bool()) {
    const d = rng.pick(DENS.filter((v) => v > 2));
    const [a, b] = rng.sample(Array.from({ length: d - 1 }, (_, i) => i + 1), 2);
    [x, y, less] = [fracTex(a, d), fracTex(b, d), a < b];
    steps = [`Both fractions are ${fractionWord(d)}, so the parts are the same size.`, `${a} parts is ${less ? 'fewer' : 'more'} than ${b} parts.`];
  } else {
    const n = rng.int(1, 5);
    const [a, b] = rng.sample(DENS.filter((v) => v > n), 2);
    [x, y, less] = [fracTex(n, a), fracTex(n, b), a > b];
    steps = [`Both fractions have ${plural(n, 'part')}.`, `${fractionWord(a)[0].toUpperCase()}${fractionWord(a).slice(1)} are ${less ? 'smaller' : 'bigger'} parts than ${fractionWord(b)}.`];
  }
  const c = compareChoices(x, y, less);
  return q({
    prompt: 'Both fractions are parts of the same whole. Which comparison is true?',
    correct: c.correct,
    wrong: c.wrong,
    solution: [...steps, `So ${c.correct}.`],
    rule: 2,
    skill: 'comparing fractions',
  });
}

function mediumWholes(rng) {
  const d = rng.int(2, 6);
  const w = rng.int(1, 6);
  if (rng.bool()) {
    return q({
      prompt: `What whole number is equal to ${F(w * d, d)}?`,
      correct: w,
      wrong: [{ value: w * d, why: `${w * d} is the number of parts. It takes ${d} parts to make each whole.` }, d !== w ? { value: d, why: `${d} is how many parts are in one whole.` } : null, w + 1, w - 1 || w + 2, w * d - d || 7],
      solution: [`${d} ${fractionWord(d)} make 1 whole.`, R`\(${w * d} \div ${d} = ${w}\), so ${w * d} ${fractionWord(d)} make ${plural(w, 'whole')}.`, `${F(w * d, d)} is equal to ${w}.`],
      rule: 5,
      skill: 'fractions equal to whole numbers',
      check: () => (frac(w * d, d).eq(w) ? true : 'fraction is not that whole number'),
    });
  }
  const whole = w + 1;
  return q({
    prompt: `Which fraction is equal to ${whole}?`,
    correct: F(whole * d, d),
    wrong: [
      { value: F(whole, whole), why: `${F(whole, whole)} is ${whole} out of ${whole} equal parts. That is 1 whole.` },
      { value: F(1, whole), why: `${F(1, whole)} is one small part. It is less than 1.` },
      F(whole * d + 1, d),
      whole !== d ? F(d, whole * d) : F(whole + 1, whole),
    ],
    solution: [`${d} ${fractionWord(d)} make 1 whole.`, R`${whole} wholes need \(${whole} \times ${d} = ${whole * d}\) ${fractionWord(d)}.`, `${F(whole * d, d)} is equal to ${whole}.`],
    rule: 5,
    skill: 'fractions equal to whole numbers',
    check: () => (frac(whole * d, d).eq(whole) && !frac(whole * d + 1, d).eq(whole) ? true : 'fraction is not that whole number'),
  });
}

function mediumSameAmount(rng) {
  const [d, k] = rng.pick([[2, 2], [2, 3], [2, 4], [3, 2], [4, 2], [3, 4], [2, 5], [5, 2], [4, 3], [6, 2]]);
  const n = rng.int(1, d - 1);
  return q({
    prompt: R`The two bars show the same amount. What number goes in the box? \(\;${fracTex(n, d)} = \frac{\square}{${d * k}}\)`,
    visual: { type: 'fractionBars', bars: [bar(n, d, `${n}/${d}`), bar(n * k, d * k, `?/${d * k}`)], alt: `Two bars with the same amount shaded. One has ${n} of ${d} parts shaded. The other is cut into ${d * k} parts.` },
    correct: n * k,
    wrong: [
      { value: n, why: 'The parts are smaller in the second bar, so more of them are shaded.' },
      { value: n + d * k - d, why: 'Adding the same number to the top and bottom changes the amount.' },
      n * k + 1,
      n * k - 1 !== n ? n * k - 1 : n * k + 2,
      k !== n * k ? k : null,
    ],
    solution: [`Each part of the first bar is cut into ${k} smaller parts.`, R`So the shaded parts become \(${n} \times ${k} = ${n * k}\).`, `${F(n, d)} is the same amount as ${F(n * k, d * k)}.`],
    rule: 3,
    skill: 'equivalent fractions',
    check: () => (frac(n, d).eq(frac(n * k, d * k)) ? true : 'fractions are not equal'),
  });
}

// ───────────── Hard: equivalent fractions, simplest form, comparing ─────────────

function hardEquivalent(rng) {
  for (;;) {
    const d = rng.pick([2, 3, 4, 5, 6, 8]);
    const n = rng.int(1, d - 1);
    const k = rng.int(2, 6);
    if (gcd(n, d) !== 1) continue;
    const top = rng.bool();
    const up = rng.bool(0.7);
    const [a, b, c, e] = up ? [n, d, n * k, d * k] : [n * k, d * k, n, d];
    const answer = top ? c : e;
    return q({
      prompt: top ? R`What number goes in the box? \(\;${fracTex(a, b)} = \frac{\square}{${e}}\)` : R`What number goes in the box? \(\;${fracTex(a, b)} = \frac{${c}}{\square}\)`,
      correct: answer,
      wrong: [
        (top ? a + (e - b) : b + (c - a)) > 0 ? { value: top ? a + (e - b) : b + (c - a), why: `${up ? 'Multiply' : 'Divide'} the top and the bottom by the same number. Adding or subtracting changes the fraction.` } : null,
        { value: k, why: `${k} is what the top and bottom are ${up ? 'multiplied' : 'divided'} by. Use it to find the missing number.` },
        answer + 1,
        answer - 1 || answer + 2,
        top ? a : b,
      ],
      solution: [
        top ? R`Look at the bottoms: \(${b} ${up ? '\\times' : '\\div'} ${k} = ${e}\).` : R`Look at the tops: \(${a} ${up ? '\\times' : '\\div'} ${k} = ${c}\).`,
        top ? R`Do the same to the top: \(${a} ${up ? '\\times' : '\\div'} ${k} = ${c}\).` : R`Do the same to the bottom: \(${b} ${up ? '\\times' : '\\div'} ${k} = ${e}\).`,
        `${F(a, b)} is equal to ${F(c, e)}.`,
      ],
      rule: 3,
      skill: 'equivalent fractions',
      check: () => (a * e === b * c ? true : 'fractions are not equal'),
    });
  }
}

function hardSimplest(rng) {
  for (;;) {
    const d = rng.pick([3, 4, 5, 6, 8, 9, 10, 12]);
    const n = rng.int(1, d - 1);
    const g = rng.int(2, 6);
    if (gcd(n, d) !== 1) continue;
    const [N, D2] = [n * g, d * g];
    return q({
      prompt: `Write ${F(N, D2)} in simplest form.`,
      correct: frac(n, d),
      wrong: [
        { value: frac(N - g, D2 - g), why: 'Subtracting the same number from top and bottom changes the fraction. Divide instead.' },
        { value: frac(n, D2), why: `The top was divided by ${g}. Divide the bottom by ${g} too.` },
        frac(n + 1, d),
        frac(n, d + 1),
        frac(d, n),
      ],
      solution: [`Find a number that divides both ${N} and ${D2}. The biggest is ${g}.`, R`Divide the top and the bottom by ${g}: \(${N} \div ${g} = ${n}\) and \(${D2} \div ${g} = ${d}\).`, `${F(n, d)} is in simplest form, because only 1 divides both ${n} and ${d}.`],
      rule: 4,
      skill: 'simplest form',
      check: () => (frac(N, D2).eq(frac(n, d)) && gcd(n, d) === 1 && gcd(N, D2) === g ? true : 'not the same fraction in lowest terms'),
    });
  }
}

function unlikePair(rng) {
  for (;;) {
    const [b, d] = rng.sample(DENS, 2);
    const a = rng.int(1, b - 1);
    const c = rng.int(1, d - 1);
    const L = lcm(b, d);
    if (gcd(a, b) !== 1 || gcd(c, d) !== 1 || a === c || a * d === b * c || L > 40) continue;
    return { a, b, c, d, L, x: a * (L / b), y: c * (L / d) };
  }
}

function hardCompare(rng) {
  const { a, b, c, d, L, x, y } = unlikePair(rng);
  const choices = compareChoices(fracTex(a, b), fracTex(c, d), x < y);
  return q({
    prompt: 'Both fractions are parts of the same whole. Which comparison is true?',
    correct: choices.correct,
    wrong: choices.wrong,
    solution: [
      `The parts are different sizes. Rename both fractions with the bottom number ${L}.`,
      `${b === L ? `${F(a, b)} stays the same` : `${F(a, b)} is ${F(x, L)}`}, and ${d === L ? `${F(c, d)} stays the same` : `${F(c, d)} is ${F(y, L)}`}.`,
      `Compare the tops: ${x} is ${x < y ? 'less' : 'more'} than ${y}. So ${choices.correct}.`,
    ],
    rule: 2,
    skill: 'comparing fractions',
    check: () => (frac(a, b).lt(frac(c, d)) === x < y && x !== y ? true : 'comparison does not match'),
  });
}

function hardStory(rng) {
  const name = person(rng);
  const [d, k] = rng.pick([[2, 2], [2, 3], [2, 4], [3, 2], [3, 3], [3, 4], [4, 2], [4, 3], [2, 6], [5, 2], [6, 2]]);
  const n = rng.int(1, d - 1);
  const D2 = d * k;
  const pieces = n * k;
  if (gcd(n, d) !== 1) return hardStory(rng);
  const scoops = rng.bool();
  return q({
    prompt: scoops
      ? `A recipe needs ${F(n, d)} cup of milk. ${name} has only a ${F(1, D2)}-cup scoop. How many scoops does ${name} need?`
      : `A pie is cut into ${D2} equal pieces. ${name} eats ${F(n, d)} of the pie. How many pieces does ${name} eat?`,
    correct: pieces,
    wrong: [
      { value: n, why: `${fractionWord(D2)[0].toUpperCase()}${fractionWord(D2).slice(1)} are smaller than ${fractionWord(d)}, so it takes more of them.` },
      { value: D2, why: `${D2} ${fractionWord(D2)} make the whole. Only ${F(n, d)} is needed.` },
      k !== pieces ? { value: k, why: `${k} ${fractionWord(D2)} make just one ${fractionWord(d, 1)}. Count ${n} of those.` } : null,
      pieces + 1,
      pieces + 2,
    ],
    solution: [`Rename ${F(n, d)} as ${fractionWord(D2)}.`, R`Multiply the top and the bottom by ${k}: \(${fracTex(n, d)} = ${fracTex(pieces, D2)}\).`, scoops ? `${name} needs ${pieces} scoops.` : `${name} eats ${pieces} pieces.`],
    rule: 3,
    skill: 'word problems',
    check: () => (frac(pieces, D2).eq(frac(n, d)) ? true : 'fractions are not equal'),
  });
}

// ───────────── Challenge ─────────────

function challengeOrder(rng) {
  for (;;) {
    const dens = rng.sample([2, 3, 4, 6, 8, 12], 3);
    const tops = dens.map((d) => rng.int(1, d - 1));
    const L = dens.reduce((acc, d) => lcm(acc, d), 1);
    const list = dens.map((d, i) => ({ tex: fracTex(tops[i], d), n: tops[i], d, v: tops[i] * (L / d) })).sort((p, r) => p.v - r.v);
    if (new Set(list.map((f) => f.v)).size < 3 || list.some((f) => gcd(f.n, f.d) !== 1)) continue;
    const chain = (i, j, k) => R`\(${list[i].tex} < ${list[j].tex} < ${list[k].tex}\)`;
    return q({
      prompt: 'Which shows the fractions in order from least to greatest?',
      correct: chain(0, 1, 2),
      wrong: [
        { value: chain(2, 1, 0), why: 'That is greatest to least. The symbol < means "is less than".' },
        { value: chain(0, 2, 1), why: 'Rename the fractions with the same bottom number to compare them.' },
        chain(1, 0, 2),
        chain(1, 2, 0),
      ],
      solution: [`Rename every fraction with the bottom number ${L}.`, `${list.map((f) => (f.d === L ? `${F(f.n, f.d)} stays the same` : `${F(f.n, f.d)} is ${F(f.v, L)}`)).join(', ')}.`, `Order the tops: ${list.map((f) => f.v).join(', ')}.`, `So ${chain(0, 1, 2)}.`],
      rule: 2,
      skill: 'ordering fractions',
      check: () => (list[0].n / list[0].d < list[1].n / list[1].d && list[1].n / list[1].d < list[2].n / list[2].d ? true : 'not in order'),
    });
  }
}

function challengeHalf(rng) {
  if (rng.bool(0.4)) {
    const dens = rng.sample([3, 4, 5, 6, 8, 10, 12], 4).sort((a, b) => a - b);
    const best = dens[3];
    return q({
      prompt: 'Which fraction is closest to 1?',
      correct: F(best - 1, best),
      wrong: dens.slice(0, 3).map((d) => ({ value: F(d - 1, d), why: `${F(d - 1, d)} is ${F(1, d)} away from 1. That gap is bigger than ${F(1, best)}.` })),
      solution: ['Each fraction is one part away from 1.', `The gaps are ${dens.map((d) => F(1, d)).join(', ')}.`, `The smallest gap is ${F(1, best)}, so ${F(best - 1, best)} is closest to 1.`],
      rule: 2,
      skill: 'comparing fractions',
      key: `closest:${dens.join(',')}`,
      check: () => (dens.every((d) => 1 / d >= 1 / best) ? true : 'not the smallest gap'),
    });
  }
  for (;;) {
    const dens = rng.sample([3, 4, 5, 6, 7, 8, 9, 10, 12], 4);
    const [big, ...small] = dens;
    const top = Math.floor(big / 2) + 1;
    const lows = small.map((d) => [d % 2 === 0 && rng.bool(0.3) ? d / 2 : Math.ceil(d / 2) - 1, d]);
    if (lows.some(([n]) => n < 1) || gcd(top, big) !== 1 || new Set(lows.map(([n, d]) => n / d)).size < 3) continue;
    return q({
      prompt: R`Which fraction is greater than \(\frac{1}{2}\)?`,
      correct: F(top, big),
      wrong: lows.map(([n, d]) => ({ value: F(n, d), why: 2 * n === d ? `${F(n, d)} is exactly one half, not more.` : `Half of ${d} is ${d / 2}. ${n} is less than that.` })),
      solution: ['A fraction is more than one half when its top is more than half of its bottom.', `Half of ${big} is ${big / 2}. ${top} is more than that.`, `So ${F(top, big)} is greater than one half.`],
      rule: 2,
      skill: 'comparing fractions',
      key: `half:${top}/${big}:${lows.map((f) => f.join('/')).sort().join(',')}`,
      check: () => (2 * top > big && lows.every(([n, d]) => 2 * n <= d) ? true : 'choices are not separated by one half'),
    });
  }
}

function challengeTwoStepEquivalent(rng) {
  for (;;) {
    const [n, d] = rng.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6], [5, 6]]);
    const [j, k] = rng.sample([2, 3, 4, 5, 6], 2);
    if (k % j === 0 || d * k > 40) continue;
    const [a, b, e] = [n * j, d * j, d * k];
    const answer = n * k;
    return q({
      prompt: R`What number goes in the box? \(\;${fracTex(a, b)} = \frac{\square}{${e}}\)`,
      correct: answer,
      wrong: [
        { value: a + e - b, why: 'Adding or subtracting the same number changes the fraction. Simplify first, then multiply.' },
        { value: a, why: 'The bottom number changed, so the top number must change too.' },
        answer + 1,
        answer - 1 || answer + 2,
        n,
      ],
      solution: [`${b} does not go into ${e} a whole number of times. Simplify first.`, R`Divide the top and the bottom by ${j}: \(${fracTex(a, b)} = ${fracTex(n, d)}\).`, R`Now multiply the top and the bottom by ${k}: \(${fracTex(n, d)} = ${fracTex(answer, e)}\).`],
      rule: 3,
      skill: 'equivalent fractions',
      check: () => (a * e === b * answer ? true : 'fractions are not equal'),
    });
  }
}

function challengeStory(rng) {
  for (;;) {
    const d = rng.pick([3, 4, 5, 6, 8]);
    const n = rng.int(1, d - 1);
    const g = rng.int(3, 6);
    if (gcd(n, d) !== 1 || 2 * n === d) continue;
    const total = d * g;
    const part = n * g;
    const [group, action, whole] = rng.pick([['students in a class', 'walk to school', 'class'], ['players on a team', 'wear red socks', 'team'], ['books on a shelf', 'are about animals', 'books'], ['beads in a jar', 'are blue', 'beads']]);
    return q({
      prompt: `There are ${total} ${group}. ${part} of them ${action}. What fraction of the ${whole} is that, in simplest form?`,
      correct: frac(n, d),
      wrong: [
        { value: frac(d - n, d), why: `That is the fraction for the other ${total - part}. The question asks about the ${part}.` },
        { value: frac(part, total - part), why: `The bottom number is the whole group, ${total}.` },
        frac(d, n),
        frac(n, d + 1),
        frac(n + 1, d + 1),
      ],
      solution: [`The whole group is ${total}. The part is ${part}. The fraction is ${F(part, total)}.`, R`Divide the top and the bottom by ${g}: \(${part} \div ${g} = ${n}\) and \(${total} \div ${g} = ${d}\).`, `In simplest form the fraction is ${F(n, d)}.`],
      rule: 4,
      skill: 'word problems',
      check: () => (frac(part, total).eq(frac(n, d)) && gcd(n, d) === 1 ? true : 'not the same fraction in lowest terms'),
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'fractions-intro',
  title: 'Understanding Fractions',
  summary: 'Name fractions of a whole and on a number line, find equal fractions, and compare fractions.',
  grade: 'Grades 3–4',
  standards: ['CCSS 3.NF.A.1', 'CCSS 3.NF.A.2', 'CCSS 3.NF.A.3', 'CCSS 4.NF.A.1', 'CCSS 4.NF.A.2'],

  explain: {
    intro: 'A fraction names equal parts of a whole. The bottom number, the **denominator**, tells how many equal parts make the whole. The top number, the **numerator**, tells how many parts you have.',
    rules: [
      {
        title: 'A fraction counts equal parts',
        text: R`Cut a whole into equal parts. One part is a unit fraction, like \(\frac{1}{4}\). Count the parts you have to get the top number.`,
        example: R`A bar has 8 equal parts and 3 are shaded. \(\frac{3}{8}\) of the bar is shaded.`,
      },
      {
        title: 'Fractions on a number line',
        text: 'Cut the distance from 0 to 1 into equal jumps. The bottom number is how many jumps make 1. The top number is how many jumps you take from 0.',
        example: R`With 4 jumps from 0 to 1, the third tick is \(\frac{3}{4}\). Five jumps lands on \(\frac{5}{4}\), past 1.`,
      },
      {
        title: 'Comparing fractions',
        text: 'Compare parts of the same whole. Same bottom number: more parts is more. Same top number: the smaller bottom number has bigger parts. Otherwise, rename both with the same bottom number.',
        example: R`\(\frac{3}{8} < \frac{5}{8}\). Also \(\frac{3}{4} > \frac{3}{8}\), because fourths are bigger than eighths.`,
      },
      {
        title: 'Equivalent fractions',
        text: 'Different fractions can name the same amount. Multiply the top and the bottom by the same number. Or divide both by the same number.',
        example: R`\(\frac{3}{4} = \frac{3 \times 3}{4 \times 3} = \frac{9}{12}\).`,
      },
      {
        title: 'Simplest form',
        text: 'A fraction is in simplest form when only 1 divides both numbers. Divide the top and the bottom by a common factor until you cannot any more.',
        example: R`\(\frac{12}{18}\): divide both by 6 to get \(\frac{2}{3}\).`,
      },
      {
        title: 'Fractions and whole numbers',
        text: 'When the top and bottom are the same, the fraction is 1 whole. A whole number can be written as a fraction too.',
        example: R`\(\frac{4}{4} = 1\), and \(\frac{12}{4} = 3\) because 12 fourths make 3 wholes.`,
      },
    ],
    vocab: [
      { term: 'numerator', def: 'The top number. It counts the parts you have.' },
      { term: 'denominator', def: 'The bottom number. It tells how many equal parts make one whole.' },
      { term: 'unit fraction', def: R`A fraction with 1 on top, like \(\frac{1}{6}\). It is one equal part.` },
      { term: 'equivalent fractions', def: R`Fractions that name the same amount, like \(\frac{1}{2}\) and \(\frac{2}{4}\).` },
      { term: 'simplest form', def: 'A fraction whose top and bottom share no factor except 1.' },
    ],
    mistakes: [
      R`Thinking a bigger bottom number means a bigger fraction. \(\frac{1}{8}\) is smaller than \(\frac{1}{3}\), because eighths are smaller parts.`,
      'Counting tick marks on a number line. Count the jumps between the marks instead.',
      R`Adding to make an equal fraction. \(\frac{3}{4}\) is not \(\frac{5}{6}\). Multiply or divide, and do it to both numbers.`,
      'Comparing parts of different wholes. Half of a small pizza is not the same as half of a large one.',
    ],
    visual: { type: 'fractionBars', bars: [{ n: 1, d: 2 }, { n: 2, d: 4 }, { n: 4, d: 8 }], alt: 'Three fraction bars with the same amount shaded: one half, two fourths and four eighths.' },
  },

  examples: [
    {
      title: 'Naming a fraction',
      problem: 'A bar is cut into 6 equal parts. 5 parts are shaded. What fraction is shaded?',
      steps: ['The whole has 6 equal parts, so the bottom number is 6.', '5 parts are shaded, so the top number is 5.'],
      answer: R`\(\frac{5}{6}\)`,
      visual: { type: 'fractionBars', bars: [bar(5, 6)], alt: 'A bar cut into 6 equal parts with 5 shaded.' },
    },
    {
      title: 'A fraction on a number line',
      problem: 'Each whole is cut into 4 equal jumps. A point is 5 jumps from 0. What fraction is at the point?',
      steps: [R`There are 4 jumps from 0 to 1. Each jump is \(\frac{1}{4}\).`, 'The point is 5 jumps from 0.', R`The point is at \(\frac{5}{4}\). That is more than 1.`],
      answer: R`\(\frac{5}{4}\)`,
      visual: linePic(5, 4, 2),
    },
    {
      title: 'Making an equivalent fraction',
      problem: R`What number goes in the box? \(\;\frac{2}{3} = \frac{\square}{12}\)`,
      steps: [R`Look at the bottoms: \(3 \times 4 = 12\).`, R`Do the same to the top: \(2 \times 4 = 8\).`, R`\(\frac{2}{3}\) is equal to \(\frac{8}{12}\).`],
      answer: R`\(8\)`,
      visual: { type: 'fractionBars', bars: [{ n: 2, d: 3 }, { n: 8, d: 12 }], alt: 'Two bars with the same amount shaded: two thirds and eight twelfths.' },
    },
    {
      title: 'Word problem: who walked farther?',
      word: true,
      problem: R`Mia walks \(\frac{3}{4}\) mile. Leo walks \(\frac{5}{8}\) mile. Who walks farther?`,
      steps: ['Fourths and eighths are different sizes. Rename both as eighths.', R`\(\frac{3}{4} = \frac{3 \times 2}{4 \times 2} = \frac{6}{8}\).`, R`6 eighths is more than 5 eighths, so \(\frac{3}{4} > \frac{5}{8}\).`],
      answer: 'Mia walks farther.',
      visual: { type: 'fractionBars', bars: [{ n: 3, d: 4, label: 'Mia: 3/4' }, { n: 5, d: 8, label: 'Leo: 5/8' }], alt: 'Two bars. Three fourths is shaded on the first and five eighths on the second. The first has more shaded.' },
    },
  ],

  models: [
    {
      id: 'show-a-fraction',
      title: 'Show a fraction',
      intro: 'Type a top number and a bottom number. See the fraction on bars and on a number line.',
      inputs: [
        { name: 'n', label: 'Top number', type: 'int', min: 0, max: 24, value: 5 },
        { name: 'd', label: 'Bottom number', type: 'int', min: 1, max: 12, value: 4 },
      ],
      compute({ n, d }) {
        const f = frac(n, d);
        const steps = [d === 1 ? 'The bottom number is 1, so each part is a whole.' : `Each whole is cut into ${d} equal parts. One part is ${F(1, d)}.`, `Count ${plural(n, 'part')}: that is ${F(n, d)}.`];
        if (n === 0) steps.push('No parts are counted, so the fraction is 0.');
        else if (f.isInt()) steps.push(d === 1 ? `${F(n, d)} is the whole number ${n}.` : `${d} parts make each whole, so ${F(n, d)} is ${plural(f.n, 'whole')}.`);
        else if (n > d) steps.push(R`That is more than 1 whole: \(${fracTex(n, d)} = ${f.mixedTex()}\).`);
        else steps.push(`${n} is less than ${d}, so the fraction is less than 1.`);
        if (f.d !== d && !f.isInt()) steps.push(R`In simplest form, divide the top and the bottom by ${d / f.d}: \(${f.tex()}\).`);
        const wholes = Math.max(1, Math.ceil(n / d));
        return {
          problem: `What does ${F(n, d)} mean?`,
          steps,
          answer: f.isInt() ? R`\(${fracTex(n, d)} = ${f.n}\)` : n > d || f.d !== d ? R`\(${fracTex(n, d)} = ${f.mixedTex()}\)` : F(n, d),
          visual: wholes <= 6
            ? [{ type: 'fractionBars', bars: [{ n, d }] }, { type: 'numberLine', min: 0, max: wholes, step: 1 / d, labels: Array.from({ length: wholes + 1 }, (_, i) => ({ value: i, text: String(i) })), points: [{ value: n / d, label: `${n}/${d}` }], alt: `A number line from 0 to ${wholes} with ${n}/${d} marked.` }]
            : undefined,
        };
      },
    },
    {
      id: 'compare-walks',
      title: 'Word problem: who walks farther?',
      word: true,
      intro: 'Change the two distances. See how the fractions are renamed and compared.',
      inputs: [
        { name: 'a', label: 'Ana: top number', type: 'int', min: 1, max: 12, value: 2 },
        { name: 'b', label: 'Ana: bottom number', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'c', label: 'Ben: top number', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'd', label: 'Ben: bottom number', type: 'int', min: 1, max: 12, value: 5 },
      ],
      compute({ a, b, c, d }) {
        const L = lcm(b, d);
        const x = a * (L / b);
        const y = c * (L / d);
        const steps = [];
        if (b === d) steps.push(`Both are ${fractionWord(b)}, so the parts are the same size. Compare the tops.`);
        else {
          steps.push(`The parts are different sizes. Rename both with the bottom number ${L}.`);
          if (L !== b) steps.push(R`Ana: \(${fracTex(a, b)} = \frac{${a} \times ${L / b}}{${b} \times ${L / b}} = ${fracTex(x, L)}\).`);
          if (L !== d) steps.push(R`Ben: \(${fracTex(c, d)} = \frac{${c} \times ${L / d}}{${d} \times ${L / d}} = ${fracTex(y, L)}\).`);
        }
        steps.push(x === y ? `${x} and ${y} are the same, so the fractions are equal.` : R`${x} is ${x > y ? 'more' : 'less'} than ${y}, so \(${fracTex(a, b)} ${x > y ? '>' : '<'} ${fracTex(c, d)}\).`);
        return {
          problem: `Ana walks ${F(a, b)} mile. Ben walks ${F(c, d)} mile. Who walks farther?`,
          steps,
          answer: x === y ? 'They walk the same distance.' : `${x > y ? 'Ana' : 'Ben'} walks farther.`,
          visual: a / b <= 6 && c / d <= 6 ? { type: 'fractionBars', bars: [{ n: a, d: b, label: `Ana: ${a}/${b}` }, { n: c, d, label: `Ben: ${c}/${d}` }] } : undefined,
        };
      },
    },
  ],

  quiz: {
    easy: [easyNameBar, easyUnit, easyCompareUnit, easyStory],
    medium: [mediumNumberLine, mediumCompare, mediumWholes, mediumSameAmount],
    hard: [hardEquivalent, hardSimplest, hardCompare, hardStory],
    challenge: [challengeOrder, challengeHalf, challengeTwoStepEquivalent, challengeStory],
  },
};
