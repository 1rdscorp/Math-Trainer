import { R, q, frac, Frac, num, paren, product, terms, sqrtTex, checkEqual } from '../../lib/index.js';
import { M, V, Pt, vadd, vsub, vscale, vdot, vcross, vlen2, vlen, isZero, veq, parallel, rvec, quadVec, vgcd, zeros, orthTo, primitive, rootOver, exactCos, exactSin, angleTex, rad, negTex, planeTex, normPlane, samePlane, lineTex, sameLine, anglePair, COS_TEX, squareWindow } from './_shared.js';

const dotWork = (u, v) => u.map((x, i) => product(x, v[i])).join(' + ');
const crossWork = (u, v) => R`\langle ${product(u[1], v[2])} - ${product(u[2], v[1])},\; ${product(u[2], v[0])} - ${product(u[0], v[2])},\; ${product(u[0], v[1])} - ${product(u[1], v[0])} \rangle`;
/** Symmetric equations of the line through p with direction v (every component of v non-zero). */
const symTex = (p, v) => p.map((c, i) => `\\frac{${terms([[1, 'xyz'[i]], [-c, '']])}}{${v[i]}}`).join(' = ');
/** Negate the first non-zero component: a direction that is not parallel to v when v has two or more non-zero components. */
const flipOne = (v) => {
  const i = v.findIndex((x) => x !== 0);
  return v.map((x, j) => (j === i ? -x : x));
};
const jFlip = (n) => [n[0], n[1] === 0 ? 0 : -n[1], n[2]];
/** a(x − x₀) + b(y − y₀) + c(z − z₀), for showing the point-normal form. */
const pointNormal = (n, p) => terms(n.map((c, i) => [c, p[i] === 0 ? 'xyz'[i] : `(${terms([[1, 'xyz'[i]], [-p[i], '']])})`]));

// ───────────── Easy ─────────────

function easyLineParam(rng) {
  let p;
  let v;
  do {
    p = rvec(rng, -5, 5);
    v = rvec(rng, -4, 4);
  } while (parallel(p, v) || zeros(v) > 1);
  const wrong = [
    [v, p, R`The point supplies the constant terms and the direction vector supplies the coefficients of \(t\).`],
    [vscale(p, -1), v, R`At \(t = 0\) the equations must give the point itself, with its own signs.`],
    [p, flipOne(v)],
    [vadd(p, v), [v[2], v[0], v[1]]],
    [p, vadd(v, [1, 1, 0])],
    [vadd(p, [0, 1, 0]), flipOne(v)],
  ].filter(([a, b]) => !isZero(b) && !sameLine(p, v, a, b));
  return q({
    prompt: R`Find parametric equations for the line through \(P${Pt(p)}\) parallel to \(\mathbf{v} = ${V(v)}\).`,
    correct: M(lineTex(p, v)),
    wrong: wrong.map(([a, b, why]) => (why ? { value: M(lineTex(a, b)), why } : M(lineTex(a, b)))),
    solution: [
      R`A line through \((x_{0}, y_{0}, z_{0})\) with direction \(\langle a, b, c \rangle\) is \(x = x_{0} + at\), \(y = y_{0} + bt\), \(z = z_{0} + ct\).`,
      R`Here the point is \(${Pt(p)}\) and the direction is \(${V(v)}\).`,
      R`\(${lineTex(p, v)}\).`,
    ],
    rule: 0,
    skill: 'equations of a line',
    check: () => (wrong.every(([a, b]) => !sameLine(p, v, a, b)) && wrong.length >= 3 ? true : 'a wrong choice describes the same line'),
  });
}

function easyPlaneNormal(rng) {
  let n;
  do n = rvec(rng, -5, 5);
  while (vgcd(n) !== 1);
  const p = rvec(rng, -4, 4);
  const d = vdot(n, p);
  const wrong = [
    [n, -d, R`The right side is \(\mathbf{n} \cdot \langle x_{0}, y_{0}, z_{0} \rangle = ${d}\). Check its sign.`],
    [p, d, 'The coefficients of x, y and z are the components of the normal vector, not the coordinates of the point.'],
    [n, 0, 'That plane passes through the origin. Substitute the given point to find the right side.'],
    [n, n[0] + n[1] + n[2]],
    [n, d + 1],
    [n, d - 2],
  ].filter(([a, b]) => !isZero(a) && !samePlane(n, d, a, b));
  return q({
    prompt: R`Find an equation of the plane through \(P${Pt(p)}\) with normal vector \(\mathbf{n} = ${V(n)}\).`,
    correct: M(planeTex(n, d)),
    wrong: wrong.map(([a, b, why]) => (why ? { value: M(planeTex(a, b)), why } : M(planeTex(a, b)))),
    solution: [
      R`A plane through \((x_{0}, y_{0}, z_{0})\) with normal \(\langle a, b, c \rangle\) is \(a(x - x_{0}) + b(y - y_{0}) + c(z - z_{0}) = 0\).`,
      R`\(${pointNormal(n, p)} = 0\).`,
      R`Expand and move the constants to the right: \(${planeTex(n, d)}\). (The right side is \(\mathbf{n} \cdot ${V(p)} = ${dotWork(n, p)} = ${d}\).)`,
    ],
    rule: 1,
    skill: 'equation of a plane',
    check: () => (vdot(n, p) === d && wrong.every(([a, b]) => !samePlane(n, d, a, b)) ? true : 'plane does not pass through P'),
  });
}

function easyPointOnLine(rng) {
  let p;
  let v;
  do {
    p = rvec(rng, -5, 5);
    v = rvec(rng, -3, 3);
  } while (zeros(v) > 0);
  const t0 = rng.pick([-2, -1, 2, 3]);
  const X = vadd(p, vscale(v, t0));
  const on = (x) => parallel(vsub(x, p), v);
  const wrong = [[X[0], X[1], p[2] - t0 * v[2]], vadd(p, vscale(v, t0).map((x, i) => (i === 0 ? x : 0))), v, vadd(X, [0, 1, 0]), vadd(X, [1, 0, -1]), vadd(p, [1, 1, 1])].filter((x) => !on(x));
  const tOf = (i) => R`\(${'xyz'[i]} = ${X[i]}\) gives \(t = ${t0}\)`;
  return q({
    prompt: R`Which point lies on the line \(${lineTex(p, v)}\)?`,
    correct: M(Pt(X)),
    wrong: wrong.map((x) => M(Pt(x))),
    solution: [
      R`A point is on the line when one value of \(t\) produces all three of its coordinates.`,
      R`For \(${Pt(X)}\): ${tOf(0)}, ${tOf(1)} and ${tOf(2)}.`,
      R`The same \(t\) works every time, so \(${Pt(X)}\) is on the line. For each other choice the three equations ask for different values of \(t\).`,
    ],
    rule: 0,
    skill: 'points on a line',
    check: () => (on(X) && wrong.every((x) => !on(x)) ? true : 'point test failed'),
  });
}

function easyNormalRead(rng) {
  let n;
  do n = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  while (vgcd(n) !== 1);
  const d = rng.nonzero(-9, 9);
  const k = rng.pick([1, 1, 1, 2, -1]);
  const ans = vscale(n, k);
  const wrong = [
    [[n[0], n[1], d], 'The constant on the right side is not part of the normal vector.'],
    [[n[1], -n[0], 0], R`That vector is parallel to the plane: its dot product with \(${V(n)}\) is 0.`],
    [n.map(Math.abs), 'Keep the sign of each coefficient.'],
    [[n[1], n[2], n[0]]],
    [[n[0], n[1], -n[2]]],
    [[-n[0], n[1], n[2]]],
  ].filter(([w]) => !parallel(w, n));
  return q({
    prompt: R`Which vector is normal (perpendicular) to the plane \(${planeTex(n, d)}\)?`,
    correct: M(V(ans)),
    wrong: wrong.map(([w, why]) => (why ? { value: M(V(w)), why } : M(V(w)))),
    solution: [
      R`In \(ax + by + cz = d\) the coefficients form a normal vector \(\langle a, b, c \rangle\).`,
      R`Here that is \(${V(n)}\).${k === 1 ? '' : R` Any non-zero multiple is also normal to the plane, and \(${V(ans)} = ${k === -1 ? '-' : k}${V(n)}\).`}`,
    ],
    rule: 1,
    skill: 'normal vectors',
    check: () => (parallel(ans, n) && wrong.every(([w]) => !parallel(w, n)) ? true : 'normal test failed'),
  });
}

const SURFACES = { ell: 'ellipsoid', h1: 'hyperboloid of one sheet', h2: 'hyperboloid of two sheets', cone: 'elliptic cone', ep: 'elliptic paraboloid', hp: 'hyperbolic paraboloid' };
const CONFUSED = { ell: ['h1', 'ep', 'cone'], h1: ['h2', 'cone', 'ell'], h2: ['h1', 'cone', 'hp'], cone: ['h1', 'h2', 'ep'], ep: ['hp', 'ell', 'cone'], hp: ['ep', 'h1', 'h2'] };
const REASON = {
  ell: 'All three variables are squared, every squared term is positive and the right side is 1.',
  h1: 'All three variables are squared and the right side is 1. Exactly one squared term is negative.',
  h2: 'All three variables are squared and the right side is 1. Two squared terms are negative.',
  cone: 'All three variables are squared and there is no constant term: one square equals the sum of the other two.',
  ep: 'One variable appears only to the first power, and the two squared terms have the same sign.',
  hp: 'One variable appears only to the first power, and the two squared terms have opposite signs.',
};
function slipNote(right, picked) {
  const pair = `${right}>${picked}`;
  if (pair === 'h1>h2' || pair === 'h2>h1') return 'With 1 on the right side, count the negative squared terms: one gives one sheet, two give two sheets.';
  if (picked === 'cone' && right !== 'ep') return 'A cone has no constant term. Here the constant is not 0.';
  if (right === 'cone' && (picked === 'h1' || picked === 'h2')) return 'With no constant term the surface is a cone, not a hyperboloid.';
  if (pair === 'ep>hp' || pair === 'hp>ep') return 'Compare the signs of the two squared terms: the same sign gives an elliptic paraboloid, opposite signs a hyperbolic paraboloid.';
  if (pair === 'ell>ep') return 'A paraboloid has one variable to the first power only. Here all three are squared.';
  if (pair === 'ep>ell') return 'An ellipsoid needs all three variables squared.';
  return null;
}
const surfaceChoices = (type) => CONFUSED[type].map((k) => ({ value: SURFACES[k], why: slipNote(type, k) }));
const sqT = (v, den) => (den === 1 ? `${v}^{2}` : `\\frac{${v}^{2}}{${den}}`);
function quadricTex(type, [X, Y, Z], [a, b, c]) {
  if (type === 'ell') return `${terms([[1, sqT(X, a)], [1, sqT(Y, b)], [1, sqT(Z, c)]])} = 1`;
  if (type === 'h1') return `${terms([[1, sqT(X, a)], [1, sqT(Y, b)], [-1, sqT(Z, c)]])} = 1`;
  if (type === 'h2') return `${terms([[1, sqT(Z, c)], [-1, sqT(X, a)], [-1, sqT(Y, b)]])} = 1`;
  if (type === 'cone') return `${sqT(Z, c)} = ${terms([[1, sqT(X, a)], [1, sqT(Y, b)]])}`;
  return `${Z} = ${terms([[1, sqT(X, a)], [type === 'ep' ? 1 : -1, sqT(Y, b)]])}`;
}

