import { R, q, frac, num, paren, terms, dot, sqrtTex, integrate2, numPartial, checkEqual, close } from '../../lib/index.js';
import { M, V, Pt, piTex, exactCos, rootOver, mpTex, mpEval, mpD, mpClean, mpAdd, mpScale, fp, exactDouble, lineInt, fluxInt, surfInt } from './_shared.js';

const PI = Math.PI;
const cf = (n, s) => (n === 1 ? s : n === -1 ? `-${s}` : `${n}${s}`);
const wrapSum = (t) => (t.includes(' + ') || t.includes(' - ') ? `\\left(${t}\\right)` : t);
const wrapNeg = (t) => (t.startsWith('-') ? `\\left(${t}\\right)` : wrapSum(t));
// Polynomials in x, y, z are lists of terms [coef, i, j, k]. `pt` prints one in a fixed order, so equal polynomials print alike.
const canon = (p) => mpClean(p).sort((a, b) => b[1] + b[2] + b[3] - a[1] - a[2] - a[3] || b[1] - a[1] || b[2] - a[2]);
const pt = (p) => mpTex(canon(p));
const sum = (ps) => ps.reduce((a, b) => mpAdd(a, b), []);
const minus = (a, b) => mpAdd(a, mpScale(b, -1));
const vecTex = (F) => V(F.map(pt));
const fieldFn = (F) => (x, y, z) => F.map((p) => mpEval(p, x, y, z));
const curlOf = ([P, Q, S]) => [minus(mpD(S, 1), mpD(Q, 2)), minus(mpD(P, 2), mpD(S, 0)), minus(mpD(Q, 0), mpD(P, 1))];
const divOf = (F) => sum(F.map((p, i) => mpD(p, i)));
const SPOTS = [[0.7, -1.2, 0.9], [-0.5, 0.8, 1.3]];
// Numeric divergence and curl of a field (x, y, z) → [P, Q, R], from the definitions.
const part = (F, p, i, j) => numPartial((x, y, z) => F(x, y, z)[i], p, j);
const divNum = (F, p) => part(F, p, 0, 0) + part(F, p, 1, 1) + part(F, p, 2, 2);
const curlNum = (F, p) => [part(F, p, 2, 1) - part(F, p, 1, 2), part(F, p, 0, 2) - part(F, p, 2, 0), part(F, p, 1, 0) - part(F, p, 0, 1)];
const sameVec = (a, b) => a.every((v, i) => close(v, b[i], 1e-5));
/** For checks: the wrong candidates that q() actually used (it puts the correct answer first), or null if they are not three different ones. */
function shownWrong(question, cands, strOf) {
  const shown = cands.filter((c) => question.choices.indexOf(strOf(c)) > 0);
  return new Set(shown.map(strOf)).size === 3 ? shown : null;
}
// Parametrized surfaces whose normal r_u × r_v points outward (sphere, cylinder wall) or upward (disk).
const sphere = (a) => (u, v) => [a * Math.sin(u) * Math.cos(v), a * Math.sin(u) * Math.sin(v), a * Math.cos(u)];
const wall = (a) => (u, v) => [a * Math.cos(u), a * Math.sin(u), v];
const disk = (z) => (u, v) => [u * Math.cos(v), u * Math.sin(v), z];
/** Outward flux through a closed surface, face by face: a sphere, a box with a corner at the origin, or a cylinder on the xy-plane. */
const fluxOut = {
  sphere: (F, a) => fluxInt(F, sphere(a), 0, PI, 0, 2 * PI),
  box: (F, [A, B, C]) => integrate2((y, z) => F(A, y, z)[0] - F(0, y, z)[0], 0, B, 0, C, 40) + integrate2((x, z) => F(x, B, z)[1] - F(x, 0, z)[1], 0, A, 0, C, 40) + integrate2((x, y) => F(x, y, C)[2] - F(x, y, 0)[2], 0, A, 0, B, 40),
  cylinder: (F, [a, h]) => fluxInt(F, wall(a), 0, 2 * PI, 0, h) + fluxInt(F, disk(h), 0, a, 0, 2 * PI) - fluxInt(F, disk(0), 0, a, 0, 2 * PI),
};

// ───────────── Easy ─────────────

const EXPS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [2, 0, 0], [0, 2, 0], [0, 0, 2], [2, 1, 0], [1, 2, 0], [0, 1, 2], [2, 0, 1], [1, 0, 2], [0, 2, 1], [1, 1, 1]];
/** A random one-term component; `need` forces it to contain that variable. */
const mono = (rng, need) => [[rng.nonzero(-4, 4), ...rng.pick(EXPS.filter((e) => need == null || e[need] > 0))]];

function easyDivergence(rng) {
  let F;
  let parts;
  do {
    F = [0, 1, 2].map((i) => mono(rng, rng.bool(0.75) ? i : null));
    parts = F.map((p, i) => mpD(p, i));
  } while (parts.filter((p) => p.length).length < 2);
  const div = sum(parts);
  const wrong = [
    [sum(F.map((p, i) => mpD(p, (i + 1) % 3))), R`Each component is differentiated with respect to its own variable: \(P\) by \(x\), \(Q\) by \(y\) and \(R\) by \(z\).`],
    [sum(F.flatMap((p) => [0, 1, 2].map((v) => mpD(p, v)))), R`Only three partial derivatives are used: \(\dfrac{\partial P}{\partial x}\), \(\dfrac{\partial Q}{\partial y}\) and \(\dfrac{\partial R}{\partial z}\).`],
    [sum(parts.slice(0, 2))],
    [mpScale(div, -1)],
    [sum(parts.slice(1))],
  ];
  const question = q({
    prompt: R`Find \(\operatorname{div}\mathbf{F}\) for \(\mathbf{F}(x, y, z) = ${vecTex(F)}\).`,
    correct: M(pt(div)),
    wrong: [{ value: M(vecTex(parts)), why: 'The divergence is a scalar: add the three partial derivatives.' }, ...wrong.map(([p, why]) => (why ? { value: M(pt(p)), why } : M(pt(p))))],
    solution: [
      R`\(\operatorname{div}\mathbf{F} = \dfrac{\partial P}{\partial x} + \dfrac{\partial Q}{\partial y} + \dfrac{\partial R}{\partial z}\).`,
      R`\(\dfrac{\partial P}{\partial x} = ${pt(parts[0])}\), \(\dfrac{\partial Q}{\partial y} = ${pt(parts[1])}\), \(\dfrac{\partial R}{\partial z} = ${pt(parts[2])}\).`,
      R`\(\operatorname{div}\mathbf{F} = ${pt(div)}\).`,
    ],
    rule: 0,
    skill: 'divergence',
    check: () => {
      if (!SPOTS.every((p) => close(mpEval(div, ...p), divNum(fieldFn(F), p), 1e-5))) return 'the divergence is wrong';
      return wrong.filter(([p]) => question.choices.indexOf(M(pt(p))) > 0).every(([p]) => SPOTS.some((s) => !close(mpEval(p, ...s), mpEval(div, ...s), 1e-5))) ? true : 'a wrong choice equals the divergence';
    },
  });
  return question;
}

function easyCurl(rng) {
  let F;
  let c;
  do {
    F = [0, 1, 2].map(() => mono(rng));
    c = curlOf(F);
  } while (c.filter((p) => p.length).length < 2);
  const [P, Q, S] = F;
  const wrong = [
    [c.map((p) => mpScale(p, -1)), R`Each difference has a fixed order: \(\left\langle \dfrac{\partial R}{\partial y} - \dfrac{\partial Q}{\partial z},\; \dfrac{\partial P}{\partial z} - \dfrac{\partial R}{\partial x},\; \dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} \right\rangle\).`],
    [[c[0], mpScale(c[1], -1), c[2]], R`The middle component is \(\dfrac{\partial P}{\partial z} - \dfrac{\partial R}{\partial x}\). In the determinant, the \(\mathbf{j}\) term carries a minus sign.`],
    [[mpAdd(mpD(S, 1), mpD(Q, 2)), mpAdd(mpD(P, 2), mpD(S, 0)), mpAdd(mpD(Q, 0), mpD(P, 1))], 'Each component of the curl is a difference of two partial derivatives, not a sum.'],
    [F.map((p, i) => mpD(p, i)), 'Those are the three terms of the divergence. The curl uses the other six partial derivatives.'],
    [[c[1], c[2], c[0]]],
  ];
  const at = (v, s) => v.map((p) => mpEval(p, ...s));
  const question = q({
    prompt: R`Find \(\operatorname{curl}\mathbf{F}\) for \(\mathbf{F}(x, y, z) = ${vecTex(F)}\).`,
    correct: M(vecTex(c)),
    wrong: wrong.map(([v, why]) => ({ value: M(vecTex(v)), why })),
    solution: [
      R`\(\operatorname{curl}\mathbf{F} = \left\langle \dfrac{\partial R}{\partial y} - \dfrac{\partial Q}{\partial z},\; \dfrac{\partial P}{\partial z} - \dfrac{\partial R}{\partial x},\; \dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} \right\rangle\), with \(P = ${pt(P)}\), \(Q = ${pt(Q)}\), \(R = ${pt(S)}\).`,
      R`First component: \(${pt(mpD(S, 1))} - ${wrapNeg(pt(mpD(Q, 2)))}\). Second: \(${pt(mpD(P, 2))} - ${wrapNeg(pt(mpD(S, 0)))}\). Third: \(${pt(mpD(Q, 0))} - ${wrapNeg(pt(mpD(P, 1)))}\).`,
      R`\(\operatorname{curl}\mathbf{F} = ${vecTex(c)}\).`,
    ],
    rule: 1,
    skill: 'curl',
    check: () => {
      if (!SPOTS.every((s) => sameVec(at(c, s), curlNum(fieldFn(F), s)))) return 'the curl is wrong';
      const shown = shownWrong(question, wrong, ([v]) => M(vecTex(v)));
      return shown && shown.every(([v]) => SPOTS.some((s) => !sameVec(at(v, s), at(c, s)))) ? true : 'a wrong choice equals the curl';
    },
  });
  return question;
}

const FLOW = { 1: 'more fluid leaves a small region around each point than enters it (a source)', '-1': 'more fluid enters a small region around each point than leaves it (a sink)', 0: 'as much fluid enters a small region around each point as leaves it' };

