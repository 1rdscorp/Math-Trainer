// Helpers shared by the Calculus 3 topics: vector arithmetic, LaTeX for vectors, radicals and
// multiples of π, lines and planes, polynomials in x, y, z, exact integrals of polynomials,
// and numeric line/surface integrals for `check` functions.
import { R, num, terms, power, vec, frac, Frac, gcd, simplifySqrt, numDeriv, numPartial, integrate, integrate2 } from '../../lib/index.js';

/** Wrap LaTeX in inline-math delimiters. */
export const M = (tex) => R`\(${tex}\)`;
const val = (c) => (c instanceof Frac ? c.value : c);
const clean = (x) => (x === 0 ? 0 : x); // never −0

// ───────────── Vectors (plain arrays of numbers) ─────────────

export const vadd = (a, b) => a.map((v, i) => v + b[i]);
export const vsub = (a, b) => a.map((v, i) => v - b[i]);
export const vscale = (a, k) => a.map((v) => clean(v * k));
export const vdot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]].map(clean);
export const vlen2 = (a) => vdot(a, a);
export const vlen = (a) => Math.sqrt(vlen2(a));
export const isZero = (a) => a.every((v) => v === 0);
export const veq = (a, b) => a.every((v, i) => v === b[i]);
/** Are two integer vectors parallel (one a multiple of the other)? Works in 2-D and 3-D. */
export const parallel = (a, b) => (a.length === 3 ? isZero(vcross(a, b)) : a[0] * b[1] - a[1] * b[0] === 0);

/** gcd of the components of an integer vector. */
export const vgcd = (v) => v.reduce((a, b) => gcd(a, b), 0);
/** How many components are 0. */
export const zeros = (v) => v.filter((x) => x === 0).length;
/** All non-zero integer vectors with components in [−m, m] that are orthogonal to v. */
export function orthTo(v, m = 4) {
  const out = [];
  for (let a = -m; a <= m; a++) for (let b = -m; b <= m; b++) for (let c = -m; c <= m; c++) if ((a || b || c) && a * v[0] + b * v[1] + c * v[2] === 0) out.push([a, b, c]);
  return out;
}

/** LaTeX for a vector in angle brackets (components may be numbers, Frac or LaTeX strings). */
export const V = (a) => vec(...a);
/** LaTeX for a point. */
export const Pt = (a) => `(${a.map((c) => (typeof c === 'string' ? c : num(c))).join(', ')})`;
/** LaTeX for a vector written with i, j, k. */
export const ijk = (a) => terms([[a[0], '\\mathbf{i}'], [a[1], '\\mathbf{j}'], [a[2] ?? 0, '\\mathbf{k}']]);

/** A random non-zero integer vector with components in [lo, hi]. */
export function rvec(rng, lo, hi, n = 3) {
  let v;
  do v = Array.from({ length: n }, () => rng.int(lo, hi));
  while (isZero(v));
  return v;
}

