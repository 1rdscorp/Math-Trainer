import { R, q, frac, num, round, terms, poly, polyEval, polyDeriv, sqrtTex, numDeriv, integrate, checkEqual, checkLimit } from '../../lib/index.js';
import { M, V, Pt, vadd, vscale, vdot, vcross, vlen2, vlen, isZero, parallel, rvec, quadVec, zeros, rootOver, piTex, exactSin, rad, lineTex, sameLine } from './_shared.js';

const pT = (c) => poly(c, 't');
/** ⟨p₁(t), p₂(t), p₃(t)⟩ for polynomial components (coefficients highest power first). */
const rT = (comps) => V(comps.map(pT));
const at = (comps, t) => comps.map((c) => polyEval(c, t));
const d1 = (comps) => comps.map(polyDeriv);
const flipOne = (v) => {
  const i = v.findIndex((x) => x !== 0);
  return v.map((x, j) => (j === i ? -x : x));
};
/** A random polynomial component of degree 1 to maxDeg. */
function randPoly(rng, maxDeg = 3) {
  const deg = rng.int(1, maxDeg);
  const c = [rng.nonzero(-5, 5)];
  for (let i = 1; i <= deg; i++) c.push(rng.bool(0.55) ? rng.int(-6, 6) : 0);
  return c;
}
/** Quadratic components whose velocity at t₀ has a whole-number length: r′(t₀) = Q, r″(t₀) = A. */
function quadMotion(rng) {
  const { v: Q, len } = quadVec(rng, 9);
  const t0 = rng.pick([1, 2, -1]);
  let alpha;
  do alpha = rvec(rng, -2, 2);
  while (parallel(alpha, Q));
  const comps = alpha.map((a, i) => [a, Q[i] - 2 * a * t0, rng.int(-4, 4)]);
  return { comps, t0, Q, len, A: vscale(alpha, 2) };
}

// ───────────── Easy ─────────────

function easyDerivative(rng) {
  const comps = [randPoly(rng), randPoly(rng), randPoly(rng)];
  const d = d1(comps);
  const noDrop = comps.map((c) => [...c.slice(0, -1).map((x, i) => x * (c.length - 1 - i)), 0]);
  const keep = d.map((c, i) => [...c.slice(0, -1), c[c.length - 1] + comps[i][comps[i].length - 1]]);
  return q({
    prompt: R`Find \(\mathbf{r}'(t)\) for \(\mathbf{r}(t) = ${rT(comps)}\).`,
    correct: M(rT(d)),
    wrong: [
      { value: M(rT(noDrop)), why: R`Each power of \(t\) also goes down by 1.` },
      { value: M(rT(keep)), why: 'The derivative of a constant term is 0.' },
      M(rT([comps[0], d[1], d[2]])),
      M(rT(d1(d))),
      M(rT([d[0], d[1].map((x) => -x), d[2]])),
      M(rT([d[0], d[1], comps[2]])),
    ],
    solution: [
      'Differentiate each component separately.',
      R`${comps.map((c, i) => R`\(${pT(c)} \to ${pT(d[i])}\)`).join(', ')}.`,
      R`\(\mathbf{r}'(t) = ${rT(d)}\).`,
    ],
    rule: 1,
    skill: 'derivative of r(t)',
    check: () => (comps.every((c, i) => [0.7, -1.3].every((t) => Math.abs(numDeriv((x) => polyEval(c, x), t) - polyEval(d[i], t)) < 1e-5)) ? true : 'derivative mismatch'),
  });
}

// Components for a limit as t → 0: { tex, lim, js, slips: values a slip produces, how }.
const LIMIT_PARTS = [
  (rng) => {
    const k = rng.int(2, 6);
    return { tex: `\\frac{\\sin ${k}t}{t}`, lim: k, js: (t) => Math.sin(k * t) / t, slips: [0, 1], hard: true, how: R`\(\dfrac{\sin ${k}t}{t} \to ${k}\) (since \(\dfrac{\sin u}{u} \to 1\) with \(u = ${k}t\))` };
  },
  (rng) => {
    const k = rng.int(2, 6);
    return { tex: `\\frac{e^{${k}t} - 1}{t}`, lim: k, js: (t) => (Math.exp(k * t) - 1) / t, slips: [0, 1], hard: true, how: R`\(\dfrac{e^{${k}t} - 1}{t} \to ${k}\) (L'Hôpital's rule: \(\dfrac{${k}e^{${k}t}}{1} \to ${k}\))` };
  },
  (rng) => {
    const b = rng.nonzero(-6, 6);
    return { tex: `\\frac{${terms([[1, 't^{2}'], [b, 't']])}}{t}`, lim: b, js: (t) => (t * t + b * t) / t, slips: [0, 1], hard: true, how: R`\(\dfrac{${terms([[1, 't^{2}'], [b, 't']])}}{t} = ${terms([[1, 't'], [b, '']])} \to ${b}\)` };
  },
  (rng) => {
    const c = rng.nonzero(-6, 6);
    return { tex: terms([[1, 't^{2}'], [c, '']]), lim: c, js: (t) => t * t + c, slips: [0], how: R`\(${terms([[1, 't^{2}'], [c, '']])} \to ${c}\)` };
  },
  (rng) => {
    const k = rng.int(2, 5);
    return { tex: `\\cos ${k}t`, lim: 1, js: (t) => Math.cos(k * t), slips: [0, k], how: R`\(\cos ${k}t \to \cos 0 = 1\)` };
  },
  (rng) => {
    const k = rng.int(2, 5);
    return { tex: `${k}e^{t}`, lim: k, js: (t) => k * Math.exp(t), slips: [0, 1], how: R`\(${k}e^{t} \to ${k}e^{0} = ${k}\)` };
  },
];

function easyLimit(rng) {
  let parts;
  do parts = rng.sample(LIMIT_PARTS, 3).map((make) => make(rng));
  while (!parts.some((p) => p.hard));
  const lims = parts.map((p) => p.lim);
  const withSlip = (i, k) => lims.map((x, j) => (j === i ? parts[i].slips[k] : x));
  const h = parts.findIndex((p) => p.hard);
  return q({
    prompt: R`Find \(\lim\limits_{t \to 0} \mathbf{r}(t)\) for \(\mathbf{r}(t) = \left\langle ${parts.map((p) => p.tex).join(',\\; ')} \right\rangle\).`,
    correct: M(V(lims)),
    wrong: [
      { value: M(V(withSlip(h, 0))), why: R`\(\frac{0}{0}\) is not 0. Simplify that component, or use L'Hôpital's rule, before taking the limit.` },
      { value: 'The limit does not exist.', why: R`A component that has no value at \(t = 0\) can still have a limit there.` },
      M(V(withSlip(h, 1))),
      ...[0, 1, 2].filter((i) => i !== h).map((i) => M(V(withSlip(i, 0)))),
      M(V(lims.map((x, j) => (j === 2 ? x + 1 : x)))),
    ],
    solution: ['Take the limit of each component separately.', `${parts.map((p) => p.how).join('; ')}.`, R`\(\lim\limits_{t \to 0} \mathbf{r}(t) = ${V(lims)}\).`],
    rule: 0,
    skill: 'limits of r(t)',
    check: () => parts.map((p) => checkLimit(p.js, 0, p.lim)).find((r) => r !== true) ?? true,
  });
}

function easyDomain(rng) {
  const a = rng.int(-5, 3);
  const b = a + rng.int(2, 6);
  const ta = terms([[1, 't'], [-a, '']]);
  const bt = terms([[b, ''], [-1, 't']]);
  const tb = terms([[1, 't'], [-b, '']]);
  const P = {
    sqrtA: { tex: `\\sqrt{${ta}}`, js: (t) => Math.sqrt(t - a), need: R`\(\sqrt{${ta}}\) needs \(${ta} \ge 0\), so \(t \ge ${a}\)` },
    lnA: { tex: `\\ln(${ta})`, js: (t) => Math.log(t - a), need: R`\(\ln(${ta})\) needs \(${ta} > 0\), so \(t > ${a}\)` },
    sqrtB: { tex: `\\sqrt{${bt}}`, js: (t) => Math.sqrt(b - t), need: R`\(\sqrt{${bt}}\) needs \(${bt} \ge 0\), so \(t \le ${b}\)` },
    lnB: { tex: `\\ln(${bt})`, js: (t) => Math.log(b - t), need: R`\(\ln(${bt})\) needs \(${bt} > 0\), so \(t < ${b}\)` },
    recB: { tex: `\\frac{1}{${tb}}`, js: (t) => 1 / (t - b), need: R`\(\dfrac{1}{${tb}}\) needs \(t \ne ${b}\)` },
  };
  const inf = '\\infty';
  const iv = (l, x, y, r) => `${l}${x}, ${y}${r}`;
  const cases = [
    { parts: ['sqrtA', 'sqrtB'], ans: iv('[', a, b, ']'), wrong: [iv('(', a, b, ')'), iv('[', a, b, ')'), iv('(', a, b, ']'), iv('[', a, inf, ')')], inDom: (t) => t >= a && t <= b },
    { parts: ['sqrtA', 'lnB'], ans: iv('[', a, b, ')'), wrong: [iv('[', a, b, ']'), iv('(', a, b, ')'), iv('(', a, b, ']'), iv('[', a, inf, ')')], inDom: (t) => t >= a && t < b },
    { parts: ['lnA', 'sqrtB'], ans: iv('(', a, b, ']'), wrong: [iv('[', a, b, ']'), iv('(', a, b, ')'), iv('[', a, b, ')'), iv('(', a, inf, ')')], inDom: (t) => t > a && t <= b },
    { parts: ['lnA', 'lnB'], ans: iv('(', a, b, ')'), wrong: [iv('[', a, b, ']'), iv('[', a, b, ')'), iv('(', a, b, ']'), iv('(', a, inf, ')')], inDom: (t) => t > a && t < b },
    { parts: ['sqrtA', 'recB'], ans: `${iv('[', a, b, ')')} \\cup ${iv('(', b, inf, ')')}`, wrong: [iv('[', a, inf, ')'), `${iv('(', a, b, ')')} \\cup ${iv('(', b, inf, ')')}`, iv('[', a, b, ')'), iv('(', b, inf, ')')], inDom: (t) => t >= a && t !== b },
    { parts: ['lnA', 'recB'], ans: `${iv('(', a, b, ')')} \\cup ${iv('(', b, inf, ')')}`, wrong: [iv('(', a, inf, ')'), `${iv('[', a, b, ')')} \\cup ${iv('(', b, inf, ')')}`, iv('(', a, b, ')'), iv('(', b, inf, ')')], inDom: (t) => t > a && t !== b },
  ];
  const c = rng.pick(cases);
  const filler = rng.pick([{ tex: 't^{2}', js: (t) => t * t }, { tex: 'e^{t}', js: Math.exp }, { tex: '\\cos t', js: Math.cos }, { tex: '3t', js: (t) => 3 * t }]);
  const comps = rng.shuffle([P[c.parts[0]], P[c.parts[1]], filler]);
  return q({
    prompt: R`Find the domain of \(\mathbf{r}(t) = \left\langle ${comps.map((p) => p.tex).join(',\\; ')} \right\rangle\).`,
    correct: M(c.ans),
    wrong: [{ value: M(c.wrong[0]), why: 'Check each endpoint: a square root allows 0 inside it, a logarithm does not, and a denominator cannot be 0.' }, ...c.wrong.slice(1).map(M)],
    solution: [
      'The domain is the set of all t for which every component is defined.',
      `${c.parts.map((k) => P[k].need).join('; ')}. The remaining component is defined for every t.`,
      R`All the conditions together: \(${c.ans}\).`,
    ],
    rule: 0,
    skill: 'domain of r(t)',
    check: () => {
      for (const t of [a - 1, a, a + 0.5, (a + b) / 2, b - 0.25, b, b + 1, b + 7]) {
        const defined = comps.every((p) => Number.isFinite(p.js(t)));
        if (defined !== c.inDom(t)) return `domain is wrong at t = ${t}`;
      }
      return true;
    },
  });
}

