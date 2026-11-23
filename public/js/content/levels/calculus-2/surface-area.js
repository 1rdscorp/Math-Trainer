import { R, q, frac, Frac, num, close, numDeriv, sqrtTex } from '../../lib/index.js';
import { M, K, N, exactChoices, fterms } from './_shared.js';

const PI = Math.PI;
const piK = (c) => K([[c, '\\pi']]);
const cm2 = (tex) => R`\(${tex}\) cm²`;

// ───────────── independent numeric checks ─────────────

/** 2π∫ r·√(x′² + y′²) dt by the midpoint rule, with numeric derivatives (radius = y, or x when axis is 'y'). */
function surfNum(xf, yf, t0, t1, axis = 'x', n = 20000) {
  const h = (t1 - t0) / n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + (i + 0.5) * h;
    const r = axis === 'x' ? yf(t) : xf(t);
    s += 2 * PI * Math.abs(r) * Math.hypot(numDeriv(xf, t, 1e-6), numDeriv(yf, t, 1e-6));
  }
  return s * h;
}

/** The same surface as a stack of thin cone frustums, π(r₁ + r₂)·(slant), summed. */
function frustumSum(xf, yf, t0, t1, axis = 'x', n = 20000) {
  let s = 0;
  let px = xf(t0);
  let py = yf(t0);
  for (let i = 1; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    const x = xf(t);
    const y = yf(t);
    const [r1, r2] = axis === 'x' ? [py, y] : [px, x];
    s += PI * (Math.abs(r1) + Math.abs(r2)) * Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return s;
}

/** Passes when both numeric routes agree with the answer. Curves y = f(x) use t = x. */
function checkSurface(value, { xf = (t) => t, yf, t0, t1, axis = 'x', tol = 1e-5 }) {
  const a = surfNum(xf, yf, t0, t1, axis);
  const b = frustumSum(xf, yf, t0, t1, axis);
  if (!close(a, value, tol)) return `integral of 2πr ds = ${a}, answer ${value}`;
  if (!close(b, value, tol)) return `frustum sum = ${b}, answer ${value}`;
  return true;
}

/** The curve and its mirror image across the axis of rotation, a side view of the surface. */
function surfacePlot(f, a, b, axis, alt) {
  let lo = 0;
  let hi = 0;
  for (let i = 0; i <= 60; i++) {
    const y = f(a + ((b - a) * i) / 60);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  if (axis === 'x') {
    const m = Math.max(Math.abs(lo), Math.abs(hi)) * 1.15 || 1;
    const pad = 0.12 * (b - a);
    return { type: 'plot', x: [Math.min(0, a) - pad, b + pad], y: [-m, m], fns: [{ f, domain: [a, b] }, { f: (x) => -f(x), domain: [a, b], dashed: true }], alt };
  }
  const m = 1.15 * Math.max(Math.abs(a), Math.abs(b));
  const span = hi - lo || 1;
  return { type: 'plot', x: [-m, m], y: [lo - 0.1 * span, hi + 0.12 * span], fns: [{ f, domain: [a, b] }, { f: (x) => f(-x), domain: [-b, -a], dashed: true }], alt };
}

// ───────────── Easy ─────────────

const SETUP_CURVES = [
  { tex: 'x^{3}', d2: '9x^{4}', f: (x) => x ** 3, a: 0, b: 1, name: 'y = x³' },
  { tex: '\\sqrt{x}', d2: '\\frac{1}{4x}', f: Math.sqrt, a: 1, b: 4, name: 'y = √x' },
  { tex: 'e^{x}', d2: 'e^{2x}', f: Math.exp, a: 0, b: 1, name: 'y = eˣ' },
  { tex: 'x^{2}', d2: '4x^{2}', f: (x) => x * x, a: 0, b: 2, name: 'y = x²' },
  { tex: '\\ln x', d2: '\\frac{1}{x^{2}}', f: Math.log, a: 1, b: 3, name: 'y = ln x' },
  { tex: '\\sin x', d2: '\\cos^{2}x', f: Math.sin, a: 0, b: 3, name: 'y = sin x' },
  { tex: '\\frac{1}{x}', d2: '\\frac{1}{x^{4}}', f: (x) => 1 / x, a: 1, b: 2, name: 'y = 1/x' },
];

function easySetup(rng) {
  const c = rng.pick(SETUP_CURVES);
  const axis = rng.pick(['x', 'y']);
  const I = (pre, body) => M(R`\displaystyle ${pre}\int_{${c.a}}^{${c.b}} ${body}\,dx`);
  const root = R`\sqrt{1 + ${c.d2}}`;
  const fr = c.tex.startsWith('\\frac') ? `\\left(${c.tex}\\right)` : c.tex;
  const [rad, other] = axis === 'x' ? [fr, 'x'] : ['x', fr];
  return q({
    prompt: R`The curve \(y = ${c.tex}\), \(${c.a} \le x \le ${c.b}\), is revolved about the \(${axis}\)-axis. Which integral gives the area of the surface?`,
    visual: surfacePlot(c.f, c.a, c.b, axis, `The curve ${c.name} from x = ${c.a} to x = ${c.b}, and its mirror image across the ${axis}-axis drawn dashed: a side view of the surface formed by revolving it about the ${axis}-axis.`),
    correct: I('2\\pi', `${rad}\\,${root}`),
    wrong: [
      { value: I('2\\pi', `${other}\\,${root}`), why: R`The radius is the distance from a point of the curve to the axis of rotation. About the \(${axis}\)-axis that distance is \(${axis === 'x' ? 'y' : 'x'}\).` },
      { value: I('2\\pi', rad), why: R`Each band is slanted, so its width is \(ds = \sqrt{1 + (y')^{2}}\,dx\), not \(dx\).` },
      { value: I('\\pi', axis === 'x' ? `\\left(${c.tex}\\right)^{2}` : `x^{2}`), why: 'That is a volume-style integral (discs). A surface area adds up circumference × slant width, 2πr ds.' },
      I('\\pi', `${rad}\\,${root}`),
    ],
    solution: [
      R`Each small piece \(ds\) of the curve sweeps out a band of area \(2\pi r\,ds\), where \(r\) is its distance to the axis.`,
      R`About the \(${axis}\)-axis, \(r = ${axis === 'x' ? R`y = ${c.tex}` : 'x'}\). Also \(\left(\dfrac{dy}{dx}\right)^{2} = ${c.d2}\), so \(ds = ${root}\,dx\).`,
      R`\(S = \displaystyle 2\pi\int_{${c.a}}^{${c.b}} ${rad}\,${root}\,dx\).`,
    ],
    rule: axis === 'x' ? 0 : 1,
    skill: 'setting up a surface integral',
    check: () => {
      // the chosen integrand, integrated numerically, matches the polygonal (frustum) surface
      const want = frustumSum((t) => t, c.f, c.a, c.b, axis);
      const got = surfNum((t) => t, c.f, c.a, c.b, axis);
      return close(want, got, 1e-5) ? true : `frustum ${want} vs integral ${got}`;
    },
  });
}

function easyCone(rng) {
  const [p, qq, hyp] = rng.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10]]);
  const w = rng.int(1, 3);
  const axis = rng.pick(['x', 'y']);
  const b = qq * w;
  const slope = frac(p, qq);
  const r = axis === 'x' ? p * w : qq * w;
  const height = axis === 'x' ? qq * w : p * w;
  const L = hyp * w;
  const right = piK(r * L);
  const line = `${slope.tex()}x`;
  return q({
    prompt: R`The segment \(y = ${line}\), \(0 \le x \le ${b}\), is revolved about the \(${axis}\)-axis, giving a cone without its base. Find the surface area.`,
    visual: surfacePlot((x) => (p / qq) * x, 0, b, axis, `The segment y = ${slope.text()}x from (0, 0) to (${b}, ${p * w}) and its mirror image across the ${axis}-axis, dashed: a side view of a cone with radius ${r}, height ${height} and slant height ${L}.`),
    ...exactChoices(right, [
      { k: piK(r * height), why: R`Use the slant height \(\ell = ${L}\) (the length of the segment), not the height ${height}. In the integral, \(ds = ${frac(hyp, qq).tex()}\,dx\), not \(dx\).` },
      { k: piK(2 * r * L), why: R`A cone’s side is \(\pi r\ell\): the band radius grows from 0 to ${r}, so its average is \(\frac{${r}}{2}\).` },
      { k: piK(r * L + r * r), why: R`Revolving the segment sweeps only the slanted side. The base disc \(\pi r^{2}\) is not part of it.` },
      piK(frac(r * r * height, 3)),
    ]),
    solution: [
      R`\(\dfrac{dy}{dx} = ${slope.tex()}\), so \(ds = \sqrt{1 + ${frac(p * p, qq * qq).tex()}}\,dx = ${frac(hyp, qq).tex()}\,dx\).`,
      R`\(S = \displaystyle\int_{0}^{${b}} 2\pi\cdot ${axis === 'x' ? line : 'x'}\cdot ${frac(hyp, qq).tex()}\,dx = ${right.tex}\).`,
      R`Check: radius \(r = ${r}\), slant height \(\ell = ${L}\), and \(\pi r\ell = ${right.tex}\).`,
    ],
    rule: 3,
    skill: 'cones and frustums',
    check: () => checkSurface(right.value, { yf: (x) => (p / qq) * x, t0: 0, t1: b, axis }),
  });
}

