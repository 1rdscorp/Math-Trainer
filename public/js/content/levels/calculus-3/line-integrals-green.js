import { R, q, frac, num, paren, terms, power, dot, numPartial, checkEqual, checkAll, close } from '../../lib/index.js';
import { M, V, Pt, sq, piTex, mpTex, mpEval, mpD, mpClean, mpAdd, mpScale, fp, fpAdd, fpMul, fpPow, fpScale, fpInt, exactDouble, lineInt, scalarLineInt, squareWindow } from './_shared.js';

const PI = Math.PI;
const cf = (n, s) => (n === 1 ? s : n === -1 ? `-${s}` : `${n}${s}`);
const wrapSum = (t) => (t.includes(' + ') || t.includes(' - ') ? `\\left(${t}\\right)` : t);
const wrapNeg = (t) => (t.startsWith('-') ? `\\left(${t}\\right)` : wrapSum(t));
// Polynomials in x and y are lists of terms [coef, i, j]. `pt` prints one in a fixed order, so equal polynomials print alike.
const canon = (p) => mpClean(p).sort((a, b) => b[1] + b[2] - a[1] - a[2] || b[1] - a[1]);
const pt = (p) => mpTex(canon(p));
const fnOf = (p) => (x, y) => mpEval(p, x, y);
const field = (P, Q) => V([pt(P), pt(Q)]);
const F2 = (P, Q) => (x, y) => [mpEval(P, x, y), mpEval(Q, x, y)];
const MIXED = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [1, 3]];
/** A potential c₁xⁱyʲ + c₂xᵐ + c₃yⁿ: one mixed term and a pure term in each variable. */
const randPotential = (rng, lim = 4) => [[rng.nonzero(-lim, lim), ...rng.pick(MIXED)], [rng.nonzero(-5, 5), rng.int(1, 3), 0], [rng.nonzero(-5, 5), 0, rng.int(1, 3)]];
/** For checks: the wrong candidates that q() actually used (it puts the correct answer first), or null if they are not three different ones. */
function shownWrong(question, cands, strOf) {
  const shown = cands.filter((c) => question.choices.indexOf(strOf(c)) > 0);
  return new Set(shown.map(strOf)).size === 3 ? shown : null;
}

// One-variable polynomials in t (Frac coefficients, lowest power first), for exact integrals along a path.
const fpD = (a) => (a.length > 1 ? a.slice(1).map((c, i) => c.mul(i + 1)) : fp(0));
const fpAt = (a, t) => a.reduce((s, c, i) => s + c.value * t ** i, 0);
const tPoly = (a) => terms(a.map((c, i) => [c, power('t', i)]));
/** A polynomial in x and y evaluated on the path x = xt(t), y = yt(t). */
const along = (p, xt, yt) => p.reduce((acc, [c, i = 0, j = 0]) => fpAdd(acc, fpScale(fpMul(fpPow(xt, i), fpPow(yt, j)), c)), fp(0));

// Numeric integrals for checks, straight from a parametrization.
const aroundPolygon = (F, verts) => verts.reduce((sum, a, i) => {
  const b = verts[(i + 1) % verts.length];
  return sum + lineInt(F, (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], 0, 1, 400);
}, 0);
/** Area inside a closed polygon, by adding the lengths of its horizontal cross-sections (no line integral involved). */
function scanArea(pts, n = 1500) {
  const ys = pts.map((p) => p[1]);
  const lo = Math.min(...ys);
  const dy = (Math.max(...ys) - lo) / n;
  let area = 0;
  for (let k = 0; k < n; k++) {
    const y = lo + (k + 0.5) * dy;
    const xs = [];
    pts.forEach((p, i) => {
      const s = pts[(i + 1) % pts.length];
      if (p[1] > y !== s[1] > y) xs.push(p[0] + ((y - p[1]) * (s[0] - p[0])) / (s[1] - p[1]));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) area += (xs[i + 1] - xs[i]) * dy;
  }
  return area;
}

// ───────────── Easy ─────────────

function easyGradientField(rng) {
  const f = randPotential(rng);
  const [P, Q] = [mpD(f, 0), mpD(f, 1)];
  const keep = (v) => f.filter((t) => t[1 + v] > 0).map(([c, i, j]) => [c * [i, j][v], i, j]); // multiplied by the exponent, power not lowered
  return q({
    prompt: R`Find the gradient field \(\mathbf{F} = \nabla f\) of \(f(x, y) = ${pt(f)}\).`,
    correct: M(field(P, Q)),
    wrong: [
      { value: M(field(Q, P)), why: R`The first component is \(f_{x}\) and the second is \(f_{y}\).` },
      { value: M(field(mpAdd(P, [f[2]]), mpAdd(Q, [f[1]]))), why: 'A term that does not contain the variable is a constant for that partial derivative, so it drops out.' },
      M(field(keep(0), keep(1))),
      M(field(mpScale(P, -1), mpScale(Q, -1))),
    ],
    solution: [R`\(\nabla f = \langle f_{x}, f_{y} \rangle\).`, R`\(f_{x} = ${pt(P)}\) (hold \(y\) constant) and \(f_{y} = ${pt(Q)}\) (hold \(x\) constant).`, R`\(\mathbf{F} = ${field(P, Q)}\).`],
    rule: 0,
    skill: 'gradient fields',
    check: () => checkAll(checkEqual(mpEval(P, 0.7, -1.2), numPartial(fnOf(f), [0.7, -1.2], 0), 1e-5, 'f_x'), checkEqual(mpEval(Q, 0.7, -1.2), numPartial(fnOf(f), [0.7, -1.2], 1), 1e-5, 'f_y')),
  });
}

function easyFundamental(rng) {
  let f;
  let A;
  let B;
  let fA;
  let fB;
  do {
    f = [[rng.nonzero(-3, 3), ...rng.pick([[1, 1], [2, 1], [1, 2]])], [rng.nonzero(-4, 4), 1, 0], [rng.nonzero(-4, 4), 0, 1]];
    A = [rng.int(-3, 3), rng.int(-3, 3)];
    B = [rng.int(-3, 3), rng.int(-3, 3)];
    [fA, fB] = [mpEval(f, ...A), mpEval(f, ...B)];
  } while (fA === fB || fA === 0 || fB === 0 || fA === -fB);
  const grad = (x, y) => [numPartial(fnOf(f), [x, y], 0), numPartial(fnOf(f), [x, y], 1)];
  const bent = (t) => [A[0] + (B[0] - A[0]) * t + 0.7 * Math.sin(PI * t), A[1] + (B[1] - A[1]) * t - 0.4 * Math.sin(PI * t)];
  return q({
    prompt: R`Let \(f(x, y) = ${pt(f)}\) and \(\mathbf{F} = \nabla f\). Evaluate \(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r}\), where \(C\) is a smooth curve from \(A${Pt(A)}\) to \(B${Pt(B)}\).`,
    correct: fB - fA,
    wrong: [
      { value: fA - fB, why: R`The theorem gives the value of \(f\) at the end of the curve minus its value at the start: \(f(B) - f(A)\).` },
      { value: fB, why: R`Subtract the value at the starting point, \(f(A) = ${fA}\).` },
      { value: fA + fB, why: R`The two values are subtracted: \(f(B) - f(A)\).` },
      fA,
    ],
    solution: [
      R`\(\mathbf{F}\) is a gradient field, so the fundamental theorem for line integrals applies: \(\displaystyle\int_{C} \nabla f \cdot d\mathbf{r} = f(B) - f(A)\), whatever the curve.`,
      R`\(f(B) = f${Pt(B)} = ${fB}\) and \(f(A) = f${Pt(A)} = ${fA}\).`,
      R`\(${fB} - ${paren(fA)} = ${fB - fA}\).`,
    ],
    rule: 5,
    skill: 'fundamental theorem for line integrals',
    check: () => checkEqual(lineInt(grad, bent, 0, 1), fB - fA, 1e-6, 'line integral along a curved path'),
  });
}

function easyCrossPartials(rng) {
  let f;
  do f = randPotential(rng);
  while (f[0][1] + f[0][2] < 3);
  let [P, Q] = [mpD(f, 0), mpD(f, 1)];
  if (rng.bool(0.6)) {
    // an extra term that makes the field non-conservative
    if (rng.bool()) Q = mpAdd(Q, [[rng.nonzero(-4, 4), rng.int(1, 2), rng.int(0, 1)]]);
    else P = mpAdd(P, [[rng.nonzero(-4, 4), rng.int(0, 1), rng.int(1, 2)]]);
  }
  const d = mpD;
  const curl = mpAdd(d(Q, 0), mpScale(d(P, 1), -1));
  const wrong = [
    [mpAdd(d(Q, 1), mpScale(d(P, 0), -1)), R`Each component is differentiated with respect to the other variable: \(Q\) by \(x\) and \(P\) by \(y\).`],
    [mpAdd(d(Q, 0), d(P, 1)), 'The two partial derivatives are subtracted, not added.'],
    [mpScale(curl, -1), R`The order is \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\).`],
    [mpAdd(d(P, 0), d(Q, 1))],
    [d(Q, 0)],
    [d(P, 1)],
    [mpScale(d(Q, 0), 2)],
  ];
  const at = [[0.7, -1.2], [-0.5, 0.8]];
  const question = q({
    prompt: R`For \(\mathbf{F}(x, y) = \langle P, Q \rangle = ${field(P, Q)}\), find \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\). (\(\mathbf{F}\) is conservative on the whole plane exactly when this is 0 everywhere.)`,
    correct: M(pt(curl)),
    wrong: wrong.map(([p, why]) => (why ? { value: M(pt(p)), why } : M(pt(p)))),
    solution: [
      R`\(\dfrac{\partial Q}{\partial x} = ${pt(d(Q, 0))}\) and \(\dfrac{\partial P}{\partial y} = ${pt(d(P, 1))}\).`,
      R`\(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = ${pt(curl)}\).`,
      curl.length ? 'This is not 0, so the field is not conservative.' : 'This is 0 everywhere, so the field is conservative.',
    ],
    rule: 3,
    skill: 'test for a conservative field',
    check: () => {
      const numeric = ([x, y]) => numPartial(fnOf(Q), [x, y], 0) - numPartial(fnOf(P), [x, y], 1);
      if (!at.every((p) => close(mpEval(curl, ...p), numeric(p), 1e-5))) return 'Q_x − P_y is wrong';
      const shown = shownWrong(question, wrong, ([p]) => M(pt(p)));
      return shown && shown.every(([p]) => at.some((xy) => !close(mpEval(p, ...xy), numeric(xy), 1e-5))) ? true : 'a wrong choice equals the right one';
    },
  });
  return question;
}

// ───────────── Medium ─────────────

const TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]];
// Arcs of the circle of radius r about the origin, from angle 0 to end·π.
const ARCS = [
  (r) => ({ f: 'y', fn: (x, y) => y, end: 1, where: (c) => `the upper half of the circle ${c}`, onC: cf(r, '\\sin t'), val: frac(2 * r * r), how: R`\(\displaystyle\int_{0}^{\pi} \sin t\,dt = 2\)` }),
  (r) => ({ f: 'xy', fn: (x, y) => x * y, end: frac(1, 2), where: (c) => `the part of the circle ${c} in the first quadrant`, onC: cf(r * r, '\\cos t\\sin t'), val: frac(r ** 3, 2), how: R`\(\displaystyle\int_{0}^{\pi/2} \cos t\sin t\,dt = \frac{1}{2}\)` }),
  (r) => ({ f: 'x^{2}', fn: (x) => x * x, end: 2, where: (c) => `the circle ${c}`, onC: cf(r * r, '\\cos^{2}t'), val: frac(r ** 3), pi: true, how: R`\(\displaystyle\int_{0}^{2\pi} \cos^{2}t\,dt = \pi\)` }),
];