function easySpeedLine(rng) {
  const { v, len } = quadVec(rng, 13);
  const p = rvec(rng, -5, 5);
  const s = v.reduce((t, x) => t + Math.abs(x), 0);
  return q({
    prompt: R`A drone's position (in meters) after \(t\) seconds is \(\mathbf{r}(t) = \langle ${p.map((c, i) => terms([[c, ''], [v[i], 't']])).join(', ')} \rangle\). What is its speed?`,
    correct: len,
    unit: 'm/s',
    wrong: [
      { value: s, why: 'Speed is the length of the velocity vector: square the components, add, and take the square root.' },
      { value: len * len, why: R`\(${len * len}\) is \(|\mathbf{v}|^{2}\). Take the square root.` },
      len + 1,
    ],
    solution: [R`Velocity: \(\mathbf{v}(t) = \mathbf{r}'(t) = ${V(v)}\), a constant vector.`, R`Speed: \(|\mathbf{v}| = \sqrt{${v.map((x) => x * x).join(' + ')}} = \sqrt{${len * len}} = ${len}\) m/s.`],
    rule: 5,
    skill: 'velocity and speed',
    check: () => checkEqual(len, Math.hypot(...p.map((c, i) => numDeriv((t) => c + v[i] * t, 1)))),
  });
}

// ───────────── Medium ─────────────

// Components to differentiate at t = 0: { tex, dtex, d: r′(0), pos: r(0), slip: value without the chain rule, js }.
const ZERO_PARTS = [
  (rng) => {
    const a = rng.intExcept(-5, 5, [0, 1]);
    return { tex: `e^{${terms([[a, 't']])}}`, dtex: `${terms([[a, `e^{${terms([[a, 't']])}}`]])}`, d: a, pos: 1, slip: 1, js: (t) => Math.exp(a * t) };
  },
  (rng) => {
    const b = rng.int(2, 6);
    return { tex: `\\sin ${b}t`, dtex: `${b}\\cos ${b}t`, d: b, pos: 0, slip: 1, js: (t) => Math.sin(b * t) };
  },
  (rng) => {
    const b = rng.int(2, 6);
    return { tex: `\\cos ${b}t`, dtex: `-${b}\\sin ${b}t`, d: 0, pos: 1, slip: -b, js: (t) => Math.cos(b * t) };
  },
  (rng) => {
    const c = rng.int(2, 6);
    return { tex: `\\ln(1 + ${c}t)`, dtex: `\\frac{${c}}{1 + ${c}t}`, d: c, pos: 0, slip: 1, js: (t) => Math.log(1 + c * t) };
  },
  (rng) => {
    const c = rng.nonzero(-5, 5);
    return { tex: `(${terms([[1, 't'], [c, '']])})^{2}`, dtex: `2(${terms([[1, 't'], [c, '']])})`, d: 2 * c, pos: c * c, slip: 2, js: (t) => (t + c) ** 2 };
  },
  (rng) => {
    const c = rng.nonzero(-6, 6);
    return { tex: terms([[1, 't^{3}'], [c, 't']]), dtex: terms([[3, 't^{2}'], [c, '']]), d: c, pos: 0, slip: 3, js: (t) => t ** 3 + c * t };
  },
];

function mediumTangentVector(rng) {
  const parts = rng.sample(ZERO_PARTS, 3).map((make) => make(rng));
  const d = parts.map((p) => p.d);
  return q({
    prompt: R`Find the tangent vector \(\mathbf{r}'(0)\) for \(\mathbf{r}(t) = \left\langle ${parts.map((p) => p.tex).join(',\\; ')} \right\rangle\).`,
    correct: M(V(d)),
    wrong: [
      { value: M(V(parts.map((p) => p.pos))), why: R`That is \(\mathbf{r}(0)\), the position. Differentiate first, then substitute \(t = 0\).` },
      { value: M(V(parts.map((p) => p.slip))), why: 'Use the chain rule on each component: multiply by the derivative of the inside.' },
      M(V([parts[0].slip, d[1], d[2]])),
      M(V([d[0], d[1], parts[2].slip])),
      M(V([d[0], parts[1].slip, d[2]])),
      M(V(d.map((x, i) => (i === 0 ? x + 1 : x)))),
    ],
    solution: ['Differentiate each component, using the chain rule where needed.', R`\(\mathbf{r}'(t) = \left\langle ${parts.map((p) => p.dtex).join(',\\; ')} \right\rangle\).`, R`Substitute \(t = 0\): \(\mathbf{r}'(0) = ${V(d)}\).`],
    rule: 1,
    skill: 'tangent vector',
    check: () => (parts.every((p) => Math.abs(numDeriv(p.js, 0) - p.d) < 1e-6) ? true : 'derivative at 0 mismatch'),
  });
}

function mediumIntegral(rng) {
  const T = rng.int(1, 3);
  const mono = () => {
    const n = rng.int(0, 3);
    const a = rng.nonzero(-6, 6);
    return { a, n, tex: terms([[a, n === 0 ? '' : n === 1 ? 't' : `t^{${n}}`]]), anti: terms([[frac(a, n + 1), n === 0 ? 't' : `t^{${n + 1}}`]]), val: frac(a * T ** (n + 1), n + 1), js: (t) => a * t ** n };
  };
  let parts;
  do parts = [mono(), mono(), mono()];
  while (parts.every((p) => p.n === 0) || !parts.some((p) => p.n >= 2));
  const vals = parts.map((p) => p.val);
  return q({
    prompt: R`Evaluate \(\displaystyle\int_{0}^{${T}} \left\langle ${parts.map((p) => p.tex).join(',\\; ')} \right\rangle dt\).`,
    correct: M(V(vals)),
    wrong: [
      { value: M(V(parts.map((p) => p.a * T ** (p.n + 1)))), why: R`When the exponent goes up by 1, divide by the new exponent: \(\int t^{n}\,dt = \dfrac{t^{n+1}}{n+1}\).` },
      { value: M(V(parts.map((p) => p.a * T ** p.n))), why: R`That is the integrand at \(t = ${T}\). Find an antiderivative of each component first.` },
      M(V(parts.map((p) => (p.n === 0 ? 0 : p.a * p.n * T ** (p.n - 1))))),
      M(V(vals.map((v, i) => (i === 0 ? v.neg() : v)))),
      M(V(vals.map((v, i) => (i === 2 ? v.add(1) : v)))),
    ],
    solution: [
      'Integrate each component separately.',
      R`Antiderivative: \(\left\langle ${parts.map((p) => p.anti).join(',\\; ')} \right\rangle\).`,
      R`Evaluate from \(0\) to \(${T}\) (every component is 0 at \(t = 0\)): \(${V(vals)}\).`,
    ],
    rule: 2,
    skill: 'integral of r(t)',
    check: () => (parts.every((p) => Math.abs(integrate(p.js, 0, T) - p.val.value) < 1e-6) ? true : 'integral mismatch'),
  });
}

function mediumTangentLine(rng) {
  let comps;
  let t0;
  let P;
  let D;
  do {
    comps = [randPoly(rng, 2), randPoly(rng, 3), randPoly(rng, 2)];
    t0 = rng.pick([-1, 1, 2]);
    P = at(comps, t0);
    D = at(d1(comps), t0);
  } while (isZero(D) || parallel(P, D) || zeros(D) > 1 || Math.max(...P.map(Math.abs), ...D.map(Math.abs)) > 40);
  const wrong = [
    [D, P, R`The line passes through the point \(\mathbf{r}(${t0})\) and has direction \(\mathbf{r}'(${t0})\), not the other way round.`],
    [P, at(d1(comps), 0), R`Evaluate the derivative at \(t = ${t0}\) to get the direction.`],
    [at(comps, 0), D],
    [P, flipOne(D)],
    [P, at(d1(d1(comps)), t0)],
    [P, vadd(D, [1, 0, 1])],
  ].filter(([a, b]) => !isZero(b) && !sameLine(P, D, a, b));
  return q({
    prompt: R`Find parametric equations (parameter \(s\)) for the tangent line to \(\mathbf{r}(t) = ${rT(comps)}\) at \(t = ${t0}\).`,
    correct: M(lineTex(P, D, 's')),
    wrong: wrong.map(([a, b, why]) => (why ? { value: M(lineTex(a, b, 's')), why } : M(lineTex(a, b, 's')))),
    solution: [
      R`Point of tangency: \(\mathbf{r}(${t0}) = ${V(P)}\).`,
      R`Direction: \(\mathbf{r}'(t) = ${rT(d1(comps))}\), so \(\mathbf{r}'(${t0}) = ${V(D)}\).`,
      R`Tangent line: \(${lineTex(P, D, 's')}\).`,
    ],
    rule: 1,
    skill: 'tangent line',
    check: () => {
      const num1 = comps.map((c) => numDeriv((x) => polyEval(c, x), t0));
      return num1.every((x, i) => Math.abs(x - D[i]) < 1e-5) && wrong.length >= 3 ? true : 'direction is not r′(t₀)';
    },
  });
}

const TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]];

function mediumHelixArc(rng) {
  const [a, b, c] = rng.pick(TRIPLES);
  const m = rng.int(1, 4);
  const order = rng.pick([[0, 1, 2], [0, 2, 1], [2, 0, 1]]);
  const parts = [`${a}\\cos t`, `${a}\\sin t`, terms([[b, 't']])];
  const shown = order.map((i) => parts[i]);
  const r = (t) => order.map((i) => [a * Math.cos(t), a * Math.sin(t), b * t][i]);
  return q({
    prompt: R`Find the length of the helix \(\mathbf{r}(t) = \langle ${shown.join(', ')} \rangle\) for \(0 \le t \le ${piTex(m)}\).`,
    correct: M(piTex(c * m)),
    wrong: [
      { value: M(piTex(a * m)), why: R`That ignores the climb. The speed is \(\sqrt{${a}^{2} + ${b}^{2}}\), not \(${a}\).` },
      { value: M(piTex((a + b) * m)), why: R`\(|\mathbf{r}'(t)| = \sqrt{${a * a} + ${b * b}}\): square the parts before adding, then take the square root.` },
      M(piTex(c * c * m)),
      M(String(c * m)),
      M(piTex(c * (m + 1))),
    ],
    solution: [
      R`\(\mathbf{r}'(t) = \langle ${order.map((i) => [`-${a}\\sin t`, `${a}\\cos t`, String(b)][i]).join(', ')} \rangle\).`,
      R`\(|\mathbf{r}'(t)| = \sqrt{${a * a}\sin^{2}t + ${a * a}\cos^{2}t + ${b * b}} = \sqrt{${a * a} + ${b * b}} = ${c}\).`,
      R`\(L = \displaystyle\int_{0}^{${piTex(m)}} ${c}\,dt = ${piTex(c * m)}\).`,
    ],
    rule: 3,
    skill: 'arc length',
    check: () => checkEqual(c * m * Math.PI, integrate((t) => Math.hypot(...r(t).map((_, i) => numDeriv((u) => r(u)[i], t))), 0, m * Math.PI, 400), 1e-6, 'arc length'),
  });
}

function mediumAcceleration(rng) {
  const comps = [randPoly(rng, 3), randPoly(rng, 3), randPoly(rng, 2)];
  if (comps.every((c) => c.length < 4)) comps[0] = [rng.nonzero(-3, 3), 0, rng.int(-5, 5), 0];
  const t0 = rng.int(1, 2);
  const v = at(d1(comps), t0);
  const acc = at(d1(d1(comps)), t0);
  return q({
    prompt: R`A particle has position \(\mathbf{r}(t) = ${rT(comps)}\). Find its acceleration at \(t = ${t0}\).`,
    correct: M(V(acc)),
    wrong: [
      { value: M(V(v)), why: R`That is the velocity \(\mathbf{r}'(${t0})\). Acceleration is the second derivative.` },
      { value: M(V(at(comps, t0))), why: 'That is the position. Differentiate twice to get the acceleration.' },
      M(V(at(d1(d1(comps)), 0))),
      M(V(at(d1(d1(comps)), t0 + 1))),
      M(V(acc.map((x, i) => (i === 0 ? -x : x)))),
      M(V(acc.map((x, i) => (i === 2 ? x + 2 : x)))),
    ],
    solution: [
      R`Velocity: \(\mathbf{v}(t) = \mathbf{r}'(t) = ${rT(d1(comps))}\).`,
      R`Acceleration: \(\mathbf{a}(t) = \mathbf{v}'(t) = ${rT(d1(d1(comps)))}\).`,
      R`At \(t = ${t0}\): \(\mathbf{a}(${t0}) = ${V(acc)}\).`,
    ],
    rule: 5,
    skill: 'acceleration',
    check: () => (comps.every((c, i) => Math.abs(numDeriv((x) => numDeriv((y) => polyEval(c, y), x, 1e-3), t0, 1e-3) - acc[i]) < 1e-3) ? true : 'second derivative mismatch'),
  });
}

// ───────────── Hard ─────────────

function hardUnitTangent(rng) {
  const { comps, t0, Q, len } = quadMotion(rng);
  const T = Q.map((x) => frac(x, len));
  return q({
    prompt: R`Find the unit tangent vector \(\mathbf{T}(${t0})\) for \(\mathbf{r}(t) = ${rT(comps)}\).`,
    correct: M(V(T)),
    wrong: [
      { value: M(V(Q)), why: R`That is \(\mathbf{r}'(${t0})\). Divide by its length, \(${len}\), to get a unit vector.` },
      { value: M(V(Q.map((x) => frac(x, len * len)))), why: R`Divide by \(|\mathbf{r}'(${t0})| = ${len}\), not by its square.` },
      M(V(T.map((x) => x.neg()))),
      M(V(at(d1(comps), 0).map((x) => frac(x, len)))),
      M(V(T.map((x, i) => (i === 1 ? x.neg() : x)))),
      M(V(T.map((x, i) => (i === 0 ? x.neg() : x)))),
    ],
    solution: [
      R`\(\mathbf{r}'(t) = ${rT(d1(comps))}\), so \(\mathbf{r}'(${t0}) = ${V(Q)}\).`,
      R`\(|\mathbf{r}'(${t0})| = \sqrt{${Q.map((x) => x * x).join(' + ')}} = ${len}\).`,
      R`\(\mathbf{T}(${t0}) = \dfrac{\mathbf{r}'(${t0})}{|\mathbf{r}'(${t0})|} = ${V(T)}\).`,
    ],
    rule: 3,
    skill: 'unit tangent vector',
    check: () => {
      const d = comps.map((c) => numDeriv((x) => polyEval(c, x), t0));
      const L = Math.hypot(...d);
      return T.every((x, i) => Math.abs(x.value - d[i] / L) < 1e-6) ? true : 'unit tangent mismatch';
    },
  });
}

function hardArcLength(rng) {
  const kind = rng.int(0, 2);
  if (kind === 0) {
    // r = k⟨t³/3, m·t², 2m²·t⟩ has speed k(t² + 2m²)
    const k = rng.pick([1, 3, 6]);
    const m = rng.int(1, 3);
    const T = rng.int(1, 3);
    const L = frac(k * T ** 3, 3).add(2 * k * m * m * T);
    const r = (t) => [(k * t ** 3) / 3, k * m * t * t, 2 * k * m * m * t];
    return q({
      prompt: R`Find the length of the curve \(\mathbf{r}(t) = \left\langle ${terms([[frac(k, 3), 't^{3}']])},\; ${terms([[k * m, 't^{2}']])},\; ${terms([[2 * k * m * m, 't']])} \right\rangle\) for \(0 \le t \le ${T}\).`,
      correct: L,
      wrong: [
        { value: frac(k * T ** 3, 3), why: R`The speed is \(${terms([[k, 't^{2}'], [2 * k * m * m, '']])}\). Integrate both terms.` },
        { value: k * (T * T + 2 * m * m), why: R`That is the speed at \(t = ${T}\). Arc length is the integral of the speed.` },
        L.add(k),
        frac(k * T ** 3, 3).add(k * m * m * T),
      ],
      solution: [
        R`\(\mathbf{r}'(t) = \langle ${terms([[k, 't^{2}']])}, ${terms([[2 * k * m, 't']])}, ${2 * k * m * m} \rangle\).`,
        R`\(|\mathbf{r}'(t)|^{2} = ${terms([[k * k, 't^{4}'], [4 * k * k * m * m, 't^{2}'], [4 * k * k * m ** 4, '']])} = \left(${terms([[k, 't^{2}'], [2 * k * m * m, '']])}\right)^{2}\), a perfect square.`,
        R`\(L = \displaystyle\int_{0}^{${T}} \left(${terms([[k, 't^{2}'], [2 * k * m * m, '']])}\right) dt = ${L.tex()}\).`,
      ],
      rule: 3,
      skill: 'arc length',
      check: () => checkEqual(L.value, integrate((t) => Math.hypot(...r(t).map((_, i) => numDeriv((u) => r(u)[i], t))), 0, T, 400), 1e-6, 'arc length'),
    });
  }
  if (kind === 1) {
    const a = rng.int(2, 6);
    const L = frac(a * a - 1, a);
    const r = (t) => [Math.exp(t), Math.exp(-t), Math.SQRT2 * t];
    return q({
      prompt: R`Find the length of the curve \(\mathbf{r}(t) = \langle e^{t}, e^{-t}, \sqrt{2}\,t \rangle\) for \(0 \le t \le \ln ${a}\).`,
      correct: L,
      wrong: [
        { value: frac(a * a + 1, a), why: R`\(\int e^{-t}\,dt = -e^{-t}\): the second term is subtracted after integrating.` },
        { value: a - 1, why: R`The speed is \(e^{t} + e^{-t}\). Integrate both terms.` },
        frac(a * a - 1, 2 * a),
        frac(a * a + 1, 2 * a),
      ],
      solution: [
        R`\(\mathbf{r}'(t) = \langle e^{t}, -e^{-t}, \sqrt{2} \rangle\), so \(|\mathbf{r}'(t)|^{2} = e^{2t} + e^{-2t} + 2 = \left(e^{t} + e^{-t}\right)^{2}\).`,
        R`\(L = \displaystyle\int_{0}^{\ln ${a}} \left(e^{t} + e^{-t}\right) dt = \Big[e^{t} - e^{-t}\Big]_{0}^{\ln ${a}}\).`,
        R`\(L = ${a} - \frac{1}{${a}} - (1 - 1) = ${L.tex()}\).`,
      ],
      rule: 3,
      skill: 'arc length',
      check: () => checkEqual(L.value, integrate((t) => Math.hypot(...r(t).map((_, i) => numDeriv((u) => r(u)[i], t))), 0, Math.log(a), 400), 1e-6, 'arc length'),
    });
  }
  // r = ⟨cos t + t sin t, sin t − t cos t, c·t²⟩ has speed t·√(1 + 4c²)
  const [ctex, cval, k] = rng.pick([['\\frac{\\sqrt{3}}{2}', Math.sqrt(3) / 2, 2], ['\\sqrt{2}', Math.SQRT2, 3]]);
  const T = rng.int(1, 5);
  const L = frac(k * T * T, 2);
  const r = (t) => [Math.cos(t) + t * Math.sin(t), Math.sin(t) - t * Math.cos(t), cval * t * t];
  return q({
    prompt: R`Find the length of the curve \(\mathbf{r}(t) = \left\langle \cos t + t\sin t,\; \sin t - t\cos t,\; ${ctex}\,t^{2} \right\rangle\) for \(0 \le t \le ${T}\).`,
    correct: L,
    wrong: [
      { value: k * T, why: R`\(${k * T}\) is the speed at \(t = ${T}\). Integrate the speed \(${k}t\) from \(0\) to \(${T}\).` },
      { value: frac(T * T, 2), why: R`Include the third component: \(|\mathbf{r}'(t)| = \sqrt{t^{2} + ${k * k - 1}t^{2}} = ${k}t\).` },
      k * T * T,
      frac(k * T * T, 2).add(1),
    ],
    solution: [
      R`Product rule: \(\mathbf{r}'(t) = \langle t\cos t,\; t\sin t,\; ${k === 2 ? '\\sqrt{3}' : '2\\sqrt{2}'}\,t \rangle\).`,
      R`\(|\mathbf{r}'(t)| = \sqrt{t^{2}\cos^{2}t + t^{2}\sin^{2}t + ${k * k - 1}t^{2}} = \sqrt{${k * k}t^{2}} = ${k}t\) for \(t \ge 0\).`,
      R`\(L = \displaystyle\int_{0}^{${T}} ${k}t\,dt = ${L.tex()}\).`,
    ],
    rule: 3,
    skill: 'arc length',
    check: () => checkEqual(L.value, integrate((t) => Math.hypot(...r(t).map((_, i) => numDeriv((u) => r(u)[i], t))), 0, T, 400), 1e-6, 'arc length'),
  });
}

