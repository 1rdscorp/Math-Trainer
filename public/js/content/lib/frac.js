// Exact fractions. Always stored in lowest terms with a positive denominator.

import { gcd } from './numbers.js';

export class Frac {
  constructor(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new TypeError(`Frac needs integers, got ${n}/${d}`);
    if (d === 0) throw new RangeError('Frac: denominator is 0');
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
  }

  static from(x) {
    if (x instanceof Frac) return x;
    if (Number.isInteger(x)) return new Frac(x, 1);
    throw new TypeError(`cannot turn ${x} into a Frac (use frac(n, d))`);
  }

  /** Exact fraction for a terminating decimal: Frac.fromDecimal(0.75) → 3/4. */
  static fromDecimal(x, maxPlaces = 6) {
    const f = 10 ** maxPlaces;
    return new Frac(Math.round(x * f), f);
  }

  add(o) { o = Frac.from(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Frac.from(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Frac.from(o); return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { o = Frac.from(o); return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  inv() { return new Frac(this.d, this.n); }
  abs() { return new Frac(Math.abs(this.n), this.d); }
  pow(k) {
    if (!Number.isInteger(k)) throw new TypeError('Frac.pow needs an integer power');
    return k >= 0 ? new Frac(this.n ** k, this.d ** k) : new Frac(this.d ** -k, this.n ** -k);
  }

  eq(o) { o = Frac.from(o); return this.n === o.n && this.d === o.d; }
  cmp(o) { o = Frac.from(o); return Math.sign(this.n * o.d - o.n * this.d); }
  lt(o) { return this.cmp(o) < 0; }
  gt(o) { return this.cmp(o) > 0; }

  get value() { return this.n / this.d; }
  valueOf() { return this.n / this.d; }
  isInt() { return this.d === 1; }

  /** LaTeX (math mode): "3", "-3", "\frac{3}{4}", "-\frac{3}{4}". */
  tex() {
    if (this.d === 1) return String(this.n);
    return `${this.n < 0 ? '-' : ''}\\frac{${Math.abs(this.n)}}{${this.d}}`;
  }

  /** LaTeX as a mixed number when |value| > 1: "2\frac{1}{3}". Proper fractions and integers are unchanged. */
  mixedTex() {
    if (this.d === 1 || Math.abs(this.n) < this.d) return this.tex();
    const whole = Math.trunc(Math.abs(this.n) / this.d);
    const rest = Math.abs(this.n) % this.d;
    return `${this.n < 0 ? '-' : ''}${whole}\\frac{${rest}}{${this.d}}`;
  }

  /** Plain text: "3/4", "−3/4", "5". */
  text() {
    const sign = this.n < 0 ? '−' : '';
    return this.d === 1 ? `${sign}${Math.abs(this.n)}` : `${sign}${Math.abs(this.n)}/${this.d}`;
  }

  toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
}

/** frac(3, 4) → the fraction 3/4 in lowest terms. */
export function frac(n, d = 1) {
  return new Frac(n, d);
}

/**
 * Like frac(), but returns null instead of throwing when the denominator is 0 or a part is not a
 * whole number. Handy for wrong answers built from a formula: q() simply skips null choices.
 */
export function tryFrac(n, d = 1) {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return null;
  return new Frac(n, d);
}

/**
 * LaTeX for a fraction exactly as given (NOT reduced) — for showing work such as 6/8.
 * fracTex(6, 8) → "\frac{6}{8}";  fracTex(-1, 2) → "-\frac{1}{2}".
 */
export function fracTex(n, d) {
  const negative = (n < 0) !== (d < 0) && n !== 0;
  return `${negative ? '-' : ''}\\frac{${Math.abs(n)}}{${Math.abs(d)}}`;
}

/** LaTeX for a mixed number exactly as given: mixedTex(2, 1, 3) → "2\frac{1}{3}". */
export function mixedTex(whole, n, d) {
  if (n === 0) return String(whole);
  if (whole === 0) return fracTex(n, d);
  return `${whole}\\frac{${Math.abs(n)}}{${Math.abs(d)}}`;
}
