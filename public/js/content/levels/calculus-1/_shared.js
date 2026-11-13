// Helpers shared by the Calculus 1 topics.
import { R, q, num, terms, texFrac, close } from '../../lib/index.js';

/** Wrap LaTeX in inline-math delimiters. */
export const M = (tex) => R`\(${tex}\)`;

/** "lim" with the approach written underneath: lim(2) → lim_{x→2}, lim('0^{+}'), lim('\\infty'), lim(3, 't'). */
export const lim = (to, v = 'x') => `\\lim\\limits_{${v} \\to ${typeof to === 'number' ? num(to) : to}}`;

/** LaTeX for a piecewise definition: cases([['x + 1', 'x < 2'], ['5', 'x \\ge 2']]). */
export const cases = (rows) => `\\begin{cases} ${rows.map(([e, c]) => `${e}, & ${c}`).join(' \\\\ ')} \\end{cases}`;

/** A polynomial with a number substituted for x: subst([2, -5, 1], 3) → "2(3)^{2} - 5(3) + 1". */
export function subst(coefs, a) {
  const n = coefs.length - 1;
  const out = terms(coefs.map((c, i) => [c, n - i === 0 ? '' : `(${num(a)})${n - i > 1 ? `^{${n - i}}` : ''}`]));
  return out === `(${num(a)})` ? num(a) : out;
}

/** texFrac() in display size: dfrac('-4x', 'x + 1') → "-\dfrac{4x}{x + 1}" (a single negative term moves its sign in front). */
export const dfrac = (numTex, denTex) => texFrac(numTex, denTex).replace('\\frac', '\\dfrac');

/**
 * Plot window: the x-range [x0, x1] and a y-range that fits the given function(s) on it,
 * plus any extra heights in `include`. `cap: [lo, hi]` limits the range (for curves with asymptotes).
 */
export function fit(fs, x0, x1, { include = [], pad = 0.14, minPad = 1, cap = null } = {}) {
  const ys = include.slice();
  for (const f of [].concat(fs)) {
    for (let i = 0; i <= 80; i++) {
      const y = f(x0 + ((x1 - x0) * i) / 80);
      if (Number.isFinite(y)) ys.push(y);
    }
  }
  let lo = ys.length ? Math.min(...ys) : -1;
  let hi = ys.length ? Math.max(...ys) : 1;
  if (cap) {
    lo = Math.max(lo, cap[0]);
    hi = Math.min(hi, cap[1]);
    if (!(hi > lo)) [lo, hi] = cap;
  }
  const p = Math.max(minPad, (hi - lo) * pad);
  return { x: [x0, x1], y: [lo - p, hi + p] };
}

/**
 * A table of values with x across the top, as in most calculus texts.
 * rowTable(['x', 'f(x)'], [[1, 4], [2, 7]], alt): labels are LaTeX, cells are numbers (or rich text).
 */
export function rowTable(labels, columns, alt) {
  const cell = (c) => (typeof c === 'number' ? M(num(c)) : c);
  return {
    type: 'table',
    headers: [M(labels[0]), ...columns.map((c) => cell(c[0]))],
    rows: labels.slice(1).map((lab, i) => [M(lab), ...columns.map((c) => cell(c[i + 1]))]),
    rowHeaders: true,
    alt,
  };
}

/** Draw one question from a bank of fixed (mostly conceptual) questions. Items are q() specs or functions rng → spec. */
export function fromBank(rng, bank, extra = {}) {
  const item = rng.pick(bank);
  return q({ ...extra, ...(typeof item === 'function' ? item(rng) : item) });
}

/** A multiple of π for math mode: piTimes(6) → "6\pi", piTimes(1) → "\pi", piTimes(0.5) → "0.5\pi". */
export const piTimes = (v) => (v === 1 ? '\\pi' : v === -1 ? '-\\pi' : `${num(v)}\\pi`);

/** Second derivative by central differences. */
export function numDeriv2(f, x, h = 1e-3) {
  return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
}

/**
 * For questions whose choices are expressions: passes when every wrong expression (as a JS function)
 * really differs from the right one, so that no "wrong" choice is the correct answer in another form.
 */
export function checkDistinct(right, wrongs, xs = [0.37, 0.83, 1.29, 1.71]) {
  for (let i = 0; i < wrongs.length; i++) {
    if (xs.every((x) => close(right(x), wrongs[i](x), 1e-7))) return `wrong choice ${i + 1} equals the correct answer`;
  }
  return true;
}
