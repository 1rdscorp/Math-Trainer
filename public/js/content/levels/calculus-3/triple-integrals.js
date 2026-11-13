import { R, q, frac, Frac, num, gcd, lcm, terms, power, dot, product, texFrac, integrate, integrate2, integrate3, numPartial, checkEqual, close } from '../../lib/index.js';
import { M, piTex, planeTex, mpTex, mpClean, mpAdd, mpScale, fp, fpPow, fpSub, fpMul, fpScale, fpInt, exactCos, rootOver, angleTex, squareWindow } from './_shared.js';

const PI = Math.PI;
const XYZ = ['x', 'y', 'z'];
const F = (c) => Frac.from(c);
const pi = (c) => M(piTex(c));
/** LaTeX for an iterated integral. `lims` lists [lower, upper, variable] from the OUTER integral inward. */
const iter = (lims, body) => `${lims.map(([lo, hi]) => `\\int_{${lo}}^{${hi}}`).join('')} ${body}${lims.slice().reverse().map(([, , v]) => `\\,d${v}`).join('')}`;
const wrapSum = (t) => (t.includes(' + ') || t.includes(' - ') ? `\\left(${t}\\right)` : t);
/** For checks: the wrong candidates that q() actually used (it puts the correct answer first), or null if they are not three different ones. */
function shownWrong(question, cands, texOf) {
  const shown = cands.filter((c) => question.choices.indexOf(M(texOf(c))) > 0);
  return new Set(shown.map(texOf)).size === 3 ? shown : null;
}

// ── Exact integration of polynomials in x, y, z (terms [coef, i, j, k], Frac coefficients) ──
const mpMul = (p, s) => mpClean(p.flatMap(([a, i = 0, j = 0, k = 0]) => s.map(([b, l = 0, m = 0, n = 0]) => [F(a).mul(b), i + l, j + m, k + n])));
const mpPow = (p, n) => Array.from({ length: n }).reduce((acc) => mpMul(acc, p), [[frac(1), 0, 0, 0]]);
/** Exact integral of p with respect to variable v (0 = x, 1 = y, 2 = z) from 0 to hi, a polynomial in the other variables. */
const mpInt = (p, v, hi) => p.reduce((acc, [c, i = 0, j = 0, k = 0]) => {
  const e = [i, j, k];
  const n = e[v] + 1;
  e[v] = 0;
  return mpAdd(acc, mpMul([[F(c).div(n), ...e]], mpPow(hi, n)));
}, []);
const mpConst = (p) => (p.length ? F(p[0][0]) : frac(0));

// ── Numeric integration in rectangular coordinates, for checks ──
const root = (v) => Math.sqrt(Math.max(0, v));
/** ∫ g over [lo, hi] after substituting x = mid + half·sin s, which tames square-root behaviour at the ends. */
function smooth(g, lo, hi, n = 48) {
  const [mid, half] = [(lo + hi) / 2, (hi - lo) / 2];
  return integrate((s) => g(mid + half * Math.sin(s)) * half * Math.cos(s), -PI / 2, PI / 2, n);
}
/** ∭ f dz dy dx over the part of the disk x² + y² ≤ rad² between z = zLo(x, y) and z = zHi(x, y). No polar factor is used. */
const overDisk = (f, rad, zLo, zHi) => smooth((x) => smooth((y) => integrate((z) => f(x, y, z), zLo(x, y), zHi(x, y), 48), -root(rad * rad - x * x), root(rad * rad - x * x)), -rad, rad);
const capTop = (a) => (x, y) => root(a * a - x * x - y * y);
/** ∭ f dV over the part of the ball of radius a above the cone that makes the angle `deg` with the z-axis (90 → half-ball, 180 → ball). */
function overCap(f, a, deg) {
  if (deg === 180) return overDisk(f, a, (x, y) => -capTop(a)(x, y), capTop(a));
  const t = (deg * PI) / 180;
  return overDisk(f, a * Math.sin(t), (x, y) => (deg === 90 ? 0 : Math.hypot(x, y) / Math.tan(t)), capTop(a));
}
/** ∬ f dA over a convex polygon, cut into vertical slabs at the vertices. */
function overPolygon(f, pts) {
  const xs = [...new Set(pts.map((p) => Math.round(p[0] * 1e9) / 1e9))].sort((a, b) => a - b);
  const cut = (x) => {
    const ys = pts.map((p, i) => [p, pts[(i + 1) % pts.length]]).filter(([p, s]) => Math.abs(p[0] - s[0]) > 1e-9 && Math.min(p[0], s[0]) - 1e-9 <= x && x <= Math.max(p[0], s[0]) + 1e-9).map(([p, s]) => p[1] + ((s[1] - p[1]) * (x - p[0])) / (s[0] - p[0]));
    return [Math.min(...ys), Math.max(...ys)];
  };
  return xs.slice(1).reduce((sum, x1, i) => sum + integrate2(f, xs[i], x1, (x) => cut(x)[0], (x) => cut(x)[1], 60), 0);
}

// ───────────── Easy ─────────────

function easyBoxIntegral(rng) {
  let e;
  let lo;
  let hi;
  let k;
  let ans;
  const part = (i, a = lo[i], b = hi[i]) => frac(b ** (e[i] + 1) - a ** (e[i] + 1), e[i] + 1);
  const total = (f) => f(0).mul(f(1)).mul(f(2)).mul(k);
  do {
    e = [rng.int(0, 2), rng.int(0, 2), rng.int(0, 2)];
    lo = [0, 0, 0];
    hi = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 4)];
    if (rng.bool(0.35)) {
      const i = rng.int(0, 2);
      lo[i] = 1;
      hi[i] = rng.int(2, 4);
    }
    k = rng.pick([1, 2, 3, 4, 6, 12]);
    ans = total(part);
  } while (e.filter((n) => n > 0).length < 2 || ans.n > 999 || ans.d > 9);
  const order = rng.shuffle([0, 1, 2]); // outer → inner
  const [o, , n] = order;
  const swapped = total((i) => (i === o ? part(o, lo[n], hi[n]) : i === n ? part(n, lo[o], hi[o]) : part(i)));
  return q({
    prompt: R`Evaluate \(\displaystyle ${iter(order.map((i) => [lo[i], hi[i], XYZ[i]]), mpTex([[k, ...e]]))}\).`,
    correct: ans,
    wrong: [
      { value: total((i) => part(i).mul(e[i] + 1)), why: R`Integrating a power divides by the new exponent: \(\int x^{n}\,dx = \dfrac{x^{n+1}}{n+1}\). The divisions are missing.` },
      { value: swapped, why: 'Each pair of limits belongs to one variable: the outermost integral sign goes with the last differential.' },
      frac(k * hi[0] ** e[0] * hi[1] ** e[1] * hi[2] ** e[2]),
      ans.mul(2),
      ans.div(2),
    ],
    solution: [
      'The limits are constants and the integrand is a product of powers, so the triple integral is a product of three single integrals.',
      `${[0, 1, 2].map((i) => R`\(\displaystyle\int_{${lo[i]}}^{${hi[i]}} ${power(XYZ[i], e[i])}\,d${XYZ[i]} = ${part(i).tex()}\)`).join(', ')}.`,
      R`Multiply${k === 1 ? '' : R`, including the constant \(${k}\)`}: \(${dot(...(k === 1 ? [] : [k]), part(0), part(1), part(2))} = ${ans.tex()}\).`,
    ],
    rule: 0,
    skill: 'triple integral over a box',
    check: () => checkEqual(ans.value, integrate3((x, y, z) => k * x ** e[0] * y ** e[1] * z ** e[2], lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]), 1e-6, 'box integral'),
  });
}

// Upper limits for φ whose cosine is rational.
const CAPS = [{ tex: '\\pi', cos: frac(-1) }, { tex: '\\frac{\\pi}{2}', cos: frac(0) }, { tex: '\\frac{\\pi}{3}', cos: frac(1, 2) }, { tex: '\\frac{2\\pi}{3}', cos: frac(-1, 2) }];

function easyIteratedConst(rng) {
  const a = rng.int(1, 3);
  const th = rng.pick([frac(2), frac(1), frac(1, 2)]); // θ runs from 0 to th·π
  const thT = piTex(th);
  if (rng.bool()) {
    const h = rng.int(1, 4);
    const [p, s] = rng.pick([[1, 0], [1, 1], [2, 0], [3, 0], [2, 1], [1, 2], [3, 1]]);
    const [rI, zI] = [frac(a ** (p + 1), p + 1), frac(h ** (s + 1), s + 1)];
    const ans = th.mul(rI).mul(zI);
    return q({
      prompt: R`This integral is written in cylindrical coordinates. Evaluate \(\displaystyle ${iter([[0, thT, '\\theta'], [0, a, 'r'], [0, h, 'z']], power('r', p) + power('z', s))}\).`,
      correct: pi(ans),
      wrong: [
        { value: pi(th.mul(a ** (p + 1)).mul(h ** (s + 1))), why: R`Integrating a power divides by the new exponent: \(\displaystyle\int_{0}^{${a}} ${power('r', p)}\,dr = ${rI.tex()}\).` },
        { value: M(rI.mul(zI).tex()), why: R`The outer integral \(\displaystyle\int_{0}^{${thT}} d\theta = ${thT}\) has been left out.` },
        pi(ans.mul(2)),
        pi(ans.div(2)),
        pi(ans.mul(3)),
      ],
      solution: [
        'Every limit is a constant and the integrand is a product, so integrate one variable at a time.',
        R`\(\displaystyle\int_{0}^{${h}} ${power('z', s)}\,dz = ${zI.tex()}\), \(\displaystyle\int_{0}^{${a}} ${power('r', p)}\,dr = ${rI.tex()}\), \(\displaystyle\int_{0}^{${thT}} d\theta = ${thT}\).`,
        R`Multiply: \(${dot(zI, rI, thT)} = ${piTex(ans)}\).`,
      ],
      rule: 2,
      skill: 'iterated integral, cylindrical',
      check: () => checkEqual(ans.value * PI, integrate3((t, r, z) => r ** p * z ** s, 0, th.value * PI, 0, a, 0, h), 1e-6, 'cylindrical integral'),
    });
  }
  const cap = rng.pick(CAPS);
  const p = rng.int(2, 4);
  const A = frac(1).sub(cap.cos);
  const rhoI = frac(a ** (p + 1), p + 1);
  const ans = th.mul(A).mul(rhoI);
  return q({
    prompt: R`This integral is written in spherical coordinates. Evaluate \(\displaystyle ${iter([[0, thT, '\\theta'], [0, cap.tex, '\\phi'], [0, a, '\\rho']], `${power('\\rho', p)}\\sin\\phi`)}\).`,
    correct: pi(ans),
    wrong: [
      { value: pi(ans.neg()), why: R`\(\displaystyle\int_{0}^{${cap.tex}} \sin\phi\,d\phi = \Big[-\cos\phi\Big]_{0}^{${cap.tex}} = ${A.tex()}\), which is positive.` },
      { value: pi(th.mul(A).mul(a ** (p + 1))), why: R`Integrating a power divides by the new exponent: \(\displaystyle\int_{0}^{${a}} ${power('\\rho', p)}\,d\rho = ${rhoI.tex()}\).` },
      cap.cos.value !== 0 ? pi(th.mul(cap.cos.neg()).mul(rhoI)) : null,
      M(A.mul(rhoI).tex()),
      pi(ans.mul(2)),
      pi(ans.div(2)),
    ],
    solution: [
      'Every limit is a constant and the integrand is a product, so integrate one variable at a time.',
      R`\(\displaystyle\int_{0}^{${a}} ${power('\\rho', p)}\,d\rho = ${rhoI.tex()}\), \(\displaystyle\int_{0}^{${cap.tex}} \sin\phi\,d\phi = \Big[-\cos\phi\Big]_{0}^{${cap.tex}} = ${A.tex()}\), \(\displaystyle\int_{0}^{${thT}} d\theta = ${thT}\).`,
      R`Multiply: \(${dot(rhoI, A, thT)} = ${piTex(ans)}\).`,
    ],
    rule: 3,
    skill: 'iterated integral, spherical',
    check: () => checkEqual(ans.value * PI, integrate3((t, ph, rho) => rho ** p * Math.sin(ph), 0, th.value * PI, 0, Math.acos(cap.cos.value), 0, a), 1e-5, 'spherical integral'),
  });
}

