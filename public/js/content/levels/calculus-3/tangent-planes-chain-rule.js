import { R, q, frac, num, round, paren, product, terms, poly, polyEval, polyDeriv, numDeriv, numPartial, checkEqual } from '../../lib/index.js';
import { M, Pt, mpTex, mpEval, mpD, mpClean } from './_shared.js';

const fn = (p) => (x, y, z) => mpEval(p, x, y, z);
/** x − a written tidily: sh('x', -3) → "x + 3". */
const sh = (v, a) => terms([[1, v], [-a, '']]);
const planeZ = (p, qq, r) => `z = ${terms([[p, 'x'], [qq, 'y'], [r, '']])}`;
/** A decimal multiple of π: kPi(5.6) → "5.6\pi", kPi(1) → "\pi". */
const kPi = (c) => terms([[round(c, 4), '\\pi']]);
/** Solve g(u) = 0 near u0 by Newton's method with a numerical derivative. */
function newton(g, u0) {
  let u = u0;
  for (let i = 0; i < 40; i++) u -= g(u) / numDeriv(g, u);
  return u;
}

// ───────────── Easy ─────────────

function easyTangentFromData(rng) {
  const [a, b, c] = [rng.int(-4, 4), rng.int(-4, 4), rng.int(-9, 9)];
  const [p, s] = [rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const r = c - p * a - s * b;
  return q({
    prompt: R`The surface \(z = f(x, y)\) passes through \(${Pt([a, b, c])}\), where \(f_{x}(${a}, ${b}) = ${p}\) and \(f_{y}(${a}, ${b}) = ${s}\). Find an equation of the tangent plane at that point.`,
    correct: M(planeZ(p, s, r)),
    wrong: [
      { value: M(planeZ(p, s, c)), why: R`The plane must pass through the point: use \((${sh('x', a)})\) and \((${sh('y', b)})\), not \(x\) and \(y\).` },
      { value: M(planeZ(p, s, c + p * a + s * b)), why: R`Expand \(${p}(${sh('x', a)})\) carefully: the constant it contributes is \(${-p * a}\).` },
      { value: M(planeZ(s, p, c - s * a - p * b)), why: R`\(f_{x}\) multiplies \((x - a)\) and \(f_{y}\) multiplies \((y - b)\).` },
      M(planeZ(-p, -s, c + p * a + s * b)),
      M(planeZ(p, s, r + 1)),
      M(planeZ(p, s, r - 2)),
    ],
    solution: [
      R`Tangent plane: \(z = f(a, b) + f_{x}(a, b)(x - a) + f_{y}(a, b)(y - b)\).`,
      R`\(z = ${c} + ${product(p, `${sh('x', a)}`)} + ${product(s, `${sh('y', b)}`)}\).`,
      R`Expand and collect the constants: \(${planeZ(p, s, r)}\).`,
    ],
    rule: 0,
    skill: 'tangent plane',
    check: () => (p * a + s * b + r === c ? true : 'plane misses the point'),
  });
}

function easyChainData(rng) {
  const [p, s, u, v] = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const ans = p * u + s * v;
  return q({
    prompt: R`Suppose \(z = f(x, y)\), where \(x\) and \(y\) are functions of \(t\). At a certain instant \(\dfrac{\partial z}{\partial x} = ${p}\), \(\dfrac{\partial z}{\partial y} = ${s}\), \(\dfrac{dx}{dt} = ${u}\) and \(\dfrac{dy}{dt} = ${v}\). Find \(\dfrac{dz}{dt}\) at that instant.`,
    correct: ans,
    wrong: [
      { value: (p + s) * (u + v), why: 'Multiply along each branch first, then add the two products.' },
      { value: p * v + s * u, why: R`Pair each partial derivative with the rate of its own variable: \(\dfrac{\partial z}{\partial x}\) with \(\dfrac{dx}{dt}\).` },
      { value: p * u, why: R`\(z\) also depends on \(t\) through \(y\). Add \(\dfrac{\partial z}{\partial y}\dfrac{dy}{dt}\).` },
      p * u - s * v,
      p + s + u + v,
    ],
    solution: [
      R`Chain rule: \(\dfrac{dz}{dt} = \dfrac{\partial z}{\partial x}\dfrac{dx}{dt} + \dfrac{\partial z}{\partial y}\dfrac{dy}{dt}\).`,
      R`\(\dfrac{dz}{dt} = ${product(p, u)} + ${product(s, v)} = ${p * u} + ${paren(s * v)} = ${ans}\).`,
    ],
    rule: 3,
    skill: 'chain rule from values',
    check: () => checkEqual(ans, numDeriv((t) => p * (u * t) + s * (v * t), 0.3), 1e-6),
  });
}

function easyDifferential(rng) {
  let p;
  do p = mpClean(rng.sample([[2, 0], [0, 2], [1, 1], [2, 1], [1, 2], [3, 0], [0, 3]], 2).map(([i, j]) => [rng.nonzero(-5, 5), i, j]));
  while (!mpD(p, 0).length || !mpD(p, 1).length || mpTex(mpD(p, 0)) === mpTex(mpD(p, 1)));
  const [fx, fy] = [mpTex(mpD(p, 0)), mpTex(mpD(p, 1))];
  const dz = (a, b) => M(`dz = (${a})\\,dx + (${b})\\,dy`);
  return q({
    prompt: R`Find the total differential \(dz\) for \(z = ${mpTex(p)}\).`,
    correct: dz(fx, fy),
    wrong: [
      { value: dz(fy, fx), why: R`\(dx\) is multiplied by \(\dfrac{\partial z}{\partial x}\) and \(dy\) by \(\dfrac{\partial z}{\partial y}\).` },
      { value: M(`dz = (${fx})\\,dx`), why: R`A change in \(y\) also changes \(z\). Add the \(dy\) term.` },
      { value: dz(mpTex(p), mpTex(p)), why: R`The coefficients are the partial derivatives of \(z\), not \(z\) itself.` },
      M(`dz = ${fx} + ${fy.startsWith('-') ? `(${fy})` : fy}`),
      dz(fx, mpTex(mpD(mpD(p, 1), 1)) || '0'),
    ],
    solution: [R`\(dz = \dfrac{\partial z}{\partial x}\,dx + \dfrac{\partial z}{\partial y}\,dy\).`, R`\(\dfrac{\partial z}{\partial x} = ${fx}\) and \(\dfrac{\partial z}{\partial y} = ${fy}\).`, R`\(dz = (${fx})\,dx + (${fy})\,dy\).`],
    rule: 2,
    skill: 'total differential',
    check: () => (checkEqual(mpEval(mpD(p, 0), 0.7, -1.1), numPartial(fn(p), [0.7, -1.1], 0), 1e-5) === true ? checkEqual(mpEval(mpD(p, 1), 0.7, -1.1), numPartial(fn(p), [0.7, -1.1], 1), 1e-5) : 'x-partial mismatch'),
  });
}

// ───────────── Medium ─────────────

function mediumTangentPlane(rng) {
  let p;
  do p = mpClean([[rng.int(-3, 3), 2, 0], [rng.int(-3, 3), 1, 1], [rng.int(-3, 3), 0, 2], [rng.int(-4, 4), 1, 0], [rng.int(-4, 4), 0, 1]]);
  while (p.filter((t) => t[1] + t[2] === 2).length < 2);
  const [a, b] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const [c, fx, fy] = [mpEval(p, a, b), mpEval(mpD(p, 0), a, b), mpEval(mpD(p, 1), a, b)];
  const r = c - fx * a - fy * b;
  return q({
    prompt: R`Find an equation of the tangent plane to \(z = ${mpTex(p)}\) at the point where \((x, y) = (${a}, ${b})\).`,
    correct: M(planeZ(fx, fy, r)),
    wrong: [
      { value: M(planeZ(fx, fy, c)), why: R`The plane touches the surface at \((${a}, ${b}, ${c})\). Build it from \((${sh('x', a)})\) and \((${sh('y', b)})\).` },
      { value: M(planeZ(fx, fy, c + fx * a + fy * b)), why: 'Check the signs when you expand the brackets and collect the constants.' },
      M(planeZ(fy, fx, c - fy * a - fx * b)),
      M(planeZ(fx, fy, r + 1)),
      M(planeZ(-fx, -fy, c + fx * a + fy * b)),
      M(planeZ(fx, fy, r - 2)),
    ],
    solution: [
      R`Height of the point: \(f(${a}, ${b}) = ${c}\).`,
      R`\(f_{x} = ${mpTex(mpD(p, 0))}\), so \(f_{x}(${a}, ${b}) = ${fx}\). \(f_{y} = ${mpTex(mpD(p, 1))}\), so \(f_{y}(${a}, ${b}) = ${fy}\).`,
      R`\(z = ${c} + ${product(fx, `${sh('x', a)}`)} + ${product(fy, `${sh('y', b)}`)}\).`,
      R`Simplify: \(${planeZ(fx, fy, r)}\).`,
    ],
    rule: 0,
    skill: 'tangent plane',
    check: () => (Math.abs(numPartial(fn(p), [a, b], 0) - fx) < 1e-5 && Math.abs(numPartial(fn(p), [a, b], 1) - fy) < 1e-5 && fx * a + fy * b + r === c ? true : 'not the tangent plane'),
  });
}

function mediumLinearEstimate(rng) {
  const [m, n] = rng.pick([[2, 1], [1, 2], [2, 2], [3, 1], [1, 3], [1, 1]]);
  const [a, b] = [rng.int(1, 4), rng.int(1, 3)];
  const [dx, dy] = [rng.pick([-0.2, -0.1, 0.1, 0.2]), rng.pick([-0.2, -0.1, 0.1, 0.2])];
  const p = [[1, m, n]];
  const [f0, fx, fy] = [mpEval(p, a, b), mpEval(mpD(p, 0), a, b), mpEval(mpD(p, 1), a, b)];
  const est = round(f0 + fx * dx + fy * dy, 4);
  return q({
    prompt: R`Use the linear approximation of \(f(x, y) = ${mpTex(p)}\) at \((${a}, ${b})\) to estimate \(f(${num(a + dx)}, ${num(b + dy)})\).`,
    correct: est,
    wrong: [
      { value: f0, why: R`That is \(f(${a}, ${b})\). Add the changes \(f_{x}\,\Delta x + f_{y}\,\Delta y\).` },
      { value: round(f0 + fx * dy + fy * dx, 4), why: R`\(f_{x}\) multiplies the change in \(x\) and \(f_{y}\) multiplies the change in \(y\).` },
      { value: round(f0 + fx * dx - fy * dy, 4), why: R`Keep the sign of each change: \(\Delta x = ${num(dx)}\) and \(\Delta y = ${num(dy)}\).` },
      round(f0 + fx * dx, 4),
      round(f0 - fx * dx - fy * dy, 4),
    ],
    solution: [
      R`\(f(${a}, ${b}) = ${f0}\), \(f_{x} = ${mpTex(mpD(p, 0))}\) gives \(f_{x}(${a}, ${b}) = ${fx}\), and \(f_{y} = ${mpTex(mpD(p, 1))}\) gives \(f_{y}(${a}, ${b}) = ${fy}\).`,
      R`\(L(x, y) = ${f0} + ${fx}(x - ${a}) + ${fy}(y - ${b})\), with \(\Delta x = ${num(dx)}\) and \(\Delta y = ${num(dy)}\).`,
      R`\(f(${num(a + dx)}, ${num(b + dy)}) \approx ${f0} + ${product(fx, dx)} + ${product(fy, dy)} = ${num(est)}\).`,
    ],
    rule: 1,
    skill: 'linear approximation',
    check: () => checkEqual(est, fn(p)(a, b) + numPartial(fn(p), [a, b], 0) * dx + numPartial(fn(p), [a, b], 1) * dy, 1e-6),
  });
}

function mediumChainOneVar(rng) {
  const p = mpClean(rng.sample([[2, 0], [1, 1], [0, 2], [2, 1], [1, 2]], 2).map(([i, j]) => [rng.nonzero(-3, 3), i, j]));
  const xt = rng.bool() ? [1, 0, rng.int(-2, 2)] : [rng.nonzero(-3, 3), rng.int(-3, 3)];
  const yt = [rng.nonzero(-3, 3), rng.int(-3, 3)];
  const t0 = rng.pick([-1, 0, 1, 2]);
  const [x0, y0, dx, dy] = [polyEval(xt, t0), polyEval(yt, t0), polyEval(polyDeriv(xt), t0), polyEval(polyDeriv(yt), t0)];
  const [fx, fy] = [mpEval(mpD(p, 0), x0, y0), mpEval(mpD(p, 1), x0, y0)];
  const ans = fx * dx + fy * dy;
  return q({
    prompt: R`Let \(z = ${mpTex(p)}\), where \(x = ${poly(xt, 't')}\) and \(y = ${poly(yt, 't')}\). Find \(\dfrac{dz}{dt}\) at \(t = ${t0}\).`,
    correct: ans,
    wrong: [
      { value: fx * dx, why: R`\(z\) also changes through \(y\). Add \(\dfrac{\partial z}{\partial y}\dfrac{dy}{dt}\).` },
      { value: mpEval(mpD(p, 0), t0, t0) * dx + mpEval(mpD(p, 1), t0, t0) * dy, why: R`Evaluate the partial derivatives at \((x, y) = (${x0}, ${y0})\), the position when \(t = ${t0}\), not at \((${t0}, ${t0})\).` },
      fx + fy,
      fx * dy + fy * dx,
      ans + dx,
    ],
    solution: [
      R`At \(t = ${t0}\): \(x = ${x0}\), \(y = ${y0}\), \(\dfrac{dx}{dt} = ${dx}\) and \(\dfrac{dy}{dt} = ${dy}\).`,
      R`\(\dfrac{\partial z}{\partial x} = ${mpTex(mpD(p, 0))} = ${fx}\) and \(\dfrac{\partial z}{\partial y} = ${mpTex(mpD(p, 1))} = ${fy}\) at \((${x0}, ${y0})\).`,
      R`\(\dfrac{dz}{dt} = ${product(fx, dx)} + ${product(fy, dy)} = ${ans}\).`,
    ],
    rule: 3,
    skill: 'chain rule, one variable',
    check: () => checkEqual(ans, numDeriv((t) => mpEval(p, polyEval(xt, t), polyEval(yt, t)), t0), 1e-5, 'dz/dt'),
  });
}

// ───────────── Hard ─────────────

function hardImplicit(rng) {
  const three = rng.bool();
  let F;
  let P;
  do {
    F = three
      ? mpClean([[rng.nonzero(-3, 3), 2, 0, 0], [rng.nonzero(-3, 3), 0, 2, 0], [rng.nonzero(-3, 3), 0, 0, rng.int(2, 3)], [rng.int(-3, 3), 1, 0, 1], [rng.int(-3, 3), 0, 1, 1]])
      : mpClean([[rng.nonzero(-3, 3), rng.int(2, 3), 0], [rng.nonzero(-3, 3), 0, rng.int(2, 3)], [rng.nonzero(-4, 4), 1, 1]]);
    P = [rng.nonzero(-3, 3), rng.nonzero(-3, 3), three ? rng.nonzero(-3, 3) : 0];
  } while (mpEval(mpD(F, three ? 2 : 1), ...P) === 0 || mpEval(mpD(F, 0), ...P) === 0);
  const c = mpEval(F, ...P);
  const last = three ? 2 : 1;
  const [Fx, Fl] = [mpEval(mpD(F, 0), ...P), mpEval(mpD(F, last), ...P)];
  const ans = frac(-Fx, Fl);
  const [dep, dTex, sub] = three ? ['z', '\\dfrac{\\partial z}{\\partial x}', 'z'] : ['y', '\\dfrac{dy}{dx}', 'y'];
  return q({
    prompt: three
      ? R`The equation \(${mpTex(F)} = ${c}\) defines \(z\) as a function of \(x\) and \(y\) near the point \(${Pt(P)}\). Find \(\dfrac{\partial z}{\partial x}\) at that point.`
      : R`The equation \(${mpTex(F)} = ${c}\) defines \(y\) as a function of \(x\) near the point \(${Pt(P.slice(0, 2))}\). Find \(\dfrac{dy}{dx}\) at that point.`,
    correct: ans,
    wrong: [
      { value: ans.neg(), why: R`The formula carries a minus sign: \(${dTex} = -\dfrac{F_{x}}{F_{${sub}}}\).` },
      { value: frac(-Fl, Fx), why: R`\(F_{x}\) goes on top and \(F_{${sub}}\) underneath.` },
      -Fx,
      frac(Fx + Fl, Fl),
      frac(-Fx, 2 * Fl),
    ],
    solution: [
      R`Write the equation as \(F = ${c}\) with \(F = ${mpTex(F)}\). Then \(${dTex} = -\dfrac{F_{x}}{F_{${sub}}}\).`,
      R`\(F_{x} = ${mpTex(mpD(F, 0))}\), which is \(${Fx}\) at the point. \(F_{${sub}} = ${mpTex(mpD(F, last))}\), which is \(${Fl}\) at the point.`,
      R`\(${dTex} = -\dfrac{${Fx}}{${Fl}}${`-\\frac{${Fx}}{${Fl}}` === ans.tex() ? '' : ` = ${ans.tex()}`}\).`,
    ],
    rule: 5,
    skill: 'implicit differentiation',
    check: () => {
      // solve F = c for the dependent variable at x ± h and take a difference quotient
      const h = 1e-4;
      const solve = (x) => newton((u) => (three ? mpEval(F, x, P[1], u) : mpEval(F, x, u)) - c, P[last]);
      return checkEqual(ans.value, (solve(P[0] + h) - solve(P[0] - h)) / (2 * h), 1e-4, `d${dep}/dx`);
    },
  });
}

// Changes of variables (x(s, t), y(s, t)) with their partial derivatives.
const SUBS = [
  () => ({ x: 'st', y: 's + t', X: (s, t) => s * t, Y: (s, t) => s + t, d: (s, t) => [[t, 1], [s, 1]], dTex: [['t', '1'], ['s', '1']] }),
  () => ({ x: 's^{2} - t^{2}', y: '2st', X: (s, t) => s * s - t * t, Y: (s, t) => 2 * s * t, d: (s, t) => [[2 * s, 2 * t], [-2 * t, 2 * s]], dTex: [['2s', '2t'], ['-2t', '2s']] }),
  () => ({ x: 's + t^{2}', y: 's^{2} - t', X: (s, t) => s + t * t, Y: (s, t) => s * s - t, d: (s, t) => [[1, 2 * s], [2 * t, -1]], dTex: [['1', '2s'], ['2t', '-1']] }),
  (rng) => {
    let a;
    let b;
    let c;
    let e;
    do [a, b, c, e] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3), rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    while (a * e === b * c);
    return { x: terms([[a, 's'], [b, 't']]), y: terms([[c, 's'], [e, 't']]), X: (s, t) => a * s + b * t, Y: (s, t) => c * s + e * t, d: () => [[a, c], [b, e]], dTex: [[String(a), String(c)], [String(b), String(e)]] };
  },
];