function easySourceSink(rng) {
  const balanced = rng.bool(0.2);
  let co;
  do co = [rng.nonzero(-5, 5), rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
  while ((co[0] + co[1] + co[2] === 0) !== balanced);
  const [m, n, k] = [rng.int(-3, 3), rng.int(-3, 3), rng.int(-3, 3)];
  const F = [[[co[0], 1, 0, 0], [m, 0, 1, 0]], [[co[1], 0, 1, 0], [n, 0, 0, 1]], [[co[2], 0, 0, 1], [k, 1, 0, 0]]];
  const s = co[0] + co[1] + co[2];
  const say = (v, flow) => R`\(\operatorname{div}\mathbf{F} = ${v}\): ${flow}`;
  const spin = { value: say(V(co), 'the fluid rotates about this vector'), why: 'The divergence is a number, not a vector. Rotation is measured by the curl.' };
  return q({
    prompt: R`A fluid has velocity field \(\mathbf{F}(x, y, z) = ${vecTex(F)}\). Find \(\operatorname{div}\mathbf{F}\) and say what it tells you about the flow.`,
    correct: say(s, FLOW[Math.sign(s)]),
    wrong: s
      ? [
        { value: say(s, FLOW[-Math.sign(s)]), why: 'A positive divergence means a net flow outward (a source); a negative divergence means a net flow inward (a sink).' },
        spin,
        say(-s, FLOW[-Math.sign(s)]),
        say(0, FLOW[0]),
      ]
      : [
        { value: say(0, 'the fluid is at rest'), why: 'Zero divergence does not mean no motion. It means that inflow and outflow balance at every point.' },
        spin,
        say(Math.abs(co[0]) + Math.abs(co[1]) + Math.abs(co[2]), FLOW[1]),
        say(co[0] * co[1] * co[2], FLOW[Math.sign(co[0] * co[1] * co[2])]),
      ],
    solution: [
      R`\(\operatorname{div}\mathbf{F} = \dfrac{\partial P}{\partial x} + \dfrac{\partial Q}{\partial y} + \dfrac{\partial R}{\partial z} = ${co[0]} + ${paren(co[1])} + ${paren(co[2])} = ${s}\).`,
      `The divergence is the net rate of outflow per unit volume. Here it is ${s > 0 ? 'positive' : s < 0 ? 'negative' : 'zero'}, so ${FLOW[Math.sign(s)]}.`,
    ],
    rule: 0,
    skill: 'meaning of divergence',
    check: () => checkEqual(divNum(fieldFn(F), SPOTS[0]), s, 1e-5, 'divergence'),
  });
}

// ───────────── Medium ─────────────

const AREAS = [
  (rng) => {
    const [a, b] = rng.pick([[2, 2], [1, 2], [2, 1], [1, 1], [2, 3], [3, 2], [4, 8], [1, 3], [2, -2], [-1, 2], [-2, -1], [-4, 8]]);
    const [w, h, c] = [rng.int(1, 4), rng.int(1, 4), rng.int(0, 5)];
    const n = 1 + a * a + b * b;
    return {
      text: R`the part of the plane \(z = ${terms([[a, 'x'], [b, 'y'], [c, '']])}\) that lies above the rectangle \(0 \le x \le ${w}\), \(0 \le y \le ${h}\)`,
      ans: [sqrtTex(n, w * h), w * h * Math.sqrt(n)],
      wrong: [
        [`${w * h}`, w * h, R`That is the area of the rectangle underneath. The tilted surface is larger, by the factor \(\sqrt{1 + g_{x}^{2} + g_{y}^{2}}\).`],
        [sqrtTex(n - 1, w * h), w * h * Math.sqrt(n - 1), R`The factor is \(\sqrt{1 + g_{x}^{2} + g_{y}^{2}}\). The 1 under the root is missing.`],
        [`${w * h * n}`, w * h * n, R`Take the square root: the factor is \(\sqrt{${n}}\), not \(${n}\).`],
        [sqrtTex(n, 2 * w * h), 2 * w * h * Math.sqrt(n)],
      ],
      r: (u, v) => [u, v, c + a * u + b * v],
      box: [0, w, 0, h],
      solution: [
        R`For the graph \(z = g(x, y)\), \(dS = \sqrt{1 + g_{x}^{2} + g_{y}^{2}}\,dA\). Here \(g_{x} = ${a}\) and \(g_{y} = ${b}\), so the factor is \(\sqrt{1 + ${a * a} + ${b * b}} = ${sqrtTex(n)}\), a constant.`,
        R`Area \(= ${sqrtTex(n)} \cdot (\text{area of the rectangle}) = ${sqrtTex(n)} \cdot ${w * h} = ${sqrtTex(n, w * h)}\).`,
      ],
    };
  },
  (rng) => {
    const [rad, h, s] = rng.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]);
    const m = frac(h, rad);
    return {
      text: R`the part of the cone \(z = ${m.tex()}\sqrt{x^{2} + y^{2}}\) that lies below the plane \(z = ${h}\)`,
      ans: [piTex(rad * s), PI * rad * s],
      wrong: [
        [piTex(rad * rad), PI * rad * rad, 'That is the area of the disk underneath. The sloping surface is larger.'],
        [piTex(rad * h), PI * rad * h, R`The stretching factor is \(\sqrt{1 + g_{x}^{2} + g_{y}^{2}} = ${frac(s, rad).tex()}\), not the slope \(${m.tex()}\).`],
        [piTex(2 * rad * s), 2 * PI * rad * s],
        [piTex(frac(rad * s, 2)), (PI * rad * s) / 2],
      ],
      r: (u, v) => [u * Math.cos(v), u * Math.sin(v), (h / rad) * u],
      box: [0, rad, 0, 2 * PI],
      solution: [
        R`For the graph \(z = g(x, y)\), \(dS = \sqrt{1 + g_{x}^{2} + g_{y}^{2}}\,dA\). With \(g = ${m.tex()}\sqrt{x^{2} + y^{2}}\), \(g_{x}^{2} + g_{y}^{2} = ${m.pow(2).tex()}\), so the factor is \(\sqrt{1 + ${m.pow(2).tex()}} = ${frac(s, rad).tex()}\).`,
        R`The cone reaches \(z = ${h}\) where \(\sqrt{x^{2} + y^{2}} = ${rad}\), so the surface lies above a disk of radius \(${rad}\), with area \(${piTex(rad * rad)}\).`,
        R`Area \(= ${frac(s, rad).tex()} \cdot ${piTex(rad * rad)} = ${piTex(rad * s)}\).`,
      ],
    };
  },
  (rng) => {
    const h = rng.pick([2, 6, 12, 20]);
    const k = Math.sqrt(1 + 4 * h);
    return {
      text: R`the part of the paraboloid \(z = x^{2} + y^{2}\) that lies below the plane \(z = ${h}\)`,
      ans: [piTex(frac(k ** 3 - 1, 6)), (PI * (k ** 3 - 1)) / 6],
      wrong: [
        [piTex(h), PI * h, 'That is the area of the disk underneath. The curved surface is larger.'],
        [piTex(frac(k ** 3, 6)), (PI * k ** 3) / 6, R`The lower limit \(r = 0\) contributes too: there \((1 + 4r^{2})^{3/2} = 1\).`],
        [piTex(frac(k ** 3 - 1, 12)), (PI * (k ** 3 - 1)) / 12],
        [piTex(frac(k ** 3 - 1, 3)), (PI * (k ** 3 - 1)) / 3],
      ],
      r: (u, v) => [u * Math.cos(v), u * Math.sin(v), u * u],
      box: [0, Math.sqrt(h), 0, 2 * PI],
      solution: [
        R`For the graph \(z = g(x, y)\), \(dS = \sqrt{1 + g_{x}^{2} + g_{y}^{2}}\,dA = \sqrt{1 + 4x^{2} + 4y^{2}}\,dA\). The surface lies above the disk \(x^{2} + y^{2} \le ${h}\).`,
        R`In polar coordinates: \(\displaystyle\int_{0}^{2\pi}\int_{0}^{${sqrtTex(h)}} \sqrt{1 + 4r^{2}}\;r\,dr\,d\theta\).`,
        R`\(\displaystyle\int_{0}^{${sqrtTex(h)}} \sqrt{1 + 4r^{2}}\;r\,dr = \left[\tfrac{1}{12}(1 + 4r^{2})^{3/2}\right]_{0}^{${sqrtTex(h)}} = \frac{${k ** 3} - 1}{12}\).`,
        R`Multiply by \(2\pi\): \(${piTex(frac(k ** 3 - 1, 6))}\).`,
      ],
    };
  },
];

function mediumSurfaceArea(rng) {
  const k = AREAS[rng.pick([0, 0, 0, 1, 1, 2])](rng);
  const question = q({
    prompt: `Find the area of ${k.text}.`,
    correct: M(k.ans[0]),
    wrong: k.wrong.map(([tex, , why]) => (why ? { value: M(tex), why } : M(tex))),
    solution: k.solution,
    rule: 3,
    skill: 'surface area',
    check: () => {
      const area = surfInt(() => 1, k.r, ...k.box);
      if (!close(area, k.ans[1], 1e-5)) return `area from the parametrization is ${area}, answer is ${k.ans[1]}`;
      const shown = shownWrong(question, k.wrong, ([tex]) => M(tex));
      return shown && shown.every(([, v]) => !close(v, area, 1e-3)) ? true : 'a wrong choice equals the area';
    },
  });
  return question;
}