function mediumScalarLine(rng) {
  if (rng.bool(0.35)) {
    const r = rng.int(1, 5);
    const arc = rng.pick(ARCS)(r);
    const show = (v) => M(arc.pi ? piTex(v) : v.tex());
    return q({
      prompt: R`Evaluate \(\displaystyle\int_{C} ${arc.f}\,ds\), where \(C\) is ${arc.where(R`\(x^{2} + y^{2} = ${r * r}\)`)}.`,
      correct: show(arc.val),
      wrong: [{ value: show(arc.val.div(r)), why: R`\(ds = |\mathbf{r}'(t)|\,dt\), and on this circle \(|\mathbf{r}'(t)| = ${r}\). That factor is missing.` }, show(arc.val.mul(2)), show(arc.val.div(2)), show(arc.val.mul(3)), show(arc.val.mul(4))],
      solution: [
        R`Parametrize: \(\mathbf{r}(t) = \langle ${cf(r, '\\cos t')}, ${cf(r, '\\sin t')} \rangle\), \(0 \le t \le ${piTex(arc.end)}\). Then \(|\mathbf{r}'(t)| = ${r}\), so \(ds = ${r}\,dt\).`,
        R`On the curve the integrand is \(${arc.onC}\), and ${arc.how}.`,
        R`\(\displaystyle\int_{C} ${arc.f}\,ds = \int_{0}^{${piTex(arc.end)}} ${arc.onC} \cdot ${r}\,dt = ${arc.pi ? piTex(arc.val) : arc.val.tex()}\).`,
      ],
      rule: 1,
      skill: 'scalar line integrals',
      check: () => checkEqual(scalarLineInt(arc.fn, (t) => [r * Math.cos(t), r * Math.sin(t)], 0, +arc.end * PI), arc.val.value * (arc.pi ? PI : 1), 1e-6, 'scalar line integral'),
    });
  }
  const [dx, dy, len] = rng.pick(TRIPLES).map((v, i) => (i < 2 ? v * rng.sign() : v));
  let A;
  let co;
  let fA;
  let fB;
  do {
    A = [rng.int(-3, 3), rng.int(-3, 3)];
    co = [rng.nonzero(-3, 3), rng.nonzero(-3, 3), rng.int(-4, 4)];
    fA = co[0] * A[0] + co[1] * A[1] + co[2];
    fB = fA + co[0] * dx + co[1] * dy;
  } while (fA + fB === 0 || fA === fB || fA === 0 || fB === 0);
  const B = [A[0] + dx, A[1] + dy];
  const wire = fA > 0 && fB > 0 && rng.bool(0.6);
  const fT = terms([[co[0], 'x'], [co[1], 'y'], [co[2], '']]);
  const ans = frac(len * (fA + fB), 2);
  return q({
    prompt: wire
      ? R`A thin straight wire runs from \(${Pt(A)}\) to \(${Pt(B)}\), with distances in cm. Its density at the point \((x, y)\) is \(\rho(x, y) = ${fT}\) grams per cm. Find the mass of the wire.`
      : R`Evaluate \(\displaystyle\int_{C} (${fT})\,ds\), where \(C\) is the line segment from \(${Pt(A)}\) to \(${Pt(B)}\).`,
    correct: ans,
    unit: wire ? 'g' : undefined,
    wrong: [
      { value: frac(fA + fB, 2), why: R`\(ds = |\mathbf{r}'(t)|\,dt\), and here \(|\mathbf{r}'(t)| = ${len}\), the length of the segment. That factor is missing.` },
      { value: len * fB, why: R`The integrand changes along the segment, so it has to be integrated: \(\displaystyle\int_{0}^{1} t\,dt = \frac{1}{2}\).` },
      frac((Math.abs(dx) + Math.abs(dy)) * (fA + fB), 2),
      len * fA,
    ],
    solution: [
      wire ? R`The mass is the density added up along the wire: \(m = \displaystyle\int_{C} \rho\,ds\).` : null,
      R`Parametrize the segment: \(\mathbf{r}(t) = \langle ${terms([[A[0], ''], [dx, 't']])}, ${terms([[A[1], ''], [dy, 't']])} \rangle\), \(0 \le t \le 1\).`,
      R`\(\mathbf{r}'(t) = ${V([dx, dy])}\), so \(|\mathbf{r}'(t)| = \sqrt{${dx * dx} + ${dy * dy}} = ${len}\) and \(ds = ${len}\,dt\).`,
      R`On the segment the integrand is \(${terms([[fA, ''], [fB - fA, 't']])}\), so the integral is \(\displaystyle\int_{0}^{1} \left(${terms([[fA, ''], [fB - fA, 't']])}\right)(${len})\,dt = ${dot(len, frac(fA + fB, 2))} = ${ans.tex()}\)${wire ? ' g' : ''}.`,
    ].filter(Boolean),
    rule: 1,
    skill: 'scalar line integrals',
    check: () => checkEqual(scalarLineInt((x, y) => co[0] * x + co[1] * y + co[2], (t) => [A[0] + dx * t, A[1] + dy * t], 0, 1), ans.value, 1e-6, 'scalar line integral'),
  });
}

const MONO = [[1, 0], [0, 1], [1, 1], [2, 0], [0, 2]];

