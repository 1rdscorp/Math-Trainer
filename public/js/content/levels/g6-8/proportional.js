import { R, q, num, frac, money, txt, person, round, approx } from '../../lib/index.js';
import { M, mixed, clean, unitFmt, usd, singular } from './_shared.js';

const xyTable = (xs, k, headers = ['x', 'y'], b = 0) => ({ type: 'table', headers, rows: xs.map((x) => [x, round(k * x + b, 2)]), alt: `A table of values: ${xs.map((x) => `${headers[0]} = ${x}, ${headers[1]} = ${round(k * x + b, 2)}`).join('; ')}.` });
const eq = (tex) => R`\(y = ${tex}\)`;

// ───────────── Easy: unit rates with friendly fractions, the constant of proportionality, testing a table ─────────────

function easyUnitRateFraction(rng) {
  const t = rng.pick([frac(1, 2), frac(1, 3), frac(1, 4), frac(1, 5), frac(2, 3), frac(3, 4)]);
  const c = rng.pick([
    { r: [2, 3, 4], text: (d, tt) => `${person(rng)} walks ${d} in ${tt} hour. What is the walking speed in miles per hour?`, unit: 'mile', per: 'miles per hour' },
    { r: [6, 8, 9, 12, 15], text: (d, tt) => `A cyclist rides ${d} in ${tt} hour. What is the cyclist's speed in miles per hour?`, unit: 'mile', per: 'miles per hour' },
    { r: [4, 6, 8, 10, 12], text: (d, tt) => `A tap pours ${d} of water in ${tt} minute. How many gallons does it pour per minute?`, unit: 'gallon', per: 'gallons per minute' },
  ]);
  const r = rng.pick(c.r);
  const d = t.mul(r);
  if (d.isInt()) return easyUnitRateFraction(rng);
  const amount = `${mixed(d)} ${d.value > 1 ? `${c.unit}s` : c.unit}`;
  return q({
    prompt: c.text(amount, mixed(t)),
    correct: r,
    fmt: (v) => `${mixed(v)} ${c.per}`,
    wrong: [{ value: d.mul(t), why: 'A unit rate is found by dividing the amount by the time, not multiplying.' }, { value: t.div(d), why: `That divides the time by the amount. For ${c.per}, divide the amount by the time.` }, r + 1, r * 2],
    solution: [R`A unit rate is the amount for 1 unit of time. Divide the amount by the time: \(${d.mixedTex()} \div ${t.tex()}\).`, R`Multiply by the reciprocal: \(${d.tex()} \times ${t.inv().tex()} = ${r}\).`, `The unit rate is ${r} ${c.per}.`],
    rule: 0,
    skill: 'unit rates with fractions',
    check: () => (t.mul(r).eq(d) ? true : 'rate times time is not the amount'),
  });
}

function easyFindK(rng) {
  const k = rng.int(2, 12);
  const xs = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10], 4).sort((a, b) => a - b);
  const [x1, y1] = [xs[0], k * xs[0]];
  return q({
    prompt: R`In this table, \(y\) is proportional to \(x\). What is the constant of proportionality?`,
    visual: xyTable(xs, k),
    correct: k,
    wrong: [{ value: y1 - x1, why: 'In a proportional relationship y is a multiple of x. Divide y by x instead of subtracting.' }, { value: frac(1, k), why: R`That is \(x \div y\). The constant of proportionality is \(y \div x\).` }, k + 1, k - 1],
    solution: [R`The constant of proportionality is \(k = y \div x\). Use any row: \(${y1} \div ${x1} = ${k}\).`, R`Check another row: \(${k * xs[2]} \div ${xs[2]} = ${k}\). ✓`, R`So \(k = ${k}\), and the equation is \(y = ${k}x\).`],
    rule: 2,
    skill: 'constant of proportionality',
    check: () => (xs.every((x) => (k * x) / x === k) ? true : 'ratios are not constant'),
  });
}