function easyQuadricName(rng) {
  const type = rng.pick(Object.keys(SURFACES));
  const names = rng.shuffle(['x', 'y', 'z']);
  const dens = rng.sample([1, 4, 9, 16, 25], 3);
  return q({
    prompt: R`What kind of surface is \(${quadricTex(type, names, dens)}\)?`,
    correct: SURFACES[type],
    wrong: surfaceChoices(type),
    solution: [REASON[type], `The surface is ${/^[aeiou]/.test(SURFACES[type]) ? 'an' : 'a'} ${SURFACES[type]}.`],
    rule: 5,
    skill: 'quadric surfaces',
  });
}

// ───────────── Medium ─────────────

function mediumLineTwoPoints(rng) {
  let p;
  let d;
  do {
    p = rvec(rng, -5, 5);
    d = [rng.nonzero(-4, 4), rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
  } while (parallel(p, d));
  const p2 = vadd(p, d);
  const sym = rng.bool();
  const show = (a, b) => M(sym ? symTex(a, b) : lineTex(a, b));
  const wrong = [
    [p, vadd(p, p2), R`The direction is \(Q - P\). Subtract the coordinates.`],
    [d, p, sym ? 'The direction vector belongs in the denominators and the point in the numerators.' : R`The point supplies the constants and the direction vector supplies the coefficients of \(t\).`],
    [vscale(p, -1), d],
    [p, flipOne(d)],
    [p, [d[1], d[0], d[2]]],
    [vadd(p, [1, 0, 0]), d],
  ].filter(([a, b]) => !sameLine(p, d, a, b) && (!sym || zeros(b) === 0));
  return q({
    prompt: R`Find ${sym ? 'symmetric' : 'parametric'} equations for the line through \(P${Pt(p)}\) and \(Q${Pt(p2)}\).`,
    correct: show(p, d),
    wrong: wrong.map(([a, b, why]) => (why ? { value: show(a, b), why } : show(a, b))),
    solution: [
      R`Direction vector: \(\overrightarrow{PQ} = Q - P = ${V(d)}\).`,
      R`Parametric equations from \(P\): \(${lineTex(p, d)}\).`,
      sym ? R`Solve each equation for \(t\) and set the results equal: \(${symTex(p, d)}\).` : R`(Starting from \(Q\) instead gives different equations for the same line.)`,
    ],
    rule: 0,
    skill: 'line through two points',
    check: () => (parallel(vsub(p2, p), d) && wrong.every(([a, b]) => !sameLine(p, d, a, b)) && wrong.length >= 3 ? true : 'line test failed'),
  });
}

function mediumPlaneThreePoints(rng) {
  let P;
  let a;
  let b;
  let n;
  do {
    P = rvec(rng, -3, 3);
    a = rvec(rng, -3, 3);
    b = rvec(rng, -3, 3);
    n = vcross(a, b);
  } while (isZero(n));
  const [Q, S] = [vadd(P, a), vadd(P, b)];
  const [nn, d] = normPlane(n, vdot(n, P));
  const through = (m) => normPlane(m, vdot(m, P));
  const wrong = [
    [...through(jFlip(n)), R`The middle component of the cross product is \(u_{3}v_{1} - u_{1}v_{3}\). Check its sign.`],
    [...through(a), R`\(\overrightarrow{PQ}\) lies in the plane. The normal must be perpendicular to both \(\overrightarrow{PQ}\) and \(\overrightarrow{PR}\).`],
    [nn, -d],
    [nn, d + 1],
    [...through([n[0], n[1], -n[2]])],
    [nn, d - 2],
  ].filter(([m, e]) => !isZero(m) && !samePlane(nn, d, m, e));
  return q({
    prompt: R`Find an equation of the plane through \(P${Pt(P)}\), \(Q${Pt(Q)}\) and \(R${Pt(S)}\).`,
    correct: M(planeTex(nn, d)),
    wrong: wrong.map(([m, e, why]) => (why ? { value: M(planeTex(m, e)), why } : M(planeTex(m, e)))),
    solution: [
      R`Two vectors in the plane: \(\overrightarrow{PQ} = ${V(a)}\) and \(\overrightarrow{PR} = ${V(b)}\).`,
      R`A normal vector is their cross product: \(${crossWork(a, b)} = ${V(n)}\)${veq(n, nn) ? '' : R`, which is parallel to \(${V(nn)}\)`}.`,
      R`Use the point \(P\): \(${pointNormal(nn, P)} = 0\).`,
      R`\(${planeTex(nn, d)}\).`,
    ],
    rule: 1,
    skill: 'plane through three points',
    check: () => ([P, Q, S].every((x) => vdot(nn, x) === d) && !isZero(nn) ? true : 'a point is not on the plane'),
  });
}

function mediumDistancePlane(rng) {
  const { v: n, len } = quadVec(rng, 11);
  const d = rng.int(-9, 9);
  let P;
  do P = rvec(rng, -5, 5);
  while (vdot(n, P) === d);
  const s = vdot(n, P) - d;
  const ans = frac(Math.abs(s), len);
  return q({
    prompt: R`Find the distance from the point \(P${Pt(P)}\) to the plane \(${planeTex(n, d)}\).`,
    correct: ans,
    wrong: [
      { value: Math.abs(s), why: R`Divide by the length of the normal vector, \(|\mathbf{n}| = ${len}\).` },
      { value: frac(Math.abs(vdot(n, P) + d), len), why: R`The numerator is \(|ax_{0} + by_{0} + cz_{0} - d|\): subtract the right side of the plane's equation.` },
      { value: frac(Math.abs(vdot(n, P)), len), why: R`Subtract \(d = ${d}\) in the numerator before taking the absolute value.` },
      frac(Math.abs(s), len * len),
    ],
    solution: [
      R`For the plane \(ax + by + cz = d\): distance \(= \dfrac{|ax_{0} + by_{0} + cz_{0} - d|}{\sqrt{a^{2} + b^{2} + c^{2}}}\).`,
      R`Numerator: \(|${dotWork(n, P)} - ${paren(d)}| = |${s}| = ${Math.abs(s)}\).`,
      R`Denominator: \(|\mathbf{n}| = \sqrt{${vlen2(n)}} = ${len}\).`,
      R`Distance \(= ${ans.tex()}\).`,
    ],
    rule: 3,
    skill: 'distance to a plane',
    check: () => {
      const t = s / vlen2(n);
      const foot = vsub(P, vscale(n, t)); // nearest point of the plane
      return Math.abs(vdot(n, foot) - d) < 1e-9 ? checkEqual(ans.value, vlen(vsub(P, foot))) : 'foot of the perpendicular is not on the plane';
    },
  });
}

function mediumLinePlane(rng) {
  let v;
  let n;
  do {
    v = rvec(rng, -3, 3);
    n = rvec(rng, -4, 4);
  } while (vdot(n, v) === 0 || zeros(v) > 1);
  const X = rvec(rng, -4, 4);
  const word = rng.bool(0.4); // a laser beam travels forward from its source, so t > 0
  const t0 = word ? rng.int(1, 3) : rng.pick([-3, -2, -1, 1, 2, 3]);
  const p = vsub(X, vscale(v, t0));
  const d = vdot(n, X);
  const at = (t) => vadd(p, vscale(v, t));
  return q({
    prompt: word
      ? R`A laser beam leaves the point \(${Pt(p)}\) and travels in the direction \(\mathbf{v} = ${V(v)}\). At which point does it strike a flat screen that lies in the plane \(${planeTex(n, d)}\)?`
      : R`At which point does the line \(${lineTex(p, v)}\) meet the plane \(${planeTex(n, d)}\)?`,
    correct: M(Pt(X)),
    wrong: [
      { value: M(Pt(at(-t0))), why: R`Check the sign when solving for \(t\).` },
      { value: M(Pt(p)), why: R`That is the point of the line at \(t = 0\). Substitute the line into the plane's equation to find the right \(t\).` },
      { value: M(Pt([t0, t0, t0])), why: R`\(t = ${t0}\) is the parameter value. Put it back into the line's equations to get the point.` },
      M(Pt(at(t0 + 1))),
      M(Pt(at(t0 - 1))),
    ],
    solution: [
      ...(word ? [R`The beam follows the line \(${lineTex(p, v)}\), with \(t \ge 0\).`] : []),
      R`Substitute the line into the plane: \(${terms(n.map((c, i) => [c, `(${terms([[p[i], ''], [v[i], 't']])})`]))} = ${d}\).`,
      R`Simplify: \(${terms([[vdot(n, p), ''], [vdot(n, v), 't']])} = ${d}\), so \(t = ${t0}\).`,
      R`Put \(t = ${t0}\) into the line: the point is \(${Pt(X)}\).`,
    ],
    rule: 4,
    skill: 'line meets plane',
    check: () => (vdot(n, X) === d && parallel(vsub(X, p), v) && vdot(n, at(-t0)) !== d ? true : 'point is not on both the line and the plane'),
  });
}

function mediumCylindrical(rng) {
  const r = rng.pick([2, 4, 6, 8]);
  const deg = rng.pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]);
  const z = rng.int(-5, 5);
  const [c, cr] = exactCos(deg);
  const [s, sr] = exactSin(deg);
  const x = rootOver(r * c, cr, 2);
  const y = rootOver(r * s, sr, 2);
  const check = () => checkEqual((r * c * Math.sqrt(cr)) / 2, r * Math.cos(rad(deg))) === true && checkEqual((r * s * Math.sqrt(sr)) / 2, r * Math.sin(rad(deg))) === true ? true : 'conversion mismatch';
  if (rng.bool()) {
    return q({
      prompt: R`A point has cylindrical coordinates \((r, \theta, z) = ${Pt([r, angleTex(deg), z])}\). Find its rectangular coordinates.`,
      correct: M(Pt([x, y, z])),
      wrong: [
        { value: M(Pt([y, x, z])), why: R`\(x = r\cos\theta\) and \(y = r\sin\theta\).` },
        { value: M(Pt([negTex(x), y, z])), why: R`Check the quadrant of \(\theta = ${angleTex(deg)}\) for the sign of \(x\).` },
        M(Pt([x, negTex(y), z])),
        M(Pt([negTex(x), negTex(y), z])),
        M(Pt([x, y, r])),
      ],
      solution: [
        R`\(x = r\cos\theta = ${r}\cos ${angleTex(deg)} = ${x}\).`,
        R`\(y = r\sin\theta = ${r}\sin ${angleTex(deg)} = ${y}\).`,
        R`\(z\) is unchanged: \(${Pt([x, y, z])}\).`,
      ],
      rule: 6,
      skill: 'cylindrical coordinates',
      check,
    });
  }
  const other = (deg + 180) % 360;
  const refl = 360 - deg;
  return q({
    prompt: R`A point has rectangular coordinates \(${Pt([x, y, z])}\). Find its cylindrical coordinates \((r, \theta, z)\) with \(0 \le \theta < 2\pi\).`,
    correct: M(Pt([r, angleTex(deg), z])),
    wrong: [
      { value: M(Pt([r, angleTex(other), z])), why: R`Two angles have the same tangent. Choose the one in the quadrant that contains \((x, y)\).` },
      { value: M(Pt([r * r, angleTex(deg), z])), why: R`\(r = \sqrt{x^{2} + y^{2}}\). Take the square root.` },
      M(Pt([r, angleTex(refl), z])),
      M(Pt([r, angleTex((refl + 180) % 360), z])),
      M(Pt([r / 2, angleTex(deg), z])),
    ],
    solution: [
      R`\(r = \sqrt{x^{2} + y^{2}} = ${r}\).`,
      R`\(\cos\theta = \dfrac{x}{r} = ${rootOver(c, cr, 2)}\) and \(\sin\theta = \dfrac{y}{r} = ${rootOver(s, sr, 2)}\), so \(\theta = ${angleTex(deg)}\).`,
      R`\(z\) is unchanged: \(${Pt([r, angleTex(deg), z])}\).`,
    ],
    rule: 6,
    skill: 'cylindrical coordinates',
    check,
  });
}

