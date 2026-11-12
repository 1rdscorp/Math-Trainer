// Number helpers shared by all topic content.

export function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

export function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}

/** Prime factors with repeats, smallest first: primeFactors(12) → [2, 2, 3]. */
export function primeFactors(n) {
  n = Math.abs(n);
  const out = [];
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) {
      out.push(d);
      n /= d;
    }
  }
  if (n > 1) out.push(n);
  return out;
}

/** All positive divisors, smallest first. */
export function divisors(n) {
  n = Math.abs(n);
  const small = [];
  const large = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d === 0) {
      small.push(d);
      if (d * d !== n) large.unshift(n / d);
    }
  }
  return small.concat(large);
}

/** Round to a number of decimal places without floating-point leftovers (and never −0). */
export function round(x, places = 2) {
  const f = 10 ** places;
  const r = Math.round((x + Math.sign(x) * Number.EPSILON * Math.abs(x)) * f) / f;
  return r === 0 ? 0 : r;
}

/** How many decimal places a number is written with (after trimming float noise). */
export function decimalPlaces(x, max = 8) {
  const s = String(round(x, max));
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/** Are two numbers equal to within a relative tolerance? */
export function approx(a, b, tol = 1e-9) {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function sum(list) {
  return list.reduce((a, b) => a + b, 0);
}

export function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`factorial(${n})`);
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Combinations: n choose k. */
export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** Permutations: n! / (n − k)!. */
export function permutations(n, k) {
  let r = 1;
  for (let i = 0; i < k; i++) r *= n - i;
  return r;
}

/** Inclusive integer range. */
export function range(lo, hi, step = 1) {
  const out = [];
  for (let v = lo; step > 0 ? v <= hi : v >= hi; v += step) out.push(v);
  return out;
}
