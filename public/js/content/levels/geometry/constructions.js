import { R, q, num, linear, terms, paren, frac, point, sqrtTex, gcd, person } from '../../lib/index.js';
import { deg, degM, rad, dist, midpoint, angleAt, triAA, linT } from './_shared.js';

// ───────────── plane geometry for the drawings ─────────────

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const unit = (a) => mul(a, 1 / Math.hypot(a[0], a[1]));
const polar = (c, r, t) => [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
const wrap = (t) => Math.atan2(Math.sin(t), Math.cos(t));
const rot = (p, t) => [p[0] * Math.cos(t) - p[1] * Math.sin(t), p[0] * Math.sin(t) + p[1] * Math.cos(t)];
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
const r3 = (v) => Math.round(v * 1000) / 1000;
/** '=' for a value that came out whole (or to 2 places exactly), '\approx' otherwise. */
const ap = (v) => (Math.abs(v * 100 - Math.round(v * 100)) < 1e-9 ? '=' : '\\approx');

/** The two points where circle (c1, r1) meets circle (c2, r2): [left of c1 → c2, right of it]. */
function meet(c1, r1, c2, r2) {
  const d = dist(c1, c2);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const u = unit(sub(c2, c1));
  const base = add(c1, mul(u, a));
  const n = [-u[1], u[0]];
  return [add(base, mul(n, h)), add(base, mul(n, -h))];
}
/** Where line p1p2 meets line p3p4. */
function lineX(p1, p2, p3, p4) {
  const d1 = sub(p2, p1);
  const d2 = sub(p4, p3);
  return add(p1, mul(d1, cross(sub(p3, p1), d2) / cross(d1, d2)));
}
/** Where line pq meets circle (c, r), nearer p first. */
function lineCircle(p, q, c, r) {
  const d = unit(sub(q, p));
  const f = sub(p, c);
  const b = dot(f, d);
  const s = Math.sqrt(Math.max(0, b * b - (dot(f, f) - r * r)));
  return [add(p, mul(d, -b - s)), add(p, mul(d, -b + s))].sort((u, v) => dist(u, q) - dist(v, q)).reverse();
}
const foot = (p, a, b) => { const u = unit(sub(b, a)); return add(a, mul(u, dot(sub(p, a), u))); };
const lineDist = (p, a, b) => Math.abs(cross(sub(b, a), sub(p, a))) / dist(a, b);

// ───────────── the plain drawing sheet ─────────────

/** A construction drawing: compass arcs (green), the given figure (blue, solid) and construction lines (orange, dashed). */
function sheet() {
  const f = { arcs: [], lines: [], pts: [] };
  f.arc = (c, r, on, color = 'c') => (f.arcs.push({ c, r, on, color }), f);
  f.ring = (c, r, on = [], color = 'c') => (f.arcs.push({ c, r, on, color, full: true }), f);
  f.seg = (from, to, label) => (f.lines.push({ from, to, color: 'a', label }), f);
  f.dash = (from, to, label) => (f.lines.push({ from, to, dashed: true, color: 'b', label }), f);
  /** A dashed line through collinear points, a little past the outermost two. */
  f.through = (pts, k = 0.15) => {
    const u = unit(sub(pts[1], pts[0]));
    const ts = pts.map((p) => dot(sub(p, pts[0]), u));
    const lo = Math.min(...ts);
    const hi = Math.max(...ts);
    const pad = (hi - lo) * k;
    return f.dash(add(pts[0], mul(u, lo - pad)), add(pts[0], mul(u, hi + pad)));
  };
  f.pt = (p, label) => (f.pts.push({ p, label }), f);
  return f;
}

/** The angles an arc is drawn between: just past the points it must pass through. */
function span(a) {
  if (a.full) return [0, 2 * Math.PI];
  const t0 = ang(a.c, a.on[0]);
  const ds = a.on.map((p) => wrap(ang(a.c, p) - t0));
  const pad = a.on.length === 1 ? 0.32 : 0.16;
  return [t0 + Math.min(...ds) - pad, t0 + Math.max(...ds) + pad];
}

/** Every arc really passes through each point it is said to pass through. */
function arcsOk(f) {
  for (const a of f.arcs) {
    for (const p of a.on) {
      if (!near(dist(a.c, p), a.r, 1e-6 * (1 + a.r))) return 'an arc misses a point it should pass through';
    }
  }
  return true;
}

/** The plot picture. The drawing area is 310 by 320 pixels, so the window keeps that ratio and circles stay round. */
function draw(f, alt) {
  const xs = [];
  const ys = [];
  const take = ([x, y]) => (xs.push(x), ys.push(y));
  f.lines.forEach((l) => (take(l.from), take(l.to)));
  f.pts.forEach((p) => take(p.p));
  const param = f.arcs.map((a) => {
    const [t0, t1] = span(a);
    for (let k = 0; k <= 24; k++) take(polar(a.c, a.r, t0 + ((t1 - t0) * k) / 24));
    const [cx, cy] = a.c;
    const r = a.r;
    return { x: (t) => cx + r * Math.cos(t), y: (t) => cy + r * Math.sin(t), t: [t0, t1], color: a.color };
  });
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = 0.07 * Math.max(x1 - x0, y1 - y0);
  let w = x1 - x0 + 2 * pad;
  let h = y1 - y0 + 2 * pad;
  if (w / h < 31 / 32) w = (h * 31) / 32;
  else h = (w * 32) / 31;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return {
    type: 'plot', grid: false, axes: false, square: true, alt,
    x: [r3(cx - w / 2), r3(cx + w / 2)], y: [r3(cy - h / 2), r3(cy + h / 2)],
    param,
    segments: f.lines.map((l) => ({ from: l.from.map(r3), to: l.to.map(r3), dashed: !!l.dashed, color: l.color, label: l.label })),
    points: f.pts.map((p) => ({ x: r3(p.p[0]), y: r3(p.p[1]), label: p.label })),
  };
}

/** A fixed stand-in for rng, for figures in the lesson and the models. */
const STILL = { int: (lo, hi) => Math.round((lo + hi) / 2), pick: (l) => l[0], bool: () => true };

function acuteTri(rng) {
  for (;;) {
    const a = rng.int(46, 78);
    const b = rng.int(46, 78);
    if (180 - a - b < 44 || 180 - a - b > 84) continue;
    const t = rad(rng.int(-20, 20));
    return triAA(a, b, 10).map((p) => rot(p, t));
  }
}

// ───────────── the constructions ─────────────
// Each builder returns { f, ok, alt, ... }: the drawing, a check of what it constructs, and a description.

const BUILD = {
  copySeg(rng, o = {}) {
    const L = o.L ?? rng.int(5, 9);
    const A = [0, 0];
    const B = polar(A, L, rad(rng.int(-30, 30)));
    const C = [rng.int(-3, 1), -rng.int(5, 7)];
    const t2 = rad(rng.int(-15, 15));
    const D = polar(C, L, t2);
    const f = sheet().seg(A, B).dash(C, polar(C, L + 3, t2)).arc(A, L, [B]).arc(C, L, [D]).pt(A, 'A').pt(B, 'B').pt(C, 'C').pt(D, 'D');
    return { f, ok: () => near(dist(C, D), dist(A, B)) || 'CD is not AB', alt: 'Segment AB is drawn. Below it a ray starts at point C. A compass arc centred at A passes through B, and an arc of the same radius centred at C crosses the ray at D.' };
  },
  copyAngle(rng, o = {}) {
    const a = o.a ?? rng.int(35, 110);
    const t = rad(rng.int(-15, 20));
    const r = 3.5;
    const A = [0, 0];
    const B = polar(A, r, t), C = polar(A, r, t + rad(a));
    const D = [rng.int(12, 13), rng.int(-4, -2)];
    const t2 = rad(rng.int(-10, 10));
    const E = polar(D, r, t2);
    const bc = dist(B, C);
    const F = meet(D, r, E, bc)[0];
    const f = sheet().seg(A, polar(A, 6.5, t)).seg(A, polar(A, 6.5, t + rad(a))).dash(D, polar(D, 6.5, t2)).dash(D, polar(D, 6.5, ang(D, F)))
      .arc(A, r, [B, C]).arc(B, bc, [C]).arc(D, r, [E, F]).arc(E, bc, [F])
      .pt(A, 'A').pt(B, 'B').pt(C, 'C').pt(D, 'D').pt(E, 'E').pt(F, 'F');
    return { f, a, ok: () => near(angleAt(E, D, F), a) || 'the copied angle is wrong', alt: 'An angle with vertex A. An arc centred at A crosses its sides at B and C, and an arc centred at B passes through C. To the right, a ray starts at D. An arc with the same radius as the first, centred at D, crosses it at E, and an arc centred at E with radius BC crosses that arc at F. A dashed ray runs from D through F.' };
  },
  bisectSeg(rng, o = {}) {
    const L = o.L ?? rng.int(6, 10);
    const r = o.r ?? L * rng.pick([0.65, 0.7, 0.75, 0.8]);
    const A = [0, 0];
    const B = polar(A, L, rad(o.tilt ?? rng.int(-35, 35)));
    const [P, Q] = meet(A, r, B, r);
    const M = lineX(P, Q, A, B);
    const f = sheet().seg(A, B).arc(A, r, [P, Q]).arc(B, r, [P, Q]).through([P, Q]).pt(A, 'A').pt(B, 'B').pt(P, 'P').pt(Q, 'Q').pt(M, 'M');
    return {
      f, L, r, A, B, P, Q, M,
      ok: () => (near(dot(sub(P, Q), sub(B, A)), 0) && near(dist(A, M), dist(B, M)) ? true : 'PQ is not the perpendicular bisector'),
      alt: 'Segment AB. Arcs of the same radius, one centred at A and one at B, cross above and below AB at P and Q. A dashed line through P and Q crosses AB at M.',
    };
  },
  bisectAngle(rng, o = {}) {
    const a = o.a ?? rng.int(40, 140);
    const t = rad(rng.int(-30, 20));
    const V = [0, 0];
    const r = 4;
    const P = polar(V, r, t), Q = polar(V, r, t + rad(a));
    const s = Math.max(0.8 * dist(P, Q), 3);
    const R0 = meet(P, s, Q, s).sort((u, v) => dist(v, V) - dist(u, V))[0];
    const f = sheet().seg(V, polar(V, 9, t)).seg(V, polar(V, 9, t + rad(a))).dash(V, polar(V, 9, ang(V, R0)))
      .arc(V, r, [P, Q]).arc(P, s, [R0]).arc(Q, s, [R0]).pt(V, 'V').pt(P, 'P').pt(Q, 'Q').pt(R0, 'R');
    return { f, ok: () => (near(angleAt(P, V, R0), a / 2) && near(angleAt(Q, V, R0), a / 2) ? true : 'VR does not bisect the angle'), alt: 'An angle with vertex V. An arc centred at V crosses its sides at P and Q. Arcs of equal radius centred at P and at Q cross inside the angle at R. A dashed ray runs from V through R.' };
  },
  perpOn(rng) {
    const t = rad(rng.int(-25, 25));
    const u = [Math.cos(t), Math.sin(t)];
    const P = [0, 0];
    const r = rng.pick([3, 3.5, 4]);
    const A = sub(P, mul(u, r)), B = add(P, mul(u, r));
    const s = r * rng.pick([1.4, 1.6, 1.8]);
    const Q = meet(A, s, B, s)[0];
    const f = sheet().seg(sub(P, mul(u, 6)), add(P, mul(u, 20)), 'ℓ').arc(P, r, [A]).arc(P, r, [B]).arc(A, s, [Q]).arc(B, s, [Q]).through([P, Q], 0.3)
      .pt(P, 'P').pt(A, 'A').pt(B, 'B').pt(Q, 'Q');
    return { f, ok: () => (near(dot(sub(Q, P), u), 0) ? true : 'PQ is not perpendicular to the line'), alt: 'Line ℓ with point P on it. Arcs centred at P cross ℓ on either side of P at A and B. Two wider arcs of equal radius, centred at A and at B, cross at Q above the line. A dashed line runs through P and Q.' };
  },
  perpOff(rng) {
    const t = rad(rng.int(-25, 25));
    const u = [Math.cos(t), Math.sin(t)];
    const n = [-u[1], u[0]];
    const h = rng.pick([3, 3.5, 4]);
    const O = [0, 0];
    const P = add(O, mul(n, h));
    const r = h * rng.pick([1.3, 1.45, 1.6]);
    const [A, B] = lineCircle(add(O, mul(u, -9)), add(O, mul(u, 9)), P, r);
    const s = dist(A, B) * rng.pick([0.7, 0.8, 0.9]);
    const Q = meet(A, s, B, s)[1];
    const f = sheet().seg(add(O, mul(u, -7)), add(O, mul(u, 15)), 'ℓ').arc(P, r, [A, B]).arc(A, s, [Q]).arc(B, s, [Q]).through([P, Q])
      .pt(P, 'P').pt(A, 'A').pt(B, 'B').pt(Q, 'Q');
    return { f, ok: () => (near(dot(sub(Q, P), u), 0) ? true : 'PQ is not perpendicular to the line'), alt: 'Line ℓ with point P above it. An arc centred at P crosses ℓ at A and B. Arcs of equal radius centred at A and at B cross at Q, below the line. A dashed line runs through P and Q.' };
  },
  parallel(rng) {
    const t = rad(rng.int(-15, 15));
    const u = [Math.cos(t), Math.sin(t)];
    const beta = rad(rng.int(50, 75));
    const A = [0, 0];
    const P = polar(A, rng.int(6, 8), t + beta);
    const r = 3;
    const B = add(A, mul(u, r)), C = polar(A, r, t + beta), D = polar(P, r, t + beta);
    const bc = dist(B, C);
    const E = meet(P, r, D, bc).sort((x, y) => dist(x, add(P, mul(u, r))) - dist(y, add(P, mul(u, r))))[0];
    const f = sheet().seg(add(A, mul(u, -4)), add(A, mul(u, 14)), 'ℓ').through([A, P, polar(P, r + 1.5, t + beta)], 0.05).through([P, E], 1.4)
      .arc(A, r, [B, C]).arc(B, bc, [C]).arc(P, r, [D, E]).arc(D, bc, [E])
      .pt(A, 'A').pt(B, 'B').pt(C, 'C').pt(P, 'P').pt(D, 'D').pt(E, 'E');
    return { f, ok: () => (near(cross(sub(E, P), u), 0) ? true : 'PE is not parallel to the line'), alt: 'Line ℓ and a point P above it. A dashed line through P crosses ℓ at A. An arc centred at A crosses ℓ at B and line AP at C. An arc of the same radius centred at P crosses line AP above P at D, and an arc centred at D with radius BC crosses it at E. A dashed line runs through P and E.' };
  },
  inscribed(rng, o = {}, join = 'hex') {
    const r = o.r ?? rng.pick([4, 4.5, 5]);
    const O = [0, 0];
    const V = [polar(O, r, rad(rng.int(0, 59)))];
    for (let k = 1; k < 6; k++) V.push(meet(O, r, V[k - 1], r)[0]); // step the compass, set to the radius, round the circle
    const f = sheet().ring(O, r, V, 'a');
    for (let k = 0; k < 6; k++) f.arc(V[k], r, [V[(k + 5) % 6], O, V[(k + 1) % 6]]);
    const order = join === 'hex' ? [0, 1, 2, 3, 4, 5] : [0, 2, 4];
    order.forEach((k, i) => f.dash(V[k], V[order[(i + 1) % order.length]]));
    f.pt(O, 'O');
    V.forEach((p, k) => f.pt(p, 'ABCDEF'[k]));
    const side = join === 'hex' ? r : r * Math.sqrt(3);
    return {
      f, V, r,
      ok: () => (order.every((k, i) => near(dist(V[k], V[order[(i + 1) % order.length]]), side, 1e-6 * r)) ? true : 'the polygon sides are not equal'),
      alt: `A circle with centre O. With the compass set to the radius, arcs centred at points on the circle mark six points A, B, C, D, E and F round it, each one radius from the next. Dashed segments join ${join === 'hex' ? 'A, B, C, D, E and F in order' : 'A, C and E'}.`,
    };
  },
  square(rng, o = {}) {
    const r = o.r ?? rng.pick([4, 4.5, 5]);
    const O = [0, 0];
    const t0 = rad(rng.int(-40, 40));
    const A = polar(O, r, t0), C = polar(O, r, t0 + Math.PI);
    const s = 1.8 * r;
    const [P, Q] = meet(A, s, C, s);
    const [B, D] = lineCircle(P, Q, O, r).sort((x, y) => dist(x, P) - dist(y, P));
    const f = sheet().ring(O, r, [A, B, C, D], 'a').through([A, C], 0.05).arc(A, s, [P]).arc(A, s, [Q]).arc(C, s, [P]).arc(C, s, [Q]).through([P, Q], 0.05);
    [A, D, C, B].forEach((p, i, l) => f.dash(p, l[(i + 1) % 4]));
    f.pt(O, 'O').pt(A, 'A').pt(B, 'B').pt(C, 'C').pt(D, 'D').pt(P, 'P').pt(Q, 'Q');
    return { f, r, A, B, ok: () => (near(dist(A, B), dist(B, C)) && near(dot(sub(A, B), sub(C, B)), 0) && near(dist(A, B), r * Math.SQRT2) ? true : 'ABCD is not a square'), alt: 'A circle with centre O and a dashed diameter AC. Arcs of equal radius centred at A and at C cross at P and Q, outside the circle. The dashed line PQ passes through O and meets the circle at B and D. Dashed segments join A, B, C and D.' };
  },
  circum(rng, o = {}) {
    const [A, B, C] = o.tri ?? acuteTri(rng);
    const bis = (X, Y) => { const s = 0.68 * dist(X, Y); const [P, Q] = meet(X, s, Y, s); return { X, Y, s, P, Q }; };
    const u = bis(A, B), v = bis(B, C);
    const O = lineX(u.P, u.Q, v.P, v.Q);
    const R0 = dist(O, A);
    const f = sheet().seg(A, B).seg(B, C).seg(C, A);
    for (const b of [u, v]) f.arc(b.X, b.s, [b.P, b.Q]).arc(b.Y, b.s, [b.P, b.Q]).through([b.P, b.Q, O], 0.05);
    f.ring(O, R0, [A, B, C]).pt(A, 'A').pt(B, 'B').pt(C, 'C').pt(O, 'O');
    return { f, A, B, C, O, ok: () => (near(dist(O, B), R0) && near(dist(O, C), R0) ? true : 'O is not equidistant from the vertices'), alt: 'Triangle ABC. Pairs of equal arcs from the ends of side AB and of side BC give the perpendicular bisectors of those sides, drawn dashed. They cross at O, and a circle centred at O passes through A, B and C.' };
  },
  incentre(rng, o = {}) {
    const [A, B, C] = o.tri ?? (() => { const a = rng.int(40, 85); const b = rng.int(40, 85); return triAA(a, b, 10).map((p) => rot(p, rad(rng.int(-15, 15)))); })();
    const bisAt = (V, X, Y) => {
      const r1 = 0.3 * Math.min(dist(V, X), dist(V, Y));
      const P = add(V, mul(unit(sub(X, V)), r1)), Q = add(V, mul(unit(sub(Y, V)), r1));
      const s = Math.max(0.8 * dist(P, Q), 0.75 * r1);
      const R0 = meet(P, s, Q, s).sort((m, n) => dist(n, V) - dist(m, V))[0];
      return { V, P, Q, r1, s, R0 };
    };
    const ba = bisAt(A, B, C), bb = bisAt(B, C, A);
    const I = lineX(A, ba.R0, B, bb.R0);
    const F = foot(I, A, B), G = foot(I, B, C), H = foot(I, C, A);
    const rin = dist(I, F);
    const f = sheet().seg(A, B).seg(B, C).seg(C, A);
    for (const b of [ba, bb]) f.arc(b.V, b.r1, [b.P, b.Q]).arc(b.P, b.s, [b.R0]).arc(b.Q, b.s, [b.R0]).through([b.V, b.R0, I], 0.12);
    f.dash(I, F).ring(I, rin, [F, G, H]).pt(A, 'A').pt(B, 'B').pt(C, 'C').pt(I, 'I').pt(F, 'F');
    return { f, I, F, G, H, rin, ok: () => (near(lineDist(I, B, C), rin) && near(lineDist(I, C, A), rin) ? true : 'I is not equidistant from the sides'), alt: 'Triangle ABC. Arcs at A and at B construct the bisectors of angles A and B, drawn dashed. They cross at I. A dashed perpendicular from I meets side AB at F, and a circle centred at I through F touches all three sides.' };
  },
  tangent(rng, o = {}) {
    const r = o.r ?? rng.pick([3, 3.5, 4]);
    const d = o.d ?? r * rng.pick([2.2, 2.5, 2.8]);
    const O = [0, 0];
    const P = polar(O, d, rad(o.dir ?? rng.int(-30, 30)));
    const s = 0.7 * d;
    const [U, W] = meet(O, s, P, s);
    const M = lineX(U, W, O, P);
    const [T, S] = meet(O, r, M, dist(M, O));
    const f = sheet().ring(O, r, [T, S], 'a').dash(O, P).arc(O, s, [U, W]).arc(P, s, [U, W]).through([U, W], 0.05).ring(M, dist(M, O), [O, P, T, S])
      .through([P, T], 0.25).through([P, S], 0.25).pt(O, 'O').pt(P, 'P').pt(M, 'M').pt(T, 'T').pt(S, 'S');
    return { f, O, P, T, S, r, d, ok: () => (near(dot(sub(T, O), sub(T, P)), 0) && near(dot(sub(S, O), sub(S, P)), 0) ? true : 'PT is not tangent'), alt: 'A circle with centre O and a point P outside it, joined by segment OP. Equal arcs from O and P give the perpendicular bisector of OP, which crosses it at its midpoint M. A circle centred at M through O and P crosses the first circle at T and S. Dashed lines run from P through T and through S.' };
  },
};
BUILD.hex = (rng, o) => BUILD.inscribed(rng, o, 'hex');
BUILD.tri = (rng, o) => BUILD.inscribed(rng, o, 'tri');

/** A construction drawing as a picture, with a check that its arcs pass through their points and that it constructs what it should. */
function figure(kind, rng, o) {
  const b = BUILD[kind](rng, o);
  return { ...b, visual: draw(b.f, b.alt), check: () => { const a = arcsOk(b.f); return a === true ? b.ok() : a; } };
}

// ───────────── the facts that justify the constructions ─────────────

const FACT = {
  radii: 'Every point on a compass arc is the same distance from its centre, so the same opening gives the same length.',
  sss: 'The arcs make three pairs of equal lengths, so two triangles are congruent by SSS and their matching angles are equal.',
  bis: 'A point that is the same distance from both ends of a segment lies on its perpendicular bisector.',
  semi: 'An angle inscribed in a semicircle is a right angle, and a line perpendicular to a radius where it meets the circle is a tangent.',
  corr: 'The copied angle makes congruent corresponding angles, and congruent corresponding angles make the lines parallel.',
  hex60: 'Each step makes a triangle with all three sides equal to the radius, so it is equilateral with a 60° angle at the centre, and six of those fill 360°.',
  arcs: 'Every other point splits the circle into three equal 120° arcs, and equal arcs have equal chords.',
  diag: 'The diagonals are two diameters at right angles, so they are congruent, bisect each other and are perpendicular.',
  circ: 'The centre is on the perpendicular bisector of each side, so it is the same distance from all three vertices.',
  inc: 'The centre is on the bisector of each angle, so it is the same distance from all three sides.',
  aaa: 'Two triangles have three pairs of congruent angles, so they are congruent by AAA.',
  ssa: 'Two sides and an angle that is not between them match, so two triangles are congruent by SSA.',
  vert: 'Vertical angles are congruent.',
  mids: 'A segment joining the midpoints of two sides of a triangle is parallel to the third side.',
};
const FALSE_WHY = { aaa: 'AAA fixes the shape but not the size, so it never proves congruence.', ssa: 'SSA can fit two different triangles, so it never proves congruence.' };

const K = {
  copySeg: {
    slipWhy: 'The opening must be copied from AB; any other width gives a different length.',
    name: 'Copying a segment', rule: 0, order: false,
    look: 'an arc through B centred at A, and an arc of the same radius crossing a separate ray',
    steps: ['Draw a ray from C.', 'Put the compass point on A and open it to B.', 'Keep the opening, put the point on C and draw an arc across the ray.', R`Label the crossing \(D\). Then \(CD = AB\).`],
    slips: ['Put the compass point on C and open it to any width.', 'Measure AB with a ruler and mark D that far from C.', 'Put the compass point on B and draw an arc through C.'],
    why: [R`Why is \(CD = AB\)?`, 'radii', ['bis', 'mids', 'vert']],
  },
  copyAngle: {
    slipWhy: 'With the opening AB instead of BC, triangle DEF has three equal sides, so the copied angle always comes out as 60°.',
    name: 'Copying an angle', rule: 1, order: true,
    look: 'an angle, an arc across it, and the same two arcs repeated at a second vertex',
    steps: [R`With the compass point on \(A\), draw an arc crossing both sides of \(\angle A\) at \(B\) and \(C\).`, R`Draw a ray from \(D\). With the same opening and the point on \(D\), draw an arc crossing it at \(E\).`, R`Set the compass to the distance \(BC\). With the point on \(E\), draw an arc crossing the last arc at \(F\).`, R`Draw ray \(DF\). Then \(\angle EDF \cong \angle BAC\).`],
    slips: [R`Set the compass to the distance \(AB\). With the point on \(E\), draw an arc crossing the last arc at \(F\).`, R`With the point on \(E\) and any opening, draw an arc crossing the last arc at \(F\).`, R`Draw a ray from \(D\). With a wider opening and the point on \(D\), draw an arc crossing it at \(E\).`],
    why: [R`Why is \(\angle EDF \cong \angle BAC\)?`, 'sss', ['aaa', 'ssa', 'vert']],
  },
  bisectSeg: {
    slipWhy: 'With less than half of AB, the arcs from A and from B never meet.',
    name: 'The perpendicular bisector of a segment', rule: 2, order: true,
    look: 'equal arcs from both ends of a segment crossing above and below it',
    steps: [R`Open the compass to more than half of \(AB\).`, R`With the point on \(A\), draw arcs above and below \(\overline{AB}\).`, R`With the same opening and the point on \(B\), draw arcs crossing the first two at \(P\) and \(Q\).`, R`Draw line \(PQ\). It meets \(\overline{AB}\) at its midpoint \(M\), at a right angle.`],
    slips: [R`Open the compass to less than half of \(AB\).`, R`With a different opening and the point on \(B\), draw arcs crossing the first two at \(P\) and \(Q\).`, R`Draw segments \(AP\) and \(BQ\).`],
    why: [R`Why does line \(PQ\) cross \(\overline{AB}\) at its midpoint, at a right angle?`, 'bis', ['inc', 'mids', 'aaa']],
  },
  bisectAngle: {
    slipWhy: 'R must be the same distance from P and from Q, so both arcs need the same opening.',
    name: 'Bisecting an angle', rule: 1, order: true,
    look: 'one arc across both sides of an angle and two equal arcs crossing inside it',
    steps: [R`With the compass point on \(V\), draw an arc crossing both sides of the angle at \(P\) and \(Q\).`, R`With the point on \(P\), draw an arc inside the angle.`, R`With the same opening and the point on \(Q\), draw an arc crossing the last one at \(R\).`, R`Draw ray \(VR\). It bisects the angle.`],
    slips: [R`With a different opening and the point on \(Q\), draw an arc crossing the last one at \(R\).`, R`Draw ray \(PR\). It bisects the angle.`, R`With the point on \(V\), draw a second arc inside the angle.`],
    why: [R`Why does ray \(VR\) bisect \(\angle PVQ\)?`, 'sss', ['aaa', 'ssa', 'vert']],
  },
  perpOn: {
    slipWhy: 'Arcs narrower than PA, from A and from B, never meet.',
    name: 'A perpendicular through a point on a line', rule: 2, order: true,
    look: 'a point on a line, arcs from it on both sides, and two arcs crossing on one side of the line',
    steps: [R`With the compass point on \(P\), draw arcs crossing line \(\ell\) on both sides of \(P\), at \(A\) and \(B\).`, R`Open the compass wider than \(PA\).`, R`With the point on \(A\) and then on \(B\), draw arcs that cross at \(Q\).`, R`Draw line \(PQ\). It is perpendicular to \(\ell\) at \(P\).`],
    slips: [R`Open the compass narrower than \(PA\).`, R`With the point on \(A\), then with a new opening on \(B\), draw arcs that cross at \(Q\).`, R`Draw line \(AQ\). It is perpendicular to \(\ell\) at \(P\).`],
    why: [R`Why is line \(PQ\) perpendicular to \(\ell\)?`, 'bis', ['inc', 'corr', 'aaa']],
  },
  perpOff: {
    slipWhy: 'An arc that does not reach the line gives no points A and B to work from.',
    name: 'A perpendicular through a point not on a line', rule: 2, order: true,
    look: 'a point off a line, one arc from it cutting the line twice, and two arcs crossing on the far side',
    steps: [R`With the compass point on \(P\), draw an arc crossing line \(\ell\) at \(A\) and \(B\).`, R`Open the compass to more than half of \(AB\).`, R`With the point on \(A\) and then on \(B\), draw arcs that cross at \(Q\), on the other side of \(\ell\).`, R`Draw line \(PQ\). It is perpendicular to \(\ell\).`],
    slips: [R`With the compass point on \(P\), draw an arc that stops short of line \(\ell\).`, R`Open the compass to less than half of \(AB\).`, R`Draw line \(AQ\). It is perpendicular to \(\ell\).`],
    why: [R`Why is line \(PQ\) perpendicular to \(\ell\)?`, 'bis', ['semi', 'corr', 'ssa']],
  },
  parallel: {
    slipWhy: 'The opening must be BC, so that the angle copied at P matches the angle at A.',
    name: 'A parallel through a point not on a line', rule: 2, order: true,
    look: 'a line through the point crossing the first line, with the angle there copied at the point',
    steps: [R`Draw a line through \(P\) that crosses \(\ell\) at \(A\).`, R`With the point on \(A\), draw an arc crossing \(\ell\) at \(B\) and line \(AP\) at \(C\). With the same opening and the point on \(P\), draw an arc crossing line \(AP\) at \(D\).`, R`Set the compass to the distance \(BC\). With the point on \(D\), draw an arc crossing the arc centred at \(P\) at \(E\).`, R`Draw line \(PE\). It is parallel to \(\ell\).`],
    slips: [R`Set the compass to the distance \(AP\). With the point on \(D\), draw an arc crossing the arc centred at \(P\) at \(E\).`, R`Draw line \(PB\). It is parallel to \(\ell\).`, R`With the point on \(A\), draw an arc crossing \(\ell\) at \(B\). With a smaller opening and the point on \(P\), draw an arc crossing line \(AP\) at \(D\).`],
    why: [R`Why is line \(PE\) parallel to \(\ell\)?`, 'corr', ['bis', 'vert', 'mids']],
  },
  hex: {
    slipWhy: 'Set to the diameter, the compass only reaches the point opposite A. Each step must be one radius.',
    name: 'A regular hexagon inscribed in a circle', rule: 3, order: true,
    look: 'six points stepped round the circle with all of them joined in order',
    steps: [R`Draw a circle with centre \(O\) and mark a point \(A\) on it.`, R`Keep the compass open to the radius \(OA\).`, R`With the point on \(A\), mark \(B\) on the circle; move the point to \(B\) and mark \(C\), and so on round to \(F\).`, R`Join \(A, B, C, D, E\) and \(F\) in order.`],
    slips: [R`Open the compass to the diameter of the circle.`, R`Join every other point: \(A\), \(C\) and \(E\).`, R`With the point on \(O\), mark \(B\) on the circle; move the point to \(B\) and mark \(C\), and so on round to \(F\).`],
    why: ['Why does stepping the compass round the circle, still set to the radius, give exactly six points?', 'hex60', ['bis', 'corr', 'aaa']],
  },
  tri: {
    slipWhy: 'Joining all six points makes the hexagon. The triangle uses every other point.',
    name: 'An equilateral triangle inscribed in a circle', rule: 3, order: true,
    look: 'six points stepped round the circle with every other one joined',
    steps: [R`Draw a circle with centre \(O\) and mark a point \(A\) on it.`, R`Keep the compass open to the radius \(OA\).`, R`With the point on \(A\), mark \(B\) on the circle; move the point to \(B\) and mark \(C\), and so on round to \(F\).`, R`Join every other point: \(A\), \(C\) and \(E\).`],
    slips: [R`Join \(A, B, C, D, E\) and \(F\) in order.`, R`Open the compass to the diameter of the circle.`, R`Join \(A\), \(B\) and \(C\).`],
    why: [R`Why is \(\triangle ACE\) equilateral?`, 'arcs', ['bis', 'ssa', 'mids']],
  },
  square: {
    slipWhy: 'A second diameter at any angle makes a rectangle. It must be perpendicular to AC to give a square.',
    name: 'A square inscribed in a circle', rule: 3, order: true,
    look: 'a diameter and its perpendicular bisector, with the four ends joined',
    steps: [R`Draw a diameter \(\overline{AC}\) through the centre \(O\).`, R`Open the compass wider than \(OA\). With the point on \(A\) and then on \(C\), draw arcs that cross at \(P\) and \(Q\).`, R`Draw line \(PQ\). Label \(B\) and \(D\) where it meets the circle.`, R`Join \(A, B, C\) and \(D\) in order.`],
    slips: [R`Draw a second diameter \(\overline{BD}\) at any angle to \(\overline{AC}\).`, R`Open the compass narrower than \(OA\). With the point on \(A\) and then on \(C\), draw arcs that cross at \(P\) and \(Q\).`, R`Join \(A\), \(B\) and \(C\).`],
    why: [R`Why is \(ABCD\) a square?`, 'diag', ['corr', 'aaa', 'mids']],
  },
  circum: {
    slipWhy: 'The angle bisectors meet at the incentre, which is the same distance from the sides, not from the vertices.',
    name: 'The circumscribed circle of a triangle', rule: 4, order: true,
    look: 'perpendicular bisectors of two sides and a circle through all three vertices',
    steps: [R`Construct the perpendicular bisectors of \(\overline{AB}\) and \(\overline{BC}\).`, R`Label \(O\) where they cross.`, R`Open the compass from \(O\) to \(A\).`, R`Draw the circle centred at \(O\). It passes through \(A\), \(B\) and \(C\).`],
    slips: [R`Construct the bisectors of \(\angle A\) and \(\angle B\).`, R`Open the compass from \(O\) to the midpoint of \(\overline{AB}\).`, R`Label \(O\) at the midpoint of \(\overline{AB}\).`],
    why: [R`Why does the circle centred at \(O\) pass through all three vertices?`, 'circ', ['inc', 'semi', 'mids']],
  },
  incentre: {
    slipWhy: 'The perpendicular bisectors meet at the circumcentre, which is the same distance from the vertices, not from the sides.',
    name: 'The inscribed circle of a triangle', rule: 4, order: true,
    look: 'bisectors of two angles and a circle touching all three sides',
    steps: [R`Construct the bisectors of \(\angle A\) and \(\angle B\).`, R`Label \(I\) where they cross.`, R`Construct the perpendicular from \(I\) to \(\overline{AB}\), meeting it at \(F\).`, R`Draw the circle centred at \(I\) through \(F\). It touches all three sides.`],
    slips: [R`Construct the perpendicular bisectors of \(\overline{AB}\) and \(\overline{BC}\).`, R`Open the compass from \(I\) to \(A\) and draw the circle.`, R`Label \(I\) at the midpoint of \(\overline{AB}\).`],
    why: [R`Why does the circle centred at \(I\) touch all three sides?`, 'inc', ['circ', 'bis', 'semi']],
  },
  tangent: {
    slipWhy: 'The circle must be centred at M, so that OP is its diameter and the angle at T is a right angle.',
    name: 'A tangent to a circle from an outside point', rule: 5, order: true,
    look: 'a circle on OP as diameter crossing the given circle, and lines from P through the crossing points',
    steps: [R`Draw segment \(\overline{OP}\).`, R`Construct the perpendicular bisector of \(\overline{OP}\), crossing it at its midpoint \(M\).`, R`With the point on \(M\) and the opening \(MO\), draw a circle crossing the given circle at \(T\) and \(S\).`, R`Draw lines \(PT\) and \(PS\). Both are tangent to the circle.`],
    slips: [R`With the point on \(P\) and the opening \(PO\), draw a circle crossing the given circle at \(T\) and \(S\).`, R`With the point on \(O\) and the opening \(OM\), draw a circle crossing the given circle at \(T\) and \(S\).`, R`Draw lines \(MT\) and \(MS\). Both are tangent to the circle.`],
    why: [R`Why is line \(PT\) tangent to the circle?`, 'semi', ['bis', 'inc', 'corr']],
  },
};
const CONFUSE = { copySeg: ['copyAngle', 'bisectSeg', 'perpOn'], copyAngle: ['bisectAngle', 'parallel', 'copySeg'], bisectSeg: ['perpOff', 'perpOn', 'bisectAngle'], bisectAngle: ['copyAngle', 'bisectSeg', 'perpOn'], perpOn: ['perpOff', 'bisectSeg', 'parallel'], perpOff: ['perpOn', 'bisectSeg', 'parallel'], parallel: ['copyAngle', 'perpOff', 'perpOn'], hex: ['tri', 'square', 'circum'], tri: ['hex', 'square', 'circum'], square: ['hex', 'tri', 'bisectSeg'], circum: ['incentre', 'bisectSeg', 'tri'], incentre: ['circum', 'bisectAngle', 'tangent'], tangent: ['perpOff', 'circum', 'incentre'] };
const KINDS = Object.keys(K);

const SPOT = (p) => R`\(${p}\)`;
const cm = (v) => R`\(${num(v)}\) cm`;
const sqCm = (tex) => R`\(${tex}\) cm`;
const CENTRES = {
  circ: 'The circumcentre, where the perpendicular bisectors of the sides meet',
  inc: 'The incentre, where the bisectors of the angles meet',
  circWrong: 'The circumcentre, where the bisectors of the angles meet',
  incWrong: 'The incentre, where the perpendicular bisectors of the sides meet',
  cen: 'The centroid, where the medians meet',
};

// ───────────── Easy ─────────────

function easyIdentify(rng) {
  const kind = rng.pick(KINDS);
  const fig = figure(kind, rng);
  const [w0, ...rest] = CONFUSE[kind];
  return q({
    prompt: 'Which construction does this drawing show?',
    visual: fig.visual,
    correct: K[kind].name,
    wrong: [{ value: K[w0].name, why: `That construction would show ${K[w0].look}. This drawing shows ${K[kind].look}.` }, ...rest.map((w) => K[w].name)],
    solution: [`Green arcs are compass marks, the blue figure is what was given, and dashed lines were drawn with the straightedge.`, `The drawing shows ${K[kind].look}.`, `So it is: ${K[kind].name.toLowerCase()}.`],
    rule: K[kind].rule,
    skill: 'identify a construction',
    check: fig.check,
  });
}

function easyRadius(rng) {
  const ask = rng.pick(['PB', 'rhombus', 'hex']);
  if (ask === 'hex') {
    const r = rng.int(3, 15);
    const fig = figure('hex', rng, { r });
    const side = dist(fig.V[0], fig.V[1]);
    return q({
      prompt: R`A circle has radius \(${r}\) cm. Keeping the compass open to the radius, ${person(rng)} steps it round the circle and joins the six points to make a regular hexagon. How long is each side of the hexagon?`,
      visual: fig.visual,
      correct: r, unit: 'cm',
      wrong: [{ value: 2 * r, why: 'That is the diameter. The compass was set to the radius, and each side is one compass step.' }, 6 * r, r / 2],
      solution: [`Each point was marked one compass opening from the one before, and the opening is the radius.`, R`So each side of the hexagon equals the radius: \(${r}\) cm.`],
      rule: 3, skill: 'inscribed hexagon',
      check: () => (near(side, r) && fig.check() === true ? true : 'the hexagon side is not the radius'),
    });
  }
  const d = rng.int(4, 14);
  const r = rng.int(Math.floor(d / 2) + 1, d + 2);
  const fig = figure('bisectSeg', rng, { L: d, r });
  fig.f.lines[0].label = `${d} cm`;
  const visual = draw(fig.f, `Segment AB is ${d} cm long. Arcs of radius ${r} cm centred at A and at B cross at P and Q, and line PQ crosses AB at M.`);
  const common = { visual, rule: 0, unit: 'cm', check: () => (near(dist(fig.P, fig.B), r, 1e-6 * r) && near(dist(fig.Q, fig.A), r, 1e-6 * r) && fig.check() === true ? true : 'PB is not the radius') };
  const intro = R`\(AB = ${d}\) cm. With the compass open to \(${r}\) cm, arcs centred at \(A\) and at \(B\) cross at \(P\) and \(Q\).`;
  if (ask === 'PB') {
    return q({
      ...common,
      prompt: R`${intro} How far is \(P\) from \(B\)?`,
      correct: r,
      wrong: [{ value: d / 2, why: R`That is \(MB\), half of \(AB\). \(P\) is on an arc of radius \(${r}\) cm centred at \(B\).` }, d, 2 * r],
      solution: [R`\(P\) lies on the arc centred at \(B\), and every point of that arc is one compass opening from \(B\).`, R`So \(PB = ${r}\) cm.`],
      skill: 'equal radii',
    });
  }
  return q({
    ...common,
    prompt: R`${intro} What is the perimeter of the quadrilateral \(APBQ\)?`,
    correct: 4 * r,
    wrong: [{ value: 2 * r + d, why: R`\(\overline{AB}\) is a diagonal of \(APBQ\), not a side. The sides are \(AP, PB, BQ\) and \(QA\).` }, 2 * r, 4 * r + 2 * d],
    solution: [R`Each side of \(APBQ\) joins a crossing point to the centre of an arc through it, so \(AP = PB = BQ = QA = ${r}\) cm.`, R`Perimeter \(= 4 \cdot ${r} = ${4 * r}\) cm. (\(APBQ\) is a rhombus.)`],
    skill: 'equal radii',
  });
}

const PLACES = [
  ['circ', (n) => `${n} wants to dig a well that is the same distance from three houses that are not in a straight line.`],
  ['circ', () => 'A town plans a fire station that is the same distance from three schools.'],
  ['circ', (n) => `${n} is laying out a circular path whose edge passes through three trees.`],
  ['circ', () => 'A phone mast is to be placed the same distance from three villages.'],
  ['circ', (n) => `${n} has a broken piece of a round plate and marks three points on its edge, to find the centre of the plate.`],
  ['inc', (n) => `${n} is planning the largest round fountain that fits inside a triangular garden.`],
  ['inc', () => 'A lamp post in a triangular park must be the same distance from the three straight paths along its edges.'],
  ['inc', (n) => `${n} wants to cut the largest possible circle from a triangular sheet of plywood.`],
  ['inc', () => 'A bench must be the same distance from the three straight walls of a triangular courtyard.'],
];

function easyWhichCentre(rng) {
  const [kind, story] = rng.pick(PLACES);
  const n = person(rng);
  const right = CENTRES[kind];
  const other = kind === 'circ' ? CENTRES.inc : CENTRES.circ;
  return q({
    prompt: `${story(n)} Which point is needed, and how is it constructed?`,
    correct: right,
    wrong: [
      { value: other, why: kind === 'circ' ? 'The incentre is the same distance from the three sides. Here the distances are to three points, the vertices.' : 'The circumcentre is the same distance from the three vertices. Here the distances are to the three sides.' },
      kind === 'circ' ? { value: CENTRES.circWrong, why: 'The angle bisectors meet at the incentre. The circumcentre comes from the perpendicular bisectors.' } : { value: CENTRES.incWrong, why: 'The perpendicular bisectors meet at the circumcentre. The incentre comes from the angle bisectors.' },
      CENTRES.cen,
    ],
    solution: kind === 'circ'
      ? ['The point must be the same distance from three points, which form the vertices of a triangle.', 'A point the same distance from two points lies on the perpendicular bisector of the segment between them; using two sides pins it down.', 'That is the circumcentre, where the perpendicular bisectors of the sides meet.']
      : ['The point must be the same distance from three sides of a triangle (for the largest circle, it touches all three sides).', 'A point the same distance from two sides of an angle lies on its bisector; using two angles pins it down.', 'That is the incentre, where the angle bisectors meet.'],
    rule: 4,
    skill: 'choose a point of concurrency',
  });
}

// ───────────── Medium ─────────────

function mediumSteps(rng) {
  const kind = rng.pick(KINDS);
  const k = K[kind];
  const fig = figure(kind, rng);
  if (k.order && rng.bool(0.5)) {
    const perm = rng.shuffle([0, 1, 2, 3]); // perm[j] = which true step is shown as item j + 1
    const label = (i) => perm.indexOf(i) + 1; // the item number of true step i
    const seq = (order) => order.map(label).join(', ');
    const right = [0, 1, 2, 3];
    const swaps = [0, 1, 2].map((i) => { const o = [...right]; [o[i], o[i + 1]] = [o[i + 1], o[i]]; return { o, i }; });
    return q({
      prompt: `These are the steps for this construction (${k.name.toLowerCase()}), out of order. In which order are they done?`,
      visual: [fig.visual, { type: 'table', headers: ['Item', 'Step'], rows: perm.map((s, j) => [`${j + 1}`, k.steps[s]]) }],
      correct: seq(right),
      wrong: swaps.map(({ o, i }) => ({ value: seq(o), why: `Item ${label(i + 1)} uses something that item ${label(i)} makes, so it must come after it.` })),
      solution: [`Start from what is given, and do each step only once everything it uses exists.`, ...right.map((i) => `Item ${label(i)}: ${k.steps[i]}`)],
      rule: k.rule, skill: 'order of steps', check: fig.check,
    });
  }
  const miss = rng.int(0, 3);
  return q({
    prompt: `One step of this construction (${k.name.toLowerCase()}) is missing. Which step goes in the gap?`,
    visual: [fig.visual, { type: 'table', headers: ['Step', 'What to do'], rows: k.steps.map((s, j) => [`${j + 1}`, j === miss ? '?' : s]) }],
    correct: k.steps[miss],
    wrong: [{ value: k.slips[0], why: k.slipWhy }, ...k.slips.slice(1)],
    solution: [`Look at the picture: it shows ${k.look}.`, `Step ${miss + 1} is: ${k.steps[miss]}`],
    rule: k.rule, skill: 'missing step', check: fig.check,
  });
}

function mediumWhy(rng) {
  const kind = rng.pick(KINDS);
  const [claim, right, wrongs] = K[kind].why;
  const fig = figure(kind, rng);
  return q({
    prompt: `The drawing shows ${K[kind].name.toLowerCase()}. ${claim}`,
    visual: fig.visual,
    correct: FACT[right],
    wrong: wrongs.map((w) => ({ value: FACT[w], why: FALSE_WHY[w] ?? 'That statement is true, but this construction does not rely on it.' })),
    solution: [`The drawing shows ${K[kind].look}.`, `The fact that makes it work: ${FACT[right]}`],
    rule: K[kind].rule,
    skill: 'why a construction works',
    check: fig.check,
  });
}

function mediumEquidistant(rng) {
  const circ = rng.bool();
  for (;;) {
    const x = rng.int(2, 9);
    const a = rng.int(2, 6);
    const c = rng.int(1, a - 1);
    const b = rng.int(-5, 9);
    const dd = (a - c) * x + b;
    const V = a * x + b;
    if (V < 4 || dd === 0) continue;
    const slip = (dd + b) % (a - c) === 0 ? a * ((dd + b) / (a - c)) + b : null;
    const fig = figure(circ ? 'circum' : 'incentre', rng);
    const e1 = linT(a, b), e2 = linT(c, dd);
    let alt;
    if (circ) {
      fig.f.dash(fig.O, fig.A, e1).dash(fig.O, fig.B, e2).dash(fig.O, fig.C);
      alt = `Triangle ABC with its circumcentre O, where the dashed perpendicular bisectors of AB and BC cross, and the circle through A, B and C. OA is labelled ${e1} and OB is labelled ${e2}.`;
    } else {
      fig.f.lines.find((l) => l.from === fig.I && l.to === fig.F).label = e1;
      fig.f.dash(fig.I, fig.G, e2).dash(fig.I, fig.H).pt(fig.G, 'G').pt(fig.H, 'H');
      alt = `Triangle ABC with its incentre I, where the dashed bisectors of angles A and B cross. Perpendiculars from I meet AB at F, BC at G and CA at H. IF is labelled ${e1} and IG is labelled ${e2}. The circle centred at I touches all three sides.`;
    }
    const [p, s1, s2, s3] = circ ? ['O', 'OA', 'OB', 'OC'] : ['I', 'IF', 'IG', 'IH'];
    return q({
      prompt: circ
        ? R`In \(\triangle ABC\), \(O\) is where the perpendicular bisectors of the sides meet. \(OA = ${linear(a, b)}\) and \(OB = ${linear(c, dd)}\). Find \(OC\).`
        : R`In \(\triangle ABC\), \(I\) is where the angle bisectors meet. \(F\), \(G\) and \(H\) are the feet of the perpendiculars from \(I\) to \(\overline{AB}\), \(\overline{BC}\) and \(\overline{CA}\). \(IF = ${linear(a, b)}\) and \(IG = ${linear(c, dd)}\). Find \(IH\).`,
      visual: draw(fig.f, alt),
      correct: V,
      wrong: [
        { value: x, why: R`\(${x}\) is the value of \(x\). Substitute it to find the length.` },
        { value: 2 * V, why: R`\(${s3}\) is equal to \(${s1}\), not twice it.` },
        slip !== V && slip > 0 ? { value: slip, why: R`Check the signs when collecting terms: \(${linear(a - c, 0)} = ${dd} - ${b < 0 ? `(${b})` : b}\).` } : null,
        V + a - c,
      ],
      solution: [
        circ ? R`\(O\) is on the perpendicular bisector of every side, so it is the same distance from all three vertices: \(OA = OB = OC\).` : R`\(I\) is on the bisector of every angle, so it is the same distance from all three sides: \(IF = IG = IH\).`,
        R`\(${linear(a, b)} = ${linear(c, dd)}\), so \(${linear(a - c, 0)} = ${dd - b}\)${a - c === 1 ? '' : R` and \(x = ${x}\)`}.`,
        R`\(${s1} = ${a}(${x}) ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${V}\), and \(${s2} = ${c === 1 ? x : `${c}(${x})`} ${dd < 0 ? '-' : '+'} ${Math.abs(dd)} = ${V}\). ✓`,
        R`So \(${s3} = ${V}\).`,
      ],
      rule: 4,
      skill: circ ? 'circumcentre distances' : 'incentre distances',
      check: () => (a * x + b === c * x + dd && fig.check() === true ? true : 'the two distances differ'),
    });
  }
}

// ───────────── Hard ─────────────

function hardInscribed(rng) {
  const r = rng.int(2, 15);
  const ask = rng.pick(['tri', 'hexP', 'square', 'squareArea']);
  const kind = ask === 'tri' ? 'tri' : ask === 'hexP' ? 'hex' : 'square';
  const fig = figure(kind, rng, { r });
  const V = fig.V;
  const measured = kind === 'tri' ? dist(V[0], V[2]) : kind === 'hex' ? V.reduce((s, p, k) => s + dist(p, V[(k + 1) % 6]), 0) : ask === 'square' ? dist(fig.A, fig.B) : dist(fig.A, fig.B) ** 2;
  const n = person(rng);
  const what = { tri: 'the length of each side of the triangle', hexP: 'the perimeter of the hexagon', square: 'the length of each side of the square', squareArea: 'the area of the square' }[ask];
  const S = (k) => sqCm(sqrtTex(k));
  const spec = {
    tri: { correct: S(3 * r * r), val: r * Math.sqrt(3), wrong: [{ value: S(r * r), why: 'That is the side of the hexagon. The triangle skips every other point, so its side spans two compass steps.' }, { value: S(2 * r * r), why: 'That is the side of the square inscribed in the same circle.' }, S(4 * r * r), S(12 * r * r)],
      sol: [R`The six points split the circle into \(60^\circ\) arcs, so each side of \(\triangle ACE\) cuts off a \(120^\circ\) arc and \(\angle AOC = 120^\circ\).`, R`The perpendicular from \(O\) to \(\overline{AC}\) splits \(\triangle AOC\) into two 30-60-90 triangles with hypotenuse \(${r}\), so half of \(AC\) is \(\frac{${r}\sqrt{3}}{2}\).`, R`\(AC = ${sqrtTex(3 * r * r)}\) cm.`] },
    hexP: { correct: cm(6 * r), val: 6 * r, wrong: [{ value: cm(r), why: 'That is one side. The perimeter is all six sides.' }, { value: cm(12 * r), why: 'Each side equals the radius, not the diameter.' }, S(27 * r * r)],
      sol: [R`Each side is one compass step, and the compass is set to the radius, so each side is \(${r}\) cm.`, R`Perimeter \(= 6 \cdot ${r} = ${6 * r}\) cm.`] },
    square: { correct: S(2 * r * r), val: r * Math.SQRT2, wrong: [{ value: cm(2 * r), why: 'That is the diameter, which is a diagonal of the square, not a side.' }, { value: S(3 * r * r), why: 'That is the side of the inscribed equilateral triangle.' }, cm(r)],
      sol: [R`The diagonals \(\overline{AC}\) and \(\overline{BD}\) are perpendicular diameters, so \(\triangle AOB\) is a right isosceles triangle with legs \(${r}\).`, R`\(AB = \sqrt{${r}^2 + ${r}^2} = ${sqrtTex(2 * r * r)}\) cm.`] },
    squareArea: { correct: R`\(${2 * r * r}\) cm²`, val: 2 * r * r, wrong: [{ value: R`\(${4 * r * r}\) cm²`, why: 'That squares the diameter, which is the diagonal of the square, not its side.' }, { value: R`\(${r * r}\) cm²`, why: 'That squares the radius. Each side of the square is longer than the radius.' }, R`\(${2 * r * r + 4 * r}\) cm²`, R`\(${3 * r * r}\) cm²`],
      sol: [R`The diagonals are diameters, \(${2 * r}\) cm long, and they are perpendicular.`, R`Area of a rhombus or square \(= \frac{1}{2} \cdot d_1 \cdot d_2 = \frac{1}{2} \cdot ${2 * r} \cdot ${2 * r} = ${2 * r * r}\) cm².`] },
  }[ask];
  const how = kind === 'square' ? 'by drawing a diameter and its perpendicular bisector' : 'by stepping the compass, set to the radius, round the circle';
  return q({
    prompt: R`${n} inscribes a ${kind === 'tri' ? 'equilateral triangle' : kind === 'hex' ? 'regular hexagon' : 'square'} in a circle of radius \(${r}\) cm, ${how}. Find ${what}.`,
    visual: fig.visual,
    correct: spec.correct,
    wrong: spec.wrong,
    solution: spec.sol,
    rule: 3,
    skill: 'inscribed polygons',
    check: () => (near(measured, spec.val, 1e-6 * r * r) && fig.check() === true ? true : 'the measured length does not match'),
  });
}

function hardWell(rng) {
  const base = [[5, 0], [4, 3], [3, 4], [0, 5], [-3, 4], [-4, 3], [-5, 0], [-4, -3], [-3, -4], [0, -5], [3, -4], [4, -3]];
  for (;;) {
    const s = rng.pick([1, 2]);
    const h = rng.int(5, 8) * s, k = rng.int(5, 8) * s;
    const offs = rng.sample(base, 3);
    if (offs.some((a, i) => offs.some((b, j) => i < j && (a[0] === -b[0] && a[1] === -b[1] || Math.hypot(a[0] - b[0], a[1] - b[1]) < 4)))) continue;
    const [A, B, C] = offs.map(([x, y]) => [h + s * x, k + s * y]);
    const eq = (P, Q) => { const a = 2 * (Q[0] - P[0]), b = 2 * (Q[1] - P[1]), c = Q[0] ** 2 + Q[1] ** 2 - P[0] ** 2 - P[1] ** 2; const g = (gcd(gcd(Math.abs(a), Math.abs(b)), Math.abs(c)) || 1) * (a < 0 || (a === 0 && b < 0) ? -1 : 1); return [a / g, b / g, c / g]; };
    const e1 = eq(A, B), e2 = eq(B, C);
    const det = e1[0] * e2[1] - e1[1] * e2[0];
    const X = (e1[2] * e2[1] - e1[1] * e2[2]) / det, Y = (e1[0] * e2[2] - e1[2] * e2[0]) / det;
    const n = person(rng);
    const lin = (e) => R`\(${terms([[e[0], 'x'], [e[1], 'y']])} = ${e[2]}\)`;
    const pt = (x, y) => R`\(${point(x, y)}\)`;
    const mAB = midpoint(A, B), mBC = midpoint(B, C);
    const R0 = 5 * s;
    return q({
      prompt: R`On a map grid, ${n}'s three neighbours live at \(A${point(...A)}\), \(B${point(...B)}\) and \(C${point(...C)}\). ${n} wants to dig a well the same distance from all three houses. Where should it go?`,
      visual: { type: 'plot', x: [h - R0 - 2, h + R0 + 2], y: [k - R0 - 2, k + R0 + 2], square: true, step: [s, s], points: [{ x: A[0], y: A[1], label: 'A' }, { x: B[0], y: B[1], label: 'B' }, { x: C[0], y: C[1], label: 'C' }], alt: `Three houses on a coordinate grid at A(${A.join(', ')}), B(${B.join(', ')}) and C(${C.join(', ')}).` },
      correct: pt(h, k),
      wrong: [
        { value: pt(frac(A[0] + B[0] + C[0], 3), frac(A[1] + B[1] + C[1], 3)), why: 'That is the centroid, the average of the vertices. It is not usually the same distance from all three.' },
        { value: pt(...mAB), why: R`The midpoint of \(\overline{AB}\) is the same distance from \(A\) and \(B\) only, not from \(C\).` },
        pt(...mBC),
        h !== k ? pt(k, h) : null,
      ],
      solution: [
        'The well is the circumcentre: it lies on the perpendicular bisector of every side.',
        R`Points the same distance from \(A\) and \(B\): \((x - ${A[0]})^2 + (y - ${A[1]})^2 = (x - ${B[0]})^2 + (y - ${B[1]})^2\), which simplifies to ${lin(e1)}.`,
        R`In the same way for \(B\) and \(C\): ${lin(e2)}.`,
        R`Solving the two equations together gives \(${point(h, k)}\).`,
        R`Check: each house is \(${R0}\) units from \(${point(h, k)}\); for example \(\sqrt{${paren(A[0] - h)}^2 + ${paren(A[1] - k)}^2} = ${R0}\).`,
      ],
      rule: 4,
      skill: 'circumcentre from coordinates',
      check: () => (near(X, h) && near(Y, k) && [A, B, C].every((p) => near(dist(p, [h, k]), R0)) ? true : 'the well is not equidistant'),
    });
  }
}

const TRIPLES_S = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [6, 8, 10], [9, 12, 15], [12, 16, 20], [15, 20, 25], [9, 40, 41]];

