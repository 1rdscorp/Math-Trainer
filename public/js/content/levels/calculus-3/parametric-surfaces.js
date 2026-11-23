import { R, q, frac, Frac, num, terms, paren, dot, simplifySqrt, person, close, checkEqual, integrate2 } from '../../lib/index.js';
import { M, V, Pt, piTex, exactCos, exactSin, rootOver, angleTex, vcross, vdot, vsub, vadd, vscale, isZero, parallel, normPlane, planeTex, samePlane, mpTex, mpEval, mpD, surfNormal, surfInt, vlen } from './_shared.js';

const PI = Math.PI;
const TAU = 2 * PI;
const cf = (n, s) => (n === 1 ? s : n === -1 ? `-${s}` : `${n}${s}`);
const uv = (p) => mpTex(p, ['u', 'v']);
const near = (a, b) => close(a, b, 1e-7);
const at = (P, Q) => P.every((x, i) => Math.abs(x - Q[i]) < 1e-6 * Math.max(1, Math.abs(Q[i])));
const ang = (deg) => (deg * PI) / 180;
/** a·cos(deg) and a·sin(deg) as LaTeX. */
const aCos = (a, deg) => { const [k, r] = exactCos(deg); return rootOver(a * k, r, 2); };
const aSin = (a, deg) => { const [k, r] = exactSin(deg); return rootOver(a * k, r, 2); };
const mod360 = (d) => ((d % 360) + 360) % 360;
/** Points of a parameter box, for checks. */
const SPOTS = [[0.23, 0.61], [0.71, 0.18], [0.47, 0.89], [0.92, 0.37], [0.11, 0.05]];
const spots = ([u0, u1, v0, v1]) => SPOTS.map(([s, t]) => [u0 + s * (u1 - u0), v0 + t * (v1 - v0)]);
/** c·√n·π as LaTeX (c a Frac or integer). */
function rootPi(c, n) {
  const { coef, rad } = simplifySqrt(n);
  const k = Frac.from(c).mul(coef);
  if (rad === 1) return piTex(k);
  const top = `${Math.abs(k.n) === 1 ? '' : Math.abs(k.n)}\\sqrt{${rad}}\\,\\pi`;
  return `${k.n < 0 ? '-' : ''}${k.d === 1 ? top : `\\frac{${top}}{${k.d}}`}`;
}
/** For checks: the wrong candidates q() actually showed. */
const shown = (question, cands, strOf) => cands.filter((c) => c && question.choices.indexOf(strOf(c)) > 0);
const sphere = (a) => (u, v) => [a * Math.sin(u) * Math.cos(v), a * Math.sin(u) * Math.sin(v), a * Math.cos(u)];
const SPH = (a) => V([cf(a, '\\sin u\\cos v'), cf(a, '\\sin u\\sin v'), cf(a, '\\cos u')]);
const AX = ['x', 'y', 'z'];
const sq2 = (i, j) => `${AX[i]}^{2} + ${AX[j]}^{2}`;
const rVec = (tex) => M(`\\mathbf{r}(u, v) = ${tex}`);

// ───────────── Easy ─────────────

/** A parametrized surface with its implicit description and wrong descriptions: [text, test(P), why?, missPoint?]. */
function identifyCase(rng) {
  const a = rng.int(2, 5);
  const kind = rng.pick(['cyl', 'cyl', 'sph', 'hemi', 'cone', 'para', 'plane', 'rev']);
  if (kind === 'cyl') {
    const k = rng.int(0, 2);
    const [i, j] = [0, 1, 2].filter((t) => t !== k);
    const c = [];
    [c[k], c[i], c[j]] = ['v', cf(a, '\\cos u'), cf(a, '\\sin u')];
    const o = (k + 1) % 3;
    const [i2, j2] = [0, 1, 2].filter((t) => t !== o);
    return {
      tex: V(c), dom: R`\(0 \le u \le 2\pi\), \(v\) any real number`, fn: (u, v) => { const P = []; [P[k], P[i], P[j]] = [v, a * Math.cos(u), a * Math.sin(u)]; return P; }, box: [0, TAU, -3, 3],
      right: [R`the cylinder \(${sq2(i, j)} = ${a * a}\)`, (P) => near(P[i] ** 2 + P[j] ** 2, a * a)],
      wrong: [
        [R`the cylinder \(${sq2(i2, j2)} = ${a * a}\)`, (P) => near(P[i2] ** 2 + P[j2] ** 2, a * a), R`\(${AX[k]} = v\) is free, so the axis of the cylinder is the \(${AX[k]}\)-axis: \(${sq2(i, j)} = ${a * a}(\cos^{2} u + \sin^{2} u)\).`],
        [R`the cylinder \(${sq2(i, j)} = ${a}\)`, (P) => near(P[i] ** 2 + P[j] ** 2, a), R`Square the radius: \(${sq2(i, j)} = ${a}^{2}\).`],
        [R`the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, (P) => near(P[0] ** 2 + P[1] ** 2 + P[2] ** 2, a * a)],
        [R`the cone \(${AX[k]}^{2} = ${sq2(i, j)}\)`, (P) => near(P[k] ** 2, P[i] ** 2 + P[j] ** 2)],
      ],
    };
  }
  if (kind === 'sph' || kind === 'hemi') {
    const hemi = kind === 'hemi';
    const S = (P) => near(P[0] ** 2 + P[1] ** 2 + P[2] ** 2, a * a);
    const half = [R`the upper half \((z \ge 0)\) of the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, (P) => S(P) && P[2] >= -1e-9];
    const whole = [R`the whole sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, S, R`With \(0 \le u \le \frac{\pi}{2}\), \(z = ${cf(a, '\\cos u')} \ge 0\): only the upper half is covered.`, [0, 0, -a]];
    return {
      tex: SPH(a), dom: hemi ? R`\(0 \le u \le \frac{\pi}{2}\), \(0 \le v \le 2\pi\)` : R`\(0 \le u \le \pi\), \(0 \le v \le 2\pi\)`, fn: sphere(a), box: [0, hemi ? PI / 2 : PI, 0, TAU],
      right: hemi ? half : [R`the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, S],
      wrong: [
        hemi ? whole : [R`the upper half \((z \ge 0)\) of the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, half[1], R`\(u\) runs to \(\pi\), so \(z = ${cf(a, '\\cos u')}\) takes every value from \(${a}\) down to \(${-a}\).`],
        [R`the ${hemi ? 'upper half \\((z \\ge 0)\\) of the ' : ''}sphere \(x^{2} + y^{2} + z^{2} = ${a}\)`, (P) => near(P[0] ** 2 + P[1] ** 2 + P[2] ** 2, a), R`\(x^{2} + y^{2} + z^{2} = ${a * a}(\sin^{2} u + \cos^{2} u) = ${a * a}\): square the radius.`],
        [R`the cylinder \(x^{2} + y^{2} = ${a * a}\)`, (P) => near(P[0] ** 2 + P[1] ** 2, a * a), R`\(x^{2} + y^{2} = ${a * a}\sin^{2} u\) changes with \(u\); add \(z^{2}\) to get a constant.`],
        hemi ? [R`the lower half \((z \le 0)\) of the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, (P) => S(P) && P[2] <= 1e-9] : null,
      ].filter(Boolean),
    };
  }
  if (kind === 'cone') {
    const m = rng.int(1, 3);
    const mm = m === 1 ? '' : m;
    return {
      tex: V(['v\\cos u', 'v\\sin u', cf(m, 'v')]), dom: R`\(0 \le u \le 2\pi\), \(v \ge 0\)`, fn: (u, v) => [v * Math.cos(u), v * Math.sin(u), m * v], box: [0, TAU, 0, 3],
      right: [R`the cone \(z = ${mm}\sqrt{x^{2} + y^{2}}\)`, (P) => near(P[2], m * Math.hypot(P[0], P[1]))],
      wrong: [
        [R`the paraboloid \(z = ${m === 1 ? 'x^{2} + y^{2}' : `${m}(x^{2} + y^{2})`}\)`, (P) => near(P[2], m * (P[0] ** 2 + P[1] ** 2)), R`\(\sqrt{x^{2} + y^{2}} = v\), and \(z = ${cf(m, 'v')}\) is a multiple of \(v\), not of \(v^{2}\).`],
        [R`the cylinder \(x^{2} + y^{2} = ${m * m}\)`, (P) => near(P[0] ** 2 + P[1] ** 2, m * m), R`The distance from the \(z\)-axis is \(v\), which varies; the surface is not a cylinder.`],
        m > 1 ? [R`the cone \(z = \frac{1}{${m}}\sqrt{x^{2} + y^{2}}\)`, (P) => near(m * P[2], Math.hypot(P[0], P[1]))] : null,
        [R`the cone \(x = ${mm}\sqrt{y^{2} + z^{2}}\)`, (P) => near(P[0], m * Math.hypot(P[1], P[2]))],
      ].filter(Boolean),
    };
  }
  if (kind === 'para') {
    const c = rng.int(1, 3);
    const polar = rng.bool();
    const rhs = c === 1 ? 'x^{2} + y^{2}' : `${c}(x^{2} + y^{2})`;
    return {
      tex: polar ? V(['v\\cos u', 'v\\sin u', cf(c, 'v^{2}')]) : V(['u', 'v', c === 1 ? 'u^{2} + v^{2}' : `${c}(u^{2} + v^{2})`]),
      dom: polar ? R`\(0 \le u \le 2\pi\), \(v \ge 0\)` : R`\(u\) and \(v\) any real numbers`,
      fn: polar ? (u, v) => [v * Math.cos(u), v * Math.sin(u), c * v * v] : (u, v) => [u, v, c * (u * u + v * v)], box: polar ? [0, TAU, 0, 3] : [-2, 2, -2, 2],
      right: [R`the paraboloid \(z = ${rhs}\)`, (P) => near(P[2], c * (P[0] ** 2 + P[1] ** 2))],
      wrong: [
        [R`the cone \(z = ${c === 1 ? '' : c}\sqrt{x^{2} + y^{2}}\)`, (P) => near(P[2], c * Math.hypot(P[0], P[1])), R`\(z\) grows with the square of the distance from the \(z\)-axis, so the surface is a paraboloid.`],
        [R`the paraboloid \(x = ${c === 1 ? 'y^{2} + z^{2}' : `${c}(y^{2} + z^{2})`}\)`, (P) => near(P[0], c * (P[1] ** 2 + P[2] ** 2))],
        [R`the saddle \(z = ${c === 1 ? 'x^{2} - y^{2}' : `${c}(x^{2} - y^{2})`}\)`, (P) => near(P[2], c * (P[0] ** 2 - P[1] ** 2))],
        [R`the sphere \(x^{2} + y^{2} + z^{2} = ${c * c}\)`, (P) => near(P[0] ** 2 + P[1] ** 2 + P[2] ** 2, c * c)],
      ],
    };
  }
  if (kind === 'plane') {
    const [p, b, d] = [rng.nonzero(-4, 4), rng.nonzero(-4, 4), rng.int(-6, 6)];
    const pl = (n, e) => [R`the plane \(${planeTex(n, e)}\)`, (P) => near(vdot(n, P), e)];
    return {
      tex: V(['u', 'v', terms([[d, ''], [-p, 'u'], [-b, 'v']])]), dom: R`\(u\) and \(v\) any real numbers`, fn: (u, v) => [u, v, d - p * u - b * v], box: [-2, 2, -2, 2],
      right: pl([p, b, 1], d),
      wrong: [
        [...pl([-p, -b, 1], d), R`Move the \(x\)- and \(y\)-terms across: \(z = ${terms([[d, ''], [-p, 'x'], [-b, 'y']])}\) becomes \(${planeTex([p, b, 1], d)}\).`],
        pl([p, b, 1], -d),
        pl([p, b, -1], d),
        d ? pl([p, b, 0], d) : null,
      ].filter(Boolean),
    };
  }
  // A surface of revolution.
  const F = rng.pick([
    { t: 'x^{2}', u: 'u^{2}', f: (x) => x * x, lo: 0.2 },
    { t: '\\sqrt{x}', u: '\\sqrt{u}', f: Math.sqrt, lo: 0.2, pos: true },
    { t: 'e^{x}', u: 'e^{u}', f: Math.exp, lo: -1 },
    { t: 'x^{3}', u: 'u^{3}', f: (x) => x ** 3, lo: 0.2 },
  ]);
  return {
    tex: V(['u', `${F.u}\\cos v`, `${F.u}\\sin v`]), dom: F.pos ? R`\(u \ge 0\), \(0 \le v \le 2\pi\)` : R`\(u\) any real number, \(0 \le v \le 2\pi\)`,
    fn: (u, v) => [u, F.f(u) * Math.cos(v), F.f(u) * Math.sin(v)], box: [F.lo, 1.8, 0, TAU],
    right: [R`the surface made by rotating the curve \(y = ${F.t}\) about the \(x\)-axis`, (P) => near(P[1] ** 2 + P[2] ** 2, F.f(P[0]) ** 2)],
    wrong: [
      [R`the surface made by rotating the curve \(y = ${F.t}\) about the \(y\)-axis`, (P) => near(P[1], F.f(Math.hypot(P[0], P[2]))), R`\(x = u\) is left alone while \(y\) and \(z\) go around a circle of radius \(${F.u}\): the axis of rotation is the \(x\)-axis.`],
      [R`the surface made by rotating the curve \(z = ${F.t}\) about the \(z\)-axis`, (P) => near(P[2], F.f(Math.hypot(P[0], P[1])))],
      [R`the surface made by rotating the curve \(x = ${F.t.replace('x', 'y')}\) about the \(x\)-axis`, (P) => near(P[0], F.f(Math.hypot(P[1], P[2])))],
    ],
  };
}

/** Does the parametrization miss the point W? (grid search for checks) */
function misses(fn, box, W, tol) {
  for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) {
    const P = fn(box[0] + (i / 60) * (box[1] - box[0]), box[2] + (j / 60) * (box[3] - box[2]));
    if (Math.hypot(...vsub(P, W)) < tol) return false;
  }
  return true;
}

function easyIdentifySurface(rng) {
  const k = identifyCase(rng);
  const question = q({
    prompt: R`Which surface does \(\mathbf{r}(u, v) = ${k.tex}\), ${k.dom}, describe?`,
    correct: k.right[0],
    wrong: k.wrong.map(([t, , why]) => (why ? { value: t, why } : t)),
    solution: [
      R`Write \(x\), \(y\) and \(z\) from the components of \(\mathbf{r}\) and look for an equation in \(x\), \(y\), \(z\) alone that every point satisfies.`,
      R`Here the points satisfy the equation of ${k.right[0]}, and the parameter domain covers all of it.`,
      R`So \(\mathbf{r}\) describes ${k.right[0]}.`,
    ],
    rule: 0,
    skill: 'identifying a surface',
    check: () => {
      const pts = spots(k.box).map(([u, v]) => k.fn(u, v));
      if (!pts.every(k.right[1])) return 'a point of r does not satisfy the right description';
      for (const w of shown(question, k.wrong, (c) => c[0])) {
        const fails = pts.some((P) => !w[1](P));
        if (!fails && !(w[3] && w[1](w[3]) && misses(k.fn, k.box, w[3], 0.3))) return `the wrong choice also fits: ${w[0]}`;
      }
      return true;
    },
  });
  return question;
}