function mediumFluxPlane(rng) {
  const [a, b] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const [w, h, c] = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 6)];
  const steady = rng.bool();
  let F;
  let up;
  // F · ⟨∓g_x, ∓g_y, 1⟩ as a polynomial in x and y
  const dotted = (sign) => sum([mpScale(F[0], sign * a), mpScale(F[1], sign * b), F[2]]);
  const over = (p) => exactDouble(p, 0, w, fp(0), fp(h));
  do {
    F = steady ? [[[rng.int(-4, 4), 0, 0]], [[rng.int(-4, 4), 0, 0]], [[rng.nonzero(-5, 5), 0, 0]]] : [[[rng.nonzero(-3, 3), 1, 0]], [[rng.nonzero(-3, 3), 0, 1]], [[rng.nonzero(-5, 5), 0, 0]]];
    up = over(dotted(-1));
  } while (up.n === 0 || up.eq(over(F[2])) || up.eq(over(dotted(1))));
  const dir = up.n > 0 && rng.bool(0.7) ? 1 : rng.sign();
  const word = steady && dir * up.n > 0;
  const ans = up.mul(dir);
  const plane = terms([[c, ''], [a, 'x'], [b, 'y']]);
  const nT = V([-a, -b, 1]);
  const where = R`the part of the plane \(z = ${plane}\) above the rectangle \(0 \le x \le ${w}\), \(0 \le y \le ${h}\)`;
  const side = dir > 0 ? 'upward' : 'downward';
  return q({
    prompt: word
      ? R`Air flows with constant velocity \(\mathbf{F} = ${vecTex(F)}\) m/s. A sloping vent is ${where}, with distances in meters. At what rate does air cross the vent in the ${side} direction?`
      : R`Find the flux of \(\mathbf{F} = ${vecTex(F)}\) across \(S\), ${where}, oriented with ${side} normal.`,
    correct: ans,
    unit: word ? 'm³/s' : undefined,
    wrong: [
      { value: over(dotted(1)).mul(dir), why: R`The upward normal to \(z = g(x, y)\) is \(\langle -g_{x}, -g_{y}, 1 \rangle = ${nT}\). The signs of the first two entries are wrong.` },
      { value: over(F[2]).mul(dir), why: R`The surface is tilted, so the \(x\)- and \(y\)-components of \(\mathbf{F}\) carry flow across it as well.` },
      { value: ans.neg(), why: `That is the flux for the ${dir > 0 ? 'downward' : 'upward'} normal. Reversing the orientation reverses the sign.` },
      ans.mul(2),
      ans.div(2),
    ],
    solution: [
      R`\(S\) is the graph of \(g(x, y) = ${plane}\), with \(g_{x} = ${a}\) and \(g_{y} = ${b}\). Its upward normal is \(\langle -g_{x}, -g_{y}, 1 \rangle = ${nT}\), and \(\mathbf{F} \cdot \mathbf{N}\,dS = \mathbf{F} \cdot ${nT}\,dA\).`,
      R`\(\mathbf{F} \cdot ${nT} = ${pt(dotted(-1))}\).`,
      R`Upward flux: \(\displaystyle\int_{0}^{${w}}\int_{0}^{${h}} ${wrapNeg(pt(dotted(-1)))}\,dy\,dx = ${up.tex()}\).`,
      dir < 0 ? R`For the downward normal the sign is reversed: \(${ans.tex()}\).` : null,
    ].filter(Boolean),
    rule: 4,
    skill: 'flux across a plane surface',
    check: () => checkEqual(dir * fluxInt(fieldFn(F), (u, v) => [u, v, c + a * u + b * v], 0, w, 0, h), ans.value, 1e-6, 'flux from the parametrization'),
  });
}

// Closed surfaces: volume and surface area (multiples of π when pi is set) and the numeric outward flux.
const SOLIDS = [
  (rng) => {
    const a = rng.int(1, 4);
    return { text: R`the sphere \(x^{2} + y^{2} + z^{2} = ${a * a}\)`, vol: frac(4 * a ** 3, 3), area: frac(4 * a * a), pi: true, how: R`\frac{4}{3}\pi(${a})^{3}`, flux: (F) => fluxOut.sphere(F, a) };
  },
  (rng) => {
    const d = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 4)];
    return { text: R`the surface of the box \(0 \le x \le ${d[0]}\), \(0 \le y \le ${d[1]}\), \(0 \le z \le ${d[2]}\)`, vol: frac(d[0] * d[1] * d[2]), area: frac(2 * (d[0] * d[1] + d[1] * d[2] + d[0] * d[2])), how: `(${d[0]})(${d[1]})(${d[2]})`, flux: (F) => fluxOut.box(F, d), d };
  },
  (rng) => {
    const [a, h] = [rng.int(1, 3), rng.int(1, 5)];
    return { text: R`the whole surface (side, top and bottom) of the solid cylinder \(x^{2} + y^{2} \le ${a * a}\), \(0 \le z \le ${h}\)`, vol: frac(a * a * h), area: frac(2 * a * h + 2 * a * a), pi: true, how: R`\pi(${a})^{2}(${h})`, flux: (F) => fluxOut.cylinder(F, [a, h]), a, h };
  },
];

function mediumDivergenceTheorem(rng) {
  let co;
  do co = [rng.nonzero(-4, 4), rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
  while (co[0] + co[1] + co[2] === 0);
  const [m, n, k] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3), rng.int(-3, 3)];
  const F = [[[co[0], 1, 0, 0], [m, 0, 1, 1]], [[co[1], 0, 1, 0], [n, 1, 0, 1]], [[co[2], 0, 0, 1], [k, 1, 1, 0]]];
  const s = co[0] + co[1] + co[2];
  const solid = rng.pick(SOLIDS)(rng);
  const show = (v) => M(solid.pi ? piTex(v) : v.tex());
  const ans = solid.vol.mul(s);
  return q({
    prompt: R`Use the divergence theorem to find the outward flux of \(\mathbf{F} = ${vecTex(F)}\) across ${solid.text}.`,
    correct: show(ans),
    wrong: [
      { value: show(solid.area.mul(s)), why: 'The divergence is integrated over the solid inside, so multiply by its volume, not by the area of its surface.' },
      { value: show(solid.vol.mul(s + m + n + k)), why: R`Only \(\dfrac{\partial P}{\partial x}\), \(\dfrac{\partial Q}{\partial y}\) and \(\dfrac{\partial R}{\partial z}\) enter the divergence. The other terms do not contain the matching variable.` },
      show(solid.vol.mul(co[0] * co[1] * co[2])),
      show(ans.mul(2)),
      show(ans.div(2)),
      show(ans.neg()),
      show(ans.mul(3)),
    ],
    solution: [
      R`\(\operatorname{div}\mathbf{F} = ${co[0]} + ${paren(co[1])} + ${paren(co[2])} = ${s}\). The other terms drop out: \(${pt([F[0][1]])}\) has no \(x\) in it, and so on.`,
      R`By the divergence theorem the outward flux is \(\displaystyle\iiint_{E} ${s}\,dV = ${s} \cdot (\text{volume of } E)\).`,
      R`The volume is \(${solid.how} = ${solid.pi ? piTex(solid.vol) : solid.vol.tex()}\), so the flux is \(${solid.pi ? piTex(ans) : ans.tex()}\).`,
    ],
    rule: 6,
    skill: 'divergence theorem',
    check: () => checkEqual(solid.flux(fieldFn(F)), ans.value * (solid.pi ? PI : 1), 1e-5, 'flux through the surface itself'),
  });
}

// ───────────── Hard ─────────────

// Open surfaces with an explicit normal direction. `flux` is the flux ÷ π for the first orientation listed, and the
// parametrization r(u, v) has r_u × r_v pointing that way.
const CURVED = [
  (rng) => {
    const h = rng.pick([1, 2, 4]);
    const a = rng.nonzero(-3, 3);
    const b = rng.intExcept(-3, 3, [-2 * a]);
    return {
      F: [[[a, 1, 0, 0]], [[a, 0, 1, 0]], [[b, 0, 0, 1]]],
      text: R`the part of the paraboloid \(z = ${h} - x^{2} - y^{2}\) with \(z \ge 0\)`,
      sides: ['upward', 'downward'],
      flux: frac((2 * a + b) * h * h, 2),
      r: (u, v) => [u * Math.cos(v), u * Math.sin(v), h - u * u],
      box: [0, Math.sqrt(h), 0, 2 * PI],
      flat: b ? [frac(b * h * h, 2), R`The surface is not flat. Its upward normal is \(\langle 2x, 2y, 1 \rangle\), so the \(x\)- and \(y\)-components of \(\mathbf{F}\) count too.`] : null,
      other: frac((a + b) * h * h, 2),
      solution: [
        R`\(S\) is the graph of \(g = ${h} - x^{2} - y^{2}\) above the disk \(x^{2} + y^{2} \le ${h}\). Its upward normal is \(\langle -g_{x}, -g_{y}, 1 \rangle = \langle 2x, 2y, 1 \rangle\).`,
        R`\(\mathbf{F} \cdot \langle 2x, 2y, 1 \rangle = ${terms([[2 * a, 'x^{2}'], [2 * a, 'y^{2}'], [b, 'z']])}\), and on \(S\), \(z = ${h} - r^{2}\): in polar coordinates this is \(${terms([[2 * a - b, 'r^{2}'], [b * h, '']])}\).`,
        R`Upward flux: \(\displaystyle\int_{0}^{2\pi}\int_{0}^{${sqrtTex(h)}} \left(${terms([[2 * a - b, 'r^{2}'], [b * h, '']])}\right) r\,dr\,d\theta = 2\pi\left(${frac((2 * a - b) * h * h, 4).tex()} + ${paren(frac(b * h * h, 2))}\right) = ${piTex(frac((2 * a + b) * h * h, 2))}\).`,
      ],
    };
  },
  (rng) => {
    const rad = rng.int(1, 3);
    const a = rng.nonzero(-3, 3);
    const b = rng.intExcept(-3, 3, [-2 * a]);
    return {
      F: [[[a, 1, 0, 0]], [[a, 0, 1, 0]], [[b, 0, 0, 1]]],
      text: R`the hemisphere \(x^{2} + y^{2} + z^{2} = ${rad * rad}\), \(z \ge 0\)`,
      sides: ['upward', 'downward'],
      flux: frac(2 * (2 * a + b) * rad ** 3, 3),
      r: sphere(rad),
      box: [0, PI / 2, 0, 2 * PI],
      flat: b ? [frac(2 * b * rad ** 3, 3), R`The normal to a sphere points along the radius, \(\mathbf{N} = \frac{1}{${rad}}\langle x, y, z \rangle\), not straight up.`] : null,
      other: frac(2 * (a + b) * rad ** 3, 3),
      solution: [
        R`Use spherical angles: \(x = ${cf(rad, '\\sin\\phi\\cos\\theta')}\), \(y = ${cf(rad, '\\sin\\phi\\sin\\theta')}\), \(z = ${cf(rad, '\\cos\\phi')}\), with \(0 \le \phi \le \frac{\pi}{2}\). The upward (outward) unit normal is \(\mathbf{N} = \frac{1}{${rad}}\langle x, y, z \rangle\) and \(dS = ${rad * rad}\sin\phi\,d\phi\,d\theta\).`,
        R`\(\mathbf{F} \cdot \mathbf{N} = \dfrac{${terms([[a, 'x^{2}'], [a, 'y^{2}'], [b, 'z^{2}']])}}{${rad}} = ${cf(rad, `\\left(${terms([[a, '\\sin^{2}\\phi'], [b, '\\cos^{2}\\phi']])}\\right)`)}\).`,
        R`\(\displaystyle\int_{0}^{\pi/2} \sin^{3}\phi\,d\phi = \frac{2}{3}\) and \(\displaystyle\int_{0}^{\pi/2} \cos^{2}\phi\sin\phi\,d\phi = \frac{1}{3}\), so the upward flux is \(${dot(rad ** 3, '2\\pi')}\left(${frac(2 * a, 3).tex()} + ${paren(frac(b, 3))}\right) = ${piTex(frac(2 * (2 * a + b) * rad ** 3, 3))}\).`,
      ],
    };
  },
  (rng) => {
    const [rad, h] = [rng.int(1, 3), rng.int(1, 4)];
    const a = rng.nonzero(-3, 3);
    const b = rng.intExcept(-3, 3, [-a]);
    const c = rng.nonzero(-3, 3);
    return {
      F: [[[a, 1, 0, 0]], [[b, 0, 1, 0]], [[c, 0, 0, 1]]],
      text: R`the curved side of the cylinder \(x^{2} + y^{2} = ${rad * rad}\), \(0 \le z \le ${h}\) (without the top and bottom)`,
      sides: ['outward', 'inward'],
      flux: frac((a + b) * rad * rad * h),
      r: wall(rad),
      box: [0, 2 * PI, 0, h],
      flat: [frac((a + b + c) * rad * rad * h), 'That is the divergence theorem, which needs a closed surface. The side alone is open: the top and bottom carry flux as well.'],
      other: frac(2 * (a + b) * rad * rad * h),
      solution: [
        R`Parametrize the side: \(x = ${cf(rad, '\\cos\\theta')}\), \(y = ${cf(rad, '\\sin\\theta')}\), \(0 \le \theta \le 2\pi\), \(0 \le z \le ${h}\). The outward unit normal is \(\mathbf{N} = \frac{1}{${rad}}\langle x, y, 0 \rangle\) and \(dS = ${rad}\,d\theta\,dz\).`,
        R`\(\mathbf{F} \cdot \mathbf{N} = \dfrac{${terms([[a, 'x^{2}'], [b, 'y^{2}']])}}{${rad}} = ${cf(rad, `\\left(${terms([[a, '\\cos^{2}\\theta'], [b, '\\sin^{2}\\theta']])}\\right)`)}\). The \(z\)-component of \(\mathbf{F}\) does not cross the side.`,
        R`\(\cos^{2}\theta\) and \(\sin^{2}\theta\) each integrate to \(\pi\) over \(0 \le \theta \le 2\pi\), so the outward flux is \(${dot(rad * rad, h, `(${a} + ${paren(b)})\\pi`)} = ${piTex(frac((a + b) * rad * rad * h))}\).`,
      ],
    };
  },
];