function hardChainTwoVar(rng) {
  const p = mpClean(rng.sample([[2, 0], [1, 1], [0, 2], [2, 1], [1, 2]], 2).map(([i, j]) => [rng.nonzero(-3, 3), i, j]));
  const k = rng.pick(SUBS)(rng);
  const [s0, t0] = [rng.pick([-2, -1, 1, 2]), rng.pick([-2, -1, 1, 2])];
  const w = rng.int(0, 1); // 0: ∂/∂s, 1: ∂/∂t
  const name = 'st'[w];
  const [x0, y0] = [k.X(s0, t0), k.Y(s0, t0)];
  const [fx, fy] = [mpEval(mpD(p, 0), x0, y0), mpEval(mpD(p, 1), x0, y0)];
  const D = k.d(s0, t0);
  const ans = fx * D[w][0] + fy * D[w][1];
  const val = (tex, v) => (tex === String(v) ? tex : `${tex} = ${v}`);
  return q({
    prompt: R`Let \(z = ${mpTex(p)}\), where \(x = ${k.x}\) and \(y = ${k.y}\). Find \(\dfrac{\partial z}{\partial ${name}}\) when \((s, t) = (${s0}, ${t0})\).`,
    correct: ans,
    wrong: [
      { value: fx * D[1 - w][0] + fy * D[1 - w][1], why: R`That uses the derivatives of \(x\) and \(y\) with respect to \(${'st'[1 - w]}\). Here \(${name}\) is the variable that changes.` },
      { value: fx * D[w][0], why: R`There are two branches from \(z\) to \(${name}\): one through \(x\) and one through \(y\). Add them.` },
      { value: mpEval(mpD(p, 0), s0, t0) * D[w][0] + mpEval(mpD(p, 1), s0, t0) * D[w][1], why: R`Evaluate \(\dfrac{\partial z}{\partial x}\) and \(\dfrac{\partial z}{\partial y}\) at \((x, y) = (${x0}, ${y0})\), not at \((s, t)\).` },
      fx + fy,
      ans + D[w][1],
    ],
    solution: [
      R`Chain rule: \(\dfrac{\partial z}{\partial ${name}} = \dfrac{\partial z}{\partial x}\dfrac{\partial x}{\partial ${name}} + \dfrac{\partial z}{\partial y}\dfrac{\partial y}{\partial ${name}}\).`,
      R`At \((s, t) = (${s0}, ${t0})\): \(x = ${x0}\), \(y = ${y0}\), \(\dfrac{\partial x}{\partial ${name}} = ${val(k.dTex[w][0], D[w][0])}\) and \(\dfrac{\partial y}{\partial ${name}} = ${val(k.dTex[w][1], D[w][1])}\).`,
      R`\(\dfrac{\partial z}{\partial x} = ${mpTex(mpD(p, 0))} = ${fx}\) and \(\dfrac{\partial z}{\partial y} = ${mpTex(mpD(p, 1))} = ${fy}\) at \((${x0}, ${y0})\).`,
      R`\(\dfrac{\partial z}{\partial ${name}} = ${product(fx, D[w][0])} + ${product(fy, D[w][1])} = ${ans}\).`,
    ],
    rule: 4,
    skill: 'chain rule, two variables',
    check: () => checkEqual(ans, numPartial((s, t) => mpEval(p, k.X(s, t), k.Y(s, t)), [s0, t0], w), 1e-5, 'partial of the composition'),
  });
}