// ───────────── Hard ─────────────

const RELATIONS = {
  parallel: 'They are parallel and do not meet.',
  identical: 'They are the same line.',
  intersecting: 'They intersect in exactly one point.',
  skew: 'They are skew: not parallel, and they never meet.',
};
function relation(p1, v1, p2, v2) {
  if (parallel(v1, v2)) return parallel(vsub(p2, p1), v1) ? 'identical' : 'parallel';
  return vdot(vsub(p2, p1), vcross(v1, v2)) === 0 ? 'intersecting' : 'skew';
}

function hardLinesRelation(rng) {
  const kind = rng.pick(['parallel', 'intersecting', 'intersecting', 'skew', 'skew', 'identical']);
  let p1;
  let v1;
  let p2;
  let v2;
  do {
    v1 = rvec(rng, -3, 3);
    p1 = rvec(rng, -4, 4);
    const X = vadd(p1, vscale(v1, rng.int(-2, 2)));
    if (kind === 'parallel' || kind === 'identical') {
      v2 = vscale(v1, rng.pick([-2, -1, 2, 3]));
      p2 = kind === 'identical' ? vadd(p1, vscale(v1, rng.pick([-2, -1, 1, 2]))) : vadd(p1, rvec(rng, -3, 3));
    } else {
      v2 = rvec(rng, -3, 3);
      p2 = vadd(vadd(X, vscale(v2, rng.pick([-2, -1, 1, 2]))), kind === 'skew' ? rvec(rng, -2, 2) : [0, 0, 0]);
    }
  } while (relation(p1, v1, p2, v2) !== kind || zeros(v1) > 1 || zeros(v2) > 1);
  const steps = [];
  if (kind === 'parallel' || kind === 'identical') {
    const i = v1.findIndex((x) => x !== 0);
    const t = frac(p2[i] - p1[i], v1[i]);
    const at = p1.map((c, j) => Frac.from(c).add(t.mul(v1[j])));
    const j = at.findIndex((c, m) => !c.eq(p2[m]));
    steps.push(R`Directions: \(\mathbf{v}_{1} = ${V(v1)}\) and \(\mathbf{v}_{2} = ${V(v2)} = ${terms([[v2[i] / v1[i], '\\mathbf{v}_{1}']])}\). The directions are parallel, so the lines are parallel or identical.`);
    steps.push(R`Test one point of \(L_{2}\), say \(${Pt(p2)}\) (from \(s = 0\)), in \(L_{1}\). Matching \(${'xyz'[i]}\) needs \(t = ${t.tex()}\).`);
    steps.push(j < 0 ? R`With that \(t\), \(L_{1}\) gives exactly \(${Pt(p2)}\). The lines share a point and a direction, so they are the same line.` : R`With that \(t\), \(L_{1}\) gives \(${'xyz'[j]} = ${at[j].tex()}\), not \(${p2[j]}\). The point is not on \(L_{1}\), so the lines are parallel and distinct.`);
  } else {
    const [i, j, k] = [[0, 1, 2], [0, 2, 1], [1, 2, 0]].find(([a, b]) => v2[a] * v1[b] - v1[a] * v2[b] !== 0);
    const det = v2[i] * v1[j] - v1[i] * v2[j];
    const [ri, rj] = [p2[i] - p1[i], p2[j] - p1[j]];
    const t = frac(v2[i] * rj - ri * v2[j], det);
    const s = frac(v1[i] * rj - v1[j] * ri, det);
    const z1 = Frac.from(p1[k]).add(t.mul(v1[k]));
    const z2 = Frac.from(p2[k]).add(s.mul(v2[k]));
    const eq = (m) => `${terms([[p1[m], ''], [v1[m], 't']])} = ${terms([[p2[m], ''], [v2[m], 's']])}`;
    steps.push(R`The directions \(${V(v1)}\) and \(${V(v2)}\) are not multiples of each other, so the lines are not parallel.`);
    steps.push(R`Set two pairs of coordinates equal: \(${eq(i)}\) and \(${eq(j)}\). Solving gives \(t = ${t.tex()}\) and \(s = ${s.tex()}\).`);
    steps.push(R`Check the remaining coordinate, \(${'xyz'[k]}\): \(L_{1}\) gives \(${z1.tex()}\) and \(L_{2}\) gives \(${z2.tex()}\).`);
    steps.push(kind === 'intersecting' ? R`They agree, so the lines intersect, at \(${Pt(p1.map((c, m) => Frac.from(c).add(t.mul(v1[m]))))}\).` : 'They disagree, so no point lies on both lines: the lines are skew.');
  }
  return q({
    prompt: R`How are these two lines related?
\(L_{1}\): \(${lineTex(p1, v1)}\)
\(L_{2}\): \(${lineTex(p2, v2, 's')}\)`,
    correct: RELATIONS[kind],
    wrong: Object.keys(RELATIONS).filter((k) => k !== kind).map((k) => RELATIONS[k]),
    solution: steps,
    rule: 2,
    skill: 'parallel, intersecting or skew',
    check: () => {
      // nearest approach, found numerically: minimise |p1 + t·v1 − p2 − s·v2|
      const w = vsub(p1, p2);
      const [a, b, c, d, e] = [vlen2(v1), vdot(v1, v2), vlen2(v2), vdot(v1, w), vdot(v2, w)];
      const den = a * c - b * b;
      const par = Math.abs(den) < 1e-9;
      const t = par ? -d / a : (b * e - c * d) / den;
      const s = par ? 0 : (a * e - b * d) / den;
      const gap = vlen(vsub(vadd(p1, vscale(v1, t)), vadd(p2, vscale(v2, s))));
      const found = par ? (gap < 1e-9 ? 'identical' : 'parallel') : gap < 1e-9 ? 'intersecting' : 'skew';
      return found === kind ? true : `lines are ${found}, not ${kind}`;
    },
  });
}

function hardAnglePlanes(rng) {
  let pair = anglePair(rng, false);
  if (pair.deg === 90 && rng.bool(0.6)) pair = anglePair(rng, false); // keep right angles from dominating
  const { u, v, deg } = pair;
  const acute = deg > 90 ? 180 - deg : deg;
  const d = vdot(u, v);
  const nn = vlen2(u) * vlen2(v);
  const [d1, d2] = [rng.int(-9, 9), rng.int(-9, 9)];
  return q({
    prompt: R`Find the acute angle between the planes \(${planeTex(u, d1)}\) and \(${planeTex(v, d2)}\). (If the planes are perpendicular, the answer is \(90^\circ\).)`,
    correct: acute,
    fmt: (x) => R`\(${x}^\circ\)`,
    wrong: [
      acute !== 90 ? { value: 180 - acute, why: 'That is the obtuse angle between the normals. The angle between two planes is taken to be the acute one.' } : null,
      acute !== 45 && acute !== 90 ? { value: 90 - acute, why: 'The angle between the planes equals the angle between their normal vectors, not its complement.' } : null,
      ...rng.shuffle([30, 45, 60, 90, 120, 135].filter((x) => x !== acute && x !== 180 - acute && x !== 90 - acute)),
    ],
    solution: [
      R`The angle between two planes is the angle between their normals \(\mathbf{n}_{1} = ${V(u)}\) and \(\mathbf{n}_{2} = ${V(v)}\).`,
      R`\(\mathbf{n}_{1} \cdot \mathbf{n}_{2} = ${dotWork(u, v)} = ${d}\) and \(|\mathbf{n}_{1}||\mathbf{n}_{2}| = ${sqrtTex(nn)}\).`,
      d === 0 ? R`The dot product is 0, so the planes are perpendicular: \(90^\circ\).` : R`\(\cos\theta = \dfrac{|\mathbf{n}_{1} \cdot \mathbf{n}_{2}|}{|\mathbf{n}_{1}||\mathbf{n}_{2}|} = \dfrac{${Math.abs(d)}}{${sqrtTex(nn)}} = ${COS_TEX[acute]}\), so \(\theta = ${acute}^\circ\).`,
    ],
    rule: 2,
    skill: 'angle between planes',
    check: () => checkEqual((Math.acos(Math.abs(d) / Math.sqrt(nn)) * 180) / Math.PI, acute, 1e-6, 'angle'),
  });
}