function hardFluxCurved(rng) {
  const k = rng.pick(CURVED)(rng);
  const flip = rng.bool(0.35);
  const ans = flip ? k.flux.neg() : k.flux;
  const pi = (v) => M(piTex(v));
  return q({
    prompt: R`Find the flux of \(\mathbf{F} = ${vecTex(k.F)}\) across ${k.text}, oriented with ${k.sides[flip ? 1 : 0]} normal.`,
    correct: pi(ans),
    wrong: [
      { value: pi(ans.neg()), why: `That is the flux for the ${k.sides[flip ? 0 : 1]} normal. Reversing the orientation reverses the sign.` },
      k.flat ? { value: pi(k.flat[0].mul(flip ? -1 : 1)), why: k.flat[1] } : null,
      pi(k.other.mul(flip ? -1 : 1)),
      pi(ans.mul(2)),
      pi(ans.div(2)),
    ],
    solution: [...k.solution, flip ? R`For the ${k.sides[1]} normal the sign is reversed: \(${piTex(ans)}\).` : R`So the flux is \(${piTex(ans)}\).`],
    rule: 4,
    skill: 'flux across a curved surface',
    check: () => checkEqual((flip ? -1 : 1) * fluxInt(fieldFn(k.F), k.r, ...k.box), ans.value * PI, 1e-5, 'flux from the parametrization'),
  });
}

function hardStokes(rng) {
  const back = rng.bool(0.35); // travel against the direction that matches the upward normal
  if (rng.bool()) {
    const [rad, c] = [rng.int(1, 4), rng.int(1, 5)];
    const al = rng.nonzero(-4, 4);
    const be = rng.intExcept(-4, 4, [0, -al, al]);
    const [m, n] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    const F = [[[-al, 0, 1, 0], [m, 0, 0, 2]], [[be, 1, 0, 0], [n, 0, 1, 1]], [[1, 1, 1, 1]]];
    const up = frac((al + be) * rad * rad);
    const ans = back ? up.neg() : up;
    const pi = (v) => M(piTex(v));
    return q({
      prompt: R`Use Stokes' theorem to evaluate \(\displaystyle\oint_{C} \mathbf{F} \cdot d\mathbf{r}\) for \(\mathbf{F} = ${vecTex(F)}\), where \(C\) is the circle \(x^{2} + y^{2} = ${rad * rad}\) in the plane \(z = ${c}\), traversed ${back ? 'clockwise' : 'counter-clockwise'} as seen from above.`,
      correct: pi(ans),
      wrong: [
        { value: pi(ans.neg()), why: `That is the value for ${back ? 'counter-clockwise' : 'clockwise'} travel. Counter-clockwise as seen from above goes with the upward normal.` },
        { value: pi(frac((be - al) * rad * rad).mul(back ? -1 : 1)), why: R`\(\dfrac{\partial P}{\partial y} = ${-al}\), so \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = ${be} - ${paren(-al)}\).` },
        { value: pi(frac(2 * (al + be) * rad).mul(back ? -1 : 1)), why: "Stokes' theorem integrates over the disk inside the circle, so multiply by its area, not by the length of the circle." },
        pi(ans.mul(2)),
        pi(ans.div(2)),
      ],
      solution: [
        R`Let \(S\) be the flat disk inside \(C\), in the plane \(z = ${c}\), with upward normal \(\mathbf{N} = \mathbf{k}\). That orientation goes with counter-clockwise travel as seen from above.`,
        R`Only the \(\mathbf{k}\)-component of the curl is needed: \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = ${be} - ${paren(-al)} = ${al + be}\).`,
        R`\(\displaystyle\iint_{S} \operatorname{curl}\mathbf{F} \cdot \mathbf{N}\,dS = ${al + be} \cdot (\text{area of the disk}) = ${dot(al + be, piTex(rad * rad))} = ${piTex(up)}\).`,
        back ? R`\(C\) is traversed clockwise, which reverses the sign: \(${piTex(ans)}\).` : R`\(C\) is traversed counter-clockwise, so the line integral is \(${piTex(ans)}\).`,
      ],
      rule: 5,
      skill: "Stokes' theorem",
      check: () => checkEqual(lineInt(fieldFn(F), (t) => [rad * Math.cos(t), (back ? -1 : 1) * rad * Math.sin(t), c], 0, 2 * PI), ans.value * PI, 1e-6, 'line integral round the circle'),
    });
  }
  const [p, s, w] = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 4)]; // the triangle with vertices (p, 0, 0), (0, s, 0), (0, 0, w)
  let co;
  let curl;
  let up;
  do {
    co = Array.from({ length: 6 }, () => rng.int(-3, 3)); // F = ⟨co0·y + co1·z, co2·x + co3·z, co4·x + co5·y⟩
    curl = [co[5] - co[3], co[1] - co[4], co[2] - co[0]];
    up = frac(curl[0] * s * w + curl[1] * p * w + curl[2] * p * s, 2);
  } while (up.n === 0 || curl.filter((v) => v).length < 2 || up.eq(frac(curl[2] * p * s, 2)) || co.filter((v) => v).length < 4);
  const F = [[[co[0], 0, 1, 0], [co[1], 0, 0, 1]], [[co[2], 1, 0, 0], [co[3], 0, 0, 1]], [[co[4], 1, 0, 0], [co[5], 0, 1, 0]]];
  const verts = [[p, 0, 0], [0, s, 0], [0, 0, w]];
  const route = back ? [verts[0], verts[2], verts[1]] : verts;
  const ans = back ? up.neg() : up;
  const nT = V([frac(w, p), frac(w, s), 1]);
  return q({
    prompt: R`Use Stokes' theorem to evaluate \(\displaystyle\oint_{C} \mathbf{F} \cdot d\mathbf{r}\) for \(\mathbf{F} = ${vecTex(F)}\), where \(C\) is the triangle traversed from \(${Pt(route[0])}\) to \(${Pt(route[1])}\) to \(${Pt(route[2])}\) and back to \(${Pt(route[0])}\).`,
    correct: ans,
    wrong: [
      { value: ans.neg(), why: R`That is the value for the opposite direction of travel. Going from \(${Pt(verts[0])}\) to \(${Pt(verts[1])}\) to \(${Pt(verts[2])}\) is counter-clockwise as seen from above, which goes with the upward normal.` },
      { value: frac(curl[2] * p * s, 2).mul(back ? -1 : 1), why: R`The triangle is tilted, so its normal is not \(\mathbf{k}\). All three components of the curl contribute.` },
      { value: frac((curl[0] + curl[1] + curl[2]) * p * s, 2).mul(back ? -1 : 1), why: R`The upward normal to the plane is \(${nT}\), not \(\langle 1, 1, 1 \rangle\).` },
      ans.mul(2),
      ans.div(2),
    ],
    solution: [
      R`\(\operatorname{curl}\mathbf{F} = \left\langle \dfrac{\partial R}{\partial y} - \dfrac{\partial Q}{\partial z},\; \dfrac{\partial P}{\partial z} - \dfrac{\partial R}{\partial x},\; \dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} \right\rangle = ${V(curl)}\), a constant vector.`,
      R`The triangle lies in the plane \(${[['x', p], ['y', s], ['z', w]].map(([v, d]) => (d === 1 ? v : `\\dfrac{${v}}{${d}}`)).join(' + ')} = 1\), the graph of \(z = ${terms([[w, ''], [frac(-w, p), 'x'], [frac(-w, s), 'y']])}\) above the triangle in the \(xy\)-plane with vertices \((0, 0)\), \((${p}, 0)\), \((0, ${s})\), whose area is \(${frac(p * s, 2).tex()}\). Its upward normal is \(\langle -z_{x}, -z_{y}, 1 \rangle = ${nT}\).`,
      R`\(\displaystyle\iint_{S} \operatorname{curl}\mathbf{F} \cdot \mathbf{N}\,dS = ${V(curl)} \cdot ${nT} \cdot ${frac(p * s, 2).tex()} = ${dot(frac(curl[0] * w, p).add(frac(curl[1] * w, s)).add(curl[2]), frac(p * s, 2))} = ${up.tex()}\).`,
      back ? R`The upward normal goes with travel from \(${Pt(verts[0])}\) to \(${Pt(verts[1])}\) to \(${Pt(verts[2])}\). \(C\) goes the other way round, so the line integral is \(${ans.tex()}\).` : R`The upward normal goes with travel from \(${Pt(verts[0])}\) to \(${Pt(verts[1])}\) to \(${Pt(verts[2])}\) (counter-clockwise as seen from above), which is the direction of \(C\). The line integral is \(${ans.tex()}\).`,
    ],
    rule: 5,
    skill: "Stokes' theorem",
    check: () => checkEqual(route.reduce((t, a, i) => t + lineInt(fieldFn(F), (u) => a.map((v, j) => v + (route[(i + 1) % 3][j] - v) * u), 0, 1, 200), 0), ans.value, 1e-6, 'line integral round the triangle'),
  });
}