/** Curvature of r at t, from the definition κ = |dT/dt| / |r′|, by central differences. */
function numCurvature(r, t, h = 1e-4) {
  const vel = (u) => r(u).map((_, i) => numDeriv((w) => r(w)[i], u, 1e-5));
  const unit = (u) => {
    const v = vel(u);
    return vscale(v, 1 / vlen(v));
  };
  const dT = unit(t + h).map((x, i) => (x - unit(t - h)[i]) / (2 * h));
  return vlen(dT) / vlen(vel(t));
}

function hardCurvature(rng) {
  if (rng.bool(0.4)) {
    const [a, b] = rng.pick(TRIPLES);
    const k = frac(a, a * a + b * b);
    const r = (t) => [a * Math.cos(t), a * Math.sin(t), b * t];
    return q({
      prompt: R`Find the curvature of the helix \(\mathbf{r}(t) = \langle ${a}\cos t, ${a}\sin t, ${b}t \rangle\).`,
      correct: k,
      wrong: [
        { value: frac(1, a), why: R`\(\frac{1}{${a}}\) is the curvature of a circle of radius \(${a}\). The climb in \(z\) stretches the curve and lowers its curvature.` },
        { value: frac(a, Math.round(Math.sqrt(a * a + b * b))), why: R`Divide by \(|\mathbf{r}'|^{3}\), not by \(|\mathbf{r}'|\).` },
        frac(b, a * a + b * b),
        frac(a, (a * a + b * b) * Math.round(Math.sqrt(a * a + b * b))),
      ],
      solution: [
        R`\(\mathbf{r}'(t) = \langle -${a}\sin t, ${a}\cos t, ${b} \rangle\), with \(|\mathbf{r}'| = \sqrt{${a * a} + ${b * b}} = ${Math.round(Math.sqrt(a * a + b * b))}\), and \(\mathbf{r}''(t) = \langle -${a}\cos t, -${a}\sin t, 0 \rangle\).`,
        R`\(\mathbf{r}' \times \mathbf{r}'' = \langle ${a * b}\sin t, -${a * b}\cos t, ${a * a} \rangle\), with length \(\sqrt{${a * a * b * b} + ${a ** 4}} = ${a * Math.round(Math.sqrt(a * a + b * b))}\).`,
        R`\(\kappa = \dfrac{|\mathbf{r}' \times \mathbf{r}''|}{|\mathbf{r}'|^{3}} = \dfrac{${a * Math.round(Math.sqrt(a * a + b * b))}}{${Math.round(Math.sqrt(a * a + b * b)) ** 3}} = ${k.tex()}\).`,
      ],
      rule: 4,
      skill: 'curvature',
      check: () => checkEqual(k.value, numCurvature(r, 0.6), 1e-4, 'curvature'),
    });
  }
  const { comps, t0, Q, len, A } = quadMotion(rng);
  const cr = vcross(Q, A);
  const n = vlen2(cr);
  return q({
    prompt: R`Find the curvature of \(\mathbf{r}(t) = ${rT(comps)}\) at \(t = ${t0}\).`,
    correct: M(rootOver(1, n, len ** 3)),
    wrong: [
      { value: M(rootOver(1, n, len * len)), why: R`The denominator is \(|\mathbf{r}'|^{3} = ${len}^{3}\).` },
      { value: M(rootOver(1, n)), why: R`Divide the length of the cross product by \(|\mathbf{r}'|^{3}\).` },
      M(rootOver(1, vlen2(A), len * len)),
      M(rootOver(1, n, len)),
      M(rootOver(2, n, len ** 3)),
    ],
    solution: [
      R`\(\mathbf{r}'(t) = ${rT(d1(comps))}\) and \(\mathbf{r}''(t) = ${V(A)}\). At \(t = ${t0}\): \(\mathbf{r}' = ${V(Q)}\), with length \(${len}\).`,
      R`\(\mathbf{r}' \times \mathbf{r}'' = ${V(cr)}\), with length \(${sqrtTex(n)}\).`,
      R`\(\kappa = \dfrac{|\mathbf{r}' \times \mathbf{r}''|}{|\mathbf{r}'|^{3}} = \dfrac{${sqrtTex(n)}}{${len ** 3}}${rootOver(1, n, len ** 3) === `\\frac{${sqrtTex(n)}}{${len ** 3}}` ? '' : ` = ${rootOver(1, n, len ** 3)}`}\).`,
    ],
    rule: 4,
    skill: 'curvature',
    check: () => checkEqual(Math.sqrt(n) / len ** 3, numCurvature((t) => at(comps, t), t0), 1e-4, 'curvature'),
  });
}

function hardPosition(rng) {
  const c = [2 * rng.nonzero(-3, 3), 6 * rng.nonzero(-2, 2), 2 * rng.int(-3, 3)];
  const v0 = rvec(rng, -4, 4);
  const r0 = rvec(rng, -4, 4);
  const T = rng.int(1, 2);
  const aT = [String(c[0]), terms([[c[1], 't']]), String(c[2])];
  const vel = [[c[0], v0[0]], [c[1] / 2, 0, v0[1]], [c[2], v0[2]]];
  const pos = [[c[0] / 2, v0[0], r0[0]], [c[1] / 6, 0, v0[1], r0[1]], [c[2] / 2, v0[2], r0[2]]];
  const ans = at(pos, T);
  const noV = ans.map((x, i) => x - v0[i] * T);
  return q({
    prompt: R`A particle has acceleration \(\mathbf{a}(t) = \langle ${aT.join(', ')} \rangle\), initial velocity \(\mathbf{v}(0) = ${V(v0)}\) and initial position \(\mathbf{r}(0) = ${V(r0)}\). Find its position at \(t = ${T}\).`,
    correct: M(V(ans)),
    wrong: [
      { value: M(V(noV)), why: R`The first integration needs its constant: \(\mathbf{v}(t) = \int \mathbf{a}\,dt + \mathbf{v}(0)\).` },
      { value: M(V(ans.map((x, i) => x - r0[i]))), why: R`Add the starting position \(\mathbf{r}(0)\) after the second integration.` },
      { value: M(V(at(vel, T))), why: R`That is the velocity at \(t = ${T}\). Integrate once more to get the position.` },
      M(V(noV.map((x, i) => x - r0[i]))),
      M(V(ans.map((x, i) => (i === 1 ? x + c[1] : x)))),
    ],
    solution: [
      R`Integrate the acceleration and use \(\mathbf{v}(0)\): \(\mathbf{v}(t) = ${rT(vel)}\).`,
      R`Integrate the velocity and use \(\mathbf{r}(0)\): \(\mathbf{r}(t) = ${rT(pos)}\).`,
      R`At \(t = ${T}\): \(\mathbf{r}(${T}) = ${V(ans)}\).`,
    ],
    rule: 2,
    skill: 'motion from acceleration',
    check: () => {
      const acc = [() => c[0], (t) => c[1] * t, () => c[2]];
      const got = acc.map((f, i) => r0[i] + integrate((t) => v0[i] + integrate(f, 0, t, 40), 0, T, 200));
      return got.every((x, i) => Math.abs(x - ans[i]) < 1e-6) ? true : `position should be ${got}`;
    },
  });
}

// ───────────── Challenge ─────────────