function hardDistanceParallel(rng) {
  const { v: n, len } = quadVec(rng, 11);
  const d1 = rng.int(-9, 9);
  const e = rng.intExcept(-9, 9, [d1]);
  const k = rng.pick([1, 2, 3, -1, -2]);
  const ans = frac(Math.abs(d1 - e), len);
  const word = rng.bool(0.4);
  return q({
    prompt: word
      ? R`The two flat faces of a glass block lie in the parallel planes \(${planeTex(n, d1)}\) and \(${planeTex(vscale(n, k), k * e)}\), with distances in centimeters. How thick is the block?`
      : R`Find the distance between the parallel planes \(${planeTex(n, d1)}\) and \(${planeTex(vscale(n, k), k * e)}\).`,
    correct: ans,
    unit: word ? 'cm' : undefined,
    wrong: [
      k !== 1 ? { value: frac(Math.abs(d1 - k * e), len), why: R`First write both planes with the same normal vector: divide the second equation by \(${k}\).` } : null,
      { value: Math.abs(d1 - e), why: R`Divide by \(|\mathbf{n}| = ${len}\).` },
      frac(Math.abs(d1 + e), len),
      frac(Math.abs(d1 - e), len * len),
      frac(Math.abs(d1 - e) + len, len),
    ],
    solution: [
      k === 1 ? R`Both planes already have the normal \(\mathbf{n} = ${V(n)}\).` : R`Divide the second equation by \(${k}\) so that both planes have the normal \(\mathbf{n} = ${V(n)}\): \(${planeTex(n, e)}\).`,
      R`For parallel planes \(\mathbf{n} \cdot \mathbf{r} = d_{1}\) and \(\mathbf{n} \cdot \mathbf{r} = d_{2}\), the distance is \(\dfrac{|d_{1} - d_{2}|}{|\mathbf{n}|}\).`,
      R`\(\dfrac{|${d1} - ${paren(e)}|}{${len}} = ${ans.tex()}\)${word ? ' cm, the thickness of the block' : ''}.`,
    ],
    rule: 3,
    skill: 'distance between planes',
    check: () => {
      const P = vscale(n, d1 / vlen2(n)); // a point of the first plane
      return checkEqual(ans.value, Math.abs(vdot(vscale(n, k), P) - k * e) / (Math.abs(k) * len));
    },
  });
}

function hardSpherical(rng) {
  const rho = rng.pick([2, 4, 6, 8]);
  const phi = rng.pick([30, 45, 60, 90, 120, 135, 150]);
  const theta = rng.pick([0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]);
  const [sp, spr] = exactSin(phi);
  const [cp, cpr] = exactCos(phi);
  const [st, str] = exactSin(theta);
  const [ct, ctr] = exactCos(theta);
  const x = rootOver(rho * sp * ct, spr * ctr, 4);
  const y = rootOver(rho * sp * st, spr * str, 4);
  const z = rootOver(rho * cp, cpr, 2);
  const check = () => {
    const got = [(rho * sp * ct * Math.sqrt(spr * ctr)) / 4, (rho * sp * st * Math.sqrt(spr * str)) / 4, (rho * cp * Math.sqrt(cpr)) / 2];
    const want = [rho * Math.sin(rad(phi)) * Math.cos(rad(theta)), rho * Math.sin(rad(phi)) * Math.sin(rad(theta)), rho * Math.cos(rad(phi))];
    return got.every((g, i) => Math.abs(g - want[i]) < 1e-9) && Math.abs(Math.hypot(...got) - rho) < 1e-9 ? true : 'conversion mismatch';
  };
  if (rng.bool()) {
    return q({
      prompt: R`A point has spherical coordinates \((\rho, \theta, \phi) = ${Pt([rho, angleTex(theta), angleTex(phi)])}\), where \(\phi\) is measured from the positive \(z\)-axis. Find its rectangular coordinates.`,
      correct: M(Pt([x, y, z])),
      wrong: [
        { value: M(Pt([rootOver(rho * st * cp, str * cpr, 4), rootOver(rho * st * sp, str * spr, 4), rootOver(rho * ct, ctr, 2)])), why: R`The roles of the angles are swapped: \(\theta\) turns around the \(z\)-axis and \(\phi\) tilts down from it.` },
        { value: M(Pt([rootOver(rho * cp * ct, cpr * ctr, 4), rootOver(rho * cp * st, cpr * str, 4), rootOver(rho * sp, spr, 2)])), why: R`\(\phi\) is measured from the positive \(z\)-axis, so \(z = \rho\cos\phi\) and the distance from the axis is \(\rho\sin\phi\).` },
        { value: M(Pt([rootOver(rho * ct, ctr, 2), rootOver(rho * st, str, 2), z])), why: R`The distance from the \(z\)-axis is \(r = \rho\sin\phi\), not \(\rho\).` },
        M(Pt([y, x, z])),
        M(Pt([x, y, negTex(z)])),
        M(Pt([negTex(x), negTex(y), z])),
      ],
      solution: [
        R`\(x = \rho\sin\phi\cos\theta = ${rho} \cdot ${rootOver(sp, spr, 2)} \cdot ${paren2(rootOver(ct, ctr, 2))} = ${x}\).`,
        R`\(y = \rho\sin\phi\sin\theta = ${rho} \cdot ${rootOver(sp, spr, 2)} \cdot ${paren2(rootOver(st, str, 2))} = ${y}\).`,
        R`\(z = \rho\cos\phi = ${rho} \cdot ${paren2(rootOver(cp, cpr, 2))} = ${z}\).`,
      ],
      rule: 6,
      skill: 'spherical coordinates',
      check,
    });
  }
  const spherical = (r, t, p) => M(Pt([r, angleTex(t), angleTex(p)]));
  return q({
    prompt: R`A point has rectangular coordinates \(${Pt([x, y, z])}\). Find its spherical coordinates \((\rho, \theta, \phi)\), with \(0 \le \theta < 2\pi\) and \(\phi\) measured from the positive \(z\)-axis.`,
    correct: spherical(rho, theta, phi),
    wrong: [
      phi !== 90 ? { value: spherical(rho, theta, 180 - phi), why: R`Use \(\cos\phi = \dfrac{z}{\rho}\), keeping the sign of \(z\).` } : null,
      theta !== phi ? { value: spherical(rho, phi, theta), why: R`\(\theta\) is the angle in the \(xy\)-plane and \(\phi\) is the angle from the positive \(z\)-axis.` } : null,
      spherical(rho, (theta + 180) % 360, phi),
      spherical(2 * rho, theta, phi),
      phi < 90 ? spherical(rho, theta, 90 - phi) : spherical(rho, theta, phi - 90 || 45),
    ],
    solution: [
      R`\(\rho = \sqrt{x^{2} + y^{2} + z^{2}} = ${rho}\).`,
      R`\(\cos\phi = \dfrac{z}{\rho} = ${rootOver(cp, cpr, 2)}\), so \(\phi = ${angleTex(phi)}\).`,
      R`In the \(xy\)-plane, \(r = \rho\sin\phi = ${rootOver(rho * sp, spr, 2)}\). Then \(\cos\theta = \dfrac{x}{r} = ${rootOver(ct, ctr, 2)}\) and \(\sin\theta = \dfrac{y}{r} = ${rootOver(st, str, 2)}\), so \(\theta = ${angleTex(theta)}\).`,
      R`\((\rho, \theta, \phi) = ${Pt([rho, angleTex(theta), angleTex(phi)])}\).`,
    ],
    rule: 6,
    skill: 'spherical coordinates',
    check,
  });
}
const paren2 = (tex) => (tex.startsWith('-') ? `\\left(${tex}\\right)` : tex);

