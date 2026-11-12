import { R, q, frac, tryFrac, num, product, terms, texFrac, sqrtTex, simplifySqrt, checkEqual } from '../../lib/index.js';
import { M, V, Pt, ijk, vadd, vsub, vscale, vdot, vcross, vlen2, vlen, isZero, parallel, rvec, quadVec, rootOver, exactSin, exactCos, rad, sq, lineInt, squareWindow, anglePair, COS_TEX } from './_shared.js';

// 3×3 determinant with rows a, b, c (rule of Sarrus): the scalar triple product a · (b × c).
const det3 = (a, b, c) => a[0] * b[1] * c[2] + a[1] * b[2] * c[0] + a[2] * b[0] * c[1] - a[2] * b[1] * c[0] - a[0] * b[2] * c[1] - a[1] * b[0] * c[2];
const sumSq = (v) => v.map((x) => `(${num(x)})^{2}`).join(' + ');
const dotWork = (u, v) => u.map((x, i) => product(x, v[i])).join(' + ');
const crossWork = (u, v) => R`\langle ${product(u[1], v[2])} - ${product(u[2], v[1])},\; ${product(u[2], v[0])} - ${product(u[0], v[2])},\; ${product(u[0], v[1])} - ${product(u[1], v[0])} \rangle`;
const rootValue = (n) => Math.sqrt(n);

// ───────────── Easy ─────────────

function easyDistance(rng) {
  const { v, len } = quadVec(rng, 13);
  const p = rvec(rng, -4, 5);
  const p2 = vadd(p, v);
  const taxi = v.reduce((s, x) => s + Math.abs(x), 0);
  return q({
    prompt: R`Find the distance between the points \(P${Pt(p)}\) and \(Q${Pt(p2)}\).`,
    correct: len,
    wrong: [
      { value: taxi, why: 'That adds the three differences. Square each difference, add, and then take the square root.' },
      { value: len * len, why: R`\(${len * len}\) is the sum of the squares. The distance is its square root.` },
      len + 2,
    ],
    solution: [
      R`Subtract the coordinates: the differences are \(${v[0]}\), \(${v[1]}\) and \(${v[2]}\).`,
      R`\(d = \sqrt{${sumSq(v)}} = \sqrt{${v.map((x) => x * x).join(' + ')}} = \sqrt{${len * len}}\).`,
      R`\(d = ${len}\).`,
    ],
    rule: 0,
    skill: 'distance in space',
    check: () => checkEqual(len, Math.hypot(p2[0] - p[0], p2[1] - p[1], p2[2] - p[2])),
  });
}

function easySphereRead(rng) {
  const c = rvec(rng, -6, 6);
  const r = rng.int(2, 9);
  const ans = (cc, rr) => R`center \(${Pt(cc)}\), radius \(${rr}\)`;
  return q({
    prompt: R`Find the center and radius of the sphere \(${sq('x', c[0])} + ${sq('y', c[1])} + ${sq('z', c[2])} = ${r * r}\).`,
    correct: ans(c, r),
    wrong: [
      { value: ans(vscale(c, -1), r), why: 'The standard form subtracts each coordinate of the center, so each coordinate has the opposite sign to the one shown in the brackets.' },
      { value: ans(c, r * r), why: R`The right side is \(r^{2}\). Take its square root to get the radius.` },
      ans(vscale(c, -1), r * r),
      ans(c, 2 * r),
    ],
    solution: [
      R`Standard form: \((x - a)^{2} + (y - b)^{2} + (z - c)^{2} = r^{2}\) has center \((a, b, c)\) and radius \(r\).`,
      R`Read off the center, changing each sign you see: \(${Pt(c)}\).`,
      R`\(r^{2} = ${r * r}\), so \(r = ${r}\).`,
    ],
    rule: 0,
    skill: 'spheres',
    check: () => checkEqual((c[0] + r - c[0]) ** 2 + (c[1] - c[1]) ** 2 + (c[2] - c[2]) ** 2, r * r),
  });
}

function easyCombination(rng) {
  const u = rvec(rng, -5, 5);
  const v = rvec(rng, -5, 5);
  const a = rng.int(2, 4);
  const b = rng.pick([-3, -2, -1, 2, 3]);
  const ans = vadd(vscale(u, a), vscale(v, b));
  return q({
    prompt: R`Let \(\mathbf{u} = ${V(u)}\) and \(\mathbf{v} = ${V(v)}\). Find \(${terms([[a, '\\mathbf{u}'], [b, '\\mathbf{v}']])}\).`,
    correct: M(V(ans)),
    wrong: [
      { value: M(V(vsub(vscale(u, a), vscale(v, b)))), why: R`The sign in front of \(\mathbf{v}\) applies to every component of \(\mathbf{v}\).` },
      { value: M(V([a * u[0] + b * v[0], u[1] + v[1], u[2] + v[2]])), why: 'A scalar multiplies every component, not only the first.' },
      M(V(vadd(u, v))),
      M(V(vscale(vadd(u, v), a))),
      M(V(vadd(ans, [0, 1, -1]))),
    ],
    solution: [
      R`Multiply each vector by its scalar: \(${a}\mathbf{u} = ${V(vscale(u, a))}\) and \(${b === -1 ? '-' : b}\mathbf{v} = ${V(vscale(v, b))}\).`,
      R`Add matching components: \(${V(ans)}\).`,
    ],
    rule: 1,
    skill: 'vector arithmetic',
    check: () => (ans.every((x, i) => x === a * u[i] + b * v[i]) ? true : 'components do not match a·u + b·v'),
  });
}

function easyMagnitude(rng) {
  let v;
  do v = rvec(rng, -6, 6);
  while (v.filter((x) => x === 0).length > 1);
  const n = vlen2(v);
  const s = v.reduce((t, x) => t + Math.abs(x), 0);
  const { coef, rad: inside } = simplifySqrt(n);
  return q({
    prompt: R`Find the magnitude of \(\mathbf{v} = ${V(v)}\).`,
    correct: M(sqrtTex(n)),
    wrong: [
      { value: M(String(n)), why: R`\(${n}\) is \(|\mathbf{v}|^{2}\). Take the square root.` },
      { value: M(String(s)), why: 'Square the components before adding, then take the square root.' },
      M(sqrtTex(s)),
      M(sqrtTex(n + 1)),
      M(sqrtTex(n + 3)),
      M(sqrtTex(n + 2)),
    ],
    solution: [
      R`\(|\mathbf{v}| = \sqrt{${sumSq(v)}}\).`,
      R`\(|\mathbf{v}| = \sqrt{${v.map((x) => x * x).join(' + ')}} = \sqrt{${n}}${sqrtTex(n) === `\\sqrt{${n}}` ? '' : ` = ${sqrtTex(n)}`}\).`,
    ],
    rule: 1,
    skill: 'magnitude',
    check: () => checkEqual(coef * rootValue(inside), Math.hypot(...v)),
  });
}