function mediumWork(rng) {
  let P;
  let Q;
  let A;
  let B;
  let T;
  let xt;
  let yt;
  let dotted;
  let ans;
  const para = rng.bool(0.4);
  do {
    P = [[rng.nonzero(-4, 4), ...rng.pick(MONO)]];
    Q = [[rng.nonzero(-4, 4), ...rng.pick(MONO)]];
    if (para) {
      T = rng.int(1, 3);
      [A, B, xt, yt] = [[0, 0], [T, T * T], fp(0, 1), fp(0, 0, 1)];
    } else {
      A = [rng.int(-3, 3), rng.int(-3, 3)];
      B = [rng.int(-3, 3), rng.int(-3, 3)];
      [T, xt, yt] = [1, fp(A[0], B[0] - A[0]), fp(A[1], B[1] - A[1])];
    }
    dotted = fpAdd(fpMul(along(P, xt, yt), fpD(xt)), fpMul(along(Q, xt, yt), fpD(yt)));
    ans = fpInt(dotted, 0, T);
  } while (ans.n === 0 || ans.d > 6 || Math.abs(ans.n) > 400 || A[0] === B[0] || A[1] === B[1]);
  const work = rng.bool();
  const where = para ? R`the parabola \(y = x^{2}\) from \((0, 0)\) to \(${Pt(B)}\)` : R`the line segment from \(${Pt(A)}\) to \(${Pt(B)}\)`;
  const [Pa, Qa] = F2(P, Q)(...A);
  return q({
    prompt: work
      ? R`A force field \(\mathbf{F}(x, y) = ${field(P, Q)}\) (in newtons) acts on a particle as it moves along ${where}, with distances in meters. Find the work done by the field.`
      : R`Evaluate \(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r}\) for \(\mathbf{F}(x, y) = ${field(P, Q)}\), where \(C\) is ${where}.`,
    correct: ans,
    unit: work ? 'J' : undefined,
    wrong: [
      { value: ans.neg(), why: R`That is the integral in the opposite direction, from \(${Pt(B)}\) back to \(${Pt(A)}\).` },
      { value: fpInt(fpAdd(along(P, xt, yt), along(Q, xt, yt)), 0, T), why: R`\(d\mathbf{r} = \mathbf{r}'(t)\,dt\): take the dot product of \(\mathbf{F}(\mathbf{r}(t))\) with \(\mathbf{r}'(t)\) before integrating.` },
      { value: Pa * (B[0] - A[0]) + Qa * (B[1] - A[1]), why: R`\(\mathbf{F}\) changes along the path, so the answer is not \(\mathbf{F} \cdot \overrightarrow{AB}\) with \(\mathbf{F}\) taken at the starting point.` },
      ans.mul(2),
      ans.div(2),
    ],
    solution: [
      R`Parametrize the path: \(\mathbf{r}(t) = \langle ${tPoly(xt)}, ${tPoly(yt)} \rangle\), \(0 \le t \le ${T}\), so \(\mathbf{r}'(t) = \langle ${tPoly(fpD(xt))}, ${tPoly(fpD(yt))} \rangle\).`,
      R`On the path, \(\mathbf{F}(\mathbf{r}(t)) = \langle ${tPoly(along(P, xt, yt))}, ${tPoly(along(Q, xt, yt))} \rangle\).`,
      R`\(\mathbf{F}(\mathbf{r}(t)) \cdot \mathbf{r}'(t) = ${tPoly(dotted)}\).`,
      R`\(\displaystyle\int_{0}^{${T}} ${wrapSum(tPoly(dotted))}\,dt = ${ans.tex()}\)${work ? ' joules' : ''}.`,
    ],
    rule: 2,
    skill: 'vector line integrals and work',
    check: () => checkEqual(lineInt(F2(P, Q), (t) => [fpAt(xt, t), fpAt(yt, t)], 0, T), ans.value, 1e-6, 'line integral from the parametrization'),
  });
}

function mediumPotential(rng) {
  const f = randPotential(rng, 3);
  const [mix, px, py] = f;
  const [P, Q] = [mpD(f, 0), mpD(f, 1)];
  const show = (p) => R`\(f(x, y) = ${pt(p)}\)`;
  const wrong = [
    [[mix, px], R`Integrating \(P\) with respect to \(x\) leaves an unknown function \(g(y)\). Compare \(f_{y}\) with \(Q\) to find it.`],
    [[[2 * mix[0], mix[1], mix[2]], px, py], R`The term \(${pt([mix])}\) turns up in both \(\int P\,dx\) and \(\int Q\,dy\), but it belongs to \(f\) only once.`],
    [[[mix[0] * mix[1], mix[1], mix[2]], [px[0] * px[1], px[1], 0], [py[0] * py[2], 0, py[2]]], 'Integrating a power divides by the new exponent.'],
    [[mix, py]],
    [mpScale(f, -1)],
  ];
  const at = [[0.7, -1.2], [-0.5, 0.8]];
  const gradIs = (p, [x, y]) => close(numPartial(fnOf(p), [x, y], 0), mpEval(P, x, y), 1e-5) && close(numPartial(fnOf(p), [x, y], 1), mpEval(Q, x, y), 1e-5);
  const question = q({
    prompt: R`The field \(\mathbf{F}(x, y) = ${field(P, Q)}\) is conservative. Find a potential function \(f\), so that \(\nabla f = \mathbf{F}\).`,
    correct: show(f),
    wrong: wrong.map(([p, why]) => (why ? { value: show(p), why } : show(p))),
    solution: [
      R`Integrate \(P = ${pt(P)}\) with respect to \(x\): \(f = ${pt([mix, px])} + g(y)\), where \(g\) depends on \(y\) only.`,
      R`Differentiate with respect to \(y\): \(f_{y} = ${pt(mpD([mix], 1))} + g'(y)\). This must equal \(Q = ${pt(Q)}\), so \(g'(y) = ${pt(mpD([py], 1))}\).`,
      R`Then \(g(y) = ${pt([py])}\), and \(f(x, y) = ${pt(f)}\) (plus any constant).`,
    ],
    rule: 4,
    skill: 'finding a potential function',
    check: () => {
      if (!at.every((p) => gradIs(f, p))) return 'the gradient of f is not F';
      const shown = shownWrong(question, wrong, ([p]) => show(p));
      return shown && shown.every(([p]) => !at.every((xy) => gradIs(p, xy))) ? true : 'a wrong choice is also a potential';
    },
  });
  return question;
}

// ───────────── Hard ─────────────

function hardGreen(rng) {
  let P;
  let Q;
  let curl;
  let a;
  let b;
  let kind;
  let hi;
  let ccw;
  do {
    P = [[rng.nonzero(-4, 4), ...rng.pick([[0, 1], [0, 2], [1, 1]])], [rng.int(-3, 3), 2, 0]];
    Q = [[rng.nonzero(-4, 4), ...rng.pick([[1, 0], [2, 0], [1, 1]])], [rng.int(-3, 3), 0, 2]];
    curl = mpAdd(mpD(Q, 0), mpScale(mpD(P, 1), -1));
    [a, b, kind] = [rng.int(1, 4), rng.int(1, 4), rng.int(0, 2)];
    hi = [fp(b), fp(b, frac(-b, a)), fp(0, frac(b, a))][kind]; // the top edge y = hi(x)
    ccw = exactDouble(curl, 0, a, fp(0), hi);
  } while (!curl.length || ccw.n === 0 || ccw.d > 6);
  const verts = [[[0, 0], [a, 0], [a, b], [0, b]], [[0, 0], [a, 0], [0, b]], [[0, 0], [a, 0], [a, b]]][kind];
  const clockwise = rng.bool(0.35);
  const ans = clockwise ? ccw.neg() : ccw;
  const other = (p) => exactDouble(p, 0, a, fp(0), hi).mul(clockwise ? -1 : 1);
  const hiT = terms(hi.map((c, i) => [c, power('x', i)]));
  // ∫ curl dy from 0 to hi(x), as a polynomial in x
  const inner = curl.reduce((acc, [c, i, j]) => fpAdd(acc, fpMul(fpScale(fpPow(hi, j + 1), frac(c, j + 1)), [...new Array(i).fill(frac(0)), frac(1)])), fp(0));
  return q({
    prompt: R`Use Green's theorem to evaluate \(\displaystyle\oint_{C} ${wrapSum(pt(P))}\,dx + ${wrapNeg(pt(Q))}\,dy\), where \(C\) is the boundary of the ${kind ? 'triangle' : 'rectangle'} with vertices ${verts.map((p) => M(Pt(p))).join(', ')}, traversed ${clockwise ? 'clockwise' : 'counter-clockwise'}.`,
    correct: ans,
    wrong: [
      { value: ans.neg(), why: clockwise ? "Green's theorem is stated for counter-clockwise travel. Going round clockwise reverses the sign." : R`For counter-clockwise travel the integrand is \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\), in that order.` },
      { value: other(mpAdd(mpD(Q, 0), mpD(P, 1))), why: R`The partial derivatives are subtracted: \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\).` },
      { value: other(mpAdd(mpD(Q, 1), mpScale(mpD(P, 0), -1))), why: R`Differentiate \(Q\) with respect to \(x\) and \(P\) with respect to \(y\).` },
      ans.mul(2),
      ans.div(2),
    ],
    solution: [
      R`\(\dfrac{\partial Q}{\partial x} = ${pt(mpD(Q, 0))}\) and \(\dfrac{\partial P}{\partial y} = ${pt(mpD(P, 1))}\), so \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = ${pt(curl)}\).`,
      R`The region \(D\) inside \(C\) is \(0 \le x \le ${a}\), \(0 \le y \le ${hiT}\). Counter-clockwise, Green's theorem gives \(\displaystyle\iint_{D} ${wrapSum(pt(curl))}\,dA = \int_{0}^{${a}}\int_{0}^{${hiT}} ${wrapSum(pt(curl))}\,dy\,dx\).`,
      R`The inner integral is \(${tPoly(inner).replace(/t/g, 'x')}\), and \(\displaystyle\int_{0}^{${a}} ${wrapSum(tPoly(inner).replace(/t/g, 'x'))}\,dx = ${ccw.tex()}\).`,
      clockwise ? R`\(C\) is traversed clockwise, which reverses the sign: \(${ans.tex()}\).` : R`\(C\) is traversed counter-clockwise, so the line integral is \(${ans.tex()}\).`,
    ],
    rule: 6,
    skill: "Green's theorem",
    check: () => checkEqual(aroundPolygon(F2(P, Q), clockwise ? verts.slice().reverse() : verts), ans.value, 1e-6, 'line integral round the boundary'),
  });
}