function easyFindParameters(rng) {
  const kind = rng.pick(['plane', 'cyl', 'sph', 'which']);
  const pair = (s, t) => M(`(u, v) = (${s}, ${t})`);
  if (kind === 'which') {
    const m = rng.int(1, 3);
    const [p, s, h] = rng.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [6, 8, 10], [8, 6, 10], [0, 2, 2], [1, 0, 1], [0, 3, 3]]);
    const [x, y] = [p * rng.sign() || 0, s * rng.sign() || 0];
    const on = (P) => P[2] >= 0 && near(P[2], m * Math.hypot(P[0], P[1]));
    const cands = [
      [[x, y, m * h]],
      [[x, y, m * (Math.abs(x) + Math.abs(y))], R`On this surface \(v = \sqrt{x^{2} + y^{2}}\), not \(|x| + |y|\).`],
      [[x, y, -m * h], R`\(z = ${cf(m, 'v')}\) with \(v \ge 0\), so every point has \(z \ge 0\).`],
      m > 1 ? [[x, y, h], R`\(z = ${cf(m, 'v')}\): the factor \(${m}\) is missing.`] : [[x, y, h * h]],
      [[x, y, m * h * h]],
      [[m * h, y, x]],
    ].filter((c) => c[0].every(Number.isFinite));
    const ok = cands.slice(1).filter((c) => !on(c[0]));
    const question = q({
      prompt: R`Which point lies on the surface \(\mathbf{r}(u, v) = ${V(['v\\cos u', 'v\\sin u', cf(m, 'v')])}\), \(0 \le u \le 2\pi\), \(v \ge 0\)?`,
      correct: M(Pt(cands[0][0])),
      wrong: ok.map(([P, why]) => (why ? { value: M(Pt(P)), why } : M(Pt(P)))),
      solution: [
        R`From the parametrization, \(x^{2} + y^{2} = v^{2}\), so \(v = \sqrt{x^{2} + y^{2}}\) and the surface is \(z = ${m === 1 ? '' : m}\sqrt{x^{2} + y^{2}}\) with \(z \ge 0\).`,
        R`At \(${Pt(cands[0][0])}\): \(\sqrt{${x * x} + ${y * y}} = ${h}\), and \(${dot(m, h)} = ${m * h}\). It lies on the surface (with \(v = ${h}\)).`,
      ],
      rule: 0,
      skill: 'point on a surface',
      check: () => (on(cands[0][0]) && shown(question, ok, (c) => M(Pt(c[0]))).every((c) => !on(c[0])) ? true : 'point test failed'),
    });
    return question;
  }
  let fn, tex, dom, P, ans, wrong, sol;
  if (kind === 'plane') {
    let A, B;
    do [A, B] = [[rng.int(-2, 2), rng.int(-2, 2), rng.int(-2, 2)], [rng.int(-2, 2), rng.int(-2, 2), rng.int(-2, 2)]];
    while (isZero(vcross(A, B)) || isZero(A) || isZero(B));
    const O = [rng.int(-3, 3), rng.int(-3, 3), rng.int(-3, 3)];
    let u0, v0;
    do [u0, v0] = [rng.int(-3, 3), rng.int(-3, 3)];
    while (u0 === v0);
    fn = (u, v) => vadd(O, vadd(vscale(A, u), vscale(B, v)));
    tex = V(O.map((c, i) => terms([[c, ''], [A[i], 'u'], [B[i], 'v']])));
    dom = R`\(u\) and \(v\) any real numbers`;
    P = fn(u0, v0);
    ans = [u0, v0];
    wrong = [[[v0, u0], R`Check the order: \(u\) multiplies \(${V(A)}\) and \(v\) multiplies \(${V(B)}\).`], [[P[0], P[1]], R`The parameters are not the coordinates: solve \(\mathbf{r}(u, v) = ${Pt(P)}\) for \(u\) and \(v\).`], [[-u0, -v0]], [[u0, -v0]], [[u0 + 1, v0]]];
    sol = [R`Set the components equal: ${P.map((c, i) => R`\(${terms([[O[i], ''], [A[i], 'u'], [B[i], 'v']])} = ${c}\)`).join(', ')}.`, R`Solving two of the equations gives \(u = ${u0}\), \(v = ${v0}\); the third equation checks.`];
  } else if (kind === 'cyl') {
    const a = rng.int(2, 5);
    const deg = rng.pick([0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]);
    const z = rng.int(-4, 6);
    fn = (u, v) => [a * Math.cos(u), a * Math.sin(u), v];
    tex = V([cf(a, '\\cos u'), cf(a, '\\sin u'), 'v']);
    dom = R`\(0 \le u < 2\pi\), \(v\) any real number`;
    P = fn(ang(deg), z);
    const Pt3 = Pt([aCos(a, deg), aSin(a, deg), z]);
    ans = [deg, z];
    wrong = [[[mod360(90 - deg), z], R`\(x = ${cf(a, '\\cos u')}\) and \(y = ${cf(a, '\\sin u')}\): cosine goes with \(x\).`], [[mod360(360 - deg), z], R`Look at the sign of \(y\) to choose the quadrant.`], [[mod360(deg + 180), z]], [[mod360(deg + 90), z]], [[mod360(deg + 270), z]], [[mod360(180 - deg), z]]].filter((w) => w[0][0] !== deg);
    tex = { tex, Pt3 };
    sol = [R`\(v = z = ${z}\).`, R`\(\cos u = \frac{x}{${a}}\) and \(\sin u = \frac{y}{${a}}\) at the point \(${Pt3}\), so \(u = ${angleTex(deg)}\).`];
  } else {
    const a = rng.int(2, 6);
    const [phi, th] = [rng.pick([30, 60, 90, 120, 150]), rng.pick([0, 90, 180, 270])];
    fn = sphere(a);
    tex = SPH(a);
    dom = R`\(0 \le u \le \pi\), \(0 \le v < 2\pi\)`;
    P = fn(ang(phi), ang(th));
    const [kc, rc] = exactSin(phi);
    const c = Math.round(Math.cos(ang(th)));
    const s = Math.round(Math.sin(ang(th)));
    const Pt3 = Pt([rootOver(a * kc * c, rc, 2), rootOver(a * kc * s, rc, 2), aCos(a, phi)]);
    ans = [phi, th];
    wrong = [[[180 - phi, th], R`\(z = ${cf(a, '\\cos u')}\): its sign decides whether \(u\) is below or above \(\frac{\pi}{2}\).`], [[phi, mod360(th + 180)], R`The signs of \(x\) and \(y\) fix \(v\).`], [[th, phi]], [[phi, mod360(th + 90)]], [[phi, mod360(th + 270)]], [[phi, mod360(360 - th)]]].filter((w) => !(w[0][0] === phi && w[0][1] === th) && w[0][0] <= 180);
    tex = { tex, Pt3 };
    sol = [R`\(z = ${cf(a, '\\cos u')}\) gives \(\cos u = ${aCos(1, phi)}\), so \(u = ${angleTex(phi)}\).`, R`Then \(${a}\sin u = ${aSin(a, phi)}\), and \(x\), \(y\) at the point \(${Pt3}\) give \(\cos v = ${c}\), \(\sin v = ${s}\): \(v = ${angleTex(th)}\).`];
  }
  const angles = kind !== 'plane';
  const show = ([s, t]) => (angles ? pair(angleTex(s), kind === 'cyl' ? t : angleTex(t)) : pair(s, t));
  const rTex = typeof tex === 'string' ? tex : tex.tex;
  const ptTex = typeof tex === 'string' ? Pt(P) : tex.Pt3;
  const toUV = ([s, t]) => (angles ? [ang(s), kind === 'cyl' ? t : ang(t)] : [s, t]);
  const question = q({
    prompt: R`The point \(${ptTex}\) lies on the surface \(\mathbf{r}(u, v) = ${rTex}\), ${dom}. Find its parameters \((u, v)\).`,
    correct: show(ans),
    wrong: wrong.map(([w, why]) => (why ? { value: show(w), why } : show(w))),
    solution: [...sol, R`So \(${show(ans).slice(2, -2)}\).`],
    rule: 0,
    skill: 'finding (u, v) for a point',
    check: () => {
      if (!at(fn(...toUV(ans)), P)) return 'r(u, v) is not the point';
      return shown(question, wrong, ([w]) => show(w)).every(([w]) => !at(fn(...toUV(w)), P)) ? true : 'a wrong pair also gives the point';
    },
  });
  return question;
}