function easyDot(rng) {
  const u = rvec(rng, -6, 6);
  const v = rvec(rng, -6, 6);
  const d = vdot(u, v);
  return q({
    prompt: R`Find \(\mathbf{u} \cdot \mathbf{v}\) for \(\mathbf{u} = ${V(u)}\) and \(\mathbf{v} = ${V(v)}\).`,
    correct: d,
    wrong: [
      { value: M(V(u.map((x, i) => x * v[i]))), why: 'The dot product is a number, not a vector: add the three products.' },
      { value: u.reduce((t, x, i) => t + x + v[i], 0), why: 'Multiply matching components first, then add the products.' },
      u[0] * v[0] + u[1] * v[1] - u[2] * v[2],
      -d,
    ],
    solution: [R`Multiply matching components and add: \(\mathbf{u} \cdot \mathbf{v} = ${dotWork(u, v)}\).`, R`\(= ${u.map((x, i) => (x * v[i] < 0 ? `(${x * v[i]})` : x * v[i])).join(' + ')} = ${d}\).`],
    rule: 2,
    skill: 'dot product',
    check: () => checkEqual(d, (vlen2(vadd(u, v)) - vlen2(u) - vlen2(v)) / 2),
  });
}

function easyOrthogonal(rng) {
  const u = rvec(rng, -4, 4);
  const all = [];
  for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) for (let c = -4; c <= 4; c++) if ((a || b || c) && vdot(u, [a, b, c]) === 0) all.push([a, b, c]);
  const tidy = all.filter((x) => x.filter((c) => c === 0).length <= 1);
  const w = rng.pick(tidy.length ? tidy : all);
  const wrong = [[w[0], w[1], -w[2]], [-w[0], w[1], w[2]], [w[0], -w[1], w[2]], vadd(w, [1, 0, 0]), vadd(w, [0, 0, 1]), vadd(w, u), vsub(w, u), u].filter((x) => !isZero(x) && vdot(u, x) !== 0);
  return q({
    prompt: R`Which vector is orthogonal to \(\mathbf{u} = ${V(u)}\)?`,
    correct: M(V(w)),
    wrong: wrong.map((x) => M(V(x))),
    solution: [
      'Two vectors are orthogonal exactly when their dot product is 0.',
      R`Test the choices. For \(${V(w)}\): \(${dotWork(u, w)} = 0\).`,
      R`Every other choice gives a dot product that is not 0, so the answer is \(${V(w)}\).`,
    ],
    rule: 2,
    skill: 'orthogonality',
    check: () => (vdot(u, w) === 0 && wrong.every((x) => vdot(u, x) !== 0) ? true : 'orthogonality of the choices is wrong'),
  });
}

// ───────────── Medium ─────────────

function mediumAngle(rng) {
  let pair = anglePair(rng);
  if (pair.deg === 90 && rng.bool(0.5)) pair = anglePair(rng); // keep right angles from dominating
  const { u, v, deg } = pair;
  const d = vdot(u, v);
  const nn = vlen2(u) * vlen2(v);
  return q({
    prompt: R`Find the angle between \(\mathbf{u} = ${V(u)}\) and \(\mathbf{v} = ${V(v)}\).`,
    correct: deg,
    fmt: (x) => R`\(${x}^\circ\)`,
    wrong: [
      deg !== 90 ? { value: 180 - deg, why: `Check the sign of the dot product: it is ${d > 0 ? 'positive, so the angle is acute' : 'negative, so the angle is obtuse'}.` } : null,
      ...rng.shuffle([30, 45, 60, 90, 120, 135, 150].filter((x) => x !== deg && x !== 180 - deg)),
    ],
    solution: [
      R`\(\mathbf{u} \cdot \mathbf{v} = ${dotWork(u, v)} = ${d}\).`,
      R`\(|\mathbf{u}| = ${sqrtTex(vlen2(u))}\) and \(|\mathbf{v}| = ${sqrtTex(vlen2(v))}\), so \(|\mathbf{u}||\mathbf{v}| = ${sqrtTex(nn)}\).`,
      d === 0 ? R`The dot product is 0, so \(\cos\theta = 0\): the vectors are orthogonal and \(\theta = 90^\circ\).` : R`\(\cos\theta = ${texFrac(String(d), sqrtTex(nn))} = ${COS_TEX[deg]}\), so \(\theta = ${deg}^\circ\).`,
    ],
    rule: 2,
    skill: 'angle between vectors',
    check: () => checkEqual((Math.acos(d / (vlen(u) * vlen(v))) * 180) / Math.PI, deg, 1e-6, 'angle'),
  });
}

function mediumComponent(rng) {
  const { v: u, len } = quadVec(rng, 9);
  let v;
  do v = rvec(rng, -6, 6);
  while (vdot(u, v) === 0);
  const d = vdot(u, v);
  const ans = frac(d, len);
  return q({
    prompt: R`Find the scalar projection (component) of \(\mathbf{v} = ${V(v)}\) onto \(\mathbf{u} = ${V(u)}\).`,
    correct: ans,
    wrong: [
      { value: d, why: R`That is \(\mathbf{u} \cdot \mathbf{v}\). Divide by \(|\mathbf{u}| = ${len}\).` },
      { value: frac(d, len * len), why: R`Dividing by \(|\mathbf{u}|^{2}\) gives the multiplier used in the vector projection. The scalar projection divides by \(|\mathbf{u}|\).` },
      ans.neg(),
      frac(d + len, len),
    ],
    solution: [
      R`\(\operatorname{comp}_{\mathbf{u}}\mathbf{v} = \dfrac{\mathbf{u} \cdot \mathbf{v}}{|\mathbf{u}|}\).`,
      R`\(\mathbf{u} \cdot \mathbf{v} = ${dotWork(u, v)} = ${d}\) and \(|\mathbf{u}| = \sqrt{${vlen2(u)}} = ${len}\).`,
      R`\(\operatorname{comp}_{\mathbf{u}}\mathbf{v} = ${ans.tex()}\).`,
    ],
    rule: 3,
    skill: 'scalar projection',
    check: () => checkEqual(ans.value, vlen(v) * Math.cos(Math.atan2(vlen(vcross(u, v)), d))),
  });
}