// A solid with constant limits. cyl: [r, θ, z]; sph: [ρ, θ, φ]. Angles are stored as multiples of π.
const TWO_PI = [frac(0), frac(2)];
const ONE_PI = [frac(0), frac(1)];
const HALF_PI = [frac(0), frac(1, 2)];
const cyl = (r, th, z) => ({ sys: 'cyl', lims: [r, th, z] });
const sph = (rho, th, ph) => ({ sys: 'sph', lims: [rho, th, ph] });
const rangeTex = ([lo, hi], sym, inPi) => `${inPi ? piTex(lo) : num(lo)} \\le ${sym} \\le ${inPi ? piTex(hi) : num(hi)}`;
const solidTex = ({ sys, lims }) => [rangeTex(lims[0], sys === 'cyl' ? 'r' : '\\rho'), rangeTex(lims[1], '\\theta', true), rangeTex(lims[2], sys === 'cyl' ? 'z' : '\\phi', sys === 'sph')].join(',\\; ');
function inSolid({ sys, lims }, x, y, z) {
  const within = (v, [lo, hi]) => v >= +lo && v <= +hi;
  const th = ((Math.atan2(y, x) + 2 * PI) % (2 * PI)) / PI;
  if (sys === 'cyl') return within(Math.hypot(x, y), lims[0]) && within(th, lims[1]) && within(z, lims[2]);
  const rho = Math.hypot(x, y, z);
  return within(rho, lims[0]) && within(th, lims[1]) && within(Math.acos(z / rho) / PI, lims[2]);
}

const SOLIDS = [
  (rng) => {
    const a = rng.int(2, 5);
    const h = rng.intExcept(1, 9, [a, a * a]);
    return {
      name: R`the solid cylinder \(x^{2} + y^{2} \le ${a * a}\), \(0 \le z \le ${h}\)`,
      inside: (x, y, z) => x * x + y * y <= a * a && z >= 0 && z <= h,
      correct: cyl([0, a], TWO_PI, [0, h]),
      wrong: [
        [cyl([0, a * a], TWO_PI, [0, h]), R`\(x^{2} + y^{2} = r^{2}\), so \(r^{2} \le ${a * a}\) means \(r \le ${a}\).`],
        [sph([0, a], TWO_PI, ONE_PI), 'Those limits describe a solid ball. A cylinder has constant limits in cylindrical coordinates.'],
        [cyl([0, a], ONE_PI, [0, h]), R`With \(0 \le \theta \le \pi\) only the half with \(y \ge 0\) is covered.`],
        [cyl([0, h], TWO_PI, [0, a])],
      ],
      why: R`The base is the disk \(r \le ${a}\), all the way round (\(0 \le \theta \le 2\pi\)), and the height runs from \(z = 0\) to \(z = ${h}\).`,
    };
  },
  (rng) => {
    const a = rng.int(2, 6);
    return {
      name: R`the half-ball \(x^{2} + y^{2} + z^{2} \le ${a * a}\), \(z \ge 0\)`,
      inside: (x, y, z) => x * x + y * y + z * z <= a * a && z >= 0,
      correct: sph([0, a], TWO_PI, HALF_PI),
      wrong: [
        [sph([0, a], ONE_PI, ONE_PI), R`\(0 \le \theta \le \pi\) gives the half with \(y \ge 0\). The condition \(z \ge 0\) restricts \(\phi\), not \(\theta\).`],
        [sph([0, a], TWO_PI, ONE_PI), R`With \(\phi\) running to \(\pi\) the lower half is included as well.`],
        [sph([0, a], TWO_PI, [frac(1, 2), frac(1)])],
        [sph([0, a * a], TWO_PI, HALF_PI)],
      ],
      why: R`\(\rho \le ${a}\) for the ball. \(z = \rho\cos\phi \ge 0\) means \(0 \le \phi \le \frac{\pi}{2}\), and \(\theta\) goes all the way round.`,
    };
  },
  (rng) => {
    const a = rng.int(1, 4);
    const b = rng.int(a + 1, 6);
    return {
      name: R`the hollow ball \(${a * a} \le x^{2} + y^{2} + z^{2} \le ${b * b}\)`,
      inside: (x, y, z) => x * x + y * y + z * z >= a * a && x * x + y * y + z * z <= b * b,
      correct: sph([a, b], TWO_PI, ONE_PI),
      wrong: [
        [sph([a * a, b * b], TWO_PI, ONE_PI), R`\(x^{2} + y^{2} + z^{2} = \rho^{2}\), so take square roots: \(${a} \le \rho \le ${b}\).`],
        [sph([0, b], TWO_PI, ONE_PI), R`That fills in the hollow. \(\rho\) starts at the inner sphere, \(\rho = ${a}\).`],
        [cyl([a, b], TWO_PI, [-b, b]), 'Those limits describe a pipe (the region between two cylinders), not a hollow ball.'],
        [sph([a, b], TWO_PI, HALF_PI)],
      ],
      why: R`The solid lies between the spheres \(\rho = ${a}\) and \(\rho = ${b}\), in every direction: \(0 \le \theta \le 2\pi\), \(0 \le \phi \le \pi\).`,
    };
  },
  (rng) => {
    const a = rng.int(2, 5);
    const h = rng.intExcept(1, 9, [a, a * a]);
    const quarter = rng.bool();
    return {
      name: quarter
        ? R`the quarter cylinder \(x^{2} + y^{2} \le ${a * a}\), \(x \ge 0\), \(y \ge 0\), \(0 \le z \le ${h}\)`
        : R`the half cylinder \(x^{2} + y^{2} \le ${a * a}\), \(y \ge 0\), \(0 \le z \le ${h}\)`,
      inside: (x, y, z) => x * x + y * y <= a * a && y >= 0 && (!quarter || x >= 0) && z >= 0 && z <= h,
      correct: cyl([0, a], quarter ? HALF_PI : ONE_PI, [0, h]),
      wrong: [
        quarter
          ? [cyl([0, a], ONE_PI, [0, h]), R`\(0 \le \theta \le \pi\) allows negative \(x\). The first quadrant is \(0 \le \theta \le \frac{\pi}{2}\).`]
          : [cyl([0, a], HALF_PI, [0, h]), R`\(0 \le \theta \le \frac{\pi}{2}\) is only the quarter with \(x \ge 0\) and \(y \ge 0\). The half-plane \(y \ge 0\) is \(0 \le \theta \le \pi\).`],
        [cyl([0, a], TWO_PI, [0, h]), R`With \(\theta\) going all the way round, the whole cylinder is included.`],
        [cyl([0, a * a], quarter ? HALF_PI : ONE_PI, [0, h])],
        [sph([0, a], quarter ? HALF_PI : ONE_PI, HALF_PI)],
      ],
      why: quarter
        ? R`\(r \le ${a}\) and \(0 \le z \le ${h}\) for the cylinder; \(x \ge 0\) and \(y \ge 0\) keep \(\theta\) in the first quadrant, \(0 \le \theta \le \frac{\pi}{2}\).`
        : R`\(r \le ${a}\) and \(0 \le z \le ${h}\) for the cylinder; \(y = r\sin\theta \ge 0\) means \(0 \le \theta \le \pi\).`,
    };
  },
];

function easyDescribeSolid(rng) {
  const k = rng.pick(SOLIDS)(rng);
  const question = q({
    prompt: `Which limits describe ${k.name}?`,
    correct: M(solidTex(k.correct)),
    wrong: k.wrong.map(([d, why]) => (why ? { value: M(solidTex(d)), why } : M(solidTex(d)))),
    solution: [k.why, R`So the solid is \(${solidTex(k.correct)}\).`],
    rule: 4,
    skill: 'describing a solid',
    check: () => {
      const size = Math.max(+k.correct.lims[0][1], k.correct.sys === 'cyl' ? Math.abs(+k.correct.lims[2][1]) : 0);
      const pts = [];
      for (const s of [size / 6, size]) for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) for (let l = -7; l <= 7; l++) pts.push([(i + 0.31) * s, (j - 0.17) * s, (l + 0.23) * s]);
      if (!pts.every(([x, y, z]) => inSolid(k.correct, x, y, z) === k.inside(x, y, z))) return 'the correct limits do not match the solid';
      const shown = shownWrong(question, k.wrong, ([d]) => solidTex(d));
      return shown && shown.every(([d]) => pts.some(([x, y, z]) => inSolid(d, x, y, z) !== k.inside(x, y, z))) ? true : 'a wrong choice describes the same solid';
    },
  });
  return question;
}

// ───────────── Medium ─────────────

const X1 = [[1, 1, 0, 0]];
const Y1 = [[1, 0, 1, 0]];
// Regions 0 ≤ x ≤ a, 0 ≤ y ≤ y(x), 0 ≤ z ≤ z(x, y), as polynomials.
const REGIONS = [
  () => ({ y: X1, z: Y1 }),
  () => ({ y: X1, z: [[1, 1, 0, 0], [1, 0, 1, 0]] }),
  () => ({ y: X1, z: [[1, 1, 1, 0]] }),
  () => ({ y: X1, z: [[1, 1, 0, 0], [-1, 0, 1, 0]] }),
  () => ({ y: [[2, 1, 0, 0]], z: Y1 }),
  () => ({ y: [[2, 1, 0, 0]], z: [[1, 1, 0, 0], [1, 0, 1, 0]] }),
  () => ({ y: [[1, 2, 0, 0]], z: Y1 }),
  () => ({ y: [[1, 2, 0, 0]], z: X1 }),
  (a) => ({ y: [[a, 0, 0, 0], [-1, 1, 0, 0]], z: [[a, 0, 0, 0], [-1, 1, 0, 0], [-1, 0, 1, 0]] }),
  (a) => ({ y: [[a, 0, 0, 0], [-1, 1, 0, 0]], z: Y1 }),
  (a) => ({ y: [[a, 0, 0, 0], [-1, 1, 0, 0]], z: X1 }),
];
const INTEGRANDS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [2, 0, 0], [0, 2, 0]];

function mediumGeneralRegion(rng) {
  let a;
  let reg;
  let e;
  let c;
  let base;
  let good;
  const top = () => [[a, 0, 0, 0]];
  const all = (p) => mpConst(mpInt(mpInt(mpInt(p, 2, reg.z), 1, reg.y), 0, top()));
  do {
    a = rng.int(1, 3);
    reg = rng.pick(REGIONS)(a);
    e = rng.pick(INTEGRANDS);
    base = all([[1, ...e]]);
    good = [1, 2, 3, 4, 6, 8, 12, 24].filter((m) => base.mul(m).d <= 5 && base.mul(m).n <= 300);
  } while (!good.length);
  c = rng.pick(good);
  const f = [[c, ...e]];
  const inner = mpInt(f, 2, reg.z);
  const middle = mpInt(inner, 1, reg.y);
  const ans = mpConst(mpInt(middle, 0, top()));
  const plugged = mpConst(mpInt(mpInt(mpMul([[c, e[0], e[1], 0]], mpPow(reg.z, e[2])), 1, reg.y), 0, top()));
  const [yT, zT] = [mpTex(reg.y), mpTex(reg.z)];
  const body = c === 1 && e.every((n) => n === 0) ? '' : mpTex(f);
  const fn = (p) => (x, y) => p.reduce((s, [k, i, j]) => s + +k * x ** i * y ** j, 0);
  return q({
    prompt: R`Evaluate \(\displaystyle ${iter([[0, a, 'x'], [0, yT, 'y'], [0, zT, 'z']], body)}\).`,
    correct: ans,
    wrong: [
      { value: plugged, why: e[2] ? R`The inner integral needs an antiderivative in \(z\) before the limit \(z = ${zT}\) is substituted.` : R`The inner integral \(\displaystyle\int_{0}^{${zT}} dz\) is not 1. It contributes the factor \(${zT}\).` },
      e[2] ? { value: ans.mul(e[2] + 1), why: R`\(\displaystyle\int z\,dz = \frac{z^{2}}{2}\). The division by 2 is missing.` } : null,
      ans.mul(2),
      ans.div(2),
      ans.mul(3),
      ans.div(3),
    ],
    solution: [
      R`Inner integral, with \(x\) and \(y\) held constant: \(\displaystyle\int_{0}^{${zT}} ${body}\,dz = ${mpTex(inner)}\).`,
      R`Middle integral, with \(x\) held constant: \(\displaystyle\int_{0}^{${yT}} ${wrapSum(mpTex(inner))}\,dy = ${mpTex(middle)}\).`,
      R`Outer integral: \(\displaystyle\int_{0}^{${a}} ${wrapSum(mpTex(middle))}\,dx = ${ans.tex()}\).`,
    ],
    rule: 1,
    skill: 'iterated integral, variable limits',
    check: () => checkEqual(ans.value, integrate3((x, y, z) => c * x ** e[0] * y ** e[1] * z ** e[2], 0, a, 0, (x) => fn(reg.y)(x, 0), 0, fn(reg.z)), 1e-5, 'iterated integral'),
  });
}

/** (sum of terms) / den in lowest terms, as one fraction. */
function linOver(list, den) {
  const g = list.reduce((acc, [c]) => gcd(acc, c), den);
  const t = terms(list.map(([c, s]) => [c / g, s]));
  return den === g ? t : `\\frac{${t}}{${den / g}}`;
}