const MONOS = [[1, 0], [0, 1], [2, 0], [0, 2], [1, 1], [2, 1], [1, 2]];
function parametrizeCase(rng) {
  const kind = rng.pick(['graph', 'cyl', 'sph', 'cone', 'plane']);
  if (kind === 'graph') {
    let f;
    do f = [[rng.nonzero(-3, 3), ...rng.pick(MONOS)], [rng.nonzero(-3, 3), ...rng.pick(MONOS)], [rng.int(-5, 5), 0, 0]].filter((t) => t[0]);
    while (mpTex(f) === mpTex(f.map(([c, i, j]) => [c, j, i])) || f[0][1] === f[1][1] && f[0][2] === f[1][2]);
    const fe = (x, y) => mpEval(f, x, y);
    const sw = f.map(([c, i, j]) => [c, j, i]);
    return {
      text: R`the graph \(z = ${mpTex(f)}\)`, test: (P) => near(P[2], fe(P[0], P[1])),
      right: [V(['u', 'v', uv(f)]), (u, v) => [u, v, fe(u, v)]],
      wrong: [
        [V([uv(f), 'u', 'v']), (u, v) => [fe(u, v), u, v], R`That is the graph \(x = ${mpTex(f, ['y', 'z'])}\). For \(z = f(x, y)\) take \(x = u\), \(y = v\), \(z = f(u, v)\).`],
        [V(['u', uv(f), 'v']), (u, v) => [u, fe(u, v), v]],
        [V(['u', 'v', uv(sw)]), (u, v) => [u, v, mpEval(sw, u, v)], R`\(x = u\) and \(y = v\), so \(z\) is the formula with \(x\) replaced by \(u\) and \(y\) by \(v\).`],
      ],
      sol: R`A graph \(z = f(x, y)\) is parametrized by \(\mathbf{r}(u, v) = \langle u, v, f(u, v) \rangle\).`,
    };
  }
  const a = rng.int(2, 5);
  if (kind === 'cyl') {
    const k = rng.int(0, 2);
    const [i, j] = [0, 1, 2].filter((t) => t !== k);
    const make = (kk, ii, jj, s, t, w) => { const c = []; [c[kk], c[ii], c[jj]] = [w, s, t]; return c; };
    const num3 = (kk, ii, jj, r) => (u, v) => make(kk, ii, jj, r * Math.cos(u), r * Math.sin(u), v);
    const o = (k + 1) % 3;
    const [i2, j2] = [0, 1, 2].filter((t) => t !== o);
    return {
      text: R`the cylinder \(${sq2(i, j)} = ${a * a}\)`, test: (P) => near(P[i] ** 2 + P[j] ** 2, a * a),
      right: [V(make(k, i, j, cf(a, '\\cos u'), cf(a, '\\sin u'), 'v')), num3(k, i, j, a)],
      wrong: [
        [V(make(k, i, j, cf(a * a, '\\cos u'), cf(a * a, '\\sin u'), 'v')), num3(k, i, j, a * a), R`The radius is \(\sqrt{${a * a}} = ${a}\), not \(${a * a}\).`],
        [V(make(o, i2, j2, cf(a, '\\cos u'), cf(a, '\\sin u'), 'v')), num3(o, i2, j2, a), R`The free coordinate must be the one missing from the equation, \(${AX[k]}\).`],
        [V(make(k, i, j, 'v\\cos u', 'v\\sin u', 'v')), (u, v) => make(k, i, j, v * Math.cos(u), v * Math.sin(u), v)],
      ],
      sol: R`The cross-sections perpendicular to the \(${AX[k]}\)-axis are circles of radius \(${a}\): take \(${AX[i]} = ${cf(a, '\\cos u')}\), \(${AX[j]} = ${cf(a, '\\sin u')}\) and let \(${AX[k]} = v\) run freely.`,
    };
  }
  if (kind === 'sph') {
    return {
      text: R`the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, test: (P) => near(vlen(P) ** 2, a * a),
      right: [SPH(a), sphere(a)],
      wrong: [
        [SPH(a * a), sphere(a * a), R`The radius is \(\sqrt{${a * a}} = ${a}\).`],
        [V([cf(a, '\\cos v'), cf(a, '\\sin v'), 'u']), (u, v) => [a * Math.cos(v), a * Math.sin(v), u], 'That is a cylinder: the distance from the z-axis never changes.'],
        [V([cf(a, '\\cos u\\cos v'), cf(a, '\\sin u\\sin v'), cf(a, '\\cos u')]), (u, v) => [a * Math.cos(u) * Math.cos(v), a * Math.sin(u) * Math.sin(v), a * Math.cos(u)]],
      ],
      sol: R`Spherical coordinates with \(\rho = ${a}\): \(x = ${a}\sin\phi\cos\theta\), \(y = ${a}\sin\phi\sin\theta\), \(z = ${a}\cos\phi\), with \(u = \phi\) and \(v = \theta\).`,
    };
  }
  if (kind === 'cone') {
    const m = rng.int(1, 4);
    return {
      text: R`the cone \(z = ${m === 1 ? '' : m}\sqrt{x^{2} + y^{2}}\)`, test: (P) => near(P[2], m * Math.hypot(P[0], P[1])),
      right: [V(['v\\cos u', 'v\\sin u', cf(m, 'v')]), (u, v) => [v * Math.cos(u), v * Math.sin(u), m * v]],
      wrong: [
        m > 1 ? [V([cf(m, 'v\\cos u'), cf(m, 'v\\sin u'), 'v']), (u, v) => [m * v * Math.cos(u), m * v * Math.sin(u), v], R`Here \(\sqrt{x^{2} + y^{2}} = ${m}v\) while \(z = v\): the cone \(z = \frac{1}{${m}}\sqrt{x^{2} + y^{2}}\).`] : null,
        [V(['v\\cos u', 'v\\sin u', cf(m, 'v^{2}')]), (u, v) => [v * Math.cos(u), v * Math.sin(u), m * v * v], R`With \(z = ${cf(m, 'v^{2}')}\) the height grows with the square of the distance: a paraboloid.`],
        [V([cf(m, '\\cos u'), cf(m, '\\sin u'), 'v']), (u, v) => [m * Math.cos(u), m * Math.sin(u), v]],
        [V(['v\\cos u', 'v\\sin u', `${m}`]), (u, v) => [v * Math.cos(u), v * Math.sin(u), m]],
      ].filter(Boolean),
      sol: R`At distance \(v\) from the \(z\)-axis the cone has height \(${cf(m, 'v')}\): take \(x = v\cos u\), \(y = v\sin u\), \(z = ${cf(m, 'v')}\), \(v \ge 0\).`,
    };
  }
  let P, Q, S, n;
  do {
    [P, Q, S] = [0, 1, 2].map(() => [rng.int(-3, 4), rng.int(-3, 4), rng.int(-3, 4)]);
    n = vcross(vsub(Q, P), vsub(S, P));
  } while (isZero(n) || vdot(n, P) === 0 || parallel(n, vcross(Q, S)) && vdot(vcross(Q, S), P) === vdot(vcross(Q, S), Q));
  const [A, B] = [vsub(Q, P), vsub(S, P)];
  const lin = (O, X, Y) => [V(O.map((c, i) => terms([[c, ''], [X[i], 'u'], [Y[i], 'v']]))), (u, v) => vadd(O, vadd(vscale(X, u), vscale(Y, v)))];
  return {
    text: R`the plane through \(P${Pt(P)}\), \(Q${Pt(Q)}\) and \(R${Pt(S)}\)`, test: (X) => near(vdot(n, X), vdot(n, P)),
    right: lin(P, A, B),
    wrong: [
      [...lin(P, Q, S), R`The directions in the plane are \(\overrightarrow{PQ}\) and \(\overrightarrow{PR}\), not the position vectors of \(Q\) and \(R\).`],
      [...lin([0, 0, 0], A, B), R`Start from a point of the plane: \(\mathbf{r} = P + u\,\overrightarrow{PQ} + v\,\overrightarrow{PR}\). Without \(P\) the plane passes through the origin.`],
      [...lin(P, A, n), R`\(${V(n)}\) is the normal to the plane; moving along it leaves the plane.`],
    ],
    sol: R`Use \(P\) as the base point and \(\overrightarrow{PQ} = ${V(A)}\), \(\overrightarrow{PR} = ${V(B)}\) as directions: \(\mathbf{r}(u, v) = P + u\,\overrightarrow{PQ} + v\,\overrightarrow{PR}\).`,
  };
}

function easyParametrize(rng) {
  const k = parametrizeCase(rng);
  const box = [0.3, 2.9, 0.4, 2.2];
  const question = q({
    prompt: R`Which vector function parametrizes ${k.text}? (Take \(u\) and \(v\) over suitable intervals.)`,
    correct: rVec(k.right[0]),
    wrong: k.wrong.map(([t, , why]) => (why ? { value: rVec(t), why } : rVec(t))),
    solution: [k.sol, R`\(\mathbf{r}(u, v) = ${k.right[0]}\).`],
    rule: 1,
    skill: 'parametrizing a surface',
    check: () => {
      if (!spots(box).every(([u, v]) => k.test(k.right[1](u, v)))) return 'the right parametrization leaves the surface';
      return shown(question, k.wrong, (c) => rVec(c[0])).every((w) => spots(box).some(([u, v]) => !k.test(w[1](u, v)))) ? true : 'a wrong parametrization stays on the surface';
    },
  });
  return question;
}

// Grid curves: descriptions with a test for points on them.
const circ = (rT, r2, hT, h) => [R`a circle of radius \(${rT}\) in the plane \(z = ${hT}\), centered on the \(z\)-axis`, (P) => near(P[2], h) && near(P[0] ** 2 + P[1] ** 2, r2)];
const vline = (x0, y0, tx, ty) => [R`a line parallel to the \(z\)-axis through \(${Pt([tx, ty, 0])}\)`, (P) => near(P[0], x0) && near(P[1], y0)];
const ray = (d, tex) => [R`a ray from the origin through \(${Pt(tex)}\)`, (P) => vlen(vcross(P, d)) < 1e-7 && vdot(P, d) >= -1e-9];
const halfPar = (c, s) => [R`half of a parabola, from the origin through \(${Pt([c, s, 1])}\)`, (P) => { const t = P[0] * c + P[1] * s; return near(P[0], t * c) && near(P[1], t * s) && near(P[2], t * t) && t >= -1e-9; }];
const merid = (a, deg) => { const [c, s] = [Math.round(Math.cos(ang(deg))), Math.round(Math.sin(ang(deg)))]; return [R`a half-circle from \((0, 0, ${a})\) to \((0, 0, ${-a})\) through \(${Pt([a * c, a * s, 0])}\)`, (P) => near(P[0] * s - P[1] * c, 0) && P[0] * c + P[1] * s >= -1e-9 && near(vlen(P) ** 2, a * a)]; };
const QUAD = [0, 90, 180, 270];
const cs = (deg) => [Math.round(Math.cos(ang(deg))), Math.round(Math.sin(ang(deg)))];

function gridCase(rng, fixU) {
  const fam = rng.pick(['cyl', 'sph', 'cone', 'para']);
  const a = rng.int(2, 5);
  const deg = rng.pick(QUAD);
  const other = rng.pick(QUAD.filter((d) => d !== deg));
  const [c, s] = cs(deg);
  const why = (thing) => R`With \(${fixU ? 'u' : 'v'}\) fixed, only \(${fixU ? 'v' : 'u'}\) changes; ${thing}`;
  if (fam === 'cyl') {
    const base = { tex: V([cf(a, '\\cos u'), cf(a, '\\sin u'), 'v']), dom: R`\(0 \le u \le 2\pi\), \(v\) real`, fn: (u, v) => [a * Math.cos(u), a * Math.sin(u), v], vr: [-3, 3] };
    if (fixU) return { ...base, val: ang(deg), valTex: angleTex(deg), right: vline(a * c, a * s, a * c, a * s), wrong: [[...circ(a, a * a, 0, 0), why('the height \\(z = v\\) changes, while \\(x\\) and \\(y\\) stay put.')], vline(a * cs(other)[0], a * cs(other)[1], a * cs(other)[0], a * cs(other)[1]), ray([c, s, 1], [c, s, 1]), [...circ(a * a, a ** 4, 0, 0)]] };
    const h = rng.int(-3, 5);
    return { ...base, vr: [0, TAU], val: h, valTex: h, right: circ(a, a * a, h, h), wrong: [[...vline(a, 0, a, 0), why(R`that goes around the axis at the fixed height \(z = ${h}\).`)], [...circ(a * a, a ** 4, h, h), R`The radius of the cylinder is \(${a}\).`], h > 0 && h !== a ? circ(h, h * h, a, a) : circ(a, a * a, h + 2, h + 2), ray([c, s, 1], [c, s, 1])].filter(Boolean) };
  }
  if (fam === 'sph') {
    const base = { tex: SPH(a), dom: R`\(0 \le u \le \pi\), \(0 \le v \le 2\pi\)`, fn: sphere(a), vr: [0.1, PI - 0.1] };
    if (fixU) {
      const phi = rng.pick([30, 60, 90, 120, 150]);
      const [rT, r2, hT, h] = [aSin(a, phi), (a * Math.sin(ang(phi))) ** 2, aCos(a, phi), a * Math.cos(ang(phi))];
      return { ...base, vr: [0, TAU], val: ang(phi), valTex: angleTex(phi), right: circ(rT, r2, hT, h), wrong: [[...circ(a, a * a, hT, h), R`The radius of the circle is \(${a}\sin u\), the distance from the \(z\)-axis.`], [...merid(a, 0), why('the angle around the z-axis changes, at a fixed height.')], phi === 90 ? circ(a, a * a, a, a) : circ(rT, r2, `${h < 0 ? '' : '-'}${hT.replace(/^-/, '')}`, -h), circ(hT.replace(/^-/, ''), h * h, rT, Math.sqrt(r2)), circ(a * a, a ** 4, hT, h)].filter((w) => !(phi === 90 && w[0].includes('radius \\(0\\)'))) };
    }
    return { ...base, val: ang(deg), valTex: angleTex(deg), right: merid(a, deg), wrong: [[...circ(a, a * a, 0, 0), why('the angle down from the north pole changes, along a meridian.')], merid(a, other), [...circ(a * a, a ** 4, 0, 0)], ray([c, s, 0], [c, s, 0])] };
  }
  const para = fam === 'para';
  const base = { tex: V(['v\\cos u', 'v\\sin u', para ? 'v^{2}' : 'v']), dom: R`\(0 \le u \le 2\pi\), \(v \ge 0\)`, fn: (u, v) => [v * Math.cos(u), v * Math.sin(u), para ? v * v : v], vr: [0, 3] };
  if (fixU) {
    const [c2, s2] = cs(other);
    const right = para ? halfPar(c, s) : ray([c, s, 1], [c, s, 1]);
    return { ...base, val: ang(deg), valTex: angleTex(deg), right, wrong: [para ? [...ray([c, s, 1], [c, s, 1]), R`Along this curve \(z = v^{2}\) grows with the square of the distance from the axis, so it bends: half a parabola.`] : [...halfPar(c, s), R`Along this curve \(z = v\) grows at the same rate as the distance from the axis, so it is straight.`], [...circ(1, 1, 1, 1), why('the distance from the axis changes, so the curve runs away from the axis.')], para ? halfPar(c2, s2) : ray([c2, s2, 1], [c2, s2, 1]), vline(c, s, c, s)] };
  }
  const r0 = rng.int(2, 4);
  const h = para ? r0 * r0 : r0;
  return { ...base, vr: [0, TAU], val: r0, valTex: r0, right: circ(r0, r0 * r0, h, h), wrong: [[...circ(r0, r0 * r0, para ? r0 : r0 * r0, para ? r0 : r0 * r0), R`At \(v = ${r0}\) the height is \(z = ${para ? `${r0}^{2}` : r0} = ${h}\).`], [...(para ? halfPar(c, s) : ray([c, s, 1], [c, s, 1])), why('that goes around the axis at a fixed distance.')], circ(r0, r0 * r0, 0, 0), circ(r0 * r0, r0 ** 4, h, h)] };
}

function easyGridCurve(rng) {
  const fixU = rng.bool();
  const k = gridCase(rng, fixU);
  const pts = SPOTS.map(([t]) => k.vr[0] + t * (k.vr[1] - k.vr[0])).map((t) => (fixU ? k.fn(k.val, t) : k.fn(t, k.val)));
  const [fx, mv] = fixU ? ['u', 'v'] : ['v', 'u'];
  const question = q({
    prompt: R`On the surface \(\mathbf{r}(u, v) = ${k.tex}\) (${k.dom}), what is the grid curve \(${fx} = ${k.valTex}\)?`,
    correct: k.right[0],
    wrong: k.wrong.map(([t, , why]) => (why ? { value: t, why } : t)),
    solution: [
      R`Put \(${fx} = ${k.valTex}\) into \(\mathbf{r}\) and let \(${mv}\) vary.`,
      R`The points \(\mathbf{r}\) traces out form ${k.right[0]}.`,
    ],
    rule: 2,
    skill: 'grid curves',
    check: () => {
      if (!pts.every(k.right[1])) return 'the grid curve does not fit its description';
      return shown(question, k.wrong, (c) => c[0]).every((w) => pts.some((P) => !w[1](P))) ? true : 'a wrong description also fits';
    },
  });
  return question;
}

// ───────────── Medium ─────────────

const polyR = (comps) => (u, v) => comps.map((p) => mpEval(p, u, v));
/** Tangent plane question for a polynomial surface. `extra(pl)` may add wrong planes. */
function tangentQ({ prompt, comps, u0, v0, pre = [], extra = () => [], skill }) {
  const ruS = comps.map((p) => mpD(p, 0));
  const rvS = comps.map((p) => mpD(p, 1));
  const ru = ruS.map((p) => mpEval(p, u0, v0));
  const rv = rvS.map((p) => mpEval(p, u0, v0));
  const n = vcross(ru, rv);
  const P = comps.map((p) => mpEval(p, u0, v0));
  const pl = (m, X) => { if (isZero(m)) return null; const [k, d] = normPlane(m, vdot(m, X)); return { k, d, tex: M(planeTex(k, d)) }; };
  const right = pl(n, P);
  const cands = [
    [pl([n[0], -n[1], n[2]], P), R`Recheck the middle component of the cross product: it is \((\mathbf{r}_{u})_{z}(\mathbf{r}_{v})_{x} - (\mathbf{r}_{u})_{x}(\mathbf{r}_{v})_{z}\).`],
    [pl(ru, P), R`\(\mathbf{r}_{u}\) lies in the tangent plane. The normal is \(\mathbf{r}_{u} \times \mathbf{r}_{v}\).`],
    ...extra(pl, P),
    [pl(n, [u0, v0, P[2]]), R`The plane passes through the point \(\mathbf{r}(${u0}, ${v0}) = ${Pt(P)}\); the parameters are not its coordinates.`],
    [pl(vadd(ru, rv), P)],
    [pl(n, [0, 0, 0])],
    [pl(rv, P)],
  ].filter((c) => c[0] && !samePlane(c[0].k, c[0].d, right.k, right.d));
  const question = q({
    prompt,
    correct: right.tex,
    wrong: cands.map(([p, why]) => (why ? { value: p.tex, why } : p.tex)),
    solution: [
      ...pre,
      R`\(\mathbf{r}_{u} = ${V(ruS.map(uv))}\) and \(\mathbf{r}_{v} = ${V(rvS.map(uv))}\). At \((u, v) = (${u0}, ${v0})\): \(\mathbf{r}_{u} = ${V(ru)}\), \(\mathbf{r}_{v} = ${V(rv)}\), and the point is \(${Pt(P)}\).`,
      R`Normal: \(\mathbf{r}_{u} \times \mathbf{r}_{v} = ${V(n)}\).`,
      R`Plane: \(${n[0]}(x - ${paren(P[0])}) + ${paren(n[1])}(y - ${paren(P[1])}) + ${paren(n[2])}(z - ${paren(P[2])}) = 0\), that is \(${planeTex(right.k, right.d)}\).`,
    ],
    rule: 2,
    skill,
    check: () => {
      const N = surfNormal(polyR(comps), u0, v0);
      if (vlen(vcross(N, right.k)) > 1e-5 * vlen(N) * vlen(right.k)) return 'normal is not parallel to the numeric r_u × r_v';
      return near(vdot(right.k, polyR(comps)(u0, v0)), right.d) ? true : 'the point is not on the plane';
    },
  });
  return question;
}

const TPS = [
  (a, b) => [[[1, 2, 0]], [[1, 0, 2]], [[a, 1, 0], [b, 0, 1]]],
  (a) => [[[1, 1, 0], [1, 0, 1]], [[a, 2, 0]], [[1, 1, 0], [-1, 0, 1]]],
  (a) => [[[1, 1, 0], [1, 0, 1]], [[1, 1, 0], [-1, 0, 1]], [[a, 1, 1]]],
  (a, b) => [[[1, 1, 0]], [[a, 1, 1]], [[1, 0, 2], [b, 1, 0]]],
];

function mediumTangentPlane(rng) {
  let comps, u0, v0;
  do {
    comps = rng.pick(TPS)(rng.nonzero(-3, 3), rng.nonzero(-3, 3));
    [u0, v0] = [rng.nonzero(-2, 2), rng.nonzero(-2, 2)];
  } while (isZero(vcross(comps.map((p) => mpEval(mpD(p, 0), u0, v0)), comps.map((p) => mpEval(mpD(p, 1), u0, v0)))));
  return tangentQ({
    prompt: R`Find the tangent plane to the surface \(\mathbf{r}(u, v) = ${V(comps.map(uv))}\) at the point where \((u, v) = (${u0}, ${v0})\).`,
    comps, u0, v0, skill: 'tangent plane by r_u × r_v',
  });
}

const AREAS_M = [
  (rng) => {
    const [a, h] = [rng.int(2, 6), rng.int(1, 8)];
    const deg = rng.pick([60, 90, 120, 180, 240, 270, 360]);
    const al = frac(deg, 180);
    return {
      prompt: R`Find the area of the surface \(\mathbf{r}(u, v) = ${V([cf(a, '\\cos u'), cf(a, '\\sin u'), 'v'])}\), \(0 \le u \le ${angleTex(deg)}\), \(0 \le v \le ${h}\).`,
      ans: piTex(al.mul(a * h)), val: al.value * PI * a * h, r: (u, v) => [a * Math.cos(u), a * Math.sin(u), v], box: [0, ang(deg), 0, h],
      wrong: [
        [piTex(al.mul(h)), al.value * PI * h, R`\(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = ${a}\), not 1: the \(u\)-direction is stretched by the radius.`],
        [piTex(al.mul(a * a * h)), al.value * PI * a * a * h, R`\(\mathbf{r}_{u} \times \mathbf{r}_{v} = ${V([cf(a, '\\cos u'), cf(a, '\\sin u'), 0])}\) has length \(${a}\), not \(${a * a}\).`],
        [piTex(frac(2 * a * h)), 2 * PI * a * h, R`The angle runs only from \(0\) to \(${angleTex(deg)}\), not all the way around.`],
        [piTex(al.mul(a * h).div(2)), (al.value * PI * a * h) / 2],
        [piTex(al.mul(2 * a * h)), al.value * PI * 2 * a * h],
        [piTex(al.mul(3 * a * h)), al.value * PI * 3 * a * h],
        [piTex(al.mul(4 * a * h)), al.value * PI * 4 * a * h],
      ],
      solution: [
        R`\(\mathbf{r}_{u} = ${V([cf(-a, '\\sin u'), cf(a, '\\cos u'), 0])}\), \(\mathbf{r}_{v} = \langle 0, 0, 1 \rangle\), so \(\mathbf{r}_{u} \times \mathbf{r}_{v} = ${V([cf(a, '\\cos u'), cf(a, '\\sin u'), 0])}\), with length \(${a}\).`,
        R`Area \(= \displaystyle\int_{0}^{${h}}\int_{0}^{${angleTex(deg)}} ${a}\,du\,dv = ${a} \cdot ${angleTex(deg)} \cdot ${h} = ${piTex(al.mul(a * h))}\).`,
      ],
    };
  },
  (rng) => {
    const a = rng.int(1, 5);
    const PH = [0, 60, 90, 120, 180];
    let i, j;
    do [i, j] = [rng.int(0, 3), rng.int(1, 4)];
    while (j <= i);
    const [p1, p2] = [PH[i], PH[j]];
    const bn = rng.pick([4, 4, 2, 1]); // θ-range = bn·π/2
    const c = (d) => frac(Math.round(2 * Math.cos(ang(d))), 2);
    const dc = c(p1).sub(c(p2));
    const A = dc.mul(a * a * bn).div(2);
    const top = piTex(frac(bn, 2));
    const full = A.eq(frac(4 * a * a));
    return {
      prompt: R`Find the area of the part of the sphere \(\mathbf{r}(u, v) = ${SPH(a)}\) with \(${angleTex(p1)} \le u \le ${angleTex(p2)}\), \(0 \le v \le ${top}\).`,
      ans: piTex(A), val: A.value * PI, r: sphere(a), box: [ang(p1), ang(p2), 0, (bn * PI) / 2],
      wrong: [
        [piTex(frac(a * a * bn * (p2 - p1), 360), '\\pi^{2}'), (a * a * bn * (p2 - p1) * PI * PI) / 360, R`The factor \(\sin u\) is missing: \(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = ${a * a}\sin u\).`],
        a > 1 ? [piTex(dc.mul(a * bn).div(2)), (dc.value * a * bn * PI) / 2, R`\(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = ${a * a}\sin u\): the radius appears squared.`] : null,
        [piTex(A.neg()), -A.value * PI, R`An antiderivative of \(\sin u\) is \(-\cos u\). An area is never negative.`],
        full ? null : [piTex(frac(4 * a * a)), 4 * PI * a * a, 'That is the area of the whole sphere.'],
        [piTex(A.mul(2)), 2 * A.value * PI],
      ].filter(Boolean),
      solution: [
        R`For this sphere \(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = ${a * a}\sin u\) (with \(u = \phi\), \(v = \theta\)).`,
        R`\(\displaystyle\int_{${angleTex(p1)}}^{${angleTex(p2)}} ${a * a}\sin u\,du = ${a * a}\left(${c(p1).tex()} - ${paren(c(p2))}\right) = ${dc.mul(a * a).tex()}\).`,
        R`Multiply by the \(v\)-length \(${top}\): area \(= ${piTex(A)}\).`,
      ],
    };
  },
  (rng) => {
    const s = rng.pick([2, 3, 4]);
    const a = s * s - 1;
    const b = rng.int(1, 5);
    const A = frac(2 * (s ** 3 - 1) * b, 3);
    return {
      prompt: R`Find the area of the part of the surface \(z = \tfrac{2}{3}x^{3/2}\) that lies above the rectangle \(0 \le x \le ${a}\), \(0 \le y \le ${b}\).`,
      ans: A.tex(), val: A.value, r: (t, v) => [t * t, v, (2 / 3) * t ** 3], box: [0, Math.sqrt(a), 0, b],
      wrong: [
        [frac(2 * s ** 3 * b, 3).tex(), (2 * s ** 3 * b) / 3, R`At the lower limit \(x = 0\), \((1 + x)^{3/2} = 1\), which must be subtracted.`],
        [`${a * b}`, a * b, R`That is the area of the rectangle underneath. The curved surface is larger by the factor \(\sqrt{1 + f_{x}^{2} + f_{y}^{2}}\).`],
        [frac(3 * (s ** 3 - 1) * b, 2).tex(), (3 * (s ** 3 - 1) * b) / 2, R`An antiderivative of \((1 + x)^{1/2}\) is \(\tfrac{2}{3}(1 + x)^{3/2}\).`],
        [frac((s ** 3 - 1) * b, 3).tex(), ((s ** 3 - 1) * b) / 3],
      ],
      solution: [
        R`For a graph, \(dS = \sqrt{1 + f_{x}^{2} + f_{y}^{2}}\,dA\). Here \(f_{x} = x^{1/2}\) and \(f_{y} = 0\), so \(dS = \sqrt{1 + x}\,dA\).`,
        R`\(\displaystyle\int_{0}^{${b}}\int_{0}^{${a}} \sqrt{1 + x}\,dx\,dy = ${b} \cdot \tfrac{2}{3}\left[(1 + x)^{3/2}\right]_{0}^{${a}} = ${b} \cdot \tfrac{2}{3}(${s ** 3} - 1)\).`,
        R`Area \(= ${A.tex()}\).`,
      ],
    };
  },
];

function areaQ(k, skill) {
  const show = (t) => (k.unit ? R`\(${t}\) ${k.unit}` : M(t));
  const wrong = k.wrong.filter(Boolean);
  const question = q({
    prompt: k.prompt,
    correct: show(k.ans),
    wrong: wrong.map(([t, , why]) => (why ? { value: show(t), why } : show(t))),
    solution: k.solution,
    rule: k.rule ?? 3,
    skill,
    check: () => {
      const f = k.f ?? (() => 1);
      const A = surfInt(f, k.r, ...k.box) / (k.avg ? surfInt(() => 1, k.r, ...k.box) : 1);
      if (!close(A, k.val, 1e-5)) return `numeric area ${A}, answer ${k.val}`;
      return shown(question, wrong, (c) => show(c[0])).every((w) => !close(w[1], A, 1e-4)) ? true : 'a wrong choice equals the answer';
    },
  });
  return question;
}

function mediumSurfaceArea(rng) {
  return areaQ(rng.pick(AREAS_M)(rng), 'surface area of a parametrized surface');
}

// Orientation: r_u × r_v at a point of a closed surface or a graph.
function orientCase(rng) {
  const kind = rng.pick(['cyl', 'cyl2', 'sph', 'sph2', 'graph', 'graph2']);
  const a = rng.int(2, 5);
  const deg = rng.pick(QUAD);
  const [c, s] = cs(deg);
  if (kind === 'cyl' || kind === 'cyl2') {
    const z = rng.int(-2, 4);
    const two = kind === 'cyl2';
    return {
      tex: two ? V([cf(a, '\\cos v'), cf(a, '\\sin v'), 'u']) : V([cf(a, '\\cos u'), cf(a, '\\sin u'), 'v']),
      surf: R`the cylinder \(x^{2} + y^{2} = ${a * a}\)`, pt: two ? [z, deg] : [deg, z], ptTex: two ? [z, angleTex(deg)] : [angleTex(deg), z],
      fn: two ? (u, v) => [a * Math.cos(v), a * Math.sin(v), u] : (u, v) => [a * Math.cos(u), a * Math.sin(u), v],
      uvNum: two ? [z, ang(deg)] : [ang(deg), z],
      n: two ? [-a * c, -a * s, 0] : [a * c, a * s, 0], out: (P) => [P[0], P[1], 0], words: ['outward', 'inward'],
    };
  }
  if (kind === 'sph' || kind === 'sph2') {
    const two = kind === 'sph2';
    return {
      tex: two ? V([cf(a, '\\sin v\\cos u'), cf(a, '\\sin v\\sin u'), cf(a, '\\cos v')]) : SPH(a),
      surf: R`the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, ptTex: two ? [angleTex(deg), '\\frac{\\pi}{2}'] : ['\\frac{\\pi}{2}', angleTex(deg)],
      fn: two ? (u, v) => sphere(a)(v, u) : sphere(a), uvNum: two ? [ang(deg), PI / 2] : [PI / 2, ang(deg)],
      n: two ? [-a * a * c, -a * a * s, 0] : [a * a * c, a * a * s, 0], out: (P) => P, words: ['outward', 'inward'],
    };
  }
  const two = kind === 'graph2';
  let f;
  do f = [[rng.nonzero(-3, 3), ...rng.pick(MONOS)], [rng.nonzero(-3, 3), ...rng.pick(MONOS)]];
  while (f[0][1] === f[1][1] && f[0][2] === f[1][2]);
  const [u0, v0] = [rng.int(-2, 2), rng.int(-2, 2)];
  const [x0, y0] = two ? [v0, u0] : [u0, v0];
  const [fx, fy] = [mpEval(mpD(f, 0), x0, y0), mpEval(mpD(f, 1), x0, y0)];
  return {
    tex: two ? V(['v', 'u', mpTex(f, ['v', 'u'])]) : V(['u', 'v', uv(f)]),
    surf: R`the graph \(z = ${mpTex(f)}\)`, ptTex: [u0, v0],
    fn: two ? (u, v) => [v, u, mpEval(f, v, u)] : (u, v) => [u, v, mpEval(f, u, v)], uvNum: [u0, v0],
    n: two ? [fx, fy, -1] : [-fx, -fy, 1], out: () => [0, 0, 1], words: ['upward', 'downward'],
  };
}

