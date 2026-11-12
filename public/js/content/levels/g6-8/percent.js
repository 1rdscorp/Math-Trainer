import { R, q, num, frac, gcd, money, txt, person, round, approx } from '../../lib/index.js';
import { pct, usd, clean } from './_shared.js';

// A percent for use inside math mode: P(25) → "25\%".
const P = (x) => R`${num(x)}\%`;
// A percent as a decimal, for math mode: D(35) → "0.35".
const D = (p) => num(p / 100);

/** One bar cut into equal boxes, the first `shaded` of them coloured. */
function percentBar(boxes, shaded, total) {
  return {
    type: 'barModel',
    rows: [{ parts: Array.from({ length: boxes }, (_, i) => ({ value: 1, label: `${100 / boxes}%`, shade: i < shaded ? 'a' : 'none' })), total: `100% = ${txt(total)}` }],
    alt: `A bar for ${txt(total)} cut into ${boxes} equal parts of ${100 / boxes}% each, with ${shaded} ${shaded === 1 ? 'part' : 'parts'} shaded.`,
  };
}

// ───────────── Easy: what a percent is, conversions, friendly percents ─────────────

function easyDecimalPercent(rng) {
  const p = rng.pick([rng.int(1, 9), rng.int(11, 99), rng.int(11, 99), rng.int(101, 180), rng.int(1, 9) * 10]);
  const dec = p / 100;
  if (rng.bool()) {
    return q({
      prompt: R`Write \(${P(p)}\) as a decimal.`,
      correct: dec,
      wrong: [
        { value: p / 10, why: 'Percent means "per hundred", so divide by 100. That moves the decimal point two places to the left, not one.' },
        { value: p / 1000, why: 'Dividing by 100 moves the decimal point two places to the left, not three.' },
        { value: p, why: R`\(${P(p)}\) means \(${p}\) for every 100. As a decimal it is \(${p} \div 100\).` },
      ],
      solution: [R`Percent means "per hundred": \(${P(p)} = \frac{${p}}{100}\).`, R`Divide by 100 by moving the decimal point two places to the left: \(${p} \div 100 = ${num(dec)}\).`],
      rule: 1,
      skill: 'percents and decimals',
      check: () => (approx(dec * 100, p) ? true : 'decimal times 100 is not the percent'),
    });
  }
  return q({
    prompt: R`Write \(${num(dec)}\) as a percent.`,
    correct: p,
    fmt: pct,
    wrong: [
      { value: p / 10, why: 'To change a decimal to a percent, multiply by 100. That moves the decimal point two places to the right, not one.' },
      { value: dec, why: R`\(${num(dec)}\) is the decimal. The percent is 100 times that number.` },
      { value: p * 10, why: 'Multiplying by 100 moves the decimal point two places to the right, not three.' },
    ],
    solution: ['To write a decimal as a percent, multiply by 100 (move the decimal point two places to the right).', R`\(${num(dec)} \times 100 = ${p}\), so \(${num(dec)} = ${P(p)}\).`],
    rule: 1,
    skill: 'percents and decimals',
    check: () => (approx(p / 100, dec) ? true : 'percent divided by 100 is not the decimal'),
  });
}

const FRIENDLY = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [7, 20], [9, 20], [11, 20], [13, 20], [17, 20], [1, 25], [2, 25], [3, 25], [4, 25], [6, 25], [7, 25], [9, 25], [12, 25], [1, 50], [3, 50], [7, 50], [9, 50], [11, 50], [3, 2], [5, 4], [6, 5], [7, 5]];

function easyFractionPercent(rng) {
  const [n, d] = rng.pick(FRIENDLY);
  const p = (100 * n) / d;
  const k = 100 / d;
  if (rng.bool()) {
    return q({
      prompt: R`Write \(\frac{${n}}{${d}}\) as a percent.`,
      correct: p,
      fmt: pct,
      wrong: [
        { value: Number(`${n}${d}`), why: 'The digits of the fraction do not make the percent. Rename the fraction with a denominator of 100.' },
        { value: n * 10, why: R`Multiply the top by the same number as the bottom. \(${d} \times ${k} = 100\), so multiply \(${n}\) by \(${k}\).` },
        { value: d, why: 'That is the denominator. A percent tells how many out of 100.' },
        p + 10,
        p / 10,
      ],
      solution: [
        R`A percent is a number out of 100, so rename the fraction: \(\frac{${n}}{${d}} = \frac{${n} \times ${k}}{${d} \times ${k}} = \frac{${p}}{100}\).`,
        R`\(${p}\) out of 100 is \(${P(p)}\).`,
      ],
      rule: 1,
      skill: 'fractions and percents',
      check: () => (approx(p / 100, n / d) ? true : 'percent does not equal the fraction'),
    });
  }
  const g = gcd(p, 100);
  return q({
    prompt: R`Write \(${P(p)}\) as a fraction in simplest form.`,
    correct: frac(n, d),
    wrong: [
      { value: frac(p, 10), why: 'Percent means out of 100, not out of 10.' },
      { value: frac(100, p), why: R`The percent goes on top: \(${P(p)} = \frac{${p}}{100}\).` },
      frac(1, p),
      frac(n, d * 2),
      frac(n + 1, d),
    ],
    solution: [
      R`Percent means "out of 100": \(${P(p)} = \frac{${p}}{100}\).`,
      R`Divide the top and bottom by \(${g}\): \(\frac{${p}}{100} = ${frac(n, d).tex()}\).`,
    ],
    rule: 1,
    skill: 'fractions and percents',
    check: () => (approx(n / d, p / 100) ? true : 'fraction does not equal the percent'),
  });
}

function easyPercentOfFriendly(rng) {
  const [p, boxes, shaded] = rng.pick([[10, 10, 1], [20, 5, 1], [25, 4, 1], [50, 2, 1], [75, 4, 3], [30, 10, 3], [40, 5, 2], [60, 5, 3], [70, 10, 7], [80, 5, 4]]);
  const one = boxes === 2 ? rng.int(6, 60) : rng.int(2, 15);
  const N = boxes * one;
  const ans = shaded * one;
  return q({
    prompt: R`What is \(${P(p)}\) of \(${N}\)?`,
    visual: percentBar(boxes, shaded, N),
    correct: ans,
    wrong: [
      N > p ? { value: N - p, why: R`\(${P(p)}\) is not \(${p}\) units. It is \(${p}\) out of every 100, a fraction of the whole.` } : null,
      shaded > 1 ? { value: one, why: R`That is one part, \(${P(100 / boxes)}\). You need ${shaded} parts.` } : null,
      { value: N * p, why: R`\(${P(p)}\) means \(\frac{${p}}{100}\). Multiplying by \(${p}\) alone makes the answer far too large.` },
      ans + one,
      ans + 2,
    ],
    solution: [
      R`\(${P(p)}\) is ${shaded} of ${boxes} equal parts, because each part is \(${P(100 / boxes)}\).`,
      R`One part: \(${N} \div ${boxes} = ${one}\).`,
      shaded > 1 ? R`${shaded} parts: \(${shaded} \times ${one} = ${ans}\).` : R`So \(${P(p)}\) of \(${N}\) is \(${ans}\).`,
    ],
    rule: 2,
    skill: 'percent of a quantity',
    check: () => (approx((ans / N) * 100, p) ? true : 'part over whole is not the percent'),
  });
}