function easySphereZone(rng) {
  const Rr = rng.int(3, 10);
  const a = rng.int(-Rr + 1, Rr - 2);
  const b = rng.int(a + 1, Rr - 1);
  const right = piK(2 * Rr * (b - a));
  const h = b - a;
  return q({
    prompt: R`The curve \(y = \sqrt{${Rr * Rr} - x^{2}}\), \(${a} \le x \le ${b}\), is revolved about the \(x\)-axis, giving a band (zone) of a sphere. Find its area.`,
    ...exactChoices(right, [
      { k: piK(2 * h), why: R`\(y\cdot\sqrt{1 + (y')^{2}} = \sqrt{${Rr * Rr} - x^{2}}\cdot\dfrac{${Rr}}{\sqrt{${Rr * Rr} - x^{2}}} = ${Rr}\). The factor ${Rr} is missing.` },
      { k: piK(4 * Rr * Rr), why: `That is the whole sphere. Only the band from \\(x = ${a}\\) to \\(x = ${b}\\) is swept.` },
      { k: piK(Rr * h), why: R`Each band has circumference \(2\pi r\), not \(\pi r\).` },
      piK(2 * Rr * Rr * h),
    ]),
    solution: [
      R`\(y' = \dfrac{-x}{\sqrt{${Rr * Rr} - x^{2}}}\), so \(1 + (y')^{2} = \dfrac{${Rr * Rr}}{${Rr * Rr} - x^{2}}\) and \(y\sqrt{1 + (y')^{2}} = ${Rr}\).`,
      R`\(S = \displaystyle\int_{${a}}^{${b}} 2\pi\cdot ${Rr}\,dx = 2\pi\cdot ${Rr}\cdot ${h} = ${right.tex}\).`,
      R`This matches the zone formula \(2\pi R h\) with \(R = ${Rr}\) and width \(h = ${h}\).`,
    ],
    rule: 3,
    skill: 'sphere zones',
    check: () => checkSurface(right.value, { yf: (x) => Math.sqrt(Rr * Rr - x * x), t0: a, t1: b }),
  });
}

// ───────────── Medium ─────────────

function mediumRoot(rng) {
  if (rng.bool()) {
    const [ma, mb] = rng.sample([1, 3, 5, 7, 9, 11], 2).sort((u, v) => u - v);
    const a = (ma * ma - 1) / 4;
    const b = (mb * mb - 1) / 4;
    const D = mb ** 3 - ma ** 3;
    const right = piK(frac(D, 6));
    return q({
      prompt: R`The curve \(y = \sqrt{x}\), \(${a} \le x \le ${b}\), is revolved about the \(x\)-axis. Find the area of the surface.`,
      ...exactChoices(right, [
        a === 0 ? { k: piK(frac(mb ** 3, 6)), why: R`At \(x = 0\), \((4x + 1)^{3/2} = 1\), not 0. Subtract it.` } : { k: piK(frac(mb ** 3, 6)), why: R`Subtract the value at the lower limit, \((4\cdot ${a} + 1)^{3/2} = ${ma ** 3}\).` },
        { k: piK(frac(2 * D, 3)), why: R`\(\int\sqrt{4x + 1}\,dx = \frac{1}{6}(4x + 1)^{3/2}\): the chain rule brings a factor \(\frac{1}{4}\).` },
        { k: piK(frac(b * b - a * a, 2)), why: R`That is the volume \(\pi\int y^{2}\,dx\). The surface needs \(2\pi y\,ds\).` },
        piK(frac(D, 12)),
        piK(frac(D, 3)),
      ]),
      solution: [
        R`\(y' = \dfrac{1}{2\sqrt{x}}\), so \(y\sqrt{1 + (y')^{2}} = \sqrt{x}\sqrt{1 + \dfrac{1}{4x}} = \sqrt{x + \tfrac{1}{4}} = \tfrac{1}{2}\sqrt{4x + 1}\).`,
        R`\(S = 2\pi\displaystyle\int_{${a}}^{${b}} \tfrac{1}{2}\sqrt{4x + 1}\,dx = \pi\Big[\tfrac{1}{6}(4x + 1)^{3/2}\Big]_{${a}}^{${b}} = \frac{\pi}{6}\left(${mb ** 3} - ${ma ** 3}\right)\).`,
        R`\(S = ${right.tex} \approx ${num(right.value, { places: 2 })}\).`,
      ],
      rule: 0,
      skill: 'evaluating surface area',
      check: () => checkSurface(right.value, { yf: Math.sqrt, t0: a, t1: b }),
    });
  }
  const [ma, mb] = rng.sample([1, 2, 3, 4, 5, 6], 2).sort((u, v) => u - v);
  const a = ma * ma - 1;
  const b = mb * mb - 1;
  const D = mb ** 3 - ma ** 3;
  const right = piK(frac(8 * D, 3));
  return q({
    prompt: R`The curve \(y = 2\sqrt{x}\), \(${a} \le x \le ${b}\), is revolved about the \(x\)-axis. Find the area of the surface.`,
    ...exactChoices(right, [
      { k: piK(frac(8 * mb ** 3, 3)), why: a === 0 ? R`At \(x = 0\), \((x + 1)^{3/2} = 1\), not 0. Subtract it.` : R`Subtract the value at the lower limit, \((${a} + 1)^{3/2} = ${ma ** 3}\).` },
      { k: piK(2 * (b * b - a * a)), why: R`That is the volume \(\pi\int y^{2}\,dx\). The surface needs \(2\pi y\,ds\).` },
      { k: piK(frac(4 * D, 3)), why: R`Each band has circumference \(2\pi r\), not \(\pi r\).` },
      piK(4 * D),
      piK(frac(16 * D, 3)),
    ]),
    solution: [
      R`\(y' = \dfrac{1}{\sqrt{x}}\), so \(y\sqrt{1 + (y')^{2}} = 2\sqrt{x}\sqrt{1 + \dfrac{1}{x}} = 2\sqrt{x + 1}\).`,
      R`\(S = 2\pi\displaystyle\int_{${a}}^{${b}} 2\sqrt{x + 1}\,dx = 4\pi\Big[\tfrac{2}{3}(x + 1)^{3/2}\Big]_{${a}}^{${b}} = \frac{8\pi}{3}\left(${mb ** 3} - ${ma ** 3}\right)\).`,
      R`\(S = ${right.tex} \approx ${num(right.value, { places: 2 })}\).`,
    ],
    rule: 0,
    skill: 'evaluating surface area',
    check: () => checkSurface(right.value, { yf: (x) => 2 * Math.sqrt(x), t0: a, t1: b }),
  });
}