function mediumOrientation(rng) {
  const k = orientCase(rng);
  const n = k.n.map((x) => x || 0);
  const neg = n.map((x) => -x || 0);
  const P = k.fn(...k.uvNum);
  const sign = Math.sign(vdot(n, k.out(P)));
  const [dir, opp] = sign > 0 ? k.words : [k.words[1], k.words[0]];
  const say = (v, w) => R`\(${V(v)}\), pointing ${w}`;
  const closed = k.words[0] === 'outward';
  const question = q({
    prompt: R`\(\mathbf{r}(u, v) = ${k.tex}\) parametrizes ${k.surf}. Find \(\mathbf{r}_{u} \times \mathbf{r}_{v}\) at \((u, v) = (${k.ptTex.join(', ')})\) and say which way it points.`,
    correct: say(n, dir),
    wrong: [
      { value: say(n, opp), why: closed ? R`Compare with the position vector: the normal points outward when its dot product with \(${V(k.out(P).map((x) => x || 0))}\) is positive.` : R`The \(z\)-component decides: positive means upward.` },
      { value: say(neg, opp), why: R`The order matters: that is \(\mathbf{r}_{v} \times \mathbf{r}_{u} = -(\mathbf{r}_{u} \times \mathbf{r}_{v})\).` },
      say(neg, dir),
    ],
    solution: [
      R`At \((u, v) = (${k.ptTex.join(', ')})\) the point is \(${Pt(P.map((x) => Math.round(x * 1e9) / 1e9 || 0))}\). Differentiate each component and evaluate there, then take the cross product: \(\mathbf{r}_{u} \times \mathbf{r}_{v} = ${V(n)}\).`,
      closed ? R`Its dot product with \(${V(k.out(P).map((x) => Math.round(x) || 0))}\) is ${sign > 0 ? 'positive' : 'negative'}, so it points ${dir}.` : R`Its \(z\)-component is \(${n[2]}\), so it points ${dir}.`,
      dir === k.words[1] ? R`To orient ${k.surf} ${k.words[0]}, use \(\mathbf{r}_{v} \times \mathbf{r}_{u}\) instead (or swap \(u\) and \(v\)).` : R`So this parametrization gives the ${k.words[0]} orientation.`,
    ],
    rule: 5,
    skill: 'orientation from r_u × r_v',
    check: () => {
      const N = surfNormal(k.fn, ...k.uvNum);
      if (!N.every((x, i) => Math.abs(x - n[i]) < 1e-5 * Math.max(1, Math.abs(n[i])))) return `numeric normal ${N} vs ${n}`;
      return Math.sign(vdot(N, k.out(P))) === sign && sign !== 0 ? true : 'direction is wrong';
    },
  });
  return question;
}

const MASS_M = [
  (rng) => {
    const [a, h, k] = [rng.int(2, 8), rng.int(2, 10), rng.int(1, 4)];
    return {
      story: R`The curved side of a thin metal can is the cylinder \(x^{2} + y^{2} = ${a * a}\), \(0 \le z \le ${h}\) (in cm). The metal is thicker near the top: its density is \(\delta = ${cf(k, 'z')}\) g/cm². Find the mass of the side.`,
      ans: frac(a * k * h * h), val: PI * a * k * h * h, unit: 'g', r: (u, v) => [a * Math.cos(u), a * Math.sin(u), v], box: [0, TAU, 0, h], f: (x, y, z) => k * z,
      wrong: [
        [frac(k * h * h), R`On the cylinder \(dS = ${a}\,d\theta\,dz\): the radius multiplies the area element.`],
        [frac(2 * a * k * h * h), R`\(\displaystyle\int_{0}^{${h}} z\,dz = \frac{${h}^{2}}{2}\): the \(\frac{1}{2}\) is missing.`],
        [frac(a * a * k * h * h), R`\(|\mathbf{r}_{\theta} \times \mathbf{r}_{z}| = ${a}\), not \(${a * a}\).`],
        [frac(2 * a * k * h)],
        [frac(a * k * h * h, 2)],
        [frac(3 * a * k * h * h)],
      ],
      solution: [
        R`Parametrize by \(\mathbf{r}(\theta, z) = ${V([cf(a, '\\cos\\theta'), cf(a, '\\sin\\theta'), 'z'])}\): \(|\mathbf{r}_{\theta} \times \mathbf{r}_{z}| = ${a}\), so \(dS = ${a}\,d\theta\,dz\).`,
        R`Mass \(= \displaystyle\iint_{S} \delta\,dS = \int_{0}^{2\pi}\int_{0}^{${h}} ${cf(k, 'z')} \cdot ${a}\,dz\,d\theta = 2\pi \cdot ${a * k} \cdot \frac{${h * h}}{2}\).`,
        R`\(= ${piTex(frac(a * k * h * h))}\) g.`,
      ],
    };
  },
  (rng) => {
    const [a, k] = [rng.int(1, 5), rng.int(1, 5)];
    const sq = rng.bool();
    const ans = sq ? frac(4 * k * a ** 4, 3) : frac(k * a ** 3);
    return {
      story: sq
        ? R`A thin dome is the hemisphere \(x^{2} + y^{2} + z^{2} = ${a * a}\), \(z \ge 0\) (in meters). Its density is \(\delta = ${k === 1 ? 'x^{2} + y^{2}' : `${k}(x^{2} + y^{2})`}\) kg/m², heaviest at the rim. Find the mass of the dome.`
        : R`A thin dome is the hemisphere \(x^{2} + y^{2} + z^{2} = ${a * a}\), \(z \ge 0\) (in meters). Its density is \(\delta = ${cf(k, 'z')}\) kg/m², heaviest at the top. Find the mass of the dome.`,
      ans, val: ans.value * PI, unit: 'kg', r: sphere(a), box: [0, PI / 2, 0, TAU], f: sq ? (x, y) => k * (x * x + y * y) : (x, y, z) => k * z,
      wrong: sq
        ? [[ans.mul(2), R`The dome is half a sphere: \(\phi\) runs from \(0\) to \(\frac{\pi}{2}\).`], a > 1 ? [frac(4 * k * a ** 3, 3), R`On a sphere of radius \(${a}\), \(dS = ${a * a}\sin\phi\,d\phi\,d\theta\).`] : null, [frac(k * a ** 4), null], [ans.div(2)]]
        : [[ans.mul(2), R`\(\displaystyle\int_{0}^{\pi/2} \cos\phi\sin\phi\,d\phi = \frac{1}{2}\).`], a > 1 ? [frac(k * a * a), R`On a sphere of radius \(${a}\), \(dS = ${a * a}\sin\phi\,d\phi\,d\theta\).`] : null, [frac(2 * k * a ** 3, 3), null], [ans.div(2)]],
      solution: [
        R`Use \(\mathbf{r}(\phi, \theta) = ${V([cf(a, '\\sin\\phi\\cos\\theta'), cf(a, '\\sin\\phi\\sin\\theta'), cf(a, '\\cos\\phi')])}\), \(0 \le \phi \le \frac{\pi}{2}\): \(dS = ${a * a}\sin\phi\,d\phi\,d\theta\).`,
        sq
          ? R`On the dome \(x^{2} + y^{2} = ${a * a}\sin^{2}\phi\), so the mass is \(\displaystyle\int_{0}^{2\pi}\int_{0}^{\pi/2} ${k * a ** 4}\sin^{3}\phi\,d\phi\,d\theta = 2\pi \cdot ${k * a ** 4} \cdot \frac{2}{3}\).`
          : R`On the dome \(z = ${cf(a, '\\cos\\phi')}\), so the mass is \(\displaystyle\int_{0}^{2\pi}\int_{0}^{\pi/2} ${k * a ** 3}\cos\phi\sin\phi\,d\phi\,d\theta = 2\pi \cdot ${k * a ** 3} \cdot \frac{1}{2}\).`,
        R`\(= ${piTex(ans)}\) kg.`,
      ],
    };
  },
];

function massQ(k, skill, rule = 4) {
  const show = (v) => R`\(${piTex(v)}\) ${k.unit}`;
  const wrong = k.wrong.filter(Boolean);
  const question = q({
    prompt: k.story,
    correct: show(k.ans),
    wrong: wrong.map(([v, why]) => (why ? { value: show(v), why } : show(v))),
    solution: k.solution,
    rule,
    skill,
    check: () => {
      const m = surfInt(k.f, k.r, ...k.box);
      if (!close(m, k.val, 1e-5)) return `numeric mass ${m}, answer ${k.val}`;
      return shown(question, wrong, (c) => show(c[0])).every((w) => !close(w[0].value * PI, m, 1e-6)) ? true : 'a wrong choice equals the mass';
    },
  });
  return question;
}

function mediumShellMass(rng) {
  return massQ(rng.pick(MASS_M)(rng), 'mass of a thin shell');
}

// ───────────── Hard ─────────────