function hardErrorEstimate(rng) {
  const e = rng.pick([0.05, 0.1, 0.2]);
  if (rng.bool()) {
    const [r, h] = [rng.int(2, 8), rng.int(3, 12)];
    const e2 = rng.pick([0.05, 0.1, 0.2]);
    const k = round(2 * r * h * e + r * r * e2, 4);
    const show = (c) => R`\(${kPi(c)}\) cm³`;
    return q({
      prompt: R`A cylindrical can is measured to have radius ${r} cm, with a possible error of ${num(e)} cm, and height ${h} cm, with a possible error of ${num(e2)} cm. Use differentials to estimate the largest possible error in the volume \(V = \pi r^{2}h\).`,
      correct: show(k),
      wrong: [
        { value: show(r * h * e + r * r * e2), why: R`\(\dfrac{\partial V}{\partial r} = 2\pi rh\). Keep the factor 2.` },
        { value: show(2 * r * h * e), why: 'The error in the height matters too. Add its contribution.' },
        { value: show(r * r * h), why: 'That is the volume. The question asks how much it could be off by.' },
        show(2 * r * h * e2 + r * r * e),
        show(k + 1),
      ],
      solution: [
        R`\(dV = \dfrac{\partial V}{\partial r}\,dr + \dfrac{\partial V}{\partial h}\,dh = 2\pi rh\,dr + \pi r^{2}\,dh\).`,
        R`With \(r = ${r}\), \(h = ${h}\), \(dr = ${num(e)}\), \(dh = ${num(e2)}\): \(dV = 2\pi${product(r, h, e)} + \pi${product(r * r, e2)}\).`,
        R`\(dV = ${kPi(2 * r * h * e)} + ${kPi(r * r * e2)} = ${kPi(k)} \approx ${num(k * Math.PI, { places: 1 })}\) cm³.`,
      ],
      rule: 2,
      skill: 'error estimates',
      check: () => checkEqual(k * Math.PI, numPartial((x, y) => Math.PI * x * x * y, [r, h], 0) * e + numPartial((x, y) => Math.PI * x * x * y, [r, h], 1) * e2, 1e-5),
    });
  }
  const [x, y, z] = [rng.int(20, 60), rng.int(20, 60), rng.int(10, 40)].map((v) => 5 * Math.round(v / 5));
  const ans = round(e * (y * z + x * z + x * y), 4);
  return q({
    prompt: R`A rectangular box is measured as ${x} cm by ${y} cm by ${z} cm, and each measurement may be off by as much as ${num(e)} cm. Use differentials to estimate the largest possible error in the volume.`,
    correct: ans,
    unit: 'cm³',
    wrong: [
      { value: round(e * x * y * z, 4), why: R`\(dV = yz\,dx + xz\,dy + xy\,dz\): each error is multiplied by the area of a face, not by the whole volume.` },
      { value: round(e * y * z, 4), why: 'All three measurements can be off. Add the three contributions.' },
      round(3 * e * (x + y + z), 4),
      round(e * (x + y + z), 4),
      round(2 * ans, 4),
    ],
    solution: [
      R`\(V = xyz\), so \(dV = yz\,dx + xz\,dy + xy\,dz\).`,
      R`With \(dx = dy = dz = ${num(e)}\): \(dV = ${num(e)}\left(${product(y, z)} + ${product(x, z)} + ${product(x, y)}\right)\).`,
      R`\(dV = ${num(e)}(${y * z + x * z + x * y}) = ${num(ans)}\) cm³.`,
    ],
    rule: 2,
    skill: 'error estimates',
    check: () => checkEqual(ans, [0, 1, 2].reduce((t, i) => t + numPartial((a, b, c) => a * b * c, [x, y, z], i) * e, 0), 1e-5),
  });
}