function easyIsProportional(rng) {
  const k = rng.int(2, 9);
  const yes = rng.bool();
  const b = rng.int(1, 6);
  const xs = yes ? rng.pick([[2, 3, 5, 8], [2, 3, 4, 9], [2, 5, 6, 10], [3, 4, 7, 9], [2, 4, 5, 7]]) : rng.pick([[2, 3, 4, 5], [2, 4, 6, 8], [3, 4, 5, 6]]);
  const ys = xs.map((x) => k * x + (yes ? 0 : b));
  const options = {
    same: R`Yes, because \(y \div x\) is \(${yes ? k : ys[0]}\) in every row.`,
    differ: R`No, because \(y \div x\) is not the same in every row.`,
    steps: yes ? R`No, because \(y\) does not go up by the same amount from row to row.` : R`Yes, because \(y\) goes up by the same amount from row to row.`,
    other: yes ? R`No, because the table has no row for \(x = 0\).` : R`Yes, because \(y\) gets bigger whenever \(x\) gets bigger.`,
  };
  return q({
    prompt: R`Is \(y\) proportional to \(x\) in this table?`,
    visual: xyTable(xs, k, ['x', 'y'], yes ? 0 : b),
    correct: yes ? options.same : options.differ,
    wrong: [
      yes ? options.differ : { value: options.same, why: R`That is true for the first row only. Check the others: \(${ys[1]} \div ${xs[1]} = ${num(ys[1] / xs[1], { places: 2 })}\).` },
      { value: options.steps, why: yes ? R`The \(x\)-values do not go up evenly either. The test is whether \(y \div x\) stays the same.` : R`Going up in equal steps is not enough. The test is whether \(y \div x\) stays the same.` },
      options.other,
    ],
    solution: [
      R`Divide \(y\) by \(x\) in each row: ${xs.map((x, i) => R`\(${ys[i]} \div ${x} ${clean(ys[i] / x) != null ? '=' : R`\approx`} ${num(ys[i] / x, { places: 2 })}\)`).join(', ')}.`,
      yes ? R`The quotient is always \(${k}\), so \(y\) is proportional to \(x\), with \(y = ${k}x\).` : 'The quotients are different, so the relationship is not proportional.',
    ],
    rule: 1,
    skill: 'testing for proportionality',
    check: () => (new Set(ys.map((y, i) => round(y / xs[i], 6))).size === 1 === yes ? true : 'table does not match the answer'),
  });
}

// ───────────── Medium: equations y = kx, solving proportions, reading a graph ─────────────

function mediumEquation(rng) {
  const k = rng.pick([0.5, 1.5, 2.5, 3.5, 4.5, 0.25, 0.75, 1.25, 0.2, 0.4, 1.2]);
  const base = Number.isInteger(k * 2) ? 2 : Number.isInteger(k * 4) ? 4 : 5;
  const xs = rng.sample([1, 2, 3, 4, 5, 6], 3).sort((a, b) => a - b).map((m) => m * base);
  const [x1, y1] = [xs[0], round(k * xs[0], 2)];
  const diff = round(y1 - x1, 2);
  return q({
    prompt: R`In this table, \(y\) is proportional to \(x\). Which equation shows the relationship?`,
    visual: xyTable(xs, k),
    correct: eq(`${num(k)}x`),
    wrong: [
      { value: eq(`${clean(1 / k) != null ? num(1 / k) : frac(100, Math.round(k * 100)).tex()}x`), why: R`That uses \(x \div y\). The constant of proportionality is \(y \div x = ${num(k)}\).` },
      { value: eq(diff > 0 ? `x + ${num(diff)}` : `x - ${num(-diff)}`), why: 'That fits the first row only. A proportional relationship multiplies x by a constant.' },
      eq(`${num(k)} + x`),
      eq(`${num(round(k + 1, 2))}x`),
    ],
    solution: [R`Find \(k = y \div x\) from any row: \(${num(y1)} \div ${x1} = ${num(k)}\).`, R`Check another row: \(${num(round(k * xs[1], 2))} \div ${xs[1]} = ${num(k)}\). ✓`, R`A proportional relationship has the form \(y = kx\), so \(y = ${num(k)}x\).`],
    rule: 2,
    skill: 'writing y = kx',
    check: () => (xs.every((x) => approx(round(k * x, 2) / x, k)) ? true : 'equation does not fit the table'),
  });
}

function mediumSolveProportion(rng) {
  for (;;) {
    const u = rng.pick([0.75, 1.25, 1.5, 2.25, 2.5, 3.5, 4.5, 12.5, 9.5, 7.5]);
    const a = rng.int(2, 6);
    const c = rng.int(3, 12);
    if (c === a || c % a === 0) continue;
    const [first, ans] = [round(u * a, 2), round(u * c, 2)];
    const s = rng.pick([
      { text: `${a} pounds of apples cost ${money(first)}. At the same price per pound, how much do ${c} pounds cost?`, unit: 'pounds' },
      { text: `${a} yards of fabric cost ${money(first)}. At the same price per yard, how much do ${c} yards cost?`, unit: 'yards' },
      { text: `${person(rng)} earns ${money(first * 4)} for ${a} hours of work. At the same hourly rate, how much does ${c} hours of work pay?`, unit: 'hours', scale: 4 },
    ]);
    const k = s.scale ?? 1;
    const [p1, p2] = [round(first * k, 2), round(ans * k, 2)];
    return q({
      prompt: s.text,
      correct: p2,
      fmt: money,
      wrong: [
        { value: round(p1 + (c - a), 2), why: `The amount of money changes by multiplying, not by adding or subtracting $1 for each ${s.unit.slice(0, -1)}.` },
        { value: round((p1 * a) / c, 2), why: c > a ? `More ${s.unit} means more money, not less. Check which numbers are multiplied.` : `Fewer ${s.unit} means less money, not more. Check which numbers are multiplied.` },
        round(p1 * c, 2),
        round(p2 + (u * k) / 2, 2),
      ],
      solution: [
        R`The two ratios of dollars to ${s.unit} are equal: \(\frac{${usd(p1)}}{${a}} = \frac{x}{${c}}\).`,
        R`Find the unit rate: \(${usd(p1)} \div ${a} = ${usd(round((u * k), 2))}\) dollars for each ${s.unit.slice(0, -1)}.`,
        R`Multiply by ${c}: \(${usd(round(u * k, 2))} \times ${c} = ${usd(p2)}\). The answer is ${money(p2)}.`,
      ],
      rule: 4,
      skill: 'solving proportions',
      check: () => (approx(p1 / a, p2 / c) ? true : 'ratios are not equal'),
    });
  }
}