const SLOPES = [[1, 1], [2, 1], [3, 1], [3, 4], [4, 3]];
const AREAS_H = [
  (rng) => {
    const [mn, md] = rng.pick(SLOPES);
    const N = mn * mn + md * md;
    const p = rng.int(0, 3);
    const qq = rng.int(p + 1, p + 4);
    const D = qq * qq - p * p;
    const mTex = md === 1 ? cf(mn, 'v') : `\\tfrac{${mn}}{${md}}v`;
    const k = rootOver(1, N, md);
    const sN = Math.sqrt(N) / md;
    const mT = md === 1 ? (mn === 1 ? '' : `${mn}`) : `\\tfrac{${mn}}{${md}}`;
    return {
      prompt: R`Find the area of the surface \(\mathbf{r}(u, v) = ${V(['v\\cos u', 'v\\sin u', mTex])}\), \(0 \le u \le 2\pi\), \(${p} \le v \le ${qq}\).`,
      ans: rootPi(frac(D, md), N), val: PI * D * sN, r: (u, v) => [v * Math.cos(u), v * Math.sin(u), (mn / md) * v], box: [0, TAU, p, qq],
      wrong: [
        [piTex(frac(D)), PI * D, R`That is the area of the flat ring underneath. The cone is tilted: \(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = ${k}v\), not \(v\).`],
        p > 0 ? [rootPi(frac((qq - p) ** 2, md), N), PI * (qq - p) ** 2 * sN, R`\(\displaystyle\int_{${p}}^{${qq}} v\,dv = \frac{${qq}^{2} - ${p}^{2}}{2}\), not \(\frac{(${qq} - ${p})^{2}}{2}\).`] : null,
        [piTex(frac(mn * D, md)), (PI * mn * D) / md, R`The stretching factor is \(\sqrt{1 + m^{2}} = ${k}\), not the slope.`],
        [rootPi(frac(2 * D, md), N), 2 * PI * D * sN],
        [rootPi(frac(D, 2 * md), N), (PI * D * sN) / 2],
      ],
      solution: [
        R`\(\mathbf{r}_{u} = \langle -v\sin u, v\cos u, 0 \rangle\), \(\mathbf{r}_{v} = ${V(['\\cos u', '\\sin u', md === 1 ? `${mn}` : `\\tfrac{${mn}}{${md}}`])}\), so \(\mathbf{r}_{u} \times \mathbf{r}_{v} = ${V([`${mT}v\\cos u`, `${mT}v\\sin u`, '-v'])}\), with length \(${k}v\).`,
        R`Area \(= \displaystyle\int_{0}^{2\pi}\int_{${p}}^{${qq}} ${k}v\,dv\,du = 2\pi \cdot ${k} \cdot \frac{${qq * qq} - ${p * p}}{2} = ${rootPi(frac(D, md), N)}\).`,
      ],
    };
  },
  (rng) => {
    const [A, B] = [rng.int(1, 3), rng.int(1, 4)];
    const ans = frac(A * B * (2 * A * A + B * B), 3);
    const raw = frac(A * B ** 5, 5).add(frac(4 * A ** 3 * B ** 3, 9)).add(frac(4 * A ** 5 * B, 5));
    return {
      prompt: R`Find the area of the surface \(\mathbf{r}(u, v) = \langle u^{2}, uv, \tfrac{1}{2}v^{2} \rangle\), \(0 \le u \le ${A}\), \(0 \le v \le ${B}\).`,
      ans: ans.tex(), val: ans.value, r: (u, v) => [u * u, u * v, (v * v) / 2], box: [0, A, 0, B],
      wrong: [
        A !== B ? [frac(A * B * (A * A + 2 * B * B), 3).tex(), (A * B * (A * A + 2 * B * B)) / 3, R`\(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = 2u^{2} + v^{2}\): the 2 goes with \(u^{2}\).`] : null,
        [raw.tex(), raw.value, R`\(v^{4} + 4u^{2}v^{2} + 4u^{4} = (v^{2} + 2u^{2})^{2}\): take the square root before integrating.`],
        [`${A * B}`, A * B, 'That is the area of the parameter rectangle, not of the surface.'],
        [ans.div(2).tex(), ans.value / 2],
        [ans.mul(2).tex(), ans.value * 2],
      ],
      solution: [
        R`\(\mathbf{r}_{u} = \langle 2u, v, 0 \rangle\), \(\mathbf{r}_{v} = \langle 0, u, v \rangle\), so \(\mathbf{r}_{u} \times \mathbf{r}_{v} = \langle v^{2}, -2uv, 2u^{2} \rangle\).`,
        R`\(|\mathbf{r}_{u} \times \mathbf{r}_{v}|^{2} = v^{4} + 4u^{2}v^{2} + 4u^{4} = (v^{2} + 2u^{2})^{2}\), so \(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = 2u^{2} + v^{2}\).`,
        R`\(\displaystyle\int_{0}^{${B}}\int_{0}^{${A}} (2u^{2} + v^{2})\,du\,dv = \frac{2 \cdot ${A ** 3} \cdot ${B}}{3} + \frac{${A} \cdot ${B ** 3}}{3} = ${ans.tex()}\).`,
      ],
    };
  },
  (rng) => {
    const s = rng.pick([2, 3, 4, 5]);
    const R2 = s * s - 1;
    const ans = frac(2 * (s ** 3 - 1), 3);
    return {
      prompt: R`Find the area of the part of the surface \(z = xy\) that lies inside the cylinder \(x^{2} + y^{2} = ${R2}\).`,
      ans: piTex(ans), val: ans.value * PI, r: (u, v) => [u * Math.cos(v), u * Math.sin(v), u * u * Math.cos(v) * Math.sin(v)], box: [0, Math.sqrt(R2), 0, TAU],
      wrong: [
        [piTex(frac(2 * s ** 3, 3)), (2 * PI * s ** 3) / 3, R`At \(r = 0\), \((1 + r^{2})^{3/2} = 1\), which must be subtracted.`],
        [piTex(frac(R2)), PI * R2, 'That is the area of the disk underneath. The surface is curved, so it is larger.'],
        [piTex(frac(s ** 3 - 1, 3)), (PI * (s ** 3 - 1)) / 3, R`The \(\theta\)-integral contributes \(2\pi\).`],
        [piTex(frac(4 * (s ** 3 - 1), 3)), (4 * PI * (s ** 3 - 1)) / 3],
      ],
      solution: [
        R`For the graph \(f(x, y) = xy\): \(f_{x} = y\), \(f_{y} = x\), so \(dS = \sqrt{1 + x^{2} + y^{2}}\,dA\), over the disk \(x^{2} + y^{2} \le ${R2}\).`,
        R`In polar coordinates: \(\displaystyle\int_{0}^{2\pi}\int_{0}^{${sqrtTexS(R2)}} \sqrt{1 + r^{2}}\,r\,dr\,d\theta = 2\pi \cdot \tfrac{1}{3}\left[(1 + r^{2})^{3/2}\right]_{0}^{${sqrtTexS(R2)}} = \tfrac{2\pi}{3}(${s ** 3} - 1)\).`,
        R`Area \(= ${piTex(ans)}\).`,
      ],
    };
  },
  (rng) => {
    const a = rng.int(2, 8);
    const c = rng.int(1, a - 1);
    const ans = frac(2 * a * (a - c));
    return {
      prompt: R`Find the area of the part of the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\) that lies above the plane \(z = ${c}\).`,
      ans: piTex(ans), val: ans.value * PI, r: sphere(a), box: [0, Math.acos(c / a), 0, TAU],
      wrong: [
        [piTex(frac(a * a - c * c)), PI * (a * a - c * c), 'That is the area of the flat disk the cap sits on. The cap is curved, so it is larger.'],
        [piTex(frac(2 * a * (a + c))), 2 * PI * a * (a + c), R`That is the larger piece, below \(z = ${c}\).`],
        [piTex(frac(2 * a * a)), 2 * PI * a * a, 'That is the whole upper hemisphere.'],
        [piTex(ans.mul(2)), 2 * ans.value * PI],
      ],
      solution: [
        R`With \(\mathbf{r}(\phi, \theta) = ${V([cf(a, '\\sin\\phi\\cos\\theta'), cf(a, '\\sin\\phi\\sin\\theta'), cf(a, '\\cos\\phi')])}\), \(dS = ${a * a}\sin\phi\,d\phi\,d\theta\).`,
        R`\(z \ge ${c}\) means \(\cos\phi \ge \frac{${c}}{${a}}\): \(0 \le \phi \le \phi_{0}\) with \(\cos\phi_{0} = \frac{${c}}{${a}}\).`,
        R`Area \(= 2\pi \cdot ${a * a}\left[-\cos\phi\right]_{0}^{\phi_{0}} = 2\pi \cdot ${a * a}\left(1 - \frac{${c}}{${a}}\right) = ${piTex(ans)}\).`,
      ],
    };
  },
];
const sqrtTexS = (n) => { const { coef, rad } = simplifySqrt(n); return rad === 1 ? `${coef}` : `${coef === 1 ? '' : coef}\\sqrt{${rad}}`; };

function hardSurfaceArea(rng) {
  return areaQ(rng.pick(AREAS_H)(rng), 'surface area');
}

const SCALAR_H = [
  (rng) => {
    const [c, b, bn] = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 2)];
    const ans = frac(bn * (b ** 3 + 3 * c * c * b), 3);
    return {
      prompt: R`Evaluate \(\displaystyle\iint_{S} \sqrt{x^{2} + y^{2} + ${c * c}}\,dS\), where \(S\) is the helicoid \(\mathbf{r}(u, v) = ${V(['u\\cos v', 'u\\sin v', cf(c, 'v')])}\), \(0 \le u \le ${b}\), \(0 \le v \le ${piTex(bn)}\).`,
      ans: piTex(ans), val: ans.value * PI, f: (x, y) => Math.sqrt(x * x + y * y + c * c), r: (u, v) => [u * Math.cos(v), u * Math.sin(v), c * v], box: [0, b, 0, bn * PI],
      wrong: [
        [piTex(frac(bn * b ** 3, 3)), (PI * bn * b ** 3) / 3, R`The integrand is \((u^{2} + ${c * c})\): the \(${c * c}\) contributes \(${c * c} \cdot ${b}\) to the \(u\)-integral.`],
        [piTex(ans.mul(2)), 2 * ans.value * PI, R`The \(v\)-integral gives \(${piTex(bn)}\), the length of the \(v\)-interval.`],
        [piTex(ans.div(2)), (ans.value * PI) / 2],
        [piTex(frac(bn * (b ** 3 + 3 * c * b), 3)), (PI * bn * (b ** 3 + 3 * c * b)) / 3],
      ],
      solution: [
        R`\(\mathbf{r}_{u} = \langle \cos v, \sin v, 0 \rangle\), \(\mathbf{r}_{v} = ${V(['-u\\sin v', 'u\\cos v', `${c}`])}\), so \(\mathbf{r}_{u} \times \mathbf{r}_{v} = ${V([cf(c, '\\sin v'), cf(-c, '\\cos v'), 'u'])}\) and \(dS = \sqrt{u^{2} + ${c * c}}\,du\,dv\).`,
        R`On \(S\), \(x^{2} + y^{2} = u^{2}\), so the integrand becomes \(\sqrt{u^{2} + ${c * c}} \cdot \sqrt{u^{2} + ${c * c}} = u^{2} + ${c * c}\).`,
        R`\(\displaystyle\int_{0}^{${piTex(bn)}}\int_{0}^{${b}} (u^{2} + ${c * c})\,du\,dv = ${piTex(bn)}\left(\frac{${b ** 3}}{3} + ${c * c * b}\right) = ${piTex(ans)}\).`,
      ],
    };
  },
  (rng) => {
    const a = rng.int(2, 8);
    const T0 = rng.int(12, 20);
    const lin = rng.bool();
    if (lin) {
      const k = rng.int(1, Math.max(1, Math.floor(10 / a)));
      const ans = frac(k * a, 2).add(T0);
      return {
        prompt: R`The air just under a thin dome, the hemisphere \(x^{2} + y^{2} + z^{2} = ${a * a}\), \(z \ge 0\) (in meters), is warmer higher up: the temperature on the dome is \(T = ${terms([[T0, ''], [k, 'z']])}\) degrees Celsius. Find the average temperature over the dome.`,
        ans: ans.tex(), val: ans.value, unit: '°C', f: (x, y, z) => T0 + k * z, avg: true, r: sphere(a), box: [0, PI / 2, 0, TAU], rule: 4,
        wrong: [
          [`${T0 + k * a}`, T0 + k * a, 'That is the temperature at the top of the dome, not the average.'],
          [frac(3 * k * a, 8).add(T0).tex(), T0 + (3 * k * a) / 8, R`That averages over the solid half-ball. Here the average is over the surface: \(\frac{1}{\text{area}}\displaystyle\iint_{S} T\,dS\).`],
          [`${T0}`, T0],
          [frac(k * a, 4).add(T0).tex(), T0 + (k * a) / 4],
        ],
        solution: [
          R`Average \(= \dfrac{1}{\text{area}}\displaystyle\iint_{S} T\,dS\). The area of the dome is \(2\pi \cdot ${a * a} = ${piTex(2 * a * a)}\).`,
          R`With \(dS = ${a * a}\sin\phi\,d\phi\,d\theta\) and \(z = ${cf(a, '\\cos\\phi')}\): \(\displaystyle\iint_{S} z\,dS = 2\pi \cdot ${a ** 3}\int_{0}^{\pi/2} \cos\phi\sin\phi\,d\phi = ${piTex(a ** 3)}\), so the average of \(z\) is \(\frac{${a ** 3}}{${2 * a * a}} = ${frac(a, 2).tex()}\).`,
          R`Average temperature \(= ${T0} + ${k === 1 ? '' : `${k} \\cdot `}${frac(a, 2).tex()} = ${ans.tex()}\) °C.`,
        ],
      };
    }
    const m = rng.pick([2, 3, 4, 6]);
    const ans = frac(T0).sub(frac(2 * a * a, 3 * m));
    return {
      prompt: R`A thin dome is the hemisphere \(x^{2} + y^{2} + z^{2} = ${a * a}\), \(z \ge 0\) (in meters). In the evening its temperature is \(T = ${T0} - \frac{x^{2} + y^{2}}{${m}}\) degrees Celsius, coolest at the rim. Find the average temperature over the dome.`,
      ans: ans.tex(), val: ans.value, unit: '°C', f: (x, y) => T0 - (x * x + y * y) / m, avg: true, r: sphere(a), box: [0, PI / 2, 0, TAU], rule: 4,
      wrong: [
        [frac(T0).sub(frac(a * a, 2 * m)).tex(), T0 - (a * a) / (2 * m), R`That averages \(x^{2} + y^{2}\) over the flat disk under the dome. Over the dome itself the average of \(x^{2} + y^{2}\) is \(\frac{2}{3} \cdot ${a * a}\).`],
        [frac(T0).sub(frac(a * a, m)).tex(), T0 - (a * a) / m, 'That is the temperature at the rim, not the average.'],
        [frac(T0).sub(frac(a * a, 3 * m)).tex(), T0 - (a * a) / (3 * m)],
        [frac(T0).sub(frac(4 * a * a, 3 * m)).tex(), T0 - (4 * a * a) / (3 * m)],
      ],
      solution: [
        R`Average \(= \dfrac{1}{\text{area}}\displaystyle\iint_{S} T\,dS\); the area of the dome is \(${piTex(2 * a * a)}\).`,
        R`With \(dS = ${a * a}\sin\phi\,d\phi\,d\theta\) and \(x^{2} + y^{2} = ${a * a}\sin^{2}\phi\): \(\displaystyle\iint_{S} (x^{2} + y^{2})\,dS = 2\pi \cdot ${a ** 4}\int_{0}^{\pi/2} \sin^{3}\phi\,d\phi = ${piTex(frac(4 * a ** 4, 3))}\). Its average is \(${piTex(frac(4 * a ** 4, 3))} \div ${piTex(2 * a * a)} = ${frac(2 * a * a, 3).tex()}\).`,
        R`Average temperature \(= ${T0} - \frac{1}{${m}} \cdot ${frac(2 * a * a, 3).tex()} = ${ans.tex()}\) °C.`,
      ],
    };
  },
  (rng) => {
    const [h, k] = [rng.int(2, 6), rng.int(1, 3)];
    const ans = frac(2 * k * h ** 3, 3);
    return {
      prompt: R`A thin funnel is the cone \(z = \sqrt{x^{2} + y^{2}}\), \(0 \le z \le ${h}\) (in cm). Its density is \(\delta = ${cf(k, 'z')}\) g/cm². Find its mass.`,
      ans: rootPi(ans, 2), val: ans.value * PI * Math.SQRT2, unit: 'g', f: (x, y, z) => k * z, r: (u, v) => [v * Math.cos(u), v * Math.sin(u), v], box: [0, TAU, 0, h], rule: 4,
      wrong: [
        [piTex(ans), ans.value * PI, R`On this cone \(dS = \sqrt{2}\,v\,dv\,du\): the surface is tilted at \(45^{\circ}\).`],
        [rootPi(frac(k * h * h), 2), PI * Math.SQRT2 * k * h * h, R`\(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = \sqrt{2}\,v\): the factor \(v\) is missing.`],
        [rootPi(ans.div(2), 2), (ans.value * PI * Math.SQRT2) / 2],
        [rootPi(ans.mul(2), 2), ans.value * PI * Math.SQRT2 * 2],
      ],
      solution: [
        R`Parametrize by \(\mathbf{r}(u, v) = \langle v\cos u, v\sin u, v \rangle\), \(0 \le u \le 2\pi\), \(0 \le v \le ${h}\). Then \(\mathbf{r}_{u} \times \mathbf{r}_{v} = \langle v\cos u, v\sin u, -v \rangle\), with length \(\sqrt{2}\,v\).`,
        R`Mass \(= \displaystyle\int_{0}^{2\pi}\int_{0}^{${h}} ${cf(k, 'v')} \cdot \sqrt{2}\,v\,dv\,du = 2\pi \cdot ${k === 1 ? '' : k}\sqrt{2} \cdot \frac{${h ** 3}}{3}\).`,
        R`\(= ${rootPi(ans, 2)}\) g.`,
      ],
    };
  },
];