// Fields whose divergence is not constant, on a closed surface: [field, divergence, the triple integral, answer].
const SPREAD = [
  (rng) => {
    const [a, rad] = [rng.nonzero(-3, 3), rng.int(1, 3)];
    const cubes = rng.bool();
    const k = cubes ? 3 * a : a; // div F = k·ρ²
    return {
      F: cubes ? [[[a, 3, 0, 0]], [[a, 0, 3, 0]], [[a, 0, 0, 3]]] : [[[a, 1, 2, 0]], [[a, 0, 1, 2]], [[a, 2, 0, 1]]],
      text: R`the sphere \(x^{2} + y^{2} + z^{2} = ${rad * rad}\)`,
      flux: (F) => fluxOut.sphere(F, rad),
      ans: frac(4 * k * rad ** 5, 5),
      pi: true,
      wrong: [[frac(4 * k * rad ** 5, 3), R`The divergence is not constant, so it cannot be taken at the surface and multiplied by the volume. Integrate \(\rho^{2}\) over the ball.`], [frac(4 * k * rad ** 3, 3), R`In spherical coordinates \(dV = \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta\). The factor \(\rho^{2}\) is missing.`]],
      solution: [
        R`\(\operatorname{div}\mathbf{F} = ${cf(k, '(x^{2} + y^{2} + z^{2})')} = ${cf(k, '\\rho^{2}')}\).`,
        R`By the divergence theorem the outward flux is \(\displaystyle\iiint_{E} ${cf(k, '\\rho^{2}')}\,dV = ${cf(k, `\\int_{0}^{2\\pi}\\int_{0}^{\\pi}\\int_{0}^{${rad}} \\rho^{4}\\sin\\phi\\,d\\rho\\,d\\phi\\,d\\theta`)}\).`,
        R`\(= ${dot(...(k === 1 ? [] : [k]), '2\\pi', 2, frac(rad ** 5, 5))} = ${piTex(frac(4 * k * rad ** 5, 5))}\).`,
      ],
    };
  },
  (rng) => {
    const d = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)];
    let co;
    do co = [rng.nonzero(-3, 3), rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    while (co[0] * d[0] + co[1] * d[1] + co[2] * d[2] === 0);
    const vol = d[0] * d[1] * d[2];
    const k = co[0] * d[0] + co[1] * d[1] + co[2] * d[2];
    return {
      F: [[[co[0], 2, 0, 0]], [[co[1], 0, 2, 0]], [[co[2], 0, 0, 2]]],
      text: R`the surface of the box \(0 \le x \le ${d[0]}\), \(0 \le y \le ${d[1]}\), \(0 \le z \le ${d[2]}\)`,
      flux: (F) => fluxOut.box(F, d),
      ans: frac(vol * k),
      wrong: [[frac(2 * vol * k), 'The divergence is not constant, so it cannot be taken at the far corner and multiplied by the volume. Integrate it over the box.'], [frac(2 * (co[0] + co[1] + co[2]) * vol), R`\(\operatorname{div}\mathbf{F} = ${terms([[2 * co[0], 'x'], [2 * co[1], 'y'], [2 * co[2], 'z']])}\) still depends on \(x\), \(y\) and \(z\). Integrate it over the box.`]],
      solution: [
        R`\(\operatorname{div}\mathbf{F} = ${terms([[2 * co[0], 'x'], [2 * co[1], 'y'], [2 * co[2], 'z']])}\).`,
        R`By the divergence theorem the outward flux is \(\displaystyle\int_{0}^{${d[0]}}\int_{0}^{${d[1]}}\int_{0}^{${d[2]}} \left(${terms([[2 * co[0], 'x'], [2 * co[1], 'y'], [2 * co[2], 'z']])}\right) dz\,dy\,dx\).`,
        R`Over the box, \(\iiint x\,dV = ${frac(d[0], 2).tex()} \cdot ${vol}\) (the average value of \(x\) times the volume), and likewise for \(y\) and \(z\). The flux is \(${vol}\left(${co[0] * d[0]} + ${paren(co[1] * d[1])} + ${paren(co[2] * d[2])}\right) = ${vol * k}\).`,
      ],
    };
  },
  (rng) => {
    const [rad, h] = [rng.int(1, 2), rng.int(1, 4)];
    const a = rng.nonzero(-2, 2);
    const b = rng.intExcept(-3, 3, [0]);
    const ans = frac(3 * a * h * rad ** 4, 2).add(b * rad * rad * h * h);
    return {
      F: [[[a, 3, 0, 0]], [[a, 0, 3, 0]], [[b, 0, 0, 2]]],
      text: R`the whole surface (side, top and bottom) of the solid cylinder \(x^{2} + y^{2} \le ${rad * rad}\), \(0 \le z \le ${h}\)`,
      flux: (F) => fluxOut.cylinder(F, [rad, h]),
      ans,
      pi: true,
      wrong: [[frac(3 * a * h * rad ** 3).add(b * rad * rad * h * h), R`In cylindrical coordinates \(dV = r\,dz\,dr\,d\theta\). The factor \(r\) is missing from the first part.`], [frac((3 * a * rad * rad + 2 * b * h) * rad * rad * h), 'The divergence is not constant, so it cannot be taken at the top rim and multiplied by the volume. Integrate it over the cylinder.']],
      solution: [
        R`\(\operatorname{div}\mathbf{F} = ${terms([[3 * a, 'x^{2}'], [3 * a, 'y^{2}'], [2 * b, 'z']])} = ${terms([[3 * a, 'r^{2}'], [2 * b, 'z']])}\) in cylindrical coordinates.`,
        R`By the divergence theorem the outward flux is \(\displaystyle\int_{0}^{2\pi}\int_{0}^{${rad}}\int_{0}^{${h}} \left(${terms([[3 * a, 'r^{2}'], [2 * b, 'z']])}\right) r\,dz\,dr\,d\theta\).`,
        R`The \(r^{2}\) part gives \(${dot(3 * a, '2\\pi', h, frac(rad ** 4, 4))} = ${piTex(frac(3 * a * h * rad ** 4, 2))}\) and the \(z\) part gives \(${dot(2 * b, '2\\pi', frac(h * h, 2), frac(rad * rad, 2))} = ${piTex(b * rad * rad * h * h)}\). Total: \(${piTex(ans)}\).`,
      ],
    };
  },
];

function hardDivergenceVariable(rng) {
  let k;
  do k = rng.pick(SPREAD)(rng);
  while (k.ans.n === 0);
  const show = (v) => M(k.pi ? piTex(v) : v.tex());
  return q({
    prompt: R`Use the divergence theorem to find the outward flux of \(\mathbf{F} = ${vecTex(k.F)}\) across ${k.text}.`,
    correct: show(k.ans),
    wrong: [...k.wrong.map(([v, why]) => ({ value: show(v), why })), show(k.ans.neg()), show(k.ans.mul(2)), show(k.ans.div(2))],
    solution: k.solution,
    rule: 6,
    skill: 'divergence theorem',
    check: () => checkEqual(k.flux(fieldFn(k.F)), k.ans.value * (k.pi ? PI : 1), 1e-5, 'flux through the surface itself'),
  });
}

// ───────────── Challenge ─────────────

// Terms that vanish on the plane z = 0 (for P and Q) and a third component, as [LaTeX, function].
const P_EXTRA = [['z\\cos x', (x, y, z) => z * Math.cos(x)], ['z^{2}', (x, y, z) => z * z], ['ze^{x}', (x, y, z) => z * Math.exp(x)]];
const Q_EXTRA = [['z\\sin y', (x, y, z) => z * Math.sin(y)], ['yz^{2}', (x, y, z) => y * z * z], ['yz', (x, y, z) => y * z]];
const R_ANY = [['xy', (x, y) => x * y], ['x^{2}y', (x, y) => x * x * y], ['\\sin(xy)', (x, y) => Math.sin(x * y)]];