function mediumSetup(rng) {
  let co;
  do co = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)];
  while (gcd(gcd(co[0], co[1]), co[2]) > 1);
  const d = lcm(lcm(co[0], co[1]), co[2]) * rng.int(1, 2);
  const [o1, o2, o3] = rng.shuffle([0, 1, 2]); // outer → inner
  const [v1, v2, v3] = [XYZ[o1], XYZ[o2], XYZ[o3]];
  const cut = (i) => d / co[i]; // where the plane meets axis i
  const midT = linOver([[d, ''], [-co[o1], v1]], co[o2]);
  const inT = linOver([[d, ''], [-co[o1], v1], [-co[o2], v2]], co[o3]);
  const mid = (s) => (d - co[o1] * s) / co[o2];
  const inn = (s, t) => (d - co[o1] * s - co[o2] * t) / co[o3];
  const show = (l1, l2, l3) => M(iter([[0, l1, v1], [0, l2, v2], [0, l3, v3]], 'f'));
  const vol = (l2, l3) => integrate3(() => 1, 0, cut(o1), 0, l2, 0, l3);
  return q({
    prompt: R`Let \(E\) be the tetrahedron bounded by the coordinate planes and the plane \(${planeTex(co, d)}\). Which iterated integral equals \(\displaystyle\iiint_{E} f(x, y, z)\,dV\)?`,
    correct: show(cut(o1), midT, inT),
    wrong: [
      { value: show(cut(o1), cut(o2), cut(o3)), why: 'Constant limits describe the whole box around the tetrahedron. The sloping face makes the inner limits depend on the outer variables.' },
      co[o2] === co[o3] ? null : { value: show(cut(o1), linOver([[d, ''], [-co[o1], v1]], co[o3]), inT), why: R`With \(${v3} = 0\) the plane is \(${terms([[co[o1], v1], [co[o2], v2]])} = ${d}\), so \(${v2} \le ${midT}\). The coefficient of \(${v3}\) plays no part in this limit.` },
      { value: show(cut(o1), midT, linOver([[d, ''], [-co[o1], v1]], co[o3])), why: R`The inner limit comes from solving the plane for \(${v3}\), and it involves both of the outer variables.` },
      { value: show(linOver([[d, ''], [-co[o2], v2], [-co[o3], v3]], co[o1]), linOver([[d, ''], [-co[o3], v3]], co[o2]), cut(o3)), why: 'The outer limits must be constants. A limit may only contain variables whose integrals are further out.' },
      show(cut(o1), cut(o2), inT),
    ],
    solution: [
      R`Outer variable \(${v1}\): it runs along its axis from \(0\) to the point where the plane cuts the axis, \(${v1} = ${cut(o1)}\).`,
      R`For a fixed \(${v1}\), \(${v2}\) runs from \(0\) to the edge of the tetrahedron in the plane \(${v3} = 0\): \(${terms([[co[o1], v1], [co[o2], v2]])} = ${d}\), so \(${v2} \le ${midT}\).`,
      R`For fixed \(${v1}\) and \(${v2}\), \(${v3}\) runs from \(0\) up to the sloping face: \(${v3} \le ${inT}\).`,
      R`\(\displaystyle\iiint_{E} f\,dV = ${iter([[0, cut(o1), v1], [0, midT, v2], [0, inT, v3]], 'f')}\).`,
    ],
    rule: 1,
    skill: 'setting up limits',
    check: () => {
      const want = d ** 3 / (6 * co[0] * co[1] * co[2]); // a sixth of the product of the intercepts
      if (!close(vol(mid, inn), want, 1e-6)) return `the set-up has volume ${vol(mid, inn)}; the tetrahedron has volume ${want}`;
      const others = [vol(cut(o2), cut(o3)), vol(mid, (s) => (d - co[o1] * s) / co[o3]), vol(cut(o2), inn), ...(co[o2] === co[o3] ? [] : [vol((s) => (d - co[o1] * s) / co[o3], inn)])];
      return others.every((v) => !close(v, want, 1e-3)) ? true : 'a wrong set-up has the right volume';
    },
  });
}

// Solids of revolution about the z-axis: 0 ≤ r ≤ a, lo(r) ≤ z ≤ hi(r), with lo and hi polynomials in r.
const ROUND = [
  (rng) => {
    const [a, h] = [rng.int(1, 3), rng.int(1, 4)];
    return { a, text: R`inside the cylinder \(x^{2} + y^{2} = ${a * a}\), between the planes \(z = 0\) and \(z = ${h}\)`, lo: fp(0), hi: fp(h), loT: '0', hiT: `${h}`, zLo: () => 0, zHi: () => h };
  },
  (rng) => {
    const a = rng.int(1, 3);
    return { a, text: R`under the paraboloid \(z = ${a * a} - x^{2} - y^{2}\) and above the \(xy\)-plane`, lo: fp(0), hi: fp(a * a, 0, -1), loT: '0', hiT: `${a * a} - r^{2}`, zLo: () => 0, zHi: (x, y) => a * a - x * x - y * y };
  },
  (rng) => {
    const a = rng.int(1, 3);
    return { a, text: R`above the paraboloid \(z = x^{2} + y^{2}\) and below the plane \(z = ${a * a}\)`, lo: fp(0, 0, 1), hi: fp(a * a), loT: 'r^{2}', hiT: `${a * a}`, zLo: (x, y) => x * x + y * y, zHi: () => a * a, under: 'paraboloid' };
  },
  (rng) => {
    const a = rng.int(1, 4);
    return { a, text: R`above the cone \(z = \sqrt{x^{2} + y^{2}}\) and below the plane \(z = ${a}\)`, lo: fp(0, 1), hi: fp(a), loT: 'r', hiT: `${a}`, zLo: (x, y) => Math.hypot(x, y), zHi: () => a, under: 'cone' };
  },
];
const ROUND_F = [{ p: 0, s: 0 }, { p: 2, s: 0, tex: '\\left(x^{2} + y^{2}\\right)', cyl: 'r^{2}' }, { p: 1, s: 0, tex: '\\sqrt{x^{2} + y^{2}}', cyl: 'r' }, { p: 0, s: 1, tex: 'z', cyl: 'z' }];
/** ∫₀ᵃ rᵖ·(∫ zˢ dz from lo to hi) dr: the r-integrand (a polynomial in r) and its integral. */
function roundExact(p, s, lo, hi, a) {
  const rPoly = fpMul(fpScale(fpSub(fpPow(hi, s + 1), fpPow(lo, s + 1)), frac(1, s + 1)), [...new Array(p).fill(frac(0)), frac(1)]);
  return { rPoly, value: fpInt(rPoly, 0, a) };
}

function mediumCylindrical(rng) {
  const reg = rng.pick(ROUND)(rng);
  const f = rng.pick(ROUND_F);
  const { a } = reg;
  const { rPoly, value } = roundExact(f.p + 1, f.s, reg.lo, reg.hi, a);
  const ans = value.mul(2);
  const noJac = roundExact(f.p, f.s, reg.lo, reg.hi, a).value.mul(2);
  const below = reg.under ? roundExact(f.p + 1, f.s, fp(0), reg.lo, a).value.mul(2) : null;
  return q({
    prompt: f.tex
      ? R`Use cylindrical coordinates to evaluate \(\displaystyle\iiint_{E} ${f.tex}\,dV\), where \(E\) is the solid ${reg.text}.`
      : R`Use cylindrical coordinates to find the volume of the solid \(E\) that lies ${reg.text}.`,
    correct: pi(ans),
    wrong: [
      { value: pi(noJac), why: R`In cylindrical coordinates \(dV = r\,dz\,dr\,d\theta\). The factor \(r\) is missing.` },
      below ? { value: pi(below), why: R`That integrates from the \(xy\)-plane up to the ${reg.under}. \(E\) is above the ${reg.under}: \(${reg.loT} \le z \le ${reg.hiT}\).` } : null,
      { value: M(value.tex()), why: R`The \(\theta\)-integral, \(\displaystyle\int_{0}^{2\pi} d\theta = 2\pi\), has been left out.` },
      pi(ans.div(2)),
      pi(ans.mul(2)),
    ],
    solution: [
      R`In cylindrical coordinates \(E\) is \(0 \le \theta \le 2\pi\), \(0 \le r \le ${a}\), \(${reg.loT} \le z \le ${reg.hiT}\)${f.tex ? R`, and the integrand is \(${f.cyl}\)` : ''}. The volume element is \(dV = r\,dz\,dr\,d\theta\).`,
      R`The integral becomes \(\displaystyle ${iter([[0, '2\\pi', '\\theta'], [0, a, 'r'], [reg.loT, reg.hiT, 'z']], power('r', f.p + 1) + power('z', f.s))}\).`,
      R`Integrate in \(z\): what is left is \(\displaystyle\int_{0}^{2\pi}\int_{0}^{${a}} ${wrapSum(terms(rPoly.map((c, i) => [c, power('r', i)])))}\,dr\,d\theta\).`,
      R`The \(r\)-integral is \(${value.tex()}\), and the \(\theta\)-integral multiplies by \(2\pi\): \(${piTex(ans)}\).`,
    ],
    rule: 2,
    skill: 'cylindrical coordinates',
    check: () => checkEqual(ans.value * PI, overDisk((x, y, z) => Math.hypot(x, y) ** f.p * z ** f.s, a, reg.zLo, reg.zHi), 1e-3, 'integral in rectangular coordinates'),
  });
}

// ───────────── Hard ─────────────

// Cones z = k·√(x² + y²) and the angle φ they make with the positive z-axis.
const CONES = { 30: { phi: '\\frac{\\pi}{6}', z: '\\sqrt{3(x^{2} + y^{2})}', tan: '\\frac{1}{\\sqrt{3}}' }, 45: { phi: '\\frac{\\pi}{4}', z: '\\sqrt{x^{2} + y^{2}}', tan: '1' }, 60: { phi: '\\frac{\\pi}{3}', z: '\\sqrt{\\frac{x^{2} + y^{2}}{3}}', tan: '\\sqrt{3}' } };
const COS2 = { 30: frac(3, 4), 45: frac(1, 2), 60: frac(1, 4), 90: frac(0), 180: frac(1) };
const COS = { 60: frac(1, 2), 90: frac(0), 180: frac(-1) };
// Integrands f = ρᵖ·(angular part), with the exact value of ∫₀^φ₁ (angular part)·sin φ dφ in terms of c = cos φ₁.
const SPH_F = [
  { p: 2, tex: '\\left(x^{2} + y^{2} + z^{2}\\right)', sph: '\\rho^{2}', body: '\\rho^{4}\\sin\\phi', fn: (x, y, z) => x * x + y * y + z * z },
  { p: 1, tex: '\\sqrt{x^{2} + y^{2} + z^{2}}', sph: '\\rho', body: '\\rho^{3}\\sin\\phi', fn: (x, y, z) => Math.hypot(x, y, z) },
  { p: 1, tex: 'z', sph: '\\rho\\cos\\phi', body: '\\rho^{3}\\cos\\phi\\sin\\phi', fn: (x, y, z) => z, ang: (c, c2) => frac(1).sub(c2).div(2), angT: (t) => R`\int_{0}^{${t}} \cos\phi\sin\phi\,d\phi = \Big[\tfrac{1}{2}\sin^{2}\phi\Big]_{0}^{${t}}` },
  { p: 2, tex: 'z^{2}', sph: '\\rho^{2}\\cos^{2}\\phi', body: '\\rho^{4}\\cos^{2}\\phi\\sin\\phi', fn: (x, y, z) => z * z, ang: (c) => frac(1).sub(c.pow(3)).div(3), angT: (t) => R`\int_{0}^{${t}} \cos^{2}\phi\sin\phi\,d\phi = \Big[-\tfrac{1}{3}\cos^{3}\phi\Big]_{0}^{${t}}` },
  { p: 2, tex: '\\left(x^{2} + y^{2}\\right)', sph: '\\rho^{2}\\sin^{2}\\phi', body: '\\rho^{4}\\sin^{3}\\phi', fn: (x, y) => x * x + y * y, ang: (c) => frac(2, 3).sub(c).add(c.pow(3).div(3)), angT: (t) => R`\int_{0}^{${t}} \sin^{3}\phi\,d\phi = \int_{0}^{${t}} (1 - \cos^{2}\phi)\sin\phi\,d\phi = \Big[-\cos\phi + \tfrac{1}{3}\cos^{3}\phi\Big]_{0}^{${t}}` },
  { p: 0, tex: '', sph: '', body: '\\rho^{2}\\sin\\phi', fn: () => 1 },
];
const plainAng = (c) => frac(1).sub(c);
const plainAngT = (t) => R`\int_{0}^{${t}} \sin\phi\,d\phi = \Big[-\cos\phi\Big]_{0}^{${t}}`;

