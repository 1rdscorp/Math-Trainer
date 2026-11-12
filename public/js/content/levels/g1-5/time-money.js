import { R, q, person, money, plural, joinList } from '../../lib/index.js';
import { cents, clockText as T, countList, numberWords } from './_shared.js';

// ───────────── Clock helpers ─────────────

const nextHour = (h) => (h % 12) + 1;
const prevHour = (h) => ((h + 10) % 12) + 1;
const hourOf = (abs) => ((Math.floor(abs / 60) + 11) % 12) + 1; // abs = minutes counted from 12:00
const timeOf = (abs) => T(hourOf(abs), abs % 60);
const fives = (k) => Array.from({ length: k }, (_, i) => 5 * (i + 1)).join(', ');
const marks = (n) => (n === 1 ? '1 small mark' : `${n} small marks`);
const span = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? plural(h, 'hour') : null, m || !h ? plural(m, 'minute') : null].filter(Boolean).join(' ');
};

function clockPic(h, m) {
  const at = Math.floor(m / 5) || 12;
  const long = m % 5 === 0 ? `The long hand points at the ${at}.` : `The long hand is ${marks(m % 5)} past the ${at}.`;
  const short = m === 0 ? `The short hand points at the ${h}.` : `The short hand is between the ${h} and the ${nextHour(h)}.`;
  return { type: 'clock', hour: h, minute: m, alt: `A clock. ${short} ${long}` };
}

// Count up from one time to another: to the next full hour, then whole hours, then the rest.
function countUp(start, end) {
  const jumps = [];
  const firstHour = Math.ceil(start / 60) * 60;
  const lastHour = Math.floor(end / 60) * 60;
  if (firstHour > lastHour) return [{ from: start, to: end }];
  if (firstHour > start) jumps.push({ from: start, to: firstHour });
  if (lastHour > firstHour) jumps.push({ from: firstHour, to: lastHour });
  if (end > lastHour) jumps.push({ from: lastHour, to: end });
  return jumps;
}
const jumpLines = (jumps) => jumps.map((j) => `From ${timeOf(j.from)} to ${timeOf(j.to)} is ${span(j.to - j.from)}.`);

function timeLine(start, end) {
  const lo = Math.floor(start / 60) * 60;
  const hi = Math.max(Math.ceil(end / 60) * 60, lo + 60);
  const every = hi - lo > 120 ? 60 : 30;
  const labels = [];
  for (let v = lo; v <= hi; v += every) labels.push({ value: v, text: timeOf(v) });
  return {
    type: 'numberLine',
    min: lo,
    max: hi,
    step: hi - lo > 180 ? 15 : 5,
    labels,
    jumps: countUp(start, end).map((j) => ({ from: j.from, to: j.to, label: (j.to - j.from) % 60 === 0 ? `+${(j.to - j.from) / 60} h` : `+${j.to - j.from} min` })),
    alt: `A time line from ${timeOf(lo)} to ${timeOf(hi)} with jumps from ${timeOf(start)} to ${timeOf(end)}.`,
  };
}

// ───────────── Money helpers ─────────────

const asMoney = (c) => (c < 100 ? cents(c) : money(c / 100));
const COINS = [['quarter', 'quarters', 25], ['dime', 'dimes', 10], ['nickel', 'nickels', 5], ['penny', 'pennies', 1]];
const coinNames = (counts) => joinList(counts.map((n, i) => (n ? plural(n, COINS[i][0], COINS[i][1]) : null)).filter(Boolean));
const coinTotal = (counts) => counts.reduce((sum, n, i) => sum + n * COINS[i][2], 0);
// The running total as each coin is counted, biggest coins first: [25, 50, 60, 61].
function countOn(counts) {
  const out = [];
  let total = 0;
  counts.forEach((n, i) => {
    for (let k = 0; k < n; k++) out.push((total += COINS[i][2]));
  });
  return out;
}
const fewest = (c) => [Math.floor(c / 25), Math.floor((c % 25) / 10), Math.floor(((c % 25) % 10) / 5), ((c % 25) % 10) % 5];
const ITEMS = ['pencil', 'sticker', 'ruler', 'bookmark', 'toy ring', 'juice box', 'balloon', 'bouncy ball'];
const BIG_ITEMS = ['book', 'kite', 'puzzle', 'toy truck', 'board game', 'paint set'];
const EVENTS = ['A party', 'A movie', 'Soccer practice', 'Art club', 'A puppet show', 'Swim class'];

function pickCoins(rng, maxTotal, minTotal = 0) {
  for (;;) {
    const counts = [rng.int(0, maxTotal > 100 ? 6 : 3), rng.int(0, 4), rng.int(0, 3), rng.int(0, 4)];
    const total = coinTotal(counts);
    if (counts.filter(Boolean).length >= 2 && counts[0] + counts[1] >= 1 && total <= maxTotal && total >= minTotal) return counts;
  }
}

// ───────────── Easy: hours and half hours; dimes, nickels and pennies ─────────────

function easyHour(rng) {
  const h = rng.int(1, 12);
  return q({
    prompt: 'What time does the clock show?',
    visual: clockPic(h, 0),
    correct: T(h, 0),
    wrong: [
      { value: T(h, 30), why: 'The long hand points at the 12. That means 0 minutes.' },
      h !== 12 ? { value: T(12, (5 * h) % 60), why: 'The short hand shows the hour. The long hand shows the minutes.' } : null,
      T(nextHour(h), 0),
      T(prevHour(h), 0),
    ],
    solution: [`The short hand points at the ${h}. The hour is ${h}.`, 'The long hand points at the 12. That means 0 minutes.', `The time is ${T(h, 0)}.`],
    rule: 0,
    skill: 'time to the hour',
  });
}