function mediumCubic(rng) {
  // y = x³/n on [0, b], with u = 1 + 9x⁴/n² a whole number at x = b; S = (nπ/27)(u^{3/2} − 1)
  const [n, b] = rng.pick([[1, 1], [1, 2], [3, 1], [3, 2], [3, 3], [3, 4], [6, 2], [6, 4], [9, 3]]);
  const co = frac(9, n * n);
  const m = co.mul(b ** 4).add(1).n;
  const k = frac(n, 27);
  const root = (c) => K([[k.mul(c), { t: `\\pi\\left(${m}\\sqrt{${m}} - 1\\right)`, v: PI * (m ** 1.5 - 1) }]]);
  const right = root(1);
  const curve = n === 1 ? 'x^{3}' : R`\frac{x^{3}}{${n}}`;
  const inner = `1 + ${co.eq(1) ? 'x^{4}' : co.isInt() ? `${co.n}x^{4}` : R`\frac{x^{4}}{${co.d}}`}`;
  const du = frac(36, n * n);
  const f = (x) => x ** 3 / n;
  return q({
    prompt: R`The curve \(y = ${curve}\), \(0 \le x \le ${b}\), is revolved about the \(x\)-axis. Find the area of the surface.`,
    visual: surfacePlot(f, 0, b, 'x', `The curve y = x³${n === 1 ? '' : `/${n}`} from x = 0 to x = ${b} and its mirror image across the x-axis, dashed: a side view of the surface.`),
    ...exactChoices(right, [
      { k: K([[k.mul(m), `\\sqrt{${m}}\\pi`]]), why: R`At \(x = 0\), \((${inner})^{3/2} = 1\), not 0. Subtract it.` },
      { k: root(frac(3, 2)), why: R`\(\int\sqrt{u}\,du = \frac{2}{3}u^{3/2}\). The \(\frac{2}{3}\) is missing.` },
      { k: root(frac(1, 2)), why: R`Each band has circumference \(2\pi r\), not \(\pi r\).` },
      root(2),
      root(4),
    ]),
    solution: [
      R`\(y' = ${n === 1 ? '3x^{2}' : n === 3 ? 'x^{2}' : R`\frac{x^{2}}{${n / 3}}`}\), so \(1 + (y')^{2} = ${inner}\) and \(S = 2\pi\displaystyle\int_{0}^{${b}} ${curve}\sqrt{${inner}}\,dx\).`,
      R`Let \(u = ${inner}\), \(du = ${du.eq(1) ? '' : du.tex()}x^{3}\,dx\): \(S = ${fterms([[frac(2, n).div(du), '\\pi']])}\displaystyle\int_{1}^{${m}} \sqrt{u}\,du = ${fterms([[k, '\\pi']])}\Big[u^{3/2}\Big]_{1}^{${m}}\).`,
      R`\(S = ${right.tex} \approx ${num(right.value, { places: 3 })}\).`,
    ],
    rule: 0,
    skill: 'evaluating surface area',
    check: () => checkSurface(right.value, { yf: f, t0: 0, t1: b }),
  });
}

function mediumWordLampshade(rng) {
  const [leg, h, l] = rng.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [4, 3, 5], [12, 16, 20]]);
  const r2 = rng.int(4, 12);
  const r1 = r2 + leg;
  const right = piK((r1 + r2) * l);
  const slope = frac(leg, h);
  return q({
    prompt: R`A lamp shade is the surface formed by revolving a straight segment about a vertical axis. The bottom rim has radius ${r1} cm, the top rim has radius ${r2} cm, and the rims are ${h} cm apart. How much fabric covers the shade (no ends)?`,
    visual: { type: 'plot', x: [-r1 - 2, r1 + 4], y: [-1, h + 2], square: true, grid: false, segments: [{ from: [r1, 0], to: [r2, h], color: 'a' }, { from: [-r1, 0], to: [-r2, h], color: 'a', dashed: true }, { from: [0, 0], to: [r1, 0], dashed: true, color: 'c', label: `${r1} cm` }, { from: [r2, h], to: [0, h], dashed: true, color: 'c', label: `${r2} cm` }], vlines: [{ x: 0 }], alt: `Side view of the lamp shade: a slanted segment from (${r1}, 0) to (${r2}, ${h}), revolved about the vertical axis x = 0. The bottom radius is ${r1} cm, the top radius ${r2} cm, and the height ${h} cm.` },
    ...exactChoices(
      right,
      [
        { k: piK((r1 + r2) * h), why: R`Use the slant length of the side, \(\sqrt{${leg}^{2} + ${h}^{2}} = ${l}\) cm, not the height ${h} cm.` },
        { k: piK(2 * (r1 + r2) * l), why: R`The band’s average radius is \(\frac{${r1} + ${r2}}{2}\), so its area is \(2\pi\cdot\frac{${r1} + ${r2}}{2}\cdot ${l}\).` },
        { k: piK((r1 + r2) * l + r1 * r1 + r2 * r2), why: 'The shade is open at both ends, so the two rim discs are not covered.' },
        piK(r1 * l),
      ],
      cm2,
    ),
    solution: [
      R`Put the axis on the \(y\)-axis. The side is \(x = ${r1} - ${slope.tex()}y\) for \(0 \le y \le ${h}\), and \(ds = \sqrt{1 + \left(${slope.tex()}\right)^{2}}\,dy = ${frac(l, h).tex()}\,dy\).`,
      R`\(S = \displaystyle\int_{0}^{${h}} 2\pi\left(${r1} - ${slope.tex()}y\right)${frac(l, h).tex()}\,dy = ${right.tex}\).`,
      R`Check with the frustum formula \(\pi(r_{1} + r_{2})\ell = \pi(${r1} + ${r2})(${l}) = ${right.tex}\) cm², about \(${num(right.value, { places: 0 })}\) cm².`,
    ],
    rule: 3,
    skill: 'cones and frustums',
    check: () => checkSurface(right.value, { xf: (y) => r1 - (leg / h) * y, yf: (y) => y, t0: 0, t1: h, axis: 'y' }),
  });
}

// ───────────── Hard ─────────────

const L = (c) => [[c, '\\pi']];
const scale = (list, f) => list.map(([c, sym]) => [Frac.from(c).mul(f), sym]);

// Curves whose 1 + (y')² is a perfect square. F(x)·π = 2π × an antiderivative of r·√(1 + y'²); G is the same with y' in place of √(1 + y'²).
const SQUARE_FAMILIES = [
  {
    curve: R`y = \frac{x^{2}}{4} - \frac{\ln x}{2}`, f: (x) => (x * x) / 4 - Math.log(x) / 2, axis: 'y', as: [1, 2, 3, 4], bmax: 8, F: (x) => frac(x ** 3 + 3 * x, 3), G: (x) => frac(x ** 3 - 3 * x, 3),
    ds: R`\frac{x}{2} + \frac{1}{2x}`, dy: R`\frac{x}{2} - \frac{1}{2x}`, sq: R`\frac{x^{2}}{4} + \frac{1}{2} + \frac{1}{4x^{2}}`,
    integrand: R`x\left(\frac{x}{2} + \frac{1}{2x}\right) = \frac{x^{2}}{2} + \frac{1}{2}`, anti: R`\pi\Big[\frac{x^{3}}{3} + x\Big]`,
  },
  {
    curve: R`y = \frac{x^{3}}{6} + \frac{1}{2x}`, f: (x) => x ** 3 / 6 + 1 / (2 * x), axis: 'x', as: [1, 2, 3], bmax: 4, F: (x) => frac(x ** 6, 36).add(frac(x * x, 3)).sub(frac(1, 4 * x * x)), G: (x) => frac(x ** 6, 36).add(frac(x * x, 6)).add(frac(1, 4 * x * x)),
    ds: R`\frac{x^{2}}{2} + \frac{1}{2x^{2}}`, dy: R`\frac{x^{2}}{2} - \frac{1}{2x^{2}}`, sq: R`\frac{x^{4}}{4} + \frac{1}{2} + \frac{1}{4x^{4}}`,
    integrand: R`\left(\frac{x^{3}}{6} + \frac{1}{2x}\right)\left(\frac{x^{2}}{2} + \frac{1}{2x^{2}}\right) = \frac{x^{5}}{12} + \frac{x}{3} + \frac{1}{4x^{3}}`, anti: R`2\pi\Big[\frac{x^{6}}{72} + \frac{x^{2}}{6} - \frac{1}{8x^{2}}\Big]`,
  },
  {
    curve: R`y = \frac{x^{3}}{6} + \frac{1}{2x}`, f: (x) => x ** 3 / 6 + 1 / (2 * x), axis: 'y', as: [1], bmax: 9,
    ds: R`\frac{x^{2}}{2} + \frac{1}{2x^{2}}`, dy: R`\frac{x^{2}}{2} - \frac{1}{2x^{2}}`, sq: R`\frac{x^{4}}{4} + \frac{1}{2} + \frac{1}{4x^{4}}`,
    integrand: R`x\left(\frac{x^{2}}{2} + \frac{1}{2x^{2}}\right) = \frac{x^{3}}{2} + \frac{1}{2x}`, anti: R`\pi\Big[\frac{x^{4}}{4} + \ln x\Big]`,
    S: (b) => ([[frac(b ** 4 - 1, 4), '\\pi'], [1, `\\pi\\ln ${b}`]]), flip: (b) => ([[frac(b ** 4 - 1, 4), '\\pi'], [-1, `\\pi\\ln ${b}`]]), top: (b) => ([[frac(b ** 4, 4), '\\pi'], [1, `\\pi\\ln ${b}`]]),
  },
  {
    curve: R`y = \frac{x^{4}}{8} + \frac{1}{4x^{2}}`, f: (x) => x ** 4 / 8 + 1 / (4 * x * x), axis: 'y', as: [1, 2, 3], bmax: 5, F: (x) => frac(x ** 5, 5).sub(frac(1, x)), G: (x) => frac(x ** 5, 5).add(frac(1, x)),
    ds: R`\frac{x^{3}}{2} + \frac{1}{2x^{3}}`, dy: R`\frac{x^{3}}{2} - \frac{1}{2x^{3}}`, sq: R`\frac{x^{6}}{4} + \frac{1}{2} + \frac{1}{4x^{6}}`,
    integrand: R`x\left(\frac{x^{3}}{2} + \frac{1}{2x^{3}}\right) = \frac{x^{4}}{2} + \frac{1}{2x^{2}}`, anti: R`2\pi\Big[\frac{x^{5}}{10} - \frac{1}{2x}\Big]`,
  },
];

