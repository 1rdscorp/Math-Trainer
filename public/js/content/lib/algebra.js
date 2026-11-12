// Building algebraic expressions as LaTeX with correct signs and coefficients.
// Everything here returns LaTeX for use INSIDE math mode.

import { Frac } from './frac.js';
import { num } from './text.js';

function valueOf(c) {
  return c instanceof Frac ? c.value : c;
}

function absTex(c) {
  return c instanceof Frac ? c.abs().tex() : num(Math.abs(c));
}

/**
 * Sum of terms with tidy signs. Each term is [coefficient, symbolTex].
 *   terms([[3, 'x^2'], [-1, 'x'], [5, '']]) → "3x^2 - x + 5"
 *   terms([[1, 'x'], [0, 'y'], [-2, '']])   → "x - 2"
 * Zero terms are dropped; a coefficient of 1 or −1 is hidden when there is a symbol.
 * Coefficients may be numbers or Frac.
 */
export function terms(list) {
  let out = '';
  for (const [c, sym = ''] of list) {
    const v = valueOf(c);
    if (v === 0) continue;
    const mag = Math.abs(v) === 1 && sym ? '' : absTex(c);
    const body = mag + sym;
    if (!out) out = (v < 0 ? '-' : '') + body;
    else out += (v < 0 ? ' - ' : ' + ') + body;
  }
  return out || '0';
}

/**
 * A number over a LaTeX denominator, with the sign in front of the fraction:
 * over(-7, 'x^{2}') → "-\frac{7}{x^{2}}",  over(3, '(x + 1)^{2}') → "\frac{3}{(x + 1)^{2}}".
 */
export function over(n, denTex) {
  const v = valueOf(n);
  return `${v < 0 ? '-' : ''}\\frac{${absTex(n)}}{${denTex}}`;
}

/**
 * A fraction built from two LaTeX strings. If the numerator is a single negative term, the minus
 * sign is moved in front:  texFrac('-3\\sin x', 'x^{2}') → "-\frac{3\sin x}{x^{2}}".
 * A numerator with several terms is left alone:  texFrac('-x + 1', 'x^{2}') → "\frac{-x + 1}{x^{2}}".
 */
export function texFrac(numTex, denTex) {
  const t = String(numTex).trim();
  if (t.startsWith('-') && !/[+-]/.test(t.slice(1).replace(/\^\{[^{}]*\}/g, ''))) return `-\\frac{${t.slice(1).trim()}}{${denTex}}`;
  return `\\frac{${t}}{${denTex}}`;
}

/** A single term: term(3, 'x') → "3x", term(-1, 'x^2') → "-x^2", term(1, 'x') → "x", term(0, 'x') → "0". */
export function term(c, sym = '') {
  return terms([[c, sym]]);
}

/** ax + b:  linear(3, -2) → "3x - 2",  linear(-1, 0) → "-x",  linear(0, 4) → "4". */
export function linear(a, b, x = 'x') {
  return terms([[a, x], [b, '']]);
}

/** A power of a variable: power('x', 3) → "x^{3}", power('x', 1) → "x", power('x', 0) → "". */
export function power(x, k) {
  if (k === 0) return '';
  if (k === 1) return x;
  return `${x}^{${num(k)}}`;
}

/**
 * Polynomial from coefficients, HIGHEST degree first.
 *   poly([2, 0, -3, 1]) → "2x^{3} - 3x + 1"
 */
export function poly(coefs, x = 'x') {
  const n = coefs.length - 1;
  return terms(coefs.map((c, i) => [c, power(x, n - i)]));
}

/** Evaluate a polynomial (coefficients highest degree first) at x. */
export function polyEval(coefs, x) {
  return coefs.reduce((acc, c) => acc * x + valueOf(c), 0);
}

function trimLeading(coefs) {
  let i = 0;
  while (i < coefs.length - 1 && coefs[i] === 0) i++;
  return coefs.slice(i);
}

/** Add polynomials (number coefficients, highest degree first). */
export function polyAdd(p, q) {
  const n = Math.max(p.length, q.length);
  const out = new Array(n).fill(0);
  p.forEach((c, i) => (out[n - p.length + i] += c));
  q.forEach((c, i) => (out[n - q.length + i] += c));
  return trimLeading(out);
}

export function polyScale(p, k) {
  return trimLeading(p.map((c) => c * k));
}

export function polySub(p, q) {
  return polyAdd(p, polyScale(q, -1));
}

/** Multiply polynomials (number coefficients, highest degree first). */
export function polyMul(p, q) {
  const out = new Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (out[i + j] += a * b)));
  return trimLeading(out);
}

/** Derivative of a polynomial (number coefficients, highest degree first). */
export function polyDeriv(p) {
  const n = p.length - 1;
  if (n <= 0) return [0];
  return trimLeading(p.slice(0, -1).map((c, i) => c * (n - i)));
}

/** A linear factor for a root r: factor(3) → "(x - 3)", factor(-2) → "(x + 2)", factor(0) → "x". */
export function factor(r, x = 'x') {
  const v = valueOf(r);
  if (v === 0) return x;
  return `(${terms([[1, x], [r instanceof Frac ? r.neg() : -r, '']])})`;
}

/**
 * Simplify a square root: simplifySqrt(72) → { coef: 6, rad: 2 }  (√72 = 6√2).
 * rad is 1 when n is a perfect square.
 */
export function simplifySqrt(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`simplifySqrt(${n})`);
  if (n === 0) return { coef: 0, rad: 1 };
  let coef = 1;
  let rad = n;
  for (let d = 2; d * d <= rad; d++) {
    while (rad % (d * d) === 0) {
      rad /= d * d;
      coef *= d;
    }
  }
  return { coef, rad };
}

/** LaTeX for a simplified square root (times an optional multiplier): sqrtTex(72) → "6\sqrt{2}", sqrtTex(49) → "7". */
export function sqrtTex(n, k = 1) {
  const { coef, rad } = simplifySqrt(n);
  const c = coef * k;
  if (c === 0) return '0';
  if (rad === 1) return num(c);
  const lead = c === 1 ? '' : c === -1 ? '-' : num(c);
  return `${lead}\\sqrt{${rad}}`;
}

/** Is n a perfect square? */
export function isSquare(n) {
  return Number.isInteger(n) && n >= 0 && Number.isInteger(Math.sqrt(n));
}

/**
 * Solution-set text for an equation's roots: roots([2, -3]) → "x = -3 \text{ or } x = 2".
 * Values may be numbers or Frac; duplicates are merged and they are sorted ascending.
 */
export function rootsTex(values, x = 'x') {
  const seen = new Map();
  for (const v of values) seen.set(String(valueOf(v)), v);
  const sorted = [...seen.values()].sort((a, b) => valueOf(a) - valueOf(b));
  return sorted.map((v) => `${x} = ${num(v)}`).join(' \\text{ or } ');
}

/** An ordered pair or point: point(3, -2) → "(3, -2)". Accepts numbers or Frac. */
export function point(...coords) {
  return `(${coords.map((c) => num(c)).join(', ')})`;
}

/** A vector in angle brackets: vec(1, -2, 3) → "\langle 1, -2, 3 \rangle". */
export function vec(...comps) {
  return `\\langle ${comps.map((c) => (typeof c === 'string' ? c : num(c))).join(', ')} \\rangle`;
}
