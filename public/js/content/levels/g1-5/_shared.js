// Small helpers shared by the Grades 1–5 topics.
import { R, num } from '../../lib/index.js';

/** A whole number for math mode with commas from 1,000 up: N(1250) → "1{,}250". */
export const N = (x) => num(x, { commas: true });

/** The same number wrapped as inline math: M(1250) → "\(1{,}250\)". */
export const M = (x) => R`\(${N(x)}\)`;

/** The digits of a whole number, highest place first: digits(305) → [3, 0, 5]. */
export const digits = (n) => String(Math.abs(Math.trunc(n))).split('').map(Number);

/** Place names from the ones up: PLACES[2] → "hundreds"; PLACE_ONE[2] → "hundred". */
export const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
export const PLACE_ONE = ['one', 'ten', 'hundred', 'thousand', 'ten thousand', 'hundred thousand', 'million'];

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under1000(n) {
  const parts = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
}

/** A whole number (0 to 999,999,999) in words: 42065 → "forty-two thousand, sixty-five". */
export function numberWords(n) {
  if (n === 0) return 'zero';
  const groups = [];
  const millions = Math.floor(n / 1e6);
  const thousands = Math.floor(n / 1000) % 1000;
  const rest = n % 1000;
  if (millions) groups.push(`${under1000(millions)} million`);
  if (thousands) groups.push(`${under1000(thousands)} thousand`);
  if (rest) groups.push(under1000(rest));
  return groups.join(', ');
}

/** Cents as plain text: cents(35) → "35¢". */
export const cents = (c) => `${c}¢`;

/** A clock time as plain text: clockText(3, 5) → "3:05". */
export const clockText = (h, min) => `${h}:${String(min).padStart(2, '0')}`;

/** The numbers after `from`, counting on `steps` times: countList(7, 4) → "8, 9, 10, 11". */
export const countList = (from, steps) => Array.from({ length: steps }, (_, i) => from + i + 1).join(', ');

/** Containers and what they hold, for equal-group stories. `prep` is "in" or "on" (in a bag, on a plate). */
export const GROUPS = [
  { box: ['bag', 'bags'], item: ['apple', 'apples'], prep: 'in' },
  { box: ['box', 'boxes'], item: ['crayon', 'crayons'], prep: 'in' },
  { box: ['plate', 'plates'], item: ['cookie', 'cookies'], prep: 'on' },
  { box: ['vase', 'vases'], item: ['flower', 'flowers'], prep: 'in' },
  { box: ['shelf', 'shelves'], item: ['book', 'books'], prep: 'on' },
  { box: ['pack', 'packs'], item: ['sticker', 'stickers'], prep: 'in' },
  { box: ['tray', 'trays'], item: ['muffin', 'muffins'], prep: 'on' },
  { box: ['jar', 'jars'], item: ['marble', 'marbles'], prep: 'in' },
];

/** Things set out in rows, for array stories: [what is in a row (many), where]. */
export const ROWS = [
  ['chairs', 'A hall'],
  ['plants', 'A garden'],
  ['desks', 'A classroom'],
  ['stamps', 'A sheet'],
  ['tiles', 'A floor'],
  ['cars', 'A parking lot'],
];
