import { R, q, frac, num, product, terms, sqrtTex, numDeriv, numPartial, checkEqual } from '../../lib/index.js';
import { M, V, Pt, vadd, vscale, vdot, vcross, vlen2, vlen, isZero, parallel, quadVec, primitive, rootOver, rad, exactCos, exactSin, angleTex, planeTex, normPlane, samePlane, lineTex, sameLine, mpTex, mpEval, mpD, mpClean, squareWindow } from './_shared.js';

const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [6, 8, 10], [8, 6, 10]];
/** A plane vector with a whole-number length: { v, len }. */
function pyth(rng, maxLen = 17) {
  const [a, b, len] = rng.pick(TRIPLES.filter((t) => t[2] <= maxLen));
  return { v: [a * rng.sign(), b * rng.sign()], len };
}
/** A polynomial in x and y with two or three terms, and its gradient at a point as numbers. */
function poly2(rng) {
  return mpClean(rng.sample([[2, 0], [0, 2], [1, 1], [2, 1], [1, 2], [3, 0], [0, 3], [1, 0], [0, 1]], rng.int(2, 3)).sort((a, b) => b[0] + b[1] - a[0] - a[1]).map(([i, j]) => [rng.nonzero(-4, 4), i, j]));
}
const grad = (p, pt) => pt.map((_, i) => mpEval(mpD(p, i), ...pt));
const gradTex = (p, n = 2) => V(Array.from({ length: n }, (_, i) => mpTex(mpD(p, i))));
const dotWork = (u, v) => u.map((x, i) => product(x, v[i])).join(' + ');
/** Derivative of f at the point pt along the unit vector in the direction of v, straight from the definition. */
const numDirectional = (f, pt, v) => numDeriv((t) => f(...pt.map((c, i) => c + (t * v[i]) / vlen(v))), 0);
const unitTex = (v, len) => V(v.map((x) => frac(x, len)));

// ───────────── Easy ─────────────

function easyGradientAt(rng) {
  let p;
  let pt;
  let g;
  do {
    p = poly2(rng);
    pt = [rng.int(-3, 3), rng.int(-3, 3)];
    g = grad(p, pt);
  } while (g[0] === 0 || g[1] === 0 || g[0] === g[1]);
  const flipped = grad(p, [pt[1], pt[0]]);
  return q({
    prompt: R`Find \(\nabla f(${pt[0]}, ${pt[1]})\) for \(f(x, y) = ${mpTex(p)}\).`,
    correct: M(V(g)),
    wrong: [
      { value: M(V([g[1], g[0]])), why: R`The first component of the gradient is \(f_{x}\) and the second is \(f_{y}\).` },
      { value: M(String(mpEval(p, ...pt))), why: R`That is the value \(f(${pt[0]}, ${pt[1]})\). The gradient is the vector of partial derivatives.` },
      M(V(flipped)),
      M(V([g[0], -g[1]])),
      M(V([-g[0], g[1]])),
      M(V([g[0] + 1, g[1]])),
    ],
    solution: [R`\(\nabla f = \langle f_{x}, f_{y} \rangle = ${gradTex(p)}\).`, R`Substitute \(x = ${pt[0]}\), \(y = ${pt[1]}\): \(\nabla f(${pt[0]}, ${pt[1]}) = ${V(g)}\).`],
    rule: 0,
    skill: 'gradient',
    check: () => (g.every((c, i) => Math.abs(c - numPartial((x, y) => mpEval(p, x, y), pt, i)) < 1e-5) ? true : 'gradient mismatch'),
  });
}