// ───────────── Challenge ─────────────

function challengeParallelTangent(rng) {
  const [A, B] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const [x0, y0] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const [P, Q] = [2 * A * x0, 2 * B * y0];
  const f = (x, y) => A * x * x + B * y * y;
  const k = rng.pick([1, 2, -1]);
  const d = rng.int(-9, 9);
  const pt = (x, y) => M(Pt([x, y, f(x, y)]));
  return q({
    prompt: R`At which point of the surface \(z = ${terms([[A, 'x^{2}'], [B, 'y^{2}']])}\) is the tangent plane parallel to the plane \(${terms([[k * P, 'x'], [k * Q, 'y'], [-k, 'z']])} = ${d}\)?`,
    correct: pt(x0, y0),
    wrong: [
      { value: pt(2 * x0, 2 * y0), why: R`\(f_{x} = ${terms([[2 * A, 'x']])}\), so solve \(${terms([[2 * A, 'x']])} = ${P}\), and likewise for \(y\).` },
      { value: M(Pt([P, Q, f(P, Q)])), why: R`\(${P}\) and \(${Q}\) are the slopes \(f_{x}\) and \(f_{y}\) that the tangent plane needs, not the coordinates of the point.` },
      pt(-x0, -y0),
      pt(y0, x0),
      pt(x0, -y0),
      pt(-x0, y0),
    ],
    solution: [
      R`Solve the given plane for \(z\): \(z = ${terms([[P, 'x'], [Q, 'y'], [frac(-d, k), '']])}\). Its slopes are \(${P}\) in the \(x\)-direction and \(${Q}\) in the \(y\)-direction.`,
      R`The tangent plane at \((x, y)\) has slopes \(f_{x} = ${terms([[2 * A, 'x']])}\) and \(f_{y} = ${terms([[2 * B, 'y']])}\). Parallel planes have equal slopes.`,
      R`\(${terms([[2 * A, 'x']])} = ${P}\) gives \(x = ${x0}\), and \(${terms([[2 * B, 'y']])} = ${Q}\) gives \(y = ${y0}\). Then \(z = f(${x0}, ${y0}) = ${f(x0, y0)}\).`,
    ],
    rule: 0,
    skill: 'tangent plane',
    check: () => (Math.abs(numPartial(f, [x0, y0], 0) - P) < 1e-5 && Math.abs(numPartial(f, [x0, y0], 1) - Q) < 1e-5 ? true : 'slopes do not match the plane'),
  });
}

