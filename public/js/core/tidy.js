// Small grammar repairs applied to every piece of lesson text just before it is shown or read aloud.
//
// Questions are generated from random numbers, and interactive models use numbers the student
// types, so a sentence written for "5 minutes" can meet the number 1 ("1 minutes"), a number that
// starts with a vowel sound ("a 18% tip") or an ordinal built with a fixed ending ("the 3th value").
// Authors handle these where they notice them; this is the safety net for the rest.

const SINGULAR = {
  seconds: 'second', minutes: 'minute', hours: 'hour', days: 'day', weeks: 'week', months: 'month', years: 'year',
  meters: 'meter', metres: 'metre', centimeters: 'centimeter', centimetres: 'centimetre', millimeters: 'millimeter', millimetres: 'millimetre',
  kilometers: 'kilometer', kilometres: 'kilometre', miles: 'mile', yards: 'yard', feet: 'foot', inches: 'inch',
  liters: 'liter', litres: 'litre', milliliters: 'milliliter', millilitres: 'millilitre', gallons: 'gallon', quarts: 'quart', pints: 'pint', cups: 'cup',
  grams: 'gram', kilograms: 'kilogram', milligrams: 'milligram', pounds: 'pound', ounces: 'ounce', tons: 'ton', tonnes: 'tonne',
  dollars: 'dollar', cents: 'cent', euros: 'euro', degrees: 'degree', radians: 'radian', units: 'unit', points: 'point',
  joules: 'joule', kilojoules: 'kilojoule', watts: 'watt', newtons: 'newton', volts: 'volt', amps: 'amp', ohms: 'ohm',
  words: 'word', pages: 'page', tickets: 'ticket', students: 'student', laps: 'lap', trips: 'trip', bills: 'bill', coins: 'coin',
};
const WORDS = Object.keys(SINGULAR).join('|');
// "\(1\) liters", "\(t = 1\) seconds", "\(\approx 1\) liters": a 1 that ends a formula, on its own or after = or ≈.
const UNIT_AFTER_MATH = new RegExp(String.raw`(\\\(\s*|(?:=|≈|\\approx)\s*)1(\s*\\\))(\s+)(${WORDS})\b`, 'g');
// "the first 1 minutes", "(1 minutes)": a bare 1 in a sentence. Not "x + 1 metres", "0.1 seconds", "3, 1 minutes".
const UNIT_IN_TEXT = new RegExp(String.raw`(^|[(\[]|[^\d.,+\-−–×·÷*/^_\\\s]\s)1 (${WORDS})\b`, 'g');
// "a 18% tip", "a \(8\) cm rope": "an" before a number that starts with a vowel sound (8…, 11, 18).
const A_BEFORE_NUMBER = /(^|[\s(“"])a (\\\(\s*)?(\d[\d,]*)/g;
// "a area", "a elliptic cone", "A obtuse angle": words that can follow the article but not a variable
// called a ("a is negative" must stay as it is).
const AN_WORDS = [
  'absolute', 'acute', 'additional', 'altitude', 'amount', 'angle', 'annual', 'answer', 'apothem', 'arc', 'area', 'arithmetic', 'asymptote', 'average', 'axis',
  'edge', 'eight', 'eighth', 'eleven', 'ellipse', 'ellipsoid', 'elliptic', 'empty', 'endpoint', 'equation', 'equilateral', 'error', 'estimate', 'even',
  'exact', 'example', 'exponent', 'exponential', 'expression', 'exterior', 'extra', 'hour', 'identity', 'imaginary', 'improper', 'increase', 'increasing',
  'indefinite', 'inequality', 'infinite', 'initial', 'input', 'inscribed', 'integer', 'integral', 'interior', 'interval', 'inverse', 'irrational', 'isosceles',
  'object', 'obtuse', 'octagon', 'odd', 'open', 'ordered', 'origin', 'outlier', 'output', 'unknown', 'upper', 'x-coordinate', 'x-intercept', 'x-value',
].join('|');
const A_BEFORE_WORD = new RegExp(String.raw`(^|[.?!:]\s+|[\s(“"])(a|A) (${AN_WORDS})\b`, 'g');
const ORDINAL = /\b(\d+)(st|nd|rd|th)\b/g;
const MATH = /\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;

function vowelSound(digits) {
  const d = digits.replace(/,/g, '');
  const lead = d.slice(0, ((d.length - 1) % 3) + 1); // the part read first: 18 in 18,000; 110 in 110
  return lead.startsWith('8') || lead === '11' || lead === '18';
}

const ending = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');

/** Repair "1 minutes", "a 18% tip" and "3th" in a rich-text string. Formulas themselves are never changed. */
export function tidy(text) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  if (out.includes('1')) {
    out = out.replace(UNIT_AFTER_MATH, (_, before, close, gap, word) => `${before}1${close}${gap}${SINGULAR[word]}`);
    out = out.replace(UNIT_IN_TEXT, (_, before, word) => `${before}1 ${SINGULAR[word]}`);
  }
  if (/\ba /i.test(out)) {
    out = out.replace(A_BEFORE_NUMBER, (all, before, open = '', digits) => (vowelSound(digits) ? `${before}an ${open}${digits}` : all));
    // A capital A is changed only where a sentence starts ("Plan A area" keeps its label).
    out = out.replace(A_BEFORE_WORD, (all, before, article, word) => (article === 'a' || before === '' || /[.?!:]\s+$/.test(before) ? `${before}${article}n ${word}` : all));
  }
  if (/\d(?:st|nd|rd|th)\b/.test(out)) {
    // Ordinals are fixed only outside formulas, where "2st" could be a product.
    let result = '';
    let last = 0;
    const fix = (s) => s.replace(ORDINAL, (_, n) => `${n}${ending(Number(n))}`);
    for (const m of out.matchAll(MATH)) {
      result += fix(out.slice(last, m.index)) + m[0];
      last = m.index + m[0].length;
    }
    out = result + fix(out.slice(last));
  }
  return out;
}