function hardTangent(rng) {
  const [a, b, c] = rng.pick(TRIPLES_S);
  const [r, t] = rng.bool() ? [a, b] : [b, a];
  if (t / r > 3.5 || t / r < 0.6) return hardTangent(rng);
  const fig = figure('tangent', rng, { r, d: c });
  const backwards = rng.bool();
  return q({
    prompt: backwards
      ? R`To draw a tangent from \(P\) to a circle with centre \(O\) and radius \(${r}\) cm, the circle on \(\overline{OP}\) as diameter is drawn; it meets the first circle at \(T\). The tangent segment \(PT\) is \(${t}\) cm. How far is \(P\) from \(O\)?`
      : R`To draw a tangent from \(P\) to a circle with centre \(O\) and radius \(${r}\) cm, the circle on \(\overline{OP}\) as diameter is drawn; it meets the first circle at \(T\). \(OP = ${c}\) cm. How long is the tangent segment \(PT\)?`,
    visual: fig.visual,
    correct: backwards ? c : t, unit: 'cm',
    wrong: backwards
      ? [{ value: r + t, why: R`\(\triangle OTP\) is a right triangle, so use the Pythagorean theorem, not a sum.` }, { value: Math.abs(t - r), why: 'Subtracting the legs does not give the hypotenuse. Use the Pythagorean theorem.' }, 2 * t]
      : [{ value: c - r, why: R`That is how far \(P\) is from the circle along \(\overline{OP}\), not the tangent length.` }, { value: c / 2, why: R`That is the radius of the circle on \(\overline{OP}\), \(MO\).` }, c + r],
    solution: [
      R`\(T\) is on the circle with diameter \(\overline{OP}\), so \(\angle OTP\) is inscribed in a semicircle: \(\angle OTP = 90^\circ\). That is why \(PT\) is tangent.`,
      R`\(\triangle OTP\) has legs \(OT = ${r}\) and \(PT\), and hypotenuse \(OP\).`,
      backwards ? R`\(OP = \sqrt{${r}^2 + ${t}^2} = \sqrt{${r * r + t * t}} = ${c}\) cm.` : R`\(PT = \sqrt{${c}^2 - ${r}^2} = \sqrt{${c * c - r * r}} = ${t}\) cm.`,
    ],
    rule: 5,
    skill: 'tangent construction lengths',
    check: () => (near(dist(fig.P, fig.T), t, 1e-6 * c) && fig.check() === true ? true : 'PT does not match'),
  });
}

