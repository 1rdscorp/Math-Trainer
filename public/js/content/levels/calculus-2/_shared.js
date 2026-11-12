// Helpers shared by the Calculus 2 topics: LaTeX builders, safe choice lists, plot windows and
// independent numeric checks.
import { Frac, num, terms, close, numDeriv, primeFactors } from '../../lib/index.js';

/** Wrap LaTeX in inline-math delimiters. */
export const M = (tex) => `\\(${tex}\\)`;

/** An indefinite-integral choice: the LaTeX plus "+ C". */
export const C = (tex) => `\\(${tex} + C\\)`;

const val = (c) => (c instanceof Frac ? c.value : c);

/**
 * Like terms(), but a fractional coefficient carries its symbol in the numerator, and a term may have
 * a symbolic denominator:  [coefficient, top = '', bottom = ''].
 *   fterms([[frac(3, 4), '\\pi'], [frac(-1, 2), '\\ln 2'], [1, '']]) → "\frac{3\pi}{4} - \frac{\ln 2}{2} + 1"
 *   fterms([[frac(-5, 2), '\\ln x', 'x^{2}']])                        → "-\frac{5\ln x}{2x^{2}}"
 */
export function fterms(list) {
  let out = '';
  for (const [c, top = '', bottom = ''] of list) {
    const v = val(c);
    if (v === 0) continue;
    const n = c instanceof Frac ? Math.abs(c.n) : Math.abs(v);
    const d = c instanceof Frac ? c.d : 1;
    let body;
    if (d !== 1 || bottom) {
      const up = n === 1 && top ? top : `${num(n)}${top}`;
      const down = d === 1 ? bottom : `${d}${bottom}`;
      body = `\\frac{${up}}{${down}}`;
    } else {
      body = n === 1 && top ? top : `${num(n)}${top}`;
    }
    if (!out) out = (v < 0 ? '-' : '') + body;
    else out += (v < 0 ? ' - ' : ' + ') + body;
  }
  return out || '0';
}

/** A rational multiple of π: piTex(frac(3, 4)) → "\frac{3\pi}{4}", piTex(2) → "2\pi", piTex(1) → "\pi". */
export const piTex = (c) => fterms([[c, '\\pi']]);

/** e^{kx}: ekx(1) → "e^{x}", ekx(-1) → "e^{-x}", ekx(3) → "e^{3x}", ekx(2, 't') → "e^{2t}". k may be a Frac. */
export function ekx(k, x = 'x') {
  const v = val(k);
  if (v === 1) return `e^{${x}}`;
  if (v === -1) return `e^{-${x}}`;
  if (k instanceof Frac && k.d !== 1) return `e^{${v < 0 ? '-' : ''}${Math.abs(k.n) === 1 ? '' : Math.abs(k.n)}${x}/${k.d}}`;
  return `e^{${num(k)}${x}}`;
}

/** kx for the argument of a function: kx(1) → "x", kx(3) → "3x", kx(-1) → "-x". */
export function kx(k, x = 'x') {
  if (k === 1) return x;
  if (k === -1) return `-${x}`;
  return `${num(k)}${x}`;
}

// ───────────── exact constants with numeric values ─────────────

const SYMBOLS = [
  [/^\\pi\^\{(\d+)\}/, (m) => Math.PI ** Number(m[1])],
  [/^\\pi/, () => Math.PI],
  [/^e\^\{(-?)(\d*)\\pi(?:\/(\d+))?\}/, (m) => Math.exp(((m[1] ? -1 : 1) * (m[2] ? Number(m[2]) : 1) * Math.PI) / (m[3] ? Number(m[3]) : 1))],
  [/^e\^\{(-?\d+(?:\.\d+)?)(?:\/(\d+))?\}/, (m) => Math.exp(Number(m[1]) / (m[2] ? Number(m[2]) : 1))],
  [/^e/, () => Math.E],
  [/^\\ln (\d+(?:\.\d+)?)/, (m) => Math.log(Number(m[1]))],
  [/^\\ln\\left\(\\frac\{(\d+)\}\{(\d+)\}\\right\)/, (m) => Math.log(Number(m[1]) / Number(m[2]))],
  [/^\\sqrt\{(\d+)\}/, (m) => Math.sqrt(Number(m[1]))],
];

/** Numeric value of a constant symbol such as "\pi", "\pi^{2}", "e^{-2}", "e^{\pi/2}", "\ln 3", "\sqrt{3}" or a product of them. */
export function symValue(sym) {
  let rest = String(sym).trim();
  let v = 1;
  outer: while (rest) {
    for (const [re, fn] of SYMBOLS) {
      const m = rest.match(re);
      if (m) {
        v *= fn(m);
        rest = rest.slice(m[0].length).trim();
        continue outer;
      }
    }
    throw new Error(`symValue: cannot read "${sym}"`);
  }
  return v;
}

