// Helpers shared by the Algebra 1 topics. Pure functions: no DOM, no randomness of their own.
import { R, num, txt, terms, Frac, frac, checkRoots } from '../../lib/index.js';

/** The numeric value of a number or a Frac. */
export const val = (v) => (v instanceof Frac ? v.value : v);

/** A number as plain text for picture labels and alt text: −3, 7/2. */
export const show = (v) => (v instanceof Frac ? v.text() : txt(v));

/** A solution check: every given value really makes lhs(x) = rhs(x). */
export const solves = (lhs, rhs, xs) => () => checkRoots((t) => lhs(t) - rhs(t), [].concat(xs).map(val));

// ───────────── Inequalities and solution sets ─────────────

export const SYM = { lt: '<', le: R`\le`, gt: '>', ge: R`\ge` };
export const FLIP = { lt: 'gt', le: 'ge', gt: 'lt', ge: 'le' };
export const STRICT = { lt: true, le: false, gt: true, ge: false };

/** Is "l op r" true? Values closer than 1e-9 count as equal, so boundaries behave. */
export function holds(op, l, r) {
  if (Math.abs(l - r) < 1e-9) return op === 'le' || op === 'ge';
  return op === 'lt' || op === 'le' ? l < r : l > r;
}

/** Tick range for a number line that shows the given boundary values with room on both sides. */
export function lineWindow(edges) {
  const vs = edges.map(val);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const mid = Math.round((lo + hi) / 2);
  const half = Math.max(5, Math.ceil((hi - lo) / 2) + 2);
  if (half <= 8) return { min: mid - half, max: mid + half, step: 1 };
  const step = half <= 20 ? 5 : half <= 45 ? 10 : half <= 220 ? 50 : 250;
  return { min: Math.floor((mid - half) / step) * step, max: Math.ceil((mid + half) / step) * step, step };
}

// Boundary values that do not sit on a numbered tick mark get their own label.
// (numberLine numbers every tick up to 13 ticks, then every second one, and so on.)
function edgeLabels(edges, opens, w) {
  const every = Math.max(1, Math.ceil(((w.max - w.min) / w.step + 1) / 13));
  return edges
    .map((v, i) => ({ value: val(v), label: show(v), open: opens[i] }))
    .filter((p) => !Number.isInteger((p.value - w.min) / (w.step * every)));
}

const circle = (open) => (open ? 'an open circle' : 'a closed circle');

/** The set x op v, drawn as a ray: ray('ge', -3) is x ≥ −3. */
export function ray(op, v, x = 'x') {
  const right = op === 'gt' || op === 'ge';
  return {
    tex: `${x} ${SYM[op]} ${num(v)}`,
    has: (t) => holds(op, t, val(v)),
    edges: [v],
    visual() {
      const w = lineWindow([v]);
      return {
        type: 'numberLine', ...w,
        ray: { from: val(v), dir: right ? 'right' : 'left', open: STRICT[op] },
        points: edgeLabels([v], [STRICT[op]], w),
        alt: `Number line with ${circle(STRICT[op])} at ${show(v)} and shading to the ${right ? 'right' : 'left'}.`,
      };
    },
  };
}

/** The set lo opLo x opHi hi (an "and"), drawn as a segment: between(-3, 'le', 'lt', 2) is −3 ≤ x < 2. */
export function between(lo, opLo, opHi, hi, x = 'x') {
  return {
    tex: `${num(lo)} ${SYM[opLo]} ${x} ${SYM[opHi]} ${num(hi)}`,
    has: (t) => holds(opLo, val(lo), t) && holds(opHi, t, val(hi)),
    edges: [lo, hi],
    visual() {
      const w = lineWindow([lo, hi]);
      return {
        type: 'numberLine', ...w,
        segment: { from: val(lo), to: val(hi), openFrom: STRICT[opLo], openTo: STRICT[opHi] },
        points: edgeLabels([lo, hi], [STRICT[opLo], STRICT[opHi]], w),
        alt: `Number line shaded between ${show(lo)} (${circle(STRICT[opLo])}) and ${show(hi)} (${circle(STRICT[opHi])}).`,
      };
    },
  };
}