function hardPerfectSquare(rng) {
  const fam = rng.pick(SQUARE_FAMILIES);
  const a = rng.pick(fam.as);
  const b = rng.int(a + 1, fam.bmax);
  const S = fam.S ? fam.S(b) : L(fam.F(b).sub(fam.F(a)));
  const flip = fam.flip ? fam.flip(b) : L(fam.G(b).sub(fam.G(a)));
  const top = fam.top ? fam.top(b) : L(fam.F(b));
  const right = K(S);
  return q({
    prompt: R`The curve \(${fam.curve}\), \(${a} \le x \le ${b}\), is revolved about the \(${fam.axis}\)-axis. Find the area of the surface.`,
    ...exactChoices(right, [
      { k: K(flip), why: R`Adding 1 flips the sign of the middle term: \(1 + (y')^{2} = \left(${fam.ds}\right)^{2}\). So \(\sqrt{1 + (y')^{2}} = ${fam.ds}\), not \(y'\).` },
      { k: K(top), why: R`Subtract the value of the antiderivative at the lower limit \(x = ${a}\); it is not 0.` },
      { k: K(scale(S, frac(1, 2))), why: R`Each band has circumference \(2\pi r\), not \(\pi r\).` },
      K(scale(S, 2)),
    ]),
    solution: [
      R`\(y' = ${fam.dy}\), so \(1 + (y')^{2} = ${fam.sq} = \left(${fam.ds}\right)^{2}\).`,
      R`About the \(${fam.axis}\)-axis the radius is \(${fam.axis === 'y' ? 'x' : 'y'}\), and \(${fam.axis === 'y' ? 'x' : 'y'}\sqrt{1 + (y')^{2}} = ${fam.integrand}\). So \(S = 2\pi\displaystyle\int_{${a}}^{${b}} \left(${fam.integrand.split(' = ')[1]}\right)dx\).`,
      R`\(S = ${fam.anti}_{${a}}^{${b}} = ${right.tex} \approx ${num(right.value, { places: 3 })}\).`,
    ],
    rule: 4,
    skill: 'perfect-square integrands',
    check: () => checkSurface(right.value, { yf: fam.f, t0: a, t1: b, axis: fam.axis }),
  });
}

function hardParaboloid(rng) {
  const kind = rng.pick(['half', 'one', 'one', 'two']); // y = c·x² with c = 1/2, 1 or 2
  const c = { half: frac(1, 2), one: frac(1), two: frac(2) }[kind];
  const b = rng.int(1, kind === 'two' ? 3 : 4);
  const fourC2 = c.mul(c).mul(4); // 1 + 4c²x²
  const m = fourC2.mul(b * b).add(1).n;
  const k = frac(1, 6).div(c.mul(c)); // S = kπ(m^{3/2} − 1)
  const S = (f) => K([[k.mul(f), { t: `\\pi\\left(${m}\\sqrt{${m}} - 1\\right)`, v: PI * (m ** 1.5 - 1) }]]);
  const right = S(1);
  const asX = rng.bool();
  const cx = c.eq(1) ? 'x^{2}' : kind === 'half' ? R`\frac{x^{2}}{2}` : '2x^{2}';
  const inner = `1 + ${fourC2.eq(1) ? '' : fourC2.tex()}x^{2}`;
  const du = fourC2.mul(2).tex();
  const top = c.mul(b * b);
  const gTex = { half: R`\sqrt{2y}`, one: R`\sqrt{y}`, two: R`\sqrt{\frac{y}{2}}` }[kind];
  const lin = { half: '2y + 1', one: '4y + 1', two: '8y + 1' }[kind];
  const prompt = asX
    ? R`The curve \(y = ${cx}\), \(0 \le x \le ${b}\), is revolved about the \(y\)-axis. Find the area of the surface (a paraboloid without its lid).`
    : R`The curve \(x = ${gTex}\), \(0 \le y \le ${top.tex()}\), is revolved about the \(y\)-axis. Find the area of the surface.`;
  const steps = asX
    ? [R`About the \(y\)-axis the radius is \(x\), and \(y' = ${c.mul(2).eq(1) ? '' : c.mul(2).tex()}x\): \(S = 2\pi\displaystyle\int_{0}^{${b}} x\sqrt{${inner}}\,dx\).`, R`Let \(u = ${inner}\), \(du = ${du}x\,dx\): \(S = \frac{2\pi}{${du}}\displaystyle\int_{1}^{${m}} \sqrt{u}\,du = ${fterms([[k, '\\pi']])}\Big[u^{3/2}\Big]_{1}^{${m}}\).`]
    : [R`The radius is \(x = ${gTex}\). Then \(x^{2}\left[1 + \left(\dfrac{dx}{dy}\right)^{2}\right] = x^{2} + \left(x\dfrac{dx}{dy}\right)^{2} = ${kind === 'half' ? '2y' : kind === 'one' ? 'y' : R`\frac{y}{2}`} + ${{ half: '1', one: R`\frac{1}{4}`, two: R`\frac{1}{16}` }[kind]}\).`, R`\(S = 2\pi\displaystyle\int_{0}^{${top.tex()}} \sqrt{${kind === 'half' ? '2y + 1' : kind === 'one' ? R`y + \tfrac{1}{4}` : R`\tfrac{y}{2} + \tfrac{1}{16}`}}\,dy = ${fterms([[k, '\\pi']])}\Big[(${lin})^{3/2}\Big]_{0}^{${top.tex()}}\).`];
  return q({
    prompt,
    ...exactChoices(right, [
      { k: K([[k.mul(m), `\\sqrt{${m}}\\pi`]]), why: R`The lower limit gives \(1^{3/2} = 1\), not 0. Subtract it.` },
      asX ? { k: S(fourC2.mul(2)), why: R`The substitution \(u = ${inner}\) has \(du = ${du}x\,dx\). Divide by ${du}.` } : null,
      { k: S(frac(1, 2)), why: R`Each band has circumference \(2\pi r\), not \(\pi r\).` },
      { k: piK(top.mul(top).div(c.mul(2))), why: 'That is the volume of the solid inside the bowl. The question asks for the area of its surface.' },
      S(3),
      S(2),
    ]),
    solution: [...steps, R`\(S = ${right.tex} \approx ${num(right.value, { places: 3 })}\).`],
    rule: 1,
    skill: 'revolving about the y-axis',
    check: () => checkSurface(right.value, { yf: (x) => c.value * x * x, t0: 0, t1: b, axis: 'y' }),
  });
}

const DISHES = [[3, 4, 5, [8, 16, 24, 32, 40, 48, 56, 64, 80]], [5, 12, 13, [24, 48, 72, 96]], [4, 3, 5, [15, 30, 45, 60, 75, 90]], [8, 15, 17, [15, 30, 45, 60, 75, 90]]];

/** Paraboloid dish of rim radius r and depth D with 2·(D/r²)·r = p/q, so 1 + (2cr)² = (h/q)². */
function dish(rng) {
  const [p, qq, h, rs] = rng.pick(DISHES);
  const r = rng.pick(rs);
  const D = (p * r) / (2 * qq);
  const S = frac(r ** 4 * (h ** 3 - qq ** 3), 6 * D * D * qq ** 3);
  return { p, qq, h, r, D, S, c: frac(D, r * r) };
}