/** Integer triples whose length is a whole number: [a, b, c, length]. */
export const QUADS = [
  [1, 2, 2, 3], [0, 3, 4, 5], [2, 4, 4, 6], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [3, 6, 6, 9], [0, 6, 8, 10],
  [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [0, 5, 12, 13], [4, 6, 12, 14], [2, 10, 11, 15], [2, 5, 14, 15],
];

/** A random vector with a whole-number length: { v, len }. Components are shuffled and given random signs. */
export function quadVec(rng, maxLen = 15) {
  const [a, b, c, len] = rng.pick(QUADS.filter((t) => t[3] <= maxLen));
  return { v: rng.shuffle([a, b, c]).map((x) => clean(x * rng.sign())), len };
}

// Pairs of vectors whose angle is a standard one: [u, v, degrees].
const ANGLE_PAIRS = [
  [[1, 1, 0], [1, 0, 1], 60], [[2, 1, 1], [1, 2, -1], 60], [[1, 0, 0], [1, 1, 0], 45], [[2, 1, 0], [1, 3, 0], 45], [[1, 2, 2], [1, 0, 1], 45],
  [[1, 1, 0], [1, 2, 1], 30], [[1, 2, 0], [2, -1, 3], 90], [[1, 1, 1], [1, 1, -2], 90], [[2, -1, 2], [1, 2, 0], 90],
];
/**
 * Two integer vectors at a standard angle: { u, v, deg } with deg one of 30, 45, 60, 90, 120, 135, 150.
 * The base pair is permuted, reflected and scaled, and v may be reversed (which turns θ into 180° − θ).
 */
export function anglePair(rng, scale = true) {
  const [bu, bv, base] = rng.pick(ANGLE_PAIRS);
  const perm = rng.shuffle([0, 1, 2]);
  const signs = [rng.sign(), rng.sign(), rng.sign()];
  const flip = rng.sign();
  const u = vscale(perm.map((i, j) => bu[i] * signs[j]), scale ? rng.int(1, 2) : 1);
  const v = vscale(perm.map((i, j) => bv[i] * signs[j]), (scale ? rng.int(1, 3) : 1) * flip);
  return { u, v, deg: flip < 0 ? 180 - base : base };
}
export const COS_TEX = { 30: '\\frac{\\sqrt{3}}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{1}{2}', 90: '0', 120: '-\\frac{1}{2}', 135: '-\\frac{\\sqrt{2}}{2}', 150: '-\\frac{\\sqrt{3}}{2}' };

/** Divide an integer vector by the gcd of its components and make the first non-zero one positive. */
export function primitive(v) {
  const g = v.reduce((a, b) => gcd(a, b), 0) || 1;
  const w = v.map((x) => x / g);
  return w.find((x) => x !== 0) < 0 ? w.map((x) => clean(-x)) : w;
}

// ───────────── Radicals, π and exact trig values ─────────────

/** LaTeX for k·√n / d in lowest terms: rootOver(3, 8, 4) → "\frac{3\sqrt{2}}{2}". */
export function rootOver(k, n, d = 1) {
  const { coef, rad } = simplifySqrt(n);
  let a = k * coef;
  if (d < 0) [a, d] = [-a, -d];
  const g = gcd(a, d) || 1;
  a /= g;
  d /= g;
  if (a === 0) return '0';
  if (rad === 1) return frac(a, d).tex();
  const top = `${Math.abs(a) === 1 ? '' : Math.abs(a)}\\sqrt{${rad}}`;
  return `${a < 0 ? '-' : ''}${d === 1 ? top : `\\frac{${top}}{${d}}`}`;
}

/** LaTeX for a rational multiple of π (or of another symbol): piTex(frac(3, 2)) → "\frac{3\pi}{2}". */
export function piTex(c, sym = '\\pi') {
  const f = c instanceof Frac ? c : frac(c);
  if (f.n === 0) return '0';
  const top = `${Math.abs(f.n) === 1 ? '' : Math.abs(f.n)}${sym}`;
  return `${f.n < 0 ? '-' : ''}${f.d === 1 ? top : `\\frac{${top}}{${f.d}}`}`;
}

const COS = { 0: [2, 1], 30: [1, 3], 45: [1, 2], 60: [1, 1], 90: [0, 1] };
/** Exact cosine of a multiple of 30° or 45°, as [k, rad] meaning k·√rad / 2. */
export function exactCos(deg) {
  const d = ((deg % 360) + 360) % 360;
  const ref = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
  const [k, rad] = COS[ref];
  return [k === 0 ? 0 : (d > 90 && d < 270 ? -1 : 1) * k, rad];
}
export const exactSin = (deg) => exactCos(deg - 90);
/** LaTeX for an angle in radians given in degrees: angleTex(135) → "\frac{3\pi}{4}". */
export const angleTex = (deg) => piTex(frac(deg, 180));
export const rad = (deg) => (deg * Math.PI) / 180;
/** The negative of a LaTeX term: negTex('3\\sqrt{2}') → "-3\\sqrt{2}", negTex('-x') → "x". */
export const negTex = (t) => (t === '0' ? '0' : t.startsWith('-') ? t.slice(1) : `-${t}`);

// ───────────── Lines, planes and spheres ─────────────

/** "ax + by + cz = d" with tidy signs. */
export const planeTex = (n, d) => `${terms([[n[0], 'x'], [n[1], 'y'], [n[2], 'z']])} = ${num(d)}`;
/** The same plane with whole-number coefficients in lowest terms and a positive leading coefficient: [n, d]. */
export function normPlane(n, d) {
  const w = primitive([...n, d]);
  return [w.slice(0, 3), w[3]];
}
export function samePlane(n1, d1, n2, d2) {
  const a = [...n1, d1];
  const b = [...n2, d2];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (a[i] * b[j] !== a[j] * b[i]) return false;
  return true;
}
/** Parametric equations "x = 1 + 2t, y = -t, z = 4" of the line through p with direction v. */
export const lineTex = (p, v, t = 't') => p.map((c, i) => `${'xyz'[i]} = ${terms([[c, ''], [v[i], t]])}`).join(',\\; ');
export const sameLine = (p1, v1, p2, v2) => parallel(v1, v2) && parallel(vsub(p2, p1), v1);
/** (x − a)² written tidily: sq('x', 3) → "(x - 3)^{2}", sq('x', 0) → "x^{2}". */
export const sq = (x, a) => (a === 0 ? `${x}^{2}` : `(${terms([[1, x], [-a, '']])})^{2}`);

// ───────────── Polynomials in x, y, z ─────────────
// A polynomial is a list of terms [coef, i, j, k] meaning coef·xⁱ·yʲ·zᵏ (missing exponents are 0).

const mulc = (c, n) => (c instanceof Frac ? c.mul(n) : c * n);
/** LaTeX for a polynomial in the given variable names. */
export const mpTex = (p, names = ['x', 'y', 'z']) => terms(p.map(([c, i = 0, j = 0, k = 0]) => [c, power(names[0], i) + power(names[1], j) + power(names[2], k)]));
export const mpEval = (p, x = 0, y = 0, z = 0) => p.reduce((s, [c, i = 0, j = 0, k = 0]) => s + val(c) * x ** i * y ** j * z ** k, 0);
/** Merge like terms (first-appearance order) and drop zero terms. */
export function mpClean(p) {
  const out = [];
  for (const [c, i = 0, j = 0, k = 0] of p) {
    const hit = out.find((t) => t[1] === i && t[2] === j && t[3] === k);
    if (hit) hit[0] = hit[0] instanceof Frac || c instanceof Frac ? Frac.from(hit[0]).add(c) : hit[0] + c;
    else out.push([c, i, j, k]);
  }
  return out.filter((t) => val(t[0]) !== 0);
}
/** Partial derivative with respect to variable v (0 = x, 1 = y, 2 = z). */
export function mpD(p, v) {
  return mpClean(p.map(([c, i = 0, j = 0, k = 0]) => {
    const e = [i, j, k];
    const n = e[v];
    e[v] -= 1;
    return [mulc(c, n), ...e];
  }).filter((t) => t[1 + v] >= 0));
}
export const mpScale = (p, k) => mpClean(p.map(([c, ...e]) => [mulc(c, k), ...e]));
export const mpAdd = (p, q) => mpClean([...p, ...q]);
/** The polynomial as a JavaScript function of (x, y, z). */
export const mpFn = (p) => (x, y, z) => mpEval(p, x, y, z);

// ───────────── Exact integration of polynomials (Frac coefficients, lowest power first) ─────────────

const F0 = frac(0);
export const fp = (...c) => c.map((x) => Frac.from(x));
export const fpAdd = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? F0).add(b[i] ?? F0));
export const fpScale = (a, k) => a.map((c) => c.mul(k));
export const fpSub = (a, b) => fpAdd(a, fpScale(b, -1));
export function fpMul(a, b) {
  const out = new Array(a.length + b.length - 1).fill(F0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] = out[i + j].add(x.mul(y)))));
  return out;
}
export const fpPow = (a, n) => Array.from({ length: n }).reduce((acc) => fpMul(acc, a), fp(1));
export const fpAt = (a, x) => a.reduce((s, c, i) => s.add(c.mul(Frac.from(x).pow(i))), F0);
/** Exact ∫ₐᵇ of a one-variable polynomial. */
export function fpInt(a, lo, hi) {
  const anti = [F0, ...a.map((c, i) => c.div(i + 1))];
  return fpAt(anti, hi).sub(fpAt(anti, lo));
}
/**
 * Exact ∫ₐᵇ ∫_{lo(x)}^{hi(x)} p(x, y) dy dx for a polynomial p in x and y; lo and hi are one-variable
 * polynomials made with fp() (constants for a rectangle).
 */
