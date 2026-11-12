// Text and number formatting for topic content.
//
// Content strings are "rich text": plain text with math between \( … \) (inline) or
// \[ … \] (display), and **bold** for emphasis. Always write them with the R tag so
// backslashes survive:   R`Solve \(2x + ${b} = ${c}\).`

import { round } from './numbers.js';
import { Frac } from './frac.js';

/** Raw template tag: keeps LaTeX backslashes exactly as typed. */
export const R = String.raw;

function groupThousands(intStr, sep) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function splitNumber(x, places) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new TypeError(`cannot format ${x} as a number`);
  const r = round(x, places);
  const negative = r < 0;
  let s = Math.abs(r).toFixed(places);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  const [int, dec] = s.split('.');
  return { negative, int, dec };
}

/**
 * Format a number for use INSIDE math mode.
 *   num(7) → "7"   num(-2.50) → "-2.5"   num(12500) → "12{,}500"   num(frac(3,4)) → "\frac{3}{4}"
 * Options: places (max decimals, default 6), fixed (exact decimals, e.g. 2 for money),
 *          commas: 'auto' (5+ digits, default) | true (4+ digits) | false.
 */
export function num(x, { places = 6, fixed = null, commas = 'auto' } = {}) {
  if (x instanceof Frac) return x.tex();
  const { negative, int, dec } = splitNumber(x, fixed ?? places);
  const useCommas = commas === true ? int.length >= 4 : commas === 'auto' ? int.length >= 5 : false;
  let out = useCommas ? groupThousands(int, '{,}') : int;
  let d = dec ?? '';
  if (fixed != null) d = d.padEnd(fixed, '0');
  if (d) out += '.' + d;
  return (negative ? '-' : '') + out;
}

/**
 * Format a number for use in plain TEXT (outside math mode).
 *   txt(1250) → "1,250"   txt(-3) → "−3"   txt(0.5) → "0.5"
 */
export function txt(x, { places = 6, fixed = null, commas = true } = {}) {
  if (x instanceof Frac) return x.text();
  const { negative, int, dec } = splitNumber(x, fixed ?? places);
  let out = commas && int.length >= 4 ? groupThousands(int, ',') : int;
  let d = dec ?? '';
  if (fixed != null) d = d.padEnd(fixed, '0');
  if (d) out += '.' + d;
  return (negative ? '−' : '') + out;
}

/** Money as plain text: money(3.5) → "$3.50", money(12) → "$12", money(-4) → "−$4". */
export function money(x) {
  const r = round(x, 2);
  const whole = Number.isInteger(r);
  const body = txt(Math.abs(r), whole ? {} : { fixed: 2 });
  return (r < 0 ? '−' : '') + '$' + body;
}

/** A number for math mode, wrapped in parentheses when negative: paren(-3) → "(-3)". */
export function paren(x, opts) {
  const s = num(x, opts);
  return s.startsWith('-') ? `(${s})` : s;
}

/** A signed number for appending to an expression in math mode: signed(3) → "+ 3", signed(-3) → "- 3". */
export function signed(x, opts) {
  const value = x instanceof Frac ? x.value : x;
  if (value < 0) return '- ' + num(x instanceof Frac ? x.neg() : -x, opts);
  return '+ ' + num(x, opts);
}

/**
 * A product written with every factor in parentheses, so numbers can never run together:
 * product(4, 6) → "(4)(6)", product(-1, 3) → "(-1)(3)". Factors may be numbers, Frac or LaTeX strings.
 */
export function product(...factors) {
  return factors.map((f) => `(${typeof f === 'string' ? f : num(f)})`).join('');
}

/** A product written with a dot: dot(4, -3) → "4 \cdot (-3)". Negative factors get parentheses. */
export function dot(...factors) {
  return factors.map((f) => (typeof f === 'string' ? f : paren(f))).join(' \\cdot ');
}

/** ordinal(1) → "1st", ordinal(22) → "22nd". */
export function ordinal(n) {
  const v = Math.abs(n) % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][v % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** plural(1, 'apple') → "1 apple"; plural(3, 'apple') → "3 apples"; plural(2, 'box', 'boxes') → "2 boxes". */
export function plural(n, word, pluralWord = word + 's') {
  return `${txt(n)} ${n === 1 ? word : pluralWord}`;
}

/** joinList(['a','b','c']) → "a, b, and c". */
export function joinList(items, word = 'and') {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${word} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${word} ${items[items.length - 1]}`;
}

/** Wrap LaTeX in inline-math delimiters: m`x^2` or m(tex) → "\(x^2\)". */
export function m(strings, ...values) {
  const tex = typeof strings === 'string' ? strings : String.raw(strings, ...values);
  return `\\(${tex}\\)`;
}

const FRACTION_WORDS = {
  2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'], 11: ['eleventh', 'elevenths'],
  12: ['twelfth', 'twelfths'], 15: ['fifteenth', 'fifteenths'], 16: ['sixteenth', 'sixteenths'], 18: ['eighteenth', 'eighteenths'],
  20: ['twentieth', 'twentieths'], 100: ['hundredth', 'hundredths'], 1000: ['thousandth', 'thousandths'],
};

/**
 * The name of a fraction piece: fractionWord(4) → "fourths", fractionWord(2) → "halves",
 * fractionWord(3, 1) → "third" (pass the count to get the singular).
 */
export function fractionWord(d, count = 2) {
  const w = FRACTION_WORDS[d];
  if (w) return count === 1 ? w[0] : w[1];
  return count === 1 ? ordinal(d) : `${ordinal(d)}s`;
}