function easyHalfHour(rng) {
  const h = rng.int(1, 12);
  return q({
    prompt: 'What time does the clock show?',
    visual: clockPic(h, 30),
    correct: T(h, 30),
    wrong: [
      { value: T(nextHour(h), 30), why: `The short hand has not reached the ${nextHour(h)} yet. The hour is still ${h}.` },
      { value: T(6, (5 * h) % 60), why: 'The short hand shows the hour. The long hand shows the minutes.' },
      { value: T(h, 6), why: 'The long hand at the 6 means 30 minutes. Count by fives.' },
      T(h, 0),
    ],
    solution: [`The short hand is between the ${h} and the ${nextHour(h)}. The hour is ${h}.`, `The long hand points at the 6. Count by fives: ${fives(6)}.`, `The time is ${T(h, 30)}.`],
    rule: 0,
    skill: 'time to the half hour',
  });
}

function easyWords(rng) {
  const h = rng.int(1, 12);
  if (rng.bool()) {
    return q({
      prompt: `Which time means "half past ${h}"?`,
      correct: T(h, 30),
      wrong: [
        { value: T(nextHour(h), 30), why: `Half past ${h} comes after ${h} o'clock, so the hour is ${h}.` },
        { value: T(h, 50), why: 'Half of an hour is 30 minutes.' },
        T(h, 0),
        T(prevHour(h), 30),
      ],
      solution: ['An hour has 60 minutes. Half of that is 30 minutes.', `"Half past ${h}" is 30 minutes after ${h} o'clock.`, `That is ${T(h, 30)}.`],
      rule: 2,
      skill: 'time words',
    });
  }
  return q({
    prompt: `Which time means "${h} o'clock"?`,
    correct: T(h, 0),
    wrong: [{ value: T(h, 30), why: `"O'clock" means exactly on the hour, with 0 minutes.` }, T(nextHour(h), 0), T(12, h === 12 ? 30 : h), T(prevHour(h), 0)],
    solution: [`"O'clock" means exactly on the hour.`, `The hour is ${h} and the minutes are 0.`, `That is ${T(h, 0)}.`],
    rule: 2,
    skill: 'time words',
  });
}

function easyCoins(rng) {
  const dimes = rng.bool(0.6);
  const n = rng.int(2, dimes ? 9 : 10);
  const [one, many, each] = dimes ? COINS[1] : COINS[2];
  const total = n * each;
  const list = Array.from({ length: n }, (_, i) => each * (i + 1)).join(', ');
  return q({
    prompt: `How much money is ${n} ${many}?`,
    correct: cents(total),
    wrong: [
      { value: cents(n), why: `Each ${one} is worth ${each} cents. Count by ${dimes ? 'tens' : 'fives'}.` },
      { value: cents(n * (dimes ? 5 : 10)), why: 'A dime is worth 10 cents. A nickel is worth 5 cents.' },
      cents(total + each),
      cents(total - each),
    ],
    solution: [`Each ${one} is worth ${each} cents.`, `Count by ${dimes ? 'tens' : 'fives'}: ${list}.`, `${n} ${many} make ${cents(total)}.`],
    rule: 4,
    skill: 'counting coins',
    check: () => (total / each === n ? true : 'coin count does not match'),
  });
}

function easyDimesPennies(rng) {
  const d = rng.int(1, 9);
  const p = rng.int(1, 9);
  const total = 10 * d + p;
  const name = person(rng);
  const run = countOn([0, d, 0, p]);
  return q({
    prompt: `${name} has ${plural(d, 'dime')} and ${plural(p, 'penny', 'pennies')}. How much money is that?`,
    correct: cents(total),
    wrong: [
      { value: cents(d + p), why: 'A dime is worth 10 cents, not 1.' },
      d !== p ? { value: cents(10 * p + d), why: 'Dimes are worth 10 cents each. Pennies are worth 1 cent each.' } : null,
      cents(total + 10),
      cents(total + 1),
      cents(total - 1),
    ],
    solution: [`Count the dimes by tens: ${run.slice(0, d).join(', ')}.`, `Count on the pennies by ones: ${run.slice(d).join(', ')}.`, `That is ${cents(total)}.`],
    rule: 4,
    skill: 'counting coins',
    check: () => (run[run.length - 1] === total ? true : 'count-on does not match'),
  });
}

// ───────────── Medium: five minutes, time words, mixed coins and bills ─────────────

function mediumFiveMinutes(rng) {
  const h = rng.int(1, 12);
  const at = rng.int(1, 11);
  const m = 5 * at;
  return q({
    prompt: 'What time does the clock show?',
    visual: clockPic(h, m),
    correct: T(h, m),
    wrong: [
      { value: T(h, at), why: `The long hand points at the ${at}. Count by fives to get ${m} minutes.` },
      { value: T(at, (5 * h) % 60), why: 'The short hand shows the hour. The long hand shows the minutes.' },
      m > 30 ? { value: T(nextHour(h), m), why: `The short hand is close to the ${nextHour(h)}, but it has not reached it.` } : T(prevHour(h), m),
      T(h, (m + 5) % 60),
    ],
    solution: [`The short hand is between the ${h} and the ${nextHour(h)}. The hour is ${h}.`, `The long hand points at the ${at}. Count by fives: ${fives(at)}.`, `The time is ${T(h, m)}.`],
    rule: 1,
    skill: 'time to five minutes',
  });
}