function hardSpherical(rng) {
  const deg = rng.pick([180, 90, 90, 60, 60, 60, 45, 30]);
  const a = rng.int(1, 3);
  const f = SPH_F[rng.pick({ 180: [0, 1, 3, 4], 90: [0, 1, 2, 3, 4], 60: [0, 1, 2, 3, 4, 5], 45: [2], 30: [2] }[deg])];
  const A = (dg) => (f.ang ?? plainAng)(COS[dg], COS2[dg]);
  const phi = deg === 180 ? '\\pi' : deg === 90 ? '\\frac{\\pi}{2}' : CONES[deg].phi;
  const radial = frac(a ** (f.p + 3), f.p + 3);
  const value = (ang, rad = radial) => ang.mul(rad).mul(2);
  const ans = value(A(deg));
  const text = deg === 180 ? R`the solid ball \(x^{2} + y^{2} + z^{2} \le ${a * a}\)` : deg === 90 ? R`the half-ball \(x^{2} + y^{2} + z^{2} \le ${a * a}\), \(z \ge 0\)` : R`the solid inside the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\) and above the cone \(z = ${CONES[deg].z}\)`;
  const limits = R`\(0 \le \rho \le ${a}\), \(0 \le \phi \le ${phi}\), \(0 \le \theta \le 2\pi\)`;
  return q({
    prompt: f.tex ? R`Use spherical coordinates to evaluate \(\displaystyle\iiint_{E} ${f.tex}\,dV\), where \(E\) is ${text}.` : R`Use spherical coordinates to find the volume of ${text}.`,
    correct: pi(ans),
    wrong: [
      { value: pi(value(A(deg), frac(a ** (f.p + 1), f.p + 1))), why: R`\(dV = \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\). The factor \(\rho^{2}\) is missing.` },
      deg === 180
        ? { value: pi(value(A(90))), why: R`That stops at \(\phi = \frac{\pi}{2}\), which covers only the upper half of the ball.` }
        : deg === 90
          ? { value: pi(value(A(180))), why: R`That lets \(\phi\) run to \(\pi\), which is the whole ball. \(z \ge 0\) means \(\phi \le \frac{\pi}{2}\).` }
          : { value: pi(value(A(90))), why: R`That lets \(\phi\) run to \(\frac{\pi}{2}\), the whole upper half-ball. The cone stops \(\phi\) at \(${phi}\).` },
      pi(value(A(deg), frac(a ** (f.p + 2), f.p + 2))),
      pi(ans.div(2)),
      pi(ans.mul(2)),
    ],
    solution: [
      deg === 180 ? R`\(E\) is ${limits}.` : deg === 90 ? R`\(z = \rho\cos\phi \ge 0\) means \(\phi \le \frac{\pi}{2}\), so \(E\) is ${limits}.` : R`On the cone, \(z = \rho\cos\phi\) and \(\sqrt{x^{2} + y^{2}} = \rho\sin\phi\), so \(\tan\phi = ${CONES[deg].tan}\) and \(\phi = ${phi}\). Above the cone, \(E\) is ${limits}.`,
      R`${f.sph ? R`The integrand is \(${f.sph}\) and ` : ''}\(dV = \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\), so the integral is \(\displaystyle ${iter([[0, '2\\pi', '\\theta'], [0, phi, '\\phi'], [0, a, '\\rho']], f.body)}\).`,
      R`\(\displaystyle\int_{0}^{${a}} \rho^{${f.p + 2}}\,d\rho = ${radial.tex()}\) and \(\displaystyle ${(f.angT ?? plainAngT)(phi)} = ${A(deg).tex()}\).`,
      R`Multiply these, and by \(\displaystyle\int_{0}^{2\pi} d\theta = 2\pi\): \(${dot(radial, A(deg), '2\\pi')} = ${piTex(ans)}\).`,
    ],
    rule: 3,
    skill: 'spherical coordinates',
    check: () => checkEqual(ans.value * PI, overCap(f.fn, a, deg), 1e-3, 'integral in rectangular coordinates'),
  });
}

const COM = [
  (rng) => {
    const dims = [rng.int(2, 6), rng.int(2, 6), rng.int(2, 6)];
    let e;
    do e = [rng.int(0, 2), rng.int(0, 2), rng.int(0, 2)];
    while (!e.some((n) => n > 0) || e[0] + e[1] + e[2] > 3);
    const i = rng.pick([0, 1, 2].filter((j) => e[j] > 0));
    const [a, n, v] = [dims[i], e[i], XYZ[i]];
    const k = rng.int(1, 5);
    const dens = (x, y, z) => k * x ** e[0] * y ** e[1] * z ** e[2];
    const [top, bot] = [frac(a ** (n + 2), n + 2), frac(a ** (n + 1), n + 1)];
    const ans = top.div(bot);
    return {
      prompt: R`A solid block occupies \(0 \le x \le ${dims[0]}\), \(0 \le y \le ${dims[1]}\), \(0 \le z \le ${dims[2]}\) (in cm). Its density is \(\delta = ${mpTex([[k, ...e]])}\) g/cm³. Find the \(${v}\)-coordinate of its center of mass.`,
      ans,
      wrong: [
        { value: frac(a, 2), why: R`That is the middle of the block. The density grows with \(${v}\), which pulls the center of mass toward larger \(${v}\).` },
        { value: frac(a).sub(ans), why: R`That is the distance from the far face. The denser material is at larger \(${v}\), so \(\bar{${v}}\) is more than halfway along.` },
        frac(a * (n + 2), n + 3),
        frac(a * n, n + 1),
      ],
      solution: [
        R`\(\bar{${v}} = \dfrac{1}{m}\displaystyle\iiint_{E} ${v}\,\delta\,dV\), where \(m = \displaystyle\iiint_{E} \delta\,dV\).`,
        R`Both integrals are over the same box and both integrands are products of powers. The integrals in the other two variables are the same in each, so they cancel in the quotient.`,
        R`\(\bar{${v}} = \dfrac{\int_{0}^{${a}} ${power(v, n + 1)}\,d${v}}{\int_{0}^{${a}} ${power(v, n)}\,d${v}} = \dfrac{${top.tex()}}{${bot.tex()}} = ${ans.tex()}\) cm.`,
      ],
      numeric: () => integrate3((x, y, z) => [x, y, z][i] * dens(x, y, z), 0, dims[0], 0, dims[1], 0, dims[2]) / integrate3(dens, 0, dims[0], 0, dims[1], 0, dims[2]),
    };
  },
  (rng) => {
    const a = rng.pick([2, 3, 4, 5, 6, 8]);
    const k = rng.pick([0, 0, 2, 3, 4, 5]); // 0 → constant density
    const ans = k ? frac(8 * a, 15) : frac(3 * a, 8);
    const dens = (x, y, z) => (k ? k * z : 1);
    const [m, mxy] = k ? [frac(k * a ** 4, 4), frac(2 * k * a ** 5, 15)] : [frac(2 * a ** 3, 3), frac(a ** 4, 4)];
    const sph = (body) => iter([[0, '2\\pi', '\\theta'], [0, '\\pi/2', '\\phi'], [0, a, '\\rho']], body);
    return {
      prompt: R`A solid hemisphere of radius ${a} cm rests with its flat face on the \(xy\)-plane: \(x^{2} + y^{2} + z^{2} \le ${a * a}\), \(z \ge 0\). Its density is ${k ? R`\(\delta = ${k}z\) g/cm³` : 'constant'}. Find the height \(\bar{z}\) of its center of mass.`,
      ans,
      wrong: k
        ? [{ value: frac(3 * a, 8), why: 'That is the height for constant density. Here the density grows with height, which pulls the center of mass up.' }, frac(a, 2), frac(2 * a, 3), frac(4 * a, 15)]
        : [{ value: frac(a, 2), why: 'Halfway up would be right for a cylinder. A hemisphere has more of its volume near its base.' }, { value: frac(5 * a, 8), why: R`That is measured down from the top. From the flat face the height is \(\frac{3}{8}\) of the radius.` }, frac(a, 3), frac(3 * a, 4)],
      solution: k
        ? [
          R`\(\bar{z} = \dfrac{M_{xy}}{m}\) with \(m = \displaystyle\iiint_{E} ${k}z\,dV\) and \(M_{xy} = \displaystyle\iiint_{E} ${k}z^{2}\,dV\). Use spherical coordinates, where \(z = \rho\cos\phi\).`,
          R`\(\displaystyle m = ${k}${sph('\\rho^{3}\\cos\\phi\\sin\\phi')} = ${dot(k, '2\\pi', frac(1, 2), frac(a ** 4, 4))} = ${piTex(m)}\).`,
          R`\(\displaystyle M_{xy} = ${k}${sph('\\rho^{4}\\cos^{2}\\phi\\sin\\phi')} = ${dot(k, '2\\pi', frac(1, 3), frac(a ** 5, 5))} = ${piTex(mxy)}\).`,
          R`\(\bar{z} = \dfrac{${piTex(mxy)}}{${piTex(m)}} = ${ans.tex()}\) cm.`,
        ]
        : [
          R`By symmetry \(\bar{x} = \bar{y} = 0\). The density is constant, so it cancels: \(\bar{z} = \dfrac{1}{V}\displaystyle\iiint_{E} z\,dV\), with \(V = \frac{2}{3}\pi(${a})^{3} = ${piTex(m)}\).`,
          R`In spherical coordinates \(z = \rho\cos\phi\): \(\displaystyle\iiint_{E} z\,dV = ${sph('\\rho^{3}\\cos\\phi\\sin\\phi')} = ${dot('2\\pi', frac(1, 2), frac(a ** 4, 4))} = ${piTex(mxy)}\).`,
          R`\(\bar{z} = \dfrac{${piTex(mxy)}}{${piTex(m)}} = ${ans.tex()}\) cm.`,
        ],
      numeric: () => overCap((x, y, z) => z * dens(x, y, z), a, 90) / overCap(dens, a, 90),
    };
  },
  (rng) => {
    const cone = rng.bool(0.7);
    const m = cone ? rng.int(1, 3) : 1;
    const a = cone ? rng.int(1, 4) : rng.int(1, 3);
    const h = cone ? m * a : a * a;
    const ans = cone ? frac(3 * h, 4) : frac(2 * h, 3);
    const [vol, mxy] = cone ? [frac(a * a * h, 3), frac(h * h * a * a, 4)] : [frac(a ** 4, 2), frac(a ** 6, 3)];
    const loT = cone ? terms([[m, 'r']]) : 'r^{2}';
    const zLo = (x, y) => (cone ? m * Math.hypot(x, y) : x * x + y * y);
    return {
      prompt: cone
        ? R`A solid cone of constant density has its vertex at the origin and its axis along the positive \(z\)-axis: \(${terms([[m, '\\sqrt{x^{2} + y^{2}}']])} \le z \le ${h}\) (in cm). Find the height \(\bar{z}\) of its center of mass.`
        : R`A solid of constant density lies above the paraboloid \(z = x^{2} + y^{2}\) and below the plane \(z = ${h}\) (in cm). Find the height \(\bar{z}\) of its center of mass.`,
      ans,
      wrong: [
        { value: frac(h, 2), why: 'Halfway up would be right for a cylinder. This solid is widest at the top, so its center of mass is above the middle.' },
        { value: frac(h).sub(ans), why: 'That is measured down from the top. The narrow end is at the origin, so the center of mass is nearer the top.' },
        cone ? frac(2 * h, 3) : frac(3 * h, 4),
        frac(3 * h, 5),
      ],
      solution: [
        R`By symmetry \(\bar{x} = \bar{y} = 0\), and the constant density cancels: \(\bar{z} = \dfrac{1}{V}\displaystyle\iiint_{E} z\,dV\). In cylindrical coordinates \(E\) is \(0 \le \theta \le 2\pi\), \(0 \le r \le ${a}\), \(${loT} \le z \le ${h}\).`,
        R`\(\displaystyle V = ${iter([[0, '2\\pi', '\\theta'], [0, a, 'r'], [loT, h, 'z']], 'r')} = 2\pi\int_{0}^{${a}} \left(${cone ? terms([[h, 'r'], [-m, 'r^{2}']]) : terms([[h, 'r'], [-1, 'r^{3}']])}\right) dr = ${piTex(vol)}\).`,
        R`\(\displaystyle\iiint_{E} z\,dV = 2\pi\int_{0}^{${a}} \tfrac{1}{2}\left(${cone ? terms([[h * h, 'r'], [-m * m, 'r^{3}']]) : terms([[h * h, 'r'], [-1, 'r^{5}']])}\right) dr = ${piTex(mxy)}\).`,
        R`\(\bar{z} = \dfrac{${piTex(mxy)}}{${piTex(vol)}} = ${ans.tex()}\) cm.`,
      ],
      numeric: () => overDisk((x, y, z) => z, a, zLo, () => h) / overDisk(() => 1, a, zLo, () => h),
    };
  },
];

function hardCenterOfMass(rng) {
  const k = rng.pick(COM)(rng);
  return q({
    prompt: k.prompt,
    correct: k.ans,
    unit: 'cm',
    wrong: k.wrong,
    solution: k.solution,
    rule: 5,
    skill: 'center of mass',
    check: () => checkEqual(k.ans.value, k.numeric(), 1e-3, 'center of mass from the definition'),
  });
}

