// Helpers shared by the Geometry topics: degree and radical formatting, and coordinates for
// figures drawn with honest proportions.

import { num, round, simplifySqrt, Frac } from '../../lib/index.js';

// ───────────── text ─────────────

/** Degrees inside math mode: deg(65) → "65^\circ". */
export const deg = (v) => `${num(v)}^\\circ`;

/** A degree measure as a finished answer choice: degM(65) → "\(65^\circ\)". */
export const degM = (v) => `\\(${deg(v)}\\)`;

/** A number as plain text for picture labels and alt text (Unicode minus, rounded). */
export const T = (v, places = 2) => String(round(v, places)).replace('-', '−');

/** Degrees as plain text for picture labels: degT(65) → "65°". */
export const degT = (v) => `${T(v)}°`;

/** ax + b as plain text for picture labels: linT(3, -5) → "3x − 5". */
export function linT(a, b, x = 'x') {
  const head = a === 0 ? '' : `${a === 1 ? '' : a === -1 ? '−' : T(a)}${x}`;
  if (b === 0) return head || '0';
  if (!head) return T(b);
  return `${head} ${b < 0 ? '−' : '+'} ${T(Math.abs(b))}`;
}

/** Simplified square root as plain text for pictures: sqrtT(72) → "6√2", sqrtT(49) → "7". */
export function sqrtT(n, k = 1) {
  const { coef, rad } = simplifySqrt(n);
  const c = coef * k;
  if (rad === 1) return T(c);
  return `${c === 1 ? '' : T(c)}√${rad}`;
}

/** A multiple of π inside math mode: piTex(6) → "6\pi", piTex(frac(3, 2)) → "\frac{3\pi}{2}", piTex(1) → "\pi". */
export function piTex(c) {
  const f = c instanceof Frac ? c : null;
  const n = f ? f.n : c;
  const d = f ? f.d : 1;
  if (n === 0) return '0';
  const top = `${Math.abs(n) === 1 && Number.isInteger(n) ? '' : num(Math.abs(n))}\\pi`;
  return `${n < 0 ? '-' : ''}${d === 1 ? top : `\\frac{${top}}{${d}}`}`;
}

/** A multiple of π as plain text for pictures: piT(frac(3, 2)) → "3π/2". */
export function piT(c) {
  const f = c instanceof Frac ? c : null;
  const n = f ? f.n : c;
  const d = f ? f.d : 1;
  if (n === 0) return '0';
  const top = `${Math.abs(n) === 1 && Number.isInteger(n) ? '' : T(Math.abs(n))}π`;
  return `${n < 0 ? '−' : ''}${d === 1 ? top : `${top}/${d}`}`;
}

// ───────────── numbers and coordinates ─────────────

export const rad = (d) => (d * Math.PI) / 180;
export const toDeg = (r) => (r * 180) / Math.PI;
export const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
export const midpoint = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

/** The angle at vertex v between the rays to p and to q, in degrees. */
export function angleAt(p, v, q) {
  const a = [p[0] - v[0], p[1] - v[1]];
  const b = [q[0] - v[0], q[1] - v[1]];
  const c = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
  return toDeg(Math.acos(Math.max(-1, Math.min(1, c))));
}

/** Area of a polygon from its vertices (shoelace formula). */
export function shoelace(points) {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/**
 * Vertices of a triangle with the given side lengths, drawn to scale:
 * P0 = (0, 0), P1 = (c, 0), P2 above the base, with |P0P1| = c, |P1P2| = a, |P2P0| = b.
 * In a polygon picture the side labels are then [c, a, b].
 */
export function triSSS(a, b, c) {
  const x = (b * b + c * c - a * a) / (2 * c);
  const y = Math.sqrt(Math.max(0, b * b - x * x));
  return [[0, 0], [c, 0], [round(x, 4), round(y, 4)]];
}

/** Vertices of a triangle with angle A at P0 = (0, 0), angle B at P1 = (c, 0) and P2 above the base. */
export function triAA(A, B, c = 10) {
  const C = 180 - A - B;
  const b = (c * Math.sin(rad(B))) / Math.sin(rad(C));
  return [[0, 0], [c, 0], [round(b * Math.cos(rad(A)), 4), round(b * Math.sin(rad(A)), 4)]];
}

/**
 * A circle for a polygon picture, as solid `extra` segments (the polygon type has no circle of its
 * own). Lets a figure show a circle together with tangents, chords and triangles drawn to scale.
 */
export function ring(cx, cy, r, n = 60) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const b = (2 * Math.PI * (i + 1)) / n;
    out.push({
      from: [round(cx + r * Math.cos(a), 3), round(cy + r * Math.sin(a), 3)],
      to: [round(cx + r * Math.cos(b), 3), round(cy + r * Math.sin(b), 3)],
      dashed: false,
    });
  }
  return out;
}

/** Direction of the ray from p to q, in degrees counter-clockwise from the positive x-axis. */
export const dirDeg = (p, q) => toDeg(Math.atan2(q[1] - p[1], q[0] - p[0]));

/**
 * An angle mark for a polygon picture, as solid `extra` segments: an arc of radius r (in the picture's own
 * units) around `vertex`, from direction `from` counter-clockwise to direction `to` (degrees), with an
 * optional label just outside its middle. Lets a figure mark angles that are not corners of the polygon
 * itself, such as exterior angles or angles made by a diagonal.
 */
