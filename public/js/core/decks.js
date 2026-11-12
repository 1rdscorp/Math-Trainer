// Flashcard decks of math facts. Fronts are rich text; answers are numbers the student types.
// Each deck is ordered from easier to harder, and new cards are introduced in that order.

import { TIMES_LEVELS, inLevel, strategy } from './times.js';

const R = String.raw;

function additionDeck() {
  const cards = [];
  const rank = (a, b) => {
    if (a === 1 || b === 1) return 0; // plus one
    if (a === 2 || b === 2) return 1; // plus two
    if (a === b) return 2; // doubles
    if (a + b === 10) return 3; // make ten
    if (a === 10 || b === 10) return 3;
    if (Math.abs(a - b) === 1) return 4; // near doubles
    if (a + b < 10) return 5;
    return 6; // crossing ten
  };
  for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) cards.push({ id: `${a}+${b}`, front: R`\(${a} + ${b}\)`, answer: a + b, rank: rank(a, b) * 100 + a + b });
  return cards.sort((x, y) => x.rank - y.rank);
}

function subtractionDeck() {
  const cards = [];
  for (let total = 2; total <= 20; total++) {
    for (let take = 1; take <= 10; take++) {
      const left = total - take;
      if (left < 1 || left > 10) continue;
      const rank = (total <= 10 ? 0 : take === 10 || left === 10 ? 1 : 2) * 100 + total;
      cards.push({ id: `${total}-${take}`, front: R`\(${total} - ${take}\)`, answer: left, rank });
    }
  }
  return cards.sort((x, y) => x.rank - y.rank);
}

function levelOf(a, b) {
  for (let l = 0; l < TIMES_LEVELS.length; l++) if (inLevel(a, b, l)) return l;
  return TIMES_LEVELS.length;
}

function multiplicationDeck() {
  const cards = [];
  for (let a = 1; a <= 12; a++) for (let b = a; b <= 12; b++) cards.push({ id: `${a}x${b}`, front: R`\(${a} \times ${b}\)`, answer: a * b, hint: strategy(a, b), rank: levelOf(a, b) * 1000 + a * b });
  return cards.sort((x, y) => x.rank - y.rank);
}

function divisionDeck() {
  const cards = [];
  for (let a = 2; a <= 12; a++) for (let b = 1; b <= 12; b++) cards.push({ id: `${a * b}d${a}`, front: R`\(${a * b} \div ${a}\)`, answer: b, hint: `Think: ${a} × ? = ${a * b}. Since ${a} × ${b} = ${a * b}, the answer is ${b}.`, rank: levelOf(a, b) * 1000 + a * b });
  return cards.sort((x, y) => x.rank - y.rank);
}

function squaresDeck() {
  const cards = [];
  for (let n = 1; n <= 15; n++) cards.push({ id: `sq${n}`, front: R`\(${n}^{2}\)`, answer: n * n, hint: `${n} × ${n} = ${n * n}.`, rank: n });
  for (let n = 1; n <= 15; n++) cards.push({ id: `rt${n * n}`, front: R`\(\sqrt{${n * n}}\)`, answer: n, hint: `${n} × ${n} = ${n * n}, so the square root of ${n * n} is ${n}.`, rank: 20 + n });
  for (let n = 1; n <= 6; n++) cards.push({ id: `cu${n}`, front: R`\(${n}^{3}\)`, answer: n ** 3, hint: `${n} × ${n} × ${n} = ${n ** 3}.`, rank: 40 + n });
  for (const n of [20, 25]) cards.push({ id: `sq${n}`, front: R`\(${n}^{2}\)`, answer: n * n, hint: `${n} × ${n} = ${n * n}.`, rank: 50 + n });
  return cards.sort((x, y) => x.rank - y.rank);
}

function fractionDeck() {
  const list = [[1, 2], [1, 4], [3, 4], [1, 10], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10], [1, 100], [1, 20], [1, 25], [1, 50], [1, 8], [3, 8], [5, 8], [7, 8]];
  const cards = [];
  list.forEach(([n, d], i) => {
    const dec = n / d;
    cards.push({ id: `d${n}/${d}`, front: R`\(\frac{${n}}{${d}}\) as a decimal`, answer: dec, decimal: true, hint: `${n} ÷ ${d} = ${dec}.`, rank: i * 2 });
    cards.push({ id: `p${n}/${d}`, front: R`\(\frac{${n}}{${d}}\) as a percent`, answer: Math.round(dec * 1000) / 10, decimal: true, unit: '%', hint: `${n} ÷ ${d} = ${dec}, and ${dec} is ${Math.round(dec * 1000) / 10} hundredths.`, rank: i * 2 + 1 });
  });
  return cards;
}

function powersDeck() {
  const cards = [];
  for (let n = 1; n <= 10; n++) cards.push({ id: `2^${n}`, front: R`\(2^{${n}}\)`, answer: 2 ** n, hint: `Double ${2 ** (n - 1)} to get ${2 ** n}.`, rank: n });
  for (let n = 1; n <= 6; n++) cards.push({ id: `10^${n}`, front: R`\(10^{${n}}\)`, answer: 10 ** n, hint: `A 1 followed by ${n} zero${n === 1 ? '' : 's'}.`, rank: 20 + n });
  for (let n = 2; n <= 4; n++) cards.push({ id: `3^${n}`, front: R`\(3^{${n}}\)`, answer: 3 ** n, hint: `Multiply ${3 ** (n - 1)} by 3 to get ${3 ** n}.`, rank: 30 + n });
  for (let n = 2; n <= 3; n++) cards.push({ id: `5^${n}`, front: R`\(5^{${n}}\)`, answer: 5 ** n, hint: `Multiply ${5 ** (n - 1)} by 5 to get ${5 ** n}.`, rank: 40 + n });
  return cards.sort((x, y) => x.rank - y.rank);
}

export const DECKS = Object.freeze([
  { id: 'add', title: 'Addition facts', blurb: 'Sums up to 10 + 10', icon: '➕', cards: additionDeck() },
  { id: 'sub', title: 'Subtraction facts', blurb: 'Differences within 20', icon: '➖', cards: subtractionDeck() },
  { id: 'mul', title: 'Multiplication facts', blurb: 'The table from 1 × 1 to 12 × 12', icon: '✖️', cards: multiplicationDeck() },
  { id: 'div', title: 'Division facts', blurb: 'Dividing by 2 to 12', icon: '➗', cards: divisionDeck() },
  { id: 'squares', title: 'Squares, cubes and roots', blurb: 'Perfect squares to 15², roots, small cubes', icon: '🔲', cards: squaresDeck() },
  { id: 'fractions', title: 'Fractions, decimals and percents', blurb: 'The common equivalents', icon: '🍰', cards: fractionDeck() },
  { id: 'powers', title: 'Powers of 2, 3, 5 and 10', blurb: 'Handy powers to know on sight', icon: '⚡', cards: powersDeck() },
]);

export function findDeck(id) {
  return DECKS.find((d) => d.id === id) ?? null;
}