function challengeSwapSurface(rng) {
  const al = rng.nonzero(-4, 4);
  const be = rng.intExcept(-4, 4, [0, -al, al]);
  const [pe, qe, re] = [rng.pick(P_EXTRA), rng.pick(Q_EXTRA), rng.pick(R_ANY)];
  const F = (x, y, z) => [-al * y + pe[1](x, y, z), be * x + qe[1](x, y, z), re[1](x, y, z)];
  const dome = rng.bool();
  const rad = rng.int(1, 3);
  const down = rng.bool(0.3);
  const up = frac((al + be) * rad * rad);
  const ans = down ? up.neg() : up;
  const pi = (v) => M(piTex(v));
  const sign = down ? -1 : 1;
  return q({
    prompt: R`Evaluate \(\displaystyle\iint_{S} \operatorname{curl}\mathbf{F} \cdot \mathbf{N}\,dS\) for \(\mathbf{F} = \left\langle ${cf(-al, 'y')} + ${pe[0]},\; ${cf(be, 'x')} + ${qe[0]},\; ${re[0]} \right\rangle\), where \(S\) is ${dome ? R`the hemisphere \(x^{2} + y^{2} + z^{2} = ${rad * rad}\), \(z \ge 0\)` : R`the part of the paraboloid \(z = ${rad * rad} - x^{2} - y^{2}\) with \(z \ge 0\)`}, oriented with ${down ? 'downward' : 'upward'} normal.`,
    correct: pi(ans),
    wrong: [
      { value: pi(frac(2 * (al + be) * rad * rad).mul(sign)), why: R`\(\operatorname{curl}\mathbf{F} \cdot \mathbf{N}\) is not constant on the curved surface, so it cannot simply be multiplied by an area there. Stokes' theorem lets you use the flat disk instead, whose area is \(${piTex(rad * rad)}\).` },
      { value: M('0'), why: R`The flux of a curl is 0 through a closed surface. \(S\) is not closed: its edge is the circle \(x^{2} + y^{2} = ${rad * rad}\) in the \(xy\)-plane.` },
      { value: pi(ans.neg()), why: `That is the value for the ${down ? 'upward' : 'downward'} normal. Reversing the orientation reverses the sign.` },
      pi(frac((be - al) * rad * rad).mul(sign)),
      pi(ans.div(2)),
    ],
    solution: [
      R`By Stokes' theorem the flux of \(\operatorname{curl}\mathbf{F}\) through \(S\) equals \(\displaystyle\oint_{C} \mathbf{F} \cdot d\mathbf{r}\) around its edge, the circle \(x^{2} + y^{2} = ${rad * rad}\) in the plane \(z = 0\). Any other surface with the same edge and matching orientation gives the same flux.`,
      R`Use the flat disk \(D\) inside that circle, with upward normal \(\mathbf{k}\). On \(D\) only the \(\mathbf{k}\)-component of the curl matters: \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = ${be} - ${paren(-al)} = ${al + be}\). The extra terms do not contribute, because \(${qe[0]}\) does not contain \(x\) and \(${pe[0]}\) does not contain \(y\).`,
      R`Upward flux: \(${dot(al + be, piTex(rad * rad))} = ${piTex(up)}\).`,
      down ? R`\(S\) is oriented with downward normal, so the answer is \(${piTex(ans)}\).` : null,
    ].filter(Boolean),
    rule: 5,
    skill: "choosing a surface for Stokes' theorem",
    check: () => checkEqual(sign * fluxInt((x, y, z) => curlNum(F, [x, y, z]), dome ? sphere(rad) : (u, v) => [u * Math.cos(v), u * Math.sin(v), rad * rad - u * u], 0, dome ? PI / 2 : rad, 0, 2 * PI, 60), ans.value * PI, 1e-4, 'flux of the curl through S itself'),
  });
}

const X_FREE = [['\\sin y', (x, y) => Math.sin(y)], ['yz', (x, y, z) => y * z], ['e^{z}', (x, y, z) => Math.exp(z)]];
const Y_FREE = [['\\cos x', (x) => Math.cos(x)], ['xz', (x, y, z) => x * z], ['x^{2}', (x) => x * x]];