function mediumGraphPoint(rng) {
  const k = rng.pick([0.5, 1.5, 2, 2.5, 3, 4, 0.25, 0.75, 1.25, 5]);
  const a = (Number.isInteger(k) ? 1 : Number.isInteger(k * 2) ? 2 : 4) * rng.int(1, 3) + (Number.isInteger(k) ? 1 : 0);
  const b = k * a;
  const [xl, yl, what] = rng.pick([['hours', 'dollars', 'the pay in dollars for each hour'], ['pounds', 'dollars', 'the cost in dollars of each pound'], ['minutes', 'liters', 'the liters pumped each minute'], ['seconds', 'meters', 'the meters travelled each second']]);
  const xMax = a + 2;
  return q({
    prompt: R`The graph shows a proportional relationship between ${xl} (\(x\)) and ${yl} (\(y\)). The line passes through \((${a}, ${num(b)})\). What is the constant of proportionality?`,
    visual: { type: 'plot', x: [0, xMax], y: [0, Math.ceil(k * xMax)], axisLabels: [xl, yl], fns: [{ f: (x) => k * x }], points: [{ x: 0, y: 0 }, { x: a, y: b, label: `(${a}, ${txt(b)})` }], alt: `A straight line through the origin and the point (${a}, ${txt(b)}), with ${xl} on the horizontal axis and ${yl} on the vertical axis.` },
    correct: k,
    wrong: [{ value: clean(a / b, 3), why: R`That is \(x \div y\). The constant of proportionality is \(y \div x\).` }, b !== k ? { value: b, why: R`That is the \(y\)-value when \(x = ${a}\). The constant is the \(y\)-value when \(x = 1\).` } : null, round(Math.abs(b - a), 2) || null, round(k + 1, 2), round(k * 2, 2)],
    solution: [R`For a proportional relationship, \(k = y \div x\) at any point on the line (except the origin).`, R`\(${num(b)} \div ${a} = ${num(k)}\).`, R`So \(k = ${num(k)}\): the graph passes through \((1, ${num(k)})\), and it is ${what}.`],
    rule: 3,
    skill: 'graphs of proportional relationships',
    check: () => (approx(k * a, b) ? true : 'point is not on the line'),
  });
}

// ───────────── Hard: unit rates that are fractions, scale drawings, recognising proportional relationships ─────────────

function hardComplexUnitRate(rng) {
  for (;;) {
    const proper = () => {
      const d = rng.int(2, 8);
      return frac(rng.int(1, d - 1), d);
    };
    const [A, B] = [proper(), proper()];
    const r = A.div(B);
    if (A.eq(B) || r.isInt() || r.d > 20 || B.n === 1) continue;
    const name = person(rng);
    const c = rng.pick([
      { text: `${name} walks ${mixed(A)} mile in ${mixed(B)} hour. What is ${name}'s speed in miles per hour?`, per: 'miles per hour', one: 'hour', by: 'the time in hours' },
      { text: `A pump fills ${mixed(A)} of a tank in ${mixed(B)} hour. At that rate, how many tanks does it fill per hour?`, per: 'tanks per hour', one: 'hour', by: 'the time in hours' },
      { text: `A recipe uses ${mixed(A)} cup of sugar for every ${mixed(B)} cup of flour. How many cups of sugar are used for each 1 cup of flour?`, per: 'cups of sugar per cup of flour', one: 'cup of flour', by: 'the amount of flour' },
      { text: `A seedling grows ${mixed(A)} inch in ${mixed(B)} week. At that rate, how many inches does it grow per week?`, per: 'inches per week', one: 'week', by: 'the time in weeks' },
    ]);
    return q({
      prompt: c.text,
      correct: r,
      fmt: (v) => `${mixed(v)} ${v.eq(1) ? c.per.replace(/^\w+/, (w) => singular(w)) : c.per}`,
      wrong: [{ value: A.mul(B), why: 'A unit rate comes from dividing the two amounts, not multiplying them.' }, { value: B.div(A), why: `That divides the wrong way round. For ${c.per}, divide by ${c.by}.` }, r.add(frac(1, r.d)), A.add(B)],
      solution: [R`The rate for 1 ${c.one} is the first amount divided by the second: \(${A.tex()} \div ${B.tex()}\).`, R`Multiply by the reciprocal: \(${A.tex()} \times ${B.inv().tex()} = \frac{${A.n * B.d}}{${A.d * B.n}}\).`, R`In simplest form the unit rate is \(${r.mixedTex()}\) ${c.per}.`],
      rule: 0,
      skill: 'unit rates with fractions',
      check: () => (r.mul(B).eq(A) ? true : 'rate times the second amount is not the first'),
    });
  }
}