function mediumCross(rng) {
  let u;
  let v;
  do {
    u = rvec(rng, -4, 4);
    v = rvec(rng, -4, 4);
  } while (parallel(u, v) || u.filter((x) => x === 0).length > 1 || v.filter((x) => x === 0).length > 1);
  const c = vcross(u, v);
  const useIjk = rng.bool(0.4);
  const show = (a) => M(useIjk ? (isZero(a) ? '\\mathbf{0}' : ijk(a)) : V(a));
  const tex = (a) => (useIjk ? ijk(a) : V(a));
  return q({
    prompt: R`Find \(\mathbf{u} \times \mathbf{v}\) for \(\mathbf{u} = ${tex(u)}\) and \(\mathbf{v} = ${tex(v)}\).`,
    correct: show(c),
    wrong: [
      c[1] !== 0 ? { value: show([c[0], -c[1], c[2]]), why: R`The middle component is \(u_{3}v_{1} - u_{1}v_{3}\). Expanding the determinant puts a minus sign on the \(\mathbf{j}\) term.` } : null,
      { value: show(vscale(c, -1)), why: R`That is \(\mathbf{v} \times \mathbf{u}\). Reversing the order reverses the direction.` },
      { value: show(u.map((x, i) => x * v[i])), why: 'Multiplying matching components is the first step of a dot product, not a cross product.' },
      show([u[1] * v[2] + u[2] * v[1], u[2] * v[0] + u[0] * v[2], u[0] * v[1] + u[1] * v[0]]),
      show([-c[0], c[1], c[2]]),
      show([c[0], c[1], -c[2]]),
      show([c[1], c[2], c[0]]),
      show(vadd(c, [1, 1, 0])),
    ],
    solution: [
      R`\(\mathbf{u} \times \mathbf{v} = \langle u_{2}v_{3} - u_{3}v_{2},\; u_{3}v_{1} - u_{1}v_{3},\; u_{1}v_{2} - u_{2}v_{1} \rangle\).`,
      R`\(= ${crossWork(u, v)}\).`,
      R`\(= ${tex(c)}\). Check: its dot product with \(\mathbf{u}\) is \(${dotWork(c, u)} = 0\).`,
    ],
    rule: 4,
    skill: 'cross product',
    check: () => (vdot(c, u) === 0 && vdot(c, v) === 0 && vlen2(c) === vlen2(u) * vlen2(v) - vdot(u, v) ** 2 && det3(u, v, c) === vlen2(c) && vlen2(c) > 0 ? true : 'not the cross product'),
  });
}

function mediumWork(rng) {
  let F;
  let D;
  do {
    F = rvec(rng, -6, 9);
    D = rvec(rng, -4, 6);
  } while (vdot(F, D) === 0);
  const P = rvec(rng, -3, 4);
  const Q = vadd(P, D);
  const W = vdot(F, D);
  return q({
    prompt: R`A constant force \(\mathbf{F} = ${V(F)}\) newtons moves a crate in a straight line from \(P${Pt(P)}\) to \(Q${Pt(Q)}\), with distances in meters. How much work does the force do?`,
    correct: W,
    unit: 'J',
    wrong: [
      { value: vdot(F, Q), why: R`Work uses the displacement \(\overrightarrow{PQ} = Q - P\), not the coordinates of \(Q\).` },
      { value: vdot(F, vadd(P, Q)), why: R`The displacement is \(Q - P\). Subtract the coordinates.` },
      -W,
      vdot(F, P),
    ],
    solution: [
      R`Displacement: \(\mathbf{D} = \overrightarrow{PQ} = ${V(D)}\).`,
      R`Work is the dot product of force and displacement: \(W = \mathbf{F} \cdot \mathbf{D} = ${dotWork(F, D)}\).`,
      R`\(W = ${W}\) J.${W < 0 ? ' The work is negative because the force points against the motion.' : ''}`,
    ],
    rule: 3,
    skill: 'work',
    check: () => checkEqual(W, lineInt(() => F, (t) => vadd(P, vscale(D, t)), 0, 1, 20)),
  });
}