export function exactDouble(p, a, b, lo, hi) {
  let total = fp(0);
  for (const [c, i = 0, j = 0] of p) {
    const inner = fpScale(fpSub(fpPow(hi, j + 1), fpPow(lo, j + 1)), Frac.from(c).div(j + 1));
    total = fpAdd(total, fpMul(inner, [...new Array(i).fill(F0), frac(1)]));
  }
  return fpInt(total, a, b);
}

// ───────────── Numeric line and surface integrals (for checks) ─────────────

const dr = (r, t) => r(t).map((_, i) => numDeriv((u) => r(u)[i], t));
/** ∫_C F · dr along r(t), a ≤ t ≤ b. F takes coordinates and returns an array. */
export const lineInt = (F, r, a, b, n = 2000) => integrate((t) => vdot(F(...r(t)), dr(r, t)), a, b, n);
/** ∫_C f ds along r(t), a ≤ t ≤ b. */
export const scalarLineInt = (f, r, a, b, n = 2000) => integrate((t) => f(...r(t)) * Math.hypot(...dr(r, t)), a, b, n);
/** r_u × r_v for a parametrised surface r(u, v), by central differences. */
export function surfNormal(r, u, v) {
  const d = (k) => [0, 1, 2].map((i) => numPartial((a, b) => r(a, b)[i], [u, v], k));
  return vcross(d(0), d(1));
}
/** Flux ∬ F · (r_u × r_v) du dv over u0 ≤ u ≤ u1, v0 ≤ v ≤ v1. */
export const fluxInt = (F, r, u0, u1, v0, v1, n = 80) => integrate2((u, v) => vdot(F(...r(u, v)), surfNormal(r, u, v)), u0, u1, v0, v1, n);
/** Scalar surface integral ∬ f |r_u × r_v| du dv. */
export const surfInt = (f, r, u0, u1, v0, v1, n = 80) => integrate2((u, v) => f(...r(u, v)) * vlen(surfNormal(r, u, v)), u0, u1, v0, v1, n);

// ───────────── Pictures ─────────────

/** Axis ranges for a square plot window that contains all the given points with some padding. */
export function squareWindow(points, pad = 1) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 2) / 2 + pad;
  return { x: [cx - half, cx + half], y: [cy - half, cy + half], square: true };
}