function hardQuadric(rng) {
  const type = rng.pick(Object.keys(SURFACES));
  const [X, Y, Z] = rng.shuffle(['x', 'y', 'z']);
  const A = rng.int(1, 9);
  const B = rng.int(1, 9);
  const C = rng.intExcept(1, 9, A === B ? [A] : []); // never a sphere
  const D = rng.int(1, 9) * rng.pick([1, 4]);
  const sym = { X2: `${X}^{2}`, Y2: `${Y}^{2}`, Z2: `${Z}^{2}`, Z, 1: '' };
  const alt = rng.bool();
  // Each form is [left side, right side] as lists of [coefficient, key].
  const forms = {
    ell: alt ? [[[A, 'X2'], [B, 'Y2']], [[D, '1'], [-C, 'Z2']]] : [[[A, 'X2'], [B, 'Y2'], [C, 'Z2']], [[D, '1']]],
    h1: alt ? [[[A, 'X2'], [B, 'Y2']], [[C, 'Z2'], [D, '1']]] : [[[A, 'X2'], [B, 'Y2'], [-C, 'Z2']], [[D, '1']]],
    h2: alt ? [[[C, 'Z2']], [[A, 'X2'], [B, 'Y2'], [D, '1']]] : [[[A, 'X2'], [B, 'Y2'], [-C, 'Z2'], [D, '1']], []],
    cone: alt ? [[[C, 'Z2']], [[A, 'X2'], [B, 'Y2']]] : [[[A, 'X2'], [B, 'Y2'], [-C, 'Z2']], []],
    ep: alt ? [[[A, 'X2'], [B, 'Y2'], [-1, 'Z']], []] : [[[1, 'Z']], [[A, 'X2'], [B, 'Y2']]],
    hp: alt ? [[[B, 'Y2'], [1, 'Z']], [[A, 'X2']]] : [[[1, 'Z']], [[A, 'X2'], [-B, 'Y2']]],
  };
  const [L, Rs] = forms[type];
  const side = (list) => terms(list.map(([c, k]) => [c, sym[k]]));
  const net = { X2: 0, Y2: 0, Z2: 0, Z: 0, 1: 0 }; // everything moved to the left
  L.forEach(([c, k]) => (net[k] += c));
  Rs.forEach(([c, k]) => (net[k] -= c));
  const steps = [];
  if (type === 'ep' || type === 'hp') {
    steps.push(R`\(${Z}\) appears only to the first power. Solve for it: \(${Z} = ${terms([[A, sym.X2], [type === 'ep' ? B : -B, sym.Y2]])}\).`);
    steps.push(`The two squared terms have ${type === 'ep' ? 'the same sign' : 'opposite signs'}, so the surface is ${type === 'ep' ? 'an' : 'a'} ${SURFACES[type]}.`);
  } else if (type === 'cone') {
    steps.push(R`All three variables are squared and there is no constant term: \(${terms([[A, sym.X2], [B, sym.Y2]])} = ${terms([[C, sym.Z2]])}\).`);
    steps.push('One square equals a sum of the other two, so the surface is an elliptic cone.');
  } else {
    const sgn = net[1] < 0 ? 1 : -1; // make the constant on the right positive
    steps.push(R`Put the squared terms on the left and a positive constant on the right: \(${terms([[sgn * net.X2, sym.X2], [sgn * net.Y2, sym.Y2], [sgn * net.Z2, sym.Z2]])} = ${D}\).`);
    steps.push(R`Dividing by \(${D}\) gives 1 on the right and does not change any signs. ${type === 'ell' ? 'No squared term is negative' : type === 'h1' ? 'One squared term is negative' : 'Two squared terms are negative'}, so the surface is ${type === 'ell' ? 'an' : 'a'} ${SURFACES[type]}.`);
  }
  return q({
    prompt: R`What kind of surface is \(${side(L)} = ${side(Rs)}\)?`,
    correct: SURFACES[type],
    wrong: surfaceChoices(type),
    solution: steps,
    rule: 5,
    skill: 'quadric surfaces',
    check: () => {
      let found;
      if (net.Z !== 0) found = net.X2 * net.Y2 > 0 ? 'ep' : 'hp';
      else if (net[1] === 0) found = 'cone';
      else found = ['ell', 'h1', 'h2'][[net.X2, net.Y2, net.Z2].filter((c) => c / -net[1] < 0).length];
      return found === type ? true : `equation is ${found}, not ${type}`;
    },
  });
}

// ───────────── Challenge ─────────────

function challengeIntersectionLine(rng) {
  let n1;
  let n2;
  let c;
  do {
    n1 = rvec(rng, -3, 3);
    n2 = rvec(rng, -3, 3);
    c = vcross(n1, n2);
  } while (isZero(c) || zeros(n1) > 1 || zeros(n2) > 1);
  const X = rvec(rng, -3, 3);
  const [d1, d2] = [vdot(n1, X), vdot(n2, X)];
  const dir = primitive(c);
  const good = (p, v) => !isZero(v) && vdot(n1, p) === d1 && vdot(n2, p) === d2 && parallel(v, c);
  const inFirst = orthTo(n1, 3).filter((w) => vdot(w, n2) !== 0 && vlen2(w) <= 6);
  const off = vadd(X, inFirst.length ? rng.pick(inFirst) : primitive(vcross(n1, c))); // on the first plane only
  const wrong = [
    [X, n1, R`\(${V(n1)}\) is normal to the first plane, so it is perpendicular to the line. The direction of the line is \(\mathbf{n}_{1} \times \mathbf{n}_{2}\).`],
    [off, dir, 'The starting point must satisfy both plane equations. This one satisfies only the first.'],
    [X, primitive(jFlip(c))],
    [X, vadd(n1, n2)],
    [vscale(X, -1), dir],
    [vadd(X, [1, 0, 0]), dir],
  ].filter(([p, v]) => !isZero(v) && !good(p, v));
  return q({
    prompt: R`The planes \(${planeTex(n1, d1)}\) and \(${planeTex(n2, d2)}\) intersect in a line. Which equations describe that line?`,
    correct: M(lineTex(X, dir)),
    wrong: wrong.map(([p, v, why]) => (why ? { value: M(lineTex(p, v)), why } : M(lineTex(p, v)))),
    solution: [
      R`The line lies in both planes, so it is perpendicular to both normals. Its direction is \(\mathbf{n}_{1} \times \mathbf{n}_{2} = ${crossWork(n1, n2)} = ${V(c)}\)${veq(c, dir) ? '' : R`, which is parallel to \(${V(dir)}\)`}.`,
      R`A point on both planes: \(${Pt(X)}\) works, because \(${dotWork(n1, X)} = ${d1}\) and \(${dotWork(n2, X)} = ${d2}\).`,
      R`\(${lineTex(X, dir)}\).`,
    ],
    rule: 2,
    skill: 'intersection of two planes',
    check: () => (good(X, dir) && good(vadd(X, dir), dir) && wrong.every(([p, v]) => !good(p, v)) && wrong.length >= 3 ? true : 'line is not in both planes'),
  });
}

function challengeDistanceLine(rng) {
  let v;
  do v = rvec(rng, -3, 3);
  while (zeros(v) > 1);
  const w = rng.pick(orthTo(v, 4));
  const F = rvec(rng, -3, 3);
  const s = rng.pick([-2, -1, 1, 2]);
  const P = vadd(F, vscale(v, s));
  const Q = vadd(F, w);
  const PQ = vsub(Q, P);
  const cr = vcross(PQ, v);
  const along = s * s * vlen2(v);
  return q({
    prompt: R`Find the distance from the point \(Q${Pt(Q)}\) to the line \(${lineTex(P, v)}\).`,
    correct: M(sqrtTex(vlen2(w))),
    wrong: [
      { value: M(sqrtTex(vlen2(PQ))), why: R`That is the distance from \(Q\) to the point of the line at \(t = 0\), which is not the nearest point.` },
      { value: M(sqrtTex(vlen2(cr))), why: R`Divide the length of the cross product by \(|\mathbf{v}|\).` },
      { value: M(sqrtTex(along)), why: R`That is the length of the projection of \(\overrightarrow{PQ}\) onto the line. The distance is the part of \(\overrightarrow{PQ}\) perpendicular to the line.` },
      M(sqrtTex(vlen2(w) + 1)),
      M(sqrtTex(vlen2(w) + vlen2(v))),
    ],
    solution: [
      R`A point on the line is \(P${Pt(P)}\) and its direction is \(\mathbf{v} = ${V(v)}\). Then \(\overrightarrow{PQ} = ${V(PQ)}\).`,
      R`\(\overrightarrow{PQ} \times \mathbf{v} = ${crossWork(PQ, v)} = ${V(cr)}\).`,
      R`Distance \(= \dfrac{|\overrightarrow{PQ} \times \mathbf{v}|}{|\mathbf{v}|} = \dfrac{\sqrt{${vlen2(cr)}}}{\sqrt{${vlen2(v)}}} = \sqrt{${vlen2(w)}}${sqrtTex(vlen2(w)) === `\\sqrt{${vlen2(w)}}` ? '' : ` = ${sqrtTex(vlen2(w))}`}\).`,
    ],
    rule: 3,
    skill: 'distance to a line',
    check: () => {
      const t = vdot(PQ, v) / vlen2(v); // nearest point of the line
      return vlen2(cr) === vlen2(w) * vlen2(v) ? checkEqual(Math.sqrt(vlen2(w)), vlen(vsub(PQ, vscale(v, t)))) : 'cross product length mismatch';
    },
  });
}

function challengePlaneContaining(rng) {
  let P;
  let v;
  let Q;
  let n;
  do {
    P = rvec(rng, -3, 3);
    v = rvec(rng, -3, 3);
    Q = rvec(rng, -4, 4);
    n = vcross(v, vsub(Q, P));
  } while (isZero(n) || zeros(v) > 1);
  const PQ = vsub(Q, P);
  const [nn, d] = normPlane(n, vdot(n, P));
  const wrong = [
    [...normPlane(v, vdot(v, Q)), R`A plane with normal \(${V(v)}\) is perpendicular to the line. To contain the line, the normal must be perpendicular to the line's direction.`],
    [...normPlane(vcross(v, Q), vdot(vcross(v, Q), P)), R`Use the vector from a point of the line to \(Q\), not the position vector of \(Q\).`],
    [...normPlane(jFlip(n), vdot(jFlip(n), P))],
    [nn, -d],
    [nn, d + 1],
    [nn, d - 1],
  ].filter(([m, e]) => !isZero(m) && !samePlane(nn, d, m, e));
  return q({
    prompt: R`Find an equation of the plane that contains the line \(${lineTex(P, v)}\) and the point \(Q${Pt(Q)}\).`,
    correct: M(planeTex(nn, d)),
    wrong: wrong.map(([m, e, why]) => (why ? { value: M(planeTex(m, e)), why } : M(planeTex(m, e)))),
    solution: [
      R`The plane contains the direction \(\mathbf{v} = ${V(v)}\) and the vector from \(P${Pt(P)}\) (the point at \(t = 0\)) to \(Q\): \(\overrightarrow{PQ} = ${V(PQ)}\).`,
      R`Normal vector: \(\mathbf{v} \times \overrightarrow{PQ} = ${crossWork(v, PQ)} = ${V(n)}\)${veq(n, nn) ? '' : R`, which is parallel to \(${V(nn)}\)`}.`,
      R`Through \(P\): \(${pointNormal(nn, P)} = 0\), which simplifies to \(${planeTex(nn, d)}\).`,
    ],
    rule: 1,
    skill: 'plane containing a line',
    check: () => ([P, vadd(P, v), Q].every((x) => vdot(nn, x) === d) && wrong.length >= 3 ? true : 'the plane misses the line or the point'),
  });
}

const CONICS = { ellipse: 'an ellipse', hyperbola: 'a hyperbola', parabola: 'a parabola', lines: 'a pair of intersecting lines' };