function hardSurfaceIntegral(rng) {
  const k = rng.pick(SCALAR_H)(rng);
  return areaQ({ rule: 4, ...k }, 'scalar surface integral');
}

const MAPS = [[1, 1, 1, -1], [1, 0, 1, 1], [1, 2, 0, 1], [2, 1, 1, 1], [1, -1, 1, 0], [1, 1, 0, 1], [1, 0, 2, 1]];
function hardTangentPlanePoint(rng) {
  let comps, u0, v0, n;
  do {
    const [al, be, ga, de] = rng.pick(MAPS);
    const zt = rng.sample([[rng.nonzero(-2, 2), 2, 0], [rng.nonzero(-2, 2), 0, 2], [rng.nonzero(-3, 3), 1, 1]], 2);
    comps = [[[al, 1, 0], [be, 0, 1]].filter((t) => t[0]), [[ga, 1, 0], [de, 0, 1]].filter((t) => t[0]), [...zt, [rng.int(-3, 3), 0, 0]].filter((t) => t[0])];
    [u0, v0] = [rng.int(-2, 2), rng.int(-2, 2)];
    n = vcross(comps.map((p) => mpEval(mpD(p, 0), u0, v0)), comps.map((p) => mpEval(mpD(p, 1), u0, v0)));
  } while (isZero(n) || (u0 === 0 && v0 === 0));
  const P = comps.map((p) => mpEval(p, u0, v0));
  return tangentQ({
    prompt: R`Find the tangent plane to the surface \(\mathbf{r}(u, v) = ${V(comps.map(uv))}\) at the point \(${Pt(P)}\).`,
    comps, u0, v0,
    pre: [R`First find the parameters of the point: \(${uv(comps[0])} = ${P[0]}\) and \(${uv(comps[1])} = ${P[1]}\) give \(u = ${u0}\), \(v = ${v0}\); then \(z = ${uv(comps[2])} = ${P[2]}\) checks.`],
    extra: (pl) => {
      if (P[0] === u0 && P[1] === v0) return [];
      const m = vcross(comps.map((p) => mpEval(mpD(p, 0), P[0], P[1])), comps.map((p) => mpEval(mpD(p, 1), P[0], P[1])));
      const w = pl(m, P);
      return w ? [[w, R`The partial derivatives must be evaluated at the parameters of the point, \((u, v) = (${u0}, ${v0})\), not at \((x, y) = (${P[0]}, ${P[1]})\).`]] : [];
    },
    skill: 'tangent plane at a given point',
  });
}

// ───────────── Challenge ─────────────

const CENTROIDS = [
  (rng) => {
    const a = rng.int(2, 12);
    return {
      story: R`A thin dome with constant density is the hemisphere \(x^{2} + y^{2} + z^{2} = ${a * a}\), \(z \ge 0\) (in meters). How high above the floor \(z = 0\) is its center of mass?`,
      ans: frac(a, 2), r: sphere(a), box: [0, PI / 2, 0, TAU], f: () => 1,
      wrong: [[frac(3 * a, 8), 'That is the center of mass of a solid half-ball. A shell has all its mass on the surface, farther from the floor on average.'], [frac(2 * a, 3)], [frac(a, 3)], [frac(a, 4)]],
      solution: [
        R`By symmetry the center of mass is on the \(z\)-axis: \(\bar{z} = \dfrac{\iint_{S} z\,dS}{\iint_{S} dS}\).`,
        R`\(dS = ${a * a}\sin\phi\,d\phi\,d\theta\). Area: \(${piTex(2 * a * a)}\). \(\displaystyle\iint_{S} z\,dS = \int_{0}^{2\pi}\int_{0}^{\pi/2} ${a}\cos\phi \cdot ${a * a}\sin\phi\,d\phi\,d\theta = ${piTex(a ** 3)}\).`,
        R`\(\bar{z} = \dfrac{${piTex(a ** 3)}}{${piTex(2 * a * a)}} = ${frac(a, 2).tex()}\) m.`,
      ],
    };
  },
  (rng) => {
    const a = rng.int(2, 12);
    return {
      story: R`A thin dome is the hemisphere \(x^{2} + y^{2} + z^{2} = ${a * a}\), \(z \ge 0\) (in meters). It is thickest at the top: its density is proportional to the height, \(\delta = kz\). How high above the floor \(z = 0\) is its center of mass?`,
      ans: frac(2 * a, 3), r: sphere(a), box: [0, PI / 2, 0, TAU], f: (x, y, z) => z,
      wrong: [[frac(a, 2), R`That ignores the density. With \(\delta = kz\), weight each piece by \(kz\): \(\bar{z} = \dfrac{\iint z \cdot kz\,dS}{\iint kz\,dS}\).`], [frac(3 * a, 8)], [frac(3 * a, 4)], [frac(a, 3)]],
      solution: [
        R`\(\bar{z} = \dfrac{\iint_{S} z\,\delta\,dS}{\iint_{S} \delta\,dS} = \dfrac{\iint_{S} z^{2}\,dS}{\iint_{S} z\,dS}\) (the constant \(k\) cancels), with \(dS = ${a * a}\sin\phi\,d\phi\,d\theta\), \(z = ${cf(a, '\\cos\\phi')}\).`,
        R`\(\displaystyle\iint_{S} z\,dS = 2\pi \cdot ${a ** 3} \cdot \tfrac{1}{2} = ${piTex(a ** 3)}\) and \(\displaystyle\iint_{S} z^{2}\,dS = 2\pi \cdot ${a ** 4}\int_{0}^{\pi/2} \cos^{2}\phi\sin\phi\,d\phi = ${piTex(frac(2 * a ** 4, 3))}\).`,
        R`\(\bar{z} = ${piTex(frac(2 * a ** 4, 3))} \div ${piTex(a ** 3)} = ${frac(2 * a, 3).tex()}\) m.`,
      ],
    };
  },
  (rng) => {
    const m = rng.int(1, 3);
    const h = m * rng.int(1, 4) * (m === 1 ? rng.int(1, 3) : 1);
    return {
      story: R`A thin funnel with constant density is the cone \(z = ${m === 1 ? '' : m}\sqrt{x^{2} + y^{2}}\), \(0 \le z \le ${h}\) (in cm), with its vertex at the origin. How high above the vertex is its center of mass?`,
      ans: frac(2 * h, 3), r: (u, v) => [v * Math.cos(u), v * Math.sin(u), m * v], box: [0, TAU, 0, h / m], f: () => 1,
      wrong: [[frac(3 * h, 4), 'That is the center of mass of a solid cone. For the shell, the area element grows in proportion to the distance from the vertex.'], [frac(h, 2), 'More of the surface lies near the rim than near the vertex, so the center of mass is above half the height.'], [frac(h, 3), 'That is its distance below the rim, not above the vertex.'], [frac(3 * h, 5)]],
      solution: [
        R`Parametrize by \(\mathbf{r}(u, v) = ${V(['v\\cos u', 'v\\sin u', cf(m, 'v')])}\), \(0 \le v \le ${frac(h, m).tex()}\). Then \(dS = \sqrt{1 + ${m * m}}\,v\,dv\,du\): the area element is proportional to \(v\).`,
        R`\(\bar{z} = \dfrac{\int_{0}^{${frac(h, m).tex()}} ${cf(m, 'v')} \cdot v\,dv}{\int_{0}^{${frac(h, m).tex()}} v\,dv}\) (the constants cancel) \(= ${m === 1 ? '' : m} \cdot \dfrac{2}{3} \cdot ${frac(h, m).tex()}\).`,
        R`\(\bar{z} = ${frac(2 * h, 3).tex()}\) cm, two thirds of the way up.`,
      ],
    };
  },
];

function challengeCentroid(rng) {
  const k = rng.pick(CENTROIDS)(rng);
  const unit = k.story.includes('(in cm)') ? 'cm' : 'm';
  const question = q({
    prompt: k.story,
    correct: k.ans,
    unit,
    wrong: k.wrong.map(([v, why]) => (why ? { value: v, why } : v)),
    solution: k.solution,
    rule: 4,
    skill: 'centroid of a shell',
    check: () => {
      const zbar = surfInt((x, y, z) => z * k.f(x, y, z), k.r, ...k.box) / surfInt(k.f, k.r, ...k.box);
      return checkEqual(zbar, k.ans.value, 1e-5, 'z-bar');
    },
  });
  return question;
}

const FRACS = [[1, 4], [1, 8], [3, 8], [3, 4], [1, 3], [1, 6], [5, 8], [2, 3]];
function challengeWorkBackwards(rng) {
  const kind = rng.pick(['cap', 'cyl', 'zone']);
  if (kind === 'cap') {
    const a = rng.int(2, 12);
    const [fn, fd] = rng.pick(FRACS);
    const f = frac(fn, fd);
    const c = frac(1).sub(f.mul(2)).mul(a);
    return q({
      prompt: R`For what value of \(c\) does the part of the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\) with \(z \ge c\) have exactly \(${f.tex()}\) of the sphere's total area?`,
      correct: c,
      wrong: [
        { value: f.mul(2 * a), why: R`That is the height of the cap, \(${a} - c\), not the level \(c\) of the cut.` },
        { value: c.neg(), why: R`A larger cap needs a lower cut: the area \(2\pi \cdot ${a}(${a} - c)\) grows as \(c\) decreases.` },
        frac(1).sub(f).mul(a),
        frac(1).sub(f.mul(4)).mul(a),
      ],
      solution: [
        R`The cap \(z \ge c\) is \(0 \le \phi \le \phi_{0}\) with \(\cos\phi_{0} = \frac{c}{${a}}\), so its area is \(\displaystyle\int_{0}^{2\pi}\int_{0}^{\phi_{0}} ${a * a}\sin\phi\,d\phi\,d\theta = 2\pi \cdot ${a}(${a} - c)\).`,
        R`Set it equal to \(${f.tex()} \cdot 4\pi \cdot ${a * a}\): \(${a} - c = ${f.mul(2 * a).tex()}\).`,
        R`\(c = ${c.tex()}\).`,
      ],
      rule: 3,
      skill: 'working back from an area',
      check: () => checkEqual(surfInt(() => 1, sphere(a), 0, Math.acos(c.value / a), 0, TAU), f.value * 4 * PI * a * a, 1e-5, 'cap area'),
    });
  }
  if (kind === 'cyl') {
    const [a, h] = [rng.int(2, 6), rng.int(1, 6)];
    const deg = rng.pick([60, 90, 120, 180, 240, 270, 300]);
    const al = frac(deg, 180);
    const A = al.mul(a * h);
    return q({
      prompt: R`The surface \(\mathbf{r}(u, v) = ${V([cf(a, '\\cos u'), cf(a, '\\sin u'), 'v'])}\), \(0 \le u \le \alpha\), \(0 \le v \le ${h}\), has area \(${piTex(A)}\). Find \(\alpha\) (with \(0 < \alpha \le 2\pi\)).`,
      correct: M(`\\alpha = ${piTex(al)}`),
      wrong: [
        { value: M(`\\alpha = ${piTex(al.mul(a))}`), why: R`The area is \(${a}\alpha \cdot ${h}\), because \(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = ${a}\). Divide by \(${a}\) as well.` },
        { value: M(`\\alpha = ${piTex(al.div(a))}`), why: R`\(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = ${a}\), not \(${a * a}\).` },
        M(`\\alpha = ${piTex(al.mul(2))}`),
        M(`\\alpha = ${piTex(al.div(2))}`),
        { value: M(`\\alpha = ${piTex(al.mul(h))}`), why: R`The area is \(${a}\alpha \cdot ${h}\): divide by \(${h}\) as well.` },
        M(`\\alpha = ${piTex(al.mul(a * a))}`),
      ],
      solution: [
        R`\(|\mathbf{r}_{u} \times \mathbf{r}_{v}| = |${V([cf(a, '\\cos u'), cf(a, '\\sin u'), 0])}| = ${a}\), so the area is \(\displaystyle\int_{0}^{${h}}\int_{0}^{\alpha} ${a}\,du\,dv = ${a * h}\alpha\).`,
        R`\(${a * h}\alpha = ${piTex(A)}\) gives \(\alpha = ${piTex(al)}\).`,
      ],
      rule: 3,
      skill: 'working back from an area',
      check: () => checkEqual(surfInt(() => 1, (u, v) => [a * Math.cos(u), a * Math.sin(u), v], 0, al.value * PI, 0, h), A.value * PI, 1e-5, 'area'),
    });
  }
  const a = rng.int(3, 9);
  const w = rng.int(1, 3);
  const c = rng.int(-a, a - w);
  return q({
    prompt: R`A sphere centered at the origin is cut by the planes \(z = ${c}\) and \(z = ${c + w}\). The band of the sphere between them has area \(${piTex(2 * a * w)}\). Find the radius of the sphere.`,
    correct: a,
    wrong: [
      { value: 2 * a, why: R`The band has area \(2\pi R \cdot ${w}\): divide by \(2\pi \cdot ${w}\), not by \(\pi \cdot ${w}\).` },
      w > 1 ? { value: a * w, why: R`The width of the band is \(${w}\); divide by it too.` } : null,
      frac(a, 2),
      a + w,
      a + 1,
    ],
    solution: [
      R`For a sphere of radius \(R\), \(dS = R^{2}\sin\phi\,d\phi\,d\theta\) and \(z = R\cos\phi\). The band from \(z = z_{1}\) to \(z = z_{2}\) has area \(2\pi R^{2}(\cos\phi_{1} - \cos\phi_{2}) = 2\pi R(z_{2} - z_{1})\): it depends only on the width, not on where the band is.`,
      R`\(2\pi R \cdot ${w} = ${piTex(2 * a * w)}\) gives \(R = ${a}\).`,
    ],
    rule: 3,
    skill: 'working back from an area',
    check: () => checkEqual(surfInt(() => 1, sphere(a), Math.acos((c + w) / a), Math.acos(c / a), 0, TAU), 2 * PI * a * w, 1e-5, 'band area'),
  });
}