function hardFountain(rng) {
  const [p, qq, c0] = rng.pick(TRIPLES_S);
  const k = rng.pick([1, 2, 3]);
  const [a, b, c] = [p * k, qq * k, c0 * k];
  if (c > 60 || Math.max(a, b) > 3 * Math.min(a, b)) return hardFountain(rng);
  const tri = rng.bool() ? [[0, 0], [a, 0], [0, b]] : [[0, 0], [b, 0], [0, a]];
  const fig = figure('incentre', rng, { tri });
  const inr = (a + b - c) / 2;
  const fence = rng.bool(0.35);
  const n = person(rng);
  const story = R`${n}'s garden is a right triangle with legs \(${a}\) m and \(${b}\) m and hypotenuse \(${c}\) m.`;
  return q({
    prompt: fence ? R`${story} A circular fence is to pass through all three corners. What is its radius?` : R`${story} What is the radius of the largest circular fountain that fits inside the garden?`,
    visual: fig.visual,
    correct: fence ? c / 2 : inr, unit: 'm',
    wrong: fence
      ? [{ value: inr, why: 'That is the radius of the inscribed circle, which touches the sides. The fence passes through the corners.' }, c, (a + b) / 2]
      : [{ value: c / 2, why: 'That circle passes through the corners, so it does not fit inside the garden. The fountain touches the three sides.' }, { value: (a * b) / (2 * (a + b + c)), why: R`Area \(=\) inradius \(\times\) half the perimeter. Dividing the area by the whole perimeter gives half the radius.` }, Math.min(a, b) / 2],
    solution: fence
      ? [R`A circle through the three corners is centred at the circumcentre, where the perpendicular bisectors meet.`, R`In a right triangle the hypotenuse is a diameter of that circle (the right angle is inscribed in a semicircle), so the circumcentre is the midpoint of the hypotenuse.`, R`Radius \(= \frac{${c}}{2} = ${num(c / 2)}\) m.`]
      : [R`The largest circle inside touches all three sides, so its centre is the incentre and its radius \(r\) is the distance to each side.`, R`Joining the incentre to the corners splits the garden into three triangles of height \(r\): area \(= \frac{1}{2} r (${a} + ${b} + ${c})\).`, R`The area is \(\frac{1}{2} \cdot ${a} \cdot ${b} = ${(a * b) / 2}\), so \(${(a * b) / 2} = ${(a + b + c) / 2}r\) and \(r = ${num(inr)}\) m.`],
    rule: 4,
    skill: fence ? 'circumradius' : 'inradius',
    check: () => (fence ? near(dist(midpoint(tri[1], tri[2]), tri[0]), c / 2) : near(fig.rin, inr, 1e-6 * c) && fig.check() === true) ? true : 'the radius does not match the construction',
  });
}