function mediumSphere(rng) {
  const c = rvec(rng, -5, 5);
  const d = rvec(rng, -4, 4);
  const p = vadd(c, d);
  const r2 = vlen2(d);
  const eq = (cc, rhs) => M(`${sq('x', cc[0])} + ${sq('y', cc[1])} + ${sq('z', cc[2])} = ${rhs}`);
  return q({
    prompt: R`Find an equation of the sphere with center \(C${Pt(c)}\) that passes through the point \(P${Pt(p)}\).`,
    correct: eq(c, r2),
    wrong: [
      { value: eq(c, sqrtTex(r2)), why: R`The right side of the equation is \(r^{2}\), not \(r\).` },
      { value: eq(vscale(c, -1), r2), why: R`The center's coordinates are subtracted: \((x - a)^{2}\).` },
      { value: eq(p, r2), why: R`The squared terms are built from the center \(C\), not from the point on the sphere.` },
      eq(c, vlen2(p) || 1),
      eq(c, r2 + 1),
    ],
    solution: [
      R`The radius is the distance from \(C\) to \(P\): \(r^{2} = ${sumSq(d)} = ${r2}\).`,
      R`Standard form: \((x - a)^{2} + (y - b)^{2} + (z - c)^{2} = r^{2}\) with center \(${Pt(c)}\).`,
      R`\(${sq('x', c[0])} + ${sq('y', c[1])} + ${sq('z', c[2])} = ${r2}\).`,
    ],
    rule: 0,
    skill: 'spheres',
    check: () => checkEqual((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2, r2),
  });
}

// ───────────── Hard ─────────────

function hardProjection(rng) {
  let u;
  let v;
  do {
    u = rvec(rng, -3, 3);
    v = rvec(rng, -5, 5);
  } while (vdot(u, v) === 0 || parallel(u, v) || vlen2(u) < 2);
  const d = vdot(u, v);
  const uu = vlen2(u);
  const proj = u.map((x) => frac(d * x, uu));
  const onV = v.map((x) => frac(d * x, vlen2(v)));
  return q({
    prompt: R`Find the vector projection of \(\mathbf{v} = ${V(v)}\) onto \(\mathbf{u} = ${V(u)}\).`,
    correct: M(V(proj)),
    wrong: [
      { value: M(V(onV)), why: R`That is the projection of \(\mathbf{u}\) onto \(\mathbf{v}\). The projection onto \(\mathbf{u}\) is a multiple of \(\mathbf{u}\).` },
      { value: M(V(vscale(u, d))), why: R`Divide by \(\mathbf{u} \cdot \mathbf{u} = ${uu}\) as well.` },
      { value: M(V(v.map((x, i) => frac(x * uu - d * u[i], uu)))), why: R`That is \(\mathbf{v} - \operatorname{proj}_{\mathbf{u}}\mathbf{v}\), the part of \(\mathbf{v}\) perpendicular to \(\mathbf{u}\).` },
      M(V(proj.map((x) => x.neg()))),
      M(V(u.map((x) => frac(x, uu)))),
    ],
    solution: [
      R`\(\operatorname{proj}_{\mathbf{u}}\mathbf{v} = \dfrac{\mathbf{u} \cdot \mathbf{v}}{\mathbf{u} \cdot \mathbf{u}}\,\mathbf{u}\).`,
      R`\(\mathbf{u} \cdot \mathbf{v} = ${dotWork(u, v)} = ${d}\) and \(\mathbf{u} \cdot \mathbf{u} = ${uu}\).`,
      R`\(\operatorname{proj}_{\mathbf{u}}\mathbf{v} = ${frac(d, uu).tex()}\,${V(u)} = ${V(proj)}\).`,
    ],
    rule: 3,
    skill: 'vector projection',
    check: () => {
      const p = proj.map((x) => x.value);
      const rest = vsub(v, p);
      return Math.abs(vdot(rest, u)) < 1e-9 && vlen(vcross(p, u)) < 1e-9 && vlen(p) > 0 ? true : 'v − proj is not orthogonal to u';
    },
  });
}

function hardTriangleArea(rng) {
  let P;
  let a;
  let b;
  do {
    P = rvec(rng, -3, 3);
    a = rvec(rng, -4, 4);
    b = rvec(rng, -4, 4);
  } while (parallel(a, b));
  const Q = vadd(P, a);
  const S = vadd(P, b);
  const n = vcross(a, b);
  const n2 = vlen2(n);
  const d = Math.abs(vdot(a, b));
  return q({
    prompt: R`Find the area of the triangle with vertices \(P${Pt(P)}\), \(Q${Pt(Q)}\) and \(R${Pt(S)}\).`,
    correct: M(rootOver(1, n2, 2)),
    wrong: [
      { value: M(rootOver(1, n2)), why: R`\(|\overrightarrow{PQ} \times \overrightarrow{PR}|\) is the area of the parallelogram. The triangle is half of it.` },
      { value: M(rootOver(1, vlen2(a) * vlen2(b), 2)), why: R`\(\frac{1}{2}|\overrightarrow{PQ}||\overrightarrow{PR}|\) is the area only when the two sides are perpendicular. The cross product allows for the angle.` },
      d ? M(frac(d, 2).tex()) : null,
      M(rootOver(1, n2, 4)),
      M(rootOver(1, n2 + 4, 2)),
      M(rootOver(1, n2 + 1, 2)),
    ],
    solution: [
      R`Two sides: \(\overrightarrow{PQ} = ${V(a)}\) and \(\overrightarrow{PR} = ${V(b)}\).`,
      R`\(\overrightarrow{PQ} \times \overrightarrow{PR} = ${crossWork(a, b)} = ${V(n)}\).`,
      R`Its length is \(\sqrt{${sumSq(n)}} = ${sqrtTex(n2)}\), the area of the parallelogram.`,
      R`The triangle has half that area: \(${rootOver(1, n2, 2)}\).`,
    ],
    rule: 5,
    skill: 'area with a cross product',
    check: () => {
      const [x, y, z] = [vlen2(a), vlen2(b), vlen2(vsub(a, b))]; // squared side lengths; Heron's formula
      return checkEqual(rootValue(n2) / 2, rootValue(2 * (x * y + y * z + z * x) - (x * x + y * y + z * z)) / 4);
    },
  });
}

function hardVolume(rng) {
  let u;
  let v;
  let w;
  do {
    u = rvec(rng, -4, 4);
    v = rvec(rng, -4, 4);
    w = rvec(rng, -4, 4);
  } while (vdot(u, vcross(v, w)) === 0);
  const n = vcross(v, w);
  const t = vdot(u, n);
  const noAlt = Math.abs(u[0] * n[0] - u[1] * n[1] + u[2] * n[2]);
  return q({
    prompt: R`Find the volume of the parallelepiped with adjacent edges \(\mathbf{u} = ${V(u)}\), \(\mathbf{v} = ${V(v)}\) and \(\mathbf{w} = ${V(w)}\).`,
    correct: Math.abs(t),
    wrong: [
      t < 0 ? { value: t, why: 'A volume cannot be negative. Take the absolute value of the triple product.' } : null,
      { value: frac(Math.abs(t), 6), why: R`One sixth of the triple product is the volume of the tetrahedron with these edges. The parallelepiped uses the whole value.` },
      { value: noAlt, why: R`Check the middle term: the \(\mathbf{j}\) component of \(\mathbf{v} \times \mathbf{w}\) is \(v_{3}w_{1} - v_{1}w_{3}\).` },
      frac(Math.abs(t), 2),
      Math.abs(u[0] * v[1] * w[2]),
    ],
    solution: [
      R`The volume is \(|\mathbf{u} \cdot (\mathbf{v} \times \mathbf{w})|\).`,
      R`\(\mathbf{v} \times \mathbf{w} = ${crossWork(v, w)} = ${V(n)}\).`,
      R`\(\mathbf{u} \cdot (\mathbf{v} \times \mathbf{w}) = ${dotWork(u, n)} = ${t}\).`,
      R`Volume \(= |${t}| = ${Math.abs(t)}\).`,
    ],
    rule: 6,
    skill: 'scalar triple product',
    check: () => checkEqual(Math.abs(t), Math.abs(det3(u, v, w))),
  });
}

function hardSphereComplete(rng) {
  const c = rvec(rng, -5, 5);
  const r = rng.int(2, 8);
  const G = vlen2(c) - r * r;
  const ans = (cc, rr) => R`center \(${Pt(cc)}\), radius \(${rr}\)`;
  const lhs = terms([[1, 'x^{2}'], [1, 'y^{2}'], [1, 'z^{2}'], [-2 * c[0], 'x'], [-2 * c[1], 'y'], [-2 * c[2], 'z'], [G, '']]);
  const done = c.map((a, i) => (a === 0 ? null : `${sq('xyz'[i], a)} - ${a * a}`));
  return q({
    prompt: R`The equation \(${lhs} = 0\) describes a sphere. Find its center and radius.`,
    correct: ans(c, r),
    wrong: [
      { value: ans(vscale(c, -1), r), why: R`Completing the square on \(x^{2} - 2ax\) gives \((x - a)^{2}\), so the center coordinate is \(+a\).` },
      { value: ans(vscale(c, 2), r), why: 'Halve each linear coefficient when completing the square.' },
      { value: ans(c, r * r), why: R`The right side after completing the square is \(r^{2}\).` },
      ans(vscale(c, -2), r),
      ans(c, r + 1),
    ],
    solution: [
      R`Complete the square in each variable: ${done.filter(Boolean).map((s) => R`\(${s}\)`).join(', ')}.`,
      R`Move the constants to the right: \(${sq('x', c[0])} + ${sq('y', c[1])} + ${sq('z', c[2])} = ${vlen2(c)} - ${G < 0 ? `(${G})` : G} = ${r * r}\).`,
      R`Center \(${Pt(c)}\), radius \(\sqrt{${r * r}} = ${r}\).`,
    ],
    rule: 0,
    skill: 'completing the square',
    check: () => {
      const f = (x, y, z) => x * x + y * y + z * z - 2 * c[0] * x - 2 * c[1] * y - 2 * c[2] * z + G;
      return f(c[0] + r, c[1], c[2]) === 0 && f(c[0], c[1] - r, c[2]) === 0 && f(c[0], c[1], c[2] + r) === 0 ? true : 'points at distance r from the center are not on the sphere';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeFindK(rng) {
  const slot = rng.int(0, 2);
  const v = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  let u;
  do u = rvec(rng, -6, 6);
  while (vdot(u, v) === u[slot] * v[slot]);
  const rest = vdot(u, v) - u[slot] * v[slot];
  const k = frac(-rest, v[slot]);
  const shown = u.map((x, i) => (i === slot ? 'k' : x));
  return q({
    prompt: R`For which value of \(k\) are \(\mathbf{u} = ${V(shown)}\) and \(\mathbf{v} = ${V(v)}\) orthogonal?`,
    correct: k,
    fmt: (x) => R`\(k = ${num(x)}\)`,
    wrong: [
      { value: k.neg(), why: 'Move the known products to the other side: their sign changes.' },
      { value: frac(-rest), why: R`Divide by the coefficient of \(k\), which is \(${v[slot]}\).` },
      tryFrac(-v[slot], rest),
      frac(rest + 1, v[slot]),
    ],
    solution: [
      R`Orthogonal vectors have dot product 0: \(${shown.map((x, i) => (i === slot ? `(${num(v[i])})k` : product(x, v[i]))).join(' + ')} = 0\).`,
      R`Simplify: \(${terms([[v[slot], 'k'], [rest, '']])} = 0\).`,
      R`Solve: \(${terms([[v[slot], 'k']])} = ${num(-rest)}\), so \(k = ${k.tex()}\).`,
    ],
    rule: 2,
    skill: 'orthogonality',
    check: () => checkEqual(u.reduce((s, x, i) => s + (i === slot ? k.value : x) * v[i], 0), 0),
  });
}

function challengeCoplanar(rng) {
  let u;
  let v;
  let n;
  do {
    u = rvec(rng, -4, 4);
    v = rvec(rng, -4, 4);
    n = vcross(u, v);
  } while (n[2] === 0);
  const a = rng.int(-5, 5);
  const b = rng.int(-5, 5);
  const top = -(a * n[0] + b * n[1]);
  const k = frac(top, n[2]);
  return q({
    prompt: R`For which value of \(k\) do the vectors \(\mathbf{u} = ${V(u)}\), \(\mathbf{v} = ${V(v)}\) and \(\mathbf{w} = ${V([a, b, 'k'])}\) lie in one plane?`,
    correct: k,
    fmt: (x) => R`\(k = ${num(x)}\)`,
    wrong: [
      { value: frac(-(a * n[0] - b * n[1]), n[2]), why: R`Check the middle component of \(\mathbf{u} \times \mathbf{v}\): it is \(u_{3}v_{1} - u_{1}v_{3}\).` },
      { value: k.neg(), why: 'Set the triple product equal to 0 and move the known terms across: their sign changes.' },
      frac(top),
      frac(top + n[2], n[2]),
      frac(top - n[2], n[2]),
    ],
    solution: [
      R`Three vectors are coplanar exactly when their scalar triple product is 0: \(\mathbf{w} \cdot (\mathbf{u} \times \mathbf{v}) = 0\).`,
      R`\(\mathbf{u} \times \mathbf{v} = ${crossWork(u, v)} = ${V(n)}\).`,
      R`\(\mathbf{w} \cdot (\mathbf{u} \times \mathbf{v}) = ${terms([[a * n[0] + b * n[1], ''], [n[2], 'k']])} = 0\).`,
      R`So \(k = ${k.tex()}\).`,
    ],
    rule: 6,
    skill: 'scalar triple product',
    check: () => checkEqual(det3(u, v, [a, b, k.value]), 0),
  });
}

function challengeCrossLength(rng) {
  const [p, qq, h] = rng.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [6, 8, 10], [8, 6, 10]]);
  const m = rng.int(1, 4);
  const pairs = [];
  for (let a = 2; a * 2 <= h * m; a++) if ((h * m) % a === 0) pairs.push([a, (h * m) / a]);
  const [lu, lv] = rng.pick(pairs.length ? pairs : [[h * m, 1], [1, h * m]]);
  const d = p * m * rng.sign();
  return q({
    prompt: R`Vectors \(\mathbf{u}\) and \(\mathbf{v}\) satisfy \(|\mathbf{u}| = ${lu}\), \(|\mathbf{v}| = ${lv}\) and \(\mathbf{u} \cdot \mathbf{v} = ${d}\). Find \(|\mathbf{u} \times \mathbf{v}|\).`,
    correct: qq * m,
    wrong: [
      { value: h * m, why: R`\(|\mathbf{u}||\mathbf{v}|\) is the largest possible value. It is reached only when the vectors are perpendicular, and then \(\mathbf{u} \cdot \mathbf{v}\) would be 0.` },
      { value: h * m - p * m, why: R`Subtract the squares, not the numbers: \(|\mathbf{u} \times \mathbf{v}|^{2} = |\mathbf{u}|^{2}|\mathbf{v}|^{2} - (\mathbf{u} \cdot \mathbf{v})^{2}\).` },
      p * m,
      qq * m + m,
    ],
    solution: [
      R`\(\mathbf{u} \cdot \mathbf{v} = |\mathbf{u}||\mathbf{v}|\cos\theta\) and \(|\mathbf{u} \times \mathbf{v}| = |\mathbf{u}||\mathbf{v}|\sin\theta\).`,
      R`Since \(\sin^{2}\theta + \cos^{2}\theta = 1\): \(|\mathbf{u} \times \mathbf{v}|^{2} = |\mathbf{u}|^{2}|\mathbf{v}|^{2} - (\mathbf{u} \cdot \mathbf{v})^{2} = ${(h * m) ** 2} - ${(p * m) ** 2} = ${(qq * m) ** 2}\).`,
      R`\(|\mathbf{u} \times \mathbf{v}| = ${qq * m}\).`,
    ],
    rule: 4,
    skill: 'dot and cross together',
    check: () => checkEqual(qq * m, lu * lv * Math.sin(Math.acos(d / (lu * lv)))),
  });
}

function challengeTorque(rng) {
  const cm = rng.pick([20, 30, 40, 50]);
  const f = rng.int(2, 9);
  const deg = rng.pick([30, 45, 60, 90, 120, 135, 150]);
  const k = (cm / 10) * f; // (cm/100 m)(10f N)
  const [s, sr] = exactSin(deg);
  const [c, cr] = exactCos(deg);
  const show = (tex) => R`\(${tex}\) N·m`;
  return q({
    prompt: R`A wrench ${cm} cm long turns a bolt. A force of ${10 * f} N is applied at the end of the wrench, at an angle of \(${deg}^\circ\) to the handle. Find the magnitude of the torque \(\boldsymbol{\tau} = \mathbf{r} \times \mathbf{F}\) about the bolt.`,
    correct: show(rootOver(k * s, sr, 2)),
    wrong: [
      { value: show(rootOver(k * Math.abs(c), cr, 2)), why: R`\(|\mathbf{r} \times \mathbf{F}| = |\mathbf{r}||\mathbf{F}|\sin\theta\). Cosine belongs to the dot product.` },
      { value: show(rootOver(100 * k * s, sr, 2)), why: `Convert ${cm} cm to ${num(cm / 100)} m before multiplying.` },
      { value: show(String(k)), why: R`Only the part of the force perpendicular to the handle turns the bolt: multiply by \(\sin ${deg}^\circ\).` },
      show(rootOver(k, 3, 2)),
      show(rootOver(k, 2, 2)),
      show(frac(k, 2).tex()),
    ],
    solution: [
      R`\(|\boldsymbol{\tau}| = |\mathbf{r}||\mathbf{F}|\sin\theta\), with \(|\mathbf{r}| = ${num(cm / 100)}\) m and \(|\mathbf{F}| = ${10 * f}\) N.`,
      R`\(|\mathbf{r}||\mathbf{F}| = ${num(cm / 100)} \cdot ${10 * f} = ${k}\) and \(\sin ${deg}^\circ = ${rootOver(s, sr, 2)}\).`,
      R`\(|\boldsymbol{\tau}| = ${rootOver(k * s, sr, 2)}\) N·m.`,
    ],
    rule: 4,
    skill: 'torque',
    check: () => checkEqual((k * s * rootValue(sr)) / 2, (cm / 100) * 10 * f * Math.sin(rad(deg))),
  });
}

export default {
  id: 'vectors-space',
  title: 'Vectors in Space: Dot & Cross Products',
  summary: 'Measure distances, angles, projections, areas and volumes in three dimensions with the dot and cross products.',
  standards: ['OpenStax Calculus Vol. 3 §2.1', 'OpenStax Calculus Vol. 3 §2.2', 'OpenStax Calculus Vol. 3 §2.3', 'OpenStax Calculus Vol. 3 §2.4'],

  explain: {
    intro: R`A vector in space has three components, \(\mathbf{v} = \langle v_{1}, v_{2}, v_{3} \rangle\), and stands for a length together with a direction. Two products do most of the work in this course. The **dot product** is a number that measures how far two vectors point the same way. The **cross product** is a new vector perpendicular to both.`,
    rules: [
      {
        title: 'Distance and spheres',
        text: R`The distance between \((x_{1}, y_{1}, z_{1})\) and \((x_{2}, y_{2}, z_{2})\) is \(\sqrt{(x_{2} - x_{1})^{2} + (y_{2} - y_{1})^{2} + (z_{2} - z_{1})^{2}}\). The points at distance \(r\) from \((a, b, c)\) form the sphere \((x - a)^{2} + (y - b)^{2} + (z - c)^{2} = r^{2}\).`,
        example: R`From \((1, 0, 2)\) to \((3, 3, 8)\): \(\sqrt{2^{2} + 3^{2} + 6^{2}} = \sqrt{49} = 7\).`,
      },
      {
        title: 'Vector arithmetic, magnitude and unit vectors',
        text: R`Add vectors and multiply by scalars one component at a time. The magnitude is \(|\mathbf{v}| = \sqrt{v_{1}^{2} + v_{2}^{2} + v_{3}^{2}}\). Dividing a non-zero vector by its magnitude gives the unit vector in the same direction.`,
        example: R`For \(\mathbf{v} = \langle 2, -1, 2 \rangle\): \(|\mathbf{v}| = \sqrt{4 + 1 + 4} = 3\), and the unit vector is \(\left\langle \frac{2}{3}, -\frac{1}{3}, \frac{2}{3} \right\rangle\).`,
      },
      {
        title: 'Dot product and angles',
        text: R`\(\mathbf{u} \cdot \mathbf{v} = u_{1}v_{1} + u_{2}v_{2} + u_{3}v_{3} = |\mathbf{u}||\mathbf{v}|\cos\theta\). The result is a number. It is positive for an acute angle, negative for an obtuse angle, and 0 exactly when the vectors are orthogonal (perpendicular).`,
        example: R`\(\langle 1, 2, 2 \rangle \cdot \langle 1, 0, 1 \rangle = 3\), and the lengths are \(3\) and \(\sqrt{2}\), so \(\cos\theta = \frac{3}{3\sqrt{2}} = \frac{\sqrt{2}}{2}\) and \(\theta = 45^\circ\).`,
      },
      {
        title: 'Projections and work',
        text: R`The scalar projection of \(\mathbf{v}\) onto \(\mathbf{u}\) is \(\operatorname{comp}_{\mathbf{u}}\mathbf{v} = \dfrac{\mathbf{u} \cdot \mathbf{v}}{|\mathbf{u}|}\). The vector projection is \(\operatorname{proj}_{\mathbf{u}}\mathbf{v} = \dfrac{\mathbf{u} \cdot \mathbf{v}}{\mathbf{u} \cdot \mathbf{u}}\,\mathbf{u}\). A constant force \(\mathbf{F}\) acting through a displacement \(\mathbf{D}\) does work \(W = \mathbf{F} \cdot \mathbf{D}\).`,
        example: R`For \(\mathbf{u} = \langle 3, 6 \rangle\) and \(\mathbf{v} = \langle 3, 1 \rangle\) (the picture below): \(\mathbf{u} \cdot \mathbf{v} = 15\) and \(\mathbf{u} \cdot \mathbf{u} = 45\), so \(\operatorname{proj}_{\mathbf{u}}\mathbf{v} = \frac{1}{3}\mathbf{u} = \langle 1, 2 \rangle\).`,
      },
      {
        title: 'Cross product',
        text: R`\(\mathbf{u} \times \mathbf{v} = \langle u_{2}v_{3} - u_{3}v_{2},\; u_{3}v_{1} - u_{1}v_{3},\; u_{1}v_{2} - u_{2}v_{1} \rangle\), the expansion of the determinant with rows \(\mathbf{i}\ \mathbf{j}\ \mathbf{k}\), \(\mathbf{u}\) and \(\mathbf{v}\). The result is a vector orthogonal to both \(\mathbf{u}\) and \(\mathbf{v}\), pointing the way the right-hand rule says, with length \(|\mathbf{u}||\mathbf{v}|\sin\theta\). Order matters: \(\mathbf{v} \times \mathbf{u} = -(\mathbf{u} \times \mathbf{v})\).`,
        example: R`\(\langle 1, 2, 0 \rangle \times \langle 0, 1, 3 \rangle = \langle (2)(3) - (0)(1),\; (0)(0) - (1)(3),\; (1)(1) - (2)(0) \rangle = \langle 6, -3, 1 \rangle\).`,
      },
      {
        title: 'Areas from the cross product',
        text: R`\(|\mathbf{u} \times \mathbf{v}|\) is the area of the parallelogram with sides \(\mathbf{u}\) and \(\mathbf{v}\). The triangle with those sides has half that area.`,
        example: R`If \(\overrightarrow{PQ} \times \overrightarrow{PR} = \langle 6, 3, 2 \rangle\), the triangle \(PQR\) has area \(\frac{1}{2}\sqrt{36 + 9 + 4} = \frac{7}{2}\).`,
      },
      {
        title: 'Scalar triple product and volume',
        text: R`\(\mathbf{u} \cdot (\mathbf{v} \times \mathbf{w})\) is the determinant with rows \(\mathbf{u}\), \(\mathbf{v}\), \(\mathbf{w}\). Its absolute value is the volume of the parallelepiped with those edges. It is 0 exactly when the three vectors lie in one plane.`,
        example: R`For \(\mathbf{u} = \langle 1, 0, 0 \rangle\), \(\mathbf{v} = \langle 1, 2, 0 \rangle\), \(\mathbf{w} = \langle 1, 1, 3 \rangle\): \(\mathbf{v} \times \mathbf{w} = \langle 6, -3, -1 \rangle\), so the volume is \(|1 \cdot 6| = 6\).`,
      },
    ],
    vocab: [
      { term: 'magnitude', def: R`The length of a vector, written \(|\mathbf{v}|\).` },
      { term: 'unit vector', def: 'A vector of length 1. It records a direction only.' },
      { term: 'orthogonal', def: 'Perpendicular. Two vectors are orthogonal when their dot product is 0.' },
      { term: 'scalar projection', def: R`The signed length of the shadow of \(\mathbf{v}\) on the line through \(\mathbf{u}\).` },
      { term: 'vector projection', def: R`The vector along \(\mathbf{u}\) whose length and direction match that shadow.` },
      { term: 'scalar triple product', def: R`The number \(\mathbf{u} \cdot (\mathbf{v} \times \mathbf{w})\), a signed volume.` },
    ],
    mistakes: [
      R`Writing a dot product as a vector. \(\mathbf{u} \cdot \mathbf{v}\) is a number; \(\mathbf{u} \times \mathbf{v}\) is a vector.`,
      R`Losing the minus sign on the middle component of a cross product. It is \(u_{3}v_{1} - u_{1}v_{3}\).`,
      R`Treating the cross product as commutative. \(\mathbf{v} \times \mathbf{u}\) points the opposite way to \(\mathbf{u} \times \mathbf{v}\).`,
      R`Dividing by \(|\mathbf{u}|\) in a vector projection. The vector projection divides by \(\mathbf{u} \cdot \mathbf{u} = |\mathbf{u}|^{2}\).`,
      R`Using the end point instead of the displacement when computing work.`,
    ],
    visual: {
      type: 'plot',
      x: [-2, 6],
      y: [-1, 7],
      square: true,
      segments: [
        { from: [0, 0], to: [3, 6], arrow: true, label: 'u', color: 'a' },
        { from: [0, 0], to: [3, 1], arrow: true, label: 'v', color: 'b' },
        { from: [0, 0], to: [1, 2], arrow: true, label: 'proj', color: 'c' },
        { from: [3, 1], to: [1, 2], dashed: true, color: 'd' },
      ],
      alt: 'Vectors u = ⟨3, 6⟩ and v = ⟨3, 1⟩ drawn from the origin. A dashed segment drops from the tip of v perpendicular to u, landing at (1, 2). The arrow from the origin to (1, 2), lying along u, is the projection of v onto u.',
    },
  },

  examples: [
    {
      title: 'A sphere through a point',
      problem: R`Find an equation of the sphere with center \((1, -2, 3)\) that passes through \((3, 1, -3)\).`,
      steps: [
        R`The radius is the distance from the center to the point. The differences in coordinates are \(2\), \(3\) and \(-6\).`,
        R`\(r^{2} = 2^{2} + 3^{2} + (-6)^{2} = 49\), so \(r = 7\).`,
        R`Put the center and \(r^{2}\) into \((x - a)^{2} + (y - b)^{2} + (z - c)^{2} = r^{2}\).`,
      ],
      answer: R`\((x - 1)^{2} + (y + 2)^{2} + (z - 3)^{2} = 49\)`,
    },
    {
      title: 'Angle between two vectors',
      problem: R`Find the angle between \(\mathbf{u} = \langle 1, 2, 2 \rangle\) and \(\mathbf{v} = \langle 1, 0, 1 \rangle\).`,
      steps: [
        R`Dot product: \(\mathbf{u} \cdot \mathbf{v} = (1)(1) + (2)(0) + (2)(1) = 3\).`,
        R`Lengths: \(|\mathbf{u}| = \sqrt{1 + 4 + 4} = 3\) and \(|\mathbf{v}| = \sqrt{1 + 0 + 1} = \sqrt{2}\).`,
        R`\(\cos\theta = \dfrac{\mathbf{u} \cdot \mathbf{v}}{|\mathbf{u}||\mathbf{v}|} = \dfrac{3}{3\sqrt{2}} = \dfrac{\sqrt{2}}{2}\).`,
      ],
      answer: R`\(\theta = 45^\circ\)`,
    },
    {
      title: 'Scalar and vector projection',
      problem: R`Find the scalar and vector projections of \(\mathbf{v} = \langle 3, 4, 1 \rangle\) onto \(\mathbf{u} = \langle 2, 1, -2 \rangle\).`,
      steps: [
        R`\(\mathbf{u} \cdot \mathbf{v} = (2)(3) + (1)(4) + (-2)(1) = 8\).`,
        R`\(|\mathbf{u}| = \sqrt{4 + 1 + 4} = 3\), so \(\mathbf{u} \cdot \mathbf{u} = 9\).`,
        R`Scalar projection: \(\dfrac{\mathbf{u} \cdot \mathbf{v}}{|\mathbf{u}|} = \dfrac{8}{3}\).`,
        R`Vector projection: \(\dfrac{\mathbf{u} \cdot \mathbf{v}}{\mathbf{u} \cdot \mathbf{u}}\,\mathbf{u} = \dfrac{8}{9}\langle 2, 1, -2 \rangle\).`,
      ],
      answer: R`\(\operatorname{comp}_{\mathbf{u}}\mathbf{v} = \frac{8}{3}\) and \(\operatorname{proj}_{\mathbf{u}}\mathbf{v} = \left\langle \frac{16}{9}, \frac{8}{9}, -\frac{16}{9} \right\rangle\)`,
    },
    {
      title: 'Area of a triangle in space',
      problem: R`Find the area of the triangle with vertices \(P(1, 0, 0)\), \(Q(0, 2, 0)\) and \(R(0, 0, 3)\).`,
      steps: [
        R`Two sides: \(\overrightarrow{PQ} = \langle -1, 2, 0 \rangle\) and \(\overrightarrow{PR} = \langle -1, 0, 3 \rangle\).`,
        R`\(\overrightarrow{PQ} \times \overrightarrow{PR} = \langle (2)(3) - (0)(0),\; (0)(-1) - (-1)(3),\; (-1)(0) - (2)(-1) \rangle = \langle 6, 3, 2 \rangle\).`,
        R`Its length is \(\sqrt{36 + 9 + 4} = 7\), the area of the parallelogram on those sides.`,
        'The triangle is half the parallelogram.',
      ],
      answer: R`Area \(= \frac{7}{2}\)`,
    },
    {
      title: 'Word problem: pulling a wagon',
      word: true,
      problem: R`A wagon is pulled 10 m along level ground by a rope that makes a \(60^\circ\) angle with the ground. The tension in the rope is 50 N. How much work is done?`,
      steps: [
        'Only the part of the force that points along the motion does work. The dot product measures exactly that part.',
        R`\(W = \mathbf{F} \cdot \mathbf{D} = |\mathbf{F}||\mathbf{D}|\cos\theta = (50)(10)\cos 60^\circ\).`,
        R`\(\cos 60^\circ = \frac{1}{2}\), so \(W = 500 \cdot \frac{1}{2} = 250\).`,
      ],
      answer: 'The rope does 250 J of work.',
    },
  ],

  models: [
    {
      id: 'dot-cross',
      title: 'Dot and cross product of two vectors',
      intro: 'Type the components of two vectors in space.',
      inputs: [
        { name: 'u1', label: 'u: first component', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'u2', label: 'u: second component', type: 'int', min: -9, max: 9, value: -1 },
        { name: 'u3', label: 'u: third component', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'v1', label: 'v: first component', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'v2', label: 'v: second component', type: 'int', min: -9, max: 9, value: 4 },
        { name: 'v3', label: 'v: third component', type: 'int', min: -9, max: 9, value: -2 },
      ],
      compute({ u1, u2, u3, v1, v2, v3 }) {
        const u = [u1, u2, u3];
        const v = [v1, v2, v3];
        if (isZero(u) || isZero(v)) return { error: 'Give each vector at least one non-zero component, so that it has a direction.' };
        const d = vdot(u, v);
        const c = vcross(u, v);
        const nn = vlen2(u) * vlen2(v);
        const deg = (Math.acos(Math.max(-1, Math.min(1, d / Math.sqrt(nn)))) * 180) / Math.PI;
        const steps = [
          R`Dot product: multiply matching components and add. \(\mathbf{u} \cdot \mathbf{v} = ${dotWork(u, v)} = ${d}\).`,
          R`Lengths: \(|\mathbf{u}| = \sqrt{${sumSq(u)}} = ${sqrtTex(vlen2(u))}\) and \(|\mathbf{v}| = \sqrt{${sumSq(v)}} = ${sqrtTex(vlen2(v))}\).`,
          d === 0
            ? R`The dot product is 0, so the vectors are orthogonal: \(\theta = 90^\circ\).`
            : R`Angle: \(\cos\theta = \dfrac{\mathbf{u} \cdot \mathbf{v}}{|\mathbf{u}||\mathbf{v}|} = ${texFrac(String(d), sqrtTex(nn))} \approx ${num(d / Math.sqrt(nn), { places: 3 })}\), so \(\theta \approx ${num(deg, { places: 1 })}^\circ\).`,
          R`Cross product: \(\mathbf{u} \times \mathbf{v} = ${crossWork(u, v)} = ${V(c)}\).`,
          isZero(c)
            ? R`The cross product is the zero vector, so \(\mathbf{u}\) and \(\mathbf{v}\) are parallel and span no area.`
            : R`Check: \((\mathbf{u} \times \mathbf{v}) \cdot \mathbf{u} = ${dotWork(c, u)} = 0\). The parallelogram on \(\mathbf{u}\) and \(\mathbf{v}\) has area \(|\mathbf{u} \times \mathbf{v}| = ${sqrtTex(vlen2(c))}\).`,
        ];
        return {
          problem: R`\(\mathbf{u} = ${V(u)}\), \(\mathbf{v} = ${V(v)}\)`,
          steps,
          answer: R`\(\mathbf{u} \cdot \mathbf{v} = ${d}\), \(\;\mathbf{u} \times \mathbf{v} = ${V(c)}\), \(\;\theta ${d === 0 ? '=' : '\\approx'} ${num(deg, { places: 1 })}^\circ\)`,
        };
      },
    },
    {
      id: 'work-along-a-path',
      title: 'Word problem: work done by a force',
      word: true,
      intro: 'Choose a force and a straight-line displacement in the plane.',
      inputs: [
        { name: 'fx', label: 'Force, x-component (N)', type: 'int', min: -60, max: 60, value: 30 },
        { name: 'fy', label: 'Force, y-component (N)', type: 'int', min: -60, max: 60, value: 40 },
        { name: 'dx', label: 'Displacement, x-component (m)', type: 'int', min: -20, max: 20, value: 12 },
        { name: 'dy', label: 'Displacement, y-component (m)', type: 'int', min: -20, max: 20, value: 5 },
      ],
      compute({ fx, fy, dx, dy }) {
        const F = [fx, fy];
        const D = [dx, dy];
        if (isZero(F) || isZero(D)) return { error: 'Enter a force and a displacement that are not zero vectors.' };
        const W = vdot(F, D);
        const lenD = vlen(D);
        const comp = W / lenD;
        const s = (0.8 * lenD) / vlen(F); // the force arrow is drawn to its own scale
        const tip = vscale(F, s);
        const foot = vscale(D, (W / vlen2(D)) * s);
        return {
          problem: R`A cart is pulled with a constant force \(\mathbf{F} = ${V(F)}\) N while it moves along \(\mathbf{D} = ${V(D)}\) m. How much work does the force do?`,
          steps: [
            R`Work is force dotted with displacement: \(W = \mathbf{F} \cdot \mathbf{D} = ${dotWork(F, D)} = ${W}\) J.`,
            R`The displacement has length \(|\mathbf{D}| = \sqrt{${sumSq(D)}} = ${sqrtTex(vlen2(D))}${Number.isInteger(lenD) ? '' : ` \\approx ${num(lenD, { places: 2 })}`}\) m.`,
            R`The component of the force along the motion is \(\dfrac{\mathbf{F} \cdot \mathbf{D}}{|\mathbf{D}|} \approx ${num(comp, { places: 2 })}\) N. Multiplying it by the distance gives the same work.`,
            W > 0 ? 'The work is positive: the force helps the motion.' : W < 0 ? 'The work is negative: the force acts against the motion.' : 'The force is perpendicular to the motion, so it does no work.',
          ],
          answer: R`\(W = ${W}\) J`,
          visual: {
            type: 'plot',
            ...squareWindow([[0, 0], D, tip, foot], Math.max(1, lenD * 0.15)),
            segments: [
              { from: [0, 0], to: D, arrow: true, label: 'D', color: 'a' },
              { from: [0, 0], to: tip, arrow: true, label: 'F', color: 'b' },
              { from: tip, to: foot, dashed: true, color: 'd' },
            ],
            points: [{ x: foot[0], y: foot[1], color: 'c' }],
            alt: `The displacement D = ⟨${dx}, ${dy}⟩ and the force F = ⟨${fx}, ${fy}⟩ drawn as arrows from the origin, with the force drawn to its own scale. A dashed line drops from the tip of F to the line of D, marking the component of the force along the motion.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyDistance, easySphereRead, easyCombination, easyMagnitude, easyDot, easyOrthogonal],
    medium: [mediumAngle, mediumComponent, mediumCross, mediumWork, mediumSphere],
    hard: [hardProjection, hardTriangleArea, hardVolume, hardSphereComplete],
    challenge: [challengeFindK, challengeCoplanar, challengeCrossLength, challengeTorque],
  },
};