function hardWordDish(rng) {
  const { qq, h, r, D, S, c } = dish(rng);
  const right = piK(S);
  const cr2 = frac(2 * D, r).mul(frac(2 * D, r)); // (2cr)²
  return q({
    prompt: R`A satellite dish has the shape of the parabola \(y = cx^{2}\) revolved about the \(y\)-axis. The rim has radius ${r} cm and the dish is ${D} cm deep. What is the area of the dish’s inner surface?`,
    visual: surfacePlot((x) => c.value * x * x, 0, r, 'y', `Side view of the dish: the parabola from the vertex (0, 0) to the rim at (${r}, ${D}), and its mirror image on the left, dashed. The rim radius is ${r} cm and the depth ${D} cm.`),
    ...exactChoices(
      right,
      [
        { k: piK(r * r), why: 'That is the flat disc the dish covers. The curved dish has a larger area.' },
        { k: piK(S.add(frac(r ** 4, 6 * D * D))), why: R`The lower limit gives \(1^{3/2} = 1\), not 0. Subtract it.` },
        { k: piK(S.div(2)), why: R`Each band has circumference \(2\pi r\), not \(\pi r\).` },
        piK(S.mul(2)),
      ],
      cm2,
    ),
    solution: [
      R`The rim point \((${r}, ${D})\) is on the curve, so \(c = ${c.tex()}\).`,
      R`About the \(y\)-axis: \(S = 2\pi\displaystyle\int_{0}^{${r}} x\sqrt{1 + 4c^{2}x^{2}}\,dx = \frac{\pi}{6c^{2}}\Big[(1 + 4c^{2}x^{2})^{3/2}\Big]_{0}^{${r}}\).`,
      R`At \(x = ${r}\): \(1 + 4c^{2}x^{2} = 1 + ${cr2.tex()} = \left(${frac(h, qq).tex()}\right)^{2}\), so the bracket is \(${frac(h ** 3, qq ** 3).tex()} - 1\).`,
      R`\(S = ${right.tex}\) cm², about \(${num(right.value, { places: 0 })}\) cm² (the flat disc would be about \(${num(PI * r * r, { places: 0 })}\) cm²).`,
    ],
    rule: 1,
    skill: 'surface area in context',
    check: () => checkSurface(right.value, { yf: (x) => c.value * x * x, t0: 0, t1: r, axis: 'y' }),
  });
}

// ───────────── Challenge ─────────────

function challengeParametric(rng) {
  const kind = rng.pick(['astroid', 'cycloid', 'parabola']);
  if (kind === 'parabola') {
    const m = rng.pick([2, 3, 4]); // b² + 1 = m², t from 0 to √(m² − 1)
    const n = m * m - 1;
    const right = piK(frac(8 * (m ** 3 - 1), 3));
    return q({
      prompt: R`The curve \(x = t^{2}\), \(y = 2t\), \(0 \le t \le \sqrt{${n}}\), is revolved about the \(x\)-axis. Find the area of the surface.`,
      ...exactChoices(right, [
        { k: piK(frac(8 * m ** 3, 3)), why: R`At \(t = 0\), \((t^{2} + 1)^{3/2} = 1\), not 0. Subtract it.` },
        { k: piK(frac(4 * (m ** 3 - 1), 3)), why: R`Each band has circumference \(2\pi y\), not \(\pi y\).` },
        { k: piK(frac(16 * (m ** 3 - 1), 3)), why: R`\(\sqrt{(2t)^{2} + 2^{2}} = 2\sqrt{t^{2} + 1}\): take the 4 out of the root as 2, not 4.` },
        piK(4 * n),
      ]),
      solution: [
        R`\(x' = 2t\), \(y' = 2\), so \(ds = \sqrt{4t^{2} + 4}\,dt = 2\sqrt{t^{2} + 1}\,dt\). The radius is \(y = 2t\).`,
        R`\(S = \displaystyle\int_{0}^{\sqrt{${n}}} 2\pi(2t)\cdot 2\sqrt{t^{2} + 1}\,dt = 8\pi\Big[\tfrac{1}{3}(t^{2} + 1)^{3/2}\Big]_{0}^{\sqrt{${n}}} = \frac{8\pi}{3}(${m ** 3} - 1)\).`,
        R`\(S = ${right.tex}\).`,
      ],
      rule: 5,
      skill: 'parametric surfaces',
      check: () => checkSurface(right.value, { xf: (t) => t * t, yf: (t) => 2 * t, t0: 0, t1: Math.sqrt(n) }),
    });
  }
  const a = rng.int(1, kind === 'astroid' ? 5 : 3);
  const aa = a === 1 ? '' : a;
  if (kind === 'astroid') {
    const right = piK(frac(12 * a * a, 5));
    return q({
      prompt: R`The astroid \(x = ${aa}\cos^{3}t\), \(y = ${aa}\sin^{3}t\), \(0 \le t \le \pi\) (its upper half), is revolved about the \(x\)-axis. Find the area of the surface it sweeps out.`,
      visual: { type: 'plot', x: [-a * 1.3, a * 1.3], y: [-a * 1.2, a * 1.2], square: true, param: [{ x: (t) => a * Math.cos(t) ** 3, y: (t) => a * Math.sin(t) ** 3, t: [0, PI] }, { x: (t) => a * Math.cos(t) ** 3, y: (t) => a * Math.sin(t) ** 3, t: [PI, 2 * PI], dashed: true }], alt: `The astroid with cusps at (±${a}, 0) and (0, ±${a}). The upper half is solid and the lower half, its mirror image, is dashed.` },
      ...exactChoices(right, [
        { k: piK(frac(6 * a * a, 5)), why: R`From \(t = 0\) to \(\frac{\pi}{2}\) is only the right quarter. By symmetry the upper half gives twice that.` },
        { k: piK(frac(24 * a * a, 5)), why: R`Revolving the upper half, \(0 \le t \le \pi\), already sweeps the whole surface. Going on to \(2\pi\) would count it twice.` },
        { k: N(6 * a), why: R`That is the length of the whole astroid. Surface area weights each piece \(ds\) by \(2\pi y\).` },
        piK(frac(12 * a * a, 3)),
      ]),
      solution: [
        R`\(x' = -${3 * a}\cos^{2}t\sin t\), \(y' = ${3 * a}\sin^{2}t\cos t\), so \(ds = ${3 * a}|\sin t\cos t|\,dt\).`,
        R`By symmetry, \(S = 2\displaystyle\int_{0}^{\pi/2} 2\pi(${aa}\sin^{3}t)(${3 * a}\sin t\cos t)\,dt = ${12 * a * a}\pi\int_{0}^{\pi/2} \sin^{4}t\cos t\,dt\).`,
        R`\(\displaystyle\int_{0}^{\pi/2} \sin^{4}t\cos t\,dt = \frac{1}{5}\), so \(S = ${right.tex}\).`,
      ],
      rule: 5,
      skill: 'parametric surfaces',
      check: () => checkSurface(right.value, { xf: (t) => a * Math.cos(t) ** 3, yf: (t) => a * Math.sin(t) ** 3, t0: 0, t1: PI, tol: 1e-4 }),
    });
  }
  const right = piK(frac(64 * a * a, 3));
  return q({
    prompt: R`One arch of the cycloid \(x = ${aa}(t - \sin t)\), \(y = ${aa}(1 - \cos t)\), \(0 \le t \le 2\pi\), is revolved about the \(x\)-axis. Find the area of the surface.`,
    visual: { type: 'plot', x: [-0.5, 2 * PI * a + 0.5], y: [-2.3 * a, 2.3 * a], square: true, param: [{ x: (t) => a * (t - Math.sin(t)), y: (t) => a * (1 - Math.cos(t)), t: [0, 2 * PI] }, { x: (t) => a * (t - Math.sin(t)), y: (t) => -a * (1 - Math.cos(t)), t: [0, 2 * PI], dashed: true }], alt: `One arch of the cycloid, from (0, 0) to (${2 * a}π, 0) with highest point ${2 * a}; its mirror image across the x-axis is dashed.` },
    ...exactChoices(right, [
      { k: N(8 * a), why: R`That is the length of the arch. Surface area weights each piece \(ds\) by \(2\pi y\).` },
      { k: piK(frac(32 * a * a, 3)), why: R`Each band has circumference \(2\pi y\), not \(\pi y\).` },
      { k: piK(3 * a * a), why: 'That is the area under the arch, a flat region. The surface is swept out by the curve itself.' },
      piK(16 * a * a),
    ]),
    solution: [
      R`\(x'^{2} + y'^{2} = ${a * a}\left[(1 - \cos t)^{2} + \sin^{2}t\right] = ${2 * a * a}(1 - \cos t) = ${4 * a * a}\sin^{2}\tfrac{t}{2}\), so \(ds = ${2 * a}\sin\tfrac{t}{2}\,dt\).`,
      R`\(S = \displaystyle\int_{0}^{2\pi} 2\pi\cdot ${2 * a}\sin^{2}\tfrac{t}{2}\cdot ${2 * a}\sin\tfrac{t}{2}\,dt = ${8 * a * a}\pi\int_{0}^{2\pi} \sin^{3}\tfrac{t}{2}\,dt\).`,
      R`With \(u = \tfrac{t}{2}\): \(\displaystyle\int_{0}^{2\pi} \sin^{3}\tfrac{t}{2}\,dt = 2\int_{0}^{\pi} \sin^{3}u\,du = \frac{8}{3}\). So \(S = ${right.tex}\).`,
    ],
    rule: 5,
    skill: 'parametric surfaces',
    check: () => checkSurface(right.value, { xf: (t) => a * (t - Math.sin(t)), yf: (t) => a * (1 - Math.cos(t)), t0: 0, t1: 2 * PI, tol: 1e-4 }),
  });
}