// Awkward paths from A to A + d, for 0 ≤ t ≤ 1.
const PATHS = [
  (A, d) => ({ tex: [terms([[A[0], ''], [d[0], 't^{2}']]), terms([[A[1], ''], [d[1], '\\sin\\frac{\\pi t}{2}']])], r: (t) => [A[0] + d[0] * t * t, A[1] + d[1] * Math.sin((PI * t) / 2)] }),
  (A, d) => ({ tex: [terms([[A[0], ''], [d[0], 't^{3}']]), terms([[A[1], ''], [d[1], 'te^{t - 1}']])], r: (t) => [A[0] + d[0] * t ** 3, A[1] + d[1] * t * Math.exp(t - 1)] }),
  (A, d) => ({ tex: [terms([[A[0], ''], [d[0], '\\sin^{2}\\frac{\\pi t}{2}']]), terms([[A[1], ''], [d[1], 't^{4}']])], r: (t) => [A[0] + d[0] * Math.sin((PI * t) / 2) ** 2, A[1] + d[1] * t ** 4] }),
];

function hardPathIndependence(rng) {
  let f;
  let A;
  let d;
  let fA;
  let fB;
  do {
    f = randPotential(rng, 3);
    A = [rng.int(-2, 2), rng.int(-2, 2)];
    d = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    [fA, fB] = [mpEval(f, ...A), mpEval(f, A[0] + d[0], A[1] + d[1])];
  } while (fA === fB || fA === 0 || fB === 0 || fA === -fB || Math.abs(fB - fA) > 300);
  const B = [A[0] + d[0], A[1] + d[1]];
  const [P, Q] = [mpD(f, 0), mpD(f, 1)];
  const path = rng.pick(PATHS)(A, d);
  return q({
    prompt: R`Evaluate \(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r}\) for \(\mathbf{F}(x, y) = ${field(P, Q)}\), where \(C\) is the curve \(\mathbf{r}(t) = \left\langle ${path.tex[0]},\; ${path.tex[1]} \right\rangle\), \(0 \le t \le 1\).`,
    correct: fB - fA,
    wrong: [
      { value: fA - fB, why: R`The theorem gives \(f\) at the end of the curve minus \(f\) at the start. The curve starts at \(${Pt(A)}\) and ends at \(${Pt(B)}\).` },
      { value: fB, why: R`Subtract the value of the potential at the starting point \(${Pt(A)}\), which is \(${fA}\).` },
      fA + fB,
      fA,
    ],
    solution: [
      R`Integrating along this curve directly would be very hard, so test the field first: \(\dfrac{\partial P}{\partial y} = ${pt(mpD(P, 1))}\) and \(\dfrac{\partial Q}{\partial x} = ${pt(mpD(Q, 0))}\). They are equal, so \(\mathbf{F}\) is conservative and only the endpoints matter.`,
      R`A potential function: integrate \(P\) with respect to \(x\) and match \(Q\), which gives \(f(x, y) = ${pt(f)}\).`,
      R`The curve runs from \(\mathbf{r}(0) = ${Pt(A)}\) to \(\mathbf{r}(1) = ${Pt(B)}\).`,
      R`\(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r} = f${Pt(B)} - f${Pt(A)} = ${fB} - ${paren(fA)} = ${fB - fA}\).`,
    ],
    rule: 5,
    skill: 'path independence',
    check: () => checkEqual(lineInt(F2(P, Q), path.r, 0, 1), fB - fA, 1e-6, 'line integral along the given curve'),
  });
}

// Arcs of a circle of radius r about the origin: T is the angle swept (a multiple of π) and dir = −1 means clockwise.
const SWEEPS = [
  { T: frac(1, 2), dir: 1, text: (r) => R`counter-clockwise from \((${r}, 0)\) to \((0, ${r})\)` },
  { T: frac(1), dir: 1, text: (r) => R`counter-clockwise from \((${r}, 0)\) to \((${-r}, 0)\)` },
  { T: frac(2), dir: 1, text: () => 'once around, counter-clockwise' },
  { T: frac(2), dir: -1, text: () => 'once around, clockwise' },
  { T: frac(1, 2), dir: -1, text: (r) => R`clockwise from \((0, ${r})\) to \((${r}, 0)\)` },
];

function hardCircleWork(rng) {
  const r = rng.int(1, 4);
  const a = rng.int(-3, 3);
  const b = rng.nonzero(-4, 4);
  const c = rng.intExcept(-4, 4, [0, -b]);
  const sweep = rng.pick(SWEEPS);
  const end = sweep.T.value * PI;
  const ccw = sweep.T.mul((b + c) * r * r).div(2); // multiple of π
  const ans = ccw.mul(sweep.dir);
  const F = (x, y) => [a * x - b * y, c * x + a * y];
  const pi = (v) => M(piTex(v));
  return q({
    prompt: R`The force field \(\mathbf{F}(x, y) = ${V([terms([[a, 'x'], [-b, 'y']]), terms([[c, 'x'], [a, 'y']])])}\) (in newtons) pushes a particle along the circle \(x^{2} + y^{2} = ${r * r}\) (distances in meters), ${sweep.text(r)}. Find the work done by the field.`,
    correct: pi(ans),
    wrong: [
      { value: pi(ans.neg()), why: sweep.dir < 0 ? 'That is the work for counter-clockwise travel. Going the other way along the same arc reverses the sign.' : 'That is the work for clockwise travel. Going the other way along the same arc reverses the sign.' },
      { value: pi(sweep.T.mul((c - b) * r * r).div(2).mul(sweep.dir)), why: R`Check the signs in the dot product: the first component of \(\mathbf{F}\) is multiplied by \(${cf(-r, '\\sin t')}\).` },
      { value: pi(ans.mul(2)), why: R`\(\sin^{2}t\) and \(\cos^{2}t\) each integrate to half the length of the interval here, not the whole length.` },
      r > 1 ? pi(ans.div(r * r)) : null,
      pi(ans.div(2)),
    ],
    solution: [
      R`Parametrize the circle counter-clockwise: \(\mathbf{r}(t) = \langle ${cf(r, '\\cos t')}, ${cf(r, '\\sin t')} \rangle\), so \(\mathbf{r}'(t) = \langle ${cf(-r, '\\sin t')}, ${cf(r, '\\cos t')} \rangle\).`,
      R`\(\mathbf{F}(\mathbf{r}(t)) \cdot \mathbf{r}'(t) = ${cf(r * r, `\\left(${terms([[b, '\\sin^{2}t'], [c, '\\cos^{2}t']])}\\right)`)}\)${a ? R`; the terms in \(\sin t\cos t\) cancel` : ''}.`,
      R`Over \(0 \le t \le ${piTex(sweep.T)}\), \(\sin^{2}t\) and \(\cos^{2}t\) each integrate to \(${piTex(sweep.T.div(2))}\). Counter-clockwise, the integral is \(${dot(...(r > 1 ? [r * r] : []), b + c, piTex(sweep.T.div(2)))} = ${piTex(ccw)}\).`,
      sweep.dir < 0 ? R`The particle travels clockwise, the opposite direction, so the work is \(${piTex(ans)}\) joules.` : R`The work is \(${piTex(ans)}\) joules.`,
    ],
    rule: 2,
    skill: 'work along a circular arc',
    check: () => checkEqual(lineInt(F, sweep.dir > 0 ? (t) => [r * Math.cos(t), r * Math.sin(t)] : (t) => [r * Math.cos(end - t), r * Math.sin(end - t)], 0, end), ans.value * PI, 1e-6, 'line integral from the parametrization'),
  });
}

// ───────────── Challenge ─────────────