function hardScaleDrawing(rng) {
  const [small, big] = rng.pick([['centimeter', 'meters'], ['inch', 'feet'], ['centimeter', 'kilometers'], ['inch', 'miles']]);
  const s = rng.pick([2, 2.5, 4, 5, 8, 10, 20, 50]);
  const L = rng.pick([1.5, 2.5, 3, 3.5, 4, 4.5, 6, 7.5, 9]);
  const actual = round(L * s, 2);
  const thing = big === 'kilometers' || big === 'miles' ? rng.pick(['a road', 'a river', 'a hiking trail']) : rng.pick(['a room', 'a garden', 'a swimming pool', 'a stage']);
  const many = `${small === 'inch' ? 'inches' : 'centimeters'}`;
  const toActual = rng.bool(0.6);
  return q({
    prompt: toActual
      ? `A scale drawing uses the scale 1 ${small} to ${s} ${big}. On the drawing, ${thing} is ${L} ${many} long. How long is it in real life?`
      : `A scale drawing uses the scale 1 ${small} to ${s} ${big}. In real life, ${thing} is ${txt(actual)} ${big} long. How long is it on the drawing?`,
    correct: toActual ? actual : L,
    fmt: (v) => `${M(v)} ${v === 1 ? singular(toActual ? big : many) : toActual ? big : many}`,
    wrong: toActual
      ? [{ value: clean(L / s, 3), why: `Each ${small} on the drawing stands for ${s} ${big}, so the real length is larger. Multiply by ${s}.` }, { value: round(L + s, 2), why: `Every ${small} stands for ${s} ${big}, so multiply. Adding counts only one of them.` }, round(actual * 2, 2), round(actual + s, 2)]
      : [{ value: round(actual * s, 2), why: `The drawing is smaller than real life. Divide the real length by ${s}.` }, { value: clean(s / actual, 3), why: `Divide the real length by ${s}, not the other way round.` }, round(L + 1, 2), round(L * 2, 2)],
    solution: toActual
      ? [`The scale says every 1 ${small} on the drawing is ${s} ${big} in real life.`, R`Multiply the drawing length by ${s}: \(${L} \times ${s} = ${num(actual)}\).`, `The real length is ${txt(actual)} ${big}.`]
      : [`The scale says every ${s} ${big} in real life is 1 ${small} on the drawing.`, R`Divide the real length by ${s}: \(${num(actual)} \div ${s} = ${L}\).`, `The length on the drawing is ${L} ${many}.`],
    rule: 5,
    skill: 'scale drawings',
    check: () => (approx(L * s, actual) ? true : 'scale conversion is wrong'),
  });
}

const SITUATIONS = {
  yes: ['The cost of gasoline at $3.20 per gallon, and the number of gallons bought', 'The distance travelled at a steady 50 miles per hour, and the time spent driving', 'The pay for a job at $14 an hour, and the number of hours worked', 'The perimeter of a square, and the length of one side', 'The number of wheels, and the number of bicycles', 'The weight of a stack of identical books, and the number of books'],
  no: ['The cost of a taxi ride with a $4 starting fee plus $2 per mile, and the number of miles', "A person's height, and the person's age", 'The area of a square, and the length of one side', 'The time left in a 60-minute lesson, and the time that has passed', 'The cost of a gym with a $30 joining fee plus $20 a month, and the number of months', "A younger sister's age, and an older brother's age", 'The temperature outside, and the time of day', 'The height of a candle that burns down 2 centimeters an hour, and the hours it has burned'],
};

function hardWhichProportional(rng) {
  if (rng.bool(0.45)) {
    const right = rng.pick(SITUATIONS.yes);
    return q({
      prompt: 'Which pair of quantities is in a proportional relationship?',
      correct: right,
      wrong: rng.sample(SITUATIONS.no, 3),
      solution: ['In a proportional relationship, one quantity is always the same multiple of the other, and when one is 0 the other is 0.', `"${right}" fits: doubling one quantity doubles the other.`, 'The other pairs have a starting amount, a constant difference, or no constant multiplier.'],
      rule: 1,
      skill: 'recognising proportional relationships',
    });
  }
  const k = rng.int(2, 9);
  const b = rng.int(1, 9);
  const right = rng.pick([eq(`${k}x`), eq(R`\frac{x}{${k}}`), eq(`${num(k / 10)}x`)]);
  const wrong = rng.sample(
    [
      { value: eq(`${k}x + ${b}`), why: R`When \(x = 0\) this gives \(y = ${b}\), not 0. A proportional relationship has no added constant.` },
      { value: eq(`x^{2}`), why: R`Here \(y \div x\) changes: it is 1 when \(x = 1\) and 2 when \(x = 2\).` },
      { value: eq(R`\frac{${k}}{x}`), why: R`Here \(y\) gets smaller as \(x\) grows. The product \(xy\) is constant, not the quotient \(y \div x\).` },
      { value: eq(`x + ${b}`), why: R`Adding a constant keeps the difference the same, not the quotient \(y \div x\).` },
      { value: eq(`${k}x - ${b}`), why: R`When \(x = 0\) this gives \(y = ${-b}\), not 0.` },
    ],
    3,
  );
  return q({
    prompt: R`Which equation shows a proportional relationship between \(x\) and \(y\)?`,
    correct: right,
    wrong,
    solution: [R`A proportional relationship can be written as \(y = kx\) for some constant \(k\).`, `${right} has that form: y is always the same multiple of x, and y is 0 when x is 0.`, 'The other equations add or subtract a constant, or do not multiply x by a constant.'],
    rule: 2,
    skill: 'recognising proportional relationships',
  });
}