function challengeFindBound(rng) {
  const two = rng.bool();
  const m = two ? rng.int(2, 6) : rng.pick([3, 5, 7, 9, 11]);
  const c = two ? m * m - 1 : (m * m - 1) / 4;
  const S = two ? piK(frac(8 * (m ** 3 - 1), 3)) : piK(frac(m ** 3 - 1, 6));
  const curve = two ? '2\\sqrt{x}' : '\\sqrt{x}';
  const inner = two ? 'c + 1' : '4c + 1';
  return q({
    prompt: R`The curve \(y = ${curve}\), \(0 \le x \le c\), is revolved about the \(x\)-axis, and the surface has area \(${S.tex}\). Find \(c\).`,
    correct: c,
    fmt: (v) => R`\(c = ${num(v)}\)`,
    wrong: [
      { value: m * m, why: R`That is \(${inner}\). Solve for \(c\).` },
      { value: m, why: R`That is \(\sqrt{${inner}}\). Square it, then solve for \(c\).` },
      two ? { value: m ** 3, why: R`\((c + 1)^{3/2} = ${m ** 3}\) gives \(c + 1 = ${m ** 3}^{2/3} = ${m * m}\).` } : { value: (m * m) / 4, why: R`From \(4c + 1 = ${m * m}\), subtract 1 before dividing by 4.` },
      c + 1,
    ],
    solution: [
      two
        ? R`\(S = 2\pi\displaystyle\int_{0}^{c} 2\sqrt{x + 1}\,dx = \frac{8\pi}{3}\left[(c + 1)^{3/2} - 1\right]\).`
        : R`\(S = 2\pi\displaystyle\int_{0}^{c} \tfrac{1}{2}\sqrt{4x + 1}\,dx = \frac{\pi}{6}\left[(4c + 1)^{3/2} - 1\right]\).`,
      R`Set it equal to \(${S.tex}\): \((${inner})^{3/2} - 1 = ${m ** 3 - 1}\), so \((${inner})^{3/2} = ${m ** 3}\) and \(${inner} = ${m * m}\).`,
      R`\(c = ${num(c)}\).`,
    ],
    rule: 0,
    skill: 'working backwards',
    check: () => checkSurface(S.value, { yf: two ? (x) => 2 * Math.sqrt(x) : Math.sqrt, t0: 0, t1: c }),
  });
}

function challengeWordPaint(rng) {
  const Rr = rng.int(3, 12);
  const h = rng.int(1, Rr);
  const k = rng.pick([4, 5, 6, 8, 10]);
  const area = 2 * PI * Rr * h;
  const L = Math.round((area / k) * 10) / 10;
  const r1 = (v) => Math.round(v * 10) / 10;
  const theta = Math.acos((Rr - h) / Rr);
  return q({
    prompt: R`A dome is the surface formed by revolving \(y = \sqrt{${Rr * Rr} - x^{2}}\), \(${Rr - h} \le x \le ${Rr}\) (metres), about the \(x\)-axis: a cap of a sphere of radius ${Rr} m, ${h} m high. One litre of paint covers ${k} m². How many litres are needed to paint the outside of the dome? Round to the nearest tenth of a litre.`,
    correct: L,
    unit: 'L',
    wrong: [
      { value: r1((PI * (2 * Rr * h - h * h)) / k), why: R`That paints only the flat circle under the dome (radius \(${sqrtTex(2 * Rr * h - h * h)}\) m). The curved cap is larger: \(2\pi R h\).` },
      h !== Rr ? { value: r1((2 * PI * Rr * Rr) / k), why: R`That is a whole hemisphere. This cap is only ${h} m high, so its area is \(2\pi\cdot ${Rr}\cdot ${h}\).` } : { value: r1((4 * PI * Rr * Rr) / k), why: 'That is the whole sphere. The dome is half of it.' },
      { value: r1((PI * Rr * h) / k), why: R`Each band has circumference \(2\pi r\), not \(\pi r\).` },
      { value: r1(area * k), why: R`Divide the area by the coverage: \(\text{litres} = \dfrac{\text{area}}{${k}\text{ m}^{2}\text{ per litre}}\).` },
    ],
    solution: [
      R`\(y\sqrt{1 + (y')^{2}} = \sqrt{${Rr * Rr} - x^{2}}\cdot\dfrac{${Rr}}{\sqrt{${Rr * Rr} - x^{2}}} = ${Rr}\).`,
      R`\(S = \displaystyle\int_{${Rr - h}}^{${Rr}} 2\pi\cdot ${Rr}\,dx = ${2 * Rr * h}\pi \approx ${num(area, { places: 2 })}\) m².`,
      R`Paint: \(${num(area, { places: 2 })} \div ${k} \approx ${num(L)}\) litres.`,
    ],
    rule: 3,
    skill: 'surface area in context',
    check: () => {
      const s = checkSurface(area, { xf: (t) => Rr * Math.cos(t), yf: (t) => Rr * Math.sin(t), t0: 0, t1: theta, tol: 1e-5 });
      return s === true ? (Math.abs(L - area / k) <= 0.05 + 1e-9 ? true : 'rounding') : s;
    },
  });
}

// ───────────── Models ─────────────

function lampModel({ r1, r2, h }) {
  if (r1 === 0 && r2 === 0) return { error: 'At least one rim needs a radius bigger than 0.' };
  const d = Math.abs(r1 - r2);
  const n = d * d + h * h;
  const l = Math.sqrt(n);
  const lTex = Number.isInteger(l) ? `${l}` : sqrtTex(n);
  const S = PI * (r1 + r2) * l;
  const exact = Number.isInteger(l) ? fterms([[(r1 + r2) * l, '\\pi']]) : `${r1 + r2 === 1 ? '' : r1 + r2}\\pi\\cdot ${lTex}`;
  const slope = frac(r1 - r2, h);
  return {
    problem: R`A lamp shade has a bottom rim of radius ${r1} cm and a top rim of radius ${r2} cm, ${h} cm apart. How much fabric covers its side?`,
    steps: [
      R`Put the axis on the \(y\)-axis: the side is the segment \(x = ${slope.n === 0 ? r1 : `${r1} ${slope.lt(0) ? '+' : '-'} ${slope.abs().eq(1) ? '' : slope.abs().tex()}y`}\), \(0 \le y \le ${h}\).`,
      R`\(ds = \sqrt{1 + \left(${slope.abs().tex()}\right)^{2}}\,dy\), and \(\displaystyle\int_{0}^{${h}} \sqrt{1 + \left(${slope.abs().tex()}\right)^{2}}\,dy = \sqrt{${d}^{2} + ${h}^{2}} = ${lTex}\), the slant length \(\ell\).`,
      R`\(S = \displaystyle\int_{0}^{${h}} 2\pi x\,ds = \pi(r_{1} + r_{2})\ell = \pi(${r1} + ${r2})\cdot ${lTex}\) (the frustum formula).`,
    ],
    answer: R`\(${exact} \approx ${num(S, { places: 1 })}\) cm²`,
    visual: { type: 'plot', x: [-Math.max(r1, r2) - 2, Math.max(r1, r2) + 3], y: [-1, h + 2], square: true, grid: false, segments: [{ from: [r1, 0], to: [r2, h], color: 'a' }, { from: [-r1, 0], to: [-r2, h], color: 'a', dashed: true }], vlines: [{ x: 0 }], alt: `Side view of the shade: a segment from (${r1}, 0) to (${r2}, ${h}) and its mirror image, revolved about the vertical axis.` },
  };
}

