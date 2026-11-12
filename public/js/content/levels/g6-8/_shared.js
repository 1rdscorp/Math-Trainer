// Helpers shared by the Grades 6–8 topics.
import { num, round, Frac } from '../../lib/index.js';

/** A number or Frac as inline math: M(3.5) → "\(3.5\)". */
export const M = (x, opts) => `\\(${num(x, opts)}\\)`;

/** LaTeX for a number or a Frac; a Frac greater than 1 is written as a mixed number. */
export const mtex = (v, opts) => (v instanceof Frac ? v.mixedTex() : num(v, opts));

/** The same, wrapped as inline math. Works as a q({ fmt }) formatter. */
export const mixed = (v) => `\\(${mtex(v)}\\)`;

/** A percent as inline math: pct(25) → "\(25\%\)". */
export const pct = (x, opts) => `\\(${num(x, opts)}\\%\\)`;

/** Dollars for math mode: usd(4.5) → "4.50", usd(7) → "7" (cents are shown only when there are some). */
export const usd = (x) => (Number.isInteger(round(x, 2)) ? num(round(x, 2)) : num(x, { fixed: 2 }));

/** A ratio as inline math: ratio(2, 3) → "\(2 : 3\)". */
export const ratio = (...parts) => `\\(${parts.map((p) => num(p)).join(' : ')}\\)`;

const isOne = (v) => (v instanceof Frac ? v.n === 1 && v.d === 1 : v === 1);

/** A number followed by a unit that agrees with it: withUnit(1, 'mile') → "\(1\) mile". */
export const withUnit = (v, one, many = `${one}s`, opts) => `${M(v, opts)} ${isOne(v) ? one : many}`;

/** The same, as a formatter for q({ fmt }). */
export const unitFmt = (one, many = `${one}s`, opts) => (v) => withUnit(v, one, many, opts);

/** x if it has at most `places` decimal places, otherwise null (q() skips null choices). */
export function clean(x, places = 2) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  const r = round(x, places);
  return Math.abs(x - r) < 1e-9 ? r : null;
}

/** Plain-text label for a Frac inside a picture: "5", "1/2", "3 1/2", "−3/4". */
export function fracLabel(f) {
  const sign = f.n < 0 ? '−' : '';
  const n = Math.abs(f.n);
  if (f.d === 1) return `${sign}${n}`;
  const whole = Math.floor(n / f.d);
  return whole ? `${sign}${whole} ${n % f.d}/${f.d}` : `${sign}${n}/${f.d}`;
}

/**
 * A tape diagram made of equal boxes.
 * rows: [{ label, count, shade?, box?, total? }] — `box` is the text written in every box of that row.
 */
export function tape(rows, alt) {
  return {
    type: 'barModel',
    rows: rows.map((r, i) => ({
      label: r.label,
      parts: Array.from({ length: r.count }, () => ({ value: 1, label: r.box, shade: r.shade ?? 'abcd'[i % 4] })),
      total: r.total,
    })),
    alt,
  };
}

/** A plain coordinate grid for plots: square, one unit per grid line. */
export function grid(lo, hi, extra) {
  return { type: 'plot', x: [lo, hi], y: [lo, hi], step: [1, 1], square: true, ...extra };
}

/**
 * A number line with tidy end points that shows every value in `values`.
 * extra: any other numberLine fields (points, jumps, ray, alt …).
 */
export function lineFor(values, extra = {}) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find((s) => span / s <= 16) ?? 10000;
  return { type: 'numberLine', min: Math.floor((lo - step / 2) / step) * step, max: Math.ceil((hi + step / 2) / step) * step, step, ...extra };
}

/** A signed number as plain text for picture labels: "+5", "−3", "0". */
export const signedLabel = (x) => (x > 0 ? `+${num(x)}` : num(x).replace('-', '−'));

/** "a" or "an" for a number read aloud: an(8) → "an", an(18) → "an", an(12) → "a". */
export const an = (n) => (/^(8|11(\D|$)|18(\D|$))/.test(String(n)) ? 'an' : 'a');

/** Singular of a plural unit word: "feet" → "foot", "inches" → "inch", "miles" → "mile". */
export const singular = (word) => ({ feet: 'foot', inches: 'inch', boxes: 'box', glasses: 'glass' }[word] ?? word.replace(/s$/, ''));