/** A student's integral for a surface area, with the one slip in it. */
function errorCase(rng) {
  if (rng.bool(0.6)) {
    const a = rng.int(2, 9);
    const a2 = a * a;
    const D = {
      limits: R`The limits are swapped: \(\phi\) runs from \(0\) to \(\pi\) and \(\theta\) from \(0\) to \(2\pi\).`,
      nosin: R`The factor \(\sin\phi\) is missing: \(|\mathbf{r}_{\phi} \times \mathbf{r}_{\theta}| = ${a2}\sin\phi\).`,
      aone: R`The length of \(\mathbf{r}_{\phi} \times \mathbf{r}_{\theta}\) is \(${a2}\sin\phi\), not \(${a}\sin\phi\).`,
      half: R`Only half the sphere is covered: \(\phi\) must run all the way to \(\pi\).`,
      cos: R`The length of \(\mathbf{r}_{\phi} \times \mathbf{r}_{\theta}\) is \(${a2}\sin\phi\), not \(${a2}\cos\phi\).`,
    };
    const W = {
      limits: [`\\int_{0}^{\\pi}\\int_{0}^{2\\pi} ${a2}\\sin\\phi\\,d\\phi\\,d\\theta`, (t, p) => a2 * Math.sin(p), [0, PI, 0, TAU], '0', 0],
      nosin: [`\\int_{0}^{2\\pi}\\int_{0}^{\\pi} ${a2}\\,d\\phi\\,d\\theta`, () => a2, [0, TAU, 0, PI], piTex(2 * a2, '\\pi^{2}'), 2 * a2 * PI * PI],
      aone: [`\\int_{0}^{2\\pi}\\int_{0}^{\\pi} ${a}\\sin\\phi\\,d\\phi\\,d\\theta`, (t, p) => a * Math.sin(p), [0, TAU, 0, PI], piTex(4 * a), 4 * a * PI],
      half: [`\\int_{0}^{2\\pi}\\int_{0}^{\\pi/2} ${a2}\\sin\\phi\\,d\\phi\\,d\\theta`, (t, p) => a2 * Math.sin(p), [0, TAU, 0, PI / 2], piTex(2 * a2), 2 * a2 * PI],
      cos: [`\\int_{0}^{2\\pi}\\int_{0}^{\\pi} ${a2}\\cos\\phi\\,d\\phi\\,d\\theta`, (t, p) => a2 * Math.cos(p), [0, TAU, 0, PI], '0', 0],
    };
    return { D, W, what: R`the area of the sphere \(x^{2} + y^{2} + z^{2} = ${a2}\) with \(\mathbf{r}(\phi, \theta) = ${V([cf(a, '\\sin\\phi\\cos\\theta'), cf(a, '\\sin\\phi\\sin\\theta'), cf(a, '\\cos\\phi')])}\)`, true: [piTex(4 * a2), 4 * PI * a2], r: sphere(a), box: [0, PI, 0, TAU], fix: R`\(\displaystyle\int_{0}^{2\pi}\int_{0}^{\pi} ${a2}\sin\phi\,d\phi\,d\theta = ${piTex(4 * a2)}\)` };
  }
  const [a, h] = [rng.int(2, 6), rng.int(2, 8)];
  const D = {
    one: R`\(|\mathbf{r}_{\theta} \times \mathbf{r}_{z}| = ${a}\), not \(1\): the \(\theta\)-direction is stretched by the radius.`,
    sq: R`\(|\mathbf{r}_{\theta} \times \mathbf{r}_{z}| = ${a}\), not \(${a * a}\).`,
    half: R`\(\theta\) must run all the way to \(2\pi\) to go around the cylinder.`,
    sum: R`The area element is the length of the cross product \(\mathbf{r}_{\theta} \times \mathbf{r}_{z}\), not \(|\mathbf{r}_{\theta}| + |\mathbf{r}_{z}|\).`,
  };
  const W = {
    one: [`\\int_{0}^{${h}}\\int_{0}^{2\\pi} 1\\,d\\theta\\,dz`, () => 1, [0, h, 0, TAU], piTex(2 * h), 2 * PI * h],
    sq: [`\\int_{0}^{${h}}\\int_{0}^{2\\pi} ${a * a}\\,d\\theta\\,dz`, () => a * a, [0, h, 0, TAU], piTex(2 * a * a * h), 2 * PI * a * a * h],
    half: [`\\int_{0}^{${h}}\\int_{0}^{\\pi} ${a}\\,d\\theta\\,dz`, () => a, [0, h, 0, PI], piTex(a * h), PI * a * h],
    sum: [`\\int_{0}^{${h}}\\int_{0}^{2\\pi} ${a + 1}\\,d\\theta\\,dz`, () => a + 1, [0, h, 0, TAU], piTex(2 * (a + 1) * h), 2 * PI * (a + 1) * h],
  };
  return { D, W, what: R`the area of the cylinder \(x^{2} + y^{2} = ${a * a}\), \(0 \le z \le ${h}\), with \(\mathbf{r}(\theta, z) = ${V([cf(a, '\\cos\\theta'), cf(a, '\\sin\\theta'), 'z'])}\)`, true: [piTex(2 * a * h), 2 * PI * a * h], r: (t, z) => [a * Math.cos(t), a * Math.sin(t), z], box: [0, TAU, 0, h], fix: R`\(\displaystyle\int_{0}^{${h}}\int_{0}^{2\pi} ${a}\,d\theta\,dz = ${piTex(2 * a * h)}\)` };
}

function challengeSpotError(rng) {
  const k = errorCase(rng);
  const slip = rng.pick(Object.keys(k.W));
  const [tex, f, lim, res, val] = k.W[slip];
  const name = person(rng);
  return q({
    prompt: R`${name} finds ${k.what} and writes
\[${tex} = ${res}.\]
What went wrong?`,
    correct: k.D[slip],
    wrong: rng.shuffle(Object.keys(k.D).filter((s) => s !== slip)).map((s) => k.D[s]),
    solution: [k.D[slip], R`The correct computation is ${k.fix}.`],
    rule: 3,
    skill: 'checking a surface-area set-up',
    check: () => {
      const got = integrate2((s, t) => f(s, t), ...lim, 60);
      if (!close(got, val, 1e-6) && !(Math.abs(got) < 1e-6 && val === 0)) return `the shown integral is ${got}, not ${val}`;
      const A = surfInt(() => 1, k.r, ...k.box);
      return close(A, k.true[1], 1e-5) && !close(A, val, 1e-3) ? true : 'the slip gives the right area';
    },
  });
}

const REVS = [
  (rng) => {
    const [p, qq] = rng.pick([[0, 2], [2, 6], [0, 6], [6, 12], [2, 12], [0, 12]]);
    const [P, Q] = [Math.sqrt(4 * p + 1), Math.sqrt(4 * qq + 1)];
    const ans = frac(Q ** 3 - P ** 3, 6);
    return {
      fTex: '\\sqrt{x}', p, q: qq, ans: piTex(ans), val: ans.value * PI, r: (t, th) => [t * t, t * Math.cos(th), t * Math.sin(th)], box: [Math.sqrt(p), Math.sqrt(qq), 0, TAU],
      wrong: [
        p === 0 ? [rootPi(frac(4 * qq, 3), qq), (4 * PI * qq ** 1.5) / 3, R`\(|\mathbf{r}_{x} \times \mathbf{r}_{\theta}| = f(x)\sqrt{1 + f'(x)^{2}}\): the factor \(\sqrt{1 + f'(x)^{2}}\) is missing.`] : [piTex(frac(Q ** 3 - 1, 6)), (PI * (Q ** 3 - 1)) / 6, R`The lower limit is \(x = ${p}\), where \(\left(x + \frac{1}{4}\right)^{3/2} = \frac{${P ** 3}}{8}\).`],
        [piTex(ans.div(2)), (ans.value * PI) / 2, R`The \(\theta\)-integral contributes \(2\pi\).`],
        [piTex(ans.mul(2)), ans.value * PI * 2],
        [piTex(ans.mul(3)), ans.value * PI * 3],
      ],
      solution: [
        R`\(f(x) = \sqrt{x}\), \(f'(x) = \frac{1}{2\sqrt{x}}\), so \(f\sqrt{1 + f'^{2}} = \sqrt{x}\sqrt{1 + \frac{1}{4x}} = \sqrt{x + \frac{1}{4}}\).`,
        R`Area \(= \displaystyle\int_{0}^{2\pi}\int_{${p}}^{${qq}} \sqrt{x + \tfrac{1}{4}}\,dx\,d\theta = 2\pi \cdot \tfrac{2}{3}\left[\left(x + \tfrac{1}{4}\right)^{3/2}\right]_{${p}}^{${qq}} = \tfrac{4\pi}{3} \cdot \frac{${Q ** 3} - ${P ** 3}}{8}\).`,
        R`\(= ${piTex(ans)}\).`,
      ],
    };
  },
  (rng) => {
    const Rr = rng.int(3, 8);
    const p = rng.int(-Rr, Rr - 1);
    const qq = rng.int(p + 1, Rr);
    const ans = frac(2 * Rr * (qq - p));
    return {
      fTex: `\\sqrt{${Rr * Rr} - x^{2}}`, p, q: qq, ans: piTex(ans), val: ans.value * PI, r: (ph, th) => [Rr * Math.cos(ph), Rr * Math.sin(ph) * Math.cos(th), Rr * Math.sin(ph) * Math.sin(th)], box: [Math.acos(qq / Rr), Math.acos(p / Rr), 0, TAU],
      wrong: [
        [piTex(ans.div(2)), (ans.value * PI) / 2, R`The \(\theta\)-integral contributes \(2\pi\).`],
        [piTex(ans.mul(Rr)), ans.value * PI * Rr, R`\(f\sqrt{1 + f'^{2}} = \sqrt{${Rr * Rr} - x^{2}} \cdot \dfrac{${Rr}}{\sqrt{${Rr * Rr} - x^{2}}} = ${Rr}\), not \(${Rr * Rr}\).`],
        [piTex(ans.mul(2)), ans.value * PI * 2],
        [piTex(frac(Rr * Rr * (qq - p))), PI * Rr * Rr * (qq - p)],
      ],
      solution: [
        R`\(f(x) = \sqrt{${Rr * Rr} - x^{2}}\), \(f'(x) = \dfrac{-x}{\sqrt{${Rr * Rr} - x^{2}}}\), so \(1 + f'^{2} = \dfrac{${Rr * Rr}}{${Rr * Rr} - x^{2}}\) and \(f\sqrt{1 + f'^{2}} = ${Rr}\).`,
        R`Area \(= \displaystyle\int_{0}^{2\pi}\int_{${p}}^{${qq}} ${Rr}\,dx\,d\theta = 2\pi \cdot ${Rr} \cdot ${qq - p} = ${piTex(ans)}\). (This is a band of a sphere of radius \(${Rr}\).)`,
      ],
    };
  },
  (rng) => {
    const [mn, md] = rng.pick([[3, 4], [4, 3], [1, 1], [2, 1]]);
    const N = mn * mn + md * md;
    const c0 = rng.int(1, 4);
    const p = rng.int(0, 2);
    const qq = rng.int(p + 1, p + 4);
    const f = (x) => frac(mn * x, md).add(c0);
    const fN = (x) => (mn * x) / md + c0;
    const S = f(p).add(f(qq)).mul(qq - p);
    const ans = S.div(md);
    const k = rootOver(1, N, md);
    const sN = Math.sqrt(N) / md;
    const fTex = `${md === 1 ? cf(mn, 'x') : `\\tfrac{${mn}}{${md}}x`} + ${c0}`;
    return {
      fTex, p, q: qq, ans: rootPi(ans, N), val: PI * S.value * sN, r: (x, th) => [x, fN(x) * Math.cos(th), fN(x) * Math.sin(th)], box: [p, qq, 0, TAU],
      wrong: [
        [piTex(S), PI * S.value, R`\(|\mathbf{r}_{x} \times \mathbf{r}_{\theta}| = f(x)\sqrt{1 + f'(x)^{2}}\): the factor \(${k}\) is missing.`],
        [rootPi(ans.div(2), N), (PI * S.value * sN) / 2, R`The \(\theta\)-integral contributes \(2\pi\).`],
        [rootPi(ans.mul(2), N), PI * S.value * sN * 2],
        [rootPi(ans.mul(3), N), PI * S.value * sN * 3],
      ],
      solution: [
        R`\(f'(x) = ${frac(mn, md).tex()}\), so \(\sqrt{1 + f'^{2}} = ${k}\), a constant.`,
        R`Area \(= \displaystyle\int_{0}^{2\pi}\int_{${p}}^{${qq}} \left(${fTex}\right) \cdot ${k}\,dx\,d\theta = 2\pi \cdot ${k} \cdot \frac{(${f(p).tex()} + ${f(qq).tex()}) \cdot ${qq - p}}{2}\).`,
        R`\(= ${rootPi(ans, N)}\). (The surface is a band of a cone.)`,
      ],
    };
  },
];

function challengeRevolution(rng) {
  const k = rng.pick(REVS)(rng);
  return areaQ({
    ...k,
    prompt: R`The curve \(y = ${k.fTex}\), \(${k.p} \le x \le ${k.q}\), is rotated about the \(x\)-axis. Using \(\mathbf{r}(x, \theta) = \langle x, f(x)\cos\theta, f(x)\sin\theta \rangle\), \(0 \le \theta \le 2\pi\), find the area of the surface.`,
    solution: [R`\(\mathbf{r}_{x} = \langle 1, f'\cos\theta, f'\sin\theta \rangle\) and \(\mathbf{r}_{\theta} = \langle 0, -f\sin\theta, f\cos\theta \rangle\), so \(\mathbf{r}_{x} \times \mathbf{r}_{\theta} = \langle ff', -f\cos\theta, -f\sin\theta \rangle\) and \(|\mathbf{r}_{x} \times \mathbf{r}_{\theta}| = f\sqrt{1 + f'^{2}}\).`, ...k.solution],
  }, 'surface of revolution');
}

// ───────────── Pictures ─────────────

/** The (θ, φ) or (θ, z) parameter domain in degrees, with the chosen piece shaded. */
function domainPlot({ th, lo, hi, yMax, yStep, yName, alt }) {
  return {
    type: 'plot', x: [0, 360], y: [0, yMax], step: [90, yStep], axisLabels: ['θ (degrees)', yName],
    polygons: [{ points: [[0, lo], [th, lo], [th, hi], [0, hi]], color: 'a' }],
    alt,
  };
}

const PH_OPTS = [0, 60, 90, 120, 180].map((d) => ({ value: d, label: `${d}°` }));