// ───────────── Challenge ─────────────

function challengeArcs(rng) {
  const [p, qq, r] = rng.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 9, 15], [4, 3, 5], [8, 6, 10]]);
  const [half, hh] = [p, qq];
  const d = 2 * half;
  const ask = rng.pick(['PQ', 'r', 'min']);
  const fig = figure('bisectSeg', rng, { L: d, r });
  if (ask === 'min') {
    const D = rng.int(5, 23);
    const f2 = figure('bisectSeg', rng, { L: D, r: Math.floor(D / 2) + 1 });
    return q({
      prompt: R`A compass can only be set to a whole number of centimetres. What is the smallest setting that will construct the perpendicular bisector of a segment \(${D}\) cm long?`,
      visual: f2.visual,
      correct: Math.floor(D / 2) + 1, unit: 'cm',
      wrong: [D % 2 === 0 ? { value: D / 2, why: R`With a radius of exactly half of \(AB\), the arcs only touch at the midpoint. They must cross at two points.` } : { value: Math.floor(D / 2), why: R`That is less than half of \(${D}\), so the arcs would never meet.` }, D, Math.floor(D / 2) + 2],
      solution: [R`Arcs of radius \(r\) from \(A\) and \(B\) cross at two points only if \(r > \frac{AB}{2} = ${num(D / 2)}\).`, R`The smallest whole number greater than \(${num(D / 2)}\) is \(${Math.floor(D / 2) + 1}\).`],
      rule: 2, skill: 'compass opening',
      check: () => (meet([0, 0], Math.floor(D / 2) + 1, [D, 0], Math.floor(D / 2) + 1)[0][1] > 0 && Math.floor(D / 2) + 1 > D / 2 && Math.floor(D / 2) <= D / 2 ? f2.check() : 'the smallest radius is wrong'),
    });
  }
  return q({
    prompt: ask === 'PQ'
      ? R`\(AB = ${d}\) cm. Arcs of radius \(${r}\) cm centred at \(A\) and at \(B\) cross at \(P\) and \(Q\). How far apart are \(P\) and \(Q\)?`
      : R`\(AB = ${d}\) cm. Equal arcs centred at \(A\) and at \(B\) cross at \(P\) and \(Q\), and \(PQ = ${2 * hh}\) cm. What radius was the compass set to?`,
    visual: fig.visual,
    correct: ask === 'PQ' ? 2 * hh : r, unit: 'cm',
    wrong: ask === 'PQ'
      ? [{ value: hh, why: R`That is \(PM\), from \(P\) to \(\overline{AB}\). \(Q\) is the same distance on the other side.` }, { value: 2 * r, why: R`\(\overline{PQ}\) is not a diameter of either arc.` }, d]
      : [{ value: half + hh, why: R`The sides of right \(\triangle AMP\) do not add up like that. Use the Pythagorean theorem with \(AM\) and \(PM\).` }, { value: Math.hypot(half, 2 * hh) % 1 === 0 ? Math.hypot(half, 2 * hh) : null, why: R`Use half of \(PQ\): \(M\) is the midpoint of \(\overline{PQ}\) as well as of \(\overline{AB}\).` }, d, half + 2 * hh],
    solution: [
      R`\(PA = PB = QA = QB\), so \(P\) and \(Q\) are on the perpendicular bisector of \(\overline{AB}\). It crosses \(\overline{AB}\) at its midpoint \(M\) at a right angle, and \(M\) is also the midpoint of \(\overline{PQ}\).`,
      R`In right \(\triangle AMP\): \(AM = ${half}\), \(PM = \frac{PQ}{2}\), and \(AP = r\).`,
      ask === 'PQ' ? R`\(PM = \sqrt{${r}^2 - ${half}^2} = \sqrt{${r * r - half * half}} = ${hh}\), so \(PQ = 2 \cdot ${hh} = ${2 * hh}\) cm.` : R`\(PM = ${hh}\), so \(r = \sqrt{${half}^2 + ${hh}^2} = \sqrt{${half * half + hh * hh}} = ${r}\) cm.`,
    ],
    rule: 2, skill: 'arcs and the perpendicular bisector',
    check: () => (near(dist(fig.P, fig.Q), 2 * hh, 1e-6 * r) && fig.check() === true ? true : 'PQ does not match'),
  });
}