/** The set x opLo lo or x opHi hi (an "or"), drawn as two rays: outside('lt', -3, 'ge', 2) is x < −3 or x ≥ 2. */
export function outside(opLo, lo, opHi, hi, x = 'x') {
  return {
    tex: `${x} ${SYM[opLo]} ${num(lo)} \\text{ or } ${x} ${SYM[opHi]} ${num(hi)}`,
    has: (t) => holds(opLo, t, val(lo)) || holds(opHi, t, val(hi)),
    edges: [lo, hi],
    visual() {
      const w = lineWindow([lo, hi]);
      // numberLine draws one ray and one segment. The left-hand ray is a segment that starts
      // off the picture, so its far end is clipped and only the shading up to `lo` shows.
      return {
        type: 'numberLine', ...w,
        segment: { from: w.min - (w.max - w.min), to: val(lo), openTo: STRICT[opLo] },
        ray: { from: val(hi), dir: 'right', open: STRICT[opHi] },
        points: edgeLabels([lo, hi], [STRICT[opLo], STRICT[opHi]], w),
        alt: `Number line shaded to the left of ${show(lo)} (${circle(STRICT[opLo])}) and to the right of ${show(hi)} (${circle(STRICT[opHi])}).`,
      };
    },
  };
}

/** Sample points on both sides of each boundary value, and the boundaries themselves. */
export const around = (edges) => edges.map(val).flatMap((v) => [v - 3, v - 1, v - 0.25, v, v + 0.25, v + 1, v + 3]);

/** Passes when two true/false tests agree at every sample point. */
export function sameSet(original, solution, points) {
  for (const t of points) if (!!original(t) !== !!solution(t)) return `solution set differs at x = ${t}`;
  return true;
}

/** A check that the solution set `s` (from ray/between/outside) matches the original condition. */
export const agrees = (original, s) => () => sameSet(original, s.has, around(s.edges));

// ───────────── Graphs ─────────────

/**
 * A y-range [lo, hi] that fits the given functions on [x0, x1], padded a little and rounded outward
 * to whole numbers. `include` lists y-values that must stay in view (0 keeps the x-axis visible).
 */
export function fitY(fs, x0, x1, include = [0]) {
  const ys = [...include];
  for (const f of [].concat(fs)) {
    for (let i = 0; i <= 60; i++) {
      const y = f(x0 + ((x1 - x0) * i) / 60);
      if (Number.isFinite(y)) ys.push(y);
    }
  }
  let lo = ys.length ? Math.min(...ys) : -1;
  let hi = ys.length ? Math.max(...ys) : 1;
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.1;
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

/** A point as plain text for picture labels: (−2, 5). */
export const pointText = (x, y) => `(${show(x)}, ${show(y)})`;

// ───────────── Lines ─────────────

/** A number or Frac as a Frac. */
export const F = (v) => (v instanceof Frac ? v : frac(v));

/** y = mx + b as LaTeX. m and b may be numbers or Frac: lineEq(frac(2, 3), -1) → "y = \frac{2}{3}x - 1". */
export const lineEq = (m, b, x = 'x', y = 'y') => `${y} = ${terms([[m, x], [b, '']])}`;

/** A coefficient times a bracket, hiding 1 and −1: timesTex(-1, 'x + 2') → "-(x + 2)". */
export function timesTex(m, inner) {
  const v = val(m);
  return v === 1 ? `(${inner})` : v === -1 ? `-(${inner})` : `${num(m)}(${inner})`;
}

/** mx + b as plain text for picture labels: lineText(2, -1) → "2x − 1", lineText(-1, 3) → "−x + 3". */
export function lineText(m, b) {
  const [mv, bv] = [val(m), val(b)];
  const mx = mv === 0 ? '' : mv === 1 ? 'x' : mv === -1 ? '−x' : `${show(m)}x`;
  if (!mx) return show(b);
  if (bv === 0) return mx;
  return `${mx} ${bv < 0 ? '−' : '+'} ${show(b instanceof Frac ? b.abs() : Math.abs(b))}`;
}