function mediumWords(rng) {
  const h = rng.int(1, 12);
  const H = nextHour(h);
  const form = rng.pick(['quarter past', 'quarter to', 'quarter to', 'half past']);
  if (form === 'quarter to') {
    return q({
      prompt: `Which time means "quarter to ${H}"?`,
      correct: T(h, 45),
      wrong: [
        { value: T(H, 45), why: `"Quarter to ${H}" is before ${H} o'clock. The hour is still ${h}.` },
        { value: T(H, 15), why: '"To" means before the hour. "Past" means after it.' },
        T(h, 15),
        T(h, 30),
      ],
      solution: ['A quarter of an hour is 15 minutes.', `"Quarter to ${H}" is 15 minutes before ${H} o'clock.`, `That is ${T(h, 45)}.`],
      rule: 2,
      skill: 'time words',
    });
  }
  const m = form === 'half past' ? 30 : 15;
  return q({
    prompt: `Which time means "${form} ${h}"?`,
    correct: T(h, m),
    wrong: [
      m === 15 ? { value: T(h, 25), why: 'A quarter of an hour is 15 minutes. Only the quarter coin is 25.' } : { value: T(h, 50), why: 'Half of an hour is 30 minutes.' },
      { value: T(H, m), why: `"Past ${h}" means after ${h} o'clock. The hour is ${h}.` },
      T(h, 45),
      T(h, m === 15 ? 30 : 15),
    ],
    solution: [m === 15 ? 'A quarter of an hour is 15 minutes.' : 'Half of an hour is 30 minutes.', `"${form} ${h}" is ${m} minutes after ${h} o'clock.`, `That is ${T(h, m)}.`],
    rule: 2,
    skill: 'time words',
  });
}

function mediumCoins(rng) {
  const counts = pickCoins(rng, 99);
  const total = coinTotal(counts);
  const run = countOn(counts);
  const name = person(rng);
  const n = counts[2];
  const d = counts[1];
  return q({
    prompt: `${name} has ${coinNames(counts)}. How much money is that?`,
    correct: cents(total),
    wrong: [
      { value: cents(run.length), why: 'This counts the coins. Add up what each coin is worth.' },
      n ? { value: cents(total + 5 * n), why: 'A nickel is worth 5 cents, not 10.' } : d ? { value: cents(total - 5 * d), why: 'A dime is worth 10 cents, not 5.' } : null,
      cents(total + 10),
      cents(total + 5),
      cents(total + 1),
    ],
    solution: ['Start with the coins that are worth the most.', `Count on: ${run.join(', ')}.`, `The total is ${cents(total)}.`],
    rule: 4,
    skill: 'counting coins',
    check: () => (run[run.length - 1] === total && total < 100 ? true : 'count-on does not match'),
  });
}

function mediumBills(rng) {
  for (;;) {
    const bills = [rng.int(0, 2), rng.int(0, 3), rng.int(1, 4)];
    const [t, f, o] = bills;
    if (bills.filter(Boolean).length < 2) continue;
    const total = 10 * t + 5 * f + o;
    const name = person(rng);
    const bill = (n, kind) => `${numberWords(n)} ${kind} ${n === 1 ? 'bill' : 'bills'}`;
    const has = joinList([t ? bill(t, '$10') : null, f ? bill(f, '$5') : null, bill(o, '$1')].filter(Boolean));
    const run = [...Array(t).fill(10), ...Array(f).fill(5), ...Array(o).fill(1)].reduce((list, v) => [...list, (list[list.length - 1] ?? 0) + v], []);
    return q({
      prompt: `${name} has ${has}. How much money is that?`,
      correct: `$${total}`,
      wrong: [
        { value: `$${t + f + o}`, why: 'This counts the bills. Add up what each bill is worth.' },
        f ? { value: `$${total + 5 * f}`, why: 'A $5 bill is worth 5 dollars, not 10.' } : null,
        `$${total + 10}`,
        `$${total + 5}`,
        `$${total + 1}`,
      ],
      solution: ['Start with the bills that are worth the most.', `Count on: ${run.join(', ')}.`, `The total is $${total}.`],
      rule: 5,
      skill: 'counting bills',
      check: () => (run[run.length - 1] === total ? true : 'count-on does not match'),
    });
  }
}

function mediumChange(rng) {
  const name = person(rng);
  const item = rng.pick(ITEMS);
  const k = rng.int(1, 3);
  const paid = 25 * k;
  const c = 5 * rng.int(5 * (k - 1) + 1, 5 * k - 1);
  const left = paid - c;
  const viaQuarters = rng.bool();
  return q({
    prompt: viaQuarters
      ? `A ${item} costs ${cents(c)}. ${name} pays with ${plural(k, 'quarter')}. How much change does ${name} get?`
      : `${name} has ${cents(paid)}. ${name} buys a ${item} for ${cents(c)}. How much money is left?`,
    correct: cents(left),
    wrong: [
      { value: asMoney(paid + c), why: 'Paying makes the money go down. Subtract the price.' },
      { value: cents(c), why: 'That is the price. The question asks what is left over.' },
      cents(left + 10),
      cents(left + 5),
    ],
    solution: [viaQuarters ? `${plural(k, 'quarter')} ${k === 1 ? 'is' : 'are'} worth ${cents(paid)}.` : `${name} starts with ${cents(paid)}.`, R`Subtract the price: \(${paid} - ${c} = ${left}\).`, R`Check by counting up: \(${c} + ${left} = ${paid}\).`, `${cents(left)} is left.`],
    rule: 5,
    skill: 'word problems',
    check: () => (c + left === paid && left > 0 ? true : 'change does not add back'),
  });
}