function easyStory(rng) {
  const name = person(rng);
  const p = rng.pick([10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]);
  const N = rng.pick([20, 40, 60, 80, 100, 120, 140, 160, 200]);
  const ans = (p * N) / 100;
  const c = rng.pick([
    { text: `${p}% of the ${N} students in a club walk to school. How many of the students walk to school?`, rest: 'do not walk' },
    { text: `${name} is reading ${N === 80 ? 'an' : 'a'} ${N}-page book and has read ${p}% of it. How many pages has ${name} read?`, rest: 'are still unread' },
    { text: `A team won ${p}% of its ${N} games. How many games did the team win?`, rest: 'were not wins' },
    { text: `${name} planted ${N} seeds, and ${p}% of them sprouted. How many seeds sprouted?`, rest: 'did not sprout' },
    { text: `A parking lot has ${N} spaces, and ${p}% of them are full. How many spaces are full?`, rest: 'are empty' },
  ]);
  return q({
    prompt: c.text,
    correct: ans,
    wrong: [
      p !== 50 ? { value: N - ans, why: `That is how many ${c.rest}.` } : null,
      N > p && N - p !== ans ? { value: N - p, why: `${p}% is not ${p} things. It is ${p} out of every 100.` } : null,
      { value: p, why: `${p} is the percent, not the count. Find ${p}% of ${N}.` },
      ans + 10,
      ans / 2,
    ],
    solution: [
      R`"\(${P(p)}\) of ${N}" means multiply: write the percent as a decimal, \(${P(p)} = ${D(p)}\).`,
      R`\(${D(p)} \times ${N} = ${ans}\).`,
    ],
    rule: 2,
    skill: 'word problems',
    check: () => (approx((ans / N) * 100, p) ? true : 'part over whole is not the percent'),
  });
}

// ───────────── Medium: the three percent questions, one-step money problems ─────────────

function mediumPercentOf(rng) {
  const p = rng.pick([5, 12, 15, 18, 24, 35, 45, 55, 65, 85, 120, 150]);
  const N = rng.pick([20, 40, 60, 80, 120, 140, 160, 180, 200, 240, 250, 300, 350, 400, 450, 500]);
  const ans = round((p * N) / 100, 2);
  return q({
    prompt: R`What is \(${P(p)}\) of \(${N}\)?`,
    correct: ans,
    wrong: [
      { value: round((p * N) / 10, 2), why: R`\(${P(p)}\) as a decimal is \(${D(p)}\), not \(${num(p / 10)}\). Divide the percent by 100.` },
      { value: clean(N / p), why: 'To find a percent of a number, multiply by the percent written as a decimal. Do not divide.' },
      { value: round((p * N) / 1000, 2), why: R`\(${P(p)}\) as a decimal is \(${D(p)}\). Check where the decimal point goes.` },
      Math.abs(N - p),
      ans + 10,
    ],
    solution: [R`Write the percent as a decimal: \(${P(p)} = ${D(p)}\).`, R`Multiply: \(${D(p)} \times ${N} = ${num(ans)}\).`, p > 100 ? 'The percent is more than 100%, so the answer is more than the starting number.' : R`Check: \(1\%\) of \(${N}\) is \(${num(N / 100)}\), and \(${p} \times ${num(N / 100)} = ${num(ans)}\). ✓`],
    rule: 2,
    skill: 'percent of a quantity',
    check: () => (approx(ans / N, p / 100) ? true : 'part over whole is not the percent'),
  });
}

function mediumFindPercent(rng) {
  for (;;) {
    const p = rng.pick([5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80, 125, 150]);
    const b = rng.pick([20, 25, 40, 50, 60, 80, 120, 200, 250, 400]);
    const a = (p * b) / 100;
    if (!Number.isInteger(a)) continue;
    const name = person(rng);
    const story = p < 100 && rng.bool(0.5);
    const text = story
      ? rng.pick([
          `${name} answered ${a} of the ${b} questions on a test correctly. What percent of the questions did ${name} answer correctly?`,
          `A theater has ${b} seats, and ${a} of them are filled. What percent of the seats are filled?`,
          `${name} has saved ${money(a)} toward a ${money(b)} bike. What percent of the price has ${name} saved?`,
        ])
      : R`\(${a}\) is what percent of \(${b}\)?`;
    return q({
      prompt: text,
      correct: p,
      fmt: pct,
      wrong: [
        { value: clean((b / a) * 100, 1), why: 'Divide the part by the whole, not the whole by the part.' },
        { value: a / b, why: R`\(${num(a / b)}\) is the decimal. Multiply by 100 to write it as a percent.` },
        Math.abs(b - a) !== p && Math.abs(b - a) < 100 ? { value: Math.abs(b - a), why: 'Subtracting gives the difference, not the percent. Divide the part by the whole.' } : null,
        p + 5,
        p + 10,
      ],
      solution: [
        R`Percent = part ÷ whole. The part is \(${a}\) and the whole is \(${b}\): \(${a} \div ${b} = ${num(a / b)}\).`,
        R`Write the decimal as a percent: \(${num(a / b)} \times 100 = ${p}\), so the answer is \(${P(p)}\).`,
      ],
      rule: 3,
      skill: 'finding the percent',
      check: () => (approx((p / 100) * b, a) ? true : 'percent of the whole is not the part'),
    });
  }
}

