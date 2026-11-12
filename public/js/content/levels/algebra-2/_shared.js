// Helpers shared by the Algebra 2 topics.
import { Frac, frac, terms, gcd, simplifySqrt } from '../../lib/index.js';

/** Wrap LaTeX in inline-math delimiters. */
export const M = (tex) => `\\(${tex}\\)`;

/** Numeric value of a number or a Frac. */
export const val = (v) => (v instanceof Frac ? v.value : v);

// ───────────── Symbolic answer choices ─────────────

/**
 * Choices for an answer that is an expression rather than a number.
 * Every option is { tex, f, why? }: its LaTeX and a function that evaluates it (f may ignore its argument
 * when the option is a constant). A wrong option that agrees with the right answer, or with an earlier
 * wrong option, at every test point is dropped, so an equivalent form can never be offered as "wrong".
 * Returns { correct, wrong } ready to spread into q().
 */
export function symChoices(correct, wrongs, xs = [0.37, 1.29, 2.23], wrap = M) {
  const sig = (o) => xs.map((x) => o.f(x));
  const same = (a, b) => a.every((v, i) => (!Number.isFinite(v) && !Number.isFinite(b[i])) || Math.abs(v - b[i]) <= 1e-9 * Math.max(1, Math.abs(v), Math.abs(b[i])));
  const kept = [sig(correct)];
  const wrong = [];
  for (const w of wrongs) {
    if (!w) continue;
    const s = sig(w);
    if (kept.some((k) => same(k, s))) continue;
    kept.push(s);
    wrong.push(w.why ? { value: wrap(w.tex), why: w.why } : wrap(w.tex));
  }
  return { correct: wrap(correct.tex), wrong };
}

// ───────────── Complex numbers ─────────────

/** a + bi as LaTeX (numbers or Frac): cx(3, -2) → "3 - 2i", cx(0, 1) → "i", cx(4, 0) → "4". */
export const cx = (a, b) => terms([[a, ''], [b, 'i']]);

/** Product of the complex numbers [a, b] and [c, d] (meaning a + bi and c + di). */
export const cmul = ([a, b], [c, d]) => [a * c - b * d, a * d + b * c];

/** Value of a polynomial with real coefficients (highest power first) at the complex number z = [re, im]. */
export function cpolyEval(coefs, z) {
  let acc = [0, 0];
  for (const c of coefs) {
    acc = cmul(acc, z);
    acc = [acc[0] + c, acc[1]];
  }
  return acc;
}

/** Check: z really is a solution of the polynomial equation. */
export function checkComplexRoot(coefs, z, tol = 1e-7) {
  const [re, im] = cpolyEval(coefs, z);
  return Math.abs(re) <= tol && Math.abs(im) <= tol ? true : `${z[0]} + ${z[1]}i is not a solution (value ${re} + ${im}i)`;
}

// For checks only: a + bi behaves exactly like the real matrix [[a, −b], [b, a]], so matrix
// multiplication is a second, independent way to multiply complex numbers.
const asMatrix = ([a, b]) => [a, -b, b, a];
const matMul = (p, q) => [p[0] * q[0] + p[1] * q[2], p[0] * q[1] + p[1] * q[3], p[2] * q[0] + p[3] * q[2], p[2] * q[1] + p[3] * q[3]];

/** Check: z · w = result (all three given as [re, im]). */
export function checkProduct(z, w, result, tol = 1e-9) {
  const got = matMul(asMatrix(z), asMatrix(w));
  const want = asMatrix(result);
  return got.every((v, i) => Math.abs(v - want[i]) <= tol * Math.max(1, Math.abs(want[i]))) ? true : `product is ${got[0]} + ${got[2]}i, expected ${result[0]} + ${result[1]}i`;
}

// ───────────── Radicals ─────────────

/** Largest perfect n-th power factor: simplifyRoot(54, 3) → { coef: 3, rad: 2 } because ∛54 = 3∛2. */
export function simplifyRoot(n, index = 2) {
  let coef = 1;
  let rad = n;
  for (let d = 2; d ** index <= rad; d++) {
    while (rad % d ** index === 0) {
      rad /= d ** index;
      coef *= d;
    }
  }
  return { coef, rad };
}

/**
 * (p + q√c) / r in simplest form, as { tex, value }. p, q, r are integers (r ≠ 0) and c is a positive integer.
 * radForm(6, 2, 12, 4) → (3 + 2√3)/2;  radForm(0, 3, 2, 6) → √2/2;  radForm(4, 1, 9, 1) → 7.
 */
export function radForm(p, q, c, r = 1) {
  const s = simplifySqrt(c);
  let k = q * s.coef;
  const rad = s.rad;
  if (rad === 1) {
    p += k;
    k = 0;
  }
  if (r < 0) {
    p = -p;
    k = -k;
    r = -r;
  }
  const g = gcd(gcd(p, k), r) || 1;
  p /= g;
  k /= g;
  r /= g;
  const value = (p + k * Math.sqrt(rad)) / r;
  if (k === 0) return { tex: frac(p, r).tex(), value };
  const root = `\\sqrt{${rad}}`;
  if (p === 0) {
    const top = terms([[Math.abs(k), root]]);
    return { tex: r === 1 ? terms([[k, root]]) : `${k < 0 ? '-' : ''}\\frac{${top}}{${r}}`, value };
  }
  if (r === 1) return { tex: p < 0 && k > 0 ? terms([[k, root], [p, '']]) : terms([[p, ''], [k, root]]), value };
  const allNegative = p < 0 && k < 0;
  const [pp, kk] = allNegative ? [-p, -k] : [p, k];
  const top = pp < 0 && kk > 0 ? terms([[kk, root], [pp, '']]) : terms([[pp, ''], [kk, root]]);
  return { tex: `${allNegative ? '-' : ''}\\frac{${top}}{${r}}`, value };
}