// A volume integral with θ from 0 to 2π. The middle variable (r or φ) runs between two numbers and the inner one
// (z or ρ) between two functions of it. Each limit is { tex, v }: v is a number or a function of the middle variable.
const L = (tex, v) => ({ tex: String(tex), v: v ?? Number(tex) });
const ANGLE = { 30: L('\\frac{\\pi}{6}', PI / 6), 45: L('\\frac{\\pi}{4}', PI / 4), 60: L('\\frac{\\pi}{3}', PI / 3), 90: L('\\frac{\\pi}{2}', PI / 2), 180: L('\\pi', PI), 360: L('2\\pi', 2 * PI) };
const JAC = { r: ['r', (r) => r], sph: ['\\rho^{2}\\sin\\phi', (ph, rho) => rho * rho * Math.sin(ph)], none: ['', () => 1] };
const setupTex = ({ sys, mid, inner, jac = sys, th = ANGLE[360] }) => iter([[0, th.tex, '\\theta'], [mid[0].tex, mid[1].tex, sys === 'r' ? 'r' : '\\phi'], [inner[0].tex, inner[1].tex, sys === 'r' ? 'z' : '\\rho']], JAC[jac][0]);
const setupValue = ({ sys, mid, inner, jac = sys, th = ANGLE[360] }) => th.v * integrate2(JAC[jac][1], mid[0].v, mid[1].v, inner[0].v, inner[1].v);
const rootT = (n) => (Number.isInteger(Math.sqrt(n)) ? `${Math.sqrt(n)}` : `\\sqrt{${n}}`);

const CURVED = [
  (rng) => {
    const a = rng.int(2, 5);
    const deg = rng.pick([30, 45, 60]);
    const s = (mid, inner, jac) => ({ sys: 'sph', mid, inner, jac });
    const [zero, top] = [L(0), ANGLE[deg]];
    return {
      text: R`inside the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\) and above the cone \(z = ${CONES[deg].z}\)`,
      correct: s([zero, top], [zero, L(a)]),
      wrong: [
        [s([zero, top], [zero, L(a)], 'none'), R`The volume element in spherical coordinates is \(\rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\).`],
        deg === 60 ? null : [s([top, ANGLE[90]], [zero, L(a)]), R`Those values of \(\phi\) lie between the cone and the \(xy\)-plane, below the cone. Points above the cone have \(0 \le \phi \le ${top.tex}\).`],
        [s([zero, ANGLE[90]], [zero, L(a)]), R`That is the whole upper half-ball. The cone stops \(\phi\) at \(${top.tex}\).`],
        [s([zero, top], [zero, L(a * a)])],
      ].filter(Boolean),
      volume: () => overCap(() => 1, a, deg),
      solution: [
        R`The sphere is \(\rho = ${a}\). On the cone, \(z = \rho\cos\phi\) and \(\sqrt{x^{2} + y^{2}} = \rho\sin\phi\), so \(\tan\phi = ${CONES[deg].tan}\): the cone is \(\phi = ${top.tex}\).`,
        R`Above the cone means \(0 \le \phi \le ${top.tex}\), and the solid goes all the way round: \(0 \le \theta \le 2\pi\).`,
      ],
    };
  },
  (rng) => {
    const h = rng.pick([2, 3, 4, 5, 9]);
    const c = (mid, inner, jac) => ({ sys: 'r', mid, inner, jac });
    const [zero, rim, par, top] = [L(0), L(rootT(h), Math.sqrt(h)), L('r^{2}', (r) => r * r), L(h)];
    return {
      text: R`above the paraboloid \(z = x^{2} + y^{2}\) and below the plane \(z = ${h}\)`,
      correct: c([zero, rim], [par, top]),
      wrong: [
        [c([zero, rim], [par, top], 'none'), R`The volume element in cylindrical coordinates is \(r\,dz\,dr\,d\theta\).`],
        [c([zero, top], [par, top]), R`The paraboloid meets the plane where \(r^{2} = ${h}\), so \(r\) stops at \(${rim.tex}\).`],
        [c([zero, rim], [zero, top]), R`That is the whole cylinder of height \(${h}\). The bottom of the solid is the paraboloid, \(z = r^{2}\).`],
        [{ ...c([zero, rim], [par, top]), th: ANGLE[180] }],
      ],
      volume: () => overDisk(() => 1, Math.sqrt(h), (x, y) => x * x + y * y, () => h),
      solution: [
        R`In cylindrical coordinates the paraboloid is \(z = r^{2}\). The solid lies between it and the plane: \(r^{2} \le z \le ${h}\).`,
        R`The two surfaces meet where \(r^{2} = ${h}\), so \(0 \le r \le ${rim.tex}\), with \(0 \le \theta \le 2\pi\).`,
      ],
    };
  },
  (rng) => {
    const b = rng.int(1, 4);
    const a = rng.int(b + 1, 5);
    const c = (mid, inner, jac) => ({ sys: 'r', mid, inner, jac });
    const cap = (sign) => L(`${sign < 0 ? '-' : ''}\\sqrt{${a * a} - r^{2}}`, (r) => sign * root(a * a - r * r));
    return {
      text: R`inside both the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\) and the cylinder \(x^{2} + y^{2} = ${b * b}\)`,
      correct: c([L(0), L(b)], [cap(-1), cap(1)]),
      wrong: [
        [c([L(0), L(b)], [L(0), cap(1)]), R`That is only the part above the \(xy\)-plane. The sphere also bounds the solid from below, at \(z = -\sqrt{${a * a} - r^{2}}\).`],
        [c([L(0), L(a)], [cap(-1), cap(1)]), R`That is the whole ball. The cylinder keeps \(r\) between \(0\) and \(${b}\).`],
        [c([L(0), L(b)], [cap(-1), cap(1)], 'none'), R`The volume element in cylindrical coordinates is \(r\,dz\,dr\,d\theta\).`],
        [c([L(0), L(b)], [L(-a), L(a)])],
      ],
      volume: () => overDisk(() => 1, b, (x, y) => -capTop(a)(x, y), capTop(a)),
      solution: [
        R`The cylinder is \(r = ${b}\), so \(0 \le r \le ${b}\) and \(0 \le \theta \le 2\pi\).`,
        R`The sphere is \(r^{2} + z^{2} = ${a * a}\). For each \(r\) it bounds \(z\) below and above: \(-\sqrt{${a * a} - r^{2}} \le z \le \sqrt{${a * a} - r^{2}}\).`,
      ],
    };
  },
];

function hardSetupCurved(rng) {
  const k = rng.pick(CURVED)(rng);
  const question = q({
    prompt: R`Which integral gives the volume of the solid that lies ${k.text}?`,
    correct: M(setupTex(k.correct)),
    wrong: k.wrong.map(([s, why]) => (why ? { value: M(setupTex(s)), why } : M(setupTex(s)))),
    solution: [...k.solution, R`With the volume element \(${JAC[k.correct.sys][0]}\,d${k.correct.sys === 'r' ? 'z\\,dr' : '\\rho\\,d\\phi'}\,d\theta\): \(\displaystyle V = ${setupTex(k.correct)}\).`],
    rule: 4,
    skill: 'choosing coordinates and limits',
    check: () => {
      const want = k.volume();
      if (!close(setupValue(k.correct), want, 1e-3)) return `the set-up gives ${setupValue(k.correct)}; the volume in rectangular coordinates is ${want}`;
      const shown = shownWrong(question, k.wrong, ([s]) => setupTex(s));
      return shown && shown.every(([s]) => !close(setupValue(s), want, 2e-3)) ? true : 'a wrong set-up has the right volume';
    },
  });
  return question;
}

const cf = (n, s) => (n === 1 ? s : `${n}${s}`);
// Transformations: LaTeX for x and y, the map, the four partial derivatives, the Jacobian, and wrong Jacobians.
const MAPS = [
  (rng) => {
    let p;
    let s;
    let r;
    let t;
    do [p, s, r, t] = [rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
    while (p * t === s * r);
    const det = p * t - s * r;
    return {
      x: terms([[p, 'u'], [s, 'v']]), y: terms([[r, 'u'], [t, 'v']]), map: (u, v) => [p * u + s * v, r * u + t * v], d: [p, s, r, t].map((n) => num(n)),
      ans: [num(det), () => det],
      wrong: [[num(-det), () => -det, R`The products are taken in this order: \(\dfrac{\partial x}{\partial u}\dfrac{\partial y}{\partial v} - \dfrac{\partial x}{\partial v}\dfrac{\partial y}{\partial u}\).`], [num(p * t + s * r), () => p * t + s * r, 'The second product is subtracted, not added.'], [num(p * t), () => p * t], [num(p * r - s * t), () => p * r - s * t], [num(det + 2), () => det + 2], [num(det - 2), () => det - 2]],
    };
  },
  (rng) => {
    const [a, b, c] = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)];
    return {
      x: terms([[a, 'u^{2}'], [-b, 'v^{2}']]), y: terms([[c, 'uv']]), map: (u, v) => [a * u * u - b * v * v, c * u * v], d: [cf(2 * a, 'u'), `-${cf(2 * b, 'v')}`, cf(c, 'v'), cf(c, 'u')],
      ans: [terms([[2 * a * c, 'u^{2}'], [2 * b * c, 'v^{2}']]), (u, v) => 2 * a * c * u * u + 2 * b * c * v * v],
      wrong: [
        [terms([[2 * a * c, 'u^{2}'], [-2 * b * c, 'v^{2}']]), (u, v) => 2 * a * c * u * u - 2 * b * c * v * v, R`The second product, \((-${cf(2 * b, 'v')})(${cf(c, 'v')})\), is negative, and it is subtracted: the two signs make a plus.`],
        [terms([[-2 * a * c, 'u^{2}'], [-2 * b * c, 'v^{2}']]), (u, v) => -2 * a * c * u * u - 2 * b * c * v * v, R`The products are taken in this order: \(\dfrac{\partial x}{\partial u}\dfrac{\partial y}{\partial v} - \dfrac{\partial x}{\partial v}\dfrac{\partial y}{\partial u}\).`],
        [terms([[a * c, 'u^{2}'], [b * c, 'v^{2}']]), (u, v) => a * c * u * u + b * c * v * v],
        [terms([[2 * a * c, 'u^{2}']]), (u) => 2 * a * c * u * u],
      ],
    };
  },
  (rng) => {
    const [a, b] = [rng.int(1, 3), rng.int(1, 3)];
    const [E, cs, sn] = [`e^{${cf(a, 'u')}}`, `\\cos ${cf(b, 'v')}`, `\\sin ${cf(b, 'v')}`];
    return {
      x: E + cs, y: E + sn, map: (u, v) => [Math.exp(a * u) * Math.cos(b * v), Math.exp(a * u) * Math.sin(b * v)], d: [cf(a, E + cs), `-${cf(b, E + sn)}`, cf(a, E + sn), cf(b, E + cs)],
      ans: [cf(a * b, `e^{${2 * a}u}`), (u) => a * b * Math.exp(2 * a * u)],
      wrong: [
        [cf(a * b, E), (u) => a * b * Math.exp(a * u), R`Each partial derivative carries a factor \(${E}\), so each product carries \(e^{${2 * a}u}\).`],
        [cf(a * b, `e^{${2 * a}u}\\cos ${cf(2 * b, 'v')}`), (u, v) => a * b * Math.exp(2 * a * u) * Math.cos(2 * b * v), R`The second product is negative and is subtracted, which gives \(\cos^{2} + \sin^{2} = 1\), not \(\cos^{2} - \sin^{2}\).`],
        [`-${cf(a * b, `e^{${2 * a}u}`)}`, (u) => -a * b * Math.exp(2 * a * u)],
        [cf(a + b, `e^{${2 * a}u}`), (u) => (a + b) * Math.exp(2 * a * u)],
        [cf(2 * a * b, `e^{${2 * a}u}`), (u) => 2 * a * b * Math.exp(2 * a * u)],
      ],
    };
  },
];

function hardJacobian(rng) {
  const k = rng.pick(MAPS)(rng);
  const jac = (u, v) => numPartial((s, t) => k.map(s, t)[0], [u, v], 0) * numPartial((s, t) => k.map(s, t)[1], [u, v], 1) - numPartial((s, t) => k.map(s, t)[0], [u, v], 1) * numPartial((s, t) => k.map(s, t)[1], [u, v], 0);
  const question = q({
    prompt: R`Find the Jacobian \(\dfrac{\partial(x, y)}{\partial(u, v)}\) of the transformation \(x = ${k.x}\), \(y = ${k.y}\).`,
    correct: M(k.ans[0]),
    wrong: k.wrong.map(([tex, , why]) => (why ? { value: M(tex), why } : M(tex))),
    solution: [
      R`\(\dfrac{\partial x}{\partial u} = ${k.d[0]}\), \(\dfrac{\partial x}{\partial v} = ${k.d[1]}\), \(\dfrac{\partial y}{\partial u} = ${k.d[2]}\), \(\dfrac{\partial y}{\partial v} = ${k.d[3]}\).`,
      R`\(\dfrac{\partial(x, y)}{\partial(u, v)} = \dfrac{\partial x}{\partial u}\dfrac{\partial y}{\partial v} - \dfrac{\partial x}{\partial v}\dfrac{\partial y}{\partial u} = \left(${k.d[0]}\right)\left(${k.d[3]}\right) - \left(${k.d[1]}\right)\left(${k.d[2]}\right)\).`,
      R`Simplify: \(${k.ans[0]}\).`,
    ],
    rule: 6,
    skill: 'Jacobian of a transformation',
    check: () => {
      for (const [u, v] of [[0.7, 1.3], [-0.4, 0.9]]) {
        if (!close(k.ans[1](u, v), jac(u, v), 1e-5)) return `Jacobian at (${u}, ${v}) is ${jac(u, v)}, answer gives ${k.ans[1](u, v)}`;
      }
      const shown = shownWrong(question, k.wrong, ([tex]) => tex);
      return shown && shown.every(([, fn]) => !close(fn(0.7, 1.3), jac(0.7, 1.3), 1e-5) || !close(fn(-0.4, 0.9), jac(-0.4, 0.9), 1e-5)) ? true : 'a wrong choice equals the Jacobian';
    },
  });
  return question;
}