function mediumFindWhole(rng) {
  for (;;) {
    const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 120, 150]);
    const b = rng.pick([20, 40, 60, 80, 120, 160, 200, 240, 300, 400]);
    const a = (p * b) / 100;
    if (!Number.isInteger(a)) continue;
    const story = p < 100 && rng.bool(0.5);
    const text = story
      ? rng.pick([
          `${a} students in a school play are sixth graders. That is ${p}% of the cast. How many students are in the cast?`,
          `A down payment of ${money(a)} is ${p}% of the price of a used scooter. What is the price of the scooter?`,
          `${person(rng)} has read ${a} pages of a book, which is ${p}% of the book. How many pages does the book have?`,
        ])
      : R`\(${a}\) is \(${P(p)}\) of what number?`;
    return q({
      prompt: text,
      correct: b,
      wrong: [
        { value: clean((a * p) / 100), why: R`That is \(${P(p)}\) of \(${a}\). Here \(${a}\) is already the part, so divide by the percent to get the whole.` },
        { value: clean(a / p), why: R`Divide by the percent as a decimal, \(${D(p)}\), not by \(${p}\).` },
        a + p,
        b + 20,
        b / 2,
      ],
      solution: [
        R`Part = percent × whole, so whole = part ÷ percent. Write \(${P(p)}\) as \(${D(p)}\).`,
        R`\(${a} \div ${D(p)} = ${b}\).`,
        R`Check: \(${D(p)} \times ${b} = ${a}\). ✓`,
      ],
      rule: 3,
      skill: 'finding the whole',
      check: () => (approx((p / 100) * b, a) ? true : 'percent of the whole is not the part'),
    });
  }
}

function mediumMoney(rng) {
  const price = rng.pick([12, 15, 20, 24, 25, 30, 36, 40, 45, 48, 50, 60, 75, 80, 90, 120]);
  const kind = rng.pick(['discount', 'tax', 'tip', 'markup']);
  const p = rng.pick({ discount: [10, 15, 20, 25, 30, 40, 50], tax: [4, 5, 6, 8, 10], tip: [10, 15, 18, 20, 25], markup: [20, 25, 40, 50, 60, 80] }[kind]);
  const part = round((price * p) / 100, 2);
  const name = person(rng);
  const item = rng.pick(['backpack', 'sweater', 'board game', 'pair of sneakers', 'helmet', 'lamp']);
  const work = [R`Write the percent as a decimal: \(${P(p)} = ${D(p)}\).`];
  if (kind === 'discount') {
    return q({
      prompt: `A ${item} has a regular price of ${money(price)}. It is on sale for ${p}% off. What is the sale price?`,
      correct: round(price - part, 2),
      fmt: money,
      wrong: [
        { value: part, why: 'That is the amount taken off. Subtract it from the regular price.' },
        { value: round(price + part, 2), why: 'A discount makes the price lower, so subtract.' },
        price > p ? { value: price - p, why: `${p}% off is not ${money(p)} off. Find ${p}% of the price first.` } : null,
        round(price - part / 2, 2),
      ],
      solution: [...work, R`Discount: \(${D(p)} \times ${price} = ${usd(part)}\), so ${money(part)} comes off.`, R`Sale price: \(${price} - ${usd(part)} = ${usd(price - part)}\), or ${money(price - part)}.`],
      rule: 5,
      skill: 'discount',
      check: () => (approx(price * (1 - p / 100), price - part) ? true : 'sale price is wrong'),
    });
  }
  if (kind === 'tip') {
    return q({
      prompt: `${name}'s restaurant bill is ${money(price)}. ${name} leaves a ${p}% tip. How much is the tip?`,
      correct: part,
      fmt: money,
      wrong: [
        { value: round(price + part, 2), why: 'That is the bill plus the tip. The question asks for the tip only.' },
        { value: p, why: `${p}% is not ${money(p)}. Find ${p}% of the bill.` },
        round(part * 10, 2),
        round(part + 1, 2),
      ],
      solution: [...work, R`Tip: \(${D(p)} \times ${price} = ${usd(part)}\), or ${money(part)}.`],
      rule: 5,
      skill: 'tip',
      check: () => (approx(part / price, p / 100) ? true : 'tip is wrong'),
    });
  }
  const isTax = kind === 'tax';
  return q({
    prompt: isTax
      ? `A ${item} costs ${money(price)}. Sales tax is ${p}%. What is the total cost with tax?`
      : `A store buys a ${item} for ${money(price)} and marks the price up by ${p}%. What is the selling price?`,
    correct: round(price + part, 2),
    fmt: money,
    wrong: [
      { value: part, why: `That is only the ${isTax ? 'tax' : 'markup'}. Add it to the ${isTax ? 'price' : 'cost'}.` },
      { value: round(price - part, 2), why: `${isTax ? 'Tax' : 'A markup'} is added, not subtracted.` },
      { value: price + p, why: `${p}% is not ${money(p)}. Find ${p}% of ${money(price)} first.` },
      round(price + part * 2, 2),
    ],
    solution: [...work, R`${isTax ? 'Tax' : 'Markup'}: \(${D(p)} \times ${price} = ${usd(part)}\), or ${money(part)}.`, R`Total: \(${price} + ${usd(part)} = ${usd(price + part)}\), or ${money(price + part)}.`],
    rule: 5,
    skill: isTax ? 'tax' : 'markup',
    check: () => (approx(price * (1 + p / 100), price + part) ? true : 'total is wrong'),
  });
}

// ───────────── Hard: percent change, two-step money problems, interest, working backwards ─────────────