function challengeChainTable(rng) {
  const t0 = rng.int(1, 5);
  let X;
  let Y;
  do [X, Y] = [rng.int(-4, 6), rng.int(-4, 6)];
  while (X === t0 || Y === t0 || X === Y);
  const [u, v, p, s, p2, s2] = [rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const ans = p * u + s * v;
  const rows = rng.shuffle([[R`\(f_{x}(${X}, ${Y})\)`, p], [R`\(f_{y}(${X}, ${Y})\)`, s], [R`\(f_{x}(${t0}, ${t0})\)`, p2], [R`\(f_{y}(${t0}, ${t0})\)`, s2]]);
  return q({
    prompt: R`Let \(z = f(x, y)\) with \(x = g(t)\) and \(y = h(t)\). Use the values in the table to find \(\dfrac{dz}{dt}\) at \(t = ${t0}\).`,
    visual: {
      type: 'table',
      headers: ['Quantity', 'Value'],
      rows: [[R`\(g(${t0})\)`, R`\(${X}\)`], [R`\(h(${t0})\)`, R`\(${Y}\)`], [R`\(g'(${t0})\)`, R`\(${u}\)`], [R`\(h'(${t0})\)`, R`\(${v}\)`], ...rows.map(([a, b]) => [a, R`\(${b}\)`])],
      alt: `Table of values: g(${t0}) = ${X}, h(${t0}) = ${Y}, g′(${t0}) = ${u}, h′(${t0}) = ${v}, f_x(${X}, ${Y}) = ${p}, f_y(${X}, ${Y}) = ${s}, f_x(${t0}, ${t0}) = ${p2}, f_y(${t0}, ${t0}) = ${s2}.`,
    },
    correct: ans,
    wrong: [
      { value: p2 * u + s2 * v, why: R`The partial derivatives must be evaluated where the curve is at \(t = ${t0}\): at \((g(${t0}), h(${t0})) = (${X}, ${Y})\), not at \((${t0}, ${t0})\).` },
      { value: p * v + s * u, why: R`\(f_{x}\) is multiplied by \(g'\) and \(f_{y}\) by \(h'\).` },
      p * u,
      p + s,
      p * X + s * Y,
    ],
    solution: [
      R`Chain rule: \(\dfrac{dz}{dt} = f_{x}(x, y)\,g'(t) + f_{y}(x, y)\,h'(t)\), with \(x\) and \(y\) taken at time \(t\).`,
      R`At \(t = ${t0}\) the point is \((g(${t0}), h(${t0})) = (${X}, ${Y})\), so use \(f_{x}(${X}, ${Y}) = ${p}\) and \(f_{y}(${X}, ${Y}) = ${s}\).`,
      R`\(\dfrac{dz}{dt} = ${product(p, u)} + ${product(s, v)} = ${ans}\).`,
    ],
    rule: 3,
    skill: 'chain rule from a table',
  });
}

const FORMULAS = [
  { what: 'the volume of a cylinder', tex: 'V = \\pi r^{2}h', vars: ['r', 'h'], exp: [2, 1], js: (a, b) => Math.PI * a * a * b },
  { what: 'the kinetic energy', tex: 'K = \\frac{1}{2}mv^{2}', vars: ['m', 'v'], exp: [1, 2], js: (a, b) => 0.5 * a * b * b },
  { what: 'the electrical power', tex: 'P = \\dfrac{V^{2}}{R}', vars: ['V', 'R'], exp: [2, -1], js: (a, b) => (a * a) / b },
  { what: 'the period of a pendulum', tex: 'T = 2\\pi\\sqrt{\\dfrac{L}{g}}', vars: ['L', 'g'], exp: [0.5, -0.5], js: (a, b) => 2 * Math.PI * Math.sqrt(a / b) },
  { what: 'the gravitational force', tex: 'F = \\dfrac{Gm}{r^{2}}', vars: ['m', 'r'], exp: [1, -2], js: (a, b) => a / (b * b) },
  { what: 'the volume of a cone', tex: 'V = \\frac{1}{3}\\pi r^{2}h', vars: ['r', 'h'], exp: [2, 1], js: (a, b) => (Math.PI * a * a * b) / 3 },
];

function challengePercentError(rng) {
  const k = rng.pick(FORMULAS);
  const [e1, e2] = [rng.pick([1, 2, 3, 4]), rng.pick([1, 2, 3, 4])];
  const [w1, w2] = k.exp.map(Math.abs);
  const ans = w1 * e1 + w2 * e2;
  const part = (w, e) => (w === 1 ? `${e}\\%` : `${num(w)}(${e}\\%)`);
  return q({
    prompt: R`In the formula \(${k.tex}\) for ${k.what}, \(${k.vars[0]}\) is measured with a possible error of ${e1}% and \(${k.vars[1]}\) with a possible error of ${e2}%. Use differentials to estimate the largest possible percentage error in the result.`,
    correct: ans,
    fmt: (v) => R`\(${num(v)}\%\)`,
    wrong: [
      { value: e1 + e2, why: 'Each percentage error is multiplied by the power of its variable in the formula.' },
      { value: Math.abs(k.exp[0] * e1 + k.exp[1] * e2), why: 'For the largest possible error the two contributions add, even when a variable is in the denominator: the errors can have opposite signs.' },
      w1 * e2 + w2 * e1,
      (w1 + w2) * (e1 + e2),
      e1 * e2,
    ],
    solution: [
      R`Take logarithms and differentiate: \(\dfrac{d(\text{result})}{\text{result}} = ${terms([[frac(Math.round(k.exp[0] * 2), 2), `\\dfrac{d${k.vars[0]}}{${k.vars[0]}}`], [frac(Math.round(k.exp[1] * 2), 2), `\\dfrac{d${k.vars[1]}}{${k.vars[1]}}`]])}\).`,
      R`Each relative error is multiplied by the power of its variable. In the worst case the two terms have the same sign.`,
      R`Largest percentage error \(\approx ${part(w1, e1)} + ${part(w2, e2)} = ${num(ans)}\%\).`,
    ],
    rule: 2,
    skill: 'relative error',
    check: () => {
      const [a, b] = [2, 3];
      const f0 = k.js(a, b);
      return checkEqual(ans, Math.abs((a * numPartial(k.js, [a, b], 0)) / f0) * e1 + Math.abs((b * numPartial(k.js, [a, b], 1)) / f0) * e2, 1e-5, 'percentage error');
    },
  });
}

export default {
  id: 'tangent-planes-chain-rule',
  title: 'Tangent Planes, Linear Approximation & the Chain Rule',
  summary: 'Build tangent planes, estimate values and errors with differentials, and differentiate composite and implicit functions.',
  standards: ['OpenStax Calculus Vol. 3 §4.4', 'OpenStax Calculus Vol. 3 §4.5'],

  explain: {
    intro: R`Near a point, a smooth surface \(z = f(x, y)\) looks like a plane: its **tangent plane**. The partial derivatives are the slopes of that plane, so they tell us how \(z\) responds to small changes in \(x\) and \(y\). The same idea gives the chain rule: when \(x\) and \(y\) themselves depend on other variables, each one passes its change on to \(z\).`,
    rules: [
      { title: 'Tangent plane', text: R`The tangent plane to \(z = f(x, y)\) at \((a, b)\) is \(z = f(a, b) + f_{x}(a, b)(x - a) + f_{y}(a, b)(y - b)\). It passes through the point and has the same slopes as the surface in the \(x\)- and \(y\)-directions.`, example: R`For \(f = x^{2} + 2y^{2}\) at \((1, 1)\): \(f = 3\), \(f_{x} = 2\), \(f_{y} = 4\), so \(z = 3 + 2(x - 1) + 4(y - 1) = 2x + 4y - 3\).` },
      { title: 'Linear approximation', text: R`Close to \((a, b)\), \(f(x, y) \approx L(x, y) = f(a, b) + f_{x}(a, b)(x - a) + f_{y}(a, b)(y - b)\). Use it to estimate values of \(f\) near a point where \(f\) is easy to evaluate.`, example: R`With the plane above, \(f(1.1, 0.9) \approx 2(1.1) + 4(0.9) - 3 = 2.8\). (The exact value is \(2.83\).)` },
      { title: 'Total differential and errors', text: R`The total differential is \(dz = f_{x}\,dx + f_{y}\,dy\). If \(x\) and \(y\) are measured with small errors \(dx\) and \(dy\), then \(dz\) estimates the resulting error in \(z\). For the largest possible error, add the sizes of the two terms.`, example: R`For \(A = xy\) with \(x = 10 \pm 0.1\) and \(y = 5 \pm 0.2\): \(dA = y\,dx + x\,dy = 5(0.1) + 10(0.2) = 2.5\).` },
      { title: 'Chain rule: one independent variable', text: R`If \(z = f(x, y)\) and \(x\), \(y\) are functions of \(t\), then \(\dfrac{dz}{dt} = \dfrac{\partial z}{\partial x}\dfrac{dx}{dt} + \dfrac{\partial z}{\partial y}\dfrac{dy}{dt}\). Evaluate the partial derivatives at the point \((x(t), y(t))\).`, example: R`\(z = x^{2} + 3xy\), \(x = t^{2}\), \(y = 2t - 1\). At \(t = 1\): \((x, y) = (1, 1)\), so \(\dfrac{dz}{dt} = (5)(2) + (3)(2) = 16\).` },
      { title: 'Chain rule: two independent variables', text: R`If \(x\) and \(y\) depend on \(s\) and \(t\), then \(\dfrac{\partial z}{\partial s} = \dfrac{\partial z}{\partial x}\dfrac{\partial x}{\partial s} + \dfrac{\partial z}{\partial y}\dfrac{\partial y}{\partial s}\), and similarly for \(t\). A tree diagram helps: multiply along each branch from \(z\) down to \(s\), then add the branches.`, example: R`\(z = xy\), \(x = s + t\), \(y = st\): \(\dfrac{\partial z}{\partial s} = y \cdot 1 + x \cdot t = st + (s + t)t\).` },
      { title: 'Implicit differentiation', text: R`If \(F(x, y) = c\) defines \(y\) as a function of \(x\), then \(\dfrac{dy}{dx} = -\dfrac{F_{x}}{F_{y}}\). If \(F(x, y, z) = c\) defines \(z\), then \(\dfrac{\partial z}{\partial x} = -\dfrac{F_{x}}{F_{z}}\) and \(\dfrac{\partial z}{\partial y} = -\dfrac{F_{y}}{F_{z}}\).`, example: R`For \(x^{3} + y^{3} - 6xy = 0\) at \((3, 3)\): \(F_{x} = 3x^{2} - 6y = 9\) and \(F_{y} = 3y^{2} - 6x = 9\), so \(\dfrac{dy}{dx} = -1\).` },
    ],
    vocab: [
      { term: 'tangent plane', def: 'The plane that touches a surface at a point and has the same slope there in every direction.' },
      { term: 'linearization', def: R`The function \(L(x, y)\) whose graph is the tangent plane. It approximates \(f\) near the point.` },
      { term: 'total differential', def: R`\(dz = f_{x}\,dx + f_{y}\,dy\): the change in height along the tangent plane.` },
      { term: 'tree diagram', def: 'A picture of which variables depend on which. Each path from the top variable to the bottom one gives one term of the chain rule.' },
    ],
    mistakes: [
      R`Writing the tangent plane with \(x\) and \(y\) in place of \((x - a)\) and \((y - b)\). The plane must pass through the point.`,
      R`Leaving out a branch of the chain rule. If \(z\) depends on \(t\) through both \(x\) and \(y\), there are two terms.`,
      R`Evaluating \(f_{x}\) and \(f_{y}\) at the value of \(t\) instead of at the point \((x(t), y(t))\).`,
      R`Dropping the minus sign in \(\dfrac{dy}{dx} = -\dfrac{F_{x}}{F_{y}}\).`,
    ],
    visual: {
      type: 'table',
      caption: 'Tree diagram for z = f(x, y) with x = x(s, t), y = y(s, t): the two paths from z to s',
      headers: ['Path', 'Multiply along the path'],
      rows: [
        [R`\(z \to x \to s\)`, R`\(\dfrac{\partial z}{\partial x} \cdot \dfrac{\partial x}{\partial s}\)`],
        [R`\(z \to y \to s\)`, R`\(\dfrac{\partial z}{\partial y} \cdot \dfrac{\partial y}{\partial s}\)`],
        ['Add the paths', R`\(\dfrac{\partial z}{\partial s} = \dfrac{\partial z}{\partial x}\dfrac{\partial x}{\partial s} + \dfrac{\partial z}{\partial y}\dfrac{\partial y}{\partial s}\)`],
      ],
      alt: 'A table listing the two paths of the tree diagram from z to s, one through x and one through y. The chain rule multiplies the derivatives along each path and adds the results.',
    },
  },

  examples: [
    {
      title: 'Tangent plane and a quick estimate',
      problem: R`Find the tangent plane to \(z = x^{2} + 2y^{2}\) at \((1, 1, 3)\), and use it to estimate the height of the surface above \((1.1, 0.9)\).`,
      steps: [
        R`\(f_{x} = 2x\) and \(f_{y} = 4y\), so \(f_{x}(1, 1) = 2\) and \(f_{y}(1, 1) = 4\).`,
        R`Tangent plane: \(z = 3 + 2(x - 1) + 4(y - 1) = 2x + 4y - 3\).`,
        R`Estimate: \(\Delta x = 0.1\) and \(\Delta y = -0.1\), so \(z \approx 3 + 2(0.1) + 4(-0.1) = 2.8\).`,
        R`The exact height is \(1.1^{2} + 2(0.9)^{2} = 2.83\): the plane is very close.`,
      ],
      answer: R`\(z = 2x + 4y - 3\), and \(f(1.1, 0.9) \approx 2.8\)`,
    },
    {
      title: 'Chain rule along a path',
      problem: R`Let \(z = x^{2} + 3xy\) with \(x = t^{2}\) and \(y = 2t - 1\). Find \(\dfrac{dz}{dt}\) at \(t = 1\).`,
      steps: [
        R`At \(t = 1\): \(x = 1\), \(y = 1\), \(\dfrac{dx}{dt} = 2t = 2\) and \(\dfrac{dy}{dt} = 2\).`,
        R`\(\dfrac{\partial z}{\partial x} = 2x + 3y = 5\) and \(\dfrac{\partial z}{\partial y} = 3x = 3\) at \((1, 1)\).`,
        R`\(\dfrac{dz}{dt} = (5)(2) + (3)(2) = 16\).`,
        R`Check by substituting first: \(z = t^{4} + 6t^{3} - 3t^{2}\), so \(\dfrac{dz}{dt} = 4t^{3} + 18t^{2} - 6t = 16\) at \(t = 1\).`,
      ],
      answer: R`\(\dfrac{dz}{dt} = 16\)`,
    },
    {
      title: 'Implicit differentiation',
      problem: R`The equation \(x^{2} + y^{2} + z^{2} + xz = 13\) defines \(z\) as a function of \(x\) and \(y\) near \((1, 2, 2)\). Find \(\dfrac{\partial z}{\partial x}\) there.`,
      steps: [
        R`Let \(F = x^{2} + y^{2} + z^{2} + xz\). Then \(\dfrac{\partial z}{\partial x} = -\dfrac{F_{x}}{F_{z}}\).`,
        R`\(F_{x} = 2x + z = 4\) and \(F_{z} = 2z + x = 5\) at \((1, 2, 2)\).`,
      ],
      answer: R`\(\dfrac{\partial z}{\partial x} = -\dfrac{4}{5}\)`,
    },
    {
      title: 'Word problem: how accurate is the volume?',
      word: true,
      problem: R`A can is measured as 4 cm in radius and 10 cm tall. The radius may be off by 0.05 cm and the height by 0.1 cm. About how far off could the computed volume \(V = \pi r^{2}h\) be?`,
      steps: [
        'A small error in each measurement changes the volume at the rate given by the matching partial derivative.',
        R`\(dV = 2\pi rh\,dr + \pi r^{2}\,dh\).`,
        R`\(dV = 2\pi(4)(10)(0.05) + \pi(4)^{2}(0.1) = 4\pi + 1.6\pi = 5.6\pi\).`,
      ],
      answer: R`About \(5.6\pi \approx 17.6\) cm³ (the volume itself is \(160\pi \approx 503\) cm³)`,
    },
  ],

  models: [
    {
      id: 'tangent-plane',
      title: 'Tangent plane to a quadratic surface',
      intro: 'Choose the surface z = a·x² + b·xy + c·y² and a point (x₀, y₀).',
      inputs: [
        { name: 'a', label: 'a (x² coefficient)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'b', label: 'b (xy coefficient)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'c', label: 'c (y² coefficient)', type: 'int', min: -5, max: 5, value: 2 },
        { name: 'x0', label: 'x₀', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'y0', label: 'y₀', type: 'int', min: -5, max: 5, value: 2 },
      ],
      compute({ a, b, c, x0, y0 }) {
        const p = mpClean([[a, 2, 0], [b, 1, 1], [c, 0, 2]]);
        const [z0, fx, fy] = [mpEval(p, x0, y0), mpEval(mpD(p, 0), x0, y0), mpEval(mpD(p, 1), x0, y0)];
        const r = z0 - fx * x0 - fy * y0;
        const L = (x, y) => fx * x + fy * y + r;
        const near = [[0.1, 0.1], [0.5, -0.5], [1, 1]].map(([dx, dy]) => [x0 + dx, y0 + dy]);
        const f2 = (v) => num(v, { places: 2 });
        return {
          problem: R`Find the tangent plane to \(z = ${mpTex(p)}\) at \((x, y) = (${x0}, ${y0})\).`,
          steps: [
            R`Height of the point: \(f(${x0}, ${y0}) = ${z0}\).`,
            R`\(f_{x} = ${mpTex(mpD(p, 0))}\), so \(f_{x}(${x0}, ${y0}) = ${fx}\).`,
            R`\(f_{y} = ${mpTex(mpD(p, 1))}\), so \(f_{y}(${x0}, ${y0}) = ${fy}\).`,
            R`\(z = ${z0} + ${product(fx, `${sh('x', x0)}`)} + ${product(fy, `${sh('y', y0)}`)}\), which simplifies to \(${planeZ(fx, fy, r)}\).`,
            'The table compares the surface with its tangent plane. Close to the point they nearly agree; farther away the gap grows.',
          ],
          answer: R`\(${planeZ(fx, fy, r)}\)`,
          visual: {
            type: 'table',
            headers: [R`\((x, y)\)`, R`surface \(f(x, y)\)`, R`plane \(L(x, y)\)`, 'difference'],
            rows: near.map(([x, y]) => [R`\((${num(x)}, ${num(y)})\)`, R`\(${f2(mpEval(p, x, y))}\)`, R`\(${f2(L(x, y))}\)`, R`\(${f2(mpEval(p, x, y) - L(x, y))}\)`]),
            alt: 'Table comparing the height of the surface and of its tangent plane at three points increasingly far from the point of tangency. The difference grows with distance.',
          },
        };
      },
    },
    {
      id: 'can-error',
      title: 'Word problem: measurement error in the volume of a can',
      word: true,
      intro: 'Type the measured radius and height of a can and how far off each measurement might be.',
      inputs: [
        { name: 'r', label: 'Radius (cm)', type: 'int', min: 1, max: 10, value: 4 },
        { name: 'h', label: 'Height (cm)', type: 'int', min: 1, max: 20, value: 10 },
        { name: 'dr', label: 'Possible error in the radius (cm)', type: 'number', min: 0.01, max: 0.5, step: 0.01, value: 0.05 },
        { name: 'dh', label: 'Possible error in the height (cm)', type: 'number', min: 0.01, max: 0.5, step: 0.01, value: 0.1 },
      ],
      compute({ r, h, dr, dh }) {
        const [tr, th] = [round(2 * r * h * dr, 4), round(r * r * dh, 4)];
        const k = round(tr + th, 4);
        const actual = Math.PI * ((r + dr) ** 2 * (h + dh) - r * r * h);
        return {
          problem: R`A can is measured as ${r} cm in radius (give or take ${num(dr)} cm) and ${h} cm tall (give or take ${num(dh)} cm). About how far off could the volume \(V = \pi r^{2}h\) be?`,
          steps: [
            R`Computed volume: \(V = \pi(${r})^{2}(${h}) = ${kPi(r * r * h)} \approx ${num(Math.PI * r * r * h, { places: 1 })}\) cm³.`,
            R`Rates of change: \(\dfrac{\partial V}{\partial r} = 2\pi rh = ${kPi(2 * r * h)}\) and \(\dfrac{\partial V}{\partial h} = \pi r^{2} = ${kPi(r * r)}\).`,
            R`\(dV = ${kPi(2 * r * h)}(${num(dr)}) + ${kPi(r * r)}(${num(dh)}) = ${kPi(tr)} + ${kPi(th)} = ${kPi(k)} \approx ${num(k * Math.PI, { places: 2 })}\) cm³.`,
            R`For comparison, if both measurements were too small by the full amount, the true volume would differ by \(${num(actual, { places: 2 })}\) cm³. The differential gives nearly the same answer with much less work.`,
            tr > th ? 'Most of the uncertainty comes from the radius.' : tr < th ? 'Most of the uncertainty comes from the height.' : 'The two measurements contribute equally.',
          ],
          answer: R`About \(${kPi(k)} \approx ${num(k * Math.PI, { places: 1 })}\) cm³`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyTangentFromData, easyChainData, easyDifferential],
    medium: [mediumTangentPlane, mediumLinearEstimate, mediumChainOneVar],
    hard: [hardImplicit, hardChainTwoVar, hardErrorEstimate],
    challenge: [challengeParallelTangent, challengeChainTable, challengePercentError],
  },
};