// ───────────── Challenge ─────────────

const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
// A region 0 ≤ (first of chain) ≤ (second) ≤ (third) ≤ a. In an order of integration (outer → inner), each variable
// runs between its nearest neighbours in the chain that are already fixed (or 0 and a).
const chainLimits = (chain, order) => order.map((w, k) => {
  const [pos, fixed] = [chain.indexOf(w), order.slice(0, k)];
  return { w, lo: chain.slice(0, pos).filter((u) => fixed.includes(u)).pop(), hi: chain.slice(pos + 1).find((u) => fixed.includes(u)) };
});
// A test integrand for which Simpson's rule is exact and no two of the six chain regions give the same integral.
const TEST_F = (x, y, z) => x + 2 * y + 4 * z;

function challengeChangeOrder(rng) {
  const a = rng.int(1, 6);
  const chain = rng.shuffle([0, 1, 2]);
  const [from, to] = rng.sample(ORDERS, 2);
  const end = (b, dflt) => (b == null ? dflt : XYZ[b]);
  const tex = (ls, names = ls.map((l) => XYZ[l.w])) => iter(ls.map(({ lo, hi }, i) => [end(lo, 0), end(hi, a), names[i]]), 'f');
  const value = (ls) => {
    const at = (b, dflt, vals) => (b == null ? dflt : vals[b]);
    const put = (...t) => t.reduce((vals, v, i) => ((vals[ls[i].w] = v), vals), []);
    return integrate3((t1, t2, t3) => TEST_F(...put(t1, t2, t3)), 0, a, (t1) => at(ls[1].lo, 0, put(t1)), (t1) => at(ls[1].hi, a, put(t1)), (t1, t2) => at(ls[2].lo, 0, put(t1, t2)), (t1, t2) => at(ls[2].hi, a, put(t1, t2)));
  };
  const [given, right] = [chainLimits(chain, from), chainLimits(chain, to)];
  const others = [[chain[2], chain[1], chain[0]], [chain[1], chain[0], chain[2]], [chain[0], chain[2], chain[1]]].map((ch) => chainLimits(ch, to));
  const chainT = (ch) => `0 \\le ${ch.map((i) => XYZ[i]).join(' \\le ')} \\le ${a}`;
  const range = ({ w, lo, hi }) => R`\(${end(lo, 0)} \le ${XYZ[w]} \le ${end(hi, a)}\)`;
  const dT = (order) => order.slice().reverse().map((i) => `d${XYZ[i]}`).join('\\,');
  return q({
    prompt: R`Rewrite \(\displaystyle ${tex(given)}\) as an iterated integral in the order \(${dT(to)}\).`,
    correct: M(tex(right)),
    wrong: [
      { value: M(tex(given, to.map((i) => XYZ[i]))), why: 'Only the differentials were reordered. The limits have to be rebuilt from the region itself.' },
      { value: M(tex(others[0])), why: R`Those limits describe the region \(${chainT([chain[2], chain[1], chain[0]])}\), with the inequalities reversed.` },
      M(tex(others[1])),
      M(tex(others[2])),
      M(iter(to.map((i) => [0, a, XYZ[i]]), 'f')),
    ],
    solution: [
      R`Read the region from the limits: ${given.map(range).join(', ')}. Together these say \(${chainT(chain)}\).`,
      R`New outer variable: \(${XYZ[to[0]]}\) can be anything the chain allows, \(0 \le ${XYZ[to[0]]} \le ${a}\).`,
      R`Each later variable runs between its nearest neighbors in the chain that are already fixed (or the ends \(0\) and \(${a}\)): ${range(right[1])}, then ${range(right[2])}.`,
      R`\(\displaystyle ${tex(right)}\).`,
    ],
    rule: 1,
    skill: 'changing the order of integration',
    check: () => {
      const want = value(given);
      if (!close(value(right), want, 1e-6)) return `the new order gives ${value(right)}, the original ${want}`;
      return others.every((ls) => !close(value(ls), want, 1e-4)) ? true : 'a wrong choice has the same value for the test function';
    },
  });
}

function challengeChangeOfVariables(rng) {
  let a1;
  let b1;
  let a2;
  let b2;
  let D;
  let u;
  let v;
  let m;
  let n;
  let ans;
  const side = (lo, hi, k) => frac(hi ** (k + 1) - lo ** (k + 1), k + 1);
  do {
    [a1, b1, a2, b2] = [rng.int(1, 3), rng.nonzero(-3, 3), rng.int(1, 3), rng.nonzero(-3, 3)];
    D = a1 * b2 - a2 * b1;
    u = [rng.int(-1, 1)];
    u.push(u[0] + rng.int(1, 3));
    v = [rng.int(-1, 1)];
    v.push(v[0] + rng.int(1, 3));
    [m, n] = rng.pick([[1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1], [1, 2], [2, 2]]);
    ans = side(u[0], u[1], m).mul(side(v[0], v[1], n)).div(Math.abs(D) || 1);
  } while (Math.abs(D) < 2 || Math.abs(D) > 5 || gcd(a1, b1) > 1 || gcd(a2, b2) > 1 || ans.n === 0);
  const [uT, vT] = [terms([[a1, 'x'], [b1, 'y']]), terms([[a2, 'x'], [b2, 'y']])];
  const pw = (t, k) => (k === 0 ? '' : k === 1 ? `(${t})` : `(${t})^{${k}}`);
  const k = frac(1, Math.abs(D));
  const corner = (s, t) => [(b2 * s - b1 * t) / D, (a1 * t - a2 * s) / D];
  return q({
    prompt: R`Let \(R\) be the parallelogram bounded by the lines \(${uT} = ${u[0]}\), \(${uT} = ${u[1]}\), \(${vT} = ${v[0]}\) and \(${vT} = ${v[1]}\). Use the change of variables \(u = ${uT}\), \(v = ${vT}\) to evaluate \(\displaystyle\iint_{R} ${pw(uT, m)}${pw(vT, n)}\,dA\).`,
    correct: ans,
    wrong: [
      { value: ans.mul(Math.abs(D)), why: R`The area element changes too: \(dA = \left|\dfrac{\partial(x, y)}{\partial(u, v)}\right| du\,dv = ${k.tex()}\,du\,dv\).` },
      { value: ans.mul(D * D), why: R`\(${D}\) is \(\dfrac{\partial(u, v)}{\partial(x, y)}\). The integral needs the reciprocal, \(\dfrac{\partial(x, y)}{\partial(u, v)}\), in absolute value.` },
      D < 0 ? { value: ans.neg(), why: 'The Jacobian enters through its absolute value: an area element is never negative.' } : null,
      ans.mul(2),
      ans.div(2),
    ],
    solution: [
      R`In the \(uv\)-plane the region is the rectangle \(${u[0]} \le u \le ${u[1]}\), \(${v[0]} \le v \le ${v[1]}\), and the integrand is \(${power('u', m) + power('v', n)}\).`,
      R`\(\dfrac{\partial(u, v)}{\partial(x, y)} = ${product(a1, b2)} - ${product(b1, a2)} = ${D}\), so \(\dfrac{\partial(x, y)}{\partial(u, v)} = ${frac(1, D).tex()}\) and \(dA = ${k.tex()}\,du\,dv\).`,
      R`\(\displaystyle\iint_{R} ${pw(uT, m)}${pw(vT, n)}\,dA = ${k.tex()}\int_{${u[0]}}^{${u[1]}} ${power('u', m)}\,du \int_{${v[0]}}^{${v[1]}} ${power('v', n)}\,dv = ${dot(k, side(u[0], u[1], m), side(v[0], v[1], n))} = ${ans.tex()}\).`,
    ],
    rule: 6,
    skill: 'change of variables',
    check: () => checkEqual(ans.value, overPolygon((x, y) => (a1 * x + b1 * y) ** m * (a2 * x + b2 * y) ** n, [corner(u[0], v[0]), corner(u[1], v[0]), corner(u[1], v[1]), corner(u[0], v[1])]), 1e-5, 'integral over the parallelogram in x and y'),
  });
}

const PARAMS = [
  (rng) => {
    const [a, n, k] = [rng.int(1, 3), rng.int(1, 2), rng.int(1, 6)];
    const mass = frac(4 * k * a ** (n + 3), n + 3);
    const rho = power('\\rho', n);
    return {
      prompt: R`A solid ball of radius ${a} cm has density \(\delta = k${rho}\) g/cm³, where \(\rho\) is the distance from the center and \(k\) is a constant. Its mass is \(${piTex(mass)}\) g. Find \(k\).`,
      ans: k,
      fmt: (v) => R`\(k = ${num(v)}\)`,
      wrong: [
        { value: frac(3 * k, n + 3), why: R`That uses mass = density × volume with the density at the surface. The density changes with \(\rho\), so it has to stay inside the integral.` },
        { value: frac(k * a * a * (n + 1), n + 3), why: R`\(dV = \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\). Without the \(\rho^{2}\) the radial integral is wrong.` },
        2 * k,
        frac(k, 2),
      ],
      solution: [
        R`\(\displaystyle m = \iiint_{E} k${rho}\,dV = ${iter([[0, '2\\pi', '\\theta'], [0, '\\pi', '\\phi'], [0, a, '\\rho']], `k\\rho^{${n + 2}}\\sin\\phi`)}\).`,
        R`\(\displaystyle\int_{0}^{${a}} \rho^{${n + 2}}\,d\rho = ${frac(a ** (n + 3), n + 3).tex()}\), \(\displaystyle\int_{0}^{\pi} \sin\phi\,d\phi = 2\), \(\displaystyle\int_{0}^{2\pi} d\theta = 2\pi\), so \(m = ${piTex(frac(4 * a ** (n + 3), n + 3), 'k\\pi')}\).`,
        R`Set \(${piTex(frac(4 * a ** (n + 3), n + 3), 'k\\pi')} = ${piTex(mass)}\): \(k = ${k}\).`,
      ],
      rule: 5,
      numeric: () => [overCap((x, y, z) => k * Math.hypot(x, y, z) ** n, a, 180), mass.value * PI],
    };
  },
  (rng) => {
    const [a, k, h] = [rng.int(1, 3), rng.pick([1, 2, 3, 4, 6]), rng.int(3, 6)];
    const mass = frac(k * a * a * h * h, 2);
    return {
      prompt: R`A solid cylinder of radius ${a} cm stands on the \(xy\)-plane with the \(z\)-axis as its axis. Its density at height \(z\) is \(\delta = ${terms([[k, 'z']])}\) g/cm³, and its mass is \(${piTex(mass)}\) g. Find its height.`,
      ans: h,
      unit: 'cm',
      wrong: [
        { value: frac(h * h, 2), why: R`That uses mass = density × volume with a constant density \(${k}\). The density depends on \(z\), so it must be integrated: \(\displaystyle\int_{0}^{h} ${terms([[k, 'z']])}\,dz = ${terms([[frac(k, 2), 'h^{2}']])}\).` },
        { value: h * h, why: R`That is \(h^{2}\). Take the square root.` },
        2 * h,
        frac(h, 2),
      ],
      solution: [
        R`With height \(h\): \(\displaystyle m = ${iter([[0, '2\\pi', '\\theta'], [0, a, 'r'], [0, 'h', 'z']], `${cf(k, 'z')}\\,r`)}\).`,
        R`\(\displaystyle\int_{0}^{h} ${cf(k, 'z')}\,dz = ${terms([[frac(k, 2), 'h^{2}']])}\), \(\displaystyle\int_{0}^{${a}} r\,dr = ${frac(a * a, 2).tex()}\), \(\displaystyle\int_{0}^{2\pi} d\theta = 2\pi\), so \(m = ${piTex(frac(k * a * a, 2), '\\pi h^{2}')}\).`,
        R`Set \(${piTex(frac(k * a * a, 2), '\\pi h^{2}')} = ${piTex(mass)}\): \(h^{2} = ${h * h}\), so \(h = ${h}\) cm.`,
      ],
      rule: 5,
      numeric: () => [overDisk((x, y, z) => k * z, a, () => 0, () => h), mass.value * PI],
    };
  },
  (rng) => {
    const a = rng.int(1, 9);
    const big = rng.bool();
    const [ansT, cosT, share] = big ? ['\\frac{2\\pi}{3}', '-\\frac{1}{2}', 'three quarters'] : ['\\frac{\\pi}{3}', '\\frac{1}{2}', 'one quarter'];
    return {
      prompt: R`The part of the solid ball \(\rho \le ${a}\) that lies in \(0 \le \phi \le \alpha\) has exactly ${share} of the ball's volume. Find \(\alpha\).`,
      ans: M(ansT),
      wrong: [
        { value: M(big ? '\\frac{3\\pi}{4}' : '\\frac{\\pi}{4}'), why: R`The volume is not proportional to \(\phi\). Because of the factor \(\sin\phi\) in \(dV\), a slice near the \(z\)-axis is thinner than one near the equator.` },
        M('\\frac{\\pi}{2}'),
        M(big ? '\\frac{5\\pi}{6}' : '\\frac{\\pi}{6}'),
        M(big ? '\\frac{\\pi}{3}' : '\\frac{2\\pi}{3}'),
      ],
      solution: [
        R`\(\displaystyle V(\alpha) = \int_{0}^{2\pi}\int_{0}^{\alpha}\int_{0}^{${a}} \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta = 2\pi \cdot ${frac(a ** 3, 3).tex()} \cdot (1 - \cos\alpha)\).`,
        R`The whole ball is \(\alpha = \pi\), where \(1 - \cos\alpha = 2\). So the share of the volume is \(\dfrac{1 - \cos\alpha}{2}\).`,
        R`\(\dfrac{1 - \cos\alpha}{2} = ${big ? '\\dfrac{3}{4}' : '\\dfrac{1}{4}'}\) gives \(\cos\alpha = ${cosT}\), so \(\alpha = ${ansT}\).`,
      ],
      rule: 3,
      numeric: () => [big ? overCap(() => 1, a, 180) - overCap(() => 1, a, 60) : overCap(() => 1, a, 60), (big ? 0.75 : 0.25) * overCap(() => 1, a, 180)],
    };
  },
];