const MODEL_CURVES = {
  root: { name: 'y = √x about the x-axis', f: Math.sqrt, axis: 'x', ok: (a) => a >= 0, F: (x) => (PI / 6) * (4 * x + 1) ** 1.5, setup: R`y\sqrt{1 + (y')^{2}} = \tfrac{1}{2}\sqrt{4x + 1}`, anti: R`\frac{\pi}{6}(4x + 1)^{3/2}` },
  cubic: { name: 'y = x³/3 about the x-axis', f: (x) => x ** 3 / 3, axis: 'x', ok: (a) => a >= 0, F: (x) => (PI / 9) * (1 + x ** 4) ** 1.5, setup: R`y\sqrt{1 + (y')^{2}} = \tfrac{x^{3}}{3}\sqrt{1 + x^{4}}`, anti: R`\frac{\pi}{9}(1 + x^{4})^{3/2}` },
  square: { name: 'y = x²/4 − (ln x)/2 about the y-axis', f: (x) => (x * x) / 4 - Math.log(x) / 2, axis: 'y', ok: (a) => a > 0, F: (x) => PI * (x ** 3 / 3 + x), setup: R`x\sqrt{1 + (y')^{2}} = x\left(\tfrac{x}{2} + \tfrac{1}{2x}\right) = \tfrac{x^{2}}{2} + \tfrac{1}{2}`, anti: R`\pi\left(\frac{x^{3}}{3} + x\right)` },
};

function curveModel({ curve, a, b }) {
  const c = MODEL_CURVES[curve];
  if (!(b > a)) return { error: 'The right end b must be bigger than the left end a.' };
  if (!c.ok(a)) return { error: curve === 'square' ? 'This curve needs x > 0: make a at least 0.5.' : 'Keep the interval at x ≥ 0 so the curve stays on one side of the axis.' };
  const S = c.F(b) - c.F(a);
  return {
    problem: R`Revolve ${c.name}, from \(x = ${num(a)}\) to \(x = ${num(b)}\). Find the surface area.`,
    steps: [
      R`Radius: distance to the \(${c.axis}\)-axis, which is \(${c.axis === 'x' ? 'y' : 'x'}\). Then \(${c.setup}\).`,
      R`\(S = 2\pi\displaystyle\int_{${num(a)}}^{${num(b)}} (\text{radius})\sqrt{1 + (y')^{2}}\,dx = \Big[${c.anti}\Big]_{${num(a)}}^{${num(b)}}\).`,
      R`\(S \approx ${num(c.F(b), { places: 3 })} - ${num(c.F(a), { places: 3 })} = ${num(S, { places: 3 })}\).`,
    ],
    answer: R`\(S \approx ${num(S, { places: 3 })}\)`,
    visual: surfacePlot(c.f, a, b, c.axis, `The curve ${c.name.split(' about')[0]} from x = ${a} to x = ${b}, with its mirror image across the ${c.axis}-axis dashed.`),
  };
}

// ───────────── Topic ─────────────