function challengeSpotError(rng) {
  const n = person(rng);
  const d = rng.int(8, 14);
  const r = rng.int(3, 9);
  const a = rng.intExcept(35, 140, [60]);
  const bank = [
    { goal: R`construct the perpendicular bisector of \(\overline{AB}\), which is \(${d}\) cm long`, bad: 0,
      steps: [R`Set the compass to \(${Math.floor((d - 1) / 2)}\) cm.`, R`With the point on \(A\), draw arcs above and below \(\overline{AB}\).`, R`With the same opening and the point on \(B\), draw arcs above and below \(\overline{AB}\).`, 'Join the two points where the arcs cross.'],
      why: R`Half of \(AB\) is \(${num(d / 2)}\) cm. Arcs of radius \(${Math.floor((d - 1) / 2)}\) cm from \(A\) and from \(B\) never meet; the opening must be more than half of \(AB\).`, test: () => Math.floor((d - 1) / 2) < d / 2 },
    { goal: R`construct the perpendicular bisector of \(\overline{AB}\), which is \(${d}\) cm long`, bad: 2,
      steps: [R`Set the compass to \(${d - 2}\) cm.`, R`With the point on \(A\), draw arcs above and below \(\overline{AB}\).`, R`Reset the compass to \(${d - 1}\) cm and, with the point on \(B\), draw arcs crossing the first ones.`, 'Join the two points where the arcs cross.'],
      why: R`The crossing points must be the same distance from \(A\) and \(B\). With radii \(${d - 2}\) cm and \(${d - 1}\) cm they are not, so they are not on the perpendicular bisector.`, test: () => d - 2 > d / 2 },
    { goal: R`copy \(\angle BAC\), which measures \(${deg(a)}\), to a ray from \(D\)`, bad: 2,
      steps: [K.copyAngle.steps[0], K.copyAngle.steps[1], R`Set the compass to the distance \(AB\). With the point on \(E\), draw an arc crossing the last arc at \(F\).`, R`Draw ray \(DF\).`],
      why: R`The opening must be \(BC\). With \(AB\), all three sides of \(\triangle DEF\) equal the first radius, so \(\angle EDF\) comes out as \(60^\circ\), not \(${deg(a)}\).`, test: () => a !== 60 },
    { goal: R`bisect \(\angle PVQ\)`, bad: 2,
      steps: [K.bisectAngle.steps[0], R`With the compass set to \(${r}\) cm and the point on \(P\), draw an arc inside the angle.`, R`With the compass set to \(${r + 2}\) cm and the point on \(Q\), draw an arc crossing the last one at \(R\).`, R`Draw ray \(VR\).`],
      why: R`\(R\) must be the same distance from \(P\) and \(Q\) for the SSS argument to work. With \(${r}\) cm and \(${r + 2}\) cm it is not, so ray \(VR\) is not the bisector.`, test: () => true },
    { goal: R`inscribe a regular hexagon in a circle of radius \(${r}\) cm`, bad: 1,
      steps: [R`Draw a circle of radius \(${r}\) cm with centre \(O\), and mark \(A\) on it.`, R`Set the compass to \(${2 * r}\) cm.`, R`With the point on \(A\), mark \(B\) on the circle; move the point to \(B\) and mark \(C\), and so on.`, 'Join the six points in order.'],
      why: R`The compass must stay at the radius, \(${r}\) cm: each step then cuts off a \(60^\circ\) arc. Set to the diameter, \(${2 * r}\) cm, it only reaches the point opposite \(A\).`, test: () => true },
    { goal: R`draw a tangent from \(P\) to a circle with centre \(O\)`, bad: 2,
      steps: K.tangent.steps.slice(0, 2).concat([K.tangent.slips[0], R`Draw line \(PT\).`]),
      why: R`The circle must be centred at \(M\) with radius \(MO\), so that \(\overline{OP}\) is a diameter and \(\angle OTP\) is inscribed in a semicircle, making it \(90^\circ\).`, test: () => true },
    { goal: 'draw the inscribed circle of a scalene triangle ABC', bad: 2,
      steps: [K.incentre.steps[0], K.incentre.steps[1], R`Open the compass from \(I\) to \(A\).`, R`Draw the circle centred at \(I\).`],
      why: R`The inscribed circle's radius is the distance from \(I\) to a side, found with a perpendicular from \(I\) to \(\overline{AB}\). \(IA\) is longer, so that circle crosses the sides.`, test: () => true },
    { goal: 'draw the circle through all three vertices of a scalene triangle ABC', bad: 0,
      steps: [K.circum.slips[0], K.circum.steps[1], K.circum.steps[2], K.circum.steps[3]],
      why: 'Angle bisectors meet at the incentre, which is the same distance from the sides, not the vertices. The perpendicular bisectors of the sides are needed.', test: () => true },
  ];
  const item = rng.pick(bank);
  return q({
    prompt: `${n} tries to ${item.goal}, using the steps below. Which step is wrong?`,
    visual: { type: 'table', headers: ['Step', 'What to do'], rows: item.steps.map((s, j) => [`${j + 1}`, s]) },
    correct: `Step ${item.bad + 1}`,
    wrong: [0, 1, 2, 3].filter((j) => j !== item.bad).map((j) => ({ value: `Step ${j + 1}`, why: `Step ${j + 1} is a correct part of this construction.` })),
    solution: [`Step ${item.bad + 1} is wrong.`, item.why],
    rule: 2,
    skill: 'spot the error',
    check: () => (item.test() ? true : 'the faulty step is not actually faulty'),
  });
}