export default {
  id: 'parametric-surfaces',
  title: 'Parametric Surfaces & Surface Integrals',
  summary: 'Describe surfaces by r(u, v), find their tangent planes and areas, and integrate a density or temperature over a surface.',
  standards: ['Calculus III: parametric surfaces and their areas', 'Calculus III: surface integrals'],

  explain: {
    intro: R`A curve needs one parameter; a surface needs two. A **parametric surface** is a vector function \(\mathbf{r}(u, v)\) whose tip sweeps out the surface as \((u, v)\) ranges over a region \(D\) of the \(uv\)-plane. The two partial derivatives \(\mathbf{r}_{u}\) and \(\mathbf{r}_{v}\) are tangent to the surface, so their cross product is normal to it, and its length measures how much a small patch of \(D\) is stretched. That one fact gives tangent planes, surface areas and integrals over surfaces.`,
    rules: [
      { title: 'Reading a parametrization', text: R`To identify the surface \(\mathbf{r}(u, v) = \langle x(u, v), y(u, v), z(u, v) \rangle\), eliminate \(u\) and \(v\) to get one equation in \(x\), \(y\), \(z\), and use the domain \(D\) to see which part is covered. A point lies on the surface when some \((u, v)\) in \(D\) gives \(\mathbf{r}(u, v) =\) that point; equivalently, it satisfies the equation and lies in the covered part.`, example: R`\(\langle 3\cos u, 3\sin u, v \rangle\): \(x^{2} + y^{2} = 9\), a cylinder about the \(z\)-axis. The point \((0, 3, 5)\) has \(u = \frac{\pi}{2}\), \(v = 5\).` },
      { title: 'Standard parametrizations', text: R`Graph \(z = f(x, y)\): \(\langle u, v, f(u, v) \rangle\). Sphere of radius \(a\): \(\langle a\sin\phi\cos\theta, a\sin\phi\sin\theta, a\cos\phi \rangle\), \(0 \le \phi \le \pi\), \(0 \le \theta \le 2\pi\). Cylinder \(x^{2} + y^{2} = a^{2}\): \(\langle a\cos\theta, a\sin\theta, z \rangle\). Cone \(z = m\sqrt{x^{2} + y^{2}}\): \(\langle r\cos\theta, r\sin\theta, mr \rangle\), \(r \ge 0\). Plane through \(P\), \(Q\), \(R\): \(P + u\,\overrightarrow{PQ} + v\,\overrightarrow{PR}\). Curve \(y = f(x)\) rotated about the \(x\)-axis: \(\langle x, f(x)\cos\theta, f(x)\sin\theta \rangle\).`, example: R`The plane through \((1, 0, 0)\), \((0, 2, 0)\), \((0, 0, 3)\): \(\langle 1 - u - v, 2u, 3v \rangle\).` },
      { title: 'Grid curves and the tangent plane', text: R`Fixing \(u\) and letting \(v\) vary traces a **grid curve** on the surface (and likewise with \(v\) fixed). \(\mathbf{r}_{u}\) and \(\mathbf{r}_{v}\) are tangent to the two grid curves through a point, so \(\mathbf{n} = \mathbf{r}_{u} \times \mathbf{r}_{v}\) is normal to the surface there. The tangent plane at \(P = \mathbf{r}(u_{0}, v_{0})\) is \(\mathbf{n} \cdot (\langle x, y, z \rangle - P) = 0\). The surface is smooth where \(\mathbf{n} \ne \mathbf{0}\).`, example: R`\(\langle u^{2}, v^{2}, u + 2v \rangle\) at \((u, v) = (1, 1)\): \(\mathbf{r}_{u} = \langle 2, 0, 1 \rangle\), \(\mathbf{r}_{v} = \langle 0, 2, 2 \rangle\), \(\mathbf{n} = \langle -2, -4, 4 \rangle\); the plane is \(x + 2y - 2z = -3\).` },
      { title: 'Surface area', text: R`A small rectangle \(\Delta u \times \Delta v\) in \(D\) maps to a patch of area about \(|\mathbf{r}_{u} \times \mathbf{r}_{v}|\,\Delta u\,\Delta v\). So \(dS = |\mathbf{r}_{u} \times \mathbf{r}_{v}|\,du\,dv\) and the area is \(\displaystyle\iint_{D} |\mathbf{r}_{u} \times \mathbf{r}_{v}|\,dA\). For a sphere of radius \(a\), \(dS = a^{2}\sin\phi\,d\phi\,d\theta\); for a cylinder of radius \(a\), \(dS = a\,d\theta\,dz\); for a graph, \(dS = \sqrt{1 + f_{x}^{2} + f_{y}^{2}}\,dA\).`, example: R`Sphere of radius \(a\): \(\displaystyle\int_{0}^{2\pi}\int_{0}^{\pi} a^{2}\sin\phi\,d\phi\,d\theta = 4\pi a^{2}\).` },
      { title: 'Integrating a function over a surface', text: R`\(\displaystyle\iint_{S} f\,dS = \iint_{D} f(\mathbf{r}(u, v))\,|\mathbf{r}_{u} \times \mathbf{r}_{v}|\,dA\). With \(f\) a density it gives the **mass** of a thin shell. Dividing by the area gives the **average** of \(f\) on \(S\). The centroid has \(\bar{z} = \frac{1}{\text{area}}\iint_{S} z\,dS\) (with a density \(\delta\): \(\iint z\delta\,dS \big/ \iint \delta\,dS\)).`, example: R`On the hemisphere of radius \(a\), \(\iint z\,dS = \pi a^{3}\) and the area is \(2\pi a^{2}\), so the shell's centroid is at height \(\frac{a}{2}\).` },
      { title: 'Orientation', text: R`A surface is **oriented** by choosing one of its two unit normals at every point, continuously. A closed surface (a sphere, a cylinder with its ends) is usually given the **outward** normal; a graph \(z = f(x, y)\) the **upward** one, \(\langle -f_{x}, -f_{y}, 1 \rangle\). A parametrization comes with the normal \(\mathbf{r}_{u} \times \mathbf{r}_{v}\); swapping \(u\) and \(v\) reverses it. Orientation does not affect area or \(\iint f\,dS\), but it fixes the sign of a flux.`, example: R`For the sphere, \(\mathbf{r}_{\phi} \times \mathbf{r}_{\theta} = a\sin\phi\,\langle x, y, z \rangle\) points outward; \(\mathbf{r}_{\theta} \times \mathbf{r}_{\phi}\) points inward.` },
    ],
    vocab: [
      { term: 'parameter domain', def: R`The region \(D\) of \((u, v)\) values; the surface is the image of \(D\) under \(\mathbf{r}\).` },
      { term: 'grid curve', def: R`The curve on a surface traced when one parameter is held fixed, such as a circle of latitude (\(\phi\) fixed) or a meridian (\(\theta\) fixed) on a sphere.` },
      { term: 'surface element', def: R`\(dS = |\mathbf{r}_{u} \times \mathbf{r}_{v}|\,du\,dv\), the area of a small patch of the surface.` },
      { term: 'smooth surface', def: R`One whose parametrization has \(\mathbf{r}_{u} \times \mathbf{r}_{v} \ne \mathbf{0}\), so a tangent plane exists at every point.` },
      { term: 'orientation', def: 'A continuous choice of unit normal over the whole surface (outward or inward, upward or downward).' },
    ],
    mistakes: [
      R`Integrating \(f\,du\,dv\) and forgetting the stretching factor \(|\mathbf{r}_{u} \times \mathbf{r}_{v}|\).`,
      R`Using \(a\sin\phi\) or \(a^{2}\) for the sphere's \(|\mathbf{r}_{\phi} \times \mathbf{r}_{\theta}|\). It is \(a^{2}\sin\phi\).`,
      R`Swapping the ranges of \(\phi\) (\(0\) to \(\pi\)) and \(\theta\) (\(0\) to \(2\pi\)) on a sphere.`,
      R`Writing \(\langle 9\cos u, 9\sin u, v \rangle\) for \(x^{2} + y^{2} = 9\). The radius is 3.`,
      'Evaluating the partial derivatives at the coordinates (x, y) of a point instead of at its parameters (u, v).',
      'Computing an average without dividing by the area of the surface.',
    ],
    visual: {
      type: 'plot', x: [0, 360], y: [0, 180], step: [90, 30], axisLabels: ['θ (degrees)', 'φ (degrees)'],
      segments: [
        { from: [0, 60], to: [360, 60], color: 'b', label: 'φ = 60°' },
        { from: [0, 120], to: [360, 120], color: 'b' },
        { from: [90, 0], to: [90, 180], color: 'c', label: 'θ = 90°' },
        { from: [270, 0], to: [270, 180], color: 'c' },
      ],
      alt: 'The parameter domain of a sphere: θ from 0° to 360° across, φ from 0° to 180° up. Horizontal lines (φ fixed, such as φ = 60° and φ = 120°) map to circles of latitude on the sphere. Vertical lines (θ fixed, such as θ = 90° and θ = 270°) map to meridians, half-circles from the north pole (φ = 0°) to the south pole (φ = 180°).',
    },
  },

  examples: [
    {
      title: 'Identify a surface and locate a point on it',
      problem: R`Identify the surface \(\mathbf{r}(u, v) = \langle v\cos u, v\sin u, v^{2} \rangle\), \(0 \le u \le 2\pi\), \(v \ge 0\), and find \((u, v)\) for the point \((0, 2, 4)\).`,
      steps: [
        R`\(x^{2} + y^{2} = v^{2}(\cos^{2} u + \sin^{2} u) = v^{2}\), and \(z = v^{2}\). So \(z = x^{2} + y^{2}\): a paraboloid, all of it (\(v \ge 0\) reaches every distance from the axis).`,
        R`At \((0, 2, 4)\): \(v^{2} = 4\) with \(v \ge 0\), so \(v = 2\).`,
        R`Then \(2\cos u = 0\) and \(2\sin u = 2\): \(u = \frac{\pi}{2}\).`,
      ],
      answer: R`The paraboloid \(z = x^{2} + y^{2}\); \((u, v) = \left(\frac{\pi}{2}, 2\right)\)`,
    },
    {
      title: 'Tangent plane to a parametric surface',
      problem: R`Find the tangent plane to \(\mathbf{r}(u, v) = \langle u^{2}, v^{2}, u + 2v \rangle\) at the point \((1, 1, 3)\).`,
      steps: [
        R`The point comes from \(u^{2} = 1\), \(v^{2} = 1\), \(u + 2v = 3\): \((u, v) = (1, 1)\).`,
        R`\(\mathbf{r}_{u} = \langle 2u, 0, 1 \rangle = \langle 2, 0, 1 \rangle\) and \(\mathbf{r}_{v} = \langle 0, 2v, 2 \rangle = \langle 0, 2, 2 \rangle\).`,
        R`\(\mathbf{n} = \mathbf{r}_{u} \times \mathbf{r}_{v} = \langle 0 \cdot 2 - 1 \cdot 2,\; 1 \cdot 0 - 2 \cdot 2,\; 2 \cdot 2 - 0 \cdot 0 \rangle = \langle -2, -4, 4 \rangle\).`,
        R`\(-2(x - 1) - 4(y - 1) + 4(z - 3) = 0\), or, dividing by \(-2\), \(x + 2y - 2z = -3\).`,
      ],
      answer: R`\(x + 2y - 2z = -3\)`,
    },
    {
      title: 'The area of a sphere',
      problem: R`Use \(\mathbf{r}(\phi, \theta) = \langle 5\sin\phi\cos\theta, 5\sin\phi\sin\theta, 5\cos\phi \rangle\) to find the area of the sphere of radius 5.`,
      steps: [
        R`\(\mathbf{r}_{\phi} = \langle 5\cos\phi\cos\theta, 5\cos\phi\sin\theta, -5\sin\phi \rangle\), \(\mathbf{r}_{\theta} = \langle -5\sin\phi\sin\theta, 5\sin\phi\cos\theta, 0 \rangle\).`,
        R`\(\mathbf{r}_{\phi} \times \mathbf{r}_{\theta} = 25\sin\phi\,\langle \sin\phi\cos\theta, \sin\phi\sin\theta, \cos\phi \rangle\), a vector of length \(25\sin\phi\) (as \(\sin\phi \ge 0\)).`,
        R`Area \(= \displaystyle\int_{0}^{2\pi}\int_{0}^{\pi} 25\sin\phi\,d\phi\,d\theta = 25 \cdot 2 \cdot 2\pi\).`,
      ],
      answer: R`\(100\pi\), which is \(4\pi a^{2}\) with \(a = 5\)`,
    },
    {
      title: 'Word problem: the mass of a dome',
      word: true,
      problem: R`A thin dome is the hemisphere \(x^{2} + y^{2} + z^{2} = 9\), \(z \ge 0\) (in meters). Its density is \(\delta = 1 + z\) kg/m², heavier near the top. Find its mass.`,
      steps: [
        R`Mass \(= \displaystyle\iint_{S} \delta\,dS\). With \(\phi\) and \(\theta\), \(dS = 9\sin\phi\,d\phi\,d\theta\), \(0 \le \phi \le \frac{\pi}{2}\), and \(z = 3\cos\phi\).`,
        R`\(\displaystyle\iint_{S} 1\,dS\) is the area of the dome, \(2\pi \cdot 9 = 18\pi\).`,
        R`\(\displaystyle\iint_{S} z\,dS = \int_{0}^{2\pi}\int_{0}^{\pi/2} 3\cos\phi \cdot 9\sin\phi\,d\phi\,d\theta = 27 \cdot \tfrac{1}{2} \cdot 2\pi = 27\pi\).`,
        R`Mass \(= 18\pi + 27\pi = 45\pi \approx 141.4\) kg.`,
      ],
      answer: R`\(45\pi \approx 141.4\) kilograms`,
    },
  ],

  models: [
    {
      id: 'piece-of-a-sphere',
      title: 'The area of a piece of a sphere',
      intro: 'Choose the radius and a rectangle in the (θ, φ) parameter domain. The piece of the sphere it maps to is a band between two circles of latitude.',
      inputs: [
        { name: 'a', label: 'Radius a', type: 'int', min: 1, max: 10, value: 2 },
        { name: 'p1', label: 'φ from', type: 'select', value: 0, options: PH_OPTS },
        { name: 'p2', label: 'φ to', type: 'select', value: 90, options: PH_OPTS },
        { name: 'th', label: 'θ from 0° to', type: 'select', value: 360, options: [90, 180, 270, 360].map((d) => ({ value: d, label: `${d}°` })) },
      ],
      compute({ a, p1, p2, th }) {
        if (p2 <= p1) return { error: 'The φ-range must run upward: choose "φ to" larger than "φ from".' };
        const c = (d) => frac(Math.round(2 * Math.cos(ang(d))), 2);
        const dc = c(p1).sub(c(p2));
        const A = dc.mul(a * a).mul(frac(th, 180));
        return {
          problem: R`Find the area of the part of the sphere of radius \(${a}\) with \(${angleTex(p1)} \le \phi \le ${angleTex(p2)}\) and \(0 \le \theta \le ${angleTex(th)}\).`,
          steps: [
            R`\(\mathbf{r}(\phi, \theta) = ${V([cf(a, '\\sin\\phi\\cos\\theta'), cf(a, '\\sin\\phi\\sin\\theta'), cf(a, '\\cos\\phi')])}\) has \(|\mathbf{r}_{\phi} \times \mathbf{r}_{\theta}| = ${a * a === 1 ? '' : a * a}\sin\phi\).`,
            R`\(\displaystyle\int_{${angleTex(p1)}}^{${angleTex(p2)}} ${a * a === 1 ? '' : a * a}\sin\phi\,d\phi = ${a * a}\left(${c(p1).tex()} - ${paren(c(p2))}\right) = ${dc.mul(a * a).tex()}\).`,
            R`Multiply by the length of the \(\theta\)-interval, \(${angleTex(th)}\): area \(= ${piTex(A)} \approx ${num(A.value * PI, { places: 2 })}\).`,
            R`That is ${num((100 * A.value) / (4 * a * a), { places: 1 })}% of the whole sphere, \(${piTex(4 * a * a)}\).`,
          ],
          answer: R`\(${piTex(A)} \approx ${num(A.value * PI, { places: 2 })}\)`,
          visual: domainPlot({ th, lo: p1, hi: p2, yMax: 180, yStep: 30, yName: 'φ (degrees)', alt: `The (θ, φ) parameter domain of the sphere, θ from 0° to 360° across and φ from 0° to 180° up. The shaded rectangle is 0° ≤ θ ≤ ${th}°, ${p1}° ≤ φ ≤ ${p2}°; it maps to the piece of the sphere whose area is computed.` }),
        };
      },
    },
    {
      id: 'mass-of-a-can',
      title: 'Word problem: the mass of a can’s side',
      word: true,
      intro: 'The curved side of a thin can is a cylinder of radius a and height h. Its density is p + q·z grams per cm², where z is the height above the bottom.',
      inputs: [
        { name: 'a', label: 'Radius a (cm)', type: 'int', min: 1, max: 10, value: 4 },
        { name: 'h', label: 'Height h (cm)', type: 'int', min: 1, max: 20, value: 10 },
        { name: 'p', label: 'Density at the bottom, p (g/cm²)', type: 'int', min: 0, max: 10, value: 2 },
        { name: 'k', label: 'Increase per cm of height, q (g/cm²)', type: 'int', min: 0, max: 5, value: 1 },
      ],
      compute({ a, h, p, k }) {
        if (p === 0 && k === 0) return { error: 'With p = 0 and q = 0 the can would have no mass. Make at least one of them positive.' };
        const mass = a * h * (2 * p + k * h);
        const dens = terms([[p, ''], [k, 'z']]);
        return {
          problem: R`The side of a can is the cylinder \(x^{2} + y^{2} = ${a * a}\), \(0 \le z \le ${h}\) (in cm), with density \(\delta = ${dens}\) g/cm². Find its mass.`,
          steps: [
            R`Parametrize by \(\mathbf{r}(\theta, z) = ${V([cf(a, '\\cos\\theta'), cf(a, '\\sin\\theta'), 'z'])}\): \(\mathbf{r}_{\theta} \times \mathbf{r}_{z} = ${V([cf(a, '\\cos\\theta'), cf(a, '\\sin\\theta'), 0])}\), so \(dS = ${a === 1 ? '' : a}\,d\theta\,dz\).`,
            R`Mass \(= \displaystyle\int_{0}^{2\pi}\int_{0}^{${h}} \left(${dens}\right) \cdot ${a}\,dz\,d\theta = 2\pi \cdot ${a}\left(${p} \cdot ${h} + ${k} \cdot \frac{${h * h}}{2}\right)\).`,
            R`\(= ${piTex(mass)} \approx ${num(mass * PI, { places: 1 })}\) g.`,
            k > 0 ? `The density rises with height, so the top half of the side holds more than half of the mass.` : 'The density is constant, so the mass is the density times the area of the side.',
          ],
          answer: R`\(${piTex(mass)} \approx ${num(mass * PI, { places: 1 })}\) grams`,
          visual: domainPlot({ th: 360, lo: 0, hi: h, yMax: h + 1, yStep: h > 10 ? 5 : h > 5 ? 2 : 1, yName: 'z (cm)', alt: `The (θ, z) parameter domain of the can's side: the shaded rectangle 0° ≤ θ ≤ 360°, 0 ≤ z ≤ ${h}. Each small patch of it has area ${a} times its area in the parameter domain, because dS = ${a} dθ dz.` }),
        };
      },
    },
  ],

  quiz: {
    easy: [easyIdentifySurface, easyFindParameters, easyParametrize, easyGridCurve],
    medium: [mediumTangentPlane, mediumSurfaceArea, mediumOrientation, mediumShellMass],
    hard: [hardSurfaceArea, hardSurfaceIntegral, hardTangentPlanePoint],
    challenge: [challengeCentroid, challengeWorkBackwards, challengeSpotError, challengeRevolution],
  },
};