export function arcMark(vertex, from, to, r, label) {
  const sweep = (((to - from) % 360) + 360) % 360;
  const n = 2 * Math.max(2, Math.ceil(sweep / 30)) + 1; // odd, so one piece sits at the middle of the arc
  const at = (d) => [round(vertex[0] + r * Math.cos(rad(d)), 3), round(vertex[1] + r * Math.sin(rad(d)), 3)];
  const out = [];
  for (let i = 0; i < n; i++) {
    const seg = { from: at(from + (sweep * i) / n), to: at(from + (sweep * (i + 1)) / n), dashed: false };
    if (label != null && i === (n - 1) / 2) seg.label = label;
    out.push(seg);
  }
  return out;
}

/** arcMark for the angle at vertex v between the rays towards p and q (the angle less than 180°). */
export function angleMark(p, v, q, r, label) {
  const a = dirDeg(v, p);
  const b = dirDeg(v, q);
  return (((b - a) % 360) + 360) % 360 <= 180 ? arcMark(v, a, b, r, label) : arcMark(v, b, a, r, label);
}

/** A right-angle corner mark at v between the rays towards p and q, as two solid `extra` segments. */
export function rightMark(p, v, q, size) {
  const u = (t) => {
    const d = dist(v, t) || 1;
    return [((t[0] - v[0]) / d) * size, ((t[1] - v[1]) / d) * size];
  };
  const a = u(p);
  const b = u(q);
  const corner = [round(v[0] + a[0] + b[0], 3), round(v[1] + a[1] + b[1], 3)];
  return [
    { from: [round(v[0] + a[0], 3), round(v[1] + a[1], 3)], to: corner, dashed: false },
    { from: corner, to: [round(v[0] + b[0], 3), round(v[1] + b[1], 3)], dashed: false },
  ];
}

/** Tick marks (1, 2 or 3) across the middle of the segment pq, as solid `extra` segments, to show congruent segments. */
export function tickMark(p, q, size, count = 1) {
  const d = dist(p, q) || 1;
  const along = [(q[0] - p[0]) / d, (q[1] - p[1]) / d];
  const across = [-along[1] * size, along[0] * size];
  const out = [];
  for (let k = 0; k < count; k++) {
    const shift = (k - (count - 1) / 2) * size * 0.9;
    const c = [(p[0] + q[0]) / 2 + along[0] * shift, (p[1] + q[1]) / 2 + along[1] * shift];
    out.push({ from: [round(c[0] - across[0], 3), round(c[1] - across[1], 3)], to: [round(c[0] + across[0], 3), round(c[1] + across[1], 3)], dashed: false });
  }
  return out;
}

/**
 * A text label beside the point p in a polygon picture. It is carried by an `extra` segment a few pixels long
 * that lies along the line from p towards q (so q must be joined to p by a line that is already drawn).
 * side: 'right' or 'left' of the direction p → q.
 */
export function labelAt(p, q, text, side = 'right') {
  const t = 0.05;
  return { from: [round(p[0], 3), round(p[1], 3)], to: [round(p[0] + (q[0] - p[0]) * t, 3), round(p[1] + (q[1] - p[1]) * t, 3)], dashed: false, label: text, labelSide: side };
}

/**
 * Two triangles in one polygon picture, drawn to the same scale so that their sizes can be compared honestly.
 * Each is { pts, sides?, vertices?, angles?, right? } with pts counter-clockwise, sides[i] the label of edge
 * i → i + 1, and right a list of vertex indexes. The first is the filled polygon; the second is outlined
 * beside it with `extra` segments (the polygon type draws only one filled shape).
 */
export function twoTriangles(first, second, alt) {
  const xs1 = first.pts.map((p) => p[0]);
  const xs2 = second.pts.map((p) => p[0]);
  const w1 = Math.max(...xs1) - Math.min(...xs1);
  const w2 = Math.max(...xs2) - Math.min(...xs2);
  const dx = Math.max(...xs1) + 0.22 * (w1 + w2) - Math.min(...xs2);
  const dy = Math.min(...first.pts.map((p) => p[1])) - Math.min(...second.pts.map((p) => p[1]));
  const q = second.pts.map(([x, y]) => [round(x + dx, 3), round(y + dy, 3)]);
  const size = 0.05 * (w1 + w2);
  const extra = [];
  for (let i = 0; i < 3; i++) {
    const a = q[i];
    const b = q[(i + 1) % 3];
    const c = q[(i + 2) % 3];
    extra.push({ from: a, to: b, dashed: false, label: second.sides?.[i] || undefined });
    if (second.right?.includes(i)) extra.push(...rightMark(c, a, b, size));
    else if (second.angles?.[i]) extra.push(...angleMark(b, a, c, size * 1.1, second.angles[i]));
    if (second.vertices?.[i]) extra.push(labelAt(a, c, second.vertices[i], 'left'));
  }
  return { type: 'polygon', points: first.pts, sides: first.sides, vertices: first.vertices, angles: first.angles, right: first.right, extra, alt };
}

/** Whole-number right triangles [leg, leg, hypotenuse], smallest first. */
export const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [15, 20, 25], [10, 24, 26], [20, 21, 29], [18, 24, 30], [16, 30, 34], [21, 28, 35], [12, 35, 37], [9, 40, 41]];

export const LENGTH_UNITS = ['cm', 'm', 'in', 'ft'];