function mediumHoursLater(rng) {
  const h = rng.int(1, 12);
  const m = rng.pick([0, 30, 15, 45]);
  const k = rng.int(2, 5);
  const end = h * 60 + m + 60 * k;
  const h2 = hourOf(end);
  return q({
    prompt: `${rng.pick(EVENTS)} starts at ${T(h, m)}. It lasts ${k} hours. What time does it end?`,
    correct: T(h2, m),
    wrong: [
      h + k > 12 ? { value: T(h + k, m), why: 'A clock has no hour after 12. After 12 comes 1.' } : { value: T(h, m + k), why: 'Hours change the hour number. The minutes stay the same.' },
      T(nextHour(h2), m),
      T(prevHour(h2), m),
      T(h2, (m + 30) % 60),
    ],
    solution: [`Start at ${T(h, m)}. Count on ${k} hours.`, `The hours go: ${Array.from({ length: k }, (_, i) => hourOf(h * 60 + 60 * (i + 1))).join(', ')}.`, `The minutes stay at ${m}. It ends at ${T(h2, m)}.`],
    rule: 3,
    skill: 'elapsed time',
    check: () => (end - (h * 60 + m) === 60 * k && timeOf(end) === T(h2, m) ? true : 'end time does not match'),
  });
}

// ───────────── Hard: minutes, elapsed time, dollars and change ─────────────