function challengeTrace(rng) {
  const type = rng.pick(Object.keys(SURFACES));
  const names = rng.shuffle(['x', 'y', 'z']);
  const [a, b] = rng.sample([1, 4, 9, 16], 2);
  const c = type === 'cone' ? 1 : rng.pick([1, 4, 9, 16].filter((x) => x !== a && x !== b));
  // Internal form: sq[0]·X² + sq[1]·Y² + sq[2]·Z² + lin·Z = rhs, with X, Y, Z shown as `names`.
  const sq = { ell: [frac(1, a), frac(1, b), frac(1, c)], h1: [frac(1, a), frac(1, b), frac(-1, c)], h2: [frac(-1, a), frac(-1, b), frac(1, c)], cone: [frac(1, a), frac(1, b), frac(-1, c)], ep: [frac(1, a), frac(1, b), frac(0)], hp: [frac(1, a), frac(-1, b), frac(0)] }[type];
  const lin = type === 'ep' || type === 'hp' ? -1 : 0;
  const rhs = type === 'ell' || type === 'h1' || type === 'h2' ? 1 : 0;
  const dens = [a, b, c];
  const i = rng.int(0, 2);
  const small = (den) => rng.pick([0, 1, -1, 2, -2, 3, -3].filter((k) => k * k < den));
  let k;
  let kind;
  if (type === 'ell') [k, kind] = [small(dens[i]), 'ellipse'];
  else if (type === 'h1') {
    k = rng.int(-4, 4);
    kind = i === 2 ? 'ellipse' : k * k === dens[i] ? 'lines' : 'hyperbola';
  } else if (type === 'h2') {
    k = i === 2 ? rng.sign() * (Math.sqrt(c) + rng.int(1, 3)) : rng.int(-4, 4);
    kind = i === 2 ? 'ellipse' : 'hyperbola';
  } else if (type === 'cone') {
    k = rng.bool(0.25) && i !== 2 ? 0 : rng.nonzero(-4, 4);
    kind = i === 2 ? 'ellipse' : k === 0 ? 'lines' : 'hyperbola';
  } else if (type === 'ep') {
    k = i === 2 ? rng.int(1, 6) : rng.int(-4, 4);
    kind = i === 2 ? 'ellipse' : 'parabola';
  } else {
    k = i === 2 ? (rng.bool(0.25) ? 0 : rng.nonzero(-5, 5)) : rng.int(-4, 4);
    kind = i === 2 ? (k === 0 ? 'lines' : 'hyperbola') : 'parabola';
  }
  const [j1, j2] = [0, 1, 2].filter((m) => m !== i);
  const sqTerm = (m) => [sq[m].n < 0 ? -1 : 1, sqT(names[m], dens[m])];
  const right = frac(rhs).sub(sq[i].mul(k * k)).sub(i === 2 ? lin * k : 0);
  const rest = [j1, j2].filter((m) => sq[m].n !== 0).sort((m1, m2) => sq[m2].n - sq[m1].n); // positive squared term first
  const flip = rest.every((m) => sq[m].n < 0) ? -1 : 1; // if both are negative, multiply the equation by −1
  // the equation of the trace, written the way a student would
  const traceTex = lin && i !== 2
    ? `${names[2]} = ${terms([sqTerm(i === 0 ? 1 : 0), [sq[i].mul(k * k), '']])}`
    : type === 'cone' && i !== 2
      ? `${sqT(names[2], c)} = ${terms([sqTerm(j1), [sq[i].mul(k * k), '']])}`
      : `${terms(rest.map((m) => [flip * sqTerm(m)[0], sqTerm(m)[1]]))} = ${right.mul(flip).tex()}`;
  const why = {
    ellipse: 'Both variables are squared, the squared terms have the same sign, and the constant on the other side is positive: an ellipse.',
    hyperbola: 'Both variables are squared and the squared terms have opposite signs: a hyperbola.',
    parabola: 'One variable is squared and the other appears to the first power: a parabola.',
    lines: 'The two squares are equal, so one variable is plus or minus a multiple of the other: two lines that cross.',
  }[kind];
  return q({
    prompt: R`What kind of curve is the trace of the surface \(${quadricTex(type, names, dens)}\) in the plane \(${names[i]} = ${k}\)?`,
    correct: CONICS[kind],
    wrong: Object.keys(CONICS).filter((x) => x !== kind).map((x) => CONICS[x]),
    solution: [R`Set \(${names[i]} = ${k}\) in the equation: \(${traceTex}\).`, why],
    rule: 5,
    skill: 'traces',
    check: () => {
      // conic A·u² + C·v² + D·u + E·v + F = 0 in the two remaining variables
      const [A, C] = [sq[j1].value, sq[j2].value];
      const [D, E] = [0, j2 === 2 ? lin : 0];
      const F = -(rhs - sq[i].value * k * k - (i === 2 ? lin * k : 0));
      const det = A * C * F - (A * E * E + C * D * D) / 4;
      const disc = -4 * A * C;
      let found;
      if (Math.abs(det) < 1e-12) found = disc > 0 ? 'lines' : 'degenerate';
      else if (disc < 0) found = A * det < 0 ? 'ellipse' : 'empty';
      else found = disc > 0 ? 'hyperbola' : 'parabola';
      return found === kind ? true : `trace is ${found}, not ${kind}`;
    },
  });
}

function challengeFindK(rng) {
  const slot = rng.int(0, 2);
  const m = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  let a;
  do a = rvec(rng, -6, 6);
  while (vdot(a, m) === a[slot] * m[slot]);
  const rest = vdot(a, m) - a[slot] * m[slot];
  const k = frac(-rest, m[slot]);
  const planes = rng.bool();
  const [d1, d2] = [rng.int(-9, 9), rng.int(-9, 9)];
  const withK = (list, t = '') => list.map((x, i) => (i === slot ? [1, `k${t}`] : [x, t]));
  const first = planes
    ? `${terms(withK(a).map(([c, s], i) => [c, s + 'xyz'[i]]))} = ${d1}`
    : a.map((x, i) => `${'xyz'[i]} = ${terms([[rng.int(-4, 4), ''], withK(a, 't')[i]])}`).join(',\\; ');
  return q({
    prompt: planes
      ? R`For which value of \(k\) are the planes \(${first}\) and \(${planeTex(m, d2)}\) perpendicular?`
      : R`For which value of \(k\) is the line \(${first}\) parallel to the plane \(${planeTex(m, d2)}\)?`,
    correct: k,
    fmt: (x) => R`\(k = ${num(x)}\)`,
    wrong: [
      { value: k.neg(), why: 'When the known products move to the other side of the equation their sign changes.' },
      { value: frac(-rest), why: R`Divide by the coefficient of \(k\), which is \(${m[slot]}\).` },
      frac(rest + m[slot], m[slot]),
      frac(-rest - m[slot], m[slot]),
    ],
    solution: [
      planes
        ? R`Planes are perpendicular exactly when their normals are: \(\mathbf{n}_{1} \cdot \mathbf{n}_{2} = 0\), with \(\mathbf{n}_{1} = ${V(a.map((x, i) => (i === slot ? 'k' : x)))}\) and \(\mathbf{n}_{2} = ${V(m)}\).`
        : R`A line is parallel to a plane exactly when its direction \(\mathbf{v} = ${V(a.map((x, i) => (i === slot ? 'k' : x)))}\) is perpendicular to the normal \(\mathbf{n} = ${V(m)}\): \(\mathbf{v} \cdot \mathbf{n} = 0\).`,
      R`\(${terms([[m[slot], 'k'], [rest, '']])} = 0\).`,
      R`\(k = ${k.tex()}\).`,
    ],
    rule: 2,
    skill: 'perpendicular and parallel',
    check: () => checkEqual(a.reduce((t, x, i) => t + (i === slot ? k.value : x) * m[i], 0), 0),
  });
}

// ───────────── Models ─────────────

const ROOFS = {
  a: { n: [2, 1, 2], d: 12, len: 3 },
  b: { n: [0, 0, 1], d: 4, len: 1 },
  c: { n: [2, 3, 6], d: 21, len: 7 },
  d: { n: [1, -2, 2], d: 6, len: 3 },
};