const MESSY_X = [['\\sin(x^{2})', (x) => Math.sin(x * x)], ['\\sqrt{1 + x^{4}}', (x) => Math.sqrt(1 + x ** 4)], ['e^{-x^{2}}', (x) => Math.exp(-x * x)], ['x\\cos x', (x) => x * Math.cos(x)]];
const MESSY_Y = [['\\cos(y^{2})', (y) => Math.cos(y * y)], ['\\ln(1 + y^{2})', (y) => Math.log(1 + y * y)], ['e^{-y^{2}}', (y) => Math.exp(-y * y)], ['y\\sin y', (y) => y * Math.sin(y)]];
// Closed curves: the area inside (a multiple of π when pi is set), and either a parametrization or the vertices.
const LOOPS = [
  (rng) => {
    const r = rng.int(1, 5);
    return { text: R`the circle \(x^{2} + y^{2} = ${r * r}\)`, area: frac(r * r), pi: true, how: R`\pi(${r})^{2}`, r: (t) => [r * Math.cos(t), r * Math.sin(t)] };
  },
  (rng) => {
    const [a, b] = rng.sample([2, 3, 4, 5], 2);
    return { text: R`the ellipse \(\dfrac{x^{2}}{${a * a}} + \dfrac{y^{2}}{${b * b}} = 1\)`, area: frac(a * b), pi: true, how: R`\pi(${a})(${b})`, r: (t) => [a * Math.cos(t), b * Math.sin(t)] };
  },
  (rng) => {
    const [w, h] = [rng.int(1, 5), rng.int(1, 5)];
    return { text: R`the boundary of the rectangle with vertices \((0, 0)\), \((${w}, 0)\), \((${w}, ${h})\), \((0, ${h})\)`, area: frac(w * h), how: `(${w})(${h})`, verts: [[0, 0], [w, 0], [w, h], [0, h]] };
  },
  (rng) => {
    const [w, h] = [rng.int(1, 6), rng.int(1, 6)];
    return { text: R`the boundary of the triangle with vertices \((0, 0)\), \((${w}, 0)\), \((0, ${h})\)`, area: frac(w * h, 2), how: R`\frac{1}{2}(${w})(${h})`, verts: [[0, 0], [w, 0], [0, h]] };
  },
];
const loopInt = (F, loop, dir) => (loop.verts ? aroundPolygon(F, dir > 0 ? loop.verts : loop.verts.slice().reverse()) : lineInt(F, (t) => loop.r(dir * t), 0, 2 * PI));

function challengeGreenShortcut(rng) {
  const [mx, my] = [rng.pick(MESSY_X), rng.pick(MESSY_Y)];
  const al = rng.nonzero(-5, 5);
  const be = rng.intExcept(-5, 5, [0, al, -al]);
  const loop = rng.pick(LOOPS)(rng);
  const dir = rng.bool(0.7) ? 1 : -1;
  const show = (v) => M(loop.pi ? piTex(v) : v.tex());
  const ans = loop.area.mul((be - al) * dir);
  return q({
    prompt: R`Evaluate \(\displaystyle\oint_{C} \left(${mx[0]} ${al < 0 ? '-' : '+'} ${cf(Math.abs(al), 'y')}\right) dx + \left(${cf(be, 'x')} + ${my[0]}\right) dy\), where \(C\) is ${loop.text}, traversed once ${dir > 0 ? 'counter-clockwise' : 'clockwise'}.`,
    correct: show(ans),
    wrong: [
      { value: show(loop.area.mul((be + al) * dir)), why: R`Green's theorem uses the difference \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = ${be} - ${paren(al)}\).` },
      { value: show(ans.neg()), why: dir < 0 ? "Green's theorem is stated for counter-clockwise travel. Going round clockwise reverses the sign." : R`For counter-clockwise travel the integrand is \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\), in that order.` },
      { value: M(num((be - al) * dir)), why: 'The double integral of a constant is the constant times the area of the region.' },
      show(ans.mul(2)),
      show(ans.div(2)),
    ],
    solution: [
      R`A direct calculation is out of reach, but Green's theorem needs only \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\). Here \(\dfrac{\partial Q}{\partial x} = ${be}\), because \(${my[0]}\) has no \(x\) in it, and \(\dfrac{\partial P}{\partial y} = ${al}\), because \(${mx[0]}\) has no \(y\) in it.`,
      R`Counter-clockwise, \(\displaystyle\oint_{C} P\,dx + Q\,dy = \iint_{D} \left(${be} - ${paren(al)}\right) dA = ${be - al} \cdot (\text{area of } D)\).`,
      R`The area of \(D\) is \(${loop.how} = ${loop.pi ? piTex(loop.area) : loop.area.tex()}\), so the counter-clockwise integral is \(${loop.pi ? piTex(loop.area.mul(be - al)) : loop.area.mul(be - al).tex()}\).`,
      dir < 0 ? R`\(C\) is traversed clockwise, which reverses the sign: \(${loop.pi ? piTex(ans) : ans.tex()}\).` : null,
    ].filter(Boolean),
    rule: 6,
    skill: "choosing Green's theorem",
    check: () => checkEqual(loopInt((x, y) => [mx[1](x) + al * y, be * x + my[1](y)], loop, dir), ans.value * (loop.pi ? PI : 1), 1e-5, 'line integral round the curve'),
  });
}

// Closed curves traced once counter-clockwise for 0 ≤ t ≤ 2π. `form` is x·dy/dt − y·dx/dt and `area` the area ÷ π.
const CURVES = [
  (rng) => {
    const [a, b] = rng.sample([1, 2, 3, 4, 5, 6], 2);
    return { x: cf(a, '\\cos t'), y: cf(b, '\\sin t'), r: (t) => [a * Math.cos(t), b * Math.sin(t)], form: `${a * b}`, area: frac(a * b), how: R`\(x\,\dfrac{dy}{dt} - y\,\dfrac{dx}{dt} = ${a * b}\cos^{2}t + ${a * b}\sin^{2}t = ${a * b}\)` };
  },
  (rng) => {
    const a = rng.int(1, 6);
    return { x: cf(a, '\\cos^{3}t'), y: cf(a, '\\sin^{3}t'), r: (t) => [a * Math.cos(t) ** 3, a * Math.sin(t) ** 3], form: `${3 * a * a}\\sin^{2}t\\cos^{2}t`, area: frac(3 * a * a, 8), outer: frac(a * a), how: R`\(x\,\dfrac{dy}{dt} - y\,\dfrac{dx}{dt} = ${3 * a * a}\sin^{2}t\cos^{2}t\,(\cos^{2}t + \sin^{2}t) = ${piTex(frac(3 * a * a, 4), '\\sin^{2}2t')}\), and \(\sin^{2}2t\) averages \(\frac{1}{2}\) over a full turn` };
  },
  (rng) => {
    const a = rng.int(1, 4);
    return { x: `${cf(2 * a, '\\cos t')} - ${cf(a, '\\cos 2t')}`, y: `${cf(2 * a, '\\sin t')} - ${cf(a, '\\sin 2t')}`, r: (t) => [a * (2 * Math.cos(t) - Math.cos(2 * t)), a * (2 * Math.sin(t) - Math.sin(2 * t))], form: `${6 * a * a}(1 - \\cos t)`, area: frac(6 * a * a), outer: frac(9 * a * a), how: R`\(x\,\dfrac{dy}{dt} - y\,\dfrac{dx}{dt}\) simplifies, with \(\cos 2t\cos t + \sin 2t\sin t = \cos t\), to \(${6 * a * a}(1 - \cos t)\)` };
  },
  (rng) => {
    const a = rng.int(1, 4);
    return { x: `${cf(2 * a, '\\cos t')} + ${cf(a, '\\cos 2t')}`, y: `${cf(2 * a, '\\sin t')} - ${cf(a, '\\sin 2t')}`, r: (t) => [a * (2 * Math.cos(t) + Math.cos(2 * t)), a * (2 * Math.sin(t) - Math.sin(2 * t))], form: `${2 * a * a}(1 - \\cos 3t)`, area: frac(2 * a * a), outer: frac(9 * a * a), how: R`\(x\,\dfrac{dy}{dt} - y\,\dfrac{dx}{dt}\) simplifies, with \(\cos 2t\cos t - \sin 2t\sin t = \cos 3t\), to \(${2 * a * a}(1 - \cos 3t)\)` };
  },
];