/** Root of f between lo and hi by bisection (f changes sign there). */
function bisect(f, lo, hi) {
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function challengeProjectile(rng) {
  const g = 32;
  if (rng.bool(0.3)) {
    const v0 = rng.pick([32, 64, 96, 128]);
    const deg = rng.pick([30, 45, 60]);
    const [s2, s2r] = exactSin(2 * deg);
    const sin2 = { 30: 1, 45: 2, 60: 3 }[deg]; // sin²θ in quarters
    const askRange = rng.bool();
    const ans = askRange ? rootOver(v0 * v0 * s2, s2r, 64) : frac(v0 * v0 * sin2, 256).tex();
    const [vx, vy] = [v0 * Math.cos(rad(deg)), v0 * Math.sin(rad(deg))];
    const show = (tex) => R`\(${tex}\) ft`;
    return q({
      prompt: R`A ball is hit from ground level at ${v0} ft/s, at an angle of \(${deg}^\circ\) above the horizontal. Use \(g = 32\) ft/s² and ignore air resistance. ${askRange ? 'How far away does it land?' : 'What is its greatest height?'}`,
      correct: show(ans),
      wrong: askRange
        ? [
          { value: show(rootOver(v0 * v0 * exactSin(deg)[0], exactSin(deg)[1], 64)), why: R`The range is \(\dfrac{v_{0}^{2}\sin 2\theta}{g}\): it uses \(\sin ${2 * deg}^\circ\), not \(\sin ${deg}^\circ\).` },
          { value: show(rootOver(v0 * v0 * s2, s2r, 128)), why: 'That is the horizontal distance to the highest point. The ball is in the air twice as long.' },
          show(frac(v0 * v0, 32).tex()),
          show(frac(v0 * v0, 64).tex()),
          show(rootOver(v0 * v0, 3, 32)),
          show(rootOver(v0 * v0, 2, 32)),
        ]
        : [
          { value: show(frac(v0 * v0 * sin2, 128).tex()), why: R`The greatest height is \(\dfrac{v_{y}^{2}}{2g}\). Do not forget the 2.` },
          { value: show(frac(v0 * v0, 64).tex()), why: R`Only the vertical part of the velocity, \(v_{0}\sin\theta\), lifts the ball.` },
          show(frac(v0 * v0 * sin2, 512).tex()),
          show(rootOver(v0 * v0 * exactSin(deg)[0], exactSin(deg)[1], 128)),
          show(frac(v0 * v0 * (4 - sin2), 256).tex()),
        ],
      solution: askRange
        ? [
          R`Components of the initial velocity: \(v_{x} = ${v0}\cos ${deg}^\circ\) and \(v_{y} = ${v0}\sin ${deg}^\circ\). Height: \(y(t) = v_{y}t - 16t^{2}\).`,
          R`The ball lands when \(y = 0\) again: \(t = \dfrac{v_{y}}{16}\).`,
          R`Range \(= v_{x} \cdot \dfrac{v_{y}}{16} = \dfrac{${v0}^{2}\sin ${deg}^\circ\cos ${deg}^\circ}{16} = \dfrac{${v0 * v0}\sin ${2 * deg}^\circ}{32} = ${ans}\) ft.`,
        ]
        : [
          R`Vertical velocity: \(v_{y} = ${v0}\sin ${deg}^\circ = ${rootOver(v0 * exactSin(deg)[0], exactSin(deg)[1], 2)}\) ft/s. Height: \(y(t) = v_{y}t - 16t^{2}\).`,
          R`The ball is highest when \(y'(t) = v_{y} - 32t = 0\), at \(t = \dfrac{v_{y}}{32}\).`,
          R`Greatest height \(= \dfrac{v_{y}^{2}}{64} = ${ans}\) ft.`,
        ],
      rule: 6,
      skill: 'projectile motion',
      check: () => {
        const y = (t) => vy * t - (g / 2) * t * t;
        const land = bisect(y, vy / g, (4 * vy) / g);
        const top = bisect((t) => numDeriv(y, t), 0, land);
        const want = askRange ? vx * land : y(top);
        const got = askRange ? (v0 * v0 * s2 * Math.sqrt(s2r)) / 64 : (v0 * v0 * sin2) / 256;
        return checkEqual(got, want, 1e-6, askRange ? 'range' : 'height');
      },
    });
  }
  const T = rng.int(2, 6);
  const s = rng.bool(0.5) ? 0 : rng.int(1, T - 1);
  const [vy, h] = [16 * (T - s), 16 * T * s];
  const vx = rng.pick([10, 12, 15, 20, 24, 25, 30, 40]);
  const ask = rng.pick(['range', 'height', 'time']);
  const peak = h + (vy * vy) / 64;
  const from = h === 0 ? 'from ground level' : `from a platform ${h} ft above the ground`;
  const prompt = (question) => R`A ball is thrown ${from} with initial velocity \(\langle ${vx}, ${vy} \rangle\) ft/s (horizontal and vertical components). Use \(g = 32\) ft/s² and ignore air resistance. ${question}`;
  const height = R`Height: \(y(t) = ${terms([[h, ''], [vy, 't'], [-16, 't^{2}']])}\).`;
  const landStep = R`The ball lands when \(y(t) = 0\): \(${s === 0 ? `-16t(t - ${T})` : `-16(t - ${T})(t + ${s})`} = 0\), so \(t = ${T}\) s.`;
  const check = () => {
    const y = (t) => h + vy * t - (g / 2) * t * t;
    const land = bisect(y, vy / g + 1e-9, vy / g + 60);
    const top = bisect((t) => numDeriv(y, t), 0, land);
    const want = { range: vx * land, height: y(top), time: land }[ask];
    return checkEqual({ range: vx * T, height: peak, time: T }[ask], want, 1e-6, ask);
  };
  if (ask === 'range') {
    return q({
      prompt: prompt('How far, horizontally, from the launch point does it land?'),
      correct: vx * T,
      unit: 'ft',
      wrong: [
        { value: frac(vx * vy, 32), why: 'That is the horizontal distance when the ball is at its highest point. It lands later, when its height is 0.' },
        h > 0 ? { value: frac(vx * vy, 16), why: 'That is where the ball comes back to the height of the platform. It still has to fall to the ground.' } : null,
        vy * T,
        vx * (T + 1),
        vx * T + vy,
      ],
      solution: [R`Position: \(x(t) = ${vx}t\) and \(y(t) = ${terms([[h, ''], [vy, 't'], [-16, 't^{2}']])}\).`, landStep, R`Horizontal distance: \(x(${T}) = ${vx} \cdot ${T} = ${vx * T}\) ft.`],
      rule: 6,
      skill: 'projectile motion',
      check,
    });
  }
  if (ask === 'height') {
    return q({
      prompt: prompt('What is the greatest height above the ground that it reaches?'),
      correct: peak,
      unit: 'ft',
      wrong: [
        h > 0 ? { value: (vy * vy) / 64, why: `That is the rise above the platform. Add the starting height of ${h} ft.` } : null,
        { value: h + (vy * vy) / 32, why: R`At the top, \(t = \dfrac{${vy}}{32}\). Substitute it into both the \(t\) term and the \(-16t^{2}\) term.` },
        peak + 16,
        frac(peak, 2),
        peak + vy,
      ],
      solution: [height, R`The ball is highest when the vertical velocity is 0: \(y'(t) = ${terms([[vy, ''], [-32, 't']])} = 0\), so \(t = ${frac(vy, 32).tex()}\) s.`, R`\(y\!\left(${frac(vy, 32).tex()}\right) = ${peak}\) ft.`],
      rule: 6,
      skill: 'projectile motion',
      check,
    });
  }
  return q({
    prompt: prompt('For how long is it in the air?'),
    correct: T,
    unit: 's',
    wrong: [
      { value: frac(vy, 32), why: 'That is the time to reach the highest point. The ball is in the air until its height is 0.' },
      h > 0 ? { value: frac(vy, 16), why: 'That is the time to come back level with the platform. The ball then falls on to the ground.' } : null,
      T + 1,
      frac(T, 2),
      T + 2,
    ],
    solution: [height, landStep.replace(/, so .*$/, '.'), R`The positive solution is \(t = ${T}\) s.`],
    rule: 6,
    skill: 'projectile motion',
    check,
  });
}

function challengeTangentialAccel(rng) {
  const { comps, t0, Q, len, A } = quadMotion(rng);
  const dotQA = vdot(Q, A);
  const n = vlen2(vcross(Q, A));
  const tangential = rng.bool();
  const speedDeriv = () => numDeriv((t) => Math.hypot(...comps.map((c) => numDeriv((x) => polyEval(c, x), t))), t0, 1e-4);
  const head = R`A particle has position \(\mathbf{r}(t) = ${rT(comps)}\).`;
  const setup = R`\(\mathbf{v}(t) = ${rT(d1(comps))}\) and \(\mathbf{a}(t) = ${V(A)}\). At \(t = ${t0}\): \(\mathbf{v} = ${V(Q)}\), with speed \(${len}\).`;
  if (tangential) {
    return q({
      prompt: R`${head} Find the tangential component of its acceleration, \(a_{T}\), at \(t = ${t0}\).`,
      correct: frac(dotQA, len),
      wrong: [
        { value: dotQA, why: R`Divide \(\mathbf{v} \cdot \mathbf{a}\) by the speed, \(${len}\).` },
        { value: M(rootOver(1, n, len)), why: R`That is the normal component \(a_{N} = \dfrac{|\mathbf{v} \times \mathbf{a}|}{|\mathbf{v}|}\).` },
        { value: M(sqrtTex(vlen2(A))), why: R`That is \(|\mathbf{a}|\), the whole acceleration. \(a_{T}\) is only the part along the direction of motion.` },
        frac(-dotQA, len),
        frac(dotQA, len * len),
        frac(dotQA + len, len),
      ],
      solution: [setup, R`\(\mathbf{v} \cdot \mathbf{a} = ${dotQA}\).`, R`\(a_{T} = \dfrac{\mathbf{v} \cdot \mathbf{a}}{|\mathbf{v}|} = ${frac(dotQA, len).tex()}\). This is the rate at which the speed is changing.`],
      rule: 5,
      skill: 'components of acceleration',
      check: () => checkEqual(dotQA / len, speedDeriv(), 1e-4, 'd(speed)/dt'),
    });
  }
  return q({
    prompt: R`${head} Find the normal component of its acceleration, \(a_{N}\), at \(t = ${t0}\).`,
    correct: M(rootOver(1, n, len)),
    wrong: [
      { value: M(sqrtTex(n)), why: R`Divide \(|\mathbf{v} \times \mathbf{a}|\) by the speed, \(${len}\).` },
      { value: M(frac(Math.abs(dotQA), len).tex()), why: R`That is \(|a_{T}|\), the size of the component along the direction of motion.` },
      M(sqrtTex(vlen2(A))),
      M(rootOver(1, n, len * len)),
      M(rootOver(1, n + len * len, len)),
    ],
    solution: [setup, R`\(\mathbf{v} \times \mathbf{a} = ${V(vcross(Q, A))}\), with length \(${sqrtTex(n)}\).`, R`\(a_{N} = \dfrac{|\mathbf{v} \times \mathbf{a}|}{|\mathbf{v}|} = ${rootOver(1, n, len)}\).`],
    rule: 5,
    skill: 'components of acceleration',
    check: () => checkEqual(Math.sqrt(n) / len, Math.sqrt(Math.max(0, vlen2(A) - speedDeriv() ** 2)), 1e-4, 'normal component'),
  });
}

function challengeArcParam(rng) {
  const [a, b, c] = rng.pick(TRIPLES);
  const helix = (inner, zc) => M(R`\left\langle ${a}\cos ${inner},\; ${a}\sin ${inner},\; ${zc} \right\rangle`);
  const r = (s) => [a * Math.cos(s / c), a * Math.sin(s / c), (b * s) / c];
  const zs = (den) => terms([[frac(b, den), 's']]);
  return q({
    prompt: R`The helix \(\mathbf{r}(t) = \langle ${a}\cos t, ${a}\sin t, ${b}t \rangle\) starts at \(t = 0\). Which formula describes the same curve in terms of the arc length \(s\) traveled from the start?`,
    correct: helix(`\\frac{s}{${c}}`, zs(c)),
    wrong: [
      { value: helix(`${c}s`, `${b * c}s`), why: R`\(s = ${c}t\), so \(t = \dfrac{s}{${c}}\). Divide by the speed.` },
      { value: helix('s', zs(c)), why: R`Replace every \(t\) by \(\dfrac{s}{${c}}\), inside the cosine and sine as well.` },
      { value: helix(`\\frac{s}{${a}}`, zs(a)), why: R`The speed is \(\sqrt{${a}^{2} + ${b}^{2}} = ${c}\), not \(${a}\).` },
      helix(`\\frac{s}{${c}}`, `${b}s`),
      helix('s', `${b}s`),
    ],
    solution: [
      R`Speed: \(|\mathbf{r}'(t)| = \sqrt{${a * a} + ${b * b}} = ${c}\), a constant.`,
      R`Arc length from the start: \(s = \displaystyle\int_{0}^{t} ${c}\,du = ${c}t\), so \(t = \dfrac{s}{${c}}\).`,
      R`Substitute: \(\mathbf{r}(s) = \left\langle ${a}\cos\frac{s}{${c}},\; ${a}\sin\frac{s}{${c}},\; ${zs(c)} \right\rangle\). Now one unit of \(s\) is one unit of distance.`,
    ],
    rule: 3,
    skill: 'arc length parameter',
    check: () => ([0.3, 2.2, 7.5].every((s) => Math.abs(Math.hypot(...r(s).map((_, i) => numDeriv((u) => r(u)[i], s))) - 1) < 1e-6) ? true : 'not unit speed'),
  });
}

function challengeTangentMeetsPlane(rng) {
  const t0 = rng.pick([1, -1, 2]);
  const s0 = rng.pick([-3, -2, -1, 1, 2, 3]);
  const dz = rng.nonzero(-3, 3);
  const al = rng.int(-2, 2);
  const zc = [al, dz - 2 * al * t0, 0];
  zc[2] = -s0 * dz - polyEval(zc, t0);
  let comps;
  let P;
  let D;
  do {
    comps = [randPoly(rng, 2), randPoly(rng, 2), zc];
    P = at(comps, t0);
    D = at(d1(comps), t0);
  } while (D[0] === 0 && D[1] === 0);
  const hit = vadd(P, vscale(D, s0));
  return q({
    prompt: R`The tangent line to \(\mathbf{r}(t) = ${rT(comps)}\) at \(t = ${t0}\) is extended until it meets the \(xy\)-plane. At which point does it meet the plane?`,
    correct: M(Pt(hit)),
    wrong: [
      { value: M(Pt(vadd(P, vscale(D, -s0)))), why: R`Solve \(${terms([[P[2], ''], [D[2], 's']])} = 0\) carefully: check the sign of \(s\).` },
      { value: M(Pt(P)), why: R`That is the point of tangency. Follow the tangent line from there until \(z = 0\).` },
      M(Pt([P[0], P[1], 0])),
      M(Pt(vadd(P, D).map((x, i) => (i === 2 ? 0 : x)))),
      M(Pt([hit[0] + D[0], hit[1] + D[1], 0])),
    ],
    solution: [
      R`Point: \(\mathbf{r}(${t0}) = ${V(P)}\). Direction: \(\mathbf{r}'(t) = ${rT(d1(comps))}\), so \(\mathbf{r}'(${t0}) = ${V(D)}\).`,
      R`Tangent line: \(${lineTex(P, D, 's')}\).`,
      R`It meets the \(xy\)-plane where \(z = 0\): \(${terms([[P[2], ''], [D[2], 's']])} = 0\), so \(s = ${s0}\).`,
      R`The point is \(${Pt(hit)}\).`,
    ],
    rule: 1,
    skill: 'tangent line',
    check: () => {
      const p = at(comps, t0);
      const d = comps.map((c) => numDeriv((x) => polyEval(c, x), t0));
      const s = -p[2] / d[2];
      return [p[0] + s * d[0], p[1] + s * d[1], 0].every((x, i) => Math.abs(x - hit[i]) < 1e-5) ? true : 'tangent line does not meet the plane there';
    },
  });
}

export default {
  id: 'vector-functions',
  title: 'Vector-Valued Functions & Motion',
  summary: 'Differentiate and integrate vector functions, and use them for tangent lines, arc length, curvature and motion in space.',
  standards: ['OpenStax Calculus Vol. 3 §3.1', 'OpenStax Calculus Vol. 3 §3.2', 'OpenStax Calculus Vol. 3 §3.3', 'OpenStax Calculus Vol. 3 §3.4'],

  explain: {
    intro: R`A vector-valued function \(\mathbf{r}(t) = \langle f(t), g(t), h(t) \rangle\) gives a position for each value of \(t\), so it traces out a curve in space. Limits, derivatives and integrals are all taken one component at a time. The derivative \(\mathbf{r}'(t)\) points along the curve, and when \(t\) is time it is the velocity.`,
    rules: [
      {
        title: 'Domain and limits',
        text: R`The domain of \(\mathbf{r}(t)\) is the set of \(t\) for which every component is defined. The limit is taken component by component: \(\lim\limits_{t \to a}\mathbf{r}(t) = \left\langle \lim f(t), \lim g(t), \lim h(t) \right\rangle\), provided all three exist.`,
        example: R`\(\lim\limits_{t \to 0}\left\langle \dfrac{\sin 3t}{t},\; e^{t},\; t^{2} - 4 \right\rangle = \langle 3, 1, -4 \rangle\).`,
      },
      {
        title: 'Derivative and tangent line',
        text: R`\(\mathbf{r}'(t) = \langle f'(t), g'(t), h'(t) \rangle\). If it is not the zero vector, \(\mathbf{r}'(t_{0})\) is tangent to the curve at \(\mathbf{r}(t_{0})\), and the tangent line is \(\mathbf{r}(t_{0}) + s\,\mathbf{r}'(t_{0})\).`,
        example: R`For \(\mathbf{r}(t) = \langle t^{2}, 3t, t^{3} \rangle\): \(\mathbf{r}'(t) = \langle 2t, 3, 3t^{2} \rangle\), so \(\mathbf{r}'(1) = \langle 2, 3, 3 \rangle\).`,
      },
      {
        title: 'Integrals and initial conditions',
        text: R`Integrate each component. An indefinite integral carries a constant **vector** \(\mathbf{C}\), which an initial condition such as \(\mathbf{r}(0)\) determines.`,
        example: R`If \(\mathbf{r}'(t) = \langle 2t, \cos t \rangle\) and \(\mathbf{r}(0) = \langle 1, 2 \rangle\), then \(\mathbf{r}(t) = \langle t^{2} + 1, \sin t + 2 \rangle\).`,
      },
      {
        title: 'Unit tangent vector and arc length',
        text: R`The unit tangent vector is \(\mathbf{T}(t) = \dfrac{\mathbf{r}'(t)}{|\mathbf{r}'(t)|}\). The length of the curve for \(a \le t \le b\) is \(L = \displaystyle\int_{a}^{b} |\mathbf{r}'(t)|\,dt\): the integral of the speed.`,
        example: R`For \(\mathbf{r}(t) = \langle 3\cos t, 3\sin t, 4t \rangle\): \(|\mathbf{r}'(t)| = \sqrt{9 + 16} = 5\), so one turn \((0 \le t \le 2\pi)\) has length \(10\pi\).`,
      },
      {
        title: 'Curvature',
        text: R`Curvature measures how fast the direction of the curve turns per unit of distance: \(\kappa = \dfrac{|\mathbf{T}'(t)|}{|\mathbf{r}'(t)|} = \dfrac{|\mathbf{r}'(t) \times \mathbf{r}''(t)|}{|\mathbf{r}'(t)|^{3}}\). A circle of radius \(a\) has \(\kappa = \dfrac{1}{a}\); a straight line has \(\kappa = 0\).`,
        example: R`The helix \(\langle 3\cos t, 3\sin t, 4t \rangle\) has \(|\mathbf{r}' \times \mathbf{r}''| = 15\) and \(|\mathbf{r}'| = 5\), so \(\kappa = \dfrac{15}{125} = \dfrac{3}{25}\).`,
      },
      {
        title: 'Velocity, speed and acceleration',
        text: R`For a moving object, \(\mathbf{v}(t) = \mathbf{r}'(t)\), speed \(= |\mathbf{v}(t)|\) and \(\mathbf{a}(t) = \mathbf{v}'(t) = \mathbf{r}''(t)\). The acceleration splits into a part along the motion, \(a_{T} = \dfrac{\mathbf{v} \cdot \mathbf{a}}{|\mathbf{v}|}\) (the rate of change of speed), and a part perpendicular to it, \(a_{N} = \dfrac{|\mathbf{v} \times \mathbf{a}|}{|\mathbf{v}|}\) (which turns the path).`,
        example: R`For \(\mathbf{r}(t) = \langle t^{2}, 2t, t \rangle\): \(\mathbf{v}(1) = \langle 2, 2, 1 \rangle\), speed \(3\), \(\mathbf{a} = \langle 2, 0, 0 \rangle\), so \(a_{T} = \dfrac{4}{3}\).`,
      },
      {
        title: 'Projectile motion',
        text: R`With only gravity acting, \(\mathbf{a} = \langle 0, -g \rangle\). Integrating twice from launch speed \(v_{0}\), launch angle \(\theta\) and starting height \(h\): \(\mathbf{r}(t) = \left\langle (v_{0}\cos\theta)\,t,\; h + (v_{0}\sin\theta)\,t - \tfrac{1}{2}gt^{2} \right\rangle\). The projectile is highest when its vertical velocity is 0 and lands when its height is 0.`,
        example: R`Launched from the ground with velocity \(\langle 48, 64 \rangle\) ft/s and \(g = 32\): \(y = 64t - 16t^{2} = 0\) at \(t = 4\), so it lands \(48 \cdot 4 = 192\) ft away.`,
      },
    ],
    vocab: [
      { term: 'vector-valued function', def: R`A function whose output is a vector, such as \(\mathbf{r}(t) = \langle f(t), g(t), h(t) \rangle\).` },
      { term: 'tangent vector', def: R`\(\mathbf{r}'(t)\): it points along the curve in the direction of increasing \(t\).` },
      { term: 'speed', def: R`The length of the velocity vector, \(|\mathbf{v}(t)|\). It is a number, not a vector.` },
      { term: 'arc length', def: 'Distance measured along a curve.' },
      { term: 'curvature', def: 'How sharply a curve bends: the rate at which the unit tangent turns per unit of arc length.' },
    ],
    mistakes: [
      R`Substituting before differentiating. \(\mathbf{r}'(t_{0})\) means: differentiate, then put in \(t_{0}\).`,
      R`Forgetting the constant vector after integrating. Use \(\mathbf{v}(0)\) after the first integration and \(\mathbf{r}(0)\) after the second.`,
      R`Giving a vector for the speed. Speed is the length \(|\mathbf{v}|\).`,
      R`Integrating \(\mathbf{r}'(t)\) instead of \(|\mathbf{r}'(t)|\) to find arc length.`,
      'Taking the time to the highest point as the time of flight. The projectile lands when its height returns to 0.',
    ],
    visual: {
      type: 'plot',
      x: [-4.5, 4.5],
      y: [-4.5, 4.5],
      square: true,
      param: [{ x: (t) => 3 * Math.cos(t), y: (t) => 2 * Math.sin(t), t: [0, 2 * Math.PI] }],
      segments: [
        { from: [0, 0], to: [1.5, Math.sqrt(3)], arrow: true, label: 'r(t)', color: 'c' },
        { from: [1.5, Math.sqrt(3)], to: [1.5 - 1.5 * Math.sqrt(3), Math.sqrt(3) + 1], arrow: true, label: "r′(t)", color: 'b' },
      ],
      points: [{ x: 1.5, y: Math.sqrt(3) }],
      alt: 'The ellipse traced by r(t) = ⟨3 cos t, 2 sin t⟩. An arrow from the origin to a point on the ellipse shows the position vector r(t); a second arrow starting at that point and touching the ellipse shows the tangent vector r′(t).',
    },
  },

  examples: [
    {
      title: 'Tangent line to a space curve',
      problem: R`Find the tangent line to \(\mathbf{r}(t) = \langle t^{2}, 3t, t^{3} \rangle\) at \(t = 1\).`,
      steps: [
        R`Point: \(\mathbf{r}(1) = \langle 1, 3, 1 \rangle\).`,
        R`Derivative: \(\mathbf{r}'(t) = \langle 2t, 3, 3t^{2} \rangle\), so the direction is \(\mathbf{r}'(1) = \langle 2, 3, 3 \rangle\).`,
        R`Line through the point with that direction, using a new parameter \(s\).`,
      ],
      answer: R`\(x = 1 + 2s,\; y = 3 + 3s,\; z = 1 + 3s\)`,
    },
    {
      title: 'Integrating with an initial condition',
      problem: R`Find \(\mathbf{r}(t)\) if \(\mathbf{r}'(t) = \langle 2t, e^{t}, \cos t \rangle\) and \(\mathbf{r}(0) = \langle 1, 0, 2 \rangle\).`,
      steps: [
        R`Integrate each component: \(\mathbf{r}(t) = \langle t^{2}, e^{t}, \sin t \rangle + \mathbf{C}\).`,
        R`At \(t = 0\): \(\langle 0, 1, 0 \rangle + \mathbf{C} = \langle 1, 0, 2 \rangle\), so \(\mathbf{C} = \langle 1, -1, 2 \rangle\).`,
      ],
      answer: R`\(\mathbf{r}(t) = \langle t^{2} + 1,\; e^{t} - 1,\; \sin t + 2 \rangle\)`,
    },
    {
      title: 'Arc length when the speed is a perfect square',
      problem: R`Find the length of \(\mathbf{r}(t) = \left\langle 2t, t^{2}, \frac{1}{3}t^{3} \right\rangle\) for \(0 \le t \le 3\).`,
      steps: [
        R`\(\mathbf{r}'(t) = \langle 2, 2t, t^{2} \rangle\).`,
        R`\(|\mathbf{r}'(t)|^{2} = 4 + 4t^{2} + t^{4} = (t^{2} + 2)^{2}\), so the speed is \(t^{2} + 2\).`,
        R`\(L = \displaystyle\int_{0}^{3} (t^{2} + 2)\,dt = \left[\tfrac{1}{3}t^{3} + 2t\right]_{0}^{3} = 9 + 6\).`,
      ],
      answer: R`\(L = 15\)`,
    },
    {
      title: 'Curvature of a helix',
      problem: R`Find the curvature of \(\mathbf{r}(t) = \langle 3\cos t, 3\sin t, 4t \rangle\).`,
      steps: [
        R`\(\mathbf{r}'(t) = \langle -3\sin t, 3\cos t, 4 \rangle\), with \(|\mathbf{r}'(t)| = \sqrt{9 + 16} = 5\).`,
        R`\(\mathbf{r}''(t) = \langle -3\cos t, -3\sin t, 0 \rangle\).`,
        R`\(\mathbf{r}' \times \mathbf{r}'' = \langle 12\sin t, -12\cos t, 9 \rangle\), with length \(\sqrt{144 + 81} = 15\).`,
        R`\(\kappa = \dfrac{|\mathbf{r}' \times \mathbf{r}''|}{|\mathbf{r}'|^{3}} = \dfrac{15}{125}\).`,
      ],
      answer: R`\(\kappa = \dfrac{3}{25}\), the same at every point of the helix`,
    },
    {
      title: 'Word problem: a ball in flight',
      word: true,
      problem: R`A ball is thrown from ground level with initial velocity \(\langle 48, 64 \rangle\) ft/s. Using \(g = 32\) ft/s², how far away does it land, and how high does it go?`,
      steps: [
        R`Only gravity acts: \(\mathbf{a}(t) = \langle 0, -32 \rangle\). Integrate with \(\mathbf{v}(0) = \langle 48, 64 \rangle\): \(\mathbf{v}(t) = \langle 48, 64 - 32t \rangle\).`,
        R`Integrate again with \(\mathbf{r}(0) = \langle 0, 0 \rangle\): \(\mathbf{r}(t) = \langle 48t, 64t - 16t^{2} \rangle\).`,
        R`It lands when the height is 0: \(64t - 16t^{2} = 16t(4 - t) = 0\), so \(t = 4\) s and \(x = 48 \cdot 4 = 192\) ft.`,
        R`It is highest when the vertical velocity is 0: \(64 - 32t = 0\) at \(t = 2\) s, where \(y = 128 - 64 = 64\) ft.`,
      ],
      answer: 'It lands 192 ft away and rises to 64 ft.',
      visual: {
        type: 'plot',
        x: [0, 240],
        y: [0, 80],
        param: [{ x: (t) => 48 * t, y: (t) => 64 * t - 16 * t * t, t: [0, 4] }],
        points: [{ x: 96, y: 64, label: 'highest: (96, 64)' }, { x: 192, y: 0, label: 'lands', color: 'b' }],
        axisLabels: ['x (ft)', 'y (ft)'],
        alt: 'The path of the ball: a parabola starting at the origin, rising to its highest point (96, 64) after 2 seconds and landing at x = 192 feet after 4 seconds.',
      },
    },
  ],

  models: [
    {
      id: 'ellipse-motion',
      title: 'Position, velocity and curvature on an ellipse',
      intro: 'Choose the ellipse r(t) = ⟨a cos t, b sin t⟩ and a value of t (in degrees).',
      inputs: [
        { name: 'a', label: 'a (half-width)', type: 'int', min: 1, max: 6, value: 3 },
        { name: 'b', label: 'b (half-height)', type: 'int', min: 1, max: 6, value: 2 },
        { name: 'deg', label: 't in degrees', type: 'int', min: 0, max: 360, value: 60 },
      ],
      compute({ a, b, deg }) {
        const t = rad(deg);
        const f = (x) => num(x, { places: 3 });
        const P = [a * Math.cos(t), b * Math.sin(t)];
        const v = [-a * Math.sin(t), b * Math.cos(t)];
        const tm = (c, sym) => terms([[c, sym]]); // hides a coefficient of 1
        const acc = [-P[0], -P[1]];
        const speed = Math.hypot(...v);
        const kappa = (a * b) / speed ** 3;
        const m = Math.max(a, b) + 1.5;
        return {
          problem: R`For \(\mathbf{r}(t) = \langle ${tm(a, '\\cos t')}, ${tm(b, '\\sin t')} \rangle\) at \(t = ${deg}^\circ\), find the position, velocity, speed and curvature.`,
          steps: [
            R`Position: \(\mathbf{r} = \langle ${tm(a, `\\cos ${deg}^\\circ`)}, ${tm(b, `\\sin ${deg}^\\circ`)} \rangle \approx \langle ${f(P[0])}, ${f(P[1])} \rangle\).`,
            R`Velocity: \(\mathbf{r}'(t) = \langle ${tm(-a, '\\sin t')}, ${tm(b, '\\cos t')} \rangle \approx \langle ${f(v[0])}, ${f(v[1])} \rangle\). It is tangent to the ellipse.`,
            R`Speed: \(|\mathbf{r}'| = \sqrt{${f(v[0] * v[0])} + ${f(v[1] * v[1])}} \approx ${f(speed)}\). Unit tangent: \(\mathbf{T} \approx \langle ${f(v[0] / speed)}, ${f(v[1] / speed)} \rangle\).`,
            R`Acceleration: \(\mathbf{r}''(t) = \langle ${tm(-a, '\\cos t')}, ${tm(-b, '\\sin t')} \rangle \approx \langle ${f(acc[0])}, ${f(acc[1])} \rangle\), pointing back toward the center.`,
            R`Curvature: for a plane curve \(|\mathbf{r}' \times \mathbf{r}''| = |x'y'' - y'x''| = ${a * b}\), so \(\kappa = \dfrac{${a * b}}{${f(speed)}^{3}} \approx ${f(kappa)}\). The best-fitting circle there has radius \(\dfrac{1}{\kappa} \approx ${f(1 / kappa)}\).`,
          ],
          answer: R`\(\mathbf{r} \approx \langle ${f(P[0])}, ${f(P[1])} \rangle\), \(\;\mathbf{r}' \approx \langle ${f(v[0])}, ${f(v[1])} \rangle\), speed \(\approx ${f(speed)}\), \(\kappa \approx ${f(kappa)}\)`,
          visual: {
            type: 'plot',
            x: [-m, m],
            y: [-m, m],
            square: true,
            param: [{ x: (u) => a * Math.cos(u), y: (u) => b * Math.sin(u), t: [0, 2 * Math.PI] }],
            segments: [
              { from: [0, 0], to: P, arrow: true, label: 'r', color: 'c' },
              { from: P, to: [P[0] + v[0] / 2, P[1] + v[1] / 2], arrow: true, label: 'r′', color: 'b' },
            ],
            points: [{ x: P[0], y: P[1] }],
            alt: `The ellipse with half-width ${a} and half-height ${b}. The position vector points from the origin to the point at t = ${deg} degrees, and the velocity vector (drawn at half length) is tangent to the ellipse there.`,
          },
        };
      },
    },
    {
      id: 'projectile',
      title: 'Word problem: launching a projectile',
      word: true,
      intro: 'Set the launch speed, launch angle and starting height. Gravity is 9.8 m/s² and air resistance is ignored.',
      inputs: [
        { name: 'v0', label: 'Launch speed (m/s)', type: 'int', min: 1, max: 60, value: 20 },
        { name: 'deg', label: 'Launch angle (degrees)', type: 'int', min: 5, max: 85, value: 40 },
        { name: 'h', label: 'Starting height (m)', type: 'int', min: 0, max: 50, value: 0 },
      ],
      compute({ v0, deg, h }) {
        const g = 9.8;
        const f = (x) => num(x, { places: 2 });
        const [vx, vy] = [v0 * Math.cos(rad(deg)), v0 * Math.sin(rad(deg))];
        const T = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
        const top = h + (vy * vy) / (2 * g);
        const range = vx * T;
        const impact = Math.hypot(vx, vy - g * T);
        const yTex = terms([[h, ''], [round(vy, 2), 't'], [-4.9, 't^{2}']]);
        return {
          problem: R`A ball is launched at ${v0} m/s, \(${deg}^\circ\) above the horizontal, from a height of ${h} m. How long is it in the air, how far does it travel and how high does it go?`,
          steps: [
            R`Initial velocity: \(\mathbf{v}(0) = \langle ${v0}\cos ${deg}^\circ, ${v0}\sin ${deg}^\circ \rangle \approx \langle ${f(vx)}, ${f(vy)} \rangle\) m/s.`,
            R`Integrate \(\mathbf{a} = \langle 0, -9.8 \rangle\) twice: \(\mathbf{r}(t) = \langle ${terms([[round(vx, 2), 't']])},\; ${yTex} \rangle\).`,
            R`Highest point: the vertical velocity \(${f(vy)} - 9.8t\) is 0 at \(t \approx ${f(vy / g)}\) s, where the height is about \(${f(top)}\) m.`,
            R`Landing: solve \(${yTex} = 0\) for the positive root: \(t \approx ${f(T)}\) s.`,
            R`Horizontal distance: \(${f(vx)} \cdot ${f(T)} \approx ${f(range)}\) m. Speed on landing: \(|\mathbf{v}(${f(T)})| \approx ${f(impact)}\) m/s.`,
          ],
          answer: R`In the air for about \(${f(T)}\) s; lands about \(${f(range)}\) m away; greatest height about \(${f(top)}\) m`,
          visual: {
            type: 'plot',
            x: [0, Math.max(1, range * 1.25)],
            y: [0, Math.max(1, top * 1.25)],
            param: [{ x: (t) => vx * t, y: (t) => h + vy * t - (g / 2) * t * t, t: [0, T] }],
            points: [{ x: (vx * vy) / g, y: top, label: `top ≈ ${Math.round(top * 10) / 10} m` }, { x: range, y: 0, label: `${Math.round(range * 10) / 10} m`, color: 'b' }],
            axisLabels: ['x (m)', 'y (m)'],
            alt: `The path of the ball: a parabola from height ${h} meters, rising to about ${Math.round(top * 10) / 10} meters and landing about ${Math.round(range * 10) / 10} meters away.`,
          },
        };
      },
    },
    {
      id: 'helix',
      title: 'Length and curvature of a helix',
      intro: 'Choose the radius a, the climb rate b and the number of turns of r(t) = ⟨a cos t, a sin t, b t⟩.',
      inputs: [
        { name: 'a', label: 'Radius a', type: 'int', min: 1, max: 12, value: 3 },
        { name: 'b', label: 'Climb rate b', type: 'int', min: 0, max: 12, value: 4 },
        { name: 'turns', label: 'Number of turns', type: 'int', min: 1, max: 10, value: 2 },
      ],
      compute({ a, b, turns }) {
        const n = a * a + b * b;
        const tm = (c, sym) => terms([[c, sym]]); // hides a coefficient of 1
        const exact = rootOver(2 * turns, n).replace(/(\\sqrt|$)/, '\\pi$1');
        return {
          problem: R`For the helix \(\mathbf{r}(t) = \langle ${tm(a, '\\cos t')}, ${tm(a, '\\sin t')}, ${terms([[b, 't']])} \rangle\), \(0 \le t \le ${piTex(2 * turns)}\), find the length and the curvature.`,
          steps: [
            R`\(\mathbf{r}'(t) = \langle ${tm(-a, '\\sin t')}, ${tm(a, '\\cos t')}, ${b} \rangle\).`,
            R`Speed: \(|\mathbf{r}'(t)| = \sqrt{${tm(a * a, '\\sin^{2}t')} + ${tm(a * a, '\\cos^{2}t')} + ${b * b}} = \sqrt{${n}}${sqrtTex(n) === `\\sqrt{${n}}` ? '' : ` = ${sqrtTex(n)}`}\), a constant.`,
            R`Length: \(L = \displaystyle\int_{0}^{${piTex(2 * turns)}} ${sqrtTex(n)}\,dt = ${exact} \approx ${num(2 * Math.PI * turns * Math.sqrt(n), { places: 2 })}\).`,
            R`\(\mathbf{r}''(t) = \langle ${tm(-a, '\\cos t')}, ${tm(-a, '\\sin t')}, 0 \rangle\) has length \(${a}\) and is perpendicular to \(\mathbf{r}'\), so \(|\mathbf{r}' \times \mathbf{r}''| = ${tm(a, "|\\mathbf{r}'|")}\). Then \(\kappa = \dfrac{${tm(a, "|\\mathbf{r}'|")}}{|\mathbf{r}'|^{3}} = \dfrac{${a}}{|\mathbf{r}'|^{2}} = \dfrac{${a}}{${n}}${frac(a, n).tex() === `\\frac{${a}}{${n}}` ? '' : ` = ${frac(a, n).tex()}`}\).`,
            b === 0 ? R`With \(b = 0\) the curve is a circle of radius \(${a}\), and \(\kappa = \dfrac{1}{${a}}\) as expected.` : R`A larger climb rate stretches the helix out and makes it bend less.`,
          ],
          answer: R`\(L = ${exact}\), \(\;\kappa = ${frac(a, n).tex()}\)`,
        };
      },
    },
  ],

  quiz: {
    easy: [easyDerivative, easyLimit, easyDomain, easySpeedLine],
    medium: [mediumTangentVector, mediumIntegral, mediumTangentLine, mediumHelixArc, mediumAcceleration],
    hard: [hardUnitTangent, hardArcLength, hardCurvature, hardPosition],
    challenge: [challengeProjectile, challengeTangentialAccel, challengeArcParam, challengeTangentMeetsPlane],
  },
};