function hardPercentChange(rng) {
  for (;;) {
    const old = rng.pick([20, 25, 40, 50, 60, 80, 120, 150, 200, 240, 250, 400, 500]);
    const up = rng.bool();
    const p = rng.pick(up ? [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 120, 150] : [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
    const now = old * (1 + ((up ? 1 : -1) * p) / 100);
    if (!Number.isInteger(now)) continue;
    const change = Math.abs(now - old);
    const name = person(rng);
    const texts = [
      `The price of a jacket changed from ${money(old)} to ${money(now)}.`,
      `The number of students in a club changed from ${old} to ${now}.`,
      `A video had ${old} views on Monday and ${now} views on Tuesday.`,
      `A shop sold ${old} bikes last year and ${now} bikes this year.`,
    ];
    if (up) texts.push(`${name}'s sunflower was ${old} centimeters tall last month and is ${now} centimeters tall now.`);
    const text = rng.pick(texts);
    return q({
      prompt: `${text} What is the percent ${up ? 'increase' : 'decrease'}?`,
      correct: p,
      fmt: pct,
      wrong: [
        { value: clean((change / now) * 100, 1), why: 'Divide the change by the original amount, not by the new amount.' },
        change !== p ? { value: change, why: 'That is the size of the change. Divide it by the original amount to get a percent.' } : null,
        { value: clean((now / old) * 100, 1), why: 'That compares the new amount with the original. Percent change uses only the difference between them.' },
        p + 5,
        p + 10,
      ],
      solution: [
        R`Find the change: \(${Math.max(old, now)} - ${Math.min(old, now)} = ${change}\).`,
        R`Divide by the **original** amount: \(${change} \div ${old} = ${num(change / old)}\).`,
        R`Write it as a percent: \(${num(change / old)} \times 100 = ${p}\). The ${up ? 'increase' : 'decrease'} is \(${P(p)}\).`,
      ],
      rule: 4,
      skill: 'percent change',
      check: () => (approx(old * (1 + ((up ? 1 : -1) * p) / 100), now) ? true : 'percent change does not give the new amount'),
    });
  }
}

function hardDiscountThenTax(rng) {
  for (;;) {
    const price = rng.pick([20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250]);
    const d = rng.pick([10, 15, 20, 25, 30, 40, 50]);
    const t = rng.pick([4, 5, 6, 8, 10]);
    const saleCents = price * (100 - d);
    if ((saleCents * t) % 100 !== 0) continue;
    const off = (price * d) / 100;
    const sale = saleCents / 100;
    const tax = (saleCents * t) / 10000;
    const total = round(sale + tax, 2);
    const item = rng.pick(['pair of shoes', 'backpack', 'jacket', 'skateboard', 'tent', 'desk lamp']);
    return q({
      prompt: `A ${item} has a regular price of ${money(price)}. It is on sale for ${d}% off. Sales tax of ${t}% is then added to the sale price. What is the final cost?`,
      correct: total,
      fmt: money,
      wrong: [
        { value: round((price * (100 - d + t)) / 100, 2), why: `The tax is ${t}% of the sale price, not of the regular price, so the two percents cannot be combined into one.` },
        { value: sale, why: 'That is the sale price. The tax still has to be added.' },
        { value: round(sale - tax, 2), why: 'Tax is added to the price, not subtracted.' },
        round((price * (100 + t)) / 100, 2),
      ],
      solution: [
        R`Discount: \(${D(d)} \times ${price} = ${usd(off)}\). Sale price: \(${price} - ${usd(off)} = ${usd(sale)}\).`,
        R`Tax on the sale price: \(${D(t)} \times ${usd(sale)} = ${usd(tax)}\).`,
        R`Final cost: \(${usd(sale)} + ${usd(tax)} = ${usd(total)}\), or ${money(total)}.`,
      ],
      rule: 5,
      skill: 'discount and tax',
      check: () => (approx(price * (1 - d / 100) * (1 + t / 100), total) ? true : 'final cost is wrong'),
    });
  }
}

function hardSimpleInterest(rng) {
  const principal = rng.pick([200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500]);
  const r = rng.pick([2, 2.5, 3, 4, 5, 6]);
  const t = rng.int(2, 6);
  const yearly = round((principal * r) / 100, 2);
  const interest = round(yearly * t, 2);
  const name = person(rng);
  const lead = `${name} puts ${money(principal)} in an account that pays ${r}% simple interest each year.`;
  const work = [R`Use \(I = Prt\) with the rate as a decimal: \(${P(r)} = ${D(r)}\).`, R`\(I = ${num(principal)} \times ${D(r)} \times ${t} = ${usd(interest)}\). The interest is ${money(interest)}.`];
  const ok = () => (approx((interest / principal / t) * 100, r) ? true : 'interest is wrong');
  if (rng.bool()) {
    return q({
      prompt: `${lead} How much interest does the account earn in ${t} years?`,
      correct: interest,
      fmt: money,
      wrong: [
        { value: yearly, why: `That is the interest for one year. Multiply by ${t} years.` },
        { value: round(principal + interest, 2), why: 'That is the total in the account. The question asks for the interest only.' },
        { value: round(interest * 10, 2), why: R`\(${P(r)}\) as a decimal is \(${D(r)}\). Check the decimal point.` },
        round(interest + yearly, 2),
      ],
      solution: work,
      rule: 6,
      skill: 'simple interest',
      check: ok,
    });
  }
  return q({
    prompt: `${lead} What is the total in the account after ${t} years?`,
    correct: round(principal + interest, 2),
    fmt: money,
    wrong: [
      { value: interest, why: 'That is only the interest. Add it to the starting amount.' },
      { value: round(principal + yearly, 2), why: `That adds the interest for one year only. The money stays for ${t} years.` },
      round(principal + interest * 10, 2),
      round(principal + interest + yearly, 2),
    ],
    solution: [...work, R`Total: \(${num(principal)} + ${usd(interest)} = ${usd(principal + interest)}\), or ${money(principal + interest)}.`],
    rule: 6,
    skill: 'simple interest',
    check: ok,
  });
}

function hardFindOriginal(rng) {
  for (;;) {
    const orig = rng.pick([20, 25, 40, 50, 60, 80, 100, 120, 150, 200, 240]);
    const p = rng.pick([10, 15, 20, 25, 30, 40, 50, 60, 75]);
    const kind = rng.pick(['discount', 'discount', 'markup', 'raise']);
    const sign = kind === 'discount' ? -1 : 1;
    const result = round(orig * (1 + (sign * p) / 100), 2);
    if (!Number.isInteger(result * 4)) continue;
    const name = person(rng);
    const item = rng.pick(['coat', 'watch', 'pair of boots', 'backpack', 'lamp']);
    const text = {
      discount: `After a ${p}% discount, a ${item} costs ${money(result)}. What was the original price?`,
      markup: `A shop marks up the cost of a ${item} by ${p}% and sells it for ${money(result)}. How much did the shop pay for it?`,
      raise: `After a ${p}% increase, the weekly rent for a market stall is ${money(result)}. What was the rent before the increase?`,
    }[kind];
    const whole = 100 + sign * p;
    return q({
      prompt: text,
      correct: orig,
      fmt: money,
      wrong: [
        { value: round(result * (1 - (sign * p) / 100), 2), why: `The ${p}% was a percent of the original amount, not of ${money(result)}. Undoing it needs a division.` },
        { value: round(result - sign * p, 2), why: `${p}% is not ${money(p)}. It is a percent of the original amount.` },
        { value: round((result * p) / 100, 2), why: `That is ${p}% of ${money(result)}. The question asks for the amount before the change.` },
        orig + 10,
      ],
      solution: [
        R`The original amount is \(100\%\). After the change, ${money(result)} is \(100\% ${sign < 0 ? '-' : '+'} ${P(p)} = ${P(whole)}\) of the original.`,
        R`So original \(\times\, ${D(whole)} = ${usd(result)}\). Divide: \(${usd(result)} \div ${D(whole)} = ${orig}\).`,
        R`Check: \(${P(p)}\) of \(${orig}\) is \(${usd((orig * p) / 100)}\), and \(${orig} ${sign < 0 ? '-' : '+'} ${usd((orig * p) / 100)} = ${usd(result)}\). ✓`,
      ],
      rule: 5,
      skill: 'working backwards',
      check: () => (approx(orig * (1 + (sign * p) / 100), result) ? true : 'original does not give the stated result'),
    });
  }
}

// ───────────── Challenge ─────────────

function challengePercentError(rng) {
  for (;;) {
    const actual = rng.pick([20, 25, 40, 50, 80, 100, 120, 125, 150, 200, 250]);
    const p = rng.pick([2, 4, 5, 8, 10, 12, 15, 20, 25, 30]);
    const diff = (actual * p) / 100;
    if (!Number.isInteger(diff)) continue;
    const guess = actual + rng.sign() * diff;
    const name = person(rng);
    const [thing, unit] = rng.pick([['the length of a table', 'centimeters'], ['the mass of a rock', 'grams'], ['the height of a door', 'centimeters'], ['the time for a bus trip', 'minutes'], ['the number of beans in a jar', 'beans'], ['the distance to the park', 'meters']]);
    return q({
      prompt: `${name} estimates that ${thing} is ${guess} ${unit}. The actual value is ${actual} ${unit}. What is the percent error?`,
      correct: p,
      fmt: pct,
      wrong: [
        { value: clean((diff / guess) * 100, 1), why: 'Divide the error by the actual value, not by the estimate.' },
        diff !== p ? { value: diff, why: `That is the size of the error in ${unit}. Divide it by the actual value to get a percent.` } : null,
        { value: clean((guess / actual) * 100, 1), why: 'That compares the estimate with the actual value. Percent error uses the difference between them.' },
        p + 5,
        p + 2,
      ],
      solution: [
        R`Find the size of the error: \(${Math.max(guess, actual)} - ${Math.min(guess, actual)} = ${diff}\).`,
        R`Divide by the **actual** value: \(${diff} \div ${actual} = ${num(diff / actual)}\).`,
        R`As a percent: \(${num(diff / actual)} \times 100 = ${p}\). The percent error is \(${P(p)}\).`,
      ],
      rule: 6,
      skill: 'percent error',
      check: () => (approx((Math.abs(guess - actual) / actual) * 100, p) ? true : 'percent error is wrong'),
    });
  }
}

const TWO_CHANGES = [[20, -20], [10, -10], [25, -20], [50, -50], [-20, 20], [-50, 50], [-20, 25], [10, 10], [20, 20], [-10, -10], [-20, -20], [50, -20], [-50, 100], [100, -50], [20, -25], [-25, 20], [25, -40], [60, -25], [-40, 50], [30, -30], [40, -40], [10, 20], [-10, -20], [-30, -30], [50, 50], [-25, -20], [30, -10], [-60, 50]];

function challengeSuccessive(rng) {
  const [a, b] = rng.pick(TWO_CHANGES);
  const mid = 100 + a;
  const end = round((mid * (100 + b)) / 100, 2);
  const actual = round(end - 100, 2);
  const naive = a + b;
  const say = (v) => (v === 0 ? 'No change' : R`A \(${P(Math.abs(v))}\) ${v > 0 ? 'increase' : 'decrease'}`);
  const item = rng.pick(['a video game', 'a bicycle', 'a phone case', 'a concert ticket', 'a pair of jeans', 'a tablet']);
  return q({
    prompt: `A store ${a > 0 ? 'raises' : 'cuts'} the price of ${item} by ${Math.abs(a)}%. Later it ${b > 0 ? 'raises' : 'cuts'} the new price by ${Math.abs(b)}%. Compared with the original price, what is the overall change?`,
    correct: say(actual),
    wrong: [
      { value: say(naive), why: 'The second percent is taken from the new price, not the original one, so the two percents cannot simply be added.' },
      say(-actual),
      say(a),
      say(b),
      say(naive + 10),
      say(actual - 10),
    ],
    solution: [
      'Try it with an original price of $100.',
      R`After the first change: \(100 \times ${num(mid / 100)} = ${mid}\).`,
      R`After the second change: \(${mid} \times ${num((100 + b) / 100)} = ${num(end)}\).`,
      actual === 0 ? 'The price is back to $100, so there is no overall change.' : R`Compared with 100, the price went ${actual > 0 ? 'up' : 'down'} by \(${num(Math.abs(actual))}\), which is \(${P(Math.abs(actual))}\).`,
    ],
    rule: 4,
    skill: 'percent change',
    check: () => (approx(100 * (1 + a / 100) * (1 + b / 100) - 100, actual) ? true : 'overall change is wrong'),
  });
}

function challengeInterestSolve(rng) {
  const principal = rng.pick([200, 400, 500, 800, 1000, 1500, 2000]);
  const r = rng.pick([2, 3, 4, 5, 6, 8]);
  const t = rng.int(2, 6);
  const yearly = (principal * r) / 100;
  const interest = yearly * t;
  const name = person(rng);
  if (rng.bool()) {
    const total = (interest / principal) * 100;
    return q({
      prompt: `${name} earned ${money(interest)} in simple interest on ${money(principal)} over ${t} years. What was the yearly interest rate?`,
      correct: r,
      fmt: pct,
      wrong: [
        { value: clean(total, 2), why: `That is the interest for all ${t} years as a percent of the starting amount. Divide by ${t} to get the rate for one year.` },
        { value: clean(interest / t / 10, 2), why: 'Divide the yearly interest by the starting amount, then write the result as a percent.' },
        r + 1,
        r * 2,
        r + 2,
      ],
      solution: [
        R`Interest for one year: \(${interest} \div ${t} = ${yearly}\).`,
        R`Rate = yearly interest ÷ starting amount: \(${yearly} \div ${num(principal)} = ${num(yearly / principal)}\).`,
        R`As a percent: \(${P(r)}\) per year. Check with \(I = Prt\): \(${num(principal)} \times ${D(r)} \times ${t} = ${interest}\). ✓`,
      ],
      rule: 6,
      skill: 'simple interest',
      check: () => (approx((principal * r * t) / 100, interest) ? true : 'rate does not give the stated interest'),
    });
  }
  return q({
    prompt: `${name} puts ${money(principal)} in an account that pays ${r}% simple interest each year. After how many years will the account have earned ${money(interest)} in interest?`,
    correct: t,
    unit: 'years',
    wrong: [
      { value: clean((interest / principal) * 100, 2), why: `That is the total interest as a percent of the starting amount. Divide it by the yearly rate, ${r}%.` },
      { value: clean(interest / r, 2), why: `Divide by the interest earned each year, ${money(yearly)}, not by the rate.` },
      t + 1,
      t * 2,
      t + 2,
    ],
    solution: [
      R`Interest for one year: \(${num(principal)} \times ${D(r)} = ${yearly}\).`,
      R`Years needed: \(${interest} \div ${yearly} = ${t}\).`,
      R`Check with \(I = Prt\): \(${num(principal)} \times ${D(r)} \times ${t} = ${interest}\). ✓`,
    ],
    rule: 6,
    skill: 'simple interest',
    check: () => (approx((principal * r * t) / 100, interest) ? true : 'time does not give the stated interest'),
  });
}

function challengeBetterDeal(rng) {
  for (;;) {
    const price = rng.pick([30, 40, 50, 60, 80, 120, 150, 200]);
    const x = rng.pick([5, 8, 10, 12, 15, 20, 25, 30]);
    const p = rng.pick([10, 15, 20, 25, 30, 40]);
    const save = (price * p) / 100;
    const diff = Math.abs(x - save);
    if (diff === 0 || x >= price) continue;
    const [best, other] = x > save ? ['A', 'B'] : ['B', 'A'];
    const say = (c, d) => `Coupon ${c} saves ${money(d)} more`;
    const item = rng.pick(['pair of headphones', 'jacket', 'backpack', 'pair of skates', 'camera bag']);
    const numbersOnly = Math.abs(x - p);
    return q({
      prompt: `Coupon A takes ${money(x)} off. Coupon B takes ${p}% off. For a ${item} that costs ${money(price)}, which coupon saves more, and by how much?`,
      correct: say(best, diff),
      wrong: [
        { value: say(other, diff), why: `The difference is right, but Coupon ${best} is the one with the bigger saving.` },
        numbersOnly !== 0 && numbersOnly !== diff ? { value: say(x > p ? 'A' : 'B', numbersOnly), why: `${money(x)} and ${p}% cannot be compared directly. Change the percent into dollars first.` } : null,
        { value: say(best, Math.max(x, save)), why: 'That is the bigger saving itself. The question asks how much more it saves than the other coupon.' },
        say(other, Math.max(x, save)),
        say(best, diff + 2),
      ],
      solution: [
        `Coupon A saves ${money(x)}.`,
        R`Coupon B saves \(${P(p)}\) of ${money(price)}: \(${D(p)} \times ${price} = ${usd(save)}\), or ${money(save)}.`,
        R`Coupon ${best} saves more: \(${usd(Math.max(x, save))} - ${usd(Math.min(x, save))} = ${usd(diff)}\), or ${money(diff)} more.`,
      ],
      rule: 5,
      skill: 'comparing discounts',
      check: () => (approx(Math.abs(x - (price * p) / 100), diff) ? true : 'difference in savings is wrong'),
    });
  }
}

function challengeOfTheRest(rng) {
  for (;;) {
    const p1 = rng.pick([20, 25, 30, 40, 50, 60, 75, 80]);
    const p2 = rng.pick([10, 20, 25, 40, 50, 75]);
    const left1 = 100 - p1;
    const used2 = (left1 * p2) / 100;
    const left = left1 - used2;
    if (!Number.isInteger(left)) continue;
    const name = person(rng);
    const c = rng.pick([
      { text: `${name} spends ${p1}% of a gift card on a book. Then ${name} spends ${p2}% of what is left on a snack. What percent of the gift card's original value is still on the card?`, second: 'spent on the snack' },
      { text: `A tank is full of water. On Monday ${p1}% of the water is used. On Tuesday ${p2}% of the remaining water is used. What percent of the full tank is left?`, second: 'used on Tuesday' },
      { text: `${name} reads ${p1}% of a book on Saturday and ${p2}% of the remaining pages on Sunday. What percent of the book is still unread?`, second: 'read on Sunday' },
      { text: `A farmer sells ${p1}% of a crop in the morning and ${p2}% of what remains in the afternoon. What percent of the crop is left?`, second: 'sold in the afternoon' },
    ]);
    return q({
      prompt: c.text,
      correct: left,
      fmt: pct,
      wrong: [
        100 - p1 - p2 > 0 ? { value: 100 - p1 - p2, why: `The ${p2}% is taken from what was left, not from the whole amount, so the two percents cannot simply be added.` } : null,
        used2 !== left ? { value: used2, why: `That is the percent ${c.second}. The question asks what is left.` } : null,
        { value: left1, why: 'That is what was left after the first step only.' },
        left + 5,
        left + 10,
      ],
      solution: [
        R`Think of the whole as 100 parts. After the first step, \(100 - ${p1} = ${left1}\) parts are left.`,
        R`The second step uses \(${P(p2)}\) of those ${left1} parts: \(${D(p2)} \times ${left1} = ${num(used2)}\) parts.`,
        R`Left over: \(${left1} - ${num(used2)} = ${left}\) parts out of 100, which is \(${P(left)}\).`,
      ],
      rule: 2,
      skill: 'percent of a percent',
      check: () => (approx((1 - p1 / 100) * (1 - p2 / 100) * 100, left) ? true : 'remaining percent is wrong'),
    });
  }
}

// ───────────── Topic ─────────────

export default {
  id: 'percent',
  title: 'Percents',
  summary: 'Convert between fractions, decimals and percents, and solve problems with discounts, tax, tips, interest and percent change.',
  grade: 'Grades 6–7',
  standards: ['CCSS 6.RP.A.3', 'CCSS 7.RP.A.3'],

  explain: {
    intro: R`**Percent** means "per hundred". \(35\%\) is 35 out of every 100, which is the fraction \(\frac{35}{100}\) and the decimal \(0.35\). Percents make it easy to compare parts of different wholes, and they are everywhere: sales, tax, tips, test scores and interest.`,
    rules: [
      {
        title: 'Percent means per hundred',
        text: R`A percent is a rate for every 100. \(100\%\) is the whole amount, \(50\%\) is half of it, and more than \(100\%\) is more than the whole.`,
        example: R`\(7\% = \frac{7}{100}\), \(60\% = \frac{60}{100}\), and \(150\% = \frac{150}{100}\), which is one and a half times the whole.`,
      },
      {
        title: 'Converting fractions, decimals and percents',
        text: R`Percent to decimal: divide by 100 (move the decimal point two places left). Decimal to percent: multiply by 100 (two places right). Fraction to percent: rename it with a denominator of 100, or divide the top by the bottom and then multiply by 100.`,
        example: R`\(45\% = 0.45 = \frac{45}{100} = \frac{9}{20}\). Going the other way, \(\frac{3}{8} = 3 \div 8 = 0.375 = 37.5\%\).`,
      },
      {
        title: 'Percent of a quantity: part = percent × whole',
        text: R`To find a percent of a number, write the percent as a decimal (or a fraction) and multiply. For friendly percents, split the whole into equal parts: \(10\%\) is one tenth, \(25\%\) is one fourth.`,
        example: R`\(30\%\) of 80 is \(0.30 \times 80 = 24\). Or: \(10\%\) of 80 is 8, so \(30\%\) is \(3 \times 8 = 24\).`,
      },
      {
        title: 'Finding the whole or the percent',
        text: R`The same equation, part = percent × whole, answers all three questions. To find the percent, divide the part by the whole. To find the whole, divide the part by the percent (as a decimal).`,
        example: R`12 is what percent of 48? \(12 \div 48 = 0.25 = 25\%\). 18 is \(45\%\) of what? \(18 \div 0.45 = 40\).`,
      },
      {
        title: 'Percent increase and decrease',
        text: R`Percent change compares the change with the **original** amount: percent change = change ÷ original. Two changes in a row cannot be added, because the second percent is taken from a different amount.`,
        example: R`A price goes from $80 to $100. The change is $20, and \(20 \div 80 = 0.25\), a \(25\%\) increase. From $100 down to $80 is only a \(20\%\) decrease, because \(20 \div 100 = 0.20\).`,
      },
      {
        title: 'Discount, tax, tip and markup',
        text: R`Find the percent of the price first. Subtract it for a discount. Add it for tax, a tip or a markup. A shortcut: a \(25\%\) discount leaves \(75\%\) of the price, and \(8\%\) tax makes the total \(108\%\) of the price.`,
        example: R`A $40 jacket at \(25\%\) off: \(0.25 \times 40 = 10\), so it costs $30. With \(8\%\) tax: \(0.08 \times 30 = 2.40\), for a total of $32.40.`,
      },
      {
        title: 'Simple interest and percent error',
        text: R`Simple interest is \(I = Prt\): the starting amount \(P\) times the yearly rate \(r\) (as a decimal) times the number of years \(t\). Percent error compares the size of an error with the **actual** value: error ÷ actual.`,
        example: R`$500 at \(3\%\) for 4 years earns \(500 \times 0.03 \times 4 = 60\) dollars. An estimate of 46 for an actual 50 is off by 4, and \(4 \div 50 = 8\%\).`,
      },
    ],
    vocab: [
      { term: 'percent', def: R`A number out of 100. \(35\%\) means 35 per hundred.` },
      { term: 'discount', def: 'An amount taken off a price, often given as a percent of the price.' },
      { term: 'markup', def: 'An amount a store adds to what it paid, to set the selling price.' },
      { term: 'principal', def: 'The starting amount of money that earns interest.' },
      { term: 'simple interest', def: R`Interest paid only on the principal: \(I = Prt\).` },
      { term: 'percent error', def: 'How far an estimate is from the actual value, as a percent of the actual value.' },
    ],
    mistakes: [
      R`Moving the decimal point the wrong number of places. \(5\% = 0.05\), not \(0.5\).`,
      R`Treating a percent as an amount. "\(20\%\) off" a $60 item is not $20 off. It is \(0.20 \times 60 = 12\) dollars off.`,
      'Dividing by the new amount instead of the original when finding a percent change.',
      R`Adding percents that apply to different amounts. \(20\%\) off and then \(10\%\) off is not \(30\%\) off.`,
    ],
    visual: percentBar(10, 3, 80),
  },

  examples: [
    {
      title: 'Converting between forms',
      problem: R`Write \(\frac{3}{8}\) as a decimal and as a percent. Then write \(45\%\) as a fraction in simplest form.`,
      steps: [
        R`Divide the top by the bottom: \(3 \div 8 = 0.375\).`,
        R`Multiply by 100 to get a percent: \(0.375 \times 100 = 37.5\), so \(\frac{3}{8} = 37.5\%\).`,
        R`\(45\%\) means \(\frac{45}{100}\). Divide the top and bottom by 5: \(\frac{9}{20}\).`,
      ],
      answer: R`\(\frac{3}{8} = 0.375 = 37.5\%\) and \(45\% = \frac{9}{20}\)`,
      visual: { type: 'table', headers: ['Fraction', 'Decimal', 'Percent'], rows: [[R`\(\frac{1}{2}\)`, R`\(0.5\)`, R`\(50\%\)`], [R`\(\frac{1}{4}\)`, R`\(0.25\)`, R`\(25\%\)`], [R`\(\frac{3}{8}\)`, R`\(0.375\)`, R`\(37.5\%\)`], [R`\(\frac{9}{20}\)`, R`\(0.45\)`, R`\(45\%\)`]], alt: 'A table of matching fractions, decimals and percents.' },
    },
    {
      title: 'Percent of a quantity',
      problem: R`Find \(30\%\) of 80.`,
      steps: [
        R`Split 80 into ten equal parts. Each part is \(10\%\): \(80 \div 10 = 8\).`,
        R`\(30\%\) is three of those parts: \(3 \times 8 = 24\).`,
        R`Check with decimals: \(0.30 \times 80 = 24\). ✓`,
      ],
      answer: R`\(24\)`,
      visual: percentBar(10, 3, 80),
    },
    {
      title: 'Word problem: finding the whole',
      word: true,
      problem: 'In a class, 12 students ride the bus. That is 40% of the class. How many students are in the class?',
      steps: [
        R`12 is the part and \(40\%\) is the percent. The whole class is unknown.`,
        R`Part = percent × whole, so whole = part ÷ percent: \(12 \div 0.40 = 30\).`,
        R`Check: \(40\%\) of 30 is \(0.40 \times 30 = 12\). ✓`,
      ],
      answer: '30 students',
      visual: { type: 'barModel', rows: [{ parts: [{ value: 40, label: '40% = 12', shade: 'a' }, { value: 60, label: '60%', shade: 'none' }], total: '100% = ? students' }], alt: 'A bar for the whole class. The shaded part, 40 percent, is 12 students. The whole bar is unknown.' },
    },
    {
      title: 'Word problem: a discount, then tax',
      word: true,
      problem: 'A jacket has a regular price of $40. It is on sale for 25% off. Sales tax is 8% of the sale price. What is the final cost?',
      steps: [
        R`Discount: \(0.25 \times 40 = 10\). Sale price: \(40 - 10 = 30\) dollars.`,
        R`Tax is a percent of the sale price: \(0.08 \times 30 = 2.40\).`,
        R`Final cost: \(30 + 2.40 = 32.40\).`,
      ],
      answer: '$32.40',
    },
    {
      title: 'Word problem: percent increase',
      word: true,
      problem: 'A swim club had 80 members last year and has 100 members this year. What is the percent increase?',
      steps: [
        R`Find the change: \(100 - 80 = 20\) members.`,
        R`Compare the change with the original amount: \(20 \div 80 = 0.25\).`,
        R`\(0.25 = 25\%\). Dividing by 100 instead would give \(20\%\), which is the decrease going back from 100 to 80.`,
      ],
      answer: R`A \(25\%\) increase`,
    },
    {
      title: 'Word problem: simple interest',
      word: true,
      problem: 'Mei puts $800 in an account that pays 3% simple interest each year. How much is in the account after 4 years?',
      steps: [
        R`Use \(I = Prt\) with \(P = 800\), \(r = 0.03\) and \(t = 4\).`,
        R`\(I = 800 \times 0.03 \times 4 = 96\). The interest is $96.`,
        R`Add the interest to the starting amount: \(800 + 96 = 896\).`,
      ],
      answer: '$896',
    },
  ],

  models: [
    {
      id: 'percent-of',
      title: 'Find a percent of a number',
      intro: 'Choose a percent and a number. The bars compare the part with the whole.',
      inputs: [
        { name: 'p', label: 'Percent', type: 'int', min: 1, max: 200, value: 30 },
        { name: 'N', label: 'The whole amount', type: 'int', min: 2, max: 1000, value: 80 },
      ],
      compute({ p, N }) {
        const part = round((p * N) / 100, 2);
        return {
          problem: R`What is \(${P(p)}\) of \(${N}\)?`,
          steps:
            p === 100
              ? [R`\(100\%\) is the whole amount, so \(100\%\) of \(${N}\) is \(${N}\) itself.`]
              : [
                  R`Write the percent as a decimal by dividing by 100: \(${P(p)} = ${D(p)}\).`,
                  R`Multiply by the whole: \(${D(p)} \times ${N} = ${num(part)}\).`,
                  p > 100 ? 'The percent is more than 100%, so the part is more than the whole.' : p === 1 ? R`\(1\%\) is one hundredth of the whole.` : R`Check: \(1\%\) of \(${N}\) is \(${num(N / 100)}\), and \(${p} \times ${num(N / 100)} = ${num(part)}\). ✓`,
                ],
          answer: R`\(${num(part)}\)`,
          visual: {
            type: 'barModel',
            rows: [{ label: '100%', parts: [{ value: 100, label: txt(N), shade: 'none' }] }, { label: `${p}%`, parts: [{ value: p, label: p >= 8 ? txt(part) : undefined, shade: 'a' }] }],
            alt: `Two bars. The top bar is the whole, ${txt(N)}. The bottom bar is ${p}% as long and stands for ${txt(part)}.`,
          },
        };
      },
    },
    {
      id: 'sale-price',
      title: 'Word problem: sale price with tax',
      word: true,
      intro: 'Change the price, the discount and the tax rate.',
      inputs: [
        { name: 'price', label: 'Regular price (dollars)', type: 'int', min: 1, max: 500, value: 60 },
        { name: 'd', label: 'Discount (%)', type: 'int', min: 5, max: 90, value: 20 },
        { name: 't', label: 'Sales tax (%)', type: 'number', min: 1, max: 15, step: 0.5, value: 5 },
      ],
      compute({ price, d, t }) {
        const off = round((price * d) / 100, 2);
        const sale = round(price - off, 2);
        const taxExact = (sale * t) / 100;
        const tax = round(taxExact, 2);
        const total = round(sale + tax, 2);
        const steps = [];
        if (d > 0) steps.push(R`Discount: \(${D(d)} \times ${price} = ${usd(off)}\). Sale price: \(${price} - ${usd(off)} = ${usd(sale)}\).`);
        else steps.push('There is no discount, so the sale price is the regular price.');
        if (t > 0) {
          steps.push(approx(taxExact, tax) ? R`Tax is a percent of the sale price: \(${D(t)} \times ${usd(sale)} = ${usd(tax)}\).` : R`Tax is a percent of the sale price: \(${D(t)} \times ${usd(sale)} \approx ${usd(tax)}\), rounded to the nearest cent.`);
          steps.push(R`Final cost: \(${usd(sale)} + ${usd(tax)} = ${usd(total)}\).`);
        } else steps.push('There is no tax, so the final cost is the sale price.');
        return {
          problem: `A jacket has a regular price of ${money(price)}. It is on sale for ${d}% off, and sales tax of ${t}% is added to the sale price. What is the final cost?`,
          steps,
          answer: money(total),
        };
      },
    },
    {
      id: 'percent-change',
      title: 'Word problem: percent change',
      word: true,
      intro: 'Type the old and new amounts to see the percent increase or decrease.',
      inputs: [
        { name: 'old', label: 'Members last year', type: 'int', min: 2, max: 5000, value: 80 },
        { name: 'now', label: 'Members this year', type: 'int', min: 0, max: 5000, value: 100 },
      ],
      compute({ old, now }) {
        const problem = `A club had ${txt(old)} ${old === 1 ? 'member' : 'members'} last year and has ${txt(now)} this year. What is the percent change?`;
        if (now === old) return { problem, steps: ['The two amounts are equal, so nothing changed.'], answer: R`\(0\%\) (no change)` };
        const change = Math.abs(now - old);
        const exact = (change / old) * 100;
        const shown = round(exact, 1);
        const same = approx(exact, shown);
        return {
          problem,
          steps: [
            R`Find the change: \(${num(Math.max(old, now))} - ${num(Math.min(old, now))} = ${num(change)}\).`,
            R`Divide by the original amount, \(${num(old)}\): \(${num(change)} \div ${num(old)} ${approx(change / old, round(change / old, 4)) ? '=' : R`\approx`} ${num(change / old, { places: 4 })}\).`,
            R`Multiply by 100 to write it as a percent: ${same ? '' : 'about '}\(${P(shown)}\).`,
            `The new amount is ${now > old ? 'larger' : 'smaller'}, so this is a percent ${now > old ? 'increase' : 'decrease'}.`,
          ],
          answer: R`${same ? 'A' : 'About a'} \(${P(shown)}\) ${now > old ? 'increase' : 'decrease'}`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyDecimalPercent, easyFractionPercent, easyPercentOfFriendly, easyStory],
    medium: [mediumPercentOf, mediumFindPercent, mediumFindWhole, mediumMoney],
    hard: [hardPercentChange, hardDiscountThenTax, hardSimpleInterest, hardFindOriginal],
    challenge: [challengePercentError, challengeSuccessive, challengeInterestSolve, challengeBetterDeal, challengeOfTheRest],
  },
};