function challengeFindParameter(rng) {
  const k = rng.pick(PARAMS)(rng);
  return q({
    prompt: k.prompt,
    correct: k.ans,
    fmt: k.fmt,
    unit: k.unit,
    wrong: k.wrong,
    solution: k.solution,
    rule: k.rule,
    skill: 'working back from a mass or volume',
    check: () => {
      const [got, want] = k.numeric();
      return checkEqual(got, want, 1e-3, 'mass or volume with the answer substituted');
    },
  });
}

export default {
  id: 'triple-integrals',
  title: 'Triple Integrals & Coordinate Changes',
  summary: 'Set up and evaluate triple integrals in rectangular, cylindrical and spherical coordinates, and change variables with a Jacobian.',
  standards: ['OpenStax Calculus Vol. 3 §5.4', 'OpenStax Calculus Vol. 3 §5.5', 'OpenStax Calculus Vol. 3 §5.6', 'OpenStax Calculus Vol. 3 §5.7'],

  explain: {
    intro: R`A triple integral \(\iiint_{E} f(x, y, z)\,dV\) adds up a quantity over a solid \(E\): its volume when \(f = 1\), its mass when \(f\) is a density. It is worked out as three single integrals, one inside the next, and the work is lightest in coordinates that match the shape of the solid: rectangular for boxes, cylindrical for solids round an axis, spherical for solids round a point.`,
    rules: [
      { title: 'Triple integrals over a box', text: R`Over a box \(a \le x \le b\), \(c \le y \le d\), \(p \le z \le q\), integrate one variable at a time, in any order (Fubini's theorem), treating the other variables as constants. Each pair of limits belongs to one variable: the innermost integral sign goes with the first differential, the outermost with the last. If the integrand is a product \(g(x)\,h(y)\,k(z)\), the answer is the product of three single integrals.`, example: R`\(\displaystyle\int_{0}^{2}\int_{0}^{3}\int_{0}^{1} 6xy^{2}\,dz\,dy\,dx = 6\left(\int_{0}^{2} x\,dx\right)\left(\int_{0}^{3} y^{2}\,dy\right)\left(\int_{0}^{1} dz\right) = 6 \cdot 2 \cdot 9 \cdot 1 = 108\).` },
      { title: 'General regions', text: R`For a solid that is not a box, the inner limits are the surfaces that bound it, written in terms of the outer variables; the outermost limits are constants: \(\displaystyle\int_{a}^{b}\int_{g_{1}(x)}^{g_{2}(x)}\int_{u_{1}(x, y)}^{u_{2}(x, y)} f\,dz\,dy\,dx\). A limit may contain only variables whose integrals are further out. Changing the order of integration means describing the same solid again, so the limits change. The volume of \(E\) is \(\iiint_{E} 1\,dV\).`, example: R`The tetrahedron cut from the first octant by \(x + y + z = 1\) is \(0 \le x \le 1\), \(0 \le y \le 1 - x\), \(0 \le z \le 1 - x - y\), so its volume is \(\displaystyle\int_{0}^{1}\int_{0}^{1-x}\int_{0}^{1-x-y} dz\,dy\,dx = \frac{1}{6}\).` },
      { title: 'Cylindrical coordinates', text: R`Cylindrical coordinates \((r, \theta, z)\) are polar coordinates in the \(xy\)-plane with \(z\) unchanged: \(x = r\cos\theta\), \(y = r\sin\theta\), \(x^{2} + y^{2} = r^{2}\). The volume element is \(dV = r\,dz\,dr\,d\theta\), with an extra factor \(r\). Use them when the solid or the integrand involves \(x^{2} + y^{2}\): cylinders, cones, paraboloids.`, example: R`Over the solid cylinder \(x^{2} + y^{2} \le 4\), \(0 \le z \le 3\): \(\displaystyle\iiint_{E} (x^{2} + y^{2})\,dV = \int_{0}^{2\pi}\int_{0}^{2}\int_{0}^{3} r^{2} \cdot r\,dz\,dr\,d\theta = 2\pi \cdot 4 \cdot 3 = 24\pi\).` },
      { title: 'Spherical coordinates', text: R`In spherical coordinates \((\rho, \theta, \phi)\), \(\rho\) is the distance from the origin, \(\theta\) is the same angle as in cylindrical coordinates, and \(\phi\) is the angle down from the positive \(z\)-axis, \(0 \le \phi \le \pi\). Then \(x = \rho\sin\phi\cos\theta\), \(y = \rho\sin\phi\sin\theta\), \(z = \rho\cos\phi\) and \(x^{2} + y^{2} + z^{2} = \rho^{2}\). The volume element is \(dV = \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\).`, example: R`A ball of radius \(a\): \(\displaystyle V = \int_{0}^{2\pi}\int_{0}^{\pi}\int_{0}^{a} \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta = 2\pi \cdot 2 \cdot \frac{a^{3}}{3} = \frac{4}{3}\pi a^{3}\).` },
      { title: 'Choosing a coordinate system', text: R`Choose the coordinates in which the bounding surfaces have the simplest equations, so that as many limits as possible are constants. In cylindrical coordinates \(r = c\) is a cylinder, \(\theta = c\) a half-plane and \(z = r\) a cone. In spherical coordinates \(\rho = c\) is a sphere and \(\phi = c\) a cone: the cone \(z = \sqrt{x^{2} + y^{2}}\) is \(\phi = \frac{\pi}{4}\), and the upper half-space \(z \ge 0\) is \(0 \le \phi \le \frac{\pi}{2}\).`, example: R`The solid inside the sphere \(x^{2} + y^{2} + z^{2} = 9\) and above the cone \(z = \sqrt{x^{2} + y^{2}}\) is simply \(0 \le \rho \le 3\), \(0 \le \phi \le \frac{\pi}{4}\), \(0 \le \theta \le 2\pi\).` },
      { title: 'Mass and center of mass', text: R`A solid with density \(\delta(x, y, z)\) has mass \(m = \iiint_{E} \delta\,dV\). Its center of mass \((\bar{x}, \bar{y}, \bar{z})\) is the average position weighted by density: \(\bar{x} = \dfrac{1}{m}\iiint_{E} x\,\delta\,dV\), and likewise for \(\bar{y}\) and \(\bar{z}\). The integrals \(M_{yz} = \iiint x\,\delta\,dV\), \(M_{xz} = \iiint y\,\delta\,dV\) and \(M_{xy} = \iiint z\,\delta\,dV\) are called moments. Symmetry of the solid and its density often gives a coordinate without any integration.`, example: R`A solid hemisphere of radius \(a\) with constant density, resting on the \(xy\)-plane, has \(\bar{x} = \bar{y} = 0\) by symmetry and \(\bar{z} = \dfrac{3a}{8}\).` },
      { title: 'Change of variables and the Jacobian', text: R`A transformation \(x = x(u, v)\), \(y = y(u, v)\) carries a region \(S\) of the \(uv\)-plane onto a region \(R\) of the \(xy\)-plane. Its Jacobian is \(\dfrac{\partial(x, y)}{\partial(u, v)} = \dfrac{\partial x}{\partial u}\dfrac{\partial y}{\partial v} - \dfrac{\partial x}{\partial v}\dfrac{\partial y}{\partial u}\), and \(\displaystyle\iint_{R} f(x, y)\,dA = \iint_{S} f\big(x(u, v), y(u, v)\big)\left|\frac{\partial(x, y)}{\partial(u, v)}\right| du\,dv\). The absolute value of the Jacobian is the factor by which areas are stretched. When \(u\) and \(v\) are given in terms of \(x\) and \(y\), use \(\dfrac{\partial(x, y)}{\partial(u, v)} = 1 \Big/ \dfrac{\partial(u, v)}{\partial(x, y)}\). The factors \(r\) and \(\rho^{2}\sin\phi\) are the Jacobians of cylindrical and spherical coordinates.`, example: R`For \(u = x + y\), \(v = x - y\): \(\dfrac{\partial(u, v)}{\partial(x, y)} = (1)(-1) - (1)(1) = -2\), so \(dA = \frac{1}{2}\,du\,dv\).` },
    ],
    vocab: [
      { term: 'iterated integral', def: 'Single integrals nested inside one another, worked from the inside out.' },
      { term: 'volume element', def: R`The small piece of volume \(dV\): \(dz\,dy\,dx\) in rectangular, \(r\,dz\,dr\,d\theta\) in cylindrical and \(\rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\) in spherical coordinates.` },
      { term: 'center of mass', def: 'The balance point of a solid: the average position of its points, weighted by density.' },
      { term: 'Jacobian', def: R`The determinant of the partial derivatives of a transformation. Its absolute value is the local stretching factor for area or volume.` },
    ],
    mistakes: [
      R`Leaving out the factor \(r\) in cylindrical coordinates, or \(\rho^{2}\sin\phi\) in spherical coordinates.`,
      R`Letting \(\phi\) run to \(2\pi\). It is measured from the positive \(z\)-axis and stops at \(\pi\); it is \(\theta\) that goes all the way round.`,
      'Writing outer limits that contain a variable. Only inner limits may depend on outer variables.',
      R`Reading a radius off an equation without the square root: \(x^{2} + y^{2} = 9\) is \(r = 3\), not \(r = 9\).`,
      R`Using \(\dfrac{\partial(u, v)}{\partial(x, y)}\) where its reciprocal is needed, or forgetting the absolute value of the Jacobian.`,
    ],
    visual: {
      type: 'plot',
      x: [-0.6, 4.6],
      y: [-0.6, 4.6],
      square: true,
      axisLabels: ['r', 'z'],
      fns: [{ f: (x) => Math.sqrt(1 - x * x), domain: [0, 0.6], label: 'φ', labelAt: 0.3, color: 'c' }],
      segments: [
        { from: [0, 0], to: [3, 4], label: 'ρ', color: 'a' },
        { from: [0, 4], to: [3, 4], dashed: true, label: 'r = ρ sin φ', color: 'b' },
        { from: [3, 0], to: [3, 4], dashed: true, label: 'z = ρ cos φ', color: 'b' },
      ],
      points: [{ x: 3, y: 4, label: 'P' }],
      alt: 'A point P drawn in the half-plane that contains it and the z-axis, with r on the horizontal axis and z on the vertical axis. The segment from the origin to P has length ρ and makes the angle φ with the positive z-axis, so r = ρ sin φ and z = ρ cos φ.',
    },
  },

  examples: [
    {
      title: 'A triple integral over a tetrahedron',
      problem: R`Evaluate \(\displaystyle\iiint_{E} z\,dV\), where \(E\) is the tetrahedron bounded by the coordinate planes and the plane \(x + y + z = 2\).`,
      steps: [
        R`Describe \(E\): \(x\) runs from \(0\) to \(2\); for a fixed \(x\), \(y\) runs from \(0\) to \(2 - x\); for fixed \(x\) and \(y\), \(z\) runs from \(0\) up to the plane, \(z = 2 - x - y\).`,
        R`\(\displaystyle\iiint_{E} z\,dV = \int_{0}^{2}\int_{0}^{2-x}\int_{0}^{2-x-y} z\,dz\,dy\,dx\).`,
        R`Inner integral: \(\displaystyle\int_{0}^{2-x-y} z\,dz = \tfrac{1}{2}(2 - x - y)^{2}\).`,
        R`Middle integral: \(\displaystyle\int_{0}^{2-x} \tfrac{1}{2}(2 - x - y)^{2}\,dy = \tfrac{1}{6}(2 - x)^{3}\).`,
        R`Outer integral: \(\displaystyle\int_{0}^{2} \tfrac{1}{6}(2 - x)^{3}\,dx = \tfrac{1}{24}(2)^{4} = \tfrac{2}{3}\).`,
      ],
      answer: R`\(\dfrac{2}{3}\)`,
    },
    {
      title: 'A volume in cylindrical coordinates',
      problem: R`Find the volume of the solid under the paraboloid \(z = 4 - x^{2} - y^{2}\) and above the \(xy\)-plane.`,
      steps: [
        R`The surface involves \(x^{2} + y^{2}\), so use cylindrical coordinates: \(z = 4 - r^{2}\).`,
        R`The paraboloid meets the \(xy\)-plane where \(4 - r^{2} = 0\), so \(0 \le r \le 2\), with \(0 \le \theta \le 2\pi\) and \(0 \le z \le 4 - r^{2}\).`,
        R`\(\displaystyle V = \int_{0}^{2\pi}\int_{0}^{2}\int_{0}^{4-r^{2}} r\,dz\,dr\,d\theta = \int_{0}^{2\pi}\int_{0}^{2} (4r - r^{3})\,dr\,d\theta\).`,
        R`\(\displaystyle\int_{0}^{2} (4r - r^{3})\,dr = 8 - 4 = 4\), and the \(\theta\)-integral multiplies by \(2\pi\).`,
      ],
      answer: R`\(V = 8\pi\)`,
    },
    {
      title: 'A cone inside a sphere, in spherical coordinates',
      problem: R`Find the volume of the solid inside the sphere \(x^{2} + y^{2} + z^{2} = 4\) and above the cone \(z = \sqrt{x^{2} + y^{2}}\).`,
      steps: [
        R`The sphere is \(\rho = 2\). On the cone \(\rho\cos\phi = \rho\sin\phi\), so \(\tan\phi = 1\) and \(\phi = \frac{\pi}{4}\).`,
        R`The solid is \(0 \le \rho \le 2\), \(0 \le \phi \le \frac{\pi}{4}\), \(0 \le \theta \le 2\pi\).`,
        R`\(\displaystyle V = \int_{0}^{2\pi}\int_{0}^{\pi/4}\int_{0}^{2} \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\).`,
        R`\(\displaystyle\int_{0}^{2} \rho^{2}\,d\rho = \frac{8}{3}\) and \(\displaystyle\int_{0}^{\pi/4} \sin\phi\,d\phi = 1 - \frac{\sqrt{2}}{2}\).`,
        R`\(V = 2\pi \cdot \dfrac{8}{3}\left(1 - \dfrac{\sqrt{2}}{2}\right) = \dfrac{8\pi}{3}\left(2 - \sqrt{2}\right)\).`,
      ],
      answer: R`\(V = \dfrac{8\pi}{3}\left(2 - \sqrt{2}\right) \approx 4.91\)`,
    },
    {
      title: 'Word problem: where does a paperweight balance?',
      word: true,
      problem: R`A glass paperweight is a solid hemisphere of radius 4 cm with constant density, resting on its flat face. How high above the table is its center of mass?`,
      steps: [
        R`Put the flat face on the \(xy\)-plane. By symmetry the center of mass is on the \(z\)-axis, and because the density is constant, \(\bar{z} = \dfrac{1}{V}\displaystyle\iiint_{E} z\,dV\).`,
        R`Volume of the hemisphere: \(V = \frac{2}{3}\pi(4)^{3} = \frac{128\pi}{3}\) cm³.`,
        R`In spherical coordinates \(z = \rho\cos\phi\) and \(E\) is \(0 \le \rho \le 4\), \(0 \le \phi \le \frac{\pi}{2}\), \(0 \le \theta \le 2\pi\): \(\displaystyle\iiint_{E} z\,dV = \int_{0}^{2\pi}\int_{0}^{\pi/2}\int_{0}^{4} \rho^{3}\cos\phi\sin\phi\,d\rho\,d\phi\,d\theta = 2\pi \cdot \frac{1}{2} \cdot 64 = 64\pi\).`,
        R`\(\bar{z} = \dfrac{64\pi}{128\pi/3} = \dfrac{3}{2}\).`,
      ],
      answer: R`1.5 cm above the table, which is \(\frac{3}{8}\) of the radius`,
    },
    {
      title: 'Changing variables over a parallelogram',
      problem: R`Evaluate \(\displaystyle\iint_{R} (x + y)^{2}(x - y)\,dA\), where \(R\) is the parallelogram bounded by \(x + y = 0\), \(x + y = 2\), \(x - y = 0\) and \(x - y = 3\).`,
      steps: [
        R`Let \(u = x + y\) and \(v = x - y\). Then \(R\) becomes the rectangle \(0 \le u \le 2\), \(0 \le v \le 3\), and the integrand becomes \(u^{2}v\).`,
        R`\(\dfrac{\partial(u, v)}{\partial(x, y)} = (1)(-1) - (1)(1) = -2\), so \(\dfrac{\partial(x, y)}{\partial(u, v)} = -\dfrac{1}{2}\) and \(dA = \dfrac{1}{2}\,du\,dv\).`,
        R`\(\displaystyle\iint_{R} (x + y)^{2}(x - y)\,dA = \frac{1}{2}\int_{0}^{2} u^{2}\,du\int_{0}^{3} v\,dv = \frac{1}{2} \cdot \frac{8}{3} \cdot \frac{9}{2}\).`,
      ],
      answer: R`\(6\)`,
    },
  ],

  models: [
    {
      id: 'cone-in-sphere',
      title: 'Volume inside a sphere and a cone',
      intro: 'Choose the radius of the sphere and the angle φ that the cone makes with the positive z-axis.',
      inputs: [
        { name: 'a', label: 'Radius of the sphere', type: 'int', min: 1, max: 6, value: 2 },
        { name: 'deg', label: 'Cone angle φ', type: 'select', value: 45, options: [30, 45, 60, 90, 120, 150, 180].map((d) => ({ value: d, label: `${d}°` })) },
      ],
      compute({ a, deg }) {
        const [k, rad] = exactCos(deg); // cos φ = k·√rad / 2
        const [phi, cosT] = [angleTex(deg), rootOver(k, rad, 2)];
        const t = (deg * PI) / 180;
        const V = ((2 * PI) / 3) * a ** 3 * (1 - Math.cos(t));
        const cube = frac(a ** 3, 3);
        const factor = rad === 1 ? frac(2 - k, 2).tex() : `\\frac{2 ${k < 0 ? '+' : '-'} \\sqrt{${rad}}}{2}`;
        const exact = rad === 1 ? piTex(cube.mul(2 - k)) : `${piTex(cube)}\\left(2 ${k < 0 ? '+' : '-'} \\sqrt{${rad}}\\right)`;
        const arc = Array.from({ length: 49 }, (_, i) => [a * Math.sin(-t + (t * i) / 24), a * Math.cos(-t + (t * i) / 24)]);
        return {
          problem: R`Find the volume of the part of the ball \(\rho \le ${a}\) with \(0 \le \phi \le ${phi}\)${deg < 90 ? ' (the solid inside the sphere and above the cone)' : ''}.`,
          steps: [
            R`In spherical coordinates the solid is \(0 \le \rho \le ${a}\), \(0 \le \phi \le ${phi}\), \(0 \le \theta \le 2\pi\).`,
            R`\(\displaystyle V = \int_{0}^{2\pi}\int_{0}^{${phi}}\int_{0}^{${a}} \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\).`,
            R`\(\displaystyle\int_{0}^{${a}} \rho^{2}\,d\rho = ${cube.tex()}\).`,
            R`\(\displaystyle\int_{0}^{${phi}} \sin\phi\,d\phi = \cos 0 - \cos ${phi} = 1 - ${cosT.startsWith('-') ? `\\left(${cosT}\\right)` : cosT} = ${factor}\).`,
            R`Multiply by \(\displaystyle\int_{0}^{2\pi} d\theta = 2\pi\): \(V = ${dot('2\\pi', cube, factor)} = ${exact}\).`,
          ],
          answer: R`\(V = ${exact} \approx ${num(V, { places: 2 })}\)`,
          note: `That is ${num(50 * (1 - Math.cos(t)), { places: 1 })}% of the whole ball.`,
          visual: {
            type: 'plot',
            x: [-a - 0.5, a + 0.5],
            y: [-a - 0.5, a + 0.5],
            square: true,
            axisLabels: ['x', 'z'],
            param: [{ x: (s) => a * Math.cos(s), y: (s) => a * Math.sin(s), t: [0, 2 * PI], dashed: true }],
            polygons: [{ points: deg === 180 ? arc : [[0, 0], ...arc], color: 'a' }],
            alt: `Cross-section of the solid in the xz-plane: the part of the disk of radius ${a} that lies within ${deg} degrees of the positive z-axis is shaded.`,
          },
        };
      },
    },
    {
      id: 'silo-mass',
      title: 'Word problem: mass and center of mass of grain in a silo',
      word: true,
      intro: 'Grain packs more tightly lower down. Choose the size of the silo and how the density changes with height.',
      inputs: [
        { name: 'rad', label: 'Radius of the silo (m)', type: 'int', min: 1, max: 5, value: 2 },
        { name: 'h', label: 'Depth of the grain (m)', type: 'int', min: 2, max: 12, value: 6 },
        { name: 'd0', label: 'Density at the floor (kg/m³)', type: 'number', min: 400, max: 900, step: 50, value: 800 },
        { name: 'c', label: 'Drop in density per meter of height', type: 'number', min: 0, max: 30, step: 5, value: 20 },
      ],
      compute({ rad, h, d0, c }) {
        const [D, C] = [Math.round(d0), Math.round(c)];
        const dT = terms([[D, ''], [-C, 'z']]);
        const mass = frac(rad * rad * (2 * D * h - C * h * h), 2); // multiple of π
        const moment = frac(rad * rad * (3 * D * h * h - 2 * C * h ** 3), 6);
        const zbar = moment.div(mass).value;
        const floor = piTex(rad * rad);
        const n = (f) => (f.isInt() ? num(f.value) : f.tex());
        const bracket = (first, second) => (C ? `\\left(${n(first)} - ${n(second)}\\right)` : ` \\cdot ${n(first)}`);
        return {
          problem: R`Grain fills a cylindrical silo of radius ${rad} m to a depth of ${h} m. Its density at height \(z\) above the floor is \(\delta(z) = ${dT}\) kg/m³. Find the mass of the grain and the height of its center of mass.`,
          steps: [
            R`Use cylindrical coordinates: \(0 \le r \le ${rad}\), \(0 \le \theta \le 2\pi\), \(0 \le z \le ${h}\), with \(dV = r\,dz\,dr\,d\theta\).`,
            R`The density depends only on \(z\), so the \(r\)- and \(\theta\)-integrals give the area of the floor: \(\displaystyle\int_{0}^{2\pi}\int_{0}^{${rad}} r\,dr\,d\theta = ${floor}\).`,
            R`Mass: \(\displaystyle m = ${floor}\int_{0}^{${h}} ${wrapSum(dT)}\,dz = ${floor}${bracket(frac(D * h), frac(C * h * h, 2))} \approx ${num(mass.value * PI, { places: 0 })}\) kg.`,
            R`Moment about the floor: \(\displaystyle M_{xy} = ${floor}\int_{0}^{${h}} z${C ? `\\left(${dT}\\right)` : ` \\cdot ${D}`}\,dz = ${floor}${bracket(frac(D * h * h, 2), frac(C * h ** 3, 3))} \approx ${num(moment.value * PI, { places: 0 })}\) kg·m.`,
            R`\(\bar{z} = \dfrac{M_{xy}}{m} \approx ${num(zbar, { places: 2 })}\) m. ${C ? `That is below the halfway height of ${num(h / 2)} m, because the denser grain is at the bottom.` : 'With constant density the center of mass is exactly halfway up.'}`,
          ],
          answer: R`Mass \(\approx ${num(mass.value * PI, { places: 0 })}\) kg; center of mass \(\approx ${num(zbar, { places: 2 })}\) m above the floor`,
          visual: {
            type: 'plot',
            ...squareWindow([[-rad, 0], [rad, h]], 1),
            axisLabels: ['x', 'z'],
            polygons: [{ points: [[-rad, 0], [rad, 0], [rad, h], [-rad, h]], color: 'a' }],
            points: [{ x: 0, y: zbar, label: 'center of mass', color: 'b' }, { x: 0, y: h / 2, label: 'halfway', open: true }],
            alt: `Side view of the grain: a rectangle ${2 * rad} meters wide and ${h} meters tall. The center of mass is marked on the axis at a height of about ${num(zbar, { places: 2 })} meters; the halfway height is ${num(h / 2)} meters.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyBoxIntegral, easyIteratedConst, easyDescribeSolid],
    medium: [mediumGeneralRegion, mediumSetup, mediumCylindrical],
    hard: [hardSpherical, hardCenterOfMass, hardSetupCurved, hardJacobian],
    challenge: [challengeChangeOrder, challengeChangeOfVariables, challengeFindParameter],
  },
};