export default {
  id: 'surface-area',
  title: 'Surface Area of Revolution',
  summary: 'Set up and evaluate S = ∫2πr ds for curves revolved about either axis, including parametric curves, and check with geometry.',
  standards: ['AP Calculus 8.13', 'Calculus II: surface area'],

  explain: {
    intro: R`Revolve a curve about an axis and it sweeps out a surface. Cut the curve into tiny pieces of length \(ds\): each one sweeps a thin band, close to a slice of a cone, with area \(2\pi r\,ds\), where \(r\) is the distance from the piece to the axis. Adding the bands gives \(S = \int 2\pi r\,ds\). The \(ds\) is the same element as in arc length.`,
    rules: [
      {
        title: 'About the x-axis',
        text: R`Revolving \(y = f(x)\ge 0\), \(a \le x \le b\), about the \(x\)-axis: the radius is \(y\), so \(S = \displaystyle\int_{a}^{b} 2\pi f(x)\sqrt{1 + [f'(x)]^{2}}\,dx\).`,
        example: R`\(y = \sqrt{x}\), \(0 \le x \le 2\): \(f\sqrt{1 + (f')^{2}} = \tfrac{1}{2}\sqrt{4x + 1}\), so \(S = \pi\displaystyle\int_{0}^{2} \sqrt{4x + 1}\,dx = \frac{\pi}{6}(27 - 1) = \frac{13\pi}{3}\).`,
      },
      {
        title: 'About the y-axis',
        text: R`Revolving \(y = f(x)\), \(0 \le a \le x \le b\), about the \(y\)-axis: the radius is \(x\), so \(S = \displaystyle\int_{a}^{b} 2\pi x\sqrt{1 + [f'(x)]^{2}}\,dx\). For a curve \(x = g(y)\), \(c \le y \le d\): \(S = \displaystyle\int_{c}^{d} 2\pi g(y)\sqrt{1 + [g'(y)]^{2}}\,dy\).`,
        example: R`\(y = x^{2}\), \(0 \le x \le 1\): \(S = 2\pi\displaystyle\int_{0}^{1} x\sqrt{1 + 4x^{2}}\,dx = \frac{\pi}{6}\left(5\sqrt{5} - 1\right)\).`,
      },
      {
        title: 'Radius and ds',
        text: R`Two choices make the integral: the radius \(r\) (distance to the axis of rotation, never the other coordinate) and the slant width \(ds = \sqrt{1 + (dy/dx)^{2}}\,dx = \sqrt{1 + (dx/dy)^{2}}\,dy\). Using \(dx\) for \(ds\) undercounts every slanted band.`,
        example: R`For \(y = \tfrac{3}{4}x\) about the \(x\)-axis: \(r = \tfrac{3}{4}x\), \(ds = \tfrac{5}{4}\,dx\).`,
      },
      {
        title: 'Check with geometry',
        text: R`Cone side \(\pi r\ell\); frustum side \(\pi(r_{1} + r_{2})\ell\) (\(\ell\) = slant length); sphere \(4\pi R^{2}\); a zone of a sphere between two parallel planes \(h\) apart has area \(2\pi R h\), however far from the center it is.`,
        example: R`\(y = \tfrac{3}{4}x\), \(0 \le x \le 4\), about the \(x\)-axis: \(\displaystyle\int_{0}^{4} 2\pi\cdot\tfrac{3}{4}x\cdot\tfrac{5}{4}\,dx = 15\pi = \pi\cdot 3\cdot 5\).`,
      },
      {
        title: 'Curves with a perfect-square 1 + (y′)²',
        text: R`Some curves are built so that \(y' = A - B\) with \(AB = \frac{1}{4}\). Then \(1 + (y')^{2} = A^{2} - \frac{1}{2} + B^{2} + 1 = (A + B)^{2}\): adding 1 flips the sign of the middle term, and \(\sqrt{1 + (y')^{2}} = A + B\) has no root left.`,
        example: R`\(y = \frac{x^{2}}{4} - \frac{\ln x}{2}\): \(1 + (y')^{2} = \left(\frac{x}{2} + \frac{1}{2x}\right)^{2}\). About the \(y\)-axis on \([1, 2]\): \(S = 2\pi\displaystyle\int_{1}^{2} \left(\frac{x^{2}}{2} + \frac{1}{2}\right)dx = \frac{10\pi}{3}\).`,
      },
      {
        title: 'Parametric curves',
        text: R`For \(x = x(t)\), \(y = y(t)\), \(\alpha \le t \le \beta\), traced once: \(ds = \sqrt{x'(t)^{2} + y'(t)^{2}}\,dt\). About the \(x\)-axis \(S = \displaystyle\int_{\alpha}^{\beta} 2\pi y(t)\,ds\); about the \(y\)-axis use \(x(t)\).`,
        example: R`The circle \(x = R\cos t\), \(y = R\sin t\), \(0 \le t \le \pi\): \(ds = R\,dt\), so \(S = \displaystyle\int_{0}^{\pi} 2\pi R\sin t\cdot R\,dt = 4\pi R^{2}\).`,
      },
    ],
    vocab: [
      { term: 'surface of revolution', def: 'The surface swept out when a curve is revolved about a line.' },
      { term: 'arc-length element', def: R`\(ds = \sqrt{1 + (dy/dx)^{2}}\,dx\): the length of a tiny piece of the curve.` },
      { term: 'frustum', def: 'A cone with its tip cut off by a plane parallel to the base; each band of a surface of revolution is nearly a frustum.' },
      { term: 'zone of a sphere', def: 'The part of a sphere between two parallel planes.' },
    ],
    mistakes: [
      R`Using \(dx\) in place of \(ds\). That gives the area of a cylinder-like surface, too small whenever the curve slants.`,
      R`Using the wrong radius: about the \(x\)-axis it is \(y\), about the \(y\)-axis it is \(x\).`,
      R`Writing \(\pi r\) instead of \(2\pi r\), or confusing the surface with the volume \(\pi\int r^{2}\,dx\).`,
      R`Forgetting the lower limit after a substitution: \(1^{3/2} = 1\), not 0.`,
    ],
    visual: {
      type: 'plot',
      x: [-0.4, 4.6],
      y: [-2.6, 2.6],
      fns: [{ f: Math.sqrt, domain: [0, 4], label: 'y = √x', labelAt: 3 }, { f: (x) => -Math.sqrt(x), domain: [0, 4], dashed: true }],
      segments: [{ from: [2.2, 0], to: [2.2, Math.sqrt(2.2)], label: 'r = y', color: 'c' }, { from: [2.2, Math.sqrt(2.2)], to: [2.7, Math.sqrt(2.7)], label: 'ds', color: 'b' }],
      alt: 'The curve y = √x from 0 to 4 and its mirror image across the x-axis, dashed: a side view of the surface made by revolving the curve about the x-axis. A vertical segment from the axis to the curve is the radius r = y, and a short piece of the curve is labelled ds; it sweeps a band of area 2πr ds.',
    },
  },

  examples: [
    {
      title: 'A clean substitution',
      problem: R`Find the area of the surface formed by revolving \(y = x^{3}\), \(0 \le x \le 1\), about the \(x\)-axis.`,
      steps: [
        R`\(y' = 3x^{2}\), so \(S = 2\pi\displaystyle\int_{0}^{1} x^{3}\sqrt{1 + 9x^{4}}\,dx\).`,
        R`Let \(u = 1 + 9x^{4}\), \(du = 36x^{3}\,dx\): \(S = \frac{2\pi}{36}\displaystyle\int_{1}^{10} \sqrt{u}\,du = \frac{\pi}{18}\cdot\frac{2}{3}\Big[u^{3/2}\Big]_{1}^{10}\).`,
      ],
      answer: R`\(\frac{\pi}{27}\left(10\sqrt{10} - 1\right) \approx 3.563\)`,
    },
    {
      title: 'A zone of a sphere, checked',
      problem: R`Revolve \(y = \sqrt{9 - x^{2}}\), \(-1 \le x \le 2\), about the \(x\)-axis. Find the area and compare with \(2\pi R h\).`,
      steps: [
        R`\(y' = \dfrac{-x}{\sqrt{9 - x^{2}}}\), so \(y\sqrt{1 + (y')^{2}} = \sqrt{9 - x^{2}}\cdot\dfrac{3}{\sqrt{9 - x^{2}}} = 3\).`,
        R`\(S = \displaystyle\int_{-1}^{2} 2\pi\cdot 3\,dx = 18\pi\).`,
        R`The zone formula with \(R = 3\) and \(h = 3\): \(2\pi(3)(3) = 18\pi\). They agree.`,
      ],
      answer: R`\(18\pi \approx 56.55\)`,
      visual: surfacePlot((x) => Math.sqrt(9 - x * x), -1, 2, 'x', 'The arc of the circle of radius 3 from x = −1 to x = 2 and its mirror image across the x-axis, dashed: a band of a sphere.'),
    },
    {
      title: 'A perfect square about the y-axis',
      problem: R`Revolve \(y = \frac{x^{2}}{4} - \frac{\ln x}{2}\), \(1 \le x \le 3\), about the \(y\)-axis. Find the surface area.`,
      steps: [
        R`\(y' = \frac{x}{2} - \frac{1}{2x}\), \(1 + (y')^{2} = \frac{x^{2}}{4} + \frac{1}{2} + \frac{1}{4x^{2}} = \left(\frac{x}{2} + \frac{1}{2x}\right)^{2}\).`,
        R`Radius \(x\): \(S = 2\pi\displaystyle\int_{1}^{3} x\left(\frac{x}{2} + \frac{1}{2x}\right)dx = \pi\int_{1}^{3} (x^{2} + 1)\,dx = \pi\Big[\frac{x^{3}}{3} + x\Big]_{1}^{3}\).`,
        R`\(S = \pi\left(12 - \frac{4}{3}\right)\).`,
      ],
      answer: R`\(\frac{32\pi}{3} \approx 33.51\)`,
    },
    {
      title: 'Word problem: a satellite dish',
      word: true,
      problem: R`A dish is the parabola \(y = cx^{2}\) revolved about the \(y\)-axis. Its rim has radius 40 cm and it is 15 cm deep. Find the area of its surface.`,
      steps: [
        R`The rim \((40, 15)\) is on the curve: \(c = \frac{15}{1600} = \frac{3}{320}\).`,
        R`\(S = 2\pi\displaystyle\int_{0}^{40} x\sqrt{1 + 4c^{2}x^{2}}\,dx = \frac{\pi}{6c^{2}}\Big[(1 + 4c^{2}x^{2})^{3/2}\Big]_{0}^{40}\).`,
        R`At \(x = 40\): \(1 + 4c^{2}(1600) = 1 + \frac{9}{16} = \frac{25}{16}\), so the bracket is \(\frac{125}{64} - 1 = \frac{61}{64}\), and \(\frac{\pi}{6c^{2}} = \frac{102400\pi}{54}\).`,
        R`\(S = \frac{102400\pi}{54}\cdot\frac{61}{64} = \frac{48800\pi}{27}\). The flat disc of radius 40 would be \(1600\pi \approx 5027\) cm².`,
      ],
      answer: R`\(\frac{48800\pi}{27} \approx 5678\) cm²`,
      visual: surfacePlot((x) => (3 / 320) * x * x, 0, 40, 'y', 'Side view of the dish: the parabola from (0, 0) to the rim at (40, 15), and its mirror image dashed.'),
    },
  ],

  models: [
    {
      id: 'lamp-shade',
      title: 'Word problem: fabric for a lamp shade',
      word: true,
      intro: 'A lamp shade is a straight segment revolved about a vertical axis. Choose the two rim radii and the height.',
      inputs: [
        { name: 'r1', label: 'Bottom radius (cm)', type: 'int', min: 0, max: 30, value: 15 },
        { name: 'r2', label: 'Top radius (cm)', type: 'int', min: 0, max: 30, value: 9 },
        { name: 'h', label: 'Height (cm)', type: 'int', min: 1, max: 40, value: 8 },
      ],
      compute: lampModel,
    },
    {
      id: 'revolve-a-curve',
      title: 'Revolve a curve',
      intro: 'Choose a curve with a clean antiderivative and an interval. The answer is found from the antiderivative of 2π·r·√(1 + (y′)²).',
      inputs: [
        { name: 'curve', label: 'Curve and axis', type: 'select', value: 'root', options: Object.entries(MODEL_CURVES).map(([value, c]) => ({ value, label: c.name })) },
        { name: 'a', label: 'Left end a', type: 'number', min: 0, max: 5, step: 0.5, value: 0 },
        { name: 'b', label: 'Right end b', type: 'number', min: 0.5, max: 6, step: 0.5, value: 2 },
      ],
      compute: curveModel,
    },
  ],

  quiz: {
    easy: [easySetup, easyCone, easySphereZone],
    medium: [mediumRoot, mediumCubic, mediumWordLampshade],
    hard: [hardPerfectSquare, hardParaboloid, hardWordDish],
    challenge: [challengeParametric, challengeFindBound, challengeWordPaint],
  },
};