// ───────────── Challenge ─────────────

function challengeRescale(rng) {
  for (;;) {
    const a = rng.pick([2, 3, 4, 5, 6, 8, 10]);
    const b = rng.pick([2, 3, 4, 5, 6, 8, 10]);
    const L = rng.pick([3, 4, 4.5, 6, 7.5, 8, 9, 10, 12]);
    const actual = L * a;
    const ans = clean(actual / b, 1);
    if (a === b || ans == null) continue;
    return q({
      prompt: `On a map with the scale 1 centimeter to ${a} kilometers, a road is ${L} centimeters long. How long is the same road on a second map with the scale 1 centimeter to ${b} kilometers?`,
      correct: ans,
      fmt: unitFmt('centimeter'),
      wrong: [
        { value: actual, why: 'That is the real length of the road in kilometers. Now change it into centimeters on the second map.' },
        { value: clean((L * b) / a, 2), why: `Find the real length first by multiplying by ${a}. Then divide by ${b} for the second map.` },
        clean(L + (a - b), 1) > 0 ? round(L + (a - b), 1) : null,
        round(ans + 1, 1),
        round(ans * 2, 1),
      ],
      solution: [R`Real length from the first map: \(${L} \times ${a} = ${actual}\) kilometers.`, R`On the second map each centimeter stands for ${b} kilometers, so divide: \(${actual} \div ${b} = ${num(ans)}\).`, `The road is ${num(ans)} centimeters long on the second map.`],
      rule: 5,
      skill: 'scale drawings',
      check: () => (approx(ans * b, L * a) ? true : 'the two maps give different real lengths'),
    });
  }
}

function challengeAreaScale(rng) {
  const s = rng.pick([2, 3, 4, 5, 10]);
  const [w, h] = [rng.int(2, 8), rng.int(2, 8)];
  const [unit, real] = rng.pick([['centimeters', 'meters'], ['inches', 'feet']]);
  const one = unit === 'inches' ? 'inch' : 'centimeter';
  const area = w * s * (h * s);
  const thing = rng.pick(['a classroom', 'a garden', 'a parking lot', 'a stage', 'a patio']);
  return q({
    prompt: `On a scale drawing with the scale 1 ${one} to ${s} ${real}, ${thing} is a rectangle ${w} ${unit} by ${h} ${unit}. What is its real area?`,
    visual: { type: 'polygon', points: [[0, 0], [w, 0], [w, h], [0, h]], sides: [`${w} ${unit === 'inches' ? 'in' : 'cm'}`, `${h} ${unit === 'inches' ? 'in' : 'cm'}`, '', ''], right: [0, 1, 2, 3], alt: `A rectangle on a scale drawing, ${w} ${unit} by ${h} ${unit}.` },
    correct: area,
    fmt: (v) => `${M(v, { commas: true })} square ${real}`,
    wrong: [{ value: w * h * s, why: `Both the length and the width are multiplied by ${s}, so the area is multiplied by ${s} twice.` }, { value: w * h, why: `That is the area on the drawing, in square ${unit}. Change each side to ${real} first.` }, (w + h) * s * 2 !== area ? { value: (w + h) * s * 2, why: 'That is the real perimeter. Area is length times width.' } : null, area + s * s],
    solution: [R`Change each side to real ${real}: \(${w} \times ${s} = ${w * s}\) and \(${h} \times ${s} = ${h * s}\).`, R`Area = length × width: \(${w * s} \times ${h * s} = ${num(area, { commas: true })}\) square ${real}.`, R`Notice that the drawing's area, \(${w * h}\), is multiplied by \(${s}^{2} = ${s * s}\).`],
    rule: 5,
    skill: 'scale drawings and area',
    check: () => (area === w * h * s * s ? true : 'area is wrong'),
  });
}