/**
 * An exact constant with its numeric value: K([[frac(1, 2), '\\pi'], [-1, '']]) → { tex: "\frac{\pi}{2} - 1", value: 0.5707… }.
 * A symbol may also be given as { t: tex, v: value } when symValue cannot read it.
 */
export function K(list) {
  let value = 0;
  for (const [c, sym = ''] of list) value += val(c) * (typeof sym === 'string' ? symValue(sym) : sym.v);
  return { tex: fterms(list.map(([c, sym = '']) => [c, typeof sym === 'string' ? sym : sym.t])), value };
}

/**
 * Choices for q() from exact constants. `correct` is a K; each wrong answer is a K or { k: K, why }.
 * Wrong answers with the same VALUE as the correct answer or as an earlier wrong answer are dropped,
 * so two different-looking forms of one number can never appear together.
 * A plain string (such as 'Diverges') may stand in for a K anywhere; strings are compared as text.
 * Spread the result into q():  q({ prompt, ...exactChoices(right, [..]), … }).
 */
export function exactChoices(correct, wrongs, wrap = M) {
  const isText = (k) => typeof k === 'string';
  const same = (a, b) => (isText(a) || isText(b) ? a === b : Math.abs(a.value - b.value) < 1e-9 * Math.max(1, Math.abs(a.value)));
  const show = (k) => (isText(k) ? k : wrap(k.tex));
  const seen = [correct];
  const out = [];
  for (const w of wrongs) {
    if (!w) continue;
    const k = isText(w) ? w : w.k ?? w;
    if (!isText(k) && !Number.isFinite(k.value)) continue;
    if (seen.some((v) => same(v, k))) continue;
    seen.push(k);
    out.push(!isText(w) && w.why ? { value: show(k), why: w.why } : show(k));
  }
  return { correct: show(correct), wrong: out };
}

/** A plain number or Frac as an exact constant: N(frac(3, 2)) → { tex: "\frac{3}{2}", value: 1.5 }. */
export const N = (x) => K([[x, '']]);

/**
 * A sum of logarithms of positive rational numbers, c·ln(n/d) + …, in one simplest form, so that equal
 * values always print the same way. Everything is reduced to primes first. If the result fits in a
 * single logarithm of a small fraction it is written that way (6·ln(4/6) + 6·ln 3 → "6\ln 2",
 * 4·ln 3 − 2·ln 5 → "2\ln\frac{9}{5}"); otherwise primes with equal coefficients share a logarithm.
 * Each item is [coefficient, n, d = 1] with whole numbers n, d ≥ 1. The result works with exactChoices().
 */
export function lnCombo(list) {
  const byPrime = new Map();
  const add = (p, c) => byPrime.set(p, (byPrime.get(p) ?? new Frac(0)).add(c));
  for (const [c, n, d = 1] of list) {
    const cf = Frac.from(c);
    for (const p of primeFactors(n)) add(p, cf);
    for (const p of primeFactors(d)) add(p, cf.neg());
  }
  const live = [...byPrime].filter(([, c]) => c.n !== 0);
  const value = live.reduce((v, [p, c]) => v + c.value * Math.log(p), 0);
  if (!live.length) return { tex: '0', value: 0 };

  // One logarithm: g·ln(top/bottom), where g is the greatest common "divisor" of the coefficients.
  const gcdInt = (a, b) => (b ? gcdInt(b, a % b) : Math.abs(a));
  const gNum = live.reduce((g, [, c]) => gcdInt(g, c.n), 0);
  const gDen = live.reduce((l, [, c]) => (l * c.d) / gcdInt(l, c.d), 1);
  const g = new Frac(gNum, gDen);
  let top = 1;
  let bottom = 1;
  for (const [p, c] of live) {
    const e = c.div(g).n;
    if (e > 0) top *= p ** e;
    else bottom *= p ** -e;
  }
  if (top <= 99 && bottom <= 99) {
    if (top === 1) return { tex: fterms([[g.neg(), `\\ln ${bottom}`]]), value };
    if (bottom === 1) return { tex: fterms([[g, `\\ln ${top}`]]), value };
    return { tex: (g.d === 1 ? fterms : terms)([[g, `\\ln\\frac{${top}}{${bottom}}`]]), value };
  }

  // Otherwise: one logarithm for each distinct size of coefficient.
  const groups = new Map();
  for (const [p, c] of live) {
    const key = c.abs().toString();
    const grp = groups.get(key) ?? { c: c.abs(), top: 1, bottom: 1 };
    if (c.n > 0) grp.top *= p;
    else grp.bottom *= p;
    groups.set(key, grp);
  }
  const items = [...groups.values()].map((grp) => (grp.top === 1 ? [grp.c.neg(), `\\ln ${grp.bottom}`] : grp.bottom === 1 ? [grp.c, `\\ln ${grp.top}`] : [grp.c, `\\ln\\frac{${grp.top}}{${grp.bottom}}`]));
  items.sort((a, b) => (b[0].n > 0) - (a[0].n > 0) || b[0].abs().value - a[0].abs().value);
  return { tex: fterms(items), value };
}