function challengeChain(rng) {
  const r = rng.int(2, 12);
  const [from, to] = rng.pick([['tri', 'hexP'], ['tri', 'sq'], ['sq', 'tri'], ['sq', 'hexP'], ['hexP', 'tri'], ['hexP', 'sq']]);
  const S = (k) => sqCm(sqrtTex(k));
  const side = (n) => 2 * r * Math.sin(Math.PI / n); // a chord of a 360°/n arc
  const info = {
    tri: { give: R`an equilateral triangle with sides of \(${sqrtTex(3 * r * r)}\) cm`, tex: S(3 * r * r), val: side(3), back: R`The triangle's side is \(r\sqrt{3}\), so \(r\sqrt{3} = ${sqrtTex(3 * r * r)}\) and \(r = ${r}\).`, ask: 'the side of an equilateral triangle', fwd: R`Equilateral triangle: side \(= r\sqrt{3} = ${sqrtTex(3 * r * r)}\) cm.` },
    sq: { give: R`a square with sides of \(${sqrtTex(2 * r * r)}\) cm`, tex: S(2 * r * r), val: side(4), back: R`The square's side is \(r\sqrt{2}\), so \(r\sqrt{2} = ${sqrtTex(2 * r * r)}\) and \(r = ${r}\).`, ask: 'the side of a square', fwd: R`Square: side \(= r\sqrt{2} = ${sqrtTex(2 * r * r)}\) cm.` },
    hexP: { give: R`a regular hexagon with a perimeter of \(${6 * r}\) cm`, tex: cm(6 * r), val: 6 * side(6), back: R`Each hexagon side equals the radius, so \(r = \frac{${6 * r}}{6} = ${r}\).`, ask: 'the perimeter of a regular hexagon', fwd: R`Hexagon: perimeter \(= 6r = ${6 * r}\) cm.` },
  };
  const wrongs = { tri: [S(2 * r * r), cm(r * 3), S(12 * r * r)], sq: [S(3 * r * r), cm(2 * r), S(8 * r * r)], hexP: [cm(3 * r), cm(12 * r), S(27 * r * r)] }[to];
  return q({
    prompt: R`A circle has ${info[from].give} inscribed in it. What is ${info[to].ask} inscribed in the same circle?`,
    correct: info[to].tex,
    wrong: [{ value: wrongs[0], why: 'Find the radius first, then use the formula for the shape that is asked for.' }, ...wrongs.slice(1)],
    solution: [info[from].back, info[to].fwd],
    rule: 3,
    skill: 'inscribed polygons, backwards',
    check: () => (near(info.tri.val, r * Math.sqrt(3)) && near(info.sq.val, r * Math.SQRT2) && near(info.hexP.val, 6 * r) ? true : 'side formulas disagree with chord lengths'),
  });
}