function challengeArea(rng) {
  const k = rng.pick(CURVES)(rng);
  const pi = (v) => M(piTex(v));
  return q({
    prompt: R`Use \(A = \dfrac{1}{2}\displaystyle\oint_{C} x\,dy - y\,dx\) to find the area enclosed by the curve \(x = ${k.x}\), \(y = ${k.y}\), \(0 \le t \le 2\pi\), which is traced once counter-clockwise.`,
    correct: pi(k.area),
    wrong: [
      { value: pi(k.area.mul(2)), why: R`The area formula has a factor \(\frac{1}{2}\) in front of the integral.` },
      k.outer ? { value: pi(k.outer), why: 'That is the area of the smallest circle about the origin that contains the curve. The region inside the curve is smaller.' } : null,
      pi(k.area.div(2)),
      pi(k.area.mul(4)),
      pi(k.area.mul(3).div(2)),
    ],
    solution: [
      R`On the curve, \(x\,dy - y\,dx = \left(x\,\dfrac{dy}{dt} - y\,\dfrac{dx}{dt}\right)dt\).`,
      `${k.how}.`,
      R`\(\displaystyle\int_{0}^{2\pi} ${k.form}\,dt = ${piTex(k.area.mul(2))}\), so \(A = \dfrac{1}{2} \cdot ${piTex(k.area.mul(2))} = ${piTex(k.area)}\).`,
    ],
    rule: 6,
    skill: 'area by a line integral',
    check: () => checkEqual(scanArea(Array.from({ length: 720 }, (_, i) => k.r((i * PI) / 360))), k.area.value * PI, 2e-3, 'area from cross-sections'),
  });
}

const SWIRL = (x, y) => [-y / (x * x + y * y), x / (x * x + y * y)];

function challengeHole(rng) {
  const dir = rng.bool(0.65) ? 1 : -1;
  const kind = rng.int(0, 3);
  let loop;
  let inside;
  if (kind === 0) {
    const [a, b] = rng.sample([1, 2, 3, 4, 5, 6], 2);
    const round = rng.bool();
    [inside, loop] = [true, { text: round ? R`the circle \(x^{2} + y^{2} = ${a * a}\)` : R`the ellipse \(\dfrac{x^{2}}{${(a + 1) ** 2}} + \dfrac{y^{2}}{${(b + 1) ** 2}} = 1\)`, r: (t) => (round ? [a * Math.cos(t), a * Math.sin(t)] : [(a + 1) * Math.cos(t), (b + 1) * Math.sin(t)]) }];
  } else if (kind === 1) {
    const c = rng.int(2, 6);
    const rad = rng.intExcept(1, c + 3, [c]);
    const [h, k] = rng.pick([[c, 0], [-c, 0], [0, c], [0, -c]]);
    [inside, loop] = [rad > c, { text: R`the circle \(${sq('x', h)} + ${sq('y', k)} = ${rad * rad}\)`, r: (t) => [h + rad * Math.cos(t), k + rad * Math.sin(t)] }];
  } else if (kind === 2) {
    const s = rng.int(1, 5);
    [inside, loop] = [true, { text: R`the boundary of the square with vertices \((${s}, ${s})\), \((${-s}, ${s})\), \((${-s}, ${-s})\), \((${s}, ${-s})\)`, verts: [[s, s], [-s, s], [-s, -s], [s, -s]] }];
  } else {
    const [p, s] = [rng.int(1, 4), rng.int(1, 4)];
    [inside, loop] = [false, { text: R`the boundary of the square with vertices \((${p}, ${p})\), \((${p + s}, ${p})\), \((${p + s}, ${p + s})\), \((${p}, ${p + s})\)`, verts: [[p, p], [p + s, p], [p + s, p + s], [p, p + s]] }];
  }
  const tex = (v) => M(v === 0 ? '0' : piTex(v));
  const ans = inside ? 2 * dir : 0;
  const equal = R`Wherever \(\mathbf{F}\) is defined, \(\dfrac{\partial Q}{\partial x} = \dfrac{y^{2} - x^{2}}{(x^{2} + y^{2})^{2}} = \dfrac{\partial P}{\partial y}\).`;
  return q({
    prompt: R`Let \(\mathbf{F}(x, y) = \left\langle -\dfrac{y}{x^{2} + y^{2}},\; \dfrac{x}{x^{2} + y^{2}} \right\rangle\). Evaluate \(\displaystyle\oint_{C} \mathbf{F} \cdot d\mathbf{r}\), where \(C\) is ${loop.text}, traversed once ${dir > 0 ? 'counter-clockwise' : 'clockwise'}.`,
    correct: tex(ans),
    wrong: inside
      ? [
        { value: tex(0), why: R`\(\dfrac{\partial Q}{\partial x} = \dfrac{\partial P}{\partial y}\) wherever \(\mathbf{F}\) is defined, but \(\mathbf{F}\) is not defined at the origin, which is inside \(C\). Green's theorem cannot be applied to the region inside \(C\).` },
        { value: tex(-ans), why: `That is the value for ${dir > 0 ? 'clockwise' : 'counter-clockwise'} travel. Reversing the direction reverses the sign.` },
        tex(ans / 2),
        tex(2 * ans),
      ]
      : [
        { value: tex(2 * dir), why: R`That is the value for a curve that goes once around the origin. This curve does not enclose the origin, so Green's theorem applies to the region inside it.` },
        tex(-2 * dir),
        tex(dir),
        tex(4 * dir),
      ],
    solution: inside
      ? [
        equal,
        R`The origin, where \(\mathbf{F}\) is not defined, is inside \(C\), so Green's theorem cannot be used on the region inside \(C\). It can be used on the region between \(C\) and a small circle around the origin, and it shows that \(C\) and that circle give the same integral when they are traversed the same way.`,
        R`On a circle \(\mathbf{r}(t) = \langle a\cos t, a\sin t \rangle\), traversed counter-clockwise, \(\mathbf{F} \cdot \mathbf{r}'(t) = \sin^{2}t + \cos^{2}t = 1\), so the integral is \(\displaystyle\int_{0}^{2\pi} 1\,dt = 2\pi\).`,
        dir > 0 ? R`\(C\) is traversed counter-clockwise: \(2\pi\).` : R`\(C\) is traversed clockwise, which reverses the sign: \(-2\pi\).`,
      ]
      : [
        equal,
        R`The origin is outside \(C\), so \(\mathbf{F}\) has continuous partial derivatives on \(C\) and at every point inside it. Green's theorem applies: \(\displaystyle\oint_{C} \mathbf{F} \cdot d\mathbf{r} = \iint_{D} 0\,dA = 0\), in either direction.`,
      ],
    rule: 6,
    skill: "when Green's theorem applies",
    check: () => checkEqual(loopInt(SWIRL, loop, dir), ans * PI, 1e-5, 'line integral round the curve'),
  });
}