export default {
  id: 'lines-planes',
  title: 'Lines, Planes & Surfaces',
  summary: 'Write equations of lines and planes, measure distances and angles between them, and recognize quadric surfaces and 3-D coordinate systems.',
  standards: ['OpenStax Calculus Vol. 3 §2.5', 'OpenStax Calculus Vol. 3 §2.6', 'OpenStax Calculus Vol. 3 §2.7'],

  explain: {
    intro: R`In space a line is fixed by a point and a **direction** vector, and a plane is fixed by a point and a **normal** vector (one perpendicular to the plane). Almost every question about lines and planes comes down to choosing those vectors and then using a dot or cross product. Curved surfaces given by second-degree equations, the quadric surfaces, are recognized from their traces: the curves in which planes parallel to the coordinate planes cut them.`,
    rules: [
      {
        title: 'Equations of a line',
        text: R`The line through \((x_{0}, y_{0}, z_{0})\) with direction \(\mathbf{v} = \langle a, b, c \rangle\) is \(\mathbf{r}(t) = \langle x_{0}, y_{0}, z_{0} \rangle + t\,\mathbf{v}\). In parametric form: \(x = x_{0} + at\), \(y = y_{0} + bt\), \(z = z_{0} + ct\). Solving each for \(t\) gives the symmetric equations \(\dfrac{x - x_{0}}{a} = \dfrac{y - y_{0}}{b} = \dfrac{z - z_{0}}{c}\). For a line through two points, use \(\mathbf{v} = Q - P\).`,
        example: R`Through \(P(1, -2, 4)\) and \(Q(3, 1, -1)\): \(\mathbf{v} = \langle 2, 3, -5 \rangle\), so \(x = 1 + 2t\), \(y = -2 + 3t\), \(z = 4 - 5t\).`,
      },
      {
        title: 'Equation of a plane',
        text: R`The plane through \((x_{0}, y_{0}, z_{0})\) with normal \(\mathbf{n} = \langle a, b, c \rangle\) is \(a(x - x_{0}) + b(y - y_{0}) + c(z - z_{0}) = 0\), which simplifies to \(ax + by + cz = d\). For a plane through three points, the normal is the cross product of two vectors joining them.`,
        example: R`Through \((2, 0, 1)\) with \(\mathbf{n} = \langle 3, -1, 2 \rangle\): \(3(x - 2) - y + 2(z - 1) = 0\), that is \(3x - y + 2z = 8\).`,
      },
      {
        title: 'Parallel, perpendicular, skew and angles',
        text: R`Two lines are parallel when their direction vectors are multiples of each other. Lines that are not parallel either intersect or are **skew** (they miss each other). Two planes are parallel when their normals are parallel and perpendicular when \(\mathbf{n}_{1} \cdot \mathbf{n}_{2} = 0\). The angle between two planes is the acute angle between their normals: \(\cos\theta = \dfrac{|\mathbf{n}_{1} \cdot \mathbf{n}_{2}|}{|\mathbf{n}_{1}||\mathbf{n}_{2}|}\). Two planes that are not parallel meet in a line with direction \(\mathbf{n}_{1} \times \mathbf{n}_{2}\).`,
        example: R`The planes \(x + y = 3\) and \(x + z = 5\) have normals \(\langle 1, 1, 0 \rangle\) and \(\langle 1, 0, 1 \rangle\): \(\cos\theta = \frac{1}{2}\), so they meet at \(60^\circ\).`,
      },
      {
        title: 'Distances',
        text: R`The distance from \((x_{0}, y_{0}, z_{0})\) to the plane \(ax + by + cz = d\) is \(\dfrac{|ax_{0} + by_{0} + cz_{0} - d|}{\sqrt{a^{2} + b^{2} + c^{2}}}\). The distance from a point \(Q\) to the line through \(P\) with direction \(\mathbf{v}\) is \(\dfrac{|\overrightarrow{PQ} \times \mathbf{v}|}{|\mathbf{v}|}\).`,
        example: R`From \((2, 1, 8)\) to \(2x + y + 2z = 12\): \(\dfrac{|4 + 1 + 16 - 12|}{\sqrt{4 + 1 + 4}} = \dfrac{9}{3} = 3\).`,
      },
      {
        title: 'Where a line meets a plane',
        text: R`Substitute the line's parametric equations into the plane's equation. This leaves one equation in \(t\). Solve it and put that \(t\) back into the line.`,
        example: R`\(x = 1 + t\), \(y = 2 - t\), \(z = 3t\) meets \(2x + y + z = 12\) when \(2(1 + t) + (2 - t) + 3t = 12\), so \(t = 2\) and the point is \((3, 0, 6)\).`,
      },
      {
        title: 'Quadric surfaces',
        text: R`Write the equation in standard form and look at which variables are squared and at the signs. All three squared with 1 on the right: no minus signs is an **ellipsoid**, one is a **hyperboloid of one sheet**, two is a **hyperboloid of two sheets**. All three squared with 0 on the right, and one sign different from the other two, is a **cone**. One variable to the first power only is a **paraboloid**: elliptic if the squared terms have the same sign, hyperbolic (a saddle) if they have opposite signs.`,
        example: R`\(4x^{2} - y^{2} + 2z^{2} + 4 = 0\) becomes \(\dfrac{y^{2}}{4} - x^{2} - \dfrac{z^{2}}{2} = 1\): two minus signs, so a hyperboloid of two sheets.`,
      },
      {
        title: 'Cylindrical and spherical coordinates',
        text: R`Cylindrical \((r, \theta, z)\): \(x = r\cos\theta\), \(y = r\sin\theta\), \(z = z\), with \(r^{2} = x^{2} + y^{2}\). Spherical \((\rho, \theta, \phi)\): \(x = \rho\sin\phi\cos\theta\), \(y = \rho\sin\phi\sin\theta\), \(z = \rho\cos\phi\), with \(\rho^{2} = x^{2} + y^{2} + z^{2}\). Here \(\theta\) is the angle around the \(z\)-axis and \(\phi\) is the angle down from the positive \(z\)-axis, \(0 \le \phi \le \pi\).`,
        example: R`\((\rho, \theta, \phi) = \left(4, \frac{\pi}{3}, \frac{\pi}{6}\right)\): \(x = 4 \cdot \frac{1}{2} \cdot \frac{1}{2} = 1\), \(y = 4 \cdot \frac{1}{2} \cdot \frac{\sqrt{3}}{2} = \sqrt{3}\), \(z = 4 \cdot \frac{\sqrt{3}}{2} = 2\sqrt{3}\).`,
      },
    ],
    vocab: [
      { term: 'direction vector', def: 'A non-zero vector parallel to a line. Any non-zero multiple of it describes the same direction.' },
      { term: 'normal vector', def: 'A non-zero vector perpendicular to a plane.' },
      { term: 'skew lines', def: 'Lines in space that are not parallel and do not intersect.' },
      { term: 'trace', def: 'The curve in which a surface meets a plane, usually a plane parallel to a coordinate plane.' },
      { term: 'quadric surface', def: R`The graph of a second-degree equation in \(x\), \(y\) and \(z\).` },
    ],
    mistakes: [
      'Mixing up the point and the direction of a line. The point gives the constants; the direction gives the coefficients of t.',
      'Reading a plane equation as if its coefficients were a point on the plane. They are a normal vector.',
      R`Forgetting to subtract \(d\), or to divide by \(|\mathbf{n}|\), in the distance from a point to a plane.`,
      'Deciding that two lines intersect just because they are not parallel. In space they may be skew: check all three coordinates.',
      R`Counting minus signs before the equation is in standard form. Put a positive constant alone on the right first.`,
      R`Measuring \(\phi\) from the \(xy\)-plane. In spherical coordinates \(\phi\) is measured from the positive \(z\)-axis.`,
    ],
    visual: {
      type: 'table',
      caption: 'The six quadric surfaces (axis along z)',
      headers: ['Surface', 'Standard equation', 'Traces'],
      rows: [
        ['Ellipsoid', R`\(\dfrac{x^{2}}{a^{2}} + \dfrac{y^{2}}{b^{2}} + \dfrac{z^{2}}{c^{2}} = 1\)`, 'ellipses in every direction'],
        ['Hyperboloid of one sheet', R`\(\dfrac{x^{2}}{a^{2}} + \dfrac{y^{2}}{b^{2}} - \dfrac{z^{2}}{c^{2}} = 1\)`, R`ellipses in \(z = k\); hyperbolas in \(x = k\) and \(y = k\)`],
        ['Hyperboloid of two sheets', R`\(\dfrac{z^{2}}{c^{2}} - \dfrac{x^{2}}{a^{2}} - \dfrac{y^{2}}{b^{2}} = 1\)`, R`ellipses in \(z = k\) when \(|k| > c\); hyperbolas in \(x = k\) and \(y = k\)`],
        ['Elliptic cone', R`\(\dfrac{z^{2}}{c^{2}} = \dfrac{x^{2}}{a^{2}} + \dfrac{y^{2}}{b^{2}}\)`, R`ellipses in \(z = k\); hyperbolas in \(x = k\) and \(y = k\) (two lines when \(k = 0\))`],
        ['Elliptic paraboloid', R`\(z = \dfrac{x^{2}}{a^{2}} + \dfrac{y^{2}}{b^{2}}\)`, R`ellipses in \(z = k\) when \(k > 0\); parabolas in \(x = k\) and \(y = k\)`],
        ['Hyperbolic paraboloid', R`\(z = \dfrac{x^{2}}{a^{2}} - \dfrac{y^{2}}{b^{2}}\)`, R`hyperbolas in \(z = k\) (two lines when \(k = 0\)); parabolas in \(x = k\) and \(y = k\)`],
      ],
      alt: 'Table listing the six quadric surfaces with their standard equations and the shapes of their traces.',
    },
  },

  examples: [
    {
      title: 'A line through two points',
      problem: R`Find parametric and symmetric equations of the line through \(P(1, -2, 4)\) and \(Q(3, 1, -1)\).`,
      steps: [
        R`Direction vector: \(\overrightarrow{PQ} = \langle 3 - 1,\; 1 - (-2),\; -1 - 4 \rangle = \langle 2, 3, -5 \rangle\).`,
        R`Start at \(P\) and move along the direction: \(x = 1 + 2t\), \(y = -2 + 3t\), \(z = 4 - 5t\).`,
        R`Solve each equation for \(t\) and set the three results equal.`,
      ],
      answer: R`\(x = 1 + 2t,\; y = -2 + 3t,\; z = 4 - 5t\), or \(\dfrac{x - 1}{2} = \dfrac{y + 2}{3} = \dfrac{z - 4}{-5}\)`,
    },
    {
      title: 'A plane through three points',
      problem: R`Find an equation of the plane through \(P(1, 0, 0)\), \(Q(0, 2, 0)\) and \(R(0, 0, 3)\).`,
      steps: [
        R`Two vectors in the plane: \(\overrightarrow{PQ} = \langle -1, 2, 0 \rangle\) and \(\overrightarrow{PR} = \langle -1, 0, 3 \rangle\).`,
        R`Normal vector: \(\overrightarrow{PQ} \times \overrightarrow{PR} = \langle (2)(3) - (0)(0),\; (0)(-1) - (-1)(3),\; (-1)(0) - (2)(-1) \rangle = \langle 6, 3, 2 \rangle\).`,
        R`Through \(P(1, 0, 0)\): \(6(x - 1) + 3y + 2z = 0\).`,
        R`Check with \(Q\): \(6(0) + 3(2) + 2(0) = 6\). It fits.`,
      ],
      answer: R`\(6x + 3y + 2z = 6\)`,
    },
    {
      title: 'Parallel, intersecting or skew?',
      problem: R`How are the lines \(L_{1}\): \(x = 1 + t,\; y = 2 - t,\; z = 3t\) and \(L_{2}\): \(x = 2s,\; y = 1 + s,\; z = 4 - s\) related?`,
      steps: [
        R`Directions \(\langle 1, -1, 3 \rangle\) and \(\langle 2, 1, -1 \rangle\) are not multiples of each other, so the lines are not parallel.`,
        R`Set \(x\) and \(y\) equal: \(1 + t = 2s\) and \(2 - t = 1 + s\). Adding the equations gives \(3 = 1 + 3s\), so \(s = \frac{2}{3}\) and \(t = \frac{1}{3}\).`,
        R`Check \(z\): \(L_{1}\) gives \(3 \cdot \frac{1}{3} = 1\), but \(L_{2}\) gives \(4 - \frac{2}{3} = \frac{10}{3}\).`,
        'The third coordinates disagree, so no point lies on both lines.',
      ],
      answer: 'The lines are skew.',
    },
    {
      title: 'Word problem: a drone above a sloping roof',
      word: true,
      problem: R`A sloping roof lies in the plane \(2x + y + 2z = 12\) (distances in meters). A drone hovers at \((2, 1, 8)\). How far is the drone from the roof?`,
      steps: [
        'The shortest path from the drone to the roof is perpendicular to the roof, so this is the distance from a point to a plane.',
        R`Numerator: \(|2(2) + 1(1) + 2(8) - 12| = |21 - 12| = 9\).`,
        R`Denominator: \(|\mathbf{n}| = \sqrt{2^{2} + 1^{2} + 2^{2}} = 3\).`,
        R`Distance \(= \frac{9}{3} = 3\).`,
      ],
      answer: 'The drone is 3 m from the roof.',
    },
    {
      title: 'Rectangular to spherical coordinates',
      problem: R`Convert the point \((1, \sqrt{3}, 2\sqrt{3})\) to spherical coordinates \((\rho, \theta, \phi)\).`,
      steps: [
        R`\(\rho = \sqrt{1 + 3 + 12} = 4\).`,
        R`\(\cos\phi = \dfrac{z}{\rho} = \dfrac{2\sqrt{3}}{4} = \dfrac{\sqrt{3}}{2}\), so \(\phi = \dfrac{\pi}{6}\).`,
        R`\(\tan\theta = \dfrac{y}{x} = \sqrt{3}\) with \(x\) and \(y\) both positive (first quadrant), so \(\theta = \dfrac{\pi}{3}\).`,
      ],
      answer: R`\((\rho, \theta, \phi) = \left(4, \dfrac{\pi}{3}, \dfrac{\pi}{6}\right)\)`,
    },
  ],

  models: [
    {
      id: 'line-through-two-points',
      title: 'The line through two points',
      intro: 'Type the coordinates of two points in space.',
      inputs: [
        { name: 'x1', label: 'P: x', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'y1', label: 'P: y', type: 'int', min: -9, max: 9, value: -2 },
        { name: 'z1', label: 'P: z', type: 'int', min: -9, max: 9, value: 4 },
        { name: 'x2', label: 'Q: x', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'y2', label: 'Q: y', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'z2', label: 'Q: z', type: 'int', min: -9, max: 9, value: -1 },
      ],
      compute({ x1, y1, z1, x2, y2, z2 }) {
        const P = [x1, y1, z1];
        const Q = [x2, y2, z2];
        const d = vsub(Q, P);
        if (isZero(d)) return { error: 'The two points are the same, so they do not fix a line. Change one coordinate.' };
        const moving = [0, 1, 2].filter((i) => d[i] !== 0);
        const still = [0, 1, 2].filter((i) => d[i] === 0);
        const symParts = [moving.map((i) => `\\frac{${terms([[1, 'xyz'[i]], [-P[i], '']])}}{${d[i]}}`).join(' = '), ...still.map((i) => `${'xyz'[i]} = ${P[i]}`)];
        const steps = [
          R`Direction vector: \(\mathbf{v} = Q - P = \langle ${Q.map((c, i) => `${c} - ${paren(P[i])}`).join(',\\; ')} \rangle = ${V(d)}\).`,
          R`Vector equation: \(\mathbf{r}(t) = ${V(P)} + t\,${V(d)}\).`,
          R`Parametric equations: \(${lineTex(P, d)}\). At \(t = 0\) you are at \(P\); at \(t = 1\) you are at \(Q\).`,
          still.length ? R`A direction component is 0, so that coordinate never changes. Symmetric form: \(${symParts.join(',\\; ')}\).` : R`Symmetric equations (solve each for \(t\)): \(${symParts[0]}\).`,
        ];
        if (d[2] !== 0) {
          const t = frac(-z1, d[2]);
          const hit = [Frac.from(x1).add(t.mul(d[0])), Frac.from(y1).add(t.mul(d[1])), 0];
          steps.push(R`The line crosses the \(xy\)-plane where \(z = 0\): \(${terms([[z1, ''], [d[2], 't']])} = 0\) gives \(t = ${t.tex()}\), the point \(${Pt(hit)}\).`);
        } else steps.push(z1 === 0 ? R`Here \(z = 0\) all along the line: it lies in the \(xy\)-plane.` : R`Here \(z = ${z1}\) all along the line: it is parallel to the \(xy\)-plane and never crosses it.`);
        return { problem: R`Find equations of the line through \(P${Pt(P)}\) and \(Q${Pt(Q)}\).`, steps, answer: R`\(${lineTex(P, d)}\)` };
      },
    },
    {
      id: 'drone-and-roof',
      title: 'Word problem: distance from a drone to a roof',
      word: true,
      intro: 'Pick the plane of the roof and type the position of the drone (in meters).',
      inputs: [
        { name: 'roof', label: 'Plane of the roof', type: 'select', value: 'a', options: [{ value: 'a', label: '2x + y + 2z = 12' }, { value: 'b', label: 'z = 4 (a flat roof)' }, { value: 'c', label: '2x + 3y + 6z = 21' }, { value: 'd', label: 'x − 2y + 2z = 6' }] },
        { name: 'x0', label: 'Drone: x', type: 'int', min: -10, max: 20, value: 2 },
        { name: 'y0', label: 'Drone: y', type: 'int', min: -10, max: 20, value: 1 },
        { name: 'z0', label: 'Drone: z', type: 'int', min: -10, max: 20, value: 8 },
      ],
      compute({ roof, x0, y0, z0 }) {
        const { n, d, len } = ROOFS[roof] ?? ROOFS.a;
        const P = [x0, y0, z0];
        const s = vdot(n, P) - d;
        const dist = frac(Math.abs(s), len);
        const foot = P.map((c, i) => Frac.from(c).sub(frac(s * n[i], len * len)));
        const problem = R`A roof lies in the plane \(${planeTex(n, d)}\) and a drone hovers at \(${Pt(P)}\), with distances in meters. How far is the drone from the roof?`;
        if (s === 0) return { problem, steps: [R`Substitute the drone's position into the left side: \(${dotWork(n, P)} = ${d}\).`, 'The equation is satisfied, so the drone is touching the roof.'], answer: 'The distance is 0 m.' };
        return {
          problem,
          steps: [
            R`The shortest path to the roof is perpendicular to it, along the normal vector \(\mathbf{n} = ${V(n)}\).`,
            R`Numerator: \(|ax_{0} + by_{0} + cz_{0} - d| = |${dotWork(n, P)} - ${d}| = |${s}| = ${Math.abs(s)}\).`,
            R`Denominator: \(|\mathbf{n}| = \sqrt{${vlen2(n)}} = ${len}\).`,
            R`Distance \(= ${dist.tex()}${dist.isInt() ? '' : ` \\approx ${num(dist.value, { places: 2 })}`}\) m. The nearest point of the roof is \(${Pt(foot)}\).`,
          ],
          answer: R`\(${dist.tex()}\) m${dist.isInt() ? '' : R` (about \(${num(dist.value, { places: 2 })}\) m)`}`,
        };
      },
    },
    {
      id: 'spherical-converter',
      title: 'Spherical to rectangular and cylindrical coordinates',
      intro: 'Type spherical coordinates with the angles in degrees. The picture shows the view from above, looking down the z-axis.',
      inputs: [
        { name: 'rho', label: 'ρ (distance from the origin)', type: 'number', min: 0.5, max: 10, step: 0.5, value: 4 },
        { name: 'theta', label: 'θ in degrees (around the z-axis)', type: 'int', min: 0, max: 360, value: 60 },
        { name: 'phi', label: 'φ in degrees (down from the z-axis)', type: 'int', min: 0, max: 180, value: 30 },
      ],
      compute({ rho, theta, phi }) {
        const r = rho * Math.sin(rad(phi));
        const [x, y, z] = [r * Math.cos(rad(theta)), r * Math.sin(rad(theta)), rho * Math.cos(rad(phi))];
        const f = (v) => num(v, { places: 3 });
        return {
          problem: R`Convert \((\rho, \theta, \phi) = (${num(rho)}, ${theta}^\circ, ${phi}^\circ)\) to rectangular and cylindrical coordinates.`,
          steps: [
            R`Distance from the \(z\)-axis: \(r = \rho\sin\phi = ${num(rho)}\sin ${phi}^\circ \approx ${f(r)}\).`,
            R`Height: \(z = \rho\cos\phi = ${num(rho)}\cos ${phi}^\circ \approx ${f(z)}\).`,
            R`\(x = r\cos\theta \approx ${f(r)}\cos ${theta}^\circ \approx ${f(x)}\) and \(y = r\sin\theta \approx ${f(r)}\sin ${theta}^\circ \approx ${f(y)}\).`,
            R`Check: \(x^{2} + y^{2} + z^{2} \approx ${f(x * x + y * y + z * z)} = \rho^{2}\).`,
          ],
          answer: R`Rectangular \((${f(x)}, ${f(y)}, ${f(z)})\); cylindrical \((r, \theta, z) = (${f(r)}, ${theta}^\circ, ${f(z)})\)`,
          visual: {
            type: 'plot',
            ...squareWindow([[-r, -r], [r, r]], Math.max(1, rho * 0.25)),
            segments: [{ from: [0, 0], to: [x, y], label: `r ≈ ${Math.round(r * 100) / 100}`, color: 'a' }],
            points: [{ x, y, label: `θ = ${theta}°`, color: 'b' }],
            axisLabels: ['x', 'y'],
            alt: `View from above of the xy-plane. The point's shadow lies at distance r ≈ ${Math.round(r * 100) / 100} from the origin, in the direction ${theta} degrees counter-clockwise from the positive x-axis.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyLineParam, easyPlaneNormal, easyPointOnLine, easyNormalRead, easyQuadricName],
    medium: [mediumLineTwoPoints, mediumPlaneThreePoints, mediumDistancePlane, mediumLinePlane, mediumCylindrical],
    hard: [hardLinesRelation, hardAnglePlanes, hardDistanceParallel, hardSpherical, hardQuadric],
    challenge: [challengeIntersectionLine, challengeDistanceLine, challengePlaneContaining, challengeTrace, challengeFindK],
  },
};