function challengeTangentAngle(rng) {
  const th = rng.int(12, 30) * 5; // ∠TOS
  const r = 3;
  const fig = figure('tangent', rng, { r, d: r / Math.cos(rad(th / 2)) });
  const tps = 180 - th;
  const back = rng.bool();
  return q({
    prompt: back
      ? R`Tangents from \(P\) touch a circle with centre \(O\) at \(T\) and \(S\), as constructed here. \(m\angle TPS = ${deg(tps)}\). Find \(m\angle TOS\).`
      : R`Tangents from \(P\) touch a circle with centre \(O\) at \(T\) and \(S\), as constructed here. \(m\angle TOS = ${deg(th)}\). Find \(m\angle TPS\).`,
    visual: fig.visual,
    correct: back ? th : tps, fmt: degM,
    wrong: back
      ? [{ value: 2 * tps < 360 ? 2 * tps : null, why: R`\(\angle TPS\) is not an inscribed angle (its vertex is outside the circle), so \(\angle TOS\) is not twice it. Use the right angles at \(T\) and \(S\).` }, { value: th / 2, why: R`That is \(\angle TOP\), half of \(\angle TOS\).` }, { value: tps, why: 'The two angles are supplementary, not equal.' }, 360 - tps]
      : [{ value: th / 2, why: R`\(P\) is outside the circle, so \(\angle TPS\) is not an inscribed angle. Use the right angles at \(T\) and \(S\).` }, { value: 90 - th / 2, why: R`That is \(\angle OPT\), half of \(\angle TPS\).` }, { value: th, why: 'The two angles are supplementary, not equal.' }, 360 - th],
    solution: [
      R`\(\angle OTP = \angle OSP = 90^\circ\), because each tangent is perpendicular to the radius at the point of contact (in the construction, each is inscribed in a semicircle on \(\overline{OP}\)).`,
      R`The angles of quadrilateral \(OTPS\) add to \(360^\circ\): \(m\angle TOS + m\angle TPS = 360 - 90 - 90 = 180\).`,
      back ? R`\(m\angle TOS = 180 - ${tps} = ${th}\), so \(${deg(th)}\).` : R`\(m\angle TPS = 180 - ${th} = ${tps}\), so \(${deg(tps)}\).`,
    ],
    rule: 5,
    skill: 'tangents and angles',
    check: () => (near(angleAt(fig.T, fig.P, fig.S), tps, 1e-6) && near(angleAt(fig.T, fig.O, fig.S), th, 1e-6) ? fig.check() : 'angles do not match the figure'),
  });
}

// ───────────── the topic ─────────────

const exBis = figure('bisectSeg', STILL, { L: 8, r: 5, tilt: 0 });
const exAngle = figure('copyAngle', STILL, { a: 70 });
const exHex = figure('tri', STILL, { r: 5 });
const exTan = figure('tangent', STILL, { r: 3, d: 7.5, dir: 10 });