function challengeCloseSurface(rng) {
  const rad = rng.int(1, 3);
  let co;
  let k;
  let s;
  do {
    co = [rng.nonzero(-3, 3), rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
    k = rng.nonzero(-4, 4);
    s = co[0] + co[1] + co[2];
  } while (s === 0 || 2 * s * rad + 3 * k === 0);
  const [xe, ye] = [rng.pick(X_FREE), rng.pick(Y_FREE)];
  const F = (x, y, z) => [co[0] * x + xe[1](x, y, z), co[1] * y + ye[1](x, y, z), co[2] * z + k];
  const solid = frac(2 * s * rad ** 3, 3); // ∭ div F dV ÷ π over the half-ball
  const ans = solid.add(k * rad * rad);
  const pi = (v) => M(piTex(v));
  return q({
    prompt: R`Find the flux of \(\mathbf{F} = \left\langle ${cf(co[0], 'x')} + ${xe[0]},\; ${cf(co[1], 'y')} + ${ye[0]},\; ${terms([[co[2], 'z'], [k, '']])} \right\rangle\) across the hemisphere \(x^{2} + y^{2} + z^{2} = ${rad * rad}\), \(z \ge 0\), oriented with upward normal. (The flat bottom is not part of the surface.)`,
    correct: pi(ans),
    wrong: [
      { value: pi(solid), why: 'The divergence theorem needs a closed surface. Add the flat bottom disk to close it, then take away the flux through that disk.' },
      { value: pi(solid.sub(k * rad * rad)), why: R`On the bottom disk the outward normal is \(-\mathbf{k}\), so the flux out through it is \(${piTex(-k * rad * rad)}\). Taking that away changes the total by \(${piTex(k * rad * rad)}\).` },
      pi(solid.mul(2).add(k * rad * rad)),
      pi(ans.neg()),
      pi(ans.mul(2)),
      pi(ans.div(2)),
    ],
    solution: [
      R`Close the surface with the bottom disk \(D\): \(x^{2} + y^{2} \le ${rad * rad}\), \(z = 0\). Together they bound the half-ball \(E\), and the divergence theorem gives the total outward flux: \(\displaystyle\iiint_{E} \operatorname{div}\mathbf{F}\,dV\), with \(\operatorname{div}\mathbf{F} = ${co[0]} + ${paren(co[1])} + ${paren(co[2])} = ${s}\).`,
      R`The half-ball has volume \(\frac{2}{3}\pi(${rad})^{3} = ${piTex(frac(2 * rad ** 3, 3))}\), so the total outward flux is \(${piTex(solid)}\).`,
      R`On \(D\) the outward normal is \(-\mathbf{k}\) and \(z = 0\), so \(\mathbf{F} \cdot \mathbf{N} = -(${terms([[co[2], 'z'], [k, '']])}) = ${-k}\). The flux out through \(D\) is \(${dot(-k, piTex(rad * rad))} = ${piTex(-k * rad * rad)}\).`,
      R`Flux through the hemisphere = total − disk: \(${piTex(solid)} - \left(${piTex(-k * rad * rad)}\right) = ${piTex(ans)}\).`,
    ],
    rule: 6,
    skill: 'closing a surface',
    check: () => checkEqual(fluxInt(F, sphere(rad), 0, PI / 2, 0, 2 * PI), ans.value * PI, 1e-5, 'flux through the hemisphere itself'),
  });
}

// Cyclic relabelling of x, y, z, applied to a field given as three polynomials.
const rotate = (F, n) => (n ? rotate([2, 0, 1].map((i) => F[i].map(([c, a, b, d]) => [c, d, a, b])), n - 1) : F);

function challengeWhichField(rng) {
  const [a, b, c] = [rng.nonzero(-3, 3), rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
  const turn = rng.int(0, 2);
  const isCurl = rng.bool();
  let fields; // the first one is the right answer
  if (isCurl) {
    fields = [
      [[[2 * a, 1, 1, 0]], [[-a, 0, 2, 0], [b, 1, 0, 1]], [[c, 1, 1, 0]]], // ⟨2axy, −ay² + bxz, cxy⟩ has divergence 0
      [[[2 * a, 1, 1, 0]], [[a, 0, 2, 0], [b, 1, 0, 1]], [[c, 1, 1, 0]]],
      [[[2 * a, 1, 1, 0]], [[-a, 0, 2, 0], [b, 1, 0, 1]], [[c, 1, 0, 1]]],
      [[[a, 2, 0, 0]], [[-a, 0, 2, 0], [b, 1, 0, 1]], [[c, 1, 1, 0]]],
    ];
  } else {
    fields = [
      [[[2 * a, 1, 1, 0], [c, 0, 0, 2]], [[a, 2, 0, 0], [b, 0, 0, 1]], [[b, 0, 1, 0], [2 * c, 1, 0, 1]]], // the gradient of ax²y + byz + cxz²
      [[[2 * a, 1, 1, 0], [c, 0, 0, 2]], [[a, 2, 0, 0], [b, 0, 0, 1]], [[-b, 0, 1, 0], [2 * c, 1, 0, 1]]],
      [[[2 * a, 1, 1, 0], [c, 0, 0, 2]], [[2 * a, 2, 0, 0], [b, 0, 0, 1]], [[b, 0, 1, 0], [2 * c, 1, 0, 1]]],
      [[[2 * a, 1, 1, 0], [c, 0, 0, 2]], [[a, 2, 0, 0], [b, 0, 0, 1]], [[b, 0, 1, 0], [c, 1, 0, 1]]],
    ];
  }
  fields = fields.map((F) => rotate(F, turn));
  const zeroAt = (F, s) => (isCurl ? close(divNum(fieldFn(F), s), 0, 1e-6) : sameVec(curlNum(fieldFn(F), s), [0, 0, 0]));
  const [good, ...bad] = fields;
  const reason = (F) => (isCurl ? R`its divergence is \(${pt(divOf(F))}\), not 0` : R`its curl is \(${vecTex(curlOf(F))}\), not \(\mathbf{0}\)`);
  return q({
    prompt: isCurl ? 'Exactly one of these vector fields is the curl of another vector field. Which one?' : 'Exactly one of these vector fields is conservative (the gradient of a function). Which one?',
    correct: M(vecTex(good)),
    wrong: bad.map((F) => ({ value: M(vecTex(F)), why: isCurl ? R`The divergence of a curl is always 0. For this field, ${reason(F)}.` : R`The curl of a gradient is always \(\mathbf{0}\). For this field, ${reason(F)}.` })),
    solution: isCurl
      ? [
        R`For any field \(\mathbf{G}\) with continuous second partial derivatives, \(\operatorname{div}(\operatorname{curl}\mathbf{G}) = 0\). So a field whose divergence is not 0 cannot be a curl.`,
        R`\(\operatorname{div}${vecTex(good)} = ${F3sum(good)} = 0\). Each of the other three fields has a non-zero divergence.`,
        R`A field with zero divergence on all of space is the curl of some field, so the answer is \(${vecTex(good)}\).`,
      ]
      : [
        R`For any function \(f\) with continuous second partial derivatives, \(\operatorname{curl}(\nabla f) = \mathbf{0}\). So a field whose curl is not \(\mathbf{0}\) cannot be a gradient.`,
        R`\(\operatorname{curl}${vecTex(good)} = \langle 0, 0, 0 \rangle\). Each of the other three fields has a non-zero curl.`,
        R`A field with zero curl on all of space is conservative, so the answer is \(${vecTex(good)}\).`,
      ],
    rule: 2,
    skill: 'div curl = 0 and curl grad = 0',
    check: () => (SPOTS.every((s) => zeroAt(good, s)) && bad.every((F) => SPOTS.some((s) => !zeroAt(F, s))) ? true : 'the fields do not behave as claimed'),
  });
}
/** "∂P/∂x + ∂Q/∂y + ∂R/∂z" written out term by term, for a field whose divergence is 0. */
function F3sum(F) {
  return F.map((p, i) => wrapNeg(pt(mpD(p, i)))).join(' + ');
}

export default {
  id: 'surface-integrals-theorems',
  title: "Curl, Divergence, Stokes' & the Divergence Theorem",
  summary: "Compute divergence, curl, surface area and flux, and use Stokes' theorem and the divergence theorem to simplify integrals.",
  standards: ['OpenStax Calculus Vol. 3 §6.5', 'OpenStax Calculus Vol. 3 §6.6', 'OpenStax Calculus Vol. 3 §6.7', 'OpenStax Calculus Vol. 3 §6.8'],

  explain: {
    intro: R`Two derivatives describe how a vector field behaves near a point: the **divergence** measures how much it spreads out, and the **curl** measures how much it swirls. Surface integrals measure the flow of a field through a surface. Stokes' theorem and the divergence theorem tie these together, each trading an integral over a boundary for an integral over what the boundary encloses.`,
    rules: [
      { title: 'Divergence', text: R`For \(\mathbf{F} = \langle P, Q, R \rangle\), \(\operatorname{div}\mathbf{F} = \nabla \cdot \mathbf{F} = \dfrac{\partial P}{\partial x} + \dfrac{\partial Q}{\partial y} + \dfrac{\partial R}{\partial z}\). It is a scalar: the net rate at which the field flows out of a small region, per unit volume. Positive means a source, negative a sink, and zero means inflow and outflow balance.`, example: R`\(\mathbf{F} = \langle x^{2}y, yz, xz^{2} \rangle\): \(\operatorname{div}\mathbf{F} = 2xy + z + 2xz\).` },
      { title: 'Curl', text: R`\(\operatorname{curl}\mathbf{F} = \nabla \times \mathbf{F} = \left\langle \dfrac{\partial R}{\partial y} - \dfrac{\partial Q}{\partial z},\; \dfrac{\partial P}{\partial z} - \dfrac{\partial R}{\partial x},\; \dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} \right\rangle\). It is a vector: it points along the axis about which the field swirls (by the right-hand rule), and its length measures how strong the swirl is.`, example: R`\(\mathbf{F} = \langle x^{2}y, yz, xz^{2} \rangle\): \(\operatorname{curl}\mathbf{F} = \langle 0 - y,\; 0 - z^{2},\; 0 - x^{2} \rangle = \langle -y, -z^{2}, -x^{2} \rangle\).` },
      { title: 'Two identities', text: R`For fields and functions with continuous second partial derivatives, \(\operatorname{div}(\operatorname{curl}\mathbf{F}) = 0\) and \(\operatorname{curl}(\nabla f) = \mathbf{0}\). So a field with non-zero divergence is not a curl, and a field with non-zero curl is not conservative. On all of space the converses hold as well.`, example: R`\(\langle x, y, z \rangle\) has divergence 3, so it is not the curl of any field. \(\langle -y, x, 0 \rangle\) has curl \(\langle 0, 0, 2 \rangle\), so it is not a gradient.` },
      { title: 'Parametrized surfaces and surface area', text: R`A surface can be described by \(\mathbf{r}(u, v)\). The vector \(\mathbf{r}_{u} \times \mathbf{r}_{v}\) is normal to it, and \(dS = |\mathbf{r}_{u} \times \mathbf{r}_{v}|\,du\,dv\), so the area is \(\displaystyle\iint |\mathbf{r}_{u} \times \mathbf{r}_{v}|\,du\,dv\). For a graph \(z = g(x, y)\): \(dS = \sqrt{1 + g_{x}^{2} + g_{y}^{2}}\,dA\).`, example: R`The part of the plane \(z = 2x + 2y\) above a region of area 5 has area \(\sqrt{1 + 4 + 4} \cdot 5 = 15\).` },
      { title: 'Surface integrals and flux', text: R`The integral of a function over a surface is \(\displaystyle\iint_{S} f\,dS\). The **flux** of a field across an oriented surface is \(\displaystyle\iint_{S} \mathbf{F} \cdot \mathbf{N}\,dS = \iint \mathbf{F} \cdot (\mathbf{r}_{u} \times \mathbf{r}_{v})\,du\,dv\), where \(\mathbf{N}\) is the chosen unit normal. For a graph \(z = g(x, y)\) with upward normal it is \(\displaystyle\iint \mathbf{F} \cdot \langle -g_{x}, -g_{y}, 1 \rangle\,dA\). Choosing the opposite normal changes the sign.`, example: R`\(\mathbf{F} = \langle 1, 2, 3 \rangle\) across the part of \(z = 6 - 2x - y\) above a region of area 4, upward: \(\langle 1, 2, 3 \rangle \cdot \langle 2, 1, 1 \rangle \cdot 4 = 28\).` },
      { title: "Stokes' theorem", text: R`If \(S\) is an oriented surface with boundary curve \(C\), then \(\displaystyle\oint_{C} \mathbf{F} \cdot d\mathbf{r} = \iint_{S} \operatorname{curl}\mathbf{F} \cdot \mathbf{N}\,dS\). The direction of \(C\) must match \(\mathbf{N}\) by the right-hand rule: with your thumb along \(\mathbf{N}\), your fingers curl in the direction of travel (counter-clockwise as seen from the tip of \(\mathbf{N}\)). Any surface with the same boundary gives the same value.`, example: R`\(\mathbf{F} = \langle -y, x, z^{2} \rangle\) around the circle \(x^{2} + y^{2} = 4\), \(z = 5\), counter-clockwise from above: \(\operatorname{curl}\mathbf{F} \cdot \mathbf{k} = 2\), so the integral is \(2 \cdot 4\pi = 8\pi\).` },
      { title: 'The divergence theorem', text: R`If \(S\) is a **closed** surface enclosing the solid \(E\), with outward normal, then \(\displaystyle\iint_{S} \mathbf{F} \cdot \mathbf{N}\,dS = \iiint_{E} \operatorname{div}\mathbf{F}\,dV\): the total flow out through the surface equals the total of the sources inside. For an open surface, close it with an extra piece, apply the theorem, and take away the flux through the extra piece.`, example: R`\(\mathbf{F} = \langle x^{3}, y^{3}, z^{3} \rangle\) out of the unit sphere: \(\operatorname{div}\mathbf{F} = 3\rho^{2}\), and \(\displaystyle\iiint_{E} 3\rho^{2}\,dV = 3 \cdot 4\pi \cdot \frac{1}{5} = \frac{12\pi}{5}\).` },
    ],
    vocab: [
      { term: 'flux', def: 'The rate at which a field flows across a surface, in the direction of the chosen normal.' },
      { term: 'orientation', def: 'The choice of one of the two unit normals to a surface (up or down, out or in). It fixes the sign of a flux.' },
      { term: 'closed surface', def: 'A surface with no edge that encloses a solid, such as a sphere or the whole surface of a box.' },
      { term: 'incompressible, irrotational', def: R`A field with \(\operatorname{div}\mathbf{F} = 0\) is incompressible; a field with \(\operatorname{curl}\mathbf{F} = \mathbf{0}\) is irrotational.` },
    ],
    mistakes: [
      'Treating the divergence as a vector or the curl as a scalar. Divergence is a number at each point; curl is a vector.',
      R`Getting the sign of the middle component of the curl wrong: it is \(\dfrac{\partial P}{\partial z} - \dfrac{\partial R}{\partial x}\).`,
      'Using the divergence theorem on a surface that is not closed, without adding and then subtracting the missing piece.',
      R`Ignoring orientation. Flux changes sign with the normal, and in Stokes' theorem the direction of \(C\) must match the normal by the right-hand rule.`,
      R`Using the upward normal \(\langle g_{x}, g_{y}, 1 \rangle\) for a graph. It is \(\langle -g_{x}, -g_{y}, 1 \rangle\).`,
    ],
    visual: [
      {
        type: 'plot',
        x: [-3, 3],
        y: [-3, 3],
        square: true,
        segments: [-2, -1, 0, 1, 2].flatMap((x) => [-2, -1, 0, 1, 2].filter((y) => x || y).map((y) => ({ from: [x - 0.15 * x, y - 0.15 * y], to: [x + 0.15 * x, y + 0.15 * y], arrow: true, color: 'a' }))),
        alt: 'The field F = ⟨x, y⟩ in the plane: every arrow points straight away from the origin, and the arrows get longer farther out. The field spreads out without swirling: its divergence is positive and its curl is zero.',
      },
      {
        type: 'plot',
        x: [-3, 3],
        y: [-3, 3],
        square: true,
        segments: [-2, -1, 0, 1, 2].flatMap((x) => [-2, -1, 0, 1, 2].filter((y) => x || y).map((y) => ({ from: [x + 0.15 * y, y - 0.15 * x], to: [x - 0.15 * y, y + 0.15 * x], arrow: true, color: 'b' }))),
        alt: 'The field F = ⟨−y, x⟩ in the plane: the arrows circle the origin counter-clockwise. The field swirls without spreading out: its divergence is zero and its curl points up out of the page.',
      },
    ],
  },

  examples: [
    {
      title: 'Divergence and curl of a field',
      problem: R`Find \(\operatorname{div}\mathbf{F}\) and \(\operatorname{curl}\mathbf{F}\) for \(\mathbf{F} = \langle x^{2}y, yz, xz^{2} \rangle\).`,
      steps: [
        R`\(P = x^{2}y\), \(Q = yz\), \(R = xz^{2}\).`,
        R`Divergence: \(\dfrac{\partial P}{\partial x} + \dfrac{\partial Q}{\partial y} + \dfrac{\partial R}{\partial z} = 2xy + z + 2xz\).`,
        R`Curl, first component: \(\dfrac{\partial R}{\partial y} - \dfrac{\partial Q}{\partial z} = 0 - y\). Second: \(\dfrac{\partial P}{\partial z} - \dfrac{\partial R}{\partial x} = 0 - z^{2}\). Third: \(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = 0 - x^{2}\).`,
      ],
      answer: R`\(\operatorname{div}\mathbf{F} = 2xy + z + 2xz\) and \(\operatorname{curl}\mathbf{F} = \langle -y, -z^{2}, -x^{2} \rangle\)`,
    },
    {
      title: 'Surface area of a cone',
      problem: R`Find the area of the part of the cone \(z = \sqrt{x^{2} + y^{2}}\) that lies below the plane \(z = 3\).`,
      steps: [
        R`For a graph \(z = g(x, y)\), \(dS = \sqrt{1 + g_{x}^{2} + g_{y}^{2}}\,dA\).`,
        R`\(g_{x} = \dfrac{x}{\sqrt{x^{2} + y^{2}}}\) and \(g_{y} = \dfrac{y}{\sqrt{x^{2} + y^{2}}}\), so \(g_{x}^{2} + g_{y}^{2} = 1\) and \(dS = \sqrt{2}\,dA\).`,
        R`The cone reaches \(z = 3\) where \(x^{2} + y^{2} = 9\), so the surface lies above a disk of radius 3, with area \(9\pi\).`,
      ],
      answer: R`\(9\sqrt{2}\,\pi\)`,
    },
    {
      title: 'Word problem: air through a sloping vent',
      word: true,
      problem: R`Air flows with constant velocity \(\mathbf{F} = \langle 1, 2, 3 \rangle\) m/s. A vent is the part of the plane \(z = 6 - 2x - y\) above the square \(0 \le x \le 2\), \(0 \le y \le 2\) (in meters). At what rate does air cross the vent in the upward direction?`,
      steps: [
        'The rate of flow across a surface is the flux of the velocity field.',
        R`The vent is the graph of \(g = 6 - 2x - y\), so its upward normal is \(\langle -g_{x}, -g_{y}, 1 \rangle = \langle 2, 1, 1 \rangle\).`,
        R`\(\mathbf{F} \cdot \langle 2, 1, 1 \rangle = 2 + 2 + 3 = 7\), the same at every point.`,
        R`Flux \(= \displaystyle\int_{0}^{2}\int_{0}^{2} 7\,dy\,dx = 7 \cdot 4\).`,
      ],
      answer: '28 cubic meters per second',
    },
    {
      title: "Stokes' theorem around a circle",
      problem: R`Evaluate \(\displaystyle\oint_{C} \mathbf{F} \cdot d\mathbf{r}\) for \(\mathbf{F} = \langle -y, x, z^{2} \rangle\), where \(C\) is the circle \(x^{2} + y^{2} = 4\) in the plane \(z = 5\), counter-clockwise as seen from above.`,
      steps: [
        R`Take \(S\) to be the flat disk inside \(C\), with upward normal \(\mathbf{k}\). That matches counter-clockwise travel seen from above.`,
        R`\(\operatorname{curl}\mathbf{F} \cdot \mathbf{k} = \dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} = 1 - (-1) = 2\).`,
        R`\(\displaystyle\iint_{S} 2\,dS = 2 \cdot (\text{area of the disk}) = 2 \cdot 4\pi\).`,
      ],
      answer: R`\(8\pi\)`,
    },
    {
      title: 'The divergence theorem on a sphere',
      problem: R`Find the outward flux of \(\mathbf{F} = \langle x^{3}, y^{3}, z^{3} \rangle\) across the sphere \(x^{2} + y^{2} + z^{2} = 1\).`,
      steps: [
        R`\(\operatorname{div}\mathbf{F} = 3x^{2} + 3y^{2} + 3z^{2} = 3\rho^{2}\).`,
        R`By the divergence theorem the flux is \(\displaystyle\iiint_{E} 3\rho^{2}\,dV = 3\int_{0}^{2\pi}\int_{0}^{\pi}\int_{0}^{1} \rho^{4}\sin\phi\,d\rho\,d\phi\,d\theta\).`,
        R`\(= 3 \cdot 2\pi \cdot 2 \cdot \dfrac{1}{5}\).`,
      ],
      answer: R`\(\dfrac{12\pi}{5}\)`,
    },
  ],

  models: [
    {
      id: 'spread-and-swirl',
      title: 'Divergence and curl of a linear field',
      intro: 'The field is F = ⟨a·x + b·y, c·x + d·y, 0⟩. Choose the four numbers and watch the arrows.',
      inputs: [
        { name: 'a', label: 'a (x in the first component)', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'b', label: 'b (y in the first component)', type: 'int', min: -3, max: 3, value: -2 },
        { name: 'c', label: 'c (x in the second component)', type: 'int', min: -3, max: 3, value: 2 },
        { name: 'd', label: 'd (y in the second component)', type: 'int', min: -3, max: 3, value: 1 },
      ],
      compute({ a, b, c, d }) {
        const [div, spin] = [a + d, c - b];
        const grid = [-2, -1, 0, 1, 2].flatMap((x) => [-2, -1, 0, 1, 2].map((y) => [x, y, a * x + b * y, c * x + d * y])).filter((v) => v[2] || v[3]);
        const longest = Math.max(1, ...grid.map((v) => Math.hypot(v[2], v[3])));
        return {
          problem: R`Find the divergence and curl of \(\mathbf{F} = ${V([terms([[a, 'x'], [b, 'y']]), terms([[c, 'x'], [d, 'y']]), 0])}\).`,
          steps: [
            R`\(P = ${terms([[a, 'x'], [b, 'y']])}\), \(Q = ${terms([[c, 'x'], [d, 'y']])}\), \(R = 0\).`,
            R`\(\operatorname{div}\mathbf{F} = \dfrac{\partial P}{\partial x} + \dfrac{\partial Q}{\partial y} + \dfrac{\partial R}{\partial z} = ${a} + ${paren(d)} + 0 = ${div}\). ${div > 0 ? 'The field spreads out: every point acts as a source.' : div < 0 ? 'The field closes in: every point acts as a sink.' : 'Inflow and outflow balance at every point.'}`,
            R`\(\operatorname{curl}\mathbf{F} = \left\langle 0 - 0,\; 0 - 0,\; \dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y} \right\rangle = \langle 0, 0, ${c} - ${paren(b)} \rangle = ${V([0, 0, spin])}\). ${spin > 0 ? 'The field swirls counter-clockwise about the z-axis.' : spin < 0 ? 'The field swirls clockwise about the z-axis.' : 'The field does not swirl.'}`,
          ],
          answer: R`\(\operatorname{div}\mathbf{F} = ${div}\) and \(\operatorname{curl}\mathbf{F} = ${V([0, 0, spin])}\)`,
          visual: grid.length
            ? {
              type: 'plot',
              x: [-3, 3],
              y: [-3, 3],
              square: true,
              segments: grid.map(([x, y, u, v]) => ({ from: [x - (0.4 * u) / longest, y - (0.4 * v) / longest], to: [x + (0.4 * u) / longest, y + (0.4 * v) / longest], arrow: true, color: 'a' })),
              alt: `The field in the xy-plane, drawn as arrows on a grid. Its divergence is ${div} and the z-component of its curl is ${spin}.`,
            }
            : undefined,
        };
      },
    },
    {
      id: 'flow-through-a-filter',
      title: 'Word problem: water through a tilted filter',
      word: true,
      intro: 'Water flows steadily in one direction. Choose its speed, the size of the flat filter, and the angle between the flow and the normal to the filter.',
      inputs: [
        { name: 'speed', label: 'Speed of the water (m/s)', type: 'int', min: 1, max: 10, value: 4 },
        { name: 'w', label: 'Width of the filter (m)', type: 'int', min: 1, max: 6, value: 2 },
        { name: 'h', label: 'Height of the filter (m)', type: 'int', min: 1, max: 6, value: 3 },
        { name: 'deg', label: 'Angle between the flow and the normal', type: 'select', value: 60, options: [0, 30, 45, 60, 90].map((d) => ({ value: d, label: `${d}°` })) },
      ],
      compute({ speed, w, h, deg }) {
        const [k, rad] = exactCos(deg); // cos = k·√rad / 2
        const t = (deg * PI) / 180;
        const flux = speed * w * h * Math.cos(t);
        const exact = rootOver(speed * w * h * k, rad, 2);
        return {
          problem: R`Water flows at ${speed} m/s. A flat filter ${w} m wide and ${h} m high is held so that its unit normal \(\mathbf{N}\) makes an angle of \(${deg}^{\circ}\) with the direction of flow. How much water passes through the filter each second?`,
          steps: [
            R`The flow rate is the flux of the velocity field \(\mathbf{F}\) through the filter: \(\displaystyle\iint_{S} \mathbf{F} \cdot \mathbf{N}\,dS\).`,
            R`\(\mathbf{F}\) and \(\mathbf{N}\) are constant, so \(\mathbf{F} \cdot \mathbf{N} = |\mathbf{F}|\cos ${deg}^{\circ} = ${dot(speed, rootOver(k, rad, 2))}\) at every point of the filter. Only the part of the flow along the normal crosses the surface.`,
            R`Flux \(= (\mathbf{F} \cdot \mathbf{N}) \cdot (\text{area}) = ${dot(speed, rootOver(k, rad, 2), w * h)} = ${exact}\)${rad === 1 ? '' : R` \(\approx ${num(flux, { places: 2 })}\)`} m³/s.`,
            deg === 0 ? 'The filter faces the flow head-on, so all of the flow passes through.' : deg === 90 ? 'The filter is edge-on to the flow, so the water slides past it and none passes through.' : `Turning the filter away from the flow cuts the rate to ${num(100 * Math.cos(t), { places: 1 })}% of the head-on value.`,
          ],
          answer: R`\(${exact}\)${rad === 1 ? '' : R` \(\approx ${num(flux, { places: 2 })}\)`} cubic meters per second`,
          visual: {
            type: 'plot',
            x: [-3, 3],
            y: [-3, 3],
            square: true,
            segments: [
              ...[-1.5, 0, 1.5].map((y) => ({ from: [-2.6, y], to: [-1.2, y], arrow: true, color: 'a' })),
              { from: [1.6 * Math.sin(t), -1.6 * Math.cos(t)], to: [-1.6 * Math.sin(t), 1.6 * Math.cos(t)], color: 'b', label: 'filter' },
              { from: [0, 0], to: [1.4 * Math.cos(t), 1.4 * Math.sin(t)], arrow: true, color: 'c', label: 'N' },
            ],
            alt: `Side view. Arrows on the left show the water flowing to the right. The filter is drawn as a line through the origin, and its normal N makes an angle of ${deg} degrees with the direction of flow.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyDivergence, easyCurl, easySourceSink],
    medium: [mediumSurfaceArea, mediumFluxPlane, mediumDivergenceTheorem],
    hard: [hardFluxCurved, hardStokes, hardDivergenceVariable],
    challenge: [challengeSwapSurface, challengeCloseSurface, challengeWhichField],
  },
};
