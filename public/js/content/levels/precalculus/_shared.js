// Helpers shared by the Precalculus topics: exact trig values, angle formatting, matrices and
// decimal answer choices that are far enough apart to tell from one another.

import { num, gcd, round, simplifySqrt, Frac } from '../../lib/index.js';

/** Wrap LaTeX in inline-math delimiters. */
export const M = (tex) => `\\(${tex}\\)`;

export const toRad = (deg) => (deg * Math.PI) / 180;
export const toDeg = (rad) => (rad * 180) / Math.PI;

/** Degrees as LaTeX: degTex(30) → "30^{\circ}". */
export const degTex = (d, opts) => `${num(d, opts)}^{\\circ}`;

/** nπ/d as LaTeX in lowest terms: piTex(5, 6) → "\frac{5\pi}{6}", piTex(-1, 2) → "-\frac{\pi}{2}", piTex(2) → "2\pi". */
export function piTex(n, d = 1) {
  if (n === 0) return '0';
  const g = gcd(n, d);
  const top = Math.abs(n) / g;
  const bot = Math.abs(d) / g;
  const sign = n < 0 !== d < 0 ? '-' : '';
  const body = `${top === 1 ? '' : top}\\pi`;
  return bot === 1 ? sign + body : `${sign}\\frac{${body}}{${bot}}`;
}

/** The same as plain text, for labels inside pictures: piText(5, 6) → "5π/6". */
export function piText(n, d = 1) {
  if (n === 0) return '0';
  const g = gcd(n, d);
  const top = Math.abs(n) / g;
  const bot = Math.abs(d) / g;
  return `${n < 0 !== d < 0 ? '−' : ''}${top === 1 ? '' : top}π${bot === 1 ? '' : `/${bot}`}`;
}

/** Radian measure of a whole number of degrees: radTex(150) → "\frac{5\pi}{6}". */
export const radTex = (deg) => piTex(deg, 180);

/**
 * An exact number of the form (n/d)·√r, kept in simplest form with a rational denominator.
 * These are the values the special angles produce: 1/2, √2/2, √3/3, 2√3/3 …
 */
export class Surd {
  constructor(n, d = 1, r = 1) {
    if (![n, d, r].every(Number.isInteger) || d === 0 || r < 0) throw new RangeError(`Surd(${n}, ${d}, ${r})`);
    const s = simplifySqrt(r);
    n *= s.coef;
    r = n === 0 ? 1 : s.rad;
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
    this.r = r;
  }

  static from(x) {
    if (x instanceof Surd) return x;
    if (x instanceof Frac) return new Surd(x.n, x.d);
    if (Number.isInteger(x)) return new Surd(x);
    throw new TypeError(`cannot turn ${x} into a Surd`);
  }

  get value() { return (this.n / this.d) * Math.sqrt(this.r); }
  isZero() { return this.n === 0; }
  neg() { return new Surd(-this.n, this.d, this.r); }
  abs() { return new Surd(Math.abs(this.n), this.d, this.r); }
  mul(o) { o = Surd.from(o); return new Surd(this.n * o.n, this.d * o.d, this.r * o.r); }
  div(o) { o = Surd.from(o); return new Surd(this.n * o.d, this.d * o.n * o.r, this.r * o.r); }
  inv() { return new Surd(1).div(this); }
  /** The square, as an exact fraction. */
  sq() { return new Frac(this.n * this.n * this.r, this.d * this.d); }
  eq(o) { o = Surd.from(o); return this.n === o.n && this.d === o.d && this.r === o.r; }

  /** LaTeX (math mode): "\frac{\sqrt{3}}{2}", "-\frac{1}{2}", "2\sqrt{3}", "\frac{2\sqrt{3}}{3}". */
  tex() {
    const sign = this.n < 0 ? '-' : '';
    const a = Math.abs(this.n);
    const top = this.r === 1 ? String(a) : `${a === 1 ? '' : a}\\sqrt{${this.r}}`;
    return this.d === 1 ? sign + top : `${sign}\\frac{${top}}{${this.d}}`;
  }