export default {
  id: 'constructions',
  title: 'Constructions',
  summary: 'Copy, bisect and build figures with a compass and straightedge, and explain why each construction works.',
  standards: ['CCSS G-CO.D.12', 'CCSS G-CO.D.13', 'CCSS G-C.A.3', 'CCSS G-C.A.4'],

  explain: {
    intro: R`A **construction** uses only two tools: a **straightedge** to draw lines through points, and a **compass** to draw arcs whose points are all the same distance from a centre. No measuring. Every construction works because of one or two facts you already know, most often that two arcs of the same radius give equal lengths.`,
    rules: [
      { title: 'Equal radii', text: R`Every point on an arc is one compass opening from its centre. If arcs of radius \(r\) centred at \(A\) and at \(B\) cross at \(P\), then \(PA = PB = r\). Copying a segment uses this: open the compass to \(AB\), move the point to \(C\), and mark \(D\) on a ray, so \(CD = AB\).`, example: R`\(AB = 8\) cm and arcs of radius \(5\) cm from \(A\) and \(B\) cross at \(P\) and \(Q\): \(APBQ\) has four sides of \(5\) cm.` },
      { title: 'Copying and bisecting an angle', text: R`Both constructions build two triangles with three pairs of equal sides, so they are congruent by **SSS** and their matching angles are equal. To bisect \(\angle V\): an arc from \(V\) crosses the sides at \(P\) and \(Q\); equal arcs from \(P\) and \(Q\) cross at \(R\); ray \(VR\) is the bisector.`, example: R`Copying \(\angle BAC\) to \(D\): \(DE = AB\) and \(DF = AC\) (same opening) and \(EF = BC\), so \(\triangle DEF \cong \triangle ABC\) and \(\angle D \cong \angle A\).` },
      { title: 'Perpendiculars and parallels', text: R`A point the same distance from \(A\) and \(B\) is on the **perpendicular bisector** of \(\overline{AB}\). So arcs of one radius (more than half of \(AB\)) from \(A\) and \(B\) cross at two points that fix that line. A perpendicular through a point \(P\), on or off a line, makes \(P\) the midpoint or apex of such a pair first. A parallel through \(P\) copies an angle to make congruent corresponding angles.`, example: R`\(AB = 10\) and the arcs have radius \(13\): the crossing points are \(\sqrt{13^2 - 5^2} = 12\) from \(\overline{AB}\), so they are \(24\) apart.` },
      { title: 'Polygons inscribed in a circle', text: R`With the compass set to the radius \(r\), step round the circle: each step makes an equilateral triangle with the centre, a \(60^\circ\) arc, so six steps close up. Join all six points for a regular **hexagon** (side \(r\)); join every other point for an **equilateral triangle** (side \(r\sqrt{3}\)). A diameter and its perpendicular bisector give a **square** (side \(r\sqrt{2}\)).`, example: R`Radius \(5\) cm: hexagon side \(5\) cm, triangle side \(5\sqrt{3}\) cm, square side \(5\sqrt{2}\) cm.` },
      { title: 'Circumcentre and incentre', text: R`The perpendicular bisectors of a triangle's sides meet at the **circumcentre**, the same distance from all three vertices: it is the centre of the circle through them. The angle bisectors meet at the **incentre**, the same distance from all three sides: it is the centre of the largest circle inside. Equidistant from three points → circumcentre; from three lines → incentre.`, example: R`A well the same distance from three houses goes at the circumcentre. The largest round fountain in a triangular garden is centred at the incentre.` },
      { title: 'A tangent from an outside point', text: R`To draw a tangent from \(P\) to a circle with centre \(O\), bisect \(\overline{OP}\) at \(M\) and draw the circle centred at \(M\) through \(O\) and \(P\). It meets the circle at \(T\) and \(S\). \(\angle OTP\) is inscribed in a semicircle, so it is \(90^\circ\), and a line perpendicular to a radius at the circle is a tangent.`, example: R`Radius \(5\) and \(OP = 13\): \(PT = \sqrt{13^2 - 5^2} = 12\).` },
    ],
    vocab: [
      { term: 'compass and straightedge', def: 'The two construction tools: a compass draws arcs and circles, a straightedge draws lines. Neither is used to measure.' },
      { term: 'perpendicular bisector', def: 'The line through the midpoint of a segment at a right angle to it. Its points are the same distance from both ends.' },
      { term: 'angle bisector', def: 'The ray that splits an angle into two congruent angles. Its points are the same distance from both sides.' },
      { term: 'circumcentre', def: 'Where the perpendicular bisectors of a triangle\'s sides meet; the centre of the circumscribed circle, through all three vertices.' },
      { term: 'incentre', def: 'Where the angle bisectors of a triangle meet; the centre of the inscribed circle, which touches all three sides.' },
      { term: 'centroid', def: 'Where the medians of a triangle meet (a median joins a vertex to the midpoint of the opposite side). It is the balance point.' },
      { term: 'inscribed polygon', def: 'A polygon with every vertex on a circle.' },
    ],
    mistakes: [
      'Opening the compass to less than half of the segment when bisecting it. The arcs then never meet.',
      'Changing the compass opening between two arcs that must match.',
      'Mixing up the two centres: perpendicular bisectors give the point equidistant from the vertices, angle bisectors give the point equidistant from the sides.',
      R`Taking the side of the inscribed equilateral triangle to be the radius. That is the hexagon's side; the triangle's side is \(r\sqrt{3}\).`,
    ],
    visual: exTan.visual,
  },

  examples: [
    {
      title: 'The perpendicular bisector, and why it works',
      problem: R`Construct the perpendicular bisector of \(\overline{AB}\), with \(AB = 8\) cm, using a compass opening of \(5\) cm. How far is each crossing point from \(\overline{AB}\)?`,
      steps: [
        R`\(5 > \frac{8}{2} = 4\), so arcs of radius \(5\) cm from \(A\) and \(B\) will cross. Draw them above and below \(\overline{AB}\); they cross at \(P\) and \(Q\).`,
        R`\(PA = PB = 5\) and \(QA = QB = 5\). Points equidistant from \(A\) and \(B\) lie on the perpendicular bisector, so line \(PQ\) is it. It meets \(\overline{AB}\) at the midpoint \(M\).`,
        R`In right \(\triangle AMP\): \(AM = 4\) and \(AP = 5\), so \(PM = \sqrt{25 - 16} = 3\) cm.`,
      ],
      answer: R`Line \(PQ\); each crossing point is \(3\) cm from \(\overline{AB}\)`,
      visual: exBis.visual,
    },
    {
      title: 'Why copying an angle works',
      problem: R`\(\angle BAC = 70^\circ\) is copied to a ray from \(D\) as shown. Explain why \(\angle EDF = 70^\circ\).`,
      steps: [
        R`The arcs at \(A\) and \(D\) have the same opening, so \(AB = AC = DE = DF\).`,
        R`The arc centred at \(E\) was drawn with the opening \(BC\), so \(EF = BC\).`,
        R`So \(\triangle BAC \cong \triangle EDF\) by SSS, and the matching angles are equal: \(\angle EDF = \angle BAC = 70^\circ\).`,
      ],
      answer: R`SSS congruence: \(\angle EDF = 70^\circ\)`,
      visual: exAngle.visual,
    },
    {
      title: 'A triangle and a hexagon in one circle',
      problem: R`Six points are stepped round a circle of radius \(5\) cm with the compass set to the radius. Find the perimeter of the hexagon they make and the side of the equilateral triangle \(ACE\).`,
      steps: [
        R`Each step is one radius, so each hexagon side is \(5\) cm and the perimeter is \(30\) cm.`,
        R`\(A\) and \(C\) are two steps apart, so \(\angle AOC = 120^\circ\). The perpendicular from \(O\) splits \(\triangle AOC\) into two 30-60-90 triangles with hypotenuse \(5\).`,
        R`Half of \(AC\) is \(\frac{5\sqrt{3}}{2}\), so \(AC = 5\sqrt{3} \approx 8.66\) cm.`,
      ],
      answer: R`Hexagon perimeter \(30\) cm; triangle side \(5\sqrt{3}\) cm`,
      visual: exHex.visual,
    },
    {
      title: 'Word problem: a well for three houses',
      word: true,
      problem: R`Houses stand at \(A(1, 2)\), \(B(7, 2)\) and \(C(7, 10)\) on a map grid. Where should a well go so that it is the same distance from all three, and how far is that?`,
      steps: [
        'The well is the circumcentre, on the perpendicular bisector of each side.',
        R`\(\overline{AB}\) is horizontal with midpoint \((4, 2)\), so its perpendicular bisector is \(x = 4\). \(\overline{BC}\) is vertical with midpoint \((7, 6)\), so its perpendicular bisector is \(y = 6\).`,
        R`They meet at \((4, 6)\). Check: the distance to \(A\) is \(\sqrt{3^2 + 4^2} = 5\), and to \(B\) and \(C\) it is also \(5\).`,
      ],
      answer: R`At \((4, 6)\), \(5\) units from each house`,
      visual: { type: 'plot', x: [-1, 11], y: [0, 12], square: true, points: [{ x: 1, y: 2, label: 'A' }, { x: 7, y: 2, label: 'B' }, { x: 7, y: 10, label: 'C' }, { x: 4, y: 6, label: 'well' }], segments: [{ from: [4, 0], to: [4, 12], dashed: true }, { from: [-1, 6], to: [11, 6], dashed: true }], param: [{ x: (t) => 4 + 5 * Math.cos(t), y: (t) => 6 + 5 * Math.sin(t), t: [0, 2 * Math.PI], color: 'c' }], alt: 'Houses at A(1, 2), B(7, 2) and C(7, 10). The dashed lines x = 4 and y = 6 cross at the well, (4, 6), and a circle of radius 5 centred there passes through all three houses.' },
    },
  ],

  models: [
    {
      id: 'bisector-arcs',
      title: 'Arcs for a perpendicular bisector',
      intro: 'Set the length of AB and the compass opening. See where the arcs cross.',
      inputs: [
        { name: 'd', label: 'Length of AB (cm)', type: 'int', min: 2, max: 30, value: 10 },
        { name: 'r', label: 'Compass opening (cm)', type: 'number', min: 0.5, max: 30, step: 0.5, value: 13 },
      ],
      compute({ d, r }) {
        if (r <= d / 2) return { error: `The arcs only cross if the opening is more than half of AB, which is ${num(d / 2)} cm. Choose a larger opening.` };
        const h = Math.sqrt(r * r - (d * d) / 4);
        const fig = figure('bisectSeg', STILL, { L: d, r, tilt: 0 });
        return {
          problem: R`\(AB = ${d}\) cm. Arcs of radius \(${num(r)}\) cm are drawn from \(A\) and from \(B\).`,
          steps: [
            R`\(${num(r)} > \frac{${d}}{2} = ${num(d / 2)}\), so the arcs cross, at \(P\) and \(Q\). Equal radii: \(PA = PB = QA = QB = ${num(r)}\) cm.`,
            R`\(P\) and \(Q\) are each the same distance from \(A\) and \(B\), so line \(PQ\) is the perpendicular bisector. It meets \(\overline{AB}\) at its midpoint \(M\), with \(AM = ${num(d / 2)}\) cm.`,
            R`Right \(\triangle AMP\): \(PM = \sqrt{${num(r)}^2 - ${num(d / 2)}^2} ${ap(h)} ${num(h, { places: 2 })}\) cm, so \(PQ ${ap(2 * h)} ${num(2 * h, { places: 2 })}\) cm.`,
            R`\(APBQ\) is a rhombus with perimeter \(4 \cdot ${num(r)} = ${num(4 * r)}\) cm.`,
          ],
          answer: R`\(PQ ${ap(2 * h)} ${num(2 * h, { places: 2 })}\) cm; \(PA = PB = ${num(r)}\) cm`,
          visual: draw(fig.f, `Segment AB, ${d} cm long. Arcs of radius ${num(r)} cm centred at A and at B cross at P and Q, and line PQ crosses AB at its midpoint M.`),
        };
      },
    },
    {
      id: 'garden-fountain',
      title: 'Word problem: a fountain and a fence',
      word: true,
      intro: 'A garden is a right triangle. Set its two legs in metres.',
      inputs: [
        { name: 'a', label: 'First leg (m)', type: 'int', min: 1, max: 60, value: 9 },
        { name: 'b', label: 'Second leg (m)', type: 'int', min: 1, max: 60, value: 12 },
      ],
      compute({ a, b }) {
        const c = Math.hypot(a, b);
        const inr = (a + b - c) / 2;
        const fig = figure('incentre', STILL, { tri: [[0, 0], [a, 0], [0, b]] });
        const cT = Number.isInteger(Math.round(c * 1e9) / 1e9) ? num(Math.round(c)) : num(c, { places: 2 });
        return {
          problem: R`A garden is a right triangle with legs \(${a}\) m and \(${b}\) m. Find the radius of the largest round fountain that fits inside, and of a round fence through the three corners.`,
          steps: [
            R`Hypotenuse: \(\sqrt{${a}^2 + ${b}^2} = \sqrt{${a * a + b * b}} ${ap(c)} ${cT}\) m.`,
            R`The fountain touches all three sides, so it is centred at the incentre (where the angle bisectors meet). Splitting the garden into three triangles of height \(r\): \(\frac{1}{2} \cdot ${a} \cdot ${b} = \frac{1}{2} r (${a} + ${b} + ${cT})\).`,
            R`\(r = \frac{${a} \cdot ${b}}{${a} + ${b} + ${cT}} ${ap(inr)} ${num(inr, { places: 2 })}\) m. (For a right triangle this is also \(\frac{a + b - c}{2}\).)`,
            R`The fence goes through the corners, so it is centred at the circumcentre: the midpoint of the hypotenuse, a diameter. Radius \(${ap(c)} \frac{${cT}}{2} ${ap(c / 2)} ${num(c / 2, { places: 2 })}\) m.`,
          ],
          answer: R`Fountain radius \(${ap(inr)} ${num(inr, { places: 2 })}\) m; fence radius \(${ap(c / 2)} ${num(c / 2, { places: 2 })}\) m`,
          visual: draw(fig.f, `A right-triangle garden with legs ${a} m and ${b} m. The bisectors of two angles cross at the incentre I, and the circle centred at I touches all three sides.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyIdentify, easyRadius, easyWhichCentre],
    medium: [mediumSteps, mediumWhy, mediumEquidistant],
    hard: [hardInscribed, hardWell, hardTangent, hardFountain],
    challenge: [challengeArcs, challengeSpotError, challengeChain, challengeTangentAngle],
  },
};