function hardMinute(rng) {
  const h = rng.int(1, 12);
  const m = rng.intExcept(1, 59, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  const at = Math.floor(m / 5);
  const extra = m % 5;
  return q({
    prompt: 'What time does the clock show?',
    visual: clockPic(h, m),
    correct: T(h, m),
    wrong: [
      { value: T(h, 5 * at), why: `The long hand is ${marks(extra)} past the ${at || 12}. Add ${extra} to ${5 * at}.` },
      m > 40 ? { value: T(nextHour(h), m), why: `The short hand is close to the ${nextHour(h)}, but it has not reached it.` } : { value: T(at || 12, (5 * h) % 60), why: 'The short hand shows the hour. The long hand shows the minutes.' },
      T(h, m + 1 === 60 ? 58 : m + 1),
      T(h, m - 1 || 2),
      T(prevHour(h), m),
      T(h, (m + 10) % 60),
    ],
    solution: [
      `The short hand is between the ${h} and the ${nextHour(h)}. The hour is ${h}.`,
      at ? `The long hand is past the ${at}. Count by fives: ${fives(at)}.` : 'The long hand is just past the 12. Start at 0 minutes.',
      `Count on ${marks(extra)}: ${countList(5 * at, extra)}. That is ${plural(m, 'minute')}.`,
      `The time is ${T(h, m)}.`,
    ],
    rule: 1,
    skill: 'time to the minute',
  });
}

function hardElapsed(rng) {
  const h = rng.int(1, 11);
  const m1 = 5 * rng.int(0, 11);
  const dur = 5 * rng.int(3, 11);
  const start = h * 60 + m1;
  const end = start + dur;
  const m2 = end % 60;
  const crosses = Math.floor(end / 60) > h && m2 > 0;
  const jumps = countUp(start, end);
  return q({
    prompt: `${rng.pick(EVENTS)} starts at ${timeOf(start)} and ends at ${timeOf(end)}. How many minutes long is it?`,
    visual: timeLine(start, end),
    correct: dur,
    unit: 'minutes',
    wrong: [
      crosses && Math.abs(m2 - m1) !== dur ? { value: Math.abs(m2 - m1) || 60, why: 'The times are in different hours. Count up to the next hour, then add the rest.' } : null,
      crosses ? { value: 100 + m2 - m1, why: 'An hour has 60 minutes, not 100.' } : null,
      dur + 10,
      dur - 10,
      dur + 5,
    ],
    solution: [...jumpLines(jumps), jumps.length > 1 ? R`Add the jumps: \(${jumps.map((j) => j.to - j.from).join(' + ')} = ${dur}\) minutes.` : `It is ${dur} minutes long.`],
    rule: 3,
    skill: 'elapsed time',
    check: () => (jumps.reduce((sum, j) => sum + j.to - j.from, 0) === dur && jumps[jumps.length - 1].to === end ? true : 'jumps do not add up'),
  });
}

function hardEndTime(rng) {
  const h = rng.int(1, 12);
  const m1 = 5 * rng.int(4, 11);
  const dur = 5 * rng.int(Math.max(4, 13 - m1 / 5), 11);
  const start = h * 60 + m1;
  const end = start + dur;
  const m2 = end % 60;
  const h2 = hourOf(end);
  return q({
    prompt: `${rng.pick(EVENTS)} starts at ${T(h, m1)}. It lasts ${dur} minutes. What time does it end?`,
    visual: timeLine(start, end),
    correct: T(h2, m2),
    wrong: [
      { value: `${h}:${m1 + dur}`, why: `An hour has only 60 minutes. ${m1 + dur} minutes is 1 hour and ${plural(m2, 'minute')}.` },
      { value: T(h, m2), why: `The minutes went past 60, so the hour goes up to ${h2}.` },
      T(h2, (m2 + 10) % 60),
      T(nextHour(h2), m2),
    ],
    solution: [`From ${T(h, m1)} to ${T(h2, 0)} is ${60 - m1} minutes.`, R`That leaves \(${dur} - ${60 - m1} = ${m2}\) more minutes.`, `It ends at ${T(h2, m2)}.`],
    rule: 3,
    skill: 'elapsed time',
    check: () => (60 - m1 + m2 === dur && end - start === dur ? true : 'end time does not match'),
  });
}

function hardCoins(rng) {
  const counts = pickCoins(rng, 250, 105);
  const total = coinTotal(counts);
  const run = countOn(counts);
  const name = person(rng);
  return q({
    prompt: `${name} has ${coinNames(counts)}. How much money is that?`,
    correct: asMoney(total),
    wrong: [
      { value: `$${total}`, why: `${total} cents is not ${total} dollars. 100 cents make 1 dollar.` },
      { value: asMoney(total - 100 > 0 ? total - 100 : total + 100), why: 'Every 100 cents makes 1 dollar. Count the hundreds again.' },
      asMoney(total + 10),
      asMoney(total + 25),
    ],
    solution: ['Start with the coins that are worth the most.', `Count on in cents: ${run.join(', ')}.`, `${total} cents is ${Math.floor(total / 100)} ${total >= 200 ? 'dollars' : 'dollar'} and ${plural(total % 100, 'cent')}: ${asMoney(total)}.`],
    rule: 5,
    skill: 'dollars and cents',
    check: () => (run[run.length - 1] === total ? true : 'count-on does not match'),
  });
}

function changeSteps(c, pay) {
  const steps = [`Count up from ${asMoney(c)} to ${asMoney(pay)}.`];
  const parts = [];
  let at = c;
  const hop = (to) => {
    if (to <= at || to > pay) return;
    parts.push(to - at);
    steps.push(`${asMoney(to - at)} more gets to ${asMoney(to)}.`);
    at = to;
  };
  hop(Math.ceil(at / 10) * 10);
  hop(Math.ceil(at / 100) * 100);
  hop(pay);
  if (parts.length > 1) steps.push(`Add the jumps: ${parts.map(asMoney).join(' + ')} = ${asMoney(pay - c)}.`);
  return { steps, total: parts.reduce((s, v) => s + v, 0) };
}

function hardChange(rng) {
  const name = person(rng);
  const pay = rng.pick([100, 500, 500, 1000]);
  const item = rng.pick(pay === 100 ? ITEMS : BIG_ITEMS);
  const c = pay === 100 ? rng.int(11, 94) : rng.int(pay === 500 ? 105 : 310, pay - 55);
  if (c % 100 === 0) return hardChange(rng);
  const change = pay - c;
  const w = changeSteps(c, pay);
  return q({
    prompt: `A ${item} costs ${asMoney(c)}. ${name} pays with a ${money(pay / 100)} bill. How much change does ${name} get?`,
    correct: asMoney(change),
    wrong: [
      pay > 100 ? { value: asMoney(change + 100), why: `Part of one dollar is used to get from ${asMoney(c)} up to ${asMoney(Math.ceil(c / 100) * 100)}.` } : { value: asMoney(pay + c), why: 'Change is what is left after paying. Subtract the price.' },
      c % 10 ? { value: asMoney(change + 10), why: `From ${asMoney(c)} to ${asMoney(Math.ceil(c / 10) * 10)} is only ${cents(10 - (c % 10))}, not 10¢.` } : asMoney(change + 5),
      asMoney(change - 10 > 0 ? change - 10 : change + 20),
      asMoney(change + 1),
    ],
    solution: [...w.steps, `${name} gets ${asMoney(change)} back.`],
    rule: 5,
    skill: 'making change',
    check: () => (w.total === change && c + change === pay ? true : 'count-up does not match'),
  });
}

// ───────────── Challenge ─────────────

function challengeStartTime(rng) {
  const h2 = rng.int(1, 12);
  const m2 = 5 * rng.int(0, 7);
  const dur = 5 * rng.int(m2 / 5 + 1, 11);
  const end = (h2 + 12) * 60 + m2;
  const start = end - dur;
  return q({
    prompt: `${rng.pick(EVENTS)} ended at ${timeOf(end)}. It lasted ${dur} minutes. What time did it start?`,
    visual: timeLine(start, end),
    correct: timeOf(start),
    wrong: [
      { value: timeOf(end + dur), why: 'The start comes before the end. Count back, not forward.' },
      { value: T(h2, (60 + m2 - dur) % 60), why: `Counting back past ${T(h2, 0)} makes the hour 1 smaller.` },
      timeOf(start + 10),
      timeOf(start - 60),
    ],
    solution: [m2 ? `Go back ${m2} minutes to ${T(h2, 0)}.` : `Start at ${T(h2, 0)}.`, R`That leaves \(${dur} - ${m2} = ${dur - m2}\) more minutes to go back.`, `${dur - m2} minutes before ${T(h2, 0)} is ${timeOf(start)}.`],
    rule: 3,
    skill: 'elapsed time',
    check: () => (start + dur === end && countUp(start, end).reduce((s, j) => s + j.to - j.from, 0) === dur ? true : 'start time does not match'),
  });
}

function challengeLongElapsed(rng) {
  const h1 = rng.int(7, 11);
  const m1 = 5 * rng.int(1, 11);
  const start = h1 * 60 + m1;
  const end = (12 + rng.int(1, 4)) * 60 + 5 * rng.int(0, 11);
  const dur = end - start;
  const m2 = end % 60;
  const jumps = countUp(start, end);
  const faceGap = Math.abs(hourOf(end) - h1);
  return q({
    prompt: `A trip starts at ${timeOf(start)} a.m. and ends at ${timeOf(end)} p.m. How long is the trip?`,
    visual: timeLine(start, end),
    correct: span(dur),
    wrong: [
      m2 < m1 ? { value: span(dur + 60), why: 'The last part is less than a full hour. Count whole hours only between full hours.' } : null,
      { value: `${plural(faceGap, 'hour')} ${plural(Math.abs(m2 - m1), 'minute')}`, why: 'Count up from the start time. The clock numbers start again after 12.' },
      span(dur + 10),
      span(dur > 70 ? dur - 60 : dur + 120),
      span(dur + 30),
    ],
    solution: [...jumpLines(jumps), `Add the jumps: ${span(dur)}.`],
    rule: 3,
    skill: 'elapsed time',
    check: () => (jumps.reduce((s, j) => s + j.to - j.from, 0) === dur && dur > 0 ? true : 'jumps do not add up'),
  });
}

function challengeFewestCoins(rng) {
  for (;;) {
    const c = rng.int(16, 99);
    const best = fewest(c);
    const count = best.reduce((s, v) => s + v, 0);
    const noQuarters = Math.floor(c / 10) + Math.floor((c % 10) / 5) + (c % 5);
    if (count < 3 || best[0] === 0) continue;
    // Check with a table of the fewest coins for every amount up to c.
    const table = [0];
    for (let v = 1; v <= c; v++) table[v] = 1 + Math.min(...[25, 10, 5, 1].filter((k) => k <= v).map((k) => table[v - k]));
    return q({
      prompt: `What is the smallest number of coins that make ${cents(c)}? You may use quarters, dimes, nickels and pennies.`,
      correct: count,
      unit: 'coins',
      wrong: [
        noQuarters !== count ? { value: noQuarters, why: 'Use the biggest coins first. One quarter does the work of 2 dimes and a nickel.' } : null,
        { value: count + 1, why: 'Check each step. Did you use the biggest coin that fits?' },
        count - 1,
        count + 2,
      ],
      solution: [
        `Quarters first: ${plural(best[0], 'quarter')} ${best[0] === 1 ? 'makes' : 'make'} ${cents(25 * best[0])}. ${cents(c - 25 * best[0])} is left.`,
        `Then ${plural(best[1], 'dime')}, ${plural(best[2], 'nickel')} and ${plural(best[3], 'penny', 'pennies')}.`,
        R`\(${best.join(' + ')} = ${count}\) coins.`,
      ],
      rule: 4,
      skill: 'counting coins',
      check: () => (table[c] === count && coinTotal(best) === c ? true : 'not the fewest coins'),
    });
  }
}

function challengeShopping(rng) {
  const name = person(rng);
  const [item1, item2] = rng.sample(ITEMS, 2);
  if (rng.bool()) {
    const c1 = 5 * rng.int(3, 11);
    const c2 = 5 * rng.int(2, 18 - c1 / 5);
    const cost = c1 + c2;
    const change = 100 - cost;
    return q({
      prompt: `${name} buys a ${item1} for ${cents(c1)} and a ${item2} for ${cents(c2)}. ${name} pays with a $1 bill. How much change does ${name} get?`,
      correct: cents(change),
      wrong: [
        { value: cents(100 - c1), why: `This pays for only the ${item1}. Add both prices first.` },
        { value: cents(cost), why: 'That is the total price. Change is what is left from the dollar.' },
        cents(change + 10),
        cents(change + 5),
        cents(change + 15),
      ],
      solution: [R`Add the prices: \(${c1} + ${c2} = ${cost}\) cents.`, R`A $1 bill is 100 cents. Subtract: \(100 - ${cost} = ${change}\).`, `${name} gets ${cents(change)} back.`],
      rule: 5,
      skill: 'word problems',
      check: () => (c1 + c2 + change === 100 && change > 0 ? true : 'change does not add back'),
    });
  }
  const counts = pickCoins(rng, 95, 30);
  const have = coinTotal(counts);
  const cost = have + 5 * rng.int(2, 12);
  const need = cost - have;
  return q({
    prompt: `${name} has ${coinNames(counts)}. A ${item1} costs ${asMoney(cost)}. How much more money does ${name} need?`,
    correct: cents(need),
    wrong: [
      { value: asMoney(cost + have), why: `${name} already has some of the money. Find the gap between the price and what ${name} has.` },
      { value: cents(have), why: `That is how much ${name} has. The question asks how much more is needed.` },
      cents(need + 10),
      cents(need + 5),
      cents(need + 15),
    ],
    solution: [`Count the coins: ${countOn(counts).join(', ')}. ${name} has ${cents(have)}.`, cost < 100 ? `The price is ${cost} cents.` : `The price is ${asMoney(cost)}, or ${cost} cents.`, R`Find the gap: \(${cost} - ${have} = ${need}\) cents.`],
    rule: 5,
    skill: 'word problems',
    check: () => (have + need === cost ? true : 'gap does not add back'),
  });
}

function challengeTotalTime(rng) {
  const name = person(rng);
  const [a, b, c] = [5 * rng.int(4, 11), 5 * rng.int(4, 11), 5 * rng.int(4, 11)];
  const total = a + b + c;
  if (total % 60 === 0) return challengeTotalTime(rng);
  const asHundred = total >= 100 && total % 100 < 60 ? `${plural(Math.floor(total / 100), 'hour')} ${plural(total % 100, 'minute')}` : null;
  return q({
    prompt: `${name} reads for ${a} minutes on Monday, ${b} minutes on Tuesday and ${c} minutes on Wednesday. How long does ${name} read in all?`,
    correct: span(total),
    wrong: [
      asHundred && asHundred !== span(total) ? { value: asHundred, why: 'An hour is 60 minutes, not 100.' } : null,
      { value: span(total + 60), why: 'Count how many full 60s fit in the total.' },
      span(total - 10),
      span(total + 10),
      span(total + 20),
    ],
    solution: [R`Add the minutes: \(${a} + ${b} + ${c} = ${total}\).`, `60 minutes make 1 hour. ${total} minutes is ${plural(Math.floor(total / 60), 'full hour')} and ${plural(total % 60, 'minute')} more.`, `${name} reads for ${span(total)}.`],
    rule: 3,
    skill: 'elapsed time',
    check: () => (Math.floor(total / 60) * 60 + (total % 60) === a + b + c ? true : 'minutes do not add up'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'time-money',
  title: 'Time & Money',
  summary: 'Tell time on a clock, find how much time passes, count coins and bills, and make change.',
  grade: 'Grades 1–3',
  standards: ['CCSS 1.MD.B.3', 'CCSS 2.MD.C.7', 'CCSS 2.MD.C.8', 'CCSS 3.MD.A.1'],

  explain: {
    intro: 'A clock has two hands. The short hand shows the hour. The long hand shows the minutes. Money is counted in cents and dollars. 100 cents make 1 dollar.',
    rules: [
      {
        title: 'The short hand shows the hour',
        text: 'Look at the short hand first. If it is between two numbers, the hour is the number it has passed.',
        example: 'The short hand is between the 3 and the 4. The hour is 3.',
      },
      {
        title: 'The long hand shows the minutes',
        text: 'Each number on the clock is 5 minutes. Start at the 12 and count by fives. Each small mark is 1 minute. One hour has 60 minutes.',
        example: 'The long hand is 2 small marks past the 7. Count 5, 10, 15, 20, 25, 30, 35. Then 36, 37. That is 37 minutes.',
      },
      {
        title: 'Words for times',
        text: 'Half past means 30 minutes after the hour. Quarter past means 15 minutes after. Quarter to means 15 minutes before the next hour.',
        example: 'Half past 4 is 4:30. Quarter past 4 is 4:15. Quarter to 5 is 4:45.',
      },
      {
        title: 'How much time passes',
        text: 'Count up from the start time. Jump to the next full hour. Then jump on to the end time. Add the jumps.',
        example: 'From 3:40 to 4:15: it is 20 minutes to 4:00, then 15 more. That is 35 minutes.',
      },
      {
        title: 'Count coins from the biggest',
        text: 'A quarter is 25¢. A dime is 10¢. A nickel is 5¢. A penny is 1¢. Start with the coins worth the most and count on.',
        example: '2 quarters, 1 dime and 3 pennies: 25, 50, 60, 61, 62, 63. That is 63¢.',
      },
      {
        title: 'Dollars and change',
        text: '100 cents make 1 dollar. $3.65 means 3 dollars and 65 cents. To find change, count up from the price to the money paid.',
        example: 'Price $3.65, paid $5. 5¢ gets to $3.70. 30¢ more gets to $4. $1 more gets to $5. The change is $1.35.',
      },
    ],
    vocab: [
      { term: 'hour hand', def: 'The short hand on a clock. It shows the hour.' },
      { term: 'minute hand', def: 'The long hand on a clock. It shows the minutes.' },
      { term: 'a.m. and p.m.', def: 'a.m. times are from midnight to noon. p.m. times are from noon to midnight.' },
      { term: 'elapsed time', def: 'How much time passes from a start to an end.' },
      { term: 'cent (¢)', def: 'A small unit of money. A penny is 1 cent. 100 cents make 1 dollar.' },
      { term: 'change', def: 'The money you get back when you pay more than the price.' },
    ],
    mistakes: [
      'Mixing up the hands. The short hand is the hour. The long hand is the minutes.',
      'Reading the clock number as minutes. When the long hand points at the 7, it is 35 minutes, not 7.',
      'Reading the next hour too soon. At 3:50 the short hand is near the 4, but the hour is still 3.',
      'Counting how many coins there are. 3 dimes are 30¢, not 3¢.',
      'Thinking a bigger coin is worth more. A dime is smaller than a nickel, but it is worth more.',
    ],
    visual: { type: 'clock', hour: 4, minute: 35, alt: 'A clock showing 4:35. The short hand is between the 4 and the 5. The long hand points at the 7.' },
  },

  examples: [
    {
      title: 'Time to the half hour',
      problem: 'The short hand is between the 2 and the 3. The long hand points at the 6. What time is it?',
      steps: ['The short hand has passed the 2. The hour is 2.', 'The long hand points at the 6. Count by fives: 5, 10, 15, 20, 25, 30.', 'The time is 2:30, or half past 2.'],
      answer: '2:30',
      visual: clockPic(2, 30),
    },
    {
      title: 'Time to the minute',
      problem: 'The short hand is between the 7 and the 8. The long hand is 3 small marks past the 8. What time is it?',
      steps: ['The short hand has passed the 7. The hour is 7.', 'The long hand is past the 8. Count by fives: 5, 10, 15, 20, 25, 30, 35, 40.', 'Count 3 more small marks: 41, 42, 43.', 'The time is 7:43.'],
      answer: '7:43',
      visual: clockPic(7, 43),
    },
    {
      title: 'Word problem: how long is recess?',
      word: true,
      problem: 'Recess starts at 10:40 and ends at 11:15. How many minutes long is recess?',
      steps: [...jumpLines(countUp(640, 675)), R`Add the jumps: \(20 + 15 = 35\) minutes.`],
      answer: '35 minutes',
      visual: timeLine(640, 675),
    },
    {
      title: 'Counting coins',
      problem: 'How much money is 2 quarters, 1 dime, 1 nickel and 3 pennies?',
      steps: ['Start with the quarters: 25, 50.', 'Count on the dime: 60.', 'Count on the nickel: 65.', 'Count on the pennies: 66, 67, 68.'],
      answer: '68¢',
    },
    {
      title: 'Word problem: making change',
      word: true,
      problem: 'A toy costs $3.65. Kai pays with a $5 bill. How much change does Kai get?',
      steps: [...changeSteps(365, 500).steps, 'Kai gets $1.35 back.'],
      answer: '$1.35',
    },
  ],

  models: [
    {
      id: 'read-clock',
      title: 'Read a clock',
      intro: 'Set the hour and the minutes. Watch the hands move.',
      inputs: [
        { name: 'h', label: 'Hour', type: 'int', min: 1, max: 12, value: 4 },
        { name: 'm', label: 'Minutes', type: 'int', min: 0, max: 59, value: 35 },
      ],
      compute({ h, m }) {
        const at = Math.floor(m / 5);
        const extra = m % 5;
        const steps = [m === 0 ? `The short hand points at the ${h}. The hour is ${h}.` : `The short hand is between the ${h} and the ${nextHour(h)}. The hour is ${h}.`];
        if (m === 0) steps.push('The long hand points at the 12. That means 0 minutes.');
        else if (at === 0) steps.push(`The long hand is ${marks(extra)} past the 12. That is ${plural(m, 'minute')}.`);
        else {
          steps.push(`The long hand ${extra ? 'is past' : 'points at'} the ${at}. Count by fives: ${fives(at)}.`);
          if (extra) steps.push(`Count on ${marks(extra)}: ${countList(5 * at, extra)}. That is ${m} minutes.`);
        }
        const words = { 0: `${h} o'clock`, 15: `quarter past ${h}`, 30: `half past ${h}`, 45: `quarter to ${nextHour(h)}` }[m];
        if (words) steps.push(`You can also say "${words}".`);
        return { problem: 'What time does the clock show?', steps, answer: T(h, m), visual: clockPic(h, m) };
      },
    },
    {
      id: 'how-long',
      title: 'Word problem: when does it end?',
      word: true,
      intro: 'Pick a start time and how long the show lasts.',
      inputs: [
        { name: 'h', label: 'Start hour', type: 'int', min: 1, max: 12, value: 4 },
        { name: 'm', label: 'Start minutes', type: 'int', min: 0, max: 59, value: 35 },
        { name: 'd', label: 'Minutes long', type: 'int', min: 1, max: 180, value: 50 },
      ],
      compute({ h, m, d }) {
        const start = h * 60 + m;
        const end = start + d;
        const jumps = countUp(start, end);
        return {
          problem: `A puppet show starts at ${T(h, m)}. It lasts ${plural(d, 'minute')}. What time does it end?`,
          steps: [`Count up ${plural(d, 'minute')} from ${T(h, m)}.`, ...jumps.map((j, i) => `${span(j.to - j.from)}${i ? ' more' : ''} gets to ${timeOf(j.to)}.`), `The show ends at ${timeOf(end)}.`],
          answer: timeOf(end),
          visual: timeLine(start, end),
        };
      },
    },
    {
      id: 'coins-and-snack',
      title: 'Word problem: coins for a snack',
      word: true,
      intro: 'Choose the coins and the price of the snack.',
      inputs: [
        { name: 'q', label: 'Quarters', type: 'int', min: 0, max: 8, value: 2 },
        { name: 'd', label: 'Dimes', type: 'int', min: 0, max: 10, value: 1 },
        { name: 'n', label: 'Nickels', type: 'int', min: 0, max: 10, value: 1 },
        { name: 'p', label: 'Pennies', type: 'int', min: 0, max: 10, value: 3 },
        { name: 'price', label: 'Snack price (cents)', type: 'int', min: 1, max: 300, value: 45 },
      ],
      compute({ q: quarters, d, n, p, price }) {
        const counts = [quarters, d, n, p];
        const total = coinTotal(counts);
        if (total === 0) return { error: 'Maya has no coins yet. Add at least one coin.' };
        const run = countOn(counts);
        const steps = ['Start with the coins that are worth the most.', `Count on: ${run.join(', ')}.`, `Maya has ${total} cents${total >= 100 ? `, or ${asMoney(total)}` : ''}.`];
        const table = {
          type: 'table',
          headers: ['Coin', 'How many', 'Worth'],
          rows: COINS.map(([, many, each], i) => [many, String(counts[i]), cents(counts[i] * each)]),
          rowHeaders: true,
          alt: `A table of coins: ${coinNames(counts)}. Total ${total} cents.`,
        };
        const problem = `Maya has ${coinNames(counts)}. A snack costs ${asMoney(price)}. Can Maya buy it? How much is left over or still needed?`;
        if (total >= price) {
          steps.push(`${total} is ${total === price ? 'the same as' : 'more than'} ${price}, so Maya can buy the snack.`, R`Subtract the price: \(${total} - ${price} = ${total - price}\).`);
          return { problem, steps, answer: total === price ? 'Yes. Maya has exactly enough.' : `Yes. Maya has ${asMoney(total - price)} left.`, visual: table };
        }
        steps.push(`${total} is less than ${price}, so Maya cannot buy the snack yet.`, R`Find the gap: \(${price} - ${total} = ${price - total}\).`);
        return { problem, steps, answer: `No. Maya needs ${asMoney(price - total)} more.`, visual: table };
      },
    },
  ],

  quiz: {
    easy: [easyHour, easyHalfHour, easyWords, easyCoins, easyDimesPennies],
    medium: [mediumFiveMinutes, mediumWords, mediumCoins, mediumBills, mediumChange, mediumHoursLater],
    hard: [hardMinute, hardElapsed, hardEndTime, hardCoins, hardChange],
    challenge: [challengeStartTime, challengeLongElapsed, challengeFewestCoins, challengeShopping, challengeTotalTime],
  },
};