  /** Plain text for picture labels: "√3/2", "−1/2". */
  text() {
    const a = Math.abs(this.n);
    const top = this.r === 1 ? String(a) : `${a === 1 ? '' : a}√${this.r}`;
    return `${this.n < 0 ? '−' : ''}${top}${this.d === 1 ? '' : `/${this.d}`}`;
  }
}

export const surd = (n, d = 1, r = 1) => new Surd(n, d, r);

// sin of the first-quadrant special angles, as [n, d, r] meaning (n/d)·√r.
const SIN_Q1 = { 0: [0, 1, 1], 30: [1, 2, 1], 45: [1, 2, 2], 60: [1, 2, 3], 90: [1, 1, 1] };

/** The angles (in degrees, 0 ≤ θ < 360) whose trig values are exact. */
export const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

export const norm360 = (d) => ((d % 360) + 360) % 360;

/** Reference angle in degrees (0–90) of any angle in degrees. */
export function refAngle(d) {
  d = norm360(d);
  return d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
}

/** Quadrant 1–4 of an angle in degrees, or 0 when its terminal side lies on an axis. */
export function quadrant(d) {
  d = norm360(d);
  return d % 90 === 0 ? 0 : Math.floor(d / 90) + 1;
}

/** Exact sine of a special angle given in degrees (any multiple of 30° or 45°). */
export function sinDeg(d) {
  d = norm360(d);
  const s = SIN_Q1[refAngle(d)];
  if (!s) throw new RangeError(`sinDeg(${d}): not a special angle`);
  return new Surd(d > 180 ? -s[0] : s[0], s[1], s[2]);
}

/** Exact cosine of a special angle given in degrees. */
export const cosDeg = (d) => sinDeg(90 - d);

/** Exact value of sin, cos, tan, csc, sec or cot at a special angle, or null where it is not defined. */
export function trigDeg(fn, d) {
  const s = sinDeg(d);
  const c = cosDeg(d);
  switch (fn) {
    case 'sin': return s;
    case 'cos': return c;
    case 'tan': return c.isZero() ? null : s.div(c);
    case 'cot': return s.isZero() ? null : c.div(s);
    case 'sec': return c.isZero() ? null : c.inv();
    case 'csc': return s.isZero() ? null : s.inv();
    default: throw new RangeError(`trigDeg: unknown function ${fn}`);
  }
}

/** JavaScript versions of the six trig functions, by name (angles in radians). */
export const TRIG = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  csc: (x) => 1 / Math.sin(x),
  sec: (x) => 1 / Math.cos(x),
  cot: (x) => Math.cos(x) / Math.sin(x),
};

/** A matrix as LaTeX. Entries may be numbers, Frac or LaTeX strings. */
export function pmat(rows) {
  return `\\begin{pmatrix} ${rows.map((r) => r.map((e) => (typeof e === 'string' ? e : num(e))).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
}

/** Formatter for decimal answers shown to a fixed number of places, with an optional unit. */
export const dec = (places, unit = '') => (v) => `\\(${num(v, { fixed: places })}\\)${unit ? ` ${unit}` : ''}`;

/**
 * Wrong answers for a decimal answer. Keeps the candidates (numbers or { value, why }) that are far
 * enough from the right answer and from each other to be told apart after rounding, then tops the
 * list up with values a clear distance away. Returns at least three.
 */
export function apart(correct, candidates, { places = 1, gap = 0.04, positive = false } = {}) {
  const out = [];
  const taken = [correct];
  const far = (v) => taken.every((t) => Math.abs(v - t) > Math.max(gap * Math.max(Math.abs(correct), Math.abs(t)), 2.5 * 10 ** -places));
  const tryAdd = (c) => {
    if (c == null) return;
    const noted = typeof c === 'object';
    const raw = noted ? c.value : c;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return;
    const v = round(raw, places);
    if ((positive && v <= 0) || !far(v)) return;
    taken.push(v);
    out.push(noted ? { ...c, value: v } : v);
  };
  for (const c of candidates) tryAdd(c);
  const scale = Math.max(Math.abs(correct), 10 ** (1 - places));
  for (const k of [0.25, -0.25, 0.5, -0.5, 1, 0.75, -0.75, 1.5, 2, 3]) {
    if (out.length >= 3) break;
    tryAdd(correct + k * scale);
  }
  return out;
}