export default {
  id: 'line-integrals-green',
  title: "Vector Fields, Line Integrals & Green's Theorem",
  summary: "Integrate functions and vector fields along curves, use potentials and path independence, and apply Green's theorem.",
  standards: ['OpenStax Calculus Vol. 3 §6.1', 'OpenStax Calculus Vol. 3 §6.2', 'OpenStax Calculus Vol. 3 §6.3', 'OpenStax Calculus Vol. 3 §6.4'],

  explain: {
    intro: R`A vector field attaches a vector to every point, like wind velocity on a weather map. A line integral adds up a quantity along a curve: the mass of a wire, or the work a force field does on a particle that moves along a path. For some fields the work depends only on the endpoints, and for closed curves Green's theorem trades the line integral for a double integral over the region inside.`,
    rules: [
      { title: 'Vector fields and gradient fields', text: R`A vector field in the plane is \(\mathbf{F}(x, y) = \langle P(x, y), Q(x, y) \rangle\): at each point it gives a vector. The gradient of a function, \(\nabla f = \langle f_{x}, f_{y} \rangle\), is a vector field. A field that is the gradient of some function \(f\) is called **conservative**, and \(f\) is a **potential function** for it.`, example: R`\(f(x, y) = x^{2}y\) has the gradient field \(\nabla f = \langle 2xy, x^{2} \rangle\). At \((1, 3)\) the vector is \(\langle 6, 1 \rangle\).` },
      { title: 'Scalar line integrals', text: R`To integrate a function \(f\) along a curve \(C\) given by \(\mathbf{r}(t)\), \(a \le t \le b\): \(\displaystyle\int_{C} f\,ds = \int_{a}^{b} f(\mathbf{r}(t))\,|\mathbf{r}'(t)|\,dt\). The factor \(|\mathbf{r}'(t)|\) turns \(dt\) into arc length \(ds\). The value does not depend on the direction of travel. If \(f\) is the density of a wire, the integral is its mass.`, example: R`Along the segment from \((0, 0)\) to \((3, 4)\), \(\mathbf{r}(t) = \langle 3t, 4t \rangle\) and \(|\mathbf{r}'(t)| = 5\): \(\displaystyle\int_{C} (x + y)\,ds = \int_{0}^{1} 7t \cdot 5\,dt = \frac{35}{2}\).` },
      { title: 'Vector line integrals and work', text: R`The line integral of a field along \(C\) is \(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r} = \int_{a}^{b} \mathbf{F}(\mathbf{r}(t)) \cdot \mathbf{r}'(t)\,dt\), also written \(\displaystyle\int_{C} P\,dx + Q\,dy\). It adds up the component of \(\mathbf{F}\) along the direction of travel, and it is the work done by a force field \(\mathbf{F}\). Reversing the direction of travel changes its sign.`, example: R`\(\mathbf{F} = \langle y, x \rangle\) along \(\mathbf{r}(t) = \langle t, t^{2} \rangle\), \(0 \le t \le 1\): \(\mathbf{F} \cdot \mathbf{r}' = \langle t^{2}, t \rangle \cdot \langle 1, 2t \rangle = 3t^{2}\), so the integral is \(1\).` },
      { title: 'Testing for a conservative field', text: R`If \(\mathbf{F} = \langle P, Q \rangle\) is conservative, then \(\dfrac{\partial P}{\partial y} = \dfrac{\partial Q}{\partial x}\) (both are \(f_{xy}\)). On a region with no holes, such as the whole plane, the converse holds too: if the cross-partials are equal, \(\mathbf{F}\) is conservative. If they differ anywhere, it is not.`, example: R`\(\langle 2xy, x^{2} \rangle\): \(\dfrac{\partial P}{\partial y} = 2x = \dfrac{\partial Q}{\partial x}\), conservative. \(\langle -y, x \rangle\): \(-1 \ne 1\), not conservative.` },
      { title: 'Finding a potential function', text: R`To find \(f\) with \(\nabla f = \langle P, Q \rangle\): integrate \(P\) with respect to \(x\), adding an unknown function \(g(y)\) in place of a constant. Then differentiate with respect to \(y\) and set the result equal to \(Q\) to find \(g\).`, example: R`\(\langle 2xy + 3, x^{2} + 4y \rangle\): \(f = x^{2}y + 3x + g(y)\); then \(f_{y} = x^{2} + g'(y) = x^{2} + 4y\), so \(g = 2y^{2}\) and \(f = x^{2}y + 3x + 2y^{2}\).` },
      { title: 'The fundamental theorem for line integrals', text: R`If \(\mathbf{F} = \nabla f\) and \(C\) runs from \(A\) to \(B\), then \(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r} = f(B) - f(A)\). So for a conservative field the integral is **path independent** (only the endpoints matter), and the integral around any closed curve is 0.`, example: R`For \(f = x^{2}y + 3x + 2y^{2}\) and any curve from \((1, 0)\) to \((2, 3)\): \(f(2, 3) - f(1, 0) = 36 - 3 = 33\).` },
      { title: "Green's theorem", text: R`Let \(C\) be a simple closed curve traversed **counter-clockwise**, enclosing the region \(D\), and let \(P\) and \(Q\) have continuous partial derivatives on all of \(D\). Then \(\displaystyle\oint_{C} P\,dx + Q\,dy = \iint_{D} \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right) dA\). Traversing \(C\) clockwise changes the sign. Taking \(P = -\frac{1}{2}y\) and \(Q = \frac{1}{2}x\) gives the area of \(D\): \(A = \dfrac{1}{2}\displaystyle\oint_{C} x\,dy - y\,dx\).`, example: R`\(\displaystyle\oint_{C} -y\,dx + 3x\,dy\) around the circle \(x^{2} + y^{2} = 4\), counter-clockwise: \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = 3 - (-1) = 4\), so the integral is \(4 \cdot 4\pi = 16\pi\).` },
    ],
    vocab: [
      { term: 'vector field', def: 'A rule that gives a vector at every point of a region.' },
      { term: 'conservative field', def: 'A field that is the gradient of some function, called its potential function.' },
      { term: 'path independent', def: 'Having the same line integral along every curve between the same two points.' },
      { term: 'circulation', def: R`The line integral \(\oint_{C} \mathbf{F} \cdot d\mathbf{r}\) around a closed curve: how strongly the field pushes around the loop.` },
    ],
    mistakes: [
      R`Leaving out \(|\mathbf{r}'(t)|\) in \(\int_{C} f\,ds\), or leaving out the dot product with \(\mathbf{r}'(t)\) in \(\int_{C} \mathbf{F} \cdot d\mathbf{r}\).`,
      R`Using \(f(A) - f(B)\). The fundamental theorem gives the value at the end minus the value at the start.`,
      R`Counting a shared term twice when building a potential from \(\int P\,dx\) and \(\int Q\,dy\).`,
      R`Using Green's theorem with the wrong sign: it is \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\), for counter-clockwise travel.`,
      "Applying Green's theorem when the field is not defined at some point inside the curve.",
    ],
    visual: {
      type: 'plot',
      x: [-3, 3],
      y: [-3, 3],
      square: true,
      param: [{ x: (t) => 2 * Math.cos(t), y: (t) => 2 * Math.sin(t), t: [0, 2 * PI], color: 'b' }],
      segments: [-2, -1, 0, 1, 2].flatMap((x) => [-2, -1, 0, 1, 2].filter((y) => x || y).map((y) => ({ from: [x + 0.15 * y, y - 0.15 * x], to: [x - 0.15 * y, y + 0.15 * x], arrow: true, color: 'a' }))),
      alt: 'The vector field F(x, y) = ⟨−y, x⟩ drawn as arrows on a grid: the arrows circle the origin counter-clockwise and get longer farther out. A circle of radius 2 about the origin is drawn too. Along it the field points in the direction of counter-clockwise travel, so the line integral around it is positive.',
    },
  },

  examples: [
    {
      title: 'A scalar line integral along a segment',
      problem: R`Evaluate \(\displaystyle\int_{C} (x + y)\,ds\), where \(C\) is the line segment from \((0, 0)\) to \((3, 4)\).`,
      steps: [
        R`Parametrize the segment: \(\mathbf{r}(t) = \langle 3t, 4t \rangle\), \(0 \le t \le 1\).`,
        R`\(\mathbf{r}'(t) = \langle 3, 4 \rangle\), so \(|\mathbf{r}'(t)| = \sqrt{9 + 16} = 5\) and \(ds = 5\,dt\).`,
        R`On the segment, \(x + y = 3t + 4t = 7t\).`,
        R`\(\displaystyle\int_{0}^{1} 7t \cdot 5\,dt = 35 \cdot \frac{1}{2}\).`,
      ],
      answer: R`\(\dfrac{35}{2}\)`,
    },
    {
      title: 'Word problem: work along a parabola',
      word: true,
      problem: R`A force field \(\mathbf{F}(x, y) = \langle xy, y \rangle\) newtons acts on a particle that moves along the parabola \(y = x^{2}\) from \((0, 0)\) to \((2, 4)\), with distances in meters. How much work does the field do?`,
      steps: [
        R`Work is the line integral \(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r}\). Parametrize the path: \(\mathbf{r}(t) = \langle t, t^{2} \rangle\), \(0 \le t \le 2\), so \(\mathbf{r}'(t) = \langle 1, 2t \rangle\).`,
        R`On the path, \(\mathbf{F} = \langle t \cdot t^{2}, t^{2} \rangle = \langle t^{3}, t^{2} \rangle\).`,
        R`\(\mathbf{F} \cdot \mathbf{r}'(t) = t^{3}(1) + t^{2}(2t) = 3t^{3}\).`,
        R`\(\displaystyle\int_{0}^{2} 3t^{3}\,dt = \frac{3}{4}(2)^{4} = 12\).`,
      ],
      answer: '12 joules',
    },
    {
      title: 'A conservative field: potential and path independence',
      problem: R`Show that \(\mathbf{F} = \langle 2xy + 3, x^{2} + 4y \rangle\) is conservative, and evaluate \(\displaystyle\int_{C} \mathbf{F} \cdot d\mathbf{r}\) along any curve from \((1, 0)\) to \((2, 3)\).`,
      steps: [
        R`Test: \(\dfrac{\partial P}{\partial y} = 2x\) and \(\dfrac{\partial Q}{\partial x} = 2x\). They are equal on the whole plane, so \(\mathbf{F}\) is conservative.`,
        R`Integrate \(P\) with respect to \(x\): \(f = x^{2}y + 3x + g(y)\).`,
        R`Then \(f_{y} = x^{2} + g'(y)\) must equal \(Q = x^{2} + 4y\), so \(g'(y) = 4y\) and \(g(y) = 2y^{2}\). A potential is \(f = x^{2}y + 3x + 2y^{2}\).`,
        R`By the fundamental theorem, the integral is \(f(2, 3) - f(1, 0) = (12 + 6 + 18) - 3\).`,
      ],
      answer: R`\(33\), along every curve from \((1, 0)\) to \((2, 3)\)`,
    },
    {
      title: "Green's theorem on a circle",
      problem: R`Evaluate \(\displaystyle\oint_{C} (x^{2} - y)\,dx + (3x + y^{2})\,dy\), where \(C\) is the circle \(x^{2} + y^{2} = 4\) traversed counter-clockwise.`,
      steps: [
        R`\(P = x^{2} - y\) and \(Q = 3x + y^{2}\): \(\dfrac{\partial Q}{\partial x} = 3\) and \(\dfrac{\partial P}{\partial y} = -1\).`,
        R`Green's theorem: \(\displaystyle\oint_{C} P\,dx + Q\,dy = \iint_{D} (3 - (-1))\,dA = 4 \cdot (\text{area of } D)\).`,
        R`\(D\) is the disk of radius 2, with area \(4\pi\).`,
      ],
      answer: R`\(16\pi\)`,
    },
    {
      title: 'Area of an ellipse by a line integral',
      problem: R`Use \(A = \dfrac{1}{2}\displaystyle\oint_{C} x\,dy - y\,dx\) to find the area inside the ellipse \(x = 3\cos t\), \(y = 2\sin t\), \(0 \le t \le 2\pi\).`,
      steps: [
        R`\(dx = -3\sin t\,dt\) and \(dy = 2\cos t\,dt\).`,
        R`\(x\,dy - y\,dx = (3\cos t)(2\cos t)\,dt - (2\sin t)(-3\sin t)\,dt = 6(\cos^{2}t + \sin^{2}t)\,dt = 6\,dt\).`,
        R`\(A = \dfrac{1}{2}\displaystyle\int_{0}^{2\pi} 6\,dt = \dfrac{1}{2} \cdot 12\pi\).`,
      ],
      answer: R`\(A = 6\pi\)`,
    },
  ],

  models: [
    {
      id: 'work-on-a-path',
      title: 'Word problem: work done along a straight path',
      word: true,
      intro: 'The force field is F = ⟨a − c·y, c·x⟩ newtons: a steady push a in the x-direction plus a swirl of strength c about the origin. Choose a and c and the two ends of the path.',
      inputs: [
        { name: 'a', label: 'Steady push a (N)', type: 'int', min: -5, max: 5, value: 2 },
        { name: 'c', label: 'Swirl strength c', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'x0', label: 'Start: x', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'y0', label: 'Start: y', type: 'int', min: -4, max: 4, value: -2 },
        { name: 'x1', label: 'End: x', type: 'int', min: -4, max: 4, value: 3 },
        { name: 'y1', label: 'End: y', type: 'int', min: -4, max: 4, value: 2 },
      ],
      compute({ a, c, x0, y0, x1, y1 }) {
        const [dx, dy] = [x1 - x0, y1 - y0];
        if (!dx && !dy) return { error: 'The start and the end are the same point. Move one of them so that the particle travels.' };
        const [Pt0, Pt1, Qt0, Qt1] = [a - c * y0, -c * dy, c * x0, c * dx];
        const W = Pt0 * dx + Qt0 * dy;
        const arrows = [-4, -2, 0, 2, 4].flatMap((x) => [-4, -2, 0, 2, 4].map((y) => [x, y, a - c * y, c * x])).filter((v) => v[2] || v[3]);
        const longest = Math.max(1, ...arrows.map((v) => Math.hypot(v[2], v[3])));
        return {
          problem: R`A force field \(\mathbf{F}(x, y) = ${V([terms([[a, ''], [-c, 'y']]), terms([[c, 'x']])])}\) newtons acts on a particle that moves in a straight line from \(${Pt([x0, y0])}\) to \(${Pt([x1, y1])}\), with distances in meters. How much work does the field do?`,
          steps: [
            R`Parametrize the path: \(\mathbf{r}(t) = \langle ${terms([[x0, ''], [dx, 't']])}, ${terms([[y0, ''], [dy, 't']])} \rangle\), \(0 \le t \le 1\), so \(\mathbf{r}'(t) = ${V([dx, dy])}\).`,
            R`On the path, \(\mathbf{F}(\mathbf{r}(t)) = \langle ${terms([[Pt0, ''], [Pt1, 't']])}, ${terms([[Qt0, ''], [Qt1, 't']])} \rangle\).`,
            R`\(\mathbf{F} \cdot \mathbf{r}'(t) = \left(${terms([[Pt0, ''], [Pt1, 't']])}\right)(${dx}) + \left(${terms([[Qt0, ''], [Qt1, 't']])}\right)(${dy}) = ${W}\)${Pt1 * dx ? R`; the terms in \(t\) cancel` : ''}.`,
            R`\(W = \displaystyle\int_{0}^{1} ${paren(W)}\,dt = ${W}\) joules. ${W > 0 ? 'On balance the field pushes the particle along its path.' : W < 0 ? 'The work is negative: on balance the field pushes against the motion.' : 'The pushes with and against the motion balance out.'}`,
          ],
          answer: R`\(W = ${W}\) joules`,
          visual: {
            type: 'plot',
            x: [-5.5, 5.5],
            y: [-5.5, 5.5],
            square: true,
            segments: [...arrows.map(([x, y, u, v]) => ({ from: [x, y], to: [x + (1.6 * u) / longest, y + (1.6 * v) / longest], arrow: true, color: 'a' })), { from: [x0, y0], to: [x1, y1], arrow: true, color: 'b', label: 'path' }],
            alt: `The force field drawn as arrows on a grid, with the straight path of the particle from (${x0}, ${y0}) to (${x1}, ${y1}) drawn as a longer arrow. The work is ${W} joules.`,
          },
        };
      },
    },
    {
      id: 'green-on-a-rectangle',
      title: "Green's theorem on a rectangle, both ways",
      intro: 'For F = ⟨p·xy, q·x²⟩ and the rectangle 0 ≤ x ≤ w, 0 ≤ y ≤ h, compare the line integral around the edge with the double integral over the inside.',
      inputs: [
        { name: 'p', label: 'p (P = p·xy)', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'qv', label: 'q (Q = q·x²)', type: 'int', min: -4, max: 4, value: 2 },
        { name: 'w', label: 'Width w', type: 'int', min: 1, max: 5, value: 3 },
        { name: 'h', label: 'Height h', type: 'int', min: 1, max: 5, value: 2 },
      ],
      compute({ p, qv, w, h }) {
        const k = 2 * qv - p;
        const total = frac(k * w * w * h, 2);
        const [right, top] = [qv * w * w * h, frac(-p * h * w * w, 2)];
        return {
          problem: R`Check Green's theorem for \(\mathbf{F} = ${V([terms([[p, 'xy']]), terms([[qv, 'x^{2}']])])}\) on the rectangle with vertices \((0, 0)\), \((${w}, 0)\), \((${w}, ${h})\), \((0, ${h})\), traversed counter-clockwise.`,
          steps: [
            R`Double integral: \(\dfrac{\partial Q}{\partial x} = ${terms([[2 * qv, 'x']])}\) and \(\dfrac{\partial P}{\partial y} = ${terms([[p, 'x']])}\), so \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = ${terms([[k, 'x']])}\), and \(\displaystyle\int_{0}^{${w}}\int_{0}^{${h}} ${terms([[k, 'x']])}\,dy\,dx = ${dot(k, h, frac(w * w, 2))} = ${total.tex()}\).`,
            R`Line integral, bottom edge (\(y = 0\), \(dy = 0\)): \(P = 0\) there, so it contributes \(0\).`,
            R`Right edge (\(x = ${w}\), \(dx = 0\), \(y\) from \(0\) to \(${h}\)): \(\displaystyle\int_{0}^{${h}} ${qv * w * w}\,dy = ${right}\).`,
            R`Top edge (\(y = ${h}\), \(dy = 0\), \(x\) from \(${w}\) back to \(0\)): \(\displaystyle\int_{${w}}^{0} ${terms([[p * h, 'x']])}\,dx = ${top.tex()}\).`,
            R`Left edge (\(x = 0\), \(dx = 0\)): \(Q = 0\) there, so it contributes \(0\).`,
            R`Total: \(${right} + ${paren(top)} = ${total.tex()}\), the same as the double integral.`,
          ],
          answer: R`Both sides equal \(${total.tex()}\)`,
          visual: {
            type: 'plot',
            ...squareWindow([[0, 0], [w, h]], 1),
            polygons: [{ points: [[0, 0], [w, 0], [w, h], [0, h]], color: 'a' }],
            segments: [[[0, 0], [w, 0]], [[w, 0], [w, h]], [[w, h], [0, h]], [[0, h], [0, 0]]].map(([from, to]) => ({ from, to, arrow: true, color: 'b' })),
            alt: `The rectangle from (0, 0) to (${w}, ${h}), shaded, with arrows on its four edges showing counter-clockwise travel: right along the bottom, up the right side, left along the top and down the left side.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyGradientField, easyFundamental, easyCrossPartials],
    medium: [mediumScalarLine, mediumWork, mediumPotential],
    hard: [hardGreen, hardPathIndependence, hardCircleWork],
    challenge: [challengeGreenShortcut, challengeArea, challengeHole],
  },
};