// ───────────── antiderivative choices ─────────────

/** A linear combination of basis functions: basis = [{ tex, f }], coefs = numbers or Frac → { tex, F }. */
export function combo(basis, coefs) {
  return {
    tex: terms(coefs.map((c, i) => [c, basis[i].tex])),
    F: (x) => coefs.reduce((s, c, i) => s + (val(c) === 0 ? 0 : val(c) * basis[i].f(x)), 0),
  };
}

const ANTI_POINTS = [0.37, 0.83, 1.29, 1.71];

/**
 * Choices for an indefinite integral. `correct` is { tex, F }; each wrong answer is { tex, F?, why? }.
 * "+ C" is added to every choice. A wrong answer whose F differs from the correct F (or from an earlier
 * wrong answer) only by a constant is dropped, so an equivalent antiderivative can never be marked wrong.
 */
export function antiChoices(correct, wrongs, xs = ANTI_POINTS) {
  const sig = (F) => xs.slice(1).map((x) => F(x) - F(xs[0]));
  const same = (a, b) => a.every((v, i) => close(v, b[i], 1e-7));
  const seen = [sig(correct.F)];
  const out = [];
  for (const w of wrongs) {
    if (!w) continue;
    if (w.F) {
      const s = sig(w.F);
      if (s.some((v) => !Number.isFinite(v)) || seen.some((t) => same(s, t))) continue;
      seen.push(s);
    }
    out.push(w.why ? { value: C(w.tex), why: w.why } : C(w.tex));
  }
  return { correct: C(correct.tex), wrong: out };
}

// ───────────── plots ─────────────

/** A plot window that fits the given functions on [x0, x1]: { x: [x0, x1], y: [lo, hi] }. Always includes y = 0. */
export function fitWindow(fns, x0, x1, { pad = 0.12, minSpan = 1 } = {}) {
  let lo = 0;
  let hi = 0;
  for (const f of fns) {
    for (let i = 0; i <= 60; i++) {
      const y = f(x0 + ((x1 - x0) * i) / 60);
      if (Number.isFinite(y)) {
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
    }
  }
  const span = Math.max(hi - lo, minSpan);
  return { x: [x0, x1], y: [lo - pad * span, lo + span + pad * span] };
}

// ───────────── numeric checks ─────────────

/**
 * Tanh–sinh quadrature for ∫ₐᵇ f(x) dx. Either limit may be infinite, and f may blow up at an endpoint
 * (keep an endpoint singularity at x = 0 or at an infinite limit so it is resolved accurately).
 * Used only by checks: it is an independent numeric value for an improper integral.
 */
export function quad(f, a, b) {
  if (a === -Infinity && b === Infinity) return quad(f, -Infinity, 0) + quad(f, 0, Infinity);
  if (a === -Infinity) return quad((x) => f(-x), -b, Infinity);
  const infinite = b === Infinity;
  const h = 1 / 32;
  let s = 0;
  for (let k = -192; k <= 192; k++) {
    const t = k * h;
    const u = (Math.PI / 2) * Math.sinh(t);
    const dl = 1 / (1 + Math.exp(-2 * u)); // distance from the left end of the unit interval
    const dr = 1 / (1 + Math.exp(2 * u)); // distance from the right end
    const w = ((Math.PI / 4) * Math.cosh(t)) / Math.cosh(u) ** 2;
    let term;
    if (infinite) term = (f(a + dl / dr) / (dr * dr)) * w;
    else term = f(dl < 0.5 ? a + (b - a) * dl : b - (b - a) * dr) * (b - a) * w;
    if (Number.isFinite(term)) s += term;
  }
  return s * h;
}

/** Passes when the (possibly improper) integral ∫ₐᵇ f dx ≈ value. */
export function checkQuad(f, a, b, value, tol = 1e-6) {
  const want = quad(f, a, b);
  return close(value, want, tol) ? true : `integral mismatch on [${a}, ${b}]: numeric ${want}, given ${value}`;
}

/** Σ term(n) for n = from … to. */
export function partialSum(term, from, to) {
  let s = 0;
  for (let n = from; n <= to; n++) s += term(n);
  return s;
}

/** Passes when y(t) satisfies y′ = rhs(t, y) at the sample points (and y(t0) = y0 when `init` = [t0, y0] is given). */
export function checkODE(y, rhs, ts = [0.3, 0.8, 1.4, 2.1], init = null, tol = 1e-4) {
  for (const t of ts) {
    const want = rhs(t, y(t));
    const got = numDeriv(y, t);
    if (!close(got, want, tol)) return `y' mismatch at t=${t}: numeric ${got}, right side ${want}`;
  }
  if (init && !close(y(init[0]), init[1], 1e-9)) return `initial condition fails: y(${init[0]}) = ${y(init[0])}, expected ${init[1]}`;
  return true;
}