function easyDirUnit(rng) {
  const { v, len } = pyth(rng, 13);
  let g;
  do g = [rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  while (vdot(g, v) === 0);
  const ans = frac(vdot(g, v), len);
  return q({
    prompt: R`At a point \(P\), \(\nabla f(P) = ${V(g)}\). Find the directional derivative of \(f\) at \(P\) in the direction of the unit vector \(\mathbf{u} = ${unitTex(v, len)}\).`,
    correct: ans,
    wrong: [
      { value: vdot(g, v), why: R`Keep the denominators of \(\mathbf{u}\): its components are \(${frac(v[0], len).tex()}\) and \(${frac(v[1], len).tex()}\).` },
      { value: M(V(g.map((c, i) => frac(c * v[i], len)))), why: 'A directional derivative is a number. Add the two products of the dot product.' },
      frac(g[0] * v[1] + g[1] * v[0], len),
      ans.neg(),
      frac(g[0] + g[1], len),
    ],
    solution: [R`\(D_{\mathbf{u}}f = \nabla f \cdot \mathbf{u}\) when \(\mathbf{u}\) is a unit vector.`, R`\(D_{\mathbf{u}}f(P) = ${product(g[0], frac(v[0], len))} + ${product(g[1], frac(v[1], len))} = ${ans.tex()}\).`],
    rule: 1,
    skill: 'directional derivative',
    check: () => checkEqual(ans.value, numDirectional((x, y) => g[0] * x + g[1] * y, [1, 2], v), 1e-6),
  });
}

function easyMaxRate(rng) {
  const three = rng.bool(0.4);
  const { v: g, len } = three ? quadVec(rng, 11) : pyth(rng, 13);
  const kind = rng.pick(['max', 'min', 'dir']);
  const head = R`At a point \(P\), \(\nabla f(P) = ${V(g)}\).`;
  const size = R`\(|\nabla f(P)| = \sqrt{${g.map((x) => x * x).join(' + ')}} = ${len}\).`;
  const check = () => checkEqual(len, Math.hypot(...g));
  if (kind === 'dir') {
    return q({
      prompt: R`${head} Which unit vector gives the direction in which \(f\) increases most rapidly at \(P\)?`,
      correct: M(unitTex(g, len)),
      wrong: [
        { value: M(V(g)), why: R`That is the right direction, but its length is \(${len}\). A unit vector has length 1: divide by \(${len}\).` },
        { value: M(unitTex(vscale(g, -1), len)), why: R`\(-\nabla f\) is the direction of fastest decrease.` },
        M(unitTex(three ? [g[1], g[2], g[0]] : [g[1], g[0]], len)),
        M(unitTex(three ? [g[0], -g[1], g[2]] : [-g[1], g[0]], len)),
        M(unitTex(g, len * len)),
      ],
      solution: [R`\(f\) increases fastest in the direction of \(\nabla f\).`, size, R`Unit vector: \(\dfrac{\nabla f(P)}{|\nabla f(P)|} = ${unitTex(g, len)}\).`],
      rule: 2,
      skill: 'direction of steepest ascent',
      check,
    });
  }
  const max = kind === 'max';
  return q({
    prompt: R`${head} What is the ${max ? 'largest' : 'smallest'} possible value of the directional derivative \(D_{\mathbf{u}}f(P)\)?`,
    correct: max ? len : -len,
    wrong: [
      { value: g.reduce((a, b) => a + b, 0) * (max ? 1 : -1), why: R`The extreme value is \(\pm|\nabla f|\): square the components, add, and take the square root.` },
      max ? { value: len * len, why: R`\(${len * len}\) is \(|\nabla f|^{2}\). Take the square root.` } : { value: 0, why: R`0 is the rate of change in directions perpendicular to \(\nabla f\). The smallest value is \(-|\nabla f|\), in the direction \(-\nabla f\).` },
      max ? -len : len,
      max ? len + 1 : -len * len,
    ],
    solution: [R`\(D_{\mathbf{u}}f = |\nabla f|\cos\theta\), where \(\theta\) is the angle between \(\nabla f\) and \(\mathbf{u}\). It is largest when \(\mathbf{u}\) points along \(\nabla f\) and smallest when \(\mathbf{u}\) points the opposite way.`, size, max ? R`The largest value is \(${len}\).` : R`The smallest value is \(-${len}\).`],
    rule: 2,
    skill: 'greatest rate of change',
    check,
  });
}

// ───────────── Medium ─────────────

function mediumDirectional(rng) {
  const three = rng.bool(0.45);
  let p;
  let pt;
  let g;
  const { v, len } = three ? quadVec(rng, 9) : pyth(rng, 13);
  do {
    p = three ? mpClean(rng.sample([[2, 1, 0], [1, 0, 2], [0, 1, 2], [1, 1, 1], [2, 0, 1], [0, 2, 1], [1, 2, 0]], 2).map((e) => [rng.nonzero(-3, 3), ...e])) : poly2(rng);
    pt = three ? [rng.nonzero(-2, 2), rng.nonzero(-2, 2), rng.nonzero(-2, 2)] : [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    g = grad(p, pt);
  } while (vdot(g, v) === 0 || isZero(g));
  const ans = frac(vdot(g, v), len);
  const vars = three ? 'x, y, z' : 'x, y';
  return q({
    prompt: R`Find the directional derivative of \(f(${vars}) = ${mpTex(p)}\) at \(${Pt(pt)}\) in the direction of \(\mathbf{v} = ${V(v)}\).`,
    correct: ans,
    wrong: [
      { value: vdot(g, v), why: R`\(\mathbf{v}\) is not a unit vector. Divide by \(|\mathbf{v}| = ${len}\) first.` },
      { value: frac(vdot(g, v), len * len), why: R`Divide by \(|\mathbf{v}| = ${len}\) once, not by \(|\mathbf{v}|^{2}\).` },
      ans.neg(),
      frac(g.reduce((a, b) => a + b, 0), len),
      frac(vdot(g, v) + len, len),
    ],
    solution: [
      R`\(\nabla f = ${gradTex(p, pt.length)}\), so \(\nabla f${Pt(pt)} = ${V(g)}\).`,
      R`Unit vector: \(|\mathbf{v}| = ${len}\), so \(\mathbf{u} = ${unitTex(v, len)}\).`,
      R`\(D_{\mathbf{u}}f = \nabla f \cdot \mathbf{u} = \dfrac{${dotWork(g, v)}}{${len}} = ${ans.tex()}\).`,
    ],
    rule: 1,
    skill: 'directional derivative',
    check: () => checkEqual(ans.value, numDirectional((...c) => mpEval(p, ...c), pt, v), 1e-5, 'directional derivative'),
  });
}

function mediumAngleDirection(rng) {
  const deg = rng.pick([45, 135, 225, 315, 30, 60, 120, 150, 210, 240, 300, 330]);
  const [c, cr] = exactCos(deg);
  const [s, sr] = exactSin(deg);
  const diag = deg % 90 === 45;
  let g;
  do g = diag ? [rng.nonzero(-6, 6), rng.nonzero(-6, 6)] : rng.shuffle([2 * rng.nonzero(-4, 4), 0]);
  while (diag && Math.abs(g[0]) === Math.abs(g[1]));
  // for the diagonal angles both components carry √2/2; otherwise one component of the gradient is 0
  const value = (gg, cc, ss) => (diag ? rootOver(gg[0] * cc[0] + gg[1] * ss[0], 2, 2) : gg[0] !== 0 ? rootOver(gg[0] * cc[0], cc[1], 2) : rootOver(gg[1] * ss[0], ss[1], 2));
  const ans = value(g, [c, cr], [s, sr]);
  const numeric = g[0] * Math.cos(rad(deg)) + g[1] * Math.sin(rad(deg));
  return q({
    prompt: R`At a point \(P\), \(\nabla f(P) = ${V(g)}\). Find the directional derivative of \(f\) at \(P\) in the direction that makes an angle \(\theta = ${angleTex(deg)}\) with the positive \(x\)-axis.`,
    correct: M(ans),
    wrong: [
      { value: M(value(g, [s, sr], [c, cr])), why: R`The unit vector is \(\langle \cos\theta, \sin\theta \rangle\): cosine goes with the \(x\)-component.` },
      { value: M(String(g[0] + g[1])), why: R`Multiply each component of the gradient by the matching component of \(\mathbf{u} = \langle \cos\theta, \sin\theta \rangle\) before adding.` },
      M(value(g, [-c, cr], [-s, sr])),
      M(value(g, [c, cr], [-s, sr])),
      M(value(g, [-c, cr], [s, sr])),
      M(rootOver(g[0] + g[1], 3, 2)),
      M(rootOver(g[0] + g[1], 2, 1)),
    ],
    solution: [
      R`The unit vector at angle \(\theta\) is \(\mathbf{u} = \langle \cos\theta, \sin\theta \rangle = \left\langle ${rootOver(c, cr, 2)}, ${rootOver(s, sr, 2)} \right\rangle\).`,
      R`\(D_{\mathbf{u}}f = \nabla f \cdot \mathbf{u} = (${g[0]})\left(${rootOver(c, cr, 2)}\right) + (${g[1]})\left(${rootOver(s, sr, 2)}\right) = ${ans}\).`,
    ],
    rule: 1,
    skill: 'directional derivative',
    check: () => {
      const got = diag ? ((g[0] * c + g[1] * s) * Math.SQRT2) / 2 : g[0] !== 0 ? (g[0] * c * Math.sqrt(cr)) / 2 : (g[1] * s * Math.sqrt(sr)) / 2;
      return checkEqual(got, numeric, 1e-9);
    },
  });
}

function mediumSteepest(rng) {
  const [a, b] = [rng.int(1, 4), rng.int(1, 4)];
  const T0 = rng.pick([40, 60, 80, 100]);
  let pt;
  do pt = [rng.int(-4, 4), rng.int(-4, 4)];
  while (pt[0] === 0 || pt[1] === 0 || a * pt[0] === b * pt[1]);
  const g = [-2 * a * pt[0], -2 * b * pt[1]];
  const n = vlen2(g);
  const show = (d, rate) => R`direction \(${V(d)}\), rate \(${rate}\) °C per cm`;
  return q({
    prompt: R`The temperature on a metal plate is \(T(x, y) = ${terms([[T0, ''], [-a, 'x^{2}'], [-b, 'y^{2}']])}\) °C, with \(x\) and \(y\) in cm. An ant is at \(${Pt(pt)}\). In which direction should it move to warm up as quickly as possible, and at what rate does the temperature rise in that direction?`,
    correct: show(g, sqrtTex(n)),
    wrong: [
      { value: show(vscale(g, -1), sqrtTex(n)), why: R`\(-\nabla T\) points toward lower temperatures. That is the direction in which the ant cools fastest.` },
      { value: show(g, String(n)), why: R`The rate is \(|\nabla T| = \sqrt{${n}}\), not \(|\nabla T|^{2}\).` },
      { value: show(g, String(Math.abs(g[0]) + Math.abs(g[1]))), why: R`\(|\nabla T|\) is the length of the vector: square the components, add, and take the square root.` },
      show([g[1], g[0]], sqrtTex(n)),
      show(vscale(pt, -1), sqrtTex(vlen2(pt))),
    ],
    solution: [
      R`\(\nabla T = \langle ${terms([[-2 * a, 'x']])}, ${terms([[-2 * b, 'y']])} \rangle\), so \(\nabla T${Pt(pt)} = ${V(g)}\).`,
      R`The temperature rises fastest in the direction of \(\nabla T\): \(${V(g)}\).`,
      R`The rate in that direction is \(|\nabla T| = \sqrt{${g[0] * g[0]} + ${g[1] * g[1]}} = ${sqrtTex(n)}\) °C per cm.`,
    ],
    rule: 2,
    skill: 'direction of steepest ascent',
    check: () => {
      const T = (x, y) => T0 - a * x * x - b * y * y;
      const best = numDirectional(T, pt, g);
      return checkEqual(Math.sqrt(n), best, 1e-5) === true && [[1, 0], [0, 1], [1, 1], [-1, 2]].every((d) => numDirectional(T, pt, d) <= best + 1e-9) ? true : 'not the direction of greatest increase';
    },
  });
}

// ───────────── Hard ─────────────

/** A level surface F(x, y, z) = k through an integer point P, with ∇F(P) = g. */
function levelSurface(rng) {
  let F;
  let P;
  let g;
  do {
    F = mpClean([[rng.nonzero(-3, 3), 2, 0, 0], [rng.nonzero(-3, 3), 0, 2, 0], [rng.nonzero(-3, 3), 0, 0, 2], rng.pick([[0, 1, 1, 0], [rng.nonzero(-2, 2), 1, 1, 0], [rng.nonzero(-2, 2), 0, 1, 1]])]);
    P = [rng.nonzero(-3, 3), rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    g = grad(F, P);
  } while (g.includes(0) || parallel(g, P) || parallel(g, [F[0][0], F[1][0], F[2][0]]));
  return { F, P, g, k: mpEval(F, ...P), coefs: [F[0][0], F[1][0], F[2][0]] };
}

function hardTangentPlaneLevel(rng) {
  const { F, P, g, k, coefs } = levelSurface(rng);
  const [n, d] = normPlane(g, vdot(g, P));
  const wrong = [
    [...normPlane(P, vdot(P, P)), R`The normal vector is \(\nabla F\) at the point, not the position vector of the point.`],
    [...normPlane(coefs, vdot(coefs, P)), R`Substitute the point into \(\nabla F = ${gradTex(F, 3)}\) before using it as the normal.`],
    [n, k, R`The right side comes from substituting the point into the plane's equation. It is not the constant \(${k}\) from the surface.`],
    [n, -d],
    [n, d + 1],
    [...normPlane([g[0], -g[1], g[2]], vdot([g[0], -g[1], g[2]], P))],
  ].filter(([m, e]) => !isZero(m) && !samePlane(n, d, m, e));
  return q({
    prompt: R`Find an equation of the tangent plane to the surface \(${mpTex(F)} = ${k}\) at the point \(${Pt(P)}\).`,
    correct: M(planeTex(n, d)),
    wrong: wrong.map(([m, e, why]) => (why ? { value: M(planeTex(m, e)), why } : M(planeTex(m, e)))),
    solution: [
      R`The surface is a level surface of \(F(x, y, z) = ${mpTex(F)}\), so \(\nabla F\) is normal to it.`,
      R`\(\nabla F = ${gradTex(F, 3)}\), and at \(${Pt(P)}\) this is \(${V(g)}\)${parallel(g, n) && g[0] !== n[0] ? R`, which is parallel to \(${V(n)}\)` : ''}.`,
      R`Plane through \(${Pt(P)}\) with that normal: \(${planeTex(n, d)}\).`,
    ],
    rule: 4,
    skill: 'tangent plane to a level surface',
    check: () => {
      const numG = [0, 1, 2].map((i) => numPartial((x, y, z) => mpEval(F, x, y, z), P, i));
      return vlen(vcross(numG, n)) < 1e-4 && vdot(n, P) === d && wrong.length >= 3 ? true : 'plane is not tangent at P';
    },
  });
}

function hardNormalLine(rng) {
  const { F, P, g, k, coefs } = levelSurface(rng);
  const dir = primitive(g).map((x) => (g[0] < 0 ? -x : x)); // same direction as ∇F, in lowest terms
  const wrong = [
    [P, P, R`The direction of the normal line is \(\nabla F\) at the point, not the position vector of the point.`],
    [g, P, R`The line passes through the point \(${Pt(P)}\) and has direction \(\nabla F\), not the other way round.`],
    [P, coefs, R`Substitute the point into \(\nabla F\) before using it as the direction.`],
    [P, [dir[0], -dir[1], dir[2]]],
    [vscale(P, -1), dir],
    [P, vadd(dir, [1, 0, 0])],
  ].filter(([a, b]) => !isZero(b) && !sameLine(P, g, a, b));
  return q({
    prompt: R`Find parametric equations of the normal line to the surface \(${mpTex(F)} = ${k}\) at the point \(${Pt(P)}\).`,
    correct: M(lineTex(P, dir)),
    wrong: wrong.map(([a, b, why]) => (why ? { value: M(lineTex(a, b)), why } : M(lineTex(a, b)))),
    solution: [
      R`The normal line passes through the point in the direction of \(\nabla F\), which is perpendicular to the level surface.`,
      R`\(\nabla F = ${gradTex(F, 3)}\), and at \(${Pt(P)}\) this is \(${V(g)}\)${g[0] === dir[0] ? '' : R`, which is parallel to \(${V(dir)}\)`}.`,
      R`Normal line: \(${lineTex(P, dir)}\).`,
    ],
    rule: 4,
    skill: 'normal line',
    check: () => {
      const numG = [0, 1, 2].map((i) => numPartial((x, y, z) => mpEval(F, x, y, z), P, i));
      return vlen(vcross(numG, dir)) < 1e-4 && wrong.length >= 3 ? true : 'direction is not the gradient';
    },
  });
}

function hardToward(rng) {
  const { v, len } = quadVec(rng, 9);
  let p;
  let P;
  let g;
  do {
    p = mpClean(rng.sample([[2, 1, 0], [1, 0, 2], [0, 1, 2], [1, 1, 1], [2, 0, 1], [0, 2, 1], [2, 0, 0], [0, 0, 2]], 2).map((e) => [rng.nonzero(-3, 3), ...e]));
    P = [rng.int(-2, 2), rng.int(-2, 2), rng.int(-2, 2)];
    g = grad(p, P);
  } while (vdot(g, v) === 0 || vdot(g, vadd(P, v)) === vdot(g, v));
  const Q = vadd(P, v);
  const ans = frac(vdot(g, v), len);
  return q({
    prompt: R`The temperature in a room is \(T(x, y, z) = ${mpTex(p)}\) °C, with distances in meters. A fly at \(P${Pt(P)}\) heads straight toward \(Q${Pt(Q)}\). At what rate does the temperature change, per meter, as it sets off?`,
    correct: ans,
    unit: '°C per meter',
    wrong: [
      { value: vdot(g, v), why: R`The displacement \(\overrightarrow{PQ}\) has length \(${len}\). Divide by it to get a unit vector.` },
      { value: frac(vdot(g, Q), len), why: R`The direction of travel is \(\overrightarrow{PQ} = Q - P\), not the position vector of \(Q\).` },
      { value: ans.neg(), why: R`That is the rate for a fly heading from \(Q\) toward \(P\).` },
      frac(vdot(g, v), len * len),
      frac(vdot(g, v) + len, len),
    ],
    solution: [
      R`Direction of travel: \(\overrightarrow{PQ} = ${V(v)}\), with length \(${len}\), so \(\mathbf{u} = ${unitTex(v, len)}\).`,
      R`\(\nabla T = ${gradTex(p, 3)}\), and \(\nabla T${Pt(P)} = ${V(g)}\).`,
      R`\(D_{\mathbf{u}}T = \nabla T \cdot \mathbf{u} = \dfrac{${dotWork(g, v)}}{${len}} = ${ans.tex()}\) °C per meter.`,
    ],
    rule: 1,
    skill: 'directional derivative',
    check: () => checkEqual(ans.value, numDirectional((x, y, z) => mpEval(p, x, y, z), P, v), 1e-5, 'directional derivative'),
  });
}

// ───────────── Challenge ─────────────

function challengeRecoverGradient(rng) {
  const g = [rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const a = pyth(rng, 13);
  let b;
  do b = rng.bool() ? { v: [-a.v[1], a.v[0]], len: a.len } : pyth(rng, 13);
  while (a.v[0] * b.v[1] === a.v[1] * b.v[0]);
  const [d1, d2] = [frac(vdot(g, a.v), a.len), frac(vdot(g, b.v), b.len)];
  return q({
    prompt: R`At a point \(P\), the directional derivative of \(f\) is \(${d1.tex()}\) in the direction \(\mathbf{u}_{1} = ${unitTex(a.v, a.len)}\) and \(${d2.tex()}\) in the direction \(\mathbf{u}_{2} = ${unitTex(b.v, b.len)}\). Find \(\nabla f(P)\).`,
    correct: M(V(g)),
    wrong: [
      { value: M(V([d1, d2])), why: R`Those are the rates along \(\mathbf{u}_{1}\) and \(\mathbf{u}_{2}\), not along the \(x\)- and \(y\)-axes. Solve \(\nabla f \cdot \mathbf{u}_{1} = ${d1.tex()}\) and \(\nabla f \cdot \mathbf{u}_{2} = ${d2.tex()}\).` },
      M(V([g[1], g[0]])),
      M(V([-g[0], -g[1]])),
      M(V([g[0], -g[1]])),
      M(V([g[0] + 1, g[1] - 1])),
    ],
    solution: [
      R`Write \(\nabla f(P) = \langle a, b \rangle\). Each directional derivative is \(\nabla f \cdot \mathbf{u}\).`,
      R`\(${terms([[a.v[0], 'a'], [a.v[1], 'b']])} = ${d1.mul(a.len).tex()}\) and \(${terms([[b.v[0], 'a'], [b.v[1], 'b']])} = ${d2.mul(b.len).tex()}\) (after multiplying each equation by its denominator).`,
      R`Solving the two equations gives \(a = ${g[0]}\) and \(b = ${g[1]}\), so \(\nabla f(P) = ${V(g)}\).`,
    ],
    rule: 1,
    skill: 'working backwards from rates',
    check: () => (frac(vdot(g, a.v), a.len).eq(d1) && frac(vdot(g, b.v), b.len).eq(d2) && a.v[0] * b.v[1] !== a.v[1] * b.v[0] ? true : 'gradient does not reproduce the given rates'),
  });
}

function challengeLevelCurveTangent(rng) {
  let A;
  let B;
  let P;
  do {
    [A, B] = [rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
    P = [rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
  } while (A === B || A * P[0] * P[0] + B * P[1] * P[1] === 0);
  const g = [2 * A * P[0], 2 * B * P[1]];
  const k = A * P[0] * P[0] + B * P[1] * P[1];
  const line = (m, e) => {
    const [mm, ee] = normPlane([m[0], m[1], 0], e);
    return [[mm[0], mm[1]], ee];
  };
  const tex = ([m, e]) => M(`${terms([[m[0], 'x'], [m[1], 'y']])} = ${e}`);
  const same = (l1, l2) => samePlane([...l1[0], 0], l1[1], [...l2[0], 0], l2[1]);
  const ans = line(g, vdot(g, P));
  const across = [-g[1], g[0]];
  const wrong = [
    [line(across, vdot(across, P)), R`That line runs along \(\nabla f\), straight across the level curve. The tangent line is perpendicular to \(\nabla f\).`],
    [line(P, vdot(P, P)), R`Use \(\nabla f\) at the point as the normal to the line, not the point's own coordinates.`],
    [line(g, k), R`The right side comes from substituting the point into the line's equation. It is not the level \(${k}\).`],
    [[ans[0], -ans[1]]],
    [[ans[0], ans[1] + 1]],
    [line([A, B], A * P[0] + B * P[1])],
  ].filter(([l]) => !same(ans, l));
  const f = (x, y) => A * x * x + B * y * y;
  return q({
    prompt: R`Find an equation of the tangent line to the level curve \(${terms([[A, 'x^{2}'], [B, 'y^{2}']])} = ${k}\) at the point \(${Pt(P)}\).`,
    correct: tex(ans),
    wrong: wrong.map(([l, why]) => (why ? { value: tex(l), why } : tex(l))),
    solution: [
      R`The gradient of \(f(x, y) = ${terms([[A, 'x^{2}'], [B, 'y^{2}']])}\) is perpendicular to its level curves, so it is a normal vector for the tangent line.`,
      R`\(\nabla f = \langle ${terms([[2 * A, 'x']])}, ${terms([[2 * B, 'y']])} \rangle\), and \(\nabla f${Pt(P)} = ${V(g)}\).`,
      R`Line through \(${Pt(P)}\) with that normal: \(${terms([[g[0], `(${terms([[1, 'x'], [-P[0], '']])})`], [g[1], `(${terms([[1, 'y'], [-P[1], '']])})`]])} = 0\), which simplifies to \(${terms([[ans[0][0], 'x'], [ans[0][1], 'y']])} = ${ans[1]}\).`,
    ],
    rule: 3,
    skill: 'gradient and level curves',
    check: () => (Math.abs(numDirectional(f, P, across)) < 1e-6 && ans[0][0] * P[0] + ans[0][1] * P[1] === ans[1] && wrong.length >= 3 ? true : 'line is not tangent to the level curve'),
  });
}

function challengeMaxBack(rng) {
  const { v, len } = pyth(rng, 13);
  const m = rng.int(1, 3);
  const M0 = m * len;
  const max = rng.bool();
  const g = vscale(v, max ? m : -m);
  return q({
    prompt: max
      ? R`At a point \(P\), the directional derivative of \(f\) is largest in the direction \(\mathbf{u} = ${unitTex(v, len)}\), where it equals \(${M0}\). Find \(\nabla f(P)\).`
      : R`At a point \(P\), the directional derivative of \(f\) is smallest in the direction \(\mathbf{u} = ${unitTex(v, len)}\), where it equals \(${-M0}\). Find \(\nabla f(P)\).`,
    correct: M(V(g)),
    wrong: [
      { value: M(V(vscale(g, -1))), why: max ? R`\(\nabla f\) points in the direction of the largest directional derivative, which is \(\mathbf{u}\) itself.` : R`The smallest directional derivative occurs in the direction \(-\nabla f\), so \(\nabla f\) points opposite to \(\mathbf{u}\).` },
      { value: M(unitTex(max ? v : vscale(v, -1), len)), why: R`The gradient has length \(${M0}\), the size of the extreme directional derivative. It is not a unit vector.` },
      M(V(vscale(v, M0))),
      M(V([g[1], g[0]])),
      M(V([g[0], -g[1]])),
    ],
    solution: [
      R`The largest directional derivative is \(|\nabla f|\), in the direction of \(\nabla f\). The smallest is \(-|\nabla f|\), in the opposite direction.`,
      max ? R`So \(\nabla f(P)\) has length \(${M0}\) and points along \(\mathbf{u}\).` : R`So \(\nabla f(P)\) has length \(${M0}\) and points along \(-\mathbf{u}\).`,
      R`\(\nabla f(P) = ${max ? '' : '-'}${M0}\,${unitTex(v, len)} = ${V(g)}\).`,
    ],
    rule: 2,
    skill: 'greatest rate of change',
    check: () => checkEqual(numDirectional((x, y) => g[0] * x + g[1] * y, [0, 0], v), max ? M0 : -M0, 1e-6),
  });
}

/** Picture for the models: the level curve a·x² + b·y² = c through the point, with arrows from the point. */
function levelPicture(a, b, pt, arrows, alt) {
  const c = a * pt[0] * pt[0] + b * pt[1] * pt[1];
  const tips = arrows.map((w) => vadd(pt, w.v));
  const reach = Math.sqrt(c / Math.min(a, b));
  return {
    type: 'plot',
    ...squareWindow([[-reach, -reach], [reach, reach], ...tips], 1),
    param: c > 0 ? [{ x: (t) => Math.sqrt(c / a) * Math.cos(t), y: (t) => Math.sqrt(c / b) * Math.sin(t), t: [0, 2 * Math.PI] }] : [],
    segments: arrows.map((w, i) => ({ from: pt, to: tips[i], arrow: true, label: w.label, color: w.color })),
    points: [{ x: pt[0], y: pt[1] }],
    alt,
  };
}

export default {
  id: 'gradient-directional',
  title: 'Gradient & Directional Derivatives',
  summary: 'Use the gradient to find rates of change in any direction, the direction of steepest ascent, and tangent planes to level surfaces.',
  standards: ['OpenStax Calculus Vol. 3 §4.6'],

  explain: {
    intro: R`The partial derivatives give the rate of change of \(f\) in the \(x\)- and \(y\)-directions only. Collected into one vector, the **gradient** \(\nabla f\), they give the rate of change in every direction. The gradient also points straight uphill, and it is perpendicular to the level curves of \(f\).`,
    rules: [
      { title: 'The gradient vector', text: R`For \(f(x, y)\), \(\nabla f = \langle f_{x}, f_{y} \rangle\). For \(f(x, y, z)\), \(\nabla f = \langle f_{x}, f_{y}, f_{z} \rangle\). It is a vector at each point of the domain.`, example: R`For \(f = x^{2}y - 3y\): \(\nabla f = \langle 2xy, x^{2} - 3 \rangle\), so \(\nabla f(2, 1) = \langle 4, 1 \rangle\).` },
      { title: 'Directional derivative', text: R`The rate of change of \(f\) at a point in the direction of a **unit** vector \(\mathbf{u}\) is \(D_{\mathbf{u}}f = \nabla f \cdot \mathbf{u}\). If the direction is given by a vector \(\mathbf{v}\) that is not a unit vector, divide it by \(|\mathbf{v}|\) first. For an angle \(\theta\), \(\mathbf{u} = \langle \cos\theta, \sin\theta \rangle\).`, example: R`With \(\nabla f = \langle 4, 1 \rangle\) and \(\mathbf{v} = \langle 3, 4 \rangle\): \(\mathbf{u} = \left\langle \frac{3}{5}, \frac{4}{5} \right\rangle\) and \(D_{\mathbf{u}}f = \frac{12}{5} + \frac{4}{5} = \frac{16}{5}\).` },
      { title: 'Steepest ascent and descent', text: R`Since \(D_{\mathbf{u}}f = |\nabla f|\cos\theta\), the directional derivative is largest, equal to \(|\nabla f|\), in the direction of \(\nabla f\). It is smallest, \(-|\nabla f|\), in the direction \(-\nabla f\), and it is 0 in the directions perpendicular to \(\nabla f\).`, example: R`If \(\nabla f(P) = \langle 3, -4 \rangle\), then \(f\) increases fastest in the direction \(\left\langle \frac{3}{5}, -\frac{4}{5} \right\rangle\), at the rate 5.` },
      { title: 'Gradients are perpendicular to level sets', text: R`At each point, \(\nabla f\) is perpendicular to the level curve of \(f\) through that point (for three variables, to the level surface). Moving along a level curve does not change \(f\), so the rate of change in that direction is 0.`, example: R`For \(f = x^{2} + y^{2}\), the level curves are circles about the origin and \(\nabla f = \langle 2x, 2y \rangle\) points straight out along the radius.` },
      { title: 'Tangent planes and normal lines to level surfaces', text: R`For a surface \(F(x, y, z) = k\) and a point \(P\) on it, \(\nabla F(P)\) is a normal vector. The tangent plane is \(\nabla F(P) \cdot \langle x - x_{0}, y - y_{0}, z - z_{0} \rangle = 0\), and the normal line is \(\mathbf{r}(t) = P + t\,\nabla F(P)\).`, example: R`For \(x^{2} + 2y^{2} + 3z^{2} = 6\) at \((1, 1, 1)\): \(\nabla F = \langle 2, 4, 6 \rangle\), so the tangent plane is \(x + 2y + 3z = 6\).` },
    ],
    vocab: [
      { term: 'gradient', def: R`The vector \(\nabla f\) of first partial derivatives. It points in the direction of fastest increase.` },
      { term: 'directional derivative', def: R`\(D_{\mathbf{u}}f\): the rate of change of \(f\) per unit distance moved in the direction of the unit vector \(\mathbf{u}\).` },
      { term: 'level surface', def: R`The set of points in space where \(F(x, y, z)\) equals a fixed number.` },
      { term: 'normal line', def: 'The line through a point of a surface that is perpendicular to the tangent plane there.' },
    ],
    mistakes: [
      R`Using a direction vector that is not a unit vector. \(\nabla f \cdot \mathbf{v}\) is too large by the factor \(|\mathbf{v}|\).`,
      R`Giving \(\nabla f\) itself as the greatest rate of change. The rate is the number \(|\nabla f|\); the direction is the vector.`,
      R`Using the point's coordinates as the normal vector of a tangent plane. The normal is \(\nabla F\) evaluated at the point.`,
      R`Thinking the gradient is tangent to the level curve. It is perpendicular to it.`,
    ],
    visual: {
      type: 'plot',
      x: [-5, 5],
      y: [-5, 5],
      square: true,
      param: [3, 9].map((c) => ({ x: (t) => Math.sqrt(c) * Math.cos(t), y: (t) => Math.sqrt(c / 2) * Math.sin(t), t: [0, 2 * Math.PI], color: 'a' })),
      segments: [
        { from: [1, 1], to: [1.4, 1.8], arrow: true, label: '∇f', color: 'b' },
        { from: [-1, 2], to: [-1.4, 3.6], arrow: true, label: '∇f', color: 'b' },
        { from: [3, 0], to: [4.2, 0], arrow: true, label: '∇f', color: 'b' },
      ],
      points: [{ x: 1, y: 1 }, { x: -1, y: 2 }, { x: 3, y: 0 }],
      alt: 'Two level curves of f(x, y) = x² + 2y²: the ellipses f = 3 and f = 9. At the marked points, arrows show the gradient. Each arrow is perpendicular to the level curve through its point and points toward higher values of f.',
    },
  },

  examples: [
    {
      title: 'A directional derivative',
      problem: R`Find the directional derivative of \(f(x, y) = x^{2}y - 3y\) at \((2, 1)\) in the direction of \(\mathbf{v} = \langle 3, 4 \rangle\).`,
      steps: [
        R`\(\nabla f = \langle 2xy, x^{2} - 3 \rangle\), so \(\nabla f(2, 1) = \langle 4, 1 \rangle\).`,
        R`\(\mathbf{v}\) has length 5, so the unit vector is \(\mathbf{u} = \left\langle \frac{3}{5}, \frac{4}{5} \right\rangle\).`,
        R`\(D_{\mathbf{u}}f = \nabla f \cdot \mathbf{u} = (4)\left(\frac{3}{5}\right) + (1)\left(\frac{4}{5}\right)\).`,
      ],
      answer: R`\(D_{\mathbf{u}}f(2, 1) = \dfrac{16}{5}\)`,
    },
    {
      title: 'Tangent plane and normal line to an ellipsoid',
      problem: R`Find the tangent plane and the normal line to \(x^{2} + 2y^{2} + 3z^{2} = 6\) at \((1, 1, 1)\).`,
      steps: [
        R`Let \(F = x^{2} + 2y^{2} + 3z^{2}\). Then \(\nabla F = \langle 2x, 4y, 6z \rangle\), and \(\nabla F(1, 1, 1) = \langle 2, 4, 6 \rangle\).`,
        R`Tangent plane: \(2(x - 1) + 4(y - 1) + 6(z - 1) = 0\). Divide by 2 and collect the constants: \(x + 2y + 3z = 6\).`,
        R`Normal line: start at the point and move along \(\langle 2, 4, 6 \rangle\), or the parallel vector \(\langle 1, 2, 3 \rangle\).`,
      ],
      answer: R`Tangent plane \(x + 2y + 3z = 6\); normal line \(x = 1 + t,\; y = 1 + 2t,\; z = 1 + 3t\)`,
    },
    {
      title: 'Fastest increase',
      problem: R`In which direction does \(f(x, y) = xe^{y}\) increase most rapidly at \((2, 0)\), and how fast?`,
      steps: [
        R`\(\nabla f = \langle e^{y}, xe^{y} \rangle\), so \(\nabla f(2, 0) = \langle 1, 2 \rangle\).`,
        R`The direction of fastest increase is \(\langle 1, 2 \rangle\).`,
        R`The rate in that direction is \(|\nabla f| = \sqrt{1 + 4}\).`,
      ],
      answer: R`Direction \(\langle 1, 2 \rangle\), rate \(\sqrt{5}\)`,
    },
    {
      title: 'Word problem: an ant on a hot plate',
      word: true,
      problem: R`The temperature of a plate is \(T(x, y) = 100 - x^{2} - 2y^{2}\) °C (\(x\), \(y\) in cm). An ant at \((3, 1)\) walks toward \((6, 5)\). How fast does the temperature it feels change? Which way should it walk to cool down fastest?`,
      steps: [
        R`\(\nabla T = \langle -2x, -4y \rangle\), so \(\nabla T(3, 1) = \langle -6, -4 \rangle\).`,
        R`The ant's direction is \(\langle 6 - 3, 5 - 1 \rangle = \langle 3, 4 \rangle\), with unit vector \(\left\langle \frac{3}{5}, \frac{4}{5} \right\rangle\).`,
        R`\(D_{\mathbf{u}}T = (-6)\left(\frac{3}{5}\right) + (-4)\left(\frac{4}{5}\right) = -\frac{34}{5} = -6.8\) °C per cm: it is cooling.`,
        R`The temperature falls fastest in the direction \(-\nabla T = \langle 6, 4 \rangle\), at the rate \(|\nabla T| = \sqrt{52} = 2\sqrt{13} \approx 7.2\) °C per cm.`,
      ],
      answer: R`The temperature falls at 6.8 °C per cm along the ant's path. To cool fastest it should head in the direction \(\langle 6, 4 \rangle\), straight away from the hot center.`,
    },
  ],

  models: [
    {
      id: 'gradient-explorer',
      title: 'Gradient and directional derivative on a contour map',
      intro: 'Choose f(x, y) = a·x² + b·y², a point, and a direction (as an angle from the positive x-axis).',
      inputs: [
        { name: 'a', label: 'a (x² coefficient)', type: 'int', min: 1, max: 5, value: 1 },
        { name: 'b', label: 'b (y² coefficient)', type: 'int', min: 1, max: 5, value: 2 },
        { name: 'x0', label: 'x-coordinate of the point', type: 'int', min: -4, max: 4, value: 2 },
        { name: 'y0', label: 'y-coordinate of the point', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'deg', label: 'Direction angle (degrees)', type: 'int', min: 0, max: 360, value: 120 },
      ],
      compute({ a, b, x0, y0, deg }) {
        const g = [2 * a * x0, 2 * b * y0];
        const u = [Math.cos(rad(deg)), Math.sin(rad(deg))];
        const D = g[0] * u[0] + g[1] * u[1];
        const f3 = (v) => num(v, { places: 3 });
        const scale = isZero(g) ? 0 : 1.5 / vlen(g);
        return {
          problem: R`For \(f(x, y) = ${terms([[a, 'x^{2}'], [b, 'y^{2}']])}\) at \((${x0}, ${y0})\), find the gradient and the directional derivative at the angle \(${deg}^\circ\).`,
          steps: [
            R`\(\nabla f = \langle ${terms([[2 * a, 'x']])}, ${terms([[2 * b, 'y']])} \rangle\), so \(\nabla f(${x0}, ${y0}) = ${V(g)}\).`,
            R`Unit vector at \(${deg}^\circ\): \(\mathbf{u} = \langle \cos ${deg}^\circ, \sin ${deg}^\circ \rangle \approx \langle ${f3(u[0])}, ${f3(u[1])} \rangle\).`,
            R`\(D_{\mathbf{u}}f = \nabla f \cdot \mathbf{u} \approx (${g[0]})(${f3(u[0])}) + (${g[1]})(${f3(u[1])}) \approx ${f3(D)}\).`,
            isZero(g) ? 'The gradient is the zero vector here, so the rate of change is 0 in every direction.' : R`The greatest possible rate is \(|\nabla f| = ${sqrtTex(vlen2(g))} \approx ${f3(vlen(g))}\), in the direction of \(\nabla f\). In the picture, \(\nabla f\) is perpendicular to the level curve.`,
          ],
          answer: R`\(\nabla f = ${V(g)}\) and \(D_{\mathbf{u}}f \approx ${f3(D)}\)`,
          visual: levelPicture(a, b, [x0, y0], [{ v: vscale(g, scale), label: '∇f', color: 'b' }, { v: vscale(u, 1.5), label: 'u', color: 'c' }], `The level curve of f through (${x0}, ${y0}), an ellipse, with two arrows from that point: the gradient, perpendicular to the curve, and the chosen direction u at ${deg} degrees. Both arrows are drawn to a fixed length.`),
        };
      },
    },
    {
      id: 'ant-on-a-plate',
      title: 'Word problem: an ant on a hot plate',
      word: true,
      intro: 'The plate is hottest at the origin. Place the ant, then choose the point it walks toward.',
      inputs: [
        { name: 'a', label: 'Cooling coefficient in x', type: 'int', min: 1, max: 4, value: 1 },
        { name: 'b', label: 'Cooling coefficient in y', type: 'int', min: 1, max: 4, value: 2 },
        { name: 'x0', label: 'Ant: x (cm)', type: 'int', min: -5, max: 5, value: 3 },
        { name: 'y0', label: 'Ant: y (cm)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'x1', label: 'Target: x (cm)', type: 'int', min: -6, max: 6, value: 0 },
        { name: 'y1', label: 'Target: y (cm)', type: 'int', min: -6, max: 6, value: 5 },
      ],
      compute({ a, b, x0, y0, x1, y1 }) {
        const v = [x1 - x0, y1 - y0];
        if (isZero(v)) return { error: 'The target is where the ant already is. Move the target so the ant has a direction to walk in.' };
        const g = [-2 * a * x0, -2 * b * y0];
        const len = vlen(v);
        const D = vdot(g, v) / len;
        const f2 = (w) => num(w, { places: 2 });
        const cool = isZero(g) ? [0, 0] : vscale(g, -1.5 / vlen(g));
        return {
          problem: R`The temperature of a plate is \(T(x, y) = ${terms([[100, ''], [-a, 'x^{2}'], [-b, 'y^{2}']])}\) °C. An ant at \((${x0}, ${y0})\) walks toward \((${x1}, ${y1})\). How fast does the temperature it feels change, and which way should it walk to cool down fastest?`,
          steps: [
            R`\(\nabla T = \langle ${terms([[-2 * a, 'x']])}, ${terms([[-2 * b, 'y']])} \rangle\), so \(\nabla T(${x0}, ${y0}) = ${V(g)}\).`,
            R`Direction of travel: \(${V(v)}\), with length \(${sqrtTex(vlen2(v))}\), so \(\mathbf{u} \approx \langle ${f2(v[0] / len)}, ${f2(v[1] / len)} \rangle\).`,
            R`\(D_{\mathbf{u}}T = \nabla T \cdot \mathbf{u} = \dfrac{${dotWork(g, v)}}{${sqrtTex(vlen2(v))}} \approx ${f2(D)}\) °C per cm. ${D > 0 ? 'The ant is getting warmer.' : D < 0 ? 'The ant is getting cooler.' : 'The ant is walking along an isotherm: the temperature is not changing.'}`,
            isZero(g) ? 'The ant is at the hottest point, where the gradient is zero: every direction cools it, slowly at first.' : R`To cool fastest, walk in the direction \(-\nabla T = ${V(vscale(g, -1))}\). The temperature then falls at \(|\nabla T| = ${sqrtTex(vlen2(g))} \approx ${f2(vlen(g))}\) °C per cm.`,
          ],
          answer: R`\(D_{\mathbf{u}}T \approx ${f2(D)}\) °C per cm${isZero(g) ? '' : R`; fastest cooling in the direction \(${V(vscale(g, -1))}\)`}`,
          visual: levelPicture(a, b, [x0, y0], [{ v: vscale(v, 1.5 / len), label: 'path', color: 'c' }, ...(isZero(g) ? [] : [{ v: cool, label: '−∇T', color: 'b' }])], `The isotherm (curve of constant temperature) through the ant's position (${x0}, ${y0}), with an arrow showing the ant's direction of travel and an arrow showing the direction of fastest cooling, which is perpendicular to the isotherm.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyGradientAt, easyDirUnit, easyMaxRate],
    medium: [mediumDirectional, mediumAngleDirection, mediumSteepest],
    hard: [hardTangentPlaneLevel, hardNormalLine, hardToward],
    challenge: [challengeRecoverGradient, challengeLevelCurveTangent, challengeMaxBack],
  },
};
