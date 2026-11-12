// Independent numeric checks for generated questions.
//
// A generator can attach `check: () => checkDeriv(f, df)` to a question. The content
// validator (npm run validate) calls it for hundreds of random questions, so a wrong
// formula or a sign slip in a generator is caught automatically. Checks never run in the app.
//
// Every check returns `true` when it passes, or a string describing the mismatch.

const DEFAULT_POINTS = [0.37, 0.83, 1.29, 1.71, 2.23];

export function close(a, b, tol = 1e-6) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Central-difference derivative of f at x. */
export function numDeriv(f, x, h = 1e-5) {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** Partial derivative of f(...point) with respect to coordinate i. */
export function numPartial(f, pt, i, h = 1e-5) {
  const up = pt.slice();
  const dn = pt.slice();
  up[i] += h;
  dn[i] -= h;
  return (f(...up) - f(...dn)) / (2 * h);
}

/** Simpson's rule for ∫ₐᵇ f(x) dx. */
export function integrate(f, a, b, n = 2000) {
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/**
 * Double integral ∫ₐᵇ ∫_{lo(x)}^{hi(x)} f(x, y) dy dx. `lo`/`hi` may be numbers or functions of x.
 */
export function integrate2(f, a, b, lo, hi, n = 200) {
  const L = typeof lo === 'function' ? lo : () => lo;
  const H = typeof hi === 'function' ? hi : () => hi;
  return integrate((x) => integrate((y) => f(x, y), L(x), H(x), n), a, b, n);
}

/**
 * Triple integral over a box-like region. zLo/zHi may be numbers or functions of (x, y);
 * yLo/yHi may be numbers or functions of x.
 */
export function integrate3(f, a, b, yLo, yHi, zLo, zHi, n = 40) {
  const ZL = typeof zLo === 'function' ? zLo : () => zLo;
  const ZH = typeof zHi === 'function' ? zHi : () => zHi;
  return integrate2((x, y) => integrate((z) => f(x, y, z), ZL(x, y), ZH(x, y), n), a, b, yLo, yHi, n);
}

/** Passes when a ≈ b. */
export function checkEqual(a, b, tol = 1e-6, label = 'value') {
  return close(a, b, tol) ? true : `${label}: expected ${b}, got ${a}`;
}

/** Passes when df really is the derivative of f (compared numerically at several points). */
export function checkDeriv(f, df, xs = DEFAULT_POINTS, tol = 1e-4) {
  for (const x of xs) {
    const want = numDeriv(f, x);
    const got = df(x);
    if (!close(got, want, tol)) return `derivative mismatch at x=${x}: numeric ${want}, given ${got}`;
  }
  return true;
}

/** Passes when F is an antiderivative of f (F′ = f). */
export function checkAntideriv(F, f, xs = DEFAULT_POINTS, tol = 1e-4) {
  const r = checkDeriv(F, f, xs, tol);
  return r === true ? true : `anti${r}`;
}

/** Passes when ∫ₐᵇ f dx ≈ value. */
export function checkIntegral(f, a, b, value, tol = 1e-5) {
  const want = integrate(f, a, b);
  return close(value, want, tol) ? true : `integral mismatch on [${a}, ${b}]: numeric ${want}, given ${value}`;
}

/**
 * Passes when f(x) → L as x → a. `a` may be Infinity or -Infinity.
 * side: 0 both sides (default), +1 from the right, −1 from the left.
 */
export function checkLimit(f, a, L, { side = 0, tol = 1e-3 } = {}) {
  const probe = [];
  if (a === Infinity) probe.push(1e6, 1e7);
  else if (a === -Infinity) probe.push(-1e6, -1e7);
  else {
    if (side >= 0) probe.push(a + 1e-5, a + 1e-6);
    if (side <= 0) probe.push(a - 1e-5, a - 1e-6);
  }
  for (const x of probe) {
    const got = f(x);
    if (!close(got, L, tol)) return `limit mismatch near x=${x}: f=${got}, expected ${L}`;
  }
  return true;
}

/** Passes when every value in xs makes f(x) ≈ 0 (i.e. each is a solution of f(x) = 0). */
export function checkRoots(f, xs, tol = 1e-6) {
  for (const x of [].concat(xs)) {
    const v = f(x);
    if (!(Math.abs(v) <= tol * Math.max(1, Math.abs(x)))) return `x=${x} is not a root: f(x)=${v}`;
  }
  return true;
}

/** Passes when two functions agree at several points (e.g. an expression and its simplified form). */
export function checkSame(f, g, xs = DEFAULT_POINTS, tol = 1e-6) {
  for (const x of xs) {
    const a = f(x);
    const b = g(x);
    if (!close(a, b, tol)) return `functions differ at x=${x}: ${a} vs ${b}`;
  }
  return true;
}

/** Combine several checks: passes only if all pass; otherwise returns the first failure message. */
export function checkAll(...results) {
  for (const r of results) if (r !== true) return r || 'check failed';
  return true;
}