function challengeCompareRates(rng) {
  for (;;) {
    const kA = rng.pick([12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30]);
    const kB = rng.pick([12, 14, 16, 18, 21, 24, 26, 28, 31]);
    const xs = rng.pick([[2, 4, 6], [2, 6, 8], [4, 6, 10]]);
    const diff = round(Math.abs(kA - kB), 1);
    const [what, unit, A, B] = rng.pick([['pages', 'minutes', 'Printer A', 'Printer B'], ['liters', 'minutes', 'Pump A', 'Pump B'], ['meters', 'seconds', 'Robot A', 'Robot B']]);
    const one = unit.slice(0, -1);
    const [fast, slow] = kA > kB ? [A, B] : [B, A];
    const y1 = kA * xs[0];
    const naive = round(Math.abs(y1 - kB), 1);
    const amount = (d) => `${M(d)} ${d === 1 ? what.slice(0, -1) : what} per ${one}`;
    const say = (who, d) => `${who}, by ${amount(d)}`;
    if (naive === diff) continue;
    return q({
      prompt: R`${A}'s output is shown in the table. ${B}'s output is given by \(y = ${kB}x\), where \(x\) is the number of ${unit} and \(y\) is the number of ${what}. Which is faster, and by how much?`,
      visual: xyTable(xs, kA, [`${unit} (x)`, `${what} (y)`]),
      correct: say(fast, diff),
      wrong: [{ value: say(slow, diff), why: `The difference is right, but the faster one has the greater unit rate.` }, { value: say(y1 > kB ? A : B, naive), why: `The first row of the table is for ${xs[0]} ${unit}, not 1. Divide to find ${A}'s unit rate.` }, say(fast, round(diff + 2, 1)), say(slow, round(diff + 2, 1))],
      solution: [R`${A}'s unit rate from the table: \(${num(y1)} \div ${xs[0]} = ${num(kA)}\) ${what} per ${one}.`, R`${B}'s unit rate is the constant in \(y = ${kB}x\): \(${kB}\) ${what} per ${one}.`, R`\(${num(Math.max(kA, kB))} - ${num(Math.min(kA, kB))} = ${num(diff)}\), so ${fast} is faster by ${amount(diff)}.`],
      rule: 2,
      skill: 'comparing proportional relationships',
      check: () => (approx(kA, y1 / xs[0]) && approx(diff, Math.abs(kA - kB)) ? true : 'rates are wrong'),
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'proportional',
  title: 'Proportional Relationships',
  summary: 'Find unit rates with fractions, test whether a relationship is proportional, use y = kx and its graph, and work with scale drawings.',
  grade: 'Grade 7',
  standards: ['CCSS 7.RP.A.1', 'CCSS 7.RP.A.2', 'CCSS 7.G.A.1'],

  explain: {
    intro: R`Two quantities are in a **proportional relationship** when one is always the same multiple of the other. Pay at a fixed hourly rate, cost at a fixed price per pound and distance at a steady speed all work this way. The multiplier is called the **constant of proportionality**, and it is the same thing as the unit rate.`,
    rules: [
      {
        title: 'Unit rates with fractions',
        text: R`A unit rate is still "amount ÷ amount", even when the amounts are fractions. Divide the first quantity by the second, multiplying by the reciprocal.`,
        example: R`Walking \(\frac{1}{2}\) mile in \(\frac{1}{4}\) hour is \(\frac{1}{2} \div \frac{1}{4} = \frac{1}{2} \times 4 = 2\) miles per hour.`,
      },
      {
        title: 'Testing for a proportional relationship',
        text: R`In a **table**, divide \(y\) by \(x\) in every row. If the quotient is always the same, the relationship is proportional. On a **graph**, the points must lie on a straight line through the origin \((0, 0)\). Going up in equal steps is not enough: \(y = 2x + 3\) is not proportional.`,
        example: R`For the pairs \((2, 5)\), \((4, 10)\), \((6, 15)\): \(5 \div 2 = 10 \div 4 = 15 \div 6 = 2.5\). Proportional.`,
      },
      {
        title: 'The constant of proportionality and y = kx',
        text: R`The constant quotient \(k = y \div x\) is the constant of proportionality. Every proportional relationship can be written as \(y = kx\). There is no added or subtracted number.`,
        example: R`If \(k = 2.5\), the equation is \(y = 2.5x\). When \(x = 8\), \(y = 2.5 \times 8 = 20\).`,
      },
      {
        title: 'Reading the graph',
        text: R`The graph of \(y = kx\) is a straight line through \((0, 0)\). It also passes through \((1, k)\), so the \(y\)-value at \(x = 1\) is the unit rate. Any other point \((x, y)\) tells you that \(x\) units of one quantity go with \(y\) units of the other.`,
        example: R`A line through \((0, 0)\) and \((4, 10)\) has \(k = 10 \div 4 = 2.5\), so it passes through \((1, 2.5)\).`,
      },
      {
        title: 'Solving a proportion',
        text: R`A proportion says two ratios are equal. To find a missing value, find the unit rate and multiply, or scale both parts of a ratio by the same number.`,
        example: R`3 pounds cost $7.50. For 5 pounds: \(7.50 \div 3 = 2.50\) per pound, and \(2.50 \times 5 = 12.50\).`,
      },
      {
        title: 'Scale drawings',
        text: R`A scale such as "1 inch to 4 feet" is a unit rate between the drawing and real life. Multiply a drawing length by the scale to get the real length, and divide to go back. Because both sides of a rectangle are scaled, **areas are multiplied by the scale twice**.`,
        example: R`At 1 inch to 4 feet, a room drawn 3 inches by 2 inches is really 12 feet by 8 feet. Its area is 96 square feet, which is \(6 \times 4^{2}\).`,
      },
    ],
    vocab: [
      { term: 'proportional relationship', def: R`A relationship in which \(y\) is always the same multiple of \(x\).` },
      { term: 'constant of proportionality', def: R`The number \(k\) in \(y = kx\). It equals \(y \div x\) for every pair of values.` },
      { term: 'unit rate', def: 'The amount of one quantity for 1 unit of the other.' },
      { term: 'proportion', def: 'A statement that two ratios are equal.' },
      { term: 'scale', def: 'The ratio between a length on a drawing or map and the real length.' },
    ],
    mistakes: [
      R`Dividing the wrong way round. The constant of proportionality is \(y \div x\), not \(x \div y\).`,
      R`Calling a relationship proportional because it goes up in equal steps. Check that \(y \div x\) is constant, or that the graph passes through the origin.`,
      'Adding instead of multiplying to scale up: 3 pounds for $7.50 does not mean 5 pounds for $9.50.',
      'Multiplying an area by the scale only once. Each of the two dimensions is scaled.',
    ],
    visual: { type: 'plot', x: [0, 6], y: [0, 15], axisLabels: ['x', 'y'], fns: [{ f: (x) => 2.5 * x, label: 'y = 2.5x' }], points: [{ x: 0, y: 0, label: '(0, 0)' }, { x: 1, y: 2.5, label: '(1, 2.5)', color: 'b' }, { x: 4, y: 10, label: '(4, 10)' }], alt: 'The graph of y = 2.5x: a straight line through the origin, the point (1, 2.5) and the point (4, 10).' },
  },

  examples: [
    {
      title: 'Word problem: a unit rate with fractions',
      word: true,
      problem: R`Lena walks \(\frac{1}{2}\) mile in \(\frac{1}{4}\) hour. What is Lena's speed in miles per hour? How far does Lena walk in \(1\frac{1}{2}\) hours at that speed?`,
      steps: [
        R`Speed is distance ÷ time: \(\frac{1}{2} \div \frac{1}{4}\).`,
        R`Multiply by the reciprocal: \(\frac{1}{2} \times 4 = 2\). The unit rate is 2 miles per hour.`,
        R`Distance = rate × time: \(2 \times 1\frac{1}{2} = 3\) miles.`,
      ],
      answer: '2 miles per hour; 3 miles',
    },
    {
      title: 'Is the table proportional? Find k and the equation',
      problem: R`The table shows the cost \(y\), in dollars, of \(x\) pounds of grapes. Is the relationship proportional? If so, write an equation.`,
      steps: [
        R`Divide \(y\) by \(x\) in each row: \(5 \div 2 = 2.5\), \(10 \div 4 = 2.5\), \(15 \div 6 = 2.5\).`,
        R`The quotient is always 2.5, so the relationship is proportional and \(k = 2.5\).`,
        R`The equation is \(y = 2.5x\): grapes cost $2.50 per pound.`,
      ],
      answer: R`Yes. \(k = 2.5\) and \(y = 2.5x\).`,
      visual: { type: 'table', headers: ['Pounds (x)', 'Cost in dollars (y)'], rows: [[2, 5], [4, 10], [6, 15]], alt: 'A table: 2 pounds cost 5 dollars, 4 pounds cost 10 dollars, 6 pounds cost 15 dollars.' },
    },
    {
      title: 'Reading a graph',
      problem: R`A line through the origin passes through \((4, 10)\). Find the constant of proportionality, and explain what the point \((1, k)\) means if \(x\) is hours worked and \(y\) is dollars earned.`,
      steps: [
        R`The graph is a straight line through \((0, 0)\), so the relationship is proportional.`,
        R`\(k = y \div x = 10 \div 4 = 2.5\).`,
        R`The line passes through \((1, 2.5)\): 1 hour of work earns $2.50. That is the unit rate.`,
      ],
      answer: R`\(k = 2.5\); the point \((1, 2.5)\) shows the pay for 1 hour.`,
      visual: { type: 'plot', x: [0, 6], y: [0, 15], axisLabels: ['hours', 'dollars'], fns: [{ f: (x) => 2.5 * x }], points: [{ x: 1, y: 2.5, label: '(1, 2.5)', color: 'b' }, { x: 4, y: 10, label: '(4, 10)' }], alt: 'A straight line through the origin, (1, 2.5) and (4, 10), with hours on the horizontal axis and dollars on the vertical axis.' },
    },
    {
      title: 'Word problem: a scale drawing',
      word: true,
      problem: 'A floor plan uses the scale 1 inch to 4 feet. On the plan, a bedroom is 3.5 inches long and 2.5 inches wide. What are the real length, width and area of the bedroom?',
      steps: [
        R`Each inch on the plan stands for 4 feet, so multiply by 4.`,
        R`Length: \(3.5 \times 4 = 14\) feet. Width: \(2.5 \times 4 = 10\) feet.`,
        R`Area: \(14 \times 10 = 140\) square feet.`,
        R`Check with the area rule: the plan's area is \(3.5 \times 2.5 = 8.75\) square inches, and \(8.75 \times 4^{2} = 140\). ✓`,
      ],
      answer: '14 feet by 10 feet, with an area of 140 square feet',
    },
  ],

  models: [
    {
      id: 'y-equals-kx',
      title: 'Explore y = kx',
      intro: 'Choose the constant of proportionality and a value of x. The graph always passes through (0, 0) and (1, k).',
      inputs: [
        { name: 'k', label: 'k (constant of proportionality)', type: 'number', min: 0.25, max: 6, step: 0.25, value: 2.5 },
        { name: 'x', label: 'x', type: 'int', min: 2, max: 12, value: 4 },
      ],
      compute({ k, x }) {
        const y = round(k * x, 2);
        const kx = k === 1 ? 'x' : `${num(k)}x`;
        return {
          problem: R`For \(y = ${kx}\), find \(y\) when \(x = ${x}\).`,
          steps: [
            k === 1 ? R`The constant of proportionality is \(k = 1\), so \(y\) is always equal to \(x\).` : R`The constant of proportionality is \(k = ${num(k)}\): \(y\) is always \(${num(k)}\) times \(x\).`,
            k === 1 ? R`When \(x = ${x}\), \(y = ${x}\) too.` : R`Substitute \(x = ${x}\): \(y = ${num(k)} \times ${x} = ${num(y)}\).`,
            R`Check: \(y \div x = ${num(y)} \div ${x} = ${num(k)}\). ✓`,
            R`The graph is a straight line through \((0, 0)\), \((1, ${num(k)})\) and \((${x}, ${num(y)})\).`,
          ],
          answer: R`\(y = ${num(y)}\)`,
          visual: [
            { type: 'plot', x: [0, x + 2], y: [0, Math.ceil(k * (x + 2))], fns: [{ f: (t) => k * t }], points: [{ x: 1, y: k, label: `(1, ${txt(k)})`, color: 'b' }, { x, y, label: `(${x}, ${txt(y)})` }], alt: `The graph of y = ${k === 1 ? '' : txt(k)}x, a straight line through the origin, (1, ${txt(k)}) and (${x}, ${txt(y)}).` },
            xyTable([0, 1, x], k),
          ],
        };
      },
    },
    {
      id: 'scale-drawing',
      title: 'Word problem: a room on a floor plan',
      word: true,
      intro: 'Change the scale and the size of the room on the plan.',
      inputs: [
        { name: 's', label: 'Feet shown by 1 inch on the plan', type: 'number', min: 2, max: 20, step: 0.5, value: 4 },
        { name: 'len', label: 'Length on the plan (inches)', type: 'number', min: 1.5, max: 12, step: 0.5, value: 3.5 },
        { name: 'wid', label: 'Width on the plan (inches)', type: 'number', min: 1.5, max: 12, step: 0.5, value: 2.5 },
      ],
      compute({ s, len, wid }) {
        const [L, W] = [round(len * s, 2), round(wid * s, 2)];
        const area = round(L * W, 4);
        const feet = (v) => `${txt(v)} ${v === 1 ? 'foot' : 'feet'}`;
        return {
          problem: `A floor plan uses the scale 1 inch to ${feet(s)}. On the plan, a room is ${txt(len)} ${len === 1 ? 'inch' : 'inches'} long and ${txt(wid)} ${wid === 1 ? 'inch' : 'inches'} wide. What are the real length, width and area of the room?`,
          steps: [
            R`Each inch on the plan stands for ${feet(s)}, so multiply each plan length by \(${num(s)}\).`,
            R`Length: \(${num(len)} \times ${num(s)} = ${num(L)}\) feet. Width: \(${num(wid)} \times ${num(s)} = ${num(W)}\) feet.`,
            R`Area = length × width: \(${num(L)} \times ${num(W)} = ${num(area, { commas: true })}\) square feet.`,
            R`The plan's area, \(${num(round(len * wid, 2))}\) square inches, has been multiplied by \(${num(s)}^{2} = ${num(round(s * s, 2))}\).`,
          ],
          answer: `${feet(L)} by ${feet(W)}; area ${txt(area)} square feet`,
          visual: { type: 'polygon', points: [[0, 0], [len, 0], [len, wid], [0, wid]], sides: [`${txt(len)} in → ${txt(L)} ft`, `${txt(wid)} in → ${txt(W)} ft`, '', ''], right: [0, 1, 2, 3], alt: `A rectangle ${txt(len)} inches by ${txt(wid)} inches on the plan, standing for a room ${txt(L)} feet by ${txt(W)} feet.` },
        };
      },
    },
  ],

  quiz: {
    easy: [easyUnitRateFraction, easyFindK, easyIsProportional],
    medium: [mediumEquation, mediumSolveProportion, mediumGraphPoint],
    hard: [hardComplexUnitRate, hardScaleDrawing, hardWhichProportional],
    challenge: [challengeRescale, challengeAreaScale, challengeCompareRates],
  },
};
